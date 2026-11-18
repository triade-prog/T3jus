-- Suporte de acesso pelo Console (F1.3, PT-23, PT-24): buscar só nos escritórios atendidos,
-- ficha de acesso, motivo obrigatório, desconectar e o histórico (interno com o motivo e o
-- da equipe do Portal sem ele).
begin;
select plan(19);

create temp table ids as select
  teste.equipe('Carol', 'ADMINISTRACAO') as adm,
  teste.equipe('Bruno Seixas', 'SUPORTE') as sup,
  teste.equipe('Inês Nogueira', 'IMPLANTACAO') as impl,
  teste.equipe('Sueli Fora', 'SUPORTE') as fora;
create temp table c as select
  (select console_criar_escritorio(adm, 'Ribeiro & Matos', 'São Paulo', 'SP') from ids) as rm,
  (select console_criar_escritorio(adm, 'Cedro Advocacia', 'Recife', 'PE') from ids) as cedro;
insert into vinculos (pessoa_id, escritorio_id, funcao, criado_por) select sup, rm, 'SUPORTE', adm from ids, c;
insert into vinculos (pessoa_id, escritorio_id, funcao, criado_por) select impl, rm, 'IMPLANTACAO', adm from ids, c;
insert into vinculos (pessoa_id, escritorio_id, funcao, criado_por) select fora, cedro, 'SUPORTE', adm from ids, c;
create temp table p as select teste.pessoa('Marina Ribeiro') as marina, teste.pessoa('Diego Almeida') as diego;
update auth.users set email = 'marina@ribeiromatos.adv.br' where id = (select marina from p);
insert into vinculos (pessoa_id, escritorio_id, funcao, criado_por) select marina, rm, 'SOCIO', adm from p, ids, c;
insert into vinculos (pessoa_id, escritorio_id, funcao, criado_por) select marina, cedro, 'SOCIO', adm from p, ids, c;
insert into vinculos (pessoa_id, escritorio_id, funcao, criado_por) select diego, rm, 'EQUIPE', adm from p, ids, c;
update pessoas set senha_criada_em = now() where id = (select marina from p);
insert into auth.sessions (user_id) select marina from p union all select marina from p;

-- A sessão mostra o item Suporte só para Suporte e Administração.
select ok((select console_sessao(sup) -> 'acoes' ? 'console.suporte.ver' from ids), 'o Suporte vê o item Suporte');
select ok(not (select console_sessao(impl) -> 'acoes' ? 'console.suporte.ver' from ids), 'a Implantação não vê');

-- Buscar por nome ou e-mail, só nos escritórios atendidos (decisão 1 da Carol).
select is((select jsonb_agg(x ->> 'nome') from ids, jsonb_array_elements(console_suporte_buscar(sup, 'ribeiromatos')) x),
  '["Marina Ribeiro"]'::jsonb, 'PT-23: acha pelo e-mail');
select is((select jsonb_array_length(console_suporte_buscar(sup, 'marina') -> 0 -> 'escritorios') from ids), 1,
  'PT-24: o Suporte vê só o escritório que atende');
select is((select jsonb_array_length(console_suporte_buscar(adm, 'marina') -> 0 -> 'escritorios') from ids), 2,
  'a Administração vê os dois escritórios em que está');
select is((select console_suporte_buscar(fora, 'diego') from ids), '[]'::jsonb, 'PT-24: quem não atende o escritório não acha a pessoa');
select is((teste.erro($$ select console_suporte_buscar(impl, 'marina') from ids $$)) ->> 'codigo', 'TC401',
  'a Implantação não usa o suporte de acesso');
select is((teste.erro($$ select console_suporte_buscar(sup, ' a ') from ids $$)) -> 'detalhe' -> 'campos', '["q"]'::jsonb,
  'busca precisa de ao menos 2 letras');
select is((select console_suporte_buscar(sup, '%_') from ids), '[]'::jsonb, 'o % não vira curinga');

-- Ficha de acesso.
select is((select (console_suporte_pessoa(sup, marina) ->> 'aparelhos')::int from ids, p), 2, 'mostra quantos aparelhos estão conectados');
select is((select (console_suporte_pessoa(sup, marina) ->> 'podeAgir')::boolean from ids, p), true, 'o Suporte pode agir');
select is((teste.erro($$ select console_suporte_pessoa(fora, diego) from ids, p $$)) ->> 'codigo', 'TC404',
  'pessoa fora dos escritórios atendidos responde como inexistente');

-- Motivo obrigatório.
select is((teste.erro($$ select console_suporte_desconectar(sup, marina, '  ') from ids, p $$)) -> 'detalhe' -> 'campos', '["motivo"]'::jsonb,
  'sem motivo, nada acontece');
select is((select count(*)::int from auth.sessions s, p where s.user_id = marina), 2, 'as sessões continuam');

-- Desconectar: registra e apaga as sessões.
select is((select console_suporte_desconectar(sup, marina, 'Pediu ao telefone; trocou de celular') from ids, p), 2, 'derruba os 2 aparelhos');
select is((select count(*)::int from auth.sessions s, p where s.user_id = marina), 0, 'nenhuma sessão fica');
select is((select dados ->> 'motivo' from ids, p, console_suporte_historico(sup, marina)), 'Pediu ao telefone; trocou de celular',
  'o histórico de suporte guarda o motivo');
select is((select x.acao from ids, c, p, portal_historico_equipe(marina, rm) x limit 1), 'suporte.desconectou',
  'o sócio dono vê o evento no histórico da equipe (decisão 3)');

-- Reenviar convite só para quem não criou a senha.
select is((teste.erro($$ select console_suporte_registrar(sup, marina, 'suporte.reenviou_convite', 'Convite venceu') from ids, p $$))
  -> 'detalhe' ->> 'motivo', 'JA_ENTROU', 'quem já criou a senha não recebe convite');

select * from finish();
rollback;
