-- Conversas do Portal, parte 1: Mensagens (PD-07, EX-10, AP-02), tela aprovada em
-- docs/design/aprovadas/portal-agenda-conversas (Carol, 19/11/2026). Decisões da Carol (as
-- recomendações das perguntas valem):
-- 1. todos da equipe veem Mensagens; o contexto segue as áreas (sem Jurídico, sem o caso);
-- 2. qualquer pessoa pode assumir uma conversa que tem outro responsável, e a troca fica
--    registrada na conversa (o aviso no sino vem com o sino);
-- 3. toda conversa que espera alguém tem responsável, escolhido pela regra: quem cuida do
--    caso, senão quem tem o próximo contato do cliente, senão (contato novo) a área Comercial,
--    senão a sócia dona;
-- 4. nada é apagado: as mensagens e os momentos da conversa só se acrescentam.
-- O que vem depois: a ligação do número (PA-04, Escritório › WhatsApp e IA), a IA que responde
-- e o envio pelo provedor. As peças de receber e de a IA responder ou passar já ficam aqui,
-- para o serviço do WhatsApp chamar; nenhuma rota do Portal as expõe.

insert into funcao_acoes (funcao, acao) values
  ('SOCIO', 'conversas.ver'), ('SOCIO', 'conversas.editar'),
  ('EQUIPE', 'conversas.ver'), ('EQUIPE', 'conversas.editar');

-- ---------------------------------------------------------------------------------------
-- O WhatsApp do escritório: um número por escritório. Quem liga é a sócia dona com a equipe
-- T3jus (PA-04); até lá, a linha não existe e nada entra nem sai.

create table whatsapp_escritorio (
  id             uuid primary key default gen_random_uuid(),
  escritorio_id  uuid not null unique references escritorios (id) on delete restrict,
  numero         text not null check (numero ~ '^\+[1-9][0-9]{7,14}$'),
  situacao       text not null default 'EM_ANALISE' check (situacao in ('EM_ANALISE', 'LIGADO', 'DESLIGADO')),
  ligado_em      timestamptz,
  criado_em      timestamptz not null default app_now(),
  versao         integer not null default 1,
  check ((situacao = 'LIGADO') <= (ligado_em is not null))
);
call proteger_tabela_escritorio('whatsapp_escritorio');

create function whatsapp_ligado(p_escritorio uuid) returns boolean
language sql stable
set search_path = public
as $$ select exists (select 1 from whatsapp_escritorio w where w.escritorio_id = p_escritorio and w.situacao = 'LIGADO') $$;

-- ---------------------------------------------------------------------------------------
-- Conversas: uma por número que escreve ao escritório.
--   IA       a IA responde (resolvida_em diz se ela encerrou);
--   PRECISA  a IA passou para uma pessoa e a conversa espera, sempre com responsável;
--   EQUIPE   uma pessoa assumiu; a IA fica em silêncio até ela devolver.

create table conversas (
  id                 uuid primary key default gen_random_uuid(),
  escritorio_id      uuid not null references escritorios (id) on delete restrict,
  telefone           text not null check (telefone ~ '^\+[1-9][0-9]{7,14}$'),
  cliente_id         uuid references clientes_escritorio (id) on delete restrict,
  -- Quem escreve: o contato da ficha (id do contato) ou o nome dito na conversa.
  contato_id         text check (contato_id ~ '^[0-9a-f-]{36}$'),
  nome_contato       text check (length(btrim(nome_contato)) between 1 and 120),
  papel_contato      text check (length(btrim(papel_contato)) between 1 and 60),
  situacao           text not null default 'IA' check (situacao in ('IA', 'PRECISA', 'EQUIPE')),
  motivo             text check (motivo in ('PROPOSTA_ACORDO', 'DOCUMENTO_NOVO', 'CLIENTE_NOVO', 'VALOR', 'ESTRATEGIA',
                                            'RECLAMACAO', 'PEDIU_PESSOA', 'OUTRO')),
  motivo_texto       text check (length(btrim(motivo_texto)) between 1 and 600),
  responsavel_id     uuid references pessoas (id) on delete restrict,
  responsavel_razao  text check (responsavel_razao in ('CASO', 'PROXIMO_CONTATO', 'COMERCIAL', 'SOCIO_DONO', 'PASSADA', 'ASSUMIU', 'SAIU_DA_EQUIPE')),
  esperando_desde    timestamptz,
  assumida_por       uuid references pessoas (id) on delete restrict,
  assumida_em        timestamptz,
  -- O que a IA precisa saber (escrito ao devolver). O cliente não vê.
  nota_ia            text check (length(btrim(nota_ia)) between 1 and 1000),
  resolvida_em       timestamptz,
  ultima_em          timestamptz not null default app_now(),
  criado_em          timestamptz not null default app_now(),
  versao             integer not null default 1,
  unique (escritorio_id, telefone),
  check ((situacao = 'PRECISA') = (esperando_desde is not null)),
  check ((situacao = 'EQUIPE') = (assumida_por is not null)),
  check ((assumida_por is null) = (assumida_em is null)),
  check (situacao = 'IA' or responsavel_id is not null),
  check (situacao = 'IA' or resolvida_em is null),
  check ((responsavel_id is null) = (responsavel_razao is null))
);
create index conversas_fila on conversas (escritorio_id, situacao, ultima_em desc);
create index conversas_cliente on conversas (escritorio_id, cliente_id) where cliente_id is not null;
create index conversas_responsavel on conversas (escritorio_id, responsavel_id) where responsavel_id is not null;
call proteger_tabela_escritorio('conversas');

-- Mensagens e momentos da conversa. Só se acrescentam: o que muda depois é só a situação do
-- envio (na fila, enviada, entregue, lida ou falhou), que o provedor informa.
create table conversa_mensagens (
  id             uuid primary key default gen_random_uuid(),
  escritorio_id  uuid not null references escritorios (id) on delete restrict,
  conversa_id    uuid not null references conversas (id) on delete restrict,
  autor          text not null check (autor in ('CLIENTE', 'IA', 'EQUIPE', 'AVISO', 'SISTEMA')),
  -- EQUIPE: quem escreveu. SISTEMA: quem fez (nulo quando foi a IA).
  pessoa_id      uuid references pessoas (id) on delete restrict,
  -- SISTEMA: o momento da conversa, com as pessoas envolvidas em dados.
  evento         text check (evento in ('IA_PASSOU', 'ASSUMIU', 'DEVOLVEU', 'PASSOU', 'IA_RESOLVEU', 'RESPONSAVEL_SAIU')),
  dados          jsonb check (dados is null or jsonb_typeof(dados) = 'object'),
  texto          text check (length(texto) between 1 and 4096),
  anexo          jsonb check (anexo is null or (jsonb_typeof(anexo) = 'object' and length(btrim(coalesce(anexo ->> 'nome', ''))) between 1 and 200
                                                and coalesce(anexo ->> 'tipo', '') in ('IMAGEM', 'DOCUMENTO', 'AUDIO', 'VIDEO')
                                                and coalesce(anexo ->> 'bytes', '0') ~ '^[0-9]{1,10}$')),
  aviso_tipo     text check (length(btrim(aviso_tipo)) between 1 and 60),
  envio          text check (envio in ('NA_FILA', 'ENVIADA', 'ENTREGUE', 'LIDA', 'FALHOU')),
  envio_motivo   text check (length(btrim(envio_motivo)) between 1 and 300),
  envio_em       timestamptz,
  criada_em      timestamptz not null default app_now(),
  check ((autor = 'SISTEMA') = (evento is not null)),
  check (autor <> 'EQUIPE' or pessoa_id is not null),
  check ((autor in ('IA', 'EQUIPE', 'AVISO')) = (envio is not null)),
  check (autor = 'SISTEMA' or texto is not null or anexo is not null),
  check ((autor = 'AVISO') = (aviso_tipo is not null)),
  check ((envio = 'FALHOU') = (envio_motivo is not null))
);
create index conversa_mensagens_conversa on conversa_mensagens (escritorio_id, conversa_id, criada_em, id);
call proteger_tabela_escritorio('conversa_mensagens');

create function conversa_mensagens_guardiao() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Mensagem não se apaga' using errcode = 'TC023';
  end if;
  if (to_jsonb(new) - array['envio', 'envio_motivo', 'envio_em']) is distinct from (to_jsonb(old) - array['envio', 'envio_motivo', 'envio_em']) then
    raise exception 'Da mensagem só muda a situação do envio' using errcode = 'TC023';
  end if;
  return new;
end $$;

create trigger conversa_mensagens_guardiao before update or delete on conversa_mensagens
  for each row execute function conversa_mensagens_guardiao();

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('whatsapp_escritorio', false, 'O número de WhatsApp do escritório e se está ligado ao T3jus (PA-04)', null, null, null, null, null, null, true),
 ('conversas', true,
  'Conversas pelo WhatsApp do escritório: número e nome de quem escreve, cliente, situação, responsável e o motivo de a IA passar',
  'Atender os clientes do escritório pelo WhatsApp sem deixar ninguém esperando (PD-07, EX-10)',
  'Execução de contrato e exercício regular de direitos (LGPD, art. 7º, V e VI)', 'Escritório',
  'Enquanto o escritório for cliente do T3jus',
  'Exportadas ao escritório e apagadas com ele', 'APROVADO', true),
 ('conversa_mensagens', true,
  'Mensagens das conversas: o que o cliente, a IA e a equipe escreveram, anexos (nome e tamanho), avisos e a situação do envio',
  'Guardar o atendimento pelo WhatsApp e mostrar à equipe o que foi dito (PD-07)',
  'Execução de contrato e exercício regular de direitos (LGPD, art. 7º, V e VI)', 'Escritório',
  'Enquanto o escritório for cliente do T3jus',
  'Exportadas ao escritório e apagadas com ele', 'APROVADO', true);

-- ---------------------------------------------------------------------------------------
-- Peças de apoio.

-- Quem responde por uma conversa (decisão 3). Só pessoas ativas no escritório.
create function conversa_quem_responde(p_escritorio uuid, p_cliente uuid, out pessoa uuid, out razao text)
language plpgsql stable
set search_path = public
as $$
begin
  if p_cliente is not null then
    select c.responsavel_id into pessoa
      from casos c join caso_clientes cc on cc.caso_id = c.id
     where c.escritorio_id = p_escritorio and cc.cliente_id = p_cliente and c.situacao = 'ANDAMENTO'
       and pessoa_do_escritorio(c.responsavel_id, p_escritorio)
     order by c.etapa_desde desc, c.criado_em desc limit 1;
    if pessoa is not null then razao := 'CASO'; return; end if;
    pessoa := (prox_contato(p_cliente) -> 'responsavel' ->> 'id')::uuid;
    if pessoa is not null and pessoa_do_escritorio(pessoa, p_escritorio) then razao := 'PROXIMO_CONTATO'; return; end if;
    pessoa := null;
  else
    select v.pessoa_id into pessoa
      from vinculos v join pessoas p on p.id = v.pessoa_id
     where v.escritorio_id = p_escritorio and v.funcao = 'EQUIPE' and v.revogado_em is null
       and 'COMERCIAL' = any (areas_da_pessoa(v.pessoa_id, p_escritorio))
     order by p.nome limit 1;
    if pessoa is not null then razao := 'COMERCIAL'; return; end if;
  end if;
  select v.pessoa_id into pessoa from vinculos v
   where v.escritorio_id = p_escritorio and v.funcao = 'SOCIO' and v.revogado_em is null
   order by v.criado_em limit 1;
  razao := 'SOCIO_DONO';
end $$;

-- O cliente de um número: só quando um único cliente ativo tem esse telefone nos contatos.
create function conversa_cliente_do_numero(p_escritorio uuid, p_telefone text, out cliente uuid, out contato jsonb)
language plpgsql stable
set search_path = public
as $$
declare
  v_n integer;
begin
  select count(*) into v_n from clientes_escritorio c
   where c.escritorio_id = p_escritorio and c.estado = 'ATIVO'
     and exists (select 1 from jsonb_array_elements(c.contatos) k where k ->> 'telefone' = p_telefone);
  if v_n <> 1 then return; end if;
  select c.id, k into cliente, contato
    from clientes_escritorio c, jsonb_array_elements(c.contatos) k
   where c.escritorio_id = p_escritorio and c.estado = 'ATIVO' and k ->> 'telefone' = p_telefone
   order by (k ->> 'principal')::boolean desc limit 1;
end $$;

create function conversa_momento(p_conversa conversas, p_evento text, p_pessoa uuid, p_dados jsonb, p_texto text default null)
returns void
language sql
set search_path = public
as $$
  insert into conversa_mensagens (escritorio_id, conversa_id, autor, pessoa_id, evento, dados, texto)
  values (p_conversa.escritorio_id, p_conversa.id, 'SISTEMA', p_pessoa, p_evento, p_dados, nullif(btrim(coalesce(p_texto, '')), ''))
$$;

-- ---------------------------------------------------------------------------------------
-- Peças do serviço do WhatsApp e da IA (security definer, sem pessoa; nenhuma rota do Portal
-- as chama). Cada uma entra no escritório pelo contexto e grava como SISTEMA no histórico.

-- Entrada de um serviço do servidor (sem pessoa) num escritório. É a quinta função que grava
-- o contexto (teste 002). Não é security definer: só outra função security definer do banco a
-- chama, e o escritório vem do serviço (do número que recebeu a mensagem), nunca do navegador.
create function entrar_escritorio_servico(p_escritorio uuid) returns void
language plpgsql
set search_path = public
as $$
begin
  perform set_config('app.pessoa_id', '', true);
  perform set_config('app.escritorio_id', coalesce(p_escritorio::text, ''), true);
  if p_escritorio is null or not exists (select 1 from escritorios where id = p_escritorio) then
    perform set_config('app.escritorio_id', '', true);
    raise exception 'Escritório não encontrado' using errcode = 'TC404';
  end if;
end $$;

create function conversa_entrar_servico(p_escritorio uuid) returns void
language plpgsql
set search_path = public
as $$
begin
  perform entrar_escritorio_servico(p_escritorio);
  if not whatsapp_ligado(p_escritorio) then
    perform recusar_motivo('O WhatsApp do escritório não está ligado', 'WHATSAPP_NAO_LIGADO');
  end if;
end $$;

-- Chegou mensagem de um número. Acha ou abre a conversa; se a IA tinha encerrado, ela volta a
-- responder. Devolve a conversa.
create function whatsapp_mensagem_recebida(p_escritorio uuid, p_telefone text, p_nome text, p_texto text, p_anexo jsonb default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  c conversas;
  v_cli uuid;
  v_contato jsonb;
begin
  perform conversa_entrar_servico(p_escritorio);
  if coalesce(p_telefone, '') !~ '^\+[1-9][0-9]{7,14}$' then perform recusar_campos('Telefone inválido', 'telefone'); end if;
  select * into c from conversas where escritorio_id = p_escritorio and telefone = p_telefone;
  if c.id is null then
    select x.cliente, x.contato into v_cli, v_contato from conversa_cliente_do_numero(p_escritorio, p_telefone) x;
    insert into conversas (escritorio_id, telefone, cliente_id, contato_id, nome_contato, papel_contato)
    values (p_escritorio, p_telefone, v_cli, v_contato ->> 'id',
            coalesce(v_contato ->> 'nome', nullif(left(btrim(coalesce(p_nome, '')), 120), '')), nullif(btrim(coalesce(v_contato ->> 'papel', '')), ''))
    returning * into c;
    perform registrar_historico('conversa.aberta', 'conversas', c.id::text, jsonb_build_object('cliente_id', v_cli));
  end if;
  insert into conversa_mensagens (escritorio_id, conversa_id, autor, texto, anexo)
  values (p_escritorio, c.id, 'CLIENTE', nullif(p_texto, ''), p_anexo);
  update conversas set ultima_em = app_now(), resolvida_em = null where id = c.id;
  return c.id;
end $$;

-- A IA respondeu. Só enquanto a conversa está com ela; "resolvida" marca o fim.
create function conversa_ia_respondeu(p_escritorio uuid, p_conversa uuid, p_texto text, p_resolvida boolean default false)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c conversas;
begin
  perform conversa_entrar_servico(p_escritorio);
  select * into c from conversas where id = p_conversa and escritorio_id = p_escritorio;
  if c.id is null then raise exception 'Conversa não encontrada' using errcode = 'TC404'; end if;
  if c.situacao <> 'IA' then perform recusar_motivo('A conversa está com a equipe; a IA fica em silêncio', 'CONVERSA_COM_EQUIPE'); end if;
  insert into conversa_mensagens (escritorio_id, conversa_id, autor, texto, envio)
  values (p_escritorio, c.id, 'IA', p_texto, 'NA_FILA');
  if coalesce(p_resolvida, false) then
    perform conversa_momento(c, 'IA_RESOLVEU', null, '{}'::jsonb);
  end if;
  update conversas set ultima_em = app_now(), resolvida_em = case when coalesce(p_resolvida, false) then app_now() end where id = c.id;
end $$;

-- A IA passou para uma pessoa (o que ela não sabe ou não pode responder). O responsável sai da
-- regra, a não ser que a conversa já tenha um responsável ativo.
create function conversa_ia_passou(p_escritorio uuid, p_conversa uuid, p_motivo text, p_motivo_texto text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  c conversas;
  v_resp uuid;
  v_razao text;
begin
  perform conversa_entrar_servico(p_escritorio);
  select * into c from conversas where id = p_conversa and escritorio_id = p_escritorio;
  if c.id is null then raise exception 'Conversa não encontrada' using errcode = 'TC404'; end if;
  if c.situacao <> 'IA' then perform recusar_motivo('A conversa já está com a equipe', 'CONVERSA_COM_EQUIPE'); end if;
  if c.responsavel_id is not null and pessoa_do_escritorio(c.responsavel_id, p_escritorio) then
    v_resp := c.responsavel_id; v_razao := c.responsavel_razao;
  else
    select x.pessoa, x.razao into v_resp, v_razao from conversa_quem_responde(p_escritorio, c.cliente_id) x;
  end if;
  update conversas set situacao = 'PRECISA', esperando_desde = app_now(), motivo = p_motivo,
                       motivo_texto = nullif(btrim(coalesce(p_motivo_texto, '')), ''), responsavel_id = v_resp,
                       responsavel_razao = v_razao, resolvida_em = null, ultima_em = app_now()
   where id = c.id;
  perform conversa_momento(c, 'IA_PASSOU', null, jsonb_build_object('para', v_resp, 'razao', v_razao, 'motivo', p_motivo));
  perform registrar_historico('conversa.ia_passou', 'conversas', c.id::text, jsonb_build_object('para', v_resp, 'motivo', p_motivo));
  return v_resp;
end $$;

-- ---------------------------------------------------------------------------------------
-- Leituras do Portal.

create function conversa_nome(c conversas) returns text
language sql stable
set search_path = public
as $$ select coalesce((select k.nome from clientes_escritorio k where k.id = c.cliente_id and k.estado <> 'EXCLUIDO'), c.nome_contato, c.telefone) $$;

create function conversa_linha(c conversas) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', c.id, 'nome', conversa_nome(c), 'telefone', c.telefone,
    'cliente', (select jsonb_build_object('id', k.id, 'nome', k.nome) from clientes_escritorio k where k.id = c.cliente_id and k.estado <> 'EXCLUIDO'),
    'quemEscreve', c.nome_contato, 'papel', c.papel_contato,
    'situacao', c.situacao, 'resolvidaEm', c.resolvida_em, 'motivo', c.motivo,
    'responsavel', pessoa_ref(c.responsavel_id), 'assumidaPor', pessoa_ref(c.assumida_por),
    'esperandoDesde', c.esperando_desde, 'ultimaEm', c.ultima_em,
    'ultima', (select jsonb_build_object('autor', m.autor, 'texto', m.texto, 'anexo', m.anexo ->> 'nome')
                 from conversa_mensagens m
                where m.conversa_id = c.id and m.autor <> 'SISTEMA'
                order by m.criada_em desc, m.id desc limit 1))
$$;

-- Mensagens: a fila (Precisa de alguém), Com a equipe, Com a IA e Resolvidas hoje. A busca
-- (nome ou telefone) procura em todas. Sem o WhatsApp ligado, a lista vem vazia e a tela diz
-- quem liga.
create function portal_conversas(p_pessoa uuid, p_escritorio uuid, p_filtro text default 'PRECISA', p_busca text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_busca text := nullif(btrim(coalesce(p_busca, '')), '');
  v_dig text;
  v_hoje timestamptz := inicio_do_dia(hoje_brasilia());
  w whatsapp_escritorio;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'conversas.ver');
  if coalesce(p_filtro, '') not in ('PRECISA', 'EQUIPE', 'IA', 'RESOLVIDAS') then perform recusar_campos('Filtro inválido', 'mostrar'); end if;
  if v_busca is not null and length(v_busca) > 80 then perform recusar_campos('Busca longa demais', 'q'); end if;
  v_dig := nullif(regexp_replace(coalesce(v_busca, ''), '[^0-9]', '', 'g'), '');
  select * into w from whatsapp_escritorio where escritorio_id = p_escritorio;
  return jsonb_build_object(
    'whatsapp', jsonb_build_object(
      'situacao', coalesce(w.situacao, 'NAO_LIGADO'), 'numero', w.numero,
      'quemLiga', (select pessoa_ref(v.pessoa_id) from vinculos v
                    where v.escritorio_id = p_escritorio and v.funcao = 'SOCIO' and v.revogado_em is null order by v.criado_em limit 1)),
    'eu', p_pessoa,
    'contagem', (select jsonb_build_object(
                   'precisa', count(*) filter (where situacao = 'PRECISA'),
                   'equipe', count(*) filter (where situacao = 'EQUIPE'),
                   'ia', count(*) filter (where situacao = 'IA' and resolvida_em is null),
                   'resolvidas', count(*) filter (where situacao = 'IA' and resolvida_em >= v_hoje))
                   from conversas where escritorio_id = p_escritorio),
    -- O dia até agora, para a tela sem conversa aberta.
    'hoje', jsonb_build_object(
      'resolvidas', (select count(*) from conversas where escritorio_id = p_escritorio and situacao = 'IA' and resolvida_em >= v_hoje),
      'respondidas', (select count(distinct m.conversa_id) from conversa_mensagens m
                       where m.escritorio_id = p_escritorio and m.evento = 'DEVOLVEU' and m.criada_em >= v_hoje),
      'avisos', (select count(*) from conversa_mensagens m
                  where m.escritorio_id = p_escritorio and m.autor = 'AVISO' and m.criada_em >= v_hoje)),
    'conversas', coalesce((
      select jsonb_agg(conversa_linha(c) order by
                         case when c.situacao = 'PRECISA' then c.esperando_desde end, c.ultima_em desc)
        from conversas c
       where c.escritorio_id = p_escritorio
         and case when v_busca is not null then
                    conversa_nome(c) ilike '%' || v_busca || '%' or c.nome_contato ilike '%' || v_busca || '%'
                    or (v_dig is not null and length(v_dig) >= 4 and regexp_replace(c.telefone, '[^0-9]', '', 'g') like '%' || v_dig || '%')
                  when p_filtro = 'PRECISA' then c.situacao = 'PRECISA'
                  when p_filtro = 'EQUIPE' then c.situacao = 'EQUIPE'
                  when p_filtro = 'IA' then c.situacao = 'IA' and c.resolvida_em is null
                  else c.situacao = 'IA' and c.resolvida_em >= v_hoje end), '[]'::jsonb));
end $$;

-- A conversa aberta, com as mensagens e o contexto. O contexto segue as áreas: o caso só para
-- quem tem o Jurídico; o próximo contato vem para todos, porque é o que a conversa resolve.
create function portal_conversa(p_pessoa uuid, p_escritorio uuid, p_conversa uuid) returns jsonb
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
               'para', case when m.evento in ('IA_PASSOU', 'PASSOU', 'RESPONSAVEL_SAIU') then pessoa_ref((m.dados ->> 'para')::uuid) end,
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

-- ---------------------------------------------------------------------------------------
-- Ações do Portal.

create function conversa_para_mudar(p_escritorio uuid, p_conversa uuid) returns conversas
language plpgsql
set search_path = public
as $$
declare c conversas;
begin
  select * into c from conversas where id = p_conversa and escritorio_id = p_escritorio;
  if c.id is null then raise exception 'Conversa não encontrada' using errcode = 'TC404'; end if;
  return c;
end $$;

-- Assumir: da fila ou de uma conversa com a IA ("assumir mesmo assim"). Qualquer pessoa
-- assume (decisão 2); quem era o responsável fica registrado na conversa.
create function portal_conversa_assumir(p_pessoa uuid, p_escritorio uuid, p_conversa uuid, p_versao integer) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  c conversas;
  v_versao integer;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'conversas.editar');
  c := conversa_para_mudar(p_escritorio, p_conversa);
  if c.situacao = 'EQUIPE' then
    perform recusar_motivo(case when c.assumida_por = p_pessoa then 'Você já está nesta conversa'
                                else (select nome from pessoas where id = c.assumida_por) || ' já assumiu esta conversa' end, 'JA_ASSUMIDA');
  end if;
  update conversas set situacao = 'EQUIPE', assumida_por = p_pessoa, assumida_em = app_now(), esperando_desde = null,
                       responsavel_id = p_pessoa, responsavel_razao = 'ASSUMIU', resolvida_em = null, ultima_em = app_now()
   where id = p_conversa and escritorio_id = p_escritorio and versao = p_versao
  returning versao into v_versao;
  if v_versao is null then perform conflito_versao('conversas', p_conversa); end if;
  perform conversa_momento(c, 'ASSUMIU', p_pessoa, jsonb_build_object('de', case when c.responsavel_id <> p_pessoa then c.responsavel_id end));
  perform registrar_historico('conversa.assumida', 'conversas', p_conversa::text,
    jsonb_build_object('de', c.responsavel_id, 'situacao_antes', c.situacao));
  return v_versao;
end $$;

-- Devolver para a IA: quem assumiu (ou a sócia dona). O que a IA precisa saber fica na conversa;
-- "registrar como atendimento" põe o resumo no histórico da ficha (AP-02).
create function portal_conversa_devolver(p_pessoa uuid, p_escritorio uuid, p_conversa uuid, p_versao integer, p_dados jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  c conversas;
  v_versao integer;
  v_nota text := nullif(btrim(coalesce(p_dados ->> 'nota', '')), '');
  v_registrar boolean := coalesce((p_dados ->> 'registrarAtendimento')::boolean, false);
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'conversas.editar');
  c := conversa_para_mudar(p_escritorio, p_conversa);
  if c.situacao <> 'EQUIPE' then perform recusar_motivo('A conversa não está com a equipe', 'NAO_ASSUMIDA'); end if;
  if c.assumida_por <> p_pessoa and not e_socio_dono(p_pessoa, p_escritorio) then
    perform recusar_motivo('Só quem assumiu devolve a conversa', 'SO_QUEM_ASSUMIU');
  end if;
  if v_nota is not null and length(v_nota) > 1000 then perform recusar_campos('Escreva até 1.000 caracteres', 'nota'); end if;
  if v_registrar and c.cliente_id is null then perform recusar_campos('Este número ainda não está em Clientes', 'registrarAtendimento'); end if;
  if v_registrar and v_nota is null then perform recusar_campos('Escreva o resumo para registrar o atendimento', 'nota'); end if;
  update conversas set situacao = 'IA', assumida_por = null, assumida_em = null, nota_ia = coalesce(v_nota, nota_ia), ultima_em = app_now()
   where id = p_conversa and escritorio_id = p_escritorio and versao = p_versao
  returning versao into v_versao;
  if v_versao is null then perform conflito_versao('conversas', p_conversa); end if;
  perform conversa_momento(c, 'DEVOLVEU', p_pessoa, jsonb_build_object('registrou', v_registrar), v_nota);
  if v_registrar then
    insert into atendimentos (escritorio_id, cliente_id, ocorrido_em, canal, com_quem, atendido_por, resumo, criado_por)
    values (p_escritorio, c.cliente_id, app_now(), 'WHATSAPP', c.nome_contato, p_pessoa, v_nota, p_pessoa);
  end if;
  perform registrar_historico('conversa.devolvida', 'conversas', p_conversa::text, jsonb_build_object('registrou_atendimento', v_registrar));
  return v_versao;
end $$;

-- Passar para outra pessoa ativa, com recado (só a equipe vê). A conversa volta a esperar,
-- agora com a nova pessoa, e nunca fica sem responsável.
create function portal_conversa_passar(p_pessoa uuid, p_escritorio uuid, p_conversa uuid, p_versao integer, p_dados jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  c conversas;
  v_versao integer;
  v_para uuid;
  v_recado text := nullif(btrim(coalesce(p_dados ->> 'recado', '')), '');
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'conversas.editar');
  c := conversa_para_mudar(p_escritorio, p_conversa);
  begin
    v_para := (p_dados ->> 'pessoa')::uuid;
  exception when invalid_text_representation then v_para := null;
  end;
  if v_para is null then perform recusar_campos('Escolha uma pessoa', 'pessoa'); end if;
  if not pessoa_do_escritorio(v_para, p_escritorio) then perform recusar_campos('A pessoa não está ativa na equipe', 'pessoa'); end if;
  if v_recado is not null and length(v_recado) > 600 then perform recusar_campos('Escreva até 600 caracteres', 'recado'); end if;
  if c.situacao = 'IA' then perform recusar_motivo('A conversa está com a IA', 'CONVERSA_COM_IA'); end if;
  if v_para = c.responsavel_id and c.situacao = 'PRECISA' then perform recusar_campos('Essa pessoa já é a responsável', 'pessoa'); end if;
  update conversas set situacao = 'PRECISA', esperando_desde = coalesce(esperando_desde, app_now()), assumida_por = null, assumida_em = null,
                       responsavel_id = v_para, responsavel_razao = 'PASSADA', ultima_em = app_now()
   where id = p_conversa and escritorio_id = p_escritorio and versao = p_versao
  returning versao into v_versao;
  if v_versao is null then perform conflito_versao('conversas', p_conversa); end if;
  perform conversa_momento(c, 'PASSOU', p_pessoa, jsonb_build_object('de', c.responsavel_id, 'para', v_para), v_recado);
  perform registrar_historico('conversa.passada', 'conversas', p_conversa::text, jsonb_build_object('de', c.responsavel_id, 'para', v_para));
  return v_versao;
end $$;

-- Escrever ao cliente: só quem assumiu, e só com o WhatsApp ligado. A mensagem entra na fila do
-- envio; o provedor informa entregue, lida ou a falha.
create function portal_conversa_enviar(p_pessoa uuid, p_escritorio uuid, p_conversa uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c conversas;
  v_texto text := btrim(coalesce(p_dados ->> 'texto', ''));
  v_id uuid;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'conversas.editar');
  c := conversa_para_mudar(p_escritorio, p_conversa);
  if length(v_texto) not between 1 and 4096 then perform recusar_campos('Escreva a mensagem', 'texto'); end if;
  if c.situacao <> 'EQUIPE' or c.assumida_por <> p_pessoa then
    perform recusar_motivo('Assuma a conversa para escrever', 'ASSUMA_PRIMEIRO');
  end if;
  if not whatsapp_ligado(p_escritorio) then perform recusar_motivo('O WhatsApp do escritório não está ligado', 'WHATSAPP_NAO_LIGADO'); end if;
  insert into conversa_mensagens (escritorio_id, conversa_id, autor, pessoa_id, texto, envio)
  values (p_escritorio, c.id, 'EQUIPE', p_pessoa, v_texto, 'NA_FILA')
  returning id into v_id;
  update conversas set ultima_em = app_now() where id = c.id;
  return jsonb_build_object('id', v_id, 'envio', 'NA_FILA');
end $$;

-- ---------------------------------------------------------------------------------------
-- EX-10: quem sai da equipe passa as conversas de que era responsável para a pessoa escolhida
-- na retirada; a que estava assumida volta a esperar, com a nova pessoa.
create function conversas_passar_de_quem_saiu() returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_de uuid := (new.dados ->> 'pessoa_id')::uuid;
  v_para uuid := (new.dados ->> 'passou_para')::uuid;
  c conversas;
begin
  if v_de is null or v_para is null then return new; end if;
  for c in select * from conversas where escritorio_id = new.escritorio_id and responsavel_id = v_de loop
    update conversas set responsavel_id = v_para, responsavel_razao = 'SAIU_DA_EQUIPE',
                         situacao = case when situacao = 'EQUIPE' then 'PRECISA' else situacao end,
                         esperando_desde = case when situacao = 'EQUIPE' then app_now() else esperando_desde end,
                         assumida_por = null, assumida_em = null
     where id = c.id;
    if c.situacao <> 'IA' then
      perform conversa_momento(c, 'RESPONSAVEL_SAIU', null, jsonb_build_object('de', v_de, 'para', v_para));
    end if;
  end loop;
  return new;
end $$;

create trigger conversas_passar_de_quem_saiu after insert on historico
  for each row when (new.acao = 'equipe.retirada') execute function conversas_passar_de_quem_saiu();

-- ---------------------------------------------------------------------------------------
-- A moldura mostra quantas conversas esperam alguém (trilho e barra do celular).
create or replace function portal_escritorio(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_dono boolean;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.ver');
  v_dono := e_socio_dono(p_pessoa, p_escritorio);
  return (
    select jsonb_build_object(
      'id', e.id, 'nome', e.nome, 'cnpj', e.cnpj, 'cidade', e.cidade, 'uf', e.uf, 'endereco', e.endereco,
      'contatos', e.contatos, 'dono', v_dono, 'pessoa', (select nome from pessoas where id = p_pessoa), 'areas', to_jsonb(areas_da_pessoa(p_pessoa, p_escritorio)),
      'socios', (select coalesce(jsonb_agg(p.nome order by v.criado_em), '[]'::jsonb)
                   from vinculos v join pessoas p on p.id = v.pessoa_id
                  where v.escritorio_id = e.id and v.funcao = 'SOCIO' and v.revogado_em is null),
      'pessoas', (select count(distinct v.pessoa_id) from vinculos v join funcoes f on f.codigo = v.funcao
                   where v.escritorio_id = e.id and f.sistema = 'PORTAL' and v.revogado_em is null),
      'ultimaExportacao', case when v_dono then
                            (select jsonb_build_object('em', h.ocorrido_em, 'por', q.nome)
                               from historico h left join pessoas q on q.id = h.autor_id
                              where h.escritorio_id = e.id and h.acao = 'escritorio.exportado'
                              order by h.id desc limit 1) end,
      -- Toda a equipe vê se os dados já foram baixados no fim (o aviso diz), mas não quem baixou.
      'encerramento', case when situacao_do_contrato(e.contrato_fim_em) = 'CONSULTA'
                           then datas_do_contrato(e.contrato_fim_em, e.acesso_fechado_em) || jsonb_build_object(
                             'exportadoEm', (select max(h.ocorrido_em) from historico h
                                              where h.escritorio_id = e.id and h.acao = 'escritorio.exportado'
                                                and h.ocorrido_em >= inicio_do_dia(e.contrato_fim_em))) end,
      'conversasEsperando', (select count(*) from conversas c where c.escritorio_id = e.id and c.situacao = 'PRECISA'))
      from escritorios e where e.id = p_escritorio);
end $$;

call fechar_acesso();
