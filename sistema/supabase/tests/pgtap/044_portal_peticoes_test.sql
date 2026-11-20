-- Gerador de petições (EX-09): quem assina (só com OAB), quem revisa (o responsável; sem OAB, a
-- sócia dona; o responsável e a sócia dona não passam pela revisão), o que bloqueia e o que só
-- marca, rascunho, envio, comentários, ajuste, versão nova, passar a revisão, aprovar e
-- reprovar, a aprovada nos documentos do caso, os modelos do escritório, nada se apaga e o
-- isolamento (PT-01, PT-03).
begin;
select plan(57);

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Felipe Matos') as felipe,
  teste.pessoa('Larissa Costa') as larissa,
  teste.pessoa('Beatriz Nogueira') as beatriz,
  teste.pessoa('Gustavo Lima') as gustavo,
  teste.pessoa('Rita Souza') as rita,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, felipe, 'Felipe Matos', array['JURIDICO'], '{"uf": "SP", "numero": "287104"}'),
       portal_convidar(socia, rm, larissa, 'Larissa Costa', array['JURIDICO'], '{"uf": "SP", "numero": "401226"}'),
       portal_convidar(socia, rm, beatriz, 'Beatriz Nogueira', array['JURIDICO']),
       portal_convidar(socia, rm, gustavo, 'Gustavo Lima', array['JURIDICO']),
       portal_convidar(socia, rm, rita, 'Rita Souza', array['COMERCIAL']) from ids;
select portal_oab_incluir(socia, rm, socia, '{"uf": "SP", "numero": "214538", "tipo": "PRINCIPAL"}'),
       portal_oab_incluir(socia, rm, felipe, '{"uf": "RJ", "numero": "245880", "letra": "S", "tipo": "SUPLEMENTAR"}') from ids;

create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Joana Pereira', 'origem', 'GOOGLE', 'rg', '28.441.903-1',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Joana Pereira', 'telefone', '+5511985521034', 'principal', true)))) ->> 'id')::uuid joana,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Carlos Dias', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Carlos Dias', 'telefone', '+5511977001122', 'principal', true)))) ->> 'id')::uuid carlos,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Fora do Caso', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Fora do Caso', 'telefone', '+5511966001122', 'principal', true)))) ->> 'id')::uuid fora
  from ids;
select portal_juridico_etapas(socia, rm) from ids;
create temp table cs as select
  (portal_juridico_caso_criar(socia, rm, jsonb_build_object('nome', 'Pereira x Mercado Bom Preço', 'area', 'TRABALHISTA',
     'parteContraria', 'Mercado Bom Preço Ltda.', 'vara', '45ª Vara do Trabalho de São Paulo',
     'etapaId', (select id from etapas where escritorio_id = ids.rm and ordem = 3), 'responsavelId', ids.felipe,
     'clientes', jsonb_build_array(jsonb_build_object('clienteId', cli.joana, 'papel', 'AUTOR'),
                                   jsonb_build_object('clienteId', cli.carlos, 'papel', 'AUTOR')))) ->> 'id')::uuid pereira,
  (portal_juridico_caso_criar(socia, rm, jsonb_build_object('nome', 'Lima x Seguradora Norte', 'area', 'CIVEL',
     'etapaId', (select id from etapas where escritorio_id = ids.rm and ordem = 3), 'responsavelId', ids.gustavo,
     'clientes', jsonb_build_array(jsonb_build_object('clienteId', cli.joana, 'papel', 'AUTOR')))) ->> 'id')::uuid lima
  from ids, cli;

-- O pedido e o resultado que a API monta.
create function pg_temp.pedido(p_partes uuid[], p_adv jsonb, p_extra jsonb default '{}') returns jsonb
language sql as $$
  select jsonb_build_object('modelo', '{"padrao": "JUNTADA"}'::jsonb, 'partes', to_jsonb(p_partes), 'advogados', p_adv,
                            'enderecamento', 'Excelentíssimo(a) Senhor(a) Juiz(íza) da 45ª Vara do Trabalho de São Paulo', 'cidadeData', 'São Paulo, 18 de novembro de 2026') || p_extra
$$;
create function pg_temp.resultado() returns jsonb
language sql as $$
  select jsonb_build_object('peticaoId', gen_random_uuid(), 'versaoId', gen_random_uuid(), 'documentoId', gen_random_uuid(),
                            'modeloNome', 'Juntada de documentos', 'arquivo', 'juntada-pereira-x-mercado-bom-preco.docx', 'tamanho', 4200,
                            'marcados', '["RG de Carlos Dias"]'::jsonb,
                            'previa', '[[{"t": "formulario", "texto": "Excelentíssimo(a)"}], [{"t": "cadastro", "texto": "JOANA PEREIRA"}, {"t": "fixo", "texto": ", nos autos"}]]'::jsonb)
$$;
create function pg_temp.adv(p uuid, p_esc uuid) returns jsonb
language sql as $$
  select jsonb_build_array(jsonb_build_object('pessoaId', p, 'inscricoes', (select jsonb_agg(id) from oab_inscricao where pessoa_id = p and escritorio_id = p_esc and removido_em is null)))
$$;

-- O formulário (decisão 7).
create temp table d as select portal_peticao_dados(beatriz, rm, cs.pereira) j from ids, cs;
select is((select array_agg(a ->> 'nome') from d, jsonb_array_elements(j -> 'advogados') a),
  array['Felipe Matos', 'Marina Ribeiro', 'Larissa Costa'], 'quem assina: só quem tem OAB, o responsável primeiro e depois a sócia dona');
select is((select jsonb_array_length(a -> 'inscricoes') from d, jsonb_array_elements(j -> 'advogados') a where a ->> 'nome' = 'Felipe Matos'), 2,
  'cada advogado com as inscrições');
select is((select array_agg(a ->> 'nome' order by a ->> 'nome') from d, jsonb_array_elements(j -> 'semOab') a),
  array['Beatriz Nogueira', 'Gustavo Lima'], 'quem tem Jurídico e não tem OAB fica de fora, com o nome');
select is((select j -> 'revisor' ->> 'nome' from d), 'Felipe Matos', 'decisão 17: a estagiária manda para o responsável');
select is((select j -> 'clientes' -> 0 ->> 'rg' from d), '28.441.903-1', 'AP-01: a qualificação vem da ficha do cliente');
select is((select portal_peticao_dados(felipe, rm, cs.pereira) ->> 'semRevisao' from ids, cs), 'RESPONSAVEL', 'o responsável não passa pela revisão');
select is((select portal_peticao_dados(socia, rm, cs.pereira) ->> 'semRevisao' from ids, cs), 'SOCIO_DONO', 'nem a sócia dona');
select is((select portal_peticao_dados(beatriz, rm, cs.lima) -> 'revisor' ->> 'nome' from ids, cs), 'Marina Ribeiro',
  'responsável sem OAB: a revisão vai para a sócia dona');
select is((teste.erro($$ select portal_peticao_dados(rita, rm, cs.pereira) from ids, cs $$)) ->> 'codigo', 'TC401', 'PA-01: sem a área Jurídico, nada');

-- O que bloqueia (decisão 8).
select is((teste.erro($$ select portal_peticao_preparar(beatriz, rm, cs.pereira, '{"modelo": {"padrao": "JUNTADA"}, "partes": [], "advogados": [], "enderecamento": " ", "cidadeData": "São Paulo"}') from ids, cs $$)) -> 'detalhe' -> 'motivos',
  '{"partes": "PARTE_OBRIGATORIA", "advogados": "SEM_ADVOGADO", "enderecamento": "ENDERECAMENTO_OBRIGATORIO"}'::jsonb,
  'só bloqueiam endereçamento vazio, nenhuma parte e nenhum advogado, cada um preso ao campo');
select is((teste.erro($$ select portal_peticao_preparar(beatriz, rm, cs.pereira, pg_temp.pedido(array[cli.fora], pg_temp.adv(ids.beatriz, ids.rm))) from ids, cs, cli $$)) -> 'detalhe' -> 'motivos',
  '{"partes": "PARTE_INVALIDA", "advogados": "ADVOGADO_SEM_OAB"}'::jsonb, 'parte fora do caso e quem não tem OAB não assina');
select is((teste.erro($$ select portal_peticao_preparar(beatriz, rm, cs.pereira, pg_temp.pedido(array[cli.joana],
     jsonb_build_array(jsonb_build_object('pessoaId', ids.felipe, 'inscricoes', pg_temp.adv(ids.larissa, ids.rm) -> 0 -> 'inscricoes'))) ) from ids, cs, cli $$)) -> 'detalhe' -> 'motivos' ->> 'advogados',
  'INSCRICAO_INVALIDA', 'a inscrição precisa ser do advogado');
select is((teste.erro($$ select portal_peticao_preparar(beatriz, rm, cs.pereira, pg_temp.pedido(array[cli.joana], pg_temp.adv(ids.felipe, ids.rm), '{"numero": "1001234-78.2026.5.02.0011", "modelo": {"padrao": "XPTO"}}')) from ids, cs, cli $$)) -> 'detalhe' -> 'motivos',
  '{"modelo": "MODELO_INVALIDO", "numero": "NUMERO_CNJ_INVALIDO"}'::jsonb, 'número fora do padrão do CNJ e modelo desconhecido');
select is((select portal_peticao_preparar(beatriz, rm, cs.pereira, pg_temp.pedido(array[cli.joana, cli.carlos], pg_temp.adv(ids.felipe, ids.rm))) -> 'pedido' -> 'modelo' ->> 'padrao' from ids, cs, cli),
  'JUNTADA', 'dado faltando não bloqueia: o pedido passa');

-- Gerada pelo responsável: sai aprovada e entra nos documentos do caso (decisões 12, 17 e 25).
create temp table g1 as select portal_peticao_gravar(felipe, rm, cs.pereira, pg_temp.pedido(array[cli.joana], pg_temp.adv(ids.felipe, ids.rm)), pg_temp.resultado()) j from ids, cs, cli;
select is((select j ->> 'situacao' from g1), 'APROVADA', 'a do responsável sai aprovada, sem revisão');
select is((select d.tipo || '|' || d.categoria || '|' || d.situacao from documentos_caso d, g1 where d.peticao_id = (g1.j ->> 'id')::uuid),
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document|PETICAO|PRONTO', 'a aprovada entra nos documentos do caso, em .docx');
select is((select portal_peticao_arquivo(felipe, rm, (g1.j ->> 'id')::uuid) ->> 'rascunho' from ids, g1), 'false', 'decisão 19: a aprovada baixa sem a marca de rascunho');

-- Gerada pela estagiária: rascunho, enviar, revisão.
create temp table g2 as select portal_peticao_gravar(beatriz, rm, cs.pereira,
  pg_temp.pedido(array[cli.joana, cli.carlos], pg_temp.adv(ids.felipe, ids.rm), '{"parteContrariaQualificacao": "pessoa jurídica de direito privado, CNPJ 12.418.330/0001-74"}'),
  pg_temp.resultado()) j from ids, cs, cli;
select is((select j ->> 'situacao' from g2), 'RASCUNHO', 'decisão 18: guardar como rascunho');
select is((select parte_contraria_qualificacao from casos, cs where id = cs.pereira), 'pessoa jurídica de direito privado, CNPJ 12.418.330/0001-74',
  'decisão 7: a qualificação da parte contrária fica guardada no caso');
select is((select portal_peticao_arquivo(beatriz, rm, (g2.j ->> 'id')::uuid) ->> 'rascunho' from ids, g2), 'true', 'o rascunho baixa com a marca');
select is((select count(*)::int from documentos_caso d, g2 where d.peticao_id = (g2.j ->> 'id')::uuid), 0, 'o rascunho não entra nos documentos');
select is((select portal_peticao_enviar(beatriz, rm, (g2.j ->> 'id')::uuid, 'O prazo vence hoje') ->> 'situacao' from ids, g2), 'REVISAO', 'enviar para a revisão');
select is((teste.erro($$ select portal_peticao_enviar(beatriz, rm, (g2.j ->> 'id')::uuid, null) from ids, g2 $$)) -> 'detalhe' ->> 'motivo', 'JA_EM_REVISAO', 'não se envia duas vezes');
select is((select dados ->> 'quem' from avisos_sino, ids where pessoa_id = felipe and tipo = 'PETICAO_REVISAR'), 'Beatriz Nogueira', 'decisão 20: o revisor é avisado no sino');
select is((select (portal_peticoes(felipe, rm, '{"visao": "REVISAR"}') ->> 'paraRevisar')::int from ids), 1, 'Para eu revisar conta a que espera Felipe');
select is((select jsonb_array_length(portal_peticoes(beatriz, rm, '{"visao": "MINHAS"}') -> 'peticoes') from ids), 1, 'Minhas: as que Beatriz gerou');
select is((select jsonb_array_length(portal_peticoes(beatriz, rm, '{"q": "seguradora"}') -> 'peticoes') from ids), 0, 'busca pelo nome do caso (sem resultado)');
select is((select jsonb_array_length(portal_peticoes(beatriz, rm, '{"q": "joana"}') -> 'peticoes') from ids), 2, 'busca pelo cliente do caso');

-- Comentários (decisão 22).
select is((teste.erro($$ select portal_peticao_comentar(beatriz, rm, (g2.j ->> 'id')::uuid, '{"texto": "oi"}') from ids, g2 $$)) -> 'detalhe' ->> 'motivo',
  'SEM_PERMISSAO_REVISAR', 'só quem revisa comenta');
select is((teste.erro($$ select portal_peticao_comentar(felipe, rm, (g2.j ->> 'id')::uuid, '{"paragrafo": 9, "texto": "x"}') from ids, g2 $$)) -> 'detalhe' -> 'motivos' ->> 'paragrafo',
  'PARAGRAFO_INVALIDO', 'o parágrafo precisa existir na prévia');
create temp table k1 as select portal_peticao_comentar(felipe, rm, (g2.j ->> 'id')::uuid, '{"paragrafo": 2, "texto": "O endereço da sede mudou."}') j from ids, g2;
select is((select j ->> 'trecho' from k1), 'JOANA PEREIRA, nos autos', 'o comentário cita o trecho do parágrafo');
select is((select jsonb_array_length(portal_peticao(beatriz, rm, (g2.j ->> 'id')::uuid) -> 'comentarios') from ids, g2), 0, 'antes da decisão, só o autor vê');

-- Decisão (decisão 21).
select is((teste.erro($$ select portal_peticao_decidir(felipe, rm, (g2.j ->> 'id')::uuid, '{"decisao": "REPROVAR", "versao": 1}') from ids, g2 $$)) -> 'detalhe' -> 'motivos' ->> 'comentario',
  'MOTIVO_OBRIGATORIO', 'reprovar pede o motivo');
select is((teste.erro($$ select portal_peticao_decidir(felipe, rm, (g2.j ->> 'id')::uuid, '{"decisao": "AJUSTE", "versao": 2}') from ids, g2 $$)) ->> 'codigo',
  'TC409', 'VERSAO_DESATUALIZADA: decidir sobre outra versão');
select is((select portal_peticao_decidir(felipe, rm, (g2.j ->> 'id')::uuid, '{"decisao": "AJUSTE", "versao": 1}') ->> 'situacao' from ids, g2), 'AJUSTE',
  'pedir ajuste com o comentário preso ao parágrafo');
select is((select jsonb_array_length(portal_peticao(beatriz, rm, (g2.j ->> 'id')::uuid) -> 'comentarios') from ids, g2), 1, 'depois da decisão, quem gerou vê o comentário');
select is((select dados ->> 'decisao' from avisos_sino, ids where pessoa_id = beatriz and tipo = 'PETICAO_DECIDIDA'), 'AJUSTE', 'quem gerou é avisado da decisão');
select is((select portal_peticao(beatriz, rm, (g2.j ->> 'id')::uuid) -> 'pode' ->> 'novaVersao' from ids, g2), 'true', 'quem gerou pode enviar a versão nova');

-- Versão nova (decisão 23).
select is((teste.erro($$ select portal_peticao_versao_gravar(felipe, rm, (g2.j ->> 'id')::uuid, '{"origem": "DOCX_EDITADO"}', pg_temp.resultado()) from ids, g2 $$)) -> 'detalhe' ->> 'motivo',
  'SEM_PERMISSAO', 'só quem gerou (ou a sócia dona) envia a versão nova');
select is((select portal_peticao_versao_gravar(beatriz, rm, (g2.j ->> 'id')::uuid,
            jsonb_build_object('origem', 'DOCX_EDITADO', 'resolvidos', jsonb_build_array(k1.j ->> 'id'), 'recado', 'Corrigi o endereço'), pg_temp.resultado()) ->> 'versao' from ids, g2, k1),
  '2', 'o .docx editado vira a v2 e volta para a revisão');
select is((select resolvido_na_versao from peticao_comentarios, k1 where id = (k1.j ->> 'id')::uuid), 2, 'o comentário fica resolvido na v2');

-- Passar a revisão (decisão 27).
select is((teste.erro($$ select portal_peticao_passar(felipe, rm, (g2.j ->> 'id')::uuid, jsonb_build_object('pessoaId', ids.gustavo)) from ids, g2 $$)) -> 'detalhe' -> 'motivos' ->> 'pessoaId',
  'REVISOR_INVALIDO', 'quem não tem OAB não revisa');
select is((select portal_peticao_passar(felipe, rm, (g2.j ->> 'id')::uuid, jsonb_build_object('pessoaId', ids.larissa, 'motivo', 'Estou em audiência')) -> 'revisor' ->> 'nome' from ids, g2),
  'Larissa Costa', 'passar a revisão a outro advogado');
select is((select count(*)::int from avisos_sino, ids where pessoa_id = beatriz and tipo = 'PETICAO_PASSADA'), 1, 'quem gerou é avisado da passagem');
select is((teste.erro($$ select portal_peticao_decidir(felipe, rm, (g2.j ->> 'id')::uuid, '{"decisao": "APROVAR", "versao": 2}') from ids, g2 $$)) -> 'detalhe' ->> 'motivo',
  'SEM_PERMISSAO_REVISAR', 'quem passou não decide mais');

-- Aprovar a v2.
select lives_ok($$ select portal_peticao_para_aprovar(larissa, rm, (g2.j ->> 'id')::uuid, 2) from ids, g2 $$, 'conferir antes de copiar o arquivo');
select is((select portal_peticao_decidir(larissa, rm, (g2.j ->> 'id')::uuid, '{"decisao": "APROVAR", "versao": 2}', gen_random_uuid()) ->> 'situacao' from ids, g2),
  'APROVADA', 'aprovar a versão 2');
select is((select portal_peticao_arquivo(beatriz, rm, (g2.j ->> 'id')::uuid, 1) ->> 'rascunho' from ids, g2), 'true', 'a v1 continua como rascunho, para consulta');
select throws_ok($$ update peticoes set situacao = 'REVISAO' where id = (select (j ->> 'id')::uuid from g2) $$, 'TC023', null, 'aprovada não muda mais');
select throws_ok($$ delete from peticao_versoes $$, 'TC023', null, 'PT-03: versão não se apaga');

-- Reprovar (decisão 26).
create temp table g3 as select portal_peticao_gravar(beatriz, rm, cs.lima,
  pg_temp.pedido(array[cli.joana], pg_temp.adv(ids.socia, ids.rm), '{"enviar": true, "numero": "1001234-77.2026.5.02.0011", "gravarNumero": true}'), pg_temp.resultado()) j from ids, cs, cli;
select is((select numero_cnj from casos, cs where id = cs.lima), '10012347720265020011', 'decisão 7: o número escrito vai também para o caso, quando pedido');
select is((select portal_peticao_decidir(socia, rm, (g3.j ->> 'id')::uuid, '{"decisao": "REPROVAR", "versao": 1, "comentario": "Peça errada"}') ->> 'situacao' from ids, g3),
  'REPROVADA', 'a sócia dona reprova, com o motivo');

-- Modelos do escritório (decisões 4 e 5).
create temp table m1 as select portal_peticao_modelo_enviar(larissa, rm, null, '{"nome": "Juntada do escritório", "tipo": "JUNTADA", "area": "QUALQUER", "substitui": "JUNTADA"}',
  jsonb_build_object('versaoId', gen_random_uuid(), 'arquivo', 'juntada.docx', 'tamanho', 9000, 'campos', '["ENDERECAMENTO", "NOME_RECLAMADA"]'::jsonb,
                     'desconhecidos', '["NOME_RECLAMADA"]'::jsonb, 'paragrafos', '["[ENDERECAMENTO]"]'::jsonb)) j from ids;
select is((teste.erro($$ select portal_peticao_preparar(beatriz, rm, cs.pereira, pg_temp.pedido(array[cli.joana], pg_temp.adv(ids.felipe, ids.rm))) from ids, cs, cli $$)) -> 'detalhe' -> 'motivos' ->> 'modelo',
  'MODELO_INVALIDO', 'o padrão trocado pelo do escritório não se usa mais');
select is((teste.erro($$ select portal_peticao_modelo_enviar(larissa, rm, null, '{"nome": "Outra juntada", "tipo": "JUNTADA", "area": "QUALQUER", "substitui": "JUNTADA"}', '{}') from ids $$)) -> 'detalhe' -> 'motivos' ->> 'substitui',
  'PADRAO_JA_TROCADO', 'cada padrão é trocado por um modelo só');
select is((select portal_peticao_modelo_enviar(felipe, rm, (m1.j ->> 'id')::uuid, '{}',
  jsonb_build_object('versaoId', gen_random_uuid(), 'arquivo', 'juntada-v2.docx', 'tamanho', 9100, 'campos', '["ENDERECAMENTO"]'::jsonb,
                     'desconhecidos', '[]'::jsonb, 'paragrafos', '["[ENDERECAMENTO]"]'::jsonb)) ->> 'versao' from ids, m1), '2',
  'decisão 4: trocar cria a versão 2 e guarda a anterior');
select is((select (portal_peticao_modelos(beatriz, rm) -> 'usosPadrao' ->> 'JUNTADA')::int from ids), 3, 'quantas vezes cada padrão foi usado');

-- Isolamento.
select is((teste.erro($$ select portal_peticao(intrusa, outro, (g2.j ->> 'id')::uuid) from ids, g2 $$)) ->> 'codigo', 'TC404', 'PT-01: petição de outro escritório não existe');

select * from finish();
rollback;
