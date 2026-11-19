-- Agenda do Portal (EX-06, EX-11, PD-07), tela aprovada em
-- docs/design/aprovadas/portal-agenda-conversas (Carol, 19/11/2026). Decisões da Carol (as
-- recomendações das perguntas valem):
-- 1. uma agenda só, da equipe toda, com filtro por pessoa; todos da equipe veem e marcam;
-- 2. tipos fixos (audiência, reunião com cliente, assinatura, interno) e "Outro", escrito
--    pela equipe; o nome escrito aparece na agenda e na legenda;
-- 3. o lembrete ao cliente pelo WhatsApp vem marcado nas audiências, 1 dia e 2 horas antes, e
--    é desmarcável em cada compromisso (pergunta 5);
-- 4. nada é apagado (PT-03): cancelar e remarcar pedem motivo e ficam no histórico;
-- 5. Google Agenda e Outlook (EX-13) ficam só como lugar reservado (pergunta 4).
-- Os prazos do Jurídico (PD-04) entram na agenda junto com a área Jurídico; o envio do
-- lembrete entra quando o WhatsApp do escritório for ligado. Até lá, o lembrete fica marcado
-- e a ficha diz que ainda não sai.

insert into funcao_acoes (funcao, acao) values
  ('SOCIO', 'agenda.ver'), ('SOCIO', 'agenda.editar'),
  ('EQUIPE', 'agenda.ver'), ('EQUIPE', 'agenda.editar');

-- ---------------------------------------------------------------------------------------
-- Feriados (global): o fórum fecha e os prazos não correm. Começa pelos nacionais; os
-- estaduais e municipais entram com os prazos (EX-04).

create table feriados (
  data         date primary key,
  nome         text not null check (length(btrim(nome)) between 2 and 80),
  abrangencia  text not null default 'NACIONAL' check (abrangencia in ('NACIONAL'))
);
call proteger_tabela_global('feriados', 'Feriados nacionais, iguais para todos os escritórios; só a migration escreve');

insert into feriados (data, nome) values
  ('2026-01-01', 'Confraternização Universal'), ('2026-04-03', 'Sexta-feira Santa'), ('2026-04-21', 'Tiradentes'),
  ('2026-05-01', 'Dia do Trabalho'), ('2026-09-07', 'Independência'), ('2026-10-12', 'Nossa Senhora Aparecida'),
  ('2026-11-02', 'Finados'), ('2026-11-15', 'Proclamação da República'), ('2026-11-20', 'Consciência Negra'),
  ('2026-12-25', 'Natal'),
  ('2027-01-01', 'Confraternização Universal'), ('2027-03-26', 'Sexta-feira Santa'), ('2027-04-21', 'Tiradentes'),
  ('2027-05-01', 'Dia do Trabalho'), ('2027-09-07', 'Independência'), ('2027-10-12', 'Nossa Senhora Aparecida'),
  ('2027-11-02', 'Finados'), ('2027-11-15', 'Proclamação da República'), ('2027-11-20', 'Consciência Negra'),
  ('2027-12-25', 'Natal'),
  ('2028-01-01', 'Confraternização Universal'), ('2028-04-14', 'Sexta-feira Santa'), ('2028-04-21', 'Tiradentes'),
  ('2028-05-01', 'Dia do Trabalho'), ('2028-09-07', 'Independência'), ('2028-10-12', 'Nossa Senhora Aparecida'),
  ('2028-11-02', 'Finados'), ('2028-11-15', 'Proclamação da República'), ('2028-11-20', 'Consciência Negra'),
  ('2028-12-25', 'Natal');

-- ---------------------------------------------------------------------------------------
-- Compromissos.

create table compromissos (
  id                    uuid primary key default gen_random_uuid(),
  escritorio_id         uuid not null references escritorios (id) on delete restrict,
  tipo                  text not null check (tipo in ('AUDIENCIA', 'CLIENTE', 'ASSINATURA', 'INTERNO', 'OUTRO')),
  -- Tipo escrito pela equipe quando o tipo é Outro (Perícia, Diligência...).
  tipo_escrito          text check (length(btrim(tipo_escrito)) between 2 and 40),
  titulo                text not null check (length(btrim(titulo)) between 1 and 160),
  inicio                timestamptz not null,
  fim                   timestamptz not null,
  modalidade            text not null check (modalidade in ('PRESENCIAL', 'VIRTUAL')),
  local                 text check (length(btrim(local)) between 2 and 200),
  link_sala             text check (link_sala ~ '^https://[^\s]{4,}$' and length(link_sala) <= 1000),
  cliente_id            uuid references clientes_escritorio (id) on delete restrict,
  responsavel_id        uuid not null references pessoas (id) on delete restrict,
  tambem_vai            uuid[] not null default '{}',
  lembrete_cliente      boolean not null default false,
  observacoes           text check (length(btrim(observacoes)) between 1 and 1000),
  estado                text not null default 'MARCADO',
  cancelado_em          timestamptz,
  cancelado_por         uuid references pessoas (id) on delete restrict,
  motivo_cancelamento   text check (length(btrim(motivo_cancelamento)) between 1 and 300),
  avisar_cancelamento   boolean,
  criado_por            uuid not null references pessoas (id) on delete restrict,
  criado_em             timestamptz not null default app_now(),
  versao                integer not null default 1,
  check (fim > inicio and fim - inicio <= interval '24 hours'),
  check ((tipo = 'OUTRO') = (tipo_escrito is not null)),
  check (modalidade = 'PRESENCIAL' or link_sala is not null),
  check (cliente_id is not null or not lembrete_cliente),
  check (cardinality(tambem_vai) <= 20)
);
create index compromissos_periodo on compromissos (escritorio_id, inicio);
call proteger_tabela_escritorio('compromissos');
call ligar_guardiao('compromissos');
insert into estados_iniciais (tabela, estado) values ('compromissos', 'MARCADO');
insert into transicoes_permitidas (tabela, de, para) values ('compromissos', 'MARCADO', 'CANCELADO');

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('compromissos', true,
  'Compromissos da equipe: tipo, o que é, quando, onde, link da sala, cliente, quem vai, lembrete ao cliente, observações e cancelamento',
  'Organizar audiências, reuniões e assinaturas do escritório e lembrar o cliente (EX-06, EX-11)',
  'Execução de contrato e exercício regular de direitos (LGPD, art. 7º, V e VI)', 'Escritório',
  'Enquanto o escritório for cliente do T3jus',
  'Exportados ao escritório e apagados com ele', 'APROVADO', true),
 ('feriados', false, 'Feriados nacionais, para mostrar na agenda os dias em que o fórum fecha', null, null, null, null, null, null, false);

-- ---------------------------------------------------------------------------------------
-- Leituras de apoio.

create function tem_juridico(p_pessoa uuid, p_escritorio uuid) returns boolean
language sql stable
set search_path = public
as $$ select 'JURIDICO' = any (areas_da_pessoa(p_pessoa, p_escritorio)) $$;

-- Linha do compromisso na agenda (mês, semana e dia).
create function compromisso_linha(c compromissos) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', c.id, 'tipo', c.tipo, 'tipoEscrito', c.tipo_escrito, 'titulo', c.titulo, 'inicio', c.inicio, 'fim', c.fim,
    'modalidade', c.modalidade, 'local', c.local, 'situacao', c.estado, 'lembrete', c.lembrete_cliente,
    'responsavel', pessoa_ref(c.responsavel_id),
    'tambemVai', coalesce((select jsonb_agg(pessoa_ref(t) order by o) from unnest(c.tambem_vai) with ordinality u(t, o)), '[]'::jsonb),
    'cliente', (select jsonb_build_object('id', k.id, 'nome', k.nome) from clientes_escritorio k where k.id = c.cliente_id))
$$;

-- Agenda de um período (até 62 dias), da equipe toda ou de uma pessoa (responsável ou quem
-- também vai). Os cancelados vêm junto, riscados na tela. Os prazos do Jurídico entram com
-- a área: até lá a lista vem vazia, e nunca vem para quem não tem a área (PD-04, PD-07).
create function portal_agenda(p_pessoa uuid, p_escritorio uuid, p_de date, p_ate date, p_de_quem uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_juridico boolean;
  v_ini timestamptz;
  v_fim timestamptz;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'agenda.ver');
  if p_de is null or p_ate is null or p_ate < p_de or p_ate - p_de > 62 then
    perform recusar_campos('Período inválido', 'de', 'ate');
  end if;
  if p_de_quem is not null and not pessoa_do_escritorio(p_de_quem, p_escritorio) then
    perform recusar_campos('Pessoa fora do escritório', 'pessoa');
  end if;
  v_juridico := tem_juridico(p_pessoa, p_escritorio);
  v_ini := p_de::timestamp at time zone 'America/Sao_Paulo';
  v_fim := (p_ate + 1)::timestamp at time zone 'America/Sao_Paulo';
  return jsonb_build_object(
    'juridico', v_juridico,
    -- Se o escritório já marcou alguma coisa (a agenda vazia mostra como começar).
    'algum', exists (select 1 from compromissos c where c.escritorio_id = p_escritorio),
    'compromissos', coalesce((
      select jsonb_agg(compromisso_linha(c) order by c.inicio, c.fim, c.titulo)
        from compromissos c
       where c.escritorio_id = p_escritorio and c.inicio < v_fim and c.fim > v_ini
         and (p_de_quem is null or c.responsavel_id = p_de_quem or p_de_quem = any (c.tambem_vai))), '[]'::jsonb),
    'feriados', coalesce((select jsonb_agg(jsonb_build_object('data', f.data, 'nome', f.nome) order by f.data)
                            from feriados f where f.data between p_de and p_ate), '[]'::jsonb),
    'prazos', case when v_juridico then '[]'::jsonb else null end,
    -- Tipos escritos em uso no escritório: sugestão ao digitar, para não nascer "Pericia" e "Perícia".
    'tiposEscritos', coalesce((select jsonb_agg(t order by t) from (select distinct c.tipo_escrito t from compromissos c
                                                                     where c.escritorio_id = p_escritorio and c.tipo_escrito is not null) x), '[]'::jsonb));
end $$;

-- Ficha do compromisso, com o contato principal do cliente (para quem vai o lembrete) e o
-- histórico (marcou, remarcou, editou, cancelou).
create function portal_compromisso(p_pessoa uuid, p_escritorio uuid, p_compromisso uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c compromissos;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'agenda.ver');
  select * into c from compromissos where id = p_compromisso and escritorio_id = p_escritorio;
  if c.id is null then raise exception 'Compromisso não encontrado' using errcode = 'TC404'; end if;
  return compromisso_linha(c) || jsonb_build_object(
    'linkSala', c.link_sala, 'observacoes', c.observacoes, 'versao', c.versao, 'criadoEm', c.criado_em,
    'criadoPor', pessoa_ref(c.criado_por),
    'contatoCliente', (select contato_principal(k.contatos) from clientes_escritorio k where k.id = c.cliente_id and k.estado <> 'EXCLUIDO'),
    'cancelamento', case when c.estado = 'CANCELADO' then jsonb_build_object(
      'em', c.cancelado_em, 'por', pessoa_ref(c.cancelado_por), 'motivo', c.motivo_cancelamento, 'avisar', c.avisar_cancelamento) end,
    'historico', coalesce((
      select jsonb_agg(jsonb_build_object('em', h.ocorrido_em, 'acao', h.acao, 'autor', p.nome, 'dados', h.dados) order by h.id)
        from historico h left join pessoas p on p.id = h.autor_id
       where h.escritorio_id = p_escritorio and h.entidade = 'compromissos' and h.entidade_id = c.id::text), '[]'::jsonb));
end $$;

-- Confere e normaliza os dados de um compromisso. Devolve a linha pronta para gravar.
create function compromisso_conferir(p_escritorio uuid, p_dados jsonb) returns compromissos
language plpgsql
set search_path = public
as $$
declare
  n compromissos;
  v_campos text[] := '{}';
  v_vai uuid[];
  t text;
begin
  if jsonb_typeof(p_dados) is distinct from 'object' then perform recusar_campos('Dados inválidos', 'dados'); end if;
  n.tipo := p_dados ->> 'tipo';
  n.tipo_escrito := nullif(btrim(coalesce(p_dados ->> 'tipoEscrito', '')), '');
  n.titulo := nullif(btrim(coalesce(p_dados ->> 'titulo', '')), '');
  n.modalidade := p_dados ->> 'modalidade';
  n.local := nullif(btrim(coalesce(p_dados ->> 'local', '')), '');
  n.link_sala := nullif(btrim(coalesce(p_dados ->> 'linkSala', '')), '');
  n.observacoes := nullif(btrim(coalesce(p_dados ->> 'observacoes', '')), '');
  n.lembrete_cliente := coalesce((p_dados ->> 'lembrete')::boolean, false);
  begin
    n.inicio := (p_dados ->> 'inicio')::timestamptz;
  exception when others then v_campos := array_append(v_campos, 'inicio');
  end;
  begin
    n.fim := (p_dados ->> 'fim')::timestamptz;
  exception when others then v_campos := array_append(v_campos, 'fim');
  end;
  begin
    n.cliente_id := nullif(p_dados ->> 'clienteId', '')::uuid;
    n.responsavel_id := nullif(p_dados ->> 'responsavelId', '')::uuid;
    v_vai := coalesce((select array_agg(distinct x::uuid) from jsonb_array_elements_text(coalesce(p_dados -> 'tambemVai', '[]'::jsonb)) x), '{}');
  exception when others then perform recusar_campos('Confira o compromisso', 'dados');
  end;

  if coalesce(n.tipo, '') not in ('AUDIENCIA', 'CLIENTE', 'ASSINATURA', 'INTERNO', 'OUTRO') then v_campos := array_append(v_campos, 'tipo'); end if;
  if n.tipo = 'OUTRO' then
    if n.tipo_escrito is null or length(n.tipo_escrito) not between 2 and 40 then v_campos := array_append(v_campos, 'tipoEscrito'); end if;
  else
    n.tipo_escrito := null;
  end if;
  if n.titulo is null or length(n.titulo) > 160 then v_campos := array_append(v_campos, 'titulo'); end if;
  if n.inicio is null and not 'inicio' = any (v_campos) then v_campos := array_append(v_campos, 'inicio'); end if;
  if n.fim is null and not 'fim' = any (v_campos) then v_campos := array_append(v_campos, 'fim'); end if;
  if n.inicio is not null and n.fim is not null and (n.fim <= n.inicio or n.fim - n.inicio > interval '24 hours') then
    v_campos := array_append(v_campos, 'fim');
  end if;
  if coalesce(n.modalidade, '') not in ('PRESENCIAL', 'VIRTUAL') then v_campos := array_append(v_campos, 'modalidade'); end if;
  if n.modalidade = 'VIRTUAL' and (n.link_sala is null or n.link_sala !~ '^https://[^\s]{4,}$' or length(n.link_sala) > 1000) then
    v_campos := array_append(v_campos, 'linkSala');
  end if;
  if n.modalidade = 'PRESENCIAL' then n.link_sala := null; end if;
  if n.local is not null and length(n.local) not between 2 and 200 then v_campos := array_append(v_campos, 'local'); end if;
  if n.observacoes is not null and length(n.observacoes) > 1000 then v_campos := array_append(v_campos, 'observacoes'); end if;
  if n.cliente_id is not null and not exists (select 1 from clientes_escritorio k where k.id = n.cliente_id and k.escritorio_id = p_escritorio
                                                 and k.estado <> 'EXCLUIDO') then
    v_campos := array_append(v_campos, 'clienteId');
  end if;
  if n.cliente_id is null then n.lembrete_cliente := false; end if;
  if n.responsavel_id is null or not pessoa_do_escritorio(n.responsavel_id, p_escritorio) then
    v_campos := array_append(v_campos, 'responsavelId');
  end if;
  foreach t in array coalesce(v_vai::text[], '{}') loop
    if not pessoa_do_escritorio(t::uuid, p_escritorio) then v_campos := array_append(v_campos, 'tambemVai'); exit; end if;
  end loop;
  if cardinality(v_vai) > 20 then v_campos := array_append(v_campos, 'tambemVai'); end if;
  n.tambem_vai := array_remove(v_vai, n.responsavel_id);
  if cardinality(v_campos) > 0 then
    perform recusar_campos('Confira o compromisso', variadic (select array_agg(distinct x) from unnest(v_campos) x));
  end if;
  return n;
end $$;

-- Marcar (EX-06). Fica no histórico com quem marcou e a hora.
create function portal_compromisso_marcar(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  n compromissos;
  v_id uuid;
  v_versao integer;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'agenda.editar');
  n := compromisso_conferir(p_escritorio, p_dados);
  perform definir_transicao('MARCADO');
  insert into compromissos (escritorio_id, tipo, tipo_escrito, titulo, inicio, fim, modalidade, local, link_sala, cliente_id,
                            responsavel_id, tambem_vai, lembrete_cliente, observacoes, criado_por)
  values (p_escritorio, n.tipo, n.tipo_escrito, n.titulo, n.inicio, n.fim, n.modalidade, n.local, n.link_sala, n.cliente_id,
          n.responsavel_id, n.tambem_vai, n.lembrete_cliente, n.observacoes, p_pessoa)
  returning id, versao into v_id, v_versao;
  perform registrar_historico('compromisso.marcado', 'compromissos', v_id::text,
    jsonb_build_object('inicio', n.inicio, 'tipo', n.tipo, 'lembrete', n.lembrete_cliente));
  return jsonb_build_object('id', v_id, 'versao', v_versao);
end $$;

-- Editar ou remarcar (PT-19, PT-03): segue a versão lida; mudar o dia ou a hora pede motivo.
create function portal_compromisso_editar(p_pessoa uuid, p_escritorio uuid, p_compromisso uuid, p_versao integer,
                                          p_dados jsonb, p_motivo text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a compromissos;
  n compromissos;
  v_versao integer;
  v_campos text[];
  v_motivo text := nullif(btrim(coalesce(p_motivo, '')), '');
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'agenda.editar');
  if p_versao is null then perform recusar_campos('Falta a versão lida', 'versao'); end if;
  select * into a from compromissos where id = p_compromisso and escritorio_id = p_escritorio;
  if a.id is null then raise exception 'Compromisso não encontrado' using errcode = 'TC404'; end if;
  if a.estado = 'CANCELADO' then perform recusar_motivo('O compromisso foi cancelado', 'COMPROMISSO_CANCELADO'); end if;
  n := compromisso_conferir(p_escritorio, p_dados);
  if (n.inicio, n.fim) is distinct from (a.inicio, a.fim) and (v_motivo is null or length(v_motivo) > 300) then
    perform recusar_campos('Escreva o motivo da remarcação', 'motivo');
  end if;
  update compromissos set
    tipo = n.tipo, tipo_escrito = n.tipo_escrito, titulo = n.titulo, inicio = n.inicio, fim = n.fim, modalidade = n.modalidade,
    local = n.local, link_sala = n.link_sala, cliente_id = n.cliente_id, responsavel_id = n.responsavel_id, tambem_vai = n.tambem_vai,
    lembrete_cliente = n.lembrete_cliente, observacoes = n.observacoes
   where id = p_compromisso and escritorio_id = p_escritorio and versao = p_versao
  returning versao into v_versao;
  if v_versao is null then perform conflito_versao('compromissos', p_compromisso); end if;
  if (n.inicio, n.fim) is distinct from (a.inicio, a.fim) then
    perform registrar_historico('compromisso.remarcado', 'compromissos', p_compromisso::text,
      jsonb_build_object('de', a.inicio, 'para', n.inicio, 'motivo', v_motivo));
  end if;
  select coalesce(array_agg(k order by k), '{}') into v_campos
    from unnest(array['tipo', 'tipo_escrito', 'titulo', 'modalidade', 'local', 'link_sala', 'cliente_id', 'responsavel_id',
                      'tambem_vai', 'lembrete_cliente', 'observacoes']) k
   where to_jsonb(a) -> k is distinct from (select to_jsonb(c) -> k from compromissos c where c.id = p_compromisso);
  if cardinality(v_campos) > 0 then
    perform registrar_historico('compromisso.editado', 'compromissos', p_compromisso::text, jsonb_build_object('campos', to_jsonb(v_campos)));
  end if;
  return jsonb_build_object('id', p_compromisso, 'versao', v_versao);
end $$;

-- Cancelar (PT-03): não apaga; o compromisso fica riscado, com o motivo. "Avisar o cliente"
-- fica guardado para quando o WhatsApp do escritório estiver ligado.
create function portal_compromisso_cancelar(p_pessoa uuid, p_escritorio uuid, p_compromisso uuid, p_versao integer,
                                            p_motivo text, p_avisar boolean default false)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_versao integer;
  v_estado text;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'agenda.editar');
  if length(btrim(coalesce(p_motivo, ''))) not between 1 and 300 then perform recusar_campos('Escreva o motivo', 'motivo'); end if;
  select estado into v_estado from compromissos where id = p_compromisso and escritorio_id = p_escritorio;
  if v_estado is null then raise exception 'Compromisso não encontrado' using errcode = 'TC404'; end if;
  if v_estado = 'CANCELADO' then perform recusar_motivo('O compromisso já foi cancelado', 'JA_CANCELADO'); end if;
  perform definir_transicao('CANCELADO', btrim(p_motivo));
  update compromissos set estado = 'CANCELADO', cancelado_em = app_now(), cancelado_por = p_pessoa, motivo_cancelamento = btrim(p_motivo),
                          avisar_cancelamento = coalesce(p_avisar, false) and cliente_id is not null
   where id = p_compromisso and escritorio_id = p_escritorio and versao = p_versao
  returning versao into v_versao;
  if v_versao is null then perform conflito_versao('compromissos', p_compromisso); end if;
  return v_versao;
end $$;

-- EX-10: quem sai da equipe passa os compromissos que ainda vão acontecer para a pessoa
-- escolhida na retirada. Os que já passaram ficam com quem foi.
create function agenda_passar_de_quem_saiu() returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_de uuid := (new.dados ->> 'pessoa_id')::uuid;
  v_para uuid := (new.dados ->> 'passou_para')::uuid;
  v_id uuid;
begin
  if v_de is null or v_para is null then return new; end if;
  for v_id in
    update compromissos set responsavel_id = v_para, tambem_vai = array_remove(tambem_vai, v_para)
     where escritorio_id = new.escritorio_id and responsavel_id = v_de and estado = 'MARCADO' and inicio > app_now()
    returning id
  loop
    perform registrar_historico('compromisso.responsavel_passado', 'compromissos', v_id::text,
      jsonb_build_object('de', v_de, 'para', v_para));
  end loop;
  update compromissos set tambem_vai = array_remove(tambem_vai, v_de)
   where escritorio_id = new.escritorio_id and v_de = any (tambem_vai) and estado = 'MARCADO' and inicio > app_now();
  return new;
end $$;

create trigger agenda_passar_de_quem_saiu after insert on historico
  for each row when (new.acao = 'equipe.retirada') execute function agenda_passar_de_quem_saiu();

call fechar_acesso();
