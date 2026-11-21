-- O êxito para conferir (F3.14: CH-07, EX-08) e o reembolso junto da parcela (F3.85: FI-07), pelo
-- desenho aprovado em docs/design/aprovadas/portal-exito-conferir (Carol, 21/11/2026, com as
-- recomendações das 4 perguntas):
-- - ao encerrar o caso com Ganho ou Acordo, o Jurídico informa o valor de cada cliente e a data
--   prevista do pagamento (estado etapa-final do Jurídico aprovado); o T3jus calcula o êxito pelo
--   contrato de cada cliente e o manda ao Financeiro "para conferir" (uma linha por cliente);
-- - quem tem o Financeiro confere: lança a parcela do êxito em A receber (sempre, mesmo que o
--   dinheiro venha por alvará: decisão 1) ou não cobra, com motivo e explicação;
-- - o êxito para conferir não entra nos números do alto do A receber (decisão 2);
-- - mudar o valor calculado só pede o motivo, que fica no histórico, e avisa no sino quem
--   encerrou o caso e o responsável pelo caso (decisão 3);
-- - o reembolso que volta "junto com a próxima parcela" aparece na parcela e pode ser registrado
--   junto com ela, mas nunca é marcado como pago sozinho (decisão 4);
-- - o caso só se encerra no financeiro sem êxito esperando conferência.

-- ---------------------------------------------------------------------------------------
-- Tabelas.

create table exitos_conferir (
  id                 uuid primary key default gen_random_uuid(),
  escritorio_id      uuid not null references escritorios (id) on delete restrict,
  caso_id            uuid not null references casos (id) on delete restrict,
  etapa_mudanca_id   uuid not null references caso_etapa_mudancas (id) on delete restrict,
  cliente_id         uuid not null references clientes_escritorio (id) on delete restrict,
  contrato_id        uuid not null references contratos (id) on delete restrict,
  condicao_id        uuid not null references honorario_condicoes (id) on delete restrict,
  base               bigint not null check (base between 1 and 100000000000000),
  percentual         integer not null check (percentual between 1 and 10000),
  sobre              text not null check (length(sobre) between 1 and 120),
  calculado          bigint not null check (calculado between 1 and 100000000000000),
  previsto_em        date not null,
  situacao           text not null default 'PARA_CONFERIR' check (situacao in ('PARA_CONFERIR', 'LANCADO', 'NAO_COBRADO')),
  valor_lancado      bigint check (valor_lancado between 1 and 10000000000),
  vencimento         date,
  motivo_ajuste      text check (length(btrim(motivo_ajuste)) between 3 and 500),
  motivo_nao_cobrar  text check (motivo_nao_cobrar in ('PERDOADO', 'INDEVIDO', 'OUTRO')),
  explicacao         text check (length(btrim(explicacao)) between 3 and 1000),
  recebimento_id     uuid,
  conferido_por      uuid references pessoas (id) on delete restrict,
  conferido_em       timestamptz,
  criado_em          timestamptz not null default app_now(),
  unique (caso_id, cliente_id),
  check ((situacao = 'PARA_CONFERIR') = (conferido_em is null)),
  check ((conferido_em is null) = (conferido_por is null)),
  check ((situacao = 'LANCADO') = (valor_lancado is not null and vencimento is not null and recebimento_id is not null)),
  check (situacao <> 'LANCADO' or valor_lancado = calculado or motivo_ajuste is not null),
  check ((situacao = 'NAO_COBRADO') = (motivo_nao_cobrar is not null and explicacao is not null))
);
create index exitos_conferir_situacao on exitos_conferir (escritorio_id, situacao);
call proteger_tabela_escritorio('exitos_conferir');

-- A parcela do êxito nasce na conferência, ligada ao êxito.
alter table recebimentos_previstos drop constraint recebimentos_previstos_origem_check;
alter table recebimentos_previstos add constraint recebimentos_previstos_origem_check check (origem in ('PROGRAMADO', 'BASE', 'ENCERRAMENTO'));
alter table recebimentos_previstos add column exito_id uuid unique references exitos_conferir (id) on delete restrict;
alter table recebimentos_previstos add check ((origem = 'ENCERRAMENTO') = (exito_id is not null));
alter table exitos_conferir add foreign key (recebimento_id) references recebimentos_previstos (id) on delete restrict;

-- O êxito nasce para conferir e é conferido uma vez só; nada se apaga.
create function exitos_conferir_guardiao() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' or old.situacao <> 'PARA_CONFERIR'
     or (to_jsonb(new) - array['situacao', 'valor_lancado', 'vencimento', 'motivo_ajuste', 'motivo_nao_cobrar', 'explicacao',
                               'recebimento_id', 'conferido_por', 'conferido_em'])
        <> (to_jsonb(old) - array['situacao', 'valor_lancado', 'vencimento', 'motivo_ajuste', 'motivo_nao_cobrar', 'explicacao',
                                  'recebimento_id', 'conferido_por', 'conferido_em']) then
    raise exception 'O êxito só é conferido uma vez e não se apaga' using errcode = 'TC023';
  end if;
  return new;
end $$;
create trigger exitos_conferir_guardiao before update or delete on exitos_conferir
  for each row execute function exitos_conferir_guardiao();

-- O reembolso registrado junto com a parcela (decisão 4: só quando alguém diz). Só inserção.
create table reembolsos_recebidos (
  id             uuid primary key default gen_random_uuid(),
  escritorio_id  uuid not null references escritorios (id) on delete restrict,
  conta_id       uuid not null unique references contas_pagar (id) on delete restrict,
  parcela_id     uuid not null references recebimentos_previstos (id) on delete restrict,
  pagamento_id   uuid not null references pagamentos_recebidos (id) on delete restrict,
  valor          bigint not null check (valor between 1 and 10000000000),
  forma          text not null check (forma_pagamento_valida(forma)),
  recebido_em    date not null,
  autor_id       uuid not null references pessoas (id) on delete restrict,
  criado_em      timestamptz not null default app_now()
);
create index reembolsos_recebidos_parcela on reembolsos_recebidos (escritorio_id, parcela_id);
call proteger_tabela_escritorio('reembolsos_recebidos');
create trigger reembolsos_recebidos_so_acrescenta before update or delete on reembolsos_recebidos
  for each row execute function financeiro_so_acrescenta();

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('exitos_conferir', true, 'O êxito calculado no encerramento do caso, por cliente: o valor do cliente, o percentual, o calculado e a conferência (lançado ou não cobrado, com motivo)',
  'Cobrar o honorário de êxito combinado em contrato depois de conferido (CH-07, EX-08)', 'Execução de contrato (LGPD, art. 7º, V)',
  'Escritório', 'Enquanto o escritório for cliente do T3jus e 5 anos depois do fim do contrato', 'Exportados ao escritório e apagados com ele', 'APROVADO', true),
 ('reembolsos_recebidos', false, 'O reembolso de despesa adiantada pago junto com a parcela: valor, forma, dia e quem registrou', null, null, null, null, null, null, true);

-- O sino passa a aceitar os avisos do êxito (a lista é a que existe mais as novas).
do $$
declare
  v_tipos text[];
  v_origens text[];
begin
  select array_agg(distinct x) into v_tipos from (
    select unnest(regexp_matches(pg_get_constraintdef(oid), '''([A-Z0-9_]+)''', 'g')) x
      from pg_constraint where conrelid = 'avisos_sino'::regclass and conname = 'avisos_sino_tipo_check'
    union select 'EXITO_VALOR_MUDOU' union select 'EXITO_NAO_COBRADO') t;
  select array_agg(distinct x) into v_origens from (
    select unnest(regexp_matches(pg_get_constraintdef(oid), '''([a-z0-9_]+)''', 'g')) x
      from pg_constraint where conrelid = 'avisos_sino'::regclass and conname = 'avisos_sino_origem_tabela_check'
    union select 'casos') t;
  alter table avisos_sino drop constraint avisos_sino_tipo_check;
  execute format('alter table avisos_sino add constraint avisos_sino_tipo_check check (tipo in (%s))',
                 (select string_agg(quote_literal(x), ', ' order by x) from unnest(v_tipos) x));
  alter table avisos_sino drop constraint avisos_sino_origem_tabela_check;
  execute format('alter table avisos_sino add constraint avisos_sino_origem_tabela_check check (origem_tabela in (%s))',
                 (select string_agg(quote_literal(x), ', ' order by x) from unnest(v_origens) x));
end $$;

-- ---------------------------------------------------------------------------------------
-- Encerrar o caso com o valor de cada cliente (estado etapa-final do Jurídico aprovado).

alter function portal_juridico_caso_etapa(uuid, uuid, uuid, integer, jsonb) rename to juridico_caso_etapa_sem_exito;

-- O êxito de um cliente: o percentual da condição de êxito do contrato sobre o valor dele.
create function exito_calcular(p_base bigint, p_percentual integer) returns bigint
language sql immutable
as $$ select round(p_base::numeric * p_percentual / 10000)::bigint $$;

create function portal_juridico_caso_etapa(p_pessoa uuid, p_escritorio uuid, p_caso uuid, p_versao integer, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_etapa uuid;
  v_final boolean;
  v_resultado text := nullif(p_dados ->> 'resultado', '');
  v_previsto date := json_data(p_dados, 'previstoEm');
  v_valores jsonb := coalesce(p_dados -> 'valores', '{}'::jsonb);
  v_com_valor boolean;
  v_faltam text[] := '{}';
  v_campos text[] := '{}';
  v_motivo text;
  v_detalhe_txt text;
  v_detalhe jsonb;
  v_mudanca uuid;
  v_encerrado date;
  r jsonb;
  k record;
  v_base bigint;
  v_n integer := 0;
begin
  begin v_etapa := nullif(p_dados ->> 'etapaId', '')::uuid; exception when others then v_etapa := null; end;
  select final into v_final from etapas where id = v_etapa and escritorio_id = p_escritorio;
  v_com_valor := coalesce(v_final, false) and v_resultado in ('GANHO', 'ACORDO');
  if v_com_valor then
    if jsonb_typeof(v_valores) <> 'object' then v_valores := '{}'::jsonb; end if;
    -- Cada cliente com contrato ligado ao caso informa o valor dele.
    for k in select cc.cliente_id from caso_clientes cc
              where cc.caso_id = p_caso and cc.escritorio_id = p_escritorio and cc.contrato_id is not null order by cc.ordem loop
      if coalesce(json_inteiro(v_valores, k.cliente_id::text), 0) not between 1 and 100000000000000 then
        v_faltam := v_faltam || k.cliente_id::text;
      end if;
    end loop;
    if cardinality(v_faltam) > 0 then v_campos := v_campos || 'valores'::text; end if;
    -- A data prevista do pagamento, quando algum cliente tem contrato (é dela que sai a cobrança).
    if exists (select 1 from caso_clientes cc where cc.caso_id = p_caso and cc.escritorio_id = p_escritorio and cc.contrato_id is not null)
       and (v_previsto is null or v_previsto < date '2000-01-01') then
      v_campos := v_campos || 'previstoEm'::text;
    end if;
  end if;

  -- As regras de sempre; os erros dos dois lados saem juntos, e nada fica gravado.
  begin
    r := juridico_caso_etapa_sem_exito(p_pessoa, p_escritorio, p_caso, p_versao, p_dados);
  exception when sqlstate 'TC422' then
    get stacked diagnostics v_motivo = message_text, v_detalhe_txt = pg_exception_detail;
    v_detalhe := nullif(v_detalhe_txt, '')::jsonb;
    if cardinality(v_campos) = 0 then raise; end if;
    raise exception '%', v_motivo using errcode = 'TC422',
      detail = (coalesce(v_detalhe, '{}'::jsonb) || jsonb_build_object(
        'campos', (select jsonb_agg(distinct v order by v) from (select jsonb_array_elements_text(coalesce(v_detalhe -> 'campos', '[]'::jsonb)) v
                                                                 union select unnest(v_campos)) x),
        'clientes', to_jsonb(v_faltam)))::text;
  end;
  if cardinality(v_campos) > 0 then
    raise exception 'Confira os valores do encerramento' using errcode = 'TC422',
      detail = jsonb_build_object('motivo', 'VALOR_OBRIGATORIO', 'campos', (select jsonb_agg(v order by v) from unnest(v_campos) v),
                                  'clientes', to_jsonb(v_faltam))::text;
  end if;
  if not v_com_valor then return r; end if;

  -- O êxito de cada cliente cujo contrato tem condição de êxito vai para conferir.
  select m.id, (m.em at time zone 'America/Sao_Paulo')::date into v_mudanca, v_encerrado
    from caso_etapa_mudancas m where m.caso_id = p_caso order by m.ordem desc limit 1;
  for k in select cc.cliente_id, cc.contrato_id, h.id condicao_id, (h.params ->> 'percentual')::integer percentual,
                  coalesce(h.params ->> 'sobre', 'o valor do cliente') sobre, coalesce(json_inteiro(h.params, 'dias'), 0)::integer dias
             from caso_clientes cc
             join contratos c on c.id = cc.contrato_id and c.estado in ('ATIVO', 'ENCERRADO')
             join honorario_condicoes h on h.dono_tipo = 'CONTRATO' and h.dono_id = c.id and h.tipo = 'EXITO'
            where cc.caso_id = p_caso and cc.escritorio_id = p_escritorio order by cc.ordem loop
    v_base := json_inteiro(v_valores, k.cliente_id::text);
    continue when coalesce(exito_calcular(v_base, k.percentual), 0) < 1;
    insert into exitos_conferir (escritorio_id, caso_id, etapa_mudanca_id, cliente_id, contrato_id, condicao_id, base, percentual, sobre,
                                 calculado, previsto_em)
    values (p_escritorio, p_caso, v_mudanca, k.cliente_id, k.contrato_id, k.condicao_id, v_base, k.percentual, left(k.sobre, 120),
            exito_calcular(v_base, k.percentual), greatest(v_previsto, v_encerrado + k.dias));
    v_n := v_n + 1;
  end loop;
  perform registrar_historico('juridico.valores_encerramento', 'casos', p_caso::text,
    jsonb_build_object('valores', v_valores, 'previstoEm', v_previsto, 'exitos', v_n));
  return r || jsonb_build_object('exitos', v_n);
end $$;

-- ---------------------------------------------------------------------------------------
-- O êxito no Financeiro.

create function exito_linha(x exitos_conferir) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', x.id, 'situacao', x.situacao,
    'cliente', (select jsonb_build_object('id', k.id, 'nome', k.nome) from clientes_escritorio k where k.id = x.cliente_id),
    'caso', (select jsonb_build_object('id', s.id, 'nome', s.nome, 'numero', s.numero_cnj, 'resultado', s.resultado) from casos s where s.id = x.caso_id),
    'contrato', (select jsonb_build_object('id', c.id, 'numero', c.numero, 'assinadoEm', c.assinado_em, 'responsavel', pessoa_ref(c.responsavel_id))
                   from contratos c where c.id = x.contrato_id),
    'base', x.base, 'percentual', x.percentual, 'sobre', x.sobre, 'calculado', x.calculado, 'previstoEm', x.previsto_em,
    'encerrado', (select jsonb_build_object('por', pessoa_ref(m.por), 'em', m.em, 'motivo', m.motivo) from caso_etapa_mudancas m where m.id = x.etapa_mudanca_id),
    'valorLancado', x.valor_lancado, 'vencimento', x.vencimento, 'motivoAjuste', x.motivo_ajuste,
    'motivoNaoCobrar', x.motivo_nao_cobrar, 'explicacao', x.explicacao, 'recebimentoId', x.recebimento_id,
    'conferido', case when x.conferido_em is not null then jsonb_build_object('por', pessoa_ref(x.conferido_por), 'em', x.conferido_em) end)
$$;

-- O bloco "Êxito para conferir" do alto do A receber (decisão 2: fora dos números do alto).
create function portal_financeiro_exitos(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.ver');
  return (
    select jsonb_build_object(
      'total', coalesce(sum(x.calculado), 0), 'n', count(*),
      'itens', coalesce(jsonb_agg(exito_linha(x) order by x.previsto_em, x.criado_em, x.id), '[]'::jsonb))
      from exitos_conferir x where x.escritorio_id = p_escritorio and x.situacao = 'PARA_CONFERIR');
end $$;

-- Avisa no sino quem encerrou o caso e o responsável pelo caso (decisão 3).
create function exito_avisar(x exitos_conferir, p_autor uuid, p_tipo text, p_dados jsonb) returns void
language plpgsql
set search_path = public
as $$
declare
  d uuid;
  v jsonb;
begin
  v := jsonb_build_object('cliente', (select nome from clientes_escritorio where id = x.cliente_id),
                          'caso', (select nome from casos where id = x.caso_id),
                          'quem', (select nome from pessoas where id = p_autor),
                          'calculado', x.calculado) || p_dados;
  for d in select distinct p from (
             select m.por p from caso_etapa_mudancas m where m.id = x.etapa_mudanca_id
             union select s.responsavel_id from casos s where s.id = x.caso_id) t loop
    perform aviso_sino(x.escritorio_id, d, p_autor, p_tipo, 'casos', x.caso_id, v);
  end loop;
end $$;

-- Conferir e lançar em A receber (decisão 1: sempre que for cobrar, mesmo se vier por alvará).
create function portal_financeiro_exito_lancar(p_pessoa uuid, p_escritorio uuid, p_id uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  x exitos_conferir;
  v_valor bigint := json_inteiro(p_dados, 'valor');
  v_venc date := json_data(p_dados, 'vencimento');
  v_forma text := nullif(p_dados ->> 'forma', '');
  v_motivo text := nullif(btrim(coalesce(p_dados ->> 'motivoAjuste', '')), '');
  v_caso casos;
  v_parcela uuid;
  e text[] := '{}';
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.editar');
  select * into x from exitos_conferir where id = p_id and escritorio_id = p_escritorio for update;
  if x.id is null then raise exception 'Êxito não encontrado' using errcode = 'TC404'; end if;
  if x.situacao <> 'PARA_CONFERIR' then perform recusar_motivo('Este êxito já foi conferido', 'JA_CONFERIDO'); end if;
  if v_valor is null or v_valor not between 1 and 10000000000 then e := e || 'valor'::text;
  elsif v_valor <> x.calculado and (v_motivo is null or length(v_motivo) not between 3 and 500) then e := e || 'motivoAjuste'::text;
  end if;
  if v_venc is null or v_venc < date '2000-01-01' then e := e || 'vencimento'::text; end if;
  if v_forma is not null and not forma_pagamento_valida(v_forma) then e := e || 'forma'::text; end if;
  if cardinality(e) > 0 then
    raise exception 'Confira o êxito' using errcode = 'TC422',
      detail = jsonb_build_object('motivo', case when 'valor' = any (e) then 'VALOR_OBRIGATORIO' when 'motivoAjuste' = any (e) then 'MOTIVO_OBRIGATORIO'
                                                 when 'vencimento' = any (e) then 'DATA_INVALIDA' end,
                                  'campos', (select jsonb_agg(v order by v) from unnest(e) v))::text;
  end if;
  if not exists (select 1 from contratos c where c.id = x.contrato_id and c.estado in ('ATIVO', 'ENCERRADO')) then
    perform recusar_motivo('O contrato deste êxito não está ativo', 'CONTRATO_INATIVO');
  end if;
  select * into v_caso from casos where id = x.caso_id;

  insert into recebimentos_previstos (escritorio_id, contrato_id, tipo, descricao, vencimento, valor, origem, forma, exito_id)
  values (p_escritorio, x.contrato_id, 'EXITO', left('Êxito · ' || v_caso.nome, 200), v_venc, v_valor, 'ENCERRAMENTO', v_forma, x.id)
  returning id into v_parcela;
  update exitos_conferir set situacao = 'LANCADO', valor_lancado = v_valor, vencimento = v_venc,
         motivo_ajuste = case when v_valor <> x.calculado then v_motivo end, recebimento_id = v_parcela,
         conferido_por = p_pessoa, conferido_em = app_now()
   where id = x.id returning * into x;
  perform registrar_historico('financeiro.exito_lancado', 'casos', x.caso_id::text,
    jsonb_build_object('exito', x.id, 'cliente', x.cliente_id, 'calculado', x.calculado, 'valor', v_valor, 'vencimento', v_venc, 'motivo', x.motivo_ajuste));
  perform registrar_historico('financeiro.exito_lancado', 'contratos', x.contrato_id::text,
    jsonb_build_object('exito', x.id, 'parcela', v_parcela, 'calculado', x.calculado, 'valor', v_valor, 'motivo', x.motivo_ajuste));
  if v_valor <> x.calculado then
    perform exito_avisar(x, p_pessoa, 'EXITO_VALOR_MUDOU', jsonb_build_object('valor', v_valor, 'motivo', left(x.motivo_ajuste, 300)));
  end if;
  return exito_linha(x) || jsonb_build_object('parcela', (select parcela_linha(r) from recebimentos_previstos r where r.id = v_parcela));
end $$;

-- Não cobrar este êxito: motivo e explicação obrigatórios (PT-03: nada some sem explicação).
create function portal_financeiro_exito_nao_cobrar(p_pessoa uuid, p_escritorio uuid, p_id uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  x exitos_conferir;
  v_motivo text := nullif(p_dados ->> 'motivo', '');
  v_expl text := nullif(btrim(coalesce(p_dados ->> 'explicacao', '')), '');
  e text[] := '{}';
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.editar');
  select * into x from exitos_conferir where id = p_id and escritorio_id = p_escritorio for update;
  if x.id is null then raise exception 'Êxito não encontrado' using errcode = 'TC404'; end if;
  if x.situacao <> 'PARA_CONFERIR' then perform recusar_motivo('Este êxito já foi conferido', 'JA_CONFERIDO'); end if;
  if coalesce(v_motivo, '') not in ('PERDOADO', 'INDEVIDO', 'OUTRO') then e := e || 'motivo'::text; end if;
  if v_expl is null or length(v_expl) not between 3 and 1000 then e := e || 'explicacao'::text; end if;
  if cardinality(e) > 0 then
    raise exception 'Confira por que não cobrar' using errcode = 'TC422',
      detail = jsonb_build_object('motivo', 'MOTIVO_OBRIGATORIO', 'campos', (select jsonb_agg(v order by v) from unnest(e) v))::text;
  end if;
  update exitos_conferir set situacao = 'NAO_COBRADO', motivo_nao_cobrar = v_motivo, explicacao = v_expl,
         conferido_por = p_pessoa, conferido_em = app_now()
   where id = x.id returning * into x;
  perform registrar_historico('financeiro.exito_nao_cobrado', 'casos', x.caso_id::text,
    jsonb_build_object('exito', x.id, 'cliente', x.cliente_id, 'calculado', x.calculado, 'motivo', v_motivo, 'explicacao', v_expl));
  perform exito_avisar(x, p_pessoa, 'EXITO_NAO_COBRADO', jsonb_build_object('motivo', v_motivo, 'explicacao', left(v_expl, 300)));
  return exito_linha(x);
end $$;

-- ---------------------------------------------------------------------------------------
-- A parcela mostra de onde veio o êxito e o reembolso que leva junto (decisões 9 e 11).

-- A parcela em que o reembolso volta passa para a seguinte quando esta é paga sem ele (ou
-- cancelada): a primeira do cliente, ainda não paga, que vence a partir de p_desde.
create or replace function reembolso_proxima_parcela(p_escritorio uuid, p_cliente uuid, p_caso uuid, p_desde date) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object('id', r.id, 'descricao', r.descricao, 'vencimento', r.vencimento, 'valor', r.valor,
                            'contrato', jsonb_build_object('id', ct.id, 'numero', ct.numero))
    from recebimentos_previstos r
    join contratos ct on ct.id = r.contrato_id and ct.estado in ('ATIVO', 'ENCERRADO')
   where r.escritorio_id = p_escritorio and ct.cliente_id = p_cliente
     and r.cancelado_em is null and r.valor is not null and r.vencimento >= p_desde
     and parcela_recebido(r.id) < r.valor
   order by (ct.id = (select cc.contrato_id from caso_clientes cc where cc.caso_id = p_caso and cc.cliente_id = p_cliente)) desc nulls last,
            r.vencimento, r.descricao
   limit 1
$$;

-- As despesas adiantadas que voltam junto com esta parcela e ainda não foram reembolsadas.
create function parcela_reembolsos(r recebimentos_previstos) returns jsonb
language sql stable
set search_path = public
as $$
  select case when count(*) > 0 then jsonb_build_object(
           'valor', sum(coalesce(cp.valor_pago, cp.valor)),
           'contas', jsonb_agg(jsonb_build_object('id', cp.id, 'descricao', cp.descricao, 'valor', coalesce(cp.valor_pago, cp.valor),
                                                  'pagaEm', cp.paga_em, 'caso', (select jsonb_build_object('id', s.id, 'nome', s.nome) from casos s where s.id = cp.caso_id))
                               order by cp.criado_em, cp.id)) end
    from contas_pagar cp
    join contratos c on c.id = r.contrato_id
   where cp.escritorio_id = r.escritorio_id and cp.cliente_id = c.cliente_id and cp.reembolso_como = 'PROXIMA_PARCELA'
     and cp.reembolsado_em is null and cp.cancelada_em is null
     and (conta_parcela_reembolso(cp) ->> 'id')::uuid = r.id
$$;

create or replace function parcela_linha(r recebimentos_previstos) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', r.id, 'tipo', r.tipo, 'descricao', r.descricao, 'vencimento', r.vencimento, 'valor', r.valor,
    'recebido', x.rec, 'falta', greatest(r.valor - x.rec, 0), 'forma', r.forma,
    'situacao', parcela_situacao(r, x.rec),
    'pagaEm', (select max(p.recebido_em) from pagamentos_recebidos p where p.parcela_id = r.id),
    'contrato', jsonb_build_object('id', c.id, 'numero', c.numero, 'objeto', c.objeto),
    'cliente', jsonb_build_object('id', k.id, 'nome', k.nome),
    'responsavel', pessoa_ref(c.responsavel_id),
    'cobranca', parcela_cobranca(r.id),
    'cancelado', case when r.cancelado_em is not null then jsonb_build_object('em', r.cancelado_em, 'motivo', r.cancelado_motivo) end,
    'exito', (select jsonb_build_object('id', e.id, 'encerradoEm', m.em, 'conferido', jsonb_build_object('por', pessoa_ref(e.conferido_por), 'em', e.conferido_em),
                                        'calculado', e.calculado, 'base', e.base, 'percentual', e.percentual, 'motivoAjuste', e.motivo_ajuste,
                                        'caso', jsonb_build_object('id', s.id, 'nome', s.nome))
                from exitos_conferir e join caso_etapa_mudancas m on m.id = e.etapa_mudanca_id join casos s on s.id = e.caso_id
               where e.id = r.exito_id),
    'reembolso', case when r.cancelado_em is null and r.valor is not null and x.rec < r.valor then parcela_reembolsos(r) end)
    from (select parcela_recebido(r.id) rec) x
    join contratos c on c.id = r.contrato_id
    join clientes_escritorio k on k.id = c.cliente_id
$$;

-- ---------------------------------------------------------------------------------------
-- Registrar o recebimento com o reembolso junto (decisão 4: só com a caixa marcada).

alter function portal_financeiro_receber_registrar_recibo(uuid, uuid, uuid, jsonb) rename to financeiro_receber_registrar_sem_reembolso;

create function portal_financeiro_receber_registrar_recibo(p_pessoa uuid, p_escritorio uuid, p_parcela uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rb jsonb := p_dados -> 'reembolso';
  r recebimentos_previstos;
  v_rb jsonb;
  v_valor bigint;
  v_forma text;
  v_dia date := json_data(p_dados, 'recebidoEm');
  v_campos text[] := '{}';
  v_motivo text;
  v_msg text;
  v_detalhe_txt text;
  v_detalhe jsonb;
  res jsonb;
  cp record;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.editar');
  if rb is not null and jsonb_typeof(rb) = 'object' then
    select * into r from recebimentos_previstos where id = p_parcela and escritorio_id = p_escritorio;
    if r.id is not null then v_rb := parcela_reembolsos(r); end if;
    if v_rb is null then perform recusar_motivo('Não há reembolso para pagar junto com esta parcela', 'REEMBOLSO_JA_PAGO'); end if;
    v_valor := json_inteiro(rb, 'valor');
    v_forma := nullif(rb ->> 'forma', '');
    if v_valor is null or v_valor < 1 then v_campos := v_campos || 'reembolsoValor'::text;
    elsif v_valor > (v_rb ->> 'valor')::bigint then v_campos := v_campos || 'reembolsoValor'::text; v_motivo := 'REEMBOLSO_ACIMA_DO_ADIANTADO';
    elsif v_valor < (v_rb ->> 'valor')::bigint then v_campos := v_campos || 'reembolsoValor'::text; v_motivo := 'REEMBOLSO_INTEIRO';
    end if;
    if not coalesce(forma_pagamento_valida(v_forma), false) then v_campos := v_campos || 'reembolsoForma'::text; end if;
  end if;

  begin
    res := financeiro_receber_registrar_sem_reembolso(p_pessoa, p_escritorio, p_parcela, p_dados - 'reembolso');
  exception when sqlstate 'TC422' then
    get stacked diagnostics v_msg = message_text, v_detalhe_txt = pg_exception_detail;
    v_detalhe := nullif(v_detalhe_txt, '')::jsonb;
    if cardinality(v_campos) = 0 then raise; end if;
    raise exception '%', v_msg using errcode = 'TC422',
      detail = (coalesce(v_detalhe, '{}'::jsonb) || jsonb_build_object(
        'campos', (select jsonb_agg(distinct v order by v) from (select jsonb_array_elements_text(coalesce(v_detalhe -> 'campos', '[]'::jsonb)) v
                                                                 union select unnest(v_campos)) x)))::text;
  end;
  if cardinality(v_campos) > 0 then
    raise exception 'Confira o reembolso' using errcode = 'TC422',
      detail = jsonb_build_object('motivo', v_motivo, 'campos', (select jsonb_agg(v order by v) from unnest(v_campos) v),
                                  'adiantado', (v_rb ->> 'valor')::bigint)::text;
  end if;
  if v_rb is null then return res; end if;

  for cp in select (j ->> 'id')::uuid id, (j ->> 'valor')::bigint valor from jsonb_array_elements(v_rb -> 'contas') j loop
    insert into reembolsos_recebidos (escritorio_id, conta_id, parcela_id, pagamento_id, valor, forma, recebido_em, autor_id)
    values (p_escritorio, cp.id, p_parcela, (res ->> 'id')::uuid, cp.valor, v_forma, v_dia, p_pessoa);
    update contas_pagar set reembolsado_em = v_dia where id = cp.id;
    perform registrar_historico('financeiro.reembolso', 'contas_pagar', cp.id::text,
      jsonb_build_object('reembolsadoEm', v_dia, 'junto', p_parcela, 'forma', v_forma, 'valor', cp.valor));
  end loop;
  return res || jsonb_build_object('reembolso', jsonb_build_object('valor', v_valor, 'forma', v_forma));
end $$;

-- ---------------------------------------------------------------------------------------
-- O acerto do caso: o êxito esperando conferência também segura o fechamento, e a conta
-- adiantada cancelada não pende.

create or replace function caso_acerto(p_escritorio uuid, p_caso uuid) returns jsonb
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
    select 2, x.previsto_em, jsonb_build_object('tipo', 'EXITO', 'nome', k.nome || ' · êxito para conferir', 'valor', x.calculado,
                                                'vencimento', x.previsto_em, 'exitoId', x.id, 'contratoId', x.contrato_id)
      from exitos_conferir x join clientes_escritorio k on k.id = x.cliente_id
     where x.caso_id = p_caso and x.escritorio_id = p_escritorio and x.situacao = 'PARA_CONFERIR'
    union all
    select 3, p.vencimento, jsonb_build_object('tipo', 'PARCELA', 'nome', p.cliente || ' · ' || p.descricao, 'valor', p.valor - p.rec,
                                               'vencimento', p.vencimento, 'contratoId', p.contrato_id)
      from ps p where p.valor is not null and p.rec < p.valor
    union all
    select 4, p.vencimento, jsonb_build_object('tipo', 'PARCELA_SEM_VALOR', 'nome', p.cliente || ' · ' || p.descricao, 'valor', null,
                                               'vencimento', p.vencimento, 'contratoId', p.contrato_id)
      from ps p where p.valor is null
    union all
    select 5, cp.vencimento, jsonb_build_object('tipo', 'REEMBOLSO', 'nome', cp.descricao, 'valor', coalesce(cp.valor_pago, cp.valor), 'contaId', cp.id)
      from contas_pagar cp where cp.escritorio_id = p_escritorio and cp.caso_id = p_caso and cp.reembolsado_em is null and cp.cancelada_em is null
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

call fechar_acesso();
