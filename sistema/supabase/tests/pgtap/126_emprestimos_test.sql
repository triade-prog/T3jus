-- Empréstimos no Financeiro (F3.51; FI-20): o empréstimo fica à parte, como os valores de terceiros.
-- Entra no saldo do Caixa sem contar como receita; as parcelas nascem em A pagar e saem do caixa com a
-- categoria Empréstimos; o empréstimo anterior ao T3jus não soma no saldo, e com saldo de abertura
-- quem decide é a abertura; a coluna Empréstimos do Caixa, mês a mês; nada se apaga (encerrar e
-- lançado errado, com motivo); o arquivo do contador com a aba à parte; o Resumo, os relatórios e o
-- Início não mudam; área e isolamento.
begin;
select plan(128);

-- O escritório foi cadastrado em 01/09/2026 (Brasília).
select ajustar_relogio(('2026-09-01 12:00-03'::timestamptz - now()));
create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Bianca Torres') as bianca,
  teste.pessoa('Larissa Moura') as larissa,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, bianca, 'Bianca Torres', array['FINANCEIRO']),
       portal_convidar(socia, rm, larissa, 'Larissa Moura', array['JURIDICO']) from ids;

-- Hoje é 18/11/2026. O aluguel de outubro (R$ 1.500,00) foi pago em 05/10.
select ajustar_relogio(('2026-11-18 10:00-03'::timestamptz - now()));
create temp table al as select
  (portal_financeiro_conta_lancar(bianca, rm, jsonb_build_object('descricao', 'Aluguel da sala', 'categoria', 'ALUGUEL',
     'valor', 150000, 'vencimento', '2026-10-05')) ->> 'id')::uuid id
  from ids;
select portal_financeiro_conta_paga(bianca, rm, al.id, jsonb_build_object('pagaEm', '2026-10-05', 'valor', 150000)) from ids, al;

-- Regressão: o Resumo, os relatórios e o Início antes de qualquer empréstimo.
create temp table antes as select
  portal_financeiro_resumo(bianca, rm) resumo,
  portal_relatorio_resumo(socia, rm) relatorio,
  portal_inicio_financeiro(bianca, rm) inicio,
  saidas_previstas(rm, '2026-11-01', true) previstas_nov
  from ids;

-- ---------------------------------------------------------------------------------------
-- Registrar: os erros de campo, com os nomes da tela.
select is((teste.erro($$ select portal_financeiro_emprestimo_registrar(bianca, rm, '{}'::jsonb) from ids $$)) -> 'detalhe' -> 'campos',
  '["credorTipo", "credorNome", "valor", "recebidoEm", "devolucao"]'::jsonb, 'FI-20: sem nada, os campos que faltam');
select is((teste.erro($$ select portal_financeiro_emprestimo_registrar(bianca, rm, jsonb_build_object(
    'credorTipo', 'BANCO', 'credorNome', 'Sicredi', 'valor', 1250000, 'recebidoEm', '2026-11-19', 'devolucao', 'PARCELAS',
    'parcelasTotal', 14, 'parcelaValor', 125000, 'parcelasAntes', 14, 'proximoVencimento', '2026-12-10')) from ids $$)) -> 'detalhe' -> 'campos',
  '["recebidoEm", "parcelasAntes"]'::jsonb, 'FI-20: o dinheiro não entra no futuro e já pagou antes fica abaixo do total');
select is((teste.erro($$ select portal_financeiro_emprestimo_registrar(bianca, rm, jsonb_build_object(
    'credorTipo', 'BANCO', 'credorNome', 'Sicredi', 'valor', 1250000, 'recebidoEm', '2026-11-10', 'devolucao', 'PARCELAS',
    'parcelasTotal', 14, 'parcelaValor', 125000, 'proximoVencimento', '2026-10-10')) from ids $$)) -> 'detalhe' -> 'campos',
  '["proximoVencimento"]'::jsonb, 'FI-20 (C6): a próxima parcela não vence antes do dia em que o dinheiro entrou');
select is((teste.erro($$ select portal_financeiro_emprestimo_registrar(bianca, rm, jsonb_build_object(
    'credorTipo', 'BANCO', 'credorNome', 'Sicredi', 'valor', 1250000, 'recebidoEm', '2026-11-10', 'devolucao', 'PARCELAS',
    'parcelasTotal', 120, 'parcelaValor', 125000, 'proximoVencimento', '2027-01-10')) from ids $$)) -> 'detalhe' -> 'campos',
  '["proximoVencimento"]'::jsonb, 'FI-20 (C6): a última parcela não passa de hoje + 3650 dias');
select is((teste.erro($$ select portal_financeiro_emprestimo_registrar(bianca, rm, jsonb_build_object(
    'credorTipo', 'BANCO', 'credorNome', 'Sicredi', 'valor', 1250000, 'recebidoEm', '2026-11-10', 'devolucao', 'PARCELAS',
    'parcelasTotal', 3, 'parcelaValor', 100000, 'proximoVencimento', '2026-11-20',
    'parcelas', jsonb_build_array(jsonb_build_object('n', 1, 'valor', 100000), jsonb_build_object('n', 1, 'valor', 100000),
                                  jsonb_build_object('n', 3, 'valor', 100000)))) from ids $$)) -> 'detalhe' -> 'campos',
  '["parcelas"]'::jsonb, 'FI-20 (S2): os valores por parcela precisam dos números certos, cada um uma vez');
select is((select count(*)::integer from emprestimos), 0, 'com erro, nada é gravado');

-- Sicoob: R$ 30.000,00 em 05/10, 24 parcelas de R$ 1.450,00 a partir de 20/10.
create temp table l1 as select portal_financeiro_emprestimo_registrar(bianca, rm, jsonb_build_object(
    'credorTipo', 'BANCO', 'credorNome', 'Sicoob', 'finalidade', 'Capital de giro', 'valor', 3000000, 'valorContrato', 3087000,
    'recebidoEm', '2026-10-05', 'forma', 'TRANSFERENCIA', 'devolucao', 'PARCELAS',
    'parcelasTotal', 24, 'parcelaValor', 145000, 'parcelasAntes', 0, 'proximoVencimento', '2026-10-20')) r
  from ids;
create temp table l1i as select (r ->> 'id')::uuid id from l1;
select is((select (r ->> 'parcelasCriadas')::integer from l1), 24, 'FI-20: em parcelas, nascem todas em A pagar');
select is((select array_agg(emprestimo_parcela order by emprestimo_parcela) from contas_pagar c, l1i where c.emprestimo_id = l1i.id),
  (select array_agg(g) from generate_series(1, 24) g), 'FI-20: numeradas de 1 a 24');
select is((select array[min(vencimento), max(vencimento)] from contas_pagar c, l1i where c.emprestimo_id = l1i.id),
  array['2026-10-20', '2028-09-20']::date[], 'FI-20: a primeira vence em 20/10/2026 e a última em 20/09/2028');
select is((select descricao || ' · ' || fornecedor || ' · ' || categoria from contas_pagar c, l1i where c.emprestimo_id = l1i.id and c.emprestimo_parcela = 3),
  'Empréstimo Sicoob · parcela 3/24 · Sicoob · EMPRESTIMOS', 'FI-20: a descrição sai pronta, com o credor como fornecedor');
select is((select r ->> 'noCaixa' from l1), 'true', 'FI-20: entrou depois do cadastro do escritório: entra no caixa');
select is((select (r ->> 'iofTarifas')::bigint from l1), 87000::bigint, 'FI-20 (S3): IOF e tarifas, do valor do contrato');
select is((select (r -> 'situacao' ->> 'custo')::bigint from l1), 480000::bigint, 'FI-20 (C3): o custo é o total das parcelas menos o que entrou');
select ok((select h.dados ->> 'credorTipo' = 'BANCO' and not historico_tem_dado_proibido(h.dados) and position('Sicoob' in h.dados::text) = 0
             from historico h, l1i where h.acao = 'financeiro.emprestimo_registrado' and h.entidade_id = l1i.id::text),
  'FI-20 (S10): o registro vai ao histórico sem o nome do credor');

-- A parcela de outubro foi paga em 10/11.
select portal_financeiro_conta_paga(bianca, rm, c.id, jsonb_build_object('pagaEm', '2026-11-10', 'valor', 145000))
  from ids, l1i, contas_pagar c where c.emprestimo_id = l1i.id and c.emprestimo_parcela = 1;

-- Marina, sócia: R$ 8.000,00 em 12/09, devolve quando der.
create temp table l2 as select portal_financeiro_emprestimo_registrar(bianca, rm, jsonb_build_object(
    'credorTipo', 'SOCIO', 'credorNome', 'Marina Ribeiro', 'finalidade', 'Adiantar o aluguel', 'valor', 800000,
    'recebidoEm', '2026-09-12', 'forma', 'PIX', 'devolucao', 'LIVRE', 'parcelasTotal', 10)) r
  from ids;
create temp table l2i as select (r ->> 'id')::uuid id from l2;
select is((select array[r ->> 'parcelasCriadas', r ->> 'parcelasTotal', r -> 'situacao' ->> 'faltaDevolver'] from l2),
  array['0', null, '800000'], 'FI-20: sem parcelas fixas, nenhuma nasce e falta devolver tudo');
select is((teste.erro($$ select portal_financeiro_emprestimo_devolucao(bianca, rm, l2i.id, '{"valor": 250000, "pagaEm": "2026-09-11"}'::jsonb) from ids, l2i $$))
  -> 'detalhe' -> 'campos', '["pagaEm"]'::jsonb, 'FI-20 (S7): a devolução não é antes do dia em que o dinheiro entrou');
select is((teste.erro($$ select portal_financeiro_emprestimo_devolucao(bianca, rm, l2i.id, '{"valor": 250000, "pagaEm": "2026-11-19"}'::jsonb) from ids, l2i $$))
  -> 'detalhe' -> 'campos', '["pagaEm"]'::jsonb, 'FI-20 (S7): nem no futuro');
create temp table d1 as select portal_financeiro_emprestimo_devolucao(bianca, rm, l2i.id,
  '{"valor": 250000, "pagaEm": "2026-11-10", "forma": "PIX"}'::jsonb) r from ids, l2i;
select is((select array[c.categoria, c.vencimento::text, c.paga_em::text, c.valor_pago::text] from contas_pagar c, d1 where c.id = (d1.r ->> 'id')::uuid),
  array['EMPRESTIMOS', '2026-11-10', '2026-11-10', '250000'], 'FI-20 (S7): a devolução nasce já paga, com vencimento no dia em que saiu');
select is((select (r -> 'emprestimo' -> 'situacao' ->> 'faltaDevolver')::bigint from d1), 550000::bigint, 'FI-20: falta devolver R$ 5.500,00');
select is((teste.erro($$ select portal_financeiro_emprestimo_devolucao(bianca, rm, l1i.id, '{"valor": 1000, "pagaEm": "2026-11-18"}'::jsonb) from ids, l1i $$))
  -> 'detalhe' ->> 'motivo', 'EMPRESTIMO_EM_PARCELAS', 'FI-20: em parcelas, paga-se a parcela, não devolução');

-- Banco do Brasil (Pronampe), de 10/04/2025, anterior ao T3jus: 40 parcelas de R$ 2.090,00, 16 pagas
-- antes; a 17ª vence em 10/09/2026. As de setembro e outubro foram pagas no dia.
create temp table l3 as select portal_financeiro_emprestimo_registrar(bianca, rm, jsonb_build_object(
    'credorTipo', 'BANCO', 'credorNome', 'Banco do Brasil', 'finalidade', 'Pronampe', 'valor', 8000000,
    'recebidoEm', '2025-04-10', 'forma', 'TRANSFERENCIA', 'devolucao', 'PARCELAS',
    'parcelasTotal', 40, 'parcelaValor', 209000, 'parcelasAntes', 16, 'proximoVencimento', '2026-09-10')) r
  from ids;
create temp table l3i as select (r ->> 'id')::uuid id from l3;
select is((select array[r ->> 'noCaixa', r ->> 'anteriorAoT3jus', r ->> 'foraDoCaixa', r ->> 'parcelasCriadas'] from l3),
  array['false', 'true', 'ANTES_DO_T3JUS', '24'], 'FI-20 (B1): entrou antes do T3jus: fora do caixa, e nascem só as 24 que faltam');
select is((select array[min(emprestimo_parcela), max(emprestimo_parcela)] from contas_pagar c, l3i where c.emprestimo_id = l3i.id),
  array[17, 40], 'FI-20: a numeração começa depois das já pagas');
select portal_financeiro_conta_paga(bianca, rm, c.id, jsonb_build_object('pagaEm', c.vencimento, 'valor', 209000))
  from ids, l3i, contas_pagar c where c.emprestimo_id = l3i.id and c.emprestimo_parcela in (17, 18);
select is((select array[(s ->> 'pagoAntes')::bigint, (s ->> 'pagoNoT3jus')::bigint, (s ->> 'faltaPagar')::bigint, (s ->> 'custo')::bigint,
                        (s ->> 'parcelasPagas')::bigint, (s ->> 'parcelasAbertas')::bigint]
             from ids, l3i, lateral (select portal_financeiro_emprestimo(bianca, rm, l3i.id) -> 'situacao' s) x),
  array[3344000, 418000, 4598000, 360000, 18, 22]::bigint[], 'FI-20 (C3): o custo conta as pagas antes do T3jus; o já pago separa antes e no T3jus');
select is((select portal_financeiro_emprestimo(bianca, rm, l3i.id) -> 'situacao' -> 'proxima' ->> 'n' from ids, l3i), '19',
  'FI-20: a próxima a pagar é a 19ª');
select is((select portal_financeiro_emprestimo(bianca, rm, l3i.id) -> 'situacao' ->> 'terminaEm' from ids, l3i), '2028-08-10',
  'FI-20: termina em 10/08/2028');

-- ---------------------------------------------------------------------------------------
-- A ficha e A pagar.
create temp table fi as select portal_financeiro_emprestimo(bianca, rm, l1i.id) f from ids, l1i;
select is((select jsonb_array_length(f -> 'parcelas') from fi), 24, 'a ficha traz as parcelas');
select is((select array[p ->> 'n', p ->> 'situacao', p ->> 'pagaEm', p ->> 'anexos'] from fi, jsonb_array_elements(f -> 'parcelas') p where p ->> 'n' = '1'),
  array['1', 'PAGA', '2026-11-10', '0'], 'a parcela paga, com o dia e a contagem dos comprovantes');
select is((select array_agg(h ->> 'acao' order by h ->> 'acao') from fi, jsonb_array_elements(f -> 'historico') h),
  array['financeiro.conta_paga', 'financeiro.emprestimo_registrado'], 'e o histórico do empréstimo e das parcelas');
select is((select c -> 'emprestimo' from ids, jsonb_array_elements(portal_financeiro_pagar(bianca, rm, 'MES') -> 'contas') c
            where c ->> 'descricao' = 'Empréstimo Sicoob · parcela 2/24'),
  jsonb_build_object('id', (select id from l1i), 'parcela', 2, 'total', 24, 'credor', 'Sicoob', 'credorTipo', 'BANCO', 'devolucao', false),
  'FI-20 (S1): em A pagar, a parcela traz o selo do empréstimo');
select is((select c -> 'valor' from ids, jsonb_array_elements(portal_financeiro_pagar(bianca, rm, 'MES') -> 'categorias') c where c ->> 'categoria' = 'EMPRESTIMOS'),
  '604000'::jsonb, 'FI-20: o servidor manda a categoria Empréstimos como as outras (a tela a põe à parte)');

-- Lançar conta não aceita a categoria; quem não tem a área recebe a recusa da área antes.
select is((teste.erro($$ select portal_financeiro_conta_lancar(bianca, rm, jsonb_build_object('descricao', 'Parcela', 'categoria', 'EMPRESTIMOS',
    'valor', 1000, 'vencimento', '2026-11-20')) from ids $$)) -> 'detalhe' -> 'campos', '["categoria"]'::jsonb,
  'FI-20: Lançar conta recusa a categoria Empréstimos');
select is((teste.erro($$ select portal_financeiro_conta_lancar(bianca, rm, jsonb_build_object('descricao', 'Parcela', 'categoria', 'EMPRESTIMOS',
    'valor', 1000, 'vencimento', '2026-11-20', 'repete', true)) from ids $$)) -> 'detalhe' -> 'campos', '["categoria"]'::jsonb,
  'FI-20: também com Repete todo mês');
select is((teste.erro($$ select portal_financeiro_conta_lancar(larissa, rm, jsonb_build_object('categoria', 'EMPRESTIMOS')) from ids $$)) -> 'detalhe' ->> 'motivo',
  'AREA_NAO_LIBERADA', 'FI-20 (S9): sem a área Financeiro, a recusa é da área, não do campo');
select throws_ok($$ insert into contas_recorrentes (escritorio_id, descricao, categoria, valor, dia, inicio, autor_id)
    select rm, 'Parcela', 'EMPRESTIMOS', 1000, 5, '2026-12-01', bianca from ids $$, '23514', null, 'FI-20: a conta que repete não é da categoria Empréstimos');

-- Os CHECKs e a chave composta, por insert direto.
select throws_ok($$ insert into contas_pagar (escritorio_id, descricao, categoria, valor, vencimento)
    select rm, 'Parcela solta', 'EMPRESTIMOS', 1000, '2026-12-01' from ids $$, '23514', null, 'FI-20: a categoria Empréstimos sem empréstimo é recusada');
select throws_ok($$ insert into contas_pagar (escritorio_id, descricao, categoria, valor, vencimento, emprestimo_id)
    select rm, 'Aluguel', 'ALUGUEL', 1000, '2026-12-01', l1i.id from ids, l1i $$, '23514', null, 'FI-20: o empréstimo sem a categoria também');
select throws_ok($$ insert into contas_pagar (escritorio_id, descricao, categoria, valor, vencimento, emprestimo_id, emprestimo_parcela)
    select outro, 'Parcela', 'EMPRESTIMOS', 1000, '2026-12-01', l1i.id, 30 from ids, l1i $$, '23503', null, 'PT-01: a parcela não aponta para o empréstimo de outro escritório');

-- ---------------------------------------------------------------------------------------
-- Área e isolamento.
select is((teste.erro($$ select portal_financeiro_emprestimo_registrar(larissa, rm, '{}'::jsonb) from ids $$)) -> 'detalhe' ->> 'motivo', 'AREA_NAO_LIBERADA',
  'FI-20 (C1): sem a área Financeiro, não registra');
select is((teste.erro($$ select portal_financeiro_emprestimo(larissa, rm, l1i.id) from ids, l1i $$)) -> 'detalhe' ->> 'motivo', 'AREA_NAO_LIBERADA', 'nem vê a ficha');
select is((teste.erro($$ select portal_financeiro_emprestimo_devolucao(larissa, rm, l2i.id, '{}'::jsonb) from ids, l2i $$)) -> 'detalhe' ->> 'motivo',
  'AREA_NAO_LIBERADA', 'nem devolve');
select is((teste.erro($$ select portal_financeiro_emprestimo_encerrar(larissa, rm, l1i.id, '{}'::jsonb) from ids, l1i $$)) -> 'detalhe' ->> 'motivo',
  'AREA_NAO_LIBERADA', 'nem encerra');
select is((teste.erro($$ select portal_financeiro_emprestimo_cancelar(larissa, rm, l1i.id, '{}'::jsonb) from ids, l1i $$)) -> 'detalhe' ->> 'motivo',
  'AREA_NAO_LIBERADA', 'nem marca como lançado errado');
select is((teste.erro($$ select portal_financeiro_caixa(larissa, rm) from ids $$)) -> 'detalhe' ->> 'motivo', 'AREA_NAO_LIBERADA', 'nem vê o Caixa');
select is((teste.erro($$ select portal_financeiro_emprestimo(intrusa, outro, l1i.id) from ids, l1i $$)) ->> 'codigo', 'TC404',
  'PT-01: a ficha de outro escritório não existe');
select is((teste.erro($$ select portal_financeiro_emprestimo_devolucao(intrusa, outro, l2i.id, '{"valor": 1, "pagaEm": "2026-11-18"}'::jsonb) from ids, l2i $$)) ->> 'codigo',
  'TC404', 'PT-01: nem a devolução');
select is((teste.erro($$ select portal_financeiro_emprestimo_encerrar(intrusa, outro, l1i.id, '{"motivo": "Quitado antes"}'::jsonb) from ids, l1i $$)) ->> 'codigo',
  'TC404', 'PT-01: nem encerrar');
select is((teste.erro($$ select portal_financeiro_emprestimo_cancelar(intrusa, outro, l1i.id, '{"motivo": "Lançado errado"}'::jsonb) from ids, l1i $$)) ->> 'codigo',
  'TC404', 'PT-01: nem cancelar');
select is((teste.erro($$ select portal_financeiro_conta_paga(intrusa, outro, c.id, '{"valor": 145000, "pagaEm": "2026-11-18"}'::jsonb)
    from ids, l1i, contas_pagar c where c.emprestimo_id = l1i.id and c.emprestimo_parcela = 2 $$)) ->> 'codigo', 'TC404',
  'PT-01: nem marcar paga a parcela de outro escritório');

-- ---------------------------------------------------------------------------------------
-- Caixa (B2). Sem saldo de abertura e sem RPV, a linha de cada mês fecha.
create temp table cx as select portal_financeiro_caixa(bianca, rm) c from ids;
select is((select (c ->> 'saldo')::bigint from cx), 2837000::bigint,
  'FI-20: o saldo soma o que entrou de empréstimo (Sicoob e Marina) e desconta o que foi pago; o anterior ao T3jus fica fora');
select is((select (c ->> 'fechaMes')::bigint from cx), 2483000::bigint, 'FI-20: e o fecha-mês desconta as parcelas que ainda vencem');
select is((select c -> 'meses' -> 0 -> 'emprestimos' from cx),
  '{"entrou": 800000, "parcelasPrevistas": 209000, "parcelasRealizadas": 209000, "liquidoPrevisto": 591000, "liquidoRealizado": 591000}'::jsonb,
  'FI-20 (B2): setembro, mês passado: o empréstimo da sócia e a 17ª do Banco do Brasil');
select is((select array[(m ->> 'saidasPrevistas')::bigint, (m ->> 'saidasRealizadas')::bigint, (m ->> 'saldo')::bigint] from cx, lateral (select c -> 'meses' -> 0 m) x),
  array[0, 0, 591000]::bigint[], 'FI-20 (B2): as saídas do dia a dia ficam sem as parcelas');
select is((select c -> 'meses' -> 1 -> 'emprestimos' from cx),
  '{"entrou": 3000000, "parcelasPrevistas": 354000, "parcelasRealizadas": 209000, "liquidoPrevisto": 2646000, "liquidoRealizado": 2791000}'::jsonb,
  'FI-20 (B2): outubro: a parcela de outubro paga em novembro fica na previsão de outubro');
select is((select c -> 'meses' -> 2 -> 'emprestimos' from cx),
  '{"entrou": 0, "parcelasPrevistas": 749000, "parcelasRealizadas": 395000, "liquidoPrevisto": -749000, "liquidoRealizado": -395000}'::jsonb,
  'FI-20 (B2): novembro, o corrente: o realizado tem a parcela de outubro e a devolução; o previsto, o que ainda vence');
select is((select c -> 'meses' -> 3 -> 'emprestimos' from cx),
  '{"entrou": 0, "parcelasPrevistas": 354000, "parcelasRealizadas": null, "liquidoPrevisto": -354000, "liquidoRealizado": null}'::jsonb,
  'FI-20 (B2): dezembro, futuro: só o previsto');
select is((select (c -> 'meses' -> 3 ->> 'saldo')::bigint from cx), 2129000::bigint, 'FI-20: o saldo previsto de dezembro desconta as parcelas');
select ok((select bool_and((b ->> 'saldo')::bigint = case when i = 0 then 0 else (a ->> 'saldo')::bigint end + (b ->> 'entradasRealizadas')::bigint
                          - (b ->> 'saidasRealizadas')::bigint + (b -> 'emprestimos' ->> 'liquidoRealizado')::bigint)
             from cx, lateral (select i, c -> 'meses' -> i b, c -> 'meses' -> greatest(i - 1, 0) a from generate_series(0, 2) i) x),
  'FI-20 (B2): saldo do mês anterior + entradas − saídas + líquido dos empréstimos = saldo do mês');
select is((select array[(c -> 'emprestimos' ->> 'n')::bigint, (c -> 'emprestimos' ->> 'faltaPagar')::bigint, (c -> 'emprestimos' ->> 'noSaldo')::bigint] from cx),
  array[3, 8483000, 2987000]::bigint[], 'FI-20: a folha à parte: três ativos, o falta pagar soma banco e sócia, e o líquido no saldo');
select is((select array_agg(x ->> 'credor' order by x ->> 'credor') from cx, jsonb_array_elements(c -> 'emprestimos' -> 'lista') x),
  array['Banco do Brasil', 'Marina Ribeiro', 'Sicoob'], 'a lista traz os ativos, inclusive o anterior ao T3jus');
select is((select array[c -> 'emprestimos' ->> 'comecoCaixa', c -> 'emprestimos' ->> 'primeiroLancamento'] from cx),
  array['2026-09-01', '2026-10-05'], 'FI-20 (S-N1): o começo do caixa (o cadastro) e o primeiro lançamento, para o aviso da janela');
select is((select (portal_financeiro_ajustes(socia, rm) ->> 'saldoHoje')::bigint from ids), 2837000::bigint,
  'FI-20 (C9): os Ajustes mostram o mesmo saldo do Caixa');
select is((select portal_financeiro_ajustes(socia, rm) ->> 'primeiroLancamento' from ids), '2026-09-10',
  'FI-20 (C8): o primeiro lançamento conta a parcela paga em setembro');
select is((select c -> 'mesesExportar' from cx), '["2026-11-01", "2026-10-01", "2026-09-01"]'::jsonb,
  'os meses que se podem exportar, do mês corrente para trás');

-- Regressão: nada muda no Resumo, nos relatórios e no Início.
select is((select portal_financeiro_resumo(bianca, rm) from ids), (select resumo from antes), 'FI-20: o Resumo não muda');
select is((select portal_relatorio_resumo(socia, rm) from ids), (select relatorio from antes), 'FI-20: os relatórios do sócio não mudam');
select is((select portal_inicio_financeiro(bianca, rm) from ids), (select inicio from antes), 'FI-20: o Início não muda');

-- ---------------------------------------------------------------------------------------
-- O contador: outubro, exportado em novembro.
select is((select portal_financeiro_exportacao_previa(bianca, rm, '2026-10-01') -> 'despesas' from ids), '{"n": 1, "valor": 150000}'::jsonb,
  'FI-20 (C5): a prévia tira as parcelas das despesas');
select is((select portal_financeiro_exportacao_previa(bianca, rm, '2026-10-01') -> 'emprestimos' from ids),
  '{"recebidos": {"n": 1, "valor": 3000000}, "parcelas": {"n": 1, "valor": 209000, "devolucoes": 0, "semComprovante": 1}}'::jsonb,
  'FI-20 (S6): e diz quantos entraram, quantas parcelas foram pagas e quantas estão sem comprovante');
select is((select portal_financeiro_exportacao_previa(bianca, rm, '2026-11-01') -> 'emprestimos' -> 'parcelas' from ids),
  '{"n": 2, "valor": 395000, "devolucoes": 1, "semComprovante": 2}'::jsonb, 'FI-20: novembro tem uma parcela e uma devolução');
select is((select array_agg(x ->> 'descricao') from ids, jsonb_array_elements(portal_financeiro_exportacao_anexos(bianca, rm, '2026-10-01') -> 'semNota') x),
  array['Aluguel da sala'], 'FI-20: a parcela não tem nota fiscal e fica fora de "sem nota"');
create temp table ex as select portal_financeiro_exportar(bianca, rm, '{"mes": "2026-10-01", "formato": "XLSX"}'::jsonb) e from ids;
select is((select array_agg(x ->> 'categoria') from ex, jsonb_array_elements(e -> 'despesas') x), array['ALUGUEL'], 'FI-20 (C5): as despesas sem as parcelas');
select is((select e -> 'emprestimos' -> 'recebidos' from ex),
  '[{"dia": "2026-10-05", "credorTipo": "BANCO", "credor": "Sicoob", "finalidade": "Capital de giro", "forma": "TRANSFERENCIA", "valor": 3000000, "valorContrato": 3087000}]'::jsonb,
  'FI-20: os empréstimos recebidos no mês');
select is((select e -> 'emprestimos' -> 'parcelas' from ex),
  '[{"pagoEm": "2026-10-10", "vencimento": "2026-10-10", "credorTipo": "BANCO", "credor": "Banco do Brasil", "parcela": 18, "total": 40, "devolucao": false, "forma": null, "valor": 209000, "comprovante": false}]'::jsonb,
  'FI-20 (S6): as parcelas pagas no mês, com o comprovante');
select is((select (e ->> 'saldoInicio')::bigint + coalesce((select sum((x ->> 'valor')::bigint + (x ->> 'multaJuros')::bigint) from jsonb_array_elements(e -> 'recebimentos') x), 0)
                  - (select sum((x ->> 'valor')::bigint) from jsonb_array_elements(e -> 'despesas') x)
                  + (select sum((x ->> 'valor')::bigint) from jsonb_array_elements(e -> 'emprestimos' -> 'recebidos') x)
                  - (select sum((x ->> 'valor')::bigint) from jsonb_array_elements(e -> 'emprestimos' -> 'parcelas') x) from ex)::bigint,
  (select (e ->> 'saldoFim')::bigint from ex), 'FI-20 (C9): saldo do começo + recebimentos − despesas + empréstimos − parcelas = saldo do fim');
select is((select array[(e ->> 'saldoInicio')::bigint, (e ->> 'saldoFim')::bigint] from ex), array[591000, 3232000]::bigint[],
  'FI-20: os saldos do começo e do fim do mês contam os empréstimos');
select is((select array_agg(x ->> 'credor' || ':' || (x ->> 'situacao') || ':' || coalesce(x ->> 'faltaPagar', '-') order by x ->> 'credor')
             from ex, jsonb_array_elements(e -> 'emprestimos' -> 'situacao') x),
  array['Banco do Brasil:ATIVO:4598000', 'Marina Ribeiro:ATIVO:800000', 'Sicoob:ATIVO:3480000'],
  'FI-20 (C4): a situação é a de 31/10, e não a de hoje (a devolução de novembro ainda não conta)');
select is((select array[x ->> 'anteriorAoT3jus', x ->> 'pagoAntes', x ->> 'pagoNoT3jus', x ->> 'custo']
             from ex, jsonb_array_elements(e -> 'emprestimos' -> 'situacao') x where x ->> 'credor' = 'Banco do Brasil'),
  array['true', '3344000', '418000', '360000'], 'FI-20: com o anterior ao T3jus, o já pago antes e no T3jus e o custo');

-- ---------------------------------------------------------------------------------------
-- Nada se apaga: lançado errado e encerrar.
select is((select (portal_financeiro_conta_lancar(bianca, rm, jsonb_build_object('descricao', 'Tarifa do banco', 'categoria', 'TAXAS',
    'valor', 2500, 'vencimento', '2026-11-30')) ->> 'id') is not null from ids), true, 'as outras categorias seguem como antes');
select is((teste.erro($$ update emprestimos set valor = 1 where id = (select id from l1i) $$)) ->> 'codigo', 'TC023', 'FI-20: o empréstimo não muda');
select is((teste.erro($$ delete from emprestimos where id = (select id from l1i) $$)) ->> 'codigo', 'TC023', 'FI-20: nem se apaga');

-- Sicredi: 3 parcelas, a primeira mais cara (S2), registrado e lançado errado.
create temp table pagar_antes as select (portal_financeiro_pagar(bianca, rm, 'SEMANA') -> 'totais') t from ids;
create temp table l4 as select portal_financeiro_emprestimo_registrar(bianca, rm, jsonb_build_object(
    'credorTipo', 'BANCO', 'credorNome', 'Sicredi', 'valor', 280000, 'recebidoEm', '2026-11-10', 'devolucao', 'PARCELAS',
    'parcelasTotal', 3, 'parcelaValor', 100000, 'proximoVencimento', '2026-11-20',
    'parcelas', jsonb_build_array(jsonb_build_object('n', 1, 'valor', 120000), jsonb_build_object('n', 2, 'valor', 100000),
                                  jsonb_build_object('n', 3, 'valor', 100000)))) r
  from ids;
create temp table l4i as select (r ->> 'id')::uuid id from l4;
select is((select array_agg(valor order by emprestimo_parcela) from contas_pagar c, l4i where c.emprestimo_id = l4i.id),
  array[120000, 100000, 100000]::bigint[], 'FI-20 (S2): o valor de cada parcela, como veio da prévia');
select is((select (portal_financeiro_caixa(bianca, rm) ->> 'saldo')::bigint from ids), 3117000::bigint, 'o Sicredi entra no saldo');
select is((teste.erro($$ select portal_financeiro_emprestimo_encerrar(bianca, rm, l4i.id, '{"motivo": "Quitado antes"}'::jsonb) from ids, l4i $$))
  -> 'detalhe' ->> 'motivo', 'SEM_PAGAMENTO', 'FI-20 (C2): sem nada pago, não se encerra: é lançado errado');
select is((teste.erro($$ select portal_financeiro_emprestimo_cancelar(bianca, rm, l4i.id, '{"motivo": "erro"}'::jsonb) from ids, l4i $$))
  -> 'detalhe' -> 'campos', '["motivo"]'::jsonb, 'FI-20 (C2): lançado errado pede motivo de 5 a 300 caracteres');
select is((select portal_financeiro_emprestimo_cancelar(bianca, rm, l4i.id, '{"motivo": "Valor digitado errado"}'::jsonb) -> 'situacao' ->> 'situacao'
             from ids, l4i), 'CANCELADO', 'FI-20 (C2): lançado errado');
select is((select count(*)::integer from contas_pagar c, l4i where c.emprestimo_id = l4i.id and c.cancelada_em is not null), 3,
  'as parcelas ficam canceladas em A pagar, sem se apagar');
select is((select (portal_financeiro_pagar(bianca, rm, 'SEMANA') -> 'totais') from ids), (select t from pagar_antes),
  'FI-20: o cancelado sai dos totais de A pagar (semana, vencidas)');
select is(saidas_previstas((select rm from ids), '2026-11-01', true), (select previstas_nov + 2500 from antes) + 354000,
  'FI-20: e das saídas previstas do mês');
select is((select (portal_financeiro_caixa(bianca, rm) ->> 'saldo')::bigint from ids), 2837000::bigint, 'FI-20: o cancelado sai do saldo');
select ok((select not exists (select 1 from jsonb_array_elements(portal_financeiro_caixa(bianca, rm) -> 'emprestimos' -> 'lista') x where x ->> 'credor' = 'Sicredi')
             from ids), 'e da folha do Caixa');
select is((select r ->> 'noCaixa' from ids, l4i, lateral (select portal_financeiro_emprestimo(bianca, rm, l4i.id) r) x), 'false', 'e da conta do caixa');
select is((teste.erro($$ select portal_financeiro_emprestimo_cancelar(bianca, rm, l4i.id, '{"motivo": "De novo, por engano"}'::jsonb) from ids, l4i $$))
  -> 'detalhe' ->> 'motivo', 'JA_CANCELADO', 'não se cancela duas vezes');
select is((teste.erro($$ update emprestimos set encerrado_em = now(), encerrado_por = (select bianca from ids), encerrado_motivo = 'Depois do cancelamento'
    where id = (select id from l4i) $$)) ->> 'codigo', 'TC023', 'FI-20: o cancelado não muda mais');
select is((teste.erro($$ select portal_financeiro_emprestimo_cancelar(bianca, rm, l1i.id, '{"motivo": "Valor digitado errado"}'::jsonb) from ids, l1i $$))
  -> 'detalhe' ->> 'motivo', 'EMPRESTIMO_COM_PAGAMENTO', 'FI-20 (C2): com parcela paga, não é lançado errado');

-- Encerrar o Sicoob (quitação antecipada): as 23 em aberto são canceladas; o que entrou e o que foi pago ficam.
select is((teste.erro($$ select portal_financeiro_emprestimo_encerrar(bianca, rm, l1i.id, '{}'::jsonb) from ids, l1i $$)) -> 'detalhe' -> 'campos',
  '["motivo"]'::jsonb, 'FI-20 (C2): encerrar pede motivo');
create temp table enc as select portal_financeiro_emprestimo_encerrar(bianca, rm, l1i.id, '{"motivo": "Quitado com o banco em novembro"}'::jsonb) r from ids, l1i;
select is((select array[r -> 'situacao' ->> 'situacao', r -> 'situacao' ->> 'faltaPagar', r -> 'situacao' -> 'canceladas' ->> 'n', r -> 'encerrado' ->> 'motivo'] from enc),
  array['ENCERRADO', '0', '23', 'Quitado com o banco em novembro'], 'FI-20 (C2, S-N3): encerrado, com as parcelas canceladas');
select is((select (h.dados ->> 'parcelasCanceladas')::integer from historico h, l1i where h.acao = 'financeiro.emprestimo_encerrado' and h.entidade_id = l1i.id::text),
  23, 'o encerramento vai ao histórico');
create temp table cx2 as select portal_financeiro_caixa(bianca, rm) c from ids;
select is((select array[(c -> 'meses' -> 1 -> 'emprestimos' ->> 'entrou')::bigint, (c -> 'meses' -> 2 -> 'emprestimos' ->> 'parcelasRealizadas')::bigint,
                        (c -> 'meses' -> 3 -> 'emprestimos' ->> 'parcelasPrevistas')::bigint, (c ->> 'saldo')::bigint] from cx2),
  array[3000000, 395000, 209000, 2837000]::bigint[], 'FI-20 (C2): o encerrado fica no realizado e sai do previsto');
select is((select (c -> 'emprestimos' ->> 'faltaPagar')::bigint from cx2), 5148000::bigint, 'e do falta pagar e da folha');
select is((teste.erro($$ select portal_financeiro_emprestimo_encerrar(bianca, rm, l1i.id, '{"motivo": "De novo, por engano"}'::jsonb) from ids, l1i $$))
  -> 'detalhe' ->> 'motivo', 'JA_ENCERRADO', 'não se encerra duas vezes');

-- Encerrar sem parcelas fixas: dá por quitado, com o não devolvido para o contador (S-N3).
select is((select portal_financeiro_emprestimo_encerrar(bianca, rm, l2i.id, '{"motivo": "A sócia perdoou o resto"}'::jsonb) -> 'situacao' ->> 'naoDevolvido'
             from ids, l2i), '550000', 'FI-20 (S-N3): sem parcelas fixas, encerrado com R$ 5.500,00 não devolvido');
select is((select x ->> 'naoDevolvido' from ids, jsonb_array_elements(portal_financeiro_exportar(bianca, rm, '{"mes": "2026-11-01", "formato": "CSV"}'::jsonb)
             -> 'emprestimos' -> 'situacao') x where x ->> 'credor' = 'Marina Ribeiro'), '550000', 'e a aba do contador de novembro mostra o não devolvido');

-- ---------------------------------------------------------------------------------------
-- B1: o anterior ao T3jus, o saldo de abertura e a ordem das coisas, em escritórios à parte.

-- Escritório cadastrado hoje, sem lançamentos: o empréstimo de antes do cadastro fica fora; o de hoje entra.
create temp table nv as select teste.escritorio('Escritório Novo') e, teste.pessoa('Nina Prado') p;
select teste.vincular(p, e, 'SOCIO') from nv;
create temp table nvl as select
  portal_financeiro_emprestimo_registrar(p, e, jsonb_build_object('credorTipo', 'OUTRO', 'credorNome', 'Tio Jorge', 'valor', 100000,
    'recebidoEm', '2026-11-01', 'devolucao', 'LIVRE')) antigo
  from nv;
select is((select antigo ->> 'noCaixa' from nvl), 'false', 'FI-20 (B1): antes do cadastro, num escritório sem lançamentos: fora do caixa');
select portal_financeiro_emprestimo_registrar(p, e, jsonb_build_object('credorTipo', 'BANCO', 'credorNome', 'Inter', 'valor', 50000,
    'recebidoEm', '2026-11-18', 'devolucao', 'PARCELAS', 'parcelasTotal', 2, 'parcelaValor', 26000, 'proximoVencimento', '2026-12-18')) from nv;
create temp table pr as select (portal_financeiro_emprestimo_registrar(p, e, jsonb_build_object('credorTipo', 'SOCIO', 'credorNome', 'Nina Prado', 'valor', 30000,
    'recebidoEm', '2026-11-18', 'devolucao', 'LIVRE')) ->> 'id')::uuid id from nv;
select is((select (portal_financeiro_emprestimo_devolucao(p, e, pr.id, '{"valor": 40000, "pagaEm": "2026-11-18"}'::jsonb) ->> 'acimaDoQueFalta')::bigint
             from nv, pr), 10000::bigint, 'FI-20: devolução acima do que falta vale, e o servidor diz quanto passou');
select is((select array[r -> 'situacao' ->> 'custo', r -> 'situacao' ->> 'situacao', r -> 'situacao' ->> 'faltaDevolver']
             from nv, pr, lateral (select portal_financeiro_emprestimo(p, e, pr.id) r) x),
  array['10000', 'QUITADO', '0'], 'FI-20 (C3): sem parcelas fixas, o custo é o que voltou além do que entrou, e está quitado');
select is((select (portal_financeiro_caixa(p, e) ->> 'saldo')::bigint from nv), 40000::bigint, 'FI-20 (B1): o antigo não mexe no saldo; os de hoje entram');
select is((select jsonb_array_length(portal_financeiro_caixa(p, e) -> 'mesesExportar') from nv), 1, 'FI-20 (S-N4): só o mês corrente');
select is((select portal_financeiro_emprestimo_encerrar(p, e, (antigo ->> 'id')::uuid, '{"motivo": "Devolvido fora do T3jus"}'::jsonb) -> 'situacao' ->> 'situacao'
             from nv, nvl), 'ENCERRADO', 'FI-20 (S-N3): o anterior ao T3jus se encerra mesmo sem pagamento no T3jus');

-- O cadastro é lido no horário de Brasília: 01/09 às 22h30 em Brasília já é 02/09 em UTC.
select ajustar_relogio(('2026-09-01 22:30-03'::timestamptz - now()));
create temp table br as select teste.escritorio('Escritório da Noite') e, teste.pessoa('Otávio Reis') p;
select ajustar_relogio(('2026-11-18 10:00-03'::timestamptz - now()));
select teste.vincular(p, e, 'SOCIO') from br;
select is((select emprestimo_comeco_caixa(e) from br), '2026-09-01'::date, 'FI-20 (S-N1): o cadastro é lido no horário de Brasília');
create temp table brl as select (portal_financeiro_emprestimo_registrar(p, e, jsonb_build_object('credorTipo', 'BANCO', 'credorNome', 'Itaú', 'valor', 200000,
    'recebidoEm', '2026-09-01', 'devolucao', 'PARCELAS', 'parcelasTotal', 4, 'parcelaValor', 55000, 'proximoVencimento', '2026-10-01')) ->> 'id')::uuid id from br;
select portal_financeiro_conta_paga(p, e, c.id, jsonb_build_object('pagaEm', '2026-08-01', 'valor', 55000))
  from br, brl, contas_pagar c where c.emprestimo_id = brl.id and c.emprestimo_parcela = 1;
select is((select emprestimo_comeco_caixa(e) from br), '2026-09-01'::date,
  'FI-20 (S-N1): a parcela de empréstimo paga não muda o começo do caixa (não depende da ordem dos registros)');
select is((select array[(portal_financeiro_emprestimo_registrar(p, e, jsonb_build_object('credorTipo', 'SOCIO', 'credorNome', 'Otávio Reis', 'valor', 10000,
    'recebidoEm', '2026-08-31', 'devolucao', 'LIVRE')) ->> 'noCaixa'), (select no_caixa::text from emprestimos where id = brl.id)] from br, brl),
  array['false', 'true'], 'FI-20 (S-N1): de 31/08 fica fora; o de 01/09 entra');

-- Com saldo de abertura (31/08, R$ 10.000,00): o empréstimo de antes da data já está nela; o de depois soma.
create temp table ab as select teste.escritorio('Escritório Aberto') e, teste.pessoa('Paula Antunes') p;
select teste.vincular(p, e, 'SOCIO') from ab;
select portal_financeiro_ajustes_salvar(p, e, jsonb_build_object('prazoRepasseDias', 3, 'abertura', jsonb_build_object('data', '2026-08-31', 'valor', 1000000))) from ab;
create temp table abl as select
  (portal_financeiro_emprestimo_registrar(p, e, jsonb_build_object('credorTipo', 'BANCO', 'credorNome', 'Caixa Econômica', 'valor', 400000,
    'recebidoEm', '2026-08-20', 'devolucao', 'LIVRE')) ->> 'id')::uuid antes,
  (portal_financeiro_emprestimo_registrar(p, e, jsonb_build_object('credorTipo', 'BANCO', 'credorNome', 'Santander', 'valor', 300000,
    'recebidoEm', '2026-09-15', 'devolucao', 'LIVRE')) ->> 'id')::uuid depois
  from ab;
select is((select array[portal_financeiro_emprestimo(p, e, antes) ->> 'foraDoCaixa', portal_financeiro_emprestimo(p, e, depois) ->> 'noCaixa'] from ab, abl),
  array['ANTES_DA_ABERTURA', 'true'], 'FI-20 (B1): antes da abertura fica fora (já está nela); depois entra');
select is((select (portal_financeiro_caixa(p, e) ->> 'saldo')::bigint from ab), 1300000::bigint, 'FI-20 (B1): com abertura, o de antes não soma de novo');
select is((select (portal_financeiro_ajustes(p, e) ->> 'saldoHoje')::bigint from ab), 1300000::bigint, 'FI-20 (C9): os Ajustes e o Caixa batem, com abertura');
select is((select (portal_financeiro_caixa(p, e) -> 'emprestimos' ->> 'noSaldo')::bigint from ab), 300000::bigint, 'o líquido no saldo é o de depois da abertura');
-- N1: a abertura corrigida para 15/08 deixa o empréstimo de 20/08 de fora dela: ele passa a contar.
select portal_financeiro_abertura_corrigir(p, e, jsonb_build_object('data', '2026-08-15', 'valor', 1000000, 'motivo', 'A data certa é 15/08.')) from ab;
select is((select array[(portal_financeiro_caixa(p, e) ->> 'saldo')::bigint, (portal_financeiro_ajustes(p, e) ->> 'saldoHoje')::bigint] from ab),
  array[1700000, 1700000]::bigint[], 'FI-20 (N1): a abertura corrigida para antes do empréstimo: ele passa a contar, no Caixa e nos Ajustes');
select is((select portal_financeiro_emprestimo(p, e, antes) ->> 'anteriorAoT3jus' from ab, abl), 'false', 'e perde o selo de anterior ao T3jus');

-- Sem abertura, o empréstimo que conta é o primeiro registro; depois, a abertura com data posterior o absorve.
select ajustar_relogio(('2026-09-01 12:00-03'::timestamptz - now()));
create temp table ab2 as select teste.escritorio('Escritório Depois') e, teste.pessoa('Rui Lopes') p;
select ajustar_relogio(('2026-11-18 10:00-03'::timestamptz - now()));
select teste.vincular(p, e, 'SOCIO') from ab2;
select portal_financeiro_emprestimo_registrar(p, e, jsonb_build_object('credorTipo', 'BANCO', 'credorNome', 'Bradesco', 'valor', 500000,
    'recebidoEm', '2026-10-01', 'devolucao', 'LIVRE')) from ab2;
select is((select array[portal_financeiro_ajustes(p, e) ->> 'primeiroLancamento', portal_financeiro_caixa(p, e) -> 'mesesExportar' ->> -1] from ab2),
  array['2026-10-01', '2026-10-01'], 'FI-20 (C8): o empréstimo como primeiro registro: nos Ajustes e nos meses que se podem exportar');
select portal_financeiro_ajustes_salvar(p, e, jsonb_build_object('prazoRepasseDias', 3, 'abertura', jsonb_build_object('data', '2026-10-31', 'valor', 450000))) from ab2;
select is((select array[(portal_financeiro_caixa(p, e) ->> 'saldo')::bigint, (portal_financeiro_ajustes(p, e) ->> 'saldoHoje')::bigint] from ab2),
  array[450000, 450000]::bigint[], 'FI-20 (B1): a abertura de depois absorve o empréstimo, sem contar duas vezes');

-- N1: registrado sem abertura e fora do caixa; depois, a abertura com data anterior a ele: passa a contar.
create temp table n1 as select teste.escritorio('Escritório Hoje') e, teste.pessoa('Sara Dias') p;
select teste.vincular(p, e, 'SOCIO') from n1;
create temp table n1l as select (portal_financeiro_emprestimo_registrar(p, e, jsonb_build_object('credorTipo', 'BANCO', 'credorNome', 'Nubank', 'valor', 70000,
    'recebidoEm', '2026-10-01', 'devolucao', 'LIVRE')) ->> 'id')::uuid id from n1;
select is((select (portal_financeiro_caixa(p, e) ->> 'saldo')::bigint from n1), 0::bigint, 'FI-20 (N1): sem abertura, de antes do cadastro, fora do saldo');
select portal_financeiro_ajustes_salvar(p, e, jsonb_build_object('prazoRepasseDias', 3, 'abertura', jsonb_build_object('data', '2026-09-30', 'valor', 200000))) from n1;
select is((select array[(portal_financeiro_caixa(p, e) ->> 'saldo')::bigint, (portal_financeiro_ajustes(p, e) ->> 'saldoHoje')::bigint] from n1),
  array[270000, 270000]::bigint[], 'FI-20 (N1): com a abertura de antes dele, quem decide é a abertura: passa a contar, no Caixa e nos Ajustes');

-- S-N4: no máximo 13 meses, mesmo com empréstimo antigo que conta.
create temp table m13 as select teste.escritorio('Escritório Antigo') e, teste.pessoa('Tomás Vieira') p;
select teste.vincular(p, e, 'SOCIO') from m13;
select portal_financeiro_ajustes_salvar(p, e, jsonb_build_object('prazoRepasseDias', 3, 'abertura', jsonb_build_object('data', '2024-01-01', 'valor', 0))) from m13;
select portal_financeiro_emprestimo_registrar(p, e, jsonb_build_object('credorTipo', 'BANCO', 'credorNome', 'Safra', 'valor', 10000,
    'recebidoEm', '2024-06-01', 'devolucao', 'LIVRE')) from m13;
select is((select jsonb_array_length(portal_financeiro_caixa(p, e) -> 'mesesExportar') from m13), 13, 'FI-20 (S-N4): no máximo 13 meses, com empréstimo antigo');

-- ---------------------------------------------------------------------------------------
-- Datas das parcelas: os mesmos casos do Vitest (parcelasDoEmprestimo).
select is(emprestimo_vencimento('2027-01-31', 0, 2), '2027-02-28'::date, 'FI-20: dia 31 em fevereiro de ano comum');
select is(emprestimo_vencimento('2028-01-31', 0, 2), '2028-02-29'::date, 'FI-20: dia 31 em fevereiro de ano bissexto');
select is(emprestimo_vencimento('2027-01-31', 0, 3), '2027-03-31'::date, 'FI-20: e volta ao dia 31 em março');
select is(emprestimo_vencimento('2026-09-10', 16, 40), '2028-08-10'::date, 'FI-20: com as pagas antes, a 40ª');
select is(emprestimo_vencimento('2026-12-30', 0, 3), '2027-02-28'::date, 'FI-20: dia 30 em fevereiro');

-- Inventário.
select is((select array[dado_pessoal::text, situacao, exportar::text] from inventario_dados where tabela = 'emprestimos'),
  array['true', 'APROVADO', 'true'], 'PT-11: empréstimos no inventário, com o texto aprovado do financeiro, e na exportação do escritório');

select * from finish();
rollback;
