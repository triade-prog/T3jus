-- 0651 · O êxito baixado pela divisão do alvará (F3.94, CH-07).
-- Desenho aprovado em docs/design/aprovadas/portal-exito-conferir ("Alvará", e a linha da janela
-- de conferir: "se o dinheiro do acordo entrar pelo escritório, o honorário sai na divisão de
-- Repasses e a parcela do êxito é baixada por lá"); pergunta 1: o êxito é lançado sempre.
-- - Ao registrar um levantamento (alvará, RPV, precatório ou depósito de acordo), cada parte
--   "honorários" da divisão baixa a parcela do êxito do mesmo cliente no mesmo caso, até o que
--   falta nela; a parcela fica paga, com a origem "da divisão do alvará de dd/mm".
-- - A baixa é um recebimento com caixa TERCEIROS: o dinheiro entra no caixa do escritório só
--   quando a parte "honorários" é transferida (como já era), e não conta duas vezes no Caixa, no
--   Resumo, nos Relatórios nem na exportação para o contador.
-- - A divisão proposta avisa qual parcela vai ser baixada. A parte que já baixou a parcela não se
--   dispensa (o recebimento é só de inserção).

-- O recebimento que veio da divisão do alvará.
alter table pagamentos_recebidos add column destinacao_id uuid references destinacoes (id) on delete restrict;
alter table pagamentos_recebidos add constraint pagamentos_recebidos_destinacao_check
  check (destinacao_id is null or caixa = 'TERCEIROS');
create unique index pagamentos_recebidos_destinacao on pagamentos_recebidos (destinacao_id, parcela_id) where destinacao_id is not null;

-- As parcelas do êxito do cliente no caso que ainda faltam receber, da mais antiga para a mais nova.
create function exito_parcelas_abertas(p_escritorio uuid, p_caso uuid, p_cliente uuid) returns table (id uuid, descricao text, vencimento date, falta bigint)
language sql stable
set search_path = public
as $$
  select r.id, r.descricao, r.vencimento, r.valor - parcela_recebido(r.id)
    from recebimentos_previstos r
    join exitos_conferir x on x.id = r.exito_id
    join contratos c on c.id = r.contrato_id and c.estado in ('ATIVO', 'ENCERRADO')
   where r.escritorio_id = p_escritorio and x.caso_id = p_caso and x.cliente_id = p_cliente
     and r.cancelado_em is null and r.valor is not null and parcela_recebido(r.id) < r.valor
   order by r.vencimento, r.id
$$;

-- A divisão proposta diz qual parcela do êxito a parte "honorários" vai baixar.
alter function repasse_proposta(uuid, uuid, uuid, bigint) rename to repasse_proposta_sem_exito;
create function repasse_proposta(p_escritorio uuid, p_caso uuid, p_cliente uuid, p_valor bigint) returns jsonb
language sql stable
set search_path = public
as $$
  select repasse_proposta_sem_exito(p_escritorio, p_caso, p_cliente, p_valor) || jsonb_build_object(
    'exito', (select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'descricao', e.descricao, 'vencimento', e.vencimento, 'falta', e.falta)
                                        order by e.vencimento, e.id), '[]'::jsonb)
                from exito_parcelas_abertas(p_escritorio, p_caso, p_cliente) e))
$$;

-- Registrar o levantamento: cada parte "honorários" baixa a parcela do êxito.
alter function portal_financeiro_levantamento_registrar(uuid, uuid, jsonb) rename to financeiro_levantamento_registrar_sem_exito;
create function portal_financeiro_levantamento_registrar(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb := financeiro_levantamento_registrar_sem_exito(p_pessoa, p_escritorio, p_dados);
  l levantamentos;
  d destinacoes;
  e record;
  v_resta bigint;
  v_parte bigint;
  v_pag uuid;
  v_baixas jsonb := '[]'::jsonb;
begin
  select * into l from levantamentos where id = (v ->> 'id')::uuid;
  for d in select * from destinacoes where levantamento_id = l.id and para = 'HONORARIOS' order by ordem loop
    v_resta := d.valor;
    for e in select * from exito_parcelas_abertas(p_escritorio, l.caso_id, l.cliente_id) loop
      exit when v_resta <= 0;
      perform 1 from recebimentos_previstos where id = e.id for update;
      v_parte := least(v_resta, e.falta);
      insert into pagamentos_recebidos (escritorio_id, parcela_id, valor, recebido_em, forma, caixa, destinacao_id, autor_id)
      values (p_escritorio, e.id, v_parte, l.entrou_em, 'TRANSFERENCIA', 'TERCEIROS', d.id, p_pessoa) returning id into v_pag;
      perform registrar_historico('financeiro.recebimento', 'recebimentos_previstos', e.id::text,
        jsonb_build_object('pagamento', v_pag, 'valor', v_parte, 'recebidoEm', l.entrou_em, 'forma', 'TRANSFERENCIA',
                           'levantamento', l.id, 'destinacao', d.id, 'tipo', l.tipo));
      v_baixas := v_baixas || jsonb_build_object('parcelaId', e.id, 'descricao', e.descricao, 'valor', v_parte, 'paga', v_parte >= e.falta);
      v_resta := v_resta - v_parte;
    end loop;
  end loop;
  return v || jsonb_build_object('exitoBaixado', v_baixas);
end $$;

-- A parte "honorários" que já baixou a parcela do êxito não se dispensa.
alter function portal_financeiro_destinacao_dispensar(uuid, uuid, uuid, text) rename to financeiro_destinacao_dispensar_sem_exito;
create function portal_financeiro_destinacao_dispensar(p_pessoa uuid, p_escritorio uuid, p_destinacao uuid, p_motivo text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.editar');
  if exists (select 1 from pagamentos_recebidos p where p.destinacao_id = p_destinacao and p.escritorio_id = p_escritorio) then
    perform recusar_motivo('Esta parte já deu baixa na parcela do êxito. Faça a transferência para o escritório.', 'BAIXOU_EXITO');
  end if;
  return financeiro_destinacao_dispensar_sem_exito(p_pessoa, p_escritorio, p_destinacao, p_motivo);
end $$;

-- A parcela mostra que foi baixada pela divisão do alvará.
alter function parcela_linha(recebimentos_previstos) rename to parcela_linha_sem_alvara;
create function parcela_linha(r recebimentos_previstos) returns jsonb
language sql stable
set search_path = public
as $$
  select parcela_linha_sem_alvara(r) || jsonb_build_object(
    'baixaAlvara', (select jsonb_agg(jsonb_build_object('tipo', l.tipo, 'entrouEm', l.entrou_em, 'valor', p.valor, 'levantamentoId', l.id)
                                     order by p.recebido_em, p.criado_em)
                      from pagamentos_recebidos p join destinacoes d on d.id = p.destinacao_id join levantamentos l on l.id = d.levantamento_id
                     where p.parcela_id = r.id))
$$;

call fechar_acesso();
