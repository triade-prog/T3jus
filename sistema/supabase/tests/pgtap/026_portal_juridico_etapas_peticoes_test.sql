-- Jurídico do Portal, parte 3a: etapas do escritório (só a sócia dona edita; adicionar antes da
-- final, editar com versão, subir e descer, a final fixa, tirar com os casos indo para outra
-- etapa e nada sumindo) e a resposta sobre o gerador de petições (EX-07, EX-09, PT-01, PT-03).
begin;
select plan(27);

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Felipe Matos') as felipe,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, felipe, 'Felipe Matos', array['JURIDICO']) from ids;

create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Joana Pereira', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Joana Pereira', 'telefone', '+5511985521034', 'principal', true)))) ->> 'id')::uuid joana
  from ids;

select is((select jsonb_array_length(portal_juridico_etapas(felipe, rm) -> 'etapas') from ids), 8, 'as 8 sugeridas nascem no primeiro uso');
select is((select portal_juridico_etapas(felipe, rm) ->> 'podeEditar' from ids), 'false', 'a equipe vê, mas não edita');
select is((select portal_juridico_etapas(socia, rm) ->> 'podeEditar' from ids), 'true', 'a sócia dona edita');
create temp table et as select
  (select id from etapas, ids where escritorio_id = ids.rm and ordem = 2) peticao,
  (select id from etapas, ids where escritorio_id = ids.rm and ordem = 3) citacao,
  (select id from etapas, ids where escritorio_id = ids.rm and ordem = 6) recurso,
  (select id from etapas, ids where escritorio_id = ids.rm and final) final;

create temp table cs as select
  (portal_juridico_caso_criar(socia, rm, jsonb_build_object('nome', 'Pereira x Mercado Bom Preço', 'area', 'TRABALHISTA',
     'etapaId', et.recurso, 'responsavelId', ids.socia,
     'clientes', jsonb_build_array(jsonb_build_object('clienteId', cli.joana, 'papel', 'AUTOR')))) ->> 'id')::uuid pereira
  from ids, cli, et;

-- Só a sócia dona.
select is((teste.erro($$ select portal_juridico_etapa_salvar(felipe, rm, null, null, '{"nome": "Perícia", "textoCliente": "é a fase da perícia."}') from ids $$)) ->> 'codigo',
  'TC401', 'a equipe não adiciona etapa');

-- Adicionar: entra antes da final.
select is((teste.erro($$ select portal_juridico_etapa_salvar(socia, rm, null, null, '{"nome": "X", "textoCliente": "curto"}') from ids $$)) -> 'detalhe' -> 'campos',
  '["nome", "textoCliente"]'::jsonb, 'nome e texto para o cliente conferidos');
select is((teste.erro($$ select portal_juridico_etapa_salvar(socia, rm, null, null, '{"nome": "sentenca", "textoCliente": "o juiz decidiu o caso."}') from ids $$)) -> 'detalhe' ->> 'motivo',
  'ETAPA_NOME_REPETIDO', 'nome repetido, mesmo sem acento, é recusado');
create temp table nova as select (portal_juridico_etapa_salvar(socia, rm, null, null,
  '{"nome": "Acordo", "descricao": "Negociação", "textoCliente": "estamos negociando um acordo com a outra parte.", "avisaFinanceiro": true}') ->> 'id')::uuid id from ids;
select is((select ordem from etapas, nova where etapas.id = nova.id), 8, 'a nova etapa entra antes da final');
select is((select ordem from etapas, et where etapas.id = et.final), 9, 'a final continua a última');
select ok((select exists (select 1 from historico h, nova where h.acao = 'juridico.etapa_criada' and h.entidade_id = nova.id::text)), 'fica no histórico');

-- Editar com versão.
select is((select (portal_juridico_etapa_salvar(socia, rm, et.recurso, 1, '{"nome": "Recursos", "textoCliente": "vamos pedir para o tribunal rever a decisão."}') ->> 'versao')::int from ids, et),
  2, 'editar sobe a versão');
select is((teste.erro($$ select portal_juridico_etapa_salvar(socia, rm, et.recurso, 1, '{"nome": "Recurso", "textoCliente": "vamos pedir para o tribunal rever a decisão."}') from ids, et $$)) ->> 'codigo',
  'TC409', 'versão velha dá conflito');
select is((select portal_juridico_caso(socia, rm, cs.pereira) -> 'etapa' ->> 'nome' from ids, cs), 'Recursos', 'o caso continua na mesma etapa, com o nome novo');
select is((select (portal_juridico_etapa_salvar(socia, rm, et.final, (select versao from etapas where id = et.final), '{"nome": "Encerrado", "textoCliente": "o seu caso terminou. Obrigado.", "avisaFinanceiro": true}') ->> 'id')::uuid from ids, et),
  (select final from et), 'a final aceita texto novo');
select is((select avisa_financeiro from etapas, et where etapas.id = et.final), false, 'a final não avisa o Financeiro por aqui (ela pede o resultado)');

-- Subir e descer.
select is((select jsonb_path_query_array(portal_juridico_etapa_mover(socia, rm, et.citacao, 'SOBE'), '$[0 to 2].nome') from ids, et),
  '["Preparação", "Citação e defesa", "Petição inicial"]'::jsonb, 'subir troca com a de cima');
select is((teste.erro($$ select portal_juridico_etapa_mover(socia, rm, nova.id, 'DESCE') from ids, nova $$)) -> 'detalhe' ->> 'motivo',
  'ETAPA_FINAL_FIXA', 'ninguém troca de lugar com a final');
select is((teste.erro($$ select portal_juridico_etapa_mover(socia, rm, et.final, 'SOBE') from ids, et $$)) -> 'detalhe' ->> 'motivo',
  'ETAPA_FINAL_FIXA', 'a final não sobe');

-- Tirar.
select is((teste.erro($$ select portal_juridico_etapa_remover(socia, rm, et.recurso, null) from ids, et $$)) -> 'detalhe' -> 'campos',
  '["moverPara"]'::jsonb, 'etapa com casos pede para onde eles vão');
select is((teste.erro($$ select portal_juridico_etapa_remover(socia, rm, et.recurso, et.final) from ids, et $$)) -> 'detalhe' -> 'campos',
  '["moverPara"]'::jsonb, 'os casos não vão para a final por aqui');
select is((select portal_juridico_etapa_remover(socia, rm, et.recurso, nova.id) ->> 'casosMovidos' from ids, et, nova), '1', 'tirar move os casos');
select is((select portal_juridico_caso(socia, rm, cs.pereira) -> 'mudancas' -> 0 ->> 'motivo' from ids, cs),
  'A etapa “Recursos” saiu da lista do escritório.', 'o caso ganha a mudança no histórico dele');
select is((select jsonb_path_query_array(etapas_lista(rm), '$[*].ordem') from ids), '[1, 2, 3, 4, 5, 6, 7, 8]'::jsonb,
  'a etapa sai da lista e a ordem fecha sem buraco; nada é apagado');
select is((teste.erro($$ select portal_juridico_caso_etapa(socia, rm, cs.pereira, (select versao from casos where id = cs.pereira), jsonb_build_object('etapaId', et.recurso, 'motivo', 'Volta')) from ids, cs, et $$)) -> 'detalhe' -> 'campos',
  '["etapaId"]'::jsonb, 'nenhum caso entra na etapa tirada');

-- Petições (EX-09).
select is((teste.erro($$ select portal_juridico_peticoes_responder(felipe, rm, '{"resposta": "TALVEZ"}') from ids $$)) -> 'detalhe' -> 'campos',
  '["resposta"]'::jsonb, 'a resposta é uma das três');
select is((select portal_juridico_peticoes_responder(felipe, rm, '{"resposta": "AS_VEZES", "comoFazHoje": "Copio a última inicial."}') ->> 'resposta' from ids), 'AS_VEZES', 'responde');
select is((select portal_juridico_peticoes(felipe, rm) -> 'minhaResposta' ->> 'comoFazHoje' from ids), 'Copio a última inicial.', 'a página mostra a resposta dada');
select is((teste.erro($$ select portal_juridico_etapa_remover(intrusa, outro, et.citacao, null) from ids, et $$)) ->> 'codigo', 'TC404',
  'PT-01: etapa de outro escritório não é encontrada');

select * from finish();
rollback;
