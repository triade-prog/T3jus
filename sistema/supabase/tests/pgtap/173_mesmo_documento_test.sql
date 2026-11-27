-- O outro cadastro com o mesmo CPF na exclusão e no arquivamento a pedido do titular (1143; F3.188,
-- PT-11; C7 na B', C8, revisão A1, M3 e D4): a lista dos outros cadastros (sem o de outro escritório e
-- sem o excluído), a conferência dos ids marcados (a exclusão que falha não abre pedido), o pedido aberto
-- no outro com a mesma data, o mesmo canal e quem pediu, a observação fixa, o evento certo e nenhum
-- rastro do protocolo nem do id do excluído (A1), o cadastro que já tinha pedido, o arquivado, o
-- Portal de antes (sem a chave), o arquivamento (C8), a PJ (CNPJ) e a segunda exclusão, que acha o
-- pedido aberto e atende.
begin;
select plan(27);

select ajustar_relogio(('2026-11-26 10:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Paula Reis') as socia,
  teste.pessoa('Diego Martins') as diego,
  teste.pessoa('Intrusa Souza') as intrusa,
  teste.escritorio('Reis & Coelho') as rc,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rc, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rc, diego, 'Diego Martins', array['COMERCIAL']) from ids;

create function pg_temp.cli(p_pessoa uuid, p_esc uuid, p jsonb) returns uuid language sql as $$
  select (portal_cliente_cadastrar(p_pessoa, p_esc, '{"tipo": "PF", "origem": "GOOGLE", "contatos": [{"nome": "Contato", "telefone": "+5511984723316", "principal": true}]}'::jsonb
    || p) ->> 'id')::uuid
$$;
create function pg_temp.contrato(p_cliente uuid) returns void language sql as $$
  select null from (select portal_contrato_criar(socia, rc, jsonb_build_object('clienteId', p_cliente, 'objeto', 'Indenização', 'responsavelId', socia,
    'advogados', jsonb_build_array(socia), 'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'FIXO', 'valor', 300000, 'vencimento', '2026-12-05'))))
    from ids) x
$$;
create function pg_temp.dados(p_nome text, p_ids jsonb) returns jsonb language sql as $$
  select jsonb_build_object('pedidoEm', '2026-11-20', 'canal', 'WHATSAPP', 'quemPediu', 'TITULAR', 'conferido', true, 'nomeConfirmado', p_nome)
         || case when p_ids is null then '{}'::jsonb else jsonb_build_object('abrirNoMesmoDocumento', p_ids) end
$$;
create function pg_temp.excluir(p_cliente uuid, p_ids jsonb) returns jsonb language sql as $$
  select portal_cliente_excluir_dados(ids.socia, ids.rc, c.id, c.versao, pg_temp.dados(c.nome, p_ids))
    from ids, clientes_escritorio c where c.id = p_cliente
$$;

-- Marina tem 4 outros cadastros com o mesmo CPF: ativo, inativo, arquivado e um com pedido aberto.
create temp table cli as select
  pg_temp.cli(socia, rc, '{"nome": "Marina Alves Coelho", "documento": "529.982.247-25"}') mar,
  pg_temp.cli(socia, rc, '{"nome": "Marina A. Coelho", "documento": "52998224725"}') mac,
  pg_temp.cli(socia, rc, '{"nome": "M. Inativa Coelho", "documento": "529.982.247-25"}') mi,
  pg_temp.cli(socia, rc, '{"nome": "M. Arquivada Coelho", "documento": "529.982.247-25"}') arq,
  pg_temp.cli(socia, rc, '{"nome": "M. Já Pedida Coelho", "documento": "529.982.247-25"}') ja,
  pg_temp.cli(intrusa, outro, '{"nome": "Marina de Fora", "documento": "529.982.247-25"}') fora,
  pg_temp.cli(socia, rc, '{"nome": "Pedro Coelho", "documento": "488.213.907-30"}') pedro,
  pg_temp.cli(socia, rc, '{"nome": "Pedro C. Duplicado", "documento": "488.213.907-30"}') pedro2,
  pg_temp.cli(socia, rc, '{"tipo": "PJ", "nome": "Padaria Estrela Ltda", "documento": "11.222.333/0001-81", "rep_nome": "Rui"}') pj,
  pg_temp.cli(socia, rc, '{"tipo": "PJ", "nome": "Padaria Estrela", "documento": "11222333000181", "rep_nome": "Rui"}') pj2
  from ids;
select portal_cliente_inativar(socia, rc, cli.mi, 1, 'Desistiu') from ids, cli;
select pg_temp.contrato(cli.arq) from cli;
select portal_cliente_arquivar_lgpd(socia, rc, cli.arq, c.versao, pg_temp.dados(c.nome, null)) from ids, cli, clientes_escritorio c where c.id = cli.arq;
select portal_cliente_pedir_exclusao(diego, rc, cli.ja, '{"pedidoEm": "2026-11-18", "canal": "EMAIL"}') from ids, cli;

-- 1. A lista dos outros cadastros.
select is((select jsonb_agg(jsonb_build_array(x ->> 'id', x ->> 'situacao', x -> 'contratoOuProcesso', x -> 'pedidoAberto'))
             from ids, cli, jsonb_array_elements(cliente_mesmo_documento(rc, cli.mar) -> 'lista') x),
  (select jsonb_build_array(jsonb_build_array(arq, 'ARQUIVADO', true, false), jsonb_build_array(mi, 'INATIVO', false, false),
                            jsonb_build_array(ja, 'ATIVO', false, true), jsonb_build_array(mac, 'ATIVO', false, false)) from cli),
  'F3.188: os outros cadastros com o mesmo CPF, em ordem de cadastro (e de nome, no mesmo instante), com a situação, o contrato e o pedido aberto');
select is((select cliente_mesmo_documento(rc, cli.mar) -> 'mais' from ids, cli), '0'::jsonb, 'F3.188: sem mais de 5, mais é 0');
select ok((select not (cliente_mesmo_documento(rc, cli.mar)::text like '%' || cli.fora || '%') from ids, cli),
  'PT-01: o cadastro de outro escritório com o mesmo CPF fica de fora');
select is((select cliente_mesmo_documento(outro, cli.fora) -> 'lista' from ids, cli), '[]'::jsonb, 'PT-01: e o de lá não vê os daqui');

-- 2. A conferência dos ids marcados: a exclusão que falha não muda nada e não abre pedido.
select is((select teste.erro(format('select pg_temp.excluir(%L, %L)', cli.mar, jsonb_build_array(cli.fora))) -> 'detalhe' -> 'campos' from cli),
  '["abrirNoMesmoDocumento"]'::jsonb, 'B'': o id de outro escritório é erro de campo');
select is((select teste.erro(format('select pg_temp.excluir(%L, %L)', cli.mar, jsonb_build_array(cli.arq))) -> 'detalhe' -> 'campos' from cli),
  '["abrirNoMesmoDocumento"]'::jsonb, 'B'': o arquivado não aceita outro pedido');
select is((select teste.erro(format('select pg_temp.excluir(%L, %L)', cli.mar, jsonb_build_array(cli.pedro))) -> 'detalhe' -> 'campos' from cli),
  '["abrirNoMesmoDocumento"]'::jsonb, 'B'': o cadastro com outro CPF também');
select is((select teste.erro(format('select pg_temp.excluir(%L, %L)', cli.mar, '"x"')) -> 'detalhe' -> 'campos' from cli),
  '["abrirNoMesmoDocumento"]'::jsonb, 'B'': o que não é lista de ids');
select is((select estado || ' ' || (select count(*) from pedidos_exclusao where escritorio_id = ids.rc) from ids, cli, clientes_escritorio where id = cli.mar),
  'ATIVO 2', 'A exclusão recusada não exclui e não abre pedido');

-- 3. A exclusão com o ativo, o inativo e o que já tem pedido marcados.
create temp table r as select pg_temp.excluir(cli.mar, jsonb_build_array(cli.mac, cli.mi, cli.ja, cli.mac)) res from cli;
select is((select res -> 'mesmoDocumento' from r),
  (select jsonb_build_array(jsonb_build_object('id', mi, 'nome', 'M. Inativa Coelho'), jsonb_build_object('id', ja, 'nome', 'M. Já Pedida Coelho'),
                            jsonb_build_object('id', mac, 'nome', 'Marina A. Coelho')) from cli),
  'M3: o retorno traz os outros cadastros que ficaram com pedido aberto');
select is((select jsonb_build_array(x.pedido_em, x.canal, x.quem_pediu, x.estado, x.registrado_por = ids.socia, x.observacao)
             from pedidos_exclusao x, cli, ids where x.cliente_id = cli.mac),
  jsonb_build_array('2026-11-20', 'WHATSAPP', 'TITULAR', 'PENDENTE', true,
    'Aberto pela sócia dona ao atender o pedido de outro cadastro com o mesmo CPF. Confira se é a mesma pessoa.'),
  'C7 B'': o outro ganha o pedido com a mesma data, o mesmo canal, quem pediu e a observação fixa, registrado pela dona');
select is((select count(*) from pedidos_exclusao x, cli where x.cliente_id = cli.mi and x.estado = 'PENDENTE'), 1::bigint, 'C7 B'': o inativo também');
select is((select count(*) || ' ' || bool_and(registrado_por = ids.diego) from pedidos_exclusao x, cli, ids where x.cliente_id = cli.ja), '1 true',
  'O que já tinha pedido fica com o pedido de antes');
select is((select count(*) from pedidos_exclusao x, cli where x.cliente_id = cli.arq and x.estado = 'PENDENTE'), 0::bigint, 'O arquivado não ganha pedido');
select is((select pedido_exclusao_json(x) ->> 'origem' from pedidos_exclusao x, cli where x.cliente_id = cli.mac),
  'MESMO_DOCUMENTO', 'M4: o pedido vem com a origem, para a faixa da ficha');
select is((select pedido_exclusao_json(x) ->> 'origem' from pedidos_exclusao x, cli where x.cliente_id = cli.ja), null, 'M4: o pedido comum vem sem origem');

-- 4. A1: nada liga o outro cadastro ao excluído.
select is((select count(*) from historico h, cli, r
             where (h.entidade_id in (cli.mac::text, cli.mi::text)
                    or h.entidade_id in (select x.id::text from pedidos_exclusao x where x.cliente_id in (cli.mac, cli.mi)))
               and (h.dados::text like '%' || (r.res ->> 'protocolo') || '%' or h.dados::text like '%' || cli.mar || '%')),
  0::bigint, 'A1: nenhum histórico do outro cadastro nem do pedido dele tem o protocolo ou o id do excluído');
select is((select count(*) from pedidos_exclusao x, cli, r where x.cliente_id in (cli.mac, cli.mi)
             and (to_jsonb(x)::text like '%' || (r.res ->> 'protocolo') || '%' or to_jsonb(x)::text like '%' || cli.mar || '%')),
  0::bigint, 'A1: nem o pedido');
select is((select h.dados from historico h, pedidos_exclusao x, cli where x.cliente_id = cli.mac and h.acao = 'estado.mudou'
             and h.entidade = 'pedidos_exclusao' and h.entidade_id = x.id::text),
  '{"para": "PENDENTE", "evento": "PEDIDO_REGISTRADO"}'::jsonb, 'A1: o guardião grava PEDIDO_REGISTRADO, sem motivo');
select is((select h.dados - 'pedido_id' from historico h, cli where h.acao = 'cliente.exclusao_pedida' and h.entidade_id = cli.mac::text),
  '{"canal": "WHATSAPP"}'::jsonb, 'A1: o evento do outro cadastro só com o pedido e o canal');

-- 5. A segunda exclusão (a da outra aba, com Marina marcada): Marina já foi excluída, então o id é
-- ignorado, e o pedido aberto de Marina A. Coelho é atendido.
select is((select pg_temp.excluir(cli.mac, jsonb_build_array(cli.mar)) -> 'mesmoDocumento' from cli),
  (select jsonb_build_array(jsonb_build_object('id', mi, 'nome', 'M. Inativa Coelho'), jsonb_build_object('id', ja, 'nome', 'M. Já Pedida Coelho')) from cli),
  'A segunda exclusão ignora o cadastro já excluído e atende o pedido aberto');
select is((select string_agg(estado, ',' order by registrado_em) from pedidos_exclusao x, cli where x.cliente_id = cli.mac), 'ATENDIDO',
  'O pedido aberto pelo mesmo CPF vira o atendido');

-- 6. O Portal de antes (sem a chave) e a caixa desmarcada: nenhum pedido no outro.
select is((select pg_temp.excluir(cli.pedro, null) -> 'mesmoDocumento' from cli), '[]'::jsonb, 'Sem a chave, nenhum pedido é aberto');
select is((select count(*) from pedidos_exclusao x, cli where x.cliente_id = cli.pedro2), 0::bigint, 'E Pedro C. Duplicado fica como está');

-- 7. C8: o arquivamento também abre o pedido.
select pg_temp.contrato(cli.pedro2) from cli;
select pg_temp.cli(socia, rc, '{"nome": "Pedro Triplo", "documento": "488.213.907-30"}') from ids;
select is((select portal_cliente_arquivar_lgpd(ids.socia, ids.rc, c.id, c.versao,
             pg_temp.dados(c.nome, (select jsonb_agg(id) from clientes_escritorio where nome = 'Pedro Triplo'))) -> 'mesmoDocumento' -> 0 ->> 'nome'
             from ids, cli, clientes_escritorio c where c.id = cli.pedro2),
  'Pedro Triplo', 'C8: ao arquivar, o outro cadastro ganha o pedido');

-- 8. PJ: a observação diz CNPJ.
select pg_temp.excluir(cli.pj, jsonb_build_array(cli.pj2)) from cli;
select is((select observacao from pedidos_exclusao x, cli where x.cliente_id = cli.pj2),
  'Aberto pela sócia dona ao atender o pedido de outro cadastro com o mesmo CNPJ. Confira se é a mesma pessoa.', 'PJ: a observação diz CNPJ');
select is((select pedido_exclusao_json(x) ->> 'origem' from pedidos_exclusao x, cli where x.cliente_id = cli.pj2), 'MESMO_DOCUMENTO', 'PJ: com a origem');

select * from finish();
rollback;
