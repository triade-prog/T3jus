-- Conversas › Automações (F1.17; PA-03, EX-11, EX-14, FI-12, FI-04, PD-07, EX-10, PA-01, PT-03),
-- tela aprovada em docs/design/aprovadas/portal-conversas-automacoes (Carol, 19/11/2026). As
-- recomendações das cinco perguntas valem:
-- 1. Automações é a seção do meio de Conversas, e os seis avisos fixos viram automações prontas
--    do T3jus, ligadas, com os mesmos textos (o texto de cada pronta continua em whatsapp_avisos,
--    ajustado em Escritório › WhatsApp e IA);
-- 2. quem tem a área do gatilho monta e testa; só a sócia dona aprova o texto, liga e desliga;
-- 3. os limites são fixos: 8h às 20h em dia útil e no máximo 1 cobrança por semana por parcela,
--    somando todas as automações; quem pediu para não receber avisos nunca entra;
-- 4. ao ligar uma cobrança, por padrão só entra quem atrasar daqui em diante;
-- 5. no celular não se muda a estrutura do fluxo (isso é da tela; o banco aceita o mesmo pedido).
-- O fluxo é um jsonb conferido aqui contra o catálogo de passos e os campos de cada gatilho.
-- Nada é apagado: as versões ligadas, os textos aprovados, os eventos e as execuções só se
-- acrescentam. O que vem depois: a IA que sugere o fluxo (depende da IA, F3.53), o envio dos
-- textos à Meta (F3.58) e o motor que roda as execuções; as peças de serviço já ficam aqui.

-- ---------------------------------------------------------------------------------------
-- Catálogo.

-- Os gatilhos, as áreas e os campos que cada um tem.
create function automacao_area(p_gatilho text) returns text
language sql immutable
as $$
  select case when p_gatilho in ('PAGAMENTO_RECEBIDO', 'PARCELA_VAI_VENCER', 'PARCELA_ATRASO', 'PRESTACAO_CONTAS') then 'FINANCEIRO'
              when p_gatilho in ('ETAPA_CASO', 'LEMBRETE_AUDIENCIA') then 'JURIDICO' end
$$;

create function automacao_campos(p_gatilho text) returns text[]
language sql immutable
as $$
  select case p_gatilho
    when 'PARCELA_ATRASO' then array['nome', 'parcela', 'valor', 'vencimento', 'link de pagamento', 'nome do escritório']
    when 'PARCELA_VAI_VENCER' then array['nome', 'parcela', 'valor', 'vencimento', 'link de pagamento', 'nome do escritório']
    when 'PAGAMENTO_RECEBIDO' then array['nome', 'parcela', 'valor', 'nome do escritório']
    when 'ETAPA_CASO' then array['nome', 'caso', 'etapa', 'texto da etapa', 'nome do escritório']
    when 'LEMBRETE_AUDIENCIA' then array['nome', 'compromisso', 'data', 'hora', 'local', 'nome do escritório']
    when 'PRESTACAO_CONTAS' then array['nome', 'caso', 'resumo', 'valor', 'nome do escritório'] end
$$;

-- Os caminhos que um ramo pode ter: pagar só existe nos gatilhos de parcela em aberto.
create function automacao_ramos_validos(p_gatilho text) returns text[]
language sql immutable
as $$
  select case when p_gatilho in ('PARCELA_ATRASO', 'PARCELA_VAI_VENCER') then array['PAGOU', 'RESPONDEU', 'NADA']
              else array['RESPONDEU', 'NADA'] end
$$;

-- Os campos entre chaves de um texto.
create function automacao_campos_do_texto(p_texto text) returns text[]
language sql immutable
as $$ select coalesce(array_agg(distinct m[1]), '{}') from regexp_matches(coalesce(p_texto, ''), '\{([^{}]{1,40})\}', 'g') m $$;

-- ---------------------------------------------------------------------------------------
-- Tabelas.

create table automacoes (
  id                  uuid primary key default gen_random_uuid(),
  escritorio_id       uuid not null references escritorios (id) on delete restrict,
  nome                text not null check (length(btrim(nome)) between 3 and 80),
  origem              text not null check (origem in ('PRONTA', 'ESCRITORIO')),
  pronta_chave        text check (pronta_chave in ('PAGAMENTO_RECEBIDO', 'PARCELA_VAI_VENCER', 'PARCELA_ATRASO',
                                                   'ETAPA_CASO', 'LEMBRETE_AUDIENCIA', 'PRESTACAO_CONTAS')),
  gatilho             text not null check (automacao_area(gatilho) is not null),
  area                text not null check (area in ('FINANCEIRO', 'JURIDICO', 'CONVERSAS')),
  situacao            text not null default 'RASCUNHO' check (situacao in ('RASCUNHO', 'EM_APROVACAO', 'LIGADA', 'DESLIGADA')),
  -- O que está sendo montado. A versão ligada fica em automacao_versoes e vale até a próxima ligar.
  rascunho            jsonb not null,
  versao_ligada       integer,
  versao_aguardando   integer,
  aguardando_desde    timestamptz,
  entram_ja_atrasados boolean not null default false,
  desligada_por       uuid references pessoas (id) on delete restrict,
  desligada_em        timestamptz,
  desligada_motivo    text check (length(btrim(desligada_motivo)) between 3 and 600),
  criada_por          uuid references pessoas (id) on delete restrict,
  criada_em           timestamptz not null default app_now(),
  atualizada_por      uuid references pessoas (id) on delete restrict,
  atualizada_em       timestamptz not null default app_now(),
  versao              integer not null default 1,
  unique (escritorio_id, pronta_chave),
  check ((origem = 'PRONTA') = (pronta_chave is not null)),
  check (pronta_chave is null or pronta_chave = gatilho),
  check (area = automacao_area(gatilho)),
  check ((situacao = 'EM_APROVACAO') = (versao_aguardando is not null)),
  check ((versao_aguardando is null) = (aguardando_desde is null)),
  check ((situacao = 'LIGADA') <= (versao_ligada is not null)),
  check ((situacao = 'DESLIGADA') = (desligada_em is not null and desligada_motivo is not null))
);
create index automacoes_escritorio on automacoes (escritorio_id, origem, criada_em);
call proteger_tabela_escritorio('automacoes');

-- Cada versão ligada: só se acrescenta.
create table automacao_versoes (
  id            uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorios (id) on delete restrict,
  automacao_id  uuid not null references automacoes (id) on delete restrict,
  numero        integer not null check (numero >= 1),
  fluxo         jsonb not null,
  ligada_por    uuid references pessoas (id) on delete restrict,
  ligada_em     timestamptz not null default app_now(),
  unique (automacao_id, numero)
);
call proteger_tabela_escritorio('automacao_versoes');

-- Os textos aprovados pela sócia dona. O texto não muda depois de aprovado: mudar cria outro
-- modelo (e outra aprovação na Meta). Só a situação na Meta se atualiza.
create table automacao_modelos (
  id            uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorios (id) on delete restrict,
  automacao_id  uuid not null references automacoes (id) on delete restrict,
  nome          text not null check (length(btrim(nome)) between 1 and 80),
  texto         text not null check (length(btrim(texto)) between 10 and 1024),
  aprovado_por  uuid not null references pessoas (id) on delete restrict,
  aprovado_em   timestamptz not null default app_now(),
  meta_situacao text not null default 'NAO_ENVIADO' check (meta_situacao in ('NAO_ENVIADO', 'EM_ANALISE', 'APROVADO', 'RECUSADO')),
  meta_em       timestamptz,
  meta_motivo   text check (length(meta_motivo) <= 600),
  versao        integer not null default 1,
  check ((meta_situacao = 'RECUSADO') <= (meta_motivo is not null))
);
create index automacao_modelos_automacao on automacao_modelos (escritorio_id, automacao_id);
call proteger_tabela_escritorio('automacao_modelos');

-- O que aconteceu com cada automação (ligou, desligou, Meta, texto aprovado, sugestão da equipe).
create table automacao_eventos (
  id            uuid primary key default gen_random_uuid(),
  ordem         bigint generated always as identity,
  escritorio_id uuid not null references escritorios (id) on delete restrict,
  automacao_id  uuid not null references automacoes (id) on delete restrict,
  tipo          text not null check (tipo in ('CRIADA', 'TEXTO_APROVADO', 'LIGADA', 'EM_APROVACAO', 'META_APROVOU', 'META_RECUSOU',
                                              'DESLIGADA', 'DESLIGADA_POR_CONFLITO', 'SUGESTAO')),
  detalhe       jsonb not null default '{}'::jsonb,
  pessoa_id     uuid references pessoas (id) on delete restrict,
  em            timestamptz not null default app_now()
);
create index automacao_eventos_automacao on automacao_eventos (escritorio_id, automacao_id, ordem desc);
call proteger_tabela_escritorio('automacao_eventos');

-- Uma execução por cliente e origem (a parcela, o compromisso, a etapa, o repasse). Toda falha
-- que precisa de alguém tem responsável (PD-07). Quem ficou de fora guarda o motivo.
create table automacao_execucoes (
  id             uuid primary key default gen_random_uuid(),
  escritorio_id  uuid not null references escritorios (id) on delete restrict,
  automacao_id   uuid not null references automacoes (id) on delete restrict,
  versao_numero  integer not null,
  cliente_id     uuid not null references clientes_escritorio (id) on delete restrict,
  origem         text not null check (origem in ('PARCELA', 'COMPROMISSO', 'ETAPA', 'REPASSE')),
  origem_id      uuid not null,
  rotulo         text not null check (length(btrim(rotulo)) between 1 and 160),
  caminho        jsonb not null default '[]'::jsonb check (jsonb_typeof(caminho) = 'array'),
  situacao       text not null check (situacao in ('AGENDADA', 'EM_ANDAMENTO', 'CONCLUIDA', 'FALHOU', 'FICOU_DE_FORA')),
  motivo         text check (length(btrim(motivo)) between 3 and 300),
  responsavel_id uuid references pessoas (id) on delete restrict,
  conversa_id    uuid references conversas (id) on delete restrict,
  iniciada_em    timestamptz not null default app_now(),
  terminada_em   timestamptz,
  versao         integer not null default 1,
  unique (automacao_id, origem_id),
  check ((situacao = 'FALHOU') <= (responsavel_id is not null and motivo is not null)),
  check ((situacao = 'FICOU_DE_FORA') <= (motivo is not null))
);
create index automacao_execucoes_automacao on automacao_execucoes (escritorio_id, automacao_id, iniciada_em desc);
call proteger_tabela_escritorio('automacao_execucoes');

-- O pedido do cliente para não receber avisos (todos ou só cobrança). Vale para todas as
-- automações e não se desliga por elas. Retirar o pedido fica registrado.
create table clientes_sem_avisos (
  id             uuid primary key default gen_random_uuid(),
  escritorio_id  uuid not null references escritorios (id) on delete restrict,
  cliente_id     uuid not null references clientes_escritorio (id) on delete restrict,
  tipo           text not null check (tipo in ('TODOS', 'COBRANCA')),
  origem         text not null check (origem in ('CONVERSA', 'FICHA')),
  quem_pediu     text check (length(btrim(quem_pediu)) between 1 and 120),
  pedido_em      timestamptz not null default app_now(),
  registrado_por uuid references pessoas (id) on delete restrict,
  retirado_em    timestamptz,
  retirado_por   uuid references pessoas (id) on delete restrict,
  versao         integer not null default 1,
  check ((retirado_em is null) = (retirado_por is null))
);
create unique index clientes_sem_avisos_ativo on clientes_sem_avisos (escritorio_id, cliente_id) where retirado_em is null;
call proteger_tabela_escritorio('clientes_sem_avisos');

-- Versões, eventos e textos aprovados não se apagam nem se reescrevem.
create function automacao_so_acrescentar() returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'Registro de automação não se muda nem se apaga' using errcode = 'TC023';
end $$;
create trigger automacao_versoes_so_acrescentar before update or delete on automacao_versoes
  for each row execute function automacao_so_acrescentar();
create trigger automacao_eventos_so_acrescentar before update or delete on automacao_eventos
  for each row execute function automacao_so_acrescentar();

create function automacao_modelo_fixo() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' or new.texto is distinct from old.texto or new.nome is distinct from old.nome
     or new.automacao_id <> old.automacao_id or new.aprovado_por <> old.aprovado_por or new.aprovado_em <> old.aprovado_em then
    raise exception 'O texto aprovado não muda: mudar cria outro modelo' using errcode = 'TC023';
  end if;
  return new;
end $$;
create trigger automacao_modelos_fixo before update or delete on automacao_modelos
  for each row execute function automacao_modelo_fixo();

create trigger automacoes_sem_exclusao before delete on automacoes
  for each row execute function automacao_so_acrescentar();
create trigger automacao_execucoes_sem_exclusao before delete on automacao_execucoes
  for each row execute function automacao_so_acrescentar();
create trigger clientes_sem_avisos_sem_exclusao before delete on clientes_sem_avisos
  for each row execute function automacao_so_acrescentar();

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('automacoes', false, 'As automações de mensagens do escritório: o fluxo em rascunho, a situação e quem mexeu (PA-03)', null, null, null, null, null, null, true),
 ('automacao_versoes', false, 'Cada versão ligada de uma automação, com quem ligou e quando (PA-03, PT-03)', null, null, null, null, null, null, true),
 ('automacao_modelos', false, 'Os textos de mensagem aprovados pela sócia dona e a situação de cada um na Meta (PA-03)', null, null, null, null, null, null, true),
 ('automacao_eventos', false, 'Histórico das automações: ligada, desligada, aprovada ou recusada na Meta, sugestões da equipe (PA-03, PT-03)', null, null, null, null, null, null, true),
 ('automacao_execucoes', true,
  'Cada vez que uma automação roda para um cliente: o caminho no fluxo, a situação, o motivo e o responsável',
  'Mostrar ao escritório o que saiu sozinho e quem precisa agir quando algo falha (PA-03, PD-07)',
  'Execução de contrato e exercício regular de direitos (LGPD, art. 7º, V e VI)', 'Escritório',
  'Enquanto o escritório for cliente do T3jus',
  'Exportadas ao escritório e apagadas com ele', 'APROVADO', true),
 ('clientes_sem_avisos', true,
  'O pedido do cliente para não receber avisos automáticos, com quem pediu, quando e por onde',
  'Respeitar o pedido do cliente em todas as automações (PA-03; CDC, art. 42)',
  'Cumprimento de obrigação legal e exercício regular de direitos (LGPD, art. 7º, II e VI)', 'Escritório',
  'Enquanto o escritório for cliente do T3jus',
  'Exportados ao escritório e apagados com ele', 'APROVADO', true);

-- ---------------------------------------------------------------------------------------
-- O formato do fluxo. Um fluxo é {"passos": [...]}; o primeiro passo é o gatilho; Ramos só no
-- fim da sequência principal; Fim e Passar para pessoa terminam a sequência. Um formato fora
-- disso é recusado ao salvar; o que é só incompleto vira erro preso ao passo.

create function automacao_forma_passo(p_gatilho text, p jsonb, p_nivel integer, p_pos integer, p_ultimo boolean) returns text
language plpgsql immutable
set search_path = public
as $$
declare
  v_tipo text := p ->> 'tipo';
  v_chaves text[];
  v_ok text[];
  r jsonb;
  v_quando text[] := '{}';
  v_x text;
begin
  if jsonb_typeof(p) <> 'object' then return 'passo não é objeto'; end if;
  if coalesce(p ->> 'id', '') !~ '^[a-z0-9-]{1,40}$' then return 'passo sem id'; end if;
  select array_agg(k) into v_chaves from jsonb_object_keys(p) k;
  v_ok := case v_tipo
    when 'GATILHO' then array['id', 'tipo', 'dias']
    when 'CONDICOES' then array['id', 'tipo', 'semCombinado']
    when 'MENSAGEM' then array['id', 'tipo', 'nome', 'texto', 'modeloId', 'aviso']
    when 'ESPERA' then array['id', 'tipo', 'dias', 'horasAntes']
    when 'RAMOS' then array['id', 'tipo', 'ramos']
    when 'IA' then array['id', 'tipo']
    when 'PESSOA' then array['id', 'tipo', 'pessoaId', 'regra', 'motivo']
    when 'FIM' then array['id', 'tipo', 'texto'] end;
  if v_ok is null then return 'tipo de passo desconhecido'; end if;
  if not v_chaves <@ v_ok then return 'campo desconhecido no passo ' || (p ->> 'id'); end if;
  if (v_tipo = 'GATILHO') <> (p_nivel = 0 and p_pos = 1) then return 'o gatilho é só o primeiro passo'; end if;
  if v_tipo in ('FIM', 'PESSOA', 'RAMOS') and not p_ultimo then return 'nada vem depois de ' || v_tipo; end if;

  if v_tipo = 'GATILHO' then
    if p_gatilho = 'PARCELA_ATRASO' then
      if jsonb_typeof(p -> 'dias') <> 'number' or (p ->> 'dias')::numeric not between 1 and 60 or (p ->> 'dias')::numeric % 1 <> 0 then return 'dias do gatilho'; end if;
    elsif p_gatilho = 'PARCELA_VAI_VENCER' then
      if jsonb_typeof(p -> 'dias') <> 'number' or (p ->> 'dias')::numeric not between 1 and 30 or (p ->> 'dias')::numeric % 1 <> 0 then return 'dias do gatilho'; end if;
    elsif coalesce(jsonb_typeof(p -> 'dias'), 'null') <> 'null' then return 'este gatilho não tem dias';
    end if;
  elsif v_tipo = 'CONDICOES' then
    if p_gatilho not in ('PARCELA_ATRASO', 'PARCELA_VAI_VENCER') then return 'condições só nos gatilhos de parcela'; end if;
    if jsonb_typeof(p -> 'semCombinado') <> 'boolean' then return 'condição sem combinado'; end if;
  elsif v_tipo = 'MENSAGEM' then
    if jsonb_typeof(p -> 'nome') <> 'string' or length(btrim(p ->> 'nome')) not between 1 and 80 then return 'nome da mensagem'; end if;
    if coalesce(jsonb_typeof(p -> 'texto'), 'null') not in ('null', 'string') or length(coalesce(p ->> 'texto', '')) > 1024 then return 'texto da mensagem'; end if;
    if coalesce(jsonb_typeof(p -> 'modeloId'), 'null') <> 'null' and (p ->> 'modeloId') !~ '^[0-9a-f-]{36}$' then return 'modelo da mensagem'; end if;
    if coalesce(jsonb_typeof(p -> 'aviso'), 'null') <> 'null' and p ->> 'aviso' is distinct from p_gatilho then return 'aviso da mensagem'; end if;
    if (case when p ->> 'texto' is not null then 1 else 0 end) + (case when p ->> 'modeloId' is not null then 1 else 0 end)
       + (case when p ->> 'aviso' is not null then 1 else 0 end) > 1 then return 'a mensagem tem um texto só'; end if;
  elsif v_tipo = 'ESPERA' then
    if coalesce(jsonb_typeof(p -> 'dias'), 'null') = 'number' then
      if (p ->> 'dias')::numeric not between 1 and 30 or (p ->> 'dias')::numeric % 1 <> 0
         or coalesce(jsonb_typeof(p -> 'horasAntes'), 'null') <> 'null' then return 'dias da espera'; end if;
    elsif coalesce(jsonb_typeof(p -> 'horasAntes'), 'null') = 'number' then
      if p_gatilho <> 'LEMBRETE_AUDIENCIA' or (p ->> 'horasAntes')::numeric not between 1 and 48 or (p ->> 'horasAntes')::numeric % 1 <> 0 then
        return 'horas antes só no lembrete de compromisso';
      end if;
    else return 'a espera tem dias ou horas antes';
    end if;
  elsif v_tipo = 'RAMOS' then
    if p_nivel > 0 then return 'ramo dentro de ramo'; end if;
    if jsonb_typeof(p -> 'ramos') <> 'array' or jsonb_array_length(p -> 'ramos') not between 2 and 3 then return 'ramos'; end if;
    for r in select * from jsonb_array_elements(p -> 'ramos') loop
      if jsonb_typeof(r) <> 'object' or jsonb_typeof(r -> 'passos') <> 'array'
         or exists (select 1 from jsonb_object_keys(r) k where k not in ('quando', 'passos')) then return 'ramo'; end if;
      v_x := r ->> 'quando';
      if v_x is null or not (v_x = any (automacao_ramos_validos(p_gatilho))) or v_x = any (v_quando) then return 'caminho do ramo'; end if;
      v_quando := v_quando || v_x;
      v_x := automacao_forma_seq(p_gatilho, r -> 'passos', 1);
      if v_x is not null then return v_x; end if;
    end loop;
  elsif v_tipo = 'PESSOA' then
    if coalesce(jsonb_typeof(p -> 'pessoaId'), 'null') <> 'null' and (p ->> 'pessoaId') !~ '^[0-9a-f-]{36}$' then return 'pessoa'; end if;
    if coalesce(p ->> 'regra', 'QUEM_CUIDA') not in ('QUEM_CUIDA', 'AREA', 'SOCIA_DONA') then return 'regra da pessoa'; end if;
    if p ->> 'pessoaId' is not null and p ->> 'regra' is not null then return 'pessoa ou regra, não as duas'; end if;
    if coalesce(jsonb_typeof(p -> 'motivo'), 'null') not in ('null', 'string') or length(coalesce(p ->> 'motivo', '')) > 300 then return 'motivo da passagem'; end if;
  elsif v_tipo = 'FIM' then
    if coalesce(jsonb_typeof(p -> 'texto'), 'null') not in ('null', 'string') or length(coalesce(p ->> 'texto', '')) > 120 then return 'texto do fim'; end if;
  end if;
  return null;
end $$;

create function automacao_forma_seq(p_gatilho text, p_seq jsonb, p_nivel integer) returns text
language plpgsql immutable
set search_path = public
as $$
declare v_n integer; v_i integer := 0; p jsonb; v_x text;
begin
  if jsonb_typeof(p_seq) <> 'array' then return 'sequência'; end if;
  v_n := jsonb_array_length(p_seq);
  for p in select * from jsonb_array_elements(p_seq) loop
    v_i := v_i + 1;
    v_x := automacao_forma_passo(p_gatilho, p, p_nivel, v_i, v_i = v_n);
    if v_x is not null then return v_x; end if;
  end loop;
  return null;
end $$;

-- null quando o formato está certo; senão, o que está fora.
create function automacao_forma(p_gatilho text, p_fluxo jsonb) returns text
language plpgsql immutable
set search_path = public
as $$
declare v_x text; v_ids text[];
begin
  if jsonb_typeof(p_fluxo) <> 'object' or exists (select 1 from jsonb_object_keys(p_fluxo) k where k <> 'passos')
     or jsonb_typeof(p_fluxo -> 'passos') <> 'array' or jsonb_array_length(p_fluxo -> 'passos') = 0 then
    return 'fluxo';
  end if;
  v_x := automacao_forma_seq(p_gatilho, p_fluxo -> 'passos', 0);
  if v_x is not null then return v_x; end if;
  select array_agg(x ->> 'id') into v_ids from jsonb_path_query(p_fluxo, 'strict $.**') x where jsonb_typeof(x) = 'object' and x ? 'tipo';
  if cardinality(v_ids) > 40 then return 'no máximo 40 passos'; end if;
  if cardinality(v_ids) <> (select count(distinct i) from unnest(v_ids) i) then return 'id de passo repetido'; end if;
  return null;
end $$;

-- Um passo do fluxo pelo id (em qualquer ramo).
create function automacao_passo(p_fluxo jsonb, p_id text) returns jsonb
language sql immutable
as $$ select x from jsonb_path_query(p_fluxo, 'strict $.**') x where jsonb_typeof(x) = 'object' and x ->> 'id' = p_id and x ? 'tipo' limit 1 $$;

-- Troca um passo do fluxo pelo id (em qualquer ramo).
create function automacao_trocar_passo(p_seq jsonb, p_id text, p_novo jsonb) returns jsonb
language sql immutable
as $$
  select coalesce(jsonb_agg(
           case when x ->> 'id' = p_id then p_novo
                when x ->> 'tipo' = 'RAMOS' then jsonb_set(x, '{ramos}', (
                  select jsonb_agg(jsonb_set(r, '{passos}', automacao_trocar_passo(r -> 'passos', p_id, p_novo)) order by o)
                    from jsonb_array_elements(x -> 'ramos') with ordinality as t(r, o)))
                else x end order by n), '[]'::jsonb)
    from jsonb_array_elements(p_seq) with ordinality as s(x, n)
$$;

-- ---------------------------------------------------------------------------------------
-- O que falta: os erros presos ao passo. Cada erro é {passo, ramo?, codigo, campos?}.

create function automacao_erros_seq(p_escritorio uuid, p_automacao uuid, p_gatilho text, p_seq jsonb, p_dias integer, p_ultima integer,
                                    out erros jsonb, out ultima integer)
language plpgsql stable
set search_path = public
as $$
declare
  p jsonb;
  r jsonb;
  v_tipo text;
  v_campos text[];
  v_fora text[];
  v_dias integer := p_dias;
  v_ult integer := p_ultima;
  v_sub record;
  v_m automacao_modelos;
  v_texto text;
  v_n integer := jsonb_array_length(p_seq);
begin
  erros := '[]'::jsonb;
  for p in select * from jsonb_array_elements(p_seq) loop
    v_tipo := p ->> 'tipo';
    if v_tipo = 'GATILHO' then
      v_dias := coalesce((p ->> 'dias')::integer, 0);
    elsif v_tipo = 'ESPERA' then
      v_dias := v_dias + coalesce((p ->> 'dias')::integer, 0);
    elsif v_tipo = 'MENSAGEM' then
      v_texto := p ->> 'texto';
      v_m := null;
      if p ->> 'modeloId' is not null then
        select * into v_m from automacao_modelos where id = (p ->> 'modeloId')::uuid and automacao_id = p_automacao;
        v_texto := v_m.texto;
        if v_m.meta_situacao = 'RECUSADO' then
          erros := erros || jsonb_build_object('passo', p ->> 'id', 'codigo', 'TEXTO_RECUSADO', 'motivo', v_m.meta_motivo);
        end if;
      elsif p ->> 'aviso' is not null then
        select texto into v_texto from whatsapp_avisos where escritorio_id = p_escritorio and chave = p ->> 'aviso';
      end if;
      if p ->> 'aviso' is null and length(btrim(coalesce(v_texto, ''))) < 10 then
        erros := erros || jsonb_build_object('passo', p ->> 'id', 'codigo', 'TEXTO_VAZIO');
      elsif p ->> 'texto' is not null then
        v_campos := automacao_campos_do_texto(v_texto);
        select coalesce(array_agg(c), '{}') into v_fora from unnest(v_campos) c where not (c = any (automacao_campos(p_gatilho)));
        if cardinality(v_fora) > 0 then
          erros := erros || jsonb_build_object('passo', p ->> 'id', 'codigo', 'CAMPO_INEXISTENTE', 'campos', to_jsonb(v_fora));
        elsif not whatsapp_texto_aviso_valido(v_texto) then
          erros := erros || jsonb_build_object('passo', p ->> 'id', 'codigo', 'TEXTO_CAMPO_NA_PONTA');
        end if;
      end if;
      -- 1 cobrança por semana por parcela, no mesmo caminho.
      if p_gatilho = 'PARCELA_ATRASO' then
        if v_ult is not null and v_dias - v_ult < 7 then
          erros := erros || jsonb_build_object('passo', p ->> 'id', 'codigo', 'LIMITE_SEMANAL', 'dias', v_dias - v_ult);
        end if;
        v_ult := v_dias;
      end if;
    elsif v_tipo = 'PESSOA' then
      if p ->> 'pessoaId' is null and p ->> 'regra' is null then
        erros := erros || jsonb_build_object('passo', p ->> 'id', 'codigo', 'RESPONSAVEL_OBRIGATORIO');
      elsif p ->> 'pessoaId' is not null and not exists (
          select 1 from vinculos v where v.pessoa_id = (p ->> 'pessoaId')::uuid and v.escritorio_id = p_escritorio
             and v.revogado_em is null and v.funcao in ('SOCIO', 'EQUIPE')) then
        erros := erros || jsonb_build_object('passo', p ->> 'id', 'codigo', 'RESPONSAVEL_INVALIDO');
      end if;
    elsif v_tipo = 'RAMOS' then
      for r in select * from jsonb_array_elements(p -> 'ramos') loop
        if jsonb_array_length(r -> 'passos') = 0 then
          erros := erros || jsonb_build_object('passo', p ->> 'id', 'ramo', r ->> 'quando', 'codigo', 'PASSO_SEM_SAIDA');
        else
          -- Pagar encerra a cobrança: o caminho "se pagou" não conta para o limite.
          select * into v_sub from automacao_erros_seq(p_escritorio, p_automacao, p_gatilho, r -> 'passos', v_dias,
                                                       case when r ->> 'quando' = 'PAGOU' then null else v_ult end);
          erros := erros || v_sub.erros;
        end if;
      end loop;
    end if;
  end loop;
  p := p_seq -> (v_n - 1);
  if p ->> 'tipo' not in ('FIM', 'PESSOA', 'RAMOS') then
    erros := erros || jsonb_build_object('passo', p ->> 'id', 'codigo', 'PASSO_SEM_SAIDA');
  end if;
  ultima := v_ult;
end $$;

create function automacao_erros(a automacoes) returns jsonb
language sql stable
set search_path = public
as $$ select (automacao_erros_seq(a.escritorio_id, a.id, a.gatilho, a.rascunho -> 'passos', 0, null)).erros $$;

-- Os textos ainda por aprovar (a sócia dona aprova antes de ligar).
create function automacao_textos_por_aprovar(p_fluxo jsonb) returns jsonb
language sql immutable
as $$
  select coalesce(jsonb_agg(x ->> 'id'), '[]'::jsonb) from jsonb_path_query(p_fluxo, 'strict $.**') x
   where jsonb_typeof(x) = 'object' and x ->> 'tipo' = 'MENSAGEM' and x ->> 'texto' is not null
$$;

-- Os modelos que o fluxo usa.
create function automacao_modelos_do_fluxo(p_fluxo jsonb) returns uuid[]
language sql immutable
as $$
  select coalesce(array_agg(distinct (x ->> 'modeloId')::uuid), '{}') from jsonb_path_query(p_fluxo, 'strict $.**') x
   where jsonb_typeof(x) = 'object' and x ->> 'tipo' = 'MENSAGEM' and x ->> 'modeloId' is not null
$$;

-- Em que dia, contado do vencimento, sai cada cobrança de um fluxo de parcela em atraso.
create function automacao_dias_cobranca(p_seq jsonb, p_dias integer default 0) returns integer[]
language plpgsql immutable
set search_path = public
as $$
declare p jsonb; r jsonb; v_dias integer := p_dias; v_res integer[] := '{}';
begin
  for p in select * from jsonb_array_elements(p_seq) loop
    if p ->> 'tipo' = 'GATILHO' then v_dias := coalesce((p ->> 'dias')::integer, 0);
    elsif p ->> 'tipo' = 'ESPERA' then v_dias := v_dias + coalesce((p ->> 'dias')::integer, 0);
    elsif p ->> 'tipo' = 'MENSAGEM' then v_res := v_res || v_dias;
    elsif p ->> 'tipo' = 'RAMOS' then
      for r in select * from jsonb_array_elements(p -> 'ramos') where value ->> 'quando' <> 'PAGOU' loop
        v_res := v_res || automacao_dias_cobranca(r -> 'passos', v_dias);
      end loop;
    end if;
  end loop;
  return v_res;
end $$;

-- O fluxo que vale numa automação (o aguardando a Meta conta, porque vai valer).
create function automacao_fluxo_valendo(a automacoes) returns jsonb
language sql stable
set search_path = public
as $$
  select v.fluxo from automacao_versoes v
   where v.automacao_id = a.id and v.numero = coalesce(a.versao_aguardando, a.versao_ligada)
$$;

-- As outras cobranças ligadas que mandariam mensagem para a mesma parcela na mesma semana.
create function automacao_conflitos(a automacoes) returns jsonb
language sql stable
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', o.id, 'nome', o.nome, 'dias', to_jsonb(automacao_dias_cobranca(automacao_fluxo_valendo(o) -> 'passos')))
                            order by o.criada_em), '[]'::jsonb)
    from automacoes o
   where a.gatilho = 'PARCELA_ATRASO' and o.escritorio_id = a.escritorio_id and o.id <> a.id and o.gatilho = 'PARCELA_ATRASO'
     and o.situacao in ('LIGADA', 'EM_APROVACAO')
     and exists (select 1 from unnest(automacao_dias_cobranca(a.rascunho -> 'passos')) x,
                               unnest(automacao_dias_cobranca(automacao_fluxo_valendo(o) -> 'passos')) y
                  where abs(x - y) < 7)
$$;

-- ---------------------------------------------------------------------------------------
-- As prontas do T3jus: uma de cada aviso, por escritório, ligadas desde o começo. O texto de
-- cada mensagem é o do aviso (whatsapp_avisos), ajustado em Escritório › WhatsApp e IA.

create function automacao_fluxo_pronto(p_chave text) returns jsonb
language sql immutable
as $$
  select jsonb_build_object('passos', case p_chave
    when 'PAGAMENTO_RECEBIDO' then jsonb_build_array(
      jsonb_build_object('id', 'gatilho', 'tipo', 'GATILHO'),
      jsonb_build_object('id', 'msg', 'tipo', 'MENSAGEM', 'nome', 'Pagamento recebido', 'aviso', p_chave),
      jsonb_build_object('id', 'fim', 'tipo', 'FIM'))
    when 'PARCELA_VAI_VENCER' then jsonb_build_array(
      jsonb_build_object('id', 'gatilho', 'tipo', 'GATILHO', 'dias', 3),
      jsonb_build_object('id', 'cond', 'tipo', 'CONDICOES', 'semCombinado', true),
      jsonb_build_object('id', 'msg', 'tipo', 'MENSAGEM', 'nome', 'Parcela vai vencer', 'aviso', p_chave),
      jsonb_build_object('id', 'fim', 'tipo', 'FIM'))
    when 'PARCELA_ATRASO' then jsonb_build_array(
      jsonb_build_object('id', 'gatilho', 'tipo', 'GATILHO', 'dias', 1),
      jsonb_build_object('id', 'cond', 'tipo', 'CONDICOES', 'semCombinado', true),
      jsonb_build_object('id', 'msg-1', 'tipo', 'MENSAGEM', 'nome', 'Parcela em atraso · 1º aviso', 'aviso', p_chave),
      jsonb_build_object('id', 'espera-1', 'tipo', 'ESPERA', 'dias', 7),
      jsonb_build_object('id', 'msg-2', 'tipo', 'MENSAGEM', 'nome', 'Parcela em atraso · 2º aviso', 'aviso', p_chave),
      jsonb_build_object('id', 'espera-2', 'tipo', 'ESPERA', 'dias', 7),
      jsonb_build_object('id', 'msg-3', 'tipo', 'MENSAGEM', 'nome', 'Parcela em atraso · 3º aviso', 'aviso', p_chave),
      jsonb_build_object('id', 'fim', 'tipo', 'FIM', 'texto', 'Fim · paga, a parcela sai da automação'))
    when 'ETAPA_CASO' then jsonb_build_array(
      jsonb_build_object('id', 'gatilho', 'tipo', 'GATILHO'),
      jsonb_build_object('id', 'msg', 'tipo', 'MENSAGEM', 'nome', 'Etapa do caso', 'aviso', p_chave),
      jsonb_build_object('id', 'fim', 'tipo', 'FIM'))
    when 'LEMBRETE_AUDIENCIA' then jsonb_build_array(
      jsonb_build_object('id', 'gatilho', 'tipo', 'GATILHO'),
      jsonb_build_object('id', 'msg-1', 'tipo', 'MENSAGEM', 'nome', 'Lembrete · 1 dia antes', 'aviso', p_chave),
      jsonb_build_object('id', 'espera', 'tipo', 'ESPERA', 'horasAntes', 2),
      jsonb_build_object('id', 'msg-2', 'tipo', 'MENSAGEM', 'nome', 'Lembrete · 2 horas antes', 'aviso', p_chave),
      jsonb_build_object('id', 'ramos', 'tipo', 'RAMOS', 'ramos', jsonb_build_array(
        jsonb_build_object('quando', 'RESPONDEU', 'passos', jsonb_build_array(
          jsonb_build_object('id', 'ia', 'tipo', 'IA'), jsonb_build_object('id', 'fim-r', 'tipo', 'FIM'))),
        jsonb_build_object('quando', 'NADA', 'passos', jsonb_build_array(
          jsonb_build_object('id', 'pessoa', 'tipo', 'PESSOA', 'regra', 'QUEM_CUIDA', 'motivo', 'Não confirmou o compromisso'))))))
    when 'PRESTACAO_CONTAS' then jsonb_build_array(
      jsonb_build_object('id', 'gatilho', 'tipo', 'GATILHO'),
      jsonb_build_object('id', 'msg', 'tipo', 'MENSAGEM', 'nome', 'Prestação de contas', 'aviso', p_chave),
      jsonb_build_object('id', 'fim', 'tipo', 'FIM')) end)
$$;

create function automacoes_garantir(p_escritorio uuid) returns void
language plpgsql
set search_path = public
as $$
declare k text; v_id uuid; v_fluxo jsonb;
begin
  if (select count(*) from automacoes where escritorio_id = p_escritorio and origem = 'PRONTA') = 6 then return; end if;
  perform whatsapp_avisos_garantir(p_escritorio, 'NAO_ENVIADO');
  foreach k in array array['PAGAMENTO_RECEBIDO', 'PARCELA_VAI_VENCER', 'PARCELA_ATRASO', 'ETAPA_CASO', 'LEMBRETE_AUDIENCIA', 'PRESTACAO_CONTAS'] loop
    v_fluxo := automacao_fluxo_pronto(k);
    insert into automacoes (escritorio_id, nome, origem, pronta_chave, gatilho, area, situacao, rascunho, versao_ligada)
    values (p_escritorio, (select a.nome from (values
              ('PAGAMENTO_RECEBIDO', 'Pagamento recebido'), ('PARCELA_VAI_VENCER', 'Parcela vai vencer'),
              ('PARCELA_ATRASO', 'Parcela em atraso'), ('ETAPA_CASO', 'Etapa do caso'),
              ('LEMBRETE_AUDIENCIA', 'Lembrete de audiência'), ('PRESTACAO_CONTAS', 'Prestação de contas')) as a (chave, nome) where a.chave = k),
            'PRONTA', k, k, automacao_area(k), 'LIGADA', v_fluxo, 1)
    on conflict (escritorio_id, pronta_chave) do nothing
    returning id into v_id;
    if v_id is not null then
      insert into automacao_versoes (escritorio_id, automacao_id, numero, fluxo) values (p_escritorio, v_id, 1, v_fluxo);
      insert into automacao_eventos (escritorio_id, automacao_id, tipo, detalhe) values (p_escritorio, v_id, 'LIGADA', '{"numero":1,"pronta":true}');
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------------------
-- Leituras.

-- Quem pode ver uma automação: as das áreas da pessoa (e as de Conversas).
create function automacao_visivel(p_pessoa uuid, p_escritorio uuid, a automacoes) returns boolean
language sql stable
set search_path = public
as $$ select a.area = 'CONVERSAS' or a.area = any (areas_da_pessoa(p_pessoa, p_escritorio)) $$;

create function automacao_linha(a automacoes) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', a.id, 'versao', a.versao, 'nome', a.nome, 'origem', a.origem, 'prontaChave', a.pronta_chave,
    'gatilho', a.gatilho, 'area', a.area, 'situacao', a.situacao,
    'fluxo', coalesce(automacao_fluxo_valendo(a), a.rascunho),
    'versaoLigada', a.versao_ligada,
    'aguardando', case when a.versao_aguardando is not null then jsonb_build_object('numero', a.versao_aguardando, 'desde', a.aguardando_desde) end,
    'desligada', case when a.desligada_em is not null then jsonb_build_object('em', a.desligada_em, 'motivo', a.desligada_motivo, 'por', pessoa_ref(a.desligada_por)) end,
    'erros', jsonb_array_length(automacao_erros(a)),
    'textosPorAprovar', jsonb_array_length(automacao_textos_por_aprovar(a.rascunho)),
    'rascunhoMudou', a.versao_ligada is not null and a.rascunho is distinct from automacao_fluxo_valendo(a),
    'seteDias', (select jsonb_build_object('enviadas', count(*) filter (where e.situacao in ('EM_ANDAMENTO', 'CONCLUIDA', 'FALHOU')),
                                           'falhas', count(*) filter (where e.situacao = 'FALHOU'))
                   from automacao_execucoes e where e.automacao_id = a.id and e.iniciada_em >= app_now() - interval '7 days'),
    'atualizadaPor', pessoa_ref(a.atualizada_por), 'atualizadaEm', a.atualizada_em,
    'criadaPor', pessoa_ref(a.criada_por), 'criadaEm', a.criada_em)
$$;

create function portal_automacoes(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_lista jsonb;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'conversas.ver');
  perform automacoes_garantir(p_escritorio);
  select coalesce(jsonb_agg(automacao_linha(a) order by a.origem, case when a.origem = 'PRONTA' then whatsapp_aviso_ordem(a.pronta_chave) end, a.criada_em), '[]'::jsonb)
    into v_lista from automacoes a
   where a.escritorio_id = p_escritorio and automacao_visivel(p_pessoa, p_escritorio, a);
  return jsonb_build_object(
    'dono', e_socio_dono(p_pessoa, p_escritorio),
    'areas', to_jsonb(areas_da_pessoa(p_pessoa, p_escritorio)),
    'quemCuida', (select pessoa_ref(v.pessoa_id) from vinculos v where v.escritorio_id = p_escritorio and v.funcao = 'SOCIO' and v.revogado_em is null limit 1),
    'whatsapp', jsonb_build_object('situacao', coalesce((select w.situacao from whatsapp_escritorio w where w.escritorio_id = p_escritorio), 'NAO_LIGADO')),
    'semAvisos', (select count(*) from clientes_sem_avisos s where s.escritorio_id = p_escritorio and s.retirado_em is null),
    'pessoas', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'nome', p.nome) order by p.nome), '[]'::jsonb)
                  from vinculos v join pessoas p on p.id = v.pessoa_id
                 where v.escritorio_id = p_escritorio and v.revogado_em is null and v.funcao in ('SOCIO', 'EQUIPE')),
    'automacoes', v_lista);
end $$;

create function automacao_para_ler(p_pessoa uuid, p_escritorio uuid, p_id uuid) returns automacoes
language plpgsql
set search_path = public
as $$
declare a automacoes;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'conversas.ver');
  perform automacoes_garantir(p_escritorio);
  select * into a from automacoes where id = p_id and escritorio_id = p_escritorio;
  -- Quem não tem a área nem sabe que a automação existe (PA-01).
  if a.id is null or not automacao_visivel(p_pessoa, p_escritorio, a) then
    raise exception 'Automação não encontrada' using errcode = 'TC404';
  end if;
  return a;
end $$;

create function automacao_para_mudar(p_pessoa uuid, p_escritorio uuid, p_id uuid) returns automacoes
language plpgsql
set search_path = public
as $$
declare a automacoes;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'conversas.editar');
  a := automacao_para_ler(p_pessoa, p_escritorio, p_id);
  return a;
end $$;

create function portal_automacao(p_pessoa uuid, p_escritorio uuid, p_id uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare a automacoes;
begin
  a := automacao_para_ler(p_pessoa, p_escritorio, p_id);
  return automacao_linha(a) || jsonb_build_object(
    'eu', p_pessoa,
    'dono', e_socio_dono(p_pessoa, p_escritorio),
    'quemCuida', (select pessoa_ref(v.pessoa_id) from vinculos v where v.escritorio_id = p_escritorio and v.funcao = 'SOCIO' and v.revogado_em is null limit 1),
    'whatsapp', jsonb_build_object('situacao', coalesce((select w.situacao from whatsapp_escritorio w where w.escritorio_id = p_escritorio), 'NAO_LIGADO')),
    'rascunho', a.rascunho,
    'listaErros', automacao_erros(a),
    'textosPorAprovarIds', automacao_textos_por_aprovar(a.rascunho),
    'conflitos', automacao_conflitos(a),
    'entramJaAtrasados', a.entram_ja_atrasados,
    'ligada', (select jsonb_build_object('numero', v.numero, 'em', v.ligada_em, 'por', pessoa_ref(v.ligada_por))
                 from automacao_versoes v where v.automacao_id = a.id and v.numero = a.versao_ligada),
    'modelos', (select coalesce(jsonb_object_agg(m.id, jsonb_build_object('id', m.id, 'nome', m.nome, 'texto', m.texto,
                                  'aprovadoPor', pessoa_ref(m.aprovado_por), 'aprovadoEm', m.aprovado_em,
                                  'metaSituacao', m.meta_situacao, 'metaEm', m.meta_em, 'metaMotivo', m.meta_motivo)), '{}'::jsonb)
                  from automacao_modelos m where m.automacao_id = a.id),
    'aviso', (select jsonb_build_object('texto', w.texto, 'situacao', w.situacao) from whatsapp_avisos w
               where w.escritorio_id = p_escritorio and w.chave = a.pronta_chave),
    'pessoas', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'nome', p.nome, 'areas', to_jsonb(areas_da_pessoa(p.id, p_escritorio)),
                                                             'dono', v.funcao = 'SOCIO') order by p.nome), '[]'::jsonb)
                  from vinculos v join pessoas p on p.id = v.pessoa_id
                 where v.escritorio_id = p_escritorio and v.revogado_em is null and v.funcao in ('SOCIO', 'EQUIPE')),
    'campos', to_jsonb(automacao_campos(a.gatilho)),
    'execucoes', (select jsonb_build_object('total', count(*),
                                            'concluidas', count(*) filter (where e.situacao = 'CONCLUIDA'),
                                            'andamento', count(*) filter (where e.situacao in ('AGENDADA', 'EM_ANDAMENTO')),
                                            'falhas', count(*) filter (where e.situacao = 'FALHOU'))
                    from automacao_execucoes e where e.automacao_id = a.id and e.iniciada_em >= app_now() - interval '30 days'),
    'eventos', (select coalesce(jsonb_agg(jsonb_build_object('tipo', e.tipo, 'detalhe', e.detalhe, 'pessoa', pessoa_ref(e.pessoa_id), 'em', e.em)
                                          order by e.ordem desc), '[]'::jsonb)
                  from (select * from automacao_eventos where automacao_id = a.id order by ordem desc limit 30) e));
end $$;

create function portal_automacao_execucoes(p_pessoa uuid, p_escritorio uuid, p_id uuid, p_situacao text default null, p_antes timestamptz default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare a automacoes; v_itens jsonb;
begin
  a := automacao_para_ler(p_pessoa, p_escritorio, p_id);
  select coalesce(jsonb_agg(x.j order by x.falhou desc, x.iniciada_em desc), '[]'::jsonb) into v_itens from (
    select e.iniciada_em, e.situacao = 'FALHOU' falhou, jsonb_build_object('id', e.id, 'cliente', jsonb_build_object('id', k.id, 'nome', k.nome), 'rotulo', e.rotulo,
             'versao', e.versao_numero, 'caminho', e.caminho, 'situacao', e.situacao, 'motivo', e.motivo,
             'responsavel', pessoa_ref(e.responsavel_id), 'conversaId', e.conversa_id,
             'iniciadaEm', e.iniciada_em, 'terminadaEm', e.terminada_em) j
      from automacao_execucoes e join clientes_escritorio k on k.id = e.cliente_id
     where e.automacao_id = a.id and (p_situacao is null or e.situacao = p_situacao)
       and (p_antes is null or e.iniciada_em < p_antes)
     -- a falha vem primeiro
     order by (e.situacao = 'FALHOU') desc, e.iniciada_em desc limit 21) x;
  return jsonb_build_object('itens', (select coalesce(jsonb_agg(i order by n), '[]'::jsonb) from jsonb_array_elements(v_itens) with ordinality t(i, n) where n <= 20),
                            'temMais', jsonb_array_length(v_itens) > 20);
end $$;

-- O contato que recebe: o principal do cliente, se tiver celular.
create function automacao_contato(k clientes_escritorio) returns jsonb
language sql stable
set search_path = public
as $$ select contato_principal(k.contatos) $$;

-- Quem entraria hoje (gatilhos de parcela). Fica de fora, com o motivo: sem WhatsApp, com
-- combinado no Financeiro (a próxima ação da cobrança ainda não chegou) e quem pediu para
-- não receber avisos. Para os outros gatilhos, a lista vem com o motor de cada área.
create function portal_automacao_quem_entraria(p_pessoa uuid, p_escritorio uuid, p_id uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare a automacoes; v_dias integer; v_hoje date := hoje_brasilia(); v_itens jsonb;
begin
  a := automacao_para_ler(p_pessoa, p_escritorio, p_id);
  if a.gatilho not in ('PARCELA_ATRASO', 'PARCELA_VAI_VENCER') then
    return jsonb_build_object('disponivel', false, 'itens', '[]'::jsonb);
  end if;
  v_dias := coalesce((a.rascunho #>> '{passos,0,dias}')::integer, 1);
  select coalesce(jsonb_agg(x.j order by x.ord, x.venc), '[]'::jsonb) into v_itens from (
    select r.vencimento venc,
           case when fora.motivo is null then 0 else 1 end ord,
           jsonb_build_object(
             'parcela', jsonb_build_object('id', r.id, 'descricao', r.descricao, 'valor', r.valor - parcela_recebido(r.id), 'vencimento', r.vencimento),
             'cliente', jsonb_build_object('id', k.id, 'nome', k.nome),
             'contato', jsonb_build_object('nome', ct ->> 'nome', 'papel', ct ->> 'papel'),
             'diasAtraso', v_hoje - r.vencimento,
             'jaEmAtraso', a.gatilho = 'PARCELA_ATRASO' and v_hoje - r.vencimento > v_dias,
             'entra', fora.motivo is null, 'motivo', fora.motivo, 'detalhe', fora.detalhe) j
      from recebimentos_previstos r
      join contratos c on c.id = r.contrato_id
      join clientes_escritorio k on k.id = c.cliente_id
      cross join lateral (select automacao_contato(k) ct) cc
      cross join lateral (select parcela_cobranca(r.id) cob) cb
      cross join lateral (
        select case
          when exists (select 1 from clientes_sem_avisos s where s.cliente_id = k.id and s.retirado_em is null) then 'SEM_AVISOS'
          when ct ->> 'telefone' is null or telefone_fixo_br(ct ->> 'telefone') then 'SEM_WHATSAPP'
          when (select (x.value ->> 'semCombinado')::boolean from jsonb_array_elements(a.rascunho -> 'passos') x where x.value ->> 'tipo' = 'CONDICOES' limit 1)
               and (cob ->> 'proxData')::date > v_hoje then 'COMBINADO' end motivo,
          case
          when exists (select 1 from clientes_sem_avisos s where s.cliente_id = k.id and s.retirado_em is null)
            then (select jsonb_build_object('quemPediu', s.quem_pediu, 'em', s.pedido_em, 'tipo', s.tipo)
                    from clientes_sem_avisos s where s.cliente_id = k.id and s.retirado_em is null limit 1)
          when (cob ->> 'proxData')::date > v_hoje then jsonb_build_object('oQue', cob ->> 'proxOque', 'data', cob ->> 'proxData') end detalhe) fora
     where r.escritorio_id = p_escritorio and r.cancelado_em is null and r.valor is not null
       and parcela_recebido(r.id) < r.valor
       and case when a.gatilho = 'PARCELA_ATRASO' then v_hoje - r.vencimento >= v_dias
                else r.vencimento = v_hoje + v_dias end
     limit 200) x;
  return jsonb_build_object('disponivel', true, 'dias', v_dias, 'itens', v_itens);
end $$;

-- Os dados para simular sem enviar: o fluxo do rascunho, os textos, os nomes de quem recebe a
-- conversa e, se houver, a parcela real escolhida. A simulação roda no serviço (api-portal).
create function portal_automacao_simulacao(p_pessoa uuid, p_escritorio uuid, p_id uuid, p_parcela uuid default null) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare a automacoes; r recebimentos_previstos; v_exemplo jsonb := null; v_resp uuid; v_erros jsonb;
begin
  a := automacao_para_ler(p_pessoa, p_escritorio, p_id);
  v_erros := automacao_erros(a);
  if jsonb_array_length(v_erros) > 0 then perform recusar_motivo('Ajuste os passos antes de testar', 'FLUXO_COM_ERRO'); end if;
  if p_parcela is not null then
    if a.gatilho not in ('PARCELA_ATRASO', 'PARCELA_VAI_VENCER', 'PAGAMENTO_RECEBIDO') then
      perform recusar_motivo('Este gatilho não usa parcela', 'CLIENTE_FORA_DO_GATILHO');
    end if;
    select * into r from recebimentos_previstos where id = p_parcela and escritorio_id = p_escritorio and cancelado_em is null;
    if r.id is null then perform recusar_motivo('Parcela fora do gatilho', 'CLIENTE_FORA_DO_GATILHO'); end if;
    select c.responsavel_id into v_resp from contratos c where c.id = r.contrato_id;
    select jsonb_build_object(
             'cliente', k.nome, 'contato', contato_principal(k.contatos) ->> 'nome',
             'papel', contato_principal(k.contatos) ->> 'papel',
             'parcela', r.descricao, 'valor', r.valor - parcela_recebido(r.id), 'vencimento', r.vencimento,
             'quemCuida', pessoa_ref(v_resp))
      into v_exemplo
      from contratos c join clientes_escritorio k on k.id = c.cliente_id where c.id = r.contrato_id;
  end if;
  return jsonb_build_object(
    'gatilho', a.gatilho, 'nome', a.nome, 'fluxo', a.rascunho,
    'escritorio', (select e.nome from escritorios e where e.id = p_escritorio),
    'hoje', app_now(),
    'exemplo', v_exemplo,
    'textos', (select coalesce(jsonb_object_agg(m.id, m.texto), '{}'::jsonb) from automacao_modelos m where m.automacao_id = a.id),
    'aviso', (select w.texto from whatsapp_avisos w where w.escritorio_id = p_escritorio and w.chave = a.pronta_chave),
    'pessoas', (select coalesce(jsonb_object_agg(p.id, p.nome), '{}'::jsonb) from vinculos v join pessoas p on p.id = v.pessoa_id
                 where v.escritorio_id = p_escritorio and v.revogado_em is null and v.funcao in ('SOCIO', 'EQUIPE')),
    'socioDono', (select pessoa_ref(v.pessoa_id) from vinculos v where v.escritorio_id = p_escritorio and v.funcao = 'SOCIO' and v.revogado_em is null limit 1),
    'quemTemArea', (select pessoa_ref(v.pessoa_id) from vinculos v join pessoas p on p.id = v.pessoa_id
                     where v.escritorio_id = p_escritorio and v.revogado_em is null and v.funcao = 'EQUIPE'
                       and a.area = any (areas_da_pessoa(v.pessoa_id, p_escritorio)) order by p.nome limit 1));
end $$;

-- ---------------------------------------------------------------------------------------
-- Mudanças.

-- Nova automação, em rascunho: gatilho, uma mensagem a escrever e o fim. Quem tem a área do
-- gatilho monta (decisão 2).
create function portal_automacao_criar(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_gatilho text := p_dados ->> 'gatilho'; v_nome text := btrim(coalesce(p_dados ->> 'nome', '')); v_id uuid; v_fluxo jsonb;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'conversas.editar');
  perform portal_exigir_escrita(p_pessoa, p_escritorio);
  if automacao_area(v_gatilho) is null then perform recusar_campos('Escolha quando a automação começa', 'gatilho'); end if;
  if length(v_nome) not between 3 and 80 then perform recusar_campos('Dê um nome de 3 a 80 letras', 'nome'); end if;
  if not (automacao_area(v_gatilho) = any (areas_da_pessoa(p_pessoa, p_escritorio))) then
    raise exception 'Área não liberada para esta pessoa' using errcode = 'TC401',
      detail = jsonb_build_object('motivo', 'AREA_NAO_LIBERADA')::text;
  end if;
  perform automacoes_garantir(p_escritorio);
  v_fluxo := jsonb_build_object('passos', jsonb_build_array(
    case when v_gatilho = 'PARCELA_ATRASO' then jsonb_build_object('id', 'gatilho', 'tipo', 'GATILHO', 'dias', 3)
         when v_gatilho = 'PARCELA_VAI_VENCER' then jsonb_build_object('id', 'gatilho', 'tipo', 'GATILHO', 'dias', 3)
         else jsonb_build_object('id', 'gatilho', 'tipo', 'GATILHO') end,
    jsonb_build_object('id', 'msg', 'tipo', 'MENSAGEM', 'nome', left(v_nome, 80), 'texto', ''),
    jsonb_build_object('id', 'fim', 'tipo', 'FIM')));
  if v_gatilho in ('PARCELA_ATRASO', 'PARCELA_VAI_VENCER') then
    v_fluxo := jsonb_build_object('passos', jsonb_insert(v_fluxo -> 'passos', '{1}', jsonb_build_object('id', 'cond', 'tipo', 'CONDICOES', 'semCombinado', true)));
  end if;
  insert into automacoes (escritorio_id, nome, origem, gatilho, area, rascunho, criada_por, atualizada_por)
  values (p_escritorio, v_nome, 'ESCRITORIO', v_gatilho, automacao_area(v_gatilho), v_fluxo, p_pessoa, p_pessoa)
  returning id into v_id;
  insert into automacao_eventos (escritorio_id, automacao_id, tipo, pessoa_id) values (p_escritorio, v_id, 'CRIADA', p_pessoa);
  perform registrar_historico('automacao.criada', 'automacoes', v_id::text, jsonb_build_object('gatilho', v_gatilho));
  return portal_automacao(p_pessoa, p_escritorio, v_id);
end $$;

-- Salva o rascunho (o desenho inteiro e, se vier, o nome). A versão ligada continua valendo.
create function portal_automacao_salvar(p_pessoa uuid, p_escritorio uuid, p_id uuid, p_versao integer, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare a automacoes; v_fluxo jsonb := coalesce(p_dados -> 'fluxo', null); v_nome text := btrim(p_dados ->> 'nome'); v_x text;
begin
  a := automacao_para_mudar(p_pessoa, p_escritorio, p_id);
  perform portal_exigir_escrita(p_pessoa, p_escritorio);
  if not (a.area = any (areas_da_pessoa(p_pessoa, p_escritorio))) then
    raise exception 'Área não liberada para esta pessoa' using errcode = 'TC401', detail = jsonb_build_object('motivo', 'AREA_NAO_LIBERADA')::text;
  end if;
  if v_nome is not null and (length(v_nome) not between 3 and 80 or a.origem = 'PRONTA') then
    perform recusar_campos('Dê um nome de 3 a 80 letras', 'nome');
  end if;
  if v_fluxo is not null then
    v_x := automacao_forma(a.gatilho, v_fluxo);
    if v_x is not null then
      raise exception 'O desenho não está no formato: %', v_x using errcode = 'TC422',
        detail = jsonb_build_object('campos', jsonb_build_array('fluxo'), 'forma', v_x)::text;
    end if;
    -- Os avisos só nas prontas, e os modelos só os desta automação.
    if a.origem <> 'PRONTA' and exists (select 1 from jsonb_path_query(v_fluxo, 'strict $.**') x where jsonb_typeof(x) = 'object' and x ? 'aviso' and x ->> 'aviso' is not null) then
      perform recusar_campos('O texto do aviso pronto é só das prontas', 'fluxo');
    end if;
    if exists (select 1 from unnest(automacao_modelos_do_fluxo(v_fluxo)) m
                where not exists (select 1 from automacao_modelos o where o.id = m and o.automacao_id = a.id)) then
      perform recusar_campos('O texto aprovado não é desta automação', 'fluxo');
    end if;
  end if;
  update automacoes set rascunho = coalesce(v_fluxo, rascunho), nome = coalesce(v_nome, nome),
                        atualizada_por = p_pessoa, atualizada_em = app_now()
   where id = a.id and versao = p_versao;
  if not found then perform conflito_versao('automacoes', a.id); end if;
  return portal_automacao(p_pessoa, p_escritorio, a.id);
end $$;

-- A sócia dona aprova o texto de uma mensagem: vira um modelo fixo, e o passo passa a usá-lo.
create function portal_automacao_aprovar_texto(p_pessoa uuid, p_escritorio uuid, p_id uuid, p_versao integer, p_passo text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare a automacoes; p jsonb; v_m uuid;
begin
  a := automacao_para_mudar(p_pessoa, p_escritorio, p_id);
  perform so_socio_dono(p_pessoa, p_escritorio);
  perform portal_exigir_escrita(p_pessoa, p_escritorio);
  p := automacao_passo(a.rascunho, p_passo);
  if p is null or p ->> 'tipo' <> 'MENSAGEM' or p ->> 'texto' is null then
    perform recusar_motivo('Esta mensagem não tem texto por aprovar', 'SEM_TEXTO_POR_APROVAR');
  end if;
  if exists (select 1 from jsonb_array_elements(automacao_erros(a)) e where e ->> 'passo' = p_passo) then
    perform recusar_motivo('Ajuste o texto antes de aprovar', 'TEXTO_COM_ERRO');
  end if;
  if a.versao <> p_versao then perform conflito_versao('automacoes', a.id); end if;
  insert into automacao_modelos (escritorio_id, automacao_id, nome, texto, aprovado_por)
  values (p_escritorio, a.id, p ->> 'nome', btrim(p ->> 'texto'), p_pessoa) returning id into v_m;
  update automacoes
     set rascunho = jsonb_build_object('passos', automacao_trocar_passo(rascunho -> 'passos', p_passo,
                                       (p - 'texto') || jsonb_build_object('modeloId', v_m))),
         atualizada_por = p_pessoa, atualizada_em = app_now()
   where id = a.id and versao = p_versao;
  if not found then perform conflito_versao('automacoes', a.id); end if;
  insert into automacao_eventos (escritorio_id, automacao_id, tipo, detalhe, pessoa_id)
  values (p_escritorio, a.id, 'TEXTO_APROVADO', jsonb_build_object('modelo', v_m, 'nome', p ->> 'nome'), p_pessoa);
  perform registrar_historico('automacao.texto_aprovado', 'automacoes', a.id::text, jsonb_build_object('modelo', v_m));
  return portal_automacao(p_pessoa, p_escritorio, a.id);
end $$;

-- Ligar: a sócia dona, com o WhatsApp ligado, o fluxo sem erro e os textos aprovados. Texto
-- novo vai para a Meta e a automação fica "Em aprovação"; a versão ligada antes segue até lá.
create function portal_automacao_ligar(p_pessoa uuid, p_escritorio uuid, p_id uuid, p_versao integer, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a automacoes;
  v_conf jsonb;
  v_numero integer;
  v_novos uuid[];
  o automacoes;
  v_igual boolean;
begin
  a := automacao_para_mudar(p_pessoa, p_escritorio, p_id);
  perform so_socio_dono(p_pessoa, p_escritorio);
  perform portal_exigir_escrita(p_pessoa, p_escritorio);
  if not whatsapp_ligado(p_escritorio) then perform recusar_motivo('O WhatsApp do escritório não está ligado', 'WHATSAPP_NAO_LIGADO'); end if;
  if jsonb_array_length(automacao_erros(a)) > 0 then perform recusar_motivo('Ajuste os passos antes de ligar', 'FLUXO_COM_ERRO'); end if;
  if jsonb_array_length(automacao_textos_por_aprovar(a.rascunho)) > 0 then perform recusar_motivo('Aprove os textos antes de ligar', 'TEXTO_NAO_APROVADO'); end if;
  v_igual := coalesce(a.rascunho = automacao_fluxo_valendo(a), false);
  if a.situacao = 'LIGADA' and v_igual then perform recusar_motivo('A automação já está ligada', 'AUTOMACAO_JA_LIGADA'); end if;
  if a.situacao = 'EM_APROVACAO' and v_igual then perform recusar_motivo('Esta versão já espera a Meta', 'JA_EM_APROVACAO'); end if;
  if not coalesce((p_dados ->> 'revisou')::boolean, false) then perform recusar_campos('Confirme que revisou', 'revisou'); end if;
  v_conf := automacao_conflitos(a);
  if jsonb_array_length(v_conf) > 0 and not coalesce((p_dados ->> 'desligarConflitos')::boolean, false) then
    perform recusar_motivo('Outra cobrança ligada mandaria mensagem na mesma semana', 'CONFLITO_LIMITE_SEMANAL');
  end if;
  if a.versao <> p_versao then perform conflito_versao('automacoes', a.id); end if;

  -- Desliga as que conflitam, com o motivo e o registro.
  for o in select x.* from automacoes x join jsonb_array_elements(v_conf) c on (c ->> 'id')::uuid = x.id loop
    update automacoes set situacao = 'DESLIGADA', versao_aguardando = null, aguardando_desde = null,
                          desligada_por = p_pessoa, desligada_em = app_now(),
                          desligada_motivo = left('Desligada ao ligar “' || a.nome || '”: as duas cobrariam na mesma semana', 600),
                          atualizada_por = p_pessoa, atualizada_em = app_now()
     where id = o.id;
    insert into automacao_eventos (escritorio_id, automacao_id, tipo, detalhe, pessoa_id)
    values (p_escritorio, o.id, 'DESLIGADA_POR_CONFLITO', jsonb_build_object('por', a.id, 'nome', a.nome), p_pessoa);
  end loop;

  if v_igual then
    v_numero := coalesce(a.versao_aguardando, a.versao_ligada);
  else
    v_numero := coalesce((select max(numero) from automacao_versoes where automacao_id = a.id), 0) + 1;
    insert into automacao_versoes (escritorio_id, automacao_id, numero, fluxo, ligada_por)
    values (p_escritorio, a.id, v_numero, a.rascunho, p_pessoa);
  end if;

  select coalesce(array_agg(m.id), '{}') into v_novos from automacao_modelos m
   where m.id = any (automacao_modelos_do_fluxo(a.rascunho)) and m.meta_situacao <> 'APROVADO';
  if cardinality(v_novos) > 0 then
    -- O envio à Meta é do serviço do WhatsApp (F3.58): o texto fica em análise até a resposta.
    update automacao_modelos set meta_situacao = 'EM_ANALISE', meta_em = app_now(), meta_motivo = null
     where id = any (v_novos) and meta_situacao <> 'EM_ANALISE';
    update automacoes set situacao = 'EM_APROVACAO', versao_aguardando = v_numero, aguardando_desde = app_now(),
                          entram_ja_atrasados = coalesce((p_dados ->> 'entramJaAtrasados')::boolean, false) and gatilho = 'PARCELA_ATRASO',
                          desligada_por = null, desligada_em = null, desligada_motivo = null,
                          atualizada_por = p_pessoa, atualizada_em = app_now()
     where id = a.id;
    insert into automacao_eventos (escritorio_id, automacao_id, tipo, detalhe, pessoa_id)
    values (p_escritorio, a.id, 'EM_APROVACAO', jsonb_build_object('numero', v_numero, 'modelos', to_jsonb(v_novos)), p_pessoa);
  else
    update automacoes set situacao = 'LIGADA', versao_ligada = v_numero, versao_aguardando = null, aguardando_desde = null,
                          entram_ja_atrasados = coalesce((p_dados ->> 'entramJaAtrasados')::boolean, false) and gatilho = 'PARCELA_ATRASO',
                          desligada_por = null, desligada_em = null, desligada_motivo = null,
                          atualizada_por = p_pessoa, atualizada_em = app_now()
     where id = a.id;
    insert into automacao_eventos (escritorio_id, automacao_id, tipo, detalhe, pessoa_id)
    values (p_escritorio, a.id, 'LIGADA', jsonb_build_object('numero', v_numero), p_pessoa);
  end if;
  perform registrar_historico('automacao.ligada', 'automacoes', a.id::text, jsonb_build_object('numero', v_numero, 'desligou', (select coalesce(jsonb_agg(c -> 'id'), '[]'::jsonb) from jsonb_array_elements(v_conf) c)));
  return portal_automacao(p_pessoa, p_escritorio, a.id);
end $$;

create function portal_automacao_desligar(p_pessoa uuid, p_escritorio uuid, p_id uuid, p_versao integer, p_motivo text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare a automacoes;
begin
  a := automacao_para_mudar(p_pessoa, p_escritorio, p_id);
  perform so_socio_dono(p_pessoa, p_escritorio);
  perform portal_exigir_escrita(p_pessoa, p_escritorio);
  if a.situacao not in ('LIGADA', 'EM_APROVACAO') then perform recusar_motivo('A automação não está ligada', 'AUTOMACAO_NAO_LIGADA'); end if;
  if length(btrim(coalesce(p_motivo, ''))) < 3 then perform recusar_campos('Escreva o motivo', 'motivo'); end if;
  update automacoes set situacao = 'DESLIGADA', versao_aguardando = null, aguardando_desde = null,
                        desligada_por = p_pessoa, desligada_em = app_now(), desligada_motivo = left(btrim(p_motivo), 600),
                        atualizada_por = p_pessoa, atualizada_em = app_now()
   where id = a.id and versao = p_versao;
  if not found then perform conflito_versao('automacoes', a.id); end if;
  insert into automacao_eventos (escritorio_id, automacao_id, tipo, detalhe, pessoa_id)
  values (p_escritorio, a.id, 'DESLIGADA', jsonb_build_object('motivo', left(btrim(p_motivo), 600)), p_pessoa);
  perform registrar_historico('automacao.desligada', 'automacoes', a.id::text, '{}'::jsonb);
  return portal_automacao(p_pessoa, p_escritorio, a.id);
end $$;

-- Quem não é a sócia dona sugere uma mudança; ela vê na automação (o aviso no sino vem com o sino).
create function portal_automacao_sugerir(p_pessoa uuid, p_escritorio uuid, p_id uuid, p_texto text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare a automacoes;
begin
  a := automacao_para_mudar(p_pessoa, p_escritorio, p_id);
  perform portal_exigir_escrita(p_pessoa, p_escritorio);
  if length(btrim(coalesce(p_texto, ''))) not between 3 and 600 then perform recusar_campos('Escreva a sugestão', 'texto'); end if;
  insert into automacao_eventos (escritorio_id, automacao_id, tipo, detalhe, pessoa_id)
  values (p_escritorio, a.id, 'SUGESTAO', jsonb_build_object('texto', btrim(p_texto)), p_pessoa);
  return portal_automacao(p_pessoa, p_escritorio, a.id);
end $$;

-- ---------------------------------------------------------------------------------------
-- Peças de serviço (o serviço do WhatsApp e o motor das automações chamam; nenhuma rota do
-- Portal as expõe).

-- A resposta da Meta para um texto. Aprovados todos os textos da versão que espera, ela liga;
-- recusado um, a automação volta ao que era (rascunho ou a versão ligada antes), com o motivo.
create function automacao_meta_modelo(p_escritorio uuid, p_modelo uuid, p_situacao text, p_motivo text default null) returns void
language plpgsql
set search_path = public
as $$
declare m automacao_modelos; a automacoes;
begin
  perform entrar_escritorio_servico(p_escritorio);
  if p_situacao not in ('APROVADO', 'RECUSADO') then raise exception 'Situação da Meta' using errcode = 'TC422'; end if;
  update automacao_modelos set meta_situacao = p_situacao, meta_em = app_now(), meta_motivo = case when p_situacao = 'RECUSADO' then left(coalesce(p_motivo, 'Sem motivo'), 600) end
   where id = p_modelo and escritorio_id = p_escritorio returning * into m;
  if m.id is null then raise exception 'Modelo não encontrado' using errcode = 'TC404'; end if;
  select * into a from automacoes where id = m.automacao_id;
  if a.situacao <> 'EM_APROVACAO' or not (m.id = any (automacao_modelos_do_fluxo(automacao_fluxo_valendo(a)))) then return; end if;
  if p_situacao = 'RECUSADO' then
    update automacoes set situacao = case when versao_ligada is not null then 'LIGADA' else 'RASCUNHO' end,
                          versao_aguardando = null, aguardando_desde = null
     where id = a.id;
    insert into automacao_eventos (escritorio_id, automacao_id, tipo, detalhe)
    values (p_escritorio, a.id, 'META_RECUSOU', jsonb_build_object('modelo', m.id, 'nome', m.nome, 'motivo', m.meta_motivo));
  elsif not exists (select 1 from automacao_modelos x where x.id = any (automacao_modelos_do_fluxo(automacao_fluxo_valendo(a))) and x.meta_situacao <> 'APROVADO') then
    update automacoes set situacao = 'LIGADA', versao_ligada = versao_aguardando, versao_aguardando = null, aguardando_desde = null
     where id = a.id;
    insert into automacao_eventos (escritorio_id, automacao_id, tipo, detalhe)
    values (p_escritorio, a.id, 'META_APROVOU', jsonb_build_object('numero', a.versao_aguardando));
  end if;
end $$;

-- O motor registra cada execução (uma por cliente e origem), atualizando a mesma linha.
create function automacao_execucao_registrar(p_escritorio uuid, p_automacao uuid, p_dados jsonb) returns uuid
language plpgsql
set search_path = public
as $$
declare a automacoes; v_id uuid;
begin
  perform entrar_escritorio_servico(p_escritorio);
  select * into a from automacoes where id = p_automacao and escritorio_id = p_escritorio;
  if a.id is null or a.versao_ligada is null then raise exception 'Automação não encontrada' using errcode = 'TC404'; end if;
  insert into automacao_execucoes (escritorio_id, automacao_id, versao_numero, cliente_id, origem, origem_id, rotulo, caminho, situacao,
                                   motivo, responsavel_id, conversa_id, terminada_em)
  values (p_escritorio, a.id, a.versao_ligada, (p_dados ->> 'clienteId')::uuid, p_dados ->> 'origem', (p_dados ->> 'origemId')::uuid,
          p_dados ->> 'rotulo', coalesce(p_dados -> 'caminho', '[]'::jsonb), p_dados ->> 'situacao', p_dados ->> 'motivo',
          (p_dados ->> 'responsavelId')::uuid, (p_dados ->> 'conversaId')::uuid,
          case when p_dados ->> 'situacao' in ('CONCLUIDA', 'FALHOU', 'FICOU_DE_FORA') then app_now() end)
  on conflict (automacao_id, origem_id) do update
     set caminho = excluded.caminho, situacao = excluded.situacao, motivo = excluded.motivo,
         responsavel_id = excluded.responsavel_id, conversa_id = coalesce(excluded.conversa_id, automacao_execucoes.conversa_id),
         terminada_em = excluded.terminada_em
  returning id into v_id;
  return v_id;
end $$;

-- O pedido do cliente para não receber avisos (pela conversa ou pela ficha).
create function portal_cliente_sem_avisos(p_pessoa uuid, p_escritorio uuid, p_cliente uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'conversas.editar');
  perform portal_exigir_escrita(p_pessoa, p_escritorio);
  if not exists (select 1 from clientes_escritorio where id = p_cliente and escritorio_id = p_escritorio) then
    raise exception 'Cliente não encontrado' using errcode = 'TC404';
  end if;
  if coalesce(p_dados ->> 'tipo', '') not in ('TODOS', 'COBRANCA') then perform recusar_campos('Escolha o que o cliente não quer receber', 'tipo'); end if;
  if coalesce(p_dados ->> 'origem', '') not in ('CONVERSA', 'FICHA') then perform recusar_campos('Diga por onde o cliente pediu', 'origem'); end if;
  update clientes_sem_avisos set retirado_em = app_now(), retirado_por = p_pessoa
   where escritorio_id = p_escritorio and cliente_id = p_cliente and retirado_em is null;
  if coalesce((p_dados ->> 'retirar')::boolean, false) then
    perform registrar_historico('cliente.avisos_voltaram', 'clientes_escritorio', p_cliente::text, '{}'::jsonb);
    return jsonb_build_object('semAvisos', null);
  end if;
  insert into clientes_sem_avisos (escritorio_id, cliente_id, tipo, origem, quem_pediu, registrado_por)
  values (p_escritorio, p_cliente, p_dados ->> 'tipo', p_dados ->> 'origem', nullif(btrim(p_dados ->> 'quemPediu'), ''), p_pessoa)
  returning id into v_id;
  perform registrar_historico('cliente.sem_avisos', 'clientes_escritorio', p_cliente::text, jsonb_build_object('tipo', p_dados ->> 'tipo'));
  return jsonb_build_object('semAvisos', jsonb_build_object('id', v_id, 'tipo', p_dados ->> 'tipo'));
end $$;

call fechar_acesso();
