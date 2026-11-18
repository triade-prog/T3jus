-- Contrato e documentos do cliente no Console (CO-05): só a equipe atribuída, nada se apaga,
-- o escritório não vê.
begin;
select plan(12);

create temp table ids as select
  teste.equipe('Carol', 'ADMINISTRACAO') as adm,
  teste.equipe('Sueli', 'SUPORTE') as sup,
  teste.equipe('Inês', 'IMPLANTACAO') as impl,
  teste.pessoa('Sócia Ana') as socia;
create temp table c as select console_criar_escritorio(adm, 'Cedro Advocacia', 'Recife', 'PE') as cedro from ids;
insert into vinculos (pessoa_id, escritorio_id, funcao, criado_por) select sup, cedro, 'SUPORTE', adm from ids, c;
insert into vinculos (pessoa_id, escritorio_id, funcao, criado_por) select socia, cedro, 'SOCIO', adm from ids, c;

-- Enviar: só quem tem a ação; tipo e tamanho conferidos.
select throws_ok($$ select console_documento_iniciar(sup, cedro, 'OUTRO', 'a.pdf', 'application/pdf', 100) from ids, c $$,
  'TC401', null, 'PT-24: suporte não envia documento');
select throws_ok($$ select console_documento_iniciar(impl, cedro, 'OUTRO', 'a.pdf', 'application/pdf', 100) from ids, c $$,
  'TC401', null, 'PT-24: implantação sem atribuição não envia');
select throws_ok($$ select console_documento_iniciar(adm, cedro, 'OUTRO', 'a.exe', 'application/x-msdownload', 100) from ids, c $$,
  'TC422', null, 'tipo fora de PDF, JPG e PNG não');
select throws_ok($$ select console_documento_iniciar(adm, cedro, 'OUTRO', 'a.pdf', 'application/pdf', 10485761) from ids, c $$,
  'TC422', null, 'mais de 10 MB não');
create temp table d as select console_documento_iniciar(adm, cedro, 'CONTRATO_ASSINADO', ' contrato.pdf ', 'application/pdf', 2048) as doc from ids, c;

-- Enquanto envia, não aparece; ao concluir, aparece e vai para o histórico interno.
select is((select count(*)::int from ids, c, console_documentos(adm, cedro)), 0, 'enviando ainda não aparece na lista');
select throws_ok($$ select console_documento_concluir(sup, cedro, doc) from ids, c, d $$, 'TC401', null, 'só quem envia conclui');
select lives_ok($$ select console_documento_concluir(adm, cedro, doc) from ids, c, d $$, 'concluir o envio');
select is((select nome || ' · ' || enviado_por_nome from ids, c, console_documentos(sup, cedro)), 'contrato.pdf · Carol',
  'CO-05: o suporte vê a lista, com quem enviou');
select is((select interno from historico where acao = 'documento.anexado'), true, 'CO-04: o anexo vai para o histórico interno');
select is((select console_documento_abrir(sup, cedro, doc) from ids, c, d), 'contrato.pdf', 'abrir devolve o nome para o download');

-- Guardar tudo; o escritório não vê.
select throws_ok($$ delete from documentos_cliente $$, 'TC023', null, 'documento não se apaga');
select ok(exists (select 1 from tabelas_internas where tabela = 'documentos_cliente'), 'CO-03: tabela interna, o escritório não vê');

select * from finish();
rollback;
