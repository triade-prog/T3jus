-- Convite e escolha do escritório (F1.4; PT-20, PT-22, PT-08).
begin;
select plan(11);

create temp table ids as select
  teste.equipe('Carol da Equipe', 'ADMINISTRACAO') as carol,
  teste.pessoa('Sócio Ricardo') as ricardo,
  teste.pessoa('Marina') as marina,
  teste.pessoa('Estranha') as estranha,
  teste.escritorio('Ipê Advocacia') as a,
  teste.escritorio('Cedro Advogados') as b,
  teste.escritorio('Jatobá Advocacia') as c;
update escritorios set cidade = 'Salvador', uf = 'BA' where id = (select a from ids);

-- Marina: sócia do Ipê (convidada pela equipe) e associada do Cedro (convidada pelo Ricardo, mais nova).
insert into vinculos (pessoa_id, escritorio_id, funcao, criado_por, criado_em)
  select marina, a, 'SOCIO', carol, app_now() - interval '2 days' from ids
  union all select ricardo, b, 'SOCIO', carol, app_now() - interval '3 days' from ids
  union all select marina, b, 'SOCIO', ricardo, app_now() - interval '1 hour' from ids
  union all select ricardo, c, 'SOCIO', carol, app_now() from ids;

-- Convite: o vínculo mais novo diz onde e quem convidou.
select is((select dados_convite(marina, 'PORTAL') from ids),
  '{"nome": "Marina", "escritorio": "Cedro Advogados", "quem": "Sócio Ricardo", "papel": "ESCRITORIO"}'::jsonb,
  'PT-20: o convite mostra o escritório e quem convidou');
select is((select dados_convite(ricardo, 'PORTAL') from ids),
  '{"nome": "Sócio Ricardo", "escritorio": "Jatobá Advocacia", "quem": null, "papel": "EQUIPE"}'::jsonb,
  'convite feito pela equipe T3jus aparece como da equipe, sem o nome de quem convidou');
select is((select dados_convite(carol, 'CONSOLE') from ids), '{"nome": "Carol da Equipe"}'::jsonb,
  'no Console, o convite é só da equipe');
select is((select dados_convite(estranha, 'PORTAL') from ids), '{"nome": "Estranha"}'::jsonb,
  'sem vínculo, nada de escritório');

-- Aceite: nome confirmado e Termos no histórico.
select lives_ok($$ select aceitar_convite(marina, '  Marina Souza Lima ', 'PORTAL') from ids $$, 'aceitar o convite');
select is((select nome from pessoas where id = (select marina from ids)), 'Marina Souza Lima', 'o nome fica como a pessoa escreveu');
select is((select dados ->> 'termos_aceitos' from historico where acao = 'acesso.convite_aceito' order by id desc limit 1), 'true',
  'PT-03: o aceite dos Termos fica no histórico');
select throws_ok($$ select aceitar_convite(marina, '   ', 'PORTAL') from ids $$, 'TC422', null, 'nome vazio não');

-- Escolha: do último usado ao mais antigo; sem sessão vai para o fim.
insert into sessoes_escritorio (sessao_id, pessoa_id, escritorio_id, escolhido_em)
  select gen_random_uuid(), marina, a, app_now() - interval '3 days' from ids
  union all select gen_random_uuid(), marina, b, app_now() - interval '1 day' from ids
  union all select gen_random_uuid(), ricardo, c, app_now() from ids;
select is((select array_agg(nome) from escritorios_para_escolher((select marina from ids))),
  array['Cedro Advogados', 'Ipê Advocacia'], 'o último usado vem primeiro, e só os escritórios da pessoa');
select is((select cidade || '/' || uf from escritorios_para_escolher((select marina from ids)) where nome = 'Ipê Advocacia'),
  'Salvador/BA', 'com a cidade');
select is((select array_agg(coalesce(ultima_entrada::text, 'nunca') order by nome) from escritorios_para_escolher((select ricardo from ids))),
  array['nunca', (select (app_now())::text)], 'sem sessão, a última entrada fica vazia');

select * from finish();
rollback;
