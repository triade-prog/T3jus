-- Jurídico do Portal, parte 2: prazos cadastrados à mão (com "fazer até" e intimação), cumprir
-- uma vez só, tarefas minhas e da equipe com a carga, "esperando alguém" e "já chegou",
-- concluir e reabrir, próximo prazo e pendências na lista de casos, quem sai passa o que era
-- dele, área e isolamento (EX-02, EX-03, EX-04, EX-10, PD-05, IN-08, PA-01, PT-01).
begin;
select plan(26);

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
     'etapaId', (select id from etapas where escritorio_id = ids.rm and ordem = 5), 'responsavelId', ids.socia,
     'clientes', jsonb_build_array(jsonb_build_object('clienteId', cli.joana, 'papel', 'AUTOR')))) ->> 'id')::uuid pereira,
  (portal_juridico_caso_criar(socia, rm, jsonb_build_object('nome', 'Souza x Construtora Atlas', 'area', 'CIVEL',
     'etapaId', (select id from etapas where escritorio_id = ids.rm and ordem = 3), 'responsavelId', ids.felipe,
     'clientes', jsonb_build_array(jsonb_build_object('clienteId', cli.joana, 'papel', 'AUTOR')))) ->> 'id')::uuid souza
  from ids, cli;

-- Área.
select is((teste.erro($$ select portal_juridico_prazos(paula, rm) from ids $$)) -> 'detalhe' ->> 'motivo', 'AREA_NAO_LIBERADA',
  'PA-01: sem a área Jurídico, Prazos é recusado');
select is((teste.erro($$ select portal_juridico_tarefas(paula, rm) from ids $$)) -> 'detalhe' ->> 'motivo', 'AREA_NAO_LIBERADA',
  'PA-01: sem a área Jurídico, Tarefas é recusado');

-- Prazos: campos.
select is((teste.erro($$ select portal_juridico_prazo_criar(felipe, rm, '{}'::jsonb) from ids $$)) -> 'detalhe' -> 'campos',
  '["casoId", "descricao", "dataFinal", "responsavelId"]'::jsonb, 'prazo sem nada aponta os campos');
select is((teste.erro($$ select portal_juridico_prazo_criar(felipe, rm, jsonb_build_object('casoId', cs.pereira, 'descricao', 'Recurso ordinário',
  'dataFinal', '2026-11-19', 'fazerAte', '2026-11-20', 'intimacaoEm', '2026-11-25', 'responsavelId', ids.intrusa)) from ids, cs $$)) -> 'detalhe' -> 'campos',
  '["fazerAte", "intimacaoEm", "responsavelId"]'::jsonb, '"fazer até" depois do prazo, intimação no futuro e responsável de fora são recusados');

create temp table pz as select
  (portal_juridico_prazo_criar(felipe, rm, jsonb_build_object('casoId', cs.pereira, 'descricao', 'Recurso ordinário', 'dataFinal', '2026-11-19',
     'fazerAte', '2026-11-18', 'intimacaoEm', '2026-11-11', 'responsavelId', ids.socia)) ->> 'id')::uuid recurso,
  (portal_juridico_prazo_criar(felipe, rm, jsonb_build_object('casoId', cs.souza, 'descricao', 'Contestação', 'dataFinal', '2026-11-18',
     'responsavelId', ids.felipe)) ->> 'id')::uuid contestacao,
  (portal_juridico_prazo_criar(felipe, rm, jsonb_build_object('casoId', cs.pereira, 'descricao', 'Alegações finais', 'dataFinal', '2026-11-26',
     'responsavelId', ids.felipe, 'lembrar', false)) ->> 'id')::uuid alegacoes
  from ids, cs;

select is((select portal_juridico_prazos(felipe, rm) -> 'totais' from ids), '{"hoje": 1, "meus": 2, "abertos": 3}'::jsonb, 'os números dos filtros');
select is((select jsonb_path_query_array(portal_juridico_prazos(felipe, rm) -> 'prazos', '$[*].descricao') from ids),
  '["Contestação", "Recurso ordinário", "Alegações finais"]'::jsonb, 'do mais próximo para o mais distante');
select is((select jsonb_path_query_array(portal_juridico_prazos(felipe, rm, 'MEUS') -> 'prazos', '$[*].descricao') from ids),
  '["Contestação", "Alegações finais"]'::jsonb, 'só meus');
select is((select portal_juridico_prazos(felipe, rm) -> 'prazos' -> 1 ->> 'fazerAte' from ids), '2026-11-18', 'EX-04: o "fazer até" vem na linha');

-- Lista de casos: próximo prazo e ordem.
select is((select jsonb_path_query_array(portal_juridico_casos(felipe, rm) -> 'casos', '$[*].nome') from ids),
  '["Souza x Construtora Atlas", "Pereira x Mercado Bom Preço"]'::jsonb, 'a lista de casos vem pelo prazo mais próximo');
select is((select portal_juridico_casos(felipe, rm) -> 'casos' -> 1 -> 'proximoPrazo' ->> 'descricao' from ids), 'Recurso ordinário',
  'a linha do caso traz o próximo prazo');
select is((select portal_juridico_casos(felipe, rm) -> 'totais' ->> 'prazoHoje' from ids), '1', 'casos com prazo hoje');

-- Cumprir.
select ok((select portal_juridico_prazo_cumprido(felipe, rm, pz.contestacao) ? 'cumpridoEm' from ids, pz), 'EX-04: prazo cumprido');
select is((teste.erro($$ select portal_juridico_prazo_cumprido(felipe, rm, pz.contestacao) from ids, pz $$)) -> 'detalhe' ->> 'motivo',
  'PRAZO_JA_CUMPRIDO', 'não se cumpre duas vezes');
select is((select jsonb_path_query_array(portal_juridico_prazos(felipe, rm, 'CUMPRIDOS') -> 'prazos', '$[*].descricao') from ids),
  '["Contestação"]'::jsonb, 'cumpridos');
select ok((select exists (select 1 from historico h where h.acao = 'juridico.prazo_cumprido' and h.entidade_id = cs.souza::text) from cs),
  'o cumprimento fica no histórico do caso');

-- Tarefas.
select is((teste.erro($$ select portal_juridico_tarefa_criar(felipe, rm, jsonb_build_object('casoId', cs.pereira, 'titulo', 'X')) from ids, cs $$)) -> 'detalhe' -> 'campos',
  '["titulo", "venceEm", "responsavelId"]'::jsonb, 'tarefa sem título, vencimento e responsável');
create temp table tf as select
  (portal_juridico_tarefa_criar(felipe, rm, jsonb_build_object('casoId', cs.pereira, 'titulo', 'Minuta do recurso ordinário', 'venceEm', '2026-11-18',
     'responsavelId', ids.socia)) ->> 'id')::uuid minuta,
  (portal_juridico_tarefa_criar(felipe, rm, jsonb_build_object('casoId', cs.pereira, 'titulo', 'Calcular as horas extras', 'venceEm', '2026-11-20',
     'responsavelId', ids.felipe, 'esperando', 'o cliente: CTPS digital')) ->> 'id')::uuid horas,
  (portal_juridico_tarefa_criar(felipe, rm, jsonb_build_object('casoId', cs.souza, 'titulo', 'Juntar o comprovante das custas', 'venceEm', '2026-11-14',
     'responsavelId', ids.felipe)) ->> 'id')::uuid custas
  from ids, cs;

select is((select portal_juridico_tarefas(felipe, rm) -> 'totais' from ids), '{"equipe": 3, "minhas": 2, "esperando": 1, "atrasadas": 1}'::jsonb,
  'os números das tarefas de quem abriu');
select is((select jsonb_path_query_array(portal_juridico_tarefas(felipe, rm) -> 'tarefas', '$[*].titulo') from ids),
  '["Juntar o comprovante das custas", "Calcular as horas extras"]'::jsonb, 'EX-02: minhas, pelo vencimento');
select is((select jsonb_array_length(portal_juridico_tarefas(felipe, rm, 'EQUIPE') -> 'tarefas') from ids), 3, 'da equipe');
select is((select c from ids, jsonb_array_elements(portal_juridico_tarefas(felipe, rm, 'EQUIPE') -> 'carga') c where c -> 'pessoa' ->> 'nome' = 'Felipe Matos'),
  (select jsonb_build_object('pessoa', pessoa_ref(felipe), 'casos', 1, 'tarefas', 2, 'atrasadas', 1) from ids), 'IN-08: a carga de cada pessoa');
select is((select portal_juridico_casos(felipe, rm) -> 'casos' -> 0 ->> 'pendencias' from ids), '1', 'PD-05: a pendência aparece na lista de casos');
select ok((select portal_juridico_tarefa_chegou(felipe, rm, tf.horas) ? 'id' from ids, tf), 'já chegou: deixa de esperar');
select ok((select portal_juridico_tarefa_concluir(socia, rm, tf.minuta) ->> 'concluida' from ids, tf)::boolean, 'concluir');
select is((select portal_juridico_caso(socia, rm, cs.pereira) -> 'tarefas' -> 1 -> 'concluidaPor' ->> 'nome' from ids, cs), 'Marina Ribeiro',
  'a ficha mostra as concluídas por último, com quem concluiu');

-- Quem sai passa o que era dele (EX-10).
update pessoas set senha_criada_em = now() where nome = 'Felipe Matos';
select portal_retirar(socia, rm, (select id from vinculos v where v.pessoa_id = ids.felipe and v.escritorio_id = ids.rm), 1, ids.socia) from ids;
select is((select count(*)::integer from tarefas t, ids where t.escritorio_id = ids.rm and t.concluida_em is null and t.responsavel_id = ids.socia), 2,
  'EX-10: as tarefas abertas de quem saiu passam para quem ficou');

-- Outro escritório.
select is((teste.erro($$ select portal_juridico_prazo_cumprido(intrusa, outro, pz.alegacoes) from ids, pz $$)) ->> 'codigo', 'TC404',
  'PT-01: prazo de outro escritório não é encontrado');

select * from finish();
rollback;
