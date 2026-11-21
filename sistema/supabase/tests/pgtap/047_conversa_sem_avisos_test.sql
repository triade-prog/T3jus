-- O atalho "Não receber avisos" dentro da conversa (F3.65, PA-03; desenho aprovado em
-- docs/design/aprovadas/portal-pendencias-pequenas). O pedido fica ligado à mensagem do
-- cliente que o originou; a conversa ganha uma linha só da equipe ao registrar, mudar e
-- retirar; nada sai para o cliente; a conversa e a mensagem têm de ser deste cliente.
begin;
select plan(17);

select ajustar_relogio(('2026-11-18 09:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Larissa Costa') as larissa,
  teste.escritorio('Ribeiro & Matos') as rm;
select teste.vincular(socia, rm, 'SOCIO') from ids;
select portal_convidar(socia, rm, larissa, 'Larissa Costa', array['JURIDICO']) from ids;

create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Hélio Batista Corrêa', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Hélio Batista Corrêa', 'telefone', '+5511981143058', 'principal', true),
                                   jsonb_build_object('nome', 'Marta Corrêa', 'papel', 'esposa', 'telefone', '+5511981143059', 'principal', false))
                  )) ->> 'id')::uuid hel,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Antônia Ferreira Prado', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Joana Prado', 'papel', 'filha', 'telefone', '+5511991234567', 'principal', true)))) ->> 'id')::uuid ant
  from ids;
insert into whatsapp_escritorio (escritorio_id, numero, situacao, ligado_em) select rm, '+551130001000', 'LIGADO', now() from ids;

create temp table cv as select
  whatsapp_mensagem_recebida(rm, '+5511981143059', 'Marta C.', 'Por favor, parem de mandar aviso de parcela para o Hélio.') hel,
  whatsapp_mensagem_recebida(rm, '+5511991234567', 'Joana', 'Bom dia') ant
  from ids;
create temp table msg as select (select id from conversa_mensagens m, cv where m.conversa_id = cv.hel and m.autor = 'CLIENTE') marta,
                                (select id from conversa_mensagens m, cv where m.conversa_id = cv.ant and m.autor = 'CLIENTE') joana;
create temp table k as select (select c ->> 'id' from clientes_escritorio x, jsonb_array_elements(x.contatos) c, cli where x.id = cli.hel and c ->> 'nome' = 'Marta Corrêa') marta;

-- O que a conversa mostra antes.
create temp table c0 as select portal_conversa(larissa, rm, cv.hel) j from ids, cv;
select is((select j ->> 'contatoId' from c0), (select marta from k), 'a conversa diz qual contato escreve');
select is((select j -> 'avisos' -> 'ativo' from c0), 'null'::jsonb, 'sem pedido, recebe os avisos');
select is((select jsonb_agg(x ->> 'nome' order by x ->> 'nome') from c0, jsonb_array_elements(j -> 'avisos' -> 'contatos') x),
  '["Hélio Batista Corrêa", "Marta Corrêa"]'::jsonb, 'os contatos do cliente para “quem pediu”, sem o telefone');
select ok((select not (j -> 'avisos' -> 'contatos' -> 0 ? 'telefone') and (j -> 'avisos' ->> 'podeMudar')::boolean from c0), 'e dá para registrar');

-- A conversa e a mensagem têm de ser deste cliente.
select is((teste.erro($$ select portal_cliente_sem_avisos(larissa, rm, cli.hel, jsonb_build_object('tipo', 'COBRANCA', 'origem', 'CONVERSA',
  'conversaId', cv.ant, 'canal', 'WHATSAPP', 'quem', 'CONTATO', 'contatoId', k.marta)) from ids, cli, cv, k $$)) -> 'detalhe' -> 'campos',
  '["conversaId"]'::jsonb, 'conversa de outro cliente não vale');
select is((teste.erro($$ select portal_cliente_sem_avisos(larissa, rm, cli.hel, jsonb_build_object('tipo', 'COBRANCA', 'origem', 'CONVERSA',
  'conversaId', cv.hel, 'mensagemId', msg.joana, 'canal', 'WHATSAPP', 'quem', 'CONTATO', 'contatoId', k.marta)) from ids, cli, cv, k, msg $$)) -> 'detalhe' -> 'campos',
  '["mensagemId"]'::jsonb, 'mensagem de outra conversa não vale');

-- Larissa (só Jurídico) registra pela conversa, com a mensagem de Marta.
select portal_cliente_sem_avisos(larissa, rm, cli.hel, jsonb_build_object('tipo', 'COBRANCA', 'origem', 'CONVERSA', 'conversaId', cv.hel,
  'mensagemId', msg.marta, 'canal', 'WHATSAPP', 'quem', 'CONTATO', 'contatoId', k.marta, 'pedidoEm', '2026-11-18')) from ids, cli, cv, k, msg;
create temp table c1 as select portal_conversa(larissa, rm, cv.hel) j from ids, cv;
select is((select j -> 'avisos' -> 'ativo' ->> 'quemPediu' || ' · ' || (j -> 'avisos' -> 'ativo' ->> 'origem') from c1), 'Marta Corrêa · CONVERSA',
  'pergunta 2: o pedido fica com quem pediu e a origem');
select is((select j -> 'avisos' -> 'ativo' -> 'mensagem' ->> 'texto' from c1), 'Por favor, parem de mandar aviso de parcela para o Hélio.',
  'pergunta 2: e com a mensagem que o originou');
select is((select portal_cliente_avisos(socia, rm, cli.hel) -> 'ativo' -> 'mensagem' ->> 'id' from ids, cli), (select marta::text from msg),
  'a ficha também mostra a mensagem');
select is((select jsonb_agg(m ->> 'evento' || '|' || (m ->> 'tipoAvisos') || '|' || (m ->> 'quemPediu') || '|' || (m -> 'pessoa' ->> 'nome'))
             from c1, jsonb_array_elements(j -> 'mensagens') m where m ->> 'autor' = 'SISTEMA'),
  '["SEM_AVISOS_REGISTRADO|COBRANCA|Marta Corrêa|Larissa Costa"]'::jsonb, 'a conversa ganha a linha da equipe');
select is((select count(*) from conversa_mensagens m, cv where m.conversa_id = cv.hel and m.autor <> 'CLIENTE' and m.autor <> 'SISTEMA')::integer, 0,
  'pergunta 3: nada sai para o cliente');

-- Mudar e retirar na conversa.
select ajustar_relogio(('2026-11-18 09:10-03'::timestamptz - now()));
select portal_cliente_sem_avisos(socia, rm, cli.hel, jsonb_build_object('tipo', 'TODOS', 'origem', 'CONVERSA', 'conversaId', cv.hel,
  'canal', 'WHATSAPP', 'quem', 'CLIENTE')) from ids, cli, cv;
select ajustar_relogio(('2026-11-18 09:20-03'::timestamptz - now()));
select portal_cliente_sem_avisos(socia, rm, cli.hel, jsonb_build_object('retirar', true, 'conversaId', cv.hel, 'canal', 'WHATSAPP', 'quem', 'CLIENTE'))
  from ids, cli, cv;
select is((select jsonb_agg(m.evento || '|' || (m.dados ->> 'tipo') order by m.criada_em) from conversa_mensagens m, cv where m.conversa_id = cv.hel and m.autor = 'SISTEMA'),
  '["SEM_AVISOS_REGISTRADO|COBRANCA", "SEM_AVISOS_MUDADO|TODOS", "SEM_AVISOS_RETIRADO|TODOS"]'::jsonb, 'mudar e retirar também ficam na conversa');
select is((select portal_conversa(socia, rm, cv.hel) -> 'avisos' -> 'ativo' from ids, cv), 'null'::jsonb, 'retirado, volta a receber');
select is((select count(*) from clientes_sem_avisos, cli where cliente_id = cli.hel)::integer, 2, 'os dois pedidos ficam no histórico');

-- Pela ficha, sem conversa, continua como era e não mexe em conversa nenhuma.
select portal_cliente_sem_avisos(socia, rm, cli.ant, '{"tipo":"COBRANCA","origem":"FICHA","quem":"CLIENTE","canal":"TELEFONE"}') from ids, cli;
select is((select count(*) from conversa_mensagens m, cv where m.conversa_id = cv.ant and m.autor = 'SISTEMA')::integer, 0, 'pela ficha, a conversa não muda');

-- Contato fora de Clientes não tem a seção.
create temp table cv3 as select whatsapp_mensagem_recebida(rm, '+5511976402281', 'Rafaela', 'Oi') raf from ids;
select is((select portal_conversa(socia, rm, cv3.raf) -> 'avisos' from ids, cv3), 'null'::jsonb, 'número fora de Clientes não tem avisos');

-- A mensagem não se apaga enquanto o pedido existir.
select throws_ok($$ delete from conversa_mensagens where id = (select marta from msg) $$, null, null, 'a mensagem ligada ao pedido não se apaga');

select * from finish();
rollback;
