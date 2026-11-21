-- Interessados (F2.2, F2.3; SC-02, SC-05), desenho aprovado em docs/design/aprovadas/site-comercial.
-- O pedido de demonstração do site entra sozinho como interessado, com a autorização de dados
-- que a pessoa marcou. No Console (Comercial › Interessados), a Administração e a Implantação
-- cuidam de cada um: responsável, próximo passo com data, estágio com motivo obrigatório, notas,
-- histórico e, no fim, "Virar escritório cliente" (o cadastro do escritório já preenchido).
--
-- O interessado ainda não é escritório: é dado do T3jus (controlador), sem escritorio_id. As
-- tabelas são globais, fechadas para a API como todas, e só as funções abaixo leem e escrevem,
-- sempre conferindo a ação da pessoa da sessão (console.interessados.*). Quem não virou cliente
-- é apagado 12 meses depois do último contato (decisão 5 da Carol, 21/11/2026).

-- ---------------------------------------------------------------------------------------
-- Quem pode (decisão 9 da Carol): Administração e Implantação.
insert into funcao_acoes (funcao, acao) values
  ('ADMINISTRACAO', 'console.interessados.ver'),
  ('ADMINISTRACAO', 'console.interessados.editar'),
  ('IMPLANTACAO', 'console.interessados.ver'),
  ('IMPLANTACAO', 'console.interessados.editar');

insert into configuracoes (chave, valor, descricao) values
  ('prazo_interessados_meses', '12', 'Meses depois do último contato em que o interessado que não virou cliente é apagado (inventário: interessados)'),
  ('limite_pedido_site_ip_max', '5', 'Pedidos de demonstração do site pelo mesmo endereço de rede dentro da janela'),
  ('limite_pedido_site_ip_janela_minutos', '60', 'Janela dos pedidos de demonstração por endereço de rede'),
  ('limite_pedido_site_email_max', '3', 'Pedidos de demonstração do site com o mesmo e-mail dentro da janela'),
  ('limite_pedido_site_email_janela_minutos', '1440', 'Janela dos pedidos de demonstração por e-mail'),
  ('autorizacao_site_versao', '1', 'Versão do texto de autorização do formulário de demonstração do site'),
  ('autorizacao_site_texto', '"Autorizo o T3jus a usar estes dados para responder ao meu pedido de demonstração, como diz a Política de privacidade."',
   'Texto de autorização do formulário de demonstração, guardado com cada pedido');

-- ---------------------------------------------------------------------------------------
-- Tabelas

create table interessados (
  id                 uuid primary key default gen_random_uuid(),
  estado             text not null default 'NOVO'
                     check (estado in ('NOVO', 'EM_CONTATO', 'DEMONSTRACAO', 'PROPOSTA', 'CLIENTE', 'PERDIDO', 'DESCARTADO')),
  origem             text not null check (origem in ('SITE', 'INDICACAO', 'EVENTO', 'CONTATO')),
  -- O pedido como chegou (não muda).
  nome               text not null check (length(btrim(nome)) between 2 and 120),
  escritorio         text not null check (length(btrim(escritorio)) between 2 and 160),
  email              text not null check (length(email) <= 200 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  whats              text not null check (whats ~ '^\+55[1-9][0-9]{9,10}$'),
  tamanho            text not null check (tamanho in ('SO_EU', 'DE_2_A_5', 'DE_6_A_10', 'MAIS_DE_10')),
  area               text check (length(btrim(area)) between 2 and 40),
  mensagem           text check (length(mensagem) between 1 and 1000),
  -- A autorização (SC-02): o texto exato, a versão, quando e de onde.
  autorizacao        jsonb not null check (autorizacao ? 'texto' and autorizacao ? 'versao' and autorizacao ? 'aceita_em'),
  -- Página, campanha, fonte, meio e site de onde veio (sem dado pessoal).
  origem_detalhe     jsonb not null default '{}'::jsonb,
  chegou_em          timestamptz not null default app_now(),
  -- O que a equipe completa (marcado como "completado pela equipe").
  cidade             text check (length(btrim(cidade)) between 2 and 80),
  uf                 text check (uf in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB',
                                        'PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')),
  cidade_completada_em timestamptz,
  -- Quem cuida e o próximo passo.
  responsavel_id     uuid references pessoas (id) on delete restrict,
  responsavel_desde  timestamptz,
  responsavel_por    uuid references pessoas (id) on delete restrict,
  proximo_passo      text check (length(btrim(proximo_passo)) between 2 and 160),
  proximo_data       date,
  proximo_hora       time,
  proximo_quem       uuid references pessoas (id) on delete restrict,
  -- Como terminou (Perdido, Descartado ou Virou cliente).
  fim_em             timestamptz,
  fim_porque         text check (length(btrim(fim_porque)) between 2 and 60),
  fim_motivo         text check (length(btrim(fim_motivo)) between 1 and 300),
  cliente_escritorio uuid references escritorios (id) on delete restrict,
  -- Último contato: o prazo de 12 meses conta daqui.
  ultimo_contato_em  timestamptz not null default app_now(),
  versao             integer not null default 1,
  check ((proximo_passo is null) = (proximo_data is null)),
  check (proximo_hora is null or proximo_data is not null),
  check ((estado = 'CLIENTE') = (cliente_escritorio is not null)),
  check ((estado in ('PERDIDO', 'DESCARTADO', 'CLIENTE')) = (fim_em is not null))
);
create index interessados_email_idx on interessados (lower(email));
create index interessados_estado_idx on interessados (estado, chegou_em desc);
call proteger_tabela_global('interessados',
  'Pedidos de demonstração do site: dado do T3jus antes de existir escritório; só as funções do Console leem, com console.interessados.ver');
create trigger controle_versao before update on interessados for each row execute function controle_versao();

-- O histórico de cada interessado: só de inserção, autor da equipe ou o site.
create table interessado_eventos (
  id             bigint generated always as identity primary key,
  interessado_id uuid not null references interessados (id) on delete cascade,
  ocorrido_em    timestamptz not null default app_now(),
  autor_id       uuid references pessoas (id) on delete restrict,
  acao           text not null check (acao ~ '^[a-z_]+(\.[a-z_]+)*$'),
  dados          jsonb not null default '{}'::jsonb
);
create index interessado_eventos_idx on interessado_eventos (interessado_id, id desc);
call proteger_tabela_global('interessado_eventos',
  'Histórico dos interessados (SC-05), do T3jus; só as funções do Console leem, com console.interessados.ver');

create table interessado_notas (
  id             uuid primary key default gen_random_uuid(),
  interessado_id uuid not null references interessados (id) on delete cascade,
  texto          text not null check (length(btrim(texto)) between 1 and 2000),
  autor_id       uuid not null references pessoas (id) on delete restrict,
  criado_em      timestamptz not null default app_now()
);
create index interessado_notas_idx on interessado_notas (interessado_id, criado_em desc);
call proteger_tabela_global('interessado_notas',
  'Notas da equipe sobre os interessados (SC-05), do T3jus; só as funções do Console leem, com console.interessados.ver');

-- Notas e eventos não mudam nem saem; só a rotina dos prazos apaga, junto com o interessado.
create function interessado_somente_insercao() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' and current_setting('t3jus.aplicando_prazos', true) = 'on' then
    return old;
  end if;
  raise exception 'Registro só de inserção em % (% bloqueado)', tg_table_name, tg_op using errcode = 'TC010';
end $$;
create trigger interessado_eventos_somente_insercao before update or delete on interessado_eventos
  for each row execute function interessado_somente_insercao();
create trigger interessado_notas_somente_insercao before update or delete on interessado_notas
  for each row execute function interessado_somente_insercao();

-- O interessado só sai pela rotina dos prazos.
create function interessado_sem_exclusao() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_setting('t3jus.aplicando_prazos', true) = 'on' then return old; end if;
  raise exception 'O interessado não se apaga; ele sai sozinho no prazo' using errcode = 'TC010';
end $$;
create trigger interessados_sem_exclusao before delete on interessados
  for each row execute function interessado_sem_exclusao();

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('interessados', true, 'Nome, escritório, e-mail, WhatsApp, tamanho, área, mensagem e a autorização de quem pediu demonstração',
  'Responder ao pedido de demonstração e acompanhar a negociação', 'Consentimento (LGPD, art. 7º, I), marcado no formulário', 'T3jus',
  '12 meses depois do último contato, se não virar cliente; a pessoa pode pedir antes',
  'Apagado com as notas e o histórico; quem virou cliente segue a guarda do escritório', 'APROVADO', false),
 ('interessado_eventos', true, 'O que a equipe fez em cada interessado (quem, quando, motivo)',
  'Responder pelo atendimento comercial', 'Consentimento (LGPD, art. 7º, I), marcado no formulário', 'T3jus',
  'O mesmo do interessado', 'Apagado junto com o interessado', 'APROVADO', false),
 ('interessado_notas', true, 'Notas da equipe sobre a conversa com o interessado',
  'Preparar a demonstração e a proposta', 'Consentimento (LGPD, art. 7º, I), marcado no formulário', 'T3jus',
  'O mesmo do interessado', 'Apagado junto com o interessado', 'APROVADO', false);

-- ---------------------------------------------------------------------------------------
-- Ajudantes

create function interessado_evento(p_id uuid, p_acao text, p_dados jsonb default '{}'::jsonb) returns void
language sql
set search_path = public
as $$
  insert into interessado_eventos (interessado_id, autor_id, acao, dados)
  values (p_id, contexto_pessoa(), p_acao, coalesce(p_dados, '{}'::jsonb));
$$;

-- Quem pode ser responsável: equipe ativa com Administração ou Implantação.
create function pode_cuidar_interessados(p_pessoa uuid) returns boolean
language sql stable
set search_path = public
as $$
  select exists (
    select 1 from equipe_t3 e join equipe_funcoes f on f.pessoa_id = e.pessoa_id and f.retirada_em is null
      join funcao_acoes fa on fa.funcao = f.funcao and fa.acao = 'console.interessados.editar'
     where e.pessoa_id = p_pessoa and e.ativa)
$$;

-- Lê o interessado para mudar, conferindo a versão lida (PT-19).
create function interessado_para_mudar(p_id uuid, p_versao integer) returns interessados
language plpgsql
set search_path = public
as $$
declare v interessados;
begin
  select * into v from interessados where id = p_id for update;
  if not found then raise exception 'Interessado não encontrado' using errcode = 'TC404'; end if;
  if v.versao <> p_versao then perform conflito_versao('interessados', p_id); end if;
  return v;
end $$;

-- 1 dia útil depois de quando chegou (o prazo que o site promete, decisão 4 da Carol).
create function um_dia_util_depois(p_quando timestamptz) returns date
language sql stable
set search_path = public
as $$
  select min(d)::date from generate_series((p_quando at time zone 'America/Sao_Paulo')::date + 1,
                                            (p_quando at time zone 'America/Sao_Paulo')::date + 10, interval '1 day') d
   where extract(isodow from d) < 6
     and not exists (select 1 from feriados f where f.data = d::date)
$$;

create function interessado_json(v interessados) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', v.id, 'estagio', v.estado, 'origem', v.origem, 'nome', v.nome, 'escritorio', v.escritorio,
    'email', v.email, 'whats', v.whats, 'tamanho', v.tamanho, 'area', v.area,
    'cidade', v.cidade, 'uf', v.uf, 'chegouEm', v.chegou_em,
    'prazoResposta', um_dia_util_depois(v.chegou_em),
    'responsavel', case when v.responsavel_id is null then null
                        else jsonb_build_object('id', v.responsavel_id, 'nome', (select nome from pessoas where id = v.responsavel_id)) end,
    'proximo', case when v.proximo_passo is null then null else jsonb_build_object(
                 'passo', v.proximo_passo, 'data', v.proximo_data, 'hora', to_char(v.proximo_hora, 'HH24:MI'),
                 'quem', case when v.proximo_quem is null then null
                              else jsonb_build_object('id', v.proximo_quem, 'nome', (select nome from pessoas where id = v.proximo_quem)) end) end,
    'fim', case when v.fim_em is null then null
                else jsonb_build_object('em', v.fim_em, 'porque', v.fim_porque, 'motivo', v.fim_motivo) end,
    'clienteEscritorio', v.cliente_escritorio,
    'ultimoContatoEm', v.ultimo_contato_em,
    'versao', v.versao)
$$;

-- ---------------------------------------------------------------------------------------
-- Pedido do site (F2.2, SC-02). Chamada pela api-console com o segredo de repasse, sem pessoa:
-- o site só insere. Limite por endereço de rede e por e-mail; o mesmo e-mail com um pedido
-- ainda aberto não cria outro, só fica no histórico daquele.

create function site_registrar_pedido(p_dados jsonb, p_ip text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id     uuid;
  v_email  text := lower(btrim(p_dados ->> 'email'));
  v_whats  text := regexp_replace(coalesce(p_dados ->> 'whats', ''), '[^0-9]', '', 'g');
  v_tam    text;
  v_origem jsonb;
begin
  perform limpar_contexto();
  if p_ip is not null and not limite_contar('pedido_site_ip', p_ip) then
    return jsonb_build_object('limite', true);
  end if;
  if v_email is not null and not limite_contar('pedido_site_email', v_email) then
    return jsonb_build_object('limite', true);
  end if;
  if (p_dados ->> 'aceite')::boolean is not true then
    perform recusar_campos('Sem a autorização', 'aceite');
  end if;
  if length(v_whats) in (12, 13) and v_whats like '55%' then v_whats := substr(v_whats, 3); end if;
  v_tam := case p_dados ->> 'tamanho' when 'Só eu' then 'SO_EU' when '2 a 5' then 'DE_2_A_5'
                                       when '6 a 10' then 'DE_6_A_10' when 'Mais de 10' then 'MAIS_DE_10' end;
  if v_tam is null then perform recusar_campos('Tamanho inválido', 'tamanho'); end if;
  v_origem := jsonb_strip_nulls(jsonb_build_object(
    'pagina', left(nullif(btrim(p_dados #>> '{origem,pagina}'), ''), 120),
    'campanha', left(nullif(btrim(p_dados #>> '{origem,campanha}'), ''), 120),
    'fonte', left(nullif(btrim(p_dados #>> '{origem,fonte}'), ''), 120),
    'meio', left(nullif(btrim(p_dados #>> '{origem,meio}'), ''), 120),
    'referencia', left(nullif(btrim(p_dados #>> '{origem,referencia}'), ''), 120)));

  select id into v_id from interessados
   where lower(email) = v_email and estado not in ('CLIENTE', 'PERDIDO', 'DESCARTADO')
   order by chegou_em desc limit 1;
  if v_id is not null then
    update interessados set ultimo_contato_em = app_now() where id = v_id;
    perform interessado_evento(v_id, 'pedido.repetido', jsonb_build_object('origem', v_origem));
    return jsonb_build_object('id', v_id, 'repetido', true);
  end if;

  begin
    insert into interessados (origem, nome, escritorio, email, whats, tamanho, area, mensagem, autorizacao, origem_detalhe)
    values ('SITE', btrim(p_dados ->> 'nome'), btrim(p_dados ->> 'escritorio'), v_email, '+55' || v_whats, v_tam,
            nullif(btrim(p_dados ->> 'area'), ''), nullif(btrim(p_dados ->> 'msg'), ''),
            jsonb_build_object('texto', configuracao('autorizacao_site_texto') #>> '{}',
                               'versao', configuracao_int('autorizacao_site_versao'),
                               'aceita_em', app_now(), 'pagina', coalesce(v_origem ->> 'pagina', '/demonstracao')),
            v_origem)
    returning id into v_id;
  exception when check_violation or not_null_violation then
    perform recusar_campos('Pedido inválido', 'nome', 'escritorio', 'email', 'whats');
  end;
  perform interessado_evento(v_id, 'pedido.recebido', jsonb_build_object('origem', 'SITE'));
  return jsonb_build_object('id', v_id, 'repetido', false, 'nome', btrim(p_dados ->> 'nome'), 'email', v_email);
end $$;

-- A api-console registra que a resposta automática saiu (ou não).
create function site_pedido_resposta(p_id uuid, p_enviada boolean) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform limpar_contexto();
  perform interessado_evento(p_id, case when p_enviada then 'resposta.enviada' else 'resposta.falhou' end);
end $$;

-- ---------------------------------------------------------------------------------------
-- Console › Comercial › Interessados (F2.3, SC-05)

-- A lista, com os números do alto (quem vê: console.interessados.ver).
create function console_interessados(p_pessoa uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hoje date;
  v_mes  date;
begin
  perform entrar_console(p_pessoa, 'console.interessados.ver');
  v_hoje := hoje_brasilia();
  v_mes := date_trunc('month', v_hoje)::date;
  return jsonb_build_object(
    'hoje', v_hoje,
    'podeEditar', pode_global('console.interessados.editar'),
    'interessados', coalesce((select jsonb_agg(interessado_json(i) order by
        (i.estado in ('CLIENTE', 'PERDIDO', 'DESCARTADO')),
        (i.responsavel_id is not null), (i.proximo_data is null), i.proximo_data, i.chegou_em desc)
      from interessados i), '[]'::jsonb),
    'pessoas', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'nome', p.nome,
        'funcoes', (select jsonb_agg(f.funcao order by f.funcao) from equipe_funcoes f where f.pessoa_id = p.id and f.retirada_em is null)) order by p.nome)
      from pessoas p where pode_cuidar_interessados(p.id)), '[]'::jsonb),
    'mes', jsonb_build_object(
      'pedidos', (select count(*) from interessados where (chegou_em at time zone 'America/Sao_Paulo')::date >= v_mes and estado <> 'DESCARTADO'),
      'site', (select count(*) from interessados where (chegou_em at time zone 'America/Sao_Paulo')::date >= v_mes and estado <> 'DESCARTADO' and origem = 'SITE'),
      'clientes', (select count(*) from interessados where (chegou_em at time zone 'America/Sao_Paulo')::date >= v_mes and estado = 'CLIENTE')));
end $$;

-- A ficha: o interessado, as notas e o histórico.
create function console_interessado(p_pessoa uuid, p_id uuid) returns jsonb
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

-- Responsável: ficar com ele (a própria pessoa) ou atribuir a quem pode cuidar.
create function console_interessado_responsavel(p_pessoa uuid, p_id uuid, p_versao integer, p_responsavel uuid, p_recado text default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v interessados;
  v_versao integer;
begin
  perform entrar_console(p_pessoa, 'console.interessados.editar');
  v := interessado_para_mudar(p_id, p_versao);
  if v.estado in ('CLIENTE', 'PERDIDO', 'DESCARTADO') then
    raise exception 'Interessado encerrado' using errcode = 'TC023';
  end if;
  if p_responsavel is null or not pode_cuidar_interessados(p_responsavel) then
    perform recusar_campos('Só quem vê Interessados pode ser responsável', 'responsavel');
  end if;
  if length(btrim(coalesce(p_recado, ''))) > 300 then perform recusar_campos('Recado longo demais', 'recado'); end if;
  update interessados
     set responsavel_id = p_responsavel, responsavel_desde = app_now(), responsavel_por = p_pessoa,
         -- O pedido novo ganha o próximo passo de responder no prazo prometido.
         proximo_passo = coalesce(proximo_passo, case when estado = 'NOVO' then 'Responder o pedido' end),
         proximo_data = coalesce(proximo_data, case when estado = 'NOVO' then um_dia_util_depois(chegou_em) end),
         proximo_quem = case when proximo_quem is null or proximo_quem = v.responsavel_id then p_responsavel else proximo_quem end,
         ultimo_contato_em = app_now()
   where id = p_id
   returning versao into v_versao;
  perform interessado_evento(p_id, case when p_responsavel = p_pessoa then 'responsavel.ficou' else 'responsavel.atribuido' end,
    jsonb_strip_nulls(jsonb_build_object('para', p_responsavel, 'para_nome', (select nome from pessoas where id = p_responsavel),
                                         'antes_nome', (select nome from pessoas where id = v.responsavel_id),
                                         'recado', nullif(btrim(coalesce(p_recado, '')), ''))));
  return v_versao;
end $$;

-- Próximo passo: o que, quando e quem.
create function console_interessado_proximo(p_pessoa uuid, p_id uuid, p_versao integer, p_passo text, p_data date,
                                            p_hora time, p_quem uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v interessados;
  v_versao integer;
begin
  perform entrar_console(p_pessoa, 'console.interessados.editar');
  v := interessado_para_mudar(p_id, p_versao);
  if v.estado in ('CLIENTE', 'DESCARTADO') then raise exception 'Interessado encerrado' using errcode = 'TC023'; end if;
  if length(btrim(coalesce(p_passo, ''))) not between 2 and 160 then perform recusar_campos('O que fazer', 'passo'); end if;
  if p_data is null then perform recusar_campos('Data', 'data'); end if;
  if p_quem is null or not pode_cuidar_interessados(p_quem) then perform recusar_campos('Quem faz', 'quem'); end if;
  update interessados
     set proximo_passo = btrim(p_passo), proximo_data = p_data, proximo_hora = p_hora, proximo_quem = p_quem,
         ultimo_contato_em = app_now()
   where id = p_id
   returning versao into v_versao;
  perform interessado_evento(p_id, 'proximo.mudou', jsonb_strip_nulls(jsonb_build_object(
    'passo', btrim(p_passo), 'data', p_data, 'hora', to_char(p_hora, 'HH24:MI'), 'quem_nome', (select nome from pessoas where id = p_quem))));
  return v_versao;
end $$;

-- Cidade e UF que a equipe completa (o pedido do site não traz).
create function console_interessado_cidade(p_pessoa uuid, p_id uuid, p_versao integer, p_cidade text, p_uf text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_versao integer;
begin
  perform entrar_console(p_pessoa, 'console.interessados.editar');
  perform interessado_para_mudar(p_id, p_versao);
  begin
    update interessados set cidade = nullif(btrim(p_cidade), ''), uf = nullif(p_uf, ''), cidade_completada_em = app_now()
     where id = p_id returning versao into v_versao;
  exception when check_violation then perform recusar_campos('Cidade ou UF inválida', 'cidade', 'uf');
  end;
  perform interessado_evento(p_id, 'cidade.completada');
  return v_versao;
end $$;

-- Estágio: só para a frente e para os lados dentro do andamento, sempre com motivo.
-- Demonstração marcada pede data e hora e vira o próximo passo.
create function console_interessado_estagio(p_pessoa uuid, p_id uuid, p_versao integer, p_estagio text, p_motivo text,
                                            p_data date default null, p_hora time default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v interessados;
  v_versao integer;
begin
  perform entrar_console(p_pessoa, 'console.interessados.editar');
  v := interessado_para_mudar(p_id, p_versao);
  if v.estado in ('CLIENTE', 'PERDIDO', 'DESCARTADO') then raise exception 'Interessado encerrado' using errcode = 'TC023'; end if;
  if p_estagio not in ('EM_CONTATO', 'DEMONSTRACAO', 'PROPOSTA') or p_estagio = v.estado then
    raise exception 'Estágio inválido' using errcode = 'TC023';
  end if;
  if length(btrim(coalesce(p_motivo, ''))) = 0 then perform recusar_campos('Escreva o motivo', 'motivo'); end if;
  if length(btrim(p_motivo)) > 300 then perform recusar_campos('Motivo longo demais', 'motivo'); end if;
  if p_estagio = 'DEMONSTRACAO' and (p_data is null or p_hora is null) then
    perform recusar_campos('Data e hora da demonstração', 'data', 'hora');
  end if;
  update interessados
     set estado = p_estagio, ultimo_contato_em = app_now(),
         responsavel_id = coalesce(responsavel_id, p_pessoa),
         responsavel_desde = coalesce(responsavel_desde, app_now()),
         responsavel_por = coalesce(responsavel_por, p_pessoa),
         proximo_passo = case when p_estagio = 'DEMONSTRACAO' then 'Demonstração por vídeo' else proximo_passo end,
         proximo_data = case when p_estagio = 'DEMONSTRACAO' then p_data else proximo_data end,
         proximo_hora = case when p_estagio = 'DEMONSTRACAO' then p_hora else proximo_hora end,
         proximo_quem = case when p_estagio = 'DEMONSTRACAO' then coalesce(responsavel_id, p_pessoa) else proximo_quem end
   where id = p_id
   returning versao into v_versao;
  perform interessado_evento(p_id, 'estagio.mudou', jsonb_build_object('de', v.estado, 'para', p_estagio, 'motivo', btrim(p_motivo)));
  return v_versao;
end $$;

-- Perdido ou descartado, com o porquê e o motivo. Perdido pode marcar quando procurar de novo.
create function console_interessado_encerrar(p_pessoa uuid, p_id uuid, p_versao integer, p_como text, p_porque text,
                                             p_motivo text, p_procurar_em date default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v interessados;
  v_versao integer;
begin
  perform entrar_console(p_pessoa, 'console.interessados.editar');
  v := interessado_para_mudar(p_id, p_versao);
  if v.estado in ('CLIENTE', 'PERDIDO', 'DESCARTADO') then raise exception 'Interessado encerrado' using errcode = 'TC023'; end if;
  if p_como not in ('PERDIDO', 'DESCARTADO') then raise exception 'Como termina' using errcode = 'TC023'; end if;
  if length(btrim(coalesce(p_porque, ''))) not between 2 and 60 then perform recusar_campos('Por quê', 'porque'); end if;
  if length(btrim(coalesce(p_motivo, ''))) not between 1 and 300 then perform recusar_campos('Escreva o motivo', 'motivo'); end if;
  if p_procurar_em is not null and (p_como <> 'PERDIDO' or p_procurar_em <= hoje_brasilia()) then
    perform recusar_campos('Data para procurar de novo', 'procurar');
  end if;
  update interessados
     set estado = p_como, fim_em = app_now(), fim_porque = btrim(p_porque), fim_motivo = btrim(p_motivo),
         ultimo_contato_em = app_now(),
         proximo_passo = case when p_procurar_em is not null then 'Procurar de novo' end,
         proximo_data = p_procurar_em, proximo_hora = null,
         proximo_quem = case when p_procurar_em is not null then coalesce(responsavel_id, p_pessoa) end
   where id = p_id
   returning versao into v_versao;
  perform interessado_evento(p_id, 'encerrado', jsonb_strip_nulls(jsonb_build_object(
    'como', p_como, 'de', v.estado, 'porque', btrim(p_porque), 'motivo', btrim(p_motivo), 'procurar_em', p_procurar_em)));
  return v_versao;
end $$;

-- Reabrir um perdido ou descartado, com motivo: volta para Em contato.
create function console_interessado_reabrir(p_pessoa uuid, p_id uuid, p_versao integer, p_motivo text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v interessados;
  v_versao integer;
begin
  perform entrar_console(p_pessoa, 'console.interessados.editar');
  v := interessado_para_mudar(p_id, p_versao);
  if v.estado not in ('PERDIDO', 'DESCARTADO') then raise exception 'Só reabre perdido ou descartado' using errcode = 'TC023'; end if;
  if length(btrim(coalesce(p_motivo, ''))) not between 1 and 300 then perform recusar_campos('Escreva o motivo', 'motivo'); end if;
  update interessados
     set estado = 'EM_CONTATO', fim_em = null, fim_porque = null, fim_motivo = null, ultimo_contato_em = app_now(),
         responsavel_id = coalesce(responsavel_id, p_pessoa), responsavel_desde = coalesce(responsavel_desde, app_now()),
         responsavel_por = coalesce(responsavel_por, p_pessoa)
   where id = p_id
   returning versao into v_versao;
  perform interessado_evento(p_id, 'reaberto', jsonb_build_object('de', v.estado, 'motivo', btrim(p_motivo)));
  return v_versao;
end $$;

-- Nota da equipe (só de inserção).
create function console_interessado_nota(p_pessoa uuid, p_id uuid, p_texto text) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  perform entrar_console(p_pessoa, 'console.interessados.editar');
  if not exists (select 1 from interessados where id = p_id) then
    raise exception 'Interessado não encontrado' using errcode = 'TC404';
  end if;
  if length(btrim(coalesce(p_texto, ''))) not between 1 and 2000 then perform recusar_campos('Nota', 'texto'); end if;
  insert into interessado_notas (interessado_id, texto, autor_id) values (p_id, btrim(p_texto), p_pessoa) returning id into v_id;
  update interessados set ultimo_contato_em = app_now() where id = p_id;
  return v_id;
end $$;

-- O cadastro de escritório (0060) também abre para quem converte um interessado: o escritório
-- nasce do pedido, sem a ação de cadastrar na carteira.
drop function abrir_escritorio_novo(uuid);
create function abrir_escritorio_novo(p_pessoa uuid, p_acao text default 'console.escritorios.criar') returns uuid
language plpgsql
set search_path = public
as $$
declare v_id uuid := gen_random_uuid();
begin
  if p_acao not in ('console.escritorios.criar', 'console.interessados.editar') then
    raise exception 'Ação % não abre escritório', p_acao using errcode = 'TC401';
  end if;
  perform entrar_console(p_pessoa, p_acao);
  perform set_config('app.escritorio_id', v_id::text, true);
  return v_id;
end $$;

-- Virar escritório cliente: o cadastro de sempre (nome, cidade, UF), já preenchido, mais o
-- contato do pedido na ficha e o responsável atribuído como Implantação. Quem cuida de
-- interessados pode converter, mesmo sem "cadastrar escritório" na carteira: o escritório nasce
-- deste interessado. Quem converte fica atribuído como Administração (como no cadastro), se for
-- da Administração; senão, como Implantação.
create function console_interessado_converter(p_pessoa uuid, p_id uuid, p_versao integer, p_nome text, p_cidade text,
                                              p_uf text, p_motivo text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v interessados;
  v_esc uuid;
  v_funcoes text[];
  v_funcao text;
begin
  perform entrar_console(p_pessoa, 'console.interessados.editar');
  v := interessado_para_mudar(p_id, p_versao);
  if v.estado in ('CLIENTE', 'PERDIDO', 'DESCARTADO') then raise exception 'Interessado encerrado' using errcode = 'TC023'; end if;
  if length(btrim(coalesce(p_motivo, ''))) not between 1 and 300 then perform recusar_campos('Como fechou', 'motivo'); end if;
  v_funcoes := contexto_equipe_funcoes();
  v_esc := abrir_escritorio_novo(p_pessoa, 'console.interessados.editar');
  begin
    insert into escritorios (id, nome, cidade, uf, contatos)
    values (v_esc, btrim(p_nome), btrim(p_cidade), p_uf,
            jsonb_build_array(jsonb_build_object('nome', v.nome, 'papel', 'Pediu a demonstração', 'email', v.email, 'telefone', v.whats)));
  exception
    when check_violation or not_null_violation then perform recusar_campos('Dados do escritório inválidos', 'nome', 'cidade', 'uf');
  end;
  perform definir_transicao('CLIENTE_CADASTRADO');
  insert into clientes (escritorio_id) values (v_esc);
  v_funcao := case when 'ADMINISTRACAO' = any (v_funcoes) then 'ADMINISTRACAO' else 'IMPLANTACAO' end;
  insert into vinculos (pessoa_id, escritorio_id, funcao, criado_por) values (p_pessoa, v_esc, v_funcao, p_pessoa);
  if v.responsavel_id is not null
     and exists (select 1 from equipe_funcoes f where f.pessoa_id = v.responsavel_id and f.funcao = 'IMPLANTACAO' and f.retirada_em is null)
     and not (v.responsavel_id = p_pessoa and v_funcao = 'IMPLANTACAO') then
    insert into vinculos (pessoa_id, escritorio_id, funcao, criado_por) values (v.responsavel_id, v_esc, 'IMPLANTACAO', p_pessoa);
  end if;
  perform registrar_historico('escritorio.cadastrado', 'escritorio', v_esc::text);
  perform registrar_historico_interno('escritorio.veio_de_interessado', 'escritorio', v_esc::text,
                                      jsonb_build_object('interessado_id', p_id, 'motivo', btrim(p_motivo)));

  update interessados
     set estado = 'CLIENTE', cliente_escritorio = v_esc, fim_em = app_now(), fim_motivo = btrim(p_motivo),
         proximo_passo = null, proximo_data = null, proximo_hora = null, proximo_quem = null, ultimo_contato_em = app_now()
   where id = p_id;
  perform interessado_evento(p_id, 'convertido', jsonb_build_object('de', v.estado, 'escritorio_id', v_esc,
                                                                    'escritorio_nome', btrim(p_nome), 'motivo', btrim(p_motivo)));
  return v_esc;
end $$;

-- EX-10: quem sai da equipe (desativado ou sem a função que cuida de interessados) deixa os
-- interessados abertos sem responsável; eles voltam a pedir atenção na lista e no menu.
create function interessados_passar_de_quem_saiu() returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_quem uuid := nullif(new.entidade_id, '')::uuid;
  r record;
begin
  if v_quem is null or pode_cuidar_interessados(v_quem) then return new; end if;
  for r in select id, responsavel_id from interessados
            where estado not in ('CLIENTE', 'DESCARTADO') and (responsavel_id = v_quem or proximo_quem = v_quem)
            order by id loop
    update interessados
       set responsavel_id = case when responsavel_id = v_quem then null else responsavel_id end,
           responsavel_desde = case when responsavel_id = v_quem then null else responsavel_desde end,
           responsavel_por = case when responsavel_id = v_quem then null else responsavel_por end,
           proximo_quem = case when proximo_quem = v_quem then responsavel_id end
     where id = r.id;
    perform interessado_evento(r.id, 'responsavel.saiu', jsonb_build_object('nome', (select nome from pessoas where id = v_quem)));
  end loop;
  return new;
end $$;
create trigger interessados_passar_de_quem_saiu after insert on historico
  for each row when (new.acao in ('equipe.membro_desativado', 'equipe.funcoes_alteradas'))
  execute function interessados_passar_de_quem_saiu();

-- Quantos pedem atenção (sem responsável ou passo vencido), para o contador do menu.
create function console_interessados_atencao(p_pessoa uuid) returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if not tentar_definir_pessoa(p_pessoa) or not pode_global('console.interessados.ver') then return 0; end if;
  return (select count(*) from interessados
           where estado not in ('CLIENTE', 'PERDIDO', 'DESCARTADO')
             and (responsavel_id is null or proximo_data < hoje_brasilia()));
end $$;

-- ---------------------------------------------------------------------------------------
-- Prazo (decisão 5 da Carol): quem não virou cliente sai 12 meses depois do último contato,
-- com as notas e o histórico. A rotina da noite (aplicar_prazos) chama; a cópia abaixo é a da
-- 0540 com o passo dos interessados.
create function apagar_interessados_vencidos() returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_n integer;
begin
  perform set_config('t3jus.aplicando_prazos', 'on', true);
  delete from interessados
   where estado <> 'CLIENTE'
     and ultimo_contato_em < app_now() - make_interval(months => configuracao_int('prazo_interessados_meses'));
  get diagnostics v_n = row_count;
  perform set_config('t3jus.aplicando_prazos', 'off', true);
  return v_n;
end $$;

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

  -- Interessados que não viraram cliente (0570): 12 meses depois do último contato.
  if prazo_aprovado('interessados') then
    v_n := apagar_interessados_vencidos();
    -- Só aparece na contagem quando apagou alguém (a contagem dos outros prazos não muda).
    if v_n > 0 then v_apagados := v_apagados || jsonb_build_object('interessados', v_n); end if;
  else
    v_aguardam := v_aguardam || 'interessados'::text;
  end if;

  -- Dado pessoal cujo prazo a rotina ainda não aplica: hoje, só o da equipe T3jus (5 anos
  -- depois de sair). Tudo o que é do escritório sai no fim da guarda.
  select coalesce(array_agg(d.tabela order by d.tabela), '{}') into v_sem
    from inventario_dados d
   where d.dado_pessoal and d.tabela not in ('sessoes_escritorio', 'limites_uso', 'pessoas', 'historico', 'escritorios',
                                             'interessados', 'interessado_eventos', 'interessado_notas')
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


-- A moldura do Console mostra Comercial só para quem vê Interessados.
create or replace function console_sessao(p_pessoa uuid) returns jsonb
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
                          and fa.acao in ('console.escritorios.criar', 'console.equipe.gerenciar', 'console.historico.equipe',
                                          'console.suporte.ver', 'console.interessados.ver')), '[]'::jsonb))
    into v from pessoas p where p.id = p_pessoa;
  return v;
end $$;

call fechar_acesso();
