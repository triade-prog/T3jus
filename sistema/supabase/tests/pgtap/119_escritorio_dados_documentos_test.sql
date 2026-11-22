-- Dados do escritório para os documentos (PA-07, migration 0860): a sócia dona grava no Portal e
-- a equipe T3jus no Console; tipo, razão social, sede em partes e contatos do escritório; erros
-- presos aos campos; versão lida (PT-19); a linha da sede montada das partes; o texto antigo com
-- "confira"; a cobrança "o mesmo da sede"; Advogados nos documentos sem CPF de quem não pode ver;
-- documentos e petições recebem as partes.
begin;
select plan(30);

create temp table ids as select
  teste.pessoa('Carol Santana') as socia,
  teste.pessoa('Rafael Menezes') as rafael,
  teste.pessoa('Júlia Andrade') as julia,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Santana') as sa,
  teste.escritorio('Outro Escritório') as outro,
  teste.equipe('Carol T3', 'ADMINISTRACAO') as adm,
  teste.equipe('Marta Quintela', 'FINANCEIRO') as fin;
select teste.vincular(socia, sa, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, sa, rafael, 'Rafael Menezes', array['JURIDICO']),
       portal_convidar(socia, sa, julia, 'Júlia Andrade', array['JURIDICO']) from ids;
select portal_oab_incluir(socia, sa, rafael, '{"uf": "BA", "numero": "71204", "tipo": "PRINCIPAL"}') from ids;
select portal_oab_incluir(socia, sa, socia, '{"uf": "BA", "numero": "63876", "letra": "S", "tipo": "PRINCIPAL"}') from ids;
update escritorios set cnpj = '60814144000103', cidade = 'Presidente Jânio Quadros', uf = 'BA' where id = (select sa from ids);
create function pg_temp.versao() returns int language sql as $$ select versao from escritorios where id = (select sa from ids) $$;

-- O Portal traz os dados para os documentos e a versão.
select is((select portal_escritorio(julia, sa) -> 'documentos' ->> 'cnpj' from ids), '60814144000103', 'o Portal traz os dados para os documentos');
select is((select portal_escritorio(julia, sa) -> 'documentos' -> 'dona' ->> 'nome' from ids), 'Carol Santana', 'e quem é a sócia dona');
select is((select portal_escritorio(julia, sa) -> 'documentos' -> 'dona' -> 'dados' from ids), 'null'::jsonb, 'sem os dados dela para quem não é ela');
select ok((select portal_escritorio(socia, sa) -> 'documentos' -> 'dona' -> 'dados' ? 'nomeCompleto' from ids), 'a sócia dona vê os próprios dados');

-- Recomendação 1: só a sócia dona grava.
select is((teste.erro($$ select portal_escritorio_dados_salvar(julia, sa, pg_temp.versao(), '{"nome": "Santana", "tipo": "SOCIEDADE"}') from ids $$)) ->> 'codigo',
  'TC401', 'PA-07: só a sócia dona muda os dados do escritório');

-- Erros presos aos campos.
select is((teste.erro($$ select portal_escritorio_dados_salvar(socia, sa, pg_temp.versao(),
  '{"nome": "", "razaoSocial": "abc", "cnpj": "11.111.111/1111-11", "oabUf": "BA", "cep": "4625", "logradouro": "Rua A",
    "uf": "XX", "telefone": "123", "email": "sem-arroba", "site": "nada"}') from ids $$)) -> 'detalhe' -> 'motivos',
  '{"nome": "NOME_OBRIGATORIO", "tipo": "TIPO_OBRIGATORIO", "razaoSocial": "RAZAO_SOCIAL_INVALIDA", "cnpj": "CNPJ_INVALIDO",
    "oabNumero": "OAB_INCOMPLETA", "cep": "CEP_INVALIDO", "numero": "NUMERO_OBRIGATORIO", "uf": "UF_INVALIDA",
    "telefone": "TELEFONE_INVALIDO", "email": "EMAIL_INVALIDO", "site": "SITE_INVALIDO"}'::jsonb,
  'PA-07: cada erro com o seu campo e o seu código');
select is((teste.erro($$ select portal_escritorio_dados_salvar(socia, sa, pg_temp.versao() - 1, '{"nome": "Santana", "tipo": "SOCIEDADE"}') from ids $$)) ->> 'codigo',
  'TC409', 'PT-19: a versão antiga recebe o conflito');

-- Completo.
create temp table r1 as select portal_escritorio_dados_salvar(socia, sa, pg_temp.versao(),
  '{"nome": " Santana ", "tipo": "sociedade_individual", "razaoSocial": "Santana  Sociedade Individual de Advocacia", "cnpj": "60.814.144/0001-03",
    "oabUf": "ba", "oabNumero": "4.217", "cep": "46250-000", "logradouro": "Rua Sete de Setembro", "numero": "120", "complemento": "sala 4",
    "bairro": "Centro", "cidade": "Presidente Jânio Quadros", "uf": "ba", "telefone": "(77) 98123-9809", "email": "Contato@Santana.adv.br",
    "site": "santana.adv.br"}') j from ids;
select is((select j -> 'documentos' ->> 'razaoSocial' from r1), 'Santana Sociedade Individual de Advocacia', 'a razão social, sem espaços a mais');
select is((select j -> 'documentos' ->> 'tipo' from r1) || '|' || (select j -> 'documentos' ->> 'oab' from r1), 'SOCIEDADE_INDIVIDUAL|OAB/BA 4.217',
  'o tipo e o registro da sociedade na OAB');
select is((select j -> 'documentos' ->> 'endereco' from r1), 'Rua Sete de Setembro, 120, sala 4, Centro', 'a linha da sede sai das partes');
select is((select j -> 'documentos' ->> 'cep' from r1) || '|' || (select j -> 'documentos' ->> 'telefone' from r1) || '|' || (select j -> 'documentos' ->> 'email' from r1),
  '46250000|77981239809|contato@santana.adv.br', 'CEP e telefone só com os dígitos, e-mail em minúsculas');
select is((select j -> 'dadosMudados' ->> 'onde' from r1), 'PORTAL', 'a última mudança diz que foi no Portal');
select ok((select h.dados -> 'campos' ? 'razaoSocial' and h.dados -> 'campos' ? 'endereco' and not h.dados -> 'campos' ? 'contatos'
             from historico h, ids where h.escritorio_id = sa and h.acao = 'ficha.alterada' order by h.id desc limit 1),
  'o histórico guarda os campos que mudaram');

-- Sem sociedade: razão social, CNPJ e OAB saem.
create temp table r2 as select portal_escritorio_dados_salvar(socia, sa, pg_temp.versao(),
  '{"nome": "Santana", "tipo": "SEM_SOCIEDADE", "razaoSocial": "Ignorada Ltda", "cnpj": "60814144000103", "oabUf": "BA", "oabNumero": "4217",
    "cep": "46250000", "logradouro": "Rua Sete de Setembro", "numero": "s/n", "bairro": "Centro", "cidade": "Presidente Jânio Quadros", "uf": "BA"}') j from ids;
select is((select coalesce(j -> 'documentos' ->> 'razaoSocial', '-') || coalesce(j -> 'documentos' ->> 'cnpj', '-') || coalesce(j -> 'documentos' ->> 'oab', '-') from r2),
  '---', 'recomendação 4: sem sociedade não há razão social, CNPJ nem OAB da sociedade');
select is((select j -> 'documentos' ->> 'numero' from r2), 'S/N', 'o número aceita S/N');

-- O texto antigo do endereço vira rua, com "confira" até alguém salvar.
create temp table c as select console_criar_escritorio(adm, 'Cedro & Lima Advocacia', 'Recife', 'PE') as cedro from ids;
insert into vinculos (pessoa_id, escritorio_id, funcao, criado_por) select fin, cedro, 'FINANCEIRO', adm from ids, c;
update escritorios set endereco = 'Rua da Aurora, 295, sala 1102, Boa Vista' where id = (select cedro from c);
update escritorios set end_logradouro = endereco, end_confira = true where id = (select cedro from c);
select is((select endereco from escritorios where id = (select cedro from c)), 'Rua da Aurora, 295, sala 1102, Boa Vista', 'o texto antigo fica igual na linha');
select is((select console_ficha(adm, cedro) -> 'escritorio' ->> 'enderecoConfira' from ids, c), 'true', 'a ficha do Console mostra o "confira"');

-- Console: os mesmos campos e os contatos.
select is((teste.erro(format($$ select console_ficha_salvar(%L, %L, %s, %L) $$, (select adm from ids), (select cedro from c),
  (select versao from escritorios where id = (select cedro from c)), '{"nome": "Cedro & Lima", "cidade": "", "uf": ""}'))) -> 'detalhe' -> 'motivos',
  '{"cidade": "CIDADE_OBRIGATORIA", "uf": "UF_INVALIDA"}'::jsonb, 'no Console, cidade e UF continuam obrigatórias e o tipo não');
select console_ficha_salvar(adm, cedro, (select versao from escritorios where id = cedro),
  '{"nome": "Cedro & Lima Advocacia", "tipo": "SOCIEDADE", "razaoSocial": "Cedro & Lima Sociedade de Advogados", "cep": "50050000",
    "logradouro": "Rua da Aurora", "numero": "295", "complemento": "sala 1102", "bairro": "Boa Vista", "cidade": "Recife", "uf": "PE",
    "contatos": [{"nome": "Renata Cedro", "papel": "Sócia", "email": "renata@cedrolima.adv.br"}]}') from ids, c;
select is((select end_confira::text || '|' || jsonb_array_length(contatos) from escritorios where id = (select cedro from c)), 'false|1',
  'salvar tira o "confira" e o Console muda os contatos');
select is((select h.dados ->> 'onde' from historico h, c where h.escritorio_id = cedro and h.acao = 'ficha.alterada' order by h.id desc limit 1),
  'CONSOLE', 'o histórico diz que foi no Console');
select is((teste.erro($$ select console_ficha_salvar(julia, sa, 1, '{"nome": "X"}') from ids $$)) ->> 'codigo', 'TC401',
  'quem não é da equipe T3jus não grava pelo Console');

-- Recomendação 2: a cobrança usa a sede quando é "o mesmo".
create temp table pl as select
  (console_plano_salvar(adm, null, null, '{"nome":"Escritório","precoCentavos":49000,"pessoasIncluidas":8}') ->> 'id')::uuid as plano from ids;
select console_assinatura_salvar(fin, cedro, null, jsonb_build_object('planoId', (select plano from pl), 'diaVencimento', 10, 'forma', 'BOLETO',
  'emailCobranca', 'financeiro@cedrolima.adv.br', 'cnpjNota', '12345678000195', 'mesmoDaSede', true)) from ids, c;
select is((select assinatura_endereco_json(a) ->> 'logradouro' from assinaturas a, c where a.escritorio_id = cedro), 'Rua da Aurora',
  'recomendação 2: o pagador usa a sede');
select is((select console_assinatura(fin, cedro) -> 'assinatura' ->> 'mesmoDaSede' from ids, c), 'true', 'a aba Assinatura diz que é o mesmo da sede');
select console_assinatura_salvar(fin, cedro, (select versao from assinaturas where escritorio_id = cedro),
  jsonb_build_object('planoId', (select plano from pl), 'diaVencimento', 10, 'forma', 'BOLETO', 'emailCobranca', 'financeiro@cedrolima.adv.br',
    'cnpjNota', '12345678000195', 'mesmoDaSede', false,
    'endereco', '{"cep":"50030-000","logradouro":"Av. Rio Branco","numero":"10","bairro":"Recife","cidade":"Recife","uf":"PE"}'::jsonb)) from ids, c;
select is((select assinatura_endereco_json(a) ->> 'logradouro' from assinaturas a, c where a.escritorio_id = cedro), 'Av. Rio Branco',
  'outro endereço de cobrança vale quando a caixa sai');

-- Advogados nos documentos: a lista para todos; CPF e RG só de si e para a sócia dona.
select portal_conta_dados_salvar(rafael, sa, 0, '{"nomeCompleto": "Rafael Augusto Menezes Lima", "tratamento": "ADVOGADO", "cpf": "52998224725"}') from ids;
select is((select jsonb_array_length(portal_escritorio_advogados(julia, sa) -> 'advogados') from ids), 2, 'a lista traz quem tem OAB');
select is((select jsonb_path_query_first(portal_escritorio_advogados(julia, sa), '$.advogados[*] ? (@.nome == "Rafael Menezes").dados') from ids),
  'null'::jsonb, 'pergunta 5: quem não é a sócia dona não vê os dados dos outros');
select ok((select jsonb_path_query_first(portal_escritorio_advogados(julia, sa), '$.advogados[*] ? (@.nome == "Rafael Menezes").faltas') ? 'RG' from ids),
  'mas vê o que falta');
select is((select jsonb_path_query_first(portal_escritorio_advogados(socia, sa), '$.advogados[*] ? (@.nome == "Rafael Menezes").dados.cpf') #>> '{}' from ids),
  '52998224725', 'a sócia dona vê os dados de todos');
select is((select jsonb_path_query_first(portal_escritorio_advogados(rafael, sa), '$.advogados[0].pessoaId') #>> '{}' from ids),
  (select rafael::text from ids), 'cada um vem primeiro na própria lista');

-- PT-01.
select is((teste.erro($$ select portal_escritorio_dados_salvar(intrusa, sa, 1, '{"nome": "X", "tipo": "SOCIEDADE"}') from ids $$)) ->> 'codigo',
  'TC401', 'PT-01: pessoa de outro escritório é recusada');

select * from finish();
rollback;
