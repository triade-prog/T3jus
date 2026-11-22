-- O carnê da assinatura em PDF (F1.21, CO-06, migration 0696): o documento mostra o carnê
-- como está hoje, sem códigos na parcela paga ou cancelada, com o carnê que vale no lugar, e o
-- Portal só oferece com o meio de pagamento ligado e os dados do T3jus completos.
begin;
select plan(13);

create temp table ids as select
  teste.equipe('Carol', 'ADMINISTRACAO') as adm,
  teste.equipe('Marta Quintela', 'FINANCEIRO') as fin,
  teste.pessoa('Renata Pequi') as socia,
  teste.pessoa('Diego Lima') as diego;
create temp table c as select console_criar_escritorio(adm, 'Pequi Advocacia', 'Goiânia', 'GO') as pequi,
  console_criar_escritorio(adm, 'Cedro & Lima Advocacia', 'Recife', 'PE') as cedro from ids;
insert into vinculos (pessoa_id, escritorio_id, funcao, criado_por)
  select fin, pequi, 'FINANCEIRO', adm from ids, c union all select socia, pequi, 'SOCIO', adm from ids, c
  union all select diego, pequi, 'EQUIPE', adm from ids, c;
create temp table pl as select
  (console_plano_salvar(adm, null, null, '{"nome":"Escritório","precoCentavos":49000,"pessoasIncluidas":8}') ->> 'id')::uuid as escritorio from ids;
select console_assinatura_salvar(fin, pequi, null, jsonb_build_object('planoId', escritorio, 'diaVencimento', 5, 'forma', 'CARNE',
  'emailCobranca', 'contas@pequi.adv.br', 'cnpjNota', '40721536000110')) from ids, c, pl;
update pessoas set senha_criada_em = now() where id = (select socia from ids);
select console_mudar_estagio(adm, pequi, (select versao from clientes where escritorio_id = pequi), 'ATIVO', 'Implantação concluída') from ids, c;
create temp table ca as select * from assinatura_carnes where escritorio_id = (select pequi from c);
create function pg_temp.doc(p_carne uuid default null) returns jsonb language sql as $$
  select console_carne_documento((select fin from ids), (select pequi from c), coalesce(p_carne, (select id from ca))) $$;
create function pg_temp.parcela(n integer, p_carne uuid default null) returns jsonb language sql as $$
  select i from jsonb_array_elements(pg_temp.doc(p_carne) -> 'itens') i where (i ->> 'numero')::int = n $$;

-- Console: o carnê com as 12 parcelas, o pagador e o plano.
select is(jsonb_array_length(pg_temp.doc() -> 'itens'), 12, 'F1.21: o documento do carnê traz as 12 parcelas');
select is(pg_temp.doc() -> 'pagador' ->> 'cnpj', '40721536000110', 'com o CNPJ de cobrança do pagador');
select is(pg_temp.doc() ->> 'plano', 'Escritório', 'e o plano');
select ok(pg_temp.parcela(2) -> 'codigos' is not null and pg_temp.parcela(2) -> 'codigos' ->> 'pixCopiaCola' is null,
  'a parcela a pagar tem o lugar dos códigos, ainda vazio');

-- Parcela 3 paga adiantada: sai paga, com a data e a forma, sem códigos.
select console_parcela_pagamento_manual(fin, pequi, id, jsonb_build_object('pagoEm', hoje_brasilia(), 'valorCentavos', 49000, 'forma', 'PIX', 'motivo', 'Pagou adiantado'))
  from ids, c, assinatura_carne_parcelas where carne_id = (select id from ca) and numero = 3;
select is(pg_temp.parcela(3) ->> 'situacao' || '|' || (pg_temp.parcela(3) ->> 'formaPaga'), 'PAGA|PIX', 'a parcela paga sai paga, com a forma');
select is(pg_temp.parcela(3) -> 'codigos', 'null'::jsonb, 'e sem códigos');
select ok(not (pg_temp.doc()::text like '%Pagou adiantado%'), 'o motivo do pagamento à mão não vai');

-- Carnê novo: as parcelas sem fatura saem canceladas, com o carnê que vale no lugar.
select console_carne_novo(fin, pequi, (select versao from assinaturas where escritorio_id = pequi), 'Passou para 9 pessoas') from ids, c;
select is(pg_temp.parcela(4) ->> 'situacao', 'CANCELADA', 'a parcela trocada sai cancelada');
select ok(pg_temp.doc() -> 'substituto' ->> 'numero' is not null, 'com o carnê que vale no lugar');
select is((teste.erro($$ select console_carne_documento(adm, cedro, (select id from ca)) from ids, c $$)) ->> 'codigo', 'TC404',
  'o carnê de um escritório não abre por outro');

-- Portal: só com o meio de pagamento ligado e os dados do T3jus completos.
select is((select portal_plano_faturas(socia, pequi) ->> 'carnePdf' from ids, c), 'false', 'com o meio desligado, o Portal não oferece o carnê');
update configuracoes set valor = '{"razaoSocial":"T3jus Tecnologia Ltda","cnpj":"11222333000181","endereco":"Rua do Bom Jesus, 10","cidade":"Recife","uf":"PE","contato":"atendimento@t3jus.pro"}'
 where chave = 'cobranca_emissor';
select is((teste.erro($$ select portal_plano_faturas_carne_documento(socia, pequi, (select id from ca)) from ids, c $$)) -> 'detalhe' ->> 'motivo',
  'CARNE_PDF_INDISPONIVEL', 'só os dados do T3jus não bastam: falta o meio de pagamento');
update configuracoes set valor = '"inter"' where chave = 'meio_pagamento';
select is((select jsonb_array_length(portal_plano_faturas_carne_documento(socia, pequi, (select id from ca)) -> 'itens') from ids, c), 12,
  'com o meio ligado, o sócio dono baixa o carnê');

select * from finish();
rollback;
