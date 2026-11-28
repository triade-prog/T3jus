-- Implantação assistida, parte 4 (F1.45; CO-08, migration 1183): os treinos por pessoa (dia de hoje
-- ou antes, 15 a 480 minutos, a forma, os temas, quem participou com acesso ao Portal do escritório
-- e quem deu, da sessão); o treino não se edita e se desfaz uma vez, com motivo no histórico
-- interno; "X de Y treinadas", com a pessoa nova voltando a contar; quem chega depois da conclusão
-- também é treinado (DC14); quem acompanha (só quem atende o escritório com Implantação ou
-- Administração) e a passagem de quem sai da equipe; a situação calculada na leitura; as
-- permissões por função; o isolamento entre escritórios.
begin;
select plan(70);

create function pg_temp.relogio(p text) returns timestamptz language sql as $$ select ajustar_relogio(p::timestamptz - now()) $$;
select pg_temp.relogio('2026-12-01 10:00-03');

create temp table ids as select
  teste.equipe('Carol Andrade', 'ADMINISTRACAO') as adm,
  teste.equipe('Rafael Teles', 'IMPLANTACAO') as imp,
  teste.equipe('Nina Prado', 'IMPLANTACAO') as imp2,
  teste.equipe('Marta Quintela', 'FINANCEIRO') as fin,
  teste.equipe('Sérgio Lopes', 'SUPORTE') as sup,
  teste.equipe('Olga Bastos', 'ADMINISTRACAO', 'IMPLANTACAO') as adm2,
  teste.pessoa('Renata Lima') as lia,
  teste.pessoa('Juliana Prado') as juliana,
  teste.pessoa('Tiago Ramos') as tiago,
  teste.pessoa('Diego Alves') as diego,
  teste.pessoa('Bia Umbu') as bia;

create temp table c as select
  console_criar_escritorio(adm, 'Cedro & Lima Advocacia', 'Recife', 'PE') as cedro,
  console_criar_escritorio(adm, 'Umbu Advocacia', 'Petrolina', 'PE') as umbu,
  console_criar_escritorio(adm, 'Ipê Advocacia', 'Natal', 'RN') as ipe from ids;
select limpar_contexto();
insert into vinculos (pessoa_id, escritorio_id, funcao, criado_por)
            select lia, cedro, 'SOCIO', adm from ids, c
  union all select juliana, cedro, 'EQUIPE', adm from ids, c union all select tiago, cedro, 'EQUIPE', adm from ids, c
  union all select imp, cedro, 'IMPLANTACAO', adm from ids, c union all select imp2, umbu, 'IMPLANTACAO', adm from ids, c
  union all select fin, cedro, 'FINANCEIRO', adm from ids, c union all select sup, cedro, 'SUPORTE', adm from ids, c
  union all select adm2, cedro, 'ADMINISTRACAO', adm from ids, c
  union all select imp, umbu, 'IMPLANTACAO', adm from ids, c union all select imp, ipe, 'IMPLANTACAO', adm from ids, c
  union all select bia, umbu, 'SOCIO', adm from ids, c;
update pessoas set senha_criada_em = '2026-11-30 09:00-03' where id in (select unnest(array[lia, juliana, bia]) from ids);

create function pg_temp.entrar(p_pessoa uuid, p_esc uuid) returns void language sql as $$
  select escolher_escritorio(p_pessoa, gen_random_uuid(), p_esc); select limpar_contexto() $$;
create function pg_temp.motivo(p jsonb) returns text language sql as $$ select coalesce(p -> 'detalhe' ->> 'motivo', p ->> 'codigo', 'ok') $$;
create function pg_temp.aba(p_pessoa uuid, p_esc uuid) returns jsonb language sql as $$
  select console_implantacao(p_pessoa, p_esc) $$;
create function pg_temp.treino(p_pessoa uuid, p_esc uuid, p jsonb) returns jsonb language sql as $$
  select console_implantacao_treino(p_pessoa, p_esc, p) $$;
create function pg_temp.vi(p_esc uuid) returns integer language sql as $$
  select versao from implantacoes where escritorio_id = p_esc and estado = 'ABERTA' $$;
create function pg_temp.resp(p_esc uuid) returns uuid language sql as $$
  select responsavel_id from implantacoes where escritorio_id = p_esc order by numero desc limit 1 $$;

select pg_temp.entrar(lia, cedro), pg_temp.entrar(bia, umbu) from ids, c;

-- ---------------------------------------------------------------------------------------
-- A aba antes do primeiro treino: a situação calculada na leitura.
select is((select (a -> 'situacao' ->> 'total')::int || ' de ' || (a -> 'situacao' ->> 'treinadas')::int from ids, c, pg_temp.aba(imp, cedro) a),
  '3 de 0', 'CO-08: as 3 pessoas com acesso ao Portal, nenhuma treinada');
select is((select a -> 'situacao' -> 'socioEntrou' ->> 'dia' || '|' || (a -> 'situacao' -> 'socioEntrou' -> 'pessoa' ->> 'nome') from ids, c, pg_temp.aba(imp, cedro) a),
  '2026-12-01|Renata Lima', 'CO-08: o sócio entrou, no dia 1, com quem entrou');
select is((select array_agg(p ->> 'nome' || ':' || (p -> 'convite' ->> 'aceitou') order by o)
             from ids, c, pg_temp.aba(imp, cedro) a, jsonb_array_elements(a -> 'situacao' -> 'pessoas') with ordinality x(p, o)),
  array['Renata Lima:true', 'Juliana Prado:true', 'Tiago Ramos:false'], 'CO-08: o aceite do convite por pessoa, com o sócio primeiro');
select is((select (a -> 'situacao' -> 'importacao' ->> 'concluida') || '|' || (a -> 'situacao' -> 'whatsapp' ->> 'ligado') || '|' || (a -> 'situacao' ->> 'diasAtePrazo')
             from ids, c, pg_temp.aba(imp, cedro) a), 'false|false|30', 'CO-08: sem importação, sem WhatsApp, 30 dias até o prazo');
select is((select a -> 'implantacao' -> 'responsavel' from ids, c, pg_temp.aba(imp, cedro) a), 'null'::jsonb,
  'CO-08: a implantação nasce sem quem acompanha');

-- Importação concluída e WhatsApp ligado aparecem sozinhos.
alter table importacoes disable trigger guardiao_transicao;
insert into importacoes (escritorio_id, arquivo_nome, o_que, estado, criado_por, importado_em, desfazer_ate, origem)
select cedro, 'astrea.xlsx', 'CLIENTES', 'CONCLUIDA', lia, '2026-12-01 09:00-03', '2026-12-08 09:00-03', 'ASTREA' from ids, c;
alter table importacoes enable trigger guardiao_transicao;
insert into whatsapp_escritorio (escritorio_id, numero, situacao, ligado_em) select cedro, '+558133261180', 'LIGADO', '2026-12-01 09:30-03' from c;
select is((select (a -> 'situacao' -> 'importacao' ->> 'origem') || '|' || (a -> 'situacao' -> 'whatsapp' ->> 'ligado') from ids, c, pg_temp.aba(imp, cedro) a),
  'ASTREA|true', 'CO-08: a importação concluída e o WhatsApp ligado são calculados, sem marcar à mão');

-- ---------------------------------------------------------------------------------------
-- Registrar: os campos voltam juntos.
select is((teste.erro(format($$ select pg_temp.treino(%L, %L, %L) $$, imp, cedro,
            jsonb_build_object('dia', '2026-12-02', 'duracaoMin', 60, 'forma', 'VIDEO', 'pessoas', jsonb_build_array(lia))))) -> 'detalhe',
  '{"campos": ["dia"], "motivo": "TREINO_NO_FUTURO"}'::jsonb, 'CO-08: o treino de amanhã é recusado (TREINO_NO_FUTURO)') from ids, c;
select is((teste.erro(format($$ select pg_temp.treino(%L, %L, %L) $$, imp, cedro,
            jsonb_build_object('dia', '30/11/2026', 'duracaoMin', 5, 'forma', 'EMAIL', 'pessoas', '[]'::jsonb, 'temas', jsonb_build_array('NADA'))))) -> 'detalhe',
  '{"campos": ["dia", "duracaoMin", "forma", "pessoas", "temas"]}'::jsonb, 'CO-08: dia, duração, forma, pessoas e temas errados voltam juntos') from ids, c;
select is((teste.erro(format($$ select pg_temp.treino(%L, %L, %L) $$, imp, cedro,
            jsonb_build_object('dia', '2026-11-30', 'duracaoMin', 481, 'forma', 'VIDEO', 'pessoas', jsonb_build_array(lia))))) -> 'detalhe' -> 'campos',
  '["duracaoMin"]'::jsonb, 'CO-08: mais de 480 minutos é recusado') from ids, c;
select is((teste.erro(format($$ select pg_temp.treino(%L, %L, %L) $$, imp, cedro,
            jsonb_build_object('dia', '2026-11-30', 'duracaoMin', 60, 'forma', 'VIDEO', 'pessoas', jsonb_build_array(lia, bia))))) -> 'detalhe',
  jsonb_build_object('campos', jsonb_build_array('pessoas'), 'motivo', 'PESSOA_SEM_VINCULO', 'pessoasSemVinculo', jsonb_build_array(bia)),
  'CO-08: pessoa de outro escritório não participa (PESSOA_SEM_VINCULO)') from ids, c;
select is(pg_temp.motivo(teste.erro(format($$ select pg_temp.treino(%L, %L, %L) $$, imp, cedro,
            jsonb_build_object('dia', '2026-11-30', 'duracaoMin', 60, 'forma', 'VIDEO', 'pessoas', jsonb_build_array(imp))))),
  'PESSOA_SEM_VINCULO', 'CO-08: quem atende pela equipe T3jus não é pessoa do Portal do escritório') from ids, c;
select is((select count(*)::int from implantacao_treinos), 0, 'nada foi registrado com erro');

-- Registrar de verdade: quem deu vem da sessão, nunca do pedido.
create temp table t1 as select (pg_temp.treino(imp, cedro, jsonb_build_object('dia', '2026-11-30', 'duracaoMin', 90, 'forma', 'VIDEO',
  'pessoas', jsonb_build_array(lia, juliana, lia), 'temas', jsonb_build_array('JURIDICO', 'AGENDA', 'JURIDICO'),
  'dadoPor', adm, 'escritorioId', umbu)) -> 'treino' ->> 'id')::uuid as id from ids, c;
select is((select row(t.escritorio_id = c.cedro, t.dado_por = ids.imp, t.duracao_min, t.forma, t.temas)::text from implantacao_treinos t, t1, ids, c where t.id = t1.id),
  row(true, true, 90, 'VIDEO', array['AGENDA', 'JURIDICO'])::text, 'CO-08: o treino guarda o escritório da rota, quem deu (da sessão) e os temas sem repetir');
select is((select array_agg(p.nome order by p.nome) from implantacao_treino_pessoas tp join pessoas p on p.id = tp.pessoa_id, t1 where tp.treino_id = t1.id),
  array['Juliana Prado', 'Renata Lima'], 'CO-08: quem participou, sem repetir');
select is((select i.estado from implantacao_treinos t join implantacoes i on i.id = t.implantacao_id, t1 where t.id = t1.id), 'ABERTA',
  'o treino liga à implantação aberta');
select is((select (a -> 'situacao' ->> 'treinadas')::int || ' de ' || (a -> 'situacao' ->> 'total')::int from ids, c, pg_temp.aba(imp, cedro) a),
  '2 de 3', 'CO-08: X de Y treinadas');
select is((select a -> 'treinos' -> 0 -> 'dadoPor' ->> 'nome' from ids, c, pg_temp.aba(imp, cedro) a), 'Rafael Teles', 'a aba mostra quem deu o treino');
select is((select count(*)::int from historico h, t1 where h.acao = 'implantacao.treino_registrado' and h.entidade_id = t1.id::text and h.interno),
  1, 'o registro vai para o histórico interno');

-- O treino não se edita nem se apaga, e quem participou entra só junto com ele.
select is((teste.erro($$ update implantacao_treinos set duracao_min = 30 $$)) ->> 'codigo', 'TC010', 'CO-08: o treino não se edita');
select is((teste.erro($$ delete from implantacao_treinos $$)) ->> 'codigo', 'TC010', 'CO-08: o treino não se apaga');
select is((teste.erro(format($$ insert into implantacao_treino_pessoas (escritorio_id, treino_id, pessoa_id) values (%L, %L, %L) $$, cedro, t1.id, tiago)))
  ->> 'codigo', 'TC010', 'quem participou não entra depois do registro') from ids, c, t1;
select is((teste.erro($$ delete from implantacao_treino_pessoas $$)) ->> 'codigo', 'TC010', 'quem participou não sai');

-- ---------------------------------------------------------------------------------------
-- Desfazer: com motivo, uma vez; fica riscado, com nome e hora.
select is(pg_temp.motivo(teste.erro(format($$ select console_implantacao_treino_desfazer(%L, %L, %L, '  ') $$, imp, cedro, t1.id))),
  'MOTIVO_OBRIGATORIO', 'CO-08: desfazer pede o motivo') from ids, c, t1;
select is(pg_temp.motivo(teste.erro(format($$ select console_implantacao_treino_desfazer(%L, %L, %L, 'Engano') $$, imp, umbu, t1.id))),
  'TC404', 'CO-08: o treino de outro escritório não se desfaz pela rota do escritório B') from ids, c, t1;
select pg_temp.relogio('2026-12-01 11:15-03');
select console_implantacao_treino_desfazer(adm2, cedro, t1.id, 'Registrei por engano: a ligação caiu antes de começar.') from ids, c, t1;
select is((select (t.desfeito_por = ids.adm2)::text || '|' || t.desfeito_em::text from implantacao_treinos t, t1, ids where t.id = t1.id),
  'true|' || '2026-12-01 11:15:00-03'::timestamptz::text, 'CO-08: o desfeito guarda quem desfez (da sessão) e a hora');
select is((select a -> 'treinos' -> 0 -> 'desfeito' ->> 'motivo' || '|' || (a -> 'treinos' -> 0 -> 'desfeito' -> 'por' ->> 'nome')
             from ids, c, pg_temp.aba(imp, cedro) a),
  'Registrei por engano: a ligação caiu antes de começar.|Olga Bastos', 'CO-08: a aba mostra o desfeito com o motivo e quem desfez');
select is((select h.dados ->> 'motivo' from historico h, t1 where h.acao = 'implantacao.treino_desfeito' and h.entidade_id = t1.id::text and h.interno),
  'Registrei por engano: a ligação caiu antes de começar.', 'o motivo fica só no histórico interno (a tabela é exportada)');
select is((select count(*)::int from implantacao_treinos), 1, 'o registro desfeito continua na lista');
select is(pg_temp.motivo(teste.erro(format($$ select console_implantacao_treino_desfazer(%L, %L, %L, 'De novo') $$, imp, cedro, t1.id))),
  'TREINO_JA_DESFEITO', 'CO-08: desfaz uma vez só') from ids, c, t1;
select is((teste.erro(format($$ select console_implantacao_treino_desfazer(%L, %L, %L, 'De novo') $$, imp, cedro, t1.id))) ->> 'codigo',
  'TC409', 'como conflito') from ids, c, t1;
select is((select (a -> 'situacao' ->> 'treinadas')::int || ' de ' || (a -> 'situacao' ->> 'total')::int from ids, c, pg_temp.aba(imp, cedro) a),
  '0 de 3', 'CO-08: o desfeito não conta no treino de ninguém');
select is((teste.erro($$ update implantacao_treinos set desfeito_em = null $$)) ->> 'codigo', 'TC010', 'o desfazer não volta');

-- Um novo treino e uma pessoa nova: "X de Y" volta a contar.
select pg_temp.treino(imp, cedro, jsonb_build_object('dia', '2026-12-01', 'duracaoMin', 120, 'forma', 'PRESENCIAL',
  'pessoas', jsonb_build_array(lia, juliana, tiago), 'temas', jsonb_build_array('CLIENTES'))) from ids, c;
select is((select (a -> 'situacao' ->> 'treinadas')::int || ' de ' || (a -> 'situacao' ->> 'total')::int from ids, c, pg_temp.aba(imp, cedro) a),
  '3 de 3', 'CO-08: todas treinadas');
insert into vinculos (pessoa_id, escritorio_id, funcao, criado_por) select diego, cedro, 'EQUIPE', adm from ids, c;
select is((select (a -> 'situacao' ->> 'treinadas')::int || ' de ' || (a -> 'situacao' ->> 'total')::int from ids, c, pg_temp.aba(imp, cedro) a),
  '3 de 4', 'CO-08: a pessoa nova entra sozinha e volta a contar como sem treino');
update vinculos set revogado_em = app_now(), revogado_por = (select adm from ids)
 where pessoa_id = (select tiago from ids) and escritorio_id = (select cedro from c);
select is((select (a -> 'situacao' ->> 'treinadas')::int || ' de ' || (a -> 'situacao' ->> 'total')::int from ids, c, pg_temp.aba(imp, cedro) a),
  '2 de 3', 'quem saiu do escritório sai da conta, e o treino dele fica na lista');
select is(pg_temp.motivo(teste.erro(format($$ select pg_temp.treino(%L, %L, %L) $$, imp, cedro,
            jsonb_build_object('dia', '2026-12-01', 'duracaoMin', 30, 'forma', 'TELEFONE', 'pessoas', jsonb_build_array(tiago))))),
  'PESSOA_SEM_VINCULO', 'quem saiu do escritório não participa mais') from ids, c;

-- ---------------------------------------------------------------------------------------
-- Permissões por função.
select is((select row(a ->> 'podeEditar', a ->> 'valores', a -> 'implantacao' ? 'valorCentavos', a ->> 'acompanhantes')::text from ids, c, pg_temp.aba(fin, cedro) a),
  row('false', 'true', true, null::text)::text, 'CO-08: o Financeiro lê, com o valor, e não edita');
select is((select row(a ->> 'podeEditar', a -> 'implantacao' ? 'valorCentavos')::text from ids, c, pg_temp.aba(sup, cedro) a),
  row('false', false)::text, 'CO-08: o Suporte lê, sem o valor');
select is((select row(a ->> 'podeEditar', a ->> 'podeMudarPrazo', a -> 'implantacao' ? 'valorCentavos')::text from ids, c, pg_temp.aba(imp, cedro) a),
  row('true', 'false', false)::text, 'CO-08: a Implantação edita os treinos, sem o valor e sem mudar o prazo');
select is((select row(a ->> 'podeEditar', a ->> 'podeMudarPrazo', (a -> 'implantacao' ->> 'valorCentavos')::int)::text from ids, c, pg_temp.aba(adm, cedro) a),
  row('true', 'true', 149000)::text, 'a Administração edita e vê o valor');
select is((teste.erro(format($$ select pg_temp.treino(%L, %L, '{}') $$, fin, cedro))) ->> 'codigo', 'TC401',
  'CO-08: o Financeiro não registra treino') from ids, c;
select is((teste.erro(format($$ select console_implantacao_treino_desfazer(%L, %L, %L, 'x') $$, sup, cedro, t1.id))) ->> 'codigo', 'TC401',
  'CO-08: o Suporte não desfaz') from ids, c, t1;
select is((teste.erro(format($$ select pg_temp.aba(%L, %L) $$, imp2, cedro))) ->> 'codigo', 'TC401',
  'CO-08: quem não atende o escritório não vê a aba') from ids, c;
select is((teste.erro(format($$ select pg_temp.aba(%L, %L) $$, lia, cedro))) ->> 'codigo', 'TC401',
  'a sócia não lê a aba do Console') from ids, c;

-- Isolamento: a aba do Umbu não mostra os treinos do Cedro.
select is((select jsonb_array_length(a -> 'treinos') from ids, c, pg_temp.aba(imp, umbu) a), 0, 'CO-08: os treinos ficam no escritório deles');
select is((select (a -> 'situacao' ->> 'total')::int from ids, c, pg_temp.aba(imp, umbu) a), 1, 'e as pessoas também');

-- ---------------------------------------------------------------------------------------
-- Quem acompanha.
select is((select array_agg(x ->> 'nome' order by x ->> 'nome') from ids, c, pg_temp.aba(imp, cedro) a, jsonb_array_elements(a -> 'acompanhantes') x),
  array['Carol Andrade', 'Olga Bastos', 'Rafael Teles'], 'CO-08: podem acompanhar só quem atende com Implantação ou Administração');
select is(pg_temp.motivo(teste.erro(format($$ select console_implantacao_responsavel(%L, %L, %L, %s) $$, imp, cedro, fin, pg_temp.vi(cedro)))),
  'RESPONSAVEL_SEM_ATRIBUICAO', 'CO-08: o Financeiro atribuído não acompanha') from ids, c;
select is(pg_temp.motivo(teste.erro(format($$ select console_implantacao_responsavel(%L, %L, %L, %s) $$, imp, cedro, imp2, pg_temp.vi(cedro)))),
  'RESPONSAVEL_SEM_ATRIBUICAO', 'CO-08: quem é da Implantação mas não atende o escritório não acompanha') from ids, c;
select is(pg_temp.motivo(teste.erro(format($$ select console_implantacao_responsavel(%L, %L, %L, %s) $$, imp, cedro, lia, pg_temp.vi(cedro)))),
  'RESPONSAVEL_SEM_ATRIBUICAO', 'a sócia não acompanha') from ids, c;
select is(pg_temp.motivo(teste.erro(format($$ select console_implantacao_responsavel(%L, %L, %L, %s) $$, imp, cedro, imp, pg_temp.vi(cedro) - 1))),
  'TC409', 'CO-08: a versão velha dá conflito') from ids, c;
select is(pg_temp.motivo(teste.erro(format($$ select console_implantacao_responsavel(%L, %L, %L, %s) $$, fin, cedro, imp, pg_temp.vi(cedro)))),
  'TC401', 'CO-08: o Financeiro não troca quem acompanha') from ids, c;
select console_implantacao_responsavel(imp, cedro, imp, pg_temp.vi(cedro)) from ids, c;
select is((select a -> 'implantacao' -> 'responsavel' ->> 'nome' from ids, c, pg_temp.aba(fin, cedro) a), 'Rafael Teles', 'CO-08: a aba mostra quem acompanha');
select is((select h.dados ->> 'para' from historico h, c where h.acao = 'implantacao.responsavel_trocado' and h.escritorio_id = c.cedro and h.interno),
  (select imp::text from ids), 'a troca vai para o histórico interno');
select is((teste.erro(format($$ update implantacoes set responsavel_id = %L where escritorio_id = %L $$, fin, cedro))) -> 'detalhe' ->> 'motivo',
  'RESPONSAVEL_SEM_ATRIBUICAO', 'a regra vale em qualquer caminho, pelo gatilho') from ids, c;

-- Quem sai deixa de acompanhar (EX-10): a atribuição retirada, só naquele escritório.
select console_implantacao_responsavel(imp, umbu, imp, pg_temp.vi(umbu)) from ids, c;
select console_retirar_atribuicao(adm, cedro, v.id, v.versao) from ids, c, vinculos v
 where v.pessoa_id = ids.imp and v.escritorio_id = c.cedro and v.funcao = 'IMPLANTACAO';
select is((select pg_temp.resp(cedro) from c), null, 'CO-08: a atribuição retirada tira quem acompanha');
select is((select pg_temp.resp(umbu) from c), (select imp from ids), 'e só naquele escritório');

-- A função retirada: quem fica com Administração atribuída continua.
select console_implantacao_responsavel(adm, cedro, adm2, pg_temp.vi(cedro)) from ids, c;
select console_definir_funcoes(adm, adm2, array['ADMINISTRACAO']) from ids;
select is((select pg_temp.resp(cedro) from c), (select adm2 from ids), 'CO-08: perder a Implantação mantém quem ainda atende com Administração');
select console_definir_funcoes(adm, imp, array['SUPORTE']) from ids;
select is((select pg_temp.resp(umbu) from c), null, 'CO-08: perder a função tira quem acompanha');

-- A pessoa desativada.
select console_desativar_membro(adm, adm2) from ids;
select is((select pg_temp.resp(cedro) from c), null, 'CO-08: a pessoa desativada deixa de acompanhar');
select is((select count(*)::int from implantacoes where responsavel_id is not null), 0, 'ninguém que saiu continua acompanhando');

-- O teste 046 enxerga a passagem desta tabela.
select ok(exists (select 1 from pg_trigger g join pg_proc p on p.oid = g.tgfoid
                   where g.tgrelid = 'historico'::regclass and g.tgname like '%passar_de_quem_saiu%' and p.prosrc ~ '\mimplantacoes\M'),
  'EX-10: implantacoes tem quem passe o trabalho de quem sai');

-- ---------------------------------------------------------------------------------------
-- Depois da conclusão (DC14): quem chega depois também é treinado, na mesma lista.
select console_implantacao_responsavel(adm, cedro, adm, pg_temp.vi(cedro)) from ids, c;
select console_implantacao_concluir(adm, cedro, (select versao from clientes where escritorio_id = c.cedro), pg_temp.vi(cedro), 'Equipe treinada')
  from ids, c;
select is((select estado from implantacoes where escritorio_id = c.cedro) , 'CONCLUIDA', 'a implantação foi concluída') from c;
create temp table t2 as select (pg_temp.treino(adm, cedro, jsonb_build_object('dia', '2026-12-01', 'duracaoMin', 45, 'forma', 'VIDEO',
  'pessoas', jsonb_build_array(diego), 'temas', '[]'::jsonb)) -> 'treino' ->> 'id')::uuid as id from ids, c;
select is((select i.estado from implantacao_treinos t join implantacoes i on i.id = t.implantacao_id, t2 where t.id = t2.id), 'CONCLUIDA',
  'CO-08: quem chega depois da conclusão é treinado, sem custo, na mesma lista');
select is((select (a -> 'situacao' ->> 'treinadas')::int || ' de ' || (a -> 'situacao' ->> 'total')::int || '|' || coalesce(a -> 'situacao' ->> 'diasAtePrazo', 'sem prazo')
             from ids, c, pg_temp.aba(adm, cedro) a), '3 de 3|sem prazo', 'a conta segue depois da conclusão, sem o prazo');
select is(pg_temp.motivo(teste.erro(format($$ select console_implantacao_responsavel(%L, %L, %L, 99) $$, adm, cedro, adm))),
  'IMPLANTACAO_NAO_ABERTA', 'CO-08: quem acompanha só muda com a implantação aberta') from ids, c;
select is((select a -> 'implantacao' -> 'responsavel' ->> 'nome' from ids, c, pg_temp.aba(adm, cedro) a), 'Carol Andrade',
  'a concluída guarda quem acompanhou');

-- Sem implantação, nada se registra.
select is((select a -> 'implantacao' from ids, c, pg_temp.aba(imp2, umbu) a), (select implantacao_json(i) || jsonb_build_object('descricao', i.descricao)
             from implantacoes i, c where i.escritorio_id = c.umbu), 'a aba do Umbu lê a implantação dele');
select is(pg_temp.motivo(teste.erro(format($$ select pg_temp.treino(%L, %L, %L) $$, adm, ipe,
            jsonb_build_object('dia', '2026-12-01', 'duracaoMin', 30, 'forma', 'VIDEO', 'pessoas', '[]'::jsonb)))),
  'IMPLANTACAO_NAO_ABERTA', 'CO-08: sem implantação, o treino é recusado') from ids, c;
select is((select a -> 'implantacao' from ids, c, pg_temp.aba(adm, ipe) a), 'null'::jsonb, 'e a aba diz que não há implantação');

select * from finish();
rollback;
