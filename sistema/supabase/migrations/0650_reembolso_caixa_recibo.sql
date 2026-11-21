-- 0650 · O reembolso pago junto com a parcela entra no caixa e no recibo (F3.95, FI-07).
-- Desenho aprovado em docs/design/aprovadas/portal-exito-conferir (decisão 11 e pergunta 4):
-- - os dois entram no caixa do escritório: a parcela é honorário; o reembolso devolve o que o
--   escritório adiantou. O saldo, as entradas do mês, o Resumo e a exportação para o contador
--   passam a contar o reembolso no dia em que ele entrou;
-- - o recibo da parcela mostra o reembolso como segunda linha da discriminação, e o total soma os
--   dois. O reembolso é só de inserção: o recibo o lê de reembolsos_recebidos, com o que valia no
--   registro (a cópia do recibo nasce antes do reembolso, na mesma transação, e não se reescreve).
-- A sugestão "o valor cobre a parcela e o reembolso; marcar?" é da tela; a caixa continua
-- desmarcada até alguém marcar (pergunta 4).

-- O que entrou no caixa do escritório entre dois dias: parcelas (com multa e juros), a parte do
-- escritório dos levantamentos, quando transferida, e os reembolsos pagos junto com a parcela.
create or replace function caixa_entradas(p_escritorio uuid, p_de date, p_ate date) returns bigint
language sql stable
set search_path = public
as $$
  select ((select coalesce(sum(p.valor + coalesce(p.multa_juros, 0)), 0) from pagamentos_recebidos p
            where p.escritorio_id = p_escritorio and p.caixa = 'ESCRITORIO' and p.recebido_em between p_de and p_ate)
        + (select coalesce(sum(d.valor), 0) from destinacoes d
            where d.escritorio_id = p_escritorio and destinacao_do_escritorio(d.para) and d.feito_em between p_de and p_ate)
        + (select coalesce(sum(x.valor), 0) from reembolsos_recebidos x
            where x.escritorio_id = p_escritorio and x.recebido_em between p_de and p_ate))::bigint
$$;

-- Os reembolsos pagos junto com um recebimento, como vão no recibo e na exportação.
create function recibo_reembolsos(p_pagamento uuid) returns jsonb
language sql stable
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'descricao', cp.descricao, 'valor', x.valor, 'forma', x.forma,
           'adiantadoEm', cp.paga_em,
           'caso', (select s.nome from casos s where s.id = cp.caso_id)) order by x.criado_em, x.id), '[]'::jsonb)
    from reembolsos_recebidos x join contas_pagar cp on cp.id = x.conta_id
   where x.pagamento_id = p_pagamento
$$;

-- O recibo (GET /v1/escritorio/recibos/:pagamento) leva os reembolsos pagos junto.
alter function portal_recibo(uuid, uuid, uuid) rename to recibo_sem_reembolso;
create function portal_recibo(p_pessoa uuid, p_escritorio uuid, p_pagamento uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb := recibo_sem_reembolso(p_pessoa, p_escritorio, p_pagamento);
begin
  return v || jsonb_build_object('reembolsos', recibo_reembolsos((v ->> 'pagamentoId')::uuid));
end $$;

-- A prévia da exportação conta os reembolsos nos recebimentos do mês.
alter function portal_financeiro_exportacao_previa(uuid, uuid, text) rename to financeiro_exportacao_previa_sem_reembolso;
create function portal_financeiro_exportacao_previa(p_pessoa uuid, p_escritorio uuid, p_mes text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb := financeiro_exportacao_previa_sem_reembolso(p_pessoa, p_escritorio, p_mes);
  v_mes date := (v ->> 'mes')::date;
  v_n bigint;
  v_valor bigint;
begin
  select count(*), coalesce(sum(x.valor), 0) into v_n, v_valor from reembolsos_recebidos x
   where x.escritorio_id = p_escritorio and x.recebido_em between v_mes and (v_mes + interval '1 month')::date - 1;
  return jsonb_set(v, '{recebimentos}', jsonb_build_object(
    'n', (v -> 'recebimentos' ->> 'n')::bigint + v_n,
    'valor', (v -> 'recebimentos' ->> 'valor')::bigint + v_valor));
end $$;

-- A exportação põe cada reembolso como uma linha de recebimento, com o número do recibo da parcela.
alter function portal_financeiro_exportar(uuid, uuid, jsonb) rename to financeiro_exportar_sem_reembolso;
create function portal_financeiro_exportar(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb := financeiro_exportar_sem_reembolso(p_pessoa, p_escritorio, p_dados);
  v_mes date := (v ->> 'mes')::date;
  v_linhas jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object(
      'dia', x.recebido_em, 'cliente', k.nome, 'contrato', c.numero, 'parcela', 'Reembolso · ' || cp.descricao, 'tipo', 'REEMBOLSO',
      'referencia', to_char(r.vencimento, 'YYYY-MM'), 'forma', x.forma, 'valor', x.valor, 'multaJuros', 0,
      'recibo', (select rc.numero || '/' || rc.ano from recibos rc where rc.pagamento_id = x.pagamento_id)) order by x.recebido_em, x.criado_em), '[]'::jsonb)
    into v_linhas
    from reembolsos_recebidos x
    join contas_pagar cp on cp.id = x.conta_id
    join recebimentos_previstos r on r.id = x.parcela_id
    join contratos c on c.id = r.contrato_id
    join clientes_escritorio k on k.id = c.cliente_id
   where x.escritorio_id = p_escritorio and x.recebido_em between v_mes and (v_mes + interval '1 month')::date - 1;
  if jsonb_array_length(v_linhas) = 0 then return v; end if;
  return jsonb_set(v, '{recebimentos}', (
    select jsonb_agg(l order by l ->> 'dia', o) from (
      select l, o from jsonb_array_elements(v -> 'recebimentos') with ordinality t(l, o)
      union all
      select l, 1000000 + o from jsonb_array_elements(v_linhas) with ordinality t(l, o)) y));
end $$;

call fechar_acesso();
