-- A proposta de cliente excluído ou arquivado a pedido do titular sai das listas de trabalho e fica como
-- registro (1144; F3.204, AP-05, PT-11, PT-03): a regra única proposta_encerrada; o estado gravado não
-- muda e as leituras não sobem a versão nem gravam histórico; a lista de Propostas com o filtro
-- ENCERRADAS e as quatro contagens; a linha com `encerrada`, `enviadaEm` e `respondidaEm`, sem
-- `vencida` e sem retorno; a ficha da proposta e a aba Propostas da ficha do cliente; CONTRATO,
-- RECUSADA e o cliente INATIVO nunca ficam encerrados; o isolamento entre escritórios.
begin;
select plan(24);

select ajustar_relogio(('2026-11-26 10:00-03'::timestamptz - now()));
-- A saída das entradas sem acesso (0540) não entra neste teste.
update inventario_dados set situacao = 'PROPOSTA' where tabela = 'pessoas';

create temp table ids as select
  teste.pessoa('Paula Reis') as socia,
  teste.pessoa('Diego Martins') as diego,
  teste.pessoa('Intrusa Souza') as intrusa,
  teste.escritorio('Reis & Coelho') as rc,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rc, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rc, diego, 'Diego Martins', array['COMERCIAL']) from ids;

create function pg_temp.cliente(p_nome text, p_tel text) returns uuid language sql as $$
  select (portal_cliente_cadastrar(socia, rc, jsonb_build_object('tipo', 'PF', 'origem', 'GOOGLE', 'nome', p_nome,
    'contatos', jsonb_build_array(jsonb_build_object('nome', p_nome, 'telefone', p_tel, 'principal', true)))) ->> 'id')::uuid from ids
$$;
create temp table cli as select
  pg_temp.cliente('Marina Alves Coelho', '+5511970123348') mar,
  pg_temp.cliente('Rui Arquivado Matos', '+5511955551234') rui,
  pg_temp.cliente('Ana Ativa Lima', '+5511962310457') ana,
  pg_temp.cliente('Ivo Inativo Reis', '+5511944441234') ivo;

-- A proposta até o estado pedido, pela tela (validade em 28/11 para conferir o "vencida" depois).
create function pg_temp.proposta(p_cliente uuid, p_servico text, p_ate text) returns uuid language plpgsql as $$
declare v uuid; i ids;
begin
  select * into i from ids;
  v := (portal_proposta_criar(i.diego, i.rc, jsonb_build_object('clienteId', p_cliente, 'servico', p_servico, 'escopo', 'Ação e acompanhamento.',
    'responsavelId', i.diego, 'validaAte', '2026-11-28',
    'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'FIXO', 'valor', 200000, 'vencimento', '2026-12-10')),
    'retorno', jsonb_build_object('em', '2026-11-30', 'responsavelId', i.diego))) ->> 'id')::uuid;
  if p_ate = 'RASCUNHO' then return v; end if;
  perform portal_proposta_enviada(i.diego, i.rc, v, 1);
  if p_ate = 'ENVIADA' then return v; end if;
  perform portal_proposta_resposta(i.diego, i.rc, v, 2, jsonb_build_object(
    'resposta', case p_ate when 'NEGOCIACAO' then 'MUDANCA' when 'RECUSADA' then 'RECUSOU' else 'ACEITOU' end,
    'em', '2026-11-12', 'canal', 'PRESENCIAL', 'motivo', case when p_ate = 'RECUSADA' then 'VALOR_ALTO' end));
  return v;
end $$;
create temp table pr as select
  pg_temp.proposta(cli.mar, 'Rascunho de Marina', 'RASCUNHO') mar_ras,
  pg_temp.proposta(cli.mar, 'Revisão de aposentadoria', 'ENVIADA') mar_env,
  pg_temp.proposta(cli.mar, 'Pensão de Marina', 'NEGOCIACAO') mar_neg,
  pg_temp.proposta(cli.mar, 'Benefício por incapacidade', 'ACEITA') mar_ace,
  pg_temp.proposta(cli.rui, 'Rascunho de Rui', 'RASCUNHO') rui_ras,
  pg_temp.proposta(cli.rui, 'Despejo de Rui', 'ENVIADA') rui_env,
  pg_temp.proposta(cli.rui, 'Cobrança de Rui', 'NEGOCIACAO') rui_neg,
  pg_temp.proposta(cli.rui, 'Inventário de Rui', 'ACEITA') rui_ace,
  pg_temp.proposta(cli.rui, 'Usucapião de Rui', 'RECUSADA') rui_rec,
  pg_temp.proposta(cli.ana, 'Divórcio de Ana', 'ENVIADA') ana_env,
  pg_temp.proposta(cli.ana, 'Inventário de Ana', 'ACEITA') ana_ace,
  pg_temp.proposta(cli.ivo, 'Trabalhista de Ivo', 'ENVIADA') ivo_env
  from cli;

-- O contrato de Rui (direto, sem proposta), para ele ter vínculo e ser arquivado.
select portal_contrato_criar(socia, rc, jsonb_build_object('clienteId', cli.rui, 'objeto', 'Consultoria de Rui',
  'responsavelId', socia, 'advogados', jsonb_build_array(socia),
  'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'FIXO', 'valor', 350000, 'vencimento', '2026-12-10')))) from ids, cli;

create function pg_temp.lista(p_mostrar text, p_q text default null) returns jsonb language sql as $$
  select portal_propostas(diego, rc, p_mostrar, p_q) from ids $$;
create function pg_temp.ids_de(p jsonb) returns uuid[] language sql as $$
  select coalesce(array_agg((x ->> 'id')::uuid order by x ->> 'id'), '{}') from jsonb_array_elements(p -> 'propostas') x $$;
create function pg_temp.so(variadic p uuid[]) returns uuid[] language sql as $$ select array_agg(x order by x::text) from unnest(p) x $$;

-- 1. Antes da exclusão e do arquivamento: tudo em andamento.
select is((select pg_temp.lista('ANDAMENTO') -> 'contagem'), '{"andamento": 11, "contrato": 0, "recusadas": 1, "encerradas": 0}'::jsonb,
  'AP-05: antes, as onze abertas estão em andamento e nenhuma encerrada');
select ok((select bool_and(not proposta_esta_encerrada(p)) from propostas p, ids where p.escritorio_id = ids.rc), 'F3.204: antes, nenhuma proposta está encerrada');

-- 2. Marina é excluída, Rui é arquivado a pedido e Ivo fica inativo (não a pedido).
select portal_cliente_excluir_dados(ids.socia, ids.rc, cli.mar, c.versao,
  jsonb_build_object('pedidoEm', hoje_brasilia(), 'canal', 'WHATSAPP', 'quemPediu', 'TITULAR', 'conferido', true, 'nomeConfirmado', c.nome))
  from ids, cli, clientes_escritorio c where c.id = cli.mar;
select portal_cliente_arquivar_lgpd(socia, rc, cli.rui, c.versao, jsonb_build_object('pedidoEm', hoje_brasilia(), 'canal', 'EMAIL',
  'quemPediu', 'TITULAR', 'conferido', true)) from ids, cli, clientes_escritorio c where c.id = cli.rui;
select portal_cliente_inativar(diego, rc, cli.ivo, c.versao, 'Desistiu da ação') from ids, cli, clientes_escritorio c where c.id = cli.ivo;
-- A validade passa (28/11), para conferir que a encerrada não diz "validade vencida".
select ajustar_relogio(('2026-12-02 10:00-03'::timestamptz - now()));

-- O que a exclusão deixou (ela sobe a versão das propostas de Marina: a conta das leituras parte daqui; revisão, b5).
create temp table antes as select
  (select jsonb_object_agg(p.id, jsonb_build_array(p.estado, p.versao)) from propostas p, ids where p.escritorio_id = ids.rc) propostas,
  (select count(*) from historico h, ids where h.escritorio_id = ids.rc) historico;

-- 3. A regra única.
select ok((select bool_and(proposta_esta_encerrada(p) = (p.id = any (array[pr.mar_ras, pr.mar_env, pr.mar_neg, pr.mar_ace, pr.rui_ras, pr.rui_env, pr.rui_neg, pr.rui_ace])))
             from propostas p, pr, ids where p.escritorio_id = ids.rc),
  'PT-11 F3.204: encerradas são as abertas e a aceita do excluído e do arquivado; a recusada do arquivado, a do ativo e a do inativo não');
select ok((select bool_and(proposta_encerrada(p, k) is not distinct from proposta_esta_encerrada(p))
             from propostas p join clientes_escritorio k on k.id = p.cliente_id and k.escritorio_id = p.escritorio_id, ids where p.escritorio_id = ids.rc),
  'F3.204 (revisão, b7): proposta_esta_encerrada lê o cliente e dá o mesmo que a regra no join');
select is((select array_agg(estado order by criado_em, numero) from propostas p, cli where p.cliente_id = cli.mar),
  array['RASCUNHO', 'ENVIADA', 'NEGOCIACAO', 'ACEITA'],
  'PT-03 (revisão, A1): o estado gravado do excluído não muda (rascunho, enviada, em negociação e aceita)');

-- 4. A lista de Propostas.
select is((select pg_temp.lista('ANDAMENTO') -> 'contagem'), '{"andamento": 3, "contrato": 0, "recusadas": 1, "encerradas": 8}'::jsonb,
  'AP-05: a contagem sai de "Em andamento" e entra em "Encerradas a pedido"');
select is(pg_temp.ids_de(pg_temp.lista('ANDAMENTO')), (select pg_temp.so(ana_env, ana_ace, ivo_env) from pr),
  'AP-05: "Em andamento" fica com as do ativo e a do inativo');
select is(pg_temp.ids_de(pg_temp.lista('ENCERRADAS')),
  (select pg_temp.so(mar_ras, mar_env, mar_neg, mar_ace, rui_ras, rui_env, rui_neg, rui_ace) from pr),
  'AP-05 F3.204 P2: o filtro "Encerradas a pedido" lista as oito');
select is(pg_temp.ids_de(pg_temp.lista('RECUSADAS')), (select array[rui_rec] from pr),
  'F3.204: a recusada do arquivado continua em "Recusadas" (recusou de fato)');
select ok((select bool_and((x ->> 'encerrada')::boolean and not (x ->> 'vencida')::boolean and x -> 'retorno' = 'null'::jsonb)
             from jsonb_array_elements(pg_temp.lista('ENCERRADAS') -> 'propostas') x),
  'F3.204: na encerrada, `encerrada` verdadeiro, sem "validade vencida" e sem retorno');
select is((select jsonb_agg(x ->> 'situacao' order by x ->> 'situacao') from jsonb_array_elements(pg_temp.lista('ENCERRADAS', 'rui') -> 'propostas') x),
  '["ACEITA", "ENVIADA", "NEGOCIACAO", "RASCUNHO"]'::jsonb,
  'F3.204 (revisão, A1): a situação na lista continua o estado gravado; a busca segue o filtro escolhido');
select is((select jsonb_build_array(x ->> 'enviadaEm' is not null, x ->> 'respondidaEm')
             from jsonb_array_elements(pg_temp.lista('ENCERRADAS') -> 'propostas') x, pr where (x ->> 'id')::uuid = pr.rui_ace),
  '[true, "2026-11-12"]'::jsonb, 'F3.204: a linha traz quando foi enviada e respondida ("Aceita em 12/11")');
select is((select jsonb_array_length(pg_temp.lista('ANDAMENTO', 'rui') -> 'propostas')), 0, 'F3.204: buscar Rui em "Em andamento" não acha a encerrada');
select is((select jsonb_build_array((x ->> 'encerrada')::boolean, (x ->> 'vencida')::boolean)
             from jsonb_array_elements(pg_temp.lista('ANDAMENTO') -> 'propostas') x, pr where (x ->> 'id')::uuid = pr.ana_env),
  '[false, true]'::jsonb, 'F3.204: a do ativo continua com a validade vencida e sem a marca');
select is((teste.erro($$ select portal_propostas(diego, rc, 'ARQUIVADAS') from ids $$)) -> 'detalhe' -> 'campos', '["mostrar"]'::jsonb,
  'F3.204: outro filtro continua recusado');

-- 5. A ficha da proposta e a aba Propostas da ficha do cliente.
select is((select jsonb_build_array(f ->> 'situacao', f -> 'encerrada', f -> 'retornoCompleto', f ->> 'clienteSituacao')
             from ids, pr, portal_proposta(diego, rc, pr.mar_env) f),
  '["ENVIADA", true, null, "EXCLUIDO"]'::jsonb, 'F3.204: a ficha da enviada do excluído: situação gravada, encerrada e sem retorno');
select is((select jsonb_build_array(f ->> 'situacao', f -> 'encerrada', f ->> 'clienteSituacao') from ids, pr, portal_proposta(diego, rc, pr.rui_ace) f),
  '["ACEITA", true, "ARQUIVADO"]'::jsonb, 'F3.204: a aceita do arquivado continua ACEITA (a ficha da F3.181 não muda), com a marca');
select is((select jsonb_build_array(f -> 'encerrada', f -> 'retornoCompleto' is not null) from ids, pr, portal_proposta(diego, rc, pr.ana_env) f),
  '[false, true]'::jsonb, 'F3.204: a ficha do ativo continua com o retorno');
select is((select jsonb_object_agg(x ->> 'servico', x -> 'encerrada') from ids, cli, jsonb_array_elements(portal_cliente_itens(socia, rc, cli.rui, 'PROPOSTAS') -> 'propostas') x),
  '{"Despejo de Rui": true, "Rascunho de Rui": true, "Cobrança de Rui": true, "Inventário de Rui": true, "Usucapião de Rui": false}'::jsonb,
  'F3.204 (revisão, b2): a aba Propostas da ficha do cliente recebe a marca pela proposta_linha');

-- 6. As leituras não gravam nada.
select is((select jsonb_object_agg(p.id, jsonb_build_array(p.estado, p.versao)) from propostas p, ids where p.escritorio_id = ids.rc),
  (select propostas from antes), 'F3.204 (revisão, b5): depois das leituras, nenhuma proposta muda de estado nem de versão');
select is((select count(*) from historico h, ids where h.escritorio_id = ids.rc), (select historico from antes),
  'PT-03 F3.204: as leituras não gravam histórico (não há transição: é leitura)');

-- 7. R1: a contagem bate com a regra.
select is((select (pg_temp.lista('ANDAMENTO') -> 'contagem' ->> 'encerradas')::bigint),
  (select count(*) from propostas p, ids where p.escritorio_id = ids.rc and proposta_esta_encerrada(p)),
  'F3.204 (plano, R1): "Encerradas a pedido" conta o mesmo que a regra única');

-- 8. PT-01: o isolamento.
select is((select portal_propostas(intrusa, outro, 'ENCERRADAS') -> 'contagem' from ids), '{"andamento": 0, "contrato": 0, "recusadas": 0, "encerradas": 0}'::jsonb,
  'PT-01: o outro escritório não vê as encerradas de Reis & Coelho');
select isnt((teste.erro($$ select portal_propostas(intrusa, rc, 'ENCERRADAS') from ids $$)), null,
  'PT-01: quem não é do escritório não lê a lista dele');

select * from finish();
rollback;
