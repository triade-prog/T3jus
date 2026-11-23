-- Jornada do cliente, parte 4a (F3.131; AP-08, EX-18), pelo desenho aprovado em
-- docs/design/aprovadas/portal-jornada-fechamento (grupo 9, decisões 34 a 42):
-- 1. Documentos pessoais do cliente (AP-08): RG e CPF, CNH, comprovante de residência e as
--    certidões ficam na ficha do cliente e servem a todos os casos dele. O arquivo vai ao mesmo
--    bucket privado do Portal (documentos-portal), com o envio em duas etapas de Documentos do caso
--    (0270). Nada se apaga: anexar um novo guarda o anterior e aponta para ele (substituido_por).
--    Quem vê a ficha vê os documentos; quem edita o cliente anexa (pergunta 10).
-- 2. O comprovante de residência vence pela data que está no papel: passou do prazo do escritório
--    (padrão 90 dias, pergunta 7), sobe para "Precisa de atenção".
-- 3. A lista por área (EX-18): o que cada área pede para começar o processo. Só a sócia dona edita
--    (como as etapas do escritório, juridico.etapas.editar); a equipe com Jurídico vê. A sugestão
--    do T3jus é fixa aqui e é copiada para o escritório em "Usar a sugestão do T3jus".
-- 4. Os pedidos de documento ganham o tipo pessoal, o item da lista, se nasceram na abertura do
--    caso e, quando a ficha já tinha o documento, qual foi (a parte 4b usa na abertura do caso).

-- ---------------------------------------------------------------------------------------
-- O prazo do comprovante (muda em Ajustes do escritório, quando a tela existir).
alter table escritorios add column comprovante_validade_dias integer not null default 90
  check (comprovante_validade_dias between 30 and 365);

create function tipo_documento_pessoal_valido(p text) returns boolean
language sql immutable
as $$ select p in ('RG_CPF', 'CNH', 'COMPROVANTE_RESIDENCIA', 'CERTIDAO_CASAMENTO', 'CERTIDAO_NASCIMENTO', 'CERTIDAO_OBITO', 'OUTRO') $$;

-- Os tipos de que a ficha guarda um só em uso: anexar outro substitui o anterior.
create function tipo_documento_pessoal_unico(p text) returns boolean
language sql immutable
as $$ select p in ('RG_CPF', 'CNH', 'COMPROVANTE_RESIDENCIA', 'CERTIDAO_CASAMENTO', 'CERTIDAO_NASCIMENTO') $$;

-- ---------------------------------------------------------------------------------------
-- 1. Documentos pessoais.
create table cliente_documentos (
  id              uuid primary key default gen_random_uuid(),
  escritorio_id   uuid not null references escritorios (id) on delete restrict,
  cliente_id      uuid not null references clientes_escritorio (id) on delete restrict,
  tipo            text not null check (tipo_documento_pessoal_valido(tipo)),
  descricao       text check (descricao is null or length(btrim(descricao)) between 3 and 160),
  data_documento  date,
  nome            text not null check (length(btrim(nome)) between 1 and 200 and nome !~ '[/\\]'),
  arquivo_tipo    text not null check (arquivo_tipo in ('application/pdf', 'image/jpeg', 'image/png')),
  tamanho         integer not null check (tamanho between 1 and 10485760),
  fotos           smallint check (fotos between 2 and 10),
  pedido_id       uuid references documento_pedidos (id) on delete restrict,
  substitui_id    uuid references cliente_documentos (id) on delete restrict,
  substituido_por uuid references cliente_documentos (id) on delete restrict,
  situacao        situacao_documento not null default 'ENVIANDO',
  enviado_por     uuid not null references pessoas (id) on delete restrict,
  criado_em       timestamptz not null default app_now(),
  concluido_em    timestamptz,
  check ((situacao = 'PRONTO') = (concluido_em is not null)),
  check (tipo <> 'OUTRO' or descricao is not null),
  check (tipo <> 'COMPROVANTE_RESIDENCIA' or data_documento is not null)
);
create index cliente_documentos_cliente on cliente_documentos (cliente_id, concluido_em desc) where situacao = 'PRONTO';
create index cliente_documentos_escritorio on cliente_documentos (escritorio_id, criado_em);
call proteger_tabela_escritorio('cliente_documentos');

-- Guardar tudo: não se apaga; muda só de enviando para pronto e, depois, ganha quem o substituiu.
create function cliente_documento_guarda() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Documento não se apaga' using errcode = 'TC023';
  end if;
  if (new.id, new.escritorio_id, new.cliente_id, new.tipo, new.descricao, new.data_documento, new.nome, new.arquivo_tipo, new.tamanho,
      new.fotos, new.pedido_id, new.substitui_id, new.enviado_por, new.criado_em)
     is distinct from (old.id, old.escritorio_id, old.cliente_id, old.tipo, old.descricao, old.data_documento, old.nome, old.arquivo_tipo, old.tamanho,
      old.fotos, old.pedido_id, old.substitui_id, old.enviado_por, old.criado_em)
     or not ((old.situacao = 'ENVIANDO' and new.situacao = 'PRONTO' and new.substituido_por is not distinct from old.substituido_por)
             or (old.situacao = 'PRONTO' and new.situacao = 'PRONTO' and old.substituido_por is null and new.substituido_por is not null
                 and new.concluido_em = old.concluido_em)) then
    raise exception 'Documento pessoal só muda de enviando para pronto, e ao ser substituído' using errcode = 'TC023';
  end if;
  return new;
end $$;
create trigger cliente_documento_guarda before update or delete on cliente_documentos
  for each row execute function cliente_documento_guarda();

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('cliente_documentos', true, 'Documentos pessoais do cliente (RG e CPF, CNH, comprovante de residência, certidões); o arquivo fica no Storage, com a data do papel, quem anexou e quando',
  'Ter à mão os documentos que todo caso do cliente pede (AP-08)', 'Execução de contrato (LGPD, art. 7º, V) e exercício regular de direitos (art. 7º, VI)',
  'Escritório', 'Enquanto o escritório for cliente do T3jus e 5 anos depois do fim do contrato', 'Exportados ao escritório e apagados com ele, com o arquivo', 'APROVADO', true);

-- O documento na tela: o vencido é o comprovante com a data do papel além do prazo.
create function cliente_documento_linha(d cliente_documentos) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', d.id, 'tipo', d.tipo, 'descricao', d.descricao, 'dataDocumento', d.data_documento,
    'nome', d.nome, 'arquivoTipo', d.arquivo_tipo, 'tamanho', d.tamanho, 'fotos', d.fotos,
    'enviadoPor', pessoa_ref(d.enviado_por), 'enviadoEm', d.concluido_em,
    'dias', case when d.data_documento is not null then hoje_brasilia() - d.data_documento end,
    'vencido', d.tipo = 'COMPROVANTE_RESIDENCIA'
               and hoje_brasilia() - d.data_documento > (select e.comprovante_validade_dias from escritorios e where e.id = d.escritorio_id),
    'anteriores', (with recursive a as (select x.* from cliente_documentos x where x.substituido_por = d.id
                                        union all select x.* from cliente_documentos x join a on x.substituido_por = a.id)
                   select count(*) from a))
$$;

-- Os documentos em uso do cliente (prontos e não substituídos).
create function cliente_documentos_em_uso(p_escritorio uuid, p_cliente uuid) returns setof cliente_documentos
language sql stable
set search_path = public
as $$
  select * from cliente_documentos
   where escritorio_id = p_escritorio and cliente_id = p_cliente and situacao = 'PRONTO' and substituido_por is null
$$;

-- ---------------------------------------------------------------------------------------
-- 4. Os pedidos de documento ganham o que a abertura do caso precisa (0270 guarda o resto).
create table documentos_inicio (
  id            uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorios (id) on delete restrict,
  area          text not null check (area_direito_valida(area) and area <> 'OUTRA'),
  ordem         integer not null check (ordem between 1 and 30),
  nome          text not null check (length(btrim(nome)) between 3 and 80),
  como_pedir    text check (como_pedir is null or length(btrim(como_pedir)) between 3 and 300),
  pessoal       text check (pessoal is null or tipo_documento_pessoal_valido(pessoal)),
  se_houver     boolean not null default false,
  versao        integer not null default 1,
  criado_por    uuid not null references pessoas (id) on delete restrict,
  criado_em     timestamptz not null default app_now(),
  removido_em   timestamptz,
  removido_por  uuid references pessoas (id) on delete restrict,
  check ((removido_em is null) = (removido_por is null))
);
create index documentos_inicio_area on documentos_inicio (escritorio_id, area, ordem) where removido_em is null;
call proteger_tabela_escritorio('documentos_inicio');

create function documentos_inicio_sem_apagar() returns trigger
language plpgsql
as $$
begin
  raise exception 'Item da lista não se apaga: tire da lista' using errcode = 'TC023';
end $$;
create trigger documentos_inicio_sem_apagar before delete on documentos_inicio
  for each row execute function documentos_inicio_sem_apagar();

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('documentos_inicio', false, 'A lista de documentos que cada área do escritório pede para começar o processo, com o texto para o cliente',
  null, null, null, null, null, null, true);

alter table documento_pedidos add column tipo_pessoal text check (tipo_pessoal is null or tipo_documento_pessoal_valido(tipo_pessoal));
alter table documento_pedidos add column item_id uuid references documentos_inicio (id) on delete restrict;
alter table documento_pedidos add column inicio boolean not null default false;
alter table documento_pedidos add column da_ficha_id uuid references cliente_documentos (id) on delete restrict;

-- O pedido continua sem se apagar; o que nasce com ele (tipo, item, início e o da ficha) não muda.
create or replace function documento_pedido_guarda() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Pedido de documento não se apaga' using errcode = 'TC023';
  end if;
  if old.chegou_em is not null
     or (new.id, new.escritorio_id, new.caso_id, new.descricao, new.cliente_id, new.pedido_em, new.pedido_por, new.criado_em,
         new.tipo_pessoal, new.item_id, new.inicio, new.da_ficha_id)
        is distinct from (old.id, old.escritorio_id, old.caso_id, old.descricao, old.cliente_id, old.pedido_em, old.pedido_por, old.criado_em,
         old.tipo_pessoal, old.item_id, old.inicio, old.da_ficha_id) then
    raise exception 'Pedido de documento só muda ao pedir de novo ou ao chegar' using errcode = 'TC023';
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------------------
-- 1. A folha "Documentos pessoais" e o envio.
create function portal_cliente_documentos(p_pessoa uuid, p_escritorio uuid, p_cliente uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare c clientes_escritorio;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.ver');
  select * into c from clientes_escritorio where id = p_cliente and escritorio_id = p_escritorio;
  if c.id is null or c.estado = 'EXCLUIDO' then raise exception 'Cliente não encontrado' using errcode = 'TC404'; end if;
  return jsonb_build_object(
    'hoje', hoje_brasilia(),
    'validadeDias', (select e.comprovante_validade_dias from escritorios e where e.id = p_escritorio),
    'podeAnexar', c.estado = 'ATIVO' and pode(p_pessoa, p_escritorio, 'clientes.editar'),
    'documentos', coalesce((select jsonb_agg(cliente_documento_linha(d) order by d.concluido_em desc, d.id)
                              from cliente_documentos_em_uso(p_escritorio, p_cliente) d), '[]'::jsonb),
    -- Os pedidos de documento pessoal abertos nos casos em andamento (o anexo pode atender).
    'pedidos', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'tipoPessoal', p.tipo_pessoal, 'descricao', p.descricao,
                            'pedidoEm', p.pedido_em, 'caso', jsonb_build_object('id', ca.id, 'nome', ca.nome)) order by p.pedido_em, p.criado_em)
                           from documento_pedidos p join casos ca on ca.id = p.caso_id
                          where p.cliente_id = p_cliente and p.escritorio_id = p_escritorio and p.chegou_em is null
                            and p.tipo_pessoal is not null and ca.situacao = 'ANDAMENTO'), '[]'::jsonb));
end $$;

-- Registrar o envio: devolve o id, que vira o nome do arquivo no Storage (<escritório>/<id>).
create function portal_cliente_documento_iniciar(p_pessoa uuid, p_escritorio uuid, p_cliente uuid, p_dados jsonb) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  c clientes_escritorio;
  e text[] := '{}';
  v_tipo text := p_dados ->> 'tipo';
  v_desc text := nullif(btrim(coalesce(p_dados ->> 'descricao', '')), '');
  v_data date;
  v_sub uuid;
  v_pedido uuid;
  v_id uuid;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.editar');
  select * into c from clientes_escritorio where id = p_cliente and escritorio_id = p_escritorio;
  if c.id is null or c.estado = 'EXCLUIDO' then raise exception 'Cliente não encontrado' using errcode = 'TC404'; end if;
  if c.estado <> 'ATIVO' then perform recusar_motivo('O cliente não está ativo', 'CLIENTE_NAO_ATIVO'); end if;
  if not coalesce(tipo_documento_pessoal_valido(v_tipo), false) then e := e || 'tipo'::text; end if;
  if (v_tipo = 'OUTRO' and v_desc is null) or (v_desc is not null and length(v_desc) not between 3 and 160) then e := e || 'descricao'::text; end if;
  begin
    v_data := nullif(p_dados ->> 'dataDocumento', '')::date;
  exception when others then
    v_data := null;
    e := e || 'dataDocumento'::text;
  end;
  if not 'dataDocumento' = any (e) and ((v_data is null and v_tipo = 'COMPROVANTE_RESIDENCIA') or v_data > hoje_brasilia() or v_data < date '1900-01-01') then
    e := e || 'dataDocumento'::text;
  end if;
  if nullif(p_dados ->> 'substitui', '') is not null then
    begin v_sub := (p_dados ->> 'substitui')::uuid; exception when others then v_sub := null; end;
    if v_sub is null or not exists (select 1 from cliente_documentos_em_uso(p_escritorio, p_cliente) d where d.id = v_sub) then
      e := e || 'substitui'::text;
    end if;
  end if;
  if nullif(p_dados ->> 'pedidoId', '') is not null then
    begin v_pedido := (p_dados ->> 'pedidoId')::uuid; exception when others then v_pedido := null; end;
    if v_pedido is null or not exists (select 1 from documento_pedidos p join casos ca on ca.id = p.caso_id
                                        where p.id = v_pedido and p.cliente_id = p_cliente and p.chegou_em is null and ca.situacao = 'ANDAMENTO') then
      e := e || 'pedidoId'::text;
    end if;
  end if;
  if cardinality(e) > 0 then perform recusar_campos('Confira o documento.', variadic e); end if;
  begin
    insert into cliente_documentos (escritorio_id, cliente_id, tipo, descricao, data_documento, nome, arquivo_tipo, tamanho, fotos,
                                    pedido_id, substitui_id, enviado_por)
    values (p_escritorio, p_cliente, v_tipo, v_desc, v_data, btrim(p_dados ->> 'nome'), p_dados ->> 'arquivoTipo',
            (p_dados ->> 'tamanho')::integer, nullif(p_dados ->> 'fotos', '')::smallint, v_pedido, v_sub, p_pessoa)
    returning id into v_id;
  exception when check_violation or not_null_violation or invalid_text_representation or numeric_value_out_of_range then
    perform recusar_campos('Arquivo não aceito', 'arquivo');
  end;
  return v_id;
end $$;

create function portal_cliente_documento_para_concluir(p_pessoa uuid, p_escritorio uuid, p_documento uuid)
returns table (tipo text, tamanho integer)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.editar');
  return query select d.arquivo_tipo, d.tamanho from cliente_documentos d
                where d.id = p_documento and d.escritorio_id = p_escritorio and d.enviado_por = p_pessoa;
  if not found then
    raise exception 'Documento não encontrado' using errcode = 'TC404';
  end if;
end $$;

-- Concluir: a API já conferiu no Storage. O anterior do mesmo documento fica guardado e aponta
-- para o novo; o pedido do caso, se veio marcado, fecha junto (decisão 38).
create function portal_cliente_documento_concluir(p_pessoa uuid, p_escritorio uuid, p_documento uuid) returns jsonb
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
    v_ant := coalesce(d.substitui_id,
      case when tipo_documento_pessoal_unico(d.tipo) then
        (select x.id from cliente_documentos_em_uso(p_escritorio, d.cliente_id) x where x.tipo = d.tipo order by x.concluido_em desc limit 1) end);
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

-- Abrir: quem vê a ficha abre; cada abertura fica no histórico do escritório.
create function portal_cliente_documento_abrir(p_pessoa uuid, p_escritorio uuid, p_documento uuid) returns text
language plpgsql
security definer
set search_path = public
as $$
declare d cliente_documentos;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.ver');
  select * into d from cliente_documentos where id = p_documento and escritorio_id = p_escritorio and situacao = 'PRONTO';
  if d.id is null then raise exception 'Documento não encontrado' using errcode = 'TC404'; end if;
  perform registrar_historico('cliente.documento_aberto', 'cliente', d.cliente_id::text, jsonb_build_object('documento', d.id));
  return d.nome;
end $$;

-- ---------------------------------------------------------------------------------------
-- 3. A lista por área.

-- A sugestão do T3jus (decisão 42), na ordem em que vem.
create function documentos_inicio_sugestao(p_area text) returns jsonb
language sql immutable
as $$
  select coalesce(jsonb_agg(jsonb_build_object('nome', s.nome, 'comoPedir', s.como, 'pessoal', s.pessoal, 'seHouver', s.se) order by s.n), '[]'::jsonb)
    from (values
      ('PREVIDENCIARIO', 1, 'RG e CPF, ou CNH', 'Documento com foto e o CPF.', 'RG_CPF', false),
      ('PREVIDENCIARIO', 2, 'Comprovante de residência', 'Conta de luz, água ou telefone dos últimos 90 dias.', 'COMPROVANTE_RESIDENCIA', false),
      ('PREVIDENCIARIO', 3, 'Certidão de casamento ou de nascimento', 'A certidão do estado civil de hoje.', 'CERTIDAO_CASAMENTO', false),
      ('PREVIDENCIARIO', 4, 'Extrato do CNIS', 'Pelo Meu INSS. Se não conseguir, a gente ajuda.', null, false),
      ('PREVIDENCIARIO', 5, 'Carta do INSS', 'Se o pedido foi negado, a carta com o motivo.', null, true),
      ('PREVIDENCIARIO', 6, 'Laudos e exames médicos', 'Só nos pedidos por doença: os dos últimos 2 anos.', null, true),
      ('PREVIDENCIARIO', 7, 'Certidão de óbito', 'Só na pensão por morte: a de quem faleceu.', 'CERTIDAO_OBITO', true),
      ('TRABALHISTA', 1, 'RG e CPF, ou CNH', 'Documento com foto e o CPF.', 'RG_CPF', false),
      ('TRABALHISTA', 2, 'Comprovante de residência', 'Conta de luz, água ou telefone dos últimos 90 dias.', 'COMPROVANTE_RESIDENCIA', false),
      ('TRABALHISTA', 3, 'Carteira de trabalho (CTPS)', 'Foto das páginas com os contratos, ou a carteira digital.', null, false),
      ('TRABALHISTA', 4, 'Holerites', 'Os últimos que tiver, de preferência dos 12 últimos meses.', null, false),
      ('TRABALHISTA', 5, 'Termo de rescisão (TRCT)', 'O papel da rescisão, se já saiu da empresa.', null, true),
      ('TRABALHISTA', 6, 'Extrato do FGTS', 'Pelo aplicativo FGTS.', null, false),
      ('CIVEL', 1, 'RG e CPF, ou CNH', 'Documento com foto e o CPF.', 'RG_CPF', false),
      ('CIVEL', 2, 'Comprovante de residência', 'Conta de luz, água ou telefone dos últimos 90 dias.', 'COMPROVANTE_RESIDENCIA', false),
      ('CIVEL', 3, 'Contrato ou nota fiscal', 'O contrato, a nota ou o recibo do que foi comprado ou contratado.', null, false),
      ('CIVEL', 4, 'Prints e protocolos', 'Conversas, e-mails e números de protocolo do atendimento.', null, true),
      ('CONSUMIDOR', 1, 'RG e CPF, ou CNH', 'Documento com foto e o CPF.', 'RG_CPF', false),
      ('CONSUMIDOR', 2, 'Comprovante de residência', 'Conta de luz, água ou telefone dos últimos 90 dias.', 'COMPROVANTE_RESIDENCIA', false),
      ('CONSUMIDOR', 3, 'Contrato ou nota fiscal', 'O contrato, a nota ou o recibo do que foi comprado ou contratado.', null, false),
      ('CONSUMIDOR', 4, 'Prints e protocolos', 'Conversas, e-mails e números de protocolo do atendimento.', null, true),
      ('FAMILIA', 1, 'RG e CPF, ou CNH', 'Documento com foto e o CPF.', 'RG_CPF', false),
      ('FAMILIA', 2, 'Comprovante de residência', 'Conta de luz, água ou telefone dos últimos 90 dias.', 'COMPROVANTE_RESIDENCIA', false),
      ('FAMILIA', 3, 'Certidão de casamento ou de nascimento', 'A certidão do estado civil de hoje.', 'CERTIDAO_CASAMENTO', false),
      ('FAMILIA', 4, 'Certidão de nascimento dos filhos', 'A de cada filho que entra no caso.', null, true),
      ('FAMILIA', 5, 'Comprovantes de renda', 'Holerites, extrato do benefício ou declaração do imposto de renda.', null, false),
      ('FAMILIA', 6, 'Lista dos bens e dívidas', 'O que o casal tem e deve: imóveis, carros, contas, empréstimos.', null, true),
      ('SAUDE', 1, 'RG e CPF, ou CNH', 'Documento com foto e o CPF.', 'RG_CPF', false),
      ('SAUDE', 2, 'Carteirinha do plano', 'Foto da frente e do verso.', null, false),
      ('SAUDE', 3, 'Negativa do plano', 'A resposta do plano negando, por escrito ou o protocolo.', null, false),
      ('SAUDE', 4, 'Relatório médico', 'O relatório do médico pedindo o tratamento.', null, false),
      ('TRIBUTARIO', 1, 'Cartão CNPJ', 'Tirado no site da Receita Federal.', null, false),
      ('TRIBUTARIO', 2, 'Contrato social', 'O contrato social e a última alteração.', null, false),
      ('TRIBUTARIO', 3, 'Notas e guias', 'As notas fiscais e as guias pagas do período.', null, false)
    ) as s (area, n, nome, como, pessoal, se)
   where s.area = p_area
$$;

create function documento_inicio_linha(i documentos_inicio) returns jsonb
language sql stable
as $$
  select jsonb_build_object('id', i.id, 'ordem', i.ordem, 'nome', i.nome, 'comoPedir', i.como_pedir, 'pessoal', i.pessoal,
                            'seHouver', i.se_houver, 'versao', i.versao)
$$;

create function documentos_inicio_lista(p_escritorio uuid, p_area text) returns jsonb
language sql stable
set search_path = public
as $$
  select coalesce(jsonb_agg(documento_inicio_linha(i) order by i.ordem, i.criado_em), '[]'::jsonb)
    from documentos_inicio i where i.escritorio_id = p_escritorio and i.area = p_area and i.removido_em is null
$$;

-- Renumera a área de 1 em diante, sem buracos.
create function documentos_inicio_renumerar(p_escritorio uuid, p_area text) returns void
language sql
set search_path = public
as $$
  update documentos_inicio i set ordem = n.o
    from (select id, row_number() over (order by ordem, criado_em) o from documentos_inicio
           where escritorio_id = p_escritorio and area = p_area and removido_em is null) n
   where i.id = n.id and i.ordem <> n.o
$$;

create function portal_juridico_documentos_inicio(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.ver');
  return jsonb_build_object(
    'podeEditar', pode(p_pessoa, p_escritorio, 'juridico.etapas.editar'),
    'validadeDias', (select e.comprovante_validade_dias from escritorios e where e.id = p_escritorio),
    'areas', (select jsonb_agg(jsonb_build_object('area', a, 'itens', documentos_inicio_lista(p_escritorio, a), 'sugestao', documentos_inicio_sugestao(a))
                               order by o)
                from unnest(array['PREVIDENCIARIO', 'TRABALHISTA', 'CIVEL', 'CONSUMIDOR', 'FAMILIA', 'SAUDE', 'TRIBUTARIO']) with ordinality as t (a, o)));
end $$;

create function documento_inicio_erros(p_dados jsonb) returns text[]
language plpgsql immutable
as $$
declare e text[] := '{}';
begin
  if not coalesce(length(btrim(p_dados ->> 'nome')) between 3 and 80, false) then e := e || 'nome'::text; end if;
  if nullif(btrim(coalesce(p_dados ->> 'comoPedir', '')), '') is not null and length(btrim(p_dados ->> 'comoPedir')) not between 3 and 300 then
    e := e || 'comoPedir'::text;
  end if;
  if nullif(p_dados ->> 'pessoal', '') is not null and not tipo_documento_pessoal_valido(p_dados ->> 'pessoal') then e := e || 'pessoal'::text; end if;
  if jsonb_typeof(p_dados -> 'seHouver') is distinct from 'boolean' then e := e || 'seHouver'::text; end if;
  return e;
end $$;

-- Criar (p_id nulo, no fim da lista) ou editar um item, com a versão lida.
create function portal_juridico_documento_inicio_salvar(p_pessoa uuid, p_escritorio uuid, p_id uuid, p_versao integer, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e text[];
  r documentos_inicio;
  v_area text := p_dados ->> 'area';
  v_como text := nullif(btrim(coalesce(p_dados ->> 'comoPedir', '')), '');
  v_pessoal text := nullif(p_dados ->> 'pessoal', '');
  v_versao integer;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.etapas.editar');
  e := documento_inicio_erros(p_dados);
  if p_id is null then
    if not coalesce(area_direito_valida(v_area) and v_area <> 'OUTRA', false) then e := e || 'area'::text; end if;
    if cardinality(e) > 0 then perform recusar_campos('Confira o documento.', variadic e); end if;
    if (select count(*) from documentos_inicio where escritorio_id = p_escritorio and area = v_area and removido_em is null) >= 30 then
      perform recusar_motivo('Cada área pode ter até 30 documentos.', 'DOCUMENTOS_DEMAIS');
    end if;
    insert into documentos_inicio (escritorio_id, area, ordem, nome, como_pedir, pessoal, se_houver, criado_por)
    values (p_escritorio, v_area, (select coalesce(max(ordem), 0) + 1 from documentos_inicio where escritorio_id = p_escritorio and area = v_area and removido_em is null),
            btrim(p_dados ->> 'nome'), v_como, v_pessoal, (p_dados ->> 'seHouver')::boolean, p_pessoa)
    returning * into r;
    perform registrar_historico('juridico.documento_inicio_criado', 'documentos_inicio', r.id::text,
      jsonb_build_object('area', r.area, 'documento', r.nome, 'ordem', r.ordem));
    return documento_inicio_linha(r);
  end if;
  select * into r from documentos_inicio where id = p_id and escritorio_id = p_escritorio and removido_em is null;
  if r.id is null then raise exception 'Documento não encontrado' using errcode = 'TC404'; end if;
  if cardinality(e) > 0 then perform recusar_campos('Confira o documento.', variadic e); end if;
  update documentos_inicio set nome = btrim(p_dados ->> 'nome'), como_pedir = v_como, pessoal = v_pessoal, se_houver = (p_dados ->> 'seHouver')::boolean
   where id = p_id and versao = p_versao
  returning versao into v_versao;
  if v_versao is null then perform conflito_versao('documentos_inicio', p_id); end if;
  perform registrar_historico('juridico.documento_inicio_editado', 'documentos_inicio', p_id::text, jsonb_build_object(
    'area', r.area,
    'antes', jsonb_build_object('documento', r.nome, 'comoPedir', r.como_pedir, 'pessoal', r.pessoal, 'seHouver', r.se_houver),
    'depois', jsonb_build_object('documento', btrim(p_dados ->> 'nome'), 'comoPedir', v_como, 'pessoal', v_pessoal, 'seHouver', (p_dados ->> 'seHouver')::boolean)));
  select * into r from documentos_inicio where id = p_id;
  return documento_inicio_linha(r);
end $$;

-- Subir ou descer uma posição. Devolve a lista da área.
create function portal_juridico_documento_inicio_mover(p_pessoa uuid, p_escritorio uuid, p_id uuid, p_direcao text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r documentos_inicio;
  v documentos_inicio;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.etapas.editar');
  if p_direcao is null or p_direcao not in ('SOBE', 'DESCE') then perform recusar_campos('Direção inválida.', 'direcao'); end if;
  select * into r from documentos_inicio where id = p_id and escritorio_id = p_escritorio and removido_em is null;
  if r.id is null then raise exception 'Documento não encontrado' using errcode = 'TC404'; end if;
  perform documentos_inicio_renumerar(p_escritorio, r.area);
  select * into r from documentos_inicio where id = p_id;
  select * into v from documentos_inicio where escritorio_id = p_escritorio and area = r.area and removido_em is null
     and ordem = r.ordem + case when p_direcao = 'SOBE' then -1 else 1 end;
  if v.id is null then perform recusar_motivo('Este documento já está na ponta da lista.', 'DOCUMENTO_NA_PONTA'); end if;
  update documentos_inicio set ordem = case when id = r.id then v.ordem else r.ordem end where id in (r.id, v.id);
  perform registrar_historico('juridico.documento_inicio_movido', 'documentos_inicio', r.id::text,
    jsonb_build_object('area', r.area, 'documento', r.nome, 'de', r.ordem, 'para', v.ordem));
  return documentos_inicio_lista(p_escritorio, r.area);
end $$;

-- "Tirar da lista": fica guardado, fora da lista. Os casos que já abriram não mudam.
create function portal_juridico_documento_inicio_tirar(p_pessoa uuid, p_escritorio uuid, p_id uuid, p_versao integer) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r documentos_inicio;
  v_versao integer;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.etapas.editar');
  select * into r from documentos_inicio where id = p_id and escritorio_id = p_escritorio and removido_em is null;
  if r.id is null then raise exception 'Documento não encontrado' using errcode = 'TC404'; end if;
  update documentos_inicio set removido_em = app_now(), removido_por = p_pessoa where id = p_id and versao = p_versao
  returning versao into v_versao;
  if v_versao is null then perform conflito_versao('documentos_inicio', p_id); end if;
  perform documentos_inicio_renumerar(p_escritorio, r.area);
  perform registrar_historico('juridico.documento_inicio_tirado', 'documentos_inicio', r.id::text,
    jsonb_build_object('area', r.area, 'documento', r.nome));
  return documentos_inicio_lista(p_escritorio, r.area);
end $$;

-- "Usar a sugestão do T3jus": só na área ainda sem lista.
create function portal_juridico_documentos_inicio_sugestao(p_pessoa uuid, p_escritorio uuid, p_area text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.etapas.editar');
  if not coalesce(area_direito_valida(p_area) and p_area <> 'OUTRA', false) then perform recusar_campos('Escolha a área.', 'area'); end if;
  if exists (select 1 from documentos_inicio where escritorio_id = p_escritorio and area = p_area and removido_em is null) then
    perform recusar_motivo('Esta área já tem lista.', 'AREA_COM_LISTA');
  end if;
  insert into documentos_inicio (escritorio_id, area, ordem, nome, como_pedir, pessoal, se_houver, criado_por)
  select p_escritorio, p_area, s.n, s.x ->> 'nome', s.x ->> 'comoPedir', s.x ->> 'pessoal', (s.x ->> 'seHouver')::boolean, p_pessoa
    from jsonb_array_elements(documentos_inicio_sugestao(p_area)) with ordinality as s (x, n);
  perform registrar_historico('juridico.documentos_inicio_sugestao', 'documentos_inicio', p_area,
    jsonb_build_object('area', p_area, 'documentos', jsonb_array_length(documentos_inicio_sugestao(p_area))));
  return documentos_inicio_lista(p_escritorio, p_area);
end $$;

call fechar_acesso();
