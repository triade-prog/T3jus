-- 0557 · A exportação vai ao contador por e-mail, e o lembrete do dia 5 (F3.50; FI-21). Desenho
-- aprovado em docs/design/aprovadas/portal-comercial-financeiro-pendencias (estados ct-exportar,
-- ct-exportar-falha, ct-sem-contador e ct-caixa; decisões 7 e 9 da Carol, 21/11/2026).
-- - Quem exporta confere e manda: o T3jus não manda sozinho. Com "Mandar por e-mail a <contador>"
--   marcado, a API manda a planilha anexada pelo Resend, de T3jus <nao-responda@t3jus.pro>, com
--   resposta para quem exportou. Cada envio fica registrado: entregue ao Resend ou falhou.
-- - O e-mail que não saiu é falha parcial: o arquivo já foi gerado e baixado; dá para mandar de novo.
-- - No dia 5, quem tem o Financeiro recebe no sino o lembrete de exportar o mês anterior, se o
--   contador pediu o lembrete e o mês ainda não foi exportado.

create table envios_contador (
  id              uuid primary key default gen_random_uuid(),
  escritorio_id   uuid not null references escritorios (id) on delete restrict,
  exportacao_id   uuid not null references exportacoes_contador (id) on delete restrict,
  para            text not null check (length(para) <= 200),
  situacao        text not null check (situacao in ('ENVIADO', 'FALHOU')),
  enviado_por     uuid not null references pessoas (id) on delete restrict,
  enviado_em      timestamptz not null default app_now()
);
create index envios_contador_exportacao on envios_contador (exportacao_id, enviado_em desc);
call proteger_tabela_escritorio('envios_contador');
create trigger envios_contador_so_acrescenta before update or delete on envios_contador
  for each row execute function financeiro_so_acrescenta();

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('envios_contador', true, 'Cada envio da exportação ao contador por e-mail: para quem, quem mandou, quando e se saiu',
  'Mostrar o que o contador já recebeu (FI-21)', 'Execução de contrato (LGPD, art. 7º, V)',
  'Escritório', 'Enquanto o escritório for cliente do T3jus e 5 anos depois do fim do contrato', 'Exportadas ao escritório e apagadas com ele', 'APROVADO', true);

-- O sino passa a aceitar o lembrete de exportar.
do $$
declare
  v_tipos text[];
  v_origens text[];
begin
  select array_agg(distinct x) into v_tipos from (
    select unnest(regexp_matches(pg_get_constraintdef(oid), '''([A-Z0-9_]+)''', 'g')) x
      from pg_constraint where conrelid = 'avisos_sino'::regclass and conname = 'avisos_sino_tipo_check'
    union select 'EXPORTAR_CONTADOR') t;
  select array_agg(distinct x) into v_origens from (
    select unnest(regexp_matches(pg_get_constraintdef(oid), '''([a-z0-9_]+)''', 'g')) x
      from pg_constraint where conrelid = 'avisos_sino'::regclass and conname = 'avisos_sino_origem_tabela_check'
    union select 'escritorios') t;
  alter table avisos_sino drop constraint avisos_sino_tipo_check;
  execute format('alter table avisos_sino add constraint avisos_sino_tipo_check check (tipo in (%s))',
                 (select string_agg(quote_literal(x), ', ' order by x) from unnest(v_tipos) x));
  alter table avisos_sino drop constraint avisos_sino_origem_tabela_check;
  execute format('alter table avisos_sino add constraint avisos_sino_origem_tabela_check check (origem_tabela in (%s))',
                 (select string_agg(quote_literal(x), ', ' order by x) from unnest(v_origens) x));
end $$;

create function envio_json(x envios_contador) returns jsonb
language sql stable
set search_path = public
as $$
  select case when x.id is null then null else jsonb_build_object(
    'para', x.para, 'situacao', x.situacao, 'em', x.enviado_em, 'por', pessoa_ref(x.enviado_por)) end
$$;

-- Antes de mandar: confere a exportação e o contador e devolve o que o e-mail precisa.
create function portal_financeiro_envio_preparar(p_pessoa uuid, p_escritorio uuid, p_exportacao uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  x exportacoes_contador;
  c contadores;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.ver');
  select * into x from exportacoes_contador where id = p_exportacao and escritorio_id = p_escritorio;
  if x.id is null then raise exception 'Exportação não encontrada' using errcode = 'TC404'; end if;
  select * into c from contadores where escritorio_id = p_escritorio;
  if c.escritorio_id is null then perform recusar_motivo('O escritório ainda não tem contador cadastrado.', 'SEM_CONTADOR'); end if;
  return jsonb_build_object(
    'exportacaoId', x.id, 'mes', x.mes, 'formato', x.formato,
    'para', c.email, 'contador', c.nome, 'firma', c.firma,
    'escritorio', (select nome from escritorios where id = p_escritorio),
    'quem', (select nome from pessoas where id = p_pessoa),
    'responderPara', (select u.email from auth.users u where u.id = p_pessoa));
end $$;

-- Depois de mandar (ou de falhar): o registro e o histórico.
create function portal_financeiro_envio_registrar(p_pessoa uuid, p_escritorio uuid, p_exportacao uuid, p_situacao text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  x exportacoes_contador;
  c contadores;
  e envios_contador;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.ver');
  select * into x from exportacoes_contador where id = p_exportacao and escritorio_id = p_escritorio;
  if x.id is null then raise exception 'Exportação não encontrada' using errcode = 'TC404'; end if;
  if p_situacao is null or p_situacao not in ('ENVIADO', 'FALHOU') then perform recusar_campos('Confira a situação', 'situacao'); end if;
  select * into c from contadores where escritorio_id = p_escritorio;
  if c.escritorio_id is null then perform recusar_motivo('O escritório ainda não tem contador cadastrado.', 'SEM_CONTADOR'); end if;
  insert into envios_contador (escritorio_id, exportacao_id, para, situacao, enviado_por)
  values (p_escritorio, x.id, c.email, p_situacao, p_pessoa) returning * into e;
  perform registrar_historico('financeiro.envio_contador', 'exportacoes_contador', x.id::text,
    jsonb_build_object('mes', x.mes, 'situacao', p_situacao));
  return envio_json(e);
end $$;

-- O Caixa diz, de cada exportação, o último envio; e quando é o próximo lembrete.
alter function portal_financeiro_caixa(uuid, uuid) rename to financeiro_caixa_com_abertura;
create function portal_financeiro_caixa(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb := financeiro_caixa_com_abertura(p_pessoa, p_escritorio);
begin
  return v || jsonb_build_object(
    'exportacoes', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'mes', x.mes, 'formato', x.formato, 'em', x.gerada_em, 'por', pessoa_ref(x.gerada_por),
                                                                 'envio', (select envio_json(e) from envios_contador e where e.exportacao_id = x.id
                                                                            order by e.enviado_em desc, e.id desc limit 1))
                                              order by x.gerada_em desc)
                               from (select * from exportacoes_contador where escritorio_id = p_escritorio order by gerada_em desc limit 3) x), '[]'::jsonb),
    'lembrete', case when (v -> 'contador' ->> 'lembrarDia5')::boolean
                     then (date_trunc('month', hoje_brasilia()) + interval '1 month' + interval '4 days')::date end);
end $$;

-- A rotina vê a lista de escritórios só enquanto roda.
create policy rotina_contador_ler on escritorios for select
  using (current_setting('t3jus.lembrando_contador', true) = 'on');

-- No dia 5 (ou depois, se a rotina não rodou): o lembrete de exportar o mês anterior, uma vez por
-- mês, a cada pessoa com o Financeiro, onde o contador pediu o lembrete e o mês não foi exportado.
create function lembrar_contador() returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n integer := 0;
  v_esc uuid;
  v_lista uuid[];
  v_hoje date := hoje_brasilia();
  v_mes date := (date_trunc('month', hoje_brasilia()) - interval '1 month')::date;
  p jsonb;
begin
  if extract(day from v_hoje) < 5 then return 0; end if;
  perform limpar_contexto();
  perform set_config('t3jus.lembrando_contador', 'on', true);
  select coalesce(array_agg(id order by id), '{}') into v_lista from escritorios;
  perform set_config('t3jus.lembrando_contador', 'off', true);
  foreach v_esc in array v_lista loop
    perform entrar_escritorio_servico(v_esc);
    if not exists (select 1 from contadores where escritorio_id = v_esc and lembrar_dia_5) then continue; end if;
    if exists (select 1 from exportacoes_contador where escritorio_id = v_esc and mes = v_mes) then continue; end if;
    for p in select * from jsonb_array_elements(repasse_quem_pode_cuidar(v_esc)) loop
      if not exists (select 1 from avisos_sino s where s.escritorio_id = v_esc and s.tipo = 'EXPORTAR_CONTADOR'
                       and s.pessoa_id = (p ->> 'id')::uuid and s.dados ->> 'referencia' = v_mes::text) then
        perform aviso_sino(v_esc, (p ->> 'id')::uuid, null, 'EXPORTAR_CONTADOR', 'escritorios', v_esc,
          jsonb_build_object('referencia', v_mes, 'contador', (select c.nome from contadores c where c.escritorio_id = v_esc)));
        v_n := v_n + 1;
      end if;
    end loop;
  end loop;
  perform limpar_contexto();
  return v_n;
end $$;

-- Todo dia às 7h de Brasília (10h UTC), onde o pg_cron existe; só age do dia 5 em diante.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('t3jus-contador', '5 10 * * *', 'select public.lembrar_contador()');
  end if;
end $$;

call fechar_acesso();
