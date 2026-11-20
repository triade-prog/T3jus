-- O sino de avisos (F3.57). A IA passou a conversa, alguém assumiu a conversa de outra pessoa ou
-- passou para ela: avisa só essa pessoa, nunca quem fez; a sugestão de mudança e a resposta da
-- Meta vão para a sócia dona; cada pessoa lê só os seus, dos últimos 30 dias; abrir marca lido;
-- marcar todos só até o último mostrado; nada se apaga; isolamento (PD-07, PA-01, PT-03, PT-01).
begin;
select plan(18);

select ajustar_relogio(('2026-11-18 09:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Larissa Costa') as larissa,
  teste.pessoa('Gustavo Lima') as gustavo,
  teste.pessoa('Paula Nunes') as paula,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, larissa, 'Larissa Costa', array['JURIDICO']),
       portal_convidar(socia, rm, gustavo, 'Gustavo Lima', array['FINANCEIRO']),
       portal_convidar(socia, rm, paula, 'Paula Nunes', array[]::text[]) from ids;

create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Hélio Batista Corrêa', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Marta Corrêa', 'papel', 'esposa', 'telefone', '+5511981143059', 'principal', true)))) ->> 'id')::uuid hel
  from ids;
select portal_juridico_casos(socia, rm) from ids;
select portal_juridico_caso_criar(socia, rm, jsonb_build_object('nome', 'Corrêa x Rota Sul', 'area', 'TRABALHISTA',
  'etapaId', (select id from etapas e where e.escritorio_id = ids.rm and e.ordem = 2), 'responsavelId', ids.larissa,
  'clientes', jsonb_build_array(jsonb_build_object('clienteId', cli.hel, 'papel', 'AUTOR')))) from ids, cli;
insert into whatsapp_escritorio (escritorio_id, numero, situacao, ligado_em) select rm, '+551130001000', 'LIGADO', now() from ids;

-- A IA passa a conversa de Marta para Larissa (o caso é dela).
create temp table cv as select whatsapp_mensagem_recebida(rm, '+5511981143059', 'Marta C.', 'A audiência de terça continua marcada?') hel from ids;
select conversa_ia_passou(rm, cv.hel, 'PEDIU_PESSOA', null) from ids, cv;
create temp table l1 as select portal_avisos(larissa, rm) j from ids;
select is((select (j ->> 'novos')::integer from l1), 1, 'Larissa tem um aviso novo');
select is((select j -> 'itens' -> 0 ->> 'tipo' from l1), 'CONVERSA_IA', 'a IA passou a conversa');
select is((select j -> 'itens' -> 0 -> 'dados' ->> 'trecho' from l1), 'A audiência de terça continua marcada?', 'com a fala do cliente');
select is((select j -> 'itens' -> 0 -> 'dados' ->> 'conversa' || ' / ' || (j -> 'itens' -> 0 -> 'dados' ->> 'contato') from l1),
  'Hélio Batista Corrêa / Marta Corrêa', 'o cliente e quem escreveu');
select is((select (portal_avisos(socia, rm) ->> 'novos')::integer from ids), 0, 'PA-01: os outros não recebem');

-- Marina assume a conversa de Larissa: Larissa recebe; Marina, não.
select ajustar_relogio(('2026-11-18 09:05-03'::timestamptz - now()));
select portal_conversa_assumir(socia, rm, cv.hel, (select versao from conversas where id = cv.hel)) from ids, cv;
select is((select portal_avisos(larissa, rm) -> 'itens' -> 0 -> 'dados' ->> 'quem' from ids), 'Marina Ribeiro', 'quem assumiu a conversa dela');
select is((select (portal_avisos(socia, rm) ->> 'total')::integer from ids), 0, 'quem fez não recebe aviso');

-- Marina passa para Paula, com recado.
select ajustar_relogio(('2026-11-18 09:10-03'::timestamptz - now()));
select portal_conversa_passar(socia, rm, cv.hel, (select versao from conversas where id = cv.hel),
  jsonb_build_object('pessoa', ids.paula, 'recado', 'Ela quer confirmar a audiência.')) from ids, cv;
select is((select portal_avisos(paula, rm) -> 'itens' -> 0 -> 'dados' ->> 'recado' from ids), 'Ela quer confirmar a audiência.', 'passar leva o recado');

-- Automações: a sugestão de Gustavo e a resposta da Meta vão para a sócia dona.
create temp table au as select (portal_automacao_criar(gustavo, rm, '{"gatilho":"PARCELA_ATRASO","nome":"Cobrança gentil"}') ->> 'id')::uuid id from ids;
select portal_automacao_sugerir(gustavo, rm, au.id, 'Esperar 5 dias, e não 3.') from ids, au;
select ajustar_relogio(('2026-11-18 09:15-03'::timestamptz - now()));
insert into automacao_eventos (escritorio_id, automacao_id, tipo, detalhe)
select rm, au.id, 'META_RECUSOU', '{"nome":"Parcela atrasada, 2º aviso","motivo":"O texto parece promoção."}' from ids, au;
create temp table s1 as select portal_avisos(socia, rm) j from ids;
select is((select jsonb_agg(i ->> 'tipo') from s1, jsonb_array_elements(j -> 'itens') i), '["MODELO_RECUSADO","AUTOMACAO_SUGESTAO"]'::jsonb,
  'a sócia dona recebe a sugestão e a recusa da Meta');
select is((select j -> 'itens' -> 1 -> 'dados' ->> 'texto' from s1), 'Esperar 5 dias, e não 3.', 'com o texto da sugestão');
select is((select j -> 'itens' -> 0 -> 'dados' ->> 'motivo' from s1), 'O texto parece promoção.', 'e o motivo da Meta');
select is((select (portal_avisos(gustavo, rm) ->> 'total')::integer from ids), 0, 'quem sugeriu não recebe');

-- Abrir marca lido; marcar todos só até o último mostrado.
select is((select (portal_aviso_lido(socia, rm, (j -> 'itens' -> 0 ->> 'id')::uuid) ->> 'novos')::integer from ids, s1), 1, 'abrir marca como lido');
select ajustar_relogio(('2026-11-18 09:30-03'::timestamptz - now()));
select portal_automacao_sugerir(gustavo, rm, au.id, 'Mandar também por e-mail.') from ids, au;
select is((select (portal_avisos_lidos(socia, rm, (s1.j -> 'itens' -> 0 ->> 'em')::timestamptz) ->> 'novos')::integer from ids, s1), 1,
  'o que chegou depois continua novo');
select throws_ok($$ select portal_aviso_lido(socia, rm, (j -> 'itens' -> 0 ->> 'id')::uuid) from ids, l1 $$, 'TC404', null, 'o aviso de outra pessoa nem aparece');

-- 30 dias.
select ajustar_relogio(('2026-12-19 09:00-03'::timestamptz - now()));
select is((select (portal_avisos(larissa, rm) ->> 'total')::integer from ids), 0, 'depois de 30 dias, sai do painel');
select throws_ok($$ delete from avisos_sino $$, 'TC023', null, 'PT-03: aviso não se apaga');
select throws_ok($$ select portal_avisos(intrusa, rm) from ids $$, 'TC401', null, 'PT-01: outro escritório não lê');

select * from finish();
rollback;
