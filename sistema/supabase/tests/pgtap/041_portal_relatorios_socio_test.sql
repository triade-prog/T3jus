-- Financeiro do Portal, parte 5: Relatórios do sócio. Só a sócia dona abre; Entrou pelo dia em
-- que o dinheiro entrou; Rendeu = Entrou menos as despesas adiantadas que não voltaram; Falta
-- receber de hoje, com o RPV à parte; terceiros nunca somados; período e comparação; por
-- cliente, área e responsável; exportação no histórico; isolamento
-- (IN-02 a IN-05, IN-07, IN-08, IN-09, IN-12, IN-14, IN-15, FI-06, FI-07, PA-01, PT-01).
begin;
select plan(38);

select ajustar_relogio(('2026-06-01 12:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Paula Nunes') as paula,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, diego, 'Diego Almeida', array['FINANCEIRO', 'JURIDICO']),
       portal_convidar(socia, rm, paula, 'Paula Nunes', array['CONTRATOS']) from ids;

-- Antes do primeiro recebimento, o relatório não inventa número.
select is((select portal_relatorio_resumo(socia, rm) ->> 'algum' from ids), 'false', 'vazio: ainda não há o que comparar');

create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Hélio Batista Corrêa', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Hélio Batista Corrêa', 'telefone', '+5511996027736', 'principal', true)))) ->> 'id')::uuid hel,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PJ', 'nome', 'Farmácia Bom Jesus Ltda', 'origem', 'INDICACAO_CLIENTE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Jorge', 'telefone', '+5511996027738', 'principal', true)))) ->> 'id')::uuid far,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Benedito Souza Lima', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Benedito Souza Lima', 'telefone', '+5511996027737', 'principal', true)))) ->> 'id')::uuid ben
  from ids;

-- Farmácia: assessoria de R$ 1.800,00 por mês, sem data de fim, desde junho. Paga em dia até outubro.
create temp table ct as select
  (portal_contrato_criar(socia, rm, jsonb_build_object('clienteId', cli.far, 'objeto', 'Assessoria mensal',
     'responsavelId', ids.socia, 'advogados', jsonb_build_array(ids.socia),
     'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'MENSAL', 'valor', 180000, 'primeiro', '2026-06-25')))) ->> 'id')::uuid far
  from ids, cli;
select portal_contrato_assinatura(socia, rm, ct.far, 1, '2026-06-01') from ids, ct;
select ajustar_relogio(('2026-08-31 12:00-03'::timestamptz - now()));
select portal_financeiro_receber_registrar(socia, rm, r.id, jsonb_build_object('valor', 180000, 'recebidoEm', r.vencimento, 'forma', 'BOLETO'))
  from ids, ct, recebimentos_previstos r where r.contrato_id = ct.far and r.vencimento <= '2026-08-31';

-- Hélio: 3 parcelas de R$ 1.000,00 a partir de 10/09, responsável Diego, ligado a um caso cível.
select ajustar_relogio(('2026-09-01 12:00-03'::timestamptz - now()));
alter table ct add column hel uuid;
update ct set hel = (portal_contrato_criar(ids.socia, ids.rm, jsonb_build_object('clienteId', cli.hel, 'objeto', 'Ação revisional',
     'responsavelId', ids.diego, 'advogados', jsonb_build_array(ids.diego),
     'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'PARCELADO', 'total', 300000, 'parcelas', 3, 'primeiro', '2026-09-10')))) ->> 'id')::uuid
  from ids, cli;
select portal_contrato_assinatura(socia, rm, ct.hel, 1, '2026-09-01') from ids, ct;
select portal_juridico_etapas(socia, rm) from ids;
create temp table cs as select
  (portal_juridico_caso_criar(socia, rm, jsonb_build_object('nome', 'Corrêa x Banco Sul', 'area', 'CIVEL',
     'etapaId', (select id from etapas where escritorio_id = ids.rm and ordem = 3), 'responsavelId', ids.diego,
     'clientes', jsonb_build_array(jsonb_build_object('clienteId', cli.hel, 'papel', 'AUTOR', 'contratoId', ct.hel)))) ->> 'id')::uuid hel,
  (portal_juridico_caso_criar(socia, rm, jsonb_build_object('nome', 'Lima x INSS', 'area', 'PREVIDENCIARIO',
     'etapaId', (select id from etapas where escritorio_id = ids.rm and ordem = 7), 'responsavelId', ids.socia,
     'clientes', jsonb_build_array(jsonb_build_object('clienteId', cli.ben, 'papel', 'AUTOR')))) ->> 'id')::uuid lima
  from ids, cli, ct;

select ajustar_relogio(('2026-10-26 12:00-03'::timestamptz - now()));
select portal_financeiro_receber_registrar(socia, rm, r.id, jsonb_build_object('valor', 100000, 'recebidoEm', '2026-09-12', 'forma', 'PIX'))
  from ids, ct, recebimentos_previstos r where r.contrato_id = ct.hel and r.vencimento = '2026-09-10';
select portal_financeiro_receber_registrar(socia, rm, r.id, jsonb_build_object('valor', 180000, 'recebidoEm', r.vencimento, 'forma', 'BOLETO'))
  from ids, ct, recebimentos_previstos r where r.contrato_id = ct.far and r.vencimento between '2026-09-01' and '2026-10-31';

-- 18/11: custas adiantadas para Hélio (R$ 485,00), que não voltaram; um alvará de Benedito com os
-- honorários transferidos (R$ 300,00) e um RPV com os honorários ainda a transferir (R$ 150,00).
select ajustar_relogio(('2026-11-18 12:00-03'::timestamptz - now()));
create temp table adi as select
  (portal_financeiro_conta_lancar(socia, rm, jsonb_build_object('descricao', 'Custas iniciais', 'categoria', 'CUSTAS',
     'valor', 48500, 'vencimento', '2026-11-03', 'adiantada', true, 'clienteId', cli.hel, 'casoId', cs.hel, 'reembolsoComo', 'PROXIMA_PARCELA')) ->> 'id')::uuid id
  from ids, cli, cs;
select portal_financeiro_conta_paga(socia, rm, adi.id, jsonb_build_object('pagaEm', '2026-11-03', 'valor', 48500)) from ids, adi;
create temp table lv as select
  (portal_financeiro_levantamento_registrar(socia, rm, jsonb_build_object('tipo', 'ALVARA', 'casoId', cs.lima, 'clienteId', cli.ben,
    'valor', 100000, 'entrouEm', '2026-11-16', 'divisao', jsonb_build_array(
      jsonb_build_object('para', 'CLIENTE', 'valor', 70000),
      jsonb_build_object('para', 'HONORARIOS', 'nome', 'Honorários de êxito', 'regra', '30%', 'valor', 30000)))) ->> 'id')::uuid alv,
  (portal_financeiro_levantamento_registrar(socia, rm, jsonb_build_object('tipo', 'RPV', 'casoId', cs.lima, 'clienteId', cli.ben,
    'valor', 50000, 'entrouEm', '2026-11-17', 'divisao', jsonb_build_array(
      jsonb_build_object('para', 'CLIENTE', 'valor', 35000),
      jsonb_build_object('para', 'HONORARIOS', 'nome', 'Honorários de êxito', 'regra', '30%', 'valor', 15000)))) ->> 'id')::uuid rpv
  from ids, cs, cli;
select portal_financeiro_destinacao_feita(socia, rm, d.id, jsonb_build_object('feitoEm', '2026-11-17'))
  from ids, lv, destinacoes d where d.levantamento_id = lv.alv and d.para = 'HONORARIOS';

-- Quem vê (decisão 1) e isolamento.
select is((teste.erro($$ select portal_relatorio_resumo(diego, rm) from ids $$)) -> 'detalhe' ->> 'motivo', 'SO_SOCIO_DONO',
  'decisão 1: com o Financeiro, mas sem ser a sócia dona, o relatório é recusado');
select is((teste.erro($$ select portal_relatorio_clientes(diego, rm) from ids $$)) -> 'detalhe' ->> 'motivo', 'SO_SOCIO_DONO',
  'decisão 1: a lista por cliente também');
select is((teste.erro($$ select portal_relatorio_resumo(paula, rm) from ids $$)) -> 'detalhe' ->> 'motivo', 'AREA_NAO_LIBERADA',
  'PA-01: sem a área Financeiro, recusado');
select is((teste.erro($$ select portal_relatorio_cliente(intrusa, outro, cli.hel) from ids, cli $$)) ->> 'codigo', 'TC404',
  'PT-01: o cliente de outro escritório não existe para quem é de fora');
select is((select portal_relatorio_resumo(intrusa, outro) -> 'entrou' ->> 'valor' from ids), '0', 'PT-01: o outro escritório não vê o dinheiro deste');

-- Período (decisão 4) e comparação.
create temp table rs as select portal_relatorio_resumo(socia, rm) r from ids;
select is((select (r -> 'periodo') - 'hoje' from rs),
  '{"de": "2026-09-01", "ate": "2026-11-18", "cde": "2026-06-01", "cate": "2026-08-31", "aberto": true, "comparar": "anterior"}'::jsonb,
  'decisão 4: abre nos últimos 3 meses, contra os 3 anteriores, com novembro aberto');
select is((select portal_relatorio_resumo(socia, rm, '2026-07-01', '2026-09-30', 'anterior') -> 'periodo' ->> 'cde' from ids), '2026-04-01',
  'meses inteiros comparam com os meses anteriores');
select is((select portal_relatorio_resumo(socia, rm, '2026-09-05', '2026-09-14', null) -> 'periodo' from ids) - 'hoje' - 'aberto',
  '{"de": "2026-09-05", "ate": "2026-09-14", "cde": "2026-08-26", "cate": "2026-09-04", "comparar": "anterior"}'::jsonb,
  'dias soltos comparam com o mesmo número de dias antes');
select is((select portal_relatorio_resumo(socia, rm, null, null, 'ano_passado') -> 'periodo' ->> 'cde' from ids), '2025-09-01',
  'o mesmo período do ano passado');
select is((select portal_relatorio_resumo(socia, rm, null, null, 'nao') -> 'entrou' ->> 'anterior' from ids), null, 'sem comparar, não há o anterior');
select is((teste.erro($$ select portal_relatorio_resumo(socia, rm, '2026-09-31', '2026-10-15', null) from ids $$)) -> 'detalhe',
  '{"motivo": "PERIODO_INVALIDO", "campos": ["de"]}'::jsonb, 'dia que não existe');
select is((teste.erro($$ select portal_relatorio_resumo(socia, rm, '2026-09-01', '2026-08-15', null) from ids $$)) -> 'detalhe',
  '{"motivo": "PERIODO_INVALIDO", "campos": ["ate"]}'::jsonb, 'data final antes da inicial');
select is((teste.erro($$ select portal_relatorio_resumo(socia, rm, '2026-11-01', '2026-11-30', null) from ids $$)) -> 'detalhe' ->> 'motivo',
  'PERIODO_INVALIDO', 'a data final não passa de hoje');
select is((teste.erro($$ select portal_relatorio_resumo(socia, rm, '2024-01-01', '2026-11-18', null) from ids $$)) -> 'detalhe' ->> 'motivo',
  'PERIODO_LONGO', 'até 2 anos por vez');

-- Os três números.
select is((select r -> 'entrou' from rs), '{"n": 4, "valor": 490000, "anterior": 540000, "previstoMes": 180000}'::jsonb,
  'IN-03, decisão 3: entrou pelo dia em que o dinheiro entrou (parcelas e honorários transferidos), contra jun–ago, e o previsto até o fim do mês');
select is((select (r -> 'falta') - 'aparte' - 'faixas' from rs),
  '{"valor": 380000, "vencido": 200000, "vencidas": 2, "anterior": 0, "vencidoAnterior": 0,
    "aVencerMes": {"n": 1, "valor": 180000}, "aVencerDepois": {"n": 0, "valor": 0}}'::jsonb,
  'IN-04, IN-05: falta receber de hoje; a mensalidade sem data de fim conta só até este mês');
select is((select r -> 'falta' -> 'faixas' from rs),
  '[{"n": 1, "valor": 100000}, {"n": 1, "valor": 100000}, {"n": 0, "valor": 0}, {"n": 0, "valor": 0}]'::jsonb, 'IN-07: o vencido por idade');
select is((select (r -> 'falta' -> 'aparte' -> 'lista' -> 0) - 'id' from rs),
  '{"caso": "Lima x INSS", "tipo": "RPV", "prazo": "2026-11-23", "valor": 15000, "cliente": "Benedito Souza Lima"}'::jsonb,
  'IN-05: a parte do escritório no RPV fica à parte, com a data (20/11 é feriado nacional)');
select is((select (r -> 'rendeu') - 'despesas' from rs), '{"valor": 441500, "anterior": 540000, "adiantado": 48500}'::jsonb,
  'IN-15, decisão 2, FI-07: rendeu é o que entrou menos as custas adiantadas que não voltaram');
select is((select r ->> 'contratado' from rs), '660000', 'IN-02: o contratado que venceu no período');
select is((select r -> 'meses' from rs),
  '[{"mes": "2026-09-01", "valor": 280000, "parcial": false, "anterior": false}, {"mes": "2026-10-01", "valor": 180000, "parcial": false, "anterior": false},
    {"mes": "2026-11-01", "valor": 30000, "parcial": true, "anterior": false}, {"mes": "2026-06-01", "valor": 180000, "parcial": false, "anterior": true},
    {"mes": "2026-07-01", "valor": 180000, "parcial": false, "anterior": true}, {"mes": "2026-08-01", "valor": 180000, "parcial": false, "anterior": true}]'::jsonb,
  'IN-09: mês a mês, este período e o anterior');
select is((select r -> 'clientes' -> 'top' -> 0 ->> 'nome' from rs), 'Farmácia Bom Jesus Ltda', 'os maiores clientes, do que mais trouxe');
select is((select jsonb_agg(a ->> 'area') from rs, jsonb_array_elements(r -> 'areas') a), '["SEM_CASO", "CIVEL", "PREVIDENCIARIO"]'::jsonb,
  'IN-12: contrato sem caso é "Sem caso ligado"; a área é a do caso');
select is((select r -> 'terceiros' from rs),
  '{"n": 2, "entrou": 150000, "outros": 0, "naConta": 120000, "porTipo": {"RPV": 1, "ALVARA": 1}, "reembolso": 0, "repassado": 0,
    "honorarios": 30000, "clientesRepassados": []}'::jsonb,
  'IN-14, FI-06: o que passou de terceiros fica à parte e não soma');

-- Por cliente.
create temp table rc as select portal_relatorio_clientes(socia, rm) -> 'clientes' c from ids;
select is((select (c -> 1) - 'id' from rc),
  '{"nome": "Hélio Batista Corrêa", "areas": ["CIVEL"], "falta": 200000, "aparte": [], "entrou": 100000, "rendeu": 51500, "inativo": false,
    "vencido": 200000, "adiantado": 48500, "contratos": 1, "contratado": 300000, "responsaveis": ["Diego Almeida"]}'::jsonb,
  'IN-15: cada cliente com contratado, entrou, falta, adiantado e rendeu');
select is((select sum((x ->> 'entrou')::bigint) from rc, jsonb_array_elements(c) x), 490000::numeric, 'a soma por cliente fecha com o Entrou');
select is((select x -> 'aparte' from rc, jsonb_array_elements(c) x where x ->> 'nome' = 'Benedito Souza Lima'),
  '[{"tipo": "RPV", "valor": 15000}]'::jsonb, 'o RPV aparece à parte no cliente');

-- Um cliente.
create temp table um as select portal_relatorio_cliente(socia, rm, cli.hel) c from ids, cli;
select is((select c -> 'numeros' from um),
  '{"falta": 200000, "entrou": 100000, "rendeu": 51500, "vencido": 200000, "adiantado": 48500, "contratado": 300000, "entrouAnterior": 0}'::jsonb,
  'o relatório de um cliente traz os quatro números e a comparação');
select is((select c -> 'atraso' ->> 'dias' from um), '39', 'o atraso mais antigo, em dias');
select is((select jsonb_agg(e ->> 'dia') from um, jsonb_array_elements(c -> 'entradas') e), '["2026-09-12"]'::jsonb, 'o que entrou, pelo dia');
select is((select c -> 'contratos' -> 0 -> 'caso' ->> 'nome' from um), 'Corrêa x Banco Sul', 'contratos com o caso e a área');
select is((select c -> 'adiantadas' -> 0 ->> 'valor' from um), '48500', 'o que o escritório adiantou');

-- Por área e por responsável.
create temp table ra as select portal_relatorio_areas(socia, rm) -> 'areas' a from ids;
select is((select x - 'aparte' from ra, jsonb_array_elements(a) x where x ->> 'area' = 'CIVEL'),
  '{"area": "CIVEL", "casos": 1, "falta": 200000, "entrou": 100000, "rendeu": 51500, "vencido": 200000, "anterior": 0, "adiantado": 48500,
    "encerrados": 0, "contratosSemCaso": null}'::jsonb, 'IN-12: a área com casos, entrou contra o anterior, falta e rendeu');
select is((select x ->> 'contratosSemCaso' from ra, jsonb_array_elements(a) x where x ->> 'area' = 'SEM_CASO'), '1', 'sem caso: conta os contratos');
create temp table rr as select portal_relatorio_responsaveis(socia, rm) -> 'responsaveis' r from ids;
select is((select jsonb_agg(jsonb_build_array(x -> 'pessoa' ->> 'nome', x -> 'entrou', x -> 'casos', x -> 'contratosSemCaso', x -> 'dono')) from rr, jsonb_array_elements(r) x),
  '[["Marina Ribeiro", 390000, 1, 1, true], ["Diego Almeida", 100000, 1, 0, false]]'::jsonb,
  'IN-08, IN-12: por responsável do contrato, com a carga de casos');

-- Exportar (no histórico).
select is((select portal_relatorio_exportar(socia, rm, '{"formato": "XLSX", "visao": "clientes"}'::jsonb) -> 'recebimentos' -> 0 ->> 'dia' from ids),
  '2026-09-12', 'a exportação traz os recebimentos, um por linha');
select is((select h.dados ->> 'visao' from historico h, ids where h.escritorio_id = ids.rm and h.acao = 'financeiro.relatorio_exportado'), 'clientes',
  'a exportação fica no histórico do escritório');

select * from finish();
rollback;
