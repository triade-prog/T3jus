-- 0680 · Procurações e modelos (CH-08, F3.16). Tela aprovada pela Carol em 21/11/2026, às 19h37
-- (Bahia): docs/design/aprovadas/portal-procuracoes, com as 5 recomendações como decisões.
-- - O contrato de honorários, a procuração e a declaração de hipossuficiência saem em .docx, no
--   timbrado do escritório, com os dados do cliente, do contrato e dos advogados outorgados. É
--   preenchimento de modelo, como as petições (0440): sem IA. O .docx se monta na API.
-- - Os modelos padrão moram no código (packages/domain/src/documentos.ts). O escritório pode
--   trocar cada um pelo dele (um ativo por documento) e cadastrar outros ("Outro documento",
--   pergunta 1). Cada envio é uma versão; nada se apaga.
-- - Gerar é sempre a partir de um contrato, que pode estar em elaboração (pergunta 4). Sem revisão
--   pelo responsável nesta versão (pergunta 2): quem gera fica no histórico.
-- - Só bloqueiam nenhum documento e nenhum advogado outorgado (decisão 13). Dado faltando sai
--   marcado ("[RG: falta]") e avisa.
-- - Cada geração é uma versão nova de cada documento (v1, v2…, decisão 19). A versão guarda o que
--   foi usado no dia (outorgados com a frase da OAB, poderes, cidade e data, representante, o que
--   saiu marcado), mesmo que a Equipe ou a ficha mudem depois (decisão 16, PT-03).
-- - Os assinados entram nos anexos do contrato (0520), ligados à versão assinada. Anexar o
--   contrato assinado registra a assinatura pela mesma rota de sempre (decisão 17 e decisão 19 dos
--   Contratos): a tela anexa e chama POST /v1/escritorio/contratos/:id/assinatura.
-- - Arquivos no bucket privado documentos-portal: <escritório>/documentos/<versão>.docx (gerados) e
--   <escritório>/documentos/modelos/<versão>.docx (modelos). O nome que a pessoa dá nunca entra no
--   caminho.
-- - Da área Contratos (PA-01): quem não tem é recusado com AREA_NAO_LIBERADA.
-- - Fica para depois (itens pendentes no painel): o representante legal do cliente menor ou
--   incapaz, que pede campos novos em Clientes.

-- ---------------------------------------------------------------------------------------
-- Tabelas.

create function documento_padrao_valido(p text) returns boolean
language sql immutable
as $$ select p in ('CONTRATO', 'PROCURACAO', 'HIPOSSUFICIENCIA_PF', 'HIPOSSUFICIENCIA_PJ') $$;

create function documento_tipo_valido(p text) returns boolean
language sql immutable
as $$ select p in ('CONTRATO', 'PROCURACAO', 'HIPOSSUFICIENCIA', 'OUTRO') $$;

create function documento_poderes_validos(p text[]) returns boolean
language sql immutable
as $$
  select cardinality(p) <= 10 and not exists (select 1 from unnest(p) x where x not in (
    'RECEBER_QUITAR', 'ACORDO', 'SUBSTABELECER', 'DESISTIR', 'RENUNCIAR', 'RECONHECER', 'CITACAO', 'CONFESSAR', 'COMPROMISSO', 'HIPOSSUFICIENCIA'))
$$;

-- Os modelos do escritório (decisão 5). Contrato, procuração e declaração: um ativo de cada, que
-- troca o padrão do T3jus. "Outro documento": quantos o escritório quiser.
create table documento_modelos (
  id              uuid primary key default gen_random_uuid(),
  ordem           bigint generated always as identity,
  escritorio_id   uuid not null references escritorios (id) on delete restrict,
  tipo            text not null check (documento_tipo_valido(tipo)),
  nome            text not null check (length(btrim(nome)) between 3 and 120),
  criado_por      uuid not null references pessoas (id) on delete restrict,
  criado_em       timestamptz not null default app_now(),
  arquivado_em    timestamptz,
  arquivado_por   uuid references pessoas (id) on delete restrict,
  motivo_arquivo  text check (length(btrim(motivo_arquivo)) between 3 and 300),
  versao          integer not null default 1,
  check ((arquivado_em is null) = (arquivado_por is null)),
  check ((arquivado_em is null) = (motivo_arquivo is null))
);
create unique index documento_modelos_um_por_tipo on documento_modelos (escritorio_id, tipo) where tipo <> 'OUTRO' and arquivado_em is null;
create index documento_modelos_escritorio on documento_modelos (escritorio_id, ordem);
call proteger_tabela_escritorio('documento_modelos');

create table documento_modelo_versoes (
  id              uuid primary key default gen_random_uuid(),
  ordem           bigint generated always as identity,
  escritorio_id   uuid not null references escritorios (id) on delete restrict,
  modelo_id       uuid not null references documento_modelos (id) on delete restrict,
  numero          integer not null check (numero >= 1),
  nome_arquivo    text not null check (length(btrim(nome_arquivo)) between 1 and 200 and nome_arquivo !~ '[/\\]'),
  tamanho         integer not null check (tamanho between 1 and 5242880),
  campos          text[] not null check (peticao_campos_validos(campos)),
  desconhecidos   text[] not null check (peticao_campos_validos(desconhecidos)),
  -- O texto de cada parágrafo, para a prévia sem abrir o arquivo (decisão 12).
  paragrafos      text[] not null check (cardinality(paragrafos) <= 5000),
  enviado_por     uuid not null references pessoas (id) on delete restrict,
  enviado_em      timestamptz not null default app_now(),
  unique (modelo_id, numero)
);
create index documento_modelo_versoes_modelo on documento_modelo_versoes (modelo_id, numero desc);
call proteger_tabela_escritorio('documento_modelo_versoes');

-- Cada documento gerado é uma versão (decisão 19). A chave junta as versões de um mesmo documento
-- no contrato: o tipo (CONTRATO, PROCURACAO, HIPOSSUFICIENCIA) ou, no "outro", o id do modelo.
create table documentos_gerados (
  id                uuid primary key default gen_random_uuid(),
  ordem             bigint generated always as identity,
  escritorio_id     uuid not null references escritorios (id) on delete restrict,
  contrato_id       uuid not null references contratos (id) on delete restrict,
  geracao_id        uuid not null,
  tipo              text not null check (documento_tipo_valido(tipo)),
  chave             text not null check (length(chave) between 5 and 60),
  numero            integer not null check (numero >= 1),
  -- O modelo do dia: a versão do modelo do escritório ou o padrão do T3jus, com a data do texto.
  modelo_id         uuid references documento_modelos (id) on delete restrict,
  modelo_versao_id  uuid references documento_modelo_versoes (id) on delete restrict,
  modelo_padrao     text check (documento_padrao_valido(modelo_padrao)),
  modelo_padrao_de  date,
  modelo_nome       text not null check (length(btrim(modelo_nome)) between 3 and 120),
  nome_arquivo      text not null check (length(btrim(nome_arquivo)) between 1 and 200 and nome_arquivo !~ '[/\\]'),
  tamanho           integer not null check (tamanho between 1 and 5242880),
  -- O que foi usado no dia (decisão 16).
  outorgados        jsonb not null check (jsonb_typeof(outorgados) = 'array' and jsonb_array_length(outorgados) between 1 and 15),
  poderes           text[] not null check (documento_poderes_validos(poderes)),
  outro_poder       text check (length(btrim(outro_poder)) between 1 and 300),
  cidade_data       text not null check (length(btrim(cidade_data)) between 3 and 120),
  representante     jsonb,
  marcados          text[] not null check (cardinality(marcados) <= 60),
  gerado_por        uuid not null references pessoas (id) on delete restrict,
  gerado_em         timestamptz not null default app_now(),
  unique (contrato_id, chave, numero),
  check ((modelo_padrao is null) <> (modelo_versao_id is null)),
  check ((modelo_versao_id is null) = (modelo_id is null)),
  check ((modelo_padrao is null) = (modelo_padrao_de is null)),
  check (tipo <> 'OUTRO' or modelo_id is not null),
  check (chave = case when tipo = 'OUTRO' then 'OUTRO:' || modelo_id::text else tipo end)
);
create index documentos_gerados_escritorio on documentos_gerados (escritorio_id, ordem desc);
create index documentos_gerados_contrato on documentos_gerados (contrato_id, chave, numero desc);
create index documentos_gerados_geracao on documentos_gerados (geracao_id);
call proteger_tabela_escritorio('documentos_gerados');

-- Nada se apaga (PT-03): as versões e os gerados não mudam; o modelo só se arquiva.
create function documento_so_acrescenta() returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'Documento gerado e versão de modelo não se mudam nem se apagam' using errcode = 'TC023';
end $$;
create trigger documento_modelo_versoes_so_acrescenta before update or delete on documento_modelo_versoes
  for each row execute function documento_so_acrescenta();
create trigger documentos_gerados_so_acrescenta before update or delete on documentos_gerados
  for each row execute function documento_so_acrescenta();

create function documento_modelo_guarda() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' or old.arquivado_em is not null
     or (to_jsonb(new) - array['arquivado_em', 'arquivado_por', 'motivo_arquivo', 'versao'])
        is distinct from (to_jsonb(old) - array['arquivado_em', 'arquivado_por', 'motivo_arquivo', 'versao']) then
    raise exception 'Modelo de documento só se arquiva' using errcode = 'TC023';
  end if;
  return new;
end $$;
create trigger documento_modelo_guarda before update or delete on documento_modelos
  for each row execute function documento_modelo_guarda();

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('documento_modelos', false, 'Modelos de contrato, procuração, declaração e outros documentos do escritório: tipo, nome e quem enviou', null, null, null, null, null, null, true),
 ('documento_modelo_versoes', false, 'Versões de cada modelo de documento (o arquivo fica no Storage), com os campos achados e o texto dos parágrafos', null, null, null, null, null, null, true),
 ('documentos_gerados', true,
  'Contratos, procurações e declarações gerados (arquivo no Storage): versão, outorgados com a OAB do dia, poderes, representante, o que faltou e quem gerou',
  'Gerar os documentos do contrato com os dados do cadastro e guardar o que foi usado (CH-08, PT-03)',
  'Execução de contrato (LGPD, art. 7º, V) e exercício regular de direitos (art. 7º, VI)',
  'Escritório', 'Enquanto o escritório for cliente do T3jus e 5 anos depois do fim do contrato', 'Exportados ao escritório e apagados com ele, com os arquivos', 'APROVADO', true);

-- ---------------------------------------------------------------------------------------
-- Os assinados entram nos anexos do contrato, ligados à versão assinada (decisão 17).

alter table anexos add column documento_gerado_id uuid references documentos_gerados (id) on delete restrict;
alter table anexos add column assinado_em date;
create index anexos_documento on anexos (documento_gerado_id, concluido_em desc) where documento_gerado_id is not null and situacao = 'PRONTO';

alter table anexos drop constraint anexos_categoria_check;
alter table anexos add constraint anexos_categoria_check
  check (categoria in ('CONTRATO_ASSINADO', 'PROCURACAO_ASSINADA', 'DECLARACAO_ASSINADA', 'DOCUMENTO_ASSINADO',
                       'NOTA_FISCAL', 'GUIA', 'BOLETO', 'COMPROVANTE', 'OFICIO_REQUISITORIO'));
alter table anexos drop constraint anexos_contrato_assinado;
alter table anexos add constraint anexos_contrato_assinado
  check ((contrato_id is not null) = (categoria in ('CONTRATO_ASSINADO', 'PROCURACAO_ASSINADA', 'DECLARACAO_ASSINADA', 'DOCUMENTO_ASSINADO')));
-- A procuração, a declaração e o outro documento assinados sempre apontam a versão gerada; o
-- contrato assinado aponta quando veio do gerado (o de antes desta entrega fica sem).
alter table anexos add constraint anexos_documento_gerado
  check (documento_gerado_id is null or contrato_id is not null);
alter table anexos add constraint anexos_assinado_do_gerado
  check (categoria not in ('PROCURACAO_ASSINADA', 'DECLARACAO_ASSINADA', 'DOCUMENTO_ASSINADO') or documento_gerado_id is not null);

update inventario_dados
   set o_que = 'Contratos, procurações e declarações assinados, notas, guias, boletos, comprovantes e ofícios (arquivo no Storage), com a data da assinatura e quem enviou'
 where tabela = 'anexos';

create or replace function anexo_linha(a anexos) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', a.id, 'categoria', a.categoria, 'nome', a.nome, 'tipo', a.tipo, 'tamanho', a.tamanho,
    'donoId', coalesce(a.contrato_id, a.conta_id, a.pagamento_id, a.requisicao_id),
    'documentoId', a.documento_gerado_id, 'assinadoEm', a.assinado_em,
    'enviadoPor', pessoa_ref(a.enviado_por), 'enviadoEm', a.concluido_em)
$$;

-- A categoria do assinado de cada documento gerado.
create function documento_categoria_assinado(p_tipo text) returns text
language sql immutable
as $$ select case p_tipo when 'CONTRATO' then 'CONTRATO_ASSINADO' when 'PROCURACAO' then 'PROCURACAO_ASSINADA'
                         when 'HIPOSSUFICIENCIA' then 'DECLARACAO_ASSINADA' else 'DOCUMENTO_ASSINADO' end $$;

-- Registrar o envio. dono: CONTRATO, CONTA, RECEBIMENTO ou REQUISICAO. No contrato, documentoId
-- (opcional) liga o assinado à versão gerada e dá a categoria; assinadoEm é a data da assinatura,
-- que não pode ser depois de hoje (decisão 17).
create or replace function portal_anexo_iniciar(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dono text := p_dados ->> 'dono';
  v_id uuid;
  v_dono_id uuid;
  v_categoria text := p_dados ->> 'categoria';
  v_doc uuid;
  v_doc_tipo text;
  v_em date;
begin
  perform anexo_alguma_area(p_pessoa, p_escritorio);
  if v_dono is null or v_dono not in ('CONTRATO', 'CONTA', 'RECEBIMENTO', 'REQUISICAO') then
    perform recusar_campos('Confira o anexo', 'dono');
  end if;
  perform anexo_entrar(p_pessoa, p_escritorio, v_dono, true);
  begin
    v_dono_id := (p_dados ->> 'donoId')::uuid;
  exception when invalid_text_representation then
    v_dono_id := null;
  end;
  if v_dono = 'CONTRATO' then
    if not exists (select 1 from contratos where id = v_dono_id and escritorio_id = p_escritorio) then
      raise exception 'Contrato não encontrado' using errcode = 'TC404';
    end if;
    v_categoria := 'CONTRATO_ASSINADO';
    if nullif(p_dados ->> 'documentoId', '') is not null then
      begin
        v_doc := (p_dados ->> 'documentoId')::uuid;
      exception when invalid_text_representation then
        v_doc := null;
      end;
      select g.tipo into v_doc_tipo from documentos_gerados g
       where g.id = v_doc and g.contrato_id = v_dono_id and g.escritorio_id = p_escritorio;
      if v_doc_tipo is null then perform recusar_campos('Este documento não é deste contrato', 'documentoId'); end if;
      v_categoria := documento_categoria_assinado(v_doc_tipo);
    end if;
    if nullif(p_dados ->> 'assinadoEm', '') is not null then
      begin
        v_em := (p_dados ->> 'assinadoEm')::date;
      exception when others then
        raise exception 'Confira a data' using errcode = 'TC422',
          detail = jsonb_build_object('campos', jsonb_build_array('assinadoEm'), 'motivo', 'DATA_INVALIDA')::text;
      end;
      if v_em > hoje_brasilia() then
        raise exception 'A data da assinatura é depois de hoje' using errcode = 'TC422',
          detail = jsonb_build_object('campos', jsonb_build_array('assinadoEm'), 'motivo', 'DATA_FUTURA')::text;
      end if;
    end if;
  elsif v_dono = 'CONTA' then
    if not exists (select 1 from contas_pagar where id = v_dono_id and escritorio_id = p_escritorio) then
      raise exception 'Conta não encontrada' using errcode = 'TC404';
    end if;
    if v_categoria is null or v_categoria not in ('NOTA_FISCAL', 'GUIA', 'BOLETO', 'COMPROVANTE') then
      perform recusar_campos('Diga o que é o arquivo', 'categoria');
    end if;
  elsif v_dono = 'REQUISICAO' then
    if not exists (select 1 from requisicoes_a_caminho where id = v_dono_id and escritorio_id = p_escritorio) then
      raise exception 'Requisição não encontrada' using errcode = 'TC404';
    end if;
    v_categoria := 'OFICIO_REQUISITORIO';
  else
    if not exists (select 1 from pagamentos_recebidos where id = v_dono_id and escritorio_id = p_escritorio) then
      raise exception 'Recebimento não encontrado' using errcode = 'TC404';
    end if;
    v_categoria := 'COMPROVANTE';
  end if;
  begin
    insert into anexos (escritorio_id, contrato_id, conta_id, pagamento_id, requisicao_id, categoria, nome, tipo, tamanho, enviado_por,
                        documento_gerado_id, assinado_em)
    values (p_escritorio,
            case when v_dono = 'CONTRATO' then v_dono_id end,
            case when v_dono = 'CONTA' then v_dono_id end,
            case when v_dono = 'RECEBIMENTO' then v_dono_id end,
            case when v_dono = 'REQUISICAO' then v_dono_id end,
            v_categoria, btrim(p_dados ->> 'nome'), p_dados ->> 'tipo', (p_dados ->> 'tamanho')::integer, p_pessoa,
            v_doc, v_em)
    returning id into v_id;
  exception when check_violation or not_null_violation or invalid_text_representation or numeric_value_out_of_range then
    perform recusar_campos('Arquivo não aceito', 'arquivo');
  end;
  return v_id;
end $$;

-- O histórico do contrato diz qual documento foi anexado.
create or replace function anexo_historico(a anexos, p_acao text) returns void
language plpgsql
set search_path = public
as $$
begin
  if a.contrato_id is not null then
    perform registrar_historico(case when p_acao = 'anexo.enviado' and a.documento_gerado_id is not null then 'documento.assinado_anexado' else p_acao end,
      'contratos', a.contrato_id::text,
      jsonb_build_object('anexo', a.id, 'categoria', a.categoria, 'documento', a.documento_gerado_id, 'assinadoEm', a.assinado_em,
                         'versao', (select g.numero from documentos_gerados g where g.id = a.documento_gerado_id)));
  elsif a.conta_id is not null then
    perform registrar_historico(p_acao, 'contas_pagar', a.conta_id::text, jsonb_build_object('anexo', a.id, 'categoria', a.categoria));
  elsif a.requisicao_id is not null then
    perform registrar_historico(p_acao, 'requisicoes_a_caminho', a.requisicao_id::text, jsonb_build_object('anexo', a.id, 'categoria', a.categoria));
  else
    perform registrar_historico(p_acao, 'recebimentos_previstos', (select p.parcela_id::text from pagamentos_recebidos p where p.id = a.pagamento_id),
      jsonb_build_object('anexo', a.id, 'categoria', a.categoria, 'pagamento', a.pagamento_id));
  end if;
end $$;

-- O quadro "Arquivo assinado" da aba Contrato continua mostrando só o contrato assinado.
create or replace function portal_contrato_anexos(p_pessoa uuid, p_escritorio uuid, p_contrato uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform anexo_entrar(p_pessoa, p_escritorio, 'CONTRATO', false);
  if not exists (select 1 from contratos where id = p_contrato and escritorio_id = p_escritorio) then
    raise exception 'Contrato não encontrado' using errcode = 'TC404';
  end if;
  return jsonb_build_object('anexos', coalesce((
    select jsonb_agg(anexo_linha(a) order by a.concluido_em desc, a.id)
      from anexos a where a.contrato_id = p_contrato and a.situacao = 'PRONTO' and a.categoria = 'CONTRATO_ASSINADO'), '[]'::jsonb));
end $$;

-- ---------------------------------------------------------------------------------------
-- Peças.

create function documento_entrar(p_pessoa uuid, p_escritorio uuid, p_editar boolean) returns void
language plpgsql
set search_path = public
as $$
begin
  perform entrar_area(p_pessoa, p_escritorio, 'CONTRATOS');
  perform entrar_escritorio(p_pessoa, p_escritorio, case when p_editar then 'contratos.editar' else 'contratos.ver' end);
  if p_editar then perform portal_exigir_escrita(p_pessoa, p_escritorio); end if;
end $$;

create function documento_ler_contrato(p_escritorio uuid, p_contrato uuid) returns contratos
language plpgsql stable
set search_path = public
as $$
declare c contratos;
begin
  select * into c from contratos where id = p_contrato and escritorio_id = p_escritorio;
  if c.id is null then raise exception 'Contrato não encontrado' using errcode = 'TC404'; end if;
  return c;
end $$;

-- O modelo que vale hoje para um documento: o do escritório (a versão mais nova) ou o padrão.
create function documento_modelo_em_uso(p_escritorio uuid, p_tipo text, p_cliente_tipo text) returns jsonb
language sql stable
set search_path = public
as $$
  select coalesce(
    (select jsonb_build_object('tipo', m.tipo, 'modeloId', m.id, 'nome', m.nome, 'numero', v.numero, 'padrao', null, 'emRevisao', false)
       from documento_modelos m
       join lateral (select numero from documento_modelo_versoes x where x.modelo_id = m.id order by x.numero desc limit 1) v on true
      where m.escritorio_id = p_escritorio and m.tipo = p_tipo and m.arquivado_em is null and p_tipo <> 'OUTRO'),
    jsonb_build_object('tipo', p_tipo, 'modeloId', null, 'numero', null, 'emRevisao', true,
      'padrao', case when p_tipo = 'HIPOSSUFICIENCIA' then 'HIPOSSUFICIENCIA_' || p_cliente_tipo else p_tipo end,
      'nome', case p_tipo when 'CONTRATO' then 'Contrato de honorários' when 'PROCURACAO' then 'Procuração'
                         else 'Declaração de hipossuficiência (' || case when p_cliente_tipo = 'PJ' then 'pessoa jurídica' else 'pessoa física' end || ')' end))
$$;

-- Quem pode ser outorgado: quem está na equipe e tem OAB (decisão 10). Os do contrato vêm primeiro,
-- com as inscrições que o contrato guarda; os outros, com todas.
create function documento_advogados(p_escritorio uuid, c contratos) returns jsonb
language sql stable
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'pessoaId', p.id, 'nome', p.nome, 'noContrato', ca.pessoa_id is not null, 'responsavel', p.id = c.responsavel_id,
           'inscricoes', oab_inscricoes(p.id, p_escritorio),
           'escolhidas', case when ca.pessoa_id is not null then to_jsonb(contrato_inscricoes_valem(p_escritorio, c.id, p.id))
                              else (select coalesce(jsonb_agg(i.id), '[]'::jsonb) from oab_inscricao i
                                     where i.pessoa_id = p.id and i.escritorio_id = p_escritorio and i.removido_em is null) end)
         order by ca.pessoa_id is null, p.id <> c.responsavel_id, p.nome), '[]'::jsonb)
    from pessoas p
    left join contrato_advogados ca on ca.contrato_id = c.id and ca.pessoa_id = p.id
   where peticao_membro(p.id, p_escritorio) and peticao_tem_oab(p.id, p_escritorio)
$$;

-- Os documentos mais novos de cada chave no contrato, com a situação da assinatura.
create function documento_atuais(p_contrato uuid) returns jsonb
language sql stable
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object('chave', g.chave, 'tipo', g.tipo, 'modeloId', g.modelo_id, 'numero', g.numero, 'geradoEm', g.gerado_em,
                                               'assinado', exists (select 1 from anexos a where a.documento_gerado_id = g.id and a.situacao = 'PRONTO'))
                            order by g.ordem), '[]'::jsonb)
    from documentos_gerados g
   where g.contrato_id = p_contrato
     and g.numero = (select max(x.numero) from documentos_gerados x where x.contrato_id = g.contrato_id and x.chave = g.chave)
$$;

-- A última geração do contrato (para "Gerar de novo" abrir com as mesmas escolhas, decisão 19).
create function documento_ultima(p_contrato uuid) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
      'geracaoId', u.geracao_id, 'em', u.gerado_em, 'por', pessoa_ref(u.gerado_por),
      'documentos', (select jsonb_agg(jsonb_build_object('tipo', g.tipo, 'modeloId', case when g.tipo = 'OUTRO' then g.modelo_id end) order by g.ordem)
                       from documentos_gerados g where g.geracao_id = u.geracao_id),
      'outorgados', (select jsonb_agg(jsonb_build_object('pessoaId', o ->> 'pessoaId', 'inscricoes', o -> 'inscricoes')) from jsonb_array_elements(u.outorgados) o),
      'poderes', to_jsonb(u.poderes), 'outroPoder', u.outro_poder, 'cidadeData', u.cidade_data)
    from (select * from documentos_gerados where contrato_id = p_contrato order by ordem desc limit 1) u
$$;

-- O que a página de gerar mostra para um contrato (decisões 7 a 15 e 19).
create function documento_dados(p_pessoa uuid, p_escritorio uuid, c contratos) returns jsonb
language sql stable
set search_path = public
as $$
  with k as (select * from clientes_escritorio where id = c.cliente_id),
       u as (select documento_ultima(c.id) j)
  select jsonb_build_object(
    'contrato', jsonb_build_object('id', c.id, 'numero', c.numero, 'objeto', c.objeto, 'estado', c.estado, 'assinadoEm', c.assinado_em, 'versao', c.versao),
    'cliente', (select jsonb_build_object(
        'id', k.id, 'nome', k.nome, 'tipo', k.tipo, 'documento', k.documento, 'nacionalidade', k.nacionalidade, 'estadoCivil', k.estado_civil,
        'profissao', k.profissao, 'rg', k.rg, 'rgOrgao', k.rg_orgao, 'endereco', k.endereco, 'bairro', k.bairro, 'cidade', k.cidade, 'uf', k.uf,
        'cep', k.cep, 'repNome', k.rep_nome, 'repCargo', k.rep_cargo, 'repDocumento', k.rep_documento, 'repEstadoCivil', k.rep_estado_civil,
        'repProfissao', k.rep_profissao, 'versao', k.versao) from k),
    'condicoes', honorario_lista(p_escritorio, 'CONTRATO', c.id),
    'casos', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'nome', s.nome, 'numero', s.numero_cnj) order by s.criado_em, s.id)
                         from casos s where s.escritorio_id = p_escritorio
                          and exists (select 1 from caso_clientes cc where cc.caso_id = s.id and cc.contrato_id = c.id)), '[]'::jsonb),
    'advogados', documento_advogados(p_escritorio, c),
    'semOab', coalesce((select jsonb_agg(pessoa_ref(p.id) order by p.nome) from pessoas p
                         where peticao_membro(p.id, p_escritorio) and not peticao_tem_oab(p.id, p_escritorio)
                           and 'CONTRATOS' = any (areas_da_pessoa(p.id, p_escritorio))), '[]'::jsonb),
    'escritorio', (select jsonb_build_object('nome', e.nome, 'cnpj', e.cnpj, 'endereco', e.endereco, 'cidade', e.cidade, 'uf', e.uf,
                                             'oab', oab_sociedade_frase(e), 'contatos', e.contatos) from escritorios e where e.id = p_escritorio),
    -- A marca de hoje no cabeçalho dos padrão, como na proposta (F3.92).
    'marca', marca_do_escritorio(p_escritorio),
    'hoje', hoje_brasilia(),
    'modelos', (select jsonb_agg(documento_modelo_em_uso(p_escritorio, t, (select tipo from k)) order by n)
                  from unnest(array['CONTRATO', 'PROCURACAO', 'HIPOSSUFICIENCIA']) with ordinality t(t, n))
               || coalesce((select jsonb_agg(jsonb_build_object('tipo', 'OUTRO', 'modeloId', m.id, 'nome', m.nome, 'padrao', null, 'emRevisao', false,
                                                                 'numero', (select max(v.numero) from documento_modelo_versoes v where v.modelo_id = m.id)) order by m.ordem)
                              from documento_modelos m where m.escritorio_id = p_escritorio and m.tipo = 'OUTRO' and m.arquivado_em is null), '[]'::jsonb),
    'atuais', documento_atuais(c.id),
    'ultima', (select j from u),
    'mudancas', coalesce((select jsonb_agg(jsonb_build_object('campos', h.dados -> 'campos', 'por', pessoa_ref(h.autor_id), 'em', h.ocorrido_em) order by h.id)
                            from historico h, u
                           where u.j is not null and h.escritorio_id = p_escritorio and h.entidade = 'cliente' and h.entidade_id = c.cliente_id::text
                             and h.acao = 'cliente.editado' and h.ocorrido_em > (u.j ->> 'em')::timestamptz), '[]'::jsonb),
    'poderesIniciais', coalesce((select to_jsonb(g.poderes) from documentos_gerados g where g.escritorio_id = p_escritorio order by g.ordem desc limit 1),
                                '["RECEBER_QUITAR", "ACORDO", "SUBSTABELECER", "DESISTIR"]'::jsonb))
$$;

create function portal_documento_dados(p_pessoa uuid, p_escritorio uuid, p_contrato uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform documento_entrar(p_pessoa, p_escritorio, false);
  return documento_dados(p_pessoa, p_escritorio, documento_ler_contrato(p_escritorio, p_contrato));
end $$;

-- Confere o pedido (decisão 13). Só bloqueiam nenhum documento e nenhum outorgado (e o que impede
-- o documento de existir: modelo que não existe, inscrição que não é da pessoa, contrato encerrado).
-- Devolve o pedido limpo, com o modelo de cada documento e o número da versão que vai nascer.
create function documento_conferir(p_escritorio uuid, c contratos, p_pedido jsonb) returns jsonb
language plpgsql stable
set search_path = public
as $$
declare
  e jsonb := '{}'::jsonb;
  v_cliente_tipo text := (select tipo from clientes_escritorio where id = c.cliente_id);
  v_docs jsonb := '[]'::jsonb;
  v_adv jsonb := '[]'::jsonb;
  v_poderes text[];
  v_outro text := nullif(btrim(coalesce(p_pedido ->> 'outroPoder', '')), '');
  v_data text := btrim(coalesce(p_pedido ->> 'cidadeData', ''));
  d jsonb;
  a jsonb;
  v_tipo text;
  v_mid uuid;
  m documento_modelos;
  v documento_modelo_versoes;
  v_chave text;
  v_uso jsonb;
  v_pid uuid;
  v_insc uuid[];
begin
  if c.estado = 'ENCERRADO' then perform recusar_motivo('O contrato está encerrado', 'CONTRATO_ENCERRADO'); end if;

  for d in select * from jsonb_array_elements(coalesce(p_pedido -> 'documentos', '[]'::jsonb)) loop
    v_tipo := upper(coalesce(d ->> 'tipo', ''));
    if not documento_tipo_valido(v_tipo) then e := e || '{"documentos": "MODELO_INVALIDO"}'; continue; end if;
    if v_tipo = 'OUTRO' then
      begin
        v_mid := (d ->> 'modeloId')::uuid;
      exception when others then v_mid := null;
      end;
      select * into m from documento_modelos where id = v_mid and escritorio_id = p_escritorio and tipo = 'OUTRO' and arquivado_em is null;
      if m.id is null then e := e || '{"documentos": "MODELO_INVALIDO"}'; continue; end if;
      v_chave := 'OUTRO:' || m.id::text;
      select * into v from documento_modelo_versoes where modelo_id = m.id order by numero desc limit 1;
      v_uso := jsonb_build_object('modeloId', m.id, 'versaoId', v.id, 'nome', m.nome, 'numeroModelo', v.numero,
                                  'campos', to_jsonb(v.campos), 'paragrafos', to_jsonb(v.paragrafos));
    else
      v_chave := v_tipo;
      v_uso := documento_modelo_em_uso(p_escritorio, v_tipo, v_cliente_tipo);
      if v_uso ->> 'modeloId' is not null then
        select * into v from documento_modelo_versoes where modelo_id = (v_uso ->> 'modeloId')::uuid order by numero desc limit 1;
        v_uso := jsonb_build_object('modeloId', v.modelo_id, 'versaoId', v.id, 'nome', v_uso ->> 'nome', 'numeroModelo', v.numero,
                                    'campos', to_jsonb(v.campos), 'paragrafos', to_jsonb(v.paragrafos));
      else
        v_uso := jsonb_build_object('padrao', v_uso ->> 'padrao', 'nome', v_uso ->> 'nome');
      end if;
    end if;
    if v_docs @> jsonb_build_array(jsonb_build_object('chave', v_chave)) then continue; end if;
    v_docs := v_docs || jsonb_build_array(v_uso || jsonb_build_object('tipo', v_tipo, 'chave', v_chave,
      'numero', coalesce((select max(g.numero) from documentos_gerados g where g.contrato_id = c.id and g.chave = v_chave), 0) + 1));
  end loop;
  if jsonb_array_length(v_docs) = 0 and not e ? 'documentos' then e := e || '{"documentos": "DOCUMENTO_OBRIGATORIO"}'; end if;

  for a in select * from jsonb_array_elements(coalesce(p_pedido -> 'outorgados', '[]'::jsonb)) loop
    begin
      v_pid := (a ->> 'pessoaId')::uuid;
      select coalesce(array_agg(distinct x::uuid), '{}') into v_insc from jsonb_array_elements_text(coalesce(a -> 'inscricoes', '[]'::jsonb)) x;
    exception when others then v_pid := null;
    end;
    if v_pid is null or not peticao_membro(v_pid, p_escritorio) or not peticao_tem_oab(v_pid, p_escritorio) then
      e := e || '{"outorgados": "ADVOGADO_SEM_OAB"}';
    elsif cardinality(v_insc) = 0 or exists (select 1 from unnest(v_insc) x where not exists (
            select 1 from oab_inscricao where id = x and pessoa_id = v_pid and escritorio_id = p_escritorio and removido_em is null)) then
      e := e || '{"outorgados": "INSCRICAO_INVALIDA"}';
    elsif v_adv @> jsonb_build_array(jsonb_build_object('pessoaId', v_pid)) then
      continue;
    else
      v_adv := v_adv || jsonb_build_array(jsonb_build_object('pessoaId', v_pid,
        -- A principal primeiro, como a Equipe mostra.
        'inscricoes', (select jsonb_agg(i.id order by i.tipo <> 'PRINCIPAL', i.ordem) from oab_inscricao i where i.id = any (v_insc))));
    end if;
  end loop;
  if jsonb_array_length(coalesce(p_pedido -> 'outorgados', '[]'::jsonb)) = 0 then e := e || '{"outorgados": "SEM_OUTORGADO"}'; end if;

  begin
    select coalesce(array_agg(distinct upper(x)), '{}') into v_poderes from jsonb_array_elements_text(coalesce(p_pedido -> 'poderes', '[]'::jsonb)) x;
  exception when others then v_poderes := null;
  end;
  if v_poderes is null or not documento_poderes_validos(v_poderes) then e := e || '{"poderes": "PODER_INVALIDO"}'; end if;
  if v_outro is not null and length(v_outro) > 300 then e := e || '{"outroPoder": "TEXTO_LONGO"}'; end if;
  if length(v_data) < 3 then e := e || '{"cidadeData": "CIDADE_DATA_OBRIGATORIA"}';
  elsif length(v_data) > 120 then e := e || '{"cidadeData": "CIDADE_DATA_LONGA"}'; end if;

  if e <> '{}'::jsonb then perform peticao_recusar(e, 'Confira os documentos'); end if;
  return jsonb_build_object('documentos', v_docs, 'outorgados', v_adv, 'poderes', to_jsonb(v_poderes), 'outroPoder', v_outro, 'cidadeData', v_data);
end $$;

-- Antes de gerar (e na prévia): confere e devolve o pedido limpo e os dados. Não grava nada.
create function portal_documento_preparar(p_pessoa uuid, p_escritorio uuid, p_contrato uuid, p_pedido jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare c contratos;
begin
  perform documento_entrar(p_pessoa, p_escritorio, true);
  c := documento_ler_contrato(p_escritorio, p_contrato);
  return jsonb_build_object('pedido', documento_conferir(p_escritorio, c, p_pedido), 'dados', documento_dados(p_pessoa, p_escritorio, c));
end $$;

-- O que foi usado numa geração (decisão 16), lido das versões: fica como estava no dia.
create function documento_usado(p_geracao uuid) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
      'geracaoId', u.geracao_id, 'em', u.gerado_em, 'por', pessoa_ref(u.gerado_por),
      'contrato', (select jsonb_build_object('id', c.id, 'numero', c.numero) from contratos c where c.id = u.contrato_id),
      'documentos', (select jsonb_agg(jsonb_build_object('id', g.id, 'tipo', g.tipo, 'nome', g.modelo_nome, 'arquivo', g.nome_arquivo, 'numero', g.numero,
                                                         'modelo', case when g.modelo_padrao is not null then 'Padrão T3jus, de ' || to_char(g.modelo_padrao_de, 'DD/MM/YYYY')
                                                                        else 'Modelo do escritório, v' || (select v.numero from documento_modelo_versoes v where v.id = g.modelo_versao_id) end,
                                                         'marcados', to_jsonb(g.marcados)) order by g.ordem)
                       from documentos_gerados g where g.geracao_id = u.geracao_id),
      'outorgados', (select jsonb_agg(o - 'inscricoes') from jsonb_array_elements(u.outorgados) o),
      'poderes', to_jsonb(u.poderes), 'outroPoder', u.outro_poder, 'cidadeData', u.cidade_data, 'representante', u.representante)
    from (select * from documentos_gerados where geracao_id = p_geracao order by ordem limit 1) u
$$;

-- Gera os documentos (decisões 13, 16 e 19). p_resultado vem da API: { geracaoId, documentos:
-- [{ id, chave, arquivo, tamanho, marcados }] }, na ordem dos documentos do pedido conferido.
create function portal_documento_gravar(p_pessoa uuid, p_escritorio uuid, p_contrato uuid, p_pedido jsonb, p_resultado jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c contratos;
  v_ped jsonb;
  v_geracao uuid;
  v_out jsonb;
  v_rep jsonb;
  d jsonb;
  r jsonb;
  i integer := 0;
  v_tipos text[] := '{}';
begin
  perform documento_entrar(p_pessoa, p_escritorio, true);
  select * into c from contratos where id = p_contrato and escritorio_id = p_escritorio for update;
  if c.id is null then raise exception 'Contrato não encontrado' using errcode = 'TC404'; end if;
  v_ped := documento_conferir(p_escritorio, c, p_pedido);
  begin
    v_geracao := (p_resultado ->> 'geracaoId')::uuid;
  exception when others then v_geracao := null;
  end;
  if v_geracao is null or jsonb_typeof(p_resultado -> 'documentos') <> 'array'
     or jsonb_array_length(p_resultado -> 'documentos') <> jsonb_array_length(v_ped -> 'documentos') then
    raise exception 'Resultado dos documentos incompleto' using errcode = 'TC422';
  end if;
  -- Os outorgados com a frase da OAB do dia; quem assina pela empresa, como estava (decisão 16).
  select jsonb_agg(jsonb_build_object('pessoaId', p.id, 'nome', p.nome, 'inscricoes', o -> 'inscricoes',
                                      'frase', oab_frase(p.id, p_escritorio, array(select jsonb_array_elements_text(o -> 'inscricoes')::uuid))) order by n)
    into v_out
    from jsonb_array_elements(v_ped -> 'outorgados') with ordinality x(o, n) join pessoas p on p.id = (o ->> 'pessoaId')::uuid;
  select case when k.tipo = 'PJ' and k.rep_nome is not null then jsonb_build_object('nome', k.rep_nome, 'cargo', k.rep_cargo) end
    into v_rep from clientes_escritorio k where k.id = c.cliente_id;

  for d in select * from jsonb_array_elements(v_ped -> 'documentos') loop
    r := p_resultado -> 'documentos' -> i;
    i := i + 1;
    if r ->> 'chave' is distinct from d ->> 'chave' or (r ->> 'id') is null or (r ->> 'arquivo') is null or (r ->> 'tamanho') is null then
      raise exception 'Resultado dos documentos não confere com o pedido' using errcode = 'TC422';
    end if;
    insert into documentos_gerados (id, escritorio_id, contrato_id, geracao_id, tipo, chave, numero, modelo_id, modelo_versao_id, modelo_padrao,
                                    modelo_padrao_de, modelo_nome, nome_arquivo, tamanho, outorgados, poderes, outro_poder, cidade_data,
                                    representante, marcados, gerado_por)
    values ((r ->> 'id')::uuid, p_escritorio, c.id, v_geracao, d ->> 'tipo', d ->> 'chave', (d ->> 'numero')::integer,
            (d ->> 'modeloId')::uuid, (d ->> 'versaoId')::uuid, d ->> 'padrao', case when d ->> 'padrao' is not null then (p_resultado ->> 'padraoDe')::date end,
            d ->> 'nome', r ->> 'arquivo', (r ->> 'tamanho')::integer, v_out,
            array(select jsonb_array_elements_text(v_ped -> 'poderes')), v_ped ->> 'outroPoder', v_ped ->> 'cidadeData', v_rep,
            array(select jsonb_array_elements_text(coalesce(r -> 'marcados', '[]'::jsonb))), p_pessoa);
    v_tipos := v_tipos || (d ->> 'tipo');
  end loop;

  perform registrar_historico('documento.gerado', 'contratos', c.id::text,
    jsonb_build_object('geracao', v_geracao, 'tipos', to_jsonb(v_tipos),
                       'versoes', (select jsonb_agg(x ->> 'numero') from jsonb_array_elements(v_ped -> 'documentos') x),
                       'marcados', (select count(*) from jsonb_array_elements(p_resultado -> 'documentos') x, jsonb_array_elements_text(coalesce(x -> 'marcados', '[]')) y)));
  return jsonb_build_object(
    'geracaoId', v_geracao,
    'documentos', (select jsonb_agg(jsonb_build_object('id', g.id, 'tipo', g.tipo, 'nome', g.modelo_nome, 'arquivo', g.nome_arquivo, 'numero', g.numero,
                                                       'marcados', to_jsonb(g.marcados)) order by g.ordem)
                     from documentos_gerados g where g.geracao_id = v_geracao),
    'usado', documento_usado(v_geracao));
end $$;

-- Uma versão de documento, com os assinados ligados a ela (o mais novo primeiro).
create function documento_versao_linha(g documentos_gerados) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', g.id, 'numero', g.numero, 'arquivo', g.nome_arquivo, 'geracaoId', g.geracao_id,
    'modelo', jsonb_build_object('nome', g.modelo_nome, 'padrao', g.modelo_padrao is not null,
                                 'numero', (select v.numero from documento_modelo_versoes v where v.id = g.modelo_versao_id)),
    'geradoPor', pessoa_ref(g.gerado_por), 'geradoEm', g.gerado_em, 'marcados', to_jsonb(g.marcados),
    'assinados', coalesce((select jsonb_agg(jsonb_build_object('anexoId', a.id, 'nome', a.nome, 'assinadoEm', a.assinado_em,
                                                               'enviadoPor', pessoa_ref(a.enviado_por), 'enviadoEm', a.concluido_em)
                                            order by a.concluido_em desc, a.id)
                             from anexos a where a.documento_gerado_id = g.id and a.situacao = 'PRONTO'), '[]'::jsonb))
$$;

-- A aba Documentos da ficha do contrato (decisão 20): cada documento com a versão atual e as
-- anteriores; os que esperam o assinado primeiro.
create function portal_contrato_documentos(p_pessoa uuid, p_escritorio uuid, p_contrato uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare c contratos;
begin
  perform documento_entrar(p_pessoa, p_escritorio, false);
  c := documento_ler_contrato(p_escritorio, p_contrato);
  return (
    with docs as (
      select g.chave, g.tipo, (array_agg(g.modelo_nome order by g.numero desc))[1] nome,
             (array_agg(g.id order by g.numero desc))[1] atual, min(g.ordem) primeira
        from documentos_gerados g where g.contrato_id = c.id group by g.chave, g.tipo),
    linhas as (
      select d.*, exists (select 1 from anexos a where a.documento_gerado_id = d.atual and a.situacao = 'PRONTO') assinado from docs d)
    select jsonb_build_object(
      'contrato', jsonb_build_object('id', c.id, 'numero', c.numero, 'estado', c.estado, 'assinadoEm', c.assinado_em, 'versao', c.versao,
                                     'cliente', (select jsonb_build_object('id', k.id, 'nome', k.nome) from clientes_escritorio k where k.id = c.cliente_id)),
      'documentos', coalesce((select jsonb_agg(jsonb_build_object(
          'chave', l.chave, 'tipo', l.tipo, 'nome', l.nome, 'situacao', case when l.assinado then 'ASSINADO' else 'FALTA' end,
          'atual', (select documento_versao_linha(g) from documentos_gerados g where g.id = l.atual),
          'anteriores', coalesce((select jsonb_agg(documento_versao_linha(g) order by g.numero desc) from documentos_gerados g
                                   where g.contrato_id = c.id and g.chave = l.chave and g.id <> l.atual), '[]'::jsonb))
        order by l.assinado, l.primeira) from linhas l), '[]'::jsonb),
      'faltam', (select count(*) from linhas l where not l.assinado),
      'ultima', (select documento_usado(g.geracao_id) from documentos_gerados g where g.contrato_id = c.id order by g.ordem desc limit 1),
      'podeGerar', c.estado <> 'ENCERRADO' and pode(p_pessoa, p_escritorio, 'contratos.editar') and contrato_situacao(p_escritorio) in ('ABERTO', 'MARCADO')));
end $$;

-- A lista de Procurações e modelos (decisão 2): o documento mais novo de cada contrato, os que
-- esperam o assinado primeiro, com filtro e busca pelo cliente, pelo contrato ou pelo documento.
create function portal_documentos(p_pessoa uuid, p_escritorio uuid, p_filtro jsonb default '{}'::jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sit text := upper(coalesce(nullif(p_filtro ->> 'situacao', ''), 'TODOS'));
  v_q text := nullif(btrim(coalesce(p_filtro ->> 'q', '')), '');
begin
  perform documento_entrar(p_pessoa, p_escritorio, false);
  if v_sit not in ('TODOS', 'FALTA', 'ASSINADOS') then perform recusar_campos('Confira o filtro', 'situacao'); end if;
  if length(v_q) > 100 then perform recusar_campos('Busca longa demais', 'q'); end if;
  return (
    with atuais as (
      select g.*, k.id cliente_id, k.nome cliente_nome, c.numero contrato_numero, c.estado contrato_estado,
             (select a.id from anexos a where a.documento_gerado_id = g.id and a.situacao = 'PRONTO' order by a.concluido_em desc, a.id limit 1) anexo
        from documentos_gerados g join contratos c on c.id = g.contrato_id join clientes_escritorio k on k.id = c.cliente_id
       where g.escritorio_id = p_escritorio
         and g.numero = (select max(x.numero) from documentos_gerados x where x.contrato_id = g.contrato_id and x.chave = g.chave)),
    achados as (
      select * from atuais a
       where v_q is null or sem_acento(a.cliente_nome) like '%' || sem_acento(v_q) || '%'
          or a.contrato_numero ilike '%' || v_q || '%' or sem_acento(a.modelo_nome) like '%' || sem_acento(v_q) || '%')
    select jsonb_build_object(
      'documentos', coalesce((select jsonb_agg(jsonb_build_object(
          'id', a.id, 'chave', a.chave, 'tipo', a.tipo, 'nome', a.modelo_nome, 'numero', a.numero, 'arquivo', a.nome_arquivo,
          'geradoPor', pessoa_ref(a.gerado_por), 'geradoEm', a.gerado_em, 'marcados', cardinality(a.marcados),
          'cliente', jsonb_build_object('id', a.cliente_id, 'nome', a.cliente_nome),
          'contrato', jsonb_build_object('id', a.contrato_id, 'numero', a.contrato_numero, 'estado', a.contrato_estado),
          'situacao', case when a.anexo is null then 'FALTA' else 'ASSINADO' end,
          'assinado', (select jsonb_build_object('anexoId', x.id, 'nome', x.nome, 'assinadoEm', x.assinado_em, 'enviadoPor', pessoa_ref(x.enviado_por), 'enviadoEm', x.concluido_em)
                         from anexos x where x.id = a.anexo))
        order by a.anexo is not null, a.tipo <> 'CONTRATO', a.gerado_em desc, a.ordem)
        from achados a
       where v_sit = 'TODOS' or (v_sit = 'FALTA' and a.anexo is null) or (v_sit = 'ASSINADOS' and a.anexo is not null)), '[]'::jsonb),
      'contagem', jsonb_build_object('todos', (select count(*) from achados), 'falta', (select count(*) from achados where anexo is null),
                                     'assinados', (select count(*) from achados where anexo is not null)),
      'esperandoContrato', coalesce((select jsonb_agg(jsonb_build_object('id', a.contrato_id, 'numero', a.contrato_numero, 'cliente', a.cliente_nome) order by a.gerado_em)
                                       from atuais a where a.tipo = 'CONTRATO' and a.anexo is null and a.contrato_estado = 'ELABORACAO'), '[]'::jsonb),
      'podeGerar', pode(p_pessoa, p_escritorio, 'contratos.editar') and contrato_situacao(p_escritorio) in ('ABERTO', 'MARCADO')));
end $$;

-- Baixar o .docx de uma versão: confere a área e devolve o nome; a API gera o link temporário.
create function portal_documento_arquivo(p_pessoa uuid, p_escritorio uuid, p_id uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare g documentos_gerados;
begin
  perform documento_entrar(p_pessoa, p_escritorio, false);
  select * into g from documentos_gerados where id = p_id and escritorio_id = p_escritorio;
  if g.id is null then raise exception 'Documento não encontrado' using errcode = 'TC404'; end if;
  return jsonb_build_object('id', g.id, 'nome', g.nome_arquivo);
end $$;

-- Os arquivos de uma geração, para o .zip de "Baixar todos" (decisão 16).
create function portal_documento_geracao(p_pessoa uuid, p_escritorio uuid, p_geracao uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v jsonb;
begin
  perform documento_entrar(p_pessoa, p_escritorio, false);
  select jsonb_build_object('numero', c.numero, 'cliente', k.nome, 'versao', max(g.numero),
                            'arquivos', jsonb_agg(jsonb_build_object('id', g.id, 'nome', g.nome_arquivo) order by g.ordem))
    into v
    from documentos_gerados g join contratos c on c.id = g.contrato_id join clientes_escritorio k on k.id = c.cliente_id
   where g.geracao_id = p_geracao and g.escritorio_id = p_escritorio
   group by c.numero, k.nome;
  if v is null then raise exception 'Geração não encontrada' using errcode = 'TC404'; end if;
  return v;
end $$;

-- ---------------------------------------------------------------------------------------
-- Modelos do escritório (decisões 5 e 6). Os padrão vêm do código; aqui, os enviados e o uso.

create function documento_modelo_linha(m documento_modelos) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', m.id, 'padrao', false, 'tipo', m.tipo, 'nome', m.nome, 'emRevisao', false,
    'versao', v.numero, 'versaoId', v.id, 'campos', to_jsonb(v.campos), 'desconhecidos', to_jsonb(v.desconhecidos),
    'enviadoPor', pessoa_ref(v.enviado_por), 'atualizadoEm', v.enviado_em, 'linhaVersao', m.versao,
    'usos', (select count(*) from documentos_gerados g where g.modelo_versao_id = v.id),
    'anteriores', coalesce((select jsonb_agg(jsonb_build_object('numero', a.numero, 'versaoId', a.id, 'nomeArquivo', a.nome_arquivo,
                                                                'enviadoPor', pessoa_ref(a.enviado_por), 'enviadoEm', a.enviado_em,
                                                                'usos', (select count(*) from documentos_gerados g where g.modelo_versao_id = a.id))
                                            order by a.numero desc)
                              from documento_modelo_versoes a where a.modelo_id = m.id and a.id <> v.id), '[]'::jsonb))
    from documento_modelo_versoes v where v.modelo_id = m.id order by v.numero desc limit 1
$$;

create function portal_documento_modelos(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform documento_entrar(p_pessoa, p_escritorio, false);
  return jsonb_build_object(
    'modelos', coalesce((select jsonb_agg(documento_modelo_linha(m) order by m.tipo = 'OUTRO', m.ordem) from documento_modelos m
                          where m.escritorio_id = p_escritorio and m.arquivado_em is null), '[]'::jsonb),
    'usosPadrao', coalesce((select jsonb_object_agg(modelo_padrao, n) from (
                              select modelo_padrao, count(*) n from documentos_gerados where escritorio_id = p_escritorio and modelo_padrao is not null
                               group by modelo_padrao) u), '{}'::jsonb),
    'podeEnviar', pode(p_pessoa, p_escritorio, 'contratos.editar') and contrato_situacao(p_escritorio) in ('ABERTO', 'MARCADO'));
end $$;

-- Enviar modelo novo (p_modelo nulo) ou versão nova (a anterior fica, decisão 5). Modelo novo de
-- contrato, procuração ou declaração arquiva o que estava valendo do mesmo tipo (troca o modelo;
-- os gerados com ele continuam como estavam). p_conferido vem da API, que leu o arquivo:
-- { versaoId, arquivo, tamanho, campos, desconhecidos, paragrafos }.
create function portal_documento_modelo_enviar(p_pessoa uuid, p_escritorio uuid, p_modelo uuid, p_dados jsonb, p_conferido jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  m documento_modelos;
  e jsonb := '{}'::jsonb;
  v_nome text := btrim(coalesce(p_dados ->> 'nome', ''));
  v_tipo text := upper(coalesce(p_dados ->> 'tipo', ''));
  v_n integer;
  v_antes documento_modelos;
begin
  perform documento_entrar(p_pessoa, p_escritorio, true);
  if p_modelo is null then
    if length(v_nome) not between 3 and 120 then e := e || '{"nome": "NOME_OBRIGATORIO"}'; end if;
    if not documento_tipo_valido(v_tipo) then e := e || '{"tipo": "TIPO_INVALIDO"}'; end if;
    if e <> '{}'::jsonb then perform peticao_recusar(e, 'Confira os dados do modelo'); end if;
    if v_tipo <> 'OUTRO' then
      select * into v_antes from documento_modelos where escritorio_id = p_escritorio and tipo = v_tipo and arquivado_em is null for update;
      if v_antes.id is not null then
        update documento_modelos set arquivado_em = app_now(), arquivado_por = p_pessoa, motivo_arquivo = 'Trocado por um modelo novo'
         where id = v_antes.id;
      end if;
    end if;
    insert into documento_modelos (escritorio_id, tipo, nome, criado_por) values (p_escritorio, v_tipo, v_nome, p_pessoa) returning * into m;
    v_n := 1;
  else
    select * into m from documento_modelos where id = p_modelo and escritorio_id = p_escritorio and arquivado_em is null for update;
    if m.id is null then raise exception 'Modelo não encontrado' using errcode = 'TC404'; end if;
    v_n := (select max(numero) + 1 from documento_modelo_versoes where modelo_id = m.id);
  end if;
  insert into documento_modelo_versoes (id, escritorio_id, modelo_id, numero, nome_arquivo, tamanho, campos, desconhecidos, paragrafos, enviado_por)
  values ((p_conferido ->> 'versaoId')::uuid, p_escritorio, m.id, v_n, p_conferido ->> 'arquivo', (p_conferido ->> 'tamanho')::integer,
          array(select jsonb_array_elements_text(p_conferido -> 'campos')),
          array(select jsonb_array_elements_text(p_conferido -> 'desconhecidos')),
          array(select jsonb_array_elements_text(p_conferido -> 'paragrafos')), p_pessoa);
  perform registrar_historico(case when v_n = 1 and v_antes.id is null then 'documento.modelo_enviado' else 'documento.modelo_trocado' end,
    'documento_modelos', m.id::text,
    jsonb_build_object('tipo', m.tipo, 'versao', v_n, 'antes', case when v_antes.id is not null then v_antes.id end));
  return documento_modelo_linha(m);
end $$;

-- Arquivar: o documento volta a usar o padrão do T3jus (o "outro" some da hora de gerar).
create function portal_documento_modelo_arquivar(p_pessoa uuid, p_escritorio uuid, p_modelo uuid, p_versao integer, p_motivo text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare m documento_modelos;
begin
  perform documento_entrar(p_pessoa, p_escritorio, true);
  select * into m from documento_modelos where id = p_modelo and escritorio_id = p_escritorio and arquivado_em is null for update;
  if m.id is null then raise exception 'Modelo não encontrado' using errcode = 'TC404'; end if;
  if m.versao <> p_versao then perform conflito_versao('documento_modelos', m.id); end if;
  if length(btrim(coalesce(p_motivo, ''))) not between 3 and 300 then perform peticao_recusar('{"motivo": "MOTIVO_OBRIGATORIO"}'); end if;
  update documento_modelos set arquivado_em = app_now(), arquivado_por = p_pessoa, motivo_arquivo = btrim(p_motivo) where id = m.id;
  perform registrar_historico('documento.modelo_arquivado', 'documento_modelos', m.id::text, jsonb_build_object('tipo', m.tipo));
  return jsonb_build_object('id', m.id, 'arquivado', true);
end $$;

-- Baixar um modelo do escritório: a versão mais nova, ou a pedida (versões anteriores).
create function portal_documento_modelo_arquivo(p_pessoa uuid, p_escritorio uuid, p_modelo uuid, p_versao integer default null) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v documento_modelo_versoes;
begin
  perform documento_entrar(p_pessoa, p_escritorio, false);
  select v2.* into v from documento_modelo_versoes v2 join documento_modelos m on m.id = v2.modelo_id
   where m.id = p_modelo and m.escritorio_id = p_escritorio and (p_versao is null or v2.numero = p_versao)
   order by v2.numero desc limit 1;
  if v.id is null then raise exception 'Modelo não encontrado' using errcode = 'TC404'; end if;
  return jsonb_build_object('versaoId', v.id, 'nome', v.nome_arquivo);
end $$;

call fechar_acesso();
