-- Jurídico do Portal, parte 1: as 8 etapas sugeridas, cadastrar caso com clientes e contratos,
-- número do CNJ, lista com contagem por etapa e busca, ficha sem honorários para quem não tem
-- Contratos nem Financeiro, mudar etapa com motivo e aviso gravado, etapa final com resultado,
-- histórico só de acréscimo, quem sai passa os casos, área e isolamento
-- (EX-01, EX-03, EX-07, EX-10, EX-14, CH-05, PA-01, PT-01).
begin;
select plan(30);

select ajustar_relogio(('2026-11-19 10:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Paula Nunes') as paula,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, diego, 'Diego Almeida', array['JURIDICO']),
       portal_convidar(socia, rm, paula, 'Paula Nunes', array['CONTRATOS']) from ids;

create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Benedito Souza Lima', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Benedito Souza Lima', 'telefone', '+5511996027736', 'principal', true)))) ->> 'id')::uuid ben,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Rosa Lima', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Rosa Lima', 'telefone', '+5511996027737', 'principal', true)))) ->> 'id')::uuid rosa
  from ids;
create temp table cli_outro as select
  (portal_cliente_cadastrar(intrusa, outro, jsonb_build_object('tipo', 'PF', 'nome', 'Cliente de lá', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Cliente de lá', 'telefone', '+5511996027739', 'principal', true)))) ->> 'id')::uuid id
  from ids;
create temp table ct as select
  (portal_contrato_criar(paula, rm, jsonb_build_object('clienteId', cli.ben, 'objeto', 'Reclamação trabalhista',
     'responsavelId', ids.paula, 'advogados', jsonb_build_array(ids.paula),
     'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'MENSAL', 'valor', 150000, 'primeiro', '2027-01-05', 'meses', 6)))) ->> 'id')::uuid id
  from ids, cli;

-- Número do CNJ.
select ok(numero_cnj_valido('10012347720265020011'), 'CNJ: dígito verificador certo');
select ok(not numero_cnj_valido('10012347820265020011'), 'CNJ: dígito verificador errado');

-- Área e isolamento.
select is((teste.erro($$ select portal_juridico_casos(paula, rm) from ids $$)) -> 'detalhe' ->> 'motivo', 'AREA_NAO_LIBERADA',
  'PA-01: sem a área Jurídico, a lista é recusada');

-- Primeiro uso: as 8 etapas sugeridas.
select is((select jsonb_path_query_array(portal_juridico_casos(diego, rm) -> 'etapas', '$[*].nome') from ids),
  '["Preparação", "Petição inicial", "Citação e defesa", "Instrução", "Sentença", "Recurso", "Cumprimento", "Encerrado"]'::jsonb,
  'EX-07: o escritório começa com as 8 etapas sugeridas');
select is((select count(*)::integer from etapas, ids where escritorio_id = rm), 8, 'abrir de novo não duplica as etapas');
select is((select jsonb_path_query_array(portal_juridico_casos(diego, rm) -> 'etapas', '$[*] ? (@.final == true).nome') from ids),
  '["Encerrado"]'::jsonb, 'a última é a final');
select is((select jsonb_path_query_array(portal_juridico_casos(diego, rm) -> 'etapas', '$[*] ? (@.avisaFinanceiro == true).nome') from ids),
  '["Cumprimento"]'::jsonb, 'Cumprimento avisa o Financeiro');

create temp table et as select
  (select id from etapas, ids where escritorio_id = rm and ordem = 1) prep,
  (select id from etapas, ids where escritorio_id = rm and ordem = 2) inicial,
  (select id from etapas, ids where escritorio_id = rm and ordem = 8) fim;

-- Cadastrar: campos.
select is((teste.erro($$ select portal_juridico_caso_criar(diego, rm, '{}'::jsonb) from ids $$)) -> 'detalhe' -> 'campos',
  '["area", "clientes", "etapaId", "nome", "responsavelId"]'::jsonb, 'cadastrar sem nada aponta os campos');
select is((teste.erro($$ select portal_juridico_caso_criar(diego, rm, jsonb_build_object('nome', 'Benedito x Metalúrgica', 'area', 'TRABALHISTA',
  'numero', '1001234-78.2026.5.02.0011', 'etapaId', et.fim, 'responsavelId', ids.diego,
  'clientes', jsonb_build_array(jsonb_build_object('clienteId', cli_outro.id, 'papel', 'AUTOR')))) from ids, et, cli_outro $$)) -> 'detalhe' -> 'campos',
  '["clientes", "etapaId", "numero"]'::jsonb, 'cliente de outro escritório, etapa final e número errado são recusados');
select is((teste.erro($$ select portal_juridico_caso_criar(diego, rm, jsonb_build_object('nome', 'Benedito x Metalúrgica', 'area', 'TRABALHISTA',
  'etapaId', et.prep, 'responsavelId', ids.diego,
  'clientes', jsonb_build_array(jsonb_build_object('clienteId', cli.rosa, 'papel', 'AUTOR', 'contratoId', ct.id)))) from ids, et, cli, ct $$)) -> 'detalhe' -> 'campos',
  '["clientes"]'::jsonb, 'CH-05: o contrato precisa ser do mesmo cliente');

create temp table cs as select
  (portal_juridico_caso_criar(diego, rm, jsonb_build_object('nome', 'Benedito x Metalúrgica Paulista', 'area', 'TRABALHISTA',
     'parteContraria', 'Metalúrgica Paulista S.A.', 'numero', '1001234-77.2026.5.02.0011', 'tribunal', 'TRT-2', 'vara', '11ª Vara do Trabalho de São Paulo',
     'sistema', 'PJe', 'distribuidoEm', '2026-11-10', 'valorCausa', 8500000, 'etapaId', et.inicial, 'responsavelId', ids.diego,
     'clientes', jsonb_build_array(jsonb_build_object('clienteId', cli.ben, 'papel', 'AUTOR', 'contratoId', ct.id),
                                   jsonb_build_object('clienteId', cli.rosa, 'papel', 'INTERESSADO')))) ->> 'id')::uuid ben,
  (portal_juridico_caso_criar(diego, rm, jsonb_build_object('nome', 'Rosa, inventário', 'area', 'FAMILIA', 'etapaId', et.prep,
     'responsavelId', ids.socia, 'clientes', jsonb_build_array(jsonb_build_object('clienteId', cli.rosa, 'papel', 'AUTOR')))) ->> 'id')::uuid rosa
  from ids, et, cli, ct;

select is((teste.erro($$ select portal_juridico_caso_criar(diego, rm, jsonb_build_object('nome', 'Outro com o mesmo número', 'area', 'TRABALHISTA',
  'numero', '10012347720265020011', 'etapaId', et.prep, 'responsavelId', ids.diego,
  'clientes', jsonb_build_array(jsonb_build_object('clienteId', cli.rosa, 'papel', 'AUTOR')))) from ids, et, cli $$)) -> 'detalhe' ->> 'motivo',
  'NUMERO_JA_CADASTRADO', 'o mesmo número não entra duas vezes');

-- Lista.
select is((select portal_juridico_casos(diego, rm) -> 'totais' from ids), '{"andamento": 2, "prazoHoje": 0, "encerrados": 0}'::jsonb, 'dois em andamento');
select is((select jsonb_path_query_array(portal_juridico_casos(diego, rm) -> 'etapas', '$[0 to 1].casos') from ids), '[1, 1]'::jsonb,
  'contagem por etapa');
select is((select jsonb_path_query_array(portal_juridico_casos(diego, rm, 'ANDAMENTO', 'metalurgica paulista') -> 'casos', '$[*].nome') from ids),
  '["Benedito x Metalúrgica Paulista"]'::jsonb, 'busca pela parte contrária, sem acento');
select is((select jsonb_path_query_array(portal_juridico_casos(diego, rm, 'ANDAMENTO', '1001234') -> 'casos', '$[*].nome') from ids),
  '["Benedito x Metalúrgica Paulista"]'::jsonb, 'busca pelo número');
select is((select jsonb_path_query_array(portal_juridico_casos(diego, rm, 'ANDAMENTO', 'rosa') -> 'casos', '$[*].nome') from ids),
  '["Benedito x Metalúrgica Paulista", "Rosa, inventário"]'::jsonb, 'busca pelo cliente, também quando ele não é o primeiro');
select is((select portal_juridico_casos(diego, rm) -> 'casos' -> 1 ->> 'semContrato' from ids), 'true', 'cliente sem contrato aparece na linha');

-- Ficha: honorários só para quem tem Contratos ou Financeiro (decisão 7).
select is((select portal_juridico_caso(diego, rm, cs.ben) -> 'clientes' -> 0 -> 'contrato' -> 'condicoes' from ids, cs), 'null'::jsonb,
  'sem Contratos nem Financeiro, a ficha vem sem os honorários');
select ok((select jsonb_array_length(portal_juridico_caso(socia, rm, cs.ben) -> 'clientes' -> 0 -> 'contrato' -> 'condicoes') = 1 from ids, cs),
  'CH-05: a sócia vê os honorários do contrato ligado');
select is((select portal_juridico_caso(diego, rm, cs.ben) ->> 'numero' from ids, cs), '10012347720265020011', 'o número fica só com os dígitos');

-- Mudar etapa.
select is((teste.erro($$ select portal_juridico_caso_etapa(diego, rm, cs.ben, 1, jsonb_build_object('etapaId', et.fim)) from ids, cs, et $$)) -> 'detalhe',
  '{"motivo": "MOTIVO_OBRIGATORIO", "campos": ["motivo", "resultado"]}'::jsonb, 'EX-03: motivo obrigatório e a final pede o resultado');
select is((teste.erro($$ select portal_juridico_caso_etapa(diego, rm, cs.ben, 1, jsonb_build_object('etapaId', et.inicial, 'motivo', 'Nada')) from ids, cs, et $$)) -> 'detalhe' ->> 'motivo',
  'MESMA_ETAPA', 'não muda para a etapa em que já está');
select is((select portal_juridico_caso_etapa(diego, rm, cs.ben, 1, jsonb_build_object('etapaId', (select id from etapas where escritorio_id = ids.rm and ordem = 3),
  'motivo', 'Citação juntada aos autos.', 'avisar', true)) ->> 'aviso' from ids, cs),
  'Olá, Benedito. Aqui é do escritório Ribeiro & Matos. Novidade no seu processo contra Metalúrgica Paulista S.A.: a outra parte foi chamada e vai apresentar a defesa dela. É normal levar algumas semanas. Qualquer dúvida, é só responder esta mensagem.',
  'EX-14: o aviso usa o primeiro nome, o escritório, a parte contrária e o texto da etapa');
select is((teste.erro($$ select portal_juridico_caso_etapa(diego, rm, cs.ben, 1, jsonb_build_object('etapaId', et.prep, 'motivo', 'Voltou')) from ids, cs, et $$)) ->> 'codigo',
  'TC409', 'versão antiga é recusada');
select is((select portal_juridico_caso(diego, rm, cs.ben) -> 'mudancas' -> 0 ->> 'avisoEnviadoEm' from ids, cs), null,
  'o aviso fica gravado como não enviado até Conversas');
select ok((select portal_juridico_caso_etapa(diego, rm, cs.rosa, 1, jsonb_build_object('etapaId', et.fim, 'motivo', 'Partilha homologada.', 'resultado', 'ACORDO')) ->> 'encerrado' from ids, cs, et)::boolean,
  'a etapa final encerra o caso com o resultado');
select is((select portal_juridico_casos(diego, rm, 'ENCERRADO') -> 'casos' -> 0 ->> 'resultado' from ids), 'ACORDO', 'encerrado sai da lista em andamento');

-- O histórico não se apaga.
select throws_ok($$ delete from caso_etapa_mudancas where caso_id = (select ben from cs) $$, 'TC023', null, 'mudança de etapa não se apaga');

-- Quem sai passa os casos (EX-10).
update pessoas set senha_criada_em = now() where nome = 'Diego Almeida';
select portal_retirar(socia, rm, (select id from vinculos v where v.pessoa_id = ids.diego and v.escritorio_id = ids.rm), 1, ids.socia) from ids;
select is((select (portal_juridico_casos(socia, rm) -> 'casos' -> 0 -> 'responsavel' ->> 'id')::uuid from ids), (select socia from ids),
  'EX-10: os casos de quem saiu passam para quem ficou');

-- Outro escritório não vê.
select is((teste.erro($$ select portal_juridico_caso(intrusa, outro, cs.ben) from ids, cs $$)) ->> 'codigo', 'TC404',
  'PT-01: caso de outro escritório não é encontrado');

select * from finish();
rollback;
