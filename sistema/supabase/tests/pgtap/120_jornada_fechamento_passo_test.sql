-- Jornada do cliente, parte 2 (0851; EX-16, CH-13): depois da etapa final, o próximo passo do
-- cliente é o fechamento, passo a passo, cada um pela própria área; só com tudo encerrado ele
-- diz "Cliente atendido". O contrato ativo marcado "não tem caso" é "Contrato ativo", e não
-- "Gerar proposta". A ficha do contrato diz quem marcou "não tem caso".
begin;
select plan(28);

select ajustar_relogio(('2026-11-18 10:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Larissa Costa') as larissa,
  teste.pessoa('Felipe Matos') as felipe,
  teste.escritorio('Ribeiro & Matos') as rm;
select teste.vincular(socia, rm, 'SOCIO') from ids;
select portal_convidar(socia, rm, diego, 'Diego Almeida', array['FINANCEIRO']),
       portal_convidar(socia, rm, larissa, 'Larissa Costa', array['JURIDICO']),
       portal_convidar(socia, rm, felipe, 'Felipe Matos', array['CONTRATOS', 'COMERCIAL']) from ids;

create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Antônia Ferreira Prado', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Antônia Ferreira Prado', 'telefone', '+5511996027736', 'principal', true)))) ->> 'id')::uuid ant,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PJ', 'nome', 'Auto Peças Moreira Ltda.', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Paulo Moreira', 'telefone', '+5511996027737', 'principal', true)))) ->> 'id')::uuid auto,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Rafaela Moura', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Rafaela Moura', 'telefone', '+5511996027738', 'principal', true)))) ->> 'id')::uuid rafa
  from ids;
create temp table ct as select
  (portal_contrato_criar(socia, rm, jsonb_build_object('clienteId', cli.ant, 'objeto', 'Pensão por morte',
     'responsavelId', ids.socia, 'advogados', jsonb_build_array(ids.socia),
     'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'EXITO', 'percentual', 3000, 'sobre', 'Atrasados que a cliente receber',
                                                       'etapa', 'Encerrado', 'dias', 0)))) ->> 'id')::uuid ant,
  (portal_contrato_criar(socia, rm, jsonb_build_object('clienteId', cli.auto, 'objeto', 'Consultoria trabalhista mensal',
     'responsavelId', ids.felipe, 'advogados', jsonb_build_array(ids.socia),
     'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'MENSAL', 'valor', 120000, 'primeiro', '2026-12-10', 'meses', 12)))) ->> 'id')::uuid auto
  from ids, cli;

select is((select portal_cliente(socia, rm, cli.rafa) -> 'passo' ->> 'tipo' from ids, cli), 'SEM_PROPOSTA', 'quem nunca teve nada continua em "Gerar proposta"');

-- CH-13: o contrato assinado "não tem caso" fica como "Contrato ativo".
select portal_contrato_assinatura_caso(felipe, rm, ct.auto, 1, '2026-11-18', '{"modo": "SEM"}') from ids, ct;
create temp table pa as select portal_cliente(felipe, rm, cli.auto) -> 'passo' p from ids, cli;
select is((select p ->> 'tipo' from pa), 'CONTRATO_ATIVO', 'CH-13: contrato sem caso é "Contrato ativo", não "Gerar proposta"');
select is((select p ->> 'area' from pa), 'CONTRATOS', 'pela área Contratos');
select is((select p -> 'item' -> 'proximo' ->> 'vencimento' from pa), '2026-12-10', 'com a próxima mensalidade');
select is((select portal_contrato(socia, rm, ct.auto) -> 'semCasoMarcado' -> 'por' ->> 'nome' from ids, ct), 'Felipe Matos',
  'decisão 28: a ficha do contrato diz quem marcou "não tem caso"');
select is((select portal_contrato(felipe, rm, ct.auto) -> 'podeAbrirCaso' from ids, ct), 'false'::jsonb, 'e quem não tem Jurídico não abre o caso dali');
select is((select portal_contrato(socia, rm, ct.auto) -> 'podeAbrirCaso' from ids, ct), 'true'::jsonb, 'quem tem Jurídico abre');

-- O caso de Antônia, com êxito, até a etapa final.
select portal_contrato_assinatura_caso(socia, rm, ct.ant, 1, '2026-11-18', jsonb_build_object('modo', 'NOVO', 'nome', 'Ferreira Prado x INSS',
  'area', 'PREVIDENCIARIO', 'responsavelId', ids.larissa, 'papel', 'AUTOR')) from ids, ct;
create temp table cs as select c.id, (select id from etapas where escritorio_id = ids.rm and final) final
  from casos c, ids where c.escritorio_id = ids.rm and c.nome = 'Ferreira Prado x INSS';
select is((select portal_cliente(socia, rm, cli.ant) -> 'passo' ->> 'tipo' from ids, cli), 'CASO', 'em andamento, o passo é o caso');
select portal_juridico_caso_etapa(larissa, rm, cs.id, 1, jsonb_build_object('etapaId', cs.final, 'motivo', 'Sentença com ganho',
  'resultado', 'GANHO', 'previstoEm', '2026-12-15', 'valores', jsonb_build_object(cli.ant, 3864000))) from ids, cs, cli;

-- EX-16: o fechamento, passo 1 (conferir o êxito), pelo Financeiro.
create temp table p1 as select portal_cliente(socia, rm, cli.ant) -> 'passo' p from ids, cli;
select is((select p ->> 'tipo' from p1), 'FECHAMENTO', 'EX-16: depois da etapa final, o passo é o fechamento');
select is((select jsonb_path_query_array(p -> 'item' -> 'passos', '$[*].tipo') from p1), '["EXITO", "FINANCEIRO", "CONTRATO"]'::jsonb,
  'só os passos que se aplicam: sem RPV ainda, não há repasse; encerrar no financeiro entra pelo contrato (F3.132)');
select is((select p ->> 'area' from p1), 'FINANCEIRO', 'o primeiro que falta é do Financeiro');
select is((select p -> 'item' -> 'passos' -> 0 ->> 'valor' from p1), '1159200', 'com o valor do êxito para quem tem Financeiro');
create temp table pl as select portal_cliente(larissa, rm, cli.ant) -> 'passo' p from ids, cli;
select is((select p -> 'pode' from pl), 'false'::jsonb, 'decisão 16: sem Financeiro, não dá o passo');
select ok((select p -> 'quemPode' ? 'Diego Almeida' from pl), 'e sabe quem faz');
select is((select p -> 'item' -> 'passos' -> 0 -> 'valor' from pl), 'null'::jsonb, 'sem os valores');
select is((select p -> 'item' -> 'caso' ->> 'nome' from pl), 'Ferreira Prado x INSS', 'mas com o caso, para "Ver o caso"');
select is((select portal_cliente(diego, rm, cli.ant) -> 'passo' -> 'item' -> 'caso' -> 'nome' from ids, cli), 'null'::jsonb,
  'sem Jurídico, o nome do caso não aparece');

-- A RPV entrou: aparecem o repasse e o encerramento no financeiro.
select portal_financeiro_exito_nao_cobrar(diego, rm, x.id, '{"motivo": "OUTRO", "explicacao": "Combinado com a sócia"}')
  from ids, exitos_conferir x, cs where x.caso_id = cs.id;
create temp table lv as select
  (portal_financeiro_levantamento_registrar(diego, rm, jsonb_build_object('tipo', 'RPV', 'casoId', cs.id, 'clienteId', cli.ant,
    'valor', 3864000, 'entrouEm', '2026-11-18', 'divisao', jsonb_build_array(
      jsonb_build_object('para', 'CLIENTE', 'valor', 2512800),
      jsonb_build_object('para', 'PERITO', 'nome', 'Dr. Rui Tavares', 'valor', 1351200)))) ->> 'id')::uuid id
  from ids, cs, cli;
create temp table p2 as select portal_cliente(socia, rm, cli.ant) -> 'passo' p from ids, cli;
select is((select jsonb_path_query_array(p -> 'item' -> 'passos', '$[*].tipo') from p2), '["EXITO", "REPASSE", "FINANCEIRO", "CONTRATO"]'::jsonb,
  'com a RPV, os quatro passos');
select is((select jsonb_path_query_array(p -> 'item' -> 'passos', '$[*].feito') from p2), '[true, false, false, false]'::jsonb,
  'o êxito feito (não cobrado), o repasse é o próximo');
select is((select p -> 'item' -> 'passos' -> 1 ->> 'valor' from p2), '2512800', 'o repasse diz quanto falta');
select is((select p -> 'item' -> 'passos' -> 1 ->> 'levantamentoId' from p2), (select id::text from lv), 'e leva à ficha do repasse');

select portal_financeiro_destinacao_feita(diego, rm, d.id, '{"feitoEm": "2026-11-18"}')
  from ids, lv, destinacoes d where d.levantamento_id = lv.id and d.para = 'CLIENTE';
create temp table p3 as select portal_cliente(socia, rm, cli.ant) -> 'passo' p from ids, cli;
select is((select p -> 'item' -> 'passos' -> 2 -> 'pendentes' from p3), '["Dr. Rui Tavares"]'::jsonb, 'passo 3: o acerto diz quem falta pagar');

select portal_financeiro_destinacao_feita(diego, rm, d.id, '{"feitoEm": "2026-11-18"}')
  from ids, lv, destinacoes d where d.levantamento_id = lv.id and d.para = 'PERITO';
select portal_financeiro_caso_encerrar(diego, rm, cs.id) from ids, cs;
create temp table p4 as select portal_cliente(socia, rm, cli.ant) -> 'passo' p from ids, cli;
select is((select p ->> 'area' from p4), 'CONTRATOS', 'passo 4: encerrar o contrato, pela área Contratos');
select is((select p -> 'item' -> 'passos' -> 3 -> 'contratos' -> 0 ->> 'id' from p4), (select ant::text from ct), 'com o contrato que ficou aberto');

-- Tudo encerrado: "Cliente atendido", e o cliente continua ativo (decisão 19).
select portal_contrato_encerrar(socia, rm, ct.ant, (select versao from contratos where id = ct.ant), 'Caso encerrado com tudo acertado') from ids, ct;
create temp table p5 as select portal_cliente(socia, rm, cli.ant) p from ids, cli;
select is((select p -> 'passo' ->> 'tipo' from p5), 'ATENDIDO', 'EX-16: só com tudo encerrado, "Cliente atendido"');
select is((select jsonb_path_query_array(p -> 'passo' -> 'item' -> 'passos', '$[*].feito') from p5), '[true, true, true, true]'::jsonb, 'com os 4 passos feitos');
select is((select p ->> 'situacao' from p5), 'ATIVO', 'decisão 19: a situação do cliente não muda');

-- Proposta nova volta a mandar no passo.
select portal_proposta_criar(felipe, rm, jsonb_build_object('clienteId', cli.ant, 'servico', 'Revisão da pensão',
  'responsavelId', ids.felipe, 'rascunho', true)) from ids, cli;
select is((select portal_cliente(socia, rm, cli.ant) -> 'passo' ->> 'tipo' from ids, cli), 'PROPOSTA_RASCUNHO', 'proposta nova volta a ser o passo');

select * from finish();
rollback;
