-- Financeiro do Portal, parte 5: Relatórios do sócio (IN-02 a IN-05, IN-07, IN-08, IN-09, IN-12,
-- IN-14, IN-15; FI-06 e FI-07 como regra), tela aprovada em docs/design/aprovadas/portal-relatorios
-- (Carol, 20/11/2026). Decisões da Carol:
-- 1. só a sócia dona vê, nesta versão (para os outros, SO_SOCIO_DONO, mesmo com o Financeiro);
-- 2. Rendeu = o que entrou menos as despesas de caso adiantadas que ainda não voltaram, sem custo
--    fixo (o rateio é a DRE, FI-22);
-- 3. Entrou conta pelo dia em que o dinheiro entrou (caixa);
-- 4. o período padrão são os últimos 3 meses, contra os 3 anteriores, com o mês de hoje aberto.
-- Nenhuma tabela nova: tudo sai dos contratos, das parcelas, dos recebimentos, das contas
-- adiantadas, dos levantamentos e dos casos. Tudo em centavos, calculado aqui; a tela só mostra.
-- Regras de leitura:
-- - Entrou = recebimentos de parcela no caixa do escritório (com multa e juros) + honorários
--   transferidos de um levantamento. Reembolso não é honorário e não entra.
-- - A área é a do caso ligado ao contrato (o primeiro caso, quando há mais de um); contrato sem
--   caso é "Sem caso ligado" (SEM_CASO). O responsável é o do contrato; sem contrato, o do caso.
-- - A despesa adiantada não tem caso: vai para a área e o responsável do caso mais recente do
--   cliente (sem caso, do contrato mais recente dele).
-- - Falta receber é de hoje (e, para comparar, do último dia do período de comparação). Mensalidade
--   sem número de meses conta só até o mês da data. RPV e precatório ficam à parte: a parte do
--   escritório (honorários) que ainda não foi transferida. RPV a caminho, antes de entrar, fica para
--   depois (não há registro dele ainda).
-- - Terceiros (FI-06) vêm num bloco separado, que nunca soma com os números do escritório.

-- ---------------------------------------------------------------------------------------
-- Período. de e ate em aaaa-mm-dd; ate até hoje; no máximo 2 anos. Sem datas: os últimos 3 meses
-- (do dia 1º de dois meses atrás até hoje). A comparação "anterior" volta o mesmo número de meses
-- quando o período é de meses inteiros (o mês de hoje conta como inteiro); senão, o mesmo número
-- de dias. "ano_passado" é o mesmo período um ano antes. "nao" não compara.
create function relatorio_data(p text) returns date
language plpgsql immutable
as $$
declare
  v date;
begin
  if p is null or p !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then return null; end if;
  v := to_date(p, 'YYYY-MM-DD');
  return case when to_char(v, 'YYYY-MM-DD') = p then v end;
exception when others then
  return null;
end $$;

create type relatorio_periodo_t as (de date, ate date, comparar text, cde date, cate date);

create function relatorio_periodo(p_de text, p_ate text, p_comparar text) returns relatorio_periodo_t
language plpgsql stable
set search_path = public
as $$
declare
  de date;
  ate date;
  comparar text;
  cde date;
  cate date;
  v_hoje date := hoje_brasilia();
  v_meses integer;
  v_inteiro boolean;
  e text[] := '{}';
begin
  comparar := coalesce(nullif(p_comparar, ''), 'anterior');
  if comparar not in ('anterior', 'ano_passado', 'nao') then e := e || 'comparar'::text; end if;
  if coalesce(p_de, '') = '' and coalesce(p_ate, '') = '' then
    ate := v_hoje;
    de := (date_trunc('month', v_hoje) - interval '2 months')::date;
  else
    de := relatorio_data(p_de);
    ate := relatorio_data(p_ate);
    if de is null then e := e || 'de'::text; end if;
    if ate is null or ate > v_hoje or (de is not null and ate < de) then e := e || 'ate'::text; end if;
  end if;
  if cardinality(e) > 0 then
    raise exception 'Confira o período' using errcode = 'TC422',
      detail = jsonb_build_object('motivo', 'PERIODO_INVALIDO', 'campos', to_jsonb(e))::text;
  end if;
  if ate >= (de + interval '2 years')::date then
    raise exception 'O relatório mostra até 2 anos por vez' using errcode = 'TC422',
      detail = jsonb_build_object('motivo', 'PERIODO_LONGO', 'campos', jsonb_build_array('de', 'ate'))::text;
  end if;
  if comparar = 'ano_passado' then
    cde := (de - interval '1 year')::date;
    cate := (ate - interval '1 year')::date;
  elsif comparar = 'anterior' then
    v_inteiro := extract(day from de) = 1
      and (ate = (date_trunc('month', ate) + interval '1 month')::date - 1 or ate = v_hoje);
    if v_inteiro then
      v_meses := (extract(year from ate) * 12 + extract(month from ate)) - (extract(year from de) * 12 + extract(month from de)) + 1;
      cde := (de - make_interval(months => v_meses))::date;
    else
      cde := de - (ate - de + 1);
    end if;
    cate := de - 1;
  end if;
  return row(de, ate, comparar, cde, cate)::relatorio_periodo_t;
end $$;

create function relatorio_periodo_json(p relatorio_periodo_t) returns jsonb
language sql stable
as $$
  select jsonb_build_object('de', p.de, 'ate', p.ate, 'comparar', p.comparar, 'cde', p.cde, 'cate', p.cate,
                            'hoje', hoje_brasilia(),
                            'aberto', p.ate = hoje_brasilia() and hoje_brasilia() < (date_trunc('month', hoje_brasilia()) + interval '1 month')::date - 1)
$$;

-- Só a sócia dona abre os relatórios (decisão 1).
create function relatorio_entrar(p_pessoa uuid, p_escritorio uuid) returns void
language plpgsql
set search_path = public
as $$
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.ver');
  perform so_socio_dono(p_pessoa, p_escritorio);
end $$;

-- ---------------------------------------------------------------------------------------
-- Peças. Recebem o escritório já conferido.

-- O caso de um contrato: o primeiro a que ele foi ligado.
create function relatorio_caso_do_contrato(p_contrato uuid) returns uuid
language sql stable
set search_path = public
as $$ select cc.caso_id from caso_clientes cc where cc.contrato_id = p_contrato order by cc.criado_em, cc.ordem limit 1 $$;

-- A área e o responsável de um cliente, para o que não tem contrato (a despesa adiantada).
create function relatorio_caso_do_cliente(p_cliente uuid) returns uuid
language sql stable
set search_path = public
as $$ select cc.caso_id from caso_clientes cc where cc.cliente_id = p_cliente order by cc.criado_em desc limit 1 $$;

create function relatorio_contrato_do_cliente(p_cliente uuid) returns uuid
language sql stable
set search_path = public
as $$
  select c.id from contratos c where c.cliente_id = p_cliente and c.estado in ('ATIVO', 'ENCERRADO')
   order by c.assinado_em desc nulls last, c.criado_em desc limit 1
$$;

create function relatorio_area(p_caso uuid) returns text
language sql stable
set search_path = public
as $$ select coalesce((select area from casos where id = p_caso), 'SEM_CASO') $$;

-- O que entrou no caixa do escritório (decisão 3), um registro por dinheiro.
create function relatorio_entradas(p_escritorio uuid, p_de date, p_ate date)
returns table (id uuid, dia date, valor bigint, cliente_id uuid, contrato_id uuid, caso_id uuid, area text,
               responsavel_id uuid, origem text, descricao text, forma text, tipo text)
language sql stable
set search_path = public
as $$
  with x as (
    select p.id, p.recebido_em dia, p.valor + coalesce(p.multa_juros, 0) valor, c.cliente_id, c.id contrato_id,
           relatorio_caso_do_contrato(c.id) caso_id, c.responsavel_id, 'PARCELA' origem, r.descricao, p.forma, r.tipo
      from pagamentos_recebidos p
      join recebimentos_previstos r on r.id = p.parcela_id
      join contratos c on c.id = r.contrato_id
     where p.escritorio_id = p_escritorio and p.caixa = 'ESCRITORIO' and p.recebido_em between p_de and p_ate
    union all
    select d.id, d.feito_em, d.valor, l.cliente_id, cc.contrato_id, l.caso_id,
           coalesce((select k.responsavel_id from contratos k where k.id = cc.contrato_id), cs.responsavel_id),
           'LEVANTAMENTO', 'Honorários do levantamento', null, 'EXITO'
      from destinacoes d
      join levantamentos l on l.id = d.levantamento_id
      join casos cs on cs.id = l.caso_id
      left join caso_clientes cc on cc.caso_id = l.caso_id and cc.cliente_id = l.cliente_id
     where d.escritorio_id = p_escritorio and d.para = 'HONORARIOS' and d.feito_em between p_de and p_ate
  )
  select x.id, x.dia, x.valor, x.cliente_id, x.contrato_id, x.caso_id, relatorio_area(x.caso_id), x.responsavel_id,
         x.origem, x.descricao, x.forma, x.tipo
    from x
$$;

-- As parcelas em aberto num dia: o que faltava delas naquele dia. Contrato assinado até o dia;
-- mensalidade sem número de meses só até o fim do mês do dia.
create function relatorio_abertas(p_escritorio uuid, p_dia date)
returns table (parcela_id uuid, contrato_id uuid, cliente_id uuid, caso_id uuid, area text, responsavel_id uuid,
               vencimento date, falta bigint, tipo text, descricao text)
language sql stable
set search_path = public
as $$
  with r as (
    select r.id, r.contrato_id, c.cliente_id, c.responsavel_id, r.vencimento, r.tipo, r.descricao,
           r.valor - coalesce((select sum(p.valor) from pagamentos_recebidos p where p.parcela_id = r.id and p.recebido_em <= p_dia), 0) falta
      from recebimentos_previstos r
      join contratos c on c.id = r.contrato_id and c.estado in ('ATIVO', 'ENCERRADO') and c.assinado_em <= p_dia
     where r.escritorio_id = p_escritorio and r.valor is not null
       and (r.cancelado_em is null or (r.cancelado_em at time zone 'America/Sao_Paulo')::date > p_dia)
       and not (r.tipo = 'MENSAL' and r.vencimento > (date_trunc('month', p_dia) + interval '1 month')::date - 1
                and exists (select 1 from honorario_condicoes h where h.dono_tipo = 'CONTRATO' and h.dono_id = r.contrato_id
                                                                   and h.tipo = 'MENSAL' and h.params ->> 'meses' is null))
  )
  select r.id, r.contrato_id, r.cliente_id, k.caso, relatorio_area(k.caso), r.responsavel_id, r.vencimento, r.falta::bigint, r.tipo, r.descricao
    from r cross join lateral (select relatorio_caso_do_contrato(r.contrato_id) caso) k
   where r.falta > 0
$$;

-- As despesas de caso que o escritório adiantou, pagas no período e ainda não reembolsadas no
-- último dia dele (FI-07).
create function relatorio_adiantadas(p_escritorio uuid, p_de date, p_ate date)
returns table (conta_id uuid, cliente_id uuid, valor bigint, descricao text, paga_em date, area text, responsavel_id uuid)
language sql stable
set search_path = public
as $$
  select c.id, c.cliente_id, c.valor_pago, c.descricao, c.paga_em, relatorio_area(k.caso),
         coalesce((select responsavel_id from contratos where id = k.contrato), (select responsavel_id from casos where id = k.caso))
    from contas_pagar c
    cross join lateral (select relatorio_caso_do_cliente(c.cliente_id) caso, relatorio_contrato_do_cliente(c.cliente_id) contrato) k
   where c.escritorio_id = p_escritorio and c.cliente_id is not null and c.paga_em between p_de and p_ate
     and (c.reembolsado_em is null or c.reembolsado_em > p_ate)
$$;

-- RPV e precatório à parte: a parte do escritório que ainda não foi transferida.
create function relatorio_aparte(p_escritorio uuid)
returns table (destinacao_id uuid, cliente_id uuid, caso_id uuid, area text, responsavel_id uuid, tipo text, valor bigint, prazo date)
language sql stable
set search_path = public
as $$
  select d.id, l.cliente_id, l.caso_id, relatorio_area(l.caso_id),
         coalesce((select k.responsavel_id from caso_clientes cc join contratos k on k.id = cc.contrato_id
                    where cc.caso_id = l.caso_id and cc.cliente_id = l.cliente_id), cs.responsavel_id),
         l.tipo, d.valor, d.prazo
    from destinacoes d join levantamentos l on l.id = d.levantamento_id join casos cs on cs.id = l.caso_id
   where d.escritorio_id = p_escritorio and d.para = 'HONORARIOS' and d.feito_em is null and d.dispensado_em is null
$$;

-- O contratado do período: parcelas e mensalidades que vencem nele.
create function relatorio_contratado(p_escritorio uuid, p_de date, p_ate date)
returns table (contrato_id uuid, cliente_id uuid, area text, responsavel_id uuid, valor bigint)
language sql stable
set search_path = public
as $$
  select r.contrato_id, c.cliente_id, relatorio_area(relatorio_caso_do_contrato(c.id)), c.responsavel_id, r.valor
    from parcelas_validas(p_escritorio) r join contratos c on c.id = r.contrato_id
   where r.vencimento between p_de and p_ate
$$;

-- Os contratos que valeram em algum dia do período.
create function relatorio_contratos(p_escritorio uuid, p_de date, p_ate date) returns setof contratos
language sql stable
set search_path = public
as $$
  select c.* from contratos c
   where c.escritorio_id = p_escritorio and c.estado in ('ATIVO', 'ENCERRADO') and c.assinado_em <= p_ate
     and (c.encerrado_em is null or (c.encerrado_em at time zone 'America/Sao_Paulo')::date >= p_de)
$$;

-- Os casos em andamento em algum dia do período, inclusive os que encerraram nele.
create function relatorio_casos(p_escritorio uuid, p_de date, p_ate date) returns setof casos
language sql stable
set search_path = public
as $$
  select c.* from casos c
   where c.escritorio_id = p_escritorio and (c.criado_em at time zone 'America/Sao_Paulo')::date <= p_ate
     and (c.encerrado_em is null or (c.encerrado_em at time zone 'America/Sao_Paulo')::date >= p_de)
$$;

-- Os três números de um recorte (quem é o recorte vem de fora: cliente, área ou responsável).
create function relatorio_numeros(p_entrou bigint, p_adiantado bigint, p_falta bigint, p_vencido bigint) returns jsonb
language sql immutable
as $$ select jsonb_build_object('entrou', p_entrou, 'adiantado', p_adiantado, 'rendeu', p_entrou - p_adiantado, 'falta', p_falta, 'vencido', p_vencido) $$;

-- ---------------------------------------------------------------------------------------
-- Visão geral.
create function portal_relatorio_resumo(p_pessoa uuid, p_escritorio uuid, p_de text default null, p_ate text default null,
                                        p_comparar text default null) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  pr relatorio_periodo_t;
  v_hoje date;
  v_fim_mes date;
begin
  perform relatorio_entrar(p_pessoa, p_escritorio);
  pr := relatorio_periodo(p_de, p_ate, p_comparar);
  v_hoje := hoje_brasilia();
  v_fim_mes := (date_trunc('month', v_hoje) + interval '1 month')::date - 1;

  return (
    with ent as (select * from relatorio_entradas(p_escritorio, pr.de, pr.ate)),
    ent_c as (select * from relatorio_entradas(p_escritorio, pr.cde, pr.cate) where pr.cde is not null),
    ab as (select * from relatorio_abertas(p_escritorio, v_hoje)),
    ab_c as (select * from relatorio_abertas(p_escritorio, pr.cate) where pr.cate is not null),
    adi as (select * from relatorio_adiantadas(p_escritorio, pr.de, pr.ate)),
    adi_c as (select * from relatorio_adiantadas(p_escritorio, pr.cde, pr.cate) where pr.cde is not null),
    apt as (select * from relatorio_aparte(p_escritorio)),
    venc as (select a.*, v_hoje - a.vencimento dias from ab a where a.vencimento < v_hoje),
    meses as (
      select m::date mes, false anterior from generate_series(date_trunc('month', pr.de), date_trunc('month', pr.ate), interval '1 month') m
      union all
      select m::date, true from generate_series(date_trunc('month', pr.cde), date_trunc('month', pr.cate), interval '1 month') m where pr.cde is not null
    ),
    porcli as (
      select e.cliente_id, sum(e.valor)::bigint entrou from ent e group by e.cliente_id
    ),
    porarea as (
      select e.area, sum(e.valor)::bigint entrou from ent e group by e.area
    ),
    lev as (
      select l.* from levantamentos l where l.escritorio_id = p_escritorio and l.entrou_em between pr.de and pr.ate
    ),
    dest as (
      select d.* from destinacoes d where d.escritorio_id = p_escritorio and d.feito_em between pr.de and pr.ate
    )
    select jsonb_build_object(
      'periodo', relatorio_periodo_json(pr),
      'algum', exists (select 1 from pagamentos_recebidos where escritorio_id = p_escritorio and caixa = 'ESCRITORIO')
               or exists (select 1 from destinacoes where escritorio_id = p_escritorio and para = 'HONORARIOS' and feito_em is not null),
      'primeiro', least((select min(recebido_em) from pagamentos_recebidos where escritorio_id = p_escritorio and caixa = 'ESCRITORIO'),
                        (select min(feito_em) from destinacoes where escritorio_id = p_escritorio and para = 'HONORARIOS')),
      'entrou', jsonb_build_object(
        'valor', (select coalesce(sum(valor), 0) from ent),
        'n', (select count(*) from ent),
        'anterior', case when pr.cde is not null then (select coalesce(sum(valor), 0) from ent_c) end,
        'previstoMes', case when pr.ate = v_hoje then (select coalesce(sum(falta), 0) from ab where vencimento between v_hoje and v_fim_mes) else 0 end),
      'falta', jsonb_build_object(
        'valor', (select coalesce(sum(falta), 0) from ab),
        'vencido', (select coalesce(sum(falta), 0) from venc),
        'vencidas', (select count(*) from venc),
        'anterior', case when pr.cate is not null then (select coalesce(sum(falta), 0) from ab_c) end,
        'vencidoAnterior', case when pr.cate is not null then (select coalesce(sum(falta), 0) from ab_c where vencimento < pr.cate) end,
        'faixas', jsonb_build_array(
          (select jsonb_build_object('valor', coalesce(sum(falta), 0), 'n', count(*)) from venc where dias <= 30),
          (select jsonb_build_object('valor', coalesce(sum(falta), 0), 'n', count(*)) from venc where dias between 31 and 60),
          (select jsonb_build_object('valor', coalesce(sum(falta), 0), 'n', count(*)) from venc where dias between 61 and 90),
          (select jsonb_build_object('valor', coalesce(sum(falta), 0), 'n', count(*)) from venc where dias > 90)),
        'aVencerMes', (select jsonb_build_object('valor', coalesce(sum(falta), 0), 'n', count(*)) from ab where vencimento between v_hoje and v_fim_mes),
        'aVencerDepois', (select jsonb_build_object('valor', coalesce(sum(falta), 0), 'n', count(*)) from ab where vencimento > v_fim_mes),
        'aparte', jsonb_build_object(
          'valor', (select coalesce(sum(valor), 0) from apt),
          'lista', coalesce((select jsonb_agg(jsonb_build_object('id', a.destinacao_id, 'tipo', a.tipo, 'valor', a.valor, 'prazo', a.prazo,
                                                                 'cliente', (select nome from clientes_escritorio where id = a.cliente_id),
                                                                 'caso', (select nome from casos where id = a.caso_id)) order by a.prazo, a.destinacao_id)
                               from apt a), '[]'::jsonb))),
      'rendeu', jsonb_build_object(
        'valor', (select coalesce(sum(valor), 0) from ent) - (select coalesce(sum(valor), 0) from adi),
        'adiantado', (select coalesce(sum(valor), 0) from adi),
        'anterior', case when pr.cde is not null then (select coalesce(sum(valor), 0) from ent_c) - (select coalesce(sum(valor), 0) from adi_c) end,
        'despesas', coalesce((select jsonb_agg(jsonb_build_object('id', a.conta_id, 'descricao', a.descricao, 'valor', a.valor,
                                                                 'cliente', (select nome from clientes_escritorio where id = a.cliente_id))
                                               order by a.valor desc, a.conta_id) from adi a), '[]'::jsonb)),
      'contratado', (select coalesce(sum(valor), 0) from relatorio_contratado(p_escritorio, pr.de, pr.ate)),
      'meses', (select jsonb_agg(jsonb_build_object(
                  'mes', m.mes, 'anterior', m.anterior,
                  'valor', (select coalesce(sum(valor), 0) from (select valor, dia from ent union all select valor, dia from ent_c) x
                             where x.dia between m.mes and (m.mes + interval '1 month')::date - 1),
                  'parcial', not m.anterior and (m.mes + interval '1 month')::date - 1 > pr.ate)
                  order by m.anterior, m.mes) from meses m),
      'clientes', jsonb_build_object(
        'n', (select count(distinct cliente_id) from relatorio_contratos(p_escritorio, pr.de, pr.ate)),
        'top', coalesce((select jsonb_agg(jsonb_build_object('id', k.id, 'nome', k.nome, 'inativo', k.inativado_em is not null,
                                                             'contratos', (select count(*) from relatorio_contratos(p_escritorio, pr.de, pr.ate) c where c.cliente_id = k.id),
                                                             'entrou', t.entrou) order by t.entrou desc, k.nome)
                           from (select * from porcli order by entrou desc, cliente_id limit 5) t join clientes_escritorio k on k.id = t.cliente_id), '[]'::jsonb)),
      'areas', coalesce((select jsonb_agg(jsonb_build_object(
                           'area', a.area, 'entrou', a.entrou,
                           'casos', (select count(distinct e.caso_id) from ent e where e.area = a.area and e.caso_id is not null),
                           'contratos', (select count(distinct e.contrato_id) from ent e where e.area = a.area))
                           order by a.entrou desc, a.area) from porarea a), '[]'::jsonb),
      'terceiros', jsonb_build_object(
        'entrou', (select coalesce(sum(valor), 0) from lev),
        'n', (select count(*) from lev),
        'porTipo', (select coalesce(jsonb_object_agg(tipo, n), '{}'::jsonb) from (select tipo, count(*) n from lev group by tipo) t),
        'repassado', (select coalesce(sum(valor), 0) from dest where para = 'CLIENTE'),
        'clientesRepassados', coalesce((select jsonb_agg(distinct d.nome order by d.nome) from dest d where d.para = 'CLIENTE'), '[]'::jsonb),
        'honorarios', (select coalesce(sum(valor), 0) from dest where para = 'HONORARIOS'),
        'reembolso', (select coalesce(sum(valor), 0) from dest where para = 'REEMBOLSO'),
        'outros', (select coalesce(sum(valor), 0) from dest where para in ('PARCEIRO', 'PERITO', 'OUTRO')),
        'naConta', (terceiros_na_conta(p_escritorio) ->> 'saldo')::bigint))
  );
end $$;

-- ---------------------------------------------------------------------------------------
-- Por cliente. A lista vem inteira (o escritório tem dezenas de clientes); busca, área e ordem
-- são feitas na tela.
create function relatorio_por_cliente(p_escritorio uuid, pr relatorio_periodo_t) returns jsonb
language sql stable
set search_path = public
as $$
  with ent as (select * from relatorio_entradas(p_escritorio, pr.de, pr.ate)),
  ab as (select * from relatorio_abertas(p_escritorio, hoje_brasilia())),
  adi as (select * from relatorio_adiantadas(p_escritorio, pr.de, pr.ate)),
  apt as (select * from relatorio_aparte(p_escritorio)),
  ctr as (select * from relatorio_contratos(p_escritorio, pr.de, pr.ate)),
  cto as (select * from relatorio_contratado(p_escritorio, pr.de, pr.ate)),
  ids as (
    select cliente_id from ctr union select cliente_id from ent union select cliente_id from ab
    union select cliente_id from adi union select cliente_id from apt
  )
  select coalesce(jsonb_agg(x.j order by (x.j ->> 'entrou')::bigint desc, x.j ->> 'nome'), '[]'::jsonb) from (
    select jsonb_build_object(
      'id', k.id, 'nome', k.nome, 'inativo', k.inativado_em is not null,
      'contratos', (select count(*) from ctr where cliente_id = k.id),
      'responsaveis', coalesce((select jsonb_agg(distinct p.nome) from ctr c join pessoas p on p.id = c.responsavel_id where c.cliente_id = k.id), '[]'::jsonb),
      'areas', coalesce((select jsonb_agg(distinct a.area) from (
                 select area from ent where cliente_id = k.id union select area from ab where cliente_id = k.id
                 union select relatorio_area(relatorio_caso_do_contrato(c.id)) from ctr c where c.cliente_id = k.id) a), '[]'::jsonb),
      'contratado', (select coalesce(sum(valor), 0) from cto where cliente_id = k.id),
      'aparte', coalesce((select jsonb_agg(jsonb_build_object('tipo', a.tipo, 'valor', a.valor) order by a.prazo) from apt a where a.cliente_id = k.id), '[]'::jsonb)
    ) || relatorio_numeros(
      (select coalesce(sum(valor), 0) from ent where cliente_id = k.id)::bigint,
      (select coalesce(sum(valor), 0) from adi where cliente_id = k.id)::bigint,
      (select coalesce(sum(falta), 0) from ab where cliente_id = k.id)::bigint,
      (select coalesce(sum(falta), 0) from ab where cliente_id = k.id and vencimento < hoje_brasilia())::bigint) j
      from ids join clientes_escritorio k on k.id = ids.cliente_id
  ) x
$$;

create function portal_relatorio_clientes(p_pessoa uuid, p_escritorio uuid, p_de text default null, p_ate text default null,
                                          p_comparar text default null) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  pr relatorio_periodo_t;
begin
  perform relatorio_entrar(p_pessoa, p_escritorio);
  pr := relatorio_periodo(p_de, p_ate, p_comparar);
  return jsonb_build_object('periodo', relatorio_periodo_json(pr), 'clientes', relatorio_por_cliente(p_escritorio, pr));
end $$;

-- ---------------------------------------------------------------------------------------
-- Relatório de um cliente.
create function portal_relatorio_cliente(p_pessoa uuid, p_escritorio uuid, p_cliente uuid, p_de text default null,
                                         p_ate text default null, p_comparar text default null) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  pr relatorio_periodo_t;
  k clientes_escritorio;
  v_hoje date;
begin
  perform relatorio_entrar(p_pessoa, p_escritorio);
  pr := relatorio_periodo(p_de, p_ate, p_comparar);
  select * into k from clientes_escritorio where id = p_cliente and escritorio_id = p_escritorio;
  if not found then raise exception 'Cliente não encontrado' using errcode = 'TC404'; end if;
  v_hoje := hoje_brasilia();

  return (
    with ent as (select * from relatorio_entradas(p_escritorio, pr.de, pr.ate) where cliente_id = k.id),
    ent_c as (select * from relatorio_entradas(p_escritorio, pr.cde, pr.cate) where pr.cde is not null and cliente_id = k.id),
    ab as (select * from relatorio_abertas(p_escritorio, v_hoje) where cliente_id = k.id),
    adi as (select * from relatorio_adiantadas(p_escritorio, pr.de, pr.ate) where cliente_id = k.id),
    ctr as (select c.* from contratos c where c.cliente_id = k.id and c.estado in ('ATIVO', 'ENCERRADO')),
    venc as (select a.* from ab a where a.vencimento < v_hoje)
    select jsonb_build_object(
      'periodo', relatorio_periodo_json(pr),
      'cliente', jsonb_build_object('id', k.id, 'nome', k.nome, 'inativo', k.inativado_em is not null,
        'contratos', (select count(*) from ctr where estado = 'ATIVO'),
        'casos', (select count(*) from caso_clientes cc join casos cs on cs.id = cc.caso_id where cc.cliente_id = k.id and cs.situacao = 'ANDAMENTO'),
        'responsavel', (select pessoa_ref(c.responsavel_id) from ctr c order by (c.estado = 'ATIVO') desc, c.assinado_em desc limit 1)),
      'atraso', case when exists (select 1 from venc) then jsonb_build_object(
        'valor', (select sum(falta) from venc),
        'n', (select count(*) from venc),
        'dias', (select v_hoje - min(vencimento) from venc),
        'mais', (select jsonb_build_object('descricao', v.descricao, 'vencimento', v.vencimento, 'contrato', c.objeto,
                                           'prox', (select jsonb_build_object('data', e.prox_data, 'oque', e.prox_oque, 'responsavel', pessoa_ref(e.prox_responsavel_id))
                                                      from cobranca_eventos e where e.parcela_id = v.parcela_id order by e.ordem desc limit 1))
                   from venc v join contratos c on c.id = v.contrato_id order by v.vencimento, v.parcela_id limit 1)) end,
      'numeros', jsonb_build_object('contratado', (select coalesce(sum(valor), 0) from relatorio_contratado(p_escritorio, pr.de, pr.ate) where cliente_id = k.id),
                                    'entrouAnterior', case when pr.cde is not null then (select coalesce(sum(valor), 0) from ent_c) end)
                 || relatorio_numeros((select coalesce(sum(valor), 0) from ent)::bigint, (select coalesce(sum(valor), 0) from adi)::bigint,
                                      (select coalesce(sum(falta), 0) from ab)::bigint, (select coalesce(sum(falta), 0) from venc)::bigint),
      'contratos', coalesce((select jsonb_agg(jsonb_build_object(
          'id', c.id, 'numero', c.numero, 'objeto', c.objeto, 'estado', c.estado,
          'caso', (select jsonb_build_object('id', cs.id, 'nome', cs.nome) from casos cs where cs.id = relatorio_caso_do_contrato(c.id)),
          'area', relatorio_area(relatorio_caso_do_contrato(c.id)),
          'entrou', (select coalesce(sum(valor), 0) from ent where contrato_id = c.id),
          'falta', (select coalesce(sum(falta), 0) from ab where contrato_id = c.id),
          'parcelasAbertas', (select count(*) from ab where contrato_id = c.id))
          order by (c.estado = 'ATIVO') desc, c.assinado_em desc, c.numero)
        from ctr c where c.id in (select contrato_id from ent) or c.id in (select contrato_id from ab)
                      or c.id in (select id from relatorio_contratos(p_escritorio, pr.de, pr.ate))), '[]'::jsonb),
      'entradas', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'dia', e.dia, 'valor', e.valor, 'origem', e.origem, 'descricao', e.descricao,
                                                               'forma', e.forma, 'tipo', e.tipo, 'area', e.area,
                                                               'contrato', (select objeto from contratos where id = e.contrato_id))
                                             order by e.dia, e.id) from ent e), '[]'::jsonb),
      'abertas', coalesce((select jsonb_agg(jsonb_build_object('id', a.parcela_id, 'descricao', a.descricao, 'vencimento', a.vencimento, 'falta', a.falta,
                                                              'contrato', (select objeto from contratos where id = a.contrato_id),
                                                              'cobranca', (select jsonb_build_object('motivo', e.motivo, 'data', e.prox_data, 'oque', e.prox_oque,
                                                                                                     'responsavel', pessoa_ref(e.prox_responsavel_id))
                                                                             from cobranca_eventos e where e.parcela_id = a.parcela_id order by e.ordem desc limit 1))
                                            order by a.vencimento, a.parcela_id) from ab a), '[]'::jsonb),
      'adiantadas', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'descricao', c.descricao, 'valor', coalesce(c.valor_pago, c.valor),
                                                                 'pagaEm', c.paga_em, 'reembolsadoEm', c.reembolsado_em, 'como', c.reembolso_como)
                                               order by c.paga_em nulls last, c.id)
                                from contas_pagar c where c.escritorio_id = p_escritorio and c.cliente_id = k.id and c.paga_em is not null
                                  and (c.paga_em between pr.de and pr.ate or c.reembolsado_em between pr.de and pr.ate)), '[]'::jsonb),
      'terceiros', coalesce((select jsonb_agg(jsonb_build_object('id', l.id, 'tipo', l.tipo, 'valor', l.valor, 'entrouEm', l.entrou_em,
                                                                'caso', (select nome from casos where id = l.caso_id),
                                                                'repasse', (select jsonb_build_object('valor', d.valor, 'feitoEm', d.feito_em, 'prazo', d.prazo)
                                                                              from destinacoes d where d.levantamento_id = l.id and d.para = 'CLIENTE'))
                                              order by l.entrou_em, l.id)
                               from levantamentos l where l.escritorio_id = p_escritorio and l.cliente_id = k.id and l.entrou_em between pr.de and pr.ate), '[]'::jsonb))
  );
end $$;

-- ---------------------------------------------------------------------------------------
-- Por área do direito.
create function portal_relatorio_areas(p_pessoa uuid, p_escritorio uuid, p_de text default null, p_ate text default null,
                                       p_comparar text default null) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  pr relatorio_periodo_t;
begin
  perform relatorio_entrar(p_pessoa, p_escritorio);
  pr := relatorio_periodo(p_de, p_ate, p_comparar);
  return (
    with ent as (select * from relatorio_entradas(p_escritorio, pr.de, pr.ate)),
    ent_c as (select * from relatorio_entradas(p_escritorio, pr.cde, pr.cate) where pr.cde is not null),
    ab as (select * from relatorio_abertas(p_escritorio, hoje_brasilia())),
    adi as (select * from relatorio_adiantadas(p_escritorio, pr.de, pr.ate)),
    apt as (select * from relatorio_aparte(p_escritorio)),
    cs as (select * from relatorio_casos(p_escritorio, pr.de, pr.ate)),
    sem as (select c.* from relatorio_contratos(p_escritorio, pr.de, pr.ate) c where relatorio_caso_do_contrato(c.id) is null),
    areas as (
      select area from ent union select area from ent_c union select area from ab union select area from adi
      union select area from apt union select area from cs union select 'SEM_CASO' from sem
    )
    select jsonb_build_object('periodo', relatorio_periodo_json(pr), 'areas', coalesce(jsonb_agg(x.j order by (x.j ->> 'entrou')::bigint desc, x.j ->> 'area'), '[]'::jsonb))
      from (
        select jsonb_build_object(
          'area', a.area,
          'anterior', case when pr.cde is not null then (select coalesce(sum(valor), 0) from ent_c where area = a.area) end,
          'casos', case when a.area = 'SEM_CASO' then null else (select count(*) from cs where area = a.area) end,
          'encerrados', case when a.area = 'SEM_CASO' then null
                             else (select count(*) from cs where area = a.area and (encerrado_em at time zone 'America/Sao_Paulo')::date between pr.de and pr.ate) end,
          'contratosSemCaso', case when a.area = 'SEM_CASO' then (select count(*) from sem) end,
          'aparte', coalesce((select jsonb_agg(jsonb_build_object('tipo', p.tipo, 'valor', p.valor,
                                                                  'cliente', (select nome from clientes_escritorio where id = p.cliente_id)) order by p.prazo)
                                from apt p where p.area = a.area), '[]'::jsonb)
        ) || relatorio_numeros(
          (select coalesce(sum(valor), 0) from ent where area = a.area)::bigint,
          (select coalesce(sum(valor), 0) from adi where area = a.area)::bigint,
          (select coalesce(sum(falta), 0) from ab where area = a.area)::bigint,
          (select coalesce(sum(falta), 0) from ab where area = a.area and vencimento < hoje_brasilia())::bigint) j
          from areas a
      ) x
  );
end $$;

-- ---------------------------------------------------------------------------------------
-- Por responsável (do contrato). A carga é a dos casos (IN-08).
create function relatorio_por_responsavel(p_escritorio uuid, pr relatorio_periodo_t) returns jsonb
language sql stable
set search_path = public
as $$
  with ent as (select * from relatorio_entradas(p_escritorio, pr.de, pr.ate)),
  ab as (select * from relatorio_abertas(p_escritorio, hoje_brasilia())),
  adi as (select * from relatorio_adiantadas(p_escritorio, pr.de, pr.ate)),
  cs as (select * from relatorio_casos(p_escritorio, pr.de, pr.ate)),
  ctr as (select * from relatorio_contratos(p_escritorio, pr.de, pr.ate)),
  ids as (
    select responsavel_id from ent union select responsavel_id from ab union select responsavel_id from adi
    union select responsavel_id from cs union select responsavel_id from ctr
  )
  select coalesce(jsonb_agg(x.j order by (x.j ->> 'entrou')::bigint desc, x.j -> 'pessoa' ->> 'nome'), '[]'::jsonb) from (
    select jsonb_build_object(
      'pessoa', pessoa_ref(i.responsavel_id),
      'dono', e_socio_dono(i.responsavel_id, p_escritorio),
      'casos', (select count(*) from cs where responsavel_id = i.responsavel_id),
      'encerrados', (select count(*) from cs where responsavel_id = i.responsavel_id and (encerrado_em at time zone 'America/Sao_Paulo')::date between pr.de and pr.ate),
      'contratosSemCaso', (select count(*) from ctr c where c.responsavel_id = i.responsavel_id and relatorio_caso_do_contrato(c.id) is null)
    ) || relatorio_numeros(
      (select coalesce(sum(valor), 0) from ent where responsavel_id = i.responsavel_id)::bigint,
      (select coalesce(sum(valor), 0) from adi where responsavel_id = i.responsavel_id)::bigint,
      (select coalesce(sum(falta), 0) from ab where responsavel_id = i.responsavel_id)::bigint,
      (select coalesce(sum(falta), 0) from ab where responsavel_id = i.responsavel_id and vencimento < hoje_brasilia())::bigint) j
      from ids i where i.responsavel_id is not null
  ) x
$$;

create function portal_relatorio_responsaveis(p_pessoa uuid, p_escritorio uuid, p_de text default null, p_ate text default null,
                                              p_comparar text default null) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  pr relatorio_periodo_t;
begin
  perform relatorio_entrar(p_pessoa, p_escritorio);
  pr := relatorio_periodo(p_de, p_ate, p_comparar);
  return jsonb_build_object('periodo', relatorio_periodo_json(pr), 'responsaveis', relatorio_por_responsavel(p_escritorio, pr));
end $$;

-- ---------------------------------------------------------------------------------------
-- Exportar (decisão 13 do desenho): devolve tudo o que vai no arquivo e guarda no histórico. O
-- arquivo é montado na tela, como a exportação do contador. Terceiros vão numa aba à parte.
create function portal_relatorio_exportar(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  pr relatorio_periodo_t;
  v_formato text := p_dados ->> 'formato';
  v_visao text := coalesce(p_dados ->> 'visao', 'visao');
  v_resumo jsonb;
begin
  perform relatorio_entrar(p_pessoa, p_escritorio);
  if coalesce(v_formato, '') not in ('XLSX', 'PDF') or v_visao not in ('visao', 'clientes', 'areas', 'responsaveis', 'cliente') then
    perform recusar_campos('Confira a exportação', 'formato');
  end if;
  pr := relatorio_periodo(p_dados ->> 'de', p_dados ->> 'ate', p_dados ->> 'comparar');
  v_resumo := portal_relatorio_resumo(p_pessoa, p_escritorio, pr.de::text, pr.ate::text, pr.comparar);
  perform registrar_historico('financeiro.relatorio_exportado', 'escritorio', p_escritorio::text,
    jsonb_build_object('de', pr.de, 'ate', pr.ate, 'comparar', pr.comparar, 'visao', v_visao, 'formato', v_formato));
  return jsonb_build_object(
    'periodo', relatorio_periodo_json(pr),
    'formato', v_formato,
    'resumo', v_resumo,
    'clientes', relatorio_por_cliente(p_escritorio, pr),
    'areas', portal_relatorio_areas(p_pessoa, p_escritorio, pr.de::text, pr.ate::text, pr.comparar) -> 'areas',
    'responsaveis', relatorio_por_responsavel(p_escritorio, pr),
    'recebimentos', coalesce((select jsonb_agg(jsonb_build_object('dia', e.dia, 'valor', e.valor, 'origem', e.origem, 'descricao', e.descricao, 'forma', e.forma,
                                                                  'tipo', e.tipo, 'area', e.area,
                                                                  'cliente', (select nome from clientes_escritorio where id = e.cliente_id),
                                                                  'contrato', (select numero from contratos where id = e.contrato_id),
                                                                  'responsavel', (select nome from pessoas where id = e.responsavel_id))
                                                order by e.dia, e.id) from relatorio_entradas(p_escritorio, pr.de, pr.ate) e), '[]'::jsonb),
    'terceiros', coalesce((select jsonb_agg(jsonb_build_object('entrouEm', l.entrou_em, 'tipo', l.tipo, 'valor', l.valor,
                                                               'cliente', (select nome from clientes_escritorio where id = l.cliente_id),
                                                               'caso', (select nome from casos where id = l.caso_id),
                                                               'repassado', (select coalesce(sum(d.valor), 0) from destinacoes d where d.levantamento_id = l.id and d.para = 'CLIENTE' and d.feito_em is not null),
                                                               'honorarios', (select coalesce(sum(d.valor), 0) from destinacoes d where d.levantamento_id = l.id and d.para = 'HONORARIOS'))
                                             order by l.entrou_em, l.id)
                             from levantamentos l where l.escritorio_id = p_escritorio and l.entrou_em between pr.de and pr.ate), '[]'::jsonb));
end $$;

call fechar_acesso();
