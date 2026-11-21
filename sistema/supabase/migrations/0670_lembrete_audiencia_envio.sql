-- Lembrete de audiência e aviso de cancelamento pelo WhatsApp do escritório (F3.3; EX-11).
-- Desenho aprovado em docs/design/aprovadas/portal-agenda-conversas (decisões 3 e 4 e itens 8 e
-- 9 das NOTAS: o lembrete vem marcado nas audiências, 1 dia e 2 horas antes; cancelar avisa o
-- cliente e cancela o lembrete que não saiu; remarcar pede motivo).
--
-- O lembrete já é a automação pronta "Lembrete de audiência" (F3.60). Aqui ele fica completo:
--  * o lembrete de 1 dia antes sai no dia útil anterior, na mesma hora (entre 8h e 20h): a
--    audiência de segunda é lembrada na sexta, não no domingo;
--  * o de 2 horas antes segue a espera do fluxo; se cai antes das 8h, sai às 8h, e não sai se
--    faltar menos de 30 minutos para o compromisso;
--  * marcado em cima da hora: se o lembrete de 2 horas sai em menos de 1 hora, só ele sai;
--  * cancelar ou desmarcar o lembrete para a automação na hora (o que não saiu não sai);
--  * remarcar recomeça o lembrete para a nova data; se um lembrete da data antiga já tinha
--    saído, o cliente recebe na hora o lembrete com a nova data;
--  * na sala virtual, o lembrete leva o link.
-- O aviso de cancelamento é um aviso novo do WhatsApp ("Compromisso cancelado"), que vai para a
-- análise da Meta com os outros. Cancelar com "Avisar o cliente" põe a mensagem na fila da
-- conversa, como os avisos automáticos. Quem tira da fila e entrega é a ligação com a Meta
-- (F3.58), que ainda não existe. Sem o WhatsApp ligado, o aviso não sai (e não sai depois:
-- um aviso de cancelamento atrasado confunde mais do que ajuda); a ficha diz por quê.

-- ---------------------------------------------------------------------------------------
-- O aviso "Compromisso cancelado".

alter table whatsapp_avisos drop constraint whatsapp_avisos_chave_check;
alter table whatsapp_avisos add constraint whatsapp_avisos_chave_check
  check (chave in ('PAGAMENTO_RECEBIDO', 'PARCELA_VAI_VENCER', 'PARCELA_ATRASO', 'ETAPA_CASO', 'LEMBRETE_AUDIENCIA',
                   'COMPROMISSO_CANCELADO', 'PRESTACAO_CONTAS'));

create or replace function whatsapp_aviso_ordem(p_chave text) returns integer
language sql immutable
as $$ select array_position(array['PAGAMENTO_RECEBIDO', 'PARCELA_VAI_VENCER', 'PARCELA_ATRASO',
                                  'ETAPA_CASO', 'LEMBRETE_AUDIENCIA', 'COMPROMISSO_CANCELADO', 'PRESTACAO_CONTAS'], p_chave) $$;

-- Os avisos prontos, com os textos no tom (D5) e o aviso de cancelamento.
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
      ('PRESTACAO_CONTAS', 'Olá, {nome}. Aqui é do escritório {nome do escritório}. A prestação de contas do caso {caso} está pronta: {resumo}. Qualquer dúvida, é só responder esta mensagem.')
    ) as a (chave, texto)
  on conflict (escritorio_id, chave) do nothing
$$;

-- Os escritórios que já têm os avisos ganham o novo, na mesma situação do lembrete: se os
-- avisos já foram à Meta, este vai para a análise também.
insert into whatsapp_avisos (escritorio_id, chave, texto, situacao, situacao_em)
select w.escritorio_id, 'COMPROMISSO_CANCELADO',
       'Olá, {nome}. Aqui é do escritório {nome do escritório}. Avisamos que foi cancelado: {compromisso}, no dia {data}, às {hora}. Se houver nova data, avisamos por aqui. Qualquer dúvida, é só responder esta mensagem.',
       case when w.situacao = 'NAO_ENVIADO' then 'NAO_ENVIADO' else 'EM_ANALISE' end,
       case when w.situacao = 'NAO_ENVIADO' then null else app_now() end
  from whatsapp_avisos w where w.chave = 'LEMBRETE_AUDIENCIA'
on conflict (escritorio_id, chave) do nothing;

-- ---------------------------------------------------------------------------------------
-- Peças do lembrete.

-- Quando sai o lembrete de 1 dia antes: na mesma hora do dia útil anterior, entre 8h e 20h.
create function compromisso_lembrete_em(p_inicio timestamptz) returns timestamptz
language plpgsql immutable
as $$
declare v timestamp := automacao_local(p_inicio) - interval '1 day'; n integer;
begin
  for n in 1..15 loop
    exit when automacao_dia_util(v::date);
    v := v - interval '1 day';
  end loop;
  if v::time < '08:00' then v := v::date + time '08:00';
  elsif v::time >= '20:00' then v := v::date + time '19:30';
  end if;
  return v at time zone 'America/Sao_Paulo';
end $$;

-- Quando sai o lembrete de p_horas antes (no horário permitido). Nulo: não sai, porque
-- faltaria menos de 30 minutos para o compromisso.
create function compromisso_lembrete_horas(p_inicio timestamptz, p_horas integer) returns timestamptz
language sql immutable
as $$
  select case when t <= p_inicio - interval '30 minutes' then t end
    from (select automacao_proximo_horario(p_inicio - make_interval(hours => p_horas)) t) x
$$;

-- As horas do lembrete "horas antes" na versão ligada da automação pronta do escritório (2,
-- se não houver).
create function compromisso_lembrete_horas_antes(p_escritorio uuid) returns integer
language sql stable
set search_path = public
as $$
  select coalesce((select (x ->> 'horasAntes')::integer
                     from automacoes a cross join lateral jsonb_array_elements(automacao_fluxo_valendo(a) -> 'passos') x
                    where a.escritorio_id = p_escritorio and a.pronta_chave = 'LEMBRETE_AUDIENCIA' and x ->> 'tipo' = 'ESPERA'
                      and (x ->> 'horasAntes') is not null limit 1), 2)
$$;

-- Os campos do compromisso nos avisos: o que é, dia, hora e onde. Na sala virtual, o link.
create function compromisso_campos(c compromissos) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object('compromisso', c.titulo, 'data', to_char(automacao_local(c.inicio), 'DD/MM'),
                            'hora', to_char(automacao_local(c.inicio), 'HH24:MI'),
                            'local', case when c.modalidade = 'VIRTUAL' then 'sala virtual, pelo link ' || c.link_sala else c.local end)
$$;

-- Manda um aviso do compromisso ao contato principal do cliente, agora, pela fila da conversa.
-- Devolve {mensagem} ou {motivo} (por que não saiu).
create function compromisso_avisar(c compromissos, p_chave text, p_nome text, p_dados jsonb default '{}') returns jsonb
language plpgsql
set search_path = public
as $$
declare k clientes_escritorio; ct jsonb; s clientes_sem_avisos; v_texto text; v_campos jsonb; v_conv uuid; v_id uuid;
begin
  if not whatsapp_ligado(c.escritorio_id) then return jsonb_build_object('motivo', 'O WhatsApp do escritório não estava ligado.'); end if;
  select * into k from clientes_escritorio where id = c.cliente_id and escritorio_id = c.escritorio_id;
  if k.id is null or k.estado = 'EXCLUIDO' then return jsonb_build_object('motivo', 'O cliente não está mais em Clientes.'); end if;
  select * into s from clientes_sem_avisos where cliente_id = k.id and retirado_em is null and tipo = 'TODOS';
  if s.id is not null then
    return jsonb_build_object('motivo', 'Pediu para não receber avisos em ' || to_char(automacao_local(s.pedido_em), 'DD/MM/YYYY') || '.');
  end if;
  ct := contato_principal(k.contatos);
  if ct ->> 'telefone' is null or telefone_fixo_br(ct ->> 'telefone') then
    return jsonb_build_object('motivo', 'Sem WhatsApp no contato principal da ficha.');
  end if;
  perform whatsapp_avisos_garantir(c.escritorio_id, 'NAO_ENVIADO');
  select w.texto into v_texto from whatsapp_avisos w where w.escritorio_id = c.escritorio_id and w.chave = p_chave;
  v_campos := jsonb_build_object('nome', split_part(btrim(coalesce(ct ->> 'nome', k.nome)), ' ', 1),
                                 'nome do escritório', (select x.nome from escritorios x where x.id = c.escritorio_id)) || compromisso_campos(c);
  v_texto := automacao_preencher(v_texto, v_campos);
  if v_texto is null then return jsonb_build_object('motivo', 'Falta um dado para completar o texto do aviso.'); end if;
  v_conv := carne_conversa(c.escritorio_id, k, ct);
  insert into conversa_mensagens (escritorio_id, conversa_id, autor, texto, aviso_tipo, envio, dados)
  values (c.escritorio_id, v_conv, 'AVISO', v_texto, p_nome, 'NA_FILA',
          jsonb_build_object('compromisso', c.id, 'aviso', p_chave, 'campos', v_campos) || coalesce(p_dados, '{}'))
  returning id into v_id;
  update conversas set ultima_em = app_now() where id = v_conv;
  return jsonb_build_object('mensagem', v_id);
end $$;

-- ---------------------------------------------------------------------------------------
-- O motor: entra no lembrete do dia útil anterior, confere o compromisso na hora de mandar e
-- põe o link da sala.

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
         and not exists (select 1 from automacao_execucoes x where x.automacao_id = a.id and x.origem_id = p.id);
  elsif a.gatilho = 'ETAPA_CASO' then
    -- Um aviso por mudança de etapa, para o primeiro cliente do caso.
    return query
      select (select cc.cliente_id from caso_clientes cc where cc.caso_id = m.caso_id order by cc.cliente_id limit 1), 'ETAPA', m.id,
             left(cs.nome || ' · ' || t.nome, 160)
        from caso_etapa_mudancas m join casos cs on cs.id = m.caso_id join etapas t on t.id = m.para_etapa_id
       where m.escritorio_id = a.escritorio_id and m.aviso_texto is not null and m.em >= v_desde
         and exists (select 1 from caso_clientes cc where cc.caso_id = m.caso_id)
         and not exists (select 1 from automacao_execucoes x where x.automacao_id = a.id and x.origem_id = m.id);
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


create or replace function automacao_campos_execucao(e automacao_execucoes, a automacoes) returns jsonb
language plpgsql stable
set search_path = public
as $$
declare
  k clientes_escritorio; ct jsonb; v jsonb; r recebimentos_previstos; v_parcela uuid;
begin
  select * into k from clientes_escritorio where id = e.cliente_id;
  ct := contato_principal(k.contatos);
  v := jsonb_build_object('nome', split_part(btrim(coalesce(ct ->> 'nome', k.nome)), ' ', 1),
                          'nome do escritório', (select x.nome from escritorios x where x.id = e.escritorio_id));
  v_parcela := automacao_parcela(e);
  if v_parcela is not null then
    select * into r from recebimentos_previstos where id = v_parcela;
    v := v || jsonb_build_object('parcela', r.descricao, 'vencimento', to_char(r.vencimento, 'DD/MM'),
           'valor', automacao_reais(coalesce((select p.valor from pagamentos_recebidos p where p.id = e.origem_id),
                                             r.valor - parcela_recebido(r.id))));
  elsif e.origem = 'ETAPA' then
    select v || jsonb_build_object('caso', c.nome, 'etapa', t.nome, 'texto da etapa', m.aviso_texto) into v
      from caso_etapa_mudancas m join casos c on c.id = m.caso_id join etapas t on t.id = m.para_etapa_id where m.id = e.origem_id;
  elsif e.origem = 'COMPROMISSO' then
    select v || compromisso_campos(c) into v from compromissos c where c.id = e.origem_id;
  elsif e.origem = 'REPASSE' then
    select v || jsonb_build_object('caso', c.nome, 'valor', automacao_reais(d.valor),
                                   'resumo', 'o valor de ' || automacao_reais(d.valor) || ' foi repassado a você em ' || to_char(d.feito_em, 'DD/MM')) into v
      from destinacoes d join levantamentos l on l.id = d.levantamento_id join casos c on c.id = l.caso_id where d.id = e.origem_id;
  elsif e.origem = 'CLIENTE' then
    v := v || jsonb_build_object('quem atende', (select pe.nome from pessoas pe where pe.id = automacao_quem_atende(e.escritorio_id, e.cliente_id)),
                                 'horário de atendimento', automacao_horario_texto(e.escritorio_id));
  elsif e.origem = 'DOCUMENTO' then
    -- Só o que ainda falta, em casos em andamento (decisão de design 8).
    select v || jsonb_build_object(
             'documentos', automacao_lista(array_agg(d.descricao order by d.pedido_em, d.criado_em)),
             'caso', automacao_lista(array_agg(distinct c.nome)),
             'pedido em', to_char(min(d.pedido_em), 'DD/MM')) into v
      from documento_pedidos d join casos c on c.id = d.caso_id
     where d.id = any (e.documentos) and d.chegou_em is null and c.situacao = 'ANDAMENTO'
    having count(*) > 0;
  end if;
  return v;
end $$;


create or replace function automacao_andar(p_execucao uuid) returns text
language plpgsql
set search_path = public
as $$
declare
  e automacao_execucoes; a automacoes; v_fluxo jsonb; p jsonb; v_texto text; v_conv uuid; v_quando text; r jsonb;
  v_ultima timestamptz; v_pessoa uuid; v_passos integer := 0; c conversas; v_comp timestamptz; v_parcela uuid; v_sai text;
  v_c compromissos;
begin
  select * into e from automacao_execucoes where id = p_execucao for update;
  if e.id is null or e.proximo_em is null then return e.situacao; end if;
  select * into a from automacoes where id = e.automacao_id;
  -- Desligada, a execução para onde está (decisão do desenho: ninguém mais recebe nada dela).
  if a.situacao = 'DESLIGADA' then
    perform automacao_encerrar(e, 'FICOU_DE_FORA', 'A automação foi desligada antes do fim.');
    return 'FICOU_DE_FORA';
  end if;
  v_fluxo := automacao_fluxo_da_execucao(e);
  -- O que faz sair: a parcela paga ou, no documento pendente, o documento que chegou (PA-06).
  v_sai := case when a.gatilho = 'DOCUMENTO_PENDENTE' then 'CHEGOU' else 'PAGOU' end;
  loop
    v_passos := v_passos + 1;
    if v_passos > 60 or e.passo_id is null then
      perform automacao_encerrar(e, 'CONCLUIDA');
      return 'CONCLUIDA';
    end if;
    p := automacao_passo(v_fluxo, e.passo_id);
    if p is null then
      perform automacao_encerrar(e, 'FALHOU', 'O passo da execução não existe mais na versão ligada.');
      return 'FALHOU';
    end if;
    -- Paga, a parcela sai da automação, a menos que o caminho tenha "Pagou" logo adiante.
    if automacao_pagou(e, a) and coalesce(e.ramo, '') <> v_sai then
      if p ->> 'tipo' = 'RAMOS' and exists (select 1 from jsonb_array_elements(p -> 'ramos') x where x ->> 'quando' = v_sai) then
        null;
      elsif exists (select 1 from jsonb_array_elements(v_fluxo -> 'passos') x
                     where x ->> 'tipo' = 'RAMOS' and exists (select 1 from jsonb_array_elements(x -> 'ramos') y where y ->> 'quando' = v_sai))
            and e.ramo is null then
        -- Pula a espera e vai direto aos caminhos.
        e.passo_id := (select x ->> 'id' from jsonb_array_elements(v_fluxo -> 'passos') x where x ->> 'tipo' = 'RAMOS' limit 1);
        continue;
      else
        if v_sai = 'CHEGOU' then
          e.caminho := automacao_caminho_mais(e, 'chegou', 'Chegou');
          perform automacao_encerrar(e, 'CONCLUIDA', 'Chegou: o documento saiu da automação.');
        else
          e.caminho := automacao_caminho_mais(e, 'pagou', 'Pagou');
          perform automacao_encerrar(e, 'CONCLUIDA', 'Pagou: a parcela saiu da automação.');
        end if;
        return 'CONCLUIDA';
      end if;
    end if;
    case p ->> 'tipo'
    when 'GATILHO', 'CONDICOES' then
      e.caminho := automacao_caminho_mais(e, p ->> 'id', case p ->> 'tipo' when 'GATILHO' then 'Gatilho' else 'Condições conferidas' end);
      e.passo_id := automacao_seguinte(v_fluxo, p ->> 'id');

    when 'MENSAGEM' then
      -- Lembrete de compromisso (F3.3): confere o compromisso na hora de mandar.
      if e.origem = 'COMPROMISSO' then
        select * into v_c from compromissos where id = e.origem_id;
        if v_c.estado is distinct from 'MARCADO' or not v_c.lembrete_cliente or v_c.cliente_id is distinct from e.cliente_id then
          perform automacao_encerrar(e, 'FICOU_DE_FORA', case when v_c.estado is distinct from 'MARCADO' then 'O compromisso foi cancelado.'
                                                             when not v_c.lembrete_cliente then 'O lembrete ao cliente foi desmarcado.'
                                                             else 'O cliente do compromisso mudou.' end);
          return 'FICOU_DE_FORA';
        end if;
        v_quando := null;
        -- A menos de 30 minutos do começo, o lembrete já não ajuda.
        if v_c.inicio - interval '30 minutes' < automacao_proximo_horario(app_now()) then
          v_quando := 'faltava menos de 30 minutos para o compromisso';
        else
          -- Atrasado (remarcado ou marcado em cima da hora): se o próximo passo espera "horas
          -- antes" e essa hora chega em menos de 1 hora, sai só o lembrete seguinte.
          r := automacao_passo(v_fluxo, automacao_seguinte(v_fluxo, p ->> 'id'));
          if r ->> 'tipo' = 'ESPERA' and (r ->> 'horasAntes') is not null
             and v_c.inicio - make_interval(hours => (r ->> 'horasAntes')::integer) < automacao_proximo_horario(app_now()) + interval '1 hour' then
            v_quando := 'o lembrete de ' || (r ->> 'horasAntes') || ' horas antes sai logo depois';
          end if;
        end if;
        if v_quando is not null then
          e.caminho := automacao_caminho_mais(e, p ->> 'id', left(coalesce(p ->> 'nome', 'Mensagem') || ' não saiu: ' || v_quando, 160));
          e.passo_id := automacao_seguinte(v_fluxo, p ->> 'id');
          continue;
        end if;
      end if;
      -- Fora do horário, espera o próximo horário permitido.
      if automacao_proximo_horario(app_now()) > app_now() then
        update automacao_execucoes set proximo_em = automacao_proximo_horario(app_now()), passo_id = e.passo_id, caminho = e.caminho,
                                      conversa_id = e.conversa_id, ramo = e.ramo, situacao = 'EM_ANDAMENTO' where id = e.id;
        return 'EM_ANDAMENTO';
      end if;
      -- 1 cobrança por semana por parcela, somando todas as automações.
      if a.gatilho in ('PARCELA_ATRASO', 'PARCELA_VAI_VENCER') then
        select max(x.ultima_msg_em) into v_ultima from automacao_execucoes x
          join automacoes y on y.id = x.automacao_id
         where x.escritorio_id = e.escritorio_id and x.origem_id = e.origem_id and y.gatilho in ('PARCELA_ATRASO', 'PARCELA_VAI_VENCER');
        if v_ultima is not null and v_ultima > app_now() - interval '7 days' then
          e.caminho := automacao_caminho_mais(e, p ->> 'id', 'Espera o limite de 1 cobrança por semana', 'ESPERA');
          update automacao_execucoes set proximo_em = automacao_proximo_horario(v_ultima + interval '7 days'), passo_id = e.passo_id,
                                        caminho = e.caminho, conversa_id = e.conversa_id, ramo = e.ramo, situacao = 'EM_ANDAMENTO'
                                        where id = e.id;
          return 'EM_ANDAMENTO';
        end if;
      end if;
      -- 1 lembrete de documento por semana por cliente, somando as automações e o "Pedir de
      -- novo" (PA-06, decisão 4).
      if a.gatilho = 'DOCUMENTO_PENDENTE' then
        v_ultima := automacao_ultimo_lembrete_doc(e.escritorio_id, e.cliente_id);
        if v_ultima is not null and v_ultima > app_now() - interval '7 days' then
          e.caminho := automacao_caminho_mais(e, p ->> 'id', 'Espera o limite de 1 lembrete por semana', 'ESPERA');
          update automacao_execucoes set proximo_em = automacao_proximo_horario(v_ultima + interval '7 days'), passo_id = e.passo_id,
                                        caminho = e.caminho, conversa_id = e.conversa_id, ramo = e.ramo, situacao = 'EM_ANDAMENTO'
                                        where id = e.id;
          return 'EM_ANDAMENTO';
        end if;
      end if;
      -- Pediu para não receber depois de entrar: para aqui.
      if exists (select 1 from clientes_sem_avisos s where s.cliente_id = e.cliente_id and s.retirado_em is null
                    and (s.tipo = 'TODOS' or a.gatilho in ('PARCELA_ATRASO', 'PARCELA_VAI_VENCER'))) then
        perform automacao_encerrar(e, 'FICOU_DE_FORA', 'Pediu para não receber avisos depois que entrou na automação.');
        return 'FICOU_DE_FORA';
      end if;
      v_texto := coalesce((select m.texto from automacao_modelos m where m.id::text = p ->> 'modeloId' and m.automacao_id = a.id),
                          case when p ->> 'aviso' is not null then (select w.texto from whatsapp_avisos w where w.escritorio_id = a.escritorio_id and w.chave = p ->> 'aviso') end);
      if v_texto is null then
        e.caminho := automacao_caminho_mais(e, p ->> 'id', p ->> 'nome', 'FALHOU');
        perform automacao_encerrar(e, 'FALHOU', 'A mensagem "' || left(p ->> 'nome', 80) || '" não tem texto aprovado.');
        return 'FALHOU';
      end if;
      v_texto := automacao_preencher(v_texto, automacao_campos_execucao(e, a));
      v_conv := automacao_conversa(e);
      if v_texto is null or v_conv is null then
        e.caminho := automacao_caminho_mais(e, p ->> 'id', p ->> 'nome', 'FALHOU');
        perform automacao_encerrar(e, 'FALHOU', case when v_conv is null then 'Sem WhatsApp no contato principal da ficha.'
                                                    else 'Falta um dado para completar o texto da mensagem.' end);
        return 'FALHOU';
      end if;
      insert into conversa_mensagens (escritorio_id, conversa_id, autor, texto, aviso_tipo, envio, dados)
      values (e.escritorio_id, v_conv, 'AVISO', v_texto, left(coalesce(p ->> 'nome', a.nome), 60), 'NA_FILA',
              jsonb_build_object('execucao', e.id, 'automacao', a.id, 'passo', p ->> 'id'));
      update conversas set ultima_em = app_now() where id = v_conv;
      e.conversa_id := v_conv;
      e.ultima_msg_em := app_now();
      e.caminho := automacao_caminho_mais(e, p ->> 'id', p ->> 'nome');
      e.passo_id := automacao_seguinte(v_fluxo, p ->> 'id');
      update automacao_execucoes set ultima_msg_em = e.ultima_msg_em, conversa_id = v_conv where id = e.id;

    when 'ESPERA' then
      e.passo_id := automacao_seguinte(v_fluxo, p ->> 'id');
      if (p ->> 'horasAntes') is not null and e.origem = 'COMPROMISSO' then
        select c2.inicio into v_comp from compromissos c2 where c2.id = e.origem_id and c2.estado = 'MARCADO';
        if v_comp is null then
          perform automacao_encerrar(e, 'FICOU_DE_FORA', 'O compromisso foi cancelado.');
          return 'FICOU_DE_FORA';
        end if;
        v_comp := v_comp - make_interval(hours => (p ->> 'horasAntes')::integer);
      else
        v_comp := app_now() + make_interval(days => coalesce((p ->> 'dias')::integer, 0));
      end if;
      e.caminho := automacao_caminho_mais(e, p ->> 'id',
        case when (p ->> 'horasAntes') is not null then 'Espera até ' || (p ->> 'horasAntes') || 'h antes'
             else 'Espera ' || coalesce(p ->> 'dias', '0') || ' dia(s)' end, 'ESPERA');
      if v_comp > app_now() then
        update automacao_execucoes set proximo_em = v_comp, passo_id = e.passo_id, caminho = e.caminho, conversa_id = e.conversa_id,
                                      ramo = e.ramo, situacao = 'EM_ANDAMENTO' where id = e.id;
        return 'EM_ANDAMENTO';
      end if;

    when 'RAMOS' then
      v_quando := case when automacao_pagou(e, a) then v_sai when automacao_respondeu(e) then 'RESPONDEU' else 'NADA' end;
      select x into r from jsonb_array_elements(p -> 'ramos') x where x ->> 'quando' = v_quando;
      if r is null then
        v_quando := 'NADA';
        select x into r from jsonb_array_elements(p -> 'ramos') x where x ->> 'quando' = 'NADA';
      end if;
      e.ramo := v_quando;
      e.caminho := automacao_caminho_mais(e, (p ->> 'id') || ':' || v_quando,
        case v_quando when 'PAGOU' then 'Pagou' when 'CHEGOU' then 'Chegou' when 'RESPONDEU' then 'Respondeu' else 'Não respondeu' end);
      e.passo_id := r #>> '{passos,0,id}';

    when 'IA' then
      -- A conversa fica com a IA (se ninguém da equipe está nela); ela responde o que o cliente escrever.
      e.caminho := automacao_caminho_mais(e, p ->> 'id', 'IA conversa');
      e.passo_id := automacao_seguinte(v_fluxo, p ->> 'id');

    when 'PESSOA' then
      v_pessoa := automacao_pessoa_do_passo(e, a, p);
      v_conv := automacao_conversa(e);
      if v_conv is not null then
        select * into c from conversas where id = v_conv;
        if c.situacao = 'IA' then
          update conversas set situacao = 'PRECISA', esperando_desde = app_now(), motivo = 'OUTRO',
                               motivo_texto = left(coalesce(nullif(btrim(p ->> 'motivo'), ''), 'Passada pela automação "' || a.nome || '"'), 600),
                               responsavel_id = v_pessoa, responsavel_razao = 'PASSADA', resolvida_em = null, ultima_em = app_now()
           where id = c.id;
          perform conversa_momento(c, 'PASSOU', null, jsonb_build_object('para', v_pessoa, 'automacao', a.id, 'motivo', p ->> 'motivo'));
        end if;
        e.conversa_id := v_conv;
      end if;
      e.caminho := automacao_caminho_mais(e, p ->> 'id', 'Passou para ' || split_part((select pe.nome from pessoas pe where pe.id = v_pessoa), ' ', 1));
      perform automacao_encerrar(e, 'CONCLUIDA', null, v_pessoa);
      return 'CONCLUIDA';

    when 'FIM' then
      e.caminho := automacao_caminho_mais(e, p ->> 'id', 'Fim');
      perform automacao_encerrar(e, 'CONCLUIDA');
      return 'CONCLUIDA';

    else
      perform automacao_encerrar(e, 'FALHOU', 'Passo desconhecido.');
      return 'FALHOU';
    end case;
  end loop;
end $$;


-- ---------------------------------------------------------------------------------------
-- Cancelar, desmarcar e remarcar mexem no lembrete na hora.

create function compromisso_lembrete_mudou() returns trigger
language plpgsql
set search_path = public
as $$
declare e automacao_execucoes; a automacoes; v_motivo text; v_aviso jsonb; v_primeiro text;
begin
  if (new.inicio, new.estado, new.lembrete_cliente, new.cliente_id, new.tipo)
     is not distinct from (old.inicio, old.estado, old.lembrete_cliente, old.cliente_id, old.tipo) then
    return new;
  end if;
  for e in select x.* from automacao_execucoes x join automacoes y on y.id = x.automacao_id
            where x.escritorio_id = new.escritorio_id and x.origem_id = new.id and y.gatilho = 'LEMBRETE_AUDIENCIA' for update of x loop
    select * into a from automacoes where id = e.automacao_id;
    v_motivo := case when new.estado <> 'MARCADO' then 'O compromisso foi cancelado.'
                     when not new.lembrete_cliente or new.cliente_id is null then 'O lembrete ao cliente foi desmarcado.'
                     when new.tipo = 'INTERNO' then 'O compromisso virou interno.'
                     when new.inicio <= app_now() + interval '30 minutes' then 'O compromisso foi remarcado para agora ou para antes.'
                     when a.situacao = 'DESLIGADA' or a.versao_ligada is null then 'A automação está desligada.' end;
    if v_motivo is not null then
      if e.proximo_em is not null then
        e.caminho := automacao_caminho_mais(e, 'compromisso', v_motivo);
        perform automacao_encerrar(e, 'FICOU_DE_FORA', v_motivo);
      end if;
      continue;
    end if;
    if new.inicio is not distinct from old.inicio and new.cliente_id is not distinct from old.cliente_id
       and (old.lembrete_cliente or e.proximo_em is not null) then
      continue;
    end if;
    -- Recomeça para a nova data. Se um lembrete da data antiga já saiu e o de 1 dia antes da
    -- nova data ainda demora, o cliente recebe agora o lembrete com a nova data.
    v_aviso := null;
    if e.ultima_msg_em is not null and new.inicio is distinct from old.inicio and new.cliente_id is not distinct from old.cliente_id
       and compromisso_lembrete_em(new.inicio) > app_now() then
      v_aviso := compromisso_avisar(new, 'LEMBRETE_AUDIENCIA', 'Lembrete · nova data', jsonb_build_object('execucao', e.id));
    end if;
    v_primeiro := automacao_fluxo_valendo(a) #>> '{passos,0,id}';
    update automacao_execucoes
       set versao_numero = a.versao_ligada, cliente_id = new.cliente_id, situacao = 'AGENDADA', motivo = null, responsavel_id = null,
           conversa_id = case when new.cliente_id is distinct from old.cliente_id then null else conversa_id end,
           terminada_em = null, ramo = null, ultima_msg_em = null, passo_id = v_primeiro,
           proximo_em = greatest(app_now(), compromisso_lembrete_em(new.inicio)),
           rotulo = left(new.titulo || ' · ' || to_char(automacao_local(new.inicio), 'DD/MM HH24:MI'), 160),
           caminho = automacao_caminho_mais(e, 'remarcado',
             case when new.inicio is distinct from old.inicio then 'Remarcado para ' || to_char(automacao_local(new.inicio), 'DD/MM, "às" HH24:MI')
                  when new.cliente_id is distinct from old.cliente_id then 'O cliente do compromisso mudou'
                  else 'Lembrete marcado de novo' end
             || case when v_aviso ? 'mensagem' then '; lembrete com a nova data enviado'
                     when v_aviso ? 'motivo' then '; o lembrete com a nova data não saiu: ' || lower(left(v_aviso ->> 'motivo', 1)) || substr(v_aviso ->> 'motivo', 2)
                     else '' end)
     where id = e.id;
  end loop;
  return new;
end $$;

create trigger compromisso_lembrete_mudou after update on compromissos
  for each row execute function compromisso_lembrete_mudou();

-- O aviso de cancelamento: a mensagem que saiu ou por que não saiu.
alter table compromissos
  add column aviso_cancelamento_id     uuid references conversa_mensagens (id) on delete restrict,
  add column aviso_cancelamento_motivo text check (length(btrim(aviso_cancelamento_motivo)) between 3 and 300);

-- Cancelar (PT-03): não apaga; o compromisso fica riscado, com o motivo. "Avisar o cliente" põe
-- o aviso de cancelamento na fila do WhatsApp do escritório (F3.3).
create or replace function portal_compromisso_cancelar(p_pessoa uuid, p_escritorio uuid, p_compromisso uuid, p_versao integer,
                                                       p_motivo text, p_avisar boolean default false)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_versao integer;
  c compromissos;
  v_avisar boolean;
  v_aviso jsonb;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'agenda.editar');
  if length(btrim(coalesce(p_motivo, ''))) not between 1 and 300 then perform recusar_campos('Escreva o motivo', 'motivo'); end if;
  select * into c from compromissos where id = p_compromisso and escritorio_id = p_escritorio;
  if c.id is null then raise exception 'Compromisso não encontrado' using errcode = 'TC404'; end if;
  if c.estado = 'CANCELADO' then perform recusar_motivo('O compromisso já foi cancelado', 'JA_CANCELADO'); end if;
  if c.versao <> p_versao then perform conflito_versao('compromissos', p_compromisso); end if;
  v_avisar := coalesce(p_avisar, false) and c.cliente_id is not null;
  if v_avisar then
    v_aviso := case when c.inicio <= app_now() then jsonb_build_object('motivo', 'O compromisso já tinha começado.')
                    else compromisso_avisar(c, 'COMPROMISSO_CANCELADO', 'Compromisso cancelado') end;
  end if;
  perform definir_transicao('CANCELADO', btrim(p_motivo));
  update compromissos set estado = 'CANCELADO', cancelado_em = app_now(), cancelado_por = p_pessoa, motivo_cancelamento = btrim(p_motivo),
                          avisar_cancelamento = v_avisar,
                          aviso_cancelamento_id = (v_aviso ->> 'mensagem')::uuid, aviso_cancelamento_motivo = v_aviso ->> 'motivo'
   where id = p_compromisso and escritorio_id = p_escritorio and versao = p_versao
  returning versao into v_versao;
  if v_versao is null then perform conflito_versao('compromissos', p_compromisso); end if;
  return v_versao;
end $$;

-- ---------------------------------------------------------------------------------------
-- A ficha do compromisso mostra o lembrete: quando sai, o que saiu, a situação de cada
-- mensagem, a resposta do cliente e o aviso de cancelamento (item 8 das NOTAS).

create function compromisso_lembrete_ficha(c compromissos) returns jsonb
language plpgsql stable
set search_path = public
as $$
declare
  e automacao_execucoes; k clientes_escritorio; ct jsonb; v_h integer := compromisso_lembrete_horas_antes(c.escritorio_id);
  v_msgs jsonb; v_primeira timestamptz; v_conv uuid; v_previa text;
begin
  select x.* into e from automacao_execucoes x join automacoes y on y.id = x.automacao_id
   where x.escritorio_id = c.escritorio_id and x.origem_id = c.id and y.gatilho = 'LEMBRETE_AUDIENCIA'
   order by x.iniciada_em desc limit 1;
  select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'nome', m.aviso_tipo, 'em', m.criada_em, 'envio', m.envio,
                                               'envioEm', m.envio_em, 'envioMotivo', m.envio_motivo, 'texto', m.texto) order by m.criada_em), '[]'::jsonb),
         min(m.criada_em), (array_agg(m.conversa_id order by m.criada_em desc))[1]
    into v_msgs, v_primeira, v_conv
    from conversa_mensagens m
   where m.escritorio_id = c.escritorio_id and m.autor = 'AVISO'
     and ((e.id is not null and m.dados ->> 'execucao' = e.id::text)
          or (m.dados ->> 'compromisso' = c.id::text and m.dados ->> 'aviso' = 'LEMBRETE_AUDIENCIA'));
  select * into k from clientes_escritorio where id = c.cliente_id and estado <> 'EXCLUIDO';
  ct := contato_principal(k.contatos);
  if k.id is not null then
    v_previa := automacao_preencher(
      coalesce((select w.texto from whatsapp_avisos w where w.escritorio_id = c.escritorio_id and w.chave = 'LEMBRETE_AUDIENCIA'),
               'Olá, {nome}. Aqui é do escritório {nome do escritório}. Lembrete: {compromisso}, no dia {data}, às {hora}. Local: {local}. Responda CONFIRMO, ou escreva se tiver alguma dúvida.'),
      jsonb_build_object('nome', split_part(btrim(coalesce(ct ->> 'nome', k.nome)), ' ', 1),
                         'nome do escritório', (select x.nome from escritorios x where x.id = c.escritorio_id)) || compromisso_campos(c));
  end if;
  return jsonb_build_object(
    'umDia', compromisso_lembrete_em(c.inicio),
    'horasAntes', v_h,
    'antes', compromisso_lembrete_horas(c.inicio, v_h),
    'situacao', e.situacao, 'motivo', e.motivo, 'proximoEm', e.proximo_em,
    'automacaoLigada', exists (select 1 from automacoes a where a.escritorio_id = c.escritorio_id and a.pronta_chave = 'LEMBRETE_AUDIENCIA'
                                                           and a.situacao in ('LIGADA', 'EM_APROVACAO') and a.versao_ligada is not null)
                       or not exists (select 1 from automacoes a where a.escritorio_id = c.escritorio_id and a.pronta_chave = 'LEMBRETE_AUDIENCIA'),
    'mensagens', v_msgs,
    'conversaId', coalesce(v_conv, e.conversa_id),
    -- A primeira resposta do cliente depois do primeiro lembrete.
    'resposta', (select jsonb_build_object('em', m.criada_em, 'texto', left(m.texto, 300)) from conversa_mensagens m
                  where v_conv is not null and m.conversa_id = v_conv and m.autor = 'CLIENTE' and m.criada_em > v_primeira and m.texto is not null
                  order by m.criada_em limit 1),
    'previa', v_previa);
end $$;

create or replace function portal_compromisso(p_pessoa uuid, p_escritorio uuid, p_compromisso uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c compromissos;
  v_juridico boolean;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'agenda.ver');
  select * into c from compromissos where id = p_compromisso and escritorio_id = p_escritorio;
  if c.id is null then raise exception 'Compromisso não encontrado' using errcode = 'TC404'; end if;
  v_juridico := tem_juridico(p_pessoa, p_escritorio);
  return compromisso_linha(c) || jsonb_build_object(
    'linkSala', c.link_sala, 'observacoes', c.observacoes, 'versao', c.versao, 'criadoEm', c.criado_em,
    'criadoPor', pessoa_ref(c.criado_por),
    'juridico', v_juridico,
    -- O caso só vai para quem tem o Jurídico; quem não tem sabe apenas que há um (para não apagá-lo sem querer).
    'caso', case when v_juridico and c.caso_id is not null then compromisso_caso_ref(c.caso_id) end,
    'temCaso', c.caso_id is not null,
    'contatoCliente', (select contato_principal(k.contatos) from clientes_escritorio k where k.id = c.cliente_id and k.estado <> 'EXCLUIDO'),
    'whatsappLigado', whatsapp_ligado(p_escritorio),
    'lembretes', case when c.cliente_id is not null then compromisso_lembrete_ficha(c) end,
    'cancelamento', case when c.estado = 'CANCELADO' then jsonb_build_object(
      'em', c.cancelado_em, 'por', pessoa_ref(c.cancelado_por), 'motivo', c.motivo_cancelamento, 'avisar', c.avisar_cancelamento,
      'aviso', case when c.avisar_cancelamento then jsonb_build_object(
        'motivo', c.aviso_cancelamento_motivo,
        'mensagem', (select jsonb_build_object('id', m.id, 'em', m.criada_em, 'envio', m.envio, 'envioMotivo', m.envio_motivo,
                                               'texto', m.texto, 'conversaId', m.conversa_id)
                       from conversa_mensagens m where m.id = c.aviso_cancelamento_id)) end) end,
    'historico', coalesce((
      select jsonb_agg(jsonb_build_object('em', h.ocorrido_em, 'acao', h.acao, 'autor', p.nome, 'dados', h.dados) order by h.id)
        from historico h left join pessoas p on p.id = h.autor_id
       where h.escritorio_id = p_escritorio and h.entidade = 'compromissos' and h.entidade_id = c.id::text), '[]'::jsonb));
end $$;

-- A Agenda sabe se os lembretes já saem pelo WhatsApp do escritório.
create or replace function portal_agenda(p_pessoa uuid, p_escritorio uuid, p_de date, p_ate date, p_de_quem uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_juridico boolean;
  v_ini timestamptz;
  v_fim timestamptz;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'agenda.ver');
  if p_de is null or p_ate is null or p_ate < p_de or p_ate - p_de > 62 then
    perform recusar_campos('Período inválido', 'de', 'ate');
  end if;
  if p_de_quem is not null and not pessoa_do_escritorio(p_de_quem, p_escritorio) then
    perform recusar_campos('Pessoa fora do escritório', 'pessoa');
  end if;
  v_juridico := tem_juridico(p_pessoa, p_escritorio);
  v_ini := p_de::timestamp at time zone 'America/Sao_Paulo';
  v_fim := (p_ate + 1)::timestamp at time zone 'America/Sao_Paulo';
  return jsonb_build_object(
    'juridico', v_juridico,
    -- Se os lembretes já saem (F3.3).
    'whatsappLigado', whatsapp_ligado(p_escritorio),
    'algum', exists (select 1 from compromissos c where c.escritorio_id = p_escritorio),
    'compromissos', coalesce((
      select jsonb_agg(compromisso_linha(c)
                       || case when v_juridico and c.caso_id is not null then jsonb_build_object('caso', compromisso_caso_ref(c.caso_id)) else '{}'::jsonb end
                       order by c.inicio, c.fim, c.titulo)
        from compromissos c
       where c.escritorio_id = p_escritorio and c.inicio < v_fim and c.fim > v_ini
         and (p_de_quem is null or c.responsavel_id = p_de_quem or p_de_quem = any (c.tambem_vai))), '[]'::jsonb),
    'feriados', coalesce((select jsonb_agg(jsonb_build_object('data', f.data, 'nome', f.nome) order by f.data)
                            from feriados f where f.data between p_de and p_ate), '[]'::jsonb),
    -- Os prazos abertos do período, pelo prazo final (PD-04, PD-07). Nunca para quem não tem a área.
    'prazos', case when v_juridico then coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', p.id, 'titulo', p.descricao, 'vence', p.data_final, 'fazerAte', p.fazer_ate,
               'processo', coalesce(cnj_formatado(c.numero_cnj), c.nome),
               'caso', jsonb_build_object('id', c.id, 'nome', c.nome),
               'responsavel', pessoa_ref(p.responsavel_id))
             order by p.data_final, p.criado_em)
        from prazos p join casos c on c.id = p.caso_id
       where p.escritorio_id = p_escritorio and p.cumprido_em is null and p.data_final between p_de and p_ate
         and (p_de_quem is null or p.responsavel_id = p_de_quem)), '[]'::jsonb) end,
    'tiposEscritos', coalesce((select jsonb_agg(t order by t) from (select distinct c.tipo_escrito t from compromissos c
                                                                     where c.escritorio_id = p_escritorio and c.tipo_escrito is not null) x), '[]'::jsonb));
end $$;

call fechar_acesso();
