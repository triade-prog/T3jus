-- A IA que atende (F3.53). O serviço lê a situação da conversa e da IA e o contexto do cliente
-- que escreve: só os assuntos ligados, só o cliente daquele número, nada de caso para número
-- desconhecido; mensagem do app no celular passa a conversa para a equipe e a IA fica quieta
-- até alguém devolver; os motivos novos de passar; Testar sem enviar só pela sócia dona, com
-- contato da ficha ou número desconhecido, e libera ligar; isolamento
-- (PA-05, PA-04, PD-07, PT-11, PT-01).
begin;
select plan(32);

select ajustar_relogio(('2026-11-10 09:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Paula Nunes') as paula,
  teste.pessoa('Larissa Costa') as larissa,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, diego, 'Diego Almeida', array['COMERCIAL']), portal_convidar(socia, rm, paula, 'Paula Nunes', array[]::text[]),
       portal_convidar(socia, rm, larissa, 'Larissa Costa', array['JURIDICO']) from ids;

create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Hélio Batista Corrêa', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Hélio Batista Corrêa', 'telefone', '+5511981143058', 'principal', true),
                                   jsonb_build_object('nome', 'Marta Corrêa', 'papel', 'esposa', 'telefone', '+5511981143059', 'principal', false))
                  )) ->> 'id')::uuid hel,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Antônia Ferreira Prado', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Joana Prado', 'papel', 'filha', 'telefone', '+5511991234567', 'principal', true)))) ->> 'id')::uuid ant
  from ids;

select portal_juridico_casos(socia, rm) from ids;
select portal_juridico_caso_criar(socia, rm, jsonb_build_object('nome', 'Corrêa x Rota Sul', 'area', 'TRABALHISTA',
  'etapaId', (select id from etapas e where e.escritorio_id = ids.rm and e.ordem = 2), 'responsavelId', ids.larissa,
  'clientes', jsonb_build_array(jsonb_build_object('clienteId', cli.hel, 'papel', 'AUTOR')))) from ids, cli;
select portal_juridico_caso_criar(socia, rm, jsonb_build_object('nome', 'Prado x INSS', 'area', 'PREVIDENCIARIO',
  'etapaId', (select id from etapas e where e.escritorio_id = ids.rm and e.ordem = 3), 'responsavelId', ids.larissa,
  'clientes', jsonb_build_array(jsonb_build_object('clienteId', cli.ant, 'papel', 'AUTOR')))) from ids, cli;
select portal_compromisso_marcar(socia, rm, jsonb_build_object('tipo', 'AUDIENCIA', 'titulo', 'Audiência de conciliação',
  'inicio', '2026-11-25T14:00:00-03:00', 'fim', '2026-11-25T15:00:00-03:00', 'modalidade', 'PRESENCIAL', 'local', 'Fórum Trabalhista, sala 4',
  'clienteId', cli.hel, 'responsavelId', larissa)) from ids, cli;
select portal_compromisso_marcar(socia, rm, jsonb_build_object('tipo', 'INTERNO', 'titulo', 'Reunião interna sobre o caso',
  'inicio', '2026-11-24T10:00:00-03:00', 'fim', '2026-11-24T11:00:00-03:00', 'modalidade', 'VIRTUAL', 'linkSala', 'https://meet.example.com/abc',
  'clienteId', cli.hel, 'responsavelId', larissa)) from ids, cli;

select ajustar_relogio(('2026-11-18 21:30-03'::timestamptz - now()));

select is((teste.erro($$ select ia_atendimento(rm, gen_random_uuid()) from ids $$)) -> 'detalhe' ->> 'motivo',
  'WHATSAPP_NAO_LIGADO', 'sem o número ligado, a IA não atende');

insert into whatsapp_escritorio (escritorio_id, numero, situacao, ligado_em) select rm, '+551130001000', 'LIGADO', now() from ids;

create temp table cv as select
  whatsapp_mensagem_recebida(rm, '+5511981143059', 'Marta', 'Boa noite. Quando é a audiência do Hélio?') hel,
  whatsapp_mensagem_recebida(rm, '+5511900000001', 'Rafael', 'Oi, quero saber quanto custa uma ação') novo
  from ids;
create temp table at as select ia_atendimento(rm, cv.hel) a from ids, cv;

select is((select a ->> 'iaSituacao' from at), 'DESLIGADA', 'a IA começa desligada (o serviço passa direto para a equipe)');
select is((select a -> 'conversa' ->> 'situacao' from at), 'IA', 'a conversa nova está com a IA');
select is((select a -> 'conversa' ->> 'pessoaRespondeu' from at), 'false', 'nenhuma pessoa respondeu ainda');
select is((select a -> 'mensagens' -> 0 ->> 'texto' from at), 'Boa noite. Quando é a audiência do Hélio?', 'a IA lê as últimas mensagens');
select is((select a -> 'contexto' -> 'cliente' ->> 'nome' from at), 'Hélio Batista Corrêa', 'o cliente vem do telefone');
select is((select a -> 'contexto' -> 'contato' from at), '{"nome":"Marta Corrêa","papel":"esposa","principal":false}'::jsonb,
  'quem escreve é um contato autorizado da ficha');
select is((select a -> 'contexto' -> 'quemResponde' from at), '{"nome":"Larissa Costa","razao":"CASO"}'::jsonb, 'se passar, vai para quem cuida do caso');
select is((select a -> 'contexto' -> 'dados' -> 'casos' -> 0 ->> 'nome' from at), 'Corrêa x Rota Sul', 'o caso do cliente entra');
select ok((select length(a -> 'contexto' -> 'dados' -> 'casos' -> 0 ->> 'texto') > 10 from at), 'com o texto da etapa para o cliente');
select is((select jsonb_agg(c ->> 'titulo') from at, jsonb_array_elements(a -> 'contexto' -> 'dados' -> 'compromissos') c),
  '["Audiência de conciliação"]'::jsonb, 'compromissos com o cliente, sem os internos');
select is((select a -> 'contexto' ->> 'agora' from at), '2026-11-18T21:30', 'a hora de Brasília, para saber se está fora do horário');
select ok((select a -> 'contexto' -> 'feriados' ? '2026-11-20' from at), 'e os feriados dos próximos dias');
select ok((select position('Prado' in (a -> 'contexto')::text) = 0 from at), 'nada de outro cliente no contexto (PT-11)');

update ia_config set assuntos = array['COMPROMISSOS'] where escritorio_id = (select rm from ids);
select is((select jsonb_object_keys(ia_atendimento(rm, cv.hel) -> 'contexto' -> 'dados') from ids, cv), 'compromissos',
  'só os assuntos ligados entram');

select is((select ia_atendimento(rm, cv.novo) -> 'contexto' -> 'dados' from ids, cv), '{}'::jsonb, 'número desconhecido não recebe dado de caso nenhum');
select is((select ia_atendimento(rm, cv.novo) -> 'contexto' ->> 'comercial' from ids, cv), 'Diego Almeida', 'contato novo vai para o Comercial');

-- Os motivos novos de passar.
select lives_ok($$ select conversa_ia_passou(rm, cv.novo, 'IA_DESLIGADA', null) from ids, cv $$, 'com a IA desligada, passa direto para a equipe');
select is((select motivo || '/' || responsavel_razao from conversas, cv where id = cv.novo), 'IA_DESLIGADA/COMERCIAL', 'com o motivo e o responsável');

-- Resposta pelo app no celular.
select lives_ok($$ select whatsapp_mensagem_do_app(rm, '+5511981143059', 'Oi Marta, aqui é a Larissa. A audiência é dia 25.') from ids $$,
  'chega a mensagem escrita no app do celular');
select is((select situacao || '/' || responsavel_razao from conversas, cv where id = cv.hel), 'EQUIPE/APP_CELULAR', 'a conversa passa para a equipe');
select is((select assumida_por from conversas, cv where id = cv.hel), (select larissa from ids), 'com quem cuida do caso');
select is((select ia_atendimento(rm, cv.hel) -> 'conversa' ->> 'pessoaRespondeu' from ids, cv), 'true', 'a IA sabe que uma pessoa respondeu');
select is((teste.erro($$ select conversa_ia_respondeu(rm, cv.hel, 'Olá!') from ids, cv $$)) -> 'detalhe' ->> 'motivo',
  'CONVERSA_COM_EQUIPE', 'e fica em silêncio nela');
select is((select count(*)::int from conversa_mensagens m, cv where m.conversa_id = cv.hel and m.evento = 'APP_RESPONDEU'), 1, 'o momento fica na conversa');

select is((select m ->> 'para' is not null from ids, cv, jsonb_array_elements(portal_conversa(socia, rm, cv.hel) -> 'mensagens') m where m ->> 'evento' = 'APP_RESPONDEU'), true, 'a tela mostra com quem a conversa ficou');

-- Testar sem enviar.
select is((teste.erro($$ select portal_ia_teste_contatos(paula, rm, null) from ids $$)) -> 'detalhe' ->> 'motivo', 'SO_SOCIO_DONO',
  'só a sócia dona testa');
select is((select jsonb_agg(c ->> 'nome') from ids, jsonb_array_elements(portal_ia_teste_contatos(socia, rm, 'prado') -> 'clientes') c),
  '["Antônia Ferreira Prado"]'::jsonb, 'acha o cliente para conversar como ele');
select is((teste.erro($$ select portal_ia_teste_contexto(socia, rm, cli.ant, gen_random_uuid()::text) from ids, cli $$)) -> 'detalhe' ->> 'motivo',
  'CONTATO_FORA_DA_FICHA', 'só contato da ficha');
select is((teste.erro($$ select portal_ia_testada(socia, rm, 'Antônia') from ids $$)) -> 'detalhe' -> 'campos', '["como"]'::jsonb,
  'o teste não guarda nome de cliente');
select isnt((select portal_ia_testada(socia, rm, 'um contato da ficha') ->> 'testadaEm' from ids), null, 'o teste fica marcado e libera ligar');
select throws_ok($$ select portal_ia_teste_contexto(intrusa, rm, null, null) from ids $$, 'TC401', null, 'outro escritório não testa');

select * from finish();
rollback;
