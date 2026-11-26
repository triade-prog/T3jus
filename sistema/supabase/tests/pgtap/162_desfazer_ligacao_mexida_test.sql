-- O desfazer dos processos e o cliente com algo no caso (1118; F3.158, PT-11, VA-05), pela decisão
-- da Carol C2 = (a): a ligação do cliente a um caso que já existia fica quando alguém trabalhou no
-- caso com ele depois da importação (imp_ligacao_mexida, pelo catálogo; revisão v1, M3), decidida
-- por linha (M4); a ligação de outro cliente feita depois não segura (revisão v2, m-b); o que veio
-- antes da importação não segura; a regra (d) da exclusão (pedido de documento, levantamento,
-- requisição e petição com o nome dele) e o que não prende; o caso novo desfeito como hoje (F3.185);
-- a trava das 10 tabelas com caso_id e cliente_id.
begin;
select plan(33);

select ajustar_relogio(('2026-11-25 10:00-03'::timestamptz - now()));
-- A saída das entradas sem acesso (0540) não entra neste teste.
update inventario_dados set situacao = 'PROPOSTA' where tabela = 'pessoas';

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.escritorio('Ribeiro & Matos') as rm;
select teste.vincular(socia, rm, 'SOCIO') from ids;
select etapas_garantir(rm) from ids;

-- Os clientes, já cadastrados.
create function pg_temp.cadastrar(p_nome text, p_tel text) returns uuid language sql as $$
  select (portal_cliente_cadastrar((select socia from ids), (select rm from ids), jsonb_build_object('tipo', 'PF', 'nome', p_nome,
    'contatos', jsonb_build_array(jsonb_build_object('nome', p_nome, 'telefone', p_tel, 'principal', true)))) ->> 'id')::uuid
$$;
create temp table k as select x.nome, pg_temp.cadastrar(x.nome, x.tel) id from (values
  ('Ana Souza Lima', '+5511990000001'), ('Bia Reis Prado', '+5511990000002'), ('Dani Rocha Melo', '+5511990000003'),
  ('Fernanda Luz Alves', '+5511990000004'), ('Gabi Torres Nunes', '+5511990000005'), ('Hugo Prates Vaz', '+5511990000006'),
  ('Iris Mota Queiroz', '+5511990000007'), ('Quim Barros Lemos', '+5511990000008'), ('João Vidal Pinto', '+5511990000009'),
  ('Kátia Ramos Leal', '+5511990000010'), ('Lia Faria Gomes', '+5511990000011'), ('Mário Cunha Reis', '+5511990000012'),
  ('Nara Duarte Sá', '+5511990000013'), ('Otto Brandão Cruz', '+5511990000014'), ('Paulo Neves Aragão', '+5511990000015')) x(nome, tel);
create function pg_temp.k(p_nome text) returns uuid language sql as $$ select id from k where nome like p_nome || '%' $$;

-- Os casos que já existiam (um por sinal), com o número que o backup também traz.
create temp table cs as select x.chave, x.numero from (values
  ('m4', '20000019220255020001'), ('nada', '20000027720255020001'), ('pedido', '20000036220255020001'),
  ('requisicao', '20000044720255020001'), ('despesa', '20000053220255020001'), ('compromisso', '20000061720255020001'),
  ('peticao', '20000070220255020001'), ('documento', '20000088420255020001'), ('etapa', '20000096920255020001'),
  ('antes', '20000105420255020001'), ('contrato', '20000113920255020001')) x(chave, numero);
insert into casos (escritorio_id, nome, area, numero_cnj, etapa_id, responsavel_id, criado_por)
select rm, 'Caso ' || cs.chave, 'CIVEL', cs.numero, (select id from etapas where escritorio_id = rm order by ordem limit 1), socia, socia from ids, cs;
create function pg_temp.caso(p_chave text) returns uuid language sql as $$
  select c.id from casos c join cs on cs.numero = c.numero_cnj where cs.chave = p_chave
$$;
-- Lia: um documento e uma mudança de etapa de antes da importação.
insert into documentos_caso (escritorio_id, caso_id, categoria, nome, tipo, tamanho, enviado_por)
  select rm, pg_temp.caso('antes'), 'OUTRO', 'procuracao-antiga.pdf', 'application/pdf', 1000, socia from ids;
insert into caso_etapa_mudancas (escritorio_id, caso_id, para_etapa_id, motivo, por)
  select c.escritorio_id, c.id, c.etapa_id, 'Conferido antes da importação.', c.criado_por from casos c where c.id = pg_temp.caso('antes');
-- Mário tem um contrato.
select definir_transicao('CONTRATO_CRIADO', null, true);
insert into contratos (escritorio_id, numero, cliente_id, objeto, responsavel_id, criado_por)
  select rm, 'C-2026-501', pg_temp.k('Mário'), 'Honorários do caso', socia, socia from ids;
select limpar_contexto();

-- 1. A importação, um dia depois: os contatos (só Vera) e os processos, cada linha juntando o
-- cliente ao caso que já existe; Paulo num caso novo.
select ajustar_relogio(('2026-11-26 10:00-03'::timestamptz - now()));
create temp table arq as select jsonb_build_object(
  'arquivoNome', 'backup-astrea.xlsx', 'oQue', 'CLIENTES', 'origem', 'ASTREA', 'modelo', 'astrea-2026-11',
  'abas', jsonb_build_array(
    jsonb_build_object('nome', 'Contatos', 'colunas', jsonb_build_array('Nome', 'Tipo', 'Celular'),
      'linhas', jsonb_build_array(jsonb_build_array('Vera Nova Dias', 'Cliente', '(11) 93333-0006'))),
    jsonb_build_object('nome', 'Processos', 'colunas', jsonb_build_array('Número', 'Cliente', 'Parte contrária', 'Área', 'Fase', 'Situação', 'Responsável'),
      'linhas', (select jsonb_agg(jsonb_build_array(n, c, 'Banco Sul', 'Cível', 'Inicial', 'Ativo', 'Dra. Marina') order by o) from (values
        (1, '2000001-92.2025.5.02.0001', 'Ana Souza Lima'), (2, '2000001-92.2025.5.02.0001', 'Bia Reis Prado'),
        (3, '2000002-77.2025.5.02.0001', 'Nara Duarte Sá'), (4, '2000003-62.2025.5.02.0001', 'Dani Rocha Melo'),
        (5, '2000004-47.2025.5.02.0001', 'Fernanda Luz Alves'), (6, '2000005-32.2025.5.02.0001', 'Gabi Torres Nunes'),
        (7, '2000006-17.2025.5.02.0001', 'Hugo Prates Vaz'), (8, '2000007-02.2025.5.02.0001', 'Iris Mota Queiroz'),
        (9, '2000007-02.2025.5.02.0001', 'Quim Barros Lemos'), (10, '2000008-84.2025.5.02.0001', 'João Vidal Pinto'),
        (11, '2000009-69.2025.5.02.0001', 'Kátia Ramos Leal'), (12, '2000010-54.2025.5.02.0001', 'Lia Faria Gomes'),
        (13, '2000011-39.2025.5.02.0001', 'Mário Cunha Reis'), (14, '2000012-24.2025.5.02.0001', 'Paulo Neves Aragão')) x(o, n, c)))),
  'sistema', jsonb_build_array(
    jsonb_build_object('nome', 'Contatos', 'linhas', 1, 'destino', 'CLIENTES', 'reconhecida', true,
                       'porModelo', jsonb_build_object('0', 'nome', '1', 'tipo_contato', '2', 'telefone')),
    jsonb_build_object('nome', 'Processos', 'linhas', 14, 'destino', 'CASOS', 'reconhecida', true,
                       'porModelo', jsonb_build_object('0', 'numero', '1', 'cliente', '2', 'parte_contraria', '3', 'area', '4', 'etapa',
                                                       '5', 'situacao_processo', '6', 'responsavel')))) d;
create function pg_temp.importar() returns uuid language plpgsql as $$
declare
  s uuid := (select socia from ids);
  e uuid := (select rm from ids);
  j jsonb := portal_importacao_criar(s, e, (select d from arq));
  v uuid := (j ->> 'id')::uuid;
  f uuid;
begin
  perform portal_importacao_colunas(s, e, v, (select versao from importacoes where id = v), jsonb_build_object('aba', 0, 'ligacao', j -> 'ligacao'));
  f := (portal_importacao_importar(s, e, v, (select versao from importacoes where id = v)) -> 'filha' ->> 'id')::uuid;
  perform portal_importacao_colunas(s, e, f, (select versao from importacoes where id = f), jsonb_build_object('ligacao', (select ligacao from importacoes where id = f)));
  perform portal_importacao_decidir(s, e, f, '{"codigo": "CASO_DUPLICADO", "decisao": "JUNTAR"}');
  perform portal_importacao_importar(s, e, f, (select versao from importacoes where id = f));
  return f;
end $$;
create temp table imp as select pg_temp.importar() id;
create function pg_temp.lig(p_nome text) returns caso_clientes language sql as $$
  select cc.* from caso_clientes cc where cc.cliente_id = pg_temp.k(p_nome) and cc.importacao_id = (select id from imp)
$$;
create function pg_temp.mexida(p_nome text) returns boolean language sql as $$
  select imp_ligacao_mexida(pg_temp.lig(p_nome), i) from importacoes i where i.id = (select id from imp)
$$;
select is((select count(*) from caso_clientes cc, imp where cc.importacao_id = imp.id and cc.caso_id in (select c.id from casos c join cs on cs.numero = c.numero_cnj))::integer,
  13, 'a importação juntou os 13 clientes aos 11 casos que já existiam');
select ok((select bool_and(not pg_temp.mexida(nome)) from k where nome not like 'Otto%' and nome not like 'Paulo%'),
  'logo depois da importação, nenhuma ligação conta como mexida (o que a importação cria tem a mesma hora)');

-- 2. Os sinais, no dia seguinte.
select ajustar_relogio(('2026-11-27 10:00-03'::timestamptz - now()));
update caso_clientes set contrato_id = (select id from contratos where numero = 'C-2026-501') where id = (pg_temp.lig('Mário')).id;
insert into levantamentos (escritorio_id, caso_id, cliente_id, tipo, valor, entrou_em, autor_id)
  select rm, pg_temp.caso('m4'), pg_temp.k('Ana'), 'ALVARA', 100000, date '2026-11-27', socia from ids;
insert into documento_pedidos (escritorio_id, caso_id, descricao, cliente_id, pedido_em, pedido_por)
  select rm, pg_temp.caso('pedido'), 'Comprovante de residência', pg_temp.k('Dani'), date '2026-11-27', socia from ids;
insert into requisicoes_a_caminho (escritorio_id, caso_id, cliente_id, tipo, numero, tribunal, devedor, valor_requisitado, parte_escritorio, expedido_em, estimada_mes, criado_por)
  select rm, pg_temp.caso('requisicao'), pg_temp.k('Fernanda'), 'RPV', '0001234-56.2026', 'TRF3', 'INSS', 500000, 150000, date '2026-11-27', date '2027-01-01', socia from ids;
insert into contas_pagar (escritorio_id, descricao, categoria, valor, vencimento, caso_id, cliente_id, reembolso_como)
  select rm, 'Custas iniciais', 'CUSTAS', 15000, date '2026-12-10', pg_temp.caso('despesa'), pg_temp.k('Gabi'), 'A_PARTE' from ids;
insert into compromissos (escritorio_id, tipo, titulo, inicio, fim, modalidade, local, responsavel_id, criado_por, caso_id, cliente_id)
  select rm, 'CLIENTE', 'Reunião com Hugo', '2026-12-01 14:00-03', '2026-12-01 15:00-03', 'PRESENCIAL', 'Escritório', socia, socia, pg_temp.caso('compromisso'), pg_temp.k('Hugo') from ids;
insert into peticoes (escritorio_id, caso_id, modelo_padrao, modelo_nome, situacao, gerado_por)
  select rm, pg_temp.caso('peticao'), 'CONTESTACAO_CIVEL', 'Contestação', 'RASCUNHO', socia from ids;
insert into peticao_versoes (escritorio_id, peticao_id, numero, origem, nome_arquivo, tamanho, escolhas, dados_do_dia, previa, enviada_por)
  select rm, p.id, 1, 'DADOS', 'contestacao.docx', 1000, jsonb_build_object('partes', jsonb_build_array(pg_temp.k('Iris'))), '{}', '[]', socia
    from ids, peticoes p where p.caso_id = pg_temp.caso('peticao');
select limpar_contexto();
insert into documentos_caso (escritorio_id, caso_id, categoria, nome, tipo, tamanho, enviado_por)
  select rm, pg_temp.caso('documento'), 'DECISAO', 'decisao.pdf', 'application/pdf', 1000, socia from ids;
insert into caso_etapa_mudancas (escritorio_id, caso_id, para_etapa_id, motivo, por)
  select c.escritorio_id, c.id, c.etapa_id, 'Audiência marcada.', c.criado_por from casos c where c.id = pg_temp.caso('etapa');
-- m-b: Otto é ligado pela tela ao caso de Nara, depois da importação.
insert into caso_clientes (escritorio_id, caso_id, cliente_id, papel, ordem)
  select rm, pg_temp.caso('nada'), pg_temp.k('Otto'), 'AUTOR', 2 from ids;

select ok(not pg_temp.mexida('Nara'), 'PT-11 F3.158: sem nada, a ligação sai como hoje');
select ok(pg_temp.mexida('Dani'), 'PT-11 F3.158: o pedido de documento do par segura a ligação');
select ok(pg_temp.mexida('Ana'), 'PT-11 F3.158: o levantamento do par segura a ligação');
select ok(pg_temp.mexida('Fernanda'), 'PT-11 F3.158: a requisição do par segura a ligação');
select ok(pg_temp.mexida('Gabi'), 'PT-11 F3.158: a despesa do par segura a ligação');
select ok(pg_temp.mexida('Hugo'), 'PT-11 F3.158: o compromisso do par segura a ligação');
select ok(pg_temp.mexida('Iris'), 'PT-11 F3.158: a petição com o cliente nas partes segura a ligação');
select ok(pg_temp.mexida('João'), 'PT-11 F3.158: o documento do caso enviado depois da importação segura a ligação');
select ok(pg_temp.mexida('Kátia'), 'PT-11 F3.158: a mudança de etapa depois da importação segura a ligação');
select ok(pg_temp.mexida('Mário'), 'PT-11 F3.158: a ligação com contrato fica');
select ok(not pg_temp.mexida('Lia'), 'PT-11 F3.158: o documento e a etapa de antes da importação não seguram');
select ok(not pg_temp.mexida('Quim'), 'PT-11 F3.158: a petição de outro cliente do mesmo caso não segura');
select ok(not pg_temp.mexida('Bia'), 'PT-11 F3.158 M4: o levantamento de Ana não segura Bia, no mesmo caso');

-- 3. O plano e o desfazer.
create temp table pl as select portal_importacao_plano_desfazer(socia, rm, imp.id) j from ids, imp;
select is((select j - 'mexidos' - 'clientes' - 'juntados' - 'contratos' - 'parcelas' from pl), '{"casos": 1, "ligacoes": 4, "encerrados": 0}'::jsonb,
  'PT-11 F3.158: o plano conta só as ligações que saem (Bia, Nara, Lia e Quim) e o caso novo de Paulo');
select is((select jsonb_agg(m ->> 'nome' order by m ->> 'nome') from pl, jsonb_array_elements(j -> 'mexidos') m),
  '["Caso compromisso", "Caso contrato", "Caso despesa", "Caso documento", "Caso etapa", "Caso m4", "Caso pedido", "Caso peticao", "Caso requisicao"]'::jsonb,
  'PT-11 F3.158: cada caso com ligação mexida aparece uma vez em "ficou como está" (M4: o caso de Ana e Bia, uma entrada)');
select ok((select bool_and(m ->> 'tipo' = 'CASO') from pl, jsonb_array_elements(j -> 'mexidos') m), 'PT-11 F3.158: como CASO, que a tela já mostra');
create temp table df as select portal_importacao_desfazer(socia, rm, imp.id, 'Backup errado') r from ids, imp;
select is((select r -> 'feito' -> 'ligacoes' from df), '4'::jsonb, 'PT-11 F3.158: o desfazer faz o que o plano disse');
select is((select array_agg(k.nome order by k.nome) from caso_clientes cc join k on k.id = cc.cliente_id
            where cc.caso_id in (select c.id from casos c join cs on cs.numero = c.numero_cnj)),
  array['Ana Souza Lima', 'Dani Rocha Melo', 'Fernanda Luz Alves', 'Gabi Torres Nunes', 'Hugo Prates Vaz', 'Iris Mota Queiroz', 'João Vidal Pinto',
        'Kátia Ramos Leal', 'Mário Cunha Reis', 'Otto Brandão Cruz'],
  'PT-11 F3.158: ficam as ligações mexidas e a de Otto; saem Bia, Nara, Lia e Quim');
select is((select importacao_id from caso_clientes where cliente_id = pg_temp.k('Ana')), (select id from imp),
  'a ligação que fica guarda a importação desfeita (a ficha do caso continua dizendo de onde veio)');

-- 4. A exclusão depois do desfazer (C2 = a): com a ligação, só arquivar.
create function pg_temp.excluir(p_cliente uuid) returns jsonb language sql as $$
  select portal_cliente_excluir_dados(ids.socia, ids.rm, p_cliente, c.versao,
    jsonb_build_object('pedidoEm', hoje_brasilia(), 'canal', 'TELEFONE', 'quemPediu', 'TITULAR', 'conferido', true, 'nomeConfirmado', c.nome))
    from clientes_escritorio c, ids where c.id = p_cliente
$$;
create function pg_temp.arquivar(p_cliente uuid) returns jsonb language sql as $$
  select portal_cliente_arquivar_lgpd(ids.socia, ids.rm, p_cliente, c.versao,
    jsonb_build_object('pedidoEm', hoje_brasilia(), 'canal', 'TELEFONE', 'quemPediu', 'TITULAR', 'conferido', true))
    from clientes_escritorio c, ids where c.id = p_cliente
$$;
select is((teste.erro(format('select pg_temp.excluir(%L)', pg_temp.k('João')))) -> 'detalhe' ->> 'motivo', 'TEM_CONTRATO_OU_PROCESSO',
  'PT-11 F3.158: o cliente com a ligação mantida não pode ser excluído');
select ok((select pg_temp.arquivar(pg_temp.k('João')) ->> 'protocolo') is not null, 'PT-11 F3.158: e pode ser arquivado');
select ok((select bool_and(pg_temp.excluir(pg_temp.k(n)) ->> 'protocolo' is not null) from unnest(array['Bia', 'Nara', 'Lia']) n),
  'PT-11 F3.158: quem foi solto pelo desfazer pode ser excluído');

-- 5. A regra (d): o desfazer antigo já soltou a ligação (simulado apagando com privilégio).
delete from caso_clientes where cliente_id in (pg_temp.k('Ana'), pg_temp.k('Dani'), pg_temp.k('Fernanda'), pg_temp.k('Iris'), pg_temp.k('Gabi'), pg_temp.k('Hugo'));
select is((select jsonb_object_agg(n, cliente_vinculos_lgpd(pg_temp.k(n)) -> 'processos' -> 0 ->> 'nome') from unnest(array['Ana', 'Dani', 'Fernanda', 'Iris']) n),
  '{"Ana": "Caso m4", "Dani": "Caso pedido", "Fernanda": "Caso requisicao", "Iris": "Caso peticao"}'::jsonb,
  'PT-11 F3.158 regra (d): o levantamento, o pedido de documento, a requisição e a petição com o nome dele contam como processo');
select ok((select bool_and(teste.erro(format('select pg_temp.excluir(%L)', pg_temp.k(n))) -> 'detalhe' ->> 'motivo' = 'TEM_CONTRATO_OU_PROCESSO')
             from unnest(array['Ana', 'Dani', 'Fernanda', 'Iris']) n), 'PT-11 F3.158 regra (d): a exclusão deles é recusada');
select ok((select pg_temp.arquivar(pg_temp.k('Dani')) ->> 'protocolo') is not null, 'PT-11 F3.158 regra (d): e o arquivamento é aceito');
-- O que não prende: o compromisso (aqui, de Otto num caso de outro cliente, sem ligação), a despesa
-- (a F3.156 limpa) e a petição de outro cliente do mesmo caso.
insert into compromissos (escritorio_id, tipo, titulo, inicio, fim, modalidade, local, responsavel_id, criado_por, caso_id, cliente_id)
  select rm, 'CLIENTE', 'Conversa com Otto', '2026-12-02 14:00-03', '2026-12-02 15:00-03', 'PRESENCIAL', 'Escritório', socia, socia, pg_temp.caso('pedido'), pg_temp.k('Otto') from ids;
delete from caso_clientes where cliente_id = pg_temp.k('Otto');
select is((select jsonb_object_agg(n, cliente_vinculos_lgpd(pg_temp.k(n))) from unnest(array['Hugo', 'Gabi', 'Quim', 'Otto']) n),
  '{"Hugo": null, "Gabi": null, "Quim": null, "Otto": null}'::jsonb,
  'PT-11 F3.158 regra (d): compromisso, despesa e a petição de outro cliente não prendem');
select ok((select bool_and(pg_temp.excluir(pg_temp.k(n)) ->> 'protocolo' is not null) from unnest(array['Hugo', 'Gabi', 'Quim']) n),
  'PT-11 F3.158 regra (d): e eles podem ser excluídos');

-- 6. O caso novo desfeito continua como hoje: vai para Encerrados com a ligação, e Paulo não pode
-- ser excluído. É o item F3.185 (o desfazer dos clientes o conta como mexido e a exclusão o recusa).
select is((select array[c.situacao, c.encerrado_por] from casos c, imp where c.importacao_id = imp.id), array['ENCERRADO', 'IMPORTACAO_DESFEITA'],
  'o caso novo de Paulo vai para Encerrados');
select is((teste.erro(format('select pg_temp.excluir(%L)', pg_temp.k('Paulo')))) -> 'detalhe' ->> 'motivo', 'TEM_CONTRATO_OU_PROCESSO',
  'F3.185 (pendente): o caso novo desfeito ainda prende Paulo');

-- 7. A trava: as tabelas com caso_id e cliente_id são as 10 conhecidas, cada uma classificada. Tabela
-- nova quebra o teste e obriga a decidir em que regra ela entra (README, "A importação").
select is((select array_agg(c.relname::text order by c.relname) from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relkind in ('r', 'p')
              and exists (select 1 from pg_attribute a where a.attrelid = c.oid and a.attname = 'caso_id' and not a.attisdropped)
              and exists (select 1 from pg_attribute a where a.attrelid = c.oid and a.attname = 'cliente_id' and not a.attisdropped)),
  array['caso_clientes',                    -- a ligação
        'compromissos',                     -- só em (a)
        'contas_pagar',                     -- só em (a)
        'documento_pedidos',                -- conta em (d)
        'exitos_conferir',                  -- só em (a)
        'historico_financeiro_anterior',    -- da importação
        'importacao_linhas',                -- da importação
        'lembrete_contrato',                -- da importação
        'levantamentos',                    -- conta em (d)
        'requisicoes_a_caminho'],           -- conta em (d)
  'PT-11 F3.158: as 10 tabelas com caso_id e cliente_id, classificadas');
select ok((select bool_and(exists (select 1 from pg_indexes where tablename = t and indexdef like '%(escritorio_id, cliente_id)%'))
             from unnest(array['documento_pedidos', 'levantamentos', 'requisicoes_a_caminho']) t),
  'PT-11 F3.158: as três da regra (d) têm índice por escritório e cliente');

select * from finish();
rollback;
