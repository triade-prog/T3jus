-- Ficha do cliente › não receber avisos (F3.63). Registrar com quem pediu (o próprio cliente, um
-- contato ou outra pessoa), como e quando (antes de hoje vale, depois não); mudar retira o atual e
-- registra o novo; retirar guarda quem pediu para voltar e como; toda a equipe registra; nada se
-- apaga; o pedido pela conversa continua como era; isolamento (PA-03, PT-03, PA-01, PT-01).
begin;
select plan(20);

select ajustar_relogio(('2026-11-18 10:12-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Larissa Costa') as larissa,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, larissa, 'Larissa Costa', array['JURIDICO']) from ids;

create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Antônia Ferreira Prado', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Joana Prado', 'papel', 'Filha', 'telefone', '+5511991234567', 'principal', true)))) ->> 'id')::uuid ant,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PJ', 'nome', 'Construtora Vale Alto Ltda', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Ricardo Vale', 'papel', 'Sócio-administrador', 'telefone', '+5511996027733', 'principal', true),
                                   jsonb_build_object('nome', 'Sônia Martins', 'papel', 'Financeiro', 'telefone', '+5511996027734', 'principal', false)))) ->> 'id')::uuid cv
  from ids;
create temp table k as select (select c ->> 'id' from clientes_escritorio x, jsonb_array_elements(x.contatos) c where x.id = cli.ant) joana,
                              (select c ->> 'id' from clientes_escritorio x, jsonb_array_elements(x.contatos) c where x.id = cli.cv and c ->> 'nome' = 'Sônia Martins') sonia
  from cli;

select is((select portal_cliente_avisos(socia, rm, cli.ant) -> 'ativo' from ids, cli), 'null'::jsonb, 'sem pedido, recebe os avisos');

-- Erros: outra pessoa sem nome, data depois de hoje, sem dizer como.
select is((teste.erro($$ select portal_cliente_sem_avisos(socia, rm, cli.cv, '{"tipo":"COBRANCA","origem":"FICHA","quem":"OUTRA","canal":"TELEFONE"}') from ids, cli $$)) -> 'detalhe' ->> 'motivo',
  'QUEM_PEDIU_OBRIGATORIO', 'outra pessoa precisa do nome');
select is((teste.erro($$ select portal_cliente_sem_avisos(socia, rm, cli.cv, jsonb_build_object('tipo', 'COBRANCA', 'origem', 'FICHA', 'quem', 'CONTATO', 'contatoId', k.sonia,
             'canal', 'TELEFONE', 'pedidoEm', '2026-11-20')) from ids, cli, k $$)) -> 'detalhe',
  '{"campos":["pedidoEm"],"motivo":"DATA_NO_FUTURO"}'::jsonb, 'a data não pode ser depois de hoje');
select is((teste.erro($$ select portal_cliente_sem_avisos(socia, rm, cli.cv, jsonb_build_object('tipo', 'COBRANCA', 'origem', 'FICHA', 'quem', 'CONTATO', 'contatoId', k.sonia)) from ids, cli, k $$)) -> 'detalhe' -> 'campos',
  '["canal"]'::jsonb, 'na ficha, diz como pediu');
select is((teste.erro($$ select portal_cliente_sem_avisos(socia, rm, cli.cv, '{"tipo":"COBRANCA","origem":"FICHA","quem":"CONTATO","contatoId":"00000000-0000-4000-8000-000000000000","canal":"TELEFONE"}') from ids, cli $$)) -> 'detalhe' -> 'campos',
  '["quem"]'::jsonb, 'contato que não é da ficha não vale');

-- Larissa (só Jurídico) registra: Sônia pediu por telefone, hoje.
select portal_cliente_sem_avisos(larissa, rm, cli.cv, jsonb_build_object('tipo', 'COBRANCA', 'origem', 'FICHA', 'quem', 'CONTATO', 'contatoId', k.sonia,
  'canal', 'TELEFONE', 'pedidoEm', '2026-11-18')) from ids, cli, k;
create temp table a1 as select portal_cliente_avisos(larissa, rm, cli.cv) -> 'ativo' a from ids, cli;
select is((select a ->> 'quemPediu' || ' · ' || (a ->> 'quemPapel') from a1), 'Sônia Martins · Financeiro', 'quem pediu vem do contato, com o papel');
select is((select a ->> 'canal' || ' · ' || (a -> 'registradoPor' ->> 'nome') from a1), 'TELEFONE · Larissa Costa', 'PA-03: toda a equipe registra, com o nome');
select is((select (a ->> 'pedidoEm')::timestamptz = (a ->> 'registradoEm')::timestamptz from a1), true, 'pedido hoje vale com a hora do registro');

-- Antônia: o pedido chegou em 03/11 pela filha, pelo WhatsApp, e só agora é registrado.
select portal_cliente_sem_avisos(socia, rm, cli.ant, jsonb_build_object('tipo', 'COBRANCA', 'origem', 'FICHA', 'quem', 'CONTATO', 'contatoId', k.joana,
  'canal', 'WHATSAPP', 'pedidoEm', '2026-11-03')) from ids, cli, k;
select is((select (portal_cliente_avisos(socia, rm, cli.ant) -> 'ativo' ->> 'pedidoEm')::timestamptz at time zone 'America/Sao_Paulo' from ids, cli),
  '2026-11-03 12:00'::timestamp, 'o dia do pedido fica separado da hora do registro');
select is((select portal_cliente_avisos(socia, rm, cli.ant) -> 'ativo' ->> 'quemPapel' from ids, cli), 'Filha · contato principal', 'o contato principal fica dito');

-- Mudar: passa para todos; o anterior fica no histórico.
select ajustar_relogio(('2026-11-18 10:20-03'::timestamptz - now()));
select portal_cliente_sem_avisos(socia, rm, cli.ant, '{"tipo":"TODOS","origem":"FICHA","quem":"CLIENTE","canal":"PRESENCIAL"}') from ids, cli;
select is((select jsonb_agg(h ->> 'tipo') from ids, cli, jsonb_array_elements(portal_cliente_avisos(socia, rm, cli.ant) -> 'historico') h), '["TODOS","COBRANCA"]'::jsonb,
  'mudar guarda os dois pedidos, o novo primeiro');
select is((select portal_cliente_avisos(socia, rm, cli.ant) -> 'ativo' ->> 'quemPediu' from ids, cli), 'Antônia Ferreira Prado', 'o próprio cliente pediu');
select is((select count(*)::integer from clientes_sem_avisos, cli where cliente_id = cli.ant and retirado_em is null), 1, 'só um pedido vale por vez');

-- Retirar: quem pediu para voltar e como.
select is((teste.erro($$ select portal_cliente_sem_avisos(socia, rm, cli.ant, '{"retirar":true,"quem":"CONTATO"}') from ids, cli $$)) -> 'detalhe' -> 'campos',
  '["canal"]'::jsonb, 'retirar também diz como pediu');
select portal_cliente_sem_avisos(socia, rm, cli.ant, jsonb_build_object('retirar', true, 'quem', 'CONTATO', 'contatoId', k.joana, 'canal', 'TELEFONE')) from ids, cli, k;
select is((select portal_cliente_avisos(socia, rm, cli.ant) -> 'historico' -> 0 -> 'retirada' ->> 'quemPediu' from ids, cli), 'Joana Prado', 'a retirada guarda quem pediu');
select is((select portal_cliente_avisos(socia, rm, cli.ant) -> 'ativo' from ids, cli), 'null'::jsonb, 'retirado, volta a receber');
select is((teste.erro($$ select portal_cliente_sem_avisos(socia, rm, cli.ant, '{"retirar":true,"quem":"CLIENTE","canal":"TELEFONE"}') from ids, cli $$)) -> 'detalhe' ->> 'motivo',
  'SEM_PEDIDO', 'sem pedido, não há o que retirar');

-- Pela conversa, como antes (o atalho da conversa).
select portal_cliente_sem_avisos(socia, rm, cli.ant, '{"tipo":"COBRANCA","origem":"CONVERSA","quemPediu":"Joana"}') from ids, cli;
select is((select portal_cliente_avisos(socia, rm, cli.ant) -> 'ativo' ->> 'canal' from ids, cli), 'WHATSAPP', 'pela conversa, é pelo WhatsApp');

select throws_ok($$ delete from clientes_sem_avisos $$, 'TC023', null, 'PT-03: nada se apaga');
select throws_ok($$ select portal_cliente_avisos(intrusa, rm, cli.ant) from ids, cli $$, 'TC401', null, 'PT-01: outro escritório não lê');

select * from finish();
rollback;
