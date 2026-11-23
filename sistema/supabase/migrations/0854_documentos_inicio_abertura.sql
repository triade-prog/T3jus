-- Jornada do cliente, parte 4b (EX-18, F3.131), desenho aprovado em
-- docs/design/aprovadas/portal-jornada-fechamento (grupo 9, decisões 43 a 48):
-- 1. A prévia da lista na abertura do caso: o que a ficha já tem ("Já temos"), o comprovante
--    vencido e o que falta pedir, com o contato principal e o texto do aviso.
-- 2. As quatro portas do caso (Registrar assinatura, Anexar os assinados, Abrir o caso e Novo
--    caso) criam os pedidos na mesma transação do caso. O que a ficha já tem entra como pedido
--    que já chegou ("Da ficha"). Sem a área Jurídico, a lista entra inteira, sem conferir.
--    O aviso ao contato sai pela fila do WhatsApp com o aviso aprovado "Pedido de documento";
--    se ele falhar, o caso e os pedidos ficam.
-- 3. O próximo passo da ficha do cliente ganha "Juntar os documentos" (DOCUMENTOS), antes de
--    CASO; a ficha do caso ganha a contagem; quando o último chega, a responsável recebe o aviso
--    no sino. "Mudar etapa" continua livre (pergunta 8).

-- "Comprovante de residência" vira "comprovante de residência" no meio da frase; "RG e CPF" não.
create function texto_no_meio(p text) returns text
language sql immutable
as $$ select case when substr(p, 2, 1) ~ '[a-zà-ÿ]' then lower(left(p, 1)) || substr(p, 2) else p end $$;

-- Como o documento entra no aviso: o nome e, entre parênteses, o "como pedir" do escritório.
create function documento_inicio_no_aviso(p_nome text, p_como text) returns text
language sql immutable
as $$
  select texto_no_meio(btrim(p_nome))
         || coalesce(' (' || texto_no_meio(rtrim(btrim(nullif(btrim(coalesce(p_como, '')), '')), '.')) || ')', '')
$$;

-- ---------------------------------------------------------------------------------------
-- 1. A prévia: a lista da área com o que a ficha do cliente já tem.
create function caso_documentos_previa(p_escritorio uuid, p_area text, p_cliente uuid) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  k clientes_escritorio;
  ct jsonb;
begin
  if p_cliente is not null then
    select * into k from clientes_escritorio where id = p_cliente and escritorio_id = p_escritorio and estado <> 'EXCLUIDO';
  end if;
  ct := case when k.id is not null then contato_principal(k.contatos) end;
  perform whatsapp_avisos_garantir(p_escritorio, 'NAO_ENVIADO');
  return jsonb_build_object(
    'area', p_area,
    'itens', coalesce((
      select jsonb_agg(jsonb_build_object('itemId', i.id, 'nome', i.nome, 'comoPedir', i.como_pedir, 'pessoal', i.pessoal, 'seHouver', i.se_houver,
               'noAviso', documento_inicio_no_aviso(i.nome, i.como_pedir),
               'situacao', case when d.linha is null then 'PEDIR' when (d.linha ->> 'vencido')::boolean then 'VENCIDO' else 'JA_TEMOS' end,
               'doc', d.linha) order by i.ordem, i.criado_em)
        from documentos_inicio i
        left join lateral (select cliente_documento_linha(x) linha from cliente_documentos_em_uso(p_escritorio, k.id) x
                            where i.pessoal is not null and i.pessoal <> 'OUTRO' and x.tipo = i.pessoal
                            order by x.concluido_em desc limit 1) d on true
       where i.escritorio_id = p_escritorio and i.area = p_area and i.removido_em is null), '[]'::jsonb),
    'cliente', case when k.id is not null then jsonb_build_object('id', k.id, 'nome', k.nome) end,
    'contato', case when k.id is not null then jsonb_build_object(
                 'nome', coalesce(nullif(btrim(ct ->> 'nome'), ''), k.nome),
                 'celular', ct ->> 'telefone' is not null and not telefone_fixo_br(ct ->> 'telefone'),
                 'semAvisos', exists (select 1 from clientes_sem_avisos s where s.cliente_id = k.id and s.retirado_em is null and s.tipo = 'TODOS')) end,
    'whatsappLigado', whatsapp_ligado(p_escritorio),
    'modelo', (select w.texto from whatsapp_avisos w where w.escritorio_id = p_escritorio and w.chave = 'DOCUMENTO_PEDIDO'),
    'escritorio', (select e.nome from escritorios e where e.id = p_escritorio));
end $$;

-- Quem vê a ficha do cliente vê a prévia (a porta da assinatura pode ser de quem não tem
-- Jurídico). "podeConferir" diz se a pessoa escolhe o que pedir.
create function portal_cliente_documentos_previa(p_pessoa uuid, p_escritorio uuid, p_area text, p_cliente uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.ver');
  if p_area is null or not area_direito_valida(p_area) then perform recusar_campos('Escolha a área', 'area'); end if;
  if p_cliente is not null and not exists (select 1 from clientes_escritorio where id = p_cliente and escritorio_id = p_escritorio and estado <> 'EXCLUIDO') then
    raise exception 'Cliente não encontrado' using errcode = 'TC404';
  end if;
  return caso_documentos_previa(p_escritorio, p_area, p_cliente) || jsonb_build_object(
    'podeConferir', 'JURIDICO' = any (areas_da_pessoa(p_pessoa, p_escritorio)) and pode(p_pessoa, p_escritorio, 'juridico.editar'));
end $$;

-- ---------------------------------------------------------------------------------------
-- 2. Os pedidos na abertura. p_docs = { pedir: [itemId], mais: [texto], avisar: boolean }.
--    Sem p_docs (ou sem conferir), a lista inteira, sem aviso. p_campo é o prefixo do erro.
create function caso_documentos_criar(p_pessoa uuid, p_escritorio uuid, p_caso uuid, p_cliente uuid, p_docs jsonb,
                                      p_conferir boolean, p_campo text) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  ca casos;
  k clientes_escritorio;
  v_prev jsonb;
  x jsonb;
  v_conferir boolean := p_conferir and p_docs is not null and jsonb_typeof(p_docs) = 'object';
  v_pedir text[] := '{}';
  v_mais text[] := '{}';
  v_t text;
  v_abertos uuid[] := '{}';
  v_nomes text[] := '{}';
  v_temos integer := 0;
  v_id uuid;
  v_msg uuid;
  v_motivo text;
  v_det text;
  ct jsonb;
  a jsonb;
  v_conv uuid;
begin
  select * into ca from casos where id = p_caso and escritorio_id = p_escritorio;
  select * into k from clientes_escritorio where id = p_cliente and escritorio_id = p_escritorio;
  if ca.id is null or k.id is null then return null; end if;
  if v_conferir and jsonb_typeof(p_docs -> 'pedir') = 'array' then
    select coalesce(array_agg(v), '{}') into v_pedir from jsonb_array_elements_text(p_docs -> 'pedir') v;
  end if;
  if p_docs is not null and jsonb_typeof(p_docs -> 'mais') = 'array' then
    for v_t in select btrim(v) from jsonb_array_elements_text(p_docs -> 'mais') v loop
      continue when v_t = '';
      if length(v_t) not between 3 and 160 then perform recusar_campos('Confira o documento a pedir', p_campo || '.mais'); end if;
      v_mais := v_mais || v_t;
    end loop;
    if cardinality(v_mais) > 10 then perform recusar_campos('Peça até 10 documentos a mais', p_campo || '.mais'); end if;
  end if;
  v_prev := caso_documentos_previa(p_escritorio, ca.area, k.id);

  for x in select j from jsonb_array_elements(v_prev -> 'itens') j loop
    if x ->> 'situacao' = 'JA_TEMOS' then
      -- O que a ficha já tem entra no caso como chegado, com o documento da ficha (selo "Da ficha").
      insert into documento_pedidos (escritorio_id, caso_id, descricao, cliente_id, pedido_em, pedido_por, chegou_em, chegou_por,
                                     tipo_pessoal, item_id, inicio, da_ficha_id)
      values (p_escritorio, p_caso, x ->> 'nome', k.id, hoje_brasilia(), p_pessoa, app_now(), p_pessoa,
              x ->> 'pessoal', (x ->> 'itemId')::uuid, true, (x -> 'doc' ->> 'id')::uuid);
      v_temos := v_temos + 1;
    elsif not v_conferir or (x ->> 'itemId') = any (v_pedir) then
      insert into documento_pedidos (escritorio_id, caso_id, descricao, cliente_id, pedido_em, pedido_por, tipo_pessoal, item_id, inicio)
      values (p_escritorio, p_caso, x ->> 'nome', k.id, hoje_brasilia(), p_pessoa, x ->> 'pessoal', (x ->> 'itemId')::uuid, true)
      returning id into v_id;
      v_abertos := v_abertos || v_id;
      v_nomes := v_nomes || (x ->> 'noAviso');
    end if;
  end loop;
  foreach v_t in array v_mais loop
    insert into documento_pedidos (escritorio_id, caso_id, descricao, cliente_id, pedido_em, pedido_por, inicio)
    values (p_escritorio, p_caso, v_t, k.id, hoje_brasilia(), p_pessoa, true)
    returning id into v_id;
    v_abertos := v_abertos || v_id;
    v_nomes := v_nomes || texto_no_meio(v_t);
  end loop;

  -- Decisão 44: o aviso ao contato principal, só com o que falta. Se falhar, o caso e os pedidos ficam.
  if coalesce((p_docs ->> 'avisar')::boolean, false) and cardinality(v_abertos) > 0 then
    begin
      ct := aviso_contato_celular(k);
      a := aviso_preencher(p_escritorio, 'DOCUMENTO_PEDIDO', k, jsonb_build_object('caso', ca.nome, 'documento', automacao_lista(v_nomes)));
      if a ->> 'texto' is null then perform recusar_motivo('Falta um dado para completar o aviso', 'AVISO_INCOMPLETO'); end if;
      v_conv := carne_conversa(p_escritorio, k, ct);
      insert into conversa_mensagens (escritorio_id, conversa_id, autor, texto, aviso_tipo, envio, dados)
      values (p_escritorio, v_conv, 'AVISO', a ->> 'texto', 'Pedido de documento', 'NA_FILA',
              jsonb_build_object('pedido', v_abertos[1], 'pedidos', to_jsonb(v_abertos), 'inicio', true, 'pessoa', p_pessoa,
                                 'aviso', 'DOCUMENTO_PEDIDO', 'campos', a -> 'campos'))
      returning id into v_msg;
      update conversas set ultima_em = app_now() where id = v_conv;
    exception when others then
      get stacked diagnostics v_det = pg_exception_detail;
      v_msg := null;
      begin v_motivo := coalesce(v_det::jsonb ->> 'motivo', 'AVISO_NAO_SAIU'); exception when others then v_motivo := 'AVISO_NAO_SAIU'; end;
    end;
  end if;

  if v_temos + cardinality(v_abertos) > 0 then
    perform registrar_historico('juridico.documentos_inicio', 'casos', p_caso::text, jsonb_strip_nulls(jsonb_build_object(
      'cliente', k.id, 'temos', v_temos, 'pedidos', cardinality(v_abertos), 'mais', cardinality(v_mais), 'conferido', v_conferir,
      'mensagem', v_msg, 'avisoMotivo', v_motivo)));
  end if;
  return jsonb_strip_nulls(jsonb_build_object('temos', v_temos, 'pedidos', cardinality(v_abertos), 'mensagem', v_msg, 'avisoMotivo', v_motivo));
end $$;

-- As três portas do contrato passam por aqui (0740/0850): só o caso NOVO, aberto agora, leva a lista.
alter function contrato_ligar_caso(uuid, uuid, contratos, jsonb, boolean) rename to contrato_ligar_caso_sem_docs;
create function contrato_ligar_caso(p_pessoa uuid, p_escritorio uuid, c contratos, p_caso jsonb, p_na_assinatura boolean) returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_ja boolean := contrato_caso_ligado(c.id) is not null;
  v_id uuid;
begin
  v_id := contrato_ligar_caso_sem_docs(p_pessoa, p_escritorio, c, p_caso, p_na_assinatura);
  if not v_ja and coalesce(p_caso ->> 'modo', '') = 'NOVO' then
    perform caso_documentos_criar(p_pessoa, p_escritorio, v_id, c.cliente_id, nullif(p_caso -> 'documentos', 'null'::jsonb),
      'JURIDICO' = any (areas_da_pessoa(p_pessoa, p_escritorio)) and pode(p_pessoa, p_escritorio, 'juridico.editar'), 'caso.documentos');
  end if;
  return v_id;
end $$;

-- Novo caso: a lista vai para o primeiro cliente.
alter function portal_juridico_caso_criar(uuid, uuid, jsonb) rename to juridico_caso_criar_sem_docs;
create function portal_juridico_caso_criar(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r jsonb := juridico_caso_criar_sem_docs(p_pessoa, p_escritorio, p_dados);
  v_cli uuid;
begin
  select cliente_id into v_cli from caso_clientes where caso_id = (r ->> 'id')::uuid order by ordem limit 1;
  if v_cli is not null then
    perform caso_documentos_criar(p_pessoa, p_escritorio, (r ->> 'id')::uuid, v_cli, nullif(p_dados -> 'documentos', 'null'::jsonb), true, 'documentos');
  end if;
  return r;
end $$;

-- ---------------------------------------------------------------------------------------
-- 3. O que a ficha do caso mostra de cada pedido: também se é pessoal e se é dos de começar.
create or replace function documento_pedido_linha(d documento_pedidos) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', d.id, 'descricao', d.descricao, 'pedidoEm', d.pedido_em, 'repedidoEm', d.repedido_em,
    'tipoPessoal', d.tipo_pessoal, 'inicio', d.inicio,
    'repedido', case when d.repedido_mensagem_id is not null then aviso_mensagem(d.repedido_mensagem_id) end,
    'cliente', (select jsonb_build_object('id', k.id, 'nome', k.nome, 'telefone', ct ->> 'telefone',
                                          'contato', ct ->> 'nome',
                                          'celular', ct ->> 'telefone' is not null and not telefone_fixo_br(ct ->> 'telefone'))
                  from clientes_escritorio k, lateral (select contato_principal(k.contatos) ct) c where k.id = d.cliente_id),
    'pedidoPor', pessoa_ref(d.pedido_por),
    'lembrete', (select jsonb_build_object('automacao', jsonb_build_object('id', y.id, 'nome', y.nome), 'enviadoEm', x.ultima_msg_em,
                                           'ate', x.proximo_em,
                                           'passaPara', case when x.proximo_em is not null then pessoa_ref(automacao_passa_para(x, y)) end)
                   from automacao_execucoes x join automacoes y on y.id = x.automacao_id
                  where x.escritorio_id = d.escritorio_id and x.origem = 'DOCUMENTO' and d.id = any (x.documentos) and x.ultima_msg_em is not null
                  order by x.iniciada_em desc limit 1))
$$;

-- A mensagem da lista, para dizer quem recebeu e quando.
create function documentos_inicio_aviso(p_caso uuid) returns jsonb
language sql stable
set search_path = public
as $$
  select aviso_mensagem(m.id) from conversa_mensagens m
   where m.dados ->> 'inicio' = 'true'
     and (m.dados ->> 'pedido') in (select p.id::text from documento_pedidos p where p.caso_id = p_caso and p.inicio)
   order by m.criada_em desc limit 1
$$;

-- A contagem dos de começar de um caso (de um cliente, ou de todos), com o que falta e o que já temos.
create function documentos_inicio_do_caso(p_caso uuid, p_cliente uuid) returns jsonb
language sql stable
set search_path = public
as $$
  select case when count(*) = 0 then null else jsonb_build_object(
    'total', count(*),
    'chegaram', count(*) filter (where p.chegou_em is not null),
    'area', (select ca.area from casos ca where ca.id = p_caso),
    'faltam', coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'descricao', p.descricao, 'tipoPessoal', p.tipo_pessoal)
                                 order by p.criado_em, p.id) filter (where p.chegou_em is null), '[]'::jsonb),
    'temos', coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'descricao', p.descricao, 'tipoPessoal', p.tipo_pessoal,
                                                   'chegouEm', p.chegou_em, 'chegouPor', pessoa_ref(p.chegou_por), 'daFicha', p.da_ficha_id is not null)
                                order by p.chegou_em, p.criado_em) filter (where p.chegou_em is not null), '[]'::jsonb),
    'aviso', documentos_inicio_aviso(p_caso)) end
    from documento_pedidos p
   where p.caso_id = p_caso and p.inicio and (p_cliente is null or p.cliente_id = p_cliente)
$$;

alter function portal_juridico_caso(uuid, uuid, uuid) rename to juridico_caso_sem_inicio;
create function portal_juridico_caso(p_pessoa uuid, p_escritorio uuid, p_caso uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return juridico_caso_sem_inicio(p_pessoa, p_escritorio, p_caso) || jsonb_build_object('inicio', documentos_inicio_do_caso(p_caso, null));
end $$;

-- O próximo passo (decisão 46): o caso em andamento com documento de começar faltando.
alter function cliente_passo(uuid, uuid, uuid) rename to cliente_passo_sem_docs;
create function cliente_passo(p_pessoa uuid, p_escritorio uuid, p_cliente uuid) returns jsonb
language plpgsql stable
set search_path = public
as $$
declare
  r jsonb := cliente_passo_sem_docs(p_pessoa, p_escritorio, p_cliente);
  v_ini jsonb;
begin
  if r ->> 'tipo' is distinct from 'CASO' then return r; end if;
  v_ini := documentos_inicio_do_caso((r -> 'item' ->> 'id')::uuid, p_cliente);
  if v_ini is null or (v_ini ->> 'chegaram')::int >= (v_ini ->> 'total')::int then return r; end if;
  return r || jsonb_build_object('tipo', 'DOCUMENTOS', 'item', (r -> 'item') || jsonb_build_object(
    'chegaram', (v_ini ->> 'chegaram')::int, 'total', (v_ini ->> 'total')::int, 'faltam', v_ini -> 'faltam', 'aviso', v_ini -> 'aviso'));
end $$;

-- ---------------------------------------------------------------------------------------
-- 4. Quando o último chega, a responsável recebe o aviso no sino (decisão 48).
do $$
declare
  v_tipos text[];
begin
  select array_agg(distinct x) into v_tipos from (
    select unnest(regexp_matches(pg_get_constraintdef(oid), '''([A-Z0-9_]+)''', 'g')) x
      from pg_constraint where conrelid = 'avisos_sino'::regclass and conname = 'avisos_sino_tipo_check'
    union select 'DOCUMENTOS_INICIO_CHEGARAM') t;
  alter table avisos_sino drop constraint avisos_sino_tipo_check;
  execute format('alter table avisos_sino add constraint avisos_sino_tipo_check check (tipo in (%s))',
                 (select string_agg(quote_literal(x), ', ' order by x) from unnest(v_tipos) x));
end $$;

create function documentos_inicio_chegaram() returns trigger
language plpgsql
set search_path = public
as $$
declare ca casos;
begin
  if new.inicio and old.chegou_em is null and new.chegou_em is not null
     and not exists (select 1 from documento_pedidos p where p.caso_id = new.caso_id and p.inicio and p.chegou_em is null) then
    select * into ca from casos where id = new.caso_id;
    perform aviso_sino(new.escritorio_id, ca.responsavel_id, new.chegou_por, 'DOCUMENTOS_INICIO_CHEGARAM', 'casos', ca.id,
      jsonb_build_object('caso', ca.nome, 'cliente', (select nome from clientes_escritorio where id = new.cliente_id),
                         'total', (select count(*) from documento_pedidos p where p.caso_id = new.caso_id and p.inicio),
                         'quem', (select nome from pessoas where id = new.chegou_por)));
  end if;
  return null;
end $$;

create trigger documentos_inicio_chegaram after update of chegou_em on documento_pedidos
  for each row execute function documentos_inicio_chegaram();

call fechar_acesso();
