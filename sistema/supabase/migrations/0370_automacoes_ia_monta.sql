-- Automações › a IA monta o fluxo (F3.59; PA-03). Tela aprovada em
-- docs/design/aprovadas/portal-conversas-automacoes (estados pedir e sugestao): a pessoa pede em
-- linguagem simples, a IA devolve o desenho inteiro e ele fica guardado como sugestão. Na tela, o
-- que ainda não está no rascunho aparece tracejado, com aplicar e recusar. Nada sai antes de testar
-- e a sócia dona ligar. O modelo roda no serviço (api-portal); o banco entrega o contexto (só o que
-- a pessoa pode usar) e confere o formato do que volta.

alter table automacoes add column sugestao jsonb check (sugestao is null or jsonb_typeof(sugestao) = 'object');

create or replace function automacao_linha(a automacoes) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', a.id, 'versao', a.versao, 'nome', a.nome, 'origem', a.origem, 'prontaChave', a.pronta_chave,
    'gatilho', a.gatilho, 'area', a.area, 'situacao', a.situacao,
    'fluxo', coalesce(automacao_fluxo_valendo(a), a.rascunho),
    'versaoLigada', a.versao_ligada,
    'aguardando', case when a.versao_aguardando is not null then jsonb_build_object('numero', a.versao_aguardando, 'desde', a.aguardando_desde) end,
    'desligada', case when a.desligada_em is not null then jsonb_build_object('em', a.desligada_em, 'motivo', a.desligada_motivo, 'por', pessoa_ref(a.desligada_por)) end,
    'erros', jsonb_array_length(automacao_erros(a)),
    'textosPorAprovar', jsonb_array_length(automacao_textos_por_aprovar(a.rascunho)),
    'rascunhoMudou', a.versao_ligada is not null and a.rascunho is distinct from automacao_fluxo_valendo(a),
    'seteDias', (select jsonb_build_object('enviadas', count(*) filter (where e.situacao in ('EM_ANDAMENTO', 'CONCLUIDA', 'FALHOU')),
                                           'falhas', count(*) filter (where e.situacao = 'FALHOU'))
                   from automacao_execucoes e where e.automacao_id = a.id and e.iniciada_em >= app_now() - interval '7 days'),
    'atualizadaPor', pessoa_ref(a.atualizada_por), 'atualizadaEm', a.atualizada_em,
    'criadaPor', pessoa_ref(a.criada_por), 'criadaEm', a.criada_em,
    'sugestao', a.sugestao)
$$;

create or replace function portal_automacao_salvar(p_pessoa uuid, p_escritorio uuid, p_id uuid, p_versao integer, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare a automacoes; v_fluxo jsonb := coalesce(p_dados -> 'fluxo', null); v_nome text := btrim(p_dados ->> 'nome'); v_x text; v_sug jsonb;
begin
  a := automacao_para_mudar(p_pessoa, p_escritorio, p_id);
  perform portal_exigir_escrita(p_pessoa, p_escritorio);
  if not (a.area = any (areas_da_pessoa(p_pessoa, p_escritorio))) then
    raise exception 'Área não liberada para esta pessoa' using errcode = 'TC401', detail = jsonb_build_object('motivo', 'AREA_NAO_LIBERADA')::text;
  end if;
  if v_nome is not null and (length(v_nome) not between 3 and 80 or a.origem = 'PRONTA') then
    perform recusar_campos('Dê um nome de 3 a 80 letras', 'nome');
  end if;
  if v_fluxo is not null then
    v_x := automacao_forma(a.gatilho, v_fluxo);
    if v_x is not null then
      raise exception 'O desenho não está no formato: %', v_x using errcode = 'TC422',
        detail = jsonb_build_object('campos', jsonb_build_array('fluxo'), 'forma', v_x)::text;
    end if;
    -- Os avisos só nas prontas, e os modelos só os desta automação.
    if a.origem <> 'PRONTA' and exists (select 1 from jsonb_path_query(v_fluxo, 'strict $.**') x where jsonb_typeof(x) = 'object' and x ? 'aviso' and x ->> 'aviso' is not null) then
      perform recusar_campos('O texto do aviso pronto é só das prontas', 'fluxo');
    end if;
    if exists (select 1 from unnest(automacao_modelos_do_fluxo(v_fluxo)) m
                where not exists (select 1 from automacao_modelos o where o.id = m and o.automacao_id = a.id)) then
      perform recusar_campos('O texto aprovado não é desta automação', 'fluxo');
    end if;
  end if;
  -- F3.59: aplicar ou recusar sugestões da IA muda também o que sobra da sugestão (nula quando
  -- não sobra nada). A sugestão só encolhe por aqui; quem a cria é portal_automacao_ia_sugerir.
  if p_dados ? 'sugestao' then
    if jsonb_typeof(p_dados -> 'sugestao') = 'null' then
      v_sug := null;
    elsif a.sugestao is null or jsonb_typeof(p_dados -> 'sugestao') <> 'object' or automacao_forma(a.gatilho, p_dados -> 'sugestao' -> 'fluxo') is not null
          or exists (select 1 from jsonb_object_keys(p_dados -> 'sugestao') k where k <> 'fluxo') then
      perform recusar_campos('A sugestão não está no formato', 'sugestao');
    else
      v_sug := a.sugestao || jsonb_build_object('fluxo', p_dados -> 'sugestao' -> 'fluxo');
    end if;
  else
    v_sug := a.sugestao;
  end if;
  update automacoes set rascunho = coalesce(v_fluxo, rascunho), nome = coalesce(v_nome, nome), sugestao = v_sug,
                        atualizada_por = p_pessoa, atualizada_em = app_now()
   where id = a.id and versao = p_versao;
  if not found then perform conflito_versao('automacoes', a.id); end if;
  return portal_automacao(p_pessoa, p_escritorio, a.id);
end $$;

-- O que a IA recebe para montar: os gatilhos das áreas da pessoa, a equipe, as automações
-- ligadas e, ao mudar uma, o desenho de agora. As prontas do T3jus não passam pela IA.
create function portal_automacao_ia_contexto(p_pessoa uuid, p_escritorio uuid, p_id uuid default null) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare a automacoes; v_areas text[]; v_gatilhos text[];
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'conversas.editar');
  perform portal_exigir_escrita(p_pessoa, p_escritorio);
  perform automacoes_garantir(p_escritorio);
  v_areas := areas_da_pessoa(p_pessoa, p_escritorio);
  if p_id is not null then
    a := automacao_para_mudar(p_pessoa, p_escritorio, p_id);
    if not (a.area = any (v_areas)) then
      raise exception 'Área não liberada para esta pessoa' using errcode = 'TC401', detail = jsonb_build_object('motivo', 'AREA_NAO_LIBERADA')::text;
    end if;
    if a.origem = 'PRONTA' then
      raise exception 'As prontas do T3jus não passam pela IA' using errcode = 'TC422',
        detail = jsonb_build_object('campos', jsonb_build_array('pedido'), 'motivo', 'PRONTA')::text;
    end if;
    v_gatilhos := array[a.gatilho];
  else
    select coalesce(array_agg(g order by o), '{}') into v_gatilhos
      from unnest(array['PAGAMENTO_RECEBIDO', 'PARCELA_VAI_VENCER', 'PARCELA_ATRASO', 'ETAPA_CASO', 'LEMBRETE_AUDIENCIA', 'PRESTACAO_CONTAS']) with ordinality x(g, o)
     where automacao_area(g) = any (v_areas);
    if cardinality(v_gatilhos) = 0 then
      raise exception 'Área não liberada para esta pessoa' using errcode = 'TC401', detail = jsonb_build_object('motivo', 'AREA_NAO_LIBERADA')::text;
    end if;
  end if;
  return jsonb_build_object(
    'escritorio', (select nome from escritorios where id = p_escritorio),
    'eu', pessoa_ref(p_pessoa),
    'gatilhos', to_jsonb(v_gatilhos),
    'pessoas', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'nome', p.nome, 'areas', to_jsonb(areas_da_pessoa(p.id, p_escritorio)),
                                                             'dono', v.funcao = 'SOCIO') order by p.nome), '[]'::jsonb)
                  from vinculos v join pessoas p on p.id = v.pessoa_id
                 where v.escritorio_id = p_escritorio and v.revogado_em is null and v.funcao in ('SOCIO', 'EQUIPE')),
    'ligadas', (select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'nome', x.nome, 'gatilho', x.gatilho) order by x.criada_em), '[]'::jsonb)
                  from automacoes x where x.escritorio_id = p_escritorio and x.situacao in ('LIGADA', 'EM_APROVACAO')),
    'atual', case when a.id is not null then jsonb_build_object('id', a.id, 'nome', a.nome, 'gatilho', a.gatilho, 'rascunho', a.rascunho) end);
end $$;

-- Guarda a sugestão da IA. Sem automação, cria uma em rascunho só com o gatilho e as condições
-- (o resto fica tracejado até a pessoa aplicar). O formato é o mesmo de salvar.
create function portal_automacao_ia_sugerir(p_pessoa uuid, p_escritorio uuid, p_id uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a automacoes;
  v_fluxo jsonb := p_dados -> 'fluxo';
  v_gatilho text := p_dados ->> 'gatilho';
  v_pedido text := btrim(coalesce(p_dados ->> 'pedido', ''));
  v_nome text := left(btrim(coalesce(p_dados ->> 'nome', '')), 80);
  v_x text;
  v_sug jsonb;
begin
  perform portal_automacao_ia_contexto(p_pessoa, p_escritorio, p_id);
  if length(v_pedido) not between 3 and 600 then perform recusar_campos('Escreva o pedido', 'pedido'); end if;
  if p_id is not null then
    select * into a from automacoes where id = p_id and escritorio_id = p_escritorio;
    v_gatilho := a.gatilho;
  elsif automacao_area(v_gatilho) is null or not (automacao_area(v_gatilho) = any (areas_da_pessoa(p_pessoa, p_escritorio))) then
    perform recusar_campos('Gatilho fora das suas áreas', 'gatilho');
  end if;
  v_x := automacao_forma(v_gatilho, v_fluxo);
  if v_x is not null then
    raise exception 'O desenho não está no formato: %', v_x using errcode = 'TC422',
      detail = jsonb_build_object('campos', jsonb_build_array('fluxo'), 'forma', v_x)::text;
  end if;
  if exists (select 1 from jsonb_path_query(v_fluxo, 'strict $.**') x where jsonb_typeof(x) = 'object' and x ? 'aviso' and x ->> 'aviso' is not null)
     or exists (select 1 from unnest(automacao_modelos_do_fluxo(v_fluxo)) m
                 where not exists (select 1 from automacao_modelos o where o.id = m and o.automacao_id = a.id)) then
    perform recusar_campos('O texto aprovado não é desta automação', 'fluxo');
  end if;
  v_sug := jsonb_build_object(
    'pedido', v_pedido, 'por', pessoa_ref(p_pessoa), 'em', app_now(), 'fluxo', v_fluxo,
    'feito', coalesce((select jsonb_agg(x) from (select x from jsonb_array_elements(coalesce(p_dados -> 'feito', '[]')) x limit 8) t), '[]'::jsonb),
    'alertas', coalesce((select jsonb_agg(x) from (select x from jsonb_array_elements(coalesce(p_dados -> 'alertas', '[]')) x limit 8) t), '[]'::jsonb),
    'experimente', coalesce((select jsonb_agg(x) from (select x from jsonb_array_elements(coalesce(p_dados -> 'experimente', '[]')) x
                                                        where jsonb_typeof(x) = 'string' and length(x #>> '{}') between 3 and 120 limit 3) t), '[]'::jsonb));
  if p_id is null then
    if length(v_nome) < 3 then v_nome := (select case v_gatilho when 'PAGAMENTO_RECEBIDO' then 'Pagamento recebido' when 'PARCELA_VAI_VENCER' then 'Parcela vai vencer'
                                                               when 'PARCELA_ATRASO' then 'Parcela em atraso' when 'ETAPA_CASO' then 'Etapa do caso'
                                                               when 'LEMBRETE_AUDIENCIA' then 'Lembrete de audiência' else 'Prestação de contas' end); end if;
    insert into automacoes (escritorio_id, nome, origem, gatilho, area, rascunho, sugestao, criada_por, atualizada_por)
    values (p_escritorio, v_nome, 'ESCRITORIO', v_gatilho, automacao_area(v_gatilho),
            jsonb_build_object('passos', (select jsonb_agg(x order by o) from jsonb_array_elements(v_fluxo -> 'passos') with ordinality t(x, o)
                                            where x ->> 'tipo' in ('GATILHO', 'CONDICOES'))),
            v_sug, p_pessoa, p_pessoa)
    returning * into a;
    insert into automacao_eventos (escritorio_id, automacao_id, tipo, detalhe, pessoa_id)
    values (p_escritorio, a.id, 'CRIADA', jsonb_build_object('ia', true), p_pessoa);
  else
    update automacoes set sugestao = v_sug where id = a.id;
  end if;
  perform registrar_historico('automacao.ia_sugeriu', 'automacoes', a.id::text, jsonb_build_object('gatilho', v_gatilho));
  return portal_automacao(p_pessoa, p_escritorio, a.id);
end $$;

call fechar_acesso();
