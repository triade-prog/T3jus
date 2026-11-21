-- 0556 · Escritório › Ajustes do financeiro: o contador e o saldo de abertura do caixa (F3.50;
-- FI-21, FI-09). Desenho aprovado em docs/design/aprovadas/portal-comercial-financeiro-pendencias
-- (estados es-ajustes, es-vazio, es-erros, es-salvo, es-abertura, es-equipe, es-sem-area, ct-caixa e
-- ct-sem-abertura; decisões 7 e 8 da Carol, 21/11/2026).
-- - O contador (um por escritório): nome, escritório de contabilidade, e-mail, telefone, mandar por
--   e-mail quando alguém exportar o mês e o lembrete do dia 5. O T3jus não manda sozinho.
-- - O saldo de abertura: a data e o saldo do caixa do escritório nesse dia, só o dinheiro do
--   escritório. O saldo do Caixa passa a começar dele: abertura mais o que entrou e menos o que saiu
--   depois da data. Corrigir pede motivo, cria uma linha nova e marca a anterior; nada se apaga.
-- - Só a sócia dona muda; quem tem o Financeiro vê. O prazo para repassar (0552) mora na mesma página.

create table contadores (
  escritorio_id       uuid primary key references escritorios (id) on delete restrict,
  nome                text not null check (length(btrim(nome)) between 2 and 120),
  firma               text check (length(btrim(firma)) between 2 and 120),
  email               text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 200),
  telefone            text check (telefone ~ '^\+[1-9][0-9]{7,14}$'),
  mandar_ao_exportar  boolean not null default true,
  lembrar_dia_5       boolean not null default true,
  atualizado_por      uuid not null references pessoas (id) on delete restrict,
  atualizado_em       timestamptz not null default app_now()
);
call proteger_tabela_escritorio('contadores');

create table saldos_abertura (
  id              uuid primary key default gen_random_uuid(),
  escritorio_id   uuid not null references escritorios (id) on delete restrict,
  data            date not null,
  valor           bigint not null check (valor between -10000000000 and 10000000000),
  motivo          text check (length(btrim(motivo)) between 5 and 300),
  criado_por      uuid not null references pessoas (id) on delete restrict,
  criado_em       timestamptz not null default app_now(),
  substituido_em  timestamptz
);
create unique index saldos_abertura_vale on saldos_abertura (escritorio_id) where substituido_em is null;
call proteger_tabela_escritorio('saldos_abertura');

-- Só se acrescenta; da linha antiga muda só a marca de substituída, uma vez.
create function saldos_abertura_guardiao() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' or old.substituido_em is not null
     or (to_jsonb(new) - 'substituido_em') is distinct from (to_jsonb(old) - 'substituido_em') then
    raise exception 'O saldo de abertura não muda nem se apaga: corrija com uma linha nova' using errcode = 'TC023';
  end if;
  return new;
end $$;
create trigger saldos_abertura_guardiao before update or delete on saldos_abertura
  for each row execute function saldos_abertura_guardiao();

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('contadores', true, 'O contador do escritório: nome, escritório de contabilidade, e-mail, telefone e como recebe a exportação',
  'Mandar a exportação do mês ao contador e lembrar de exportar (FI-21)', 'Execução de contrato (LGPD, art. 7º, V)',
  'Escritório', 'Enquanto o escritório for cliente do T3jus e 5 anos depois do fim do contrato', 'Exportadas ao escritório e apagadas com ele', 'APROVADO', true),
 ('saldos_abertura', true, 'O saldo do caixa do escritório no dia antes do primeiro lançamento, com as correções e o motivo',
  'Fazer o saldo do Caixa bater com o do banco (FI-09)', 'Execução de contrato (LGPD, art. 7º, V)',
  'Escritório', 'Enquanto o escritório for cliente do T3jus e 5 anos depois do fim do contrato', 'Exportadas ao escritório e apagadas com ele', 'APROVADO', true);

-- O saldo de abertura que vale agora.
create function saldo_abertura_atual(p_escritorio uuid) returns saldos_abertura
language sql stable
set search_path = public
as $$ select * from saldos_abertura where escritorio_id = p_escritorio and substituido_em is null $$;

-- Quanto o saldo de abertura muda o saldo calculado dos lançamentos, num dia: zero antes da data;
-- dali em diante, a abertura no lugar do que os lançamentos até a data somavam.
create function ajuste_abertura(p_escritorio uuid, p_dia date) returns bigint
language sql stable
set search_path = public
as $$
  select coalesce((select a.valor - (caixa_entradas(p_escritorio, '-infinity', a.data) - caixa_saidas(p_escritorio, '-infinity', a.data))
                     from saldos_abertura a
                    where a.escritorio_id = p_escritorio and a.substituido_em is null and p_dia >= a.data), 0)::bigint
$$;

-- O saldo do caixa do escritório no fim de um dia, já começando do saldo de abertura.
create function saldo_escritorio_em(p_escritorio uuid, p_dia date) returns bigint
language sql stable
set search_path = public
as $$
  select (caixa_entradas(p_escritorio, '-infinity', p_dia) - caixa_saidas(p_escritorio, '-infinity', p_dia)
          + ajuste_abertura(p_escritorio, p_dia))::bigint
$$;

create function abertura_json(a saldos_abertura) returns jsonb
language sql stable
set search_path = public
as $$
  select case when a.id is null then null else jsonb_build_object(
    'id', a.id, 'data', a.data, 'valor', a.valor, 'motivo', a.motivo, 'por', pessoa_ref(a.criado_por), 'em', a.criado_em) end
$$;

create function contador_json(c contadores) returns jsonb
language sql stable
set search_path = public
as $$
  select case when c.escritorio_id is null then null else jsonb_build_object(
    'nome', c.nome, 'firma', c.firma, 'email', c.email, 'telefone', c.telefone,
    'mandarAoExportar', c.mandar_ao_exportar, 'lembrarDia5', c.lembrar_dia_5,
    'por', pessoa_ref(c.atualizado_por), 'em', c.atualizado_em) end
$$;

-- A página Ajustes do financeiro: quem tem a área vê; o botão de salvar é da sócia dona.
create function portal_financeiro_ajustes(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c contadores;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.ver');
  select * into c from contadores where escritorio_id = p_escritorio;
  return jsonb_build_object(
    'dono', e_socio_dono(p_pessoa, p_escritorio),
    'socioDono', (select pessoa_ref(v.pessoa_id) from vinculos v where v.escritorio_id = p_escritorio and v.funcao = 'SOCIO' and v.revogado_em is null
                   limit 1),
    'contador', contador_json(c),
    'abertura', abertura_json(saldo_abertura_atual(p_escritorio)),
    'primeiroLancamento', (select least(
        (select min(recebido_em) from pagamentos_recebidos where escritorio_id = p_escritorio),
        (select min(paga_em) from contas_pagar where escritorio_id = p_escritorio),
        (select min(d.feito_em) from destinacoes d where d.escritorio_id = p_escritorio and destinacao_do_escritorio(d.para)))),
    'saldoHoje', saldo_escritorio_em(p_escritorio, hoje_brasilia()),
    'prazoRepasseDias', (select prazo_repasse_dias_uteis from escritorios where id = p_escritorio),
    'historico', coalesce((select jsonb_agg(jsonb_build_object('acao', h.acao, 'em', h.ocorrido_em, 'por', pessoa_ref(h.autor_id), 'dados', h.dados)
                                            order by h.ocorrido_em desc, h.id desc)
                             from (select * from historico h where h.escritorio_id = p_escritorio
                                     and h.acao in ('financeiro.contador', 'financeiro.saldo_abertura', 'financeiro.prazo_repasse', 'financeiro.meta')
                                   order by h.ocorrido_em desc, h.id desc limit 20) h), '[]'::jsonb));
end $$;

create function ajustes_so_dona(p_pessoa uuid, p_escritorio uuid) returns void
language plpgsql
set search_path = public
as $$
begin
  if not e_socio_dono(p_pessoa, p_escritorio) then
    raise exception 'Só a sócia dona muda os ajustes do financeiro' using errcode = 'TC401',
      detail = jsonb_build_object('motivo', 'SO_SOCIO_DONO')::text;
  end if;
end $$;

-- Salvar a página: o contador (ou nenhum), o prazo e, se ainda não houver, o saldo de abertura.
-- Confere tudo antes de gravar: com erro, nada muda.
create function portal_financeiro_ajustes_salvar(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e text[] := '{}';
  k jsonb := p_dados -> 'contador';
  a jsonb := p_dados -> 'abertura';
  v_dias integer := json_inteiro(p_dados, 'prazoRepasseDias');
  v_antes contadores;
  v_novo contadores;
  v_hoje date := hoje_brasilia();
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.ver');
  perform ajustes_so_dona(p_pessoa, p_escritorio);
  if k is not null and jsonb_typeof(k) = 'object' then
    if not coalesce(json_texto_ok(k, 'nome', 2, 120), false) then e := e || 'nome'::text; end if;
    if k ? 'firma' and k ->> 'firma' is not null and not coalesce(json_texto_ok(k, 'firma', 2, 120), false) then e := e || 'firma'::text; end if;
    if coalesce(k ->> 'email', '') !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(k ->> 'email') > 200 then e := e || 'email'::text; end if;
    if k ->> 'telefone' is not null and k ->> 'telefone' !~ '^\+[1-9][0-9]{7,14}$' then e := e || 'telefone'::text; end if;
  elsif k is not null and jsonb_typeof(k) <> 'null' then
    e := e || 'nome'::text;
  end if;
  if v_dias is null or v_dias not between 1 and 30 then e := e || 'prazoRepasseDias'::text; end if;
  if a is not null and jsonb_typeof(a) = 'object' then
    if (saldo_abertura_atual(p_escritorio)).id is not null then
      e := e || 'aberturaValor'::text;
    else
      if json_data(a, 'data') is null or json_data(a, 'data') > v_hoje then e := e || 'aberturaData'::text; end if;
      if json_inteiro(a, 'valor') is null or abs(json_inteiro(a, 'valor')) > 10000000000 then e := e || 'aberturaValor'::text; end if;
    end if;
  end if;
  if cardinality(e) > 0 then
    perform recusar_campos('Confira os ajustes', variadic e);
  end if;

  -- O contador: o antes e o depois vão ao histórico sem dado pessoal (só o que mudou).
  select * into v_antes from contadores where escritorio_id = p_escritorio for update;
  if k is not null and jsonb_typeof(k) = 'object' then
    insert into contadores (escritorio_id, nome, firma, email, telefone, mandar_ao_exportar, lembrar_dia_5, atualizado_por)
    values (p_escritorio, btrim(k ->> 'nome'), nullif(btrim(coalesce(k ->> 'firma', '')), ''), lower(btrim(k ->> 'email')), k ->> 'telefone',
            coalesce((k ->> 'mandarAoExportar')::boolean, true), coalesce((k ->> 'lembrarDia5')::boolean, true), p_pessoa)
    on conflict (escritorio_id) do update set nome = excluded.nome, firma = excluded.firma, email = excluded.email,
      telefone = excluded.telefone, mandar_ao_exportar = excluded.mandar_ao_exportar, lembrar_dia_5 = excluded.lembrar_dia_5,
      atualizado_por = p_pessoa, atualizado_em = app_now()
    returning * into v_novo;
    if v_antes.escritorio_id is null or (to_jsonb(v_antes) - 'atualizado_por' - 'atualizado_em') is distinct from (to_jsonb(v_novo) - 'atualizado_por' - 'atualizado_em') then
      perform registrar_historico('financeiro.contador', 'contadores', p_escritorio::text, jsonb_strip_nulls(jsonb_build_object(
        'situacao', case when v_antes.escritorio_id is null then 'CADASTRADO' else 'MUDADO' end,
        'trocouContador', v_antes.escritorio_id is not null and (v_antes.nome <> v_novo.nome or v_antes.email <> v_novo.email),
        'firma', v_novo.firma,
        'mandar', v_novo.mandar_ao_exportar, 'lembrar', v_novo.lembrar_dia_5)));
    end if;
  end if;

  perform portal_financeiro_prazo_repasse(p_pessoa, p_escritorio, v_dias);

  if a is not null and jsonb_typeof(a) = 'object' then
    insert into saldos_abertura (escritorio_id, data, valor, criado_por)
    values (p_escritorio, json_data(a, 'data'), json_inteiro(a, 'valor'), p_pessoa);
    perform registrar_historico('financeiro.saldo_abertura', 'escritorios', p_escritorio::text,
      jsonb_build_object('data', json_data(a, 'data'), 'valor', json_inteiro(a, 'valor')));
  end if;
  return portal_financeiro_ajustes(p_pessoa, p_escritorio);
end $$;

-- Corrigir o saldo de abertura: valor (e a data, se mudou) e o motivo. A anterior fica marcada.
create function portal_financeiro_abertura_corrigir(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e text[] := '{}';
  v_antes saldos_abertura;
  v_data date := json_data(p_dados, 'data');
  v_valor bigint := json_inteiro(p_dados, 'valor');
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.ver');
  perform ajustes_so_dona(p_pessoa, p_escritorio);
  select * into v_antes from saldos_abertura where escritorio_id = p_escritorio and substituido_em is null for update;
  if v_data is null or v_data > hoje_brasilia() then e := e || 'data'::text; end if;
  if v_valor is null or abs(v_valor) > 10000000000 then e := e || 'valor'::text; end if;
  if not coalesce(json_texto_ok(p_dados, 'motivo', 5, 300), false) then e := e || 'motivo'::text; end if;
  if cardinality(e) > 0 then perform recusar_campos('Confira o saldo de abertura', variadic e); end if;
  if v_antes.id is not null then
    update saldos_abertura set substituido_em = app_now() where id = v_antes.id;
  end if;
  insert into saldos_abertura (escritorio_id, data, valor, motivo, criado_por)
  values (p_escritorio, v_data, v_valor, btrim(p_dados ->> 'motivo'), p_pessoa);
  perform registrar_historico('financeiro.saldo_abertura', 'escritorios', p_escritorio::text, jsonb_strip_nulls(jsonb_build_object(
    'data', v_data, 'valor', v_valor, 'deData', v_antes.data, 'deValor', v_antes.valor, 'motivo', btrim(p_dados ->> 'motivo'))));
  return portal_financeiro_ajustes(p_pessoa, p_escritorio);
end $$;

-- O Caixa começa no saldo de abertura: o saldo de hoje, o fecha-mês e o saldo de cada mês que
-- termina depois da data ganham a diferença; e a abertura vem para a tela.
alter function portal_financeiro_caixa(uuid, uuid) rename to financeiro_caixa_com_rpv;
create function portal_financeiro_caixa(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb := financeiro_caixa_com_rpv(p_pessoa, p_escritorio);
  v_hoje date := (v ->> 'hoje')::date;
  v_aj bigint := ajuste_abertura(p_escritorio, v_hoje);
  v_meses jsonb := '[]'::jsonb;
  m jsonb;
  v_fm date;
  c contadores;
begin
  for m in select * from jsonb_array_elements(v -> 'meses') loop
    v_fm := ((m ->> 'mes')::date + interval '1 month')::date - 1;
    -- Mês que já fechou leva o ajuste do fim dele; o de hoje e os seguintes, o de hoje.
    m := m || jsonb_build_object('saldo', (m ->> 'saldo')::bigint + ajuste_abertura(p_escritorio, least(v_fm, v_hoje)));
    v_meses := v_meses || m;
  end loop;
  select * into c from contadores where escritorio_id = p_escritorio;
  return v || jsonb_build_object(
    'saldo', (v ->> 'saldo')::bigint + v_aj,
    'fechaMes', (v ->> 'fechaMes')::bigint + v_aj,
    'meses', v_meses,
    'abertura', abertura_json(saldo_abertura_atual(p_escritorio)),
    'contador', case when c.escritorio_id is null then null else jsonb_build_object(
      'nome', c.nome, 'firma', c.firma, 'email', c.email, 'mandarAoExportar', c.mandar_ao_exportar, 'lembrarDia5', c.lembrar_dia_5) end,
    'dono', e_socio_dono(p_pessoa, p_escritorio));
end $$;

-- A exportação diz o saldo do começo e do fim do mês, já com o saldo de abertura.
alter function portal_financeiro_exportar(uuid, uuid, jsonb) rename to financeiro_exportar_base;
create function portal_financeiro_exportar(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb := financeiro_exportar_base(p_pessoa, p_escritorio, p_dados);
  v_mes date := (v ->> 'mes')::date;
begin
  return v || jsonb_build_object(
    'saldoInicio', saldo_escritorio_em(p_escritorio, v_mes - 1),
    'saldoFim', saldo_escritorio_em(p_escritorio, least((v_mes + interval '1 month')::date - 1, hoje_brasilia())));
end $$;

call fechar_acesso();
