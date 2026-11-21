-- Gatilhos novos das automações (F3.82; PA-06): cliente novo (boas-vindas) e documento pendente
-- (lembrete do que falta). Quem monta, o formato, quem entra e quando, um lembrete só por
-- cliente com tudo o que falta, "Pedir de novo" recomeça a contagem, 1 lembrete por semana, "Se
-- chegou" sai na hora, o lembrete sem resposta passa para quem pediu, a linha na ficha do caso e
-- "Quem entraria".
begin;
select plan(34);

select ajustar_relogio(('2026-11-03 09:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Larissa Costa') as larissa,
  teste.pessoa('Rita Souza') as rita,
  teste.escritorio('Ribeiro & Matos') as rm;
select teste.vincular(socia, rm, 'SOCIO') from ids;
select portal_convidar(socia, rm, larissa, 'Larissa Costa', array['JURIDICO']) from ids;
select portal_convidar(socia, rm, rita, 'Rita Souza', array['COMERCIAL']) from ids;
select whatsapp_meta_ligou(rm, socia, '{"telefone":"+5511974052210","nomeExibicao":"Ribeiro & Matos"}') from ids;

create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Paulo Henrique Saraiva', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Paulo Henrique Saraiva', 'telefone', '+5511996027741', 'principal', true)))) ->> 'id')::uuid paulo,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Tereza Moura Lima', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Tereza Moura Lima', 'telefone', '+5511996027742', 'principal', true)))) ->> 'id')::uuid tereza,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Carlos Henrique Dias', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Carlos Henrique Dias', 'telefone', '+5511996027743', 'principal', true)))) ->> 'id')::uuid carlos,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Joana Pereira', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Joana Pereira', 'telefone', '+5511996027744', 'principal', true)))) ->> 'id')::uuid joana
  from ids;
select portal_juridico_etapas(socia, rm) from ids;
create temp table cs as select
  (portal_juridico_caso_criar(socia, rm, jsonb_build_object('nome', 'Pereira x Mercado Bom Preço', 'area', 'TRABALHISTA',
     'etapaId', (select id from etapas where escritorio_id = ids.rm and ordem = 3), 'responsavelId', ids.socia,
     'clientes', jsonb_build_array(jsonb_build_object('clienteId', cli.carlos, 'papel', 'AUTOR'),
                                   jsonb_build_object('clienteId', cli.joana, 'papel', 'AUTOR')))) ->> 'id')::uuid pereira
  from ids, cli;

-- Montar: o cliente novo é de Conversas, toda a equipe monta; o documento pendente é do Jurídico.
create temp table au as select
  (portal_automacao_criar(rita, rm, '{"gatilho":"CLIENTE_NOVO","nome":"Boas-vindas ao cliente novo"}') ->> 'id')::uuid boas,
  (portal_automacao_criar(larissa, rm, '{"gatilho":"DOCUMENTO_PENDENTE","nome":"Lembrete de documento que falta"}') ->> 'id')::uuid doc
  from ids;
select is((select area from automacoes, au where id = au.boas), 'CONVERSAS', 'decisão 2: cliente novo é de Conversas, e quem só tem o Comercial monta');
select is((select rascunho -> 'passos' -> 0 from automacoes, au where id = au.boas), '{"id":"gatilho","tipo":"GATILHO","dias":0,"conta":"FECHOU"}'::jsonb,
  'decisão 1: começa no mesmo dia, contando quem fechou');
select is((select rascunho -> 'passos' -> 0 ->> 'dias' from automacoes, au where id = au.doc), '5', 'o documento pendente começa com 5 dias');
select is((teste.erro($$ select portal_automacao_criar(rita, rm, '{"gatilho":"DOCUMENTO_PENDENTE","nome":"Lembrete"}') from ids $$)) -> 'detalhe' ->> 'motivo',
  'AREA_NAO_LIBERADA', 'sem o Jurídico, não monta o lembrete de documento');

-- O formato.
select is(automacao_forma('CLIENTE_NOVO', '{"passos":[{"id":"g","tipo":"GATILHO","dias":0},{"id":"f","tipo":"FIM"}]}'), 'quem conta como cliente novo', 'cliente novo diz quem conta');
select is(automacao_forma('DOCUMENTO_PENDENTE', '{"passos":[{"id":"g","tipo":"GATILHO","dias":0},{"id":"f","tipo":"FIM"}]}'), 'dias do gatilho', 'documento: de 1 a 30 dias');
select is(automacao_forma('ETAPA_CASO', '{"passos":[{"id":"g","tipo":"GATILHO","conta":"FECHOU"},{"id":"f","tipo":"FIM"}]}'), 'este gatilho não tem conta', 'só o cliente novo tem conta');
select is(automacao_forma('CLIENTE_NOVO', '{"passos":[{"id":"g","tipo":"GATILHO","dias":0,"conta":"FECHOU"},{"id":"p","tipo":"PESSOA","regra":"QUEM_PEDIU"}]}'),
  'regra da pessoa', 'quem pediu o documento só existe no documento pendente');
select is(automacao_forma('DOCUMENTO_PENDENTE', '{"passos":[{"id":"g","tipo":"GATILHO","dias":5},{"id":"r","tipo":"RAMOS","ramos":[{"quando":"PAGOU","passos":[{"id":"f","tipo":"FIM"}]},{"quando":"NADA","passos":[{"id":"f2","tipo":"FIM"}]}]}]}'),
  'caminho do ramo', 'documento não tem "Se pagou"');
select is(automacao_campos('DOCUMENTO_PENDENTE'), array['nome', 'documentos', 'caso', 'pedido em', 'nome do escritório'], 'os campos do documento pendente');

-- Os fluxos.
select portal_automacao_salvar(rita, rm, au.boas, 1, jsonb_build_object('fluxo', jsonb_build_object('passos', jsonb_build_array(
  '{"id":"gatilho","tipo":"GATILHO","dias":0,"conta":"FECHOU"}'::jsonb,
  '{"id":"msg","tipo":"MENSAGEM","nome":"Boas-vindas","texto":"Olá, {nome}. Seja bem-vindo ao {nome do escritório}. Quem vai cuidar do seu atendimento é {quem atende}. Atendemos {horário de atendimento}. Qualquer dúvida, é só escrever aqui."}'::jsonb,
  '{"id":"fim","tipo":"FIM"}'::jsonb)))) from ids, au;
select portal_automacao_salvar(larissa, rm, au.doc, 1, jsonb_build_object('fluxo', jsonb_build_object('passos', jsonb_build_array(
  '{"id":"gatilho","tipo":"GATILHO","dias":5}'::jsonb,
  '{"id":"msg","tipo":"MENSAGEM","nome":"Lembrete de documento","texto":"Olá, {nome}. Para o caso {caso} andar, ainda falta: {documentos}. Pode mandar por aqui mesmo."}'::jsonb,
  '{"id":"esp","tipo":"ESPERA","dias":7}'::jsonb,
  '{"id":"r","tipo":"RAMOS","ramos":[{"quando":"CHEGOU","passos":[{"id":"f1","tipo":"FIM"}]},{"quando":"RESPONDEU","passos":[{"id":"ia","tipo":"IA"},{"id":"f2","tipo":"FIM"}]},{"quando":"NADA","passos":[{"id":"p","tipo":"PESSOA","regra":"QUEM_PEDIU","motivo":"7 dias sem o documento nem resposta"}]}]}'::jsonb)))) from ids, au;
select is((select jsonb_array_length(automacao_erros(a)) from automacoes a, au where a.id = au.doc), 0, 'o lembrete com "Se chegou" e quem pediu não tem erro');
select is((select automacao_erros(a) -> 0 ->> 'codigo' from automacoes a, au where a.id = au.boas), null, 'a boas-vindas não tem erro');
select is((select (automacao_erros_seq(a.escritorio_id, a.id, 'DOCUMENTO_PENDENTE', jsonb_build_array(
  '{"id":"gatilho","tipo":"GATILHO","dias":5}'::jsonb, '{"id":"m1","tipo":"MENSAGEM","nome":"A","texto":"Olá, falta um documento do caso."}'::jsonb,
  '{"id":"e","tipo":"ESPERA","dias":3}'::jsonb, '{"id":"m2","tipo":"MENSAGEM","nome":"B","texto":"Olá, ainda falta um documento do caso."}'::jsonb,
  '{"id":"f","tipo":"FIM"}'::jsonb), 0, null)).erros -> 0 ->> 'codigo' from automacoes a, au where a.id = au.doc), 'LIMITE_SEMANAL',
  'decisão 4: dois lembretes a menos de 7 dias é erro no desenho');

select portal_automacao_aprovar_texto(socia, rm, x.id, a.versao, 'msg') from ids, au, lateral (values (au.boas), (au.doc)) x (id) join automacoes a on a.id = x.id;
select portal_automacao_ligar(socia, rm, x.id, a.versao, '{"revisou":true}') from ids, au, lateral (values (au.boas), (au.doc)) x (id) join automacoes a on a.id = x.id;
select automacao_meta_modelo(rm, m.id, 'APROVADO') from ids, au, automacao_modelos m where m.automacao_id in (au.boas, au.doc);
select is((select array_agg(situacao order by nome) from automacoes, au where id in (au.boas, au.doc)), array['LIGADA', 'LIGADA'], 'as duas ligadas');

-- Os pedidos, no dia em que ligou (terça, 03/11; 02/11 é feriado).
create temp table pd as select
  (portal_juridico_documento_pedir(larissa, rm, cs.pereira, jsonb_build_object('descricao', 'CTPS digital', 'clienteId', cli.carlos)) ->> 'id')::uuid ctps,
  (portal_juridico_documento_pedir(larissa, rm, cs.pereira, jsonb_build_object('descricao', 'Holerites de 2025', 'clienteId', cli.carlos)) ->> 'id')::uuid holerites,
  (portal_juridico_documento_pedir(larissa, rm, cs.pereira, jsonb_build_object('descricao', 'Carta do INSS', 'clienteId', cli.joana)) ->> 'id')::uuid inss
  from ids, cs, cli;

-- Paulo assina o primeiro contrato; Tereza só foi cadastrada.
create temp table ct as select (portal_contrato_criar(socia, rm, jsonb_build_object('clienteId', cli.paulo, 'objeto', 'Assessoria',
     'responsavelId', ids.larissa, 'advogados', jsonb_build_array(ids.socia),
     'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'PARCELADO', 'total', 180000, 'parcelas', 1, 'primeiro', '2026-12-15')))) ->> 'id')::uuid id
  from ids, cli;
select portal_contrato_assinatura(socia, rm, ct.id, 1, '2026-11-03') from ids, ct;

create temp table r1 as select automacoes_rodar() r;
create temp table bv as select x.* from automacao_execucoes x, au where x.automacao_id = au.boas;
select is((select array_agg(k.nome) from bv join clientes_escritorio k on k.id = bv.cliente_id), array['Paulo Henrique Saraiva'],
  'decisão 1: entra só quem assinou o contrato; quem só foi cadastrado, não');
select is((select m.texto from conversa_mensagens m join bv on bv.conversa_id = m.conversa_id where m.autor = 'AVISO'),
  'Olá, Paulo. Seja bem-vindo ao Ribeiro & Matos. Quem vai cuidar do seu atendimento é Larissa Costa.'
  || case when automacao_horario_texto((select rm from ids)) is null then '' else ' Atendemos ' || automacao_horario_texto((select rm from ids)) || '.' end
  || ' Qualquer dúvida, é só escrever aqui.',
  'a boas-vindas com quem atende (o responsável pelo contrato) e o horário');
select is((select count(*)::int from automacao_execucoes x, au where x.automacao_id = au.doc), 0, 'no dia do pedido, nenhum lembrete');
select is(automacao_lista(array['a', 'b', 'c']), 'a, b e c', 'a lista junta com vírgula e "e"');

-- Pedir de novo recomeça a contagem.
select ajustar_relogio(('2026-11-05 09:00-03'::timestamptz - now()));
select portal_juridico_documento_repedir(larissa, rm, pd.inss) from ids, pd;

-- 09/11 (segunda): Carlos chegou aos 5 dias; Joana, que pediram de novo em 05/11, ainda não.
select ajustar_relogio(('2026-11-09 10:00-03'::timestamptz - now()));
select automacoes_rodar();
create temp table dx as select x.* from automacao_execucoes x, au where x.automacao_id = au.doc;
select is((select array_agg(k.nome) from dx join clientes_escritorio k on k.id = dx.cliente_id), array['Carlos Henrique Dias'],
  'decisão 3: "Pedir de novo" recomeça a contagem');
select is((select cardinality(documentos) from dx), 2, 'decisão 3: um lembrete só, com os dois documentos que faltam');
select is((select m.texto from conversa_mensagens m join dx on dx.conversa_id = m.conversa_id where m.autor = 'AVISO'),
  'Olá, Carlos. Para o caso Pereira x Mercado Bom Preço andar, ainda falta: CTPS digital e Holerites de 2025. Pode mandar por aqui mesmo.',
  'o texto com {documentos} e {caso}');
select is((select f -> 'lembrete' -> 'passaPara' ->> 'nome' from ids, cs, jsonb_array_elements(portal_juridico_caso(larissa, rm, cs.pereira) -> 'faltam') f
            where f ->> 'descricao' = 'CTPS digital'), 'Larissa Costa', 'decisão 9: a ficha do caso mostra o lembrete e para quem passa');
select is((select (f -> 'lembrete' ->> 'enviadoEm')::timestamptz from ids, cs, jsonb_array_elements(portal_juridico_caso(larissa, rm, cs.pereira) -> 'faltam') f
            where f ->> 'descricao' = 'CTPS digital'), '2026-11-09 10:00-03'::timestamptz, 'e quando saiu');
select is((select f -> 'lembrete' from ids, cs, jsonb_array_elements(portal_juridico_caso(larissa, rm, cs.pereira) -> 'faltam') f
            where f ->> 'descricao' = 'Carta do INSS'), 'null'::jsonb, 'sem lembrete, a ficha fica como antes');

-- Quem entraria.
create temp table qe as select portal_automacao_quem_entraria(socia, rm, au.doc) q, portal_automacao_quem_entraria(socia, rm, au.boas) b from ids, au;
select is((select i ->> 'quando' from qe, jsonb_array_elements(q -> 'itens') i where i -> 'cliente' ->> 'nome' = 'Joana Pereira'), 'AMANHA',
  'Joana entra amanhã (pediram de novo em 05/11)');
select is((select i ->> 'quando' from qe, jsonb_array_elements(q -> 'itens') i where i -> 'cliente' ->> 'nome' = 'Carlos Henrique Dias'), 'HOJE',
  'Carlos já está pendente hoje');
select is((select i ->> 'motivo' from qe, jsonb_array_elements(b -> 'itens') i where i -> 'cliente' ->> 'nome' = 'Tereza Moura Lima'), 'AINDA_NAO',
  'Tereza ainda não: só foi cadastrada');
select is((select i ->> 'motivo' from qe, jsonb_array_elements(b -> 'itens') i where i -> 'cliente' ->> 'nome' = 'Paulo Henrique Saraiva'), 'JA_RECEBEU',
  'Paulo já recebeu a boas-vindas');

-- 10/11: Joana entra, mas o "Pedir de novo" de 05/11 conta no limite de 1 por semana.
select ajustar_relogio(('2026-11-10 10:00-03'::timestamptz - now()));
select automacoes_rodar();
select is((select x.proximo_em from automacao_execucoes x, au, cli where x.automacao_id = au.doc and x.cliente_id = cli.joana),
  '2026-11-12 08:00-03'::timestamptz, 'decisão 4: espera fechar a semana desde o "Pedir de novo"');

-- 11/11: o documento de Joana chega; ela sai na hora, sem mensagem.
select ajustar_relogio(('2026-11-11 10:00-03'::timestamptz - now()));
select portal_juridico_documento_chegou(larissa, rm, pd.inss) from ids, pd;
select automacoes_rodar();
select is((select x.situacao || ' · ' || (x.caminho -> -2 ->> 'passo') from automacao_execucoes x, au, cli where x.automacao_id = au.doc and x.cliente_id = cli.joana),
  'CONCLUIDA · r:CHEGOU', '"Se chegou" funciona como "Se pagou": pula a espera e segue o caminho');
select is((select count(*)::int from conversa_mensagens m join automacao_execucoes x on x.conversa_id = m.conversa_id, au, cli
            where x.automacao_id = au.doc and x.cliente_id = cli.joana and m.autor = 'AVISO'), 0, 'e nenhum lembrete saiu para ela');

-- 16/11: Carlos não mandou nada nem respondeu em 7 dias: passa para quem pediu.
select ajustar_relogio(('2026-11-16 10:00-03'::timestamptz - now()));
select automacoes_rodar();
select is((select x.situacao || ' · ' || pe.nome from automacao_execucoes x join pessoas pe on pe.id = x.responsavel_id, au, cli
            where x.automacao_id = au.doc and x.cliente_id = cli.carlos), 'CONCLUIDA · Larissa Costa', 'decisão 8: passa para quem pediu o documento');
select is((select c.responsavel_id from conversas c join automacao_execucoes x on x.conversa_id = c.id, au, cli
            where x.automacao_id = au.doc and x.cliente_id = cli.carlos), (select larissa from ids), 'a conversa fica com ela');

-- Chegou um documento só: o próximo ciclo só cita o que falta.
select portal_juridico_documento_chegou(larissa, rm, pd.holerites) from ids, pd;
select is((select (automacao_campos_execucao(x, a)) ->> 'documentos' from automacao_execucoes x join automacoes a on a.id = x.automacao_id, au, cli
            where x.automacao_id = au.doc and x.cliente_id = cli.carlos), 'CTPS digital', '{documentos} só lista o que ainda falta');

select * from finish();
rollback;
