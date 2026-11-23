-- Jornada do cliente, parte 2 (F3.127, F3.129; EX-16, CH-13), pelo desenho aprovado em
-- docs/design/aprovadas/portal-jornada-fechamento (grupos 4 e 6, decisões 14 a 20 e 27 a 29):
-- 1. O próximo passo do cliente (cliente_passo, 0740) ganha, depois do caso em andamento:
--    - FECHAMENTO: caso encerrado com algo do acerto em aberto. O item traz os passos que se
--      aplicam (conferir o êxito, repassar ao cliente, encerrar no financeiro, encerrar o
--      contrato), cada um com feito, a data, quem fez e, só para quem tem Financeiro, o valor;
--    - CONTRATO_ATIVO: contrato ativo marcado "não tem caso" (consultoria, mensalidade);
--    - ATENDIDO: teve caso ou contrato e está tudo encerrado.
--    SEM_PROPOSTA fica só para quem nunca teve nada. A situação do cliente não muda (decisão 19).
-- 2. Encerrar no financeiro só entra nos passos quando o caso teve levantamento (RPV, alvará,
--    precatório ou acordo): é onde o fechamento existe hoje. O caso sem levantamento espera a
--    folha "Fechamento do caso" na ficha do contrato (F3.132, pendente).
-- 3. A ficha do contrato diz quem marcou "não tem caso" e quando (decisão 28).

-- ---------------------------------------------------------------------------------------
-- Os passos do fechamento de um caso encerrado, para um cliente dele.
create function cliente_fechamento(p_escritorio uuid, p_cliente uuid, p_caso uuid, p_valores boolean) returns jsonb
language plpgsql stable
set search_path = public
as $$
declare
  ca casos;
  v_passos jsonb := '[]'::jsonb;
  v_lev levantamentos;
  v_acerto jsonb;
  v_x exitos_conferir;
  v_rep record;
  v_cts jsonb;
  v_ct_em timestamptz;
  v_fech fechamentos_caso;
begin
  select * into ca from casos where id = p_caso and escritorio_id = p_escritorio;
  -- 1. Conferir o êxito: só quando o caso gerou êxito para este cliente.
  select * into v_x from exitos_conferir where caso_id = p_caso and cliente_id = p_cliente and escritorio_id = p_escritorio;
  if v_x.id is not null then
    v_passos := v_passos || jsonb_build_array(jsonb_build_object('tipo', 'EXITO', 'area', 'FINANCEIRO',
      'feito', v_x.situacao <> 'PARA_CONFERIR', 'em', v_x.conferido_em, 'por', pessoa_ref(v_x.conferido_por),
      'naoCobrado', v_x.situacao = 'NAO_COBRADO',
      'valor', case when p_valores then coalesce(v_x.valor_lancado, v_x.calculado) end,
      'percentual', case when p_valores then v_x.percentual end));
  end if;
  -- 2. Repassar ao cliente: só quando entrou dinheiro do cliente pelo escritório.
  select * into v_lev from levantamentos where caso_id = p_caso and escritorio_id = p_escritorio
   order by (cliente_id = p_cliente) desc, entrou_em desc, criado_em desc limit 1;
  select count(*) total,
         count(*) filter (where d.feito_em is null and d.dispensado_em is null) abertos,
         coalesce(sum(d.valor) filter (where d.feito_em is null and d.dispensado_em is null), 0) falta,
         min(d.prazo) filter (where d.feito_em is null and d.dispensado_em is null) prazo,
         max(d.feito_em) feito_em
    into v_rep
    from destinacoes d join levantamentos l on l.id = d.levantamento_id
   where l.caso_id = p_caso and l.cliente_id = p_cliente and l.escritorio_id = p_escritorio and d.para = 'CLIENTE';
  if v_rep.total > 0 then
    v_passos := v_passos || jsonb_build_array(jsonb_build_object('tipo', 'REPASSE', 'area', 'FINANCEIRO',
      'feito', v_rep.abertos = 0, 'em', v_rep.feito_em, 'prazo', v_rep.prazo,
      'valor', case when p_valores then v_rep.falta end,
      'levantamentoId', case when p_valores then v_lev.id end,
      'entrou', case when p_valores then jsonb_build_object('tipo', v_lev.tipo, 'valor', v_lev.valor, 'em', v_lev.entrou_em) end));
  end if;
  -- 3. Encerrar no financeiro: o fechamento existe para o caso com levantamento.
  if v_lev.id is not null then
    select * into v_fech from fechamentos_caso where caso_id = p_caso;
    v_acerto := case when p_valores and v_fech.id is null then caso_acerto(p_escritorio, p_caso) end;
    v_passos := v_passos || jsonb_build_array(jsonb_build_object('tipo', 'FINANCEIRO', 'area', 'FINANCEIRO',
      'feito', v_fech.id is not null, 'em', v_fech.fechado_em, 'por', pessoa_ref(v_fech.fechado_por),
      'valor', case when p_valores then (v_acerto ->> 'falta')::bigint end,
      'pendentes', case when p_valores then (select jsonb_agg(distinct j ->> 'nome') from jsonb_array_elements(v_acerto -> 'pendencias') j) end,
      'levantamentoId', case when p_valores then v_lev.id end));
  end if;
  -- 4. Encerrar o contrato do cliente neste caso.
  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'numero', c.numero) order by c.numero) filter (where c.estado = 'ATIVO'), '[]'::jsonb),
         max(c.encerrado_em)
    into v_cts, v_ct_em
    from caso_clientes cc join contratos c on c.id = cc.contrato_id
   where cc.caso_id = p_caso and cc.cliente_id = p_cliente and cc.escritorio_id = p_escritorio;
  if exists (select 1 from caso_clientes cc where cc.caso_id = p_caso and cc.cliente_id = p_cliente and cc.contrato_id is not null) then
    v_passos := v_passos || jsonb_build_array(jsonb_build_object('tipo', 'CONTRATO', 'area', 'CONTRATOS',
      'feito', jsonb_array_length(v_cts) = 0, 'em', v_ct_em, 'contratos', v_cts,
      'comFinanceiro', v_fech.id is not null and v_ct_em is not null and v_ct_em - v_fech.fechado_em between interval '0' and interval '1 minute'));
  end if;
  return jsonb_build_object(
    'caso', jsonb_build_object('id', ca.id, 'nome', ca.nome, 'resultado', ca.resultado, 'encerradoEm', ca.encerrado_em),
    'passos', v_passos,
    'pendente', exists (select 1 from jsonb_array_elements(v_passos) j where not (j ->> 'feito')::boolean),
    'fim', (select max(x) from unnest(array[ca.encerrado_em, v_fech.fechado_em, v_ct_em, v_x.conferido_em, v_rep.feito_em::timestamptz]) x));
end $$;

-- ---------------------------------------------------------------------------------------
-- O próximo passo, com os tipos novos.
create or replace function cliente_passo(p_pessoa uuid, p_escritorio uuid, p_cliente uuid) returns jsonb
language plpgsql stable
set search_path = public
as $$
declare
  v_areas text[] := areas_da_pessoa(p_pessoa, p_escritorio);
  v_fin boolean := 'FINANCEIRO' = any (v_areas);
  v_jur boolean := 'JURIDICO' = any (v_areas);
  p propostas;
  ct contratos;
  ca casos;
  v_tipo text;
  v_area text;
  v_item jsonb;
  v_fecha jsonb;
  v_ultimo jsonb;
  v_prox recebimentos_previstos;
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
      v_item := jsonb_build_object('id', ct.id, 'numero', ct.numero, 'objeto', ct.objeto, 'versao', ct.versao, 'criadoEm', ct.criado_em,
        -- Decisão 13: o âmbar já avisa que o contrato entra no caso que existe.
        'juntarA', case when v_jur then (select x -> 0 -> 'nome' from casos_do_cliente_sem_contrato(p_escritorio, p_cliente) x where jsonb_array_length(x) = 1) end);
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
  -- EX-16: o caso encerrado com algo do acerto em aberto, o mais recente primeiro.
  if v_tipo is null then
    for ca in select c.* from casos c join caso_clientes cc on cc.caso_id = c.id
               where c.escritorio_id = p_escritorio and cc.cliente_id = p_cliente and c.situacao = 'ENCERRADO'
                 and c.encerrado_por is distinct from 'IMPORTACAO_DESFEITA'
               order by c.encerrado_em desc loop
      v_fecha := cliente_fechamento(p_escritorio, p_cliente, ca.id, v_fin);
      v_ultimo := coalesce(v_ultimo, v_fecha);
      if (v_fecha ->> 'pendente')::boolean then
        v_tipo := 'FECHAMENTO';
        -- A área é a do primeiro passo que falta.
        v_area := (select j ->> 'area' from jsonb_array_elements(v_fecha -> 'passos') with ordinality t(j, n)
                    where not (j ->> 'feito')::boolean order by n limit 1);
        v_item := v_fecha;
        exit;
      end if;
    end loop;
  end if;
  -- CH-13: o contrato ativo marcado "não tem caso".
  if v_tipo is null then
    select * into ct from contratos c
     where c.escritorio_id = p_escritorio and c.cliente_id = p_cliente and c.estado = 'ATIVO' and c.sem_caso
     order by c.assinado_em desc, c.criado_em desc limit 1;
    if ct.id is not null then
      v_tipo := 'CONTRATO_ATIVO';
      v_area := 'CONTRATOS';
      select * into v_prox from recebimentos_previstos r
       where r.contrato_id = ct.id and r.cancelado_em is null and (r.valor is null or parcela_recebido(r.id) < r.valor)
       order by r.vencimento limit 1;
      v_item := jsonb_build_object('id', ct.id, 'numero', ct.numero, 'objeto', ct.objeto, 'assinadoEm', ct.assinado_em,
        'proximo', case when v_prox.id is not null then jsonb_build_object('vencimento', v_prox.vencimento, 'descricao', v_prox.descricao,
                                                                         'valor', v_prox.valor) end);
    end if;
  end if;
  -- Teve caso ou contrato e está tudo encerrado.
  if v_tipo is null and (v_ultimo is not null or exists (select 1 from contratos c where c.escritorio_id = p_escritorio and c.cliente_id = p_cliente
                                                         and c.estado = 'ENCERRADO')) then
    v_tipo := 'ATENDIDO';
    v_area := 'COMERCIAL';
    v_item := coalesce(v_ultimo, jsonb_build_object('caso', null, 'passos', '[]'::jsonb, 'pendente', false,
      'fim', (select max(c.encerrado_em) from contratos c where c.escritorio_id = p_escritorio and c.cliente_id = p_cliente)));
  end if;
  if v_tipo is null then
    v_tipo := 'SEM_PROPOSTA';
    v_area := 'COMERCIAL';
  end if;
  -- O caso do fechamento só aparece para quem tem Jurídico (PT-02); os passos sem valores vêm
  -- para todos, para dizer em que pé está e quem faz (decisão 16).
  if v_tipo in ('FECHAMENTO', 'ATENDIDO') and not v_jur and v_item -> 'caso' <> 'null'::jsonb then
    v_item := jsonb_set(v_item, '{caso}', jsonb_build_object('id', null, 'nome', null, 'resultado', v_item -> 'caso' -> 'resultado',
                                                             'encerradoEm', v_item -> 'caso' -> 'encerradoEm'));
  end if;
  return jsonb_build_object(
    'tipo', v_tipo,
    'area', v_area,
    'pode', v_area = any (v_areas),
    'quemPode', case when not (v_area = any (v_areas)) then quem_tem_area(p_escritorio, v_area) end,
    -- No fechamento, "Quem faz" aparece também para quem pode (decisão 15).
    'quemFaz', case when v_tipo = 'FECHAMENTO' then quem_tem_area(p_escritorio, v_area) end,
    'item', case when v_area = any (v_areas) or v_tipo in ('FECHAMENTO', 'ATENDIDO') then v_item end,
    -- Quem não tem a área do item ainda vê, sem número, que o caso existe (decisão 19).
    'casoResponsavel', case when v_tipo = 'CASO' and not v_jur then v_item -> 'responsavel' end);
end $$;

-- ---------------------------------------------------------------------------------------
-- A ficha do contrato: quem marcou "não tem caso" e quando (decisão 28), e se a pessoa abre o caso.
alter function portal_contrato(uuid, uuid, uuid) rename to portal_contrato_sem_jornada;

create function portal_contrato(p_pessoa uuid, p_escritorio uuid, p_contrato uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r jsonb := portal_contrato_sem_jornada(p_pessoa, p_escritorio, p_contrato);
begin
  return r || (select jsonb_build_object(
                 'semCasoMarcado', case when c.sem_caso then (
                    select jsonb_build_object('em', h.ocorrido_em, 'por', pessoa_ref(h.autor_id)) from historico h
                     where h.escritorio_id = p_escritorio and h.entidade = 'contratos' and h.entidade_id = c.id::text and h.acao = 'contrato.sem_caso'
                     order by h.ocorrido_em desc, h.id desc limit 1) end,
                 'podeAbrirCaso', 'JURIDICO' = any (areas_da_pessoa(p_pessoa, p_escritorio)) and pode(p_pessoa, p_escritorio, 'juridico.editar'))
                 from contratos c where c.id = p_contrato and c.escritorio_id = p_escritorio);
end $$;

call fechar_acesso();
