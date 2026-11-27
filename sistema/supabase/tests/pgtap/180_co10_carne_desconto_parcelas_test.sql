-- O carnê com o valor de cada parcela (F1.28; CO-10, CO-06, migration 1170): o desconto de entrada
-- vale só nas parcelas das primeiras faturas, a fatura da parcela mostra mensalidade, pessoas a
-- mais e desconto separados, com o motivo, e a parcela guarda as pessoas do dia do carnê.
begin;
select plan(25);

create temp table ids as select
  teste.equipe('Carol', 'ADMINISTRACAO') as adm,
  teste.equipe('Marta Quintela', 'FINANCEIRO') as fin,
  teste.pessoa('Renata Cedro') as socia,
  teste.pessoa('Joana Pequi') as socia2,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Lia Ipê') as socia3,
  hoje_brasilia() as hoje0,
  (competencia_de(hoje_brasilia()) + interval '1 month')::date as m1;
create temp table c as select
  console_criar_escritorio(adm, 'Cedro & Lima Advocacia', 'Recife', 'PE') as cedro,
  console_criar_escritorio(adm, 'Pequi Advocacia', 'Teresina', 'PI') as pequi,
  console_criar_escritorio(adm, 'Ipê Advocacia', 'Natal', 'RN') as ipe from ids;
insert into vinculos (pessoa_id, escritorio_id, funcao, criado_por)
  select fin, cedro, 'FINANCEIRO', adm from ids, c union all select socia, cedro, 'SOCIO', adm from ids, c
  union all select fin, pequi, 'FINANCEIRO', adm from ids, c union all select socia2, pequi, 'SOCIO', adm from ids, c
  union all select diego, pequi, 'EQUIPE', adm from ids, c
  union all select fin, ipe, 'FINANCEIRO', adm from ids, c union all select socia3, ipe, 'SOCIO', adm from ids, c;
update pessoas set senha_criada_em = now() where id in (select socia from ids union select socia2 from ids union select socia3 from ids);
create temp table pl as select
  (console_plano_salvar(adm, null, null, '{"nome":"Escritório","precoCentavos":49900,"pessoasIncluidas":6}') ->> 'id')::uuid as escritorio,
  (console_plano_salvar(adm, null, null, '{"nome":"Essencial","precoCentavos":49900,"pessoasIncluidas":1}') ->> 'id')::uuid as essencial,
  (console_plano_salvar(adm, null, null, '{"nome":"Banca","precoCentavos":74900,"pessoasIncluidas":10}') ->> 'id')::uuid as banca
  from ids;
create function pg_temp.ver(p_esc uuid) returns integer language sql as $$ select versao from assinaturas where escritorio_id = p_esc $$;
create function pg_temp.vcli(p_esc uuid) returns integer language sql as $$ select versao from clientes where escritorio_id = p_esc $$;
create function pg_temp.carne(p_esc uuid) returns assinatura_carnes language sql as $$
  select * from assinatura_carnes where escritorio_id = p_esc and substituido_em is null order by gerado_em desc limit 1 $$;
create function pg_temp.valores(p_carne uuid) returns integer[] language sql as $$
  select array_agg(valor_centavos order by numero) from assinatura_carne_parcelas where carne_id = p_carne $$;
create function pg_temp.meses(p_de date, p_n integer) returns date[] language sql as $$
  select array_agg((p_de + make_interval(months => i))::date order by i) from generate_series(0, p_n - 1) i $$;

-- ---------------------------------------------------------------------------------------
-- Escritório novo, 20% nas 3 primeiras faturas: 3 parcelas de R$ 399,20 e 9 de R$ 499,00.
select console_assinatura_salvar(fin, cedro, null, jsonb_build_object('planoId', escritorio, 'diaVencimento', 10, 'forma', 'CARNE',
  'emailCobranca', 'financeiro@cedrolima.adv.br',
  'desconto', jsonb_build_object('pct', 20, 'ate', (m1 + interval '2 months')::date, 'motivo', 'Escritório novo: 20% nas 3 primeiras faturas')))
  from ids, c, pl;
select console_mudar_estagio(adm, cedro, pg_temp.vcli(cedro), 'ATIVO', 'Implantação concluída') from ids, c;
select is(pg_temp.valores((pg_temp.carne(cedro)).id), array[39920, 39920, 39920] || array_fill(49900, array[9]),
  'CO-10: o desconto vale só nas 3 primeiras parcelas, sem se repetir nas 12') from c;
select is((select sum(valor_centavos)::int from assinatura_carne_parcelas where carne_id = (pg_temp.carne(cedro)).id), 568860,
  'total do carnê: R$ 5.688,60') from c;
select is((pg_temp.carne(cedro)).valor_parcela_centavos, 39920, 'valor_parcela_centavos é o da 1ª parcela') from c;
select is(carne_faixas(pg_temp.carne(cedro)),
  jsonb_build_object('faixas', jsonb_build_array(
      jsonb_build_object('de', m1, 'ate', (m1 + interval '2 months')::date, 'quantidade', 3, 'valorCentavos', 39920),
      jsonb_build_object('de', (m1 + interval '3 months')::date, 'ate', (m1 + interval '11 months')::date, 'quantidade', 9, 'valorCentavos', 49900)),
    'totalCentavos', 568860),
  'carne_faixas junta as parcelas seguidas de mesmo valor') from ids, c;
select is((select jsonb_array_length(dados -> 'faixas') || '|' || (dados ->> 'totalCentavos') from fatura_eventos
            where assinatura_id = (select id from assinaturas where escritorio_id = (select cedro from c)) and acao = 'carne.gerado'),
  '2|568860', 'o evento carne.gerado leva as faixas e o total');
select is((select array_agg(tipo || ':' || valor_centavos || ':' || coalesce(motivo, '-') order by ordem) from fatura_itens i join faturas f on f.id = i.fatura_id
            where f.escritorio_id = (select cedro from c) and f.competencia = (select m1 from ids)),
  array['MENSALIDADE:49900:-', 'DESCONTO:-9980:Escritório novo: 20% nas 3 primeiras faturas'],
  'a fatura da parcela 1: mensalidade e desconto separados, com o motivo gravado no item');
select is((select descricao from fatura_itens i join faturas f on f.id = i.fatura_id
            where f.escritorio_id = (select cedro from c) and f.competencia = (select m1 from ids) and i.tipo = 'DESCONTO'),
  'Desconto de entrada (20% da mensalidade)', 'o item se chama "Desconto de entrada" (pergunta 3)');
select alike((select descricao from fatura_itens i join faturas f on f.id = i.fatura_id
            where f.escritorio_id = (select cedro from c) and f.competencia = (select m1 from ids) and i.tipo = 'MENSALIDADE'),
  'Parcela 1 de 12 do carnê % · plano Escritório · %', 'a mensalidade diz a parcela e o carnê');
select is((select total_centavos || '|' || pessoas_ativas from faturas where escritorio_id = (select cedro from c) and competencia = (select m1 from ids)),
  '39920|1', 'o total é o valor da parcela e as pessoas são as da parcela');

-- A parcela 4 (sem desconto), emitida no mês dela: só a mensalidade.
select ajustar_relogio(make_interval(days => vencimento_de((m1 + interval '3 months')::date, 10) - 15 - hoje0)) from ids;
select cobranca_rotina();
select is((select array_agg(tipo || ':' || valor_centavos order by ordem) from fatura_itens i join faturas f on f.id = i.fatura_id
            where f.escritorio_id = (select cedro from c) and f.competencia = ((select m1 from ids) + interval '3 months')::date),
  array['MENSALIDADE:49900'], 'a parcela 4 já sai cheia, sem carnê novo feito à mão');
select is((select count(*)::int from assinatura_carnes where escritorio_id = (select cedro from c)), 1, 'nenhum carnê novo para o fim do desconto');
select ajustar_relogio('0');

-- A parcela não muda: nem as pessoas, nem os itens.
select is((teste.erro($$ update assinatura_carne_parcelas set itens = '[]' where carne_id = (pg_temp.carne((select cedro from c))).id and numero = 5 $$)) ->> 'codigo',
  'TC422', 'os itens da parcela não mudam');
select is((teste.erro($$ update assinatura_carne_parcelas set pessoas = 9 where carne_id = (pg_temp.carne((select cedro from c))).id and numero = 5 $$)) ->> 'codigo',
  'TC422', 'as pessoas da parcela não mudam');

-- ---------------------------------------------------------------------------------------
-- Vem de outro sistema, 30%, com 1 pessoa a mais (R$ 39,00): 3 de R$ 388,30 e 9 de R$ 538,00.
select console_assinatura_salvar(fin, pequi, null, jsonb_build_object('planoId', essencial, 'diaVencimento', 5, 'forma', 'CARNE',
  'emailCobranca', 'contas@pequi.adv.br',
  'desconto', jsonb_build_object('pct', 30, 'ate', (m1 + interval '2 months')::date, 'motivo', 'Veio de outro sistema: 30% nas 3 primeiras faturas')))
  from ids, c, pl;
select console_mudar_estagio(adm, pequi, pg_temp.vcli(pequi), 'ATIVO', 'Implantação concluída') from ids, c;
select is(pg_temp.valores((pg_temp.carne(pequi)).id), array[38830, 38830, 38830] || array_fill(53800, array[9]),
  'CO-10: 30% só sobre a mensalidade, a pessoa a mais inteira') from c;
select is((select sum(valor_centavos)::int from assinatura_carne_parcelas where carne_id = (pg_temp.carne(pequi)).id), 600690,
  'total do carnê: R$ 6.006,90') from c;
select is((select pessoas from assinatura_carne_parcelas where carne_id = (pg_temp.carne(pequi)).id and numero = 7), 2,
  'a parcela guarda as pessoas do dia do carnê (pergunta 2)') from c;
select alike((select i ->> 'descricao' from assinatura_carne_parcelas p, jsonb_array_elements(p.itens) i
              where p.carne_id = (pg_temp.carne(pequi)).id and p.numero = 1 and i ->> 'tipo' = 'PESSOA_A_MAIS'),
  '1 pessoa a mais (2 ativas em %, no dia do carnê; 1 incluídas)', 'a pessoa a mais diz o dia do carnê') from c;
-- O preço da pessoa a mais muda: as parcelas e o carnê ficam como estão.
select console_pessoa_a_mais(adm, (select versao from planos_regras), 6900) from ids;
select is(pg_temp.valores((pg_temp.carne(pequi)).id), array[38830, 38830, 38830] || array_fill(53800, array[9]),
  'mudar o preço da pessoa a mais não mexe no carnê em uso') from c;
select is((select count(*)::int from assinatura_carnes where escritorio_id = (select pequi from c)), 1, 'e não gera carnê novo');

-- ---------------------------------------------------------------------------------------
-- Mudar de plano com o desconto ainda valendo: o desconto vale sobre o preço novo.
create temp table c2 as select console_criar_escritorio(adm, 'Jatobá Advocacia', 'Belém', 'PA') as jatoba from ids;
insert into vinculos (pessoa_id, escritorio_id, funcao, criado_por)
  select fin, jatoba, 'FINANCEIRO', adm from ids, c2 union all select socia, jatoba, 'SOCIO', adm from ids, c2;
select console_assinatura_salvar(fin, jatoba, null, jsonb_build_object('planoId', escritorio, 'diaVencimento', 10, 'forma', 'CARNE',
  'emailCobranca', 'contas@jatoba.adv.br',
  'desconto', jsonb_build_object('pct', 20, 'ate', (m1 + interval '2 months')::date, 'motivo', 'Escritório novo')))
  from ids, c2, pl;
select console_mudar_estagio(adm, jatoba, pg_temp.vcli(jatoba), 'ATIVO', 'Implantação concluída') from ids, c2;
select console_assinatura_mudar_plano(fin, jatoba, pg_temp.ver(jatoba), banca, 'Cresceu para 9 pessoas') from ids, c2, pl;
select is(pg_temp.valores((pg_temp.carne(jatoba)).id), array[59920, 59920] || array_fill(74900, array[10]),
  'o carnê novo leva 20% de R$ 749,00 nos 2 meses que restam do desconto') from c2;
select is((select primeira_competencia from assinatura_carnes where id = (pg_temp.carne(jatoba)).id), ((select m1 from ids) + interval '1 month')::date,
  'e começa no primeiro mês cancelado') from c2;

-- ---------------------------------------------------------------------------------------
-- No carnê, até 99%.
select is((teste.erro($$ select console_assinatura_salvar(fin, ipe, null, jsonb_build_object('planoId', escritorio, 'diaVencimento', 5, 'forma', 'CARNE',
    'emailCobranca', 'a@ipe.adv.br', 'desconto', jsonb_build_object('pct', 100, 'ate', (m1 + interval '2 months')::date, 'motivo', 'Cortesia'))) from ids, c, pl $$)) -> 'detalhe',
  '{"campos": ["descontoPct"], "motivo": "CARNE_DESCONTO_ATE_99"}'::jsonb, 'no carnê, 100% é recusado como erro do desconto');

-- Carnê de 3 parcelas, desconto de 5 meses: a renovação ainda leva o desconto nas parcelas do prazo.
select console_assinatura_salvar(fin, ipe, null, jsonb_build_object('planoId', escritorio, 'diaVencimento', 5, 'forma', 'CARNE',
  'parcelasPorCarne', 3, 'emailCobranca', 'a@ipe.adv.br',
  'desconto', jsonb_build_object('pct', 20, 'ate', (m1 + interval '4 months')::date, 'motivo', 'Escritório novo')))
  from ids, c, pl;
select console_mudar_estagio(adm, ipe, pg_temp.vcli(ipe), 'ATIVO', 'Implantação concluída') from ids, c;
select is(pg_temp.valores((pg_temp.carne(ipe)).id), array[39920, 39920, 39920], 'o primeiro carnê de 3 parcelas, todo com desconto') from c;
select ajustar_relogio(make_interval(days => vencimento_de((m1 + interval '2 months')::date, 5) - 20 - hoje0)) from ids;
select cobranca_rotina();
select is(pg_temp.valores((pg_temp.carne(ipe)).id), array[39920, 39920, 49900], 'a renovação leva o desconto nos 2 meses que restam') from c;
select is((select array_agg(competencia order by numero) from assinatura_carne_parcelas where carne_id = (pg_temp.carne(ipe)).id),
  pg_temp.meses((m1 + interval '3 months')::date, 3), 'e continua do mês seguinte à última parcela') from ids, c;
select ajustar_relogio('0');

select * from finish();
rollback;
