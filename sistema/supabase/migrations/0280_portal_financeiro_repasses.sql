-- Financeiro do Portal, parte 3: Repasses (FI-05, FI-06, FI-12), tela aprovada em
-- docs/design/aprovadas/portal-financeiro (estados repasses, registrar-rpv, repasse e prestacao;
-- decisões 10 a 12 e perguntas 1 a 3, que a Carol aceitou como recomendadas).
-- - Alvará, RPV, precatório e depósito de acordo entram como valor de terceiros (levantamento),
--   separados do caixa do escritório. Só a parte do escritório passa para o caixa dele, quando é
--   transferida (FI-06).
-- - O sistema propõe a divisão pelo contrato do cliente no caso: honorários de êxito pelo
--   percentual do contrato, os reembolsos que o escritório adiantou para esse cliente com volta
--   "no levantamento", e o resto fica para o cliente. Parceiro, perito e outros entram à mão. A
--   soma tem de fechar com o valor levantado (conferido no banco). A parcela em atraso do cliente
--   nunca é descontada aqui sem o aceite dele (pergunta 3).
-- - Cada parte tem prazo: 3 dias úteis depois que o dinheiro entrou (pergunta 2). Feita, guarda o
--   dia e quem fez; dispensada, guarda o motivo. Nada some sem explicação.
-- - A prestação de contas é montada na tela a partir do registro; aqui só se guarda quando foi
--   enviada. O envio pelo WhatsApp do escritório e o "lida" vêm com Conversas (F3.44).
-- Ficam para depois: encerrar o caso no financeiro (F3.45), o prazo ajustável pela sócia dona e
-- o motivo do atraso de um repasse (F3.46), e o comprovante anexado (F3.22).

create table levantamentos (
  id             uuid primary key default gen_random_uuid(),
  escritorio_id  uuid not null references escritorios (id) on delete restrict,
  caso_id        uuid not null references casos (id) on delete restrict,
  cliente_id     uuid not null references clientes_escritorio (id) on delete restrict,
  tipo           text not null check (tipo in ('ALVARA', 'RPV', 'PRECATORIO', 'ACORDO')),
  valor          bigint not null check (valor between 1 and 100000000000),
  entrou_em      date not null,
  prestacao_em   timestamptz,
  prestacao_por  uuid references pessoas (id) on delete restrict,
  autor_id       uuid not null references pessoas (id) on delete restrict,
  criado_em      timestamptz not null default app_now(),
  check ((prestacao_em is null) = (prestacao_por is null))
);
create index levantamentos_escritorio on levantamentos (escritorio_id, entrou_em desc);
create index levantamentos_caso on levantamentos (caso_id);
call proteger_tabela_escritorio('levantamentos');

create table destinacoes (
  id               uuid primary key default gen_random_uuid(),
  escritorio_id    uuid not null references escritorios (id) on delete restrict,
  levantamento_id  uuid not null references levantamentos (id) on delete restrict,
  ordem            smallint not null check (ordem between 1 and 20),
  para             text not null check (para in ('CLIENTE', 'HONORARIOS', 'REEMBOLSO', 'PARCEIRO', 'PERITO', 'OUTRO')),
  nome             text not null check (length(btrim(nome)) between 2 and 120),
  regra            text check (length(btrim(regra)) between 2 and 200),
  valor            bigint not null check (valor between 1 and 100000000000),
  conta_id         uuid references contas_pagar (id) on delete restrict,
  prazo            date not null,
  feito_em         date,
  feito_por        uuid references pessoas (id) on delete restrict,
  dispensado_em    timestamptz,
  dispensa_motivo  text check (length(btrim(dispensa_motivo)) between 5 and 500),
  dispensado_por   uuid references pessoas (id) on delete restrict,
  check ((feito_em is null) = (feito_por is null)),
  check ((dispensado_em is null) = (dispensa_motivo is null) and (dispensado_em is null) = (dispensado_por is null)),
  check (feito_em is null or dispensado_em is null),
  check ((para = 'REEMBOLSO') = (conta_id is not null)),
  unique (levantamento_id, ordem)
);
create index destinacoes_levantamento on destinacoes (levantamento_id);
create unique index destinacoes_cliente_unico on destinacoes (levantamento_id) where para = 'CLIENTE';
create unique index destinacoes_conta_unica on destinacoes (conta_id) where conta_id is not null and dispensado_em is null;
call proteger_tabela_escritorio('destinacoes');

-- A soma das partes fecha com o valor levantado, conferida no fim da transação.
create function destinacoes_fecham() returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_lev uuid := coalesce(new.levantamento_id, old.levantamento_id);
  v_valor bigint;
  v_soma bigint;
begin
  select valor into v_valor from levantamentos where id = v_lev;
  select coalesce(sum(valor), 0) into v_soma from destinacoes where levantamento_id = v_lev;
  if v_valor is not null and v_soma <> v_valor then
    raise exception 'A divisão não fecha com o valor levantado' using errcode = 'TC422',
      detail = jsonb_build_object('motivo', 'DIVISAO_NAO_FECHA', 'campos', jsonb_build_array('divisao'), 'falta', v_valor - v_soma)::text;
  end if;
  return null;
end $$;
create constraint trigger destinacoes_fecham after insert or update or delete on destinacoes
  deferrable initially deferred for each row execute function destinacoes_fecham();

-- Levantamento e destinação não se apagam. No levantamento só a prestação de contas muda; na
-- destinação, só o feito ou a dispensa, uma vez.
create function levantamentos_guardiao() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then raise exception 'Levantamento não se apaga' using errcode = 'TC023'; end if;
  if (new.id, new.escritorio_id, new.caso_id, new.cliente_id, new.tipo, new.valor, new.entrou_em, new.autor_id, new.criado_em)
     is distinct from (old.id, old.escritorio_id, old.caso_id, old.cliente_id, old.tipo, old.valor, old.entrou_em, old.autor_id, old.criado_em) then
    raise exception 'O levantamento não muda depois de registrado' using errcode = 'TC023';
  end if;
  return new;
end $$;
create trigger levantamentos_guardiao before update or delete on levantamentos
  for each row execute function levantamentos_guardiao();

create function destinacoes_guardiao() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then raise exception 'Repasse não se apaga' using errcode = 'TC023'; end if;
  if old.feito_em is not null or old.dispensado_em is not null
     or (new.id, new.escritorio_id, new.levantamento_id, new.ordem, new.para, new.nome, new.regra, new.valor, new.conta_id, new.prazo)
        is distinct from (old.id, old.escritorio_id, old.levantamento_id, old.ordem, old.para, old.nome, old.regra, old.valor, old.conta_id, old.prazo) then
    raise exception 'O repasse só muda uma vez: feito ou dispensado' using errcode = 'TC023';
  end if;
  return new;
end $$;
create trigger destinacoes_guardiao before update or delete on destinacoes
  for each row execute function destinacoes_guardiao();

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('levantamentos', true, 'Valores de terceiros que entraram pelo escritório (alvará, RPV, precatório, acordo): caso, cliente, valor, dia e a prestação de contas',
  'Separar o dinheiro de terceiros e prestar contas ao cliente (FI-05, FI-06, FI-12)', 'Execução de contrato (LGPD, art. 7º, V) e obrigação legal (art. 7º, II)',
  'Escritório', 'Enquanto o escritório for cliente do T3jus e 5 anos depois do fim do contrato', 'Exportados ao escritório e apagados com ele', 'APROVADO', true),
 ('destinacoes', true, 'Para quem vai cada parte do valor levantado, quanto, até quando, e quando foi feito ou por que foi dispensado',
  'Repassar a cada um o que é dele, no prazo (FI-05)', 'Execução de contrato (LGPD, art. 7º, V) e obrigação legal (art. 7º, II)',
  'Escritório', 'Enquanto o escritório for cliente do T3jus e 5 anos depois do fim do contrato', 'Exportadas ao escritório e apagadas com ele', 'APROVADO', true);

-- Prazo do repasse: dias úteis contados de segunda a sexta (feriados ainda não entram).
create function somar_dias_uteis(p_dia date, p_dias integer) returns date
language plpgsql immutable
as $$
declare
  d date := p_dia;
  n integer := 0;
begin
  while n < p_dias loop
    d := d + 1;
    if extract(isodow from d) < 6 then n := n + 1; end if;
  end loop;
  return d;
end $$;

create function prazo_repasse_dias() returns integer
language sql immutable
as $$ select 3 $$;

-- O escritório recebe os honorários e os reembolsos; os demais são de terceiros.
create function destinacao_do_escritorio(p_para text) returns boolean
language sql immutable
as $$ select p_para in ('HONORARIOS', 'REEMBOLSO') $$;

create function destinacao_linha(d destinacoes) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', d.id, 'para', d.para, 'nome', d.nome, 'regra', d.regra, 'valor', d.valor, 'prazo', d.prazo,
    'escritorio', destinacao_do_escritorio(d.para),
    'situacao', case when d.feito_em is not null then 'FEITO' when d.dispensado_em is not null then 'DISPENSADO' else 'PENDENTE' end,
    'feitoEm', d.feito_em, 'feitoPor', case when d.feito_por is not null then pessoa_ref(d.feito_por) end,
    'dispensa', case when d.dispensado_em is not null then jsonb_build_object('motivo', d.dispensa_motivo, 'em', d.dispensado_em, 'por', pessoa_ref(d.dispensado_por)) end,
    'contaId', d.conta_id)
$$;

create function levantamento_linha(l levantamentos) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', l.id, 'tipo', l.tipo, 'valor', l.valor, 'entrouEm', l.entrou_em, 'criadoEm', l.criado_em, 'autor', pessoa_ref(l.autor_id),
    'prestacaoEm', l.prestacao_em, 'prestacaoPor', case when l.prestacao_por is not null then pessoa_ref(l.prestacao_por) end,
    'caso', (select jsonb_build_object('id', c.id, 'nome', c.nome, 'parteContraria', c.parte_contraria, 'area', c.area) from casos c where c.id = l.caso_id),
    'cliente', (select jsonb_build_object('id', k.id, 'nome', k.nome, 'telefone', contato_principal(k.contatos) ->> 'telefone')
                  from clientes_escritorio k where k.id = l.cliente_id),
    'feitos', (select count(*) from destinacoes d where d.levantamento_id = l.id and (d.feito_em is not null or d.dispensado_em is not null)),
    'total', (select count(*) from destinacoes d where d.levantamento_id = l.id),
    'destinacoes', coalesce((select jsonb_agg(destinacao_linha(d) order by d.ordem) from destinacoes d where d.levantamento_id = l.id), '[]'::jsonb))
$$;

create function levantamento_aberto(l levantamentos) returns boolean
language sql stable
set search_path = public
as $$ select exists (select 1 from destinacoes d where d.levantamento_id = l.id and d.feito_em is null and d.dispensado_em is null) $$;

-- A página de Repasses: os números do alto, os blocos com algo pendente (do mais antigo), o que
-- foi repassado no mês e os casos com clientes, para registrar um levantamento.
create function portal_financeiro_repasses(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hoje date := hoje_brasilia();
  v_mes date := date_trunc('month', v_hoje)::date;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.ver');
  return jsonb_build_object(
    'hoje', v_hoje,
    'prazoDias', prazo_repasse_dias(),
    'algum', exists (select 1 from levantamentos where escritorio_id = p_escritorio),
    'totais', (select jsonb_build_object(
        'aRepassar', coalesce(sum(d.valor) filter (where not destinacao_do_escritorio(d.para)), 0),
        'repassesPendentes', count(*) filter (where not destinacao_do_escritorio(d.para)),
        'honorarios', coalesce(sum(d.valor) filter (where destinacao_do_escritorio(d.para)), 0),
        'casos', count(distinct l.caso_id))
      from destinacoes d join levantamentos l on l.id = d.levantamento_id
      where d.escritorio_id = p_escritorio and d.feito_em is null and d.dispensado_em is null),
    'repassadoMes', (select jsonb_build_object('valor', coalesce(sum(d.valor), 0), 'clientes', count(distinct l.cliente_id))
      from destinacoes d join levantamentos l on l.id = d.levantamento_id
      where d.escritorio_id = p_escritorio and d.para = 'CLIENTE' and d.feito_em >= v_mes),
    'repassados', coalesce((select jsonb_agg(jsonb_build_object('levantamentoId', l.id, 'cliente', d.nome, 'tipo', l.tipo, 'valor', d.valor, 'feitoEm', d.feito_em)
                                     order by d.feito_em desc, d.id)
      from destinacoes d join levantamentos l on l.id = d.levantamento_id
      where d.escritorio_id = p_escritorio and d.para = 'CLIENTE' and d.feito_em >= v_mes), '[]'::jsonb),
    'levantamentos', coalesce((select jsonb_agg(levantamento_linha(l) order by l.entrou_em, l.criado_em)
      from levantamentos l where l.escritorio_id = p_escritorio and levantamento_aberto(l)), '[]'::jsonb),
    'casos', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'nome', c.nome, 'parteContraria', c.parte_contraria,
                         'clientes', (select jsonb_agg(jsonb_build_object('id', k.id, 'nome', k.nome) order by cc.ordem)
                                        from caso_clientes cc join clientes_escritorio k on k.id = cc.cliente_id where cc.caso_id = c.id))
                       order by c.nome)
      from casos c where c.escritorio_id = p_escritorio), '[]'::jsonb));
end $$;

-- Um repasse por dentro.
create function portal_financeiro_repasse(p_pessoa uuid, p_escritorio uuid, p_levantamento uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare l levantamentos;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.ver');
  select * into l from levantamentos where id = p_levantamento and escritorio_id = p_escritorio;
  if l.id is null then raise exception 'Repasse não encontrado' using errcode = 'TC404'; end if;
  return levantamento_linha(l) || jsonb_build_object(
    'hoje', hoje_brasilia(),
    'escritorio', (select nome from escritorios where id = p_escritorio),
    'historico', coalesce((select jsonb_agg(jsonb_build_object('acao', h.acao, 'em', h.ocorrido_em, 'por', pessoa_ref(h.autor_id), 'dados', h.dados)
                                            order by h.ocorrido_em desc, h.id desc)
      from historico h where h.escritorio_id = p_escritorio and h.entidade = 'levantamentos' and h.entidade_id = l.id::text), '[]'::jsonb));
end $$;

-- A divisão proposta pelo contrato do cliente no caso.
create function repasse_proposta(p_escritorio uuid, p_caso uuid, p_cliente uuid, p_valor bigint) returns jsonb
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

create function levantamento_erros(p_escritorio uuid, d jsonb) returns text[]
language plpgsql stable
set search_path = public
as $$
declare
  e text[] := '{}';
  v_caso uuid;
  v_cliente uuid;
  v_entrou date := json_data(d, 'entrouEm');
begin
  if coalesce(d ->> 'tipo', '') not in ('ALVARA', 'RPV', 'PRECATORIO', 'ACORDO') then e := e || 'tipo'::text; end if;
  begin
    v_caso := (d ->> 'casoId')::uuid;
    v_cliente := (d ->> 'clienteId')::uuid;
  exception when invalid_text_representation then
    null;
  end;
  if v_caso is null or not exists (select 1 from casos where id = v_caso and escritorio_id = p_escritorio) then e := e || 'casoId'::text;
  elsif v_cliente is null or not exists (select 1 from caso_clientes where caso_id = v_caso and cliente_id = v_cliente) then e := e || 'clienteId'::text;
  end if;
  if coalesce(json_inteiro(d, 'valor'), 0) not between 1 and 100000000000 then e := e || 'valor'::text; end if;
  if v_entrou is null or v_entrou > hoje_brasilia() or v_entrou < date '2000-01-01' then e := e || 'entrouEm'::text; end if;
  return e;
end $$;

-- Prévia da divisão, para a janela de registrar.
create function portal_financeiro_repasse_proposta(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare e text[];
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.ver');
  e := array(select x from unnest(levantamento_erros(p_escritorio, p_dados)) x where x in ('casoId', 'clienteId', 'valor'));
  if cardinality(e) > 0 then perform recusar_campos('Confira o caso, o cliente e o valor.', variadic e); end if;
  return repasse_proposta(p_escritorio, (p_dados ->> 'casoId')::uuid, (p_dados ->> 'clienteId')::uuid, (p_dados ->> 'valor')::bigint);
end $$;

-- Registrar: o levantamento e cada parte. A linha do cliente vem da tela, e a soma é conferida.
create function portal_financeiro_levantamento_registrar(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e text[];
  l levantamentos;
  v_div jsonb := coalesce(p_dados -> 'divisao', '[]'::jsonb);
  v_prazo date;
  v_ordem integer := 0;
  v_conta uuid;
  x jsonb;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.editar');
  e := levantamento_erros(p_escritorio, p_dados);
  if jsonb_typeof(v_div) <> 'array' or jsonb_array_length(v_div) not between 1 and 20
     or (select count(*) from jsonb_array_elements(v_div) y where y ->> 'para' = 'CLIENTE') <> 1 then
    e := e || 'divisao'::text;
  end if;
  if cardinality(e) > 0 then perform recusar_campos('Confira o registro.', variadic e); end if;

  insert into levantamentos (escritorio_id, caso_id, cliente_id, tipo, valor, entrou_em, autor_id)
  values (p_escritorio, (p_dados ->> 'casoId')::uuid, (p_dados ->> 'clienteId')::uuid, p_dados ->> 'tipo',
          (p_dados ->> 'valor')::bigint, json_data(p_dados, 'entrouEm'), p_pessoa)
  returning * into l;
  v_prazo := somar_dias_uteis(l.entrou_em, prazo_repasse_dias());

  for x in select * from jsonb_array_elements(v_div) loop
    v_ordem := v_ordem + 1;
    v_conta := null;
    if x ->> 'para' = 'REEMBOLSO' then
      begin
        v_conta := (x ->> 'contaId')::uuid;
      exception when invalid_text_representation then
        v_conta := null;
      end;
      if v_conta is null or not exists (select 1 from contas_pagar where id = v_conta and escritorio_id = p_escritorio
                                          and cliente_id = l.cliente_id and reembolsado_em is null) then
        perform recusar_campos('Este reembolso não é deste cliente ou já foi pago', 'divisao');
      end if;
    end if;
    begin
      insert into destinacoes (escritorio_id, levantamento_id, ordem, para, nome, regra, valor, conta_id, prazo)
      values (p_escritorio, l.id, v_ordem, x ->> 'para',
              btrim(case when x ->> 'para' = 'CLIENTE' then (select nome from clientes_escritorio where id = l.cliente_id) else x ->> 'nome' end),
              nullif(btrim(coalesce(x ->> 'regra', '')), ''), json_inteiro(x, 'valor'), v_conta, v_prazo);
    exception when check_violation or not_null_violation or unique_violation then
      perform recusar_campos('Confira cada parte da divisão', 'divisao');
    end;
  end loop;

  -- A soma é conferida aqui também, para o erro sair com o campo antes do fim da transação.
  if (select sum(valor) from destinacoes where levantamento_id = l.id) <> l.valor then
    raise exception 'A divisão não fecha com o valor levantado' using errcode = 'TC422',
      detail = jsonb_build_object('motivo', 'DIVISAO_NAO_FECHA', 'campos', jsonb_build_array('divisao'),
                                  'falta', l.valor - (select sum(valor) from destinacoes where levantamento_id = l.id))::text;
  end if;

  perform registrar_historico('financeiro.levantamento', 'levantamentos', l.id::text,
    jsonb_build_object('tipo', l.tipo, 'valor', l.valor, 'entrouEm', l.entrou_em, 'caso', l.caso_id, 'partes', v_ordem,
                       'seguiuProposta', repasse_proposta(p_escritorio, l.caso_id, l.cliente_id, l.valor) -> 'linhas' = (
                         select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('para', d.para, 'nome', d.nome, 'regra', d.regra, 'valor', d.valor, 'contaId', d.conta_id)) order by d.ordem), '[]'::jsonb)
                           from destinacoes d where d.levantamento_id = l.id and d.para <> 'CLIENTE')));
  return jsonb_build_object('id', l.id);
end $$;

create function destinacao_aberta(p_pessoa uuid, p_escritorio uuid, p_destinacao uuid) returns destinacoes
language plpgsql
set search_path = public
as $$
declare d destinacoes;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.editar');
  select * into d from destinacoes where id = p_destinacao and escritorio_id = p_escritorio for update;
  if d.id is null then raise exception 'Repasse não encontrado' using errcode = 'TC404'; end if;
  if d.feito_em is not null or d.dispensado_em is not null then
    perform recusar_motivo('Este repasse já foi resolvido. Recarregue a página.', 'REPASSE_JA_RESOLVIDO');
  end if;
  return d;
end $$;

-- Feito: o dia em que o dinheiro saiu. Reembolso feito marca a conta como reembolsada.
create function portal_financeiro_destinacao_feita(p_pessoa uuid, p_escritorio uuid, p_destinacao uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  d destinacoes;
  l levantamentos;
  v_dia date := json_data(p_dados, 'feitoEm');
begin
  d := destinacao_aberta(p_pessoa, p_escritorio, p_destinacao);
  select * into l from levantamentos where id = d.levantamento_id;
  if v_dia is null or v_dia < l.entrou_em then perform recusar_campos('Confira o dia', 'feitoEm'); end if;
  if v_dia > hoje_brasilia() then
    raise exception 'O dia não pode ser depois de hoje' using errcode = 'TC422',
      detail = jsonb_build_object('motivo', 'DATA_NO_FUTURO', 'campos', jsonb_build_array('feitoEm'))::text;
  end if;
  update destinacoes set feito_em = v_dia, feito_por = p_pessoa where id = d.id returning * into d;
  if d.conta_id is not null then
    update contas_pagar set reembolsado_em = v_dia where id = d.conta_id and reembolsado_em is null;
  end if;
  perform registrar_historico('financeiro.repasse_feito', 'levantamentos', l.id::text,
    jsonb_build_object('destinacao', d.id, 'para', d.para, 'valor', d.valor, 'feitoEm', v_dia));
  return destinacao_linha(d);
end $$;

-- Dispensado: com o motivo, para nada sumir sem explicação.
create function portal_financeiro_destinacao_dispensar(p_pessoa uuid, p_escritorio uuid, p_destinacao uuid, p_motivo text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare d destinacoes;
begin
  d := destinacao_aberta(p_pessoa, p_escritorio, p_destinacao);
  if d.para = 'CLIENTE' then
    perform recusar_motivo('O que é do cliente não se dispensa', 'CLIENTE_NAO_DISPENSA');
  end if;
  if length(btrim(coalesce(p_motivo, ''))) < 5 then perform recusar_motivo('Escreva o motivo', 'MOTIVO_OBRIGATORIO'); end if;
  update destinacoes set dispensado_em = app_now(), dispensa_motivo = btrim(p_motivo), dispensado_por = p_pessoa where id = d.id returning * into d;
  perform registrar_historico('financeiro.repasse_dispensado', 'levantamentos', d.levantamento_id::text,
    jsonb_build_object('destinacao', d.id, 'para', d.para, 'valor', d.valor, 'motivo', d.dispensa_motivo));
  return destinacao_linha(d);
end $$;

-- A prestação de contas foi enviada (por enquanto pelo WhatsApp do aparelho).
create function portal_financeiro_prestacao_enviada(p_pessoa uuid, p_escritorio uuid, p_levantamento uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare l levantamentos;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.editar');
  select * into l from levantamentos where id = p_levantamento and escritorio_id = p_escritorio for update;
  if l.id is null then raise exception 'Repasse não encontrado' using errcode = 'TC404'; end if;
  update levantamentos set prestacao_em = app_now(), prestacao_por = p_pessoa where id = l.id returning * into l;
  perform registrar_historico('financeiro.prestacao_enviada', 'levantamentos', l.id::text, '{}'::jsonb);
  return jsonb_build_object('id', l.id, 'prestacaoEm', l.prestacao_em);
end $$;

call fechar_acesso();
