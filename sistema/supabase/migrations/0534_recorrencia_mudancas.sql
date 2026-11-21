-- 0534 · Mudar o valor ou o dia e encerrar uma conta que repete todo mês (FI-13, F3.24).
-- Desenho aprovado pela Carol em 21/11/2026: docs/design/aprovadas/portal-recibo-recorrente
-- (estados rc-, decisões 2.1 a 2.8 e a pergunta 3).
-- - A mudança vale a partir do mês escolhido. A conta do mês já lançada e não paga muda só se a
--   pessoa escolher o mês dela; ao encerrar, ela continua a pagar e só é cancelada se a pessoa
--   marcar a opção, ficando no histórico como cancelada, com o motivo. Conta paga nunca muda.
-- - Nada se apaga: as mudanças ficam numa tabela só de inserção, com quem fez, quando e o motivo.
-- - Dia de 1 a 28, ou 0 para "no último dia do mês".
-- - Quem pode: quem tem a área Financeiro, como lançar conta.
-- A conta cancelada sai das somas do A pagar, das saídas previstas e das despesas fixas do Resumo.

alter table contas_pagar
  add column cancelada_em     timestamptz,
  add column cancelada_por    uuid references pessoas (id) on delete restrict,
  add column cancelada_motivo text check (length(btrim(cancelada_motivo)) between 3 and 300),
  add constraint contas_pagar_cancelada check ((cancelada_em is null) = (cancelada_por is null) and (cancelada_em is null) = (cancelada_motivo is null)),
  add constraint contas_pagar_cancelada_nao_paga check (cancelada_em is null or paga_em is null);

create table recorrencia_mudancas (
  id                 uuid primary key default gen_random_uuid(),
  escritorio_id      uuid not null references escritorios (id) on delete restrict,
  recorrencia_id     uuid not null references contas_recorrentes (id) on delete restrict,
  tipo               text not null check (tipo in ('VALOR', 'ENCERRAR')),
  a_partir_de        date not null check (extract(day from a_partir_de) = 1),
  valor              bigint check (valor between 1 and 10000000000),
  dia                integer check (dia between 0 and 28),
  motivo             text check (length(btrim(motivo)) between 1 and 160),
  detalhe            text check (length(btrim(detalhe)) between 1 and 500),
  mudou_conta_id     uuid references contas_pagar (id) on delete restrict,
  cancelou_conta_id  uuid references contas_pagar (id) on delete restrict,
  feito_por          uuid not null references pessoas (id) on delete restrict,
  feito_em           timestamptz not null default app_now(),
  check ((tipo = 'VALOR') = (valor is not null and dia is not null)),
  check (tipo = 'VALOR' or motivo is not null),
  check (tipo = 'ENCERRAR' or cancelou_conta_id is null),
  check (tipo = 'VALOR' or mudou_conta_id is null)
);
create index recorrencia_mudancas_rec on recorrencia_mudancas (recorrencia_id, a_partir_de);
call proteger_tabela_escritorio('recorrencia_mudancas');
create trigger recorrencia_mudancas_so_acrescenta before update or delete on recorrencia_mudancas
  for each row execute function financeiro_so_acrescenta();

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('recorrencia_mudancas', false,
  'Mudanças de valor ou dia e encerramentos das contas que repetem todo mês, com quem fez, quando e o motivo',
  null, null, null, null, null, null, true);

-- A conta só ganha o pagamento, o reembolso e, se ainda não paga, o cancelamento. A conta do mês
-- de uma recorrência, ainda não paga nem cancelada, pode mudar de valor e de vencimento só pela
-- mudança da recorrência (abaixo), que liga a chave t3.recorrencia_mudanca na transação.
create or replace function contas_pagar_guardiao() returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_livres text[] := array['paga_em', 'valor_pago', 'pago_por', 'reembolsado_em', 'cancelada_em', 'cancelada_por', 'cancelada_motivo'];
begin
  if tg_op = 'DELETE' then
    raise exception 'Conta não se apaga' using errcode = 'TC023';
  end if;
  if old.cancelada_em is not null and (to_jsonb(old) - 'reembolsado_em') <> (to_jsonb(new) - 'reembolsado_em') then
    raise exception 'Esta conta foi cancelada' using errcode = 'TC422', detail = jsonb_build_object('motivo', 'CONTA_CANCELADA')::text;
  end if;
  if coalesce(current_setting('t3.recorrencia_mudanca', true), '') = 'on' and old.recorrente_id is not null
     and old.paga_em is null and new.paga_em is null and old.cancelada_em is null then
    v_livres := v_livres || array['valor', 'vencimento'];
  end if;
  if (to_jsonb(old) - v_livres) <> (to_jsonb(new) - v_livres)
     or (old.paga_em is not null and (new.paga_em, new.valor_pago, new.pago_por) is distinct from (old.paga_em, old.valor_pago, old.pago_por))
     or (old.reembolsado_em is not null and new.reembolsado_em is distinct from old.reembolsado_em) then
    raise exception 'Conta só ganha o pagamento e o reembolso' using errcode = 'TC023';
  end if;
  return new;
end $$;

create or replace function conta_situacao(c contas_pagar) returns text
language sql stable
set search_path = public
as $$
  select case when c.cancelada_em is not null then 'CANCELADA'
              when c.paga_em is not null then 'PAGA'
              when c.vencimento < hoje_brasilia() then 'VENCIDA'
              else 'A_VENCER' end
$$;

-- O valor e o dia de uma recorrência num mês: a mudança de valor mais recente que já vale nele,
-- ou o que foi lançado no começo. O dia 0 é o último dia do mês.
create function recorrencia_no_mes(p_rec uuid, p_mes date, out valor bigint, out dia integer, out dia_escolhido integer)
language sql stable
set search_path = public
as $$
  select coalesce(m.valor, r.valor), case coalesce(m.dia, r.dia) when 0 then 31 else coalesce(m.dia, r.dia) end, coalesce(m.dia, r.dia)
    from contas_recorrentes r
    left join lateral (select x.valor, x.dia from recorrencia_mudancas x
                        where x.recorrencia_id = r.id and x.tipo = 'VALOR' and x.a_partir_de <= p_mes
                        order by x.a_partir_de desc, x.feito_em desc, x.id desc limit 1) m on true
   where r.id = p_rec
$$;

-- As contas do mês nascem com o valor e o dia que valem nele (0230 lançava sempre os do começo).
create or replace function lancar_recorrentes(p_escritorio uuid) returns integer
language plpgsql
set search_path = public
as $$
declare
  v_mes date := date_trunc('month', hoje_brasilia())::date;
  v integer;
begin
  if contrato_situacao(p_escritorio) in ('CONSULTA', 'FECHADO') then return 0; end if;
  insert into contas_pagar (escritorio_id, descricao, fornecedor, categoria, valor, vencimento, forma, recorrente_id, mes, lancada_sozinha)
  select r.escritorio_id, r.descricao, r.fornecedor, r.categoria, q.valor, vencimento_no_mes(m::date, q.dia), r.forma, r.id, m::date, true
    from contas_recorrentes r
   cross join lateral generate_series(r.inicio, v_mes, interval '1 month') m
   cross join lateral recorrencia_no_mes(r.id, m::date) q
   where r.escritorio_id = p_escritorio
     and (r.encerrada_em is null or m::date <= r.encerrada_em)
  on conflict (recorrente_id, mes) do nothing;
  get diagnostics v = row_count;
  return v;
end $$;

create or replace function saidas_previstas(p_escritorio uuid, p_mes date, p_so_falta boolean) returns bigint
language sql stable
set search_path = public
as $$
  select ((select coalesce(sum(c.valor), 0) from contas_pagar c
            where c.escritorio_id = p_escritorio and c.vencimento between p_mes and (p_mes + interval '1 month')::date - 1
              and c.cancelada_em is null and (not p_so_falta or c.paga_em is null))
        + (select coalesce(sum((recorrencia_no_mes(r.id, p_mes)).valor), 0) from contas_recorrentes r
            where r.escritorio_id = p_escritorio and r.inicio <= p_mes and (r.encerrada_em is null or p_mes <= r.encerrada_em)
              and not exists (select 1 from contas_pagar c where c.recorrente_id = r.id and c.mes = p_mes)))::bigint
$$;

create or replace function conta_linha(c contas_pagar) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', c.id, 'descricao', c.descricao, 'fornecedor', c.fornecedor, 'categoria', c.categoria,
    'valor', c.valor, 'valorPago', c.valor_pago, 'vencimento', c.vencimento, 'forma', c.forma,
    'pagaEm', c.paga_em, 'situacao', conta_situacao(c),
    'recorrente', case when c.recorrente_id is not null then
      (select jsonb_build_object('id', r.id, 'dia', r.dia, 'lancadaSozinha', c.lancada_sozinha, 'mes', c.mes)
         from contas_recorrentes r where r.id = c.recorrente_id) end,
    'cancelada', case when c.cancelada_em is not null then
      jsonb_build_object('em', c.cancelada_em, 'por', pessoa_ref(c.cancelada_por), 'motivo', c.cancelada_motivo) end,
    'adiantada', case when c.cliente_id is not null then jsonb_build_object(
      'cliente', (select jsonb_build_object('id', k.id, 'nome', k.nome) from clientes_escritorio k where k.id = c.cliente_id),
      'caso', (select jsonb_build_object('id', s.id, 'nome', s.nome) from casos s where s.id = c.caso_id),
      'como', c.reembolso_como, 'reembolsadoEm', c.reembolsado_em, 'parcela', conta_parcela_reembolso(c)) end)
$$;

-- A pagar (0230), agora sem as contas canceladas nas somas, nas vencidas e nas da semana. No
-- filtro "Recorrentes do mês" e em "Mês" a cancelada aparece, marcada, para quem procurar por ela.
create or replace function portal_financeiro_pagar(p_pessoa uuid, p_escritorio uuid, p_mostrar text default 'SEMANA') returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hoje date;
  v_sete date;
  v_mes date;
  v_fim date;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.ver');
  if coalesce(p_mostrar, '') not in ('SEMANA', 'VENCIDAS', 'MES', 'RECORRENTES') then
    perform recusar_campos('Confira o filtro', 'mostrar');
  end if;
  perform lancar_recorrentes(p_escritorio);
  v_hoje := hoje_brasilia();
  v_sete := v_hoje + 6;
  v_mes := date_trunc('month', v_hoje)::date;
  v_fim := (v_mes + interval '1 month')::date - 1;

  return jsonb_build_object(
    'algum', exists (select 1 from contas_pagar where escritorio_id = p_escritorio),
    'totais', jsonb_build_object(
      'semana', (select jsonb_build_object('valor', coalesce(sum(valor), 0), 'contas', count(*))
                   from contas_pagar where escritorio_id = p_escritorio and paga_em is null and cancelada_em is null and vencimento between v_hoje and v_sete),
      'vencidas', (select jsonb_build_object('valor', coalesce(sum(valor), 0), 'contas', count(*))
                     from contas_pagar where escritorio_id = p_escritorio and paga_em is null and cancelada_em is null and vencimento < v_hoje),
      'recorrentes', (select jsonb_build_object('contas', count(*), 'sozinhas', count(*) filter (where lancada_sozinha),
                                                'ativas', (select count(*) from contas_recorrentes r where r.escritorio_id = p_escritorio
                                                             and (r.encerrada_em is null or r.encerrada_em >= v_fim)),
                                                'encerradasMes', (select count(distinct x.recorrencia_id) from recorrencia_mudancas x
                                                                    where x.escritorio_id = p_escritorio and x.tipo = 'ENCERRAR'
                                                                      and x.feito_em >= v_mes::timestamp at time zone 'America/Sao_Paulo'))
                        from contas_pagar where escritorio_id = p_escritorio and mes = v_mes and cancelada_em is null),
      'reembolsar', (select jsonb_build_object('valor', coalesce(sum(coalesce(valor_pago, valor)), 0), 'clientes', count(distinct cliente_id))
                       from contas_pagar where escritorio_id = p_escritorio and cliente_id is not null and reembolsado_em is null and cancelada_em is null)),
    'mes', v_mes,
    'contas', coalesce((
      select jsonb_agg(conta_linha(c) order by c.vencimento, c.descricao)
        from contas_pagar c
       where c.escritorio_id = p_escritorio
         and case p_mostrar
               when 'SEMANA' then c.paga_em is null and c.cancelada_em is null and c.vencimento between v_hoje and v_sete
               when 'VENCIDAS' then c.paga_em is null and c.cancelada_em is null and c.vencimento < v_hoje
               when 'MES' then c.vencimento between v_mes and v_fim
               else c.mes = v_mes end), '[]'::jsonb),
    'depois', case when p_mostrar = 'SEMANA' then
      (select jsonb_build_object('contas', count(*), 'valor', coalesce(sum(valor), 0), 'ate', v_fim)
         from contas_pagar where escritorio_id = p_escritorio and paga_em is null and cancelada_em is null and vencimento > v_sete and vencimento <= v_fim) end,
    'adiantados', coalesce((
      select jsonb_agg(conta_linha(c) order by c.vencimento, c.descricao)
        from contas_pagar c
       where c.escritorio_id = p_escritorio and c.cliente_id is not null and c.reembolsado_em is null and c.cancelada_em is null), '[]'::jsonb),
    'categorias', coalesce((
      select jsonb_agg(jsonb_build_object('categoria', categoria, 'valor', total) order by total desc, categoria)
        from (select categoria, sum(coalesce(valor_pago, valor))::bigint total
                from contas_pagar where escritorio_id = p_escritorio and vencimento between v_mes and v_fim and cancelada_em is null
               group by categoria) s), '[]'::jsonb));
end $$;

-- As despesas fixas do Resumo (0290) sem a conta cancelada. O Resumo chama esta peça por um
-- invólucro, para não reescrever a função grande: o valor de 'fixas.despesas' é trocado aqui.
create function despesas_fixas_mes(p_escritorio uuid, p_mes date) returns bigint
language sql stable
set search_path = public
as $$
  select coalesce(sum(valor), 0)::bigint from contas_pagar where escritorio_id = p_escritorio and mes = p_mes and cancelada_em is null
$$;

alter function portal_financeiro_resumo(uuid, uuid) rename to portal_financeiro_resumo_0290;
revoke all on function portal_financeiro_resumo_0290(uuid, uuid) from public, anon, authenticated;

create function portal_financeiro_resumo(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r jsonb := portal_financeiro_resumo_0290(p_pessoa, p_escritorio);
begin
  return jsonb_set(r, '{fixas,despesas}', to_jsonb(despesas_fixas_mes(p_escritorio, (r ->> 'mes')::date)));
end $$;

-- ---------------------------------------------------------------------------------------
-- A recorrência inteira, para a lista e a ficha.

create function recorrencia_linha(r contas_recorrentes) returns jsonb
language sql stable
set search_path = public
as $$
  with mes as (select date_trunc('month', hoje_brasilia())::date m),
       q as (select * from recorrencia_no_mes(r.id, (select m from mes))),
       prox as (select * from recorrencia_no_mes(r.id, ((select m from mes) + interval '1 month')::date)),
       enc as (select x.* from recorrencia_mudancas x where x.recorrencia_id = r.id and x.tipo = 'ENCERRAR' order by x.feito_em desc limit 1)
  select jsonb_build_object(
    'id', r.id, 'descricao', r.descricao, 'fornecedor', r.fornecedor, 'categoria', r.categoria, 'forma', r.forma,
    'valor', (select valor from q), 'dia', (select dia_escolhido from q),
    'desde', coalesce((select min(c.mes) from contas_pagar c where c.recorrente_id = r.id), r.inicio),
    'ultimoMes', case when r.encerrada_em is not null then date_trunc('month', r.encerrada_em)::date end,
    'encerrada', (select jsonb_build_object('em', e.feito_em, 'por', pessoa_ref(e.feito_por), 'aPartirDe', e.a_partir_de,
                                            'motivo', e.motivo, 'detalhe', e.detalhe) from enc e),
    'proxima', case when r.encerrada_em is null or r.encerrada_em >= ((select m from mes) + interval '1 month')::date then
                 jsonb_build_object('mes', ((select m from mes) + interval '1 month')::date, 'valor', (select valor from prox),
                                    'dia', (select dia_escolhido from prox),
                                    'vencimento', vencimento_no_mes(((select m from mes) + interval '1 month')::date, (select dia from prox))) end,
    'doMes', (select conta_linha(c) from contas_pagar c where c.recorrente_id = r.id and c.mes = (select m from mes)),
    'lancadas', (select count(*) from contas_pagar c where c.recorrente_id = r.id),
    'pagas', (select count(*) from contas_pagar c where c.recorrente_id = r.id and c.paga_em is not null))
$$;

-- GET /v1/escritorio/financeiro/recorrencias: as ativas e, embaixo, as encerradas.
create function portal_recorrencias(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fim date;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.ver');
  perform lancar_recorrentes(p_escritorio);
  v_fim := (date_trunc('month', hoje_brasilia()) + interval '1 month')::date - 1;
  return jsonb_build_object(
    'mes', date_trunc('month', hoje_brasilia())::date,
    'ativas', coalesce((select jsonb_agg(recorrencia_linha(r) order by r.descricao, r.id) from contas_recorrentes r
                         where r.escritorio_id = p_escritorio and (r.encerrada_em is null or r.encerrada_em >= v_fim)), '[]'::jsonb),
    'encerradas', coalesce((select jsonb_agg(recorrencia_linha(r) order by r.encerrada_em desc, r.descricao) from contas_recorrentes r
                             where r.escritorio_id = p_escritorio and r.encerrada_em < v_fim), '[]'::jsonb));
end $$;

-- GET /v1/escritorio/financeiro/recorrencias/:id: a ficha, com as contas lançadas e as mudanças.
create function portal_recorrencia(p_pessoa uuid, p_escritorio uuid, p_rec uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r contas_recorrentes;
  v_primeira contas_pagar;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.ver');
  perform lancar_recorrentes(p_escritorio);
  select * into r from contas_recorrentes where id = p_rec and escritorio_id = p_escritorio;
  if r.id is null then raise exception 'Conta que repete não encontrada' using errcode = 'TC404'; end if;
  select * into v_primeira from contas_pagar where recorrente_id = r.id order by mes, criado_em limit 1;
  return recorrencia_linha(r) || jsonb_build_object(
    'contas', coalesce((select jsonb_agg(conta_linha(c) || jsonb_build_object(
                                 'anexos', (select count(*) from anexos a where a.conta_id = c.id and a.situacao = 'PRONTO'))
                               order by c.mes desc) from contas_pagar c where c.recorrente_id = r.id), '[]'::jsonb),
    'mudancas', coalesce((select jsonb_agg(jsonb_build_object(
                             'id', x.id, 'tipo', x.tipo, 'aPartirDe', x.a_partir_de, 'valor', x.valor, 'dia', x.dia,
                             'antes', (select jsonb_build_object('valor', a.valor, 'dia', a.dia_escolhido)
                                         from recorrencia_no_mes(r.id, (x.a_partir_de - interval '1 month')::date) a),
                             'motivo', x.motivo, 'detalhe', x.detalhe, 'por', pessoa_ref(x.feito_por), 'em', x.feito_em,
                             'mudouConta', x.mudou_conta_id is not null, 'cancelouConta', x.cancelou_conta_id is not null)
                           order by x.feito_em desc, x.id desc)
                           from recorrencia_mudancas x where x.recorrencia_id = r.id), '[]'::jsonb),
    'criada', jsonb_build_object('em', r.criado_em, 'por', pessoa_ref(r.autor_id), 'valor', coalesce(v_primeira.valor, r.valor),
                                 'dia', r.dia, 'mes', coalesce(v_primeira.mes, r.inicio), 'forma', r.forma));
end $$;

-- POST /v1/escritorio/financeiro/recorrencias/:id/mudancas.
-- VALOR: {tipo, aPartirDe, valor, dia, motivo?}. ENCERRAR: {tipo, aPartirDe, motivo, detalhe?, cancelarLancada?}.
create function portal_recorrencia_mudar(p_pessoa uuid, p_escritorio uuid, p_rec uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r contas_recorrentes;
  c contas_pagar;
  v_tipo text := p_dados ->> 'tipo';
  v_desde date := json_data(p_dados, 'aPartirDe');
  v_valor bigint := json_inteiro(p_dados, 'valor');
  v_dia integer;
  v_motivo text := nullif(btrim(coalesce(p_dados ->> 'motivo', '')), '');
  v_detalhe text := nullif(btrim(coalesce(p_dados ->> 'detalhe', '')), '');
  v_cancelar boolean := coalesce((p_dados ->> 'cancelarLancada')::boolean, false);
  v_mes date := date_trunc('month', hoje_brasilia())::date;
  v_prox date := (date_trunc('month', hoje_brasilia()) + interval '1 month')::date;
  v_mudou uuid;
  v_cancelou uuid;
  v_id uuid;
  e jsonb := '{}';
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.editar');
  perform lancar_recorrentes(p_escritorio);
  select * into r from contas_recorrentes where id = p_rec and escritorio_id = p_escritorio for update;
  if r.id is null then raise exception 'Conta que repete não encontrada' using errcode = 'TC404'; end if;
  if coalesce(v_tipo, '') not in ('VALOR', 'ENCERRAR') then perform recusar_campos('Confira o que mudar', 'tipo'); end if;
  if r.encerrada_em is not null then
    perform recusar_motivo('Esta conta já não repete mais', 'JA_ENCERRADA');
  end if;
  begin v_dia := (p_dados ->> 'dia')::integer; exception when others then v_dia := -1; end;

  if v_desde is null or extract(day from v_desde) <> 1 then e := e || jsonb_build_object('aPartirDe', 'MES_OBRIGATORIO');
  elsif v_desde < (case v_tipo when 'ENCERRAR' then v_prox else v_mes end) then e := e || jsonb_build_object('aPartirDe', 'MES_PASSADO');
  elsif v_desde > v_mes + interval '24 months' then e := e || jsonb_build_object('aPartirDe', 'MES_LONGE');
  end if;
  if v_tipo = 'VALOR' then
    if v_valor is null or v_valor not between 1 and 10000000000 then e := e || jsonb_build_object('valor', 'VALOR_OBRIGATORIO'); end if;
    if v_dia is null or v_dia not between 0 and 28 then e := e || jsonb_build_object('dia', 'DIA_INVALIDO'); end if;
    if v_motivo is not null and length(v_motivo) > 160 then e := e || jsonb_build_object('motivo', 'MOTIVO_LONGO'); end if;
  else
    if v_motivo is null or v_motivo not in ('O contrato com o fornecedor terminou', 'Troquei de fornecedor', 'O escritório não usa mais',
                                             'A conta vai ser lançada de outro jeito', 'Outro') then
      e := e || jsonb_build_object('motivo', 'MOTIVO_OBRIGATORIO');
    end if;
    if v_motivo = 'Outro' and v_detalhe is null then e := e || jsonb_build_object('detalhe', 'DETALHE_OBRIGATORIO'); end if;
    if v_cancelar and v_desde is distinct from v_prox then e := e || jsonb_build_object('cancelarLancada', 'SO_COM_A_PROXIMA'); end if;
  end if;
  if v_detalhe is not null and length(v_detalhe) > 500 then e := e || jsonb_build_object('detalhe', 'DETALHE_LONGO'); end if;
  if e <> '{}' then
    raise exception 'Confira a mudança' using errcode = 'TC422',
      detail = jsonb_build_object('campos', (select jsonb_agg(k order by k) from jsonb_object_keys(e) k), 'motivos', e)::text;
  end if;

  select * into c from contas_pagar where recorrente_id = r.id and mes = v_mes for update;
  if v_tipo = 'VALOR' then
    -- A conta do mês, já lançada, muda só se a pessoa escolheu o mês dela e ela ainda está aberta.
    if v_desde = v_mes and c.id is not null and c.paga_em is null and c.cancelada_em is null then
      perform set_config('t3.recorrencia_mudanca', 'on', true);
      update contas_pagar set valor = v_valor, vencimento = vencimento_no_mes(v_mes, case v_dia when 0 then 31 else v_dia end)
       where id = c.id;
      perform set_config('t3.recorrencia_mudanca', '', true);
      v_mudou := c.id;
    end if;
  else
    if v_cancelar then
      if c.id is null or c.paga_em is not null or c.cancelada_em is not null then
        perform recusar_motivo('A conta deste mês já foi paga e não se cancela', 'CONTA_JA_PAGA');
      end if;
      update contas_pagar set cancelada_em = app_now(), cancelada_por = p_pessoa,
             cancelada_motivo = left(v_motivo || coalesce('. ' || v_detalhe, ''), 300)
       where id = c.id;
      v_cancelou := c.id;
    end if;
    update contas_recorrentes set encerrada_em = v_desde - 1 where id = r.id;
  end if;

  insert into recorrencia_mudancas (escritorio_id, recorrencia_id, tipo, a_partir_de, valor, dia, motivo, detalhe,
                                    mudou_conta_id, cancelou_conta_id, feito_por)
  values (p_escritorio, r.id, v_tipo, v_desde, case when v_tipo = 'VALOR' then v_valor end, case when v_tipo = 'VALOR' then v_dia end,
          v_motivo, v_detalhe, v_mudou, v_cancelou, p_pessoa)
  returning id into v_id;
  perform registrar_historico(case v_tipo when 'VALOR' then 'financeiro.recorrencia_mudada' else 'financeiro.recorrencia_encerrada' end,
    'contas_recorrentes', r.id::text,
    jsonb_build_object('aPartirDe', v_desde, 'valor', case when v_tipo = 'VALOR' then v_valor end, 'dia', case when v_tipo = 'VALOR' then v_dia end,
                       'motivo', v_motivo, 'mudouConta', v_mudou, 'cancelouConta', v_cancelou));
  return jsonb_build_object('id', v_id, 'mudouConta', v_mudou is not null, 'cancelouConta', v_cancelou is not null,
                            'contaDoMes', case when c.id is not null then (select conta_linha(x) from contas_pagar x where x.id = c.id) end);
end $$;

revoke all on function portal_recorrencias(uuid, uuid), portal_recorrencia(uuid, uuid, uuid),
  portal_recorrencia_mudar(uuid, uuid, uuid, jsonb), portal_financeiro_resumo(uuid, uuid) from public, anon, authenticated;
