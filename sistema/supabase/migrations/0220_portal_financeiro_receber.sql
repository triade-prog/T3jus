-- Financeiro do Portal, parte 1: A receber (FI-01 a FI-04, FI-14, FI-17), tela aprovada em
-- docs/design/aprovadas/portal-financeiro (Carol, 19/11/2026). Decisões do desenho:
-- 4. A receber é uma lista por vencimento, com a forma de pagamento e a cobrança de cada parcela;
-- 5. as parcelas nascem dos contratos (recebimentos_previstos, 0200): ninguém digita parcela aqui;
-- 6. a ficha de parcelas de um contrato mostra o mês de referência, o recibo e a cobrança
--    (motivo do atraso, próxima ação e o histórico);
-- 7. registrar recebimento baixa a parcela do mês dela, mesmo pago em outro mês; no caixa, o
--    dinheiro conta no dia em que entrou (FI-02). Nada se apaga.
-- Ficam para depois: Pix e boleto com baixa sozinha (FI-17, depende de banco), o comprovante
-- anexado (FI-18), o recibo em PDF e o envio pelo WhatsApp (FI-14).

insert into funcao_acoes (funcao, acao) values
  ('SOCIO', 'financeiro.ver'), ('SOCIO', 'financeiro.editar'),
  ('EQUIPE', 'financeiro.ver'), ('EQUIPE', 'financeiro.editar');

-- As seis formas de pagamento do FI-17, mais transferência.
create function forma_pagamento_valida(p text) returns boolean
language sql immutable
as $$ select p in ('PIX', 'BOLETO', 'CARTAO', 'DEBITO_AUTOMATICO', 'DINHEIRO', 'CHEQUE_PRE', 'TRANSFERENCIA') $$;

-- A forma combinada da parcela (anotada na cobrança ou herdada do primeiro recebimento).
alter table recebimentos_previstos add column forma text check (forma is null or forma_pagamento_valida(forma));

-- Cada dinheiro que entrou numa parcela. Só inserção: o erro se corrige com outro registro.
create table pagamentos_recebidos (
  id             uuid primary key default gen_random_uuid(),
  escritorio_id  uuid not null references escritorios (id) on delete restrict,
  parcela_id     uuid not null references recebimentos_previstos (id) on delete restrict,
  valor          bigint not null check (valor between 1 and 10000000000),
  multa_juros    bigint check (multa_juros between 1 and 10000000000),
  recebido_em    date not null,
  forma          text not null check (forma_pagamento_valida(forma)),
  caixa          text not null default 'ESCRITORIO' check (caixa in ('ESCRITORIO', 'TERCEIROS')),
  autor_id       uuid not null references pessoas (id) on delete restrict,
  criado_em      timestamptz not null default app_now()
);
create index pagamentos_recebidos_parcela on pagamentos_recebidos (escritorio_id, parcela_id);
create index pagamentos_recebidos_dia on pagamentos_recebidos (escritorio_id, recebido_em);
call proteger_tabela_escritorio('pagamentos_recebidos');

-- O recibo do recebimento (FI-14): número em sequência por escritório e ano.
create table recibos (
  id             uuid primary key default gen_random_uuid(),
  escritorio_id  uuid not null references escritorios (id) on delete restrict,
  pagamento_id   uuid not null unique references pagamentos_recebidos (id) on delete restrict,
  ano            integer not null check (ano between 2000 and 2999),
  numero         integer not null check (numero >= 1),
  criado_em      timestamptz not null default app_now(),
  unique (escritorio_id, ano, numero)
);
call proteger_tabela_escritorio('recibos');

-- A cobrança de cada parcela (FI-04): ligações, mensagens e anotações, com o motivo do atraso
-- e a próxima ação. Só inserção; a última anotação é a que vale.
create table cobranca_eventos (
  id                  uuid primary key default gen_random_uuid(),
  ordem               bigint generated always as identity,
  escritorio_id       uuid not null references escritorios (id) on delete restrict,
  parcela_id          uuid not null references recebimentos_previstos (id) on delete restrict,
  tipo                text not null check (tipo in ('LIGACAO', 'MENSAGEM', 'ANOTACAO', 'PASSADA')),
  texto               text check (length(btrim(texto)) between 1 and 1000),
  motivo              text check (length(btrim(motivo)) between 3 and 300),
  prox_data           date not null,
  prox_oque           text not null check (length(btrim(prox_oque)) between 3 and 300),
  prox_responsavel_id uuid not null references pessoas (id) on delete restrict,
  autor_id            uuid not null references pessoas (id) on delete restrict,
  criado_em           timestamptz not null default app_now()
);
create index cobranca_eventos_parcela on cobranca_eventos (escritorio_id, parcela_id, ordem desc);
call proteger_tabela_escritorio('cobranca_eventos');

-- Dinheiro não se apaga nem se reescreve.
create function financeiro_so_acrescenta() returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'Registro do financeiro não se muda nem se apaga' using errcode = 'TC023';
end $$;
create trigger pagamentos_so_acrescenta before update or delete on pagamentos_recebidos
  for each row execute function financeiro_so_acrescenta();
create trigger recibos_so_acrescenta before update or delete on recibos
  for each row execute function financeiro_so_acrescenta();
create trigger cobranca_so_acrescenta before update or delete on cobranca_eventos
  for each row execute function financeiro_so_acrescenta();

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('pagamentos_recebidos', false, 'Recebimentos de cada parcela: valor, multa e juros, dia em que o dinheiro entrou, forma e quem registrou', null, null, null, null, null, null, true),
 ('recibos', false, 'Número do recibo de cada recebimento', null, null, null, null, null, null, true),
 ('cobranca_eventos', true,
  'Anotações de cobrança das parcelas: ligações, mensagens, motivo do atraso e a próxima ação',
  'Cobrar os honorários combinados em contrato (FI-04)',
  'Execução de contrato (LGPD, art. 7º, V)', 'Escritório',
  'Enquanto o escritório for cliente do T3jus',
  'Exportadas ao escritório e apagadas com ele', 'APROVADO', true);

-- Parcela já paga ou com dinheiro recebido não se cancela quando a condição muda.
create or replace function contrato_cancelar_futuros(p_escritorio uuid, p_contrato uuid, p_desde date, p_motivo text, p_tipos text[] default null) returns integer
language plpgsql
set search_path = public
as $$
declare v integer;
begin
  update recebimentos_previstos r set cancelado_em = app_now(), cancelado_motivo = p_motivo
   where r.escritorio_id = p_escritorio and r.contrato_id = p_contrato and r.cancelado_em is null and r.vencimento >= p_desde
     and (p_tipos is null or r.tipo = any (p_tipos))
     and not exists (select 1 from bases_mensais b where b.recebimento_id = r.id)
     and not exists (select 1 from pagamentos_recebidos p where p.parcela_id = r.id);
  get diagnostics v = row_count;
  return v;
end $$;

-- ---------------------------------------------------------------------------------------
-- Peças.

-- O que já entrou numa parcela (sem multa e juros).
create function parcela_recebido(p_parcela uuid) returns bigint
language sql stable
set search_path = public
as $$ select coalesce(sum(valor), 0)::bigint from pagamentos_recebidos where parcela_id = p_parcela $$;

-- A situação da parcela: CANCELADA, PAGA, VENCIDA, PARCIAL ou A_VENCER.
create function parcela_situacao(r recebimentos_previstos, p_recebido bigint) returns text
language sql stable
set search_path = public
as $$
  select case when r.cancelado_em is not null then 'CANCELADA'
              when p_recebido >= r.valor then 'PAGA'
              when r.vencimento < hoje_brasilia() then 'VENCIDA'
              when p_recebido > 0 then 'PARCIAL'
              else 'A_VENCER' end
$$;

-- A última anotação de cobrança da parcela.
create function parcela_cobranca(p_parcela uuid) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object('tipo', e.tipo, 'texto', e.texto, 'motivo', e.motivo,
           'motivoDesde', (select m.criado_em from cobranca_eventos m where m.parcela_id = e.parcela_id and m.motivo is not null order by m.ordem desc limit 1),
           'proxData', e.prox_data, 'proxOque', e.prox_oque, 'proxResponsavel', pessoa_ref(e.prox_responsavel_id),
           'autor', pessoa_ref(e.autor_id), 'em', e.criado_em)
    from cobranca_eventos e where e.parcela_id = p_parcela order by e.ordem desc limit 1
$$;

-- Uma parcela na lista de A receber e na ficha.
create function parcela_linha(r recebimentos_previstos) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', r.id, 'tipo', r.tipo, 'descricao', r.descricao, 'vencimento', r.vencimento, 'valor', r.valor,
    'recebido', x.rec, 'falta', greatest(r.valor - x.rec, 0), 'forma', r.forma,
    'situacao', parcela_situacao(r, x.rec),
    'pagaEm', (select max(p.recebido_em) from pagamentos_recebidos p where p.parcela_id = r.id),
    'contrato', jsonb_build_object('id', c.id, 'numero', c.numero, 'objeto', c.objeto),
    'cliente', jsonb_build_object('id', k.id, 'nome', k.nome),
    'responsavel', pessoa_ref(c.responsavel_id),
    'cobranca', parcela_cobranca(r.id),
    'cancelado', case when r.cancelado_em is not null then jsonb_build_object('em', r.cancelado_em, 'motivo', r.cancelado_motivo) end)
    from (select parcela_recebido(r.id) rec) x
    join contratos c on c.id = r.contrato_id
    join clientes_escritorio k on k.id = c.cliente_id
$$;

-- ---------------------------------------------------------------------------------------
-- Leituras.

-- A receber: os quatro números do alto (que também são os filtros) e a lista.
create function portal_financeiro_receber(p_pessoa uuid, p_escritorio uuid, p_mostrar text default 'ABERTO', p_q text default null,
                                          p_responsavel uuid default null, p_forma text default null) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hoje date := hoje_brasilia();
  v_mes date := date_trunc('month', hoje_brasilia())::date;
  v_q text := lower(btrim(coalesce(p_q, '')));
  v_padrao text;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.ver');
  if coalesce(p_mostrar, 'ABERTO') not in ('ABERTO', 'VENCIDAS', 'SETE_DIAS', 'RECEBIDO_MES') then perform recusar_campos('Filtro inválido', 'mostrar'); end if;
  if p_forma is not null and not forma_pagamento_valida(p_forma) then perform recusar_campos('Forma inválida', 'forma'); end if;
  if length(v_q) > 120 then perform recusar_campos('Busca longa demais', 'q'); end if;
  v_padrao := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  return (
    with ps as (
      select r.*, parcela_recebido(r.id) rec, c.responsavel_id, k.nome cliente_nome, c.numero, c.objeto
        from recebimentos_previstos r
        join contratos c on c.id = r.contrato_id and c.estado in ('ATIVO', 'ENCERRADO')
        join clientes_escritorio k on k.id = c.cliente_id
       where r.escritorio_id = p_escritorio and r.cancelado_em is null and r.valor is not null
    ), abertas as (
      select * from ps where rec < valor
    ), mes as (
      select ps.*, (select sum(p.valor) from pagamentos_recebidos p where p.parcela_id = ps.id and p.recebido_em >= v_mes) no_mes
        from ps where exists (select 1 from pagamentos_recebidos p where p.parcela_id = ps.id and p.recebido_em >= v_mes)
    ), filtradas as (
      select * from (
        select a.*, null::bigint no_mes from abertas a
         where p_mostrar is distinct from 'RECEBIDO_MES'
           and (coalesce(p_mostrar, 'ABERTO') = 'ABERTO'
                or (p_mostrar = 'VENCIDAS' and a.vencimento < v_hoje)
                or (p_mostrar = 'SETE_DIAS' and a.vencimento between v_hoje and v_hoje + 7))
        union all
        select m.* from mes m where p_mostrar = 'RECEBIDO_MES') f
       where (v_q = '' or lower(f.cliente_nome) like v_padrao escape '\' or lower(f.numero) like v_padrao escape '\' or lower(f.objeto) like v_padrao escape '\')
         and (p_responsavel is null or f.responsavel_id = p_responsavel)
         and (p_forma is null or f.forma = p_forma)
    )
    select jsonb_build_object(
      'algum', exists (select 1 from ps),
      'contratos', exists (select 1 from contratos where escritorio_id = p_escritorio and estado = 'ATIVO'),
      'totais', jsonb_build_object(
        'aberto', jsonb_build_object('valor', (select coalesce(sum(valor - rec), 0) from abertas), 'n', (select count(*) from abertas)),
        'vencidas', jsonb_build_object('valor', (select coalesce(sum(valor - rec), 0) from abertas where vencimento < v_hoje), 'n', (select count(*) from abertas where vencimento < v_hoje)),
        'seteDias', jsonb_build_object('valor', (select coalesce(sum(valor - rec), 0) from abertas where vencimento between v_hoje and v_hoje + 7),
                                       'n', (select count(*) from abertas where vencimento between v_hoje and v_hoje + 7)),
        'recebidoMes', jsonb_build_object('valor', (select coalesce(sum(no_mes), 0) from mes), 'n', (select count(*) from mes))),
      'responsaveis', coalesce((select jsonb_agg(pessoa_ref(x.responsavel_id) order by x.responsavel_id)
                                  from (select distinct responsavel_id from ps) x), '[]'::jsonb),
      'parcelas', coalesce((
        select jsonb_agg(parcela_linha(r) || jsonb_build_object('noMes', f.no_mes)
                         order by case when p_mostrar = 'RECEBIDO_MES' then null else f.vencimento end, f.vencimento desc, f.cliente_nome, f.descricao)
          from filtradas f join recebimentos_previstos r on r.id = f.id), '[]'::jsonb))
  );
end $$;

-- A ficha de parcelas de um contrato (decisão 6).
create function portal_financeiro_contrato(p_pessoa uuid, p_escritorio uuid, p_contrato uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c contratos;
  v_hoje date := hoje_brasilia();
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.ver');
  select * into c from contratos where id = p_contrato and escritorio_id = p_escritorio;
  if c.id is null or c.estado = 'ELABORACAO' then raise exception 'Contrato não encontrado' using errcode = 'TC404'; end if;
  return (
    with ps as (
      select r, parcela_recebido(r.id) rec from recebimentos_previstos r
       where r.contrato_id = c.id and r.valor is not null
    )
    select jsonb_build_object(
      'id', c.id, 'numero', c.numero, 'objeto', c.objeto, 'situacao', c.estado,
      'cliente', (select jsonb_build_object('id', k.id, 'nome', k.nome) from clientes_escritorio k where k.id = c.cliente_id),
      'responsavel', pessoa_ref(c.responsavel_id),
      'condicoes', honorario_lista(c.escritorio_id, 'CONTRATO', c.id),
      'totais', jsonb_build_object(
        'contratado', (select coalesce(sum((r).valor), 0) from ps where (r).cancelado_em is null),
        'recebido', (select coalesce(sum(rec), 0) from ps),
        'atraso', (select coalesce(sum((r).valor - rec), 0) from ps where (r).cancelado_em is null and rec < (r).valor and (r).vencimento < v_hoje),
        'aVencer', (select coalesce(sum((r).valor - rec), 0) from ps where (r).cancelado_em is null and rec < (r).valor and (r).vencimento >= v_hoje)),
      'aguardandoBase', (select count(*) from recebimentos_previstos r where r.contrato_id = c.id and r.valor is null and r.cancelado_em is null),
      'parcelas', coalesce((
        select jsonb_agg(parcela_linha(r) || jsonb_build_object(
                 'pagamentos', coalesce((
                   select jsonb_agg(jsonb_build_object('id', p.id, 'valor', p.valor, 'multaJuros', p.multa_juros, 'recebidoEm', p.recebido_em,
                                                       'forma', p.forma, 'autor', pessoa_ref(p.autor_id), 'em', p.criado_em,
                                                       'recibo', (select jsonb_build_object('ano', b.ano, 'numero', b.numero) from recibos b where b.pagamento_id = p.id))
                                    order by p.recebido_em, p.criado_em)
                     from pagamentos_recebidos p where p.parcela_id = r.id), '[]'::jsonb),
                 'eventos', coalesce((
                   select jsonb_agg(jsonb_build_object('tipo', e.tipo, 'texto', e.texto, 'motivo', e.motivo, 'proxData', e.prox_data,
                                                       'proxOque', e.prox_oque, 'proxResponsavel', pessoa_ref(e.prox_responsavel_id),
                                                       'autor', pessoa_ref(e.autor_id), 'em', e.criado_em) order by e.ordem desc)
                     from cobranca_eventos e where e.parcela_id = r.id), '[]'::jsonb))
               order by r.vencimento, r.descricao)
          from recebimentos_previstos r where r.contrato_id = c.id and r.valor is not null), '[]'::jsonb))
  );
end $$;

-- ---------------------------------------------------------------------------------------
-- Escritas.

-- Registrar recebimento (decisão 7): baixa a parcela do mês dela; o dinheiro conta no dia em
-- que entrou. Gera o número do recibo quando pedido.
create function portal_financeiro_receber_registrar(p_pessoa uuid, p_escritorio uuid, p_parcela uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r recebimentos_previstos;
  v_valor bigint := json_inteiro(p_dados, 'valor');
  v_multa bigint := json_inteiro(p_dados, 'multaJuros');
  v_dia date := json_data(p_dados, 'recebidoEm');
  v_forma text := p_dados ->> 'forma';
  v_recibo boolean := coalesce((p_dados ->> 'recibo')::boolean, false);
  v_rec bigint;
  v_id uuid;
  v_ano integer;
  v_num integer;
  e text[] := '{}';
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.editar');
  select * into r from recebimentos_previstos where id = p_parcela and escritorio_id = p_escritorio for update;
  if r.id is null or r.valor is null or not exists (select 1 from contratos c where c.id = r.contrato_id and c.estado in ('ATIVO', 'ENCERRADO')) then
    raise exception 'Parcela não encontrada' using errcode = 'TC404';
  end if;
  if r.cancelado_em is not null then perform recusar_motivo('Esta parcela foi cancelada', 'PARCELA_CANCELADA'); end if;
  v_rec := parcela_recebido(r.id);
  if v_rec >= r.valor then perform recusar_motivo('Esta parcela já está paga', 'PARCELA_JA_PAGA'); end if;
  if v_valor is null or v_valor < 1 then e := e || 'valor'::text;
  elsif v_valor > r.valor - v_rec then
    raise exception 'O valor passa do que falta na parcela' using errcode = 'TC422',
      detail = jsonb_build_object('motivo', 'VALOR_ACIMA_DO_SALDO', 'campos', jsonb_build_array('valor'), 'falta', r.valor - v_rec)::text;
  end if;
  if p_dados ? 'multaJuros' and p_dados -> 'multaJuros' <> 'null'::jsonb and coalesce(v_multa, 0) not between 1 and 10000000000 then e := e || 'multaJuros'::text; end if;
  if v_dia is null or v_dia < date '2000-01-01' then e := e || 'recebidoEm'::text;
  elsif v_dia > hoje_brasilia() then
    raise exception 'O dia em que o dinheiro entrou não pode ser depois de hoje' using errcode = 'TC422',
      detail = jsonb_build_object('motivo', 'DATA_NO_FUTURO', 'campos', jsonb_build_array('recebidoEm'))::text;
  end if;
  if not coalesce(forma_pagamento_valida(v_forma), false) then e := e || 'forma'::text; end if;
  if cardinality(e) > 0 then perform recusar_campos('Confira o recebimento', variadic (select array_agg(v order by v) from unnest(e) v)); end if;

  insert into pagamentos_recebidos (escritorio_id, parcela_id, valor, multa_juros, recebido_em, forma, autor_id)
  values (p_escritorio, r.id, v_valor, v_multa, v_dia, v_forma, p_pessoa) returning id into v_id;
  if r.forma is null then update recebimentos_previstos set forma = v_forma where id = r.id; end if;
  if v_recibo then
    v_ano := extract(year from hoje_brasilia())::integer;
    perform pg_advisory_xact_lock(hashtext('recibo:' || p_escritorio::text || ':' || v_ano));
    select coalesce(max(numero), 0) + 1 into v_num from recibos where escritorio_id = p_escritorio and ano = v_ano;
    insert into recibos (escritorio_id, pagamento_id, ano, numero) values (p_escritorio, v_id, v_ano, v_num);
  end if;
  perform registrar_historico('financeiro.recebimento', 'recebimentos_previstos', r.id::text,
    jsonb_build_object('pagamento', v_id, 'valor', v_valor, 'multaJuros', v_multa, 'recebidoEm', v_dia, 'forma', v_forma, 'recibo', v_num));
  return jsonb_build_object('id', v_id, 'paga', v_rec + v_valor >= r.valor, 'falta', greatest(r.valor - v_rec - v_valor, 0),
                            'recibo', case when v_num is not null then jsonb_build_object('ano', v_ano, 'numero', v_num) end);
end $$;

-- Anotar cobrança (FI-04): o que foi feito, o motivo do atraso e a próxima ação, sempre com
-- data e responsável. Pode também anotar a forma combinada da parcela.
create function portal_financeiro_cobranca_anotar(p_pessoa uuid, p_escritorio uuid, p_parcela uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r recebimentos_previstos;
  v_tipo text := p_dados ->> 'tipo';
  v_texto text := nullif(btrim(coalesce(p_dados ->> 'texto', '')), '');
  v_motivo text := nullif(btrim(coalesce(p_dados ->> 'motivo', '')), '');
  v_data date := json_data(p_dados, 'proxData');
  v_oque text := nullif(btrim(coalesce(p_dados ->> 'proxOque', '')), '');
  v_resp uuid;
  v_forma text := nullif(p_dados ->> 'forma', '');
  v_id uuid;
  e text[] := '{}';
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.editar');
  select * into r from recebimentos_previstos where id = p_parcela and escritorio_id = p_escritorio for update;
  if r.id is null or r.valor is null or not exists (select 1 from contratos c where c.id = r.contrato_id and c.estado in ('ATIVO', 'ENCERRADO')) then
    raise exception 'Parcela não encontrada' using errcode = 'TC404';
  end if;
  if r.cancelado_em is not null then perform recusar_motivo('Esta parcela foi cancelada', 'PARCELA_CANCELADA'); end if;
  if parcela_recebido(r.id) >= r.valor then perform recusar_motivo('Esta parcela já está paga', 'PARCELA_JA_PAGA'); end if;
  begin v_resp := nullif(p_dados ->> 'proxResponsavelId', '')::uuid; exception when others then v_resp := null; end;
  if coalesce(v_tipo, '') not in ('LIGACAO', 'MENSAGEM', 'ANOTACAO') then e := e || 'tipo'::text; end if;
  if v_texto is not null and length(v_texto) > 1000 then e := e || 'texto'::text; end if;
  if v_motivo is not null and length(v_motivo) not between 3 and 300 then e := e || 'motivo'::text; end if;
  if r.vencimento < hoje_brasilia() and v_motivo is null and parcela_cobranca(r.id) ->> 'motivo' is null then e := e || 'motivo'::text; end if;
  if v_data is null or v_data < hoje_brasilia() then e := e || 'proxData'::text; end if;
  if v_oque is null or length(v_oque) not between 3 and 300 then e := e || 'proxOque'::text; end if;
  if v_resp is null or not pessoa_do_escritorio(v_resp, p_escritorio) then e := e || 'proxResponsavelId'::text; end if;
  if v_forma is not null and not forma_pagamento_valida(v_forma) then e := e || 'forma'::text; end if;
  if cardinality(e) > 0 then
    raise exception 'Confira a cobrança' using errcode = 'TC422',
      detail = jsonb_build_object('motivo', case when e && array['proxData', 'proxOque', 'proxResponsavelId'] then 'PROXIMA_ACAO_OBRIGATORIA' end,
                                  'campos', (select jsonb_agg(distinct v order by v) from unnest(e) v))::text;
  end if;
  insert into cobranca_eventos (escritorio_id, parcela_id, tipo, texto, motivo, prox_data, prox_oque, prox_responsavel_id, autor_id)
  values (p_escritorio, r.id, v_tipo, v_texto, v_motivo, v_data, v_oque, v_resp, p_pessoa) returning id into v_id;
  if v_forma is not null and v_forma is distinct from r.forma then update recebimentos_previstos set forma = v_forma where id = r.id; end if;
  perform registrar_historico('financeiro.cobranca', 'recebimentos_previstos', r.id::text,
    jsonb_build_object('evento', v_id, 'tipo', v_tipo, 'motivo', v_motivo, 'proxData', v_data, 'proxResponsavel', v_resp));
  return jsonb_build_object('id', v_id);
end $$;

-- Quem saiu da equipe passa as próximas ações de cobrança que eram dele (EX-10): a
-- anotação nova repete o que fazer e muda só o responsável.
create function cobranca_passar_de_quem_saiu() returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_de uuid := (new.dados ->> 'pessoa_id')::uuid;
  v_para uuid := (new.dados ->> 'passou_para')::uuid;
  x record;
begin
  if v_de is null or v_para is null then return new; end if;
  for x in
    select distinct on (e.parcela_id) e.*
      from cobranca_eventos e
     where e.escritorio_id = new.escritorio_id
     order by e.parcela_id, e.ordem desc
  loop
    if x.prox_responsavel_id = v_de then
      insert into cobranca_eventos (escritorio_id, parcela_id, tipo, texto, prox_data, prox_oque, prox_responsavel_id, autor_id)
      values (x.escritorio_id, x.parcela_id, 'PASSADA', 'Próxima ação passada a quem ficou com o trabalho de quem saiu da equipe.',
              greatest(x.prox_data, hoje_brasilia()), x.prox_oque, v_para, v_para);
    end if;
  end loop;
  return new;
end $$;
create trigger cobranca_passar_de_quem_saiu after insert on historico
  for each row when (new.acao = 'equipe.retirada') execute function cobranca_passar_de_quem_saiu();

call fechar_acesso();
