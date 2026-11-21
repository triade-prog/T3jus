-- Carnê de pagamento dos honorários (FI-23): a chave Pix do escritório (só a sócia dona muda),
-- gerar o carnê das parcelas abertas, a vencida sem valor, recusa de parcela paga e de outro
-- contrato, recusa por área, isolamento, o carnê desatualizado quando a parcela ou a chave muda
-- e o histórico (FI-23, PA-01, PT-01, PT-03).
begin;
select plan(32);

select ajustar_relogio(('2026-11-18 12:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Paula Nunes') as paula,
  teste.pessoa('Jurídico Só') as juri,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, diego, 'Diego Almeida', array['FINANCEIRO']),
       portal_convidar(socia, rm, paula, 'Paula Nunes', array['CONTRATOS']),
       portal_convidar(socia, rm, juri, 'Jurídico Só', array['JURIDICO']) from ids;

create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Hélio Batista Corrêa', 'origem', 'GOOGLE', 'documento', '52998224725',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Hélio Batista Corrêa', 'telefone', '+5511996027736', 'principal', true)))) ->> 'id')::uuid hel
  from ids;

-- Seis parcelas de R$ 850,00 a partir de 25/11.
create temp table ct as select
  (portal_contrato_criar(socia, rm, jsonb_build_object('clienteId', cli.hel, 'objeto', 'Ação revisional',
     'responsavelId', ids.diego, 'advogados', jsonb_build_array(ids.socia),
     'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'PARCELADO', 'total', 510000, 'parcelas', 6, 'primeiro', '2026-11-25')))) ->> 'id')::uuid hel,
  (portal_contrato_criar(socia, rm, jsonb_build_object('clienteId', cli.hel, 'objeto', 'Inventário',
     'responsavelId', ids.socia, 'advogados', jsonb_build_array(ids.socia),
     'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'PARCELADO', 'total', 100000, 'parcelas', 2, 'primeiro', '2026-12-10')))) ->> 'id')::uuid inv
  from ids, cli;
select portal_contrato_assinatura(socia, rm, ct.hel, 1, '2026-11-18'), portal_contrato_assinatura(socia, rm, ct.inv, 1, '2026-11-18') from ids, ct;

create temp table ps as select id, row_number() over (order by vencimento) n from recebimentos_previstos, ct where contrato_id = ct.hel;
create temp table outra as select id from recebimentos_previstos, ct where contrato_id = ct.inv order by vencimento limit 1;
-- O tempo passa: a primeira foi paga; a segunda (25/12) está vencida.
select ajustar_relogio(('2027-01-05 12:00-03'::timestamptz - now()));
select portal_financeiro_receber_registrar(diego, rm, ps.id, jsonb_build_object('valor', 85000, 'recebidoEm', '2026-11-25', 'forma', 'PIX'))
  from ids, ps where n = 1;

-- Escritório › Recebimento.
select is((select portal_recebimento(diego, rm) ->> 'pixChave' from ids), null, 'FI-23: sem chave cadastrada');
select is((select (portal_recebimento(diego, rm) ->> 'dono')::boolean from ids), false, 'FI-23: Diego não é o dono');
select is((select portal_recebimento(diego, rm) -> 'socioDono' ->> 'nome' from ids), 'Marina Ribeiro', 'FI-23: diz quem cadastra a chave');
select is((teste.erro($$ select portal_recebimento_salvar(diego, rm, '{"versao": 0, "pixTipo": "CNPJ", "pixChave": "11222333000181", "recebedor": "RIBEIRO E MATOS", "cidade": "SAO PAULO"}') from ids $$)) -> 'detalhe' ->> 'motivo',
  'SO_SOCIO_DONO', 'FI-23: só a sócia dona salva a chave Pix');
select is((teste.erro($$ select portal_recebimento_salvar(socia, rm, '{"versao": 0, "pixTipo": "CNPJ", "pixChave": "11222333000180", "recebedor": "Ribeiro & Matos Sociedade de Advogados", "cidade": ""}') from ids $$)) -> 'detalhe' -> 'campos',
  '["pixChave", "recebedor", "cidade"]'::jsonb, 'FI-23: CNPJ com dígito errado, recebedor fora do padrão do Pix e cidade vazia');
select is((select portal_recebimento_salvar(socia, rm, '{"versao": 0, "pixTipo": "CNPJ", "pixChave": "11222333000181", "recebedor": "RIBEIRO E MATOS SOC ADV", "cidade": "SAO PAULO", "instrucoes": "Transferência para o Banco X, agência 1, conta 2."}') ->> 'versao' from ids),
  '1', 'FI-23: a sócia dona cadastra a chave');
select is((teste.erro($$ select portal_recebimento_salvar(socia, rm, '{"versao": 0, "pixTipo": "EMAIL", "pixChave": "a@b.com", "recebedor": "X", "cidade": "Y"}') from ids $$)) ->> 'codigo',
  'TC409', 'PT-19: salvar com a versão velha dá conflito');

-- Área e isolamento.
select is((teste.erro($$ select portal_carne_opcoes(juri, rm, ct.hel, 'FINANCEIRO') from ids, ct $$)) -> 'detalhe' ->> 'motivo', 'AREA_NAO_LIBERADA',
  'PA-01: sem a área Financeiro, o carnê pelo Financeiro é recusado');
select is((teste.erro($$ select portal_carne_opcoes(diego, rm, ct.hel, 'CONTRATOS') from ids, ct $$)) -> 'detalhe' ->> 'motivo', 'AREA_NAO_LIBERADA',
  'PA-01: Diego não tem a área Contratos');
select is((select jsonb_array_length(portal_carne_opcoes(paula, rm, ct.hel, 'CONTRATOS') -> 'parcelas') from ids, ct), 6,
  'FI-23: pela área Contratos, Paula vê as 6 parcelas');
select is((teste.erro($$ select portal_carne_opcoes(intrusa, outro, ct.hel, 'FINANCEIRO') from ids, ct $$)) ->> 'codigo', 'TC404',
  'PT-01: contrato de outro escritório não é encontrado');

-- As opções da janela.
create temp table op as select portal_carne_opcoes(diego, rm, ct.hel, 'FINANCEIRO') o from ids, ct;
select is((select o -> 'parcelas' -> 0 ->> 'situacao' from op), 'PAGA', 'FI-23: a primeira está paga');
select is((select o -> 'parcelas' -> 1 ->> 'situacao' from op), 'VENCIDA', 'FI-23: a segunda está vencida');
select is((select (o -> 'parcelas' -> 3 ->> 'ordem') || ' de ' || (o -> 'parcelas' -> 3 ->> 'total') from op), '4 de 6', 'FI-23: a ordem da parcela no contrato');
select is((select o -> 'recebimento' ->> 'pixChave' from op), '11222333000181', 'FI-23: a janela mostra a chave em uso');

-- Gerar.
select is((teste.erro($$ select portal_carne_gerar(diego, rm, ct.hel, jsonb_build_object('area', 'FINANCEIRO', 'parcelas', jsonb_build_array(ps.id))) from ids, ct, ps where n = 1 $$)) -> 'detalhe' ->> 'motivo',
  'PARCELA_PAGA', 'FI-23: parcela paga não entra no carnê');
select is((teste.erro($$ select portal_carne_gerar(diego, rm, ct.hel, jsonb_build_object('area', 'FINANCEIRO', 'parcelas', jsonb_build_array(outra.id))) from ids, ct, outra $$)) ->> 'codigo',
  'TC404', 'FI-23: parcela de outro contrato não entra');
select is((teste.erro($$ select portal_carne_gerar(diego, rm, ct.hel, '{"area": "FINANCEIRO", "parcelas": []}') from ids, ct $$)) -> 'detalhe' ->> 'motivo',
  'SEM_PARCELAS', 'FI-23: carnê sem parcela é recusado');
select is((teste.erro($$ select portal_carne_gerar(juri, rm, ct.hel, jsonb_build_object('area', 'FINANCEIRO', 'parcelas', jsonb_build_array(ps.id))) from ids, ct, ps where n = 4 $$)) -> 'detalhe' ->> 'motivo',
  'AREA_NAO_LIBERADA', 'PA-01: sem a área, não gera');

create temp table g as select (portal_carne_gerar(diego, rm, ct.hel, jsonb_build_object('area', 'FINANCEIRO',
  'parcelas', (select jsonb_agg(id) from ps where n >= 2)) ) ->> 'id')::uuid id from ids, ct;
create temp table cn as select portal_carne(diego, rm, g.id, 'FINANCEIRO') c from ids, g;
select is((select jsonb_array_length(c -> 'parcelas') from cn), 5, 'FI-23: o carnê leva as 5 parcelas abertas');
select is((select (c -> 'parcelas' -> 0 ->> 'semValor')::boolean from cn), true, 'FI-23: a vencida sai com o Pix sem valor');
select is((select (c -> 'parcelas' -> 1 ->> 'semValor')::boolean from cn), false, 'FI-23: a que vai vencer leva o valor');
select is((select c -> 'parcelas' -> 2 ->> 'txid' from cn), 'C' || regexp_replace((select numero from contratos, ct where contratos.id = ct.hel), '[^0-9]', '', 'g') || 'P04',
  'FI-23: o identificador é o contrato e a ordem da parcela');
select is((select c -> 'pix' ->> 'recebedor' from cn), 'RIBEIRO E MATOS SOC ADV', 'FI-23: o carnê guarda a chave usada');
select is((select c -> 'cliente' ->> 'documento' from cn), '52998224725', 'FI-23: o documento vai para a API, que mostra só a metade');
select is((select forma from recebimentos_previstos, ps where recebimentos_previstos.id = ps.id and n = 4), null, 'FI-23: gerar o carnê não muda a forma da parcela (pergunta 6)');
select is((teste.erro($$ select portal_carne(intrusa, outro, g.id, 'FINANCEIRO') from ids, g $$)) ->> 'codigo', 'TC404', 'PT-01: carnê de outro escritório não é encontrado');
select is((select count(*)::int from historico, g where acao = 'financeiro.carne_gerado' and entidade_id = g.id::text), 1, 'PT-03: gerar o carnê vai para o histórico');

-- Desatualizado: a chave muda.
select is((select portal_recebimento_salvar(socia, rm, '{"versao": 1, "pixTipo": "EMAIL", "pixChave": "financeiro@ribeiromatos.adv.br", "recebedor": "RIBEIRO E MATOS SOC ADV", "cidade": "SAO PAULO"}') ->> 'desatualizados' from ids),
  '1', 'FI-23: trocar a chave diz quantos carnês ficam desatualizados');
select is((select portal_carne_opcoes(diego, rm, ct.hel, 'FINANCEIRO') -> 'carnes' -> 0 -> 'mudancas' -> 0 ->> 'tipo' from ids, ct), 'CHAVE_PIX',
  'FI-23: o carnê aparece desatualizado pela chave');
select is((teste.erro($$ update carnes set com_capa = false $$)) ->> 'codigo', 'TC023', 'FI-23: o carnê não se muda: gera-se outro');

-- Desatualizado: a parcela muda (renegociação cancela as que faltam).
select contrato_cancelar_futuros(rm, ct.hel, '2027-04-01', 'Renegociado com o cliente') from ids, ct;
select is((select jsonb_agg(m ->> 'tipo' order by m ->> 'tipo') from ids, ct, jsonb_array_elements(portal_carne_opcoes(diego, rm, ct.hel, 'FINANCEIRO') -> 'carnes' -> 0 -> 'mudancas') m),
  '["CANCELADA", "CHAVE_PIX"]'::jsonb, 'FI-23: a parcela cancelada (abril) aparece no carnê desatualizado');

select * from finish();
rollback;
