-- Financeiro do Portal, parte 3: Repasses. A divisão proposta pelo contrato (êxito e reembolsos
-- do caso), a soma que fecha, o prazo de 3 dias úteis, feito e dispensado com motivo, o reembolso
-- que se fecha com o repasse, a prestação de contas, nada se apaga, área e isolamento
-- (FI-05, FI-06, FI-12, PA-01, PT-01).
begin;
select plan(33);

select ajustar_relogio(('2026-11-19 10:00-03'::timestamptz - now()));

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
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Benedito Souza Lima', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Benedito Souza Lima', 'telefone', '+5511996027736', 'principal', true)))) ->> 'id')::uuid ben,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Rosa Lima', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Rosa Lima', 'telefone', '+5511996027737', 'principal', true)))) ->> 'id')::uuid rosa
  from ids;
create temp table ct as select
  (portal_contrato_criar(socia, rm, jsonb_build_object('clienteId', cli.ben, 'objeto', 'Revisão de aposentadoria',
     'responsavelId', ids.socia, 'advogados', jsonb_build_array(ids.socia),
     'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'EXITO', 'percentual', 3000, 'sobre', 'Atrasados que o cliente receber', 'etapa', 'Pagamento da RPV', 'dias', 15)))) ->> 'id')::uuid id
  from ids, cli;
select portal_juridico_etapas(socia, rm) from ids;
create temp table cs as select
  (portal_juridico_caso_criar(socia, rm, jsonb_build_object('nome', 'Lima x INSS', 'area', 'PREVIDENCIARIO',
     'etapaId', (select id from etapas where escritorio_id = ids.rm and ordem = 7), 'responsavelId', ids.socia,
     'clientes', jsonb_build_array(jsonb_build_object('clienteId', cli.ben, 'papel', 'AUTOR', 'contratoId', ct.id),
                                   jsonb_build_object('clienteId', cli.rosa, 'papel', 'AUTOR')))) ->> 'id')::uuid lima
  from ids, cli, ct;
create temp table cp as select
  (portal_financeiro_conta_lancar(diego, rm, jsonb_build_object('descricao', 'Perícia médica', 'categoria', 'CUSTAS',
     'valor', 80000, 'vencimento', '2026-10-10', 'adiantada', true, 'clienteId', cli.ben, 'casoId', cs.lima, 'reembolsoComo', 'LEVANTAMENTO')) ->> 'id')::uuid pericia,
  (portal_financeiro_conta_lancar(diego, rm, jsonb_build_object('descricao', 'Cópias do processo', 'categoria', 'CUSTAS',
     'valor', 5000, 'vencimento', '2026-10-12', 'adiantada', true, 'clienteId', cli.ben, 'casoId', cs.lima, 'reembolsoComo', 'PROXIMA_PARCELA')) ->> 'id')::uuid copias
  from ids, cli, cs;

-- Área e isolamento.
select is((teste.erro($$ select portal_financeiro_repasses(paula, rm) from ids $$)) -> 'detalhe' ->> 'motivo', 'AREA_NAO_LIBERADA',
  'PA-01: sem a área Financeiro, Repasses é recusado');
select is((select portal_financeiro_repasses(diego, rm) ->> 'algum' from ids), 'false', 'primeiro uso: nenhum levantamento');
select is((select portal_financeiro_repasses(diego, rm) -> 'casos' -> 0 -> 'clientes' -> 1 ->> 'nome' from ids), 'Rosa Lima',
  'os casos vêm com os clientes, para registrar');

-- A divisão proposta.
create temp table pr as select portal_financeiro_repasse_proposta(diego, rm, jsonb_build_object('casoId', cs.lima, 'clienteId', cli.ben, 'valor', 4280000)) p
  from ids, cs, cli;
select is((select p -> 'linhas' -> 0 ->> 'valor' from pr), '1284000', 'FI-05: os honorários de êxito saem do percentual do contrato');
select is((select p -> 'linhas' -> 0 ->> 'regra' from pr), '30% · Atrasados que o cliente receber · contrato ' || (select numero from contratos, ct where contratos.id = ct.id),
  'com a regra do contrato à vista');
select is((select jsonb_array_length(p -> 'linhas') from pr), 2, 'só o reembolso que volta no levantamento entra');
select is((select (p -> 'linhas' -> 1 ->> 'valor')::bigint from pr), 80000::bigint, 'o reembolso pelo valor adiantado');
select is((select (p ->> 'cliente')::bigint from pr), 2916000::bigint, 'o resto é do cliente');
select is((select portal_financeiro_repasse_proposta(diego, rm, jsonb_build_object('casoId', cs.lima, 'clienteId', cli.rosa, 'valor', 100000)) -> 'linhas' from ids, cs, cli),
  '[]'::jsonb, 'cliente sem contrato e sem adiantamento: tudo é dele');
select is((teste.erro($$ select portal_financeiro_repasse_proposta(intrusa, outro, jsonb_build_object('casoId', cs.lima, 'clienteId', cli.ben, 'valor', 100)) from ids, cs, cli $$)) -> 'detalhe' -> 'campos',
  '["casoId"]'::jsonb, 'outro escritório não acha o caso');

-- Registrar.
select is((teste.erro($$ select portal_financeiro_levantamento_registrar(diego, rm, '{}'::jsonb) from ids $$)) -> 'detalhe' -> 'campos',
  '["tipo", "casoId", "valor", "entrouEm", "divisao"]'::jsonb, 'registrar sem nada aponta os campos');
select is((teste.erro($$ select portal_financeiro_levantamento_registrar(diego, rm, jsonb_build_object('tipo', 'RPV', 'casoId', cs.lima, 'clienteId', cli.ben,
  'valor', 4280000, 'entrouEm', '2026-11-17', 'divisao', jsonb_build_array(
    jsonb_build_object('para', 'HONORARIOS', 'nome', 'Honorários de êxito', 'valor', 1284000),
    jsonb_build_object('para', 'CLIENTE', 'valor', 2900000)))) from ids, cs, cli $$)) -> 'detalhe',
  '{"motivo": "DIVISAO_NAO_FECHA", "campos": ["divisao"], "falta": 96000}'::jsonb, 'a soma tem de fechar com o valor levantado');
select is((teste.erro($$ select portal_financeiro_levantamento_registrar(diego, rm, jsonb_build_object('tipo', 'RPV', 'casoId', cs.lima, 'clienteId', cli.ben,
  'valor', 4280000, 'entrouEm', '2026-11-17', 'divisao', jsonb_build_array(
    jsonb_build_object('para', 'REEMBOLSO', 'nome', 'Cópias', 'valor', 5000, 'contaId', cp.copias),
    jsonb_build_object('para', 'HONORARIOS', 'nome', 'Honorários', 'valor', 1284000)))) from ids, cs, cli, cp $$)) -> 'detalhe' -> 'campos',
  '["divisao"]'::jsonb, 'sem a linha do cliente, recusa');
select is((teste.erro($$ select portal_financeiro_levantamento_registrar(diego, rm, jsonb_build_object('tipo', 'RPV', 'casoId', cs.lima, 'clienteId', cli.ben,
  'valor', 4280000, 'entrouEm', '2026-11-20', 'divisao', jsonb_build_array(jsonb_build_object('para', 'CLIENTE', 'valor', 4280000)))) from ids, cs, cli $$)) -> 'detalhe' -> 'campos',
  '["entrouEm"]'::jsonb, 'o dinheiro não entra depois de hoje');

create temp table lv as select
  (portal_financeiro_levantamento_registrar(diego, rm, jsonb_build_object('tipo', 'RPV', 'casoId', cs.lima, 'clienteId', cli.ben,
    'valor', 4280000, 'entrouEm', '2026-11-17', 'divisao', jsonb_build_array(
      jsonb_build_object('para', 'CLIENTE', 'valor', 2836000),
      jsonb_build_object('para', 'HONORARIOS', 'nome', 'Honorários de êxito', 'regra', '30%', 'valor', 1284000),
      jsonb_build_object('para', 'REEMBOLSO', 'nome', 'Reembolso: Perícia médica', 'valor', 80000, 'contaId', cp.pericia),
      jsonb_build_object('para', 'PERITO', 'nome', 'Dr. Paulo Mendes', 'valor', 80000)))) ->> 'id')::uuid id
  from ids, cs, cli, cp;

create temp table fx as select portal_financeiro_repasse(diego, rm, lv.id) f from ids, lv;
select is((select f -> 'destinacoes' -> 0 ->> 'nome' from fx), 'Benedito Souza Lima', 'a parte do cliente leva o nome dele');
select is((select f -> 'destinacoes' -> 0 ->> 'prazo' from fx), '2026-11-23', 'FI-05: prazo de 3 dias úteis depois que entrou (20/11 é feriado nacional)');
select is((select f ->> 'feitos' from fx), '0', 'nada feito ainda');
select is((select f -> 'cliente' ->> 'telefone' from fx), '+5511996027736', 'o WhatsApp do cliente, para a prestação de contas');

create temp table lista as select portal_financeiro_repasses(diego, rm) l from ids;
select is((select (l -> 'totais') - 'atrasados'::text - 'repassesAtrasados'::text - 'semMotivo'::text from lista),
  '{"aRepassar": 2916000, "repassesPendentes": 2, "honorarios": 1364000, "casos": 1}'::jsonb,
  'FI-06: o que é de terceiros fica separado da parte do escritório');
select is((select jsonb_array_length(l -> 'levantamentos') from lista), 1, 'o bloco aparece na lista');
select is((select portal_financeiro_repasse_proposta(diego, rm, jsonb_build_object('casoId', cs.lima, 'clienteId', cli.ben, 'valor', 100000)) -> 'linhas' -> 1 from ids, cs, cli),
  null::jsonb, 'o reembolso já destinado não é proposto de novo');

-- Feito e dispensado.
create temp table ds as select
  (select (d ->> 'id')::uuid from fx, jsonb_array_elements(f -> 'destinacoes') d where d ->> 'para' = 'CLIENTE') cliente,
  (select (d ->> 'id')::uuid from fx, jsonb_array_elements(f -> 'destinacoes') d where d ->> 'para' = 'REEMBOLSO') reembolso,
  (select (d ->> 'id')::uuid from fx, jsonb_array_elements(f -> 'destinacoes') d where d ->> 'para' = 'PERITO') perito;
select is((teste.erro($$ select portal_financeiro_destinacao_feita(diego, rm, ds.cliente, '{"feitoEm": "2026-11-16"}') from ids, ds $$)) -> 'detalhe' -> 'campos',
  '["feitoEm"]'::jsonb, 'não sai antes de entrar');
select is((teste.erro($$ select portal_financeiro_destinacao_feita(diego, rm, ds.cliente, '{"feitoEm": "2026-11-20"}') from ids, ds $$)) -> 'detalhe' ->> 'motivo',
  'DATA_NO_FUTURO', 'nem depois de hoje');
select is((select portal_financeiro_destinacao_feita(diego, rm, ds.cliente, '{"feitoEm": "2026-11-18"}') ->> 'situacao' from ids, ds), 'FEITO', 'o repasse ao cliente feito');
select portal_financeiro_destinacao_feita(diego, rm, ds.reembolso, '{"feitoEm": "2026-11-18"}') from ids, ds;
select is((select reembolsado_em from contas_pagar, cp where id = cp.pericia), '2026-11-18'::date, 'o reembolso feito fecha a conta adiantada');
select is((teste.erro($$ select portal_financeiro_destinacao_feita(diego, rm, ds.cliente, '{"feitoEm": "2026-11-18"}') from ids, ds $$)) -> 'detalhe' ->> 'motivo',
  'REPASSE_JA_RESOLVIDO', 'não se faz duas vezes');
select is((teste.erro($$ select portal_financeiro_destinacao_dispensar(diego, rm, ds.perito, 'x') from ids, ds $$)) -> 'detalhe' ->> 'motivo',
  'MOTIVO_OBRIGATORIO', 'dispensar pede o motivo');
select is((select portal_financeiro_destinacao_dispensar(diego, rm, ds.perito, 'O perito recebeu direto do tribunal') -> 'dispensa' ->> 'motivo' from ids, ds),
  'O perito recebeu direto do tribunal', 'dispensado guarda o motivo');

select is((select portal_financeiro_repasses(diego, rm) -> 'repassadoMes' from ids), '{"valor": 2836000, "clientes": 1}'::jsonb, 'repassado no mês');
select ok((select portal_financeiro_prestacao_enviada(diego, rm, lv.id) ->> 'prestacaoEm' is not null from ids, lv), 'FI-12: a prestação de contas fica marcada como enviada');
select is((select jsonb_array_length(portal_financeiro_repasse(diego, rm, lv.id) -> 'historico') from ids, lv), 5, 'tudo fica no histórico do repasse');

-- Nada se apaga, e outro escritório não vê.
select is((teste.erro($$ delete from destinacoes where levantamento_id = (select id from lv) $$)) ->> 'codigo', 'TC023', 'repasse não se apaga');
select is((teste.erro($$ select portal_financeiro_repasse(intrusa, outro, lv.id) from ids, lv $$)) ->> 'codigo', 'TC404', 'outro escritório não abre o repasse');

select * from finish();
rollback;
