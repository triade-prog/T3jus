-- Fechamento no financeiro do caso sem levantamento (0900, 0901; F3.132: EX-16, EX-17, FI-08):
-- o passo "Encerrar no financeiro" também no caso sem RPV nem alvará, com contrato ligado; o
-- acerto com a parcela, quem paga e a parcela que leva o reembolso; "Pronto para encerrar
-- depois de …" (pergunta 1); o contrato com outro caso em andamento não segura este (pergunta 3);
-- a ficha do contrato com os fechamentos do caso; área e isolamento (PT-01, PT-02).
begin;
select plan(50);

select ajustar_relogio(('2026-05-28 10:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Larissa Costa') as larissa,
  teste.pessoa('Felipe Matos') as felipe,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, diego, 'Diego Almeida', array['FINANCEIRO', 'COMERCIAL']),
       portal_convidar(socia, rm, larissa, 'Larissa Costa', array['JURIDICO']),
       portal_convidar(socia, rm, felipe, 'Felipe Matos', array['CONTRATOS', 'COMERCIAL']) from ids;

create function pg_temp.cliente(p_nome text, p_tel text) returns uuid language sql as $$
  select (portal_cliente_cadastrar(ids.socia, ids.rm, jsonb_build_object('tipo', 'PF', 'nome', p_nome, 'origem', 'GOOGLE',
    'contatos', jsonb_build_array(jsonb_build_object('nome', p_nome, 'telefone', p_tel, 'principal', true)))) ->> 'id')::uuid from ids
$$;
create function pg_temp.contrato(p_cliente uuid, p_objeto text, p_condicoes jsonb) returns uuid language sql as $$
  select (portal_contrato_criar(ids.socia, ids.rm, jsonb_build_object('clienteId', p_cliente, 'objeto', p_objeto,
    'responsavelId', ids.felipe, 'advogados', jsonb_build_array(ids.socia), 'condicoes', p_condicoes)) ->> 'id')::uuid from ids
$$;
create function pg_temp.caso(p_nome text, p_clientes jsonb) returns uuid language sql as $$
  select (portal_juridico_caso_criar(ids.socia, ids.rm, jsonb_build_object('nome', p_nome, 'area', 'CIVEL',
    'etapaId', (select id from etapas where escritorio_id = ids.rm and ordem = 5), 'responsavelId', ids.larissa,
    'clientes', p_clientes)) ->> 'id')::uuid from ids
$$;
create function pg_temp.encerrar(p_caso uuid, p_dados jsonb) returns jsonb language sql as $$
  select portal_juridico_caso_etapa(ids.larissa, ids.rm, p_caso, (select versao from casos where id = p_caso),
    jsonb_build_object('etapaId', (select id from etapas where escritorio_id = ids.rm and final), 'motivo', 'Sentença sem recurso') || p_dados) from ids
$$;
create function pg_temp.pagar(p_parcela uuid, p_dia text) returns jsonb language sql as $$
  select portal_financeiro_receber_registrar_recibo(ids.diego, ids.rm, p_parcela,
    jsonb_build_object('valor', (select valor from recebimentos_previstos where id = p_parcela), 'recebidoEm', p_dia, 'forma', 'PIX')) from ids
$$;
create function pg_temp.parcela(p_contrato uuid, p_descricao text) returns uuid language sql as $$
  select id from recebimentos_previstos where contrato_id = p_contrato and descricao = p_descricao
$$;
select portal_juridico_casos(socia, rm) from ids;

-- O caso A: "Carvalho x Construtora Lume", perdido. Noemi com 6 × R$ 1.000,00 (5 pagas, a 6/6
-- vencida em 10/11) e Cláudio à vista, pago e com o contrato encerrado por Felipe; as custas de
-- R$ 412,30 voltam junto com a próxima parcela de Noemi.
create temp table cli as select
  pg_temp.cliente('Noemi Bastos Carvalho', '+5511984223170') noemi,
  pg_temp.cliente('Cláudio Carvalho', '+5511984223171') claudio,
  pg_temp.cliente('Rafaela Moura', '+5511984223172') rafa,
  pg_temp.cliente('Paulo Andrade', '+5511984223173') paulo,
  pg_temp.cliente('Tomás Reis', '+5511984223174') tomas,
  pg_temp.cliente('Sônia Lima', '+5511984223175') sonia,
  pg_temp.cliente('Ivo Prates', '+5511984223176') ivo;
create temp table ct as select
  pg_temp.contrato(cli.noemi, 'Vício construtivo', jsonb_build_array(
    jsonb_build_object('tipo', 'PARCELADO', 'total', 600000, 'parcelas', 6, 'primeiro', '2026-06-10'),
    jsonb_build_object('tipo', 'EXITO', 'percentual', 2000, 'sobre', 'Valor da condenação', 'etapa', 'Encerrado', 'dias', 0))) noemi,
  pg_temp.contrato(cli.claudio, 'Vício construtivo', jsonb_build_array(
    jsonb_build_object('tipo', 'FIXO', 'valor', 150000, 'vencimento', '2026-06-02'))) claudio,
  pg_temp.contrato(cli.paulo, 'Consultoria e ações', jsonb_build_array(
    jsonb_build_object('tipo', 'MENSAL', 'valor', 120000, 'primeiro', '2026-06-10', 'meses', 12),
    jsonb_build_object('tipo', 'EXITO', 'percentual', 2000, 'sobre', 'Valor do acordo', 'etapa', 'Encerrado', 'dias', 0))) paulo,
  pg_temp.contrato(cli.tomas, 'Cobrança', jsonb_build_array(jsonb_build_object('tipo', 'FIXO', 'valor', 50000, 'vencimento', '2026-06-01'))) tomas,
  pg_temp.contrato(cli.tomas, 'Consultoria', jsonb_build_array(jsonb_build_object('tipo', 'FIXO', 'valor', 70000, 'vencimento', '2026-12-01'))) tomas2,
  pg_temp.contrato(cli.sonia, 'Revisão', jsonb_build_array(
    jsonb_build_object('tipo', 'PARCELADO', 'total', 600000, 'parcelas', 6, 'primeiro', '2026-08-20'))) sonia,
  pg_temp.contrato(cli.ivo, 'Três ações', jsonb_build_array(jsonb_build_object('tipo', 'FIXO', 'valor', 90000, 'vencimento', '2026-06-01'))) ivo
  from cli;
select portal_contrato_assinatura(socia, rm, x, 1, '2026-05-28')
  from ids, ct, unnest(array[ct.noemi, ct.claudio, ct.paulo, ct.tomas, ct.tomas2, ct.sonia, ct.ivo]) x;
create temp table cs as select
  pg_temp.caso('Carvalho x Construtora Lume', jsonb_build_array(
    jsonb_build_object('clienteId', cli.noemi, 'papel', 'AUTOR', 'contratoId', ct.noemi),
    jsonb_build_object('clienteId', cli.claudio, 'papel', 'AUTOR', 'contratoId', ct.claudio))) a,
  -- Decisão 3: o caso sem contrato e só com despesa.
  pg_temp.caso('Moura x Vizinho', jsonb_build_array(jsonb_build_object('clienteId', cli.rafa, 'papel', 'AUTOR'))) rafa,
  -- Pergunta 3: o contrato de mensalidade de Paulo cobre dois casos.
  pg_temp.caso('Andrade x Loja Um', jsonb_build_array(jsonb_build_object('clienteId', cli.paulo, 'papel', 'AUTOR', 'contratoId', ct.paulo))) pa,
  pg_temp.caso('Andrade x Loja Dois', jsonb_build_array(jsonb_build_object('clienteId', cli.paulo, 'papel', 'AUTOR', 'contratoId', ct.paulo))) pb,
  pg_temp.caso('Reis x Banco', jsonb_build_array(jsonb_build_object('clienteId', cli.tomas, 'papel', 'AUTOR', 'contratoId', ct.tomas))) tomas,
  -- Pergunta 1: perdido no 4º mês de 6 parcelas, sem atraso.
  pg_temp.caso('Lima x INSS', jsonb_build_array(jsonb_build_object('clienteId', cli.sonia, 'papel', 'AUTOR', 'contratoId', ct.sonia))) sonia,
  -- A confirmar (b): três casos no mesmo contrato.
  pg_temp.caso('Prates 1', jsonb_build_array(jsonb_build_object('clienteId', cli.ivo, 'papel', 'AUTOR', 'contratoId', ct.ivo))) i1,
  pg_temp.caso('Prates 2', jsonb_build_array(jsonb_build_object('clienteId', cli.ivo, 'papel', 'AUTOR', 'contratoId', ct.ivo))) i2,
  pg_temp.caso('Prates 3', jsonb_build_array(jsonb_build_object('clienteId', cli.ivo, 'papel', 'AUTOR', 'contratoId', ct.ivo))) i3
  from cli, ct;

-- As despesas adiantadas, lançadas em junho.
select ajustar_relogio(('2026-06-05 10:00-03'::timestamptz - now()));
create function pg_temp.custas(p_cliente uuid, p_caso uuid, p_desc text, p_valor bigint) returns uuid language sql as $$
  select (portal_financeiro_conta_lancar(ids.diego, ids.rm, jsonb_build_object('descricao', p_desc, 'categoria', 'CUSTAS', 'valor', p_valor,
    'vencimento', '2026-06-05', 'adiantada', true, 'clienteId', p_cliente, 'casoId', p_caso, 'reembolsoComo', 'PROXIMA_PARCELA')) ->> 'id')::uuid from ids
$$;
create temp table cp as select
  pg_temp.custas(cli.noemi, cs.a, 'Custas iniciais e diligência do oficial', 41230) noemi,
  pg_temp.custas(cli.noemi, cs.a, 'Cópias lançadas em dobro', 5000) dobro,
  pg_temp.custas(cli.rafa, cs.rafa, 'Custas iniciais', 20000) rafa,
  pg_temp.custas(cli.tomas, cs.tomas, 'Diligência', 8000) tomas,
  pg_temp.custas(cli.sonia, cs.sonia, 'Perícia', 30000) sonia
  from cli, cs;
-- A conta lançada em dobro foi cancelada: não soma nem pende.
update contas_pagar set cancelada_em = app_now(), cancelada_por = ids.socia, cancelada_motivo = 'Lançada em dobro' from ids, cp where contas_pagar.id = cp.dobro;

-- Hoje: 18/11/2026. Os pagamentos de cada um, e o encerramento dos casos.
select ajustar_relogio(('2026-11-18 10:00-03'::timestamptz - now()));
select pg_temp.pagar(pg_temp.parcela(ct.noemi, 'Parcela ' || n || ' de 6'), '2026-' || lpad((5 + n)::text, 2, '0') || '-10')
  from ct, generate_series(1, 5) n;
select pg_temp.pagar(pg_temp.parcela(ct.claudio, 'Fixo'), '2026-06-02') from ct;
select pg_temp.pagar(pg_temp.parcela(ct.tomas, 'Fixo'), '2026-06-01') from ct;
select pg_temp.pagar(pg_temp.parcela(ct.ivo, 'Fixo'), '2026-06-01') from ct;
select pg_temp.pagar(pg_temp.parcela(ct.sonia, 'Parcela ' || n || ' de 6'), '2026-' || lpad((7 + n)::text, 2, '0') || '-20')
  from ct, generate_series(1, 3) n;
select pg_temp.pagar(r.id, r.vencimento::text) from ct, recebimentos_previstos r where r.contrato_id = ct.paulo and r.vencimento < '2026-11-18';
select portal_contrato_encerrar(felipe, rm, ct.claudio, (select versao from contratos where id = ct.claudio), 'Tudo recebido; o caso terminou com perda.')
  from ids, ct;
select pg_temp.encerrar(cs.a, '{"resultado": "PERDA"}'), pg_temp.encerrar(cs.rafa, '{"resultado": "PERDA"}'),
       pg_temp.encerrar(cs.tomas, '{"resultado": "PERDA"}'), pg_temp.encerrar(cs.sonia, '{"resultado": "PERDA"}') from cs;
select pg_temp.encerrar(cs.pa, jsonb_build_object('resultado', 'ACORDO', 'previstoEm', '2026-12-15', 'valores', jsonb_build_object(cli.paulo, 1000000)))
  from cs, cli;
select portal_financeiro_exito_lancar(diego, rm, x.id, '{"valor": 200000, "vencimento": "2026-12-15"}')
  from ids, cs, exitos_conferir x where x.caso_id = cs.pa;

-- ---------------------------------------------------------------------------------------
-- O passo na ficha do cliente.
create temp table pn as select portal_cliente(socia, rm, cli.noemi) -> 'passo' p from ids, cli;
create temp table fn as select j f from pn, jsonb_array_elements(p -> 'item' -> 'passos') j where j ->> 'tipo' = 'FINANCEIRO';
select is((select jsonb_path_query_array(p -> 'item' -> 'passos', '$[*].tipo') from pn), '["FINANCEIRO", "CONTRATO"]'::jsonb,
  'EX-16: o caso sem levantamento com contrato tem o passo "Encerrar no financeiro"');
select is((select f ->> 'contratoId' from fn), (select noemi::text from ct), 'EX-16 (decisão 4): "Ver o acerto" leva ao contrato da própria Noemi');
select is((select (f ->> 'valor')::bigint from fn), 141230::bigint, 'EX-16: faltam R$ 1.412,30');
select is((select f -> 'pendentes' from fn), '["parcela 6 de 6", "custas"]'::jsonb, 'EX-16: a parcela 6/6 e as custas, pelo nome curto');
create temp table fl as select j f from ids, cli, jsonb_array_elements(portal_cliente(larissa, rm, cli.noemi) -> 'passo' -> 'item' -> 'passos') j
  where j ->> 'tipo' = 'FINANCEIRO';
select ok((select f -> 'contratoId' = 'null' and f -> 'casoId' = 'null' and f -> 'valor' = 'null' and f -> 'pendentes' = 'null' and f -> 'aVencer' = 'null'
                  and f -> 'comLevantamento' = 'false' from fl),
  'PT-02: sem o Financeiro (Larissa), o passo vem sem contrato, caso, valor, pendentes e espera');
select is((select jsonb_build_array(p ->> 'tipo', jsonb_array_length(p -> 'item' -> 'passos')) from ids, cli, lateral (select portal_cliente(socia, rm, cli.rafa) -> 'passo' p) x),
  '["ATENDIDO", 0]'::jsonb, 'decisão 3: o caso sem contrato e só com despesa não tem passo nem fica pendente');

-- A ficha do caso no Jurídico.
create temp table ra as select portal_juridico_caso(socia, rm, cs.a) -> 'acerto' a from ids, cs;
select ok((select a -> 'pendente' = 'true' and a ->> 'contratoId' = (select noemi::text from ct) and a -> 'semTerceiros' = 'true' from ra),
  'EX-17: "Encerrado · acerto pendente", com o contrato para "Ver o acerto" e sem valor de terceiros');
select is((select a -> 'semExito' from ra), 'true'::jsonb, 'EX-17: sem êxito a cobrar na perda');
select is((select jsonb_agg(jsonb_build_array(o ->> 'tipo', o ->> 'junto')) from ra, jsonb_array_elements(a -> 'outros') o),
  '[["PARCELA", null], ["REEMBOLSO", "Parcela 6 de 6"]]'::jsonb, 'EX-17: a parcela que falta e as custas, que vão junto com ela');
create temp table rl as select portal_juridico_caso(larissa, rm, cs.a) -> 'acerto' a from ids, cs;
select ok((select a -> 'contratoId' = 'null' and a -> 'outros' = 'null' and a -> 'faltaOutros' = 'true'
                  and a -> 'semTerceiros' = 'true' and a -> 'semExito' = 'true' from rl),
  'PT-02: sem o Financeiro, o resumo vem sem contrato e sem valores, mas com o que não tem valor');
select ok((select bool_and(not (c ? 'recebido') and not (c ? 'falta') and not (c ? 'tudoRecebido') and c ? 'encerradoEm')
             from rl, jsonb_array_elements(a -> 'contratos') c),
  'PT-02: os contratos sem o recebido para quem não tem o Financeiro');
select is((select c -> 'tudoRecebido' from ra, jsonb_array_elements(a -> 'contratos') c where c ->> 'id' = (select claudio::text from ct)),
  'true'::jsonb, 'EX-17: "Cláudio: tudo recebido"');

-- O acerto (pergunta 3 e os campos novos).
create temp table ac as select portal_financeiro_caso_acerto(diego, rm, cs.a) a from ids, cs;
select is((select a -> 'quemContratos' from ac), '["Felipe Matos", "Marina Ribeiro"]'::jsonb,
  'decisão 10: Diego, sem Contratos, sabe quem encerra os contratos');
select is((select p ->> 'parcelaId' from ac, jsonb_array_elements(a -> 'pendencias') p where p ->> 'tipo' = 'PARCELA'),
  (select pg_temp.parcela(ct.noemi, 'Parcela 6 de 6')::text from ct), 'FI-08: a pendência da parcela traz a parcela');
select is((select p -> 'parcela' ->> 'id' from ac, jsonb_array_elements(a -> 'pendencias') p where p ->> 'tipo' = 'REEMBOLSO'),
  (select pg_temp.parcela(ct.noemi, 'Parcela 6 de 6')::text from ct), 'FI-08: e o reembolso, a parcela que o leva junto');
select is((select a -> 'aVencer' from ac), 'null'::jsonb, 'pergunta 1: com a parcela vencida, não há "pronto depois de"');
select is((select jsonb_build_array(a -> 'recebidoNoCaso', a -> 'contratosNoRecebido') from ac), '[650000, 2]'::jsonb,
  'FI-08: recebido no caso, R$ 6.500,00, de 2 contratos');
select is((select a -> 'reembolsos' from ac), '{"adiantado": 41230, "reembolsado": 0}'::jsonb, 'FI-08: o adiantado, sem a conta cancelada');
select is((select jsonb_agg(jsonb_build_array(j ->> 'numero', j -> 'encerradoPor' ->> 'nome')) from ac, jsonb_array_elements(a -> 'contratosJaEncerrados') j),
  jsonb_build_array(jsonb_build_array((select numero from contratos, ct where id = ct.claudio), 'Felipe Matos')),
  'decisão 9: o contrato de Cláudio já encerrado, por Felipe');
select is((select jsonb_path_query_array(a -> 'contratosLigados', '$[*].id') from ac), jsonb_build_array((select noemi::text from ct)),
  'EX-17: só o contrato ativo se encerra junto');

-- 11c (ajuste 7): o reembolso de Tomás vai numa parcela de outro contrato dele.
select is((select p -> 'parcela' -> 'contrato' ->> 'id' from ids, cs, jsonb_array_elements(portal_financeiro_caso_acerto(diego, rm, cs.tomas) -> 'pendencias') p
            where p ->> 'tipo' = 'REEMBOLSO'), (select tomas2::text from ct), 'FI-08: o reembolso preso à parcela de outro contrato diz qual');

-- A ficha do contrato.
create temp table fc as select portal_financeiro_contrato_fechamentos(socia, rm, ct.claudio) f from ids, ct;
select is((select jsonb_array_length(f) from fc), 1, 'decisão 4: o contrato de Cláudio traz o fechamento do caso');
select is((select f -> 0 -> 'acerto' from fc), (select portal_financeiro_caso_acerto(socia, rm, cs.a) from ids, cs),
  'decisão 4 (EX-01): com o mesmo acerto do caso inteiro');
select is((teste.erro($$ select portal_financeiro_contrato_fechamentos(intrusa, outro, ct.claudio) from ids, ct $$)) ->> 'codigo', 'TC404',
  'PT-01: o contrato de outro escritório não é achado');
select is((teste.erro($$ select portal_financeiro_contrato_fechamentos(larissa, rm, ct.claudio) from ids, ct $$)) -> 'detalhe' ->> 'motivo',
  'AREA_NAO_LIBERADA', 'PT-02: sem a área Financeiro, recusa');
select ok((select f -> 0 -> 'origem' @> '[{"acao": "juridico.etapa"}, {"acao": "contrato.encerrado"}]' from fc)
          and (select portal_financeiro_contrato_fechamentos(socia, rm, ct.noemi) -> 0 -> 'origem' @> '[{"acao": "financeiro.recebimento"}]' from ids, ct),
  'decisão 1: "De onde veio" traz o encerramento com perda, o contrato encerrado e os recebimentos deste contrato');
select is((select f -> 0 -> 'origem' -> 0 -> 'dados' ->> 'resultado' from fc), 'PERDA', 'o mais recente primeiro, com o resultado');
select is((select count(*) from pg_proc where proname in ('caso_acerto_parcelas', 'caso_acerto_quadro', 'contrato_fechamento_origem') and prosecdef),
  0::bigint, 'ajuste 1: as auxiliares não são security definer');
select ok((select prosecdef from pg_proc where proname = 'portal_financeiro_contrato_fechamentos')
          and has_function_privilege('service_role', 'portal_financeiro_contrato_fechamentos(uuid, uuid, uuid)', 'execute'),
  'só a função de entrada é, e o servidor a chama');

-- Decisão 2: o caso encerrado por importação desfeita não entra.
set local session_replication_role = replica;
update casos set situacao = 'ENCERRADO', encerrado_em = app_now(), encerrado_por = 'IMPORTACAO_DESFEITA', resultado = null from cs where casos.id = cs.i3;
set local session_replication_role = origin;

-- A confirmar (b): três casos no mesmo contrato, dois já fechados.
select pg_temp.encerrar(cs.i1, '{"resultado": "PERDA"}') from cs;
select portal_financeiro_caso_encerrar(diego, rm, cs.i1) from ids, cs;
select ajustar_relogio(('2026-11-18 10:05-03'::timestamptz - now()));
select pg_temp.encerrar(cs.i2, '{"resultado": "PERDA"}') from cs;
select portal_financeiro_caso_encerrar(diego, rm, cs.i2) from ids, cs;
create temp table fi as select portal_financeiro_contrato_fechamentos(socia, rm, ct.ivo) f from ids, ct;
select is((select jsonb_path_query_array(f, '$[*].casoId') from fi), (select jsonb_build_array(i2::text, i1::text) from cs),
  'decisões 2 e (b): um item por caso encerrado, sem o da importação desfeita, o mais recente primeiro');
select ok((select f -> 0 ? 'acerto' and f -> 1 -> 'resumo' = 'true' and not (f -> 1 ? 'acerto') from fi),
  'sugestão 2: o fechado mais antigo vem só com o resumo');

-- ---------------------------------------------------------------------------------------
-- Encerrar.
select is((select jsonb_array_length(((teste.erro($$ select portal_financeiro_caso_encerrar(socia, rm, cs.a, '[]'::jsonb) from ids, cs $$))
  -> 'detalhe' -> 'pendencias')) ), 2, 'FI-08: com a 6/6 em aberto, recusa com a parcela e as custas');
select portal_financeiro_receber_registrar_recibo(diego, rm, pg_temp.parcela(ct.noemi, 'Parcela 6 de 6'),
  jsonb_build_object('valor', 100000, 'recebidoEm', '2026-11-17', 'forma', 'PIX', 'reembolso', jsonb_build_object('valor', 41230, 'forma', 'PIX')))
  from ids, ct;
select is((select portal_financeiro_caso_acerto(diego, rm, cs.a) -> 'pendencias' from ids, cs), '[]'::jsonb,
  'FI-08: a parcela e o reembolso registrados juntos zeram o que falta');
select is((teste.erro($$ select portal_financeiro_caso_encerrar(socia, rm, cs.a,
  jsonb_build_array(jsonb_build_object('id', ct.claudio, 'versao', (select versao from contratos where id = ct.claudio)))) from ids, cs, ct $$))
  -> 'detalhe' ->> 'motivo', 'CONTRATO_FORA_DO_CASO', 'EX-17: o contrato já encerrado não entra na lista');
select is((select jsonb_array_length(portal_financeiro_caso_encerrar(socia, rm, cs.a,
  jsonb_build_array(jsonb_build_object('id', ct.noemi, 'versao', (select versao from contratos where id = ct.noemi)))) -> 'contratosEncerrados')
  from ids, cs, ct), 1, 'EX-17: o caso e o contrato de Noemi se encerram juntos');
select ok((select estado = 'ENCERRADO' from contratos, ct where id = ct.noemi) and exists (select 1 from fechamentos_caso f, cs where f.caso_id = cs.a),
  'com o fechamento gravado e o contrato encerrado');
select ok((select portal_cliente(socia, rm, cli.noemi) -> 'passo' ->> 'tipo' = 'ATENDIDO' from ids, cli)
          and (select portal_juridico_caso(socia, rm, cs.a) -> 'acerto' -> 'pendente' = 'false' from ids, cs),
  'EX-16: Noemi passa a "Cliente atendido" e o caso sai de "acerto pendente"');
select is((teste.erro($$ select portal_financeiro_caso_encerrar(diego, rm, cs.a, '[]'::jsonb) from ids, cs $$)) -> 'detalhe' ->> 'motivo',
  'CASO_JA_ENCERRADO', 'decisão 12: pelo contrato de Cláudio, o caso já encerrado é recusado');

-- ---------------------------------------------------------------------------------------
-- A parcela a vencer (pergunta 1): Sônia perdeu no 4º mês de 6 parcelas, sem atraso.
create temp table as1 as select portal_financeiro_caso_acerto(diego, rm, cs.sonia) a from ids, cs;
select ok((select portal_juridico_caso(socia, rm, cs.sonia) -> 'acerto' -> 'pendente' = 'true' from ids, cs),
  'FI-08 (pergunta 1): sem atraso, o caso com parcela a vencer continua pendente');
select is((select a -> 'aVencer' ->> 'vencimento' from as1), '2027-01-20', 'FI-08: "pronto depois de" é o vencimento da última parcela');
select is((select p -> 'parcela' ->> 'vencimento' from as1, jsonb_array_elements(a -> 'pendencias') p where p ->> 'tipo' = 'REEMBOLSO'), '2026-11-20',
  'ajuste 7: o reembolso conta pela parcela que o leva, não pela conta de junho');
select is((select j -> 'aVencer' ->> 'vencimento' from ids, cli, jsonb_array_elements(portal_cliente(socia, rm, cli.sonia) -> 'passo' -> 'item' -> 'passos') j
            where j ->> 'tipo' = 'FINANCEIRO'), '2027-01-20', 'FI-08: o passo da ficha traz a mesma espera');
select ajustar_relogio(('2026-11-21 10:00-03'::timestamptz - now()));
select is((select portal_financeiro_caso_acerto(diego, rm, cs.sonia) -> 'aVencer' from ids, cs), 'null'::jsonb,
  'FI-08: vencida a 4ª parcela, a primeira ainda não paga, a espera vira atraso');
select ajustar_relogio(('2026-11-18 10:10-03'::timestamptz - now()));

-- ---------------------------------------------------------------------------------------
-- O contrato com outro caso em andamento (pergunta 3): a mensalidade de Paulo cobre dois casos.
create temp table ap as select portal_financeiro_caso_acerto(diego, rm, cs.pa) a from ids, cs;
select is((select count(*) from ap, jsonb_array_elements(a -> 'pendencias') p where p ->> 'tipo' = 'PARCELA' and not (p ->> 'exito')::boolean), 0::bigint,
  'EX-01 (pergunta 3): as mensalidades ficam com o caso em andamento');
select is((select c -> 'seguePor' -> 0 ->> 'nome' from ap, jsonb_array_elements(a -> 'contratos') c), 'Andrade x Loja Dois',
  'EX-01: e o quadro diz com qual');
select is((select count(*) from ap, jsonb_array_elements(a -> 'pendencias') p where (p ->> 'exito')::boolean), 1::bigint,
  'decisão (a), a confirmar: o êxito do caso continua pendente nele');
select is((select jsonb_path_query_array(portal_financeiro_contrato_fechamentos(socia, rm, ct.paulo), '$[*].casoId') from ids, ct),
  (select jsonb_build_array(pa::text) from cs), 'decisão 2: o caso em andamento não entra na ficha do contrato');
select pg_temp.encerrar(cs.pb, '{"resultado": "PERDA"}') from cs;
create temp table bp as select portal_financeiro_caso_acerto(diego, rm, cs.pb) a from ids, cs;
select ok((select count(*) > 0 from bp, jsonb_array_elements(a -> 'pendencias') p where p ->> 'tipo' = 'PARCELA'),
  'EX-01: encerrado o outro caso, as mensalidades que faltam passam a ele');
select is((select count(*) from bp, jsonb_array_elements(a -> 'pendencias') p where (p ->> 'exito')::boolean), 0::bigint,
  'decisão (a), a confirmar: o êxito do primeiro caso não segura este');

-- Decisão 10 (sugestão 5): quem tem a área Contratos sem poder encerrar não entra.
delete from funcao_acoes where funcao = 'EQUIPE' and acao = 'contratos.editar';
select is((select portal_financeiro_caso_acerto(diego, rm, cs.pb) -> 'quemContratos' from ids, cs), '["Marina Ribeiro"]'::jsonb,
  'decisão 10: só quem tem a área Contratos e pode encerrar o contrato');

select * from finish();
rollback;
