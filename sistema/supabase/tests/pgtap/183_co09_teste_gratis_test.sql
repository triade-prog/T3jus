-- O teste grátis de 7 dias no servidor (F1.31; CO-09, DC12, migration 1160): a linha nasce no
-- cadastro com a chave do dia, o dia 1 é o primeiro acesso de um sócio (em Brasília), o dia 8 deixa
-- o Portal só para consulta pela data, a chave desligada não muda nada, os escritórios de antes
-- ficam como estão, a repetição pela pessoa, e só a Administração dispensa, libera e prorroga,
-- sempre com motivo. As duas entradas ao mesmo tempo, com duas conexões de verdade, ficam em
-- tests/concorrencia/primeiro-acesso-simultaneo.sh.
begin;
select plan(91);

create function pg_temp.relogio(p text) returns timestamptz language sql as $$ select ajustar_relogio(p::timestamptz - now()) $$;
select pg_temp.relogio('2026-11-27 09:00-03');

select is(teste_gratis_ligado(), false, 'CO-09: a chave teste_gratis_ligado nasce desligada');

create temp table ids as select
  teste.equipe('Carol Andrade', 'ADMINISTRACAO') as adm,
  teste.equipe('Rafael Teles', 'IMPLANTACAO') as impl,
  teste.equipe('Marta Quintela', 'FINANCEIRO') as fin,
  teste.equipe('Bruno Saraiva', 'SUPORTE') as sup,
  teste.pessoa('Marina Ribeiro') as marina,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Henrique Moura') as henrique,
  teste.pessoa('Paulo Angico') as paulo,
  teste.pessoa('Lia Cedro') as lia,
  teste.pessoa('Rui Antigo') as rui,
  teste.pessoa('Bia Buriti') as bia,
  teste.pessoa('Joana Jatobá') as joana;

-- Com a chave desligada: a Cedro & Lima e um escritório "de antes" (sem linha, como os que já
-- existem quando a 1160 for aplicada).
create temp table c (cedro uuid, antigo uuid, solto uuid, ribeiro uuid, angico uuid, inga uuid, buriti uuid, jatoba uuid);
insert into c (cedro, antigo, solto) select console_criar_escritorio(adm, 'Cedro & Lima Advocacia', 'Recife', 'PE'),
  console_criar_escritorio(adm, 'Aroeira Advocacia', 'Salvador', 'BA'), teste.escritorio('Sem Carteira') from ids;
select limpar_contexto();
delete from testes_gratis where escritorio_id = (select antigo from c);

update configuracoes set valor = 'true' where chave = 'teste_gratis_ligado';
update c set ribeiro = console_criar_escritorio(adm, 'Ribeiro & Matos Advocacia', 'Salvador', 'BA'),
             angico = console_criar_escritorio(adm, 'Angico Advocacia', 'Aracaju', 'SE'),
             inga = console_criar_escritorio(adm, 'Ingá Advocacia', 'Maceió', 'AL'),
             buriti = console_criar_escritorio(adm, 'Buriti Advocacia', 'Feira de Santana', 'BA'),
             jatoba = console_criar_escritorio(adm, 'Jatobá Advocacia', 'Ilhéus', 'BA') from ids;
insert into vinculos (pessoa_id, escritorio_id, funcao, criado_por)
            select impl, ribeiro, 'IMPLANTACAO', adm from ids, c union all select impl, inga, 'IMPLANTACAO', adm from ids, c
  union all select fin, ribeiro, 'FINANCEIRO', adm from ids, c union all select sup, ribeiro, 'SUPORTE', adm from ids, c
  union all select marina, ribeiro, 'SOCIO', adm from ids, c union all select diego, ribeiro, 'EQUIPE', adm from ids, c
  union all select henrique, angico, 'SOCIO', adm from ids, c union all select paulo, angico, 'SOCIO', adm from ids, c
  union all select henrique, inga, 'SOCIO', adm from ids, c
  union all select lia, cedro, 'SOCIO', adm from ids, c union all select rui, antigo, 'SOCIO', adm from ids, c
  union all select bia, buriti, 'SOCIO', adm from ids, c union all select joana, jatoba, 'SOCIO', adm from ids, c;
update pessoas set senha_criada_em = now() where id in (select unnest(array[marina, diego, henrique, paulo, lia, rui, bia, joana]) from ids);

create function pg_temp.t(p_esc uuid) returns testes_gratis language sql as $$ select * from testes_gratis where escritorio_id = p_esc $$;
create function pg_temp.entrar(p_pessoa uuid, p_esc uuid) returns void language sql as $$
  select escolher_escritorio(p_pessoa, gen_random_uuid(), p_esc) $$;
-- Uma escrita qualquer do Portal: cadastrar um cliente (cada chamada com um telefone diferente).
create temp sequence tel_183;
create function pg_temp.cadastrar(p_pessoa uuid, p_esc uuid) returns jsonb language sql as $$
  select teste.erro(format('select portal_cliente_cadastrar(%L, %L, %L)', p_pessoa, p_esc,
    jsonb_build_object('tipo', 'PF', 'nome', 'Helena Prado ' || n, 'origem', 'SITE',
      'contatos', jsonb_build_array(jsonb_build_object('nome', 'Helena', 'telefone', '+55719888' || lpad(n::text, 5, '0'), 'principal', true)))))
  from (select nextval('tel_183') n) x $$;
create function pg_temp.motivo(p jsonb) returns text language sql as $$ select coalesce(p -> 'detalhe' ->> 'motivo', p ->> 'codigo', 'ok') $$;

-- ---------------------------------------------------------------------------------------
-- A linha nasce no cadastro, com a chave do dia; os de antes não têm linha.
select is((select t.com_teste from c, pg_temp.t(c.cedro) t), false, 'CO-09: cadastrado com a chave desligada, a linha guarda com_teste = false');
select is((select teste_situacao(cedro) from c), 'SEM_TESTE', 'e a situação é SEM_TESTE');
select is((select t.com_teste from c, pg_temp.t(c.ribeiro) t), true, 'CO-09: cadastrado com a chave ligada, com_teste = true');
select is((select teste_situacao(ribeiro) from c), 'PREVISTO', 'e o teste fica PREVISTO até um sócio entrar');
select is((select count(*)::int from testes_gratis, c where escritorio_id in (antigo, solto)), 0, 'CO-09: escritório de antes não ganha linha');
select is((select teste_situacao(antigo) from c), null, 'sem linha, a situação é nula');
select is((select escritorio_dia_um(antigo) from c), null, 'sem linha, escritorio_dia_um é nulo');
select is((select escritorio_dia_um(ribeiro) from c), null, 'escritorio_dia_um é nulo enquanto ninguém entrou');
select ok((select (select t.id from pg_temp.t(inga) t) is not null from c), 'a conversão e o cadastro passam pelo mesmo gatilho da carteira');

-- ---------------------------------------------------------------------------------------
-- O dia 1: o primeiro acesso de um sócio, às 23h40 de Brasília (já é 28/11 em UTC).
select pg_temp.relogio('2026-11-27 23:40-03');
select lives_ok($$ select pg_temp.entrar(diego, ribeiro) from ids, c $$, 'a pessoa da equipe do escritório entra');
select is((select t.primeiro_acesso_em from c, pg_temp.t(c.ribeiro) t), null, 'CO-09: o primeiro acesso da EQUIPE não conta');
select lives_ok($$ select pg_temp.entrar(marina, ribeiro) from ids, c $$, 'a sócia entra');
select is((select (t.inicio, t.fim)::text from c, pg_temp.t(ribeiro) t), '(2026-11-27,2026-12-03)',
  'CO-09: o dia 1 é 27/11 em Brasília, e o último dia é 03/12 (inclusivo)');
select is((select escritorio_dia_um(ribeiro) from c), '2026-11-27'::date, 'CO-09: escritorio_dia_um é a data de Brasília do primeiro acesso');
select is((select t.primeiro_acesso_em from c, pg_temp.t(c.ribeiro) t), '2026-11-27 23:40-03'::timestamptz, 'primeiro_acesso_em guarda o instante');
select is((select teste_situacao(ribeiro) from c), 'EM_TESTE', 'o teste está EM_TESTE');
select is((select count(*)::int || ' ' || bool_or(interno) || ' ' || bool_and(autor_id = marina) from historico, c, ids
            where escritorio_id = ribeiro and acao = 'teste.comecou'), '1 false true',
  'CO-09: teste.comecou vai uma vez ao histórico do escritório, com a sócia como autora');
select is((select (teste_json(ribeiro, false) - 'primeiroAcessoEm' - 'versao') from c),
  '{"fim": "2026-12-03", "diaUm": "2026-11-27", "inicio": "2026-11-27", "diaAtual": 1, "situacao": "EM_TESTE", "totalDias": 7, "soConsultaDesde": "2026-12-04"}'::jsonb,
  'o bloco do teste traz as datas, o dia atual e o total, sem os motivos da equipe');

-- Entrar de novo (outra sessão, outro dia) não muda nada: só o primeiro update vale.
select pg_temp.relogio('2026-11-29 10:00-03');
select lives_ok($$ select pg_temp.entrar(marina, ribeiro) from ids, c $$, 'a sócia entra de novo, noutra sessão');
select is((select (t.primeiro_acesso_em = '2026-11-27 23:40-03', t.inicio, t.fim)::text from c, pg_temp.t(ribeiro) t),
  '(t,2026-11-27,2026-12-03)', 'CO-09: a segunda entrada não mexe no dia 1 nem no fim');
select is((select count(*)::int from historico, c where escritorio_id = ribeiro and acao = 'teste.comecou'), 1, 'e não repete o evento');
select is((select teste_json(ribeiro, false) ->> 'diaAtual' from c), '3', 'em 29/11, é o dia 3');

-- ---------------------------------------------------------------------------------------
-- Um erro do teste não impede o login.
alter table testes_gratis add constraint pg_temp_quebra check (primeiro_acesso_em is null) not valid;
select lives_ok($$ select pg_temp.entrar(joana, jatoba) from ids, c $$, 'CO-09: com o teste quebrado, a sócia entra do mesmo jeito');
select is((select count(*)::int from sessoes_escritorio s, ids, c where s.pessoa_id = joana and s.escritorio_id = jatoba), 1,
  'a sessão fica com o escritório escolhido');
select is((select t.primeiro_acesso_em from c, pg_temp.t(c.jatoba) t), null, 'e só a marcação do teste é desfeita');
alter table testes_gratis drop constraint pg_temp_quebra;
select pg_temp.entrar(joana, jatoba) from ids, c;
select is((select t.inicio from c, pg_temp.t(jatoba) t), '2026-11-29'::date, 'na entrada seguinte, o teste começa');

-- Entrar num escritório sem linha (os de antes) não dá erro e não cria linha.
select lives_ok($$ select pg_temp.entrar(rui, antigo) from ids, c $$, 'CO-09: o sócio do escritório de antes entra');
select is((select count(*)::int from testes_gratis, c where escritorio_id = antigo), 0, 'e o escritório continua sem linha');

-- A chave desligada: o primeiro acesso fica gravado (para a CO-08), mas o teste não começa.
select lives_ok($$ select pg_temp.entrar(lia, cedro) from ids, c $$, 'a sócia da Cedro & Lima entra');
select is((select (t.primeiro_acesso_em is not null, t.inicio)::text from c, pg_temp.t(cedro) t), '(t,)',
  'CO-09: com a chave desligada no cadastro, o primeiro acesso é gravado e o teste não começa');
select is((select escritorio_dia_um(cedro) from c), '2026-11-29'::date, 'escritorio_dia_um vale também sem teste');

-- ---------------------------------------------------------------------------------------
-- A repetição pela pessoa: Henrique fez o teste na Angico e depois entra como sócio da Ingá.
select pg_temp.relogio('2026-11-27 10:00-03');
select pg_temp.entrar(henrique, angico) from ids, c;
select is((select t.inicio from c, pg_temp.t(angico) t), '2026-11-27'::date, 'o teste da Angico começa com Henrique');
update vinculos set revogado_em = now(), revogado_por = (select adm from ids)
 where pessoa_id = (select henrique from ids) and escritorio_id = (select angico from c);
select pg_temp.relogio('2026-11-29 10:00-03');
select lives_ok($$ select pg_temp.entrar(henrique, inga) from ids, c $$, 'Henrique entra na Ingá');
select is((select (t.repetido_em is not null, t.inicio)::text from c, pg_temp.t(inga) t), '(t,)',
  'CO-09: quem já foi sócio (mesmo revogado) de um escritório com teste deixa o teste REPETIDO, sem começar');
select is((select teste_situacao(inga) from c), 'REPETIDO', 'a situação é REPETIDO');
select is((select count(*)::int || ' ' || bool_and(interno) || ' ' || bool_and((dados ->> 'escritorio_anterior_id')::uuid = angico)
             from historico, c where escritorio_id = inga and acao = 'teste.repetido'), '1 true true',
  'CO-09: teste.repetido vai ao histórico interno, com o escritório de antes');
select is((select pg_temp.motivo(pg_temp.cadastrar(henrique, inga)) from ids, c), 'SEM_ASSINATURA',
  'CO-09: no repetido sem decisão, o Portal fica só para consulta (SEM_ASSINATURA)');
select is((select teste.erro(format('select portal_exigir_escrita(%L, %L)', henrique, inga)) -> 'detalhe' ->> 'motivo' from ids, c),
  'SEM_ASSINATURA', 'portal_exigir_escrita recusa do mesmo jeito');

-- Liberar o repetido: só a Administração, com motivo; começa no dia da decisão.
select pg_temp.relogio('2026-11-30 11:00-03');
select is((select pg_temp.motivo(teste.erro(format('select console_teste_liberar(%L, %L, %s, %L)', impl, inga, t.versao, 'Escritório novo do Henrique')))
             from ids, c, pg_temp.t(inga) t), 'TC401', 'CO-09: a Implantação não libera o teste');
select is((select pg_temp.motivo(teste.erro(format('select console_teste_liberar(%L, %L, %s, %L)', adm, inga, t.versao, '  ')))
             from ids, c, pg_temp.t(inga) t), 'MOTIVO_OBRIGATORIO', 'CO-09: liberar sem motivo é recusado');
select is((select pg_temp.motivo(teste.erro(format('select console_teste_liberar(%L, %L, %s, %L)', adm, inga, t.versao + 5, 'Outro escritório')))
             from ids, c, pg_temp.t(inga) t), 'TC409', 'PT-19: liberar com a versão velha dá conflito');
select is((select pg_temp.motivo(teste.erro(format('select console_teste_liberar(%L, %L, %s, %L)', adm, ribeiro, t.versao, 'Sem repetição')))
             from ids, c, pg_temp.t(ribeiro) t), 'TESTE_NAO_REPETIDO', 'só o teste repetido é liberado');
select is((select console_teste_liberar(adm, inga, t.versao, 'Outro escritório, outra sociedade') -> 'teste' ->> 'situacao'
             from ids, c, pg_temp.t(inga) t), 'EM_TESTE', 'CO-09: a Administração libera o teste repetido, com motivo');
select is((select (t.inicio, t.fim, t.liberado_motivo, t.liberado_por = adm)::text from ids, c, pg_temp.t(inga) t),
  '(2026-11-30,2026-12-06,"Outro escritório, outra sociedade",t)', 'o teste liberado começa no dia da decisão');
select is((select string_agg(acao || ':' || interno, ' ' order by id) from historico, c where escritorio_id = inga and acao in ('teste.liberado', 'teste.comecou')),
  'teste.liberado:true teste.comecou:false', 'a liberação vai ao histórico interno e o começo ao do escritório');
select is((select pg_temp.motivo(pg_temp.cadastrar(henrique, inga)) from ids, c), 'ok', 'liberado, Henrique grava no Portal');

-- ---------------------------------------------------------------------------------------
-- O dia 8: só consulta pela data, na virada de Brasília.
select pg_temp.relogio('2026-12-03 23:59-03');
select is((select teste_situacao(ribeiro) from c), 'EM_TESTE', 'CO-09: em 03/12 às 23h59, ainda é o último dia');
select is((select pg_temp.motivo(pg_temp.cadastrar(marina, ribeiro)) from ids, c), 'ok', 'e a sócia grava');
select pg_temp.relogio('2026-12-04 00:00-03');
select is((select teste_situacao(ribeiro) from c), 'ACABOU', 'CO-09: em 04/12 à 0h de Brasília (3h UTC), o teste ACABOU');
select is((select pg_temp.motivo(pg_temp.cadastrar(marina, ribeiro)) from ids, c), 'TESTE_ENCERRADO',
  'CO-09: no dia 8, a sócia não grava (TESTE_ENCERRADO), sem esperar rotina');
select is((select pg_temp.cadastrar(marina, ribeiro) ->> 'codigo' from ids, c), 'TC401', 'a recusa é TC401, como o só consulta');
select is((select pg_temp.motivo(pg_temp.cadastrar(diego, ribeiro)) from ids, c), 'TESTE_ENCERRADO', 'a equipe do escritório também não grava');
select is((select teste.erro(format('select portal_exigir_escrita(%L, %L)', marina, ribeiro)) -> 'detalhe' ->> 'motivo' from ids, c),
  'TESTE_ENCERRADO', 'portal_exigir_escrita recusa com TESTE_ENCERRADO');
select lives_ok($$ select portal_clientes(marina, ribeiro) from ids, c $$, 'CO-09: no dia 8, a sócia lê');
select lives_ok($$ select exportar_escritorio(marina, ribeiro) from ids, c $$, 'CO-09: no dia 8, a sócia exporta os dados');
select lives_ok($$ select pg_temp.entrar(marina, ribeiro) from ids, c $$, 'e continua entrando no Portal');
select is((select portal_trava_escrita(ribeiro) from c), 'TESTE_ENCERRADO', 'portal_trava_escrita diz o motivo');
select is((select teste_json(ribeiro, false) ->> 'diaAtual' from c), null, 'acabado, não há dia atual');

-- Prorrogar: só a Administração, com motivo, escolhendo a nova data; depois do fim, devolve a escrita.
select is((select pg_temp.motivo(teste.erro(format('select console_teste_prorrogar(%L, %L, %s, %L, %L)', impl, ribeiro, t.versao, '2026-12-08', 'Pediu mais dias')))
             from ids, c, pg_temp.t(ribeiro) t), 'TC401', 'CO-09: a Implantação não prorroga');
select is((select pg_temp.motivo(teste.erro(format('select console_teste_prorrogar(%L, %L, %s, %L, %L)', fin, ribeiro, t.versao, '2026-12-08', 'Pediu mais dias')))
             from ids, c, pg_temp.t(ribeiro) t), 'TC401', 'CO-09: o Financeiro não prorroga');
select is((select pg_temp.motivo(teste.erro(format('select console_teste_prorrogar(%L, %L, %s, %L, null)', adm, ribeiro, t.versao, '2026-12-08')))
             from ids, c, pg_temp.t(ribeiro) t), 'MOTIVO_OBRIGATORIO', 'CO-09: prorrogar sem motivo é recusado');
select is((select pg_temp.motivo(teste.erro(format('select console_teste_prorrogar(%L, %L, %s, %L, %L)', adm, ribeiro, t.versao, '2026-12-03', 'Pediu mais dias')))
             from ids, c, pg_temp.t(ribeiro) t), 'PRORROGAR_DATA', 'a nova data precisa vir depois do último dia de agora');
select is((select pg_temp.motivo(teste.erro(format('select console_teste_prorrogar(%L, %L, %s, %L, %L)', adm, ribeiro, t.versao - 1, '2026-12-08', 'Pediu mais dias')))
             from ids, c, pg_temp.t(ribeiro) t), 'TC409', 'PT-19: prorrogar com a versão velha dá conflito');
select is((select console_teste_prorrogar(adm, ribeiro, t.versao, '2026-12-08', 'A sócia pediu mais dias para importar a planilha') -> 'teste' ->> 'situacao'
             from ids, c, pg_temp.t(ribeiro) t), 'EM_TESTE', 'CO-09: a Administração prorroga depois do fim (a equipe T3jus grava no dia 8)');
select is((select pg_temp.motivo(pg_temp.cadastrar(marina, ribeiro)) from ids, c), 'ok', 'CO-09: prorrogado, a escrita volta na hora');
select is((select dados ->> 'fim_antes' || ' ' || (dados ->> 'fim_novo') || ' ' || interno from historico, c
            where escritorio_id = ribeiro and acao = 'teste.prorrogado'), '2026-12-03 2026-12-08 true',
  'CO-09: teste.prorrogado vai ao histórico interno com o fim de antes e o novo');
select is((select teste_json(ribeiro, false) ->> 'totalDias' || '/' || (teste_json(ribeiro, false) ->> 'diaAtual') from c), '12/8',
  'o bloco conta o total com a prorrogação e o dia de hoje');

-- ---------------------------------------------------------------------------------------
-- Dispensar: só a Administração, com motivo; o teste não começa mais.
select is((select pg_temp.motivo(teste.erro(format('select console_teste_dispensar(%L, %L, %s, %L)', impl, buriti, t.versao, 'Piloto')))
             from ids, c, pg_temp.t(buriti) t), 'TC401', 'CO-09: quem não é da Administração não dispensa');
select is((select pg_temp.motivo(teste.erro(format('select console_teste_dispensar(%L, %L, %s, %L)', adm, buriti, t.versao, '')))
             from ids, c, pg_temp.t(buriti) t), 'MOTIVO_OBRIGATORIO', 'CO-09: dispensar sem motivo é recusado');
select is((select console_teste_dispensar(adm, buriti, t.versao, 'Piloto: o combinado fica no desconto') -> 'teste' ->> 'situacao'
             from ids, c, pg_temp.t(buriti) t), 'DISPENSADO', 'CO-09: a Administração dispensa o teste do piloto');
select is((select pg_temp.motivo(teste.erro(format('select console_teste_dispensar(%L, %L, %s, %L)', adm, buriti, t.versao, 'De novo')))
             from ids, c, pg_temp.t(buriti) t), 'TESTE_JA_DISPENSADO', 'dispensar de novo é recusado');
select is((select pg_temp.motivo(teste.erro(format('select console_teste_dispensar(%L, %L, %s, %L)', adm, cedro, t.versao, 'Sem teste')))
             from ids, c, pg_temp.t(cedro) t), 'SEM_TESTE_GRATIS', 'CO-09: o escritório cadastrado com a chave desligada não tem teste a dispensar');
select is((select pg_temp.motivo(teste.erro(format('select console_teste_dispensar(%L, %L, 1, %L)', adm, antigo, 'Sem teste')))
             from ids, c), 'SEM_TESTE_GRATIS', 'nem o escritório de antes');
select is((select pg_temp.motivo(teste.erro(format('select console_teste_prorrogar(%L, %L, %s, %L, %L)', adm, buriti, t.versao, '2026-12-20', 'Mais dias')))
             from ids, c, pg_temp.t(buriti) t), 'TESTE_NAO_COMECOU', 'só prorroga o teste que começou');
select pg_temp.entrar(bia, buriti) from ids, c;
select is((select (t.primeiro_acesso_em is not null, t.inicio)::text from c, pg_temp.t(buriti) t), '(t,)',
  'CO-09: dispensado, o primeiro acesso é gravado e o teste não começa');
select is((select string_agg(dados ->> 'motivo' || ' ' || interno, ',') from historico, c where escritorio_id = buriti and acao = 'teste.dispensado'),
  'Piloto: o combinado fica no desconto true', 'a dispensa vai ao histórico interno com o motivo');

-- ---------------------------------------------------------------------------------------
-- O contrato encerrado durante o teste vence o teste; reabrir não recomeça o teste.
select console_encerrar_contrato(adm, angico, (select versao from clientes where escritorio_id = angico),
  jsonb_build_object('fimEm', hoje_brasilia(), 'motivo', 'Teste não assinado', 'nomeConfirmado', 'Angico Advocacia')) from ids, c;
select is((select pg_temp.motivo(pg_temp.cadastrar(paulo, angico)) from ids, c), 'CONTRATO_ENCERRADO',
  'CO-09: com o contrato encerrado no dia 8, o motivo é CONTRATO_ENCERRADO, não o do teste');
select is((select pg_temp.motivo(teste.erro(format('select console_teste_prorrogar(%L, %L, %s, %L, %L)', adm, angico, t.versao, '2026-12-20', 'Mais dias')))
             from ids, c, pg_temp.t(angico) t), 'CONTRATO_ENCERRADO', 'CO-09: com o contrato encerrado, não prorroga');
select console_reabrir_contrato(adm, angico, (select versao from clientes where escritorio_id = angico), 'Voltou a conversar') from ids, c;
select is((select (t.inicio, teste_situacao(angico))::text from c, pg_temp.t(angico) t), '(2026-11-27,ACABOU)',
  'CO-09: a reabertura não recomeça o teste');
select is((select pg_temp.motivo(pg_temp.cadastrar(paulo, angico)) from ids, c), 'TESTE_ENCERRADO', 'e a trava do teste volta a valer pela data');

-- ---------------------------------------------------------------------------------------
-- Isolamento e quem vê.
select is((select console_teste(fin, ribeiro) ->> 'situacao' from ids, c), 'EM_TESTE', 'o Financeiro vê o teste');
select is((select console_teste(sup, ribeiro) ->> 'liberacao' from ids, c), null, 'o Suporte vê o teste');
select is((select teste.erro(format('select console_teste(%L, %L)', impl, angico)) ->> 'codigo' from ids, c), 'TC401',
  'PT-01: a Implantação não vê o teste de escritório que não é dela');
select is((select teste.erro(format('select console_teste(%L, %L)', marina, ribeiro)) ->> 'codigo' from ids, c), 'TC401',
  'o sócio não usa as ações do Console');
select is((select teste.erro(format('select console_teste_prorrogar(%L, %L, 1, %L, %L)', impl, angico, '2026-12-20', 'x')) ->> 'codigo' from ids, c), 'TC401',
  'PT-01: nada se muda no teste de outro escritório');
select set_config('app.escritorio_id', (select ribeiro from c)::text, true);
set local role dominio;
select is((select array_agg(escritorio_id::text) from testes_gratis), array[current_setting('app.escritorio_id')],
  'PT-01: no contexto da Ribeiro, só a linha da Ribeiro aparece');
select set_config('app.escritorio_id', '', true);
select is((select count(*)::int from testes_gratis), 0, 'sem contexto, nenhuma linha');
reset role;

-- ---------------------------------------------------------------------------------------
-- A chave desligada não muda nada para ninguém, muito depois do dia 8.
select pg_temp.relogio('2027-01-15 10:00-03');
select is((select pg_temp.motivo(pg_temp.cadastrar(lia, cedro)) from ids, c), 'ok', 'CO-09: com a chave desligada no cadastro, a sócia grava sem prazo');
select is((select pg_temp.motivo(pg_temp.cadastrar(rui, antigo)) from ids, c), 'ok', 'CO-09: o escritório de antes grava sem prazo');
select is((select pg_temp.motivo(pg_temp.cadastrar(bia, buriti)) from ids, c), 'ok', 'CO-09: o dispensado grava sem prazo');

select * from finish();
rollback;
