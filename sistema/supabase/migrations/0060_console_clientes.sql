-- 0060 · Console T3jus: equipe, carteira, ficha, convite do sócio, notas internas e
-- histórico administrativo (passo 1; CO-01 a CO-04, PT-20, PT-24). Veio da 0060 do TRÍADE
-- Condo, sem o cenário do prédio e o número de WhatsApp; a ficha ganhou o CNPJ.
--
-- Regras desta parte:
-- 1. Funções internas (PT-24): administração, implantação, financeiro e suporte. A pessoa da
--    equipe tem as funções que acumula (equipe_funcoes) e, em cada cliente atribuído, um
--    vínculo com uma delas. Só age no cliente atribuído e só com função que ainda tem: tirar
--    a função faz as atribuições dela pararem na hora, sem apagar nada.
-- 2. O que o cliente nunca vê (CO-03) fica em tabelas internas: carteira (clientes) e notas.
--    A política delas exige alguém da equipe ativa no contexto, além do escritório. Os
--    eventos dessas tabelas entram no histórico marcados como internos, que o cliente não lê.
-- 3. A ficha (nome, CNPJ, cidade, endereço e contatos) é do escritório e fica em escritorios:
--    o sócio vai vê-la e editá-la depois (CO-02).
-- 4. Ações do Console começam com "console.": o vínculo de sócio nunca as tem.

-- ---------------------------------------------------------------------------------------
-- Contexto da equipe. tentar_definir_pessoa grava, junto com a pessoa, se ela é da equipe
-- ativa e as funções que tem. As políticas leem daqui, sem consultar a própria tabela.

-- A marca guarda o id da pessoa: só vale junto com a mesma pessoa no contexto.
create function contexto_equipe() returns boolean
language sql stable
set search_path = public
as $$
  select coalesce(current_setting('app.equipe', true), '') <> ''
     and current_setting('app.equipe', true) = current_setting('app.pessoa_id', true)
$$;

create function contexto_equipe_funcoes() returns text[]
language sql stable
set search_path = public
as $$
  select case when contexto_equipe()
              then coalesce(string_to_array(nullif(current_setting('app.equipe_funcoes', true), ''), ','), '{}')
              else '{}'::text[] end
$$;

create or replace function limpar_contexto() returns void
language plpgsql
set search_path = public
as $$
begin
  perform set_config('app.pessoa_id', '', true);
  perform set_config('app.escritorio_id', '', true);
  perform set_config('app.equipe', '', true);
  perform set_config('app.equipe_funcoes', '', true);
  perform set_config('app.transicao_evento', '', true);
  perform set_config('app.transicao_motivo', '', true);
  perform set_config('app.transicao_sistema', '', true);
end $$;

insert into funcoes (codigo, nome, sistema) values
  ('ADMINISTRACAO', 'Administração', 'CONSOLE'),
  ('IMPLANTACAO', 'Implantação', 'CONSOLE'),
  ('FINANCEIRO', 'Financeiro', 'CONSOLE'),
  ('SUPORTE', 'Suporte', 'CONSOLE');

-- Funções que cada pessoa da equipe acumula. Retirada fica registrada (não se apaga).
create table equipe_funcoes (
  id           uuid primary key default gen_random_uuid(),
  pessoa_id    uuid not null references equipe_t3 (pessoa_id) on delete restrict,
  funcao       text not null references funcoes (codigo),
  criado_em    timestamptz not null default app_now(),
  criado_por   uuid references pessoas (id),
  retirada_em  timestamptz,
  retirada_por uuid references pessoas (id),
  check ((retirada_em is null) = (retirada_por is null))
);
create unique index equipe_funcoes_ativa_unica on equipe_funcoes (pessoa_id, funcao) where retirada_em is null;

create function equipe_funcoes_do_console() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (select 1 from funcoes where codigo = new.funcao and sistema = 'CONSOLE') then
    raise exception 'Função % não é interna', new.funcao using errcode = 'TC422';
  end if;
  if tg_op = 'UPDATE' and (old.retirada_em is not null
     or (new.pessoa_id, new.funcao, new.criado_em, new.criado_por) is distinct from (old.pessoa_id, old.funcao, old.criado_em, old.criado_por)) then
    raise exception 'Função da equipe só muda para retirada' using errcode = 'TC422';
  end if;
  return new;
end $$;
create trigger equipe_funcoes_do_console before insert or update on equipe_funcoes
  for each row execute function equipe_funcoes_do_console();

create function somente_insercao() returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'Registro só de inserção em % (% bloqueado)', tg_table_name, tg_op using errcode = 'TC010';
end $$;
create trigger equipe_funcoes_sem_exclusao before delete on equipe_funcoes
  for each row execute function somente_insercao();

alter table equipe_funcoes enable row level security;
alter table equipe_funcoes force row level security;
insert into tabelas_sem_escritorio (tabela, motivo) values
  ('equipe_funcoes', 'Funções internas de cada pessoa da equipe, valem para todos os clientes atribuídos');

-- A pessoa existe; se for da equipe ativa, entram também as funções que ela tem.
create or replace function tentar_definir_pessoa(p_pessoa uuid) returns boolean
language plpgsql
set search_path = public
as $$
declare v_funcoes text;
begin
  perform limpar_contexto();
  if p_pessoa is null then return false; end if;
  perform set_config('app.pessoa_id', p_pessoa::text, true);
  if not exists (select 1 from pessoas where id = p_pessoa) then
    perform set_config('app.pessoa_id', '', true);
    return false;
  end if;
  if exists (select 1 from equipe_t3 where pessoa_id = p_pessoa and ativa) then
    perform set_config('app.equipe', p_pessoa::text, true);
    select string_agg(funcao, ',' order by funcao) into v_funcoes
      from equipe_funcoes where pessoa_id = p_pessoa and retirada_em is null;
    perform set_config('app.equipe_funcoes', coalesce(v_funcoes, ''), true);
  end if;
  return true;
end $$;

-- Ação do Console sem escritório (cadastrar cliente, cuidar da equipe): vem das funções.
create function pode_global(p_acao text) returns boolean
language sql stable
set search_path = public
as $$
  select exists (select 1 from funcao_acoes where acao = p_acao and funcao = any (contexto_equipe_funcoes()))
$$;

-- Negar por padrão. Vínculo do Portal vale enquanto ativo; vínculo do Console só vale
-- para a própria pessoa da equipe ativa e só com uma função que ela ainda tem (PT-24).
create or replace function pode(p_pessoa uuid, p_escritorio uuid, p_acao text) returns boolean
language sql stable
set search_path = public
as $$
  select exists (
    select 1 from vinculos v
      join funcao_acoes fa on fa.funcao = v.funcao
      join funcoes f on f.codigo = v.funcao
     where v.pessoa_id = p_pessoa and v.escritorio_id = p_escritorio
       and v.revogado_em is null and fa.acao = p_acao
       and (f.sistema = 'PORTAL'
            or (p_pessoa = contexto_pessoa() and v.funcao = any (contexto_equipe_funcoes()))))
$$;

-- Ação global do Console: a pessoa da sessão, da equipe ativa, com função que permite.
create function entrar_console(p_pessoa uuid, p_acao text) returns void
language plpgsql
set search_path = public
as $$
begin
  perform definir_pessoa(p_pessoa);
  if not pode_global(p_acao) then
    raise exception 'Sem permissão para %', p_acao using errcode = 'TC401';
  end if;
end $$;

-- Cadastro de escritório: o único caso em que o contexto recebe um escritório que ainda não
-- existe. Só para quem pode cadastrar; devolve o id que o cadastro vai usar.
create function abrir_escritorio_novo(p_pessoa uuid) returns uuid
language plpgsql
set search_path = public
as $$
declare v_id uuid := gen_random_uuid();
begin
  perform entrar_console(p_pessoa, 'console.escritorios.criar');
  perform set_config('app.escritorio_id', v_id::text, true);
  return v_id;
end $$;

-- Vínculo de função interna só para quem é da equipe ativa e tem a função.
create function vinculos_funcao_da_equipe() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (select 1 from funcoes where codigo = new.funcao and sistema = 'CONSOLE')
     and not exists (select 1 from equipe_t3 e join equipe_funcoes ef on ef.pessoa_id = e.pessoa_id
                      where e.pessoa_id = new.pessoa_id and e.ativa and ef.funcao = new.funcao and ef.retirada_em is null) then
    raise exception 'A pessoa precisa ser da equipe e ter a função %', new.funcao
      using errcode = 'TC422', detail = '{"motivo":"FUNCAO_NAO_ATRIBUIDA"}';
  end if;
  return new;
end $$;
create trigger vinculos_funcao_da_equipe before insert on vinculos
  for each row execute function vinculos_funcao_da_equipe();

-- A equipe vê a equipe (nomes e funções); só quem cuida da equipe muda.
alter policy equipe_propria on equipe_t3 rename to equipe_visivel;
alter policy equipe_visivel on equipe_t3
  using (pessoa_id = contexto_pessoa() or contexto_equipe())
  with check (pode_global('console.equipe.gerenciar'));
create policy equipe_funcoes_visiveis on equipe_funcoes
  using (pessoa_id = contexto_pessoa() or contexto_equipe())
  with check (pode_global('console.equipe.gerenciar'));
alter policy pessoa_visivel on pessoas
  using (id = contexto_pessoa()
         or exists (select 1 from vinculos v where v.pessoa_id = pessoas.id and v.escritorio_id = contexto_escritorio())
         or (contexto_equipe() and exists (select 1 from equipe_t3 e where e.pessoa_id = pessoas.id)));

-- No Portal, só contam os vínculos do Portal: atribuição da equipe não abre o painel
-- do sócio (o acesso excepcional de suporte é outra regra, suporte de acesso).
create or replace function escolher_escritorio(p_pessoa uuid, p_sessao uuid, p_escritorio uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform definir_pessoa(p_pessoa);
  if p_sessao is null or not exists (
    select 1 from vinculos v join funcoes f on f.codigo = v.funcao
     where v.pessoa_id = p_pessoa and v.escritorio_id = p_escritorio and v.revogado_em is null and f.sistema = 'PORTAL'
  ) then
    raise exception 'Sem acesso a este escritório' using errcode = 'TC401';
  end if;
  insert into sessoes_escritorio as s (sessao_id, pessoa_id, escritorio_id, escolhido_em)
  values (p_sessao, p_pessoa, p_escritorio, app_now())
  on conflict (sessao_id) do update set escritorio_id = excluded.escritorio_id, escolhido_em = excluded.escolhido_em
    where s.pessoa_id = excluded.pessoa_id;
  if not found then
    raise exception 'Sessão de outra pessoa' using errcode = 'TC401';
  end if;
end $$;

create or replace function escritorio_da_sessao(p_pessoa uuid, p_sessao uuid) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_escritorio uuid;
begin
  perform definir_pessoa(p_pessoa);
  select s.escritorio_id into v_escritorio
    from sessoes_escritorio s
   where s.sessao_id = p_sessao and s.pessoa_id = p_pessoa
     and exists (select 1 from vinculos v join funcoes f on f.codigo = v.funcao
                  where v.pessoa_id = p_pessoa and v.escritorio_id = s.escritorio_id
                    and v.revogado_em is null and f.sistema = 'PORTAL');
  return v_escritorio;
end $$;

-- ---------------------------------------------------------------------------------------
-- Tabelas internas (CO-03): o cliente nunca vê. A política separa por escritório e exige
-- alguém da equipe ativa no contexto.

create table tabelas_internas (
  tabela text primary key check (tabela ~ '^[a-z][a-z0-9_]*$'),
  motivo text not null check (length(btrim(motivo)) between 10 and 300)
);
call proteger_tabela_global('tabelas_internas', 'Lista das tabelas que o cliente nunca vê; só a migration escreve');

create procedure proteger_tabela_interna(p_tabela regclass, p_motivo text)
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from pg_constraint c
     where c.conrelid = p_tabela and c.contype = 'f' and c.confrelid = 'public.escritorios'::regclass
       and c.conkey = array[(select attnum from pg_attribute where attrelid = p_tabela and attname = 'escritorio_id' and attnotnull)]
  ) then
    raise exception 'A tabela interna % precisa de escritorio_id not null referenciando escritorios', p_tabela;
  end if;
  execute format('alter table %s enable row level security', p_tabela);
  execute format('alter table %s force row level security', p_tabela);
  if not exists (select 1 from pg_policy where polrelid = p_tabela and polname = 'isolamento_escritorio') then
    execute format(
      'create policy isolamento_escritorio on %s using (escritorio_id = contexto_escritorio() and contexto_equipe()) with check (escritorio_id = contexto_escritorio() and contexto_equipe())',
      p_tabela);
  end if;
  if exists (select 1 from pg_attribute where attrelid = p_tabela and attname = 'versao' and not attisdropped)
     and not exists (select 1 from pg_trigger where tgrelid = p_tabela and tgname = 'controle_versao') then
    execute format('create trigger controle_versao before update on %s for each row execute function controle_versao()', p_tabela);
  end if;
  insert into tabelas_internas (tabela, motivo) values (p_tabela::text, p_motivo)
  on conflict (tabela) do update set motivo = excluded.motivo;
end $$;

-- Histórico: evento interno (do Console) só a equipe lê. Evento da equipe sem escritório,
-- só quem cuida da equipe.
alter table historico add column interno boolean not null default false;

alter policy historico_leitura on historico
  using ((escritorio_id = contexto_escritorio() and (not interno or contexto_equipe()))
         or (escritorio_id is null and not interno and autor_id is not distinct from contexto_pessoa())
         or (escritorio_id is null and interno and pode_global('console.historico.equipe')));
alter policy historico_insercao on historico
  with check ((escritorio_id is null or escritorio_id = contexto_escritorio()) and (not interno or contexto_equipe()));

create function inserir_historico(p_interno boolean, p_acao text, p_entidade text, p_entidade_id text, p_dados jsonb)
returns bigint
language plpgsql
set search_path = public
as $$
declare
  v_id bigint;
  v_pessoa uuid := contexto_pessoa();
begin
  if historico_tem_dado_proibido(coalesce(p_dados, '{}'::jsonb)) then
    raise exception 'O histórico não guarda senha, token nem dado pessoal (use o id)' using errcode = 'TC011';
  end if;
  insert into historico (ocorrido_em, escritorio_id, autor_tipo, autor_id, acao, entidade, entidade_id, dados, interno)
  values (app_now(), contexto_escritorio(), case when v_pessoa is null then 'SISTEMA' else 'PESSOA' end::tipo_autor,
          v_pessoa, p_acao, p_entidade, p_entidade_id, coalesce(p_dados, '{}'::jsonb), p_interno)
  returning id into v_id;
  return v_id;
end $$;

create or replace function registrar_historico(p_acao text, p_entidade text, p_entidade_id text, p_dados jsonb default '{}'::jsonb)
returns bigint
language sql
set search_path = public
as $$ select inserir_historico(false, p_acao, p_entidade, p_entidade_id, p_dados) $$;

-- Evento do Console que o cliente não vê (CO-03, CO-04).
create function registrar_historico_interno(p_acao text, p_entidade text, p_entidade_id text, p_dados jsonb default '{}'::jsonb)
returns bigint
language sql
set search_path = public
as $$ select inserir_historico(true, p_acao, p_entidade, p_entidade_id, p_dados) $$;

-- O guardião marca como interna a mudança de estado de tabela interna.
create or replace function guardiao_transicao() returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_evento  text := nullif(current_setting('app.transicao_evento', true), '');
  v_motivo  text := nullif(current_setting('app.transicao_motivo', true), '');
  v_sistema boolean := current_setting('app.transicao_sistema', true) = 'on';
  v_pessoa  uuid := contexto_pessoa();
  v_novo    jsonb := to_jsonb(new);
  v_de      text;
  v_para    text := v_novo ->> 'estado';
begin
  if tg_op = 'INSERT' then
    if not exists (select 1 from estados_iniciais where tabela = tg_table_name and estado = v_para) then
      raise exception '% não nasce em %', tg_table_name, v_para using errcode = 'TC021';
    end if;
  else
    v_de := to_jsonb(old) ->> 'estado';
    if v_de is not distinct from v_para then
      return new;
    end if;
    if not exists (select 1 from transicoes_permitidas where tabela = tg_table_name and de = v_de and para = v_para) then
      raise exception 'Transição proibida em %: % → %', tg_table_name, v_de, v_para using errcode = 'TC023';
    end if;
  end if;

  if v_evento is null then
    raise exception 'Mudança de estado só com o evento informado' using errcode = 'TC024';
  end if;
  if v_pessoa is null and not v_sistema then
    raise exception 'Mudança de estado só com autor' using errcode = 'TC025';
  end if;

  insert into historico (ocorrido_em, escritorio_id, autor_tipo, autor_id, acao, entidade, entidade_id, dados, interno)
  values (app_now(), (v_novo ->> 'escritorio_id')::uuid,
          case when v_pessoa is null then 'SISTEMA' else 'PESSOA' end::tipo_autor, v_pessoa,
          'estado.mudou', tg_table_name, v_novo ->> 'id',
          jsonb_strip_nulls(jsonb_build_object('de', v_de, 'para', v_para, 'evento', v_evento, 'motivo', v_motivo)),
          exists (select 1 from tabelas_internas where tabela = tg_table_name));
  return new;
end $$;

-- ---------------------------------------------------------------------------------------
-- Ficha do escritório (CO-02).

-- Contatos da ficha: lista de até 10, cada um com nome, papel e telefone ou e-mail.
create function contatos_validos(p jsonb) returns boolean
language sql immutable
set search_path = public
as $$
  select jsonb_typeof(p) = 'array' and jsonb_array_length(p) <= 10 and not exists (
    select 1 from jsonb_array_elements(p) c
     where jsonb_typeof(c) <> 'object'
        or exists (select 1 from jsonb_object_keys(c) k where k not in ('nome', 'papel', 'telefone', 'email'))
        or length(btrim(coalesce(c ->> 'nome', ''))) not between 1 and 120
        or length(btrim(coalesce(c ->> 'papel', ''))) not between 1 and 60
        or (c ->> 'telefone' is null and c ->> 'email' is null)
        or (c ->> 'telefone' is not null and c ->> 'telefone' !~ '^\+[1-9][0-9]{7,14}$')
        or (c ->> 'email' is not null and (length(c ->> 'email') > 254 or c ->> 'email' !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')))
$$;

alter table escritorios
  add column cidade          text check (length(btrim(cidade)) between 2 and 80),
  add column uf              text check (uf in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB',
                                                 'PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')),
  add column endereco        text check (length(btrim(endereco)) between 3 and 200),
  -- CNPJ da sociedade, só os 14 dígitos; opcional (advogado sozinho pode não ter). Cada CNPJ é
  -- de um escritório só.
  add column cnpj            text check (cnpj ~ '^[0-9]{14}$'),
  add column contatos        jsonb not null default '[]'::jsonb check (contatos_validos(contatos));
create unique index escritorios_cnpj_unico on escritorios (cnpj) where cnpj is not null;

-- ---------------------------------------------------------------------------------------
-- Carteira (CO-01, CO-01): o estágio de cada cliente e a referência do contrato. Interna.

create table clientes (
  id                  uuid primary key default gen_random_uuid(),
  escritorio_id       uuid not null unique references escritorios (id) on delete restrict,
  estado              text not null default 'IMPLANTACAO',
  referencia_contrato text check (length(btrim(referencia_contrato)) between 1 and 120),
  criado_em           timestamptz not null default app_now(),
  versao              integer not null default 1
);
call proteger_tabela_interna('clientes', 'Carteira: estágio do cliente e referência do contrato; o cliente não vê (CO-03)');
call ligar_guardiao('clientes');
insert into estados_iniciais (tabela, estado) values ('clientes', 'IMPLANTACAO');
insert into transicoes_permitidas (tabela, de, para) values ('clientes', 'IMPLANTACAO', 'ATIVO');

-- Notas internas (CO-03): só de inserção, o cliente nunca vê.
create table notas_internas (
  id            uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorios (id) on delete restrict,
  texto         text not null check (length(btrim(texto)) between 1 and 2000),
  autor_id      uuid not null references pessoas (id) on delete restrict,
  criado_em     timestamptz not null default app_now()
);
create index notas_internas_escritorio_idx on notas_internas (escritorio_id, criado_em);
call proteger_tabela_interna('notas_internas', 'Notas da equipe sobre o cliente; o cliente nunca vê (CO-03)');
create trigger notas_internas_somente_insercao before update or delete on notas_internas
  for each row execute function somente_insercao();

-- O que cada função interna faz (PT-24). O que não está aqui, ela não faz: implantação não
-- muda contrato; financeiro e suporte só consultam a ficha e escrevem notas.
insert into funcao_acoes (funcao, acao) values
  ('ADMINISTRACAO', 'console.escritorios.criar'),
  ('ADMINISTRACAO', 'console.equipe.gerenciar'),
  ('ADMINISTRACAO', 'console.historico.equipe'),
  ('ADMINISTRACAO', 'console.carteira.ver'),
  ('ADMINISTRACAO', 'console.ficha.ver'),
  ('ADMINISTRACAO', 'console.ficha.editar'),
  ('ADMINISTRACAO', 'console.contrato.editar'),
  ('ADMINISTRACAO', 'console.estagio.mudar'),
  ('ADMINISTRACAO', 'console.socios.convidar'),
  ('ADMINISTRACAO', 'console.notas.ver'),
  ('ADMINISTRACAO', 'console.notas.escrever'),
  ('ADMINISTRACAO', 'console.historico.ver'),
  ('ADMINISTRACAO', 'console.equipe.atribuir'),
  ('IMPLANTACAO', 'console.carteira.ver'),
  ('IMPLANTACAO', 'console.ficha.ver'),
  ('IMPLANTACAO', 'console.ficha.editar'),
  ('IMPLANTACAO', 'console.estagio.mudar'),
  ('IMPLANTACAO', 'console.socios.convidar'),
  ('IMPLANTACAO', 'console.notas.ver'),
  ('IMPLANTACAO', 'console.notas.escrever'),
  ('IMPLANTACAO', 'console.historico.ver'),
  ('FINANCEIRO', 'console.carteira.ver'),
  ('FINANCEIRO', 'console.ficha.ver'),
  ('FINANCEIRO', 'console.notas.ver'),
  ('FINANCEIRO', 'console.notas.escrever'),
  ('SUPORTE', 'console.carteira.ver'),
  ('SUPORTE', 'console.ficha.ver'),
  ('SUPORTE', 'console.notas.ver'),
  ('SUPORTE', 'console.notas.escrever');

insert into configuracoes (chave, valor, descricao) values
  ('limite_convite_max', '30', 'Convites enviados pela mesma pessoa da equipe dentro da janela'),
  ('limite_convite_janela_minutos', '60', 'Janela dos convites');

-- Situações a tratar (CO-01), calculadas da ficha: o que falta para o cliente andar.
create function situacoes_cliente(p_escritorio uuid) returns text[]
language sql stable
set search_path = public
as $$
  select array_remove(array[
    case when not exists (select 1 from vinculos v where v.escritorio_id = c.id and v.funcao = 'SOCIO' and v.revogado_em is null)
         then 'SEM_SOCIO' end,
    case when jsonb_array_length(c.contatos) = 0 then 'SEM_CONTATO' end,
    case when cl.referencia_contrato is null then 'SEM_CONTRATO' end
  ], null)
  from escritorios c left join clientes cl on cl.escritorio_id = c.id
  where c.id = p_escritorio
$$;

-- Erro de dado inválido com os campos, para a tela destacar.
create function recusar_campos(p_mensagem text, variadic p_campos text[]) returns void
language plpgsql
set search_path = public
as $$
begin
  raise exception '%', p_mensagem using errcode = 'TC422', detail = jsonb_build_object('campos', to_jsonb(p_campos))::text;
end $$;

create function recusar_motivo(p_mensagem text, p_motivo text) returns void
language plpgsql
set search_path = public
as $$
begin
  raise exception '%', p_mensagem using errcode = 'TC422', detail = jsonb_build_object('motivo', p_motivo)::text;
end $$;

-- A pessoa nasce com o nome do convite; quem já existe mantém o nome. Com RLS, o ON CONFLICT
-- exigiria enxergar a pessoa de outro escritório; a exceção resolve sem isso.
create function garantir_pessoa(p_id uuid, p_nome text) returns void
language plpgsql
set search_path = public
as $$
begin
  insert into pessoas (id, nome) values (p_id, btrim(p_nome));
exception when unique_violation then
  null;
end $$;

-- ---------------------------------------------------------------------------------------
-- Funções da API do Console (security definer). Todas recebem a pessoa validada pela
-- sessão; as de cliente, o escritório da rota, conferido pela atribuição (entrar_escritorio).

-- Quem está no Console: nome, funções e ações globais.
create function console_sessao(p_pessoa uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v jsonb;
begin
  perform definir_pessoa(p_pessoa);
  if not contexto_equipe() then
    raise exception 'Só a equipe T3jus' using errcode = 'TC401';
  end if;
  select jsonb_build_object(
    'pessoaId', p.id,
    'nome', p.nome,
    'funcoes', to_jsonb(contexto_equipe_funcoes()),
    'acoes', coalesce((select jsonb_agg(distinct fa.acao order by fa.acao) from funcao_acoes fa
                        where fa.funcao = any (contexto_equipe_funcoes())
                          and fa.acao in ('console.escritorios.criar', 'console.equipe.gerenciar', 'console.historico.equipe')), '[]'::jsonb))
    into v from pessoas p where p.id = p_pessoa;
  return v;
end $$;

-- Carteira (CO-01, PT-24): só os clientes atribuídos à pessoa, com função que ela ainda tem.
create function console_carteira(p_pessoa uuid)
returns table (escritorio_id uuid, nome text, cidade text, uf text, estagio text,
               funcoes text[], situacoes text[], criado_em timestamptz)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  r record;
  v_lista jsonb;
begin
  perform definir_pessoa(p_pessoa);
  if not contexto_equipe() then
    raise exception 'Só a equipe T3jus' using errcode = 'TC401';
  end if;
  -- A lista sai inteira antes do laço: entrar em cada cliente troca o contexto.
  select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'funcoes', x.funcoes) order by x.nome, x.id), '[]'::jsonb)
    into v_lista
    from (select v.escritorio_id as id, c.nome, array_agg(distinct v.funcao order by v.funcao) as funcoes
            from vinculos v join escritorios c on c.id = v.escritorio_id
           where v.pessoa_id = p_pessoa and v.revogado_em is null and v.funcao = any (contexto_equipe_funcoes())
           group by v.escritorio_id, c.nome) x;
  for r in select * from jsonb_to_recordset(v_lista) as y(id uuid, funcoes text[])
  loop
    if pode(p_pessoa, r.id, 'console.carteira.ver') then
      perform entrar_escritorio(p_pessoa, r.id, 'console.carteira.ver');
      return query
        select c.id, c.nome, c.cidade, c.uf, cl.estado, r.funcoes, situacoes_cliente(c.id), c.criado_em
          from escritorios c join clientes cl on cl.escritorio_id = c.id
         where c.id = r.id;
    end if;
  end loop;
end $$;

-- Cadastrar o escritório (passo 1): nasce em implantação, com quem cadastrou atribuído
-- como administração.
create function console_criar_escritorio(p_pessoa uuid, p_nome text, p_cidade text, p_uf text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  v_id := abrir_escritorio_novo(p_pessoa);
  begin
    insert into escritorios (id, nome, cidade, uf) values (v_id, btrim(p_nome), btrim(p_cidade), p_uf);
  exception
    when check_violation then perform recusar_campos('Dados do escritório inválidos', 'nome', 'cidade', 'uf');
  end;
  perform definir_transicao('CLIENTE_CADASTRADO');
  insert into clientes (escritorio_id) values (v_id);
  insert into vinculos (pessoa_id, escritorio_id, funcao, criado_por) values (p_pessoa, v_id, 'ADMINISTRACAO', p_pessoa);
  perform registrar_historico('escritorio.cadastrado', 'escritorio', v_id::text);
  return v_id;
end $$;

-- A ficha completa, com o que a pessoa pode fazer nela.
create function console_ficha(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v jsonb;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'console.ficha.ver');
  select jsonb_build_object(
    'escritorio', jsonb_build_object(
      'id', c.id, 'nome', c.nome, 'cidade', c.cidade, 'uf', c.uf, 'endereco', c.endereco,
      'cnpj', c.cnpj, 'contatos', c.contatos,
      'versao', c.versao, 'criadoEm', c.criado_em),
    'cliente', jsonb_build_object('estagio', cl.estado, 'referenciaContrato', cl.referencia_contrato, 'versao', cl.versao),
    'socios', coalesce((
      select jsonb_agg(jsonb_build_object('vinculoId', v.id, 'pessoaId', p.id, 'nome', p.nome, 'desde', v.criado_em) order by v.criado_em)
        from vinculos v join pessoas p on p.id = v.pessoa_id
       where v.escritorio_id = c.id and v.funcao = 'SOCIO' and v.revogado_em is null), '[]'::jsonb),
    'equipe', coalesce((
      select jsonb_agg(jsonb_build_object('vinculoId', v.id, 'pessoaId', p.id, 'nome', p.nome, 'funcao', v.funcao,
                                          'desde', v.criado_em, 'versao', v.versao) order by p.nome, v.funcao)
        from vinculos v join pessoas p on p.id = v.pessoa_id join funcoes f on f.codigo = v.funcao
       where v.escritorio_id = c.id and f.sistema = 'CONSOLE' and v.revogado_em is null), '[]'::jsonb),
    'situacoes', to_jsonb(situacoes_cliente(c.id)),
    'permissoes', coalesce((
      select jsonb_agg(distinct fa.acao order by fa.acao)
        from vinculos v join funcao_acoes fa on fa.funcao = v.funcao
       where v.pessoa_id = p_pessoa and v.escritorio_id = c.id and v.revogado_em is null
         and v.funcao = any (contexto_equipe_funcoes())), '[]'::jsonb))
    into v
    from escritorios c join clientes cl on cl.escritorio_id = c.id
   where c.id = p_escritorio;
  return v;
end $$;

-- Editar a ficha (CO-02), seguindo a versão lida (PT-19). O histórico guarda quais campos
-- mudaram, nunca os contatos em si.
create function console_editar_ficha(p_pessoa uuid, p_escritorio uuid, p_versao integer, p_nome text, p_cidade text,
                                     p_uf text, p_endereco text, p_cnpj text, p_contatos jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_antes escritorios;
  v_versao integer;
  v_campos text[];
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'console.ficha.editar');
  select * into v_antes from escritorios where id = p_escritorio;
  if not found then raise exception 'Escritório não encontrado' using errcode = 'TC404'; end if;
  begin
    update escritorios
       set nome = btrim(p_nome), cidade = btrim(p_cidade), uf = p_uf, endereco = nullif(btrim(p_endereco), ''),
           cnpj = nullif(p_cnpj, ''), contatos = coalesce(p_contatos, '[]'::jsonb)
     where id = p_escritorio and versao = p_versao
    returning versao into v_versao;
  exception
    when unique_violation then perform recusar_campos('Este CNPJ já é de outro escritório', 'cnpj');
    when check_violation then perform recusar_campos('Dados da ficha inválidos', 'nome', 'cidade', 'uf', 'endereco', 'cnpj', 'contatos');
  end;
  if v_versao is null then perform conflito_versao('escritorios', p_escritorio); end if;
  v_campos := array_remove(array[
    case when v_antes.nome is distinct from btrim(p_nome) then 'nome' end,
    case when v_antes.cidade is distinct from btrim(p_cidade) then 'cidade' end,
    case when v_antes.uf is distinct from p_uf then 'uf' end,
    case when v_antes.endereco is distinct from nullif(btrim(p_endereco), '') then 'endereco' end,
    case when v_antes.cnpj is distinct from nullif(p_cnpj, '') then 'cnpj' end,
    case when v_antes.contatos is distinct from coalesce(p_contatos, '[]'::jsonb) then 'contatos' end], null);
  perform registrar_historico('ficha.alterada', 'escritorio', p_escritorio::text, jsonb_build_object('campos', to_jsonb(v_campos)));
  return v_versao;
end $$;

-- Referência do contrato (CO-02): só administração (implantação não muda contrato, PT-24).
create function console_alterar_contrato(p_pessoa uuid, p_escritorio uuid, p_versao integer, p_referencia text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cliente uuid;
  v_versao integer;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'console.contrato.editar');
  select id into v_cliente from clientes where escritorio_id = p_escritorio;
  begin
    update clientes set referencia_contrato = nullif(btrim(p_referencia), '')
     where id = v_cliente and versao = p_versao
    returning versao into v_versao;
  exception when check_violation then perform recusar_campos('Referência do contrato inválida', 'referenciaContrato');
  end;
  if v_versao is null then perform conflito_versao('clientes', v_cliente); end if;
  perform registrar_historico_interno('contrato.alterado', 'cliente', v_cliente::text, '{}'::jsonb);
  return v_versao;
end $$;

-- Estágio da carteira (CO-01): de implantação para ativo, só com sócio convidado.
create function console_mudar_estagio(p_pessoa uuid, p_escritorio uuid, p_versao integer, p_estagio text, p_motivo text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cliente uuid;
  v_atual text;
  v_versao integer;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'console.estagio.mudar');
  select id, estado into v_cliente, v_atual from clientes where escritorio_id = p_escritorio;
  if v_atual = p_estagio then
    perform recusar_motivo('O cliente já está neste estágio', 'MESMO_ESTAGIO');
  end if;
  if p_estagio = 'ATIVO' and 'SEM_SOCIO' = any (situacoes_cliente(p_escritorio)) then
    perform recusar_motivo('Convide o sócio antes de concluir a implantação', 'SEM_SOCIO');
  end if;
  perform definir_transicao(case p_estagio when 'ATIVO' then 'IMPLANTACAO_CONCLUIDA' else 'ESTAGIO_ALTERADO' end,
                            nullif(btrim(p_motivo), ''));
  update clientes set estado = p_estagio where id = v_cliente and versao = p_versao returning versao into v_versao;
  if v_versao is null then perform conflito_versao('clientes', v_cliente); end if;
  return v_versao;
end $$;

-- Sócio convidado (PT-20): conta própria, ligada ao escritório. A conta no Auth vem
-- antes (a Edge Function convida ou acha pelo e-mail); aqui nasce a pessoa e o vínculo.
create function console_vincular_socio(p_pessoa uuid, p_escritorio uuid, p_convidado uuid, p_nome text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_vinculo uuid;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'console.socios.convidar');
  if length(btrim(coalesce(p_nome, ''))) not between 1 and 120 then
    perform recusar_campos('Nome inválido', 'nome');
  end if;
  perform garantir_pessoa(p_convidado, p_nome);
  if exists (select 1 from vinculos where pessoa_id = p_convidado and escritorio_id = p_escritorio
                                    and funcao = 'SOCIO' and revogado_em is null) then
    perform recusar_motivo('Esta pessoa já é sócia deste escritório', 'JA_SOCIO');
  end if;
  insert into vinculos (pessoa_id, escritorio_id, funcao, criado_por)
  values (p_convidado, p_escritorio, 'SOCIO', p_pessoa)
  returning id into v_vinculo;
  perform registrar_historico('socio.convidado', 'vinculo', v_vinculo::text, jsonb_build_object('pessoa_id', p_convidado));
  return v_vinculo;
end $$;

-- Notas internas (CO-03).
create function console_notas(p_pessoa uuid, p_escritorio uuid)
returns table (id uuid, texto text, criado_em timestamptz, autor_id uuid, autor_nome text)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'console.notas.ver');
  return query
    select n.id, n.texto, n.criado_em, n.autor_id, p.nome
      from notas_internas n left join pessoas p on p.id = n.autor_id
     order by n.criado_em desc, n.id;
end $$;

create function console_escrever_nota(p_pessoa uuid, p_escritorio uuid, p_texto text) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'console.notas.escrever');
  begin
    insert into notas_internas (escritorio_id, texto, autor_id) values (p_escritorio, btrim(p_texto), p_pessoa) returning id into v_id;
  exception when check_violation or not_null_violation then perform recusar_campos('Nota vazia ou longa demais', 'texto');
  end;
  perform registrar_historico_interno('nota.escrita', 'nota_interna', v_id::text, '{}'::jsonb);
  return v_id;
end $$;

-- Histórico administrativo do cliente (CO-04): tudo, inclusive o interno, mais novo primeiro.
create function console_historico(p_pessoa uuid, p_escritorio uuid, p_antes bigint default null, p_limite integer default 50)
returns table (id bigint, ocorrido_em timestamptz, autor_tipo text, autor_id uuid, autor_nome text, acao text,
               entidade text, entidade_id text, dados jsonb, interno boolean)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'console.historico.ver');
  return query
    select h.id, h.ocorrido_em, h.autor_tipo::text, h.autor_id, p.nome, h.acao, h.entidade, h.entidade_id, h.dados, h.interno
      from historico h left join pessoas p on p.id = h.autor_id
     where h.escritorio_id = p_escritorio and (p_antes is null or h.id < p_antes)
     order by h.id desc
     limit least(greatest(coalesce(p_limite, 50), 1), 200);
end $$;

-- ---------------------------------------------------------------------------------------
-- Equipe (PT-24): funções acumuladas e clientes atribuídos.

create function exigir_funcoes_internas(p_funcoes text[]) returns void
language plpgsql
set search_path = public
as $$
begin
  if p_funcoes is null or cardinality(p_funcoes) = 0
     or exists (select 1 from unnest(p_funcoes) f where not exists (select 1 from funcoes where codigo = f and sistema = 'CONSOLE')) then
    perform recusar_campos('Escolha ao menos uma função interna válida', 'funcoes');
  end if;
end $$;

-- Sempre sobra alguém da equipe ativa com administração.
create function exigir_administracao_restante() returns void
language plpgsql
set search_path = public
as $$
begin
  if not exists (select 1 from equipe_t3 e join equipe_funcoes ef on ef.pessoa_id = e.pessoa_id
                  where e.ativa and ef.funcao = 'ADMINISTRACAO' and ef.retirada_em is null) then
    perform recusar_motivo('A equipe precisa de ao menos uma pessoa com administração', 'ULTIMA_ADMINISTRACAO');
  end if;
end $$;

-- Grava as funções da pessoa: retira as que saíram e acrescenta as novas.
create function gravar_funcoes(p_membro uuid, p_funcoes text[], p_autor uuid) returns void
language plpgsql
set search_path = public
as $$
begin
  update equipe_funcoes set retirada_em = app_now(), retirada_por = p_autor
   where pessoa_id = p_membro and retirada_em is null and funcao <> all (p_funcoes);
  insert into equipe_funcoes (pessoa_id, funcao, criado_por)
  select p_membro, f, p_autor from (select distinct unnest(p_funcoes) as f) n
   where not exists (select 1 from equipe_funcoes where pessoa_id = p_membro and funcao = n.f and retirada_em is null);
end $$;

create function console_equipe(p_pessoa uuid)
returns table (pessoa_id uuid, nome text, ativa boolean, funcoes text[], desde timestamptz)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  perform entrar_console(p_pessoa, 'console.equipe.gerenciar');
  return query
    select e.pessoa_id, p.nome, e.ativa,
           coalesce(array_agg(ef.funcao order by ef.funcao) filter (where ef.funcao is not null), '{}'),
           e.criado_em
      from equipe_t3 e join pessoas p on p.id = e.pessoa_id
      left join equipe_funcoes ef on ef.pessoa_id = e.pessoa_id and ef.retirada_em is null
     group by e.pessoa_id, p.nome, e.ativa, e.criado_em
     order by e.ativa desc, p.nome;
end $$;

-- Cadastrar alguém na equipe (a conta no Auth vem antes, por convite). Quem estava
-- desativado volta, com as funções escolhidas agora.
create function console_cadastrar_membro(p_pessoa uuid, p_membro uuid, p_nome text, p_funcoes text[]) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform entrar_console(p_pessoa, 'console.equipe.gerenciar');
  perform exigir_funcoes_internas(p_funcoes);
  if length(btrim(coalesce(p_nome, ''))) not between 1 and 120 then
    perform recusar_campos('Nome inválido', 'nome');
  end if;
  perform garantir_pessoa(p_membro, p_nome);
  if exists (select 1 from equipe_t3 where pessoa_id = p_membro and ativa) then
    perform recusar_motivo('Esta pessoa já está na equipe', 'JA_NA_EQUIPE');
  elsif exists (select 1 from equipe_t3 where pessoa_id = p_membro) then
    update equipe_t3 set ativa = true, desativada_em = null where pessoa_id = p_membro;
  else
    insert into equipe_t3 (pessoa_id) values (p_membro);
  end if;
  perform gravar_funcoes(p_membro, p_funcoes, p_pessoa);
  perform registrar_historico_interno('equipe.membro_cadastrado', 'pessoa', p_membro::text, jsonb_build_object('funcoes', to_jsonb(p_funcoes)));
end $$;

-- Rever as funções (PT-24). Tirar uma função faz as atribuições dela pararem na hora.
create function console_definir_funcoes(p_pessoa uuid, p_membro uuid, p_funcoes text[]) returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_antes text[];
begin
  perform entrar_console(p_pessoa, 'console.equipe.gerenciar');
  perform exigir_funcoes_internas(p_funcoes);
  if not exists (select 1 from equipe_t3 where pessoa_id = p_membro and ativa) then
    raise exception 'Pessoa fora da equipe' using errcode = 'TC404';
  end if;
  select coalesce(array_agg(funcao order by funcao), '{}') into v_antes
    from equipe_funcoes where pessoa_id = p_membro and retirada_em is null;
  perform gravar_funcoes(p_membro, p_funcoes, p_pessoa);
  perform exigir_administracao_restante();
  perform registrar_historico_interno('equipe.funcoes_alteradas', 'pessoa', p_membro::text,
    jsonb_build_object('antes', to_jsonb(v_antes), 'depois', (select to_jsonb(array_agg(distinct f order by f)) from unnest(p_funcoes) f)));
end $$;

-- Desativar alguém da equipe: para de entrar no Console na hora; a autoria fica.
create function console_desativar_membro(p_pessoa uuid, p_membro uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform entrar_console(p_pessoa, 'console.equipe.gerenciar');
  if p_membro = p_pessoa then
    perform recusar_motivo('Ninguém desativa a própria conta', 'PROPRIA_CONTA');
  end if;
  update equipe_t3 set ativa = false, desativada_em = app_now() where pessoa_id = p_membro and ativa;
  if not found then raise exception 'Pessoa fora da equipe' using errcode = 'TC404'; end if;
  perform exigir_administracao_restante();
  perform registrar_historico_interno('equipe.membro_desativado', 'pessoa', p_membro::text, '{}'::jsonb);
end $$;

-- Atribuir um cliente a alguém da equipe, com uma das funções que a pessoa tem.
create function console_atribuir(p_pessoa uuid, p_escritorio uuid, p_membro uuid, p_funcao text) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'console.equipe.atribuir');
  if not exists (select 1 from funcoes where codigo = p_funcao and sistema = 'CONSOLE') then
    perform recusar_campos('Função interna desconhecida', 'funcao');
  end if;
  if exists (select 1 from vinculos where pessoa_id = p_membro and escritorio_id = p_escritorio
                                    and funcao = p_funcao and revogado_em is null) then
    perform recusar_motivo('Esta pessoa já atende o cliente com esta função', 'JA_ATRIBUIDO');
  end if;
  insert into vinculos (pessoa_id, escritorio_id, funcao, criado_por)
  values (p_membro, p_escritorio, p_funcao, p_pessoa)
  returning id into v_id;
  perform registrar_historico_interno('equipe.atribuida', 'vinculo', v_id::text,
                                      jsonb_build_object('pessoa_id', p_membro, 'funcao', p_funcao));
  return v_id;
end $$;

-- Retirar a atribuição. O cliente nunca fica sem administração atribuída.
create function console_retirar_atribuicao(p_pessoa uuid, p_escritorio uuid, p_vinculo uuid, p_versao integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_versao integer;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'console.equipe.atribuir');
  if not exists (select 1 from vinculos v join funcoes f on f.codigo = v.funcao
                  where v.id = p_vinculo and v.escritorio_id = p_escritorio and f.sistema = 'CONSOLE') then
    raise exception 'Atribuição não encontrada' using errcode = 'TC404';
  end if;
  update vinculos set revogado_em = app_now(), revogado_por = p_pessoa
   where id = p_vinculo and versao = p_versao and revogado_em is null
  returning versao into v_versao;
  if v_versao is null then perform conflito_versao('vinculos', p_vinculo); end if;
  if not exists (select 1 from vinculos where escritorio_id = p_escritorio and funcao = 'ADMINISTRACAO' and revogado_em is null) then
    perform recusar_motivo('O cliente precisa de alguém da administração atribuído', 'ULTIMA_ADMINISTRACAO');
  end if;
  perform registrar_historico_interno('equipe.atribuicao_retirada', 'vinculo', p_vinculo::text, '{}'::jsonb);
  return v_versao;
end $$;

-- Histórico das mudanças na equipe (CO-04), para quem pode vê-lo.
create function console_historico_equipe(p_pessoa uuid, p_antes bigint default null, p_limite integer default 50)
returns table (id bigint, ocorrido_em timestamptz, autor_id uuid, autor_nome text, acao text,
               entidade text, entidade_id text, dados jsonb)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  perform entrar_console(p_pessoa, 'console.historico.equipe');
  return query
    select h.id, h.ocorrido_em, h.autor_id, p.nome, h.acao, h.entidade, h.entidade_id, h.dados
      from historico h left join pessoas p on p.id = h.autor_id
     where h.escritorio_id is null and h.interno and (p_antes is null or h.id < p_antes)
     order by h.id desc
     limit least(greatest(coalesce(p_limite, 50), 1), 200);
end $$;

-- Primeira pessoa da equipe, com administração. Roda uma vez, pelo SQL do Supabase (não é
-- função da API); depois disso a equipe cresce pelo Console.
create procedure iniciar_equipe(p_usuario uuid, p_nome text)
language plpgsql
set search_path = public
as $$
begin
  if exists (select 1 from equipe_t3) then
    raise exception 'A equipe já começou: cadastre as próximas pessoas pelo Console';
  end if;
  insert into pessoas (id, nome) values (p_usuario, btrim(p_nome)) on conflict (id) do nothing;
  insert into equipe_t3 (pessoa_id) values (p_usuario);
  insert into equipe_funcoes (pessoa_id, funcao, criado_por) values (p_usuario, 'ADMINISTRACAO', p_usuario);
end $$;

call fechar_acesso();
