-- O histórico financeiro importado do cliente excluído a pedido do titular (1116 e 1117; F3.177,
-- PT-11, VA-05, PT-03): a descrição dos lançamentos do sistema antigo (pagos e em aberto) e o detalhe
-- escrito ao dispensar o lembrete ficam guardados até o marco fiscal (1º de janeiro de ano + 2 + 5;
-- sem data, o ano da importação; o detalhe, o maior marco dos lançamentos que explica) e viram texto
-- fixo; o desfeito e o vencido trocam na hora; a rotina da noite troca no marco sem depender da
-- 1117; o guardião; a ficha com arquivosQueFicam.historico; as travas M1, M2 e M6.
begin;
select plan(72);

select ajustar_relogio(('2026-11-26 10:00-03'::timestamptz - now()));
-- A saída das entradas sem acesso (0540) não entra neste teste: o relógio anda anos.
update inventario_dados set situacao = 'PROPOSTA' where tabela = 'pessoas';

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Felipe Matos') as felipe,
  teste.pessoa('Intrusa Souza') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, felipe, 'Felipe Matos', array['CONTRATOS']) from ids;

-- O backup do Astrea: os contatos e os lançamentos (sem processos, para os clientes serem excluíveis).
create function pg_temp.backup(p_contatos jsonb, p_lanc jsonb) returns jsonb language sql as $$
  select jsonb_build_object(
    'arquivoNome', 'backup-astrea.xlsx', 'oQue', 'CLIENTES', 'origem', 'ASTREA', 'modelo', 'astrea-2026-11',
    'abas', jsonb_build_array(
      jsonb_build_object('nome', 'Contatos', 'colunas', jsonb_build_array('Nome', 'Tipo', 'Celular'), 'linhas', p_contatos),
      jsonb_build_object('nome', 'Lançamentos', 'colunas', jsonb_build_array('Data', 'Cliente', 'Processo', 'Descrição', 'Valor', 'Situação', 'Tipo'),
        'linhas', p_lanc)),
    'sistema', jsonb_build_array(
      jsonb_build_object('nome', 'Contatos', 'linhas', jsonb_array_length(p_contatos), 'destino', 'CLIENTES', 'reconhecida', true,
                         'porModelo', jsonb_build_object('0', 'nome', '1', 'tipo_contato', '2', 'telefone')),
      jsonb_build_object('nome', 'Lançamentos', 'linhas', jsonb_array_length(p_lanc), 'destino', 'FINANCEIRO', 'reconhecida', true,
                         'porModelo', jsonb_build_object('0', 'lanc_data', '1', 'cliente', '2', 'numero', '3', 'lanc_descricao', '4', 'lanc_valor',
                                                         '5', 'lanc_situacao', '6', 'lanc_tipo'))))
$$;
-- Importa os clientes e o financeiro e devolve o id da importação do financeiro.
create function pg_temp.importar(p_d jsonb) returns uuid language plpgsql as $$
declare
  v uuid;
  j jsonb;
  f uuid;
begin
  j := portal_importacao_criar((select socia from ids), (select rm from ids), p_d);
  v := (j ->> 'id')::uuid;
  perform portal_importacao_colunas((select socia from ids), (select rm from ids), v, (select versao from importacoes where id = v),
    jsonb_build_object('aba', 0, 'ligacao', j -> 'ligacao'));
  f := (portal_importacao_importar((select socia from ids), (select rm from ids), v, (select versao from importacoes where id = v)) -> 'filhaFinanceiro' ->> 'id')::uuid;
  perform portal_importacao_colunas((select socia from ids), (select rm from ids), f, (select versao from importacoes where id = f),
    jsonb_build_object('ligacao', (select ligacao from importacoes where id = f)));
  perform portal_importacao_importar((select socia from ids), (select rm from ids), f, (select versao from importacoes where id = f));
  return f;
end $$;

create temp table fin as select pg_temp.importar(pg_temp.backup(
  jsonb_build_array(
    jsonb_build_array('Ana Souza Lima', 'Cliente', '(11) 97012-3348'),
    jsonb_build_array('Bia Reis Prado', 'Cliente', '(11) 98841-2073'),
    jsonb_build_array('Cris Moura Dias', 'Cliente', '(11) 96231-0457'),
    jsonb_build_array('Dora Antiga Leite', 'Cliente', '(11) 95555-1234'),
    jsonb_build_array('Eva Ativa Nunes', 'Cliente', '(11) 94444-1234')),
  jsonb_build_array(
    jsonb_build_array('10/03/2026', 'Ana Souza Lima', '', 'Honorários de Ana, parcela 1', '1.000,00', 'Pago', 'Receita'),
    jsonb_build_array('15/05/2018', 'Ana Souza Lima', '', 'Consulta antiga de Ana', '300,00', 'Pago', 'Receita'),
    jsonb_build_array('', 'Ana Souza Lima', '', 'Acordo sem data de Ana', '500,00', 'Pago', 'Receita'),
    jsonb_build_array('05/10/2025', 'Ana Souza Lima', '', 'Parcela em aberto de Ana', '800,00', 'Em aberto', 'Receita'),
    jsonb_build_array('20/01/2024', 'Bia Reis Prado', '', 'Honorários de Bia', '700,00', 'Em aberto', 'Receita'),
    jsonb_build_array('20/11/2026', 'Bia Reis Prado', '', 'Pagamento de Bia', '400,00', 'Pago', 'Receita'),
    jsonb_build_array('10/02/2026', 'Dora Antiga Leite', '', 'Honorários de Dora', '600,00', 'Pago', 'Receita'),
    jsonb_build_array('10/02/2019', 'Dora Antiga Leite', '', 'Consulta de Dora', '200,00', 'Pago', 'Receita'),
    jsonb_build_array('10/03/2026', 'Eva Ativa Nunes', '', 'Honorários de Eva', '900,00', 'Em aberto', 'Receita')))) id;
-- A segunda importação, para o desfazer (Fabio e Gil).
create temp table fin2 as select pg_temp.importar(pg_temp.backup(
  jsonb_build_array(
    jsonb_build_array('Fabio Desfeito Rocha', 'Cliente', '(11) 93333-1234'),
    jsonb_build_array('Gil Guardado Melo', 'Cliente', '(11) 92222-1234')),
  jsonb_build_array(
    jsonb_build_array('12/04/2026', 'Fabio Desfeito Rocha', '', 'Honorários de Fabio', '500,00', 'Pago', 'Receita'),
    jsonb_build_array('12/04/2026', 'Gil Guardado Melo', '', 'Honorários de Gil', '450,00', 'Pago', 'Receita')))) id;

create temp table cli as select
  (select id from clientes_escritorio where nome = 'Ana Souza Lima' and escritorio_id = ids.rm) ana,
  (select id from clientes_escritorio where nome = 'Bia Reis Prado' and escritorio_id = ids.rm) bia,
  (select id from clientes_escritorio where nome = 'Cris Moura Dias' and escritorio_id = ids.rm) cris,
  (select id from clientes_escritorio where nome = 'Dora Antiga Leite' and escritorio_id = ids.rm) dora,
  (select id from clientes_escritorio where nome = 'Eva Ativa Nunes' and escritorio_id = ids.rm) eva,
  (select id from clientes_escritorio where nome = 'Fabio Desfeito Rocha' and escritorio_id = ids.rm) fabio,
  (select id from clientes_escritorio where nome = 'Gil Guardado Melo' and escritorio_id = ids.rm) gil,
  (portal_cliente_cadastrar(intrusa, outro, jsonb_build_object('tipo', 'PF', 'origem', 'GOOGLE', 'nome', 'Joana Pereira',
    'contatos', jsonb_build_array(jsonb_build_object('nome', 'Contato', 'telefone', '+5511984723316', 'principal', true)))) ->> 'id')::uuid joa
  from ids;
create temp table h as select
  (select id from historico_financeiro_anterior, cli where cliente_id = cli.ana and data = '2026-03-10') ana26,
  (select id from historico_financeiro_anterior, cli where cliente_id = cli.ana and data = '2018-05-15') ana18,
  (select id from historico_financeiro_anterior, cli where cliente_id = cli.ana and data is null) ana_sem,
  (select id from historico_financeiro_anterior, cli where cliente_id = cli.ana and situacao = 'EM_ABERTO') ana_ab,
  (select id from historico_financeiro_anterior, cli where cliente_id = cli.bia and data = '2024-01-20') bia24,
  (select id from historico_financeiro_anterior, cli where cliente_id = cli.bia and data = '2026-11-20') bia26,
  (select id from historico_financeiro_anterior, cli where cliente_id = cli.dora and data = '2026-02-10') dora26,
  (select id from historico_financeiro_anterior, cli where cliente_id = cli.dora and data = '2019-02-10') dora19,
  (select id from historico_financeiro_anterior, cli where cliente_id = cli.eva) eva,
  (select id from historico_financeiro_anterior, cli where cliente_id = cli.fabio) fabio,
  (select id from historico_financeiro_anterior, cli where cliente_id = cli.gil) gil
  from cli;
create temp table lm as select
  (select id from lembrete_contrato, cli where cliente_id = cli.ana) ana,
  (select id from lembrete_contrato, cli where cliente_id = cli.bia) bia,
  (select id from lembrete_contrato, cli where cliente_id = cli.eva) eva
  from cli;
-- Bia dispensa o lembrete com o detalhe escrito.
select portal_lembrete_dispensar(felipe, rm, lm.bia, '{"motivo": "OUTRO", "detalhe": "Bia pagou em dinheiro ao Dr. José"}') from ids, lm;

-- Joana, no outro escritório: um lançamento de 2018 (vencido), posto direto numa importação de lá.
create temp table imp_outro as select (portal_importacao_criar(intrusa, outro, jsonb_build_object('arquivoNome', 'p.xlsx', 'oQue', 'CLIENTES',
  'abas', jsonb_build_array(jsonb_build_object('nome', 'A', 'colunas', jsonb_build_array('Nome'), 'linhas', jsonb_build_array(jsonb_build_array('X'))))))
  ->> 'id')::uuid id from ids;
insert into historico_financeiro_anterior (escritorio_id, importacao_id, linha, cliente_id, data, descricao, valor_centavos, situacao, origem)
  select outro, imp_outro.id, 2, cli.joa, '2018-03-01', 'Honorários de Joana', 10000, 'PAGO', 'ASTREA' from ids, imp_outro, cli;

create function pg_temp.excluir(p_cliente uuid) returns jsonb language sql as $$
  select portal_cliente_excluir_dados(case when c.escritorio_id = ids.rm then ids.socia else ids.intrusa end, c.escritorio_id, p_cliente, c.versao,
    jsonb_build_object('pedidoEm', hoje_brasilia(), 'canal', 'TELEFONE', 'quemPediu', 'TITULAR', 'conferido', true, 'nomeConfirmado', c.nome))
    from clientes_escritorio c, ids where c.id = p_cliente
$$;
create function pg_temp.desc(p uuid) returns text language sql as $$ select descricao from historico_financeiro_anterior where id = p $$;

-- 1. As peças.
select ok((select count(*) = 16 and bool_and(not prosecdef) from pg_proc where proname in ('historico_anterior_descricao_excluido',
             'lembrete_detalhe_excluido', 'historico_anterior_guardada', 'historico_anterior_guarda_ate', 'historico_anterior_vencida',
             'lembrete_detalhe_guarda_ate', 'lembrete_detalhe_vencido', 'historico_anterior_guarda', 'lembrete_detalhe_guarda',
             'historico_anterior_nasce', 'lembrete_contrato_nasce', 'historico_anterior_excluido_limpar', 'cliente_historico_anterior_que_fica',
             'historico_anterior_apagar_do_excluido', 'prazo_fiscal_historico_aplicar', 'historico_anterior_preencher_excluidos')),
  'PT-11 F3.177: as funções novas existem e nenhuma é security definer');
select ok(not has_function_privilege('service_role', 'prazo_fiscal_historico_aplicar()', 'execute')
          and not has_function_privilege('service_role', 'historico_anterior_preencher_excluidos()', 'execute')
          and not has_function_privilege('service_role', 'cliente_historico_anterior_que_fica(uuid, uuid)', 'execute'),
  'PT-02 F3.177: a API não chama a rotina, o preenchimento nem a contagem direto');
select is(array[historico_anterior_descricao_excluido(), lembrete_detalhe_excluido()],
  array['Lançamento do sistema antigo de cliente excluído', 'Detalhe apagado a pedido do titular'], 'PT-11 F3.177: os textos fixos');
select is(array[length(historico_anterior_descricao_excluido()), length(lembrete_detalhe_excluido()), configuracao_int('prazo_fiscal_anos')],
  array[48, 35, 5], 'PT-11 F3.177: os textos cabem nos checks (1 a 300 e 3 a 140) e o prazo fiscal continua 5 anos');

-- 2. O marco.
select is((select historico_anterior_guarda_ate(x) from historico_financeiro_anterior x, h where x.id = h.ana26), date '2033-01-01',
  'PT-11 F3.177: pago em 10/03/2026, troca em 01/01/2033');
select is((select historico_anterior_guarda_ate(x) from historico_financeiro_anterior x, h where x.id = h.bia26), date '2033-01-01',
  'PT-11 F3.177: pago em 20/11/2026, também em 01/01/2033');
select is((select historico_anterior_guarda_ate(x) from historico_financeiro_anterior x, h where x.id = h.ana_sem), date '2033-01-01',
  'PT-11 F3.177: sem data, conta o ano da importação (2026; alternativa A do desenho)');
select is((select historico_anterior_guarda_ate(x) from historico_financeiro_anterior x, h where x.id = h.ana_ab), date '2032-01-01',
  'PT-11 F3.177: o em aberto de 2025 tem marco, como o pago (01/01/2032)');
select is((select lembrete_detalhe_guarda_ate(l) from lembrete_contrato l, lm where l.id = lm.bia), date '2031-01-01',
  'PT-11 F3.177: o detalhe da dispensa segue o marco dos lançamentos em aberto que explica (2024, não o ano da dispensa)');
update configuracoes set valor = '6' where chave = 'prazo_fiscal_anos';
select is((select historico_anterior_guarda_ate(x) from historico_financeiro_anterior x, h where x.id = h.ana26), date '2034-01-01',
  'PT-11 F3.177: o prazo vem de configuracoes');
update configuracoes set valor = '5' where chave = 'prazo_fiscal_anos';

-- 3. A ficha, antes da exclusão (o desenho: lançamentos sem as desfeitas e sem as vencidas).
create temp table ficha_ana as select portal_cliente(socia, rm, cli.ana) -> 'arquivosQueFicam' -> 'historico' j from ids, cli;
create temp table ficha_bia as select portal_cliente(socia, rm, cli.bia) -> 'arquivosQueFicam' -> 'historico' j from ids, cli;
select is((select j from ficha_ana), '{"lancamentos": 3, "detalhes": 0, "semData": 1, "origem": "ASTREA", "ate": "2033-01-01"}'::jsonb,
  'PT-11 F3.177: Ana: 3 lançamentos ficam (sem o de 2018, já vencido), 1 sem data, até 01/01/2033');
select is((select j from ficha_bia), '{"lancamentos": 2, "detalhes": 1, "semData": 0, "origem": "ASTREA", "ate": "2033-01-01"}'::jsonb,
  'PT-11 F3.177: Bia: 2 lançamentos e o detalhe da dispensa, até a maior data');
select ok((select not (portal_cliente(socia, rm, cli.cris) -> 'arquivosQueFicam' ? 'historico') from ids, cli),
  'PT-11 F3.177: sem lançamento, a chave historico não vem (o objeto da F3.156 fica igual)');
select is((select portal_cliente(socia, rm, cli.cris) -> 'arquivosQueFicam' from ids, cli),
  '{"despesas": 0, "comArquivo": 0, "arquivos": 0, "pastas": 0, "ate": null}'::jsonb, 'PT-11 F3.177: o objeto da F3.156 não muda');
select ok((select not (portal_cliente(felipe, rm, cli.ana) ? 'arquivosQueFicam') from ids, cli),
  'PT-11 F3.177: quem não é a dona não recebe a contagem');
select is((select cliente_historico_anterior_que_fica(rm, cli.ana) ->> 'origem' from ids, cli), 'ASTREA', 'PT-11 F3.177: um sistema só, a origem vem');

-- 4. A exclusão de Ana, Bia e Cris; Dora é excluída sem o gatilho, como antes da 1116.
create temp table antes as select * from historico_financeiro_anterior;
create temp table lem_antes as select * from lembrete_contrato;
alter table clientes_escritorio disable trigger historico_anterior_apagar_do_excluido;
select pg_temp.excluir(cli.dora) from cli;
alter table clientes_escritorio enable trigger historico_anterior_apagar_do_excluido;
select pg_temp.excluir(cli.ana) from cli;
select pg_temp.excluir(cli.bia) from cli;
select pg_temp.excluir(cli.cris) from cli;

select is((select array[pg_temp.desc(ana26), pg_temp.desc(ana_sem), pg_temp.desc(ana_ab)] from h),
  array['Honorários de Ana, parcela 1', 'Acordo sem data de Ana', 'Parcela em aberto de Ana'],
  'PT-11 F3.177: o pago, o sem data e o em aberto no prazo ficam como vieram (C1 = guardar até o marco)');
select is((select pg_temp.desc(ana18) from h), historico_anterior_descricao_excluido(),
  'PT-11 F3.177: o pagamento de 2018 já passou do marco (01/01/2025) e troca na hora');
select ok((select bool_and((to_jsonb(x) - 'descricao') = (to_jsonb(a) - 'descricao')) from historico_financeiro_anterior x join antes a using (id)),
  'PT-11 F3.177: data, valor, situação, origem, linha, caso e desfeito_em ficam iguais em todas as linhas');
select ok((select bool_and(x.descricao = a.descricao) from historico_financeiro_anterior x join antes a using (id), h
            where x.id not in (h.ana18)),
  'PT-11 F3.177: nenhuma outra descrição muda (Dora, Eva, Fabio, Gil e Joana, no outro escritório)');
select is((select dispensa_detalhe from lembrete_contrato, lm where id = lm.bia), 'Bia pagou em dinheiro ao Dr. José',
  'PT-11 F3.177: o detalhe da dispensa fica até o marco dos lançamentos dele (01/01/2031)');
select ok((select bool_and((to_jsonb(l) - 'dispensa_detalhe') = (to_jsonb(a) - 'dispensa_detalhe')) from lembrete_contrato l join lem_antes a using (id)),
  'PT-11 F3.177: o lembrete não muda em mais nada (o motivo fica)');

-- 5. O evento, sem dado pessoal.
select is((select dados from historico, cli where acao = 'cliente.historico_anterior_guardado' and entidade_id = cli.ana::text),
  '{"trocados": 1, "guardados": 3, "detalhesTrocados": 0, "detalhesGuardados": 0, "ate": "2033-01-01"}'::jsonb,
  'PT-11 F3.177: Ana: o evento diz quantos trocaram, quantos ficam e até quando');
select is((select dados from historico, cli where acao = 'cliente.historico_anterior_guardado' and entidade_id = cli.bia::text),
  '{"trocados": 0, "guardados": 2, "detalhesTrocados": 0, "detalhesGuardados": 1, "ate": "2033-01-01"}'::jsonb,
  'PT-11 F3.177: Bia: o detalhe guardado entra no evento');
select ok(not exists (select 1 from historico, cli where acao = 'cliente.historico_anterior_guardado' and entidade_id in (cli.cris::text, cli.dora::text)),
  'PT-11 F3.177: sem lançamento, sem evento (e Dora, excluída antes, ainda não tem)');
select is((select ficha_ana.j -> 'ate' from ficha_ana), (select dados -> 'ate' from historico, cli
            where acao = 'cliente.historico_anterior_guardado' and entidade_id = cli.ana::text),
  'PT-11 F3.177: a data da ficha é a que a exclusão guarda');
select is((select (ficha_ana.j ->> 'lancamentos')::integer from ficha_ana), (select (dados ->> 'guardados')::integer from historico, cli
            where acao = 'cliente.historico_anterior_guardado' and entidade_id = cli.ana::text),
  'PT-11 F3.177: os lançamentos da ficha são os que a exclusão guarda');

-- 6. As leituras: a folha "Sistema antigo" do excluído não mostra nada; a do ativo não muda.
select is((select portal_cliente_anterior(socia, rm, cli.ana) from ids, cli), '{"anterior": null}'::jsonb,
  'PT-11 F3.177: guardar não é mostrar: a ficha do excluído não lê a descrição guardada');
select is((select portal_cliente_anterior(socia, rm, cli.eva) -> 'anterior' -> 'lancamentos' -> 0 ->> 'descricao' from ids, cli), 'Honorários de Eva',
  'PT-11 F3.177: a do cliente ativo continua');

-- 7. O guardião.
select throws_ok($$ delete from historico_financeiro_anterior where id = (select eva from h) $$, 'TC023', null,
  'PT-03 F3.177: lançamento do sistema antigo não se apaga');
select throws_ok($$ update historico_financeiro_anterior set valor_centavos = 1 where id = (select ana26 from h) $$, 'TC023', null,
  'PT-03 F3.177: o valor não muda');
select throws_ok($$ update historico_financeiro_anterior set descricao = historico_anterior_descricao_excluido() where id = (select eva from h) $$, 'TC023', null,
  'PT-11 F3.177: o texto fixo não entra no cliente ativo');
select throws_ok($$ update historico_financeiro_anterior set descricao = historico_anterior_descricao_excluido() where id = (select ana26 from h) $$, 'TC023', null,
  'PT-11 F3.177: nem no excluído antes do marco (a decisão C1 é guardar)');
select throws_ok($$ update historico_financeiro_anterior set descricao = 'Outra coisa' where id = (select ana18 from h) $$, 'TC023', null,
  'PT-11 F3.177: a descrição trocada não muda mais');
alter table historico_financeiro_anterior disable trigger historico_anterior_nasce;
insert into historico_financeiro_anterior (escritorio_id, importacao_id, linha, cliente_id, data, descricao, valor_centavos, situacao, origem)
  select outro, imp_outro.id, 3, cli.ana, '2018-03-01', 'Linha do outro escritório', 10000, 'PAGO', 'ASTREA' from ids, imp_outro, cli;
alter table historico_financeiro_anterior enable trigger historico_anterior_nasce;
select throws_ok($$ update historico_financeiro_anterior set descricao = historico_anterior_descricao_excluido() where linha = 3 and descricao = 'Linha do outro escritório' $$,
  'TC023', null, 'PT-01 F3.177: o cliente excluído precisa ser do mesmo escritório da linha (revisão, m3)');
select lives_ok($$ update historico_financeiro_anterior set desfeito_em = app_now() where linha = 3 and descricao = 'Linha do outro escritório' $$,
  'PT-03 F3.177: o desfeito_em entra, com o resto igual');
select throws_ok($$ update lembrete_contrato set dispensa_detalhe = lembrete_detalhe_excluido() where id = (select bia from lm) $$, 'TC023', null,
  'PT-11 F3.177: o detalhe não vira o texto fixo antes do marco');

-- 8. M2: dispensar e trazer de volta do excluído são recusados; os do ativo continuam.
select is((teste.erro($$ select portal_lembrete_dispensar(felipe, rm, lm.ana, '{"motivo": "PERDOADO"}') from ids, lm $$)) -> 'detalhe' ->> 'motivo',
  'CLIENTE_EXCLUIDO', 'PT-11 F3.177 M2: dispensar o lembrete do excluído é recusado (nenhum texto livre novo)');
select is((teste.erro($$ select portal_lembrete_trazer(felipe, rm, lm.bia) from ids, lm $$)) -> 'detalhe' ->> 'motivo',
  'CLIENTE_EXCLUIDO', 'PT-11 F3.177 M2: trazer de volta o do excluído também, com o motivo');
select is((select portal_lembrete_dispensar(felipe, rm, lm.eva, '{"motivo": "OUTRO", "detalhe": "Eva negociou"}') -> 'lembrete' ->> 'situacao' from ids, lm),
  'DISPENSADO', 'VA-05 F3.177: o do cliente ativo continua dispensando');
select is((select portal_lembrete_trazer(felipe, rm, lm.eva) -> 'lembrete' ->> 'situacao' from ids, lm), 'ABERTO',
  'VA-05 F3.177: e trazendo de volta');

-- 9. M6: lançamento e lembrete novos para o excluído são recusados.
select is((teste.erro($$ insert into historico_financeiro_anterior (escritorio_id, importacao_id, linha, cliente_id, data, descricao, valor_centavos, situacao, origem)
             select rm, fin.id, 50, cli.ana, '2026-01-01', 'Novo', 100, 'PAGO', 'ASTREA' from ids, fin, cli $$)) -> 'detalhe' ->> 'motivo',
  'CLIENTE_EXCLUIDO', 'PT-11 F3.177 M6: lançamento novo para o excluído é recusado');
select is((teste.erro($$ insert into lembrete_contrato (escritorio_id, importacao_id, cliente_id, valor_em_aberto_centavos, lancamentos)
             select rm, fin.id, cli.ana, 100, 1 from ids, fin, cli $$)) -> 'detalhe' ->> 'motivo',
  'CLIENTE_EXCLUIDO', 'PT-11 F3.177 M6: lembrete novo também');
select is((teste.erro($$ insert into historico_financeiro_anterior (escritorio_id, importacao_id, linha, cliente_id, data, descricao, valor_centavos, situacao, origem)
             select outro, imp_outro.id, 51, cli.eva, '2026-01-01', 'Novo', 100, 'PAGO', 'ASTREA' from ids, imp_outro, cli $$)) -> 'detalhe' ->> 'motivo',
  'CLIENTE_EXCLUIDO', 'PT-01 F3.177 M6: o cliente precisa ser do escritório da linha');

-- 10. O desfazer depois da exclusão (M1): Gil é excluído, a importação dele é desfeita (só desfeito_em),
-- e a noite troca a descrição desfeita. Fabio é excluído depois do desfazer e troca na hora.
select pg_temp.excluir(cli.gil) from cli;
select ok((select portal_importacao_desfazer(socia, rm, fin2.id, 'Planilha errada') -> 'feito' is not null from ids, fin2),
  'VA-05 F3.177: o desfazer do financeiro funciona com o cliente excluído');
select is((select array[pg_temp.desc(gil), (select (desfeito_em is not null)::text from historico_financeiro_anterior where id = h.gil)] from h),
  array['Honorários de Gil', 'true'], 'PT-11 F3.177: o desfazer muda só desfeito_em; a descrição guardada fica até a noite');
select ok((select not (portal_cliente(socia, rm, cli.fabio) -> 'arquivosQueFicam' ? 'historico') from ids, cli),
  'PT-11 F3.177: a ficha não conta a desfeita (desenho: sem as desfeitas)');
select pg_temp.excluir(cli.fabio) from cli;
select is((select pg_temp.desc(fabio) from h), historico_anterior_descricao_excluido(),
  'PT-11 F3.177: excluir depois do desfazer troca a desfeita na hora');
create temp table noite0 as select aplicar_prazos() j;
select is((select pg_temp.desc(gil) from h), historico_anterior_descricao_excluido(),
  'PT-11 F3.177: a desfeita depois da exclusão troca na noite seguinte');
select is((select j -> 'apagados' -> 'descricoes_antigas' from noite0), '2'::jsonb,
  'PT-11 F3.177: a primeira noite troca a desfeita de Gil e o de 2019 de Dora, excluída antes, sem a 1117 (revisão da F3.156, G1)');
select is((select pg_temp.desc(dora19) from h), historico_anterior_descricao_excluido(),
  'PT-11 F3.177: Dora, excluída antes da 1116: a rotina troca o vencido sem depender do evento');

-- 11. A rotina: em 31/12/2032 troca só o que venceu (o em aberto de 2025 de Ana, o de 2024 de Bia e
-- o detalhe dele); em 01/01/2033, o resto.
select ajustar_relogio(('2032-12-31 10:00-03'::timestamptz - now()));
create temp table noite1 as select aplicar_prazos() j;
select is((select array[pg_temp.desc(ana26), pg_temp.desc(ana_sem), pg_temp.desc(bia26), pg_temp.desc(dora26)] from h),
  array['Honorários de Ana, parcela 1', 'Acordo sem data de Ana', 'Pagamento de Bia', 'Honorários de Dora'],
  'PT-11 F3.177: em 31/12/2032, os pagamentos de 2026 continuam');
select is((select array[pg_temp.desc(ana_ab), pg_temp.desc(bia24)] from h),
  array[historico_anterior_descricao_excluido(), historico_anterior_descricao_excluido()],
  'PT-11 F3.177: o em aberto de 2025 (marco 01/01/2032) e o de 2024 (01/01/2031) trocam');
select is((select dispensa_detalhe from lembrete_contrato, lm where id = lm.bia), lembrete_detalhe_excluido(),
  'PT-11 F3.177: o detalhe troca no marco dos lançamentos dele');
select is((select (j -> 'apagados') - array['sessoes_escritorio', 'limites_uso', 'historico'] from noite1),
  '{"descricoes_antigas": 2, "detalhes_antigos": 1}'::jsonb, 'PT-11 F3.177: a rotina devolve as duas contagens');
select is((select dados from historico, ids where acao = 'dados.prazo_fiscal_aplicado' and escritorio_id = ids.rm order by ocorrido_em desc limit 1),
  '{"descricoes": 2, "detalhes": 1}'::jsonb, 'PT-11 F3.177: o escritório ganha o registro da rotina');
select throws_ok($$ update lembrete_contrato set dispensa_detalhe = 'Outro texto' where id = (select bia from lm) $$, 'TC023', null,
  'PT-11 F3.177: o detalhe trocado não muda mais');
select ajustar_relogio(('2033-01-01 03:00-03'::timestamptz - now()));
create temp table noite2 as select aplicar_prazos() j;
create temp table noite3 as select aplicar_prazos() j;
select is((select array[pg_temp.desc(ana26), pg_temp.desc(ana_sem), pg_temp.desc(bia26), pg_temp.desc(dora26)] from h),
  array[historico_anterior_descricao_excluido(), historico_anterior_descricao_excluido(), historico_anterior_descricao_excluido(), historico_anterior_descricao_excluido()],
  'PT-11 F3.177: em 01/01/2033 trocam os de 2026, também o sem data');
select is((select j -> 'apagados' -> 'descricoes_antigas' from noite2), '4'::jsonb, 'PT-11 F3.177: na noite do marco, 4 descrições');
select ok((select not (j -> 'apagados' ? 'descricoes_antigas') and not (j -> 'apagados' ? 'detalhes_antigos') from noite3),
  'PT-11 F3.177: na noite seguinte não há o que trocar e as chaves não aparecem');
select is((select pg_temp.desc(eva) from h), 'Honorários de Eva', 'PT-11 F3.177: o cliente ativo não muda');
update inventario_dados set situacao = 'PROPOSTA' where tabela = 'historico_financeiro_anterior';
select is((select aplicar_prazos() -> 'aguardando_aprovacao' -> -1), '"historico_financeiro_anterior"'::jsonb,
  'PT-11 F3.177: com o prazo em proposta, a rotina diz que ele espera aprovação');
update inventario_dados set situacao = 'APROVADO' where tabela = 'historico_financeiro_anterior';

-- 12. Os clientes excluídos antes da 1116 (a 1117): Hugo (de 2030 e 2029, guardados) e Joana (no outro
-- escritório, de 2018) são excluídos sem o gatilho; o escritório fica só para consulta.
select ajustar_relogio(('2033-02-01 10:00-03'::timestamptz - now()));
create temp table hugo as select (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'origem', 'GOOGLE', 'nome', 'Hugo Antigo Reis',
    'contatos', jsonb_build_array(jsonb_build_object('nome', 'Contato', 'telefone', '+5511984720000', 'principal', true)))) ->> 'id')::uuid id from ids;
insert into historico_financeiro_anterior (escritorio_id, importacao_id, linha, cliente_id, data, descricao, valor_centavos, situacao, origem)
  select rm, fin.id, 60, hugo.id, date '2030-05-01', 'Honorários de Hugo', 10000, 'PAGO', 'ADVBOX_PLANILHA' from ids, fin, hugo
  union all select rm, fin.id, 61, hugo.id, '2029-05-01', 'Consulta de Hugo', 10000, 'EM_ABERTO', 'ASTREA' from ids, fin, hugo;
select is((select cliente_historico_anterior_que_fica(rm, hugo.id) from ids, hugo),
  '{"lancamentos": 2, "detalhes": 0, "semData": 0, "origem": null, "ate": "2037-01-01"}'::jsonb,
  'PT-11 F3.177: com dois sistemas, a origem vem nula (a janela diz "do sistema antigo")');
alter table clientes_escritorio disable trigger historico_anterior_apagar_do_excluido;
select pg_temp.excluir(hugo.id) from hugo;
select pg_temp.excluir(cli.joa) from cli;
alter table clientes_escritorio enable trigger historico_anterior_apagar_do_excluido;
update escritorios set contrato_fim_em = hoje_brasilia() - 1 from ids where escritorios.id = ids.rm;
grant select on ids, cli, hugo to dominio;
set local role dominio;
create temp table pre1 as select historico_anterior_preencher_excluidos() j;
create temp table pre2 as select historico_anterior_preencher_excluidos() j;
create temp table marcas as select coalesce(current_setting('t3jus.fim_da_guarda', true), '') fg, coalesce(current_setting('t3jus.aplicando_prazos', true), '') ap;
reset role;
select is((select j from pre1), jsonb_build_object(
    (select rm from ids)::text, jsonb_build_object('clientes', 1, 'trocados', 0, 'guardados', 2, 'detalhesTrocados', 0, 'detalhesGuardados', 0),
    (select outro from ids)::text, jsonb_build_object('clientes', 1, 'trocados', 1, 'guardados', 0, 'detalhesTrocados', 0, 'detalhesGuardados', 0)),
  'PT-11 F3.177: o preenchimento conta por escritório, também no só de consulta; Hugo só guardado ganha o evento uma vez');
select is((select j from pre2), '{}'::jsonb, 'PT-11 F3.177: rodar de novo não muda nada (idempotente, sem repetir o evento)');
select ok((select fg in ('', 'off') and ap in ('', 'off') from marcas), 'PT-11 F3.177: as marcas da rotina voltam como estavam');
select is((select dados from historico, hugo where acao = 'cliente.historico_anterior_guardado' and entidade_id = hugo.id::text),
  '{"trocados": 0, "guardados": 2, "detalhesTrocados": 0, "detalhesGuardados": 0, "ate": "2037-01-01", "antes": true}'::jsonb,
  'PT-11 F3.177: o evento de Hugo leva antes: true e a data em que a descrição troca');
select is((select descricao from historico_financeiro_anterior, cli where cliente_id = cli.joa and linha = 2), historico_anterior_descricao_excluido(),
  'PT-11 F3.177: Joana, no outro escritório, troca o de 2018');

-- 13. Inventário.
select is((select array[base_legal, prazo, no_fim] from inventario_dados where tabela = 'historico_financeiro_anterior'),
  array['Execução de contrato, exercício regular de direitos e obrigação legal (LGPD, art. 7º, V, VI e II)',
        'Enquanto o escritório for cliente do T3jus e 5 anos depois do fim do contrato; a descrição do lançamento de cliente excluído, até a decadência do imposto do ano dele (5 anos, CTN 173, I)',
        'Exportados ao escritório e apagados com ele. De cliente excluído, a descrição do lançamento fica até 1º de janeiro do 7º ano depois do lançamento e vira texto fixo (LGPD, art. 16, I)'],
  'PT-11 F3.177: o inventário do histórico importado');
select ok((select bool_and(length(base_legal) <= 200 and length(prazo) <= 200 and length(no_fim) <= 200 and situacao = 'APROVADO' and exportar)
             from inventario_dados where tabela in ('historico_financeiro_anterior', 'lembrete_contrato')),
  'PT-11 F3.177: os textos cabem em 200 letras, aprovados e exportados');

-- 14. Os gatilhos.
select is((select array_agg(tgname::text order by tgname) from pg_trigger
            where tgrelid in ('historico_financeiro_anterior'::regclass, 'lembrete_contrato'::regclass) and not tgisinternal),
  array['contrato_aceita_escrita', 'contrato_aceita_escrita', 'historico_anterior_guarda', 'historico_anterior_nasce', 'lembrete_contrato_nasce',
        'lembrete_detalhe_guarda'],
  'PT-11 F3.177: os gatilhos das duas tabelas');
select ok((select pg_get_triggerdef(oid) like '%AFTER UPDATE OF estado ON public.clientes_escritorio FOR EACH ROW WHEN (((new.estado = ''EXCLUIDO''::text) AND (old.estado <> ''EXCLUIDO''::text)))%'
             from pg_trigger where tgname = 'historico_anterior_apagar_do_excluido'),
  'PT-11 F3.177: o gatilho é AFTER UPDATE OF estado, só na passagem a EXCLUIDO');

select * from finish();
rollback;
