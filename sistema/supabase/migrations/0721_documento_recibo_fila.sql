-- "Pedir de novo" e o recibo em PDF pela fila do WhatsApp do escritório (F3.42, EX-05; F3.19,
-- FI-14). Segue o padrão do F3.3 (0670), do carnê (0625) e da 0720: a mensagem entra na fila da
-- conversa do contato principal, com o aviso aprovado e os campos em dados.campos, para a
-- ligação com a Meta (F3.58) mandar o aviso quando a janela de 24 horas estiver fechada.
--
-- Dois avisos novos do WhatsApp, com os textos aprovados pela Carol em 21/11/2026, que vão para
-- a análise da Meta com os outros:
--  * "Pedido de documento" (DOCUMENTO_PEDIDO): o texto do "Pedir de novo", com o caso no lugar
--    da parte contrária (um aviso da Meta não tem pedaço opcional);
--  * "Recibo de pagamento" (RECIBO_PAGAMENTO), com o PDF do recibo anexo. Quando o recibo sai,
--    a automação "Pagamento recebido" não manda outra mensagem para o mesmo pagamento.
-- "Pedir de novo" com o WhatsApp ligado põe a mensagem na fila e guarda a data do novo pedido
-- (conta no limite de 1 lembrete de documento por semana). O recibo é mandado depois de
-- registrar o recebimento, com "Mandar o recibo pelo WhatsApp" marcado (desenho aprovado em
-- docs/design/aprovadas/portal-financeiro, "o recibo pelo WhatsApp, marcado por padrão"). Sem o
-- WhatsApp ligado, as telas continuam como estão. O Portal passa a saber se o WhatsApp do
-- escritório está ligado (portal_escritorio.whatsappLigado).

-- ---------------------------------------------------------------------------------------
-- Os avisos novos.

alter table whatsapp_avisos drop constraint whatsapp_avisos_chave_check;
alter table whatsapp_avisos add constraint whatsapp_avisos_chave_check
  check (chave in ('PAGAMENTO_RECEBIDO', 'PARCELA_VAI_VENCER', 'PARCELA_ATRASO', 'ETAPA_CASO', 'LEMBRETE_AUDIENCIA',
                   'COMPROMISSO_CANCELADO', 'PRESTACAO_CONTAS', 'DOCUMENTO_PEDIDO', 'RECIBO_PAGAMENTO'));

create or replace function whatsapp_aviso_ordem(p_chave text) returns integer
language sql immutable
as $$ select array_position(array['PAGAMENTO_RECEBIDO', 'PARCELA_VAI_VENCER', 'PARCELA_ATRASO', 'ETAPA_CASO', 'LEMBRETE_AUDIENCIA',
                                  'COMPROMISSO_CANCELADO', 'PRESTACAO_CONTAS', 'DOCUMENTO_PEDIDO', 'RECIBO_PAGAMENTO'], p_chave) $$;

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
      ('RECIBO_PAGAMENTO', 'Olá, {nome}. Aqui é do escritório {nome do escritório}. Segue o recibo nº {número} do pagamento de {valor} ({parcela}). Agradecemos. Qualquer dúvida, é só responder esta mensagem.')
    ) as a (chave, texto)
  on conflict (escritorio_id, chave) do nothing
$$;

-- Os escritórios que já têm os avisos ganham os novos, na mesma situação do lembrete: se os
-- avisos já foram à Meta, estes vão para a análise também.
insert into whatsapp_avisos (escritorio_id, chave, texto, situacao, situacao_em)
select w.escritorio_id, n.chave, n.texto,
       case when w.situacao = 'NAO_ENVIADO' then 'NAO_ENVIADO' else 'EM_ANALISE' end,
       case when w.situacao = 'NAO_ENVIADO' then null else app_now() end
  from whatsapp_avisos w
  cross join (values
    ('DOCUMENTO_PEDIDO', 'Olá, {nome}. Aqui é do escritório {nome do escritório}. Para o caso {caso} andar, ainda precisamos de: {documento}. Pode mandar uma foto ou o arquivo por aqui mesmo. Se já mandou, agradecemos e pode desconsiderar esta mensagem.'),
    ('RECIBO_PAGAMENTO', 'Olá, {nome}. Aqui é do escritório {nome do escritório}. Segue o recibo nº {número} do pagamento de {valor} ({parcela}). Agradecemos. Qualquer dúvida, é só responder esta mensagem.')
  ) as n (chave, texto)
 where w.chave = 'LEMBRETE_AUDIENCIA'
on conflict (escritorio_id, chave) do nothing;

-- Preenche um aviso do escritório para o contato principal de um cliente. Nulo: falta um dado.
create function aviso_preencher(p_escritorio uuid, p_chave text, k clientes_escritorio, p_campos jsonb) returns jsonb
language plpgsql
set search_path = public
as $$
declare v_texto text; v_campos jsonb;
begin
  perform whatsapp_avisos_garantir(p_escritorio, 'NAO_ENVIADO');
  select w.texto into v_texto from whatsapp_avisos w where w.escritorio_id = p_escritorio and w.chave = p_chave;
  v_campos := jsonb_build_object('nome', split_part(btrim(coalesce(contato_principal(k.contatos) ->> 'nome', k.nome)), ' ', 1),
                                 'nome do escritório', (select e.nome from escritorios e where e.id = p_escritorio)) || p_campos;
  return jsonb_build_object('texto', automacao_preencher(v_texto, v_campos), 'campos', v_campos);
end $$;

-- O contato principal com celular, ou recusa com o motivo. Quem pediu para não receber avisos
-- ("Não receber avisos" na ficha, F3.63) não recebe.
create function aviso_contato_celular(k clientes_escritorio) returns jsonb
language plpgsql stable
set search_path = public
as $$
declare ct jsonb := contato_principal(k.contatos);
begin
  if not whatsapp_ligado(k.escritorio_id) then perform recusar_motivo('O WhatsApp do escritório não está ligado', 'WHATSAPP_NAO_LIGADO'); end if;
  if exists (select 1 from clientes_sem_avisos s where s.cliente_id = k.id and s.retirado_em is null and s.tipo = 'TODOS') then
    perform recusar_motivo('O cliente pediu para não receber avisos', 'CLIENTE_SEM_AVISOS');
  end if;
  if ct ->> 'telefone' is null or telefone_fixo_br(ct ->> 'telefone') then
    perform recusar_motivo('O contato principal não tem celular na ficha', 'SEM_WHATSAPP');
  end if;
  return ct;
end $$;

-- A mensagem de um envio, para as telas: a situação e quando.
create function aviso_mensagem(p_id uuid) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object('id', m.id, 'envio', m.envio, 'em', m.criada_em, 'envioEm', m.envio_em, 'motivo', m.envio_motivo,
                            'para', v.nome_contato, 'telefone', v.telefone)
    from conversa_mensagens m join conversas v on v.id = m.conversa_id where m.id = p_id
$$;

-- O Portal sabe se o WhatsApp do escritório está ligado.
alter function portal_escritorio(uuid, uuid) rename to escritorio_sem_whatsapp;
create function portal_escritorio(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return escritorio_sem_whatsapp(p_pessoa, p_escritorio) || jsonb_build_object('whatsappLigado', whatsapp_ligado(p_escritorio));
end $$;

-- ---------------------------------------------------------------------------------------
-- "Pedir de novo" pela fila (F3.42).

alter table documento_pedidos add column repedido_mensagem_id uuid references conversa_mensagens (id) on delete restrict;

create function portal_juridico_documento_repedir_whatsapp(p_pessoa uuid, p_escritorio uuid, p_pedido uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare d documento_pedidos; k clientes_escritorio; ct jsonb; a jsonb; v_conv uuid; v_msg uuid;
begin
  d := documento_pedido_aberto(p_pessoa, p_escritorio, p_pedido);
  select * into k from clientes_escritorio where id = d.cliente_id;
  ct := aviso_contato_celular(k);
  a := aviso_preencher(p_escritorio, 'DOCUMENTO_PEDIDO', k, jsonb_build_object(
         'caso', (select c.nome from casos c where c.id = d.caso_id), 'documento', d.descricao));
  if a ->> 'texto' is null then perform recusar_motivo('Falta um dado para completar o aviso', 'AVISO_INCOMPLETO'); end if;
  v_conv := carne_conversa(p_escritorio, k, ct);
  insert into conversa_mensagens (escritorio_id, conversa_id, autor, texto, aviso_tipo, envio, dados)
  values (p_escritorio, v_conv, 'AVISO', a ->> 'texto', 'Pedido de documento', 'NA_FILA',
          jsonb_build_object('pedido', d.id, 'pessoa', p_pessoa, 'aviso', 'DOCUMENTO_PEDIDO', 'campos', a -> 'campos'))
  returning id into v_msg;
  update conversas set ultima_em = app_now() where id = v_conv;
  update documento_pedidos set repedido_em = hoje_brasilia(), repedido_mensagem_id = v_msg where id = d.id returning * into d;
  perform registrar_historico('juridico.documento_repedido', 'casos', d.caso_id::text,
    jsonb_build_object('pedido', d.id, 'descricao', d.descricao, 'mensagem', v_msg, 'whatsapp', true));
  return documento_pedido_linha(d);
end $$;

-- A ficha do caso mostra o último "Pedir de novo" que foi pela fila, e o nome e se o contato
-- principal tem celular (o texto da tela sai com o nome de quem recebe).
create or replace function documento_pedido_linha(d documento_pedidos) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', d.id, 'descricao', d.descricao, 'pedidoEm', d.pedido_em, 'repedidoEm', d.repedido_em,
    'repedido', case when d.repedido_mensagem_id is not null then aviso_mensagem(d.repedido_mensagem_id) end,
    'cliente', (select jsonb_build_object('id', k.id, 'nome', k.nome, 'telefone', ct ->> 'telefone',
                                          'contato', ct ->> 'nome',
                                          'celular', ct ->> 'telefone' is not null and not telefone_fixo_br(ct ->> 'telefone'))
                  from clientes_escritorio k, lateral (select contato_principal(k.contatos) ct) c where k.id = d.cliente_id),
    'pedidoPor', pessoa_ref(d.pedido_por),
    'lembrete', (select jsonb_build_object('automacao', jsonb_build_object('id', y.id, 'nome', y.nome), 'enviadoEm', x.ultima_msg_em,
                                           'ate', x.proximo_em,
                                           'passaPara', case when x.proximo_em is not null then pessoa_ref(automacao_passa_para(x, y)) end)
                   from automacao_execucoes x join automacoes y on y.id = x.automacao_id
                  where x.escritorio_id = d.escritorio_id and x.origem = 'DOCUMENTO' and d.id = any (x.documentos) and x.ultima_msg_em is not null
                  order by x.iniciada_em desc limit 1))
$$;

-- ---------------------------------------------------------------------------------------
-- O recibo pela fila (F3.19).

create table recibo_envios (
  id             uuid primary key default gen_random_uuid(),
  escritorio_id  uuid not null references escritorios (id) on delete restrict,
  pagamento_id   uuid not null unique references pagamentos_recebidos (id) on delete restrict,
  mensagem_id    uuid not null references conversa_mensagens (id) on delete restrict,
  enviado_por    uuid not null references pessoas (id) on delete restrict,
  enviado_em     timestamptz not null default app_now()
);
call proteger_tabela_escritorio('recibo_envios');
create trigger recibo_envios_so_acrescenta before update or delete on recibo_envios
  for each row execute function financeiro_so_acrescenta();

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('recibo_envios', true, 'Os envios do recibo pelo WhatsApp: a mensagem (com o nome e o telefone na conversa), quem mandou e quando',
  'Mandar o recibo ao cliente e mostrar que foi (FI-14)', 'Execução de contrato (LGPD, art. 7º, V)',
  'Escritório', 'Enquanto o escritório for cliente do T3jus e 5 anos depois do fim do contrato', 'Exportados ao escritório e apagados com ele', 'APROVADO', true);

-- Mandar o recibo: o PDF (gerado e guardado pela api-portal) e o aviso "Recibo de pagamento".
create function portal_recibo_enviar(p_pessoa uuid, p_escritorio uuid, p_pagamento uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rec jsonb; v_arq jsonb := p_dados -> 'arquivo'; k clientes_escritorio; ct jsonb; a jsonb; v_conv uuid; v_msg uuid; p pagamentos_recebidos;
begin
  -- Quem pode ver o recibo pode mandar (Financeiro, ou Contratos no recibo do contrato).
  v_rec := portal_recibo(p_pessoa, p_escritorio, p_pagamento);
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.editar');
  if exists (select 1 from recibo_envios e where e.pagamento_id = p_pagamento) then
    perform recusar_motivo('Este recibo já está na fila do WhatsApp', 'RECIBO_JA_ENVIADO');
  end if;
  select * into p from pagamentos_recebidos where id = p_pagamento and escritorio_id = p_escritorio;
  select * into k from clientes_escritorio where id = (v_rec #>> '{cliente,id}')::uuid;
  ct := aviso_contato_celular(k);
  if v_arq is null or v_arq ->> 'caminho' is distinct from format('%s/recibos/%s.pdf', p_escritorio, p_pagamento)
     or length(btrim(coalesce(v_arq ->> 'nome', ''))) not between 5 and 200 or coalesce(v_arq ->> 'bytes', '') !~ '^[0-9]{1,8}$' then
    perform recusar_campos('Confira o PDF', 'arquivo');
  end if;
  a := aviso_preencher(p_escritorio, 'RECIBO_PAGAMENTO', k, jsonb_build_object(
         'número', (v_rec #>> '{numero,ano}') || '-' || lpad(v_rec #>> '{numero,numero}', 4, '0'),
         'valor', automacao_reais(p.valor + coalesce(p.multa_juros, 0)),
         'parcela', lower(left(v_rec #>> '{parcela,descricao}', 1)) || substr(v_rec #>> '{parcela,descricao}', 2)));
  if a ->> 'texto' is null then perform recusar_motivo('Falta um dado para completar o aviso', 'AVISO_INCOMPLETO'); end if;
  v_conv := carne_conversa(p_escritorio, k, ct);
  insert into conversa_mensagens (escritorio_id, conversa_id, autor, texto, anexo, aviso_tipo, envio, dados)
  values (p_escritorio, v_conv, 'AVISO', a ->> 'texto',
          jsonb_build_object('nome', v_arq ->> 'nome', 'tipo', 'DOCUMENTO', 'bytes', v_arq ->> 'bytes', 'caminho', v_arq ->> 'caminho'),
          'Recibo de pagamento', 'NA_FILA',
          jsonb_build_object('pagamento', p_pagamento, 'pessoa', p_pessoa, 'aviso', 'RECIBO_PAGAMENTO', 'campos', a -> 'campos'))
  returning id into v_msg;
  update conversas set ultima_em = app_now() where id = v_conv;
  insert into recibo_envios (escritorio_id, pagamento_id, mensagem_id, enviado_por) values (p_escritorio, p_pagamento, v_msg, p_pessoa);
  perform registrar_historico('financeiro.recibo_enviado', 'pagamentos_recebidos', p_pagamento::text, jsonb_build_object('mensagem', v_msg));
  return jsonb_build_object('mensagem', aviso_mensagem(v_msg));
end $$;

-- ---------------------------------------------------------------------------------------
-- O motor: o pagamento cujo recibo foi pelo WhatsApp não ganha outro aviso.

create or replace function automacao_candidatos(a automacoes) returns table (cliente_id uuid, origem text, origem_id uuid, rotulo text)
language plpgsql stable
set search_path = public
as $$
declare
  v_fluxo jsonb := automacao_fluxo_valendo(a);
  v_dias integer := coalesce((v_fluxo #>> '{passos,0,dias}')::integer, 1);
  v_hoje date := hoje_brasilia();
  v_desde timestamptz := (select max(v.ligada_em) from automacao_versoes v where v.automacao_id = a.id and v.numero = a.versao_ligada);
begin
  -- Desde quando vale: a primeira versão ligada (ligar de novo não reabre o que já passou).
  v_desde := coalesce((select min(v.ligada_em) from automacao_versoes v where v.automacao_id = a.id), v_desde);
  if a.gatilho in ('PARCELA_ATRASO', 'PARCELA_VAI_VENCER') then
    return query
      select c.cliente_id, 'PARCELA', r.id, r.descricao
        from recebimentos_previstos r join contratos c on c.id = r.contrato_id
       where r.escritorio_id = a.escritorio_id and r.cancelado_em is null and r.valor is not null
         and parcela_recebido(r.id) < r.valor
         -- F3.84: a parcela que voltou de "Não foi paga" não recebe passo de antes de voltar.
         and (r.avisos_desde is null
              or (case when a.gatilho = 'PARCELA_ATRASO' then r.vencimento + v_dias else v_hoje end) >= automacao_local(r.avisos_desde)::date)
         and case when a.gatilho = 'PARCELA_ATRASO'
                  then v_hoje - r.vencimento >= v_dias
                       and (a.entram_ja_atrasados or r.vencimento + v_dias >= automacao_local(v_desde)::date)
                  else r.vencimento = v_hoje + v_dias end
         and not exists (select 1 from automacao_execucoes x where x.automacao_id = a.id and x.origem_id = r.id);
  elsif a.gatilho = 'PAGAMENTO_RECEBIDO' then
    return query
      select c.cliente_id, 'PARCELA', p.id, r.descricao
        from pagamentos_recebidos p join recebimentos_previstos r on r.id = p.parcela_id join contratos c on c.id = r.contrato_id
       where p.escritorio_id = a.escritorio_id and p.criado_em >= v_desde
         -- O recibo que já foi pelo WhatsApp (F3.19) é o aviso do pagamento: não sai outro.
         and not exists (select 1 from recibo_envios re where re.pagamento_id = p.id)
         and not exists (select 1 from automacao_execucoes x where x.automacao_id = a.id and x.origem_id = p.id);
  elsif a.gatilho = 'ETAPA_CASO' then
    -- Um aviso por mudança de etapa para cada cliente do caso (F3.37), cada um no próprio número.
    -- A mudança que já entrou inteira, do jeito antigo (só o primeiro cliente), não entra de novo.
    return query
      select cc.cliente_id, 'ETAPA', etapa_execucao_id(m.id, cc.cliente_id), left(cs.nome || ' · ' || t.nome, 160)
        from caso_etapa_mudancas m join casos cs on cs.id = m.caso_id join etapas t on t.id = m.para_etapa_id
        join caso_clientes cc on cc.caso_id = m.caso_id
       where m.escritorio_id = a.escritorio_id and m.aviso_texto is not null and m.em >= v_desde
         and not exists (select 1 from automacao_execucoes x where x.automacao_id = a.id
                            and x.origem_id in (m.id, etapa_execucao_id(m.id, cc.cliente_id)));
  elsif a.gatilho = 'LEMBRETE_AUDIENCIA' then
    -- Compromisso com o cliente e "lembrar o cliente" marcado, a partir da hora do lembrete de
    -- 1 dia antes (no dia útil anterior, F3.3).
    return query
      select c.cliente_id, 'COMPROMISSO', c.id, left(c.titulo || ' · ' || to_char(automacao_local(c.inicio), 'DD/MM HH24:MI'), 160)
        from compromissos c
       where c.escritorio_id = a.escritorio_id and c.estado = 'MARCADO' and c.cliente_id is not null and c.lembrete_cliente
         and c.tipo <> 'INTERNO' and c.inicio > app_now() + interval '30 minutes' and app_now() >= compromisso_lembrete_em(c.inicio)
         and not exists (select 1 from automacao_execucoes x where x.automacao_id = a.id and x.origem_id = c.id);
  elsif a.gatilho = 'PRESTACAO_CONTAS' then
    return query
      select l.cliente_id, 'REPASSE', d.id, left('Repasse · ' || cs.nome, 160)
        from destinacoes d join levantamentos l on l.id = d.levantamento_id join casos cs on cs.id = l.caso_id
       where d.escritorio_id = a.escritorio_id and d.para = 'CLIENTE' and d.feito_em is not null
         and d.feito_em >= automacao_local(v_desde)::date
         -- A prestação de contas que a equipe já mandou pela fila (F3.44) não sai de novo.
         and l.prestacao_mensagem_id is null
         and not exists (select 1 from automacao_execucoes x where x.automacao_id = a.id and x.origem_id = d.id);
  elsif a.gatilho = 'CLIENTE_NOVO' then
    -- Quem virou cliente depois de ligar e chegou aos dias do gatilho; uma vez por cliente, em
    -- todas as boas-vindas. Importados da planilha nunca entram (PA-06, decisão 1).
    return query
      select k.id, 'CLIENTE', k.id, left(k.nome, 160)
        from clientes_escritorio k
        cross join lateral (select automacao_virou_cliente(k, coalesce(v_fluxo #>> '{passos,0,conta}', 'FECHOU')) dia) q
       where k.escritorio_id = a.escritorio_id and k.estado = 'ATIVO' and k.importacao_id is null
         and q.dia is not null and q.dia >= automacao_local(v_desde)::date and q.dia + v_dias <= v_hoje
         and not exists (select 1 from automacao_execucoes x join automacoes y on y.id = x.automacao_id
                          where x.escritorio_id = a.escritorio_id and x.cliente_id = k.id and y.gatilho = 'CLIENTE_NOVO');
  elsif a.gatilho = 'DOCUMENTO_PENDENTE' then
    -- Um lembrete por cliente com tudo o que falta (decisão 3). Quem já está numa execução
    -- andando desta automação espera ela acabar.
    return query
      select k.id, 'DOCUMENTO', md5(a.id::text || k.id::text || array_to_string(dd.docs, ','))::uuid,
             left('Documentos · ' || (select string_agg(d.descricao, ', ' order by d.pedido_em, d.criado_em) from documento_pedidos d where d.id = any (dd.docs)), 160)
        from clientes_escritorio k
        cross join lateral (select automacao_docs_do_cliente(a, k.id) docs) dd
       where k.escritorio_id = a.escritorio_id and cardinality(dd.docs) > 0
         and not exists (select 1 from automacao_execucoes x where x.automacao_id = a.id and x.cliente_id = k.id and x.proximo_em is not null);
  end if;
end $$;

call fechar_acesso();
