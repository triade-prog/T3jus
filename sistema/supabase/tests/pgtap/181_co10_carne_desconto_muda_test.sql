-- O desconto mudado ou retirado com o carnê em uso (F1.28; CO-10, migration 1170): a troca só com a
-- confirmação da tela, com a prévia; a fatura emitida e a parcela paga não mudam; o carnê novo
-- começa no primeiro mês cancelado, sem mês faltando nem repetido; e o desconto lançado na
-- implantação conta das primeiras faturas de verdade.
begin;
select plan(22);

create temp table ids as select
  teste.equipe('Carol', 'ADMINISTRACAO') as adm,
  teste.equipe('Marta Quintela', 'FINANCEIRO') as fin,
  teste.pessoa('Renata Cedro') as socia,
  teste.pessoa('Joana Pequi') as socia2,
  teste.pessoa('Diego Almeida') as diego,
  hoje_brasilia() as hoje0,
  (competencia_de(hoje_brasilia()) + interval '1 month')::date as m1;
create temp table c as select
  console_criar_escritorio(adm, 'Cedro & Lima Advocacia', 'Recife', 'PE') as cedro,
  console_criar_escritorio(adm, 'Pequi Advocacia', 'Teresina', 'PI') as pequi from ids;
insert into vinculos (pessoa_id, escritorio_id, funcao, criado_por)
  select fin, cedro, 'FINANCEIRO', adm from ids, c union all select socia, cedro, 'SOCIO', adm from ids, c
  union all select fin, pequi, 'FINANCEIRO', adm from ids, c union all select socia2, pequi, 'SOCIO', adm from ids, c;
update pessoas set senha_criada_em = now() where id in (select socia from ids union select socia2 from ids);
create temp table pl as select
  (console_plano_salvar(adm, null, null, '{"nome":"Escritório","precoCentavos":49900,"pessoasIncluidas":6}') ->> 'id')::uuid as escritorio from ids;
create function pg_temp.ver(p_esc uuid) returns integer language sql as $$ select versao from assinaturas where escritorio_id = p_esc $$;
create function pg_temp.vcli(p_esc uuid) returns integer language sql as $$ select versao from clientes where escritorio_id = p_esc $$;
create function pg_temp.carne(p_esc uuid) returns assinatura_carnes language sql as $$
  select * from assinatura_carnes where escritorio_id = p_esc and substituido_em is null order by gerado_em desc limit 1 $$;
create function pg_temp.valores(p_carne uuid) returns integer[] language sql as $$
  select array_agg(valor_centavos order by numero) from assinatura_carne_parcelas where carne_id = p_carne $$;
-- Os dados da assinatura do Cedro, com o desconto e o dia ditos.
create function pg_temp.dados(p_pct integer, p_ate date, p_motivo text default 'Escritório novo: 20% nas 3 primeiras faturas',
                              p_dia integer default 10, p_trocar boolean default null) returns jsonb language sql as $$
  select jsonb_strip_nulls(jsonb_build_object('diaVencimento', p_dia, 'forma', 'CARNE', 'emailCobranca', 'financeiro@cedrolima.adv.br',
    'desconto', case when p_pct is not null then jsonb_build_object('pct', p_pct, 'ate', p_ate, 'motivo', p_motivo) end,
    'trocarCarne', p_trocar)) $$;

select console_assinatura_salvar(fin, cedro, null, jsonb_build_object('planoId', escritorio) || pg_temp.dados(20, (m1 + interval '2 months')::date))
  from ids, c, pl;
select console_mudar_estagio(adm, cedro, pg_temp.vcli(cedro), 'ATIVO', 'Implantação concluída') from ids, c;
create temp table ca as select * from pg_temp.carne((select cedro from c));
create temp table f1 as select * from faturas where escritorio_id = (select cedro from c) and competencia = (select m1 from ids);
-- A parcela 3 paga adiantada.
select console_parcela_pagamento_manual(fin, cedro, id, jsonb_build_object('pagoEm', hoje_brasilia(), 'valorCentavos', 39920, 'forma', 'PIX', 'motivo', 'Pagou adiantado'))
  from ids, c, assinatura_carne_parcelas where carne_id = (select id from ca) and numero = 3;

-- ---------------------------------------------------------------------------------------
-- Sem a confirmação: recusa com a prévia, e nada é gravado.
create temp table e1 as select teste.erro($$ select console_assinatura_salvar(fin, cedro, pg_temp.ver(cedro), pg_temp.dados(30, (m1 + interval '2 months')::date)) from ids, c $$) as e;
select is((select e -> 'detalhe' ->> 'motivo' from e1), 'CARNE_TROCA_CONFIRMAR', 'pergunta 1: mudar o desconto com o carnê em uso pede confirmação');
select is((select (e -> 'detalhe' -> 'previa' ->> 'parcelas')::int from e1), 10, 'a prévia diz quantas parcelas são canceladas (as sem fatura)');
select is((select e -> 'detalhe' -> 'previa' -> 'previa' -> 'faixas' from e1),
  (select jsonb_build_array(jsonb_build_object('de', (m1 + interval '1 month')::date, 'ate', (m1 + interval '1 month')::date, 'quantidade', 1, 'valorCentavos', 34930),
                            jsonb_build_object('de', (m1 + interval '3 months')::date, 'ate', (m1 + interval '13 months')::date, 'quantidade', 11, 'valorCentavos', 49900)) from ids),
  'e o carnê novo: 30% no mês que resta do desconto, sem repetir o mês pago adiantado');
select is((select desconto_pct || '|' || versao from assinaturas where escritorio_id = (select cedro from c)),
  '20|' || pg_temp.ver((select cedro from c)), 'nada foi gravado') from c;
select is((select count(*)::int from assinatura_carnes where escritorio_id = (select cedro from c)), 1, 'nenhum carnê novo');

-- Com a confirmação: a troca, com o motivo do servidor e o autor.
select console_assinatura_salvar(fin, cedro, pg_temp.ver(cedro), pg_temp.dados(30, (m1 + interval '2 months')::date, p_trocar => true)) from ids, c;
select is((select substituido_motivo from assinatura_carnes where id = (select id from ca)),
  'O desconto de entrada mudou: de 20% até a fatura de ' || mes_por_extenso((m1 + interval '2 months')::date)
  || ' para 30% até a fatura de ' || mes_por_extenso((m1 + interval '2 months')::date), 'o motivo da troca é escrito pelo servidor') from ids;
select is((select substituido_autor from assinatura_carnes where id = (select id from ca)), (select fin from ids), 'o autor é quem salvou');
select is(pg_temp.valores((pg_temp.carne(cedro)).id), array[34930] || array_fill(49900, array[11]), 'o carnê novo tem 12 parcelas') from c;
select is((select array_agg(competencia order by numero) from assinatura_carne_parcelas where carne_id = (pg_temp.carne(cedro)).id),
  (select array_agg(g::date order by g) from ids, generate_series((m1 + interval '1 month')::date, (m1 + interval '13 months')::date, interval '1 month') g
    where g::date <> (m1 + interval '2 months')::date),
  'pergunta 5: começa no primeiro mês cancelado e pula o mês pago adiantado') from c;
select is((select count(*)::int from (select p.competencia from assinatura_carne_parcelas p join assinatura_carnes k on k.id = p.carne_id
            where k.escritorio_id = (select cedro from c) and p.situacao <> 'CANCELADA' group by p.competencia having count(*) > 1) x), 0,
  'nenhum mês em duas parcelas válidas');
select is((select situacao from assinatura_carne_parcelas where carne_id = (select id from ca) and numero = 3), 'PAGA', 'a parcela paga continua paga');
select is((select total_centavos from faturas where id = (select id from f1)), 39920, 'a fatura emitida continua com R$ 399,20');

-- Mudar só o motivo não troca o carnê.
select console_assinatura_salvar(fin, cedro, pg_temp.ver(cedro), pg_temp.dados(30, (m1 + interval '2 months')::date, 'Veio de outro sistema')) from ids, c;
select is((select count(*)::int from assinatura_carnes where escritorio_id = (select cedro from c)), 2, 'mudar só o motivo não troca o carnê');

-- Retirar o desconto: troca, e a fatura antiga guarda o motivo de quando foi emitida.
select console_assinatura_salvar(fin, cedro, pg_temp.ver(cedro), pg_temp.dados(null, null, p_trocar => true)) from ids, c;
select is(pg_temp.valores((pg_temp.carne(cedro)).id), array_fill(49900, array[12]), 'sem desconto, o carnê novo sai cheio') from c;
select is((select cobranca_documento_json(f) ->> 'motivoDesconto' from faturas f where id = (select id from f1)),
  'Escritório novo: 20% nas 3 primeiras faturas', 'a fatura de antes não perde o motivo do desconto');

-- O dia e o desconto juntos: uma troca só, com os dois motivos.
select console_assinatura_salvar(fin, cedro, pg_temp.ver(cedro), pg_temp.dados(10, (m1 + interval '3 months')::date, 'Ajuste combinado', 15, true)) from ids, c;
select is((select count(*)::int from fatura_eventos where assinatura_id = (select assinatura_id from ca) and acao = 'carne.parcelas_canceladas'), 3,
  'o dia e o desconto juntos fazem uma troca só');
select alike((select dados ->> 'motivo' from fatura_eventos where assinatura_id = (select assinatura_id from ca) and acao = 'carne.parcelas_canceladas' order by id desc limit 1),
  'O dia de vencimento mudou de 10 para 15. O desconto de entrada mudou: de sem desconto para 10% até %', 'com os motivos juntos');

-- O "até" que não alcança a próxima fatura é recusado.
select is((teste.erro($$ select console_assinatura_salvar(fin, cedro, pg_temp.ver(cedro), pg_temp.dados(20, m1, p_dia => 15, p_trocar => true)) from ids, c $$)) -> 'detalhe',
  '{"campos": ["descontoAte"], "motivo": "DESCONTO_JA_PASSOU"}'::jsonb, 'o desconto precisa valer pelo menos na próxima fatura');

-- ---------------------------------------------------------------------------------------
-- Pergunta 4: o desconto lançado na implantação conta das primeiras faturas de verdade.
select console_assinatura_salvar(fin, pequi, null, jsonb_build_object('planoId', escritorio, 'diaVencimento', 5, 'forma', 'PIX',
  'emailCobranca', 'contas@pequi.adv.br',
  'desconto', jsonb_build_object('pct', 20, 'ate', (m1 + interval '2 months')::date, 'motivo', 'Escritório novo'))) from ids, c, pl;
select is((select desconto_meses from assinaturas where escritorio_id = (select pequi from c)), 3, 'o desconto preparado guarda os 3 meses');
-- A implantação atrasa dois meses.
select ajustar_relogio(make_interval(days => ((m1 + interval '1 month')::date + 14) - hoje0)) from ids;
select console_mudar_estagio(adm, pequi, pg_temp.vcli(pequi), 'ATIVO', 'Implantação concluída') from ids, c;
select is((select desconto_ate from assinaturas where escritorio_id = (select pequi from c)), ((select m1 from ids) + interval '4 months')::date,
  'ao passar para Ativo, o "até" anda com a 1ª fatura');
select is((select dados from fatura_eventos where assinatura_id = (select id from assinaturas where escritorio_id = (select pequi from c)) and acao = 'assinatura.desconto_ajustado'),
  (select jsonb_build_object('de', (m1 + interval '2 months')::date, 'para', (m1 + interval '4 months')::date, 'meses', 3) from ids),
  'e a mudança fica no histórico');
select is((select array_agg(i.tipo order by i.ordem) from fatura_itens i join faturas f on f.id = i.fatura_id where f.escritorio_id = (select pequi from c)),
  array['MENSALIDADE', 'DESCONTO'], 'a 1ª fatura de verdade sai com o desconto');
select ajustar_relogio('0');

select * from finish();
rollback;
