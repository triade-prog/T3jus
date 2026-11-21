-- 0555 · RPV e precatório a caminho em Repasses, no Caixa e nos Relatórios (F3.48, F3.72; FI-09,
-- IN-05). Desenho aprovado em docs/design/aprovadas/portal-comercial-financeiro-pendencias
-- (estados rv-caminho, rv-caixa e re-visao; decisão 6 da Carol, 21/11/2026).
-- - Repasses: a folha "A caminho" e o número do alto.
-- - Caixa: a parte do escritório entra nas entradas previstas do mês estimado (e no saldo previsto)
--   e vem também à parte, para a barra âmbar. A que passou da data estimada sai da previsão e vem
--   numa lista à parte, até alguém mudar a data.
-- - Relatórios: o "Falta receber · à parte" ganha o grupo "A caminho, com data estimada".

-- As que contam na previsão: a caminho, do mês corrente em diante.
create function a_caminho_no_mes(p_escritorio uuid, p_mes date) returns bigint
language sql stable
set search_path = public
as $$
  select coalesce(sum(parte_escritorio), 0)::bigint from requisicoes_a_caminho
   where escritorio_id = p_escritorio and situacao = 'A_CAMINHO' and estimada_mes = p_mes
     and estimada_mes >= date_trunc('month', hoje_brasilia())::date
$$;

create function a_caminho_json(p_escritorio uuid) returns jsonb
language sql stable
set search_path = public
as $$
  with r as (select * from requisicoes_a_caminho where escritorio_id = p_escritorio and situacao = 'A_CAMINHO'),
  p as (select (date_trunc('month', hoje_brasilia()))::date mes)
  select jsonb_build_object(
    'total', (select coalesce(sum(parte_escritorio), 0) from r),
    'n', (select count(*) from r),
    'naPrevisao', (select coalesce(sum(parte_escritorio), 0) from r, p where r.estimada_mes >= p.mes),
    'passou', (select jsonb_build_object('valor', coalesce(sum(parte_escritorio), 0), 'n', count(*)) from r, p where r.estimada_mes < p.mes),
    'itens', coalesce((select jsonb_agg(requisicao_linha(x) order by x.estimada_mes, x.criado_em) from r x), '[]'::jsonb))
$$;

-- Repasses: a folha "A caminho".
alter function portal_financeiro_repasses(uuid, uuid) rename to financeiro_repasses_com_atraso;
create function portal_financeiro_repasses(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v jsonb := financeiro_repasses_com_atraso(p_pessoa, p_escritorio);
begin
  return v || jsonb_build_object('aCaminho', a_caminho_json(p_escritorio));
end $$;

-- Caixa: a parte a caminho nas entradas previstas, no saldo previsto e à parte.
alter function portal_financeiro_caixa(uuid, uuid) rename to financeiro_caixa_base;
create function portal_financeiro_caixa(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb := financeiro_caixa_base(p_pessoa, p_escritorio);
  v_mes date := (v ->> 'mes')::date;
  v_meses jsonb := '[]'::jsonb;
  v_soma bigint := 0;
  v_rpv bigint;
  m jsonb;
begin
  for m in select * from jsonb_array_elements(v -> 'meses') loop
    if (m ->> 'mes')::date >= v_mes then
      v_rpv := a_caminho_no_mes(p_escritorio, (m ->> 'mes')::date);
      v_soma := v_soma + v_rpv;
      m := m || jsonb_build_object('aCaminho', v_rpv, 'entradasPrevistas', (m ->> 'entradasPrevistas')::bigint + v_rpv);
      -- O saldo de hoje é o real; dos meses seguintes, a previsão soma o que já veio de RPV.
      if (m ->> 'mes')::date > v_mes then m := m || jsonb_build_object('saldo', (m ->> 'saldo')::bigint + v_soma); end if;
    else
      m := m || jsonb_build_object('aCaminho', 0);
    end if;
    v_meses := v_meses || m;
  end loop;
  return v || jsonb_build_object(
    'meses', v_meses,
    'fechaMes', (v ->> 'fechaMes')::bigint + a_caminho_no_mes(p_escritorio, v_mes),
    'aCaminho', a_caminho_json(p_escritorio));
end $$;

-- Relatórios: o "Falta receber · à parte" ganha o grupo a caminho.
alter function portal_relatorio_resumo(uuid, uuid, text, text, text) rename to relatorio_resumo_base;
create function portal_relatorio_resumo(p_pessoa uuid, p_escritorio uuid, p_de text default null, p_ate text default null,
                                        p_comparar text default null) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb := relatorio_resumo_base(p_pessoa, p_escritorio, p_de, p_ate, p_comparar);
  c jsonb := a_caminho_json(p_escritorio);
begin
  return jsonb_set(v, '{falta,aparte,caminho}', jsonb_build_object(
    'valor', c -> 'total',
    'lista', coalesce((select jsonb_agg(jsonb_build_object('id', x ->> 'id', 'tipo', x ->> 'tipo', 'valor', (x ->> 'parteEscritorio')::bigint,
                                                           'estimadaMes', x ->> 'estimadaMes', 'passou', (x ->> 'passou')::boolean,
                                                           'cliente', x -> 'cliente' ->> 'nome', 'caso', x -> 'caso' ->> 'nome'))
                       from jsonb_array_elements(c -> 'itens') x), '[]'::jsonb)));
end $$;

call fechar_acesso();
