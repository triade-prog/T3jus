-- O que as telas e o PDF leem do carnê com desconto (F1.28; CO-10, migration 1170): as faixas, o
-- desconto de cada parcela, a última competência de verdade, o aviso de valor mudado que não
-- acende no fim do desconto, as prévias e o motivo da fatura lido do item.
begin;
select plan(13);

create temp table ids as select
  teste.equipe('Carol', 'ADMINISTRACAO') as adm,
  teste.equipe('Marta Quintela', 'FINANCEIRO') as fin,
  teste.pessoa('Renata Cedro') as socia,
  teste.pessoa('Diego Almeida') as diego,
  hoje_brasilia() as hoje0,
  (competencia_de(hoje_brasilia()) + interval '1 month')::date as m1;
create temp table c as select console_criar_escritorio(adm, 'Cedro & Lima Advocacia', 'Recife', 'PE') as cedro from ids;
insert into vinculos (pessoa_id, escritorio_id, funcao, criado_por)
  select fin, cedro, 'FINANCEIRO', adm from ids, c union all select socia, cedro, 'SOCIO', adm from ids, c;
update pessoas set senha_criada_em = now() where id = (select socia from ids);
create temp table pl as select
  (console_plano_salvar(adm, null, null, '{"nome":"Escritório","precoCentavos":49900,"pessoasIncluidas":6}') ->> 'id')::uuid as escritorio,
  (console_plano_salvar(adm, null, null, '{"nome":"Banca","precoCentavos":74900,"pessoasIncluidas":10}') ->> 'id')::uuid as banca from ids;
create function pg_temp.vcli(p_esc uuid) returns integer language sql as $$ select versao from clientes where escritorio_id = p_esc $$;
create function pg_temp.carne() returns assinatura_carnes language sql as $$
  select * from assinatura_carnes where escritorio_id = (select cedro from c) and substituido_em is null order by gerado_em desc limit 1 $$;
create function pg_temp.aba() returns jsonb language sql as $$ select console_assinatura((select fin from ids), (select cedro from c)) -> 'assinatura' $$;

select console_assinatura_salvar(fin, cedro, null, jsonb_build_object('planoId', escritorio, 'diaVencimento', 10, 'forma', 'CARNE',
  'emailCobranca', 'financeiro@cedrolima.adv.br',
  'desconto', jsonb_build_object('pct', 20, 'ate', (m1 + interval '2 months')::date, 'motivo', 'Escritório novo: 20% nas 3 primeiras faturas')))
  from ids, c, pl;
select console_mudar_estagio(adm, cedro, pg_temp.vcli(cedro), 'ATIVO', 'Implantação concluída') from ids, c;

-- carne_json: faixas, total, o desconto de cada parcela e a última competência.
select is(jsonb_array_length(carne_json(pg_temp.carne()) -> 'faixas'), 2, 'carne_json traz as faixas');
select is((carne_json(pg_temp.carne()) ->> 'totalCentavos')::int, 568860, 'e o total do carnê');
select is((select array_agg((i ->> 'descontoCentavos')::int order by (i ->> 'numero')::int) from jsonb_array_elements(carne_json(pg_temp.carne()) -> 'itens') i),
  array[9980, 9980, 9980] || array_fill(0, array[9]), 'cada parcela diz o desconto dela, para o selo');
select is((carne_json(pg_temp.carne()) ->> 'ultimaCompetencia')::date, ((select m1 from ids) + interval '11 months')::date, 'a última competência é a da última parcela');

-- A aba da assinatura: o valor do mesmo mês no carnê e na mensalidade de hoje.
select is((pg_temp.aba() -> 'carne' ->> 'valorCarneCentavos')::int, (pg_temp.aba() -> 'carne' ->> 'valorHojeCentavos')::int,
  'com o carnê novo, o valor do mês no carnê é o de hoje');
select ajustar_relogio(make_interval(days => vencimento_de((m1 + interval '2 months')::date, 10) - 10 - hoje0)) from ids;
select cobranca_rotina();
select is((pg_temp.aba() -> 'carne' ->> 'valorCarneCentavos')::int || '|' || (pg_temp.aba() -> 'carne' ->> 'valorHojeCentavos')::int,
  '49900|49900', 'no fim do desconto, o mês seguinte bate: o aviso de valor mudou não acende');
select ajustar_relogio('0');

-- As prévias batem com o carnê gerado depois.
create temp table pv as select pg_temp.aba() -> 'carne' -> 'previaNovo' as previa,
  (select x -> 'previa' -> 'carne' from jsonb_array_elements(console_assinatura((select fin from ids), (select cedro from c)) -> 'planos') x where x ->> 'nome' = 'Banca') as banca;
select is((select previa ->> 'primeiraCompetencia' from pv), ((select m1 from ids) + interval '3 months')::date::text, 'a prévia do carnê novo começa no primeiro mês sem fatura');
select ok((select banca -> 'faixas' is not null from pv), 'a prévia de outro plano traz o carnê novo');
select console_carne_novo(fin, cedro, (select versao from assinaturas where escritorio_id = (select cedro from c)), 'Conferência') from ids, c;
select is(carne_faixas(pg_temp.carne()), (select (previa - 'primeiraCompetencia' - 'ultimaCompetencia' - 'parcelas' - 'pessoas') from pv),
  'o carnê gerado bate com a prévia');

-- O documento do carnê (PDF): faixas também no carnê que vale no lugar.
select is(jsonb_array_length(cobranca_carne_documento_json(k) -> 'faixas'), 2, 'o documento do carnê traz as faixas')
  from assinatura_carnes k where k.escritorio_id = (select cedro from c) and k.substituido_em is not null;
select is((cobranca_carne_documento_json(k) -> 'substituto' -> 'faixas' -> 0 ->> 'valorCentavos')::int, 49900, 'e o substituto, com as faixas dele')
  from assinatura_carnes k where k.escritorio_id = (select cedro from c) and k.substituido_em is not null;
select is((select (i ->> 'descontoCentavos')::int from assinatura_carnes k, jsonb_array_elements(cobranca_carne_documento_json(k) -> 'itens') i
            where k.escritorio_id = (select cedro from c) and k.substituido_em is not null and (i ->> 'numero')::int = 1), 9980,
  'o documento diz o desconto de cada parcela');

-- O documento da fatura lê o motivo do item.
select is((select cobranca_documento_json(f) ->> 'motivoDesconto' from faturas f where f.escritorio_id = (select cedro from c) and f.competencia = (select m1 from ids)),
  'Escritório novo: 20% nas 3 primeiras faturas', 'o motivo da fatura vem do item');

select * from finish();
rollback;
