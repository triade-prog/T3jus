-- O carnê substituído no Portal e o motivo do item na fatura do Console (F1.29; CO-10, migration 1171, D41 pergunta 2): a sócia dona vê o
-- carnê antigo à vista até a última parcela válida ser paga ou por 60 dias; o motivo da troca,
-- que é da equipe, não sai para o escritório.
begin;
select plan(9);

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
  (console_plano_salvar(adm, null, null, '{"nome":"Escritório","precoCentavos":49900,"pessoasIncluidas":6}') ->> 'id')::uuid as escritorio from ids;
create function pg_temp.vcli(p_esc uuid) returns integer language sql as $$ select versao from clientes where escritorio_id = p_esc $$;
create function pg_temp.pt() returns jsonb language sql as $$ select portal_plano_faturas((select socia from ids), (select cedro from c)) $$;

select console_assinatura_salvar(fin, cedro, null, jsonb_build_object('planoId', escritorio, 'diaVencimento', 10, 'forma', 'CARNE',
  'emailCobranca', 'financeiro@cedrolima.adv.br',
  'desconto', jsonb_build_object('pct', 20, 'ate', (m1 + interval '2 months')::date, 'motivo', 'Escritório novo: 20% nas 3 primeiras faturas')))
  from ids, c, pl;
select console_mudar_estagio(adm, cedro, pg_temp.vcli(cedro), 'ATIVO', 'Implantação concluída') from ids, c;

select is(jsonb_array_length(pg_temp.pt() -> 'carnesAnteriores'), 0, 'sem troca, nenhum carnê anterior');
select is((select (i ->> 'descontoCentavos')::int from jsonb_array_elements(pg_temp.pt() -> 'carne' -> 0 -> 'itens') i where (i ->> 'numero')::int = 1), 9980,
  'o carnê em uso, no Portal, diz o desconto de cada parcela');

select is((select i ->> 'motivo' from faturas f, jsonb_array_elements(console_cobranca_fatura((select fin from ids), (select cedro from c), f.id) -> 'itens') i
            where f.escritorio_id = (select cedro from c) and i ->> 'tipo' = 'DESCONTO'),
  'Escritório novo: 20% nas 3 primeiras faturas', 'a fatura do Console mostra o motivo do desconto, como estava na emissão');

-- A troca, com um motivo da equipe.
select console_carne_novo(fin, cedro, (select versao from assinaturas where escritorio_id = (select cedro from c)), 'Ajuste interno combinado com a Carol') from ids, c;
select is(jsonb_array_length(pg_temp.pt() -> 'carnesAnteriores'), 1, 'depois da troca, o carnê antigo aparece');
select ok((pg_temp.pt() -> 'carnesAnteriores' -> 0 ->> 'aVista')::boolean, 'à vista: a parcela 1 ainda não foi paga');
select is(pg_temp.pt() -> 'carnesAnteriores' -> 0 ->> 'substituidoPor', (select numero from assinatura_carnes where escritorio_id = (select cedro from c) and substituido_em is null),
  'diz qual carnê vale no lugar');
select ok(pg_temp.pt()::text not like '%Ajuste interno%', 'o motivo da troca, da equipe, não sai para o escritório');

-- Paga a parcela que valia e passados 60 dias, vai para "Carnês anteriores", fechado.
select console_parcela_pagamento_manual(fin, cedro, p.id, jsonb_build_object('pagoEm', hoje_brasilia(), 'valorCentavos', p.valor_centavos, 'forma', 'PIX', 'motivo', 'Pagou'))
  from ids, c, assinatura_carne_parcelas p join assinatura_carnes k on k.id = p.carne_id
 where k.escritorio_id = (select cedro from c) and k.substituido_em is not null and p.situacao = 'A_VENCER';
select ajustar_relogio('61 days');
select ok(not (pg_temp.pt() -> 'carnesAnteriores' -> 0 ->> 'aVista')::boolean, 'paga a última válida e 60 dias depois, deixa de ficar à vista');
select ajustar_relogio('0');

select is((teste.erro($$ select portal_plano_faturas(diego, cedro) from ids, c $$)) ->> 'codigo', 'TC401', 'a equipe do escritório continua sem ver');

select * from finish();
rollback;
