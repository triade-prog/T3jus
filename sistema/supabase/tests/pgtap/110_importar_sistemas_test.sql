-- Importar do Astrea e do ADVBOX, parte 1: os clientes (F3.56, VA-05). Só a sócia dona importa
-- de outro sistema; o backup tem até 10.000 linhas por aba; a aba dos contatos vem escolhida e as
-- colunas ligadas pelo modelo; as abas de fora chegam só com o nome; o tipo de contato separa
-- cliente, parte contrária e terceiros; o resto da importação de planilha vale igual (prévia,
-- importar, desfazer); a planilha continua com 2.000 linhas (PT-01, PT-11).
begin;
select plan(24);

select ajustar_relogio(('2026-11-22 12:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Diego Almeida') as diego,
  teste.escritorio('Ribeiro & Matos') as rm;
select teste.vincular(socia, rm, 'SOCIO') from ids;
select portal_convidar(socia, rm, diego, 'Diego Almeida', array['CONTRATOS', 'COMERCIAL']) from ids;

-- O que a API manda depois de ler o backup e reconhecer o modelo do Astrea: Contatos (lida),
-- Processos (conhecida, ainda não entra) e Tarefas (de fora), só com o nome e o tamanho.
create temp table arq as select jsonb_build_object(
  'arquivoNome', 'backup-astrea-21-11-2026.xlsx', 'oQue', 'CLIENTES', 'origem', 'ASTREA', 'modelo', 'astrea-2026-11',
  'abas', jsonb_build_array(
    jsonb_build_object('nome', 'Processos', 'colunas', '[]'::jsonb, 'linhas', '[]'::jsonb),
    jsonb_build_object('nome', 'Contatos', 'colunas', jsonb_build_array('Nome', 'Tipo', 'CPF/CNPJ', 'E-mail', 'Celular', 'Estado civil', 'Observações'),
      'linhas', jsonb_build_array(
        jsonb_build_array('Benedito Ramos Filho', 'Cliente', '462.803.157-62', 'benedito.ramos@exemplo.com.br', '(11) 99642-1180', 'Viúvo', 'liga depois das 18h'),
        jsonb_build_array('Construtora Alfa Ltda.', 'Parte contrária', '', '', '', '', ''),
        jsonb_build_array('Rosa Almeida', 'cliente', '529.982.247-25', '', '(11) 98451-2290', 'casada', ''),
        jsonb_build_array('Dr. Carlos Peixoto', 'Perito', '', 'carlos@exemplo.com.br', '', '', ''),
        jsonb_build_array('Lúcia Barros', '', '', 'lucia@exemplo.com.br', '', '', ''))),
    jsonb_build_object('nome', 'Tarefas', 'colunas', '[]'::jsonb, 'linhas', '[]'::jsonb)),
  'sistema', jsonb_build_array(
    jsonb_build_object('nome', 'Processos', 'linhas', 312, 'destino', 'CASOS', 'reconhecida', true),
    jsonb_build_object('nome', 'Contatos', 'linhas', 5, 'destino', 'CLIENTES', 'reconhecida', true,
                       'porModelo', jsonb_build_object('0', 'nome', '1', 'tipo_contato', '2', 'documento', '3', 'email', '4', 'telefone', '5', 'estado_civil')),
    jsonb_build_object('nome', 'Tarefas', 'linhas', 97, 'destino', 'TAREFAS', 'reconhecida', true))) d;

-- Quem pode (pergunta 3).
select is((teste.erro($$ select portal_importacao_criar(diego, rm, arq.d) from ids, arq $$)) -> 'detalhe' ->> 'motivo', 'SEM_PERMISSAO',
  'F3.56 pergunta 3: de outro sistema, só a sócia dona');
select is((teste.erro($$ select portal_importacao_criar(socia, rm, arq.d || '{"oQue": "CLIENTES_CONTRATOS"}') from ids, arq $$)) -> 'detalhe' -> 'campos',
  '["oQue"]'::jsonb, 'F3.56: contratos não vêm de outro sistema');
select is((teste.erro($$ select portal_importacao_criar(socia, rm, arq.d - 'sistema') from ids, arq $$)) -> 'detalhe' -> 'campos',
  '["sistema"]'::jsonb, 'F3.56: o backup chega com as abas do sistema');
select ok((select portal_importacao_criar(diego, rm, (arq.d - 'sistema' - 'modelo') || '{"origem": "PLANILHA", "abas": [{"nome": "A", "colunas": ["Nome", "Celular"], "linhas": [["Ana", "11 91111-2222"]]}]}') ->> 'origem' = 'PLANILHA' from ids, arq),
  'F3.56: a planilha continua com a regra de sempre (toda a equipe)');

-- Enviar.
create temp table imp as select portal_importacao_criar(socia, rm, arq.d) j from ids, arq;
create temp table v as select (j ->> 'id')::uuid id from imp;
select is((select j ->> 'origem' from imp), 'ASTREA', 'F3.56 decisão 4: a importação sabe a origem');
select is((select j ->> 'modelo' from imp), 'astrea-2026-11', 'F3.56: e a versão do modelo usado');
select is((select (j ->> 'aba')::integer from imp), 1, 'F3.56 decisão 7: a aba dos contatos vem escolhida, mesmo não sendo a primeira');
select is((select jsonb_agg(jsonb_build_array(a ->> 'nome', a ->> 'destino', a ->> 'lida', a ->> 'linhas')) from imp, jsonb_array_elements(j -> 'abasSistema') a),
  '[["Processos", "CASOS", "false", "312"], ["Contatos", "CLIENTES", "true", "5"], ["Tarefas", "TAREFAS", "false", "97"]]'::jsonb,
  'F3.56 decisão 7: todas as abas com o destino; as de fora chegam só com o nome e o tamanho');
select is((select j -> 'ligacao' from imp),
  '{"0": "nome", "1": "tipo_contato", "2": "documento", "3": "email", "4": "telefone", "5": "estado_civil"}'::jsonb,
  'F3.56 decisão 8: as colunas já vêm ligadas pelo modelo; observações ficam de fora');
select is((select jsonb_agg(c ->> 'modelo') from imp, jsonb_array_elements(j -> 'colunas') c),
  '["nome", "tipo_contato", "documento", "email", "telefone", "estado_civil", null]'::jsonb, 'F3.56 decisão 8: cada coluna diz o campo pelo modelo');

-- O tipo de contato (decisão 9).
create temp table pr as select portal_importacao_pares(socia, rm, v.id, jsonb_build_object('ligacao', imp.j -> 'ligacao')) p from ids, v, imp;
select is((select jsonb_object_agg(x ->> 'valor', jsonb_build_array(x -> 'n', x ->> 'sugestao')) from pr, jsonb_array_elements(p -> 'tipoContato') x),
  '{"Cliente": [2, "CLIENTE"], "Parte contrária": [1, "PARTE_CONTRARIA"], "Perito": [1, "FORA"], "": [1, "CLIENTE"]}'::jsonb,
  'F3.56 decisão 9: cada valor do tipo, com quantas linhas o usam e a sugestão');
select is((teste.erro($$ select portal_importacao_colunas(socia, rm, v.id, 1, jsonb_build_object('aba', 0, 'ligacao', '{}'::jsonb)) from ids, v $$)) -> 'detalhe' -> 'campos',
  '["aba"]'::jsonb, 'F3.56: aba que não foi lida não vai para os clientes');
select is((teste.erro($$ select portal_importacao_pares(diego, rm, v.id, '{}') from ids, v $$)) ->> 'codigo', 'TC404', 'a prévia é só de quem importou');

create temp table col as select portal_importacao_colunas(socia, rm, v.id, (imp.j ->> 'versao')::integer,
  jsonb_build_object('aba', 1, 'ligacao', imp.j -> 'ligacao', 'pares', '{"tipoContato": {"perito": "FORA", "parte contraria": "PARTE_CONTRARIA"}}'::jsonb)) r
  from ids, v, imp;
select is((select r -> 'contagens' ->> 'lidas' from col), '3', 'F3.56 decisão 9: só os clientes entram na prévia (sem tipo conta como cliente)');
select is((select jsonb_agg(numero order by numero) from importacao_linhas, v where importacao_id = v.id), '[2, 4, 6]'::jsonb,
  'cada linha guarda o número dela no backup');
select is((select fora_tipo from importacoes, v where importacoes.id = v.id), '{"PARTE_CONTRARIA": 1, "FORA": 1}'::jsonb,
  'F3.56 decisão 9: as partes contrárias e os terceiros são contados e ficam de fora');
select ok((select bool_and(not (bruto ? 'tipo_contato')) from importacao_linhas, v where importacao_id = v.id),
  'o tipo de contato não vai para o cadastro');
select is((select portal_importacao(socia, rm, v.id) -> 'pares' -> 'tipoContato' ->> 'parte contraria' from ids, v), 'PARTE_CONTRARIA', 'os pares ficam gravados');

-- Importar: igual à planilha.
select is((select portal_importacao_importar(socia, rm, v.id, (select versao from importacoes where id = v.id)) -> 'resumo' ->> 'clientes' from ids, v), '3',
  'F3.56: importar grava os clientes, como na planilha');
select is((select string_agg(nome, ', ' order by nome) from clientes_escritorio, v where importacao_id = v.id),
  'Benedito Ramos Filho, Lúcia Barros, Rosa Almeida', 'só os contatos do tipo cliente viram clientes');
select is((select portal_importacoes(socia, rm) -> 0 ->> 'origem' from ids), 'ASTREA', 'F3.56 decisão 27: o histórico traz a origem');

-- ADVBOX pela planilha: só a sócia dona; até 10.000 linhas; a planilha comum, 2.000.
select ok((select portal_importacao_criar(socia, rm, jsonb_build_object('arquivoNome', 'clientes-advbox.xlsx', 'oQue', 'CLIENTES', 'origem', 'ADVBOX_PLANILHA',
  'modelo', 'advbox-2026-11', 'abas', jsonb_build_array(jsonb_build_object('nome', 'Clientes', 'colunas', '["Cliente", "Celular"]'::jsonb,
    'linhas', (select jsonb_agg(jsonb_build_array('Cliente ' || g, '11 9' || lpad(g::text, 8, '0'))) from generate_series(1, 2500) g))),
  'sistema', jsonb_build_array(jsonb_build_object('nome', 'Clientes', 'linhas', 2500, 'destino', 'CLIENTES', 'reconhecida', true,
    'porModelo', '{"0": "nome", "1": "telefone"}'::jsonb)))) -> 'ligacao' = '{"0": "nome", "1": "telefone"}'::jsonb from ids),
  'F3.56: a planilha do ADVBOX passa das 2.000 linhas e vem ligada pelo modelo');
select is((teste.erro($$ select portal_importacao_criar(socia, rm, jsonb_build_object('arquivoNome', 'grande.xlsx', 'oQue', 'CLIENTES',
  'abas', jsonb_build_array(jsonb_build_object('nome', 'A', 'colunas', '["Nome"]'::jsonb,
    'linhas', (select jsonb_agg(jsonb_build_array('C' || g)) from generate_series(1, 2001) g))))) from ids $$)) -> 'detalhe' ->> 'motivo',
  'ARQUIVO_GRANDE', 'a planilha comum continua com 2.000 linhas');
select is((teste.erro($$ select portal_importacao_criar(socia, rm, jsonb_build_object('arquivoNome', 'b.xlsx', 'oQue', 'CLIENTES', 'origem', 'ASTREA',
  'abas', jsonb_build_array(jsonb_build_object('nome', 'Contatos', 'colunas', '["Nome"]'::jsonb,
    'linhas', (select jsonb_agg(jsonb_build_array('C' || g)) from generate_series(1, 10001) g))),
  'sistema', '[{"nome": "Contatos", "destino": "CLIENTES"}]'::jsonb)) from ids $$)) -> 'detalhe' ->> 'motivo',
  'ARQUIVO_GRANDE', 'F3.56 decisão 6: o backup tem até 10.000 linhas por aba');

select * from finish();
rollback;
