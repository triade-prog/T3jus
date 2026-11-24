-- Termo de tutela como anexo na ficha do cliente menor (F3.140; AP-01, CH-08), pelo desenho aprovado
-- em docs/design/aprovadas/portal-termo-tutela (Carol, 24/11/2026; pergunta 1: aos 18 anos o termo
-- fica à vista em "Quem assinava com …", só para baixar). Plano: planos/F3.140-termo-tutela.md, com
-- a seção 9 (ajustes da revisão) por cima.
--
-- É o par do termo de curatela (0930). Mesma tabela (cliente_documentos), mesmo bucket privado
-- (documentos-portal, <escritório>/<id>, link de 60 s, cada abertura no histórico), mesmas
-- permissões (clientes.ver para abrir, clientes.editar para anexar) e nada se apaga (PT-03).
--
-- Por que um tipo próprio (TERMO_TUTELA) e não um "termo do responsável": tutela e curatela são
-- papéis jurídicos diferentes (CC, arts. 1.728 e 1.767). O tipo fica escrito na linha para sempre,
-- a rota diz o tipo (o navegador nunca o manda) e o servidor nunca guarda um termo de tutela como se
-- fosse de curatela. O que se generaliza são as regras: tipo_termo_responsavel diz se o tipo é termo.
--
-- Quando o termo de tutela vale (cliente_termo_tutela_linha): pessoa física, capacidade MENOR,
-- rl_papel TUTORA ou TUTOR, a conta do dia (cliente_assina, hoje_brasilia) dá REPRESENTADO ou
-- ASSISTIDO, e o cliente não está arquivado nem excluído. Iniciar recusa com as mesmas regras:
-- TC404 (não existe ou excluído), CLIENTE_NAO_ATIVO e CLIENTE_NAO_TUTELA para todo o resto.
--
-- O que acontece em cada mudança (o termo fica sempre guardado):
--   * tutora ↔ tutor: continua em uso e à vista;
--   * para mãe ou pai: some da ficha e de Gerar documentos; ao voltar para tutora ou tutor, volta
--     (a regra simples da curatela; "Trocar arquivo" resolve);
--   * menor → curatela: some; o termo de curatela é outro documento e não herda o de tutela;
--   * menor → assina por si pelo formulário: some e não aparece em "Quem assinava" (não há linha em
--     clientes_quem_assinava por esse caminho; comportamento do F3.98);
--   * faz 18 anos: sai de Gerar documentos no mesmo dia; na ficha, termoTutela continua com o termo
--     guardado enquanto a situação é FEZ_18, para a janela dos 18 dizer que ele fica guardado
--     (revisão, I1);
--   * "Agora assina por si": aparece em quemAssinava.termo, só para baixar, quando quem assinava era
--     tutora ou tutor. Não há coluna nova: o termo em uso é o último que existiu;
--   * arquivado: some de tudo, também de "Quem assinava"; excluído: os arquivos saem pela 0970.
--
-- O concluir não confere o papel (revisão, M1): um envio iniciado antes da troca de papel ou de
-- "Agora assina por si" ainda conclui. A linha fica pronta e escondida, ou vira o termo de "Quem
-- assinava", que é mesmo da tutora. Recusar ali jogaria fora um arquivo legítimo já no Storage.
--
-- Acoplamento do concluir (como na 0930): o ramo dos termos não pode usar tipo_documento_pessoal_unico
-- nem cliente_documentos_em_uso, que não veem os termos. Quem recriar portal_cliente_documento_concluir
-- mantém o ramo, agora para os dois tipos.
--
-- Funções recriadas e de onde partem (conferido no main depois do PR #160):
--   cliente_documentos_em_uso ............ 0970 (a mais nova: sem os termos e sem o apagado)
--   portal_cliente_documento_concluir .... 0930 (a 0970 não a recria)
--   portal_cliente ....................... 0930 (o embrulho; nenhuma migration depois o recria)
--   portal_documento_dados ............... 0930 (o embrulho; idem)
-- cliente_termo_em_uso(uuid, uuid), da 0930 e recriada na 0970, fica como está (só curatela); a de
-- três argumentos é nova.
--
-- Ordem com a 0970 (exclusão de arquivos, F3.141, ainda não aplicada no Supabase): esta migration
-- funciona antes ou depois dela. O filtro do apagado (apagado_em, coluna da 0970) é lido por
-- to_jsonb, que vale com ou sem a coluna; e a 0970 recria cliente_documentos_em_uso já sem os dois
-- termos. Assim, na ordem do nome (0960, depois 0970) e na ordem inversa, o termo de tutela fica
-- fora de Documentos pessoais e o documento apagado fica fora das leituras.

-- ---------------------------------------------------------------------------------------
-- 1. O tipo e as regras da tabela.
create function tipo_termo_responsavel(p text) returns boolean
language sql immutable
as $$ select coalesce(p in ('TERMO_CURATELA', 'TERMO_TUTELA'), false) $$;

alter table cliente_documentos drop constraint cliente_documentos_tipo_check;
alter table cliente_documentos add constraint cliente_documentos_tipo_check
  check (tipo_documento_pessoal_valido(tipo) or tipo_termo_responsavel(tipo));
-- Os dois termos: sem descrição, data do papel, pedido de caso, fotos juntadas nem substitui_id (o
-- anterior é escolhido no concluir).
alter table cliente_documentos drop constraint cliente_documentos_termo;
alter table cliente_documentos add constraint cliente_documentos_termo
  check (not tipo_termo_responsavel(tipo) or (descricao is null and data_documento is null and pedido_id is null and fotos is null
                                              and substitui_id is null));

-- Os documentos pessoais em uso (prontos, não substituídos e não apagados), sem os dois termos.
-- Corpo da 0970, com os dois termos fora e o apagado lido por to_jsonb (veja o cabeçalho).
create or replace function cliente_documentos_em_uso(p_escritorio uuid, p_cliente uuid) returns setof cliente_documentos
language sql stable
set search_path = public
as $$
  select * from cliente_documentos d
   where d.escritorio_id = p_escritorio and d.cliente_id = p_cliente and d.situacao = 'PRONTO' and d.substituido_por is null
     and not tipo_termo_responsavel(d.tipo) and (to_jsonb(d) ->> 'apagado_em') is null
$$;

-- ---------------------------------------------------------------------------------------
-- 2. O termo em uso e como ele aparece.

-- O termo do tipo pedido, pronto, não substituído e não apagado, o mais novo. A de dois argumentos
-- (0930, 0970) continua só para a curatela.
create function cliente_termo_em_uso(p_escritorio uuid, p_cliente uuid, p_tipo text) returns cliente_documentos
language sql stable
set search_path = public
as $$
  select * from cliente_documentos d
   where d.escritorio_id = p_escritorio and d.cliente_id = p_cliente and d.tipo = p_tipo and tipo_termo_responsavel(p_tipo)
     and d.situacao = 'PRONTO' and d.substituido_por is null and (to_jsonb(d) ->> 'apagado_em') is null
   order by d.concluido_em desc, d.id desc
   limit 1
$$;

-- O termo de tutela na ficha e em Gerar documentos: só do menor com tutora ou tutor, representado ou
-- assistido no dia, nem arquivado nem excluído. Sem descrição, data do papel nem vencimento.
create function cliente_termo_tutela_linha(p_escritorio uuid, p_cliente uuid) returns jsonb
language sql stable
set search_path = public
as $$
  select cliente_documento_linha(d) - 'descricao' - 'dataDocumento' - 'dias' - 'vencido'
    from clientes_escritorio c, cliente_termo_em_uso(p_escritorio, p_cliente, 'TERMO_TUTELA') d
   where c.id = p_cliente and c.escritorio_id = p_escritorio
     and c.tipo = 'PF' and c.capacidade = 'MENOR' and c.rl_papel in ('TUTORA', 'TUTOR')
     and cliente_assina(c) ->> 'situacao' in ('REPRESENTADO', 'ASSISTIDO')
     and c.estado not in ('EXCLUIDO', 'ARQUIVADO')
     and d.id is not null
$$;

-- O termo de tutela guardado, sem a regra de quem assina: para a janela dos 18 anos (FEZ_18) e para
-- "Quem assinava com …". Só de cliente nem arquivado nem excluído.
create function cliente_termo_tutela_guardado(p_escritorio uuid, p_cliente uuid) returns jsonb
language sql stable
set search_path = public
as $$
  select cliente_documento_linha(d) - 'descricao' - 'dataDocumento' - 'dias' - 'vencido'
    from clientes_escritorio c, cliente_termo_em_uso(p_escritorio, p_cliente, 'TERMO_TUTELA') d
   where c.id = p_cliente and c.escritorio_id = p_escritorio and c.estado not in ('EXCLUIDO', 'ARQUIVADO')
     and d.id is not null
$$;

-- ---------------------------------------------------------------------------------------
-- 3. O envio: iniciar aqui; concluir e abrir são os de Documentos pessoais, pelo id.

-- Registrar o envio do termo de tutela: devolve o id, que vira o nome do arquivo no Storage.
create function portal_cliente_termo_tutela_iniciar(p_pessoa uuid, p_escritorio uuid, p_cliente uuid, p_dados jsonb) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  c clientes_escritorio;
  v_id uuid;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.editar');
  select * into c from clientes_escritorio where id = p_cliente and escritorio_id = p_escritorio;
  if c.id is null or c.estado = 'EXCLUIDO' then raise exception 'Cliente não encontrado' using errcode = 'TC404'; end if;
  if c.estado <> 'ATIVO' then perform recusar_motivo('O cliente não está ativo', 'CLIENTE_NAO_ATIVO'); end if;
  if c.tipo <> 'PF' or c.capacidade is distinct from 'MENOR' or c.rl_papel is null or c.rl_papel not in ('TUTORA', 'TUTOR')
     or coalesce(cliente_assina(c) ->> 'situacao', '') not in ('REPRESENTADO', 'ASSISTIDO') then
    perform recusar_motivo('Hoje ninguém assina pelo cliente como tutora ou tutor', 'CLIENTE_NAO_TUTELA');
  end if;
  begin
    insert into cliente_documentos (escritorio_id, cliente_id, tipo, nome, arquivo_tipo, tamanho, enviado_por)
    values (p_escritorio, p_cliente, 'TERMO_TUTELA', btrim(p_dados ->> 'nome'), p_dados ->> 'arquivoTipo',
            (p_dados ->> 'tamanho')::integer, p_pessoa)
    returning id into v_id;
  exception when check_violation or not_null_violation or invalid_text_representation or numeric_value_out_of_range then
    perform recusar_campos('Arquivo não aceito', 'arquivo');
  end;
  return v_id;
end $$;

-- Concluir: corpo da 0930, com o ramo dos termos para os dois tipos. O anterior é o termo em uso do
-- mesmo tipo: concluir o de tutela não substitui o de curatela, nem o contrário.
create or replace function portal_cliente_documento_concluir(p_pessoa uuid, p_escritorio uuid, p_documento uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  d cliente_documentos;
  v_ant uuid;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.editar');
  select * into d from cliente_documentos where id = p_documento and escritorio_id = p_escritorio and enviado_por = p_pessoa for update;
  if d.id is null then raise exception 'Documento não encontrado' using errcode = 'TC404'; end if;
  if d.situacao = 'ENVIANDO' then
    if tipo_termo_responsavel(d.tipo) then
      -- Um termo em uso por cliente e por tipo: a ficha travada faz o segundo envio cruzado esperar o primeiro.
      perform 1 from clientes_escritorio where id = d.cliente_id and escritorio_id = p_escritorio for update;
      v_ant := (cliente_termo_em_uso(p_escritorio, d.cliente_id, d.tipo)).id;
    else
      v_ant := coalesce(d.substitui_id,
        case when tipo_documento_pessoal_unico(d.tipo) then
          (select x.id from cliente_documentos_em_uso(p_escritorio, d.cliente_id) x where x.tipo = d.tipo order by x.concluido_em desc limit 1) end);
    end if;
    update cliente_documentos set situacao = 'PRONTO', concluido_em = app_now() where id = d.id returning * into d;
    if v_ant is not null then
      update cliente_documentos set substituido_por = d.id where id = v_ant and substituido_por is null;
    end if;
    perform registrar_historico('cliente.documento_anexado', 'cliente', d.cliente_id::text,
      jsonb_build_object('documento', d.id, 'tipo', d.tipo, 'arquivo', d.arquivo_tipo, 'tamanho', d.tamanho, 'substitui', v_ant, 'pedido', d.pedido_id));
    if d.pedido_id is not null then
      update documento_pedidos set chegou_em = app_now(), chegou_por = p_pessoa where id = d.pedido_id and chegou_em is null;
      if found then
        perform registrar_historico('juridico.documento_chegou', 'casos', (select caso_id::text from documento_pedidos where id = d.pedido_id),
          jsonb_build_object('pedido', d.pedido_id, 'comArquivo', true, 'daFicha', d.id));
      end if;
    end if;
  end if;
  return cliente_documento_linha(d);
end $$;

-- ---------------------------------------------------------------------------------------
-- 4. A ficha e Gerar documentos: os embrulhos da 0930, recriados com o termo de tutela.

-- A ficha: termoCuratela como na 0930; termoTutela com a regra do dia e, no FEZ_18 com tutora ou
-- tutor, o termo guardado (revisão, I1); e quemAssinava.termo quando quem assinava era tutora ou tutor.
create or replace function portal_cliente(p_pessoa uuid, p_escritorio uuid, p_cliente uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  f jsonb := portal_cliente_sem_termo(p_pessoa, p_escritorio, p_cliente);
  c clientes_escritorio;
  v_tutela jsonb;
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
  return f;
end $$;

-- Gerar documentos: a regra estrita (sem termo no FEZ_18). O termo não faz parte do documento gerado.
create or replace function portal_documento_dados(p_pessoa uuid, p_escritorio uuid, p_contrato uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  d jsonb := portal_documento_dados_sem_termo(p_pessoa, p_escritorio, p_contrato);
  v_cliente uuid := (d -> 'cliente' ->> 'id')::uuid;
begin
  return d || jsonb_build_object('termoCuratela', cliente_termo_linha(p_escritorio, v_cliente),
                                 'termoTutela', cliente_termo_tutela_linha(p_escritorio, v_cliente));
end $$;

-- ---------------------------------------------------------------------------------------
-- 5. Inventário (PT-11): a mesma linha, agora com o termo de tutela (revisão, I2 e M4). O texto da
-- revisão passava do limite de 160 letras da 0070; esta é a versão curta, com o mesmo conteúdo (a
-- curatela e a tutela no o_que, o art. 11, II, "d" e o art. 14; o Enunciado CD/ANPD nº 1/2023, que
-- admite as bases dos arts. 7º e 11 no melhor interesse do menor, fica só aqui). Prazo e destino
-- continuam os da 0853.
update inventario_dados
   set o_que = 'Documentos pessoais (RG e CPF, CNH, comprovante, certidões), o termo de curatela e o termo de tutela; o arquivo fica no Storage, com quem anexou e quando',
       para_que = 'Ter à mão os documentos dos casos do cliente (AP-08) e juntar o termo de curatela ou o de tutela à procuração (CH-08)',
       base_legal = 'LGPD: art. 7º, V e VI (contrato e exercício de direitos); dado sensível dos termos, art. 11, II, "d"; termo de tutela, melhor interesse do menor, art. 14'
 where tabela = 'cliente_documentos';

call fechar_acesso();
