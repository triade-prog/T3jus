-- Escritório › WhatsApp e IA (F3.54; PA-04, PA-01, PA-02, PT-03, PT-11), tela aprovada em
-- docs/design/aprovadas/portal-whatsapp (Carol, 19/11/2026). Decisões da Carol (as
-- recomendações das perguntas valem):
-- 1. o escritório paga a Meta direto, no cartão da conta da Meta dele;
-- 2. o app WhatsApp Business no celular continua com o mesmo número, sem importar o histórico;
-- 3. fora do horário a IA responde o que sabe e diz quando uma pessoa vê;
-- 4. a IA liga separada do número e começa desligada, até a sócia dona testar e ligar;
-- 5. a sócia dona liga sozinha; a ligação com a equipe T3jus fica como alternativa.
-- Só a sócia dona liga, muda e desliga; quem tem o Escritório vê para ler. Nada é apagado:
-- desligar pede motivo, e cada mudança da IA guarda a versão anterior.
-- O token da Meta nunca entra aqui: a linha guarda só a referência ao segredo no cofre, e
-- nenhuma função do Portal a devolve. A troca do código da janela da Meta pelo token e os
-- avisos da Meta (webhook) são do serviço do WhatsApp, que chama as peças de serviço abaixo.

-- ---------------------------------------------------------------------------------------
-- O número: os dados que a Meta devolve e a saúde. Um por escritório; desligar mantém a
-- linha (e o histórico em whatsapp_eventos), e ligar de novo volta a usá-la.

alter table whatsapp_escritorio
  add column nome_exibicao          text check (length(btrim(nome_exibicao)) between 2 and 120),
  add column nome_situacao          text not null default 'EM_ANALISE' check (nome_situacao in ('EM_ANALISE', 'APROVADO', 'RECUSADO')),
  add column qualidade              text not null default 'SEM_NOTA' check (qualidade in ('ALTA', 'MEDIA', 'BAIXA', 'SEM_NOTA')),
  add column limite_dia             integer check (limite_dia >= 0),
  add column empresa_verificada     text not null default 'NAO_ENVIADA'
                                      check (empresa_verificada in ('NAO_ENVIADA', 'EM_ANALISE', 'VERIFICADA', 'RECUSADA')),
  add column usa_app_celular        boolean not null default false,
  add column meta_portfolio_id      text check (length(meta_portfolio_id) <= 64),
  add column meta_conta_whatsapp_id text check (length(meta_conta_whatsapp_id) <= 64),
  add column meta_numero_id         text check (length(meta_numero_id) <= 64),
  -- Referência ao segredo no cofre (ex.: "whatsapp/<escritorio>"); nunca o token.
  add column token_ref              text check (token_ref ~ '^[a-z0-9/_-]{3,120}$'),
  add column ligado_por             uuid references pessoas (id) on delete restrict,
  add column desligado_por          uuid references pessoas (id) on delete restrict,
  add column desligado_em           timestamptz,
  add column desligado_motivo       text check (length(btrim(desligado_motivo)) between 3 and 600),
  add constraint whatsapp_desligado_completo
    check ((situacao = 'DESLIGADO') = (desligado_em is not null and desligado_motivo is not null));

-- O mesmo número não fica ligado em dois escritórios (vale sem enxergar o outro escritório).
create unique index whatsapp_numero_unico on whatsapp_escritorio (numero) where situacao <> 'DESLIGADO';

-- Com o número ligado e a Meta ainda conferindo o nome, receber e responder já funcionam.
create or replace function whatsapp_ligado(p_escritorio uuid) returns boolean
language sql stable
set search_path = public
as $$ select exists (select 1 from whatsapp_escritorio w where w.escritorio_id = p_escritorio and w.situacao in ('EM_ANALISE', 'LIGADO')) $$;

-- O assistente de ligar: o que a sócia dona já informou fica salvo, e a equipe T3jus continua
-- de onde ela parou.
create table whatsapp_ligacao_rascunho (
  id                  uuid primary key default gen_random_uuid(),
  escritorio_id       uuid not null unique references escritorios (id) on delete restrict,
  passo               integer not null default 1 check (passo between 1 and 5),
  telefone            text check (telefone ~ '^\+[1-9][0-9]{7,14}$'),
  receber_codigo      text not null default 'SMS' check (receber_codigo in ('SMS', 'VOZ')),
  usa_app_celular     boolean not null default false,
  confirmou_numero    boolean not null default false,
  atualizado_por      uuid not null references pessoas (id) on delete restrict,
  atualizado_em       timestamptz not null default app_now(),
  versao              integer not null default 1
);
call proteger_tabela_escritorio('whatsapp_ligacao_rascunho');

-- Histórico do número: só se acrescenta. pessoa_id vazio quer dizer que veio da Meta.
create table whatsapp_eventos (
  id            uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorios (id) on delete restrict,
  tipo          text not null check (tipo in ('LIGADO', 'NOME', 'QUALIDADE', 'LIMITE', 'VERIFICACAO', 'AVISO', 'DESLIGADO')),
  detalhe       jsonb not null default '{}'::jsonb check (jsonb_typeof(detalhe) = 'object' and not detalhe ? 'token'),
  pessoa_id     uuid references pessoas (id) on delete restrict,
  em            timestamptz not null default app_now()
);
call proteger_tabela_escritorio('whatsapp_eventos');
create index whatsapp_eventos_escritorio on whatsapp_eventos (escritorio_id, em desc);

create function whatsapp_eventos_so_acrescentar() returns trigger
language plpgsql
as $$
begin
  raise exception 'O histórico do número só se acrescenta (% bloqueado)', tg_op using errcode = 'TC023';
end $$;
create trigger whatsapp_eventos_so_acrescentar before update or delete on whatsapp_eventos
  for each row execute function whatsapp_eventos_so_acrescentar();

-- Os 6 avisos automáticos prontos e a situação de cada texto na Meta. As Automações (F1.17)
-- usam estes mesmos textos.
create table whatsapp_avisos (
  id              uuid primary key default gen_random_uuid(),
  escritorio_id   uuid not null references escritorios (id) on delete restrict,
  chave           text not null check (chave in ('PAGAMENTO_RECEBIDO', 'PARCELA_VAI_VENCER', 'PARCELA_ATRASO',
                                                  'ETAPA_CASO', 'LEMBRETE_AUDIENCIA', 'PRESTACAO_CONTAS')),
  texto           text not null check (length(btrim(texto)) between 10 and 1024),
  situacao        text not null default 'NAO_ENVIADO' check (situacao in ('NAO_ENVIADO', 'EM_ANALISE', 'APROVADO', 'RECUSADO')),
  situacao_em     timestamptz,
  motivo_meta     text check (length(motivo_meta) <= 1000),
  motivo_simples  text check (length(motivo_simples) <= 600),
  sugestao_ia     text check (length(sugestao_ia) <= 1024),
  aprovado_por    uuid references pessoas (id) on delete restrict,
  versao          integer not null default 1,
  unique (escritorio_id, chave),
  check ((situacao = 'RECUSADO') <= (motivo_simples is not null))
);
call proteger_tabela_escritorio('whatsapp_avisos');

create function whatsapp_aviso_ordem(p_chave text) returns integer
language sql immutable
as $$ select array_position(array['PAGAMENTO_RECEBIDO', 'PARCELA_VAI_VENCER', 'PARCELA_ATRASO',
                                  'ETAPA_CASO', 'LEMBRETE_AUDIENCIA', 'PRESTACAO_CONTAS'], p_chave) $$;

-- O texto não pode começar nem terminar com um campo entre chaves (regra da Meta).
create function whatsapp_texto_aviso_valido(p_texto text) returns boolean
language sql immutable
as $$ select btrim(coalesce(p_texto, '')) !~ '^\{' and btrim(coalesce(p_texto, '')) !~ '\}[.!?]?$' $$;

-- ---------------------------------------------------------------------------------------
-- Como a IA atende. As regras fixas (nunca opinar nem negociar, nunca falar de outro cliente,
-- nunca prometer prazo, os sete casos de passar, sempre dizer que é assistente virtual) ficam
-- no código do serviço, não aqui: não dá para desligar por dado.

create table ia_config (
  id                 uuid primary key default gen_random_uuid(),
  escritorio_id      uuid not null unique references escritorios (id) on delete restrict,
  nome               text not null check (nome ~* '^assistente virtual' and length(nome) <= 80),
  apresentacao       text not null check (length(btrim(apresentacao)) between 10 and 300),
  tom                text not null default 'CORDIAL' check (tom in ('FORMAL', 'CORDIAL', 'PROXIMO')),
  assuntos           text[] not null default array['ANDAMENTO_CASO', 'COMPROMISSOS', 'PARCELAS', 'DOCUMENTOS', 'ENDERECO_HORARIO', 'ARQUIVOS']
                       check (assuntos <@ array['ANDAMENTO_CASO', 'COMPROMISSOS', 'PARCELAS', 'DOCUMENTOS', 'ENDERECO_HORARIO', 'ARQUIVOS']),
  palavras           text[] not null default '{}' check (cardinality(palavras) <= 40),
  dias               integer[] not null default array[1, 2, 3, 4, 5] check (dias <@ array[1, 2, 3, 4, 5, 6, 7] and cardinality(dias) >= 1),
  hora_inicio        time not null default '09:00',
  hora_fim           time not null default '18:00',
  msg_fora_horario   text not null check (length(btrim(msg_fora_horario)) between 10 and 400),
  telefone_urgencia  text check (telefone_urgencia ~ '^\+[1-9][0-9]{7,14}$'),
  situacao           text not null default 'DESLIGADA' check (situacao in ('DESLIGADA', 'LIGADA', 'PAUSADA')),
  ligada_por         uuid references pessoas (id) on delete restrict,
  ligada_em          timestamptz,
  pausada_por        uuid references pessoas (id) on delete restrict,
  pausada_em         timestamptz,
  -- O último teste sem enviar (F3.53 grava). Sem teste, a IA não liga.
  testada_em         timestamptz,
  testada_como       text check (length(testada_como) <= 120),
  versao             integer not null default 1,
  check (hora_inicio < hora_fim),
  check ((situacao = 'LIGADA') <= (ligada_em is not null))
);
call proteger_tabela_escritorio('ia_config');

-- Cada mudança guarda a configuração anterior (só se acrescenta).
create table ia_config_versoes (
  id            uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorios (id) on delete restrict,
  numero        integer not null check (numero >= 1),
  config        jsonb not null,
  o_que_mudou   text not null check (length(o_que_mudou) <= 300),
  mudado_por    uuid not null references pessoas (id) on delete restrict,
  mudado_em     timestamptz not null default app_now(),
  unique (escritorio_id, numero)
);
call proteger_tabela_escritorio('ia_config_versoes');
create trigger ia_config_versoes_so_acrescentar before update or delete on ia_config_versoes
  for each row execute function whatsapp_eventos_so_acrescentar();

-- Respostas escritas pelo escritório. Quem lê o Escritório sugere; a sócia dona publica.
-- Arquivar, nunca apagar.
create table ia_respostas (
  id             uuid primary key default gen_random_uuid(),
  escritorio_id  uuid not null references escritorios (id) on delete restrict,
  pergunta       text not null check (length(btrim(pergunta)) between 3 and 120),
  resposta       text not null check (length(btrim(resposta)) between 3 and 1000),
  situacao       text not null default 'SUGERIDA' check (situacao in ('SUGERIDA', 'PUBLICADA', 'ARQUIVADA')),
  escrita_por    uuid not null references pessoas (id) on delete restrict,
  escrita_em     timestamptz not null default app_now(),
  publicada_por  uuid references pessoas (id) on delete restrict,
  publicada_em   timestamptz,
  versao         integer not null default 1,
  check ((situacao = 'PUBLICADA') <= (publicada_em is not null))
);
call proteger_tabela_escritorio('ia_respostas');

-- O que a IA não soube responder (o serviço grava); vira resposta com um clique.
create table ia_perguntas_sem_resposta (
  id                uuid primary key default gen_random_uuid(),
  escritorio_id     uuid not null references escritorios (id) on delete restrict,
  conversa_id       uuid not null references conversas (id) on delete restrict,
  texto             text not null check (length(btrim(texto)) between 1 and 600),
  em                timestamptz not null default app_now(),
  virou_resposta_id uuid references ia_respostas (id) on delete restrict
);
call proteger_tabela_escritorio('ia_perguntas_sem_resposta');

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('whatsapp_ligacao_rascunho', false, 'O que a sócia dona já informou para ligar o WhatsApp do escritório (PA-04)', null, null, null, null, null, null, true),
 ('whatsapp_eventos', false, 'Histórico do número de WhatsApp do escritório: ligado, nome, qualidade, limite, avisos e desligado (PA-04)', null, null, null, null, null, null, true),
 ('whatsapp_avisos', false, 'Os textos dos avisos automáticos do escritório e a situação de cada um na Meta (PA-04)', null, null, null, null, null, null, true),
 ('ia_config', false, 'Como a IA do escritório atende: nome, apresentação, assuntos, palavras, horário e se está ligada (PA-04)', null, null, null, null, null, null, true),
 ('ia_config_versoes', false, 'As versões anteriores da configuração da IA, com quem mudou e quando (PA-04, PT-03)', null, null, null, null, null, null, true),
 ('ia_respostas', false, 'Respostas escritas pelo escritório para a IA usar (endereço, horário, pagamento) (PA-04)', null, null, null, null, null, null, true),
 ('ia_perguntas_sem_resposta', true,
  'Perguntas de clientes que a IA não soube responder, ligadas à conversa',
  'Mostrar ao escritório o que a IA ainda não sabe, para virar resposta (PA-04)',
  'Execução de contrato e exercício regular de direitos (LGPD, art. 7º, V e VI)', 'Escritório',
  'Enquanto o escritório for cliente do T3jus',
  'Exportadas ao escritório e apagadas com ele', 'APROVADO', true);

-- ---------------------------------------------------------------------------------------
-- Peças comuns.

-- A configuração da IA nasce no primeiro uso, desligada, com o nome do escritório.
create function ia_config_garantir(p_escritorio uuid) returns ia_config
language plpgsql
set search_path = public
as $$
declare c ia_config; v_nome text;
begin
  select * into c from ia_config where escritorio_id = p_escritorio;
  if c.id is not null then return c; end if;
  select nome into v_nome from escritorios where id = p_escritorio;
  insert into ia_config (escritorio_id, nome, apresentacao, msg_fora_horario)
  values (p_escritorio, left('Assistente virtual do ' || v_nome, 80),
          left('Olá! Sou a assistente virtual do escritório ' || v_nome || '. Posso ajudar com o andamento do seu caso, compromissos, parcelas e documentos. Se precisar, passo para uma pessoa da equipe.', 300),
          'Recebi sua mensagem. Nossa equipe atende de segunda a sexta, das 9h às 18h. Uma pessoa vai ver {próximo atendimento}. Se eu souber responder antes, respondo por aqui.')
  returning * into c;
  return c;
end $$;

create function ia_ligada(p_escritorio uuid) returns boolean
language sql stable
set search_path = public
as $$ select exists (select 1 from ia_config where escritorio_id = p_escritorio and situacao = 'LIGADA') $$;

create function ia_config_json(c ia_config) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'nome', c.nome, 'apresentacao', c.apresentacao, 'tom', c.tom, 'assuntos', to_jsonb(c.assuntos),
    'palavras', to_jsonb(c.palavras), 'dias', to_jsonb(c.dias),
    'horaInicio', to_char(c.hora_inicio, 'HH24:MI'), 'horaFim', to_char(c.hora_fim, 'HH24:MI'),
    'msgForaHorario', c.msg_fora_horario, 'telefoneUrgencia', c.telefone_urgencia)
$$;

-- Os avisos prontos, com o texto inicial (o escritório ajusta depois).
create function whatsapp_avisos_garantir(p_escritorio uuid, p_situacao text) returns void
language sql
set search_path = public
as $$
  insert into whatsapp_avisos (escritorio_id, chave, texto, situacao, situacao_em)
  select p_escritorio, a.chave, a.texto, p_situacao, case when p_situacao = 'NAO_ENVIADO' then null else app_now() end
    from (values
      ('PAGAMENTO_RECEBIDO', 'Olá, {nome}. Recebemos o pagamento de {valor} referente a {parcela}. Obrigado!'),
      ('PARCELA_VAI_VENCER', 'Olá, {nome}. A parcela {parcela}, de {valor}, vence em {vencimento}. Para pagar, use o link {link de pagamento}. Qualquer dúvida, é só responder.'),
      ('PARCELA_ATRASO', 'Olá, {nome}. A parcela {parcela}, de {valor}, venceu em {vencimento} e ainda não aparece como paga. Se já pagou, pode desconsiderar. Para pagar, use o link {link de pagamento}. Qualquer dúvida, é só responder.'),
      ('ETAPA_CASO', 'Olá, {nome}. Há novidade no seu caso: {texto da etapa} Qualquer dúvida, é só responder.'),
      ('LEMBRETE_AUDIENCIA', 'Olá, {nome}. Lembrete: {compromisso} em {data}, às {hora}, em {local}. Qualquer dúvida, é só responder.'),
      ('PRESTACAO_CONTAS', 'Olá, {nome}. A prestação de contas de {caso} está pronta: {resumo}. Qualquer dúvida, é só responder.')
    ) as a (chave, texto)
  on conflict (escritorio_id, chave) do nothing
$$;

create function whatsapp_evento(p_escritorio uuid, p_tipo text, p_detalhe jsonb, p_pessoa uuid) returns void
language sql
set search_path = public
as $$ insert into whatsapp_eventos (escritorio_id, tipo, detalhe, pessoa_id) values (p_escritorio, p_tipo, coalesce(p_detalhe, '{}'::jsonb), p_pessoa) $$;

-- Número brasileiro: fixo tem 8 dígitos depois do DDD, começando de 2 a 5.
create function telefone_fixo_br(p_e164 text) returns boolean
language sql immutable
as $$ select coalesce(p_e164, '') ~ '^\+55[1-9][0-9][2-5][0-9]{7}$' $$;

-- ---------------------------------------------------------------------------------------
-- Peças do serviço do WhatsApp (security definer, sem pessoa; nenhuma rota do Portal as chama).

-- Depois da janela da Meta: o servidor trocou o código pelo token (guardado no cofre) e
-- registra o número. Os avisos vão para a análise da Meta.
create function whatsapp_meta_ligou(p_escritorio uuid, p_pessoa uuid, p_dados jsonb) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare w whatsapp_escritorio; v_tel text := p_dados ->> 'telefone';
begin
  perform entrar_escritorio_servico(p_escritorio);
  if not e_socio_dono(p_pessoa, p_escritorio) then
    raise exception 'Só a sócia dona liga o WhatsApp' using errcode = 'TC401', detail = jsonb_build_object('motivo', 'SO_SOCIO_DONO')::text;
  end if;
  if coalesce(v_tel, '') !~ '^\+[1-9][0-9]{7,14}$' then perform recusar_campos('Número inválido', 'telefone'); end if;
  if p_dados ? 'token' then perform recusar_campos('O token não entra no banco', 'token'); end if;
  select * into w from whatsapp_escritorio where escritorio_id = p_escritorio;
  if w.id is not null and w.situacao <> 'DESLIGADO' then
    perform recusar_motivo('O WhatsApp do escritório já está ligado', 'JA_LIGADO');
  end if;
  begin
    if w.id is null then
      insert into whatsapp_escritorio (escritorio_id, numero, situacao, ligado_em, ligado_por, nome_exibicao, usa_app_celular,
                                       meta_portfolio_id, meta_conta_whatsapp_id, meta_numero_id, token_ref)
      values (p_escritorio, v_tel, 'EM_ANALISE', app_now(), p_pessoa, nullif(btrim(p_dados ->> 'nomeExibicao'), ''),
              coalesce((p_dados ->> 'usaAppCelular')::boolean, false),
              p_dados ->> 'portfolioId', p_dados ->> 'contaWhatsappId', p_dados ->> 'numeroId', p_dados ->> 'tokenRef')
      returning * into w;
    else
      update whatsapp_escritorio set numero = v_tel, situacao = 'EM_ANALISE', ligado_em = app_now(), ligado_por = p_pessoa,
             nome_exibicao = nullif(btrim(p_dados ->> 'nomeExibicao'), ''), nome_situacao = 'EM_ANALISE', qualidade = 'SEM_NOTA',
             limite_dia = null, usa_app_celular = coalesce((p_dados ->> 'usaAppCelular')::boolean, false),
             meta_portfolio_id = p_dados ->> 'portfolioId', meta_conta_whatsapp_id = p_dados ->> 'contaWhatsappId',
             meta_numero_id = p_dados ->> 'numeroId', token_ref = p_dados ->> 'tokenRef',
             desligado_por = null, desligado_em = null, desligado_motivo = null
       where id = w.id returning * into w;
    end if;
  exception when unique_violation then
    perform recusar_motivo('Este número já está ligado em outro escritório', 'NUMERO_EM_OUTRA_CONTA');
  end;
  perform whatsapp_avisos_garantir(p_escritorio, 'EM_ANALISE');
  update whatsapp_avisos set situacao = 'EM_ANALISE', situacao_em = app_now()
   where escritorio_id = p_escritorio and situacao = 'NAO_ENVIADO';
  update whatsapp_ligacao_rascunho set passo = 5, atualizado_por = p_pessoa, atualizado_em = app_now() where escritorio_id = p_escritorio;
  perform whatsapp_evento(p_escritorio, 'LIGADO', jsonb_build_object('numero', v_tel), p_pessoa);
  perform registrar_historico('whatsapp.ligado', 'whatsapp_escritorio', w.id::text, jsonb_build_object('pessoa_id', p_pessoa));
  return w.id;
end $$;

-- Um aviso da Meta (o webhook já conferiu a assinatura): nome, qualidade, limite, empresa
-- confirmada ou a situação de um texto de aviso.
create function whatsapp_meta_evento(p_escritorio uuid, p_tipo text, p_detalhe jsonb) returns void
language plpgsql
security definer
set search_path = public
as $$
declare w whatsapp_escritorio; v text := p_detalhe ->> 'situacao';
begin
  perform entrar_escritorio_servico(p_escritorio);
  select * into w from whatsapp_escritorio where escritorio_id = p_escritorio;
  if w.id is null or w.situacao = 'DESLIGADO' then perform recusar_motivo('O WhatsApp do escritório não está ligado', 'WHATSAPP_NAO_LIGADO'); end if;
  if p_detalhe ? 'token' then perform recusar_campos('O token não entra no banco', 'token'); end if;
  case p_tipo
    when 'NOME' then
      if coalesce(v, '') not in ('EM_ANALISE', 'APROVADO', 'RECUSADO') then perform recusar_campos('Situação inválida', 'situacao'); end if;
      update whatsapp_escritorio set nome_situacao = v,
             nome_exibicao = coalesce(nullif(btrim(p_detalhe ->> 'nome'), ''), nome_exibicao),
             situacao = case when v = 'APROVADO' then 'LIGADO' else situacao end
       where id = w.id;
    when 'QUALIDADE' then
      if coalesce(v, '') not in ('ALTA', 'MEDIA', 'BAIXA', 'SEM_NOTA') then perform recusar_campos('Qualidade inválida', 'situacao'); end if;
      update whatsapp_escritorio set qualidade = v where id = w.id;
    when 'LIMITE' then
      if coalesce(p_detalhe ->> 'limite', '') !~ '^[0-9]{1,7}$' then perform recusar_campos('Limite inválido', 'limite'); end if;
      update whatsapp_escritorio set limite_dia = (p_detalhe ->> 'limite')::integer where id = w.id;
    when 'VERIFICACAO' then
      if coalesce(v, '') not in ('NAO_ENVIADA', 'EM_ANALISE', 'VERIFICADA', 'RECUSADA') then perform recusar_campos('Situação inválida', 'situacao'); end if;
      update whatsapp_escritorio set empresa_verificada = v where id = w.id;
    when 'AVISO' then
      if coalesce(v, '') not in ('EM_ANALISE', 'APROVADO', 'RECUSADO') then perform recusar_campos('Situação inválida', 'situacao'); end if;
      if v = 'RECUSADO' and nullif(btrim(coalesce(p_detalhe ->> 'motivoSimples', '')), '') is null then
        perform recusar_campos('A recusa precisa do motivo em palavras simples', 'motivoSimples');
      end if;
      update whatsapp_avisos set situacao = v, situacao_em = app_now(),
             motivo_meta = case when v = 'RECUSADO' then left(p_detalhe ->> 'motivo', 1000) else null end,
             motivo_simples = case when v = 'RECUSADO' then left(p_detalhe ->> 'motivoSimples', 600) else null end,
             sugestao_ia = case when v = 'RECUSADO' then left(p_detalhe ->> 'sugestaoIa', 1024) else null end
       where escritorio_id = p_escritorio and chave = p_detalhe ->> 'chave';
      if not found then perform recusar_campos('Aviso não encontrado', 'chave'); end if;
    else
      perform recusar_campos('Tipo de aviso da Meta inválido', 'tipo');
  end case;
  perform whatsapp_evento(p_escritorio, p_tipo, p_detalhe - 'motivo', null);
end $$;

-- A IA não soube responder: a pergunta fica para virar resposta do escritório.
create function conversa_ia_nao_soube(p_escritorio uuid, p_conversa uuid, p_texto text) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  perform conversa_entrar_servico(p_escritorio);
  if not exists (select 1 from conversas where id = p_conversa and escritorio_id = p_escritorio) then
    raise exception 'Conversa não encontrada' using errcode = 'TC404';
  end if;
  insert into ia_perguntas_sem_resposta (escritorio_id, conversa_id, texto) values (p_escritorio, p_conversa, left(btrim(p_texto), 600))
  returning id into v_id;
  return v_id;
end $$;

-- ---------------------------------------------------------------------------------------
-- Portal: o número.

create function whatsapp_numero_json(w whatsapp_escritorio, p_dono boolean) returns jsonb
language sql stable
set search_path = public
as $$
  select case when w.id is null then null else jsonb_build_object(
    'versao', w.versao, 'situacao', w.situacao, 'numero', w.numero,
    'nomeExibicao', w.nome_exibicao, 'nomeSituacao', w.nome_situacao, 'qualidade', w.qualidade,
    'limiteDia', w.limite_dia,
    -- Conversas que o escritório começou hoje (avisos); responder ao cliente não conta.
    'usadasHoje', (select count(distinct m.conversa_id) from conversa_mensagens m
                    where m.escritorio_id = w.escritorio_id and m.autor = 'AVISO' and m.criada_em >= inicio_do_dia(hoje_brasilia())),
    'empresaVerificada', w.empresa_verificada, 'usaAppCelular', w.usa_app_celular,
    'ligadoEm', w.ligado_em, 'ligadoPor', pessoa_ref(w.ligado_por),
    'desligadoEm', w.desligado_em, 'desligadoPor', pessoa_ref(w.desligado_por), 'desligadoMotivo', w.desligado_motivo,
    'temConta', w.meta_portfolio_id is not null,
    -- O que foi entregue no mês (a Meta cobra do escritório); só a sócia dona vê.
    'avisosEntreguesMes', case when p_dono then
      (select count(*) from conversa_mensagens m where m.escritorio_id = w.escritorio_id and m.autor = 'AVISO'
          and m.envio in ('ENTREGUE', 'LIDA') and m.criada_em >= inicio_do_dia(date_trunc('month', hoje_brasilia())::date)) end)
  end
$$;

create function portal_whatsapp(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_dono boolean; w whatsapp_escritorio; r whatsapp_ligacao_rascunho; c ia_config; e escritorios;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.ver');
  v_dono := e_socio_dono(p_pessoa, p_escritorio);
  select * into w from whatsapp_escritorio where escritorio_id = p_escritorio;
  select * into r from whatsapp_ligacao_rascunho where escritorio_id = p_escritorio;
  select * into c from ia_config where escritorio_id = p_escritorio;
  select * into e from escritorios where id = p_escritorio;
  return jsonb_build_object(
    'dono', v_dono,
    'quemCuida', (select pessoa_ref(v.pessoa_id) from vinculos v
                   where v.escritorio_id = p_escritorio and v.funcao = 'SOCIO' and v.revogado_em is null order by v.criado_em limit 1),
    'escritorio', jsonb_build_object('nome', e.nome, 'cnpj', e.cnpj),
    'numero', whatsapp_numero_json(w, v_dono),
    'rascunho', case when r.id is null then null else jsonb_build_object(
      'versao', r.versao, 'passo', r.passo, 'telefone', r.telefone, 'receberCodigo', r.receber_codigo,
      'usaAppCelular', r.usa_app_celular, 'confirmouNumero', r.confirmou_numero,
      'atualizadoEm', r.atualizado_em, 'atualizadoPor', pessoa_ref(r.atualizado_por)) end,
    'avisos', coalesce((select jsonb_agg(jsonb_build_object(
        'chave', a.chave, 'versao', a.versao, 'situacao', a.situacao, 'situacaoEm', a.situacao_em,
        'texto', a.texto, 'motivoSimples', a.motivo_simples, 'sugestaoIa', a.sugestao_ia) order by whatsapp_aviso_ordem(a.chave))
      from whatsapp_avisos a where a.escritorio_id = p_escritorio), '[]'::jsonb),
    'historico', coalesce((select jsonb_agg(jsonb_build_object('tipo', h.tipo, 'detalhe', h.detalhe, 'pessoa', pessoa_ref(h.pessoa_id), 'em', h.em) order by h.em desc)
      from (select * from whatsapp_eventos where escritorio_id = p_escritorio order by em desc limit 20) h), '[]'::jsonb),
    'ia', jsonb_build_object('situacao', coalesce(c.situacao, 'DESLIGADA')));
end $$;

-- Salva o passo do assistente (o que a sócia dona já informou).
create function portal_whatsapp_rascunho(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_passo integer;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.ver');
  perform so_socio_dono(p_pessoa, p_escritorio);
  if coalesce(p_dados ->> 'passo', '') !~ '^[1-5]$' then perform recusar_campos('Passo inválido', 'passo'); end if;
  v_passo := (p_dados ->> 'passo')::integer;
  if p_dados ? 'telefone' and p_dados ->> 'telefone' is not null and p_dados ->> 'telefone' !~ '^\+[1-9][0-9]{7,14}$' then
    perform recusar_campos('Número inválido', 'telefone');
  end if;
  if exists (select 1 from whatsapp_escritorio where escritorio_id = p_escritorio and situacao <> 'DESLIGADO') then
    perform recusar_motivo('O WhatsApp do escritório já está ligado', 'JA_LIGADO');
  end if;
  insert into whatsapp_ligacao_rascunho as r (escritorio_id, passo, telefone, receber_codigo, usa_app_celular, confirmou_numero, atualizado_por)
  values (p_escritorio, v_passo, p_dados ->> 'telefone', coalesce(p_dados ->> 'receberCodigo', 'SMS'),
          coalesce((p_dados ->> 'usaAppCelular')::boolean, false), coalesce((p_dados ->> 'confirmouNumero')::boolean, false), p_pessoa)
  on conflict (escritorio_id) do update set passo = excluded.passo,
     telefone = coalesce(excluded.telefone, r.telefone),
     receber_codigo = case when p_dados ? 'receberCodigo' then excluded.receber_codigo else r.receber_codigo end,
     usa_app_celular = case when p_dados ? 'usaAppCelular' then excluded.usa_app_celular else r.usa_app_celular end,
     confirmou_numero = case when p_dados ? 'confirmouNumero' then excluded.confirmou_numero else r.confirmou_numero end,
     atualizado_por = p_pessoa, atualizado_em = app_now();
  return portal_whatsapp(p_pessoa, p_escritorio) -> 'rascunho';
end $$;

-- Passo 1: confere o número antes da janela da Meta e segue para o passo 2. Se o número já
-- está em outro sistema de atendimento, quem diz é a Meta, na janela.
create function portal_whatsapp_conferir_numero(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_tel text := p_dados ->> 'telefone'; v_cod text := coalesce(p_dados ->> 'receberCodigo', 'SMS'); v_erros jsonb := '{}'::jsonb;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.ver');
  perform so_socio_dono(p_pessoa, p_escritorio);
  if coalesce(v_tel, '') !~ '^\+[1-9][0-9]{7,14}$' or (v_tel like '+55%' and v_tel !~ '^\+55[1-9][0-9]([2-5][0-9]{7}|9[0-9]{8})$') then
    v_erros := v_erros || jsonb_build_object('telefone', 'NUMERO_INVALIDO');
  end if;
  if v_cod not in ('SMS', 'VOZ') then v_erros := v_erros || jsonb_build_object('receberCodigo', 'OPCAO_INVALIDA');
  elsif v_cod = 'SMS' and telefone_fixo_br(v_tel) then v_erros := v_erros || jsonb_build_object('receberCodigo', 'FIXO_SEM_SMS');
  end if;
  if not coalesce((p_dados ->> 'confirmouNumero')::boolean, false) then
    v_erros := v_erros || jsonb_build_object('confirmouNumero', 'CONFIRME_NUMERO_DO_ESCRITORIO');
  end if;
  if v_erros <> '{}'::jsonb then
    raise exception 'Corrija o número antes de continuar' using errcode = 'TC422',
      detail = jsonb_build_object('campos', (select jsonb_agg(k) from jsonb_object_keys(v_erros) k), 'motivos', v_erros)::text;
  end if;
  return portal_whatsapp_rascunho(p_pessoa, p_escritorio, jsonb_build_object(
    'passo', 2, 'telefone', v_tel, 'receberCodigo', v_cod,
    'usaAppCelular', coalesce((p_dados ->> 'usaAppCelular')::boolean, false), 'confirmouNumero', true));
end $$;

create function portal_whatsapp_desligar(p_pessoa uuid, p_escritorio uuid, p_versao integer, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare w whatsapp_escritorio; v_motivo text := nullif(btrim(coalesce(p_dados ->> 'motivo', '')), '');
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.ver');
  perform so_socio_dono(p_pessoa, p_escritorio);
  select * into w from whatsapp_escritorio where escritorio_id = p_escritorio;
  if w.id is null or w.situacao = 'DESLIGADO' then perform recusar_motivo('O WhatsApp do escritório não está ligado', 'WHATSAPP_NAO_LIGADO'); end if;
  if v_motivo is null or length(v_motivo) < 3 then perform recusar_campos('Escreva o motivo', 'motivo'); end if;
  if length(v_motivo) > 600 then perform recusar_campos('Motivo longo demais', 'motivo'); end if;
  if not coalesce((p_dados ->> 'entendi')::boolean, false) then perform recusar_campos('Confirme que entendeu que os avisos param', 'entendi'); end if;
  update whatsapp_escritorio set situacao = 'DESLIGADO', desligado_por = p_pessoa, desligado_em = app_now(), desligado_motivo = v_motivo
   where id = w.id and versao = p_versao;
  if not found then perform conflito_versao('whatsapp_escritorio', w.id); end if;
  -- A IA para junto.
  update ia_config set situacao = 'PAUSADA', pausada_por = p_pessoa, pausada_em = app_now()
   where escritorio_id = p_escritorio and situacao = 'LIGADA';
  perform whatsapp_evento(p_escritorio, 'DESLIGADO', jsonb_build_object('numero', w.numero), p_pessoa);
  perform registrar_historico('whatsapp.desligado', 'whatsapp_escritorio', w.id::text, jsonb_build_object('pessoa_id', p_pessoa));
  return portal_whatsapp(p_pessoa, p_escritorio);
end $$;

-- A sócia dona aprova o texto ajustado de um aviso; ele volta para a análise da Meta.
create function portal_whatsapp_aviso_ajustar(p_pessoa uuid, p_escritorio uuid, p_chave text, p_versao integer, p_texto text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare a whatsapp_avisos; v_txt text := btrim(coalesce(p_texto, ''));
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.ver');
  perform so_socio_dono(p_pessoa, p_escritorio);
  select * into a from whatsapp_avisos where escritorio_id = p_escritorio and chave = p_chave;
  if a.id is null then raise exception 'Aviso não encontrado' using errcode = 'TC404'; end if;
  if not whatsapp_ligado(p_escritorio) then perform recusar_motivo('O WhatsApp do escritório não está ligado', 'WHATSAPP_NAO_LIGADO'); end if;
  if length(v_txt) < 10 or length(v_txt) > 1024 then perform recusar_campos('O texto precisa ter de 10 a 1.024 caracteres', 'texto'); end if;
  if not whatsapp_texto_aviso_valido(v_txt) then
    raise exception 'O texto não pode começar nem terminar com um campo' using errcode = 'TC422',
      detail = jsonb_build_object('campos', jsonb_build_array('texto'), 'motivo', 'CAMPO_NO_INICIO_OU_FIM')::text;
  end if;
  update whatsapp_avisos set texto = v_txt, situacao = 'EM_ANALISE', situacao_em = app_now(), aprovado_por = p_pessoa,
         motivo_meta = null, motivo_simples = null, sugestao_ia = null
   where id = a.id and versao = p_versao;
  if not found then perform conflito_versao('whatsapp_avisos', a.id); end if;
  perform whatsapp_evento(p_escritorio, 'AVISO', jsonb_build_object('chave', p_chave, 'situacao', 'EM_ANALISE', 'texto_anterior', a.texto), p_pessoa);
  return portal_whatsapp(p_pessoa, p_escritorio);
end $$;

-- ---------------------------------------------------------------------------------------
-- Portal: como a IA atende.

create function portal_ia(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_dono boolean; c ia_config; w whatsapp_escritorio;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.ver');
  v_dono := e_socio_dono(p_pessoa, p_escritorio);
  c := ia_config_garantir(p_escritorio);
  select * into w from whatsapp_escritorio where escritorio_id = p_escritorio;
  return jsonb_build_object(
    'dono', v_dono,
    'quemCuida', (select pessoa_ref(v.pessoa_id) from vinculos v
                   where v.escritorio_id = p_escritorio and v.funcao = 'SOCIO' and v.revogado_em is null order by v.criado_em limit 1),
    'comercial', (select pessoa_ref(x.pessoa) from conversa_quem_responde(p_escritorio, null) x),
    'whatsapp', jsonb_build_object('situacao', coalesce(w.situacao, 'NAO_LIGADO'), 'numero', w.numero),
    'versao', c.versao, 'situacao', c.situacao, 'config', ia_config_json(c),
    'ligadaEm', c.ligada_em, 'ligadaPor', pessoa_ref(c.ligada_por), 'pausadaEm', c.pausada_em, 'pausadaPor', pessoa_ref(c.pausada_por),
    'testadaEm', c.testada_em, 'testadaComo', c.testada_como,
    'respostas', coalesce((select jsonb_agg(jsonb_build_object(
        'id', r.id, 'versao', r.versao, 'pergunta', r.pergunta, 'resposta', r.resposta, 'situacao', r.situacao,
        'escritaPor', pessoa_ref(r.escrita_por), 'escritaEm', r.escrita_em, 'publicadaPor', pessoa_ref(r.publicada_por), 'publicadaEm', r.publicada_em)
        order by r.situacao desc, r.escrita_em)
      from ia_respostas r where r.escritorio_id = p_escritorio and r.situacao <> 'ARQUIVADA'), '[]'::jsonb),
    'naoSoube', coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'texto', q.texto, 'em', q.em,
        'conversa', jsonb_build_object('id', q.conversa_id, 'nome', conversa_nome(cv))) order by q.em desc)
      from ia_perguntas_sem_resposta q join conversas cv on cv.id = q.conversa_id
      where q.escritorio_id = p_escritorio and q.virou_resposta_id is null), '[]'::jsonb),
    'desdeQueLigou', case when c.situacao = 'LIGADA' then (select jsonb_build_object(
        'conversas', count(distinct m.conversa_id),
        'resolvidasIa', count(distinct m.conversa_id) filter (where m.evento = 'IA_RESOLVEU'),
        'passadas', count(distinct m.conversa_id) filter (where m.evento = 'IA_PASSOU'))
      from conversa_mensagens m where m.escritorio_id = p_escritorio and m.criada_em >= c.ligada_em) end,
    'historico', coalesce((select jsonb_agg(jsonb_build_object('numero', h.numero, 'oQueMudou', h.o_que_mudou, 'pessoa', pessoa_ref(h.mudado_por), 'em', h.mudado_em) order by h.numero desc)
      from (select * from ia_config_versoes where escritorio_id = p_escritorio order by numero desc limit 20) h), '[]'::jsonb));
end $$;

-- Guarda a configuração como estava e o que mudou, em palavras.
create function ia_config_registrar(c ia_config, p_pessoa uuid, p_o_que text) returns void
language sql
set search_path = public
as $$
  insert into ia_config_versoes (escritorio_id, numero, config, o_que_mudou, mudado_por)
  values (c.escritorio_id, coalesce((select max(numero) from ia_config_versoes where escritorio_id = c.escritorio_id), 0) + 1,
          ia_config_json(c) || jsonb_build_object('situacao', c.situacao), left(p_o_que, 300), p_pessoa)
$$;

create function portal_ia_salvar(p_pessoa uuid, p_escritorio uuid, p_versao integer, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare c ia_config; n ia_config; v_mudou text[] := '{}';
  v_nome text; v_apres text; v_tom text; v_assuntos text[]; v_palavras text[]; v_dias integer[];
  v_ini time; v_fim time; v_fora text; v_urg text;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.ver');
  perform so_socio_dono(p_pessoa, p_escritorio);
  c := ia_config_garantir(p_escritorio);
  v_nome := btrim(coalesce(p_dados ->> 'nome', c.nome));
  v_apres := btrim(coalesce(p_dados ->> 'apresentacao', c.apresentacao));
  v_tom := coalesce(p_dados ->> 'tom', c.tom);
  v_fora := btrim(coalesce(p_dados ->> 'msgForaHorario', c.msg_fora_horario));
  v_urg := case when p_dados ? 'telefoneUrgencia' then nullif(btrim(coalesce(p_dados ->> 'telefoneUrgencia', '')), '') else c.telefone_urgencia end;
  if v_nome !~* '^assistente virtual' then
    raise exception 'O nome sempre começa com “Assistente virtual”' using errcode = 'TC422',
      detail = jsonb_build_object('campos', jsonb_build_array('nome'), 'motivo', 'NOME_SEM_ASSISTENTE_VIRTUAL')::text;
  end if;
  if length(v_nome) > 80 then perform recusar_campos('Nome longo demais', 'nome'); end if;
  if length(v_apres) < 10 or length(v_apres) > 300 then perform recusar_campos('A apresentação precisa ter de 10 a 300 caracteres', 'apresentacao'); end if;
  if v_tom not in ('FORMAL', 'CORDIAL', 'PROXIMO') then perform recusar_campos('Tom inválido', 'tom'); end if;
  if length(v_fora) < 10 or length(v_fora) > 400 then perform recusar_campos('A mensagem precisa ter de 10 a 400 caracteres', 'msgForaHorario'); end if;
  if v_urg is not null and v_urg !~ '^\+[1-9][0-9]{7,14}$' then perform recusar_campos('Telefone inválido', 'telefoneUrgencia'); end if;
  begin
    v_assuntos := coalesce((select array_agg(x) from jsonb_array_elements_text(p_dados -> 'assuntos') x), case when p_dados ? 'assuntos' then '{}' else c.assuntos end);
    v_palavras := coalesce((select array_agg(distinct lower(btrim(x))) from jsonb_array_elements_text(p_dados -> 'palavras') x where btrim(x) <> ''),
                           case when p_dados ? 'palavras' then '{}' else c.palavras end);
    v_dias := coalesce((select array_agg(x::integer order by x::integer) from jsonb_array_elements_text(p_dados -> 'dias') x), case when p_dados ? 'dias' then '{}' else c.dias end);
    v_ini := coalesce((p_dados ->> 'horaInicio')::time, c.hora_inicio);
    v_fim := coalesce((p_dados ->> 'horaFim')::time, c.hora_fim);
  exception when invalid_text_representation or invalid_datetime_format or datetime_field_overflow or wrong_object_type then
    perform recusar_campos('Dados inválidos', 'config');
  end;
  if not (v_assuntos <@ array['ANDAMENTO_CASO', 'COMPROMISSOS', 'PARCELAS', 'DOCUMENTOS', 'ENDERECO_HORARIO', 'ARQUIVOS']) then perform recusar_campos('Assunto inválido', 'assuntos'); end if;
  if cardinality(v_palavras) > 40 or exists (select 1 from unnest(v_palavras) x where length(x) > 60) then perform recusar_campos('Palavras demais ou longas demais', 'palavras'); end if;
  if cardinality(v_dias) = 0 or not (v_dias <@ array[1, 2, 3, 4, 5, 6, 7]) then perform recusar_campos('Escolha os dias de atendimento', 'dias'); end if;
  if v_ini >= v_fim then perform recusar_campos('O horário de início vem antes do fim', 'horaInicio', 'horaFim'); end if;

  if v_nome <> c.nome or v_apres <> c.apresentacao or v_tom <> c.tom then v_mudou := v_mudou || 'apresentação'::text; end if;
  if v_assuntos::text[] is distinct from c.assuntos then v_mudou := v_mudou || 'assuntos'::text; end if;
  if v_palavras is distinct from c.palavras then v_mudou := v_mudou || 'palavras do escritório'::text; end if;
  if v_dias is distinct from c.dias or v_ini <> c.hora_inicio or v_fim <> c.hora_fim or v_fora <> c.msg_fora_horario
     or v_urg is distinct from c.telefone_urgencia then v_mudou := v_mudou || 'horário'::text; end if;
  if cardinality(v_mudou) = 0 then return portal_ia(p_pessoa, p_escritorio); end if;

  update ia_config set nome = v_nome, apresentacao = v_apres, tom = v_tom, assuntos = v_assuntos, palavras = v_palavras,
         dias = v_dias, hora_inicio = v_ini, hora_fim = v_fim, msg_fora_horario = v_fora, telefone_urgencia = v_urg
   where id = c.id and versao = p_versao returning * into n;
  if n.id is null then perform conflito_versao('ia_config', c.id); end if;
  perform ia_config_registrar(c, p_pessoa, 'Mudou ' || array_to_string(v_mudou, ', '));
  perform registrar_historico('ia.config', 'ia_config', c.id::text, jsonb_build_object('mudou', to_jsonb(v_mudou)));
  return portal_ia(p_pessoa, p_escritorio);
end $$;

create function portal_ia_ligar(p_pessoa uuid, p_escritorio uuid, p_versao integer, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare c ia_config;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.ver');
  perform so_socio_dono(p_pessoa, p_escritorio);
  c := ia_config_garantir(p_escritorio);
  if c.situacao = 'LIGADA' then perform recusar_motivo('A IA já está ligada', 'JA_LIGADA'); end if;
  if not whatsapp_ligado(p_escritorio) then perform recusar_motivo('O WhatsApp do escritório não está ligado', 'WHATSAPP_NAO_LIGADO'); end if;
  if c.testada_em is null then perform recusar_motivo('Teste a IA sem enviar antes de ligar', 'SEM_TESTE'); end if;
  if not coalesce((p_dados ->> 'revisou')::boolean, false) then perform recusar_campos('Confirme que testou e revisou', 'revisou'); end if;
  update ia_config set situacao = 'LIGADA', ligada_por = p_pessoa, ligada_em = app_now()
   where id = c.id and versao = p_versao;
  if not found then perform conflito_versao('ia_config', c.id); end if;
  perform ia_config_registrar(c, p_pessoa, 'Ligou a IA');
  perform registrar_historico('ia.ligada', 'ia_config', c.id::text, '{}'::jsonb);
  return portal_ia(p_pessoa, p_escritorio);
end $$;

-- Pausar é um clique, sem janela: é a ação de emergência.
create function portal_ia_pausar(p_pessoa uuid, p_escritorio uuid, p_versao integer) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare c ia_config;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.ver');
  perform so_socio_dono(p_pessoa, p_escritorio);
  c := ia_config_garantir(p_escritorio);
  if c.situacao <> 'LIGADA' then perform recusar_motivo('A IA não está ligada', 'IA_NAO_LIGADA'); end if;
  update ia_config set situacao = 'PAUSADA', pausada_por = p_pessoa, pausada_em = app_now()
   where id = c.id and versao = p_versao;
  if not found then perform conflito_versao('ia_config', c.id); end if;
  perform ia_config_registrar(c, p_pessoa, 'Pausou a IA');
  perform registrar_historico('ia.pausada', 'ia_config', c.id::text, '{}'::jsonb);
  return portal_ia(p_pessoa, p_escritorio);
end $$;

-- Nova resposta ou edição. A sócia dona publica direto; quem não é dona sugere e só edita a
-- própria sugestão. Com perguntaId, a pergunta que a IA não soube vira esta resposta.
create function portal_ia_resposta_salvar(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_dono boolean; r ia_respostas; v_id uuid; v_perg text := btrim(coalesce(p_dados ->> 'pergunta', ''));
  v_resp text := btrim(coalesce(p_dados ->> 'resposta', '')); v_q uuid;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.ver');
  v_dono := e_socio_dono(p_pessoa, p_escritorio);
  if length(v_perg) < 3 or length(v_perg) > 120 then perform recusar_campos('A pergunta precisa ter de 3 a 120 caracteres', 'pergunta'); end if;
  if length(v_resp) < 3 or length(v_resp) > 1000 then perform recusar_campos('A resposta precisa ter de 3 a 1.000 caracteres', 'resposta'); end if;
  if p_dados ->> 'id' is not null then
    select * into r from ia_respostas where id = (p_dados ->> 'id')::uuid and escritorio_id = p_escritorio and situacao <> 'ARQUIVADA';
    if r.id is null then raise exception 'Resposta não encontrada' using errcode = 'TC404'; end if;
    if not v_dono and not (r.situacao = 'SUGERIDA' and r.escrita_por = p_pessoa) then perform so_socio_dono(p_pessoa, p_escritorio); end if;
    update ia_respostas set pergunta = v_perg, resposta = v_resp,
           situacao = case when v_dono then 'PUBLICADA' else situacao end,
           publicada_por = case when v_dono then p_pessoa else publicada_por end,
           publicada_em = case when v_dono then app_now() else publicada_em end
     where id = r.id and versao = (p_dados ->> 'versao')::integer;
    if not found then perform conflito_versao('ia_respostas', r.id); end if;
    v_id := r.id;
    perform registrar_historico('ia.resposta.editada', 'ia_respostas', v_id::text, jsonb_build_object('anterior', r.resposta));
  else
    insert into ia_respostas (escritorio_id, pergunta, resposta, situacao, escrita_por, publicada_por, publicada_em)
    values (p_escritorio, v_perg, v_resp, case when v_dono then 'PUBLICADA' else 'SUGERIDA' end, p_pessoa,
            case when v_dono then p_pessoa end, case when v_dono then app_now() end)
    returning id into v_id;
    perform registrar_historico(case when v_dono then 'ia.resposta.publicada' else 'ia.resposta.sugerida' end, 'ia_respostas', v_id::text, '{}'::jsonb);
  end if;
  if p_dados ->> 'perguntaId' is not null then
    v_q := (p_dados ->> 'perguntaId')::uuid;
    update ia_perguntas_sem_resposta set virou_resposta_id = v_id
     where id = v_q and escritorio_id = p_escritorio and virou_resposta_id is null;
    if not found then perform recusar_campos('Pergunta não encontrada', 'perguntaId'); end if;
  end if;
  return portal_ia(p_pessoa, p_escritorio);
end $$;

-- Publicar uma sugestão ou arquivar uma resposta (só a sócia dona).
create function portal_ia_resposta_situacao(p_pessoa uuid, p_escritorio uuid, p_id uuid, p_versao integer, p_situacao text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare r ia_respostas;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.ver');
  perform so_socio_dono(p_pessoa, p_escritorio);
  if coalesce(p_situacao, '') not in ('PUBLICADA', 'ARQUIVADA') then perform recusar_campos('Situação inválida', 'situacao'); end if;
  select * into r from ia_respostas where id = p_id and escritorio_id = p_escritorio and situacao <> 'ARQUIVADA';
  if r.id is null then raise exception 'Resposta não encontrada' using errcode = 'TC404'; end if;
  update ia_respostas set situacao = p_situacao,
         publicada_por = case when p_situacao = 'PUBLICADA' then p_pessoa else publicada_por end,
         publicada_em = case when p_situacao = 'PUBLICADA' then app_now() else publicada_em end
   where id = r.id and versao = p_versao;
  if not found then perform conflito_versao('ia_respostas', r.id); end if;
  perform registrar_historico(case when p_situacao = 'PUBLICADA' then 'ia.resposta.publicada' else 'ia.resposta.arquivada' end,
                              'ia_respostas', r.id::text, '{}'::jsonb);
  return portal_ia(p_pessoa, p_escritorio);
end $$;

call fechar_acesso();
