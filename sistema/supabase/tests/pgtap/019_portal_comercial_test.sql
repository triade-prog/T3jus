-- Comercial do Portal: propostas com condições de honorário, retorno que é o próximo contato,
-- resposta que grava o atendimento, retornos do escritório, Funil, Origem, recusa por área e a
-- passagem de quem sai (AP-02 a AP-06, IN-01, PD-02, CH-06, EX-10, PT-03, PT-19).
begin;
select plan(41);

select ajustar_relogio(('2026-11-18 12:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Paula Nunes') as paula,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, diego, 'Diego Almeida', array['COMERCIAL']),
       portal_convidar(socia, rm, paula, 'Paula Nunes', '{}') from ids;

create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Gabriela Teixeira', 'origem', 'INDICACAO_CLIENTE',
     'origem_indicacao', 'Rosa Almeida',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Gabriela Teixeira', 'telefone', '+5511996027735', 'principal', true)))) ->> 'id')::uuid gab,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Benedito Souza Lima', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Benedito Souza Lima', 'telefone', '+5511996027736', 'principal', true)))) ->> 'id')::uuid ben,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Eduardo Nascimento', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Eduardo Nascimento', 'telefone', '+5511996027737', 'principal', true)))) ->> 'id')::uuid edu
  from ids;
select portal_registrar_atendimento(socia, rm, cli.edu, jsonb_build_object('canal', 'PRESENCIAL', 'resumo', 'Passou no escritório')) from ids, cli;

create temp table cond as select
  jsonb_build_array(jsonb_build_object('tipo', 'PARCELADO', 'total', 400000, 'parcelas', 4, 'primeiro', '2026-12-15')) gab,
  jsonb_build_array(
    jsonb_build_object('tipo', 'RECORRENTE', 'percentual', 3000, 'sobre', 'Benefício mensal do cliente', 'etapa', 'Benefício implantado',
                       'dia', 10, 'meses', 12, 'diaLembrete', 5, 'pedirWhats', false, 'lixo', 'x'),
    jsonb_build_object('tipo', 'PARCELADO', 'total', 200000, 'parcelas', 3, 'primeiro', '2026-12-10'),
    jsonb_build_object('tipo', 'EXITO', 'percentual', 3000, 'sobre', 'Atrasados que o cliente receber', 'etapa', 'Pagamento da RPV ou precatório', 'dias', 15)) ben;

-- Área Comercial: quem não tem não entra.
select is((teste.erro($$ select portal_propostas(paula, rm) from ids $$)) -> 'detalhe' ->> 'motivo', 'AREA_NAO_LIBERADA',
  'PA-01: sem a área Comercial, a lista de propostas é recusada');
select is((teste.erro($$ select portal_comercial_retornos(paula, rm) from ids $$)) -> 'detalhe' ->> 'motivo', 'AREA_NAO_LIBERADA',
  'PA-01: sem a área Comercial, os retornos são recusados');

-- Erros presos ao campo (proposta completa).
select is((teste.erro($$ select portal_proposta_criar(diego, rm, jsonb_build_object('clienteId', cli.gab, 'servico', 'D',
  'responsavelId', diego, 'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'EXITO', 'percentual', 0, 'sobre', 'Valor do acordo', 'dias', 5)))) from ids, cli $$))
  -> 'detalhe' -> 'campos', '["c1.etapa", "c1.percentual", "escopo", "retorno.em", "servico"]'::jsonb,
  'CH-06: serviço curto, sem o que está incluído, percentual e etapa do êxito e sem retorno');
select is((teste.erro($$ select portal_proposta_criar(diego, rm, jsonb_build_object('clienteId', cli.gab, 'servico', 'Divórcio', 'escopo', 'x',
  'responsavelId', diego, 'retorno', jsonb_build_object('em', '2026-11-25', 'responsavelId', diego),
  'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'FIXO', 'valor', 100, 'vencimento', '2026-12-01'),
                                 jsonb_build_object('tipo', 'FIXO', 'valor', 100, 'vencimento', '2026-12-02')))) from ids, cli $$))
  -> 'detalhe' -> 'campos', '["condicoes"]'::jsonb, 'CH-06: um bloco de cada tipo por proposta');
select is((teste.erro($$ select portal_proposta_criar(intrusa, outro, jsonb_build_object('clienteId', cli.gab, 'servico', 'Divórcio', 'rascunho', true,
  'responsavelId', intrusa)) from ids, cli $$)) -> 'detalhe' -> 'campos', '["clienteId"]'::jsonb, 'PT-01: cliente de outro escritório é recusado');

-- Rascunho: só cliente, serviço e responsável.
create temp table pr as select (portal_proposta_criar(socia, rm, jsonb_build_object('clienteId', cli.gab, 'servico', ' Divórcio consensual ',
  'responsavelId', socia, 'rascunho', true)) ->> 'id')::uuid id from ids, cli;
select is((select numero || '|' || estado || '|' || servico from propostas, pr where propostas.id = pr.id), 'P-2026-001|RASCUNHO|Divórcio consensual',
  'AP-05: rascunho com número por escritório e ano');
select is((teste.erro($$ select portal_proposta_enviada(socia, rm, pr.id, 1) from ids, pr $$)) -> 'detalhe' ->> 'motivo', 'PROPOSTA_INCOMPLETA',
  'rascunho incompleto não se marca como enviada');

-- Completar o rascunho e marcar o retorno, que vira o próximo contato do cliente.
select is((select portal_proposta_editar(socia, rm, pr.id, 1, jsonb_build_object('servico', 'Divórcio consensual', 'escopo', 'Petição e partilha.',
  'responsavelId', socia, 'validaAte', '2026-11-30', 'condicoes', cond.gab,
  'retorno', jsonb_build_object('em', '2026-11-25', 'responsavelId', socia))) ->> 'versao' from ids, pr, cond), '2', 'PT-19: editar com a versão lida');
select is((select prox_contato(cli.gab) ->> 'em' || '|' || (prox_contato(cli.gab) ->> 'oque') from cli), '2026-11-25|Saber se aceita a proposta P-2026-001',
  'AP-06: o retorno da proposta é o próximo contato do cliente');
select is((teste.erro($$ select portal_proposta_editar(socia, rm, pr.id, 1, jsonb_build_object('servico', 'X y', 'responsavelId', socia, 'rascunho', true)) from ids, pr $$)) ->> 'codigo',
  'TC409', 'PT-19: versão velha dá conflito');
select is((select portal_proposta_enviada(socia, rm, pr.id, 2) from ids, pr), 3, 'marcar como enviada');
select is((select estado from propostas, pr where propostas.id = pr.id), 'ENVIADA', 'a proposta fica Enviada');
select is((select honorario_lista(rm, 'PROPOSTA', pr.id) from ids, pr), cond.gab, 'as condições ficam como foram escritas') from cond;

-- Registrar um atendimento na ficha muda o retorno da proposta (vice-versa).
select ajustar_relogio(('2026-11-18 12:05-03'::timestamptz - now()));
select portal_registrar_atendimento(socia, rm, cli.gab, jsonb_build_object('canal', 'WHATSAPP', 'resumo', 'Ela vai pensar',
  'proxEm', '2026-11-27', 'proxResponsavel', socia, 'proxOque', 'Ligar de novo')) from ids, cli;
select is((select proposta_linha(p) -> 'retorno' ->> 'em' from propostas p, pr where p.id = pr.id), '2026-11-27',
  'AP-06: o atendimento na ficha muda o retorno que a proposta mostra');

select ajustar_relogio(('2026-11-18 12:10-03'::timestamptz - now()));
-- Resposta: pediu mudança (o retorno fica para hoje, com o responsável).
select is((teste.erro($$ select portal_proposta_resposta(socia, rm, pr.id, 3, jsonb_build_object('resposta', 'RECUSOU', 'em', '2026-11-18', 'canal', 'WHATSAPP')) from ids, pr $$))
  -> 'detalhe' -> 'campos', '["motivo"]'::jsonb, 'recusar pede o motivo');
select is((select portal_proposta_resposta(socia, rm, pr.id, 3, jsonb_build_object('resposta', 'MUDANCA', 'em', '2026-11-18', 'canal', 'WHATSAPP',
  'observacao', 'Pediu 5 parcelas')) ->> 'situacao' from ids, pr), 'NEGOCIACAO', 'pediu mudança: em negociação');
select is((select prox_contato(cli.gab) ->> 'em' || '|' || (prox_contato(cli.gab) ->> 'oque') from cli),
  '2026-11-18|Responder ao pedido de mudança da proposta P-2026-001', 'o pedido de mudança deixa o retorno para hoje');
select is((select resumo from atendimentos, cli where cliente_id = cli.gab order by criado_em desc, ocorrido_em desc limit 1),
  'Pediu mudança na proposta P-2026-001. Pediu 5 parcelas', 'a resposta vira atendimento do cliente');

-- Retornos do escritório inteiro.
create temp table ret as select portal_comercial_retornos(diego, rm) j from ids;
select is((select jsonb_array_length(j -> 'grupos' -> 'hoje') from ret), 1, 'PD-02: Gabriela aparece em Hoje');
select is((select j -> 'grupos' -> 'semData' -> 0 ->> 'nome' from ret), 'Eduardo Nascimento', 'quem foi atendido e não tem próximo contato aparece sem data');
select is((select j -> 'propostasEsperando' -> 0 ->> 'numero' from ret), 'P-2026-001', 'a proposta em negociação espera resposta');
select is((select jsonb_array_length(portal_comercial_retornos(diego, rm, diego) -> 'grupos' -> 'hoje') from ids), 0, 'filtro por responsável');

-- Proposta do Benedito, completa, com três tipos; aceita.
create temp table pb as select (portal_proposta_criar(diego, rm, jsonb_build_object('clienteId', cli.ben, 'servico', 'Aposentadoria por idade',
  'escopo', 'Pedido no INSS e ação na Justiça Federal.', 'responsavelId', diego, 'condicoes', cond.ben,
  'retorno', jsonb_build_object('em', '2026-11-20', 'responsavelId', diego))) ->> 'id')::uuid id from ids, cli, cond;
select is((select jsonb_agg(x ->> 'tipo') from pb, ids, jsonb_array_elements(honorario_lista(rm, 'PROPOSTA', pb.id)) x),
  '["PARCELADO", "EXITO", "RECORRENTE"]'::jsonb, 'CH-06: os blocos ficam na ordem da lista de tipos');
select ok((select not (honorario_lista(rm, 'PROPOSTA', pb.id) -> 2 ? 'lixo') from pb, ids), 'só os campos do tipo são guardados');
select is((select honorario_valor_certo(rm, 'PROPOSTA', pb.id) from pb, ids), 200000::bigint, 'valor certo soma só o que tem valor');
select portal_proposta_enviada(diego, rm, pb.id, 1) from ids, pb;
select ajustar_relogio(('2026-11-18 12:15-03'::timestamptz - now()));
select is((teste.erro($$ select portal_proposta_editar(diego, rm, pb.id, 2, jsonb_build_object('servico', 'X y', 'responsavelId', diego)) from ids, pb $$))
  -> 'detalhe' -> 'campos', '["condicoes", "escopo", "retorno.em"]'::jsonb, 'editar a proposta enviada pede ela completa');
select is((select portal_proposta_resposta(diego, rm, pb.id, 2, jsonb_build_object('resposta', 'ACEITOU', 'em', '2026-11-17', 'canal', 'PRESENCIAL')) ->> 'situacao'
  from ids, pb), 'ACEITA', 'aceitou');
select ok((select prox_contato(cli.ben) is null from cli), 'a resposta encerra o próximo contato');
select is((teste.erro($$ select portal_proposta_editar(diego, rm, pb.id, 3, jsonb_build_object('servico', 'X y', 'responsavelId', diego)) from ids, pb $$))
  -> 'detalhe' ->> 'motivo', 'PROPOSTA_RESPONDIDA', 'proposta aceita não se edita');
select is((select (portal_proposta(diego, rm, pb.id) ->> 'podeContrato') || '|' || (portal_proposta(diego, rm, pb.id) -> 'quemTemContratos')::text from ids, pb),
  'false|["Marina Ribeiro"]', 'quem tem Comercial e não Contratos vê quem pode criar o contrato');
select lives_ok($$ select portal_proposta_pedir_contrato(diego, rm, pb.id) from ids, pb $$, 'pedir o contrato');
select ok((select contrato_pedido_em is not null from propostas, pb where propostas.id = pb.id), 'o pedido fica na proposta');

-- Lista e histórico.
select is((select jsonb_array_length(portal_propostas(diego, rm, 'ANDAMENTO', 'gabri') -> 'propostas') from ids), 1, 'busca pelo nome do cliente');
select is((select portal_propostas(diego, rm) -> 'contagem' from ids), '{"andamento": 2, "contrato": 0, "recusadas": 0}'::jsonb, 'contagem por situação');
select is((select jsonb_agg(x ->> 'acao') from ids, pr, jsonb_array_elements(portal_proposta(socia, rm, pr.id) -> 'historico') x),
  '["proposta.resposta", "estado.mudou", "estado.mudou", "proposta.editada", "proposta.criada", "estado.mudou"]'::jsonb,
  'PT-03: o histórico da proposta guarda tudo, do mais novo ao mais antigo');

-- Funil e Origem (24 de cada lado no desenho; aqui, 3 primeiros contatos).
create temp table fun as select portal_comercial_funil(socia, rm, '90') j from ids;
select is((select (j ->> 'primeiros') || '|' || (j ->> 'comProposta') || '|' || (j -> 'semProposta' ->> 'emAtendimento') from fun), '3|2|1',
  'AP-03: primeiros contatos, com proposta e ainda em atendimento');
select is((select j -> 'agora' -> 'primeiro' -> 0 ->> 'detalhe' from fun), 'Atendido em 18/11', 'quem está no primeiro contato e por quê');
select is((select j -> 'agora' -> 'aceita' -> 0 ->> 'numero' from fun), 'P-2026-002', 'a aceita aparece na coluna Aceita');
select is((select x -> 'linhas' -> 0 ->> 'origem' || '|' || (x -> 'linhas' -> 0 ->> 'contatos') || '|' || (x -> 'indicacoes' -> 0 ->> 'nome')
  from ids, portal_comercial_origem(socia, rm, '12') x), 'GOOGLE|2|Rosa Almeida', 'AP-04: contatos por origem e quem indicou');

-- EX-10: quem sai passa propostas e retornos.
update pessoas set senha_criada_em = now() where nome = 'Diego Almeida';
create temp table pc as select (portal_proposta_criar(diego, rm, jsonb_build_object('clienteId', cli.edu, 'servico', 'Trabalhista',
  'responsavelId', diego, 'rascunho', true, 'retorno', jsonb_build_object('em', '2026-11-26', 'responsavelId', diego))) ->> 'id')::uuid id from ids, cli;
select ajustar_relogio(('2026-11-18 12:20-03'::timestamptz - now()));
select portal_retirar(socia, rm, (select id from vinculos v where v.pessoa_id = ids.diego and v.escritorio_id = ids.rm), 1, ids.socia) from ids;
select is((select responsavel_id from propostas, pc where propostas.id = pc.id), (select socia from ids),
  'EX-10: a proposta em andamento de quem saiu passa para quem foi escolhido');
select is((select prox_contato(cli.edu) -> 'responsavel' ->> 'nome' || '|' || (prox_contato(cli.edu) ->> 'em') from cli), 'Marina Ribeiro|2026-11-26',
  'EX-10: o retorno marcado com quem saiu passa, na mesma data');

select ajustar_relogio(interval '0');
select * from finish();
rollback;
