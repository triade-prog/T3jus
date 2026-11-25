-- Os 16 e os 18 anos de quem nasceu em 29/02 (F3.161; CH-08, AP-01): pelo art. 132, § 3º, do Código
-- Civil e pelo art. 3º da Lei 810/1949, num ano sem 29/02 o aniversário é 01/03, o mesmo dia em que
-- idade_em vira a idade. A data da ficha (cliente_assina), a janela "Agora assina por si" e o sino
-- dos 18 anos passam a usar aniversario_em (1120), e as funções recriadas continuam security definer.
begin;
select plan(19);

-- A conta.
select is(aniversario_em('2012-02-29', 18), '2030-03-01'::date, 'art. 132, § 3º: quem nasceu em 29/02 faz 18 anos em 01/03 no ano comum');
select is(aniversario_em('2012-02-29', 16), '2028-02-29'::date, 'aos 16, num ano bissexto, é 29/02');
select is(aniversario_em('2011-03-01', 18), '2029-03-01'::date, 'quem nasceu em 01/03 de ano comum continua em 01/03');
select is(aniversario_em('2014-03-14', 16), '2030-03-14'::date, 'o dia comum não muda');
select is(aniversario_em('2012-02-28', 18), '2030-02-28'::date, 'quem nasceu em 28/02 continua em 28/02');
select is((select count(*)::integer
             from generate_series('2004-01-01'::date, '2012-12-31'::date, interval '1 day') g(d), unnest(array[1, 16, 18]) a(anos)
            where idade_em(g.d::date, aniversario_em(g.d::date, a.anos)) <> a.anos
               or idade_em(g.d::date, aniversario_em(g.d::date, a.anos) - 1) <> a.anos - 1), 0,
  'F3.161: para todo nascimento de 2004 a 2012, a data dos 1, 16 e 18 anos é o dia em que idade_em vira');

-- Os atributos das funções recriadas.
select ok((select prosecdef from pg_proc where proname = 'portal_cliente_assina_por_si'), 'portal_cliente_assina_por_si continua security definer');
select ok((select prosecdef from pg_proc where proname = 'avisar_clientes_fez_18'), 'avisar_clientes_fez_18 continua security definer');
select is((select provolatile::text from pg_proc where proname = 'aniversario_em'), 'i', 'aniversario_em é immutable');
select is((select provolatile::text from pg_proc where proname = 'cliente_assina'), 's', 'cliente_assina continua stable');

-- Bia nasceu em 29/02/2012 e se cadastra em 01/12/2029, aos 17 anos, assistida pela mãe.
select ajustar_relogio(('2029-12-01 12:00-03'::timestamptz - now()));
create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Felipe Matos') as felipe,
  teste.escritorio('Ribeiro & Matos') as rm;
select teste.vincular(socia, rm, 'SOCIO') from ids;
select portal_convidar(socia, rm, felipe, 'Felipe Matos', array['CONTRATOS', 'JURIDICO'], '{"uf": "SP", "numero": "287104"}') from ids;
create temp table bia as select (portal_cliente_cadastrar(socia, rm, jsonb_build_object(
  'tipo', 'PF', 'contatos', jsonb_build_array(jsonb_build_object('nome', 'Contato', 'telefone', '+5511984723316', 'principal', true)),
  'nome', 'Beatriz Lima Prado', 'documento', '609.124.853-70', 'capacidade', 'MENOR', 'nascimento', '2012-02-29',
  'rl_papel', 'MAE', 'rl_nome', 'Silvia Lima Prado', 'rl_documento', '127.508.394-32', 'nacionalidade', 'brasileira',
  'endereco', 'Rua Itaqueri, 1.020', 'cidade', 'São Paulo', 'uf', 'SP')) ->> 'id')::uuid id from ids;
select portal_contrato_criar(socia, rm, jsonb_build_object('clienteId', bia.id, 'objeto', 'Indenização',
  'responsavelId', ids.felipe, 'advogados', jsonb_build_array(ids.felipe),
  'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'FIXO', 'valor', 300000, 'vencimento', '2030-04-05')))) from ids, bia;

-- Em 28/02/2030 ainda tem 17 anos: a ficha diz 01/03, o sino não avisa e a janela recusa.
select ajustar_relogio(('2030-02-28 12:00-03'::timestamptz - now()));
select is((select cliente_assina(c) from clientes_escritorio c, bia where c.id = bia.id) - 'modo',
  '{"situacao": "ASSISTIDO", "idade": 17, "faz16": "2028-02-29", "faz18": "2030-03-01"}'::jsonb,
  'F3.161: em 28/02 é assistida, e a ficha diz que faz 18 em 01/03');
select is((avisar_clientes_fez_18() ->> 'avisos')::integer, 0, 'F3.161: o sino não avisa em 28/02');
select is((teste.erro($$ select portal_cliente_assina_por_si(socia, rm, bia.id, c.versao, '{}') from ids, bia, clientes_escritorio c where c.id = bia.id $$))
  -> 'detalhe' ->> 'motivo', 'CLIENTE_NAO_FEZ_18', 'F3.161: em 28/02 a janela "Agora assina por si" ainda recusa');

-- Em 01/03/2030 faz 18: a ficha, o sino e a janela no mesmo dia.
select ajustar_relogio(('2030-03-01 12:00-03'::timestamptz - now()));
select is((select cliente_assina(c) ->> 'situacao' from clientes_escritorio c, bia where c.id = bia.id), 'FEZ_18', 'F3.161: em 01/03 fez 18');
select is((avisar_clientes_fez_18() ->> 'avisos')::integer, 1, 'F3.161: o sino avisa em 01/03');
select is((select dados ->> 'em' from avisos_sino, bia where tipo = 'CLIENTE_FEZ_18' and origem_id = bia.id), '01/03/2030',
  'F3.161: o aviso diz 01/03/2030');
select ok((select portal_cliente_assina_por_si(socia, rm, bia.id, c.versao, '{"estado_civil": "SOLTEIRO", "profissao": "estudante"}') ->> 'versao' is not null
             from ids, bia, clientes_escritorio c where c.id = bia.id), 'F3.161: em 01/03 a janela abre');
select is((select ate from clientes_quem_assinava, bia where cliente_id = bia.id), '2030-02-28'::date,
  'F3.161: quem assinava fica até a véspera, 28/02');
select is((select dados ->> 'fez18' from historico, bia where entidade_id = bia.id::text and acao = 'cliente.passou_a_assinar'), '2030-03-01',
  'F3.161: o histórico diz que fez 18 em 01/03');

select * from finish();
rollback;
