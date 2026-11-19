-- Financeiro do Portal, parte 2: A pagar (FI-01, FI-02, FI-07, FI-13, FI-20), tela aprovada em
-- docs/design/aprovadas/portal-financeiro (Carol, 19/11/2026). Decisões do desenho:
-- 8. cada conta tem categoria (FI-20) e origem: recorrente, lançada sozinha (FI-13), ou
--    adiantada pelo escritório para um cliente, que vira reembolso (FI-07). "Adiantado por
--    cliente" lista o que volta e como volta. Saídas do mês por categoria, sem os repasses;
-- 9. lançar conta é uma janela curta, com "Repete todo mês" e "Foi adiantada para um cliente".
-- Nada se apaga: a conta só ganha o pagamento e, se adiantada, o reembolso.
-- Ficam para depois: a nota ou guia anexada (FI-18, com o envio de arquivos do Portal), o caso
-- do reembolso e a volta na parcela (FI-07, com o Jurídico), parar ou mudar a recorrência e a
-- aprovação da sócia (FI-10, a validar).

-- As categorias de saída (FI-20), as mesmas da exportação para o contador.
create function categoria_saida_valida(p text) returns boolean
language sql immutable
as $$ select p in ('RETIRADAS', 'PESSOAL', 'ALUGUEL', 'IMPOSTOS', 'CUSTAS', 'FORNECEDORES', 'TAXAS', 'OUTRAS') $$;

-- O modelo da conta que se repete todo mês. A primeira conta é lançada por quem criou; as
-- dos meses seguintes, desde "inicio", nascem sozinhas no dia 1º.
create table contas_recorrentes (
  id             uuid primary key default gen_random_uuid(),
  escritorio_id  uuid not null references escritorios (id) on delete restrict,
  descricao      text not null check (length(btrim(descricao)) between 3 and 120),
  fornecedor     text check (length(btrim(fornecedor)) between 1 and 120),
  categoria      text not null check (categoria_saida_valida(categoria)),
  valor          bigint not null check (valor between 1 and 10000000000),
  dia            integer not null check (dia between 1 and 31),
  forma          text check (forma is null or forma_pagamento_valida(forma)),
  inicio         date not null check (extract(day from inicio) = 1),
  encerrada_em   date,
  autor_id       uuid not null references pessoas (id) on delete restrict,
  criado_em      timestamptz not null default app_now()
);
call proteger_tabela_escritorio('contas_recorrentes');

create table contas_pagar (
  id              uuid primary key default gen_random_uuid(),
  escritorio_id   uuid not null references escritorios (id) on delete restrict,
  descricao       text not null check (length(btrim(descricao)) between 3 and 120),
  fornecedor      text check (length(btrim(fornecedor)) between 1 and 120),
  categoria       text not null check (categoria_saida_valida(categoria)),
  valor           bigint not null check (valor between 1 and 10000000000),
  vencimento      date not null,
  forma           text check (forma is null or forma_pagamento_valida(forma)),
  recorrente_id   uuid references contas_recorrentes (id) on delete restrict,
  mes             date check (mes is null or extract(day from mes) = 1),
  lancada_sozinha boolean not null default false,
  cliente_id      uuid references clientes_escritorio (id) on delete restrict,
  reembolso_como  text check (reembolso_como in ('PROXIMA_PARCELA', 'LEVANTAMENTO', 'A_PARTE')),
  reembolsado_em  date,
  paga_em         date,
  valor_pago      bigint check (valor_pago between 1 and 10000000000),
  pago_por        uuid references pessoas (id) on delete restrict,
  autor_id        uuid references pessoas (id) on delete restrict,
  criado_em       timestamptz not null default app_now(),
  check ((cliente_id is null) = (reembolso_como is null)),
  check (reembolsado_em is null or cliente_id is not null),
  check ((paga_em is null) = (valor_pago is null) and (paga_em is null) = (pago_por is null)),
  check ((recorrente_id is null) = (mes is null)),
  unique (recorrente_id, mes)
);
create index contas_pagar_vencimento on contas_pagar (escritorio_id, vencimento);
create index contas_pagar_cliente on contas_pagar (escritorio_id, cliente_id) where cliente_id is not null;
call proteger_tabela_escritorio('contas_pagar');

-- A conta só ganha o pagamento e o reembolso, uma vez cada; nada mais muda, nada se apaga.
create function contas_pagar_guardiao() returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_livres text[] := array['paga_em', 'valor_pago', 'pago_por', 'reembolsado_em'];
begin
  if tg_op = 'DELETE' then
    raise exception 'Conta não se apaga' using errcode = 'TC023';
  end if;
  if (to_jsonb(old) - v_livres) <> (to_jsonb(new) - v_livres)
     or (old.paga_em is not null and (new.paga_em, new.valor_pago, new.pago_por) is distinct from (old.paga_em, old.valor_pago, old.pago_por))
     or (old.reembolsado_em is not null and new.reembolsado_em is distinct from old.reembolsado_em) then
    raise exception 'Conta só ganha o pagamento e o reembolso' using errcode = 'TC023';
  end if;
  return new;
end $$;
create trigger contas_pagar_guardiao before update or delete on contas_pagar
  for each row execute function contas_pagar_guardiao();

create function contas_recorrentes_guardiao() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' or (to_jsonb(old) - 'encerrada_em') <> (to_jsonb(new) - 'encerrada_em') or old.encerrada_em is not null then
    raise exception 'Conta recorrente só se encerra' using errcode = 'TC023';
  end if;
  return new;
end $$;
create trigger contas_recorrentes_guardiao before update or delete on contas_recorrentes
  for each row execute function contas_recorrentes_guardiao();

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('contas_recorrentes', false, 'Contas do escritório que se repetem todo mês: descrição, fornecedor, categoria, valor e dia', null, null, null, null, null, null, true),
 ('contas_pagar', true,
  'Contas a pagar do escritório e despesas adiantadas para um cliente, com o pagamento e o reembolso',
  'Controlar as saídas do escritório e o que o cliente deve reembolsar (FI-01, FI-07)',
  'Execução de contrato (LGPD, art. 7º, V)', 'Escritório',
  'Enquanto o escritório for cliente do T3jus',
  'Exportadas ao escritório e apagadas com ele', 'APROVADO', true);

-- ---------------------------------------------------------------------------------------
-- Peças.

-- O vencimento no mês: o dia da conta, ou o último dia de um mês mais curto.
create function vencimento_no_mes(p_mes date, p_dia integer) returns date
language sql immutable
as $$ select least(p_mes + (p_dia - 1), (p_mes + interval '1 month')::date - 1) $$;

-- As contas recorrentes do mês nascem sozinhas no dia 1º (FI-13). A lista chama esta peça ao
-- abrir, e ela lança todo mês que faltar desde o início, uma vez só. Com o contrato encerrado
-- o Portal é só consulta e nada se lança.
create function lancar_recorrentes(p_escritorio uuid) returns integer
language plpgsql
set search_path = public
as $$
declare
  v_mes date := date_trunc('month', hoje_brasilia())::date;
  v integer;
begin
  if contrato_situacao(p_escritorio) in ('CONSULTA', 'FECHADO') then return 0; end if;
  insert into contas_pagar (escritorio_id, descricao, fornecedor, categoria, valor, vencimento, forma, recorrente_id, mes, lancada_sozinha)
  select r.escritorio_id, r.descricao, r.fornecedor, r.categoria, r.valor, vencimento_no_mes(m::date, r.dia), r.forma, r.id, m::date, true
    from contas_recorrentes r
   cross join lateral generate_series(r.inicio, v_mes, interval '1 month') m
   where r.escritorio_id = p_escritorio
     and (r.encerrada_em is null or m::date <= r.encerrada_em)
  on conflict (recorrente_id, mes) do nothing;
  get diagnostics v = row_count;
  return v;
end $$;

create function conta_situacao(c contas_pagar) returns text
language sql stable
set search_path = public
as $$
  select case when c.paga_em is not null then 'PAGA'
              when c.vencimento < hoje_brasilia() then 'VENCIDA'
              else 'A_VENCER' end
$$;

create function conta_linha(c contas_pagar) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', c.id, 'descricao', c.descricao, 'fornecedor', c.fornecedor, 'categoria', c.categoria,
    'valor', c.valor, 'valorPago', c.valor_pago, 'vencimento', c.vencimento, 'forma', c.forma,
    'pagaEm', c.paga_em, 'situacao', conta_situacao(c),
    'recorrente', case when c.recorrente_id is not null then
      (select jsonb_build_object('dia', r.dia, 'lancadaSozinha', c.lancada_sozinha, 'mes', c.mes)
         from contas_recorrentes r where r.id = c.recorrente_id) end,
    'adiantada', case when c.cliente_id is not null then jsonb_build_object(
      'cliente', (select jsonb_build_object('id', k.id, 'nome', k.nome) from clientes_escritorio k where k.id = c.cliente_id),
      'como', c.reembolso_como, 'reembolsadoEm', c.reembolsado_em) end)
$$;

-- ---------------------------------------------------------------------------------------
-- A pagar: os quatro números do alto (que são também os filtros), a lista, o que falta no
-- mês, o adiantado por cliente e as saídas do mês por categoria.
create function portal_financeiro_pagar(p_pessoa uuid, p_escritorio uuid, p_mostrar text default 'SEMANA') returns jsonb
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
                   from contas_pagar where escritorio_id = p_escritorio and paga_em is null and vencimento between v_hoje and v_sete),
      'vencidas', (select jsonb_build_object('valor', coalesce(sum(valor), 0), 'contas', count(*))
                     from contas_pagar where escritorio_id = p_escritorio and paga_em is null and vencimento < v_hoje),
      'recorrentes', (select jsonb_build_object('contas', count(*), 'sozinhas', count(*) filter (where lancada_sozinha))
                        from contas_pagar where escritorio_id = p_escritorio and mes = v_mes),
      'reembolsar', (select jsonb_build_object('valor', coalesce(sum(coalesce(valor_pago, valor)), 0), 'clientes', count(distinct cliente_id))
                       from contas_pagar where escritorio_id = p_escritorio and cliente_id is not null and reembolsado_em is null)),
    'mes', v_mes,
    'contas', coalesce((
      select jsonb_agg(conta_linha(c) order by c.vencimento, c.descricao)
        from contas_pagar c
       where c.escritorio_id = p_escritorio
         and case p_mostrar
               when 'SEMANA' then c.paga_em is null and c.vencimento between v_hoje and v_sete
               when 'VENCIDAS' then c.paga_em is null and c.vencimento < v_hoje
               when 'MES' then c.vencimento between v_mes and v_fim
               else c.mes = v_mes end), '[]'::jsonb),
    'depois', case when p_mostrar = 'SEMANA' then
      (select jsonb_build_object('contas', count(*), 'valor', coalesce(sum(valor), 0), 'ate', v_fim)
         from contas_pagar where escritorio_id = p_escritorio and paga_em is null and vencimento > v_sete and vencimento <= v_fim) end,
    'adiantados', coalesce((
      select jsonb_agg(conta_linha(c) order by c.vencimento, c.descricao)
        from contas_pagar c
       where c.escritorio_id = p_escritorio and c.cliente_id is not null and c.reembolsado_em is null), '[]'::jsonb),
    'categorias', coalesce((
      select jsonb_agg(jsonb_build_object('categoria', categoria, 'valor', total) order by total desc, categoria)
        from (select categoria, sum(coalesce(valor_pago, valor))::bigint total
                from contas_pagar where escritorio_id = p_escritorio and vencimento between v_mes and v_fim
               group by categoria) s), '[]'::jsonb));
end $$;

-- Lançar conta (decisão 9). "Repete todo mês" cria o modelo, com o dia do vencimento, e esta é
-- a conta do primeiro mês. "Adiantada para um cliente" pede o cliente e como o dinheiro volta.
create function portal_financeiro_conta_lancar(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_desc text := nullif(btrim(coalesce(p_dados ->> 'descricao', '')), '');
  v_forn text := nullif(btrim(coalesce(p_dados ->> 'fornecedor', '')), '');
  v_cat text := p_dados ->> 'categoria';
  v_valor bigint := json_inteiro(p_dados, 'valor');
  v_venc date := json_data(p_dados, 'vencimento');
  v_forma text := nullif(p_dados ->> 'forma', '');
  v_repete boolean := coalesce((p_dados ->> 'repete')::boolean, false);
  v_adiantada boolean := coalesce((p_dados ->> 'adiantada')::boolean, false);
  v_como text := nullif(p_dados ->> 'reembolsoComo', '');
  v_cliente uuid;
  v_rec uuid;
  v_id uuid;
  e text[] := '{}';
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.editar');
  begin v_cliente := nullif(p_dados ->> 'clienteId', '')::uuid; exception when others then v_cliente := null; end;
  if v_desc is null or length(v_desc) not between 3 and 120 then e := e || 'descricao'::text; end if;
  if v_forn is not null and length(v_forn) > 120 then e := e || 'fornecedor'::text; end if;
  if not coalesce(categoria_saida_valida(v_cat), false) then e := e || 'categoria'::text; end if;
  if v_valor is null or v_valor not between 1 and 10000000000 then e := e || 'valor'::text; end if;
  if v_venc is null or v_venc < date '2000-01-01' or v_venc > hoje_brasilia() + 3650 then e := e || 'vencimento'::text; end if;
  if v_forma is not null and not forma_pagamento_valida(v_forma) then e := e || 'forma'::text; end if;
  if v_adiantada then
    if v_cliente is null or not exists (select 1 from clientes_escritorio k where k.id = v_cliente and k.escritorio_id = p_escritorio) then
      e := e || 'clienteId'::text;
    end if;
    if coalesce(v_como, '') not in ('PROXIMA_PARCELA', 'LEVANTAMENTO', 'A_PARTE') then e := e || 'reembolsoComo'::text; end if;
  end if;
  if cardinality(e) > 0 then perform recusar_campos('Confira a conta', variadic (select array_agg(v order by v) from unnest(e) v)); end if;

  if v_repete then
    insert into contas_recorrentes (escritorio_id, descricao, fornecedor, categoria, valor, dia, forma, inicio, autor_id)
    values (p_escritorio, v_desc, v_forn, v_cat, v_valor, extract(day from v_venc)::integer, v_forma,
            (date_trunc('month', v_venc) + interval '1 month')::date, p_pessoa)
    returning id into v_rec;
  end if;
  insert into contas_pagar (escritorio_id, descricao, fornecedor, categoria, valor, vencimento, forma, recorrente_id, mes,
                            cliente_id, reembolso_como, autor_id)
  values (p_escritorio, v_desc, v_forn, v_cat, v_valor, v_venc, v_forma, v_rec,
          case when v_rec is not null then date_trunc('month', v_venc)::date end,
          case when v_adiantada then v_cliente end, case when v_adiantada then v_como end, p_pessoa)
  returning id into v_id;
  perform registrar_historico('financeiro.conta_lancada', 'contas_pagar', v_id::text,
    jsonb_build_object('categoria', v_cat, 'valor', v_valor, 'vencimento', v_venc, 'recorrente', v_rec,
                       'cliente', case when v_adiantada then v_cliente end));
  return jsonb_build_object('id', v_id, 'recorrenteId', v_rec);
end $$;

-- Marcar paga: o dia em que saiu e quanto saiu (a conta de valor que muda todo mês, como o
-- imposto, sai com o valor do mês).
create function portal_financeiro_conta_paga(p_pessoa uuid, p_escritorio uuid, p_conta uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c contas_pagar;
  v_dia date := json_data(p_dados, 'pagaEm');
  v_valor bigint := json_inteiro(p_dados, 'valor');
  e text[] := '{}';
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.editar');
  select * into c from contas_pagar where id = p_conta and escritorio_id = p_escritorio for update;
  if c.id is null then raise exception 'Conta não encontrada' using errcode = 'TC404'; end if;
  if c.paga_em is not null then perform recusar_motivo('Esta conta já está paga', 'CONTA_JA_PAGA'); end if;
  if v_valor is null or v_valor not between 1 and 10000000000 then e := e || 'valor'::text; end if;
  if v_dia is null or v_dia < date '2000-01-01' then e := e || 'pagaEm'::text;
  elsif v_dia > hoje_brasilia() then
    raise exception 'O dia do pagamento não pode ser depois de hoje' using errcode = 'TC422',
      detail = jsonb_build_object('motivo', 'DATA_NO_FUTURO', 'campos', jsonb_build_array('pagaEm'))::text;
  end if;
  if cardinality(e) > 0 then perform recusar_campos('Confira o pagamento', variadic e); end if;
  update contas_pagar set paga_em = v_dia, valor_pago = v_valor, pago_por = p_pessoa where id = c.id;
  perform registrar_historico('financeiro.conta_paga', 'contas_pagar', c.id::text,
    jsonb_build_object('pagaEm', v_dia, 'valor', v_valor));
  return jsonb_build_object('id', c.id, 'pagaEm', v_dia);
end $$;

-- O cliente devolveu o que o escritório adiantou.
create function portal_financeiro_conta_reembolsada(p_pessoa uuid, p_escritorio uuid, p_conta uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c contas_pagar;
  v_dia date := json_data(p_dados, 'reembolsadoEm');
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.editar');
  select * into c from contas_pagar where id = p_conta and escritorio_id = p_escritorio and cliente_id is not null for update;
  if c.id is null then raise exception 'Conta não encontrada' using errcode = 'TC404'; end if;
  if c.reembolsado_em is not null then perform recusar_motivo('Este valor já foi reembolsado', 'JA_REEMBOLSADA'); end if;
  if v_dia is null or v_dia < date '2000-01-01' then perform recusar_campos('Confira o reembolso', 'reembolsadoEm'); end if;
  if v_dia > hoje_brasilia() then
    raise exception 'O dia do reembolso não pode ser depois de hoje' using errcode = 'TC422',
      detail = jsonb_build_object('motivo', 'DATA_NO_FUTURO', 'campos', jsonb_build_array('reembolsadoEm'))::text;
  end if;
  update contas_pagar set reembolsado_em = v_dia where id = c.id;
  perform registrar_historico('financeiro.reembolso', 'contas_pagar', c.id::text,
    jsonb_build_object('reembolsadoEm', v_dia, 'cliente', c.cliente_id));
  return jsonb_build_object('id', c.id, 'reembolsadoEm', v_dia);
end $$;

call fechar_acesso();
