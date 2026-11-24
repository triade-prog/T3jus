-- Documentos marcados conforme a área (F3.170 e F3.171; CH-14), pelo desenho aprovado em
-- docs/design/aprovadas/portal-documentos-por-area (D36; Carol, 24/11/2026, 15h13 da Bahia, com as 5
-- recomendações). Plano e revisão: telas/documentos-por-tipo/PLANO.md e REVISAO.md (a revisão vale
-- sobre o plano; feitos os ajustes 1 a 6 e os opcionais 7, 8, 9, 10, 12 e 13).
--
-- O que entra:
-- 1. "Tipo de processo" é a área do direito que o contrato e o caso já guardam (pergunta 1): as 8 de
--    area_direito_valida, com OUTRA valendo também "contrato sem área".
-- 2. A tabela documentos_por_area: uma linha por escritório e área, com as chaves dos documentos que
--    vêm marcados em Gerar documentos (CONTRATO, PROCURACAO, HIPOSSUFICIENCIA e OUTRO:<modelo>).
--    Enquanto o escritório não salva uma área, vale a sugestão do T3jus, igual à de hoje nas 8 áreas
--    (pergunta 4, revisão, ajuste 3): uma constante, sem selo "em revisão" e sem item da advogada.
--    Quem muda é quem tem contratos.editar (pergunta 3), com o Portal aberto para escrita
--    (documento_entrar(..., true) já chama portal_exigir_escrita).
-- 3. O modelo próprio arquivado sai das áreas na leitura (documento_area_lista): nada se apaga, e ele
--    não volta sozinho. A lista guarda chaves em text[] (revisão, ajuste 11, a critério de quem
--    programa); a segurança vem do check (formato, sem repetidos, até 12), da conferência de cada
--    OUTRO: ao salvar (modelo do escritório da sessão, ativo, tipo OUTRO) e do filtro na leitura.
-- 4. Gerar documentos (portal_documento_dados, embrulho novo) recebe "sugestao": a área (a do caso
--    mais antigo ligado ao contrato, senão a do contrato, senão OUTRA), a origem, a lista de cada
--    área, as áreas salvas, os documentos que entraram na lista de uma área depois da última geração
--    (pergunta 5, tirados do histórico documento.area_salva) e se a área escolhida vai ao contrato.
-- 5. Gerar (portal_documento_gravar, embrulho novo) aceita p_pedido.area. Só grava no contrato em
--    elaboração, sem área e sem caso ligado (pergunta 2, revisão, ajuste 2), conferido no servidor
--    depois da geração, com o contrato travado (for update). OUTRA ("Outra ou sem área") nunca grava.
--    No contrato ativo ou encerrado, a área vale só para a tela. A gravação fica em
--    contrato.area_definida, com a origem GERAR_DOCUMENTOS.
-- 6. Histórico: documento.area_salva ({ area, de, para }, só chaves) e contrato.area_definida. Não há
--    linha por geração (revisão, ajuste 10); documento.gerado (0680) não muda.
--
-- Funções recriadas e de onde partem (conferido no main depois do PR #172):
--   portal_documento_dados ...... 0960 (o embrulho de 0930; nenhuma migration depois o recria).
--                                 Renomeada para portal_documento_dados_sem_area.
--   portal_documento_gravar ..... 0680 (nunca embrulhada). Renomeada para portal_documento_gravar_sem_area.
-- Novas e não security definer (só as portal_* as chamam, depois de entrar no escritório da sessão):
--   documento_area_sugestao, documentos_por_area_validos, documento_area_ordenar,
--   documento_area_lista, documento_area_linha e documento_sugestao_area.

-- ---------------------------------------------------------------------------------------
-- 1. A sugestão do T3jus e as regras da lista.

-- Igual à de hoje nas 8 áreas (revisão, ajuste 3). O parâmetro fica para crescer sem mudar quem chama.
create function documento_area_sugestao(p_area text) returns text[]
language sql immutable
as $$ select array['CONTRATO', 'PROCURACAO', 'HIPOSSUFICIENCIA']::text[] $$;

-- As áreas na ordem da folha (a de Documentos para começar, com "Outra ou sem área" no fim).
create function documento_areas() returns text[]
language sql immutable
as $$ select array['PREVIDENCIARIO', 'TRABALHISTA', 'CIVEL', 'CONSUMIDOR', 'FAMILIA', 'SAUDE', 'TRIBUTARIO', 'OUTRA']::text[] $$;

-- O formato da lista (revisão, ajuste 5): até 12 chaves, cada uma no formato, sem repetidos e sem nulo.
create function documentos_por_area_validos(p text[]) returns boolean
language sql immutable
as $$
  select p is not null and cardinality(p) <= 12 and array_position(p, null) is null
     and not exists (select 1 from unnest(p) k
                      where k !~ '^(CONTRATO|PROCURACAO|HIPOSSUFICIENCIA|OUTRO:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$')
     and (select count(distinct k) from unnest(p) k) = cardinality(p)
$$;

-- ---------------------------------------------------------------------------------------
-- 2. A tabela.

create table documentos_por_area (
  id              uuid primary key default gen_random_uuid(),
  escritorio_id   uuid not null references escritorios (id) on delete restrict,
  area            text not null check (area_direito_valida(area)),
  documentos      text[] not null check (documentos_por_area_validos(documentos)),
  versao          integer not null default 1,
  atualizado_por  uuid not null references pessoas (id) on delete restrict,
  atualizado_em   timestamptz not null default app_now(),
  unique (escritorio_id, area)
);
call proteger_tabela_escritorio('documentos_por_area');

-- A lista não se apaga: "Voltar à sugestão do T3jus" é salvar a sugestão (como documentos_inicio, TC023).
create function documentos_por_area_sem_apagar() returns trigger
language plpgsql
as $$
begin
  raise exception 'A lista da área não se apaga: volte à sugestão do T3jus' using errcode = 'TC023';
end $$;
create trigger documentos_por_area_sem_apagar before delete on documentos_por_area
  for each row execute function documentos_por_area_sem_apagar();

-- Sem dado pessoal, como documento_modelos e documentos_inicio: os campos de prazo ficam nulos.
insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('documentos_por_area', false, 'Os documentos que vêm marcados em Gerar documentos em cada área do direito, com quem mudou e quando',
  null, null, null, null, null, null, true);

-- ---------------------------------------------------------------------------------------
-- 3. Leitura.

-- Normaliza a ordem pela dos modelos (contrato, procuração, declaração e os outros pela ordem de envio)
-- e tira os repetidos (revisão, ajuste 5): igualSugestao compara conjuntos.
create function documento_area_ordenar(p_escritorio uuid, p_docs text[]) returns text[]
language sql stable
set search_path = public
as $$
  select coalesce(array_agg(x.k order by case x.k when 'CONTRATO' then 1 when 'PROCURACAO' then 2 when 'HIPOSSUFICIENCIA' then 3 else 4 end,
                                       m.ordem nulls last, x.k), '{}'::text[])
    from (select distinct k from unnest(p_docs) k where k is not null) x
    left join documento_modelos m on x.k like 'OUTRO:%' and m.escritorio_id = p_escritorio and m.id::text = substr(x.k, 7)
$$;

-- A lista que vale para a área: a salva ou a sugestão, sempre sem os OUTRO que não estão ativos.
-- Não é security definer: recebe o escritório já lido da sessão por uma portal_* (revisão, ajuste 5).
create function documento_area_lista(p_escritorio uuid, p_area text) returns text[]
language sql stable
set search_path = public
as $$
  select coalesce(array_agg(x.k order by x.n), '{}'::text[])
    from unnest(coalesce((select r.documentos from documentos_por_area r where r.escritorio_id = p_escritorio and r.area = p_area),
                         documento_area_sugestao(p_area))) with ordinality x(k, n)
   where x.k not like 'OUTRO:%'
      or exists (select 1 from documento_modelos m
                  where m.escritorio_id = p_escritorio and m.tipo = 'OUTRO' and m.arquivado_em is null and 'OUTRO:' || m.id::text = x.k)
$$;

create function documento_area_linha(p_escritorio uuid, p_area text) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'area', p_area,
    'documentos', to_jsonb(l.lista),
    'sugestao', to_jsonb(l.sug),
    'igualSugestao', l.lista @> l.sug and l.sug @> l.lista,
    'salva', r.id is not null,
    'versao', r.versao,
    'atualizadoPor', case when r.id is not null then pessoa_ref(r.atualizado_por) end,
    'atualizadoEm', r.atualizado_em)
    from (select documento_area_lista(p_escritorio, p_area) lista, documento_area_sugestao(p_area) sug) l
    left join documentos_por_area r on r.escritorio_id = p_escritorio and r.area = p_area
$$;

-- A folha "Documentos por área", em Modelos de documento. Quem vê Contratos lê; quem pode enviar
-- modelo muda (pergunta 3). "leitura" diz por que a folha está só para ler.
create function portal_documentos_por_area(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_aberto boolean;
  v_pode boolean;
begin
  perform documento_entrar(p_pessoa, p_escritorio, false);
  v_aberto := contrato_situacao(p_escritorio) in ('ABERTO', 'MARCADO') and (contexto_equipe() or portal_so_consulta_desde(p_escritorio) is null);
  v_pode := pode(p_pessoa, p_escritorio, 'contratos.editar');
  return jsonb_build_object(
    'podeEditar', v_aberto and v_pode,
    'leitura', case when not v_aberto then 'SO_CONSULTA' when not v_pode then 'SEM_PERMISSAO' end,
    'areas', (select jsonb_agg(documento_area_linha(p_escritorio, a) order by n) from unnest(documento_areas()) with ordinality x(a, n)),
    'modelos', (
      select jsonb_agg(j order by o1, o2) from (
        select t.n o1, 0::bigint o2,
               jsonb_build_object('chave', t.t, 'tipo', t.t, 'doEscritorio', m.id is not null,
                                  'nome', case t.t when 'CONTRATO' then 'Contrato de honorários' when 'PROCURACAO' then 'Procuração' else 'Declaração de hipossuficiência' end,
                                  'numero', (select max(v.numero) from documento_modelo_versoes v where v.modelo_id = m.id),
                                  'enviadoEm', m.criado_em) j
          from unnest(array['CONTRATO', 'PROCURACAO', 'HIPOSSUFICIENCIA']) with ordinality t(t, n)
          left join documento_modelos m on m.escritorio_id = p_escritorio and m.tipo = t.t and m.arquivado_em is null
        union all
        select 4, m.ordem,
               jsonb_build_object('chave', 'OUTRO:' || m.id::text, 'tipo', 'OUTRO', 'doEscritorio', true, 'nome', m.nome,
                                  'numero', (select max(v.numero) from documento_modelo_versoes v where v.modelo_id = m.id),
                                  'enviadoEm', m.criado_em)
          from documento_modelos m where m.escritorio_id = p_escritorio and m.tipo = 'OUTRO' and m.arquivado_em is null) x));
end $$;

-- ---------------------------------------------------------------------------------------
-- 4. Salvar uma área (também "Voltar à sugestão do T3jus", que salva a sugestão).

create function portal_documentos_por_area_salvar(p_pessoa uuid, p_escritorio uuid, p_area text, p_versao integer, p_documentos jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v documentos_por_area;
  r documentos_por_area;
  v_docs text[];
  v_de text[];
begin
  perform documento_entrar(p_pessoa, p_escritorio, true);
  if not coalesce(area_direito_valida(p_area), false) then perform recusar_campos('Confira a área', 'area'); end if;
  if jsonb_typeof(p_documentos) is distinct from 'array'
     or exists (select 1 from jsonb_array_elements(p_documentos) e where jsonb_typeof(e) <> 'string') then
    perform recusar_campos('Confira os documentos', 'documentos');
  end if;
  v_docs := array(select jsonb_array_elements_text(p_documentos));
  if not documentos_por_area_validos(array(select distinct k from unnest(v_docs) k)) then
    perform recusar_campos('Confira os documentos', 'documentos');
  end if;
  -- Cada OUTRO: é um modelo do escritório da sessão, ativo e do tipo OUTRO.
  if exists (select 1 from unnest(v_docs) k
              where k like 'OUTRO:%'
                and not exists (select 1 from documento_modelos m where m.escritorio_id = p_escritorio and m.tipo = 'OUTRO'
                                   and m.arquivado_em is null and 'OUTRO:' || m.id::text = k)) then
    raise exception 'Um dos modelos não está mais disponível' using errcode = 'TC422',
      detail = jsonb_build_object('campos', jsonb_build_array('documentos'), 'motivo', 'MODELO_INVALIDO')::text;
  end if;
  v_docs := documento_area_ordenar(p_escritorio, v_docs);

  select * into v from documentos_por_area where escritorio_id = p_escritorio and area = p_area for update;
  if p_versao is null then
    -- A primeira gravação da área. Quem salvou junto (as duas com versão nula) recebe o conflito.
    if v.id is not null then perform conflito_versao('documentos_por_area', v.id); end if;
    insert into documentos_por_area (escritorio_id, area, documentos, atualizado_por)
    values (p_escritorio, p_area, v_docs, p_pessoa)
    on conflict (escritorio_id, area) do nothing
    returning * into r;
    if r.id is null then
      perform conflito_versao('documentos_por_area', (select id from documentos_por_area where escritorio_id = p_escritorio and area = p_area));
    end if;
    v_de := documento_area_sugestao(p_area);
  else
    if v.id is null then raise exception 'Lista da área não encontrada' using errcode = 'TC404'; end if;
    if v.versao <> p_versao then perform conflito_versao('documentos_por_area', v.id); end if;
    update documentos_por_area set documentos = v_docs, atualizado_por = p_pessoa, atualizado_em = app_now()
     where id = v.id returning * into r;
    v_de := v.documentos;
  end if;
  perform registrar_historico('documento.area_salva', 'documentos_por_area', r.id::text,
    jsonb_build_object('area', p_area, 'de', to_jsonb(v_de), 'para', to_jsonb(v_docs)));
  return documento_area_linha(p_escritorio, p_area);
end $$;

-- ---------------------------------------------------------------------------------------
-- 5. Gerar documentos: a sugestão da área (embrulho de portal_documento_dados).

create function documento_sugestao_area(p_escritorio uuid, p_contrato uuid, p_ultima timestamptz) returns jsonb
language plpgsql stable
set search_path = public
as $$
declare
  c contratos;
  v_caso_area text;
  v_caso_nome text;
begin
  select * into c from contratos where id = p_contrato and escritorio_id = p_escritorio;
  if c.id is null then return null; end if;
  -- O caso mais antigo ligado ao contrato (revisão, ajuste 7: com áreas diferentes, a pessoa troca).
  select s.area, s.nome into v_caso_area, v_caso_nome
    from casos s
   where s.escritorio_id = p_escritorio and exists (select 1 from caso_clientes cc where cc.caso_id = s.id and cc.contrato_id = c.id)
   order by s.criado_em, s.id limit 1;
  return jsonb_build_object(
    'area', coalesce(v_caso_area, c.area, 'OUTRA'),
    'origem', case when v_caso_area is not null then 'CASO' when c.area is not null then 'CONTRATO' end,
    'casoNome', v_caso_nome,
    'contratoArea', c.area,
    'areasDosCasos', coalesce((select jsonb_agg(distinct s.area) from casos s
                                where s.escritorio_id = p_escritorio and exists (select 1 from caso_clientes cc where cc.caso_id = s.id and cc.contrato_id = c.id)), '[]'::jsonb),
    'porArea', (select jsonb_object_agg(a, to_jsonb(documento_area_lista(p_escritorio, a))) from unnest(documento_areas()) a),
    'salvas', coalesce((select jsonb_agg(r.area order by r.area) from documentos_por_area r where r.escritorio_id = p_escritorio), '[]'::jsonb),
    -- Pergunta 5: só o que entrou numa lista salva depois da última geração deste contrato.
    'entraramDepois', case when p_ultima is null then '{}'::jsonb else coalesce((
      select jsonb_object_agg(y.area, y.itens) from (
        select x.area, jsonb_agg(jsonb_build_object('chave', x.chave, 'em', x.em) order by x.em, x.chave) itens
          from (select h.dados ->> 'area' area, k chave, max(h.ocorrido_em) em
                  from historico h, jsonb_array_elements_text(coalesce(h.dados -> 'para', '[]'::jsonb)) k
                 where h.escritorio_id = p_escritorio and h.entidade = 'documentos_por_area' and h.acao = 'documento.area_salva'
                   and h.ocorrido_em > p_ultima and not coalesce(h.dados -> 'de', '[]'::jsonb) ? k
                 group by 1, 2) x
         group by x.area) y), '{}'::jsonb) end,
    'gravaNoContrato', c.estado = 'ELABORACAO' and c.area is null
                       and not exists (select 1 from caso_clientes cc where cc.contrato_id = c.id));
end $$;

alter function portal_documento_dados(uuid, uuid, uuid) rename to portal_documento_dados_sem_area;

create function portal_documento_dados(p_pessoa uuid, p_escritorio uuid, p_contrato uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare d jsonb := portal_documento_dados_sem_area(p_pessoa, p_escritorio, p_contrato);
begin
  return d || jsonb_build_object('sugestao',
    documento_sugestao_area(p_escritorio, (d -> 'contrato' ->> 'id')::uuid, (d -> 'ultima' ->> 'em')::timestamptz));
end $$;

-- ---------------------------------------------------------------------------------------
-- 6. Gerar: a área escolhida vai ao contrato só em elaboração, sem área e sem caso (embrulho de
-- portal_documento_gravar). A original recebe o pedido sem a área.

alter function portal_documento_gravar(uuid, uuid, uuid, jsonb, jsonb) rename to portal_documento_gravar_sem_area;

create function portal_documento_gravar(p_pessoa uuid, p_escritorio uuid, p_contrato uuid, p_pedido jsonb, p_resultado jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_area text;
  r jsonb;
  c contratos;
  v_gravada text;
begin
  perform documento_entrar(p_pessoa, p_escritorio, true);
  -- Não confia só no zod: a área que não existe é recusada antes de gerar.
  if jsonb_typeof(p_pedido -> 'area') is not null and jsonb_typeof(p_pedido -> 'area') <> 'null' then
    v_area := case when jsonb_typeof(p_pedido -> 'area') = 'string' then p_pedido ->> 'area' end;
    if not coalesce(area_direito_valida(v_area), false) then perform recusar_campos('Confira a área', 'area'); end if;
  end if;
  r := portal_documento_gravar_sem_area(p_pessoa, p_escritorio, p_contrato, p_pedido - 'area', p_resultado);
  -- "Outra ou sem área" nunca grava (pergunta 2). O contrato já está travado pela original.
  if v_area is not null and v_area <> 'OUTRA' then
    select * into c from contratos where id = p_contrato and escritorio_id = p_escritorio for update;
    if c.estado = 'ELABORACAO' and c.area is null and not exists (select 1 from caso_clientes cc where cc.contrato_id = c.id) then
      perform contrato_gravar_area(p_escritorio, c.id, jsonb_build_object('area', v_area));
      perform registrar_historico('contrato.area_definida', 'contratos', c.id::text,
        jsonb_build_object('area', v_area, 'origem', 'GERAR_DOCUMENTOS'));
      v_gravada := v_area;
    end if;
  end if;
  return r || jsonb_build_object('areaGravada', v_gravada);
end $$;

call fechar_acesso();
