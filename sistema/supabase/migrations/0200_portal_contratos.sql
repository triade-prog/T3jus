-- Contratos do Portal (CH-01 a CH-04, CH-06, IN-01), tela aprovada em
-- docs/design/aprovadas/portal-comercial-contratos (Carol, 19/11/2026). Decisões do desenho:
-- 11. o contrato se cria numa página em passos (cliente, responsáveis, condições, cláusulas);
-- 12 a 14. as condições usam as mesmas peças da proposta (honorario_condicoes, dono CONTRATO);
-- 17. um responsável recebe os lembretes; os advogados do contrato são marcados à parte;
-- 19. o contrato nasce em elaboração e fica ativo quando a assinatura é registrada: só então
--     a programação dos recebimentos existe (pergunta 1: o Financeiro só vê o assinado);
-- 20. mudar condição de contrato ativo pede motivo e refaz só os recebimentos futuros;
--     encerrar para as cobranças novas e não apaga nada;
-- 23. o percentual recorrente sobre base que muda: alguém informa a base do mês e o valor sai.
-- Ficam para depois: casos e etapas do Jurídico (CH-05, CH-07), documentos gerados (CH-08) e
-- o arquivo assinado.

insert into funcao_acoes (funcao, acao) values
  ('SOCIO', 'contratos.ver'), ('SOCIO', 'contratos.editar'),
  ('EQUIPE', 'contratos.ver'), ('EQUIPE', 'contratos.editar');

-- A proposta aceita vira contrato (IN-01).
insert into transicoes_permitidas (tabela, de, para) values ('propostas', 'ACEITA', 'CONTRATO');

create table contratos (
  id                   uuid primary key default gen_random_uuid(),
  escritorio_id        uuid not null references escritorios (id) on delete restrict,
  numero               text not null check (numero ~ '^C-[0-9]{4}-[0-9]{3,}$'),
  cliente_id           uuid not null references clientes_escritorio (id) on delete restrict,
  objeto               text not null check (length(btrim(objeto)) between 2 and 400),
  observacoes          text check (length(btrim(observacoes)) between 1 and 3000),
  responsavel_id       uuid not null references pessoas (id) on delete restrict,
  proposta_id          uuid unique references propostas (id) on delete restrict,
  estado               text not null default 'ELABORACAO',
  assinado_em          date,
  assinatura_por       uuid references pessoas (id) on delete restrict,
  encerrado_em         timestamptz,
  motivo_encerramento  text check (length(btrim(motivo_encerramento)) between 3 and 500),
  criado_por           uuid not null references pessoas (id) on delete restrict,
  criado_em            timestamptz not null default app_now(),
  versao               integer not null default 1,
  unique (escritorio_id, numero),
  check ((estado = 'ENCERRADO') = (encerrado_em is not null)),
  check ((encerrado_em is null) = (motivo_encerramento is null)),
  check (estado = 'ELABORACAO' or estado = 'ENCERRADO' or assinado_em is not null)
);
create index contratos_escritorio on contratos (escritorio_id, criado_em desc);
create index contratos_cliente on contratos (escritorio_id, cliente_id);
call proteger_tabela_escritorio('contratos');
call ligar_guardiao('contratos');
insert into estados_iniciais (tabela, estado) values ('contratos', 'ELABORACAO');
insert into transicoes_permitidas (tabela, de, para) values
  ('contratos', 'ELABORACAO', 'ATIVO'), ('contratos', 'ELABORACAO', 'ENCERRADO'), ('contratos', 'ATIVO', 'ENCERRADO');

-- Advogados no contrato e na procuração (CH-03).
create table contrato_advogados (
  escritorio_id  uuid not null references escritorios (id) on delete restrict,
  contrato_id    uuid not null references contratos (id) on delete restrict,
  pessoa_id      uuid not null references pessoas (id) on delete restrict,
  primary key (contrato_id, pessoa_id)
);
call proteger_tabela_escritorio('contrato_advogados');

-- A programação dos recebimentos (CH-04): nasce na assinatura. Nada se apaga: quando a
-- condição muda ou o contrato acaba, o que ainda ia vencer fica cancelado, com o motivo.
create table recebimentos_previstos (
  id               uuid primary key default gen_random_uuid(),
  escritorio_id    uuid not null references escritorios (id) on delete restrict,
  contrato_id      uuid not null references contratos (id) on delete restrict,
  tipo             text not null check (tipo in ('FIXO', 'PARCELADO', 'MENSAL', 'EXITO', 'SUCUMBENCIA', 'ATO', 'RECORRENTE')),
  descricao        text not null check (length(descricao) between 1 and 200),
  vencimento       date not null,
  valor            bigint check (valor between 1 and 10000000000),
  origem           text not null check (origem in ('PROGRAMADO', 'BASE')),
  criado_em        timestamptz not null default app_now(),
  cancelado_em     timestamptz,
  cancelado_motivo text check (length(cancelado_motivo) between 3 and 500),
  check ((cancelado_em is null) = (cancelado_motivo is null)),
  check (valor is not null or tipo = 'RECORRENTE')
);
create index recebimentos_previstos_contrato on recebimentos_previstos (escritorio_id, contrato_id, vencimento);
call proteger_tabela_escritorio('recebimentos_previstos');

-- A base do mês do percentual recorrente (decisão 23): uma por recebimento.
create table bases_mensais (
  id              uuid primary key default gen_random_uuid(),
  escritorio_id   uuid not null references escritorios (id) on delete restrict,
  recebimento_id  uuid not null unique references recebimentos_previstos (id) on delete restrict,
  valor_base      bigint not null check (valor_base between 1 and 10000000000),
  fonte           text not null check (fonte in ('EXTRATO', 'CONTRACHEQUE', 'CLIENTE')),
  informado_por   uuid not null references pessoas (id) on delete restrict,
  informado_em    timestamptz not null default app_now()
);
call proteger_tabela_escritorio('bases_mensais');

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('contratos', true,
  'Contratos de honorários: número, cliente, objeto, observações, responsável, situação, data da assinatura e motivo do encerramento',
  'Prestar o serviço contratado e cobrar os honorários combinados (CH-01 a CH-04)',
  'Execução de contrato (LGPD, art. 7º, V)', 'Escritório',
  'Enquanto o escritório for cliente do T3jus',
  'Exportados ao escritório e apagados com ele', 'APROVADO', true),
 ('contrato_advogados', false, 'Advogados da equipe marcados em cada contrato', null, null, null, null, null, null, true),
 ('recebimentos_previstos', false, 'Programação dos recebimentos de cada contrato: o quê, vencimento, valor e cancelamento', null, null, null, null, null, null, true),
 ('bases_mensais', true,
  'Valor mensal informado como base do percentual recorrente (por exemplo, o benefício do cliente) e de onde veio',
  'Calcular o honorário do mês combinado em contrato (CH-06)',
  'Execução de contrato (LGPD, art. 7º, V)', 'Escritório',
  'Enquanto o escritório for cliente do T3jus',
  'Exportadas ao escritório e apagadas com ele', 'APROVADO', true);

-- ---------------------------------------------------------------------------------------
-- Peças.

-- O próximo número: C-AAAA-NNN por escritório.
create function contrato_proximo_numero(p_escritorio uuid) returns text
language sql
set search_path = public
as $$
  select 'C-' || to_char(hoje_brasilia(), 'YYYY') || '-' || lpad((count(*) + 1)::text, 3, '0')
    from contratos where escritorio_id = p_escritorio and numero like 'C-' || to_char(hoje_brasilia(), 'YYYY') || '-%'
$$;

-- Gera a programação das condições de um contrato, só do que vence a partir de p_desde.
create function contrato_programar(p_escritorio uuid, p_contrato uuid, p_desde date, p_tipos text[] default null) returns integer
language plpgsql
set search_path = public
as $$
declare
  h record;
  v_n integer;
  v_total bigint;
  v_base bigint;
  v_resto bigint;
  v_meses integer;
  v_d date;
  v_q integer := 0;
begin
  for h in select tipo, params p from honorario_condicoes where escritorio_id = p_escritorio and dono_tipo = 'CONTRATO' and dono_id = p_contrato
                and (p_tipos is null or tipo = any (p_tipos)) order by ordem loop
    if h.tipo = 'FIXO' then
      v_d := (h.p ->> 'vencimento')::date;
      if v_d >= p_desde then
        insert into recebimentos_previstos (escritorio_id, contrato_id, tipo, descricao, vencimento, valor, origem)
        values (p_escritorio, p_contrato, h.tipo, 'Fixo', v_d, (h.p ->> 'valor')::bigint, 'PROGRAMADO');
        v_q := v_q + 1;
      end if;
    elsif h.tipo = 'PARCELADO' then
      v_n := (h.p ->> 'parcelas')::integer;
      v_total := (h.p ->> 'total')::bigint;
      v_base := v_total / v_n;
      v_resto := v_total % v_n;
      for i in 0 .. v_n - 1 loop
        v_d := ((h.p ->> 'primeiro')::date + make_interval(months => i))::date;
        if v_d >= p_desde then
          insert into recebimentos_previstos (escritorio_id, contrato_id, tipo, descricao, vencimento, valor, origem)
          values (p_escritorio, p_contrato, h.tipo, 'Parcela ' || (i + 1) || ' de ' || v_n, v_d, v_base + case when i < v_resto then 1 else 0 end, 'PROGRAMADO');
          v_q := v_q + 1;
        end if;
      end loop;
    elsif h.tipo = 'MENSAL' then
      v_meses := coalesce((h.p ->> 'meses')::integer, 12);
      for i in 0 .. v_meses - 1 loop
        v_d := ((h.p ->> 'primeiro')::date + make_interval(months => i))::date;
        if v_d >= p_desde then
          insert into recebimentos_previstos (escritorio_id, contrato_id, tipo, descricao, vencimento, valor, origem)
          values (p_escritorio, p_contrato, h.tipo,
                  'Mensalidade ' || (i + 1) || coalesce(' de ' || (h.p ->> 'meses'), ''), v_d, (h.p ->> 'valor')::bigint, 'PROGRAMADO');
          v_q := v_q + 1;
        end if;
      end loop;
    elsif h.tipo = 'RECORRENTE' and coalesce(h.p ->> 'etapa', '') = '' then
      v_meses := (h.p ->> 'meses')::integer;
      for i in 0 .. v_meses - 1 loop
        v_d := ((h.p ->> 'primeiro')::date + make_interval(months => i))::date;
        if v_d >= p_desde then
          insert into recebimentos_previstos (escritorio_id, contrato_id, tipo, descricao, vencimento, valor, origem)
          values (p_escritorio, p_contrato, h.tipo, 'Percentual recorrente: mês ' || (i + 1) || ' de ' || v_meses, v_d, null, 'PROGRAMADO');
          v_q := v_q + 1;
        end if;
      end loop;
    end if;
  end loop;
  return v_q;
end $$;

-- Cancela o que ainda ia vencer (a partir de p_desde), sem apagar.
create function contrato_cancelar_futuros(p_escritorio uuid, p_contrato uuid, p_desde date, p_motivo text, p_tipos text[] default null) returns integer
language plpgsql
set search_path = public
as $$
declare v integer;
begin
  update recebimentos_previstos r set cancelado_em = app_now(), cancelado_motivo = p_motivo
   where r.escritorio_id = p_escritorio and r.contrato_id = p_contrato and r.cancelado_em is null and r.vencimento >= p_desde
     and (p_tipos is null or r.tipo = any (p_tipos))
     and not exists (select 1 from bases_mensais b where b.recebimento_id = r.id);
  get diagnostics v = row_count;
  return v;
end $$;

-- O próximo recebimento de um contrato ativo: a data e a soma do que vence nela.
create function contrato_proximo(p_contrato uuid) returns jsonb
language sql stable
set search_path = public
as $$
  select case when count(*) = 0 then null else jsonb_build_object(
           'em', min(r.vencimento), 'valor', sum(r.valor), 'aDefinir', count(*) filter (where r.valor is null),
           'itens', jsonb_agg(r.descricao order by r.descricao)) end
    from recebimentos_previstos r
   where r.contrato_id = p_contrato and r.cancelado_em is null
     and r.vencimento = (select min(x.vencimento) from recebimentos_previstos x
                          where x.contrato_id = p_contrato and x.cancelado_em is null and x.vencimento >= hoje_brasilia())
$$;

-- O dia de pedir a base: o dia do lembrete no mês do vencimento, ou no mês anterior quando
-- o lembrete vem depois do dia de cobrar.
create function contrato_dia_pedir(p_venc date, p_dia_lembrete integer, p_dia integer) returns date
language sql immutable
as $$
  select make_date(extract(year from m)::integer, extract(month from m)::integer, p_dia_lembrete)
    from (select date_trunc('month', p_venc) - case when p_dia_lembrete > p_dia then interval '1 month' else interval '0' end m) x
$$;

-- O recebimento recorrente sem base cujo dia de pedir a base já chegou.
create function contrato_bases_pendentes(p_escritorio uuid) returns table (recebimento_id uuid, contrato_id uuid, vencimento date, pedir_em date, mes integer, de integer)
language sql stable
set search_path = public
as $$
  select r.id, r.contrato_id, r.vencimento, x.pedir,
         substring(r.descricao from 'mês ([0-9]+)')::integer, substring(r.descricao from 'de ([0-9]+)$')::integer
    from recebimentos_previstos r
    join contratos c on c.id = r.contrato_id and c.estado = 'ATIVO'
    join honorario_condicoes h on h.dono_tipo = 'CONTRATO' and h.dono_id = c.id and h.tipo = 'RECORRENTE'
    cross join lateral (select contrato_dia_pedir(r.vencimento, (h.params ->> 'diaLembrete')::integer, (h.params ->> 'dia')::integer) pedir) x
   where r.escritorio_id = p_escritorio and r.tipo = 'RECORRENTE' and r.valor is null and r.cancelado_em is null
     and x.pedir <= hoje_brasilia()
$$;

create function contrato_linha(c contratos) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', c.id, 'numero', c.numero, 'objeto', c.objeto, 'situacao', c.estado,
    'cliente', (select jsonb_build_object('id', k.id, 'nome', k.nome, 'tipo', k.tipo) from clientes_escritorio k where k.id = c.cliente_id),
    'responsavel', pessoa_ref(c.responsavel_id),
    'condicoes', honorario_lista(c.escritorio_id, 'CONTRATO', c.id),
    'proximo', case when c.estado = 'ATIVO' then contrato_proximo(c.id) end,
    'basePendente', (select jsonb_build_object('vencimento', min(b.vencimento), 'parada', min(b.vencimento) < hoje_brasilia())
                       from contrato_bases_pendentes(c.escritorio_id) b where b.contrato_id = c.id having count(*) > 0),
    'criadoEm', c.criado_em)
$$;

-- Confere os dados do contrato. Datas das condições: hoje ou depois (parcela já paga se
-- registra no Financeiro).
create function contrato_conferir(p_escritorio uuid, p_dados jsonb, p_novo boolean, p_antes jsonb default null) returns text[]
language plpgsql stable
set search_path = public
as $$
declare
  e text[] := '{}';
  v_cli uuid;
  v_resp uuid;
  v_adv jsonb := p_dados -> 'advogados';
  x text;
begin
  if jsonb_typeof(p_dados) is distinct from 'object' then return array['dados']; end if;
  if p_novo then
    begin v_cli := nullif(p_dados ->> 'clienteId', '')::uuid; exception when others then v_cli := null; end;
    if v_cli is null or not exists (select 1 from clientes_escritorio k where k.id = v_cli and k.escritorio_id = p_escritorio and k.estado = 'ATIVO') then
      e := e || 'clienteId'::text;
    end if;
  end if;
  if length(btrim(coalesce(p_dados ->> 'objeto', ''))) not between 2 and 400 then e := e || 'objeto'::text; end if;
  if length(btrim(coalesce(p_dados ->> 'observacoes', ''))) > 3000 then e := e || 'observacoes'::text; end if;
  begin v_resp := nullif(p_dados ->> 'responsavelId', '')::uuid; exception when others then v_resp := null; end;
  if v_resp is null or not pessoa_do_escritorio(v_resp, p_escritorio) then e := e || 'responsavelId'::text; end if;
  if jsonb_typeof(v_adv) is distinct from 'array' or jsonb_array_length(v_adv) = 0 or jsonb_array_length(v_adv) > 20 then
    e := e || 'advogados'::text;
  else
    for x in select jsonb_array_elements_text(v_adv) loop
      begin
        if not pessoa_do_escritorio(x::uuid, p_escritorio) then e := e || 'advogados'::text; end if;
      exception when others then e := e || 'advogados'::text;
      end;
    end loop;
  end if;
  -- Data passada só vale na condição que não mudou (contrato ativo com parcelas já vencidas).
  e := e || honorario_erros_lista(p_escritorio, p_dados -> 'condicoes', true, case when p_antes is null then hoje_brasilia() end);
  if p_antes is not null and jsonb_typeof(p_dados -> 'condicoes') = 'array' then
    for i in 0 .. jsonb_array_length(p_dados -> 'condicoes') - 1 loop
      if jsonb_typeof(p_dados -> 'condicoes' -> i) = 'object'
         and not p_antes @> jsonb_build_array(jsonb_build_object('tipo', p_dados -> 'condicoes' -> i ->> 'tipo') || honorario_normalizar(p_dados -> 'condicoes' -> i)) then
        foreach x in array honorario_erros(p_escritorio, p_dados -> 'condicoes' -> i, hoje_brasilia()) loop
          e := e || ('c' || (i + 1) || '.' || x);
        end loop;
      end if;
    end loop;
  end if;
  return (select coalesce(array_agg(distinct v), '{}') from unnest(e) v);
end $$;

create function contrato_gravar_advogados(p_escritorio uuid, p_contrato uuid, p_adv jsonb) returns void
language sql
set search_path = public
as $$
  delete from contrato_advogados where escritorio_id = p_escritorio and contrato_id = p_contrato;
  insert into contrato_advogados (escritorio_id, contrato_id, pessoa_id)
  select distinct p_escritorio, p_contrato, x::uuid from jsonb_array_elements_text(p_adv) x;
$$;

-- ---------------------------------------------------------------------------------------
-- Leituras.

create function portal_contratos(p_pessoa uuid, p_escritorio uuid, p_mostrar text default 'ATIVOS', p_q text default null) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_q text := lower(btrim(coalesce(p_q, '')));
  v_padrao text;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'CONTRATOS');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'contratos.ver');
  if coalesce(p_mostrar, 'ATIVOS') not in ('ATIVOS', 'ENCERRADOS', 'BASE') then perform recusar_campos('Filtro inválido', 'mostrar'); end if;
  if length(v_q) > 120 then perform recusar_campos('Busca longa demais', 'q'); end if;
  v_padrao := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  return jsonb_build_object(
    'algum', exists (select 1 from contratos where escritorio_id = p_escritorio),
    'contagem', jsonb_build_object(
      'ativos', (select count(*) from contratos where escritorio_id = p_escritorio and estado = 'ATIVO'),
      'elaboracao', (select count(*) from contratos where escritorio_id = p_escritorio and estado = 'ELABORACAO'),
      'encerrados', (select count(*) from contratos where escritorio_id = p_escritorio and estado = 'ENCERRADO'),
      'base', (select count(distinct b.contrato_id) from contrato_bases_pendentes(p_escritorio) b)),
    'contratos', coalesce((
      select jsonb_agg(l order by (l -> 'proximo' ->> 'em') nulls last, l ->> 'numero' desc)
        from (select contrato_linha(c) l
                from contratos c join clientes_escritorio k on k.id = c.cliente_id
               where c.escritorio_id = p_escritorio
                 and case coalesce(p_mostrar, 'ATIVOS') when 'ATIVOS' then c.estado in ('ATIVO', 'ELABORACAO')
                                                        when 'ENCERRADOS' then c.estado = 'ENCERRADO'
                                                        else c.id in (select b.contrato_id from contrato_bases_pendentes(p_escritorio) b) end
                 and (v_q = '' or lower(c.numero) like v_padrao or lower(k.nome) like v_padrao or lower(c.objeto) like v_padrao)) x), '[]'::jsonb));
end $$;

create function portal_contrato(p_pessoa uuid, p_escritorio uuid, p_contrato uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c contratos;
  v_fin boolean;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'CONTRATOS');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'contratos.ver');
  select * into c from contratos where id = p_contrato and escritorio_id = p_escritorio;
  if c.id is null then raise exception 'Contrato não encontrado' using errcode = 'TC404'; end if;
  v_fin := 'FINANCEIRO' = any (areas_da_pessoa(p_pessoa, p_escritorio));
  return contrato_linha(c) || jsonb_build_object(
    'observacoes', c.observacoes, 'versao', c.versao, 'assinadoEm', c.assinado_em,
    'assinaturaPor', pessoa_ref(c.assinatura_por), 'encerradoEm', c.encerrado_em, 'motivoEncerramento', c.motivo_encerramento,
    'proposta', (select jsonb_build_object('id', p.id, 'numero', p.numero) from propostas p where p.id = c.proposta_id),
    'advogados', coalesce((select jsonb_agg(pessoa_ref(a.pessoa_id) order by pe.nome) from contrato_advogados a join pessoas pe on pe.id = a.pessoa_id
                            where a.contrato_id = c.id), '[]'::jsonb),
    'financeiro', v_fin,
    'recebimentos', coalesce((
      select jsonb_agg(jsonb_build_object('id', r.id, 'tipo', r.tipo, 'descricao', r.descricao, 'vencimento', r.vencimento, 'valor', r.valor,
                                          'origem', r.origem, 'criadoEm', r.criado_em,
                                          'cancelado', case when r.cancelado_em is not null then jsonb_build_object('em', r.cancelado_em, 'motivo', r.cancelado_motivo) end,
                                          'base', (select jsonb_build_object('valor', b.valor_base, 'fonte', b.fonte, 'por', pessoa_ref(b.informado_por), 'em', b.informado_em)
                                                     from bases_mensais b where b.recebimento_id = r.id))
                       order by r.vencimento, r.descricao)
        from recebimentos_previstos r where r.contrato_id = c.id), '[]'::jsonb),
    'historico', coalesce((
      select jsonb_agg(jsonb_build_object('em', h.ocorrido_em, 'acao', h.acao, 'autor', a.nome, 'dados', h.dados) order by h.id desc)
        from historico h left join pessoas a on a.id = h.autor_id
       where h.escritorio_id = p_escritorio and h.entidade = 'contratos' and h.entidade_id = c.id::text), '[]'::jsonb));
end $$;

-- O que vem da proposta aceita para o formulário do contrato (IN-01).
create function portal_contrato_da_proposta(p_pessoa uuid, p_escritorio uuid, p_proposta uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p propostas;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'CONTRATOS');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'contratos.editar');
  select * into p from propostas where id = p_proposta and escritorio_id = p_escritorio;
  if p.id is null then raise exception 'Proposta não encontrada' using errcode = 'TC404'; end if;
  if p.estado <> 'ACEITA' then perform recusar_motivo('Só a proposta aceita vira contrato', 'PROPOSTA_NAO_ACEITA'); end if;
  return jsonb_build_object(
    'id', p.id, 'numero', p.numero, 'respondidaEm', p.respondida_em, 'servico', p.servico, 'escopo', p.escopo,
    'responsavel', pessoa_ref(p.responsavel_id),
    'cliente', (select jsonb_build_object('id', k.id, 'nome', k.nome, 'tipo', k.tipo) from clientes_escritorio k where k.id = p.cliente_id),
    'condicoes', honorario_lista(p_escritorio, 'PROPOSTA', p.id));
end $$;

-- ---------------------------------------------------------------------------------------
-- Escritas.

create function portal_contrato_criar(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e text[];
  v_id uuid;
  v_numero text;
  v_prop uuid;
  p propostas;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'CONTRATOS');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'contratos.editar');
  e := contrato_conferir(p_escritorio, p_dados, true);
  if coalesce(p_dados ->> 'propostaId', '') <> '' then
    begin v_prop := (p_dados ->> 'propostaId')::uuid; exception when others then v_prop := null; end;
    select * into p from propostas where id = v_prop and escritorio_id = p_escritorio for update;
    if p.id is null then e := e || 'propostaId'::text;
    elsif p.estado <> 'ACEITA' then perform recusar_motivo('Só a proposta aceita vira contrato', 'PROPOSTA_NAO_ACEITA');
    elsif p.cliente_id::text <> p_dados ->> 'clienteId' then e := e || 'clienteId'::text;
    end if;
  end if;
  if cardinality(e) > 0 then perform recusar_campos('Confira o contrato', variadic e); end if;
  perform pg_advisory_xact_lock(hashtext('contratos:' || p_escritorio::text));
  v_numero := contrato_proximo_numero(p_escritorio);
  perform definir_transicao('ELABORACAO');
  insert into contratos (escritorio_id, numero, cliente_id, objeto, observacoes, responsavel_id, proposta_id, criado_por)
  values (p_escritorio, v_numero, (p_dados ->> 'clienteId')::uuid, btrim(p_dados ->> 'objeto'),
          nullif(btrim(coalesce(p_dados ->> 'observacoes', '')), ''), (p_dados ->> 'responsavelId')::uuid, p.id, p_pessoa)
  returning id into v_id;
  perform contrato_gravar_advogados(p_escritorio, v_id, p_dados -> 'advogados');
  perform honorario_gravar(p_escritorio, 'CONTRATO', v_id, p_dados -> 'condicoes');
  if p.id is not null then
    perform definir_transicao('CONTRATO');
    update propostas set estado = 'CONTRATO' where id = p.id;
    perform registrar_historico('proposta.virou_contrato', 'propostas', p.id::text, jsonb_build_object('contrato', v_numero));
  end if;
  perform registrar_historico('contrato.criado', 'contratos', v_id::text,
    jsonb_build_object('numero', v_numero, 'proposta', p.numero,
                       'tipos', (select jsonb_agg(c ->> 'tipo') from jsonb_array_elements(p_dados -> 'condicoes') c)));
  return jsonb_build_object('id', v_id, 'numero', v_numero, 'versao', 1);
end $$;

-- Registrar a assinatura: o contrato fica ativo e a programação passa a existir (decisão 19).
create function portal_contrato_assinatura(p_pessoa uuid, p_escritorio uuid, p_contrato uuid, p_versao integer, p_assinado_em date) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c contratos;
  v_versao integer;
  v_q integer;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'CONTRATOS');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'contratos.editar');
  select * into c from contratos where id = p_contrato and escritorio_id = p_escritorio;
  if c.id is null then raise exception 'Contrato não encontrado' using errcode = 'TC404'; end if;
  if c.estado <> 'ELABORACAO' then perform recusar_motivo('O contrato não está em elaboração', 'CONTRATO_NAO_ELABORACAO'); end if;
  if p_assinado_em is null or p_assinado_em > hoje_brasilia() or p_assinado_em < (c.criado_em at time zone 'America/Sao_Paulo')::date then
    perform recusar_campos('Confira a data', 'assinadoEm');
  end if;
  perform definir_transicao('ATIVO');
  update contratos set estado = 'ATIVO', assinado_em = p_assinado_em, assinatura_por = p_pessoa
   where id = p_contrato and escritorio_id = p_escritorio and versao = p_versao
  returning versao into v_versao;
  if v_versao is null then perform conflito_versao('contratos', p_contrato); end if;
  v_q := contrato_programar(p_escritorio, p_contrato, hoje_brasilia());
  perform registrar_historico('contrato.assinado', 'contratos', p_contrato::text, jsonb_build_object('em', p_assinado_em, 'recebimentos', v_q));
  return jsonb_build_object('id', p_contrato, 'versao', v_versao, 'recebimentos', v_q);
end $$;

-- Mudar as condições (decisão 20): em elaboração, só troca; ativo pede motivo e refaz só o
-- que ainda vai vencer. As condições de antes e depois ficam no histórico.
create function portal_contrato_condicoes(p_pessoa uuid, p_escritorio uuid, p_contrato uuid, p_versao integer, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c contratos;
  e text[];
  v_versao integer;
  v_antes jsonb;
  v_depois jsonb;
  v_motivo text := nullif(btrim(coalesce(p_dados ->> 'motivo', '')), '');
  v_cancel integer := 0;
  v_novos integer := 0;
  v_tipos text[];
begin
  perform entrar_area(p_pessoa, p_escritorio, 'CONTRATOS');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'contratos.editar');
  select * into c from contratos where id = p_contrato and escritorio_id = p_escritorio;
  if c.id is null then raise exception 'Contrato não encontrado' using errcode = 'TC404'; end if;
  if c.estado = 'ENCERRADO' then perform recusar_motivo('O contrato está encerrado', 'CONTRATO_ENCERRADO'); end if;
  v_antes := honorario_lista(p_escritorio, 'CONTRATO', p_contrato);
  e := contrato_conferir(p_escritorio, p_dados, false, case when c.estado = 'ATIVO' then v_antes end);
  if c.estado = 'ATIVO' and (v_motivo is null or length(v_motivo) not between 3 and 500) then e := e || 'motivo'::text; end if;
  if cardinality(e) > 0 then perform recusar_campos('Confira o contrato', variadic e); end if;
  update contratos set objeto = btrim(p_dados ->> 'objeto'), observacoes = nullif(btrim(coalesce(p_dados ->> 'observacoes', '')), ''),
                       responsavel_id = (p_dados ->> 'responsavelId')::uuid
   where id = p_contrato and escritorio_id = p_escritorio and versao = p_versao
  returning versao into v_versao;
  if v_versao is null then perform conflito_versao('contratos', p_contrato); end if;
  perform contrato_gravar_advogados(p_escritorio, p_contrato, p_dados -> 'advogados');
  perform honorario_gravar(p_escritorio, 'CONTRATO', p_contrato, p_dados -> 'condicoes');
  v_depois := honorario_lista(p_escritorio, 'CONTRATO', p_contrato);
  -- Só os tipos que mudaram (entraram, saíram ou têm outros valores) refazem a programação.
  select array_agg(distinct t) into v_tipos from (
    select x ->> 'tipo' t from jsonb_array_elements(v_antes) x where not v_depois @> jsonb_build_array(x)
    union select x ->> 'tipo' from jsonb_array_elements(v_depois) x where not v_antes @> jsonb_build_array(x)) d;
  if c.estado = 'ATIVO' and v_tipos is not null then
    v_cancel := contrato_cancelar_futuros(p_escritorio, p_contrato, hoje_brasilia(), 'Condição mudada: ' || v_motivo, v_tipos);
    v_novos := contrato_programar(p_escritorio, p_contrato, hoje_brasilia(), v_tipos);
  end if;
  perform registrar_historico('contrato.editado', 'contratos', p_contrato::text,
    jsonb_build_object('motivo', v_motivo, 'cancelados', v_cancel, 'novos', v_novos)
      || case when v_antes <> v_depois then jsonb_build_object('condicoes_antes', v_antes, 'condicoes_depois', v_depois) else '{}'::jsonb end);
  return jsonb_build_object('id', p_contrato, 'versao', v_versao, 'cancelados', v_cancel, 'novos', v_novos);
end $$;

create function portal_contrato_encerrar(p_pessoa uuid, p_escritorio uuid, p_contrato uuid, p_versao integer, p_motivo text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c contratos;
  v_versao integer;
  v_motivo text := nullif(btrim(coalesce(p_motivo, '')), '');
  v_cancel integer;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'CONTRATOS');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'contratos.editar');
  select * into c from contratos where id = p_contrato and escritorio_id = p_escritorio;
  if c.id is null then raise exception 'Contrato não encontrado' using errcode = 'TC404'; end if;
  if c.estado = 'ENCERRADO' then perform recusar_motivo('O contrato já está encerrado', 'CONTRATO_ENCERRADO'); end if;
  if v_motivo is null or length(v_motivo) not between 3 and 500 then perform recusar_campos('Escreva o motivo', 'motivo'); end if;
  perform definir_transicao('ENCERRADO', v_motivo);
  update contratos set estado = 'ENCERRADO', encerrado_em = app_now(), motivo_encerramento = v_motivo
   where id = p_contrato and escritorio_id = p_escritorio and versao = p_versao
  returning versao into v_versao;
  if v_versao is null then perform conflito_versao('contratos', p_contrato); end if;
  v_cancel := contrato_cancelar_futuros(p_escritorio, p_contrato, hoje_brasilia() + 1, 'Contrato encerrado: ' || v_motivo);
  perform registrar_historico('contrato.encerrado', 'contratos', p_contrato::text, jsonb_build_object('cancelados', v_cancel));
  return jsonb_build_object('id', p_contrato, 'versao', v_versao, 'cancelados', v_cancel);
end $$;

-- Informar a base do mês (decisão 23): o valor do recebimento sai do percentual; o vencimento
-- pode mudar quando o dia de cobrar já passou.
create function portal_contrato_base(p_pessoa uuid, p_escritorio uuid, p_recebimento uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r recebimentos_previstos;
  v_pct integer;
  v_base bigint := json_inteiro(p_dados, 'valor');
  v_fonte text := p_dados ->> 'fonte';
  v_venc date := json_data(p_dados, 'vencimento');
  v_valor bigint;
  e text[] := '{}';
begin
  perform entrar_area(p_pessoa, p_escritorio, 'CONTRATOS');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'contratos.editar');
  select * into r from recebimentos_previstos where id = p_recebimento and escritorio_id = p_escritorio for update;
  if r.id is null or r.tipo <> 'RECORRENTE' or r.cancelado_em is not null then raise exception 'Recebimento não encontrado' using errcode = 'TC404'; end if;
  if r.valor is not null then perform recusar_motivo('A base deste mês já foi informada', 'MES_JA_INFORMADO'); end if;
  if coalesce(v_base, 0) not between 1 and 10000000000 then e := e || 'valor'::text; end if;
  if coalesce(v_fonte, '') not in ('EXTRATO', 'CONTRACHEQUE', 'CLIENTE') then e := e || 'fonte'::text; end if;
  if v_venc is null or v_venc < hoje_brasilia() then e := e || 'vencimento'::text; end if;
  if cardinality(e) > 0 then perform recusar_campos('Confira a base', variadic (select array_agg(v order by v) from unnest(e) v)); end if;
  select (h.params ->> 'percentual')::integer into v_pct
    from honorario_condicoes h where h.dono_tipo = 'CONTRATO' and h.dono_id = r.contrato_id and h.tipo = 'RECORRENTE';
  v_valor := round(v_base * v_pct / 10000.0);
  if v_valor < 1 then perform recusar_campos('Base pequena demais', 'valor'); end if;
  insert into bases_mensais (escritorio_id, recebimento_id, valor_base, fonte, informado_por)
  values (p_escritorio, r.id, v_base, v_fonte, p_pessoa);
  update recebimentos_previstos set valor = v_valor, vencimento = v_venc, origem = 'BASE' where id = r.id;
  perform registrar_historico('contrato.base_informada', 'contratos', r.contrato_id::text,
    jsonb_build_object('recebimento', r.id, 'base', v_base, 'valor', v_valor, 'vencimento', v_venc, 'fonte', v_fonte));
  return jsonb_build_object('id', r.id, 'valor', v_valor, 'vencimento', v_venc);
end $$;

-- Honorários (decisão 23): o que depende de alguém para virar cobrança.
create function portal_contratos_honorarios(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ini timestamptz := date_trunc('month', hoje_brasilia())::timestamp at time zone 'America/Sao_Paulo';
begin
  perform entrar_area(p_pessoa, p_escritorio, 'CONTRATOS');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'contratos.ver');
  return jsonb_build_object(
    'bases', coalesce((
      select jsonb_agg(jsonb_build_object(
               'recebimentoId', b.recebimento_id, 'vencimento', b.vencimento, 'pedirEm', b.pedir_em, 'mes', b.mes, 'de', b.de,
               'parada', b.vencimento < hoje_brasilia(),
               'contrato', jsonb_build_object('id', c.id, 'numero', c.numero), 'cliente', k.nome, 'responsavel', pessoa_ref(c.responsavel_id),
               'percentual', (h.params ->> 'percentual')::integer, 'sobre', h.params ->> 'sobre')
             order by b.vencimento, k.nome)
        from contrato_bases_pendentes(p_escritorio) b
        join contratos c on c.id = b.contrato_id join clientes_escritorio k on k.id = c.cliente_id
        join honorario_condicoes h on h.dono_tipo = 'CONTRATO' and h.dono_id = c.id and h.tipo = 'RECORRENTE'), '[]'::jsonb),
    'informadas', coalesce((
      select jsonb_agg(x order by x ->> 'em' desc) from (
        select jsonb_build_object('contrato', jsonb_build_object('id', c.id, 'numero', c.numero), 'cliente', k.nome, 'descricao', r.descricao,
                                  'base', s.valor_base, 'valor', r.valor, 'vencimento', r.vencimento, 'por', pessoa_ref(s.informado_por), 'em', s.informado_em) x
          from bases_mensais s join recebimentos_previstos r on r.id = s.recebimento_id
          join contratos c on c.id = r.contrato_id join clientes_escritorio k on k.id = c.cliente_id
         where s.escritorio_id = p_escritorio order by s.informado_em desc limit 10) y), '[]'::jsonb),
    'etapas', coalesce((
      select jsonb_agg(jsonb_build_object('contrato', jsonb_build_object('id', c.id, 'numero', c.numero), 'cliente', k.nome,
                                          'condicao', jsonb_build_object('tipo', h.tipo) || h.params, 'etapa', coalesce(h.params ->> 'etapa', 'Cada ato feito'))
                       order by k.nome, h.ordem)
        from honorario_condicoes h join contratos c on c.id = h.dono_id and h.dono_tipo = 'CONTRATO'
        join clientes_escritorio k on k.id = c.cliente_id
       where c.escritorio_id = p_escritorio and c.estado in ('ATIVO', 'ELABORACAO')
         and (h.tipo in ('EXITO', 'SUCUMBENCIA', 'ATO') or (h.tipo = 'RECORRENTE' and coalesce(h.params ->> 'etapa', '') <> ''))), '[]'::jsonb),
    'noMes', (select count(*) from bases_mensais s where s.escritorio_id = p_escritorio and s.informado_em >= v_ini),
    'tipos', coalesce((
      select jsonb_agg(jsonb_build_object('tipo', tipo, 'n', n) order by n desc, tipo)
        from (select h.tipo, count(distinct c.id) n from honorario_condicoes h join contratos c on c.id = h.dono_id and h.dono_tipo = 'CONTRATO'
               where c.escritorio_id = p_escritorio and c.estado = 'ATIVO' group by h.tipo) t), '[]'::jsonb),
    'ativos', (select count(*) from contratos where escritorio_id = p_escritorio and estado = 'ATIVO'));
end $$;

-- ---------------------------------------------------------------------------------------
-- Comercial: "Virou contrato" com o contrato, os contratos do Funil e o valor certo da Origem.

alter function portal_comercial_funil(uuid, uuid, text) rename to comercial_funil_sem_contratos;

create function portal_comercial_funil(p_pessoa uuid, p_escritorio uuid, p_periodo text default '90') returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb := comercial_funil_sem_contratos(p_pessoa, p_escritorio, p_periodo);
  v_ini timestamptz := (v ->> 'de')::date::timestamp at time zone 'America/Sao_Paulo';
begin
  return jsonb_set(v, '{agora,contrato}', coalesce((
    select jsonb_agg(x order by x ->> 'em' desc) from (
      select jsonb_build_object('id', c.id, 'numero', c.numero, 'clienteId', k.id, 'nome', k.nome,
                                'em', (c.criado_em at time zone 'America/Sao_Paulo')::date, 'situacao', c.estado,
                                'valorCerto', honorario_valor_certo(p_escritorio, 'CONTRATO', c.id),
                                'condicoes', honorario_lista(p_escritorio, 'CONTRATO', c.id)) x
        from contratos c join clientes_escritorio k on k.id = c.cliente_id
       where c.escritorio_id = p_escritorio and c.proposta_id is not null and k.criado_em >= v_ini
       order by c.criado_em desc limit 3) y), '[]'::jsonb));
end $$;

-- Origem: o valor certo contratado é a soma das condições de valor certo dos contratos.
create or replace function portal_comercial_origem(p_pessoa uuid, p_escritorio uuid, p_periodo text default '90') returns jsonb
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
             exists (select 1 from propostas p where p.cliente_id = c.id and p.estado = 'CONTRATO') contrato,
             coalesce((select sum(honorario_valor_certo(p_escritorio, 'CONTRATO', k.id)) from contratos k
                        where k.cliente_id = c.id and k.proposta_id is not null), 0) valor
        from clientes_escritorio c
       where c.escritorio_id = p_escritorio and c.criado_em >= v_ini and c.estado <> 'EXCLUIDO')
    select jsonb_build_object(
      'de', v_de, 'ate', hoje_brasilia(), 'total', (select count(*) from cs),
      'linhas', coalesce((
        select jsonb_agg(jsonb_build_object('origem', origem, 'contatos', n, 'propostas', np, 'contratos', nc, 'valorCerto', vc)
                         order by nc desc, n desc, origem nulls last)
          from (select origem, count(*) n, count(*) filter (where proposta) np, count(*) filter (where contrato) nc, sum(valor)::bigint vc
                  from cs group by origem) x), '[]'::jsonb),
      'indicacoes', coalesce((
        select jsonb_agg(jsonb_build_object('nome', i, 'n', n) order by n desc, i)
          from (select btrim(origem_indicacao) i, count(*) n from cs where origem_indicacao is not null group by btrim(origem_indicacao)) x), '[]'::jsonb)));
end $$;

-- Quem saiu da equipe passa os contratos que ainda estão de pé (EX-10).
create function contratos_passar_de_quem_saiu() returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_de uuid := (new.dados ->> 'pessoa_id')::uuid;
  v_para uuid := (new.dados ->> 'passou_para')::uuid;
  v_id uuid;
begin
  if v_de is null or v_para is null then return new; end if;
  for v_id in
    update contratos set responsavel_id = v_para
     where escritorio_id = new.escritorio_id and responsavel_id = v_de and estado in ('ELABORACAO', 'ATIVO')
    returning id
  loop
    perform registrar_historico('contrato.responsavel_passado', 'contratos', v_id::text, jsonb_build_object('de', v_de, 'para', v_para));
  end loop;
  return new;
end $$;
create trigger contratos_passar_de_quem_saiu after insert on historico
  for each row when (new.acao = 'equipe.retirada') execute function contratos_passar_de_quem_saiu();

call fechar_acesso();
