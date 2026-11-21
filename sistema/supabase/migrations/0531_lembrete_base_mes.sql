-- 0531 · Lembrete diário para pedir a base do mês do percentual recorrente (CH-06, F3.13).
-- Desenho aprovado em docs/design/aprovadas/portal-comercial-contratos ("Tarefa diária:
-- lembrete da base no dia marcado"; decisão 18: quem recebe é o escolhido na condição ou o
-- responsável pelo contrato). O lembrete chega no sino aprovado (0390) e a base continua a ser
-- informada em Contratos › Honorários. O pedido ao cliente pelo WhatsApp fica para depois (F3.13
-- continua pendente nessa parte).
-- - Roda todo dia às 7h de Brasília. Cada cobrança sem base gera um aviso só uma vez, no dia de
--   pedir (ou no primeiro dia em que a rotina rodar depois dele).
-- - Se quem foi escolhido saiu da equipe, o aviso vai ao responsável pelo contrato.

-- O sino passa a aceitar o aviso da base. A lista é a que já existe mais a nova, para não tirar
-- nada que outra migration tenha posto.
do $$
declare
  v_tipos text[];
  v_origens text[];
begin
  select array_agg(distinct x) into v_tipos from (
    select unnest(regexp_matches(pg_get_constraintdef(oid), '''([A-Z0-9_]+)''', 'g')) x
      from pg_constraint where conrelid = 'avisos_sino'::regclass and conname = 'avisos_sino_tipo_check'
    union select 'BASE_DO_MES') t;
  select array_agg(distinct x) into v_origens from (
    select unnest(regexp_matches(pg_get_constraintdef(oid), '''([a-z0-9_]+)''', 'g')) x
      from pg_constraint where conrelid = 'avisos_sino'::regclass and conname = 'avisos_sino_origem_tabela_check'
    union select 'contratos') t;
  alter table avisos_sino drop constraint avisos_sino_tipo_check;
  execute format('alter table avisos_sino add constraint avisos_sino_tipo_check check (tipo in (%s))',
                 (select string_agg(quote_literal(x), ', ' order by x) from unnest(v_tipos) x));
  alter table avisos_sino drop constraint avisos_sino_origem_tabela_check;
  execute format('alter table avisos_sino add constraint avisos_sino_origem_tabela_check check (origem_tabela in (%s))',
                 (select string_agg(quote_literal(x), ', ' order by x) from unnest(v_origens) x));
end $$;

create index avisos_sino_base_mes on avisos_sino ((dados ->> 'recebimento')) where tipo = 'BASE_DO_MES';

-- Quem recebe o lembrete de uma cobrança: o escolhido na condição, se ainda é da equipe; se não,
-- o responsável pelo contrato.
create function base_mes_quem_lembra(p_escritorio uuid, p_contrato uuid) returns uuid
language sql stable
set search_path = public
as $$
  select coalesce(
    (select q.id from honorario_condicoes h
       cross join lateral (select nullif(h.params ->> 'quemLembrete', '')::uuid id) q
      where h.dono_tipo = 'CONTRATO' and h.dono_id = p_contrato and h.tipo = 'RECORRENTE'
        and q.id is not null and pessoa_do_escritorio(q.id, p_escritorio)
      limit 1),
    (select c.responsavel_id from contratos c where c.id = p_contrato))
$$;

-- A rotina vê a lista de escritórios só enquanto roda; depois cada escritório entra pelo contexto.
create policy rotina_bases_ler on escritorios for select
  using (current_setting('t3jus.lembrando_bases', true) = 'on');

-- A rotina: um aviso no sino para cada base a pedir que ainda não foi lembrada. Devolve quantos.
create function lembrar_bases_do_mes() returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n integer := 0;
  v_esc uuid;
  v_lista uuid[];
  r record;
begin
  perform limpar_contexto();
  perform set_config('t3jus.lembrando_bases', 'on', true);
  select coalesce(array_agg(id order by id), '{}') into v_lista from escritorios;
  perform set_config('t3jus.lembrando_bases', 'off', true);
  foreach v_esc in array v_lista loop
    perform entrar_escritorio_servico(v_esc);
    for r in
      select b.recebimento_id, b.contrato_id, b.vencimento, b.mes, b.de, c.numero, k.nome cliente,
             h.params ->> 'sobre' sobre, (h.params ->> 'percentual')::integer percentual
        from contrato_bases_pendentes(v_esc) b
        join contratos c on c.id = b.contrato_id
        join clientes_escritorio k on k.id = c.cliente_id
        join honorario_condicoes h on h.dono_tipo = 'CONTRATO' and h.dono_id = c.id and h.tipo = 'RECORRENTE'
       where not exists (select 1 from avisos_sino a where a.tipo = 'BASE_DO_MES' and a.escritorio_id = v_esc
                           and a.dados ->> 'recebimento' = b.recebimento_id::text)
    loop
      perform aviso_sino(v_esc, base_mes_quem_lembra(v_esc, r.contrato_id), null, 'BASE_DO_MES', 'contratos', r.contrato_id,
        jsonb_build_object('recebimento', r.recebimento_id, 'contrato', r.numero, 'cliente', r.cliente, 'sobre', r.sobre,
                           'percentual', r.percentual, 'vencimento', r.vencimento, 'mes', r.mes, 'de', r.de));
      v_n := v_n + 1;
    end loop;
  end loop;
  perform limpar_contexto();
  return v_n;
end $$;

-- Todo dia às 7h de Brasília (10h UTC), onde o pg_cron existe (no Supabase existe; no banco de
-- teste, não).
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('t3jus-bases-do-mes', '0 10 * * *', 'select public.lembrar_bases_do_mes()');
  end if;
end $$;

call fechar_acesso();
