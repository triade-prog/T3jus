-- Automações › a IA monta o fluxo (F3.59). O contexto traz só os gatilhos das áreas da pessoa,
-- a equipe e as automações ligadas; a sugestão nova cria a automação só com o gatilho e as
-- condições salvos; o formato é conferido; aplicar e recusar mudam o rascunho e o que sobra da
-- sugestão; as prontas não passam pela IA; quem não tem a área não pede; isolamento (PA-03, PA-01, PT-01).
begin;
select plan(17);

select ajustar_relogio(('2026-11-18 10:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Gustavo Lima') as gustavo,
  teste.pessoa('Felipe Matos') as felipe,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, gustavo, 'Gustavo Lima', array['FINANCEIRO']),
       portal_convidar(socia, rm, felipe, 'Felipe Matos', array['JURIDICO']) from ids;

select is((select portal_automacao_ia_contexto(gustavo, rm) -> 'gatilhos' from ids),
  '["PAGAMENTO_RECEBIDO","PARCELA_VAI_VENCER","PARCELA_ATRASO","PRESTACAO_CONTAS","CLIENTE_NOVO"]'::jsonb, 'PA-01: só os gatilhos das áreas de quem pede, e o cliente novo, que é de Conversas (PA-06)');
select is((select jsonb_array_length(portal_automacao_ia_contexto(gustavo, rm) -> 'ligadas') from ids), 6, 'as seis prontas ligadas entram no contexto');
select ok((select portal_automacao_ia_contexto(gustavo, rm) -> 'pessoas' @> jsonb_build_array(jsonb_build_object('id', gustavo, 'areas', '["FINANCEIRO"]'::jsonb)) from ids),
  'a equipe vai com as áreas');

create temp table sug as select jsonb_build_object(
  'pedido', 'Quero cobrar com educação quem atrasar, e se não pagar em 5 dias passa para o Gustavo.',
  'gatilho', 'PARCELA_ATRASO', 'nome', 'Cobrança gentil',
  'fluxo', jsonb_build_object('passos', jsonb_build_array(
    jsonb_build_object('id', 'gatilho', 'tipo', 'GATILHO', 'dias', 3),
    jsonb_build_object('id', 'cond', 'tipo', 'CONDICOES', 'semCombinado', true),
    jsonb_build_object('id', 'msg-1', 'tipo', 'MENSAGEM', 'nome', 'Cobrança gentil', 'texto', 'Olá, {nome}. A parcela {parcela} venceu. Ribeiro & Matos'),
    jsonb_build_object('id', 'espera', 'tipo', 'ESPERA', 'dias', 5),
    jsonb_build_object('id', 'ramos', 'tipo', 'RAMOS', 'ramos', jsonb_build_array(
      jsonb_build_object('quando', 'PAGOU', 'passos', jsonb_build_array(jsonb_build_object('id', 'fim-p', 'tipo', 'FIM'))),
      jsonb_build_object('quando', 'NADA', 'passos', jsonb_build_array(jsonb_build_object('id', 'pessoa', 'tipo', 'PESSOA', 'pessoaId', gustavo, 'motivo', '5 dias sem pagamento'))))))),
  'feito', jsonb_build_array(jsonb_build_object('texto', 'Espera de 5 dias.', 'passo', 'espera')),
  'alertas', '[]'::jsonb, 'experimente', '["Espere 7 dias", "x"]'::jsonb) d from ids;

create temp table nova as select portal_automacao_ia_sugerir(gustavo, rm, null, sug.d) p from ids, sug;
select is((select p -> 'rascunho' -> 'passos' from nova), '[{"id":"gatilho","tipo":"GATILHO","dias":3},{"id":"cond","tipo":"CONDICOES","semCombinado":true}]'::jsonb,
  'a automação nasce só com o gatilho e as condições salvos');
select is((select p ->> 'situacao' from nova), 'RASCUNHO', 'nasce em rascunho');
select is((select p -> 'sugestao' ->> 'pedido' from nova), 'Quero cobrar com educação quem atrasar, e se não pagar em 5 dias passa para o Gustavo.', 'o pedido fica guardado');
select is((select p -> 'sugestao' -> 'por' ->> 'nome' from nova), 'Gustavo Lima', 'com quem pediu');
select is((select p -> 'sugestao' -> 'experimente' from nova), '["Espere 7 dias"]'::jsonb, 'sugestões curtas demais saem');

-- Aplicar parte: o rascunho muda e a sugestão continua; recusar tudo limpa.
select is((select portal_automacao_salvar(gustavo, rm, (p ->> 'id')::uuid, (p ->> 'versao')::integer,
             jsonb_build_object('fluxo', jsonb_build_object('passos', (p -> 'rascunho' -> 'passos') || jsonb_build_array(p -> 'sugestao' -> 'fluxo' -> 'passos' -> 2)),
                                'sugestao', jsonb_build_object('fluxo', p -> 'sugestao' -> 'fluxo'))) -> 'sugestao' ->> 'pedido' from ids, nova),
  'Quero cobrar com educação quem atrasar, e se não pagar em 5 dias passa para o Gustavo.', 'aplicar um passo guarda o resto da sugestão');
select is((select jsonb_array_length(portal_automacao(gustavo, rm, (p ->> 'id')::uuid) -> 'rascunho' -> 'passos') from ids, nova), 3, 'o passo aplicado está no rascunho');
select is((select portal_automacao_salvar(gustavo, rm, (p ->> 'id')::uuid, (portal_automacao(gustavo, rm, (p ->> 'id')::uuid) ->> 'versao')::integer,
             '{"sugestao":null}') -> 'sugestao' from ids, nova), 'null'::jsonb, 'recusar tudo limpa a sugestão');
select is((teste.erro($$ select portal_automacao_salvar(gustavo, rm, (p ->> 'id')::uuid, (portal_automacao(gustavo, rm, (p ->> 'id')::uuid) ->> 'versao')::integer,
             jsonb_build_object('sugestao', jsonb_build_object('fluxo', p -> 'rascunho'))) from ids, nova $$)) -> 'detalhe' -> 'campos',
  '["sugestao"]'::jsonb, 'sem sugestão guardada, não dá para criar uma por salvar');

-- Pedir uma mudança numa automação já existente troca a sugestão.
select is((select portal_automacao_ia_sugerir(gustavo, rm, (p ->> 'id')::uuid, sug.d || '{"pedido":"Espere 7 dias"}') -> 'sugestao' ->> 'pedido' from ids, nova, sug),
  'Espere 7 dias', 'mudança pedida numa automação guarda a nova sugestão');

select is((teste.erro($$ select portal_automacao_ia_sugerir(felipe, rm, null, sug.d) from ids, sug $$)) -> 'detalhe' -> 'campos',
  '["gatilho"]'::jsonb, 'PA-01: Felipe (Jurídico) não monta cobrança');
select is((teste.erro($$ select portal_automacao_ia_sugerir(gustavo, rm, null, sug.d || '{"fluxo":{"passos":[{"id":"x","tipo":"FIM"},{"id":"y","tipo":"FIM"}]}}') from ids, sug $$)) -> 'detalhe' ->> 'forma',
  'o gatilho é só o primeiro passo', 'o formato do que a IA devolve é conferido');
select is((teste.erro($$ select portal_automacao_ia_contexto(socia, rm, a.id) from ids, automacoes a where a.escritorio_id = ids.rm and a.pronta_chave = 'PARCELA_ATRASO' $$)) -> 'detalhe' ->> 'motivo',
  'PRONTA', 'as prontas do T3jus não passam pela IA');
select throws_ok($$ select portal_automacao_ia_contexto(intrusa, rm) from ids $$, 'TC401', null, 'PT-01: outro escritório não pede');

select * from finish();
rollback;
