-- O caso novo de importação desfeita e o cliente excluído a pedido do titular (1134; F3.185, PT-11,
-- VA-05), pela decisão da Carol D1/D2 ("Soltar e renomear o caso"): a ligação ao caso novo de
-- importação desfeita, feita pela importação e sem sinal de trabalho, não prende o cliente
-- (cliente_vinculos_lgpd e o plano do desfazer dos clientes a ignoram); na exclusão, a ligação sai e
-- o caso que fica sem cliente passa a se chamar "Caso de importação desfeita". Continua prendendo: o
-- compromisso e a tarefa no caso depois do desfazer, a ligação feita à mão depois, o contrato na
-- ligação e o pedido de documento (regra d). E o levantamento novo de cliente excluído é recusado
-- (levantamento_nasce; revisão, M3).
begin;
select plan(40);

select ajustar_relogio(('2026-11-26 10:00-03'::timestamptz - now()));
-- A saída das entradas sem acesso (0540) não entra neste teste.
update inventario_dados set situacao = 'PROPOSTA' where tabela = 'pessoas';

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.escritorio('Ribeiro & Matos') as rm;
select teste.vincular(socia, rm, 'SOCIO') from ids;
select etapas_garantir(rm) from ids;
-- Xavier já era cliente; os outros vêm da planilha.
create temp table xavier as select (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Xavier Lopes Dantas',
  'contatos', jsonb_build_array(jsonb_build_object('nome', 'Xavier Lopes Dantas', 'telefone', '+5511990000020', 'principal', true)))) ->> 'id')::uuid id
  from ids;

-- 1. A importação: os contatos e os processos, cada um num caso novo (Rita e Sara no mesmo).
create temp table pessoas_planilha as select x.o, x.nome, x.tel, x.numero from (values
  (1, 'Paulo Neves Aragão', '(11) 93333-0001', '2000201-02.2025.5.02.0001'),
  (2, 'Rita Campos Leme', '(11) 93333-0002', '2000202-84.2025.5.02.0001'),
  (3, 'Sara Campos Leme', '(11) 93333-0003', '2000202-84.2025.5.02.0001'),
  (4, 'Tiago Moura Reis', '(11) 93333-0004', '2000203-69.2025.5.02.0001'),
  (5, 'Ulisses Braga Pinto', '(11) 93333-0005', '2000204-54.2025.5.02.0001'),
  (6, 'Wagner Sales Rocha', '(11) 93333-0006', '2000205-39.2025.5.02.0001'),
  (7, 'Yara Fontes Lima', '(11) 93333-0007', '2000206-24.2025.5.02.0001'),
  (8, 'Zeca Duarte Melo', '(11) 93333-0008', '2000207-09.2025.5.02.0001'),
  (9, 'Olga Prado Nunes', '(11) 93333-0009', '2000208-91.2025.5.02.0001')) x(o, nome, tel, numero);
create temp table arq as select jsonb_build_object(
  'arquivoNome', 'backup-astrea.xlsx', 'oQue', 'CLIENTES', 'origem', 'ASTREA', 'modelo', 'astrea-2026-11',
  'abas', jsonb_build_array(
    jsonb_build_object('nome', 'Contatos', 'colunas', jsonb_build_array('Nome', 'Tipo', 'Celular'),
      'linhas', (select jsonb_agg(jsonb_build_array(nome, 'Cliente', tel) order by o) from pessoas_planilha)),
    jsonb_build_object('nome', 'Processos', 'colunas', jsonb_build_array('Número', 'Cliente', 'Parte contrária', 'Área', 'Fase', 'Situação', 'Responsável'),
      'linhas', (select jsonb_agg(jsonb_build_array(numero, nome, 'INSS', 'Previdenciário', 'Inicial', 'Ativo', 'Dra. Marina') order by o) from pessoas_planilha))),
  'sistema', jsonb_build_array(
    jsonb_build_object('nome', 'Contatos', 'linhas', 9, 'destino', 'CLIENTES', 'reconhecida', true,
                       'porModelo', jsonb_build_object('0', 'nome', '1', 'tipo_contato', '2', 'telefone')),
    jsonb_build_object('nome', 'Processos', 'linhas', 9, 'destino', 'CASOS', 'reconhecida', true,
                       'porModelo', jsonb_build_object('0', 'numero', '1', 'cliente', '2', 'parte_contraria', '3', 'area', '4', 'etapa',
                                                       '5', 'situacao_processo', '6', 'responsavel')))) d;
create temp table imp (pai uuid, filha uuid);
create function pg_temp.importar() returns void language plpgsql as $$
declare
  s uuid := (select socia from ids);
  e uuid := (select rm from ids);
  j jsonb := portal_importacao_criar(s, e, (select d from arq));
  v uuid := (j ->> 'id')::uuid;
  f uuid;
begin
  perform portal_importacao_colunas(s, e, v, (select versao from importacoes where id = v), jsonb_build_object('aba', 0, 'ligacao', j -> 'ligacao'));
  f := (portal_importacao_importar(s, e, v, (select versao from importacoes where id = v)) -> 'filha' ->> 'id')::uuid;
  perform portal_importacao_colunas(s, e, f, (select versao from importacoes where id = f), jsonb_build_object('ligacao', (select ligacao from importacoes where id = f)));
  perform portal_importacao_importar(s, e, f, (select versao from importacoes where id = f));
  insert into imp values (v, f);
end $$;
select pg_temp.importar();
-- Os ids pelo nome de antes (a exclusão apaga o nome).
create temp table kk as select nome, id from clientes_escritorio where escritorio_id = (select rm from ids);
create function pg_temp.k(p_nome text) returns uuid language sql as $$ select id from kk where nome like p_nome || '%' $$;
create function pg_temp.caso(p_nome text) returns uuid language sql as $$
  select cc.caso_id from caso_clientes cc where cc.cliente_id = pg_temp.k(p_nome)
$$;
create function pg_temp.lig(p_nome text) returns caso_clientes language sql as $$
  select cc.* from caso_clientes cc where cc.cliente_id = pg_temp.k(p_nome)
$$;
select is((select count(*) from caso_clientes cc join casos s on s.id = cc.caso_id, imp where s.importacao_id = imp.filha and cc.importacao_id is null)::integer,
  9, 'a importação criou 8 casos novos e ligou os 9 clientes a eles, sem importacao_id na ligação');
-- O caso de Olga veio encerrado do sistema antigo (como a importação marca, 0920).
update casos set situacao = 'ENCERRADO', encerrado_em = app_now(), encerrado_por = 'IMPORTADO_ENCERRADO' where id = pg_temp.caso('Olga');

-- 2. O desfazer dos processos, um dia depois.
select ajustar_relogio(('2026-11-27 10:00-03'::timestamptz - now()));
select portal_importacao_desfazer(socia, rm, imp.filha, 'Backup errado') from ids, imp;
select is((select array_agg(distinct encerrado_por) from casos s, imp where s.importacao_id = imp.filha), array['IMPORTACAO_DESFEITA'],
  'os casos novos, também o que veio encerrado, ficam com importação desfeita');
-- A hipótese que sustenta tudo (plano, 5.3): o desfazer não cria linha com caso_id depois da
-- importação. Se um dia criar, este teste quebra em vez de a regra virar letra morta.
select ok((select bool_and(not imp_ligacao_mexida(cc, i)) from caso_clientes cc join casos s on s.id = cc.caso_id join importacoes i on i.id = s.importacao_id, imp
            where i.id = imp.filha),
  'PT-11 F3.185: logo depois do desfazer, nenhuma ligação ao caso desfeito conta como mexida');
select ok((select bool_and(caso_desfeito_solto(cc)) from caso_clientes cc join casos s on s.id = cc.caso_id, imp where s.importacao_id = imp.filha),
  'PT-11 F3.185: e todas estão soltas');
select is((select count(*) from caso_clientes cc join casos s on s.id = cc.caso_id, imp where s.importacao_id = imp.filha)::integer, 9,
  'o desfazer dos processos não apaga a ligação ao caso novo (é a exclusão que apaga)');

-- 3. Os sinais, depois do desfazer.
select ajustar_relogio(('2026-11-28 10:00-03'::timestamptz - now()));
insert into compromissos (escritorio_id, tipo, titulo, inicio, fim, modalidade, local, responsavel_id, criado_por, caso_id, cliente_id)
  select rm, 'CLIENTE', 'Reunião com Tiago', '2026-12-01 14:00-03', '2026-12-01 15:00-03', 'PRESENCIAL', 'Escritório', socia, socia,
         pg_temp.caso('Tiago'), pg_temp.k('Tiago') from ids;
insert into tarefas (escritorio_id, caso_id, titulo, vence_em, responsavel_id, criado_por)
  select rm, pg_temp.caso('Ulisses'), 'Pedir a carta de concessão', date '2026-12-05', socia, socia from ids;
insert into documento_pedidos (escritorio_id, caso_id, descricao, cliente_id, pedido_em, pedido_por)
  select rm, pg_temp.caso('Yara'), 'Comprovante de residência', pg_temp.k('Yara'), date '2026-11-28', socia from ids;
select definir_transicao('CONTRATO_CRIADO', null, true);
insert into contratos (escritorio_id, numero, cliente_id, objeto, responsavel_id, criado_por)
  select rm, 'C-2026-701', pg_temp.k('Zeca'), 'Honorários do caso', socia, socia from ids;
select limpar_contexto();
update caso_clientes set contrato_id = (select id from contratos where numero = 'C-2026-701') where id = (pg_temp.lig('Zeca')).id;
-- Xavier é ligado à mão ao caso de Wagner, depois da importação.
insert into caso_clientes (escritorio_id, caso_id, cliente_id, papel, ordem)
  select rm, pg_temp.caso('Wagner'), xavier.id, 'AUTOR', 2 from ids, xavier;

select is((select jsonb_object_agg(n, caso_desfeito_solto(pg_temp.lig(n))) from unnest(array['Tiago', 'Ulisses', 'Yara', 'Zeca', 'Wagner', 'Paulo']) n),
  '{"Tiago": false, "Ulisses": false, "Yara": false, "Zeca": false, "Wagner": true, "Paulo": true}'::jsonb,
  'PT-11 F3.185: o compromisso, a tarefa, o pedido de documento e o contrato seguram a ligação; a ligação de Xavier não segura Wagner');
select ok((select not caso_desfeito_solto(cc) and not caso_desfeito_da_importacao(cc) from caso_clientes cc, xavier where cc.cliente_id = xavier.id),
  'PT-11 F3.185: a ligação feita à mão depois da importação não é da importação e prende');

-- 4. O desfazer dos clientes: os soltos não são mexidos e ficam inativos.
create temp table pl as select portal_importacao_plano_desfazer(socia, rm, imp.pai) j from ids, imp;
select is((select jsonb_agg(m ->> 'nome' order by m ->> 'nome') from pl, jsonb_array_elements(j -> 'mexidos') m),
  '["Tiago Moura Reis", "Ulisses Braga Pinto", "Yara Fontes Lima", "Zeca Duarte Melo"]'::jsonb,
  'PT-11 F3.185: o plano do desfazer dos clientes não conta a ligação solta como mexida');
select is((select j -> 'clientes' from pl), '5'::jsonb, 'PT-11 F3.185: Paulo, Rita, Sara, Wagner e Olga saem');
select portal_importacao_desfazer(socia, rm, imp.pai, 'Backup errado') from ids, imp;
select is((select jsonb_object_agg(n, (select estado from clientes_escritorio where id = pg_temp.k(n))) from unnest(array['Paulo', 'Rita', 'Tiago']) n),
  '{"Paulo": "INATIVO", "Rita": "INATIVO", "Tiago": "ATIVO"}'::jsonb, 'PT-11 F3.185: o desfazer inativa quem foi solto');

-- 5. A ficha e o arquivar.
select is((select jsonb_object_agg(n, cliente_vinculos_lgpd(pg_temp.k(n))) from unnest(array['Paulo', 'Rita', 'Sara', 'Wagner', 'Olga']) n),
  '{"Paulo": null, "Rita": null, "Sara": null, "Wagner": null, "Olga": null}'::jsonb,
  'PT-11 F3.185: a ligação solta não conta como processo (também no caso que veio encerrado)');
select ok((select portal_cliente(socia, rm, pg_temp.k('Paulo')) -> 'vinculosLgpd' = 'null'::jsonb from ids),
  'PT-11 F3.185: a ficha de Paulo não traz vínculos (a tela oferece Excluir)');
create function pg_temp.arquivar(p_cliente uuid) returns jsonb language sql as $$
  select portal_cliente_arquivar_lgpd(ids.socia, ids.rm, p_cliente, c.versao,
    jsonb_build_object('pedidoEm', hoje_brasilia(), 'canal', 'TELEFONE', 'quemPediu', 'TITULAR', 'conferido', true))
    from clientes_escritorio c, ids where c.id = p_cliente
$$;
select is(teste.erro(format('select pg_temp.arquivar(%L)', pg_temp.k('Paulo'))) -> 'detalhe' ->> 'motivo', 'SEM_CONTRATO_OU_PROCESSO',
  'PT-11 F3.185: e o arquivar de Paulo é recusado (sem processo, o pedido se atende excluindo)');
select is((select jsonb_object_agg(n, cliente_vinculos_lgpd(pg_temp.k(n)) -> 'processos' -> 0 ->> 'id') from unnest(array['Tiago', 'Ulisses', 'Yara', 'Zeca']) n),
  (select jsonb_object_agg(n, pg_temp.caso(n)) from unnest(array['Tiago', 'Ulisses', 'Yara', 'Zeca']) n),
  'PT-11 F3.185: o caso desfeito com trabalho continua contando como processo');
select is((select cliente_vinculos_lgpd(xavier.id) -> 'processos' -> 0 ->> 'id' from xavier), pg_temp.caso('Wagner')::text,
  'PT-11 F3.185: a ligação de Xavier, feita à mão, prende');

-- 6. A exclusão.
create function pg_temp.excluir(p_cliente uuid) returns jsonb language sql as $$
  select portal_cliente_excluir_dados(ids.socia, ids.rm, p_cliente, c.versao,
    jsonb_build_object('pedidoEm', hoje_brasilia(), 'canal', 'TELEFONE', 'quemPediu', 'TITULAR', 'conferido', true, 'nomeConfirmado', c.nome))
    from clientes_escritorio c, ids where c.id = p_cliente
$$;
select ok((select bool_and(teste.erro(format('select pg_temp.excluir(%L)', pg_temp.k(n))) -> 'detalhe' ->> 'motivo' = 'TEM_CONTRATO_OU_PROCESSO')
             from unnest(array['Tiago', 'Ulisses', 'Yara']) n),
  'PT-11 F3.185: a exclusão de quem tem trabalho no caso desfeito continua recusada');
create temp table caso_paulo as select pg_temp.caso('Paulo') id;
create temp table prontos_antes as select count(*) n from casos_prontos_fechar;
select ok((select pg_temp.excluir(pg_temp.k('Paulo')) ->> 'protocolo') is not null, 'PT-11 F3.185: Paulo pode ser excluído');
select is((select count(*) from caso_clientes where cliente_id = pg_temp.k('Paulo'))::integer, 0, 'PT-11 F3.185: a ligação de Paulo sai');
select is((select nome from casos, caso_paulo where casos.id = caso_paulo.id), 'Caso de importação desfeita',
  'PT-11 F3.185: o caso que ficou sem cliente passa a se chamar "Caso de importação desfeita"');
select is((select array[situacao, encerrado_por, numero_cnj] from casos, caso_paulo where casos.id = caso_paulo.id),
  array['ENCERRADO', 'IMPORTACAO_DESFEITA', '20002010220255020001'], 'o caso fica em Encerrados, com o número (dado público)');
select is((select dados from historico where entidade = 'cliente' and entidade_id = pg_temp.k('Paulo')::text and acao = 'cliente.casos_desfeitos_soltos'),
  '{"casos": 1, "ligacoes": 1}'::jsonb, 'PT-11 F3.185: o evento conta a ligação e o caso, sem dado pessoal');
select is((select count(*) from casos_prontos_fechar) - (select n from prontos_antes), 0::bigint,
  'revisão, m1: o DELETE da ligação sem contrato não anota caso pronto');
select is(caso_desfeito_excluido_limpar((select rm from ids), pg_temp.k('Paulo')), '{"casos": 0, "ligacoes": 0}'::jsonb,
  'PT-11 F3.185: chamada de novo, a limpeza não acha nada');

-- Rita e Sara no mesmo caso: a primeira sai e o nome fica; com a segunda, o caso perde o nome.
select ok((select pg_temp.excluir(pg_temp.k('Rita')) ->> 'protocolo') is not null, 'PT-11 F3.185: Rita pode ser excluída');
select is((select array[(select count(*) from caso_clientes where caso_id = pg_temp.caso('Sara'))::text, nome] from casos where id = pg_temp.caso('Sara')),
  array['1', 'Rita Campos Leme x INSS'], 'PT-11 F3.185: só a ligação de Rita sai, e o caso com Sara fica com o nome (limite)');
select is((select dados from historico where entidade = 'cliente' and entidade_id = pg_temp.k('Rita')::text and acao = 'cliente.casos_desfeitos_soltos'),
  '{"casos": 0, "ligacoes": 1}'::jsonb, 'PT-11 F3.185: o evento de Rita conta a ligação e nenhum caso');
create temp table caso_sara as select pg_temp.caso('Sara') id;
select ok((select pg_temp.excluir(pg_temp.k('Sara')) ->> 'protocolo') is not null, 'PT-11 F3.185: Sara pode ser excluída');
select is((select nome from casos, caso_sara where casos.id = caso_sara.id), 'Caso de importação desfeita',
  'PT-11 F3.185: o caso sem nenhum cliente perde o nome');
-- Wagner: o caso fica com Xavier e com o nome.
create temp table caso_wagner as select pg_temp.caso('Wagner') id;
select ok((select pg_temp.excluir(pg_temp.k('Wagner')) ->> 'protocolo') is not null, 'PT-11 F3.185: Wagner pode ser excluído');
select is((select array[(select string_agg(cliente_id::text, ',') from caso_clientes where caso_id = s.id), s.nome] from casos s, caso_wagner where s.id = caso_wagner.id),
  array[(select id::text from xavier), 'Wagner Sales Rocha x INSS'], 'PT-11 F3.185: a ligação de Wagner sai; Xavier e o nome ficam');
-- Olga: o caso que veio encerrado do sistema antigo segue a mesma regra.
create temp table caso_olga as select pg_temp.caso('Olga') id;
select ok((select pg_temp.excluir(pg_temp.k('Olga')) ->> 'protocolo') is not null, 'PT-11 F3.185: Olga pode ser excluída');
select is((select nome from casos, caso_olga where casos.id = caso_olga.id), 'Caso de importação desfeita',
  'PT-11 F3.185: o caso que veio encerrado (IMPORTADO_ENCERRADO e depois desfeito) também perde o nome');

-- 7. O levantamento novo de cliente excluído (revisão, M3).
select is(teste.erro(format($q$insert into levantamentos (escritorio_id, caso_id, cliente_id, tipo, valor, entrou_em, autor_id)
                               values (%L, %L, %L, 'ALVARA', 100000, date '2026-11-28', %L)$q$,
                            (select rm from ids), (select id from caso_paulo), pg_temp.k('Paulo'), (select socia from ids))) -> 'detalhe' ->> 'motivo',
  'CLIENTE_EXCLUIDO', 'PT-11 F3.185 (revisão, M3): o levantamento novo de cliente excluído é recusado, também pelo INSERT direto');
insert into levantamentos (escritorio_id, caso_id, cliente_id, tipo, valor, entrou_em, autor_id)
  select rm, pg_temp.caso('Tiago'), pg_temp.k('Tiago'), 'ALVARA', 100000, date '2026-11-28', socia from ids;
select is((select count(*) from levantamentos where cliente_id = pg_temp.k('Tiago'))::integer, 1, 'e o do cliente que não foi excluído nasce');
select ok((select pg_get_triggerdef(oid) like '%BEFORE INSERT ON public.levantamentos FOR EACH ROW EXECUTE FUNCTION levantamento_nasce()%'
             from pg_trigger where tgname = 'levantamento_nasce'), 'PT-11 F3.185: levantamento_nasce é BEFORE INSERT em levantamentos');

-- 8. O gatilho, as funções e o inventário.
select ok((select pg_get_triggerdef(oid) like '%AFTER UPDATE OF estado ON public.clientes_escritorio FOR EACH ROW WHEN (((new.estado = ''EXCLUIDO''::text) AND (old.estado <> ''EXCLUIDO''::text)))%'
             from pg_trigger where tgname = 'importacao_casos_apagar_do_excluido'),
  'PT-11 F3.185: importacao_casos_apagar_do_excluido roda depois da exclusão, uma vez');
select is((select array_agg(distinct prosecdef) from pg_proc where proname in ('caso_desfeito_da_importacao', 'caso_desfeito_solto', 'caso_desfeito_nome_excluido',
             'caso_desfeito_excluido_limpar', 'importacao_casos_apagar_do_excluido', 'levantamento_nasce', 'cliente_vinculos_lgpd')), array[false],
  'PT-11 F3.185: nenhuma função nova é security definer');
select ok((select pg_get_functiondef('imp_desfazer_plano_clientes(importacoes)'::regprocedure) like '%cc.cliente_id = c.id and not caso_desfeito_solto(cc))%'),
  'PT-11 F3.185: o plano do desfazer dos clientes ganhou a troca');
select is((select jsonb_object_agg(tabela, length(no_fim) <= 200) from inventario_dados where tabela in ('casos', 'caso_clientes')),
  '{"casos": true, "caso_clientes": true}'::jsonb, 'PT-11 F3.185: os textos do inventário cabem no check (200 letras)');
select ok((select bool_and(no_fim like 'Exportados ao escritório e apagados com ele. A pedido do titular, %' and no_fim like '%importação desfeita%' and situacao = 'APROVADO')
             from inventario_dados where tabela in ('casos', 'caso_clientes')),
  'PT-11 F3.185: o inventário de casos e de caso_clientes diz o que muda a pedido do titular');

select * from finish();
rollback;
