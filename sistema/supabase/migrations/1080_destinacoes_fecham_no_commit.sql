-- A conferência da divisão do levantamento no commit pela API (F3.163; FI-05).
-- Plano e revisão: project-files t3jus/f3-163/plano.md e revisao.md.
--
-- destinacoes_fecham (0280) confere no fim da transação que a soma das partes fecha com o valor
-- levantado. No Postgres 17 o gatilho adiado roda com o papel ativo no commit, que, pela API, é o
-- service_role, sem privilégio nas tabelas (fechar_acesso, 0002). Sem security definer, a
-- conferência caía em "permission denied for table levantamentos" e desfazia o registro inteiro:
-- registrar o alvará, a RPV, o precatório ou o acordo, marcar a parte como feita e dispensá-la
-- falhavam sempre pelo Portal. Rodar com o papel que enfileirou o evento só vem no Postgres 18.
-- Agora ela é security definer, dona dominio, como caso_pronto_fim (0990) e caso_fechou_fim (1020).
-- O fechar_acesso dá execute nela ao service_role; é inofensivo, porque função de gatilho não se
-- chama fora de gatilho.
--
-- Como dominio, ela lê com o RLS forçado, no contexto do escritório da transação. Fora desse
-- contexto ela não enxergaria o levantamento e deixaria passar calada uma divisão que não fecha
-- (antes, quem gravava como postgres, numa migration ou no SQL Editor, conferia ignorando o RLS).
-- Por isso ela recusa quando o contexto não é o escritório da linha ou quando não acha o
-- levantamento: nunca trata "não vi" como "fechou". O levantamento não se apaga (guardião) e a
-- chave estrangeira garante que ele existe, então não achar só acontece pelo RLS.
--
-- A regra não muda: o mesmo TC422 / DIVISAO_NAO_FECHA com o falta. Regra para as próximas: todo
-- gatilho adiável do public é security definer (pgTAP 140).

create or replace function destinacoes_fecham() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lev uuid := coalesce(new.levantamento_id, old.levantamento_id);
  v_esc uuid := coalesce(new.escritorio_id, old.escritorio_id);
  v_valor bigint;
  v_soma bigint;
begin
  if contexto_escritorio() is distinct from v_esc then
    raise exception 'A conferência da divisão precisa do contexto do escritório do levantamento %', v_lev;
  end if;
  select valor into v_valor from levantamentos where id = v_lev;
  if v_valor is null then
    raise exception 'A conferência da divisão não enxerga o levantamento %', v_lev;
  end if;
  select coalesce(sum(valor), 0) into v_soma from destinacoes where levantamento_id = v_lev;
  if v_soma <> v_valor then
    raise exception 'A divisão não fecha com o valor levantado' using errcode = 'TC422',
      detail = jsonb_build_object('motivo', 'DIVISAO_NAO_FECHA', 'campos', jsonb_build_array('divisao'), 'falta', v_valor - v_soma)::text;
  end if;
  return null;
end $$;

call fechar_acesso();
