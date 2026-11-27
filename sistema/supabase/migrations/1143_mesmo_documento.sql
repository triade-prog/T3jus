-- O outro cadastro com o mesmo CPF (ou CNPJ) na exclusão e no arquivamento a pedido do titular
-- (F3.188, PT-11; e a D6, AP-01, só na tela), pelo plano revisado (project-files
-- t3jus/f3-181-190/plano.md, seção 5, e revisao.md, A1, M3, M4, D4 e a C7 na variante B'). Desenho
-- aprovado pela Carol em 27/11/2026, com todas as recomendações, em
-- docs/design/aprovadas/portal-exclusao-contratos-conversas (NOTAS.md, itens 8, 9 e 10, e "O campo que
-- o servidor devolve"). Segunda entrega do desenho; a primeira é a 1140 a 1142.
--
-- O mesmo documento existe em dois cadastros do mesmo escritório (o índice da 0160 não é único: o
-- cadastro à mão e pela conversa só avisam, a edição do CPF também, e a importação com NOVO cria o
-- segundo). A exclusão só zera o documento do próprio cliente. Com a C7 na B', a janela mostra os
-- outros cadastros e, para cada um ATIVO ou INATIVO sem pedido aberto, uma caixa já marcada; os ids
-- marcados vêm em p_dados.abrirNoMesmoDocumento, e cada um ganha um pedido de exclusão PENDENTE com a
-- mesma data, o mesmo canal e o mesmo "quem pediu". A dona confere depois se é a mesma pessoa e
-- exclui, arquiva ou recusa. Nada é apagado no outro cadastro.
--
-- 1. pedido_mesmo_documento_observacao(p_tipo): a observação fixa do pedido aberto no outro cadastro.
--    Sem protocolo e sem nada que aponte o cadastro excluído (revisão, A1): ela só diz que existiu
--    outro cadastro com aquele documento. É também a marca de origem (M4): pedido_exclusao_json
--    devolve origem = MESMO_DOCUMENTO quando a observação é ela, e a faixa da ficha troca de texto.
-- 2. cliente_mesmo_documento_todos(p_escritorio, p_cliente, p_documento): os outros cadastros do
--    escritório com o mesmo documento, menos os excluídos (que não têm documento), em ordem de criação (e de nome, no mesmo instante).
--    Uma fonte só para a ficha e para a conferência da exclusão.
-- 3. cliente_mesmo_documento(p_escritorio, p_cliente): a lista da ficha, até 5 e "mais":
--    {lista: [{id, nome, situacao, desde, contratoOuProcesso, pedidoAberto}], mais}.
-- 4. mesmo_documento_travar(p_escritorio, p_cliente, p_documento, p_ids) (revisão, D4): trava os
--    outros cadastros com o mesmo documento em ordem de id (FOR UPDATE, depois do cliente, debaixo da
--    trava automacoes: que cliente_para_exclusao já pegou) e confere os ids marcados. Fica antes de
--    qualquer escrita da exclusão: a edição do outro cadastro só trava ele, então a exclusão nunca
--    segura conversas ou propostas esperando por ele. A edição que trocou o CPF de um deles enquanto a
--    exclusão esperava é reavaliada pelo Postgres e sai da lista. Id que não é outro cadastro ATIVO ou
--    INATIVO com o mesmo documento volta como erro de campo abrirNoMesmoDocumento; o que já tem pedido
--    aberto fica como está (o pedido já existe); o que foi excluído enquanto a janela estava aberta
--    (a outra exclusão pegou a trava antes) é ignorado, porque não há mais o que abrir.
-- 5. pedido_mesmo_documento_abrir(...) (revisão, D4): abre os pedidos. definir_transicao
--    ('PEDIDO_REGISTRADO') antes do INSERT, sem motivo, para o guardião gravar o evento certo e sem o
--    protocolo (revisão, A1, item 3); o histórico do outro só com {pedido_id, canal}, como o de
--    portal_cliente_pedir_exclusao (A1, item 2). registrado_por é a sócia dona que atendeu. Devolve os
--    outros cadastros que ficaram com pedido aberto (os abertos agora e os que já tinham), para a
--    mensagem de feito (M3).
-- 6. portal_cliente_excluir_dados (corpo da 0170, a versão em vigor: 1110, 1114 e 1130 a 1142 não a
--    recriam) e portal_cliente_arquivar_lgpd (corpo da 0460, a versão em vigor) recriadas, letra por
--    letra, com o passo 4 antes das escritas e o passo 5 no fim. O retorno ganha mesmoDocumento.
-- 7. pedido_exclusao_json (corpo da 0170, a versão em vigor) com a chave origem.
-- 8. portal_cliente: corpo da 1142, letra por letra, com mesmoDocumento e mesmoDocumentoMais para a
--    sócia dona no cliente ATIVO ou INATIVO, com ou sem contrato e processo (a janela de excluir e a de
--    arquivar; C8). A api-portal passa a ficha adiante sem filtrar; o corpo da exclusão ganha
--    abrirNoMesmoDocumento no schema dela (por isso ela precisa ser publicada).
--
-- Sem tabela nova e sem preenchimento: nada sem volta. Nenhuma linha antiga muda.
--
-- Se der errado: recriar portal_cliente_excluir_dados e pedido_exclusao_json da 0170,
-- portal_cliente_arquivar_lgpd da 0460 e portal_cliente da 1142, e apagar as funções novas. Os pedidos
-- já abertos no outro cadastro ficam como pedidos comuns (a dona atende ou recusa).

-- ---------------------------------------------------------------------------------------
-- 1. A observação fixa (e a marca de origem).
create function pedido_mesmo_documento_observacao(p_tipo text) returns text
language sql
immutable
as $$
  select 'Aberto pela sócia dona ao atender o pedido de outro cadastro com o mesmo '
         || case when p_tipo = 'PJ' then 'CNPJ' else 'CPF' end || '. Confira se é a mesma pessoa.'
$$;

-- ---------------------------------------------------------------------------------------
-- 2. Os outros cadastros com o mesmo documento (uma fonte só).
create function cliente_mesmo_documento_todos(p_escritorio uuid, p_cliente uuid, p_documento text)
returns setof clientes_escritorio
language sql
stable
set search_path = public
as $$
  select o.* from clientes_escritorio o
   where p_documento is not null and o.escritorio_id = p_escritorio and o.documento = p_documento
     and o.id <> p_cliente and o.estado <> 'EXCLUIDO'
   order by o.criado_em, o.nome, o.id
$$;

-- ---------------------------------------------------------------------------------------
-- 3. A lista da ficha: até 5, com "mais".
create function cliente_mesmo_documento(p_escritorio uuid, p_cliente uuid) returns jsonb
language sql
stable
set search_path = public
as $$
  with o as (
    select o.*, row_number() over (order by o.criado_em, o.nome, o.id) n
      from clientes_escritorio k, cliente_mesmo_documento_todos(p_escritorio, p_cliente, k.documento) o
     where k.id = p_cliente and k.escritorio_id = p_escritorio)
  select jsonb_build_object(
    'lista', coalesce((select jsonb_agg(jsonb_build_object(
               'id', o.id, 'nome', o.nome, 'situacao', o.estado, 'desde', o.criado_em,
               'contratoOuProcesso', cliente_vinculos_lgpd(o.id) is not null,
               'pedidoAberto', exists (select 1 from pedidos_exclusao x
                                        where x.escritorio_id = p_escritorio and x.cliente_id = o.id and x.estado = 'PENDENTE'))
               order by o.n) from o where o.n <= 5), '[]'::jsonb),
    'mais', (select count(*) from o where o.n > 5)::integer)
$$;

-- ---------------------------------------------------------------------------------------
-- 4. A trava dos outros cadastros e a conferência dos ids marcados (antes das escritas).
create function mesmo_documento_travar(p_escritorio uuid, p_cliente uuid, p_documento text, p_ids jsonb) returns uuid[]
language plpgsql
set search_path = public
as $$
declare
  v_pedidos uuid[] := '{}';
  v_todos uuid[];
  v_ok uuid[];
  v_id uuid;
  e jsonb;
begin
  -- Sem a chave (o Portal de antes), nenhum pedido é aberto: é a caixa desmarcada.
  if p_ids is null or jsonb_typeof(p_ids) = 'null' then p_ids := '[]'::jsonb; end if;
  if jsonb_typeof(p_ids) <> 'array' or jsonb_array_length(p_ids) > 50 then
    perform recusar_campos('Confira os outros cadastros', 'abrirNoMesmoDocumento');
  end if;
  for e in select value from jsonb_array_elements(p_ids) loop
    if jsonb_typeof(e) <> 'string' or (e #>> '{}') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      perform recusar_campos('Confira os outros cadastros', 'abrirNoMesmoDocumento');
    end if;
    v_id := (e #>> '{}')::uuid;
    if not v_id = any (v_pedidos) then v_pedidos := v_pedidos || v_id; end if;
  end loop;

  -- A ordem das travas: o cliente (já travado), depois os outros, em ordem de id.
  select array_agg(id order by id) into v_todos from (
    select o.id from clientes_escritorio o
     where p_documento is not null and o.escritorio_id = p_escritorio and o.documento = p_documento
       and o.id <> p_cliente and o.estado <> 'EXCLUIDO'
     order by o.id
       for update) t;

  -- Os que podem ganhar o pedido agora: ATIVO ou INATIVO, sem pedido aberto.
  select coalesce(array_agg(o.id order by o.id), '{}') into v_ok from clientes_escritorio o
   where o.id = any (coalesce(v_todos, '{}')) and o.estado in ('ATIVO', 'INATIVO')
     and not exists (select 1 from pedidos_exclusao x where x.escritorio_id = p_escritorio and x.cliente_id = o.id and x.estado = 'PENDENTE');

  foreach v_id in array v_pedidos loop
    continue when v_id = any (v_ok);
    -- Já tem pedido aberto: o pedido existe, nada a fazer.
    continue when v_id = any (coalesce(v_todos, '{}')) and exists (
      select 1 from clientes_escritorio o join pedidos_exclusao x on x.cliente_id = o.id and x.escritorio_id = p_escritorio and x.estado = 'PENDENTE'
       where o.id = v_id and o.estado in ('ATIVO', 'INATIVO'));
    -- Excluído enquanto a janela estava aberta (a outra exclusão pegou a trava antes): não há o que abrir.
    continue when exists (select 1 from clientes_escritorio o where o.id = v_id and o.escritorio_id = p_escritorio and o.estado = 'EXCLUIDO');
    perform recusar_campos('Um dos outros cadastros mudou', 'abrirNoMesmoDocumento');
  end loop;

  return array(select x from unnest(v_pedidos) x where x = any (v_ok) order by x);
end $$;

-- ---------------------------------------------------------------------------------------
-- 5. Os pedidos nos outros cadastros (depois da exclusão ou do arquivamento).
create function pedido_mesmo_documento_abrir(p_escritorio uuid, p_cliente uuid, p_documento text, p_tipo text, x pedidos_exclusao,
                                             p_pessoa uuid, p_ids uuid[])
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_id uuid;
  y pedidos_exclusao;
begin
  if cardinality(coalesce(p_ids, '{}')) > 0 then
    -- Revisão, A1: o evento certo, sem o protocolo da exclusão.
    perform definir_transicao('PEDIDO_REGISTRADO');
    foreach v_id in array p_ids loop
      insert into pedidos_exclusao (escritorio_id, cliente_id, pedido_em, canal, quem_pediu, observacao, registrado_por, estado)
      values (p_escritorio, v_id, x.pedido_em, x.canal, x.quem_pediu, pedido_mesmo_documento_observacao(p_tipo), p_pessoa, 'PENDENTE')
      returning * into y;
      perform registrar_historico('cliente.exclusao_pedida', 'cliente', v_id::text, jsonb_build_object('pedido_id', y.id, 'canal', y.canal));
    end loop;
  end if;
  -- M3: os outros cadastros que ficaram com pedido aberto (os de agora e os que já tinham).
  return coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'nome', o.nome) order by o.criado_em, o.nome, o.id)
                     from cliente_mesmo_documento_todos(p_escritorio, p_cliente, p_documento) o
                    where o.estado in ('ATIVO', 'INATIVO')
                      and exists (select 1 from pedidos_exclusao z where z.escritorio_id = p_escritorio and z.cliente_id = o.id and z.estado = 'PENDENTE')),
                  '[]'::jsonb);
end $$;

-- ---------------------------------------------------------------------------------------
-- 6. A exclusão (corpo da 0170) e o arquivamento (corpo da 0460), com os passos 4 e 5.
create or replace function portal_cliente_excluir_dados(p_pessoa uuid, p_escritorio uuid, p_cliente uuid, p_versao integer, p_dados jsonb)
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
  v_outros uuid[];
  v_mesmo jsonb;
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
  -- F3.188: os outros cadastros com o mesmo documento, travados antes de qualquer escrita.
  v_outros := mesmo_documento_travar(p_escritorio, p_cliente, c.documento, p_dados -> 'abrirNoMesmoDocumento');

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
  -- F3.188: o documento vem de c, lido antes do UPDATE que o zerou.
  v_mesmo := pedido_mesmo_documento_abrir(p_escritorio, p_cliente, c.documento, c.tipo, x, p_pessoa, v_outros);
  return jsonb_build_object('protocolo', v_protocolo, 'versao', v_versao, 'pedido', pedido_exclusao_json(x), 'mesmoDocumento', v_mesmo);
end $$;

create or replace function portal_cliente_arquivar_lgpd(p_pessoa uuid, p_escritorio uuid, p_cliente uuid, p_versao integer, p_dados jsonb)
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
  v_outros uuid[];
  v_mesmo jsonb;
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
  -- F3.188 (C8): os outros cadastros com o mesmo documento, travados antes de qualquer escrita.
  v_outros := mesmo_documento_travar(p_escritorio, p_cliente, c.documento, p_dados -> 'abrirNoMesmoDocumento');

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
  v_mesmo := pedido_mesmo_documento_abrir(p_escritorio, p_cliente, c.documento, c.tipo, x, p_pessoa, v_outros);
  return jsonb_build_object('protocolo', v_protocolo, 'versao', v_versao, 'pedido', pedido_exclusao_json(x), 'mesmoDocumento', v_mesmo);
end $$;

-- ---------------------------------------------------------------------------------------
-- 7. O pedido na ficha, com a marca de origem (M4). Corpo da 0170, com a chave origem.
create or replace function pedido_exclusao_json(x pedidos_exclusao) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'id', x.id, 'estado', x.estado, 'pedidoEm', x.pedido_em, 'canal', x.canal, 'quemPediu', x.quem_pediu,
    'observacao', x.observacao, 'registradoPor', pessoa_ref(x.registrado_por), 'registradoEm', x.registrado_em,
    'resolvidoPor', pessoa_ref(x.resolvido_por), 'resolvidoEm', x.resolvido_em, 'motivoRecusa', x.motivo_recusa,
    'protocolo', x.protocolo,
    'origem', case when x.observacao in (pedido_mesmo_documento_observacao('PF'), pedido_mesmo_documento_observacao('PJ'))
                   then 'MESMO_DOCUMENTO' end))
$$;

-- ---------------------------------------------------------------------------------------
-- 8. A ficha: corpo da 1142, letra por letra, com mesmoDocumento no fim.
create or replace function portal_cliente(p_pessoa uuid, p_escritorio uuid, p_cliente uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  f jsonb := portal_cliente_sem_termo(p_pessoa, p_escritorio, p_cliente);
  c clientes_escritorio;
  v_tutela jsonb;
  v_hist jsonb;
  v_mesmo jsonb;
begin
  select * into c from clientes_escritorio where id = p_cliente and escritorio_id = p_escritorio;
  v_tutela := cliente_termo_tutela_linha(p_escritorio, p_cliente);
  if v_tutela is null and c.tipo = 'PF' and c.capacidade = 'MENOR' and c.rl_papel in ('TUTORA', 'TUTOR')
     and cliente_assina(c) ->> 'situacao' = 'FEZ_18' then
    v_tutela := cliente_termo_tutela_guardado(p_escritorio, p_cliente);
  end if;
  f := f || jsonb_build_object('termoCuratela', cliente_termo_linha(p_escritorio, p_cliente), 'termoTutela', v_tutela);
  -- Só a tutora ou o tutor que assinava ganha a chave "termo", e só quando há termo guardado;
  -- sem termo, "Quem assinava" sai como antes (o 112 confere o objeto inteiro).
  if jsonb_typeof(f -> 'quemAssinava') = 'object' and f -> 'quemAssinava' ->> 'papel' in ('TUTORA', 'TUTOR') then
    v_tutela := cliente_termo_tutela_guardado(p_escritorio, p_cliente);
    if v_tutela is not null then
      f := jsonb_set(f, '{quemAssinava,termo}', v_tutela);
    end if;
  end if;
  -- F3.155: só a sócia dona, no cliente que ela pode excluir (ativo ou inativo, sem contrato nem
  -- processo; com eles a janela é a de arquivar e nada se apaga). Sem isso, a chave não vem.
  -- F3.156: arquivosQueFicam, com as mesmas regras de quem recebe.
  -- F3.177: arquivosQueFicam.historico, só quando há lançamento do sistema antigo que fica.
  -- F3.181, F3.186, F3.190, C9, F3.179 e F3.193 (1142): saiDeContratos, conversasParaApagar,
  -- assinaPorOutro, basesDeCondicao e baixasComExplicacao, nas mesmas regras. Na janela de arquivar
  -- (com contrato ou processo), só saiDeContratos, sem os lembretes.
  if (f ->> 'dono')::boolean and c.estado in ('ATIVO', 'INATIVO')
     and jsonb_typeof(f -> 'vinculosLgpd') is distinct from 'object' then
    v_hist := cliente_historico_anterior_que_fica(p_escritorio, p_cliente);
    f := f || jsonb_build_object('arquivosParaApagar', cliente_arquivos_para_apagar(p_escritorio, p_cliente),
                                 'arquivosQueFicam', cliente_arquivos_que_ficam(p_escritorio, p_cliente)
                                   || case when (v_hist ->> 'lancamentos')::integer > 0 then jsonb_build_object('historico', v_hist)
                                           else '{}'::jsonb end);
    f := f || jsonb_build_object(
      'saiDeContratos', jsonb_build_object('pedidos', cliente_pedidos_contrato_que_saem(p_escritorio, p_cliente),
                                           'lembretes', cliente_lembretes_que_saem(p_escritorio, p_cliente)),
      'conversasParaApagar', cliente_conversas_para_apagar(p_escritorio, p_cliente),
      'assinaPorOutro', cliente_assina_por_outro(p_escritorio, p_cliente),
      'basesDeCondicao', cliente_bases_de_condicao(p_escritorio, p_cliente),
      'baixasComExplicacao', cliente_baixas_com_explicacao(p_escritorio, p_cliente));
  elsif (f ->> 'dono')::boolean and c.estado in ('ATIVO', 'INATIVO') then
    f := f || jsonb_build_object(
      'saiDeContratos', jsonb_build_object('pedidos', cliente_pedidos_contrato_que_saem(p_escritorio, p_cliente), 'lembretes', null));
  end if;
  -- F3.188 (1143): o outro cadastro com o mesmo documento, nas duas janelas (a de excluir e a de
  -- arquivar, C8), só para a sócia dona e no cliente ativo ou inativo. Vazio sem outro cadastro.
  if (f ->> 'dono')::boolean and c.estado in ('ATIVO', 'INATIVO') then
    v_mesmo := cliente_mesmo_documento(p_escritorio, p_cliente);
    f := f || jsonb_build_object('mesmoDocumento', v_mesmo -> 'lista', 'mesmoDocumentoMais', v_mesmo -> 'mais');
  end if;
  return f;
end $$;

call fechar_acesso();
