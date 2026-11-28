-- A proposta de cliente excluído ou arquivado a pedido do titular sai das listas de trabalho e fica
-- como registro, "Encerrada a pedido do titular" (F3.204; PT-11, AP-03, AP-05, PT-03), pelo plano
-- revisado (project-files t3jus/f3-204/plano.md, com as correções da revisao.md: A1, M1, b2, b7 e
-- b12). Desenho aprovado pela Carol em 27/11/2026, com todas as recomendações, em
-- docs/design/aprovadas/portal-propostas-encerradas.
--
-- Tudo na leitura: nada se grava, nada se apaga e não há preenchimento. A situação da proposta continua
-- o estado gravado (ENVIADA, ACEITA...), que é o fato; entra a marca `encerrada` (revisão, A1: o Portal
-- que está no ar não conhece um valor novo de situação). Recriar estas funções desfaz tudo.
--
-- 1. proposta_encerrada(p, k): a regra única. Cliente EXCLUIDO ou ARQUIVADO do mesmo escritório e a
--    proposta em RASCUNHO, ENVIADA, NEGOCIACAO ou ACEITA. CONTRATO e RECUSADA nunca ficam encerradas.
--    É a condição do join com o cliente, sem search_path, para o planejador expandir (como
--    lembrete_visivel, 1140). proposta_esta_encerrada(p) lê o cliente pela chave (revisão, b7).
-- 2. proposta_linha (corpo da 0190): `encerrada`, `enviadaEm` e `respondidaEm` (para "Enviada em 14/11"
--    e "Aceita em 12/11" na lista); na encerrada, `vencida` falso e `retorno` nulo. A ficha do cliente
--    (portal_cliente_itens, 0740) já usa proposta_linha e não muda (revisão, b2).
-- 3. portal_propostas (corpo da 0190): o filtro ENCERRADAS e `contagem.encerradas`; "Em andamento"
--    deixa de contar e de listar a encerrada.
-- 4. comercial_funil_sem_contratos (corpo da 0190, renomeada na 0200; os embrulhos da 0200 e da 0550
--    não mudam): as colunas de "Agora no funil" sem a encerrada; no período, o arquivado que recebeu
--    proposta, não fechou contrato e tem a última proposta aberta conta em `depoisProposta.encerradas`
--    e não em `andamento`. Por cliente, sem conta dupla (revisão, M1): o arquivado com contrato conta
--    só como contrato. O excluído continua fora do período, como desde a 0190.
-- 5. comercial_retornos_sem_funil (corpo da 0190, renomeada na 0550): "Propostas esperando resposta"
--    sem a encerrada.
-- 6. portal_inicio_contatos (corpo da 0400): o rodapé do Comercial sem a encerrada, no número e na
--    "mais antiga".
-- 7. portal_proposta (corpo da 1140): `retornoCompleto` nulo na encerrada (`encerrada` vem de
--    proposta_linha; clienteSituacao e clienteSaiuEm continuam).
--
-- Não recria: proposta_situacao (continua o estado gravado), os embrulhos portal_comercial_funil e
-- portal_comercial_retornos, portal_comercial_origem, comercial_apagar_do_excluido, a exclusão, o
-- arquivamento, o guardião, as automações (leem o ACEITA gravado e só rodam para o ATIVO),
-- comercial_passar_de_quem_saiu (EX-10: passa também as encerradas, só o responsável do registro) e
-- as funções de Contratos da 1140. As recusas de enviar, responder e editar ficam na 1145.

-- ---------------------------------------------------------------------------------------
-- 1. A regra única.
create function proposta_encerrada(p propostas, k clientes_escritorio) returns boolean
language sql
stable
as $$
  select k.id = p.cliente_id and k.escritorio_id = p.escritorio_id and k.estado in ('EXCLUIDO', 'ARQUIVADO')
     and p.estado in ('RASCUNHO', 'ENVIADA', 'NEGOCIACAO', 'ACEITA')
$$;

create function proposta_esta_encerrada(p propostas) returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce((select proposta_encerrada(p, k) from clientes_escritorio k
                    where k.id = p.cliente_id and k.escritorio_id = p.escritorio_id), false)
$$;

-- ---------------------------------------------------------------------------------------
-- 2. A linha das listas.
create or replace function proposta_linha(p propostas) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', p.id, 'numero', p.numero, 'servico', p.servico, 'situacao', proposta_situacao(p),
    'encerrada', x.enc,
    'cliente', (select jsonb_build_object('id', k.id, 'nome', k.nome, 'tipo', k.tipo) from clientes_escritorio k where k.id = p.cliente_id),
    'responsavel', pessoa_ref(p.responsavel_id),
    'vencida', not x.enc and p.estado in ('ENVIADA', 'NEGOCIACAO') and p.valida_ate < hoje_brasilia(),
    'condicoes', honorario_lista(p.escritorio_id, 'PROPOSTA', p.id),
    'retorno', case when not x.enc and p.estado in ('RASCUNHO', 'ENVIADA', 'NEGOCIACAO', 'ACEITA')
                    then (select jsonb_build_object('em', r ->> 'em', 'vencido', (r ->> 'vencido')::boolean) from prox_contato(p.cliente_id) r
                           where r is not null) end,
    'enviadaEm', p.enviada_em, 'respondidaEm', p.respondida_em,
    'criadaEm', p.criado_em)
    from (select proposta_esta_encerrada(p) enc) x
$$;

-- ---------------------------------------------------------------------------------------
-- 3. A lista de Propostas: em andamento, viraram contrato, recusadas e encerradas a pedido.
create or replace function portal_propostas(p_pessoa uuid, p_escritorio uuid, p_mostrar text default 'ANDAMENTO', p_q text default null) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_q text := lower(btrim(coalesce(p_q, '')));
  v_padrao text;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'COMERCIAL');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'propostas.ver');
  if coalesce(p_mostrar, 'ANDAMENTO') not in ('ANDAMENTO', 'CONTRATO', 'RECUSADAS', 'ENCERRADAS') then perform recusar_campos('Filtro inválido', 'mostrar'); end if;
  if length(v_q) > 120 then perform recusar_campos('Busca longa demais', 'q'); end if;
  v_padrao := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  return jsonb_build_object(
    'algum', exists (select 1 from propostas where escritorio_id = p_escritorio),
    'contagem', (
      select jsonb_build_object(
               'andamento', count(*) filter (where p.estado in ('RASCUNHO', 'ENVIADA', 'NEGOCIACAO', 'ACEITA') and not proposta_encerrada(p, k)),
               'contrato', count(*) filter (where p.estado = 'CONTRATO'),
               'recusadas', count(*) filter (where p.estado = 'RECUSADA'),
               'encerradas', count(*) filter (where proposta_encerrada(p, k)))
        from propostas p join clientes_escritorio k on k.id = p.cliente_id and k.escritorio_id = p.escritorio_id
       where p.escritorio_id = p_escritorio),
    'propostas', coalesce((
      select jsonb_agg(proposta_linha(p) order by p.criado_em desc)
        from propostas p join clientes_escritorio k on k.id = p.cliente_id and k.escritorio_id = p.escritorio_id
       where p.escritorio_id = p_escritorio
         and case coalesce(p_mostrar, 'ANDAMENTO')
               when 'ANDAMENTO' then p.estado in ('RASCUNHO', 'ENVIADA', 'NEGOCIACAO', 'ACEITA') and not proposta_encerrada(p, k)
               when 'CONTRATO' then p.estado = 'CONTRATO'
               when 'ENCERRADAS' then proposta_encerrada(p, k)
               else p.estado = 'RECUSADA' end
         and (v_q = '' or lower(p.numero) like v_padrao or lower(k.nome) like v_padrao)), '[]'::jsonb));
end $$;

-- ---------------------------------------------------------------------------------------
-- 4. O Funil (o corpo de baixo; os embrulhos da 0200 e da 0550 acrescentam os contratos e "Saíram
-- sem proposta").
create or replace function comercial_funil_sem_contratos(p_pessoa uuid, p_escritorio uuid, p_periodo text default '90') returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_de date := comercial_inicio(p_periodo);
  v_ini timestamptz;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'COMERCIAL');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'propostas.ver');
  if v_de is null then perform recusar_campos('Período inválido', 'periodo'); end if;
  v_ini := v_de::timestamp at time zone 'America/Sao_Paulo';
  return (
    with primeiros as (
      select c.id, c.nome, c.funil_motivo,
             exists (select 1 from propostas p where p.cliente_id = c.id and p.estado <> 'RASCUNHO') proposta,
             exists (select 1 from propostas p where p.cliente_id = c.id and p.estado = 'CONTRATO') contrato
        from clientes_escritorio c
       where c.escritorio_id = p_escritorio and c.criado_em >= v_ini and c.estado <> 'EXCLUIDO'),
    -- A última proposta enviada de cada primeiro contato, com a marca da encerrada (F3.204).
    ultimas as (
      select distinct on (p.cliente_id) p.*, proposta_encerrada(p, k) encerrada, f.contrato cliente_contrato
        from propostas p join primeiros f on f.id = p.cliente_id
        join clientes_escritorio k on k.id = p.cliente_id and k.escritorio_id = p.escritorio_id
       where p.estado <> 'RASCUNHO' order by p.cliente_id, p.criado_em desc),
    agora_p as (
      select p.estado, jsonb_build_object('id', p.id, 'numero', p.numero, 'clienteId', k.id, 'nome', k.nome,
                                          'retorno', (select jsonb_build_object('em', x ->> 'em', 'vencido', (x ->> 'vencido')::boolean)
                                                        from prox_contato(k.id) x where x is not null),
                                          'valorCerto', honorario_valor_certo(p_escritorio, 'PROPOSTA', p.id),
                                          'condicoes', honorario_lista(p_escritorio, 'PROPOSTA', p.id)) j, p.criado_em
        from propostas p join clientes_escritorio k on k.id = p.cliente_id and k.escritorio_id = p.escritorio_id
       where p.escritorio_id = p_escritorio and p.estado in ('ENVIADA', 'NEGOCIACAO', 'ACEITA') and not proposta_encerrada(p, k))
    select jsonb_build_object(
      'de', v_de, 'ate', hoje_brasilia(),
      'primeiros', (select count(*) from primeiros),
      'comProposta', (select count(*) from primeiros where proposta),
      'contratos', (select count(*) from primeiros where contrato),
      'semProposta', jsonb_build_object(
        'naoPegou', (select count(*) from primeiros where not proposta and funil_motivo = 'NAO_PEGOU'),
        'naoVoltou', (select count(*) from primeiros where not proposta and funil_motivo = 'NAO_VOLTOU'),
        'emAtendimento', (select count(*) from primeiros where not proposta and funil_motivo is null)),
      'depoisProposta', jsonb_build_object(
        'andamento', (select count(*) from ultimas where estado in ('ENVIADA', 'NEGOCIACAO', 'ACEITA') and not encerrada),
        -- O arquivado a pedido sem contrato e com a última proposta aberta (o excluído já está fora do
        -- período). Com contrato, conta só como contrato (revisão, M1).
        'encerradas', (select count(*) from ultimas where encerrada and not cliente_contrato),
        'recusadas', coalesce((select jsonb_agg(jsonb_build_object('motivo', motivo_recusa, 'n', n) order by n desc, motivo_recusa)
                                 from (select motivo_recusa, count(*) n from ultimas where estado = 'RECUSADA' group by motivo_recusa) x), '[]'::jsonb)),
      'agora', jsonb_build_object(
        'primeiro', coalesce((
          select jsonb_agg(jsonb_build_object(
                   'clienteId', f.id, 'nome', f.nome,
                   'rascunho', exists (select 1 from propostas p where p.cliente_id = f.id and p.estado = 'RASCUNHO'),
                   'semRetorno', prox_contato(f.id) is null,
                   'detalhe', coalesce((select 'Proposta em rascunho · ' || split_part(pe.nome, ' ', 1) from propostas p join pessoas pe on pe.id = p.responsavel_id
                                         where p.cliente_id = f.id and p.estado = 'RASCUNHO' order by p.criado_em desc limit 1),
                                       (select 'Atendido em ' || to_char(a.ocorrido_em at time zone 'America/Sao_Paulo', 'DD/MM')
                                          from atendimentos a where a.cliente_id = f.id order by a.ocorrido_em desc limit 1),
                                       'Cadastrado, ainda sem atendimento')) order by f.nome)
            from primeiros f join clientes_escritorio k on k.id = f.id
           where not f.proposta and f.funil_motivo is null and k.estado = 'ATIVO'), '[]'::jsonb),
        'enviada', coalesce((select jsonb_agg(j order by criado_em desc) from agora_p where estado = 'ENVIADA'), '[]'::jsonb),
        'negociacao', coalesce((select jsonb_agg(j order by criado_em desc) from agora_p where estado = 'NEGOCIACAO'), '[]'::jsonb),
        'aceita', coalesce((select jsonb_agg(j order by criado_em desc) from agora_p where estado = 'ACEITA'), '[]'::jsonb))));
end $$;

-- ---------------------------------------------------------------------------------------
-- 5. Atendimentos (o corpo de baixo; o embrulho da 0550 acrescenta "Encerrar sem proposta").
create or replace function comercial_retornos_sem_funil(p_pessoa uuid, p_escritorio uuid, p_responsavel uuid default null) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hoje date := hoje_brasilia();
begin
  perform entrar_area(p_pessoa, p_escritorio, 'COMERCIAL');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.ver');
  return (
    with todos as (
      select c.id, c.nome, c.tipo, prox_contato(c.id) p,
             (select jsonb_build_object('em', a.ocorrido_em, 'canal', a.canal, 'comQuem', a.com_quem, 'resumo', left(a.resumo, 160))
                from atendimentos a where a.cliente_id = c.id and (c.inativado_em is null or a.criado_em > c.inativado_em)
               order by a.ocorrido_em desc limit 1) ultimo
        from clientes_escritorio c
       where c.escritorio_id = p_escritorio and c.estado = 'ATIVO'),
    com as (
      select t.*, (t.p ->> 'em')::date em, (t.p -> 'responsavel' ->> 'id')::uuid resp,
             jsonb_build_object('clienteId', t.id, 'nome', t.nome, 'tipo', t.tipo, 'em', t.p ->> 'em', 'oque', t.p ->> 'oque',
                                'responsavel', t.p -> 'responsavel', 'ultimo', t.ultimo) j
        from todos t where t.p is not null),
    filtrado as (select * from com where p_responsavel is null or resp = p_responsavel),
    sem as (
      select jsonb_build_object('clienteId', t.id, 'nome', t.nome, 'tipo', t.tipo, 'em', null, 'oque', null, 'responsavel', null, 'ultimo', t.ultimo) j, t.nome
        from todos t where t.p is null and t.ultimo is not null and p_responsavel is null)
    select jsonb_build_object(
      'algum', exists (select 1 from com) or exists (select 1 from sem),
      'grupos', jsonb_build_object(
        'vencidos', coalesce((select jsonb_agg(j order by em, nome) from filtrado where em < v_hoje), '[]'::jsonb),
        'hoje', coalesce((select jsonb_agg(j order by nome) from filtrado where em = v_hoje), '[]'::jsonb),
        'semana', coalesce((select jsonb_agg(j order by em, nome) from filtrado where em > v_hoje and em <= v_hoje + 7), '[]'::jsonb),
        'depois', coalesce((select jsonb_agg(j order by em, nome) from filtrado where em > v_hoje + 7), '[]'::jsonb),
        'semData', coalesce((select jsonb_agg(j order by nome) from sem), '[]'::jsonb)),
      'totais', jsonb_build_object(
        'vencidos', (select count(*) from filtrado where em < v_hoje),
        'hoje', (select count(*) from filtrado where em = v_hoje),
        'semana', (select count(*) from filtrado where em > v_hoje and em <= v_hoje + 7),
        'semData', (select count(*) from sem)),
      'porResponsavel', coalesce((
        select jsonb_agg(jsonb_build_object('pessoa', pessoa_ref(resp), 'vencidos', v, 'hoje', h, 'total', n) order by v desc, h desc, (select nome from pessoas where id = resp))
          from (select resp, count(*) filter (where em < v_hoje) v, count(*) filter (where em = v_hoje) h, count(*) n
                  from com group by resp) x), '[]'::jsonb),
      'propostasEsperando', coalesce((
        select jsonb_agg(jsonb_build_object('id', p.id, 'numero', p.numero, 'cliente', k.nome, 'situacao', p.estado, 'enviadaEm', p.enviada_em,
                                            'responsavel', pessoa_ref(p.responsavel_id),
                                            'retorno', (select jsonb_build_object('em', x ->> 'em', 'vencido', (x ->> 'vencido')::boolean)
                                                          from prox_contato(p.cliente_id) x where x is not null))
                         order by (prox_contato(p.cliente_id) ->> 'em') nulls last, p.numero)
          from propostas p join clientes_escritorio k on k.id = p.cliente_id and k.escritorio_id = p.escritorio_id
         where p.escritorio_id = p_escritorio and p.estado in ('ENVIADA', 'NEGOCIACAO') and not proposta_encerrada(p, k)
           and (p_responsavel is null or p.responsavel_id = p_responsavel)), '[]'::jsonb)));
end $$;

-- ---------------------------------------------------------------------------------------
-- 6. O Início: o rodapé do Comercial.
create or replace function portal_inicio_contatos(p_pessoa uuid, p_escritorio uuid, p_de text default 'MEUS', p_limite integer default 5)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r jsonb;
begin
  r := inicio_contatos_f114(p_pessoa, p_escritorio, p_de, p_limite);
  return r || jsonb_build_object(
    'propostasEsperando', (select count(*) from propostas p join clientes_escritorio k on k.id = p.cliente_id and k.escritorio_id = p.escritorio_id
                            where p.escritorio_id = p_escritorio and p.estado in ('ENVIADA', 'NEGOCIACAO') and not proposta_encerrada(p, k)
                              and (coalesce(p_de, 'MEUS') = 'EQUIPE' or p.responsavel_id = p_pessoa)),
    -- A proposta mais antiga esperando, para o rodapé dizer de quem é.
    'propostaMaisAntiga', (select jsonb_build_object('id', p.id, 'numero', p.numero, 'cliente', k.nome, 'clienteId', k.id,
                                                     'retornoHoje', exists (select 1 from prox_contato(k.id) x where (x ->> 'em')::date = hoje_brasilia()))
                             from propostas p join clientes_escritorio k on k.id = p.cliente_id and k.escritorio_id = p.escritorio_id
                            where p.escritorio_id = p_escritorio and p.estado in ('ENVIADA', 'NEGOCIACAO') and not proposta_encerrada(p, k)
                              and (coalesce(p_de, 'MEUS') = 'EQUIPE' or p.responsavel_id = p_pessoa)
                            order by p.enviada_em, p.numero limit 1));
end $$;

-- ---------------------------------------------------------------------------------------
-- 7. A ficha da proposta: sem o retorno na encerrada.
create or replace function portal_proposta(p_pessoa uuid, p_escritorio uuid, p_proposta uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p propostas;
  k clientes_escritorio;
  v_contratos boolean;
  v_encerrada boolean;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'COMERCIAL');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'propostas.ver');
  select * into p from propostas where id = p_proposta and escritorio_id = p_escritorio;
  if p.id is null then raise exception 'Proposta não encontrada' using errcode = 'TC404'; end if;
  select * into k from clientes_escritorio where id = p.cliente_id and escritorio_id = p_escritorio;
  v_contratos := 'CONTRATOS' = any (areas_da_pessoa(p_pessoa, p_escritorio));
  v_encerrada := coalesce(proposta_encerrada(p, k), false);
  return proposta_linha(p) || jsonb_build_object(
    'escopo', p.escopo, 'validaAte', p.valida_ate, 'enviadaEm', p.enviada_em, 'respondidaEm', p.respondida_em,
    'motivoRecusa', p.motivo_recusa, 'versao', p.versao,
    'origem', k.origem,
    'retornoCompleto', case when not v_encerrada and p.estado in ('RASCUNHO', 'ENVIADA', 'NEGOCIACAO', 'ACEITA') then prox_contato(p.cliente_id) end,
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

call fechar_acesso();
