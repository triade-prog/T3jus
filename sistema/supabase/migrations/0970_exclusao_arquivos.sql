-- Arquivos do cliente excluído a pedido do titular (F3.141; PT-11, PT-07, CH-08), pelo plano
-- revisado de 23/11/2026. Fecha a "Lacuna herdada" da 0930 (revisão, I4): a exclusão escondia os
-- documentos pessoais e o termo de curatela, mas o arquivo ficava no bucket e o nome do arquivo
-- (que pode ser "RG Maria Silva.pdf") ficava na linha.
--
-- 1. Fila nova, por objeto: arquivos_apagar. É irmã de guarda_arquivos (0540), que trabalha com a
--    pasta inteira do escritório, e usa a mesma rota da api-console, a mesma URL
--    (configuracoes.rotina_arquivos_url), o mesmo pg_net e o mesmo cron (t3jus-guarda-arquivos).
--    É global, como guarda_arquivos: a coluna é escritorio (e não escritorio_id) para sobreviver a
--    terminar_guarda, e guarda só ids. O check do caminho amarra cada caminho à pasta do próprio
--    escritório e a dois formatos: <esc>/<documento> e <esc>/propostas/<proposta>-v<n>.docx.
-- 2. cliente_documentos ganha apagado_em. Na exclusão, a linha perde nome, descricao e
--    data_documento e fica com o tipo, o tamanho e as datas (a prova mínima de que existiu, LGPD
--    art. 37). O gatilho de guarda aceita essa mudança só para cliente EXCLUIDO, com a comparação
--    por to_jsonb, como atendimentos_so_anonimizar (0170). DELETE continua recusado (PT-03).
-- 3. O gatilho z_cliente_excluido_arquivos (AFTER, depois de comercial_apagar_do_excluido pela
--    ordem do nome) põe na fila, na mesma transação da exclusão, todo documento do cliente (de
--    qualquer tipo e situação, com o termo, os substituídos e os ENVIANDO) e todo .docx de proposta
--    que pode existir (versão 1 até a atual). A chamada da rota pelo pg_net só sai depois do commit.
-- 4. Documento nasce só de cliente não excluído, com trava (revisão, B1): o FOR SHARE espera a
--    exclusão em curso e relê o cliente depois dela, e assim um anexo simultâneo não escapa da fila.
-- 5. As leituras passam a recusar o apagado: abrir (também o de cliente excluído, que era a lacuna
--    da 0853), para_concluir, cliente_documentos_em_uso e cliente_termo_em_uso.
-- 6. O preenchimento dos clientes já excluídos fica numa função testada
--    (arquivos_apagar_preencher_excluidos) que a 0971 chama à parte (revisão, I3).
--
-- Cada função recriada copia a versão mais recente (revisão, I6):
--   cliente_documento_guarda .................. 0853 (nunca recriada depois)
--   portal_cliente_documento_abrir ............ 0853
--   portal_cliente_documento_para_concluir .... 0853
--   cliente_documentos_em_uso ................. 0930 (com o filtro do termo; o termo de tutela da 0960 também fica fora)
--   cliente_termo_em_uso ...................... 0930
--   guarda_arquivos_chamar .................... 0540
-- portal_cliente_documento_concluir (0930, com o ramo do termo) não é recriada: o gatilho de guarda
-- recusa concluir documento apagado.
--
-- Prazos que a fila respeita (README, "Arquivos do cliente excluído"):
--   * o endereço de envio assinado do Supabase vale 2 horas, então todo documento entra com
--     conferir_ate = criado_em + 2 h 10 min (revisão, I1): a rota apaga de novo a cada volta e só
--     conclui depois disso;
--   * o .docx da proposta pode ser enviado logo depois da exclusão por uma leitura anterior a ela
--     (revisão, M2), então os caminhos de proposta esperam 15 minutos.

-- ---------------------------------------------------------------------------------------
-- 1. A fila.
create table arquivos_apagar (
  id           uuid primary key default gen_random_uuid(),
  escritorio   uuid not null references escritorios (id) on delete restrict,
  bucket       text not null check (bucket = 'documentos-portal'),
  caminho      text not null,
  motivo       text not null default 'EXCLUSAO_TITULAR' check (motivo in ('EXCLUSAO_TITULAR')),
  cliente_id   uuid not null,           -- sem chave estrangeira de propósito: só referência para o histórico
  pedido_em    timestamptz not null default app_now(),
  conferir_ate timestamptz,             -- envio que pode chegar atrasado: apaga de novo até esta hora
  tentativas   integer not null default 0,
  ultimo_erro  text check (length(ultimo_erro) <= 300),
  concluido_em timestamptz,
  unique (bucket, caminho),
  constraint arquivos_apagar_caminho check (caminho ~ ('^' || escritorio::text
    || '/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
    || '|propostas/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-v[1-9][0-9]{0,8}\.docx)$'))
);
create index arquivos_apagar_pendentes on arquivos_apagar (tentativas, pedido_em) where concluido_em is null;
create index arquivos_apagar_cliente on arquivos_apagar (cliente_id);
call proteger_tabela_global('arquivos_apagar',
  'Fila dos arquivos do Storage a apagar um a um (exclusão a pedido do titular); guarda só ids, nunca nome');

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('arquivos_apagar', false, 'Arquivos do Storage a apagar um a um na exclusão a pedido do titular: o caminho (só ids), as tentativas e quando saiu; a linha fica',
  null, null, null, null, null, null, false);

-- ---------------------------------------------------------------------------------------
-- 2. A linha do documento.
alter table cliente_documentos add column apagado_em timestamptz;
alter table cliente_documentos alter column nome drop not null;
alter table cliente_documentos add constraint cliente_documentos_apagado check ((nome is null) = (apagado_em is not null));

-- Os dois checks sem nome da 0853 passam a aceitar a linha apagada (sem descrição nem data do papel).
do $$
declare
  r record;
  v_outro integer := 0;
  v_comprovante integer := 0;
begin
  for r in select conname, pg_get_constraintdef(oid) def from pg_constraint
            where conrelid = 'cliente_documentos'::regclass and contype = 'c' loop
    if position('''OUTRO''' in r.def) > 0 and position('descricao IS NOT NULL' in r.def) > 0 then
      execute format('alter table cliente_documentos drop constraint %I', r.conname);
      v_outro := v_outro + 1;
    elsif position('''COMPROVANTE_RESIDENCIA''' in r.def) > 0 and position('data_documento IS NOT NULL' in r.def) > 0 then
      execute format('alter table cliente_documentos drop constraint %I', r.conname);
      v_comprovante := v_comprovante + 1;
    end if;
  end loop;
  if v_outro <> 1 or v_comprovante <> 1 then
    raise exception 'Checks da 0853 não encontrados (OUTRO: %, COMPROVANTE: %)', v_outro, v_comprovante;
  end if;
end $$;
alter table cliente_documentos add constraint cliente_documentos_outro
  check (tipo <> 'OUTRO' or descricao is not null or apagado_em is not null);
alter table cliente_documentos add constraint cliente_documentos_comprovante
  check (tipo <> 'COMPROVANTE_RESIDENCIA' or data_documento is not null or apagado_em is not null);

-- Documento nasce só de cliente que existe e não foi excluído, com o nome e sem apagado_em
-- (revisão, B1). FOR SHARE conflita com o FOR NO KEY UPDATE da exclusão: o anexo espera a exclusão
-- terminar e então vê o cliente EXCLUIDO; se o anexo chega primeiro, a exclusão espera e já o vê.
create function cliente_documento_nasce() returns trigger
language plpgsql
set search_path = public
as $$
begin
  perform 1 from clientes_escritorio where id = new.cliente_id and estado <> 'EXCLUIDO' for share;
  if not found then
    raise exception 'Cliente não encontrado' using errcode = 'TC404';
  end if;
  if new.apagado_em is not null or new.nome is null then
    raise exception 'Documento nasce com o nome e sem apagado_em' using errcode = 'TC023';
  end if;
  return new;
end $$;
create trigger cliente_documento_nasce before insert on cliente_documentos
  for each row execute function cliente_documento_nasce();

-- A guarda (corpo da 0853) com dois ramos novos:
--   * documento apagado não muda mais;
--   * apagar (apagado_em, sem nome, descrição e data do papel) só com o cliente EXCLUIDO, na hora
--     (apagado_em = app_now()) e com todo o resto igual. A comparação é por to_jsonb, como em
--     atendimentos_so_anonimizar (0170): coluna nova entra sozinha na conferência.
create or replace function cliente_documento_guarda() returns trigger
language plpgsql
set search_path = public
as $$
declare v_apagar text[] := array['apagado_em', 'nome', 'descricao', 'data_documento'];
begin
  if tg_op = 'DELETE' then
    raise exception 'Documento não se apaga' using errcode = 'TC023';
  end if;
  if old.apagado_em is not null then
    raise exception 'Documento apagado não muda' using errcode = 'TC023';
  end if;
  if new.apagado_em is not null then
    if new.apagado_em = app_now()
       and new.nome is null and new.descricao is null and new.data_documento is null
       and (to_jsonb(new) - v_apagar) = (to_jsonb(old) - v_apagar)
       and (select c.estado from clientes_escritorio c where c.id = old.cliente_id) = 'EXCLUIDO' then
      return new;
    end if;
    raise exception 'Documento só sai com o cliente excluído a pedido do titular' using errcode = 'TC023';
  end if;
  if (new.id, new.escritorio_id, new.cliente_id, new.tipo, new.descricao, new.data_documento, new.nome, new.arquivo_tipo, new.tamanho,
      new.fotos, new.pedido_id, new.substitui_id, new.enviado_por, new.criado_em)
     is distinct from (old.id, old.escritorio_id, old.cliente_id, old.tipo, old.descricao, old.data_documento, old.nome, old.arquivo_tipo, old.tamanho,
      old.fotos, old.pedido_id, old.substitui_id, old.enviado_por, old.criado_em)
     or not ((old.situacao = 'ENVIANDO' and new.situacao = 'PRONTO' and new.substituido_por is not distinct from old.substituido_por)
             or (old.situacao = 'PRONTO' and new.situacao = 'PRONTO' and old.substituido_por is null and new.substituido_por is not null
                 and new.concluido_em = old.concluido_em)) then
    raise exception 'Documento pessoal só muda de enviando para pronto, e ao ser substituído' using errcode = 'TC023';
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------------------
-- 3. Na exclusão.

-- Evento do cliente com o escritório explícito: na exclusão, o do contexto; na rotina e no
-- preenchimento, sem contexto, com a marca t3jus.aplicando_prazos (política rotina_prazos_inserir).
create function historico_do_cliente(p_escritorio uuid, p_cliente uuid, p_acao text, p_dados jsonb) returns void
language plpgsql
set search_path = public
as $$
declare v_pessoa uuid := contexto_pessoa();
begin
  if historico_tem_dado_proibido(coalesce(p_dados, '{}'::jsonb)) then
    raise exception 'O histórico não guarda senha, token nem dado pessoal (use o id)' using errcode = 'TC011';
  end if;
  insert into historico (ocorrido_em, escritorio_id, autor_tipo, autor_id, acao, entidade, entidade_id, dados, interno)
  values (app_now(), p_escritorio, case when v_pessoa is null then 'SISTEMA' else 'PESSOA' end::tipo_autor,
          v_pessoa, p_acao, 'cliente', p_cliente::text, coalesce(p_dados, '{}'::jsonb), false);
end $$;

-- Põe na fila os arquivos do cliente e limpa a linha dos documentos. Idempotente: chamada de novo,
-- não duplica a fila nem muda a data. Devolve quantos documentos saíram e de quantas propostas
-- entrou caminho novo. Não é security definer: roda dentro da exclusão (contexto do escritório)
-- ou do preenchimento (com as marcas da rotina).
create function cliente_arquivos_apagar(p_cliente uuid) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_docs integer;
  v_props integer;
begin
  -- Trava os documentos em ordem de id antes de mexer (revisão, M9).
  perform 1 from cliente_documentos where cliente_id = p_cliente and apagado_em is null order by id for update;

  -- Todo documento, de qualquer tipo e situação. O envio pode chegar até 2 h depois de criado o
  -- endereço (revisão, I1): a linha espera até criado_em + 2 h 10 min.
  insert into arquivos_apagar (escritorio, bucket, caminho, motivo, cliente_id, conferir_ate)
  select d.escritorio_id, 'documentos-portal', d.escritorio_id::text || '/' || d.id::text, 'EXCLUSAO_TITULAR', d.cliente_id,
         greatest(app_now(), d.criado_em + interval '2 hours 10 minutes')
    from cliente_documentos d
   where d.cliente_id = p_cliente and d.apagado_em is null
   order by d.id
  on conflict (bucket, caminho) do nothing;

  -- Todo .docx que pode existir: um por versão, de 1 até a atual (revisão, M2: espera 15 min).
  with novos as (
    insert into arquivos_apagar (escritorio, bucket, caminho, motivo, cliente_id, conferir_ate)
    select p.escritorio_id, 'documentos-portal', p.escritorio_id::text || '/propostas/' || p.id::text || '-v' || n::text || '.docx',
           'EXCLUSAO_TITULAR', p.cliente_id, app_now() + interval '15 minutes'
      from propostas p cross join lateral generate_series(1, greatest(p.versao, 1)) n
     where p.cliente_id = p_cliente
     order by p.id, n
    on conflict (bucket, caminho) do nothing
    returning caminho)
  select count(distinct split_part(split_part(caminho, '/', 3), '-v', 1)) into v_props from novos;

  update cliente_documentos set apagado_em = app_now(), nome = null, descricao = null, data_documento = null
   where cliente_id = p_cliente and apagado_em is null;
  get diagnostics v_docs = row_count;

  return jsonb_build_object('documentos', v_docs, 'propostas', v_props);
end $$;

create function cliente_excluido_arquivos() returns trigger
language plpgsql
set search_path = public
as $$
declare v jsonb := cliente_arquivos_apagar(new.id);
begin
  if (v ->> 'documentos')::integer + (v ->> 'propostas')::integer > 0 then
    -- O registro de que os nomes saíram, na hora, mesmo que a fila demore (revisão, M4).
    perform historico_do_cliente(new.escritorio_id, new.id, 'cliente.arquivos_na_fila', v);
    perform guarda_arquivos_chamar();
  end if;
  return null;
end $$;
-- O z_ faz este gatilho rodar depois de comercial_apagar_do_excluido (0190), que sobe a versão das
-- propostas ao limpar o escopo: a série de .docx cobre até a versão final.
create trigger z_cliente_excluido_arquivos after update of estado on clientes_escritorio
  for each row when (new.estado = 'EXCLUIDO' and old.estado <> 'EXCLUIDO') execute function cliente_excluido_arquivos();

-- ---------------------------------------------------------------------------------------
-- 4. A rotina: chamar a rota, ler a fila e registrar o que a rota fez.

-- Há o que apagar em alguma das duas filas (revisão, I4: separada para testar sem pg_net).
create function guarda_arquivos_tem_pendencia() returns boolean
language sql
stable
set search_path = public
as $$
  select exists (select 1 from guarda_arquivos where concluido_em is null)
      or exists (select 1 from arquivos_apagar where concluido_em is null)
$$;

-- Corpo da 0540, olhando as duas filas.
create or replace function guarda_arquivos_chamar() returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_url text := nullif(btrim((select valor #>> '{}' from configuracoes where chave = 'rotina_arquivos_url')), '');
begin
  if v_url is null or not guarda_arquivos_tem_pendencia()
     or not exists (select 1 from pg_extension where extname = 'pg_net') then
    return false;
  end if;
  execute 'select net.http_post(url := $1, body := ''{}''::jsonb, timeout_milliseconds := 30000)' using v_url;
  return true;
end $$;

-- A rota pede os arquivos que faltam (os que falharam menos vão primeiro).
create function rotina_arquivos_apagar_pendentes(p_limite integer default 500) returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'bucket', a.bucket, 'caminho', a.caminho)
                            order by a.tentativas, a.pedido_em, a.id), '[]'::jsonb)
    from (select * from arquivos_apagar where concluido_em is null
           order by tentativas, pedido_em, id limit least(greatest(coalesce(p_limite, 500), 1), 1000)) a
$$;

-- … e diz o que fez com eles. Sem erro, conclui os que já passaram de conferir_ate; os que ainda
-- esperam ficam como estão, sem somar tentativa (revisão, M1). Com erro, soma a tentativa e guarda
-- o erro. Uma chamada por vez (revisão, I2), e o evento sai só para o cliente cujos arquivos esta
-- chamada terminou. Devolve quantos concluiu.
create function rotina_arquivos_apagar_registrar(p_ids uuid[], p_erro text default null) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_erro text := left(nullif(btrim(coalesce(p_erro, '')), ''), 300);
  v_n integer;
  v_clientes uuid[];
  r record;
begin
  perform pg_advisory_xact_lock(hashtext('arquivos_apagar'));
  if v_erro is not null then
    update arquivos_apagar set tentativas = tentativas + 1, ultimo_erro = v_erro
     where id = any (coalesce(p_ids, '{}')) and concluido_em is null;
    return 0;
  end if;

  with feitos as (
    update arquivos_apagar set tentativas = tentativas + 1, ultimo_erro = null, concluido_em = app_now()
     where id = any (coalesce(p_ids, '{}')) and concluido_em is null
       and (conferir_ate is null or conferir_ate <= app_now())
    returning cliente_id)
  select count(*), coalesce(array_agg(distinct cliente_id), '{}') into v_n, v_clientes from feitos;

  perform limpar_contexto();
  perform set_config('t3jus.aplicando_prazos', 'on', true);
  for r in select distinct a.escritorio, a.cliente_id from arquivos_apagar a
            where a.cliente_id = any (v_clientes)
              and not exists (select 1 from arquivos_apagar x where x.cliente_id = a.cliente_id and x.concluido_em is null)
            order by a.escritorio, a.cliente_id loop
    perform historico_do_cliente(r.escritorio, r.cliente_id, 'cliente.arquivos_apagados',
      (select jsonb_build_object(
                'documentos', count(*) filter (where a.caminho !~ '/propostas/'),
                'propostas', count(distinct split_part(split_part(a.caminho, '/', 3), '-v', 1)) filter (where a.caminho ~ '/propostas/'))
         from arquivos_apagar a where a.cliente_id = r.cliente_id));
  end loop;
  perform set_config('t3jus.aplicando_prazos', 'off', true);
  return v_n;
end $$;

-- ---------------------------------------------------------------------------------------
-- 5. As leituras.

-- Abrir: corpo da 0853; o documento apagado e o de cliente excluído respondem como id que não existe.
create or replace function portal_cliente_documento_abrir(p_pessoa uuid, p_escritorio uuid, p_documento uuid) returns text
language plpgsql
security definer
set search_path = public
as $$
declare d cliente_documentos;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.ver');
  select * into d from cliente_documentos x
   where x.id = p_documento and x.escritorio_id = p_escritorio and x.situacao = 'PRONTO' and x.apagado_em is null
     and exists (select 1 from clientes_escritorio c where c.id = x.cliente_id and c.estado <> 'EXCLUIDO');
  if d.id is null then raise exception 'Documento não encontrado' using errcode = 'TC404'; end if;
  perform registrar_historico('cliente.documento_aberto', 'cliente', d.cliente_id::text, jsonb_build_object('documento', d.id));
  return d.nome;
end $$;

-- Antes de concluir o envio: corpo da 0853; o envio atrasado de um documento apagado recebe 404.
create or replace function portal_cliente_documento_para_concluir(p_pessoa uuid, p_escritorio uuid, p_documento uuid)
returns table (tipo text, tamanho integer)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.editar');
  return query select d.arquivo_tipo, d.tamanho from cliente_documentos d
                where d.id = p_documento and d.escritorio_id = p_escritorio and d.enviado_por = p_pessoa
                  and d.apagado_em is null;
  if not found then
    raise exception 'Documento não encontrado' using errcode = 'TC404';
  end if;
end $$;

-- Corpo da 0930 (com o filtro do termo), sem o apagado. Também sem o termo de tutela (F3.140, 0960):
-- a 0960 vem antes pelo nome e recria esta função; a lista literal vale com ou sem a 0960 aplicada.
create or replace function cliente_documentos_em_uso(p_escritorio uuid, p_cliente uuid) returns setof cliente_documentos
language sql stable
set search_path = public
as $$
  select * from cliente_documentos
   where escritorio_id = p_escritorio and cliente_id = p_cliente and situacao = 'PRONTO' and substituido_por is null
     and tipo not in ('TERMO_CURATELA', 'TERMO_TUTELA') and apagado_em is null
$$;

-- Corpo da 0930, sem o apagado.
create or replace function cliente_termo_em_uso(p_escritorio uuid, p_cliente uuid) returns cliente_documentos
language sql stable
set search_path = public
as $$
  select * from cliente_documentos
   where escritorio_id = p_escritorio and cliente_id = p_cliente and tipo = 'TERMO_CURATELA'
     and situacao = 'PRONTO' and substituido_por is null and apagado_em is null
   order by concluido_em desc, id desc
   limit 1
$$;

-- ---------------------------------------------------------------------------------------
-- 6. Os clientes excluídos antes desta migration (a 0971 chama; revisão, I3).
-- Põe na fila os arquivos de todo cliente já EXCLUIDO e devolve a contagem por escritório. Liga as
-- marcas fim_da_guarda (para ver as linhas sob o RLS forçado) e aplicando_prazos (trava do contrato
-- só de consulta e o histórico sem contexto) só durante a chamada, como a 0610. Idempotente.
create function arquivos_apagar_preencher_excluidos() returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_guarda text := coalesce(current_setting('t3jus.fim_da_guarda', true), '');
  v_prazos text := coalesce(current_setting('t3jus.aplicando_prazos', true), '');
  r record;
  v jsonb;
  v_esc jsonb := '{}'::jsonb;
  v_um jsonb;
begin
  perform limpar_contexto();
  perform set_config('t3jus.fim_da_guarda', 'on', true);
  perform set_config('t3jus.aplicando_prazos', 'on', true);
  for r in select c.id, c.escritorio_id from clientes_escritorio c where c.estado = 'EXCLUIDO' order by c.escritorio_id, c.id loop
    v := cliente_arquivos_apagar(r.id);
    if (v ->> 'documentos')::integer + (v ->> 'propostas')::integer > 0 then
      perform historico_do_cliente(r.escritorio_id, r.id, 'cliente.arquivos_na_fila', v || jsonb_build_object('antes', true));
      v_um := coalesce(v_esc -> r.escritorio_id::text, '{"clientes": 0, "documentos": 0, "propostas": 0}'::jsonb);
      v_esc := v_esc || jsonb_build_object(r.escritorio_id::text, jsonb_build_object(
        'clientes', (v_um ->> 'clientes')::integer + 1,
        'documentos', (v_um ->> 'documentos')::integer + (v ->> 'documentos')::integer,
        'propostas', (v_um ->> 'propostas')::integer + (v ->> 'propostas')::integer));
    end if;
  end loop;
  perform set_config('t3jus.fim_da_guarda', v_guarda, true);
  perform set_config('t3jus.aplicando_prazos', v_prazos, true);
  return v_esc;
end $$;

-- ---------------------------------------------------------------------------------------
-- 7. Inventário (PT-11): muda só o destino no pedido do titular (LGPD, art. 18, VI). Textos
-- aprovados como na 0170 e na 0930, com o ok da Carol antes do merge.
update inventario_dados
   set no_fim = 'Exportados ao escritório e apagados com ele, com o arquivo. A pedido do titular, o arquivo sai do Storage e ficam só o tipo, o tamanho e as datas, sem o nome (PT-11)'
 where tabela = 'cliente_documentos';
update inventario_dados
   set no_fim = 'Exportadas ao escritório e apagadas com ele. A pedido do titular, saem o que está incluído e os .docx gerados'
 where tabela = 'propostas';

call fechar_acesso();
