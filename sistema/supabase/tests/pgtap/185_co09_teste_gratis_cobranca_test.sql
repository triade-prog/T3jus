-- O teste grátis de 7 dias, parte da cobrança (F1.32; CO-09, DC12, migration 1161): nenhuma
-- fatura no teste, nem com a assinatura confirmada no dia 2 nem com o Ativo; a cobrança começa em
-- fim + 1 (Brasília) pela rotina, e a primeira mensalidade é a do mês seguinte; com a rotina parada
-- no dia, o começo continua em fim + 1; o desconto de entrada no carnê anda junto (CO-10, 1170);
-- o dispensado paga desde a confirmação; o teste acabado, desde a confirmação; o escritório sem
-- teste segue a regra antiga e a confirmação dá SEM_TESTE_GRATIS; só a Administração e o
-- Financeiro confirmam, com "como" e o detalhe; ASSINADO libera a trava, e quem não foi confirmado
-- continua travado no dia 8. As duas confirmações ao mesmo tempo e a confirmação com a rotina
-- ficam em tests/concorrencia/assinatura-confirmar-simultanea.sh.
begin;
select plan(77);

create function pg_temp.relogio(p text) returns timestamptz language sql as $$ select ajustar_relogio(p::timestamptz - now()) $$;
select pg_temp.relogio('2026-11-27 09:00-03');

create temp table ids as select
  teste.equipe('Carol Andrade', 'ADMINISTRACAO') as adm,
  teste.equipe('Marta Quintela', 'FINANCEIRO') as fin,
  teste.equipe('Rafael Teles', 'IMPLANTACAO') as impl,
  teste.equipe('Bruno Saraiva', 'SUPORTE') as sup,
  teste.pessoa('Marina Ribeiro') as marina,
  teste.pessoa('Ana Lúcia Prado') as ana,
  teste.pessoa('Lucas Buriti') as lucas,
  teste.pessoa('Sara Sucupira') as sara,
  teste.pessoa('Henrique Moura') as henrique,
  teste.pessoa('Joana Jatobá') as joana,
  teste.pessoa('Lia Cedro') as lia,
  teste.pessoa('Rui Antigo') as rui;

-- Com a chave desligada: a Cedro & Lima (com_teste = false) e a Aroeira, "de antes" (sem linha).
create temp table c (cedro uuid, antigo uuid, ribeiro uuid, ipe uuid, buriti uuid, sucupira uuid, inga uuid, angico uuid, jatoba uuid);
insert into c (cedro, antigo) select console_criar_escritorio(adm, 'Cedro & Lima Advocacia', 'Recife', 'PE'),
  console_criar_escritorio(adm, 'Aroeira Advocacia', 'Salvador', 'BA') from ids;
select limpar_contexto();
delete from testes_gratis where escritorio_id = (select antigo from c);
update configuracoes set valor = 'true' where chave = 'teste_gratis_ligado';
update c set ribeiro = console_criar_escritorio(adm, 'Ribeiro & Matos Advocacia', 'Salvador', 'BA'),
             ipe = console_criar_escritorio(adm, 'Ipê Advocacia', 'Salvador', 'BA'),
             buriti = console_criar_escritorio(adm, 'Buriti Advocacia', 'Feira de Santana', 'BA'),
             sucupira = console_criar_escritorio(adm, 'Sucupira Advocacia', 'Vitória da Conquista', 'BA'),
             inga = console_criar_escritorio(adm, 'Ingá Advocacia', 'Maceió', 'AL'),
             angico = console_criar_escritorio(adm, 'Angico Advocacia', 'Aracaju', 'SE'),
             jatoba = console_criar_escritorio(adm, 'Jatobá Advocacia', 'Ilhéus', 'BA') from ids;
update configuracoes set valor = 'false' where chave = 'teste_gratis_ligado';
insert into vinculos (pessoa_id, escritorio_id, funcao, criado_por)
            select marina, ribeiro, 'SOCIO', adm from ids, c union all select ana, ipe, 'SOCIO', adm from ids, c
  union all select lucas, buriti, 'SOCIO', adm from ids, c union all select sara, sucupira, 'SOCIO', adm from ids, c
  union all select henrique, angico, 'SOCIO', adm from ids, c union all select henrique, inga, 'SOCIO', adm from ids, c
  union all select joana, jatoba, 'SOCIO', adm from ids, c union all select lia, cedro, 'SOCIO', adm from ids, c
  union all select rui, antigo, 'SOCIO', adm from ids, c
  union all select impl, ribeiro, 'IMPLANTACAO', adm from ids, c union all select sup, ribeiro, 'SUPORTE', adm from ids, c
  union all select fin, e, 'FINANCEIRO', adm from ids, c, unnest(array[cedro, antigo, ribeiro, ipe, buriti, sucupira, inga, angico, jatoba]) e;
update pessoas set senha_criada_em = now() where id in (select unnest(array[marina, ana, lucas, sara, henrique, joana, lia, rui]) from ids);

create temp table pl as select (console_plano_salvar(adm, null, null, '{"nome":"Escritório","precoCentavos":49900,"pessoasIncluidas":2}') ->> 'id')::uuid as id from ids;

create function pg_temp.t(p_esc uuid) returns testes_gratis language sql as $$ select * from testes_gratis where escritorio_id = p_esc $$;
create function pg_temp.a(p_esc uuid) returns assinaturas language sql as $$ select * from assinaturas where escritorio_id = p_esc $$;
create function pg_temp.ver(p_esc uuid) returns integer language sql as $$ select versao from assinaturas where escritorio_id = p_esc $$;
create function pg_temp.vcli(p_esc uuid) returns integer language sql as $$ select versao from clientes where escritorio_id = p_esc $$;
create function pg_temp.nfat(p_esc uuid) returns integer language sql as $$ select count(*)::int from faturas where escritorio_id = p_esc $$;
create function pg_temp.entrar(p_pessoa uuid, p_esc uuid) returns void language sql as $$
  select escolher_escritorio(p_pessoa, gen_random_uuid(), p_esc) $$;
create function pg_temp.preparar(p_esc uuid, p_extra jsonb default '{}') returns jsonb language sql as $$
  select console_assinatura_salvar((select fin from ids), p_esc, null, jsonb_build_object('planoId', (select id from pl), 'diaVencimento', 10,
    'forma', 'PIX', 'emailCobranca', 'financeiro@exemplo.com.br') || p_extra) $$;
create function pg_temp.confirmar(p_pessoa uuid, p_esc uuid, p_como text default 'PORTAL',
                                  p_detalhe text default 'Confirmou por telefone o plano, a forma e o e-mail de cobrança') returns jsonb language sql as $$
  select teste.erro(format('select console_assinatura_confirmar(%L, %L, %s, %L)', p_pessoa, p_esc, coalesce(pg_temp.ver(p_esc)::text, 'null'),
    jsonb_build_object('como', p_como, 'detalhe', p_detalhe))) $$;
create function pg_temp.motivo(p jsonb) returns text language sql as $$ select coalesce(p -> 'detalhe' ->> 'motivo', p ->> 'codigo', 'ok') $$;
create temp sequence tel_184;
create function pg_temp.cadastrar(p_pessoa uuid, p_esc uuid) returns text language sql as $$
  select pg_temp.motivo(teste.erro(format('select portal_cliente_cadastrar(%L, %L, %L)', p_pessoa, p_esc,
    jsonb_build_object('tipo', 'PF', 'nome', 'Helena Prado ' || n, 'origem', 'SITE',
      'contatos', jsonb_build_array(jsonb_build_object('nome', 'Helena', 'telefone', '+55719777' || lpad(n::text, 5, '0'), 'principal', true))))))
  from (select nextval('tel_184') n) x $$;

-- ---------------------------------------------------------------------------------------
-- No dia do cadastro: a Sucupira prepara o carnê com 20% até fevereiro (3 faturas contadas da
-- primeira, CO-10); a Buriti, piloto, tem o teste dispensado; o primeiro acesso da Ribeiro e da Ipê.
select pg_temp.preparar(sucupira, jsonb_build_object('forma', 'CARNE',
  'desconto', jsonb_build_object('pct', 20, 'ate', '2027-02-01', 'motivo', 'Entrada: as 3 primeiras faturas'))) from c;
select is((select desconto_meses from pg_temp.a((select sucupira from c))), 3, 'CO-10: o desconto lançado antes da cobrança vale 3 faturas');
select console_teste_dispensar(adm, buriti, (pg_temp.t(buriti)).versao, 'Piloto: o combinado de fundador está no desconto') from ids, c;
select pg_temp.relogio('2026-11-27 23:40-03');
select pg_temp.entrar(marina, ribeiro), pg_temp.entrar(ana, ipe) from ids, c;
select is((select (fim)::text from pg_temp.t((select ribeiro from c))), '2026-12-03', 'o teste da Ribeiro vai até 03/12');

-- ---------------------------------------------------------------------------------------
-- Quem confirma e o que é preciso.
select pg_temp.relogio('2026-11-28 10:00-03');
select is((select pg_temp.motivo(pg_temp.confirmar(fin, ipe)) from ids, c), 'ASSINATURA_NAO_PREPARADA',
  'CO-09: sem assinatura preparada, não há o que confirmar');
select pg_temp.preparar(ribeiro) from c;
select is((select pg_temp.nfat(ribeiro) from c), 0, 'CO-09: preparar a assinatura no teste não emite fatura');
select is((select pg_temp.motivo(pg_temp.confirmar(impl, ribeiro)) from ids, c), 'TC401', 'CO-09: a Implantação não confirma a assinatura');
select is((select pg_temp.motivo(pg_temp.confirmar(sup, ribeiro)) from ids, c), 'TC401', 'CO-09: o Suporte não confirma a assinatura');
select is((select pg_temp.motivo(pg_temp.confirmar(marina, ribeiro)) from ids, c), 'TC401', 'a sócia não usa a ação do Console');
select is((select pg_temp.confirmar(fin, ribeiro, 'TELEGRAMA', '  ') -> 'detalhe' -> 'campos' from ids, c), '["como", "detalhe"]'::jsonb,
  'CO-09: "como" fora da lista fixa e o detalhe vazio voltam presos aos campos');
select is((select pg_temp.confirmar(fin, ribeiro, 'EMAIL', repeat('x', 301)) -> 'detalhe' -> 'campos' from ids, c), '["detalhe"]'::jsonb,
  'CO-09: o detalhe vai até 300 letras');
select is((select pg_temp.confirmar(fin, ribeiro, 'EMAIL', null) -> 'detalhe' -> 'campos' from ids, c), '["detalhe"]'::jsonb,
  'CO-09: o detalhe é obrigatório');
select is((select pg_temp.motivo(teste.erro(format('select console_assinatura_confirmar(%L, %L, %s, %L)', fin, ribeiro, pg_temp.ver(ribeiro) - 1,
             '{"como":"EMAIL","detalhe":"Pelo e-mail de 28/11"}'))) from ids, c), 'TC409', 'PT-19: confirmar com a versão velha dá conflito');
select is((select (pg_temp.a(ribeiro)).assinada_em from c), null, 'as recusas não gravam nada');

-- Confirmada no dia 2: ASSINADO, e nenhuma fatura.
select is((select pg_temp.motivo(pg_temp.confirmar(fin, ribeiro, 'PORTAL',
             'Marina confirmou por telefone o plano Escritório, o Pix e o e-mail de cobrança')) from ids, c), 'ok',
  'CO-09: o Financeiro confirma a assinatura no dia 2');
select is((select (a.assinada_por = fin, a.assinada_canal, a.assinada_como, a.inicio_cobranca)::text from ids, c, pg_temp.a(ribeiro) a),
  '(t,CONSOLE,PORTAL,)', 'a confirmação guarda quem, o canal e como; a cobrança não começa');
select is((select pg_temp.nfat(ribeiro) from c), 0, 'CO-09: assinado no dia 2, nenhuma fatura sai no teste');
select is((select teste_situacao(ribeiro) from c), 'ASSINADO', 'CO-09: a situação é ASSINADO');
select is((select teste_json(ribeiro, false) ->> 'diaAtual' || ' ' || (teste_json(ribeiro, false) ->> 'cobrancaComecaEm') from c), '2 2026-12-04',
  'o bloco segue contando o dia do teste e diz que a cobrança começa em 04/12');
select is((select teste_json(ribeiro, false) -> 'confirmacao' from c), null, 'o Portal não recebe o detalhe da confirmação');
select is((select teste_json(ribeiro, true) -> 'confirmacao' ->> 'como' from c), 'PORTAL', 'a equipe vê como o escritório confirmou');
select is((select count(*)::int || ' ' || bool_and(interno) || ' ' || bool_and(autor_id = fin) || ' ' || max(dados ->> 'como') || ' '
                  || max(dados ->> 'cobranca_comeca_em') || ' ' || (max(dados ->> 'detalhe') like 'Marina confirmou%')
             from historico, c, ids where escritorio_id = ribeiro and acao = 'assinatura.confirmada'),
  '1 true true PORTAL 2026-12-04 true', 'CO-09: assinatura.confirmada vai ao histórico interno, com autor, como e detalhe');
select is((select count(*)::int from fatura_eventos, c where escritorio_id = ribeiro and acao = 'assinatura.confirmada'), 1,
  'e a fatura_eventos da assinatura');
select is((select pg_temp.motivo(pg_temp.confirmar(adm, ribeiro)) from ids, c), 'JA_ASSINADO', 'CO-09: confirmar de novo dá JA_ASSINADO');
select is((select pg_temp.motivo(teste.erro(format('select console_teste_prorrogar(%L, %L, %s, %L, %L)', adm, ribeiro, t.versao, '2026-12-08', 'Mais dias')))
             from ids, c, pg_temp.t(ribeiro) t), 'JA_ASSINADO', 'CO-09: assinado, o teste não se prorroga');
select is((select pg_temp.motivo(teste.erro(format('select console_teste_dispensar(%L, %L, %s, %L)', adm, ribeiro, t.versao, 'Piloto')))
             from ids, c, pg_temp.t(ribeiro) t), 'JA_ASSINADO', 'CO-09: assinado, o teste não se dispensa');

-- Ativo no teste não cobra.
select pg_temp.relogio('2026-11-29 10:00-03');
select lives_ok($$ select console_mudar_estagio(adm, ribeiro, pg_temp.vcli(ribeiro), 'ATIVO', 'Implantação concluída') from ids, c $$,
  'a Ribeiro passa para Ativo no teste');
select is((select pg_temp.nfat(ribeiro) from c), 0, 'CO-09: o Ativo no teste não emite fatura');
select is((select (pg_temp.a(ribeiro)).inicio_cobranca from c), null, 'e a cobrança não começa');

-- O último dia, às 23h59 de Brasília (já é 04/12 em UTC): a rotina não começa a cobrança.
select pg_temp.relogio('2026-12-03 23:59-03');
select is((select (cobranca_rotina() ->> 'testesComecados')::int), 0, 'CO-09: em 03/12 às 23h59 de Brasília, a rotina não começa a cobrança');
select is((select pg_temp.nfat(ribeiro) from c), 0, 'e nenhuma fatura sai no último dia');

-- 04/12 à 0h de Brasília: ASSINADO, a trava não vale; quem não foi confirmado continua travado.
select pg_temp.relogio('2026-12-04 00:00-03');
select is((select portal_trava_escrita(ribeiro) from c), null, 'CO-09: com a assinatura confirmada, portal_trava_escrita não trava no dia 8');
select is((select pg_temp.cadastrar(marina, ribeiro) from ids, c), 'ok', 'CO-09: assinado, a sócia grava no dia 8');
select is((select teste_situacao(ribeiro) from c), 'ASSINADO', 'depois do fim, continua ASSINADO');
select is((select teste_json(ribeiro, false) ->> 'diaAtual' from c), null, 'e não há mais dia do teste');
select pg_temp.preparar(ipe) from c;
select is((select pg_temp.cadastrar(ana, ipe) from ids, c), 'TESTE_ENCERRADO',
  'CO-09: com a assinatura só preparada, sem confirmação, a Ipê fica só para consulta no dia 8');

-- A rotina das 8h de 04/12 começa a cobrança: fim + 1, e a primeira mensalidade é a de janeiro.
select pg_temp.relogio('2026-12-04 08:00-03');
select is((select (cobranca_rotina() ->> 'testesComecados')::int), 1, 'CO-09: a rotina das 8h de 04/12 começa a cobrança da Ribeiro');
select is((select (a.inicio_cobranca, a.primeira_competencia)::text from c, pg_temp.a(ribeiro) a), '(2026-12-04,2027-01-01)',
  'CO-09: a cobrança começa em fim + 1 (04/12) e a primeira mensalidade é a de janeiro de 2027');
select is((select string_agg(competencia || ' ' || vencimento || ' ' || total_centavos, ',') from faturas, c where escritorio_id = ribeiro),
  '2027-01-01 2027-01-10 49900', 'CO-09: a primeira fatura é a de janeiro, vence em 10/01 e sai na hora');
select is((select (dados ->> 'em') from fatura_eventos, c where escritorio_id = ribeiro and acao = 'cobranca.comecou'), '2026-12-04',
  'cobranca.comecou com o dia do começo');
select is((select count(*)::int || ' ' || bool_or(interno) || ' ' || max(dados ->> 'origem') || ' ' || max(dados ->> 'inicio_cobranca')
             from historico, c where escritorio_id = ribeiro and acao = 'teste.cobranca_comecou'),
  '1 false FIM_DO_TESTE 2026-12-04', 'CO-09: teste.cobranca_comecou vai ao histórico do escritório');
select is((select (cobranca_rotina() ->> 'testesComecados')::int), 0, 'a rotina seguinte não começa de novo');
select is((select pg_temp.nfat(ribeiro) from c), 1, 'nem repete a fatura');
select is((select pg_temp.nfat(ipe) from c), 0, 'CO-09: a Ipê, sem confirmação, não tem fatura');

-- O teste acabado e confirmado depois: a cobrança começa no dia da confirmação, e a escrita volta.
select pg_temp.relogio('2026-12-05 15:00-03');
select is((select pg_temp.motivo(pg_temp.confirmar(adm, ipe, 'REUNIAO_OU_LIGACAO', 'Reunião com Ana Lúcia em 05/12')) from ids, c), 'ok',
  'CO-09: a Administração confirma a assinatura do teste que acabou');
select is((select (a.inicio_cobranca, a.primeira_competencia)::text from c, pg_temp.a(ipe) a), '(2026-12-05,2027-01-01)',
  'CO-09: confirmada depois do fim, a cobrança começa no dia da confirmação, com a mensalidade de janeiro');
select is((select pg_temp.nfat(ipe) from c), 1, 'e a primeira fatura sai na hora');
select is((select pg_temp.cadastrar(ana, ipe) from ids, c), 'ok', 'CO-09: assinada, a Ipê volta a gravar');

-- ---------------------------------------------------------------------------------------
-- O dispensado paga desde a confirmação; a situação continua DISPENSADO.
select pg_temp.relogio('2026-12-02 11:00-03');
select pg_temp.preparar(buriti) from c;
select is((select pg_temp.nfat(buriti) from c), 0, 'CO-09: dispensado e só preparado, nenhuma fatura');
select is((select pg_temp.motivo(pg_temp.confirmar(fin, buriti, 'REUNIAO_OU_LIGACAO', 'Em reunião com Lucas Buriti')) from ids, c), 'ok',
  'CO-09: o Financeiro confirma a assinatura do piloto dispensado');
select is((select (a.inicio_cobranca, a.primeira_competencia)::text from c, pg_temp.a(buriti) a), '(2026-12-02,2027-01-01)',
  'CO-09: dispensado, a cobrança começa no dia da confirmação, e a primeira mensalidade é a do mês seguinte');
select is((select pg_temp.nfat(buriti) from c), 1, 'e a primeira fatura sai na hora');
select is((select teste_situacao(buriti) from c), 'DISPENSADO', 'a situação continua DISPENSADO (desenho, tg-dispensado)');
select is((select max(dados ->> 'origem') from historico, c where escritorio_id = buriti and acao = 'teste.cobranca_comecou'), 'DISPENSADO',
  'teste.cobranca_comecou diz que foi pela dispensa');

-- O previsto e o repetido não se confirmam.
select pg_temp.preparar(jatoba) from c;
select is((select pg_temp.motivo(pg_temp.confirmar(fin, jatoba)) from ids, c), 'TESTE_SEM_PRIMEIRO_ACESSO',
  'CO-09: o teste previsto (ninguém entrou) não se confirma');
select pg_temp.entrar(henrique, angico) from ids, c;
select pg_temp.entrar(henrique, inga) from ids, c;
select pg_temp.preparar(inga) from c;
select is((select teste_situacao(inga) from c), 'REPETIDO', 'a Ingá tem o teste repetido');
select is((select pg_temp.motivo(pg_temp.confirmar(adm, inga)) from ids, c), 'TESTE_REPETIDO',
  'CO-09: o repetido espera a Administração liberar ou dispensar antes da confirmação');

-- ---------------------------------------------------------------------------------------
-- A rotina parada no dia seguinte ao fim, e o carnê com o desconto de entrada (CO-10).
select pg_temp.relogio('2026-12-24 10:00-03');
select pg_temp.entrar(sara, sucupira) from ids, c;
select is((select (t.inicio, t.fim)::text from c, pg_temp.t(sucupira) t), '(2026-12-24,2026-12-30)', 'o teste da Sucupira vai até 30/12');
select pg_temp.relogio('2026-12-26 10:00-03');
select is((select pg_temp.motivo(pg_temp.confirmar(adm, sucupira, 'WHATSAPP', 'Sara mandou o ok pelo WhatsApp')) from ids, c), 'ok',
  'a Administração confirma a assinatura da Sucupira no teste');
select is((select pg_temp.nfat(sucupira) + (select count(*)::int from assinatura_carnes, c where escritorio_id = sucupira) from c), 0,
  'CO-09: no teste, nem fatura nem carnê');
select pg_temp.relogio('2026-12-30 08:00-03');
select is((select (cobranca_rotina() ->> 'testesComecados')::int), 0, 'no último dia, a rotina não começa');
-- Nenhuma rotina em 31/12: a de 01/01 começa a cobrança com o dia certo.
select pg_temp.relogio('2027-01-01 08:00-03');
select is((select (cobranca_rotina() ->> 'testesComecados')::int), 1, 'a rotina de 01/01 começa a cobrança da Sucupira');
select is((select (a.inicio_cobranca, a.primeira_competencia)::text from c, pg_temp.a(sucupira) a), '(2026-12-31,2027-01-01)',
  'CO-09: com a rotina parada em 31/12, o começo continua em fim + 1 e a primeira mensalidade é janeiro (não fevereiro)');
select is((select (a.desconto_ate)::text from c, pg_temp.a(sucupira) a), '2027-03-01',
  'CO-10: o desconto anda com a primeira competência quando a cobrança começa pela rotina (3 faturas: janeiro a março)');
select is((select array_agg(p.valor_centavos order by p.numero) from assinatura_carne_parcelas p join assinatura_carnes k on k.id = p.carne_id, c
            where k.escritorio_id = sucupira and k.substituido_em is null),
  array[39920, 39920, 39920, 49900, 49900, 49900, 49900, 49900, 49900, 49900, 49900, 49900],
  'CO-10: o carnê tem o desconto só nas 3 primeiras parcelas (sem CARNE_COM_DESCONTO)');
select is((select string_agg(competencia || ' ' || total_centavos, ',') from faturas, c where escritorio_id = sucupira), '2027-01-01 39920',
  'a fatura de janeiro é a parcela 1, com o desconto');

-- ---------------------------------------------------------------------------------------
-- Sem teste: a regra antiga, intacta, e a recusa.
select pg_temp.preparar(cedro), pg_temp.preparar(antigo) from c;
select is((select pg_temp.confirmar(fin, cedro) -> 'detalhe' ->> 'motivo' from ids, c), 'SEM_TESTE_GRATIS',
  'CO-09: cadastrado com a chave desligada, a confirmação dá SEM_TESTE_GRATIS');
select is((select pg_temp.confirmar(fin, antigo) -> 'detalhe' ->> 'motivo' from ids, c), 'SEM_TESTE_GRATIS',
  'CO-09: o escritório de antes (sem linha) também dá SEM_TESTE_GRATIS');
select is((select pg_temp.nfat(cedro) + pg_temp.nfat(antigo) from c), 0, 'sem teste e em implantação, nenhuma fatura (regra antiga)');
select console_mudar_estagio(adm, cedro, pg_temp.vcli(cedro), 'ATIVO', 'Implantação concluída'),
       console_mudar_estagio(adm, antigo, pg_temp.vcli(antigo), 'ATIVO', 'Implantação concluída') from ids, c;
select is((select string_agg((a.inicio_cobranca, a.primeira_competencia)::text, ' ' order by a.inicio_cobranca) from c, assinaturas a
            where a.escritorio_id in (cedro, antigo)), '(2027-01-01,2027-02-01) (2027-01-01,2027-02-01)',
  'CO-09: sem teste, a cobrança começa ao passar para Ativo, como antes');
select is((select pg_temp.nfat(cedro) || ' ' || pg_temp.nfat(antigo) from c), '1 1', 'e a primeira fatura sai na hora');
select is((select count(*)::int from historico, c where escritorio_id in (cedro, antigo) and acao = 'teste.cobranca_comecou'), 0,
  'sem teste, nada do teste no histórico');
select is((select (a.assinada_em, teste_situacao(cedro))::text from c, pg_temp.a(cedro) a), '(,SEM_TESTE)', 'e nada de confirmação');
select is((select pg_temp.cadastrar(lia, cedro) || ' ' || pg_temp.cadastrar(rui, antigo) from ids, c), 'ok ok',
  'CO-09: com a chave desligada, as sócias gravam sem prazo');

-- Os que esperam a decisão continuam sem cobrança, muito depois.
select is((select pg_temp.nfat(jatoba) + pg_temp.nfat(inga) from c), 0, 'o previsto e o repetido não têm fatura');

-- Isolamento: a confirmação é por escritório.
select is((select pg_temp.motivo(pg_temp.confirmar(impl, ipe)) from ids, c), 'TC401',
  'PT-01: quem não é do escritório nem tem a ação não confirma');

select is((select count(*)::int from funcao_acoes where acao = 'console.assinatura.confirmar'), 2,
  'a ação console.assinatura.confirmar é da Administração e do Financeiro');
select is((select array_agg(funcao::text order by funcao) from funcao_acoes where acao = 'console.assinatura.confirmar'),
  array['ADMINISTRACAO', 'FINANCEIRO'], 'só essas duas');
select ok((select not prosecdef from pg_proc where proname = 'cobranca_rotina_sem_teste'),
  'a rotina de antes perde o security definer: a API não pula o passo do teste');

select * from finish();
rollback;
