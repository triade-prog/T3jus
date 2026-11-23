-- Importar do Astrea e do ADVBOX, parte 2: os processos como casos (F3.56, VA-05). Ao importar os
-- clientes do backup, a aba dos processos vira a segunda prévia, sem enviar de novo; o processo se
-- liga ao cliente pelo CPF ou pelo nome; só os ativos entram; o mesmo número de um caso que já
-- existe junta o cliente a ele; duas linhas com o mesmo número são um caso só; todo caso entra sem
-- contrato; desfazer deixa os casos em Encerrados sem resultado e tira só o cliente ligado a um
-- caso que já existia (PT-01, PT-11).
begin;
select plan(31);

select ajustar_relogio(('2026-11-22 12:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Diego Almeida') as diego,
  teste.escritorio('Ribeiro & Matos') as rm;
select teste.vincular(socia, rm, 'SOCIO') from ids;
select portal_convidar(socia, rm, diego, 'Diego Almeida', array['CONTRATOS', 'COMERCIAL']) from ids;
select etapas_garantir(rm) from ids;

-- Um caso que já existe, com o número que o backup também traz.
insert into casos (escritorio_id, nome, area, numero_cnj, etapa_id, responsavel_id, criado_por)
select rm, 'Antônia Ferreira Prado x Banco Sul', 'CONSUMIDOR', '10004567420255020001',
       (select id from etapas where escritorio_id = rm order by ordem limit 1), socia, socia from ids;

-- O backup: Contatos e Processos.
create temp table arq as select jsonb_build_object(
  'arquivoNome', 'backup-astrea-22-11-2026.xlsx', 'oQue', 'CLIENTES', 'origem', 'ASTREA', 'modelo', 'astrea-2026-11',
  'abas', jsonb_build_array(
    jsonb_build_object('nome', 'Contatos', 'colunas', jsonb_build_array('Nome', 'Tipo', 'CPF/CNPJ', 'Celular'),
      'linhas', jsonb_build_array(
        jsonb_build_array('Benedito Ramos Filho', 'Cliente', '462.803.157-62', '(11) 99642-1180'),
        jsonb_build_array('Rosa Almeida', 'Cliente', '529.982.247-25', '(11) 98451-2290'),
        jsonb_build_array('Lúcia Barros', 'Cliente', '', '(11) 97777-1234'))),
    jsonb_build_object('nome', 'Processos', 'colunas', jsonb_build_array('Número', 'Cliente', 'Parte contrária', 'Área', 'Fase', 'Situação', 'Responsável', 'Valor da causa'),
      'linhas', jsonb_build_array(
        jsonb_build_array('1000123-25.2025.5.02.0001', 'Benedito Ramos Filho', 'Construtora Alfa Ltda.', 'Trabalhista', 'Inicial', 'Ativo', 'Dra. Marina', '15.000,00'),
        jsonb_build_array('1000123-25.2025.5.02.0001', 'Rosa Almeida', 'Construtora Alfa Ltda.', 'Trabalhista', 'Inicial', 'Ativo', 'Dra. Marina', ''),
        jsonb_build_array('1000456-74.2025.5.02.0001', 'rosa almeida', 'Banco Sul', 'Consumidor', 'Inicial', 'Ativo', 'Dra. Marina', ''),
        jsonb_build_array('1000789-27.2025.5.02.0001', 'Lúcia Barros', 'INSS', 'Previdenciário', 'Inicial', 'Ativo', 'Dra. Marina', ''),
        jsonb_build_array('1001011-91.2025.5.02.0001', 'Fulano Sem Cadastro', 'Loja X', 'Cível', 'Inicial', 'Ativo', 'Dra. Marina', ''),
        jsonb_build_array('', 'Benedito Ramos Filho', 'Empresa Antiga', 'Trabalhista', 'Inicial', 'Arquivado', 'Dra. Marina', ''),
        jsonb_build_array('', 'Lúcia Barros', 'INSS', 'Previdência', 'Recurso', 'Ativo', 'Dra. Marina', 'mil reais')))),
  'sistema', jsonb_build_array(
    jsonb_build_object('nome', 'Contatos', 'linhas', 3, 'destino', 'CLIENTES', 'reconhecida', true,
                       'porModelo', jsonb_build_object('0', 'nome', '1', 'tipo_contato', '2', 'documento', '3', 'telefone')),
    jsonb_build_object('nome', 'Processos', 'linhas', 7, 'destino', 'CASOS', 'reconhecida', true,
                       'porModelo', jsonb_build_object('0', 'numero', '1', 'cliente', '2', 'parte_contraria', '3', 'area', '4', 'etapa',
                                                       '5', 'situacao_processo', '6', 'responsavel', '7', 'valor_causa')))) d;

create temp table imp as select portal_importacao_criar(socia, rm, arq.d) j from ids, arq;
create temp table v as select (j ->> 'id')::uuid id from imp;
select is((select (j ->> 'aba')::integer from imp), 0, 'a aba dos contatos vem escolhida');
select is((teste.erro($$ select portal_importacao_colunas(socia, rm, v.id, 1, jsonb_build_object('aba', 1, 'ligacao', '{}'::jsonb)) from ids, v $$)) -> 'detalhe' -> 'campos',
  '["aba"]'::jsonb, 'F3.56: a aba dos processos não vai para os clientes');
select is((teste.erro($$ select portal_importacao_criar(socia, rm, arq.d || '{"oQue": "CASOS"}') from ids, arq $$)) -> 'detalhe' -> 'campos',
  '["oQue"]'::jsonb, 'do backup, os processos vêm depois dos clientes, sem enviar de novo');
select is((teste.erro($$ select portal_importacao_criar(socia, rm, jsonb_build_object('arquivoNome', 'p.xlsx', 'oQue', 'CASOS',
  'abas', '[{"nome": "A", "colunas": ["Cliente"], "linhas": [["Ana"]]}]'::jsonb)) from ids $$)) -> 'detalhe' -> 'campos',
  '["oQue"]'::jsonb, 'a planilha comum não traz processos');

-- Os clientes primeiro.
select portal_importacao_colunas(socia, rm, v.id, (imp.j ->> 'versao')::integer,
  jsonb_build_object('aba', 0, 'ligacao', imp.j -> 'ligacao')) from ids, v, imp;
create temp table fim as select portal_importacao_importar(socia, rm, v.id, (select versao from importacoes where id = v.id)) j from ids, v;
create temp table f as select (j -> 'filha' ->> 'id')::uuid id from fim;
select is((select j -> 'filha' ->> 'linhas' from fim), '7', 'decisão de 22/11: ao importar os clientes, a aba dos processos vira a segunda prévia');
select is((select jsonb_build_array(o_que, origem, estado, pai_id = v.id) from importacoes, f, v where importacoes.id = f.id),
  '["CASOS", "ASTREA", "PREVIA", true]'::jsonb, 'a dos processos é do Astrea, em prévia, e sabe de onde veio');
select is((select ligacao from importacoes, f where importacoes.id = f.id),
  '{"0": "numero", "1": "cliente", "2": "parte_contraria", "3": "area", "4": "etapa", "5": "situacao_processo", "6": "responsavel", "7": "valor_causa"}'::jsonb,
  'F3.56 decisão 8: as colunas dos processos já vêm ligadas pelo modelo');
select is((teste.erro($$ select portal_importacao(diego, rm, f.id) from ids, f $$)) ->> 'codigo', 'TC404', 'a prévia é só de quem importou');

-- Os pares.
create temp table pr as select portal_importacao_pares(socia, rm, f.id, jsonb_build_object('ligacao', (select ligacao from importacoes where id = f.id))) p from ids, f;
select is((select jsonb_object_agg(x ->> 'valor', x ->> 'sugestao') from pr, jsonb_array_elements(p -> 'area') x),
  '{"Trabalhista": "TRABALHISTA", "Consumidor": "CONSUMIDOR", "Previdenciário": "PREVIDENCIARIO", "Cível": "CIVEL", "Previdência": "PREVIDENCIARIO"}'::jsonb,
  'a área do sistema antigo vira a área do T3jus');
select is((select jsonb_object_agg(x ->> 'valor', x ->> 'sugestao') from pr, jsonb_array_elements(p -> 'situacaoProcesso') x),
  '{"Ativo": "ATIVO", "Arquivado": "FORA"}'::jsonb, 'pergunta 1: os arquivados ficam de fora');
select is((select x ->> 'sugestao' from pr, jsonb_array_elements(p -> 'responsavel') x where x ->> 'valor' = 'Dra. Marina'),
  (select socia::text from ids), 'o responsável pelo nome, sem o "Dra."');
select is((select jsonb_array_length(p -> 'etapas') > 0 from pr), true, 'as etapas do escritório, para ligar a fase');

-- O que é obrigatório.
select is((teste.erro($$ select portal_importacao_colunas(socia, rm, f.id, (select versao from importacoes where id = f.id),
  jsonb_build_object('ligacao', '{"0": "numero"}'::jsonb, 'pares', jsonb_build_object('responsavel', jsonb_build_object('', socia)))) from ids, f $$)) -> 'detalhe' -> 'campos',
  '["cliente"]'::jsonb, 'sem a coluna do cliente, não há prévia');

-- A prévia.
create temp table col as select portal_importacao_colunas(socia, rm, f.id, (select versao from importacoes where id = f.id),
  jsonb_build_object('ligacao', (select ligacao from importacoes where id = f.id))) r from ids, f;
select is((select r -> 'contagens' ->> 'lidas' from col), '6', 'pergunta 1: só os processos ativos entram na prévia');
select is((select fora_tipo from importacoes, f where importacoes.id = f.id), '{"ARQUIVADOS": 1}'::jsonb, 'os arquivados são contados');
select is((select jsonb_object_agg(numero, situacao) from importacao_linhas, f where importacao_id = f.id),
  '{"2": "PRONTA", "3": "PRONTA", "4": "AVISO", "5": "ERRO", "6": "ERRO", "8": "AVISO"}'::jsonb, 'cada linha com a situação');
select is((select norm -> 'mesmaDe' from importacao_linhas, f where importacao_id = f.id and numero = 3), '2'::jsonb,
  'o mesmo número em duas linhas é um caso só');
select is((select jsonb_agg(p ->> 'codigo' order by numero) from importacao_linhas, f, jsonb_array_elements(problemas) p where importacao_id = f.id),
  '["CASO_DUPLICADO", "NUMERO_CNJ_INVALIDO", "CLIENTE_NAO_ENCONTRADO", "CAMPO_INVALIDO"]'::jsonb,
  'decisão 20: o mesmo número de um caso que já existe, o dígito errado e o cliente que não está no T3jus');
select is((select norm -> 'caso' ->> 'nome' from importacao_linhas, f where importacao_id = f.id and numero = 2),
  'Benedito Ramos Filho x Construtora Alfa Ltda.', 'EX-01: o nome do caso é "Cliente x Parte contrária"');
select is((select imp_linha_json(l) -> 'casoExistente' ->> 'nome' from importacao_linhas l, f where importacao_id = f.id and numero = 4),
  'Antônia Ferreira Prado x Banco Sul', 'a linha mostra o caso que já existe');

-- Corrigir, decidir e pular.
select is((select portal_importacao_linha(socia, rm, f.id, 5, '{"campos": {"numero": ""}}') -> 'linha' ->> 'situacao' from ids, f), 'PRONTA',
  'número com dígito errado: apagar importa sem número');
select is((select portal_importacao_linha(socia, rm, f.id, 4, '{"decisao": "JUNTAR"}') -> 'linha' ->> 'situacao' from ids, f), 'PRONTA',
  'juntar liga o cliente ao caso que já existe');
select is((teste.erro($$ select portal_importacao_linha(socia, rm, f.id, 6, '{"decisao": "NOVO"}') from ids, f $$)) -> 'detalhe' -> 'campos',
  '["decisao"]'::jsonb, 'no caso, não há "cadastrar como novo"');
select is((select portal_importacao_decidir(socia, rm, f.id, '{"codigo": "CAMPO_INVALIDO", "decisao": "SEGUIR"}') ->> 'decididas' from ids, f), '1',
  'o valor da causa ilegível fica vazio');

-- Importar.
create temp table fim2 as select portal_importacao_importar(socia, rm, f.id, (select versao from importacoes where id = f.id)) j from ids, f;
select is((select jsonb_build_array(j -> 'resumo' -> 'casos', j -> 'resumo' -> 'juntadosCasos', j -> 'resumo' -> 'fora') from fim2), '[3, 1, 1]'::jsonb,
  'três casos novos, um caso que já existia ganhou um cliente e uma linha ficou de fora');
select is((select string_agg(k.nome, ', ' order by k.nome) from casos c join caso_clientes cc on cc.caso_id = c.id join clientes_escritorio k on k.id = cc.cliente_id
            where c.numero_cnj = '10001232520255020001'), 'Benedito Ramos Filho, Rosa Almeida', 'o caso com os dois clientes das duas linhas');
select ok((select bool_and(cc.contrato_id is null) from caso_clientes cc join casos c on c.id = cc.caso_id, f where c.importacao_id = f.id),
  'decisão 20: todo caso importado entra sem contrato');
select is((select m.motivo from caso_etapa_mudancas m join casos c on c.id = m.caso_id, f where c.importacao_id = f.id and c.numero_cnj = '10001232520255020001'),
  'Caso importado do Astrea (etapa lá: Inicial).', 'a mudança de etapa diz de onde veio o caso, com a fase antiga');

-- Desfazer: um caso mexido fica; os outros vão para Encerrados; o cliente ligado ao caso antigo sai.
insert into caso_etapa_mudancas (escritorio_id, caso_id, para_etapa_id, motivo, por)
select c.escritorio_id, c.id, c.etapa_id, 'Conferido com o tribunal.', c.criado_por from casos c, f where c.id = (select caso_id from importacao_linhas where importacao_id = f.id and numero = 8);
select is((select portal_importacao_plano_desfazer(socia, rm, f.id) - 'mexidos' - 'clientes' - 'juntados' - 'contratos' - 'parcelas' from ids, f),
  '{"casos": 2, "ligacoes": 1, "encerrados": 0}'::jsonb, 'o plano do desfazer: os casos não mexidos e o cliente ligado ao caso antigo');
select portal_importacao_desfazer(socia, rm, f.id, 'Importei o backup errado') from ids, f;
select is((select jsonb_agg(jsonb_build_array(situacao, encerrado_por, resultado) order by situacao desc) from casos c, f where c.importacao_id = f.id),
  '[["ENCERRADO", "IMPORTACAO_DESFEITA", null], ["ENCERRADO", "IMPORTACAO_DESFEITA", null], ["ANDAMENTO", null, null]]'::jsonb,
  'decisão 28: os casos ficam em Encerrados sem resultado; o mexido fica como está');
select is((select count(*) from caso_clientes where caso_id = (select id from casos where numero_cnj = '10004567420255020001'))::integer, 0,
  'o caso que já existia perde só o cliente que a importação ligou');

select * from finish();
rollback;
