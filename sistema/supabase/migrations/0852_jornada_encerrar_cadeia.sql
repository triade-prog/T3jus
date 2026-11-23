-- Jornada do cliente, parte 3 (F3.128; EX-17), pelo desenho aprovado em
-- docs/design/aprovadas/portal-jornada-fechamento (grupo 5, decisões 21 a 26):
-- 1. O acerto do caso traz os contratos ligados que podem ser encerrados junto: ativos, ligados
--    ao caso e sem outro caso em andamento (EX-01). Diz também se a pessoa encerra contratos.
-- 2. Encerrar o caso no financeiro aceita a lista desses contratos, com a versão lida. Numa
--    transação só: grava o fechamento e encerra cada contrato com o motivo fixo, pela mesma regra
--    de "Encerrar contrato" (contratos.editar). Se algo falha, nada é encerrado.
-- 3. A ficha do caso no Jurídico traz o resumo do acerto ("Encerrado · acerto pendente" e o quadro
--    "Acerto no Financeiro"); os valores e o link para a ficha do repasse só para quem tem Financeiro.

-- ---------------------------------------------------------------------------------------
-- Os contratos que se encerram junto com o caso.
create function caso_contratos_encerraveis(p_escritorio uuid, p_caso uuid) returns jsonb
language sql stable
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'numero', c.numero, 'objeto', c.objeto, 'versao', c.versao,
           'cliente', jsonb_build_object('id', k.id, 'nome', k.nome)) order by c.numero), '[]'::jsonb)
    from contratos c join clientes_escritorio k on k.id = c.cliente_id
   where c.escritorio_id = p_escritorio and c.estado = 'ATIVO'
     and exists (select 1 from caso_clientes cc where cc.caso_id = p_caso and cc.contrato_id = c.id)
     and not exists (select 1 from caso_clientes cc join casos o on o.id = cc.caso_id
                      where cc.contrato_id = c.id and o.id <> p_caso and o.situacao = 'ANDAMENTO')
$$;

create or replace function portal_financeiro_caso_acerto(p_pessoa uuid, p_escritorio uuid, p_caso uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.ver');
  if not exists (select 1 from casos where id = p_caso and escritorio_id = p_escritorio) then
    raise exception 'Caso não encontrado' using errcode = 'TC404';
  end if;
  return caso_acerto(p_escritorio, p_caso) || jsonb_build_object(
    'contratosLigados', caso_contratos_encerraveis(p_escritorio, p_caso),
    'podeEncerrarContratos', 'CONTRATOS' = any (areas_da_pessoa(p_pessoa, p_escritorio)) and pode(p_pessoa, p_escritorio, 'contratos.editar'),
    'motivoContratos', (select 'Caso ' || ca.nome || ' encerrado no financeiro em ' || to_char(hoje_brasilia(), 'DD/MM/YYYY') || '.'
                          from casos ca where ca.id = p_caso));
end $$;

-- ---------------------------------------------------------------------------------------
-- Encerrar em cadeia (decisões 24 e 25).
create function portal_financeiro_caso_encerrar(p_pessoa uuid, p_escritorio uuid, p_caso uuid, p_contratos jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok jsonb;
  v_motivo text;
  x record;
  v_n integer := 0;
  r jsonb;
begin
  if jsonb_typeof(coalesce(p_contratos, '[]'::jsonb)) <> 'array' then perform recusar_campos('Confira os contratos', 'contratos'); end if;
  r := portal_financeiro_caso_encerrar(p_pessoa, p_escritorio, p_caso);
  if jsonb_array_length(coalesce(p_contratos, '[]'::jsonb)) = 0 then
    return r || jsonb_build_object('contratosEncerrados', '[]'::jsonb);
  end if;
  v_ok := caso_contratos_encerraveis(p_escritorio, p_caso);
  select 'Caso ' || ca.nome || ' encerrado no financeiro em ' || to_char(hoje_brasilia(), 'DD/MM/YYYY') || '.' into v_motivo
    from casos ca where ca.id = p_caso;
  for x in select (j ->> 'id')::uuid id, (j ->> 'versao')::integer versao from jsonb_array_elements(p_contratos) j loop
    if not exists (select 1 from jsonb_array_elements(v_ok) o where (o ->> 'id')::uuid = x.id) then
      perform recusar_motivo('Este contrato não se encerra junto com o caso', 'CONTRATO_FORA_DO_CASO');
    end if;
    -- A mesma regra de "Encerrar contrato": a área Contratos, contratos.editar e a versão lida.
    perform portal_contrato_encerrar(p_pessoa, p_escritorio, x.id, x.versao, v_motivo);
    perform registrar_historico('contrato.encerrado_com_caso', 'contratos', x.id::text, jsonb_build_object('caso', p_caso));
    v_n := v_n + 1;
  end loop;
  return r || jsonb_build_object('contratosEncerrados',
    (select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'numero', c.numero)), '[]'::jsonb)
       from contratos c where c.id in (select (j ->> 'id')::uuid from jsonb_array_elements(p_contratos) j)));
end $$;

-- ---------------------------------------------------------------------------------------
-- A ficha do caso (Jurídico): o resumo do acerto (decisões 21 e 22).
create function caso_resumo_acerto(p_pessoa uuid, p_escritorio uuid, p_caso uuid) returns jsonb
language plpgsql stable
set search_path = public
as $$
declare
  ca casos;
  v_fin boolean := 'FINANCEIRO' = any (areas_da_pessoa(p_pessoa, p_escritorio));
  v_a jsonb;
  v_lev levantamentos;
  v_fech fechamentos_caso;
begin
  select * into ca from casos where id = p_caso and escritorio_id = p_escritorio;
  if ca.situacao <> 'ENCERRADO' or ca.encerrado_por is not distinct from 'IMPORTACAO_DESFEITA' then return null; end if;
  select * into v_lev from levantamentos where caso_id = p_caso order by entrou_em desc, criado_em desc limit 1;
  select * into v_fech from fechamentos_caso where caso_id = p_caso;
  v_a := caso_acerto(p_escritorio, p_caso);
  return jsonb_build_object(
    'pendente', (v_lev.id is not null and v_fech.id is null)
                or exists (select 1 from exitos_conferir x where x.caso_id = p_caso and x.situacao = 'PARA_CONFERIR'),
    'fechado', case when v_fech.id is not null then jsonb_build_object('em', v_fech.fechado_em, 'por', pessoa_ref(v_fech.fechado_por)) end,
    'comValores', v_fin,
    'levantamentoId', case when v_fin then v_lev.id end,
    'entrou', case when v_lev.id is not null then jsonb_build_object('tipo', v_lev.tipo, 'em', v_lev.entrou_em, 'valor', case when v_fin then v_lev.valor end) end,
    'exitos', coalesce((select jsonb_agg(jsonb_build_object('cliente', k.nome, 'feito', x.situacao <> 'PARA_CONFERIR', 'naoCobrado', x.situacao = 'NAO_COBRADO',
                 'em', x.conferido_em, 'por', pessoa_ref(x.conferido_por), 'valor', case when v_fin then coalesce(x.valor_lancado, x.calculado) end) order by k.nome)
               from exitos_conferir x join clientes_escritorio k on k.id = x.cliente_id where x.caso_id = p_caso), '[]'::jsonb),
    'repasses', coalesce((select jsonb_agg(jsonb_build_object('cliente', k.nome, 'feito', d.feito_em is not null or d.dispensado_em is not null,
                 'em', d.feito_em, 'prazo', d.prazo, 'valor', case when v_fin then d.valor end) order by k.nome)
               from destinacoes d join levantamentos l on l.id = d.levantamento_id join clientes_escritorio k on k.id = l.cliente_id
              where l.caso_id = p_caso and d.para = 'CLIENTE'), '[]'::jsonb),
    -- O que ainda segura o fechamento, fora o êxito e o repasse ao cliente (que têm linha própria):
    -- com Financeiro, um a um; sem, só se falta algum.
    'outros', case when v_fin then coalesce((select jsonb_agg(jsonb_build_object('nome', j ->> 'nome', 'valor', (j ->> 'valor')::bigint,
                       'prazo', coalesce(j ->> 'prazo', j ->> 'vencimento')))
                     from jsonb_array_elements(v_a -> 'pendencias') j
                    where j ->> 'tipo' <> 'EXITO' and not (j ->> 'tipo' = 'REPASSE' and j ->> 'para' = 'CLIENTE')), '[]'::jsonb) end,
    'faltaOutros', exists (select 1 from jsonb_array_elements(v_a -> 'pendencias') j
                            where j ->> 'tipo' <> 'EXITO' and not (j ->> 'tipo' = 'REPASSE' and j ->> 'para' = 'CLIENTE')),
    'contratos', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'numero', c.numero, 'situacao', c.estado, 'cliente', k.nome,
                   'assinadoEm', c.assinado_em) order by c.numero)
               from contratos c join clientes_escritorio k on k.id = c.cliente_id
              where c.id in (select cc.contrato_id from caso_clientes cc where cc.caso_id = p_caso)), '[]'::jsonb),
    'quemCuida', case when not v_fin then quem_tem_area(p_escritorio, 'FINANCEIRO') end);
end $$;

alter function portal_juridico_caso(uuid, uuid, uuid) rename to juridico_caso_sem_acerto;

create function portal_juridico_caso(p_pessoa uuid, p_escritorio uuid, p_caso uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r jsonb := juridico_caso_sem_acerto(p_pessoa, p_escritorio, p_caso);
begin
  return r || jsonb_build_object('acerto', caso_resumo_acerto(p_pessoa, p_escritorio, p_caso));
end $$;

call fechar_acesso();
