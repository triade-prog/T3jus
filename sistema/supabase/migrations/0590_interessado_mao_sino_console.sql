-- Cadastrar interessado à mão (F2.5, SC-05) e o sino do Console (F2.6, SC-02, SC-05).
-- Desenho aprovado pela Carol em 21/11/2026 (docs/design/aprovadas/console-interessado-sino),
-- com as recomendações das 9 perguntas:
--   1. e-mail ou WhatsApp, pelo menos um (o site continua pedindo os dois);
--   2. quem é cadastrado à mão entra por legítimo interesse (LGPD, art. 7º, IX), com a origem;
--   3. no possível repetido, "juntar ao existente" ou "cadastrar mesmo assim" (fica no histórico);
--   4. sem e-mail automático para quem é cadastrado à mão;
--   5. a data do contato pode ser anterior, nunca depois de hoje;
--   7. o próximo passo vencido avisa uma vez, às 7h do dia seguinte ao vencimento;
--   8. o pedido novo do site avisa todos que veem Interessados;
--   9. os avisos ficam só no sino.

-- ---------------------------------------------------------------------------------------
-- 1. Interessado cadastrado à mão

alter table interessados
  alter column email drop not null,
  alter column whats drop not null,
  alter column autorizacao drop not null,
  add column base_legal text not null default 'CONSENTIMENTO' check (base_legal in ('CONSENTIMENTO', 'LEGITIMO_INTERESSE')),
  -- "A pessoa sabe que vamos procurá-la?" (só no cadastro à mão).
  add column sabe_do_contato boolean,
  add column cadastrado_por uuid references pessoas (id) on delete restrict,
  add column cadastrado_em timestamptz,
  add constraint interessados_email_ou_whats check (email is not null or whats is not null),
  -- O pedido do site tem a autorização (consentimento); o cadastro à mão tem quem cadastrou,
  -- a resposta sobre o aviso à pessoa e o legítimo interesse.
  add constraint interessados_base_legal_da_origem check (
    (origem = 'SITE' and autorizacao is not null and base_legal = 'CONSENTIMENTO' and cadastrado_por is null)
    or (origem <> 'SITE' and base_legal = 'LEGITIMO_INTERESSE' and cadastrado_por is not null
        and cadastrado_em is not null and sabe_do_contato is not null));
create index interessados_whats_idx on interessados (whats);

update inventario_dados
   set o_que = 'Nome, escritório, e-mail ou WhatsApp, tamanho, área e mensagem; a autorização (site) ou de onde veio o contato (à mão)',
       base_legal = 'Consentimento (LGPD, art. 7º, I) no pedido do site; legítimo interesse (art. 7º, IX) no cadastro à mão'
 where tabela = 'interessados';
update inventario_dados
   set base_legal = 'Consentimento (LGPD, art. 7º, I) no pedido do site; legítimo interesse (art. 7º, IX) no cadastro à mão'
 where tabela in ('interessado_eventos', 'interessado_notas');

-- A ficha diz de onde veio e quem cadastrou.
create or replace function console_interessado(p_pessoa uuid, p_id uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v interessados;
begin
  perform entrar_console(p_pessoa, 'console.interessados.ver');
  select * into v from interessados where id = p_id;
  if not found then raise exception 'Interessado não encontrado' using errcode = 'TC404'; end if;
  return interessado_json(v) || jsonb_build_object(
    'hoje', hoje_brasilia(),
    'mensagem', v.mensagem,
    'cidadeCompletadaEm', v.cidade_completada_em,
    'autorizacao', v.autorizacao,
    'origemDetalhe', v.origem_detalhe,
    'baseLegal', v.base_legal,
    'sabeDoContato', v.sabe_do_contato,
    'cadastradoPor', (select nome from pessoas where id = v.cadastrado_por),
    'cadastradoEm', v.cadastrado_em,
    'responsavelDesde', v.responsavel_desde,
    'responsavelPor', (select nome from pessoas where id = v.responsavel_por),
    'clienteNome', (select nome from escritorios where id = v.cliente_escritorio),
    'prazoResposta', um_dia_util_depois(v.chegou_em),
    'apagarEm', case when v.estado <> 'CLIENTE'
                     then ((v.ultimo_contato_em at time zone 'America/Sao_Paulo')::date
                           + make_interval(months => configuracao_int('prazo_interessados_meses')))::date end,
    'podeEditar', pode_global('console.interessados.editar'),
    'pessoas', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'nome', p.nome,
        'funcoes', (select jsonb_agg(f.funcao order by f.funcao) from equipe_funcoes f where f.pessoa_id = p.id and f.retirada_em is null)) order by p.nome)
      from pessoas p where pode_cuidar_interessados(p.id)), '[]'::jsonb),
    'notas', coalesce((select jsonb_agg(jsonb_build_object('id', n.id, 'texto', n.texto, 'criadoEm', n.criado_em,
        'autor', jsonb_build_object('id', n.autor_id, 'nome', a.nome)) order by n.criado_em desc)
      from interessado_notas n join pessoas a on a.id = n.autor_id where n.interessado_id = p_id), '[]'::jsonb),
    'historico', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'ocorridoEm', e.ocorrido_em, 'acao', e.acao, 'dados', e.dados,
        'autor', case when e.autor_id is null then null else jsonb_build_object('id', e.autor_id, 'nome', a.nome) end) order by e.id desc)
      from interessado_eventos e left join pessoas a on a.id = e.autor_id where e.interessado_id = p_id), '[]'::jsonb));
end $$;

-- O que se escreve no cadastro, conferido campo a campo. Devolve o registro pronto, com os
-- valores normalizados (e-mail em minúsculas, WhatsApp +55 e só números).
create function interessado_dados_mao(p_dados jsonb) returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_email text := nullif(lower(btrim(coalesce(p_dados ->> 'email', ''))), '');
  v_whats text := regexp_replace(coalesce(p_dados ->> 'whats', ''), '[^0-9]', '', 'g');
  v_quando date;
  v_campos text[] := '{}';
begin
  if length(v_whats) in (12, 13) and v_whats like '55%' then v_whats := substr(v_whats, 3); end if;
  v_whats := nullif(v_whats, '');
  if length(btrim(coalesce(p_dados ->> 'nome', ''))) not between 2 and 120 then v_campos := v_campos || 'nome'::text; end if;
  if length(btrim(coalesce(p_dados ->> 'escritorio', ''))) not between 2 and 160 then v_campos := v_campos || 'escritorio'::text; end if;
  if v_email is null and v_whats is null then
    v_campos := v_campos || array['email', 'whats'];
  else
    if v_email is not null and (length(v_email) > 200 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then v_campos := v_campos || 'email'::text; end if;
    if v_whats is not null and v_whats !~ '^[1-9][0-9]{9,10}$' then v_campos := v_campos || 'whats'::text; end if;
  end if;
  if coalesce(p_dados ->> 'tamanho', '') not in ('SO_EU', 'DE_2_A_5', 'DE_6_A_10', 'MAIS_DE_10') then v_campos := v_campos || 'tamanho'::text; end if;
  if length(btrim(coalesce(p_dados ->> 'area', ''))) not in (0) and length(btrim(p_dados ->> 'area')) not between 2 and 40 then v_campos := v_campos || 'area'::text; end if;
  if length(btrim(coalesce(p_dados ->> 'cidade', ''))) not in (0) and length(btrim(p_dados ->> 'cidade')) not between 2 and 80 then v_campos := v_campos || 'cidade'::text; end if;
  if coalesce(p_dados ->> 'uf', '') <> '' and p_dados ->> 'uf' not in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB',
                                                                       'PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO') then
    v_campos := v_campos || 'uf'::text;
  end if;
  if coalesce(p_dados ->> 'origem', '') not in ('INDICACAO', 'EVENTO', 'CONTATO') then v_campos := v_campos || 'origem'::text; end if;
  if length(btrim(coalesce(p_dados ->> 'detalhe', ''))) not between 2 and 200 then v_campos := v_campos || 'detalhe'::text; end if;
  begin
    v_quando := (p_dados ->> 'quando')::date;
  exception when others then v_quando := null;
  end;
  -- Hoje ou antes, e dentro do prazo de guarda (um contato mais velho já teria saído).
  if v_quando is null or v_quando > hoje_brasilia()
     or v_quando <= (hoje_brasilia() - make_interval(months => configuracao_int('prazo_interessados_meses')))::date then
    v_campos := v_campos || 'quando'::text;
  end if;
  if length(coalesce(p_dados ->> 'mensagem', '')) > 1000 then v_campos := v_campos || 'mensagem'::text; end if;
  if jsonb_typeof(p_dados -> 'sabe') is distinct from 'boolean' then v_campos := v_campos || 'sabe'::text; end if;
  if array_length(v_campos, 1) > 0 then
    raise exception 'Confira o cadastro' using errcode = 'TC422', detail = jsonb_build_object('campos', to_jsonb(v_campos))::text;
  end if;
  return jsonb_build_object(
    'nome', btrim(p_dados ->> 'nome'), 'escritorio', btrim(p_dados ->> 'escritorio'),
    'email', v_email, 'whats', case when v_whats is not null then '+55' || v_whats end,
    'tamanho', p_dados ->> 'tamanho', 'area', nullif(btrim(coalesce(p_dados ->> 'area', '')), ''),
    'cidade', nullif(btrim(coalesce(p_dados ->> 'cidade', '')), ''), 'uf', nullif(p_dados ->> 'uf', ''),
    'origem', p_dados ->> 'origem', 'detalhe', btrim(p_dados ->> 'detalhe'), 'quando', v_quando,
    'mensagem', nullif(btrim(coalesce(p_dados ->> 'mensagem', '')), ''), 'sabe', (p_dados ->> 'sabe')::boolean);
end $$;

-- Outro interessado com o mesmo e-mail ou WhatsApp: os abertos primeiro, depois o mais novo.
create function interessado_repetido(p_email text, p_whats text) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object('id', i.id, 'nome', i.nome, 'escritorio', i.escritorio, 'estagio', i.estado, 'origem', i.origem,
                            'cidade', i.cidade, 'uf', i.uf, 'chegouEm', i.chegou_em, 'email', i.email, 'whats', i.whats, 'versao', i.versao,
                            'campo', case when p_email is not null and lower(i.email) = p_email then 'email' else 'whats' end,
                            'responsavel', (select nome from pessoas where id = i.responsavel_id))
    from interessados i
   where (p_email is not null and lower(i.email) = p_email) or (p_whats is not null and i.whats = p_whats)
   order by (i.estado in ('CLIENTE', 'PERDIDO', 'DESCARTADO')), i.chegou_em desc
   limit 1
$$;

-- Cadastrar à mão: confere a permissão e os campos, procura o repetido e, sem ele (ou com
-- "cadastrar mesmo assim"), grava em Novo, com responsável e próximo passo.
create function console_interessado_cadastrar(p_pessoa uuid, p_dados jsonb, p_forcar boolean default false) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  d jsonb;
  v_rep jsonb;
  v_resp uuid;
  v_passo text := btrim(coalesce(p_dados ->> 'passo', ''));
  v_pdata date;
  v_chegou timestamptz;
  v_id uuid;
begin
  perform entrar_console(p_pessoa, 'console.interessados.editar');
  d := interessado_dados_mao(p_dados);
  begin
    v_resp := (p_dados ->> 'responsavel')::uuid;
  exception when others then v_resp := null;
  end;
  if v_resp is null or not pode_cuidar_interessados(v_resp) then
    perform recusar_campos('Só quem vê Interessados pode ser responsável', 'responsavel');
  end if;
  begin
    v_pdata := (p_dados ->> 'passoData')::date;
  exception when others then v_pdata := null;
  end;
  if length(v_passo) not between 2 and 160 then perform recusar_campos('O que fazer', 'passo'); end if;
  if v_pdata is null or v_pdata < hoje_brasilia() then perform recusar_campos('Data do próximo passo', 'passoData'); end if;

  v_rep := interessado_repetido(d ->> 'email', d ->> 'whats');
  if v_rep is not null and not coalesce(p_forcar, false) then
    return jsonb_build_object('repetido', v_rep);
  end if;

  -- O prazo de guarda conta da data do contato (decisão 5); a hora do cadastro fica à parte.
  v_chegou := case when (d ->> 'quando')::date = hoje_brasilia() then app_now()
                   else (((d ->> 'quando')::date + time '12:00') at time zone 'America/Sao_Paulo') end;
  insert into interessados (origem, nome, escritorio, email, whats, tamanho, area, mensagem, cidade, uf, origem_detalhe,
                            chegou_em, ultimo_contato_em, base_legal, sabe_do_contato, cadastrado_por, cadastrado_em,
                            responsavel_id, responsavel_desde, responsavel_por, proximo_passo, proximo_data, proximo_quem)
  values (d ->> 'origem', d ->> 'nome', d ->> 'escritorio', d ->> 'email', d ->> 'whats', d ->> 'tamanho', d ->> 'area', d ->> 'mensagem',
          d ->> 'cidade', d ->> 'uf', jsonb_build_object('detalhe', d ->> 'detalhe'),
          v_chegou, v_chegou, 'LEGITIMO_INTERESSE', (d ->> 'sabe')::boolean, p_pessoa, app_now(),
          v_resp, app_now(), p_pessoa, v_passo, v_pdata, v_resp)
  returning id into v_id;
  perform interessado_evento(v_id, 'interessado.cadastrado', jsonb_strip_nulls(jsonb_build_object(
    'origem', d ->> 'origem', 'detalhe', d ->> 'detalhe', 'sabe', (d ->> 'sabe')::boolean, 'quando', d ->> 'quando',
    'responsavel', v_resp, 'responsavel_nome', (select nome from pessoas where id = v_resp),
    'repetido_de', case when v_rep is not null then v_rep ->> 'id' end,
    'repetido_nome', case when v_rep is not null then v_rep ->> 'escritorio' end)));
  return jsonb_build_object('id', v_id);
end $$;

-- Juntar ao existente: o que foi escrito vira nota no interessado que já existe e conta como
-- novo contato (renova o prazo de 12 meses). Não cria outro.
create function console_interessado_juntar(p_pessoa uuid, p_id uuid, p_dados jsonb) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  d jsonb;
  v_texto text;
  v_nota uuid;
begin
  perform entrar_console(p_pessoa, 'console.interessados.editar');
  if not exists (select 1 from interessados where id = p_id) then
    raise exception 'Interessado não encontrado' using errcode = 'TC404';
  end if;
  d := interessado_dados_mao(p_dados);
  v_texto := left(concat_ws(E'\n',
    format('Contato de novo (%s, %s): %s.', case d ->> 'origem' when 'INDICACAO' then 'indicação' when 'EVENTO' then 'evento' else 'contato direto' end,
           to_char((d ->> 'quando')::date, 'DD/MM/YYYY'), rtrim(d ->> 'detalhe', '.')),
    format('%s, %s%s%s.', d ->> 'nome', d ->> 'escritorio',
           case when d ->> 'email' is not null then ', ' || (d ->> 'email') else '' end,
           case when d ->> 'whats' is not null then ', ' || (d ->> 'whats') else '' end),
    d ->> 'mensagem'), 2000);
  insert into interessado_notas (interessado_id, texto, autor_id) values (p_id, v_texto, p_pessoa) returning id into v_nota;
  update interessados set ultimo_contato_em = greatest(ultimo_contato_em, app_now()) where id = p_id;
  perform interessado_evento(p_id, 'contato.repetido', jsonb_build_object('origem', d ->> 'origem', 'detalhe', d ->> 'detalhe'));
  return v_nota;
end $$;

-- ---------------------------------------------------------------------------------------
-- 2. O sino do Console. O do Portal (avisos_sino) é dado de escritório; o do Console é do
-- T3jus, global, no mesmo formato. Só se acrescenta e se marca como lido.

create table avisos_console (
  id             uuid primary key default gen_random_uuid(),
  pessoa_id      uuid not null references pessoas (id) on delete restrict,
  tipo           text not null check (tipo in ('INTERESSADO_NOVO', 'INTERESSADO_ATRIBUIDO', 'INTERESSADO_VENCIDO')),
  -- Nomes, trecho e recado do momento em que o aviso nasceu.
  dados          jsonb not null default '{}'::jsonb check (jsonb_typeof(dados) = 'object'),
  -- O interessado do aviso: o aviso sai junto quando ele é apagado no prazo.
  interessado_id uuid references interessados (id) on delete cascade,
  criado_em      timestamptz not null default app_now(),
  lido_em        timestamptz,
  check ((tipo like 'INTERESSADO_%') = (interessado_id is not null))
);
create index avisos_console_pessoa on avisos_console (pessoa_id, criado_em desc);
create index avisos_console_interessado on avisos_console (interessado_id);
call proteger_tabela_global('avisos_console',
  'Sino do Console (F2.6): avisos da equipe T3jus, sem escritório; só as funções do Console leem, cada pessoa os seus');

create function avisos_console_guardiao() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if current_setting('t3jus.aplicando_prazos', true) = 'on' then return old; end if;
    raise exception 'Aviso não se apaga: sai junto com o interessado, no prazo' using errcode = 'TC023';
  end if;
  if old.lido_em is not null or (to_jsonb(new) - 'lido_em') is distinct from (to_jsonb(old) - 'lido_em') then
    raise exception 'Aviso não se muda: só se marca como lido' using errcode = 'TC023';
  end if;
  return new;
end $$;
create trigger avisos_console_guardiao before update or delete on avisos_console
  for each row execute function avisos_console_guardiao();

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('avisos_console', true,
  'Avisos do sino da equipe T3jus: o interessado, o nome de quem pediu, um trecho da mensagem e quando foi lido',
  'Avisar a pessoa da equipe do que pede a ação dela e levar à ficha do interessado (SC-05)',
  'A mesma do interessado: consentimento (site) ou legítimo interesse (à mão)', 'T3jus',
  'O mesmo do interessado', 'Apagado junto com o interessado', 'APROVADO', false);

-- O sino entra na rotina dos prazos como os interessados: sai junto com eles.
do $$
declare d text := pg_get_functiondef('aplicar_prazos()'::regprocedure);
begin
  if position('''interessado_notas'')' in d) = 0 then raise exception 'aplicar_prazos mudou: confira a lista de tabelas'; end if;
  execute replace(d, '''interessado_notas'')', '''interessado_notas'', ''avisos_console'')');
end $$;

-- O pedido do site e a rotina das 7h rodam sem pessoa: leem quem é da equipe pela marca
-- t3jus.lendo_acesso, como o fim do contrato (0210).
create policy lendo_acesso on equipe_funcoes for select to dominio
  using (current_setting('t3jus.lendo_acesso', true) = 'on');

create function pode_ver_interessados(p_pessoa uuid) returns boolean
language sql stable
set search_path = public
as $$
  select exists (
    select 1 from equipe_t3 e join equipe_funcoes f on f.pessoa_id = e.pessoa_id and f.retirada_em is null
      join funcao_acoes fa on fa.funcao = f.funcao and fa.acao = 'console.interessados.ver'
     where e.pessoa_id = p_pessoa and e.ativa)
$$;

-- Grava um aviso para uma pessoa (nunca para quem fez a ação).
create function aviso_console(p_pessoa uuid, p_autor uuid, p_tipo text, p_interessado uuid, p_dados jsonb) returns void
language sql
set search_path = public
as $$
  insert into avisos_console (pessoa_id, tipo, dados, interessado_id)
  select p_pessoa, p_tipo, jsonb_strip_nulls(p_dados), p_interessado
   where p_pessoa is not null and p_pessoa is distinct from p_autor and pode_ver_interessados(p_pessoa)
$$;

-- Pedido novo do site (para todos que veem Interessados) e interessado passado para alguém.
create function avisos_console_do_interessado() returns trigger
language plpgsql
set search_path = public
as $$
declare
  v interessados;
  p uuid;
  v_para uuid;
  v_antes text;
begin
  select * into v from interessados where id = new.interessado_id;
  if new.acao = 'pedido.recebido' then
    v_antes := current_setting('t3jus.lendo_acesso', true);
    perform set_config('t3jus.lendo_acesso', 'on', true);
    for p in select e.pessoa_id from equipe_t3 e where pode_ver_interessados(e.pessoa_id) order by e.pessoa_id loop
      perform aviso_console(p, null, 'INTERESSADO_NOVO', v.id, jsonb_build_object(
        'escritorio', v.escritorio, 'nome', v.nome, 'tamanho', v.tamanho, 'trecho', left(v.mensagem, 200),
        'prazo', um_dia_util_depois(v.chegou_em)));
    end loop;
    perform set_config('t3jus.lendo_acesso', coalesce(v_antes, ''), true);
  else
    v_para := nullif(coalesce(new.dados ->> 'para', new.dados ->> 'responsavel'), '')::uuid;
    perform aviso_console(v_para, new.autor_id, 'INTERESSADO_ATRIBUIDO', v.id, jsonb_build_object(
      'escritorio', v.escritorio, 'nome', v.nome, 'quem', (select nome from pessoas where id = new.autor_id),
      'recado', new.dados ->> 'recado', 'cadastro', new.acao = 'interessado.cadastrado'));
  end if;
  return null;
end $$;
create trigger avisos_console_do_interessado after insert on interessado_eventos
  for each row when (new.acao in ('pedido.recebido', 'responsavel.atribuido', 'interessado.cadastrado'))
  execute function avisos_console_do_interessado();

-- Próximo passo vencido: uma vez por passo, na manhã seguinte ao vencimento (decisão 7), para
-- quem faz o passo (ou o responsável).
create function avisar_interessados_vencidos() returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_n integer := 0;
  v_para uuid;
begin
  perform limpar_contexto();
  perform set_config('t3jus.lendo_acesso', 'on', true);
  for r in select * from interessados
            where estado not in ('CLIENTE', 'PERDIDO', 'DESCARTADO') and proximo_data < hoje_brasilia()
            order by proximo_data, id loop
    v_para := coalesce(r.proximo_quem, r.responsavel_id);
    if v_para is null or exists (select 1 from avisos_console a
                                  where a.interessado_id = r.id and a.tipo = 'INTERESSADO_VENCIDO' and a.pessoa_id = v_para
                                    and a.dados ->> 'data' = r.proximo_data::text and a.dados ->> 'passo' = r.proximo_passo) then
      continue;
    end if;
    perform aviso_console(v_para, null, 'INTERESSADO_VENCIDO', r.id, jsonb_build_object(
      'escritorio', r.escritorio, 'nome', r.nome, 'passo', r.proximo_passo, 'data', r.proximo_data,
      'responsavel', (select nome from pessoas where id = r.responsavel_id)));
    v_n := v_n + 1;
  end loop;
  perform set_config('t3jus.lendo_acesso', '', true);
  return v_n;
end $$;

-- Todo dia às 7h de Brasília (10h UTC), onde o pg_cron existe.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('t3jus-interessados-vencidos', '0 10 * * *', 'select public.avisar_interessados_vencidos()');
  end if;
end $$;

-- ---------------------------------------------------------------------------------------
-- Leituras e marcas. Toda a equipe tem o sino; cada um vê só o seu, e o aviso de interessado
-- só enquanto a pessoa ainda vê Interessados (a permissão de agora).

create function entrar_equipe(p_pessoa uuid) returns void
language plpgsql
set search_path = public
as $$
begin
  perform definir_pessoa(p_pessoa);
  if not contexto_equipe() then raise exception 'Só a equipe T3jus' using errcode = 'TC401'; end if;
end $$;

create function console_avisos(p_pessoa uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_desde timestamptz := app_now() - interval '30 days';
  v_ve boolean;
begin
  perform entrar_equipe(p_pessoa);
  v_ve := pode_global('console.interessados.ver');
  return (
    with meus as (
      select a.* from avisos_console a
       where a.pessoa_id = p_pessoa and a.criado_em >= v_desde and (v_ve or a.tipo not like 'INTERESSADO_%')
       order by a.criado_em desc, a.id desc limit 200)
    select jsonb_build_object(
      'novos', (select count(*) from meus where lido_em is null),
      'total', (select count(*) from meus),
      'veInteressados', v_ve,
      'itens', coalesce((select jsonb_agg(jsonb_build_object(
          'id', m.id, 'tipo', m.tipo, 'dados', m.dados, 'interessadoId', m.interessado_id, 'em', m.criado_em, 'lido', m.lido_em is not null,
          -- O aviso é uma foto do momento; "agora" diz quem cuida hoje do pedido.
          'agora', case when m.tipo = 'INTERESSADO_NOVO' then (select p.nome from interessados i join pessoas p on p.id = i.responsavel_id
                                                                where i.id = m.interessado_id) end)
        order by m.criado_em desc, m.id desc) from meus m), '[]'::jsonb)));
end $$;

create function console_aviso_lido(p_pessoa uuid, p_id uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform entrar_equipe(p_pessoa);
  if not exists (select 1 from avisos_console where id = p_id and pessoa_id = p_pessoa) then
    raise exception 'Aviso não encontrado' using errcode = 'TC404';
  end if;
  update avisos_console set lido_em = app_now() where id = p_id and lido_em is null;
  return console_avisos(p_pessoa);
end $$;

-- Marcar todos até o último aviso mostrado: o que chegou depois continua novo.
create function console_avisos_lidos(p_pessoa uuid, p_ate timestamptz) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_n integer;
begin
  perform entrar_equipe(p_pessoa);
  if p_ate is null then perform recusar_campos('Falta até quando marcar', 'ate'); end if;
  update avisos_console set lido_em = app_now()
   where pessoa_id = p_pessoa and lido_em is null and criado_em <= p_ate
     and (pode_global('console.interessados.ver') or tipo not like 'INTERESSADO_%');
  get diagnostics v_n = row_count;
  return console_avisos(p_pessoa) || jsonb_build_object('marcados', v_n);
end $$;

call fechar_acesso();
