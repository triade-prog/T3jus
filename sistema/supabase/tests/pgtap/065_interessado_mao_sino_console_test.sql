-- Cadastrar interessado à mão (F2.5, SC-05) e o sino do Console (F2.6, SC-02, SC-05).
begin;
select plan(40);

create temp table ids as select
  teste.equipe('Carol Andrade', 'ADMINISTRACAO') as adm,
  teste.equipe('Rafael Teles', 'IMPLANTACAO') as impl,
  teste.equipe('Bruno Seixas', 'SUPORTE') as sup,
  teste.equipe('Fátima Lopes', 'FINANCEIRO') as fin;

create function pg_temp.dados(p_extra jsonb default '{}') returns jsonb language sql as $$
  select jsonb_build_object('nome', 'Tomás Lins', 'escritorio', 'Aroeira & Lins Advogados', 'email', 'Tomas@AroeiraLins.adv.br',
    'whats', '(86) 99561-2087', 'tamanho', 'DE_2_A_5', 'area', 'Cível', 'cidade', 'Teresina', 'uf', 'PI',
    'origem', 'INDICACAO', 'detalhe', 'Indicação de Patrícia Nóbrega, da Umbu', 'quando', hoje_brasilia(),
    'mensagem', 'Quer ver o carnê.', 'sabe', false,
    'responsavel', (select impl from ids), 'passo', 'Fazer o primeiro contato', 'passoData', hoje_brasilia() + 2) || p_extra
$$;

-- Quem cadastra: Administração e Implantação.
select is((teste.erro($$ select console_interessado_cadastrar(fin, pg_temp.dados()) from ids $$)) ->> 'codigo', 'TC401',
  'SC-05: o Financeiro não cadastra interessado');

-- Campos: e-mail ou WhatsApp, pelo menos um; origem, detalhe e "sabe" obrigatórios.
select is((teste.erro($$ select console_interessado_cadastrar(impl, pg_temp.dados('{"email":"","whats":""}')) from ids $$)) -> 'detalhe' -> 'campos',
  '["email", "whats"]'::jsonb, 'SC-05: sem e-mail nem WhatsApp é recusado');
select is((teste.erro($$ select console_interessado_cadastrar(impl, pg_temp.dados('{"escritorio":"","whats":"(86) 9956-12","origem":"SITE","detalhe":" ","sabe":null}')) from ids $$)) -> 'detalhe' -> 'campos',
  '["escritorio", "whats", "origem", "detalhe", "sabe"]'::jsonb, 'os erros vêm todos juntos, presos aos campos');
select is((teste.erro($$ select console_interessado_cadastrar(impl, pg_temp.dados(jsonb_build_object('quando', hoje_brasilia() + 1))) from ids $$)) -> 'detalhe' -> 'campos',
  '["quando"]'::jsonb, 'decisão 5: a data do contato não pode ser depois de hoje');
select is((teste.erro($$ select console_interessado_cadastrar(impl, pg_temp.dados(jsonb_build_object('responsavel', (select fin from ids)))) from ids $$)) -> 'detalhe' -> 'campos',
  '["responsavel"]'::jsonb, 'só quem vê Interessados pode ser responsável');

-- Cadastro com Rafael (Implantação) cadastrando para ele mesmo.
create temp table c1 as select (console_interessado_cadastrar(impl, pg_temp.dados()) ->> 'id')::uuid as id from ids;
select is((select estado || '|' || origem || '|' || email || '|' || whats || '|' || base_legal from interessados where id = (select id from c1)),
  'NOVO|INDICACAO|tomas@aroeiralins.adv.br|+5586995612087|LEGITIMO_INTERESSE', 'SC-05: entra em Novo, normalizado, por legítimo interesse');
select is((select autorizacao from interessados where id = (select id from c1)), null::jsonb, 'decisão 2: o cadastro à mão não tem autorização do site');
select is((select sabe_do_contato::text || '|' || (cadastrado_por = (select impl from ids))::text from interessados where id = (select id from c1)),
  'false|true', 'guarda se a pessoa sabe e quem cadastrou');
select is((select origem_detalhe ->> 'detalhe' from interessados where id = (select id from c1)), 'Indicação de Patrícia Nóbrega, da Umbu', 'guarda de onde veio o contato');
select is((select responsavel_id = (select impl from ids) and proximo_passo = 'Fazer o primeiro contato' from interessados where id = (select id from c1)), true,
  'já nasce com responsável e próximo passo');
select is((select acao from interessado_eventos where interessado_id = (select id from c1)), 'interessado.cadastrado', 'o cadastro fica no histórico');
select is((select count(*)::int from avisos_console where interessado_id = (select id from c1)), 0, 'quem cadastra para si mesmo não recebe aviso');
select is((select console_interessado(adm, id) ->> 'cadastradoPor' from ids, c1), 'Rafael Teles', 'a ficha diz quem cadastrou');
select is((select console_interessado(adm, id) ->> 'baseLegal' from ids, c1), 'LEGITIMO_INTERESSE', 'a ficha diz a base legal');

-- Possível repetido (decisão 3): o mesmo WhatsApp devolve o existente e não grava.
create temp table rep as select console_interessado_cadastrar(adm, pg_temp.dados('{"email":"outro@ex.com.br","whats":"+55 86 99561-2087","nome":"Outra pessoa"}')) as r from ids;
select is((select r -> 'repetido' ->> 'id' from rep)::uuid, (select id from c1), 'decisão 3: o mesmo WhatsApp acusa o existente');
select is((select r -> 'repetido' ->> 'campo' from rep), 'whats', 'diz qual campo é igual');
select is((select count(*)::int from interessados), 1, 'nada foi cadastrado ainda');
-- Cadastrar mesmo assim: grava e registra de quem era a repetição; o responsável recebe aviso.
create temp table c2 as select (console_interessado_cadastrar(adm, pg_temp.dados('{"email":"outro@ex.com.br","whats":"+55 86 99561-2087","origem":"EVENTO","sabe":true}'), true) ->> 'id')::uuid as id from ids;
select is((select dados ->> 'repetido_de' from interessado_eventos where interessado_id = (select id from c2)), (select id::text from c1),
  'cadastrar mesmo assim fica no histórico');
select is((select tipo || '|' || (dados ->> 'quem') from avisos_console where interessado_id = (select id from c2) and pessoa_id = (select impl from ids)),
  'INTERESSADO_ATRIBUIDO|Carol Andrade', 'F2.6: quem recebe o interessado cadastrado por outra pessoa é avisado');

-- Juntar ao existente: vira nota e renova o último contato.
select ajustar_relogio('2 days');
select console_interessado_juntar(adm, id, pg_temp.dados('{"mensagem":"Falou de novo no evento."}')) from ids, c1;
select ok((select texto like 'Contato de novo (indicação,%' and texto like '%Falou de novo no evento.%' from interessado_notas where interessado_id = (select id from c1)),
  'decisão 3: juntar guarda o que foi escrito como nota');
select ok((select ultimo_contato_em > chegou_em + interval '1 day' from interessados where id = (select id from c1)), 'juntar conta como novo contato');
select is((select acao from interessado_eventos where interessado_id = (select id from c1) order by id desc limit 1), 'contato.repetido', 'juntar fica no histórico');
select ajustar_relogio('0');

-- Data anterior: o prazo de 12 meses conta da data do contato.
create temp table c3 as select (console_interessado_cadastrar(impl, pg_temp.dados(jsonb_build_object('email', 'velho@ex.com.br', 'whats', '', 'quando', hoje_brasilia() - 10))) ->> 'id')::uuid as id from ids;
select is((select (ultimo_contato_em at time zone 'America/Sao_Paulo')::date from interessados where id = (select id from c3)), hoje_brasilia() - 10,
  'decisão 5: o último contato é a data informada');

-- Sino: o pedido novo do site avisa todos que veem Interessados (decisão 8).
create temp table site as select (site_registrar_pedido('{"nome":"Lívia Prado","escritorio":"Jatobá Advocacia","email":"livia@jatoba.adv.br","whats":"(86) 99812-4410","tamanho":"6 a 10","msg":"Queremos ver o financeiro.","aceite":true}'::jsonb, '200.1.2.3') ->> 'id')::uuid as id;
select is((select array_agg(p.nome order by p.nome) from avisos_console a join pessoas p on p.id = a.pessoa_id where a.interessado_id = (select id from site)),
  array['Carol Andrade', 'Rafael Teles']::text[], 'SC-02: o pedido do site avisa a Administração e a Implantação');
select is((select dados ->> 'trecho' from avisos_console where interessado_id = (select id from site) limit 1), 'Queremos ver o financeiro.', 'o aviso traz a fala da pessoa');
select is((select (console_avisos(fin) ->> 'total')::int from ids), 0, 'o Financeiro não recebe aviso de interessado');

-- Passar para alguém avisa; ficar com ele não.
select console_interessado_responsavel(adm, id, 1, adm) from ids, site;
select is((select count(*)::int from avisos_console where interessado_id = (select id from site) and tipo = 'INTERESSADO_ATRIBUIDO'), 0, 'ficar com ele não gera aviso');
select console_interessado_responsavel(adm, id, 2, impl, 'Você conhece a sócia.') from ids, site;
select is((select dados ->> 'recado' from avisos_console where interessado_id = (select id from site) and tipo = 'INTERESSADO_ATRIBUIDO'), 'Você conhece a sócia.',
  'F2.6: passar para alguém avisa, com o recado');
select is((select console_avisos(adm) -> 'itens' -> 0 ->> 'agora' from ids), 'Rafael Teles', 'o aviso do pedido diz quem cuida agora');

-- Ler e marcar: cada um só o seu; marcar todos até o último mostrado.
create temp table l as select console_avisos(impl) as j from ids;
select is((select (j ->> 'novos')::int from l), 3, 'Rafael tem 3 avisos novos');
select is((teste.erro(format($$ select console_aviso_lido(%L, %L) $$, (select adm from ids), (select j -> 'itens' -> 0 ->> 'id' from l)))) ->> 'codigo', 'TC404',
  'o aviso de outra pessoa nem aparece');
select is((select (console_aviso_lido(impl, (j -> 'itens' -> 0 ->> 'id')::uuid) ->> 'novos')::int from ids, l), 2, 'abrir um aviso marca como lido');
select is((select (console_avisos_lidos(impl, app_now()) ->> 'marcados')::int from ids), 2, 'marcar todos marca os que faltam');
select throws_ok($$ update avisos_console set dados = '{}' $$, 'TC023', null, 'o aviso não muda');
select throws_ok($$ delete from avisos_console $$, 'TC023', null, 'o aviso não se apaga à mão');

-- Passo vencido: uma vez, para quem faz o passo (decisão 7).
select ajustar_relogio('5 days');
select is(avisar_interessados_vencidos(), 4, 'F2.6: cada passo vencido avisa');
select is(avisar_interessados_vencidos(), 0, 'decisão 7: avisa uma vez só');
select is((select dados ->> 'passo' from avisos_console where tipo = 'INTERESSADO_VENCIDO' and interessado_id = (select id from site)), 'Responder o pedido',
  'o aviso diz o passo vencido');

-- Quem perde Interessados deixa de ver os avisos antigos de interessado.
select console_definir_funcoes(adm, impl, array['SUPORTE']) from ids;
select is((select (console_avisos(impl) ->> 'total')::int from ids), 0, 'quem perde Interessados não vê mais esses avisos');

-- Prazo de 12 meses: o aviso sai junto com o interessado.
select ajustar_relogio('14 months');
select aplicar_prazos();
select is((select count(*)::int from avisos_console), 0, 'PT-11: o aviso sai junto com o interessado');
select ajustar_relogio('0');

select * from finish();
rollback;
