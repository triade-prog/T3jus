-- 0554 · RPV e precatório a caminho (F3.48, FI-09). Desenho aprovado em
-- docs/design/aprovadas/portal-comercial-financeiro-pendencias (estados rv-caminho, rv-registrar,
-- rv-registrado, rv-data, rv-entrou e rv-registrar-erros; decisão 6 da Carol, 21/11/2026).
-- - Registra o RPV ou precatório expedido, antes do dinheiro entrar, com a data estimada (mês).
-- - A parte do escritório sai do contrato na hora (os honorários de êxito da divisão proposta) e
--   fica guardada; é ela que entra na previsão do Caixa (0555). O resto é do cliente.
-- - Mudar a data pede o motivo; "não vai entrar" tira da previsão. A data anterior fica no histórico.
-- - "Entrou na conta" registra o levantamento pela rota aprovada e liga os dois na mesma transação.

create table requisicoes_a_caminho (
  id                 uuid primary key default gen_random_uuid(),
  escritorio_id      uuid not null references escritorios (id) on delete restrict,
  caso_id            uuid not null references casos (id) on delete restrict,
  cliente_id         uuid not null references clientes_escritorio (id) on delete restrict,
  contrato_id        uuid references contratos (id) on delete restrict,
  tipo               text not null check (tipo in ('RPV', 'PRECATORIO')),
  tribunal           text not null check (length(btrim(tribunal)) between 2 and 80),
  devedor            text not null check (length(btrim(devedor)) between 2 and 120),
  numero             text check (length(btrim(numero)) between 1 and 60),
  valor_requisitado  bigint not null check (valor_requisitado between 1 and 100000000000),
  parte_escritorio   bigint not null check (parte_escritorio >= 0),
  parte_regra        text,
  expedido_em        date not null,
  estimada_mes       date not null check (extract(day from estimada_mes) = 1),
  situacao           text not null default 'A_CAMINHO' check (situacao in ('A_CAMINHO', 'ENTROU', 'NAO_VAI_ENTRAR')),
  levantamento_id    uuid references levantamentos (id) on delete restrict,
  criado_por         uuid not null references pessoas (id) on delete restrict,
  criado_em          timestamptz not null default app_now(),
  check (estimada_mes >= date_trunc('month', expedido_em)::date),
  check ((situacao = 'ENTROU') = (levantamento_id is not null))
);
create index requisicoes_a_caminho_escritorio on requisicoes_a_caminho (escritorio_id, situacao, estimada_mes);
create unique index requisicoes_a_caminho_levantamento on requisicoes_a_caminho (levantamento_id) where levantamento_id is not null;
call proteger_tabela_escritorio('requisicoes_a_caminho');

-- Não se apaga. Só mudam a data estimada e a situação (uma vez, para ENTROU ou NAO_VAI_ENTRAR).
create function requisicoes_a_caminho_guardiao() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then raise exception 'A requisição não se apaga' using errcode = 'TC023'; end if;
  if old.situacao <> 'A_CAMINHO'
     or (to_jsonb(new) - 'estimada_mes' - 'situacao' - 'levantamento_id') is distinct from (to_jsonb(old) - 'estimada_mes' - 'situacao' - 'levantamento_id') then
    raise exception 'A requisição só muda a data, enquanto está a caminho' using errcode = 'TC023';
  end if;
  return new;
end $$;
create trigger requisicoes_a_caminho_guardiao before update or delete on requisicoes_a_caminho
  for each row execute function requisicoes_a_caminho_guardiao();

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('requisicoes_a_caminho', true, 'RPV e precatório expedidos de um cliente, antes de entrar: tribunal, quem paga, número, valor requisitado, parte do escritório e data estimada',
  'Prever o caixa do escritório e não perder o dinheiro que vai entrar (FI-09)', 'Execução de contrato (LGPD, art. 7º, V)',
  'Escritório', 'Enquanto o escritório for cliente do T3jus e 5 anos depois do fim do contrato', 'Exportadas ao escritório e apagadas com ele', 'APROVADO', true);

-- A linha da requisição para a tela. "passou" quando o mês estimado já ficou para trás.
create function requisicao_linha(r requisicoes_a_caminho) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', r.id, 'tipo', r.tipo, 'tribunal', r.tribunal, 'devedor', r.devedor, 'numero', r.numero,
    'valorRequisitado', r.valor_requisitado, 'parteEscritorio', r.parte_escritorio, 'parteRegra', r.parte_regra,
    'expedidoEm', r.expedido_em, 'estimadaMes', r.estimada_mes, 'situacao', r.situacao, 'levantamentoId', r.levantamento_id,
    'passou', r.situacao = 'A_CAMINHO' and r.estimada_mes < date_trunc('month', hoje_brasilia())::date,
    'criadoEm', r.criado_em,
    'caso', (select jsonb_build_object('id', c.id, 'nome', c.nome, 'parteContraria', c.parte_contraria) from casos c where c.id = r.caso_id),
    'cliente', (select jsonb_build_object('id', k.id, 'nome', k.nome) from clientes_escritorio k where k.id = r.cliente_id))
$$;

-- A parte do escritório pelo contrato: os honorários de êxito da divisão proposta para o valor requisitado.
create function requisicao_parte(p_escritorio uuid, p_caso uuid, p_cliente uuid, p_valor bigint) returns jsonb
language sql stable
set search_path = public
as $$
  with p as (select repasse_proposta(p_escritorio, p_caso, p_cliente, p_valor) j)
  select jsonb_build_object(
    'contratoId', p.j -> 'contrato' ->> 'id',
    'valor', coalesce((select sum((x ->> 'valor')::bigint) from jsonb_array_elements(p.j -> 'linhas') x where x ->> 'para' = 'HONORARIOS'), 0),
    'regra', (select split_part(x ->> 'regra', ' · ', 1) || ' de êxito' from jsonb_array_elements(p.j -> 'linhas') x where x ->> 'para' = 'HONORARIOS' limit 1))
  from p
$$;

-- Registrar o expedido.
create function portal_financeiro_requisicao_registrar(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e text[] := '{}';
  r requisicoes_a_caminho;
  v_caso uuid;
  v_cliente uuid;
  v_exp date := json_data(p_dados, 'expedidoEm');
  v_est date := json_data(p_dados, 'estimadaMes');
  v_valor bigint := json_inteiro(p_dados, 'valor');
  v_parte jsonb;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.editar');
  if coalesce(p_dados ->> 'tipo', '') not in ('RPV', 'PRECATORIO') then e := e || 'tipo'::text; end if;
  begin
    v_caso := (p_dados ->> 'casoId')::uuid;
    v_cliente := (p_dados ->> 'clienteId')::uuid;
  exception when invalid_text_representation then null;
  end;
  if v_caso is null or not exists (select 1 from casos where id = v_caso and escritorio_id = p_escritorio) then e := e || 'casoId'::text;
  elsif v_cliente is null or not exists (select 1 from caso_clientes where caso_id = v_caso and cliente_id = v_cliente) then e := e || 'clienteId'::text;
  end if;
  if char_length(btrim(coalesce(p_dados ->> 'tribunal', ''))) not between 2 and 80 then e := e || 'tribunal'::text; end if;
  if char_length(btrim(coalesce(p_dados ->> 'devedor', ''))) not between 2 and 120 then e := e || 'devedor'::text; end if;
  if char_length(btrim(coalesce(p_dados ->> 'numero', ''))) > 60 then e := e || 'numero'::text; end if;
  if coalesce(v_valor, 0) not between 1 and 100000000000 then e := e || 'valor'::text; end if;
  if v_exp is null or v_exp > hoje_brasilia() or v_exp < date '2000-01-01' then e := e || 'expedidoEm'::text; end if;
  if v_est is null or extract(day from v_est) <> 1 or (v_exp is not null and v_est < date_trunc('month', v_exp)::date)
     or v_est > (date_trunc('month', hoje_brasilia()) + interval '10 years')::date then
    e := e || 'estimadaMes'::text;
  end if;
  if cardinality(e) > 0 then perform recusar_campos('Confira o registro.', variadic e); end if;

  v_parte := requisicao_parte(p_escritorio, v_caso, v_cliente, v_valor);
  insert into requisicoes_a_caminho (escritorio_id, caso_id, cliente_id, contrato_id, tipo, tribunal, devedor, numero, valor_requisitado,
                                     parte_escritorio, parte_regra, expedido_em, estimada_mes, criado_por)
  values (p_escritorio, v_caso, v_cliente, (v_parte ->> 'contratoId')::uuid, p_dados ->> 'tipo', btrim(p_dados ->> 'tribunal'),
          btrim(p_dados ->> 'devedor'), nullif(btrim(coalesce(p_dados ->> 'numero', '')), ''), v_valor,
          (v_parte ->> 'valor')::bigint, v_parte ->> 'regra', v_exp, v_est, p_pessoa)
  returning * into r;
  perform registrar_historico('financeiro.requisicao_registrada', 'requisicoes_a_caminho', r.id::text,
    jsonb_build_object('tipo', r.tipo, 'valor', r.valor_requisitado, 'parte', r.parte_escritorio, 'estimada', r.estimada_mes));
  return requisicao_linha(r);
end $$;

-- Mudar a data estimada, ou registrar que não vai entrar. O motivo é obrigatório.
create function portal_financeiro_requisicao_data(p_pessoa uuid, p_escritorio uuid, p_requisicao uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r requisicoes_a_caminho;
  e text[] := '{}';
  v_vai boolean := coalesce(p_dados ->> 'situacao', 'A_CAMINHO') = 'A_CAMINHO';
  v_est date := json_data(p_dados, 'estimadaMes');
  v_motivo text := nullif(btrim(coalesce(p_dados ->> 'motivo', '')), '');
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.editar');
  select * into r from requisicoes_a_caminho where id = p_requisicao and escritorio_id = p_escritorio for update;
  if r.id is null then raise exception 'Requisição não encontrada' using errcode = 'TC404'; end if;
  if r.situacao <> 'A_CAMINHO' then perform recusar_motivo('Esta requisição já não está a caminho.', 'REQUISICAO_RESOLVIDA'); end if;
  if coalesce(p_dados ->> 'situacao', 'A_CAMINHO') not in ('A_CAMINHO', 'NAO_VAI_ENTRAR') then e := e || 'situacao'::text; end if;
  if v_vai and (v_est is null or extract(day from v_est) <> 1 or v_est < date_trunc('month', hoje_brasilia())::date
                or v_est > (date_trunc('month', hoje_brasilia()) + interval '10 years')::date) then
    e := e || 'estimadaMes'::text;
  end if;
  if v_motivo is null or char_length(v_motivo) not between 5 and 300 then e := e || 'motivo'::text; end if;
  if cardinality(e) > 0 then perform recusar_campos('Confira a mudança.', variadic e); end if;

  if v_vai then
    perform registrar_historico('financeiro.requisicao_data', 'requisicoes_a_caminho', r.id::text,
      jsonb_build_object('de', r.estimada_mes, 'para', v_est, 'motivo', v_motivo));
    update requisicoes_a_caminho set estimada_mes = v_est where id = r.id returning * into r;
  else
    update requisicoes_a_caminho set situacao = 'NAO_VAI_ENTRAR' where id = r.id returning * into r;
    perform registrar_historico('financeiro.requisicao_nao_vai', 'requisicoes_a_caminho', r.id::text,
      jsonb_build_object('de', r.estimada_mes, 'motivo', v_motivo));
  end if;
  return requisicao_linha(r);
end $$;

-- "Entrou na conta": registrar o levantamento como sempre e, com requisicaoId, ligar a requisição.
alter function portal_financeiro_levantamento_registrar(uuid, uuid, jsonb) rename to financeiro_levantamento_registrar_base;
create function portal_financeiro_levantamento_registrar(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb;
  r requisicoes_a_caminho;
  v_req uuid;
begin
  if nullif(p_dados ->> 'requisicaoId', '') is not null then
    begin
      v_req := (p_dados ->> 'requisicaoId')::uuid;
    exception when invalid_text_representation then
      perform recusar_campos('Confira a requisição.', 'requisicaoId');
    end;
  end if;
  v := financeiro_levantamento_registrar_base(p_pessoa, p_escritorio, p_dados - 'requisicaoId');
  if v_req is not null then
    select * into r from requisicoes_a_caminho where id = v_req and escritorio_id = p_escritorio for update;
    if r.id is null then raise exception 'Requisição não encontrada' using errcode = 'TC404'; end if;
    if r.situacao <> 'A_CAMINHO' then perform recusar_motivo('Esta requisição já não está a caminho.', 'REQUISICAO_RESOLVIDA'); end if;
    if r.caso_id::text <> p_dados ->> 'casoId' or r.cliente_id::text <> p_dados ->> 'clienteId' then
      perform recusar_campos('O levantamento é de outro caso ou cliente.', 'requisicaoId');
    end if;
    update requisicoes_a_caminho set situacao = 'ENTROU', levantamento_id = (v ->> 'id')::uuid where id = r.id;
    perform registrar_historico('financeiro.requisicao_entrou', 'requisicoes_a_caminho', r.id::text,
      jsonb_build_object('levantamento', v ->> 'id'));
  end if;
  return v;
end $$;

call fechar_acesso();
