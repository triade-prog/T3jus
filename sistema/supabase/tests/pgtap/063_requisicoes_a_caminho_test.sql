-- RPV e precatório a caminho (F3.48, F3.72): registrar o expedido com a parte do escritório pelo
-- contrato, mudar a data com motivo, não vai entrar, entrou (vira levantamento), a previsão do Caixa,
-- o que passou da data fora dela e o grupo à parte nos Relatórios (FI-09, IN-05).
begin;
select plan(24);

select ajustar_relogio(('2026-11-18 10:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Larissa Moura') as larissa,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, diego, 'Diego Almeida', array['FINANCEIRO']),
       portal_convidar(socia, rm, larissa, 'Larissa Moura', array['JURIDICO']) from ids;

create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PJ', 'nome', 'Construtora Vale Alto Ltda.', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Paulo Vale', 'telefone', '+5511996027736', 'principal', true)))) ->> 'id')::uuid vale
  from ids;
create temp table ct as select
  (portal_contrato_criar(socia, rm, jsonb_build_object('clienteId', cli.vale, 'objeto', 'Cobrança contra a Prefeitura',
     'responsavelId', ids.socia, 'advogados', jsonb_build_array(ids.socia),
     'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'EXITO', 'percentual', 2000, 'sobre', 'O que voltar', 'etapa', 'Pagamento da RPV', 'dias', 15)))) ->> 'id')::uuid id
  from ids, cli;
select portal_juridico_etapas(socia, rm) from ids;
create temp table cs as select
  (portal_juridico_caso_criar(socia, rm, jsonb_build_object('nome', 'Vale Alto x Prefeitura', 'area', 'CIVEL',
     'etapaId', (select id from etapas where escritorio_id = ids.rm and ordem = 7), 'responsavelId', ids.socia,
     'clientes', jsonb_build_array(jsonb_build_object('clienteId', cli.vale, 'papel', 'AUTOR', 'contratoId', ct.id)))) ->> 'id')::uuid id
  from ids, cli, ct;

-- Registrar.
select is((teste.erro($$ select portal_financeiro_requisicao_registrar(larissa, rm, '{}'::jsonb) from ids $$)) -> 'detalhe' ->> 'motivo',
  'AREA_NAO_LIBERADA', 'sem a área Financeiro, não registra');
select is((teste.erro($$ select portal_financeiro_requisicao_registrar(diego, rm, jsonb_build_object('tipo', 'RPV', 'casoId', cs.id, 'clienteId', cli.vale,
  'tribunal', 'TJSP', 'devedor', 'Prefeitura de Santo André', 'expedidoEm', '2026-11-18', 'estimadaMes', '2026-10-01')) from ids, cs, cli $$)) -> 'detalhe' -> 'campos',
  '["valor", "estimadaMes"]'::jsonb, 'valor em branco e data estimada antes da expedição');
create temp table rq as select portal_financeiro_requisicao_registrar(diego, rm, jsonb_build_object('tipo', 'RPV', 'casoId', cs.id, 'clienteId', cli.vale,
  'tribunal', 'TJSP', 'devedor', 'Prefeitura de Santo André', 'numero', '0001234-56.2026', 'valor', 1840000,
  'expedidoEm', '2026-11-18', 'estimadaMes', '2027-01-01')) r from ids, cs, cli;
select is((select (r ->> 'parteEscritorio')::bigint from rq), 368000::bigint, 'a parte do escritório sai do contrato: 20% de êxito');
select is((select r ->> 'parteRegra' from rq), '20% de êxito', 'com a regra');
select is((select r ->> 'situacao' from rq), 'A_CAMINHO', 'fica a caminho');
create temp table rq2 as select portal_financeiro_requisicao_registrar(diego, rm, jsonb_build_object('tipo', 'PRECATORIO', 'casoId', cs.id, 'clienteId', cli.vale,
  'tribunal', 'TJSP', 'devedor', 'Estado de São Paulo', 'valor', 7100000, 'expedidoEm', '2026-03-10', 'estimadaMes', '2026-12-01')) r from ids, cs, cli;
create temp table rq3 as select portal_financeiro_requisicao_registrar(diego, rm, jsonb_build_object('tipo', 'RPV', 'casoId', cs.id, 'clienteId', cli.vale,
  'tribunal', 'TRF3', 'devedor', 'INSS', 'valor', 630000, 'expedidoEm', '2026-08-03', 'estimadaMes', '2026-10-01')) r from ids, cs, cli;
select is((select r ->> 'passou' from rq3), 'true', 'a de outubro já passou da data estimada');

-- Repasses mostra a folha.
create temp table lista as select portal_financeiro_repasses(diego, rm) -> 'aCaminho' a from ids;
select is((select (a ->> 'total')::bigint from lista), 368000::bigint + 1420000 + 126000, 'o total da parte do escritório');
select is((select (a ->> 'naPrevisao')::bigint from lista), 368000::bigint + 1420000, 'na previsão, só as que não passaram');
select is((select a -> 'passou' from lista), '{"n": 1, "valor": 126000}'::jsonb, 'a que passou vem à parte');
select is((select jsonb_array_length(a -> 'itens') from lista), 3, 'três a caminho');

-- Caixa.
create temp table cx as select portal_financeiro_caixa(diego, rm) c from ids;
select is((select (m ->> 'aCaminho')::bigint from cx, jsonb_array_elements(c -> 'meses') m where m ->> 'mes' = '2026-12-01'), 1420000::bigint,
  'o precatório entra na previsão de dezembro');
select is((select (m ->> 'aCaminho')::bigint from cx, jsonb_array_elements(c -> 'meses') m where m ->> 'mes' = '2027-01-01'), 368000::bigint,
  'o RPV, em janeiro');
select is((select (m ->> 'aCaminho')::bigint from cx, jsonb_array_elements(c -> 'meses') m where m ->> 'mes' = '2026-10-01'), 0::bigint,
  'a que passou não entra no mês dela');
select is((select (m2 ->> 'saldo')::bigint - (m1 ->> 'saldo')::bigint - ((m2 ->> 'entradasPrevistas')::bigint - (m2 ->> 'saidasPrevistas')::bigint)
           from cx, jsonb_array_elements(c -> 'meses') m1, jsonb_array_elements(c -> 'meses') m2
           where m1 ->> 'mes' = '2026-12-01' and m2 ->> 'mes' = '2027-01-01'), 0::bigint,
  'o saldo previsto soma a parte a caminho');

-- Relatórios.
select is((select (portal_relatorio_resumo(socia, rm) -> 'falta' -> 'aparte' -> 'caminho' ->> 'valor')::bigint from ids), 1914000::bigint,
  'IN-05: a caminho no Falta receber à parte');

-- Mudar a data.
select is((teste.erro($$ select portal_financeiro_requisicao_data(diego, rm, (rq3.r ->> 'id')::uuid, jsonb_build_object('estimadaMes', '2026-12-01', 'motivo', '')) from ids, rq3 $$)) -> 'detalhe' -> 'campos',
  '["motivo"]'::jsonb, 'o motivo é obrigatório');
select is((select portal_financeiro_requisicao_data(diego, rm, (rq3.r ->> 'id')::uuid, jsonb_build_object('estimadaMes', '2026-12-01',
  'motivo', 'O TRF3 publicou a nova data de liberação: dezembro.')) ->> 'passou' from ids, rq3), 'false', 'com data nova, volta à previsão');
select is((select h.dados ->> 'de' from historico h, rq3 where h.acao = 'financeiro.requisicao_data' and h.entidade_id = rq3.r ->> 'id'), '2026-10-01',
  'a data anterior fica no histórico');
select is((select portal_financeiro_requisicao_data(diego, rm, (rq2.r ->> 'id')::uuid, jsonb_build_object('situacao', 'NAO_VAI_ENTRAR',
  'motivo', 'O precatório foi cancelado.')) ->> 'situacao' from ids, rq2), 'NAO_VAI_ENTRAR', 'não vai entrar');
select is((select (portal_financeiro_repasses(diego, rm) -> 'aCaminho' ->> 'n')::integer from ids), 2, 'sai da lista e da previsão');

-- Entrou: vira levantamento, ligado.
create temp table lv as select portal_financeiro_levantamento_registrar(diego, rm, jsonb_build_object('tipo', 'RPV', 'casoId', cs.id, 'clienteId', cli.vale,
    'valor', 1850000, 'entrouEm', '2026-11-18', 'requisicaoId', rq.r ->> 'id', 'divisao', jsonb_build_array(
      jsonb_build_object('para', 'CLIENTE', 'valor', 1480000),
      jsonb_build_object('para', 'HONORARIOS', 'nome', 'Honorários de êxito', 'valor', 370000)))) l
  from ids, cs, cli, rq;
select is((select situacao from requisicoes_a_caminho, rq where id = (rq.r ->> 'id')::uuid), 'ENTROU', 'a requisição entrou');
select is((select levantamento_id::text from requisicoes_a_caminho, rq where id = (rq.r ->> 'id')::uuid), (select l ->> 'id' from lv), 'ligada ao levantamento');
select is((teste.erro($$ select portal_financeiro_requisicao_data(diego, rm, (rq.r ->> 'id')::uuid, jsonb_build_object('estimadaMes', '2027-02-01', 'motivo', 'Mudou de novo.')) from ids, rq $$)) -> 'detalhe' ->> 'motivo',
  'REQUISICAO_RESOLVIDA', 'a que entrou não muda mais');
select is((teste.erro($$ delete from requisicoes_a_caminho $$)) ->> 'codigo', 'TC023', 'não se apaga');

select * from finish();
rollback;
