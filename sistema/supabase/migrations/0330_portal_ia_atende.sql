-- Conversas: a IA que atende pelo WhatsApp do escritório (F3.53; PA-05, PA-04, PD-07, PT-11).
-- Decisões da Carol (desenho aprovado em docs/design/aprovadas/portal-whatsapp, 19/11/2026):
-- 1. a IA começa desligada; desligada ou pausada, toda conversa vai direto para a equipe;
-- 2. a IA não entra em conversa já respondida por uma pessoa: com a equipe, ou respondida pelo
--    app WhatsApp Business no celular (o mesmo número), ela fica em silêncio;
-- 3. fora do horário, a IA responde o que sabe e diz quando uma pessoa vai ver;
-- 4. quando não sabe, ou cai num dos casos fixos, passa para uma pessoa, com responsável.
-- A IA só recebe os dados do cliente que está escrevendo, do contato da ficha, filtrados pelos
-- assuntos ligados; número desconhecido não recebe dado de caso nenhum. As regras fixas (nunca
-- opinar, negociar, falar de outro cliente ou prometer prazo; sempre dizer que é assistente
-- virtual) ficam no código do serviço e são conferidas antes de enviar.
-- O envio e o recebimento pela Meta (webhook, fila de envio) dependem da ligação com a Meta
-- (F3.58); as peças abaixo são as que o serviço chama.

-- ---------------------------------------------------------------------------------------
-- Conversas: os motivos novos de passar, a resposta pelo app no celular.

alter table conversas drop constraint conversas_motivo_check;
alter table conversas add constraint conversas_motivo_check
  check (motivo in ('PROPOSTA_ACORDO', 'DOCUMENTO_NOVO', 'CLIENTE_NOVO', 'VALOR', 'ESTRATEGIA', 'RECLAMACAO', 'PEDIU_PESSOA', 'OUTRO',
                    'URGENCIA', 'NAO_SOUBE', 'IA_DESLIGADA', 'PALAVRA', 'REGRA_FIXA'));

alter table conversas drop constraint conversas_responsavel_razao_check;
alter table conversas add constraint conversas_responsavel_razao_check
  check (responsavel_razao in ('CASO', 'PROXIMO_CONTATO', 'COMERCIAL', 'SOCIO_DONO', 'PASSADA', 'ASSUMIU', 'SAIU_DA_EQUIPE', 'APP_CELULAR'));

-- APP: escrita no app WhatsApp Business do celular, com o mesmo número (decisão 2 do número).
alter table conversa_mensagens drop constraint conversa_mensagens_autor_check;
alter table conversa_mensagens add constraint conversa_mensagens_autor_check
  check (autor in ('CLIENTE', 'IA', 'EQUIPE', 'AVISO', 'SISTEMA', 'APP'));

alter table conversa_mensagens drop constraint conversa_mensagens_evento_check;
alter table conversa_mensagens add constraint conversa_mensagens_evento_check
  check (evento in ('IA_PASSOU', 'ASSUMIU', 'DEVOLVEU', 'PASSOU', 'IA_RESOLVEU', 'RESPONSAVEL_SAIU', 'APP_RESPONDEU'));

-- ---------------------------------------------------------------------------------------
-- O que a IA sabe de quem escreve.

-- A hora de Brasília, sem fuso (o serviço monta as frases de horário com ela).
create function agora_brasilia() returns timestamp
language sql stable
set search_path = public
as $$ select (app_now() at time zone 'America/Sao_Paulo') $$;

-- O contexto da IA para um cliente e um contato da ficha (ou para um número desconhecido, sem
-- cliente). Só os assuntos ligados entram; o escritório e a configuração sempre.
create function ia_contexto_json(p_escritorio uuid, p_cliente uuid, p_contato jsonb) returns jsonb
language plpgsql stable
set search_path = public
as $$
declare
  c ia_config;
  v_cli clientes_escritorio;
  v_quem record;
  v_comercial record;
  v_dados jsonb := '{}'::jsonb;
begin
  select * into c from ia_config where escritorio_id = p_escritorio;
  if p_cliente is not null then
    select * into v_cli from clientes_escritorio where id = p_cliente and escritorio_id = p_escritorio and estado = 'ATIVO';
  end if;
  select x.pessoa, x.razao into v_quem from conversa_quem_responde(p_escritorio, v_cli.id) x;
  select x.pessoa into v_comercial from conversa_quem_responde(p_escritorio, null) x;

  if v_cli.id is not null then
    if 'ANDAMENTO_CASO' = any (c.assuntos) then
      v_dados := v_dados || jsonb_build_object('casos', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'nome', k.nome, 'etapa', e.nome, 'desde', to_char(k.etapa_desde at time zone 'America/Sao_Paulo', 'YYYY-MM-DD'),
                 'texto', coalesce((select m.aviso_texto from caso_etapa_mudancas m
                                     where m.caso_id = k.id and m.para_etapa_id = k.etapa_id and m.aviso_texto is not null
                                     order by m.ordem desc limit 1), e.texto_cliente),
                 'quemEscreveu', (select p.nome from caso_etapa_mudancas m join pessoas p on p.id = m.por
                                   where m.caso_id = k.id and m.para_etapa_id = k.etapa_id order by m.ordem desc limit 1),
                 'responsavel', (select p.nome from pessoas p where p.id = k.responsavel_id)) order by k.etapa_desde desc)
          from casos k join caso_clientes cc on cc.caso_id = k.id join etapas e on e.id = k.etapa_id
         where k.escritorio_id = p_escritorio and cc.cliente_id = v_cli.id and k.situacao = 'ANDAMENTO'), '[]'::jsonb));
    end if;
    if 'COMPROMISSOS' = any (c.assuntos) then
      v_dados := v_dados || jsonb_build_object('compromissos', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'titulo', m.titulo, 'tipo', m.tipo,
                 'inicio', to_char(m.inicio at time zone 'America/Sao_Paulo', 'YYYY-MM-DD"T"HH24:MI'),
                 'modalidade', m.modalidade, 'local', m.local, 'link', m.link_sala) order by m.inicio)
          from compromissos m
         where m.escritorio_id = p_escritorio and m.cliente_id = v_cli.id and m.estado = 'MARCADO' and m.tipo <> 'INTERNO'
           and m.inicio >= app_now() and m.inicio < app_now() + interval '90 days'), '[]'::jsonb));
    end if;
    if 'PARCELAS' = any (c.assuntos) then
      v_dados := v_dados || jsonb_build_object('parcelas', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'descricao', x.descricao, 'vencimento', x.vencimento, 'valor', x.valor, 'falta', x.valor - x.recebido,
                 'situacao', x.situacao) order by x.vencimento)
          from (select r.descricao, r.vencimento, r.valor, parcela_recebido(r.id) as recebido,
                       parcela_situacao(r, parcela_recebido(r.id)) as situacao
                  from recebimentos_previstos r join contratos k on k.id = r.contrato_id
                 where r.escritorio_id = p_escritorio and k.cliente_id = v_cli.id and r.valor is not null
                   and r.vencimento < hoje_brasilia() + 60) x
         where x.situacao in ('VENCIDA', 'PARCIAL', 'A_VENCER')), '[]'::jsonb));
    end if;
    if 'DOCUMENTOS' = any (c.assuntos) then
      v_dados := v_dados || jsonb_build_object('documentos', coalesce((
        select jsonb_agg(jsonb_build_object('descricao', d.descricao, 'pedidoEm', coalesce(d.repedido_em, d.pedido_em)) order by d.pedido_em)
          from documento_pedidos d
         where d.escritorio_id = p_escritorio and d.cliente_id = v_cli.id and d.chegou_em is null), '[]'::jsonb));
    end if;
  end if;

  return jsonb_build_object(
    'escritorio', (select nome from escritorios where id = p_escritorio),
    'config', ia_config_json(c) || jsonb_build_object('situacao', c.situacao),
    'agora', to_char(agora_brasilia(), 'YYYY-MM-DD"T"HH24:MI'),
    'feriados', coalesce((select jsonb_agg(f.data order by f.data) from feriados f
                           where f.data between hoje_brasilia() and hoje_brasilia() + 30), '[]'::jsonb),
    'cliente', case when v_cli.id is not null then jsonb_build_object('nome', v_cli.nome) end,
    'contato', case when v_cli.id is not null and p_contato is not null
                    then jsonb_build_object('nome', p_contato ->> 'nome', 'papel', p_contato ->> 'papel',
                                            'principal', coalesce((p_contato ->> 'principal')::boolean, false)) end,
    'quemResponde', jsonb_build_object('nome', (select nome from pessoas where id = v_quem.pessoa), 'razao', v_quem.razao),
    'comercial', (select nome from pessoas where id = v_comercial.pessoa),
    'respostas', coalesce((select jsonb_agg(jsonb_build_object('pergunta', r.pergunta, 'resposta', r.resposta) order by r.pergunta)
                             from ia_respostas r where r.escritorio_id = p_escritorio and r.situacao = 'PUBLICADA'), '[]'::jsonb),
    'dados', v_dados);
end $$;

-- ---------------------------------------------------------------------------------------
-- Peças do serviço (sem pessoa; nenhuma rota do Portal as chama).

-- Para a IA atender uma conversa: a situação da conversa e da IA, as últimas mensagens e o
-- contexto do cliente. O serviço decide (silêncio, passar ou responder) com essas regras.
create function ia_atendimento(p_escritorio uuid, p_conversa uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cv conversas;
  c ia_config;
  v_contato jsonb;
begin
  perform conversa_entrar_servico(p_escritorio);
  select * into cv from conversas where id = p_conversa and escritorio_id = p_escritorio;
  if cv.id is null then raise exception 'Conversa não encontrada' using errcode = 'TC404'; end if;
  c := ia_config_garantir(p_escritorio);
  if cv.cliente_id is not null and cv.contato_id is not null then
    select k into v_contato from clientes_escritorio x, jsonb_array_elements(x.contatos) k
     where x.id = cv.cliente_id and k ->> 'id' = cv.contato_id;
  end if;
  return jsonb_build_object(
    'conversa', jsonb_build_object('id', cv.id, 'situacao', cv.situacao, 'versao', cv.versao,
                                   'nome', cv.nome_contato, 'notaIa', cv.nota_ia,
                                   -- Já houve resposta de pessoa desde a última devolução para a IA?
                                   'pessoaRespondeu', exists (
                                     select 1 from conversa_mensagens m
                                      where m.conversa_id = cv.id and m.autor in ('EQUIPE', 'APP')
                                        and m.criada_em > coalesce((select max(d.criada_em) from conversa_mensagens d
                                                                     where d.conversa_id = cv.id and d.evento = 'DEVOLVEU'), '-infinity'))),
    'iaSituacao', c.situacao,
    'mensagens', coalesce((select jsonb_agg(jsonb_build_object('autor', m.autor, 'texto', m.texto,
                                                               'anexo', m.anexo is not null, 'em', m.criada_em) order by m.criada_em, m.id)
                             from (select * from conversa_mensagens m
                                    where m.conversa_id = cv.id and m.autor in ('CLIENTE', 'IA', 'EQUIPE', 'AVISO', 'APP')
                                    order by m.criada_em desc, m.id desc limit 20) m), '[]'::jsonb),
    'contexto', ia_contexto_json(p_escritorio, cv.cliente_id, v_contato));
end $$;

-- Mensagem escrita no app do celular com o mesmo número: a conversa passa para a equipe, com
-- quem responde pela regra, e a IA fica em silêncio nela até alguém devolver.
create function whatsapp_mensagem_do_app(p_escritorio uuid, p_telefone text, p_texto text) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  c conversas;
  v_cli uuid;
  v_contato jsonb;
  v_resp uuid;
  v_razao text;
begin
  perform conversa_entrar_servico(p_escritorio);
  if coalesce(p_telefone, '') !~ '^\+[1-9][0-9]{7,14}$' then perform recusar_campos('Telefone inválido', 'telefone'); end if;
  select * into c from conversas where escritorio_id = p_escritorio and telefone = p_telefone;
  if c.id is null then
    select x.cliente, x.contato into v_cli, v_contato from conversa_cliente_do_numero(p_escritorio, p_telefone) x;
    insert into conversas (escritorio_id, telefone, cliente_id, contato_id, nome_contato, papel_contato)
    values (p_escritorio, p_telefone, v_cli, v_contato ->> 'id', v_contato ->> 'nome', nullif(btrim(coalesce(v_contato ->> 'papel', '')), ''))
    returning * into c;
    perform registrar_historico('conversa.aberta', 'conversas', c.id::text, jsonb_build_object('cliente_id', v_cli, 'pelo_app', true));
  end if;
  insert into conversa_mensagens (escritorio_id, conversa_id, autor, texto)
  values (p_escritorio, c.id, 'APP', nullif(left(coalesce(p_texto, ''), 4096), ''));
  if c.situacao = 'EQUIPE' then
    update conversas set ultima_em = app_now() where id = c.id;
    return c.id;
  end if;
  if c.responsavel_id is not null and pessoa_do_escritorio(c.responsavel_id, p_escritorio) then
    v_resp := c.responsavel_id;
  else
    select x.pessoa into v_resp from conversa_quem_responde(p_escritorio, c.cliente_id) x;
  end if;
  update conversas set situacao = 'EQUIPE', assumida_por = v_resp, assumida_em = app_now(), esperando_desde = null,
                       responsavel_id = v_resp, responsavel_razao = 'APP_CELULAR', resolvida_em = null, ultima_em = app_now()
   where id = c.id;
  perform conversa_momento(c, 'APP_RESPONDEU', null, jsonb_build_object('para', v_resp));
  perform registrar_historico('conversa.app_respondeu', 'conversas', c.id::text, jsonb_build_object('para', v_resp));
  return c.id;
end $$;

-- ---------------------------------------------------------------------------------------
-- Portal: Testar sem enviar (só a sócia dona, que é quem liga a IA). Nada vai para a conversa
-- nem para a ficha; fica só a marca do teste, que libera ligar.

-- Os clientes ativos para conversar como eles no teste, com os contatos da ficha.
create function portal_ia_teste_contatos(p_pessoa uuid, p_escritorio uuid, p_busca text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_busca text := nullif(btrim(coalesce(p_busca, '')), '');
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.ver');
  perform so_socio_dono(p_pessoa, p_escritorio);
  if v_busca is not null and length(v_busca) > 80 then perform recusar_campos('Busca longa demais', 'q'); end if;
  return jsonb_build_object('clientes', coalesce((
    select jsonb_agg(jsonb_build_object('id', x.id, 'nome', x.nome, 'contatos', x.contatos) order by x.nome)
      from (select k.id, k.nome,
                   (select jsonb_agg(jsonb_build_object('id', t ->> 'id', 'nome', t ->> 'nome', 'papel', t ->> 'papel',
                                                        'principal', coalesce((t ->> 'principal')::boolean, false))
                                     order by coalesce((t ->> 'principal')::boolean, false) desc, t ->> 'nome')
                      from jsonb_array_elements(k.contatos) t where t ->> 'telefone' is not null) as contatos
              from clientes_escritorio k
             where k.escritorio_id = p_escritorio and k.estado = 'ATIVO'
               and (v_busca is null or lower(k.nome) like '%' || lower(v_busca) || '%')
             order by (v_busca is null) and exists (select 1 from casos cs join caso_clientes cc on cc.caso_id = cs.id
                                                      where cc.cliente_id = k.id and cs.situacao = 'ANDAMENTO') desc, k.nome
             limit 8) x
     where x.contatos is not null), '[]'::jsonb));
end $$;

-- O contexto para o teste: o mesmo que a IA teria com o cliente e o contato escolhidos (sem
-- cliente, um número desconhecido). Vale a configuração salva, mesmo com a IA desligada.
create function portal_ia_teste_contexto(p_pessoa uuid, p_escritorio uuid, p_cliente uuid, p_contato text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_contato jsonb;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.ver');
  perform so_socio_dono(p_pessoa, p_escritorio);
  perform ia_config_garantir(p_escritorio);
  if p_cliente is not null then
    select t into v_contato from clientes_escritorio k, jsonb_array_elements(k.contatos) t
     where k.id = p_cliente and k.escritorio_id = p_escritorio and k.estado = 'ATIVO' and t ->> 'id' = p_contato;
    if v_contato is null then perform recusar_motivo('Escolha um contato da ficha', 'CONTATO_FORA_DA_FICHA'); end if;
  end if;
  return ia_contexto_json(p_escritorio, p_cliente, v_contato);
end $$;

-- O teste foi feito: libera ligar a IA (SEM_TESTE) e fica no histórico.
create function portal_ia_testada(p_pessoa uuid, p_escritorio uuid, p_como text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare c ia_config;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.ver');
  perform so_socio_dono(p_pessoa, p_escritorio);
  -- Sem nome de cliente: só se foi como contato da ficha ou como número desconhecido.
  if coalesce(p_como, '') not in ('um contato da ficha', 'um número desconhecido') then perform recusar_campos('Como foi o teste', 'como'); end if;
  c := ia_config_garantir(p_escritorio);
  update ia_config set testada_em = app_now(), testada_como = p_como where id = c.id;
  perform registrar_historico('ia.testada', 'ia_config', c.id::text, jsonb_build_object('como', p_como));
  return portal_ia(p_pessoa, p_escritorio);
end $$;

-- A conversa no Portal mostra para quem ficou a conversa respondida pelo app (o mesmo de 0300).
create or replace function portal_conversa(p_pessoa uuid, p_escritorio uuid, p_conversa uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c conversas;
  v_juridico boolean;
  v_caso jsonb;
  v_contato jsonb;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'conversas.ver');
  select * into c from conversas where id = p_conversa and escritorio_id = p_escritorio;
  if c.id is null then raise exception 'Conversa não encontrada' using errcode = 'TC404'; end if;
  v_juridico := tem_juridico(p_pessoa, p_escritorio);
  if v_juridico and c.cliente_id is not null then
    select jsonb_build_object('id', k.id, 'nome', k.nome, 'etapa', e.nome, 'responsavel', pessoa_ref(k.responsavel_id)) into v_caso
      from casos k join caso_clientes cc on cc.caso_id = k.id join etapas e on e.id = k.etapa_id
     where k.escritorio_id = p_escritorio and cc.cliente_id = c.cliente_id and k.situacao = 'ANDAMENTO'
     order by k.etapa_desde desc limit 1;
  end if;
  if c.cliente_id is not null and c.contato_id is not null then
    select k into v_contato from clientes_escritorio x, jsonb_array_elements(x.contatos) k
     where x.id = c.cliente_id and k ->> 'id' = c.contato_id;
  end if;
  return conversa_linha(c) || jsonb_build_object(
    'versao', c.versao, 'motivoTexto', c.motivo_texto, 'responsavelRazao', c.responsavel_razao, 'assumidaEm', c.assumida_em,
    'notaIa', c.nota_ia, 'eu', p_pessoa, 'whatsappLigado', whatsapp_ligado(p_escritorio),
    'principal', coalesce((v_contato ->> 'principal')::boolean, false),
    'juridico', v_juridico,
    'mensagens', coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
               'id', m.id, 'autor', m.autor, 'pessoa', pessoa_ref(m.pessoa_id), 'evento', m.evento,
               'para', case when m.evento in ('IA_PASSOU', 'PASSOU', 'RESPONSAVEL_SAIU', 'APP_RESPONDEU') then pessoa_ref((m.dados ->> 'para')::uuid) end,
               'de', case when m.evento in ('ASSUMIU', 'PASSOU', 'RESPONSAVEL_SAIU') then pessoa_ref((m.dados ->> 'de')::uuid) end,
               'razao', m.dados ->> 'razao', 'motivo', m.dados ->> 'motivo',
               'texto', m.texto, 'anexo', m.anexo, 'avisoTipo', m.aviso_tipo, 'envio', m.envio, 'envioMotivo', m.envio_motivo,
               'em', m.criada_em)) order by m.criada_em, m.id)
        from conversa_mensagens m where m.conversa_id = c.id), '[]'::jsonb),
    'contexto', jsonb_build_object(
      'proxContato', case when c.cliente_id is not null then prox_contato(c.cliente_id) end,
      'caso', v_caso,
      'compromisso', (select jsonb_build_object('id', a.id, 'titulo', a.titulo, 'tipo', a.tipo, 'tipoEscrito', a.tipo_escrito,
                                                'inicio', a.inicio, 'modalidade', a.modalidade, 'local', a.local)
                        from compromissos a
                       where a.escritorio_id = p_escritorio and a.cliente_id = c.cliente_id and a.estado = 'MARCADO' and a.fim > app_now()
                       order by a.inicio limit 1)));
end $$;

call fechar_acesso();
