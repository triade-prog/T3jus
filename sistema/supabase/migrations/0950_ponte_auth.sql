-- O domínio volta a alcançar o Auth por uma ponte (correção, 23/11/2026).
--
-- No Supabase o esquema auth é do supabase_admin. Quem roda as migrations (postgres) tem
-- usage nele e select/delete em auth.users e auth.sessions, mas não pode repassar o usage nem
-- o delete: o "grant usage on schema auth to dominio" da 0150 e o "grant delete on auth.users"
-- da 0210 só geraram aviso. Sem o usage, cinco funções falhavam com "permission denied for
-- schema auth": a busca e a ficha do Suporte (e-mail e aparelhos), desconectar de todos os
-- aparelhos, o responderPara do envio ao contador e a entrada apagada aos 90 dias na rotina da
-- noite. Os testes não pegaram porque rodam como superusuário.
--
-- A saída: o esquema ponte_auth, do postgres, com quatro funções que recebem só o uuid de uma
-- pessoa e fazem uma coisa só. O dominio executa a ponte e perde o que sobrou no auth, para o
-- banco dos testes ficar igual ao de produção. O esquema não é exposto pela API.

create schema ponte_auth;
revoke all on schema ponte_auth from public;
grant usage on schema ponte_auth to dominio;
-- Função criada ali no futuro também nasce sem EXECUTE para PUBLIC.
alter default privileges in schema ponte_auth revoke execute on functions from public;

-- Corpos em texto (não "begin atomic"), para não registrar dependência nas tabelas do Auth e
-- não travar as migrations do próprio Auth.
create function ponte_auth.email(p_pessoa uuid) returns text
language sql stable security definer
set search_path = ''
as $$
  select u.email::text from auth.users u where u.id = p_pessoa
$$;

create function ponte_auth.aparelhos(p_pessoa uuid) returns integer
language sql stable security definer
set search_path = ''
as $$
  select count(*)::integer from auth.sessions s
   where s.user_id = p_pessoa and (s.not_after is null or s.not_after > pg_catalog.now())
$$;

create function ponte_auth.encerrar_sessoes(p_pessoa uuid) returns integer
language plpgsql security definer
set search_path = ''
as $$
declare v_n integer;
begin
  delete from auth.sessions s where s.user_id = p_pessoa;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- Só apaga a entrada de quem é pessoa do sistema e ainda não teve a entrada apagada.
create function ponte_auth.apagar_entrada(p_pessoa uuid) returns boolean
language plpgsql security definer
set search_path = ''
as $$
declare v_n integer;
begin
  if not exists (select 1 from public.pessoas p where p.id = p_pessoa and p.entrada_apagada_em is null) then
    return false;
  end if;
  delete from auth.users u where u.id = p_pessoa;
  get diagnostics v_n = row_count;
  return v_n > 0;
end $$;

do $$
declare
  f regprocedure;
  papel text;
begin
  foreach f in array array['ponte_auth.email(uuid)', 'ponte_auth.aparelhos(uuid)',
                           'ponte_auth.encerrar_sessoes(uuid)', 'ponte_auth.apagar_entrada(uuid)']::regprocedure[] loop
    execute format('revoke all on function %s from public', f);
    foreach papel in array array['anon', 'authenticated', 'service_role'] loop
      if exists (select 1 from pg_roles where rolname = papel) then
        execute format('revoke all on function %s from %I', f, papel);
      end if;
    end loop;
    execute format('grant execute on function %s to dominio', f);
  end loop;
end
$$;

-- O que sobrou ao dominio no auth sai. Em produção só os dois primeiros existem; os outros dois
-- dão aviso ("no privileges could be revoked"), não erro.
revoke select (id, email) on auth.users from dominio;
revoke select, delete on auth.sessions from dominio;
revoke delete on auth.users from dominio;
revoke usage on schema auth from dominio;

-- As cinco funções passam a usar a ponte. Troca só o trecho do auth no corpo que está no banco,
-- conferindo que o trecho existe (o resto do corpo fica igual).
create function ponte_trocar(p_funcao regprocedure, p_de text, p_para text) returns void
language plpgsql
as $$
declare v_def text := pg_get_functiondef(p_funcao);
begin
  if position(p_de in v_def) = 0 then raise exception 'Trecho não encontrado em %: %', p_funcao, left(p_de, 80); end if;
  execute replace(v_def, p_de, p_para);
end $$;

select ponte_trocar('suporte_pessoas_do_contexto()',
  $t$'email', u.email,$t$, $t$'email', ponte_auth.email(p.id),$t$);
select ponte_trocar('suporte_pessoas_do_contexto()',
  E'\n    left join auth.users u on u.id = p.id', '');

select ponte_trocar('console_suporte_pessoa(uuid, uuid)',
  $t$'aparelhos', (select count(*) from auth.sessions s where s.user_id = p_alvo and (s.not_after is null or s.not_after > now())))$t$,
  $t$'aparelhos', ponte_auth.aparelhos(p_alvo))$t$);

-- Encerra antes de registrar para o histórico levar o número; é a mesma transação, então um
-- motivo inválido ou sem permissão desfaz o encerramento (teste 015).
select ponte_trocar('console_suporte_desconectar(uuid, uuid, text, boolean)',
  'select count(*) into v_n from auth.sessions s where s.user_id = p_alvo;',
  'v_n := ponte_auth.encerrar_sessoes(p_alvo);');
select ponte_trocar('console_suporte_desconectar(uuid, uuid, text, boolean)',
  E'\n  delete from auth.sessions s where s.user_id = p_alvo;', '');

select ponte_trocar('financeiro_envio_preparar_sem_pasta(uuid, uuid, uuid)',
  $t$'responderPara', (select u.email from auth.users u where u.id = p_pessoa))$t$,
  $t$'responderPara', ponte_auth.email(p_pessoa))$t$);

select ponte_trocar('aplicar_prazos()',
  'delete from auth.users where id = r.id;',
  'perform ponte_auth.apagar_entrada(r.id);');

drop function ponte_trocar(regprocedure, text, text);

call fechar_acesso();
