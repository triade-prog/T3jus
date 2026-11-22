-- A aba Recebimentos da ficha do contrato com a situação de cada parcela (0750, CH-04): quem tem
-- a área Financeiro vê a situação, o que entrou e o "Recebido até hoje"; quem só tem Contratos não.
begin;
select plan(8);

select ajustar_relogio(('2026-11-18 12:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Paula Nunes') as paula,
  teste.escritorio('Ribeiro & Matos') as rm;
select teste.vincular(socia, rm, 'SOCIO') from ids;
select portal_convidar(socia, rm, paula, 'Paula Nunes', array['CONTRATOS']) from ids;

create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Hélio Batista Corrêa', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Hélio Batista Corrêa', 'telefone', '+5511996027736', 'principal', true)))) ->> 'id')::uuid hel
  from ids;
create temp table ct as select
  (portal_contrato_criar(socia, rm, jsonb_build_object('clienteId', cli.hel, 'objeto', 'Ação revisional',
     'responsavelId', ids.socia, 'advogados', jsonb_build_array(ids.socia),
     'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'PARCELADO', 'total', 255000, 'parcelas', 3, 'primeiro', '2026-11-20')))) ->> 'id')::uuid hel
  from ids, cli;
select portal_contrato_assinatura(socia, rm, ct.hel, 1, '2026-11-18') from ids, ct;
create temp table p1 as select id from recebimentos_previstos, ct where contrato_id = ct.hel order by vencimento limit 1;
select portal_financeiro_receber_registrar(socia, rm, p1.id, jsonb_build_object('valor', 85000, 'recebidoEm', '2026-11-18', 'forma', 'PIX')) from ids, p1;

-- Um mês depois: a 1ª paga, a 2ª (20/12) ainda a vencer, a 3ª (20/01) a vencer.
select ajustar_relogio(('2026-12-25 12:00-03'::timestamptz - now()));

create temp table f as select portal_contrato(socia, rm, ct.hel) socia, portal_contrato(paula, rm, ct.hel) paula from ids, ct;

select is((select socia ->> 'recebidoAteHoje' from f), '85000', 'com Financeiro: o recebido até hoje soma os pagamentos do contrato');
select is((select jsonb_agg(r ->> 'situacao' order by o) from f, jsonb_array_elements(f.socia -> 'recebimentos') with ordinality t(r, o)),
  '["PAGA", "VENCIDA", "A_VENCER"]'::jsonb, 'com Financeiro: cada parcela vem com a situação de A receber, na ordem da programação');
select is((select socia -> 'recebimentos' -> 0 ->> 'pagaEm' from f), '2026-11-18', 'a paga diz quando entrou');
select is((select (socia -> 'recebimentos' -> 1 ->> 'falta')::bigint from f), 85000::bigint, 'a vencida diz quanto falta');
select is((select socia -> 'recebimentos' -> 0 ->> 'descricao' from f), (select paula -> 'recebimentos' -> 0 ->> 'descricao' from f),
  'o resto da linha não muda');
select is((select paula ? 'recebidoAteHoje' from f), false, 'sem Financeiro: não vem o recebido até hoje');
select is((select count(*) from f, jsonb_array_elements(f.paula -> 'recebimentos') r where r ? 'situacao'), 0::bigint,
  'sem Financeiro: as parcelas vêm sem situação');
select is((select jsonb_array_length(paula -> 'recebimentos') from f), 3, 'sem Financeiro: a programação continua toda lá');
select * from finish();
rollback;
