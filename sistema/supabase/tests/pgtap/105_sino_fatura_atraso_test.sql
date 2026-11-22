-- Aviso de fatura em atraso no sino do Console (F1.22, CO-06): aos 7 dias (o Portal acende a
-- faixa) e aos 30 (o Console propõe o só consulta), uma vez cada, para a Administração e o
-- Financeiro que atendem o escritório, ligado à fatura.
begin;
select plan(16);

create temp table ids as select
  teste.equipe('Carol', 'ADMINISTRACAO') as adm,
  teste.equipe('Marta Quintela', 'FINANCEIRO') as fin,
  teste.equipe('Otávio Lins', 'FINANCEIRO') as fin2,
  teste.equipe('Rafael Teles', 'IMPLANTACAO') as impl,
  teste.pessoa('Renata Cedro') as socia,
  hoje_brasilia() as hoje0;
create temp table c as select console_criar_escritorio(adm, 'Cedro & Lima Advocacia', 'Recife', 'PE') as cedro from ids;
insert into vinculos (pessoa_id, escritorio_id, funcao, criado_por)
  select fin, cedro, 'FINANCEIRO', adm from ids, c
  union all select impl, cedro, 'IMPLANTACAO', adm from ids, c
  union all select socia, cedro, 'SOCIO', adm from ids, c;

create function pg_temp.ir(p_dia date) returns void language sql as $$
  select ajustar_relogio(make_interval(days => p_dia - (select hoje0 from ids))) $$;
create function pg_temp.f1() returns faturas language sql as $$
  select * from faturas where escritorio_id = (select cedro from c) order by competencia limit 1 $$;
create function pg_temp.avisos(p uuid) returns jsonb language sql as $$
  select coalesce(jsonb_agg(i order by i ->> 'em'), '[]'::jsonb)
    from jsonb_array_elements(console_avisos(p) -> 'itens') i where i ->> 'tipo' = 'FATURA_ATRASO' $$;

create temp table pl as select (console_plano_salvar(adm, null, null, '{"nome":"Escritório","precoCentavos":49000,"pessoasIncluidas":5}') ->> 'id')::uuid as plano from ids;
select console_assinatura_salvar(fin, cedro, null, jsonb_build_object('planoId', plano, 'diaVencimento', 10, 'forma', 'PIX',
  'emailCobranca', 'financeiro@cedrolima.adv.br')) from ids, c, pl;
update pessoas set senha_criada_em = now() where id = (select socia from ids);
select console_mudar_estagio(adm, cedro, (select versao from clientes where escritorio_id = cedro), 'ATIVO', 'Implantação concluída') from ids, c;
select is((select count(*)::int from faturas), 1, 'a primeira fatura saiu');

-- Antes de 7 dias, nada no sino.
select pg_temp.ir((pg_temp.f1()).vencimento + 6);
select cobranca_rotina();
select is((select jsonb_array_length(pg_temp.avisos(fin)) from ids), 0, 'com 6 dias de atraso, o sino ainda não avisa');

-- 7 dias: Administração e Financeiro do escritório.
select pg_temp.ir((pg_temp.f1()).vencimento + 7);
select cobranca_rotina();
select is((select jsonb_array_length(pg_temp.avisos(fin)) from ids), 1, 'F1.22: aos 7 dias, o Financeiro do escritório recebe o aviso');
select is((select jsonb_array_length(pg_temp.avisos(adm)) from ids), 1, 'a Administração também');
select is((select pg_temp.avisos(fin) -> 0 -> 'dados' ->> 'marco' from ids), 'AVISO', 'o marco dos 7 dias');
select is((select (pg_temp.avisos(fin) -> 0 -> 'dados' ->> 'dias')::int from ids), 7, 'com os dias de atraso');
select is((select (pg_temp.avisos(fin) -> 0 ->> 'faturaId')::uuid from ids), (pg_temp.f1()).id, 'ligado à fatura');
select is((select pg_temp.avisos(fin) -> 0 -> 'dados' ->> 'escritorio' || '|' || (pg_temp.avisos(fin) -> 0 -> 'dados' ->> 'totalCentavos') from ids),
  'Cedro & Lima Advocacia|' || (pg_temp.f1()).total_centavos, 'com o escritório e o valor da fatura');
select is((select count(*)::int from avisos_console where pessoa_id = (select fin2 from ids)), 0,
  'PT-24: o Financeiro que não atende o escritório não recebe');
select is((select count(*)::int from avisos_console where pessoa_id = (select impl from ids)), 0, 'a Implantação não recebe');
select is((select (console_avisos(impl) ->> 'veCobranca')::boolean from ids), false, 'o sino da Implantação diz que ela não vê Cobrança');

-- A rotina de novo, no mesmo dia ou no seguinte, não repete.
select cobranca_rotina();
select pg_temp.ir((pg_temp.f1()).vencimento + 8);
select cobranca_rotina();
select is((select jsonb_array_length(pg_temp.avisos(fin)) from ids), 1, 'uma vez por marco');

-- 30 dias: o segundo aviso, com a proposta de só consulta.
select pg_temp.ir((pg_temp.f1()).vencimento + 30);
select cobranca_rotina();
select is((select array_agg(i -> 'dados' ->> 'marco' order by i ->> 'em') from ids, jsonb_array_elements(pg_temp.avisos(fin)) i),
  array['AVISO', 'CONSULTA'], 'aos 30 dias, o aviso da proposta de só consulta');

-- Marcar como lido vale para o aviso de fatura.
select is((select (console_avisos_lidos(fin, app_now()) ->> 'marcados')::int from ids), 2, 'marcar todos inclui os avisos de fatura');
select is((select (console_avisos(fin) ->> 'novos')::int from ids), 0, 'nada novo depois');

select throws_ok($$ insert into avisos_console (pessoa_id, tipo) select fin, 'FATURA_ATRASO' from ids $$, '23514', null,
  'aviso de fatura sem a fatura é recusado');

select ajustar_relogio('0');
select * from finish();
rollback;
