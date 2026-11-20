-- Conversas do Portal, parte 1: Mensagens. Sem o WhatsApp ligado nada entra nem sai; a
-- mensagem que chega acha o cliente pelo telefone; a IA responde, encerra ou passa para uma
-- pessoa pela regra (caso, próximo contato, Comercial, sócia dona); assumir, escrever,
-- devolver (com o atendimento na ficha) e passar; quem sai da equipe passa as conversas;
-- mensagens só se acrescentam; contexto pelas áreas e isolamento
-- (PD-07, EX-10, AP-02, PA-01, PT-03, PT-01).
begin;
select plan(43);

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
create temp table conv as select
  portal_convidar(socia, rm, diego, 'Diego Almeida', array['COMERCIAL']) vd,
  portal_convidar(socia, rm, paula, 'Paula Nunes', array[]::text[]) vp,
  portal_convidar(socia, rm, larissa, 'Larissa Costa', array['JURIDICO']) vl
  from ids;

create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Hélio Batista Corrêa', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Hélio Batista Corrêa', 'telefone', '+5511981143058', 'principal', false),
                                   jsonb_build_object('nome', 'Marta Corrêa', 'papel', 'esposa', 'telefone', '+5511981143059', 'principal', true))
                  )) ->> 'id')::uuid hel,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Antônia Ferreira Prado', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Joana Prado', 'papel', 'filha', 'telefone', '+5511991234567', 'principal', true)))) ->> 'id')::uuid ant
  from ids;
select ok((select count(*) = 2 from clientes_escritorio, ids where escritorio_id = rm), 'dois clientes cadastrados');

-- O caso de Hélio é de Larissa; Antônia tem próximo contato com Diego.
select portal_juridico_casos(socia, rm) from ids;
select portal_juridico_caso_criar(socia, rm, jsonb_build_object('nome', 'Corrêa x Rota Sul', 'area', 'TRABALHISTA',
  'etapaId', (select id from etapas e where e.escritorio_id = ids.rm and e.ordem = 2), 'responsavelId', ids.larissa,
  'clientes', jsonb_build_array(jsonb_build_object('clienteId', cli.hel, 'papel', 'AUTOR')))) from ids, cli;
select portal_registrar_atendimento(socia, rm, cli.ant, jsonb_build_object('canal', 'TELEFONE', 'resumo', 'Pedi a carta do INSS',
  'proxEm', '2026-11-13', 'proxResponsavel', ids.diego, 'proxOque', 'Ligar para Joana sobre a carta')) from ids, cli;

select ajustar_relogio(('2026-11-18 09:00-03'::timestamptz - now()));

-- Sem o WhatsApp ligado.
select is((select portal_conversas(paula, rm) -> 'whatsapp' ->> 'situacao' from ids), 'NAO_LIGADO', 'sem o número, a tela diz que não está ligado');
select is((select portal_conversas(paula, rm) -> 'whatsapp' -> 'quemLiga' ->> 'nome' from ids), 'Marina Ribeiro', 'e quem liga é a sócia dona');
select is((teste.erro($$ select whatsapp_mensagem_recebida(rm, '+5511981143059', 'Marta', 'Oi') from ids $$)) -> 'detalhe' ->> 'motivo',
  'WHATSAPP_NAO_LIGADO', 'sem o número ligado, nada entra');

insert into whatsapp_escritorio (escritorio_id, numero, situacao, ligado_em) select rm, '+551130001000', 'LIGADO', now() from ids;

-- Chega mensagem de Marta (contato principal de Hélio).
create temp table cv as select whatsapp_mensagem_recebida(rm, '+5511981143059', 'Marta C.', 'Bom dia. O Hélio recebeu uma proposta de acordo.') hel from ids;
select is((select cliente_id from conversas, cv where id = cv.hel), (select hel from cli), 'o telefone acha o cliente');
select is((select nome_contato || '/' || papel_contato from conversas, cv where id = cv.hel), 'Marta Corrêa/esposa', 'quem escreve vem da ficha');
select is((select situacao from conversas, cv where id = cv.hel), 'IA', 'a conversa começa com a IA');

-- A IA responde e passa: o caso é de Larissa.
select conversa_ia_respondeu(rm, cv.hel, 'Proposta de acordo precisa ser avaliada pela advogada do caso. Já passei.') from ids, cv;
select is((select conversa_ia_passou(rm, cv.hel, 'PROPOSTA_ACORDO', 'Marta pergunta se vale aceitar R$ 18.000,00.') from ids, cv), (select larissa from ids),
  'PD-07: a IA passa para quem cuida do caso');
select is((select responsavel_razao || '/' || situacao from conversas, cv where id = cv.hel), 'CASO/PRECISA', 'com o motivo da escolha, esperando alguém');
select is((teste.erro($$ select conversa_ia_respondeu(rm, cv.hel, 'Oi') from ids, cv $$)) -> 'detalhe' ->> 'motivo', 'CONVERSA_COM_EQUIPE',
  'depois de passar, a IA fica em silêncio');

-- Joana (Antônia): sem caso, vai para quem tem o próximo contato.
select whatsapp_mensagem_recebida(rm, '+5511991234567', 'Joana', null, '{"nome": "carta-inss.jpg", "tipo": "IMAGEM", "bytes": "2400000"}') from ids;
create temp table cv2 as select (select id from conversas, ids where escritorio_id = rm and telefone = '+5511991234567') ant;
select is((select conversa_ia_passou(rm, cv2.ant, 'DOCUMENTO_NOVO', 'Joana mandou a foto da carta.') from ids, cv2), (select diego from ids),
  'sem caso, vai para o responsável pelo próximo contato');

-- Número desconhecido: contato novo vai para a área Comercial.
create temp table cv3 as select whatsapp_mensagem_recebida(rm, '+5511976402281', 'Rafaela', 'Fui demitida grávida, vocês atendem?') raf from ids;
select is((select cliente_id from conversas, cv3 where id = cv3.raf), null, 'número fora de Clientes fica sem cliente');
select is((select conversa_ia_passou(rm, cv3.raf, 'CLIENTE_NOVO', 'Possível cliente trabalhista.') from ids, cv3), (select diego from ids),
  'contato novo vai para quem tem a área Comercial');
select is((select responsavel_razao from conversas, cv3 where id = cv3.raf), 'COMERCIAL', 'com a razão');

-- Gabriela: a IA resolve sozinha.
create temp table cv4 as select whatsapp_mensagem_recebida(rm, '+5511996027735', 'Gabriela', 'A audiência é por vídeo?') gab from ids;
select conversa_ia_respondeu(rm, cv4.gab, 'Sim, é por vídeo, hoje às 11h.', true) from ids, cv4;

-- A lista.
select is((select portal_conversas(paula, rm) -> 'contagem' from ids),
  '{"ia": 0, "equipe": 0, "precisa": 3, "resolvidas": 1}'::jsonb, 'contagem: 3 esperando, 1 resolvida hoje');
select is((select jsonb_array_length(portal_conversas(paula, rm) -> 'conversas') from ids), 3, 'Precisa de alguém é o padrão');
select is((select portal_conversas(paula, rm) -> 'conversas' -> 0 ->> 'nome' from ids), 'Hélio Batista Corrêa', 'quem espera há mais tempo vem primeiro');
select is((select portal_conversas(paula, rm, 'RESOLVIDAS') -> 'conversas' -> 0 ->> 'nome' from ids), 'Gabriela', 'resolvidas hoje');
select is((select jsonb_array_length(portal_conversas(paula, rm, 'PRECISA', '9764') -> 'conversas') from ids), 1, 'a busca acha pelo telefone');
select is((select portal_conversas(paula, rm, 'PRECISA', 'Joana') -> 'conversas' -> 0 ->> 'nome' from ids), 'Antônia Ferreira Prado',
  'e pelo nome de quem escreve');
select is((select portal_escritorio(paula, rm) ->> 'conversasEsperando' from ids), '3', 'a moldura mostra quantas esperam');
select is((select portal_conversas(paula, rm) -> 'conversas' -> 1 -> 'ultima' ->> 'anexo' from ids), 'carta-inss.jpg', 'a última mensagem mostra o anexo');

-- O contexto segue as áreas.
select is((select portal_conversa(larissa, rm, cv.hel) -> 'contexto' -> 'caso' ->> 'nome' from ids, cv), 'Corrêa x Rota Sul', 'com o Jurídico, o caso');
select is((select portal_conversa(paula, rm, cv.hel) -> 'contexto' -> 'caso' from ids, cv), 'null'::jsonb, 'PA-01: sem o Jurídico, sem o caso');
select is((select portal_conversa(paula, rm, cv2.ant) -> 'contexto' -> 'proxContato' ->> 'vencido' from ids, cv2), 'true', 'o próximo contato vencido aparece');
select is((select jsonb_array_length(portal_conversa(paula, rm, cv.hel) -> 'mensagens') from ids, cv), 3, 'cliente, IA e o momento da passagem');

-- Escrever pede assumir.
select is((teste.erro($$ select portal_conversa_enviar(paula, rm, cv.hel, '{"texto": "Oi"}') from ids, cv $$)) -> 'detalhe' ->> 'motivo', 'ASSUMA_PRIMEIRO',
  'para escrever, assuma a conversa');
select is((teste.erro($$ select portal_conversa_assumir(paula, rm, cv.hel, 99) from ids, cv $$)) ->> 'codigo', 'TC409', 'assumir segue a versão lida');

-- Paula assume a conversa de Larissa (decisão 2) e escreve.
select ajustar_relogio(('2026-11-18 10:15-03'::timestamptz - now()));
select ok((select portal_conversa_assumir(paula, rm, cv.hel, (select versao from conversas where id = cv.hel)) from ids, cv) > 0, 'qualquer pessoa assume');
select is((select (portal_conversa(paula, rm, cv.hel) -> 'mensagens' -> -1 -> 'de' ->> 'nome') from ids, cv), 'Larissa Costa',
  'a troca fica registrada na conversa');
select is((teste.erro($$ select portal_conversa_assumir(diego, rm, cv.hel, (select versao from conversas where id = cv.hel)) from ids, cv $$)) -> 'detalhe' ->> 'motivo',
  'JA_ASSUMIDA', 'outra pessoa não assume por cima');
select is((select portal_conversa_enviar(paula, rm, cv.hel, '{"texto": "Oi, Marta. Pode mandar a proposta por foto?"}') ->> 'envio' from ids, cv), 'NA_FILA',
  'a mensagem entra na fila do envio');
select is((teste.erro($$ select conversa_ia_respondeu(rm, cv.hel, 'Oi') from ids, cv $$)) -> 'detalhe' ->> 'motivo', 'CONVERSA_COM_EQUIPE',
  'com a equipe, a IA não responde');

-- Devolver com atendimento na ficha.
select is((teste.erro($$ select portal_conversa_devolver(paula, rm, cv.hel, (select versao from conversas where id = cv.hel), '{"registrarAtendimento": true}') from ids, cv $$))
  -> 'detalhe' -> 'campos', '["nota"]'::jsonb, 'registrar o atendimento pede o resumo');
select portal_conversa_devolver(paula, rm, cv.hel, (select versao from conversas where id = cv.hel),
  '{"nota": "Paula pediu a proposta por foto; Larissa liga hoje às 14h.", "registrarAtendimento": true}') from ids, cv;
select is((select situacao || '/' || coalesce(assumida_por::text, '-') from conversas, cv where id = cv.hel), 'IA/-', 'devolvida, a IA volta a responder');
select is((select canal || '/' || resumo from atendimentos, cli where cliente_id = cli.hel), 'WHATSAPP/Paula pediu a proposta por foto; Larissa liga hoje às 14h.',
  'AP-02: o atendimento vai para a ficha');

-- Passar para outra pessoa.
select is((teste.erro($$ select portal_conversa_passar(diego, rm, cv2.ant, (select versao from conversas where id = cv2.ant), jsonb_build_object('pessoa', ids.intrusa)) from ids, cv2 $$))
  -> 'detalhe' -> 'campos', '["pessoa"]'::jsonb, 'só pessoas ativas na equipe');
select portal_conversa_passar(diego, rm, cv2.ant, (select versao from conversas where id = cv2.ant),
  jsonb_build_object('pessoa', ids.paula, 'recado', 'Confere se a foto está legível?')) from ids, cv2;
select is((select pessoa_ref(responsavel_id) ->> 'nome' from conversas, cv2 where id = cv2.ant), 'Paula Nunes', 'passou para Paula');
select is((select portal_conversa(paula, rm, cv2.ant) -> 'mensagens' -> -1 ->> 'texto' from ids, cv2), 'Confere se a foto está legível?', 'com o recado na conversa');

-- EX-10: Diego (que já entrou) sai e passa o que era dele para a sócia.
update pessoas set senha_criada_em = now() where nome = 'Diego Almeida';
select portal_retirar(socia, rm, conv.vd, (select versao from vinculos where id = conv.vd), socia) from ids, conv;
select is((select pessoa_ref(responsavel_id) ->> 'nome' from conversas, cv3 where id = cv3.raf), 'Marina Ribeiro', 'EX-10: quem sai passa as conversas');

-- Nada se apaga.
select is((teste.erro($$ delete from conversa_mensagens $$)) ->> 'codigo', 'TC023', 'PT-03: mensagem não se apaga');
select is((teste.erro($$ update conversa_mensagens set texto = 'outro' where autor = 'CLIENTE' $$)) ->> 'codigo', 'TC023', 'nem muda o texto');

-- Isolamento.
select is((teste.erro($$ select portal_conversa(intrusa, outro, cv.hel) from ids, cv $$)) ->> 'codigo', 'TC404', 'PT-01: outro escritório não vê');

select * from finish();
rollback;
