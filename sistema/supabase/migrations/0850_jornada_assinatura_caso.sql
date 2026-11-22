-- Jornada do cliente, parte 1 (F3.125, F3.126; CH-11, CH-12), pelo desenho aprovado em
-- docs/design/aprovadas/portal-jornada-fechamento (grupos 1 a 3, decisões 1 a 13):
-- 1. Toda assinatura passa pela pergunta do caso. A rota da assinatura passa a exigir o caso
--    (a api-portal confere); aqui o "Abrir o caso" de contrato já assinado ganha o "não tem caso"
--    (decisão 8), para o contrato de consultoria sair da lista dos assinados sem caso.
-- 2. Os assinados sem caso: contratos ativos, sem a marca "não tem caso" e sem caso ligado. A
--    mesma lista serve ao filtro de Contratos e ao aviso de Jurídico › Casos e processos.
-- 3. Juntar ao caso que já existe (CH-12): se o cliente está num caso em andamento sem contrato,
--    a janela sugere juntar a esse caso. Juntar com o cliente já no caso só liga o contrato à
--    linha dele (contrato_ligar_caso, 0740, já faz isso).

-- ---------------------------------------------------------------------------------------
-- Os casos em andamento em que o cliente está sem contrato (decisão 11).
create function casos_do_cliente_sem_contrato(p_escritorio uuid, p_cliente uuid) returns jsonb
language sql stable
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'nome', c.nome, 'papel', cc.papel,
           'etapa', (select e.nome from etapas e where e.id = c.etapa_id), 'responsavel', pessoa_ref(c.responsavel_id),
           'abertoPor', pessoa_ref(c.criado_por), 'abertoEm', c.criado_em) order by c.criado_em desc), '[]'::jsonb)
    from caso_clientes cc join casos c on c.id = cc.caso_id
   where cc.escritorio_id = p_escritorio and cc.cliente_id = p_cliente and cc.contrato_id is null and c.situacao = 'ANDAMENTO'
$$;

create or replace function portal_contrato_caso_opcoes(p_pessoa uuid, p_escritorio uuid, p_contrato uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c contratos;
  v_jur boolean;
  v_do_cliente jsonb;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.ver');
  if not (areas_da_pessoa(p_pessoa, p_escritorio) && array['CONTRATOS', 'JURIDICO']) then
    raise exception 'Área não liberada para esta pessoa' using errcode = 'TC401', detail = jsonb_build_object('motivo', 'AREA_NAO_LIBERADA')::text;
  end if;
  select * into c from contratos where id = p_contrato and escritorio_id = p_escritorio;
  if c.id is null then raise exception 'Contrato não encontrado' using errcode = 'TC404'; end if;
  v_jur := 'JURIDICO' = any (areas_da_pessoa(p_pessoa, p_escritorio)) and pode(p_pessoa, p_escritorio, 'juridico.editar');
  v_do_cliente := casos_do_cliente_sem_contrato(p_escritorio, c.cliente_id);
  return jsonb_build_object(
    'contrato', jsonb_build_object('id', c.id, 'numero', c.numero, 'objeto', c.objeto, 'situacao', c.estado, 'versao', c.versao,
                                   'criadoEm', c.criado_em, 'area', c.area, 'semCaso', c.sem_caso,
                                   'cliente', (select jsonb_build_object('id', k.id, 'nome', k.nome) from clientes_escritorio k where k.id = c.cliente_id)),
    'casoLigado', contrato_caso_ligado(c.id),
    'sugestao', contrato_caso_sugestao(c),
    'responsavelSugerido', pessoa_ref((contrato_caso_sugestao(c) ->> 'responsavelId')::uuid),
    'escolhe', v_jur,
    -- CH-12: juntar ao caso do cliente vem marcado, só para quem escolhe.
    'modoSugerido', case when v_jur and jsonb_array_length(v_do_cliente) > 0 then 'JUNTAR' else 'NOVO' end,
    'casosDoCliente', case when v_jur then v_do_cliente end,
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

-- ---------------------------------------------------------------------------------------
-- "Abrir o caso" de contrato já assinado: abrir, juntar ou, agora, dizer que não tem caso
-- (decisão 8). Abrir ou juntar tira a marca "não tem caso" (decisão 28, CH-13).
create or replace function portal_contrato_caso(p_pessoa uuid, p_escritorio uuid, p_contrato uuid, p_caso jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c contratos;
  v_caso uuid;
  v_modo text := coalesce(p_caso ->> 'modo', '');
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.editar');
  select * into c from contratos where id = p_contrato and escritorio_id = p_escritorio for update;
  if c.id is null then raise exception 'Contrato não encontrado' using errcode = 'TC404'; end if;
  if c.estado <> 'ATIVO' then perform recusar_motivo('O contrato não está ativo', 'CONTRATO_NAO_ATIVO'); end if;
  if v_modo not in ('NOVO', 'JUNTAR', 'SEM') then perform recusar_campos('Escolha o que fazer com o caso', 'caso.modo'); end if;
  if v_modo = 'SEM' then
    if contrato_caso_ligado(c.id) is not null then perform recusar_motivo('O contrato já está num caso', 'CONTRATO_COM_CASO'); end if;
    if not c.sem_caso then
      update contratos set sem_caso = true where id = c.id;
      perform registrar_historico('contrato.sem_caso', 'contratos', c.id::text, '{}'::jsonb);
    end if;
    return jsonb_build_object('casoId', null, 'semCaso', true);
  end if;
  v_caso := contrato_ligar_caso(p_pessoa, p_escritorio, c, p_caso, false);
  if c.sem_caso then
    update contratos set sem_caso = false where id = c.id;
    perform registrar_historico('contrato.sem_caso_desfeito', 'contratos', c.id::text, jsonb_build_object('caso', v_caso));
  end if;
  perform registrar_historico('contrato.caso', 'contratos', c.id::text, jsonb_build_object('caso', v_caso, 'modo', v_modo));
  return jsonb_build_object('casoId', v_caso, 'semCaso', false);
end $$;

-- ---------------------------------------------------------------------------------------
-- Os assinados sem caso (decisões 7, 9 e 10): para quem tem Contratos ou Jurídico. "podeAbrir"
-- diz se a pessoa abre o caso (tem Jurídico); senão, "quemAbre" diz quem pode.
create function portal_contratos_sem_caso(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pode boolean;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.ver');
  if not (areas_da_pessoa(p_pessoa, p_escritorio) && array['CONTRATOS', 'JURIDICO']) then
    raise exception 'Área não liberada para esta pessoa' using errcode = 'TC401', detail = jsonb_build_object('motivo', 'AREA_NAO_LIBERADA')::text;
  end if;
  v_pode := 'JURIDICO' = any (areas_da_pessoa(p_pessoa, p_escritorio)) and pode(p_pessoa, p_escritorio, 'juridico.editar');
  return jsonb_build_object(
    'podeAbrir', v_pode,
    'quemAbre', case when not v_pode then quem_tem_area(p_escritorio, 'JURIDICO') end,
    'contratos', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'numero', c.numero, 'objeto', c.objeto, 'assinadoEm', c.assinado_em,
               'area', c.area, 'responsavel', pessoa_ref(c.responsavel_id),
               'cliente', jsonb_build_object('id', k.id, 'nome', k.nome)) order by c.assinado_em desc nulls last, c.numero desc)
        from contratos c join clientes_escritorio k on k.id = c.cliente_id
       where c.escritorio_id = p_escritorio and c.estado = 'ATIVO' and not c.sem_caso
         and not exists (select 1 from caso_clientes cc where cc.contrato_id = c.id)), '[]'::jsonb));
end $$;

call fechar_acesso();
