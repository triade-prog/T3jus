-- Os avisos do sino do cliente excluído a pedido do titular (1110 e 1111; F3.172, PT-11, PT-03): na
-- exclusão, o nome do cliente e o serviço guardados em avisos_sino.dados viram o texto fixo, e no
-- aviso dos 18 anos saem a data e quem assinava; o aviso não se apaga; o guardião aceita só essa
-- troca, conferida pelos dados; o aviso que nasce de cliente já excluído nasce com a troca; os
-- clientes excluídos antes da 1110 entram pela função da 1111, também com o escritório só de
-- consulta (revisão, M1). Os avisos de conversa ficam para a F3.157 (revisão, M4).
begin;
select plan(47);

select ajustar_relogio(('2026-11-25 10:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Bianca Torres') as bianca,
  teste.pessoa('Intrusa Souza') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, diego, 'Diego Almeida', array['COMERCIAL']),
       portal_convidar(socia, rm, bianca, 'Bianca Torres', array['CONTRATOS']) from ids;

create function pg_temp.cli(p_pessoa uuid, p_esc uuid, p_nome text) returns uuid language sql as $$
  select (portal_cliente_cadastrar(p_pessoa, p_esc, jsonb_build_object('tipo', 'PF', 'origem', 'GOOGLE', 'nome', p_nome,
    'contatos', jsonb_build_array(jsonb_build_object('nome', 'Contato', 'telefone', '+5511984723316', 'principal', true)))) ->> 'id')::uuid
$$;
create temp table cli as select
  pg_temp.cli(socia, rm, 'Helena Prado Souza') hel,
  pg_temp.cli(socia, rm, 'Ana Lima Duarte') ana,
  pg_temp.cli(socia, rm, 'Lia Moreira Menor') lia,
  pg_temp.cli(socia, rm, 'Irene Castro Lopes') irene,
  pg_temp.cli(socia, rm, 'Rui Antigo Matos') rui,
  pg_temp.cli(intrusa, outro, 'Helena Prado Souza') hom,
  pg_temp.cli(intrusa, outro, 'Jorge Antigo Reis') jorge
  from ids;

-- Propostas aceitas: Diego pede o contrato, e a sócia e Bianca (área Contratos) recebem o aviso.
create function pg_temp.aceita(p_cliente uuid, p_servico text, p_pedir boolean default true) returns uuid language plpgsql as $$
declare v uuid; i ids;
begin
  select * into i from ids;
  v := (portal_proposta_criar(i.diego, i.rm, jsonb_build_object('clienteId', p_cliente, 'servico', p_servico, 'escopo', 'Ação e acompanhamento.',
    'responsavelId', i.diego, 'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'FIXO', 'valor', 150000, 'vencimento', '2026-12-10')),
    'retorno', jsonb_build_object('em', '2026-11-30', 'responsavelId', i.diego))) ->> 'id')::uuid;
  perform portal_proposta_enviada(i.diego, i.rm, v, 1);
  perform portal_proposta_resposta(i.diego, i.rm, v, 2, jsonb_build_object('resposta', 'ACEITOU', 'em', '2026-11-24', 'canal', 'PRESENCIAL'));
  if p_pedir then perform portal_proposta_pedir_contrato(i.diego, i.rm, v); end if;
  return v;
end $$;
create temp table pr as select
  pg_temp.aceita(cli.hel, 'Divórcio de Helena Prado Souza') hel,
  pg_temp.aceita(cli.hel, 'Inventário do pai de Helena', false) hel_sem_pedido,
  pg_temp.aceita(cli.ana, 'Revisão do contrato de Ana Lima') ana,
  pg_temp.aceita(cli.rui, 'Despejo de Rui Antigo') rui
  from cli;

-- Bianca já leu o aviso de Helena (o lido também guarda o nome).
update avisos_sino set lido_em = app_now() - interval '5 minutes'
 where origem_id = (select hel from pr) and pessoa_id = (select bianca from ids);

-- O aviso dos 18 anos, posto direto (como depois do desfazer da importação; plano, R3).
select aviso_sino(rm, socia, null, 'CLIENTE_FEZ_18', 'clientes', cli.lia,
  jsonb_build_object('cliente', 'Lia Moreira Menor', 'em', '20/11/2026', 'quem', 'Rosa, a mãe')) from ids, cli;
-- O de outro escritório, para o homônimo, e o de Jorge (que sai pela 1111).
select aviso_sino(outro, intrusa, null, 'CLIENTE_FEZ_18', 'clientes', cli.hom,
  jsonb_build_object('cliente', 'Helena Prado Souza', 'em', '21/11/2026', 'quem', 'Rosa, a mãe')) from ids, cli;
select aviso_sino(outro, intrusa, null, 'CLIENTE_FEZ_18', 'clientes', cli.jorge,
  jsonb_build_object('cliente', 'Jorge Antigo Reis', 'em', '22/11/2026', 'quem', 'Ivo, o pai')) from ids, cli;
-- Avisos que não são de cliente: a automação e um aviso de caso que cita o mesmo nome (o caminho R3:
-- não se procura pelo nome, por causa do homônimo).
select aviso_sino(rm, socia, null, 'AUTOMACAO_SUGESTAO', 'automacoes', gen_random_uuid(),
  jsonb_build_object('automacao', 'Boas-vindas', 'quem', 'Diego Almeida', 'texto', 'Trocar o texto')) from ids;
select aviso_sino(rm, socia, null, 'CASO_PRONTO_FECHAR', 'casos', gen_random_uuid(),
  jsonb_build_object('cliente', 'Helena Prado Souza', 'caso', 'Prado x INSS')) from ids;

-- O levantamento de Irene num caso, e o desfazer da importação soltando Irene do caso (revisão, M2).
select portal_juridico_etapas(socia, rm) from ids;
create temp table cs as select (portal_juridico_caso_criar(socia, rm, jsonb_build_object('nome', 'Castro x INSS', 'area', 'PREVIDENCIARIO',
  'etapaId', (select id from etapas where escritorio_id = ids.rm and ordem = 7), 'responsavelId', ids.socia,
  'clientes', jsonb_build_array(jsonb_build_object('clienteId', cli.irene, 'papel', 'AUTOR')))) ->> 'id')::uuid id from ids, cli;
create temp table lv as select (portal_financeiro_levantamento_registrar(socia, rm, jsonb_build_object('tipo', 'RPV', 'casoId', cs.id,
  'clienteId', cli.irene, 'valor', 300000, 'entrouEm', '2026-11-12',
  'divisao', jsonb_build_array(jsonb_build_object('para', 'CLIENTE', 'valor', 300000)))) ->> 'id')::uuid id from ids, cs, cli;
select aviso_sino(rm, socia, null, 'REPASSE_ATRASADO', 'levantamentos', lv.id,
  jsonb_build_object('destinacao', gen_random_uuid(), 'parte', 'Irene Castro Lopes', 'cliente', 'Irene Castro Lopes', 'prazo', '2026-11-17', 'valor', 300000))
  from ids, lv;
delete from caso_clientes where cliente_id = (select irene from cli);

create temp table antes as select * from avisos_sino;

create function pg_temp.excluir(p_cliente uuid) returns jsonb language sql as $$
  select portal_cliente_excluir_dados(case when c.escritorio_id = ids.rm then ids.socia else ids.intrusa end, c.escritorio_id, p_cliente, c.versao,
    jsonb_build_object('pedidoEm', hoje_brasilia(), 'canal', 'TELEFONE', 'quemPediu', 'TITULAR', 'conferido', true, 'nomeConfirmado', c.nome))
    from clientes_escritorio c, ids where c.id = p_cliente
$$;

-- 1. A varredura travada (plano, seção 2): tipo ou origem nova cai aqui e precisa decidir se o
--    cliente do aviso pode ser excluído (aviso_sino_cliente e aviso_sino_dados_do_excluido).
select is((select array_agg(m[1] order by m[1]) from pg_constraint c, regexp_matches(pg_get_constraintdef(c.oid), '''([A-Z0-9_]+)''', 'g') m
            where c.conname = 'avisos_sino_tipo_check'),
  array['AUTOMACAO_SUGESTAO', 'BAIXA_RENEGOCIADA', 'BASE_DO_MES', 'CARNE_DESATUALIZADO', 'CASO_ABERTO_NA_ASSINATURA',
        'CASO_ENCERRADO_FINANCEIRO', 'CASO_PRONTO_FECHAR', 'CLIENTE_FEZ_18', 'CONTRATO_GERADO', 'CONVERSA_ASSUMIDA', 'CONVERSA_IA',
        'CONVERSA_PASSADA', 'DOCUMENTOS_INICIO_CHEGARAM', 'DOCUMENTO_CHEGOU', 'EXITO_NAO_COBRADO', 'EXITO_VALOR_MUDOU', 'EXPORTAR_CONTADOR',
        'MODELO_APROVADO', 'MODELO_RECUSADO', 'PEDIDO_CHAVE_PIX', 'PEDIDO_CONTRATO', 'PETICAO_DECIDIDA', 'PETICAO_PASSADA',
        'PETICAO_REVISAR', 'PRAZO_2_DIAS', 'REPASSE_ATRASADO', 'REPASSE_PASSADO', 'REPASSE_PROXIMA_ACAO'],
  'PT-11 F3.172: os 28 tipos do sino são os da varredura (tipo novo decide se cita cliente excluível)');
select is((select array_agg(m[1] order by m[1]) from pg_constraint c, regexp_matches(pg_get_constraintdef(c.oid), '''([a-z_]+)''', 'g') m
            where c.conname = 'avisos_sino_origem_tabela_check'),
  array['automacoes', 'casos', 'clientes', 'contratos', 'conversas', 'escritorios', 'levantamentos', 'peticoes', 'prazos', 'propostas'],
  'PT-11 F3.172: as 10 origens do sino são as da varredura (só clientes, propostas e levantamentos apontam para cliente excluível)');

select is((select count(*)::int from avisos_sino, pr where tipo = 'PEDIDO_CONTRATO' and origem_id = pr.hel and dados ->> 'cliente' = 'Helena Prado Souza'), 2,
  'antes da exclusão, a sócia e Bianca têm o aviso com o nome');

-- 2. A exclusão.
select pg_temp.excluir(hel) from cli;
select pg_temp.excluir(lia) from cli;
select pg_temp.excluir(irene) from cli;

select ok((select bool_and(a.dados ->> 'cliente' = 'Cliente excluído' and a.dados ->> 'servico' = servico_apagado_texto())
             from avisos_sino a, pr where a.origem_id = pr.hel),
  'PT-11 F3.172: na exclusão, o nome e o serviço do PEDIDO_CONTRATO viram o texto fixo, lido ou não');
select is((select count(*)::int from avisos_sino a, pr where a.origem_id = pr.hel), 2, 'PT-03 F3.172: o aviso não se apaga');
select ok((select bool_and((a.dados - 'cliente' - 'servico') = (b.dados - 'cliente' - 'servico') and a.dados ? 'condicoes' and a.dados ? 'proposta'
                           and a.dados ? 'aceita' and a.dados ? 'quem')
             from avisos_sino a join antes b using (id), pr where a.origem_id = pr.hel),
  'PT-11 F3.172: proposta, aceita, condições e quem pediu ficam como estavam');
select ok((select bool_and((to_jsonb(a) - 'dados') = (to_jsonb(b) - 'dados')) from avisos_sino a join antes b using (id), pr where a.origem_id = pr.hel),
  'PT-11 F3.172: lido_em, pessoa, tipo, origem e criado_em não mudam');
select ok((select a.lido_em = b.lido_em from avisos_sino a join antes b using (id), ids, pr where a.origem_id = pr.hel and a.pessoa_id = ids.bianca),
  'PT-11 F3.172: o aviso já lido também é trocado e continua lido');
select is((select nome from clientes_escritorio, cli where id = cli.hel),
  (select a.dados ->> 'cliente' from avisos_sino a, pr where a.origem_id = pr.hel limit 1),
  'PT-11 F3.172: o texto do aviso é o mesmo que a exclusão grava no nome do cliente');
select is((select a.dados from avisos_sino a, cli where a.origem_id = cli.lia), '{"cliente": "Cliente excluído"}'::jsonb,
  'PT-11 F3.172: no aviso dos 18 anos, o nome vira o texto fixo e saem a data e quem assinava');
select is((select a.dados from avisos_sino a, lv where a.origem_id = lv.id) - 'destinacao',
  '{"cliente": "Cliente excluído", "parte": "Irene Castro Lopes", "prazo": "2026-11-17", "valor": 300000}'::jsonb,
  'PT-11 F3.172: o aviso do levantamento troca o cliente; a parte fica para a F3.158');
select ok((select bool_and(a.dados = b.dados) from avisos_sino a join antes b using (id), pr, cli
            where a.origem_id in (pr.ana, pr.rui, cli.hom, cli.jorge) or a.origem_tabela in ('automacoes', 'casos')),
  'PT-11 F3.172: os avisos de outro cliente, de outro escritório (homônimo), da automação e do caso não mudam');
select is((select count(*)::int from avisos_sino a join antes b using (id) where a.dados is distinct from b.dados), 4,
  'PT-11 F3.172: só mudam os avisos dos três clientes excluídos (2 + 1 + 1)');
select is((select x -> 'dados' ->> 'cliente' from ids, pr, jsonb_array_elements(portal_avisos(bianca, rm) -> 'itens') x
            where (x ->> 'origemId')::uuid = pr.hel),
  'Cliente excluído', 'PT-11 F3.172: o sino de Bianca mostra o texto fixo');
select is((select count(*)::int from historico where dados::text like '%Helena Prado%' or dados::text like '%Lia Moreira%'), 0,
  'PT-03 F3.172: a troca não leva o nome para o histórico');

-- 3. A troca é idempotente.
select ok((select bool_and(aviso_sino_dados_do_excluido(a) = aviso_sino_dados_do_excluido((a.id, a.escritorio_id, a.pessoa_id, a.tipo,
             aviso_sino_dados_do_excluido(a), a.origem_tabela, a.origem_id, a.criado_em, a.lido_em)::avisos_sino)) from avisos_sino a),
  'PT-11 F3.172: aplicada duas vezes, a troca dá o mesmo');
select is(avisos_sino_excluido_limpar((select rm from ids), (select hel from cli)), 0, 'PT-11 F3.172: rodar a troca de novo não muda nada');

-- 4. O guardião. Um aviso de Helena com o nome ainda (posto sem o gatilho do nascer, como antes da 1110).
alter table avisos_sino disable trigger avisos_sino_nasce;
select aviso_sino(rm, socia, null, 'PEDIDO_CONTRATO', 'propostas', pr.hel,
  jsonb_build_object('proposta', 9, 'servico', 'Divórcio de Helena', 'cliente', 'Helena Prado Souza', 'quem', 'Diego Almeida')) from ids, pr;
-- E um aviso do outro escritório apontando para Lia, que é do escritório Ribeiro & Matos (revisão, m2).
select aviso_sino(outro, intrusa, null, 'CLIENTE_FEZ_18', 'clientes', cli.lia,
  jsonb_build_object('cliente', 'Lia Moreira Menor', 'em', '20/11/2026')) from ids, cli;
alter table avisos_sino enable trigger avisos_sino_nasce;
create temp table g as select
  (select id from avisos_sino, pr where origem_id = pr.hel and dados ->> 'cliente' = 'Helena Prado Souza') hel,
  (select id from avisos_sino, ids where escritorio_id = ids.outro and origem_id = (select lia from cli)) fora,
  (select id from avisos_sino, ids, pr where origem_id = pr.ana and pessoa_id = ids.socia) ana;

select is((teste.erro($$ update avisos_sino set dados = dados || '{"cliente": "Outro nome"}' where id = (select hel from g) $$)) ->> 'codigo', 'TC023',
  'PT-11 F3.172: em aviso de cliente excluído, outro valor nos dados é recusado');
select is((teste.erro($$ update avisos_sino set dados = aviso_sino_dados_do_excluido(avisos_sino), lido_em = app_now() where id = (select hel from g) $$)) ->> 'codigo',
  'TC023', 'PT-11 F3.172: a troca certa junto com o lido é recusada');
select is((teste.erro($$ update avisos_sino set dados = aviso_sino_dados_do_excluido(avisos_sino) where id = (select ana from g) $$)) ->> 'codigo', 'TC023',
  'PT-11 F3.172: a troca em aviso de cliente ativo é recusada');
select is((teste.erro($$ update avisos_sino set dados = aviso_sino_dados_do_excluido(avisos_sino) where id = (select fora from g) $$)) ->> 'codigo', 'TC023',
  'PT-11 F3.172: a troca em aviso de outro escritório apontando para cliente excluído é recusada');
select is((teste.erro($$ update avisos_sino set dados = aviso_sino_dados_do_excluido(avisos_sino) where id = (select hel from g) $$)), null,
  'PT-11 F3.172: a troca certa, sozinha, passa');
select is((select dados ->> 'cliente' from avisos_sino, g where id = g.hel), 'Cliente excluído', 'a troca ficou');
select is((teste.erro($$ update avisos_sino set dados = dados || '{"servico": "Outro"}' where id = (select hel from g) $$)) ->> 'codigo', 'TC023',
  'PT-11 F3.172: depois da troca, os dados não mudam mais');
select is((teste.erro($$ delete from avisos_sino where id = (select hel from g) $$)) ->> 'codigo', 'TC023', 'PT-03 F3.172: apagar continua recusado');
select is((teste.erro($$ select portal_aviso_lido(socia, rm, g.hel) from ids, g $$)), null, 'PT-03 F3.172: marcar como lido continua funcionando');
select is((teste.erro($$ update avisos_sino set lido_em = app_now() + interval '1 minute' where id = (select hel from g) $$)) ->> 'codigo', 'TC023',
  'PT-03 F3.172: a segunda marca de lido é recusada');
select is((teste.erro($$ update avisos_sino set dados = dados || '{"cliente": "Cliente excluído"}' where id = (select ana from g) $$)) ->> 'codigo',
  'TC023', 'PT-03 F3.172: em aviso de cliente ativo, os dados continuam sem mudar');

-- 5. O aviso que nasce de cliente já excluído nasce com a troca.
select portal_proposta_pedir_contrato(diego, rm, pr.hel_sem_pedido) from ids, pr;
select ok((select count(*) = 2 and bool_and(dados ->> 'cliente' = 'Cliente excluído' and dados ->> 'servico' = servico_apagado_texto())
             from avisos_sino, pr where origem_id = pr.hel_sem_pedido),
  'PT-11 F3.172: pedir o contrato da proposta aceita do cliente já excluído gera o aviso com o texto fixo (A1 fica na F3.178)');
select aviso_sino(rm, diego, null, 'CONTRATO_GERADO', 'propostas', pr.hel,
  jsonb_build_object('contrato', 7, 'proposta', 9, 'servico', 'Divórcio de Helena', 'cliente', 'Helena Prado Souza', 'quem', 'Bianca Torres')) from ids, pr;
select is((select dados from avisos_sino, pr where tipo = 'CONTRATO_GERADO' and origem_id = pr.hel),
  jsonb_build_object('contrato', 7, 'proposta', 9, 'servico', servico_apagado_texto(), 'cliente', 'Cliente excluído', 'quem', 'Bianca Torres'),
  'PT-11 F3.172: o CONTRATO_GERADO de cliente excluído (a corrida da F3.180) nasce com o texto fixo');
select aviso_sino(rm, socia, null, 'CLIENTE_FEZ_18', 'clientes', cli.lia,
  jsonb_build_object('cliente', 'Lia Moreira Menor', 'em', '20/11/2026', 'quem', 'Rosa, a mãe')) from ids, cli;
select is((select array_agg(dados) from avisos_sino, ids, cli where origem_id = cli.lia and escritorio_id = ids.rm and id not in (select id from antes)),
  array['{"cliente": "Cliente excluído"}'::jsonb], 'PT-11 F3.172: o aviso dos 18 anos novo de cliente excluído nasce sem a data e sem quem assinava');
insert into avisos_sino (escritorio_id, pessoa_id, tipo, dados, origem_tabela, origem_id)
select rm, socia, 'REPASSE_PROXIMA_ACAO', jsonb_build_object('anotacao', gen_random_uuid(), 'parte', 'Irene Castro Lopes', 'cliente', 'Irene Castro Lopes'),
       'levantamentos', lv.id from ids, lv;
select is((select dados ->> 'cliente' from avisos_sino, lv where tipo = 'REPASSE_PROXIMA_ACAO' and origem_id = lv.id), 'Cliente excluído',
  'PT-11 F3.172: a inserção direta (fora de aviso_sino) também passa pelo nascer');
select aviso_sino(outro, intrusa, null, 'CLIENTE_FEZ_18', 'clientes', cli.lia, jsonb_build_object('cliente', 'Nome de fora')) from ids, cli;
select is((select count(*)::int from avisos_sino, ids, cli where escritorio_id = ids.outro and origem_id = cli.lia and dados = '{"cliente": "Nome de fora"}'),
  1, 'PT-11 F3.172: o nascer não olha cliente de outro escritório');
select is((select dados ->> 'cliente' from avisos_sino, pr, ids where origem_id = pr.ana and pessoa_id = ids.socia), 'Ana Lima Duarte',
  'PT-11 F3.172: o aviso de cliente ativo nasce como sempre');

-- 6. Os clientes excluídos antes da 1110 (a 1111): Rui e Jorge são excluídos sem o gatilho.
alter table clientes_escritorio disable trigger sino_apagar_do_excluido;
select pg_temp.excluir(rui) from cli;
select pg_temp.excluir(jorge) from cli;
alter table clientes_escritorio enable trigger sino_apagar_do_excluido;
select is((select count(*)::int from avisos_sino, pr, cli where origem_id in (pr.rui, cli.jorge) and dados ->> 'cliente' like '%Antigo%'), 3,
  'sem o gatilho, os avisos ficam com o nome (o caso de antes da 1110)');
-- O escritório Ribeiro & Matos fica só para consulta (revisão, M1).
update escritorios set contrato_fim_em = hoje_brasilia() - 1 from ids where escritorios.id = ids.rm;
-- (fim_da_guarda só para o superusuário do teste ver as linhas de qualquer escritório, como a função vê)
select set_config('t3jus.fim_da_guarda', 'on', true);
select is((teste.erro($$ update avisos_sino set dados = aviso_sino_dados_do_excluido(avisos_sino)
                           where origem_id = (select rui from pr) and pessoa_id = (select socia from ids) $$)) ->> 'codigo', 'TC401',
  'sem a marca aplicando_prazos, o escritório só de consulta recusa a troca');
select set_config('t3jus.fim_da_guarda', '', true);

grant select on ids, cli, pr to dominio;
set local role dominio;
create temp table pre1 as select avisos_sino_preencher_excluidos() j;
create temp table pre2 as select avisos_sino_preencher_excluidos() j;
create temp table marcas as select coalesce(current_setting('t3jus.fim_da_guarda', true), '') fg, coalesce(current_setting('t3jus.aplicando_prazos', true), '') ap;
reset role;
select is((select j from pre1), jsonb_build_object(
    (select rm from ids)::text, '{"clientes": 1, "avisos": 2}'::jsonb,
    (select outro from ids)::text, '{"clientes": 1, "avisos": 1}'::jsonb),
  'PT-11 F3.172: o preenchimento conta por escritório, também no escritório só de consulta');
select is((select j from pre2), '{}'::jsonb, 'PT-11 F3.172: rodar de novo não muda nada (idempotente)');
select ok((select fg in ('', 'off') and ap in ('', 'off') from marcas), 'PT-11 F3.172: as marcas da rotina voltam como estavam');
select ok((select bool_and(dados ->> 'cliente' = 'Cliente excluído' and dados ->> 'servico' = servico_apagado_texto()) from avisos_sino, pr where origem_id = pr.rui),
  'PT-11 F3.172: os avisos de Rui ficam com o texto fixo');
select is((select dados from avisos_sino, cli where origem_id = cli.jorge), '{"cliente": "Cliente excluído"}'::jsonb,
  'PT-11 F3.172: o aviso dos 18 anos de Jorge fica sem o nome, a data e quem assinava');
select ok((select bool_and(a.dados = b.dados) from avisos_sino a join antes b using (id), pr, cli
            where a.origem_id in (pr.ana, cli.hom) or a.origem_tabela in ('automacoes', 'casos')),
  'PT-11 F3.172: o preenchimento não mexe em aviso de cliente ativo');

-- 7. O gatilho no lugar certo.
select is((select array_agg(tgname::text order by tgname) from pg_trigger
            where tgrelid = 'clientes_escritorio'::regclass and not tgisinternal and tgname ~ '(apagar_do_excluido|excluido_arquivos)$'),
  array['comercial_apagar_do_excluido', 'financeiro_apagar_do_excluido', 'sino_apagar_do_excluido', 'z_cliente_excluido_arquivos'],
  'PT-11 F3.172: sino_apagar_do_excluido roda entre financeiro_ e z_, pela ordem do nome');
select ok((select pg_get_triggerdef(oid) like '%AFTER UPDATE OF estado ON public.clientes_escritorio FOR EACH ROW WHEN (((new.estado = ''EXCLUIDO''::text) AND (old.estado <> ''EXCLUIDO''::text)))%'
             from pg_trigger where tgname = 'sino_apagar_do_excluido'),
  'PT-11 F3.172: o gatilho é AFTER UPDATE OF estado, só na passagem a EXCLUIDO');

-- 8. Inventário (PT-11).
select ok((select no_fim like '%texto fixo%' and no_fim like '%18 anos%' and situacao = 'APROVADO' from inventario_dados where tabela = 'avisos_sino'),
  'PT-11 F3.172 inventário: os avisos citam o texto fixo e o aviso dos 18 anos');
select ok((select length(no_fim) <= 200 from inventario_dados where tabela = 'avisos_sino'), 'PT-11 F3.172 inventário: o texto cabe em 200 letras');

-- 9. Acesso: a API não chama as funções novas de escrita.
select ok(not has_function_privilege('service_role', 'avisos_sino_preencher_excluidos()', 'execute')
          and not has_function_privilege('service_role', 'avisos_sino_excluido_limpar(uuid,uuid)', 'execute'),
  'PT-02 F3.172: a API não chama o preenchimento nem a troca');

select * from finish();
rollback;
