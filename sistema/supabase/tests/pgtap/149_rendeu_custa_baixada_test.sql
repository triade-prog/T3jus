-- A custa adiantada com baixa sem receber volta a descontar do Rendeu (1103; F3.192: FI-07, FI-25,
-- IN-15; também PT-01, PT-02). Plano (v5, Parte B4). O relógio da aplicação anda de abril a dezembro:
--   1. antes da baixa, as custas de Noemi (R$ 412,30, pagas em 05/10) descontam do Rendeu;
--   2. a baixa de 15/10, com as custas junto, não muda o Rendeu de outubro (falha antes da 1103);
--   3. o mesmo valor por cliente, em um cliente, por área, por responsável e na exportação;
--   4. em um cliente, o adiantado é a soma das adiantadas que não voltaram até o fim do período;
--   5. o mês fechado não muda: rendeu e baixado de outubro, guardados depois da baixa, são os mesmos
--      depois do desfazer de 12/11 e da baixa de dezembro das custas de Rita (pagas em outubro);
--   6. regressão: a reembolsada no período não desconta, a reembolsada depois desconta, a conta sem
--      cliente nunca entra;
--   7. a proteção da regra: nenhuma função dos Relatórios lê conta_reembolso_baixado_no_dia, e o
--      dono, a ACL e os atributos de relatorio_adiantadas não mudam;
--   8. só a sócia dona, e o escritório B não vê as custas do A.
begin;
select plan(35);

select ajustar_relogio(('2026-04-28 10:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, diego, 'Diego Almeida', array['FINANCEIRO']) from ids;

-- ---------------------------------------------------------------------------------------
-- Ajudantes (copiados do 147: as funções pg_temp não passam de um arquivo para outro).
create function pg_temp.cliente(p_quem uuid, p_esc uuid, p_nome text, p_tel text) returns uuid language sql as $$
  select (portal_cliente_cadastrar(p_quem, p_esc, jsonb_build_object('tipo', 'PF', 'nome', p_nome, 'origem', 'GOOGLE',
    'contatos', jsonb_build_array(jsonb_build_object('nome', p_nome, 'telefone', p_tel, 'principal', true)))) ->> 'id')::uuid
$$;
create function pg_temp.contrato(p_quem uuid, p_esc uuid, p_cliente uuid, p_condicoes jsonb) returns uuid language sql as $$
  select (portal_contrato_criar(p_quem, p_esc, jsonb_build_object('clienteId', p_cliente, 'objeto', 'Honorários',
    'responsavelId', p_quem, 'advogados', jsonb_build_array(p_quem), 'condicoes', p_condicoes)) ->> 'id')::uuid
$$;
create function pg_temp.fixo(p_valor bigint, p_venc text) returns jsonb language sql as $$
  select jsonb_build_array(jsonb_build_object('tipo', 'FIXO', 'valor', p_valor, 'vencimento', p_venc))
$$;
create function pg_temp.parcela(p_contrato uuid, p_descricao text default 'Fixo') returns uuid language sql as $$
  select id from recebimentos_previstos where contrato_id = p_contrato and descricao = p_descricao
$$;
create function pg_temp.pagar(p_parcela uuid, p_dia text, p_valor bigint default null) returns jsonb language sql as $$
  select portal_financeiro_receber_registrar_recibo(ids.diego, ids.rm, p_parcela,
    jsonb_build_object('valor', coalesce(p_valor, (select valor from recebimentos_previstos where id = p_parcela)), 'recebidoEm', p_dia, 'forma', 'PIX')) from ids
$$;
create function pg_temp.baixar(p_parcela uuid, p_motivo text, p_expl text, p_falta bigint, p_reembolso boolean default false) returns jsonb language sql as $$
  select portal_financeiro_parcela_baixar(ids.socia, ids.rm, p_parcela,
    jsonb_build_object('motivo', p_motivo, 'explicacao', p_expl, 'falta', p_falta, 'reembolso', p_reembolso)) from ids
$$;
-- Uma despesa (adiantada quando há cliente).
create function pg_temp.custa(p_quem uuid, p_esc uuid, p_desc text, p_valor bigint, p_venc text, p_cliente uuid, p_como text) returns uuid language sql as $$
  select (portal_financeiro_conta_lancar(p_quem, p_esc, jsonb_build_object('descricao', p_desc, 'categoria', 'CUSTAS', 'valor', p_valor,
    'vencimento', p_venc, 'adiantada', p_cliente is not null, 'clienteId', p_cliente, 'reembolsoComo', p_como)) ->> 'id')::uuid
$$;
create function pg_temp.paga(p_quem uuid, p_esc uuid, p_conta uuid, p_dia text) returns jsonb language sql as $$
  select portal_financeiro_conta_paga(p_quem, p_esc, p_conta, jsonb_build_object('pagaEm', p_dia, 'valor', (select valor from contas_pagar where id = p_conta)))
$$;
create function pg_temp.resumo(p_de text, p_ate text) returns jsonb language sql as $$
  select portal_relatorio_resumo(ids.socia, ids.rm, p_de, p_ate, 'nao') from ids
$$;
create function pg_temp.um(p_cliente uuid, p_de text, p_ate text) returns jsonb language sql as $$
  select portal_relatorio_cliente(ids.socia, ids.rm, p_cliente, p_de, p_ate, 'nao') from ids
$$;
-- Em um cliente: a soma das adiantadas pagas no período que não voltaram até o fim dele.
create function pg_temp.soma_adiantadas(p_um jsonb) returns bigint language sql as $$
  select coalesce(sum((a ->> 'valor')::bigint), 0)::bigint from jsonb_array_elements(p_um -> 'adiantadas') a
   where (a ->> 'pagaEm')::date between (p_um -> 'periodo' ->> 'de')::date and (p_um -> 'periodo' ->> 'ate')::date
     and (a ->> 'reembolsadoEm' is null or (a ->> 'reembolsadoEm')::date > (p_um -> 'periodo' ->> 'ate')::date)
$$;

-- O elenco: Noemi (6 × R$ 1.000,00, a 6/6 vence em 10/10, com R$ 412,30 de custas que voltam com
-- ela, como no 147, mas pagas em 05/10), Rita (R$ 150,00 de custas pagas em 08/10, que voltam com a
-- parcela de 20/10, baixada só em dezembro), Tomás (R$ 2.000,00 pagos em 10/10, que fazem o Entrou
-- de outubro, e duas custas à parte: R$ 50,00 reembolsados em 25/10 e R$ 80,00 em 05/11), uma conta
-- do escritório sem cliente (R$ 99,00) e Yara, do escritório B (R$ 77,70 de custas).
create temp table cli as select
  pg_temp.cliente(socia, rm, 'Noemi Bastos Carvalho', '+5511984223170') noemi,
  pg_temp.cliente(socia, rm, 'Rita Fonseca', '+5511984223171') rita,
  pg_temp.cliente(socia, rm, 'Tomás Reis', '+5511984223173') tomas,
  pg_temp.cliente(intrusa, outro, 'Yara do Outro', '+5511984223177') yara
  from ids;
create temp table ct as select
  pg_temp.contrato(socia, rm, cli.noemi, jsonb_build_array(jsonb_build_object('tipo', 'PARCELADO', 'total', 600000, 'parcelas', 6, 'primeiro', '2026-05-10'))) noemi,
  pg_temp.contrato(socia, rm, cli.rita, pg_temp.fixo(480000, '2026-10-20')) rita,
  pg_temp.contrato(socia, rm, cli.tomas, pg_temp.fixo(200000, '2026-10-10')) tomas
  from ids, cli;
select portal_contrato_assinatura(socia, rm, x, 1, '2026-04-28') from ids, ct, unnest(array[ct.noemi, ct.rita, ct.tomas]) x;
create temp table p as select pg_temp.parcela(ct.noemi, 'Parcela 6 de 6') noemi6, pg_temp.parcela(ct.rita) rita, pg_temp.parcela(ct.tomas) tomas from ct;

select ajustar_relogio(('2026-06-05 10:00-03'::timestamptz - now()));
create temp table cp as select
  pg_temp.custa(diego, rm, 'Custas iniciais e diligência do oficial', 41230, '2026-06-05', cli.noemi, 'PROXIMA_PARCELA') noemi
  from ids, cli;

-- As parcelas 1/6 a 5/6 de Noemi pagas.
select ajustar_relogio(('2026-09-20 10:00-03'::timestamptz - now()));
select pg_temp.pagar(pg_temp.parcela(ct.noemi, 'Parcela ' || n || ' de 6'), '2026-' || lpad((4 + n)::text, 2, '0') || '-10') from ct, generate_series(1, 5) n;

-- Outubro: as contas lançadas em 01/10 e pagas entre 05/10 e 10/10.
select ajustar_relogio(('2026-10-01 10:00-03'::timestamptz - now()));
alter table cp add column rita uuid, add column tomas_dentro uuid, add column tomas_depois uuid, add column sem uuid, add column yara uuid;
update cp set
  rita = pg_temp.custa(ids.diego, ids.rm, 'Guia de recolhimento', 15000, '2026-10-01', cli.rita, 'PROXIMA_PARCELA'),
  tomas_dentro = pg_temp.custa(ids.diego, ids.rm, 'Cópias autenticadas', 5000, '2026-10-01', cli.tomas, 'A_PARTE'),
  tomas_depois = pg_temp.custa(ids.diego, ids.rm, 'Correio com aviso de recebimento', 8000, '2026-10-01', cli.tomas, 'A_PARTE'),
  sem = pg_temp.custa(ids.diego, ids.rm, 'Material de escritório', 9900, '2026-10-01', null, null),
  yara = pg_temp.custa(ids.intrusa, ids.outro, 'Custas do outro escritório', 7770, '2026-10-01', cli.yara, 'A_PARTE')
  from ids, cli;
select ajustar_relogio(('2026-10-05 10:00-03'::timestamptz - now()));
select pg_temp.paga(diego, rm, cp.noemi, '2026-10-05') from ids, cp;
select ajustar_relogio(('2026-10-08 10:00-03'::timestamptz - now()));
select pg_temp.paga(diego, rm, cp.rita, '2026-10-08') from ids, cp;
select ajustar_relogio(('2026-10-10 10:00-03'::timestamptz - now()));
select pg_temp.paga(diego, rm, x, '2026-10-10') from ids, cp, unnest(array[cp.tomas_dentro, cp.tomas_depois, cp.sem]) x;
select pg_temp.paga(intrusa, outro, cp.yara, '2026-10-10') from ids, cp;
select pg_temp.pagar(p.tomas, '2026-10-10') from p;

-- ---------------------------------------------------------------------------------------
-- 1. Antes da baixa (14/10).
select ajustar_relogio(('2026-10-14 10:00-03'::timestamptz - now()));
select is((pg_temp.um(cli.noemi, '2026-10-01', '2026-10-14') -> 'numeros' ->> 'adiantado')::bigint, 41230::bigint,
  'FI-07: antes da baixa, as custas de Noemi pagas em 05/10 descontam R$ 412,30 em outubro') from cli;
select is((pg_temp.resumo('2026-10-01', '2026-10-14') -> 'rendeu' ->> 'adiantado')::bigint, 69230::bigint,
  'IN-15: antes da baixa, o adiantado do escritório até 14/10 é R$ 692,30 (Noemi, Rita e as duas de Tomás)');

-- 2. A baixa de 15/10, com as custas junto.
select ajustar_relogio(('2026-10-15 10:00-03'::timestamptz - now()));
select is((pg_temp.baixar(p.noemi6, 'INADIMPLENCIA', 'Noemi recusou pagar depois da perda; não vamos cobrar na Justiça.', 100000, true) ->> 'reembolsosBaixados')::integer, 1,
  'FI-25: a baixa de 15/10 leva as custas de Noemi junto') from p;
select ok(conta_reembolso_baixado(cp.noemi), 'FI-25: (as custas de Noemi estão com baixa sem receber)') from cp;

-- Tomás: as custas de R$ 50,00 voltam em 25/10.
select ajustar_relogio(('2026-10-25 10:00-03'::timestamptz - now()));
select portal_financeiro_conta_reembolsada(diego, rm, cp.tomas_dentro, '{"reembolsadoEm": "2026-10-25"}') from ids, cp;

-- Em 01/11, outubro já fechado.
select ajustar_relogio(('2026-11-01 10:00-03'::timestamptz - now()));
create temp table outubro as select pg_temp.resumo('2026-10-01', '2026-10-31') -> 'rendeu' rendeu,
  pg_temp.resumo('2026-10-01', '2026-10-31') -> 'baixado' baixado;

select is((select (rendeu ->> 'adiantado')::bigint from outubro), 64230::bigint,
  'FI-07: depois da baixa, o adiantado de outubro continua com as custas de Noemi: R$ 642,30 (Noemi, Rita e Tomás depois)');
select is((select (rendeu ->> 'valor')::bigint from outubro), 200000::bigint - 64230,
  'IN-15: e o Rendeu de outubro é Entrou menos R$ 642,30');
select is((pg_temp.resumo('2026-10-01', '2026-10-31') -> 'entrou' ->> 'valor')::bigint, 200000::bigint,
  'IN-15: (o Entrou de outubro é o pagamento de Tomás, R$ 2.000,00)');
select ok((select rendeu -> 'despesas' @> jsonb_build_array(jsonb_build_object('id', cp.noemi, 'valor', 41230)) from outubro, cp),
  'FI-25: as custas baixadas de Noemi estão na lista de despesas que não voltaram');
select is((pg_temp.um(cli.noemi, '2026-10-01', '2026-10-31') -> 'numeros' ->> 'adiantado')::bigint, 41230::bigint,
  'FI-07: em um cliente, Noemi continua com R$ 412,30 de adiantado em outubro') from cli;
select is((pg_temp.um(cli.noemi, '2026-10-01', '2026-10-31') -> 'numeros' ->> 'rendeu')::bigint, -41230::bigint,
  'IN-15: e o Rendeu de Noemi em outubro é 0 − R$ 412,30') from cli;

-- 3. O mesmo valor nos recortes.
create temp table pc as select portal_relatorio_clientes(socia, rm, '2026-10-01', '2026-10-31', 'nao') -> 'clientes' j from ids;
select is((select (x ->> 'adiantado')::bigint from pc, jsonb_array_elements(pc.j) x, cli where (x ->> 'id')::uuid = cli.noemi), 41230::bigint,
  'FI-07: por cliente, Noemi tem R$ 412,30 de adiantado');
select is((select sum((x ->> 'adiantado')::bigint)::bigint from pc, jsonb_array_elements(pc.j) x), 64230::bigint,
  'IN-15: a soma por cliente fecha com a visão geral');
select is((select sum((x ->> 'adiantado')::bigint)::bigint from ids, jsonb_array_elements(portal_relatorio_areas(socia, rm, '2026-10-01', '2026-10-31', 'nao') -> 'areas') x),
  64230::bigint, 'IN-15: a soma por área fecha com a visão geral');
select is((select sum((x ->> 'adiantado')::bigint)::bigint from ids, jsonb_array_elements(portal_relatorio_responsaveis(socia, rm, '2026-10-01', '2026-10-31', 'nao') -> 'responsaveis') x),
  64230::bigint, 'IN-15: a soma por responsável fecha com a visão geral');
create temp table ex as select portal_relatorio_exportar(socia, rm, '{"formato":"XLSX","visao":"visao","de":"2026-10-01","ate":"2026-10-31","comparar":"nao"}') j from ids;
select is((select j -> 'resumo' -> 'rendeu' from ex), (select rendeu from outubro), 'IN-15: a exportação leva o mesmo Rendeu da visão geral');
select is((select (x ->> 'adiantado')::bigint from ex, jsonb_array_elements(ex.j -> 'clientes') x, cli where (x ->> 'id')::uuid = cli.noemi), 41230::bigint,
  'FI-07: e a lista por cliente exportada também tem as custas de Noemi');

-- 4. Um cliente: o adiantado é a soma das adiantadas que não voltaram até o fim do período.
select is((pg_temp.um(cli.noemi, '2026-10-01', '2026-10-31') -> 'numeros' ->> 'adiantado')::bigint, pg_temp.soma_adiantadas(pg_temp.um(cli.noemi, '2026-10-01', '2026-10-31')),
  'FI-25: em Noemi, o adiantado de outubro é a soma das adiantadas que não voltaram, com a baixa') from cli;
select is((pg_temp.um(cli.tomas, '2026-10-01', '2026-10-31') -> 'numeros' ->> 'adiantado')::bigint, pg_temp.soma_adiantadas(pg_temp.um(cli.tomas, '2026-10-01', '2026-10-31')),
  'FI-07: em Tomás também') from cli;

-- 5. O mês fechado não muda: o desfazer em 12/11 e a baixa das custas de Rita em 03/12.
select ajustar_relogio(('2026-11-05 10:00-03'::timestamptz - now()));
select portal_financeiro_conta_reembolsada(diego, rm, cp.tomas_depois, '{"reembolsadoEm": "2026-11-05"}') from ids, cp;
select ajustar_relogio(('2026-11-12 10:00-03'::timestamptz - now()));
select portal_financeiro_parcela_baixa_desfazer(socia, rm, p.noemi6, '{"explicacao":"Noemi ligou e vai pagar"}') from ids, p;
select ajustar_relogio(('2026-12-03 10:00-03'::timestamptz - now()));
select is((pg_temp.baixar(p.rita, 'PERDOADA', 'Combinamos perdoar a parcela e as custas', 480000, true) ->> 'reembolsosBaixados')::integer, 1,
  'FI-25: a baixa de 03/12 de Rita leva junto as custas pagas em outubro') from p;
select ok(not conta_reembolso_baixado(cp.noemi) and conta_reembolso_baixado(cp.rita),
  'FI-25: (a baixa de Noemi foi desfeita, e as custas de Rita estão com baixa)') from cp;
select is(pg_temp.resumo('2026-10-01', '2026-10-31') -> 'rendeu', (select rendeu from outubro),
  'IN-15 nota 2: o Rendeu de outubro guardado depois da baixa é o mesmo depois do desfazer e da baixa de dezembro');
select is(pg_temp.resumo('2026-10-01', '2026-10-31') -> 'baixado', (select baixado from outubro),
  'IN-15 nota 2: e o Baixado sem receber de outubro (1101) também');
select is((pg_temp.um(cli.rita, '2026-10-01', '2026-10-31') -> 'numeros' ->> 'adiantado')::bigint, 15000::bigint,
  'FI-25: as custas de Rita, pagas em outubro e baixadas em dezembro, continuam descontando em outubro') from cli;
select is((pg_temp.resumo('2026-12-01', '2026-12-03') -> 'rendeu' ->> 'adiantado')::bigint, 0::bigint,
  'FI-07: e não descontam em dezembro, quando não foram pagas');
-- O caminho "comparar" (adi_c, revisão L4): novembro comparado com outubro.
select is((portal_relatorio_resumo(socia, rm, '2026-11-01', '2026-11-30', 'anterior') -> 'rendeu' ->> 'anterior')::bigint, 200000::bigint - 64230,
  'IN-15: novembro comparado com outubro: o Rendeu anterior também desconta as custas baixadas (Entrou − R$ 642,30)') from ids;

-- 6. Regressão.
select ok(not exists (select 1 from ids, cp, relatorio_adiantadas(ids.rm, '2026-10-01', '2026-10-31') a where a.conta_id = cp.tomas_dentro),
  'FI-07: a custa reembolsada dentro do período (25/10) não desconta');
select ok(exists (select 1 from ids, cp, relatorio_adiantadas(ids.rm, '2026-10-01', '2026-10-31') a where a.conta_id = cp.tomas_depois and a.valor = 8000),
  'FI-07: a reembolsada depois do período (05/11) desconta em outubro');
select ok(not exists (select 1 from ids, cp, relatorio_adiantadas(ids.rm, '2026-01-01', '2026-12-03') a where a.conta_id = cp.sem),
  'FI-07: a conta sem cliente nunca entra');

-- 7. A proteção da regra.
-- Vale para toda função dos Relatórios (relatorio_% e os portal_relatorio_*) e para qualquer outra
-- que leia relatorio_adiantadas (revisão, L3).
select ok(not exists (select 1 from pg_proc
                       where (proname like '%relatorio%' or strpos(prosrc, 'relatorio_adiantadas') > 0)
                         and strpos(prosrc, 'conta_reembolso_baixado_no_dia') > 0),
  'FI-25: nenhuma função dos Relatórios, nem quem lê relatorio_adiantadas, lê conta_reembolso_baixado_no_dia');
select ok((select count(*) = 1 from pg_proc where proname = 'conta_reembolso_baixado_no_dia')
          and not exists (select 1 from pg_proc where proname = 't1103_trocar'),
  'FI-25: conta_reembolso_baixado_no_dia fica no banco, e a troca por trecho da 1103 não fica');
-- A troca é CREATE OR REPLACE: o dono, a ACL e os atributos continuam os da 0410 (revisão, L5).
select ok((select pg_get_userbyid(proowner) = 'dominio' and proacl::text = '{dominio=X/dominio}'
             and not has_function_privilege('public', oid, 'execute')
             and not has_function_privilege('authenticated', oid, 'execute')
             and not has_function_privilege('service_role', oid, 'execute')
             from pg_proc where oid = 'relatorio_adiantadas(uuid,date,date)'::regprocedure),
  'IN-15: relatorio_adiantadas continua do dono dominio, sem execute para public, authenticated e service_role');
select ok((select provolatile = 's' and not prosecdef and proconfig = '{search_path=public}' and prorettype = 'record'::regtype and proretset
             from pg_proc where oid = 'relatorio_adiantadas(uuid,date,date)'::regprocedure),
  'IN-15: e continua STABLE, sem security definer, com search_path public e o mesmo returns table');

-- 8. Quem vê.
select is((teste.erro($$ select portal_relatorio_resumo(diego, rm, '2026-10-01', '2026-10-31', 'nao') from ids $$)) -> 'detalhe' ->> 'motivo', 'SO_SOCIO_DONO',
  'PT-02: Diego, com o Financeiro e sem ser sócio dono, não abre o Rendeu');
select is((portal_relatorio_resumo(intrusa, outro, '2026-10-01', '2026-10-31', 'nao') -> 'rendeu' ->> 'adiantado')::bigint, 7770::bigint,
  'PT-01: o escritório B vê só as custas dele') from ids;
select is((teste.erro($$ select portal_relatorio_cliente(intrusa, outro, cli.noemi) from ids, cli $$)) ->> 'codigo', 'TC404',
  'PT-01: e não abre um cliente do escritório A');

select * from finish();
rollback;
