-- Implantação assistida, parte 2 (F1.43; CO-08 e CO-09, migration 1181): abre no primeiro acesso
-- de um sócio (não no convite, nem pela pessoa da equipe), com o prazo contado do dia 1; abre com o
-- teste desligado, ligado e dispensado; abre pela 1ª fatura quando nenhum sócio entrou; um erro na
-- abertura não derruba o login; concluir passa a Ativo e fecha a implantação na mesma transação,
-- com as duas versões; a aba Contrato também fecha; o encerramento cancela no dia do fim (pelo
-- Console e pela rotina); a reabertura abre a número 2; o prazo muda só pela Administração, com
-- motivo no histórico interno; os escritórios que já existem; o isolamento entre escritórios.
begin;
select plan(56);

create function pg_temp.relogio(p text) returns timestamptz language sql as $$ select ajustar_relogio(p::timestamptz - now()) $$;
select pg_temp.relogio('2026-12-01 10:00-03');

create temp table ids as select
  teste.equipe('Carol Andrade', 'ADMINISTRACAO') as adm,
  teste.equipe('Rafael Teles', 'IMPLANTACAO') as imp,
  teste.equipe('Marta Quintela', 'FINANCEIRO') as fin,
  teste.pessoa('Lia Cedro') as lia,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Bia Umbu') as bia,
  teste.pessoa('Ana Ipê') as ana,
  teste.pessoa('Caio Angico') as caio,
  teste.pessoa('Rui Caju') as rui,
  teste.pessoa('Jó Jaca') as jo,
  teste.pessoa('Paulo Pau') as paulo,
  teste.pessoa('Gil Gameleira') as gil,
  teste.pessoa('Teo Tamarindo') as teo;

-- Cedro (chave do teste desligada), Ipê (nenhum sócio entra), Angico (encerra e reabre),
-- Gameleira (a abertura falha no login), Tamarindo (Ativo antes do acesso); Umbu e Ingá com o
-- teste ligado (o Ingá, dispensado); Caju, Jaca e Pau "de antes" (sem linha em testes_gratis).
create temp table c as select
  console_criar_escritorio(adm, 'Cedro & Lima Advocacia', 'Recife', 'PE') as cedro,
  console_criar_escritorio(adm, 'Ipê Advocacia', 'Natal', 'RN') as ipe,
  console_criar_escritorio(adm, 'Angico Advocacia', 'Aracaju', 'SE') as angico,
  console_criar_escritorio(adm, 'Gameleira Advocacia', 'Caruaru', 'PE') as gameleira,
  console_criar_escritorio(adm, 'Tamarindo Advocacia', 'Olinda', 'PE') as tamarindo,
  console_criar_escritorio(adm, 'Caju Advocacia', 'Salvador', 'BA') as caju,
  console_criar_escritorio(adm, 'Jaca Advocacia', 'Ilhéus', 'BA') as jaca,
  console_criar_escritorio(adm, 'Pau Brasil Advocacia', 'Itabuna', 'BA') as pau,
  null::uuid as umbu, null::uuid as inga from ids;
select limpar_contexto();
update configuracoes set valor = 'true' where chave = 'teste_gratis_ligado';
update c set umbu = console_criar_escritorio(adm, 'Umbu Advocacia', 'Petrolina', 'PE'),
             inga = console_criar_escritorio(adm, 'Ingá Advocacia', 'Maceió', 'AL') from ids;
select limpar_contexto();
update configuracoes set valor = 'false' where chave = 'teste_gratis_ligado';
delete from testes_gratis where escritorio_id in (select unnest(array[caju, jaca, pau]) from c);
insert into vinculos (pessoa_id, escritorio_id, funcao, criado_por)
            select lia, cedro, 'SOCIO', adm from ids, c union all select diego, cedro, 'EQUIPE', adm from ids, c
  union all select imp, cedro, 'IMPLANTACAO', adm from ids, c union all select fin, cedro, 'FINANCEIRO', adm from ids, c
  union all select bia, umbu, 'SOCIO', adm from ids, c union all select bia, inga, 'SOCIO', adm from ids, c
  union all select ana, ipe, 'SOCIO', adm from ids, c union all select caio, angico, 'SOCIO', adm from ids, c
  union all select rui, caju, 'SOCIO', adm from ids, c union all select jo, jaca, 'SOCIO', adm from ids, c
  union all select paulo, pau, 'SOCIO', adm from ids, c union all select gil, gameleira, 'SOCIO', adm from ids, c
  union all select teo, tamarindo, 'SOCIO', adm from ids, c;
update pessoas set senha_criada_em = now() where id in (select unnest(array[lia, diego, bia, caio, rui, paulo, gil, teo]) from ids);

create function pg_temp.entrar(p_pessoa uuid, p_esc uuid) returns void language sql as $$
  select escolher_escritorio(p_pessoa, gen_random_uuid(), p_esc); select limpar_contexto() $$;
create function pg_temp.imp(p_esc uuid) returns implantacoes language sql as $$
  select * from implantacoes where escritorio_id = p_esc order by numero desc limit 1 $$;
create function pg_temp.qtd(p_esc uuid) returns integer language sql as $$
  select count(*)::int from implantacoes where escritorio_id = p_esc $$;
create function pg_temp.vc(p_esc uuid) returns integer language sql as $$ select versao from clientes where escritorio_id = p_esc $$;
create function pg_temp.motivo(p jsonb) returns text language sql as $$ select coalesce(p -> 'detalhe' ->> 'motivo', p ->> 'codigo', 'ok') $$;

-- ---------------------------------------------------------------------------------------
-- O primeiro acesso de um sócio abre; o convite e a pessoa da equipe, não.
select is((select pg_temp.qtd(cedro) from c), 0, 'CO-08: o convite do sócio não abre a implantação');
select pg_temp.entrar(diego, cedro) from ids, c;
select is((select pg_temp.qtd(cedro) from c), 0, 'CO-08: a pessoa da EQUIPE do escritório entra e a implantação não abre');
select pg_temp.relogio('2026-12-01 23:40-03');
select pg_temp.entrar(lia, cedro) from ids, c;
select is((select row(i.numero, i.estado, i.aberta_em, i.prazo_ate, i.condicao, i.condicao_texto)::text from c, pg_temp.imp(cedro) i),
  row(1, 'ABERTA', date '2026-12-01', date '2026-12-31', 'ISENTA', 'Oferta de lançamento')::text,
  'CO-08: o primeiro acesso da sócia abre a número 1, isenta, com o prazo de 30 dias contado do dia 1 (em Brasília)');
select is((select escritorio_dia_um(cedro) from c), date '2026-12-01', 'CO-09: o dia 1 é o do primeiro acesso, que a implantação usa');
select is((select h.autor_id from historico h, c where h.entidade = 'implantacoes' and h.entidade_id = (pg_temp.imp(cedro)).id::text
            and h.dados ->> 'evento' = 'IMPLANTACAO_ABERTA'), (select lia from ids),
  'CO-08: a abertura passa pelo guardião, com a sócia da sessão como autora');
select pg_temp.relogio('2026-12-03 09:00-03');
select pg_temp.entrar(lia, cedro) from ids, c;
select is((select pg_temp.qtd(cedro) from c), 1, 'CO-08: entrar de novo não abre outra implantação');
select is((select (pg_temp.imp(cedro)).aberta_em from c), date '2026-12-01', 'e não muda o dia da abertura');

-- Com o teste ligado e com o teste dispensado.
select pg_temp.entrar(bia, umbu) from ids, c;
select is((select row((pg_temp.imp(umbu)).estado, (pg_temp.imp(umbu)).aberta_em)::text from c), row('ABERTA', date '2026-12-03')::text,
  'CO-08: com o teste ligado, a implantação abre junto com o teste (dia 1)');
select is((select t.inicio from testes_gratis t, c where t.escritorio_id = umbu), date '2026-12-03', 'CO-09: e o teste começou no mesmo dia');
select console_teste_dispensar(adm, inga, (select versao from testes_gratis t where t.escritorio_id = inga), 'Escritório fundador') from ids, c;
select limpar_contexto();
select pg_temp.entrar(bia, inga) from ids, c;
select is((select (pg_temp.imp(inga)).estado from c), 'ABERTA', 'CO-08: com o teste dispensado, a implantação abre no primeiro acesso');

-- Um erro na abertura não derruba o login nem desfaz o primeiro acesso.
alter table implantacoes add constraint pg_temp_quebra check (numero < 0) not valid;
select lives_ok($$ select pg_temp.entrar(gil, gameleira) from ids, c $$, 'CO-08: com a abertura quebrada, o sócio entra mesmo assim');
alter table implantacoes drop constraint pg_temp_quebra;
select is((select pg_temp.qtd(gameleira) from c), 0, 'CO-08: e a implantação não abriu');
select ok((select escritorio_dia_um(gameleira) is not null from c), 'CO-09: o primeiro acesso ficou gravado');

-- A 1ª fatura (o PR 3 chama implantacao_abrir com na_fatura): abre quando nenhum sócio entrou.
select ok((select implantacao_abrir(gameleira, true, true) is not null from c), 'CO-08: pela 1ª fatura, abre a do escritório que ficou sem');
select is((select (pg_temp.imp(gameleira)).aberta_em from c), (select escritorio_dia_um(gameleira) from c),
  'CO-08: e o prazo conta do dia 1, quando há');
select ok((select implantacao_abrir(ipe, true, true) is not null from c), 'CO-08: pela 1ª fatura, abre mesmo sem sócio que entrou');
select is((select row((pg_temp.imp(ipe)).aberta_em, (pg_temp.imp(ipe)).prazo_ate)::text from c), row(date '2026-12-03', date '2027-01-02')::text,
  'CO-08: sem dia 1, o prazo conta do dia da abertura');
select is((select implantacao_abrir(ipe, true, true) = (pg_temp.imp(ipe)).id from c), true,
  'CO-08: chamar de novo devolve a mesma, sem abrir outra');
select is((select pg_temp.qtd(ipe) from c), 1, 'e há uma só');

-- Ativo antes de qualquer acesso: o primeiro acesso não abre; a 1ª fatura abre e já conclui.
select console_mudar_estagio(adm, tamarindo, pg_temp.vc(tamarindo), 'ATIVO', 'Piloto') from ids, c;
select limpar_contexto();
select pg_temp.entrar(teo, tamarindo) from ids, c;
select is((select pg_temp.qtd(tamarindo) from c), 0, 'CO-08: no Ativo, o primeiro acesso não abre implantação');
select is((select implantacao_abrir(tamarindo, true) from c), null::uuid, 'CO-08: e fora da 1ª fatura o Ativo não abre');
select ok((select implantacao_abrir(tamarindo, true, true) is not null from c), 'CO-08: a 1ª fatura do Ativo abre a implantação');
select is((select (pg_temp.imp(tamarindo)).estado from c), 'CONCLUIDA', 'e a conclui na hora, porque o Ativo já veio');

-- ---------------------------------------------------------------------------------------
-- Concluir: passa a Ativo e fecha a implantação na mesma transação.
select is(pg_temp.motivo(teste.erro(format('select console_implantacao_concluir(%L, %L, %s, %s, %L)', fin, cedro, pg_temp.vc(cedro),
  (pg_temp.imp(cedro)).versao, 'x'))), 'TC401', 'CO-08: o Financeiro não conclui (console.estagio.mudar)') from ids, c;
select is(pg_temp.motivo(teste.erro(format('select console_implantacao_concluir(%L, %L, %s, %s, %L)', lia, cedro, pg_temp.vc(cedro),
  (pg_temp.imp(cedro)).versao, 'x'))), 'TC401', 'CO-08: a sócia não conclui pelo Console') from ids, c;
select is(pg_temp.motivo(teste.erro(format('select console_implantacao_concluir(%L, %L, %s, %s, %L)', imp, cedro, pg_temp.vc(cedro),
  (pg_temp.imp(cedro)).versao + 1, 'x'))), 'TC409', 'CO-08: a versão velha da implantação dá conflito') from ids, c;
select is(pg_temp.motivo(teste.erro(format('select console_implantacao_concluir(%L, %L, %s, %s, %L)', imp, cedro, pg_temp.vc(cedro) + 1,
  (pg_temp.imp(cedro)).versao, 'x'))), 'TC409', 'CO-08: a versão velha da carteira dá conflito') from ids, c;
select is(teste.erro(format('select console_implantacao_concluir(%L, %L, %s, %s, %L)', imp, cedro, pg_temp.vc(cedro),
  (pg_temp.imp(cedro)).versao, repeat('a', 2001))) -> 'detalhe', '{"campos": ["resumo"]}'::jsonb,
  'CO-08: o resumo vai até 2.000 caracteres') from ids, c;
select is((select (pg_temp.imp(cedro)).estado || ' ' || (select estado from clientes where escritorio_id = cedro) from c), 'ABERTA IMPLANTACAO',
  'CO-08: as recusas não mudam nada');
create temp table r1 as select console_implantacao_concluir(imp, cedro, pg_temp.vc(cedro), (pg_temp.imp(cedro)).versao,
  '  Seis pessoas treinadas; importação do Astrea concluída.  ') as r from ids, c;
select limpar_contexto();
select is((select estado from clientes, c where escritorio_id = cedro), 'ATIVO', 'CO-08: concluir passa o escritório a Ativo');
select is((select row(i.estado, i.resumo, i.concluida_por = (select imp from ids))::text from c, pg_temp.imp(cedro) i),
  row('CONCLUIDA', 'Seis pessoas treinadas; importação do Astrea concluída.', true)::text,
  'CO-08: e fecha a implantação com o resumo e quem concluiu vindo da sessão');
select is((select (r -> 'implantacao' ->> 'estado') || ' ' || (r ->> 'versaoCliente') from r1), 'CONCLUIDA ' || (select pg_temp.vc(cedro) from c),
  'CO-08: a resposta traz a versão nova da carteira e a implantação concluída');
select is((select h.dados ->> 'motivo' from historico h, c where h.entidade = 'clientes' and h.escritorio_id = cedro
            and h.dados ->> 'para' = 'ATIVO'), 'Implantação concluída', 'CO-08: o motivo do estágio é "Implantação concluída"');
select is((select h.dados ->> 'evento' from historico h, c where h.entidade = 'implantacoes' and h.entidade_id = (pg_temp.imp(cedro)).id::text
            and h.dados ->> 'para' = 'CONCLUIDA'), 'IMPLANTACAO_CONCLUIDA', 'CO-08: a conclusão fica no histórico pelo guardião');
select is(pg_temp.motivo(teste.erro(format('select console_implantacao_concluir(%L, %L, %s, %s, null)', imp, cedro, pg_temp.vc(cedro),
  (pg_temp.imp(cedro)).versao))), 'IMPLANTACAO_NAO_ABERTA', 'CO-08: concluir de novo é recusado') from ids, c;

-- Pela aba Contrato (console_mudar_estagio) também fecha, sem resumo.
select console_mudar_estagio(adm, umbu, pg_temp.vc(umbu), 'ATIVO', 'Equipe treinada') from ids, c;
select limpar_contexto();
select is((select row(i.estado, i.resumo)::text from c, pg_temp.imp(umbu) i), row('CONCLUIDA', null::text)::text,
  'CO-08: passar a Ativo pela aba Contrato também conclui a implantação');

-- ---------------------------------------------------------------------------------------
-- O prazo: só a Administração, com motivo no histórico interno.
select is(pg_temp.motivo(teste.erro(format('select console_implantacao_prazo(%L, %L, %L, %L, %s)', imp, ipe, date '2027-01-20',
  'Sócia viajou', (pg_temp.imp(ipe)).versao))), 'TC401', 'CO-08: a Implantação não muda o prazo') from ids, c;
select is(pg_temp.motivo(teste.erro(format('select console_implantacao_prazo(%L, %L, %L, %L, %s)', adm, ipe, date '2027-01-20',
  ' ', (pg_temp.imp(ipe)).versao))), 'MOTIVO_OBRIGATORIO', 'CO-08: sem motivo, não muda') from ids, c;
select is(pg_temp.motivo(teste.erro(format('select console_implantacao_prazo(%L, %L, %L, %L, %s)', adm, ipe, date '2026-12-02',
  'Sócia viajou', (pg_temp.imp(ipe)).versao))), 'PRAZO_INVALIDO', 'CO-08: o prazo antes de hoje é recusado') from ids, c;
select is(pg_temp.motivo(teste.erro(format('select console_implantacao_prazo(%L, %L, %L, %L, %s)', adm, ipe, date '2028-01-01',
  'Sócia viajou', (pg_temp.imp(ipe)).versao))), 'PRAZO_INVALIDO', 'CO-08: o prazo a mais de um ano da abertura é recusado') from ids, c;
select is(pg_temp.motivo(teste.erro(format('select console_implantacao_prazo(%L, %L, %L, %L, %s)', adm, ipe, date '2027-01-20',
  'Sócia viajou', (pg_temp.imp(ipe)).versao + 1))), 'TC409', 'CO-08: a versão velha dá conflito') from ids, c;
select is((select console_implantacao_prazo(adm, ipe, date '2027-01-20', 'Sócia viajou', (pg_temp.imp(ipe)).versao) -> 'implantacao' ->> 'prazoAte'
             from ids, c), '2027-01-20', 'CO-08: a Administração muda o prazo');
select limpar_contexto();
select is((select row(h.interno, h.autor_id = (select adm from ids), h.dados ->> 'motivo', h.dados ->> 'de', h.dados ->> 'para')::text
             from historico h, c where h.acao = 'implantacao.prazo_mudou' and h.escritorio_id = ipe),
  row(true, true, 'Sócia viajou', '2027-01-02', '2027-01-20')::text,
  'CO-08: o motivo, o antes e o depois vão para o histórico interno, com o autor da sessão');
select is(pg_temp.motivo(teste.erro(format('select console_implantacao_prazo(%L, %L, %L, %L, %s)', adm, cedro, date '2027-01-20',
  'x', (pg_temp.imp(cedro)).versao))), 'IMPLANTACAO_NAO_ABERTA', 'CO-08: a implantação concluída não muda o prazo') from ids, c;
select is((select (pg_temp.imp(ipe)).estado from c), 'ABERTA', 'CO-08: no fim do prazo nada passa a Ativo sozinho (DC14)');

-- ---------------------------------------------------------------------------------------
-- O fim do contrato cancela no dia do fim; a reabertura abre a número 2.
select pg_temp.entrar(caio, angico) from ids, c;
select console_encerrar_contrato(adm, angico, pg_temp.vc(angico),
  jsonb_build_object('fimEm', date '2026-12-10', 'motivo', 'Distrato', 'nomeConfirmado', 'Angico Advocacia')) from ids, c;
select limpar_contexto();
select is((select (pg_temp.imp(angico)).estado from c), 'ABERTA', 'CO-08: o fim marcado para depois não cancela a implantação');
select pg_temp.relogio('2026-12-10 04:00-03');
select aplicar_prazos();
select limpar_contexto();
select is((select row(i.estado, i.cancelada_em is not null)::text from c, pg_temp.imp(angico) i), row('CANCELADA', true)::text,
  'CO-08: no dia do fim, a rotina encerra o contrato e cancela a implantação');
select is((select h.autor_tipo::text || ' ' || (h.dados ->> 'evento') from historico h, c where h.entidade = 'implantacoes'
            and h.entidade_id = (pg_temp.imp(angico)).id::text and h.dados ->> 'para' = 'CANCELADA'), 'SISTEMA IMPLANTACAO_CANCELADA',
  'CO-08: o cancelamento pela rotina fica no histórico como do sistema');
select console_reabrir_contrato(adm, angico, pg_temp.vc(angico), 'Cliente voltou atrás') from ids, c;
select limpar_contexto();
select is((select row(i.numero, i.estado, i.aberta_em, i.prazo_ate, i.condicao)::text from c, pg_temp.imp(angico) i),
  row(2, 'ABERTA', date '2026-12-10', date '2027-01-09', 'ISENTA')::text,
  'CO-08: reabrir o contrato encerrado na implantação abre a número 2, com a regra do dia e o prazo da reabertura');
select is((select console_encerrar_contrato(adm, ipe, pg_temp.vc(ipe),
  jsonb_build_object('fimEm', date '2026-12-10', 'motivo', 'Desistiu', 'nomeConfirmado', 'Ipê Advocacia')) -> 'encerramento' is not null from ids, c),
  true, 'o contrato do Ipê termina hoje, pelo Console');
select limpar_contexto();
select is((select (pg_temp.imp(ipe)).estado from c), 'CANCELADA', 'CO-08: encerrar no dia, pelo Console, cancela na hora');

-- ---------------------------------------------------------------------------------------
-- Os escritórios que já existem: em Implantação com sócio que criou a senha abrem, isentos.
select console_mudar_estagio(adm, pau, pg_temp.vc(pau), 'ATIVO', 'Já usa') from ids, c;
select limpar_contexto();
create temp table antigos (n integer);
grant insert on antigos to dominio;
set local role dominio;
insert into antigos select implantacao_abrir_antigos();
reset role;
select is((select n from antigos) >= 1, true, 'CO-08: a abertura dos antigos roda como o domínio, como na migration');
select is((select row(i.numero, i.aberta_em, i.prazo_ate, i.condicao)::text from c, pg_temp.imp(caju) i),
  row(1, date '2026-12-10', date '2027-01-09', 'ISENTA')::text,
  'CO-08: o antigo em Implantação com sócio que já criou a senha abre no dia da migration, isento (corte nulo)');
select is((select pg_temp.qtd(jaca) from c), 0, 'CO-08: o antigo cujo sócio ainda não criou a senha espera o primeiro acesso ou a 1ª fatura');
select implantacao_abrir_antigos();
select is((select pg_temp.qtd(pau) + pg_temp.qtd(caju) from c), 1, 'CO-08: o Ativo não ganha implantação, e rodar de novo não repete');

-- ---------------------------------------------------------------------------------------
-- Isolamento: com o contexto de um escritório, só a implantação dele.
select entrar_escritorio(lia, cedro, 'escritorio.ver') from ids, c;
create temp table vistos (escritorio_id uuid);
grant insert on vistos to dominio;
set local role dominio;
insert into vistos select escritorio_id from implantacoes;
reset role;
select limpar_contexto();
select is((select array_agg(distinct escritorio_id) from vistos), (select array[cedro] from c),
  'CO-08: no contexto da Cedro, só aparece a implantação da Cedro');

select * from finish();
rollback;
