-- O que não nasce mais para o cliente excluído a pedido do titular (1130 e 1131; F3.180 e F3.187,
-- PT-11, CH-01, EX-01): o contrato novo (contrato_nasce e a ordem trava do escritório → cliente →
-- proposta em portal_contrato_criar) e a ligação nova a caso (caso_cliente_nasce, a ordem cliente →
-- caso em portal_juridico_caso_cliente e os clientes do cadastro de caso em ordem de id); o buraco
-- de ligar pela API um cliente já excluído; e a trava de catálogo das tabelas com chave para
-- clientes_escritorio, cada uma classificada (tabela nova quebra o teste e obriga a decidir).
--
-- Este teste roda numa transação só: a exclusão "entre a prévia e o importar" já está confirmada
-- quando a importação começa, e a importação recusa antes de chegar ao gatilho novo (revisão, M5):
-- a de clientes com PREVIA_MUDOU (a linha não acha mais o duplicado pelo CPF) e a dos processos
-- também. O que se prova aqui é que a importação não liga o excluído; o gatilho novo é exercitado
-- pelo INSERT direto e, na importação, pelas rodadas de concorrência (exclusao-contrato-simultaneo.sh,
-- c5, e exclusao-caso-simultaneo.sh, k5), em que a exclusão ainda não confirmou na reconferência.
begin;
select plan(30);

select ajustar_relogio(('2026-11-26 10:00-03'::timestamptz - now()));
-- A saída das entradas sem acesso (0540) não entra neste teste.
update inventario_dados set situacao = 'PROPOSTA' where tabela = 'pessoas';

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Intrusa Souza') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, diego, 'Diego Almeida', array['COMERCIAL']) from ids;
select etapas_garantir(rm) from ids;

create function pg_temp.cli(p_nome text, p_doc text default null) returns uuid language sql as $$
  select (portal_cliente_cadastrar(ids.socia, ids.rm, jsonb_strip_nulls(jsonb_build_object('tipo', 'PF', 'origem', 'GOOGLE', 'nome', p_nome, 'documento', p_doc,
    'contatos', jsonb_build_array(jsonb_build_object('nome', p_nome, 'telefone', '+5511984723316', 'principal', true))))) ->> 'id')::uuid from ids
$$;
create temp table cli as select
  pg_temp.cli('Helena Prado Souza') hel,
  pg_temp.cli('Ana Lima Duarte') ana,
  pg_temp.cli('Bruno Excluído Rocha') bruno,
  pg_temp.cli('Clara Excluída Melo') clara,
  pg_temp.cli('Davi Juntado Reis', '12345678062') davi,
  pg_temp.cli('Elisa Processo Nunes') elisa,
  pg_temp.cli('Rita Ativa Gomes') rita,
  (portal_cliente_cadastrar(intrusa, outro, jsonb_build_object('tipo', 'PF', 'origem', 'GOOGLE', 'nome', 'Joana Pereira',
    'contatos', jsonb_build_array(jsonb_build_object('nome', 'Joana Pereira', 'telefone', '+5511984723316', 'principal', true)))) ->> 'id')::uuid joa
  from ids;

-- Propostas aceitas, com o contrato pedido por Diego.
create function pg_temp.aceita(p_cliente uuid) returns uuid language plpgsql as $$
declare v uuid; i ids;
begin
  select * into i from ids;
  v := (portal_proposta_criar(i.diego, i.rm, jsonb_build_object('clienteId', p_cliente, 'servico', 'Revisão do benefício', 'escopo', 'Ação.',
    'responsavelId', i.diego, 'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'FIXO', 'valor', 150000, 'vencimento', '2026-12-10')),
    'retorno', jsonb_build_object('em', '2026-11-30', 'responsavelId', i.diego))) ->> 'id')::uuid;
  perform portal_proposta_enviada(i.diego, i.rm, v, 1);
  perform portal_proposta_resposta(i.diego, i.rm, v, 2, jsonb_build_object('resposta', 'ACEITOU', 'em', '2026-11-24', 'canal', 'PRESENCIAL'));
  perform portal_proposta_pedir_contrato(i.diego, i.rm, v);
  return v;
end $$;
create temp table pr as select pg_temp.aceita(cli.hel) hel, pg_temp.aceita(cli.bruno) bruno from cli;

create function pg_temp.dados_contrato(p_cliente uuid, p_proposta uuid default null) returns jsonb language sql as $$
  select jsonb_strip_nulls(jsonb_build_object('clienteId', p_cliente, 'propostaId', p_proposta, 'objeto', 'Revisão do benefício',
    'responsavelId', ids.socia, 'advogados', jsonb_build_array(ids.socia),
    'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'FIXO', 'valor', 150000, 'vencimento', '2026-12-10')))) from ids
$$;
create function pg_temp.excluir(p_cliente uuid) returns jsonb language sql as $$
  select portal_cliente_excluir_dados(ids.socia, c.escritorio_id, p_cliente, c.versao,
    jsonb_build_object('pedidoEm', hoje_brasilia(), 'canal', 'TELEFONE', 'quemPediu', 'TITULAR', 'conferido', true, 'nomeConfirmado', c.nome))
    from clientes_escritorio c, ids where c.id = p_cliente
$$;
create function pg_temp.dados_caso(p_nome text, p_clientes uuid[]) returns jsonb language sql as $$
  select jsonb_build_object('nome', p_nome, 'area', 'CIVEL', 'responsavelId', ids.socia,
    'etapaId', (select id from etapas where escritorio_id = ids.rm and not final order by ordem limit 1),
    'clientes', (select jsonb_agg(jsonb_build_object('clienteId', c, 'papel', 'AUTOR') order by n) from unnest(p_clientes) with ordinality t(c, n)))
  from ids
$$;
create temp table cs as select (portal_juridico_caso_criar(socia, rm, pg_temp.dados_caso('Souza x INSS', array[cli.rita])) ->> 'id')::uuid id from ids, cli;

-- ---------------------------------------------------------------------------------------
-- F3.180. O contrato.

-- O caminho feliz continua: o contrato da proposta aceita de Helena nasce e o sino avisa Diego.
create temp table ct as select portal_contrato_criar(socia, rm, pg_temp.dados_contrato(cli.hel, pr.hel)) r from ids, cli, pr;
select is((select estado from propostas, pr where id = pr.hel), 'CONTRATO', 'PT-11 F3.180: o contrato da proposta aceita de cliente ativo nasce e a proposta vira CONTRATO');
select is((select count(*)::integer from avisos_sino a, pr, ids where a.tipo = 'CONTRATO_GERADO' and a.origem_id = pr.hel and a.pessoa_id = ids.diego), 1,
  'PT-11 F3.180: o sino CONTRATO_GERADO sai para quem pediu o contrato');

-- Bruno é excluído com a proposta aceita (proposta não prende o cliente).
select pg_temp.excluir(cli.bruno) from cli;
select is((teste.erro($$ select portal_contrato_criar(socia, rm, pg_temp.dados_contrato(cli.bruno, pr.bruno)) from ids, cli, pr $$)) -> 'detalhe' -> 'campos',
  '["clienteId"]'::jsonb, 'PT-11 F3.180: o contrato pela tela para o cliente excluído recusa pelo campo clienteId, como antes');
select is((teste.erro($$ select portal_contrato_criar(socia, rm, pg_temp.dados_contrato(cli.bruno)) from ids, cli $$)) -> 'detalhe' -> 'campos',
  '["clienteId"]'::jsonb, 'PT-11 F3.180: também sem proposta');
select is((select count(*)::integer from contratos, cli where cliente_id = cli.bruno), 0, 'PT-11 F3.180: nada grava para o excluído');
select is((select estado from propostas, pr where id = pr.bruno), 'ACEITA', 'PT-11 F3.180: a proposta do excluído continua ACEITA');

-- O INSERT direto (o que a importação e qualquer caminho futuro fazem) passa pelo gatilho.
select definir_transicao('ELABORACAO');
select is((teste.erro($$ insert into contratos (escritorio_id, numero, cliente_id, objeto, responsavel_id, criado_por)
                         select rm, 'C-TESTE-1', cli.bruno, 'Objeto', socia, socia from ids, cli $$)) -> 'detalhe' ->> 'motivo',
  'CLIENTE_EXCLUIDO', 'PT-11 F3.180: o INSERT direto em contratos com cliente EXCLUIDO recusa (contrato_nasce)');
select isnt(teste.erro($$ insert into contratos (escritorio_id, numero, cliente_id, objeto, responsavel_id, criado_por)
                         select rm, 'C-TESTE-2', cli.joa, 'Objeto', socia, socia from ids, cli $$), null,
  'PT-11 F3.180: o cliente de outro escritório no INSERT direto também recusa (revisão, m3: sem conferir o motivo)');
select ok((select pg_get_triggerdef(oid) like '%BEFORE INSERT ON public.contratos FOR EACH ROW EXECUTE FUNCTION contrato_nasce()%'
             from pg_trigger where tgname = 'contrato_nasce'), 'PT-11 F3.180: contrato_nasce é BEFORE INSERT em contratos');

-- A importação de clientes com contrato e JUNTAR de Davi, excluído entre a prévia e o importar.
create temp table imp as select portal_importacao_criar(socia, rm, jsonb_build_object('arquivoNome', 'contratos.xlsx', 'oQue', 'CLIENTES_CONTRATOS',
  'abas', jsonb_build_array(jsonb_build_object('nome', 'Clientes',
    'colunas', jsonb_build_array('Nome do cliente', 'CPF/CNPJ', 'Celular', 'Serviço', 'Forma de cobrança', 'Valor', '1º vencto', 'Assinatura', 'Advogado'),
    'linhas', jsonb_build_array(jsonb_build_array('Davi Juntado Reis', '123.456.780-62', '(11) 98472-3316', 'Revisão da pensão', 'à vista', '1500',
                                                  '10/12/2026', '01/11/2026', 'Dra. Marina')))))) j from ids;
select portal_importacao_colunas(socia, rm, (j ->> 'id')::uuid, (j ->> 'versao')::integer, jsonb_build_object('ligacao', j -> 'ligacao',
  'pares', jsonb_build_object('responsavel', jsonb_build_object('dra. marina', socia)))) from ids, imp;
select is((select portal_importacao_decidir(socia, rm, (j ->> 'id')::uuid, '{"codigo": "DUPLICADO", "decisao": "JUNTAR"}') ->> 'decididas' from ids, imp), '1',
  'PT-11 F3.180: a prévia junta a linha a Davi');
select pg_temp.excluir(cli.davi) from cli;
select is((teste.erro($$ select portal_importacao_importar(socia, rm, (j ->> 'id')::uuid, (select versao from importacoes where id = (j ->> 'id')::uuid)) from ids, imp $$))
            -> 'detalhe' ->> 'motivo', 'PREVIA_MUDOU',
  'PT-11 F3.180 (revisão, M5): a importação recusa com PREVIA_MUDOU, porque a linha não acha mais o duplicado pelo CPF');
select is((select count(*)::integer from contratos, cli where cliente_id = cli.davi) || ' ' || (select estado from importacoes, imp where id = (j ->> 'id')::uuid),
  '0 PREVIA', 'PT-11 F3.180: a importação não liga contrato ao excluído e volta inteira');

-- A trava de ordem (para ninguém desfazer sem querer): contratos: → cliente FOR SHARE → proposta FOR UPDATE.
create temp table fd as select pg_get_functiondef('portal_contrato_criar(uuid,uuid,jsonb)'::regprocedure) d;
select ok((select strpos(d, 'pg_advisory_xact_lock(hashtext(''contratos:''') < strpos(d, 'escritorio_id = p_escritorio for share')
             and strpos(d, 'escritorio_id = p_escritorio for share') < strpos(d, 'contrato_conferir(')
             and strpos(d, 'contrato_conferir(') < strpos(d, 'escritorio_id = p_escritorio for update')
             and (length(d) - length(replace(d, 'pg_advisory_xact_lock', ''))) / length('pg_advisory_xact_lock') = 1 from fd),
  'PT-11 F3.180: portal_contrato_criar trava o escritório, depois o cliente, confere, e só então trava a proposta (uma trava do escritório só)');

-- ---------------------------------------------------------------------------------------
-- F3.187. A ligação a caso. Clara é excluída sem nenhum vínculo.
select pg_temp.excluir(cli.clara) from cli;
select is((teste.erro($$ select portal_juridico_caso_cliente(socia, rm, cs.id, jsonb_build_object('clienteId', cli.clara, 'papel', 'AUTOR')) from ids, cs, cli $$))
            -> 'detalhe' ->> 'motivo', 'CLIENTE_EXCLUIDO',
  'PT-11 F3.187: adicionar ao caso um cliente já excluído recusa com CLIENTE_EXCLUIDO (o buraco pela API, sem corrida)');
select is((select count(*)::integer from caso_clientes, cli where cliente_id = cli.clara), 0, 'PT-11 F3.187: a ligação não nasce');
select is((teste.erro($$ select portal_juridico_caso_criar(socia, rm, pg_temp.dados_caso('Melo x Banco', array[cli.ana, cli.clara])) from ids, cli $$))
            -> 'detalhe' ->> 'motivo', 'CLIENTE_EXCLUIDO',
  'PT-11 F3.187: cadastrar caso com um cliente excluído na lista recusa com CLIENTE_EXCLUIDO');
select is((select count(*)::integer from casos, ids where escritorio_id = ids.rm and nome = 'Melo x Banco'), 0, 'PT-11 F3.187: o caso não nasce (a transação volta inteira)');
select is((teste.erro($$ insert into caso_clientes (escritorio_id, caso_id, cliente_id, papel, ordem) select rm, cs.id, cli.clara, 'AUTOR', 9 from ids, cs, cli $$))
            -> 'detalhe' ->> 'motivo', 'CLIENTE_EXCLUIDO', 'PT-11 F3.187: o INSERT direto com cliente EXCLUIDO recusa (caso_cliente_nasce)');
select isnt(teste.erro($$ insert into caso_clientes (escritorio_id, caso_id, cliente_id, papel, ordem) select rm, cs.id, cli.joa, 'AUTOR', 9 from ids, cs, cli $$), null,
  'PT-11 F3.187: o cliente de outro escritório no INSERT direto também recusa (revisão, m3: sem conferir o motivo)');
select ok((select pg_get_triggerdef(oid) like '%BEFORE INSERT ON public.caso_clientes FOR EACH ROW EXECUTE FUNCTION caso_cliente_nasce()%'
             from pg_trigger where tgname = 'caso_cliente_nasce'), 'PT-11 F3.187: caso_cliente_nasce é BEFORE INSERT em caso_clientes');

-- O caminho feliz continua: adicionar Ana ao caso e cadastrar um caso com Ana e Rita.
select is((select portal_juridico_caso_cliente(socia, rm, cs.id, jsonb_build_object('clienteId', cli.ana, 'papel', 'AUTOR')) ->> 'id' from ids, cs, cli), (select id::text from cs),
  'PT-11 F3.187: adicionar cliente ativo ao caso continua');
select is((select jsonb_array_length(portal_juridico_caso(socia, rm, (portal_juridico_caso_criar(socia, rm, pg_temp.dados_caso('Lima x Banco', array[cli.rita, cli.ana])) ->> 'id')::uuid) -> 'clientes')
             from ids, cli), 2, 'PT-11 F3.187: cadastrar caso com dois clientes ativos continua');

-- A importação dos processos com a linha de Elisa, excluída entre a prévia e o importar.
create temp table impc as select portal_importacao_criar(socia, rm, jsonb_build_object(
  'arquivoNome', 'backup-astrea.xlsx', 'oQue', 'CLIENTES', 'origem', 'ASTREA', 'modelo', 'astrea-2026-11',
  'abas', jsonb_build_array(
    jsonb_build_object('nome', 'Contatos', 'colunas', jsonb_build_array('Nome', 'Tipo', 'Celular'),
      'linhas', jsonb_build_array(jsonb_build_array('Vera Nova Dias', 'Cliente', '(11) 93333-0006'))),
    jsonb_build_object('nome', 'Processos', 'colunas', jsonb_build_array('Número', 'Cliente', 'Parte contrária', 'Área', 'Fase', 'Situação', 'Responsável'),
      'linhas', jsonb_build_array(jsonb_build_array('2000001-92.2025.5.02.0001', 'Elisa Processo Nunes', 'Banco Sul', 'Cível', 'Inicial', 'Ativo', 'Dra. Marina')))),
  'sistema', jsonb_build_array(
    jsonb_build_object('nome', 'Contatos', 'linhas', 1, 'destino', 'CLIENTES', 'reconhecida', true,
                       'porModelo', jsonb_build_object('0', 'nome', '1', 'tipo_contato', '2', 'telefone')),
    jsonb_build_object('nome', 'Processos', 'linhas', 1, 'destino', 'CASOS', 'reconhecida', true,
                       'porModelo', jsonb_build_object('0', 'numero', '1', 'cliente', '2', 'parte_contraria', '3', 'area', '4', 'etapa',
                                                       '5', 'situacao_processo', '6', 'responsavel'))))) j from ids;
select portal_importacao_colunas(socia, rm, (j ->> 'id')::uuid, (select versao from importacoes where id = (j ->> 'id')::uuid),
  jsonb_build_object('aba', 0, 'ligacao', j -> 'ligacao')) from ids, impc;
create temp table filha as select (portal_importacao_importar(socia, rm, (j ->> 'id')::uuid, (select versao from importacoes where id = (j ->> 'id')::uuid))
  -> 'filha' ->> 'id')::uuid id from ids, impc;
select portal_importacao_colunas(socia, rm, filha.id, (select versao from importacoes where id = filha.id),
  jsonb_build_object('ligacao', (select ligacao from importacoes where id = filha.id))) from ids, filha;
select is((select l ->> 'situacao' from ids, filha, jsonb_array_elements(portal_importacao_linhas(socia, rm, filha.id) -> 'linhas') l), 'PRONTA',
  'PT-11 F3.187: na prévia, a linha do processo de Elisa está pronta');
select pg_temp.excluir(cli.elisa) from cli;
select is((teste.erro($$ select portal_importacao_importar(socia, rm, filha.id, (select versao from importacoes where id = filha.id)) from ids, filha $$))
            -> 'detalhe' ->> 'motivo', 'PREVIA_MUDOU',
  'PT-11 F3.187 (revisão, M5): a importação dos processos recusa com PREVIA_MUDOU, porque a linha não acha mais a cliente');
select is((select count(*)::integer from caso_clientes, cli where cliente_id = cli.elisa) || ' ' || (select count(*) from casos, filha where importacao_id = filha.id),
  '0 0', 'PT-11 F3.187: a importação não liga o excluído e nenhum caso novo fica');

-- As travas de ordem: cliente → caso; os clientes do cadastro em ordem de id, antes do caso.
create temp table fd2 as select pg_get_functiondef('portal_juridico_caso_cliente(uuid,uuid,uuid,jsonb)'::regprocedure) a,
                                pg_get_functiondef('juridico_caso_criar_sem_docs(uuid,uuid,jsonb)'::regprocedure) b;
select ok((select strpos(a, 'escritorio_id = p_escritorio for share') between 1 and strpos(a, 'escritorio_id = p_escritorio for update') from fd2),
  'PT-11 F3.187: portal_juridico_caso_cliente trava o cliente antes do caso');
select ok((select strpos(b, 'order by id for share') between 1 and strpos(b, 'insert into casos') from fd2),
  'PT-11 F3.187 (revisão, M4): o cadastro trava os clientes da lista em ordem de id antes de criar o caso');
select is((select prosecdef from pg_proc where proname in ('contrato_nasce', 'caso_cliente_nasce') group by prosecdef), false,
  'PT-11 F3.180 e F3.187: os gatilhos novos não são security definer');

-- ---------------------------------------------------------------------------------------
-- A trava de catálogo: toda tabela com chave estrangeira para clientes_escritorio, classificada.
-- Tabela nova com cliente_id quebra o teste e obriga a decidir. Quando a F3.194 for feita, a lista
-- "pendente" fica vazia (e as tabelas passam para "nasce com trava").
create temp table classes (classe text, tabela text);
insert into classes values
  ('nasce com trava', 'caso_clientes'), ('nasce com trava', 'cliente_documentos'), ('nasce com trava', 'contas_pagar'),
  ('nasce com trava', 'contratos'), ('nasce com trava', 'historico_financeiro_anterior'), ('nasce com trava', 'lembrete_contrato'),
  -- Exigem caso aberto ou contrato, que prendem o cliente.
  ('precisa de caso ou contrato', 'documento_pedidos'), ('precisa de caso ou contrato', 'levantamentos'),
  ('precisa de caso ou contrato', 'requisicoes_a_caminho'), ('precisa de caso ou contrato', 'exitos_conferir'),
  -- A própria exclusão, as conversas (F3.157) e as linhas da importação (F3.158) tratam.
  ('da exclusão', 'pedidos_exclusao'), ('da exclusão', 'clientes_quem_assinava'), ('da exclusão', 'importacao_linhas'), ('da exclusão', 'conversas'),
  ('pendente, F3.194', 'propostas'), ('pendente, F3.194', 'retornos_cliente'), ('pendente, F3.194', 'atendimentos'),
  ('pendente, F3.194', 'compromissos'), ('pendente, F3.194', 'funil_saidas'), ('pendente, F3.194', 'automacao_execucoes'),
  ('pendente, F3.194', 'clientes_sem_avisos');
select is((select array_agg(c.conrelid::regclass::text order by c.conrelid::regclass::text) from pg_constraint c
            where c.contype = 'f' and c.confrelid = 'clientes_escritorio'::regclass),
  (select array_agg(tabela order by tabela) from classes),
  'PT-11 F3.187: as 21 tabelas com chave para clientes_escritorio, cada uma numa classe');
select is((select array_agg(distinct t.tgrelid::regclass::text order by t.tgrelid::regclass::text) from pg_trigger t join pg_proc p on p.oid = t.tgfoid
            where not t.tgisinternal and (t.tgtype & 2) = 2 and (t.tgtype & 4) = 4 and p.prosrc ~* 'clientes_escritorio[^;]*for share'
              and t.tgrelid in (select c.conrelid from pg_constraint c where c.contype = 'f' and c.confrelid = 'clientes_escritorio'::regclass)),
  (select array_agg(tabela order by tabela) from classes where classe = 'nasce com trava'),
  'PT-11 F3.187: "nasce com trava" são exatamente as que têm gatilho BEFORE INSERT com FOR SHARE no cliente');

select * from finish();
rollback;
