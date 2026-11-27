-- Implantação assistida, parte 5 (F1.46; CO-08, migration 1184): os avisos no sino do Console.
-- Aos 7, 3 e 0 dias do prazo, uma vez cada, contando do prazo de agora (o prazo mudado vale de
-- novo, e só o marco do dia sai), para quem acompanha e a Administração que atende o escritório
-- (sem Administração atribuída, toda a Administração; sem responsável, só ela); com "X de Y" e
-- quem falta treinar; também para quem ainda não tem assinatura. O fim da isenção 30 dias antes da
-- data de corte, para a Administração, uma vez por data. O escritório que a rotina pulou por ter a
-- implantação cobrada no carnê, uma vez por competência, sem derrubar a rotina da cobrança. Nada
-- passa a Ativo sozinho (DC14). O que o sino mostra a cada função, e os checks e o cascade.
begin;
select plan(49);

create function pg_temp.relogio(p text) returns timestamptz language sql as $$ select ajustar_relogio(p::timestamptz - now()) $$;
select pg_temp.relogio('2026-12-01 10:00-03');

create temp table ids as select
  teste.equipe('Carol Andrade', 'ADMINISTRACAO') as adm,
  teste.equipe('Olga Bastos', 'ADMINISTRACAO') as olga,
  teste.equipe('Rafael Teles', 'IMPLANTACAO') as imp,
  teste.equipe('Marta Quintela', 'FINANCEIRO') as fin,
  teste.equipe('Sérgio Lopes', 'SUPORTE') as sup,
  teste.pessoa('Renata Lima') as lia,
  teste.pessoa('Juliana Prado') as juliana,
  teste.pessoa('Tiago Ramos') as tiago,
  teste.pessoa('Bia Umbu') as bia,
  teste.pessoa('Caio Angico') as caio;

-- A Carol cria os três e atende todos (console_criar_escritorio); a Olga não atende nenhum.
create temp table c as select
  console_criar_escritorio(adm, 'Cedro & Lima Advocacia', 'Recife', 'PE') as cedro,
  console_criar_escritorio(adm, 'Umbu Advocacia', 'Petrolina', 'PE') as umbu,
  console_criar_escritorio(adm, 'Angico Advocacia', 'Aracaju', 'SE') as angico from ids;
select limpar_contexto();
insert into vinculos (pessoa_id, escritorio_id, funcao, criado_por)
            select lia, cedro, 'SOCIO', adm from ids, c
  union all select juliana, cedro, 'EQUIPE', adm from ids, c union all select tiago, cedro, 'EQUIPE', adm from ids, c
  union all select bia, umbu, 'SOCIO', adm from ids, c union all select caio, angico, 'SOCIO', adm from ids, c
  union all select imp, cedro, 'IMPLANTACAO', adm from ids, c union all select imp, angico, 'IMPLANTACAO', adm from ids, c
  union all select sup, cedro, 'SUPORTE', adm from ids, c
  union all select fin, e, 'FINANCEIRO', adm from ids, c, unnest(array[cedro, umbu, angico]) e;
-- O Umbu fica sem Administração atribuída.
update vinculos set revogado_em = app_now(), revogado_por = (select adm from ids) where funcao = 'ADMINISTRACAO' and escritorio_id = (select umbu from c);
update pessoas set senha_criada_em = now() where id in (select unnest(array[lia, juliana, bia, caio]) from ids);

create function pg_temp.entrar(p_pessoa uuid, p_esc uuid) returns void language sql as $$
  select escolher_escritorio(p_pessoa, gen_random_uuid(), p_esc); select limpar_contexto() $$;
create function pg_temp.imp(p_esc uuid) returns implantacoes language sql as $$
  select * from implantacoes where escritorio_id = p_esc order by numero desc limit 1 $$;
create function pg_temp.motivo(p jsonb) returns text language sql as $$ select coalesce(p -> 'detalhe' ->> 'motivo', p ->> 'codigo', 'ok') $$;
create function pg_temp.rotina() returns jsonb language sql as $$ select implantacao_rotina() $$;
-- Quem recebeu o aviso de prazo do escritório com o marco e o prazo dados.
create function pg_temp.para(p_esc uuid, p_dias integer, p_prazo date) returns text[] language sql as $$
  select coalesce(array_agg(p.nome order by p.nome), '{}') from avisos_console a join pessoas p on p.id = a.pessoa_id
   where a.tipo = 'IMPLANTACAO_PRAZO' and a.dados ->> 'escritorioId' = p_esc::text
     and a.dados ->> 'dias' = p_dias::text and a.dados ->> 'prazo' = p_prazo::text $$;
create function pg_temp.n(p_tipo text) returns integer language sql as $$
  select count(*)::int from avisos_console where tipo = p_tipo $$;

select pg_temp.entrar(lia, cedro), pg_temp.entrar(bia, umbu) from ids, c;
select console_implantacao_responsavel(adm, cedro, imp, (pg_temp.imp(cedro)).versao) from ids, c;
select limpar_contexto();
select is((select (pg_temp.imp(cedro)).prazo_ate::text || ' ' || (pg_temp.imp(umbu)).prazo_ate::text from c), '2026-12-31 2026-12-31',
  'as duas implantações abrem hoje, com o prazo de 30 dias');
select is((select count(*)::int from assinaturas, c where escritorio_id = cedro), 0, 'o Cedro ainda não tem assinatura');

-- ---------------------------------------------------------------------------------------
-- O prazo: 7, 3 e 0 dias, uma vez cada.
select is((pg_temp.rotina() ->> 'prazo')::int, 0, 'CO-08: a 30 dias do prazo, nenhum aviso');
select pg_temp.relogio('2026-12-24 08:00-03');
select is(pg_temp.rotina(), '{"prazo": 4, "isencao": 0, "falhas": 0}'::jsonb, 'CO-08: a 7 dias, a rotina avisa os dois escritórios');
select is((select pg_temp.para(cedro, 7, '2026-12-31') from c), array['Carol Andrade', 'Rafael Teles'],
  'CO-08: o aviso vai para quem acompanha e para a Administração que atende o escritório');
select is((select pg_temp.para(umbu, 7, '2026-12-31') from c), array['Carol Andrade', 'Olga Bastos'],
  'CO-08: sem responsável e sem Administração atribuída, vai para toda a Administração');
select ok((select (pg_temp.para(cedro, 7, '2026-12-31'))[1] is not null from c), 'CO-08: o aviso chega também a quem ainda não tem assinatura');
create temp table a7 as select a.* from avisos_console a, ids, c
 where a.pessoa_id = ids.imp and a.tipo = 'IMPLANTACAO_PRAZO' and a.dados ->> 'escritorioId' = c.cedro::text;
select is((select dados - 'escritorioId' from a7),
  jsonb_build_object('escritorio', 'Cedro & Lima Advocacia', 'numero', 1, 'prazo', '2026-12-31', 'dias', 7, 'treinadas', 0, 'total', 3,
                     'faltam', jsonb_build_array('Renata Lima', 'Juliana Prado', 'Tiago Ramos'), 'responsavel', 'Rafael Teles'),
  'CO-08: o aviso diz o prazo, os dias, X de Y, quem falta treinar e quem acompanha');
select is((select implantacao_id = (pg_temp.imp(cedro)).id from a7, c), true, 'o aviso leva a implantação');
select is((pg_temp.rotina() ->> 'prazo')::int, 0, 'CO-08: rodar de novo no mesmo dia não repete');
select pg_temp.relogio('2026-12-25 08:00-03');
select is((pg_temp.rotina() ->> 'prazo')::int, 0, 'CO-08: no dia seguinte (6 dias) também não');

-- Um treino muda o "X de Y" do próximo aviso.
select console_implantacao_treino(imp, cedro, jsonb_build_object('dia', '2026-12-25', 'duracaoMin', 60, 'forma', 'VIDEO',
  'pessoas', jsonb_build_array(lia, juliana))) from ids, c;
select limpar_contexto();
select pg_temp.relogio('2026-12-28 08:00-03');
select is((pg_temp.rotina() ->> 'prazo')::int, 4, 'CO-08: a 3 dias, de novo os dois escritórios');
select is((select pg_temp.para(cedro, 3, '2026-12-31') from c), array['Carol Andrade', 'Rafael Teles'], 'o aviso de 3 dias, para os mesmos');
select is((select (a.dados -> 'treinadas') || (a.dados -> 'total') || (a.dados -> 'faltam') from avisos_console a, c, ids
            where a.pessoa_id = ids.imp and a.tipo = 'IMPLANTACAO_PRAZO' and a.dados ->> 'dias' = '3'),
  '[2, 3, "Tiago Ramos"]'::jsonb, 'CO-08: com o treino, 2 de 3 e só quem falta');

-- O prazo muda (com motivo): os marcos contam do prazo novo, e só o do dia sai.
select console_implantacao_prazo(adm, cedro, date '2027-01-04', 'A sócia pediu mais uma semana para a equipe', (pg_temp.imp(cedro)).versao) from ids, c;
select limpar_contexto();
select is((pg_temp.rotina() ->> 'prazo')::int, 2, 'CO-08: com o prazo mudado para daqui a 7 dias, o aviso de 7 dias vale de novo');
select is((select pg_temp.para(cedro, 7, '2027-01-04') from c), array['Carol Andrade', 'Rafael Teles'], 'com o prazo novo');
select pg_temp.relogio('2026-12-31 08:00-03');
select is((pg_temp.rotina() ->> 'prazo')::int, 2, 'CO-08: no dia do prazo do Umbu, só ele (o Cedro está a 4 dias, marco já avisado)');
select is((select pg_temp.para(umbu, 0, '2026-12-31') from c), array['Carol Andrade', 'Olga Bastos'], 'o aviso de vence hoje');
select pg_temp.relogio('2027-01-01 08:00-03');
select is((pg_temp.rotina() ->> 'prazo')::int, 2, 'CO-08: o Cedro a 3 dias do prazo novo; o Umbu, passado o prazo, não recebe mais nada');
select pg_temp.relogio('2027-01-04 08:00-03');
select is((pg_temp.rotina() ->> 'prazo')::int, 2, 'CO-08: o Cedro no dia do prazo novo');
select pg_temp.relogio('2027-01-05 08:00-03');
select is((pg_temp.rotina() ->> 'prazo')::int, 0, 'CO-08: depois do prazo, nenhum aviso novo');
select is((select count(*)::int from avisos_console a, c where a.dados ->> 'escritorioId' = c.umbu::text), 6,
  'CO-08: o Umbu recebeu 7, 3 e 0 dias, uma vez cada, para duas pessoas');
select is((select (pg_temp.imp(cedro)).estado || ' ' || (pg_temp.imp(umbu)).estado || ' '
                  || (select string_agg(estado, ' ' order by nome) from clientes cl join escritorios e on e.id = cl.escritorio_id
                       where cl.escritorio_id in (c.cedro, c.umbu)) from c),
  'ABERTA ABERTA IMPLANTACAO IMPLANTACAO', 'DC14: passado o prazo, nada passa a Ativo sozinho');

-- Quem deixou de acompanhar não recebe: o próximo prazo vai só para a Administração.
select console_implantacao_prazo(adm, cedro, date '2027-01-12', 'Mais uma semana', (pg_temp.imp(cedro)).versao) from ids, c;
select limpar_contexto();
update vinculos set revogado_em = app_now(), revogado_por = (select adm from ids) where funcao = 'IMPLANTACAO' and escritorio_id = (select cedro from c);
select pg_temp.rotina();
select is((select pg_temp.para(cedro, 7, '2027-01-12') from c), array['Carol Andrade'],
  'CO-08: quem já não atende o escritório não recebe o aviso');

-- ---------------------------------------------------------------------------------------
-- O sino: cada um vê os seus, e o aviso de implantação só quem vê a implantação.
select is((select jsonb_array_length(console_avisos(imp) -> 'itens') from ids), 5, 'CO-08: os avisos de prazo no sino de quem acompanha');
select is((select console_avisos(imp) -> 'itens' -> 0 ->> 'tipo' from ids), 'IMPLANTACAO_PRAZO', 'com o tipo novo');
select is((select (console_avisos(imp) ->> 'veImplantacao') || (console_avisos(imp) ->> 'veRegraImplantacao') from ids), 'truefalse',
  'CO-08: a Implantação vê a implantação, mas não a regra');
select is((select (console_avisos(adm) ->> 'veImplantacao') || (console_avisos(adm) ->> 'veRegraImplantacao') from ids), 'truetrue',
  'a Administração vê as duas');
-- ---------------------------------------------------------------------------------------
-- O fim da isenção: 30 dias antes da data de corte, para toda a Administração, uma vez por data.
select pg_temp.relogio('2027-04-30 08:00-03');
update implantacao_regras set isencao_ate = '2027-05-31';
select is((pg_temp.rotina() ->> 'isencao')::int, 0, 'CO-08: a 31 dias da data de corte, nada');
select pg_temp.relogio('2027-05-01 08:00-03');
select is((pg_temp.rotina() ->> 'isencao')::int, 2, 'CO-08: a 30 dias, o aviso de fim da isenção');
select is((select array_agg(p.nome order by p.nome) from avisos_console a join pessoas p on p.id = a.pessoa_id where a.tipo = 'IMPLANTACAO_ISENCAO_FIM'),
  array['Carol Andrade', 'Olga Bastos'], 'CO-08: para toda a Administração');
select is((select dados from avisos_console where tipo = 'IMPLANTACAO_ISENCAO_FIM' limit 1),
  '{"dias": 30, "isencaoAte": "2027-05-31", "cobradaDesde": "2027-06-01", "valorCentavos": 149000}'::jsonb,
  'CO-08: com a data de corte, o primeiro dia cobrado e o valor');
select is((select implantacao_id from avisos_console where tipo = 'IMPLANTACAO_ISENCAO_FIM' limit 1), null, 'sem implantação (a regra é global)');
select pg_temp.relogio('2027-05-02 08:00-03');
select is((pg_temp.rotina() ->> 'isencao')::int, 0, 'CO-08: uma vez por data de corte');
update implantacao_regras set isencao_ate = '2027-05-20';
select is((pg_temp.rotina() ->> 'isencao')::int, 2, 'CO-08: a data de corte mudada avisa de novo, com os dias que faltam');
select is((select console_avisos(adm) -> 'itens' -> 0 -> 'dados' ->> 'dias' from ids), '18', 'o aviso novo no sino da Administração');
select is((select count(*)::int from ids, jsonb_array_elements(console_avisos(fin) -> 'itens') i where i ->> 'tipo' = 'IMPLANTACAO_ISENCAO_FIM'), 0,
  'o Financeiro não recebe o fim da isenção');
-- A Olga deixa a Administração e fica na Implantação: o fim da isenção some do sino dela.
update equipe_funcoes set retirada_em = app_now(), retirada_por = (select adm from ids) where pessoa_id = (select olga from ids);
insert into equipe_funcoes (pessoa_id, funcao) select olga, 'IMPLANTACAO' from ids;
select is((select count(*)::int from ids, jsonb_array_elements(console_avisos(olga) -> 'itens') i where i ->> 'tipo' = 'IMPLANTACAO_ISENCAO_FIM'), 0,
  'CO-08: quem deixa a Administração não vê mais o fim da isenção (a permissão de agora)');

-- ---------------------------------------------------------------------------------------
-- O escritório que a rotina pulou: carnê com a implantação cobrada (1182).
create temp table pl as select
  (console_plano_salvar(adm, null, null, '{"nome":"Escritório","precoCentavos":49900,"pessoasIncluidas":8}') ->> 'id')::uuid as escritorio from ids;
select limpar_contexto();
select console_assinatura_salvar(fin, angico, null, jsonb_build_object('planoId', (select escritorio from pl), 'diaVencimento', 10,
  'forma', 'CARNE', 'emailCobranca', 'financeiro@angico.adv.br')) from ids, c;
select limpar_contexto();
update configuracoes set valor = 'true'::jsonb where chave = 'implantacao_na_fatura';
update implantacao_regras set condicao_padrao = 'COBRADA';
select pg_temp.entrar(caio, angico) from ids, c;
select console_implantacao_responsavel(adm, angico, imp, (pg_temp.imp(angico)).versao) from ids, c;
select limpar_contexto();
select entrar_escritorio_servico(angico) from c;
select lives_ok($$ select cobranca_comecar(angico) from c $$, 'CO-08: pela rotina, a recusa do carnê não derruba a cobrança');
select limpar_contexto();
select is((select count(*)::int from faturas, c where escritorio_id = angico), 0, 'a 1ª fatura não sai');
select is((select array_agg(p.nome order by p.nome) from avisos_console a join pessoas p on p.id = a.pessoa_id where a.tipo = 'IMPLANTACAO_CARNE_RECUSADO'),
  array['Carol Andrade', 'Rafael Teles'], 'CO-08: o escritório pulado vai ao sino de quem acompanha e da Administração');
select is((select (implantacao_id = (pg_temp.imp(angico)).id)::text || ' ' || (dados - 'competencia' - 'escritorioId' - 'dia')::text
             from avisos_console, c where tipo = 'IMPLANTACAO_CARNE_RECUSADO' limit 1),
  'true {"escritorio": "Angico Advocacia", "responsavel": "Rafael Teles"}', 'com a implantação, o escritório e quem acompanha');
select is((select dados ->> 'competencia' = a.primeira_competencia::text from avisos_console, assinaturas a, c
            where tipo = 'IMPLANTACAO_CARNE_RECUSADO' and a.escritorio_id = c.angico limit 1), true, 'e a competência da 1ª fatura');
select pg_temp.relogio('2027-05-03 08:00-03');
select lives_ok($$ select cobranca_rotina() $$, 'CO-08: a rotina diária segue');
select is((select count(*)::int from fatura_eventos e, c where e.escritorio_id = angico and e.acao = 'implantacao.carne_recusado'), 2,
  'o evento é de cada dia');
select is(pg_temp.n('IMPLANTACAO_CARNE_RECUSADO'), 2, 'CO-08: o aviso, uma vez por competência');
update configuracoes set valor = 'false'::jsonb where chave = 'implantacao_na_fatura';
update implantacao_regras set condicao_padrao = 'ISENTA';

-- ---------------------------------------------------------------------------------------
-- Os checks e o cascade (revisão, 17).
select throws_ok($$ insert into avisos_console (pessoa_id, tipo) select adm, 'IMPLANTACAO_PRAZO' from ids $$, '23514', null,
  'CO-08: o aviso de prazo exige a implantação');
select throws_ok($$ insert into avisos_console (pessoa_id, tipo, implantacao_id) select adm, 'IMPLANTACAO_ISENCAO_FIM', (pg_temp.imp(cedro)).id from ids, c $$,
  '23514', null, 'o fim da isenção não tem implantação');
select is((select confdeltype from pg_constraint where conrelid = 'avisos_console'::regclass and contype = 'f'
            and confrelid = 'implantacoes'::regclass), 'c', 'CO-08: o aviso sai junto com a implantação (on delete cascade)');

select * from finish();
rollback;
