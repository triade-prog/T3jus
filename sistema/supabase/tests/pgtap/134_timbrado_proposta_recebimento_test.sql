-- O timbrado de 4 linhas na proposta em .docx e na prévia de Marca e timbrado (F3.146; PA-07,
-- migration 1000): portal_proposta_timbrado só para quem tem Comercial; o `timbrado` de
-- portal_recebimento só para Financeiro, Contratos e a sócia dona (um membro sem área recebe nulo);
-- sem sociedade, só o nome completo e a OAB da sócia dona (nunca CPF, RG ou estado civil);
-- portal_proposta e o resto de portal_recebimento não mudam; isolamento (PT-01).
begin;
select plan(14);

select ajustar_relogio(('2026-11-23 10:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Carol Santana') as socia,
  teste.pessoa('Bruna Teixeira') as bruna,
  teste.pessoa('Gabriel Comercial') as comercial,
  teste.pessoa('Paula Nunes') as paula,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Santana Advocacia') as sa,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, sa, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, sa, bruna, 'Bruna Teixeira', array['FINANCEIRO']) from ids;
select portal_convidar(socia, sa, comercial, 'Gabriel Comercial', array['COMERCIAL']) from ids;
select portal_convidar(socia, sa, paula, 'Paula Nunes', array[]::text[]) from ids;
select portal_convidar(socia, sa, diego, 'Diego Almeida', array['CONTRATOS']) from ids;
select portal_oab_incluir(socia, sa, socia, '{"uf": "BA", "numero": "63876", "letra": "S", "tipo": "PRINCIPAL"}') from ids;
select portal_conta_dados_salvar(socia, sa, 0, '{"nomeCompleto": "Carolina Soares Santana", "tratamento": "ADVOGADA", "cpf": "52998224725",
  "rg": "0987654321", "rgOrgao": "SSP/BA", "estadoCivil": "CASADO", "nacionalidade": "brasileira"}') from ids;

create function pg_temp.salvar(p jsonb) returns void language sql as $$
  select null from (select portal_escritorio_dados_salvar(socia, sa, (select versao from escritorios where id = sa), p) from ids) x
$$;
select pg_temp.salvar('{"nome": "Santana Advocacia", "tipo": "SOCIEDADE", "razaoSocial": "SANTANA, LIMA E OLIVEIRA SOCIEDADE DE ADVOGADOS",
  "cnpj": "47.318.552/0001-06", "oabUf": "BA", "oabNumero": "4217", "telefone": "(71) 3352-4180", "email": "contato@santana.adv.br",
  "cep": "41820-020", "logradouro": "Av. Tancredo Neves", "numero": "1.632", "bairro": "Caminho das Árvores", "cidade": "Salvador", "uf": "BA"}');

-- 1. A proposta: só quem tem Comercial.
select is((select portal_proposta_timbrado(comercial, sa) ->> 'razaoSocial' from ids), 'SANTANA, LIMA E OLIVEIRA SOCIEDADE DE ADVOGADOS',
  'PA-07: a rota do .docx da proposta lê o timbrado do dia (Comercial)');
select is((select jsonb_build_array(t ->> 'comTimbrado', t ->> 'oab', t ->> 'cep') from ids, lateral (select portal_proposta_timbrado(socia, sa) t) x),
  '["true", "OAB/BA 4.217", "41820020"]'::jsonb, 'a sócia dona também; a OAB é a de Dados do escritório');
select is((teste.erro($$ select portal_proposta_timbrado(bruna, sa) from ids $$)) -> 'detalhe' ->> 'motivo', 'AREA_NAO_LIBERADA',
  'sem a área Comercial, recusa (AREA_NAO_LIBERADA)');
select is((teste.erro($$ select portal_proposta_timbrado(paula, sa) from ids $$)) -> 'detalhe' ->> 'motivo', 'AREA_NAO_LIBERADA',
  'membro sem área: recusa');

-- 2. Marca e timbrado: o timbrado só para Financeiro, Contratos e a dona.
select ok((select portal_recebimento(bruna, sa) -> 'timbrado' ->> 'razaoSocial' is not null from ids), 'quem tem Financeiro recebe o timbrado');
select ok((select portal_recebimento(socia, sa) -> 'timbrado' ->> 'razaoSocial' is not null from ids), 'a sócia dona recebe o timbrado');
select is((select portal_recebimento(paula, sa) -> 'timbrado' from ids), 'null'::jsonb, 'PT-02: membro sem área (só escritorio.ver) recebe o timbrado nulo');
select is((select portal_recebimento(comercial, sa) -> 'timbrado' from ids), 'null'::jsonb, 'só Comercial: timbrado nulo na prévia');
select ok((select portal_recebimento(diego, sa) -> 'timbrado' ->> 'razaoSocial' is not null from ids), 'quem tem Contratos recebe o timbrado');

-- 3. Sem sociedade: o nome completo e a OAB principal da sócia dona, nunca CPF, RG ou estado civil.
select pg_temp.salvar('{"nome": "Carol Santana Advocacia", "tipo": "SEM_SOCIEDADE", "email": "carolina@santana.adv.br",
  "cep": "41820-020", "logradouro": "Av. Tancredo Neves", "numero": "1.632", "bairro": "Caminho das Árvores", "cidade": "Salvador", "uf": "BA"}');
select is((select portal_proposta_timbrado(comercial, sa) -> 'dona' from ids),
  '{"nome": "Carolina Soares Santana", "dados": {"nomeCompleto": "Carolina Soares Santana"}, "inscricoes": [{"texto": "OAB/BA 63.876-S", "tipo": "PRINCIPAL"}]}'::jsonb,
  'sem sociedade, a proposta baixada pela equipe sai com o nome completo e a OAB da dona');
select ok((select position('52998224725' in t::text) = 0 and position('0987654321' in t::text) = 0 and position('CASADO' in t::text) = 0
             from ids, lateral (select portal_proposta_timbrado(comercial, sa)::text || portal_recebimento(bruna, sa)::text t) x),
  'PT-11: nenhum CPF, RG ou estado civil da sócia dona');

-- 4. O resto não muda.
select is((select array(select jsonb_object_keys(portal_recebimento(paula, sa) - 'timbrado') order by 1) from ids),
  (select array(select jsonb_object_keys(recebimento_sem_timbrado(paula, sa)) order by 1) from ids),
  'o resto de portal_recebimento é o de antes');
select ok((select position('timbrado' in p.prosrc) = 0 from pg_proc p where p.proname = 'portal_proposta'),
  'portal_proposta (a ficha que vai ao navegador) não ganhou o timbrado');

-- 5. PT-01.
select is((teste.erro($$ select portal_proposta_timbrado(intrusa, sa) from ids $$)) ->> 'codigo', 'TC401', 'PT-01: quem não é do escritório é recusado');

select * from finish();
rollback;
