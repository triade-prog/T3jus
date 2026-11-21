-- Avisos novos no sino (F3.86, PA-06; F3.80, FI-23). Desenhos aprovados em
-- docs/design/aprovadas/portal-gatilhos-novos (decisão 10, pergunta 7) e
-- docs/design/aprovadas/portal-carne (decisões 9 e 12).
--
-- - DOCUMENTO_CHEGOU: o cliente mandou um arquivo pela conversa e tem documento pedido em
--   aberto. Quem pediu recebe o aviso para conferir e marcar "Já chegou". O pedido não se fecha
--   sozinho: a IA não sabe se a foto é o documento certo.
-- - CARNE_DESATUALIZADO: uma parcela do último carnê do contrato mudou (vencimento, valor ou
--   cancelada) ou a chave Pix do escritório foi trocada. Avisa quem gerou o carnê e o responsável
--   do contrato, uma vez por carnê (até alguém gerar de novo).
-- - PEDIDO_CHAVE_PIX: quem gera carnês e não é dono pede à sócia dona que cadastre a chave Pix.

do $$
declare v_tipos text[]; v_origens text[];
begin
  select array_agg(distinct x) into v_tipos from (
    select unnest(regexp_matches(pg_get_constraintdef(oid), '''([A-Z0-9_]+)''', 'g')) x
      from pg_constraint where conrelid = 'avisos_sino'::regclass and conname = 'avisos_sino_tipo_check'
    union select unnest(array['DOCUMENTO_CHEGOU', 'CARNE_DESATUALIZADO', 'PEDIDO_CHAVE_PIX'])) t;
  select array_agg(distinct x) into v_origens from (
    select unnest(regexp_matches(pg_get_constraintdef(oid), '''([a-z0-9_]+)''', 'g')) x
      from pg_constraint where conrelid = 'avisos_sino'::regclass and conname = 'avisos_sino_origem_tabela_check'
    union select unnest(array['conversas', 'contratos', 'escritorios'])) t;
  alter table avisos_sino drop constraint avisos_sino_tipo_check;
  execute format('alter table avisos_sino add constraint avisos_sino_tipo_check check (tipo in (%s))',
                 (select string_agg(quote_literal(x), ', ' order by x) from unnest(v_tipos) x));
  alter table avisos_sino drop constraint avisos_sino_origem_tabela_check;
  execute format('alter table avisos_sino add constraint avisos_sino_origem_tabela_check check (origem_tabela in (%s))',
                 (select string_agg(quote_literal(x), ', ' order by x) from unnest(v_origens) x));
end $$;

-- ------------------------------------------------------------------ F3.86: arquivo na conversa

-- Um aviso por pessoa que pediu documento ao cliente. Se ela ainda não leu o aviso anterior da
-- mesma conversa, não chega outro a cada foto.
create function avisos_sino_arquivo_do_cliente() returns trigger
language plpgsql
set search_path = public
as $$
declare
  c conversas;
  r record;
begin
  select * into c from conversas where id = new.conversa_id;
  if c.cliente_id is null then return null; end if;
  for r in
    select d.pedido_por,
           string_agg(d.descricao, ', ' order by d.pedido_em, d.criado_em) documentos,
           count(*) quantos,
           (array_agg(k.nome order by d.pedido_em, d.criado_em))[1] caso,
           count(distinct d.caso_id) casos
      from documento_pedidos d join casos k on k.id = d.caso_id
     where d.escritorio_id = new.escritorio_id and d.cliente_id = c.cliente_id and d.chegou_em is null
     group by d.pedido_por
  loop
    if not exists (select 1 from avisos_sino a
                    where a.escritorio_id = new.escritorio_id and a.pessoa_id = r.pedido_por and a.tipo = 'DOCUMENTO_CHEGOU'
                      and a.origem_id = c.id and a.lido_em is null) then
      perform aviso_sino(new.escritorio_id, r.pedido_por, null, 'DOCUMENTO_CHEGOU', 'conversas', c.id, jsonb_build_object(
        'conversa', conversa_nome(c),
        'contato', case when c.nome_contato is distinct from conversa_nome(c) then c.nome_contato end,
        'arquivo', left(new.anexo ->> 'nome', 200),
        'texto', left(r.documentos, 300),
        'quantos', r.quantos,
        'caso', case when r.casos = 1 then r.caso end));
    end if;
  end loop;
  return null;
end $$;
create trigger avisos_sino_arquivo_do_cliente after insert on conversa_mensagens
  for each row when (new.autor = 'CLIENTE' and new.anexo is not null) execute function avisos_sino_arquivo_do_cliente();

-- ------------------------------------------------------------------ F3.80: carnê desatualizado

-- O último carnê de um contrato vigente que já não confere: avisa quem gerou e o responsável do
-- contrato (nunca quem fez a mudança), uma vez para cada carnê.
create function carne_avisar_desatualizado(k carnes, p_autor uuid, p_motivo text, p_parcela text) returns void
language plpgsql
set search_path = public
as $$
declare
  c contratos;
  v_pessoa uuid;
begin
  if k.id is null or jsonb_array_length(carne_mudancas(k)) = 0 then return; end if;
  select * into c from contratos where id = k.contrato_id;
  if c.estado <> 'ATIVO' then return; end if;
  foreach v_pessoa in array array[k.gerado_por, c.responsavel_id] loop
    if not exists (select 1 from avisos_sino a
                    where a.escritorio_id = k.escritorio_id and a.pessoa_id = v_pessoa and a.tipo = 'CARNE_DESATUALIZADO'
                      and a.dados ->> 'carne' = k.id::text) then
      perform aviso_sino(k.escritorio_id, v_pessoa, p_autor, 'CARNE_DESATUALIZADO', 'contratos', c.id, jsonb_build_object(
        'carne', k.id,
        'cliente', (select nome from clientes_escritorio where id = c.cliente_id),
        'contrato', c.numero,
        'motivo', p_motivo,
        'parcela', p_parcela,
        'quem', (select nome from pessoas where id = p_autor),
        'gerado', k.gerado_em,
        'gerou', v_pessoa = k.gerado_por));
    end if;
  end loop;
end $$;

create function carne_ultimo(p_contrato uuid) returns carnes
language sql stable
set search_path = public
as $$ select * from carnes where contrato_id = p_contrato order by gerado_em desc, id desc limit 1 $$;

create function avisos_sino_parcela_do_carne() returns trigger
language plpgsql
set search_path = public
as $$
declare k carnes := carne_ultimo(new.contrato_id);
begin
  if k.id is null or not exists (select 1 from carne_parcelas cp where cp.carne_id = k.id and cp.recebimento_id = new.id) then
    return null;
  end if;
  perform carne_avisar_desatualizado(k, contexto_pessoa(),
    case when new.cancelado_em is not null and old.cancelado_em is null then 'CANCELADA'
         when new.vencimento <> old.vencimento then 'VENCIMENTO' else 'VALOR' end,
    new.descricao);
  return null;
end $$;
create trigger avisos_sino_parcela_do_carne after update on recebimentos_previstos
  for each row when (new.cancelado_em is distinct from old.cancelado_em or new.vencimento is distinct from old.vencimento
                     or new.valor is distinct from old.valor)
  execute function avisos_sino_parcela_do_carne();

create function avisos_sino_chave_do_carne() returns trigger
language plpgsql
set search_path = public
as $$
declare k carnes;
begin
  for k in
    select u.* from (select distinct contrato_id from carnes where escritorio_id = new.escritorio_id and pix_chave is not null) x
      cross join lateral carne_ultimo(x.contrato_id) u
     where u.pix_chave is not null
  loop
    perform carne_avisar_desatualizado(k, new.atualizado_por, 'CHAVE_PIX', null);
  end loop;
  return null;
end $$;
create trigger avisos_sino_chave_do_carne after update on escritorio_recebimento
  for each row when (new.pix_chave is distinct from old.pix_chave or new.recebedor_nome is distinct from old.recebedor_nome
                     or new.cidade is distinct from old.cidade)
  execute function avisos_sino_chave_do_carne();

-- ------------------------------------------------------------------ F3.80: pedir a chave Pix

-- Quem gera carnê e não é dono pede a chave à sócia dona. Um pedido ainda não lido por ela vale:
-- pedir de novo não manda outro aviso.
create function portal_recebimento_pedir(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dona uuid := peticao_socio_dono(p_escritorio);
  v_contrato uuid;
  v_ja boolean;
  c contratos;
begin
  perform carne_entrar(p_pessoa, p_escritorio, upper(coalesce(p_dados ->> 'area', '')), true);
  if v_dona is null or v_dona = p_pessoa then
    perform recusar_motivo('Quem é dono cadastra a chave em Escritório › Recebimento', 'E_DONO');
  end if;
  if exists (select 1 from escritorio_recebimento e where e.escritorio_id = p_escritorio and e.pix_chave is not null) then
    raise exception 'O escritório já tem chave Pix' using errcode = 'TC422', detail = jsonb_build_object('motivo', 'JA_TEM_CHAVE')::text;
  end if;
  if p_dados ? 'contratoId' then
    begin v_contrato := (p_dados ->> 'contratoId')::uuid;
    exception when invalid_text_representation then perform recusar_campos('Contrato inválido', 'contratoId'); end;
    c := carne_contrato(p_escritorio, v_contrato);
  end if;
  v_ja := exists (select 1 from avisos_sino a
                   where a.escritorio_id = p_escritorio and a.pessoa_id = v_dona and a.tipo = 'PEDIDO_CHAVE_PIX'
                     and a.dados ->> 'por' = p_pessoa::text and a.lido_em is null);
  if not v_ja then
    perform aviso_sino(p_escritorio, v_dona, p_pessoa, 'PEDIDO_CHAVE_PIX', 'escritorios', p_escritorio, jsonb_build_object(
      'por', p_pessoa,
      'quem', (select nome from pessoas where id = p_pessoa),
      'cliente', (select nome from clientes_escritorio where id = c.cliente_id),
      'contrato', c.numero));
  end if;
  return jsonb_build_object('para', pessoa_ref(v_dona), 'jaPedido', v_ja);
end $$;

-- A janela "Gerar carnê" sabe se o pedido já saiu e ela ainda não leu.
alter function portal_carne_opcoes(uuid, uuid, uuid, text) rename to carne_opcoes_sem_pedido;
create function portal_carne_opcoes(p_pessoa uuid, p_escritorio uuid, p_contrato uuid, p_area text) returns jsonb
language sql
security definer
set search_path = public
as $$
  select carne_opcoes_sem_pedido(p_pessoa, p_escritorio, p_contrato, p_area) || jsonb_build_object('chavePedida', exists (
    select 1 from avisos_sino a
     where a.escritorio_id = p_escritorio and a.tipo = 'PEDIDO_CHAVE_PIX' and a.dados ->> 'por' = p_pessoa::text and a.lido_em is null))
$$;

call fechar_acesso();
