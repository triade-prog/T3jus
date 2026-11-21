-- As próximas audiências no Início (F3.2, EX-06): só audiências marcadas, de amanhã até 7 dias
-- depois, no máximo 3, com o total e a seguinte; todos do escritório veem; isolamento (PT-01).
begin;
select plan(8);

select ajustar_relogio(('2026-11-18 10:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Paula Nunes') as paula,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, paula, 'Paula Nunes', array[]::text[]) from ids;

create temp table ag(titulo text, tipo text, ini text);
insert into ag values
  ('Hoje', 'AUDIENCIA', '2026-11-18T11:00:00-03:00'),
  ('Instrução · Corrêa', 'AUDIENCIA', '2026-11-19T13:30:00-03:00'),
  ('Conciliação · Mendes', 'AUDIENCIA', '2026-11-19T16:00:00-03:00'),
  ('Reunião', 'CLIENTE', '2026-11-20T10:00:00-03:00'),
  ('Conciliação · Castro', 'AUDIENCIA', '2026-11-24T10:30:00-03:00'),
  ('Instrução · Souza', 'AUDIENCIA', '2026-11-25T23:30:00-03:00'),
  ('Instrução · Lima', 'AUDIENCIA', '2026-11-26T13:30:00-03:00');
create temp table cm as select ag.titulo, (portal_compromisso_marcar(socia, rm, jsonb_build_object('tipo', ag.tipo, 'titulo', ag.titulo,
    'inicio', ag.ini, 'fim', (ag.ini::timestamptz + interval '1 hour'), 'modalidade', 'PRESENCIAL', 'local', 'TRT-2', 'responsavelId', ids.socia)) ->> 'id')::uuid id
  from ids, ag;
-- Uma cancelada, que não aparece.
select portal_compromisso_cancelar(socia, rm, (portal_compromisso_marcar(socia, rm, jsonb_build_object('tipo', 'AUDIENCIA', 'titulo', 'Cancelada',
    'inicio', '2026-11-19T09:00:00-03:00', 'fim', '2026-11-19T10:00:00-03:00', 'modalidade', 'PRESENCIAL', 'responsavelId', ids.socia)) ->> 'id')::uuid,
  1, 'O juiz adiou') from ids;

create temp table r as select portal_inicio_audiencias(paula, rm) j from ids;
select is((select jsonb_path_query_array(j -> 'itens', '$[*].titulo') from r),
  '["Instrução · Corrêa", "Conciliação · Mendes", "Conciliação · Castro"]'::jsonb,
  'EX-06: as 3 audiências mais próximas, de amanhã em diante, sem a de hoje, a cancelada nem a reunião');
select is((select j -> 'total' from r), '4'::jsonb, 'o total conta a de 25/11 à noite, ainda dentro dos 7 dias de Brasília');
select is((select j -> 'seguinte' ->> 'titulo' from r), 'Instrução · Lima', 'a seguinte é a primeira depois da janela');
select is((select jsonb_build_object('de', j -> 'de', 'ate', j -> 'ate') from r), '{"de": "2026-11-19", "ate": "2026-11-25"}'::jsonb, 'de amanhã até 7 dias depois');
select is((select j -> 'itens' -> 0 -> 'responsavel' ->> 'nome' from r), 'Marina Ribeiro', 'cada uma diz quem vai');
select is((select j -> 'itens' -> 0 ->> 'modalidade' from r), 'PRESENCIAL', 'e a modalidade');

select ajustar_relogio(('2026-11-27 10:00-03'::timestamptz - now()));
select is((select portal_inicio_audiencias(socia, rm) - 'de' - 'ate' from ids), '{"itens": [], "total": 0, "seguinte": null}'::jsonb,
  'vazio: nenhuma nos próximos 7 dias e nenhuma depois');
select is((teste.erro($$ select portal_inicio_audiencias(intrusa, rm) from ids $$)) ->> 'codigo', 'TC401', 'PT-01: outro escritório não entra');

select * from finish();
rollback;
