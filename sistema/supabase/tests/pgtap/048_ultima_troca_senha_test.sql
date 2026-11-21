-- Última troca de senha na ficha de acesso do Suporte (F1.12, PT-23): a data fica na pessoa,
-- porque o evento de entrada some do histórico em 6 meses.
begin;
select plan(4);

create temp table ids as select
  teste.equipe('Carol', 'ADMINISTRACAO') as adm,
  teste.equipe('Bruno Seixas', 'SUPORTE') as sup,
  teste.pessoa('Marina Ribeiro') as marina;
create temp table c as select console_criar_escritorio(adm, 'Ribeiro & Matos', 'São Paulo', 'SP') as rm from ids;
insert into vinculos (pessoa_id, escritorio_id, funcao, criado_por) select sup, rm, 'SUPORTE', adm from ids, c;
insert into vinculos (pessoa_id, escritorio_id, funcao, criado_por) select marina, rm, 'SOCIO', adm from ids, c;
update pessoas set senha_criada_em = now() - interval '30 days' where id = (select marina from ids);

select is((select console_suporte_pessoa(sup, marina) ->> 'senhaTrocadaEm' from ids), null, 'quem nunca trocou a senha não tem data de troca');

select ajustar_relogio(interval '2 days');
select registrar_acesso(marina, 'acesso.senha_redefinida', '{"sistema": "portal"}') from ids;
select is((select senha_trocada_em from pessoas where id = (select marina from ids)), app_now(), 'PT-23: a troca de senha fica na pessoa');
select is((select (console_suporte_pessoa(sup, marina) ->> 'senhaTrocadaEm')::timestamptz from ids), app_now(), 'e aparece na ficha de acesso');

-- Outros eventos de entrada não mexem na data.
select ajustar_relogio(interval '3 days');
select registrar_acesso(marina, 'acesso.entrou', '{"sistema": "portal"}') from ids;
select is((select senha_trocada_em < app_now() from pessoas where id = (select marina from ids)), true, 'entrar não conta como troca');

select * from finish();
rollback;
