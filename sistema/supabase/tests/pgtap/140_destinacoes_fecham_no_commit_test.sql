-- A conferência da divisão do levantamento no fim da transação pela API (F3.163; FI-05).
-- No Postgres 17 o gatilho adiado roda com o papel ativo no commit, que pela API é o service_role.
-- O pgTAP nunca faz commit: com o service_role ativo, set constraints all immediate dispara os
-- adiados como o commit faria. pg_temp.fim() volta a adiar só os gatilhos nomeados.
-- O commit de verdade fica em tests/concorrencia/levantamento-pela-api.sh.
begin;
select plan(14);

create function pg_temp.fim() returns void language plpgsql as $$
begin
  set constraints all immediate;
  set constraints caso_pronto_fim, caso_pronto_fim_mudou, caso_pronto_fim_saiu, destinacoes_fecham, caso_fechou_fim deferred;
end $$;

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Diego Almeida') as diego,
  teste.escritorio('Ribeiro & Matos') as rm;
select teste.vincular(socia, rm, 'SOCIO') from ids;
select portal_convidar(socia, rm, diego, 'Diego Almeida', array['FINANCEIRO']) from ids;
alter table ids add column ben uuid, add column ct uuid, add column lima uuid;
update ids set ben = (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Benedito Souza Lima', 'origem', 'GOOGLE',
  'contatos', jsonb_build_array(jsonb_build_object('nome', 'Benedito Souza Lima', 'telefone', '+5511996027736', 'principal', true)))) ->> 'id')::uuid;
update ids set ct = (portal_contrato_criar(socia, rm, jsonb_build_object('clienteId', ben, 'objeto', 'Revisão de aposentadoria',
  'responsavelId', socia, 'advogados', jsonb_build_array(socia),
  'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'EXITO', 'percentual', 3000, 'sobre', 'Atrasados', 'etapa', 'Pagamento da RPV', 'dias', 15)))) ->> 'id')::uuid;
select portal_juridico_etapas(socia, rm) from ids;
update ids set lima = (portal_juridico_caso_criar(socia, rm, jsonb_build_object('nome', 'Lima x INSS', 'area', 'PREVIDENCIARIO',
  'etapaId', (select id from etapas where escritorio_id = ids.rm and ordem = 7), 'responsavelId', socia,
  'clientes', jsonb_build_array(jsonb_build_object('clienteId', ben, 'papel', 'AUTOR', 'contratoId', ct)))) ->> 'id')::uuid;
select pg_temp.fim();
select diego, rm, ben, lima, hoje_brasilia() hoje from ids \gset

-- ---------------------------------------------------------------------------------------
-- 1. Registrar o alvará pela API e o fim da transação como service_role.
set local role service_role;
select lives_ok(format($q$ select portal_financeiro_levantamento_registrar(%L, %L, jsonb_build_object('tipo', 'ALVARA', 'casoId', %L, 'clienteId', %L,
  'valor', 100000, 'entrouEm', %L, 'divisao', jsonb_build_array(
    jsonb_build_object('para', 'CLIENTE', 'valor', 60000),
    jsonb_build_object('para', 'HONORARIOS', 'nome', 'Honorários de êxito', 'regra', '30%%', 'valor', 30000),
    jsonb_build_object('para', 'PERITO', 'nome', 'Dr. Paulo Mendes', 'valor', 10000)))) $q$, :'diego', :'rm', :'lima', :'ben', :'hoje'),
  'F3.163: registrar o levantamento com a divisão pela API');
select lives_ok('set constraints all immediate', 'F3.163: o fim da transação pela API, como service_role, passa');
reset role;
set constraints caso_pronto_fim, caso_pronto_fim_mudou, caso_pronto_fim_saiu, destinacoes_fecham, caso_fechou_fim deferred;
select is((select count(*) from destinacoes d join levantamentos l on l.id = d.levantamento_id where l.caso_id = (select lima from ids)),
  3::bigint, 'o levantamento e as três partes ficam gravados');

select (select id from destinacoes where para = 'CLIENTE') dcli, (select id from destinacoes where para = 'PERITO') dper \gset

-- 2. Marcar a parte como feita e dispensar outra, pela API.
set local role service_role;
select lives_ok(format($q$ select portal_financeiro_destinacao_feita(%L, %L, %L, jsonb_build_object('feitoEm', %L)) $q$, :'diego', :'rm', :'dcli', :'hoje'),
  'marcar a parte do cliente como feita pela API');
select lives_ok('set constraints all immediate', 'F3.163: o fim da transação do feito, como service_role, passa');
reset role;
set constraints caso_pronto_fim, caso_pronto_fim_mudou, caso_pronto_fim_saiu, destinacoes_fecham, caso_fechou_fim deferred;
set local role service_role;
select lives_ok(format($q$ select portal_financeiro_destinacao_dispensar(%L, %L, %L, 'O perito abriu mão') $q$, :'diego', :'rm', :'dper'),
  'dispensar a parte do perito pela API');
select lives_ok('set constraints all immediate', 'F3.163: o fim da transação da dispensa, como service_role, passa');
reset role;
set constraints caso_pronto_fim, caso_pronto_fim_mudou, caso_pronto_fim_saiu, destinacoes_fecham, caso_fechou_fim deferred;
select is((select count(*) filter (where feito_em is not null) || ' ' || count(*) filter (where dispensado_em is not null) from destinacoes),
  '1 1', 'a parte feita e a dispensada ficam gravadas');

-- ---------------------------------------------------------------------------------------
-- 3. A rede continua de pé. A função da API já recusa a divisão que não fecha; a conferência adiada
-- pega qualquer outro caminho. A parte a mais entra direto e o fim roda como service_role, tudo
-- dentro do throws_ok, para nada sobrar na transação.
create function pg_temp.parte_a_mais(p_ordem int) returns void language plpgsql as $$
begin
  insert into destinacoes (escritorio_id, levantamento_id, ordem, para, nome, valor, prazo)
  select escritorio_id, id, p_ordem, 'OUTRO', 'Parte a mais', 700, entrou_em from levantamentos;
  set local role service_role;
  set constraints all immediate;
end $$;
grant execute on function pg_temp.parte_a_mais(int) to service_role;
select throws_ok('select pg_temp.parte_a_mais(9)', 'TC422', 'A divisão não fecha com o valor levantado',
  'no contexto do escritório, a divisão que não fecha é recusada no fim');
select set_config('app.escritorio_id', '', true);
select throws_ok('select pg_temp.parte_a_mais(10)', 'P0001', null,
  'F3.163: sem o contexto do escritório, a conferência recusa em vez de passar calada');
reset role;

-- ---------------------------------------------------------------------------------------
-- 4. A regra para as próximas: todo gatilho adiável do public aponta para função security definer.
create temp view adiaveis_sem_definer as
  select c.relname || '.' || t.tgname as gatilho from pg_trigger t
    join pg_class c on c.oid = t.tgrelid join pg_proc p on p.oid = t.tgfoid
   where c.relnamespace in ('public'::regnamespace, pg_my_temp_schema()) and t.tgdeferrable and not t.tgisinternal and not p.prosecdef;
select is((select array_agg(gatilho order by gatilho) from adiaveis_sem_definer), null,
  'F3.163: todo gatilho adiável do public é security definer (Postgres 17: roda com o papel do commit)');
savepoint autoteste;
create temp table gatilho_novo (id int);
create function pg_temp.gatilho_novo_fim() returns trigger language plpgsql as $$ begin return null; end $$;
create constraint trigger gatilho_novo_fim after insert on gatilho_novo deferrable initially immediate
  for each row execute function pg_temp.gatilho_novo_fim();
select is((select array_agg(gatilho) from adiaveis_sem_definer), array['gatilho_novo.gatilho_novo_fim'],
  'a consulta acha um gatilho adiável novo sem security definer');
rollback to savepoint autoteste;

-- 5. A função em si.
select is((select prosecdef::text || ' ' || proconfig::text || ' ' || pg_get_userbyid(proowner) from pg_proc where proname = 'destinacoes_fecham'),
  'true {search_path=public} dominio', 'destinacoes_fecham é security definer, com search_path fixo e dona dominio');
set local role service_role;
select throws_ok('select destinacoes_fecham()', '0A000', null, 'o execute do service_role é inofensivo: fora do gatilho a função não roda');
reset role;

select * from finish();
rollback;
