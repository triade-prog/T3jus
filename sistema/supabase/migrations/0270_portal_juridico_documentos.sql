-- Jurídico do Portal, parte 3b: documentos do caso (EX-03, EX-05, PD-05), tela aprovada em
-- docs/design/aprovadas/portal-juridico (ficha do caso, folha "Documentos").
-- - Ligados ao caso: o arquivo fica no Storage, num bucket privado só do Portal
--   (documentos-portal), com o mesmo envio em duas etapas dos documentos do Console (0120): a API
--   registra (ENVIANDO) e devolve um endereço de envio de uso único; depois de o arquivo chegar,
--   confere o tamanho e o tipo no Storage e conclui (PRONTO). O caminho é <escritório>/<documento>.
-- - Nada se apaga: cada arquivo fica com quem enviou e quando.
-- - Os que faltam: o pedido diz o que falta, com qual cliente do caso está e quando foi pedido.
--   "Já chegou" fecha o pedido, com ou sem o arquivo; "Pedir de novo" guarda a data do novo
--   pedido. Abrir a conversa do cliente pelo WhatsApp do escritório depende de Conversas (F3.42).
-- - O que falta entra em "O que está travando" e nas pendências da lista de casos.

create table documento_pedidos (
  id             uuid primary key default gen_random_uuid(),
  escritorio_id  uuid not null references escritorios (id) on delete restrict,
  caso_id        uuid not null references casos (id) on delete restrict,
  descricao      text not null check (length(btrim(descricao)) between 3 and 160),
  cliente_id     uuid not null references clientes_escritorio (id) on delete restrict,
  pedido_em      date not null,
  pedido_por     uuid not null references pessoas (id) on delete restrict,
  repedido_em    date,
  chegou_em      timestamptz,
  chegou_por     uuid references pessoas (id) on delete restrict,
  criado_em      timestamptz not null default app_now(),
  check ((chegou_em is null) = (chegou_por is null)),
  check (repedido_em is null or repedido_em >= pedido_em)
);
create index documento_pedidos_caso on documento_pedidos (caso_id) where chegou_em is null;
create index documento_pedidos_escritorio on documento_pedidos (escritorio_id, criado_em);
call proteger_tabela_escritorio('documento_pedidos');

create table documentos_caso (
  id            uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorios (id) on delete restrict,
  caso_id       uuid not null references casos (id) on delete restrict,
  categoria     text not null check (categoria in ('PETICAO', 'DECISAO', 'PROCURACAO', 'DOCUMENTO_CLIENTE', 'OUTRO')),
  nome          text not null check (length(btrim(nome)) between 1 and 200 and nome !~ '[/\\]'),
  tipo          text not null check (tipo in ('application/pdf', 'image/jpeg', 'image/png')),
  tamanho       integer not null check (tamanho between 1 and 10485760),
  pedido_id     uuid references documento_pedidos (id) on delete restrict,
  situacao      situacao_documento not null default 'ENVIANDO',
  enviado_por   uuid not null references pessoas (id) on delete restrict,
  criado_em     timestamptz not null default app_now(),
  concluido_em  timestamptz,
  check ((situacao = 'PRONTO') = (concluido_em is not null))
);
create index documentos_caso_caso on documentos_caso (caso_id, concluido_em desc) where situacao = 'PRONTO';
create index documentos_caso_escritorio on documentos_caso (escritorio_id, criado_em);
call proteger_tabela_escritorio('documentos_caso');

-- Guardar tudo: não se apaga, e a única mudança é ENVIANDO → PRONTO.
create function documento_caso_so_conclui() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Documento não se apaga' using errcode = 'TC023';
  end if;
  if old.situacao <> 'ENVIANDO' or new.situacao <> 'PRONTO'
     or (new.id, new.escritorio_id, new.caso_id, new.categoria, new.nome, new.tipo, new.tamanho, new.pedido_id, new.enviado_por, new.criado_em)
        is distinct from (old.id, old.escritorio_id, old.caso_id, old.categoria, old.nome, old.tipo, old.tamanho, old.pedido_id, old.enviado_por, old.criado_em) then
    raise exception 'Documento só muda de enviando para pronto' using errcode = 'TC023';
  end if;
  return new;
end $$;
create trigger documento_caso_so_conclui before update or delete on documentos_caso
  for each row execute function documento_caso_so_conclui();

-- O pedido não se apaga; depois de chegar, não muda mais.
create function documento_pedido_guarda() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Pedido de documento não se apaga' using errcode = 'TC023';
  end if;
  if old.chegou_em is not null
     or (new.id, new.escritorio_id, new.caso_id, new.descricao, new.cliente_id, new.pedido_em, new.pedido_por, new.criado_em)
        is distinct from (old.id, old.escritorio_id, old.caso_id, old.descricao, old.cliente_id, old.pedido_em, old.pedido_por, old.criado_em) then
    raise exception 'Pedido de documento só muda ao pedir de novo ou ao chegar' using errcode = 'TC023';
  end if;
  return new;
end $$;
create trigger documento_pedido_guarda before update or delete on documento_pedidos
  for each row execute function documento_pedido_guarda();

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('documento_pedidos', true, 'Documentos pedidos aos clientes do caso: o que falta, com quem está, quando foi pedido e quando chegou',
  'Saber o que falta para o caso andar (EX-05, PD-05)', 'Execução de contrato (LGPD, art. 7º, V)',
  'Escritório', 'Enquanto o escritório for cliente do T3jus e 5 anos depois do fim do contrato', 'Exportados ao escritório e apagados com ele', 'APROVADO', true),
 ('documentos_caso', true, 'Arquivos ligados ao caso (o arquivo fica no Storage), com quem enviou e quando',
  'Guardar os documentos do caso (EX-05)', 'Execução de contrato (LGPD, art. 7º, V) e exercício regular de direitos (art. 7º, VI)',
  'Escritório', 'Enquanto o escritório for cliente do T3jus e 5 anos depois do fim do contrato', 'Exportados ao escritório e apagados com ele, com o arquivo', 'APROVADO', true);

create function documento_pedido_linha(d documento_pedidos) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', d.id, 'descricao', d.descricao, 'pedidoEm', d.pedido_em, 'repedidoEm', d.repedido_em,
    'cliente', (select jsonb_build_object('id', k.id, 'nome', k.nome, 'telefone', contato_principal(k.contatos) ->> 'telefone')
                  from clientes_escritorio k where k.id = d.cliente_id),
    'pedidoPor', pessoa_ref(d.pedido_por))
$$;

create function documento_caso_linha(d documentos_caso) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', d.id, 'categoria', d.categoria, 'nome', d.nome, 'tipo', d.tipo, 'tamanho', d.tamanho,
    'enviadoPor', pessoa_ref(d.enviado_por), 'enviadoEm', d.concluido_em,
    'pedido', (select p.descricao from documento_pedidos p where p.id = d.pedido_id))
$$;

-- A lista de casos conta como pendência também o documento que falta.
create or replace function caso_linha(c casos) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', c.id, 'nome', c.nome, 'area', c.area, 'numero', c.numero_cnj, 'situacao', c.situacao, 'resultado', c.resultado,
    'parteContraria', c.parte_contraria,
    'cliente', (select jsonb_build_object('id', k.id, 'nome', k.nome) from caso_clientes cc join clientes_escritorio k on k.id = cc.cliente_id
                 where cc.caso_id = c.id order by cc.ordem limit 1),
    'outrosClientes', (select count(*) - 1 from caso_clientes cc where cc.caso_id = c.id),
    'semContrato', exists (select 1 from caso_clientes cc where cc.caso_id = c.id and cc.contrato_id is null),
    'etapa', (select jsonb_build_object('id', e.id, 'ordem', e.ordem, 'nome', e.nome, 'final', e.final) from etapas e where e.id = c.etapa_id),
    'responsavel', pessoa_ref(c.responsavel_id),
    'etapaDesde', c.etapa_desde,
    'proximoPrazo', (select jsonb_build_object('data', p.data_final, 'fazerAte', p.fazer_ate, 'descricao', p.descricao)
                       from prazos p where p.caso_id = c.id and p.cumprido_em is null order by p.data_final, p.criado_em limit 1),
    'pendencias', (select count(*) from tarefas t where t.caso_id = c.id and t.concluida_em is null and t.esperando is not null)
                  + (select count(*) from documento_pedidos d where d.caso_id = c.id and d.chegou_em is null))
$$;

-- A ficha ganha os documentos: os que faltam (do pedido mais antigo) e os ligados (do mais novo).
create or replace function portal_juridico_caso(p_pessoa uuid, p_escritorio uuid, p_caso uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c casos;
  v_valores boolean;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.ver');
  select * into c from casos where id = p_caso and escritorio_id = p_escritorio;
  if c.id is null then raise exception 'Caso não encontrado' using errcode = 'TC404'; end if;
  v_valores := caso_ve_honorarios(p_pessoa, p_escritorio);
  return caso_linha(c) || jsonb_build_object(
    'tribunal', c.tribunal, 'vara', c.vara, 'sistema', c.sistema, 'distribuidoEm', c.distribuido_em, 'valorCausa', c.valor_causa,
    'avisarCliente', c.avisar_cliente, 'encerradoEm', c.encerrado_em, 'versao', c.versao, 'criadoEm', c.criado_em,
    'veHonorarios', v_valores,
    'escritorio', (select nome from escritorios where id = p_escritorio),
    'clientes', caso_clientes_lista(c.id, v_valores),
    'etapas', etapas_lista(p_escritorio),
    'hoje', hoje_brasilia(),
    'mudancas', coalesce((select jsonb_agg(jsonb_build_object(
        'para', (select jsonb_build_object('ordem', e.ordem, 'nome', e.nome) from etapas e where e.id = m.para_etapa_id),
        'de', (select jsonb_build_object('ordem', e.ordem, 'nome', e.nome) from etapas e where e.id = m.de_etapa_id),
        'motivo', m.motivo, 'resultado', m.resultado, 'aviso', m.aviso_texto, 'avisoEnviadoEm', m.aviso_enviado_em,
        'por', pessoa_ref(m.por), 'em', m.em) order by m.ordem desc)
      from caso_etapa_mudancas m where m.caso_id = c.id), '[]'::jsonb),
    'quemTemContratos', quem_tem_area(p_escritorio, 'CONTRATOS'),
    'prazos', coalesce((select jsonb_agg(prazo_linha(p) order by (p.cumprido_em is not null), p.data_final, p.cumprido_em desc)
                          from prazos p where p.caso_id = c.id
                           and (p.cumprido_em is null or p.cumprido_em > app_now() - interval '30 days')), '[]'::jsonb),
    'tarefas', coalesce((select jsonb_agg(tarefa_linha(t) order by (t.concluida_em is not null), t.vence_em, t.concluida_em desc)
                           from tarefas t where t.caso_id = c.id
                            and (t.concluida_em is null or t.concluida_em > app_now() - interval '30 days')), '[]'::jsonb),
    'faltam', coalesce((select jsonb_agg(documento_pedido_linha(d) order by d.pedido_em, d.criado_em)
                          from documento_pedidos d where d.caso_id = c.id and d.chegou_em is null), '[]'::jsonb),
    'documentos', coalesce((select jsonb_agg(documento_caso_linha(d) order by d.concluido_em desc, d.id)
                              from documentos_caso d where d.caso_id = c.id and d.situacao = 'PRONTO'), '[]'::jsonb));
end $$;

-- ---------------------------------------------------------------------------------------
-- Os que faltam.

create function portal_juridico_documento_pedir(p_pessoa uuid, p_escritorio uuid, p_caso uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e text[] := '{}';
  v_cliente uuid;
  d documento_pedidos;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.editar');
  if not exists (select 1 from casos where id = p_caso and escritorio_id = p_escritorio) then
    raise exception 'Caso não encontrado' using errcode = 'TC404';
  end if;
  if not caso_aberto_do_escritorio(p_caso, p_escritorio) then
    perform recusar_motivo('Este caso está encerrado', 'CASO_ENCERRADO');
  end if;
  if not coalesce(json_texto_ok(p_dados, 'descricao', 3, 160), false) then e := e || 'descricao'::text; end if;
  begin
    v_cliente := (p_dados ->> 'clienteId')::uuid;
  exception when invalid_text_representation then
    v_cliente := null;
  end;
  if v_cliente is null or not exists (select 1 from caso_clientes where caso_id = p_caso and cliente_id = v_cliente) then
    e := e || 'clienteId'::text;
  end if;
  if cardinality(e) > 0 then perform recusar_campos('Confira o pedido.', variadic e); end if;
  insert into documento_pedidos (escritorio_id, caso_id, descricao, cliente_id, pedido_em, pedido_por)
  values (p_escritorio, p_caso, btrim(p_dados ->> 'descricao'), v_cliente, hoje_brasilia(), p_pessoa)
  returning * into d;
  perform registrar_historico('juridico.documento_pedido', 'casos', p_caso::text,
    jsonb_build_object('pedido', d.id, 'descricao', d.descricao, 'cliente', v_cliente));
  return documento_pedido_linha(d);
end $$;

create function documento_pedido_aberto(p_pessoa uuid, p_escritorio uuid, p_pedido uuid) returns documento_pedidos
language plpgsql
set search_path = public
as $$
declare d documento_pedidos;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.editar');
  select * into d from documento_pedidos where id = p_pedido and escritorio_id = p_escritorio for update;
  if d.id is null then raise exception 'Pedido não encontrado' using errcode = 'TC404'; end if;
  if d.chegou_em is not null then perform recusar_motivo('Este documento já chegou', 'DOCUMENTO_JA_CHEGOU'); end if;
  return d;
end $$;

-- "Pedir de novo": guarda a data do novo pedido (o texto pronto sai na tela).
create function portal_juridico_documento_repedir(p_pessoa uuid, p_escritorio uuid, p_pedido uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare d documento_pedidos;
begin
  d := documento_pedido_aberto(p_pessoa, p_escritorio, p_pedido);
  update documento_pedidos set repedido_em = hoje_brasilia() where id = d.id returning * into d;
  perform registrar_historico('juridico.documento_repedido', 'casos', d.caso_id::text,
    jsonb_build_object('pedido', d.id, 'descricao', d.descricao));
  return documento_pedido_linha(d);
end $$;

-- "Já chegou" sem arquivo: o pedido sai de "Faltam" e de "O que está travando".
create function portal_juridico_documento_chegou(p_pessoa uuid, p_escritorio uuid, p_pedido uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare d documento_pedidos;
begin
  d := documento_pedido_aberto(p_pessoa, p_escritorio, p_pedido);
  update documento_pedidos set chegou_em = app_now(), chegou_por = p_pessoa where id = d.id returning * into d;
  perform registrar_historico('juridico.documento_chegou', 'casos', d.caso_id::text,
    jsonb_build_object('pedido', d.id, 'descricao', d.descricao, 'comArquivo', false));
  return jsonb_build_object('id', d.id, 'chegouEm', d.chegou_em);
end $$;

-- ---------------------------------------------------------------------------------------
-- Os ligados ao caso.

-- Registrar o envio: devolve o id, que vira o nome do arquivo no Storage (<escritório>/<id>).
-- Com pedidoId, o arquivo é o documento que faltava e, ao concluir, fecha o pedido.
create function portal_juridico_documento_iniciar(p_pessoa uuid, p_escritorio uuid, p_caso uuid, p_dados jsonb) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_pedido uuid;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.editar');
  if not exists (select 1 from casos where id = p_caso and escritorio_id = p_escritorio) then
    raise exception 'Caso não encontrado' using errcode = 'TC404';
  end if;
  if nullif(p_dados ->> 'pedidoId', '') is not null then
    begin
      v_pedido := (p_dados ->> 'pedidoId')::uuid;
    exception when invalid_text_representation then
      v_pedido := null;
    end;
    if v_pedido is null or not exists (select 1 from documento_pedidos where id = v_pedido and caso_id = p_caso and chegou_em is null) then
      perform recusar_campos('Este documento não está faltando', 'pedidoId');
    end if;
  end if;
  begin
    insert into documentos_caso (escritorio_id, caso_id, categoria, nome, tipo, tamanho, pedido_id, enviado_por)
    values (p_escritorio, p_caso, p_dados ->> 'categoria', btrim(p_dados ->> 'nome'), p_dados ->> 'tipo',
            (p_dados ->> 'tamanho')::integer, v_pedido, p_pessoa)
    returning id into v_id;
  exception when check_violation or not_null_violation or invalid_text_representation or numeric_value_out_of_range then
    perform recusar_campos('Arquivo não aceito', 'arquivo');
  end;
  return v_id;
end $$;

-- O documento a enviar (registrado, ainda não pronto), para a API conferir no Storage.
create function portal_juridico_documento_para_concluir(p_pessoa uuid, p_escritorio uuid, p_documento uuid)
returns table (tipo text, tamanho integer)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.editar');
  return query select d.tipo, d.tamanho from documentos_caso d
                where d.id = p_documento and d.escritorio_id = p_escritorio and d.enviado_por = p_pessoa;
  if not found then
    raise exception 'Documento não encontrado' using errcode = 'TC404';
  end if;
end $$;

-- Concluir: a API já conferiu no Storage que o arquivo chegou com o tamanho e o tipo
-- registrados. Só quem iniciou conclui. O pedido ligado, se ainda faltava, fecha junto.
create function portal_juridico_documento_concluir(p_pessoa uuid, p_escritorio uuid, p_documento uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare d documentos_caso;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.editar');
  select * into d from documentos_caso where id = p_documento and escritorio_id = p_escritorio and enviado_por = p_pessoa for update;
  if d.id is null then raise exception 'Documento não encontrado' using errcode = 'TC404'; end if;
  if d.situacao = 'ENVIANDO' then
    update documentos_caso set situacao = 'PRONTO', concluido_em = app_now() where id = d.id returning * into d;
    perform registrar_historico('juridico.documento_anexado', 'casos', d.caso_id::text,
      jsonb_build_object('documento', d.id, 'categoria', d.categoria, 'tipo', d.tipo, 'tamanho', d.tamanho, 'pedido', d.pedido_id));
    if d.pedido_id is not null then
      update documento_pedidos set chegou_em = app_now(), chegou_por = p_pessoa where id = d.pedido_id and chegou_em is null;
      if found then
        perform registrar_historico('juridico.documento_chegou', 'casos', d.caso_id::text,
          jsonb_build_object('pedido', d.pedido_id, 'comArquivo', true));
      end if;
    end if;
  end if;
  return documento_caso_linha(d);
end $$;

-- Abrir: confere a área e devolve o nome (para o download); a API gera o link temporário.
-- Cada abertura fica no histórico do escritório.
create function portal_juridico_documento_abrir(p_pessoa uuid, p_escritorio uuid, p_documento uuid) returns text
language plpgsql
security definer
set search_path = public
as $$
declare d documentos_caso;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.ver');
  select * into d from documentos_caso where id = p_documento and escritorio_id = p_escritorio and situacao = 'PRONTO';
  if d.id is null then raise exception 'Documento não encontrado' using errcode = 'TC404'; end if;
  perform registrar_historico('juridico.documento_aberto', 'casos', d.caso_id::text, jsonb_build_object('documento', d.id));
  return d.nome;
end $$;

call fechar_acesso();
