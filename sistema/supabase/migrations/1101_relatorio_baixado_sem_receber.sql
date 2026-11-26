-- 1101 · "Baixado sem receber" nos Relatórios do sócio (F3.173; IN-04, IN-07, FI-24). Plano (v2,
-- seção B) e desenho (D38, estados rb-) aprovados pela Carol em 26/11/2026, às 18h44 (Bahia), em
-- docs/design/aprovadas/portal-exito-baixado-alvara.
--
-- Regras (B2):
--   - a baixa conta no dia em que foi feita, em Brasília (a mesma conta de parcela_baixada_no_dia);
--     o desfazer conta no dia dele, como um movimento próprio, e nunca tira o valor do período da
--     baixa: um mês passado não muda quando a baixa é desfeita depois (nota 11 da baixa);
--   - o número principal soma o valor das linhas BAIXA de parcela (sem as custas) com motivo
--     Perdoada ou Inadimplência. É bruto e nunca fica negativo;
--   - ao lado, sem somar: as desfeitas no período, a renegociada (e as desfeitas dela) e as custas
--     baixadas junto (e as desfeitas delas). A linha DESFEITA herda o motivo e a marca de custas da
--     baixa que desfaz, pelo desfaz_id (nota 20);
--   - de quem é: o cliente, o contrato, a área e o responsável do contrato da parcela, com o recorte
--     de relatorio_abertas (contrato ATIVO ou ENCERRADO);
--   - a explicação aparece só no relatório de um cliente, e nunca para o cliente EXCLUIDO (a marca
--     da 1092). A exportação não leva a explicação.
-- Entrou, Falta receber, Rendeu, o Caixa e a exportação ao contador não mudam: a baixa não é
-- entrada de caixa (0650). Nenhuma tabela nova.
--
-- As funções que outras frentes também mudam (o embrulho da 0555 e relatorio_por_cliente da 0410)
-- são trocadas por trecho exato, que para a migration se não aparecer exatamente uma vez (como a
-- 1010 e a 1100). Um cliente e a exportação são renomeadas e embrulhadas, na forma da 0555: a
-- mudança só acrescenta, e o retorno continua jsonb.

-- ---------------------------------------------------------------------------------------
-- 0. Troca de um trecho exato numa função que já existe (cópia da t1010_trocar).
create function t1101_trocar(p_funcao regprocedure, p_de text, p_para text, p_vezes integer default 1) returns void
language plpgsql
as $$
declare
  v_def text := pg_get_functiondef(p_funcao);
  v_n integer := (length(v_def) - length(replace(v_def, p_de, ''))) / length(p_de);
begin
  if v_n <> p_vezes then raise exception 'O trecho aparece % vezes em % (esperado %): %', v_n, p_funcao, p_vezes, left(p_de, 80); end if;
  execute replace(v_def, p_de, p_para);
end $$;

-- ---------------------------------------------------------------------------------------
-- 1. O índice pelo dia (hoje só há os índices por parcela e por conta, 1010).
create index parcela_baixas_dia on parcela_baixas (escritorio_id, feito_em);

-- ---------------------------------------------------------------------------------------
-- 2. Os movimentos do período: uma linha por BAIXA ou DESFEITA feita entre p_de e p_ate (dia de
-- Brasília). Na DESFEITA, o motivo e a marca de custas vêm da baixa desfeita. "soma" marca o que
-- entra no número principal. "desfeita_em" é o dia em que a BAIXA foi desfeita, quando foi (em
-- qualquer dia, mesmo depois do período: é o selo "desfeita em", que não muda o número).
create function relatorio_baixas(p_escritorio uuid, p_de date, p_ate date)
returns table (id uuid, ordem bigint, dia date, tipo text, motivo text, custas boolean, soma boolean, valor bigint,
               parcela_id uuid, contrato_id uuid, cliente_id uuid, caso_id uuid, area text, responsavel_id uuid,
               descricao text, por uuid, desfeita_em date)
language sql stable
set search_path = public
as $$
  with m as (
    select b.id, b.ordem, (b.feito_em at time zone 'America/Sao_Paulo')::date dia, b.tipo,
           coalesce(b.motivo, o.motivo) motivo, coalesce(o.reembolso_conta_id, b.reembolso_conta_id) is not null custas,
           b.valor, b.parcela_id, b.feito_por,
           case when b.tipo = 'BAIXA' then (select (d.feito_em at time zone 'America/Sao_Paulo')::date from parcela_baixas d where d.desfaz_id = b.id) end desfeita_em
      from parcela_baixas b
      left join parcela_baixas o on o.id = b.desfaz_id
     where b.escritorio_id = p_escritorio
       and b.feito_em >= (p_de::timestamp at time zone 'America/Sao_Paulo')
       and b.feito_em < ((p_ate + 1)::timestamp at time zone 'America/Sao_Paulo')
  )
  select m.id, m.ordem, m.dia, m.tipo, m.motivo, m.custas,
         m.tipo = 'BAIXA' and not m.custas and m.motivo in ('PERDOADA', 'INADIMPLENCIA'),
         m.valor, m.parcela_id, c.id, c.cliente_id, k.caso, relatorio_area(k.caso), c.responsavel_id, r.descricao, m.feito_por, m.desfeita_em
    from m
    join recebimentos_previstos r on r.id = m.parcela_id
    join contratos c on c.id = r.contrato_id and c.estado in ('ATIVO', 'ENCERRADO')
    cross join lateral (select relatorio_caso_do_contrato(c.id) caso) k
$$;

-- ---------------------------------------------------------------------------------------
-- 3. A folha da visão geral. "algum": o escritório já teve alguma baixa (a folha só aparece aí).
create function relatorio_baixado_json(p_escritorio uuid, p_de date, p_ate date, p_cde date, p_cate date) returns jsonb
language sql stable
set search_path = public
as $$
  with b as (select * from relatorio_baixas(p_escritorio, p_de, p_ate)),
  grupo as (
    select g, jsonb_build_object(
             'valor', coalesce(sum(b.valor) filter (where b.tipo = 'BAIXA'), 0),
             'n', count(*) filter (where b.tipo = 'BAIXA'),
             'desfeitas', jsonb_build_object('valor', coalesce(sum(b.valor) filter (where b.tipo = 'DESFEITA'), 0),
                                             'n', count(*) filter (where b.tipo = 'DESFEITA'))) j
      from (values ('soma'), ('renegociado'), ('custas')) v(g)
      left join b on case v.g when 'custas' then b.custas
                              when 'renegociado' then not b.custas and b.motivo = 'RENEGOCIADA'
                              else not b.custas and b.motivo in ('PERDOADA', 'INADIMPLENCIA') end
     group by g
  )
  select jsonb_build_object(
    'valor', (select coalesce(sum(valor), 0) from b where soma),
    'n', (select count(*) from b where soma),
    'porMotivo', jsonb_build_object('PERDOADA', (select coalesce(sum(valor), 0) from b where soma and motivo = 'PERDOADA'),
                                    'INADIMPLENCIA', (select coalesce(sum(valor), 0) from b where soma and motivo = 'INADIMPLENCIA')),
    'desfeitas', (select j -> 'desfeitas' from grupo where g = 'soma'),
    'renegociado', (select j from grupo where g = 'renegociado'),
    'custas', (select j from grupo where g = 'custas'),
    'anterior', case when p_cde is not null then (select coalesce(sum(valor), 0) from relatorio_baixas(p_escritorio, p_cde, p_cate) where soma) end,
    'algum', exists (select 1 from parcela_baixas where escritorio_id = p_escritorio))
$$;

-- ---------------------------------------------------------------------------------------
-- 4. Visão geral: a folha entra no embrulho da 0555, com as datas do próprio período devolvido.
select t1101_trocar('portal_relatorio_resumo(uuid,uuid,text,text,text)',
  $q$  return jsonb_set(v, '{falta,aparte,caminho}'$q$,
  $q$  -- 1101 (F3.173): a folha "Baixado sem receber", pelo dia da baixa.
  v := v || jsonb_build_object('baixado', relatorio_baixado_json(p_escritorio, (v -> 'periodo' ->> 'de')::date, (v -> 'periodo' ->> 'ate')::date,
                                                                 (v -> 'periodo' ->> 'cde')::date, (v -> 'periodo' ->> 'cate')::date));
  return jsonb_set(v, '{falta,aparte,caminho}'$q$);

-- ---------------------------------------------------------------------------------------
-- 5. Por cliente: a coluna nova, e o cliente que só teve baixa no período entra na lista.
select t1101_trocar('relatorio_por_cliente(uuid,relatorio_periodo_t)',
  $q$  ids as (
    select cliente_id from ctr union select cliente_id from ent union select cliente_id from ab
    union select cliente_id from adi union select cliente_id from apt
  )$q$,
  $q$  bx as (select * from relatorio_baixas(p_escritorio, pr.de, pr.ate)),
  ids as (
    select cliente_id from ctr union select cliente_id from ent union select cliente_id from ab
    union select cliente_id from adi union select cliente_id from apt
    union select cliente_id from bx where soma
  )$q$);
select t1101_trocar('relatorio_por_cliente(uuid,relatorio_periodo_t)',
  $q$      'aparte', coalesce((select jsonb_agg(jsonb_build_object('tipo', a.tipo, 'valor', a.valor) order by a.prazo) from apt a where a.cliente_id = k.id), '[]'::jsonb)$q$,
  $q$      'aparte', coalesce((select jsonb_agg(jsonb_build_object('tipo', a.tipo, 'valor', a.valor) order by a.prazo) from apt a where a.cliente_id = k.id), '[]'::jsonb),
      'baixado', (select coalesce(sum(valor), 0) from bx where soma and cliente_id = k.id),
      'baixadoMotivos', coalesce((select jsonb_agg(distinct motivo order by motivo) from bx where soma and cliente_id = k.id), '[]'::jsonb)$q$);

-- ---------------------------------------------------------------------------------------
-- 6. Um cliente: o número (só a tela decide mostrar quando é maior que zero) e a lista do período,
-- com a explicação entre aspas, menos para o cliente excluído (1092).
alter function portal_relatorio_cliente(uuid, uuid, uuid, text, text, text) rename to relatorio_cliente_base;
create function portal_relatorio_cliente(p_pessoa uuid, p_escritorio uuid, p_cliente uuid, p_de text default null,
                                         p_ate text default null, p_comparar text default null) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb := relatorio_cliente_base(p_pessoa, p_escritorio, p_cliente, p_de, p_ate, p_comparar);
  v_excluido boolean := (select estado = 'EXCLUIDO' from clientes_escritorio where id = p_cliente and escritorio_id = p_escritorio);
begin
  return (
    with b as (select * from relatorio_baixas(p_escritorio, (v -> 'periodo' ->> 'de')::date, (v -> 'periodo' ->> 'ate')::date) x
                where x.cliente_id = p_cliente)
    select jsonb_set(v, '{numeros}', (v -> 'numeros') || jsonb_build_object(
             'baixado', (select coalesce(sum(valor), 0) from b where soma),
             'baixadoDesfeitas', (select coalesce(sum(valor), 0) from b where tipo = 'DESFEITA' and not custas and motivo in ('PERDOADA', 'INADIMPLENCIA'))))
      || jsonb_build_object('baixas', coalesce((select jsonb_agg(jsonb_build_object(
             'id', b.id, 'dia', b.dia, 'tipo', b.tipo, 'motivo', b.motivo, 'custas', b.custas, 'soma', b.soma, 'valor', b.valor,
             'parcela', b.descricao, 'por', pessoa_ref(b.por), 'desfeitaEm', b.desfeita_em,
             -- No desfazer, o dia da baixa que ele desfaz ("não tira de 15/10").
             'baixaEm', case when b.tipo = 'DESFEITA' then (select (o.feito_em at time zone 'America/Sao_Paulo')::date
                                                               from parcela_baixas d join parcela_baixas o on o.id = d.desfaz_id where d.id = b.id) end,
             'explicacao', case when b.tipo = 'BAIXA' and not coalesce(v_excluido, false) then (select x.explicacao from parcela_baixas x where x.id = b.id) end)
           order by b.dia, b.ordem) from b), '[]'::jsonb))
  );
end $$;

-- A exportação: a aba "Baixas sem receber", sem a explicação. O resumo e a lista por cliente já
-- vêm com o número novo (seções 4 e 5).
alter function portal_relatorio_exportar(uuid, uuid, jsonb) rename to relatorio_exportar_base;
create function portal_relatorio_exportar(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb := relatorio_exportar_base(p_pessoa, p_escritorio, p_dados);
begin
  return v || jsonb_build_object('baixas', coalesce((select jsonb_agg(jsonb_build_object(
      'dia', b.dia, 'tipo', b.tipo, 'motivo', b.motivo, 'custas', b.custas, 'soma', b.soma, 'valor', b.valor, 'desfeitaEm', b.desfeita_em,
      'cliente', (select nome from clientes_escritorio where id = b.cliente_id),
      'contrato', (select numero from contratos where id = b.contrato_id),
      'parcela', b.descricao,
      'por', (select nome from pessoas where id = b.por))
    order by b.dia, b.ordem)
    from relatorio_baixas(p_escritorio, (v -> 'periodo' ->> 'de')::date, (v -> 'periodo' ->> 'ate')::date) b), '[]'::jsonb));
end $$;

drop function t1101_trocar(regprocedure, text, text, integer);

call fechar_acesso();
