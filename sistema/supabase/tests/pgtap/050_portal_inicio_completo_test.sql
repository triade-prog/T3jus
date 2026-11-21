-- Início do Portal completo: a cobrança do dia de quem tem a próxima ação (F3.21, PD-07), o
-- prazo 2 dias antes no Jurídico e no sino (F3.38, EX-04, EX-02) e a petição esperando a
-- revisão (F3.76, EX-09); isolamento (PT-01).
begin;
select plan(20);

select ajustar_relogio(('2026-11-05 10:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Bianca Torres') as bianca,
  teste.pessoa('Larissa Costa') as larissa,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, bianca, 'Bianca Torres', array['FINANCEIRO']),
       portal_convidar(socia, rm, larissa, 'Larissa Costa', array['JURIDICO']) from ids;

create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Gabriela Teixeira', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Gabriela', 'telefone', '+5511996027734', 'principal', true)))) ->> 'id')::uuid gab,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Irene Castro', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Irene', 'telefone', '+5511996027735', 'principal', true)))) ->> 'id')::uuid ire
  from ids;

-- Gabriela paga em 2 parcelas, a primeira só em dezembro (longe do Início), com Marina responsável.
create temp table ct as select
  (portal_contrato_criar(socia, rm, jsonb_build_object('clienteId', cli.gab, 'objeto', 'Cobrança', 'responsavelId', ids.socia,
     'advogados', jsonb_build_array(ids.socia), 'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'PARCELADO', 'total', 200000,
     'parcelas', 2, 'primeiro', '2026-12-10')))) ->> 'id')::uuid gab
  from ids, cli;
select portal_contrato_assinatura(socia, rm, ct.gab, 1, '2026-11-05') from ids, ct;
create temp table pc as select
  (select id from recebimentos_previstos where contrato_id = ct.gab order by vencimento limit 1) p1,
  (select id from recebimentos_previstos where contrato_id = ct.gab order by vencimento desc limit 1) p2
  from ct;

select ajustar_relogio(('2026-11-18 10:00-03'::timestamptz - now()));

-- F3.21: a cobrança do dia.
select is((select portal_inicio_financeiro(bianca, rm) -> 'escritorio' -> 'total' from ids), '0'::jsonb,
  'sem anotação, a parcela de dezembro não aparece no Início');
select portal_financeiro_cobranca_anotar(socia, rm, pc.p1, jsonb_build_object('tipo', 'LIGACAO', 'texto', 'Pediu para mandar o Pix antes',
         'proxData', '2026-11-18', 'proxOque', 'Mandar o Pix da primeira parcela', 'proxResponsavelId', ids.bianca)),
       portal_financeiro_cobranca_anotar(socia, rm, pc.p2, jsonb_build_object('tipo', 'ANOTACAO', 'texto', 'Combinado',
         'proxData', '2026-11-19', 'proxOque', 'Conferir o boleto', 'proxResponsavelId', ids.bianca))
  from ids, pc;
create temp table rf as select portal_inicio_financeiro(bianca, rm) r from ids;
select is((select jsonb_path_query_array(r -> 'escritorio' -> 'grupos', '$[*].chave') from rf), '["HOJE"]'::jsonb,
  'PD-07: a próxima ação de hoje põe a parcela em "Para hoje" de quem tem a ação');
select is((select r -> 'escritorio' -> 'grupos' -> 0 -> 'itens' -> 0 ->> 'id' from rf, pc), (select p1::text from pc),
  'é a parcela da ação de hoje; a de amanhã ainda não aparece');
select is((select r -> 'escritorio' -> 'grupos' -> 0 -> 'itens' -> 0 -> 'cobranca' ->> 'proxOque' from rf), 'Mandar o Pix da primeira parcela',
  'o item traz a próxima ação');
select is((select r ->> 'pedem' from rf), '1', 'conta no que pede Bianca hoje');
select is((select portal_inicio_financeiro(socia, rm) -> 'escritorio' -> 'total' from ids), '0'::jsonb,
  '"Os meus" de Marina não mostra a cobrança passada para Bianca');
select is((select portal_inicio_financeiro(socia, rm, 'EQUIPE') -> 'escritorio' -> 'grupos' -> 0 -> 'itens' -> 0 -> 'responsavel' ->> 'nome' from ids),
  'Bianca Torres', 'na visão da equipe, com o responsável');

-- F3.38: o prazo 2 dias antes, no Jurídico e no sino.
select portal_juridico_etapas(socia, rm) from ids;
create temp table cs as select
  (portal_juridico_caso_criar(socia, rm, jsonb_build_object('nome', 'Castro x Banco Horizonte', 'area', 'CIVEL',
     'etapaId', (select id from etapas where escritorio_id = ids.rm and ordem = 2), 'responsavelId', ids.larissa,
     'clientes', jsonb_build_array(jsonb_build_object('clienteId', cli.ire, 'papel', 'REU')))) ->> 'id')::uuid ire
  from ids, cli;
create temp table pz as select
  (portal_juridico_prazo_criar(socia, rm, jsonb_build_object('casoId', cs.ire, 'descricao', 'Contestação', 'dataFinal', '2026-11-23',
     'fazerAte', '2026-11-20', 'responsavelId', ids.larissa)) ->> 'id')::uuid lembra,
  (portal_juridico_prazo_criar(socia, rm, jsonb_build_object('casoId', cs.ire, 'descricao', 'Réplica', 'dataFinal', '2026-11-19',
     'responsavelId', ids.larissa, 'lembrar', false)) ->> 'id')::uuid sem_lembrete,
  (portal_juridico_prazo_criar(socia, rm, jsonb_build_object('casoId', cs.ire, 'descricao', 'Memoriais', 'dataFinal', '2026-11-21',
     'responsavelId', ids.larissa)) ->> 'id')::uuid longe
  from ids, cs;

create temp table rj as select portal_inicio_juridico(larissa, rm) r from ids;
select is((select jsonb_path_query_array(r -> 'grupos', '$[*].chave') from rj), '["ACOMPANHAR"]'::jsonb,
  'EX-04: com o lembrete, o prazo entra em "A acompanhar" 2 dias antes');
select is((select jsonb_build_object('desc', r -> 'grupos' -> 0 -> 'itens' -> 0 -> 'descricao', 'lembrete', r -> 'grupos' -> 0 -> 'itens' -> 0 -> 'lembrete') from rj),
  '{"desc": "Contestação", "lembrete": true}'::jsonb, 'conta o "fazer até"; sem o lembrete, o de amanhã espera o dia; o de 3 dias, ainda não');
select is((select r ->> 'pedem' from rj), '0', 'a acompanhar não conta no que pede hoje');

select is((select avisar_prazos_em_2_dias() -> 'avisos'), '1'::jsonb, 'a rotina avisa só o prazo de daqui a 2 dias com o lembrete');
select is((select avisar_prazos_em_2_dias() -> 'avisos'), '0'::jsonb, 'rodar de novo no mesmo dia não repete o aviso');
create temp table av as select a.* from avisos_sino a, pz where a.origem_id = pz.lembra;
select is((select pessoa_id from av), (select larissa from ids), 'o aviso vai para o responsável pelo prazo');
select is((select dados - 'em' from av),
  '{"prazo": "Contestação", "vence": "segunda, 23/11 (fazer até sexta, 20/11)", "cliente": "Irene Castro"}'::jsonb,
  'o aviso diz o prazo, o cliente e quando vence');
select is((select portal_avisos(larissa, rm) -> 'itens' -> 0 ->> 'tipo' from ids), 'PRAZO_2_DIAS', 'chega no sino de Larissa');

-- F3.76: a petição esperando a revisão.
select entrar_escritorio_servico(rm) from ids;
insert into peticoes (escritorio_id, caso_id, modelo_padrao, modelo_nome, situacao, revisor_id, gerado_por)
  select ids.rm, cs.ire, 'CONTESTACAO_CIVEL', 'Contestação', 'REVISAO', ids.larissa, ids.socia from ids, cs;
select limpar_contexto();

create temp table rp as select portal_inicio_juridico(larissa, rm) r from ids;
select is((select r -> 'grupos' -> 0 ->> 'chave' from rp), 'HOJE', 'EX-09: a petição para revisar pede a pessoa hoje');
select is((select jsonb_build_object('tipo', i -> 'tipo', 'prazo', i -> 'prazo' -> 'descricao', 'por', i -> 'por' -> 'nome')
             from rp, lateral (select r -> 'grupos' -> 0 -> 'itens' -> 0 i) x),
  '{"tipo": "PETICAO", "por": "Marina Ribeiro", "prazo": "Réplica"}'::jsonb, 'com quem mandou e o prazo mais próximo do caso');
select is((select portal_inicio_resumo(larissa, rm) -> 'pedem' -> 'JURIDICO' from ids), '1'::jsonb, 'o hero conta a revisão');

update peticoes set situacao = 'AJUSTE' where caso_id = (select ire from cs);
select is((select portal_inicio_juridico(larissa, rm) -> 'pedem' from ids), '0'::jsonb, 'quando o revisor decide, ela sai do Início');

select is((teste.erro($$ select portal_inicio_juridico(intrusa, rm) from ids $$)) ->> 'codigo', 'TC401', 'PT-01: outro escritório não entra');

select * from finish();
rollback;
