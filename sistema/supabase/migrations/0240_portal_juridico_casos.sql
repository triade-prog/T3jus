-- Jurídico do Portal, parte 1: etapas, casos, ficha e mudar etapa (EX-01, EX-03, EX-07, EX-08,
-- EX-14, CH-05), tela aprovada em docs/design/aprovadas/portal-juridico (Carol, 19/11/2026).
-- Decisões do desenho e respostas da Carol (as recomendações valem):
-- 2. a lista mostra o número, o cliente e a etapa sem abrir o caso, e conta os casos por etapa;
-- 3. cadastrar pede o nome, um cliente, a etapa e o responsável; o processo pode esperar a
--    distribuição; cliente sem contrato não bloqueia (fica "sem contrato" até ligar um);
-- 4. a ficha mostra a etapa no âmbar, os dados do processo, os clientes com os próprios
--    honorários, os contratos ligados e as mudanças de etapa;
-- 5. mudar etapa pede o motivo (só para a equipe) e grava o aviso aos clientes com o texto da
--    etapa, que pode ser ajustado só daquela vez. O envio pelo WhatsApp vem com Conversas: até
--    lá, o aviso fica gravado como "não enviado";
-- 6. a etapa final pede o resultado (ganho, perda ou acordo) e encerra o caso;
-- 7. quem não tem Contratos nem Financeiro não recebe os valores de honorários;
-- pergunta 1: uma lista de etapas para o escritório todo; pergunta 2: todos com a área
-- Jurídico mudam a etapa e registram o resultado.
-- Ficam para as próximas partes: prazos e tarefas, documentos, o que está travando, editar as
-- etapas do escritório, o êxito que vai ao Financeiro e o resumo financeiro do caso.

insert into funcao_acoes (funcao, acao) values
  ('SOCIO', 'juridico.ver'), ('SOCIO', 'juridico.editar'),
  ('EQUIPE', 'juridico.ver'), ('EQUIPE', 'juridico.editar');

-- As áreas do direito da lista (decisão 3).
create function area_direito_valida(p text) returns boolean
language sql immutable
as $$ select p in ('TRABALHISTA', 'CIVEL', 'CONSUMIDOR', 'FAMILIA', 'PREVIDENCIARIO', 'SAUDE', 'TRIBUTARIO', 'OUTRA') $$;

-- Número do processo no padrão do CNJ (Resolução 65/2008): NNNNNNN-DD.AAAA.J.TR.OOOO, com os
-- dígitos verificadores pelo módulo 97. Guardado só com os 20 dígitos.
create function numero_cnj_valido(p text) returns boolean
language plpgsql immutable
as $$
begin
  if p is null then return null; end if;
  if p !~ '^[0-9]{20}$' then return false; end if;
  return substr(p, 8, 2)::integer = 98 - ((substr(p, 1, 7) || substr(p, 10, 11) || '00')::numeric % 97)::integer;
end $$;

-- As etapas do escritório (EX-07). Uma lista para o escritório todo; a última é a final.
create table etapas (
  id                uuid primary key default gen_random_uuid(),
  escritorio_id     uuid not null references escritorios (id) on delete restrict,
  ordem             integer not null check (ordem between 1 and 30),
  nome              text not null check (length(btrim(nome)) between 2 and 60),
  descricao         text check (length(btrim(descricao)) between 2 and 200),
  texto_cliente     text not null check (length(btrim(texto_cliente)) between 10 and 240),
  avisa_financeiro  boolean not null default false,
  final             boolean not null default false,
  criado_em         timestamptz not null default app_now(),
  versao            integer not null default 1,
  unique (escritorio_id, ordem) deferrable initially immediate
);
create unique index etapas_uma_final on etapas (escritorio_id) where final;
call proteger_tabela_escritorio('etapas');

-- Os casos (EX-01). O número do processo e o tribunal podem esperar a distribuição.
create table casos (
  id               uuid primary key default gen_random_uuid(),
  escritorio_id    uuid not null references escritorios (id) on delete restrict,
  nome             text not null check (length(btrim(nome)) between 3 and 120),
  area             text not null check (area_direito_valida(area)),
  parte_contraria  text check (length(btrim(parte_contraria)) between 2 and 160),
  numero_cnj       text check (numero_cnj_valido(numero_cnj)),
  tribunal         text check (length(btrim(tribunal)) between 2 and 60),
  vara             text check (length(btrim(vara)) between 2 and 120),
  sistema          text check (length(btrim(sistema)) between 2 and 40),
  distribuido_em   date,
  valor_causa      bigint check (valor_causa between 1 and 100000000000000),
  etapa_id         uuid not null references etapas (id) on delete restrict,
  etapa_desde      timestamptz not null default app_now(),
  responsavel_id   uuid not null references pessoas (id) on delete restrict,
  avisar_cliente   boolean not null default true,
  situacao         text not null default 'ANDAMENTO' check (situacao in ('ANDAMENTO', 'ENCERRADO')),
  resultado        text check (resultado in ('GANHO', 'PERDA', 'ACORDO')),
  encerrado_em     timestamptz,
  criado_por       uuid not null references pessoas (id) on delete restrict,
  criado_em        timestamptz not null default app_now(),
  versao           integer not null default 1,
  check ((situacao = 'ENCERRADO') = (encerrado_em is not null)),
  check ((situacao = 'ENCERRADO') = (resultado is not null))
);
create index casos_escritorio on casos (escritorio_id, situacao);
create unique index casos_numero on casos (escritorio_id, numero_cnj) where numero_cnj is not null;
call proteger_tabela_escritorio('casos');

-- Os clientes do caso, cada um com o papel e o próprio contrato (EX-01, CH-05).
create table caso_clientes (
  id             uuid primary key default gen_random_uuid(),
  escritorio_id  uuid not null references escritorios (id) on delete restrict,
  caso_id        uuid not null references casos (id) on delete restrict,
  cliente_id     uuid not null references clientes_escritorio (id) on delete restrict,
  papel          text not null check (papel in ('AUTOR', 'REU', 'INTERESSADO')),
  contrato_id    uuid references contratos (id) on delete restrict,
  ordem          integer not null,
  criado_em      timestamptz not null default app_now(),
  unique (caso_id, cliente_id)
);
create index caso_clientes_cliente on caso_clientes (escritorio_id, cliente_id);
create index caso_clientes_contrato on caso_clientes (contrato_id) where contrato_id is not null;
call proteger_tabela_escritorio('caso_clientes');

-- O histórico das etapas (decisão 5). Só inserção.
create table caso_etapa_mudancas (
  id               uuid primary key default gen_random_uuid(),
  ordem            bigint generated always as identity,
  escritorio_id    uuid not null references escritorios (id) on delete restrict,
  caso_id          uuid not null references casos (id) on delete restrict,
  de_etapa_id      uuid references etapas (id) on delete restrict,
  para_etapa_id    uuid not null references etapas (id) on delete restrict,
  motivo           text not null check (length(btrim(motivo)) between 3 and 1000),
  resultado        text check (resultado in ('GANHO', 'PERDA', 'ACORDO')),
  aviso_texto      text check (length(btrim(aviso_texto)) between 10 and 1000),
  aviso_enviado_em timestamptz,
  por              uuid not null references pessoas (id) on delete restrict,
  em               timestamptz not null default app_now()
);
create index caso_etapa_mudancas_caso on caso_etapa_mudancas (caso_id, ordem desc);
call proteger_tabela_escritorio('caso_etapa_mudancas');
create trigger caso_etapa_mudancas_so_acrescenta before update or delete on caso_etapa_mudancas
  for each row execute function financeiro_so_acrescenta();

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('etapas', false, 'Etapas dos casos do escritório, com o texto do aviso ao cliente', null, null, null, null, null, null, true),
 ('casos', true, 'Casos e processos: nome, área, parte contrária, número, tribunal, vara, valor da causa, etapa e responsável',
  'Acompanhar os processos dos clientes (EX-01)', 'Execução de contrato (LGPD, art. 7º, V) e exercício regular de direitos (art. 7º, VI)',
  'Escritório', 'Enquanto o escritório for cliente do T3jus e 5 anos depois do fim do contrato', 'Exportados ao escritório e apagados com ele', 'APROVADO', true),
 ('caso_clientes', true, 'Clientes de cada caso, com o papel no processo e o contrato',
  'Saber de quem é cada caso e os honorários de cada cliente (EX-01, CH-05)', 'Execução de contrato (LGPD, art. 7º, V)',
  'Escritório', 'Enquanto o escritório for cliente do T3jus e 5 anos depois do fim do contrato', 'Exportados ao escritório e apagados com ele', 'APROVADO', true),
 ('caso_etapa_mudancas', true, 'Mudanças de etapa dos casos: motivo, resultado e o texto do aviso ao cliente',
  'Histórico do andamento do caso e do que foi dito ao cliente (EX-03, EX-14)', 'Execução de contrato (LGPD, art. 7º, V)',
  'Escritório', 'Enquanto o escritório for cliente do T3jus e 5 anos depois do fim do contrato', 'Exportadas ao escritório e apagadas com ele', 'APROVADO', true);

-- ---------------------------------------------------------------------------------------
-- Peças.

-- Para a busca: minúsculas e sem acento ("metalurgica" acha "Metalúrgica").
create function sem_acento(p text) returns text
language sql immutable
as $$ select translate(lower(coalesce(p, '')), 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn') $$;

-- As 8 etapas sugeridas (decisão 8) nascem no primeiro uso do Jurídico.
create function etapas_garantir(p_escritorio uuid) returns void
language plpgsql
set search_path = public
as $$
begin
  if exists (select 1 from etapas where escritorio_id = p_escritorio) then return; end if;
  if contrato_situacao(p_escritorio) in ('CONSULTA', 'FECHADO') then return; end if;
  perform pg_advisory_xact_lock(hashtext('etapas:' || p_escritorio::text));
  if exists (select 1 from etapas where escritorio_id = p_escritorio) then return; end if;
  insert into etapas (escritorio_id, ordem, nome, descricao, texto_cliente, avisa_financeiro, final)
  select p_escritorio, o, n, d, t, f, o = 8
    from (values
      (1, 'Preparação', 'Juntar documentos e preparar o caso', 'estamos reunindo os documentos e preparando o seu caso. Se pedirmos algum papel, é para isso.', false),
      (2, 'Petição inicial', 'A ação foi distribuída', 'entramos com a ação na Justiça. Agora o juiz vai chamar a outra parte para responder.', false),
      (3, 'Citação e defesa', 'A outra parte responde', 'a outra parte foi chamada e vai apresentar a defesa dela. É normal levar algumas semanas.', false),
      (4, 'Instrução', 'Provas, perícias e audiências', 'é a fase das provas: perícias, testemunhas e audiências. Avisamos a data de cada uma.', false),
      (5, 'Sentença', 'O juiz decidiu', 'o juiz decidiu o caso. Vamos explicar a decisão e o que dá para fazer agora.', false),
      (6, 'Recurso', 'O tribunal revê a decisão', 'vamos pedir para o tribunal rever a decisão. Essa fase costuma levar alguns meses.', false),
      (7, 'Cumprimento', 'Hora de receber', 'a decisão é definitiva e agora é hora de receber. Avisamos quando o valor for liberado.', true),
      (8, 'Encerrado', 'Fim do caso: pede o resultado', 'o seu caso terminou. Obrigado pela confiança; seguimos à disposição.', false)
    ) v(o, n, d, t, f);
end $$;

create function etapas_lista(p_escritorio uuid) returns jsonb
language sql stable
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'ordem', e.ordem, 'nome', e.nome, 'descricao', e.descricao,
           'textoCliente', e.texto_cliente, 'avisaFinanceiro', e.avisa_financeiro, 'final', e.final,
           'casos', (select count(*) from casos c where c.etapa_id = e.id and c.situacao = 'ANDAMENTO')) order by e.ordem), '[]'::jsonb)
    from etapas e where e.escritorio_id = p_escritorio
$$;

-- O aviso ao cliente (decisão 5): começo e fim fixos, o meio é o texto da etapa.
create function aviso_etapa_texto(p_escritorio uuid, p_cliente uuid, p_parte text, p_meio text) returns text
language sql stable
set search_path = public
as $$
  select 'Olá, ' || split_part(btrim(k.nome), ' ', 1) || '. Aqui é do escritório ' || e.nome || '. Novidade no seu processo'
         || coalesce(' contra ' || nullif(btrim(p_parte), ''), '') || ': ' || btrim(p_meio)
         || ' Qualquer dúvida, é só responder esta mensagem.'
    from clientes_escritorio k, escritorios e where k.id = p_cliente and e.id = p_escritorio
$$;

create function caso_ve_honorarios(p_pessoa uuid, p_escritorio uuid) returns boolean
language sql stable
set search_path = public
as $$ select areas_da_pessoa(p_pessoa, p_escritorio) && array['CONTRATOS', 'FINANCEIRO'] $$;

create function caso_clientes_lista(p_caso uuid, p_valores boolean) returns jsonb
language sql stable
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', k.id, 'nome', k.nome, 'papel', cc.papel,
           'telefone', contato_principal(k.contatos) ->> 'telefone',
           'contrato', (select jsonb_build_object('id', ct.id, 'numero', ct.numero, 'situacao', ct.estado, 'assinadoEm', ct.assinado_em,
                          'condicoes', case when p_valores then honorario_lista(ct.escritorio_id, 'CONTRATO', ct.id) end)
                          from contratos ct where ct.id = cc.contrato_id)) order by cc.ordem), '[]'::jsonb)
    from caso_clientes cc join clientes_escritorio k on k.id = cc.cliente_id
   where cc.caso_id = p_caso
$$;

create function caso_linha(c casos) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', c.id, 'nome', c.nome, 'area', c.area, 'numero', c.numero_cnj, 'situacao', c.situacao, 'resultado', c.resultado,
    'parteContraria', c.parte_contraria,
    'cliente', (select jsonb_build_object('id', k.id, 'nome', k.nome) from caso_clientes cc join clientes_escritorio k on k.id = cc.cliente_id
                 where cc.caso_id = c.id order by cc.ordem limit 1),
    'outrosClientes', (select count(*) - 1 from caso_clientes cc where cc.caso_id = c.id),
    'semContrato', exists (select 1 from caso_clientes cc where cc.caso_id = c.id and cc.contrato_id is null),
    'etapa', (select jsonb_build_object('id', e.id, 'ordem', e.ordem, 'nome', e.nome, 'final', e.final) from etapas e where e.id = c.etapa_id),
    'responsavel', pessoa_ref(c.responsavel_id),
    'etapaDesde', c.etapa_desde)
$$;

-- Os clientes pedidos: ao menos um, do escritório, sem repetição; o contrato, se houver, é do
-- mesmo cliente e não está encerrado.
create function caso_clientes_erros(p_escritorio uuid, p_lista jsonb) returns text[]
language plpgsql
set search_path = public
as $$
declare
  x jsonb;
  v_cli uuid;
  v_ct uuid;
  v_vistos uuid[] := '{}';
  e text[] := '{}';
begin
  if jsonb_typeof(p_lista) is distinct from 'array' or jsonb_array_length(p_lista) = 0 then return array['clientes']; end if;
  if jsonb_array_length(p_lista) > 20 then return array['clientes']; end if;
  for x in select * from jsonb_array_elements(p_lista) loop
    begin v_cli := nullif(x ->> 'clienteId', '')::uuid; exception when others then v_cli := null; end;
    begin v_ct := nullif(x ->> 'contratoId', '')::uuid; exception when others then v_ct := null; end;
    if v_cli is null or v_cli = any (v_vistos)
       or not exists (select 1 from clientes_escritorio k where k.id = v_cli and k.escritorio_id = p_escritorio) then
      e := e || 'clientes'::text;
    end if;
    if coalesce(x ->> 'papel', '') not in ('AUTOR', 'REU', 'INTERESSADO') then e := e || 'clientes'::text; end if;
    if nullif(x ->> 'contratoId', '') is not null and (v_ct is null or not exists (
         select 1 from contratos ct where ct.id = v_ct and ct.escritorio_id = p_escritorio and ct.cliente_id = v_cli and ct.estado <> 'ENCERRADO')) then
      e := e || 'clientes'::text;
    end if;
    v_vistos := v_vistos || v_cli;
  end loop;
  return (select coalesce(array_agg(distinct v), '{}') from unnest(e) v);
end $$;

-- Os campos do caso (cadastrar e editar).
create function caso_erros(p_escritorio uuid, d jsonb) returns text[]
language plpgsql
set search_path = public
as $$
declare
  e text[] := '{}';
  v_resp uuid;
  v_num text := regexp_replace(coalesce(d ->> 'numero', ''), '[^0-9]', '', 'g');
begin
  begin v_resp := nullif(d ->> 'responsavelId', '')::uuid; exception when others then v_resp := null; end;
  if not coalesce(json_texto_ok(d, 'nome', 3, 120), false) then e := e || 'nome'::text; end if;
  if not coalesce(area_direito_valida(d ->> 'area'), false) then e := e || 'area'::text; end if;
  if nullif(btrim(coalesce(d ->> 'parteContraria', '')), '') is not null and not coalesce(json_texto_ok(d, 'parteContraria', 2, 160), false) then e := e || 'parteContraria'::text; end if;
  if nullif(btrim(coalesce(d ->> 'numero', '')), '') is not null and not coalesce(numero_cnj_valido(v_num), false) then e := e || 'numero'::text; end if;
  if nullif(btrim(coalesce(d ->> 'tribunal', '')), '') is not null and not coalesce(json_texto_ok(d, 'tribunal', 2, 60), false) then e := e || 'tribunal'::text; end if;
  if nullif(btrim(coalesce(d ->> 'vara', '')), '') is not null and not coalesce(json_texto_ok(d, 'vara', 2, 120), false) then e := e || 'vara'::text; end if;
  if nullif(btrim(coalesce(d ->> 'sistema', '')), '') is not null and not coalesce(json_texto_ok(d, 'sistema', 2, 40), false) then e := e || 'sistema'::text; end if;
  if d ? 'valorCausa' and d -> 'valorCausa' <> 'null'::jsonb and coalesce(json_inteiro(d, 'valorCausa'), 0) not between 1 and 100000000000000 then e := e || 'valorCausa'::text; end if;
  if nullif(d ->> 'distribuidoEm', '') is not null and (json_data(d, 'distribuidoEm') is null or json_data(d, 'distribuidoEm') > hoje_brasilia()) then e := e || 'distribuidoEm'::text; end if;
  if v_resp is null or not pessoa_do_escritorio(v_resp, p_escritorio) then e := e || 'responsavelId'::text; end if;
  return e;
end $$;

-- ---------------------------------------------------------------------------------------
-- Lista (decisão 2): busca, responsável, etapa, em andamento ou encerrados, e a contagem por etapa.
create function portal_juridico_casos(p_pessoa uuid, p_escritorio uuid, p_situacao text default 'ANDAMENTO', p_q text default null,
                                      p_responsavel uuid default null, p_etapa uuid default null) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_q text := nullif(btrim(coalesce(p_q, '')), '');
  v_dig text := regexp_replace(coalesce(p_q, ''), '[^0-9]', '', 'g');
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.ver');
  if coalesce(p_situacao, '') not in ('ANDAMENTO', 'ENCERRADO') then perform recusar_campos('Confira o filtro', 'situacao'); end if;
  perform etapas_garantir(p_escritorio);
  return jsonb_build_object(
    'etapas', etapas_lista(p_escritorio),
    'totais', jsonb_build_object(
      'andamento', (select count(*) from casos where escritorio_id = p_escritorio and situacao = 'ANDAMENTO'),
      'encerrados', (select count(*) from casos where escritorio_id = p_escritorio and situacao = 'ENCERRADO')),
    'responsaveis', coalesce((select jsonb_agg(pessoa_ref(r) order by (pessoa_ref(r) ->> 'nome'))
                                from (select distinct responsavel_id r from casos where escritorio_id = p_escritorio) s), '[]'::jsonb),
    'souDono', e_socio_dono(p_pessoa, p_escritorio),
    'casos', coalesce((
      select jsonb_agg(caso_linha(c) order by c.nome)
        from casos c
       where c.escritorio_id = p_escritorio and c.situacao = p_situacao
         and (p_responsavel is null or c.responsavel_id = p_responsavel)
         and (p_etapa is null or c.etapa_id = p_etapa)
         and (v_q is null
              or sem_acento(c.nome) like '%' || sem_acento(v_q) || '%'
              or sem_acento(c.parte_contraria) like '%' || sem_acento(v_q) || '%'
              or (length(v_dig) >= 4 and c.numero_cnj like '%' || v_dig || '%')
              or exists (select 1 from caso_clientes cc join clientes_escritorio k on k.id = cc.cliente_id
                          where cc.caso_id = c.id and sem_acento(k.nome) like '%' || sem_acento(v_q) || '%'))), '[]'::jsonb));
end $$;

-- O que o cadastro precisa: etapas, quem pode ser responsável e os contratos de cada cliente.
create function portal_juridico_opcoes(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.ver');
  perform etapas_garantir(p_escritorio);
  return jsonb_build_object(
    'etapas', etapas_lista(p_escritorio),
    'contratos', coalesce((select jsonb_agg(jsonb_build_object('id', ct.id, 'numero', ct.numero, 'clienteId', ct.cliente_id,
                              'situacao', ct.estado, 'assinadoEm', ct.assinado_em) order by ct.numero)
                             from contratos ct where ct.escritorio_id = p_escritorio and ct.estado <> 'ENCERRADO'), '[]'::jsonb));
end $$;

create function portal_juridico_caso_criar(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e text[];
  v_etapa uuid;
  v_id uuid;
  x record;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.editar');
  perform etapas_garantir(p_escritorio);
  e := caso_erros(p_escritorio, p_dados) || caso_clientes_erros(p_escritorio, p_dados -> 'clientes');
  begin v_etapa := nullif(p_dados ->> 'etapaId', '')::uuid; exception when others then v_etapa := null; end;
  if v_etapa is null or not exists (select 1 from etapas where id = v_etapa and escritorio_id = p_escritorio and not final) then
    e := e || 'etapaId'::text;
  end if;
  if cardinality(e) > 0 then perform recusar_campos('Confira o caso', variadic (select array_agg(distinct v order by v) from unnest(e) v)); end if;
  if nullif(btrim(coalesce(p_dados ->> 'numero', '')), '') is not null and exists (
       select 1 from casos where escritorio_id = p_escritorio and numero_cnj = regexp_replace(p_dados ->> 'numero', '[^0-9]', '', 'g')) then
    raise exception 'Já existe um caso com este número' using errcode = 'TC422',
      detail = jsonb_build_object('motivo', 'NUMERO_JA_CADASTRADO', 'campos', jsonb_build_array('numero'))::text;
  end if;

  insert into casos (escritorio_id, nome, area, parte_contraria, numero_cnj, tribunal, vara, sistema, distribuido_em, valor_causa,
                     etapa_id, responsavel_id, avisar_cliente, criado_por)
  values (p_escritorio, btrim(p_dados ->> 'nome'), p_dados ->> 'area', nullif(btrim(coalesce(p_dados ->> 'parteContraria', '')), ''),
          nullif(regexp_replace(coalesce(p_dados ->> 'numero', ''), '[^0-9]', '', 'g'), ''),
          nullif(btrim(coalesce(p_dados ->> 'tribunal', '')), ''), nullif(btrim(coalesce(p_dados ->> 'vara', '')), ''),
          nullif(btrim(coalesce(p_dados ->> 'sistema', '')), ''), json_data(p_dados, 'distribuidoEm'), json_inteiro(p_dados, 'valorCausa'),
          v_etapa, (p_dados ->> 'responsavelId')::uuid, coalesce((p_dados ->> 'avisarCliente')::boolean, true), p_pessoa)
  returning id into v_id;
  for x in select v, n from jsonb_array_elements(p_dados -> 'clientes') with ordinality t(v, n) loop
    insert into caso_clientes (escritorio_id, caso_id, cliente_id, papel, contrato_id, ordem)
    values (p_escritorio, v_id, (x.v ->> 'clienteId')::uuid, x.v ->> 'papel', nullif(x.v ->> 'contratoId', '')::uuid, x.n);
  end loop;
  insert into caso_etapa_mudancas (escritorio_id, caso_id, para_etapa_id, motivo, por)
  values (p_escritorio, v_id, v_etapa, 'Caso cadastrado.', p_pessoa);
  perform registrar_historico('juridico.caso_cadastrado', 'casos', v_id::text,
    jsonb_build_object('etapa', v_etapa, 'responsavel', p_dados ->> 'responsavelId', 'clientes', jsonb_array_length(p_dados -> 'clientes')));
  return jsonb_build_object('id', v_id, 'versao', 1);
end $$;

-- Ficha (decisão 4). Sem Contratos nem Financeiro, vem sem os valores dos honorários (decisão 7).
create function portal_juridico_caso(p_pessoa uuid, p_escritorio uuid, p_caso uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c casos;
  v_valores boolean;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.ver');
  select * into c from casos where id = p_caso and escritorio_id = p_escritorio;
  if c.id is null then raise exception 'Caso não encontrado' using errcode = 'TC404'; end if;
  v_valores := caso_ve_honorarios(p_pessoa, p_escritorio);
  return caso_linha(c) || jsonb_build_object(
    'tribunal', c.tribunal, 'vara', c.vara, 'sistema', c.sistema, 'distribuidoEm', c.distribuido_em, 'valorCausa', c.valor_causa,
    'avisarCliente', c.avisar_cliente, 'encerradoEm', c.encerrado_em, 'versao', c.versao, 'criadoEm', c.criado_em,
    'veHonorarios', v_valores,
    'clientes', caso_clientes_lista(c.id, v_valores),
    'etapas', etapas_lista(p_escritorio),
    'mudancas', coalesce((select jsonb_agg(jsonb_build_object(
        'para', (select jsonb_build_object('ordem', e.ordem, 'nome', e.nome) from etapas e where e.id = m.para_etapa_id),
        'de', (select jsonb_build_object('ordem', e.ordem, 'nome', e.nome) from etapas e where e.id = m.de_etapa_id),
        'motivo', m.motivo, 'resultado', m.resultado, 'aviso', m.aviso_texto, 'avisoEnviadoEm', m.aviso_enviado_em,
        'por', pessoa_ref(m.por), 'em', m.em) order by m.ordem desc)
      from caso_etapa_mudancas m where m.caso_id = c.id), '[]'::jsonb),
    'quemTemContratos', quem_tem_area(p_escritorio, 'CONTRATOS'));
end $$;

-- Editar os dados do processo.
create function portal_juridico_caso_editar(p_pessoa uuid, p_escritorio uuid, p_caso uuid, p_versao integer, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c casos;
  e text[];
  v_num text := nullif(regexp_replace(coalesce(p_dados ->> 'numero', ''), '[^0-9]', '', 'g'), '');
  v_versao integer;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.editar');
  select * into c from casos where id = p_caso and escritorio_id = p_escritorio for update;
  if c.id is null then raise exception 'Caso não encontrado' using errcode = 'TC404'; end if;
  e := caso_erros(p_escritorio, p_dados);
  if cardinality(e) > 0 then perform recusar_campos('Confira o caso', variadic (select array_agg(distinct v order by v) from unnest(e) v)); end if;
  if v_num is not null and exists (select 1 from casos where escritorio_id = p_escritorio and numero_cnj = v_num and id <> c.id) then
    raise exception 'Já existe um caso com este número' using errcode = 'TC422',
      detail = jsonb_build_object('motivo', 'NUMERO_JA_CADASTRADO', 'campos', jsonb_build_array('numero'))::text;
  end if;
  update casos set nome = btrim(p_dados ->> 'nome'), area = p_dados ->> 'area',
         parte_contraria = nullif(btrim(coalesce(p_dados ->> 'parteContraria', '')), ''), numero_cnj = v_num,
         tribunal = nullif(btrim(coalesce(p_dados ->> 'tribunal', '')), ''), vara = nullif(btrim(coalesce(p_dados ->> 'vara', '')), ''),
         sistema = nullif(btrim(coalesce(p_dados ->> 'sistema', '')), ''), distribuido_em = json_data(p_dados, 'distribuidoEm'),
         valor_causa = json_inteiro(p_dados, 'valorCausa'), responsavel_id = (p_dados ->> 'responsavelId')::uuid,
         avisar_cliente = coalesce((p_dados ->> 'avisarCliente')::boolean, c.avisar_cliente)
   where id = c.id and versao = p_versao
  returning versao into v_versao;
  if v_versao is null then perform conflito_versao('casos', c.id); end if;
  perform registrar_historico('juridico.caso_editado', 'casos', c.id::text,
    jsonb_build_object('antes', jsonb_build_object('nome', c.nome, 'responsavel', c.responsavel_id, 'numero', c.numero_cnj),
                       'depois', jsonb_build_object('nome', p_dados ->> 'nome', 'responsavel', p_dados ->> 'responsavelId', 'numero', v_num)));
  return jsonb_build_object('id', c.id, 'versao', v_versao);
end $$;

-- Adicionar cliente ao caso (EX-01), com o papel e, se houver, o contrato dele.
create function portal_juridico_caso_cliente(p_pessoa uuid, p_escritorio uuid, p_caso uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c casos;
  v_cli uuid;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.editar');
  select * into c from casos where id = p_caso and escritorio_id = p_escritorio for update;
  if c.id is null then raise exception 'Caso não encontrado' using errcode = 'TC404'; end if;
  if cardinality(caso_clientes_erros(p_escritorio, jsonb_build_array(p_dados))) > 0 then perform recusar_campos('Confira o cliente', 'clientes'); end if;
  v_cli := (p_dados ->> 'clienteId')::uuid;
  if exists (select 1 from caso_clientes where caso_id = c.id and cliente_id = v_cli) then
    perform recusar_motivo('Este cliente já está no caso', 'CLIENTE_JA_NO_CASO');
  end if;
  insert into caso_clientes (escritorio_id, caso_id, cliente_id, papel, contrato_id, ordem)
  values (p_escritorio, c.id, v_cli, p_dados ->> 'papel', nullif(p_dados ->> 'contratoId', '')::uuid,
          (select coalesce(max(ordem), 0) + 1 from caso_clientes where caso_id = c.id));
  perform registrar_historico('juridico.caso_cliente', 'casos', c.id::text, jsonb_build_object('cliente', v_cli, 'papel', p_dados ->> 'papel'));
  return jsonb_build_object('id', c.id);
end $$;

-- Mudar etapa (decisões 5 e 6). Motivo obrigatório; o aviso fica gravado com o texto que cada
-- cliente receberia (o envio vem com Conversas); a etapa final pede o resultado e encerra.
create function portal_juridico_caso_etapa(p_pessoa uuid, p_escritorio uuid, p_caso uuid, p_versao integer, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c casos;
  v_para etapas;
  v_etapa uuid;
  v_motivo text := nullif(btrim(coalesce(p_dados ->> 'motivo', '')), '');
  v_avisar boolean := coalesce((p_dados ->> 'avisar')::boolean, false);
  v_meio text := nullif(btrim(coalesce(p_dados ->> 'textoAviso', '')), '');
  v_resultado text := nullif(p_dados ->> 'resultado', '');
  v_aviso text;
  v_versao integer;
  e text[] := '{}';
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.editar');
  select * into c from casos where id = p_caso and escritorio_id = p_escritorio for update;
  if c.id is null then raise exception 'Caso não encontrado' using errcode = 'TC404'; end if;
  if c.situacao = 'ENCERRADO' then perform recusar_motivo('Este caso já foi encerrado', 'CASO_ENCERRADO'); end if;
  begin v_etapa := nullif(p_dados ->> 'etapaId', '')::uuid; exception when others then v_etapa := null; end;
  select * into v_para from etapas where id = v_etapa and escritorio_id = p_escritorio;
  if v_para.id is null then e := e || 'etapaId'::text;
  elsif v_para.id = c.etapa_id then perform recusar_motivo('O caso já está nesta etapa', 'MESMA_ETAPA');
  end if;
  if v_motivo is null or length(v_motivo) not between 3 and 1000 then e := e || 'motivo'::text; end if;
  if v_para.final and coalesce(v_resultado, '') not in ('GANHO', 'PERDA', 'ACORDO') then e := e || 'resultado'::text; end if;
  if v_meio is not null and length(v_meio) not between 10 and 240 then e := e || 'textoAviso'::text; end if;
  if cardinality(e) > 0 then
    raise exception 'Confira a mudança de etapa' using errcode = 'TC422',
      detail = jsonb_build_object('motivo', case when 'motivo' = any (e) then 'MOTIVO_OBRIGATORIO' when 'resultado' = any (e) then 'RESULTADO_OBRIGATORIO' end,
                                  'campos', (select jsonb_agg(distinct v order by v) from unnest(e) v))::text;
  end if;
  if c.versao <> p_versao then perform conflito_versao('casos', c.id); end if;
  if v_avisar then
    v_aviso := aviso_etapa_texto(p_escritorio, (select cliente_id from caso_clientes where caso_id = c.id order by ordem limit 1),
                                 c.parte_contraria, coalesce(v_meio, v_para.texto_cliente));
  end if;

  update casos set etapa_id = v_para.id, etapa_desde = app_now(),
         situacao = case when v_para.final then 'ENCERRADO' else situacao end,
         resultado = case when v_para.final then v_resultado end,
         encerrado_em = case when v_para.final then app_now() end
   where id = c.id
  returning versao into v_versao;
  insert into caso_etapa_mudancas (escritorio_id, caso_id, de_etapa_id, para_etapa_id, motivo, resultado, aviso_texto, por)
  values (p_escritorio, c.id, c.etapa_id, v_para.id, v_motivo, case when v_para.final then v_resultado end, v_aviso, p_pessoa);
  perform registrar_historico('juridico.etapa', 'casos', c.id::text,
    jsonb_build_object('de', c.etapa_id, 'para', v_para.id, 'resultado', case when v_para.final then v_resultado end, 'aviso', v_avisar));
  return jsonb_build_object('id', c.id, 'versao', v_versao, 'encerrado', v_para.final, 'aviso', v_aviso);
end $$;

-- Quem saiu da equipe passa os casos que eram dele (EX-10).
create function casos_passar_de_quem_saiu() returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_de uuid := (new.dados ->> 'pessoa_id')::uuid;
  v_para uuid := (new.dados ->> 'passou_para')::uuid;
begin
  if v_de is null or v_para is null then return new; end if;
  update casos set responsavel_id = v_para
   where escritorio_id = new.escritorio_id and responsavel_id = v_de and situacao = 'ANDAMENTO';
  return new;
end $$;
create trigger casos_passar_de_quem_saiu after insert on historico
  for each row when (new.acao = 'equipe.retirada') execute function casos_passar_de_quem_saiu();

-- As tabelas do Financeiro (0220 e 0230) nasceram com o prazo antigo; a guarda de 5 anos
-- (0210, decisão 2) vale para elas também.
update inventario_dados
   set prazo = 'Enquanto o escritório for cliente do T3jus e 5 anos depois do fim do contrato'
 where prazo = 'Enquanto o escritório for cliente do T3jus';

call fechar_acesso();
