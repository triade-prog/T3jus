-- Importar do Astrea e do ADVBOX: o que sobrou das partes 2 e 3 (F3.116, F3.117; VA-05). No passo
-- das abas do backup, a sócia dona escolhe se os processos arquivados ficam de fora ou entram como
-- encerrados; a escolha passa para a prévia dos processos; o arquivado entra na etapa final, sem
-- resultado nem acerto, fora dos relatórios; desfazer passa a "importação desfeita". No financeiro,
-- a despesa do escritório aparece na prévia agrupada (FORA_REGRA) e nunca entra.
begin;
select plan(70);

select ajustar_relogio(('2026-11-23 12:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Beatriz Costa') as bia,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Costa Advogados') as ca;
select teste.vincular(socia, rm, 'SOCIO') from ids;
select teste.vincular(bia, ca, 'SOCIO') from ids;
select portal_convidar(socia, rm, diego, 'Diego Almeida', array['CONTRATOS', 'COMERCIAL']) from ids;
select etapas_garantir(rm) from ids;

-- Um caso que já existe, com o número de um processo arquivado do backup.
insert into casos (escritorio_id, nome, area, numero_cnj, etapa_id, responsavel_id, criado_por)
select rm, 'Antônia Ferreira Prado x Banco Sul', 'CONSUMIDOR', '10010119120255020001',
       (select id from etapas where escritorio_id = rm and not final order by ordem limit 1), socia, socia from ids;
-- E um caso encerrado do jeito normal, com resultado (o controle do acerto).
insert into casos (escritorio_id, nome, area, etapa_id, responsavel_id, criado_por, situacao, resultado, encerrado_em, encerrado_por)
select rm, 'Caso encerrado no T3jus', 'CIVEL', (select id from etapas where escritorio_id = rm and final), socia, socia,
       'ENCERRADO', 'GANHO', app_now(), 'RESULTADO' from ids;

create temp table arq as select jsonb_build_object(
  'arquivoNome', 'backup-astrea-23-11-2026.xlsx', 'oQue', 'CLIENTES', 'origem', 'ASTREA', 'modelo', 'astrea-2026-11',
  'abas', jsonb_build_array(
    jsonb_build_object('nome', 'Contatos', 'colunas', jsonb_build_array('Nome', 'Tipo', 'CPF/CNPJ', 'Celular'),
      'linhas', jsonb_build_array(
        jsonb_build_array('Benedito Ramos Filho', 'Cliente', '462.803.157-62', '(11) 99642-1180'),
        jsonb_build_array('Rosa Almeida', 'Cliente', '529.982.247-25', '(11) 98451-2290'),
        jsonb_build_array('Lúcia Barros', 'Cliente', '', '(11) 97777-1234'))),
    jsonb_build_object('nome', 'Processos', 'colunas', jsonb_build_array('Número', 'Cliente', 'Parte contrária', 'Área', 'Fase', 'Situação', 'Responsável'),
      'linhas', jsonb_build_array(
        jsonb_build_array('1000123-25.2025.5.02.0001', 'Benedito Ramos Filho', 'Construtora Alfa Ltda.', 'Trabalhista', 'Inicial', 'Ativo', 'Dra. Marina'),
        jsonb_build_array('1000456-74.2025.5.02.0001', 'Rosa Almeida', 'Banco Sul', 'Consumidor', 'Sentença', 'Arquivado', 'Dra. Marina'),
        jsonb_build_array('1000789-26.2025.5.02.0001', 'Lúcia Barros', 'INSS', 'Previdenciário', 'Recurso', 'Arquivado', 'Dra. Marina'),
        jsonb_build_array('1000456-74.2025.5.02.0001', 'Benedito Ramos Filho', 'Banco Sul', 'Consumidor', 'Inicial', 'Ativo', 'Dra. Marina'),
        jsonb_build_array('', 'Benedito Ramos Filho', 'Empresa Antiga', 'Trabalhista', 'Inicial', 'Arquivado', 'Dra. Marina'),
        jsonb_build_array('1001011-91.2025.5.02.0001', 'Rosa Almeida', 'Banco Sul', 'Consumidor', 'Inicial', 'Arquivado', 'Dra. Marina'))),
    jsonb_build_object('nome', 'Lançamentos', 'colunas', jsonb_build_array('Data', 'Cliente', 'Descrição', 'Valor', 'Situação', 'Tipo'),
      'linhas', jsonb_build_array(
        jsonb_build_array('10/03/2026', 'Benedito Ramos Filho', 'Honorários iniciais', '1.500,00', 'Pago', 'Receita'),
        jsonb_build_array('10/12/2026', 'Benedito Ramos Filho', 'Parcela 3', '500,00', 'Em aberto', 'Receita'),
        jsonb_build_array('05/03/2026', '', 'Aluguel da sala', '2.000,00', 'Pago', 'Despesa'),
        jsonb_build_array('06/03/2026', '', 'Internet', '150,00', 'Pago', 'Despesa'),
        jsonb_build_array('05/02/2026', 'Rosa Almeida', 'Consulta', '300,00', 'Pago', 'Receita')))),
  'sistema', jsonb_build_array(
    jsonb_build_object('nome', 'Contatos', 'linhas', 3, 'destino', 'CLIENTES', 'reconhecida', true,
                       'porModelo', jsonb_build_object('0', 'nome', '1', 'tipo_contato', '2', 'documento', '3', 'telefone')),
    jsonb_build_object('nome', 'Processos', 'linhas', 6, 'destino', 'CASOS', 'reconhecida', true,
                       'porModelo', jsonb_build_object('0', 'numero', '1', 'cliente', '2', 'parte_contraria', '3', 'area', '4', 'etapa',
                                                       '5', 'situacao_processo', '6', 'responsavel')),
    jsonb_build_object('nome', 'Lançamentos', 'linhas', 5, 'destino', 'FINANCEIRO', 'reconhecida', true,
                       'porModelo', jsonb_build_object('0', 'lanc_data', '1', 'cliente', '2', 'lanc_descricao', '3', 'lanc_valor',
                                                       '4', 'lanc_situacao', '5', 'lanc_tipo')))) d;

-- ---------------------------------------------------------------------------------------
-- Os checks novos.
select throws_ok($$ update casos set encerrado_por = 'OUTRO' where nome = 'Caso encerrado no T3jus' $$, '23514', null,
  'encerrado_por só aceita os três jeitos de encerrar');
select throws_ok($$ update casos set encerrado_por = 'IMPORTADO_ENCERRADO' where nome = 'Caso encerrado no T3jus' $$, '23514', null,
  'o caso que veio encerrado não tem resultado');

-- ---------------------------------------------------------------------------------------
-- Enviar: a aba dos processos já diz quantos estão ativos e arquivados.
create temp table imp as select portal_importacao_criar(socia, rm, arq.d) j from ids, arq;
create temp table v as select (j ->> 'id')::uuid id from imp;
select is((select jsonb_build_array(j -> 'abasSistema' -> 1 -> 'ativos', j -> 'abasSistema' -> 1 -> 'arquivados') from imp), '[2, 4]'::jsonb,
  'astrea-abas: "2 ativos e 4 arquivados"');
select is((select j -> 'abasSistema' -> 0 ? 'ativos' from imp), false, 'só a aba dos processos tem a conta');
select is((select j ->> 'arquivados' from imp), 'FORA', 'o padrão recomendado: os arquivados ficam de fora');
select throws_ok($$ update importacoes set arquivados = 'TALVEZ' where id = (select id from v) $$, '23514', null,
  'a escolha é FORA ou ENCERRADOS');

-- A escolha dos arquivados: só a sócia dona, só na prévia dela, com a versão.
select is((teste.erro($$ select portal_importacao_arquivados(diego, rm, v.id, (imp.j ->> 'versao')::integer, '{"arquivados": "ENCERRADOS"}') from ids, v, imp $$)) ->> 'codigo',
  'TC401', 'a equipe não escolhe');
select is((teste.erro($$ select portal_importacao_arquivados(bia, ca, v.id, (imp.j ->> 'versao')::integer, '{"arquivados": "ENCERRADOS"}') from ids, v, imp $$)) ->> 'codigo',
  'TC404', 'outro escritório não acha a importação');
select is((teste.erro($$ select portal_importacao_arquivados(socia, rm, v.id, (imp.j ->> 'versao')::integer, '{"arquivados": "TODOS"}') from ids, v, imp $$)) -> 'detalhe' -> 'campos',
  '["arquivados"]'::jsonb, 'escolha desconhecida');
select is((teste.erro($$ select portal_importacao_arquivados(socia, rm, v.id, (imp.j ->> 'versao')::integer - 1, '{"arquivados": "ENCERRADOS"}') from ids, v, imp $$)) ->> 'codigo',
  'TC409', 'com a versão velha, conflito');
create temp table esc as select portal_importacao_arquivados(socia, rm, v.id, (imp.j ->> 'versao')::integer, '{"arquivados": "ENCERRADOS"}') j from ids, v, imp;
select is((select jsonb_build_array(esc.j ->> 'arquivados', (esc.j ->> 'versao')::integer - (imp.j ->> 'versao')::integer) from esc, imp), '["ENCERRADOS", 1]'::jsonb,
  'escolhido: importar como encerrados, com versão nova');
select is((teste.erro($$ select portal_importacao_colunas(socia, rm, v.id, (imp.j ->> 'versao')::integer, jsonb_build_object('aba', 0, 'ligacao', imp.j -> 'ligacao')) from ids, v, imp $$)) ->> 'codigo',
  'TC409', 'as colunas com a versão de antes da escolha dão conflito');

-- Os clientes; a escolha passa para a prévia dos processos.
select portal_importacao_colunas(socia, rm, v.id, (esc.j ->> 'versao')::integer, jsonb_build_object('aba', 0, 'ligacao', imp.j -> 'ligacao')) from ids, v, imp, esc;
create temp table fim as select portal_importacao_importar(socia, rm, v.id, (select versao from importacoes where id = v.id)) j from ids, v;
create temp table f as select (j -> 'filha' ->> 'id')::uuid id, (j -> 'filhaFinanceiro' ->> 'id')::uuid fin from fim;
select is((select arquivados from importacoes, f where importacoes.id = f.id), 'ENCERRADOS', 'a prévia dos processos herda a escolha');
select is((select arquivados from importacoes, f where importacoes.id = f.fin), 'FORA', 'a do financeiro não tem arquivados');
select is((teste.erro($$ select portal_importacao_arquivados(socia, rm, v.id, (select versao from importacoes where id = v.id), '{"arquivados": "FORA"}') from ids, v $$)) -> 'detalhe' ->> 'motivo',
  'IMPORTACAO_OUTRA_ETAPA', 'depois de importar os clientes, a escolha não muda ali');
select is((teste.erro($$ select portal_importacao_arquivados(socia, rm, f.id, (select versao from importacoes where id = f.id), '{"arquivados": "FORA"}') from ids, f $$)) -> 'detalhe' -> 'campos',
  '["arquivados"]'::jsonb, 'a prévia dos processos não usa esta rota');

-- ---------------------------------------------------------------------------------------
-- A prévia dos processos com os arquivados como encerrados.
create temp table col as select portal_importacao_colunas(socia, rm, f.id, (select versao from importacoes where id = f.id),
  jsonb_build_object('ligacao', (select ligacao from importacoes where id = f.id))) r from ids, f;
select is((select r -> 'contagens' ->> 'lidas' from col), '6', 'os ativos e os arquivados entram na prévia');
select is((select fora_tipo from importacoes, f where importacoes.id = f.id), null::jsonb, 'decisão 6: nada vai para fora_tipo');
select is((select jsonb_object_agg(numero, situacao) from importacao_linhas, f where importacao_id = f.id),
  '{"2": "PRONTA", "3": "PRONTA", "4": "PRONTA", "5": "AVISO", "6": "PRONTA", "7": "AVISO"}'::jsonb, 'cada linha com a situação');
select is((select jsonb_object_agg(numero, imp_linha_json(l) -> 'caso' -> 'encerrado') from importacao_linhas l, f where importacao_id = f.id),
  '{"2": false, "3": true, "4": true, "5": false, "6": true, "7": true}'::jsonb, 'a linha diz se o caso entra encerrado');
select is((select jsonb_build_array(norm -> 'caso' ->> 'etapa_id' = (select id::text from etapas where escritorio_id = ids.rm and final), norm -> 'caso' ->> 'etapa_antiga')
             from importacao_linhas, f, ids where importacao_id = f.id and numero = 3), '[true, "Sentença"]'::jsonb,
  'o arquivado vai para a etapa final; a fase de lá fica guardada');
select is((select jsonb_build_array(norm -> 'mesmaDe', problemas -> 0 ->> 'codigo', problemas -> 0 ->> 'campo') from importacao_linhas, f where importacao_id = f.id and numero = 5),
  '[3, "CAMPO_INVALIDO", "situacao_processo"]'::jsonb, 'correção 6: ativo com o número de um arquivado; a primeira linha decide e a outra ganha um aviso');
select is((select problemas -> 0 ->> 'codigo' from importacao_linhas, f where importacao_id = f.id and numero = 7), 'CASO_DUPLICADO',
  'o arquivado com o número de um caso que já existe');
select is((select r -> 'casos' -> 'encerrados' from col), '3'::jsonb, 'o resumo: três casos encerrados');
select is((select r -> 'casos' -> 'ativos' from col), '1'::jsonb, 'e um ativo');
select is((select r -> 'importacao' ->> 'arquivados' from col), null, 'o resumo não repete a escolha');
select is((teste.erro($$ select portal_importacao_lancamentos(socia, rm, f.id) from ids, f $$)) -> 'detalhe' -> 'campos', '["importacao"]'::jsonb,
  'só a prévia do financeiro tem lançamentos');

-- Corrigir uma linha não desfaz o aviso do mesmo número.
select is((select portal_importacao_linha(socia, rm, f.id, 5, '{"campos": {"parte_contraria": "Banco Sul S.A."}}') -> 'linha' ->> 'situacao' from ids, f), 'AVISO',
  'o aviso do mesmo número volta a cada conferência');
select is((select jsonb_array_length(problemas) from importacao_linhas, f where importacao_id = f.id and numero = 5), 1, 'sem aviso repetido');

-- Com "Deixar de fora" (a escolha do ADVBOX vem nas colunas e vale também aqui).
create temp table col2 as select portal_importacao_colunas(socia, rm, f.id, (select versao from importacoes where id = f.id),
  jsonb_build_object('ligacao', (select ligacao from importacoes where id = f.id), 'arquivados', 'FORA')) r from ids, f;
select is((select jsonb_build_array(r -> 'contagens' -> 'lidas', (select fora_tipo from importacoes where id = f.id), (select arquivados from importacoes where id = f.id)) from col2, f),
  '[2, {"ARQUIVADOS": 4}, "FORA"]'::jsonb, 'deixar de fora: só os ativos; os arquivados são contados');
select is((select jsonb_object_agg(numero, situacao) from importacao_linhas, f where importacao_id = f.id),
  '{"2": "PRONTA", "5": "PRONTA"}'::jsonb, 'sem o arquivado, o ativo do mesmo número não tem aviso');
select is((teste.erro($$ select portal_importacao_colunas(socia, rm, f.id, (select versao from importacoes where id = f.id),
  jsonb_build_object('ligacao', (select ligacao from importacoes where id = f.id), 'arquivados', 'TODOS')) from ids, f $$)) -> 'detalhe' -> 'campos',
  '["arquivados"]'::jsonb, 'escolha desconhecida nas colunas');
-- Correção 5: uma regra só para ativo e arquivado, ao montar a prévia e ao conferir a linha. Com o
-- par "Ativo" trocado à mão para arquivado, os que entram encerrados são os mesmos que ficariam de fora.
select portal_importacao_colunas(socia, rm, f.id, (select versao from importacoes where id = f.id),
  jsonb_build_object('ligacao', (select ligacao from importacoes where id = f.id), 'arquivados', 'ENCERRADOS',
                     'pares', '{"situacaoProcesso": {"ativo": "FORA"}}'::jsonb)) from ids, f;
create temp table troca as select count(*) filter (where (imp_linha_json(l) -> 'caso' ->> 'encerrado')::boolean) enc from importacao_linhas l, f where importacao_id = f.id;
select portal_importacao_colunas(socia, rm, f.id, (select versao from importacoes where id = f.id),
  jsonb_build_object('ligacao', (select ligacao from importacoes where id = f.id), 'arquivados', 'FORA',
                     'pares', '{"situacaoProcesso": {"ativo": "FORA"}}'::jsonb)) from ids, f;
select is((select jsonb_build_array(troca.enc, (fora_tipo ->> 'ARQUIVADOS')::integer) from importacoes, f, troca where importacoes.id = f.id), '[6, 6]'::jsonb,
  'o par trocado à mão vale igual ao montar a prévia e ao conferir cada linha');
select portal_importacao_colunas(socia, rm, f.id, (select versao from importacoes where id = f.id),
  jsonb_build_object('ligacao', (select ligacao from importacoes where id = f.id), 'arquivados', 'ENCERRADOS')) from ids, f;

-- Decidir e importar.
select is((select portal_importacao_linha(socia, rm, f.id, 5, '{"decisao": "SEGUIR"}') -> 'linha' ->> 'situacao' from ids, f), 'PRONTA',
  'seguir como a primeira linha: o cliente entra no caso encerrado');
select is((select portal_importacao_linha(socia, rm, f.id, 7, '{"decisao": "JUNTAR"}') -> 'linha' ->> 'situacao' from ids, f), 'PRONTA',
  'o arquivado também pode juntar o cliente ao caso que já existe');
select is((select imp_resumo(f.id) -> 'casos' -> 'encerrados' from f), '3'::jsonb, 'juntar não cria caso encerrado');

create temp table fim2 as select portal_importacao_importar(socia, rm, f.id, (select versao from importacoes where id = f.id)) j from ids, f;
select is((select jsonb_build_array(j -> 'resumo' -> 'casos', j -> 'resumo' -> 'encerrados', j -> 'resumo' -> 'juntadosCasos', j -> 'resumo' -> 'fora') from fim2),
  '[4, 3, 1, 0]'::jsonb, 'quatro casos novos, três deles encerrados, e um caso que já existia ganhou um cliente');
create temp table enc as select c.* from casos c, f where c.importacao_id = f.id and c.encerrado_por = 'IMPORTADO_ENCERRADO';
select is((select jsonb_agg(distinct jsonb_build_array(situacao, resultado, etapa_id = (select id from etapas where escritorio_id = enc.escritorio_id and final), encerrado_em = app_now())) from enc),
  '[["ENCERRADO", null, true, true]]'::jsonb, 'encerrados, sem resultado, na etapa final, com a data da importação');
select is((select string_agg(k.nome, ', ' order by k.nome) from casos c join caso_clientes cc on cc.caso_id = c.id join clientes_escritorio k on k.id = cc.cliente_id
            where c.numero_cnj = '10004567420255020001'), 'Benedito Ramos Filho, Rosa Almeida', 'o ativo do mesmo número entrou no caso encerrado');
select is((select situacao from casos where numero_cnj = '10010119120255020001'), 'ANDAMENTO', 'o caso que já existia fica como está');
select is((select m.motivo from caso_etapa_mudancas m join casos c on c.id = m.caso_id where c.numero_cnj = '10004567420255020001'),
  'Caso importado do Astrea, já encerrado lá (etapa lá: Sentença).', 'a mudança de etapa diz que veio encerrado');
select is((select count(*) from historico h join enc on enc.id::text = h.entidade_id where h.acao = 'juridico.caso_cadastrado' and (h.dados ->> 'encerrado')::boolean)::integer, 3,
  'o histórico diz que o caso entrou encerrado');
select is((select caso_linha(c) ->> 'encerradoPor' from casos c where numero_cnj = '10004567420255020001'), 'IMPORTADO_ENCERRADO',
  'a lista de casos sabe como o caso encerrou');

-- Sem acerto, sem relatório, sem "cliente atendido".
select is((select caso_resumo_acerto(socia, rm, enc.id) from ids, enc where enc.numero_cnj = '10004567420255020001'), null::jsonb,
  'EX-16: o caso que veio encerrado não tem acerto');
select isnt((select caso_resumo_acerto(socia, rm, c.id) from ids, casos c where c.nome = 'Caso encerrado no T3jus'), null::jsonb,
  'o encerrado no T3jus tem');
select is((select cliente_passo(socia, rm, k.id) ->> 'tipo' from ids, clientes_escritorio k where k.nome = 'Lúcia Barros'), 'SEM_PROPOSTA',
  'pergunta 3: o cliente cujo único caso veio encerrado segue em "Fazer a proposta"');
select is((select count(*) from ids, relatorio_casos(rm, date '2026-11-01', date '2026-11-30') c where c.encerrado_por is not null and c.encerrado_por <> 'RESULTADO')::integer, 0,
  'os relatórios do sócio não contam o caso encerrado sem resultado');
select is((select count(*) from ids, relatorio_casos(rm, date '2026-11-01', date '2026-11-30'))::integer, 3,
  'contam o ativo importado, o que já existia e o encerrado no T3jus');

-- Desfazer: o encerrado importado vira "importação desfeita", com a data em que entrou.
select is((select portal_importacao_plano_desfazer(socia, rm, f.id) - 'mexidos' - 'clientes' - 'juntados' - 'contratos' - 'parcelas' from ids, f),
  '{"casos": 1, "encerrados": 3, "ligacoes": 1}'::jsonb, 'o plano do desfazer conta os encerrados');
select portal_importacao_desfazer(socia, rm, f.id, 'Importei o backup errado') from ids, f;
select is((select jsonb_agg(distinct jsonb_build_array(c.situacao, c.encerrado_por, c.encerrado_em = enc.encerrado_em)) from casos c join enc on enc.id = c.id),
  '[["ENCERRADO", "IMPORTACAO_DESFEITA", true]]'::jsonb, 'os encerrados importados viram importação desfeita, com a data em que entraram');
select is((select count(*) from historico h join enc on enc.id::text = h.entidade_id where h.acao = 'juridico.caso_encerrado' and (h.dados ->> 'jaEncerrado')::boolean)::integer, 3,
  'o histórico do desfazer');

-- ---------------------------------------------------------------------------------------
-- O financeiro: a despesa do escritório na prévia agrupada.
create temp table fc as select portal_importacao_colunas(socia, rm, f.fin, (select versao from importacoes where id = f.fin),
  jsonb_build_object('ligacao', (select ligacao from importacoes where id = f.fin))) r from ids, f;
select is((select jsonb_build_array(r -> 'contagens' -> 'lidas', (select linhas_lidas from importacoes where id = f.fin), (select fora_tipo from importacoes where id = f.fin)) from fc, f),
  '[5, 5, {"DESPESAS": 2}]'::jsonb, 'correção 8: "lidas" conta todas as linhas, as despesas também');
select is((select jsonb_object_agg(numero, situacao) from importacao_linhas, f where importacao_id = f.fin),
  '{"2": "PRONTA", "3": "PRONTA", "4": "FORA_REGRA", "5": "FORA_REGRA", "6": "PRONTA"}'::jsonb, 'a despesa entra na prévia como FORA_REGRA');
select is((select jsonb_object_agg(numero, imp_linha_json(l) -> 'lancamento' ->> 'grupo') from importacao_linhas l, f where importacao_id = f.fin),
  '{"2": "RECEBIDOS", "3": "EM_ABERTO", "4": "DESPESAS", "5": "DESPESAS", "6": "RECEBIDOS"}'::jsonb, 'cada lançamento sabe o grupo');
select is((select r -> 'financeiroAntigo' -> 'grupos' from fc),
  '{"recebidos": {"linhas": 2, "valor": 180000}, "emAberto": {"linhas": 1, "valor": 50000}, "despesas": {"linhas": 2, "valor": 215000}}'::jsonb,
  'previa-financeiro: a conta de cada grupo');
select is((select r -> 'financeiroAntigo' -> 'despesas' from fc), '2'::jsonb, 'as despesas que ficam de fora');

create temp table lc as select portal_importacao_lancamentos(socia, rm, f.fin) j from ids, f;
select is((select jsonb_build_array(j -> 'total', (select jsonb_agg(x -> 'numero') from jsonb_array_elements(j -> 'linhas') x)) from lc),
  '[5, [2, 6, 3, 4, 5]]'::jsonb, 'agrupados: recebidos, em aberto e despesas, pela linha');
select is((select (j -> 'importacao' ->> 'versao')::integer = (select versao from importacoes where id = f.fin) from lc, f), true,
  'listar não muda a versão da prévia');
select is((select jsonb_agg(x -> 'numero') from ids, f, jsonb_array_elements(portal_importacao_lancamentos(socia, rm, f.fin, 'DESPESAS') -> 'linhas') x),
  '[4, 5]'::jsonb, 'o chip das despesas');
select is((select jsonb_agg(x -> 'numero') from ids, f, jsonb_array_elements(portal_importacao_lancamentos(socia, rm, f.fin, null, null, 'rosa') -> 'linhas') x),
  '[6]'::jsonb, 'a busca pelo cliente, sem acento nem maiúscula');
select is((select jsonb_build_array(
    (select jsonb_agg(x -> 'numero') from jsonb_array_elements(portal_importacao_lancamentos(socia, rm, f.fin, null, null, '1.500,00') -> 'linhas') x),
    (select jsonb_agg(x -> 'numero') from jsonb_array_elements(portal_importacao_lancamentos(socia, rm, f.fin, null, null, 'R$ 1500') -> 'linhas') x),
    (select jsonb_agg(x -> 'numero') from jsonb_array_elements(portal_importacao_lancamentos(socia, rm, f.fin, null, null, '5') -> 'linhas') x),
    (select jsonb_agg(x -> 'numero') from jsonb_array_elements(portal_importacao_lancamentos(socia, rm, f.fin, null, null, 'internet') -> 'linhas') x)) from ids, f),
  '[[2], [2], [5], [5]]'::jsonb, 'a busca pelo valor, pela linha e pela descrição');
select is((select portal_importacao_lancamentos(socia, rm, f.fin, null, null, null, 50) -> 'linhas' from ids, f), '[]'::jsonb, 'a página depois do fim');
select is((teste.erro($$ select portal_importacao_lancamentos(socia, rm, f.fin, 'OUTRO') from ids, f $$)) -> 'detalhe' -> 'campos', '["grupo"]'::jsonb,
  'grupo desconhecido');
select is((teste.erro($$ select portal_importacao_lancamentos(bia, ca, f.fin) from ids, f $$)) ->> 'codigo', 'TC404', 'outro escritório não vê');
select is((teste.erro($$ select portal_importacao_lancamentos(socia, rm, f.id) from ids, f $$)) -> 'detalhe' ->> 'motivo', 'IMPORTACAO_OUTRA_ETAPA',
  'só a prévia em andamento tem a lista');
select is((teste.erro($$ select portal_importacao_linha(socia, rm, f.fin, 4, '{"campos": {"lanc_valor": "1,00"}}') from ids, f $$)) -> 'detalhe' ->> 'motivo',
  'LINHA_FORA_REGRA', 'a despesa não se corrige');
-- Correção 7: corrigir uma receita e conferir tudo de novo não mexe nas despesas.
select portal_importacao_linha(socia, rm, f.fin, 2, '{"campos": {"lanc_descricao": "Honorários iniciais (entrada)"}}') from ids, f;
select imp_reconferir(f.fin) from f;
select is((select jsonb_agg(numero order by numero) from importacao_linhas, f where importacao_id = f.fin and situacao = 'FORA_REGRA'), '[4, 5]'::jsonb,
  'as despesas continuam de fora, sem problemas, depois de conferir de novo');

create temp table fim3 as select portal_importacao_importar(socia, rm, f.fin, (select versao from importacoes where id = f.fin)) j from ids, f;
select is((select jsonb_build_array(j -> 'resumo' -> 'recebidos', j -> 'resumo' -> 'emAberto', j -> 'resumo' -> 'despesas', j -> 'resumo' -> 'fora', j -> 'fora') from fim3),
  '[2, 1, 2, 0, 0]'::jsonb, 'a despesa nunca entra e não conta como linha de fora');
select is((select count(*) from historico_financeiro_anterior, f where importacao_id = f.fin)::integer, 3, 'só os lançamentos dos clientes no histórico');
select is((select portal_importacao_fora(socia, rm, f.fin) -> 'linhas' from ids, f), '[]'::jsonb, 'a planilha das linhas de fora não traz as despesas');

select * from finish();
rollback;
