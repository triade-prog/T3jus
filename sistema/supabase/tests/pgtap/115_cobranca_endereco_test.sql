-- Endereço de cobrança na aba Assinatura (F1.21, CO-06, migration 0694): opcional, conferido
-- campo a campo junto com a assinatura, sugerido pela ficha, visto só por quem vê os valores e
-- mandado ao meio de pagamento junto do pagador.
begin;
select plan(13);

create temp table ids as select
  teste.equipe('Carol', 'ADMINISTRACAO') as adm,
  teste.equipe('Marta Quintela', 'FINANCEIRO') as fin,
  teste.equipe('Iago Prates', 'IMPLANTACAO') as imp,
  teste.pessoa('Renata Cedro') as socia;
create temp table c as select console_criar_escritorio(adm, 'Cedro & Lima Advocacia', 'Recife', 'PE') as cedro from ids;
insert into vinculos (pessoa_id, escritorio_id, funcao, criado_por)
  select fin, cedro, 'FINANCEIRO', adm from ids, c union all select imp, cedro, 'IMPLANTACAO', adm from ids, c
  union all select socia, cedro, 'SOCIO', adm from ids, c;
update pessoas set senha_criada_em = now() where id = (select socia from ids);
update escritorios set endereco = 'Rua da Aurora, 300' where id = (select cedro from c);
create temp table pl as select
  (console_plano_salvar(adm, null, null, '{"nome":"Escritório","precoCentavos":49000,"pessoasIncluidas":8}') ->> 'id')::uuid as escritorio from ids;
create function pg_temp.dados(p_end jsonb) returns jsonb language sql as $$
  select jsonb_build_object('planoId', (select escritorio from pl), 'diaVencimento', 10, 'forma', 'BOLETO',
    'emailCobranca', 'financeiro@cedrolima.adv.br', 'cnpjNota', '12345678000195') || case when p_end is null then '{}'::jsonb else jsonb_build_object('endereco', p_end) end $$;
create function pg_temp.versao() returns int language sql as $$ select versao from assinaturas where escritorio_id = (select cedro from c) $$;

-- Sem endereço, a assinatura nasce normalmente.
select console_assinatura_salvar(fin, cedro, null, pg_temp.dados(null)) from ids, c;
select is((select end_cep from assinaturas where escritorio_id = (select cedro from c)), null, 'F1.21: o endereço de cobrança é opcional');

-- A ficha sugere o endereço; quem vê os valores recebe a sugestão.
select is((select console_assinatura(fin, cedro) -> 'enderecoSugerido' ->> 'logradouro' from ids, c), 'Rua da Aurora, 300',
  'a ficha do escritório sugere a rua');
select is((select console_assinatura(fin, cedro) -> 'enderecoSugerido' ->> 'cidade' from ids, c), 'Recife', 'e a cidade');
select is((select console_assinatura(fin, cedro) -> 'assinatura' -> 'enderecoCobranca' from ids, c), 'null'::jsonb, 'sem endereço salvo, vem vazio');

-- Preenchido pela metade: os erros voltam por campo, com os da assinatura juntos.
select is((teste.erro(format($$ select console_assinatura_salvar(%L, %L, %s, %L) $$, (select fin from ids), (select cedro from c), pg_temp.versao(),
  pg_temp.dados('{"cep":"5005000","logradouro":"Rua da Aurora","bairro":"Boa Vista","cidade":"Recife","uf":"PE"}')))) -> 'detalhe' -> 'campos',
  '["cepCobranca", "numeroCobranca"]'::jsonb, 'CEP com 7 números e sem número: os dois campos marcados');
select is((teste.erro(format($$ select console_assinatura_salvar(%L, %L, %s, %L) $$, (select fin from ids), (select cedro from c), pg_temp.versao(),
  pg_temp.dados('{"cep":"5005000"}') || '{"diaVencimento":40}'))) -> 'detalhe' -> 'campos' @> '["diaVencimento", "cepCobranca", "ufCobranca"]'::jsonb,
  true, 'erros da assinatura e do endereço voltam juntos');
select is((teste.erro(format($$ select console_assinatura_salvar(%L, %L, %s, %L) $$, (select fin from ids), (select cedro from c), pg_temp.versao(),
  pg_temp.dados('{"cep":"50050-000","logradouro":"Rua da Aurora","numero":"300","bairro":"Boa Vista","cidade":"Recife","uf":"XX"}')))) -> 'detalhe' -> 'campos',
  '["ufCobranca"]'::jsonb, 'UF fora do Brasil é recusada');

-- Completo: grava, com o CEP só em números e o histórico marcando só que mudou.
select console_assinatura_salvar(fin, cedro, pg_temp.versao(),
  pg_temp.dados('{"cep":"50050-000","logradouro":"Rua da Aurora","numero":"300","complemento":"","bairro":"Boa Vista","cidade":"Recife","uf":"pe"}')) from ids, c;
select is((select end_cep || '|' || end_numero || '|' || end_uf || '|' || coalesce(end_complemento, '-') from assinaturas where escritorio_id = (select cedro from c)),
  '50050000|300|PE|-', 'o endereço completo é salvo');
select is((select count(*)::int from fatura_eventos e join assinaturas a on a.id = e.assinatura_id
   where a.escritorio_id = (select cedro from c) and e.acao = 'assinatura.alterada' and e.dados = '{"enderecoCobranca": true}'::jsonb), 1,
  'o histórico guarda só que o endereço mudou');

-- Tela sem o campo: o endereço fica como está.
select console_assinatura_salvar(fin, cedro, pg_temp.versao(), pg_temp.dados(null)) from ids, c;
select is((select end_cep from assinaturas where escritorio_id = (select cedro from c)), '50050000', 'salvar sem o campo não apaga o endereço');

-- Implantação não vê os valores nem o endereço.
select is((select console_assinatura(imp, cedro) ? 'enderecoSugerido' from ids, c), false, 'a Implantação não vê o endereço');

-- A fila do meio de pagamento leva o endereço junto do pagador.
update configuracoes set valor = '"inter"' where chave = 'meio_pagamento';
select console_mudar_estagio(adm, cedro, (select versao from clientes where escritorio_id = cedro), 'ATIVO', 'Implantação concluída') from ids, c;
select is((select rotina_cobranca_codigos_pendentes(10) -> 0 -> 'pagador' -> 'endereco' ->> 'cep'), '50050000', 'a fila do Inter leva o CEP do pagador');

-- Apagar tudo volta a "sem endereço".
select console_assinatura_salvar(fin, cedro, pg_temp.versao(), pg_temp.dados('{"cep":"","logradouro":"","numero":""}')) from ids, c;
select is((select end_logradouro from assinaturas where escritorio_id = (select cedro from c)), null, 'apagar todos os campos tira o endereço');

select * from finish();
rollback;
