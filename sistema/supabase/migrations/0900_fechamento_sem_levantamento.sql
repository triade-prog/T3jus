-- Fechamento no financeiro do caso sem levantamento (F3.132; EX-16, EX-17, FI-08), pelo desenho
-- aprovado pela Carol em 22/11/2026, às 23h28 (Bahia), em
-- docs/design/aprovadas/portal-fechamento-sem-levantamento, com as três respostas recomendadas:
--   1. a parcela que ainda vai vencer segura o fechamento (o caso fica "acerto pendente", com a
--      data, sem tom de atraso);
--   2. a baixa de parcela vencida com motivo é a FI-24 (F3.139), pendente: não entra aqui;
--   3. num contrato com outro caso em andamento, as parcelas desse contrato não seguram o
--      fechamento deste caso; o último caso a fechar leva o que faltar.
-- O que muda:
-- - caso_acerto_parcelas: as parcelas que pertencem ao acerto do caso (a regra da pergunta 3),
--   num lugar só, para a ficha do repasse e a do contrato;
-- - caso_acerto: as parcelas pela regra nova, as pendências com a parcela, quem paga e a parcela
--   que leva o reembolso, e "aVencer" (o "Pronto para encerrar depois de …");
-- - caso_acerto_quadro: o que o quadro da folha mostra (o caso, os êxitos, os contratos, os
--   reembolsos, quem encerra contratos), só pelas funções que já exigiram o Financeiro;
-- - cliente_fechamento: o passo "Encerrar no financeiro" também no caso sem levantamento com
--   contrato ligado ativo ou encerrado, com o contrato e o caso para o "Ver o acerto";
-- - caso_resumo_acerto: "Encerrado · acerto pendente" também nesse caso, com os textos novos.
-- Nenhuma tabela nova. As auxiliares são `language sql stable`, sem security definer (só se
-- chamam de dentro das funções de entrada, que conferem a área e a permissão).

-- ---------------------------------------------------------------------------------------
-- As parcelas do acerto do caso (pergunta 3).
create function caso_acerto_parcelas(p_escritorio uuid, p_caso uuid) returns setof recebimentos_previstos
language sql stable
set search_path = public
as $$
  with ct as (
    select c.id,
           exists (select 1 from caso_clientes o join casos oc on oc.id = o.caso_id
                    where o.contrato_id = c.id and oc.id <> p_caso and oc.situacao = 'ANDAMENTO') segue
      from contratos c
     where c.escritorio_id = p_escritorio and c.estado in ('ATIVO', 'ENCERRADO')
       and c.id in (select cc.contrato_id from caso_clientes cc
                     where cc.caso_id = p_caso and cc.escritorio_id = p_escritorio and cc.contrato_id is not null)
  )
  select r.*
    from ct join recebimentos_previstos r on r.escritorio_id = p_escritorio and r.contrato_id = ct.id
   where r.cancelado_em is null
     and case
           -- Decisão (a), a confirmar com a Carol: o êxito fica sempre com o caso que o gerou. O
           -- êxito deste caso segura o fechamento mesmo com o contrato seguindo em outro caso, e o
           -- êxito de outro caso nunca segura este. Se ela disser não, sai este "when" (e os testes
           -- 34 e 36 do pgTAP 126).
           when r.exito_id is not null then exists (select 1 from exitos_conferir x where x.id = r.exito_id and x.caso_id = p_caso)
           -- Pergunta 3: o contrato com outro caso em andamento fica com ele.
           else not ct.segue
         end
$$;

-- ---------------------------------------------------------------------------------------
-- O acerto do caso, com as parcelas pela regra nova e as pendências com o que a janela usa.
create or replace function caso_acerto(p_escritorio uuid, p_caso uuid) returns jsonb
language sql stable
set search_path = public
as $$
  with ps as (
    select r.*, parcela_recebido(r.id) rec, k.nome cliente, k.id cliente_ref
      from caso_acerto_parcelas(p_escritorio, p_caso) r
      join contratos c on c.id = r.contrato_id
      join clientes_escritorio k on k.id = c.cliente_id
  ), dest as (
    select d.*, l.tipo, l.entrou_em from destinacoes d join levantamentos l on l.id = d.levantamento_id
     where l.caso_id = p_caso and l.escritorio_id = p_escritorio
  ), contas as (
    select cp.*, conta_parcela_reembolso(cp) parcela, k.nome cliente
      from contas_pagar cp left join clientes_escritorio k on k.id = cp.cliente_id
     where cp.escritorio_id = p_escritorio and cp.caso_id = p_caso and cp.reembolsado_em is null and cp.cancelada_em is null
       -- o que já está numa divisão de alvará pende lá, como repasse
       and not exists (select 1 from destinacoes d where d.conta_id = cp.id and d.dispensado_em is null)
  ), pend as (
    -- quando: a data de "Pronto para encerrar depois de …"; acao: pede algo agora (nada de espera).
    select 1 ordem, d.prazo dia, null::date quando, true acao, null::jsonb espera,
           jsonb_build_object('tipo', 'REPASSE', 'para', d.para, 'nome', d.nome, 'valor', d.valor, 'prazo', d.prazo,
                              'levantamentoId', d.levantamento_id) j
      from dest d where d.feito_em is null and d.dispensado_em is null
    union all
    select 2, x.previsto_em, null, true, null,
           jsonb_build_object('tipo', 'EXITO', 'nome', k.nome || ' · êxito para conferir', 'valor', x.calculado,
                              'vencimento', x.previsto_em, 'exitoId', x.id, 'contratoId', x.contrato_id, 'cliente', k.nome)
      from exitos_conferir x join clientes_escritorio k on k.id = x.cliente_id
     where x.caso_id = p_caso and x.escritorio_id = p_escritorio and x.situacao = 'PARA_CONFERIR'
    union all
    select 3, p.vencimento, p.vencimento, p.vencimento < hoje_brasilia(),
           jsonb_build_object('vencimento', p.vencimento, 'descricao', p.descricao, 'cliente', p.cliente, 'exito', p.origem = 'ENCERRAMENTO'),
           jsonb_build_object('tipo', 'PARCELA', 'nome', p.cliente || ' · ' || p.descricao, 'valor', p.valor - p.rec,
                              'vencimento', p.vencimento, 'contratoId', p.contrato_id, 'parcelaId', p.id, 'descricao', p.descricao,
                              'cliente', p.cliente, 'clienteId', p.cliente_ref, 'exito', p.origem = 'ENCERRAMENTO')
      from ps p where p.valor is not null and p.rec < p.valor
    union all
    select 4, p.vencimento, null, true, null,
           jsonb_build_object('tipo', 'PARCELA_SEM_VALOR', 'nome', p.cliente || ' · ' || p.descricao, 'valor', null,
                              'vencimento', p.vencimento, 'contratoId', p.contrato_id, 'parcelaId', p.id, 'descricao', p.descricao,
                              'cliente', p.cliente, 'clienteId', p.cliente_ref, 'exito', p.origem = 'ENCERRAMENTO')
      from ps p where p.valor is null
    union all
    -- Ajuste 7: a data do reembolso é a da parcela que o leva, nunca a da conta (que já passou).
    select 5, cp.vencimento, (cp.parcela ->> 'vencimento')::date,
           cp.parcela is null or (cp.parcela ->> 'vencimento')::date < hoje_brasilia(),
           case when cp.parcela is not null then
             jsonb_build_object('vencimento', cp.parcela ->> 'vencimento', 'descricao', cp.parcela ->> 'descricao', 'cliente', cp.cliente, 'exito', false) end,
           jsonb_build_object('tipo', 'REEMBOLSO', 'nome', cp.descricao, 'valor', coalesce(cp.valor_pago, cp.valor), 'contaId', cp.id,
                              'categoria', cp.categoria, 'cliente', cp.cliente, 'clienteId', cp.cliente_id,
                              'parcela', case when cp.parcela is not null then jsonb_build_object('id', cp.parcela ->> 'id',
                                'descricao', cp.parcela ->> 'descricao', 'vencimento', cp.parcela ->> 'vencimento', 'contrato', cp.parcela -> 'contrato') end)
      from contas cp
  )
  select jsonb_build_object(
    'casoId', p_caso,
    'entrou', (select coalesce(sum(l.valor), 0) from levantamentos l where l.caso_id = p_caso and l.escritorio_id = p_escritorio),
    'destinadoPago', (select coalesce(sum(valor), 0) from dest where feito_em is not null),
    'faltaPagar', (select coalesce(sum(valor), 0) from dest where feito_em is null and dispensado_em is null),
    'parcelas', jsonb_build_object(
      'total', (select count(*) from ps),
      'pagas', (select count(*) from ps where valor is not null and rec >= valor),
      'ultima', (select max(p2.recebido_em) from pagamentos_recebidos p2 join ps on ps.id = p2.parcela_id),
      'falta', (select coalesce(sum(valor - rec), 0) from ps where valor is not null and rec < valor)),
    'prestacoesPendentes', (select count(*) from levantamentos l where l.caso_id = p_caso and l.escritorio_id = p_escritorio and l.prestacao_em is null),
    'pendencias', coalesce((select jsonb_agg(j order by ordem, dia nulls last) from pend), '[]'::jsonb),
    'falta', (select coalesce(sum((j ->> 'valor')::bigint), 0) from pend),
    -- Pergunta 1: só espera (nada pede ação agora) dá a data; vale a maior.
    'aVencer', (select case when bool_or(acao) then null else (array_agg(espera order by quando desc))[1] end from pend),
    'fechado', (select jsonb_build_object('em', f.fechado_em, 'por', pessoa_ref(f.fechado_por)) from fechamentos_caso f where f.caso_id = p_caso))
$$;

-- ---------------------------------------------------------------------------------------
-- O quadro da folha "Fechamento do caso" (decisão 6). Só se chama de funções que já exigiram a
-- área Financeiro, por isso traz os motivos de "não cobrado" (PT-02).
create function caso_acerto_quadro(p_escritorio uuid, p_caso uuid) returns jsonb
language sql stable
set search_path = public
as $$
  with ps as (
    select r.id, r.contrato_id, r.valor, parcela_recebido(r.id) rec from caso_acerto_parcelas(p_escritorio, p_caso) r
  ), ct as (
    select c.*, k.nome cliente_nome,
           coalesce((select jsonb_agg(jsonb_build_object('id', oc.id, 'nome', oc.nome) order by oc.nome)
                       from caso_clientes o join casos oc on oc.id = o.caso_id
                      where o.contrato_id = c.id and oc.id <> p_caso and oc.situacao = 'ANDAMENTO'), '[]'::jsonb) segue,
           (select h.autor_id from historico h
             where h.entidade = 'contratos' and h.entidade_id = c.id::text and h.escritorio_id = p_escritorio and h.acao = 'contrato.encerrado'
             order by h.ocorrido_em desc, h.id desc limit 1) encerrou
      from contratos c join clientes_escritorio k on k.id = c.cliente_id
     where c.escritorio_id = p_escritorio and c.estado <> 'ELABORACAO'
       and c.id in (select cc.contrato_id from caso_clientes cc where cc.caso_id = p_caso and cc.contrato_id is not null)
  )
  select jsonb_build_object(
    'caso', (select jsonb_build_object('id', ca.id, 'nome', ca.nome, 'resultado', ca.resultado, 'encerradoEm', ca.encerrado_em,
               'encerradoPor', (select pessoa_ref(m.por) from caso_etapa_mudancas m where m.caso_id = ca.id and m.resultado is not null
                                 order by m.ordem desc limit 1),
               'encerradoPorImportacao', ca.importacao_id is not null
                                         and not exists (select 1 from caso_etapa_mudancas m where m.caso_id = ca.id and m.resultado is not null))
               from casos ca where ca.id = p_caso and ca.escritorio_id = p_escritorio),
    'exitos', coalesce((select jsonb_agg(jsonb_build_object('cliente', jsonb_build_object('id', k.id, 'nome', k.nome), 'contratoId', x.contrato_id,
                  'situacao', x.situacao, 'calculado', x.calculado, 'valorLancado', x.valor_lancado, 'vencimento', x.vencimento,
                  'percentual', x.percentual, 'conferidoPor', pessoa_ref(x.conferido_por), 'conferidoEm', x.conferido_em,
                  'motivoNaoCobrar', x.motivo_nao_cobrar, 'explicacao', x.explicacao) order by k.nome)
                from exitos_conferir x join clientes_escritorio k on k.id = x.cliente_id
               where x.caso_id = p_caso and x.escritorio_id = p_escritorio), '[]'::jsonb),
    'contratos', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'numero', c.numero,
                  'cliente', jsonb_build_object('id', c.cliente_id, 'nome', c.cliente_nome), 'situacao', c.estado,
                  'encerradoEm', c.encerrado_em, 'encerradoPor', pessoa_ref(c.encerrou),
                  'comCaso', exists (select 1 from historico h where h.entidade = 'contratos' and h.entidade_id = c.id::text
                                       and h.escritorio_id = p_escritorio and h.acao = 'contrato.encerrado_com_caso'),
                  'exitoPercentual', (select json_inteiro(hc.params, 'percentual') from honorario_condicoes hc
                                       where hc.escritorio_id = p_escritorio and hc.dono_tipo = 'CONTRATO' and hc.dono_id = c.id and hc.tipo = 'EXITO'),
                  'parcelas', jsonb_build_object('total', (select count(*) from ps where ps.contrato_id = c.id),
                                                 'pagas', (select count(*) from ps where ps.contrato_id = c.id and ps.valor is not null and ps.rec >= ps.valor)),
                  'recebido', (select coalesce(sum(ps.rec), 0) from ps where ps.contrato_id = c.id),
                  'falta', (select coalesce(sum(ps.valor - ps.rec), 0) from ps where ps.contrato_id = c.id and ps.valor is not null and ps.rec < ps.valor),
                  'ultimaRecebidaEm', (select max(pg.recebido_em) from pagamentos_recebidos pg join ps on ps.id = pg.parcela_id where ps.contrato_id = c.id),
                  'seguePor', c.segue) order by c.numero)
                from ct c), '[]'::jsonb),
    'reembolsos', (select jsonb_build_object('adiantado', coalesce(sum(coalesce(cp.valor_pago, cp.valor)), 0),
                                             'reembolsado', coalesce(sum(coalesce(cp.valor_pago, cp.valor)) filter (where cp.reembolsado_em is not null), 0))
                     from contas_pagar cp
                    where cp.escritorio_id = p_escritorio and cp.caso_id = p_caso and cp.cliente_id is not null and cp.cancelada_em is null),
    'recebidoNoCaso', (select coalesce(sum(rec), 0) from ps),
    -- "Recebido no caso · 2 contratos": os contratos ligados cujas parcelas ficam com este caso.
    'contratosNoRecebido', (select count(*) from ct c where c.estado in ('ATIVO', 'ENCERRADO')
                              and (jsonb_array_length(c.segue) = 0 or exists (select 1 from ps where ps.contrato_id = c.id))),
    'contratosJaEncerrados', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'numero', c.numero,
                  'cliente', jsonb_build_object('id', c.cliente_id, 'nome', c.cliente_nome), 'encerradoEm', c.encerrado_em,
                  'encerradoPor', pessoa_ref(c.encerrou)) order by c.numero)
                from ct c where c.estado = 'ENCERRADO'), '[]'::jsonb),
    -- Decisão 10 (sugestão 5): quem tem a área Contratos e pode encerrar o contrato.
    'quemContratos', coalesce((select jsonb_agg(p.nome order by p.nome)
                from vinculos v join pessoas p on p.id = v.pessoa_id
               where v.escritorio_id = p_escritorio and v.revogado_em is null and v.funcao in ('SOCIO', 'EQUIPE')
                 and 'CONTRATOS' = any (areas_da_pessoa(v.pessoa_id, p_escritorio))
                 and pode(v.pessoa_id, p_escritorio, 'contratos.editar')), '[]'::jsonb),
    'comLevantamento', exists (select 1 from levantamentos l where l.caso_id = p_caso and l.escritorio_id = p_escritorio))
$$;

-- ---------------------------------------------------------------------------------------
-- A ficha do repasse e a do contrato: o acerto, os contratos que se encerram junto e o quadro.
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
                          from casos ca where ca.id = p_caso))
    || caso_acerto_quadro(p_escritorio, p_caso);
end $$;

-- ---------------------------------------------------------------------------------------
-- O nome curto de uma pendência no passo da ficha do cliente: "parcela 6/6", "Noemi · parcela
-- 6/6" (de outro contrato), "custas", "reembolso", "êxito de Joana".
create function pendencia_nome_curto(p jsonb, p_contrato uuid) returns text
language sql immutable
set search_path = public
as $$
  select case
    when p ->> 'tipo' = 'EXITO' or (p ->> 'tipo' in ('PARCELA', 'PARCELA_SEM_VALOR') and (p ->> 'exito')::boolean)
      then 'êxito de ' || split_part(p ->> 'cliente', ' ', 1)
    when p ->> 'tipo' in ('PARCELA', 'PARCELA_SEM_VALOR') then
      case when (p ->> 'contratoId')::uuid is not distinct from p_contrato
           then lower(left(p ->> 'descricao', 1)) || substr(p ->> 'descricao', 2)
           else split_part(p ->> 'cliente', ' ', 1) || ' · ' || lower(left(p ->> 'descricao', 1)) || substr(p ->> 'descricao', 2) end
    when p ->> 'tipo' = 'REEMBOLSO' then case when p ->> 'categoria' = 'CUSTAS' then 'custas' else 'reembolso' end
    else p ->> 'nome'
  end
$$;

-- O contrato de uma pendência: o dela, ou o da parcela que leva o reembolso.
create function pendencia_contrato(p jsonb) returns uuid
language sql immutable
set search_path = public
as $$ select coalesce(p ->> 'contratoId', p -> 'parcela' -> 'contrato' ->> 'id')::uuid $$;

-- ---------------------------------------------------------------------------------------
-- Os passos do fechamento de um caso encerrado, para um cliente dele (EX-16).
create or replace function cliente_fechamento(p_escritorio uuid, p_cliente uuid, p_caso uuid, p_valores boolean) returns jsonb
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
  v_meu uuid;
  v_ct uuid;
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
  -- 3. Encerrar no financeiro: no caso com levantamento, como antes; sem ele, quando o caso tem
  --    contrato ligado ativo ou encerrado (a despesa sozinha não basta: decisão 3).
  select * into v_fech from fechamentos_caso where caso_id = p_caso;
  if v_lev.id is not null then
    v_acerto := case when p_valores and v_fech.id is null then caso_acerto(p_escritorio, p_caso) end;
    v_passos := v_passos || jsonb_build_array(jsonb_build_object('tipo', 'FINANCEIRO', 'area', 'FINANCEIRO',
      'feito', v_fech.id is not null, 'em', v_fech.fechado_em, 'por', pessoa_ref(v_fech.fechado_por),
      'valor', case when p_valores then (v_acerto ->> 'falta')::bigint end,
      'pendentes', case when p_valores then (select jsonb_agg(distinct j ->> 'nome') from jsonb_array_elements(v_acerto -> 'pendencias') j) end,
      'levantamentoId', case when p_valores then v_lev.id end,
      'comLevantamento', true));
  elsif exists (select 1 from caso_clientes cc join contratos c on c.id = cc.contrato_id
                 where cc.caso_id = p_caso and cc.escritorio_id = p_escritorio and c.estado in ('ATIVO', 'ENCERRADO')) then
    v_acerto := case when p_valores and v_fech.id is null then caso_acerto(p_escritorio, p_caso) end;
    if p_valores then
      -- Decisão 4: o contrato do próprio cliente no caso; senão o da primeira pendência que tem
      -- contrato; senão o de menor número.
      select cc.contrato_id into v_meu from caso_clientes cc join contratos c on c.id = cc.contrato_id
       where cc.caso_id = p_caso and cc.cliente_id = p_cliente and c.estado in ('ATIVO', 'ENCERRADO');
      v_ct := coalesce(v_meu,
        (select pendencia_contrato(j) from jsonb_array_elements(v_acerto -> 'pendencias') with ordinality t(j, n)
          where pendencia_contrato(j) is not null order by n limit 1),
        (select c.id from caso_clientes cc join contratos c on c.id = cc.contrato_id
          where cc.caso_id = p_caso and c.estado in ('ATIVO', 'ENCERRADO') order by c.numero limit 1));
    end if;
    -- PT-02: cada campo com valor só para quem tem o Financeiro, um "case" por campo.
    v_passos := v_passos || jsonb_build_array(jsonb_build_object('tipo', 'FINANCEIRO', 'area', 'FINANCEIRO',
      'feito', v_fech.id is not null, 'em', v_fech.fechado_em, 'por', pessoa_ref(v_fech.fechado_por),
      'valor', case when p_valores then (v_acerto ->> 'falta')::bigint end,
      'pendentes', case when p_valores then (
        select jsonb_agg(x order by n) from (
          select x, min(n) n from (select pendencia_nome_curto(j, v_meu) x, n from jsonb_array_elements(v_acerto -> 'pendencias') with ordinality t(j, n)) y
           group by x) z) end,
      'aVencer', case when p_valores then v_acerto -> 'aVencer' end,
      'contratoId', case when p_valores then v_ct end,
      'casoId', case when p_valores then p_caso end,
      'comLevantamento', false));
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
-- A ficha do caso (Jurídico): o resumo do acerto, também no caso sem levantamento (EX-17).
create or replace function caso_resumo_acerto(p_pessoa uuid, p_escritorio uuid, p_caso uuid) returns jsonb
language plpgsql stable
set search_path = public
as $$
declare
  ca casos;
  v_fin boolean := 'FINANCEIRO' = any (areas_da_pessoa(p_pessoa, p_escritorio));
  v_a jsonb;
  v_lev levantamentos;
  v_fech fechamentos_caso;
  v_ctr boolean;
begin
  select * into ca from casos where id = p_caso and escritorio_id = p_escritorio;
  if ca.situacao <> 'ENCERRADO' or ca.encerrado_por is not distinct from 'IMPORTACAO_DESFEITA' then return null; end if;
  select * into v_lev from levantamentos where caso_id = p_caso order by entrou_em desc, criado_em desc limit 1;
  select * into v_fech from fechamentos_caso where caso_id = p_caso;
  v_ctr := exists (select 1 from caso_clientes cc join contratos c on c.id = cc.contrato_id
                    where cc.caso_id = p_caso and c.estado in ('ATIVO', 'ENCERRADO'));
  v_a := caso_acerto(p_escritorio, p_caso);
  return jsonb_build_object(
    'pendente', (v_fech.id is null and (v_lev.id is not null or v_ctr))
                or exists (select 1 from exitos_conferir x where x.caso_id = p_caso and x.situacao = 'PARA_CONFERIR'),
    'fechado', case when v_fech.id is not null then jsonb_build_object('em', v_fech.fechado_em, 'por', pessoa_ref(v_fech.fechado_por)) end,
    'comValores', v_fin,
    'levantamentoId', case when v_fin then v_lev.id end,
    -- Decisão 4, sem o cliente: o contrato da primeira pendência; sem pendência, o de menor número.
    'contratoId', case when v_fin and v_lev.id is null and v_ctr then coalesce(
        (select pendencia_contrato(j) from jsonb_array_elements(v_a -> 'pendencias') with ordinality t(j, n)
          where pendencia_contrato(j) is not null order by n limit 1),
        (select c.id from caso_clientes cc join contratos c on c.id = cc.contrato_id
          where cc.caso_id = p_caso and c.estado in ('ATIVO', 'ENCERRADO') order by c.numero limit 1)) end,
    'semTerceiros', v_lev.id is null,
    'semExito', ca.resultado = 'PERDA' and not exists (select 1 from exitos_conferir x where x.caso_id = p_caso),
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
                       'prazo', coalesce(j ->> 'prazo', j ->> 'vencimento'), 'tipo', j ->> 'tipo', 'cliente', j ->> 'cliente',
                       'descricao', j ->> 'descricao', 'categoria', j ->> 'categoria',
                       'vencimento', coalesce(j ->> 'vencimento', j -> 'parcela' ->> 'vencimento'),
                       'junto', j -> 'parcela' ->> 'descricao'))
                     from jsonb_array_elements(v_a -> 'pendencias') j
                    where j ->> 'tipo' <> 'EXITO' and not (j ->> 'tipo' = 'REPASSE' and j ->> 'para' = 'CLIENTE')), '[]'::jsonb) end,
    'faltaOutros', exists (select 1 from jsonb_array_elements(v_a -> 'pendencias') j
                            where j ->> 'tipo' <> 'EXITO' and not (j ->> 'tipo' = 'REPASSE' and j ->> 'para' = 'CLIENTE')),
    'contratos', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'numero', c.numero, 'situacao', c.estado, 'cliente', k.nome,
                   'assinadoEm', c.assinado_em, 'encerradoEm', c.encerrado_em,
                   'encerradoPor', (select pessoa_ref(h.autor_id) from historico h
                                     where h.entidade = 'contratos' and h.entidade_id = c.id::text and h.escritorio_id = p_escritorio
                                       and h.acao = 'contrato.encerrado' order by h.ocorrido_em desc, h.id desc limit 1))
                   || case when v_fin then (
                        select jsonb_build_object('recebido', coalesce(sum(r.rec), 0),
                                 'falta', coalesce(sum(r.valor - r.rec) filter (where r.valor is not null and r.rec < r.valor), 0),
                                 'ultimaRecebidaEm', (select max(pg.recebido_em) from pagamentos_recebidos pg
                                                       join caso_acerto_parcelas(p_escritorio, p_caso) q on q.id = pg.parcela_id where q.contrato_id = c.id),
                                 'tudoRecebido', count(*) > 0 and count(*) filter (where r.valor is null or r.rec < r.valor) = 0)
                          from (select q.valor, parcela_recebido(q.id) rec from caso_acerto_parcelas(p_escritorio, p_caso) q where q.contrato_id = c.id) r)
                      else '{}'::jsonb end
                   order by c.numero)
               from contratos c join clientes_escritorio k on k.id = c.cliente_id
              where c.id in (select cc.contrato_id from caso_clientes cc where cc.caso_id = p_caso)), '[]'::jsonb),
    'quemCuida', case when not v_fin then quem_tem_area(p_escritorio, 'FINANCEIRO') end);
end $$;

call fechar_acesso();
