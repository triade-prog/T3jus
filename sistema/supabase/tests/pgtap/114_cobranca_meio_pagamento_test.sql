-- A porta do meio de pagamento da cobrança dos escritórios (F1.21, CO-06, migration 0693):
-- desligada, nada sai; ligada, a fila lista o que emitir e cancelar, os códigos são gravados e o
-- aviso confirmado dá baixa com a regra da baixa manual, sem contar duas vezes.
begin;
select plan(14);

create temp table ids as select
  teste.equipe('Carol', 'ADMINISTRACAO') as adm,
  teste.equipe('Marta Quintela', 'FINANCEIRO') as fin,
  teste.pessoa('Renata Cedro') as socia;
create temp table c as select console_criar_escritorio(adm, 'Cedro & Lima Advocacia', 'Recife', 'PE') as cedro from ids;
insert into vinculos (pessoa_id, escritorio_id, funcao, criado_por)
  select fin, cedro, 'FINANCEIRO', adm from ids, c union all select socia, cedro, 'SOCIO', adm from ids, c;
create temp table pl as select
  (console_plano_salvar(adm, null, null, '{"nome":"Escritório","precoCentavos":49000,"pessoasIncluidas":8}') ->> 'id')::uuid as escritorio from ids;
select console_assinatura_salvar(fin, cedro, null, jsonb_build_object('planoId', escritorio, 'diaVencimento', 10, 'forma', 'PIX',
  'emailCobranca', 'financeiro@cedrolima.adv.br', 'cnpjNota', '12345678000195')) from ids, c, pl;
update pessoas set senha_criada_em = now() where id = (select socia from ids);
select console_mudar_estagio(adm, cedro, (select versao from clientes where escritorio_id = cedro), 'ATIVO', 'Implantação concluída') from ids, c;
create function pg_temp.f1() returns faturas language sql as $$
  select * from faturas where escritorio_id = (select cedro from c) order by competencia limit 1 $$;
select is((pg_temp.f1()).total_centavos, 49000, 'a primeira fatura saiu');

-- Desligado (o valor de hoje): nada para emitir, e gravar é recusado.
select is(meio_pagamento_ligado(), null, 'F1.21: o meio de pagamento nasce desligado');
select is(rotina_cobranca_codigos_pendentes(10), '[]'::jsonb, 'desligado, a fila vem vazia');
select is((teste.erro($$ select rotina_cobranca_codigos_gravar('EMITIR_FATURA', (pg_temp.f1()).id, 'inter', '{}') $$)) -> 'detalhe' ->> 'motivo',
  'MEIO_DE_PAGAMENTO_DESLIGADO', 'desligado, nenhum código é gravado');

-- Ligado: a fatura em aberto entra na fila, com o pagador.
update configuracoes set valor = '"inter"' where chave = 'meio_pagamento';
select is((select rotina_cobranca_codigos_pendentes(10) -> 0 ->> 'acao'), 'EMITIR_FATURA', 'ligado, a fatura sem código entra na fila');
select is((select rotina_cobranca_codigos_pendentes(10) -> 0 -> 'pagador' ->> 'cnpj'), '12345678000195', 'com o CNPJ da nota do pagador');

-- Emitida lá, ainda sem os códigos: fica na fila só para buscar os códigos, com o pagamentoId.
select rotina_cobranca_codigos_gravar('EMITIR_FATURA', (pg_temp.f1()).id, 'inter', '{"pagamentoId":"cob-1"}');
select is((select rotina_cobranca_codigos_pendentes(10) -> 0 ->> 'pagamentoId'), 'cob-1', 'emitida sem os códigos, volta só para buscá-los');
select rotina_cobranca_codigos_gravar('EMITIR_FATURA', (pg_temp.f1()).id, 'inter',
  '{"pagamentoId":"cob-1","pixCopiaCola":"000201abc","linhaBoleto":"07790001","codigoBarras":"07790000000000000000000000000000000000000001"}');
select is((select pix_copia_cola || '|' || linha_boleto || '|' || pagamento_id from faturas where id = (pg_temp.f1()).id), '000201abc|07790001|cob-1',
  'os códigos ficam na fatura');
select is(rotina_cobranca_codigos_pendentes(10), '[]'::jsonb, 'com os códigos, sai da fila');

-- Baixa automática: valor diferente não paga; o certo paga; o repetido não conta duas vezes.
select is(cobranca_baixa_automatica('inter', 'cob-1', hoje_brasilia(), 100, 'PIX') ->> 'resultado', 'VALOR_DIFERENTE',
  'valor diferente da fatura não dá baixa');
select is((select count(*)::int from fatura_eventos where fatura_id = (pg_temp.f1()).id and acao = 'pagamento.para_conferir'), 1,
  'e fica um evento para a Administração conferir');
select is(cobranca_baixa_automatica('inter', 'cob-1', hoje_brasilia(), 49000, 'PIX') ->> 'resultado', 'PAGA', 'o pagamento certo dá baixa');
select is((select situacao || '|' || baixa || '|' || forma_paga from faturas where id = (pg_temp.f1()).id), 'PAGA|MEIO_DE_PAGAMENTO|PIX',
  'a fatura fica Paga pelo meio de pagamento, e o recibo vai para a fila');
select is(cobranca_baixa_automatica('inter', 'cob-1', hoje_brasilia(), 49000, 'PIX') ->> 'resultado', 'JA_PAGA', 'o aviso repetido não conta duas vezes');

select * from finish();
rollback;
