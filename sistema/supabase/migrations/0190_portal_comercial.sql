-- Comercial do Portal (AP-02 a AP-06, IN-01, PD-02), tela aprovada em
-- docs/design/aprovadas/portal-comercial-contratos (Carol, 19/11/2026). Decisões do desenho:
-- 1. Atendimentos é a visão do escritório inteiro de quem precisa de retorno; o registro
--    continua na ficha do cliente;
-- 2. o retorno da proposta é o próximo contato do cliente: uma data só. Marcar o retorno na
--    proposta muda o próximo contato da ficha, e registrar um atendimento na ficha muda o
--    retorno da proposta (retornos_cliente + prox_contato);
-- 3. situações da proposta: rascunho, enviada (marcada à mão), em negociação, aceita, virou
--    contrato e recusada (com motivo de uma lista curta, que alimenta o Funil);
-- 4. a resposta da proposta grava um atendimento do cliente, que encerra o próximo contato;
-- 5. as condições de honorário ficam em honorario_condicoes, a mesma tabela que o contrato
--    vai usar: gerar o contrato copia as linhas (IN-01);
-- 6. o Funil não se arrasta: a etapa sai do que foi registrado. Sem pontuação de lead e sem
--    recurso de captação (VA-07, Provimento 205/2021 da OAB).
-- "Virou contrato" e os contratos do Funil e da Origem entram com a área Contratos.

insert into funcao_acoes (funcao, acao) values
  ('SOCIO', 'propostas.ver'), ('SOCIO', 'propostas.editar'),
  ('EQUIPE', 'propostas.ver'), ('EQUIPE', 'propostas.editar');

-- ---------------------------------------------------------------------------------------
-- Por que o primeiro contato não recebeu proposta (o Funil conta). Quem não tem proposta nem
-- motivo conta como "ainda em atendimento".

alter table clientes_escritorio
  add column funil_motivo text check (funil_motivo in ('NAO_PEGOU', 'NAO_VOLTOU')),
  add column funil_encerrado_em timestamptz,
  add check ((funil_motivo is null) = (funil_encerrado_em is null));

-- ---------------------------------------------------------------------------------------
-- Retornos marcados fora do atendimento (na proposta). O próximo contato do cliente é o mais
-- novo entre o do último atendimento e o do último retorno marcado (decisão 2).

create table retornos_cliente (
  id              uuid primary key default gen_random_uuid(),
  escritorio_id   uuid not null references escritorios (id) on delete restrict,
  cliente_id      uuid not null references clientes_escritorio (id) on delete restrict,
  em              date,
  oque            text check (length(btrim(oque)) between 1 and 200),
  responsavel_id  uuid references pessoas (id) on delete restrict,
  proposta_id     uuid,
  definido_por    uuid references pessoas (id) on delete restrict,
  definido_em     timestamptz not null default app_now(),
  check ((em is null) = (responsavel_id is null) and (em is null) = (oque is null))
);
create index retornos_cliente_cliente on retornos_cliente (escritorio_id, cliente_id, definido_em desc);
call proteger_tabela_escritorio('retornos_cliente');

create or replace function prox_contato(p_cliente uuid) returns jsonb
language sql stable
set search_path = public
as $$
  with ultimo as (
    select x.em, x.oque, x.resp from (
      select a.prox_em em, a.prox_oque oque, a.prox_responsavel resp, a.criado_em quando, 1 ordem
        from atendimentos a join clientes_escritorio c on c.id = a.cliente_id
       where a.cliente_id = p_cliente and (c.inativado_em is null or a.criado_em > c.inativado_em)
      union all
      select r.em, r.oque, r.responsavel_id, r.definido_em, 0
        from retornos_cliente r join clientes_escritorio c on c.id = r.cliente_id
       where r.cliente_id = p_cliente and (c.inativado_em is null or r.definido_em > c.inativado_em)) x
    order by x.quando desc, x.ordem limit 1)
  select case when u.em is null then null else jsonb_build_object(
           'em', u.em, 'oque', u.oque, 'vencido', u.em < hoje_brasilia(),
           'responsavel', jsonb_build_object('id', u.resp, 'nome', p.nome)) end
    from ultimo u
    join clientes_escritorio c on c.id = p_cliente and c.estado = 'ATIVO'
    left join pessoas p on p.id = u.resp
$$;

-- ---------------------------------------------------------------------------------------
-- Propostas.

create table propostas (
  id                   uuid primary key default gen_random_uuid(),
  escritorio_id        uuid not null references escritorios (id) on delete restrict,
  numero               text not null check (numero ~ '^P-[0-9]{4}-[0-9]{3,}$'),
  cliente_id           uuid not null references clientes_escritorio (id) on delete restrict,
  servico              text not null check (length(btrim(servico)) between 2 and 160),
  escopo               text check (length(btrim(escopo)) between 1 and 3000),
  responsavel_id       uuid not null references pessoas (id) on delete restrict,
  valida_ate           date,
  estado               text not null default 'RASCUNHO',
  enviada_em           timestamptz,
  respondida_em        date,
  resposta_canal       text check (resposta_canal in ('WHATSAPP', 'TELEFONE', 'PRESENCIAL', 'EMAIL', 'VIDEO')),
  motivo_recusa        text check (motivo_recusa in ('VALOR_ALTO', 'OUTRO_ESCRITORIO', 'DESISTIU', 'SEM_RESPOSTA', 'OUTRO')),
  contrato_pedido_em   timestamptz,
  contrato_pedido_por  uuid references pessoas (id) on delete restrict,
  criado_por           uuid not null references pessoas (id) on delete restrict,
  criado_em            timestamptz not null default app_now(),
  versao               integer not null default 1,
  unique (escritorio_id, numero),
  check ((estado = 'RECUSADA') = (motivo_recusa is not null)),
  check (estado = 'RASCUNHO' or enviada_em is not null)
);
create index propostas_escritorio on propostas (escritorio_id, criado_em desc);
create index propostas_cliente on propostas (escritorio_id, cliente_id);
call proteger_tabela_escritorio('propostas');
call ligar_guardiao('propostas');
insert into estados_iniciais (tabela, estado) values ('propostas', 'RASCUNHO');
insert into transicoes_permitidas (tabela, de, para) values
  ('propostas', 'RASCUNHO', 'ENVIADA'),
  ('propostas', 'ENVIADA', 'NEGOCIACAO'), ('propostas', 'ENVIADA', 'ACEITA'), ('propostas', 'ENVIADA', 'RECUSADA'),
  ('propostas', 'NEGOCIACAO', 'ACEITA'), ('propostas', 'NEGOCIACAO', 'RECUSADA');
alter table retornos_cliente add foreign key (proposta_id) references propostas (id) on delete restrict;

-- ---------------------------------------------------------------------------------------
-- Condições de honorário (CH-02, CH-06): da proposta e, com a área Contratos, do contrato.
-- params guarda só os campos do tipo, conferidos por honorario_erros. Dinheiro em centavos,
-- percentual em pontos-base (30% = 3000).

create table honorario_condicoes (
  id             uuid primary key default gen_random_uuid(),
  escritorio_id  uuid not null references escritorios (id) on delete restrict,
  dono_tipo      text not null check (dono_tipo in ('PROPOSTA', 'CONTRATO')),
  dono_id        uuid not null,
  ordem          smallint not null check (ordem between 1 and 7),
  tipo           text not null check (tipo in ('FIXO', 'PARCELADO', 'MENSAL', 'EXITO', 'SUCUMBENCIA', 'ATO', 'RECORRENTE')),
  params         jsonb not null check (jsonb_typeof(params) = 'object'),
  unique (dono_tipo, dono_id, tipo),
  unique (dono_tipo, dono_id, ordem)
);
create index honorario_condicoes_dono on honorario_condicoes (escritorio_id, dono_tipo, dono_id);
call proteger_tabela_escritorio('honorario_condicoes');

-- Inteiro de um campo do JSON, ou nulo se não for inteiro.
create function json_inteiro(p jsonb, k text) returns bigint
language sql immutable
as $$ select case when jsonb_typeof(p -> k) = 'number' and (p ->> k) ~ '^-?[0-9]+$' then (p ->> k)::bigint end $$;

create function json_data(p jsonb, k text) returns date
language plpgsql immutable
as $$
begin
  if coalesce(p ->> k, '') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then return null; end if;
  return (p ->> k)::date;
exception when others then return null;
end $$;

create function json_texto_ok(p jsonb, k text, p_min integer, p_max integer) returns boolean
language sql immutable
as $$ select jsonb_typeof(p -> k) = 'string' and length(btrim(p ->> k)) between p_min and p_max $$;

-- Os campos errados de uma condição (os mesmos nomes da tela). p_hoje recusa data passada
-- (contrato); a proposta não passa p_hoje. Espelha conferirCondicao (packages/domain).
create function honorario_erros(p_escritorio uuid, c jsonb, p_hoje date default null) returns text[]
language plpgsql stable
set search_path = public
as $$
declare
  e text[] := '{}';
  v_max bigint := 10000000000;
  a jsonb;
  i integer := 0;
  v_tipo text := c ->> 'tipo';
begin
  if v_tipo = 'FIXO' then
    if coalesce(json_inteiro(c, 'valor'), 0) not between 1 and v_max then e := e || 'valor'::text; end if;
    if json_data(c, 'vencimento') is null or json_data(c, 'vencimento') < p_hoje then e := e || 'vencimento'::text; end if;
  elsif v_tipo = 'PARCELADO' then
    if coalesce(json_inteiro(c, 'total'), 0) not between 1 and v_max then e := e || 'total'::text; end if;
    if coalesce(json_inteiro(c, 'parcelas'), 0) not between 1 and 120 then e := e || 'parcelas'::text;
    elsif json_inteiro(c, 'total') between 1 and v_max and json_inteiro(c, 'total') < json_inteiro(c, 'parcelas') then e := e || 'total'::text;
    end if;
    if json_data(c, 'primeiro') is null or json_data(c, 'primeiro') < p_hoje then e := e || 'primeiro'::text; end if;
  elsif v_tipo = 'MENSAL' then
    if coalesce(json_inteiro(c, 'valor'), 0) not between 1 and v_max then e := e || 'valor'::text; end if;
    if json_data(c, 'primeiro') is null or json_data(c, 'primeiro') < p_hoje then e := e || 'primeiro'::text; end if;
    if coalesce(jsonb_typeof(c -> 'meses'), 'null') <> 'null' and coalesce(json_inteiro(c, 'meses'), 0) not between 1 and 120 then e := e || 'meses'::text; end if;
    if coalesce(c ->> 'reajuste', '') <> '' and not json_texto_ok(c, 'reajuste', 2, 120) then e := e || 'reajuste'::text; end if;
  elsif v_tipo = 'EXITO' then
    if coalesce(json_inteiro(c, 'percentual'), 0) not between 1 and 10000 then e := e || 'percentual'::text; end if;
    if not coalesce(json_texto_ok(c, 'sobre', 2, 120), false) then e := e || 'sobre'::text; end if;
    if not coalesce(json_texto_ok(c, 'etapa', 2, 80), false) then e := e || 'etapa'::text; end if;
    if coalesce(json_inteiro(c, 'dias'), -1) not between 0 and 180 then e := e || 'dias'::text; end if;
  elsif v_tipo = 'SUCUMBENCIA' then
    if coalesce(c ->> 'quem', '') not in ('ESCRITORIO', 'DIVIDIDA') then e := e || 'quem'::text; end if;
    if c ->> 'quem' = 'DIVIDIDA' and coalesce(json_inteiro(c, 'percentualEscritorio'), 0) not between 1 and 9999 then e := e || 'percentualEscritorio'::text; end if;
    if not coalesce(json_texto_ok(c, 'etapa', 2, 80), false) then e := e || 'etapa'::text; end if;
  elsif v_tipo = 'ATO' then
    if jsonb_typeof(c -> 'atos') is distinct from 'array' or jsonb_array_length(c -> 'atos') not between 1 and 10 then
      e := e || 'atos'::text;
    else
      for a in select * from jsonb_array_elements(c -> 'atos') loop
        if jsonb_typeof(a) <> 'object' or not coalesce(json_texto_ok(a, 'nome', 2, 80), false) then e := e || ('atos.' || i || '.nome'); end if;
        if jsonb_typeof(a) <> 'object' or coalesce(json_inteiro(a, 'valor'), 0) not between 1 and v_max then e := e || ('atos.' || i || '.valor'); end if;
        i := i + 1;
      end loop;
    end if;
  elsif v_tipo = 'RECORRENTE' then
    if coalesce(json_inteiro(c, 'percentual'), 0) not between 1 and 10000 then e := e || 'percentual'::text; end if;
    if not coalesce(json_texto_ok(c, 'sobre', 2, 120), false) then e := e || 'sobre'::text; end if;
    if coalesce(c ->> 'etapa', '') = '' then
      if json_data(c, 'primeiro') is null or json_data(c, 'primeiro') < p_hoje then e := e || 'primeiro'::text; end if;
    elsif not json_texto_ok(c, 'etapa', 2, 80) then e := e || 'etapa'::text;
    end if;
    if coalesce(json_inteiro(c, 'dia'), 0) not between 1 and 28 then e := e || 'dia'::text; end if;
    if coalesce(json_inteiro(c, 'meses'), 0) not between 1 and 120 then e := e || 'meses'::text; end if;
    if coalesce(json_inteiro(c, 'diaLembrete'), 0) not between 1 and 28 then e := e || 'diaLembrete'::text; end if;
    if coalesce(c ->> 'quemLembrete', '') <> '' then
      begin
        if not pessoa_do_escritorio((c ->> 'quemLembrete')::uuid, p_escritorio) then e := e || 'quemLembrete'::text; end if;
      exception when others then e := e || 'quemLembrete'::text;
      end;
    end if;
  else
    e := e || 'tipo'::text;
  end if;
  return e;
end $$;

-- Só os campos do tipo, já normalizados (texto aparado, nulos explícitos).
create function honorario_normalizar(c jsonb) returns jsonb
language sql immutable
as $$
  select case c ->> 'tipo'
    when 'FIXO' then jsonb_build_object('valor', (c ->> 'valor')::bigint, 'vencimento', c ->> 'vencimento')
    when 'PARCELADO' then jsonb_build_object('total', (c ->> 'total')::bigint, 'parcelas', (c ->> 'parcelas')::integer, 'primeiro', c ->> 'primeiro')
    when 'MENSAL' then jsonb_build_object('valor', (c ->> 'valor')::bigint, 'primeiro', c ->> 'primeiro',
                                           'meses', nullif(c ->> 'meses', '')::integer, 'reajuste', nullif(btrim(coalesce(c ->> 'reajuste', '')), ''))
    when 'EXITO' then jsonb_build_object('percentual', (c ->> 'percentual')::integer, 'sobre', btrim(c ->> 'sobre'),
                                          'etapa', btrim(c ->> 'etapa'), 'dias', (c ->> 'dias')::integer)
    when 'SUCUMBENCIA' then jsonb_build_object('quem', c ->> 'quem', 'etapa', btrim(c ->> 'etapa'),
                                                'percentualEscritorio', case when c ->> 'quem' = 'DIVIDIDA' then (c ->> 'percentualEscritorio')::integer end)
    when 'ATO' then jsonb_build_object('atos', (select jsonb_agg(jsonb_build_object('nome', btrim(a ->> 'nome'), 'valor', (a ->> 'valor')::bigint))
                                                  from jsonb_array_elements(c -> 'atos') a))
    when 'RECORRENTE' then jsonb_build_object('percentual', (c ->> 'percentual')::integer, 'sobre', btrim(c ->> 'sobre'),
                                               'etapa', nullif(btrim(coalesce(c ->> 'etapa', '')), ''),
                                               'primeiro', case when coalesce(c ->> 'etapa', '') = '' then c ->> 'primeiro' end,
                                               'dia', (c ->> 'dia')::integer, 'meses', (c ->> 'meses')::integer,
                                               'diaLembrete', (c ->> 'diaLembrete')::integer,
                                               'quemLembrete', nullif(c ->> 'quemLembrete', ''), 'pedirWhats', coalesce((c ->> 'pedirWhats')::boolean, false))
  end
$$;

-- Confere a lista inteira; os erros vêm como "c1.valor", "c2.etapa", "condicoes".
create function honorario_erros_lista(p_escritorio uuid, p_lista jsonb, p_exigir boolean, p_hoje date default null) returns text[]
language plpgsql stable
set search_path = public
as $$
declare
  e text[] := '{}';
  c jsonb;
  n integer := 0;
  x text;
  v_tipos text[] := '{}';
begin
  if jsonb_typeof(coalesce(p_lista, '[]'::jsonb)) <> 'array' then return array['condicoes']; end if;
  if p_exigir and jsonb_array_length(coalesce(p_lista, '[]'::jsonb)) = 0 then e := e || 'condicoes'::text; end if;
  if jsonb_array_length(coalesce(p_lista, '[]'::jsonb)) > 7 then return array['condicoes']; end if;
  for c in select * from jsonb_array_elements(coalesce(p_lista, '[]'::jsonb)) loop
    n := n + 1;
    if jsonb_typeof(c) <> 'object' then e := e || ('c' || n || '.tipo'); continue; end if;
    if c ->> 'tipo' = any (v_tipos) then e := e || 'condicoes'::text; end if;
    v_tipos := v_tipos || (c ->> 'tipo');
    foreach x in array honorario_erros(p_escritorio, c, p_hoje) loop
      e := e || ('c' || n || '.' || x);
    end loop;
  end loop;
  return e;
end $$;

-- Grava as condições de um dono (troca as anteriores).
create function honorario_gravar(p_escritorio uuid, p_dono_tipo text, p_dono uuid, p_lista jsonb) returns void
language plpgsql
set search_path = public
as $$
begin
  delete from honorario_condicoes where escritorio_id = p_escritorio and dono_tipo = p_dono_tipo and dono_id = p_dono;
  insert into honorario_condicoes (escritorio_id, dono_tipo, dono_id, ordem, tipo, params)
  select p_escritorio, p_dono_tipo, p_dono,
         row_number() over (order by array_position(array['FIXO', 'PARCELADO', 'MENSAL', 'EXITO', 'SUCUMBENCIA', 'ATO', 'RECORRENTE'], c ->> 'tipo')),
         c ->> 'tipo', honorario_normalizar(c)
    from jsonb_array_elements(coalesce(p_lista, '[]'::jsonb)) c;
end $$;

create function honorario_lista(p_escritorio uuid, p_dono_tipo text, p_dono uuid) returns jsonb
language sql stable
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object('tipo', h.tipo) || h.params order by h.ordem), '[]'::jsonb)
    from honorario_condicoes h where h.escritorio_id = p_escritorio and h.dono_tipo = p_dono_tipo and h.dono_id = p_dono
$$;

-- Valor certo de uma lista: fixo, parcelas e até 12 mensalidades (decisão 9 do desenho).
create function honorario_valor_certo(p_escritorio uuid, p_dono_tipo text, p_dono uuid) returns bigint
language sql stable
set search_path = public
as $$
  select coalesce(sum(case h.tipo when 'FIXO' then (h.params ->> 'valor')::bigint
                                  when 'PARCELADO' then (h.params ->> 'total')::bigint
                                  when 'MENSAL' then (h.params ->> 'valor')::bigint * least(coalesce((h.params ->> 'meses')::integer, 12), 12)
                                  else 0 end), 0)
    from honorario_condicoes h where h.escritorio_id = p_escritorio and h.dono_tipo = p_dono_tipo and h.dono_id = p_dono
$$;

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('propostas', true,
  'Propostas de honorários: número, cliente, serviço, o que está incluído, responsável, validade, situação, resposta e motivo da recusa',
  'Oferecer o serviço a quem procurou o escritório e acompanhar a resposta (AP-05, IN-01)',
  'Procedimentos preliminares a contrato, a pedido do titular (LGPD, art. 7º, V)', 'Escritório',
  'Enquanto o escritório for cliente do T3jus',
  'Exportadas ao escritório e apagadas com ele', 'APROVADO', true),
 ('honorario_condicoes', false,
  'Condições de honorário das propostas e dos contratos: tipo, valores, datas, percentuais e etapas',
  null, null, null, null, null, null, true),
 ('retornos_cliente', true,
  'Retornos marcados na proposta: quando falar de novo com o cliente, o que fazer e com quem',
  'Acompanhar o cliente até a resposta da proposta (AP-06)',
  'Procedimentos preliminares a contrato, a pedido do titular (LGPD, art. 7º, V)', 'Escritório',
  'Enquanto o escritório for cliente do T3jus',
  'Exportados ao escritório e apagados com ele', 'APROVADO', true);

-- Cliente excluído a pedido (LGPD): o retorno e o que está incluído nas propostas saem junto.
create function comercial_apagar_do_excluido() returns trigger
language plpgsql
set search_path = public
as $$
begin
  delete from retornos_cliente where cliente_id = new.id;
  update propostas set escopo = null where cliente_id = new.id and escopo is not null;
  return new;
end $$;
create trigger comercial_apagar_do_excluido after update of estado on clientes_escritorio
  for each row when (new.estado = 'EXCLUIDO' and old.estado <> 'EXCLUIDO') execute function comercial_apagar_do_excluido();

-- ---------------------------------------------------------------------------------------
-- Leituras.

create function proposta_situacao(p propostas) returns text
language sql stable
as $$ select p.estado $$;

create function proposta_linha(p propostas) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', p.id, 'numero', p.numero, 'servico', p.servico, 'situacao', proposta_situacao(p),
    'cliente', (select jsonb_build_object('id', k.id, 'nome', k.nome, 'tipo', k.tipo) from clientes_escritorio k where k.id = p.cliente_id),
    'responsavel', pessoa_ref(p.responsavel_id),
    'vencida', p.estado in ('ENVIADA', 'NEGOCIACAO') and p.valida_ate < hoje_brasilia(),
    'condicoes', honorario_lista(p.escritorio_id, 'PROPOSTA', p.id),
    'retorno', case when p.estado in ('RASCUNHO', 'ENVIADA', 'NEGOCIACAO', 'ACEITA')
                    then (select jsonb_build_object('em', x ->> 'em', 'vencido', (x ->> 'vencido')::boolean) from prox_contato(p.cliente_id) x
                           where x is not null) end,
    'criadaEm', p.criado_em)
$$;

-- Quem tem a área Contratos no escritório (para "Pedir o contrato").
create function quem_tem_area(p_escritorio uuid, p_area text) returns jsonb
language sql stable
set search_path = public
as $$
  select coalesce(jsonb_agg(p.nome order by p.nome), '[]'::jsonb)
    from vinculos v join pessoas p on p.id = v.pessoa_id
   where v.escritorio_id = p_escritorio and v.revogado_em is null and v.funcao in ('SOCIO', 'EQUIPE')
     and p_area = any (areas_da_pessoa(v.pessoa_id, p_escritorio))
$$;

-- Retornos do escritório inteiro (AP-06, PD-02), agrupados: vencidos, hoje, próximos 7 dias,
-- depois e sem próximo contato (cliente ativo com atendimento e sem data marcada).
create function portal_comercial_retornos(p_pessoa uuid, p_escritorio uuid, p_responsavel uuid default null) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hoje date := hoje_brasilia();
begin
  perform entrar_area(p_pessoa, p_escritorio, 'COMERCIAL');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.ver');
  return (
    with todos as (
      select c.id, c.nome, c.tipo, prox_contato(c.id) p,
             (select jsonb_build_object('em', a.ocorrido_em, 'canal', a.canal, 'comQuem', a.com_quem, 'resumo', left(a.resumo, 160))
                from atendimentos a where a.cliente_id = c.id and (c.inativado_em is null or a.criado_em > c.inativado_em)
               order by a.ocorrido_em desc limit 1) ultimo
        from clientes_escritorio c
       where c.escritorio_id = p_escritorio and c.estado = 'ATIVO'),
    com as (
      select t.*, (t.p ->> 'em')::date em, (t.p -> 'responsavel' ->> 'id')::uuid resp,
             jsonb_build_object('clienteId', t.id, 'nome', t.nome, 'tipo', t.tipo, 'em', t.p ->> 'em', 'oque', t.p ->> 'oque',
                                'responsavel', t.p -> 'responsavel', 'ultimo', t.ultimo) j
        from todos t where t.p is not null),
    filtrado as (select * from com where p_responsavel is null or resp = p_responsavel),
    sem as (
      select jsonb_build_object('clienteId', t.id, 'nome', t.nome, 'tipo', t.tipo, 'em', null, 'oque', null, 'responsavel', null, 'ultimo', t.ultimo) j, t.nome
        from todos t where t.p is null and t.ultimo is not null and p_responsavel is null)
    select jsonb_build_object(
      'algum', exists (select 1 from com) or exists (select 1 from sem),
      'grupos', jsonb_build_object(
        'vencidos', coalesce((select jsonb_agg(j order by em, nome) from filtrado where em < v_hoje), '[]'::jsonb),
        'hoje', coalesce((select jsonb_agg(j order by nome) from filtrado where em = v_hoje), '[]'::jsonb),
        'semana', coalesce((select jsonb_agg(j order by em, nome) from filtrado where em > v_hoje and em <= v_hoje + 7), '[]'::jsonb),
        'depois', coalesce((select jsonb_agg(j order by em, nome) from filtrado where em > v_hoje + 7), '[]'::jsonb),
        'semData', coalesce((select jsonb_agg(j order by nome) from sem), '[]'::jsonb)),
      'totais', jsonb_build_object(
        'vencidos', (select count(*) from filtrado where em < v_hoje),
        'hoje', (select count(*) from filtrado where em = v_hoje),
        'semana', (select count(*) from filtrado where em > v_hoje and em <= v_hoje + 7),
        'semData', (select count(*) from sem)),
      'porResponsavel', coalesce((
        select jsonb_agg(jsonb_build_object('pessoa', pessoa_ref(resp), 'vencidos', v, 'hoje', h, 'total', n) order by v desc, h desc, (select nome from pessoas where id = resp))
          from (select resp, count(*) filter (where em < v_hoje) v, count(*) filter (where em = v_hoje) h, count(*) n
                  from com group by resp) x), '[]'::jsonb),
      'propostasEsperando', coalesce((
        select jsonb_agg(jsonb_build_object('id', p.id, 'numero', p.numero, 'cliente', k.nome, 'situacao', p.estado, 'enviadaEm', p.enviada_em,
                                            'responsavel', pessoa_ref(p.responsavel_id),
                                            'retorno', (select jsonb_build_object('em', x ->> 'em', 'vencido', (x ->> 'vencido')::boolean)
                                                          from prox_contato(p.cliente_id) x where x is not null))
                         order by (prox_contato(p.cliente_id) ->> 'em') nulls last, p.numero)
          from propostas p join clientes_escritorio k on k.id = p.cliente_id
         where p.escritorio_id = p_escritorio and p.estado in ('ENVIADA', 'NEGOCIACAO')
           and (p_responsavel is null or p.responsavel_id = p_responsavel)), '[]'::jsonb)));
end $$;

-- Lista de propostas: em andamento, viraram contrato ou recusadas; busca por cliente ou número.
create function portal_propostas(p_pessoa uuid, p_escritorio uuid, p_mostrar text default 'ANDAMENTO', p_q text default null) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_q text := lower(btrim(coalesce(p_q, '')));
  v_padrao text;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'COMERCIAL');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'propostas.ver');
  if coalesce(p_mostrar, 'ANDAMENTO') not in ('ANDAMENTO', 'CONTRATO', 'RECUSADAS') then perform recusar_campos('Filtro inválido', 'mostrar'); end if;
  if length(v_q) > 120 then perform recusar_campos('Busca longa demais', 'q'); end if;
  v_padrao := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  return jsonb_build_object(
    'algum', exists (select 1 from propostas where escritorio_id = p_escritorio),
    'contagem', jsonb_build_object(
      'andamento', (select count(*) from propostas where escritorio_id = p_escritorio and estado in ('RASCUNHO', 'ENVIADA', 'NEGOCIACAO', 'ACEITA')),
      'contrato', (select count(*) from propostas where escritorio_id = p_escritorio and estado = 'CONTRATO'),
      'recusadas', (select count(*) from propostas where escritorio_id = p_escritorio and estado = 'RECUSADA')),
    'propostas', coalesce((
      select jsonb_agg(proposta_linha(p) order by p.criado_em desc)
        from propostas p join clientes_escritorio k on k.id = p.cliente_id
       where p.escritorio_id = p_escritorio
         and case coalesce(p_mostrar, 'ANDAMENTO') when 'ANDAMENTO' then p.estado in ('RASCUNHO', 'ENVIADA', 'NEGOCIACAO', 'ACEITA')
                                                   when 'CONTRATO' then p.estado = 'CONTRATO' else p.estado = 'RECUSADA' end
         and (v_q = '' or lower(p.numero) like v_padrao or lower(k.nome) like v_padrao)), '[]'::jsonb));
end $$;

create function portal_proposta(p_pessoa uuid, p_escritorio uuid, p_proposta uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p propostas;
  v_contratos boolean;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'COMERCIAL');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'propostas.ver');
  select * into p from propostas where id = p_proposta and escritorio_id = p_escritorio;
  if p.id is null then raise exception 'Proposta não encontrada' using errcode = 'TC404'; end if;
  v_contratos := 'CONTRATOS' = any (areas_da_pessoa(p_pessoa, p_escritorio));
  return proposta_linha(p) || jsonb_build_object(
    'escopo', p.escopo, 'validaAte', p.valida_ate, 'enviadaEm', p.enviada_em, 'respondidaEm', p.respondida_em,
    'motivoRecusa', p.motivo_recusa, 'versao', p.versao,
    'origem', (select k.origem from clientes_escritorio k where k.id = p.cliente_id),
    'retornoCompleto', case when p.estado in ('RASCUNHO', 'ENVIADA', 'NEGOCIACAO', 'ACEITA') then prox_contato(p.cliente_id) end,
    'podeContrato', v_contratos,
    'quemTemContratos', quem_tem_area(p_escritorio, 'CONTRATOS'),
    'contratoPedidoEm', p.contrato_pedido_em,
    'historico', coalesce((
      select jsonb_agg(jsonb_build_object('em', h.ocorrido_em, 'acao', h.acao, 'autor', a.nome, 'dados', h.dados) order by h.id desc)
        from historico h left join pessoas a on a.id = h.autor_id
       where h.escritorio_id = p_escritorio and h.entidade = 'propostas' and h.entidade_id = p.id::text), '[]'::jsonb));
end $$;

-- Confere os dados da proposta. Rascunho só pede o cliente e o serviço; salvar a proposta pede
-- também o que está incluído, ao menos uma condição e o retorno.
create function proposta_conferir(p_escritorio uuid, p_dados jsonb, p_completa boolean) returns text[]
language plpgsql stable
set search_path = public
as $$
declare
  e text[] := '{}';
  v_cli uuid;
  v_resp uuid;
  v_ret_resp uuid;
  v_val date;
  v_ret date;
begin
  if jsonb_typeof(p_dados) is distinct from 'object' then return array['dados']; end if;
  begin v_cli := nullif(p_dados ->> 'clienteId', '')::uuid; exception when others then e := e || 'clienteId'::text; end;
  if v_cli is null or not exists (select 1 from clientes_escritorio k where k.id = v_cli and k.escritorio_id = p_escritorio and k.estado = 'ATIVO') then
    e := e || 'clienteId'::text;
  end if;
  if length(btrim(coalesce(p_dados ->> 'servico', ''))) not between 2 and 160 then e := e || 'servico'::text; end if;
  begin v_resp := nullif(p_dados ->> 'responsavelId', '')::uuid; exception when others then v_resp := null; end;
  if v_resp is null or not pessoa_do_escritorio(v_resp, p_escritorio) then e := e || 'responsavelId'::text; end if;
  if length(btrim(coalesce(p_dados ->> 'escopo', ''))) > 3000 or (p_completa and length(btrim(coalesce(p_dados ->> 'escopo', ''))) = 0) then
    e := e || 'escopo'::text;
  end if;
  v_val := json_data(p_dados, 'validaAte');
  if coalesce(p_dados ->> 'validaAte', '') <> '' and v_val is null then e := e || 'validaAte'::text; end if;
  if v_val < hoje_brasilia() then e := e || 'validaAte'::text; end if;
  e := e || honorario_erros_lista(p_escritorio, p_dados -> 'condicoes', p_completa);
  if jsonb_typeof(p_dados -> 'retorno') = 'object' and (coalesce(p_dados -> 'retorno' ->> 'em', '') <> '' or p_completa) then
    v_ret := json_data(p_dados -> 'retorno', 'em');
    if v_ret is null or v_ret < hoje_brasilia() then e := e || 'retorno.em'::text; end if;
    begin v_ret_resp := nullif(p_dados -> 'retorno' ->> 'responsavelId', '')::uuid; exception when others then v_ret_resp := null; end;
    if v_ret_resp is null or not pessoa_do_escritorio(v_ret_resp, p_escritorio) then e := e || 'retorno.responsavelId'::text; end if;
    if length(btrim(coalesce(p_dados -> 'retorno' ->> 'oque', ''))) > 200 then e := e || 'retorno.oque'::text; end if;
  elsif p_completa then
    e := e || 'retorno.em'::text;
  end if;
  return e;
end $$;

-- Marca o retorno da proposta como o próximo contato do cliente (decisão 2).
create function proposta_marcar_retorno(p_escritorio uuid, p_proposta uuid, p_pessoa uuid, p_retorno jsonb) returns void
language plpgsql
set search_path = public
as $$
declare
  p propostas;
begin
  select * into p from propostas where id = p_proposta;
  if jsonb_typeof(p_retorno) is distinct from 'object' or coalesce(p_retorno ->> 'em', '') = '' then return; end if;
  insert into retornos_cliente (escritorio_id, cliente_id, em, oque, responsavel_id, proposta_id, definido_por)
  values (p_escritorio, p.cliente_id, (p_retorno ->> 'em')::date,
          coalesce(nullif(btrim(coalesce(p_retorno ->> 'oque', '')), ''), 'Saber se aceita a proposta ' || p.numero),
          (p_retorno ->> 'responsavelId')::uuid, p.id, p_pessoa);
end $$;

create function portal_proposta_criar(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e text[];
  v_id uuid;
  v_numero text;
  v_ano text := to_char(hoje_brasilia(), 'YYYY');
  v_rascunho boolean := coalesce((p_dados ->> 'rascunho')::boolean, false);
begin
  perform entrar_area(p_pessoa, p_escritorio, 'COMERCIAL');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'propostas.editar');
  e := proposta_conferir(p_escritorio, p_dados, not v_rascunho);
  if cardinality(e) > 0 then perform recusar_campos('Confira a proposta', variadic (select array_agg(distinct x) from unnest(e) x)); end if;
  perform pg_advisory_xact_lock(hashtext('propostas:' || p_escritorio::text));
  select 'P-' || v_ano || '-' || lpad((count(*) + 1)::text, 3, '0') into v_numero
    from propostas where escritorio_id = p_escritorio and numero like 'P-' || v_ano || '-%';
  perform definir_transicao('RASCUNHO');
  insert into propostas (escritorio_id, numero, cliente_id, servico, escopo, responsavel_id, valida_ate, criado_por)
  values (p_escritorio, v_numero, (p_dados ->> 'clienteId')::uuid, btrim(p_dados ->> 'servico'),
          nullif(btrim(coalesce(p_dados ->> 'escopo', '')), ''), (p_dados ->> 'responsavelId')::uuid, json_data(p_dados, 'validaAte'), p_pessoa)
  returning id into v_id;
  perform honorario_gravar(p_escritorio, 'PROPOSTA', v_id, p_dados -> 'condicoes');
  perform proposta_marcar_retorno(p_escritorio, v_id, p_pessoa, p_dados -> 'retorno');
  perform registrar_historico('proposta.criada', 'propostas', v_id::text,
    jsonb_build_object('numero', v_numero, 'rascunho', v_rascunho,
                       'tipos', (select jsonb_agg(c ->> 'tipo') from jsonb_array_elements(coalesce(p_dados -> 'condicoes', '[]'::jsonb)) c)));
  return jsonb_build_object('id', v_id, 'numero', v_numero, 'versao', 1);
end $$;

-- Editar (PT-19, PT-03): segue a versão lida; a mudança fica no histórico com os campos e as
-- condições de antes e depois. Aceita, recusada e virou contrato não se editam.
create function portal_proposta_editar(p_pessoa uuid, p_escritorio uuid, p_proposta uuid, p_versao integer, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a propostas;
  e text[];
  v_versao integer;
  v_antes jsonb;
  v_depois jsonb;
  v_campos text[];
  v_ret_antes jsonb;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'COMERCIAL');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'propostas.editar');
  if p_versao is null then perform recusar_campos('Falta a versão lida', 'versao'); end if;
  select * into a from propostas where id = p_proposta and escritorio_id = p_escritorio;
  if a.id is null then raise exception 'Proposta não encontrada' using errcode = 'TC404'; end if;
  if a.estado not in ('RASCUNHO', 'ENVIADA', 'NEGOCIACAO') then perform recusar_motivo('A proposta já foi respondida', 'PROPOSTA_RESPONDIDA'); end if;
  e := proposta_conferir(p_escritorio, p_dados || jsonb_build_object('clienteId', a.cliente_id),
                         not (a.estado = 'RASCUNHO' and coalesce((p_dados ->> 'rascunho')::boolean, false)));
  if cardinality(e) > 0 then perform recusar_campos('Confira a proposta', variadic (select array_agg(distinct x) from unnest(e) x)); end if;
  v_antes := honorario_lista(p_escritorio, 'PROPOSTA', p_proposta);
  v_ret_antes := prox_contato(a.cliente_id);
  update propostas set servico = btrim(p_dados ->> 'servico'), escopo = nullif(btrim(coalesce(p_dados ->> 'escopo', '')), ''),
                       responsavel_id = (p_dados ->> 'responsavelId')::uuid, valida_ate = json_data(p_dados, 'validaAte')
   where id = p_proposta and escritorio_id = p_escritorio and versao = p_versao
  returning versao into v_versao;
  if v_versao is null then perform conflito_versao('propostas', p_proposta); end if;
  perform honorario_gravar(p_escritorio, 'PROPOSTA', p_proposta, p_dados -> 'condicoes');
  v_depois := honorario_lista(p_escritorio, 'PROPOSTA', p_proposta);
  if jsonb_typeof(p_dados -> 'retorno') = 'object' and coalesce(p_dados -> 'retorno' ->> 'em', '') <> ''
     and (v_ret_antes is null or v_ret_antes ->> 'em' is distinct from p_dados -> 'retorno' ->> 'em'
          or v_ret_antes -> 'responsavel' ->> 'id' is distinct from p_dados -> 'retorno' ->> 'responsavelId') then
    perform proposta_marcar_retorno(p_escritorio, p_proposta, p_pessoa,
      p_dados -> 'retorno' || jsonb_build_object('oque', coalesce(nullif(p_dados -> 'retorno' ->> 'oque', ''), v_ret_antes ->> 'oque')));
  end if;
  select coalesce(array_agg(k order by k), '{}') into v_campos
    from unnest(array['servico', 'escopo', 'responsavel_id', 'valida_ate']) k
   where to_jsonb(a) -> k is distinct from (select to_jsonb(x) -> k from propostas x where x.id = p_proposta);
  if cardinality(v_campos) > 0 or v_antes <> v_depois then
    perform registrar_historico('proposta.editada', 'propostas', p_proposta::text,
      jsonb_build_object('campos', to_jsonb(v_campos)) || case when v_antes <> v_depois
        then jsonb_build_object('condicoes_antes', v_antes, 'condicoes_depois', v_depois) else '{}'::jsonb end);
  end if;
  return jsonb_build_object('id', p_proposta, 'versao', v_versao);
end $$;

-- Marcar como enviada (à mão: o escritório envia como já envia). Pede a proposta completa.
create function portal_proposta_enviada(p_pessoa uuid, p_escritorio uuid, p_proposta uuid, p_versao integer) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  a propostas;
  e text[];
  v_versao integer;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'COMERCIAL');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'propostas.editar');
  select * into a from propostas where id = p_proposta and escritorio_id = p_escritorio;
  if a.id is null then raise exception 'Proposta não encontrada' using errcode = 'TC404'; end if;
  if a.estado <> 'RASCUNHO' then perform recusar_motivo('A proposta já foi enviada', 'JA_ENVIADA'); end if;
  if a.escopo is null or not exists (select 1 from honorario_condicoes where dono_tipo = 'PROPOSTA' and dono_id = a.id) then
    perform recusar_motivo('Complete a proposta antes de enviar', 'PROPOSTA_INCOMPLETA');
  end if;
  perform definir_transicao('ENVIADA');
  update propostas set estado = 'ENVIADA', enviada_em = app_now()
   where id = p_proposta and escritorio_id = p_escritorio and versao = p_versao
  returning versao into v_versao;
  if v_versao is null then perform conflito_versao('propostas', p_proposta); end if;
  return v_versao;
end $$;

-- Registrar a resposta (decisão 4): aceitou, pediu mudança ou recusou (com motivo). Grava o
-- atendimento do cliente, que encerra o próximo contato; no pedido de mudança, o retorno fica
-- para hoje com o responsável, para responder ao cliente.
create function portal_proposta_resposta(p_pessoa uuid, p_escritorio uuid, p_proposta uuid, p_versao integer, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a propostas;
  e text[] := '{}';
  v_resp text := p_dados ->> 'resposta';
  v_em date := json_data(p_dados, 'em');
  v_canal text := p_dados ->> 'canal';
  v_motivo text := nullif(p_dados ->> 'motivo', '');
  v_obs text := nullif(btrim(coalesce(p_dados ->> 'observacao', '')), '');
  v_estado text;
  v_versao integer;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'COMERCIAL');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'propostas.editar');
  select * into a from propostas where id = p_proposta and escritorio_id = p_escritorio;
  if a.id is null then raise exception 'Proposta não encontrada' using errcode = 'TC404'; end if;
  if a.estado not in ('ENVIADA', 'NEGOCIACAO') then perform recusar_motivo('Marque a proposta como enviada antes', 'PROPOSTA_NAO_ENVIADA'); end if;
  if coalesce(v_resp, '') not in ('ACEITOU', 'MUDANCA', 'RECUSOU') then e := e || 'resposta'::text; end if;
  if v_em is null or v_em > hoje_brasilia() then e := e || 'em'::text; end if;
  if coalesce(v_canal, '') not in ('WHATSAPP', 'TELEFONE', 'PRESENCIAL', 'EMAIL', 'VIDEO') then e := e || 'canal'::text; end if;
  if v_resp = 'RECUSOU' and coalesce(v_motivo, '') not in ('VALOR_ALTO', 'OUTRO_ESCRITORIO', 'DESISTIU', 'SEM_RESPOSTA', 'OUTRO') then e := e || 'motivo'::text; end if;
  if length(coalesce(v_obs, '')) > 1000 then e := e || 'observacao'::text; end if;
  if cardinality(e) > 0 then perform recusar_campos('Confira a resposta', variadic e); end if;
  v_estado := case v_resp when 'ACEITOU' then 'ACEITA' when 'RECUSOU' then 'RECUSADA' else 'NEGOCIACAO' end;
  if v_estado <> a.estado then perform definir_transicao(v_estado, case when v_resp = 'RECUSOU' then v_motivo end); end if;
  update propostas set estado = v_estado, respondida_em = v_em, resposta_canal = v_canal,
                       motivo_recusa = case when v_resp = 'RECUSOU' then v_motivo end
   where id = p_proposta and escritorio_id = p_escritorio and versao = p_versao
  returning versao into v_versao;
  if v_versao is null then perform conflito_versao('propostas', p_proposta); end if;
  insert into atendimentos (escritorio_id, cliente_id, ocorrido_em, canal, atendido_por, resumo, criado_por)
  values (p_escritorio, a.cliente_id,
          case when v_em = hoje_brasilia() then app_now() else (v_em + time '12:00') at time zone 'America/Sao_Paulo' end,
          v_canal, p_pessoa,
          case v_resp when 'ACEITOU' then 'Aceitou a proposta ' || a.numero || '.'
                      when 'RECUSOU' then 'Recusou a proposta ' || a.numero || '.'
                      else 'Pediu mudança na proposta ' || a.numero || '.' end || coalesce(' ' || v_obs, ''),
          p_pessoa);
  if v_resp = 'MUDANCA' then
    perform proposta_marcar_retorno(p_escritorio, p_proposta, p_pessoa,
      jsonb_build_object('em', hoje_brasilia(), 'responsavelId', a.responsavel_id, 'oque', 'Responder ao pedido de mudança da proposta ' || a.numero));
  end if;
  perform registrar_historico('proposta.resposta', 'propostas', p_proposta::text,
    jsonb_build_object('resposta', v_resp, 'em', v_em, 'canal', v_canal, 'motivo', v_motivo, 'observacao', v_obs));
  return jsonb_build_object('id', p_proposta, 'versao', v_versao, 'situacao', v_estado);
end $$;

-- Quem tem Comercial e não tem Contratos pede o contrato da proposta aceita (decisão 7). O
-- pedido fica na proposta e no histórico; quem tem Contratos vê na área Contratos.
create function portal_proposta_pedir_contrato(p_pessoa uuid, p_escritorio uuid, p_proposta uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  a propostas;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'COMERCIAL');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'propostas.editar');
  select * into a from propostas where id = p_proposta and escritorio_id = p_escritorio;
  if a.id is null then raise exception 'Proposta não encontrada' using errcode = 'TC404'; end if;
  if a.estado <> 'ACEITA' then perform recusar_motivo('Só a proposta aceita pede contrato', 'PROPOSTA_NAO_ACEITA'); end if;
  if a.contrato_pedido_em is not null then return; end if;
  update propostas set contrato_pedido_em = app_now(), contrato_pedido_por = p_pessoa where id = p_proposta;
  perform registrar_historico('proposta.contrato_pedido', 'propostas', p_proposta::text, '{}'::jsonb);
end $$;

-- Início do período do Funil e da Origem: 30 ou 90 dias, ou 12 meses.
create function comercial_inicio(p_periodo text) returns date
language plpgsql stable
set search_path = public
as $$
begin
  return case coalesce(p_periodo, '90') when '30' then hoje_brasilia() - 29 when '90' then hoje_brasilia() - 89
                                        when '12' then (hoje_brasilia() - interval '12 months')::date + 1
         else null end;
end $$;

-- Funil (AP-03, IN-01): primeiros contatos do período (clientes cadastrados nele), quantos
-- receberam proposta e quantos viraram contrato, quem ficou de fora em cada passagem e por
-- quê, e quem está em cada etapa agora.
create function portal_comercial_funil(p_pessoa uuid, p_escritorio uuid, p_periodo text default '90') returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_de date := comercial_inicio(p_periodo);
  v_ini timestamptz;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'COMERCIAL');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'propostas.ver');
  if v_de is null then perform recusar_campos('Período inválido', 'periodo'); end if;
  v_ini := v_de::timestamp at time zone 'America/Sao_Paulo';
  return (
    with primeiros as (
      select c.id, c.nome, c.funil_motivo,
             exists (select 1 from propostas p where p.cliente_id = c.id and p.estado <> 'RASCUNHO') proposta,
             exists (select 1 from propostas p where p.cliente_id = c.id and p.estado = 'CONTRATO') contrato
        from clientes_escritorio c
       where c.escritorio_id = p_escritorio and c.criado_em >= v_ini and c.estado <> 'EXCLUIDO'),
    ultimas as (
      select distinct on (p.cliente_id) p.* from propostas p join primeiros f on f.id = p.cliente_id
       where p.estado <> 'RASCUNHO' order by p.cliente_id, p.criado_em desc),
    agora_p as (
      select p.estado, jsonb_build_object('id', p.id, 'numero', p.numero, 'clienteId', k.id, 'nome', k.nome,
                                          'retorno', (select jsonb_build_object('em', x ->> 'em', 'vencido', (x ->> 'vencido')::boolean)
                                                        from prox_contato(k.id) x where x is not null),
                                          'valorCerto', honorario_valor_certo(p_escritorio, 'PROPOSTA', p.id),
                                          'condicoes', honorario_lista(p_escritorio, 'PROPOSTA', p.id)) j, p.criado_em
        from propostas p join clientes_escritorio k on k.id = p.cliente_id
       where p.escritorio_id = p_escritorio and p.estado in ('ENVIADA', 'NEGOCIACAO', 'ACEITA'))
    select jsonb_build_object(
      'de', v_de, 'ate', hoje_brasilia(),
      'primeiros', (select count(*) from primeiros),
      'comProposta', (select count(*) from primeiros where proposta),
      'contratos', (select count(*) from primeiros where contrato),
      'semProposta', jsonb_build_object(
        'naoPegou', (select count(*) from primeiros where not proposta and funil_motivo = 'NAO_PEGOU'),
        'naoVoltou', (select count(*) from primeiros where not proposta and funil_motivo = 'NAO_VOLTOU'),
        'emAtendimento', (select count(*) from primeiros where not proposta and funil_motivo is null)),
      'depoisProposta', jsonb_build_object(
        'andamento', (select count(*) from ultimas where estado in ('ENVIADA', 'NEGOCIACAO', 'ACEITA')),
        'recusadas', coalesce((select jsonb_agg(jsonb_build_object('motivo', motivo_recusa, 'n', n) order by n desc, motivo_recusa)
                                 from (select motivo_recusa, count(*) n from ultimas where estado = 'RECUSADA' group by motivo_recusa) x), '[]'::jsonb)),
      'agora', jsonb_build_object(
        'primeiro', coalesce((
          select jsonb_agg(jsonb_build_object(
                   'clienteId', f.id, 'nome', f.nome,
                   'rascunho', exists (select 1 from propostas p where p.cliente_id = f.id and p.estado = 'RASCUNHO'),
                   'semRetorno', prox_contato(f.id) is null,
                   'detalhe', coalesce((select 'Proposta em rascunho · ' || split_part(pe.nome, ' ', 1) from propostas p join pessoas pe on pe.id = p.responsavel_id
                                         where p.cliente_id = f.id and p.estado = 'RASCUNHO' order by p.criado_em desc limit 1),
                                       (select 'Atendido em ' || to_char(a.ocorrido_em at time zone 'America/Sao_Paulo', 'DD/MM')
                                          from atendimentos a where a.cliente_id = f.id order by a.ocorrido_em desc limit 1),
                                       'Cadastrado, ainda sem atendimento')) order by f.nome)
            from primeiros f join clientes_escritorio k on k.id = f.id
           where not f.proposta and f.funil_motivo is null and k.estado = 'ATIVO'), '[]'::jsonb),
        'enviada', coalesce((select jsonb_agg(j order by criado_em desc) from agora_p where estado = 'ENVIADA'), '[]'::jsonb),
        'negociacao', coalesce((select jsonb_agg(j order by criado_em desc) from agora_p where estado = 'NEGOCIACAO'), '[]'::jsonb),
        'aceita', coalesce((select jsonb_agg(j order by criado_em desc) from agora_p where estado = 'ACEITA'), '[]'::jsonb))));
end $$;

-- Origem dos contatos (AP-04): por origem, contatos, propostas, contratos e valor certo
-- contratado; e quem mais indicou. A origem é a do cadastro do cliente.
create function portal_comercial_origem(p_pessoa uuid, p_escritorio uuid, p_periodo text default '90') returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_de date := comercial_inicio(p_periodo);
  v_ini timestamptz;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'COMERCIAL');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'propostas.ver');
  if v_de is null then perform recusar_campos('Período inválido', 'periodo'); end if;
  v_ini := v_de::timestamp at time zone 'America/Sao_Paulo';
  return (
    with cs as (
      select c.id, c.origem, c.origem_indicacao,
             exists (select 1 from propostas p where p.cliente_id = c.id and p.estado <> 'RASCUNHO') proposta,
             exists (select 1 from propostas p where p.cliente_id = c.id and p.estado = 'CONTRATO') contrato
        from clientes_escritorio c
       where c.escritorio_id = p_escritorio and c.criado_em >= v_ini and c.estado <> 'EXCLUIDO')
    select jsonb_build_object(
      'de', v_de, 'ate', hoje_brasilia(), 'total', (select count(*) from cs),
      'linhas', coalesce((
        select jsonb_agg(jsonb_build_object('origem', origem, 'contatos', n, 'propostas', np, 'contratos', nc, 'valorCerto', 0)
                         order by nc desc, n desc, origem nulls last)
          from (select origem, count(*) n, count(*) filter (where proposta) np, count(*) filter (where contrato) nc from cs group by origem) x), '[]'::jsonb),
      'indicacoes', coalesce((
        select jsonb_agg(jsonb_build_object('nome', i, 'n', n) order by n desc, i)
          from (select btrim(origem_indicacao) i, count(*) n from cs where origem_indicacao is not null group by btrim(origem_indicacao)) x), '[]'::jsonb)));
end $$;

-- ---------------------------------------------------------------------------------------
-- EX-10: quem sai da equipe passa as propostas em andamento e os retornos marcados com ela
-- para a pessoa escolhida na retirada. Ninguém fica sem dono.
create function comercial_passar_de_quem_saiu() returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_de uuid := (new.dados ->> 'pessoa_id')::uuid;
  v_para uuid := (new.dados ->> 'passou_para')::uuid;
  v_id uuid;
  r record;
begin
  if v_de is null or v_para is null then return new; end if;
  for v_id in
    update propostas set responsavel_id = v_para
     where escritorio_id = new.escritorio_id and responsavel_id = v_de and estado in ('RASCUNHO', 'ENVIADA', 'NEGOCIACAO', 'ACEITA')
    returning id
  loop
    perform registrar_historico('proposta.responsavel_passado', 'propostas', v_id::text, jsonb_build_object('de', v_de, 'para', v_para));
  end loop;
  for r in
    select c.id, (x ->> 'em')::date em, x ->> 'oque' oque
      from clientes_escritorio c, prox_contato(c.id) x
     where c.escritorio_id = new.escritorio_id and c.estado = 'ATIVO' and (x -> 'responsavel' ->> 'id')::uuid = v_de
  loop
    insert into retornos_cliente (escritorio_id, cliente_id, em, oque, responsavel_id, definido_por)
    values (new.escritorio_id, r.id, r.em, r.oque, v_para, null);
  end loop;
  return new;
end $$;

create trigger comercial_passar_de_quem_saiu after insert on historico
  for each row when (new.acao = 'equipe.retirada') execute function comercial_passar_de_quem_saiu();

call fechar_acesso();
