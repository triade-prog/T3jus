-- O aviso de mudança de etapa a cada cliente do caso (F3.37; EX-14) e a prestação de contas
-- pela fila do WhatsApp do escritório (F3.44; FI-12). Segue o padrão do F3.3 (0670) e do carnê
-- (0625): a mensagem entra na fila da conversa (conversa_mensagens, autor AVISO, envio
-- NA_FILA), com o aviso aprovado e os campos em dados, para a ligação com a Meta (F3.58) mandar
-- o aviso quando a janela de 24 horas estiver fechada. Até a Meta ser ligada, nada sai.
--
-- Etapa do caso (desenho aprovado em docs/design/aprovadas/portal-juridico, decisões 5 e 6, e
-- a automação pronta "Etapa do caso" de docs/design/aprovadas/portal-conversas-automacoes):
--  * quem muda a etapa com "Avisar" marcado põe o aviso na automação "Etapa do caso", que
--    manda um por cliente do caso, cada um no próprio número e com o primeiro nome do contato
--    principal (antes ia só ao primeiro cliente);
--  * o meio do aviso (o texto da etapa, ou o ajustado só desta vez) fica guardado à parte: a
--    automação usava o aviso inteiro no lugar de {texto da etapa}, e o texto saía dobrado;
--  * o aviso é o "Etapa do caso" aprovado nos textos no tom (D5), "Novidade no caso {caso}",
--    que é o que vai para a Meta. A janela de mudar etapa passa a mostrar este texto (aprovado
--    pela Carol em 21/11/2026);
--  * a ficha mostra, em cada mudança, para quem o aviso saiu e a situação de cada mensagem.
--
-- Prestação de contas (desenho aprovado em docs/design/aprovadas/portal-financeiro, decisão
-- 12): depois de revisar, "Mandar pelo WhatsApp" põe a mensagem na fila da conversa do contato
-- principal; o repasse mostra a situação e a hora em que o cliente leu. Fora da janela de 24
-- horas, a Meta recebe o aviso "Prestação de contas" com o resumo numa linha. A automação
-- pronta "Prestação de contas" não manda outra para o mesmo repasse. Sem o WhatsApp ligado,
-- continua "Marcar como enviada".

-- ---------------------------------------------------------------------------------------
-- Etapa do caso.

alter table caso_etapa_mudancas add column aviso_meio text
  check (aviso_meio is null or length(btrim(aviso_meio)) between 10 and 240);

-- A execução da automação de cada cliente na mesma mudança de etapa.
create function etapa_execucao_id(p_mudanca uuid, p_cliente uuid) returns uuid
language sql immutable
as $$ select md5(p_mudanca::text || ':' || p_cliente::text)::uuid $$;

-- A mudança de etapa de uma execução (a antiga, de antes do F3.37, usa o id da mudança).
create function etapa_mudanca_da_execucao(e automacao_execucoes) returns uuid
language sql stable
set search_path = public
as $$
  select id from (
    select m.id, 0 o from caso_etapa_mudancas m where m.id = e.origem_id
    union all
    select m.id, 1 from caso_etapa_mudancas m join caso_clientes cc on cc.caso_id = m.caso_id and cc.cliente_id = e.cliente_id
     where etapa_execucao_id(m.id, e.cliente_id) = e.origem_id) x
  order by o limit 1
$$;

-- O aviso "Etapa do caso" de um cliente: o primeiro nome do contato principal, o caso e o meio.
create function etapa_aviso_texto(p_escritorio uuid, p_cliente uuid, p_caso text, p_meio text) returns text
language plpgsql
set search_path = public
as $$
declare k clientes_escritorio; v_texto text;
begin
  select * into k from clientes_escritorio where id = p_cliente;
  if k.id is null then return null; end if;
  perform whatsapp_avisos_garantir(p_escritorio, 'NAO_ENVIADO');
  select w.texto into v_texto from whatsapp_avisos w where w.escritorio_id = p_escritorio and w.chave = 'ETAPA_CASO';
  return automacao_preencher(v_texto, jsonb_build_object(
    'nome', split_part(btrim(coalesce(contato_principal(k.contatos) ->> 'nome', k.nome)), ' ', 1),
    'nome do escritório', (select e.nome from escritorios e where e.id = p_escritorio),
    'caso', p_caso, 'texto da etapa', btrim(p_meio)));
end $$;

-- Ao gravar a mudança com aviso: guarda o meio e o aviso como o primeiro cliente recebe.
create function caso_etapa_mudanca_aviso() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.aviso_texto is null then return new; end if;
  new.aviso_meio := coalesce(nullif(btrim(coalesce(current_setting('t3jus.aviso_meio', true), '')), ''),
                             (select t.texto_cliente from etapas t where t.id = new.para_etapa_id));
  new.aviso_texto := coalesce(etapa_aviso_texto(new.escritorio_id,
                                                (select cc.cliente_id from caso_clientes cc where cc.caso_id = new.caso_id order by cc.ordem limit 1),
                                                (select c.nome from casos c where c.id = new.caso_id), new.aviso_meio),
                              new.aviso_texto);
  return new;
end $$;
create trigger caso_etapa_mudanca_aviso before insert on caso_etapa_mudancas
  for each row execute function caso_etapa_mudanca_aviso();

alter function portal_juridico_caso_etapa(uuid, uuid, uuid, integer, jsonb) rename to juridico_caso_etapa_sem_fila;
create function portal_juridico_caso_etapa(p_pessoa uuid, p_escritorio uuid, p_caso uuid, p_versao integer, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare r jsonb;
begin
  perform set_config('t3jus.aviso_meio', btrim(coalesce(p_dados ->> 'textoAviso', '')), true);
  r := juridico_caso_etapa_sem_fila(p_pessoa, p_escritorio, p_caso, p_versao, p_dados);
  perform set_config('t3jus.aviso_meio', '', true);
  return r || jsonb_build_object('aviso',
    (select m.aviso_texto from caso_etapa_mudancas m where m.caso_id = p_caso and m.escritorio_id = p_escritorio order by m.ordem desc limit 1));
end $$;

-- A automação "Etapa do caso" está ligada? (As prontas nascem ligadas.)
create function etapa_automacao_ligada(p_escritorio uuid) returns boolean
language sql stable
set search_path = public
as $$
  select coalesce((select a.situacao in ('LIGADA', 'EM_APROVACAO') and a.versao_ligada is not null
                     from automacoes a where a.escritorio_id = p_escritorio and a.pronta_chave = 'ETAPA_CASO'), true)
$$;

-- Para quem o aviso de uma mudança saiu: cada cliente do caso, com a situação da execução e
-- da mensagem.
create function etapa_envios(m caso_etapa_mudancas) returns jsonb
language sql stable
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'cliente', jsonb_build_object('id', k.id, 'nome', k.nome),
           'situacao', x.situacao, 'motivo', x.motivo,
           'mensagem', (select jsonb_build_object('envio', cm.envio, 'em', cm.criada_em, 'envioEm', cm.envio_em, 'motivo', cm.envio_motivo)
                          from conversa_mensagens cm where cm.conversa_id = x.conversa_id and cm.dados ->> 'execucao' = x.id::text
                         order by cm.criada_em limit 1))
         order by cc.ordem), '[]'::jsonb)
    from caso_clientes cc join clientes_escritorio k on k.id = cc.cliente_id
    left join lateral (select ex.* from automacao_execucoes ex join automacoes a on a.id = ex.automacao_id
                        where a.escritorio_id = m.escritorio_id and a.gatilho = 'ETAPA_CASO' and ex.cliente_id = cc.cliente_id
                          and ex.origem_id in (m.id, etapa_execucao_id(m.id, cc.cliente_id))
                        order by ex.iniciada_em limit 1) x on true
   where cc.caso_id = m.caso_id and m.aviso_texto is not null
$$;

alter function portal_juridico_caso(uuid, uuid, uuid) rename to juridico_caso_sem_envios;
create function portal_juridico_caso(p_pessoa uuid, p_escritorio uuid, p_caso uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare r jsonb;
begin
  r := juridico_caso_sem_envios(p_pessoa, p_escritorio, p_caso);
  return r || jsonb_build_object(
    'avisoEtapa', jsonb_build_object('whatsappLigado', whatsapp_ligado(p_escritorio), 'automacaoLigada', etapa_automacao_ligada(p_escritorio)),
    'mudancas', coalesce((select jsonb_agg(jsonb_build_object(
        'para', (select jsonb_build_object('ordem', e.ordem, 'nome', e.nome) from etapas e where e.id = m.para_etapa_id),
        'de', (select jsonb_build_object('ordem', e.ordem, 'nome', e.nome) from etapas e where e.id = m.de_etapa_id),
        'motivo', m.motivo, 'resultado', m.resultado, 'aviso', m.aviso_texto, 'avisoEnviadoEm', m.aviso_enviado_em,
        'envios', etapa_envios(m),
        'por', pessoa_ref(m.por), 'em', m.em) order by m.ordem desc)
      from caso_etapa_mudancas m where m.caso_id = p_caso and m.escritorio_id = p_escritorio), '[]'::jsonb));
end $$;

-- "Quem entraria": cada cliente do caso.
create or replace function automacao_quem_entraria_juridico(a automacoes) returns jsonb
language plpgsql stable
set search_path = public
as $$
declare v_itens jsonb;
begin
  select coalesce(jsonb_agg(x.j order by x.ord, x.quando), '[]'::jsonb) into v_itens from (
    select o.quando, case when fora.motivo is null then 0 else 1 end ord,
           jsonb_build_object(
             'origem', jsonb_build_object('id', o.id, 'descricao', o.descricao, 'quando', o.quando),
             'cliente', jsonb_build_object('id', k.id, 'nome', k.nome),
             'contato', jsonb_build_object('nome', ct ->> 'nome', 'papel', ct ->> 'papel'),
             'entra', fora.motivo is null, 'motivo', fora.motivo, 'detalhe', fora.detalhe) j
      from (
        select c.id, c.cliente_id, left(c.titulo, 160) descricao, c.inicio quando
          from compromissos c
         where a.gatilho = 'LEMBRETE_AUDIENCIA' and c.escritorio_id = a.escritorio_id and c.estado = 'MARCADO'
           and c.cliente_id is not null and c.lembrete_cliente and c.tipo <> 'INTERNO'
           and c.inicio > app_now() and c.inicio <= app_now() + interval '7 days'
        union all
        select m.id, cc.cliente_id, left(cs.nome || ' · ' || t.nome, 160), m.em
          from caso_etapa_mudancas m join casos cs on cs.id = m.caso_id join etapas t on t.id = m.para_etapa_id
          join caso_clientes cc on cc.caso_id = m.caso_id
         where a.gatilho = 'ETAPA_CASO' and m.escritorio_id = a.escritorio_id and m.aviso_texto is not null
           and m.em >= app_now() - interval '7 days') o
      join clientes_escritorio k on k.id = o.cliente_id
      cross join lateral (select contato_principal(k.contatos) ct) cc
      left join lateral (select s.quem_pediu, s.pedido_em, s.tipo from clientes_sem_avisos s
                          where s.cliente_id = k.id and s.retirado_em is null and s.tipo = 'TODOS' limit 1) sa_ on true
      cross join lateral (
        select case when sa_.tipo is not null then 'SEM_AVISOS'
                    when ct ->> 'telefone' is null or telefone_fixo_br(ct ->> 'telefone') then 'SEM_WHATSAPP' end motivo,
               case when sa_.tipo is not null then jsonb_build_object('quemPediu', sa_.quem_pediu, 'em', sa_.pedido_em, 'tipo', sa_.tipo) end detalhe) fora
     limit 200) x;
  return jsonb_build_object('disponivel', true, 'itens', v_itens);
end $$;

-- ---------------------------------------------------------------------------------------
-- Prestação de contas.

alter table levantamentos add column prestacao_mensagem_id uuid references conversa_mensagens (id) on delete restrict;

-- A mensagem da prestação de contas, para a ficha do repasse: a situação e a hora em que leu.
create function prestacao_mensagem(l levantamentos) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object('id', m.id, 'envio', m.envio, 'em', m.criada_em, 'envioEm', m.envio_em, 'motivo', m.envio_motivo,
                            'para', (select v.nome_contato from conversas v where v.id = m.conversa_id),
                            'telefone', (select v.telefone from conversas v where v.id = m.conversa_id))
    from conversa_mensagens m where m.id = l.prestacao_mensagem_id
$$;

create or replace function levantamento_linha(l levantamentos) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', l.id, 'tipo', l.tipo, 'valor', l.valor, 'entrouEm', l.entrou_em, 'criadoEm', l.criado_em, 'autor', pessoa_ref(l.autor_id),
    'responsavel', pessoa_ref(l.responsavel_id),
    'prestacaoEm', l.prestacao_em, 'prestacaoPor', case when l.prestacao_por is not null then pessoa_ref(l.prestacao_por) end,
    'prestacao', prestacao_mensagem(l),
    'whatsappLigado', whatsapp_ligado(l.escritorio_id),
    'escritorioNome', (select e.nome from escritorios e where e.id = l.escritorio_id),
    'caso', (select jsonb_build_object('id', c.id, 'nome', c.nome, 'parteContraria', c.parte_contraria, 'area', c.area) from casos c where c.id = l.caso_id),
    'cliente', (select jsonb_build_object('id', k.id, 'nome', k.nome, 'telefone', contato_principal(k.contatos) ->> 'telefone')
                  from clientes_escritorio k where k.id = l.cliente_id),
    'feitos', (select count(*) from destinacoes d where d.levantamento_id = l.id and (d.feito_em is not null or d.dispensado_em is not null)),
    'total', (select count(*) from destinacoes d where d.levantamento_id = l.id),
    'destinacoes', coalesce((select jsonb_agg(destinacao_linha(d) order by d.ordem) from destinacoes d where d.levantamento_id = l.id), '[]'::jsonb))
$$;

-- O resumo numa linha, para o aviso "Prestação de contas" fora da janela de 24 horas.
create function prestacao_resumo(l levantamentos) returns text
language sql stable
set search_path = public
as $$
  select 'recebemos ' || automacao_reais(l.valor)
         || case when coalesce(o.valor, 0) > 0 then ', descontamos ' || automacao_reais(o.valor) else '' end
         || ' e fica para você ' || automacao_reais(coalesce(f.valor, 0))
    from (select sum(d.valor)::bigint valor from destinacoes d where d.levantamento_id = l.id and d.para <> 'CLIENTE' and d.dispensado_em is null) o,
         (select sum(d.valor)::bigint valor from destinacoes d where d.levantamento_id = l.id and d.para = 'CLIENTE') f
$$;

-- Mandar a prestação de contas revisada: entra na fila da conversa do contato principal. O
-- texto vem da api-portal, montado do registro com textoPrestacaoContas (o mesmo da prévia).
create function portal_financeiro_prestacao_enviar(p_pessoa uuid, p_escritorio uuid, p_levantamento uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  l levantamentos; k clientes_escritorio; ct jsonb; v_texto text := btrim(coalesce(p_dados ->> 'texto', ''));
  v_campos jsonb; v_conv uuid; v_msg uuid;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.editar');
  select * into l from levantamentos where id = p_levantamento and escritorio_id = p_escritorio for update;
  if l.id is null then raise exception 'Repasse não encontrado' using errcode = 'TC404'; end if;
  if l.prestacao_mensagem_id is not null then
    perform recusar_motivo('A prestação de contas deste repasse já está na fila do WhatsApp', 'JA_ENVIADA');
  end if;
  if not whatsapp_ligado(p_escritorio) then perform recusar_motivo('O WhatsApp do escritório não está ligado', 'WHATSAPP_NAO_LIGADO'); end if;
  select * into k from clientes_escritorio where id = l.cliente_id;
  ct := contato_principal(k.contatos);
  if ct ->> 'telefone' is null or telefone_fixo_br(ct ->> 'telefone') then
    perform recusar_motivo('O contato principal não tem celular na ficha', 'SEM_WHATSAPP');
  end if;
  if length(v_texto) not between 1 and 4096 then perform recusar_campos('Confira a mensagem', 'texto'); end if;
  v_campos := jsonb_build_object('nome', split_part(btrim(coalesce(ct ->> 'nome', k.nome)), ' ', 1),
                                 'nome do escritório', (select e.nome from escritorios e where e.id = p_escritorio),
                                 'caso', (select c.nome from casos c where c.id = l.caso_id),
                                 'resumo', prestacao_resumo(l), 'valor', automacao_reais(l.valor));
  v_conv := carne_conversa(p_escritorio, k, ct);
  insert into conversa_mensagens (escritorio_id, conversa_id, autor, texto, aviso_tipo, envio, dados)
  values (p_escritorio, v_conv, 'AVISO', v_texto, 'Prestação de contas', 'NA_FILA',
          jsonb_build_object('levantamento', l.id, 'pessoa', p_pessoa, 'aviso', 'PRESTACAO_CONTAS', 'campos', v_campos))
  returning id into v_msg;
  update conversas set ultima_em = app_now() where id = v_conv;
  update levantamentos set prestacao_em = app_now(), prestacao_por = p_pessoa, prestacao_mensagem_id = v_msg where id = l.id returning * into l;
  perform registrar_historico('financeiro.prestacao_enviada', 'levantamentos', l.id::text, jsonb_build_object('mensagem', v_msg, 'whatsapp', true));
  return levantamento_linha(l);
end $$;

-- ---------------------------------------------------------------------------------------
-- O motor: a etapa a cada cliente do caso, com o meio certo; a prestação de contas que a
-- equipe já mandou não sai de novo pela automação.

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
    -- O meio do aviso (F3.37): o texto da etapa, ou o ajustado só desta vez.
    select v || jsonb_build_object('caso', c.nome, 'etapa', t.nome, 'texto da etapa', coalesce(m.aviso_meio, t.texto_cliente)) into v
      from caso_etapa_mudancas m join casos c on c.id = m.caso_id join etapas t on t.id = m.para_etapa_id
     where m.id = etapa_mudanca_da_execucao(e);
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


call fechar_acesso();
