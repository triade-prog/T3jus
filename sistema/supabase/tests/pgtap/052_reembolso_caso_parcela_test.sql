-- Reembolso ligado ao caso e mostrado na próxima parcela (F3.23: FI-07, CH-05): o caso na conta
-- adiantada, obrigatório quando o cliente tem caso; a parcela em que volta (a do contrato do caso
-- primeiro); a ficha do contrato com o adiantado; a divisão do alvará só com os reembolsos do
-- próprio caso; área e isolamento (PA-01, PT-01).
begin;
select plan(18);

select ajustar_relogio(('2026-11-21 10:00-03'::timestamptz - now()));

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
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PJ', 'nome', 'Construtora Vale Alto Ltda.', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Rui', 'telefone', '+5511985521034', 'principal', true)))) ->> 'id')::uuid cons,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Joana Pereira', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Joana Pereira', 'telefone', '+5511985521035', 'principal', true)))) ->> 'id')::uuid joana
  from ids;
-- Dois contratos da Construtora: a mensalidade (vence 25/11) e o da ação de cobrança (vence 28/11).
create temp table ct as select
  (portal_contrato_criar(socia, rm, jsonb_build_object('clienteId', cli.cons, 'objeto', 'Assessoria mensal',
     'responsavelId', ids.diego, 'advogados', jsonb_build_array(ids.socia),
     'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'MENSAL', 'valor', 320000, 'primeiro', '2026-11-25', 'meses', 3)))) ->> 'id')::uuid mensal,
  (portal_contrato_criar(socia, rm, jsonb_build_object('clienteId', cli.cons, 'objeto', 'Ação de cobrança',
     'responsavelId', ids.diego, 'advogados', jsonb_build_array(ids.socia),
     'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'PARCELADO', 'total', 720000, 'parcelas', 3, 'primeiro', '2026-11-28')))) ->> 'id')::uuid cobranca
  from ids, cli;
select portal_contrato_assinatura(socia, rm, ct.mensal, 1, '2026-11-21'), portal_contrato_assinatura(socia, rm, ct.cobranca, 1, '2026-11-21') from ids, ct;
select portal_juridico_casos(socia, rm) from ids;
create temp table cs as select
  (portal_juridico_caso_criar(socia, rm, jsonb_build_object('nome', 'Vale Alto x Mercantil', 'area', 'CIVEL',
     'etapaId', (select id from etapas where escritorio_id = ids.rm and ordem = 5), 'responsavelId', ids.socia,
     'clientes', jsonb_build_array(jsonb_build_object('clienteId', cli.cons, 'papel', 'AUTOR', 'contratoId', ct.cobranca)))) ->> 'id')::uuid cobranca,
  (portal_juridico_caso_criar(socia, rm, jsonb_build_object('nome', 'Vale Alto x Banco Sul', 'area', 'CIVEL',
     'etapaId', (select id from etapas where escritorio_id = ids.rm and ordem = 5), 'responsavelId', ids.socia,
     'clientes', jsonb_build_array(jsonb_build_object('clienteId', cli.cons, 'papel', 'REU')))) ->> 'id')::uuid banco
  from ids, cli, ct;

-- Para a janela de lançar conta.
select is((teste.erro($$ select portal_financeiro_adiantar(paula, rm, cli.cons) from ids, cli $$)) -> 'detalhe' ->> 'motivo', 'AREA_NAO_LIBERADA',
  'PA-01: sem o Financeiro, a janela não lê os casos');
select is((teste.erro($$ select portal_financeiro_adiantar(intrusa, outro, cli.cons) from ids, cli $$)) ->> 'codigo', 'TC404',
  'PT-01: cliente de outro escritório não é achado');
select is((select jsonb_path_query_array(portal_financeiro_adiantar(diego, rm, cli.cons) -> 'casos', '$[*].nome') from ids, cli),
  '["Vale Alto x Banco Sul", "Vale Alto x Mercantil"]'::jsonb, 'os casos do cliente');
select is((select jsonb_path_query_first(portal_financeiro_adiantar(diego, rm, cli.cons) -> 'casos', '$[*] ? (@.nome == "Vale Alto x Mercantil")') -> 'proximaParcela' ->> 'vencimento'
             from ids, cli), '2026-11-28', 'com o caso, a próxima parcela é a do contrato do caso');
select is((select portal_financeiro_adiantar(diego, rm, cli.cons) -> 'proximaParcela' ->> 'vencimento' from ids, cli), '2026-11-25',
  'sem caso, a primeira parcela do cliente');

-- Lançar.
select is((teste.erro($$ select portal_financeiro_conta_lancar(diego, rm, jsonb_build_object('descricao', 'Custas da apelação', 'categoria', 'CUSTAS',
  'valor', 124836, 'vencimento', '2026-11-21', 'adiantada', true, 'clienteId', cli.cons, 'reembolsoComo', 'PROXIMA_PARCELA')) from ids, cli $$)) -> 'detalhe' -> 'campos',
  '["casoId"]'::jsonb, 'FI-07: cliente com caso pede o caso');
select is((teste.erro($$ select portal_financeiro_conta_lancar(diego, rm, jsonb_build_object('descricao', 'Custas', 'categoria', 'CUSTAS',
  'valor', 1000, 'vencimento', '2026-11-21', 'adiantada', true, 'clienteId', cli.joana, 'casoId', cs.cobranca, 'reembolsoComo', 'A_PARTE')) from ids, cli, cs $$)) -> 'detalhe' -> 'campos',
  '["casoId"]'::jsonb, 'o caso tem de ser do cliente');
select ok((select portal_financeiro_conta_lancar(diego, rm, jsonb_build_object('descricao', 'Cópias autenticadas', 'categoria', 'CUSTAS',
  'valor', 3000, 'vencimento', '2026-11-21', 'adiantada', true, 'clienteId', cli.joana, 'reembolsoComo', 'PROXIMA_PARCELA')) ->> 'parcela' is null from ids, cli),
  'cliente sem caso lança sem caso; sem parcela, não promete nenhuma');
create temp table cp as select
  portal_financeiro_conta_lancar(diego, rm, jsonb_build_object('descricao', 'Custas da apelação', 'categoria', 'CUSTAS',
    'valor', 124836, 'vencimento', '2026-11-21', 'adiantada', true, 'clienteId', cli.cons, 'casoId', cs.cobranca, 'reembolsoComo', 'PROXIMA_PARCELA')) r,
  portal_financeiro_conta_lancar(diego, rm, jsonb_build_object('descricao', 'Perícia contábil', 'categoria', 'CUSTAS',
    'valor', 90000, 'vencimento', '2026-11-21', 'adiantada', true, 'clienteId', cli.cons, 'casoId', cs.banco, 'reembolsoComo', 'LEVANTAMENTO')) p
  from ids, cli, cs;
select is((select r -> 'parcela' ->> 'vencimento' from cp), '2026-11-28', 'lançada, diz em que parcela volta');
select is((select caso_id = cs.cobranca from contas_pagar, cp, cs where contas_pagar.id = (cp.r ->> 'id')::uuid), true, 'a conta guarda o caso');

-- Na lista do A pagar.
create temp table ad as select jsonb_path_query_first(portal_financeiro_pagar(diego, rm) -> 'adiantados', '$[*] ? (@.descricao == "Custas da apelação")') -> 'adiantada' a from ids;
select is((select a -> 'caso' ->> 'nome' from ad), 'Vale Alto x Mercantil', 'o adiantado mostra o caso');
select is((select a -> 'parcela' -> 'contrato' ->> 'id' from ad), (select cobranca::text from ct), 'e a parcela do contrato do caso');

-- O dia da parcela passa e ela é paga sem o reembolso: ele continua ligado a ela.
select ajustar_relogio(('2026-11-29 10:00-03'::timestamptz - now()));
select portal_financeiro_receber_registrar(diego, rm, (select id from recebimentos_previstos where contrato_id = ct.cobranca and vencimento = '2026-11-28'),
  jsonb_build_object('valor', 240000, 'recebidoEm', '2026-11-28', 'forma', 'CHEQUE_PRE')) from ids, ct;
select is((select jsonb_path_query_first(portal_financeiro_pagar(diego, rm) -> 'adiantados', '$[*] ? (@.descricao == "Custas da apelação")') -> 'adiantada' -> 'parcela' ->> 'vencimento' from ids),
  '2026-12-28', 'paga sem o reembolso, ele continua a reembolsar e passa para a parcela seguinte (0640)');

-- Na ficha de parcelas do contrato.
select is((select jsonb_path_query_array(portal_financeiro_contrato_adiantados(diego, rm, ct.cobranca), '$[*].descricao') from ids, ct),
  '["Custas da apelação"]'::jsonb, 'o contrato do caso mostra o que foi adiantado nele');
select is((select portal_financeiro_contrato_adiantados(diego, rm, ct.mensal) from ids, ct), '[]'::jsonb,
  'o outro contrato do cliente não mostra o adiantado de um caso que não é dele');

-- Na divisão do alvará, só os reembolsos do próprio caso.
select is((select jsonb_array_length(repasse_proposta(rm, cs.cobranca, cli.cons, 500000) -> 'linhas') from ids, cs, cli), 0,
  'o reembolso de outro caso não entra sozinho na divisão');
select is((select repasse_proposta(rm, cs.banco, cli.cons, 500000) -> 'linhas' -> 0 ->> 'valor' from ids, cs, cli), '90000',
  'o do próprio caso entra');

-- Reembolsado, sai da parcela.
select portal_financeiro_conta_reembolsada(diego, rm, (cp.r ->> 'id')::uuid, jsonb_build_object('reembolsadoEm', '2026-11-29')) from ids, cp;
select ok((select conta_linha(c) -> 'adiantada' -> 'parcela' = 'null'::jsonb from contas_pagar c, cp where c.id = (cp.r ->> 'id')::uuid),
  'reembolsado, deixa de aparecer na parcela');

select * from finish();
rollback;
