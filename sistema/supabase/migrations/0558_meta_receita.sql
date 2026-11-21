-- 0558 · A meta de receita do mês (F3.49; IN-09). Desenho aprovado em
-- docs/design/aprovadas/portal-comercial-financeiro-pendencias (estados mt-resumo, mt-definir,
-- mt-um-mes, mt-equipe, mt-sem-meta e mt-erros; decisões 10 e 11 da Carol, 21/11/2026).
-- - A meta é de receita do escritório, a mesma conta do "realizado" do Resumo.
-- - Vale "todo mês, a partir deste" ou "só em um mês". A de um mês só vence a de todo mês naquele mês.
-- - Meses fechados não mudam: a meta nova vale do mês corrente em diante; os meses passados
--   continuam comparados com a que valia. Cada versão fica (só se acrescenta; a trocada é marcada).
-- - Só a sócia dona define. Quem tem o Financeiro vê.

create table metas_receita (
  id              uuid primary key default gen_random_uuid(),
  escritorio_id   uuid not null references escritorios (id) on delete restrict,
  valor           bigint not null check (valor between 1 and 10000000000),
  de_mes          date not null check (extract(day from de_mes) = 1),
  so_mes          boolean not null default false,
  criado_por      uuid not null references pessoas (id) on delete restrict,
  criado_em       timestamptz not null default app_now(),
  substituida_em  timestamptz
);
create index metas_receita_escritorio on metas_receita (escritorio_id, de_mes desc);
create unique index metas_receita_vale on metas_receita (escritorio_id, de_mes, so_mes) where substituida_em is null;
call proteger_tabela_escritorio('metas_receita');

create function metas_receita_guardiao() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' or old.substituida_em is not null
     or (to_jsonb(new) - 'substituida_em') is distinct from (to_jsonb(old) - 'substituida_em') then
    raise exception 'A meta não muda nem se apaga: defina uma nova' using errcode = 'TC023';
  end if;
  return new;
end $$;
create trigger metas_receita_guardiao before update or delete on metas_receita
  for each row execute function metas_receita_guardiao();

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('metas_receita', true, 'A meta de receita do escritório por mês, com cada versão e quem definiu',
  'Comparar o que entrou com a meta (IN-09)', 'Execução de contrato (LGPD, art. 7º, V)',
  'Escritório', 'Enquanto o escritório for cliente do T3jus e 5 anos depois do fim do contrato', 'Exportadas ao escritório e apagadas com ele', 'APROVADO', true);

-- A meta que vale num mês: a "só deste mês", se houver; senão, a de todo mês mais recente até ele.
create function meta_do_mes(p_escritorio uuid, p_mes date) returns metas_receita
language sql stable
set search_path = public
as $$
  select * from metas_receita
   where escritorio_id = p_escritorio and substituida_em is null
     and ((so_mes and de_mes = p_mes) or (not so_mes and de_mes <= p_mes))
   order by so_mes desc, de_mes desc, criado_em desc
   limit 1
$$;

create function meta_json(m metas_receita) returns jsonb
language sql stable
set search_path = public
as $$
  select case when m.id is null then null else jsonb_build_object(
    'valor', m.valor, 'deMes', m.de_mes, 'soMes', m.so_mes, 'por', pessoa_ref(m.criado_por), 'em', m.criado_em) end
$$;

-- O que a tela da meta mostra: a deste mês, a de todo mês e as "só de um mês" daqui em diante.
create function metas_json(p_escritorio uuid) returns jsonb
language sql stable
set search_path = public
as $$
  with h as (select date_trunc('month', hoje_brasilia())::date mes)
  select jsonb_build_object(
    'mes', meta_json(meta_do_mes(p_escritorio, h.mes)),
    'todoMes', meta_json((select x from metas_receita x where x.escritorio_id = p_escritorio and x.substituida_em is null and not x.so_mes
                            and x.de_mes <= h.mes order by x.de_mes desc, x.criado_em desc limit 1)),
    'antes', meta_json((select x from metas_receita x where x.escritorio_id = p_escritorio and x.substituida_em is null and not x.so_mes
                          and x.de_mes < h.mes order by x.de_mes desc, x.criado_em desc limit 1)),
    'umMes', coalesce((select jsonb_agg(meta_json(x) order by x.de_mes) from metas_receita x
                        where x.escritorio_id = p_escritorio and x.substituida_em is null and x.so_mes and x.de_mes >= h.mes), '[]'::jsonb))
  from h
$$;

-- Definir a meta: valor e de quando vale (todo mês, a partir de um mês; ou só em um mês).
create function portal_financeiro_meta(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e text[] := '{}';
  v_valor bigint := json_inteiro(p_dados, 'valor');
  v_mes date := json_data(p_dados, 'mes');
  v_so boolean := coalesce((p_dados ->> 'soMes')::boolean, false);
  v_atual date := date_trunc('month', hoje_brasilia())::date;
  v_antes metas_receita;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.ver');
  if not e_socio_dono(p_pessoa, p_escritorio) then
    raise exception 'Só a sócia dona define a meta' using errcode = 'TC401',
      detail = jsonb_build_object('motivo', 'SO_SOCIO_DONO')::text;
  end if;
  if v_valor is null or v_valor not between 1 and 10000000000 then e := e || 'valor'::text; end if;
  if v_mes is null or extract(day from v_mes) <> 1 or v_mes < v_atual or v_mes > (v_atual + interval '24 months')::date then e := e || 'mes'::text; end if;
  if cardinality(e) > 0 then perform recusar_campos('Confira a meta', variadic e); end if;

  v_antes := meta_do_mes(p_escritorio, v_mes);
  update metas_receita set substituida_em = app_now()
   where escritorio_id = p_escritorio and substituida_em is null and de_mes = v_mes and so_mes = v_so;
  -- A de todo mês nova vence as de todo mês que começariam depois dela.
  if not v_so then
    update metas_receita set substituida_em = app_now()
     where escritorio_id = p_escritorio and substituida_em is null and not so_mes and de_mes > v_mes;
  end if;
  insert into metas_receita (escritorio_id, valor, de_mes, so_mes, criado_por) values (p_escritorio, v_valor, v_mes, v_so, p_pessoa);
  perform registrar_historico('financeiro.meta', 'escritorios', p_escritorio::text, jsonb_strip_nulls(jsonb_build_object(
    'valor', v_valor, 'mes', v_mes, 'soMes', v_so, 'de', v_antes.valor)));
  return metas_json(p_escritorio);
end $$;

-- O Resumo ganha a meta do mês, a de cada mês da comparação, a média dos 3 meses e quem define.
alter function portal_financeiro_resumo(uuid, uuid) rename to financeiro_resumo_sem_meta;
create function portal_financeiro_resumo(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb := financeiro_resumo_sem_meta(p_pessoa, p_escritorio);
  v_meses jsonb := '[]'::jsonb;
  m jsonb;
begin
  for m in select * from jsonb_array_elements(coalesce(v -> 'meses', '[]'::jsonb)) loop
    v_meses := v_meses || (m || jsonb_build_object('meta', (meta_do_mes(p_escritorio, (m ->> 'mes')::date)).valor));
  end loop;
  return v || jsonb_build_object(
    'meses', v_meses,
    'meta', metas_json(p_escritorio) || jsonb_build_object(
      'dono', e_socio_dono(p_pessoa, p_escritorio),
      'socioDono', (select pessoa_ref(x.pessoa_id) from vinculos x where x.escritorio_id = p_escritorio and x.funcao = 'SOCIO' and x.revogado_em is null limit 1),
      'media3', (select coalesce(round(avg((y ->> 'realizado')::bigint)), 0)::bigint from (
                   select y from jsonb_array_elements(coalesce(v -> 'meses', '[]'::jsonb)) y
                    where (y ->> 'mes')::date < date_trunc('month', hoje_brasilia())::date
                    order by (y ->> 'mes')::date desc limit 3) z)));
end $$;

-- Os Ajustes do financeiro mostram a meta, só para ler (muda no Resumo).
alter function portal_financeiro_ajustes(uuid, uuid) rename to financeiro_ajustes_sem_meta;
create function portal_financeiro_ajustes(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return financeiro_ajustes_sem_meta(p_pessoa, p_escritorio) || jsonb_build_object('meta', metas_json(p_escritorio));
end $$;

call fechar_acesso();
