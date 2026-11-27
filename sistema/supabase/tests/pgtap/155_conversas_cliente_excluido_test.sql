-- As conversas do WhatsApp do cliente excluído a pedido do titular (1114; F3.157, PT-11, PA-05,
-- PT-03, PT-01). Da conversa fica o esqueleto (datas, autor, quem da equipe, os momentos, o tipo do
-- aviso, a entrega) e sai todo texto (Carol, C1); a conversa com registro de outro cliente fica e
-- religa (C3, caso a), a do número que só aparece na ficha de outro apaga e não religa (caso b), a
-- sem cliente de um contato do excluído apaga (caso c); a apagada some de Conversas e responde 404
-- (C2); os avisos do sino da conversa perdem o texto (revisão, G1); as guardas, o mesmo número que
-- escreve de novo, as leituras, o isolamento e a idempotência.
begin;
select plan(87);

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
-- 1. Estrutura.
select has_column('conversas', 'apagada_em', 'PT-11 F3.157: conversas.apagada_em');
select has_column('conversa_mensagens', 'apagada_em', 'PT-11 F3.157: conversa_mensagens.apagada_em');
select is((select array_agg(conname::text order by conname) from pg_constraint
            where conname in ('conversas_apagada', 'conversa_mensagens_apagada', 'conversa_mensagens_anexo_guardado')),
  array['conversa_mensagens_anexo_guardado', 'conversa_mensagens_apagada', 'conversas_apagada'], 'PT-11 F3.157: os três checks');
select is((select array_agg(tgname::text order by tgname) from pg_trigger
            where tgname in ('conversa_guarda', 'conversa_mensagem_nasce', 'ia_pergunta_nasce', 'conversas_apagar_do_excluido')),
  array['conversa_guarda', 'conversa_mensagem_nasce', 'conversas_apagar_do_excluido', 'ia_pergunta_nasce'], 'PT-11 F3.157: as guardas e o gatilho');
select is((select array_agg(tgname::text order by tgname) from pg_trigger
            where tgrelid = 'clientes_escritorio'::regclass and not tgisinternal and tgname ~ '(apagar_do_excluido|excluido_arquivos)$'),
  array['comercial_apagar_do_excluido', 'conversas_apagar_do_excluido', 'financeiro_apagar_do_excluido', 'financeiro_baixas_apagar_do_excluido',
        'historico_anterior_apagar_do_excluido', 'importacao_apagar_do_excluido', 'sino_apagar_do_excluido', 'z_cliente_excluido_arquivos'],
  'PT-11 F3.157: conversas_apagar_do_excluido roda entre comercial_ e financeiro_, pela ordem do nome (com os da F3.177, da F3.158 e da F3.193)');
select ok((select pg_get_triggerdef(oid) like '%AFTER UPDATE OF estado ON public.clientes_escritorio FOR EACH ROW WHEN (((new.estado = ''EXCLUIDO''::text) AND (old.estado <> ''EXCLUIDO''::text)))%'
             from pg_trigger where tgname = 'conversas_apagar_do_excluido'),
  'PT-11 F3.157: o gatilho é AFTER UPDATE OF estado, só na passagem a EXCLUIDO');
select is((select array_agg(proname::text order by proname) from pg_proc
            where pronamespace = 'public'::regnamespace and prosecdef
              and proname in ('mensagem_apagada_texto', 'pergunta_apagada_texto', 'telefone_chave', 'anexo_apagado', 'conversa_mensagem_cliente',
                              'conversa_de_outro_cliente', 'aviso_sino_dados_religada', 'conversa_guarda', 'conversa_mensagem_nasce',
                              'ia_pergunta_nasce', 'conversas_apagar', 'conversas_houve', 'conversas_apagar_do_excluido',
                              'conversas_preencher_excluidos')),
  null, 'PT-11 F3.157: nenhuma função nova é security definer');
select is(mensagem_apagada_texto() || ' / ' || length(mensagem_apagada_texto()), 'Mensagem apagada a pedido do titular / 36',
  'PT-11 F3.157: o texto fixo da mensagem cabe nos checks');
select is(telefone_chave('+5511981000001'), '+5511981000001', 'PT-11 F3.157: a chave do número é a identidade até a F3.58');

-- ---------------------------------------------------------------------------------------
-- 2. A exclusão que falha não apaga nada.
create function pg_temp.excluir(p_cliente uuid, p_nome text default null) returns jsonb language sql as $$
  select portal_cliente_excluir_dados(case when c.escritorio_id = ids.rm then ids.socia else ids.intrusa end, c.escritorio_id, p_cliente, c.versao,
    jsonb_build_object('pedidoEm', hoje_brasilia(), 'canal', 'TELEFONE', 'quemPediu', 'TITULAR', 'conferido', true,
                       'nomeConfirmado', coalesce(p_nome, c.nome)))
    from clientes_escritorio c, ids where c.id = p_cliente
$$;
select is((teste.erro($$ select pg_temp.excluir((select ana from cli), 'Outro nome') $$)) ->> 'codigo', 'TC422',
  'a exclusão com o nome errado é recusada');
select ok((select telefone is not null and apagada_em is null from conversas, cv where id = cv.ana)
          and not exists (select 1 from conversa_mensagens m, cv where m.conversa_id = cv.ana and m.apagada_em is not null),
  'PT-11 F3.157: a exclusão que falha não apaga nada');

-- ---------------------------------------------------------------------------------------
-- 3. A exclusão de Ana.
select pg_temp.excluir(ana) from cli;

select ok((select telefone is null and contato_id is null and nome_contato is null and papel_contato is null and motivo_texto is null
                  and nota_ia is null and apagada_em = app_now() from conversas, cv where id = cv.ana),
  'PT-11 F3.157: a conversa de Ana fica sem número, contato, nome, papel, motivo escrito e nota');
select ok((select situacao = 'IA' and esperando_desde is null and assumida_por is null and resolvida_em is not null and motivo is not null
                  and responsavel_id is not null and cliente_id = cli.ana from conversas, cv, cli where id = cv.ana),
  'PA-05 F3.157: fica com a IA, fora da fila, com o motivo como categoria, o responsável e o cliente anonimizado');
select is((select versao from conversas, cv where id = cv.ana), (select versao + 1 from antes), 'PT-19 F3.157: a versão da conversa sobe uma vez');
select is((select count(*)::int from conversa_mensagens, cv where conversa_id = cv.ana and apagada_em is not null), (select mensagens from antes),
  'PT-11 F3.157: todas as mensagens ficam apagadas, nenhuma some (PT-03)');
select ok((select bool_and(texto = mensagem_apagada_texto() or (texto is null and anexo is not null)) from conversa_mensagens, cv
            where conversa_id = cv.ana and autor <> 'SISTEMA'),
  'PT-11 F3.157: o texto do cliente, da IA, da equipe e do aviso vira o texto fixo');
select is((select count(*)::int from conversa_mensagens, cv where conversa_id = cv.ana and autor = 'SISTEMA' and texto is not null), 0,
  'PT-11 F3.157: o momento fica sem texto (a nota da devolução e o recado da passagem saem)');
select is((select array_agg(distinct evento order by evento) from conversa_mensagens, cv where conversa_id = cv.ana and autor = 'SISTEMA'),
  array['ASSUMIU', 'DEVOLVEU', 'IA_PASSOU', 'PASSOU', 'SEM_AVISOS_REGISTRADO'], 'PA-05 F3.157: os momentos ficam');
select is((select anexo from conversa_mensagens, cv where conversa_id = cv.ana and autor = 'CLIENTE' and anexo is not null),
  '{"nome": "Arquivo apagado", "tipo": "IMAGEM", "bytes": "2048"}'::jsonb, 'PT-11 F3.157: do anexo ficam o tipo e o tamanho');
select is((select count(*)::int from conversa_mensagens, cv where conversa_id = cv.ana and (dados ? 'campos' or dados ? 'quemPediu')), 0,
  'PT-11 F3.157: os campos do aviso e quem pediu saem');
select ok((select bool_and(dados ? 'compromisso') from conversa_mensagens, cv, comp where conversa_id = cv.ana and dados ->> 'compromisso' = comp.cancelada::text),
  'PA-05 F3.157: o aviso guarda a que compromisso se referia');
select is((select count(*)::int from conversa_mensagens, cv where conversa_id = cv.ana and envio = 'NA_FILA'), 0,
  'PT-11 F3.157: nada fica na fila');
select ok((select bool_and(m.envio = 'FALHOU' and m.envio_motivo = 'O cliente foi excluído a pedido do titular' and w.terminado_em is not null
                           and w.ultimo_erro = 'CLIENTE_EXCLUIDO')
             from conversa_mensagens m join whatsapp_envios w on w.mensagem_id = m.id, msg where m.id = msg.fila),
  'PT-11 F3.157: a mensagem da fila não sai mais, com o motivo, e a entrega termina');
select is((select m.envio || ' ' || w.meta_id from conversa_mensagens m join whatsapp_envios w on w.mensagem_id = m.id, msg where m.id = msg.saiu),
  'ENVIADA wamid.ana1', 'PA-05 F3.157: a que saiu continua enviada, com o id da Meta (prova da entrega)');
select ok((select telefone is null and apagada_em is not null from conversas, cv where id = cv.ze)
          and not exists (select 1 from conversa_mensagens m, cv where m.conversa_id = cv.ze and m.texto not in (mensagem_apagada_texto())),
  'PT-11 F3.157 C3 caso c: a conversa sem cliente de um contato de Ana, sem nada de outro cliente, também apaga');
select ok((select telefone = tel.rosa and apagada_em is null from conversas, cv, tel where id = cv.rosa)
          and (select jsonb_agg(to_jsonb(m) order by m.id) from conversa_mensagens m, cv where m.conversa_id = cv.rosa) = (select rosa_msgs from antes),
  'PT-11 F3.157 C3 caso a: a conversa da mãe, com o lembrete de Bia, fica com o número e as mensagens');
select is((select cliente_id::text || ' ' || nome_contato || ' ' || papel_contato from conversas, cv where id = cv.rosa),
  (select bia::text || ' Rosa Duarte mãe' from cli), 'PT-11 F3.157 C3 caso a: e religa a Bia pela regra de sempre');
select ok(not exists (select 1 from conversas c, cli where c.cliente_id = cli.carla),
  'PT-11 F3.157 C3 caso b: a conversa de Ana não religa a Carla, que só tem o número');
select is((select jsonb_agg(to_jsonb(c) order by c.id) from conversas c, cv where c.id in (cv.davi, cv.fora)), (select outras from antes),
  'PT-01 F3.157: a conversa de Davi e a de Ana no outro escritório não mudam');
select is((select jsonb_agg(to_jsonb(m) order by m.id) from conversa_mensagens m, cv where m.conversa_id in (cv.davi, cv.fora)), (select outras_msgs from antes),
  'PT-01 F3.157: nem as mensagens delas');
select ok(not exists (select 1 from ia_perguntas_sem_resposta, perg where id = perg.pendente),
  'PT-11 F3.157: a pergunta à IA ainda sem resposta sai');
select is((select texto from ia_perguntas_sem_resposta, perg where id = perg.respondida), 'Pergunta apagada a pedido do titular',
  'PT-11 F3.157: a que virou resposta fica com o texto fixo e o elo com a resposta');
select ok((select bool_and(x.situacao = 'FICOU_DE_FORA' and x.proximo_em is null and x.motivo = 'O cliente foi excluído a pedido do titular.')
             from automacao_execucoes x, comp where x.origem_id = comp.ana),
  'PT-11 F3.157: a execução de Ana que andava para, como ficou de fora');
select is((select array_agg(distinct rotulo) from automacao_execucoes x, cli where x.cliente_id = cli.ana), array['Cliente excluído'],
  'PT-11 F3.157: o rótulo de toda execução de Ana vira "Cliente excluído"');
select ok((select bool_and(x.proximo_em is not null and x.rotulo like 'Audiência de Bia%') from automacao_execucoes x, comp where x.origem_id = comp.bia),
  'PT-01 F3.157: a execução de Bia continua');
select ok((select bool_and(resumo = 'Ana quer o divórcio; mandar a proposta' and com_quem is null and canal = 'WHATSAPP') from atendimentos, cli
            where cliente_id = cli.ana),
  'PT-11 F3.157: o atendimento da devolução fica com o resumo e sem com quem se falou (decisão de 18/11)');
select is((select dados from historico, cli where acao = 'cliente.conversas_apagadas' and entidade_id = cli.ana::text),
  jsonb_build_object('conversas', 2, 'mensagens', (select mensagens from antes) + 2, 'naFila', (select fila from antes), 'ficaram', 1,
                     'automacoes', 1, 'rotulos', (select count(*)::int from automacao_execucoes x, cli where x.cliente_id = cli.ana),
                     'perguntas', 2, 'avisos', (select count(*)::int from avisos_sino a, cv where a.origem_tabela = 'conversas' and a.origem_id in (cv.ana, cv.ze, cv.rosa))),
  'PT-11 F3.157: o evento cliente.conversas_apagadas conta tudo, só com números');
select ok((select bool_and(not historico_tem_dado_proibido(dados) and dados::text not like '%Ana%') from historico where acao = 'cliente.conversas_apagadas'),
  'PT-11 F3.157: o evento não tem dado pessoal');

-- Os avisos do sino da conversa (revisão, G1).
select ok((select bool_and(a.dados ->> 'conversa' = 'Cliente excluído'
                           and not (a.dados ?| array['contato', 'trecho', 'recado', 'arquivo', 'texto']))
             from avisos_sino a, cv where a.origem_tabela = 'conversas' and a.origem_id in (cv.ana, cv.ze)),
  'PT-11 F3.157: os avisos da conversa apagada ficam sem o nome, o contato, o trecho e o recado');
select ok((select bool_and(a.dados ? 'motivo' or a.tipo <> 'CONVERSA_IA') from avisos_sino a, cv where a.origem_id in (cv.ana, cv.ze)),
  'PT-11 F3.157: e com o motivo (o Sino.tsx mostra o motivo no lugar do trecho)');
select is((select string_agg(distinct a.dados ->> 'conversa', ',') from avisos_sino a, cv where a.origem_id = cv.rosa), 'Bia Duarte Lima',
  'PT-11 F3.157 C3 caso a: o aviso da conversa que fica troca o nome de Ana pelo de agora');
select is((select count(*)::int from avisos_sino a, ids, tel, cv where a.escritorio_id = ids.rm and a.origem_id is distinct from cv.rosa
            and (a.dados::text like '%Ana Lima%' or a.dados::text like '%' || tel.ana || '%' or a.dados::text like '%CPF%' or a.dados::text like '%RG%'
                 or a.dados::text like '%Zé%' or a.dados::text like '%endereço%')), 0,
  'PT-11 F3.157: fora da conversa que fica (caso a), nenhum aviso do sino guarda o nome, o número, o trecho ou o recado');

-- ---------------------------------------------------------------------------------------
-- 4. As guardas.
select is((teste.erro($$ update conversas set nome_contato = 'Ana' where id = (select ana from cv) $$)) ->> 'codigo', 'TC023',
  'PT-03 F3.157: o nome não volta à conversa apagada');
select is((teste.erro($$ update conversas set telefone = '+5511981000001' where id = (select ana from cv) $$)) ->> 'codigo', 'TC023',
  'PT-03 F3.157: nem o número');
select is((teste.erro($$ update conversas set cliente_id = (select bia from cli) where id = (select ana from cv) $$)) ->> 'codigo', 'TC023',
  'PT-03 F3.157: nem muda de cliente');
select is((teste.erro($$ update conversas set situacao = 'PRECISA', esperando_desde = now(), responsavel_razao = 'PASSADA' where id = (select ana from cv) $$)) ->> 'codigo',
  'TC023', 'PT-03 F3.157: nem sai da IA');
select is((teste.erro($$ delete from conversas where id = (select ana from cv) $$)) ->> 'codigo', 'TC023', 'PT-03 F3.157: a conversa apagada não se apaga');
select is((teste.erro($$ update conversa_mensagens set texto = 'outro' where conversa_id = (select ana from cv) and autor = 'CLIENTE' $$)) ->> 'codigo',
  'TC023', 'PT-03 F3.157: o texto da mensagem apagada não muda');
select is((teste.erro($$ update conversa_mensagens set anexo = '{"nome":"rg.jpg","tipo":"IMAGEM"}' where conversa_id = (select ana from cv) and anexo is not null $$))
  ->> 'codigo', 'TC023', 'PT-03 F3.157: nem o anexo');
select is((teste.erro($$ delete from conversa_mensagens where conversa_id = (select ana from cv) $$)) ->> 'codigo', 'TC023',
  'PT-03 F3.157: a mensagem apagada não se apaga');
select is((teste.erro($$ update conversa_mensagens set texto = mensagem_apagada_texto(), apagada_em = app_now() where conversa_id = (select davi from cv) $$))
  ->> 'codigo', 'TC023', 'PT-03 F3.157: mensagem de conversa que não foi apagada não se apaga');
select is((teste.erro($$ insert into conversa_mensagens (escritorio_id, conversa_id, autor, texto) select rm, cv.ana, 'CLIENTE', 'Oi' from ids, cv $$))
  ->> 'codigo', 'TC404', 'PA-05 F3.157: mensagem nova na conversa apagada: conversa não encontrada');
select is((teste.erro($$ select conversa_ia_respondeu(rm, cv.ana, 'Olá') from ids, cv $$)) ->> 'codigo', 'TC404',
  'PA-05 F3.157: a IA não responde na apagada');
select is((teste.erro($$ select conversa_ia_passou(rm, cv.ana, 'OUTRO', 'x') from ids, cv $$)) ->> 'codigo', 'TC023',
  'PA-05 F3.157: nem passa');
select is((teste.erro($$ select conversa_ia_nao_soube(rm, cv.ana, 'Pergunta nova') from ids, cv $$)) ->> 'codigo', 'TC404',
  'PA-05 F3.157: nem grava a pergunta (revisão, M1)');
select is((teste.erro($$ insert into ia_perguntas_sem_resposta (escritorio_id, conversa_id, texto) select rm, cv.ana, 'x' from ids, cv $$)) ->> 'codigo',
  'TC404', 'PA-05 F3.157: a guarda da pergunta também vale para a inserção direta');
create function pg_temp.estado(p_sql text) returns text language plpgsql as $f$
begin
  execute p_sql;
  return null;
exception when others then
  return sqlstate;
end $f$;
select is(pg_temp.estado($$ insert into conversa_mensagens (escritorio_id, conversa_id, autor, anexo)
                          select rm, cv.davi, 'CLIENTE', '{"nome":"foto.jpg","tipo":"IMAGEM","bytes":"10","caminho":"x/y.jpg"}' from ids, cv $$),
  '23514', 'PT-11 F3.157: anexo com caminho fora do AVISO é recusado (alarme para a F3.58)');
select is(whatsapp_envio_situacao('109876543210', 'wamid.ana1', 'ENTREGUE'), true, 'PA-05 F3.157: a Meta ainda conta a entrega da mensagem apagada');
select is((select envio || ' ' || texto from conversa_mensagens, msg where id = msg.saiu), 'ENTREGUE Mensagem apagada a pedido do titular',
  'PA-05 F3.157: a situação anda e o texto continua apagado');

-- Chamada de novo antes de o número escrever outra vez, não acha nada.
select is(conversas_apagar((select rm from ids), (select ana from cli), array[(select ana from tel), (select ze from tel), (select rosa from tel)], 'Ana Lima Duarte'),
  '{"conversas": 0, "mensagens": 0, "naFila": 0, "ficaram": 0, "automacoes": 0, "rotulos": 0, "perguntas": 0, "avisos": 0}'::jsonb,
  'PT-11 F3.157: chamada de novo, não acha nada (idempotente)');

-- ---------------------------------------------------------------------------------------
-- 5. O mesmo número escreve de novo.
create temp table depois as select whatsapp_mensagem_recebida(rm, tel.ana, 'Ana L.', 'Oi de novo') ana,
  whatsapp_mensagem_do_app(rm, tel.ze, 'Respondido pelo celular') ze from ids, tel;
select ok((select depois.ana <> cv.ana and depois.ze <> cv.ze from depois, cv),
  'PA-05 F3.157: o número de Ana e o do tio abrem conversas novas, sem ligação com as apagadas');
select is((select nome_contato || ' ' || coalesce(cliente_id::text, '-') from conversas, depois where id = depois.ana), 'Ana Lima ' || (select carla from cli),
  'PA-05 F3.157: a nova do número de Ana segue a regra de sempre (Carla tem o número na ficha)');
select is((select coalesce(cliente_id::text, 'sem cliente') from conversas, depois where id = depois.ze), 'sem cliente',
  'PA-05 F3.157: a nova do tio nasce sem cliente');
select is((select jsonb_agg(c ->> 'id') from ids, jsonb_array_elements(portal_conversas(socia, rm, 'PRECISA', '981000001') -> 'conversas') c),
  (select jsonb_build_array(ana::text) from depois), 'PA-05 F3.157: a busca pelo número acha só a nova');

-- ---------------------------------------------------------------------------------------
-- 6. As leituras (C2: a apagada some de Conversas).
create temp table listas as select f, portal_conversas(socia, rm, f) j from ids, unnest(array['PRECISA', 'EQUIPE', 'IA', 'RESOLVIDAS']) f;
select is((select count(*)::int from listas, jsonb_array_elements(j -> 'conversas') c, cv where (c ->> 'id')::uuid in (cv.ana, cv.ze)), 0,
  'PA-05 F3.157: a conversa apagada não aparece em nenhum filtro');
select is((select (j -> 'contagem' ->> 'resolvidas')::int from listas where f = 'IA'),
  (select count(*)::int from conversas, ids where escritorio_id = ids.rm and situacao = 'IA' and resolvida_em >= inicio_do_dia(hoje_brasilia()) and apagada_em is null),
  'PA-05 F3.157: nem nas contagens');
select is((select count(*)::int from ids, jsonb_array_elements(portal_conversas(socia, rm, 'IA', 'Cliente excluído') -> 'conversas') c), 0,
  'PA-05 F3.157: nem na busca pelo nome');
select is((teste.erro($$ select portal_conversa(socia, rm, cv.ana) from ids, cv $$)) ->> 'codigo', 'TC404', 'PA-05 F3.157: abrir a apagada dá 404');
select is((teste.erro($$ select portal_conversa_assumir(socia, rm, cv.ana, 1) from ids, cv $$)) ->> 'codigo', 'TC404', 'PA-05 F3.157: assumir dá 404');
select is((teste.erro($$ select portal_conversa_devolver(socia, rm, cv.ana, 1, '{}') from ids, cv $$)) ->> 'codigo', 'TC404', 'PA-05 F3.157: devolver dá 404');
select is((teste.erro($$ select portal_conversa_passar(socia, rm, cv.ana, 1, jsonb_build_object('pessoa', ids.diego)) from ids, cv $$)) ->> 'codigo', 'TC404',
  'PA-05 F3.157: passar dá 404');
select is((teste.erro($$ select portal_conversa_enviar(diego, rm, cv.ana, '{"texto":"Oi"}') from ids, cv $$)) ->> 'codigo', 'TC404',
  'PA-05 F3.157: escrever dá 404');
select is((teste.erro($$ select portal_conversa_contato(socia, rm, cv.ze) from ids, cv $$)) ->> 'codigo', 'TC404',
  'PA-05 F3.157: o contato da apagada para o cadastro dá 404');
select is((teste.erro($$ select ia_atendimento(rm, cv.ana) from ids, cv $$)) ->> 'codigo', 'TC404', 'PA-05 F3.157: o atendimento da IA dá 404');
select is((teste.erro($$ select portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'origem', 'GOOGLE', 'nome', 'Zé Duarte',
                          'conversaId', cv.ze, 'contatos', jsonb_build_array(jsonb_build_object('nome', 'Zé', 'telefone', '+5511981000077', 'principal', true))))
                          from ids, cv $$)) ->> 'codigo', 'TC404',
  'PA-05 F3.157: a apagada não se liga a uma ficha nova (revisão, m4)');
select is((select count(*)::int from ids, jsonb_array_elements(portal_avisos_automaticos(socia, rm) -> 'itens') i, cv
            where (i ->> 'conversaId')::uuid in (cv.ana, cv.ze) or i -> 'para' = 'null'::jsonb), 0,
  'PA-05 F3.157: os avisos automáticos não mostram a conversa apagada');
create temp table ficha as select portal_compromisso(socia, rm, comp.ana) a, portal_compromisso(socia, rm, comp.cancelada) b,
  portal_compromisso(socia, rm, comp.ze) z from ids, comp;
select ok((select a -> 'lembretes' -> 'resposta' = 'null'::jsonb and a -> 'lembretes' -> 'conversaId' = 'null'::jsonb from ficha),
  'PA-05 F3.157: a ficha do compromisso não mostra a resposta nem o link da conversa apagada');
select ok((select b #> '{cancelamento,aviso,mensagem}' ? 'id' and b #> '{cancelamento,aviso,mensagem,conversaId}' = 'null'::jsonb from ficha),
  'PA-05 F3.157: o aviso de cancelamento fica, sem o link (revisão, m4)');
select ok((select z -> 'conversa' = 'null'::jsonb from ficha), 'PA-05 F3.157: a reunião marcada pela conversa apagada fica sem a conversa');
select is((select count(*)::int from ids, jsonb_array_elements(portal_ia(socia, rm) -> 'naoSoube') q, cv where (q #>> '{conversa,id}')::uuid = cv.ana), 0,
  'PA-05 F3.157: a tela da IA não mostra a pergunta da apagada');

-- ---------------------------------------------------------------------------------------
-- 7. Isolamento e retirada.
select is((teste.erro($$ select portal_conversa(intrusa, outro, cv.ana) from ids, cv $$)) ->> 'codigo', 'TC404',
  'PT-01 F3.157: a intrusa não acha a conversa');
select portal_retirar(socia, rm, vinc.vd, (select versao from vinculos where id = vinc.vd), socia) from ids, vinc;
select is((select responsavel_id from conversas, cv where id = cv.ana), (select socia from ids),
  'EX-10 F3.157: quem sai da equipe passa também a conversa apagada, sem momento novo');

-- ---------------------------------------------------------------------------------------
-- 8. Inventário (PT-11): os textos novos cabem nas 200 letras (revisão, M4).
select ok((select bool_and(length(no_fim) <= 200 and no_fim like '%A pedido do titular%' and situacao = 'APROVADO') from inventario_dados
            where tabela in ('conversas', 'conversa_mensagens', 'ia_perguntas_sem_resposta', 'automacao_execucoes', 'avisos_sino')),
  'PT-11 F3.157 inventário: as cinco tabelas dizem o que sai a pedido do titular, com até 200 letras');

select * from finish();
rollback;
