-- Importar do Astrea, parte 3: o financeiro antigo só como informação (F3.56, F3.113). Ao importar
-- os clientes do backup, a aba dos lançamentos vira mais uma prévia; o recebido fica no histórico
-- da ficha como "pago antes do T3jus", fora do Caixa; o que está em aberto vira um lembrete de
-- criar o contrato, que some quando o contrato é criado; as despesas ficam de fora (listadas na prévia
-- como FORA_REGRA, desde a 0920, e nunca importadas); desfazer tira
-- o histórico e os lembretes, e o lembrete que já virou contrato fica como está.
begin;
select plan(25);

select ajustar_relogio(('2026-11-22 12:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Paula Nunes') as paula,
  teste.escritorio('Ribeiro & Matos') as rm;
select teste.vincular(socia, rm, 'SOCIO') from ids;
select portal_convidar(socia, rm, diego, 'Diego Almeida', array['CONTRATOS', 'COMERCIAL']) from ids;
select portal_convidar(socia, rm, paula, 'Paula Nunes', array['JURIDICO']) from ids;

create temp table arq as select jsonb_build_object(
  'arquivoNome', 'backup-astrea-22-11-2026.xlsx', 'oQue', 'CLIENTES', 'origem', 'ASTREA', 'modelo', 'astrea-2026-11',
  'abas', jsonb_build_array(
    jsonb_build_object('nome', 'Contatos', 'colunas', jsonb_build_array('Nome', 'Tipo', 'CPF/CNPJ', 'Celular'),
      'linhas', jsonb_build_array(
        jsonb_build_array('Benedito Ramos Filho', 'Cliente', '462.803.157-62', '(11) 99642-1180'),
        jsonb_build_array('Rosa Almeida', 'Cliente', '529.982.247-25', '(11) 98451-2290'))),
    jsonb_build_object('nome', 'Lançamentos', 'colunas', jsonb_build_array('Data', 'Cliente', 'Descrição', 'Valor', 'Situação', 'Tipo'),
      'linhas', jsonb_build_array(
        jsonb_build_array('10/03/2026', 'Benedito Ramos Filho', 'Honorários iniciais', '1.500,00', 'Pago', 'Receita'),
        jsonb_build_array('10/04/2026', 'Benedito Ramos Filho', 'Parcela 2', '500,00', 'Pago', 'Receita'),
        jsonb_build_array('10/12/2026', 'Benedito Ramos Filho', 'Parcela 3', '500,00', 'Em aberto', 'Receita'),
        jsonb_build_array('10/01/2027', 'Benedito Ramos Filho', 'Parcela 4', '500,00', 'Pendente', 'Receita'),
        jsonb_build_array('05/02/2026', 'Rosa Almeida', 'Consulta', '300,00', 'Pago', 'Receita'),
        jsonb_build_array('20/02/2026', 'Rosa Almeida', 'Acordo', '', 'Pago', 'Receita'),
        jsonb_build_array('01/03/2026', 'Fulano Sem Cadastro', 'Honorários', '800,00', 'Pago', 'Receita'),
        jsonb_build_array('05/03/2026', '', 'Aluguel da sala', '2.000,00', 'Pago', 'Despesa'),
        jsonb_build_array('32/13/2026', 'Rosa Almeida', 'Parcela final', '200,00', 'Em aberto', 'Receita')))),
  'sistema', jsonb_build_array(
    jsonb_build_object('nome', 'Contatos', 'linhas', 2, 'destino', 'CLIENTES', 'reconhecida', true,
                       'porModelo', jsonb_build_object('0', 'nome', '1', 'tipo_contato', '2', 'documento', '3', 'telefone')),
    jsonb_build_object('nome', 'Lançamentos', 'linhas', 9, 'destino', 'FINANCEIRO', 'reconhecida', true,
                       'porModelo', jsonb_build_object('0', 'lanc_data', '1', 'cliente', '2', 'lanc_descricao', '3', 'lanc_valor',
                                                       '4', 'lanc_situacao', '5', 'lanc_tipo')))) d;

create temp table imp as select portal_importacao_criar(socia, rm, arq.d) j from ids, arq;
create temp table v as select (j ->> 'id')::uuid id from imp;
select is((teste.erro($$ select portal_importacao_colunas(socia, rm, v.id, 1, jsonb_build_object('aba', 1, 'ligacao', '{}'::jsonb)) from ids, v $$)) -> 'detalhe' -> 'campos',
  '["aba"]'::jsonb, 'F3.113: a aba dos lançamentos não vai para os clientes');

-- Os clientes primeiro.
select portal_importacao_colunas(socia, rm, v.id, (imp.j ->> 'versao')::integer,
  jsonb_build_object('aba', 0, 'ligacao', imp.j -> 'ligacao')) from ids, v, imp;
create temp table fim as select portal_importacao_importar(socia, rm, v.id, (select versao from importacoes where id = v.id)) j from ids, v;
create temp table f as select (j -> 'filhaFinanceiro' ->> 'id')::uuid id from fim;
select is((select j -> 'filhaFinanceiro' ->> 'linhas' from fim), '9', 'ao importar os clientes, a aba dos lançamentos vira mais uma prévia');
select is((select jsonb_build_array(o_que, origem, estado, pai_id = v.id) from importacoes, f, v where importacoes.id = f.id),
  '["FINANCEIRO", "ASTREA", "PREVIA", true]'::jsonb, 'a do financeiro é do Astrea, em prévia, e sabe de onde veio');
select is((select ligacao from importacoes, f where importacoes.id = f.id),
  '{"0": "lanc_data", "1": "cliente", "2": "lanc_descricao", "3": "lanc_valor", "4": "lanc_situacao", "5": "lanc_tipo"}'::jsonb,
  'as colunas dos lançamentos já vêm ligadas pelo modelo');
select is((select j -> 'filha' from fim), 'null'::jsonb, 'sem a aba dos processos, não há prévia de casos');

-- Os pares.
create temp table pr as select portal_importacao_pares(socia, rm, f.id, jsonb_build_object('ligacao', (select ligacao from importacoes where id = f.id))) p from ids, f;
select is((select jsonb_object_agg(x ->> 'valor', x ->> 'sugestao') from pr, jsonb_array_elements(p -> 'lancSituacao') x),
  '{"Pago": "PAGO", "Em aberto": "EM_ABERTO", "Pendente": "EM_ABERTO"}'::jsonb, 'a situação do sistema antigo: pago ou em aberto');
select is((select jsonb_object_agg(x ->> 'valor', x ->> 'sugestao') from pr, jsonb_array_elements(p -> 'lancTipo') x),
  '{"Receita": "RECEITA", "Despesa": "DESPESA"}'::jsonb, 'o tipo: receita ou despesa');

-- Obrigatórios.
select is((teste.erro($$ select portal_importacao_colunas(socia, rm, f.id, (select versao from importacoes where id = f.id),
  jsonb_build_object('ligacao', '{"1": "cliente"}'::jsonb)) from ids, f $$)) -> 'detalhe' -> 'campos',
  '["lanc_valor", "lanc_situacao"]'::jsonb, 'sem o valor e a situação, não há prévia');
select is((teste.erro($$ select portal_importacao_colunas(diego, rm, f.id, (select versao from importacoes where id = f.id),
  jsonb_build_object('ligacao', (select ligacao from importacoes where id = f.id))) from ids, f $$)) ->> 'codigo', 'TC404',
  'a prévia é só de quem importou');

-- A prévia.
create temp table col as select portal_importacao_colunas(socia, rm, f.id, (select versao from importacoes where id = f.id),
  jsonb_build_object('ligacao', (select ligacao from importacoes where id = f.id))) r from ids, f;
select is((select fora_tipo from importacoes, f where importacoes.id = f.id), '{"DESPESAS": 1}'::jsonb,
  'decisão 23: as despesas do escritório ficam de fora e são contadas');
select is((select jsonb_object_agg(numero, situacao) from importacao_linhas, f where importacao_id = f.id),
  '{"2": "PRONTA", "3": "PRONTA", "4": "PRONTA", "5": "PRONTA", "6": "PRONTA", "7": "ERRO", "8": "ERRO", "9": "FORA_REGRA", "10": "AVISO"}'::jsonb,
  'cada linha com a situação (a despesa do escritório aparece na prévia e nunca entra)');
select is((select jsonb_agg(p ->> 'codigo' order by numero) from importacao_linhas, f, jsonb_array_elements(problemas) p where importacao_id = f.id),
  '["VALOR_FALTA", "CLIENTE_NAO_ENCONTRADO", "CAMPO_INVALIDO"]'::jsonb, 'o valor que falta, o cliente que não está no T3jus e a data ilegível');
select is((select (r -> 'financeiroAntigo') - 'grupos' from col),
  '{"recebidos": 3, "valorRecebido": 230000, "emAberto": 2, "valorEmAberto": 100000, "lembretes": 1, "clientes": 2, "despesas": 1}'::jsonb,
  'o resumo: o que foi recebido e o que está em aberto');

-- Corrigir e decidir.
select is((select portal_importacao_linha(socia, rm, f.id, 7, '{"campos": {"lanc_valor": "1.000,00"}}') -> 'linha' ->> 'situacao' from ids, f), 'PRONTA',
  'o valor corrigido na linha');
select is((select portal_importacao_decidir(socia, rm, f.id, '{"codigo": "CAMPO_INVALIDO", "decisao": "SEGUIR"}') ->> 'decididas' from ids, f), '1',
  'a data ilegível fica vazia');

-- Importar.
create temp table fim2 as select portal_importacao_importar(socia, rm, f.id, (select versao from importacoes where id = f.id)) j from ids, f;
select is((select jsonb_build_array(j -> 'resumo' -> 'recebidos', j -> 'resumo' -> 'emAberto', j -> 'resumo' -> 'lembretes', j -> 'resumo' -> 'fora') from fim2),
  '[4, 3, 2, 1]'::jsonb, 'quatro recebidos, três em aberto, dois lembretes e uma linha de fora');
select is((select (select count(*) from contratos where escritorio_id = ids.rm) + (select count(*) from pagamentos_recebidos where escritorio_id = ids.rm) from ids)::integer, 0,
  'decisão 23: nada vira cobrança nem entra no Caixa');

create temp table cli as select
  (select id from clientes_escritorio where nome = 'Benedito Ramos Filho') ben,
  (select id from clientes_escritorio where nome = 'Rosa Almeida') rosa;
create temp table ant as select portal_cliente_anterior(socia, rm, cli.ben) -> 'anterior' a from ids, cli;
select is((select jsonb_build_array(a -> 'pago', a -> 'total', a -> 'lembretes' -> 0 -> 'valor', a ->> 'origem') from ant),
  '[200000, 4, 100000, "ASTREA"]'::jsonb, 'na ficha: o que foi pago antes, os lançamentos e o lembrete do que está em aberto');
select is((select portal_cliente_anterior(paula, rm, cli.ben) -> 'anterior' from ids, cli), 'null'::jsonb,
  'quem não é do Financeiro nem dos Contratos não vê os valores');
select is((select (portal_cliente_anterior(diego, rm, cli.ben) -> 'anterior' ->> 'total')::integer from ids, cli), 4,
  'quem é dos Contratos vê');

-- O contrato criado para o cliente resolve o lembrete.
create temp table ct as select (portal_contrato_criar(socia, rm, jsonb_build_object('clienteId', cli.ben, 'objeto', 'Honorários do processo trabalhista',
  'responsavelId', ids.socia, 'advogados', jsonb_build_array(ids.socia),
  'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'MENSAL', 'valor', 50000, 'primeiro', '2026-12-10', 'meses', 2)))) ->> 'id')::uuid id
  from ids, cli;
select is((select jsonb_build_array(resolvido_em is not null, contrato_id = ct.id) from lembrete_contrato, cli, ct where cliente_id = cli.ben),
  '[true, true]'::jsonb, 'o contrato criado resolve o lembrete do cliente');
select is((select jsonb_array_length(portal_cliente_anterior(socia, rm, cli.ben) -> 'anterior' -> 'lembretes') from ids, cli), 0,
  'o lembrete some da ficha');

-- Desfazer: o histórico e os lembretes saem; o lembrete que virou contrato fica.
select is((select portal_importacao_plano_desfazer(socia, rm, f.id) from ids, f) - 'clientes' - 'juntados' - 'contratos' - 'parcelas',
  jsonb_build_object('lancamentos', 7, 'lembretes', 1, 'mexidos', jsonb_build_array(jsonb_build_object('tipo', 'LEMBRETE',
    'id', (select id from lembrete_contrato, cli where cliente_id = cli.ben), 'nome', 'Benedito Ramos Filho'))),
  'o plano do desfazer: os lançamentos, o lembrete aberto e o que já virou contrato');
select portal_importacao_desfazer(socia, rm, f.id, 'Importei o backup errado') from ids, f;
select is((select portal_cliente_anterior(socia, rm, cli.rosa) -> 'anterior' from ids, cli), 'null'::jsonb,
  'desfeito, o histórico sai da ficha');
select is((select jsonb_agg(jsonb_build_array(desfeito_em is null, resolvido_em is not null) order by resolvido_em nulls last) from lembrete_contrato, f where importacao_id = f.id),
  '[[true, true], [false, false]]'::jsonb, 'o lembrete aberto sai; o que virou contrato fica como está');

select * from finish();
rollback;
