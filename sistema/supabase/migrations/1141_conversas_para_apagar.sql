-- As conversas do WhatsApp na janela de exclusão a pedido do titular (F3.190; PT-11, PA-05), pelo
-- plano revisado (project-files t3jus/f3-181-190/plano.md, seção 4, e revisao.md, b3, b4 e D3).
-- Desenho aprovado em docs/design/aprovadas/portal-exclusao-contratos-conversas. Decisões da Carol:
-- C5 = A, o que fica da conversa vai na própria linha; C6 = A, a conversa que fica com outro cliente
-- ganha uma dica com o nome dele.
--
-- 1. conversa_outros_clientes(c, p_cliente): os outros clientes, não excluídos, do mesmo escritório,
--    de quem a conversa guarda registro (execução de automação, compromisso ou aviso dele). É a união
--    que conversa_de_outro_cliente (1114) fazia; agora a 1114 e a contagem da janela leem da mesma
--    fonte (revisão, b4). conversa_de_outro_cliente é recriada como "existe algum": o mesmo resultado,
--    e conversas_apagar (1114) continua intacta.
-- 2. cliente_conversas_para_apagar(p_escritorio, p_cliente): o que conversas_apagar faria agora,
--    pelo MESMO predicado (os números dos contatos atuais do cliente, as conversas ligadas a ele e as
--    sem cliente desses números, não apagadas; a que guarda registro de outro cliente fica). Devolve só
--    números e os outros clientes (até 3, em ordem de nome, que a dona já vê). Sem security definer:
--    só o embrulho da ficha (portal_cliente, 1142) chama, como cliente_arquivos_para_apagar (1030).
--    Quem mudar conversas_apagar confere esta contagem (o pgTAP 171 compara as duas).

-- ---------------------------------------------------------------------------------------
-- 1. Uma fonte só para "os outros clientes da conversa".
create function conversa_outros_clientes(c conversas, p_cliente uuid) returns setof uuid
language sql
stable
set search_path = public
as $$
  select distinct k.id
    from (select x.cliente_id from automacao_execucoes x where x.escritorio_id = c.escritorio_id and x.conversa_id = c.id
          union all
          select a.cliente_id from compromissos a where a.escritorio_id = c.escritorio_id and a.conversa_id = c.id
          union all
          select conversa_mensagem_cliente(m) from conversa_mensagens m
           where m.escritorio_id = c.escritorio_id and m.conversa_id = c.id and m.autor = 'AVISO') o
    join clientes_escritorio k on k.id = o.cliente_id and k.escritorio_id = c.escritorio_id
   where k.id is distinct from p_cliente and k.estado <> 'EXCLUIDO'
$$;

-- A conversa guarda registro de outro cliente, não excluído, do mesmo escritório (1114, C3 da F3.157).
create or replace function conversa_de_outro_cliente(c conversas, p_cliente uuid) returns boolean
language sql
stable
set search_path = public
as $$
  select exists (select 1 from conversa_outros_clientes(c, p_cliente))
$$;

-- ---------------------------------------------------------------------------------------
-- 2. A contagem da janela. Quem mudar conversas_apagar (1114) confere esta função.
create function cliente_conversas_para_apagar(p_escritorio uuid, p_cliente uuid) returns jsonb
language sql
stable
set search_path = public
as $$
  with tels as (
    select coalesce(array_agg(distinct telefone_chave(x ->> 'telefone')) filter (where x ->> 'telefone' is not null), '{}') t
      from clientes_escritorio k left join lateral jsonb_array_elements(k.contatos) x on true
     where k.id = p_cliente and k.escritorio_id = p_escritorio),
  cs as (
    select c, conversa_de_outro_cliente(c, p_cliente) fica
      from conversas c, tels
     where c.escritorio_id = p_escritorio and c.apagada_em is null
       and (c.cliente_id = p_cliente or (c.cliente_id is null and telefone_chave(c.telefone) = any (tels.t)))),
  outros as (
    select distinct o.id
      from cs, conversa_outros_clientes(cs.c, p_cliente) o(id)
     where cs.fica),
  nomes as (
    select k.id, k.nome from outros o join clientes_escritorio k on k.id = o.id and k.escritorio_id = p_escritorio)
  select jsonb_build_object(
    'conversas', (select count(*) from cs where not fica),
    'naFila', (select count(*) from cs join conversa_mensagens m on m.conversa_id = (cs.c).id
                where not cs.fica and m.escritorio_id = p_escritorio and m.envio = 'NA_FILA'),
    'automacoes', (select count(*) from automacao_execucoes e
                    where e.escritorio_id = p_escritorio and e.cliente_id = p_cliente and e.proximo_em is not null),
    'ficam', (select count(*) from cs where fica),
    'ficamCom', coalesce((select jsonb_agg(jsonb_build_object('id', n.id, 'nome', n.nome) order by n.nome, n.id)
                            from (select * from nomes order by nome, id limit 3) n), '[]'::jsonb),
    'ficamComMais', greatest((select count(*) from nomes) - 3, 0))
$$;

call fechar_acesso();
