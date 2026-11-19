-- Jurídico do Portal, parte 3b: documentos do caso. Pedir o que falta a um cliente do caso,
-- pedir de novo, "Já chegou" com e sem arquivo, o envio em duas etapas, nada se apaga, o que
-- falta em "O que está travando" e nas pendências, e o isolamento (EX-05, PD-05, PT-01).
begin;
select plan(27);

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Felipe Matos') as felipe,
  teste.pessoa('Rita Souza') as rita,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, felipe, 'Felipe Matos', array['JURIDICO']) from ids;
select portal_convidar(socia, rm, rita, 'Rita Souza', array['COMERCIAL']) from ids;

create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Joana Pereira', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Joana Pereira', 'telefone', '+5511985521034', 'principal', true)))) ->> 'id')::uuid joana,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Carlos Dias', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Carlos Dias', 'telefone', '+5511977001122', 'principal', true)))) ->> 'id')::uuid carlos,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Fora do Caso', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Fora do Caso', 'telefone', '+5511966001122', 'principal', true)))) ->> 'id')::uuid fora
  from ids;
select portal_juridico_etapas(socia, rm) from ids;

create temp table cs as select
  (portal_juridico_caso_criar(socia, rm, jsonb_build_object('nome', 'Pereira x Mercado Bom Preço', 'area', 'TRABALHISTA',
     'etapaId', (select id from etapas where escritorio_id = ids.rm and ordem = 3), 'responsavelId', ids.socia,
     'clientes', jsonb_build_array(jsonb_build_object('clienteId', cli.joana, 'papel', 'AUTOR'),
                                   jsonb_build_object('clienteId', cli.carlos, 'papel', 'AUTOR')))) ->> 'id')::uuid pereira
  from ids, cli;

-- Pedir o que falta.
select is((teste.erro($$ select portal_juridico_documento_pedir(felipe, rm, cs.pereira, jsonb_build_object('descricao', 'X', 'clienteId', cli.fora)) from ids, cs, cli $$)) -> 'detalhe' -> 'campos',
  '["descricao", "clienteId"]'::jsonb, 'descrição curta e cliente fora do caso são recusados');
select is((teste.erro($$ select portal_juridico_documento_pedir(rita, rm, cs.pereira, jsonb_build_object('descricao', 'CTPS digital', 'clienteId', cli.carlos)) from ids, cs, cli $$)) ->> 'codigo',
  'TC401', 'sem a área Jurídico, não pede');
select is((teste.erro($$ select portal_juridico_documento_pedir(intrusa, outro, cs.pereira, jsonb_build_object('descricao', 'CTPS digital', 'clienteId', cli.carlos)) from ids, cs, cli $$)) ->> 'codigo',
  'TC404', 'outro escritório não acha o caso');
create temp table pd as select
  (portal_juridico_documento_pedir(felipe, rm, cs.pereira, jsonb_build_object('descricao', 'CTPS digital de Carlos', 'clienteId', cli.carlos)) ->> 'id')::uuid ctps,
  (portal_juridico_documento_pedir(felipe, rm, cs.pereira, jsonb_build_object('descricao', 'Holerites de janeiro a março de 2025', 'clienteId', cli.joana)) ->> 'id')::uuid holerites
  from ids, cs, cli;

create temp table f1 as select portal_juridico_caso(felipe, rm, cs.pereira) j from ids, cs;
select is((select jsonb_array_length(j -> 'faltam') from f1), 2, 'a ficha mostra os 2 que faltam');
select is((select j -> 'faltam' -> 0 -> 'cliente' ->> 'nome' from f1), 'Carlos Dias', 'com quem está o documento');
select is((select j -> 'faltam' -> 0 -> 'cliente' ->> 'telefone' from f1), '+5511977001122', 'e o WhatsApp do cliente, para pedir de novo');
select is((select (j ->> 'pendencias')::int from f1), 2, 'o que falta conta como pendência do caso');
select is((select (c ->> 'pendencias')::int from ids, cs, jsonb_array_elements(portal_juridico_casos(felipe, rm) -> 'casos') c where (c ->> 'id')::uuid = cs.pereira),
  2, 'e aparece na lista de casos');
select is((select j ->> 'escritorio' from f1), 'Ribeiro & Matos', 'a ficha traz o nome do escritório para o texto do pedido');
select ok((select exists (select 1 from historico h, cs where h.acao = 'juridico.documento_pedido' and h.entidade_id = cs.pereira::text)), 'o pedido fica no histórico');

-- Pedir de novo.
select is((select portal_juridico_documento_repedir(felipe, rm, pd.ctps) ->> 'repedidoEm' from ids, pd), hoje_brasilia()::text, 'pedir de novo guarda a data');

-- Já chegou, sem arquivo.
select ok((select portal_juridico_documento_chegou(felipe, rm, pd.holerites) ->> 'chegouEm' is not null from ids, pd), 'já chegou fecha o pedido');
select is((teste.erro($$ select portal_juridico_documento_chegou(felipe, rm, pd.holerites) from ids, pd $$)) -> 'detalhe' ->> 'motivo',
  'DOCUMENTO_JA_CHEGOU', 'não chega duas vezes');
select is((teste.erro($$ select portal_juridico_documento_repedir(felipe, rm, pd.holerites) from ids, pd $$)) -> 'detalhe' ->> 'motivo',
  'DOCUMENTO_JA_CHEGOU', 'nem se pede de novo o que chegou');
select is((teste.erro($$ select portal_juridico_documento_chegou(intrusa, outro, pd.ctps) from ids, pd $$)) ->> 'codigo',
  'TC404', 'outro escritório não mexe no pedido');

-- Enviar arquivo: em duas etapas.
select is((teste.erro($$ select portal_juridico_documento_iniciar(felipe, rm, cs.pereira, '{"categoria": "PETICAO", "nome": "a/b.pdf", "tipo": "application/pdf", "tamanho": 100}') from ids, cs $$)) -> 'detalhe' -> 'campos',
  '["arquivo"]'::jsonb, 'nome com barra é recusado');
select is((teste.erro($$ select portal_juridico_documento_iniciar(felipe, rm, cs.pereira, '{"categoria": "PETICAO", "nome": "x.exe", "tipo": "application/x-msdownload", "tamanho": 100}') from ids, cs $$)) -> 'detalhe' -> 'campos',
  '["arquivo"]'::jsonb, 'tipo fora de PDF, JPG e PNG é recusado');
select is((teste.erro($$ select portal_juridico_documento_iniciar(felipe, rm, cs.pereira, jsonb_build_object('categoria', 'DOCUMENTO_CLIENTE', 'nome', 'h.pdf', 'tipo', 'application/pdf', 'tamanho', 100, 'pedidoId', pd.holerites)) from ids, cs, pd $$)) -> 'detalhe' -> 'campos',
  '["pedidoId"]'::jsonb, 'não liga o arquivo a um pedido que já chegou');
create temp table dc as select
  portal_juridico_documento_iniciar(felipe, rm, cs.pereira, '{"categoria": "PETICAO", "nome": "peticao-inicial.pdf", "tipo": "application/pdf", "tamanho": 1100000}') inicial,
  portal_juridico_documento_iniciar(felipe, rm, cs.pereira, jsonb_build_object('categoria', 'DOCUMENTO_CLIENTE', 'nome', 'ctps-carlos.pdf', 'tipo', 'application/pdf', 'tamanho', 220000, 'pedidoId', pd.ctps)) ctps
  from ids, cs, pd;
select is((select jsonb_array_length(portal_juridico_caso(felipe, rm, cs.pereira) -> 'documentos') from ids, cs), 0, 'enviando não aparece na ficha');
select is((teste.erro($$ select portal_juridico_documento_concluir(socia, rm, dc.inicial) from ids, dc $$)) ->> 'codigo',
  'TC404', 'só quem iniciou conclui');
select portal_juridico_documento_concluir(felipe, rm, dc.inicial), portal_juridico_documento_concluir(felipe, rm, dc.ctps) from ids, dc;

create temp table f2 as select portal_juridico_caso(socia, rm, cs.pereira) j from ids, cs;
select is((select jsonb_array_length(j -> 'documentos') from f2), 2, 'os 2 arquivos ficam ligados ao caso');
select is((select jsonb_array_length(j -> 'faltam') from f2), 0, 'o arquivo do pedido fecha o pedido');
select is((select (j ->> 'pendencias')::int from f2), 0, 'e a pendência some');
select is((select portal_juridico_documento_abrir(socia, rm, dc.inicial) from ids, dc), 'peticao-inicial.pdf', 'abrir devolve o nome para baixar');
select is((teste.erro($$ select portal_juridico_documento_abrir(intrusa, outro, dc.inicial) from ids, dc $$)) ->> 'codigo', 'TC404', 'outro escritório não abre');

-- Nada se apaga.
select throws_ok($$ delete from documentos_caso where id = (select inicial from dc) $$, 'TC023', null, 'arquivo não se apaga');
select throws_ok($$ delete from documento_pedidos where id = (select ctps from pd) $$, 'TC023', null, 'pedido não se apaga');

select * from finish();
rollback;
