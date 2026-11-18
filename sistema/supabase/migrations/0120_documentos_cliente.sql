-- Contrato e documentos do escritório cliente na ficha do Console (CO-05), pedidos pela Carol
-- em 18/11/2026. O arquivo fica no Storage, num bucket privado; aqui fica o registro: quem
-- enviou, quando, o tipo e o tamanho. Nada se apaga (guardar tudo). O escritório não vê
-- estes anexos: são da relação dele com a T3jus (CO-03).
--
-- O envio é em duas etapas, porque o arquivo vai direto do navegador para o Storage: a API
-- registra o anexo (ENVIANDO) e devolve um endereço de envio de uso único; depois de o
-- arquivo chegar, a API confere o tamanho e o tipo no Storage e conclui (PRONTO).

create type situacao_documento as enum ('ENVIANDO', 'PRONTO');

create table documentos_cliente (
  id            uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorios (id) on delete restrict,
  categoria     text not null check (categoria in ('CONTRATO_ASSINADO', 'PROPOSTA', 'DOCUMENTO_ESCRITORIO', 'OUTRO')),
  nome          text not null check (length(btrim(nome)) between 1 and 200 and nome !~ '[/\\]'),
  tipo          text not null check (tipo in ('application/pdf', 'image/jpeg', 'image/png')),
  tamanho       integer not null check (tamanho between 1 and 10485760),
  situacao      situacao_documento not null default 'ENVIANDO',
  enviado_por   uuid not null references pessoas (id) on delete restrict,
  criado_em     timestamptz not null default app_now(),
  concluido_em  timestamptz,
  check ((situacao = 'PRONTO') = (concluido_em is not null))
);
create index documentos_cliente_escritorio_idx on documentos_cliente (escritorio_id, criado_em);
call proteger_tabela_interna('documentos_cliente', 'Contrato e documentos do cliente com a T3jus; o cliente não vê (CO-03, CO-05)');

-- Guardar tudo: não se apaga, e a única mudança é ENVIANDO → PRONTO.
create function documento_so_conclui() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Documento não se apaga' using errcode = 'TC023';
  end if;
  if old.situacao <> 'ENVIANDO' or new.situacao <> 'PRONTO'
     or (new.id, new.escritorio_id, new.categoria, new.nome, new.tipo, new.tamanho, new.enviado_por, new.criado_em)
        is distinct from (old.id, old.escritorio_id, old.categoria, old.nome, old.tipo, old.tamanho, old.enviado_por, old.criado_em) then
    raise exception 'Documento só muda de enviando para pronto' using errcode = 'TC023';
  end if;
  return new;
end $$;
create trigger documento_so_conclui before update or delete on documentos_cliente
  for each row execute function documento_so_conclui();

insert into funcao_acoes (funcao, acao) values
  ('ADMINISTRACAO', 'console.documentos.ver'),
  ('ADMINISTRACAO', 'console.documentos.enviar'),
  ('IMPLANTACAO', 'console.documentos.ver'),
  ('IMPLANTACAO', 'console.documentos.enviar'),
  ('FINANCEIRO', 'console.documentos.ver'),
  ('SUPORTE', 'console.documentos.ver');

-- Mesmo prazo que a Carol aprovou para as notas internas (0090), a outra tabela interna do
-- cliente: os anexos são da relação com a T3jus e podem citar pessoas.
insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('documentos_cliente', true, 'Contrato e documentos do escritório cliente (o arquivo fica no Storage), com quem enviou e quando',
  'Guardar o contrato e os documentos da relação com o cliente', 'Execução do contrato (LGPD, art. 7º, V)', 'T3jus',
  'Enquanto o escritório for cliente e 5 anos depois do fim do contrato', 'Apagados, com o arquivo', 'APROVADO', false);

-- Lista (só os prontos), do mais novo ao mais antigo.
create function console_documentos(p_pessoa uuid, p_escritorio uuid)
returns table (id uuid, categoria text, nome text, tipo text, tamanho integer, enviado_por uuid, enviado_por_nome text, concluido_em timestamptz)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'console.documentos.ver');
  return query
    select d.id, d.categoria, d.nome, d.tipo, d.tamanho, d.enviado_por, p.nome, d.concluido_em
      from documentos_cliente d left join pessoas p on p.id = d.enviado_por
     where d.situacao = 'PRONTO'
     order by d.concluido_em desc, d.id;
end $$;

-- Registrar o envio: devolve o id, que vira o nome do arquivo no Storage (<escritório>/<id>).
create function console_documento_iniciar(p_pessoa uuid, p_escritorio uuid, p_categoria text, p_nome text, p_tipo text, p_tamanho integer)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'console.documentos.enviar');
  begin
    insert into documentos_cliente (escritorio_id, categoria, nome, tipo, tamanho, enviado_por)
    values (p_escritorio, p_categoria, btrim(p_nome), p_tipo, p_tamanho, p_pessoa)
    returning id into v_id;
  exception when check_violation or not_null_violation then
    perform recusar_campos('Arquivo não aceito', 'arquivo');
  end;
  return v_id;
end $$;

-- Concluir: a API já conferiu no Storage que o arquivo chegou com o tamanho e o tipo
-- registrados. Só quem iniciou conclui.
create function console_documento_concluir(p_pessoa uuid, p_escritorio uuid, p_documento uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
declare v record;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'console.documentos.enviar');
  select * into v from documentos_cliente where id = p_documento and enviado_por = p_pessoa;
  if v.id is null then
    raise exception 'Documento não encontrado' using errcode = 'TC404';
  end if;
  if v.situacao = 'PRONTO' then
    return;
  end if;
  update documentos_cliente set situacao = 'PRONTO', concluido_em = app_now() where id = p_documento;
  perform registrar_historico_interno('documento.anexado', 'documento_cliente', p_documento::text,
                                      jsonb_build_object('categoria', v.categoria, 'tipo', v.tipo, 'tamanho', v.tamanho));
end $$;

-- O documento a envia (registrado, ainda não pronto), para a API conferir no Storage.
create function console_documento_para_concluir(p_pessoa uuid, p_escritorio uuid, p_documento uuid)
returns table (tipo text, tamanho integer)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'console.documentos.enviar');
  return query select d.tipo, d.tamanho from documentos_cliente d where d.id = p_documento and d.enviado_por = p_pessoa;
  if not found then
    raise exception 'Documento não encontrado' using errcode = 'TC404';
  end if;
end $$;

-- Abrir: confere a permissão e devolve o nome (para o download); a API gera o link
-- temporário. Cada abertura fica no histórico interno.
create function console_documento_abrir(p_pessoa uuid, p_escritorio uuid, p_documento uuid) returns text
language plpgsql
security definer
set search_path = public
as $$
declare v_nome text;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'console.documentos.ver');
  select nome into v_nome from documentos_cliente where id = p_documento and situacao = 'PRONTO';
  if v_nome is null then
    raise exception 'Documento não encontrado' using errcode = 'TC404';
  end if;
  perform registrar_historico_interno('documento.aberto', 'documento_cliente', p_documento::text, '{}'::jsonb);
  return v_nome;
end $$;

call fechar_acesso();
