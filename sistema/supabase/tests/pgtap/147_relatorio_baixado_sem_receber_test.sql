-- "Baixado sem receber" nos Relatórios do sócio (1101; F3.173: IN-04, IN-07, FI-24; também PT-01,
-- PT-02, PT-11). Plano aprovado (v2, seção B6). O relógio da aplicação anda de maio a dezembro:
--   1. a baixa de 15/10 desfeita em 02/12: outubro dá R$ 1.000,00, novembro dá 0 e dezembro mostra
--      o desfazer em "desfeitas";
--   2. nota 11: o JSON de outubro guardado antes do desfazer é igual ao de depois;
--   3. a renegociada e as custas ficam fora do número, e as desfeitas delas vão para o grupo certo;
--   4. paga em parte: o valor é só o que faltava;
--   5. o dia é o de Brasília (23h30 de 31/10 conta em outubro);
--   6. por cliente: o cliente só com baixa aparece, a soma fecha com a visão geral e a explicação
--      não vem para o cliente excluído;
--   7. a comparação "anterior";
--   8. a exportação traz as baixas sem a explicação e vai ao histórico;
--   9. só a sócia dona, e o escritório B não vê as baixas do A;
--  10. baixa, desfazer e baixa de novo da mesma parcela no mesmo mês: uma parcela só, valor bruto.
begin;
select plan(51);

select ajustar_relogio(('2026-04-28 10:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Felipe Matos') as felipe,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, diego, 'Diego Almeida', array['FINANCEIRO']),
       portal_convidar(socia, rm, felipe, 'Felipe Matos', array['CONTRATOS']) from ids;

-- ---------------------------------------------------------------------------------------
-- Ajudantes.
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
-- A folha da visão geral num período (sem comparação).
create function pg_temp.folha(p_de text, p_ate text) returns jsonb language sql as $$
  select relatorio_baixado_json(ids.rm, p_de::date, p_ate::date, null, null) from ids
$$;
create function pg_temp.um(p_cliente uuid, p_de text, p_ate text) returns jsonb language sql as $$
  select portal_relatorio_cliente(ids.socia, ids.rm, p_cliente, p_de, p_ate, 'nao') from ids
$$;

-- O elenco do desenho (rb-): Noemi (6 × R$ 1.000,00, a 6/6 vence em 10/10, com R$ 412,30 de custas
-- que voltam com ela), Rita (o êxito de R$ 4.800,00), Sebastião (renegociado), e mais: Tomás (pago em
-- parte), Ulisses (baixa às 23h30 de 31/10), Vera (excluída depois) e Xavier (contrato encerrado
-- antes do período, só com a baixa nele).
create temp table cli as select
  pg_temp.cliente(socia, rm, 'Noemi Bastos Carvalho', '+5511984223170') noemi,
  pg_temp.cliente(socia, rm, 'Rita Fonseca', '+5511984223171') rita,
  pg_temp.cliente(socia, rm, 'Sebastião Lopes', '+5511984223172') seb,
  pg_temp.cliente(socia, rm, 'Tomás Reis', '+5511984223173') tomas,
  pg_temp.cliente(socia, rm, 'Ulisses Prado', '+5511984223174') uli,
  pg_temp.cliente(socia, rm, 'Vera Lúcia Maia', '+5511984223175') vera,
  pg_temp.cliente(socia, rm, 'Xavier Antunes', '+5511984223176') xav,
  pg_temp.cliente(intrusa, outro, 'Yara do Outro', '+5511984223177') yara
  from ids;
create temp table ct as select
  pg_temp.contrato(socia, rm, cli.noemi, jsonb_build_array(jsonb_build_object('tipo', 'PARCELADO', 'total', 600000, 'parcelas', 6, 'primeiro', '2026-05-10'))) noemi,
  pg_temp.contrato(socia, rm, cli.rita, pg_temp.fixo(480000, '2026-10-20')) rita,
  pg_temp.contrato(socia, rm, cli.seb, pg_temp.fixo(50000, '2026-10-01')) seb,
  pg_temp.contrato(socia, rm, cli.tomas, pg_temp.fixo(100000, '2026-09-01')) tomas,
  pg_temp.contrato(socia, rm, cli.uli, pg_temp.fixo(20000, '2026-09-15')) uli,
  pg_temp.contrato(socia, rm, cli.vera, pg_temp.fixo(10000, '2026-09-10')) vera,
  pg_temp.contrato(socia, rm, cli.xav, pg_temp.fixo(5000, '2026-08-01')) xav,
  pg_temp.contrato(intrusa, outro, cli.yara, pg_temp.fixo(77700, '2026-09-01')) yara
  from ids, cli;
select portal_contrato_assinatura(socia, rm, x, 1, '2026-04-28')
  from ids, ct, unnest(array[ct.noemi, ct.rita, ct.seb, ct.tomas, ct.uli, ct.vera, ct.xav]) x;
select portal_contrato_assinatura(intrusa, outro, ct.yara, 1, '2026-04-28') from ids, ct;
create temp table p as select
  pg_temp.parcela(ct.noemi, 'Parcela 6 de 6') noemi6, pg_temp.parcela(ct.rita) rita, pg_temp.parcela(ct.seb) seb,
  pg_temp.parcela(ct.tomas) tomas, pg_temp.parcela(ct.uli) uli, pg_temp.parcela(ct.vera) vera,
  pg_temp.parcela(ct.xav) xav, pg_temp.parcela(ct.yara) yara
  from ct;

select ajustar_relogio(('2026-06-05 10:00-03'::timestamptz - now()));
select portal_financeiro_conta_lancar(diego, rm, jsonb_build_object('descricao', 'Custas iniciais e diligência do oficial', 'categoria', 'CUSTAS',
  'valor', 41230, 'vencimento', '2026-06-05', 'adiantada', true, 'clienteId', cli.noemi, 'reembolsoComo', 'PROXIMA_PARCELA')) from ids, cli;

-- As parcelas 1/6 a 5/6 de Noemi pagas; Tomás paga R$ 300,00 dos R$ 1.000,00.
select ajustar_relogio(('2026-09-20 10:00-03'::timestamptz - now()));
select pg_temp.pagar(pg_temp.parcela(ct.noemi, 'Parcela ' || n || ' de 6'), '2026-' || lpad((4 + n)::text, 2, '0') || '-10') from ct, generate_series(1, 5) n;
select pg_temp.pagar(p.tomas, '2026-09-05', 30000) from p;

-- Outubro.
select ajustar_relogio(('2026-10-03 10:00-03'::timestamptz - now()));
select pg_temp.baixar(p.xav, 'PERDOADA', 'Combinado no encerramento do contrato', 5000) from p;
select ajustar_relogio(('2026-10-05 10:00-03'::timestamptz - now()));
select pg_temp.baixar(p.vera, 'PERDOADA', 'Vera perdeu o emprego; perdoamos a parcela', 10000) from p;
select ajustar_relogio(('2026-10-15 10:00-03'::timestamptz - now()));
select pg_temp.baixar(p.noemi6, 'INADIMPLENCIA', 'Noemi recusou pagar depois da perda; não vamos cobrar na Justiça.', 100000, true) from p;
select ajustar_relogio(('2026-10-20 10:00-03'::timestamptz - now()));
select pg_temp.baixar(p.tomas, 'PERDOADA', 'O resto fica perdoado', 70000) from p;
select ajustar_relogio(('2026-10-31 23:30-03'::timestamptz - now()));
select pg_temp.baixar(p.uli, 'INADIMPLENCIA', 'Ulisses não responde', 20000) from p;
-- O escritório B também tem uma baixa em outubro.
select portal_financeiro_parcela_baixar(intrusa, outro, p.yara, jsonb_build_object('motivo', 'PERDOADA', 'explicacao', 'Do outro escritório', 'falta', 77700))
  from ids, p;

-- Xavier: o contrato foi encerrado em 20/09 (arrumado direto, só para o cenário: fica fora de
-- relatorio_contratos de outubro em diante).
set local session_replication_role = replica;
update contratos set estado = 'ENCERRADO', encerrado_em = '2026-09-20 12:00-03', motivo_encerramento = 'Acordo de encerramento' from ct where contratos.id = ct.xav;
set local session_replication_role = origin;

select ok((select (b.feito_em at time zone 'UTC')::text like '2026-11-01 02:30%' from parcela_baixas b, p where b.parcela_id = p.uli),
  'IN-07: a baixa de Ulisses foi às 02h30 UTC de 01/11 (23h30 de 31/10 em Brasília)');

-- Em 01/11, o JSON de outubro, antes de qualquer desfazer (nota 11).
select ajustar_relogio(('2026-11-01 10:00-03'::timestamptz - now()));
create temp table outubro as select pg_temp.folha('2026-10-01', '2026-10-31') j,
  (pg_temp.um(cli.noemi, '2026-10-01', '2026-10-31') -> 'numeros') - 'falta' - 'vencido' noemi from cli;

-- Novembro: Rita (inadimplência) e Sebastião (renegociado).
select ajustar_relogio(('2026-11-05 10:00-03'::timestamptz - now()));
select pg_temp.baixar(p.rita, 'INADIMPLENCIA', 'Rita disse que o banco não pagou o acordo; não vamos cobrar agora.', 480000) from p;
select ajustar_relogio(('2026-11-10 10:00-03'::timestamptz - now()));
select pg_temp.baixar(p.seb, 'RENEGOCIADA', 'Virou duas parcelas de R$ 250,00', 50000) from p;

-- Dezembro: a baixa de Noemi é desfeita, com as custas que foram junto.
select ajustar_relogio(('2026-12-02 10:00-03'::timestamptz - now()));
select portal_financeiro_parcela_baixa_desfazer(socia, rm, p.noemi6, '{"explicacao":"Noemi ligou e vai pagar"}') from ids, p;

-- Vera pede a exclusão dos dados (a marca da 1092, arrumada direto, só para o cenário).
set local session_replication_role = replica;
update clientes_escritorio set estado = 'EXCLUIDO', excluido_em = app_now(), contatos = '[]'::jsonb, origem_indicacao = null
  from cli where clientes_escritorio.id = cli.vera;
set local session_replication_role = origin;

-- ---------------------------------------------------------------------------------------
-- 1. As peças.
select ok((select count(*) = 2 and bool_and(not prosecdef) from pg_proc where proname in ('relatorio_baixas', 'relatorio_baixado_json')),
  'IN-04: relatorio_baixas e relatorio_baixado_json existem e não são security definer');
select ok(exists (select 1 from pg_indexes where indexname = 'parcela_baixas_dia'), 'IN-04: o índice de parcela_baixas pelo dia');
select ok(not exists (select 1 from pg_proc where proname = 't1101_trocar'), 'IN-04: a troca por trecho da 1101 não fica no banco');

-- 1. Baixa em 15/10, desfeita em 02/12.
select is((pg_temp.um(cli.noemi, '2026-10-01', '2026-10-31') -> 'numeros' ->> 'baixado')::bigint, 100000::bigint,
  'IN-04: outubro de Noemi dá R$ 1.000,00, mesmo depois do desfazer') from cli;
select is((pg_temp.um(cli.noemi, '2026-11-01', '2026-11-30') -> 'numeros' ->> 'baixado')::bigint, 0::bigint,
  'IN-04: novembro de Noemi dá 0') from cli;
select is((pg_temp.um(cli.noemi, '2026-12-01', '2026-12-02') -> 'numeros' ->> 'baixadoDesfeitas')::bigint, 100000::bigint,
  'IN-04: dezembro de Noemi mostra o desfazer de R$ 1.000,00 em desfeitas') from cli;
select is((pg_temp.um(cli.noemi, '2026-12-01', '2026-12-02') -> 'numeros' ->> 'baixado')::bigint, 0::bigint,
  'IN-04: e o número de dezembro não fica negativo: dá 0') from cli;
select is(pg_temp.folha('2026-12-01', '2026-12-02') -> 'desfeitas', '{"n": 1, "valor": 100000}'::jsonb,
  'IN-04: na visão geral de dezembro, uma desfeita de R$ 1.000,00');
select is(pg_temp.folha('2026-11-01', '2026-11-30') -> 'desfeitas', '{"n": 0, "valor": 0}'::jsonb,
  'IN-04: novembro não tem desfeita');

-- 2. Nota 11: um mês passado não muda.
select is(pg_temp.folha('2026-10-01', '2026-10-31'), (select j from outubro), 'IN-07 nota 11: o JSON de outubro de antes do desfazer é igual ao de depois');
select is((pg_temp.um(cli.noemi, '2026-10-01', '2026-10-31') -> 'numeros') - 'falta' - 'vencido', (select noemi from outubro),
  'IN-07 nota 11: os números de outubro de Noemi também (Falta receber é sempre de hoje)') from cli;
select is((pg_temp.folha('2026-10-01', '2026-10-31') ->> 'valor')::bigint, 205000::bigint,
  'IN-04: outubro soma Xavier, Vera, Noemi, Tomás e Ulisses: R$ 2.050,00');
select is((pg_temp.folha('2026-10-01', '2026-10-31') ->> 'n')::integer, 5, 'IN-04: são 5 parcelas em outubro');
select is(pg_temp.folha('2026-10-01', '2026-10-31') -> 'porMotivo', '{"PERDOADA": 85000, "INADIMPLENCIA": 120000}'::jsonb,
  'IN-04: por motivo, perdoada R$ 850,00 e inadimplência R$ 1.200,00');

-- 3. A renegociada e as custas.
select is((pg_temp.folha('2026-11-01', '2026-11-30') ->> 'valor')::bigint, 480000::bigint,
  'FI-24: novembro dá só Rita: a renegociada de Sebastião não soma');
select is(pg_temp.folha('2026-11-01', '2026-11-30') -> 'renegociado', '{"n": 1, "valor": 50000, "desfeitas": {"n": 0, "valor": 0}}'::jsonb,
  'FI-24: a renegociada fica ao lado, em "Renegociado no período"');
select is(pg_temp.folha('2026-10-01', '2026-10-31') -> 'custas', '{"n": 1, "valor": 41230, "desfeitas": {"n": 0, "valor": 0}}'::jsonb,
  'FI-25: as custas baixadas junto em outubro ficam ao lado, sem somar');
select is(pg_temp.folha('2026-12-01', '2026-12-02') -> 'custas', '{"n": 0, "valor": 0, "desfeitas": {"n": 1, "valor": 41230}}'::jsonb,
  'FI-25 nota 20: o desfazer das custas vai para as desfeitas das custas, não para as desfeitas da parcela');
select is((select count(*)::integer from ids, relatorio_baixas(ids.rm, '2026-12-01', '2026-12-02') b where b.tipo = 'DESFEITA' and b.custas and b.motivo = 'INADIMPLENCIA'), 1,
  'nota 20: a DESFEITA das custas herda o motivo e a marca de custas da baixa');

-- 4. Paga em parte.
select is((pg_temp.um(cli.tomas, '2026-10-01', '2026-10-31') -> 'numeros' ->> 'baixado')::bigint, 70000::bigint,
  'FI-24: Tomás pagou R$ 300,00 de R$ 1.000,00: a baixa é só dos R$ 700,00 que faltavam') from cli;

-- 5. O dia de Brasília.
select is((select dia from relatorio_baixas(ids.rm, '2026-10-01', '2026-10-31') b, p where b.parcela_id = p.uli), '2026-10-31'::date,
  'IN-07: a baixa às 23h30 de 31/10 conta em outubro') from ids;
select ok(not exists (select 1 from relatorio_baixas(ids.rm, '2026-11-01', '2026-11-30') b, p where b.parcela_id = p.uli),
  'IN-07: e não em novembro') from ids;

-- 6. Por cliente.
create temp table pc as select portal_relatorio_clientes(socia, rm, '2026-10-01', '2026-11-30', 'nao') -> 'clientes' j from ids;
select is((select (x ->> 'baixado')::bigint from pc, jsonb_array_elements(pc.j) x, cli where (x ->> 'id')::uuid = cli.xav), 5000::bigint,
  'IN-04: Xavier, com o contrato encerrado antes do período, entra na lista só pela baixa');
select ok((select not exists (select 1 from relatorio_contratos(ids.rm, '2026-10-01', '2026-11-30') c, cli where c.cliente_id = cli.xav) from ids),
  'IN-04: (Xavier não tem contrato no período)');
select is((select sum((x ->> 'baixado')::bigint)::bigint from pc, jsonb_array_elements(pc.j) x),
  (select (portal_relatorio_resumo(socia, rm, '2026-10-01', '2026-11-30', 'nao') -> 'baixado' ->> 'valor')::bigint from ids),
  'IN-04: a soma por cliente fecha com a visão geral');
select is((select (x ->> 'baixado')::bigint from pc, jsonb_array_elements(pc.j) x, cli where (x ->> 'id')::uuid = cli.seb), 0::bigint,
  'FI-24: Sebastião, só com a renegociada, tem 0 na coluna');
select is((select x -> 'baixadoMotivos' from pc, jsonb_array_elements(pc.j) x, cli where (x ->> 'id')::uuid = cli.rita), '["INADIMPLENCIA"]'::jsonb,
  'IN-04: a coluna diz o motivo');
select is((select x -> 'responsaveis' from pc, jsonb_array_elements(pc.j) x, cli where (x ->> 'id')::uuid = cli.xav), '["Marina Ribeiro"]'::jsonb,
  'IN-04: Xavier, só com a baixa, leva o responsável do contrato da baixa');
select is((select x -> 'areas' from pc, jsonb_array_elements(pc.j) x, cli where (x ->> 'id')::uuid = cli.xav),
  (select jsonb_build_array(relatorio_area(relatorio_caso_do_contrato(ct.xav))) from ct),
  'IN-04: e a área dele (não some no filtro "Área")');
select is((pg_temp.um(cli.noemi, '2026-10-01', '2026-10-31') -> 'baixas' -> 0 ->> 'explicacao'),
  'Noemi recusou pagar depois da perda; não vamos cobrar na Justiça.', 'PT-02: no relatório de Noemi, a explicação vem') from cli;
select is((pg_temp.um(cli.noemi, '2026-10-01', '2026-10-31') -> 'baixas' -> 0 ->> 'desfeitaEm'), '2026-12-02',
  'IN-07: a baixa de outubro diz "desfeita em" 02/12, sem mudar o número') from cli;
select is((select count(*)::integer from jsonb_array_elements(pg_temp.um(cli.noemi, '2026-10-01', '2026-12-02') -> 'baixas') x where x ->> 'tipo' = 'DESFEITA' and not (x ->> 'custas')::boolean), 1,
  'IN-04: de outubro a dezembro, a lista de Noemi tem a baixa e o desfazer') from cli;
select is((select x ->> 'baixaEm' from cli, jsonb_array_elements(pg_temp.um(cli.noemi, '2026-12-01', '2026-12-02') -> 'baixas') x where not (x ->> 'custas')::boolean), '2026-10-15',
  'IN-07: o desfazer de dezembro diz de que dia é a baixa ("não tira de 15/10")');
select ok((select x ? 'explicacao' and x -> 'explicacao' = 'null'::jsonb from cli, jsonb_array_elements(pg_temp.um(cli.vera, '2026-10-01', '2026-10-31') -> 'baixas') x),
  'PT-11: para o cliente excluído, a explicação não vem');
select is((pg_temp.um(cli.vera, '2026-10-01', '2026-10-31') -> 'numeros' ->> 'baixado')::bigint, 10000::bigint,
  'PT-11: o número do cliente excluído continua') from cli;

-- 7. A comparação.
select is((portal_relatorio_resumo(socia, rm, '2026-11-01', '2026-11-30', 'anterior') -> 'baixado' ->> 'anterior')::bigint, 205000::bigint,
  'IN-07: novembro comparado com outubro: anterior R$ 2.050,00') from ids;
select is((portal_relatorio_resumo(socia, rm, '2026-11-01', '2026-11-30', 'nao') -> 'baixado' -> 'anterior'), 'null'::jsonb,
  'IN-07: sem comparação, anterior é nulo') from ids;
select is((portal_relatorio_resumo(socia, rm, '2026-11-01', '2026-11-30', 'nao') -> 'baixado' ->> 'algum')::boolean, true,
  'IN-04: algum diz que o escritório já teve baixa') from ids;

-- 8. A exportação.
create temp table ex as select portal_relatorio_exportar(socia, rm, '{"formato":"XLSX","visao":"visao","de":"2026-10-01","ate":"2026-12-02","comparar":"nao"}') j from ids;
select is((select jsonb_array_length(j -> 'baixas') from ex), 10, 'IN-04: a exportação traz as 10 linhas do período (8 baixas e 2 desfeitas)');
select ok((select bool_and(not (x ? 'explicacao')) from ex, jsonb_array_elements(ex.j -> 'baixas') x), 'PT-02: nenhuma linha da exportação leva a explicação');
select is((select x ->> 'contrato' from ex, jsonb_array_elements(ex.j -> 'baixas') x where x ->> 'cliente' = 'Rita Fonseca'),
  (select numero from contratos, ct where contratos.id = ct.rita), 'IN-04: cada linha tem o cliente e o número do contrato');
select ok((select (j -> 'resumo' -> 'baixado') is not null and (j -> 'clientes' -> 0) ? 'baixado' from ex), 'IN-04: o resumo e a lista por cliente exportados têm o número novo');
select is((select count(*)::integer from historico h, ids where h.escritorio_id = ids.rm and h.acao = 'financeiro.relatorio_exportado'), 1,
  'PT-03: a exportação ficou no histórico');

-- 9. Quem vê.
select is((teste.erro($$ select portal_relatorio_cliente(diego, rm, cli.noemi) from ids, cli $$)) -> 'detalhe' ->> 'motivo', 'SO_SOCIO_DONO',
  'PT-02: Diego, com o Financeiro e sem ser sócio dono, não abre o relatório de um cliente');
select is((teste.erro($$ select portal_relatorio_exportar(diego, rm, '{"formato":"XLSX","visao":"visao"}') from ids $$)) -> 'detalhe' ->> 'motivo', 'SO_SOCIO_DONO',
  'PT-02: nem exporta');
select is((portal_relatorio_resumo(intrusa, outro, '2026-10-01', '2026-10-31', 'nao') -> 'baixado' ->> 'valor')::bigint, 77700::bigint,
  'PT-01: o escritório B vê só a baixa dele') from ids;
select is((teste.erro($$ select portal_relatorio_cliente(intrusa, outro, cli.noemi) from ids, cli $$)) ->> 'codigo', 'TC404',
  'PT-01: e não abre um cliente do escritório A');

-- 10. Janeiro: a parcela 6/6 de Noemi tem baixa em 05/01, é desfeita em 06/01 e tem baixa de novo
-- em 07/01. O número segue bruto (B2.2: as duas baixas somam, o desfazer fica ao lado), mas conta
-- uma parcela só.
select ajustar_relogio(('2027-01-05 10:00-03'::timestamptz - now()));
select pg_temp.baixar(p.noemi6, 'INADIMPLENCIA', 'Noemi não pagou de novo', 100000) from p;
select ajustar_relogio(('2027-01-06 10:00-03'::timestamptz - now()));
select portal_financeiro_parcela_baixa_desfazer(socia, rm, p.noemi6, '{"explicacao":"Noemi prometeu pagar"}') from ids, p;
select ajustar_relogio(('2027-01-07 10:00-03'::timestamptz - now()));
select pg_temp.baixar(p.noemi6, 'INADIMPLENCIA', 'Não pagou', 100000) from p;
select is((pg_temp.folha('2027-01-01', '2027-01-07') ->> 'n')::integer, 1, 'IN-04: baixa, desfazer e baixa de novo: uma parcela só');
select is((pg_temp.folha('2027-01-01', '2027-01-07') ->> 'valor')::bigint, 200000::bigint, 'IN-04: o valor segue bruto (B2.2): as duas baixas somam');
select is(pg_temp.folha('2027-01-01', '2027-01-07') -> 'desfeitas', '{"n": 1, "valor": 100000}'::jsonb, 'IN-04: e o desfazer fica ao lado, em desfeitas');

select * from finish();
rollback;
