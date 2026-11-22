-- A porta do meio de pagamento da cobrança dos escritórios (F1.21, CO-06).
-- O banco ou intermediador que emite o Pix e o boleto ainda não foi escolhido. Esta migration
-- deixa o caminho pronto e DESLIGADO, sem nenhuma credencial:
--
--  * A fatura e a parcela do carnê ganham o lugar da cobrança no meio de pagamento: quem emitiu
--    (pagamento_provedor), o código de lá (pagamento_id), o código de barras e o endereço do PDF
--    do boleto. O Pix copia e cola e a linha do boleto já existiam (0690).
--  * configuracoes.meio_pagamento diz qual meio está ligado. Com DESLIGADO (o valor de hoje),
--    nada sai: a fila fica vazia e a baixa continua manual, como agora.
--  * A rota POST /v1/rotina/cobranca-codigos da api-console pede ao banco o que falta (faturas
--    e parcelas sem código, cobranças de faturas canceladas para cancelar lá), fala com o meio e
--    grava a resposta. O pg_cron chama a rota de hora em hora, só quando há o que fazer.
--  * A baixa automática (cobranca_baixa_automatica) chega pelo aviso do meio de pagamento, na
--    rota POST /v1/pagamento/aviso, que confere a assinatura do aviso antes de chamar o banco.
--    Ela usa a mesma regra da baixa manual (cobranca_pagar, 0690): a fatura fica Paga, o recibo
--    vai para a fila e o Portal volta ao normal se o atraso acabar. Só não registra o pagamento
--    quando o valor não bate com a fatura ou a fatura foi cancelada: aí grava o evento para a
--    Administração conferir, e nada muda sozinho (PT-03).
--  * O aviso repetido não conta duas vezes.

alter table faturas
  add column pagamento_provedor     text check (pagamento_provedor ~ '^[a-z0-9_]{2,30}$'),
  add column pagamento_id           text check (length(pagamento_id) between 1 and 120),
  add column boleto_codigo_barras   text check (boleto_codigo_barras ~ '^[0-9]{44}$'),
  add column boleto_url             text check (boleto_url ~ '^https://' and length(boleto_url) <= 500),
  add column pagamento_cancelado_em timestamptz,
  add check ((pagamento_provedor is null) = (pagamento_id is null));
create unique index faturas_pagamento_unico on faturas (pagamento_provedor, pagamento_id) where pagamento_id is not null;

alter table assinatura_carne_parcelas
  add column pagamento_provedor     text check (pagamento_provedor ~ '^[a-z0-9_]{2,30}$'),
  add column pagamento_id           text check (length(pagamento_id) between 1 and 120),
  add column boleto_codigo_barras   text check (boleto_codigo_barras ~ '^[0-9]{44}$'),
  add column boleto_url             text check (boleto_url ~ '^https://' and length(boleto_url) <= 500),
  add column pagamento_cancelado_em timestamptz,
  add check ((pagamento_provedor is null) = (pagamento_id is null));
create unique index parcelas_pagamento_unico on assinatura_carne_parcelas (pagamento_provedor, pagamento_id) where pagamento_id is not null;

-- A rotina do meio de pagamento acha o que falta em todos os escritórios (como a fila dos
-- e-mails da cobrança, 0690), só para leitura e só dentro das funções abaixo.
create policy rotina_pagamento on faturas for select to dominio
  using (current_setting('t3jus.rotina_pagamento', true) = 'on');
create policy rotina_pagamento on assinatura_carne_parcelas for select to dominio
  using (current_setting('t3jus.rotina_pagamento', true) = 'on');
create policy rotina_pagamento on assinatura_carnes for select to dominio
  using (current_setting('t3jus.rotina_pagamento', true) = 'on');

insert into configuracoes (chave, valor, descricao) values
  ('meio_pagamento', '"DESLIGADO"',
   'Meio de pagamento que emite o Pix e o boleto da cobrança dos escritórios (DESLIGADO: a baixa é manual)'),
  ('cobranca_codigos_url', '"https://console.t3jus.pro/api/v1/rotina/cobranca-codigos"',
   'Rota da api-console que pede os códigos de pagamento ao meio de pagamento (vazio: a fila espera)');

create function meio_pagamento_ligado() returns text
language sql
stable
set search_path = public
as $$
  select nullif(lower(btrim(coalesce((select valor #>> '{}' from configuracoes where chave = 'meio_pagamento'), 'DESLIGADO'))), 'desligado')
$$;

-- O que falta fazer no meio de pagamento, até p_limite itens:
--   EMITIR_FATURA: fatura em aberto, fora do carnê, sem cobrança lá (ou emitida lá e ainda sem
--     os códigos: o pagamentoId vai junto e só os códigos são buscados);
--   EMITIR_PARCELA: o mesmo para a parcela a vencer do carnê em uso;
--   CANCELAR: fatura ou parcela cancelada que ainda vale lá.
-- Com o meio desligado, a lista vem vazia.
create function rotina_cobranca_codigos_pendentes(p_limite integer default 20) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meio text := meio_pagamento_ligado();
  v_lim integer := greatest(least(p_limite, 50), 1);
  r record;
  v_lista jsonb;
  v_saida jsonb := '[]'::jsonb;
begin
  if v_meio is null then return '[]'::jsonb; end if;
  perform limpar_contexto();
  perform set_config('t3jus.rotina_pagamento', 'on', true);
  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) into v_lista from (
    (select 'EMITIR_FATURA' as acao, f.id, f.escritorio_id as e, f.vencimento as ordem from faturas f
      where f.situacao = 'A_VENCER' and f.carne_parcela_id is null
        and (f.pagamento_id is null or (f.pagamento_provedor = v_meio and f.pix_copia_cola is null and f.linha_boleto is null))
      order by f.vencimento limit v_lim)
    union all
    (select 'EMITIR_PARCELA', p.id, p.escritorio_id, p.vencimento from assinatura_carne_parcelas p
       join assinatura_carnes c on c.id = p.carne_id
      where p.situacao = 'A_VENCER' and c.substituido_em is null
        and (p.pagamento_id is null or (p.pagamento_provedor = v_meio and p.pix_copia_cola is null and p.linha_boleto is null))
      order by p.vencimento limit v_lim)
    union all
    (select 'CANCELAR_FATURA', f.id, f.escritorio_id, f.vencimento from faturas f
      where f.situacao = 'CANCELADA' and f.pagamento_id is not null and f.pagamento_cancelado_em is null
        and f.pagamento_provedor = v_meio limit v_lim)
    union all
    (select 'CANCELAR_PARCELA', p.id, p.escritorio_id, p.vencimento from assinatura_carne_parcelas p
      where p.situacao = 'CANCELADA' and p.pagamento_id is not null and p.pagamento_cancelado_em is null
        and p.pagamento_provedor = v_meio limit v_lim)
    order by ordem limit v_lim) x;
  perform set_config('t3jus.rotina_pagamento', '', true);

  for r in select * from jsonb_to_recordset(v_lista) as y(acao text, id uuid, e uuid) loop
    perform entrar_escritorio_servico(r.e);
    v_saida := v_saida || (
      select jsonb_build_object(
        'acao', r.acao, 'id', r.id, 'provedor', v_meio,
        'pagamentoId', coalesce(f.pagamento_id, p.pagamento_id),
        'valorCentavos', coalesce(f.total_centavos, p.valor_centavos),
        'vencimento', coalesce(f.vencimento, p.vencimento),
        'descricao', case when f.id is not null then 'T3jus · fatura de ' || mes_por_extenso(f.competencia)
                          else 'T3jus · parcela ' || p.numero || ' de ' || c.parcelas || ' do carnê ' || c.numero
                               || ' · ' || mes_por_extenso(p.competencia) end,
        'pagador', jsonb_build_object('nome', es.nome, 'cnpj', a.cnpj_nota, 'email', a.email_cobranca))
        from (select 1) um
        left join faturas f on r.acao like '%FATURA' and f.id = r.id
        left join assinatura_carne_parcelas p on r.acao like '%PARCELA' and p.id = r.id
        left join assinatura_carnes c on c.id = p.carne_id
        join assinaturas a on a.id = coalesce(f.assinatura_id, c.assinatura_id)
        join escritorios es on es.id = a.escritorio_id);
  end loop;
  perform limpar_contexto();
  return v_saida;
end $$;

-- Grava o que o meio de pagamento respondeu. Na emissão, guarda os códigos (e, na parcela que já
-- tem a fatura do mês, copia os códigos para a fatura). No cancelamento, marca a hora.
create function rotina_cobranca_codigos_gravar(p_acao text, p_id uuid, p_provedor text, p_dados jsonb) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_e uuid;
  v_fatura uuid;
begin
  perform limpar_contexto();
  if p_provedor is distinct from meio_pagamento_ligado() then
    raise exception 'O meio de pagamento não é o ligado' using errcode = 'TC422', detail = '{"motivo":"MEIO_DE_PAGAMENTO_DESLIGADO"}';
  end if;
  perform set_config('t3jus.rotina_pagamento', 'on', true);
  if p_acao like '%FATURA' then select escritorio_id into v_e from faturas where id = p_id;
  else select escritorio_id into v_e from assinatura_carne_parcelas where id = p_id; end if;
  perform set_config('t3jus.rotina_pagamento', '', true);
  if v_e is null then raise exception 'Fatura ou parcela não encontrada' using errcode = 'TC404'; end if;
  perform entrar_escritorio_servico(v_e);
  perform cobranca_marcar(true);
  if p_acao = 'EMITIR_FATURA' then
    update faturas set pagamento_provedor = p_provedor, pagamento_id = p_dados ->> 'pagamentoId',
           pix_copia_cola = p_dados ->> 'pixCopiaCola', linha_boleto = p_dados ->> 'linhaBoleto',
           boleto_codigo_barras = p_dados ->> 'codigoBarras', boleto_url = p_dados ->> 'boletoUrl'
     where id = p_id and (pagamento_id is null or pagamento_id = p_dados ->> 'pagamentoId');
  elsif p_acao = 'EMITIR_PARCELA' then
    update assinatura_carne_parcelas set pagamento_provedor = p_provedor, pagamento_id = p_dados ->> 'pagamentoId',
           pix_copia_cola = p_dados ->> 'pixCopiaCola', linha_boleto = p_dados ->> 'linhaBoleto',
           boleto_codigo_barras = p_dados ->> 'codigoBarras', boleto_url = p_dados ->> 'boletoUrl'
     where id = p_id and (pagamento_id is null or pagamento_id = p_dados ->> 'pagamentoId')
    returning fatura_id into v_fatura;
    if v_fatura is not null then
      update faturas set pix_copia_cola = p_dados ->> 'pixCopiaCola', linha_boleto = p_dados ->> 'linhaBoleto',
             boleto_codigo_barras = p_dados ->> 'codigoBarras', boleto_url = p_dados ->> 'boletoUrl'
       where id = v_fatura and situacao = 'A_VENCER';
    end if;
  elsif p_acao = 'CANCELAR_FATURA' then
    update faturas set pagamento_cancelado_em = app_now() where id = p_id;
  elsif p_acao = 'CANCELAR_PARCELA' then
    update assinatura_carne_parcelas set pagamento_cancelado_em = app_now() where id = p_id;
  else
    raise exception 'Ação desconhecida' using errcode = 'TC422';
  end if;
  perform cobranca_marcar(false);
  perform limpar_contexto();
end $$;

-- A baixa automática, pelo aviso do meio de pagamento (já conferido pela rota). Responde o que
-- aconteceu: PAGA, JA_PAGA (aviso repetido), VALOR_DIFERENTE ou CANCELADA (gravam o evento
-- para a Administração conferir e não mudam a fatura) ou NAO_ENCONTRADA.
create function cobranca_baixa_automatica(p_provedor text, p_pagamento_id text, p_pago_em date,
                                          p_valor_centavos integer, p_forma text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  f faturas;
  p assinatura_carne_parcelas;
  a assinaturas;
  v_e uuid;
  v_fatura uuid;
  v jsonb;
begin
  perform limpar_contexto();
  if p_forma not in ('PIX', 'BOLETO') then
    raise exception 'Forma inválida' using errcode = 'TC422', detail = '{"campos":["forma"]}';
  end if;
  perform set_config('t3jus.rotina_pagamento', 'on', true);
  select escritorio_id, id into v_e, v_fatura from faturas where pagamento_provedor = p_provedor and pagamento_id = p_pagamento_id;
  if v_e is null then
    select * into p from assinatura_carne_parcelas where pagamento_provedor = p_provedor and pagamento_id = p_pagamento_id;
    v_e := p.escritorio_id;
  end if;
  perform set_config('t3jus.rotina_pagamento', '', true);
  if v_e is null then return jsonb_build_object('resultado', 'NAO_ENCONTRADA'); end if;
  perform entrar_escritorio_servico(v_e);
  perform cobranca_marcar(true);

  -- Parcela do carnê: usa a fatura do mês; se ainda não saiu (pagou adiantado), emite já paga.
  if v_fatura is null then
    v_fatura := p.fatura_id;
    if v_fatura is null and p.situacao = 'A_VENCER' then
      select a2.* into a from assinaturas a2 join assinatura_carnes c on c.assinatura_id = a2.id where c.id = p.carne_id;
      v_fatura := cobranca_emitir(a, p.competencia, false, true);
      if (select carne_parcela_id from faturas where id = v_fatura) is distinct from p.id then v_fatura := null; end if;
    end if;
  end if;

  select * into f from faturas where id = v_fatura;
  if f.id is null then
    -- Parcela cancelada (carnê trocado) que foi paga lá: fica para a Administração.
    insert into fatura_eventos (escritorio_id, assinatura_id, fatura_id, autor_id, acao, dados)
    select p.escritorio_id, c.assinatura_id, null, null, 'pagamento.para_conferir', jsonb_build_object(
      'motivo', 'PARCELA_CANCELADA', 'parcela', p.numero, 'provedor', p_provedor, 'pagamentoId', p_pagamento_id,
      'pagoEm', p_pago_em, 'valorCentavos', p_valor_centavos, 'forma', p_forma)
      from assinatura_carnes c where c.id = p.carne_id;
    v := jsonb_build_object('resultado', 'CANCELADA');
  elsif f.situacao = 'PAGA' then
    v := jsonb_build_object('resultado', 'JA_PAGA', 'faturaId', f.id);
  elsif f.situacao = 'CANCELADA' or p_valor_centavos <> f.total_centavos then
    perform cobranca_evento(f.assinatura_id, f.id, 'pagamento.para_conferir', jsonb_build_object(
      'motivo', case when f.situacao = 'CANCELADA' then 'FATURA_CANCELADA' else 'VALOR_DIFERENTE_DA_FATURA' end,
      'provedor', p_provedor, 'pagamentoId', p_pagamento_id, 'pagoEm', p_pago_em,
      'valorCentavos', p_valor_centavos, 'totalCentavos', f.total_centavos, 'forma', p_forma), true);
    v := jsonb_build_object('resultado', case when f.situacao = 'CANCELADA' then 'CANCELADA' else 'VALOR_DIFERENTE' end, 'faturaId', f.id);
  else
    v := cobranca_pagar(f.id, p_pago_em, p_forma, 'MEIO_DE_PAGAMENTO') || jsonb_build_object('resultado', 'PAGA', 'faturaId', f.id);
  end if;
  perform cobranca_marcar(false);
  perform limpar_contexto();
  return v;
end $$;

-- Chama a rota dos códigos quando o meio está ligado e há o que fazer.
create function cobranca_codigos_chamar() returns boolean
language plpgsql
set search_path = public
as $$
declare v_url text := nullif(btrim((select valor #>> '{}' from configuracoes where chave = 'cobranca_codigos_url')), '');
begin
  if meio_pagamento_ligado() is null or v_url is null or not exists (select 1 from pg_extension where extname = 'pg_net') then
    return false;
  end if;
  perform set_config('t3jus.rotina_pagamento', 'on', true);
  if not exists (select 1 from faturas where situacao = 'A_VENCER' and carne_parcela_id is null
                   and (pagamento_id is null or (pix_copia_cola is null and linha_boleto is null)))
     and not exists (select 1 from assinatura_carne_parcelas p join assinatura_carnes c on c.id = p.carne_id
                      where p.situacao = 'A_VENCER' and c.substituido_em is null
                        and (p.pagamento_id is null or (p.pix_copia_cola is null and p.linha_boleto is null)))
     and not exists (select 1 from faturas where situacao = 'CANCELADA' and pagamento_id is not null and pagamento_cancelado_em is null)
     and not exists (select 1 from assinatura_carne_parcelas where situacao = 'CANCELADA' and pagamento_id is not null and pagamento_cancelado_em is null) then
    perform set_config('t3jus.rotina_pagamento', '', true);
    return false;
  end if;
  perform set_config('t3jus.rotina_pagamento', '', true);
  execute 'select net.http_post(url := $1, body := ''{}''::jsonb, timeout_milliseconds := 30000)' using v_url;
  return true;
end $$;

-- De hora em hora, aos 20 minutos (a rotina da cobrança emite as faturas às 8h de Brasília).
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('t3jus-cobranca-codigos', '20 * * * *', 'select public.cobranca_codigos_chamar()');
  end if;
end $$;

call fechar_acesso();
