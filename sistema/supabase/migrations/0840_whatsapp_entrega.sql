-- 0840 · A entrega das mensagens pelo WhatsApp (F0.21, PT-04). Tudo o que sai pelo WhatsApp do
-- escritório já entra em conversa_mensagens com envio NA_FILA, na mesma transação da ação que
-- o pediu (a IA, a equipe, as automações, os avisos e o carnê). Aqui fica o resto do outbox:
--
--  * O banco decide o que sai, para quem e como: texto livre dentro da janela de 24 horas (o
--    cliente escreveu nas últimas 24 horas) ou o aviso aprovado pela Meta fora dela.
--  * A rota POST /v1/rotina/whatsapp-envios da api-portal pega um lote (com reserva de 5
--    minutos, para duas chamadas não mandarem a mesma mensagem), manda pela API do WhatsApp
--    Cloud e registra cada resultado.
--  * Falha passageira (a Meta fora do ar, limite de envios, rede) tenta de novo em 1, 5, 15 e
--    60 minutos; na 5ª, a mensagem fica "não entregue" com o motivo. Falha definitiva (número
--    sem WhatsApp, aviso não aprovado) marca na hora. O motivo simples aparece nas telas
--    (envio_motivo); o código da Meta fica em whatsapp_envios.ultimo_erro.
--  * Mensagem que não saiu em 24 horas não sai mais (um lembrete velho faz mais mal que bem).
--  * Entregue e lida chegam depois pelo webhook da Meta (F3.58), por whatsapp_envio_situacao.
--
-- O envio de verdade fica desligado até a ligação com a Meta (F3.58): a rota só manda com
-- WHATSAPP_ENVIO=ligado e WHATSAPP_TOKEN nos segredos da função, e a rotina só chama a rota
-- quando há escritório com o número da Meta (meta_numero_id) e mensagem na fila.
--
-- Nome dos avisos na Meta (quem manda os textos para análise, F3.61, usa os mesmos): os avisos
-- prontos são t3jus_<chave em minúsculas> (ex.: t3jus_lembrete_audiencia); os textos aprovados
-- das automações são t3jus_m_<id sem hífens>. Idioma pt_BR. Cada {campo} do texto vira um
-- parâmetro {{1}}, {{2}}… do corpo, na ordem em que aparece; aviso com PDF tem cabeçalho de
-- documento.

insert into configuracoes (chave, valor, descricao) values
  ('whatsapp_envios_url', '"https://app.t3jus.pro/api/v1/rotina/whatsapp-envios"',
   'Rota da api-portal que entrega as mensagens do WhatsApp (vazio: a fila espera)'),
  ('whatsapp_envio_tentativas', '5', 'Tentativas de entregar uma mensagem do WhatsApp antes de marcar como não entregue'),
  ('whatsapp_envio_validade_horas', '24', 'Horas que uma mensagem do WhatsApp pode esperar na fila; depois disso não sai mais');

-- ---------------------------------------------------------------------------------------
-- O andamento da entrega de cada mensagem. A mensagem continua sendo a fonte da situação que
-- as telas mostram; aqui ficam as tentativas, a reserva e o id da Meta (wamid).
create table whatsapp_envios (
  id            uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorios (id) on delete restrict,
  mensagem_id   uuid not null unique references conversa_mensagens (id) on delete restrict,
  tentativas    integer not null default 0 check (tentativas >= 0),
  proxima_em    timestamptz not null default app_now(),
  pego_ate      timestamptz,
  meta_id       text unique check (length(meta_id) between 1 and 200),
  ultimo_erro   text check (length(ultimo_erro) <= 300),
  criado_em     timestamptz not null default app_now(),
  terminado_em  timestamptz
);
create index whatsapp_envios_escritorio on whatsapp_envios (escritorio_id, proxima_em) where terminado_em is null;
call proteger_tabela_escritorio('whatsapp_envios');

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('whatsapp_envios', false, 'Andamento da entrega de cada mensagem do WhatsApp: tentativas, id da Meta e o código do erro, se houve',
  null, null, null, null, null, null, false);

-- A rotina vê a lista de números (e o número da Meta) só com a marca dela ligada; depois cada
-- escritório entra pelo contexto, como nas automações.
create policy rotina_whatsapp_entrega on whatsapp_escritorio for select to dominio
  using (current_setting('t3jus.entregando_whatsapp', true) = 'on');

create function whatsapp_entrega_escritorios() returns table (escritorio_id uuid, numero_id text, token_ref text, ligado boolean)
language plpgsql
set search_path = public
as $$
begin
  perform limpar_contexto();
  perform set_config('t3jus.entregando_whatsapp', 'on', true);
  return query select w.escritorio_id, w.meta_numero_id, w.token_ref, w.situacao in ('EM_ANALISE', 'LIGADO')
                 from whatsapp_escritorio w order by w.escritorio_id;
  perform set_config('t3jus.entregando_whatsapp', '', true);
end $$;

-- ---------------------------------------------------------------------------------------
-- Peças.

-- O aviso aprovado que serve a uma mensagem fora da janela: o aviso pronto (dados.aviso) ou o
-- texto do passo da automação que a mandou (dados.execucao + dados.passo). Nulo: não tem.
create function whatsapp_envio_modelo(m conversa_mensagens) returns jsonb
language plpgsql stable
set search_path = public
as $$
declare
  v_chave text := m.dados ->> 'aviso';
  e automacao_execucoes;
  p jsonb;
  mo automacao_modelos;
  w whatsapp_avisos;
begin
  if v_chave is null and m.dados ->> 'execucao' is not null then
    select * into e from automacao_execucoes where id::text = m.dados ->> 'execucao' and escritorio_id = m.escritorio_id;
    select jsonb_path_query_first(v.fluxo, '$.** ? (@.id == $id)', jsonb_build_object('id', m.dados ->> 'passo')) into p
      from automacao_versoes v where v.automacao_id = e.automacao_id and v.numero = e.versao_numero;
    if p ->> 'modeloId' is not null then
      select * into mo from automacao_modelos where id::text = p ->> 'modeloId' and automacao_id = e.automacao_id;
      if mo.id is not null then
        return jsonb_build_object('nome', 't3jus_m_' || replace(mo.id::text, '-', ''), 'idioma', 'pt_BR',
                                  'texto', mo.texto, 'situacao', mo.meta_situacao);
      end if;
    end if;
    v_chave := p ->> 'aviso';
  end if;
  if v_chave is null then return null; end if;
  select * into w from whatsapp_avisos where escritorio_id = m.escritorio_id and chave = v_chave;
  if w.id is null then return null; end if;
  return jsonb_build_object('nome', 't3jus_' || lower(w.chave), 'idioma', 'pt_BR', 'texto', w.texto, 'situacao', w.situacao);
end $$;

-- A janela de 24 horas: o cliente escreveu nas últimas 24 horas.
create function whatsapp_janela_aberta(p_conversa uuid) returns boolean
language sql stable
set search_path = public
as $$
  select coalesce((select max(m.criada_em) from conversa_mensagens m where m.conversa_id = p_conversa and m.autor = 'CLIENTE')
                  >= app_now() - interval '24 hours', false)
$$;

-- Marca a mensagem como não entregue, com o motivo simples (as telas mostram) e o técnico.
create function whatsapp_envio_falhou(p_mensagem uuid, p_motivo text, p_erro text default null) returns void
language plpgsql
set search_path = public
as $$
declare v_esc uuid;
begin
  update conversa_mensagens set envio = 'FALHOU', envio_motivo = left(p_motivo, 300), envio_em = app_now()
   where id = p_mensagem and envio = 'NA_FILA'
  returning escritorio_id into v_esc;
  if v_esc is null then return; end if;
  insert into whatsapp_envios (escritorio_id, mensagem_id, terminado_em, ultimo_erro)
  values (v_esc, p_mensagem, app_now(), left(coalesce(p_erro, p_motivo), 300))
  on conflict (mensagem_id) do update set terminado_em = app_now(), pego_ate = null,
         ultimo_erro = left(coalesce(p_erro, p_motivo, whatsapp_envios.ultimo_erro), 300);
end $$;

-- As mensagens que passaram da validade não saem mais. Roda dentro do escritório.
create function whatsapp_envios_vencer(p_escritorio uuid) returns integer
language plpgsql
set search_path = public
as $$
declare r record; v_n integer := 0;
begin
  for r in select m.id from conversa_mensagens m
             left join whatsapp_envios e on e.mensagem_id = m.id
            where m.escritorio_id = p_escritorio and m.envio = 'NA_FILA'
              and m.criada_em < app_now() - make_interval(hours => configuracao_int('whatsapp_envio_validade_horas'))
              and (e.pego_ate is null or e.pego_ate < app_now()) loop
    perform whatsapp_envio_falhou(r.id, format('Ficou na fila mais de %s horas sem poder sair', configuracao_int('whatsapp_envio_validade_horas')),
                                  'VENCEU');
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;

-- ---------------------------------------------------------------------------------------
-- A rotina de cada minuto (pg_cron): vence o que passou da hora, em todos os escritórios, e
-- chama a rota só se há o que mandar por um número da Meta.
create function whatsapp_envios_rotina() returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  x record;
  v_vencidas integer := 0;
  v_prontas integer := 0;
  v_url text := nullif(btrim((select valor #>> '{}' from configuracoes where chave = 'whatsapp_envios_url')), '');
  v_chamou boolean := false;
begin
  for x in select * from whatsapp_entrega_escritorios() loop
    perform entrar_escritorio_servico(x.escritorio_id);
    v_vencidas := v_vencidas + whatsapp_envios_vencer(x.escritorio_id);
    if x.ligado and x.numero_id is not null then
      v_prontas := v_prontas + (select count(*) from conversa_mensagens m left join whatsapp_envios e on e.mensagem_id = m.id
                                 where m.escritorio_id = x.escritorio_id and m.envio = 'NA_FILA'
                                   and (e.id is null or (e.proxima_em <= app_now() and (e.pego_ate is null or e.pego_ate < app_now()))));
    end if;
  end loop;
  perform limpar_contexto();
  if v_prontas > 0 and v_url is not null and exists (select 1 from pg_extension where extname = 'pg_net') then
    execute 'select net.http_post(url := $1, body := ''{}''::jsonb, timeout_milliseconds := 30000)' using v_url;
    v_chamou := true;
  end if;
  return jsonb_build_object('vencidas', v_vencidas, 'prontas', v_prontas, 'chamou', v_chamou);
end $$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('t3jus-whatsapp-envios', '* * * * *', 'select public.whatsapp_envios_rotina()');
  end if;
end $$;

-- ---------------------------------------------------------------------------------------
-- A rota pede um lote. Cada mensagem devolvida fica reservada por 5 minutos. O que não pode
-- sair já sai daqui marcado (fora da janela sem aviso aprovado, cliente que pediu para não
-- receber avisos); aviso ainda em análise na Meta espera 30 minutos e tenta de novo.
create function rotina_whatsapp_pendentes(p_limite integer default 20) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  x record;
  m conversa_mensagens;
  c conversas;
  mo jsonb;
  v_saida jsonb := '[]'::jsonb;
  v_resta integer := greatest(least(coalesce(p_limite, 20), 50), 1);
  v_pego uuid;
begin
  for x in select * from whatsapp_entrega_escritorios() where ligado and numero_id is not null loop
    exit when v_resta <= 0;
    perform entrar_escritorio_servico(x.escritorio_id);
    perform whatsapp_envios_vencer(x.escritorio_id);
    for m in select mm.* from conversa_mensagens mm left join whatsapp_envios e on e.mensagem_id = mm.id
              where mm.escritorio_id = x.escritorio_id and mm.envio = 'NA_FILA'
                and (e.id is null or (e.proxima_em <= app_now() and (e.pego_ate is null or e.pego_ate < app_now())))
              order by mm.criada_em, mm.id limit v_resta loop
      select * into c from conversas where id = m.conversa_id;
      if m.autor = 'AVISO' and c.cliente_id is not null
         and exists (select 1 from clientes_sem_avisos s where s.cliente_id = c.cliente_id and s.retirado_em is null and s.tipo = 'TODOS') then
        perform whatsapp_envio_falhou(m.id, 'O cliente pediu para não receber avisos', 'SEM_AVISOS');
        continue;
      end if;
      mo := null;
      if not whatsapp_janela_aberta(c.id) then
        mo := whatsapp_envio_modelo(m);
        if mo is null then
          perform whatsapp_envio_falhou(m.id, 'Fora da janela de 24 horas, a Meta só aceita aviso aprovado', 'JANELA_FECHADA');
          continue;
        elsif mo ->> 'situacao' = 'EM_ANALISE' then
          insert into whatsapp_envios (escritorio_id, mensagem_id, proxima_em) values (m.escritorio_id, m.id, app_now() + interval '30 minutes')
          on conflict (mensagem_id) do update set proxima_em = excluded.proxima_em, pego_ate = null;
          continue;
        elsif mo ->> 'situacao' <> 'APROVADO' then
          perform whatsapp_envio_falhou(m.id, 'O aviso não está aprovado pela Meta', 'MODELO_' || (mo ->> 'situacao'));
          continue;
        end if;
      end if;
      -- Reserva: só uma chamada leva a mensagem.
      v_pego := null;
      insert into whatsapp_envios (escritorio_id, mensagem_id, pego_ate) values (m.escritorio_id, m.id, app_now() + interval '5 minutes')
      on conflict (mensagem_id) do update set pego_ate = excluded.pego_ate
        where whatsapp_envios.terminado_em is null and (whatsapp_envios.pego_ate is null or whatsapp_envios.pego_ate < app_now())
      returning id into v_pego;
      continue when v_pego is null;
      v_saida := v_saida || jsonb_build_object(
        'id', m.id, 'escritorioId', m.escritorio_id, 'numeroId', x.numero_id, 'tokenRef', x.token_ref,
        'para', ltrim(c.telefone, '+'), 'texto', m.texto,
        'anexo', case when m.anexo ->> 'caminho' is not null
                      then jsonb_build_object('nome', m.anexo ->> 'nome', 'tipo', m.anexo ->> 'tipo', 'caminho', m.anexo ->> 'caminho') end,
        'modelo', case when mo is not null then mo - 'situacao' end);
      v_resta := v_resta - 1;
    end loop;
  end loop;
  perform limpar_contexto();
  return v_saida;
end $$;

-- Registra o resultado de uma tentativa. O escritório vem da própria fila (do lote acima).
-- Saiu: ENVIADA, com o id da Meta. Falha passageira: tenta de novo (1, 5, 15, 60 minutos) até
-- o limite. Falha definitiva ou a última tentativa: não entregue, com o motivo.
create function rotina_whatsapp_registrar(p_escritorio uuid, p_mensagem uuid, p_enviado boolean, p_meta_id text default null,
                                          p_motivo text default null, p_erro text default null, p_passageira boolean default false)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  e whatsapp_envios;
  v_max integer := configuracao_int('whatsapp_envio_tentativas');
  v_res text;
begin
  perform entrar_escritorio_servico(p_escritorio);
  select * into e from whatsapp_envios where mensagem_id = p_mensagem and escritorio_id = p_escritorio and terminado_em is null;
  if e.id is null then
    perform limpar_contexto();
    raise exception 'Envio não encontrado' using errcode = 'TC404';
  end if;
  if p_enviado then
    if length(btrim(coalesce(p_meta_id, ''))) not between 1 and 200 then
      perform limpar_contexto();
      raise exception 'Falta o id da Meta' using errcode = 'TC422';
    end if;
    update whatsapp_envios set tentativas = tentativas + 1, meta_id = btrim(p_meta_id), pego_ate = null, ultimo_erro = null,
           terminado_em = app_now() where id = e.id;
    update conversa_mensagens set envio = 'ENVIADA', envio_em = app_now() where id = p_mensagem and envio = 'NA_FILA';
    v_res := 'ENVIADA';
  elsif p_passageira and e.tentativas + 1 < v_max then
    update whatsapp_envios set tentativas = tentativas + 1, pego_ate = null, ultimo_erro = left(coalesce(p_erro, p_motivo, 'Falhou'), 300),
           proxima_em = app_now() + case e.tentativas when 0 then interval '1 minute' when 1 then interval '5 minutes'
                                                      when 2 then interval '15 minutes' else interval '60 minutes' end
     where id = e.id;
    v_res := 'NA_FILA';
  else
    update whatsapp_envios set tentativas = tentativas + 1 where id = e.id;
    perform whatsapp_envio_falhou(p_mensagem,
      case when p_passageira then format('A Meta não aceitou depois de %s tentativas: %s', v_max, coalesce(p_motivo, 'falha passageira'))
           else coalesce(p_motivo, 'A Meta recusou a mensagem') end,
      coalesce(p_erro, p_motivo));
    v_res := 'FALHOU';
  end if;
  perform limpar_contexto();
  return v_res;
end $$;

-- O que a Meta conta depois (webhook, F3.58): ENVIADA, ENTREGUE, LIDA ou FALHOU, pelo id da
-- Meta e pelo número que mandou. A situação só anda para a frente; falha depois de entregue
-- não desfaz o entregue. Devolve se mudou.
create function whatsapp_envio_situacao(p_numero_id text, p_meta_id text, p_situacao text, p_motivo text default null) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_esc uuid;
  e whatsapp_envios;
  v_atual text;
  v_ordem constant text[] := array['NA_FILA', 'ENVIADA', 'ENTREGUE', 'LIDA'];
begin
  if p_situacao not in ('ENVIADA', 'ENTREGUE', 'LIDA', 'FALHOU') then
    raise exception 'Situação inválida' using errcode = 'TC422';
  end if;
  select x.escritorio_id into v_esc from whatsapp_entrega_escritorios() x where x.numero_id = p_numero_id limit 1;
  if v_esc is null then perform limpar_contexto(); return false; end if;
  perform entrar_escritorio_servico(v_esc);
  select * into e from whatsapp_envios where meta_id = p_meta_id and escritorio_id = v_esc;
  if e.id is null then perform limpar_contexto(); return false; end if;
  select envio into v_atual from conversa_mensagens where id = e.mensagem_id;
  if p_situacao = 'FALHOU' then
    if v_atual not in ('NA_FILA', 'ENVIADA') then perform limpar_contexto(); return false; end if;
    update conversa_mensagens set envio = 'FALHOU', envio_motivo = left(coalesce(nullif(btrim(p_motivo), ''), 'A Meta não conseguiu entregar'), 300),
           envio_em = app_now() where id = e.mensagem_id;
    update whatsapp_envios set ultimo_erro = left(coalesce(p_motivo, 'Falhou depois de sair'), 300) where id = e.id;
  else
    if v_atual = 'FALHOU' or array_position(v_ordem, p_situacao) <= array_position(v_ordem, v_atual) then
      perform limpar_contexto();
      return false;
    end if;
    update conversa_mensagens set envio = p_situacao, envio_em = app_now() where id = e.mensagem_id;
  end if;
  perform limpar_contexto();
  return true;
end $$;

call fechar_acesso();
