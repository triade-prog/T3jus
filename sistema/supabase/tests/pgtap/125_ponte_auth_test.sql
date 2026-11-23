-- Ponte para o Auth (correção de 23/11/2026, migration 0950): o dominio não alcança o esquema
-- auth, como no Supabase, e as cinco funções que dependem dele usam as quatro funções da ponte.
begin;
select plan(24);

-- O dominio sem nada no auth.
select ok(not has_schema_privilege('dominio', 'auth', 'usage'), 'o dominio não tem usage no auth');
select ok(not has_any_column_privilege('dominio', 'auth.users', 'select'), 'o dominio não lê auth.users');
select ok(not has_any_column_privilege('dominio', 'auth.sessions', 'select'), 'o dominio não lê auth.sessions');
select ok(not has_table_privilege('dominio', 'auth.users', 'delete,insert,update'), 'o dominio não mexe em auth.users');
select ok(not has_table_privilege('dominio', 'auth.sessions', 'delete,insert,update'), 'o dominio não mexe em auth.sessions');

-- A ponte: só as quatro, do dono de quem roda as migrations, sem API.
select is((select array_agg(p.oid::regprocedure::text order by 1) from pg_proc p where p.pronamespace = 'ponte_auth'::regnamespace),
  array['ponte_auth.apagar_entrada(uuid)', 'ponte_auth.aparelhos(uuid)', 'ponte_auth.email(uuid)', 'ponte_auth.encerrar_sessoes(uuid)'],
  'a ponte tem só as quatro funções');
select ok((select bool_and(p.prosecdef and p.proconfig = array['search_path=""'] and p.proowner = (select nspowner from pg_namespace where nspname = 'ponte_auth'))
             from pg_proc p where p.pronamespace = 'ponte_auth'::regnamespace),
  'todas são security definer, com search_path vazio e do dono do esquema');
select ok(has_schema_privilege('dominio', 'ponte_auth', 'usage') and not has_schema_privilege('dominio', 'ponte_auth', 'create'),
  'o dominio usa a ponte e não cria nada nela');
select ok((select bool_and(has_function_privilege('dominio', p.oid, 'execute')) from pg_proc p where p.pronamespace = 'ponte_auth'::regnamespace),
  'o dominio executa as quatro');
select ok(not (select bool_or(has_schema_privilege(r, 'ponte_auth', 'usage') or has_function_privilege(r, p.oid, 'execute'))
                 from pg_proc p, unnest(array['anon', 'authenticated', 'service_role']) r where p.pronamespace = 'ponte_auth'::regnamespace),
  'anon, authenticated e service_role não alcançam a ponte');
select ok(not exists (select 1 from pg_proc p, aclexplode(p.proacl) a where p.pronamespace = 'ponte_auth'::regnamespace and a.grantee = 0),
  'PUBLIC não executa a ponte');
select ok(not exists (select 1 from pg_auth_members m where m.roleid = 'dominio'::regrole and m.member = 'service_role'::regrole),
  'o service_role não é membro do dominio');

-- Guarda para o futuro: fora da ponte, nenhuma função do dominio nem view cita o auth.
select is((select array_agg(p.oid::regprocedure::text) from pg_proc p
            where p.proowner = 'dominio'::regrole and p.pronamespace <> 'ponte_auth'::regnamespace and p.prosrc ~ '\mauth\s*\.'),
  null, 'nenhuma função do dominio cita o auth');
select is((select array_agg(schemaname || '.' || viewname) from pg_views
            where schemaname not in ('pg_catalog', 'information_schema', 'auth', 'extensions') and definition ~ '\mauth\s*\.'),
  null, 'nenhuma view cita o auth');

-- Como em produção: a ponte passa a ser de um papel comum, com só o que o postgres tem no Supabase.
create role ponte_como_supabase nologin bypassrls;
grant usage on schema auth to ponte_como_supabase;
grant select, delete on auth.users, auth.sessions to ponte_como_supabase;
grant dominio to ponte_como_supabase;
alter function ponte_auth.email(uuid) owner to ponte_como_supabase;
alter function ponte_auth.aparelhos(uuid) owner to ponte_como_supabase;
alter function ponte_auth.encerrar_sessoes(uuid) owner to ponte_como_supabase;
alter function ponte_auth.apagar_entrada(uuid) owner to ponte_como_supabase;

create temp table p as select teste.pessoa('Marina Ribeiro') as marina, teste.pessoa('Diego Almeida') as diego;
grant select on p to dominio;
insert into auth.sessions (user_id, not_after) select marina, null from p union all select marina, now() + interval '1 day' from p
  union all select marina, now() - interval '1 minute' from p union all select diego, null from p;
-- Só existe no Auth, não é pessoa do sistema.
insert into auth.users (id, email) values ('00000000-0000-4000-8000-000000000125', 'so-no-auth@exemplo.invalid');

set local role dominio;
select is((select ponte_auth.email(marina) from p), (select marina || '@exemplo.invalid' from p), 'email: lê o e-mail da pessoa');
select is(ponte_auth.email(gen_random_uuid()), null, 'email: quem não existe dá nulo');
select is((select ponte_auth.aparelhos(marina) from p), 2, 'aparelhos: sessão vencida não conta');
select is((select ponte_auth.encerrar_sessoes(marina) from p), 3, 'encerrar_sessoes: diz quantas saíram');
select is((select ponte_auth.aparelhos(marina) from p), 0, 'encerrar_sessoes: nada da pessoa fica');
select is((select ponte_auth.aparelhos(diego) from p), 1, 'encerrar_sessoes: a sessão de outra pessoa continua');
select is(ponte_auth.apagar_entrada('00000000-0000-4000-8000-000000000125'), false, 'apagar_entrada: quem não é pessoa do sistema fica');
select is((select ponte_auth.apagar_entrada(marina) from p), true, 'apagar_entrada: apaga a entrada da pessoa');
select is((select ponte_auth.email(marina) from p), null, 'apagar_entrada: a linha saiu do Auth');
reset role;
update pessoas set entrada_apagada_em = now() where id = (select diego from p);
set local role dominio;
select is((select ponte_auth.apagar_entrada(diego) from p), false, 'apagar_entrada: quem já teve a entrada apagada não é apagado de novo');
reset role;

select * from finish();
rollback;
