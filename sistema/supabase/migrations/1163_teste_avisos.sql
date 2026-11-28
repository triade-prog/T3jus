-- 1163 · Teste grátis de 7 dias, os avisos (F1.34; CO-09, DC12). Plano revisado em project-files
-- t3jus/co-09/plano-v2.md (seção 5, 7.3 e "Decisões da Carol"; lá a migration dos avisos se chama
-- 1162, mas a 1162 ficou com as telas) e desenho aprovado em docs/design/aprovadas/teste-gratis
-- (NOTAS.md, as 8 decisões; emails.html, dia1, dia5, dia7 e dia8; o sino tg-socio em inicio.html e
-- os sinos tg-admin e tg-financeiro em carteira.html). Parte da 1160, da 1161 e da 1162.
--
-- 1. Os quatro passos à sócia dona (socio_dono_do_escritorio, 0780), por e-mail e no sino do Portal,
--    pela fila que já existe (contrato_avisos, 0780), com fim_em = o último dia do teste:
--      TESTE_COMECOU     no primeiro acesso (ou na liberação do repetido), na hora: o gatilho
--                        testes_gratis_avisos põe na fila e chama a rota (contrato_avisos_chamar);
--      TESTE_ACABANDO    do dia 5 ao dia 6 (fim - 2 a fim - 1);
--      TESTE_ULTIMO_DIA  só no dia 7 (hoje = fim);
--      TESTE_ACABOU      a partir do dia 8 (fim + 1).
--    Os três últimos saem pela rotina das 8h (contrato_avisos_rotina, pg_cron t3jus-avisos-fim, que
--    ganha o enfileirador do teste antes do de sempre). Cada passo sai uma vez por escritório, tipo e
--    último dia (contrato_avisos_unico): a prorrogação muda o fim e os passos saem de novo para a
--    data nova. O passo que perdeu a janela (a rotina não rodou, ou a rota não mandou a tempo) é
--    descartado e vai ao histórico interno como teste.aviso_descartado: nunca sai "hoje é o último
--    dia" no dia 8. Os avisos param com a assinatura confirmada (ASSINADO) ou com o teste
--    dispensado, e continuam com o "Quero assinar" pendente (Carol, desenho, decisão 1). Sem a chave
--    teste_gratis_ligado no cadastro não há teste, e nada sai.
-- 2. O sino do Console (avisos_console, global, 0590) ganha teste_id (references testes_gratis, on
--    delete cascade, como interessado_id) e os tipos TESTE_COMECOU, TESTE_ACABANDO (diz se a
--    assinatura está preparada), TESTE_ACABOU (propõe encerrar), TESTE_QUER_ASSINAR (o sócio apertou o
--    botão; no dia 7 vai marcado urgente, decisão 1) e TESTE_REPETIDO. Recebe quem tem vínculo ativo
--    ao escritório com Administração ou Implantação, e o Financeiro também no TESTE_QUER_ASSINAR.
--    Aparece enquanto a pessoa tiver console.teste.ver (aviso_console_visivel, refeita da 0691).
--    O pedido e a repetição nascem de um gatilho em testes_gratis: portal_quero_assinar (1162) e
--    teste_marcar_primeiro_acesso (1160) não mudam.
-- 3. Os e-mails saem pela rota que já existe (POST /v1/rotina/avisos-fim-contrato da api-console),
--    com os textos por tipo. rotina_contrato_avisos_pendentes e rotina_contrato_aviso_registrar (as
--    da 0780, nunca recriadas) viram *_sem_teste e são envolvidas: o teste primeiro, o de sempre
--    depois, com o mesmo nome para a rota. O e-mail que saiu vai ao histórico interno
--    (teste.aviso_enviado).
-- 4. O bloco do Console (teste_bloco_console, 1162) é envolvido: cada aviso previsto ganha o envio
--    (enviado, na fila ou descartado, com o motivo) e entra a lista avisosEnviados.

-- ---------------------------------------------------------------------------------------
-- 1. Os tipos novos

-- A fila do fim do contrato (0780) leva também os passos do teste.
do $$
declare v_tipos text[];
begin
  select array_agg(distinct x) into v_tipos from (
    select unnest(regexp_matches(pg_get_constraintdef(oid), '''([A-Z0-9_]+)''', 'g')) x
      from pg_constraint where conrelid = 'contrato_avisos'::regclass and conname = 'contrato_avisos_tipo_check'
    union select unnest(array['TESTE_COMECOU', 'TESTE_ACABANDO', 'TESTE_ULTIMO_DIA', 'TESTE_ACABOU'])) t;
  alter table contrato_avisos drop constraint contrato_avisos_tipo_check;
  execute format('alter table contrato_avisos add constraint contrato_avisos_tipo_check check (tipo in (%s))',
                 (select string_agg(quote_literal(x), ', ' order by x) from unnest(v_tipos) x));
end $$;
comment on column contrato_avisos.fim_em is 'O fim do contrato; nos passos do teste grátis (TESTE_*), o último dia do teste';

update inventario_dados
   set o_que = 'Fila dos e-mails à sócia dona do fim do contrato e do teste grátis: qual aviso, quando saiu ou foi descartado e o erro'
 where tabela = 'contrato_avisos';

-- O sino do Portal (0390), como os tipos novos da 1010.
do $$
declare v_tipos text[]; v_origens text[];
begin
  select array_agg(distinct x) into v_tipos from (
    select unnest(regexp_matches(pg_get_constraintdef(oid), '''([A-Z0-9_]+)''', 'g')) x
      from pg_constraint where conrelid = 'avisos_sino'::regclass and conname = 'avisos_sino_tipo_check'
    union select unnest(array['TESTE_COMECOU', 'TESTE_ACABANDO', 'TESTE_ULTIMO_DIA', 'TESTE_ACABOU'])) t;
  select array_agg(distinct x) into v_origens from (
    select unnest(regexp_matches(pg_get_constraintdef(oid), '''([a-z0-9_]+)''', 'g')) x
      from pg_constraint where conrelid = 'avisos_sino'::regclass and conname = 'avisos_sino_origem_tabela_check'
    union select 'testes_gratis') t;
  alter table avisos_sino drop constraint avisos_sino_tipo_check;
  execute format('alter table avisos_sino add constraint avisos_sino_tipo_check check (tipo in (%s))',
                 (select string_agg(quote_literal(x), ', ' order by x) from unnest(v_tipos) x));
  alter table avisos_sino drop constraint avisos_sino_origem_tabela_check;
  execute format('alter table avisos_sino add constraint avisos_sino_origem_tabela_check check (origem_tabela in (%s))',
                 (select string_agg(quote_literal(x), ', ' order by x) from unnest(v_origens) x));
end $$;

-- O sino do Console (0590, 0691): global, sem escritorio_id (a guarda apagaria a tabela inteira
-- como se fosse de escritório). O aviso sai junto com a linha do teste, no fim da guarda.
alter table avisos_console add column teste_id uuid references testes_gratis (id) on delete cascade;
do $$
declare v_tipos text[];
begin
  select array_agg(distinct x) into v_tipos from (
    select unnest(regexp_matches(pg_get_constraintdef(oid), '''([A-Z0-9_]+)''', 'g')) x
      from pg_constraint where conrelid = 'avisos_console'::regclass and conname = 'avisos_console_tipo_check'
    union select unnest(array['TESTE_COMECOU', 'TESTE_ACABANDO', 'TESTE_ACABOU', 'TESTE_QUER_ASSINAR', 'TESTE_REPETIDO'])) t;
  alter table avisos_console drop constraint avisos_console_tipo_check;
  execute format('alter table avisos_console add constraint avisos_console_tipo_check check (tipo in (%s))',
                 (select string_agg(quote_literal(x), ', ' order by x) from unnest(v_tipos) x));
end $$;
alter table avisos_console add constraint avisos_console_teste check ((tipo like 'TESTE_%') = (teste_id is not null));
create index avisos_console_teste on avisos_console (teste_id) where teste_id is not null;

update inventario_dados
   set o_que = 'Sino da equipe T3jus: o interessado (nome, trecho da mensagem), a fatura em atraso, o teste grátis (datas, o sócio que entrou ou pediu) e quando foi lido',
       para_que = 'Avisar a pessoa da equipe do que pede a ação dela e levar à ficha do interessado ou do escritório (SC-05, CO-06, CO-09)',
       base_legal = 'A do interessado (consentimento ou legítimo interesse); a do teste, execução de contrato (LGPD, art. 7º, V)',
       prazo = 'O mesmo do interessado; o do teste, o mesmo do escritório',
       no_fim = 'Apagado junto com o interessado ou com o teste do escritório'
 where tabela = 'avisos_console';

-- Visível enquanto a pessoa tiver a permissão de agora (refeita a partir da 0691).
create or replace function aviso_console_visivel(p_tipo text) returns boolean
language sql stable
set search_path = public
as $$
  select case when p_tipo like 'INTERESSADO_%' then pode_global('console.interessados.ver')
              when p_tipo like 'FATURA_%' then pode_global('console.cobranca.ver')
              when p_tipo like 'TESTE_%' then pode_global('console.teste.ver')
              else true end
$$;

-- ---------------------------------------------------------------------------------------
-- 2. Ajudantes

-- A janela de cada passo: -1 antes, 0 dentro, 1 já passou (datas de Brasília).
create function teste_aviso_janela(p_tipo text, p_inicio date, p_fim date, p_hoje date) returns integer
language sql immutable
set search_path = public
as $$
  select case
    when p_inicio is null or p_fim is null then 1
    when p_tipo = 'TESTE_COMECOU' then sign(p_hoje - p_inicio)::int
    when p_tipo = 'TESTE_ACABANDO' then case when p_hoje < p_fim - 2 then -1 when p_hoje <= p_fim - 1 then 0 else 1 end
    when p_tipo = 'TESTE_ULTIMO_DIA' then sign(p_hoje - p_fim)::int
    when p_tipo = 'TESTE_ACABOU' then case when p_hoje <= p_fim then -1 else 0 end
    else 1 end
$$;

-- Quem da equipe T3jus recebe no sino do Console: vínculo ativo ao escritório com Administração ou
-- Implantação (e o Financeiro, quando pedido), ainda com a função ativa. Lê com t3jus.lendo_acesso.
create function pessoas_teste_do_escritorio(p_escritorio uuid, p_financeiro boolean) returns setof uuid
language sql stable
set search_path = public
as $$
  select distinct v.pessoa_id
    from vinculos v
    join funcao_acoes fa on fa.funcao = v.funcao and fa.acao = 'console.teste.ver'
    join equipe_funcoes f on f.pessoa_id = v.pessoa_id and f.funcao = v.funcao and f.retirada_em is null
    join equipe_t3 e on e.pessoa_id = v.pessoa_id and e.ativa
   where v.escritorio_id = p_escritorio and v.revogado_em is null
     and (v.funcao in ('ADMINISTRACAO', 'IMPLANTACAO') or (p_financeiro and v.funcao = 'FINANCEIRO'))
   order by 1
$$;

-- Quem cuida da implantação do escritório (o e-mail do dia 1 cita), ou nulo.
create function teste_implantacao_nome(p_escritorio uuid) returns text
language plpgsql
set search_path = public
as $$
declare v text; v_antes text := current_setting('t3jus.lendo_acesso', true);
begin
  perform set_config('t3jus.lendo_acesso', 'on', true);
  select p.nome into v
    from vinculos x
    join equipe_funcoes f on f.pessoa_id = x.pessoa_id and f.funcao = x.funcao and f.retirada_em is null
    join equipe_t3 e on e.pessoa_id = x.pessoa_id and e.ativa
    join pessoas p on p.id = x.pessoa_id
   where x.escritorio_id = p_escritorio and x.funcao = 'IMPLANTACAO' and x.revogado_em is null
   order by x.criado_em limit 1;
  perform set_config('t3jus.lendo_acesso', coalesce(v_antes, ''), true);
  return v;
end $$;

-- O que os avisos da equipe sabem da assinatura: se está preparada e o plano.
create function teste_aviso_assinatura(p_escritorio uuid) returns jsonb
language plpgsql
set search_path = public
as $$
declare a assinaturas := assinatura_do_teste(p_escritorio);
begin
  return jsonb_build_object('assinaturaPreparada', a.id is not null,
                            'plano', (select nome from planos where id = a.plano_id));
end $$;

-- Grava o aviso do Console para cada pessoa que recebe (nunca para quem fez a ação: o autor dado ou
-- a pessoa do contexto). Devolve quantos.
create function teste_aviso_console(t testes_gratis, p_tipo text, p_autor uuid, p_financeiro boolean, p_dados jsonb) returns integer
language plpgsql
set search_path = public
as $$
declare
  p uuid;
  v_n integer := 0;
  v_nome text;
  v_antes text := current_setting('t3jus.lendo_acesso', true);
begin
  perform set_config('t3jus.lendo_acesso', 'on', true);
  select nome into v_nome from escritorios where id = t.escritorio_id;
  for p in select pessoas_teste_do_escritorio(t.escritorio_id, p_financeiro) loop
    continue when p is not distinct from coalesce(p_autor, contexto_pessoa());
    insert into avisos_console (pessoa_id, tipo, teste_id, dados)
    values (p, p_tipo, t.id, jsonb_strip_nulls(jsonb_build_object(
      'escritorio', v_nome, 'escritorioId', t.escritorio_id, 'inicio', t.inicio, 'fim', t.fim) || coalesce(p_dados, '{}'::jsonb)));
    v_n := v_n + 1;
  end loop;
  perform set_config('t3jus.lendo_acesso', coalesce(v_antes, ''), true);
  return v_n;
end $$;

-- Um passo na fila, o sino da sócia dona e o da equipe, uma vez só por escritório, tipo e último
-- dia. Roda com o contexto do escritório (o gatilho) ou com a marca da rotina (contrato_avisos_rotina).
create function teste_aviso_por(t testes_gratis, p_tipo text) returns boolean
language plpgsql
set search_path = public
as $$
declare
  v_dono uuid;
  v_antes text := current_setting('t3jus.lendo_acesso', true);
  v_ass jsonb;
begin
  insert into contrato_avisos (escritorio_id, tipo, fim_em) values (t.escritorio_id, p_tipo, t.fim)
  on conflict (escritorio_id, tipo, fim_em) do nothing;
  if not found then return false; end if;

  perform set_config('t3jus.lendo_acesso', 'on', true);
  v_dono := socio_dono_do_escritorio(t.escritorio_id);
  perform set_config('t3jus.lendo_acesso', coalesce(v_antes, ''), true);
  perform aviso_sino(t.escritorio_id, v_dono, null, p_tipo, 'testes_gratis', t.id, jsonb_build_object(
    'inicio', t.inicio, 'fim', t.fim, 'totalDias', t.fim - t.inicio + 1, 'soConsultaDesde', t.fim + 1,
    'faltamDias', case when p_tipo = 'TESTE_ACABANDO' then t.fim - hoje_brasilia() + 1 end,
    'origem', case when p_tipo = 'TESTE_COMECOU' then case when t.liberado_em is not null then 'LIBERADO' else 'PRIMEIRO_ACESSO' end end));

  if p_tipo = 'TESTE_COMECOU' then
    perform teste_aviso_console(t, 'TESTE_COMECOU', null, false, jsonb_build_object(
      'quem', teste_nome(t.primeiro_acesso_por), 'totalDias', t.fim - t.inicio + 1,
      'origem', case when t.liberado_em is not null then 'LIBERADO' else 'PRIMEIRO_ACESSO' end));
  elsif p_tipo = 'TESTE_ACABANDO' then
    v_ass := teste_aviso_assinatura(t.escritorio_id);
    perform teste_aviso_console(t, 'TESTE_ACABANDO', null, false, v_ass || jsonb_build_object(
      'prorrogado', t.fim > t.inicio + 6, 'faltamDias', t.fim - hoje_brasilia() + 1,
      'querAssinarEm', t.quer_assinar_em));
  elsif p_tipo = 'TESTE_ACABOU' then
    perform teste_aviso_console(t, 'TESTE_ACABOU', null, false, teste_aviso_assinatura(t.escritorio_id) || jsonb_build_object(
      'soConsultaDesde', t.fim + 1, 'proposta', 'ENCERRAR', 'querAssinarEm', t.quer_assinar_em));
  end if;
  return true;
end $$;

-- O motivo do descarte, para a fila (ultimo_erro) e o histórico.
create function teste_aviso_motivo(p_motivo text) returns text
language sql immutable
as $$
  select case p_motivo
    when 'JANELA' then 'O dia do aviso passou sem o envio (a rotina ou o e-mail não saíram a tempo)'
    when 'PRORROGADO' then 'O último dia do teste mudou: o aviso sai para a data nova'
    when 'ASSINADO' then 'A assinatura foi confirmada: os avisos do teste param'
    when 'DISPENSADO' then 'O teste foi dispensado: os avisos do teste param'
    when 'CONTRATO_ENCERRADO' then 'O contrato foi encerrado'
    when 'SEM_SOCIO' then 'Sem sócio dono'
    else 'O teste mudou' end
$$;

-- Descarta o passo (a linha da fila, nova ou já na fila) e registra no histórico interno. Roda com
-- a marca da rotina.
create function teste_aviso_descartar(p_escritorio uuid, p_tipo text, p_fim date, p_id uuid, p_motivo text) returns void
language plpgsql
set search_path = public
as $$
begin
  if p_id is null then
    insert into contrato_avisos (escritorio_id, tipo, fim_em, descartado_em, ultimo_erro)
    values (p_escritorio, p_tipo, p_fim, app_now(), teste_aviso_motivo(p_motivo))
    on conflict (escritorio_id, tipo, fim_em) do nothing;
    if not found then return; end if;
  else
    update contrato_avisos set descartado_em = app_now(), ultimo_erro = teste_aviso_motivo(p_motivo)
     where id = p_id and enviado_em is null and descartado_em is null;
    if not found then return; end if;
  end if;
  perform historico_do_escritorio(p_escritorio, true, 'teste.aviso_descartado', jsonb_build_object(
    'tipo', p_tipo, 'fim', p_fim, 'motivo', p_motivo));
end $$;

-- ---------------------------------------------------------------------------------------
-- 3. Na hora: o dia 1, a repetição e o "Quero assinar"

-- Depois da mudança em testes_gratis, na mesma transação e com o contexto de quem mudou (o sócio no
-- primeiro acesso e no pedido; a Administração na liberação). Nunca dá erro: um problema do aviso
-- não impede o login nem o pedido; fica o aviso no log e a rotina das 8h confere a fila.
create function testes_gratis_avisos() returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_lendo text := current_setting('t3jus.lendo_teste', true);
  v_acesso text := current_setting('t3jus.lendo_acesso', true);
  v_ant testes_gratis;
  v_ant_nome text;
  v_hoje date := hoje_brasilia();
begin
  begin
    if old.inicio is null and new.inicio is not null then
      if teste_aviso_por(new, 'TESTE_COMECOU') then perform contrato_avisos_chamar(); end if;
    end if;

    if old.repetido_em is null and new.repetido_em is not null then
      -- O teste anterior da pessoa, como em teste_marcar_primeiro_acesso (1160).
      perform set_config('t3jus.lendo_teste', 'on', true);
      perform set_config('t3jus.lendo_acesso', 'on', true);
      select o.* into v_ant
        from vinculos x join testes_gratis o on o.escritorio_id = x.escritorio_id
       where x.pessoa_id = new.primeiro_acesso_por and x.funcao = 'SOCIO' and x.escritorio_id <> new.escritorio_id
         and o.inicio is not null
       order by o.inicio limit 1;
      select nome into v_ant_nome from escritorios where id = v_ant.escritorio_id;
      perform set_config('t3jus.lendo_acesso', coalesce(v_acesso, ''), true);
      perform set_config('t3jus.lendo_teste', coalesce(v_lendo, ''), true);
      perform teste_aviso_console(new, 'TESTE_REPETIDO', null, false, jsonb_build_object(
        'quem', teste_nome(new.primeiro_acesso_por), 'anteriorId', v_ant.escritorio_id, 'anterior', v_ant_nome,
        'anteriorInicio', v_ant.inicio, 'anteriorFim', v_ant.fim));
    end if;

    if old.quer_assinar_em is null and new.quer_assinar_em is not null then
      perform teste_aviso_console(new, 'TESTE_QUER_ASSINAR', null, true, teste_aviso_assinatura(new.escritorio_id) || jsonb_build_object(
        'quem', teste_nome(new.quer_assinar_por), 'comRecado', new.quer_assinar_recado is not null,
        'pedidoEm', new.quer_assinar_em, 'acabou', v_hoje > new.fim,
        -- No dia 7, a confirmação precisa sair antes da trava da meia-noite (desenho, decisão 1).
        'urgente', v_hoje = new.fim, 'ultimoDia', v_hoje = new.fim));
    end if;
  exception when others then
    raise warning 'Teste grátis: o aviso não saiu (%)', sqlerrm;
  end;
  perform set_config('t3jus.lendo_acesso', coalesce(v_acesso, ''), true);
  perform set_config('t3jus.lendo_teste', coalesce(v_lendo, ''), true);
  return null;
end $$;
create trigger testes_gratis_avisos after update of inicio, repetido_em, quer_assinar_em on testes_gratis
  for each row when ((old.inicio is null and new.inicio is not null)
                     or (old.repetido_em is null and new.repetido_em is not null)
                     or (old.quer_assinar_em is null and new.quer_assinar_em is not null))
  execute function testes_gratis_avisos();

-- ---------------------------------------------------------------------------------------
-- 4. A rotina das 8h: o enfileirador do teste

-- Põe na fila o passo que o dia pede e descarta o que perdeu a janela, em cada teste começado,
-- sem assinatura e sem dispensa, com o contrato aberto. Roda com a marca da rotina ligada (quem
-- chama liga). No dia 7, o pedido "Quero assinar" ainda sem confirmação volta ao sino da equipe,
-- urgente (desenho, decisão 1).
create function teste_avisos_enfileirar(p_escritorio uuid) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  e uuid;
  t testes_gratis;
  v_lista uuid[];
  v_tipo text;
  v_j integer;
  v_hoje date := hoje_brasilia();
  v_n integer := 0;
  v_d integer := 0;
  v_tem boolean;
begin
  perform set_config('t3jus.lendo_teste', 'on', true);
  select coalesce(array_agg(escritorio_id order by escritorio_id), '{}') into v_lista
    from testes_gratis where com_teste and inicio is not null and dispensado_em is null
     and (p_escritorio is null or escritorio_id = p_escritorio);
  perform set_config('t3jus.lendo_teste', '', true);
  foreach e in array v_lista loop
    t := teste_ler(e);
    continue when teste_situacao_de(t) not in ('EM_TESTE', 'ACABOU') or contrato_situacao(e) not in ('ABERTO', 'MARCADO');
    perform entrar_escritorio_servico(e);
    foreach v_tipo in array array['TESTE_COMECOU', 'TESTE_ACABANDO', 'TESTE_ULTIMO_DIA', 'TESTE_ACABOU'] loop
      v_j := teste_aviso_janela(v_tipo, t.inicio, t.fim, v_hoje);
      continue when v_j < 0;
      -- O do dia 1 é um só por teste (sai no acesso, com o fim daquele dia); os outros, um por último dia.
      v_tem := case when v_tipo = 'TESTE_COMECOU'
                    then exists (select 1 from contrato_avisos where escritorio_id = e and tipo = v_tipo)
                    else exists (select 1 from contrato_avisos where escritorio_id = e and tipo = v_tipo and fim_em = t.fim) end;
      continue when v_tem;
      if v_j = 0 then
        if teste_aviso_por(t, v_tipo) then v_n := v_n + 1; end if;
      else
        perform teste_aviso_descartar(e, v_tipo, t.fim, null, 'JANELA');
        v_d := v_d + 1;
      end if;
    end loop;
    if v_hoje = t.fim and t.quer_assinar_em is not null and t.quer_assinar_em < inicio_do_dia(t.fim)
       and not exists (select 1 from avisos_console where teste_id = t.id and tipo = 'TESTE_QUER_ASSINAR'
                         and dados ->> 'fim' = t.fim::text and (dados ->> 'urgente')::boolean) then
      perform teste_aviso_console(t, 'TESTE_QUER_ASSINAR', null, true, teste_aviso_assinatura(e) || jsonb_build_object(
        'quem', teste_nome(t.quer_assinar_por), 'comRecado', t.quer_assinar_recado is not null,
        'pedidoEm', t.quer_assinar_em, 'acabou', false, 'urgente', true, 'ultimoDia', true, 'lembrete', true));
    end if;
  end loop;
  -- O contexto do último escritório fica para quem chama limpar (contrato_avisos_rotina).
  return jsonb_build_object('enfileirados', v_n, 'descartados', v_d);
end $$;

-- A rotina das 8h (a da 0780, nunca recriada, envolvida): o teste antes, o fim do contrato depois.
-- O pg_cron t3jus-avisos-fim chama o mesmo nome.
alter function contrato_avisos_rotina() rename to contrato_avisos_rotina_sem_teste;
-- Só a nova chama a de antes: sem security definer, a API não pula o passo do teste.
alter function contrato_avisos_rotina_sem_teste() security invoker;

create function contrato_avisos_rotina() returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v jsonb;
begin
  perform limpar_contexto();
  perform set_config('t3jus.aplicando_prazos', 'on', true);
  v := teste_avisos_enfileirar(null);
  perform set_config('t3jus.aplicando_prazos', '', true);
  perform limpar_contexto();
  return contrato_avisos_rotina_sem_teste()
      || jsonb_build_object('testeEnfileirados', (v ->> 'enfileirados')::int, 'testeDescartados', (v ->> 'descartados')::int);
end $$;

-- ---------------------------------------------------------------------------------------
-- 5. O envio: a rota pede a fila e registra cada resultado

-- O de sempre (0780) deixa os passos do teste para a função nova: a cópia da versão de hoje, com
-- um filtro a mais na fila (se o texto não estiver lá, a função mudou: parar e conferir).
alter function rotina_contrato_avisos_pendentes(integer) rename to rotina_contrato_avisos_pendentes_sem_teste;
alter function rotina_contrato_avisos_pendentes_sem_teste(integer) security invoker;
do $$
declare
  d text := pg_get_functiondef('rotina_contrato_avisos_pendentes_sem_teste(integer)'::regprocedure);
  v_de text := 'where enviado_em is null and descartado_em is null and tentativas < 5';
begin
  if position(v_de in d) = 0 then raise exception 'rotina_contrato_avisos_pendentes mudou: confira o filtro da fila'; end if;
  execute replace(d, v_de, v_de || ' and tipo not like ''TESTE_%''');
end $$;

-- Os passos do teste que faltam mandar, com o que cada e-mail precisa dizer. Na hora do envio,
-- confere de novo: o passo fora da janela, de um último dia que mudou, de teste assinado ou
-- dispensado, de contrato encerrado ou sem sócio dono sai da fila sem ir, com o motivo no
-- histórico. Roda com a marca da rotina.
create function teste_avisos_pendentes(p_limite integer) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  x contrato_avisos;
  t testes_gratis;
  v_sit text;
  v_socio uuid;
  v_motivo text;
  v_hoje date := hoje_brasilia();
  v_saida jsonb := '[]'::jsonb;
  v_antes text := current_setting('t3jus.lendo_acesso', true);
begin
  for x in select * from contrato_avisos where enviado_em is null and descartado_em is null and tentativas < 5
                                          and tipo like 'TESTE_%'
            order by tentativas, criado_em limit greatest(least(p_limite, 50), 1) loop
    t := teste_ler(x.escritorio_id);
    v_sit := teste_situacao_de(t);
    v_socio := socio_dono_do_escritorio(x.escritorio_id);
    v_motivo := case
      when v_sit = 'ASSINADO' then 'ASSINADO'
      when v_sit = 'DISPENSADO' then 'DISPENSADO'
      when v_sit is null or v_sit not in ('EM_TESTE', 'ACABOU') then 'TESTE_MUDOU'
      when contrato_situacao(x.escritorio_id) not in ('ABERTO', 'MARCADO') then 'CONTRATO_ENCERRADO'
      when x.tipo <> 'TESTE_COMECOU' and t.fim is distinct from x.fim_em then 'PRORROGADO'
      when teste_aviso_janela(x.tipo, t.inicio, t.fim, v_hoje) <> 0 then 'JANELA'
      when v_socio is null then 'SEM_SOCIO' end;
    if v_motivo is not null then
      perform teste_aviso_descartar(x.escritorio_id, x.tipo, x.fim_em, x.id, v_motivo);
      continue;
    end if;
    v_saida := v_saida || jsonb_build_object(
      'id', x.id, 'tipo', x.tipo, 'paraPessoaId', v_socio,
      'socio', (select nome from pessoas where id = v_socio),
      'escritorio', (select nome from escritorios where id = x.escritorio_id),
      'inicio', t.inicio, 'fim', t.fim, 'hoje', v_hoje, 'soConsultaDesde', t.fim + 1,
      'totalDias', t.fim - t.inicio + 1, 'faltamDias', greatest(t.fim - v_hoje + 1, 0),
      'origem', case when t.liberado_em is not null then 'LIBERADO' else 'PRIMEIRO_ACESSO' end,
      'implantacao', teste_implantacao_nome(x.escritorio_id),
      'primeiraCompetencia', teste_cobranca_prevista(t, assinatura_do_teste(x.escritorio_id)) ->> 'primeiraCompetencia');
  end loop;
  perform set_config('t3jus.lendo_acesso', coalesce(v_antes, ''), true);
  return v_saida;
end $$;

-- A rota chama o mesmo nome: o teste primeiro, o fim do contrato com o que sobra do limite.
create function rotina_contrato_avisos_pendentes(p_limite integer default 20) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v jsonb; v_limite integer := greatest(least(p_limite, 50), 1);
begin
  perform limpar_contexto();
  perform set_config('t3jus.aplicando_prazos', 'on', true);
  v := teste_avisos_pendentes(v_limite);
  perform set_config('t3jus.aplicando_prazos', '', true);
  if jsonb_array_length(v) < v_limite then
    v := v || rotina_contrato_avisos_pendentes_sem_teste(v_limite - jsonb_array_length(v));
  end if;
  return v;
end $$;

alter function rotina_contrato_aviso_registrar(uuid, boolean, text) rename to rotina_contrato_aviso_registrar_sem_teste;
alter function rotina_contrato_aviso_registrar_sem_teste(uuid, boolean, text) security invoker;

-- Registra o resultado. O e-mail do teste que saiu vai ao histórico do escritório, só para a
-- equipe (teste.aviso_enviado); o do fim do contrato segue como era (0780).
create function rotina_contrato_aviso_registrar(p_id uuid, p_enviado boolean, p_erro text default null) returns void
language plpgsql
security definer
set search_path = public
as $$
declare x contrato_avisos; v_tipo text;
begin
  perform limpar_contexto();
  perform set_config('t3jus.aplicando_prazos', 'on', true);
  select tipo into v_tipo from contrato_avisos where id = p_id;
  if v_tipo is null or v_tipo not like 'TESTE_%' then
    perform set_config('t3jus.aplicando_prazos', '', true);
    perform rotina_contrato_aviso_registrar_sem_teste(p_id, p_enviado, p_erro);
    return;
  end if;
  update contrato_avisos
     set enviado_em = case when p_enviado then app_now() end, tentativas = tentativas + 1,
         ultimo_erro = case when p_enviado then null else left(coalesce(p_erro, 'Falhou'), 300) end
   where id = p_id and enviado_em is null and descartado_em is null
  returning * into x;
  if x.id is not null and p_enviado then
    perform historico_do_escritorio(x.escritorio_id, true, 'teste.aviso_enviado', jsonb_build_object(
      'tipo', x.tipo, 'fim', x.fim_em, 'pessoa_id', socio_dono_do_escritorio(x.escritorio_id)));
  end if;
  perform set_config('t3jus.aplicando_prazos', '', true);
end $$;

-- ---------------------------------------------------------------------------------------
-- 6. O bloco do Console: o envio de cada aviso (teste_bloco_console da 1162, envolvida)

alter function teste_bloco_console(uuid, uuid) rename to teste_bloco_console_sem_envios;

create function teste_bloco_console(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v jsonb := teste_bloco_console_sem_envios(p_pessoa, p_escritorio);
  v_fim date;
begin
  if v is null then return null; end if;
  v_fim := (v ->> 'fim')::date;
  -- A fila é do escritório do contexto (console_teste entra nele antes).
  return v || jsonb_build_object(
    'avisosPrevistos', coalesce((select jsonb_agg(p.valor || jsonb_build_object('envio', (
        select jsonb_build_object(
          'situacao', case when a.enviado_em is not null then 'ENVIADO' when a.descartado_em is not null then 'DESCARTADO' else 'NA_FILA' end,
          'em', coalesce(a.enviado_em, a.descartado_em, a.criado_em), 'motivo', a.ultimo_erro, 'fim', a.fim_em)
          from contrato_avisos a
         where a.escritorio_id = p_escritorio and a.tipo = p.valor ->> 'tipo'
           and (a.fim_em = v_fim or a.tipo = 'TESTE_COMECOU')
         order by a.criado_em desc limit 1)) order by p.n)
      from jsonb_array_elements(v -> 'avisosPrevistos') with ordinality p (valor, n)), '[]'::jsonb),
    -- Tudo o que saiu ou foi descartado, também para os últimos dias de antes da prorrogação.
    'avisosEnviados', coalesce((select jsonb_agg(jsonb_build_object(
        'tipo', a.tipo, 'fim', a.fim_em,
        'situacao', case when a.enviado_em is not null then 'ENVIADO' when a.descartado_em is not null then 'DESCARTADO' else 'NA_FILA' end,
        'em', coalesce(a.enviado_em, a.descartado_em, a.criado_em), 'motivo', a.ultimo_erro) order by a.criado_em, a.id)
      from contrato_avisos a where a.escritorio_id = p_escritorio and a.tipo like 'TESTE_%'), '[]'::jsonb));
end $$;

call fechar_acesso();
