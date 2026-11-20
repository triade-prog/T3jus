-- Financeiro do Portal, parte 4: Resumo, Caixa e exportação para o contador. Os números saem
-- dos registros: recebido contra previsto, vencido por idade do atraso, os próximos 7 dias, o
-- dinheiro de terceiros nunca somado ao do escritório, o saldo e a previsão mês a mês, o que vai
-- no arquivo do contador e a exportação no histórico; área e isolamento
-- (FI-03, FI-06, FI-09, FI-21, PD-03, PD-06, IN-02 a IN-05, IN-07, IN-09, IN-10, IN-14, PA-01, PT-01).
begin;
select plan(40);

select ajustar_relogio(('2026-09-01 12:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Paula Nunes') as paula,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, diego, 'Diego Almeida', array['FINANCEIRO']),
       portal_convidar(socia, rm, paula, 'Paula Nunes', array['CONTRATOS']) from ids;

-- Primeiro uso: nada ainda.
select is((select portal_financeiro_resumo(diego, rm) ->> 'algum' from ids), 'false', 'primeiro uso: o Resumo mostra os primeiros passos');

create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Hélio Batista Corrêa', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Hélio Batista Corrêa', 'telefone', '+5511996027736', 'principal', true)))) ->> 'id')::uuid hel,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PJ', 'nome', 'Farmácia Bom Jesus Ltda', 'origem', 'INDICACAO_CLIENTE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Jorge', 'telefone', '+5511996027738', 'principal', true)))) ->> 'id')::uuid far,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Benedito Souza Lima', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Benedito Souza Lima', 'telefone', '+5511996027737', 'principal', true)))) ->> 'id')::uuid ben
  from ids;

-- Hélio: 3 parcelas de R$ 1.000,00 a partir de 10/09. Farmácia: mensalidade de R$ 1.800,00 a partir de 25/09.
create temp table ct as select
  (portal_contrato_criar(socia, rm, jsonb_build_object('clienteId', cli.hel, 'objeto', 'Ação revisional',
     'responsavelId', ids.diego, 'advogados', jsonb_build_array(ids.socia),
     'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'PARCELADO', 'total', 300000, 'parcelas', 3, 'primeiro', '2026-09-10')))) ->> 'id')::uuid hel,
  (portal_contrato_criar(socia, rm, jsonb_build_object('clienteId', cli.far, 'objeto', 'Assessoria mensal',
     'responsavelId', ids.socia, 'advogados', jsonb_build_array(ids.socia),
     'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'MENSAL', 'valor', 180000, 'primeiro', '2026-09-25', 'meses', 6)))) ->> 'id')::uuid far
  from ids, cli;
select portal_contrato_assinatura(socia, rm, ct.hel, 1, '2026-09-01'), portal_contrato_assinatura(socia, rm, ct.far, 1, '2026-09-01') from ids, ct;
create temp table pc as select
  (select id from recebimentos_previstos where contrato_id = ct.hel order by vencimento limit 1) hel1,
  (select id from recebimentos_previstos where contrato_id = ct.hel order by vencimento offset 2 limit 1) hel3,
  (select id from recebimentos_previstos where contrato_id = ct.far order by vencimento limit 1) far9,
  (select id from recebimentos_previstos where contrato_id = ct.far order by vencimento offset 1 limit 1) far10
  from ct;

-- Aluguel de R$ 1.500,00, todo dia 5, pago em setembro.
create temp table al as select
  (portal_financeiro_conta_lancar(diego, rm, jsonb_build_object('descricao', 'Aluguel da sala', 'categoria', 'ALUGUEL',
     'valor', 150000, 'vencimento', '2026-09-05', 'repete', true)) ->> 'id')::uuid set9
  from ids;

select ajustar_relogio(('2026-09-26 12:00-03'::timestamptz - now()));
select portal_financeiro_conta_paga(diego, rm, al.set9, jsonb_build_object('pagaEm', '2026-09-05', 'valor', 150000)) from ids, al;
select portal_financeiro_receber_registrar(diego, rm, pc.hel1, jsonb_build_object('valor', 100000, 'recebidoEm', '2026-09-12', 'forma', 'PIX')),
       portal_financeiro_receber_registrar(diego, rm, pc.far9, jsonb_build_object('valor', 180000, 'recebidoEm', '2026-09-25', 'forma', 'BOLETO', 'recibo', true))
  from ids, pc;

select ajustar_relogio(('2026-10-26 12:00-03'::timestamptz - now()));
select portal_financeiro_receber_registrar(diego, rm, pc.far10, jsonb_build_object('valor', 180000, 'recebidoEm', '2026-10-26', 'forma', 'BOLETO')) from ids, pc;
select lancar_recorrentes(rm) from ids;
select portal_financeiro_conta_paga(diego, rm, c.id, jsonb_build_object('pagaEm', '2026-10-05', 'valor', 150000))
  from ids, contas_pagar c where c.escritorio_id = ids.rm and c.mes = '2026-10-01';

-- 18/11: um alvará de Benedito, R$ 1.000,00. Os honorários (R$ 300,00) já foram transferidos; a parte dele não.
select ajustar_relogio(('2026-11-18 12:00-03'::timestamptz - now()));
select portal_juridico_etapas(socia, rm) from ids;
create temp table cs as select
  (portal_juridico_caso_criar(socia, rm, jsonb_build_object('nome', 'Lima x INSS', 'area', 'PREVIDENCIARIO',
     'etapaId', (select id from etapas where escritorio_id = ids.rm and ordem = 7), 'responsavelId', ids.socia,
     'clientes', jsonb_build_array(jsonb_build_object('clienteId', cli.ben, 'papel', 'AUTOR')))) ->> 'id')::uuid lima
  from ids, cli;
create temp table lv as select
  (portal_financeiro_levantamento_registrar(diego, rm, jsonb_build_object('tipo', 'ALVARA', 'casoId', cs.lima, 'clienteId', cli.ben,
    'valor', 100000, 'entrouEm', '2026-11-16', 'divisao', jsonb_build_array(
      jsonb_build_object('para', 'CLIENTE', 'valor', 70000),
      jsonb_build_object('para', 'HONORARIOS', 'nome', 'Honorários de êxito', 'regra', '30%', 'valor', 30000)))) ->> 'id')::uuid id
  from ids, cs, cli;
select portal_financeiro_destinacao_feita(diego, rm, d.id, jsonb_build_object('feitoEm', '2026-11-17'))
  from ids, lv, destinacoes d where d.levantamento_id = lv.id and d.para = 'HONORARIOS';

-- Área e isolamento.
select is((teste.erro($$ select portal_financeiro_resumo(paula, rm) from ids $$)) -> 'detalhe' ->> 'motivo', 'AREA_NAO_LIBERADA',
  'PA-01: sem a área Financeiro, o Resumo é recusado');
select is((teste.erro($$ select portal_financeiro_caixa(paula, rm) from ids $$)) -> 'detalhe' ->> 'motivo', 'AREA_NAO_LIBERADA',
  'PA-01: sem a área Financeiro, o Caixa é recusado');
select is((teste.erro($$ select portal_financeiro_exportar(paula, rm, '{"mes": "2026-10-01", "formato": "CSV"}'::jsonb) from ids $$)) -> 'detalhe' ->> 'motivo',
  'AREA_NAO_LIBERADA', 'PA-01: sem a área Financeiro, não exporta');
select is((select portal_financeiro_caixa(intrusa, outro) ->> 'saldo' from ids), '0', 'PT-01: outro escritório não vê o caixa deste');

-- Resumo.
create temp table rs as select portal_financeiro_resumo(diego, rm) r from ids;
select is((select r ->> 'algum' from rs), 'true', 'com contratos e contas, o Resumo se monta');
select is((select r -> 'escritorio' from rs), '{"recebido": 30000, "restoMes": 0, "seteDias": 180000, "vencidoMes": 100000}'::jsonb,
  'IN-02 a IN-05: recebido no mês (os honorários transferidos), vencido no mês, 7 dias e o resto do mês');
select is((select r -> 'vencidas' ->> 'valor' from rs), '200000', 'FI-03: o vencido soma as parcelas de outubro e de novembro');
select is((select r -> 'vencidas' -> 'faixas' from rs),
  '[{"n": 1, "valor": 100000}, {"n": 1, "valor": 100000}, {"n": 0, "valor": 0}, {"n": 0, "valor": 0}]'::jsonb,
  'IN-07: o atraso por idade (até 30, 31 a 60, 61 a 90, mais de 90 dias)');
select is((select r -> 'vencidas' -> 'parcelas' -> 0 ->> 'vencimento' from rs), '2026-10-10', 'do mais antigo ao mais recente');
select is((select r -> 'vencidas' ->> 'semAcao' from rs), '2', 'as duas vencidas ainda sem próxima ação');
select ok((select portal_financeiro_cobranca_anotar(diego, rm, pc.hel3, jsonb_build_object('tipo', 'LIGACAO', 'motivo', 'Não respondeu aos lembretes',
  'proxData', '2026-11-20', 'proxOque', 'Ligar para a esposa', 'proxResponsavelId', ids.diego)) ? 'id' from ids, pc), 'cobrança anotada');
select is((select portal_financeiro_resumo(diego, rm) -> 'vencidas' ->> 'semAcao' from ids), '1', 'FI-04: com a próxima ação, sai da conta das sem ação');
select is((select (r -> 'proximas') - 'parcelas' from rs), '{"n": 1, "ate": "2026-11-25", "valor": 180000}'::jsonb, 'PD-03: o que entra nos próximos 7 dias');
select is((select r -> 'proximas' -> 'parcelas' -> 0 -> 'cliente' ->> 'nome' from rs), 'Farmácia Bom Jesus Ltda', 'com o cliente');
select is((select r -> 'terceiros' from rs),
  '{"saldo": 70000, "outros": 0, "peritos": 0, "clientes": 1, "parceiros": 0, "honorarios": 0}'::jsonb,
  'FI-06: o dinheiro de terceiros fica à parte, com quem ainda espera');
select is((select (r -> 'repasses' -> 'lista' -> 0) - 'id' - 'levantamentoId' from rs),
  '{"caso": "Lima x INSS", "nome": "Benedito Souza Lima", "para": "CLIENTE", "tipo": "ALVARA", "prazo": "2026-11-19", "regra": null, "valor": 70000, "cliente": "Benedito Souza Lima"}'::jsonb,
  'PD-06: os repasses pendentes, com o prazo');
select is((select r -> 'meses' from rs),
  '[{"mes": "2026-08-01", "previsto": 0, "realizado": 0}, {"mes": "2026-09-01", "previsto": 280000, "realizado": 280000},
    {"mes": "2026-10-01", "previsto": 280000, "realizado": 180000}, {"mes": "2026-11-01", "previsto": 310000, "realizado": 30000}]'::jsonb,
  'IN-09: o mês comparado com os três anteriores; o previsto de novembro é o recebido mais o que falta');
select is((select r -> 'porTipo' from rs),
  '[{"tipo": "EXITO", "valor": 30000, "restante": 0, "anteriores": 0}, {"tipo": "MENSAL", "valor": 0, "restante": 180000, "anteriores": 360000},
    {"tipo": "PARCELADO", "valor": 0, "restante": 0, "anteriores": 100000}]'::jsonb,
  'IN-10: o recebido por tipo de honorário, com os meses anteriores para o alerta de queda');
select is((select r -> 'fixas' from rs), '{"receita": 280000, "despesas": 150000}'::jsonb, 'IN-14: a receita recorrente contra as despesas fixas do mês');
select is((select r -> 'contratado' ->> 'n' from rs), '0', 'nenhum contrato assinado em novembro');
select is((select r -> 'clientesReceberam' from rs), '{"n": 0, "valor": 0}'::jsonb, 'nenhum cliente recebeu ainda');

-- Caixa.
create temp table cx as select portal_financeiro_caixa(diego, rm) c from ids;
select is((select c ->> 'saldo' from cx), '190000', 'FI-09: o saldo do escritório é o que entrou menos o que foi pago');
select is((select c ->> 'fechaMes' from cx), '320000', 'e fecha o mês com o que falta entrar e sair nele');
select is((select c -> 'terceiros' ->> 'saldo' from cx), '70000', 'FI-06: o de terceiros nunca entra no saldo do escritório');
select is((select c -> 'meses' -> 0 from cx),
  '{"mes": "2026-09-01", "saldo": 130000, "saidasPrevistas": 150000, "saidasRealizadas": 150000, "entradasPrevistas": 280000, "entradasRealizadas": 280000}'::jsonb,
  'mês passado: previsto, realizado e o saldo no fim');
select is((select c -> 'meses' -> 2 from cx),
  '{"mes": "2026-11-01", "saldo": 190000, "saidasPrevistas": 150000, "saidasRealizadas": 0, "entradasPrevistas": 310000, "entradasRealizadas": 30000}'::jsonb,
  'o mês corrente, até hoje');
select is((select c -> 'meses' -> 3 from cx),
  '{"mes": "2026-12-01", "saldo": 350000, "saidasPrevistas": 150000, "saidasRealizadas": null, "entradasPrevistas": 180000, "entradasRealizadas": null}'::jsonb,
  'FI-13: o mês seguinte prevê a conta recorrente que ainda vai nascer');
select is((select c -> 'meses' -> 5 ->> 'saldo' from cx), '410000', 'a previsão segue até fevereiro');
select is((select c -> 'mesesExportar' from cx), '["2026-11-01", "2026-10-01", "2026-09-01"]'::jsonb, 'os meses que se podem exportar');

-- Exportação para o contador.
select is((select (portal_financeiro_exportacao_previa(diego, rm, '2026-10-01')) - 'mes' from ids),
  '{"aberto": false, "despesas": {"n": 1, "valor": 150000}, "recibos": 0, "terceiros": {"entrou": 0, "repassado": 0},
    "recebimentos": {"n": 1, "valor": 180000}, "honorariosTransferidos": {"n": 0, "valor": 0}}'::jsonb,
  'FI-21: a janela diz o que vai no arquivo de outubro');
select is((select portal_financeiro_exportacao_previa(diego, rm, '2026-09-01') ->> 'recibos' from ids), '1', 'com os recibos emitidos');
select is((select portal_financeiro_exportacao_previa(diego, rm, '2026-11-01') -> 'terceiros' from ids), '{"entrou": 100000, "repassado": 0}'::jsonb,
  'terceiros à parte: não são receita');
select is((teste.erro($$ select portal_financeiro_exportar(diego, rm, '{"mes": "2026-12-01", "formato": "PDF"}'::jsonb) from ids $$)) -> 'detalhe' -> 'campos',
  '["formato"]'::jsonb, 'formato inválido');
select is((teste.erro($$ select portal_financeiro_exportar(diego, rm, '{"mes": "2026-12-01", "formato": "CSV"}'::jsonb) from ids $$)) -> 'detalhe' -> 'campos',
  '["mes"]'::jsonb, 'mês que ainda não começou');
create temp table ex as select portal_financeiro_exportar(diego, rm, '{"mes": "2026-11-01", "formato": "XLSX"}'::jsonb) e from ids;
select is((select e -> 'recebimentos' -> 0 ->> 'tipo' from ex), 'EXITO', 'os honorários transferidos entram como receita de êxito');
select is((select jsonb_array_length(e -> 'terceiros') from ex), 2, 'a aba de terceiros traz cada parte do alvará');
select is((select portal_financeiro_caixa(diego, rm) -> 'exportacoes' -> 0 ->> 'mes' from ids), '2026-11-01', 'a última exportação aparece no Caixa');
select is((select count(*)::int from historico h, ids where h.escritorio_id = ids.rm and h.acao = 'financeiro.exportacao_contador'), 1,
  'a exportação fica no histórico do escritório');
select is((teste.erro($$ delete from exportacoes_contador $$)) ->> 'codigo', 'TC023', 'a exportação não se apaga');

select * from finish();
rollback;
