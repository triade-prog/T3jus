-- Automações › gatilhos "Cliente novo" e "Documento pendente" (F3.82; PA-06). Desenho aprovado em
-- docs/design/aprovadas/portal-gatilhos-novos (Carol, 21/11/2026: "pode seguir o recomendado"):
--  1. cliente novo é quem aceita a primeira proposta ou assina o primeiro contrato (ou, se a
--     automação escolher, quem é cadastrado em Clientes); importados da planilha e reativados
--     nunca recebem; cada cliente recebe uma boas-vindas só, para sempre;
--  2. o gatilho Cliente novo é de Conversas, que toda a equipe vê e monta;
--  3. documento pendente manda um lembrete só por cliente, com tudo o que falta, e "Pedir de
--     novo" recomeça a contagem;
--  4. no máximo 1 lembrete de documento por semana por cliente, somando as automações e o
--     "Pedir de novo"; os limites de 8h às 20h em dia útil continuam;
--  5. os dois não viram automações prontas: ficam na lista de gatilhos e como exemplos da IA;
--  6. ao ligar, por padrão só entram os documentos que chegam aos dias depois de ligar, com a
--     opção de incluir os já pendentes (a mesma escolha da cobrança);
--  8. o lembrete sem resposta passa para quem pediu o documento (regra QUEM_PEDIU), depois quem
--     cuida do caso e a sócia dona;
--  9. a ficha do caso mostra o lembrete automático em cada documento que falta.
-- "Se chegou" funciona como "Se pagou": quando todos os documentos da execução chegam (ou o caso
-- encerra), o cliente sai na hora. O aviso a quem pediu quando o cliente manda arquivo pela
-- conversa (decisão 7) depende da entrada de arquivos do WhatsApp e fica para depois.

-- ---------------------------------------------------------------------------------------
-- Catálogo.

create or replace function automacao_area(p_gatilho text) returns text
language sql immutable
as $$
  select case when p_gatilho in ('PAGAMENTO_RECEBIDO', 'PARCELA_VAI_VENCER', 'PARCELA_ATRASO', 'PRESTACAO_CONTAS') then 'FINANCEIRO'
              when p_gatilho in ('ETAPA_CASO', 'LEMBRETE_AUDIENCIA', 'DOCUMENTO_PENDENTE') then 'JURIDICO'
              when p_gatilho = 'CLIENTE_NOVO' then 'CONVERSAS' end
$$;

create or replace function automacao_campos(p_gatilho text) returns text[]
language sql immutable
as $$
  select case p_gatilho
    when 'PARCELA_ATRASO' then array['nome', 'parcela', 'valor', 'vencimento', 'link de pagamento', 'nome do escritório']
    when 'PARCELA_VAI_VENCER' then array['nome', 'parcela', 'valor', 'vencimento', 'link de pagamento', 'nome do escritório']
    when 'PAGAMENTO_RECEBIDO' then array['nome', 'parcela', 'valor', 'nome do escritório']
    when 'ETAPA_CASO' then array['nome', 'caso', 'etapa', 'texto da etapa', 'nome do escritório']
    when 'LEMBRETE_AUDIENCIA' then array['nome', 'compromisso', 'data', 'hora', 'local', 'nome do escritório']
    when 'PRESTACAO_CONTAS' then array['nome', 'caso', 'resumo', 'valor', 'nome do escritório']
    when 'CLIENTE_NOVO' then array['nome', 'quem atende', 'horário de atendimento', 'nome do escritório']
    when 'DOCUMENTO_PENDENTE' then array['nome', 'documentos', 'caso', 'pedido em', 'nome do escritório'] end
$$;

create or replace function automacao_ramos_validos(p_gatilho text) returns text[]
language sql immutable
as $$
  select case when p_gatilho in ('PARCELA_ATRASO', 'PARCELA_VAI_VENCER') then array['PAGOU', 'RESPONDEU', 'NADA']
              when p_gatilho = 'DOCUMENTO_PENDENTE' then array['CHEGOU', 'RESPONDEU', 'NADA']
              else array['RESPONDEU', 'NADA'] end
$$;

-- A execução do cliente novo tem o cliente como origem; a do documento pendente guarda os
-- pedidos que estavam faltando quando entrou.
alter table automacao_execucoes
  drop constraint automacao_execucoes_origem_check,
  add constraint automacao_execucoes_origem_check check (origem in ('PARCELA', 'COMPROMISSO', 'ETAPA', 'REPASSE', 'CLIENTE', 'DOCUMENTO')),
  drop constraint automacao_execucoes_ramo_check,
  add constraint automacao_execucoes_ramo_check check (ramo in ('PAGOU', 'CHEGOU', 'RESPONDEU', 'NADA')),
  add column documentos uuid[],
  add constraint automacao_execucoes_documentos check ((origem = 'DOCUMENTO') = (documentos is not null));
create index automacao_execucoes_cliente on automacao_execucoes (escritorio_id, cliente_id);

-- ---------------------------------------------------------------------------------------
-- Peças.

-- Quem pode montar: quem tem a área do gatilho; as de Conversas, toda a equipe (decisão 2).
create function automacao_pode_montar(p_pessoa uuid, p_escritorio uuid, p_area text) returns boolean
language sql stable
set search_path = public
as $$ select p_area = 'CONVERSAS' or p_area = any (areas_da_pessoa(p_pessoa, p_escritorio)) $$;

-- "a, b e c".
create function automacao_lista(p text[]) returns text
language sql immutable
as $$
  select case when cardinality(p) is null or cardinality(p) = 0 then null
              when cardinality(p) = 1 then p[1]
              else array_to_string(p[1:cardinality(p) - 1], ', ') || ' e ' || p[cardinality(p)] end
$$;

-- "de segunda a sexta, das 9h às 18h", a partir do horário da IA do escritório.
create function automacao_horario_texto(p_escritorio uuid) returns text
language plpgsql stable
set search_path = public
as $$
declare c ia_config; v_nomes text[] := array['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo']; v_dias int[]; v_d text;
  h text; f text;
begin
  select * into c from ia_config where escritorio_id = p_escritorio;
  if c.id is null then return null; end if;
  select array_agg(x order by x) into v_dias from unnest(c.dias) x;
  if cardinality(v_dias) = 7 then v_d := 'todos os dias';
  elsif cardinality(v_dias) > 2 and v_dias[cardinality(v_dias)] - v_dias[1] = cardinality(v_dias) - 1 then
    v_d := 'de ' || v_nomes[v_dias[1]] || ' a ' || v_nomes[v_dias[cardinality(v_dias)]];
  else
    v_d := automacao_lista(array(select v_nomes[x] from unnest(v_dias) x));
  end if;
  h := extract(hour from c.hora_inicio)::text || 'h' || case when extract(minute from c.hora_inicio) > 0 then to_char(c.hora_inicio, 'MI') else '' end;
  f := extract(hour from c.hora_fim)::text || 'h' || case when extract(minute from c.hora_fim) > 0 then to_char(c.hora_fim, 'MI') else '' end;
  return v_d || ', das ' || h || ' às ' || f;
end $$;

-- Quem atende o cliente: o responsável pela primeira proposta aceita ou pelo primeiro contrato
-- assinado; sem isso, quem responde as conversas do cliente.
create function automacao_quem_atende(p_escritorio uuid, p_cliente uuid) returns uuid
language plpgsql stable
set search_path = public
as $$
declare v uuid;
begin
  select x.resp into v from (
    select p.responsavel_id resp, p.respondida_em dia from propostas p
     where p.escritorio_id = p_escritorio and p.cliente_id = p_cliente and p.estado = 'ACEITA' and p.respondida_em is not null
    union all
    select c.responsavel_id, c.assinado_em from contratos c
     where c.escritorio_id = p_escritorio and c.cliente_id = p_cliente and c.assinado_em is not null) x
   order by x.dia limit 1;
  if v is null or not pessoa_do_escritorio(v, p_escritorio) then
    select q.pessoa into v from conversa_quem_responde(p_escritorio, p_cliente) q;
  end if;
  return v;
end $$;

-- O dia em que alguém virou cliente: a primeira proposta aceita ou o primeiro contrato assinado
-- (FECHOU), ou o cadastro (CADASTRO). Nulo: ainda não virou.
create function automacao_virou_cliente(k clientes_escritorio, p_conta text) returns date
language sql stable
set search_path = public
as $$
  select case when p_conta = 'CADASTRO' then automacao_local(k.criado_em)::date
              else least((select min(p.respondida_em) from propostas p where p.cliente_id = k.id and p.estado = 'ACEITA'),
                         (select min(c.assinado_em) from contratos c where c.cliente_id = k.id and c.assinado_em is not null)) end
$$;

-- Os pedidos de documento de um cliente que entram agora numa automação de documento pendente:
-- sem chegar, em caso em andamento, aos dias do gatilho contados do pedido ou do último "Pedir
-- de novo", ainda não lembrados neste ciclo. Sem "incluir os já pendentes", só os que chegam aos
-- dias depois de ligar.
create function automacao_docs_do_cliente(a automacoes, p_cliente uuid) returns uuid[]
language plpgsql stable
set search_path = public
as $$
declare
  v_dias integer := coalesce((automacao_fluxo_valendo(a) #>> '{passos,0,dias}')::integer, 5);
  v_desde date := automacao_local(coalesce((select min(v.ligada_em) from automacao_versoes v where v.automacao_id = a.id), app_now()))::date;
  v_hoje date := hoje_brasilia();
  v uuid[];
begin
  select coalesce(array_agg(d.id order by d.pedido_em, d.criado_em), '{}') into v
    from documento_pedidos d join casos c on c.id = d.caso_id
    cross join lateral (select greatest(d.pedido_em, coalesce(d.repedido_em, d.pedido_em)) base) b
   where d.escritorio_id = a.escritorio_id and d.cliente_id = p_cliente and d.chegou_em is null and c.situacao = 'ANDAMENTO'
     and b.base + v_dias <= v_hoje
     and (a.entram_ja_atrasados or b.base + v_dias >= v_desde)
     and not exists (select 1 from automacao_execucoes x
                      where x.automacao_id = a.id and x.origem = 'DOCUMENTO' and d.id = any (x.documentos)
                        and automacao_local(x.iniciada_em)::date >= b.base);
  return v;
end $$;

-- A execução do documento pendente nasce com os pedidos que faltam (quem insere é o motor).
create function automacao_execucao_documentos() returns trigger
language plpgsql
set search_path = public
as $$
declare a automacoes;
begin
  if new.origem = 'DOCUMENTO' and new.documentos is null then
    select * into a from automacoes where id = new.automacao_id;
    new.documentos := automacao_docs_do_cliente(a, new.cliente_id);
  end if;
  return new;
end $$;
create trigger automacao_execucao_documentos before insert on automacao_execucoes
  for each row execute function automacao_execucao_documentos();

-- O último lembrete de documento do cliente: a última mensagem de uma automação de documento
-- pendente ou o último "Pedir de novo" (às 8h do dia, hora de Brasília).
create function automacao_ultimo_lembrete_doc(p_escritorio uuid, p_cliente uuid) returns timestamptz
language sql stable
set search_path = public
as $$
  select greatest(
    (select max(x.ultima_msg_em) from automacao_execucoes x join automacoes y on y.id = x.automacao_id
      where x.escritorio_id = p_escritorio and x.cliente_id = p_cliente and y.gatilho = 'DOCUMENTO_PENDENTE'),
    (select max((d.repedido_em + time '08:00') at time zone 'America/Sao_Paulo') from documento_pedidos d
      where d.escritorio_id = p_escritorio and d.cliente_id = p_cliente and d.repedido_em is not null))
$$;

-- Saiu da automação: a parcela paga ou, no documento pendente, todos os documentos chegaram (ou
-- o caso encerrou).
create or replace function automacao_pagou(e automacao_execucoes, a automacoes) returns boolean
language sql stable
set search_path = public
as $$
  select (a.gatilho in ('PARCELA_ATRASO', 'PARCELA_VAI_VENCER')
          and exists (select 1 from recebimentos_previstos r
                       where r.id = e.origem_id and (r.cancelado_em is not null or parcela_recebido(r.id) >= r.valor)))
      or (a.gatilho = 'DOCUMENTO_PENDENTE' and e.documentos is not null
          and not exists (select 1 from documento_pedidos d join casos c on c.id = d.caso_id
                           where d.id = any (e.documentos) and d.chegou_em is null and c.situacao = 'ANDAMENTO'))
$$;

-- Quem recebe a conversa num passo "Passar para uma pessoa". Agora também quem pediu o
-- documento, e quem cuida do caso do documento ou quem atende o cliente novo.
create or replace function automacao_pessoa_do_passo(e automacao_execucoes, a automacoes, p jsonb) returns uuid
language plpgsql stable
set search_path = public
as $$
declare v uuid; v_parcela uuid := automacao_parcela(e); v_doc documento_pedidos;
begin
  if e.origem = 'DOCUMENTO' then
    select d.* into v_doc from documento_pedidos d where d.id = any (e.documentos)
     order by (d.chegou_em is null) desc, d.pedido_em, d.criado_em limit 1;
  end if;
  if p ->> 'pessoaId' is not null then
    v := (p ->> 'pessoaId')::uuid;
    if pessoa_do_escritorio(v, e.escritorio_id) then return v; end if;
  elsif p ->> 'regra' in ('QUEM_CUIDA', 'QUEM_PEDIU') then
    if p ->> 'regra' = 'QUEM_PEDIU' and v_doc.id is not null and pessoa_do_escritorio(v_doc.pedido_por, e.escritorio_id) then
      return v_doc.pedido_por;
    end if;
    if v_parcela is not null then
      select c.responsavel_id into v from recebimentos_previstos r join contratos c on c.id = r.contrato_id where r.id = v_parcela;
    elsif e.origem = 'COMPROMISSO' then
      select c.responsavel_id into v from compromissos c where c.id = e.origem_id;
    elsif e.origem = 'DOCUMENTO' then
      select c.responsavel_id into v from casos c where c.id = v_doc.caso_id;
    elsif e.origem = 'CLIENTE' then
      v := automacao_quem_atende(e.escritorio_id, e.cliente_id);
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

-- Para quem a execução passaria se o cliente não responder: o "Passar para pessoa" do caminho
-- "Não respondeu" (ou o do caminho principal). Nulo: não passa para ninguém.
create function automacao_passa_para(e automacao_execucoes, a automacoes) returns uuid
language plpgsql stable
set search_path = public
as $$
declare v_fluxo jsonb := automacao_fluxo_da_execucao(e); p jsonb;
begin
  select y into p from jsonb_array_elements(v_fluxo -> 'passos') x, jsonb_array_elements(coalesce(x -> 'ramos', '[]'::jsonb)) r,
                       jsonb_array_elements(r -> 'passos') y
   where x ->> 'tipo' = 'RAMOS' and r ->> 'quando' = 'NADA' and y ->> 'tipo' = 'PESSOA' limit 1;
  if p is null then
    select x into p from jsonb_array_elements(v_fluxo -> 'passos') x where x ->> 'tipo' = 'PESSOA' limit 1;
  end if;
  if p is null then return null; end if;
  return automacao_pessoa_do_passo(e, a, p);
end $$;

-- ---------------------------------------------------------------------------------------
-- O formato e os erros do fluxo.

create or replace function automacao_forma_passo(p_gatilho text, p jsonb, p_nivel integer, p_pos integer, p_ultimo boolean) returns text
language plpgsql immutable
set search_path = public
as $$
declare
  v_tipo text := p ->> 'tipo';
  v_chaves text[];
  v_ok text[];
  r jsonb;
  v_quando text[] := '{}';
  v_x text;
begin
  if jsonb_typeof(p) <> 'object' then return 'passo não é objeto'; end if;
  if coalesce(p ->> 'id', '') !~ '^[a-z0-9-]{1,40}$' then return 'passo sem id'; end if;
  select array_agg(k) into v_chaves from jsonb_object_keys(p) k;
  v_ok := case v_tipo
    when 'GATILHO' then array['id', 'tipo', 'dias', 'conta']
    when 'CONDICOES' then array['id', 'tipo', 'semCombinado']
    when 'MENSAGEM' then array['id', 'tipo', 'nome', 'texto', 'modeloId', 'aviso']
    when 'ESPERA' then array['id', 'tipo', 'dias', 'horasAntes']
    when 'RAMOS' then array['id', 'tipo', 'ramos']
    when 'IA' then array['id', 'tipo']
    when 'PESSOA' then array['id', 'tipo', 'pessoaId', 'regra', 'motivo']
    when 'FIM' then array['id', 'tipo', 'texto'] end;
  if v_ok is null then return 'tipo de passo desconhecido'; end if;
  if not v_chaves <@ v_ok then return 'campo desconhecido no passo ' || (p ->> 'id'); end if;
  if (v_tipo = 'GATILHO') <> (p_nivel = 0 and p_pos = 1) then return 'o gatilho é só o primeiro passo'; end if;
  if v_tipo in ('FIM', 'PESSOA', 'RAMOS') and not p_ultimo then return 'nada vem depois de ' || v_tipo; end if;

  if v_tipo = 'GATILHO' then
    if p_gatilho = 'PARCELA_ATRASO' then
      if jsonb_typeof(p -> 'dias') <> 'number' or (p ->> 'dias')::numeric not between 1 and 60 or (p ->> 'dias')::numeric % 1 <> 0 then return 'dias do gatilho'; end if;
    elsif p_gatilho = 'PARCELA_VAI_VENCER' then
      if jsonb_typeof(p -> 'dias') <> 'number' or (p ->> 'dias')::numeric not between 1 and 30 or (p ->> 'dias')::numeric % 1 <> 0 then return 'dias do gatilho'; end if;
    elsif p_gatilho = 'CLIENTE_NOVO' then
      if coalesce(jsonb_typeof(p -> 'dias'), 'null') <> 'number' or (p ->> 'dias')::numeric not between 0 and 30 or (p ->> 'dias')::numeric % 1 <> 0 then return 'dias do gatilho'; end if;
      if coalesce(p ->> 'conta', '') not in ('FECHOU', 'CADASTRO') then return 'quem conta como cliente novo'; end if;
    elsif p_gatilho = 'DOCUMENTO_PENDENTE' then
      if coalesce(jsonb_typeof(p -> 'dias'), 'null') <> 'number' or (p ->> 'dias')::numeric not between 1 and 30 or (p ->> 'dias')::numeric % 1 <> 0 then return 'dias do gatilho'; end if;
    elsif coalesce(jsonb_typeof(p -> 'dias'), 'null') <> 'null' then return 'este gatilho não tem dias';
    end if;
    if p_gatilho <> 'CLIENTE_NOVO' and coalesce(jsonb_typeof(p -> 'conta'), 'null') <> 'null' then return 'este gatilho não tem conta'; end if;
  elsif v_tipo = 'CONDICOES' then
    if p_gatilho not in ('PARCELA_ATRASO', 'PARCELA_VAI_VENCER') then return 'condições só nos gatilhos de parcela'; end if;
    if jsonb_typeof(p -> 'semCombinado') <> 'boolean' then return 'condição sem combinado'; end if;
  elsif v_tipo = 'MENSAGEM' then
    if jsonb_typeof(p -> 'nome') <> 'string' or length(btrim(p ->> 'nome')) not between 1 and 80 then return 'nome da mensagem'; end if;
    if coalesce(jsonb_typeof(p -> 'texto'), 'null') not in ('null', 'string') or length(coalesce(p ->> 'texto', '')) > 1024 then return 'texto da mensagem'; end if;
    if coalesce(jsonb_typeof(p -> 'modeloId'), 'null') <> 'null' and (p ->> 'modeloId') !~ '^[0-9a-f-]{36}$' then return 'modelo da mensagem'; end if;
    if coalesce(jsonb_typeof(p -> 'aviso'), 'null') <> 'null' and p ->> 'aviso' is distinct from p_gatilho then return 'aviso da mensagem'; end if;
    if (case when p ->> 'texto' is not null then 1 else 0 end) + (case when p ->> 'modeloId' is not null then 1 else 0 end)
       + (case when p ->> 'aviso' is not null then 1 else 0 end) > 1 then return 'a mensagem tem um texto só'; end if;
  elsif v_tipo = 'ESPERA' then
    if coalesce(jsonb_typeof(p -> 'dias'), 'null') = 'number' then
      if (p ->> 'dias')::numeric not between 1 and 30 or (p ->> 'dias')::numeric % 1 <> 0
         or coalesce(jsonb_typeof(p -> 'horasAntes'), 'null') <> 'null' then return 'dias da espera'; end if;
    elsif coalesce(jsonb_typeof(p -> 'horasAntes'), 'null') = 'number' then
      if p_gatilho <> 'LEMBRETE_AUDIENCIA' or (p ->> 'horasAntes')::numeric not between 1 and 48 or (p ->> 'horasAntes')::numeric % 1 <> 0 then
        return 'horas antes só no lembrete de compromisso';
      end if;
    else return 'a espera tem dias ou horas antes';
    end if;
  elsif v_tipo = 'RAMOS' then
    if p_nivel > 0 then return 'ramo dentro de ramo'; end if;
    if jsonb_typeof(p -> 'ramos') <> 'array' or jsonb_array_length(p -> 'ramos') not between 2 and 3 then return 'ramos'; end if;
    for r in select * from jsonb_array_elements(p -> 'ramos') loop
      if jsonb_typeof(r) <> 'object' or jsonb_typeof(r -> 'passos') <> 'array'
         or exists (select 1 from jsonb_object_keys(r) k where k not in ('quando', 'passos')) then return 'ramo'; end if;
      v_x := r ->> 'quando';
      if v_x is null or not (v_x = any (automacao_ramos_validos(p_gatilho))) or v_x = any (v_quando) then return 'caminho do ramo'; end if;
      v_quando := v_quando || v_x;
      v_x := automacao_forma_seq(p_gatilho, r -> 'passos', 1);
      if v_x is not null then return v_x; end if;
    end loop;
  elsif v_tipo = 'PESSOA' then
    if coalesce(jsonb_typeof(p -> 'pessoaId'), 'null') <> 'null' and (p ->> 'pessoaId') !~ '^[0-9a-f-]{36}$' then return 'pessoa'; end if;
    -- Quem pediu o documento só existe no documento pendente; quem tem a área não existe no
    -- cliente novo, que é de Conversas (PA-06).
    if coalesce(p ->> 'regra', 'QUEM_CUIDA') not in ('QUEM_CUIDA', 'AREA', 'SOCIA_DONA', 'QUEM_PEDIU')
       or (p ->> 'regra' = 'QUEM_PEDIU' and p_gatilho <> 'DOCUMENTO_PENDENTE')
       or (p ->> 'regra' = 'AREA' and p_gatilho = 'CLIENTE_NOVO') then return 'regra da pessoa'; end if;
    if p ->> 'pessoaId' is not null and p ->> 'regra' is not null then return 'pessoa ou regra, não as duas'; end if;
    if coalesce(jsonb_typeof(p -> 'motivo'), 'null') not in ('null', 'string') or length(coalesce(p ->> 'motivo', '')) > 300 then return 'motivo da passagem'; end if;
  elsif v_tipo = 'FIM' then
    if coalesce(jsonb_typeof(p -> 'texto'), 'null') not in ('null', 'string') or length(coalesce(p ->> 'texto', '')) > 120 then return 'texto do fim'; end if;
  end if;
  return null;
end $$;


create or replace function automacao_erros_seq(p_escritorio uuid, p_automacao uuid, p_gatilho text, p_seq jsonb, p_dias integer, p_ultima integer,
                                    out erros jsonb, out ultima integer)
language plpgsql stable
set search_path = public
as $$
declare
  p jsonb;
  r jsonb;
  v_tipo text;
  v_campos text[];
  v_fora text[];
  v_dias integer := p_dias;
  v_ult integer := p_ultima;
  v_sub record;
  v_m automacao_modelos;
  v_texto text;
  v_n integer := jsonb_array_length(p_seq);
begin
  erros := '[]'::jsonb;
  for p in select * from jsonb_array_elements(p_seq) loop
    v_tipo := p ->> 'tipo';
    if v_tipo = 'GATILHO' then
      v_dias := coalesce((p ->> 'dias')::integer, 0);
    elsif v_tipo = 'ESPERA' then
      v_dias := v_dias + coalesce((p ->> 'dias')::integer, 0);
    elsif v_tipo = 'MENSAGEM' then
      v_texto := p ->> 'texto';
      v_m := null;
      if p ->> 'modeloId' is not null then
        select * into v_m from automacao_modelos where id = (p ->> 'modeloId')::uuid and automacao_id = p_automacao;
        v_texto := v_m.texto;
        if v_m.meta_situacao = 'RECUSADO' then
          erros := erros || jsonb_build_object('passo', p ->> 'id', 'codigo', 'TEXTO_RECUSADO', 'motivo', v_m.meta_motivo);
        end if;
      elsif p ->> 'aviso' is not null then
        select texto into v_texto from whatsapp_avisos where escritorio_id = p_escritorio and chave = p ->> 'aviso';
      end if;
      if p ->> 'aviso' is null and length(btrim(coalesce(v_texto, ''))) < 10 then
        erros := erros || jsonb_build_object('passo', p ->> 'id', 'codigo', 'TEXTO_VAZIO');
      elsif p ->> 'texto' is not null then
        v_campos := automacao_campos_do_texto(v_texto);
        select coalesce(array_agg(c), '{}') into v_fora from unnest(v_campos) c where not (c = any (automacao_campos(p_gatilho)));
        if cardinality(v_fora) > 0 then
          erros := erros || jsonb_build_object('passo', p ->> 'id', 'codigo', 'CAMPO_INEXISTENTE', 'campos', to_jsonb(v_fora));
        elsif not whatsapp_texto_aviso_valido(v_texto) then
          erros := erros || jsonb_build_object('passo', p ->> 'id', 'codigo', 'TEXTO_CAMPO_NA_PONTA');
        end if;
      end if;
      -- 1 cobrança por semana por parcela, no mesmo caminho.
      if p_gatilho in ('PARCELA_ATRASO', 'DOCUMENTO_PENDENTE') then
        if v_ult is not null and v_dias - v_ult < 7 then
          erros := erros || jsonb_build_object('passo', p ->> 'id', 'codigo', 'LIMITE_SEMANAL', 'dias', v_dias - v_ult);
        end if;
        v_ult := v_dias;
      end if;
    elsif v_tipo = 'PESSOA' then
      if p ->> 'pessoaId' is null and p ->> 'regra' is null then
        erros := erros || jsonb_build_object('passo', p ->> 'id', 'codigo', 'RESPONSAVEL_OBRIGATORIO');
      elsif p ->> 'pessoaId' is not null and not exists (
          select 1 from vinculos v where v.pessoa_id = (p ->> 'pessoaId')::uuid and v.escritorio_id = p_escritorio
             and v.revogado_em is null and v.funcao in ('SOCIO', 'EQUIPE')) then
        erros := erros || jsonb_build_object('passo', p ->> 'id', 'codigo', 'RESPONSAVEL_INVALIDO');
      end if;
    elsif v_tipo = 'RAMOS' then
      for r in select * from jsonb_array_elements(p -> 'ramos') loop
        if jsonb_array_length(r -> 'passos') = 0 then
          erros := erros || jsonb_build_object('passo', p ->> 'id', 'ramo', r ->> 'quando', 'codigo', 'PASSO_SEM_SAIDA');
        else
          -- Pagar encerra a cobrança: o caminho "se pagou" não conta para o limite.
          select * into v_sub from automacao_erros_seq(p_escritorio, p_automacao, p_gatilho, r -> 'passos', v_dias,
                                                       case when r ->> 'quando' in ('PAGOU', 'CHEGOU') then null else v_ult end);
          erros := erros || v_sub.erros;
        end if;
      end loop;
    end if;
  end loop;
  p := p_seq -> (v_n - 1);
  if p ->> 'tipo' not in ('FIM', 'PESSOA', 'RAMOS') then
    erros := erros || jsonb_build_object('passo', p ->> 'id', 'codigo', 'PASSO_SEM_SAIDA');
  end if;
  ultima := v_ult;
end $$;


-- ---------------------------------------------------------------------------------------
-- O motor.

create or replace function automacao_candidatos(a automacoes) returns table (cliente_id uuid, origem text, origem_id uuid, rotulo text)
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
  elsif a.gatilho = 'CLIENTE_NOVO' then
    -- Quem virou cliente depois de ligar e chegou aos dias do gatilho; uma vez por cliente, em
    -- todas as boas-vindas. Importados da planilha nunca entram (PA-06, decisão 1).
    return query
      select k.id, 'CLIENTE', k.id, left(k.nome, 160)
        from clientes_escritorio k
        cross join lateral (select automacao_virou_cliente(k, coalesce(v_fluxo #>> '{passos,0,conta}', 'FECHOU')) dia) q
       where k.escritorio_id = a.escritorio_id and k.estado = 'ATIVO' and k.importacao_id is null
         and q.dia is not null and q.dia >= automacao_local(v_desde)::date and q.dia + v_dias <= v_hoje
         and not exists (select 1 from automacao_execucoes x join automacoes y on y.id = x.automacao_id
                          where x.escritorio_id = a.escritorio_id and x.cliente_id = k.id and y.gatilho = 'CLIENTE_NOVO');
  elsif a.gatilho = 'DOCUMENTO_PENDENTE' then
    -- Um lembrete por cliente com tudo o que falta (decisão 3). Quem já está numa execução
    -- andando desta automação espera ela acabar.
    return query
      select k.id, 'DOCUMENTO', md5(a.id::text || k.id::text || array_to_string(dd.docs, ','))::uuid,
             left('Documentos · ' || (select string_agg(d.descricao, ', ' order by d.pedido_em, d.criado_em) from documento_pedidos d where d.id = any (dd.docs)), 160)
        from clientes_escritorio k
        cross join lateral (select automacao_docs_do_cliente(a, k.id) docs) dd
       where k.escritorio_id = a.escritorio_id and cardinality(dd.docs) > 0
         and not exists (select 1 from automacao_execucoes x where x.automacao_id = a.id and x.cliente_id = k.id and x.proximo_em is not null);
  end if;
end $$;


create or replace function automacao_campos_execucao(e automacao_execucoes, a automacoes) returns jsonb
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
  elsif e.origem = 'CLIENTE' then
    v := v || jsonb_build_object('quem atende', (select pe.nome from pessoas pe where pe.id = automacao_quem_atende(e.escritorio_id, e.cliente_id)),
                                 'horário de atendimento', automacao_horario_texto(e.escritorio_id));
  elsif e.origem = 'DOCUMENTO' then
    -- Só o que ainda falta, em casos em andamento (decisão de design 8).
    select v || jsonb_build_object(
             'documentos', automacao_lista(array_agg(d.descricao order by d.pedido_em, d.criado_em)),
             'caso', automacao_lista(array_agg(distinct c.nome)),
             'pedido em', to_char(min(d.pedido_em), 'DD/MM')) into v
      from documento_pedidos d join casos c on c.id = d.caso_id
     where d.id = any (e.documentos) and d.chegou_em is null and c.situacao = 'ANDAMENTO'
    having count(*) > 0;
  end if;
  return v;
end $$;


create or replace function automacao_andar(p_execucao uuid) returns text
language plpgsql
set search_path = public
as $$
declare
  e automacao_execucoes; a automacoes; v_fluxo jsonb; p jsonb; v_texto text; v_conv uuid; v_quando text; r jsonb;
  v_ultima timestamptz; v_pessoa uuid; v_passos integer := 0; c conversas; v_comp timestamptz; v_parcela uuid; v_sai text;
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
  -- O que faz sair: a parcela paga ou, no documento pendente, o documento que chegou (PA-06).
  v_sai := case when a.gatilho = 'DOCUMENTO_PENDENTE' then 'CHEGOU' else 'PAGOU' end;
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
    if automacao_pagou(e, a) and coalesce(e.ramo, '') <> v_sai then
      if p ->> 'tipo' = 'RAMOS' and exists (select 1 from jsonb_array_elements(p -> 'ramos') x where x ->> 'quando' = v_sai) then
        null;
      elsif exists (select 1 from jsonb_array_elements(v_fluxo -> 'passos') x
                     where x ->> 'tipo' = 'RAMOS' and exists (select 1 from jsonb_array_elements(x -> 'ramos') y where y ->> 'quando' = v_sai))
            and e.ramo is null then
        -- Pula a espera e vai direto aos caminhos.
        e.passo_id := (select x ->> 'id' from jsonb_array_elements(v_fluxo -> 'passos') x where x ->> 'tipo' = 'RAMOS' limit 1);
        continue;
      else
        if v_sai = 'CHEGOU' then
          e.caminho := automacao_caminho_mais(e, 'chegou', 'Chegou');
          perform automacao_encerrar(e, 'CONCLUIDA', 'Chegou: o documento saiu da automação.');
        else
          e.caminho := automacao_caminho_mais(e, 'pagou', 'Pagou');
          perform automacao_encerrar(e, 'CONCLUIDA', 'Pagou: a parcela saiu da automação.');
        end if;
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
      -- 1 lembrete de documento por semana por cliente, somando as automações e o "Pedir de
      -- novo" (PA-06, decisão 4).
      if a.gatilho = 'DOCUMENTO_PENDENTE' then
        v_ultima := automacao_ultimo_lembrete_doc(e.escritorio_id, e.cliente_id);
        if v_ultima is not null and v_ultima > app_now() - interval '7 days' then
          e.caminho := automacao_caminho_mais(e, p ->> 'id', 'Espera o limite de 1 lembrete por semana', 'ESPERA');
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
      insert into conversa_mensagens (escritorio_id, conversa_id, autor, texto, aviso_tipo, envio, dados)
      values (e.escritorio_id, v_conv, 'AVISO', v_texto, left(coalesce(p ->> 'nome', a.nome), 60), 'NA_FILA',
              jsonb_build_object('execucao', e.id, 'automacao', a.id, 'passo', p ->> 'id'));
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
      v_quando := case when automacao_pagou(e, a) then v_sai when automacao_respondeu(e) then 'RESPONDEU' else 'NADA' end;
      select x into r from jsonb_array_elements(p -> 'ramos') x where x ->> 'quando' = v_quando;
      if r is null then
        v_quando := 'NADA';
        select x into r from jsonb_array_elements(p -> 'ramos') x where x ->> 'quando' = 'NADA';
      end if;
      e.ramo := v_quando;
      e.caminho := automacao_caminho_mais(e, (p ->> 'id') || ':' || v_quando,
        case v_quando when 'PAGOU' then 'Pagou' when 'CHEGOU' then 'Chegou' when 'RESPONDEU' then 'Respondeu' else 'Não respondeu' end);
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


-- ---------------------------------------------------------------------------------------
-- Quem entraria (testar).

-- Cliente novo: quem teria entrado nos últimos 30 dias, e quem ficaria de fora com o motivo (os
-- importados juntos numa linha só). Documento pendente: os clientes com documento faltando, cada
-- um com quando entra (já pendente hoje, amanhã, ou espera porque pediram de novo).
create function automacao_quem_entraria_novos(a automacoes) returns jsonb
language plpgsql stable
set search_path = public
as $$
declare
  v_hoje date := hoje_brasilia();
  v_dias integer := coalesce((a.rascunho #>> '{passos,0,dias}')::integer, case when a.gatilho = 'CLIENTE_NOVO' then 0 else 5 end);
  v_conta text := coalesce(a.rascunho #>> '{passos,0,conta}', 'FECHOU');
  v_itens jsonb;
  v_imp jsonb;
begin
  if a.gatilho = 'CLIENTE_NOVO' then
    select coalesce(jsonb_agg(x.j order by x.ord, x.dia desc), '[]'::jsonb) into v_itens from (
      select q.dia, case when fora.motivo is null then 0 else 1 end ord,
             jsonb_build_object(
               'origem', jsonb_build_object('id', k.id, 'descricao', q.como, 'quando', coalesce(q.dia, automacao_local(k.criado_em)::date)),
               'cliente', jsonb_build_object('id', k.id, 'nome', k.nome),
               'contato', jsonb_build_object('nome', ct ->> 'nome', 'papel', ct ->> 'papel'),
               'quemAtende', pessoa_ref(automacao_quem_atende(k.escritorio_id, k.id)),
               'entra', fora.motivo is null, 'motivo', fora.motivo, 'detalhe', fora.detalhe) j
        from clientes_escritorio k
        cross join lateral (select automacao_virou_cliente(k, v_conta) dia) v
        cross join lateral (select v.dia,
               case when v_conta = 'CADASTRO' then 'Cadastrado'
                    when (select min(p.respondida_em) from propostas p where p.cliente_id = k.id and p.estado = 'ACEITA') = v.dia then 'Aceitou a proposta'
                    when v.dia is not null then 'Contrato assinado'
                    else 'Cadastrado, ainda sem proposta aceita nem contrato' end como) q
        cross join lateral (select contato_principal(k.contatos) ct) cc
        left join lateral (select s.quem_pediu, s.pedido_em, s.tipo from clientes_sem_avisos s
                            where s.cliente_id = k.id and s.retirado_em is null and s.tipo = 'TODOS' limit 1) sa_ on true
        cross join lateral (
          select case when q.dia is null then 'AINDA_NAO'
                      when exists (select 1 from automacao_execucoes x join automacoes y on y.id = x.automacao_id
                                    where x.cliente_id = k.id and y.gatilho = 'CLIENTE_NOVO') then 'JA_RECEBEU'
                      when sa_.tipo is not null then 'SEM_AVISOS'
                      when ct ->> 'telefone' is null or telefone_fixo_br(ct ->> 'telefone') then 'SEM_WHATSAPP' end motivo,
                 case when sa_.tipo is not null then jsonb_build_object('quemPediu', sa_.quem_pediu, 'em', sa_.pedido_em, 'tipo', sa_.tipo) end detalhe) fora
       where k.escritorio_id = a.escritorio_id and k.estado = 'ATIVO' and k.importacao_id is null
         and ((q.dia is not null and q.dia between v_hoje - 30 and v_hoje)
              or (q.dia is null and k.criado_em >= app_now() - interval '30 days'))
       limit 200) x;
    -- Os importados da planilha nos últimos 30 dias, numa linha por importação.
    select coalesce(jsonb_agg(jsonb_build_object(
             'origem', jsonb_build_object('id', i.id, 'descricao', 'Importação de planilha', 'quando', automacao_local(i.importado_em)::date),
             'cliente', jsonb_build_object('id', i.id, 'nome', i.n || case when i.n = 1 then ' cliente da planilha' else ' clientes da planilha' end),
             'contato', jsonb_build_object('nome', null, 'papel', null),
             'quantos', i.n, 'entra', false, 'motivo', 'IMPORTADO', 'detalhe', null) order by i.importado_em desc), '[]'::jsonb) into v_imp
      from (select im.id, im.importado_em, count(k.id) n from importacoes im join clientes_escritorio k on k.importacao_id = im.id
             where im.escritorio_id = a.escritorio_id and im.importado_em >= app_now() - interval '30 days'
             group by im.id, im.importado_em) i;
    return jsonb_build_object('disponivel', true, 'dias', v_dias, 'itens', v_itens || v_imp);
  end if;

  -- Documento pendente.
  select coalesce(jsonb_agg(x.j order by x.ord, x.entra_em, x.nome), '[]'::jsonb) into v_itens from (
    select k.nome, g.entra_em,
           case when fora.motivo is not null then 2 when g.entra_em <= v_hoje + 1 then 0 else 1 end ord,
           jsonb_build_object(
             'origem', jsonb_build_object('id', g.primeiro, 'descricao', g.descricoes, 'quando', g.entra_em),
             'cliente', jsonb_build_object('id', k.id, 'nome', k.nome),
             'contato', jsonb_build_object('nome', ct ->> 'nome', 'papel', ct ->> 'papel'),
             'documentos', g.docs,
             'quando', case when g.entra_em <= v_hoje then 'HOJE' when g.entra_em = v_hoje + 1 then 'AMANHA' else 'ESPERA' end,
             'jaEmAtraso', g.entra_em <= v_hoje,
             'repedido', g.repedido,
             'entra', fora.motivo is null, 'motivo', fora.motivo, 'detalhe', fora.detalhe) j
      from (select d.cliente_id,
                   min(greatest(d.pedido_em, coalesce(d.repedido_em, d.pedido_em)) + v_dias) entra_em,
                   (array_agg(d.id order by d.pedido_em, d.criado_em))[1] primeiro,
                   automacao_lista(array_agg(d.descricao order by d.pedido_em, d.criado_em)) descricoes,
                   max(d.repedido_em) repedido,
                   jsonb_agg(jsonb_build_object('id', d.id, 'descricao', d.descricao, 'caso', jsonb_build_object('id', c.id, 'nome', c.nome),
                                                'pedidoEm', d.pedido_em, 'repedidoEm', d.repedido_em, 'pedidoPor', pessoa_ref(d.pedido_por))
                             order by d.pedido_em, d.criado_em) docs
              from documento_pedidos d join casos c on c.id = d.caso_id
             where d.escritorio_id = a.escritorio_id and d.chegou_em is null and c.situacao = 'ANDAMENTO'
             group by d.cliente_id) g
      join clientes_escritorio k on k.id = g.cliente_id
      cross join lateral (select contato_principal(k.contatos) ct) cc
      left join lateral (select s.quem_pediu, s.pedido_em, s.tipo from clientes_sem_avisos s
                          where s.cliente_id = k.id and s.retirado_em is null and s.tipo = 'TODOS' limit 1) sa_ on true
      cross join lateral (
        select case when sa_.tipo is not null then 'SEM_AVISOS'
                    when ct ->> 'telefone' is null or telefone_fixo_br(ct ->> 'telefone') then 'SEM_WHATSAPP' end motivo,
               case when sa_.tipo is not null then jsonb_build_object('quemPediu', sa_.quem_pediu, 'em', sa_.pedido_em, 'tipo', sa_.tipo) end detalhe) fora
     where g.entra_em <= v_hoje + 7
     limit 200) x;
  return jsonb_build_object('disponivel', true, 'dias', v_dias, 'itens', v_itens);
end $$;

create or replace function portal_automacao_quem_entraria(p_pessoa uuid, p_escritorio uuid, p_id uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare a automacoes; v_dias integer; v_hoje date := hoje_brasilia(); v_itens jsonb;
begin
  a := automacao_para_ler(p_pessoa, p_escritorio, p_id);
  if a.gatilho in ('CLIENTE_NOVO', 'DOCUMENTO_PENDENTE') then
    return automacao_quem_entraria_novos(a);
  elsif a.gatilho in ('ETAPA_CASO', 'LEMBRETE_AUDIENCIA') then
    return automacao_quem_entraria_juridico(a);
  elsif a.gatilho not in ('PARCELA_ATRASO', 'PARCELA_VAI_VENCER') then
    return jsonb_build_object('disponivel', false, 'itens', '[]'::jsonb);
  end if;
  v_dias := coalesce((a.rascunho #>> '{passos,0,dias}')::integer, 1);
  select coalesce(jsonb_agg(x.j order by x.ord, x.venc), '[]'::jsonb) into v_itens from (
    select r.vencimento venc,
           case when fora.motivo is null then 0 else 1 end ord,
           jsonb_build_object(
             'parcela', jsonb_build_object('id', r.id, 'descricao', r.descricao, 'valor', r.valor - parcela_recebido(r.id), 'vencimento', r.vencimento),
             'origem', jsonb_build_object('id', r.id, 'descricao', r.descricao, 'quando', r.vencimento),
             'cliente', jsonb_build_object('id', k.id, 'nome', k.nome),
             'contato', jsonb_build_object('nome', ct ->> 'nome', 'papel', ct ->> 'papel'),
             'diasAtraso', v_hoje - r.vencimento,
             'jaEmAtraso', a.gatilho = 'PARCELA_ATRASO' and v_hoje - r.vencimento > v_dias,
             'entra', fora.motivo is null, 'motivo', fora.motivo, 'detalhe', fora.detalhe) j
      from recebimentos_previstos r
      join contratos c on c.id = r.contrato_id
      join clientes_escritorio k on k.id = c.cliente_id
      cross join lateral (select automacao_contato(k) ct) cc
      cross join lateral (select parcela_cobranca(r.id) cob) cb
      cross join lateral (
        select case
          when exists (select 1 from clientes_sem_avisos s where s.cliente_id = k.id and s.retirado_em is null) then 'SEM_AVISOS'
          when ct ->> 'telefone' is null or telefone_fixo_br(ct ->> 'telefone') then 'SEM_WHATSAPP'
          when (select (x.value ->> 'semCombinado')::boolean from jsonb_array_elements(a.rascunho -> 'passos') x where x.value ->> 'tipo' = 'CONDICOES' limit 1)
               and (cob ->> 'proxData')::date > v_hoje then 'COMBINADO' end motivo,
          case
          when exists (select 1 from clientes_sem_avisos s where s.cliente_id = k.id and s.retirado_em is null)
            then (select jsonb_build_object('quemPediu', s.quem_pediu, 'em', s.pedido_em, 'tipo', s.tipo)
                    from clientes_sem_avisos s where s.cliente_id = k.id and s.retirado_em is null limit 1)
          when (cob ->> 'proxData')::date > v_hoje then jsonb_build_object('oQue', cob ->> 'proxOque', 'data', cob ->> 'proxData') end detalhe) fora
     where r.escritorio_id = p_escritorio and r.cancelado_em is null and r.valor is not null
       and parcela_recebido(r.id) < r.valor
       and case when a.gatilho = 'PARCELA_ATRASO' then v_hoje - r.vencimento >= v_dias
                else r.vencimento = v_hoje + v_dias end
     limit 200) x;
  return jsonb_build_object('disponivel', true, 'dias', v_dias, 'itens', v_itens);
end $$;


-- ---------------------------------------------------------------------------------------
-- Montar, ligar e a IA: as de Conversas qualquer pessoa da equipe monta; os dois gatilhos novos
-- começam com os dias do desenho.

create or replace function portal_automacao_criar(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_gatilho text := p_dados ->> 'gatilho'; v_nome text := btrim(coalesce(p_dados ->> 'nome', '')); v_id uuid; v_fluxo jsonb;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'conversas.editar');
  perform portal_exigir_escrita(p_pessoa, p_escritorio);
  if automacao_area(v_gatilho) is null then perform recusar_campos('Escolha quando a automação começa', 'gatilho'); end if;
  if length(v_nome) not between 3 and 80 then perform recusar_campos('Dê um nome de 3 a 80 letras', 'nome'); end if;
  if not automacao_pode_montar(p_pessoa, p_escritorio, automacao_area(v_gatilho)) then
    raise exception 'Área não liberada para esta pessoa' using errcode = 'TC401',
      detail = jsonb_build_object('motivo', 'AREA_NAO_LIBERADA')::text;
  end if;
  perform automacoes_garantir(p_escritorio);
  v_fluxo := jsonb_build_object('passos', jsonb_build_array(
    case when v_gatilho = 'PARCELA_ATRASO' then jsonb_build_object('id', 'gatilho', 'tipo', 'GATILHO', 'dias', 3)
         when v_gatilho = 'PARCELA_VAI_VENCER' then jsonb_build_object('id', 'gatilho', 'tipo', 'GATILHO', 'dias', 3)
         when v_gatilho = 'CLIENTE_NOVO' then jsonb_build_object('id', 'gatilho', 'tipo', 'GATILHO', 'dias', 0, 'conta', 'FECHOU')
         when v_gatilho = 'DOCUMENTO_PENDENTE' then jsonb_build_object('id', 'gatilho', 'tipo', 'GATILHO', 'dias', 5)
         else jsonb_build_object('id', 'gatilho', 'tipo', 'GATILHO') end,
    jsonb_build_object('id', 'msg', 'tipo', 'MENSAGEM', 'nome', left(v_nome, 80), 'texto', ''),
    jsonb_build_object('id', 'fim', 'tipo', 'FIM')));
  if v_gatilho in ('PARCELA_ATRASO', 'PARCELA_VAI_VENCER') then
    v_fluxo := jsonb_build_object('passos', jsonb_insert(v_fluxo -> 'passos', '{1}', jsonb_build_object('id', 'cond', 'tipo', 'CONDICOES', 'semCombinado', true)));
  end if;
  insert into automacoes (escritorio_id, nome, origem, gatilho, area, rascunho, criada_por, atualizada_por)
  values (p_escritorio, v_nome, 'ESCRITORIO', v_gatilho, automacao_area(v_gatilho), v_fluxo, p_pessoa, p_pessoa)
  returning id into v_id;
  insert into automacao_eventos (escritorio_id, automacao_id, tipo, pessoa_id) values (p_escritorio, v_id, 'CRIADA', p_pessoa);
  perform registrar_historico('automacao.criada', 'automacoes', v_id::text, jsonb_build_object('gatilho', v_gatilho));
  return portal_automacao(p_pessoa, p_escritorio, v_id);
end $$;


create or replace function portal_automacao_salvar(p_pessoa uuid, p_escritorio uuid, p_id uuid, p_versao integer, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare a automacoes; v_fluxo jsonb := coalesce(p_dados -> 'fluxo', null); v_nome text := btrim(p_dados ->> 'nome'); v_x text; v_sug jsonb;
begin
  a := automacao_para_mudar(p_pessoa, p_escritorio, p_id);
  perform portal_exigir_escrita(p_pessoa, p_escritorio);
  if not automacao_pode_montar(p_pessoa, p_escritorio, a.area) then
    raise exception 'Área não liberada para esta pessoa' using errcode = 'TC401', detail = jsonb_build_object('motivo', 'AREA_NAO_LIBERADA')::text;
  end if;
  if v_nome is not null and (length(v_nome) not between 3 and 80 or a.origem = 'PRONTA') then
    perform recusar_campos('Dê um nome de 3 a 80 letras', 'nome');
  end if;
  if v_fluxo is not null then
    v_x := automacao_forma(a.gatilho, v_fluxo);
    if v_x is not null then
      raise exception 'O desenho não está no formato: %', v_x using errcode = 'TC422',
        detail = jsonb_build_object('campos', jsonb_build_array('fluxo'), 'forma', v_x)::text;
    end if;
    -- Os avisos só nas prontas, e os modelos só os desta automação.
    if a.origem <> 'PRONTA' and exists (select 1 from jsonb_path_query(v_fluxo, 'strict $.**') x where jsonb_typeof(x) = 'object' and x ? 'aviso' and x ->> 'aviso' is not null) then
      perform recusar_campos('O texto do aviso pronto é só das prontas', 'fluxo');
    end if;
    if exists (select 1 from unnest(automacao_modelos_do_fluxo(v_fluxo)) m
                where not exists (select 1 from automacao_modelos o where o.id = m and o.automacao_id = a.id)) then
      perform recusar_campos('O texto aprovado não é desta automação', 'fluxo');
    end if;
  end if;
  -- F3.59: aplicar ou recusar sugestões da IA muda também o que sobra da sugestão (nula quando
  -- não sobra nada). A sugestão só encolhe por aqui; quem a cria é portal_automacao_ia_sugerir.
  if p_dados ? 'sugestao' then
    if jsonb_typeof(p_dados -> 'sugestao') = 'null' then
      v_sug := null;
    elsif a.sugestao is null or jsonb_typeof(p_dados -> 'sugestao') <> 'object' or automacao_forma(a.gatilho, p_dados -> 'sugestao' -> 'fluxo') is not null
          or exists (select 1 from jsonb_object_keys(p_dados -> 'sugestao') k where k <> 'fluxo') then
      perform recusar_campos('A sugestão não está no formato', 'sugestao');
    else
      v_sug := a.sugestao || jsonb_build_object('fluxo', p_dados -> 'sugestao' -> 'fluxo');
    end if;
  else
    v_sug := a.sugestao;
  end if;
  update automacoes set rascunho = coalesce(v_fluxo, rascunho), nome = coalesce(v_nome, nome), sugestao = v_sug,
                        atualizada_por = p_pessoa, atualizada_em = app_now()
   where id = a.id and versao = p_versao;
  if not found then perform conflito_versao('automacoes', a.id); end if;
  return portal_automacao(p_pessoa, p_escritorio, a.id);
end $$;


create or replace function portal_automacao_ligar(p_pessoa uuid, p_escritorio uuid, p_id uuid, p_versao integer, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a automacoes;
  v_conf jsonb;
  v_numero integer;
  v_novos uuid[];
  o automacoes;
  v_igual boolean;
begin
  a := automacao_para_mudar(p_pessoa, p_escritorio, p_id);
  perform so_socio_dono(p_pessoa, p_escritorio);
  perform portal_exigir_escrita(p_pessoa, p_escritorio);
  if not whatsapp_ligado(p_escritorio) then perform recusar_motivo('O WhatsApp do escritório não está ligado', 'WHATSAPP_NAO_LIGADO'); end if;
  if jsonb_array_length(automacao_erros(a)) > 0 then perform recusar_motivo('Ajuste os passos antes de ligar', 'FLUXO_COM_ERRO'); end if;
  if jsonb_array_length(automacao_textos_por_aprovar(a.rascunho)) > 0 then perform recusar_motivo('Aprove os textos antes de ligar', 'TEXTO_NAO_APROVADO'); end if;
  v_igual := coalesce(a.rascunho = automacao_fluxo_valendo(a), false);
  if a.situacao = 'LIGADA' and v_igual then perform recusar_motivo('A automação já está ligada', 'AUTOMACAO_JA_LIGADA'); end if;
  if a.situacao = 'EM_APROVACAO' and v_igual then perform recusar_motivo('Esta versão já espera a Meta', 'JA_EM_APROVACAO'); end if;
  if not coalesce((p_dados ->> 'revisou')::boolean, false) then perform recusar_campos('Confirme que revisou', 'revisou'); end if;
  v_conf := automacao_conflitos(a);
  if jsonb_array_length(v_conf) > 0 and not coalesce((p_dados ->> 'desligarConflitos')::boolean, false) then
    perform recusar_motivo('Outra cobrança ligada mandaria mensagem na mesma semana', 'CONFLITO_LIMITE_SEMANAL');
  end if;
  if a.versao <> p_versao then perform conflito_versao('automacoes', a.id); end if;

  -- Desliga as que conflitam, com o motivo e o registro.
  for o in select x.* from automacoes x join jsonb_array_elements(v_conf) c on (c ->> 'id')::uuid = x.id loop
    update automacoes set situacao = 'DESLIGADA', versao_aguardando = null, aguardando_desde = null,
                          desligada_por = p_pessoa, desligada_em = app_now(),
                          desligada_motivo = left('Desligada ao ligar “' || a.nome || '”: as duas cobrariam na mesma semana', 600),
                          atualizada_por = p_pessoa, atualizada_em = app_now()
     where id = o.id;
    insert into automacao_eventos (escritorio_id, automacao_id, tipo, detalhe, pessoa_id)
    values (p_escritorio, o.id, 'DESLIGADA_POR_CONFLITO', jsonb_build_object('por', a.id, 'nome', a.nome), p_pessoa);
  end loop;

  if v_igual then
    v_numero := coalesce(a.versao_aguardando, a.versao_ligada);
  else
    v_numero := coalesce((select max(numero) from automacao_versoes where automacao_id = a.id), 0) + 1;
    insert into automacao_versoes (escritorio_id, automacao_id, numero, fluxo, ligada_por)
    values (p_escritorio, a.id, v_numero, a.rascunho, p_pessoa);
  end if;

  select coalesce(array_agg(m.id), '{}') into v_novos from automacao_modelos m
   where m.id = any (automacao_modelos_do_fluxo(a.rascunho)) and m.meta_situacao <> 'APROVADO';
  if cardinality(v_novos) > 0 then
    -- O envio à Meta é do serviço do WhatsApp (F3.58): o texto fica em análise até a resposta.
    update automacao_modelos set meta_situacao = 'EM_ANALISE', meta_em = app_now(), meta_motivo = null
     where id = any (v_novos) and meta_situacao <> 'EM_ANALISE';
    update automacoes set situacao = 'EM_APROVACAO', versao_aguardando = v_numero, aguardando_desde = app_now(),
                          entram_ja_atrasados = coalesce((p_dados ->> 'entramJaAtrasados')::boolean, false) and gatilho in ('PARCELA_ATRASO', 'DOCUMENTO_PENDENTE'),
                          desligada_por = null, desligada_em = null, desligada_motivo = null,
                          atualizada_por = p_pessoa, atualizada_em = app_now()
     where id = a.id;
    insert into automacao_eventos (escritorio_id, automacao_id, tipo, detalhe, pessoa_id)
    values (p_escritorio, a.id, 'EM_APROVACAO', jsonb_build_object('numero', v_numero, 'modelos', to_jsonb(v_novos)), p_pessoa);
  else
    update automacoes set situacao = 'LIGADA', versao_ligada = v_numero, versao_aguardando = null, aguardando_desde = null,
                          entram_ja_atrasados = coalesce((p_dados ->> 'entramJaAtrasados')::boolean, false) and gatilho in ('PARCELA_ATRASO', 'DOCUMENTO_PENDENTE'),
                          desligada_por = null, desligada_em = null, desligada_motivo = null,
                          atualizada_por = p_pessoa, atualizada_em = app_now()
     where id = a.id;
    insert into automacao_eventos (escritorio_id, automacao_id, tipo, detalhe, pessoa_id)
    values (p_escritorio, a.id, 'LIGADA', jsonb_build_object('numero', v_numero), p_pessoa);
  end if;
  perform registrar_historico('automacao.ligada', 'automacoes', a.id::text, jsonb_build_object('numero', v_numero, 'desligou', (select coalesce(jsonb_agg(c -> 'id'), '[]'::jsonb) from jsonb_array_elements(v_conf) c)));
  return portal_automacao(p_pessoa, p_escritorio, a.id);
end $$;


create or replace function portal_automacao_ia_contexto(p_pessoa uuid, p_escritorio uuid, p_id uuid default null) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare a automacoes; v_areas text[]; v_gatilhos text[];
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'conversas.editar');
  perform portal_exigir_escrita(p_pessoa, p_escritorio);
  perform automacoes_garantir(p_escritorio);
  v_areas := areas_da_pessoa(p_pessoa, p_escritorio);
  if p_id is not null then
    a := automacao_para_mudar(p_pessoa, p_escritorio, p_id);
    if not automacao_pode_montar(p_pessoa, p_escritorio, a.area) then
      raise exception 'Área não liberada para esta pessoa' using errcode = 'TC401', detail = jsonb_build_object('motivo', 'AREA_NAO_LIBERADA')::text;
    end if;
    if a.origem = 'PRONTA' then
      raise exception 'As prontas do T3jus não passam pela IA' using errcode = 'TC422',
        detail = jsonb_build_object('campos', jsonb_build_array('pedido'), 'motivo', 'PRONTA')::text;
    end if;
    v_gatilhos := array[a.gatilho];
  else
    select coalesce(array_agg(g order by o), '{}') into v_gatilhos
      from unnest(array['PAGAMENTO_RECEBIDO', 'PARCELA_VAI_VENCER', 'PARCELA_ATRASO', 'ETAPA_CASO', 'LEMBRETE_AUDIENCIA', 'PRESTACAO_CONTAS',
                         'CLIENTE_NOVO', 'DOCUMENTO_PENDENTE']) with ordinality x(g, o)
     where automacao_pode_montar(p_pessoa, p_escritorio, automacao_area(g));
    if cardinality(v_gatilhos) = 0 then
      raise exception 'Área não liberada para esta pessoa' using errcode = 'TC401', detail = jsonb_build_object('motivo', 'AREA_NAO_LIBERADA')::text;
    end if;
  end if;
  return jsonb_build_object(
    'escritorio', (select nome from escritorios where id = p_escritorio),
    'eu', pessoa_ref(p_pessoa),
    'gatilhos', to_jsonb(v_gatilhos),
    'pessoas', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'nome', p.nome, 'areas', to_jsonb(areas_da_pessoa(p.id, p_escritorio)),
                                                             'dono', v.funcao = 'SOCIO') order by p.nome), '[]'::jsonb)
                  from vinculos v join pessoas p on p.id = v.pessoa_id
                 where v.escritorio_id = p_escritorio and v.revogado_em is null and v.funcao in ('SOCIO', 'EQUIPE')),
    'ligadas', (select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'nome', x.nome, 'gatilho', x.gatilho) order by x.criada_em), '[]'::jsonb)
                  from automacoes x where x.escritorio_id = p_escritorio and x.situacao in ('LIGADA', 'EM_APROVACAO')),
    'atual', case when a.id is not null then jsonb_build_object('id', a.id, 'nome', a.nome, 'gatilho', a.gatilho, 'rascunho', a.rascunho) end);
end $$;


create or replace function portal_automacao_ia_sugerir(p_pessoa uuid, p_escritorio uuid, p_id uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a automacoes;
  v_fluxo jsonb := p_dados -> 'fluxo';
  v_gatilho text := p_dados ->> 'gatilho';
  v_pedido text := btrim(coalesce(p_dados ->> 'pedido', ''));
  v_nome text := left(btrim(coalesce(p_dados ->> 'nome', '')), 80);
  v_x text;
  v_sug jsonb;
begin
  perform portal_automacao_ia_contexto(p_pessoa, p_escritorio, p_id);
  if length(v_pedido) not between 3 and 600 then perform recusar_campos('Escreva o pedido', 'pedido'); end if;
  if p_id is not null then
    select * into a from automacoes where id = p_id and escritorio_id = p_escritorio;
    v_gatilho := a.gatilho;
  elsif automacao_area(v_gatilho) is null or not automacao_pode_montar(p_pessoa, p_escritorio, automacao_area(v_gatilho)) then
    perform recusar_campos('Gatilho fora das suas áreas', 'gatilho');
  end if;
  v_x := automacao_forma(v_gatilho, v_fluxo);
  if v_x is not null then
    raise exception 'O desenho não está no formato: %', v_x using errcode = 'TC422',
      detail = jsonb_build_object('campos', jsonb_build_array('fluxo'), 'forma', v_x)::text;
  end if;
  if exists (select 1 from jsonb_path_query(v_fluxo, 'strict $.**') x where jsonb_typeof(x) = 'object' and x ? 'aviso' and x ->> 'aviso' is not null)
     or exists (select 1 from unnest(automacao_modelos_do_fluxo(v_fluxo)) m
                 where not exists (select 1 from automacao_modelos o where o.id = m and o.automacao_id = a.id)) then
    perform recusar_campos('O texto aprovado não é desta automação', 'fluxo');
  end if;
  v_sug := jsonb_build_object(
    'pedido', v_pedido, 'por', pessoa_ref(p_pessoa), 'em', app_now(), 'fluxo', v_fluxo,
    'feito', coalesce((select jsonb_agg(x) from (select x from jsonb_array_elements(coalesce(p_dados -> 'feito', '[]')) x limit 8) t), '[]'::jsonb),
    'alertas', coalesce((select jsonb_agg(x) from (select x from jsonb_array_elements(coalesce(p_dados -> 'alertas', '[]')) x limit 8) t), '[]'::jsonb),
    'experimente', coalesce((select jsonb_agg(x) from (select x from jsonb_array_elements(coalesce(p_dados -> 'experimente', '[]')) x
                                                        where jsonb_typeof(x) = 'string' and length(x #>> '{}') between 3 and 120 limit 3) t), '[]'::jsonb));
  if p_id is null then
    if length(v_nome) < 3 then v_nome := (select case v_gatilho when 'PAGAMENTO_RECEBIDO' then 'Pagamento recebido' when 'PARCELA_VAI_VENCER' then 'Parcela vai vencer'
                                                               when 'PARCELA_ATRASO' then 'Parcela em atraso' when 'ETAPA_CASO' then 'Etapa do caso'
                                                               when 'LEMBRETE_AUDIENCIA' then 'Lembrete de audiência'
                                                               when 'CLIENTE_NOVO' then 'Boas-vindas ao cliente novo' when 'DOCUMENTO_PENDENTE' then 'Lembrete de documento que falta' else 'Prestação de contas' end); end if;
    insert into automacoes (escritorio_id, nome, origem, gatilho, area, rascunho, sugestao, criada_por, atualizada_por)
    values (p_escritorio, v_nome, 'ESCRITORIO', v_gatilho, automacao_area(v_gatilho),
            jsonb_build_object('passos', (select jsonb_agg(x order by o) from jsonb_array_elements(v_fluxo -> 'passos') with ordinality t(x, o)
                                            where x ->> 'tipo' in ('GATILHO', 'CONDICOES'))),
            v_sug, p_pessoa, p_pessoa)
    returning * into a;
    insert into automacao_eventos (escritorio_id, automacao_id, tipo, detalhe, pessoa_id)
    values (p_escritorio, a.id, 'CRIADA', jsonb_build_object('ia', true), p_pessoa);
  else
    update automacoes set sugestao = v_sug where id = a.id;
  end if;
  perform registrar_historico('automacao.ia_sugeriu', 'automacoes', a.id::text, jsonb_build_object('gatilho', v_gatilho));
  return portal_automacao(p_pessoa, p_escritorio, a.id);
end $$;


-- ---------------------------------------------------------------------------------------
-- A ficha do caso mostra o lembrete automático de cada documento que falta (decisão 9).

create or replace function documento_pedido_linha(d documento_pedidos) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', d.id, 'descricao', d.descricao, 'pedidoEm', d.pedido_em, 'repedidoEm', d.repedido_em,
    'cliente', (select jsonb_build_object('id', k.id, 'nome', k.nome, 'telefone', contato_principal(k.contatos) ->> 'telefone')
                  from clientes_escritorio k where k.id = d.cliente_id),
    'pedidoPor', pessoa_ref(d.pedido_por),
    -- O lembrete automático do documento pendente (PA-06): o último que saiu, quando passa e para quem.
    'lembrete', (select jsonb_build_object('automacao', jsonb_build_object('id', y.id, 'nome', y.nome), 'enviadoEm', x.ultima_msg_em,
                                           'ate', x.proximo_em,
                                           'passaPara', case when x.proximo_em is not null then pessoa_ref(automacao_passa_para(x, y)) end)
                   from automacao_execucoes x join automacoes y on y.id = x.automacao_id
                  where x.escritorio_id = d.escritorio_id and x.origem = 'DOCUMENTO' and d.id = any (x.documentos) and x.ultima_msg_em is not null
                  order by x.iniciada_em desc limit 1))
$$;


call fechar_acesso();
