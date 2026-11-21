-- 0532 · Pedidos de contrato do Comercial em Contratos (IN-01, F3.11).
-- Desenho aprovado pela Carol em 21/11/2026: docs/design/aprovadas/portal-recibo-recorrente
-- (estados pc-um, pc-dois, pc-sino, pc-vazio e pc-pedido-feito; decisões 3.1 a 3.6 e a pergunta 4).
-- - O pedido continua o de 0190 (contrato_pedido_em e contrato_pedido_por na proposta). Está
--   aberto enquanto a proposta segue aceita e nenhum contrato nasceu dela. Não se dispensa: sai só
--   quando o contrato é gerado ou quando a proposta deixa de estar aceita (pergunta 4).
-- - Ao pedir, cada pessoa com a área Contratos recebe o aviso no sino. Quando o contrato nasce da
--   proposta, quem pediu recebe o aviso "Contrato gerado".

-- O sino passa a aceitar os dois avisos novos. A lista é a que já existe mais as novas, para não
-- tirar nada que outra migration tenha posto.
do $$
declare
  v_tipos text[];
  v_origens text[];
begin
  select array_agg(distinct x) into v_tipos from (
    select unnest(regexp_matches(pg_get_constraintdef(oid), '''([A-Z0-9_]+)''', 'g')) x
      from pg_constraint where conrelid = 'avisos_sino'::regclass and conname = 'avisos_sino_tipo_check'
    union select 'PEDIDO_CONTRATO' union select 'CONTRATO_GERADO') t;
  select array_agg(distinct x) into v_origens from (
    select unnest(regexp_matches(pg_get_constraintdef(oid), '''([a-z0-9_]+)''', 'g')) x
      from pg_constraint where conrelid = 'avisos_sino'::regclass and conname = 'avisos_sino_origem_tabela_check'
    union select 'propostas') t;
  alter table avisos_sino drop constraint avisos_sino_tipo_check;
  execute format('alter table avisos_sino add constraint avisos_sino_tipo_check check (tipo in (%s))',
                 (select string_agg(quote_literal(x), ', ' order by x) from unnest(v_tipos) x));
  alter table avisos_sino drop constraint avisos_sino_origem_tabela_check;
  execute format('alter table avisos_sino add constraint avisos_sino_origem_tabela_check check (origem_tabela in (%s))',
                 (select string_agg(quote_literal(x), ', ' order by x) from unnest(v_origens) x));
end $$;

create index propostas_pedido_contrato on propostas (escritorio_id, contrato_pedido_em) where contrato_pedido_em is not null;

-- O resumo da proposta que vai no aviso.
create function proposta_resumo_aviso(p propostas) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object('proposta', p.numero, 'servico', p.servico, 'aceita', p.respondida_em,
                            'cliente', (select nome from clientes_escritorio where id = p.cliente_id),
                            'condicoes', honorario_lista(p.escritorio_id, 'PROPOSTA', p.id))
$$;

-- Pediu o contrato: o aviso vai para cada pessoa com a área Contratos (menos quem pediu).
create function aviso_pedido_contrato() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dados jsonb;
  r record;
begin
  if new.contrato_pedido_em is null or old.contrato_pedido_em is not null then return null; end if;
  v_dados := proposta_resumo_aviso(new) || jsonb_build_object('quem', (select nome from pessoas where id = new.contrato_pedido_por));
  for r in
    select distinct v.pessoa_id from vinculos v
     where v.escritorio_id = new.escritorio_id and v.revogado_em is null and v.funcao in ('SOCIO', 'EQUIPE')
       and 'CONTRATOS' = any (areas_da_pessoa(v.pessoa_id, new.escritorio_id))
  loop
    perform aviso_sino(new.escritorio_id, r.pessoa_id, new.contrato_pedido_por, 'PEDIDO_CONTRATO', 'propostas', new.id, v_dados);
  end loop;
  return null;
end $$;
create trigger aviso_pedido_contrato after update of contrato_pedido_em on propostas
  for each row execute function aviso_pedido_contrato();

-- O contrato nasceu de uma proposta pedida: quem pediu recebe o aviso. O link é o da proposta,
-- porque quem pediu pode não ter a área Contratos.
create function aviso_contrato_gerado() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  p propostas;
begin
  if new.proposta_id is null then return null; end if;
  select * into p from propostas where id = new.proposta_id;
  if p.contrato_pedido_por is null then return null; end if;
  perform aviso_sino(new.escritorio_id, p.contrato_pedido_por, new.criado_por, 'CONTRATO_GERADO', 'propostas', p.id,
    jsonb_build_object('contrato', new.numero, 'proposta', p.numero, 'servico', p.servico,
                       'cliente', (select nome from clientes_escritorio where id = new.cliente_id),
                       'quem', (select nome from pessoas where id = new.criado_por)));
  return null;
end $$;
create trigger aviso_contrato_gerado after insert on contratos
  for each row execute function aviso_contrato_gerado();

-- Os pedidos abertos, do mais antigo para o mais novo (decisão 3.6), para o bloco de Contratos.
-- GET /v1/escritorio/contratos/pedidos
create function portal_contratos_pedidos(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform entrar_area(p_pessoa, p_escritorio, 'CONTRATOS');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'contratos.ver');
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'proposta', jsonb_build_object('id', p.id, 'numero', p.numero, 'servico', p.servico, 'aceitaEm', p.respondida_em),
             'cliente', (select jsonb_build_object('id', k.id, 'nome', k.nome) from clientes_escritorio k where k.id = p.cliente_id),
             'condicoes', honorario_lista(p.escritorio_id, 'PROPOSTA', p.id),
             'pedidoPor', pessoa_ref(p.contrato_pedido_por),
             'pedidoEm', p.contrato_pedido_em) order by p.contrato_pedido_em, p.numero)
      from propostas p
     where p.escritorio_id = p_escritorio and p.estado = 'ACEITA' and p.contrato_pedido_em is not null
       and not exists (select 1 from contratos c where c.proposta_id = p.id)), '[]'::jsonb);
end $$;

call fechar_acesso();
