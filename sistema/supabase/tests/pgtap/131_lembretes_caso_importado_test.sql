-- Lembretes de contrato e o caso importado (F3.143, F3.144, F3.145, F3.148; VA-05): dispensar
-- (R1) e trazer de volta sem prazo (R2), a lista em Contratos, a ficha do cliente, a origem do
-- caso importado, o filtro "Como encerrou" com a página dos Encerrados e "Registrar o resultado"
-- do caso que veio encerrado, fora das contas até lá (R3).
begin;
select plan(121);

select ajustar_relogio(('2026-11-23 12:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Felipe Matos') as felipe,
  teste.pessoa('Larissa Costa') as larissa,
  teste.pessoa('Gustavo Lima') as gustavo,
  teste.pessoa('Beatriz Costa') as bia,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Costa Advogados') as ca;
select teste.vincular(socia, rm, 'SOCIO') from ids;
select teste.vincular(bia, ca, 'SOCIO') from ids;
select portal_convidar(socia, rm, felipe, 'Felipe Matos', array['CONTRATOS']) from ids;
select portal_convidar(socia, rm, larissa, 'Larissa Costa', array['FINANCEIRO']) from ids;
select portal_convidar(socia, rm, gustavo, 'Gustavo Lima', array['JURIDICO']) from ids;
select etapas_garantir(rm) from ids;

-- O backup do Astrea: um processo ativo (com a fase de lá) e um arquivado; no financeiro, um
-- lançamento em aberto do processo arquivado, que não vira lembrete (decisão 23).
create temp table arq as select jsonb_build_object(
  'arquivoNome', 'backup-astrea-21-11-2026.xlsx', 'oQue', 'CLIENTES', 'origem', 'ASTREA', 'modelo', 'astrea-2026-11',
  'abas', jsonb_build_array(
    jsonb_build_object('nome', 'Contatos', 'colunas', jsonb_build_array('Nome', 'Tipo', 'Celular'),
      'linhas', jsonb_build_array(
        jsonb_build_array('Márcio Tavares', 'Cliente', '(11) 97012-3348'),
        jsonb_build_array('Renata Queiroz', 'Cliente', '(11) 98841-2073'),
        jsonb_build_array('Osvaldo Pereira Lins', 'Cliente', '(11) 96231-0457'),
        jsonb_build_array('Jorge Batista', 'Cliente', '(11) 95555-1234'))),
    jsonb_build_object('nome', 'Processos', 'colunas', jsonb_build_array('Número', 'Cliente', 'Parte contrária', 'Área', 'Fase', 'Situação', 'Responsável'),
      'linhas', jsonb_build_array(
        jsonb_build_array('1000123-25.2025.5.02.0001', 'Márcio Tavares', 'Metalúrgica Andrade', 'Trabalhista', 'Audiência marcada', 'Ativo', 'Dra. Marina'),
        jsonb_build_array('1000456-74.2025.5.02.0001', 'Renata Queiroz', 'Construtora Lume', 'Trabalhista', 'Arquivado', 'Arquivado', 'Dra. Marina'))),
    jsonb_build_object('nome', 'Lançamentos', 'colunas', jsonb_build_array('Data', 'Cliente', 'Processo', 'Descrição', 'Valor', 'Situação', 'Tipo'),
      'linhas', jsonb_build_array(
        jsonb_build_array('15/11/2026', 'Márcio Tavares', '1000123-25.2025.5.02.0001', 'Parcela 2', '1.250,00', 'Em aberto', 'Receita'),
        jsonb_build_array('15/12/2026', 'Márcio Tavares', '1000123-25.2025.5.02.0001', 'Parcela 3', '2.500,00', 'Em aberto', 'Receita'),
        jsonb_build_array('10/01/2025', 'Renata Queiroz', '1000456-74.2025.5.02.0001', 'Parcela final', '900,00', 'Em aberto', 'Receita'),
        jsonb_build_array('05/10/2026', 'Renata Queiroz', '', 'Consulta', '300,00', 'Em aberto', 'Receita'),
        jsonb_build_array('30/10/2026', 'Osvaldo Pereira Lins', '', 'Honorários', '1.250,00', 'Em aberto', 'Receita'),
        jsonb_build_array('10/11/2026', 'Jorge Batista', '', 'Honorários', '500,00', 'Em aberto', 'Receita')))),
  'sistema', jsonb_build_array(
    jsonb_build_object('nome', 'Contatos', 'linhas', 4, 'destino', 'CLIENTES', 'reconhecida', true,
                       'porModelo', jsonb_build_object('0', 'nome', '1', 'tipo_contato', '2', 'telefone')),
    jsonb_build_object('nome', 'Processos', 'linhas', 2, 'destino', 'CASOS', 'reconhecida', true,
                       'porModelo', jsonb_build_object('0', 'numero', '1', 'cliente', '2', 'parte_contraria', '3', 'area', '4', 'etapa',
                                                       '5', 'situacao_processo', '6', 'responsavel')),
    jsonb_build_object('nome', 'Lançamentos', 'linhas', 6, 'destino', 'FINANCEIRO', 'reconhecida', true,
                       'porModelo', jsonb_build_object('0', 'lanc_data', '1', 'cliente', '2', 'numero', '3', 'lanc_descricao', '4', 'lanc_valor',
                                                       '5', 'lanc_situacao', '6', 'lanc_tipo')))) d;

-- Os clientes, com os arquivados como encerrados; depois os processos e, por fim, o financeiro.
create temp table imp as select portal_importacao_criar(socia, rm, arq.d) j from ids, arq;
create temp table v as select (j ->> 'id')::uuid id from imp;
select portal_importacao_arquivados(socia, rm, v.id, (select versao from importacoes where id = v.id), '{"arquivados": "ENCERRADOS"}') from ids, v;
select portal_importacao_colunas(socia, rm, v.id, (select versao from importacoes where id = v.id), jsonb_build_object('aba', 0, 'ligacao', imp.j -> 'ligacao')) from ids, v, imp;
create temp table fim as select portal_importacao_importar(socia, rm, v.id, (select versao from importacoes where id = v.id)) j from ids, v;
create temp table f as select (j -> 'filha' ->> 'id')::uuid id, (j -> 'filhaFinanceiro' ->> 'id')::uuid fin from fim;
select portal_importacao_colunas(socia, rm, f.id, (select versao from importacoes where id = f.id),
  jsonb_build_object('ligacao', (select ligacao from importacoes where id = f.id))) from ids, f;
select is((select portal_importacao_importar(socia, rm, f.id, (select versao from importacoes where id = f.id)) -> 'resumo' -> 'casos' from ids, f), '2'::jsonb,
  'os dois processos entram como casos');
select portal_importacao_colunas(socia, rm, f.fin, (select versao from importacoes where id = f.fin),
  jsonb_build_object('ligacao', (select ligacao from importacoes where id = f.fin))) from ids, f;
select is((select portal_importacao_importar(socia, rm, f.fin, (select versao from importacoes where id = f.fin)) -> 'resumo' -> 'emAberto' from ids, f), '6'::jsonb,
  'os seis lançamentos em aberto entram no histórico');

create temp table k as select
  (select id from clientes_escritorio where nome = 'Márcio Tavares' and escritorio_id = ids.rm) marcio,
  (select id from clientes_escritorio where nome = 'Renata Queiroz' and escritorio_id = ids.rm) renata,
  (select id from clientes_escritorio where nome = 'Osvaldo Pereira Lins' and escritorio_id = ids.rm) osvaldo,
  (select id from clientes_escritorio where nome = 'Jorge Batista' and escritorio_id = ids.rm) jorge,
  (select id from casos where numero_cnj = '10001232520255020001' and escritorio_id = ids.rm) caso_ativo,
  (select id from casos where numero_cnj = '10004567420255020001' and escritorio_id = ids.rm) caso_enc
  from ids;
create temp table lm as select
  (select id from lembrete_contrato where cliente_id = k.marcio) marcio,
  (select id from lembrete_contrato where cliente_id = k.renata) renata,
  (select id from lembrete_contrato where cliente_id = k.osvaldo) osvaldo,
  (select id from lembrete_contrato where cliente_id = k.jorge) jorge
  from k;

-- ---------------------------------------------------------------------------------------
-- Decisão 23: caso encerrado não ganha lembrete; o mais antigo segue a mesma regra.
select is((select jsonb_build_array(valor_em_aberto_centavos, lancamentos, mais_antigo, caso_id is null) from lembrete_contrato, lm where id = lm.renata),
  '[30000, 1, "2026-10-05", true]'::jsonb, 'decisão 23: o lançamento do processo que entrou encerrado fica fora do lembrete e do "mais antigo"');
select is((select count(*) from historico_financeiro_anterior h, k where h.cliente_id = k.renata)::integer, 2, 'o histórico do Astrea entra igual');
select is((select jsonb_build_array(valor_em_aberto_centavos, lancamentos, mais_antigo, caso_id = k.caso_ativo) from lembrete_contrato, lm, k where id = lm.marcio),
  '[375000, 2, "2026-11-15", true]'::jsonb, 'o lembrete do caso em andamento, com o mais antigo');

-- O financeiro antes dos processos: o caso ainda não existe e o lembrete nasce (o escritório dispensa).
create temp table imp2 as select portal_importacao_criar(bia, ca, arq.d) j from ids, arq;
select portal_importacao_arquivados(bia, ca, (j ->> 'id')::uuid, (select versao from importacoes where id = (j ->> 'id')::uuid), '{"arquivados": "ENCERRADOS"}') from ids, imp2;
select portal_importacao_colunas(bia, ca, (j ->> 'id')::uuid, (select versao from importacoes where id = (j ->> 'id')::uuid), jsonb_build_object('aba', 0, 'ligacao', j -> 'ligacao')) from ids, imp2;
create temp table fim2 as select portal_importacao_importar(bia, ca, (j ->> 'id')::uuid, (select versao from importacoes where id = (j ->> 'id')::uuid)) j from ids, imp2;
select portal_importacao_colunas(bia, ca, (j -> 'filhaFinanceiro' ->> 'id')::uuid, (select versao from importacoes where id = (j -> 'filhaFinanceiro' ->> 'id')::uuid),
  jsonb_build_object('ligacao', (select ligacao from importacoes where id = (j -> 'filhaFinanceiro' ->> 'id')::uuid))) from ids, fim2;
select portal_importacao_importar(bia, ca, (j -> 'filhaFinanceiro' ->> 'id')::uuid, (select versao from importacoes where id = (j -> 'filhaFinanceiro' ->> 'id')::uuid)) from ids, fim2;
select is((select jsonb_build_array(l.valor_em_aberto_centavos, l.lancamentos, l.mais_antigo) from lembrete_contrato l join clientes_escritorio c on c.id = l.cliente_id, ids
            where l.escritorio_id = ids.ca and c.nome = 'Renata Queiroz'),
  '[120000, 2, "2025-01-10"]'::jsonb, 'com o financeiro antes dos processos, o lançamento do arquivado entra no lembrete (o caso ainda não existe)');

-- ---------------------------------------------------------------------------------------
-- A origem do caso importado, guardada pelo gatilho ao importar.
select is((select jsonb_build_array(etapa_origem, linha_origem, aba_origem, registro_origem, arquivado_origem_em) from casos, k where id = k.caso_ativo),
  '["Audiência marcada", 2, "Processos", null, null]'::jsonb, 'a etapa, a linha e a aba de lá; o registro e o arquivamento nascem vazios');
select is((select jsonb_build_array(etapa_origem, linha_origem, encerrado_por) from casos, k where id = k.caso_enc),
  '["Arquivado", 3, "IMPORTADO_ENCERRADO"]'::jsonb, 'o arquivado também');
insert into casos (escritorio_id, nome, area, etapa_id, responsavel_id, criado_por)
select rm, 'Caso feito no T3jus', 'CIVEL', (select id from etapas where escritorio_id = rm and not final order by ordem limit 1), socia, socia from ids;
select throws_ok($$ update casos set linha_origem = 4 where nome = 'Caso feito no T3jus' $$, '23514', null, 'o caso feito no T3jus não tem origem');

-- ---------------------------------------------------------------------------------------
-- Os checks do lembrete.
select throws_ok($$ update lembrete_contrato set dispensado_em = now(), dispensado_por = (select socia from ids) where id = (select osvaldo from lm) $$, '23514', null,
  'dispensado sem motivo');
select throws_ok($$ update lembrete_contrato set dispensa_motivo = 'PERDOADO' where id = (select osvaldo from lm) $$, '23514', null, 'motivo sem a dispensa');
select throws_ok($$ update lembrete_contrato set dispensado_em = now(), dispensado_por = (select socia from ids), dispensa_motivo = 'OUTRO' where id = (select osvaldo from lm) $$,
  '23514', null, 'OUTRO sem detalhe');
select throws_ok($$ update lembrete_contrato set dispensado_em = now(), dispensado_por = (select socia from ids), dispensa_motivo = 'OUTRO', dispensa_detalhe = repeat('a', 141)
                    where id = (select osvaldo from lm) $$, '23514', null, 'detalhe de 141 caracteres');
select throws_ok($$ update lembrete_contrato set dispensado_em = now(), dispensado_por = (select socia from ids), dispensa_motivo = 'PERDOADO', resolvido_em = now()
                    where id = (select osvaldo from lm) $$, '23514', null, 'dispensado e resolvido ao mesmo tempo');
select throws_ok($$ update lembrete_contrato set trazido_em = now() where id = (select osvaldo from lm) $$, '23514', null, 'trazido sem quem trouxe');
select ok((select pg_get_indexdef('lembrete_contrato_aberto'::regclass) like '%dispensado_em IS NULL%'), 'o índice dos abertos exige a dispensa vazia');

-- ---------------------------------------------------------------------------------------
-- Dispensar (R1).
select is((teste.erro($$ select portal_lembrete_dispensar(larissa, rm, lm.osvaldo, '{"motivo": "PERDOADO"}') from ids, lm $$)) -> 'detalhe' ->> 'motivo',
  'AREA_NAO_LIBERADA', 'sem a área Contratos, não dispensa (Financeiro)');
select is((teste.erro($$ select portal_lembrete_dispensar(gustavo, rm, lm.osvaldo, '{"motivo": "PERDOADO"}') from ids, lm $$)) -> 'detalhe' ->> 'motivo',
  'AREA_NAO_LIBERADA', 'nem só com o Jurídico');
select is((teste.erro($$ select portal_lembrete_dispensar(bia, ca, lm.osvaldo, '{"motivo": "PERDOADO"}') from ids, lm $$)) ->> 'codigo', 'TC404',
  'outro escritório não acha o lembrete');
select is((teste.erro($$ select portal_lembrete_dispensar(felipe, rm, lm.osvaldo, '{"motivo": "TALVEZ"}') from ids, lm $$)) -> 'detalhe',
  '{"motivo": "MOTIVO_OBRIGATORIO", "campos": ["motivo"]}'::jsonb, 'motivo desconhecido');
select is((teste.erro($$ select portal_lembrete_dispensar(felipe, rm, lm.osvaldo, '{}') from ids, lm $$)) -> 'detalhe',
  '{"motivo": "MOTIVO_OBRIGATORIO", "campos": ["motivo"]}'::jsonb, 'sem motivo');
select is((teste.erro($$ select portal_lembrete_dispensar(felipe, rm, lm.osvaldo, '{"motivo": "OUTRO", "detalhe": "ok"}') from ids, lm $$)) -> 'detalhe',
  '{"motivo": "MOTIVO_OBRIGATORIO", "campos": ["detalhe"]}'::jsonb, 'correção 10: "ok" com OUTRO conta como vazio e falta o detalhe');
select is((teste.erro($$ select portal_lembrete_dispensar(felipe, rm, lm.osvaldo, jsonb_build_object('motivo', 'PERDOADO', 'detalhe', repeat('a', 141))) from ids, lm $$)) -> 'detalhe' -> 'campos',
  '["detalhe"]'::jsonb, 'detalhe de 141 caracteres');

create temp table d1 as select portal_lembrete_dispensar(felipe, rm, lm.osvaldo, '{"motivo": "JA_NEGOCIADO", "detalhe": "  Pagou em 18/11 por Pix.  "}') j from ids, lm;
select is((select jsonb_build_array(dispensa_motivo, dispensa_detalhe, dispensado_por = ids.felipe, dispensado_em = app_now()) from lembrete_contrato, lm, ids where id = lm.osvaldo),
  '["JA_NEGOCIADO", "Pagou em 18/11 por Pix.", true, true]'::jsonb, 'Felipe dispensa: o motivo, o detalhe sem espaços, quem e quando');
select is((select j -> 'lembrete' ->> 'situacao' from d1), 'DISPENSADO', 'a resposta traz a linha dispensada');
select is((select j -> 'totais' from d1),
  '{"abertos": {"n": 3, "valor": 455000}, "contrato": {"n": 0, "valor": 0}, "dispensados": {"n": 1, "valor": 125000}}'::jsonb,
  'os números do alto mudam na hora, em centavos');
select is((select jsonb_build_array(h.entidade, h.entidade_id = k.osvaldo::text, h.dados ->> 'motivo', h.dados ->> 'detalhe', (h.dados ->> 'valor')::bigint, h.autor_id = ids.felipe)
             from historico h, k, ids where h.acao = 'cliente.lembrete_dispensado'),
  '["cliente", true, "JA_NEGOCIADO", "Pagou em 18/11 por Pix.", 125000, true]'::jsonb, 'o histórico do cliente com o motivo e quem');
select is((teste.erro($$ select portal_lembrete_dispensar(socia, rm, lm.osvaldo, '{"motivo": "PERDOADO"}') from ids, lm $$)) -> 'detalhe' ->> 'motivo', 'JA_DISPENSADO',
  'dispensar duas vezes: conflito');
select is((teste.erro($$ select portal_lembrete_dispensar(socia, rm, lm.osvaldo, '{"motivo": "PERDOADO"}') from ids, lm $$)) -> 'detalhe' -> 'por' ->> 'nome', 'Felipe Matos',
  'o conflito diz quem dispensou');
select is((select portal_lembrete_dispensar(felipe, rm, lm.jorge, '{"motivo": "PERDOADO", "detalhe": "ok"}') -> 'lembrete' -> 'dispensa' ->> 'detalhe' from ids, lm), null,
  'correção 10: "ok" sem OUTRO passa, sem detalhe');

-- O gatilho: o contrato novo resolve o aberto e não o dispensado; o lembrete de outro cliente não muda.
select definir_transicao('CONTRATO_CRIADO', null, true);
insert into contratos (escritorio_id, numero, cliente_id, objeto, responsavel_id, criado_por)
select rm, 'C-2026-038', k.osvaldo, 'Honorários do caso', felipe, felipe from ids, k;
select is((select jsonb_build_array(resolvido_em, contrato_id, dispensado_em is not null) from lembrete_contrato, lm where id = lm.osvaldo),
  jsonb_build_array(null, null, true), 'o contrato novo não resolve o lembrete dispensado');
insert into contratos (escritorio_id, numero, cliente_id, objeto, responsavel_id, criado_por)
select rm, 'C-2026-039', k.renata, 'Honorários da consulta', felipe, felipe from ids, k;
select is((select (resolvido_em is not null) and contrato_id = (select id from contratos where numero = 'C-2026-039') from lembrete_contrato, lm where id = lm.renata), true,
  'o contrato novo resolve o aberto do mesmo cliente');
select is((select resolvido_em from lembrete_contrato, lm where id = lm.marcio), null, 'e não mexe no lembrete de outro cliente');
select is((teste.erro($$ select portal_lembrete_dispensar(felipe, rm, lm.renata, '{"motivo": "PERDOADO"}') from ids, lm $$)) -> 'detalhe',
  jsonb_build_object('motivo', 'JA_RESOLVIDO', 'contrato', jsonb_build_object('id', (select id from contratos where numero = 'C-2026-039'), 'numero', 'C-2026-039'),
                     'por', pessoa_ref((select felipe from ids)), 'em', app_now()),
  'dispensar o que virou contrato: conflito com o número, quem criou e quando');

-- ---------------------------------------------------------------------------------------
-- Trazer de volta (R2).
select is((teste.erro($$ select portal_lembrete_trazer(larissa, rm, lm.jorge) from ids, lm $$)) -> 'detalhe' ->> 'motivo', 'AREA_NAO_LIBERADA',
  'sem a área Contratos, não traz de volta');
select is((teste.erro($$ select portal_lembrete_trazer(felipe, rm, lm.marcio) from ids, lm $$)) -> 'detalhe' ->> 'motivo', 'NAO_DISPENSADO',
  'só o dispensado volta');
select is((teste.erro($$ select portal_lembrete_trazer(felipe, rm, lm.marcio) from ids, lm $$)) ->> 'codigo', 'TC409', 'como conflito');
-- Sem prazo: 400 dias depois, ainda volta.
select ajustar_relogio(('2026-11-23 12:00-03'::timestamptz - now()) + interval '400 days');
create temp table t1 as select portal_lembrete_trazer(socia, rm, lm.jorge) j from ids, lm;
select is((select jsonb_build_array(dispensado_em, dispensado_por, dispensa_motivo, dispensa_detalhe, trazido_por = ids.socia, resolvido_em) from lembrete_contrato, lm, ids where id = lm.jorge),
  jsonb_build_array(null, null, null, null, true, null), 'sem contrato no meio, volta aberto, com quem trouxe, 400 dias depois');
select is((select jsonb_build_array(h.dados ->> 'motivoAntes', h.dados ->> 'dispensadoPor' = ids.felipe::text, h.dados ->> 'virouContrato') from historico h, ids where h.acao = 'cliente.lembrete_trazido'),
  '["PERDOADO", true, null]'::jsonb, 'o histórico guarda o motivo de antes e quem tinha dispensado');
select is((select j -> 'totais' -> 'abertos' -> 'n' from t1), '2'::jsonb, 'os números voltam');
select ajustar_relogio(('2026-11-23 12:00-03'::timestamptz - now()));
-- Com um contrato criado enquanto estava dispensado, volta já resolvido, com aquele contrato.
create temp table t2 as select portal_lembrete_trazer(felipe, rm, lm.osvaldo) j from ids, lm;
select is((select jsonb_build_array(contrato_id = (select id from contratos where numero = 'C-2026-038'), resolvido_em = (select criado_em from contratos where numero = 'C-2026-038'),
                                    dispensado_em) from lembrete_contrato, lm where id = lm.osvaldo),
  jsonb_build_array(true, true, null), 'decisão 18: volta já resolvido, com o contrato criado no meio');
select is((select j -> 'lembrete' -> 'contrato' ->> 'numero' from t2), 'C-2026-038', 'a resposta diz o contrato');
select is((select (h.dados ->> 'virouContrato')::uuid = (select id from contratos where numero = 'C-2026-038') from historico h where h.acao = 'cliente.lembrete_trazido'
            order by h.id desc limit 1), true, 'e o histórico também');
-- Dispensar, trazer e dispensar de novo: dois históricos de dispensa.
select portal_lembrete_dispensar(felipe, rm, lm.jorge, '{"motivo": "OUTRO_CONTRATO"}') from ids, lm;
select is((select jsonb_build_array(trazido_em, trazido_por) from lembrete_contrato, lm where id = lm.jorge), jsonb_build_array(null, null),
  'a nova dispensa apaga a volta anterior');
select is((select count(*) from historico h, k where h.acao = 'cliente.lembrete_dispensado' and h.entidade_id = k.jorge::text)::integer, 2,
  'cada dispensa fica no histórico');

-- ---------------------------------------------------------------------------------------
-- A lista em Contratos (portal_contratos_lembretes).
create temp table la as select portal_contratos_lembretes(socia, rm) j from ids;
select is((select jsonb_agg(x -> 'cliente' ->> 'nome') from la, jsonb_array_elements(j -> 'lembretes') x), '["Márcio Tavares"]'::jsonb,
  'Abertos: só o que não virou contrato nem foi dispensado');
select is((select jsonb_build_array(j ->> 'situacao', j ->> 'ordem', j -> 'total', j -> 'valor') from la), '["ABERTO", "VALOR", 1, 375000]'::jsonb,
  'a situação, a ordem padrão, o total e a soma da busca');
select is((select jsonb_build_array(x -> 'lancamentos', x ->> 'maisAntigo', x -> 'caso' ->> 'nome' is not null, x -> 'caso' -> 'responsavel' ->> 'nome', x ->> 'origem')
             from la, jsonb_array_elements(j -> 'lembretes') x),
  '[2, "2026-11-15", true, "Marina Ribeiro", "ASTREA"]'::jsonb, 'a linha: lançamentos, o mais antigo, o caso com o responsável e a origem');
select is((select jsonb_agg(x -> 'cliente' ->> 'nome' order by x -> 'cliente' ->> 'nome') from ids, jsonb_array_elements(portal_contratos_lembretes(socia, rm, 'CONTRATO') -> 'lembretes') x),
  '["Osvaldo Pereira Lins", "Renata Queiroz"]'::jsonb, 'Viraram contrato');
select is((select x -> 'contrato' ->> 'numero' from ids, jsonb_array_elements(portal_contratos_lembretes(socia, rm, 'CONTRATO') -> 'lembretes') x
            where x -> 'cliente' ->> 'nome' = 'Renata Queiroz'), 'C-2026-039', 'com o contrato que nasceu');
select is((select jsonb_build_array(x -> 'cliente' ->> 'nome', x -> 'dispensa' ->> 'motivo', x -> 'dispensa' -> 'por' ->> 'nome')
             from ids, jsonb_array_elements(portal_contratos_lembretes(socia, rm, 'DISPENSADO') -> 'lembretes') x),
  '["Jorge Batista", "OUTRO_CONTRATO", "Felipe Matos"]'::jsonb, 'Dispensados, com o motivo e quem');
select is((select portal_contratos_lembretes(socia, rm, 'DISPENSADO') ->> 'ordem' from ids), null, 'fora de Abertos, sem a ordem');
select is((select jsonb_array_length(portal_contratos_lembretes(socia, rm, 'ABERTO', 'metalurgica') -> 'lembretes') from ids), 1, 'a busca pelo caso, sem acento');
select is((select jsonb_array_length(portal_contratos_lembretes(socia, rm, 'ABERTO', 'TAVARES') -> 'lembretes') from ids), 1, 'a busca pelo cliente');
select is((select jsonb_array_length(portal_contratos_lembretes(socia, rm, 'ABERTO', 'Jorge') -> 'lembretes') from ids), 0, 'a busca vale só no grupo atual');
select is((select jsonb_build_array(x -> 'lembretes', x -> 'valor', x ->> 'origem', x -> 'por' ->> 'nome') from la, jsonb_array_elements(j -> 'importacoes') x),
  '[4, 580000, "ASTREA", "Marina Ribeiro"]'::jsonb, '"De onde vieram": os criados pela importação e a soma');
select is((teste.erro($$ select portal_contratos_lembretes(socia, rm, 'TODOS') from ids $$)) -> 'detalhe' -> 'campos', '["situacao"]'::jsonb, 'situação desconhecida');
select is((teste.erro($$ select portal_contratos_lembretes(socia, rm, 'ABERTO', repeat('a', 121)) from ids $$)) -> 'detalhe' -> 'campos', '["q"]'::jsonb, 'busca longa');
select is((teste.erro($$ select portal_contratos_lembretes(socia, rm, 'ABERTO', null, 'DATA') from ids $$)) -> 'detalhe' -> 'campos', '["ordem"]'::jsonb, 'ordem desconhecida');
select is((teste.erro($$ select portal_contratos_lembretes(socia, rm, 'ABERTO', null, null, 10001) from ids $$)) -> 'detalhe' -> 'campos', '["pular"]'::jsonb, 'página inválida');
select is((teste.erro($$ select portal_contratos_lembretes(larissa, rm) from ids $$)) -> 'detalhe' ->> 'motivo', 'AREA_NAO_LIBERADA', 'só quem tem Contratos vê a lista');

-- A Vale Alto: o cliente que já tinha contrato ativo antes do lembrete.
select definir_transicao('CONTRATO_CRIADO', null, true);
insert into contratos (escritorio_id, numero, cliente_id, objeto, responsavel_id, criado_por, criado_em)
select ca, 'C-2026-024', c.id, 'Contrato anterior', bia, bia, timestamptz '2026-01-10 10:00-03'
  from ids, clientes_escritorio c where c.escritorio_id = ids.ca and c.nome = 'Jorge Batista';
select definir_transicao('CONTRATO_ASSINADO', null, true);
update contratos set estado = 'ATIVO', assinado_em = date '2026-01-10' where numero = 'C-2026-024';
select is((select jsonb_agg(x -> 'contratoAtivo' ->> 'numero' order by x -> 'cliente' ->> 'nome') from ids, jsonb_array_elements(portal_contratos_lembretes(bia, ca) -> 'lembretes') x),
  '["C-2026-024", null, null, null]'::jsonb, 'o aviso do contrato ativo só para quem já o tinha antes do lembrete');

-- Ordem e página de 25 (Costa Advogados, com mais 27 lembretes).
select definir_transicao('CLIENTE_CRIADO', null, true);
insert into clientes_escritorio (escritorio_id, nome, tipo, criado_por, contatos)
select ids.ca, 'Cliente ' || lpad(n::text, 2, '0'), 'PF', ids.bia, (select contatos from clientes_escritorio where escritorio_id = ids.ca limit 1)
  from ids, generate_series(1, 27) n;
insert into lembrete_contrato (escritorio_id, importacao_id, cliente_id, valor_em_aberto_centavos, lancamentos, mais_antigo)
select ids.ca, (select (j -> 'filhaFinanceiro' ->> 'id')::uuid from fim2), c.id, 1000 * substring(c.nome from '[0-9]+')::integer, 1,
       date '2026-01-01' + substring(c.nome from '[0-9]+')::integer
  from ids, clientes_escritorio c where c.escritorio_id = ids.ca and c.nome like 'Cliente %';
select is((select jsonb_build_array(j -> 'total', jsonb_array_length(j -> 'lembretes')) from ids, portal_contratos_lembretes(bia, ca) j), '[31, 25]'::jsonb,
  'página de 25');
select is((select jsonb_array_length(portal_contratos_lembretes(bia, ca, 'ABERTO', null, null, 25) -> 'lembretes') from ids), 6, '"Mostrar mais 25"');
select is((select jsonb_agg(x -> 'valor') from ids, jsonb_array_elements(portal_contratos_lembretes(bia, ca) -> 'lembretes') with ordinality t(x, n) where n <= 3),
  '[375000, 125000, 120000]'::jsonb, 'VALOR: do maior para o menor');
select is((select jsonb_agg(x ->> 'maisAntigo') from ids, jsonb_array_elements(portal_contratos_lembretes(bia, ca, 'ABERTO', null, 'ANTIGO') -> 'lembretes') with ordinality t(x, n) where n <= 2),
  '["2025-01-10", "2026-01-02"]'::jsonb, 'ANTIGO: do lançamento mais antigo');
select is((select jsonb_agg(x -> 'cliente' ->> 'nome') from ids, jsonb_array_elements(portal_contratos_lembretes(bia, ca, 'ABERTO', null, 'NOME') -> 'lembretes') with ordinality t(x, n) where n <= 2),
  '["Cliente 01", "Cliente 02"]'::jsonb, 'NOME: de A a Z');

-- A faixa da lista de Contratos.
select is((select portal_contratos_lembretes_resumo(socia, rm) - 'importadoEm' from ids), '{"clientes": 1, "abertos": 1, "valor": 375000, "origem": "ASTREA"}'::jsonb,
  'a faixa: os clientes, a soma e a origem');
insert into lembrete_contrato (escritorio_id, importacao_id, cliente_id, valor_em_aberto_centavos, lancamentos)
select rm, f.fin, k.marcio, 10000, 1 from ids, f, k;
select is((select portal_contratos_lembretes_resumo(socia, rm) -> 'clientes' from ids), '1'::jsonb, 'o cliente com dois lembretes conta uma vez');
delete from lembrete_contrato where valor_em_aberto_centavos = 10000 and escritorio_id = (select rm from ids);
select is((teste.erro($$ select portal_contratos_lembretes_resumo(larissa, rm) from ids $$)) -> 'detalhe' ->> 'motivo', 'AREA_NAO_LIBERADA', 'a faixa é da área Contratos');

-- ---------------------------------------------------------------------------------------
-- A ficha do cliente.
select is((select jsonb_build_array(jsonb_array_length(a -> 'lembretes'), a -> 'dispensados' -> 0 ->> 'motivo', a -> 'dispensados' -> 0 -> 'por' ->> 'nome')
             from ids, k, lateral (select portal_cliente_anterior(socia, rm, k.jorge) -> 'anterior' a) x),
  '[0, "OUTRO_CONTRATO", "Felipe Matos"]'::jsonb, 'o dispensado sai dos lembretes e fica na linha discreta');
select is((select portal_cliente_anterior(larissa, rm, k.marcio) -> 'anterior' -> 'lembretes' -> 0 -> 'valor' from ids, k), '375000'::jsonb,
  'quem tem o Financeiro vê o lembrete');
select is((select portal_cliente_anterior(gustavo, rm, k.marcio) -> 'anterior' from ids, k), 'null'::jsonb, 'quem só tem o Jurídico não vê');

-- ---------------------------------------------------------------------------------------
-- Jurídico: a linha do caso e a lista dos encerrados.
select is((select (caso_linha(c) -> 'origem') - 'importadoEm' from casos c, k where c.id = k.caso_enc),
  '{"sistema": "ASTREA", "arquivadoEm": null, "desfeitaEm": null}'::jsonb, 'a linha do caso importado diz de onde veio');
select is((select caso_linha(c) -> 'acerto' from casos c, k where c.id = k.caso_enc), 'null'::jsonb, 'o importado encerrado não tem acerto');
-- Dois encerrados no T3jus: um com o acerto feito e um com o levantamento ainda sem fechamento.
insert into casos (escritorio_id, nome, area, etapa_id, responsavel_id, criado_por, situacao, resultado, encerrado_em, encerrado_por)
select rm, x.nome, 'CIVEL', (select id from etapas where escritorio_id = rm and final), socia, socia, 'ENCERRADO', 'GANHO', x.em, 'RESULTADO'
  from ids, (values ('Castro x Banco Horizonte', timestamptz '2026-10-30 10:00-03'), ('Mendes x Viação Cometa', timestamptz '2026-10-14 10:00-03')) x(nome, em);
insert into caso_clientes (escritorio_id, caso_id, cliente_id, papel, ordem)
select rm, c.id, k.osvaldo, 'AUTOR', 1 from ids, k, casos c where c.nome in ('Castro x Banco Horizonte', 'Mendes x Viação Cometa');
insert into fechamentos_caso (escritorio_id, caso_id, fechado_por) select rm, c.id, socia from ids, casos c where c.nome = 'Castro x Banco Horizonte';
insert into levantamentos (escritorio_id, caso_id, cliente_id, tipo, valor, entrou_em, autor_id)
select rm, c.id, k.osvaldo, 'ALVARA', 100000, date '2026-10-20', socia from ids, k, casos c where c.nome = 'Mendes x Viação Cometa';
select is((select jsonb_object_agg(c.nome, caso_linha(c) -> 'acerto') from casos c where c.nome in ('Castro x Banco Horizonte', 'Mendes x Viação Cometa')),
  '{"Castro x Banco Horizonte": "FEITO", "Mendes x Viação Cometa": "PENDENTE"}'::jsonb, 'o acerto feito ou pendente, na coluna "Como encerrou"');

create temp table je as select portal_juridico_casos(socia, rm, 'ENCERRADO') j from ids;
select is((select jsonb_build_array(j -> 'como', j -> 'origensImportados', j -> 'total') from je),
  '[{"resultado": 2, "importados": 1, "desfeitos": 0}, ["ASTREA"], 3]'::jsonb, 'a contagem por "Como encerrou" e de que sistema vieram');
select is((select jsonb_agg(x ->> 'encerradoPor') from je, jsonb_array_elements(j -> 'casos') x),
  '["IMPORTADO_ENCERRADO", "RESULTADO", "RESULTADO"]'::jsonb, 'do mais recente para o mais antigo (o importado encerrado entrou hoje)');
select is((select jsonb_agg(x ->> 'encerradoPor') from ids, jsonb_array_elements(portal_juridico_casos(socia, rm, 'ENCERRADO', null, null, null, 'IMPORTADO') -> 'casos') x),
  '["IMPORTADO_ENCERRADO"]'::jsonb, 'o filtro "Veio encerrado da importação"');
select is((select portal_juridico_casos(socia, rm, 'ENCERRADO', null, null, null, 'RESULTADO') -> 'total' from ids), '2'::jsonb, 'o filtro "Com resultado"');
select is((select portal_juridico_casos(socia, rm, 'ENCERRADO', null, null, null, 'DESFEITA') -> 'total' from ids), '0'::jsonb, 'o filtro "Importação desfeita"');
select is((teste.erro($$ select portal_juridico_casos(socia, rm, 'ANDAMENTO', null, null, null, 'IMPORTADO') from ids $$)) -> 'detalhe' -> 'campos', '["como"]'::jsonb,
  '"Como encerrou" só nos Encerrados');
select is((teste.erro($$ select portal_juridico_casos(socia, rm, 'ENCERRADO', null, null, null, 'TODOS') from ids $$)) -> 'detalhe' -> 'campos', '["como"]'::jsonb,
  '"Como encerrou" desconhecido');
-- Página de 25 nos Encerrados, medida com 2.000 encerrados.
insert into casos (escritorio_id, nome, area, etapa_id, responsavel_id, criado_por, situacao, encerrado_em, encerrado_por, importacao_id)
select ids.rm, 'Arquivado ' || n, 'CIVEL', (select id from etapas where escritorio_id = ids.rm and final), ids.socia, ids.socia, 'ENCERRADO',
       timestamptz '2026-11-01 10:00-03' - n * interval '1 hour', 'IMPORTADO_ENCERRADO', f.id
  from ids, f, generate_series(1, 2000) n;
create temp table t0 as select clock_timestamp() t;
create temp table je2 as select portal_juridico_casos(socia, rm, 'ENCERRADO', null, null, null, null, 25) j from ids;
select ok((select clock_timestamp() - t < interval '3 seconds' from t0), 'com 2.000 encerrados, a página sai em menos de 3 segundos');
select is((select jsonb_build_array(j -> 'total', jsonb_array_length(j -> 'casos'), j -> 'pular') from je2), '[2003, 25, 25]'::jsonb, 'a segunda página, com o total');
select is((teste.erro($$ select portal_juridico_casos(socia, rm, 'ENCERRADO', null, null, null, null, -1) from ids $$)) -> 'detalhe' -> 'campos', '["pular"]'::jsonb, 'página inválida');
delete from casos where nome like 'Arquivado %' and escritorio_id = (select rm from ids);

-- ---------------------------------------------------------------------------------------
-- Jurídico: a ficha do caso importado.
create temp table fa as select portal_juridico_caso(socia, rm, k.caso_ativo) j from ids, k;
select is((select (j -> 'origem') - 'importacaoId' - 'em' - 'por' from fa),
  jsonb_build_object('sistema', 'ASTREA', 'desfeitaEm', null, 'etapaOrigem', 'Audiência marcada', 'linhaOrigem', 2, 'abaOrigem', 'Processos', 'registroOrigem', null,
                     'arquivadoEm', null, 'veioEncerrado', false,
                     'etapaLigada', (select jsonb_build_object('ordem', e.ordem, 'nome', e.nome) from etapas e, casos c, k where c.id = k.caso_ativo and e.id = c.etapa_id)),
  'a origem: a etapa de lá, a linha, a aba e a etapa do escritório ligada a ela');
select is((select j -> 'lembretes' from fa), jsonb_build_array(jsonb_build_object('clienteId', (select marcio from k), 'valor', 375000, 'sistema', 'ASTREA')),
  'os lembretes dos clientes do caso, para quem vê valores');
select is((select portal_juridico_caso(gustavo, rm, k.caso_ativo) -> 'lembretes' from ids, k), 'null'::jsonb, 'quem só tem o Jurídico não vê o valor');
select is((select jsonb_build_array(j -> 'podeRegistrarResultado', (select portal_juridico_caso(socia, rm, k.caso_enc) -> 'podeRegistrarResultado' from ids, k),
                                    (select portal_juridico_caso(gustavo, rm, k.caso_enc) -> 'podeRegistrarResultado' from ids, k)) from fa),
  '[false, true, true]'::jsonb, 'registrar o resultado só no caso que veio encerrado, com o Jurídico');

-- ---------------------------------------------------------------------------------------
-- R3 nas contas, antes de registrar: fora do acerto, do próximo passo e dos relatórios.
select is((select caso_resumo_acerto(socia, rm, k.caso_enc) from ids, k), null::jsonb, 'sem acerto');
select is((select count(*) from ids, k, relatorio_casos(rm, date '2026-11-01', date '2026-11-30') r where r.id = k.caso_enc)::integer, 0,
  'fora dos relatórios do sócio');

-- Correção 8: com um levantamento (RPV ou alvará), o arquivado volta ao acerto.
insert into casos (escritorio_id, nome, area, etapa_id, responsavel_id, criado_por, situacao, encerrado_em, encerrado_por, importacao_id)
select rm, 'Barros x INSS', 'PREVIDENCIARIO', (select id from etapas where escritorio_id = rm and final), socia, socia, 'ENCERRADO', app_now(), 'IMPORTADO_ENCERRADO', f.id
  from ids, f;
select definir_transicao('CLIENTE_CRIADO', null, true);
insert into clientes_escritorio (escritorio_id, nome, tipo, criado_por, contatos)
select rm, 'Lúcia Barros', 'PF', socia, (select contatos from clientes_escritorio where escritorio_id = ids.rm limit 1) from ids;
insert into caso_clientes (escritorio_id, caso_id, cliente_id, papel, ordem)
select rm, c.id, (select id from clientes_escritorio where nome = 'Lúcia Barros'), 'AUTOR', 1 from ids, casos c where c.nome = 'Barros x INSS';
select is((select cliente_passo(socia, rm, (select id from clientes_escritorio where nome = 'Lúcia Barros')) ->> 'tipo' from ids), 'SEM_PROPOSTA',
  'sem levantamento, o arquivado fica fora do acerto');
insert into levantamentos (escritorio_id, caso_id, cliente_id, tipo, valor, entrou_em, autor_id)
select rm, c.id, (select id from clientes_escritorio where nome = 'Lúcia Barros'), 'RPV', 250000, date '2026-11-20', socia from ids, casos c where c.nome = 'Barros x INSS';
select isnt((select caso_resumo_acerto(socia, rm, c.id) from ids, casos c where c.nome = 'Barros x INSS'), null::jsonb, 'com o RPV, o acerto volta');
select is((select cliente_passo(socia, rm, (select id from clientes_escritorio where nome = 'Lúcia Barros')) ->> 'tipo' from ids), 'FECHAMENTO',
  'e o próximo passo é o fechamento');

-- ---------------------------------------------------------------------------------------
-- Registrar o resultado.
select is((teste.erro($$ select portal_juridico_caso_resultado(felipe, rm, k.caso_enc, 1, '{"resultado": "GANHO", "motivo": "Sentença procedente"}') from ids, k $$)) -> 'detalhe' ->> 'motivo',
  'AREA_NAO_LIBERADA', 'sem o Jurídico, não registra');
select is((teste.erro($$ select portal_juridico_caso_resultado(bia, ca, k.caso_enc, 1, '{"resultado": "GANHO", "motivo": "Sentença procedente"}') from ids, k $$)) ->> 'codigo',
  'TC404', 'outro escritório não acha o caso');
select is((teste.erro($$ select portal_juridico_caso_resultado(socia, rm, k.caso_ativo, 1, '{"resultado": "GANHO", "motivo": "Sentença procedente"}') from ids, k $$)) -> 'detalhe' ->> 'motivo',
  'CASO_COM_RESULTADO', 'o caso em andamento não usa esta rota');
select is((teste.erro($$ select portal_juridico_caso_resultado(socia, rm, c.id, c.versao, '{"resultado": "GANHO", "motivo": "Sentença procedente"}') from ids, casos c where c.nome = 'Castro x Banco Horizonte' $$)) -> 'detalhe' ->> 'motivo',
  'CASO_COM_RESULTADO', 'nem o que já tem resultado');
select is((teste.erro($$ select portal_juridico_caso_resultado(socia, rm, k.caso_enc, c.versao, '{"motivo": "ok"}') from ids, k, casos c where c.id = k.caso_enc $$)) -> 'detalhe',
  '{"motivo": "RESULTADO_OBRIGATORIO", "campos": ["motivo", "resultado"]}'::jsonb, 'sem resultado e com o motivo curto, os dois erros juntos');
select is((teste.erro($$ select portal_juridico_caso_resultado(socia, rm, k.caso_enc, c.versao, '{"resultado": "GANHO"}') from ids, k, casos c where c.id = k.caso_enc $$)) -> 'detalhe' ->> 'motivo',
  'MOTIVO_OBRIGATORIO', 'sem motivo');
select is((teste.erro($$ select portal_juridico_caso_resultado(socia, rm, k.caso_enc, c.versao - 1, '{"resultado": "GANHO", "motivo": "Sentença procedente"}') from ids, k, casos c where c.id = k.caso_enc $$)) ->> 'codigo',
  'TC409', 'com a versão velha, conflito');

create temp table antes as select c.* from casos c, k where c.id = k.caso_enc;
create temp table rr as select portal_juridico_caso_resultado(gustavo, rm, k.caso_enc, antes.versao, '{"resultado": "GANHO", "motivo": "Sentença procedente, confirmada pelo TRT."}') j
  from ids, k, antes;
select is((select jsonb_build_array(c.resultado, c.encerrado_por, c.encerrado_em = antes.encerrado_em, c.etapa_id = antes.etapa_id, c.situacao) from casos c, antes where c.id = antes.id),
  jsonb_build_array('GANHO', 'RESULTADO', true, true, 'ENCERRADO'), 'GANHO: o resultado entra; a data do encerramento e a etapa ficam');
select is((select (j ->> 'versao')::integer - antes.versao from rr, antes), 1, 'a versão sobe');
select is((select jsonb_build_array(m.resultado, m.de_etapa_id = m.para_etapa_id, m.aviso_texto, m.motivo) from caso_etapa_mudancas m, antes where m.caso_id = antes.id order by m.ordem desc limit 1),
  jsonb_build_array('GANHO', true, null, 'Sentença procedente, confirmada pelo TRT.'), 'uma mudança nova com o resultado, sem aviso ao cliente');
select is((select jsonb_build_array(h.dados ->> 'resultado', h.dados ->> 'antes', h.autor_id = ids.gustavo) from historico h, antes, ids
            where h.acao = 'juridico.resultado_registrado' and h.entidade_id = antes.id::text),
  '["GANHO", "IMPORTADO_ENCERRADO", true]'::jsonb, 'o histórico do caso');
select is((select count(*) from exitos_conferir x, antes where x.caso_id = antes.id)::integer, 0, 'não nasce êxito: o caso não tem contrato');
select isnt((select caso_resumo_acerto(socia, rm, antes.id) from ids, antes), null::jsonb, 'agora entra nas contas do acerto');
select is((select count(*) from ids, antes, relatorio_casos(rm, date '2026-11-01', date '2026-11-30') r where r.id = antes.id)::integer, 1,
  'e nos relatórios do sócio, no mês da importação');
select is((select portal_juridico_caso(socia, rm, antes.id) -> 'resultadoRegistrado' -> 'por' ->> 'nome' from ids, antes), 'Gustavo Lima',
  'a ficha diz quem registrou');
select is((select portal_juridico_caso(socia, rm, antes.id) -> 'origem' -> 'veioEncerrado' from ids, antes), 'true'::jsonb, 'e que veio encerrado');
select is((teste.erro($$ select portal_juridico_caso_resultado(socia, rm, k.caso_enc, c.versao, '{"resultado": "PERDA", "motivo": "Outra coisa"}') from ids, k, casos c where c.id = k.caso_enc $$)) -> 'detalhe' ->> 'motivo',
  'CASO_COM_RESULTADO', 'registrar duas vezes não vale');

-- Decisão 2: o cliente cujo único caso era esse vira "Cliente atendido", com a origem do caso.
delete from lembrete_contrato where cliente_id = (select renata from k);
delete from contratos where numero = 'C-2026-039';
select is((select jsonb_build_array(p ->> 'tipo', p -> 'item' -> 'caso' ->> 'veioEncerradoDe', p -> 'item' -> 'caso' ->> 'resultado') from ids, k, cliente_passo(socia, rm, k.renata) p),
  '["ATENDIDO", "ASTREA", "GANHO"]'::jsonb, 'decisão 2: "Cliente atendido", com o caso que veio encerrado do Astrea');

-- Correção 9: desfazer a importação dos processos não mexe no caso com resultado registrado.
update importacoes set desfazer_ate = app_now() + interval '1 day' where id = (select id from f);
select portal_importacao_desfazer(socia, rm, f.id, 'Importei o backup errado') from ids, f;
select is((select jsonb_build_array(c.resultado, c.encerrado_por) from casos c, antes where c.id = antes.id), '["GANHO", "RESULTADO"]'::jsonb,
  'o caso com o resultado registrado fica, mesmo depois de desfazer a importação');

-- Decisão 19: desfazer o financeiro tira o aberto e o dispensado; o que virou contrato fica.
select is((select portal_importacao_plano_desfazer(socia, rm, f.fin) -> 'lembretes' from ids, f), '2'::jsonb, 'o plano conta o aberto e o dispensado');
select portal_importacao_desfazer(socia, rm, f.fin, 'Importei o backup errado') from ids, f;
select is((select jsonb_object_agg(c.nome, l.desfeito_em is not null) from lembrete_contrato l join clientes_escritorio c on c.id = l.cliente_id, ids where l.escritorio_id = ids.rm),
  '{"Márcio Tavares": true, "Jorge Batista": true, "Osvaldo Pereira Lins": false}'::jsonb, 'o aberto e o dispensado saem; o que virou contrato fica');
select is((select portal_contratos_lembretes(socia, rm, 'DISPENSADO') -> 'total' from ids), '0'::jsonb, 'desfeito não aparece em nenhum grupo');
select is((teste.erro($$ select portal_lembrete_trazer(felipe, rm, lm.jorge) from ids, lm $$)) ->> 'codigo', 'TC404', 'nem volta');

-- ---------------------------------------------------------------------------------------
-- Segurança: as funções de entrada passam pelo servidor; as peças de leitura, não.
select is((select coalesce(array_agg(p.proname::text order by p.proname), '{}') from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname in ('portal_lembrete_dispensar', 'portal_lembrete_trazer', 'portal_contratos_lembretes',
                                                         'portal_contratos_lembretes_resumo', 'portal_juridico_caso_resultado', 'portal_juridico_casos')
              and not p.prosecdef), '{}'::text[], 'as seis funções de entrada são security definer');
select is((select coalesce(array_agg(p.proname::text order by p.proname), '{}') from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname in ('lembretes_totais', 'lembrete_linha', 'lembrete_situacao', 'lembrete_contrato_ativo', 'lembrete_para_mudar',
                                                         'caso_acerto_linha', 'lancamento_de_encerrado_importado')
              and (p.prosecdef or has_function_privilege('service_role', p.oid, 'execute'))), '{}'::text[],
  'correção 5: as peças de leitura não são security definer nem chamáveis pelo servidor');
select is((select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname like 'portal\_%' and p.proname in ('portal_lembrete_dispensar', 'portal_contratos_lembretes')
              and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute')))::integer, 0,
  'nem anon nem authenticated chamam');

select * from finish();
rollback;
