-- CH-14 · Documentos marcados conforme a área (1070; F3.170 e F3.171): a sugestão do T3jus igual à
-- de hoje nas 8 áreas, a lista salva por área com versão e conflito, a validação das chaves, o OUTRO
-- de outro escritório ou arquivado recusado ao salvar e tirado na leitura, quem muda (contratos.editar,
-- Portal aberto), o isolamento entre escritórios (PT-01), a área em Gerar (caso, contrato ou nenhuma),
-- a área gravada no contrato só em elaboração, sem área e sem caso (nunca OUTRA), e o aviso "também
-- tem" só para o que entrou na lista depois da última geração.
begin;
select plan(58);

select ajustar_relogio(('2026-11-24 10:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Larissa Costa') as larissa,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, diego, 'Diego Almeida', array['CONTRATOS']),
       portal_convidar(socia, rm, larissa, 'Larissa Costa', array['JURIDICO']) from ids;
select portal_oab_incluir(socia, rm, socia, '{"uf": "SP", "numero": "214538", "tipo": "PRINCIPAL"}') from ids;
create temp table oab as select (select id from oab_inscricao where pessoa_id = ids.socia and removido_em is null) msp from ids;

create function pg_temp.cli(p_nome text) returns uuid language sql as $$
  select (portal_cliente_cadastrar(ids.socia, ids.rm, jsonb_build_object('tipo', 'PF', 'nome', p_nome, 'origem', 'GOOGLE',
    'contatos', jsonb_build_array(jsonb_build_object('nome', p_nome, 'telefone', '+5511985521034', 'principal', true)))) ->> 'id')::uuid from ids
$$;
create function pg_temp.contrato(p_cliente uuid, p_objeto text, p_area text default null) returns uuid language sql as $$
  select (portal_contrato_criar_area(ids.socia, ids.rm, jsonb_build_object('clienteId', p_cliente, 'objeto', p_objeto,
    'responsavelId', ids.socia, 'advogados', jsonb_build_array(ids.socia), 'area', p_area,
    'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'FIXO', 'valor', 450000, 'vencimento', '2026-12-05')))) ->> 'id')::uuid from ids
$$;
create function pg_temp.modelo(p_nome text) returns uuid language sql as $$
  select (portal_documento_modelo_enviar(ids.diego, ids.rm, null, jsonb_build_object('nome', p_nome, 'tipo', 'OUTRO'),
    jsonb_build_object('versaoId', gen_random_uuid(), 'arquivo', 'm.docx', 'tamanho', 7000, 'campos', '["CLIENTE_NOME"]'::jsonb,
                       'desconhecidos', '[]'::jsonb, 'paragrafos', '["[CLIENTE_NOME]"]'::jsonb)) ->> 'id')::uuid from ids
$$;
create function pg_temp.salvar(p_pessoa uuid, p_area text, p_versao integer, p_docs jsonb) returns jsonb language sql as $$
  select portal_documentos_por_area_salvar(p_pessoa, ids.rm, p_area, p_versao, p_docs) from ids
$$;
create function pg_temp.area(p_area text) returns jsonb language sql as $$
  select a from ids, jsonb_array_elements(portal_documentos_por_area(ids.diego, ids.rm) -> 'areas') a where a ->> 'area' = p_area
$$;
create function pg_temp.pedido(p_extra jsonb default '{}') returns jsonb language sql as $$
  select jsonb_build_object('documentos', '[{"tipo": "PROCURACAO"}]'::jsonb,
    'outorgados', jsonb_build_array(jsonb_build_object('pessoaId', ids.socia, 'inscricoes', jsonb_build_array(oab.msp))),
    'poderes', '["RECEBER_QUITAR"]'::jsonb, 'cidadeData', 'São Paulo, 24 de novembro de 2026') || p_extra from ids, oab
$$;
create function pg_temp.gerar(p_contrato uuid, p_extra jsonb default '{}') returns jsonb language sql as $$
  select portal_documento_gravar(ids.diego, ids.rm, p_contrato, pg_temp.pedido(p_extra),
    jsonb_build_object('geracaoId', gen_random_uuid(), 'padraoDe', '2026-11-21',
      'documentos', jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'chave', 'PROCURACAO', 'arquivo', 'procuracao.docx', 'tamanho', 4200, 'marcados', '[]'::jsonb))))
    from ids
$$;
create function pg_temp.sug(p_contrato uuid) returns jsonb language sql as $$
  select portal_documento_dados(ids.diego, ids.rm, p_contrato) -> 'sugestao' from ids
$$;

create temp table cli as select pg_temp.cli('Benedito Souza Lima') bene, pg_temp.cli('Pedro Henrique Alves Souza') pedro,
  pg_temp.cli('Farmácia Bom Jesus') farm, pg_temp.cli('Antônia Prado') ant, pg_temp.cli('Joana Souza') joana;
create temp table ct as select
  pg_temp.contrato(cli.bene, 'Aposentadoria por idade', 'PREVIDENCIARIO') bene,
  pg_temp.contrato(cli.pedro, 'Alimentos') pedro,
  pg_temp.contrato(cli.farm, 'Cobrança de duplicatas', 'TRABALHISTA') farm,
  pg_temp.contrato(cli.ant, 'Consultoria') ant,
  pg_temp.contrato(cli.joana, 'Revisão') joana
  from cli;
create temp table mo as select pg_temp.modelo('Declaração de residência') res, pg_temp.modelo('Requerimento ao INSS') req;
create temp table mo_b as select (portal_documento_modelo_enviar(intrusa, outro, null, '{"nome": "Modelo do outro", "tipo": "OUTRO"}',
  jsonb_build_object('versaoId', gen_random_uuid(), 'arquivo', 'o.docx', 'tamanho', 7000, 'campos', '[]'::jsonb, 'desconhecidos', '[]'::jsonb,
                     'paragrafos', '[]'::jsonb)) ->> 'id')::uuid id from ids;

-- 1. A tabela.
select ok((select relrowsecurity and relforcerowsecurity from pg_class where relname = 'documentos_por_area'),
  'CH-14 PT-01: documentos_por_area tem RLS forçado');
select ok(exists (select 1 from pg_policy where polrelid = 'documentos_por_area'::regclass and polname = 'isolamento_escritorio'),
  'CH-14 PT-01: a política de isolamento por escritório existe');
select ok(exists (select 1 from inventario_dados where tabela = 'documentos_por_area' and not dado_pessoal and exportar),
  'CH-14 PT-11: está no inventário, sem dado pessoal, e vai na exportação');
select ok(documentos_por_area_validos(array['CONTRATO', 'OUTRO:' || gen_random_uuid()::text])
          and not documentos_por_area_validos(array['CONTRATO', 'CONTRATO'])
          and not documentos_por_area_validos(array['FOO'])
          and not documentos_por_area_validos(array[null::text])
          and not documentos_por_area_validos(array(select 'CONTRATO' || n from generate_series(1, 13) n)),
  'CH-14: o check confere formato, repetidos, nulo e até 12 chaves');

-- 2. A sugestão do T3jus, igual à de hoje nas 8 áreas (pergunta 4).
create temp table l0 as select portal_documentos_por_area(diego, rm) j from ids;
select is((select array_agg(a ->> 'area' order by n) from l0, jsonb_array_elements(j -> 'areas') with ordinality x(a, n)),
  array['PREVIDENCIARIO', 'TRABALHISTA', 'CIVEL', 'CONSUMIDOR', 'FAMILIA', 'SAUDE', 'TRIBUTARIO', 'OUTRA'],
  'CH-14 pergunta 1: as 8 áreas, na ordem de Documentos para começar, com Outra no fim');
select ok((select bool_and(a -> 'documentos' = '["CONTRATO", "PROCURACAO", "HIPOSSUFICIENCIA"]'::jsonb and not (a ->> 'salva')::boolean
                           and (a ->> 'igualSugestao')::boolean and a ->> 'versao' is null) from l0, jsonb_array_elements(j -> 'areas') a),
  'CH-14 pergunta 4: sem linha salva, vale a sugestão do T3jus (contrato, procuração e declaração), também em Tributário');
select is((select jsonb_agg(m ->> 'chave') from l0, jsonb_array_elements(j -> 'modelos') m),
  jsonb_build_array('CONTRATO', 'PROCURACAO', 'HIPOSSUFICIENCIA', 'OUTRO:' || (select res from mo), 'OUTRO:' || (select req from mo)),
  'CH-14: os modelos ativos, na ordem, com os outros do escritório pela ordem de envio');
select is((select j -> 'podeEditar' from l0), 'true'::jsonb, 'CH-14 pergunta 3: quem tem contratos.editar (equipe com Contratos) muda');

-- 3. Isolamento e permissão.
select is((teste.erro($$ select portal_documentos_por_area(intrusa, rm) from ids $$)) ->> 'codigo', 'TC401',
  'CH-14 PT-01: o escritório A não lê a lista do B');
select isnt((teste.erro($$ select portal_documentos_por_area_salvar(intrusa, rm, 'PREVIDENCIARIO', null, '["CONTRATO"]') from ids $$)), null,
  'CH-14 PT-01: o escritório A não salva a lista do B');
select is((teste.erro($$ select portal_documentos_por_area_salvar(intrusa, outro, 'PREVIDENCIARIO', null, jsonb_build_array('OUTRO:' || mo.res)) from ids, mo $$))
          -> 'detalhe' ->> 'motivo', 'MODELO_INVALIDO', 'CH-14 PT-01: o OUTRO de outro escritório é recusado ao salvar');
select is((teste.erro($$ select portal_documentos_por_area_salvar(socia, rm, 'PREVIDENCIARIO', null, jsonb_build_array('OUTRO:' || mo_b.id)) from ids, mo_b $$))
          -> 'detalhe' ->> 'motivo', 'MODELO_INVALIDO', 'CH-14 PT-01: nem o B entra na lista do A');
select is((teste.erro($$ select portal_documentos_por_area(larissa, rm) from ids $$)) -> 'detalhe' ->> 'motivo', 'AREA_NAO_LIBERADA',
  'CH-14 PA-01: quem não tem a área Contratos não lê');

-- 4. Validação.
select is((teste.erro($$ select pg_temp.salvar((select diego from ids), 'ADMINISTRATIVO', null, '["CONTRATO"]') $$)) -> 'detalhe' -> 'campos', '["area"]'::jsonb,
  'CH-14: área fora da lista é recusada');
select is((teste.erro($$ select pg_temp.salvar((select diego from ids), 'PREVIDENCIARIO', null, '["CONTRATO", "FOO"]') $$)) -> 'detalhe' -> 'campos', '["documentos"]'::jsonb,
  'CH-14: chave fora do formato é recusada');
select is((teste.erro($$ select pg_temp.salvar((select diego from ids), 'PREVIDENCIARIO', null, '{"a": 1}') $$)) -> 'detalhe' -> 'campos', '["documentos"]'::jsonb,
  'CH-14: a lista precisa ser uma lista de chaves');
select is((teste.erro($$ select pg_temp.salvar((select diego from ids), 'PREVIDENCIARIO', null, to_jsonb(array(select 'OUTRO:' || gen_random_uuid() from generate_series(1, 13)))) $$))
          -> 'detalhe' -> 'campos', '["documentos"]'::jsonb, 'CH-14: mais de 12 documentos é recusado');

-- 5. Salvar, a ordem normalizada e o histórico.
create temp table s1 as select pg_temp.salvar((select diego from ids), 'PREVIDENCIARIO', null,
  jsonb_build_array('OUTRO:' || mo.res, 'HIPOSSUFICIENCIA', 'CONTRATO', 'PROCURACAO', 'CONTRATO')) j from mo;
select is((select j -> 'documentos' from s1), jsonb_build_array('CONTRATO', 'PROCURACAO', 'HIPOSSUFICIENCIA', 'OUTRO:' || (select res from mo)),
  'CH-14 revisão, ajuste 5: a ordem segue a dos modelos e os repetidos saem');
select ok((select (j ->> 'salva')::boolean and not (j ->> 'igualSugestao')::boolean and j ->> 'versao' = '1' and j -> 'atualizadoPor' ->> 'nome' = 'Diego Almeida' from s1),
  'CH-14: a área salva traz a versão, quem mudou e que não é a sugestão');
select is((select h.dados - 'area' from historico h, ids where h.escritorio_id = ids.rm and h.acao = 'documento.area_salva' order by h.id desc limit 1),
  jsonb_build_object('de', '["CONTRATO", "PROCURACAO", "HIPOSSUFICIENCIA"]'::jsonb,
                     'para', jsonb_build_array('CONTRATO', 'PROCURACAO', 'HIPOSSUFICIENCIA', 'OUTRO:' || (select res from mo))),
  'CH-14: o histórico guarda de e para, só as chaves');
select is((select autor_id from historico h, ids where h.escritorio_id = ids.rm and h.acao = 'documento.area_salva' order by h.id desc limit 1),
  (select diego from ids), 'CH-14 PT-03: o autor vem do contexto');

-- 6. Conflito de versão (PT-19), também na primeira gravação.
select is((teste.erro($$ select pg_temp.salvar((select socia from ids), 'PREVIDENCIARIO', null, '["CONTRATO"]') $$)) ->> 'codigo', 'TC409',
  'CH-14 revisão, ajuste 5: salvar com versão nula quando a linha já existe é conflito, não erro 500');
select is((teste.erro($$ select pg_temp.salvar((select socia from ids), 'PREVIDENCIARIO', null, '["CONTRATO"]') $$)) -> 'detalhe' -> 'atual' -> 'documentos',
  jsonb_build_array('CONTRATO', 'PROCURACAO', 'HIPOSSUFICIENCIA', 'OUTRO:' || (select res from mo)), 'CH-14 PT-19: o conflito traz a versão salva');
select is((pg_temp.salvar((select socia from ids), 'PREVIDENCIARIO', 1, jsonb_build_array('CONTRATO', 'PROCURACAO', 'HIPOSSUFICIENCIA', 'OUTRO:' || mo.res)) ->> 'versao'), '2',
  'CH-14 PT-19: salvar com a versão lida sobe a versão') from mo;
select is((teste.erro($$ select pg_temp.salvar((select diego from ids), 'PREVIDENCIARIO', 1, '["CONTRATO"]') $$)) ->> 'codigo', 'TC409',
  'CH-14 PT-19: salvar com a versão velha é conflito');
select is((teste.erro($$ select pg_temp.salvar((select diego from ids), 'CIVEL', 3, '["CONTRATO"]') $$)) ->> 'codigo', 'TC404',
  'CH-14: versão de uma área que nunca foi salva não existe');
select throws_ok($$ delete from documentos_por_area $$, 'TC023', null, 'CH-14: a lista não se apaga');

-- 7. Voltar à sugestão é salvar a sugestão (a linha continua).
select ok((select (j ->> 'igualSugestao')::boolean and (j ->> 'salva')::boolean and j ->> 'versao' = '1'
             from (select pg_temp.salvar((select diego from ids), 'CIVEL', null, '["PROCURACAO", "HIPOSSUFICIENCIA", "CONTRATO"]') j) x),
  'CH-14: voltar à sugestão compara conjuntos, e a área continua salva');
select is((pg_temp.salvar((select diego from ids), 'OUTRA', null, '[]') -> 'documentos'), '[]'::jsonb, 'CH-14: Outra ou sem área pode ficar sem nada marcado');

-- 8. A área em Gerar: caso, contrato ou nenhuma (D2, revisão, ajuste 7).
select is((select s ->> 'area' || '|' || coalesce(s ->> 'origem', '-') || '|' || (s ->> 'gravaNoContrato') from (select pg_temp.sug(ct.pedro) s from ct) x),
  'OUTRA|-|true', 'CH-14 D2: contrato sem área e sem caso fica em Outra, sem origem, e a escolha vai ao contrato');
select is((select s ->> 'area' || '|' || (s ->> 'origem') || '|' || (s ->> 'gravaNoContrato') from (select pg_temp.sug(ct.bene) s from ct) x),
  'PREVIDENCIARIO|CONTRATO|false', 'CH-14 D2: a área do contrato vale quando não há caso');
select is((select pg_temp.sug(ct.bene) -> 'porArea' -> 'PREVIDENCIARIO' from ct),
  jsonb_build_array('CONTRATO', 'PROCURACAO', 'HIPOSSUFICIENCIA', 'OUTRO:' || (select res from mo)), 'CH-14: a lista de cada área vem para a tela');
select is((select pg_temp.sug(ct.bene) -> 'salvas' from ct), '["CIVEL", "OUTRA", "PREVIDENCIARIO"]'::jsonb, 'CH-14: as áreas salvas pelo escritório');
select portal_contrato_assinatura_caso(socia, rm, ct.farm, (select versao from contratos where id = ct.farm), '2026-11-24', jsonb_build_object('modo', 'NOVO', 'nome', 'Farmácia Bom Jesus · Cobrança de duplicatas',
  'area', 'CIVEL', 'responsavelId', ids.socia, 'papel', 'AUTOR')) from ids, ct;
select is((select s ->> 'area' || '|' || (s ->> 'origem') || '|' || (s ->> 'casoNome') || '|' || (s ->> 'contratoArea') from (select pg_temp.sug(ct.farm) s from ct) x),
  'CIVEL|CASO|Farmácia Bom Jesus · Cobrança de duplicatas|TRABALHISTA', 'CH-14 D2: a área do caso ganha da do contrato');
select is((select pg_temp.sug(ct.farm) ->> 'gravaNoContrato' from ct), 'false', 'CH-14: contrato com caso não recebe a área');

-- 9. Gerar com a área: só em elaboração, sem área e sem caso; nunca OUTRA (pergunta 2, revisão, ajuste 2).
select is((teste.erro($$ select pg_temp.gerar(ct.pedro, '{"area": "XYZ"}') from ct $$)) -> 'detalhe' -> 'campos', '["area"]'::jsonb,
  'CH-14 revisão, ajuste 2: a área inválida é recusada no servidor');
select is((select count(*)::int from documentos_gerados g, ct where g.contrato_id = ct.pedro), 0, 'CH-14: com a área recusada, nada é gerado');
select is((pg_temp.gerar(ct.pedro, '{"area": "OUTRA"}') ->> 'areaGravada'), null, 'CH-14 pergunta 2: Outra ou sem área não grava nada') from ct;
select is((select area from contratos, ct where id = ct.pedro), null, 'CH-14 pergunta 2: o contrato continua sem área');
select is((pg_temp.gerar(ct.pedro, '{"area": "FAMILIA"}') ->> 'areaGravada'), 'FAMILIA', 'CH-14 pergunta 2: a área escolhida vai ao contrato em elaboração') from ct;
select is((select area from contratos, ct where id = ct.pedro), 'FAMILIA', 'CH-14: o contrato ficou com a área');
select is((select h.dados from historico h, ct where h.entidade = 'contratos' and h.entidade_id = ct.pedro::text and h.acao = 'contrato.area_definida'),
  '{"area": "FAMILIA", "origem": "GERAR_DOCUMENTOS"}'::jsonb, 'CH-14: contrato.area_definida no histórico, com a origem');
select is((select pg_temp.sug(ct.pedro) ->> 'origem' || '|' || (pg_temp.sug(ct.pedro) ->> 'gravaNoContrato') from ct), 'CONTRATO|false',
  'CH-14: depois de gravada, a área vem do contrato');
select is((pg_temp.gerar(ct.bene, '{"area": "TRABALHISTA"}') ->> 'areaGravada'), null, 'CH-14 revisão, ajuste 2: o contrato com área não muda') from ct;
select is((select area from contratos, ct where id = ct.bene), 'PREVIDENCIARIO', 'CH-14: a área do contrato ficou como estava');
select portal_contrato_assinatura(socia, rm, ct.ant, (select versao from contratos where id = ct.ant), '2026-11-24') from ids, ct;
select is((pg_temp.gerar(ct.ant, '{"area": "CIVEL"}') ->> 'areaGravada'), null, 'CH-14 revisão, ajuste 2: o contrato ativo sem caso não ganha área (pede motivo)') from ct;
select is((select area || '|' || estado from contratos, ct where id = ct.ant), null, 'CH-14: o contrato ativo continua sem área');
select is((pg_temp.gerar(ct.farm, '{"area": "FAMILIA"}') ->> 'areaGravada'), null, 'CH-14: o contrato com caso não ganha área') from ct;

-- 10. "Também tem" (pergunta 5): só o que entrou numa lista salva depois da última geração.
select pg_temp.gerar(ct.joana) from ct;
select is((select pg_temp.sug(ct.joana) -> 'entraramDepois' from ct), '{}'::jsonb, 'CH-14 pergunta 5: logo depois de gerar, nada entrou depois');
select ajustar_relogio(('2026-11-24 15:20-03'::timestamptz - now()));
select pg_temp.salvar((select diego from ids), 'PREVIDENCIARIO', 2, jsonb_build_array('CONTRATO', 'PROCURACAO', 'HIPOSSUFICIENCIA', 'OUTRO:' || mo.res, 'OUTRO:' || mo.req)) from mo;
select is((select jsonb_agg(i ->> 'chave') from ct, jsonb_array_elements(pg_temp.sug(ct.joana) -> 'entraramDepois' -> 'PREVIDENCIARIO') i),
  jsonb_build_array('OUTRO:' || (select req from mo)), 'CH-14 pergunta 5: entra só o requerimento, que foi posto na lista depois da geração');
select is((select pg_temp.sug(ct.pedro) -> 'entraramDepois' -> 'TRABALHISTA' from ct), null, 'CH-14 pergunta 5: área sem mudança não avisa');

-- 11. O modelo arquivado sai da lista na leitura (nada se apaga).
select portal_documento_modelo_arquivar(diego, rm, mo.res, 1, 'Passou a usar outro texto') from ids, mo;
select is((select pg_temp.area('PREVIDENCIARIO') -> 'documentos'), jsonb_build_array('CONTRATO', 'PROCURACAO', 'HIPOSSUFICIENCIA', 'OUTRO:' || (select req from mo)),
  'CH-14: o modelo arquivado sai da área na leitura');
select ok((select documentos @> array['OUTRO:' || mo.res::text] from documentos_por_area, mo, ids where escritorio_id = ids.rm and area = 'PREVIDENCIARIO'),
  'CH-14: a linha guardada não muda');
select is((teste.erro($$ select pg_temp.salvar((select diego from ids), 'TRABALHISTA', null, jsonb_build_array('OUTRO:' || mo.res)) from mo $$)) -> 'detalhe' ->> 'motivo',
  'MODELO_INVALIDO', 'CH-14: o modelo arquivado não entra de novo ao salvar');

-- 12. Sem contratos.editar ou com o Portal só para consulta, a folha fica só para ler.
delete from funcao_acoes where funcao = 'EQUIPE' and acao = 'contratos.editar';
select is((select j ->> 'podeEditar' || '|' || (j ->> 'leitura') from (select portal_documentos_por_area(diego, rm) j from ids) x),
  'false|SEM_PERMISSAO', 'CH-14 pergunta 3: sem contratos.editar, só lê');
select is((teste.erro($$ select pg_temp.salvar((select diego from ids), 'SAUDE', null, '["CONTRATO"]') $$)) ->> 'codigo', 'TC401',
  'CH-14 pergunta 3: sem contratos.editar, salvar é recusado');
update escritorios set contrato_fim_em = hoje_brasilia() - 1 from ids where escritorios.id = ids.rm;
select is((select j ->> 'podeEditar' || '|' || (j ->> 'leitura') from (select portal_documentos_por_area(socia, rm) j from ids) x),
  'false|SO_CONSULTA', 'CH-14: com o Portal só para consulta, a folha diz por que só lê');
select is((teste.erro($$ select pg_temp.salvar((select socia from ids), 'SAUDE', null, '["CONTRATO"]') $$)) -> 'detalhe' ->> 'motivo', 'CONTRATO_ENCERRADO',
  'CH-14: com o Portal só para consulta, salvar é recusado');

select * from finish();
rollback;
