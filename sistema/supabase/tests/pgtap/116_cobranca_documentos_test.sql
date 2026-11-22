-- A fatura e o recibo da cobrança dos escritórios em PDF (F1.21, CO-06, migration 0695): o
-- documento traz o que a folha mostra, sem códigos depois de paga, só para quem pode ver, e o
-- Portal só oferece o PDF com os dados do T3jus completos.
begin;
select plan(15);

create temp table ids as select
  teste.equipe('Carol', 'ADMINISTRACAO') as adm,
  teste.equipe('Marta Quintela', 'FINANCEIRO') as fin,
  teste.pessoa('Renata Cedro') as socia,
  teste.pessoa('Diego Lima') as diego;
create temp table c as select console_criar_escritorio(adm, 'Cedro & Lima Advocacia', 'Recife', 'PE') as cedro,
  console_criar_escritorio(adm, 'Pequi Advocacia', 'Goiânia', 'GO') as pequi from ids;
insert into vinculos (pessoa_id, escritorio_id, funcao, criado_por)
  select fin, cedro, 'FINANCEIRO', adm from ids, c union all select socia, cedro, 'SOCIO', adm from ids, c
  union all select diego, cedro, 'EQUIPE', adm from ids, c;
create temp table pl as select
  (console_plano_salvar(adm, null, null, '{"nome":"Escritório","precoCentavos":49000,"pessoasIncluidas":8}') ->> 'id')::uuid as escritorio from ids;
select console_assinatura_salvar(fin, cedro, null, jsonb_build_object('planoId', escritorio, 'diaVencimento', 10, 'forma', 'BOLETO',
  'emailCobranca', 'financeiro@cedrolima.adv.br', 'cnpjNota', '12345678000195',
  'endereco', jsonb_build_object('cep', '50050-000', 'logradouro', 'Rua da Aurora', 'numero', '295', 'bairro', 'Boa Vista', 'cidade', 'Recife', 'uf', 'PE'),
  'desconto', jsonb_build_object('pct', 20, 'ate', (hoje_brasilia() + 120)::text, 'motivo', 'Combinado na proposta'))) from ids, c, pl;
update pessoas set senha_criada_em = now() where id = (select socia from ids);
select console_mudar_estagio(adm, cedro, (select versao from clientes where escritorio_id = cedro), 'ATIVO', 'Implantação concluída') from ids, c;
create function pg_temp.f1() returns faturas language sql as $$
  select * from faturas where escritorio_id = (select cedro from c) order by competencia limit 1 $$;
create function pg_temp.doc(p_recibo boolean default false) returns jsonb language sql as $$
  select console_fatura_documento((select fin from ids), (select cedro from c), (pg_temp.f1()).id, p_recibo) $$;

-- Console: a fatura em aberto, com o pagador de hoje, os itens e o motivo do desconto.
select is(pg_temp.doc() -> 'pagador' ->> 'cnpj', '12345678000195', 'F1.21: o documento leva o CNPJ de cobrança do pagador');
select is(pg_temp.doc() -> 'pagador' -> 'endereco' ->> 'cep', '50050000', 'e o endereço de cobrança');
select is(pg_temp.doc() -> 'pagador' ->> 'socio', 'Renata Cedro', 'e o sócio dono, que recebe a cópia');
select is(pg_temp.doc() ->> 'motivoDesconto', 'Combinado na proposta', 'o motivo do desconto vai com o item');
select is(pg_temp.doc() -> 'emissor', 'null'::jsonb, 'sem os dados do T3jus, o emissor vem vazio (o Console mostra "a definir")');
select ok(pg_temp.doc() -> 'codigos' is not null and pg_temp.doc() -> 'codigos' ->> 'pixCopiaCola' is null, 'em aberto, o lugar dos códigos vem, ainda vazio');
select is((teste.erro($$ select pg_temp.doc(true) $$)) -> 'detalhe' ->> 'motivo', 'RECIBO_SO_DE_FATURA_PAGA', 'recibo só de fatura paga');
select is((teste.erro($$ select console_fatura_documento(adm, pequi, (pg_temp.f1()).id, false) from ids, c $$)) ->> 'codigo', 'TC404',
  'a fatura de um escritório não abre por outro');

-- Portal: só o sócio dono, e só com os dados do T3jus completos.
select is((select portal_plano_faturas(socia, cedro) ->> 'documentos' from ids, c), 'false', 'sem os dados do T3jus, o Portal não oferece o PDF');
select is((teste.erro($$ select portal_plano_faturas_documento(socia, cedro, (pg_temp.f1()).id, false) from ids, c $$)) -> 'detalhe' ->> 'motivo',
  'FATURA_PDF_INDISPONIVEL', 'e a rota recusa');
update configuracoes set valor = '{"razaoSocial":"T3jus Tecnologia Ltda","cnpj":"11222333000181","endereco":"Rua do Bom Jesus, 10","cidade":"Recife","uf":"PE","contato":"atendimento@t3jus.pro","remetente":"cobranca@t3jus.pro"}'
 where chave = 'cobranca_emissor';
select is((select portal_plano_faturas(socia, cedro) ->> 'documentos' from ids, c), 'true', 'com os dados completos, o Portal oferece');
select is((select portal_plano_faturas_documento(socia, cedro, (pg_temp.f1()).id, false) ->> 'numero' from ids, c)::bigint, (pg_temp.f1()).numero,
  'o sócio dono baixa a fatura');
select ok((teste.erro($$ select portal_plano_faturas_documento(diego, cedro, (pg_temp.f1()).id, false) from ids, c $$)) is not null, 'o resto da equipe não');

-- Paga à mão: o recibo diz quem registrou, sem o motivo, e os códigos somem.
select console_fatura_pagamento_manual(fin, cedro, (pg_temp.f1()).id, (pg_temp.f1()).versao,
  jsonb_build_object('pagoEm', hoje_brasilia(), 'valorCentavos', (pg_temp.f1()).total_centavos, 'forma', 'PIX', 'motivo', 'Comprovante por e-mail')) from ids, c;
select is(pg_temp.doc(true) -> 'pagamento' ->> 'registradoPor', 'Marta Quintela', 'o recibo diz quem registrou o pagamento à mão');
select ok(pg_temp.doc(true) -> 'codigos' = 'null'::jsonb and not (pg_temp.doc(true)::text like '%Comprovante por e-mail%'),
  'paga, a fatura sai sem códigos e sem o motivo interno');

select * from finish();
rollback;
