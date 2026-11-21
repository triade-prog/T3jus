-- Reembolso ligado ao caso e mostrado na próxima parcela (F3.23: FI-07, CH-05), pelo desenho
-- aprovado em docs/design/aprovadas/portal-financeiro (estados nova-conta e contrato):
-- - a conta adiantada para um cliente guarda também o caso; o caso é obrigatório quando o
--   cliente tem algum caso, e tem de ser um caso dele;
-- - "Cobrar junto com a próxima parcela" liga o reembolso à primeira parcela do cliente que vence
--   a partir do dia em que a conta foi lançada, de preferência a do contrato do cliente naquele
--   caso. A ligação é calculada: se a parcela for cancelada, passa para a seguinte; se for paga
--   sem o reembolso, ele continua "a reembolsar", ligado a ela;
-- - a ficha de parcelas do contrato mostra o que o escritório adiantou nos casos do contrato;
-- - na divisão do alvará, só entram sozinhos os reembolsos do próprio caso (ou sem caso).
-- Fica para o desenho em aprovação (portal-exito-conferir): o "+ reembolso" na lista do A
-- receber e registrar o reembolso junto com a parcela.

alter table contas_pagar add column caso_id uuid references casos (id) on delete restrict;
alter table contas_pagar add constraint contas_pagar_caso_com_cliente check (caso_id is null or cliente_id is not null);
create index contas_pagar_caso on contas_pagar (caso_id) where caso_id is not null;
update inventario_dados
   set o_que = 'Contas do escritório: descrição, fornecedor, categoria, valor, vencimento, pagamento e, quando adiantada para um cliente, o cliente, o caso e como o valor volta'
 where tabela = 'contas_pagar';

-- A parcela em que o reembolso volta: a primeira do cliente (não cancelada, com valor) que vence a
-- partir de p_desde, de preferência a do contrato do cliente no caso.
create function reembolso_proxima_parcela(p_escritorio uuid, p_cliente uuid, p_caso uuid, p_desde date) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object('id', r.id, 'descricao', r.descricao, 'vencimento', r.vencimento, 'valor', r.valor,
                            'contrato', jsonb_build_object('id', ct.id, 'numero', ct.numero))
    from recebimentos_previstos r
    join contratos ct on ct.id = r.contrato_id and ct.estado in ('ATIVO', 'ENCERRADO')
   where r.escritorio_id = p_escritorio and ct.cliente_id = p_cliente
     and r.cancelado_em is null and r.valor is not null and r.vencimento >= p_desde
   order by (ct.id = (select cc.contrato_id from caso_clientes cc where cc.caso_id = p_caso and cc.cliente_id = p_cliente)) desc nulls last,
            r.vencimento, r.descricao
   limit 1
$$;

-- A parcela de uma conta "junto com a próxima parcela" que ainda não foi reembolsada.
create function conta_parcela_reembolso(c contas_pagar) returns jsonb
language sql stable
set search_path = public
as $$
  select case when c.reembolso_como = 'PROXIMA_PARCELA' and c.reembolsado_em is null then
    reembolso_proxima_parcela(c.escritorio_id, c.cliente_id, c.caso_id, (c.criado_em at time zone 'America/Sao_Paulo')::date) end
$$;

create or replace function conta_linha(c contas_pagar) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', c.id, 'descricao', c.descricao, 'fornecedor', c.fornecedor, 'categoria', c.categoria,
    'valor', c.valor, 'valorPago', c.valor_pago, 'vencimento', c.vencimento, 'forma', c.forma,
    'pagaEm', c.paga_em, 'situacao', conta_situacao(c),
    'recorrente', case when c.recorrente_id is not null then
      (select jsonb_build_object('dia', r.dia, 'lancadaSozinha', c.lancada_sozinha, 'mes', c.mes)
         from contas_recorrentes r where r.id = c.recorrente_id) end,
    'adiantada', case when c.cliente_id is not null then jsonb_build_object(
      'cliente', (select jsonb_build_object('id', k.id, 'nome', k.nome) from clientes_escritorio k where k.id = c.cliente_id),
      'caso', (select jsonb_build_object('id', s.id, 'nome', s.nome) from casos s where s.id = c.caso_id),
      'como', c.reembolso_como, 'reembolsadoEm', c.reembolsado_em, 'parcela', conta_parcela_reembolso(c)) end)
$$;

create or replace function portal_financeiro_conta_lancar(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_desc text := nullif(btrim(coalesce(p_dados ->> 'descricao', '')), '');
  v_forn text := nullif(btrim(coalesce(p_dados ->> 'fornecedor', '')), '');
  v_cat text := p_dados ->> 'categoria';
  v_valor bigint := json_inteiro(p_dados, 'valor');
  v_venc date := json_data(p_dados, 'vencimento');
  v_forma text := nullif(p_dados ->> 'forma', '');
  v_repete boolean := coalesce((p_dados ->> 'repete')::boolean, false);
  v_adiantada boolean := coalesce((p_dados ->> 'adiantada')::boolean, false);
  v_como text := nullif(p_dados ->> 'reembolsoComo', '');
  v_cliente uuid;
  v_caso uuid;
  v_rec uuid;
  v_id uuid;
  e text[] := '{}';
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.editar');
  begin v_cliente := nullif(p_dados ->> 'clienteId', '')::uuid; exception when others then v_cliente := null; end;
  begin v_caso := nullif(p_dados ->> 'casoId', '')::uuid; exception when others then v_caso := null; end;
  if v_desc is null or length(v_desc) not between 3 and 120 then e := e || 'descricao'::text; end if;
  if v_forn is not null and length(v_forn) > 120 then e := e || 'fornecedor'::text; end if;
  if not coalesce(categoria_saida_valida(v_cat), false) then e := e || 'categoria'::text; end if;
  if v_valor is null or v_valor not between 1 and 10000000000 then e := e || 'valor'::text; end if;
  if v_venc is null or v_venc < date '2000-01-01' or v_venc > hoje_brasilia() + 3650 then e := e || 'vencimento'::text; end if;
  if v_forma is not null and not forma_pagamento_valida(v_forma) then e := e || 'forma'::text; end if;
  if v_adiantada then
    if v_cliente is null or not exists (select 1 from clientes_escritorio k where k.id = v_cliente and k.escritorio_id = p_escritorio) then
      e := e || 'clienteId'::text;
    end if;
    if coalesce(v_como, '') not in ('PROXIMA_PARCELA', 'LEVANTAMENTO', 'A_PARTE') then e := e || 'reembolsoComo'::text; end if;
    -- O caso: um dos casos do cliente; obrigatório quando o cliente tem algum caso.
    if v_caso is not null then
      if not exists (select 1 from caso_clientes cc where cc.caso_id = v_caso and cc.cliente_id = v_cliente and cc.escritorio_id = p_escritorio) then
        e := e || 'casoId'::text;
      end if;
    elsif v_cliente is not null and exists (select 1 from caso_clientes cc where cc.cliente_id = v_cliente and cc.escritorio_id = p_escritorio) then
      e := e || 'casoId'::text;
    end if;
  end if;
  if cardinality(e) > 0 then perform recusar_campos('Confira a conta', variadic (select array_agg(v order by v) from unnest(e) v)); end if;

  if v_repete then
    insert into contas_recorrentes (escritorio_id, descricao, fornecedor, categoria, valor, dia, forma, inicio, autor_id)
    values (p_escritorio, v_desc, v_forn, v_cat, v_valor, extract(day from v_venc)::integer, v_forma,
            (date_trunc('month', v_venc) + interval '1 month')::date, p_pessoa)
    returning id into v_rec;
  end if;
  insert into contas_pagar (escritorio_id, descricao, fornecedor, categoria, valor, vencimento, forma, recorrente_id, mes,
                            cliente_id, caso_id, reembolso_como, autor_id)
  values (p_escritorio, v_desc, v_forn, v_cat, v_valor, v_venc, v_forma, v_rec,
          case when v_rec is not null then date_trunc('month', v_venc)::date end,
          case when v_adiantada then v_cliente end, case when v_adiantada then v_caso end, case when v_adiantada then v_como end, p_pessoa)
  returning id into v_id;
  perform registrar_historico('financeiro.conta_lancada', 'contas_pagar', v_id::text,
    jsonb_build_object('categoria', v_cat, 'valor', v_valor, 'vencimento', v_venc, 'recorrente', v_rec,
                       'cliente', case when v_adiantada then v_cliente end, 'caso', case when v_adiantada then v_caso end));
  return jsonb_build_object('id', v_id, 'recorrenteId', v_rec,
    'parcela', case when v_adiantada and v_como = 'PROXIMA_PARCELA' then reembolso_proxima_parcela(p_escritorio, v_cliente, v_caso, hoje_brasilia()) end);
end $$;


create or replace function repasse_proposta(p_escritorio uuid, p_caso uuid, p_cliente uuid, p_valor bigint) returns jsonb
language plpgsql stable
set search_path = public
as $$
declare
  v_contrato contratos;
  v_exito honorario_condicoes;
  v_linhas jsonb := '[]'::jsonb;
  v_soma bigint := 0;
  v_hon bigint;
  r record;
begin
  select ct.* into v_contrato from caso_clientes cc join contratos ct on ct.id = cc.contrato_id
   where cc.caso_id = p_caso and cc.cliente_id = p_cliente;
  if v_contrato.id is not null then
    select * into v_exito from honorario_condicoes
     where dono_tipo = 'CONTRATO' and dono_id = v_contrato.id and tipo = 'EXITO';
    if v_exito.id is not null then
      v_hon := round(p_valor * (v_exito.params ->> 'percentual')::bigint / 10000.0);
      if v_hon > 0 then
        v_linhas := v_linhas || jsonb_build_object('para', 'HONORARIOS', 'nome', 'Honorários de êxito',
          'regra', format('%s%% · %s · contrato %s',
                          replace(rtrim(rtrim(to_char((v_exito.params ->> 'percentual')::numeric / 100, 'FM9990.00'), '0'), '.'), '.', ','),
                          v_exito.params ->> 'sobre', v_contrato.numero),
          'valor', v_hon);
        v_soma := v_soma + v_hon;
      end if;
    end if;
  end if;
  for r in select cp.id, cp.descricao, coalesce(cp.valor_pago, cp.valor) valor, coalesce(cp.paga_em, cp.vencimento) dia
             from contas_pagar cp
            where cp.escritorio_id = p_escritorio and cp.cliente_id = p_cliente and cp.reembolso_como = 'LEVANTAMENTO'
              and (cp.caso_id is null or cp.caso_id = p_caso)
              and cp.reembolsado_em is null
              and not exists (select 1 from destinacoes d where d.conta_id = cp.id and d.dispensado_em is null)
            order by cp.vencimento, cp.criado_em loop
    v_linhas := v_linhas || jsonb_build_object('para', 'REEMBOLSO', 'nome', 'Reembolso: ' || r.descricao,
      'regra', 'Adiantado pelo escritório em ' || to_char(r.dia, 'DD/MM/YYYY'), 'valor', r.valor, 'contaId', r.id);
    v_soma := v_soma + r.valor;
  end loop;
  return jsonb_build_object(
    'contrato', case when v_contrato.id is not null then jsonb_build_object('id', v_contrato.id, 'numero', v_contrato.numero) end,
    'linhas', v_linhas,
    'cliente', greatest(p_valor - v_soma, 0),
    'falta', least(p_valor - v_soma, 0));
end $$;


-- Para a janela de lançar conta: os casos do cliente e, para cada um (e sem caso), a parcela em
-- que o reembolso voltaria se fosse lançado hoje.
create function portal_financeiro_adiantar(p_pessoa uuid, p_escritorio uuid, p_cliente uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hoje date := hoje_brasilia();
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.ver');
  if not exists (select 1 from clientes_escritorio k where k.id = p_cliente and k.escritorio_id = p_escritorio) then
    raise exception 'Cliente não encontrado' using errcode = 'TC404';
  end if;
  return jsonb_build_object(
    'casos', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'nome', s.nome, 'numero', s.numero_cnj, 'situacao', s.situacao,
                                          'proximaParcela', reembolso_proxima_parcela(p_escritorio, p_cliente, s.id, v_hoje))
                       order by s.situacao, s.nome)
        from caso_clientes cc join casos s on s.id = cc.caso_id
       where cc.escritorio_id = p_escritorio and cc.cliente_id = p_cliente), '[]'::jsonb),
    'proximaParcela', reembolso_proxima_parcela(p_escritorio, p_cliente, null, v_hoje));
end $$;

-- Na ficha de parcelas do contrato: o que o escritório adiantou nos casos deste contrato (e o
-- adiantado sem caso para o mesmo cliente).
create function portal_financeiro_contrato_adiantados(p_pessoa uuid, p_escritorio uuid, p_contrato uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c contratos;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.ver');
  select * into c from contratos where id = p_contrato and escritorio_id = p_escritorio;
  if c.id is null or c.estado = 'ELABORACAO' then raise exception 'Contrato não encontrado' using errcode = 'TC404'; end if;
  return coalesce((
    select jsonb_agg(conta_linha(cp) order by cp.vencimento, cp.criado_em)
      from contas_pagar cp
     where cp.escritorio_id = p_escritorio and cp.cliente_id = c.cliente_id
       and (cp.caso_id is null
            or exists (select 1 from caso_clientes cc where cc.caso_id = cp.caso_id and cc.cliente_id = c.cliente_id and cc.contrato_id = c.id))), '[]'::jsonb);
end $$;

call fechar_acesso();
