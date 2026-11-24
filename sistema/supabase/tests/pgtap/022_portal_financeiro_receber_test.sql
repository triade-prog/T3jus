-- Financeiro do Portal, A receber: as parcelas saem dos contratos assinados, os quatro números
-- do alto, registrar recebimento (mês de referência, saldo, data, recibo), anotar cobrança com
-- motivo e próxima ação, recusa por área, isolamento e a passagem de quem sai
-- (FI-01 a FI-04, FI-14, FI-17, EX-10, PA-01, PT-01, PT-03).
begin;
select plan(32);

select ajustar_relogio(('2026-11-18 12:00-03'::timestamptz - now()));

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

create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Hélio Batista Corrêa', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Hélio Batista Corrêa', 'telefone', '+5511996027736', 'principal', true)))) ->> 'id')::uuid hel,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PJ', 'nome', 'Farmácia Bom Jesus Ltda', 'origem', 'INDICACAO_CLIENTE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Jorge', 'telefone', '+5511996027738', 'principal', true)))) ->> 'id')::uuid far
  from ids;

-- Dois contratos: Hélio com 3 parcelas a partir de 20/11; a Farmácia com mensalidade, ainda em elaboração.
create temp table ct as select
  (portal_contrato_criar(socia, rm, jsonb_build_object('clienteId', cli.hel, 'objeto', 'Ação revisional',
     'responsavelId', ids.diego, 'advogados', jsonb_build_array(ids.socia),
     'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'PARCELADO', 'total', 255000, 'parcelas', 3, 'primeiro', '2026-11-20')))) ->> 'id')::uuid hel,
  (portal_contrato_criar(socia, rm, jsonb_build_object('clienteId', cli.far, 'objeto', 'Assessoria mensal',
     'responsavelId', ids.socia, 'advogados', jsonb_build_array(ids.socia),
     'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'MENSAL', 'valor', 180000, 'primeiro', '2026-11-25', 'meses', 2)))) ->> 'id')::uuid far
  from ids, cli;
select portal_contrato_assinatura(socia, rm, ct.hel, 1, '2026-11-18') from ids, ct;

-- Área e isolamento.
select is((teste.erro($$ select portal_financeiro_receber(paula, rm) from ids $$)) -> 'detalhe' ->> 'motivo', 'AREA_NAO_LIBERADA',
  'PA-01: sem a área Financeiro, A receber é recusado');
select is((teste.erro($$ select portal_financeiro_contrato(intrusa, outro, ct.hel) from ids, ct $$)) ->> 'codigo', 'TC404',
  'PT-01: contrato de outro escritório não é encontrado');
select is((teste.erro($$ select portal_financeiro_contrato(diego, rm, ct.far) from ids, ct $$)) ->> 'codigo', 'TC404',
  'contrato em elaboração ainda não tem parcelas no Financeiro');

-- A lista sai do contrato assinado.
select is((select jsonb_array_length(portal_financeiro_receber(diego, rm) -> 'parcelas') from ids), 3,
  'FI-01: as 3 parcelas do contrato assinado estão em A receber; o em elaboração não');
select is((select portal_financeiro_receber(diego, rm) -> 'totais' from ids),
  '{"aberto": {"n": 3, "valor": 255000}, "vencidas": {"n": 0, "valor": 0}, "seteDias": {"n": 1, "valor": 85000}, "recebidoMes": {"n": 0, "valor": 0}}'::jsonb,
  'os quatro números do alto');
select is((select portal_financeiro_receber(diego, rm) -> 'parcelas' -> 0 ->> 'situacao' from ids), 'A_VENCER', 'parcela futura está a vencer');

-- O tempo passa: a primeira vence.
select ajustar_relogio(('2026-12-05 12:00-03'::timestamptz - now()));
select is((select portal_financeiro_receber(diego, rm, 'VENCIDAS') -> 'parcelas' -> 0 ->> 'situacao' from ids), 'VENCIDA', 'FI-03: vencida aparece no filtro');
select is((select portal_financeiro_receber(diego, rm) -> 'totais' -> 'vencidas' from ids), '{"n": 1, "valor": 85000}'::jsonb, 'FI-03: total vencido');
select is((select jsonb_array_length(portal_financeiro_receber(diego, rm, 'ABERTO', 'revisional') -> 'parcelas') from ids), 3, 'busca pelo objeto');
select is((select jsonb_array_length(portal_financeiro_receber(diego, rm, 'ABERTO', 'farmácia') -> 'parcelas') from ids), 0, 'busca sem resultado');
select is((teste.erro($$ select portal_financeiro_receber(diego, rm, 'TUDO') from ids $$)) -> 'detalhe' -> 'campos', '["mostrar"]'::jsonb, 'filtro inválido');

create temp table p1 as select id from recebimentos_previstos, ct where contrato_id = ct.hel order by vencimento limit 1;

-- Cobrança: vencida sem motivo e sem próxima ação é recusada.
select is((teste.erro($$ select portal_financeiro_cobranca_anotar(diego, rm, p1.id, jsonb_build_object('tipo', 'LIGACAO')) from ids, p1 $$)) -> 'detalhe',
  '{"motivo": "PROXIMA_ACAO_OBRIGATORIA", "campos": ["motivo", "proxData", "proxOque", "proxResponsavelId"]}'::jsonb,
  'FI-04: parcela vencida pede o motivo e a próxima ação, com data e responsável');
select is((teste.erro($$ select portal_financeiro_cobranca_anotar(diego, rm, p1.id, jsonb_build_object('tipo', 'LIGACAO', 'motivo', 'Não atende',
  'proxData', '2026-12-04', 'proxOque', 'Ligar de novo', 'proxResponsavelId', ids.intrusa)) from ids, p1 $$)) -> 'detalhe' -> 'campos',
  '["proxData", "proxResponsavelId"]'::jsonb, 'próxima ação no passado e responsável de fora do escritório');
select ok((select portal_financeiro_cobranca_anotar(diego, rm, p1.id, jsonb_build_object('tipo', 'LIGACAO', 'texto', 'Ninguém atendeu.',
  'motivo', 'Não respondeu aos lembretes do WhatsApp', 'proxData', '2026-12-06', 'proxOque', 'Ligar para a esposa',
  'proxResponsavelId', ids.diego, 'forma', 'PIX')) ? 'id' from ids, p1), 'FI-04: cobrança anotada');
select is((select portal_financeiro_receber(diego, rm) -> 'parcelas' -> 0 -> 'cobranca' ->> 'proxOque' from ids), 'Ligar para a esposa',
  'a lista mostra a próxima ação');
select is((select forma from recebimentos_previstos, p1 where recebimentos_previstos.id = p1.id), 'PIX', 'FI-17: a forma combinada fica na parcela');
select ok((select portal_financeiro_cobranca_anotar(diego, rm, p1.id, jsonb_build_object('tipo', 'MENSAGEM', 'proxData', '2026-12-07',
  'proxOque', 'Mandar o Pix de novo', 'proxResponsavelId', ids.socia)) ? 'id' from ids, p1),
  'o motivo já anotado vale para as anotações seguintes');
select is((select jsonb_array_length(portal_financeiro_receber(diego, rm, 'ABERTO', null, ids.socia) -> 'parcelas') from ids), 0,
  'filtro por responsável do contrato');
select is((select jsonb_array_length(portal_financeiro_receber(diego, rm, 'ABERTO', null, null, 'PIX') -> 'parcelas') from ids), 1, 'filtro por forma');

-- Registrar recebimento.
select is((teste.erro($$ select portal_financeiro_receber_registrar(diego, rm, p1.id, jsonb_build_object('valor', 90000, 'recebidoEm', '2026-12-05', 'forma', 'PIX')) from ids, p1 $$)) -> 'detalhe',
  '{"motivo": "VALOR_ACIMA_DO_SALDO", "campos": ["valor"], "falta": 85000}'::jsonb, 'valor acima do que falta na parcela');
select is((teste.erro($$ select portal_financeiro_receber_registrar(diego, rm, p1.id, jsonb_build_object('valor', 85000, 'recebidoEm', '2026-12-06', 'forma', 'PIX')) from ids, p1 $$)) -> 'detalhe' ->> 'motivo',
  'DATA_NO_FUTURO', 'o dinheiro não entra depois de hoje');
select is((teste.erro($$ select portal_financeiro_receber_registrar(diego, rm, p1.id, jsonb_build_object('valor', 0, 'recebidoEm', 'ontem', 'forma', 'OURO')) from ids, p1 $$)) -> 'detalhe' -> 'campos',
  '["forma", "recebidoEm", "valor"]'::jsonb, 'todos os erros de uma vez');
select is((select portal_financeiro_receber_registrar(diego, rm, p1.id, jsonb_build_object('valor', 50000, 'recebidoEm', '2026-12-05', 'forma', 'PIX', 'recibo', true)) - 'id' from ids, p1),
  '{"paga": false, "falta": 35000, "recibo": {"ano": 2026, "numero": 1}}'::jsonb, 'FI-14: recebimento parcial com recibo número 1');
select is((select portal_financeiro_receber(diego, rm) -> 'parcelas' -> 0 ->> 'situacao' from ids), 'VENCIDA', 'parcial vencida continua vencida');
select is((select portal_financeiro_receber_registrar(diego, rm, p1.id, jsonb_build_object('valor', 35000, 'multaJuros', 1700, 'recebidoEm', '2026-12-05', 'forma', 'DINHEIRO', 'recibo', true)) -> 'recibo' from ids, p1),
  '{"ano": 2026, "numero": 2}'::jsonb, 'FI-14: o recibo segue a sequência do escritório');
select is((teste.erro($$ select portal_financeiro_receber_registrar(diego, rm, p1.id, jsonb_build_object('valor', 100, 'recebidoEm', '2026-12-05', 'forma', 'PIX')) from ids, p1 $$)) -> 'detalhe' ->> 'motivo',
  'PARCELA_JA_PAGA', 'parcela paga não recebe mais');
select is((select portal_financeiro_contrato(diego, rm, ct.hel) -> 'totais' from ids, ct),
  '{"atraso": 0, "aVencer": 170000, "baixado": 0, "recebido": 85000, "contratado": 255000, "renegociado": 0}'::jsonb, 'FI-02: totais da ficha de parcelas');
select is((select portal_financeiro_receber(diego, rm, 'RECEBIDO_MES') -> 'totais' -> 'recebidoMes' from ids), '{"n": 1, "valor": 85000}'::jsonb,
  'FI-02: recebido no mês conta pelo dia em que entrou, sem multa e juros');
select is((teste.erro($$ delete from pagamentos_recebidos $$)) ->> 'codigo', 'TC023', 'PT-03: recebimento não se apaga');

-- Quem sai passa a próxima ação de cobrança (EX-10).
create temp table fe as select teste.pessoa('Felipe Matos') id;
select portal_convidar(socia, rm, fe.id, 'Felipe Matos', array['FINANCEIRO']) from ids, fe;
create temp table p2 as select id from recebimentos_previstos, ct where contrato_id = ct.hel and id <> (select id from p1) order by vencimento limit 1;
select portal_financeiro_cobranca_anotar(diego, rm, p2.id, jsonb_build_object('tipo', 'ANOTACAO', 'proxData', '2026-12-10',
  'proxOque', 'Conferir se o Pix chegou', 'proxResponsavelId', fe.id)) from ids, p2, fe;
update pessoas set senha_criada_em = now() where nome = 'Felipe Matos';
select portal_retirar(socia, rm, (select id from vinculos v where v.pessoa_id = fe.id and v.escritorio_id = ids.rm), 1, ids.diego) from ids, fe;
select is((select parcela_cobranca(p2.id) -> 'proxResponsavel' ->> 'id' from p2), (select diego::text from ids),
  'EX-10: a próxima ação de quem saiu passa a quem ficou com o trabalho');
select is((select parcela_cobranca(p2.id) ->> 'proxOque' from p2), 'Conferir se o Pix chegou', 'EX-10: o que fazer continua o mesmo');

-- Mudar a condição não cancela parcela que já recebeu dinheiro.
select is(contrato_cancelar_futuros(rm, ct.hel, '2026-01-01', 'teste'), 2, 'parcela paga não é cancelada') from ids, ct;

select * from finish();
rollback;
