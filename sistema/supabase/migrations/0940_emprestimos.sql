-- 0940 · Empréstimos no Financeiro (F3.51; FI-20). Desenho aprovado pela Carol em 22/11/2026, em
-- docs/design/aprovadas/portal-financeiro-emprestimos (PLANO.md, versão 3, e NOTAS.md).
-- - O empréstimo fica à parte, como os valores de terceiros: o dinheiro emprestado, de banco, de sócio
--   ou de outra pessoa, entra no saldo do Caixa do escritório, mas não conta como receita (fica fora
--   do Resumo, dos relatórios do sócio e do Início).
-- - As parcelas nascem todas no registro, como contas de A pagar da categoria Empréstimos, e saem do
--   caixa quando forem pagas, pelo "Marcar paga" de sempre. Sem parcelas fixas (o caso do sócio que
--   "devolve quando der"), cada devolução nasce já paga.
-- - O empréstimo anterior ao T3jus não soma no saldo: valem só as parcelas que faltam. Com saldo de
--   abertura, quem decide é a abertura (emprestimo_conta_no_caixa).
-- - Nada se apaga: "Lançado errado" (cancelar) só sem nada pago; "Encerrar as parcelas que faltam"
--   cancela as parcelas em aberto e mantém o que entrou e o que foi pago. Os dois pedem motivo.
-- - Quem tem a área Financeiro vê tudo, registra, devolve, encerra e cancela (respostas da Carol).
-- O saldo com os empréstimos, o Caixa, os Ajustes e a exportação para o contador estão na 0941, que se
-- aplica junto com esta.

-- ---------------------------------------------------------------------------------------
-- A categoria Empréstimos, no fim da lista (a função está nos CHECKs: só se acrescenta).

create or replace function categoria_saida_valida(p text) returns boolean
language sql immutable
as $$ select p in ('RETIRADAS', 'PESSOAL', 'ALUGUEL', 'IMPOSTOS', 'CUSTAS', 'FORNECEDORES', 'TAXAS', 'OUTRAS', 'EMPRESTIMOS') $$;

-- A parcela de empréstimo nasce do empréstimo, nunca de uma conta que repete.
alter table contas_recorrentes add constraint contas_recorrentes_sem_emprestimo check (categoria <> 'EMPRESTIMOS');

-- ---------------------------------------------------------------------------------------
-- O empréstimo recebido. Sempre do caixa do escritório, nunca de terceiros.

create table emprestimos (
  id                uuid primary key default gen_random_uuid(),
  escritorio_id     uuid not null references escritorios (id) on delete restrict,
  credor_tipo       text not null check (credor_tipo in ('BANCO', 'SOCIO', 'OUTRO')),
  credor_nome       text not null check (length(btrim(credor_nome)) between 2 and 120),
  finalidade        text check (length(btrim(finalidade)) between 3 and 120),
  valor             bigint not null check (valor between 1 and 10000000000),
  valor_contrato    bigint check (valor_contrato between 1 and 10000000000),
  recebido_em       date not null,
  forma             text check (forma is null or forma_pagamento_valida(forma)),
  -- Gravado no registro: entra no caixa se o dinheiro entrou a partir do começo do caixa no T3jus.
  -- Com saldo de abertura, vale a abertura (emprestimo_conta_no_caixa).
  no_caixa          boolean not null,
  devolucao         text not null check (devolucao in ('PARCELAS', 'LIVRE')),
  parcelas_total    integer check (parcelas_total between 1 and 120),
  parcelas_antes    integer not null default 0 check (parcelas_antes >= 0),
  parcela_valor     bigint check (parcela_valor between 1 and 10000000000),
  encerrado_em      timestamptz,
  encerrado_por     uuid references pessoas (id) on delete restrict,
  encerrado_motivo  text check (length(btrim(encerrado_motivo)) between 5 and 300),
  cancelado_em      timestamptz,
  cancelado_por     uuid references pessoas (id) on delete restrict,
  cancelado_motivo  text check (length(btrim(cancelado_motivo)) between 5 and 300),
  autor_id          uuid not null references pessoas (id) on delete restrict,
  criado_em         timestamptz not null default app_now(),
  unique (escritorio_id, id),
  check ((devolucao = 'PARCELAS') = (parcelas_total is not null) and (parcelas_total is null) = (parcela_valor is null)),
  check (devolucao = 'PARCELAS' and parcelas_antes < parcelas_total or devolucao = 'LIVRE' and parcelas_antes = 0),
  check ((cancelado_em is null) = (cancelado_por is null) and (cancelado_em is null) = (cancelado_motivo is null)),
  check ((encerrado_em is null) = (encerrado_por is null) and (encerrado_em is null) = (encerrado_motivo is null)),
  check (cancelado_em is null or encerrado_em is null)
);
create index emprestimos_escritorio on emprestimos (escritorio_id, recebido_em);
call proteger_tabela_escritorio('emprestimos');

-- Não se apaga; só ganha, uma vez, o cancelamento ou o encerramento. O fim da guarda (0540) desliga
-- os gatilhos de usuário, então este não atrapalha o apagamento.
create function emprestimos_guardiao() returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_livres text[] := array['cancelado_em', 'cancelado_por', 'cancelado_motivo', 'encerrado_em', 'encerrado_por', 'encerrado_motivo'];
begin
  if tg_op = 'DELETE' then
    raise exception 'Empréstimo não se apaga' using errcode = 'TC023';
  end if;
  if old.cancelado_em is not null or old.encerrado_em is not null
     or (to_jsonb(old) - v_livres) <> (to_jsonb(new) - v_livres) then
    raise exception 'Empréstimo só se encerra ou se cancela, uma vez' using errcode = 'TC023';
  end if;
  return new;
end $$;
create trigger emprestimos_guardiao before update or delete on emprestimos
  for each row execute function emprestimos_guardiao();

-- As parcelas e as devoluções são contas de A pagar da categoria Empréstimos, ligadas ao
-- empréstimo do mesmo escritório (a chave composta fecha o isolamento no banco).
alter table contas_pagar
  add column emprestimo_id      uuid,
  add column emprestimo_parcela integer check (emprestimo_parcela between 1 and 120),
  add constraint contas_pagar_emprestimo_do_escritorio foreign key (escritorio_id, emprestimo_id) references emprestimos (escritorio_id, id),
  add constraint contas_pagar_emprestimo_categoria check ((categoria = 'EMPRESTIMOS') = (emprestimo_id is not null)),
  add constraint contas_pagar_emprestimo_parcela check (emprestimo_parcela is null or emprestimo_id is not null);
create unique index contas_pagar_emprestimo_parcela_unica on contas_pagar (emprestimo_id, emprestimo_parcela);
create index contas_pagar_emprestimo on contas_pagar (escritorio_id, emprestimo_id) where emprestimo_id is not null;

-- O texto de prazo e de fim é o já aprovado para as tabelas do financeiro (o mesmo de
-- exportacoes_contador; precedentes: 0556, 0557 e 0621). O nome do credor pode ser de pessoa física.
insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('emprestimos', true,
  'Empréstimos recebidos pelo escritório (banco, sócio ou outra pessoa): de quem, quanto entrou, quando, como volta e o encerramento ou cancelamento com motivo',
  'Somar o empréstimo no saldo do Caixa sem contar como receita e controlar as parcelas que faltam (FI-20)',
  'Execução de contrato (LGPD, art. 7º, V)', 'Escritório',
  'Enquanto o escritório for cliente do T3jus e 5 anos depois do fim do contrato', 'Exportadas ao escritório e apagadas com ele', 'APROVADO', true);

-- ---------------------------------------------------------------------------------------
-- Peças. Recebem o escritório já conferido pela leitura que as chama.

-- O dia de um momento no horário de Brasília.
create function dia_brasilia(p timestamptz) returns date
language sql immutable
as $$ select (p at time zone 'America/Sao_Paulo')::date $$;

-- O primeiro lançamento do escritório, lido das tabelas da base, como os Ajustes (0556): recebimentos,
-- contas pagas fora da categoria Empréstimos e honorários transferidos. Não usa o que a 0941 passa a
-- calcular com os empréstimos, para não depender do próprio resultado.
create function emprestimo_primeiro_lancamento(p_escritorio uuid) returns date
language sql stable
set search_path = public
as $$
  select least(
    (select min(recebido_em) from pagamentos_recebidos where escritorio_id = p_escritorio),
    (select min(paga_em) from contas_pagar where escritorio_id = p_escritorio and categoria <> 'EMPRESTIMOS'),
    (select min(d.feito_em) from destinacoes d where d.escritorio_id = p_escritorio and destinacao_do_escritorio(d.para)))
$$;

-- O dia a partir do qual um empréstimo entra no caixa: com saldo de abertura, o dia seguinte ao dela;
-- sem, o menor entre o primeiro lançamento e o dia em que o escritório foi cadastrado.
create function emprestimo_comeco_caixa(p_escritorio uuid) returns date
language sql stable
set search_path = public
as $$
  select coalesce(
    (select a.data + 1 from saldos_abertura a where a.escritorio_id = p_escritorio and a.substituido_em is null),
    least(emprestimo_primeiro_lancamento(p_escritorio),
          (select dia_brasilia(x.criado_em) from escritorios x where x.id = p_escritorio)))
$$;

-- Conta no caixa: não cancelado e (gravado no caixa ou, com saldo de abertura, entrou depois dela).
-- A peça vale em emprestimos_entrou, em ajuste_abertura (0941) e no selo "anterior ao T3jus".
create function emprestimo_conta_no_caixa(e emprestimos) returns boolean
language sql stable
set search_path = public
as $$
  select e.cancelado_em is null
     and (e.no_caixa or exists (select 1 from saldos_abertura a
                                 where a.escritorio_id = e.escritorio_id and a.substituido_em is null and e.recebido_em > a.data))
$$;

-- O que entrou de empréstimo no caixa entre dois dias.
create function emprestimos_entrou(p_escritorio uuid, p_de date, p_ate date) returns bigint
language sql stable
set search_path = public
as $$
  select coalesce(sum(e.valor), 0)::bigint from emprestimos e
   where e.escritorio_id = p_escritorio and e.recebido_em between p_de and p_ate and emprestimo_conta_no_caixa(e)
$$;

-- O que saiu do caixa em parcelas e devoluções de empréstimo entre dois dias (já está em caixa_saidas).
create function emprestimo_parcelas_pagas(p_escritorio uuid, p_de date, p_ate date) returns bigint
language sql stable
set search_path = public
as $$
  select coalesce(sum(c.valor_pago), 0)::bigint from contas_pagar c
   where c.escritorio_id = p_escritorio and c.categoria = 'EMPRESTIMOS' and c.paga_em between p_de and p_ate
$$;

-- As parcelas que vencem no mês, pelo mesmo critério de saidas_previstas (0534): não canceladas e, com
-- p_so_falta, só as que não foram pagas.
create function emprestimo_parcelas_previstas(p_escritorio uuid, p_mes date, p_so_falta boolean) returns bigint
language sql stable
set search_path = public
as $$
  select coalesce(sum(c.valor), 0)::bigint from contas_pagar c
   where c.escritorio_id = p_escritorio and c.categoria = 'EMPRESTIMOS'
     and c.vencimento between p_mes and (p_mes + interval '1 month')::date - 1
     and c.cancelada_em is null and (not p_so_falta or c.paga_em is null)
$$;

-- O vencimento da parcela n, quando a próxima a pagar (a parcelas_antes + 1) vence em p_proximo: no
-- mesmo dia dos meses seguintes, ou no último dia de um mês mais curto (vencimento_no_mes, 0230).
create function emprestimo_vencimento(p_proximo date, p_antes integer, p_n integer) returns date
language sql immutable
set search_path = public
as $$
  select vencimento_no_mes((date_trunc('month', p_proximo) + make_interval(months => p_n - p_antes - 1))::date,
                           extract(day from p_proximo)::integer)
$$;

-- A situação de um empréstimo no fim de um dia: o que já foi pago (antes do T3jus, estimado pelo valor
-- da parcela, e no T3jus), o que falta, as parcelas, o custo (total das parcelas menos o que entrou;
-- sem parcelas fixas, o que foi devolvido além do que entrou) e a situação. A ficha usa hoje; a
-- exportação para o contador, o último dia do mês exportado.
create function emprestimo_situacao_em(e emprestimos, p_dia date) returns jsonb
language sql stable
set search_path = public
as $$
  with c as (
    select x.*, x.paga_em is not null and x.paga_em <= p_dia as paga,
           x.cancelada_em is not null and dia_brasilia(x.cancelada_em) <= p_dia as cancelada
      from contas_pagar x where x.escritorio_id = e.escritorio_id and x.emprestimo_id = e.id
  ), q as (
    select coalesce(sum(valor_pago) filter (where paga), 0)::bigint pago,
           count(*) filter (where paga and emprestimo_parcela is not null)::integer pagas,
           count(*) filter (where paga and emprestimo_parcela is null)::integer devolucoes,
           coalesce(sum(valor) filter (where emprestimo_parcela is not null and not paga and not cancelada), 0)::bigint aberto,
           count(*) filter (where emprestimo_parcela is not null and not paga and not cancelada)::integer abertas,
           coalesce(sum(valor) filter (where emprestimo_parcela is not null and not paga and cancelada), 0)::bigint cancelado_valor,
           count(*) filter (where emprestimo_parcela is not null and not paga and cancelada)::integer canceladas,
           max(vencimento) filter (where emprestimo_parcela is not null and not cancelada) termina,
           max(paga_em) filter (where paga) ultimo
      from c
  ), s as (
    select q.*,
           case when e.devolucao = 'PARCELAS' then e.parcelas_antes * e.parcela_valor else 0 end::bigint antes,
           e.cancelado_em is not null and dia_brasilia(e.cancelado_em) <= p_dia as cancelado,
           e.encerrado_em is not null and dia_brasilia(e.encerrado_em) <= p_dia as encerrado
      from q
  )
  select jsonb_build_object(
    'dia', p_dia,
    'situacao', case when s.cancelado then 'CANCELADO'
                     when s.encerrado then 'ENCERRADO'
                     when e.devolucao = 'PARCELAS' and s.abertas = 0 then 'QUITADO'
                     when e.devolucao = 'LIVRE' and s.pago >= e.valor then 'QUITADO'
                     else 'ATIVO' end,
    'pagoAntes', s.antes,
    'pagoNoT3jus', s.pago,
    'jaPago', s.antes + s.pago,
    'faltaPagar', case when s.cancelado or s.encerrado then 0
                       when e.devolucao = 'PARCELAS' then s.aberto
                       else greatest(e.valor - s.pago, 0) end,
    'faltaDevolver', case when e.devolucao = 'LIVRE' then
                       case when s.cancelado or s.encerrado then 0 else greatest(e.valor - s.pago, 0) end end,
    'naoDevolvido', case when e.devolucao = 'LIVRE' and s.encerrado and e.valor > s.pago then e.valor - s.pago end,
    'parcelasPagas', case when e.devolucao = 'PARCELAS' then e.parcelas_antes + s.pagas end,
    'parcelasAbertas', case when e.devolucao = 'PARCELAS' then s.abertas end,
    'canceladas', case when s.canceladas > 0 then jsonb_build_object('n', s.canceladas, 'valor', s.cancelado_valor) end,
    'devolucoes', case when e.devolucao = 'LIVRE' then s.devolucoes end,
    'proxima', (select jsonb_build_object('id', c.id, 'n', c.emprestimo_parcela, 'vencimento', c.vencimento, 'valor', c.valor)
                  from c where c.emprestimo_parcela is not null and not c.paga and not c.cancelada
                 order by c.vencimento, c.emprestimo_parcela limit 1),
    'terminaEm', s.termina,
    'ultimoPagamento', s.ultimo,
    'totalParcelas', case when e.devolucao = 'PARCELAS' then s.antes + s.pago + s.aberto end,
    'custo', case when e.devolucao = 'PARCELAS' then s.antes + s.pago + s.aberto - e.valor
                  else greatest(s.pago - e.valor, 0) end)
    from s
$$;

-- Por que o empréstimo está fora do caixa: entrou até o saldo de abertura (já está nele) ou antes do
-- começo do caixa no T3jus. Nulo quando conta no caixa ou foi cancelado.
create function emprestimo_fora_do_caixa(e emprestimos) returns text
language sql stable
set search_path = public
as $$
  select case when e.cancelado_em is not null or emprestimo_conta_no_caixa(e) then null
              when exists (select 1 from saldos_abertura a where a.escritorio_id = e.escritorio_id and a.substituido_em is null
                              and e.recebido_em <= a.data) then 'ANTES_DA_ABERTURA'
              else 'ANTES_DO_T3JUS' end
$$;

-- O empréstimo como a folha do Caixa, a ficha e a resposta do registro mostram.
create function emprestimo_linha(e emprestimos) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', e.id, 'credorTipo', e.credor_tipo, 'credor', e.credor_nome, 'finalidade', e.finalidade,
    'valor', e.valor, 'valorContrato', e.valor_contrato,
    'iofTarifas', case when e.valor_contrato is not null then e.valor_contrato - e.valor end,
    'recebidoEm', e.recebido_em, 'forma', e.forma, 'devolucao', e.devolucao,
    'parcelasTotal', e.parcelas_total, 'parcelasAntes', e.parcelas_antes, 'parcelaValor', e.parcela_valor,
    'noCaixa', emprestimo_conta_no_caixa(e),
    'anteriorAoT3jus', emprestimo_fora_do_caixa(e) is not null,
    'foraDoCaixa', emprestimo_fora_do_caixa(e),
    'registrado', jsonb_build_object('em', e.criado_em, 'por', pessoa_ref(e.autor_id)),
    'encerrado', case when e.encerrado_em is not null then
      jsonb_build_object('em', e.encerrado_em, 'por', pessoa_ref(e.encerrado_por), 'motivo', e.encerrado_motivo) end,
    'cancelado', case when e.cancelado_em is not null then
      jsonb_build_object('em', e.cancelado_em, 'por', pessoa_ref(e.cancelado_por), 'motivo', e.cancelado_motivo) end,
    'situacao', emprestimo_situacao_em(e, hoje_brasilia()))
$$;

-- A conta (0534) com o selo do empréstimo: "Empréstimo · 3/24", com o link para a ficha.
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
      'como', c.reembolso_como, 'reembolsadoEm', c.reembolsado_em, 'parcela', conta_parcela_reembolso(c)) end,
    'emprestimo', case when c.emprestimo_id is not null then
      (select jsonb_build_object('id', e.id, 'parcela', c.emprestimo_parcela, 'total', e.parcelas_total,
                                 'credor', e.credor_nome, 'credorTipo', e.credor_tipo, 'devolucao', c.emprestimo_parcela is null)
         from emprestimos e where e.id = c.emprestimo_id) end)
$$;

-- ---------------------------------------------------------------------------------------
-- API. Quem tem a área Financeiro vê tudo e mexe em tudo (respostas da Carol); as funções que gravam
-- conferem financeiro.editar mesmo assim, para quando surgir um papel só de leitura.

-- POST /v1/escritorio/financeiro/emprestimos. Os campos têm os nomes da tela. Em parcelas, nascem em
-- A pagar só as que faltam (de parcelasAntes + 1 até o total), com o valor de "parcelas" quando vier.
create function portal_financeiro_emprestimo_registrar(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tipo text := p_dados ->> 'credorTipo';
  v_nome text := nullif(btrim(coalesce(p_dados ->> 'credorNome', '')), '');
  v_fin text := nullif(btrim(coalesce(p_dados ->> 'finalidade', '')), '');
  v_valor bigint := json_inteiro(p_dados, 'valor');
  v_contrato bigint := json_inteiro(p_dados, 'valorContrato');
  v_dia date := json_data(p_dados, 'recebidoEm');
  v_forma text := nullif(p_dados ->> 'forma', '');
  v_modo text := p_dados ->> 'devolucao';
  v_total bigint := json_inteiro(p_dados, 'parcelasTotal');
  v_antes bigint := coalesce(json_inteiro(p_dados, 'parcelasAntes'), case when p_dados -> 'parcelasAntes' is null
                                                                              or jsonb_typeof(p_dados -> 'parcelasAntes') = 'null' then 0 end);
  v_pval bigint := json_inteiro(p_dados, 'parcelaValor');
  v_prox date := json_data(p_dados, 'proximoVencimento');
  v_lista jsonb := p_dados -> 'parcelas';
  v_hoje date := hoje_brasilia();
  v_parcelas_ok boolean := false;
  v_id uuid;
  v_n integer := 0;
  e emprestimos;
  err text[] := '{}';
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.editar');
  if v_lista is not null and jsonb_typeof(v_lista) = 'null' then v_lista := null; end if;

  if coalesce(v_tipo, '') not in ('BANCO', 'SOCIO', 'OUTRO') then err := err || 'credorTipo'::text; end if;
  if v_nome is null or length(v_nome) not between 2 and 120 then err := err || 'credorNome'::text; end if;
  if v_fin is not null and length(v_fin) not between 3 and 120 then err := err || 'finalidade'::text; end if;
  if v_valor is null or v_valor not between 1 and 10000000000 then err := err || 'valor'::text; end if;
  if v_dia is null or v_dia < date '2000-01-01' or v_dia > v_hoje then err := err || 'recebidoEm'::text; end if;
  if v_forma is not null and not forma_pagamento_valida(v_forma) then err := err || 'forma'::text; end if;
  if p_dados -> 'valorContrato' is not null and jsonb_typeof(p_dados -> 'valorContrato') <> 'null'
     and (v_contrato is null or v_contrato not between 1 and 10000000000) then
    err := err || 'valorContrato'::text;
  end if;
  if coalesce(v_modo, '') not in ('PARCELAS', 'LIVRE') then err := err || 'devolucao'::text; end if;

  if v_modo = 'PARCELAS' then
    if v_total is null or v_total not between 1 and 120 then err := err || 'parcelasTotal'::text; end if;
    if v_pval is null or v_pval not between 1 and 10000000000 then err := err || 'parcelaValor'::text; end if;
    if v_antes is null or v_antes < 0 or (v_total between 1 and 120 and v_antes >= v_total) then err := err || 'parcelasAntes'::text; end if;
    v_parcelas_ok := coalesce(v_total between 1 and 120 and v_antes between 0 and v_total - 1, false);
    -- O vencimento da próxima parcela a pagar: não antes do dia em que o dinheiro entrou, e a última
    -- no máximo até hoje + 3650 dias, como em Lançar conta (C6).
    if v_prox is null or v_prox < date '2000-01-01' or (v_dia is not null and v_prox < v_dia)
       or (v_parcelas_ok and emprestimo_vencimento(v_prox, v_antes::integer, v_total::integer) > v_hoje + 3650) then
      err := err || 'proximoVencimento'::text;
    end if;
    -- Os valores de cada parcela, trocados antes de gravar (S2): os números certos, cada um uma vez.
    if v_lista is not null then
      if jsonb_typeof(v_lista) <> 'array' or not v_parcelas_ok then
        err := err || 'parcelas'::text;
      elsif jsonb_array_length(v_lista) <> v_total - v_antes
         or exists (select 1 from jsonb_array_elements(v_lista) x
                     where jsonb_typeof(x) <> 'object' or json_inteiro(x, 'n') is null or json_inteiro(x, 'valor') is null
                        or json_inteiro(x, 'valor') not between 1 and 10000000000)
         or (select array_agg(json_inteiro(x, 'n') order by json_inteiro(x, 'n')) from jsonb_array_elements(v_lista) x)
            is distinct from (select array_agg(g::bigint order by g) from generate_series(v_antes + 1, v_total) g) then
        err := err || 'parcelas'::text;
      end if;
    end if;
  end if;
  if cardinality(err) > 0 then perform recusar_campos('Confira o empréstimo', variadic err); end if;

  insert into emprestimos (escritorio_id, credor_tipo, credor_nome, finalidade, valor, valor_contrato, recebido_em, forma, no_caixa,
                           devolucao, parcelas_total, parcelas_antes, parcela_valor, autor_id)
  values (p_escritorio, v_tipo, v_nome, v_fin, v_valor, v_contrato, v_dia, v_forma, v_dia >= emprestimo_comeco_caixa(p_escritorio),
          v_modo, case when v_modo = 'PARCELAS' then v_total end, case when v_modo = 'PARCELAS' then v_antes else 0 end,
          case when v_modo = 'PARCELAS' then v_pval end, p_pessoa)
  returning id into v_id;

  if v_modo = 'PARCELAS' then
    insert into contas_pagar (escritorio_id, descricao, fornecedor, categoria, valor, vencimento, emprestimo_id, emprestimo_parcela, autor_id)
    select p_escritorio, 'Empréstimo ' || left(v_nome, 80) || ' · parcela ' || g || '/' || v_total, left(v_nome, 120), 'EMPRESTIMOS',
           coalesce((select json_inteiro(x, 'valor') from jsonb_array_elements(coalesce(v_lista, '[]'::jsonb)) x where json_inteiro(x, 'n') = g), v_pval),
           emprestimo_vencimento(v_prox, v_antes::integer, g), v_id, g, p_pessoa
      from generate_series(v_antes::integer + 1, v_total::integer) g;
    get diagnostics v_n = row_count;
  end if;

  select * into e from emprestimos where id = v_id;
  -- Sem o nome do credor no histórico (S10).
  perform registrar_historico('financeiro.emprestimo_registrado', 'emprestimos', v_id::text, jsonb_strip_nulls(jsonb_build_object(
    'credorTipo', v_tipo, 'valor', v_valor, 'recebidoEm', v_dia, 'devolucao', v_modo, 'noCaixa', e.no_caixa,
    'parcelas', case when v_modo = 'PARCELAS' then v_total end, 'parcelasAntes', case when v_modo = 'PARCELAS' then v_antes end,
    'parcelasCriadas', case when v_modo = 'PARCELAS' then v_n end)));
  return emprestimo_linha(e) || jsonb_build_object('parcelasCriadas', v_n);
end $$;

-- O empréstimo do escritório, para as ações; outro escritório ou id que não existe: TC404.
create function emprestimo_do_escritorio(p_escritorio uuid, p_emprestimo uuid, p_travar boolean default false) returns emprestimos
language plpgsql
set search_path = public
as $$
declare e emprestimos;
begin
  if p_travar then
    select * into e from emprestimos where id = p_emprestimo and escritorio_id = p_escritorio for update;
  else
    select * into e from emprestimos where id = p_emprestimo and escritorio_id = p_escritorio;
  end if;
  if e.id is null then raise exception 'Empréstimo não encontrado' using errcode = 'TC404'; end if;
  return e;
end $$;

-- GET /v1/escritorio/financeiro/emprestimos/:id: a ficha, com as parcelas (e o comprovante de cada
-- uma), as devoluções e o histórico.
create function portal_financeiro_emprestimo(p_pessoa uuid, p_escritorio uuid, p_emprestimo uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e emprestimos;
  v_contas uuid[];
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.ver');
  e := emprestimo_do_escritorio(p_escritorio, p_emprestimo);
  select coalesce(array_agg(c.id), '{}') into v_contas from contas_pagar c where c.escritorio_id = p_escritorio and c.emprestimo_id = e.id;
  return emprestimo_linha(e) || jsonb_build_object(
    'parcelas', coalesce((select jsonb_agg(conta_linha(c) || jsonb_build_object(
                             'n', c.emprestimo_parcela,
                             'anexos', (select count(*) from anexos a where a.conta_id = c.id and a.situacao = 'PRONTO'))
                           order by c.emprestimo_parcela)
                           from contas_pagar c where c.escritorio_id = p_escritorio and c.emprestimo_id = e.id
                            and c.emprestimo_parcela is not null), '[]'::jsonb),
    'devolucoes', coalesce((select jsonb_agg(conta_linha(c) || jsonb_build_object(
                               'anexos', (select count(*) from anexos a where a.conta_id = c.id and a.situacao = 'PRONTO'))
                             order by c.paga_em, c.criado_em)
                             from contas_pagar c where c.escritorio_id = p_escritorio and c.emprestimo_id = e.id
                              and c.emprestimo_parcela is null), '[]'::jsonb),
    'historico', coalesce((select jsonb_agg(jsonb_build_object('acao', h.acao, 'em', h.ocorrido_em, 'por', pessoa_ref(h.autor_id), 'dados', h.dados)
                                            order by h.ocorrido_em desc, h.id desc)
                             from historico h
                            where h.escritorio_id = p_escritorio and not h.interno
                              and ((h.entidade = 'emprestimos' and h.entidade_id = e.id::text)
                                   or (h.entidade = 'contas_pagar' and h.entidade_id = any (select x::text from unnest(v_contas) x)))), '[]'::jsonb));
end $$;

-- POST /v1/escritorio/financeiro/emprestimos/:id/devolucoes: só sem parcelas fixas. A devolução nasce
-- já paga, com vencimento no dia em que saiu (S7). Acima do que falta devolver vale, com o aviso de
-- que o resto fica como juros pagos.
create function portal_financeiro_emprestimo_devolucao(p_pessoa uuid, p_escritorio uuid, p_emprestimo uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e emprestimos;
  v_valor bigint := json_inteiro(p_dados, 'valor');
  v_dia date := json_data(p_dados, 'pagaEm');
  v_forma text := nullif(p_dados ->> 'forma', '');
  v_falta bigint;
  v_id uuid;
  err text[] := '{}';
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.editar');
  e := emprestimo_do_escritorio(p_escritorio, p_emprestimo, true);
  if e.cancelado_em is not null then perform recusar_motivo('Este empréstimo foi lançado errado', 'JA_CANCELADO'); end if;
  if e.encerrado_em is not null then perform recusar_motivo('Este empréstimo já foi encerrado', 'JA_ENCERRADO'); end if;
  if e.devolucao <> 'LIVRE' then
    perform recusar_motivo('Empréstimo em parcelas: marque a parcela como paga em A pagar', 'EMPRESTIMO_EM_PARCELAS');
  end if;
  if v_valor is null or v_valor not between 1 and 10000000000 then err := err || 'valor'::text; end if;
  if v_dia is null or v_dia < e.recebido_em or v_dia > hoje_brasilia() then err := err || 'pagaEm'::text; end if;
  if v_forma is not null and not forma_pagamento_valida(v_forma) then err := err || 'forma'::text; end if;
  if cardinality(err) > 0 then perform recusar_campos('Confira a devolução', variadic err); end if;

  v_falta := (emprestimo_situacao_em(e, hoje_brasilia()) ->> 'faltaDevolver')::bigint;
  insert into contas_pagar (escritorio_id, descricao, fornecedor, categoria, valor, vencimento, forma, emprestimo_id,
                            paga_em, valor_pago, pago_por, autor_id)
  values (p_escritorio, 'Empréstimo ' || left(e.credor_nome, 80) || ' · devolução', left(e.credor_nome, 120), 'EMPRESTIMOS', v_valor, v_dia, v_forma, e.id,
          v_dia, v_valor, p_pessoa, p_pessoa)
  returning id into v_id;
  perform registrar_historico('financeiro.emprestimo_devolucao', 'emprestimos', e.id::text, jsonb_strip_nulls(jsonb_build_object(
    'conta', v_id, 'valor', v_valor, 'pagaEm', v_dia, 'credorTipo', e.credor_tipo,
    'acimaDoQueFalta', case when v_valor > v_falta then v_valor - v_falta end)));
  return jsonb_build_object('id', v_id, 'acimaDoQueFalta', greatest(v_valor - v_falta, 0),
                            'emprestimo', (select emprestimo_linha(x) from emprestimos x where x.id = e.id));
end $$;

-- POST /v1/escritorio/financeiro/emprestimos/:id/encerrar: cancela as parcelas em aberto e marca o
-- empréstimo como encerrado; o que entrou e o que foi pago ficam no caixa e na exportação. Vale com algo
-- pago no T3jus, com parcelas pagas antes ou no empréstimo anterior ao T3jus (S-N3); sem nada disso, o
-- certo é "Lançado errado".
create function portal_financeiro_emprestimo_encerrar(p_pessoa uuid, p_escritorio uuid, p_emprestimo uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e emprestimos;
  v_motivo text := nullif(btrim(coalesce(p_dados ->> 'motivo', '')), '');
  v_sit jsonb;
  v_n integer;
  v_valor bigint;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.editar');
  e := emprestimo_do_escritorio(p_escritorio, p_emprestimo, true);
  if e.cancelado_em is not null then perform recusar_motivo('Este empréstimo foi lançado errado', 'JA_CANCELADO'); end if;
  if e.encerrado_em is not null then perform recusar_motivo('Este empréstimo já foi encerrado', 'JA_ENCERRADO'); end if;
  if not exists (select 1 from contas_pagar c where c.escritorio_id = p_escritorio and c.emprestimo_id = e.id and c.paga_em is not null)
     and e.parcelas_antes = 0 and emprestimo_conta_no_caixa(e) then
    perform recusar_motivo('Nada foi pago ainda: marque como lançado errado', 'SEM_PAGAMENTO');
  end if;
  if v_motivo is null or length(v_motivo) not between 5 and 300 then perform recusar_campos('Escreva o motivo', 'motivo'); end if;

  v_sit := emprestimo_situacao_em(e, hoje_brasilia());
  select count(*), coalesce(sum(valor), 0) into v_n, v_valor from contas_pagar
   where escritorio_id = p_escritorio and emprestimo_id = e.id and paga_em is null and cancelada_em is null;
  update contas_pagar set cancelada_em = app_now(), cancelada_por = p_pessoa, cancelada_motivo = left('Empréstimo encerrado: ' || v_motivo, 300)
   where escritorio_id = p_escritorio and emprestimo_id = e.id and paga_em is null and cancelada_em is null;
  update emprestimos set encerrado_em = app_now(), encerrado_por = p_pessoa, encerrado_motivo = v_motivo where id = e.id;
  perform registrar_historico('financeiro.emprestimo_encerrado', 'emprestimos', e.id::text, jsonb_strip_nulls(jsonb_build_object(
    'credorTipo', e.credor_tipo, 'valor', e.valor, 'motivo', v_motivo, 'parcelasCanceladas', v_n, 'valorCancelado', v_valor,
    'naoDevolvido', case when e.devolucao = 'LIVRE' and (v_sit ->> 'faltaDevolver')::bigint > 0 then (v_sit ->> 'faltaDevolver')::bigint end)));
  return (select emprestimo_linha(x) from emprestimos x where x.id = e.id);
end $$;

-- POST /v1/escritorio/financeiro/emprestimos/:id/cancelar ("Lançado errado"): só sem nada pago. Sai do
-- caixa, da folha e da exportação; as parcelas em aberto ficam canceladas em A pagar.
create function portal_financeiro_emprestimo_cancelar(p_pessoa uuid, p_escritorio uuid, p_emprestimo uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e emprestimos;
  v_motivo text := nullif(btrim(coalesce(p_dados ->> 'motivo', '')), '');
  v_n integer;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.editar');
  e := emprestimo_do_escritorio(p_escritorio, p_emprestimo, true);
  if e.cancelado_em is not null then perform recusar_motivo('Este empréstimo já foi lançado errado', 'JA_CANCELADO'); end if;
  if e.encerrado_em is not null then perform recusar_motivo('Este empréstimo já foi encerrado', 'JA_ENCERRADO'); end if;
  if exists (select 1 from contas_pagar c where c.escritorio_id = p_escritorio and c.emprestimo_id = e.id and c.paga_em is not null) then
    perform recusar_motivo('Já há parcela ou devolução paga: encerre as parcelas que faltam', 'EMPRESTIMO_COM_PAGAMENTO');
  end if;
  if v_motivo is null or length(v_motivo) not between 5 and 300 then perform recusar_campos('Escreva o motivo', 'motivo'); end if;

  update contas_pagar set cancelada_em = app_now(), cancelada_por = p_pessoa, cancelada_motivo = left('Empréstimo lançado errado: ' || v_motivo, 300)
   where escritorio_id = p_escritorio and emprestimo_id = e.id and cancelada_em is null;
  get diagnostics v_n = row_count;
  update emprestimos set cancelado_em = app_now(), cancelado_por = p_pessoa, cancelado_motivo = v_motivo where id = e.id;
  perform registrar_historico('financeiro.emprestimo_cancelado', 'emprestimos', e.id::text, jsonb_build_object(
    'credorTipo', e.credor_tipo, 'valor', e.valor, 'motivo', v_motivo, 'parcelasCanceladas', v_n));
  return (select emprestimo_linha(x) from emprestimos x where x.id = e.id);
end $$;

-- ---------------------------------------------------------------------------------------
-- Lançar conta (0511) não aceita a categoria Empréstimos: a parcela nasce do empréstimo. Confere a área
-- e a permissão antes de olhar a categoria (S9).
alter function portal_financeiro_conta_lancar(uuid, uuid, jsonb) rename to financeiro_conta_lancar_sem_emprestimo;
revoke all on function financeiro_conta_lancar_sem_emprestimo(uuid, uuid, jsonb) from public, anon, authenticated;

create function portal_financeiro_conta_lancar(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.editar');
  if p_dados ->> 'categoria' = 'EMPRESTIMOS' then
    perform recusar_campos('Parcela de empréstimo nasce do empréstimo, no Caixa', 'categoria');
  end if;
  return financeiro_conta_lancar_sem_emprestimo(p_pessoa, p_escritorio, p_dados);
end $$;

call fechar_acesso();
