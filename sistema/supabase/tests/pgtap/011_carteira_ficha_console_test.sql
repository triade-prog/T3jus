-- Carteira e ficha do Console com o caminho do convite (F1.5; CO-01, CO-02, PT-20, PT-24).
begin;
select plan(14);

create temp table ids as select
  teste.equipe('Carol', 'ADMINISTRACAO') as adm,
  teste.equipe('Sueli', 'SUPORTE') as sup;
insert into auth.users (id, email) select gen_random_uuid(), 'renata@exemplo.invalid';
create temp table conta as select id as renata from auth.users where email = 'renata@exemplo.invalid';
create temp table c as select console_criar_escritorio(adm, 'Cedro Advocacia', 'Recife', 'PE') as cedro from ids;

-- Sem sócio: a carteira já traz a equipe e a atividade do cadastro.
select is((select socios from ids, console_carteira(adm)), '[]'::jsonb, 'sem sócio convidado, a lista vem vazia');
select is((select equipe -> 0 ->> 'nome' from ids, console_carteira(adm)), 'Carol', 'CO-01: a carteira mostra quem da equipe atende');
select ok((select ultima_atividade is not null from ids, console_carteira(adm)), 'CO-01: com a última atividade');

-- Convite enviado: aparece com quem convidou, sem senha criada.
create temp table v as select console_vincular_socio(adm, cedro, renata, 'Renata Lima') as socio from ids, c, conta;
select is((select socios -> 0 ->> 'nome' from ids, console_carteira(adm)), 'Renata Lima', 'o sócio convidado aparece na carteira');
select is((select socios -> 0 ->> 'senhaCriadaEm' from ids, console_carteira(adm)), null, 'PT-20: ainda sem senha');
select is((select console_ficha(adm, cedro) -> 'socios' -> 0 ->> 'convidadoPor' from ids, c), 'Carol',
  'PT-20: a ficha diz quem convidou');

-- Reenviar: só quem convida, só antes da senha, e fica no histórico.
select throws_ok($$ select console_reenviar_convite(sup, cedro, socio) from ids, c, v $$, 'TC401', null,
  'PT-24: suporte não reenvia o convite');
select throws_ok($$ select console_reenviar_convite(adm, cedro, gen_random_uuid()) from ids, c $$, 'TC404', null,
  'vínculo de outro lugar não');
select is((select console_reenviar_convite(adm, cedro, socio) from ids, c, v), (select renata from conta),
  'reenviar devolve a pessoa convidada');
select is((select count(*)::int from historico where acao = 'socio.convite_reenviado'), 1, 'o reenvio fica no histórico');
select ok((select (socios -> 0 ->> 'conviteEnviadoEm')::timestamptz >= (socios -> 0 ->> 'desde')::timestamptz from ids, console_carteira(adm)),
  'o convite reenviado conta a partir do reenvio');

-- Senha criada: a carteira mostra que entrou e o reenvio para.
select lives_ok($$ select aceitar_convite(renata, 'Renata Lima', 'PORTAL') from conta $$, 'Renata cria a senha');
select ok((select socios -> 0 ->> 'senhaCriadaEm' from ids, console_carteira(adm)) is not null,
  'PT-20: a carteira mostra que o sócio entrou');
select throws_ok($$ select console_reenviar_convite(adm, cedro, socio) from ids, c, v $$, 'TC422', null,
  'depois da senha, não há convite a reenviar');

select * from finish();
rollback;
