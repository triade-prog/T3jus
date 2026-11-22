-- Ficha do cliente ligada a propostas, contratos e casos (F3.110, F3.111; AP-01, AP-05, IN-01,
-- CH-10, EX-01). Tela aprovada em docs/design/aprovadas/portal-ficha-cliente-ligada (22/11/2026,
-- com as 7 recomendações do NOTAS.md).
--
-- O que entra:
-- 1. O "próximo passo" do cliente (decisões 4 a 6): calculado aqui, com as áreas da sessão.
-- 2. A ficha e a lista de Clientes trazem o passo; a ficha traz as contagens das abas e o
--    "No escritório", só do que a pessoa pode abrir (decisões 12, 22 e 23).
-- 3. As listas das abas Propostas, Contratos e Casos, cada uma pela própria área.
-- 4. A assinatura abre o caso (decisões 15 a 21; CH-10): tudo numa transação só. Quem não tem a
--    área Jurídico abre o caso com os dados do contrato, e a responsável recebe o aviso no sino
--    (pergunta 5). Nada vai ao cliente pelo WhatsApp (pergunta 7).
-- 5. O contrato ganha a área do direito, opcional (pergunta 6), e "não tem caso" (pergunta 4).

alter table contratos add column area text check (area is null or area_direito_valida(area));
alter table contratos add column sem_caso boolean not null default false;

-- O sino passa a aceitar o caso aberto na assinatura (a lista é a que existe mais a nova).
do $$
declare
  v_tipos text[];
  v_origens text[];
begin
  select array_agg(distinct x) into v_tipos from (
    select unnest(regexp_matches(pg_get_constraintdef(oid), '''([A-Z0-9_]+)''', 'g')) x
      from pg_constraint where conrelid = 'avisos_sino'::regclass and conname = 'avisos_sino_tipo_check'
    union select 'CASO_ABERTO_NA_ASSINATURA') t;
  select array_agg(distinct x) into v_origens from (
    select unnest(regexp_matches(pg_get_constraintdef(oid), '''([a-z0-9_]+)''', 'g')) x
      from pg_constraint where conrelid = 'avisos_sino'::regclass and conname = 'avisos_sino_origem_tabela_check'
    union select 'casos') t;
  alter table avisos_sino drop constraint avisos_sino_tipo_check;
  execute format('alter table avisos_sino add constraint avisos_sino_tipo_check check (tipo in (%s))',
                 (select string_agg(quote_literal(x), ', ' order by x) from unnest(v_tipos) x));
  alter table avisos_sino drop constraint avisos_sino_origem_tabela_check;
  execute format('alter table avisos_sino add constraint avisos_sino_origem_tabela_check check (origem_tabela in (%s))',
                 (select string_agg(quote_literal(x), ', ' order by x) from unnest(v_origens) x));
end $$;

-- ---------------------------------------------------------------------------------------
-- 1. O próximo passo (decisão 5): a proposta aberta, depois a aceita sem contrato, o contrato em
-- elaboração, o contrato assinado sem caso e, por fim, o caso em andamento. Sem nada disso (ou só
-- com recusadas e casos encerrados), é fazer a proposta. "pode" diz se quem pediu dá o passo; o
-- número e o id do item só vão para quem tem a área dele.
create function cliente_passo(p_pessoa uuid, p_escritorio uuid, p_cliente uuid) returns jsonb
language plpgsql stable
set search_path = public
as $$
declare
  v_areas text[] := areas_da_pessoa(p_pessoa, p_escritorio);
  p propostas;
  ct contratos;
  ca casos;
  v_tipo text;
  v_area text;
  v_item jsonb;
begin
  select * into p from propostas
   where escritorio_id = p_escritorio and cliente_id = p_cliente and estado in ('RASCUNHO', 'ENVIADA', 'NEGOCIACAO')
   order by criado_em desc limit 1;
  if p.id is not null then
    v_tipo := case when p.estado = 'RASCUNHO' then 'PROPOSTA_RASCUNHO' else 'PROPOSTA_ANDAMENTO' end;
    v_area := 'COMERCIAL';
    v_item := jsonb_build_object('id', p.id, 'numero', p.numero, 'servico', p.servico, 'situacao', p.estado,
      'criadaEm', p.criado_em, 'enviadaEm', p.enviada_em, 'validaAte', p.valida_ate,
      'retorno', (select jsonb_build_object('em', x ->> 'em', 'vencido', (x ->> 'vencido')::boolean, 'responsavel', x -> 'responsavel')
                    from prox_contato(p.cliente_id) x where x is not null));
  end if;
  if v_tipo is null then
    select * into p from propostas pr
     where pr.escritorio_id = p_escritorio and pr.cliente_id = p_cliente and pr.estado = 'ACEITA'
       and not exists (select 1 from contratos c where c.proposta_id = pr.id)
     order by pr.respondida_em desc nulls last, pr.criado_em desc limit 1;
    if p.id is not null then
      v_tipo := 'PROPOSTA_ACEITA';
      v_area := 'CONTRATOS';
      v_item := jsonb_build_object('id', p.id, 'numero', p.numero, 'servico', p.servico, 'aceitaEm', p.respondida_em);
    end if;
  end if;
  if v_tipo is null then
    select * into ct from contratos where escritorio_id = p_escritorio and cliente_id = p_cliente and estado = 'ELABORACAO'
     order by criado_em desc limit 1;
    if ct.id is not null then
      v_tipo := 'CONTRATO_ELABORACAO';
      v_area := 'CONTRATOS';
      v_item := jsonb_build_object('id', ct.id, 'numero', ct.numero, 'objeto', ct.objeto, 'versao', ct.versao, 'criadoEm', ct.criado_em);
    end if;
  end if;
  if v_tipo is null then
    select * into ct from contratos c
     where c.escritorio_id = p_escritorio and c.cliente_id = p_cliente and c.estado = 'ATIVO' and not c.sem_caso
       and not exists (select 1 from caso_clientes cc where cc.contrato_id = c.id)
     order by c.assinado_em desc, c.criado_em desc limit 1;
    if ct.id is not null then
      v_tipo := 'CONTRATO_SEM_CASO';
      v_area := 'JURIDICO';
      v_item := jsonb_build_object('id', ct.id, 'numero', ct.numero, 'objeto', ct.objeto, 'assinadoEm', ct.assinado_em);
    end if;
  end if;
  if v_tipo is null then
    select c.* into ca from casos c join caso_clientes cc on cc.caso_id = c.id
     where c.escritorio_id = p_escritorio and cc.cliente_id = p_cliente and c.situacao = 'ANDAMENTO'
     order by c.etapa_desde desc limit 1;
    if ca.id is not null then
      v_tipo := 'CASO';
      v_area := 'JURIDICO';
      v_item := jsonb_build_object('id', ca.id, 'nome', ca.nome, 'responsavel', pessoa_ref(ca.responsavel_id),
        'etapa', (select jsonb_build_object('ordem', e.ordem, 'nome', e.nome) from etapas e where e.id = ca.etapa_id),
        'etapas', (select count(*) from etapas e where e.escritorio_id = p_escritorio));
    end if;
  end if;
  if v_tipo is null then
    v_tipo := 'SEM_PROPOSTA';
    v_area := 'COMERCIAL';
  end if;
  return jsonb_build_object(
    'tipo', v_tipo,
    'area', v_area,
    'pode', v_area = any (v_areas),
    'quemPode', case when not (v_area = any (v_areas)) then quem_tem_area(p_escritorio, v_area) end,
    'item', case when v_area = any (v_areas) then v_item end,
    -- Quem não tem a área do item ainda vê, sem número, que o caso existe (decisão 19).
    'casoResponsavel', case when v_tipo = 'CASO' and not ('JURIDICO' = any (v_areas)) then v_item -> 'responsavel' end);
end $$;

-- As contagens das abas e o "No escritório", só das áreas que a pessoa tem (decisões 7, 12 e 23).
create function cliente_no_escritorio(p_pessoa uuid, p_escritorio uuid, p_cliente uuid) returns jsonb
language sql stable
set search_path = public
as $$
  with a as (select areas_da_pessoa(p_pessoa, p_escritorio) v)
  select jsonb_build_object(
    'contagens', jsonb_strip_nulls(jsonb_build_object(
      'propostas', case when 'COMERCIAL' = any (a.v) then (select count(*) from propostas where escritorio_id = p_escritorio and cliente_id = p_cliente) end,
      'contratos', case when 'CONTRATOS' = any (a.v) then (select count(*) from contratos where escritorio_id = p_escritorio and cliente_id = p_cliente) end,
      'casos', case when 'JURIDICO' = any (a.v) then (select count(*) from caso_clientes where escritorio_id = p_escritorio and cliente_id = p_cliente) end)),
    'noEscritorio', jsonb_strip_nulls(jsonb_build_object(
      'proposta', case when 'COMERCIAL' = any (a.v) then (
        select jsonb_build_object('id', p.id, 'numero', p.numero, 'situacao', p.estado, 'servico', p.servico, 'em', p.criado_em)
          from propostas p where p.escritorio_id = p_escritorio and p.cliente_id = p_cliente order by p.criado_em desc limit 1) end,
      'contrato', case when 'CONTRATOS' = any (a.v) then (
        select jsonb_build_object('id', c.id, 'numero', c.numero, 'situacao', c.estado, 'objeto', c.objeto, 'assinadoEm', c.assinado_em)
          from contratos c where c.escritorio_id = p_escritorio and c.cliente_id = p_cliente
         order by c.estado = 'ENCERRADO', c.criado_em desc limit 1) end,
      'caso', case when 'JURIDICO' = any (a.v) then (
        select jsonb_build_object('id', c.id, 'nome', c.nome, 'situacao', c.situacao,
                                  'etapa', (select e.nome from etapas e where e.id = c.etapa_id))
          from casos c join caso_clientes cc on cc.caso_id = c.id
         where c.escritorio_id = p_escritorio and cc.cliente_id = p_cliente
         order by c.situacao = 'ENCERRADO', c.etapa_desde desc limit 1) end)))
    from a
$$;

-- ---------------------------------------------------------------------------------------
-- 2. A ficha e a lista de Clientes passam a trazer o passo.
alter function portal_cliente(uuid, uuid, uuid) rename to portal_cliente_sem_passo;

create function portal_cliente(p_pessoa uuid, p_escritorio uuid, p_cliente uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  f jsonb := portal_cliente_sem_passo(p_pessoa, p_escritorio, p_cliente);
begin
  if f ->> 'situacao' in ('EXCLUIDO', 'ARQUIVADO') then return f; end if;
  return f || jsonb_build_object('passo', cliente_passo(p_pessoa, p_escritorio, p_cliente))
           || cliente_no_escritorio(p_pessoa, p_escritorio, p_cliente);
end $$;

alter function portal_clientes(uuid, uuid, text, text, boolean) rename to portal_clientes_sem_passo;

create function portal_clientes(p_pessoa uuid, p_escritorio uuid, p_termo text default null,
                                p_situacao text default 'ATIVO', p_vencidos boolean default false) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r jsonb := portal_clientes_sem_passo(p_pessoa, p_escritorio, p_termo, p_situacao, p_vencidos);
begin
  return jsonb_set(r, '{clientes}', coalesce((
    select jsonb_agg(case when l ->> 'situacao' = 'ATIVO'
                          then l || jsonb_build_object('passo', cliente_passo(p_pessoa, p_escritorio, (l ->> 'id')::uuid))
                          else l end order by n)
      from jsonb_array_elements(r -> 'clientes') with ordinality t(l, n)), '[]'::jsonb));
end $$;

-- ---------------------------------------------------------------------------------------
-- 3. As abas: cada lista entra pela própria área, como as listas das áreas.
create function portal_cliente_itens(p_pessoa uuid, p_escritorio uuid, p_cliente uuid, p_tipo text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_tipo not in ('PROPOSTAS', 'CONTRATOS', 'CASOS') then perform recusar_campos('Aba desconhecida', 'tipo'); end if;
  perform entrar_area(p_pessoa, p_escritorio, case p_tipo when 'PROPOSTAS' then 'COMERCIAL' when 'CONTRATOS' then 'CONTRATOS' else 'JURIDICO' end);
  if not exists (select 1 from clientes_escritorio where id = p_cliente and escritorio_id = p_escritorio) then
    raise exception 'Cliente não encontrado' using errcode = 'TC404';
  end if;
  if p_tipo = 'PROPOSTAS' then
    perform entrar_escritorio(p_pessoa, p_escritorio, 'propostas.ver');
    return jsonb_build_object('propostas', coalesce((
      select jsonb_agg(proposta_linha(p) || jsonb_build_object(
               'criadoPor', pessoa_ref(p.criado_por), 'enviadaEm', p.enviada_em, 'validaAte', p.valida_ate,
               'respondidaEm', p.respondida_em, 'temContrato', exists (select 1 from contratos c where c.proposta_id = p.id))
             order by p.criado_em desc)
        from propostas p where p.escritorio_id = p_escritorio and p.cliente_id = p_cliente), '[]'::jsonb));
  elsif p_tipo = 'CONTRATOS' then
    perform entrar_escritorio(p_pessoa, p_escritorio, 'contratos.ver');
    return jsonb_build_object('contratos', coalesce((
      select jsonb_agg(contrato_linha(c) || jsonb_build_object(
               'assinadoEm', c.assinado_em, 'semCaso', c.sem_caso, 'area', c.area,
               'proposta', (select jsonb_build_object('id', p.id, 'numero', p.numero) from propostas p where p.id = c.proposta_id),
               'caso', (select jsonb_build_object('id', ca.id, 'nome', ca.nome) from caso_clientes cc join casos ca on ca.id = cc.caso_id
                         where cc.contrato_id = c.id order by cc.criado_em limit 1))
             order by c.estado = 'ENCERRADO', c.criado_em desc)
        from contratos c where c.escritorio_id = p_escritorio and c.cliente_id = p_cliente), '[]'::jsonb));
  else
    perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.ver');
    return jsonb_build_object('casos', coalesce((
      select jsonb_agg(caso_linha(c) || jsonb_build_object(
               'papel', cc.papel, 'etapas', (select count(*) from etapas e where e.escritorio_id = p_escritorio),
               'contrato', (select jsonb_build_object('id', ct.id, 'numero', ct.numero) from contratos ct where ct.id = cc.contrato_id))
             order by c.situacao = 'ENCERRADO', c.etapa_desde desc)
        from caso_clientes cc join casos c on c.id = cc.caso_id
       where cc.escritorio_id = p_escritorio and cc.cliente_id = p_cliente), '[]'::jsonb));
  end if;
end $$;

-- ---------------------------------------------------------------------------------------
-- 4. A assinatura abre o caso.

-- O caso já ligado ao contrato (decisão 18), com o que a janela mostra.
create function contrato_caso_ligado(p_contrato uuid) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object('id', c.id, 'nome', c.nome, 'responsavel', pessoa_ref(c.responsavel_id),
           'etapa', (select e.nome from etapas e where e.id = c.etapa_id), 'situacao', c.situacao)
    from caso_clientes cc join casos c on c.id = cc.caso_id
   where cc.contrato_id = p_contrato
   order by cc.criado_em limit 1
$$;

-- O que se sugere para o caso novo: o nome do cliente e o objeto, a área do contrato e o
-- responsável do contrato, se tiver a área Jurídico; senão, a sócia dona mais antiga.
create function contrato_caso_sugestao(c contratos) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'nome', left(btrim(k.nome || ' · ' || c.objeto), 120),
    'area', coalesce(c.area, 'OUTRA'),
    'responsavelId', coalesce(
       case when 'JURIDICO' = any (areas_da_pessoa(c.responsavel_id, c.escritorio_id)) then c.responsavel_id end,
       (select v.pessoa_id from vinculos v where v.escritorio_id = c.escritorio_id and v.funcao = 'SOCIO' and v.revogado_em is null
         order by v.criado_em limit 1)),
    'papel', 'AUTOR')
    from clientes_escritorio k where k.id = c.cliente_id
$$;

-- Abre o caso do contrato ou junta o cliente a um caso (sem conferir área: quem chama confere).
create function contrato_ligar_caso(p_pessoa uuid, p_escritorio uuid, c contratos, p_caso jsonb, p_na_assinatura boolean) returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_jur boolean := 'JURIDICO' = any (areas_da_pessoa(p_pessoa, p_escritorio)) and pode(p_pessoa, p_escritorio, 'juridico.editar');
  v_modo text := coalesce(p_caso ->> 'modo', '');
  v_sug jsonb := contrato_caso_sugestao(c);
  d jsonb;
  e text[];
  v_etapa uuid;
  v_id uuid;
  v_papel text;
begin
  v_id := (contrato_caso_ligado(c.id) ->> 'id')::uuid;
  if v_id is not null then return v_id; end if;
  if v_modo = 'NOVO' then
    -- Quem não tem Jurídico abre com os dados do contrato, sem trocar nada (decisão 19).
    d := case when v_jur then v_sug || jsonb_strip_nulls(jsonb_build_object('nome', p_caso ->> 'nome', 'area', p_caso ->> 'area',
                                         'responsavelId', p_caso ->> 'responsavelId', 'papel', p_caso ->> 'papel'))
              else v_sug end;
    e := caso_erros(p_escritorio, d);
    if coalesce(d ->> 'papel', '') not in ('AUTOR', 'REU', 'INTERESSADO') then e := e || 'papel'::text; end if;
    if cardinality(e) > 0 then
      perform recusar_campos('Confira o caso', variadic (select array_agg(distinct 'caso.' || v order by 'caso.' || v) from unnest(e) v));
    end if;
    perform etapas_garantir(p_escritorio);
    select id into v_etapa from etapas where escritorio_id = p_escritorio and not final order by ordem limit 1;
    insert into casos (escritorio_id, nome, area, etapa_id, responsavel_id, criado_por)
    values (p_escritorio, btrim(d ->> 'nome'), d ->> 'area', v_etapa, (d ->> 'responsavelId')::uuid, p_pessoa)
    returning id into v_id;
    insert into caso_clientes (escritorio_id, caso_id, cliente_id, papel, contrato_id, ordem)
    values (p_escritorio, v_id, c.cliente_id, d ->> 'papel', c.id, 1);
    insert into caso_etapa_mudancas (escritorio_id, caso_id, para_etapa_id, motivo, por)
    values (p_escritorio, v_id, v_etapa,
            case when p_na_assinatura then 'Caso aberto na assinatura do contrato ' else 'Caso aberto do contrato ' end || c.numero || '.', p_pessoa);
    perform registrar_historico('juridico.caso_cadastrado', 'casos', v_id::text,
      jsonb_build_object('etapa', v_etapa, 'responsavel', d ->> 'responsavelId', 'clientes', 1, 'contrato', c.id, 'naAssinatura', p_na_assinatura));
    perform aviso_sino(p_escritorio, (d ->> 'responsavelId')::uuid, p_pessoa, 'CASO_ABERTO_NA_ASSINATURA', 'casos', v_id,
      jsonb_build_object('caso', btrim(d ->> 'nome'), 'cliente', (select nome from clientes_escritorio where id = c.cliente_id),
                         'contrato', c.numero, 'quem', (select nome from pessoas where id = p_pessoa)));
    return v_id;
  elsif v_modo = 'JUNTAR' then
    if not v_jur then
      raise exception 'Área não liberada para esta pessoa' using errcode = 'TC401', detail = jsonb_build_object('motivo', 'AREA_NAO_LIBERADA')::text;
    end if;
    begin v_id := nullif(p_caso ->> 'casoId', '')::uuid; exception when others then v_id := null; end;
    v_papel := coalesce(p_caso ->> 'papel', 'AUTOR');
    if v_id is null or not exists (select 1 from casos where id = v_id and escritorio_id = p_escritorio and situacao = 'ANDAMENTO') then
      perform recusar_campos('Escolha o caso', 'caso.casoId');
    end if;
    if v_papel not in ('AUTOR', 'REU', 'INTERESSADO') then perform recusar_campos('Confira o papel', 'caso.papel'); end if;
    if exists (select 1 from caso_clientes where caso_id = v_id and cliente_id = c.cliente_id and contrato_id is not null) then
      perform recusar_motivo('Este cliente já está no caso, com outro contrato', 'CLIENTE_JA_NO_CASO');
    end if;
    if exists (select 1 from caso_clientes where caso_id = v_id and cliente_id = c.cliente_id) then
      update caso_clientes set contrato_id = c.id where caso_id = v_id and cliente_id = c.cliente_id;
    else
      insert into caso_clientes (escritorio_id, caso_id, cliente_id, papel, contrato_id, ordem)
      values (p_escritorio, v_id, c.cliente_id, v_papel, c.id, (select coalesce(max(ordem), 0) + 1 from caso_clientes where caso_id = v_id));
    end if;
    perform registrar_historico('juridico.caso_cliente', 'casos', v_id::text,
      jsonb_build_object('cliente', c.cliente_id, 'papel', v_papel, 'contrato', c.id, 'naAssinatura', p_na_assinatura));
    return v_id;
  end if;
  perform recusar_campos('Escolha o que fazer com o caso', 'caso.modo');
  return null;
end $$;

-- O que a janela precisa: o caso já ligado, a sugestão, se a pessoa escolhe (tem Jurídico),
-- quem pode ser responsável e os casos em andamento para juntar.
create function portal_contrato_caso_opcoes(p_pessoa uuid, p_escritorio uuid, p_contrato uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c contratos;
  v_jur boolean;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.ver');
  if not (areas_da_pessoa(p_pessoa, p_escritorio) && array['CONTRATOS', 'JURIDICO']) then
    raise exception 'Área não liberada para esta pessoa' using errcode = 'TC401', detail = jsonb_build_object('motivo', 'AREA_NAO_LIBERADA')::text;
  end if;
  select * into c from contratos where id = p_contrato and escritorio_id = p_escritorio;
  if c.id is null then raise exception 'Contrato não encontrado' using errcode = 'TC404'; end if;
  v_jur := 'JURIDICO' = any (areas_da_pessoa(p_pessoa, p_escritorio)) and pode(p_pessoa, p_escritorio, 'juridico.editar');
  return jsonb_build_object(
    'contrato', jsonb_build_object('id', c.id, 'numero', c.numero, 'objeto', c.objeto, 'situacao', c.estado, 'versao', c.versao,
                                   'criadoEm', c.criado_em, 'area', c.area,
                                   'cliente', (select jsonb_build_object('id', k.id, 'nome', k.nome) from clientes_escritorio k where k.id = c.cliente_id)),
    'casoLigado', contrato_caso_ligado(c.id),
    'sugestao', contrato_caso_sugestao(c),
    'responsavelSugerido', pessoa_ref((contrato_caso_sugestao(c) ->> 'responsavelId')::uuid),
    'escolhe', v_jur,
    'responsaveis', case when v_jur then coalesce((
       select jsonb_agg(pessoa_ref(v.pessoa_id) order by p.nome)
         from (select distinct pessoa_id from vinculos where escritorio_id = p_escritorio and revogado_em is null) v
         join pessoas p on p.id = v.pessoa_id
        where 'JURIDICO' = any (areas_da_pessoa(v.pessoa_id, p_escritorio))), '[]'::jsonb) end,
    'casos', case when v_jur then coalesce((
       select jsonb_agg(jsonb_build_object('id', ca.id, 'nome', ca.nome, 'clientes', (select count(*) from caso_clientes x where x.caso_id = ca.id))
                        order by ca.nome)
         from casos ca where ca.escritorio_id = p_escritorio and ca.situacao = 'ANDAMENTO'), '[]'::jsonb) end);
end $$;

-- Registrar a assinatura e, na mesma transação, abrir o caso, juntar a um caso ou marcar que o
-- contrato não tem caso. Se o contrato já está num caso, volta esse caso.
create function portal_contrato_assinatura_caso(p_pessoa uuid, p_escritorio uuid, p_contrato uuid, p_versao integer,
                                                p_assinado_em date, p_caso jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r jsonb;
  c contratos;
  v_caso uuid;
  v_ja uuid := (contrato_caso_ligado(p_contrato) ->> 'id')::uuid;
  v_versao integer;
  v_modo text := coalesce(p_caso ->> 'modo', '');
begin
  perform entrar_area(p_pessoa, p_escritorio, 'CONTRATOS');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'contratos.editar');
  if v_modo not in ('NOVO', 'JUNTAR', 'SEM') and v_ja is null then
    perform recusar_campos('Escolha o que fazer com o caso', 'caso.modo');
  end if;
  r := portal_contrato_assinatura(p_pessoa, p_escritorio, p_contrato, p_versao, p_assinado_em);
  select * into c from contratos where id = p_contrato and escritorio_id = p_escritorio;
  if v_ja is null and v_modo = 'SEM' then
    update contratos set sem_caso = true where id = c.id returning versao into v_versao;
    r := r || jsonb_build_object('versao', v_versao);
    perform registrar_historico('contrato.sem_caso', 'contratos', c.id::text, '{}'::jsonb);
  else
    v_caso := contrato_ligar_caso(p_pessoa, p_escritorio, c, p_caso, true);
    perform registrar_historico('contrato.caso', 'contratos', c.id::text,
      jsonb_build_object('caso', v_caso, 'modo', case when v_ja is not null then 'JA_LIGADO' else v_modo end));
  end if;
  return r || jsonb_build_object('casoId', v_caso,
    'podeVerCaso', v_caso is not null and 'JURIDICO' = any (areas_da_pessoa(p_pessoa, p_escritorio)));
end $$;

-- Abrir o caso de um contrato já assinado (decisão 20). Exige a área Jurídico.
create function portal_contrato_caso(p_pessoa uuid, p_escritorio uuid, p_contrato uuid, p_caso jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c contratos;
  v_caso uuid;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.editar');
  select * into c from contratos where id = p_contrato and escritorio_id = p_escritorio for update;
  if c.id is null then raise exception 'Contrato não encontrado' using errcode = 'TC404'; end if;
  if c.estado <> 'ATIVO' then perform recusar_motivo('O contrato não está ativo', 'CONTRATO_NAO_ATIVO'); end if;
  if coalesce(p_caso ->> 'modo', '') not in ('NOVO', 'JUNTAR') then perform recusar_campos('Escolha o que fazer com o caso', 'caso.modo'); end if;
  v_caso := contrato_ligar_caso(p_pessoa, p_escritorio, c, p_caso, false);
  perform registrar_historico('contrato.caso', 'contratos', c.id::text, jsonb_build_object('caso', v_caso, 'modo', p_caso ->> 'modo'));
  return jsonb_build_object('casoId', v_caso);
end $$;

-- ---------------------------------------------------------------------------------------
-- 5. A área do direito no contrato (pergunta 6): opcional, no novo e no mudar.
create function contrato_gravar_area(p_escritorio uuid, p_contrato uuid, p_dados jsonb) returns integer
language plpgsql
set search_path = public
as $$
declare
  v_area text := nullif(p_dados ->> 'area', '');
  v_versao integer;
begin
  if not (p_dados ? 'area') then return null; end if;
  if v_area is not null and not area_direito_valida(v_area) then perform recusar_campos('Confira a área', 'area'); end if;
  update contratos set area = v_area where id = p_contrato and escritorio_id = p_escritorio and area is distinct from v_area
  returning versao into v_versao;
  return v_versao;
end $$;

create function portal_contrato_criar_area(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r jsonb;
  v integer;
begin
  if nullif(p_dados ->> 'area', '') is not null and not area_direito_valida(p_dados ->> 'area') then perform recusar_campos('Confira a área', 'area'); end if;
  r := portal_contrato_criar_oab(p_pessoa, p_escritorio, p_dados - 'area');
  v := contrato_gravar_area(p_escritorio, (r ->> 'id')::uuid, p_dados);
  return case when v is null then r else r || jsonb_build_object('versao', v) end;
end $$;

create function portal_contrato_condicoes_area(p_pessoa uuid, p_escritorio uuid, p_contrato uuid, p_versao integer, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r jsonb;
  v integer;
begin
  if nullif(p_dados ->> 'area', '') is not null and not area_direito_valida(p_dados ->> 'area') then perform recusar_campos('Confira a área', 'area'); end if;
  r := portal_contrato_condicoes_oab(p_pessoa, p_escritorio, p_contrato, p_versao, p_dados - 'area');
  v := contrato_gravar_area(p_escritorio, p_contrato, p_dados);
  return case when v is null then r else r || jsonb_build_object('versao', v) end;
end $$;

-- A ficha do contrato traz a área, o "não tem caso" e o caso ligado.
alter function portal_contrato(uuid, uuid, uuid) rename to portal_contrato_sem_caso;

create function portal_contrato(p_pessoa uuid, p_escritorio uuid, p_contrato uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r jsonb := portal_contrato_sem_caso(p_pessoa, p_escritorio, p_contrato);
begin
  return r || (select jsonb_build_object('area', c.area, 'semCaso', c.sem_caso,
                 'caso', case when 'JURIDICO' = any (areas_da_pessoa(p_pessoa, p_escritorio)) then contrato_caso_ligado(c.id)
                              else (select jsonb_build_object('existe', true, 'responsavel', x -> 'responsavel') from contrato_caso_ligado(c.id) x where x is not null) end)
                 from contratos c where c.id = p_contrato and c.escritorio_id = p_escritorio);
end $$;

call fechar_acesso();
