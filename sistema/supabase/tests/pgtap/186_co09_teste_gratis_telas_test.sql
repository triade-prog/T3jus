-- O teste grátis de 7 dias, o servidor das telas (F1.33; CO-09, DC12, migration 1162): o bloco do
-- Console (dia N de N, quem fez o primeiro acesso, prorrogações com o fim de antes e o motivo, o
-- teste anterior do repetido, o pedido do Portal, a cobrança prevista, os avisos previstos e as
-- ações por papel e situação); a carteira com a situação do teste; o bloco do Portal (a data
-- sempre, "faltam N dias" só a partir do dia 5, o pedido e a primeira fatura só para o sócio, o
-- repetido sem o motivo); e "Quero assinar": só o sócio, no teste ou depois do fim enquanto não
-- assinado, uma vez só (repetir devolve o mesmo pedido), no histórico interno, sem mudar a trava.
begin;
select plan(73);

create function pg_temp.relogio(p text) returns timestamptz language sql as $$ select ajustar_relogio(p::timestamptz - now()) $$;
select pg_temp.relogio('2026-11-20 09:00-03');

create temp table ids as select
  teste.equipe('Carol Andrade', 'ADMINISTRACAO') as adm,
  teste.equipe('Marta Quintela', 'FINANCEIRO') as fin,
  teste.equipe('Rafael Teles', 'IMPLANTACAO') as impl,
  teste.equipe('Bruno Saraiva', 'SUPORTE') as sup,
  teste.pessoa('Marina Ribeiro') as marina,
  teste.pessoa('Larissa Matos') as lara,
  teste.pessoa('Ana Lúcia Prado') as ana,
  teste.pessoa('Lucas Buriti') as lucas,
  teste.pessoa('Henrique Moura') as henrique,
  teste.pessoa('Joana Jatobá') as joana,
  teste.pessoa('Lia Cedro') as lia,
  teste.pessoa('Rui Antigo') as rui;

-- Com a chave desligada: a Cedro & Lima (com_teste = false) e a Aroeira, "de antes" (sem linha).
create temp table c (cedro uuid, antigo uuid, ribeiro uuid, ipe uuid, buriti uuid, inga uuid, angico uuid, jatoba uuid);
insert into c (cedro, antigo) select console_criar_escritorio(adm, 'Cedro & Lima Advocacia', 'Recife', 'PE'),
  console_criar_escritorio(adm, 'Aroeira Advocacia', 'Salvador', 'BA') from ids;
select limpar_contexto();
delete from testes_gratis where escritorio_id = (select antigo from c);
update configuracoes set valor = 'true' where chave = 'teste_gratis_ligado';
update c set ribeiro = console_criar_escritorio(adm, 'Ribeiro & Matos Advocacia', 'São Paulo', 'SP'),
             ipe = console_criar_escritorio(adm, 'Ipê Advocacia', 'Brasília', 'DF'),
             buriti = console_criar_escritorio(adm, 'Buriti Advocacia', 'Fortaleza', 'CE'),
             inga = console_criar_escritorio(adm, 'Ingá Advocacia', 'Salvador', 'BA'),
             angico = console_criar_escritorio(adm, 'Angico Advocacia Trabalhista', 'Aracaju', 'SE'),
             jatoba = console_criar_escritorio(adm, 'Jatobá Advogados Associados', 'Ilhéus', 'BA') from ids;
update configuracoes set valor = 'false' where chave = 'teste_gratis_ligado';
insert into vinculos (pessoa_id, escritorio_id, funcao, criado_por)
            select marina, ribeiro, 'SOCIO', adm from ids, c union all select lara, ribeiro, 'EQUIPE', adm from ids, c
  union all select ana, ipe, 'SOCIO', adm from ids, c union all select lucas, buriti, 'SOCIO', adm from ids, c
  union all select henrique, angico, 'SOCIO', adm from ids, c union all select henrique, inga, 'SOCIO', adm from ids, c
  union all select joana, jatoba, 'SOCIO', adm from ids, c union all select lia, cedro, 'SOCIO', adm from ids, c
  union all select rui, antigo, 'SOCIO', adm from ids, c
  union all select impl, ribeiro, 'IMPLANTACAO', adm from ids, c union all select sup, ribeiro, 'SUPORTE', adm from ids, c
  union all select fin, e, 'FINANCEIRO', adm from ids, c, unnest(array[cedro, antigo, ribeiro, ipe, buriti, inga, angico, jatoba]) e;
update pessoas set senha_criada_em = now() where id in (select unnest(array[marina, lara, ana, lucas, henrique, joana, lia, rui]) from ids);

create temp table pl as select (console_plano_salvar(adm, null, null, '{"nome":"Escritório","precoCentavos":49000,"pessoasIncluidas":8}') ->> 'id')::uuid as id from ids;

create function pg_temp.t(p_esc uuid) returns testes_gratis language sql as $$ select * from testes_gratis where escritorio_id = p_esc $$;
create function pg_temp.ver(p_esc uuid) returns integer language sql as $$ select versao from assinaturas where escritorio_id = p_esc $$;
create function pg_temp.entrar(p_pessoa uuid, p_esc uuid) returns void language sql as $$
  select escolher_escritorio(p_pessoa, gen_random_uuid(), p_esc) $$;
create function pg_temp.preparar(p_esc uuid) returns jsonb language sql as $$
  select console_assinatura_salvar((select fin from ids), p_esc, null, jsonb_build_object('planoId', (select id from pl), 'diaVencimento', 10,
    'forma', 'PIX', 'emailCobranca', 'financeiro@exemplo.com.br')) $$;
create function pg_temp.motivo(p jsonb) returns text language sql as $$ select coalesce(p -> 'detalhe' ->> 'motivo', p ->> 'codigo', 'ok') $$;
create function pg_temp.quero(p_pessoa uuid, p_esc uuid, p_recado text default null) returns jsonb language sql as $$
  select teste.erro(format('select portal_quero_assinar(%L, %L, %L)', p_pessoa, p_esc, jsonb_build_object('recado', p_recado))) $$;
create function pg_temp.pt(p_pessoa uuid, p_esc uuid) returns jsonb language sql as $$ select portal_teste(p_pessoa, p_esc) $$;
create function pg_temp.ct(p_pessoa uuid, p_esc uuid) returns jsonb language sql as $$ select console_teste(p_pessoa, p_esc) $$;
create temp sequence tel_186;
create function pg_temp.cadastrar(p_pessoa uuid, p_esc uuid) returns text language sql as $$
  select pg_temp.motivo(teste.erro(format('select portal_cliente_cadastrar(%L, %L, %L)', p_pessoa, p_esc,
    jsonb_build_object('tipo', 'PF', 'nome', 'Helena Prado ' || n, 'origem', 'SITE',
      'contatos', jsonb_build_array(jsonb_build_object('nome', 'Helena', 'telefone', '+55719888' || lpad(n::text, 5, '0'), 'principal', true))))))
  from (select nextval('tel_186') n) x $$;

-- ---------------------------------------------------------------------------------------
-- O primeiro acesso: a Angico em 20/11 (o teste anterior de Henrique), a Ribeiro e a Ipê em 27/11,
-- a Ingá (repetido) em 01/12. A Buriti é piloto: o teste foi dispensado antes.
select pg_temp.entrar(henrique, angico) from ids, c;
select console_teste_dispensar(adm, buriti, (pg_temp.t(buriti)).versao, 'Escritório piloto: o combinado de fundador está no desconto') from ids, c;
select pg_temp.relogio('2026-11-27 23:40-03');
select pg_temp.entrar(marina, ribeiro), pg_temp.entrar(ana, ipe), pg_temp.entrar(lia, cedro) from ids, c;
select pg_temp.relogio('2026-11-27 23:45-03');
select pg_temp.entrar(lara, ribeiro) from ids, c;

select is((select (pg_temp.t(ribeiro)).primeiro_acesso_por = marina from ids, c), true,
  'CO-09: o primeiro acesso guarda quem entrou (a sócia), e a entrada da equipe depois não troca');
select is((select (pg_temp.t(cedro)).primeiro_acesso_por = lia from ids, c), true, 'também sem teste (a CO-08 conta dali)');
select is((select (pg_temp.t(jatoba)).primeiro_acesso_por from c), null, 'quem ainda não entrou não tem pessoa');

-- O Portal no dia 1: a data, o dia 1 de 7 e nada de "faltam".
select is((select pg_temp.pt(marina, ribeiro) ->> 'situacao' || ' ' || (pg_temp.pt(marina, ribeiro) ->> 'diaAtual') || ' de '
                  || (pg_temp.pt(marina, ribeiro) ->> 'totalDias') || ' até ' || (pg_temp.pt(marina, ribeiro) ->> 'fim') from ids, c),
  'EM_TESTE 1 de 7 até 2026-12-03', 'CO-09: no Portal, o teste vai até 03/12, dia 1 de 7');
select is((select pg_temp.pt(marina, ribeiro) -> 'faltamDias' from ids, c), 'null'::jsonb, 'CO-09: no dia 1, sem "faltam N dias" (decisão 2)');
select is((select (pg_temp.pt(marina, ribeiro) ->> 'souSocio') || ' ' || (pg_temp.pt(marina, ribeiro) ->> 'podePedir')
                  || ' ' || coalesce(pg_temp.pt(marina, ribeiro) ->> 'pedido', '-') from ids, c), 'true true -',
  'CO-09: a sócia pode pedir para assinar, e ainda não pediu');
select is((select pg_temp.pt(marina, ribeiro) -> 'cobranca' ->> 'comecaEm' || ' ' || (pg_temp.pt(marina, ribeiro) -> 'cobranca' ->> 'primeiraCompetencia')
                  || ' ' || coalesce(pg_temp.pt(marina, ribeiro) -> 'cobranca' ->> 'primeiroVencimento', '-') from ids, c),
  '2026-12-04 2027-01-01 -', 'CO-09: se assinar, a cobrança começa em 04/12 e a primeira fatura é a de janeiro (sem assinatura preparada, sem vencimento)');
select is((select (pg_temp.pt(lara, ribeiro) ->> 'souSocio') || ' ' || (pg_temp.pt(lara, ribeiro) ->> 'podePedir') || ' '
                  || coalesce(pg_temp.pt(lara, ribeiro) ->> 'cobranca', '-') || ' ' || (pg_temp.pt(lara, ribeiro) ->> 'socioDono') from ids, c),
  'false false - Marina Ribeiro', 'CO-09: a equipe do escritório vê a data e o nome da sócia dona, sem o botão nem a cobrança');
select is((select pg_temp.motivo(pg_temp.quero(lara, ribeiro)) from ids, c), 'TC401', 'CO-09: só o sócio pede para assinar');
select is((select pg_temp.motivo(pg_temp.quero(fin, ribeiro)) from ids, c), 'TC401', 'a equipe T3jus não pede pelo escritório');
select is((select pg_temp.motivo(teste.erro(format('select portal_teste(%L, %L)', marina, ipe))) from ids, c), 'TC401',
  'PT-01: o bloco do Portal só do escritório da pessoa');
select is((select pg_temp.pt(lia, cedro) from ids, c), null, 'o escritório sem teste não tem bloco no Portal');
select is((select pg_temp.pt(lucas, buriti) from ids, c), null, 'nem o dispensado');

-- Dia 4 e dia 5: "faltam 3 dias, contando hoje" só no dia 5.
select pg_temp.relogio('2026-11-30 10:00-03');
select is((select pg_temp.pt(marina, ribeiro) -> 'faltamDias' from ids, c), 'null'::jsonb, 'CO-09: no dia 4, ainda sem "faltam"');
select pg_temp.relogio('2026-12-01 08:00-03');
select is((select (pg_temp.pt(marina, ribeiro) ->> 'diaAtual') || ' ' || (pg_temp.pt(marina, ribeiro) ->> 'faltamDias') from ids, c), '5 3',
  'CO-09: no dia 5, faltam 3 dias contando hoje');

-- A Ingá: Henrique já teve teste na Angico. O Portal não diz o motivo.
select pg_temp.relogio('2026-12-01 10:15-03');
select pg_temp.entrar(henrique, inga) from ids, c;
select is((select teste_situacao(inga) from c), 'REPETIDO', 'a Ingá fica com o teste repetido');
select is((select pg_temp.pt(henrique, inga) ->> 'situacao' from ids, c), 'AGUARDANDO_LIBERACAO',
  'CO-09: no Portal, o repetido é "a equipe está liberando o seu acesso" (decisão 7)');
select is((select pg_temp.pt(henrique, inga) ?| array['fim', 'inicio', 'testeAnterior', 'repetidoEm'] from ids, c), false,
  'o Portal não recebe nada do teste anterior');
select is((select pg_temp.motivo(pg_temp.quero(henrique, inga)) from ids, c), 'QUERO_ASSINAR_FORA_DO_TESTE',
  'CO-09: o repetido não pede para assinar antes da decisão');
select is((select pg_temp.ct(adm, inga) -> 'testeAnterior' ->> 'nome' || ' ' || (pg_temp.ct(adm, inga) -> 'testeAnterior' ->> 'inicio')
                  || ' ' || (pg_temp.ct(adm, inga) -> 'testeAnterior' ->> 'fim') from ids, c),
  'Angico Advocacia Trabalhista 2026-11-20 2026-11-26', 'CO-09: o Console mostra o teste anterior de quem repetiu');
select is((select (pg_temp.ct(adm, inga) -> 'acoes' ->> 'liberar') || ' ' || (pg_temp.ct(adm, inga) -> 'acoes' ->> 'dispensar')
                  || ' ' || (pg_temp.ct(adm, inga) -> 'acoes' ->> 'prorrogar') || ' ' || (pg_temp.ct(adm, inga) -> 'primeiroAcesso' ->> 'por') from ids, c),
  'true true false Henrique Moura', 'a Administração libera ou dispensa o repetido; o primeiro acesso diz quem entrou');

-- "Quero assinar" no dia 5, às 16h20.
select pg_temp.relogio('2026-12-01 16:20-03');
select is((select pg_temp.quero(marina, ribeiro, repeat('x', 301)) -> 'detalhe' -> 'campos' from ids, c), '["recado"]'::jsonb,
  'CO-09: o recado vai até 300 letras, preso ao campo');
select is((select (pg_temp.t(ribeiro)).quer_assinar_em from c), null, 'a recusa não grava nada');
select is((select (portal_quero_assinar(marina, ribeiro, '{"recado":"  Prefiro falar depois das 18h  "}') ->> 'novo') from ids, c), 'true',
  'CO-09: a sócia pede para assinar');
select is((select (t.quer_assinar_por = marina) || ' ' || t.quer_assinar_recado || ' ' || (t.quer_assinar_em = '2026-12-01 16:20-03'::timestamptz)
             from ids, c, pg_temp.t(ribeiro) t), 'true Prefiro falar depois das 18h true', 'o pedido guarda quando, quem e o recado');
select pg_temp.relogio('2026-12-01 17:00-03');
select is((select portal_quero_assinar(marina, ribeiro, '{"recado":"outro recado"}') -> 'teste' -> 'pedido' ->> 'em' from ids, c)::timestamptz,
  '2026-12-01 16:20-03'::timestamptz, 'CO-09: apertar de novo devolve o mesmo pedido (idempotente)');
select is((select (portal_quero_assinar(marina, ribeiro, '{}') ->> 'novo') || ' ' || t.quer_assinar_recado from ids, c, pg_temp.t(ribeiro) t),
  'false Prefiro falar depois das 18h', 'e não troca o recado');
select is((select count(*)::int || ' ' || bool_and(interno) || ' ' || bool_and(autor_id = marina) || ' ' || max(dados ->> 'com_recado')
             from historico, ids, c where escritorio_id = ribeiro and acao = 'teste.quer_assinar'),
  '1 true true true', 'CO-09: o pedido vai ao histórico interno uma vez, com a sócia como autora');
select is((select count(*)::int from historico, c where escritorio_id = ribeiro and acao = 'teste.quer_assinar' and dados::text like '%18h%'), 0,
  'o recado não vai ao histórico');
select is((select pg_temp.pt(marina, ribeiro) -> 'pedido' ->> 'por' || ' ' || (pg_temp.pt(marina, ribeiro) ->> 'podePedir') from ids, c),
  'Marina Ribeiro false', 'CO-09: o Portal mostra o pedido enviado e tira o botão');
select is((select pg_temp.pt(lara, ribeiro) -> 'pedido' from ids, c), 'null'::jsonb, 'a equipe do escritório não vê o pedido');
select is((select teste_situacao(ribeiro) from c), 'EM_TESTE', 'CO-09: pedir não assina (a situação não muda)');
select is((select (a.id is null) from c left join assinaturas a on a.escritorio_id = c.ribeiro), true, 'nem prepara a assinatura');

-- O bloco do Console no dia 6 (02/12, 9h40).
select pg_temp.relogio('2026-12-02 09:40-03');
select is((select pg_temp.ct(adm, ribeiro) -> 'pedido' ->> 'por' || ' · ' || (pg_temp.ct(adm, ribeiro) -> 'pedido' ->> 'recado') from ids, c),
  'Marina Ribeiro · Prefiro falar depois das 18h', 'CO-09: o Console vê quem pediu no Portal e o recado');
select is((select (pg_temp.ct(adm, ribeiro) ->> 'diaAtual') || ' de ' || (pg_temp.ct(adm, ribeiro) ->> 'totalDias') || ', faltam '
                  || (pg_temp.ct(adm, ribeiro) ->> 'faltamDias') || ', só consulta em ' || (pg_temp.ct(adm, ribeiro) ->> 'soConsultaDesde') from ids, c),
  '6 de 7, faltam 2, só consulta em 2026-12-04', 'CO-09: o quadro do teste: dia 6 de 7, faltam 2 dias, só consulta a partir de 04/12');
select is((select pg_temp.ct(adm, ribeiro) -> 'primeiroAcesso' ->> 'por' || ' ' || (pg_temp.ct(adm, ribeiro) -> 'socioDono' ->> 'nome') from ids, c),
  'Marina Ribeiro Marina Ribeiro', 'o primeiro acesso e a sócia dona');
select is((select jsonb_path_query_array(pg_temp.ct(adm, ribeiro) -> 'avisosPrevistos', '$[*].dia') from ids, c),
  '["2026-11-27", "2026-12-01", "2026-12-03", "2026-12-04"]'::jsonb, 'os avisos previstos: dia 1, dia 5, dia 7 e dia 8');
select is((select pg_temp.ct(adm, ribeiro) -> 'acoes' from ids, c),
  '{"liberar": false, "confirmar": false, "dispensar": true, "prorrogar": true}'::jsonb,
  'CO-09: a Administração prorroga e dispensa; sem assinatura preparada, não há o que confirmar');
select pg_temp.preparar(ribeiro) from c;
select is((select pg_temp.ct(fin, ribeiro) -> 'acoes' from ids, c),
  '{"liberar": false, "confirmar": true, "dispensar": false, "prorrogar": false}'::jsonb, 'CO-09: o Financeiro só confirma a assinatura');
select is((select pg_temp.ct(impl, ribeiro) -> 'acoes' from ids, c),
  '{"liberar": false, "confirmar": false, "dispensar": false, "prorrogar": false}'::jsonb, 'CO-09: a Implantação só vê');
select is((select pg_temp.ct(sup, ribeiro) -> 'pedido' ->> 'por' from ids, c), 'Marina Ribeiro', 'o Suporte vê o bloco');
select is((select pg_temp.ct(adm, ribeiro) -> 'cobranca' ->> 'primeiroVencimento' || ' ' || (pg_temp.ct(adm, ribeiro) -> 'cobranca' ->> 'confirmada') from ids, c),
  '2027-01-10 false', 'CO-09: com a assinatura preparada, a primeira fatura vence em 10/01/2027');
select is((select pg_temp.motivo(teste.erro(format('select console_teste(%L, %L)', marina, ribeiro))) from ids, c), 'TC401',
  'a sócia não lê o bloco do Console');
select is((select pg_temp.motivo(teste.erro(format('select console_teste(%L, %L)', impl, ipe))) from ids, c), 'TC401',
  'PT-24: a Implantação só vê os escritórios atribuídos');

-- Prorrogar a Ribeiro até 04/12.
select console_teste_prorrogar(adm, ribeiro, (pg_temp.t(ribeiro)).versao, '2026-12-04', 'A sócia ficou sem internet na primeira semana') from ids, c;
select is((select (pg_temp.ct(adm, ribeiro) ->> 'prorrogado') || ' ' || (pg_temp.ct(adm, ribeiro) ->> 'fimOriginal') || ' ' || (pg_temp.ct(adm, ribeiro) ->> 'totalDias') from ids, c),
  'true 2026-12-03 8', 'CO-09: prorrogado, com o fim de antes e o total de dias');
select is((select x ->> 'fimAntes' || ' → ' || (x ->> 'fimNovo') || ' por ' || (x ->> 'por') || ': ' || (x ->> 'motivo')
             from ids, c, jsonb_array_elements(pg_temp.ct(adm, ribeiro) -> 'prorrogacoes') x),
  '2026-12-03 → 2026-12-04 por Carol Andrade: A sócia ficou sem internet na primeira semana', 'CO-09: a prorrogação, com quem, o antes, o depois e o motivo');
select is((select pg_temp.ct(adm, ribeiro) -> 'cobranca' ->> 'comecaEm' from ids, c), '2026-12-05', 'e a cobrança passa a começar em 05/12');
select is((select pg_temp.pt(marina, ribeiro) ->> 'fim' from ids, c), '2026-12-04', 'o Portal vê a data nova');
select is((select pg_temp.pt(marina, ribeiro) ? 'prorrogacoes' from ids, c), false, 'e não vê o motivo da prorrogação');

-- Confirmar a assinatura (pelo pedido do Portal): assinado no teste.
select console_assinatura_confirmar(fin, ribeiro, pg_temp.ver(ribeiro), '{"como":"PORTAL","detalhe":"Marina confirmou por telefone o plano, o Pix e o e-mail"}') from ids, c;
select is((select pg_temp.ct(adm, ribeiro) ->> 'situacao' || ' ' || (pg_temp.ct(adm, ribeiro) -> 'acoes' ->> 'confirmar')
                  || ' ' || (pg_temp.ct(adm, ribeiro) -> 'cobranca' ->> 'confirmada') from ids, c), 'ASSINADO false true',
  'CO-09: assinado, não há o que confirmar de novo');
select is((select jsonb_path_query_array(pg_temp.ct(adm, ribeiro) -> 'avisosPrevistos', '$[*].sai') from ids, c),
  '[true, true, false, false]'::jsonb, 'com a assinatura confirmada, os avisos do último dia e do fim não saem');
select is((select pg_temp.pt(marina, ribeiro) ->> 'situacao' || ' ' || (pg_temp.pt(marina, ribeiro) ->> 'podePedir') || ' '
                  || (pg_temp.pt(marina, ribeiro) ->> 'assinadaEm' is not null) from ids, c), 'ASSINADO false true',
  'CO-09: o Portal vê a assinatura confirmada');
select is((select pg_temp.motivo(pg_temp.quero(marina, ribeiro)) from ids, c), 'JA_ASSINADO', 'CO-09: assinado, não pede de novo');

-- A Ipê no dia 8 (04/12): só consulta, e a sócia ainda pede para assinar.
select pg_temp.relogio('2026-12-04 09:00-03');
select is((select teste_situacao(ipe) from c), 'ACABOU', 'a Ipê acabou sem assinar');
select is((select pg_temp.pt(ana, ipe) ->> 'situacao' || ' ' || coalesce(pg_temp.pt(ana, ipe) ->> 'diaAtual', '-') || ' '
                  || coalesce(pg_temp.pt(ana, ipe) ->> 'faltamDias', '-') || ' ' || (pg_temp.pt(ana, ipe) ->> 'soConsultaDesde')
                  || ' ' || (pg_temp.pt(ana, ipe) ->> 'podePedir') from ids, c),
  'ACABOU - - 2026-12-04 true', 'CO-09: no dia 8, o Portal diz desde quando é só consulta e ainda oferece "Quero assinar"');
select is((select pg_temp.pt(ana, ipe) -> 'cobranca' ->> 'comecaEm' from ids, c), '2026-12-04', 'acabado, se assinar a cobrança começa no dia');
select is((select pg_temp.ct(adm, ipe) ->> 'diasSoConsulta' from ids, c), '1', 'o Console conta os dias só de consulta');
select is((select pg_temp.motivo(pg_temp.quero(ana, ipe)) from ids, c), 'ok', 'CO-09: depois do fim, enquanto não assinado, a sócia pede');
select is((select (pg_temp.t(ipe)).quer_assinar_por = ana from ids, c), true, 'o pedido gravou com o Portal só para consulta');
select is((select pg_temp.cadastrar(ana, ipe) from ids, c), 'TESTE_ENCERRADO', 'CO-09: pedir não muda a trava do dia 8 (decisão 1)');
select is((select teste_situacao(ipe) from c), 'ACABOU', 'e continua acabado');

-- O dispensado, o sem teste e o previsto.
select is((select pg_temp.motivo(pg_temp.quero(lucas, buriti)) from ids, c), 'QUERO_ASSINAR_FORA_DO_TESTE', 'CO-09: o dispensado não pede pelo teste');
select is((select pg_temp.motivo(pg_temp.quero(lia, cedro)) from ids, c), 'SEM_TESTE_GRATIS', 'CO-09: o escritório sem teste não pede');
select is((select pg_temp.motivo(pg_temp.quero(rui, antigo)) from ids, c), 'SEM_TESTE_GRATIS', 'nem o de antes da 1160');
select pg_temp.preparar(buriti) from c;
select is((select pg_temp.ct(adm, buriti) -> 'acoes' ->> 'confirmar' || ' ' || (pg_temp.ct(adm, buriti) -> 'acoes' ->> 'dispensar')
                  || ' ' || (pg_temp.ct(adm, buriti) -> 'cobranca' ->> 'comecaEm') from ids, c), 'true false 2026-12-04',
  'CO-09: o dispensado confirma, e a cobrança começa no dia da confirmação');
select is((select pg_temp.ct(adm, cedro) ->> 'situacao' || ' ' || (pg_temp.ct(adm, cedro) -> 'acoes' = '{"liberar": false, "confirmar": false, "dispensar": false, "prorrogar": false}') from ids, c),
  'SEM_TESTE true', 'sem teste, nenhuma ação do teste');
select is((select pg_temp.ct(adm, antigo) from ids, c), null, 'o escritório de antes não tem bloco');
select is((select pg_temp.ct(adm, jatoba) ->> 'situacao' || ' ' || (pg_temp.ct(adm, jatoba) ->> 'seEntrarHojeVaiAte') || ' '
                  || (pg_temp.ct(adm, jatoba) -> 'acoes' ->> 'dispensar') || ' ' || (pg_temp.ct(adm, jatoba) -> 'acoes' ->> 'prorrogar')
                  || ' ' || jsonb_array_length(pg_temp.ct(adm, jatoba) -> 'avisosPrevistos') from ids, c),
  'PREVISTO 2026-12-10 true false 0', 'CO-09: o previsto diz até quando iria se o sócio entrasse hoje; só se dispensa');

-- A carteira.
select is((select jsonb_object_agg(x ->> 'escritorioId', x ->> 'situacao') from ids, c, jsonb_array_elements(console_carteira_teste(adm)) x
            where (x ->> 'escritorioId')::uuid in (ribeiro, ipe, buriti, inga, angico, jatoba, cedro, antigo)),
  (select jsonb_build_object(ribeiro, 'ASSINADO', ipe, 'ACABOU', buriti, 'DISPENSADO', inga, 'REPETIDO', angico, 'ACABOU', jatoba, 'PREVISTO') from c),
  'CO-09: a carteira traz a situação do teste de cada escritório; sem teste e de antes ficam de fora');
select is((select ((x ->> 'querAssinarEm')::timestamptz = '2026-12-04 09:00-03') || ' ' || (x ->> 'soConsultaDesde') || ' ' || (x ->> 'prorrogado')
             from ids, c, jsonb_array_elements(console_carteira_teste(adm)) x where (x ->> 'escritorioId')::uuid = ipe),
  'true 2026-12-04 false', 'na carteira, o pedido e o só consulta, para os filtros Quer assinar e Teste acabou');
select is((select (x ->> 'diaAtual') || ' de ' || (x ->> 'totalDias') || ' ' || (x ->> 'prorrogado')
             from ids, c, jsonb_array_elements(console_carteira_teste(adm)) x where (x ->> 'escritorioId')::uuid = ribeiro),
  '8 de 8 true', 'e o dia do teste, com a prorrogação');
select is((select jsonb_path_query_array(console_carteira_teste(impl), '$[*].escritorioId') from ids),
  (select jsonb_build_array(ribeiro) from c), 'PT-24: a Implantação só vê na carteira os escritórios atribuídos');
select is((select pg_temp.motivo(teste.erro(format('select console_carteira_teste(%L)', marina))) from ids), 'TC401',
  'a carteira do teste é só da equipe T3jus');

select * from finish();
rollback;
