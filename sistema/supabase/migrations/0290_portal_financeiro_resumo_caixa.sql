-- Financeiro do Portal, parte 4: Resumo, Caixa e a exportação para o contador (FI-03, FI-09,
-- FI-20, FI-21, PD-03, PD-06, IN-02 a IN-05, IN-07, IN-09, IN-10, IN-14), tela aprovada em
-- docs/design/aprovadas/portal-financeiro (Carol, 19/11/2026). Decisões do desenho:
-- 1. o dinheiro do escritório e o de terceiros nunca se somam: são dois números lado a lado;
-- 2. o Resumo responde, nesta ordem, o que está atrasado e o que fazer, quanto entrou contra o
--    previsto e o que falta repassar;
-- 14. o Caixa mostra os dois saldos, o previsto e o realizado de dois meses atrás a três à
--     frente, a tabela mês a mês e o saldo no fim de cada mês;
-- 15. a exportação diz o mês e o que vai no arquivo; terceiros vão numa aba à parte, porque não
--     são receita do escritório; a exportação fica no histórico.
-- Tudo é calculado aqui, no servidor, a partir dos registros: o caixa do escritório é o que
-- entrou (parcelas, multa e juros, honorários e reembolsos transferidos dos levantamentos) menos
-- as contas pagas. Ficam para depois: RPVs e precatórios a caminho com data estimada, o contador
-- do escritório e o envio por e-mail, e os comprovantes no arquivo (FI-18).

-- Cada exportação para o contador: o mês, o formato, quem gerou e quando. Só inserção.
create table exportacoes_contador (
  id             uuid primary key default gen_random_uuid(),
  escritorio_id  uuid not null references escritorios (id) on delete restrict,
  mes            date not null check (extract(day from mes) = 1),
  formato        text not null check (formato in ('XLSX', 'CSV')),
  gerada_por     uuid not null references pessoas (id) on delete restrict,
  gerada_em      timestamptz not null default app_now()
);
create index exportacoes_contador_escritorio on exportacoes_contador (escritorio_id, gerada_em desc);
call proteger_tabela_escritorio('exportacoes_contador');
create trigger exportacoes_so_acrescenta before update or delete on exportacoes_contador
  for each row execute function financeiro_so_acrescenta();

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('exportacoes_contador', true, 'Cada exportação do financeiro para o contador: o mês, o formato, quem gerou e quando',
  'Mostrar o que já foi entregue ao contador (FI-21)', 'Execução de contrato (LGPD, art. 7º, V)',
  'Escritório', 'Enquanto o escritório for cliente do T3jus e 5 anos depois do fim do contrato', 'Exportadas ao escritório e apagadas com ele', 'APROVADO', true);

-- ---------------------------------------------------------------------------------------
-- Peças. Recebem o escritório já conferido pela leitura que as chama.

-- As parcelas que contam: de contrato assinado (ativo ou encerrado), com valor e não canceladas.
create function parcelas_validas(p_escritorio uuid) returns setof recebimentos_previstos
language sql stable
set search_path = public
as $$
  select r.* from recebimentos_previstos r
    join contratos c on c.id = r.contrato_id and c.estado in ('ATIVO', 'ENCERRADO')
   where r.escritorio_id = p_escritorio and r.cancelado_em is null and r.valor is not null
$$;

-- O que entrou no caixa do escritório entre dois dias: parcelas (com multa e juros) e a parte
-- do escritório dos levantamentos, quando transferida (decisão 1).
create function caixa_entradas(p_escritorio uuid, p_de date, p_ate date) returns bigint
language sql stable
set search_path = public
as $$
  select ((select coalesce(sum(p.valor + coalesce(p.multa_juros, 0)), 0) from pagamentos_recebidos p
            where p.escritorio_id = p_escritorio and p.caixa = 'ESCRITORIO' and p.recebido_em between p_de and p_ate)
        + (select coalesce(sum(d.valor), 0) from destinacoes d
            where d.escritorio_id = p_escritorio and destinacao_do_escritorio(d.para) and d.feito_em between p_de and p_ate))::bigint
$$;

-- O que saiu do caixa do escritório entre dois dias: as contas pagas.
create function caixa_saidas(p_escritorio uuid, p_de date, p_ate date) returns bigint
language sql stable
set search_path = public
as $$
  select coalesce(sum(c.valor_pago), 0)::bigint from contas_pagar c
   where c.escritorio_id = p_escritorio and c.paga_em between p_de and p_ate
$$;

-- O previsto das parcelas que vencem entre dois dias: o valor inteiro ou só o que falta.
create function parcelas_previstas(p_escritorio uuid, p_de date, p_ate date, p_so_falta boolean) returns bigint
language sql stable
set search_path = public
as $$
  select coalesce(sum(case when p_so_falta then greatest(r.valor - parcela_recebido(r.id), 0) else r.valor end), 0)::bigint
    from parcelas_validas(p_escritorio) r where r.vencimento between p_de and p_ate
$$;

-- As saídas previstas de um mês: as contas lançadas que vencem nele e as recorrentes que ainda
-- vão nascer nele.
create function saidas_previstas(p_escritorio uuid, p_mes date, p_so_falta boolean) returns bigint
language sql stable
set search_path = public
as $$
  select ((select coalesce(sum(c.valor), 0) from contas_pagar c
            where c.escritorio_id = p_escritorio and c.vencimento between p_mes and (p_mes + interval '1 month')::date - 1
              and (not p_so_falta or c.paga_em is null))
        + (select coalesce(sum(r.valor), 0) from contas_recorrentes r
            where r.escritorio_id = p_escritorio and r.inicio <= p_mes and (r.encerrada_em is null or p_mes <= r.encerrada_em)
              and not exists (select 1 from contas_pagar c where c.recorrente_id = r.id and c.mes = p_mes)))::bigint
$$;

-- O dinheiro de terceiros que está com o escritório: o que falta repassar e transferir, por quem
-- recebe. Nunca se soma ao do escritório (decisão 1).
create function terceiros_na_conta(p_escritorio uuid) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'saldo', coalesce(sum(d.valor), 0),
    'honorarios', coalesce(sum(d.valor) filter (where destinacao_do_escritorio(d.para)), 0),
    'clientes', count(distinct d.nome) filter (where d.para = 'CLIENTE'),
    'peritos', count(*) filter (where d.para = 'PERITO'),
    'parceiros', count(*) filter (where d.para = 'PARCEIRO'),
    'outros', count(*) filter (where d.para = 'OUTRO'))
    from destinacoes d where d.escritorio_id = p_escritorio and d.feito_em is null and d.dispensado_em is null
$$;

-- O que entrou de honorário, por tipo, entre dois dias. Os honorários transferidos de um
-- levantamento são êxito.
create function receita_por_tipo(p_escritorio uuid, p_de date, p_ate date) returns table (tipo text, valor bigint)
language sql stable
set search_path = public
as $$
  select x.tipo, sum(x.valor)::bigint from (
    select r.tipo, p.valor + coalesce(p.multa_juros, 0) valor
      from pagamentos_recebidos p join recebimentos_previstos r on r.id = p.parcela_id
     where p.escritorio_id = p_escritorio and p.caixa = 'ESCRITORIO' and p.recebido_em between p_de and p_ate
    union all
    select 'EXITO', d.valor from destinacoes d
     where d.escritorio_id = p_escritorio and d.para = 'HONORARIOS' and d.feito_em between p_de and p_ate) x
   group by x.tipo
$$;

-- ---------------------------------------------------------------------------------------
-- Resumo (decisão 2).
create function portal_financeiro_resumo(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hoje date;
  v_mes date;
  v_fim date;
  v_sete date;
  v_recebido bigint;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.ver');
  perform lancar_recorrentes(p_escritorio);
  v_hoje := hoje_brasilia();
  v_mes := date_trunc('month', v_hoje)::date;
  v_fim := (v_mes + interval '1 month')::date - 1;
  v_sete := v_hoje + 7;
  v_recebido := caixa_entradas(p_escritorio, v_mes, v_hoje);

  return (
    with ps as (
      select r.*, greatest(r.valor - parcela_recebido(r.id), 0) falta from parcelas_validas(p_escritorio) r
    ), abertas as (
      select * from ps where falta > 0
    ), vencidas as (
      select a.*, v_hoje - a.vencimento dias,
             (select e.prox_data from cobranca_eventos e where e.parcela_id = a.id order by e.ordem desc limit 1) prox
        from abertas a where a.vencimento < v_hoje
    ), proximas as (
      select * from abertas where vencimento between v_hoje and v_sete
    ), meses as (
      select (v_mes - make_interval(months => i))::date m from generate_series(3, 0, -1) i
    ), tipos as (
      select t.tipo,
             coalesce((select valor from receita_por_tipo(p_escritorio, v_mes, v_hoje) a where a.tipo = t.tipo), 0) atual,
             coalesce((select sum(valor) from receita_por_tipo(p_escritorio, (v_mes - interval '3 months')::date, v_mes - 1) a where a.tipo = t.tipo), 0)::bigint anteriores,
             coalesce((select sum(falta) from abertas a where a.tipo = t.tipo and a.vencimento between v_hoje and v_fim), 0)::bigint restante
        from (select distinct tipo from receita_por_tipo(p_escritorio, (v_mes - interval '3 months')::date, v_hoje)) t
    ), pend as (
      select d.*, l.tipo lev_tipo, l.cliente_id, (select k.nome from clientes_escritorio k where k.id = l.cliente_id) cliente_nome,
             (select c.nome from casos c where c.id = l.caso_id) caso_nome
        from destinacoes d join levantamentos l on l.id = d.levantamento_id
       where d.escritorio_id = p_escritorio and d.feito_em is null and d.dispensado_em is null and not destinacao_do_escritorio(d.para)
    )
    select jsonb_build_object(
      'hoje', v_hoje,
      'mes', v_mes,
      'algum', exists (select 1 from ps) or exists (select 1 from contas_pagar where escritorio_id = p_escritorio)
               or exists (select 1 from levantamentos where escritorio_id = p_escritorio),
      'escritorio', jsonb_build_object(
        'recebido', v_recebido,
        'vencidoMes', (select coalesce(sum(falta), 0) from abertas where vencimento between v_mes and v_hoje - 1),
        'seteDias', (select coalesce(sum(falta), 0) from abertas where vencimento between v_hoje and least(v_sete, v_fim)),
        'restoMes', (select coalesce(sum(falta), 0) from abertas where vencimento > v_sete and vencimento <= v_fim)),
      'vencidas', jsonb_build_object(
        'valor', (select coalesce(sum(falta), 0) from vencidas),
        'n', (select count(*) from vencidas),
        'semAcao', (select count(*) from vencidas where prox is null or prox < v_hoje),
        'faixas', jsonb_build_array(
          (select jsonb_build_object('valor', coalesce(sum(falta), 0), 'n', count(*)) from vencidas where dias <= 30),
          (select jsonb_build_object('valor', coalesce(sum(falta), 0), 'n', count(*)) from vencidas where dias between 31 and 60),
          (select jsonb_build_object('valor', coalesce(sum(falta), 0), 'n', count(*)) from vencidas where dias between 61 and 90),
          (select jsonb_build_object('valor', coalesce(sum(falta), 0), 'n', count(*)) from vencidas where dias > 90)),
        'parcelas', coalesce((select jsonb_agg(parcela_linha(r) order by v.vencimento, v.id)
                                from (select * from vencidas order by vencimento, id limit 8) v join recebimentos_previstos r on r.id = v.id), '[]'::jsonb)),
      'proximas', jsonb_build_object(
        'valor', (select coalesce(sum(falta), 0) from proximas),
        'n', (select count(*) from proximas),
        'ate', (select max(vencimento) from proximas),
        'parcelas', coalesce((select jsonb_agg(parcela_linha(r) order by x.vencimento, x.id)
                                from (select * from proximas order by vencimento, id limit 8) x join recebimentos_previstos r on r.id = x.id), '[]'::jsonb)),
      'terceiros', terceiros_na_conta(p_escritorio),
      'repasses', jsonb_build_object(
        'valor', (select coalesce(sum(valor), 0) from pend),
        'n', (select count(*) from pend),
        'lista', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'levantamentoId', x.levantamento_id, 'para', x.para, 'nome', x.nome,
                                    'regra', x.regra, 'valor', x.valor, 'prazo', x.prazo, 'tipo', x.lev_tipo,
                                    'cliente', x.cliente_nome, 'caso', x.caso_nome) order by x.prazo, x.levantamento_id, x.ordem)
                             from (select * from pend order by prazo, levantamento_id, ordem limit 6) x), '[]'::jsonb)),
      'meses', (select jsonb_agg(jsonb_build_object(
                  'mes', m,
                  'previsto', case when m = v_mes then v_recebido + parcelas_previstas(p_escritorio, v_mes, v_fim, true)
                                   else parcelas_previstas(p_escritorio, m, (m + interval '1 month')::date - 1, false) end,
                  'realizado', caixa_entradas(p_escritorio, m, least((m + interval '1 month')::date - 1, v_hoje))) order by m)
                  from meses),
      'porTipo', coalesce((select jsonb_agg(jsonb_build_object('tipo', tipo, 'valor', atual, 'anteriores', anteriores, 'restante', restante)
                                            order by atual desc, tipo) from tipos), '[]'::jsonb),
      'contratado', (select jsonb_build_object('n', count(*), 'valor', coalesce(sum(
                        (select coalesce(sum(r.valor), 0) from recebimentos_previstos r
                          where r.contrato_id = c.id and r.cancelado_em is null and r.valor is not null)), 0))
                       from contratos c where c.escritorio_id = p_escritorio and c.estado in ('ATIVO', 'ENCERRADO')
                        and c.assinado_em between v_mes and v_fim),
      'clientesReceberam', (select jsonb_build_object('n', count(distinct l.cliente_id), 'valor', coalesce(sum(d.valor), 0))
                              from destinacoes d join levantamentos l on l.id = d.levantamento_id
                             where d.escritorio_id = p_escritorio and d.para = 'CLIENTE' and d.feito_em between v_mes and v_hoje),
      'fixas', jsonb_build_object(
        'receita', (select coalesce(sum(valor), 0) from ps where tipo in ('MENSAL', 'PARCELADO', 'RECORRENTE') and vencimento between v_mes and v_fim),
        'despesas', (select coalesce(sum(valor), 0) from contas_pagar where escritorio_id = p_escritorio and mes = v_mes)))
  );
end $$;

-- ---------------------------------------------------------------------------------------
-- Caixa (decisão 14). O saldo do escritório sai dos registros: o que entrou menos o que foi pago.
-- O mês corrente fecha com o que ainda falta entrar e sair nele; os meses seguintes seguem dali.
create function portal_financeiro_caixa(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hoje date;
  v_mes date;
  v_fim date;
  v_saldo bigint;
  v_fecha bigint;
  v_corre bigint;
  v_meses jsonb := '[]'::jsonb;
  v_m date;
  v_fm date;
  v_ep bigint;
  v_sp bigint;
  v_er bigint;
  v_sr bigint;
  v_s bigint;
  v_inicio date;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.ver');
  perform lancar_recorrentes(p_escritorio);
  v_hoje := hoje_brasilia();
  v_mes := date_trunc('month', v_hoje)::date;
  v_fim := (v_mes + interval '1 month')::date - 1;
  v_saldo := caixa_entradas(p_escritorio, '-infinity', v_hoje) - caixa_saidas(p_escritorio, '-infinity', v_hoje);
  v_fecha := v_saldo + parcelas_previstas(p_escritorio, v_mes, v_fim, true) - saidas_previstas(p_escritorio, v_mes, true);
  v_corre := v_fecha;

  for i in -2 .. 3 loop
    v_m := (v_mes + make_interval(months => i))::date;
    v_fm := (v_m + interval '1 month')::date - 1;
    if i < 0 then
      v_ep := parcelas_previstas(p_escritorio, v_m, v_fm, false);
      v_sp := saidas_previstas(p_escritorio, v_m, false);
      v_er := caixa_entradas(p_escritorio, v_m, v_fm);
      v_sr := caixa_saidas(p_escritorio, v_m, v_fm);
      v_s := caixa_entradas(p_escritorio, '-infinity', v_fm) - caixa_saidas(p_escritorio, '-infinity', v_fm);
    elsif i = 0 then
      v_er := caixa_entradas(p_escritorio, v_mes, v_hoje);
      v_sr := caixa_saidas(p_escritorio, v_mes, v_hoje);
      v_ep := v_er + parcelas_previstas(p_escritorio, v_mes, v_fim, true);
      v_sp := v_sr + saidas_previstas(p_escritorio, v_mes, true);
      v_s := v_saldo;
    else
      v_ep := parcelas_previstas(p_escritorio, v_m, v_fm, true);
      v_sp := saidas_previstas(p_escritorio, v_m, true);
      v_er := null;
      v_sr := null;
      v_corre := v_corre + v_ep - v_sp;
      v_s := v_corre;
    end if;
    v_meses := v_meses || jsonb_build_object('mes', v_m, 'entradasPrevistas', v_ep, 'entradasRealizadas', v_er,
                                             'saidasPrevistas', v_sp, 'saidasRealizadas', v_sr, 'saldo', v_s);
  end loop;

  -- Os meses que se podem exportar: do primeiro registro até o mês corrente, no máximo 13.
  v_inicio := greatest(date_trunc('month', least(
    (select min(recebido_em) from pagamentos_recebidos where escritorio_id = p_escritorio),
    (select min(coalesce(paga_em, vencimento)) from contas_pagar where escritorio_id = p_escritorio),
    (select min(entrou_em) from levantamentos where escritorio_id = p_escritorio),
    v_hoje))::date, (v_mes - interval '12 months')::date);

  return jsonb_build_object(
    'hoje', v_hoje,
    'mes', v_mes,
    'saldo', v_saldo,
    'fechaMes', v_fecha,
    'terceiros', terceiros_na_conta(p_escritorio),
    'meses', v_meses,
    'exportacoes', coalesce((select jsonb_agg(jsonb_build_object('mes', x.mes, 'formato', x.formato, 'em', x.gerada_em, 'por', pessoa_ref(x.gerada_por))
                                              order by x.gerada_em desc)
                               from (select * from exportacoes_contador where escritorio_id = p_escritorio order by gerada_em desc limit 3) x), '[]'::jsonb),
    'mesesExportar', (select jsonb_agg(m::date order by m desc) from generate_series(v_inicio, v_mes, interval '1 month') m));
end $$;

-- ---------------------------------------------------------------------------------------
-- Exportação para o contador (decisão 15). O mês vem como aaaa-mm-01.
create function exportacao_mes(p_mes text) returns date
language plpgsql stable
set search_path = public
as $$
declare v date;
begin
  if p_mes is null or p_mes !~ '^[0-9]{4}-[0-9]{2}-01$' then perform recusar_campos('Confira o mês', 'mes'); end if;
  begin
    v := p_mes::date;
  exception when others then
    perform recusar_campos('Confira o mês', 'mes');
  end;
  if v > date_trunc('month', hoje_brasilia())::date or v < '2000-01-01' then perform recusar_campos('Confira o mês', 'mes'); end if;
  return v;
end $$;

-- O que vai no arquivo de um mês, para a janela mostrar antes de exportar.
create function portal_financeiro_exportacao_previa(p_pessoa uuid, p_escritorio uuid, p_mes text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mes date;
  v_fm date;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.ver');
  v_mes := exportacao_mes(p_mes);
  v_fm := (v_mes + interval '1 month')::date - 1;
  return jsonb_build_object(
    'mes', v_mes,
    'aberto', v_mes = date_trunc('month', hoje_brasilia())::date,
    'recebimentos', (select jsonb_build_object('n', count(*), 'valor', coalesce(sum(p.valor + coalesce(p.multa_juros, 0)), 0))
                       from pagamentos_recebidos p where p.escritorio_id = p_escritorio and p.caixa = 'ESCRITORIO' and p.recebido_em between v_mes and v_fm),
    'honorariosTransferidos', (select jsonb_build_object('n', count(*), 'valor', coalesce(sum(d.valor), 0))
                       from destinacoes d where d.escritorio_id = p_escritorio and destinacao_do_escritorio(d.para) and d.feito_em between v_mes and v_fm),
    'despesas', (select jsonb_build_object('n', count(*), 'valor', coalesce(sum(c.valor_pago), 0))
                   from contas_pagar c where c.escritorio_id = p_escritorio and c.paga_em between v_mes and v_fm),
    'recibos', (select count(*) from recibos r join pagamentos_recebidos p on p.id = r.pagamento_id
                 where r.escritorio_id = p_escritorio and p.recebido_em between v_mes and v_fm),
    'terceiros', jsonb_build_object(
      'entrou', (select coalesce(sum(l.valor), 0) from levantamentos l where l.escritorio_id = p_escritorio and l.entrou_em between v_mes and v_fm),
      'repassado', (select coalesce(sum(d.valor), 0) from destinacoes d
                     where d.escritorio_id = p_escritorio and not destinacao_do_escritorio(d.para) and d.feito_em between v_mes and v_fm)));
end $$;

-- Gera os dados do arquivo e guarda a exportação no histórico. O arquivo (planilha ou CSV) é
-- montado na tela com estes dados.
create function portal_financeiro_exportar(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mes date;
  v_fm date;
  v_formato text := p_dados ->> 'formato';
  v_id uuid;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.ver');
  if v_formato is null or v_formato not in ('XLSX', 'CSV') then perform recusar_campos('Confira o formato', 'formato'); end if;
  v_mes := exportacao_mes(p_dados ->> 'mes');
  v_fm := (v_mes + interval '1 month')::date - 1;

  insert into exportacoes_contador (escritorio_id, mes, formato, gerada_por)
  values (p_escritorio, v_mes, v_formato, p_pessoa) returning id into v_id;
  perform registrar_historico('financeiro.exportacao_contador', 'exportacoes_contador', v_id::text,
    jsonb_build_object('mes', v_mes, 'formato', v_formato));

  return jsonb_build_object(
    'id', v_id,
    'mes', v_mes,
    'formato', v_formato,
    'escritorio', (select nome from escritorios where id = p_escritorio),
    'recebimentos', coalesce((select jsonb_agg(jsonb_build_object(
        'dia', p.recebido_em, 'cliente', k.nome, 'contrato', c.numero, 'parcela', r.descricao, 'tipo', r.tipo,
        'referencia', to_char(r.vencimento, 'YYYY-MM'), 'forma', p.forma, 'valor', p.valor, 'multaJuros', coalesce(p.multa_juros, 0),
        'recibo', (select rc.numero || '/' || rc.ano from recibos rc where rc.pagamento_id = p.id)) order by p.recebido_em, p.criado_em)
      from pagamentos_recebidos p
      join recebimentos_previstos r on r.id = p.parcela_id
      join contratos c on c.id = r.contrato_id
      join clientes_escritorio k on k.id = c.cliente_id
     where p.escritorio_id = p_escritorio and p.caixa = 'ESCRITORIO' and p.recebido_em between v_mes and v_fm), '[]'::jsonb)
     || coalesce((select jsonb_agg(jsonb_build_object(
        'dia', d.feito_em, 'cliente', k.nome, 'contrato', null, 'parcela', d.nome || coalesce(' · ' || d.regra, ''),
        'tipo', case when d.para = 'HONORARIOS' then 'EXITO' else 'REEMBOLSO' end,
        'referencia', to_char(l.entrou_em, 'YYYY-MM'), 'forma', 'TRANSFERENCIA', 'valor', d.valor, 'multaJuros', 0, 'recibo', null)
        order by d.feito_em, d.ordem)
      from destinacoes d join levantamentos l on l.id = d.levantamento_id join clientes_escritorio k on k.id = l.cliente_id
     where d.escritorio_id = p_escritorio and destinacao_do_escritorio(d.para) and d.feito_em between v_mes and v_fm), '[]'::jsonb),
    'despesas', coalesce((select jsonb_agg(jsonb_build_object(
        'dia', c.paga_em, 'vencimento', c.vencimento, 'descricao', c.descricao, 'fornecedor', c.fornecedor, 'categoria', c.categoria,
        'forma', c.forma, 'valor', c.valor_pago, 'recorrente', c.recorrente_id is not null,
        'cliente', (select k.nome from clientes_escritorio k where k.id = c.cliente_id)) order by c.paga_em, c.descricao)
      from contas_pagar c where c.escritorio_id = p_escritorio and c.paga_em between v_mes and v_fm), '[]'::jsonb),
    'terceiros', coalesce((select jsonb_agg(jsonb_build_object(
        'entrouEm', l.entrou_em, 'tipo', l.tipo, 'cliente', k.nome, 'caso', cs.nome, 'levantado', l.valor,
        'para', d.para, 'nome', d.nome, 'valor', d.valor, 'feitoEm', d.feito_em,
        'situacao', case when d.feito_em is not null then 'FEITO' when d.dispensado_em is not null then 'DISPENSADO' else 'PENDENTE' end)
        order by l.entrou_em, l.id, d.ordem)
      from destinacoes d join levantamentos l on l.id = d.levantamento_id
      join clientes_escritorio k on k.id = l.cliente_id join casos cs on cs.id = l.caso_id
     where d.escritorio_id = p_escritorio and (l.entrou_em between v_mes and v_fm or d.feito_em between v_mes and v_fm)), '[]'::jsonb));
end $$;

call fechar_acesso();
