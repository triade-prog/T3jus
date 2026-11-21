-- Rotina noturna dos prazos do inventário (F0.13; PT-11, PT-03).
begin;
select plan(14);

create temp table ids as select
  teste.pessoa('Sócia Ana') as ana,
  teste.escritorio('Ipê Advocacia') as a;

-- Dados antigos e novos, com o relógio no presente.
insert into sessoes_escritorio (sessao_id, pessoa_id, escritorio_id, escolhido_em)
  select gen_random_uuid(), ana, a, app_now() - interval '40 days' from ids
  union all select gen_random_uuid(), ana, a, app_now() - interval '2 days' from ids;
insert into limites_uso (chave, inicio_janela, usos) values
  ('login:velho', app_now() - interval '2 days', 3),
  ('login:novo', app_now() - interval '1 hour', 1);
insert into historico (ocorrido_em, escritorio_id, autor_tipo, autor_id, acao, entidade, entidade_id)
  select app_now() - interval '7 months', null::uuid, 'PESSOA'::tipo_autor, ana, 'acesso.entrou', 'acesso', ana::text from ids
  union all select app_now() - interval '1 month', null::uuid, 'PESSOA', ana, 'acesso.entrou', 'acesso', ana::text from ids
  union all select app_now() - interval '3 years', a, 'PESSOA', ana, 'caso.criado', 'caso', null::text from ids;

-- Regra 1: com o prazo em proposta, nada sai (volta para proposta só neste teste).
update inventario_dados set situacao = 'PROPOSTA' where dado_pessoal;
create temp table r1 as select aplicar_prazos() as j;
select is((select j -> 'apagados' from r1), '{}'::jsonb, 'PT-11: prazo em proposta não apaga nada');
select is((select j -> 'aguardando_aprovacao' from r1), '["sessoes_escritorio", "limites_uso", "historico", "pessoas", "interessados"]'::jsonb,
  'PT-11: o resultado diz quais prazos esperam aprovação');
select is((select count(*)::int from sessoes_escritorio), 2, 'sessões continuam enquanto o prazo não for aprovado');

-- Aprovado, como na migration 0090.
update inventario_dados set situacao = 'APROVADO' where dado_pessoal;

create temp table r2 as select aplicar_prazos() as j;
select is((select j -> 'apagados' from r2), '{"sessoes_escritorio": 1, "limites_uso": 1, "historico": 1}'::jsonb,
  'PT-11: com o prazo aprovado, sai só o que passou do prazo');
select is((select count(*)::int from sessoes_escritorio where escolhido_em > app_now() - interval '30 days'), 1,
  'a sessão recente fica');
select is((select array_agg(chave) from limites_uso), array['login:novo'], 'o contador recente fica');
select is((select count(*)::int from historico where acao = 'acesso.entrou'), 1,
  'PT-11: entrada no sistema com mais de 6 meses sai do histórico; a recente fica');
select is((select count(*)::int from historico where acao = 'caso.criado'), 1,
  'evento do escritório fica (sai só no fim da guarda, F0.15)');
select is((select j -> 'sem_gatilho' from r2), '["equipe_funcoes", "equipe_t3"]'::jsonb,
  'o resultado lista os prazos que ainda não têm gatilho (só a equipe T3jus); a saída da pessoa e a guarda de 5 anos (F0.15) já têm');

-- Regra 4: a contagem fica no histórico, sem dado pessoal.
select is((select dados -> 'apagados' from historico where acao = 'dados.prazos_aplicados' order by id desc limit 1),
  '{"sessoes_escritorio": 1, "limites_uso": 1, "historico": 1}'::jsonb, 'PT-03: a contagem do que saiu fica no histórico');
select is((select autor_tipo::text from historico where acao = 'dados.prazos_aplicados' order by id desc limit 1),
  'SISTEMA', 'a rotina aparece como sistema');

-- Rodar de novo não apaga mais nada.
select is((select aplicar_prazos() -> 'apagados'), '{"sessoes_escritorio": 0, "limites_uso": 0, "historico": 0}'::jsonb,
  'rodar duas vezes na mesma noite não apaga a mais');

-- Regra 5: fora da rotina, o histórico segue só de inserção, mesmo com a marca ligada.
select set_config('t3jus.aplicando_prazos', 'on', true);
select throws_ok($$ delete from historico where acao = 'caso.criado' $$, 'TC010', null,
  'PT-03: ninguém apaga histórico fora da rotina');
select set_config('t3jus.aplicando_prazos', 'off', true);

-- Só o servidor chama a rotina.
select ok(not has_function_privilege('public', 'aplicar_prazos()', 'execute'),
  'a rotina não pode ser chamada por quem está no navegador');

select * from finish();
rollback;
