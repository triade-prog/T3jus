-- Razão social e contatos do escritório no carnê e no recibo (F3.133; PA-07, FI-23, FI-14, migration
-- 0890): o carnê e a cópia do recibo guardam o timbrado do dia (PT-03); sociedade, sociedade
-- individual e sem sociedade; razão social vazia, igual ao nome curto e com 150 letras; sem
-- telefone e e-mail vai o primeiro contato; sem sociedade só o nome completo e a OAB da sócia dona
-- (nunca CPF, RG, estado civil ou nacionalidade); carnês e recibos antigos ficam como eram;
-- a prévia do carnê traz o timbrado de hoje; isolamento (PT-01).
begin;
select plan(32);

select ajustar_relogio(('2026-11-22 10:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Carol Santana') as socia,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Santana Advocacia') as sa,
  teste.escritorio('Outro Escritório') as outro,
  teste.escritorio('Sem Dona Advocacia') as semdona;
select teste.vincular(socia, sa, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, sa, diego, 'Diego Almeida', array['FINANCEIRO', 'CONTRATOS']) from ids;
select portal_oab_incluir(socia, sa, socia, '{"uf": "BA", "numero": "63876", "letra": "S", "tipo": "PRINCIPAL"}') from ids;
select portal_oab_incluir(socia, sa, socia, '{"uf": "SE", "numero": "1020", "tipo": "SUPLEMENTAR"}') from ids;
-- Os dados pessoais da sócia dona, com CPF, RG, estado civil e nacionalidade: nada disso vai para o papel.
select portal_conta_dados_salvar(socia, sa, 0, '{"nomeCompleto": "Carolina Soares Santana", "tratamento": "ADVOGADA", "cpf": "52998224725",
  "rg": "0987654321", "rgOrgao": "SSP/BA", "estadoCivil": "CASADO", "nacionalidade": "brasileira"}') from ids;
insert into whatsapp_escritorio (escritorio_id, numero, situacao, ligado_em) select sa, '+5571991874402', 'LIGADO', now() from ids;

create function pg_temp.salvar(p jsonb) returns void language sql as $$
  select null from (select portal_escritorio_dados_salvar(socia, sa, (select versao from escritorios where id = sa), p) from ids) x
$$;
create function pg_temp.sede() returns jsonb language sql as $$
  select '{"cep": "41820-020", "logradouro": "Av. Tancredo Neves", "numero": "1.632", "complemento": "sala 1.208",
           "bairro": "Caminho das Árvores", "cidade": "Salvador", "uf": "BA"}'::jsonb
$$;
create temp table cli as select
  (portal_cliente_cadastrar(socia, sa, jsonb_build_object('tipo', 'PF', 'nome', 'Hélio Batista Corrêa', 'origem', 'GOOGLE', 'documento', '31848261713',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Hélio Batista Corrêa', 'telefone', '+5571996027736', 'principal', true)))) ->> 'id')::uuid hel
  from ids;
create temp table ct as select
  (portal_contrato_criar(socia, sa, jsonb_build_object('clienteId', cli.hel, 'objeto', 'Ação revisional', 'responsavelId', ids.diego,
     'advogados', jsonb_build_array(ids.socia),
     'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'PARCELADO', 'total', 510000, 'parcelas', 6, 'primeiro', '2026-11-25')))) ->> 'id')::uuid id
  from ids, cli;
select portal_contrato_assinatura(socia, sa, ct.id, 1, '2026-11-22') from ids, ct;
create function pg_temp.gerar() returns uuid language sql as $$
  select (portal_carne_gerar(diego, sa, ct.id, jsonb_build_object('area', 'FINANCEIRO',
    'parcelas', (select jsonb_agg(r.id order by r.vencimento) from recebimentos_previstos r where r.contrato_id = ct.id and r.vencimento >= '2027-01-01'))) ->> 'id')::uuid
    from ids, ct
$$;
create function pg_temp.tim(k uuid) returns jsonb language sql as $$
  select portal_carne(diego, sa, k, 'FINANCEIRO') -> 'escritorio' from ids
$$;


-- 1. Sociedade completa.
select pg_temp.salvar(jsonb_build_object('nome', 'Santana Advocacia', 'tipo', 'SOCIEDADE', 'razaoSocial', 'SANTANA, LIMA E OLIVEIRA SOCIEDADE DE ADVOGADOS',
  'cnpj', '47.318.552/0001-06', 'oabUf', 'BA', 'oabNumero', '4217', 'telefone', '(71) 3352-4180', 'email', 'contato@santana.adv.br', 'site', 'santana.adv.br')
  || pg_temp.sede());
create temp table k1 as select pg_temp.gerar() id;
select is((select timbrado ->> 'comTimbrado' from carnes, k1 where carnes.id = k1.id), 'true', 'PA-07: o carnê novo guarda o timbrado do dia');
select is((select jsonb_build_array(t ->> 'razaoSocial', t ->> 'cnpj', t ->> 'oab') from k1, lateral (select pg_temp.tim(k1.id) t) x),
  '["SANTANA, LIMA E OLIVEIRA SOCIEDADE DE ADVOGADOS", "47318552000106", "OAB/BA 4.217"]'::jsonb, 'portal_carne traz a razão social, o CNPJ e a OAB da cópia');
select is((select jsonb_build_array(t ->> 'cep', t ->> 'endereco', t ->> 'telefone', t ->> 'email', t ->> 'site', t ->> 'whatsapp') from k1, lateral (select pg_temp.tim(k1.id) t) x),
  '["41820020", "Av. Tancredo Neves, 1.632, sala 1.208, Caminho das Árvores", "7133524180", "contato@santana.adv.br", "santana.adv.br", "+5571991874402"]'::jsonb,
  'a sede com CEP, o telefone, o e-mail, o site e o WhatsApp');
select is((select pg_temp.tim(k1.id) -> 'dona' from k1), 'null'::jsonb, 'com sociedade, a sócia dona não vai para o papel');
select is((select pg_temp.tim(k1.id) -> 'contatos' from k1), '[]'::jsonb, 'com telefone e e-mail do escritório, nenhum contato');
select ok((select not (t ? 'oabUf' or t ? 'oabNumero') and t ? 'nome' and t ? 'cidade' and t ? 'uf' from k1, lateral (select pg_temp.tim(k1.id) t) x),
  'só o que vai para o papel, com os campos que o carnê já lia');

-- 2. O gatilho sobrescreve o timbrado que vier no insert.
create temp table kf as with n as (
  insert into carnes (escritorio_id, contrato_id, formato, com_capa, gerado_por, timbrado)
  select escritorio_id, contrato_id, formato, com_capa, gerado_por, '{"razaoSocial": "Forjada Ltda", "comTimbrado": true}'::jsonb from carnes where id = (select id from k1)
  returning id, timbrado) select * from n;
select is((select timbrado ->> 'razaoSocial' from kf), 'SANTANA, LIMA E OLIVEIRA SOCIEDADE DE ADVOGADOS', 'o timbrado forjado no insert é trocado pelo do dia');

-- 3. PT-03: mudar a razão social, o telefone, a sede e o WhatsApp não muda o carnê já gerado.
select pg_temp.salvar(jsonb_build_object('nome', 'Santana Advocacia', 'tipo', 'SOCIEDADE', 'razaoSocial', 'SANTANA E LIMA SOCIEDADE DE ADVOGADOS',
  'cnpj', '47.318.552/0001-06', 'oabUf', 'BA', 'oabNumero', '4217', 'telefone', '(71) 3000-1111', 'email', 'contato@santana.adv.br',
  'cep', '40015-970', 'logradouro', 'Rua Chile', 'numero', '10', 'bairro', 'Centro', 'cidade', 'Salvador', 'uf', 'BA'));
update whatsapp_escritorio set numero = '+5571999990000' where escritorio_id = (select sa from ids);
select is((select jsonb_build_array(t ->> 'razaoSocial', t ->> 'telefone', t ->> 'cep', t ->> 'whatsapp') from k1, lateral (select pg_temp.tim(k1.id) t) x),
  '["SANTANA, LIMA E OLIVEIRA SOCIEDADE DE ADVOGADOS", "7133524180", "41820020", "+5571991874402"]'::jsonb,
  'PT-03: o carnê já gerado fica com a razão social, o telefone, a sede e o WhatsApp do dia em que saiu');
create temp table k2 as select pg_temp.gerar() id;
select is((select jsonb_build_array(t ->> 'razaoSocial', t ->> 'telefone', t ->> 'cep', t ->> 'whatsapp') from k2, lateral (select pg_temp.tim(k2.id) t) x),
  '["SANTANA E LIMA SOCIEDADE DE ADVOGADOS", "7130001111", "40015970", "+5571999990000"]'::jsonb, 'o carnê novo sai com os dados novos');

-- 4. Sociedade individual.
select pg_temp.salvar(jsonb_build_object('nome', 'Santana Advocacia', 'tipo', 'SOCIEDADE_INDIVIDUAL', 'razaoSocial', 'Carolina Santana Sociedade Individual de Advocacia',
  'cnpj', '47.318.552/0001-06', 'telefone', '(71) 3352-4180') || pg_temp.sede());
create temp table k3 as select pg_temp.gerar() id;
select is((select jsonb_build_array(t ->> 'tipo', t ->> 'razaoSocial', t ->> 'cnpj', t ->> 'oab') from k3, lateral (select pg_temp.tim(k3.id) t) x),
  '["SOCIEDADE_INDIVIDUAL", "Carolina Santana Sociedade Individual de Advocacia", "47318552000106", null]'::jsonb, 'sociedade individual: razão social e CNPJ');

-- 5. Razão social vazia e sem telefone e e-mail do escritório: o primeiro contato que tem um deles.
update escritorios set contatos = '[{"nome": "Carol", "papel": "Sócia", "telefone": "+5571988771020", "email": "carol@santana.adv.br"},
  {"nome": "Diego", "papel": "Financeiro", "email": "diego@santana.adv.br"}]'::jsonb where id = (select sa from ids);
select pg_temp.salvar(jsonb_build_object('nome', 'Santana Advocacia', 'tipo', 'SOCIEDADE', 'cnpj', '47.318.552/0001-06') || pg_temp.sede());
create temp table k4 as select pg_temp.gerar() id;
select is((select jsonb_build_array(t -> 'razaoSocial', t -> 'oab', t ->> 'cnpj', t ->> 'nome') from k4, lateral (select pg_temp.tim(k4.id) t) x),
  '[null, null, "47318552000106", "Santana Advocacia"]'::jsonb, 'razão social vazia: fica nula, sem marca de falta, e o resto vai');
select is((select pg_temp.tim(k4.id) -> 'contatos' from k4), '[{"telefone": "+5571988771020", "email": "carol@santana.adv.br"}]'::jsonb,
  'decisão 9: sem telefone e e-mail do escritório, só o primeiro contato, sem nome e papel');

-- 6. Razão social igual ao nome curto, e com 150 letras: guardadas como estão.
select pg_temp.salvar(jsonb_build_object('nome', 'Santana Advocacia', 'tipo', 'SOCIEDADE', 'razaoSocial', 'SANTANA ADVOCACIA', 'cnpj', '47.318.552/0001-06') || pg_temp.sede());
select is((select escritorio_timbrado_json(sa) ->> 'razaoSocial' from ids), 'SANTANA ADVOCACIA', 'a razão social igual ao nome curto fica guardada (a tela não repete)');
select pg_temp.salvar(jsonb_build_object('nome', 'Santana Advocacia', 'tipo', 'SOCIEDADE', 'cnpj', '47.318.552/0001-06',
  'razaoSocial', 'SANTANA, LIMA, OLIVEIRA, ALBUQUERQUE CAVALCANTI, VASCONCELOS FIGUEIREDO, MENEZES, ANDRADE, QUEIROZ MONTEIRO E BITTENCOURT PRADO SOCIEDADE DE ADVOGADOS')
  || pg_temp.sede());
create temp table kl as select pg_temp.gerar() id;
select is((select length(pg_temp.tim(kl.id) ->> 'razaoSocial') from kl), 150, 'decisão 13: a razão social de 150 letras vai inteira');

-- 7. Sem sociedade: só o nome completo e a OAB principal da sócia dona.
select pg_temp.salvar(jsonb_build_object('nome', 'Carol Santana Advocacia', 'tipo', 'SEM_SOCIEDADE', 'email', 'carolina@santana.adv.br') || pg_temp.sede());
create temp table k5 as select pg_temp.gerar() id;
select is((select jsonb_build_array(t -> 'razaoSocial', t -> 'cnpj', t -> 'oab') from k5, lateral (select pg_temp.tim(k5.id) t) x),
  '[null, null, null]'::jsonb, 'sem sociedade: sem razão social, CNPJ e OAB da sociedade');
select is((select pg_temp.tim(k5.id) -> 'dona' from k5),
  '{"nome": "Carolina Soares Santana", "dados": {"nomeCompleto": "Carolina Soares Santana"}, "inscricoes": [{"texto": "OAB/BA 63.876-S", "tipo": "PRINCIPAL"}]}'::jsonb,
  'sem sociedade: o nome completo e só a OAB principal da sócia dona');
select ok((select not (jsonb_path_exists(t, 'strict $.**.cpf') or jsonb_path_exists(t, 'strict $.**.rg') or jsonb_path_exists(t, 'strict $.**.rgOrgao')
                    or jsonb_path_exists(t, 'strict $.**.estadoCivil') or jsonb_path_exists(t, 'strict $.**.nacionalidade') or jsonb_path_exists(t, 'strict $.**.tratamento'))
                and position('52998224725' in t::text) = 0 and position('0987654321' in t::text) = 0
             from carnes, k5, lateral (select carnes.timbrado t) x where carnes.id = k5.id),
  'PT-11: nenhum CPF, RG, estado civil ou nacionalidade da sócia dona no carnê');

-- 8. A prévia do carnê traz o timbrado de hoje, com as mesmas chaves da sócia dona.
select is((select portal_carne_opcoes(diego, sa, ct.id, 'CONTRATOS') -> 'timbrado' -> 'dona' from ids, ct),
  '{"nome": "Carolina Soares Santana", "dados": {"nomeCompleto": "Carolina Soares Santana"}, "inscricoes": [{"texto": "OAB/BA 63.876-S", "tipo": "PRINCIPAL"}]}'::jsonb,
  'D-e: a prévia (Contratos) traz o timbrado de hoje, sem sociedade só o nome e a OAB da dona');
select is((select portal_carne_opcoes(diego, sa, ct.id, 'FINANCEIRO') -> 'timbrado' ->> 'whatsapp' from ids, ct), '+5571999990000',
  'a prévia mostra o WhatsApp que vai sair no carnê');
select ok((select o ? 'parcelas' and o ? 'chavePedida' from ids, ct, lateral (select portal_carne_opcoes(diego, sa, ct.id, 'FINANCEIRO') o) x),
  'a prévia continua com as parcelas e o pedido da chave');

-- 9. Sem sociedade e sem sócia dona: sem dona no papel (a tela usa o nome curto).
update escritorios set tipo = 'SEM_SOCIEDADE' where id = (select semdona from ids);
select is((select escritorio_timbrado_json(semdona) -> 'dona' from ids), 'null'::jsonb, 'sem sociedade e sem sócia dona: sem dona no papel');

-- 10. Carnê antigo (sem a cópia): continua com o escritório de hoje e o desenho de antes.
alter table carnes disable trigger carnes_timbrado_do_dia;
create temp table k0 as select pg_temp.gerar() id;
alter table carnes enable trigger carnes_timbrado_do_dia;
select is((select jsonb_build_array(t -> 'comTimbrado', t ->> 'nome', t ? 'razaoSocial') from k0, lateral (select pg_temp.tim(k0.id) t) x),
  '[null, "Carol Santana Advocacia", false]'::jsonb, 'carnê antigo: sem o timbrado, lido como antes');

-- 11. O recibo novo guarda o timbrado do dia.
create temp table parc as select r.id, row_number() over (order by r.vencimento) n from recebimentos_previstos r, ct where r.contrato_id = ct.id;
select pg_temp.salvar(jsonb_build_object('nome', 'Santana Advocacia', 'tipo', 'SOCIEDADE', 'razaoSocial', 'SANTANA, LIMA E OLIVEIRA SOCIEDADE DE ADVOGADOS',
  'cnpj', '47.318.552/0001-06', 'oabUf', 'BA', 'oabNumero', '4217', 'telefone', '(71) 3352-4180', 'email', 'contato@santana.adv.br', 'site', 'santana.adv.br')
  || pg_temp.sede());
create temp table pg1 as select (portal_financeiro_receber_registrar_recibo(diego, sa, parc.id,
  jsonb_build_object('valor', 85000, 'recebidoEm', '2026-11-22', 'forma', 'PIX', 'recibo', true)) ->> 'id')::uuid id from ids, parc where parc.n = 1;
select is((select c.dados -> 'escritorio' ->> 'comTimbrado' from recibo_copias c join recibos b on b.id = c.recibo_id, pg1 where b.pagamento_id = pg1.id), 'true',
  'FI-14: a cópia do recibo novo guarda o timbrado do dia');
select is((select jsonb_build_array(e ->> 'razaoSocial', e ->> 'oab', e ->> 'site', e ->> 'whatsapp') from ids, pg1, lateral (select portal_recibo(diego, sa, pg1.id) -> 'escritorio' e) x),
  '["SANTANA, LIMA E OLIVEIRA SOCIEDADE DE ADVOGADOS", "OAB/BA 4.217", "santana.adv.br", "+5571999990000"]'::jsonb, 'portal_recibo traz o timbrado com o site e o WhatsApp');
select ok((select r ? 'numero' and r ? 'cliente' and r ? 'registradoPor' and r ? 'marca' and r ? 'reembolsos' from ids, pg1, lateral (select portal_recibo(diego, sa, pg1.id) r) x),
  'o resto do recibo continua como montado');

-- 12. PT-03: mudar a razão social não muda o recibo já emitido.
select pg_temp.salvar(jsonb_build_object('nome', 'Santana Advocacia', 'tipo', 'SOCIEDADE', 'razaoSocial', 'SANTANA E LIMA SOCIEDADE DE ADVOGADOS',
  'cnpj', '47.318.552/0001-06', 'telefone', '(71) 3352-4180') || pg_temp.sede());
select is((select portal_recibo(diego, sa, pg1.id) -> 'escritorio' ->> 'razaoSocial' from ids, pg1), 'SANTANA, LIMA E OLIVEIRA SOCIEDADE DE ADVOGADOS',
  'PT-03: o recibo já emitido fica com a razão social do dia');
select is((select recibo_dados(sa, b.id) -> 'escritorio' ->> 'razaoSocial' from ids, pg1, recibos b where b.pagamento_id = pg1.id),
  'SANTANA, LIMA E OLIVEIRA SOCIEDADE DE ADVOGADOS', 'recibo_dados (o PDF do servidor) lê a mesma cópia');

-- 13. Recibos antigos: sem cópia, montado ao vivo como na 0533; cópia antiga, como foi guardada.
create temp table pg2 as select (portal_financeiro_receber_registrar(diego, sa, parc.id,
  jsonb_build_object('valor', 85000, 'recebidoEm', '2026-11-22', 'forma', 'PIX', 'recibo', true)) ->> 'id')::uuid id from ids, parc where parc.n = 2;
select is((select jsonb_build_array(e -> 'comTimbrado', e ->> 'nome', e ? 'contatos') from ids, pg2, lateral (select portal_recibo(diego, sa, pg2.id) -> 'escritorio' e) x),
  '[null, "Santana Advocacia", true]'::jsonb, 'recibo antigo sem cópia: montado com os dados de hoje, no desenho de antes');
alter table recibo_copias disable trigger recibo_copias_timbrado_do_dia;
create temp table pg3 as select (portal_financeiro_receber_registrar_recibo(diego, sa, parc.id,
  jsonb_build_object('valor', 85000, 'recebidoEm', '2026-11-22', 'forma', 'PIX', 'recibo', true)) ->> 'id')::uuid id from ids, parc where parc.n = 3;
alter table recibo_copias enable trigger recibo_copias_timbrado_do_dia;
select is((select portal_recibo(diego, sa, pg3.id) -> 'escritorio' from ids, pg3),
  (select c.dados -> 'escritorio' from recibo_copias c join recibos b on b.id = c.recibo_id, pg3 where b.pagamento_id = pg3.id),
  'cópia antiga, sem comTimbrado: devolvida como foi guardada');

-- 14. PT-01 e o acesso.
select is((teste.erro($$ select portal_carne(intrusa, outro, k1.id, 'FINANCEIRO') from ids, k1 $$)) ->> 'codigo', 'TC404', 'PT-01: o carnê de outro escritório não abre');
select is((teste.erro($$ select portal_carne(intrusa, sa, k1.id, 'FINANCEIRO') from ids, k1 $$)) ->> 'codigo', 'TC401', 'PT-01: quem não é do escritório é recusado');
select ok(not has_function_privilege('service_role', 'escritorio_timbrado_json(uuid)', 'execute')
          and not has_function_privilege('service_role', 'carne_timbrado_do_dia()', 'execute'),
  'o timbrado só se lê dentro das funções do Portal');

select * from finish();
rollback;
