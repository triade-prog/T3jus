-- Os dados de cada advogado para os documentos (EX-15): a própria pessoa (Sua conta) e a
-- sócia dona (Equipe) gravam; o nome do convite como padrão; o endereço do escritório como
-- padrão (decisão 2); erros presos aos campos; versão lida (PT-19); histórico só com os nomes
-- dos campos; o gerador de documentos recebe os dados; isolamento (PT-01).
begin;
select plan(24);

create temp table ids as select
  teste.pessoa('Carol Santana') as socia,
  teste.pessoa('Rafael Menezes') as rafael,
  teste.pessoa('Júlia Andrade') as julia,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Santana Advocacia') as sa,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, sa, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, sa, rafael, 'Rafael Menezes', array['JURIDICO']),
       portal_convidar(socia, sa, julia, 'Júlia Andrade', array['JURIDICO']) from ids;

-- Sem linha: nasce do convite, com o endereço do escritório e a versão 0.
select is((select portal_conta_dados(rafael, sa) ->> 'nomeCompleto' from ids), 'Rafael Menezes', 'o nome completo nasce com o nome do convite');
select is((select (portal_conta_dados(rafael, sa) ->> 'enderecoDoEscritorio')::boolean from ids), true, 'decisão 2: o endereço do escritório é o padrão');
select is((select (portal_conta_dados(rafael, sa) ->> 'versao')::int from ids), 0, 'sem linha, versão 0');

-- A pessoa grava os próprios dados.
create temp table r1 as select portal_conta_dados_salvar(rafael, sa, 0,
  '{"nomeCompleto": "  Rafael   Augusto Menezes Lima ", "tratamento": "advogado", "nacionalidade": "brasileiro", "estadoCivil": "casado",
    "cpf": "529.982.247-25", "rg": "12.345.678-90", "rgOrgao": "ssp/ba", "enderecoDoEscritorio": true, "cidade": "Ignorada",
    "emailProfissional": "Rafael@Santana.adv.br", "telefoneProfissional": "(71) 99876-5432"}') j from ids;
select is((select j ->> 'nomeCompleto' from r1), 'Rafael Augusto Menezes Lima', 'espaços a mais saem do nome');
select is((select j ->> 'cpf' from r1), '52998224725', 'o CPF fica só com os dígitos');
select is((select j ->> 'tratamento' from r1) || '/' || (select j ->> 'estadoCivil' from r1) || '/' || (select j ->> 'rgOrgao' from r1),
  'ADVOGADO/CASADO/SSP/BA', 'tratamento, estado civil e órgão em maiúsculas');
select is((select j ->> 'cidade' from r1), null, 'com o endereço do escritório, o endereço próprio não é guardado');
select is((select j ->> 'emailProfissional' from r1) || ' ' || (select j ->> 'telefoneProfissional' from r1),
  'rafael@santana.adv.br 71998765432', 'e-mail em minúsculas e telefone só com os dígitos');
select is((select (j ->> 'versao')::int from r1), 1, 'o primeiro salvar cria a linha');

-- Histórico: quem, onde e quais campos, sem os valores.
create temp table h1 as select dados from historico, ids where escritorio_id = sa and acao = 'equipe.dados_documento_mudados' order by id desc limit 1;
select is((select dados ->> 'onde' from h1), 'CONTA', 'o histórico diz que foi em Sua conta');
select ok((select dados -> 'campos' ? 'CPF' and dados -> 'campos' ? 'NOME_COMPLETO' and not dados -> 'campos' ? 'ENDERECO' from h1),
  'o histórico guarda os nomes dos campos que mudaram');
select ok((select dados::text !~ '52998224725' and dados::text !~ '12.345' from h1), 'decisão 19: sem os valores de CPF e RG');

-- Erros presos aos campos.
select is((teste.erro($$ select portal_conta_dados_salvar(rafael, sa, 1,
  '{"nomeCompleto": "", "cpf": "111.111.111-11", "enderecoDoEscritorio": false, "cep": "123", "uf": "XX", "tratamento": "doutor",
    "estadoCivil": "noivo", "emailProfissional": "sem-arroba", "telefoneProfissional": "123"}') from ids $$)) -> 'detalhe' -> 'motivos',
  '{"nomeCompleto": "NOME_COMPLETO_OBRIGATORIO", "cpf": "CPF_INVALIDO", "cep": "CEP_INVALIDO", "cidade": "ENDERECO_INCOMPLETO",
    "uf": "UF_INVALIDA", "tratamento": "TRATAMENTO_INVALIDO", "estadoCivil": "ESTADO_CIVIL_INVALIDO",
    "emailProfissional": "EMAIL_INVALIDO", "telefoneProfissional": "TELEFONE_INVALIDO"}'::jsonb,
  'cada erro com o seu campo e o seu código');
select is((teste.erro($$ select portal_conta_dados_salvar(rafael, sa, 1, '{"nomeCompleto": "Rafael 2"}') from ids $$)) -> 'detalhe' -> 'motivos' ->> 'nomeCompleto',
  'NOME_COMPLETO_INVALIDO', 'nome com número ou curto demais');

-- A sócia dona completa pela Equipe; a versão antiga é recusada.
select is((teste.erro($$ select portal_equipe_pessoa_dados_salvar(socia, sa, rafael, 0, '{"nomeCompleto": "Rafael Augusto Menezes Lima"}') from ids $$)) ->> 'codigo',
  'TC409', 'PT-19: quem salvar com a versão antiga recebe o conflito');
create temp table r2 as select portal_equipe_pessoa_dados_salvar(socia, sa, rafael, 1,
  '{"nomeCompleto": "Rafael Augusto Menezes Lima", "tratamento": "ADVOGADO", "nacionalidade": "brasileiro", "estadoCivil": "CASADO",
    "cpf": "52998224725", "rg": "12.345.678-90", "rgOrgao": "SSP/BA", "enderecoDoEscritorio": false, "cep": "40.140-110",
    "endereco": "Rua Chile, 10", "bairro": "Centro", "cidade": "Salvador", "uf": "ba"}') j from ids;
select is((select j ->> 'cep' from r2) || ' ' || (select j ->> 'uf' from r2), '40140110 BA', 'decisão 1: a sócia dona grava; o endereço próprio fica');
select is((select j -> 'mudancas' -> 0 ->> 'onde' from r2), 'EQUIPE', 'as últimas mudanças mostram que foi na Equipe');
select is((select j -> 'mudancas' -> 0 -> 'campos' from r2), '["ENDERECO", "EMAIL_PROFISSIONAL", "TELEFONE_PROFISSIONAL"]'::jsonb,
  'só os campos que mudaram');

-- Quem pode.
select is((teste.erro($$ select portal_equipe_pessoa_dados_salvar(julia, sa, rafael, 2, '{"nomeCompleto": "Outro Nome"}') from ids $$)) ->> 'codigo',
  'TC401', 'só a sócia dona muda os dados de outra pessoa');
select is((teste.erro($$ select portal_equipe_pessoa_dados(intrusa, outro, rafael) from ids $$)) ->> 'codigo', 'TC404',
  'PT-01: pessoa de outro escritório não existe');
select is((select portal_conta_dados(julia, sa) ->> 'nomeCompleto' from ids), 'Júlia Andrade', 'cada pessoa vê só os próprios dados');

-- Sua conta e a ficha trazem os dados e o endereço do escritório.
select is((select portal_conta(rafael, sa) -> 'dados' ->> 'nomeCompleto' from ids), 'Rafael Augusto Menezes Lima', 'Sua conta traz os dados');
select ok((select portal_conta(rafael, sa) ? 'escritorio' from ids), 'Sua conta traz o endereço do escritório');

-- Histórico da equipe.
select ok((select count(*) > 0 from ids, portal_historico_equipe(socia, sa) h where h.acao = 'equipe.dados_documento_mudados'),
  'a mudança aparece no histórico da equipe');

select * from finish();
rollback;
