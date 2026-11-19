-- Contratos do Portal: criar da proposta aceita (a proposta vira contrato), advogados,
-- assinatura que gera a programação dos recebimentos, mudar condição com motivo, encerrar,
-- base do mês do percentual recorrente, Funil e Origem com contratos, recusa por área e a
-- passagem de quem sai (CH-01 a CH-04, CH-06, IN-01, AP-03, AP-04, EX-10, PA-01, PT-01, PT-19).
begin;
select plan(34);

select ajustar_relogio(('2026-11-18 12:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Paula Nunes') as paula,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, diego, 'Diego Almeida', array['COMERCIAL']),
       portal_convidar(socia, rm, paula, 'Paula Nunes', array['CONTRATOS']) from ids;

create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Benedito Souza Lima', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Benedito Souza Lima', 'telefone', '+5511996027736', 'principal', true)))) ->> 'id')::uuid ben,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PJ', 'nome', 'Padaria Estrela Ltda', 'origem', 'INDICACAO_CLIENTE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Jorge Estrela', 'telefone', '+5511996027738', 'principal', true)))) ->> 'id')::uuid pad
  from ids;

create temp table cond as select
  jsonb_build_array(
    jsonb_build_object('tipo', 'PARCELADO', 'total', 200000, 'parcelas', 3, 'primeiro', '2026-12-10'),
    jsonb_build_object('tipo', 'EXITO', 'percentual', 3000, 'sobre', 'Atrasados que o cliente receber', 'etapa', 'Pagamento da RPV ou precatório', 'dias', 15),
    jsonb_build_object('tipo', 'RECORRENTE', 'percentual', 3000, 'sobre', 'Benefício mensal do cliente',
                       'primeiro', '2026-12-10', 'dia', 10, 'meses', 3, 'diaLembrete', 5)) ben,
  jsonb_build_array(jsonb_build_object('tipo', 'MENSAL', 'valor', 150000, 'primeiro', '2027-01-05', 'meses', 6)) pad;

-- Proposta do Benedito aceita, feita por quem só tem Comercial.
create temp table pb as select (portal_proposta_criar(diego, rm, jsonb_build_object('clienteId', cli.ben, 'servico', 'Aposentadoria por idade',
  'escopo', 'Pedido no INSS e ação na Justiça Federal.', 'responsavelId', diego, 'condicoes', cond.ben,
  'retorno', jsonb_build_object('em', '2026-11-20', 'responsavelId', diego))) ->> 'id')::uuid id from ids, cli, cond;
select portal_proposta_enviada(diego, rm, pb.id, 1) from ids, pb;
select portal_proposta_resposta(diego, rm, pb.id, 2, jsonb_build_object('resposta', 'ACEITOU', 'em', '2026-11-18', 'canal', 'PRESENCIAL')) from ids, pb;

-- Área Contratos.
select is((teste.erro($$ select portal_contratos(diego, rm) from ids $$)) -> 'detalhe' ->> 'motivo', 'AREA_NAO_LIBERADA',
  'PA-01: sem a área Contratos, a lista é recusada');
select is((teste.erro($$ select portal_contrato_criar(diego, rm, '{}'::jsonb) from ids $$)) -> 'detalhe' ->> 'motivo', 'AREA_NAO_LIBERADA',
  'PA-01: sem a área Contratos, não cria contrato');

-- O que vem da proposta para o formulário (IN-01).
select is((select portal_contrato_da_proposta(paula, rm, pb.id) -> 'condicoes' from ids, pb), (select honorario_lista(rm, 'PROPOSTA', pb.id) from ids, pb),
  'IN-01: o formulário recebe as condições da proposta sem redigitar');

-- Erros presos ao campo.
select is((teste.erro($$ select portal_contrato_criar(paula, rm, jsonb_build_object('clienteId', cli.ben, 'objeto', 'A',
  'responsavelId', ids.paula, 'advogados', '[]'::jsonb,
  'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'FIXO', 'valor', 100, 'vencimento', '2026-11-10')))) from ids, cli $$))
  -> 'detalhe' -> 'campos', '["advogados", "c1.vencimento", "objeto"]'::jsonb,
  'CH-03, CH-06: sem advogado, objeto curto e data já passada');
select is((teste.erro($$ select portal_contrato_criar(intrusa, outro, jsonb_build_object('clienteId', cli.ben, 'objeto', 'Aposentadoria',
  'responsavelId', ids.intrusa, 'advogados', jsonb_build_array(ids.intrusa), 'condicoes', cond.pad)) from ids, cli, cond $$))
  -> 'detalhe' -> 'campos', '["clienteId"]'::jsonb, 'PT-01: cliente de outro escritório é recusado');
select is((teste.erro($$ select portal_contrato_criar(paula, rm, jsonb_build_object('clienteId', cli.pad, 'objeto', 'Aposentadoria',
  'responsavelId', ids.paula, 'advogados', jsonb_build_array(ids.socia), 'condicoes', cond.pad, 'propostaId', pb.id)) from ids, cli, cond, pb $$))
  -> 'detalhe' -> 'campos', '["clienteId"]'::jsonb, 'a proposta tem de ser do mesmo cliente');

-- Criar da proposta.
create temp table cb as select (portal_contrato_criar(paula, rm, jsonb_build_object('clienteId', cli.ben, 'objeto', ' Aposentadoria por idade ',
  'responsavelId', ids.socia, 'advogados', jsonb_build_array(ids.socia, ids.paula), 'condicoes', cond.ben, 'propostaId', pb.id)) ->> 'id')::uuid id
  from ids, cli, cond, pb;
select is((select numero || '|' || estado || '|' || objeto from contratos, cb where contratos.id = cb.id), 'C-2026-001|ELABORACAO|Aposentadoria por idade',
  'CH-01: contrato nasce em elaboração, com número por escritório e ano');
select is((select estado from propostas, pb where propostas.id = pb.id), 'CONTRATO', 'IN-01: a proposta aceita vira contrato');
select is((teste.erro($$ select portal_contrato_criar(paula, rm, jsonb_build_object('clienteId', cli.ben, 'objeto', 'Outro',
  'responsavelId', ids.socia, 'advogados', jsonb_build_array(ids.socia), 'condicoes', cond.ben, 'propostaId', pb.id)) from ids, cli, cond, pb $$))
  -> 'detalhe' ->> 'motivo', 'PROPOSTA_NAO_ACEITA', 'a mesma proposta não vira dois contratos');
select is((select honorario_lista(rm, 'CONTRATO', cb.id) from ids, cb), (select honorario_lista(rm, 'PROPOSTA', pb.id) from ids, pb),
  'CH-06: as condições são as da proposta');
select is((select count(*)::integer from contrato_advogados, cb where contrato_id = cb.id), 2, 'CH-03: dois advogados no contrato');
select is((select count(*)::integer from recebimentos_previstos, cb where contrato_id = cb.id), 0,
  'CH-04: em elaboração ainda não há programação de recebimentos');
select is((select portal_contratos(paula, rm) -> 'contagem' from ids), '{"ativos": 0, "base": 0, "elaboracao": 1, "encerrados": 0}'::jsonb,
  'contagem por situação');

-- Assinatura: a programação passa a existir.
select is((teste.erro($$ select portal_contrato_assinatura(paula, rm, cb.id, 1, '2026-11-19') from ids, cb $$)) -> 'detalhe' -> 'campos',
  '["assinadoEm"]'::jsonb, 'a assinatura não pode ser no futuro');
select is((select portal_contrato_assinatura(paula, rm, cb.id, 1, '2026-11-18') ->> 'recebimentos' from ids, cb), '6',
  'CH-04: assinar gera 3 parcelas e 3 meses do percentual recorrente');
select is((select jsonb_agg(valor order by vencimento, descricao) from recebimentos_previstos, cb where contrato_id = cb.id and tipo = 'PARCELADO'),
  '[66667, 66667, 66666]'::jsonb, 'o centavo que sobra da divisão vai nas primeiras parcelas');
select is((select jsonb_agg(vencimento order by vencimento) from recebimentos_previstos, cb where contrato_id = cb.id and tipo = 'RECORRENTE'),
  '["2026-12-10", "2027-01-10", "2027-02-10"]'::jsonb, 'o recorrente sai a cada mês, ainda sem valor');
select is((select portal_contrato(paula, rm, cb.id) -> 'proximo' ->> 'em' || '|' || (portal_contrato(paula, rm, cb.id) -> 'proximo' ->> 'aDefinir') from ids, cb),
  '2026-12-10|1', 'o próximo recebimento soma o que vence no dia e conta o que falta definir');

-- Mudar condição de contrato ativo pede motivo e refaz só o que vai vencer.
select is((teste.erro($$ select portal_contrato_condicoes(paula, rm, cb.id, 2, jsonb_build_object('objeto', 'Aposentadoria por idade',
  'responsavelId', ids.socia, 'advogados', jsonb_build_array(ids.socia), 'condicoes', cond.ben)) from ids, cb, cond $$)) -> 'detalhe' -> 'campos',
  '["motivo"]'::jsonb, 'CH-04: contrato ativo pede o motivo da mudança');
select ajustar_relogio(('2026-12-11 12:00-03'::timestamptz - now()));
select is((select portal_contrato_condicoes(paula, rm, cb.id, 2, jsonb_build_object('objeto', 'Aposentadoria por idade',
  'responsavelId', ids.socia, 'advogados', jsonb_build_array(ids.socia), 'motivo', 'Cliente pediu 4 parcelas',
  'condicoes', jsonb_set(cond.ben, '{0}', jsonb_build_object('tipo', 'PARCELADO', 'total', 140000, 'parcelas', 2, 'primeiro', '2027-01-10')))) - 'id'
  from ids, cb, cond), '{"novos": 2, "versao": 3, "cancelados": 2}'::jsonb, 'só o parcelado mudou: cancela as 2 parcelas futuras e gera as novas');
select is((select count(*)::integer from recebimentos_previstos, cb where contrato_id = cb.id and cancelado_em is null and vencimento < '2026-12-11'), 2,
  'o que já venceu fica como estava');
select is((select count(*)::integer from recebimentos_previstos, cb where contrato_id = cb.id and cancelado_motivo = 'Condição mudada: Cliente pediu 4 parcelas'), 2,
  'nada se apaga: o que mudou fica cancelado com o motivo');
select is((select count(*)::integer from contrato_advogados, cb where contrato_id = cb.id), 1, 'os advogados mudam junto');
select is((teste.erro($$ select portal_contrato_condicoes(paula, rm, cb.id, 2, jsonb_build_object('objeto', 'Xy', 'responsavelId', ids.socia,
  'advogados', jsonb_build_array(ids.socia), 'motivo', 'abc', 'condicoes', honorario_lista(rm, 'CONTRATO', cb.id))) from ids, cb $$)) ->> 'codigo', 'TC409',
  'PT-19: versão velha dá conflito');

-- Base do mês (decisão 23): o recebimento de 10/12 sem base ficou parado.
select is((select portal_contratos_honorarios(paula, rm) -> 'bases' -> 0 ->> 'vencimento' || '|' || (portal_contratos_honorarios(paula, rm) -> 'bases' -> 0 ->> 'parada')
  from ids), '2026-12-10|true', 'a base que passou do dia fica parada em Honorários');
create temp table rb as select r.id from recebimentos_previstos r, cb where r.contrato_id = cb.id and r.tipo = 'RECORRENTE' and r.vencimento = '2026-12-10';
select is((teste.erro($$ select portal_contrato_base(paula, rm, rb.id, jsonb_build_object('valor', 0, 'fonte', 'X', 'vencimento', '2026-12-01')) from ids, rb $$))
  -> 'detalhe' -> 'campos', '["fonte", "valor", "vencimento"]'::jsonb, 'base, fonte e vencimento conferidos');
select is((select portal_contrato_base(paula, rm, rb.id, jsonb_build_object('valor', 211800, 'fonte', 'EXTRATO', 'vencimento', '2026-12-15')) - 'id' from ids, rb),
  '{"valor": 63540, "vencimento": "2026-12-15"}'::jsonb, 'CH-06: 30% de R$ 2.118,00 dá R$ 635,40, no novo vencimento');
select is((teste.erro($$ select portal_contrato_base(paula, rm, rb.id, jsonb_build_object('valor', 211800, 'fonte', 'EXTRATO', 'vencimento', '2026-12-15')) from ids, rb $$))
  -> 'detalhe' ->> 'motivo', 'MES_JA_INFORMADO', 'a base do mês se informa uma vez');
select is((select jsonb_array_length(portal_contratos_honorarios(paula, rm) -> 'etapas') from ids), 1, 'o êxito espera a etapa do Jurídico');

-- Encerrar para as cobranças novas e não apaga nada.
select is((select portal_contrato_encerrar(paula, rm, cb.id, 3, 'Cliente desistiu') ->> 'cancelados' from ids, cb), '4',
  'encerrar cancela o que ainda ia vencer');
select is((select count(*)::integer from recebimentos_previstos, cb where contrato_id = cb.id), 8, 'nenhum recebimento é apagado');

-- Funil e Origem com contratos (AP-03, AP-04).
select is((select portal_comercial_funil(socia, rm, '90') -> 'agora' -> 'contrato' -> 0 ->> 'numero' from ids), 'C-2026-001',
  'AP-03: o contrato da proposta aparece na coluna do Funil');
select is((select x -> 'linhas' -> 0 ->> 'valorCerto' from ids, portal_comercial_origem(socia, rm, '90') x), '140000',
  'AP-04: a origem soma o valor certo contratado');

-- EX-10: quem sai passa os contratos de pé.
create temp table cp as select (portal_contrato_criar(paula, rm, jsonb_build_object('clienteId', cli.pad, 'objeto', 'Assessoria trabalhista',
  'responsavelId', ids.paula, 'advogados', jsonb_build_array(ids.paula), 'condicoes', cond.pad)) ->> 'id')::uuid id from ids, cli, cond;
update pessoas set senha_criada_em = now() where nome = 'Paula Nunes';
select portal_retirar(socia, rm, (select id from vinculos v where v.pessoa_id = ids.paula and v.escritorio_id = ids.rm), 1, ids.socia) from ids;
select is((select responsavel_id from contratos, cp where contratos.id = cp.id), (select socia from ids),
  'EX-10: o contrato de quem saiu passa para quem foi escolhido');

select ajustar_relogio(interval '0');
select * from finish();
rollback;
