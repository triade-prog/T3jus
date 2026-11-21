-- O aviso de mudança de etapa a cada cliente do caso (F3.37, EX-14) e a prestação de contas
-- pela fila do WhatsApp do escritório (F3.44, FI-12): cada cliente recebe o aviso "Etapa do
-- caso" no próprio número, com o meio sem dobrar; o ajustado só desta vez vale; a ficha mostra
-- para quem saiu; a automação desligada não manda; a prestação revisada entra na fila com os
-- campos do aviso da Meta, não sai duas vezes e a automação não manda outra.
begin;
select plan(24);

select ajustar_relogio(('2026-12-01 10:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Diego Almeida') as diego,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.pessoa('Ivo Outro') as ivo,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(ivo, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, diego, 'Diego Almeida', array['JURIDICO', 'FINANCEIRO']) from ids;

create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Benedito Souza Lima', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Benedito Souza Lima', 'telefone', '+5511996027736', 'principal', true)))) ->> 'id')::uuid ben,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Antônia Ferreira Prado', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Joana Prado', 'papel', 'filha', 'telefone', '+5511996027732', 'principal', true)))) ->> 'id')::uuid ant,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Eduardo Nascimento', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Eduardo Nascimento', 'telefone', '+551130324410', 'principal', true)))) ->> 'id')::uuid edu
  from ids;

select portal_juridico_etapas(socia, rm), portal_juridico_etapas(ivo, outro) from ids;
create temp table cs as select
  (portal_juridico_caso_criar(diego, rm, jsonb_build_object('nome', 'Herdeiros x Banco Sul', 'area', 'CIVEL', 'parteContraria', 'Banco Sul S.A.',
     'etapaId', (select id from etapas e where e.escritorio_id = ids.rm and e.ordem = 1), 'responsavelId', ids.diego,
     'clientes', jsonb_build_array(jsonb_build_object('clienteId', cli.ben, 'papel', 'AUTOR'), jsonb_build_object('clienteId', cli.ant, 'papel', 'AUTOR'),
                                   jsonb_build_object('clienteId', cli.edu, 'papel', 'INTERESSADO')))) ->> 'id')::uuid id
  from ids, cli;
create function pg_temp.etapa(p_ordem integer, p_dados jsonb default '{}') returns jsonb
language sql as $$
  select portal_juridico_caso_etapa(ids.diego, ids.rm, cs.id, c.versao, jsonb_build_object(
    'etapaId', (select e.id from etapas e where e.escritorio_id = ids.rm and e.ordem = p_ordem), 'motivo', 'Andou no processo.', 'avisar', true) || p_dados)
    from ids, cs, casos c where c.id = cs.id
$$;

-- O WhatsApp ligado e as automações prontas.
select whatsapp_meta_ligou(rm, socia, '{"telefone":"+5511974052210","nomeExibicao":"Ribeiro & Matos"}') from ids;
select portal_automacoes(socia, rm) from ids;

-- Mudar para a etapa 2, com aviso.
select ajustar_relogio(('2026-12-01 10:05-03'::timestamptz - now()));
create temp table m1 as select pg_temp.etapa(2) r;
select is((select r ->> 'aviso' from m1),
  (select 'Olá, Benedito. Aqui é do escritório Ribeiro & Matos. Novidade no caso Herdeiros x Banco Sul: ' || e.texto_cliente || ' Qualquer dúvida, é só responder esta mensagem.'
     from etapas e, ids where e.escritorio_id = ids.rm and e.ordem = 2),
  'o aviso guardado é o "Etapa do caso" do primeiro cliente, como ele recebe');
select is((select m.aviso_meio from caso_etapa_mudancas m join cs on cs.id = m.caso_id order by m.ordem desc limit 1),
  (select e.texto_cliente from etapas e, ids where e.escritorio_id = ids.rm and e.ordem = 2), 'o meio do aviso fica guardado à parte');

select ajustar_relogio(('2026-12-01 10:15-03'::timestamptz - now()));
select automacoes_rodar();
create temp table msgs as
  select c.telefone, m.texto, m.envio, m.aviso_tipo from conversa_mensagens m join conversas c on c.id = m.conversa_id, ids
   where m.escritorio_id = ids.rm and m.autor = 'AVISO';
select is((select count(*)::integer from msgs), 2, 'dois avisos: Benedito e a filha de Antônia (Eduardo só tem fixo)');
select is((select texto from msgs where telefone = '+5511996027732'),
  (select 'Olá, Joana. Aqui é do escritório Ribeiro & Matos. Novidade no caso Herdeiros x Banco Sul: ' || e.texto_cliente || ' Qualquer dúvida, é só responder esta mensagem.'
     from etapas e, ids where e.escritorio_id = ids.rm and e.ordem = 2),
  'Antônia recebe no número da filha, com o primeiro nome dela, e o texto da etapa não sai dobrado');
select is((select envio from msgs where telefone = '+5511996027736'), 'NA_FILA', 'o aviso entra na fila da conversa');
select ok((select texto from msgs where telefone = '+5511996027736') like 'Olá, Benedito.%', 'Benedito recebe com o nome dele');

create temp table fi as select portal_juridico_caso(diego, rm, cs.id) f from ids, cs;
select is((select jsonb_array_length(f -> 'mudancas' -> 0 -> 'envios') from fi), 3, 'a ficha mostra os três clientes da mudança');
select is((select f -> 'mudancas' -> 0 -> 'envios' -> 0 -> 'mensagem' ->> 'envio' from fi), 'NA_FILA', 'o de Benedito está na fila');
select is((select f -> 'mudancas' -> 0 -> 'envios' -> 2 ->> 'motivo' from fi), 'Sem WhatsApp no contato principal da ficha.',
  'o de Eduardo diz por que não saiu');
select is((select f -> 'avisoEtapa' from fi), '{"whatsappLigado": true, "automacaoLigada": true}'::jsonb, 'a ficha sabe que o aviso sai');

-- Rodar de novo não manda outra vez.
select automacoes_rodar();
select is((select count(*)::integer from conversa_mensagens m, ids where m.escritorio_id = ids.rm and m.autor = 'AVISO'), 2, 'rodar de novo não repete');

-- Ajustado só desta vez: o meio ajustado vale para todos.
select pg_temp.etapa(3, '{"textoAviso":"o juiz marcou a audiência e vamos avisar a data."}');
select ajustar_relogio(('2026-12-01 10:30-03'::timestamptz - now()));
select automacoes_rodar();
select is((select m.texto from conversa_mensagens m join conversas c on c.id = m.conversa_id where c.telefone = '+5511996027732' order by m.criada_em desc limit 1),
  'Olá, Joana. Aqui é do escritório Ribeiro & Matos. Novidade no caso Herdeiros x Banco Sul: o juiz marcou a audiência e vamos avisar a data. Qualquer dúvida, é só responder esta mensagem.',
  'o texto ajustado só desta vez vai a cada cliente');

-- Sem aviso marcado, nada sai.
select pg_temp.etapa(4, '{"avisar":false}');
select automacoes_rodar();
select is((select count(*)::integer from conversa_mensagens m, ids where m.escritorio_id = ids.rm and m.autor = 'AVISO'), 4, 'sem "Avisar", nada sai');
select is((select f -> 'mudancas' -> 0 -> 'envios' from (select portal_juridico_caso(diego, rm, cs.id) f from ids, cs) x), '[]'::jsonb,
  'e a mudança não tem envios');

-- Com a automação desligada, a ficha avisa.
select portal_automacao_desligar(socia, rm, a.id, a.versao, 'Pausa no fim do ano') from ids, automacoes a where a.escritorio_id = ids.rm and a.pronta_chave = 'ETAPA_CASO';
select is((select portal_juridico_caso(diego, rm, cs.id) -> 'avisoEtapa' ->> 'automacaoLigada' from ids, cs), 'false', 'desligada, a ficha diz que o aviso não sai');

-- Prestação de contas.
create temp table lv as select
  (portal_financeiro_levantamento_registrar(diego, rm, jsonb_build_object('tipo', 'RPV', 'casoId', cs.id, 'clienteId', cli.ant,
    'valor', 4280000, 'entrouEm', '2026-11-30', 'divisao', jsonb_build_array(
      jsonb_build_object('para', 'CLIENTE', 'valor', 2916000),
      jsonb_build_object('para', 'HONORARIOS', 'nome', 'Honorários de êxito', 'regra', '30%', 'valor', 1284000),
      jsonb_build_object('para', 'PERITO', 'nome', 'Dr. Paulo Mendes', 'valor', 80000)))) ->> 'id')::uuid id
  from ids, cs, cli;
select is((select portal_financeiro_repasse(diego, rm, lv.id) ->> 'whatsappLigado' from ids, lv), 'true', 'o repasse sabe que o WhatsApp está ligado');
select is((teste.erro($$ select portal_financeiro_prestacao_enviar(diego, rm, lv.id, '{"texto":""}') from ids, lv $$)) -> 'detalhe' -> 'campos',
  '["texto"]'::jsonb, 'sem a mensagem, não manda');
create temp table pr as select portal_financeiro_prestacao_enviar(diego, rm, lv.id, '{"texto":"Olá, Joana. A prestação de contas está pronta."}') r from ids, lv;
select is((select r -> 'prestacao' ->> 'envio' from pr), 'NA_FILA', 'a prestação de contas entra na fila');
select is((select r -> 'prestacao' ->> 'para' from pr), 'Joana Prado', 'para o contato principal de Antônia');
select is((select m.dados -> 'campos' ->> 'resumo' from conversa_mensagens m, pr where m.id = (pr.r -> 'prestacao' ->> 'id')::uuid),
  'recebemos R$ 42.800,00, descontamos R$ 13.640,00 e fica para você R$ 29.160,00', 'o resumo numa linha para o aviso da Meta');
select is((teste.erro($$ select portal_financeiro_prestacao_enviar(diego, rm, lv.id, '{"texto":"de novo"}') from ids, lv $$)) -> 'detalhe' ->> 'motivo',
  'PRESTACAO_JA_ENVIADA', 'não manda duas vezes');

-- A automação "Prestação de contas" não manda outra para o mesmo repasse.
select portal_financeiro_destinacao_feita(diego, rm, d.id, '{"feitoEm": "2026-12-01"}') from ids, lv, destinacoes d where d.levantamento_id = lv.id and d.para = 'CLIENTE';
select automacoes_rodar();
select is((select count(*)::integer from automacao_execucoes x join automacoes a on a.id = x.automacao_id, ids
            where a.escritorio_id = ids.rm and a.gatilho = 'PRESTACAO_CONTAS'), 0, 'a automação não manda outra prestação');

-- Sem o WhatsApp ligado, recusa.
create temp table cli2 as select (portal_cliente_cadastrar(ivo, outro, jsonb_build_object('tipo', 'PF', 'nome', 'Rita Souza', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Rita Souza', 'telefone', '+5511996027799', 'principal', true)))) ->> 'id')::uuid rita from ids;
create temp table cs2 as select (portal_juridico_caso_criar(ivo, outro, jsonb_build_object('nome', 'Rita x Loja', 'area', 'CIVEL',
     'etapaId', (select id from etapas e where e.escritorio_id = ids.outro and e.ordem = 1), 'responsavelId', ids.ivo,
     'clientes', jsonb_build_array(jsonb_build_object('clienteId', cli2.rita, 'papel', 'AUTOR')))) ->> 'id')::uuid id from ids, cli2;
create temp table lv2 as select (portal_financeiro_levantamento_registrar(ivo, outro, jsonb_build_object('tipo', 'RPV', 'casoId', cs2.id, 'clienteId', cli2.rita,
    'valor', 100000, 'entrouEm', '2026-11-30', 'divisao', jsonb_build_array(jsonb_build_object('para', 'CLIENTE', 'valor', 100000)))) ->> 'id')::uuid id
  from ids, cs2, cli2;
select is((teste.erro($$ select portal_financeiro_prestacao_enviar(ivo, outro, lv2.id, '{"texto":"Olá"}') from ids, lv2 $$)) -> 'detalhe' ->> 'motivo',
  'WHATSAPP_NAO_LIGADO', 'sem o WhatsApp ligado, recusa (fica "Marcar como enviada")');
select is((teste.erro($$ select portal_financeiro_prestacao_enviar(diego, rm, lv2.id, '{"texto":"Olá"}') from ids, lv2 $$)) ->> 'codigo',
  'TC404', 'repasse de outro escritório não existe');

select * from finish();
rollback;
