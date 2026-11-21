-- 0622 · "Tirar a meta" (F3.90; IN-09). Desenho aprovado em
-- docs/design/aprovadas/portal-comercial-financeiro-pendencias (estado mt-definir: o botão "Tirar a
-- meta" na janela da meta; mt-erros: "Para ficar sem meta, use Tirar a meta"; mt-sem-meta).
-- - Tirar a meta volta a não ter meta a partir de um mês (o atual ou um mês à frente), em todo
--   mês dali em diante. As metas "só de um mês" desse mês em diante também saem.
-- - Os meses fechados não mudam: continuam comparados com a meta que valia neles (decisão 10).
-- - Nada se apaga. Tirar grava uma versão "sem meta" e marca as trocadas, como mudar a meta.
-- - Só a sócia dona tira, como só ela define (decisão 11).

alter table metas_receita add column tirada boolean not null default false;
alter table metas_receita drop constraint metas_receita_valor_check;
alter table metas_receita add constraint metas_receita_valor_check
  check ((tirada and valor = 0 and not so_mes) or (not tirada and valor between 1 and 10000000000));

-- A meta que vale num mês: a "só deste mês", se houver; senão, a de todo mês mais recente até ele.
-- Se essa for a versão "sem meta", o mês não tem meta.
create or replace function meta_do_mes(p_escritorio uuid, p_mes date) returns metas_receita
language sql stable
set search_path = public
as $$
  select * from (
    select * from metas_receita
     where escritorio_id = p_escritorio and substituida_em is null
       and ((so_mes and de_mes = p_mes) or (not so_mes and de_mes <= p_mes))
     order by so_mes desc, de_mes desc, criado_em desc
     limit 1) m
   where not m.tirada
$$;

create or replace function meta_json(m metas_receita) returns jsonb
language sql stable
set search_path = public
as $$
  select case when m.id is null or m.tirada then null else jsonb_build_object(
    'valor', m.valor, 'deMes', m.de_mes, 'soMes', m.so_mes, 'por', pessoa_ref(m.criado_por), 'em', m.criado_em) end
$$;

-- Tirar a meta a partir de um mês.
create function portal_financeiro_meta_tirar(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mes date := json_data(p_dados, 'mes');
  v_atual date := date_trunc('month', hoje_brasilia())::date;
  v_antes metas_receita;
  v_umes integer;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.ver');
  if not e_socio_dono(p_pessoa, p_escritorio) then
    raise exception 'Só a sócia dona tira a meta' using errcode = 'TC401',
      detail = jsonb_build_object('motivo', 'SO_SOCIO_DONO')::text;
  end if;
  if v_mes is null or extract(day from v_mes) <> 1 or v_mes < v_atual or v_mes > (v_atual + interval '24 months')::date then
    perform recusar_campos('Confira o mês', 'mes');
  end if;
  v_antes := meta_do_mes(p_escritorio, v_mes);
  if v_antes.id is null and not exists (select 1 from metas_receita where escritorio_id = p_escritorio and substituida_em is null
                                          and not tirada and de_mes >= v_mes) then
    perform recusar_motivo('O escritório não tem meta a partir deste mês.', 'SEM_META');
  end if;
  select count(*) into v_umes from metas_receita
   where escritorio_id = p_escritorio and substituida_em is null and so_mes and de_mes >= v_mes;
  -- Saem: as de todo mês que começam neste mês ou depois, e as "só de um mês" deste mês em diante.
  update metas_receita set substituida_em = app_now()
   where escritorio_id = p_escritorio and substituida_em is null and de_mes >= v_mes;
  insert into metas_receita (escritorio_id, valor, de_mes, so_mes, tirada, criado_por) values (p_escritorio, 0, v_mes, false, true, p_pessoa);
  perform registrar_historico('financeiro.meta_tirada', 'escritorios', p_escritorio::text, jsonb_strip_nulls(jsonb_build_object(
    'mes', v_mes, 'de', v_antes.valor, 'umMes', nullif(v_umes, 0))));
  return metas_json(p_escritorio);
end $$;

call fechar_acesso();
