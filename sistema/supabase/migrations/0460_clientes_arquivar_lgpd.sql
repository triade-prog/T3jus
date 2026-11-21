-- F1.16 (PT-11): pedido de exclusão de cliente com contrato ou processo. Desenho aprovado pela
-- Carol em 18/11/2026 (docs/design/aprovadas/portal-clientes-pendencias, estado excluir-depois,
-- decisão 5: "Não exclui, só arquiva").
--
-- Com contrato (de qualquer situação) ou processo, os dados continuam necessários (LGPD, art. 16):
-- a exclusão é recusada com TEM_CONTRATO_OU_PROCESSO e a sócia dona arquiva a pedido. Nada é
-- apagado; o cliente sai de Ativos, de Contato vencido, da busca e do Início e fica só em
-- Inativos, como "Arquivado a pedido (LGPD)"; a ficha fica só leitura (ninguém edita, reativa nem
-- registra atendimento); o próximo contato se encerra (ele só existe em cliente ativo); o pedido
-- fica registrado com data, canal, quem pediu, quem arquivou e o protocolo.

-- ---------------------------------------------------------------------------------------
-- O cliente arquivado: estado novo, sem volta.

alter table clientes_escritorio add column arquivado_em timestamptz;
alter table clientes_escritorio add constraint clientes_escritorio_arquivado_em
  check ((estado = 'ARQUIVADO') = (arquivado_em is not null));

insert into transicoes_permitidas (tabela, de, para) values
  ('clientes_escritorio', 'ATIVO', 'ARQUIVADO'),
  ('clientes_escritorio', 'INATIVO', 'ARQUIVADO');

-- O contrato e o processo que impedem a exclusão (nulo quando não há nenhum).
create function cliente_vinculos_lgpd(p_cliente uuid) returns jsonb
language sql stable
set search_path = public
as $$
  select case when x.contratos is null and x.processos is null then null
              else jsonb_build_object('contratos', coalesce(x.contratos, '[]'::jsonb), 'processos', coalesce(x.processos, '[]'::jsonb)) end
    from (select (select jsonb_agg(jsonb_build_object('id', c.id, 'numero', c.numero) order by c.criado_em)
                    from contratos c where c.cliente_id = p_cliente) contratos,
                 (select jsonb_agg(jsonb_build_object('id', s.id, 'nome', s.nome, 'numeroCnj', s.numero_cnj) order by s.criado_em)
                    from caso_clientes cc join casos s on s.id = cc.caso_id where cc.cliente_id = p_cliente) processos) x
$$;

-- Depois de excluído ou arquivado, nada mais muda no cliente (editar, inativar e reativar
-- recusam). E a exclusão de quem tem contrato ou processo é recusada aqui também, por qualquer
-- caminho que tente.
create or replace function cliente_excluido_nao_muda() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.estado = 'EXCLUIDO' then
    raise exception 'Os dados deste cliente foram excluídos a pedido do titular' using errcode = 'TC422',
      detail = jsonb_build_object('motivo', 'CLIENTE_EXCLUIDO')::text;
  end if;
  if old.estado = 'ARQUIVADO' then
    raise exception 'Este cliente foi arquivado a pedido do titular (LGPD)' using errcode = 'TC422',
      detail = jsonb_build_object('motivo', 'CLIENTE_ARQUIVADO')::text;
  end if;
  if new.estado = 'EXCLUIDO' and cliente_vinculos_lgpd(new.id) is not null then
    raise exception 'Cliente com contrato ou processo não se exclui: arquiva a pedido' using errcode = 'TC422',
      detail = jsonb_build_object('motivo', 'TEM_CONTRATO_OU_PROCESSO')::text;
  end if;
  return new;
end $$;

-- Atendimento novo em cliente excluído ou arquivado é recusado.
create or replace function atendimento_de_cliente_valido() returns trigger
language plpgsql
set search_path = public
as $$
declare v_estado text := (select estado from clientes_escritorio where id = new.cliente_id);
begin
  if v_estado = 'EXCLUIDO' then
    raise exception 'Os dados deste cliente foram excluídos a pedido do titular' using errcode = 'TC422',
      detail = jsonb_build_object('motivo', 'CLIENTE_EXCLUIDO')::text;
  end if;
  if v_estado = 'ARQUIVADO' then
    raise exception 'Este cliente foi arquivado a pedido do titular (LGPD)' using errcode = 'TC422',
      detail = jsonb_build_object('motivo', 'CLIENTE_ARQUIVADO')::text;
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------------------
-- O pedido arquivado: tem protocolo e quem pediu, como o atendido.

do $$
declare r record;
begin
  for r in select conname from pg_constraint
            where conrelid = 'pedidos_exclusao'::regclass and contype = 'c'
              and pg_get_constraintdef(oid) like '%''ATENDIDO''%'
  loop
    execute format('alter table pedidos_exclusao drop constraint %I', r.conname);
  end loop;
end $$;
alter table pedidos_exclusao add constraint pedidos_exclusao_protocolo_resolvido
  check ((estado in ('ATENDIDO', 'ARQUIVADO')) = (protocolo is not null));
alter table pedidos_exclusao add constraint pedidos_exclusao_quem_resolvido
  check (estado not in ('ATENDIDO', 'ARQUIVADO') or quem_pediu is not null);
insert into estados_iniciais (tabela, estado) values ('pedidos_exclusao', 'ARQUIVADO');
insert into transicoes_permitidas (tabela, de, para) values ('pedidos_exclusao', 'PENDENTE', 'ARQUIVADO');

-- Pedir, recusar, excluir e arquivar recusam o cliente que já foi excluído ou arquivado.
create or replace function cliente_para_exclusao(p_escritorio uuid, p_cliente uuid) returns clientes_escritorio
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
  if c.estado = 'ARQUIVADO' then
    perform recusar_motivo('Este cliente já foi arquivado a pedido do titular', 'CLIENTE_ARQUIVADO');
  end if;
  return c;
end $$;

-- A sócia dona arquiva a pedido (decisão 5). O pedido é o mesmo da exclusão, sem escrever o nome,
-- porque nada se perde. Tudo numa transação.
create function portal_cliente_arquivar_lgpd(p_pessoa uuid, p_escritorio uuid, p_cliente uuid, p_versao integer, p_dados jsonb)
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
  if cliente_vinculos_lgpd(p_cliente) is null then
    perform recusar_motivo('Sem contrato nem processo, o pedido se atende excluindo os dados', 'SEM_CONTRATO_OU_PROCESSO');
  end if;
  if jsonb_typeof(p_dados) is distinct from 'object' then perform recusar_campos('Dados inválidos', 'dados'); end if;
  v_campos := pedido_exclusao_campos(p_dados, true);
  if coalesce(p_dados -> 'conferido', 'false'::jsonb) <> 'true'::jsonb then v_campos := array_append(v_campos, 'conferido'); end if;
  if cardinality(v_campos) > 0 then perform recusar_campos('Confira o pedido', variadic v_campos); end if;
  if c.versao <> p_versao then perform conflito_versao('clientes_escritorio', p_cliente); end if;

  -- O protocolo é o mesmo dos pedidos de exclusão: um por vez, sem buraco no ano.
  perform pg_advisory_xact_lock(hashtext('pedidos_exclusao:' || p_escritorio::text));
  select 'EXC-' || v_ano || '-' || lpad((count(*) + 1)::text, 4, '0') into v_protocolo
    from pedidos_exclusao where escritorio_id = p_escritorio and protocolo like 'EXC-' || v_ano || '-%';

  perform definir_transicao('PEDIDO_ARQUIVADO');
  if exists (select 1 from pedidos_exclusao where cliente_id = p_cliente and estado = 'PENDENTE') then
    update pedidos_exclusao set estado = 'ARQUIVADO', pedido_em = (p_dados ->> 'pedidoEm')::date, canal = p_dados ->> 'canal',
           quem_pediu = p_dados ->> 'quemPediu',
           observacao = coalesce(nullif(btrim(coalesce(p_dados ->> 'observacao', '')), ''), observacao),
           resolvido_por = p_pessoa, resolvido_em = app_now(), protocolo = v_protocolo
     where cliente_id = p_cliente and estado = 'PENDENTE'
    returning * into x;
  else
    insert into pedidos_exclusao (escritorio_id, cliente_id, pedido_em, canal, quem_pediu, observacao, registrado_por, estado,
                                  resolvido_por, resolvido_em, protocolo)
    values (p_escritorio, p_cliente, (p_dados ->> 'pedidoEm')::date, p_dados ->> 'canal', p_dados ->> 'quemPediu',
            nullif(btrim(coalesce(p_dados ->> 'observacao', '')), ''), p_pessoa, 'ARQUIVADO', p_pessoa, app_now(), v_protocolo)
    returning * into x;
  end if;

  perform definir_transicao('ARQUIVADO_LGPD', v_protocolo);
  update clientes_escritorio set estado = 'ARQUIVADO', arquivado_em = app_now()
   where id = p_cliente
  returning versao into v_versao;
  perform registrar_historico('cliente.arquivado_lgpd', 'cliente', p_cliente::text,
    jsonb_build_object('pedido_id', x.id, 'protocolo', v_protocolo));
  return jsonb_build_object('protocolo', v_protocolo, 'versao', v_versao, 'pedido', pedido_exclusao_json(x));
end $$;

-- ---------------------------------------------------------------------------------------
-- Listas e ficha.

-- Linha da lista: o arquivado leva a data e o protocolo, e continua com o nome.
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
              when c.estado = 'ARQUIVADO' then jsonb_build_object('arquivamento', jsonb_build_object(
           'em', c.arquivado_em,
           'protocolo', (select x.protocolo from pedidos_exclusao x where x.cliente_id = c.id and x.estado = 'ARQUIVADO')))
         else '{}'::jsonb end
$$;

-- Lista: o arquivado aparece só em Inativos e não entra na busca, como o excluído.
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
    select jsonb_agg(l order by (l -> 'proxContato' ->> 'em') nulls last, l ->> 'situacao' in ('EXCLUIDO', 'ARQUIVADO'), l ->> 'nome')
      from (select cliente_linha(c, v_comercial) l
              from clientes_escritorio c
             where c.escritorio_id = p_escritorio
               and (case when v_termo <> '' then c.estado not in ('EXCLUIDO', 'ARQUIVADO')
                         when coalesce(p_situacao, 'ATIVO') = 'INATIVO' then c.estado in ('INATIVO', 'EXCLUIDO', 'ARQUIVADO')
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

-- Ficha: no arquivado, o registro do arquivamento; para a dona, o contrato e o processo que
-- fazem o pedido virar arquivamento.
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
  v := (to_jsonb(c) - 'escritorio_id' - 'origem' - 'origem_indicacao' - 'inativado_por' - 'criado_por' - 'estado' - 'excluido_em' - 'arquivado_em')
    || jsonb_build_object(
      'situacao', c.estado,
      'comercial', v_comercial,
      'dono', v_dono,
      'podeInativar', v_comercial and c.estado in ('ATIVO', 'INATIVO'),
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
                     from pedidos_exclusao x where x.cliente_id = c.id and x.estado = 'ATENDIDO'),
      'arquivamento', (select pedido_exclusao_json(x) || jsonb_build_object('em', c.arquivado_em)
                         from pedidos_exclusao x where x.cliente_id = c.id and x.estado = 'ARQUIVADO'),
      'vinculosLgpd', case when v_dono and c.estado in ('ATIVO', 'INATIVO') then cliente_vinculos_lgpd(c.id) end);
  if v_comercial then
    v := v || jsonb_build_object(
      'origem', c.origem, 'origemIndicacao', c.origem_indicacao, 'proxContato', prox_contato(c.id),
      'atendimentos', (select count(*) from atendimentos a where a.cliente_id = c.id),
      'primeiroAtendimento', (select jsonb_build_object('em', a.ocorrido_em, 'canal', a.canal)
                                from atendimentos a where a.cliente_id = c.id order by a.ocorrido_em limit 1));
  end if;
  return v;
end $$;

-- Editar o arquivado recusa antes de conferir os campos.
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
  if exists (select 1 from clientes_escritorio where id = p_cliente and escritorio_id = p_escritorio and estado = 'ARQUIVADO') then
    perform recusar_motivo('Este cliente foi arquivado a pedido do titular (LGPD)', 'CLIENTE_ARQUIVADO');
  end if;
  return cliente_gravar(p_pessoa, p_escritorio, p_cliente, p_versao, p_dados);
end $$;

call fechar_acesso();
