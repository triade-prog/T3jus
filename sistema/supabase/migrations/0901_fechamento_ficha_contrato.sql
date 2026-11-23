-- Fechamento no financeiro do caso sem levantamento, parte 2 (F3.132; EX-16, EX-17, FI-08): a
-- leitura nova da ficha do contrato em Financeiro › A receber, pelo desenho aprovado em
-- docs/design/aprovadas/portal-fechamento-sem-levantamento (decisões 1 a 4):
-- - um item por caso encerrado ligado ao contrato (sem o encerrado por importação desfeita), os
--   ainda sem fechamento primeiro;
-- - no caso sem levantamento, o acerto completo (o mesmo da ficha do repasse) e "De onde veio";
--   o acerto completo vai só nos casos sem fechamento e no fechado mais recente (sugestão 2), os
--   outros fechados vêm só com o resumo;
-- - no caso com levantamento, só para ler: o fechamento fica na ficha do repasse (estado 14).
-- O caso em andamento não entra. A rota chama esta função junto com as outras duas; sem ela no
-- banco, a ficha sai sem a folha.

-- ---------------------------------------------------------------------------------------
-- "De onde veio" (decisão 1): o que aconteceu no caso, nos contratos dele e nas parcelas deste
-- contrato. Uma consulta por entidade, pelo índice historico_entidade_idx; sem evento interno.
create function contrato_fechamento_origem(p_escritorio uuid, p_contrato uuid, p_caso uuid) returns jsonb
language sql stable
set search_path = public
as $$
  with ev as (
    (select h.* from historico h
      where h.entidade = 'casos' and h.entidade_id = p_caso::text and h.escritorio_id = p_escritorio and not h.interno
        and (h.acao in ('financeiro.exito_lancado', 'financeiro.exito_nao_cobrado', 'financeiro.caso_encerrado')
             or (h.acao = 'juridico.etapa' and h.dados ? 'resultado' and h.dados ->> 'resultado' is not null))
      order by h.ocorrido_em desc, h.id desc limit 20)
    union all
    (select h.* from historico h
      where h.entidade = 'contratos' and h.escritorio_id = p_escritorio and not h.interno
        and h.entidade_id = any (select cc.contrato_id::text from caso_clientes cc where cc.caso_id = p_caso and cc.contrato_id is not null)
        and h.acao in ('contrato.encerrado', 'contrato.encerrado_com_caso')
      order by h.ocorrido_em desc, h.id desc limit 20)
    union all
    (select h.* from historico h
      where h.entidade = 'recebimentos_previstos' and h.escritorio_id = p_escritorio and not h.interno
        and h.entidade_id = any (select r.id::text from recebimentos_previstos r where r.escritorio_id = p_escritorio and r.contrato_id = p_contrato)
        and h.acao = 'financeiro.recebimento'
      order by h.ocorrido_em desc, h.id desc limit 20)
  ), ultimos as (
    select * from ev order by ocorrido_em desc, id desc limit 20
  )
  select coalesce(jsonb_agg(jsonb_build_object('acao', u.acao, 'em', u.ocorrido_em, 'por', pessoa_ref(u.autor_id),
           -- Só o que a tela escreve; o histórico já recusa dado pessoal.
           'dados', jsonb_strip_nulls(jsonb_build_object(
             'resultado', u.dados ->> 'resultado',
             'valor', u.dados -> 'valor',
             'vencimento', u.dados ->> 'vencimento',
             'forma', u.dados ->> 'forma',
             'motivo', case when u.acao = 'contrato.encerrado' then (select c.motivo_encerramento from contratos c where c.id::text = u.entidade_id)
                            else u.dados ->> 'motivo' end,
             'explicacao', u.dados ->> 'explicacao',
             'cliente', (select k.nome from clientes_escritorio k where k.escritorio_id = p_escritorio and k.id::text = u.dados ->> 'cliente'),
             'parcela', case when u.entidade = 'recebimentos_previstos' then (select r.descricao from recebimentos_previstos r where r.id::text = u.entidade_id) end,
             'contrato', case when u.entidade = 'contratos' then (select c.numero from contratos c where c.id::text = u.entidade_id) end,
             'cliente_contrato', case when u.entidade = 'contratos' then (select k.nome from contratos c join clientes_escritorio k on k.id = c.cliente_id
                                                                         where c.id::text = u.entidade_id) end,
             'deste', case when u.entidade = 'contratos' then u.entidade_id = p_contrato::text end)))
           order by u.ocorrido_em desc, u.id desc), '[]'::jsonb)
    from ultimos u
$$;

-- ---------------------------------------------------------------------------------------
-- Os fechamentos da ficha do contrato.
create function portal_financeiro_contrato_fechamentos(p_pessoa uuid, p_escritorio uuid, p_contrato uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c contratos;
  x record;
  v_lev levantamentos;
  v_res jsonb := '[]'::jsonb;
  v_um_fechado boolean := false;
  v_caso jsonb;
  v_fechado jsonb;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.ver');
  select * into c from contratos where id = p_contrato and escritorio_id = p_escritorio;
  if c.id is null or c.estado = 'ELABORACAO' then raise exception 'Contrato não encontrado' using errcode = 'TC404'; end if;
  for x in select ca.*, f.id fechamento_id, f.fechado_em, f.fechado_por
             from casos ca left join fechamentos_caso f on f.caso_id = ca.id
            where ca.escritorio_id = p_escritorio and ca.situacao = 'ENCERRADO' and ca.encerrado_por is distinct from 'IMPORTACAO_DESFEITA'
              and exists (select 1 from caso_clientes cc where cc.caso_id = ca.id and cc.contrato_id = p_contrato)
            order by (f.id is null) desc, ca.encerrado_em desc, ca.id loop
    v_caso := jsonb_build_object('nome', x.nome, 'resultado', x.resultado, 'encerradoEm', x.encerrado_em);
    v_fechado := case when x.fechamento_id is not null then jsonb_build_object('em', x.fechado_em, 'por', pessoa_ref(x.fechado_por)) end;
    select * into v_lev from levantamentos l where l.caso_id = x.id and l.escritorio_id = p_escritorio
     order by l.entrou_em desc, l.criado_em desc limit 1;
    if v_lev.id is not null then
      -- Decisão 3, estado 14: o fechamento deste caso fica na ficha do repasse.
      v_res := v_res || jsonb_build_array(jsonb_build_object('casoId', x.id, 'comLevantamento', true, 'levantamentoId', v_lev.id,
        'caso', v_caso, 'fechado', v_fechado, 'falta', (caso_acerto(p_escritorio, x.id) ->> 'falta')::bigint,
        'origem', contrato_fechamento_origem(p_escritorio, p_contrato, x.id)));
    elsif x.fechamento_id is null or not v_um_fechado then
      v_res := v_res || jsonb_build_array(jsonb_build_object('casoId', x.id, 'comLevantamento', false,
        'acerto', portal_financeiro_caso_acerto(p_pessoa, p_escritorio, x.id),
        'origem', contrato_fechamento_origem(p_escritorio, p_contrato, x.id)));
      v_um_fechado := v_um_fechado or x.fechamento_id is not null;
    else
      -- Sugestão 2: o fechado mais antigo vem só com o resumo.
      v_res := v_res || jsonb_build_array(jsonb_build_object('casoId', x.id, 'comLevantamento', false, 'resumo', true,
        'caso', v_caso, 'fechado', v_fechado));
    end if;
  end loop;
  return v_res;
end $$;

call fechar_acesso();
