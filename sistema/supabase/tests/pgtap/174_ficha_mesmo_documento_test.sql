-- A ficha com o outro cadastro do mesmo CPF (1143; F3.188, PT-11, C8, M4): mesmoDocumento e
-- mesmoDocumentoMais vêm só para a sócia dona, no cliente ativo ou inativo, com ou sem contrato (a
-- janela de excluir e a de arquivar); vazio sem outro cadastro; até 5, com o resto em
-- mesmoDocumentoMais; não vêm para quem não é a dona nem no excluído; e o pedido aberto pelo mesmo CPF
-- chega à ficha do outro com a origem, para a dona e para a equipe.
begin;
select plan(10);

select ajustar_relogio(('2026-11-26 10:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Paula Reis') as socia,
  teste.pessoa('Diego Martins') as diego,
  teste.escritorio('Reis & Coelho') as rc;
select teste.vincular(socia, rc, 'SOCIO') from ids;
select portal_convidar(socia, rc, diego, 'Diego Martins', array['COMERCIAL']) from ids;

create function pg_temp.cli(p jsonb) returns uuid language sql as $$
  select (portal_cliente_cadastrar(ids.socia, ids.rc, '{"tipo": "PF", "origem": "GOOGLE", "contatos": [{"nome": "Contato", "telefone": "+5511984723316", "principal": true}]}'::jsonb
    || p) ->> 'id')::uuid from ids
$$;
create temp table cli as select
  pg_temp.cli('{"nome": "Marina Alves Coelho", "documento": "529.982.247-25"}') mar,
  pg_temp.cli('{"nome": "Marina A. Coelho", "documento": "52998224725"}') mac,
  pg_temp.cli('{"nome": "Pedro Coelho", "documento": "488.213.907-30"}') pedro,
  pg_temp.cli('{"nome": "Cris Sem Documento"}') cris;
-- Mais 5 cadastros com o CPF de Marina, uma hora depois: 6 outros ao todo.
select ajustar_relogio(('2026-11-26 11:00-03'::timestamptz - now()));
select pg_temp.cli(jsonb_build_object('nome', 'Marina ' || n, 'documento', '52998224725')) from generate_series(1, 5) n;

select is((select jsonb_array_length(portal_cliente(socia, rc, cli.mar) -> 'mesmoDocumento') || ' ' || (portal_cliente(socia, rc, cli.mar) ->> 'mesmoDocumentoMais')
             from ids, cli), '5 1', 'F3.188: a dona vê até 5 outros cadastros, e o resto em mesmoDocumentoMais');
select is((select portal_cliente(socia, rc, cli.mar) -> 'mesmoDocumento' -> 0 ->> 'id' from ids, cli), (select mac::text from cli),
  'F3.188: o mais antigo primeiro');
select is((select portal_cliente(socia, rc, cli.pedro) -> 'mesmoDocumento' from ids, cli), '[]'::jsonb, 'F3.188: sem outro cadastro, a lista vem vazia');
select is((select portal_cliente(socia, rc, cli.cris) -> 'mesmoDocumento' from ids, cli), '[]'::jsonb, 'F3.188: sem documento, também');
select ok((select not (portal_cliente(diego, rc, cli.mar) ? 'mesmoDocumento') from ids, cli), 'PT-11: quem não é a dona não recebe');

-- Com contrato, a janela é a de arquivar (C8): a chave vem também.
select portal_contrato_criar(socia, rc, jsonb_build_object('clienteId', cli.mac, 'objeto', 'Indenização', 'responsavelId', socia,
  'advogados', jsonb_build_array(socia), 'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'FIXO', 'valor', 300000, 'vencimento', '2026-12-05'))))
  from ids, cli;
select is((select portal_cliente(socia, rc, cli.mac) -> 'mesmoDocumento' -> 0 ->> 'id' from ids, cli), (select mar::text from cli),
  'C8: com contrato (a janela de arquivar), a dona também vê o outro cadastro');
select is((select portal_cliente(socia, rc, cli.mar) -> 'mesmoDocumento' -> 0 -> 'contratoOuProcesso' from ids, cli), 'true'::jsonb,
  'F3.188: o outro com contrato vem marcado (o pedido dele vira arquivamento)');

-- A exclusão abre o pedido em Marina A. Coelho; a ficha dela traz a origem para a dona e para a equipe.
select portal_cliente_excluir_dados(socia, rc, c.id, c.versao, jsonb_build_object('pedidoEm', '2026-11-20', 'canal', 'WHATSAPP',
  'quemPediu', 'TITULAR', 'conferido', true, 'nomeConfirmado', c.nome, 'abrirNoMesmoDocumento', jsonb_build_array(cli.mac)))
  from ids, cli, clientes_escritorio c where c.id = cli.mar;
select ok((select not (portal_cliente(socia, rc, cli.mar) ? 'mesmoDocumento') from ids, cli), 'PT-11: o excluído não traz a chave');
select is((select portal_cliente(socia, rc, cli.mac) -> 'pedidoExclusao' ->> 'origem' from ids, cli), 'MESMO_DOCUMENTO', 'M4: a dona vê a origem do pedido');
select is((select portal_cliente(diego, rc, cli.mac) -> 'pedidoExclusao' ->> 'origem' from ids, cli), 'MESMO_DOCUMENTO', 'M4: a equipe também (a faixa fica neutra)');

select * from finish();
rollback;
