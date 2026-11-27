-- O pedido de contrato e o lembrete de contrato do cliente excluído (e do arquivado) a pedido do
-- titular (F3.181 e F3.186; PT-11, IN-01, VA-05), pelo plano revisado (project-files
-- t3jus/f3-181-190/plano.md, seções 2 e 3, e revisao.md, D1, M5, b6, b8 e b9). Desenho aprovado em
-- docs/design/aprovadas/portal-exclusao-contratos-conversas. Decisões da Carol: C1 = A, o pedido do
-- excluído sai sozinho de Contratos e pedir de novo é recusado; C2 = A, a mesma regra para o
-- arquivado a pedido; C4 = A, o lembrete do excluído sai das listas, dos totais e dos dispensados.
--
-- Tudo na leitura: nada se apaga nem se marca. A proposta continua ACEITA, com contrato_pedido_em
-- (a prova de que o pedido existiu, PT-03); o lembrete continua no banco e na exportação (F0.12),
-- com o detalhe guardado até o marco (F3.177). Recriar estas funções desfaz tudo. Sem preenchimento
-- dos já excluídos: a leitura vale na hora para todos.
--
-- 1. pedido_contrato_pendente(p): a proposta aceita, pedida e sem contrato. Uma fonte só para a lista
--    de Contratos (portal_contratos_pedidos) e para a contagem da janela de exclusão
--    (cliente_pedidos_contrato_que_saem), para os dois não divergirem (revisão, D1).
-- 2. portal_proposta_pedir_contrato (corpo da 0190): lê o cliente com FOR SHARE ANTES da proposta e
--    recusa o EXCLUIDO (CLIENTE_EXCLUIDO) e o ARQUIVADO (CLIENTE_ARQUIVADO), antes do "já pedido"
--    (a página velha recebe a recusa, e não um ok mudo; revisão, b6). Depois relê a proposta com FOR
--    UPDATE e confere ACEITA sobre a versão travada: a proposta que acabou de virar CONTRATO não
--    recebe mais o pedido nem o aviso. A ordem cliente → proposta é a da exclusão
--    (cliente_para_exclusao, 1114, depois comercial_apagar_do_excluido) e a do contrato pela proposta
--    (portal_contrato_criar, 1130: a trava contratos:, o cliente FOR SHARE, a proposta FOR UPDATE).
--    Nenhum caminho segura a proposta e depois pede o cliente (revisão, D5).
-- 3. portal_contratos_pedidos (corpo da 0532): sem o cliente EXCLUIDO e o ARQUIVADO (junta pelo
--    escritório também, como as funções da 1114).
-- 4. portal_contrato_da_proposta (corpo da 0200; a 1130 não a recria): o cliente EXCLUIDO ou
--    ARQUIVADO recusa antes do "não aceita". Só leitura, sem trava.
-- 5. portal_proposta (corpo da 0190): duas chaves a mais, clienteSituacao e clienteSaiuEm (o
--    excluido_em ou o arquivado_em; sem dado pessoal), fora de proposta_linha, para o JSON das
--    listas não mudar (revisão, M5).
-- 6. lembrete_visivel(l, k): o lembrete não desfeito do cliente não EXCLUIDO, como condição do join
--    com o cliente (revisão, b9), em portal_contratos_lembretes, lembretes_totais,
--    portal_contratos_lembretes_resumo e na contagem da janela. "De onde vieram" continua contando
--    tudo o que a importação criou, como a tela da importação (0920:804; revisão, b8). O arquivado
--    continua na lista e se dispensa (R7). O resumo calcula os totais uma vez só.
-- 7. As contagens da janela, sem security definer (só o embrulho da ficha chama, como
--    cliente_arquivos_para_apagar, 1030): cliente_pedidos_contrato_que_saem e
--    cliente_lembretes_que_saem. A ficha as monta na 1142.
--
-- Dispensar e trazer de volta (1116) não mudam: continuam recusando o excluído com CLIENTE_EXCLUIDO,
-- e a tela passa a tratar o código. O sino, os guardiões e comercial_apagar_do_excluido não mudam.

-- ---------------------------------------------------------------------------------------
-- 1. O pedido pendente.
create function pedido_contrato_pendente(p propostas) returns boolean
language sql
stable
set search_path = public
as $$
  select p.estado = 'ACEITA' and p.contrato_pedido_em is not null
     and not exists (select 1 from contratos c where c.proposta_id = p.id)
$$;

-- ---------------------------------------------------------------------------------------
-- 2. Pedir o contrato: o cliente antes da proposta.
create or replace function portal_proposta_pedir_contrato(p_pessoa uuid, p_escritorio uuid, p_proposta uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  a propostas;
  v_cli uuid;
  v_estado text;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'COMERCIAL');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'propostas.editar');
  select x.cliente_id into v_cli from propostas x where x.id = p_proposta and x.escritorio_id = p_escritorio;
  if v_cli is null then raise exception 'Proposta não encontrada' using errcode = 'TC404'; end if;
  -- O cliente primeiro, com FOR SHARE: o pedido feito durante a exclusão (ou o arquivamento) espera
  -- por ela e é recusado; o que chega antes faz a exclusão esperar.
  select k.estado into v_estado from clientes_escritorio k where k.id = v_cli and k.escritorio_id = p_escritorio for share;
  if v_estado = 'EXCLUIDO' then
    perform recusar_motivo('Os dados deste cliente foram excluídos a pedido do titular', 'CLIENTE_EXCLUIDO');
  end if;
  if v_estado = 'ARQUIVADO' then
    perform recusar_motivo('Este cliente foi arquivado a pedido do titular', 'CLIENTE_ARQUIVADO');
  end if;
  select * into a from propostas where id = p_proposta and escritorio_id = p_escritorio for update;
  if a.estado <> 'ACEITA' then perform recusar_motivo('Só a proposta aceita pede contrato', 'PROPOSTA_NAO_ACEITA'); end if;
  if a.contrato_pedido_em is not null then return; end if;
  update propostas set contrato_pedido_em = app_now(), contrato_pedido_por = p_pessoa where id = p_proposta;
  perform registrar_historico('proposta.contrato_pedido', 'propostas', p_proposta::text, '{}'::jsonb);
end $$;

-- ---------------------------------------------------------------------------------------
-- 3. Os pedidos abertos do bloco de Contratos, sem o cliente excluído e sem o arquivado.
create or replace function portal_contratos_pedidos(p_pessoa uuid, p_escritorio uuid) returns jsonb
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
             'cliente', jsonb_build_object('id', k.id, 'nome', k.nome),
             'condicoes', honorario_lista(p.escritorio_id, 'PROPOSTA', p.id),
             'pedidoPor', pessoa_ref(p.contrato_pedido_por),
             'pedidoEm', p.contrato_pedido_em) order by p.contrato_pedido_em, p.numero)
      from propostas p
      join clientes_escritorio k on k.id = p.cliente_id and k.escritorio_id = p.escritorio_id
     where p.escritorio_id = p_escritorio and pedido_contrato_pendente(p)
       and k.estado not in ('EXCLUIDO', 'ARQUIVADO')), '[]'::jsonb);
end $$;

-- ---------------------------------------------------------------------------------------
-- 4. O formulário do contrato pela proposta: o cliente excluído ou arquivado recusa.
create or replace function portal_contrato_da_proposta(p_pessoa uuid, p_escritorio uuid, p_proposta uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p propostas;
  v_estado text;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'CONTRATOS');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'contratos.editar');
  select * into p from propostas where id = p_proposta and escritorio_id = p_escritorio;
  if p.id is null then raise exception 'Proposta não encontrada' using errcode = 'TC404'; end if;
  select k.estado into v_estado from clientes_escritorio k where k.id = p.cliente_id and k.escritorio_id = p_escritorio;
  if v_estado = 'EXCLUIDO' then
    perform recusar_motivo('Os dados deste cliente foram excluídos a pedido do titular', 'CLIENTE_EXCLUIDO');
  end if;
  if v_estado = 'ARQUIVADO' then
    perform recusar_motivo('Este cliente foi arquivado a pedido do titular', 'CLIENTE_ARQUIVADO');
  end if;
  if p.estado <> 'ACEITA' then perform recusar_motivo('Só a proposta aceita vira contrato', 'PROPOSTA_NAO_ACEITA'); end if;
  return jsonb_build_object(
    'id', p.id, 'numero', p.numero, 'respondidaEm', p.respondida_em, 'servico', p.servico, 'escopo', p.escopo,
    'responsavel', pessoa_ref(p.responsavel_id),
    'cliente', (select jsonb_build_object('id', k.id, 'nome', k.nome, 'tipo', k.tipo) from clientes_escritorio k where k.id = p.cliente_id),
    'condicoes', honorario_lista(p_escritorio, 'PROPOSTA', p.id));
end $$;

-- ---------------------------------------------------------------------------------------
-- 5. A ficha da proposta: a situação do cliente e quando ele saiu (excluído ou arquivado).
create or replace function portal_proposta(p_pessoa uuid, p_escritorio uuid, p_proposta uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p propostas;
  k clientes_escritorio;
  v_contratos boolean;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'COMERCIAL');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'propostas.ver');
  select * into p from propostas where id = p_proposta and escritorio_id = p_escritorio;
  if p.id is null then raise exception 'Proposta não encontrada' using errcode = 'TC404'; end if;
  select * into k from clientes_escritorio where id = p.cliente_id and escritorio_id = p_escritorio;
  v_contratos := 'CONTRATOS' = any (areas_da_pessoa(p_pessoa, p_escritorio));
  return proposta_linha(p) || jsonb_build_object(
    'escopo', p.escopo, 'validaAte', p.valida_ate, 'enviadaEm', p.enviada_em, 'respondidaEm', p.respondida_em,
    'motivoRecusa', p.motivo_recusa, 'versao', p.versao,
    'origem', k.origem,
    'retornoCompleto', case when p.estado in ('RASCUNHO', 'ENVIADA', 'NEGOCIACAO', 'ACEITA') then prox_contato(p.cliente_id) end,
    'podeContrato', v_contratos,
    'quemTemContratos', quem_tem_area(p_escritorio, 'CONTRATOS'),
    'contratoPedidoEm', p.contrato_pedido_em,
    'clienteSituacao', k.estado,
    'clienteSaiuEm', case k.estado when 'EXCLUIDO' then k.excluido_em when 'ARQUIVADO' then k.arquivado_em end,
    'historico', coalesce((
      select jsonb_agg(jsonb_build_object('em', h.ocorrido_em, 'acao', h.acao, 'autor', a.nome, 'dados', h.dados) order by h.id desc)
        from historico h left join pessoas a on a.id = h.autor_id
       where h.escritorio_id = p_escritorio and h.entidade = 'propostas' and h.entidade_id = p.id::text), '[]'::jsonb));
end $$;

-- ---------------------------------------------------------------------------------------
-- 6. O lembrete que aparece: não desfeito, de cliente não excluído do mesmo escritório. É a condição
-- do join com o cliente (a função SQL simples é expandida pelo planejador; revisão, b9).
create function lembrete_visivel(l lembrete_contrato, k clientes_escritorio) returns boolean
language sql
stable
as $$
  select l.desfeito_em is null and k.id = l.cliente_id and k.escritorio_id = l.escritorio_id and k.estado <> 'EXCLUIDO'
$$;

create or replace function lembretes_totais(p_escritorio uuid) returns jsonb
language sql stable
set search_path = public
as $$
  with t as (select lembrete_situacao(l) s, l.valor_em_aberto_centavos v, l.cliente_id
               from lembrete_contrato l join clientes_escritorio k on lembrete_visivel(l, k)
              where l.escritorio_id = p_escritorio)
  select jsonb_build_object(
    'totais', jsonb_build_object(
      'abertos', jsonb_build_object('n', (select count(*) from t where s = 'ABERTO'), 'valor', (select coalesce(sum(v), 0) from t where s = 'ABERTO')),
      'contrato', jsonb_build_object('n', (select count(*) from t where s = 'CONTRATO'), 'valor', (select coalesce(sum(v), 0) from t where s = 'CONTRATO')),
      'dispensados', jsonb_build_object('n', (select count(*) from t where s = 'DISPENSADO'), 'valor', (select coalesce(sum(v), 0) from t where s = 'DISPENSADO'))),
    'clientesAbertos', (select count(distinct cliente_id) from t where s = 'ABERTO'))
$$;

-- A lista (corpo da 0921), com o lembrete do excluído fora dos três grupos.
create or replace function portal_contratos_lembretes(p_pessoa uuid, p_escritorio uuid, p_situacao text default 'ABERTO', p_q text default null,
                                                      p_ordem text default null, p_pular integer default 0) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sit text;
  v_q text;
  v_ordem text;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'CONTRATOS');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'contratos.ver');
  v_sit := coalesce(p_situacao, 'ABERTO');
  if v_sit not in ('ABERTO', 'CONTRATO', 'DISPENSADO') then perform recusar_campos('Confira o filtro', 'situacao'); end if;
  if length(coalesce(p_q, '')) > 120 then perform recusar_campos('Busca longa demais', 'q'); end if;
  if p_ordem is not null and p_ordem not in ('VALOR', 'ANTIGO', 'NOME') then perform recusar_campos('Ordem desconhecida', 'ordem'); end if;
  if coalesce(p_pular, 0) not between 0 and 10000 then perform recusar_campos('Página inválida', 'pular'); end if;
  v_q := nullif(sem_acento(btrim(coalesce(p_q, ''))), '');
  v_ordem := case when v_sit = 'ABERTO' then coalesce(p_ordem, 'VALOR') end;
  return jsonb_build_object('hoje', hoje_brasilia(), 'situacao', v_sit, 'ordem', v_ordem, 'q', nullif(btrim(coalesce(p_q, '')), ''), 'pular', coalesce(p_pular, 0))
    || lembretes_totais(p_escritorio) || (
    with f as (
      select l.* from lembrete_contrato l join clientes_escritorio k on lembrete_visivel(l, k)
        left join casos c on c.id = l.caso_id
       where l.escritorio_id = p_escritorio and lembrete_situacao(l) = v_sit
         and (v_q is null or sem_acento(k.nome) like '%' || v_q || '%' or sem_acento(coalesce(c.nome, '')) like '%' || v_q || '%'))
    select jsonb_build_object(
      'total', (select count(*) from f),
      'valor', (select coalesce(sum(valor_em_aberto_centavos), 0) from f),
      'lembretes', coalesce((select jsonb_agg(lembrete_linha(p.x) order by p.o) from (
          select f::lembrete_contrato x,
                 row_number() over (order by
                   case when v_ordem = 'VALOR' then f.valor_em_aberto_centavos end desc nulls last,
                   case when v_ordem = 'ANTIGO' then f.mais_antigo end asc nulls last,
                   case when v_sit = 'CONTRATO' then f.resolvido_em end desc nulls last,
                   case when v_sit = 'DISPENSADO' then f.dispensado_em end desc nulls last,
                   (select sem_acento(k.nome) from clientes_escritorio k where k.id = f.cliente_id), f.id) o
            from f order by o offset coalesce(p_pular, 0) limit 25) p), '[]'::jsonb),
      -- "De onde vieram": cada importação do financeiro, não desfeita, que criou lembretes. Conta tudo
      -- o que a importação criou, também o do cliente excluído, como a tela da importação (revisão, b8).
      'importacoes', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'origem', i.origem, 'em', i.importado_em, 'por', pessoa_ref(i.criado_por),
                                                                  'lembretes', x.n, 'valor', x.v) order by i.importado_em desc)
                                 from importacoes i join (select importacao_id, count(*) n, sum(valor_em_aberto_centavos) v from lembrete_contrato
                                                           where escritorio_id = p_escritorio group by importacao_id) x on x.importacao_id = i.id
                                where i.escritorio_id = p_escritorio and i.estado = 'CONCLUIDA'), '[]'::jsonb)));
end $$;

-- A faixa de Contratos (corpo da 0921), com os totais uma vez só e a origem pelo mesmo predicado.
create or replace function portal_contratos_lembretes_resumo(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  i importacoes;
  t jsonb;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'CONTRATOS');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'contratos.ver');
  select im.* into i from importacoes im
   where im.id in (select l.importacao_id from lembrete_contrato l join clientes_escritorio k on lembrete_visivel(l, k)
                    where l.escritorio_id = p_escritorio and lembrete_situacao(l) = 'ABERTO')
   order by im.importado_em desc limit 1;
  t := lembretes_totais(p_escritorio);
  return jsonb_build_object(
    'clientes', (t ->> 'clientesAbertos')::integer,
    'abertos', (t -> 'totais' -> 'abertos' ->> 'n')::integer,
    'valor', (t -> 'totais' -> 'abertos' ->> 'valor')::bigint,
    'origem', i.origem, 'importadoEm', i.importado_em);
end $$;

-- ---------------------------------------------------------------------------------------
-- 7. As contagens da janela de exclusão (e de arquivar, para os pedidos). Só números das propostas
-- e valores, sem dado pessoal. O escritório vem do embrulho (portal_cliente), que já o conferiu.

-- Os números das propostas cujo pedido sai de Contratos, em ordem de número.
create function cliente_pedidos_contrato_que_saem(p_escritorio uuid, p_cliente uuid) returns jsonb
language sql
stable
set search_path = public
as $$
  select coalesce(jsonb_agg(p.numero order by p.numero), '[]'::jsonb)
    from propostas p
   where p.escritorio_id = p_escritorio and p.cliente_id = p_cliente and pedido_contrato_pendente(p)
$$;

-- Os lembretes abertos que saem de Contratos › Lembretes: quantos, o valor, os lançamentos e o
-- sistema (null com mais de um, ou de planilha). null sem lembrete aberto.
create function cliente_lembretes_que_saem(p_escritorio uuid, p_cliente uuid) returns jsonb
language sql
stable
set search_path = public
as $$
  with l as (
    select l.valor_em_aberto_centavos v, l.lancamentos n, i.origem
      from lembrete_contrato l join clientes_escritorio k on lembrete_visivel(l, k)
      left join importacoes i on i.id = l.importacao_id
     where l.escritorio_id = p_escritorio and l.cliente_id = p_cliente and lembrete_situacao(l) = 'ABERTO')
  select case when exists (select 1 from l) then jsonb_build_object(
           'n', (select count(*) from l),
           'valor', (select coalesce(sum(v), 0) from l),
           'lancamentos', (select coalesce(sum(n), 0) from l),
           'origem', (select case when count(distinct origem) = 1 and count(origem) = count(*) and min(origem) in ('ASTREA', 'ADVBOX_PLANILHA')
                              then min(origem) end from l)) end
$$;

call fechar_acesso();
