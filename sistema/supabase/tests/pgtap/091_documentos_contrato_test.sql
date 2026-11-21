-- Procurações e modelos (CH-08, F3.16): o que a página de gerar mostra (outorgados só com OAB, os do
-- contrato primeiro, o modelo de cada documento), o que bloqueia (nenhum documento, nenhum outorgado,
-- inscrição que não é da pessoa, contrato encerrado), cada geração como versão nova, o que foi usado
-- guardado no dia, o que mudou no cadastro desde a última, os assinados ligados à versão, a lista
-- com os que esperam o assinado primeiro, os modelos do escritório com versões, nada se apaga, a
-- área Contratos e o isolamento (PA-01, PT-01, PT-03).
begin;
select plan(52);

select ajustar_relogio(('2026-11-21 12:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Felipe Matos') as felipe,
  teste.pessoa('Larissa Costa') as larissa,
  teste.pessoa('Gustavo Lima') as gustavo,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, felipe, 'Felipe Matos', array['CONTRATOS', 'JURIDICO'], '{"uf": "SP", "numero": "287104"}'),
       portal_convidar(socia, rm, larissa, 'Larissa Costa', array['JURIDICO'], '{"uf": "SP", "numero": "401226"}'),
       portal_convidar(socia, rm, gustavo, 'Gustavo Lima', array['CONTRATOS']),
       portal_convidar(socia, rm, diego, 'Diego Almeida', array['CONTRATOS']) from ids;
select portal_oab_incluir(socia, rm, socia, '{"uf": "SP", "numero": "214538", "tipo": "PRINCIPAL"}'),
       portal_oab_incluir(socia, rm, felipe, '{"uf": "RJ", "numero": "245880", "letra": "S", "tipo": "SUPLEMENTAR"}') from ids;
create temp table oab as select
  (select id from oab_inscricao where pessoa_id = ids.socia and removido_em is null) msp,
  (select id from oab_inscricao where pessoa_id = ids.felipe and uf = 'SP' and removido_em is null) fsp,
  (select id from oab_inscricao where pessoa_id = ids.felipe and uf = 'RJ' and removido_em is null) frj,
  (select id from oab_inscricao where pessoa_id = ids.larissa and removido_em is null) lsp
  from ids;

create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Benedito Souza Lima', 'origem', 'GOOGLE',
     'documento', '52998224725', 'nacionalidade', 'brasileiro', 'estadoCivil', 'CASADO', 'profissao', 'Pedreiro',
     'endereco', 'Rua das Flores, 120', 'cidade', 'São Paulo', 'uf', 'SP',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Benedito', 'telefone', '+5511985521034', 'principal', true)))) ->> 'id')::uuid bene,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PJ', 'nome', 'Farmácia Bom Jesus Ltda.', 'origem', 'GOOGLE',
     'documento', '11222333000181', 'endereco', 'Av. Brasil, 900', 'cidade', 'São Paulo', 'uf', 'SP',
     'repNome', 'Antônia Ferreira Prado', 'repCargo', 'Sócia-administradora', 'repDocumento', '11144477735',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Antônia', 'telefone', '+5511977001122', 'principal', true)))) ->> 'id')::uuid farm
  from ids;
create temp table ct as select
  (portal_contrato_criar_oab(socia, rm, jsonb_build_object('clienteId', cli.bene, 'objeto', 'Aposentadoria por idade',
     'responsavelId', ids.felipe, 'advogados', jsonb_build_array(ids.felipe, ids.socia),
     'inscricoes', jsonb_build_object(ids.felipe, jsonb_build_array(oab.fsp)),
     'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'PARCELADO', 'total', 600000, 'parcelas', 3, 'primeiro', '2026-12-10')))) ->> 'id')::uuid bene,
  (portal_contrato_criar(socia, rm, jsonb_build_object('clienteId', cli.farm, 'objeto', 'Defesa em execução fiscal',
     'responsavelId', ids.socia, 'advogados', jsonb_build_array(ids.socia),
     'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'FIXO', 'valor', 450000, 'vencimento', '2026-12-05')))) ->> 'id')::uuid farm
  from ids, cli, oab;

create function pg_temp.pedido(p_docs jsonb, p_out jsonb, p_extra jsonb default '{}') returns jsonb
language sql as $$
  select jsonb_build_object('documentos', p_docs, 'outorgados', p_out, 'poderes', '["RECEBER_QUITAR", "ACORDO"]'::jsonb,
                            'cidadeData', 'São Paulo, 21 de novembro de 2026') || p_extra
$$;
-- O resultado que a API monta, na ordem dos documentos do pedido conferido.
create function pg_temp.resultado(p_pessoa uuid, p_esc uuid, p_contrato uuid, p_pedido jsonb) returns jsonb
language sql as $$
  select jsonb_build_object('geracaoId', gen_random_uuid(), 'padraoDe', '2026-11-21',
    'documentos', (select jsonb_agg(jsonb_build_object('id', gen_random_uuid(), 'chave', d ->> 'chave', 'arquivo', lower(d ->> 'tipo') || '.docx',
                                                       'tamanho', 4200, 'marcados', '["RG de Benedito Souza Lima"]'::jsonb) order by n)
                     from jsonb_array_elements(portal_documento_preparar(p_pessoa, p_esc, p_contrato, p_pedido) -> 'pedido' -> 'documentos') with ordinality x(d, n)))
$$;
create function pg_temp.gerar(p_pessoa uuid, p_esc uuid, p_contrato uuid, p_pedido jsonb) returns jsonb
language sql as $$ select portal_documento_gravar(p_pessoa, p_esc, p_contrato, p_pedido, pg_temp.resultado(p_pessoa, p_esc, p_contrato, p_pedido)) $$;

-- A página de gerar (decisões 7 a 10).
create temp table d as select portal_documento_dados(diego, rm, ct.bene) j from ids, ct;
select is((select array_agg(a ->> 'nome') from d, jsonb_array_elements(j -> 'advogados') a),
  array['Felipe Matos', 'Marina Ribeiro', 'Larissa Costa'], 'decisão 10: os do contrato primeiro (o responsável à frente), depois quem tem OAB e não está');
select is((select a ->> 'noContrato' from d, jsonb_array_elements(j -> 'advogados') a where a ->> 'nome' = 'Larissa Costa'), 'false',
  'decisão 10: quem tem OAB e não está no contrato aparece desmarcado');
select is((select a -> 'escolhidas' from d, jsonb_array_elements(j -> 'advogados') a where a ->> 'nome' = 'Felipe Matos'),
  (select jsonb_build_array(fsp) from oab), 'EX-12: as inscrições que o contrato já guarda');
select is((select jsonb_array_length(a -> 'inscricoes') from d, jsonb_array_elements(j -> 'advogados') a where a ->> 'nome' = 'Felipe Matos'), 2,
  'decisão 10: cada advogado com todas as inscrições, para marcar outra');
select is((select array_agg(a ->> 'nome' order by a ->> 'nome') from d, jsonb_array_elements(j -> 'semOab') a),
  array['Diego Almeida', 'Gustavo Lima'], 'decisão 10: quem tem Contratos e não tem OAB não aparece, mas a ajuda diz quem é');
select is((select array_agg(m ->> 'padrao') from d, jsonb_array_elements(j -> 'modelos') m),
  array['CONTRATO', 'PROCURACAO', 'HIPOSSUFICIENCIA_PF'], 'decisão 5: sem modelo do escritório, os padrão; a declaração da pessoa física');
select is((select j -> 'condicoes' -> 0 ->> 'tipo' from d), 'PARCELADO', 'as condições do contrato entram no contrato de honorários');
select is((select j -> 'ultima' from d), 'null'::jsonb, 'nada gerado ainda');
select is((select portal_documento_dados(socia, rm, ct.farm) -> 'modelos' -> 2 ->> 'padrao' from ids, ct), 'HIPOSSUFICIENCIA_PJ',
  'pergunta 5: empresa usa a declaração para pessoa jurídica');
select is((teste.erro($$ select portal_documento_dados(larissa, rm, ct.bene) from ids, ct $$)) -> 'detalhe' ->> 'motivo', 'AREA_NAO_LIBERADA',
  'PA-01: sem a área Contratos, nada');
select is((teste.erro($$ select portal_documento_dados(intrusa, outro, ct.bene) from ids, ct $$)) ->> 'codigo', 'TC404',
  'PT-01: o contrato de outro escritório não aparece');

-- O que bloqueia (decisão 13): só nenhum documento, nenhum outorgado e o que impede o documento.
select is((teste.erro($$ select portal_documento_preparar(diego, rm, ct.bene, pg_temp.pedido('[]', jsonb_build_array(jsonb_build_object('pessoaId', ids.felipe, 'inscricoes', jsonb_build_array(oab.fsp))))) from ids, ct, oab $$))
  -> 'detalhe' -> 'motivos', '{"documentos": "DOCUMENTO_OBRIGATORIO"}'::jsonb, 'nenhum documento marcado bloqueia');
select is((teste.erro($$ select portal_documento_preparar(diego, rm, ct.bene, pg_temp.pedido('[{"tipo": "PROCURACAO"}]', '[]')) from ids, ct $$))
  -> 'detalhe' -> 'motivos', '{"outorgados": "SEM_OUTORGADO"}'::jsonb, 'nenhum outorgado bloqueia');
select is((teste.erro($$ select portal_documento_preparar(diego, rm, ct.bene, pg_temp.pedido('[{"tipo": "PROCURACAO"}]', jsonb_build_array(jsonb_build_object('pessoaId', ids.gustavo, 'inscricoes', '[]'::jsonb)))) from ids, ct $$))
  -> 'detalhe' -> 'motivos' ->> 'outorgados', 'ADVOGADO_SEM_OAB', 'só quem tem OAB é outorgado');
select is((teste.erro($$ select portal_documento_preparar(diego, rm, ct.bene, pg_temp.pedido('[{"tipo": "PROCURACAO"}]', jsonb_build_array(jsonb_build_object('pessoaId', ids.felipe, 'inscricoes', jsonb_build_array(oab.msp))))) from ids, ct, oab $$))
  -> 'detalhe' -> 'motivos' ->> 'outorgados', 'INSCRICAO_INVALIDA', 'EX-12: só as inscrições da própria pessoa');
select is((teste.erro($$ select portal_documento_preparar(diego, rm, ct.bene, pg_temp.pedido('[{"tipo": "OUTRO", "modeloId": "6a1d2f3e-0000-4000-8000-000000000000"}]', jsonb_build_array(jsonb_build_object('pessoaId', ids.felipe, 'inscricoes', jsonb_build_array(oab.fsp))))) from ids, ct, oab $$))
  -> 'detalhe' -> 'motivos' ->> 'documentos', 'MODELO_INVALIDO', 'modelo que não existe bloqueia');
select is((teste.erro($$ select portal_documento_preparar(diego, rm, ct.bene, pg_temp.pedido('[{"tipo": "PROCURACAO"}]', jsonb_build_array(jsonb_build_object('pessoaId', ids.felipe, 'inscricoes', jsonb_build_array(oab.fsp))), '{"poderes": ["VENDER_IMOVEL"]}')) from ids, ct, oab $$))
  -> 'detalhe' -> 'motivos' ->> 'poderes', 'PODER_INVALIDO', 'só os poderes da lista; o resto vai em "Outro poder"');

-- Gerar (decisões 13, 16 e 19): uma versão por documento.
create temp table p1 as select pg_temp.pedido('[{"tipo": "CONTRATO"}, {"tipo": "PROCURACAO"}, {"tipo": "HIPOSSUFICIENCIA"}]',
  jsonb_build_array(jsonb_build_object('pessoaId', ids.felipe, 'inscricoes', jsonb_build_array(oab.frj, oab.fsp)),
                    jsonb_build_object('pessoaId', ids.larissa, 'inscricoes', jsonb_build_array(oab.lsp)))) j from ids, oab;
create temp table g1 as select pg_temp.gerar(diego, rm, ct.bene, p1.j) j from ids, ct, p1;
select is((select count(*) from documentos_gerados where contrato_id = (select bene from ct)), 3::bigint, 'três documentos, uma geração');
select is((select array_agg(numero order by ordem) from documentos_gerados where contrato_id = (select bene from ct)), array[1, 1, 1], 'cada um na versão 1');
select is((select modelo_padrao from documentos_gerados where chave = 'HIPOSSUFICIENCIA'), 'HIPOSSUFICIENCIA_PF', 'a declaração da pessoa física');
select is((select j -> 'usado' -> 'outorgados' -> 0 ->> 'frase' from g1), 'OAB/SP nº 287.104 e OAB/RJ nº 245.880-S',
  'decisão 16: a frase da OAB do dia, a principal primeiro');
select is((select j -> 'usado' -> 'outorgados' -> 1 ->> 'nome' from g1), 'Larissa Costa', 'decisão 10: quem não está no contrato entra só nestes documentos');
select is((select count(*) from contrato_advogados where contrato_id = (select bene from ct)), 2::bigint, 'decisão 10: mudar aqui não muda o contrato');
select is((select dados ->> 'geracao' from historico where acao = 'documento.gerado' order by id desc limit 1), (select j ->> 'geracaoId' from g1),
  'quem gerou fica no histórico do contrato (pergunta 2)');

-- O que mudou desde a última geração (decisão 19): o RG completado depois.
select ajustar_relogio(('2026-11-21 15:52-03'::timestamptz - now()));
select portal_cliente_editar(diego, rm, cli.bene, (select versao from clientes_escritorio where id = cli.bene),
  (select jsonb_build_object('tipo', 'PF', 'nome', k.nome, 'origem', 'GOOGLE', 'documento', k.documento, 'nacionalidade', k.nacionalidade,
                             'estadoCivil', k.estado_civil, 'profissao', k.profissao, 'endereco', k.endereco, 'cidade', k.cidade, 'uf', k.uf,
                             'rg', '28.441.903-1', 'contatos', k.contatos) from clientes_escritorio k where k.id = cli.bene))
  from ids, cli;
create temp table d2 as select portal_documento_dados(diego, rm, ct.bene) j from ids, ct;
select is((select j -> 'mudancas' -> 0 -> 'campos' from d2), '["rg"]'::jsonb, 'decisão 19: o aviso diz o que mudou desde a versão anterior');
select is((select j -> 'mudancas' -> 0 -> 'por' ->> 'nome' from d2), 'Diego Almeida', '... e quem mudou');
select is((select j -> 'ultima' -> 'outorgados' -> 0 ->> 'pessoaId' from d2), (select felipe::text from ids), 'decisão 19: gerar de novo abre com as escolhas da última vez');
select is((select j -> 'poderesIniciais' from d2), '["ACORDO", "RECEBER_QUITAR"]'::jsonb, 'decisão 11: a marcação inicial é a da última geração');

-- Gerar de novo só a procuração: só ela vai à versão 2.
create temp table g2 as select pg_temp.gerar(diego, rm, ct.bene, pg_temp.pedido('[{"tipo": "PROCURACAO"}]',
  jsonb_build_array(jsonb_build_object('pessoaId', ids.felipe, 'inscricoes', jsonb_build_array(oab.fsp))))) j from ids, ct, oab;
select is((select j -> 'documentos' -> 0 ->> 'numero' from g2), '2', 'decisão 19: a procuração vira v2');
select is((select max(numero) from documentos_gerados where chave = 'CONTRATO'), 1, 'o contrato continua na v1');

-- Os assinados (decisão 17): ligados à versão, com a categoria do documento.
create temp table an as select
  portal_anexo_iniciar(diego, rm, jsonb_build_object('dono', 'CONTRATO', 'donoId', ct.bene, 'documentoId', (g2.j -> 'documentos' -> 0 ->> 'id'),
    'assinadoEm', '2026-11-21', 'nome', 'procuracao-assinada.pdf', 'tipo', 'application/pdf', 'tamanho', 1000)) proc
  from ids, ct, g2;
select is((select categoria from anexos where id = (select proc from an)), 'PROCURACAO_ASSINADA', 'a procuração assinada tem categoria própria');
select is((select assinado_em from anexos where id = (select proc from an)), '2026-11-21'::date, 'com a data da assinatura');
select portal_anexo_concluir(diego, rm, an.proc) from ids, an;
select is((select dados ->> 'versao' from historico where acao = 'documento.assinado_anexado' order by id desc limit 1), '2',
  'o histórico do contrato diz qual versão foi anexada');
select is((teste.erro($$ select portal_anexo_iniciar(diego, rm, jsonb_build_object('dono', 'CONTRATO', 'donoId', ct.bene, 'documentoId', (g2.j -> 'documentos' -> 0 ->> 'id'),
    'assinadoEm', '2026-11-22', 'nome', 'p.pdf', 'tipo', 'application/pdf', 'tamanho', 1000)) from ids, ct, g2 $$)) -> 'detalhe' ->> 'motivo',
  'DATA_FUTURA', 'decisão 17: a data da assinatura não pode ser depois de hoje');
select is((teste.erro($$ select portal_anexo_iniciar(diego, rm, jsonb_build_object('dono', 'CONTRATO', 'donoId', ct.farm, 'documentoId', (g2.j -> 'documentos' -> 0 ->> 'id'),
    'nome', 'p.pdf', 'tipo', 'application/pdf', 'tamanho', 1000)) from ids, ct, g2 $$)) -> 'detalhe' -> 'campos',
  '["documentoId"]'::jsonb, 'o documento precisa ser do mesmo contrato');
select is((portal_contrato_anexos(diego, rm, ct.bene) -> 'anexos'), '[]'::jsonb, 'o quadro "Arquivo assinado" da aba Contrato mostra só o contrato')
  from ids, ct;

-- A aba Documentos e a lista (decisões 2 e 20).
create temp table fd as select portal_contrato_documentos(diego, rm, ct.bene) j from ids, ct;
select is((select array_agg(x ->> 'tipo' || ':' || (x ->> 'situacao')) from fd, jsonb_array_elements(j -> 'documentos') x),
  array['CONTRATO:FALTA', 'HIPOSSUFICIENCIA:FALTA', 'PROCURACAO:ASSINADO'], 'decisão 20: os que esperam o assinado primeiro');
select is((select jsonb_array_length(x -> 'anteriores') from fd, jsonb_array_elements(j -> 'documentos') x where x ->> 'tipo' = 'PROCURACAO'), 1,
  'decisão 19: a versão anterior fica guardada');
select is((select (j ->> 'faltam')::int from fd), 2, 'quantos esperam o assinado');
create temp table l as select portal_documentos(diego, rm, '{}') j from ids;
select is((select j -> 'contagem' from l), '{"todos": 3, "falta": 2, "assinados": 1}'::jsonb, 'decisão 2: o filtro com a contagem');
select is((select j -> 'documentos' -> 0 ->> 'tipo' from l), 'CONTRATO', 'decisão 2: o contrato que espera o assinado vem primeiro');
select is((select j -> 'esperandoContrato' -> 0 ->> 'cliente' from l), 'Benedito Souza Lima', 'decisão 2: o aviso diz que o contrato só fica ativo com o assinado');
select is((select jsonb_array_length(portal_documentos(diego, rm, '{"situacao": "ASSINADOS"}') -> 'documentos') from ids), 1, 'filtro: assinados');
select is((select jsonb_array_length(portal_documentos(diego, rm, '{"q": "farmacia"}') -> 'documentos') from ids), 0, 'a busca pelo cliente, sem acento');
select is((select jsonb_array_length(portal_documentos(diego, rm, '{"q": "benedito"}') -> 'documentos') from ids), 3, '... e acha os de Benedito');

-- Os modelos do escritório (decisões 5 e 6).
create temp table mo as select portal_documento_modelo_enviar(diego, rm, null, '{"nome": "Procuração do escritório", "tipo": "PROCURACAO"}',
  jsonb_build_object('versaoId', gen_random_uuid(), 'arquivo', 'procuracao.docx', 'tamanho', 9000, 'campos', '["CLIENTE_NOME", "ADVOGADOS_OAB"]'::jsonb,
                     'desconhecidos', '[]'::jsonb, 'paragrafos', '["OUTORGANTE: [CLIENTE_NOME]"]'::jsonb)) j from ids;
select is((select portal_documento_dados(diego, rm, ct.bene) -> 'modelos' -> 1 ->> 'modeloId' from ids, ct), (select j ->> 'id' from mo),
  'decisão 5: o modelo do escritório troca o padrão');
select portal_documento_modelo_enviar(diego, rm, (mo.j ->> 'id')::uuid, '{}',
  jsonb_build_object('versaoId', gen_random_uuid(), 'arquivo', 'procuracao-v2.docx', 'tamanho', 9100, 'campos', '["CLIENTE_NOME"]'::jsonb,
                     'desconhecidos', '[]'::jsonb, 'paragrafos', '["OUTORGANTE: [CLIENTE_NOME]"]'::jsonb)) from ids, mo;
select is((select jsonb_array_length(m -> 'anteriores') from ids, jsonb_array_elements(portal_documento_modelos(diego, rm) -> 'modelos') m), 1,
  'decisão 5: a versão anterior fica na lista que abre');
create temp table outro_m as select portal_documento_modelo_enviar(diego, rm, null, '{"nome": "Substabelecimento", "tipo": "OUTRO"}',
  jsonb_build_object('versaoId', gen_random_uuid(), 'arquivo', 'substabelecimento.docx', 'tamanho', 7000, 'campos', '["CLIENTE_NOME"]'::jsonb,
                     'desconhecidos', '[]'::jsonb, 'paragrafos', '["[CLIENTE_NOME]"]'::jsonb)) j from ids;
create temp table g3 as select pg_temp.gerar(diego, rm, ct.bene, pg_temp.pedido(jsonb_build_array(jsonb_build_object('tipo', 'OUTRO', 'modeloId', outro_m.j ->> 'id')),
  jsonb_build_array(jsonb_build_object('pessoaId', ids.felipe, 'inscricoes', jsonb_build_array(oab.fsp))))) j from ids, ct, oab, outro_m;
select is((select chave from documentos_gerados where id = (select (j -> 'documentos' -> 0 ->> 'id')::uuid from g3)), 'OUTRO:' || (select j ->> 'id' from outro_m),
  'pergunta 1: o outro documento do escritório gera com os mesmos campos');
select is((teste.erro($$ select portal_documento_modelo_arquivar(diego, rm, (mo.j ->> 'id')::uuid, 1, '') from ids, mo $$)) -> 'detalhe' ->> 'motivo',
  'MOTIVO_OBRIGATORIO', 'arquivar pede o motivo');

-- Nada se apaga (PT-03), contrato encerrado não gera, e quem não tem Contratos não envia modelo.
select is((teste.erro($$ update documentos_gerados set nome_arquivo = 'x.docx' $$)) ->> 'codigo', 'TC023', 'PT-03: o documento gerado não muda');
select is((teste.erro($$ delete from documento_modelo_versoes $$)) ->> 'codigo', 'TC023', 'PT-03: a versão do modelo não se apaga');
select portal_contrato_encerrar(socia, rm, ct.farm, 1, 'Cliente desistiu') from ids, ct;
select is((teste.erro($$ select portal_documento_preparar(diego, rm, ct.farm, pg_temp.pedido('[{"tipo": "PROCURACAO"}]', jsonb_build_array(jsonb_build_object('pessoaId', ids.socia, 'inscricoes', jsonb_build_array(oab.msp))))) from ids, ct, oab $$))
  -> 'detalhe' ->> 'motivo', 'CONTRATO_ENCERRADO', 'contrato encerrado não gera documento');

select * from finish();
rollback;
