-- Agenda do Portal: marcar, ver por período e pessoa, feriados, tipo escrito, remarcar com
-- motivo, cancelar sem apagar e a passagem dos compromissos de quem sai (EX-06, EX-11, PD-07,
-- EX-10, PT-03, PT-19).
begin;
select plan(31);

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Larissa Costa') as larissa,
  teste.pessoa('Paula Nunes') as paula,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, larissa, 'Larissa Costa', array['JURIDICO']),
       portal_convidar(socia, rm, paula, 'Paula Nunes', '{}') from ids;

create temp table cli as select (portal_cliente_cadastrar(socia, rm, jsonb_build_object(
  'tipo', 'PF', 'nome', 'Gabriela Teixeira',
  'contatos', jsonb_build_array(jsonb_build_object('nome', 'Gabriela Teixeira', 'telefone', '+5511996027735', 'principal', true)))) ->> 'id')::uuid as id from ids;

-- Marcar (EX-06).
create temp table c1 as select (portal_compromisso_marcar(paula, rm, jsonb_build_object(
  'tipo', 'AUDIENCIA', 'titulo', ' Conciliação · Teixeira x Banco Horizonte ', 'inicio', '2026-11-18T11:00:00-03:00',
  'fim', '2026-11-18T12:00:00-03:00', 'modalidade', 'VIRTUAL', 'linkSala', 'https://teams.microsoft.com/l/meetup-join/abc',
  'local', 'CEJUSC Pinheiros', 'clienteId', cli.id, 'responsavelId', socia, 'tambemVai', jsonb_build_array(larissa, socia),
  'lembrete', true)) ->> 'id')::uuid as id from ids, cli;
select is((select titulo || '|' || estado || '|' || cardinality(tambem_vai) from compromissos, c1 where compromissos.id = c1.id),
  'Conciliação · Teixeira x Banco Horizonte|MARCADO|1', 'EX-06: quem não tem área marca; o responsável não se repete em "também vai"');
select is((select acao from historico, c1 where entidade_id = c1.id::text and acao like 'compromisso.%'), 'compromisso.marcado',
  'PT-03: marcar vai para o histórico');

-- Erros presos ao campo.
select is((teste.erro($$ select portal_compromisso_marcar(socia, rm, jsonb_build_object('tipo', 'AUDIENCIA', 'titulo', '',
  'inicio', '2026-11-19T16:00:00-03:00', 'fim', '2026-11-19T15:00:00-03:00', 'modalidade', 'VIRTUAL', 'responsavelId', socia)) from ids $$))
  -> 'detalhe' -> 'campos', '["fim", "linkSala", "titulo"]'::jsonb, 'EX-06: o que é vazio, término antes do início e virtual sem link');
select is((teste.erro($$ select portal_compromisso_marcar(socia, rm, jsonb_build_object('tipo', 'OUTRO', 'titulo', 'Perícia médica',
  'inicio', '2026-11-19T16:00:00-03:00', 'fim', '2026-11-19T17:00:00-03:00', 'modalidade', 'PRESENCIAL', 'responsavelId', socia)) from ids $$))
  -> 'detalhe' -> 'campos', '["tipoEscrito"]'::jsonb, 'tipo Outro pede o tipo escrito');
select is((teste.erro($$ select portal_compromisso_marcar(socia, rm, jsonb_build_object('tipo', 'INTERNO', 'titulo', 'Reunião',
  'inicio', '2026-11-19T16:00:00-03:00', 'fim', '2026-11-19T17:00:00-03:00', 'modalidade', 'PRESENCIAL', 'responsavelId', intrusa)) from ids $$))
  -> 'detalhe' -> 'campos', '["responsavelId"]'::jsonb, 'PT-01: responsável de outro escritório é recusado');
select is((teste.erro($$ select portal_compromisso_marcar(intrusa, outro, jsonb_build_object('tipo', 'INTERNO', 'titulo', 'X',
  'inicio', '2026-11-19T16:00:00-03:00', 'fim', '2026-11-19T17:00:00-03:00', 'modalidade', 'PRESENCIAL', 'responsavelId', intrusa,
  'clienteId', cli.id)) from ids, cli $$)) -> 'detalhe' -> 'campos', '["clienteId"]'::jsonb, 'PT-01: cliente de outro escritório é recusado');

-- Tipo escrito e sem cliente: o lembrete não fica marcado.
create temp table c2 as select (portal_compromisso_marcar(larissa, rm, jsonb_build_object(
  'tipo', 'OUTRO', 'tipoEscrito', 'Perícia', 'titulo', 'Perícia médica · Andrade x Unimed', 'inicio', '2026-11-19T16:00:00-03:00',
  'fim', '2026-11-19T17:00:00-03:00', 'modalidade', 'PRESENCIAL', 'local', 'IMESC · Rua Maria Paula, 172',
  'linkSala', 'https://nao.vale', 'responsavelId', larissa, 'lembrete', true)) ->> 'id')::uuid as id from ids;
select is((select coalesce(link_sala, 'sem') || '|' || lembrete_cliente from compromissos, c2 where compromissos.id = c2.id), 'sem|false',
  'presencial não guarda link; sem cliente, sem lembrete');
create temp table c3 as select (portal_compromisso_marcar(socia, rm, jsonb_build_object(
  'tipo', 'INTERNO', 'titulo', 'Reunião de sócios', 'inicio', '2026-11-16T09:00:00-03:00', 'fim', '2026-11-16T10:00:00-03:00',
  'modalidade', 'PRESENCIAL', 'responsavelId', socia)) ->> 'id')::uuid as id from ids;

-- Ver o período (semana de 16 a 22/11).
select is((select jsonb_agg(x ->> 'titulo') from ids, jsonb_array_elements(portal_agenda(paula, rm, '2026-11-16', '2026-11-22') -> 'compromissos') x),
  '["Reunião de sócios", "Conciliação · Teixeira x Banco Horizonte", "Perícia médica · Andrade x Unimed"]'::jsonb,
  'EX-06: a agenda da equipe toda, por ordem de início');
select is((select jsonb_agg(x ->> 'titulo') from ids, jsonb_array_elements(portal_agenda(paula, rm, '2026-11-16', '2026-11-22', larissa) -> 'compromissos') x),
  '["Conciliação · Teixeira x Banco Horizonte", "Perícia médica · Andrade x Unimed"]'::jsonb,
  'filtro por pessoa: responsável ou quem também vai');
select is((select jsonb_agg(x ->> 'titulo') from ids, jsonb_array_elements(portal_agenda(paula, rm, '2026-11-18', '2026-11-18') -> 'compromissos') x),
  '["Conciliação · Teixeira x Banco Horizonte"]'::jsonb, 'o dia vai da meia-noite à meia-noite de Brasília');
select is((select portal_agenda(paula, rm, '2026-11-16', '2026-11-22') -> 'feriados' from ids),
  '[{"data": "2026-11-20", "nome": "Consciência Negra"}]'::jsonb, 'feriado nacional vem com o período');
select is((select portal_agenda(paula, rm, '2026-11-16', '2026-11-22') -> 'tiposEscritos' from ids), '["Perícia"]'::jsonb,
  'os tipos escritos do escritório viram sugestão');
select is((select portal_agenda(paula, rm, '2026-11-16', '2026-11-22') -> 'prazos' from ids), 'null'::jsonb,
  'PD-07: quem não tem o Jurídico não recebe prazos');
select is((select portal_agenda(larissa, rm, '2026-11-16', '2026-11-22') ->> 'juridico' from ids), 'true', 'quem tem o Jurídico é avisado');
select is((teste.erro($$ select portal_agenda(socia, rm, '2026-11-01', '2027-02-01') from ids $$)) -> 'detalhe' -> 'campos', '["de", "ate"]'::jsonb,
  'período longo demais é recusado');
select is((teste.erro($$ select portal_agenda(intrusa, rm, '2026-11-16', '2026-11-22') from ids $$)) ->> 'codigo', 'TC401',
  'PT-01: de outro escritório não vê a agenda');
select is((select jsonb_array_length(portal_agenda(intrusa, outro, '2026-11-16', '2026-11-22') -> 'compromissos') from ids), 0,
  'PT-01: o outro escritório não vê os compromissos deste');

-- Ficha.
select is((select portal_compromisso(paula, rm, c1.id) -> 'contatoCliente' ->> 'telefone' from ids, c1), '+5511996027735',
  'EX-11: a ficha diz para quem vai o lembrete (o contato principal)');
select is((teste.erro($$ select portal_compromisso(intrusa, outro, c1.id) from ids, c1 $$)) ->> 'codigo', 'TC404',
  'PT-01: compromisso de outro escritório não é encontrado');

-- Editar e remarcar (PT-19, PT-03).
create temp table dados as select jsonb_build_object(
  'tipo', 'AUDIENCIA', 'titulo', 'Conciliação · Teixeira x Banco Horizonte', 'inicio', '2026-11-18T14:00:00-03:00',
  'fim', '2026-11-18T15:00:00-03:00', 'modalidade', 'VIRTUAL', 'linkSala', 'https://teams.microsoft.com/l/meetup-join/abc',
  'clienteId', cli.id, 'responsavelId', ids.socia, 'tambemVai', jsonb_build_array(ids.larissa), 'lembrete', true) as d from ids, cli;
select is((teste.erro($$ select portal_compromisso_editar(socia, rm, c1.id, 1, d) from ids, c1, dados $$)) -> 'detalhe' -> 'campos',
  '["motivo"]'::jsonb, 'PT-03: remarcar pede motivo');
select is((select portal_compromisso_editar(socia, rm, c1.id, 1, d, 'redesignação publicada em 10/11') ->> 'versao' from ids, c1, dados), '2',
  'remarcar com motivo');
select is((select dados ->> 'motivo' from historico, c1 where entidade_id = c1.id::text and acao = 'compromisso.remarcado'),
  'redesignação publicada em 10/11', 'o motivo da remarcação fica no histórico');
select is((teste.erro($$ select portal_compromisso_editar(socia, rm, c1.id, 1, d || '{"titulo":"Outro"}', 'x') from ids, c1, dados $$)) ->> 'codigo',
  'TC409', 'PT-19: editar sobre versão velha dá conflito');
select lives_ok($$ select portal_compromisso_editar(socia, rm, c1.id, 2, d || '{"observacoes":"Levar a planilha"}') from ids, c1, dados $$,
  'mudar o resto não pede motivo');
select is((select dados -> 'campos' from historico, c1 where entidade_id = c1.id::text and acao = 'compromisso.editado' order by historico.id desc limit 1), '["observacoes"]'::jsonb,
  'o histórico guarda só os nomes dos campos editados');

-- Cancelar (PT-03).
select is((teste.erro($$ select portal_compromisso_cancelar(socia, rm, c1.id, 3, ' ', true) from ids, c1 $$)) -> 'detalhe' -> 'campos',
  '["motivo"]'::jsonb, 'PT-03: cancelar pede motivo');
select is((select portal_compromisso_cancelar(socia, rm, c1.id, 3, 'acordo fechado antes', true) from ids, c1), 4, 'cancelar');
select is((select estado || '|' || avisar_cancelamento from compromissos, c1 where compromissos.id = c1.id), 'CANCELADO|true',
  'PT-03: o compromisso cancelado continua lá, riscado');
select is((teste.erro($$ select portal_compromisso_editar(socia, rm, c1.id, 4, d, 'x') from ids, c1, dados $$)) -> 'detalhe' ->> 'motivo',
  'COMPROMISSO_CANCELADO', 'cancelado não se edita');

-- EX-10: quem sai passa os compromissos futuros.
update pessoas set senha_criada_em = now() where nome = 'Larissa Costa';
select ajustar_relogio(('2026-11-17 12:00-03'::timestamptz - now()));
select portal_retirar(socia, rm, (select id from vinculos v where v.pessoa_id = ids.larissa and v.escritorio_id = ids.rm), 1, ids.paula) from ids;
select is((select responsavel_id from compromissos, c2 where compromissos.id = c2.id), (select paula from ids),
  'EX-10: o compromisso futuro de quem saiu passa para quem foi escolhido');
select ok((select count(*) = 1 from historico, c2 where entidade_id = c2.id::text and acao = 'compromisso.responsavel_passado'),
  'a passagem fica no histórico do compromisso');
select ajustar_relogio(interval '0');

select * from finish();
rollback;
