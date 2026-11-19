-- Pendências de Clientes (F1.14 e F1.15), desenho aprovado pela Carol em 18/11/2026
-- (docs/design/aprovadas/portal-clientes-pendencias).
--
-- F1.14 (AP-06): o Início mostra os próximos contatos vencidos e os de hoje da pessoa. A sócia
--   dona vê os dela e, com "Da equipe", os de todos (decisão 1).
-- F1.15 (PT-11): pedido de exclusão do titular. Quem não é a sócia dona registra o pedido para
--   ela (decisão 2); só a dona exclui ou recusa. A exclusão apaga nome, documento, qualificação,
--   representante, quem indicou e os contatos, e nos atendimentos tira com quem se falou e o
--   próximo contato. Ficam a data, o canal, quem atendeu e o resumo (decisão 3). O cliente fica
--   em Inativos como "Cliente excluído", com a data e o protocolo (decisão 4). Com contrato ou
--   processo, o cliente só se arquiva (decisão 5): entra quando Contratos e Jurídico existirem.

-- ---------------------------------------------------------------------------------------
-- O cliente excluído: estado novo, sem volta, e sem contatos.

alter table clientes_escritorio add column excluido_em timestamptz;
alter table clientes_escritorio drop constraint clientes_escritorio_contatos_check;
alter table clientes_escritorio add constraint clientes_escritorio_contatos_check
  check (case when estado = 'EXCLUIDO' then contatos = '[]'::jsonb else contatos_cliente_validos(contatos) end);
alter table clientes_escritorio add constraint clientes_escritorio_excluido_sem_dados
  check (estado <> 'EXCLUIDO' or (documento is null and nacionalidade is null and estado_civil is null and profissao is null
         and rg is null and rg_orgao is null and cep is null and endereco is null and bairro is null and cidade is null
         and uf is null and rep_nome is null and rep_cargo is null and rep_documento is null and rep_estado_civil is null
         and rep_profissao is null and origem_indicacao is null and motivo_inativacao is null and excluido_em is not null));

insert into transicoes_permitidas (tabela, de, para) values
  ('clientes_escritorio', 'ATIVO', 'EXCLUIDO'),
  ('clientes_escritorio', 'INATIVO', 'EXCLUIDO');

-- Depois de excluído, nada mais muda no cliente (editar, inativar e reativar recusam).
create function cliente_excluido_nao_muda() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.estado = 'EXCLUIDO' then
    raise exception 'Os dados deste cliente foram excluídos a pedido do titular' using errcode = 'TC422',
      detail = jsonb_build_object('motivo', 'CLIENTE_EXCLUIDO')::text;
  end if;
  return new;
end $$;
create trigger cliente_excluido_nao_muda before update on clientes_escritorio
  for each row execute function cliente_excluido_nao_muda();

-- Atendimentos continuam só de inserção. A única mudança aceita é a da exclusão: o cliente já
-- está EXCLUIDO e só com quem se falou e o próximo contato ficam vazios.
create function atendimentos_so_anonimizar() returns trigger
language plpgsql
set search_path = public
as $$
declare v_campos text[] := array['com_quem', 'prox_em', 'prox_responsavel', 'prox_oque'];
begin
  if tg_op = 'UPDATE'
     and (select estado from clientes_escritorio where id = old.cliente_id) = 'EXCLUIDO'
     and new.com_quem is null and new.prox_em is null and new.prox_responsavel is null and new.prox_oque is null
     and (to_jsonb(new) - v_campos) = (to_jsonb(old) - v_campos) then
    return new;
  end if;
  raise exception 'Registro só de inserção em % (% bloqueado)', tg_table_name, tg_op using errcode = 'TC010';
end $$;
drop trigger atendimentos_somente_insercao on atendimentos;
create trigger atendimentos_somente_insercao before update or delete on atendimentos
  for each row execute function atendimentos_so_anonimizar();

-- Atendimento novo em cliente excluído é recusado (o cliente que volta é cadastro novo).
create function atendimento_de_cliente_valido() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (select estado from clientes_escritorio where id = new.cliente_id) = 'EXCLUIDO' then
    raise exception 'Os dados deste cliente foram excluídos a pedido do titular' using errcode = 'TC422',
      detail = jsonb_build_object('motivo', 'CLIENTE_EXCLUIDO')::text;
  end if;
  return new;
end $$;
create trigger atendimento_de_cliente_valido before insert on atendimentos
  for each row execute function atendimento_de_cliente_valido();

-- ---------------------------------------------------------------------------------------
-- Pedidos de exclusão: o registro que fica, sem dado pessoal do cliente (a observação pede
-- para não escrever). O protocolo é por escritório e ano: EXC-2026-0007.

create table pedidos_exclusao (
  id              uuid primary key default gen_random_uuid(),
  escritorio_id   uuid not null references escritorios (id) on delete restrict,
  cliente_id      uuid not null references clientes_escritorio (id) on delete restrict,
  pedido_em       date not null,
  canal           text not null check (canal in ('WHATSAPP', 'TELEFONE', 'EMAIL', 'PRESENCIAL', 'CARTA')),
  -- Quem pediu: a sócia dona confere ao excluir; o pedido da equipe pode vir sem.
  quem_pediu      text check (quem_pediu in ('TITULAR', 'REPRESENTANTE')),
  observacao      text check (length(btrim(observacao)) between 1 and 300),
  registrado_por  uuid not null references pessoas (id) on delete restrict,
  registrado_em   timestamptz not null default app_now(),
  estado          text not null,
  resolvido_por   uuid references pessoas (id) on delete restrict,
  resolvido_em    timestamptz,
  motivo_recusa   text check (length(btrim(motivo_recusa)) between 1 and 300),
  protocolo       text check (protocolo ~ '^EXC-[0-9]{4}-[0-9]{4,}$'),
  unique (escritorio_id, protocolo),
  check ((estado = 'PENDENTE') = (resolvido_em is null)),
  check ((estado = 'ATENDIDO') = (protocolo is not null)),
  check (estado <> 'ATENDIDO' or quem_pediu is not null),
  check ((estado = 'RECUSADO') = (motivo_recusa is not null))
);
create unique index pedidos_exclusao_um_aberto on pedidos_exclusao (cliente_id) where estado = 'PENDENTE';
create index pedidos_exclusao_escritorio on pedidos_exclusao (escritorio_id, estado);
call proteger_tabela_escritorio('pedidos_exclusao');
call ligar_guardiao('pedidos_exclusao');
insert into estados_iniciais (tabela, estado) values ('pedidos_exclusao', 'PENDENTE'), ('pedidos_exclusao', 'ATENDIDO');
insert into transicoes_permitidas (tabela, de, para) values
  ('pedidos_exclusao', 'PENDENTE', 'ATENDIDO'),
  ('pedidos_exclusao', 'PENDENTE', 'RECUSADO');

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('pedidos_exclusao', true,
  'Pedidos de exclusão (LGPD): data, canal, quem pediu, quem registrou e resolveu, protocolo e recusa',
  'Provar que o escritório atendeu o pedido do titular (LGPD, art. 18 e 37)',
  'Cumprimento de obrigação legal (LGPD, art. 7º, II)', 'Escritório',
  'Enquanto o escritório for cliente do T3jus',
  'Exportados ao escritório e apagados com ele', 'APROVADO', true);

update inventario_dados
   set no_fim = 'Exportados ao escritório e apagados com ele. A pedido do titular, a sócia dona exclui os dados pessoais e fica o registro do pedido (PT-11)'
 where tabela = 'clientes_escritorio';
update inventario_dados
   set no_fim = 'Exportados ao escritório e apagados com ele. A pedido do titular, saem com quem se falou e o próximo contato; ficam a data, o canal, quem atendeu e o resumo'
 where tabela = 'atendimentos';

-- ---------------------------------------------------------------------------------------
-- Leituras de apoio.

create function so_socio_dono(p_pessoa uuid, p_escritorio uuid) returns void
language plpgsql
set search_path = public
as $$
begin
  if not e_socio_dono(p_pessoa, p_escritorio) then
    raise exception 'Só a sócia dona faz isso' using errcode = 'TC401',
      detail = jsonb_build_object('motivo', 'SO_SOCIO_DONO')::text;
  end if;
end $$;

create function pessoa_ref(p_id uuid) returns jsonb
language sql stable
set search_path = public
as $$ select jsonb_build_object('id', p.id, 'nome', p.nome) from pessoas p where p.id = p_id $$;

create function pedido_exclusao_json(x pedidos_exclusao) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'id', x.id, 'estado', x.estado, 'pedidoEm', x.pedido_em, 'canal', x.canal, 'quemPediu', x.quem_pediu,
    'observacao', x.observacao, 'registradoPor', pessoa_ref(x.registrado_por), 'registradoEm', x.registrado_em,
    'resolvidoPor', pessoa_ref(x.resolvido_por), 'resolvidoEm', x.resolvido_em, 'motivoRecusa', x.motivo_recusa,
    'protocolo', x.protocolo))
$$;

-- Linha da lista: o excluído leva a data e o protocolo no lugar dos dados.
create or replace function cliente_linha(c clientes_escritorio, p_comercial boolean) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object('id', c.id, 'tipo', c.tipo, 'nome', c.nome, 'situacao', c.estado,
                            'contatoPrincipal', contato_principal(c.contatos), 'versao', c.versao)
      || case when p_comercial then jsonb_build_object('origem', c.origem, 'proxContato', prox_contato(c.id)) else '{}'::jsonb end
      || case when c.estado = 'EXCLUIDO' then jsonb_build_object('exclusao', jsonb_build_object(
           'em', c.excluido_em,
           'protocolo', (select x.protocolo from pedidos_exclusao x where x.cliente_id = c.id and x.estado = 'ATENDIDO')))
         else '{}'::jsonb end
$$;

-- Lista: o excluído aparece só em Inativos (decisão 4) e não entra na busca, que é por dado
-- pessoal que ele não tem mais.
create or replace function portal_clientes(p_pessoa uuid, p_escritorio uuid, p_termo text default null,
                                           p_situacao text default 'ATIVO', p_vencidos boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comercial boolean;
  v_termo text := lower(btrim(coalesce(p_termo, '')));
  v_padrao text;
  v_digitos text := regexp_replace(coalesce(p_termo, ''), '[^0-9]', '', 'g');
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.ver');
  v_comercial := tem_comercial(p_pessoa, p_escritorio);
  if p_vencidos and not v_comercial then
    raise exception 'Área não liberada para esta pessoa' using errcode = 'TC401',
      detail = jsonb_build_object('motivo', 'AREA_NAO_LIBERADA')::text;
  end if;
  if coalesce(p_situacao, 'ATIVO') not in ('ATIVO', 'INATIVO') then
    perform recusar_campos('Situação desconhecida', 'situacao');
  end if;
  if length(v_termo) > 120 then perform recusar_campos('Busca longa demais', 'q'); end if;
  v_padrao := '%' || replace(replace(replace(v_termo, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  return jsonb_build_object('comercial', v_comercial, 'clientes', coalesce((
    select jsonb_agg(l order by (l -> 'proxContato' ->> 'em') nulls last, l ->> 'situacao' = 'EXCLUIDO', l ->> 'nome')
      from (select cliente_linha(c, v_comercial) l
              from clientes_escritorio c
             where c.escritorio_id = p_escritorio
               and (case when v_termo <> '' then c.estado <> 'EXCLUIDO'
                         when coalesce(p_situacao, 'ATIVO') = 'INATIVO' then c.estado in ('INATIVO', 'EXCLUIDO')
                         else c.estado = 'ATIVO' end)
               and (v_termo = '' or lower(c.nome) like v_padrao
                    or exists (select 1 from jsonb_array_elements(c.contatos) k where lower(k ->> 'nome') like v_padrao)
                    or (length(v_digitos) >= 3 and (c.documento like '%' || v_digitos || '%'
                        or exists (select 1 from jsonb_array_elements(c.contatos) k
                                    where regexp_replace(coalesce(k ->> 'telefone', ''), '[^0-9]', '', 'g') like '%' || v_digitos || '%'))))
             order by c.nome
             limit 200) x
     where not p_vencidos or (l -> 'proxContato' ->> 'vencido')::boolean), '[]'::jsonb));
end $$;

-- Ficha: diz se a pessoa é a sócia dona, o pedido de exclusão aberto e, no excluído, o
-- registro da exclusão.
create or replace function portal_cliente(p_pessoa uuid, p_escritorio uuid, p_cliente uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c clientes_escritorio;
  v_comercial boolean;
  v_dono boolean;
  v jsonb;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.ver');
  select * into c from clientes_escritorio where id = p_cliente and escritorio_id = p_escritorio;
  if c.id is null then raise exception 'Cliente não encontrado' using errcode = 'TC404'; end if;
  v_comercial := tem_comercial(p_pessoa, p_escritorio);
  v_dono := e_socio_dono(p_pessoa, p_escritorio);
  v := (to_jsonb(c) - 'escritorio_id' - 'origem' - 'origem_indicacao' - 'inativado_por' - 'criado_por' - 'estado' - 'excluido_em')
    || jsonb_build_object(
      'situacao', c.estado,
      'comercial', v_comercial,
      'dono', v_dono,
      'podeInativar', v_comercial and c.estado <> 'EXCLUIDO',
      'faltando', case when c.estado = 'EXCLUIDO' then '[]'::jsonb else to_jsonb(qualificacao_faltando(c)) end,
      'criadoPor', pessoa_ref(c.criado_por),
      'inativadoPor', pessoa_ref(c.inativado_por),
      'alterado', (select jsonb_build_object('em', h.ocorrido_em, 'por', p.nome)
                     from historico h left join pessoas p on p.id = h.autor_id
                    where h.escritorio_id = p_escritorio and h.entidade = 'cliente' and h.entidade_id = c.id::text
                      and h.acao in ('cliente.cadastrado', 'cliente.editado')
                    order by h.id desc limit 1),
      'pedidoExclusao', (select pedido_exclusao_json(x) from pedidos_exclusao x where x.cliente_id = c.id and x.estado = 'PENDENTE'),
      'ultimaRecusa', (select pedido_exclusao_json(x) from pedidos_exclusao x where x.cliente_id = c.id and x.estado = 'RECUSADO'
                        order by x.resolvido_em desc limit 1),
      'exclusao', (select pedido_exclusao_json(x) || jsonb_build_object('em', c.excluido_em)
                     from pedidos_exclusao x where x.cliente_id = c.id and x.estado = 'ATENDIDO'));
  if v_comercial then
    v := v || jsonb_build_object(
      'origem', c.origem, 'origemIndicacao', c.origem_indicacao, 'proxContato', prox_contato(c.id),
      'atendimentos', (select count(*) from atendimentos a where a.cliente_id = c.id),
      'primeiroAtendimento', (select jsonb_build_object('em', a.ocorrido_em, 'canal', a.canal)
                                from atendimentos a where a.cliente_id = c.id order by a.ocorrido_em limit 1));
  end if;
  return v;
end $$;

-- Editar o excluído recusa antes de conferir os campos (a ficha não tem mais o que editar).
create or replace function portal_cliente_editar(p_pessoa uuid, p_escritorio uuid, p_cliente uuid, p_versao integer, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.editar');
  if p_versao is null then perform recusar_campos('Falta a versão lida', 'versao'); end if;
  if exists (select 1 from clientes_escritorio where id = p_cliente and escritorio_id = p_escritorio and estado = 'EXCLUIDO') then
    perform recusar_motivo('Os dados deste cliente foram excluídos a pedido do titular', 'CLIENTE_EXCLUIDO');
  end if;
  return cliente_gravar(p_pessoa, p_escritorio, p_cliente, p_versao, p_dados);
end $$;

-- ---------------------------------------------------------------------------------------
-- Início: contatos do dia (F1.14). Os vencidos primeiro, do mais antigo; depois os de hoje.

create function portal_inicio_contatos(p_pessoa uuid, p_escritorio uuid, p_de text default 'MEUS', p_limite integer default 5)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dono boolean;
  v_hoje date := hoje_brasilia();
  v_limite integer := least(greatest(coalesce(p_limite, 5), 1), 50);
begin
  perform entrar_area(p_pessoa, p_escritorio, 'COMERCIAL');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.ver');
  if coalesce(p_de, 'MEUS') not in ('MEUS', 'EQUIPE') then perform recusar_campos('Escolha os seus ou os da equipe', 'de'); end if;
  v_dono := e_socio_dono(p_pessoa, p_escritorio);
  if p_de = 'EQUIPE' then perform so_socio_dono(p_pessoa, p_escritorio); end if;
  return (
    with todos as (
      select c.id, c.tipo, c.nome, contato_principal(c.contatos) contato, prox_contato(c.id) p
        from clientes_escritorio c
       where c.escritorio_id = p_escritorio and c.estado = 'ATIVO'),
    devidos as (
      select t.*, (t.p ->> 'em')::date em, (t.p -> 'responsavel' ->> 'id')::uuid resp
        from todos t where t.p is not null and (t.p ->> 'em')::date <= v_hoje),
    meus as (select * from devidos where coalesce(p_de, 'MEUS') = 'EQUIPE' or resp = p_pessoa),
    itens as (
      select jsonb_build_object('clienteId', m.id, 'tipo', m.tipo, 'nome', m.nome, 'contatoPrincipal', m.contato,
                                'em', m.em, 'oque', m.p ->> 'oque', 'vencido', m.em < v_hoje, 'diasAtraso', v_hoje - m.em,
                                'responsavel', m.p -> 'responsavel') j,
             m.em, m.nome, m.em < v_hoje vencido,
             row_number() over (partition by m.em < v_hoje order by m.em, m.nome) n
        from meus m)
    select jsonb_build_object(
      'de', coalesce(p_de, 'MEUS'),
      'dono', v_dono,
      'vencidos', coalesce((select jsonb_agg(j order by em, nome) from itens where vencido and n <= v_limite), '[]'::jsonb),
      'hoje', coalesce((select jsonb_agg(j order by nome) from itens where not vencido and n <= v_limite), '[]'::jsonb),
      'totalVencidos', (select count(*) from itens where vencido),
      'totalHoje', (select count(*) from itens where not vencido),
      'maisAntigo', (select min(em) from itens where vencido),
      -- Para o vazio: o próximo contato marcado, depois de hoje.
      'proximo', (select jsonb_build_object('em', (t.p ->> 'em')::date, 'nome', t.nome) from todos t
                   where t.p is not null and (t.p ->> 'em')::date > v_hoje
                     and (coalesce(p_de, 'MEUS') = 'EQUIPE' or (t.p -> 'responsavel' ->> 'id')::uuid = p_pessoa)
                   order by (t.p ->> 'em')::date, t.nome limit 1),
      -- Para a dona, nos dela: quantos vencidos a equipe tem, para não perder o atraso dos outros.
      'equipeVencidos', case when v_dono and coalesce(p_de, 'MEUS') = 'MEUS'
                             then (select count(*) from devidos where em < v_hoje and resp is distinct from p_pessoa) end,
      'pedidosExclusao', case when v_dono then (
        select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'clienteId', x.cliente_id, 'nome', c.nome, 'pedidoEm', x.pedido_em,
                                                  'por', (select nome from pessoas where id = x.registrado_por))
                                  order by x.registrado_em), '[]'::jsonb)
          from pedidos_exclusao x join clientes_escritorio c on c.id = x.cliente_id
         where x.escritorio_id = p_escritorio and x.estado = 'PENDENTE') end));
end $$;

-- ---------------------------------------------------------------------------------------
-- Pedido de exclusão (F1.15).

-- Confere o pedido (data, canal, quem pediu e observação) e devolve os campos com erro.
create function pedido_exclusao_campos(p jsonb, p_quem boolean) returns text[]
language plpgsql
stable
set search_path = public
as $$
declare
  v text[] := '{}';
  v_em date;
begin
  begin
    v_em := nullif(p ->> 'pedidoEm', '')::date;
  exception when others then
    v_em := null;
  end;
  if v_em is null or v_em > hoje_brasilia() or v_em < hoje_brasilia() - 365 then v := array_append(v, 'pedidoEm'); end if;
  if coalesce(p ->> 'canal', '') not in ('WHATSAPP', 'TELEFONE', 'EMAIL', 'PRESENCIAL', 'CARTA') then v := array_append(v, 'canal'); end if;
  if (p_quem or p ->> 'quemPediu' is not null) and coalesce(p ->> 'quemPediu', '') not in ('TITULAR', 'REPRESENTANTE') then
    v := array_append(v, 'quemPediu');
  end if;
  if length(coalesce(p ->> 'observacao', '')) > 300 then v := array_append(v, 'observacao'); end if;
  return v;
end $$;

create function cliente_para_exclusao(p_escritorio uuid, p_cliente uuid) returns clientes_escritorio
language plpgsql
set search_path = public
as $$
declare c clientes_escritorio;
begin
  select * into c from clientes_escritorio where id = p_cliente and escritorio_id = p_escritorio for update;
  if c.id is null then raise exception 'Cliente não encontrado' using errcode = 'TC404'; end if;
  if c.estado = 'EXCLUIDO' then
    perform recusar_motivo('Os dados deste cliente já foram excluídos', 'CLIENTE_EXCLUIDO');
  end if;
  return c;
end $$;

-- Quem não é a sócia dona registra o pedido para ela (decisão 2). Um pedido aberto por cliente.
create function portal_cliente_pedir_exclusao(p_pessoa uuid, p_escritorio uuid, p_cliente uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campos text[];
  x pedidos_exclusao;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.editar');
  perform cliente_para_exclusao(p_escritorio, p_cliente);
  if exists (select 1 from pedidos_exclusao where cliente_id = p_cliente and estado = 'PENDENTE') then
    perform recusar_motivo('Já há um pedido de exclusão esperando a sócia dona', 'PEDIDO_ABERTO');
  end if;
  v_campos := pedido_exclusao_campos(p_dados, false);
  if cardinality(v_campos) > 0 then perform recusar_campos('Confira o pedido', variadic v_campos); end if;
  perform definir_transicao('PEDIDO_REGISTRADO');
  insert into pedidos_exclusao (escritorio_id, cliente_id, pedido_em, canal, quem_pediu, observacao, registrado_por, estado)
  values (p_escritorio, p_cliente, (p_dados ->> 'pedidoEm')::date, p_dados ->> 'canal', p_dados ->> 'quemPediu',
          nullif(btrim(coalesce(p_dados ->> 'observacao', '')), ''), p_pessoa, 'PENDENTE')
  returning * into x;
  perform registrar_historico('cliente.exclusao_pedida', 'cliente', p_cliente::text, jsonb_build_object('pedido_id', x.id, 'canal', x.canal));
  return pedido_exclusao_json(x);
end $$;

-- A sócia dona recusa o pedido, com o motivo (por exemplo, não veio do titular).
create function portal_cliente_recusar_exclusao(p_pessoa uuid, p_escritorio uuid, p_cliente uuid, p_motivo text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare x pedidos_exclusao;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.editar');
  perform so_socio_dono(p_pessoa, p_escritorio);
  perform cliente_para_exclusao(p_escritorio, p_cliente);
  if length(btrim(coalesce(p_motivo, ''))) not between 1 and 300 then perform recusar_campos('Escreva o motivo', 'motivo'); end if;
  if not exists (select 1 from pedidos_exclusao where cliente_id = p_cliente and estado = 'PENDENTE') then
    perform recusar_motivo('Não há pedido de exclusão aberto', 'SEM_PEDIDO');
  end if;
  perform definir_transicao('PEDIDO_RECUSADO');
  update pedidos_exclusao set estado = 'RECUSADO', resolvido_por = p_pessoa, resolvido_em = app_now(), motivo_recusa = btrim(p_motivo)
   where cliente_id = p_cliente and estado = 'PENDENTE'
  returning * into x;
  perform registrar_historico('cliente.exclusao_recusada', 'cliente', p_cliente::text, jsonb_build_object('pedido_id', x.id));
  return pedido_exclusao_json(x);
end $$;

-- Nome digitado para confirmar: sem diferença de maiúsculas e espaços.
create function nome_para_conferir(p text) returns text
language sql immutable
as $$ select lower(regexp_replace(btrim(coalesce(p, '')), '\s+', ' ', 'g')) $$;

-- A sócia dona exclui os dados (decisões 3 e 4). Tudo numa transação: se algo falha, nada muda.
create function portal_cliente_excluir_dados(p_pessoa uuid, p_escritorio uuid, p_cliente uuid, p_versao integer, p_dados jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c clientes_escritorio;
  v_campos text[];
  v_ano text := to_char(hoje_brasilia(), 'YYYY');
  v_protocolo text;
  v_versao integer;
  x pedidos_exclusao;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.editar');
  perform so_socio_dono(p_pessoa, p_escritorio);
  if p_versao is null then perform recusar_campos('Falta a versão lida', 'versao'); end if;
  c := cliente_para_exclusao(p_escritorio, p_cliente);
  if jsonb_typeof(p_dados) is distinct from 'object' then perform recusar_campos('Dados inválidos', 'dados'); end if;
  v_campos := pedido_exclusao_campos(p_dados, true);
  if coalesce(p_dados -> 'conferido', 'false'::jsonb) <> 'true'::jsonb then v_campos := array_append(v_campos, 'conferido'); end if;
  if nome_para_conferir(p_dados ->> 'nomeConfirmado') <> nome_para_conferir(c.nome) then
    v_campos := array_append(v_campos, 'nomeConfirmado');
  end if;
  if cardinality(v_campos) > 0 then perform recusar_campos('Confira a exclusão', variadic v_campos); end if;
  if c.versao <> p_versao then perform conflito_versao('clientes_escritorio', p_cliente); end if;

  -- Protocolo do escritório no ano, sem buraco: um por vez.
  perform pg_advisory_xact_lock(hashtext('pedidos_exclusao:' || p_escritorio::text));
  select 'EXC-' || v_ano || '-' || lpad((count(*) + 1)::text, 4, '0') into v_protocolo
    from pedidos_exclusao where escritorio_id = p_escritorio and protocolo like 'EXC-' || v_ano || '-%';

  if exists (select 1 from pedidos_exclusao where cliente_id = p_cliente and estado = 'PENDENTE') then
    perform definir_transicao('PEDIDO_ATENDIDO');
    update pedidos_exclusao set estado = 'ATENDIDO', pedido_em = (p_dados ->> 'pedidoEm')::date, canal = p_dados ->> 'canal',
           quem_pediu = p_dados ->> 'quemPediu',
           observacao = coalesce(nullif(btrim(coalesce(p_dados ->> 'observacao', '')), ''), observacao),
           resolvido_por = p_pessoa, resolvido_em = app_now(), protocolo = v_protocolo
     where cliente_id = p_cliente and estado = 'PENDENTE'
    returning * into x;
  else
    perform definir_transicao('PEDIDO_ATENDIDO');
    insert into pedidos_exclusao (escritorio_id, cliente_id, pedido_em, canal, quem_pediu, observacao, registrado_por, estado,
                                  resolvido_por, resolvido_em, protocolo)
    values (p_escritorio, p_cliente, (p_dados ->> 'pedidoEm')::date, p_dados ->> 'canal', p_dados ->> 'quemPediu',
            nullif(btrim(coalesce(p_dados ->> 'observacao', '')), ''), p_pessoa, 'ATENDIDO', p_pessoa, app_now(), v_protocolo)
    returning * into x;
  end if;

  perform definir_transicao('DADOS_EXCLUIDOS', v_protocolo);
  update clientes_escritorio set
    estado = 'EXCLUIDO', excluido_em = app_now(), nome = 'Cliente excluído', documento = null, contatos = '[]'::jsonb,
    nacionalidade = null, estado_civil = null, profissao = null, rg = null, rg_orgao = null, cep = null, endereco = null,
    bairro = null, cidade = null, uf = null, rep_nome = null, rep_cargo = null, rep_documento = null, rep_estado_civil = null,
    rep_profissao = null, origem_indicacao = null, motivo_inativacao = null
   where id = p_cliente
  returning versao into v_versao;
  update atendimentos set com_quem = null, prox_em = null, prox_responsavel = null, prox_oque = null
   where cliente_id = p_cliente
     and (com_quem is not null or prox_em is not null);
  perform registrar_historico('cliente.dados_excluidos', 'cliente', p_cliente::text,
    jsonb_build_object('pedido_id', x.id, 'protocolo', v_protocolo));
  return jsonb_build_object('protocolo', v_protocolo, 'versao', v_versao, 'pedido', pedido_exclusao_json(x));
end $$;

call fechar_acesso();
