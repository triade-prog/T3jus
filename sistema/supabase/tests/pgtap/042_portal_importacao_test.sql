-- Importar clientes e contratos de uma planilha (F3.55, VA-05): a ligação das colunas pelo
-- nome; os pares de valores; os campos obrigatórios; a prévia com erro, aviso e o que cada
-- contrato gera; correção, decisão e pular; importar tudo ou nada (com a versão da prévia);
-- a parcela paga antes como informação; o cadastro juntado só nos campos vazios; as linhas de
-- fora; desfazer em 7 dias, só para quem importou ou a sócia dona, sem mexer no que foi mexido;
-- quem pode importar contratos; a prévia de 24 horas; isolamento (PT-01, PT-03, PT-04, PT-11).
begin;
select plan(53);

select ajustar_relogio(('2026-11-20 12:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Paula Nunes') as paula,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, diego, 'Diego Almeida', array['CONTRATOS', 'FINANCEIRO', 'COMERCIAL']),
       portal_convidar(socia, rm, paula, 'Paula Nunes', array['JURIDICO']) from ids;

-- Já cadastrados: Antônia (o CPF da linha 3, sem e-mail e sem profissão) e Hélio (o telefone da linha 8).
create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Antônia Ferreira Prado', 'documento', '40816395233',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Antônia Ferreira Prado', 'telefone', '+5511991234567', 'principal', true)))) ->> 'id')::uuid ant,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Hélio Batista Corrêa',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Marta Corrêa', 'telefone', '+5511982201764', 'principal', true)))) ->> 'id')::uuid hel
  from ids;

-- As células que a API leu do arquivo (a aba "Resumo" vem vazia).
create temp table arq as select jsonb_build_object('arquivoNome', 'clientes-e-contratos-2026.xlsx', 'oQue', 'CLIENTES_CONTRATOS', 'abas', jsonb_build_array(
  jsonb_build_object('nome', 'Clientes e contratos', 'colunas', jsonb_build_array(
    'Nome do cliente', 'CPF/CNPJ', 'Celular', 'E-mail', 'Estado civil', 'Profissão', 'Como chegou', 'Obs.', 'Serviço', 'Forma de cobrança',
    'Valor', 'Parcelas', '1º vencto', 'Pagas', 'Assinatura', 'Advogado', 'Área'),
  'linhas', jsonb_build_array(
    jsonb_build_array('Rosa Almeida', '529.982.247-25', '(11) 98451-2290', 'rosa.almeida@exemplo.com.br', 'casada', 'professora', 'indicação', 'prefere WhatsApp',
                      'Aposentadoria por idade', 'parcelado', 'R$ 4.800,00', '6', '10/09/2026', '2', '02/09/2026', 'Dra. Marina', 'Previdenciário'),
    jsonb_build_array('Antonia F. Prado', '408.163.952-33', '(11) 99123-4567', 'antonia.prado@exemplo.com.br', '', 'aposentada', '', '',
                      'Revisão da pensão', 'à vista', '1500', '', '10/12/2026', '', '01/11/2026', 'Dra. Marina', ''),
    jsonb_build_array('Márcio Tavares', '734.190.285-08', '(11) 97012-3348', '', '', '', '', '',
                      'Reclamação trabalhista', 'êxito', '30%', '', '', '', '05/11/2026', 'Diego', ''),
    jsonb_build_array('Oficina Irmãos Dias Ltda.', '28.374.651/0001-60', '', 'contato@oficina.exemplo.com.br', '', '', 'insta', '',
                      'Consultivo trabalhista', 'mensalidade', '1.200,00', '', '10/12/2026', '', '15/11/2026', 'Diego', ''),
    jsonb_build_array('Rosa Almeida', '52998224725', '(11) 98451-2290', '', '', '', '', '',
                      'Revisão do benefício', 'êxito', '30', '', '', '', '02/09/2026', 'Dra. Marina', ''),
    jsonb_build_array('Lúcia Helena Barros', '', '', '', '', '', '', '',
                      'Divórcio consensual', 'parcelado', '3600', '4', '10/12/2026', '', '10/11/2026', 'Dra. Marina', ''),
    jsonb_build_array('Renato Queiroz', '', '11 98220-1764', '', '', '', '', '', '', '', '', '', '', '', '', '', ''),
    jsonb_build_array('Sílvia Moraes', '', '', 'silvia@exemplo.com.br', '', '', '', '',
                      'Revisional de aluguel', 'à vista', 'R$ 2.5OO,00', '', '10/12/2026', '', '10/11/2026', 'Dra. Marina', ''),
    jsonb_build_array('Gilberto Ramos', '', '(11) 99540-2281', '', '', '', '', '',
                      'Usucapião', 'parcelado', '10000', '8', '10/01/2027', '', '', 'Dr. Paulo', ''),
    jsonb_build_array('Neusa Carvalho', '', '(11) 97781-0956', '', 'amasiada', '', '', '', '', '', '', '', '', '', '', '', ''),
    jsonb_build_array('', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''))),
  jsonb_build_object('nome', 'Resumo', 'colunas', jsonb_build_array('Total'), 'linhas', '[]'::jsonb))) d;

-- Quem pode.
select is((teste.erro($$ select portal_importacao_criar(paula, rm, arq.d) from ids, arq $$)) -> 'detalhe' ->> 'motivo', 'AREA_NAO_LIBERADA',
  'pergunta 1: contratos só com a área Contratos');
select is((teste.erro($$ select portal_importacao_criar(socia, rm, '{"arquivoNome": "x.xlsx", "oQue": "CLIENTES", "abas": [{"nome": "A", "colunas": ["Nome"], "linhas": []}]}') from ids $$))
  -> 'detalhe' ->> 'motivo', 'ARQUIVO_VAZIO', 'planilha sem linhas abaixo dos nomes das colunas');

-- Enviar: a ligação já vem sugerida pelo nome.
create temp table imp as select portal_importacao_criar(socia, rm, arq.d) j from ids, arq;
create temp table v as select (j ->> 'id')::uuid id from imp;
select is((select j -> 'ligacao' from imp),
  '{"0": "nome", "1": "documento", "2": "telefone", "3": "email", "4": "estado_civil", "5": "profissao", "6": "origem", "8": "objeto", "9": "tipo",
    "10": "valor", "11": "parcelas", "12": "primeiro", "13": "pagas", "14": "assinatura", "15": "responsavel"}'::jsonb,
  'decisão 11: cada coluna ligada pelo nome; Obs. e Área ficam de fora');
select is((select jsonb_agg(c ->> 'foraMotivo') filter (where c ->> 'foraMotivo' is not null) from imp, jsonb_array_elements(j -> 'colunas') c),
  '["OBSERVACAO", "AREA"]'::jsonb, 'decisão 12: observação livre e área ficam de fora, com o motivo');
select is((select j -> 'colunas' -> 1 ->> 'exemplo' from imp), '529.982.247-25', 'o primeiro valor de cada coluna como exemplo');
select is((select jsonb_agg(a ->> 'linhas') from imp, jsonb_array_elements(j -> 'abas') a), '["11", "0"]'::jsonb, 'as abas, com as linhas de cada uma');
select is((select count(*) from clientes_escritorio, ids where escritorio_id = ids.rm)::integer, 2, 'enviar não grava nenhum cliente');

-- Pares de valores: "Dra. Marina" vira Marina; "Dr. Paulo" não está na Equipe.
create temp table pr as select portal_importacao_pares(socia, rm, v.id, jsonb_build_object('ligacao', imp.j -> 'ligacao')) p from ids, v, imp;
select is((select jsonb_object_agg(x ->> 'valor', coalesce(x ->> 'sugestao', '-')) from pr, jsonb_array_elements(p -> 'responsavel') x),
  (select jsonb_build_object('Dra. Marina', socia, 'Diego', diego, 'Dr. Paulo', '-', '', '-') from ids), 'decisão 13: o responsável pelo nome, um par por valor');
select is((select jsonb_agg(x ->> 'letra') from pr, jsonb_array_elements(p -> 'colunas') x) ->> 0, 'A', 'trocar de aba: os pares trazem as colunas da aba');
select is((select jsonb_object_agg(x ->> 'valor', x ->> 'sugestao') from pr, jsonb_array_elements(p -> 'tipo') x),
  '{"parcelado": "PARCELADO", "à vista": "FIXO", "êxito": "EXITO", "mensalidade": "MENSAL", "30": null}'::jsonb - '30',
  'decisão 13: a forma de cobrança vira o tipo de honorário');

-- Obrigatórios: sem telefone nem e-mail ligados, e sem o par de "Dr. Paulo".
select is((teste.erro($$ select portal_importacao_colunas(socia, rm, v.id, 1, jsonb_build_object('ligacao', (imp.j -> 'ligacao') - '2' - '3')) from ids, v, imp $$)) -> 'detalhe',
  '{"motivo": "CAMPO_OBRIGATORIO_SEM_COLUNA", "campos": ["responsavel", "contato"]}'::jsonb, 'decisão 15: campo obrigatório sem coluna é erro, com os campos');
select is((teste.erro($$ select portal_importacao_colunas(socia, rm, v.id, 1, jsonb_build_object('ligacao', (imp.j -> 'ligacao') || '{"7": "nome"}')) from ids, v, imp $$)) -> 'detalhe' -> 'campos',
  '["c7"]'::jsonb, 'o mesmo campo não vai para duas colunas');
create temp table pv as select portal_importacao_colunas(socia, rm, v.id, (imp.j ->> 'versao')::integer, jsonb_build_object('ligacao', imp.j -> 'ligacao',
  'pares', jsonb_build_object('responsavel', jsonb_build_object('dr. paulo', ids.socia)))) r from ids, v, imp;
select is((select r -> 'contagens' from pv), '{"lidas": 10, "prontas": 3, "aviso": 4, "erro": 3, "puladas": 0, "corrigidas": 0, "decididas": 0}'::jsonb,
  'decisão 17: a prévia conta as lidas (a linha vazia some), prontas, com aviso e com erro');

create temp table ln as select (l ->> 'numero')::integer n, l from ids, v, jsonb_array_elements(portal_importacao_linhas(socia, rm, v.id) -> 'linhas') l;
select is((select jsonb_object_agg(n, jsonb_build_array(l ->> 'situacao', (select jsonb_agg(p ->> 'codigo') from jsonb_array_elements(l -> 'problemas') p))) from ln),
  '{"2": ["PRONTA", null], "3": ["AVISO", ["DUPLICADO"]], "4": ["ERRO", ["CPF_INVALIDO"]], "5": ["PRONTA", null], "6": ["PRONTA", null],
    "7": ["ERRO", ["CONTATO_OBRIGATORIO"]], "8": ["AVISO", ["TELEFONE_DE_OUTRO"]], "9": ["ERRO", ["VALOR_INVALIDO"]],
    "10": ["AVISO", ["SEM_ASSINATURA"]], "11": ["AVISO", ["FORA_DA_LISTA"]]}'::jsonb,
  'decisões 19 e 20: cada linha com a situação e o problema');
select is((select (l -> 'contrato' -> 'gera') - 'lista' from ln where n = 2),
  '{"parcelas": 4, "valor": 320000, "vencidas": 1, "valorVencido": 80000, "pagasAntes": 2, "valorPagoAntes": 160000, "proxima": "2026-12-10"}'::jsonb,
  'decisões 22 e 23: 6 de R$ 800 com 2 pagas antes; a de novembro entra vencida');
select is((select l -> 'contrato' ->> 'tipo' from ln where n = 5) || ' ' || (select l -> 'contrato' -> 'gera' ->> 'parcelas' from ln where n = 5), 'MENSAL 12',
  'mensalidade sem número de meses: 12, como no contrato feito à mão');
select is((select l -> 'mesmaDe' from ln where n = 6), '2'::jsonb, 'decisão 21: o mesmo CPF da linha 2 é um cliente só');
select is((select l -> 'cliente' ->> 'tipo' from ln where n = 5), 'PJ', 'CNPJ: pessoa jurídica');
select is((select jsonb_agg(x ->> 'resultado' order by x ->> 'campo') from ln, jsonb_array_elements(l -> 'duplicado' -> 'comparar') x where n = 3),
  '["IGUAL", "ENTRA", "FICA", "ENTRA", "IGUAL"]'::jsonb, 'decisão 20: a comparação campo a campo (documento, e-mail, nome, profissão, telefone)');
select is((select l -> 'telefoneDe' ->> 'nome' from ln where n = 8), 'Hélio Batista Corrêa', 'o mesmo telefone de outro cliente é aviso');
select is((select p ->> 'valor' from ln, jsonb_array_elements(l -> 'problemas') p where n = 9), 'R$ 2.5OO,00', 'o valor ilegível volta como veio, para marcar');

-- Corrigir, decidir e pular.
create temp table c4 as select portal_importacao_linha(socia, rm, v.id, 4, '{"campos": {"documento": "734.190.285-04"}}') r from ids, v;
select is((select r -> 'linha' ->> 'situacao' from c4) || ' ' || (select r -> 'linha' -> 'corrigidas' -> 0 ->> 'antes' from c4), 'PRONTA 734.190.285-08',
  'decisão 19: a linha corrigida fica pronta e guarda o valor antigo');
select is((select portal_importacao_decidir(socia, rm, v.id, '{"codigo": "DUPLICADO", "decisao": "JUNTAR"}') ->> 'decididas' from ids, v), '1',
  'decisão 20: "Juntar as 6" de uma vez');
select is((teste.erro($$ select portal_importacao_linha(socia, rm, v.id, 8, '{"decisao": "JUNTAR"}') from ids, v $$)) -> 'detalhe' -> 'campos', '["decisao"]'::jsonb,
  'juntar só onde há cadastro parecido');
select portal_importacao_linha(socia, rm, v.id, n, '{"decisao": "SEGUIR"}') from ids, v, (values (8), (10), (11)) x(n);
create temp table c9 as select portal_importacao_linha(socia, rm, v.id, 9, '{"decisao": "PULAR"}') r from ids, v;
select is((select r -> 'contagens' from c9), '{"lidas": 10, "prontas": 8, "aviso": 0, "erro": 1, "puladas": 1, "corrigidas": 1, "decididas": 4}'::jsonb,
  'as contagens acompanham as correções e decisões');
select is((select r - 'contagens' - 'meses' - 'linha' - 'versao' from c9),
  '{"clientes": {"novos": 6, "juntados": 1}, "contratos": {"ativos": 5, "elaboracao": 1, "mensais": 1, "exitos": 2},
    "financeiro": {"parcelas": 17, "valor": 1910000, "vencidas": 1, "pagasAntes": 2, "valorPagoAntes": 160000}}'::jsonb,
  'decisão 24: o que vai entrar, em centavos exatos (Rosa, Márcio, Oficina, Renato, Gilberto e Neusa; Antônia juntada)');
select is((select r -> 'meses' from c9), '[{"mes": "2026-12", "valor": 350000}, {"mes": "2027-01", "valor": 200000}, {"mes": "2027-02", "valor": 200000}]'::jsonb,
  'decisão 24: os três próximos meses');

-- Importar: a versão da prévia que a pessoa viu.
select is((teste.erro($$ select portal_importacao_importar(socia, rm, v.id, 1) from ids, v $$)) ->> 'codigo', 'TC409', 'a prévia mudou: nada entra');
select is((teste.erro($$ select portal_importacao_importar(diego, rm, v.id, i.versao) from ids, v, importacoes i where i.id = v.id $$)) ->> 'codigo', 'TC404',
  'a prévia é só de quem importou');
create temp table fim as select portal_importacao_importar(socia, rm, v.id, i.versao) r from ids, v, importacoes i where i.id = v.id;
select is((select (r -> 'resumo') - 'juntadosIds' from fim),
  '{"clientes": 6, "juntados": 1, "contratos": 6, "ativos": 5, "parcelas": 17, "valor": 1910000, "vencidas": 1, "exitos": 2, "valorPagoAntes": 160000, "linhas": 8, "fora": 2}'::jsonb,
  'decisão 28: o que entrou');
select is((select count(*) from contratos c join importacao_linhas l on l.cliente_id = c.cliente_id
            where l.importacao_id = (select id from v) and l.numero = 2 and c.estado = 'ATIVO')::integer, 2,
  'Rosa: um cliente só, com dois contratos ativos');
select is((select jsonb_agg(jsonb_build_array(r.vencimento, r.pago_antes, r.cancelado_em is not null) order by r.vencimento)
             from recebimentos_previstos r join importacao_linhas l on l.contrato_id = r.contrato_id where l.importacao_id = (select id from v) and l.numero = 2),
  '[["2026-09-10", true, true], ["2026-10-10", true, true], ["2026-11-10", false, false], ["2026-12-10", false, false], ["2027-01-10", false, false], ["2027-02-10", false, false]]'::jsonb,
  'pergunta 2: as pagas antes ficam só como informação; a vencida entra em atraso');
select is((select jsonb_build_array(c.profissao, contato_principal(c.contatos) ->> 'email', contato_principal(c.contatos) ->> 'telefone', c.nome) from clientes_escritorio c, cli where c.id = cli.ant),
  '["aposentada", "antonia.prado@exemplo.com.br", "+5511991234567", "Antônia Ferreira Prado"]'::jsonb,
  'decisão 20: juntar só preenche o que estava vazio');
select is((select c.estado from contratos c join importacao_linhas l on l.contrato_id = c.id where l.importacao_id = (select id from v) and l.numero = 10), 'ELABORACAO',
  'decisão 14: sem a data da assinatura, o contrato entra em elaboração');
select is((select j -> 'abas' from v, ids, lateral (select portal_importacao(socia, rm, v.id) j) x), 'null'::jsonb, 'PT-11: as células lidas são apagadas ao importar');
select is((select jsonb_agg(x ->> 'numero') from ids, v, jsonb_array_elements(portal_importacao_fora(socia, rm, v.id) -> 'linhas') x), '["7", "9"]'::jsonb,
  'decisão 28: as linhas de fora, com o motivo');
select is((select count(*) from historico h, ids where h.escritorio_id = ids.rm and h.acao = 'importacao.concluida')::integer, 1, 'decisão 29: a importação no histórico');
select is((select jsonb_array_length(portal_importacoes(diego, rm)) from ids), 1, 'decisão 31: todos da equipe veem o histórico das importações');
select is((select jsonb_array_length(portal_clientes_da_importacao(diego, rm, v.id) -> 'clientes') from ids, v), 6, 'decisão 28: o filtro "Desta importação"');
select is((select portal_importacao_origem(diego, rm, l.cliente_id) ->> 'arquivo' from ids, v, importacao_linhas l where l.importacao_id = v.id and l.numero = 2),
  'clientes-e-contratos-2026.xlsx', 'decisão 29: a ficha do cliente diz que veio da planilha');
select is((select portal_importacao_origem(diego, rm, l.contrato_id) ->> 'id' from ids, v, importacao_linhas l where l.importacao_id = v.id and l.numero = 2),
  (select id::text from v), 'decisão 29: a ficha do contrato também');

-- Desfazer.
select is((teste.erro($$ select portal_importacao_desfazer(diego, rm, v.id, 'importei errado') from ids, v $$)) -> 'detalhe' ->> 'motivo', 'SEM_PERMISSAO',
  'pergunta 4: só quem importou ou a sócia dona desfaz');
select portal_financeiro_receber_registrar(socia, rm, r.id, jsonb_build_object('valor', 120000, 'recebidoEm', '2026-11-20', 'forma', 'PIX'))
  from ids, v, recebimentos_previstos r join importacao_linhas l on l.contrato_id = r.contrato_id
 where l.importacao_id = v.id and l.numero = 5 and r.vencimento = '2026-12-10';
select is((select jsonb_agg(m ->> 'tipo' order by m ->> 'tipo') from ids, v, jsonb_array_elements(portal_importacao_plano_desfazer(socia, rm, v.id) -> 'mexidos') m),
  '["CLIENTE", "CONTRATO"]'::jsonb, 'decisão 30: o que alguém mexeu depois (a parcela recebida da Oficina) fica');
select is((teste.erro($$ select portal_importacao_desfazer(socia, rm, v.id, '') from ids, v $$)) -> 'detalhe' -> 'campos', '["motivo"]'::jsonb, 'motivo obrigatório');
create temp table df as select portal_importacao_desfazer(socia, rm, v.id, 'Importei a aba errada') r from ids, v;
select is((select (r -> 'feito') - 'mexidos' from df), '{"clientes": 5, "juntados": 1, "contratos": 5, "parcelas": 5}'::jsonb, 'decisão 30: o que foi desfeito');
select is((select jsonb_agg(jsonb_build_array(l.numero, c.estado) order by l.numero) from importacao_linhas l join clientes_escritorio c on c.id = l.cliente_id
            where l.importacao_id = (select id from v) and l.numero in (2, 5)),
  '[[2, "INATIVO"], [5, "ATIVO"]]'::jsonb, 'os clientes novos ficam inativos; o mexido fica');
select is((select jsonb_build_array(c.profissao, contato_principal(c.contatos) ->> 'email') from clientes_escritorio c, cli where c.id = cli.ant),
  '[null, null]'::jsonb, 'o cadastro juntado volta ao que era');
select is((select count(*) from recebimentos_previstos r join contratos c on c.id = r.contrato_id
            where c.importacao_id = (select id from v) and c.estado = 'ENCERRADO' and r.cancelado_em is null)::integer, 0,
  'os contratos ficam encerrados e as parcelas, canceladas (nada é apagado)');
select is((teste.erro($$ select portal_importacao_desfazer(socia, rm, v.id, 'de novo') from ids, v $$)) -> 'detalhe' ->> 'motivo', 'JA_DESFEITA', 'desfazer uma vez só');

-- Paula importa só clientes: as colunas de contrato e de origem (Comercial) ficam de fora.
create temp table pa as select portal_importacao_criar(paula, rm, jsonb_set(arq.d, '{oQue}', '"CLIENTES"')) j from ids, arq;
select is((select jsonb_agg(x.value order by x.key::integer) from pa, jsonb_each_text(j -> 'ligacao') x),
  '["nome", "documento", "telefone", "email", "estado_civil", "profissao"]'::jsonb, 'decisão 32: sem Contratos nem Comercial, só as colunas do cliente');

-- Isolamento e prazos.
select is((teste.erro($$ select portal_importacao(intrusa, outro, v.id) from ids, v $$)) ->> 'codigo', 'TC404', 'PT-01: outro escritório não vê a importação');
select ajustar_relogio(('2026-11-28 12:00-03'::timestamptz - now()));
select is((select (portal_importacao(paula, rm, (pa.j ->> 'id')::uuid)) ->> 'situacao' from ids, pa, lateral (select importacoes_limpar()) x), 'EXPIRADA',
  'decisão 8: a prévia vale 24 horas');
select is((select count(*) from importacao_linhas where importacao_id = (select id from v))::integer, 0, 'as linhas de fora são apagadas no fim do prazo');

select * from finish();
rollback;
