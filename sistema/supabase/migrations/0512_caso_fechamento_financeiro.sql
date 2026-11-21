-- Encerrar o caso no financeiro (F3.45: FI-08, PT-03), pelo desenho aprovado em
-- docs/design/aprovadas/portal-financeiro (estados repasse e fechar-bloqueado):
-- - o caso só se encerra no financeiro com tudo recebido e tudo repassado: as parcelas dos
--   contratos ligados ao caso pagas ou canceladas, as partes de cada alvará feitas ou
--   dispensadas com motivo, e o que o escritório adiantou no caso reembolsado;
-- - o botão nunca fica desabilitado: com pendência, o servidor recusa com o motivo PENDENCIAS e
--   a lista do que falta, com os valores, e a janela mostra isso;
-- - o fechamento é um registro só de inserção, com quem e quando, e fica no histórico do caso.
-- A prestação de contas aparece no acerto, mas não segura o fechamento (é aviso, não dinheiro).

create table fechamentos_caso (
  id             uuid primary key default gen_random_uuid(),
  escritorio_id  uuid not null references escritorios (id) on delete restrict,
  caso_id        uuid not null unique references casos (id) on delete restrict,
  fechado_em     timestamptz not null default app_now(),
  fechado_por    uuid not null references pessoas (id) on delete restrict
);
call proteger_tabela_escritorio('fechamentos_caso');
create trigger fechamentos_caso_so_acrescenta before update or delete on fechamentos_caso
  for each row execute function financeiro_so_acrescenta();

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('fechamentos_caso', true, 'O encerramento do caso no financeiro: o caso, quem encerrou e quando',
  'Mostrar que o caso terminou com tudo recebido e repassado (FI-08)', 'Execução de contrato (LGPD, art. 7º, V)',
  'Escritório', 'Enquanto o escritório for cliente do T3jus', 'Exportadas ao escritório e apagadas com ele', 'APROVADO', true);

-- O acerto do caso: o que entrou, o que já foi destinado e pago, o que falta, a situação das
-- parcelas dos contratos do caso e a lista do que ainda segura o fechamento.
create function caso_acerto(p_escritorio uuid, p_caso uuid) returns jsonb
language sql stable
set search_path = public
as $$
  with ct as (
    select distinct cc.contrato_id id from caso_clientes cc
     where cc.caso_id = p_caso and cc.escritorio_id = p_escritorio and cc.contrato_id is not null
  ), ps as (
    select r.*, parcela_recebido(r.id) rec, k.nome cliente
      from recebimentos_previstos r
      join ct on ct.id = r.contrato_id
      join contratos c on c.id = r.contrato_id and c.estado in ('ATIVO', 'ENCERRADO')
      join clientes_escritorio k on k.id = c.cliente_id
     where r.cancelado_em is null
  ), dest as (
    select d.*, l.tipo, l.entrou_em from destinacoes d join levantamentos l on l.id = d.levantamento_id
     where l.caso_id = p_caso and l.escritorio_id = p_escritorio
  ), pend as (
    select 1 ordem, d.prazo dia, jsonb_build_object('tipo', 'REPASSE', 'para', d.para, 'nome', d.nome, 'valor', d.valor, 'prazo', d.prazo,
                                                   'levantamentoId', d.levantamento_id) j
      from dest d where d.feito_em is null and d.dispensado_em is null
    union all
    select 2, p.vencimento, jsonb_build_object('tipo', 'PARCELA', 'nome', p.cliente || ' · ' || p.descricao, 'valor', p.valor - p.rec,
                                               'vencimento', p.vencimento, 'contratoId', p.contrato_id)
      from ps p where p.valor is not null and p.rec < p.valor
    union all
    select 3, p.vencimento, jsonb_build_object('tipo', 'PARCELA_SEM_VALOR', 'nome', p.cliente || ' · ' || p.descricao, 'valor', null,
                                               'vencimento', p.vencimento, 'contratoId', p.contrato_id)
      from ps p where p.valor is null
    union all
    select 4, cp.vencimento, jsonb_build_object('tipo', 'REEMBOLSO', 'nome', cp.descricao, 'valor', coalesce(cp.valor_pago, cp.valor), 'contaId', cp.id)
      from contas_pagar cp where cp.escritorio_id = p_escritorio and cp.caso_id = p_caso and cp.reembolsado_em is null
       -- o que já está numa divisão de alvará pende lá, como repasse
       and not exists (select 1 from destinacoes d where d.conta_id = cp.id and d.dispensado_em is null)
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
    'fechado', (select jsonb_build_object('em', f.fechado_em, 'por', pessoa_ref(f.fechado_por)) from fechamentos_caso f where f.caso_id = p_caso))
$$;

-- O acerto, para a ficha do repasse.
create function portal_financeiro_caso_acerto(p_pessoa uuid, p_escritorio uuid, p_caso uuid) returns jsonb
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
  return caso_acerto(p_escritorio, p_caso);
end $$;

-- Encerrar: só com nada pendente; com pendência, recusa com a lista e os valores.
create function portal_financeiro_caso_encerrar(p_pessoa uuid, p_escritorio uuid, p_caso uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a jsonb;
  v_id uuid;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.editar');
  perform 1 from casos where id = p_caso and escritorio_id = p_escritorio for update;
  if not found then raise exception 'Caso não encontrado' using errcode = 'TC404'; end if;
  if exists (select 1 from fechamentos_caso where caso_id = p_caso) then
    perform recusar_motivo('Este caso já foi encerrado no financeiro', 'CASO_JA_ENCERRADO');
  end if;
  a := caso_acerto(p_escritorio, p_caso);
  if jsonb_array_length(a -> 'pendencias') > 0 then
    raise exception 'Ainda não dá para encerrar' using errcode = 'TC422',
      detail = jsonb_build_object('motivo', 'PENDENCIAS', 'pendencias', a -> 'pendencias', 'falta', a -> 'falta')::text;
  end if;
  insert into fechamentos_caso (escritorio_id, caso_id, fechado_por) values (p_escritorio, p_caso, p_pessoa) returning id into v_id;
  perform registrar_historico('financeiro.caso_encerrado', 'casos', p_caso::text,
    jsonb_build_object('entrou', a -> 'entrou', 'destinadoPago', a -> 'destinadoPago', 'parcelas', a -> 'parcelas'));
  return caso_acerto(p_escritorio, p_caso);
end $$;

call fechar_acesso();
