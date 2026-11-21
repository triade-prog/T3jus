-- Editar prazo e tarefa (F3.39) e o Jurídico na Agenda (F3.4): edição pela versão lida, com o
-- histórico do caso; cumprido e concluída não mudam; prazos do período na Agenda só para quem
-- tem o Jurídico; caso no compromisso só de quem tem a área (EX-02, EX-04, EX-06, PD-04, PD-07,
-- PA-01, PT-19).
begin;
select plan(22);

select ajustar_relogio(('2026-11-18 10:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Felipe Matos') as felipe,
  teste.pessoa('Paula Nunes') as paula,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, felipe, 'Felipe Matos', array['JURIDICO']),
       portal_convidar(socia, rm, paula, 'Paula Nunes', array['CONTRATOS']) from ids;

create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Joana Pereira', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Joana Pereira', 'telefone', '+5511985521034', 'principal', true)))) ->> 'id')::uuid joana
  from ids;
select portal_juridico_casos(socia, rm) from ids;
create temp table cs as select
  (portal_juridico_caso_criar(socia, rm, jsonb_build_object('nome', 'Pereira x Mercado Bom Preço', 'area', 'TRABALHISTA',
     'numero', '10010225120265020045',
     'etapaId', (select id from etapas where escritorio_id = ids.rm and ordem = 5), 'responsavelId', ids.socia,
     'clientes', jsonb_build_array(jsonb_build_object('clienteId', cli.joana, 'papel', 'AUTOR')))) ->> 'id')::uuid pereira
  from ids, cli;

create temp table pz as select
  (portal_juridico_prazo_criar(felipe, rm, jsonb_build_object('casoId', cs.pereira, 'descricao', 'Recurso ordinário', 'dataFinal', '2026-11-19',
     'intimacaoEm', '2026-11-11', 'responsavelId', ids.socia)) ->> 'id')::uuid recurso,
  (portal_juridico_prazo_criar(felipe, rm, jsonb_build_object('casoId', cs.pereira, 'descricao', 'Alegações finais', 'dataFinal', '2026-12-26',
     'responsavelId', ids.felipe)) ->> 'id')::uuid alegacoes,
  (portal_juridico_tarefa_criar(felipe, rm, jsonb_build_object('casoId', cs.pereira, 'titulo', 'Minuta do recurso', 'venceEm', '2026-11-18',
     'responsavelId', ids.socia)) ->> 'id')::uuid minuta
  from ids, cs;

-- Editar prazo.
select is((select portal_juridico_caso(felipe, rm, cs.pereira) -> 'prazos' -> 0 ->> 'versao' from ids, cs), '1', 'a linha do prazo traz a versão');
select is((teste.erro($$ select portal_juridico_prazo_editar(paula, rm, pz.recurso, 1, '{}'::jsonb) from ids, pz $$)) -> 'detalhe' ->> 'motivo',
  'AREA_NAO_LIBERADA', 'PA-01: sem o Jurídico, editar prazo é recusado');
select is((teste.erro($$ select portal_juridico_prazo_editar(intrusa, outro, pz.recurso, 1, jsonb_build_object('descricao', 'x')) from ids, pz $$)) ->> 'codigo',
  'TC404', 'PT-01: o prazo de outro escritório não é achado');
select is((teste.erro($$ select portal_juridico_prazo_editar(felipe, rm, pz.recurso, 1, jsonb_build_object('descricao', 'R', 'dataFinal', '2026-11-19',
  'fazerAte', '2026-11-25', 'responsavelId', ids.intrusa)) from ids, pz $$)) -> 'detalhe' -> 'campos',
  '["descricao", "fazerAte", "responsavelId"]'::jsonb, 'EX-04: editar confere os campos como no cadastro (o caso não muda)');
select is((select portal_juridico_prazo_editar(felipe, rm, pz.recurso, 1, jsonb_build_object('descricao', 'Recurso ordinário', 'dataFinal', '2026-11-20',
  'fazerAte', '2026-11-19', 'intimacaoEm', '2026-11-11', 'responsavelId', ids.felipe)) -> 'campos' from ids, pz),
  '["data_final", "fazer_ate", "responsavel_id"]'::jsonb, 'EX-04: muda a data, a margem e o responsável');
select is((select (data_final, fazer_ate, responsavel_id = ids.felipe, versao)::text from prazos, ids, pz where prazos.id = pz.recurso),
  '(2026-11-20,2026-11-19,t,2)', 'a versão sobe e a edição fica gravada');
select is((select h.dados -> 'responsavel' ->> 'de' from historico h, pz where h.acao = 'juridico.prazo_editado' and h.dados ->> 'prazo' = pz.recurso::text),
  (select socia::text from ids), 'EX-02: o histórico do caso guarda quem era o responsável antes');
select is((select h.dados -> 'dataFinal' ->> 'para' from historico h, pz where h.acao = 'juridico.prazo_editado' and h.dados ->> 'prazo' = pz.recurso::text),
  '2026-11-20', 'o histórico guarda a data nova');
select is((teste.erro($$ select portal_juridico_prazo_editar(felipe, rm, pz.recurso, 1, jsonb_build_object('descricao', 'Recurso', 'dataFinal', '2026-11-20',
  'responsavelId', ids.felipe)) from ids, pz $$)) ->> 'codigo', 'TC409', 'PT-19: editar sobre versão velha dá conflito');
select portal_juridico_prazo_cumprido(felipe, rm, pz.alegacoes) from ids, pz;
select is((teste.erro($$ select portal_juridico_prazo_editar(felipe, rm, pz.alegacoes, 2, jsonb_build_object('descricao', 'Alegações', 'dataFinal', '2026-12-26',
  'responsavelId', ids.felipe)) from ids, pz $$)) -> 'detalhe' ->> 'motivo', 'PRAZO_JA_CUMPRIDO', 'prazo cumprido não se edita');

-- Editar tarefa.
select is((select portal_juridico_tarefa_editar(felipe, rm, pz.minuta, 1, jsonb_build_object('titulo', 'Minuta do recurso ordinário', 'venceEm', '2026-11-19',
  'responsavelId', ids.felipe, 'esperando', 'o cliente: CTPS digital')) -> 'campos' from ids, pz),
  '["esperando", "responsavel_id", "titulo", "vence_em"]'::jsonb, 'EX-02: tarefa muda o texto, a data, o responsável e o que espera');
select is((select esperando_desde from tarefas, pz where tarefas.id = pz.minuta), '2026-11-18'::date, 'esperar começa a contar de hoje');
select ajustar_relogio(('2026-11-20 10:00-03'::timestamptz - now()));
select portal_juridico_tarefa_editar(felipe, rm, pz.minuta, 2, jsonb_build_object('titulo', 'Minuta do recurso ordinário', 'venceEm', '2026-11-21',
  'responsavelId', ids.felipe, 'esperando', 'o cliente: CTPS digital e holerites')) from ids, pz;
select is((select esperando_desde from tarefas, pz where tarefas.id = pz.minuta), '2026-11-18'::date, 'o que já esperava guarda o dia em que começou');
select is((teste.erro($$ select portal_juridico_tarefa_editar(felipe, rm, pz.minuta, 2, jsonb_build_object('titulo', 'Minuta velha', 'venceEm', '2026-11-21',
  'responsavelId', ids.felipe)) from ids, pz $$)) ->> 'codigo', 'TC409', 'PT-19: tarefa com versão velha dá conflito');
select portal_juridico_tarefa_concluir(felipe, rm, pz.minuta) from ids, pz;
select is((teste.erro($$ select portal_juridico_tarefa_editar(felipe, rm, pz.minuta, 4, jsonb_build_object('titulo', 'Minuta', 'venceEm', '2026-11-21',
  'responsavelId', ids.felipe)) from ids, pz $$)) -> 'detalhe' ->> 'motivo', 'TAREFA_JA_CONCLUIDA', 'tarefa concluída não se edita');
select ajustar_relogio(('2026-11-18 10:00-03'::timestamptz - now()));

-- Agenda: prazos do período (PD-04, PD-07).
select is((select jsonb_path_query_array(portal_agenda(felipe, rm, '2026-11-16', '2026-11-22') -> 'prazos', '$[*].titulo') from ids),
  '["Recurso ordinário"]'::jsonb, 'PD-04: a semana traz os prazos abertos pelo prazo final (o cumprido sai)');
select is((select portal_agenda(felipe, rm, '2026-11-16', '2026-11-22') -> 'prazos' -> 0 ->> 'processo' from ids),
  '1001022-51.2026.5.02.0045', 'o prazo vem com o número do processo');
select is((select jsonb_array_length(portal_agenda(felipe, rm, '2026-11-16', '2026-11-22', ids.socia) -> 'prazos') from ids), 0,
  'com a pessoa escolhida, só os prazos dela');
select ok((select portal_agenda(paula, rm, '2026-11-16', '2026-11-22') -> 'prazos' = 'null'::jsonb from ids), 'PA-01: sem o Jurídico, nenhum prazo');

-- Compromisso com o caso.
create temp table cp as select
  (portal_compromisso_marcar(felipe, rm, jsonb_build_object('tipo', 'AUDIENCIA', 'titulo', 'Audiência de instrução', 'inicio', '2026-11-24T14:00:00-03:00',
     'fim', '2026-11-24T15:00:00-03:00', 'modalidade', 'PRESENCIAL', 'responsavelId', ids.felipe, 'casoId', cs.pereira)) ->> 'id')::uuid aud
  from ids, cs;
select is((select portal_compromisso(felipe, rm, cp.aud) -> 'caso' ->> 'nome' from ids, cp), 'Pereira x Mercado Bom Preço',
  'o compromisso traz o caso para quem tem o Jurídico');
select is((teste.erro($$ select portal_compromisso_marcar(paula, rm, jsonb_build_object('tipo', 'CLIENTE', 'titulo', 'Reunião', 'inicio', '2026-11-24T16:00:00-03:00',
  'fim', '2026-11-24T17:00:00-03:00', 'modalidade', 'PRESENCIAL', 'responsavelId', ids.paula, 'casoId', cs.pereira)) from ids, cs $$)) -> 'detalhe' ->> 'motivo',
  'AREA_NAO_LIBERADA', 'PA-01: sem o Jurídico, o caso não é escolhido');
select portal_compromisso_editar(paula, rm, cp.aud, 1, jsonb_build_object('tipo', 'AUDIENCIA', 'titulo', 'Audiência de instrução e julgamento',
  'inicio', '2026-11-24T14:00:00-03:00', 'fim', '2026-11-24T15:00:00-03:00', 'modalidade', 'PRESENCIAL', 'responsavelId', ids.felipe)) from ids, cp;
select is((select (caso_id = cs.pereira)::text || ',' || (portal_compromisso(paula, rm, cp.aud) ->> 'temCaso') || ',' || coalesce(portal_compromisso(paula, rm, cp.aud) ->> 'caso', 'sem')
             from compromissos, cs, cp, ids where compromissos.id = cp.aud),
  'true,true,sem', 'quem não tem o Jurídico edita sem perder o caso e não vê qual é');

select * from finish();
rollback;
