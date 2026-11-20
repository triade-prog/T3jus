-- Início do Portal por áreas (F3.26): um bloco por área liberada, os grupos (vencidos, hoje, a
-- acompanhar, esperando alguém), o limite de 5 com o total, "Os meus" e "Da equipe" só para a
-- sócia dona, o dinheiro de terceiros à parte, o responsável pelo repasse (o do contrato, com
-- troca, e passado a quem fica quando alguém sai) e o hero; área e isolamento
-- (PD-01 a PD-07, PA-01, PA-02, IN-04, IN-06, FI-06, EX-10, PT-01).
begin;
select plan(30);

select ajustar_relogio(('2026-08-25 10:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Bianca Torres') as bianca,
  teste.pessoa('Larissa Costa') as larissa,
  teste.pessoa('Paula Nunes') as paula,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, bianca, 'Bianca Torres', array['CONTRATOS', 'FINANCEIRO']),
       portal_convidar(socia, rm, larissa, 'Larissa Costa', array['JURIDICO']),
       portal_convidar(socia, rm, paula, 'Paula Nunes', array[]::text[]) from ids;

create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Hélio Batista Corrêa', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Hélio', 'telefone', '+5511996027731', 'principal', true)))) ->> 'id')::uuid hel,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Benedito Souza Lima', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Benedito', 'telefone', '+5511996027732', 'principal', true)))) ->> 'id')::uuid ben,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Daniela Rocha Mendes', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Daniela', 'telefone', '+5511996027733', 'principal', true)))) ->> 'id')::uuid dan,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Gabriela Teixeira', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Gabriela', 'telefone', '+5511996027734', 'principal', true)))) ->> 'id')::uuid gab
  from ids;

-- Contratos: Hélio com percentual do benefício (a base de novembro não foi informada); Benedito
-- em elaboração, com a assinatura marcada para sexta; Daniela com 3 parcelas vencidas (de Bianca);
-- Gabriela com a primeira parcela amanhã (de Marina).
create temp table ct as select
  (portal_contrato_criar(socia, rm, jsonb_build_object('clienteId', cli.hel, 'objeto', 'Revisão do benefício', 'responsavelId', ids.socia,
     'advogados', jsonb_build_array(ids.socia), 'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'RECORRENTE', 'percentual', 3000,
     'sobre', 'Benefício mensal do cliente', 'primeiro', '2026-11-10', 'dia', 10, 'meses', 3, 'diaLembrete', 5)))) ->> 'id')::uuid hel,
  (portal_contrato_criar(socia, rm, jsonb_build_object('clienteId', cli.ben, 'objeto', 'Aposentadoria', 'responsavelId', ids.socia,
     'advogados', jsonb_build_array(ids.socia), 'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'EXITO', 'percentual', 3000,
     'sobre', 'Atrasados', 'etapa', 'Pagamento da RPV', 'dias', 15)))) ->> 'id')::uuid ben,
  (portal_contrato_criar(socia, rm, jsonb_build_object('clienteId', cli.dan, 'objeto', 'Trabalhista', 'responsavelId', ids.bianca,
     'advogados', jsonb_build_array(ids.socia), 'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'PARCELADO', 'total', 300000,
     'parcelas', 3, 'primeiro', '2026-09-05')))) ->> 'id')::uuid dan,
  (portal_contrato_criar(socia, rm, jsonb_build_object('clienteId', cli.gab, 'objeto', 'Cobrança', 'responsavelId', ids.socia,
     'advogados', jsonb_build_array(ids.socia), 'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'PARCELADO', 'total', 200000,
     'parcelas', 2, 'primeiro', '2026-11-19')))) ->> 'id')::uuid gab
  from ids, cli;
select portal_contrato_assinatura(socia, rm, ct.dan, 1, '2026-08-25') from ids, ct;
select ajustar_relogio(('2026-11-05 10:00-03'::timestamptz - now()));
select portal_contrato_assinatura(socia, rm, ct.hel, 1, '2026-11-01'), portal_contrato_assinatura(socia, rm, ct.gab, 1, '2026-11-05') from ids, ct;
select ajustar_relogio(('2026-11-18 10:00-03'::timestamptz - now()));
select portal_compromisso_marcar(socia, rm, jsonb_build_object('tipo', 'ASSINATURA', 'titulo', 'Contrato · Benedito', 'inicio', '2026-11-20T15:00:00-03:00',
  'fim', '2026-11-20T15:30:00-03:00', 'modalidade', 'PRESENCIAL', 'clienteId', cli.ben, 'responsavelId', ids.bianca)) from ids, cli;
select portal_compromisso_marcar(socia, rm, jsonb_build_object('tipo', 'AUDIENCIA', 'titulo', 'Conciliação', 'inicio', '2026-11-18T11:00:00-03:00',
  'fim', '2026-11-18T12:00:00-03:00', 'modalidade', 'VIRTUAL', 'linkSala', 'https://exemplo.com.br/sala', 'responsavelId', ids.socia)) from ids;

-- Jurídico: o caso de Gabriela (com o contrato) e o de Pereira (de Larissa).
select portal_juridico_etapas(socia, rm) from ids;
create temp table cs as select
  (portal_juridico_caso_criar(socia, rm, jsonb_build_object('nome', 'Teixeira x Construtora', 'area', 'CIVEL',
     'etapaId', (select id from etapas where escritorio_id = ids.rm and ordem = 7), 'responsavelId', ids.larissa,
     'clientes', jsonb_build_array(jsonb_build_object('clienteId', cli.gab, 'papel', 'AUTOR', 'contratoId', ct.gab)))) ->> 'id')::uuid gab,
  (portal_juridico_caso_criar(socia, rm, jsonb_build_object('nome', 'Pereira x Mercado Bom Preço', 'area', 'TRABALHISTA',
     'etapaId', (select id from etapas where escritorio_id = ids.rm and ordem = 2), 'responsavelId', ids.larissa,
     'clientes', jsonb_build_array(jsonb_build_object('clienteId', cli.dan, 'papel', 'AUTOR')))) ->> 'id')::uuid per
  from ids, cli, ct;
select portal_juridico_prazo_criar(socia, rm, jsonb_build_object('casoId', cs.per, 'descricao', 'Recurso ordinário', 'dataFinal', '2026-11-19',
         'fazerAte', '2026-11-18', 'responsavelId', ids.larissa)),
       portal_juridico_tarefa_criar(socia, rm, jsonb_build_object('casoId', cs.per, 'titulo', 'Devolver a minuta', 'venceEm', '2026-11-17', 'responsavelId', ids.larissa)),
       portal_juridico_tarefa_criar(socia, rm, jsonb_build_object('casoId', cs.per, 'titulo', 'Protocolar a inicial', 'venceEm', '2026-11-25', 'responsavelId', ids.socia,
         'esperando', 'o cliente: procuração assinada'))
  from ids, cs;

-- O acordo de Gabriela entrou em 12/11: o repasse do cliente venceu em 17/11.
create temp table lv as select
  (portal_financeiro_levantamento_registrar(bianca, rm, jsonb_build_object('tipo', 'ACORDO', 'casoId', cs.gab, 'clienteId', cli.gab,
    'valor', 700000, 'entrouEm', '2026-11-12', 'divisao', jsonb_build_array(
      jsonb_build_object('para', 'CLIENTE', 'valor', 490000),
      jsonb_build_object('para', 'HONORARIOS', 'nome', 'Honorários', 'valor', 210000)))) ->> 'id')::uuid id
  from ids, cs, cli;

-- Área, isolamento e quem vê "Da equipe".
select is((teste.erro($$ select portal_inicio_contratos(paula, rm) from ids $$)) -> 'detalhe' ->> 'motivo', 'AREA_NAO_LIBERADA',
  'PA-01: sem a área Contratos, o bloco é recusado');
select is((teste.erro($$ select portal_inicio_juridico(bianca, rm) from ids $$)) -> 'detalhe' ->> 'motivo', 'AREA_NAO_LIBERADA',
  'PA-02: Bianca não tem o Jurídico');
select is((teste.erro($$ select portal_inicio_financeiro(bianca, rm, 'EQUIPE') from ids $$)) -> 'detalhe' ->> 'motivo', 'SO_SOCIO_DONO',
  '"Da equipe" só para a sócia dona');
select is((teste.erro($$ select portal_inicio_juridico(intrusa, rm) from ids $$)) ->> 'codigo', 'TC401', 'PT-01: outro escritório não entra');
select is((teste.erro($$ select portal_inicio_contratos(socia, rm, 'TODOS') from ids $$)) -> 'detalhe' -> 'campos', '["de"]'::jsonb, 'só MEUS ou EQUIPE');

-- Contratos.
create temp table rc as select portal_inicio_contratos(socia, rm) r from ids;
select is((select jsonb_path_query_array(r -> 'grupos', '$[*].chave') from rc), '["VENCIDOS", "ACOMPANHAR"]'::jsonb,
  'PD-01: a cobrança parada é vencida; a assinatura de sexta é a acompanhar');
select is((select r -> 'grupos' -> 0 -> 'itens' -> 0 ->> 'tipo' from rc), 'BASE', 'a base do mês que falta');
select is((select r -> 'grupos' -> 1 -> 'itens' -> 0 -> 'compromisso' -> 'responsavel' ->> 'nome' from rc), 'Bianca Torres',
  'a assinatura diz quem colhe');
select is((select jsonb_build_object('pedem', r -> 'pedem', 'paradas', r -> 'paradas', 'assinaturas', r -> 'assinaturas', 'etapa', r -> 'esperandoEtapa') from rc),
  '{"pedem": 1, "paradas": 1, "assinaturas": 1, "etapa": 1}'::jsonb, 'os números do cartão e do rodapé');
select is((select portal_inicio_contratos(bianca, rm) -> 'total' from ids), '0'::jsonb, '"Os meus": nada de Bianca em Contratos');

-- Financeiro: do escritório e de terceiros, nunca somados.
create temp table rf as select portal_inicio_financeiro(socia, rm) r from ids;
select is((select jsonb_path_query_array(r -> 'escritorio' -> 'grupos', '$[*].chave') from rf), '["ACOMPANHAR"]'::jsonb,
  'PD-03: nos de Marina, só a parcela que entra amanhã');
select is((select r -> 'escritorio' -> 'escritorioVencidas' from rf), '3'::jsonb, 'a dona vê quantas estão vencidas no escritório todo');
select is((select r -> 'terceiros' -> 'grupos' -> 0 -> 'itens' -> 0 ->> 'nome' from rf), 'Gabriela Teixeira',
  'PD-06: o repasse do cliente atrasado é de Marina, responsável pelo contrato');
select is((select r -> 'terceiros' -> 'grupos' -> 0 -> 'itens' -> 0 -> 'valor' from rf), '490000'::jsonb,
  'FI-06: só a parte de terceiros, sem os honorários');
select is((select r ->> 'pedem' from rf), '1', 'pedem: o repasse atrasado; a parcela de amanhã só se acompanha');
select is((select portal_inicio_financeiro(bianca, rm) -> 'escritorio' -> 'vencidas' from ids), '3'::jsonb, 'as 3 vencidas de Daniela são de Bianca');
select is((select portal_inicio_financeiro(bianca, rm) -> 'escritorio' -> 'escritorioVencidas' from ids), 'null'::jsonb, 'quem não é dona não recebe o número do escritório');
select is((select portal_inicio_financeiro(socia, rm, 'EQUIPE') -> 'escritorio' -> 'mostrando' from ids), '4'::jsonb, 'da equipe: as 3 vencidas e a de amanhã');

-- O responsável pelo repasse: o do contrato, com troca.
select is((select portal_financeiro_repasse(bianca, rm, lv.id) -> 'responsavel' ->> 'nome' from ids, lv), 'Marina Ribeiro', 'o repasse mostra de quem é');
select is((teste.erro($$ select portal_financeiro_repasse_responsavel(bianca, rm, lv.id, intrusa) from ids, lv $$)) -> 'detalhe' -> 'campos',
  '["responsavelId"]'::jsonb, 'só alguém da equipe');
select portal_financeiro_repasse_responsavel(bianca, rm, lv.id, bianca) from ids, lv;
select is((select portal_inicio_financeiro(bianca, rm) -> 'terceiros' -> 'total' from ids), '1'::jsonb, 'trocado: o repasse vai para Bianca');
select is((select count(*)::integer from historico h, lv where h.acao = 'financeiro.repasse_responsavel' and h.entidade_id = lv.id::text), 1,
  'a troca vai ao histórico');
update pessoas set senha_criada_em = app_now() where id = (select bianca from ids);
select portal_retirar(socia, rm, (select id from vinculos v where v.pessoa_id = ids.bianca and v.escritorio_id = ids.rm), 1, socia) from ids;
select is((select portal_inicio_financeiro(socia, rm) -> 'terceiros' -> 'total' from ids), '1'::jsonb, 'EX-10: Bianca saiu e o repasse voltou para Marina');

-- Jurídico.
create temp table rj as select portal_inicio_juridico(larissa, rm) r from ids;
select is((select jsonb_path_query_array(r -> 'grupos', '$[*].chave') from rj), '["VENCIDOS", "HOJE"]'::jsonb,
  'PD-04: a tarefa atrasada e o prazo para fazer até hoje');
select is((select jsonb_build_object('pedem', r -> 'pedem', 'hoje', r -> 'prazosHoje') from rj), '{"pedem": 2, "hoje": 1}'::jsonb, 'os números do cartão');
select is((select portal_inicio_juridico(socia, rm) -> 'grupos' -> 0 ->> 'chave' from ids), 'ESPERANDO', 'PD-05: a tarefa de Marina espera o cliente');
select portal_juridico_tarefa_criar(socia, rm, jsonb_build_object('casoId', cs.per, 'titulo', 'Tarefa ' || n, 'venceEm', '2026-11-1' || n, 'responsavelId', ids.larissa))
  from ids, cs, generate_series(1, 5) n;
select is((select jsonb_build_object('mostrando', r -> 'mostrando', 'total', r -> 'total', 'vencidos', r -> 'grupos' -> 0 -> 'total')
             from (select portal_inicio_juridico(larissa, rm) r from ids) x),
  '{"total": 7, "vencidos": 6, "mostrando": 5}'::jsonb, 'até 5 itens, os mais atrasados primeiro, com o total de cada grupo');

-- O hero.
select is((select portal_inicio_resumo(socia, rm) - 'proximoCompromisso' from ids),
  '{"dono": true, "areas": ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"], "pedem": {"JURIDICO": 0, "COMERCIAL": 0, "CONTRATOS": 1, "FINANCEIRO": 4}, "total": 5, "compromissos": 1}'::jsonb,
  'o hero soma o que pede Marina nas 4 áreas (com as parcelas que eram de Bianca) e conta os compromissos de hoje');
select is((select portal_inicio_resumo(paula, rm) -> 'pedem' from ids), '{}'::jsonb, 'sem área, nenhuma contagem é calculada');
select is((select portal_inicio_contatos(socia, rm) ? 'propostasEsperando' from ids), true, 'PD-02: o Comercial traz as propostas esperando resposta');

select * from finish();
rollback;
