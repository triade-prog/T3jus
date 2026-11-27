-- A contagem das conversas do WhatsApp na janela de exclusão a pedido do titular (1141; F3.190,
-- PT-11, PA-05): cliente_conversas_para_apagar repete o predicado de conversas_apagar (1114), e o que
-- a janela diz antes bate com o que a exclusão faz depois (cliente.conversas_apagadas); a conversa
-- que fica com outro cliente (C3 da F3.157) e quem é esse cliente (ficamCom, C6); a mensagem na fila
-- e a automação em andamento; conversa_de_outro_cliente lê de conversa_outros_clientes (revisão, b4)
-- com o mesmo resultado; quem não é a dona não recebe; o isolamento entre escritórios. O cenário é o
-- do pgTAP 155.
begin;
select plan(17);

select ajustar_relogio(('2026-12-10 09:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Intrusa Souza') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
create temp table vinc as select portal_convidar(socia, rm, diego, 'Diego Almeida', array['COMERCIAL']) vd from ids;
update pessoas set senha_criada_em = now() where nome = 'Diego Almeida';

-- Os números: Ana, a mãe Rosa (contato de Ana e de Bia), o tio Zé (contato de Ana, que escreveu
-- antes do cadastro), Carla (que tem o número de Ana na ficha) e Davi.
create temp table tel as select '+5511981000001'::text ana, '+5511981000009'::text rosa, '+5511981000007'::text ze,
  '+5511981000003'::text carla, '+5511981000004'::text davi;

select whatsapp_meta_ligou(rm, socia, '{"telefone":"+5511974052210","nomeExibicao":"Ribeiro & Matos","numeroId":"109876543210"}') from ids;
select whatsapp_meta_ligou(outro, intrusa, '{"telefone":"+5511974052299","nomeExibicao":"Outro","numeroId":"109876543299"}') from ids;
select portal_automacoes(socia, rm) from ids;

create function pg_temp.cli(p_pessoa uuid, p_esc uuid, p_nome text, p_contatos jsonb) returns uuid language sql as $$
  select (portal_cliente_cadastrar(p_pessoa, p_esc, jsonb_build_object('tipo', 'PF', 'origem', 'GOOGLE', 'nome', p_nome,
    'contatos', p_contatos)) ->> 'id')::uuid
$$;
create function pg_temp.ct(p_nome text, p_tel text, p_principal boolean, p_papel text default null) returns jsonb language sql as $$
  select jsonb_strip_nulls(jsonb_build_object('nome', p_nome, 'telefone', p_tel, 'principal', p_principal, 'papel', p_papel))
$$;

-- O tio escreve antes de Ana ser cliente (a conversa fica sem cliente).
create temp table cv as select whatsapp_mensagem_recebida(rm, tel.ze, 'Zé', 'Sou o tio da Ana Lima, ela pediu para eu mandar o endereço') ze
  from ids, tel;
create temp table cli as select pg_temp.cli(socia, rm, 'Ana Lima Duarte', jsonb_build_array(
    pg_temp.ct('Ana Lima Duarte', tel.ana, true), pg_temp.ct('Rosa Duarte', tel.rosa, false, 'mãe'), pg_temp.ct('Zé Duarte', tel.ze, false, 'tio'))) ana
  from ids, tel;
-- Ana escreve com a foto do RG; a mãe escreve (o número ainda é só de Ana: a conversa fica com Ana).
alter table cv add column ana uuid, add column rosa uuid, add column davi uuid, add column fora uuid;
update cv set ana = whatsapp_mensagem_recebida(ids.rm, tel.ana, 'Ana', 'Oi, aqui é a Ana Lima, meu CPF é 123.456.789-09',
                                                '{"nome":"rg-ana-lima.jpg","tipo":"IMAGEM","bytes":"2048"}'::jsonb),
              rosa = whatsapp_mensagem_recebida(ids.rm, tel.rosa, 'Rosa', 'Sou a mãe da Ana, ela está internada')
  from ids, tel;
-- Bia (contato principal: a mãe), Carla (com o número de Ana na ficha) e Davi.
alter table cli add column bia uuid, add column carla uuid, add column davi uuid, add column fora uuid;
update cli set bia = pg_temp.cli(ids.socia, ids.rm, 'Bia Duarte Lima', jsonb_build_array(pg_temp.ct('Rosa Duarte', tel.rosa, true, 'mãe'))),
               carla = pg_temp.cli(ids.socia, ids.rm, 'Carla Nunes', jsonb_build_array(pg_temp.ct('Carla Nunes', tel.carla, true),
                                                                                         pg_temp.ct('Ana Lima', tel.ana, false, 'amiga'))),
               davi = pg_temp.cli(ids.socia, ids.rm, 'Davi Prado', jsonb_build_array(pg_temp.ct('Davi Prado', tel.davi, true))),
               fora = pg_temp.cli(ids.intrusa, ids.outro, 'Ana Lima Duarte', jsonb_build_array(pg_temp.ct('Ana Lima Duarte', tel.ana, true)))
  from ids, tel;
update cv set davi = whatsapp_mensagem_recebida(ids.rm, tel.davi, 'Davi', 'Bom dia'),
              fora = whatsapp_mensagem_recebida(ids.outro, tel.ana, 'Ana', 'Oi, aqui é a Ana Lima do outro escritório')
  from ids, tel;

-- A conversa de Ana: a IA passa (para Diego, do Comercial), a sócia assume e passa com recado,
-- Diego assume, escreve (sai pela Meta), escreve de novo (fica na fila) e devolve registrando o
-- atendimento; o pedido de não receber cobrança pela conversa; duas perguntas à IA.
select conversa_ia_passou(rm, cv.ana, 'PEDIU_PESSOA', 'Ana Lima quer falar do divórcio') from ids, cv;
select portal_conversa_assumir(socia, rm, cv.ana, (select versao from conversas where id = cv.ana)) from ids, cv;
select portal_conversa_passar(socia, rm, cv.ana, (select versao from conversas where id = cv.ana),
  jsonb_build_object('pessoa', ids.diego, 'recado', 'A Ana mandou o RG, confere')) from ids, cv;
select portal_conversa_assumir(diego, rm, cv.ana, (select versao from conversas where id = cv.ana)) from ids, cv;
create temp table msg as select (portal_conversa_enviar(diego, rm, cv.ana, '{"texto":"Ana, recebi seu RG"}') ->> 'id')::uuid saiu from ids, cv;
select rotina_whatsapp_pendentes(20);
select rotina_whatsapp_registrar(rm, msg.saiu, true, 'wamid.ana1') from ids, msg;
alter table msg add column fila uuid;
update msg set fila = (portal_conversa_enviar(ids.diego, ids.rm, cv.ana, '{"texto":"Ana, falta a certidão"}') ->> 'id')::uuid from ids, cv;
select portal_conversa_devolver(diego, rm, cv.ana, (select versao from conversas where id = cv.ana),
  '{"nota":"Ana quer o divórcio; mandar a proposta","registrarAtendimento":true}') from ids, cv;
select portal_cliente_sem_avisos(socia, rm, cli.ana, jsonb_build_object('tipo', 'COBRANCA', 'origem', 'CONVERSA', 'conversaId', cv.ana,
  'canal', 'WHATSAPP', 'quem', 'OUTRA', 'quemPediu', 'Rosa Duarte', 'pedidoEm', '2026-12-10')) from ids, cli, cv;
create temp table perg as select conversa_ia_nao_soube(rm, cv.ana, 'Quanto custa o divórcio da Ana Lima?') pendente,
  conversa_ia_nao_soube(rm, cv.ana, 'Vocês atendem no sábado?') respondida from ids, cv;
select portal_ia_resposta_salvar(socia, rm, jsonb_build_object('pergunta', 'Sábado', 'resposta', 'Não atendemos aos sábados.',
  'perguntaId', perg.respondida)) from ids, perg;
-- A IA passa a conversa da mãe (ligada a Ana) e a do tio (sem cliente): avisos no sino com o nome e o trecho.
select conversa_ia_passou(rm, cv.rosa, 'URGENCIA', 'A mãe da Ana avisou da internação') from ids, cv;
select conversa_ia_passou(rm, cv.ze, 'OUTRO', 'O tio da Ana mandou o endereço') from ids, cv;

-- Compromissos: a audiência de Ana com lembrete (que ela responde), uma reunião de Ana cancelada
-- com aviso (campos no aviso), a audiência de Bia com lembrete (vai para a mãe, na conversa ligada a
-- Ana: é o registro de Bia nela) e uma reunião marcada pela conversa do tio.
create function pg_temp.comp(p_cliente uuid, p_titulo text, p_inicio text, p_lembrete boolean, p_conversa uuid default null) returns uuid
language sql as $$
  select (portal_compromisso_marcar(ids.socia, ids.rm, jsonb_strip_nulls(jsonb_build_object('tipo', 'AUDIENCIA', 'titulo', p_titulo,
    'inicio', p_inicio, 'fim', (p_inicio::timestamptz + interval '1 hour')::text, 'modalidade', 'PRESENCIAL', 'local', 'Fórum Central',
    'clienteId', p_cliente, 'responsavelId', ids.socia, 'lembrete', p_lembrete, 'conversaId', p_conversa))) ->> 'id')::uuid from ids
$$;
create temp table comp as select
  pg_temp.comp(cli.ana, 'Audiência do divórcio de Ana Lima', '2026-12-15T10:00:00-03:00', true) ana,
  pg_temp.comp(cli.ana, 'Reunião com Ana Lima', '2026-12-18T10:00:00-03:00', false) cancelada,
  pg_temp.comp(cli.bia, 'Audiência de Bia', '2026-12-15T11:00:00-03:00', true) bia,
  pg_temp.comp(null, 'Primeira reunião com o tio', '2026-12-16T10:00:00-03:00', false, cv.ze) ze
  from cli, cv;
select portal_compromisso_cancelar(socia, rm, comp.cancelada, (select versao from compromissos where id = comp.cancelada),
  'A cliente desmarcou', true) from ids, comp;
select ajustar_relogio(('2026-12-14 11:30-03'::timestamptz - now()));
select automacoes_rodar();
select whatsapp_mensagem_recebida(rm, tel.ana, 'Ana', 'CONFIRMO, Ana Lima estará lá') from ids, tel;

create temp table antes as select
  (select versao from conversas, cv where id = cv.ana) versao,
  (select count(*)::int from conversa_mensagens, cv where conversa_id = cv.ana) mensagens,
  (select count(*)::int from conversa_mensagens, cv where conversa_id = cv.ana and envio = 'NA_FILA') fila,
  (select to_jsonb(c) from conversas c, cv where c.id = cv.rosa) rosa,
  (select jsonb_agg(to_jsonb(m) order by m.id) from conversa_mensagens m, cv where m.conversa_id = cv.rosa) rosa_msgs,
  (select jsonb_agg(to_jsonb(c) order by c.id) from conversas c, cv where c.id in (cv.davi, cv.fora)) outras,
  (select jsonb_agg(to_jsonb(m) order by m.id) from conversa_mensagens m, cv where m.conversa_id in (cv.davi, cv.fora)) outras_msgs;

-- O cenário está montado como se espera.
select ok((select cliente_id = cli.ana from conversas, cv, cli where id = cv.ana)
          and (select cliente_id = cli.ana from conversas, cv, cli where id = cv.rosa)
          and (select cliente_id is null from conversas, cv where id = cv.ze),
  'cenário: a conversa de Ana e a da mãe ligadas a Ana; a do tio sem cliente');
select ok((select count(*) >= 1 from conversa_mensagens m, cv where m.conversa_id = cv.rosa and m.autor = 'AVISO'
            and conversa_mensagem_cliente(m) = (select bia from cli)),
  'cenário: o lembrete de Bia foi para a mãe, na conversa ligada a Ana (registro de Bia)');
select ok((select fila >= 2 from antes) and exists (select 1 from automacao_execucoes x, cli where x.cliente_id = cli.ana and x.proximo_em is not null),
  'cenário: mensagens na fila e uma execução de Ana andando');
select ok((select count(*) = 2 from avisos_sino a, cv where a.origem_tabela = 'conversas' and a.origem_id = cv.ana and a.dados ? 'conversa')
          and exists (select 1 from avisos_sino a, cv where a.origem_id = cv.ze and a.dados ? 'trecho'),
  'cenário: avisos do sino das conversas, com o trecho e o recado');

-- ---------------------------------------------------------------------------------------
-- 1. Uma fonte só para "os outros clientes da conversa" (revisão, b4).
select ok((select bool_and(conversa_de_outro_cliente(c, cli.ana) = exists (select 1 from conversa_outros_clientes(c, cli.ana)))
             from conversas c, cli),
  'F3.190 (revisão, b4): conversa_de_outro_cliente é "existe algum" em conversa_outros_clientes');
select is((select array_agg(x) from conversas c, cv, cli, conversa_outros_clientes(c, cli.ana) x where c.id = cv.rosa),
  (select array[bia] from cli), 'F3.190: a conversa da mãe guarda o registro de Bia');

-- ---------------------------------------------------------------------------------------
-- 2. O que a janela diz antes.
create temp table janela as select cliente_conversas_para_apagar(rm, cli.ana) j from ids, cli;
select is((select j - 'ficamCom' from janela),
  jsonb_build_object('conversas', 2, 'naFila', (select fila from antes), 'automacoes',
                     (select count(*)::int from automacao_execucoes x, cli where x.cliente_id = cli.ana and x.proximo_em is not null),
                     'ficam', 1, 'ficamComMais', 0),
  'F3.190: saem a conversa de Ana e a do tio (sem cliente, número dos contatos); fica a da mãe; a fila e a automação de Ana');
select is((select j -> 'ficamCom' from janela), (select jsonb_build_array(jsonb_build_object('id', bia, 'nome', 'Bia Duarte Lima')) from cli),
  'F3.190 C6: a conversa que fica guarda o registro de Bia, que a dona vê pelo nome');
select is((select portal_cliente(socia, rm, cli.ana) -> 'conversasParaApagar' from ids, cli), (select j from janela),
  'F3.190: a ficha da dona traz a contagem');
select ok((select not (portal_cliente(diego, rm, cli.ana) ? 'conversasParaApagar') from ids, cli), 'F3.190: quem não é a dona não recebe');
select is((select cliente_conversas_para_apagar(rm, cli.carla) from ids, cli),
  '{"conversas": 0, "naFila": 0, "automacoes": 0, "ficam": 0, "ficamCom": [], "ficamComMais": 0}'::jsonb,
  'F3.190: sem conversa, tudo zero (a de Ana, com o número dela na ficha de Carla, é de Ana)');
select is((select cliente_conversas_para_apagar(outro, cli.fora) ->> 'conversas' from ids, cli), '1',
  'PT-01: no outro escritório, só a conversa de lá');
select is((select cliente_conversas_para_apagar(rm, cli.fora) ->> 'conversas' from ids, cli), '0',
  'PT-01: o cliente de outro escritório não acha conversa daqui');

-- ---------------------------------------------------------------------------------------
-- 3. A exclusão faz o que a janela disse (quem mudar conversas_apagar confere esta contagem).
create function pg_temp.excluir(p_cliente uuid) returns jsonb language sql as $$
  select portal_cliente_excluir_dados(ids.socia, c.escritorio_id, p_cliente, c.versao,
    jsonb_build_object('pedidoEm', hoje_brasilia(), 'canal', 'TELEFONE', 'quemPediu', 'TITULAR', 'conferido', true, 'nomeConfirmado', c.nome))
    from clientes_escritorio c, ids where c.id = p_cliente
$$;
select pg_temp.excluir(ana) from cli;
create temp table feito as select h.dados d from historico h, cli where h.acao = 'cliente.conversas_apagadas' and h.entidade_id = cli.ana::text;
select is((select jsonb_build_object('conversas', d -> 'conversas', 'naFila', d -> 'naFila', 'automacoes', d -> 'automacoes', 'ficam', d -> 'ficaram') from feito),
  (select j - 'ficamCom' - 'ficamComMais' from janela), 'F3.190 (R8): a contagem da janela bate com o que conversas_apagar fez');
select is((select count(*)::int from conversas c, cv where c.id in (cv.ana, cv.ze) and c.apagada_em is not null), 2, 'as duas conversas saíram');
select ok((select apagada_em is null and telefone is not null from conversas, cv where id = cv.rosa), 'e a da mãe ficou, com o número');
select is((select cliente_conversas_para_apagar(rm, cli.ana) ->> 'conversas' from ids, cli), '0', 'F3.190: depois, nada mais a apagar');

select * from finish();
rollback;
