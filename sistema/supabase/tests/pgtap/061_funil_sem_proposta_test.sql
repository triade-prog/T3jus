-- Por que o primeiro contato não recebeu proposta (AP-03, F3.8): encerrar sem proposta com um dos
-- dois motivos, rascunho não impede, quem já recebeu proposta não sai, voltar ao funil guarda a
-- marcação de antes, o Funil conta e lista quem saiu, a ficha mostra a situação; área e isolamento.
begin;
select plan(17);

select ajustar_relogio(('2026-11-18 10:20-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Larissa Prado') as larissa,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, diego, 'Diego Almeida', array['COMERCIAL']),
       portal_convidar(socia, rm, larissa, 'Larissa Prado', array['JURIDICO']) from ids;

create function pg_temp.cli(p_pessoa uuid, p_esc uuid, p_nome text, p_tel text) returns uuid language sql as $$
  select (portal_cliente_cadastrar(p_pessoa, p_esc, jsonb_build_object('tipo', 'PF', 'nome', p_nome, 'origem', 'GOOGLE',
    'contatos', jsonb_build_array(jsonb_build_object('nome', p_nome, 'telefone', p_tel, 'principal', true)))) ->> 'id')::uuid $$;
create temp table cli as select
  pg_temp.cli(socia, rm, 'Eduardo Nascimento', '+5511962143307') edu,
  pg_temp.cli(socia, rm, 'Marcos Vinícius Duarte', '+5511962143308') marcos,
  pg_temp.cli(socia, rm, 'Daniela Rocha Mendes', '+5511962143309') dan
  from ids;

-- Marcos tem proposta em rascunho; Daniela recebeu proposta.
select portal_proposta_criar(diego, rm, jsonb_build_object('clienteId', cli.marcos, 'servico', 'Revisão', 'responsavelId', ids.diego, 'rascunho', true)) from ids, cli;
create temp table pr as select (portal_proposta_criar(diego, rm, jsonb_build_object('clienteId', cli.dan, 'servico', 'Revisão de contrato',
  'escopo', 'Ação revisional.', 'responsavelId', ids.diego,
  'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'FIXO', 'valor', 150000, 'vencimento', '2026-12-10')),
  'retorno', jsonb_build_object('em', '2026-11-20', 'responsavelId', ids.diego))) ->> 'id')::uuid dan from ids, cli;
select portal_proposta_enviada(diego, rm, pr.dan, 1) from ids, pr;

select is((teste.erro($$ select portal_funil_encerrar(diego, rm, cli.edu, null, null) from ids, cli $$)) -> 'detalhe' -> 'campos',
  '["motivo"]'::jsonb, 'AP-03: sem motivo, recusa preso ao campo');
select is((teste.erro($$ select portal_funil_encerrar(diego, rm, cli.edu, 'PRECO', null) from ids, cli $$)) -> 'detalhe' -> 'campos',
  '["motivo"]'::jsonb, 'AP-03: só os dois motivos que o Funil conta');

select is((select portal_funil_encerrar(diego, rm, cli.edu, 'NAO_VOLTOU', '  Liguei em 10/11 e 13/11, sem resposta. ') ->> 'nota' from ids, cli),
  'Liguei em 10/11 e 13/11, sem resposta.', 'AP-03: encerra com o motivo e a anotação');
select is((select funil_motivo from clientes_escritorio, cli where id = cli.edu), 'NAO_VOLTOU', 'o cliente passa a contar no motivo');
select is((select count(*) from historico, cli where acao = 'comercial.funil_encerrado' and entidade_id = cli.edu::text), 1::bigint,
  'a marcação vai para o histórico');
select is((teste.erro($$ select portal_funil_encerrar(diego, rm, cli.edu, 'NAO_PEGOU', null) from ids, cli $$)) -> 'detalhe' ->> 'motivo',
  'JA_FORA_DO_FUNIL', 'quem já saiu não sai de novo');

select ajustar_relogio(('2026-11-18 10:25-03'::timestamptz - now()));
select is((select portal_funil_encerrar(socia, rm, cli.marcos, 'NAO_PEGOU', null) ->> 'motivo' from ids, cli), 'NAO_PEGOU',
  'AP-03: proposta em rascunho não impede encerrar');
select is((select count(*) from propostas, cli where cliente_id = cli.marcos and estado = 'RASCUNHO'), 1::bigint, 'o rascunho fica guardado');
select is((teste.erro($$ select portal_funil_encerrar(diego, rm, cli.dan, 'NAO_VOLTOU', null) from ids, cli $$)) -> 'detalhe' ->> 'motivo',
  'JA_RECEBEU_PROPOSTA', 'quem já recebeu proposta não sai do funil sem proposta');

select is((select portal_comercial_funil(diego, rm, '90') -> 'semProposta' from ids),
  '{"naoPegou": 1, "naoVoltou": 1, "emAtendimento": 0}'::jsonb, 'AP-03: o Funil conta os dois motivos');
select is((select jsonb_agg(x ->> 'nome') from ids, jsonb_array_elements(portal_comercial_funil(diego, rm, '90') -> 'sairam' -> 'itens') x),
  '["Marcos Vinícius Duarte", "Eduardo Nascimento"]'::jsonb, 'a lista "Saíram sem proposta" vem da mais recente para a mais antiga');

select is((select portal_cliente_funil(diego, rm, cli.edu) ->> 'situacao' from ids, cli), 'FORA', 'a ficha mostra que saiu do funil');

select portal_funil_voltar(diego, rm, cli.edu) from ids, cli;
select is((select portal_cliente_funil(diego, rm, cli.edu) - 'eventos' - 'saida' from ids, cli),
  '{"situacao": "PRIMEIRO", "rascunho": false, "podeEncerrar": true}'::jsonb, 'voltar ao funil põe o cliente de novo em primeiro contato');
select is((select jsonb_array_length(portal_cliente_funil(diego, rm, cli.edu) -> 'eventos') || ' · ' ||
                  (portal_cliente_funil(diego, rm, cli.edu) -> 'eventos' -> 0 -> 'voltouPor' ->> 'nome') from ids, cli),
  '1 · Diego Almeida', 'PT-03: a marcação de antes fica guardada, com quem voltou');
select is((teste.erro($$ delete from funil_saidas $$)) ->> 'codigo', 'TC023', 'PT-03: a saída do funil não se apaga');

select is((teste.erro($$ select portal_funil_encerrar(larissa, rm, cli.edu, 'NAO_PEGOU', null) from ids, cli $$)) -> 'detalhe' ->> 'motivo',
  'AREA_NAO_LIBERADA', 'quem não tem Comercial não encerra');
select is((teste.erro($$ select portal_funil_encerrar(intrusa, outro, cli.edu, 'NAO_PEGOU', null) from ids, cli $$)) ->> 'codigo',
  'TC404', 'PT-01: outro escritório não acha o cliente');

select ajustar_relogio(interval '0');
select * from finish();
rollback;
