-- Termo de curatela como anexo na ficha do cliente (F3.118; AP-01, CH-08), pelo desenho aprovado em
-- docs/design/aprovadas/portal-responsavel-legal (estados novo-curatela, ficha-curatela e
-- gerar-curatela; decisões 8, 16, 23 e 26; pergunta 2: o termo é opcional, só para baixar e juntar
-- à procuração).
--
-- Onde fica: em cliente_documentos (0853), com o tipo TERMO_CURATELA, e não em anexos (0520), como
-- dizia a nota "Para o servidor" do desenho, escrita antes de existir a 0853. O termo é do cliente,
-- abre com a regra da ficha (clientes.ver para abrir, clientes.editar para anexar), vai ao mesmo
-- bucket privado (documentos-portal, <escritório>/<id>, link de 60 s, cada abertura no histórico) e
-- nada se apaga: mandar outro substitui o anterior, que continua guardado (PT-03).
--
-- 1. O termo fica fora de Documentos pessoais. tipo_documento_pessoal_valido continua igual (ela é
--    também o check de documentos_inicio.pessoal e de documento_pedidos.tipo_pessoal); só o check de
--    cliente_documentos.tipo passa a aceitar o termo. cliente_documentos_em_uso deixa o termo de fora,
--    e assim a folha "Documentos pessoais", o envio comum e a prévia da abertura do caso não o veem.
-- 2. Um termo em uso por cliente. Só pessoa física sob curatela e ativa recebe o termo
--    (CLIENTE_NAO_CURATELA). A ficha e Gerar documentos só o mostram enquanto o cliente está sob
--    curatela e não está arquivado nem excluído; quem sai e volta à curatela vê o termo guardado, e
--    "Trocar arquivo" resolve.
-- 3. O anterior é escolhido ao concluir, não ao iniciar (revisão, M1): portal_cliente_documento_concluir
--    ganha um ramo só para o termo, que trava a ficha do cliente (for update) e pega o termo em uso
--    naquela hora. Assim, dois envios cruzados não deixam dois termos em uso. Acoplamento: esse ramo
--    não pode usar tipo_documento_pessoal_unico nem cliente_documentos_em_uso, que não veem o termo;
--    se a 0853 ou outra migration recriar portal_cliente_documento_concluir, precisa manter o ramo.
-- 4. A ficha (portal_cliente) e a página de Gerar documentos (portal_documento_dados) ganham
--    termoCuratela, por embrulho (como 0740, 0830 e 0860). Quem gera documentos sempre vê a ficha
--    (toda função do Portal tem clientes.ver), por isso não há campo de permissão à parte.
--
-- Lacuna herdada da 0853 (revisão, I4): a exclusão a pedido do titular esconde o termo (a capacidade
-- volta a PLENA), mas não tira o arquivo do bucket nem limpa o nome do arquivo (o gatilho de guarda
-- não deixa mudar nome). O termo pode trazer dado de saúde; fica um item pendente no painel para a
-- exclusão tirar os arquivos dos documentos pessoais e do termo.
--
-- Depende da 0853 e da 0854 aplicadas antes (a ordem do nome já garante).

-- ---------------------------------------------------------------------------------------
-- 1. O tipo e as regras da tabela.
alter table cliente_documentos drop constraint cliente_documentos_tipo_check;
alter table cliente_documentos add constraint cliente_documentos_tipo_check
  check (tipo_documento_pessoal_valido(tipo) or tipo = 'TERMO_CURATELA');
-- O termo não tem descrição, data do papel nem pedido de caso, não vem de fotos juntadas e o
-- anterior é escolhido no concluir (substitui_id fica vazio).
alter table cliente_documentos add constraint cliente_documentos_termo
  check (tipo <> 'TERMO_CURATELA' or (descricao is null and data_documento is null and pedido_id is null and fotos is null
                                      and substitui_id is null));

-- Os documentos pessoais em uso (prontos e não substituídos), sem o termo de curatela.
-- Corpo da 0853 com o filtro do termo.
create or replace function cliente_documentos_em_uso(p_escritorio uuid, p_cliente uuid) returns setof cliente_documentos
language sql stable
set search_path = public
as $$
  select * from cliente_documentos
   where escritorio_id = p_escritorio and cliente_id = p_cliente and situacao = 'PRONTO' and substituido_por is null
     and tipo <> 'TERMO_CURATELA'
$$;

-- ---------------------------------------------------------------------------------------
-- 2. O termo em uso e como ele aparece.

-- O termo pronto e não substituído, o mais novo.
create function cliente_termo_em_uso(p_escritorio uuid, p_cliente uuid) returns cliente_documentos
language sql stable
set search_path = public
as $$
  select * from cliente_documentos
   where escritorio_id = p_escritorio and cliente_id = p_cliente and tipo = 'TERMO_CURATELA'
     and situacao = 'PRONTO' and substituido_por is null
   order by concluido_em desc, id desc
   limit 1
$$;

-- O termo na ficha e em Gerar documentos: só de pessoa física sob curatela, nem arquivada nem
-- excluída. Sem descrição, data do papel nem conta de vencimento.
create function cliente_termo_linha(p_escritorio uuid, p_cliente uuid) returns jsonb
language sql stable
set search_path = public
as $$
  select cliente_documento_linha(d) - 'descricao' - 'dataDocumento' - 'dias' - 'vencido'
    from clientes_escritorio c, cliente_termo_em_uso(p_escritorio, p_cliente) d
   where c.id = p_cliente and c.escritorio_id = p_escritorio
     and c.tipo = 'PF' and c.capacidade = 'CURATELA' and c.estado not in ('EXCLUIDO', 'ARQUIVADO')
     and d.id is not null
$$;

-- ---------------------------------------------------------------------------------------
-- 3. O envio: iniciar aqui; concluir e abrir são os de 0853, pelo id.

-- Registrar o envio do termo: devolve o id, que vira o nome do arquivo no Storage (<escritório>/<id>).
create function portal_cliente_termo_iniciar(p_pessoa uuid, p_escritorio uuid, p_cliente uuid, p_dados jsonb) returns uuid
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
  if c.tipo <> 'PF' or c.capacidade <> 'CURATELA' then
    perform recusar_motivo('O cliente não está sob curatela', 'CLIENTE_NAO_CURATELA');
  end if;
  begin
    insert into cliente_documentos (escritorio_id, cliente_id, tipo, nome, arquivo_tipo, tamanho, enviado_por)
    values (p_escritorio, p_cliente, 'TERMO_CURATELA', btrim(p_dados ->> 'nome'), p_dados ->> 'arquivoTipo',
            (p_dados ->> 'tamanho')::integer, p_pessoa)
    returning id into v_id;
  exception when check_violation or not_null_violation or invalid_text_representation or numeric_value_out_of_range then
    perform recusar_campos('Arquivo não aceito', 'arquivo');
  end;
  return v_id;
end $$;

-- Concluir: corpo da 0853, com o ramo do termo (veja o item 3 do cabeçalho).
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
    if d.tipo = 'TERMO_CURATELA' then
      -- Um termo em uso por cliente: a ficha travada faz o segundo envio cruzado esperar o primeiro.
      perform 1 from clientes_escritorio where id = d.cliente_id and escritorio_id = p_escritorio for update;
      v_ant := (cliente_termo_em_uso(p_escritorio, d.cliente_id)).id;
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
-- 4. A ficha e Gerar documentos (renomear e embrulhar).
alter function portal_cliente(uuid, uuid, uuid) rename to portal_cliente_sem_termo;

create function portal_cliente(p_pessoa uuid, p_escritorio uuid, p_cliente uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return portal_cliente_sem_termo(p_pessoa, p_escritorio, p_cliente)
         || jsonb_build_object('termoCuratela', cliente_termo_linha(p_escritorio, p_cliente));
end $$;

-- Embrulha a leitura da página (portal_documento_dados), e não documento_dados, que também alimenta
-- a geração: o termo não faz parte do documento gerado.
alter function portal_documento_dados(uuid, uuid, uuid) rename to portal_documento_dados_sem_termo;

create function portal_documento_dados(p_pessoa uuid, p_escritorio uuid, p_contrato uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare d jsonb := portal_documento_dados_sem_termo(p_pessoa, p_escritorio, p_contrato);
begin
  return d || jsonb_build_object('termoCuratela', cliente_termo_linha(p_escritorio, (d -> 'cliente' ->> 'id')::uuid));
end $$;

-- ---------------------------------------------------------------------------------------
-- 5. Inventário (PT-11): a mesma linha de documentos pessoais, agora com o termo. O termo pode trazer
-- dado de saúde; a base legal ganha o art. 11, II, "d" da LGPD (Carol, 23/11/2026). Prazo e destino
-- continuam os da 0853.
update inventario_dados
   set o_que = 'Documentos pessoais do cliente (RG e CPF, CNH, comprovante, certidões) e o termo de curatela; o arquivo fica no Storage, com quem anexou e quando',
       para_que = 'Ter à mão os documentos dos casos do cliente (AP-08) e juntar o termo de curatela à procuração (CH-08)',
       base_legal = 'Execução de contrato (art. 7º, V) e exercício regular de direitos (art. 7º, VI); no termo de curatela, dado sensível, o art. 11, II, "d" (LGPD)'
 where tabela = 'cliente_documentos';

call fechar_acesso();
