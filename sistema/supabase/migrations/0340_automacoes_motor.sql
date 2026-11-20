-- O motor das automações (F3.60; PA-03). Roda a cada 10 minutos (pg_cron, onde existe) e faz
-- duas coisas: abre uma execução para cada cliente que entra num gatilho de automação ligada e
-- anda com as execuções que chegaram na hora. Cada passo fica no caminho da execução.
--
-- Regras conferidas na hora do envio, não só ao ligar:
--  * só sai mensagem das 8h às 20h, em dia útil (horário de Brasília, feriados nacionais);
--  * 1 cobrança por semana por parcela, somando todas as automações;
--  * quem pediu para não receber avisos fica de fora (todos, ou só cobrança);
--  * só sai texto aprovado (o modelo aprovado pela sócia dona ou o aviso do escritório);
--  * paga, a parcela sai da automação (ou segue o caminho "Pagou", quando há um).
-- A mensagem entra na conversa do cliente como AVISO, na fila de envio; quem a entrega ao
-- WhatsApp é o serviço da Meta (F3.58). Com o WhatsApp do escritório desligado, nada anda.
-- O campo {link de pagamento} ainda não tem de onde vir: a frase que o usa sai da mensagem.

alter table automacao_execucoes
  add column passo_id      text check (length(passo_id) between 1 and 40),
  add column proximo_em    timestamptz,
  add column ultima_msg_em timestamptz,
  add column ramo          text check (ramo in ('PAGOU', 'RESPONDEU', 'NADA')),
  add constraint automacao_execucoes_andando check ((situacao in ('AGENDADA', 'EM_ANDAMENTO')) = (proximo_em is not null));

create index automacao_execucoes_motor on automacao_execucoes (proximo_em) where proximo_em is not null;

-- ---------------------------------------------------------------------------------------
-- Peças.

-- Hora local de Brasília (sem horário de verão desde 2019).
create function automacao_local(p_t timestamptz) returns timestamp
language sql immutable
as $$ select (p_t at time zone 'America/Sao_Paulo') $$;

create function automacao_dia_util(p_dia date) returns boolean
language plpgsql immutable
as $$
declare
  a integer := extract(year from p_dia); b integer; c integer; d integer; e integer; f integer; g integer; h integer;
  i integer; k integer; l integer; m integer; v_pascoa date;
begin
  if extract(isodow from p_dia) > 5 then return false; end if;
  if to_char(p_dia, 'MM-DD') in ('01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25') then return false; end if;
  -- Sexta-feira Santa (Páscoa pelo algoritmo de Meeus), como feriadosNacionais no domínio.
  b := a / 100; c := a % 100; d := b / 4; e := b % 4; f := (b + 8) / 25; g := (b - f + 1) / 3;
  h := (19 * (a % 19) + b - d - g + 15) % 30; i := c / 4; k := c % 4; l := (32 + 2 * e + 2 * i - h - k) % 7;
  m := ((a % 19) + 11 * h + 22 * l) / 451;
  v_pascoa := make_date(a, (h + l - 7 * m + 114) / 31, ((h + l - 7 * m + 114) % 31) + 1);
  return p_dia <> v_pascoa - 2;
end $$;

-- O primeiro momento dentro dos limites (8h às 20h, em dia útil) a partir de p_t.
create function automacao_proximo_horario(p_t timestamptz) returns timestamptz
language plpgsql immutable
as $$
declare v timestamp := automacao_local(p_t); n integer;
begin
  for n in 1..30 loop
    if automacao_dia_util(v::date) and v::time >= '08:00' and v::time < '20:00' then return v at time zone 'America/Sao_Paulo'; end if;
    if automacao_dia_util(v::date) and v::time < '08:00' then return (v::date + time '08:00') at time zone 'America/Sao_Paulo'; end if;
    v := v::date + 1 + time '08:00';
  end loop;
  return v at time zone 'America/Sao_Paulo';
end $$;

create function automacao_reais(p_centavos bigint) returns text
language sql immutable
as $$ select 'R$ ' || replace(replace(replace(to_char(p_centavos / 100.0, 'FM999G999G999G990D00'), ',', '#'), '.', ','), '#', '.') $$;

-- Preenche os campos do texto. Campo sem valor tira a frase em que está; sobrou campo, nulo.
create function automacao_preencher(p_texto text, p_campos jsonb) returns text
language plpgsql immutable
as $$
declare v text := p_texto; k text;
begin
  for k in select x from unnest(automacao_campos_do_texto(p_texto)) x loop
    if nullif(btrim(coalesce(p_campos ->> k, '')), '') is null then
      v := regexp_replace(v, '[^.!?]*\{' || regexp_replace(k, '([^[:alnum:] ])', '\\\1', 'g') || '\}[^.!?]*[.!?]?', '', 'g');
    else
      v := replace(v, '{' || k || '}', p_campos ->> k);
    end if;
  end loop;
  v := btrim(v);
  if v ~ '\{[^{}]{1,40}\}' or length(v) < 10 then return null; end if;
  return v;
end $$;

-- O id do passo depois de p_id, no caminho principal ou dentro do ramo. Nulo: acabou.
create function automacao_seguinte(p_fluxo jsonb, p_id text) returns text
language sql immutable
as $$
  with recursive seqs(seq) as (
    select p_fluxo -> 'passos'
    union all
    select r -> 'passos' from seqs, jsonb_array_elements(seq) p, jsonb_array_elements(coalesce(p -> 'ramos', '[]'::jsonb)) r
  )
  select (s.seq -> (x.n::integer)) ->> 'id'
    from seqs s, jsonb_array_elements(s.seq) with ordinality x(p, n)
   where x.p ->> 'id' = p_id
   limit 1
$$;

-- O fluxo da versão que a execução segue.
create function automacao_fluxo_da_execucao(e automacao_execucoes) returns jsonb
language sql stable
set search_path = public
as $$ select v.fluxo from automacao_versoes v where v.automacao_id = e.automacao_id and v.numero = e.versao_numero $$;

create function automacao_socio_dono(p_escritorio uuid) returns uuid
language sql stable
set search_path = public
as $$
  select v.pessoa_id from vinculos v
   where v.escritorio_id = p_escritorio and v.funcao = 'SOCIO' and v.revogado_em is null order by v.criado_em limit 1
$$;

-- A parcela de uma execução de cobrança ou de pagamento (origem PARCELA: o id é da parcela ou
-- do pagamento recebido).
create function automacao_parcela(e automacao_execucoes) returns uuid
language sql stable
set search_path = public
as $$
  select coalesce((select r.id from recebimentos_previstos r where r.id = e.origem_id),
                  (select p.parcela_id from pagamentos_recebidos p where p.id = e.origem_id))
   where e.origem = 'PARCELA'
$$;

create function automacao_pagou(e automacao_execucoes, a automacoes) returns boolean
language sql stable
set search_path = public
as $$
  select a.gatilho in ('PARCELA_ATRASO', 'PARCELA_VAI_VENCER')
     and exists (select 1 from recebimentos_previstos r
                  where r.id = e.origem_id and (r.cancelado_em is not null or parcela_recebido(r.id) >= r.valor))
$$;

create function automacao_respondeu(e automacao_execucoes) returns boolean
language sql stable
set search_path = public
as $$
  select e.conversa_id is not null and e.ultima_msg_em is not null
     and exists (select 1 from conversa_mensagens m
                  where m.conversa_id = e.conversa_id and m.autor = 'CLIENTE' and m.criada_em > e.ultima_msg_em)
$$;

-- Os campos de uma execução: nome de quem recebe, parcela, caso, compromisso, repasse.
create function automacao_campos_execucao(e automacao_execucoes, a automacoes) returns jsonb
language plpgsql stable
set search_path = public
as $$
declare
  k clientes_escritorio; ct jsonb; v jsonb; r recebimentos_previstos; v_parcela uuid;
begin
  select * into k from clientes_escritorio where id = e.cliente_id;
  ct := contato_principal(k.contatos);
  v := jsonb_build_object('nome', split_part(btrim(coalesce(ct ->> 'nome', k.nome)), ' ', 1),
                          'nome do escritório', (select x.nome from escritorios x where x.id = e.escritorio_id));
  v_parcela := automacao_parcela(e);
  if v_parcela is not null then
    select * into r from recebimentos_previstos where id = v_parcela;
    v := v || jsonb_build_object('parcela', r.descricao, 'vencimento', to_char(r.vencimento, 'DD/MM'),
           'valor', automacao_reais(coalesce((select p.valor from pagamentos_recebidos p where p.id = e.origem_id),
                                             r.valor - parcela_recebido(r.id))));
  elsif e.origem = 'ETAPA' then
    select v || jsonb_build_object('caso', c.nome, 'etapa', t.nome, 'texto da etapa', m.aviso_texto) into v
      from caso_etapa_mudancas m join casos c on c.id = m.caso_id join etapas t on t.id = m.para_etapa_id where m.id = e.origem_id;
  elsif e.origem = 'COMPROMISSO' then
    select v || jsonb_build_object('compromisso', c.titulo, 'data', to_char(automacao_local(c.inicio), 'DD/MM'),
                                   'hora', to_char(automacao_local(c.inicio), 'HH24:MI'),
                                   'local', coalesce(c.local, case when c.modalidade = 'VIRTUAL' then 'sala virtual (o link vai por aqui)' end)) into v
      from compromissos c where c.id = e.origem_id;
  elsif e.origem = 'REPASSE' then
    select v || jsonb_build_object('caso', c.nome, 'valor', automacao_reais(d.valor),
                                   'resumo', 'o valor de ' || automacao_reais(d.valor) || ' foi repassado a você em ' || to_char(d.feito_em, 'DD/MM')) into v
      from destinacoes d join levantamentos l on l.id = d.levantamento_id join casos c on c.id = l.caso_id where d.id = e.origem_id;
  end if;
  return v;
end $$;

-- Acha ou abre a conversa do contato principal do cliente.
create function automacao_conversa(e automacao_execucoes) returns uuid
language plpgsql
set search_path = public
as $$
declare k clientes_escritorio; ct jsonb; v_id uuid;
begin
  if e.conversa_id is not null then return e.conversa_id; end if;
  select * into k from clientes_escritorio where id = e.cliente_id;
  ct := contato_principal(k.contatos);
  if ct ->> 'telefone' is null or telefone_fixo_br(ct ->> 'telefone') then return null; end if;
  select id into v_id from conversas where escritorio_id = e.escritorio_id and telefone = ct ->> 'telefone';
  if v_id is null then
    insert into conversas (escritorio_id, telefone, cliente_id, contato_id, nome_contato, papel_contato)
    values (e.escritorio_id, ct ->> 'telefone', k.id, ct ->> 'id', coalesce(nullif(btrim(ct ->> 'nome'), ''), k.nome), nullif(btrim(coalesce(ct ->> 'papel', '')), ''))
    returning id into v_id;
  end if;
  return v_id;
end $$;

-- Quem recebe a conversa num passo "Passar para uma pessoa".
create function automacao_pessoa_do_passo(e automacao_execucoes, a automacoes, p jsonb) returns uuid
language plpgsql stable
set search_path = public
as $$
declare v uuid; v_parcela uuid := automacao_parcela(e);
begin
  if p ->> 'pessoaId' is not null then
    v := (p ->> 'pessoaId')::uuid;
    if pessoa_do_escritorio(v, e.escritorio_id) then return v; end if;
  elsif p ->> 'regra' = 'QUEM_CUIDA' then
    if v_parcela is not null then
      select c.responsavel_id into v from recebimentos_previstos r join contratos c on c.id = r.contrato_id where r.id = v_parcela;
    elsif e.origem = 'COMPROMISSO' then
      select c.responsavel_id into v from compromissos c where c.id = e.origem_id;
    end if;
    if v is null or not pessoa_do_escritorio(v, e.escritorio_id) then
      select x.pessoa into v from conversa_quem_responde(e.escritorio_id, e.cliente_id) x;
    end if;
    if v is not null then return v; end if;
  elsif p ->> 'regra' = 'AREA' then
    select x.pessoa_id into v from vinculos x join pessoas pe on pe.id = x.pessoa_id
     where x.escritorio_id = e.escritorio_id and x.revogado_em is null and x.funcao = 'EQUIPE'
       and a.area = any (areas_da_pessoa(x.pessoa_id, e.escritorio_id)) order by pe.nome limit 1;
    if v is not null then return v; end if;
  end if;
  return automacao_socio_dono(e.escritorio_id);
end $$;

-- ---------------------------------------------------------------------------------------
-- Entrar no gatilho.

-- Os clientes que entram hoje num gatilho, ainda sem execução nesta automação.
create function automacao_candidatos(a automacoes) returns table (cliente_id uuid, origem text, origem_id uuid, rotulo text)
language plpgsql stable
set search_path = public
as $$
declare
  v_fluxo jsonb := automacao_fluxo_valendo(a);
  v_dias integer := coalesce((v_fluxo #>> '{passos,0,dias}')::integer, 1);
  v_hoje date := hoje_brasilia();
  v_desde timestamptz := (select max(v.ligada_em) from automacao_versoes v where v.automacao_id = a.id and v.numero = a.versao_ligada);
begin
  -- Desde quando vale: a primeira versão ligada (ligar de novo não reabre o que já passou).
  v_desde := coalesce((select min(v.ligada_em) from automacao_versoes v where v.automacao_id = a.id), v_desde);
  if a.gatilho in ('PARCELA_ATRASO', 'PARCELA_VAI_VENCER') then
    return query
      select c.cliente_id, 'PARCELA', r.id, r.descricao
        from recebimentos_previstos r join contratos c on c.id = r.contrato_id
       where r.escritorio_id = a.escritorio_id and r.cancelado_em is null and r.valor is not null
         and parcela_recebido(r.id) < r.valor
         and case when a.gatilho = 'PARCELA_ATRASO'
                  then v_hoje - r.vencimento >= v_dias
                       and (a.entram_ja_atrasados or r.vencimento + v_dias >= automacao_local(v_desde)::date)
                  else r.vencimento = v_hoje + v_dias end
         and not exists (select 1 from automacao_execucoes x where x.automacao_id = a.id and x.origem_id = r.id);
  elsif a.gatilho = 'PAGAMENTO_RECEBIDO' then
    return query
      select c.cliente_id, 'PARCELA', p.id, r.descricao
        from pagamentos_recebidos p join recebimentos_previstos r on r.id = p.parcela_id join contratos c on c.id = r.contrato_id
       where p.escritorio_id = a.escritorio_id and p.criado_em >= v_desde
         and not exists (select 1 from automacao_execucoes x where x.automacao_id = a.id and x.origem_id = p.id);
  elsif a.gatilho = 'ETAPA_CASO' then
    -- Um aviso por mudança de etapa, para o primeiro cliente do caso.
    return query
      select (select cc.cliente_id from caso_clientes cc where cc.caso_id = m.caso_id order by cc.cliente_id limit 1), 'ETAPA', m.id,
             left(cs.nome || ' · ' || t.nome, 160)
        from caso_etapa_mudancas m join casos cs on cs.id = m.caso_id join etapas t on t.id = m.para_etapa_id
       where m.escritorio_id = a.escritorio_id and m.aviso_texto is not null and m.em >= v_desde
         and exists (select 1 from caso_clientes cc where cc.caso_id = m.caso_id)
         and not exists (select 1 from automacao_execucoes x where x.automacao_id = a.id and x.origem_id = m.id);
  elsif a.gatilho = 'LEMBRETE_AUDIENCIA' then
    -- Compromisso com o cliente e "lembrar o cliente" marcado, a menos de 1 dia.
    return query
      select c.cliente_id, 'COMPROMISSO', c.id, left(c.titulo || ' · ' || to_char(automacao_local(c.inicio), 'DD/MM HH24:MI'), 160)
        from compromissos c
       where c.escritorio_id = a.escritorio_id and c.estado = 'MARCADO' and c.cliente_id is not null and c.lembrete_cliente
         and c.tipo <> 'INTERNO' and c.inicio > app_now() and c.inicio <= app_now() + interval '1 day'
         and not exists (select 1 from automacao_execucoes x where x.automacao_id = a.id and x.origem_id = c.id);
  elsif a.gatilho = 'PRESTACAO_CONTAS' then
    return query
      select l.cliente_id, 'REPASSE', d.id, left('Repasse · ' || cs.nome, 160)
        from destinacoes d join levantamentos l on l.id = d.levantamento_id join casos cs on cs.id = l.caso_id
       where d.escritorio_id = a.escritorio_id and d.para = 'CLIENTE' and d.feito_em is not null
         and d.feito_em >= automacao_local(v_desde)::date
         and not exists (select 1 from automacao_execucoes x where x.automacao_id = a.id and x.origem_id = d.id);
  end if;
end $$;

-- Por que o cliente fica de fora (nulo: entra).
create function automacao_fica_de_fora(a automacoes, p_cliente uuid, p_origem_id uuid) returns text
language plpgsql stable
set search_path = public
as $$
declare k clientes_escritorio; ct jsonb; s clientes_sem_avisos; v_cob jsonb; v_fluxo jsonb := automacao_fluxo_valendo(a);
begin
  select * into s from clientes_sem_avisos where cliente_id = p_cliente and retirado_em is null;
  if s.id is not null and (s.tipo = 'TODOS' or a.gatilho in ('PARCELA_ATRASO', 'PARCELA_VAI_VENCER')) then
    return 'Pediu para não receber avisos' || case when s.tipo = 'COBRANCA' then ' de cobrança' else '' end
           || ' em ' || to_char(automacao_local(s.pedido_em), 'DD/MM/YYYY') || '.';
  end if;
  select * into k from clientes_escritorio where id = p_cliente;
  ct := contato_principal(k.contatos);
  if ct ->> 'telefone' is null or telefone_fixo_br(ct ->> 'telefone') then
    return 'Sem WhatsApp no contato principal da ficha.';
  end if;
  if a.gatilho in ('PARCELA_ATRASO', 'PARCELA_VAI_VENCER')
     and exists (select 1 from jsonb_array_elements(v_fluxo -> 'passos') x where x ->> 'tipo' = 'CONDICOES' and (x ->> 'semCombinado')::boolean) then
    v_cob := parcela_cobranca(p_origem_id);
    if (v_cob ->> 'proxData')::date > hoje_brasilia() then
      return 'Tem combinado no Financeiro até ' || to_char((v_cob ->> 'proxData')::date, 'DD/MM') || ': ' || (v_cob ->> 'proxOque') || '.';
    end if;
  end if;
  return null;
end $$;

-- ---------------------------------------------------------------------------------------
-- Andar.

create function automacao_caminho_mais(e automacao_execucoes, p_passo text, p_rotulo text, p_situacao text default 'OK') returns jsonb
language sql stable
as $$ select e.caminho || jsonb_build_array(jsonb_build_object('passo', p_passo, 'rotulo', p_rotulo, 'situacao', p_situacao, 'em', app_now())) $$;

-- Encerra a execução: concluída, falhou (com responsável e motivo) ou ficou de fora.
create function automacao_encerrar(e automacao_execucoes, p_situacao text, p_motivo text default null, p_responsavel uuid default null)
returns void
language sql
set search_path = public
as $$
  update automacao_execucoes
     set situacao = p_situacao, motivo = left(coalesce(p_motivo, motivo), 300), caminho = e.caminho, conversa_id = e.conversa_id,
         responsavel_id = coalesce(p_responsavel, case when p_situacao = 'FALHOU' then automacao_socio_dono(e.escritorio_id) end, responsavel_id),
         ultima_msg_em = e.ultima_msg_em, ramo = e.ramo, passo_id = null, proximo_em = null, terminada_em = app_now()
   where id = e.id
$$;

-- Anda com uma execução até a próxima espera ou o fim. Devolve a situação em que ficou.
create function automacao_andar(p_execucao uuid) returns text
language plpgsql
set search_path = public
as $$
declare
  e automacao_execucoes; a automacoes; v_fluxo jsonb; p jsonb; v_texto text; v_conv uuid; v_quando text; r jsonb;
  v_ultima timestamptz; v_pessoa uuid; v_passos integer := 0; c conversas; v_comp timestamptz; v_parcela uuid;
begin
  select * into e from automacao_execucoes where id = p_execucao for update;
  if e.id is null or e.proximo_em is null then return e.situacao; end if;
  select * into a from automacoes where id = e.automacao_id;
  -- Desligada, a execução para onde está (decisão do desenho: ninguém mais recebe nada dela).
  if a.situacao = 'DESLIGADA' then
    perform automacao_encerrar(e, 'FICOU_DE_FORA', 'A automação foi desligada antes do fim.');
    return 'FICOU_DE_FORA';
  end if;
  v_fluxo := automacao_fluxo_da_execucao(e);
  loop
    v_passos := v_passos + 1;
    if v_passos > 60 or e.passo_id is null then
      perform automacao_encerrar(e, 'CONCLUIDA');
      return 'CONCLUIDA';
    end if;
    p := automacao_passo(v_fluxo, e.passo_id);
    if p is null then
      perform automacao_encerrar(e, 'FALHOU', 'O passo da execução não existe mais na versão ligada.');
      return 'FALHOU';
    end if;
    -- Paga, a parcela sai da automação, a menos que o caminho tenha "Pagou" logo adiante.
    if automacao_pagou(e, a) and coalesce(e.ramo, '') <> 'PAGOU' then
      if p ->> 'tipo' = 'RAMOS' and exists (select 1 from jsonb_array_elements(p -> 'ramos') x where x ->> 'quando' = 'PAGOU') then
        null;
      elsif exists (select 1 from jsonb_array_elements(v_fluxo -> 'passos') x
                     where x ->> 'tipo' = 'RAMOS' and exists (select 1 from jsonb_array_elements(x -> 'ramos') y where y ->> 'quando' = 'PAGOU'))
            and e.ramo is null then
        -- Pula a espera e vai direto aos caminhos.
        e.passo_id := (select x ->> 'id' from jsonb_array_elements(v_fluxo -> 'passos') x where x ->> 'tipo' = 'RAMOS' limit 1);
        continue;
      else
        e.caminho := automacao_caminho_mais(e, 'pagou', 'Pagou');
        perform automacao_encerrar(e, 'CONCLUIDA', 'Pagou: a parcela saiu da automação.');
        return 'CONCLUIDA';
      end if;
    end if;
    case p ->> 'tipo'
    when 'GATILHO', 'CONDICOES' then
      e.caminho := automacao_caminho_mais(e, p ->> 'id', case p ->> 'tipo' when 'GATILHO' then 'Gatilho' else 'Condições conferidas' end);
      e.passo_id := automacao_seguinte(v_fluxo, p ->> 'id');

    when 'MENSAGEM' then
      -- Fora do horário, espera o próximo horário permitido.
      if automacao_proximo_horario(app_now()) > app_now() then
        update automacao_execucoes set proximo_em = automacao_proximo_horario(app_now()), passo_id = e.passo_id, caminho = e.caminho,
                                      conversa_id = e.conversa_id, ramo = e.ramo, situacao = 'EM_ANDAMENTO' where id = e.id;
        return 'EM_ANDAMENTO';
      end if;
      -- 1 cobrança por semana por parcela, somando todas as automações.
      if a.gatilho in ('PARCELA_ATRASO', 'PARCELA_VAI_VENCER') then
        select max(x.ultima_msg_em) into v_ultima from automacao_execucoes x
          join automacoes y on y.id = x.automacao_id
         where x.escritorio_id = e.escritorio_id and x.origem_id = e.origem_id and y.gatilho in ('PARCELA_ATRASO', 'PARCELA_VAI_VENCER');
        if v_ultima is not null and v_ultima > app_now() - interval '7 days' then
          e.caminho := automacao_caminho_mais(e, p ->> 'id', 'Espera o limite de 1 cobrança por semana', 'ESPERA');
          update automacao_execucoes set proximo_em = automacao_proximo_horario(v_ultima + interval '7 days'), passo_id = e.passo_id,
                                        caminho = e.caminho, conversa_id = e.conversa_id, ramo = e.ramo, situacao = 'EM_ANDAMENTO'
                                        where id = e.id;
          return 'EM_ANDAMENTO';
        end if;
      end if;
      -- Pediu para não receber depois de entrar: para aqui.
      if exists (select 1 from clientes_sem_avisos s where s.cliente_id = e.cliente_id and s.retirado_em is null
                    and (s.tipo = 'TODOS' or a.gatilho in ('PARCELA_ATRASO', 'PARCELA_VAI_VENCER'))) then
        perform automacao_encerrar(e, 'FICOU_DE_FORA', 'Pediu para não receber avisos depois que entrou na automação.');
        return 'FICOU_DE_FORA';
      end if;
      v_texto := coalesce((select m.texto from automacao_modelos m where m.id::text = p ->> 'modeloId' and m.automacao_id = a.id),
                          case when p ->> 'aviso' is not null then (select w.texto from whatsapp_avisos w where w.escritorio_id = a.escritorio_id and w.chave = p ->> 'aviso') end);
      if v_texto is null then
        e.caminho := automacao_caminho_mais(e, p ->> 'id', p ->> 'nome', 'FALHOU');
        perform automacao_encerrar(e, 'FALHOU', 'A mensagem "' || left(p ->> 'nome', 80) || '" não tem texto aprovado.');
        return 'FALHOU';
      end if;
      v_texto := automacao_preencher(v_texto, automacao_campos_execucao(e, a));
      v_conv := automacao_conversa(e);
      if v_texto is null or v_conv is null then
        e.caminho := automacao_caminho_mais(e, p ->> 'id', p ->> 'nome', 'FALHOU');
        perform automacao_encerrar(e, 'FALHOU', case when v_conv is null then 'Sem WhatsApp no contato principal da ficha.'
                                                    else 'Falta um dado para completar o texto da mensagem.' end);
        return 'FALHOU';
      end if;
      insert into conversa_mensagens (escritorio_id, conversa_id, autor, texto, aviso_tipo, envio)
      values (e.escritorio_id, v_conv, 'AVISO', v_texto, left(coalesce(p ->> 'nome', a.nome), 60), 'NA_FILA');
      update conversas set ultima_em = app_now() where id = v_conv;
      e.conversa_id := v_conv;
      e.ultima_msg_em := app_now();
      e.caminho := automacao_caminho_mais(e, p ->> 'id', p ->> 'nome');
      e.passo_id := automacao_seguinte(v_fluxo, p ->> 'id');
      update automacao_execucoes set ultima_msg_em = e.ultima_msg_em, conversa_id = v_conv where id = e.id;

    when 'ESPERA' then
      e.passo_id := automacao_seguinte(v_fluxo, p ->> 'id');
      if (p ->> 'horasAntes') is not null and e.origem = 'COMPROMISSO' then
        select c2.inicio into v_comp from compromissos c2 where c2.id = e.origem_id and c2.estado = 'MARCADO';
        if v_comp is null then
          perform automacao_encerrar(e, 'FICOU_DE_FORA', 'O compromisso foi cancelado.');
          return 'FICOU_DE_FORA';
        end if;
        v_comp := v_comp - make_interval(hours => (p ->> 'horasAntes')::integer);
      else
        v_comp := app_now() + make_interval(days => coalesce((p ->> 'dias')::integer, 0));
      end if;
      e.caminho := automacao_caminho_mais(e, p ->> 'id',
        case when (p ->> 'horasAntes') is not null then 'Espera até ' || (p ->> 'horasAntes') || 'h antes'
             else 'Espera ' || coalesce(p ->> 'dias', '0') || ' dia(s)' end, 'ESPERA');
      if v_comp > app_now() then
        update automacao_execucoes set proximo_em = v_comp, passo_id = e.passo_id, caminho = e.caminho, conversa_id = e.conversa_id,
                                      ramo = e.ramo, situacao = 'EM_ANDAMENTO' where id = e.id;
        return 'EM_ANDAMENTO';
      end if;

    when 'RAMOS' then
      v_quando := case when automacao_pagou(e, a) then 'PAGOU' when automacao_respondeu(e) then 'RESPONDEU' else 'NADA' end;
      select x into r from jsonb_array_elements(p -> 'ramos') x where x ->> 'quando' = v_quando;
      if r is null then
        v_quando := 'NADA';
        select x into r from jsonb_array_elements(p -> 'ramos') x where x ->> 'quando' = 'NADA';
      end if;
      e.ramo := v_quando;
      e.caminho := automacao_caminho_mais(e, (p ->> 'id') || ':' || v_quando,
        case v_quando when 'PAGOU' then 'Pagou' when 'RESPONDEU' then 'Respondeu' else 'Não respondeu' end);
      e.passo_id := r #>> '{passos,0,id}';

    when 'IA' then
      -- A conversa fica com a IA (se ninguém da equipe está nela); ela responde o que o cliente escrever.
      e.caminho := automacao_caminho_mais(e, p ->> 'id', 'IA conversa');
      e.passo_id := automacao_seguinte(v_fluxo, p ->> 'id');

    when 'PESSOA' then
      v_pessoa := automacao_pessoa_do_passo(e, a, p);
      v_conv := automacao_conversa(e);
      if v_conv is not null then
        select * into c from conversas where id = v_conv;
        if c.situacao = 'IA' then
          update conversas set situacao = 'PRECISA', esperando_desde = app_now(), motivo = 'OUTRO',
                               motivo_texto = left(coalesce(nullif(btrim(p ->> 'motivo'), ''), 'Passada pela automação "' || a.nome || '"'), 600),
                               responsavel_id = v_pessoa, responsavel_razao = 'PASSADA', resolvida_em = null, ultima_em = app_now()
           where id = c.id;
          perform conversa_momento(c, 'PASSOU', null, jsonb_build_object('para', v_pessoa, 'automacao', a.id, 'motivo', p ->> 'motivo'));
        end if;
        e.conversa_id := v_conv;
      end if;
      e.caminho := automacao_caminho_mais(e, p ->> 'id', 'Passou para ' || split_part((select pe.nome from pessoas pe where pe.id = v_pessoa), ' ', 1));
      perform automacao_encerrar(e, 'CONCLUIDA', null, v_pessoa);
      return 'CONCLUIDA';

    when 'FIM' then
      e.caminho := automacao_caminho_mais(e, p ->> 'id', 'Fim');
      perform automacao_encerrar(e, 'CONCLUIDA');
      return 'CONCLUIDA';

    else
      perform automacao_encerrar(e, 'FALHOU', 'Passo desconhecido.');
      return 'FALHOU';
    end case;
  end loop;
end $$;

-- A volta do motor: entra quem chegou ao gatilho e anda com quem chegou na hora (ou pagou ou
-- respondeu durante uma espera antes dos caminhos). Devolve as contagens.
create function automacoes_rodar() returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a automacoes; x record; e automacao_execucoes; v_fora text; v_novas integer := 0; v_andou integer := 0; v_fora_n integer := 0;
  v_esc uuid; v_lista uuid[];
begin
  -- Os escritórios com WhatsApp: a política rotina_automacoes_ler deixa a rotina ver só esta
  -- lista; depois cada escritório entra pelo contexto.
  perform limpar_contexto();
  perform set_config('t3jus.rodando_automacoes', 'on', true);
  select coalesce(array_agg(w.escritorio_id order by w.escritorio_id), '{}') into v_lista from whatsapp_escritorio w;
  perform set_config('t3jus.rodando_automacoes', 'off', true);
  foreach v_esc in array v_lista loop
    perform entrar_escritorio_servico(v_esc);
    continue when not whatsapp_ligado(v_esc);
    perform automacoes_garantir(v_esc);
    for a in select * from automacoes where escritorio_id = v_esc and situacao in ('LIGADA', 'EM_APROVACAO') and versao_ligada is not null loop
      for x in select * from automacao_candidatos(a) loop
        continue when x.cliente_id is null;
        v_fora := automacao_fica_de_fora(a, x.cliente_id, x.origem_id);
        insert into automacao_execucoes (escritorio_id, automacao_id, versao_numero, cliente_id, origem, origem_id, rotulo, caminho,
                                         situacao, motivo, passo_id, proximo_em, terminada_em)
        values (v_esc, a.id, a.versao_ligada, x.cliente_id, x.origem, x.origem_id, x.rotulo, '[]'::jsonb,
                case when v_fora is null then 'AGENDADA' else 'FICOU_DE_FORA' end, v_fora,
                case when v_fora is null then (automacao_fluxo_valendo(a) #>> '{passos,0,id}') end,
                case when v_fora is null then app_now() end,
                case when v_fora is not null then app_now() end)
        on conflict (automacao_id, origem_id) do nothing;
        if v_fora is null then v_novas := v_novas + 1; else v_fora_n := v_fora_n + 1; end if;
      end loop;
    end loop;
    for e in select ex.* from automacao_execucoes ex join automacoes au on au.id = ex.automacao_id
              where ex.escritorio_id = v_esc and ex.proximo_em is not null
                and (ex.proximo_em <= app_now() or automacao_pagou(ex, au)
                     or (automacao_passo(automacao_fluxo_da_execucao(ex), ex.passo_id) ->> 'tipo' = 'RAMOS' and automacao_respondeu(ex)))
              order by ex.proximo_em limit 500 loop
      perform automacao_andar(e.id);
      v_andou := v_andou + 1;
    end loop;
  end loop;
  perform limpar_contexto();
  return jsonb_build_object('entraram', v_novas, 'ficaramDeFora', v_fora_n, 'andaram', v_andou);
end $$;

-- Sem contexto, a rotina não veria nenhum número. Vale só para o dono das tabelas e só durante
-- a leitura da lista em automacoes_rodar.
create policy rotina_automacoes_ler on whatsapp_escritorio for select to dominio
  using (current_setting('t3jus.rodando_automacoes', true) = 'on');

-- A cada 10 minutos, onde o pg_cron existe (no Supabase existe; no banco de teste, não).
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('t3jus-automacoes', '*/10 * * * *', 'select public.automacoes_rodar()');
  end if;
end $$;

call fechar_acesso();
