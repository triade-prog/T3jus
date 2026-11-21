-- Encerrar o caso no financeiro (F3.45: FI-08, PT-03): o acerto do caso, a recusa com a lista
-- do que falta (repasses, parcelas, reembolsos), o fechamento uma vez só, no histórico, área e
-- isolamento (PA-01, PT-01).
begin;
select plan(14);

select ajustar_relogio(('2026-11-17 10:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Paula Nunes') as paula,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, diego, 'Diego Almeida', array['FINANCEIRO']),
       portal_convidar(socia, rm, paula, 'Paula Nunes', array['JURIDICO']) from ids;

create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Irene Castro', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Irene Castro', 'telefone', '+5511996027736', 'principal', true)))) ->> 'id')::uuid irene
  from ids;
create temp table ct as select
  (portal_contrato_criar(socia, rm, jsonb_build_object('clienteId', cli.irene, 'objeto', 'Aposentadoria por incapacidade',
     'responsavelId', ids.socia, 'advogados', jsonb_build_array(ids.socia),
     'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'PARCELADO', 'total', 200000, 'parcelas', 2, 'primeiro', '2026-11-20')))) ->> 'id')::uuid id
  from ids, cli;
select portal_contrato_assinatura(socia, rm, ct.id, 1, '2026-11-17') from ids, ct;
select portal_juridico_casos(socia, rm) from ids;
create temp table cs as select
  (portal_juridico_caso_criar(socia, rm, jsonb_build_object('nome', 'Castro x INSS', 'area', 'PREVIDENCIARIO',
     'etapaId', (select id from etapas where escritorio_id = ids.rm and ordem = 5), 'responsavelId', ids.socia,
     'clientes', jsonb_build_array(jsonb_build_object('clienteId', cli.irene, 'papel', 'AUTOR', 'contratoId', ct.id)))) ->> 'id')::uuid id
  from ids, cli, ct;
create temp table cp as select
  (portal_financeiro_conta_lancar(diego, rm, jsonb_build_object('descricao', 'Laudo médico', 'categoria', 'CUSTAS', 'valor', 42000,
     'vencimento', '2026-11-10', 'adiantada', true, 'clienteId', cli.irene, 'casoId', cs.id, 'reembolsoComo', 'LEVANTAMENTO')) ->> 'id')::uuid laudo
  from ids, cli, cs;
create temp table lv as select
  (portal_financeiro_levantamento_registrar(diego, rm, jsonb_build_object('tipo', 'RPV', 'casoId', cs.id, 'clienteId', cli.irene,
    'valor', 1000000, 'entrouEm', '2026-11-16', 'divisao', jsonb_build_array(
      jsonb_build_object('para', 'CLIENTE', 'valor', 808000),
      jsonb_build_object('para', 'REEMBOLSO', 'nome', 'Reembolso: Laudo médico', 'valor', 42000, 'contaId', cp.laudo),
      jsonb_build_object('para', 'PERITO', 'nome', 'Dr. Rui Tavares', 'valor', 150000)))) ->> 'id')::uuid id
  from ids, cs, cli, cp;
create temp table ds as select
  (select id from destinacoes d where d.levantamento_id = lv.id and d.para = 'CLIENTE') cliente,
  (select id from destinacoes d where d.levantamento_id = lv.id and d.para = 'REEMBOLSO') reembolso,
  (select id from destinacoes d where d.levantamento_id = lv.id and d.para = 'PERITO') perito
  from lv;

-- Área e isolamento.
select is((teste.erro($$ select portal_financeiro_caso_acerto(paula, rm, cs.id) from ids, cs $$)) -> 'detalhe' ->> 'motivo', 'AREA_NAO_LIBERADA',
  'PA-01: sem o Financeiro, o acerto é recusado');
select is((teste.erro($$ select portal_financeiro_caso_encerrar(intrusa, outro, cs.id) from ids, cs $$)) ->> 'codigo', 'TC404',
  'PT-01: o caso de outro escritório não é achado');

-- O acerto.
create temp table a0 as select portal_financeiro_caso_acerto(diego, rm, cs.id) a from ids, cs;
select is((select (a ->> 'entrou')::bigint from a0), 1000000::bigint, 'o que entrou pelo escritório');
select is((select (a ->> 'faltaPagar')::bigint from a0), 1000000::bigint, 'nada destinado ainda');
select is((select jsonb_path_query_array(a -> 'pendencias', '$[*].tipo') from a0),
  '["REPASSE", "REPASSE", "REPASSE", "PARCELA", "PARCELA"]'::jsonb, 'as partes do alvará e as parcelas do contrato do caso');

-- Encerrar com pendência: recusa com a lista e os valores.
select is((teste.erro($$ select portal_financeiro_caso_encerrar(diego, rm, cs.id) from ids, cs $$)) -> 'detalhe' ->> 'motivo', 'PENDENCIAS',
  'FI-08: com pendência, não encerra');
select is((teste.erro($$ select portal_financeiro_caso_encerrar(diego, rm, cs.id) from ids, cs $$)) -> 'detalhe' ->> 'falta', '1200000',
  'e diz quanto falta');

-- Tudo feito, menos o perito; as parcelas pagas.
select portal_financeiro_destinacao_feita(diego, rm, ds.cliente, '{"feitoEm": "2026-11-17"}'),
       portal_financeiro_destinacao_feita(diego, rm, ds.reembolso, '{"feitoEm": "2026-11-17"}') from ids, ds;
select ajustar_relogio(('2026-12-21 10:00-03'::timestamptz - now()));
select portal_financeiro_receber_registrar(diego, rm, r.id, jsonb_build_object('valor', 100000, 'recebidoEm', r.vencimento, 'forma', 'PIX'))
  from ids, ct, recebimentos_previstos r where r.contrato_id = ct.id;
create temp table a1 as select portal_financeiro_caso_acerto(diego, rm, cs.id) a from ids, cs;
select is((select a -> 'pendencias' -> 0 ->> 'nome' from a1), 'Dr. Rui Tavares', 'só o perito falta');
select is((select a -> 'parcelas' from a1), '{"falta": 0, "pagas": 2, "total": 2, "ultima": "2026-12-20"}'::jsonb,
  'as parcelas do contrato todas recebidas, com a última');
select ok((select (a -> 'pendencias') @> '[{"tipo": "REEMBOLSO"}]' from a1) is false, 'o reembolso feito no alvará não pende');

-- Dispensado com motivo, encerra.
select portal_financeiro_destinacao_dispensar(diego, rm, ds.perito, 'O perito abriu mão dos honorários') from ids, ds;
select is((select portal_financeiro_caso_encerrar(diego, rm, cs.id) -> 'fechado' -> 'por' ->> 'nome' from ids, cs), 'Diego Almeida',
  'FI-08: tudo recebido e repassado, encerra com quem e quando');
select is((select count(*)::int from historico h, cs where h.acao = 'financeiro.caso_encerrado' and h.entidade_id = cs.id::text), 1,
  'PT-03: o encerramento fica no histórico do caso');
select is((teste.erro($$ select portal_financeiro_caso_encerrar(diego, rm, cs.id) from ids, cs $$)) -> 'detalhe' ->> 'motivo', 'CASO_JA_ENCERRADO',
  'encerra uma vez só');
select is((teste.erro($$ delete from fechamentos_caso $$)) ->> 'codigo', 'TC023', 'o fechamento não se apaga');

select * from finish();
rollback;
