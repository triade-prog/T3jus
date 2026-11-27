-- O pedido de contrato e o lembrete de contrato do cliente excluído e do arquivado a pedido do titular
-- (1140; F3.181 e F3.186, PT-11, IN-01, VA-05): o pedido do excluído e do arquivado sai de Contratos
-- (na leitura; a proposta continua ACEITA e com o pedido, PT-03); pedir, abrir o formulário pela
-- proposta e a ficha da proposta tratam o cliente que saiu; o lembrete do excluído sai das três
-- listas, dos totais e da faixa (o detalhe guardado da dispensa não aparece em nenhuma leitura de
-- tela), continua no banco, e "De onde vieram" conta tudo o que a importação criou; o lembrete do
-- arquivado fica; as contagens da janela (saiDeContratos); o isolamento entre escritórios.
begin;
select plan(44);

select ajustar_relogio(('2026-11-26 10:00-03'::timestamptz - now()));
-- A saída das entradas sem acesso (0540) não entra neste teste.
update inventario_dados set situacao = 'PROPOSTA' where tabela = 'pessoas';

create temp table ids as select
  teste.pessoa('Paula Reis') as socia,
  teste.pessoa('Diego Martins') as diego,
  teste.pessoa('Bianca Torres') as bianca,
  teste.pessoa('Intrusa Souza') as intrusa,
  teste.escritorio('Reis & Coelho') as rc,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rc, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rc, diego, 'Diego Martins', array['COMERCIAL']),
       portal_convidar(socia, rc, bianca, 'Bianca Torres', array['CONTRATOS']) from ids;

-- O backup do Astrea com os contatos e os lançamentos em aberto (sem processos: os clientes são excluíveis).
create function pg_temp.importar(p_contatos jsonb, p_lanc jsonb) returns uuid language plpgsql as $$
declare
  v uuid;
  j jsonb;
  f uuid;
begin
  j := portal_importacao_criar((select socia from ids), (select rc from ids), jsonb_build_object(
    'arquivoNome', 'backup-astrea.xlsx', 'oQue', 'CLIENTES', 'origem', 'ASTREA', 'modelo', 'astrea-2026-11',
    'abas', jsonb_build_array(
      jsonb_build_object('nome', 'Contatos', 'colunas', jsonb_build_array('Nome', 'Tipo', 'Celular'), 'linhas', p_contatos),
      jsonb_build_object('nome', 'Lançamentos', 'colunas', jsonb_build_array('Data', 'Cliente', 'Processo', 'Descrição', 'Valor', 'Situação', 'Tipo'),
        'linhas', p_lanc)),
    'sistema', jsonb_build_array(
      jsonb_build_object('nome', 'Contatos', 'linhas', jsonb_array_length(p_contatos), 'destino', 'CLIENTES', 'reconhecida', true,
                         'porModelo', jsonb_build_object('0', 'nome', '1', 'tipo_contato', '2', 'telefone')),
      jsonb_build_object('nome', 'Lançamentos', 'linhas', jsonb_array_length(p_lanc), 'destino', 'FINANCEIRO', 'reconhecida', true,
                         'porModelo', jsonb_build_object('0', 'lanc_data', '1', 'cliente', '2', 'numero', '3', 'lanc_descricao', '4', 'lanc_valor',
                                                         '5', 'lanc_situacao', '6', 'lanc_tipo')))));
  v := (j ->> 'id')::uuid;
  perform portal_importacao_colunas((select socia from ids), (select rc from ids), v, (select versao from importacoes where id = v),
    jsonb_build_object('aba', 0, 'ligacao', j -> 'ligacao'));
  f := (portal_importacao_importar((select socia from ids), (select rc from ids), v, (select versao from importacoes where id = v)) -> 'filhaFinanceiro' ->> 'id')::uuid;
  perform portal_importacao_colunas((select socia from ids), (select rc from ids), f, (select versao from importacoes where id = f),
    jsonb_build_object('ligacao', (select ligacao from importacoes where id = f)));
  perform portal_importacao_importar((select socia from ids), (select rc from ids), f, (select versao from importacoes where id = f));
  return f;
end $$;

create temp table fin as select pg_temp.importar(
  jsonb_build_array(
    jsonb_build_array('Marina Alves Coelho', 'Cliente', '(11) 97012-3348'),
    jsonb_build_array('Bia Reis Prado', 'Cliente', '(11) 98841-2073'),
    jsonb_build_array('Ana Ativa Lima', 'Cliente', '(11) 96231-0457'),
    jsonb_build_array('Rui Arquivado Matos', 'Cliente', '(11) 95555-1234'),
    jsonb_build_array('Eva Ativa Nunes', 'Cliente', '(11) 94444-1234')),
  jsonb_build_array(
    jsonb_build_array('05/10/2025', 'Marina Alves Coelho', '', 'Parcela 1 de Marina', '1.000,00', 'Em aberto', 'Receita'),
    jsonb_build_array('05/11/2025', 'Marina Alves Coelho', '', 'Parcela 2 de Marina', '540,00', 'Em aberto', 'Receita'),
    jsonb_build_array('05/12/2025', 'Marina Alves Coelho', '', 'Parcela 3 de Marina', '300,00', 'Em aberto', 'Receita'),
    jsonb_build_array('20/01/2026', 'Bia Reis Prado', '', 'Honorários de Bia', '700,00', 'Em aberto', 'Receita'),
    jsonb_build_array('10/03/2026', 'Ana Ativa Lima', '', 'Honorários de Ana', '900,00', 'Em aberto', 'Receita'),
    jsonb_build_array('10/04/2026', 'Rui Arquivado Matos', '', 'Honorários de Rui', '400,00', 'Em aberto', 'Receita'),
    jsonb_build_array('10/05/2026', 'Eva Ativa Nunes', '', 'Honorários de Eva', '250,00', 'Em aberto', 'Receita'))) id;

create temp table cli as select
  (select id from clientes_escritorio where nome = 'Marina Alves Coelho' and escritorio_id = ids.rc) mar,
  (select id from clientes_escritorio where nome = 'Bia Reis Prado' and escritorio_id = ids.rc) bia,
  (select id from clientes_escritorio where nome = 'Ana Ativa Lima' and escritorio_id = ids.rc) ana,
  (select id from clientes_escritorio where nome = 'Rui Arquivado Matos' and escritorio_id = ids.rc) rui,
  (select id from clientes_escritorio where nome = 'Eva Ativa Nunes' and escritorio_id = ids.rc) eva,
  (portal_cliente_cadastrar(socia, rc, jsonb_build_object('tipo', 'PF', 'origem', 'GOOGLE', 'nome', 'Cris Sem Nada',
    'contatos', jsonb_build_array(jsonb_build_object('nome', 'Cris', 'telefone', '+5511984723316', 'principal', true)))) ->> 'id')::uuid cris
  from ids;
create temp table lm as select
  (select id from lembrete_contrato, cli where cliente_id = cli.mar) mar,
  (select id from lembrete_contrato, cli where cliente_id = cli.bia) bia,
  (select id from lembrete_contrato, cli where cliente_id = cli.ana) ana,
  (select id from lembrete_contrato, cli where cliente_id = cli.rui) rui,
  (select id from lembrete_contrato, cli where cliente_id = cli.eva) eva
  from cli;
-- Bia dispensa o lembrete com o detalhe escrito (fica guardado até o marco pela F3.177).
select portal_lembrete_dispensar(bianca, rc, lm.bia, '{"motivo": "OUTRO", "detalhe": "Bia pagou em dinheiro ao Dr. José"}') from ids, lm;

-- As propostas aceitas. Diego pede o contrato de algumas.
create function pg_temp.aceita(p_cliente uuid, p_servico text, p_pedir boolean default true) returns uuid language plpgsql as $$
declare v uuid; i ids;
begin
  select * into i from ids;
  v := (portal_proposta_criar(i.diego, i.rc, jsonb_build_object('clienteId', p_cliente, 'servico', p_servico, 'escopo', 'Ação e acompanhamento.',
    'responsavelId', i.diego, 'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'FIXO', 'valor', 350000, 'vencimento', '2026-12-10')),
    'retorno', jsonb_build_object('em', '2026-11-30', 'responsavelId', i.diego))) ->> 'id')::uuid;
  perform portal_proposta_enviada(i.diego, i.rc, v, 1);
  perform portal_proposta_resposta(i.diego, i.rc, v, 2, jsonb_build_object('resposta', 'ACEITOU', 'em', '2026-11-12', 'canal', 'PRESENCIAL'));
  if p_pedir then perform portal_proposta_pedir_contrato(i.diego, i.rc, v); end if;
  return v;
end $$;
create temp table pr as select
  pg_temp.aceita(cli.mar, 'Benefício por incapacidade de Marina') mar,
  pg_temp.aceita(cli.mar, 'Revisão da pensão de Marina', false) mar_sem,
  pg_temp.aceita(cli.ana, 'Inventário de Ana') ana,
  pg_temp.aceita(cli.ana, 'Divórcio de Ana', false) ana_sem,
  pg_temp.aceita(cli.rui, 'Despejo de Rui') rui,
  pg_temp.aceita(cli.rui, 'Cobrança de Rui', false) rui_sem,
  pg_temp.aceita(cli.rui, 'Contrato de Rui', false) rui_ctr
  from cli;
-- O contrato de Rui (pela proposta), para ele ter vínculo e ser arquivado.
select portal_contrato_criar(socia, rc, jsonb_build_object('clienteId', cli.rui, 'propostaId', pr.rui_ctr, 'objeto', 'Contrato de Rui',
  'responsavelId', socia, 'advogados', jsonb_build_array(socia),
  'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'FIXO', 'valor', 350000, 'vencimento', '2026-12-10')))) from ids, cli, pr;

create function pg_temp.numero(p uuid) returns text language sql as $$ select numero from propostas where id = p $$;
create function pg_temp.pedidos() returns text[] language sql as $$
  select coalesce(array_agg(x -> 'proposta' ->> 'numero' order by x -> 'proposta' ->> 'numero'), '{}')
    from ids, jsonb_array_elements(portal_contratos_pedidos(bianca, rc)) x $$;
create function pg_temp.lista(p_sit text) returns jsonb language sql as $$ select portal_contratos_lembretes(bianca, rc, p_sit) from ids $$;
create function pg_temp.ids_lista(p_sit text) returns uuid[] language sql as $$
  select coalesce(array_agg((x ->> 'id')::uuid order by x ->> 'id'), '{}') from jsonb_array_elements(pg_temp.lista(p_sit) -> 'lembretes') x $$;

-- 1. As peças e o antes.
select ok((select bool_and(pedido_contrato_pendente(p) = (p.id in (pr.mar, pr.ana, pr.rui))) from propostas p, pr, ids where p.escritorio_id = ids.rc),
  'F3.181: pedido_contrato_pendente é a proposta aceita, pedida e sem contrato');
select is(pg_temp.pedidos(), (select array_agg(pg_temp.numero(x) order by pg_temp.numero(x)) from pr, unnest(array[pr.mar, pr.ana, pr.rui]) x),
  'F3.181: antes, o bloco de Contratos tem os três pedidos');
select is((select portal_cliente(socia, rc, cli.mar) -> 'saiDeContratos' from ids, cli),
  jsonb_build_object('pedidos', jsonb_build_array(pg_temp.numero((select mar from pr))),
                     'lembretes', jsonb_build_object('n', 1, 'valor', 184000, 'lancamentos', 3, 'origem', 'ASTREA')),
  'F3.181 F3.186: a janela de Marina diz o pedido que sai e o lembrete de R$ 1.840,00 em aberto no Astrea, com 3 lançamentos');
select is((select portal_cliente(socia, rc, cli.cris) -> 'saiDeContratos' from ids, cli), '{"pedidos": [], "lembretes": null}'::jsonb,
  'F3.181 F3.186: sem pedido e sem lembrete, a chave vem vazia');
select is((select portal_cliente(socia, rc, cli.bia) -> 'saiDeContratos' -> 'lembretes' from ids, cli), 'null'::jsonb,
  'F3.186: o lembrete dispensado não conta como o que sai (já não está nos abertos)');
select ok((select not (portal_cliente(diego, rc, cli.mar) ? 'saiDeContratos') from ids, cli), 'F3.181: quem não é a dona não recebe a chave');
select is((select portal_cliente(socia, rc, cli.rui) -> 'saiDeContratos' from ids, cli),
  jsonb_build_object('pedidos', jsonb_build_array(pg_temp.numero((select rui from pr))), 'lembretes', null),
  'F3.181 C2: na janela de arquivar (com contrato), vem só o pedido que sai; o lembrete do arquivado fica na lista');
select ok((select not (portal_cliente(socia, rc, cli.rui) ? 'conversasParaApagar') from ids, cli),
  'F3.190: na janela de arquivar não vêm as conversas (nada se apaga)');
select is((select (pg_temp.lista('ABERTO') -> 'totais' -> 'abertos' ->> 'n')::int), 3, 'F3.186: antes, Marina, Ana e Eva estão nos abertos (o de Rui virou contrato)');

-- 2. A exclusão de Marina e de Bia e o arquivamento de Rui.
create function pg_temp.excluir(p_cliente uuid) returns jsonb language sql as $$
  select portal_cliente_excluir_dados(ids.socia, c.escritorio_id, p_cliente, c.versao,
    jsonb_build_object('pedidoEm', hoje_brasilia(), 'canal', 'WHATSAPP', 'quemPediu', 'TITULAR', 'conferido', true, 'nomeConfirmado', c.nome))
    from clientes_escritorio c, ids where c.id = p_cliente
$$;
select pg_temp.excluir(mar), pg_temp.excluir(bia) from cli;
select portal_cliente_arquivar_lgpd(socia, rc, cli.rui, c.versao, jsonb_build_object('pedidoEm', hoje_brasilia(), 'canal', 'EMAIL',
  'quemPediu', 'TITULAR', 'conferido', true)) from ids, cli, clientes_escritorio c where c.id = cli.rui;
create temp table avisos_antes as select count(*)::int n from avisos_sino;

-- 3. F3.181: o bloco de Contratos.
select is(pg_temp.pedidos(), array[pg_temp.numero((select ana from pr))], 'F3.181 C1 C2: o pedido do excluído e o do arquivado saem de Contratos');
select ok((select bool_and(p.estado = 'ACEITA' and p.contrato_pedido_em is not null) from propostas p, pr where p.id in (pr.mar, pr.rui)),
  'PT-03 F3.181: nada se apaga: as propostas continuam aceitas e com o pedido');

-- 4. Pedir de novo.
select is((teste.erro($$ select portal_proposta_pedir_contrato(diego, rc, pr.mar_sem) from ids, pr $$)) -> 'detalhe' ->> 'motivo', 'CLIENTE_EXCLUIDO',
  'F3.181 C1: pedir o contrato do cliente excluído é recusado');
select is((teste.erro($$ select portal_proposta_pedir_contrato(diego, rc, pr.mar) from ids, pr $$)) -> 'detalhe' ->> 'motivo', 'CLIENTE_EXCLUIDO',
  'F3.181 (revisão, b6): também o já pedido, antes do "já pedido" (a página velha recebe a recusa)');
select is((teste.erro($$ select portal_proposta_pedir_contrato(diego, rc, pr.rui_sem) from ids, pr $$)) -> 'detalhe' ->> 'motivo', 'CLIENTE_ARQUIVADO',
  'F3.181 C2: pedir o contrato do cliente arquivado a pedido é recusado');
select ok((select contrato_pedido_em is null from propostas, pr where id = pr.mar_sem), 'F3.181: a proposta recusada continua sem pedido');
select is((select count(*)::int from avisos_sino), (select n from avisos_antes), 'F3.181: nenhum aviso novo nasce da recusa');
select is((teste.erro($$ select portal_proposta_pedir_contrato(diego, rc, pr.ana) from ids, pr $$)), null,
  'F3.181: o já pedido do cliente ativo continua como antes, em silêncio');
select is((teste.erro($$ select portal_proposta_pedir_contrato(diego, rc, pr.ana_sem) from ids, pr $$)), null,
  'F3.181: pedir o contrato do cliente ativo funciona como antes');
select is(pg_temp.pedidos(), (select array_agg(pg_temp.numero(x) order by pg_temp.numero(x)) from pr, unnest(array[pr.ana, pr.ana_sem]) x),
  'e entra na lista');
select portal_contrato_criar(socia, rc, jsonb_build_object('clienteId', cli.ana, 'propostaId', pr.ana, 'objeto', 'Inventário de Ana',
  'responsavelId', socia, 'advogados', jsonb_build_array(socia),
  'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'FIXO', 'valor', 350000, 'vencimento', '2026-12-10')))) from ids, cli, pr;
select is((teste.erro($$ select portal_proposta_pedir_contrato(diego, rc, pr.ana) from ids, pr $$)) -> 'detalhe' ->> 'motivo', 'PROPOSTA_NAO_ACEITA',
  'F3.181 (revisão, b6): a proposta que já virou contrato não recebe o pedido (confere sobre a versão travada)');
select is((teste.erro($$ select portal_proposta_pedir_contrato(intrusa, outro, pr.ana_sem) from ids, pr $$)) ->> 'codigo', 'TC404',
  'PT-01: de outro escritório, a proposta não existe');

-- 5. O formulário do contrato pela proposta.
select is((teste.erro($$ select portal_contrato_da_proposta(bianca, rc, pr.mar) from ids, pr $$)) -> 'detalhe' ->> 'motivo', 'CLIENTE_EXCLUIDO',
  'F3.181: o formulário pela proposta do cliente excluído é recusado (o link do sino)');
select is((teste.erro($$ select portal_contrato_da_proposta(bianca, rc, pr.rui) from ids, pr $$)) -> 'detalhe' ->> 'motivo', 'CLIENTE_ARQUIVADO',
  'F3.181 C2: e o do arquivado');
select is((select portal_contrato_da_proposta(bianca, rc, pr.ana_sem) ->> 'numero' from ids, pr), pg_temp.numero((select ana_sem from pr)),
  'F3.181: o do cliente ativo abre como antes');
select is((teste.erro($$ select portal_contrato_da_proposta(intrusa, outro, pr.mar) from ids, pr $$)) ->> 'codigo', 'TC404',
  'PT-01: de outro escritório, não existe');

-- 6. A ficha da proposta.
select is((select portal_proposta(diego, rc, pr.mar) ->> 'clienteSituacao' from ids, pr), 'EXCLUIDO', 'F3.181: a ficha da proposta diz que o cliente foi excluído');
select is((select (portal_proposta(diego, rc, pr.mar) ->> 'clienteSaiuEm')::timestamptz from ids, pr), (select excluido_em from clientes_escritorio, cli where id = cli.mar),
  'F3.181: com a data da exclusão');
select is((select portal_proposta(diego, rc, pr.rui) ->> 'clienteSituacao' || ' ' || ((portal_proposta(diego, rc, pr.rui) ->> 'clienteSaiuEm')::timestamptz
                    = (select arquivado_em from clientes_escritorio where id = cli.rui))::text from ids, pr, cli), 'ARQUIVADO true',
  'F3.181 C2 (revisão, M5): o arquivado, com a data do arquivamento');
select is((select portal_proposta(diego, rc, pr.ana_sem) -> 'clienteSituacao' || jsonb_build_array(portal_proposta(diego, rc, pr.ana_sem) -> 'clienteSaiuEm') from ids, pr),
  '["ATIVO", null]'::jsonb, 'F3.181: o ativo, sem data');
select ok((select bool_and(not (x ? 'clienteSituacao')) from ids, jsonb_array_elements(portal_propostas(diego, rc, 'ANDAMENTO') -> 'propostas') x),
  'F3.181: a lista do Comercial não muda (as chaves ficam fora de proposta_linha)');

-- 7. F3.186: os lembretes.
select is(pg_temp.ids_lista('ABERTO'), (select array[lm.eva] from lm),
  'F3.186 C4: o lembrete aberto do excluído sai de Abertos; o do ativo fica');
select is((select (pg_temp.lista('ABERTO') ->> 'total')::int), 1, 'F3.186: o total da lista não conta o excluído');
select is(pg_temp.ids_lista('DISPENSADO'), '{}'::uuid[], 'F3.186 C4: o dispensado do excluído sai de Dispensados');
select ok((select lm.rui = any (pg_temp.ids_lista('CONTRATO')) and lm.ana = any (pg_temp.ids_lista('CONTRATO')) from lm),
  'F3.186 (R7): o lembrete do arquivado continua na lista, como o do ativo');
select is((select pg_temp.lista('ABERTO') -> 'totais'), jsonb_build_object('abertos', jsonb_build_object('n', 1, 'valor', 25000),
  'contrato', jsonb_build_object('n', 2, 'valor', 130000), 'dispensados', jsonb_build_object('n', 0, 'valor', 0)),
  'F3.186: os totais dos três grupos não contam o excluído');
select is((select portal_contratos_lembretes_resumo(bianca, rc) - 'importadoEm' from ids),
  '{"clientes": 1, "abertos": 1, "valor": 25000, "origem": "ASTREA"}'::jsonb, 'F3.186: a faixa de Contratos não conta o excluído');
select is((select (x ->> 'lembretes')::int || ' ' || (x ->> 'valor') from jsonb_array_elements(pg_temp.lista('ABERTO') -> 'importacoes') x), '5 409000',
  'F3.186 (revisão, b8): "De onde vieram" conta tudo o que a importação criou, como a tela da importação');
select is((select count(*)::int from unnest(array['ABERTO', 'CONTRATO', 'DISPENSADO']) s where pg_temp.lista(s)::text like '%Dr. José%'), 0,
  'F3.186 (achado 1): o detalhe guardado da dispensa do excluído não aparece em nenhuma lista');
select ok((select dispensa_detalhe = 'Bia pagou em dinheiro ao Dr. José' and desfeito_em is null from lembrete_contrato, lm where id = lm.bia),
  'F3.177 F3.186: o lembrete continua no banco, com o detalhe guardado até o marco');
select is((select count(*)::int from lembrete_contrato, cli where cliente_id in (cli.mar, cli.bia)), 2, 'PT-03 F3.186: nada se apaga');
select is((teste.erro($$ select portal_lembrete_dispensar(bianca, rc, lm.mar, '{"motivo": "PERDOADO"}') from ids, lm $$)) -> 'detalhe' ->> 'motivo',
  'CLIENTE_EXCLUIDO', 'F3.186: dispensar o lembrete do excluído continua recusado (a tela trata o código)');
select is((teste.erro($$ select portal_lembrete_trazer(bianca, rc, lm.bia) from ids, lm $$)) -> 'detalhe' ->> 'motivo',
  'CLIENTE_EXCLUIDO', 'F3.186: trazer de volta também');
select is((select (portal_contratos_lembretes(intrusa, outro, 'ABERTO') ->> 'total')::int from ids), 0, 'PT-01: o outro escritório não vê os lembretes');

-- 8. A ficha do excluído e do arquivado não traz as chaves da janela.
select ok((select not (portal_cliente(socia, rc, cli.mar) ? 'saiDeContratos') and not (portal_cliente(socia, rc, cli.rui) ? 'saiDeContratos') from ids, cli),
  'F3.181: depois da exclusão ou do arquivamento, a chave não vem');

select * from finish();
rollback;
