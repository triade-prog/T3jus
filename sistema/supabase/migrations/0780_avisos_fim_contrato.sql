-- 0780 · Avisos por e-mail do fim do contrato (F0.16, PT-11). Desenho aprovado em
-- docs/design/aprovadas/console-fim-contrato: a sócia dona recebe um e-mail no dia do fim, com
-- o prazo para baixar os dados, e outro 3 dias antes de o acesso fechar. O envio aparece no
-- histórico da ficha como "Só equipe".
--
-- Como a cobrança (0690): o banco decide o que sai e põe na fila `contrato_avisos`; a rota
-- `/v1/rotina/avisos-fim-contrato` da api-console manda pelo Resend e registra o resultado.
-- A rotina roda todo dia às 8h de Brasília; no encerramento com fim hoje, a api-console põe o
-- aviso na fila e manda na hora. O contato que o e-mail cita é o CONTATO_T3JUS (@t3jus/domain).

-- ---------------------------------------------------------------------------------------
-- A fila. Cada aviso sai uma vez por data de fim: se o contrato for reaberto e encerrado de
-- novo em outra data, os avisos saem de novo.
create table contrato_avisos (
  id            uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorios (id) on delete restrict,
  tipo          text not null check (tipo in ('FIM', 'FECHA_EM_3')),
  fim_em        date not null,
  criado_em     timestamptz not null default app_now(),
  enviado_em    timestamptz,
  descartado_em timestamptz,
  tentativas    integer not null default 0,
  ultimo_erro   text check (length(ultimo_erro) <= 300)
);
create unique index contrato_avisos_unico on contrato_avisos (escritorio_id, tipo, fim_em);
create index contrato_avisos_pendentes_idx on contrato_avisos (criado_em) where enviado_em is null and descartado_em is null;
call proteger_tabela_escritorio('contrato_avisos');
-- Só as funções da rotina (com a marca da rotina dos prazos) leem e mudam a fila de todos.
create policy rotina_prazos on contrato_avisos for all to dominio
  using (current_setting('t3jus.aplicando_prazos', true) = 'on')
  with check (current_setting('t3jus.aplicando_prazos', true) = 'on');

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('contrato_avisos', false, 'Fila dos e-mails do fim do contrato à sócia dona: qual aviso, quando saiu e o erro, se houve',
  null, null, null, null, null, null, false);

insert into configuracoes (chave, valor, descricao) values
  ('contrato_avisos_url', '"https://console.t3jus.pro/api/v1/rotina/avisos-fim-contrato"',
   'Rota da api-console que manda os e-mails do fim do contrato (vazio: a fila espera)'),
  ('contrato_aviso_fecha_dias', '3', 'Dias antes de o acesso fechar em que sai o segundo e-mail do fim do contrato');

-- ---------------------------------------------------------------------------------------
-- Quem recebe: a sócia dona, o primeiro sócio com vínculo ativo (como a cópia da cobrança).
create function socio_dono_do_escritorio(p_escritorio uuid) returns uuid
language sql stable
set search_path = public
as $$
  select v.pessoa_id from vinculos v
   where v.escritorio_id = p_escritorio and v.funcao = 'SOCIO' and v.revogado_em is null
   order by v.criado_em limit 1
$$;

-- Põe na fila o aviso que o dia pede. Roda com a marca da rotina ligada (quem chama liga).
-- Nos 30 dias só de consulta: até 3 dias antes de o acesso fechar sai o do fim; dali em diante,
-- só o de 3 dias (se o primeiro não saiu a tempo, o segundo já diz tudo e o primeiro sai da fila).
create function contrato_avisos_enfileirar(p_escritorio uuid) returns integer
language plpgsql
set search_path = public
as $$
declare
  r record;
  v_fecha date;
  v_tipo text;
  v_n integer := 0;
begin
  for r in select e.id, e.contrato_fim_em as fim from escritorios e
            where (p_escritorio is null or e.id = p_escritorio)
              and e.contrato_fim_em is not null and e.acesso_fechado_em is null
              and situacao_do_contrato(e.contrato_fim_em) = 'CONSULTA'
            order by e.id loop
    v_fecha := r.fim + prazo_consulta_dias();
    v_tipo := case when hoje_brasilia() >= v_fecha - configuracao_int('contrato_aviso_fecha_dias') then 'FECHA_EM_3' else 'FIM' end;
    if v_tipo = 'FECHA_EM_3' then
      update contrato_avisos set descartado_em = app_now(), ultimo_erro = 'O aviso de 3 dias já diz tudo'
       where escritorio_id = r.id and tipo = 'FIM' and fim_em = r.fim and enviado_em is null and descartado_em is null;
    end if;
    insert into contrato_avisos (escritorio_id, tipo, fim_em) values (r.id, v_tipo, r.fim)
    on conflict (escritorio_id, tipo, fim_em) do nothing;
    if found then v_n := v_n + 1; end if;
  end loop;
  return v_n;
end $$;

-- Chama a rota que manda os e-mails, se há o que mandar e o banco tem o pg_net.
create function contrato_avisos_chamar() returns boolean
language plpgsql
set search_path = public
as $$
declare v_url text := nullif(btrim((select valor #>> '{}' from configuracoes where chave = 'contrato_avisos_url')), '');
begin
  if v_url is null or not exists (select 1 from pg_extension where extname = 'pg_net') then
    return false;
  end if;
  execute 'select net.http_post(url := $1, body := ''{}''::jsonb, timeout_milliseconds := 30000)' using v_url;
  return true;
end $$;

-- A rotina das 8h: põe na fila o que o dia pede, em todos os escritórios, e chama a rota.
create function contrato_avisos_rotina() returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_n integer;
begin
  perform limpar_contexto();
  perform set_config('t3jus.aplicando_prazos', 'on', true);
  v_n := contrato_avisos_enfileirar(null);
  perform set_config('t3jus.aplicando_prazos', '', true);
  return jsonb_build_object('enfileirados', v_n, 'chamados', contrato_avisos_chamar());
end $$;

-- A api-console chama logo depois de encerrar no Console: com o fim hoje, o aviso sai na hora
-- (como no desenho, um minuto depois do encerramento). Com o fim no futuro, não faz nada.
create function contrato_avisos_do_escritorio(p_escritorio uuid) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_n integer;
begin
  perform limpar_contexto();
  perform set_config('t3jus.aplicando_prazos', 'on', true);
  v_n := contrato_avisos_enfileirar(p_escritorio);
  perform set_config('t3jus.aplicando_prazos', '', true);
  return v_n;
end $$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('t3jus-avisos-fim', '0 11 * * *', 'select public.contrato_avisos_rotina()');
  end if;
end $$;

-- A rota pede os e-mails que faltam, com o que cada um precisa dizer. O aviso de um contrato
-- que foi reaberto, mudou de data ou já fechou sai da fila sem ir; sem sócia dona, também.
create function rotina_contrato_avisos_pendentes(p_limite integer default 20) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  x contrato_avisos;
  v_fim date;
  v_fechado timestamptz;
  v_socio uuid;
  v_datas jsonb;
  v_saida jsonb := '[]'::jsonb;
begin
  perform limpar_contexto();
  perform set_config('t3jus.aplicando_prazos', 'on', true);
  for x in select * from contrato_avisos where enviado_em is null and descartado_em is null and tentativas < 5
            order by tentativas, criado_em limit greatest(least(p_limite, 50), 1) loop
    select contrato_fim_em, acesso_fechado_em into v_fim, v_fechado from escritorios where id = x.escritorio_id;
    v_socio := socio_dono_do_escritorio(x.escritorio_id);
    if v_fim is distinct from x.fim_em or v_fechado is not null or situacao_do_contrato(v_fim) <> 'CONSULTA' or v_socio is null then
      update contrato_avisos set descartado_em = app_now(),
             ultimo_erro = case when v_socio is null and v_fim is not distinct from x.fim_em and v_fechado is null
                                     and situacao_do_contrato(v_fim) = 'CONSULTA'
                                then 'Sem sócio dono' else 'O contrato mudou' end
       where id = x.id;
      continue;
    end if;
    v_datas := datas_do_contrato(v_fim, null);
    v_saida := v_saida || jsonb_build_object(
      'id', x.id, 'tipo', x.tipo, 'paraPessoaId', v_socio,
      'socio', (select nome from pessoas where id = v_socio),
      'escritorio', (select nome from escritorios where id = x.escritorio_id),
      'fimEm', v_fim, 'consultaAte', v_datas ->> 'consultaAte', 'acessoFechaEm', v_datas ->> 'acessoFechaEm',
      'guardaAte', v_datas ->> 'guardaAte', 'diasParaFechar', (v_datas ->> 'acessoFechaEm')::date - hoje_brasilia());
  end loop;
  perform set_config('t3jus.aplicando_prazos', '', true);
  return v_saida;
end $$;

-- Registra o resultado. O e-mail que saiu vai ao histórico do escritório, só para a equipe.
create function rotina_contrato_aviso_registrar(p_id uuid, p_enviado boolean, p_erro text default null) returns void
language plpgsql
security definer
set search_path = public
as $$
declare x contrato_avisos;
begin
  perform limpar_contexto();
  perform set_config('t3jus.aplicando_prazos', 'on', true);
  update contrato_avisos
     set enviado_em = case when p_enviado then app_now() end, tentativas = tentativas + 1,
         ultimo_erro = case when p_enviado then null else left(coalesce(p_erro, 'Falhou'), 300) end
   where id = p_id and enviado_em is null
  returning * into x;
  if x.id is null and not exists (select 1 from contrato_avisos where id = p_id) then
    perform set_config('t3jus.aplicando_prazos', '', true);
    raise exception 'Aviso não encontrado' using errcode = 'TC404';
  end if;
  if x.id is not null and p_enviado then
    perform historico_do_escritorio(x.escritorio_id, true, 'contrato.aviso_enviado', jsonb_build_object(
      'tipo', x.tipo, 'pessoa_id', socio_dono_do_escritorio(x.escritorio_id),
      'consulta_ate', datas_do_contrato(x.fim_em, null) ->> 'consultaAte',
      'acesso_fecha_em', datas_do_contrato(x.fim_em, null) ->> 'acessoFechaEm'));
  end if;
  perform set_config('t3jus.aplicando_prazos', '', true);
end $$;

call fechar_acesso();
