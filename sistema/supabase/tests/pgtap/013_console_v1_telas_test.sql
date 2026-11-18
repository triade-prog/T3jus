-- Telas do Console v1 (F1.8): conflito diz quem salvou, motivo do estágio obrigatório e
-- convite pendente na Equipe T3jus (CO-01, CO-02, PT-19, PT-24).
begin;
select plan(8);

create temp table ids as select
  teste.equipe('Carol', 'ADMINISTRACAO') as adm,
  teste.equipe('Rafael Teles', 'IMPLANTACAO') as impl;
create temp table c as select console_criar_escritorio(adm, 'Cedro Advocacia', 'Recife', 'PE') as cedro from ids;
insert into vinculos (pessoa_id, escritorio_id, funcao, criado_por) select impl, cedro, 'IMPLANTACAO', adm from ids, c;

-- Ficha: quem salvou por último e quando.
select is((select console_ficha(adm, cedro) ->> 'fichaAlteradaPor' from ids, c), null, 'ficha nunca editada: ninguém salvou');
select lives_ok($$ select console_editar_ficha(impl, cedro, 1, 'Cedro & Lima', 'Recife', 'PE', null, null, '[]'::jsonb) from ids, c $$,
  'Rafael salva a ficha');
select is((select console_ficha(adm, cedro) ->> 'fichaAlteradaPor' from ids, c), 'Rafael Teles', 'PT-19: a ficha diz quem salvou por último');
select ok((select console_ficha(adm, cedro) ->> 'fichaAlteradaEm' from ids, c) is not null, 'PT-19: e quando');

-- Estágio: o motivo é obrigatório (vem depois das regras).
insert into vinculos (pessoa_id, escritorio_id, funcao, criado_por) select teste.pessoa('Sócia Ana'), cedro, 'SOCIO', adm from ids, c;
select is((teste.erro($$ select console_mudar_estagio(adm, cedro, 1, 'ATIVO', '  ') from ids, c $$)) -> 'detalhe' -> 'campos',
  '["motivo"]'::jsonb, 'CO-01: sem motivo, o estágio não muda');
select is((select console_mudar_estagio(adm, cedro, 1, 'ATIVO', 'Sócia entrou no Portal') from ids, c), 2, 'com motivo, muda');

-- Equipe: quem não criou a senha aparece como convite pendente.
select is((select senha_criada_em from ids, console_equipe(adm) where nome = 'Rafael Teles'), null, 'PT-24: convite pendente');
update pessoas set senha_criada_em = now() where nome = 'Carol';
select ok((select senha_criada_em is not null from ids, console_equipe(adm) where nome = 'Carol'), 'quem criou a senha não está pendente');

select * from finish();
rollback;
