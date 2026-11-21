-- O pedido da base do mês ao cliente pelo WhatsApp do escritório (F3.13, CH-06). No percentual
-- recorrente com "Pedir também ao cliente pelo WhatsApp" marcado (pedirWhats), no dia do
-- lembrete, a partir das 8h de Brasília, o aviso "Pedido da base do mês" entra na fila da
-- conversa do contato principal, uma vez por cobrança. O lembrete no sino (0531) continua às 7h.
-- Texto aprovado pela Carol em 21/11/2026; vai para a análise da Meta com os outros avisos.
-- Não sai: sem o WhatsApp ligado, sem celular no contato principal, ou se o cliente pediu para
-- não receber avisos (todos ou só os de cobrança). Cada tentativa fica em base_mes_pedidos, com
-- a mensagem ou o motivo, e não se repete. Bases pedidas há mais de 3 dias não saem (a rotina
-- não manda um pedido velho quando o WhatsApp é ligado depois).

alter table whatsapp_avisos drop constraint whatsapp_avisos_chave_check;
alter table whatsapp_avisos add constraint whatsapp_avisos_chave_check
  check (chave in ('PAGAMENTO_RECEBIDO', 'PARCELA_VAI_VENCER', 'PARCELA_ATRASO', 'ETAPA_CASO', 'LEMBRETE_AUDIENCIA',
                   'COMPROMISSO_CANCELADO', 'PRESTACAO_CONTAS', 'DOCUMENTO_PEDIDO', 'RECIBO_PAGAMENTO', 'BASE_DO_MES'));

create or replace function whatsapp_aviso_ordem(p_chave text) returns integer
language sql immutable
as $$ select array_position(array['PAGAMENTO_RECEBIDO', 'PARCELA_VAI_VENCER', 'PARCELA_ATRASO', 'ETAPA_CASO', 'LEMBRETE_AUDIENCIA',
                                  'COMPROMISSO_CANCELADO', 'PRESTACAO_CONTAS', 'DOCUMENTO_PEDIDO', 'RECIBO_PAGAMENTO', 'BASE_DO_MES'], p_chave) $$;

create or replace function whatsapp_avisos_garantir(p_escritorio uuid, p_situacao text) returns void
language sql
set search_path = public
as $$
  insert into whatsapp_avisos (escritorio_id, chave, texto, situacao, situacao_em)
  select p_escritorio, a.chave, a.texto, p_situacao, case when p_situacao = 'NAO_ENVIADO' then null else app_now() end
    from (values
      ('PAGAMENTO_RECEBIDO', 'Olá, {nome}. Aqui é do escritório {nome do escritório}. Recebemos o pagamento de {valor} ({parcela}). Agradecemos. Qualquer dúvida, é só responder esta mensagem.'),
      ('PARCELA_VAI_VENCER', 'Olá, {nome}. Aqui é do escritório {nome do escritório}. Lembramos que o valor de {valor} ({parcela}) vence em {vencimento}. Se já pagou, pode desconsiderar esta mensagem. Se precisar dos dados para pagar, é só responder aqui.'),
      ('PARCELA_ATRASO', 'Olá, {nome}. Aqui é do escritório {nome do escritório}. O valor de {valor} ({parcela}) venceu em {vencimento} e ainda não aparece como pago. Se já pagou, pode desconsiderar esta mensagem. Se precisar dos dados para pagar ou quiser conversar sobre o pagamento, é só responder aqui.'),
      ('ETAPA_CASO', 'Olá, {nome}. Aqui é do escritório {nome do escritório}. Novidade no caso {caso}: {texto da etapa} Qualquer dúvida, é só responder esta mensagem.'),
      ('LEMBRETE_AUDIENCIA', 'Olá, {nome}. Aqui é do escritório {nome do escritório}. Lembrete: {compromisso}, no dia {data}, às {hora}. Local: {local}. Responda CONFIRMO, ou escreva se tiver alguma dúvida.'),
      ('COMPROMISSO_CANCELADO', 'Olá, {nome}. Aqui é do escritório {nome do escritório}. Avisamos que foi cancelado: {compromisso}, no dia {data}, às {hora}. Se houver nova data, avisamos por aqui. Qualquer dúvida, é só responder esta mensagem.'),
      ('PRESTACAO_CONTAS', 'Olá, {nome}. Aqui é do escritório {nome do escritório}. A prestação de contas do caso {caso} está pronta: {resumo}. Qualquer dúvida, é só responder esta mensagem.'),
      ('DOCUMENTO_PEDIDO', 'Olá, {nome}. Aqui é do escritório {nome do escritório}. Para o caso {caso} andar, ainda precisamos de: {documento}. Pode mandar uma foto ou o arquivo por aqui mesmo. Se já mandou, agradecemos e pode desconsiderar esta mensagem.'),
      ('RECIBO_PAGAMENTO', 'Olá, {nome}. Aqui é do escritório {nome do escritório}. Segue o recibo nº {número} do pagamento de {valor} ({parcela}). Agradecemos. Qualquer dúvida, é só responder esta mensagem.'),
      ('BASE_DO_MES', 'Olá, {nome}. Aqui é do escritório {nome do escritório}. Para calcular os honorários de {mês} do contrato {contrato}, precisamos do valor de {base}. Pode mandar o extrato ou o comprovante por aqui mesmo. Qualquer dúvida, é só responder esta mensagem.')
    ) as a (chave, texto)
  on conflict (escritorio_id, chave) do nothing
$$;

insert into whatsapp_avisos (escritorio_id, chave, texto, situacao, situacao_em)
select w.escritorio_id, 'BASE_DO_MES', 'Olá, {nome}. Aqui é do escritório {nome do escritório}. Para calcular os honorários de {mês} do contrato {contrato}, precisamos do valor de {base}. Pode mandar o extrato ou o comprovante por aqui mesmo. Qualquer dúvida, é só responder esta mensagem.',
       case when w.situacao = 'NAO_ENVIADO' then 'NAO_ENVIADO' else 'EM_ANALISE' end,
       case when w.situacao = 'NAO_ENVIADO' then null else app_now() end
  from whatsapp_avisos w
 where w.chave = 'LEMBRETE_AUDIENCIA'
on conflict (escritorio_id, chave) do nothing;

create table base_mes_pedidos (
  id              uuid primary key default gen_random_uuid(),
  escritorio_id   uuid not null references escritorios (id) on delete restrict,
  recebimento_id  uuid not null unique references recebimentos_previstos (id) on delete restrict,
  mensagem_id     uuid references conversa_mensagens (id) on delete restrict,
  motivo          text check (length(btrim(motivo)) between 1 and 300),
  criado_em       timestamptz not null default app_now(),
  check ((mensagem_id is null) <> (motivo is null))
);
call proteger_tabela_escritorio('base_mes_pedidos');
create trigger base_mes_pedidos_so_acrescenta before update or delete on base_mes_pedidos
  for each row execute function financeiro_so_acrescenta();

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('base_mes_pedidos', false, 'Os pedidos da base do mês ao cliente pelo WhatsApp: a mensagem ou por que não saiu',
  null, null, null, null, null, null, true);

-- O mês da cobrança por extenso ("novembro de 2026") vem de mes_por_extenso (0690).

-- Pede uma base ao cliente: a mensagem na fila, ou o motivo de não sair.
create function base_mes_pedir(p_escritorio uuid, p_recebimento uuid) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  r recebimentos_previstos; c contratos; h honorario_condicoes; k clientes_escritorio; ct jsonb; a jsonb; v_motivo text; v_conv uuid; v_msg uuid;
begin
  select * into r from recebimentos_previstos where id = p_recebimento and escritorio_id = p_escritorio;
  select * into c from contratos where id = r.contrato_id;
  select * into h from honorario_condicoes where dono_tipo = 'CONTRATO' and dono_id = c.id and tipo = 'RECORRENTE' limit 1;
  select * into k from clientes_escritorio where id = c.cliente_id;
  ct := contato_principal(k.contatos);
  if exists (select 1 from clientes_sem_avisos s where s.cliente_id = k.id and s.retirado_em is null) then
    v_motivo := 'O cliente pediu para não receber avisos.';
  elsif ct ->> 'telefone' is null or telefone_fixo_br(ct ->> 'telefone') then
    v_motivo := 'Sem WhatsApp no contato principal da ficha.';
  else
    a := aviso_preencher(p_escritorio, 'BASE_DO_MES', k, jsonb_build_object(
           'mês', mes_por_extenso(r.vencimento), 'contrato', c.numero,
           'base', lower(left(btrim(h.params ->> 'sobre'), 1)) || substr(btrim(h.params ->> 'sobre'), 2)));
    if a ->> 'texto' is null then v_motivo := 'Falta um dado para completar o texto do aviso.'; end if;
  end if;
  if v_motivo is not null then
    insert into base_mes_pedidos (escritorio_id, recebimento_id, motivo) values (p_escritorio, r.id, v_motivo);
    return jsonb_build_object('motivo', v_motivo);
  end if;
  v_conv := carne_conversa(p_escritorio, k, ct);
  insert into conversa_mensagens (escritorio_id, conversa_id, autor, texto, aviso_tipo, envio, dados)
  values (p_escritorio, v_conv, 'AVISO', a ->> 'texto', 'Pedido da base do mês', 'NA_FILA',
          jsonb_build_object('recebimento', r.id, 'contrato', c.id, 'aviso', 'BASE_DO_MES', 'campos', a -> 'campos'))
  returning id into v_msg;
  update conversas set ultima_em = app_now() where id = v_conv;
  insert into base_mes_pedidos (escritorio_id, recebimento_id, mensagem_id) values (p_escritorio, r.id, v_msg);
  perform registrar_historico('contrato.base_pedida_cliente', 'contratos', c.id::text,
    jsonb_build_object('recebimento', r.id, 'mensagem', v_msg));
  return jsonb_build_object('mensagem', v_msg);
end $$;

-- A rotina: a partir das 8h de Brasília, pede as bases do dia (ou dos últimos 3 dias) dos
-- contratos com pedirWhats, nos escritórios com o WhatsApp ligado. Devolve quantas entraram na fila.
create function pedir_bases_ao_cliente() returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_n integer := 0; v_esc uuid; v_lista uuid[]; b record;
begin
  if extract(hour from (app_now() at time zone 'America/Sao_Paulo')) < 8 then return 0; end if;
  perform limpar_contexto();
  perform set_config('t3jus.lembrando_bases', 'on', true);
  select coalesce(array_agg(id order by id), '{}') into v_lista from escritorios;
  perform set_config('t3jus.lembrando_bases', 'off', true);
  foreach v_esc in array v_lista loop
    perform entrar_escritorio_servico(v_esc);
    if not whatsapp_ligado(v_esc) then continue; end if;
    for b in
      select p.recebimento_id from contrato_bases_pendentes(v_esc) p
        join honorario_condicoes h on h.dono_tipo = 'CONTRATO' and h.dono_id = p.contrato_id and h.tipo = 'RECORRENTE'
       where coalesce((h.params ->> 'pedirWhats')::boolean, false)
         and p.pedir_em >= hoje_brasilia() - 3
         and not exists (select 1 from base_mes_pedidos x where x.recebimento_id = p.recebimento_id)
       order by p.vencimento
    loop
      if base_mes_pedir(v_esc, b.recebimento_id) ? 'mensagem' then v_n := v_n + 1; end if;
    end loop;
  end loop;
  perform limpar_contexto();
  return v_n;
end $$;

-- Todo dia às 8h de Brasília (11h UTC), onde o pg_cron existe.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('t3jus-bases-ao-cliente', '0 11 * * *', 'select public.pedir_bases_ao_cliente()');
  end if;
end $$;

call fechar_acesso();
