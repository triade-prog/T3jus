-- 0941 · Empréstimos no saldo, no Caixa, nos Ajustes e no arquivo do contador (F3.51; FI-20). Aplica-se
-- junto com a 0940: o saldo do Caixa e o dos Ajustes mudam juntos (S-N2). Desenho aprovado em
-- docs/design/aprovadas/portal-financeiro-emprestimos (PLANO.md, versão 3, §1.5, §1.6 e §2.2).
-- - O saldo soma os empréstimos que entram no caixa; o saldo de abertura absorve os que entraram até a
--   data dela. As parcelas pagas já saem por caixa_saidas e as que vencem, por saidas_previstas.
-- - No Caixa, a coluna Empréstimos de cada mês tira as parcelas das saídas do dia a dia, sem mudar o
--   saldo: entrou − parcelas é o líquido. A folha "Empréstimos · à parte" traz os ativos.
-- - Para o contador, as parcelas saem das despesas e vão, com os empréstimos recebidos e a situação de
--   cada um no último dia do mês, para a aba Empréstimos. O Resumo do financeiro não muda.

-- ---------------------------------------------------------------------------------------
-- O saldo com os empréstimos (0556). Com saldo de abertura, ela fica no lugar do que os lançamentos e
-- os empréstimos somavam até a data dela, pelo mesmo predicado (emprestimo_conta_no_caixa).

create or replace function ajuste_abertura(p_escritorio uuid, p_dia date) returns bigint
language sql stable
set search_path = public
as $$
  select coalesce((select a.valor - (caixa_entradas(p_escritorio, '-infinity', a.data) - caixa_saidas(p_escritorio, '-infinity', a.data)
                                     + emprestimos_entrou(p_escritorio, '-infinity', a.data))
                     from saldos_abertura a
                    where a.escritorio_id = p_escritorio and a.substituido_em is null and p_dia >= a.data), 0)::bigint
$$;

create or replace function saldo_escritorio_em(p_escritorio uuid, p_dia date) returns bigint
language sql stable
set search_path = public
as $$
  select (caixa_entradas(p_escritorio, '-infinity', p_dia) - caixa_saidas(p_escritorio, '-infinity', p_dia)
          + emprestimos_entrou(p_escritorio, '-infinity', p_dia) + ajuste_abertura(p_escritorio, p_dia))::bigint
$$;

-- ---------------------------------------------------------------------------------------
-- Caixa (0557): o saldo e o fecha-mês com os empréstimos, a coluna Empréstimos de cada mês, os meses
-- que se podem exportar desde o primeiro empréstimo e a folha à parte.
alter function portal_financeiro_caixa(uuid, uuid) rename to financeiro_caixa_sem_emprestimo;
revoke all on function financeiro_caixa_sem_emprestimo(uuid, uuid) from public, anon, authenticated;

create function portal_financeiro_caixa(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb := financeiro_caixa_sem_emprestimo(p_pessoa, p_escritorio);
  v_hoje date := (v ->> 'hoje')::date;
  v_mes date := (v ->> 'mes')::date;
  v_ate_hoje bigint := emprestimos_entrou(p_escritorio, '-infinity', v_hoje);
  v_meses jsonb := '[]'::jsonb;
  m jsonb;
  v_m date;
  v_fm date;
  v_entrou bigint;
  v_pp bigint;
  v_pr bigint;
  v_menor date;
  v_inicio date;
  v_desde date;
  v_lista jsonb;
begin
  for m in select * from jsonb_array_elements(v -> 'meses') loop
    v_m := (m ->> 'mes')::date;
    v_fm := (v_m + interval '1 month')::date - 1;
    -- Passado: previsto por vencimento, pagas ou não; realizado por dia do pagamento. Corrente: o que já
    -- saiu mais o que falta vencer. Futuro: só o que falta (§1.5, B2).
    if v_m < v_mes then
      v_entrou := emprestimos_entrou(p_escritorio, v_m, v_fm);
      v_pr := emprestimo_parcelas_pagas(p_escritorio, v_m, v_fm);
      v_pp := emprestimo_parcelas_previstas(p_escritorio, v_m, false);
    elsif v_m = v_mes then
      v_entrou := emprestimos_entrou(p_escritorio, v_m, v_hoje);
      v_pr := emprestimo_parcelas_pagas(p_escritorio, v_m, v_hoje);
      v_pp := v_pr + emprestimo_parcelas_previstas(p_escritorio, v_m, true);
    else
      v_entrou := 0;
      v_pr := null;
      v_pp := emprestimo_parcelas_previstas(p_escritorio, v_m, true);
    end if;
    m := m || jsonb_build_object(
      'saidasPrevistas', (m ->> 'saidasPrevistas')::bigint - v_pp,
      'saidasRealizadas', case when m ->> 'saidasRealizadas' is not null then (m ->> 'saidasRealizadas')::bigint - v_pr end,
      'saldo', (m ->> 'saldo')::bigint + emprestimos_entrou(p_escritorio, '-infinity', least(v_fm, v_hoje)),
      'emprestimos', jsonb_build_object('entrou', v_entrou, 'parcelasPrevistas', v_pp, 'parcelasRealizadas', v_pr,
                                        'liquidoPrevisto', v_entrou - v_pp,
                                        'liquidoRealizado', case when v_pr is not null then v_entrou - v_pr end));
    v_meses := v_meses || m;
  end loop;

  -- Os meses que se podem exportar, também desde o primeiro empréstimo que entra no caixa: do mês
  -- corrente para trás, no máximo 13 (C8, S-N4).
  select min(e.recebido_em) into v_menor from emprestimos e where e.escritorio_id = p_escritorio and emprestimo_conta_no_caixa(e);
  select min(x::date) into v_inicio from jsonb_array_elements_text(v -> 'mesesExportar') x;
  if v_menor is not null then
    v_inicio := least(coalesce(v_inicio, v_mes), greatest(date_trunc('month', v_menor)::date, (v_mes - interval '12 months')::date));
  end if;

  -- O líquido dos empréstimos que está no saldo de hoje: o que entrou menos o que foi pago, depois do
  -- saldo de abertura, quando houver (antes dele, já está na abertura).
  v_desde := coalesce((select a.data + 1 from saldos_abertura a where a.escritorio_id = p_escritorio and a.substituido_em is null), '-infinity'::date);
  select coalesce(jsonb_agg(emprestimo_linha(e) order by e.criado_em desc, e.id), '[]'::jsonb) into v_lista
    from emprestimos e
   where e.escritorio_id = p_escritorio and e.cancelado_em is null and e.encerrado_em is null
     and emprestimo_situacao_em(e, v_hoje) ->> 'situacao' = 'ATIVO';

  return v || jsonb_build_object(
    'saldo', (v ->> 'saldo')::bigint + v_ate_hoje,
    'fechaMes', (v ->> 'fechaMes')::bigint + v_ate_hoje,
    'meses', v_meses,
    'mesesExportar', coalesce((select jsonb_agg(g::date order by g desc) from generate_series(coalesce(v_inicio, v_mes), v_mes, interval '1 month') g), '[]'::jsonb),
    'emprestimos', jsonb_build_object(
      'algum', exists (select 1 from emprestimos e where e.escritorio_id = p_escritorio and e.cancelado_em is null),
      'n', jsonb_array_length(v_lista),
      'faltaPagar', coalesce((select sum((x -> 'situacao' ->> 'faltaPagar')::bigint) from jsonb_array_elements(v_lista) x), 0),
      'noSaldo', emprestimos_entrou(p_escritorio, v_desde, v_hoje) - emprestimo_parcelas_pagas(p_escritorio, v_desde, v_hoje),
      'comecoCaixa', emprestimo_comeco_caixa(p_escritorio),
      'primeiroLancamento', emprestimo_primeiro_lancamento(p_escritorio),
      'lista', v_lista));
end $$;

-- ---------------------------------------------------------------------------------------
-- Ajustes (0558): o primeiro lançamento leva em conta o primeiro empréstimo que entra no caixa (C8). O
-- saldo de hoje já vem com os empréstimos, por saldo_escritorio_em.
alter function portal_financeiro_ajustes(uuid, uuid) rename to financeiro_ajustes_sem_emprestimo;
revoke all on function financeiro_ajustes_sem_emprestimo(uuid, uuid) from public, anon, authenticated;

create function portal_financeiro_ajustes(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb := financeiro_ajustes_sem_emprestimo(p_pessoa, p_escritorio);
begin
  return v || jsonb_build_object('primeiroLancamento', least(
    (v ->> 'primeiroLancamento')::date,
    (select min(e.recebido_em) from emprestimos e where e.escritorio_id = p_escritorio and emprestimo_conta_no_caixa(e))));
end $$;

-- ---------------------------------------------------------------------------------------
-- O contador. As linhas de cada parte da aba Empréstimos, para o mês de p_mes a p_fm.

-- Recebidos no mês: só os que entram no caixa.
create function contador_emprestimos_recebidos(p_escritorio uuid, p_mes date, p_fm date) returns jsonb
language sql stable
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'dia', e.recebido_em, 'credorTipo', e.credor_tipo, 'credor', e.credor_nome, 'finalidade', e.finalidade,
           'forma', e.forma, 'valor', e.valor, 'valorContrato', e.valor_contrato) order by e.recebido_em, e.criado_em), '[]'::jsonb)
    from emprestimos e
   where e.escritorio_id = p_escritorio and e.recebido_em between p_mes and p_fm and emprestimo_conta_no_caixa(e)
$$;

-- Parcelas e devoluções pagas no mês, com o comprovante anexado ou não (S6).
create function contador_emprestimo_parcelas(p_escritorio uuid, p_mes date, p_fm date) returns jsonb
language sql stable
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'pagoEm', c.paga_em, 'vencimento', c.vencimento, 'credorTipo', e.credor_tipo, 'credor', e.credor_nome,
           'parcela', c.emprestimo_parcela, 'total', e.parcelas_total, 'devolucao', c.emprestimo_parcela is null,
           'forma', c.forma, 'valor', c.valor_pago,
           'comprovante', exists (select 1 from anexos a where a.conta_id = c.id and a.situacao = 'PRONTO'))
           order by c.paga_em, e.credor_nome, c.emprestimo_parcela nulls last, c.criado_em), '[]'::jsonb)
    from contas_pagar c join emprestimos e on e.id = c.emprestimo_id
   where c.escritorio_id = p_escritorio and c.categoria = 'EMPRESTIMOS' and c.paga_em between p_mes and p_fm
$$;

-- A situação no último dia do mês (C4): cada empréstimo recebido até ele e não cancelado, que estava
-- ativo nesse dia, que teve pagamento no mês ou que foi encerrado no mês ou depois.
create function contador_emprestimos_situacao(p_escritorio uuid, p_mes date, p_fm date) returns jsonb
language sql stable
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'credorTipo', e.credor_tipo, 'credor', e.credor_nome, 'finalidade', e.finalidade, 'devolucao', e.devolucao,
           'recebidoEm', e.recebido_em, 'valor', e.valor, 'valorContrato', e.valor_contrato,
           'anteriorAoT3jus', emprestimo_fora_do_caixa(e) is not null, 'parcelasTotal', e.parcelas_total) || s.j
           order by e.recebido_em, e.criado_em), '[]'::jsonb)
    from emprestimos e
   cross join lateral (select emprestimo_situacao_em(e, p_fm) j) s
   where e.escritorio_id = p_escritorio and e.cancelado_em is null and e.recebido_em <= p_fm
     and (s.j ->> 'situacao' = 'ATIVO'
          or (e.encerrado_em is not null and dia_brasilia(e.encerrado_em) >= p_mes)
          or exists (select 1 from contas_pagar c where c.escritorio_id = p_escritorio and c.emprestimo_id = e.id
                        and c.paga_em between p_mes and p_fm))
$$;

-- Prévia da exportação (0650): as parcelas saem das despesas; a linha dos empréstimos diz quantos
-- entraram e quantos pagamentos houve, e quantos estão sem comprovante.
alter function portal_financeiro_exportacao_previa(uuid, uuid, text) rename to financeiro_exportacao_previa_sem_emprestimo;
revoke all on function financeiro_exportacao_previa_sem_emprestimo(uuid, uuid, text) from public, anon, authenticated;

create function portal_financeiro_exportacao_previa(p_pessoa uuid, p_escritorio uuid, p_mes text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb := financeiro_exportacao_previa_sem_emprestimo(p_pessoa, p_escritorio, p_mes);
  v_mes date := (v ->> 'mes')::date;
  v_fm date := (v_mes + interval '1 month')::date - 1;
  p jsonb;
begin
  select jsonb_build_object('n', count(*), 'valor', coalesce(sum(c.valor_pago), 0),
                            'devolucoes', count(*) filter (where c.emprestimo_parcela is null),
                            'semComprovante', count(*) filter (where not exists (select 1 from anexos a where a.conta_id = c.id and a.situacao = 'PRONTO')))
    into p
    from contas_pagar c where c.escritorio_id = p_escritorio and c.categoria = 'EMPRESTIMOS' and c.paga_em between v_mes and v_fm;
  return v || jsonb_build_object(
    'despesas', jsonb_build_object('n', (v -> 'despesas' ->> 'n')::bigint - (p ->> 'n')::bigint,
                                   'valor', (v -> 'despesas' ->> 'valor')::bigint - (p ->> 'valor')::bigint),
    'emprestimos', jsonb_build_object(
      'recebidos', (select jsonb_build_object('n', count(*), 'valor', coalesce(sum(e.valor), 0)) from emprestimos e
                     where e.escritorio_id = p_escritorio and e.recebido_em between v_mes and v_fm and emprestimo_conta_no_caixa(e)),
      'parcelas', p));
end $$;

-- Exportação (0650): as despesas sem as parcelas e a aba Empréstimos, com a situação no último dia do
-- mês exportado (ou hoje, no mês que ainda não fechou).
alter function portal_financeiro_exportar(uuid, uuid, jsonb) rename to financeiro_exportar_sem_emprestimo;
revoke all on function financeiro_exportar_sem_emprestimo(uuid, uuid, jsonb) from public, anon, authenticated;

create function portal_financeiro_exportar(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb := financeiro_exportar_sem_emprestimo(p_pessoa, p_escritorio, p_dados);
  v_mes date := (v ->> 'mes')::date;
  v_fm date := (v_mes + interval '1 month')::date - 1;
begin
  return v || jsonb_build_object(
    'despesas', coalesce((select jsonb_agg(x order by o) from jsonb_array_elements(v -> 'despesas') with ordinality t(x, o)
                           where x ->> 'categoria' <> 'EMPRESTIMOS'), '[]'::jsonb),
    'emprestimos', jsonb_build_object(
      'recebidos', contador_emprestimos_recebidos(p_escritorio, v_mes, v_fm),
      'parcelas', contador_emprestimo_parcelas(p_escritorio, v_mes, v_fm),
      'situacao', contador_emprestimos_situacao(p_escritorio, v_mes, least(v_fm, hoje_brasilia()))));
end $$;

-- Anexos da exportação (0520): a parcela de empréstimo não tem nota fiscal e sai de semNota. A falta do
-- comprovante aparece só na aba Empréstimos.
alter function portal_financeiro_exportacao_anexos(uuid, uuid, text) rename to financeiro_exportacao_anexos_sem_emprestimo;
revoke all on function financeiro_exportacao_anexos_sem_emprestimo(uuid, uuid, text) from public, anon, authenticated;

create function portal_financeiro_exportacao_anexos(p_pessoa uuid, p_escritorio uuid, p_mes text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb := financeiro_exportacao_anexos_sem_emprestimo(p_pessoa, p_escritorio, p_mes);
begin
  return v || jsonb_build_object('semNota', coalesce((
    select jsonb_agg(x order by o) from jsonb_array_elements(v -> 'semNota') with ordinality t(x, o)
     where not exists (select 1 from contas_pagar c where c.escritorio_id = p_escritorio and c.id = (x ->> 'id')::uuid
                          and c.categoria = 'EMPRESTIMOS')), '[]'::jsonb));
end $$;

call fechar_acesso();
