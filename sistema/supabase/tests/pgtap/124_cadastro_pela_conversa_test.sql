-- Jornada do cliente, parte 5 (0870; AP-07): cadastrar pela conversa liga a conversa à ficha
-- na mesma transação, e a primeira reunião marcada com a conversa passa para a ficha.
begin;
select plan(17);

select ajustar_relogio(('2026-11-18 10:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Diego Santos') as diego,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(socia, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, diego, 'Diego Santos', array['COMERCIAL']) from ids;
insert into whatsapp_escritorio (escritorio_id, numero, situacao, ligado_em) select rm, '+551130001000', 'LIGADO', now() from ids;

create temp table cv as select whatsapp_mensagem_recebida(ids.rm, '+5511976402281', 'Rafaela Moura', 'Oi, preciso de ajuda com o INSS') id
  from ids;
update conversas set situacao = 'PRECISA', esperando_desde = now(), responsavel_id = ids.diego, responsavel_razao = 'COMERCIAL'
  from ids, cv where conversas.id = cv.id;

-- 1. O contato da conversa, para o cadastro e o "Com quem".
create temp table ct as select portal_conversa_contato(socia, rm, cv.id) c from ids, cv;
select is((select c ->> 'nome' from ct), 'Rafaela Moura', 'o nome vem da conversa');
select is((select c ->> 'telefone' from ct), '+5511976402281', 'o telefone vem da conversa');
select is((select c -> 'clienteId' from ct), 'null'::jsonb, 'ainda não é cliente');
select is((select c -> 'responsavel' ->> 'nome' from ct), 'Diego Santos', 'com o responsável da conversa');
select is((teste.erro($$ select portal_conversa_contato(socia, outro, cv.id) from ids, cv $$)) ->> 'codigo', 'TC404',
  'a conversa de outro escritório não é encontrada');

-- 2. A primeira reunião antes do cadastro: guarda a conversa e o lembrete pedido.
create temp table re as select portal_compromisso_marcar(socia, rm, jsonb_build_object(
  'tipo', 'CLIENTE', 'titulo', 'Primeira reunião · Rafaela Moura', 'inicio', '2026-11-20 14:00-03', 'fim', '2026-11-20 15:00-03',
  'modalidade', 'PRESENCIAL', 'responsavelId', ids.diego, 'lembrete', true, 'conversaId', cv.id)) r from ids, cv;
create temp table cp as select c.* from compromissos c, re where c.id = (re.r ->> 'id')::uuid;
select is((select conversa_id from cp), (select id from cv), 'decisão 32: o compromisso guarda a conversa');
select ok((select lembrete_cliente and cliente_id is null from cp), 'e o lembrete pedido, sem ficha ainda');
select is((select versao from cp), (select (r ->> 'versao')::integer from re), 'a versão devolvida é a atual');
select is((select compromisso_linha(c) -> 'conversa' ->> 'nome' from compromissos c, cp where c.id = cp.id), 'Rafaela Moura', 'a Agenda mostra com quem');
select is((teste.erro($$ select portal_compromisso_marcar(socia, rm, jsonb_build_object('tipo', 'CLIENTE', 'titulo', 'X',
  'inicio', '2026-11-20 14:00-03', 'fim', '2026-11-20 15:00-03', 'modalidade', 'PRESENCIAL', 'responsavelId', socia,
  'conversaId', gen_random_uuid())) from ids $$)) -> 'detalhe' -> 'campos', '["conversaId"]'::jsonb,
  'uma conversa que não é do escritório é recusada');

-- Editar antes do cadastro não perde o lembrete.
select portal_compromisso_editar(socia, rm, cp.id, cp.versao, jsonb_build_object(
  'tipo', 'CLIENTE', 'titulo', 'Primeira reunião · Rafaela Moura', 'inicio', '2026-11-20 14:00-03', 'fim', '2026-11-20 15:30-03',
  'modalidade', 'PRESENCIAL', 'responsavelId', ids.diego, 'lembrete', true, 'conversaId', cv.id), 'Mais tempo') from ids, cp, cv;
select ok((select c.lembrete_cliente from compromissos c, cp where c.id = cp.id), 'editar antes do cadastro mantém o lembrete');

-- 3. O cadastro pela conversa (decisões 30 e 31).
create temp table cad as select portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Rafaela Moura',
  'origem', 'OUTRA', 'conversaId', cv.id,
  'contatos', jsonb_build_array(jsonb_build_object('nome', 'Rafaela Moura', 'telefone', '+5511976402281', 'principal', true)))) r
  from ids, cv;
select is((select c.cliente_id from conversas c, cv where c.id = cv.id), (select (r ->> 'id')::uuid from cad),
  'a conversa fica ligada à ficha nova');
select ok((select c.contato_id is not null from conversas c, cv where c.id = cv.id), 'com o contato do mesmo número');
select is((select c.cliente_id from compromissos c, cp where c.id = cp.id), (select (r ->> 'id')::uuid from cad),
  'a primeira reunião passa para a ficha, e o lembrete começa');
select is((select h.dados ->> 'compromissos' from historico h, cad where h.acao = 'cliente.da_conversa' and h.entidade_id = cad.r ->> 'id'),
  '1', 'o histórico registra o cadastro pela conversa');
select is((teste.erro($$ select portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Rafaela M.',
  'origem', 'OUTRA', 'conversaId', cv.id)) from ids, cv $$)) -> 'detalhe' ->> 'motivo', 'CONVERSA_JA_LIGADA',
  'a conversa já ligada não cadastra outra ficha');

-- 4. Depois do cadastro, a reunião pela conversa já vem com a ficha.
create temp table r2 as select portal_compromisso_marcar(socia, rm, jsonb_build_object(
  'tipo', 'CLIENTE', 'titulo', 'Retorno · Rafaela Moura', 'inicio', '2026-11-25 14:00-03', 'fim', '2026-11-25 15:00-03',
  'modalidade', 'PRESENCIAL', 'responsavelId', ids.diego, 'conversaId', cv.id)) r from ids, cv;
select is((select c.cliente_id from compromissos c, r2 where c.id = (r2.r ->> 'id')::uuid), (select (r ->> 'id')::uuid from cad),
  'depois do cadastro, a reunião pela conversa já vem com a ficha');

select * from finish();
rollback;
