-- 0180 · Fim do contrato do escritório e saída da pessoa (F0.14, PT-11). Tela aprovada em
-- docs/design/aprovadas/console-fim-contrato, com as decisões da Carol de 19/11/2026:
-- 1. Ao encerrar, o Portal fica 30 dias só para consulta, com a exportação liberada. Depois,
--    o acesso fecha.
-- 2. Os dados do escritório (inclusive os clientes dele) ficam guardados 5 anos depois do fim
--    do contrato. Apagar no fim da guarda é a F0.15 do painel.
-- 3. Reabrir pode, com motivo, enquanto os dados existem (até o fim da guarda).
-- 4. Só a Administração encerra e reabre.
-- 5. A entrada (e-mail e senha no Supabase Auth) de quem fica 90 dias sem nenhum acesso é
--    apagada pela rotina da noite; o nome fica como autor no histórico.
--
-- As datas saem de escritorios.contrato_fim_em, e o bloqueio confere a data, não a rotina:
-- se a rotina atrasar, o Portal fecha do mesmo jeito.

-- ---------------------------------------------------------------------------------------
-- Apagar a entrada: o domínio apaga a linha em auth.users (o Auth leva junto sessões,
-- identidades e autenticadores). A pessoa continua em pessoas, como autora.
do $$
begin
  grant delete on auth.users to dominio;
exception when insufficient_privilege then
  raise exception 'Quem roda as migrations precisa poder liberar a exclusão em auth.users ao papel dominio';
end
$$;

alter table pessoas drop constraint pessoas_id_fkey;
alter table pessoas add column entrada_apagada_em timestamptz;

-- ---------------------------------------------------------------------------------------
-- Datas do fim. A data do fim e o fechamento ficam no escritório, que o Portal lê; o motivo,
-- quem registrou e o estágio de antes ficam na carteira interna (o escritório não vê).
alter table escritorios
  add column contrato_fim_em   date,
  add column acesso_fechado_em timestamptz,
  add constraint escritorios_fechado_tem_fim check (acesso_fechado_em is null or contrato_fim_em is not null);

alter table clientes
  add column fim_motivo        text check (length(btrim(fim_motivo)) between 1 and 300),
  add column fim_por           uuid references pessoas (id) on delete restrict,
  add column fim_registrado_em timestamptz,
  add column estagio_antes     text check (estagio_antes in ('IMPLANTACAO', 'ATIVO')),
  add constraint clientes_fim_completo check (
    (fim_motivo is null) = (fim_por is null) and (fim_motivo is null) = (fim_registrado_em is null)
    and (fim_motivo is null) = (estagio_antes is null)),
  add constraint clientes_encerrado_tem_fim check (estado <> 'ENCERRADO' or fim_motivo is not null);

insert into transicoes_permitidas (tabela, de, para) values
  ('clientes', 'IMPLANTACAO', 'ENCERRADO'),
  ('clientes', 'ATIVO', 'ENCERRADO'),
  ('clientes', 'ENCERRADO', 'ATIVO'),
  ('clientes', 'ENCERRADO', 'IMPLANTACAO');

insert into funcao_acoes (funcao, acao) values ('ADMINISTRACAO', 'console.contrato.encerrar');

insert into configuracoes (chave, valor, descricao) values
  ('prazo_consulta_dias', '30', 'Dias de Portal só para consulta depois do fim do contrato, para baixar os dados'),
  ('prazo_entrada_dias',  '90', 'Dias sem nenhum acesso até a entrada (e-mail e senha) ser apagada (inventário: pessoas)'),
  ('prazo_guarda_anos',   '5',  'Anos de guarda dos dados do escritório depois do fim do contrato');

-- Decisão 2: os dados dos clientes do escritório (clientes, atendimentos, pedidos de exclusão,
-- agenda, comercial...) seguem a guarda de 5 anos e saem todos juntos no fim dela.
update inventario_dados
   set prazo = 'Enquanto o escritório for cliente do T3jus e 5 anos depois do fim do contrato'
 where prazo = 'Enquanto o escritório for cliente do T3jus';

-- ---------------------------------------------------------------------------------------
-- Leituras que atravessam escritórios. Com o RLS forçado, nem o dono das tabelas lê fora do
-- contexto; estas políticas abrem só a leitura, só para o dono e só enquanto a marca está
-- ligada dentro das funções abaixo (que a desligam ao sair).
create policy lendo_acesso on vinculos for select to dominio
  using (current_setting('t3jus.lendo_acesso', true) = 'on');
create policy lendo_acesso on escritorios for select to dominio
  using (current_setting('t3jus.lendo_acesso', true) = 'on');
create policy lendo_acesso on equipe_t3 for select to dominio
  using (current_setting('t3jus.lendo_acesso', true) = 'on');
create policy lendo_acesso on pessoas for select to dominio
  using (current_setting('t3jus.lendo_acesso', true) = 'on');

-- A rotina da noite lê e muda o que o fim do contrato e a saída da pessoa pedem.
create policy rotina_prazos_ler on escritorios for select to dominio
  using (current_setting('t3jus.aplicando_prazos', true) = 'on');
create policy rotina_prazos_mudar on escritorios for update to dominio
  using (current_setting('t3jus.aplicando_prazos', true) = 'on') with check (true);
create policy rotina_prazos_ler on clientes for select to dominio
  using (current_setting('t3jus.aplicando_prazos', true) = 'on');
create policy rotina_prazos_mudar on clientes for update to dominio
  using (current_setting('t3jus.aplicando_prazos', true) = 'on') with check (true);
create policy rotina_prazos_ler on vinculos for select to dominio
  using (current_setting('t3jus.aplicando_prazos', true) = 'on');
create policy rotina_prazos_mudar on vinculos for update to dominio
  using (current_setting('t3jus.aplicando_prazos', true) = 'on') with check (true);
create policy rotina_prazos_ler on pessoas for select to dominio
  using (current_setting('t3jus.aplicando_prazos', true) = 'on');
create policy rotina_prazos_mudar on pessoas for update to dominio
  using (current_setting('t3jus.aplicando_prazos', true) = 'on') with check (true);
create policy rotina_prazos_ler on equipe_t3 for select to dominio
  using (current_setting('t3jus.aplicando_prazos', true) = 'on');
create policy rotina_prazos_inserir on historico for insert to dominio
  with check (current_setting('t3jus.aplicando_prazos', true) = 'on');

-- ---------------------------------------------------------------------------------------
-- Datas e situação do contrato.

create function prazo_consulta_dias() returns integer
language sql stable set search_path = public
as $$ select configuracao_int('prazo_consulta_dias') $$;

-- ABERTO (sem fim marcado), MARCADO (fim no futuro), CONSULTA (os 30 dias) ou FECHADO.
create function situacao_do_contrato(p_fim date) returns text
language sql stable set search_path = public
as $$
  select case
    when p_fim is null then 'ABERTO'
    when p_fim > hoje_brasilia() then 'MARCADO'
    when hoje_brasilia() < p_fim + prazo_consulta_dias() then 'CONSULTA'
    else 'FECHADO' end
$$;

create function contrato_situacao(p_escritorio uuid) returns text
language plpgsql
set search_path = public
as $$
declare v_fim date; v_antes text := current_setting('t3jus.lendo_acesso', true);
begin
  perform set_config('t3jus.lendo_acesso', 'on', true);
  select contrato_fim_em into v_fim from escritorios where id = p_escritorio;
  perform set_config('t3jus.lendo_acesso', coalesce(v_antes, ''), true);
  return situacao_do_contrato(v_fim);
end $$;

-- Meia-noite de Brasília de uma data, para comparar com os instantes.
create function inicio_do_dia(p_dia date) returns timestamptz
language sql immutable
as $$ select (p_dia::timestamp at time zone 'America/Sao_Paulo') $$;

-- As datas que as telas mostram, calculadas da data do fim.
create function datas_do_contrato(p_fim date, p_fechado timestamptz) returns jsonb
language sql stable set search_path = public
as $$
  select case when p_fim is null then null else jsonb_build_object(
    'fimEm', p_fim,
    'situacao', situacao_do_contrato(p_fim),
    'consultaAte', p_fim + prazo_consulta_dias() - 1,
    'acessoFechaEm', p_fim + prazo_consulta_dias(),
    'acessoFechadoEm', p_fechado,
    'entradasAte', p_fim + prazo_consulta_dias() + configuracao_int('prazo_entrada_dias'),
    'guardaAte', (p_fim + make_interval(years => configuracao_int('prazo_guarda_anos')))::date) end
$$;

-- ---------------------------------------------------------------------------------------
-- Saída da pessoa: desde quando ela não tem nenhum acesso (null se tem). Tem acesso quem tem
-- vínculo de Portal ativo num escritório que não fechou, ou está ativo na equipe T3jus.
create function pessoa_sem_acesso_desde(p_pessoa uuid) returns timestamptz
language plpgsql
set search_path = public
as $$
declare
  v_antes text := current_setting('t3jus.lendo_acesso', true);
  v timestamptz;
begin
  perform set_config('t3jus.lendo_acesso', 'on', true);
  if exists (select 1 from vinculos x join funcoes f on f.codigo = x.funcao and f.sistema = 'PORTAL'
               join escritorios e on e.id = x.escritorio_id
              where x.pessoa_id = p_pessoa and x.revogado_em is null
                and situacao_do_contrato(e.contrato_fim_em) <> 'FECHADO')
     or exists (select 1 from equipe_t3 t where t.pessoa_id = p_pessoa and t.ativa) then
    v := null;
  else
    select greatest(
             (select p.criado_em from pessoas p where p.id = p_pessoa),
             (select max(x.revogado_em) from vinculos x join funcoes f on f.codigo = x.funcao and f.sistema = 'PORTAL'
               where x.pessoa_id = p_pessoa),
             (select max(inicio_do_dia(e.contrato_fim_em + prazo_consulta_dias()))
                from vinculos x join funcoes f on f.codigo = x.funcao and f.sistema = 'PORTAL'
                join escritorios e on e.id = x.escritorio_id
               where x.pessoa_id = p_pessoa and x.revogado_em is null),
             (select t.desativada_em from equipe_t3 t where t.pessoa_id = p_pessoa))
      into v;
  end if;
  perform set_config('t3jus.lendo_acesso', coalesce(v_antes, ''), true);
  return v;
end $$;

-- O que as listas mostram da saída: desde quando, em que dia a entrada some e se já sumiu.
create function saida_da_pessoa(p_pessoa uuid) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_desde timestamptz;
  v_apagada timestamptz;
  v_antes text := current_setting('t3jus.lendo_acesso', true);
begin
  perform set_config('t3jus.lendo_acesso', 'on', true);
  select entrada_apagada_em into v_apagada from pessoas where id = p_pessoa;
  perform set_config('t3jus.lendo_acesso', coalesce(v_antes, ''), true);
  if v_apagada is not null then
    return jsonb_build_object('entradaApagadaEm', v_apagada);
  end if;
  v_desde := pessoa_sem_acesso_desde(p_pessoa);
  if v_desde is null then return null; end if;
  return jsonb_build_object(
    'semAcessoDesde', v_desde,
    'entradaApagaEm', ((v_desde at time zone 'America/Sao_Paulo')::date + configuracao_int('prazo_entrada_dias')));
end $$;

-- ---------------------------------------------------------------------------------------
-- O Portal fecha no fim dos 30 dias: nenhuma ação, nem de leitura (PT-11). O Console continua.
create or replace function pode(p_pessoa uuid, p_escritorio uuid, p_acao text) returns boolean
language sql
set search_path = public
as $$
  select exists (
    select 1 from vinculos v
      join funcao_acoes fa on fa.funcao = v.funcao
      join funcoes f on f.codigo = v.funcao
     where v.pessoa_id = p_pessoa and v.escritorio_id = p_escritorio
       and v.revogado_em is null and fa.acao = p_acao
       and ((f.sistema = 'PORTAL' and contrato_situacao(p_escritorio) <> 'FECHADO')
            or (f.sistema = 'CONSOLE' and p_pessoa = contexto_pessoa() and v.funcao = any (contexto_equipe_funcoes()))))
$$;

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
                    and v.revogado_em is null and f.sistema = 'PORTAL')
     and contrato_situacao(s.escritorio_id) <> 'FECHADO';
  return v_escritorio;
end $$;

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
  ) or contrato_situacao(p_escritorio) = 'FECHADO' then
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

create or replace function meus_escritorios(p_pessoa uuid, p_sistema text default 'PORTAL')
returns table (escritorio_id uuid, nome text, funcoes text[])
language plpgsql
security definer
set search_path = public
as $$
begin
  perform definir_pessoa(p_pessoa);
  return query
    select c.id, c.nome, array_agg(v.funcao order by v.funcao)
      from vinculos v
      join escritorios c on c.id = v.escritorio_id
      join funcoes f on f.codigo = v.funcao
     where v.pessoa_id = p_pessoa and v.revogado_em is null and f.sistema = p_sistema
       and (p_sistema <> 'PORTAL' or situacao_do_contrato(c.contrato_fim_em) <> 'FECHADO')
     group by c.id, c.nome
     order by c.nome;
end $$;

-- A escolha mostra também o escritório que fechou, no fim, sem entrar (tela aprovada).
drop function escritorios_para_escolher(uuid);
create function escritorios_para_escolher(p_pessoa uuid)
returns table (escritorio_id uuid, nome text, cidade text, uf text, ultima_entrada timestamptz, encerramento jsonb)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform definir_pessoa(p_pessoa);
  return query
    select e.id, e.nome, e.cidade, e.uf,
           (select max(s.escolhido_em) from sessoes_escritorio s where s.pessoa_id = p_pessoa and s.escritorio_id = e.id),
           case when situacao_do_contrato(e.contrato_fim_em) = 'FECHADO'
                then datas_do_contrato(e.contrato_fim_em, e.acesso_fechado_em) end
      from escritorios e
     where exists (select 1 from vinculos v join funcoes f on f.codigo = v.funcao
                    where v.pessoa_id = p_pessoa and v.escritorio_id = e.id and v.revogado_em is null and f.sistema = 'PORTAL')
     order by situacao_do_contrato(e.contrato_fim_em) = 'FECHADO', 5 desc nulls last, e.nome;
end $$;

-- ---------------------------------------------------------------------------------------
-- Os 30 dias só de consulta: nenhuma escrita nos dados do escritório, menos a do próprio
-- encerramento e a da rotina. A exportação só lê (e escreve no histórico, que fica de fora).
create function contrato_aceita_escrita() returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_linha jsonb := to_jsonb(coalesce(new, old));
  v_escritorio uuid := case when tg_table_name = 'escritorios' then (v_linha ->> 'id')::uuid
                            else (v_linha ->> 'escritorio_id')::uuid end;
begin
  if current_setting('t3jus.aplicando_prazos', true) = 'on' or current_setting('t3jus.mudando_contrato', true) = 'on' then
    return coalesce(new, old);
  end if;
  if tg_table_name = 'vinculos' and not exists (select 1 from funcoes f where f.codigo = v_linha ->> 'funcao' and f.sistema = 'PORTAL') then
    return coalesce(new, old);
  end if;
  if contrato_situacao(v_escritorio) in ('CONSULTA', 'FECHADO') then
    raise exception 'O contrato terminou: o Portal está só para consulta' using errcode = 'TC401',
      detail = jsonb_build_object('motivo', 'CONTRATO_ENCERRADO')::text;
  end if;
  return coalesce(new, old);
end $$;

-- O escritório, os vínculos do Portal e toda tabela que já passou por proteger_tabela_escritorio
-- (as que têm a política de isolamento: clientes, atendimentos, agenda, comercial...).
do $$
declare t regclass;
begin
  for t in
    select 'public.escritorios'::regclass union select 'public.vinculos'::regclass
    union select polrelid::regclass from pg_policy where polname = 'isolamento_escritorio'
  loop
    execute format('create trigger contrato_aceita_escrita before insert or update or delete on %s for each row execute function contrato_aceita_escrita()', t);
  end loop;
end
$$;

-- Toda tabela de escritório nova também fica só de consulta nos 30 dias.
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

  if exists (select 1 from pg_attribute where attrelid = p_tabela and attname = 'versao' and not attisdropped)
     and not exists (select 1 from pg_trigger where tgrelid = p_tabela and tgname = 'controle_versao') then
    execute format('create trigger controle_versao before update on %s for each row execute function controle_versao()', p_tabela);
  end if;

  if not exists (select 1 from pg_trigger where tgrelid = p_tabela and tgname = 'contrato_aceita_escrita') then
    execute format('create trigger contrato_aceita_escrita before insert or update or delete on %s for each row execute function contrato_aceita_escrita()', p_tabela);
  end if;
end $$;

-- A API confere antes de criar a conta de um convite no Auth.
create function portal_exigir_escrita(p_pessoa uuid, p_escritorio uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.ver');
  if contrato_situacao(p_escritorio) <> 'ABERTO' and contrato_situacao(p_escritorio) <> 'MARCADO' then
    raise exception 'O contrato terminou: o Portal está só para consulta' using errcode = 'TC401',
      detail = jsonb_build_object('motivo', 'CONTRATO_ENCERRADO')::text;
  end if;
end $$;

-- ---------------------------------------------------------------------------------------
-- Encerrar e reabrir (Console, só a Administração).

-- O encerramento como a ficha do Console mostra: as datas, o motivo e quem registrou.
create function encerramento_console(p_escritorio uuid) returns jsonb
language sql stable
set search_path = public
as $$
  select datas_do_contrato(e.contrato_fim_em, e.acesso_fechado_em) || jsonb_build_object(
           'motivo', cl.fim_motivo, 'registradoEm', cl.fim_registrado_em, 'estagioAntes', cl.estagio_antes,
           'por', jsonb_build_object('id', p.id, 'nome', p.nome),
           'exportadoEm', (select max(h.ocorrido_em) from historico h
                            where h.escritorio_id = e.id and h.acao = 'escritorio.exportado'
                              and h.ocorrido_em >= cl.fim_registrado_em))
    from escritorios e join clientes cl on cl.escritorio_id = e.id
    left join pessoas p on p.id = cl.fim_por
   where e.id = p_escritorio and e.contrato_fim_em is not null
$$;

-- Evento com o escritório dito (a rotina não troca o contexto; só as funções de entrada o
-- gravam). Quem fez vem do contexto: a pessoa, ou o sistema na rotina.
create function historico_do_escritorio(p_escritorio uuid, p_interno boolean, p_acao text, p_dados jsonb)
returns void
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
          v_pessoa, p_acao, 'escritorio', p_escritorio::text, coalesce(p_dados, '{}'::jsonb), p_interno);
end $$;

-- No dia do fim: o estágio vira Encerrado e os convites que ninguém aceitou são cancelados.
-- Roda com o contexto do escritório já definido (pela pessoa ou pela rotina).
create function encerrar_no_dia(p_escritorio uuid, p_sistema boolean) returns integer
language plpgsql
set search_path = public
as $$
declare
  cl clientes;
  v_cancelados integer;
begin
  select * into cl from clientes where escritorio_id = p_escritorio for update;
  perform definir_transicao('CONTRATO_ENCERRADO', cl.fim_motivo, p_sistema);
  perform set_config('t3jus.mudando_contrato', 'on', true);
  update clientes set estado = 'ENCERRADO' where id = cl.id;
  update vinculos v set revogado_em = app_now(), revogado_por = cl.fim_por
    from funcoes f, pessoas p
   where f.codigo = v.funcao and f.sistema = 'PORTAL' and p.id = v.pessoa_id
     and v.escritorio_id = p_escritorio and v.revogado_em is null and p.senha_criada_em is null;
  get diagnostics v_cancelados = row_count;
  perform set_config('t3jus.mudando_contrato', '', true);
  if v_cancelados > 0 then
    perform historico_do_escritorio(p_escritorio, false, 'contrato.convites_cancelados',
                                    jsonb_build_object('quantidade', v_cancelados));
  end if;
  return v_cancelados;
end $$;

create function console_encerrar_contrato(p_pessoa uuid, p_escritorio uuid, p_versao integer, p_dados jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cl clientes;
  v_nome text;
  v_fim date;
  v_campos text[] := '{}';
  v_versao integer;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'console.contrato.encerrar');
  select * into cl from clientes where escritorio_id = p_escritorio for update;
  select nome into v_nome from escritorios where id = p_escritorio;
  if cl.fim_motivo is not null then
    perform recusar_motivo('O contrato já tem o fim registrado', 'JA_ENCERRADO');
  end if;
  if jsonb_typeof(p_dados) is distinct from 'object' then perform recusar_campos('Dados inválidos', 'dados'); end if;
  begin
    v_fim := (p_dados ->> 'fimEm')::date;
  exception when others then
    v_fim := null;
  end;
  if v_fim is null or v_fim < hoje_brasilia() then v_campos := array_append(v_campos, 'fimEm'); end if;
  if length(btrim(coalesce(p_dados ->> 'motivo', ''))) not between 1 and 300 then v_campos := array_append(v_campos, 'motivo'); end if;
  if nome_para_conferir(p_dados ->> 'nomeConfirmado') <> nome_para_conferir(v_nome) then
    v_campos := array_append(v_campos, 'nomeConfirmado');
  end if;
  if cardinality(v_campos) > 0 then perform recusar_campos('Confira o encerramento', variadic v_campos); end if;
  if p_versao is null or cl.versao <> p_versao then perform conflito_versao('clientes', cl.id); end if;

  perform set_config('t3jus.mudando_contrato', 'on', true);
  update clientes set fim_motivo = btrim(p_dados ->> 'motivo'), fim_por = p_pessoa, fim_registrado_em = app_now(),
                      estagio_antes = cl.estado
   where id = cl.id;
  update escritorios set contrato_fim_em = v_fim where id = p_escritorio;
  perform set_config('t3jus.mudando_contrato', '', true);

  if v_fim = hoje_brasilia() then
    perform encerrar_no_dia(p_escritorio, false);
  else
    perform registrar_historico_interno('contrato.encerramento_marcado', 'escritorio', p_escritorio::text,
      jsonb_build_object('fim_em', v_fim, 'motivo', btrim(p_dados ->> 'motivo')));
  end if;
  select versao into v_versao from clientes where id = cl.id;
  return jsonb_build_object('versao', v_versao, 'encerramento', encerramento_console(p_escritorio));
end $$;

-- Reabrir (ou desmarcar o fim que ainda não chegou): volta ao estágio de antes e as datas
-- deixam de valer. Os convites cancelados continuam cancelados.
create function console_reabrir_contrato(p_pessoa uuid, p_escritorio uuid, p_versao integer, p_motivo text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cl clientes;
  v_fim date;
  v_versao integer;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'console.contrato.encerrar');
  select * into cl from clientes where escritorio_id = p_escritorio for update;
  select contrato_fim_em into v_fim from escritorios where id = p_escritorio;
  if v_fim is null then
    perform recusar_motivo('O contrato não tem fim registrado', 'NAO_ENCERRADO');
  end if;
  if hoje_brasilia() >= (v_fim + make_interval(years => configuracao_int('prazo_guarda_anos')))::date then
    perform recusar_motivo('A guarda dos dados terminou: o escritório volta como cliente novo', 'PRAZO_TERMINOU');
  end if;
  if length(btrim(coalesce(p_motivo, ''))) not between 1 and 300 then
    perform recusar_campos('Escreva o motivo', 'motivo');
  end if;
  if p_versao is null or cl.versao <> p_versao then perform conflito_versao('clientes', cl.id); end if;

  perform set_config('t3jus.mudando_contrato', 'on', true);
  if cl.estado = 'ENCERRADO' then
    perform definir_transicao('CONTRATO_REABERTO', btrim(p_motivo));
    update clientes set estado = cl.estagio_antes, fim_motivo = null, fim_por = null, fim_registrado_em = null,
                        estagio_antes = null
     where id = cl.id;
  else
    update clientes set fim_motivo = null, fim_por = null, fim_registrado_em = null, estagio_antes = null where id = cl.id;
    perform registrar_historico_interno('contrato.encerramento_desmarcado', 'escritorio', p_escritorio::text,
      jsonb_build_object('fim_em', v_fim, 'motivo', btrim(p_motivo)));
  end if;
  update escritorios set contrato_fim_em = null, acesso_fechado_em = null where id = p_escritorio;
  perform set_config('t3jus.mudando_contrato', '', true);
  select versao into v_versao from clientes where id = cl.id;
  return jsonb_build_object('versao', v_versao, 'estagio', (select estado from clientes where id = cl.id));
end $$;

-- ---------------------------------------------------------------------------------------
-- O que as telas leem.

create or replace function console_ficha(p_pessoa uuid, p_escritorio uuid) returns jsonb
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
    'encerramento', encerramento_console(c.id),
    'socios', socios_do_contexto(),
    'equipe', coalesce((
      select jsonb_agg(jsonb_build_object('vinculoId', v.id, 'pessoaId', p.id, 'nome', p.nome, 'funcao', v.funcao,
                                          'desde', v.criado_em, 'versao', v.versao) order by p.nome, v.funcao)
        from vinculos v join pessoas p on p.id = v.pessoa_id join funcoes f on f.codigo = v.funcao
       where v.escritorio_id = c.id and f.sistema = 'CONSOLE' and v.revogado_em is null), '[]'::jsonb),
    'situacoes', to_jsonb(situacoes_cliente(c.id)),
    -- Quem salvou a ficha por último e quando: o conflito de edição diz quem salvou antes (PT-19).
    'fichaAlteradaPor', (select p.nome from historico h left join pessoas p on p.id = h.autor_id
                          where h.escritorio_id = c.id and h.acao = 'ficha.alterada' order by h.id desc limit 1),
    'fichaAlteradaEm', (select h.ocorrido_em from historico h
                         where h.escritorio_id = c.id and h.acao = 'ficha.alterada' order by h.id desc limit 1),
    'ultimaAtividade', greatest(c.criado_em, (select max(h.ocorrido_em) from historico h where h.escritorio_id = c.id)),
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

-- Ficha encerrada é só de leitura no Console: a edição da ficha e do contrato recusa.
create function exigir_contrato_aberto_console(p_escritorio uuid) returns void
language plpgsql
set search_path = public
as $$
begin
  if contrato_situacao(p_escritorio) in ('CONSULTA', 'FECHADO') then
    perform recusar_motivo('O contrato terminou: a ficha está só para consulta', 'CONTRATO_ENCERRADO');
  end if;
end $$;

create function clientes_encerrado_so_leitura() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_setting('t3jus.aplicando_prazos', true) = 'on' or current_setting('t3jus.mudando_contrato', true) = 'on' then
    return new;
  end if;
  -- Encerrar e reabrir passam pelas próprias funções; nenhum outro caminho entra em
  -- Encerrado, sai dele ou muda a carteira de um contrato encerrado.
  if old.estado = 'ENCERRADO' or new.estado = 'ENCERRADO' then
    perform recusar_motivo('O contrato terminou: a ficha está só para consulta', 'CONTRATO_ENCERRADO');
  end if;
  return new;
end $$;
create trigger clientes_encerrado_so_leitura before update on clientes
  for each row execute function clientes_encerrado_so_leitura();

-- A carteira ganha as datas do encerramento (para o filtro Encerrados e o próximo passo).
drop function console_carteira(uuid);
create function console_carteira(p_pessoa uuid)
returns table (escritorio_id uuid, nome text, cidade text, uf text, estagio text,
               funcoes text[], situacoes text[], criado_em timestamptz,
               socios jsonb, equipe jsonb, ultima_atividade timestamptz, encerramento jsonb)
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
        select c.id, c.nome, c.cidade, c.uf, cl.estado, r.funcoes, situacoes_cliente(c.id), c.criado_em,
               socios_do_contexto(), equipe_do_contexto(),
               greatest(c.criado_em, (select max(h.ocorrido_em) from historico h where h.escritorio_id = c.id)),
               case when c.contrato_fim_em is null then null
                    else datas_do_contrato(c.contrato_fim_em, c.acesso_fechado_em) || jsonb_build_object(
                      'exportadoEm', (select max(h.ocorrido_em) from historico h
                                       where h.escritorio_id = c.id and h.acao = 'escritorio.exportado'
                                         and h.ocorrido_em >= cl.fim_registrado_em)) end
          from escritorios c join clientes cl on cl.escritorio_id = c.id
         where c.id = r.id;
    end if;
  end loop;
end $$;

-- O Portal recebe as datas (sem o motivo, que é da equipe T3jus) para o aviso e a tira.
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
                                                and h.ocorrido_em >= inicio_do_dia(e.contrato_fim_em))) end)
      from escritorios e where e.id = p_escritorio);
end $$;

-- Equipe do Portal: quem foi retirado e quando a entrada some (filtro "Retiradas").
create function portal_equipe_retiradas(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.equipe.gerenciar');
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
             'vinculoId', x.id, 'pessoaId', x.pessoa_id, 'nome', p.nome, 'retiradaEm', x.revogado_em,
             -- As áreas que a pessoa tinha quando saiu (as retiradas junto com ela).
             'areas', (select coalesce(jsonb_agg(a.area order by a.area), '[]'::jsonb) from areas_liberadas a
                        where a.vinculo_id = x.id and (a.retirado_em is null or a.retirado_em >= x.revogado_em)),
             'saida', saida_da_pessoa(x.pessoa_id))
             order by x.revogado_em desc), '[]'::jsonb)
      from (select distinct on (v.pessoa_id) v.* from vinculos v
             where v.escritorio_id = p_escritorio and v.funcao = 'EQUIPE' and v.revogado_em is not null
               and not exists (select 1 from vinculos a where a.escritorio_id = p_escritorio and a.pessoa_id = v.pessoa_id
                                                         and a.revogado_em is null)
             order by v.pessoa_id, v.revogado_em desc) x
      join pessoas p on p.id = x.pessoa_id);
end $$;

-- Equipe T3jus: a data em que a entrada de quem foi desativado some.
drop function console_equipe(uuid);
create function console_equipe(p_pessoa uuid)
returns table (pessoa_id uuid, nome text, ativa boolean, funcoes text[], desde timestamptz, senha_criada_em timestamptz,
               desativada_em timestamptz, saida jsonb)
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
           e.criado_em, p.senha_criada_em, e.desativada_em,
           case when e.ativa then null else saida_da_pessoa(e.pessoa_id) end
      from equipe_t3 e join pessoas p on p.id = e.pessoa_id
      left join equipe_funcoes ef on ef.pessoa_id = e.pessoa_id and ef.retirada_em is null
     group by e.pessoa_id, p.nome, e.ativa, e.criado_em, p.senha_criada_em, e.desativada_em
     order by e.ativa desc, p.nome;
end $$;

-- Reativar quem já perdeu a entrada não dá: é um convite novo, com outra conta.
create or replace function console_cadastrar_membro(p_pessoa uuid, p_membro uuid, p_nome text, p_funcoes text[]) returns void
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
  elsif exists (select 1 from pessoas where id = p_membro and entrada_apagada_em is not null) then
    perform recusar_motivo('A entrada desta pessoa foi apagada: convide de novo com o e-mail dela', 'ENTRADA_APAGADA');
  elsif exists (select 1 from equipe_t3 where pessoa_id = p_membro) then
    update equipe_t3 set ativa = true, desativada_em = null where pessoa_id = p_membro;
  else
    insert into equipe_t3 (pessoa_id) values (p_membro);
  end if;
  perform gravar_funcoes(p_membro, p_funcoes, p_pessoa);
  perform registrar_historico_interno('equipe.membro_cadastrado', 'pessoa', p_membro::text, jsonb_build_object('funcoes', to_jsonb(p_funcoes)));
end $$;

-- Suporte: a pessoa retirada do escritório também aparece, com a data em que a entrada some.
create or replace function suporte_pessoas_do_contexto() returns jsonb
language sql
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', p.id, 'nome', p.nome, 'email', u.email, 'senhaCriadaEm', p.senha_criada_em,
           'escritorio', jsonb_strip_nulls(jsonb_build_object('id', e.id, 'nome', e.nome,
                                            'papel', case when v.funcao = 'SOCIO' then 'SOCIO' else 'EQUIPE' end,
                                            'conviteEnviadoEm', convite_enviado_em(v.id),
                                            'retiradoEm', v.revogado_em,
                                            'telefone', (select c ->> 'telefone' from jsonb_array_elements(e.contatos) c
                                                          where c ? 'telefone' limit 1))))), '[]'::jsonb)
    from vinculos v
    join funcoes f on f.codigo = v.funcao and f.sistema = 'PORTAL'
    join pessoas p on p.id = v.pessoa_id
    join escritorios e on e.id = v.escritorio_id
    left join auth.users u on u.id = p.id
   where v.escritorio_id = contexto_escritorio()
     and (v.revogado_em is null
          or v.id = (select x.id from vinculos x join funcoes g on g.codigo = x.funcao and g.sistema = 'PORTAL'
                      where x.escritorio_id = v.escritorio_id and x.pessoa_id = v.pessoa_id
                        and not exists (select 1 from vinculos a join funcoes h on h.codigo = a.funcao and h.sistema = 'PORTAL'
                                         where a.escritorio_id = v.escritorio_id and a.pessoa_id = v.pessoa_id
                                           and a.revogado_em is null)
                      order by x.revogado_em desc limit 1))
$$;

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
  return v || jsonb_build_object(
    'podeAgir', v_agir,
    'saida', saida_da_pessoa(p_alvo),
    'aparelhos', (select count(*) from auth.sessions s where s.user_id = p_alvo and (s.not_after is null or s.not_after > now())));
end $$;

-- ---------------------------------------------------------------------------------------
-- A rotina da noite: além do que já fazia, encerra os contratos que chegaram ao fim, fecha o
-- acesso dos que passaram dos 30 dias e apaga a entrada de quem está há 90 dias sem acesso.
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

  -- Contrato que chegou ao fim marcado: vira Encerrado (decisão 1).
  for r in select e.id from escritorios e join clientes cl on cl.escritorio_id = e.id
            where e.contrato_fim_em <= hoje_brasilia() and cl.estado <> 'ENCERRADO' and cl.fim_motivo is not null
            order by e.id loop
    perform encerrar_no_dia(r.id, true);
    v_encerrados := v_encerrados + 1;
  end loop;

  -- Fim dos 30 dias: o acesso fecha e as sessões no escritório saem (decisão 1).
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

  -- 90 dias sem nenhum acesso: a entrada sai do Auth e a pessoa fica como autora (decisão 5).
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

  perform set_config('t3jus.aplicando_prazos', 'off', true);

  v_contratos := jsonb_build_object('encerrados', v_encerrados, 'acessos_fechados', v_fechados, 'entradas_apagadas', v_entradas);

  -- Tabelas com dado pessoal cujo prazo a rotina ainda não sabe aplicar: as da guarda de
  -- 5 anos depois do fim do contrato (F0.15).
  select coalesce(array_agg(tabela order by tabela), '{}') into v_sem
    from inventario_dados
   where dado_pessoal and tabela not in ('sessoes_escritorio', 'limites_uso', 'pessoas');

  v_resultado := jsonb_build_object(
    'apagados', v_apagados,
    'contratos', v_contratos,
    'aguardando_aprovacao', to_jsonb(v_aguardam),
    'sem_gatilho', to_jsonb(v_sem));
  perform registrar_historico('dados.prazos_aplicados', 'inventario', null, v_resultado);
  return v_resultado;
end $$;

call fechar_acesso();
