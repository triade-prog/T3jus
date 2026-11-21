-- A IA passa o pedido de não receber avisos para a equipe (F3.83, PA-03): a conversa vai para
-- quem cuida, com o motivo SEM_AVISOS, e o cliente continua recebendo avisos até uma pessoa
-- registrar o pedido pelo atalho da conversa.
begin;
select plan(4);

select ajustar_relogio(('2026-11-18 09:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.escritorio('Ribeiro & Matos') as rm;
select teste.vincular(socia, rm, 'SOCIO') from ids;
create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Hélio Batista Corrêa', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Marta Corrêa', 'papel', 'esposa', 'telefone', '+5511981143059', 'principal', true)))) ->> 'id')::uuid hel
  from ids;
insert into whatsapp_escritorio (escritorio_id, numero, situacao, ligado_em) select rm, '+551130001000', 'LIGADO', now() from ids;
create temp table cv as select whatsapp_mensagem_recebida(rm, '+5511981143059', 'Marta', 'Por favor, parem de me mandar cobrança por aqui.') c from ids;

select lives_ok($$ select conversa_ia_passou(rm, cv.c, 'SEM_AVISOS', 'Confira a mensagem e, se for isso, registre em Avisos automáticos.') from ids, cv $$,
  'F3.83: a IA passa com o motivo do pedido de não receber avisos');
select is((select portal_conversa(socia, rm, cv.c) ->> 'motivo' from ids, cv), 'SEM_AVISOS', 'F3.83: a conversa mostra o motivo');
select is((select situacao from conversas, cv where id = cv.c), 'PRECISA', 'F3.83: e espera uma pessoa da equipe');
select is((select count(*)::int from clientes_sem_avisos, cli where cliente_id = cli.hel), 0, 'F3.83: a IA não registra o pedido sozinha');

select * from finish();
rollback;
