-- 0540 · Regras de servidor que faltavam (Carol, 21/11/2026, item 5 do pedido):
-- 1. F1.10 (EX-10, PA-01): ao retirar alguém da equipe, a petição que esperava a revisão da
--    pessoa passa para quem ficou com o trabalho dela. O resto (agenda, propostas, retornos,
--    contratos, cobranças, casos, prazos, tarefas, conversas e repasses) já passava desde as
--    migrations 0180 a 0400; a recusa por área (entrar_area) já valia em todas as rotas de
--    área. O teste 046 confere as duas coisas em todas as funções do Portal.
-- 2. F0.15 (PT-11): no fim da guarda de 5 anos depois do fim do contrato, a rotina da noite
--    apaga tudo o que o T3jus guardou do escritório e dos clientes dele, inclusive o histórico,
--    e deixa só o nome do escritório com a data em que a guarda terminou. Os arquivos do
--    Storage saem pela api-console (o banco não apaga arquivo): a rotina põe as pastas do
--    escritório numa fila e chama a rota, que apaga e devolve o que fez.
-- 3. F1.12 (PT-23): a data da última troca de senha fica na pessoa (o histórico de entradas
--    some em 6 meses) e aparece na ficha de acesso do Suporte. O e-mail de aviso quando o
--    suporte tira o autenticador sai pela api-console, pelo Resend.

-- =======================================================================================
-- 1. Petição em revisão de quem saiu da equipe (F1.10)

-- Quem recebe: a pessoa escolhida, se ela pode revisar (OAB e área Jurídico) e não foi quem
-- gerou; senão, o sócio dono, que sempre pode.
create function peticoes_passar_de_quem_saiu() returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_de uuid := (new.dados ->> 'pessoa_id')::uuid;
  v_para uuid := (new.dados ->> 'passou_para')::uuid;
  v_novo uuid;
  v_ver uuid;
  x peticoes;
begin
  if v_de is null or v_para is null then return new; end if;
  for x in select * from peticoes where escritorio_id = new.escritorio_id and situacao = 'REVISAO' and revisor_id = v_de loop
    v_novo := case when x.gerado_por <> v_para and peticao_revisor_valido(v_para, x.escritorio_id) then v_para
                   else peticao_socio_dono(x.escritorio_id) end;
    select id into v_ver from peticao_versoes where peticao_id = x.id and numero = x.versao_atual;
    update peticoes set revisor_id = v_novo where id = x.id;
    insert into peticao_eventos (escritorio_id, peticao_id, versao_id, tipo, por, para, texto)
    values (x.escritorio_id, x.id, v_ver, 'PASSADA', coalesce(new.autor_id, v_novo), v_novo,
            'Revisão passada a quem ficou com o trabalho de quem saiu da equipe.');
    perform aviso_sino(x.escritorio_id, v_novo, new.autor_id, 'PETICAO_REVISAR', 'peticoes', x.id,
      jsonb_build_object('quem', (select nome from pessoas where id = x.gerado_por), 'modelo', x.modelo_nome,
                         'caso', (select nome from casos where id = x.caso_id), 'versao', x.versao_atual,
                         'motivo', 'Quem ia revisar saiu da equipe'));
    perform registrar_historico('juridico.peticao_revisao_passada', 'casos', x.caso_id::text,
      jsonb_build_object('peticao', x.id, 'para', v_novo, 'saiu', v_de));
  end loop;
  return new;
end $$;

create trigger peticoes_passar_de_quem_saiu after insert on historico
  for each row when (new.acao = 'equipe.retirada') execute function peticoes_passar_de_quem_saiu();

-- =======================================================================================
-- 2. Fim da guarda de 5 anos (F0.15)

alter table escritorios add column guarda_terminada_em timestamptz;

-- Leitura e saída de tudo do escritório só com a marca ligada, dentro de terminar_guarda.
-- Toda tabela de escritório ganha a política; as que vierem depois ganham em
-- proteger_tabela_escritorio.
do $$
declare r record;
begin
  for r in select c.oid::regclass t from pg_class c join pg_namespace n on n.oid = c.relnamespace
             join pg_attribute a on a.attrelid = c.oid and a.attname = 'escritorio_id' and not a.attisdropped
            where n.nspname = 'public' and c.relkind = 'r' loop
    execute format('create policy fim_da_guarda on %s using (current_setting(''t3jus.fim_da_guarda'', true) = ''on'') '
                   'with check (current_setting(''t3jus.fim_da_guarda'', true) = ''on'')', r.t);
  end loop;
end $$;
create policy fim_da_guarda on pessoas using (current_setting('t3jus.fim_da_guarda', true) = 'on')
  with check (current_setting('t3jus.fim_da_guarda', true) = 'on');
create policy fim_da_guarda on escritorios using (current_setting('t3jus.fim_da_guarda', true) = 'on')
  with check (current_setting('t3jus.fim_da_guarda', true) = 'on');

create or replace procedure proteger_tabela_escritorio(p_tabela regclass)
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from pg_attribute
     where attrelid = p_tabela and attname = 'escritorio_id' and atttypid = 'uuid'::regtype
       and attnotnull and not attisdropped
  ) then
    raise exception 'A tabela % precisa de escritorio_id uuid not null', p_tabela;
  end if;
  if not exists (
    select 1 from pg_constraint c
     where c.conrelid = p_tabela and c.contype = 'f' and c.confrelid = 'public.escritorios'::regclass
       and c.conkey = array[(select attnum from pg_attribute where attrelid = p_tabela and attname = 'escritorio_id')]
  ) then
    raise exception 'O escritorio_id de % precisa referenciar escritorios', p_tabela;
  end if;

  execute format('alter table %s enable row level security', p_tabela);
  execute format('alter table %s force row level security', p_tabela);
  if not exists (select 1 from pg_policy where polrelid = p_tabela and polname = 'isolamento_escritorio') then
    execute format(
      'create policy isolamento_escritorio on %s using (escritorio_id = contexto_escritorio()) with check (escritorio_id = contexto_escritorio())',
      p_tabela);
  end if;
  -- F0.15: no fim da guarda, a rotina apaga tudo do escritório (só com a marca ligada).
  if not exists (select 1 from pg_policy where polrelid = p_tabela and polname = 'fim_da_guarda') then
    execute format('create policy fim_da_guarda on %s using (current_setting(''t3jus.fim_da_guarda'', true) = ''on'') '
                   'with check (current_setting(''t3jus.fim_da_guarda'', true) = ''on'')', p_tabela);
  end if;

  if exists (select 1 from pg_attribute where attrelid = p_tabela and attname = 'versao' and not attisdropped)
     and not exists (select 1 from pg_trigger where tgrelid = p_tabela and tgname = 'controle_versao') then
    execute format('create trigger controle_versao before update on %s for each row execute function controle_versao()', p_tabela);
  end if;
end $$;

-- Pastas do Storage que esperam a api-console apagar. O caminho de todo arquivo do escritório
-- começa com o id dele (CO-05, EX-05, EX-09), nos dois buckets.
create table guarda_arquivos (
  id           uuid primary key default gen_random_uuid(),
  escritorio   uuid not null references escritorios (id) on delete restrict,
  bucket       text not null check (bucket in ('documentos-console', 'documentos-portal')),
  pedido_em    timestamptz not null default app_now(),
  apagados     integer not null default 0,
  tentativas   integer not null default 0,
  ultimo_erro  text check (length(ultimo_erro) <= 300),
  concluido_em timestamptz,
  unique (escritorio, bucket)
);
call proteger_tabela_global('guarda_arquivos', 'Fila das pastas do Storage a apagar no fim da guarda; o resto do escritório já saiu');

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('guarda_arquivos', false, 'Quais pastas do Storage faltam apagar no fim da guarda e quantos arquivos já saíram',
  null, null, null, null, null, null, false);

insert into configuracoes (chave, valor, descricao) values
  ('rotina_arquivos_url', '"https://console.t3jus.pro/api/v1/rotina/arquivos-da-guarda"',
   'Rota da api-console que apaga as pastas do Storage no fim da guarda (vazio: a fila espera)');

-- Até quando a guarda vai (a mesma conta de datas_do_contrato e do reabrir).
create function guarda_ate(p_fim date) returns date
language sql stable set search_path = public
as $$ select (p_fim + make_interval(years => configuracao_int('prazo_guarda_anos')))::date $$;

-- Apaga tudo do escritório. As travas (só inserção, dinheiro que não se apaga, petição
-- decidida, só consulta depois do fim) ficam desligadas só nesta transação: o ALTER TABLE
-- também volta atrás se algo falhar, e as outras conexões esperam a trava da tabela.
create function terminar_guarda(p_escritorio uuid) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_tabelas regclass[];
  t regclass;
  v_sql text;
  v_contagem jsonb;
  v_pessoas uuid[];
  p uuid;
  v_pessoas_saiu integer := 0;
  v_antes text := current_setting('t3jus.aplicando_prazos', true);
  i integer := 0;
begin
  perform limpar_contexto();
  perform set_config('t3jus.fim_da_guarda', 'on', true);
  perform set_config('t3jus.aplicando_prazos', 'on', true);

  select array_agg(c.oid::regclass order by c.relname) into v_tabelas
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid and a.attname = 'escritorio_id' and not a.attisdropped
   where n.nspname = 'public' and c.relkind = 'r';

  -- Quem tinha vínculo: a pessoa sai também se a entrada já foi apagada e ela não aparece em
  -- mais nada (outro escritório ou a equipe T3jus).
  select coalesce(array_agg(distinct pessoa_id), '{}') into v_pessoas from vinculos where escritorio_id = p_escritorio;

  foreach t in array v_tabelas || 'escritorios'::regclass loop
    execute format('alter table %s disable trigger user', t);
  end loop;

  -- Um comando só: as chaves estrangeiras entre as tabelas se conferem no fim dele.
  v_sql := 'with ';
  foreach t in array v_tabelas loop
    i := i + 1;
    v_sql := v_sql || case when i > 1 then ', ' else '' end
          || format('d%s as (delete from %s where escritorio_id = $1 returning 1)', i, t);
  end loop;
  v_sql := v_sql || ' select jsonb_strip_nulls(''{}''::jsonb';
  i := 0;
  foreach t in array v_tabelas loop
    i := i + 1;
    v_sql := v_sql || format(' || jsonb_build_object(%L, (select nullif(count(*), 0) from d%s))', t::text, i);
  end loop;
  v_sql := v_sql || ')';
  execute v_sql into v_contagem using p_escritorio;

  -- Fica só o nome, com a data do fim do contrato e a de hoje.
  update escritorios set cidade = null, uf = null, endereco = null, cnpj = null, contatos = '[]'::jsonb,
                         guarda_terminada_em = app_now()
   where id = p_escritorio;

  foreach t in array v_tabelas || 'escritorios'::regclass loop
    execute format('alter table %s enable trigger user', t);
  end loop;

  foreach p in array v_pessoas loop
    begin
      delete from pessoas x where x.id = p and x.entrada_apagada_em is not null
         and not exists (select 1 from equipe_t3 e where e.pessoa_id = p)
         and not exists (select 1 from vinculos v where v.pessoa_id = p);
      if found then v_pessoas_saiu := v_pessoas_saiu + 1; end if;
    exception when foreign_key_violation then
      null; -- ainda é autora de algo em outro escritório: fica.
    end;
  end loop;

  insert into guarda_arquivos (escritorio, bucket)
  select p_escritorio, b from unnest(array['documentos-console', 'documentos-portal']) b
  on conflict (escritorio, bucket) do nothing;

  perform set_config('t3jus.fim_da_guarda', 'off', true);
  perform historico_do_escritorio(p_escritorio, true, 'dados.guarda_terminada',
    jsonb_build_object('apagados', v_contagem, 'pessoas', v_pessoas_saiu));
  perform set_config('t3jus.aplicando_prazos', coalesce(v_antes, ''), true);
  return jsonb_build_object('apagados', v_contagem, 'pessoas', v_pessoas_saiu);
end $$;

-- Chama a rota que apaga os arquivos, se a fila tem pasta e o banco tem o pg_net. A resposta
-- não importa: o que a rota faz volta pela fila (rotina_guarda_arquivos_registrar).
create function guarda_arquivos_chamar() returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_url text := nullif(btrim((select valor #>> '{}' from configuracoes where chave = 'rotina_arquivos_url')), '');
begin
  if v_url is null or not exists (select 1 from guarda_arquivos where concluido_em is null)
     or not exists (select 1 from pg_extension where extname = 'pg_net') then
    return false;
  end if;
  execute 'select net.http_post(url := $1, body := ''{}''::jsonb, timeout_milliseconds := 30000)' using v_url;
  return true;
end $$;

-- A rota pede as pastas que faltam (as que falharam menos vão primeiro)…
create function rotina_guarda_arquivos_pendentes(p_limite integer default 10) returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', g.id, 'escritorioId', g.escritorio, 'bucket', g.bucket)
                            order by g.tentativas, g.pedido_em), '[]'::jsonb)
    from (select * from guarda_arquivos where concluido_em is null
           order by tentativas, pedido_em limit least(greatest(coalesce(p_limite, 10), 1), 50)) g
$$;

-- … e conta o que fez: quantos saíram, se a pasta ficou vazia e o erro, se houve.
create function rotina_guarda_arquivos_registrar(p_id uuid, p_apagados integer, p_concluido boolean, p_erro text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare g guarda_arquivos;
begin
  update guarda_arquivos
     set apagados = apagados + greatest(coalesce(p_apagados, 0), 0),
         tentativas = tentativas + 1,
         ultimo_erro = left(nullif(btrim(p_erro), ''), 300),
         concluido_em = case when coalesce(p_concluido, false) and p_erro is null then app_now() end
   where id = p_id and concluido_em is null
  returning * into g;
  if g.id is not null and g.concluido_em is not null then
    perform limpar_contexto();
    perform set_config('t3jus.aplicando_prazos', 'on', true);
    perform historico_do_escritorio(g.escritorio, true, 'dados.guarda_arquivos_apagados',
      jsonb_build_object('bucket', g.bucket, 'arquivos', g.apagados));
    perform set_config('t3jus.aplicando_prazos', 'off', true);
  end if;
end $$;

-- A rotina da noite: o que já fazia (0210) e, no fim da guarda, apaga o escritório.
create or replace function aplicar_prazos() returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n         integer;
  v_apagados  jsonb := '{}'::jsonb;
  v_aguardam  text[] := '{}';
  v_sem       text[];
  v_resultado jsonb;
  v_contratos jsonb := '{}'::jsonb;
  r           record;
  v_encerrados integer := 0;
  v_fechados  integer := 0;
  v_entradas  integer := 0;
  v_guardas   integer := 0;
  v_ids       uuid[];
  v_id        uuid;
begin
  perform limpar_contexto();
  perform set_config('t3jus.aplicando_prazos', 'on', true);

  if prazo_aprovado('sessoes_escritorio') then
    delete from sessoes_escritorio
     where escolhido_em < app_now() - make_interval(days => configuracao_int('prazo_sessoes_dias'));
    get diagnostics v_n = row_count;
    v_apagados := v_apagados || jsonb_build_object('sessoes_escritorio', v_n);
  else
    v_aguardam := v_aguardam || 'sessoes_escritorio'::text;
  end if;

  if prazo_aprovado('limites_uso') then
    delete from limites_uso
     where inicio_janela < app_now() - make_interval(hours => configuracao_int('prazo_limites_horas'));
    get diagnostics v_n = row_count;
    v_apagados := v_apagados || jsonb_build_object('limites_uso', v_n);
  else
    v_aguardam := v_aguardam || 'limites_uso'::text;
  end if;

  if prazo_aprovado('historico') then
    delete from historico
     where acao like 'acesso.%'
       and ocorrido_em < app_now() - make_interval(months => configuracao_int('prazo_acessos_meses'));
    get diagnostics v_n = row_count;
    v_apagados := v_apagados || jsonb_build_object('historico', v_n);
  else
    v_aguardam := v_aguardam || 'historico'::text;
  end if;

  -- Contrato que chegou ao fim marcado: vira Encerrado (decisão 1 do F0.14).
  for r in select e.id from escritorios e join clientes cl on cl.escritorio_id = e.id
            where e.contrato_fim_em <= hoje_brasilia() and cl.estado <> 'ENCERRADO' and cl.fim_motivo is not null
            order by e.id loop
    perform encerrar_no_dia(r.id, true);
    v_encerrados := v_encerrados + 1;
  end loop;

  -- Fim dos 30 dias: o acesso fecha e as sessões no escritório saem.
  for r in select e.id from escritorios e
            where e.contrato_fim_em is not null and e.acesso_fechado_em is null
              and situacao_do_contrato(e.contrato_fim_em) = 'FECHADO'
            order by e.id loop
    update escritorios set acesso_fechado_em = app_now() where id = r.id;
    delete from sessoes_escritorio where escritorio_id = r.id;
    get diagnostics v_n = row_count;
    perform historico_do_escritorio(r.id, false, 'contrato.acesso_fechado', jsonb_build_object('sessoes', v_n));
    v_fechados := v_fechados + 1;
  end loop;

  -- 90 dias sem nenhum acesso: a entrada sai do Auth e a pessoa fica como autora.
  if prazo_aprovado('pessoas') then
    for r in select p.id from pessoas p
              where p.entrada_apagada_em is null
                and pessoa_sem_acesso_desde(p.id) <= app_now() - make_interval(days => configuracao_int('prazo_entrada_dias'))
              order by p.id loop
      delete from auth.users where id = r.id;
      delete from sessoes_escritorio where pessoa_id = r.id;
      update pessoas set entrada_apagada_em = app_now() where id = r.id;
      perform inserir_historico(true, 'pessoa.entrada_apagada', 'pessoa', r.id::text, '{}'::jsonb);
      v_entradas := v_entradas + 1;
    end loop;
  else
    v_aguardam := v_aguardam || 'pessoas'::text;
  end if;

  -- F0.15: 5 anos depois do fim do contrato, o escritório sai e fica só o nome. Vem depois da
  -- saída das entradas, para quem só tinha este escritório sair junto.
  -- A lista vem antes: terminar_guarda muda as tabelas, e um cursor aberto nelas impede.
  select coalesce(array_agg(e.id order by e.id), '{}') into v_ids from escritorios e
   where e.contrato_fim_em is not null and e.guarda_terminada_em is null
     and hoje_brasilia() >= guarda_ate(e.contrato_fim_em);
  foreach v_id in array v_ids loop
    perform terminar_guarda(v_id);
    v_guardas := v_guardas + 1;
  end loop;

  perform set_config('t3jus.aplicando_prazos', 'off', true);

  v_contratos := jsonb_build_object('encerrados', v_encerrados, 'acessos_fechados', v_fechados,
                                    'entradas_apagadas', v_entradas, 'guardas_terminadas', v_guardas);

  -- Dado pessoal cujo prazo a rotina ainda não aplica: hoje, só o da equipe T3jus (5 anos
  -- depois de sair). Tudo o que é do escritório sai no fim da guarda.
  select coalesce(array_agg(d.tabela order by d.tabela), '{}') into v_sem
    from inventario_dados d
   where d.dado_pessoal and d.tabela not in ('sessoes_escritorio', 'limites_uso', 'pessoas', 'historico', 'escritorios')
     and not exists (select 1 from pg_attribute a
                      where a.attrelid = to_regclass('public.' || d.tabela) and a.attname = 'escritorio_id' and not a.attisdropped);

  v_resultado := jsonb_build_object(
    'apagados', v_apagados,
    'contratos', v_contratos,
    'aguardando_aprovacao', to_jsonb(v_aguardam),
    'sem_gatilho', to_jsonb(v_sem),
    'arquivos_chamados', guarda_arquivos_chamar());
  perform registrar_historico('dados.prazos_aplicados', 'inventario', null, v_resultado);
  return v_resultado;
end $$;

-- A fila dos arquivos também roda de hora em hora, até ficar vazia (cada chamada apaga um
-- pouco, para caber no tempo da rota).
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('t3jus-guarda-arquivos', '40 * * * *', 'select public.guarda_arquivos_chamar()');
  end if;
end $$;

-- =======================================================================================
-- 3. Última troca de senha (F1.12)

alter table pessoas add column senha_trocada_em timestamptz;

create or replace function registrar_acesso(p_pessoa uuid, p_acao text, p_dados jsonb default '{}'::jsonb) returns bigint
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_acao !~ '^acesso\.' then
    raise exception 'Evento de acesso começa com acesso.' using errcode = 'TC422';
  end if;
  perform limpar_contexto();
  if p_pessoa is not null then
    perform definir_pessoa(p_pessoa);
    -- O evento de entrada some em 6 meses; a data da troca fica na pessoa.
    if p_acao = 'acesso.senha_redefinida' then
      update pessoas set senha_trocada_em = app_now() where id = p_pessoa;
    end if;
  end if;
  return registrar_historico(p_acao, 'acesso', p_pessoa::text, p_dados);
end $$;

-- A ficha de acesso do Suporte (0210) com a última troca.
create or replace function console_suporte_pessoa(p_pessoa uuid, p_alvo uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_linhas jsonb := '[]'::jsonb;
  v_agir boolean := false;
  v jsonb;
  e uuid;
  v_troca timestamptz;
begin
  foreach e in array suporte_escritorios(p_pessoa, 'console.suporte.ver') loop
    perform entrar_escritorio(p_pessoa, e, 'console.suporte.ver');
    v_linhas := v_linhas || coalesce((
      select jsonb_agg(l) from jsonb_array_elements(suporte_pessoas_do_contexto()) l where (l ->> 'id')::uuid = p_alvo), '[]'::jsonb);
    if exists (select 1 from jsonb_array_elements(v_linhas) l
                where (l ->> 'id')::uuid = p_alvo and (l -> 'escritorio' ->> 'id')::uuid = e) then
      v_agir := v_agir or pode(p_pessoa, e, 'console.suporte.agir');
    end if;
  end loop;
  v := suporte_agrupar(v_linhas) -> 0;
  if v is null then
    raise exception 'Pessoa não encontrada' using errcode = 'TC404';
  end if;
  perform set_config('t3jus.lendo_acesso', 'on', true);
  select senha_trocada_em into v_troca from pessoas where id = p_alvo;
  perform set_config('t3jus.lendo_acesso', '', true);
  return v || jsonb_build_object(
    'podeAgir', v_agir,
    'saida', saida_da_pessoa(p_alvo),
    'senhaTrocadaEm', v_troca,
    'aparelhos', (select count(*) from auth.sessions s where s.user_id = p_alvo and (s.not_after is null or s.not_after > now())));
end $$;

call fechar_acesso();
