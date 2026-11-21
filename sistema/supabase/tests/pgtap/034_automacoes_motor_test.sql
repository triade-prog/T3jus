-- O motor das automações (F3.60). Entra quem chegou ao gatilho, com quem fica de fora e o
-- motivo; a mensagem entra na conversa como aviso, na fila; a frase do link de pagamento sai
-- enquanto não há link; espera os dias; paga, sai; fora do horário e no feriado espera; 1
-- cobrança por semana; lembrete de audiência com a espera em horas e o caminho "não
-- respondeu" passando para quem cuida; desligada, para; sem WhatsApp, nada anda (PA-03).
begin;
select plan(36);

select ajustar_relogio(('2026-11-01 10:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Larissa Costa') as larissa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro,
  teste.pessoa('Ivo Outro') as ivo;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(ivo, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, larissa, 'Larissa Costa', array['JURIDICO']) from ids;

create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Irene Castro', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Irene Castro', 'telefone', '+5511996027731', 'principal', true)))) ->> 'id')::uuid ire,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Eduardo Nascimento', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Eduardo Nascimento', 'telefone', '+551130324410', 'principal', true)))) ->> 'id')::uuid edu,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Antônia Ferreira Prado', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Joana Prado', 'papel', 'filha', 'telefone', '+5511996027732', 'principal', true)))) ->> 'id')::uuid ant,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PJ', 'nome', 'Construtora Vale Alto Ltda', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Rui Almeida', 'telefone', '+5511996027733', 'principal', true)))) ->> 'id')::uuid con
  from ids;
create temp table ct as select k.k, (portal_contrato_criar(socia, rm, jsonb_build_object('clienteId', k.id, 'objeto', 'Assessoria',
     'responsavelId', ids.socia, 'advogados', jsonb_build_array(ids.socia),
     'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'PARCELADO', 'total', 180000, 'parcelas', 1, 'primeiro', '2026-11-15')))) ->> 'id')::uuid id
  from ids, cli, lateral (values ('ire', cli.ire), ('edu', cli.edu), ('ant', cli.ant), ('con', cli.con)) k (k, id);
select portal_contrato_assinatura(socia, rm, ct.id, 1, '2026-11-01') from ids, ct;
create temp table parc as select ct.k, r.id, r.descricao from ct join recebimentos_previstos r on r.contrato_id = ct.id;
select portal_automacoes(socia, rm) from ids;
select portal_cliente_sem_avisos(socia, rm, cli.ant, '{"tipo":"COBRANCA","origem":"CONVERSA","quemPediu":"Joana"}') from ids, cli;

-- Peças de horário e de texto.
select is(automacao_proximo_horario('2026-11-19 21:30-03'), '2026-11-23 08:00-03'::timestamptz, 'quinta à noite, com o feriado de 20/11: segunda às 8h');
select is(automacao_proximo_horario('2026-11-18 10:12-03'), '2026-11-18 10:12-03'::timestamptz, 'dentro do horário, sai na hora');
select ok(not automacao_dia_util('2027-03-26'), 'Sexta-feira Santa não é dia útil');
select is(automacao_preencher('Olá, {nome}. Vence em {vencimento}. Para pagar, use o link {link de pagamento}. Qualquer dúvida, é só responder.',
  '{"nome":"Irene","vencimento":"15/11"}'), 'Olá, Irene. Vence em 15/11. Qualquer dúvida, é só responder.',
  'decisão da Carol: sem link de pagamento, a frase do link sai');
select is(automacao_reais(180000), 'R$ 1.800,00', 'valor em reais');

-- Sem WhatsApp ligado, nada anda.
select ajustar_relogio(('2026-11-18 10:12-03'::timestamptz - now()));
select is(automacoes_rodar() ->> 'entraram', '0', 'sem WhatsApp ligado, ninguém entra');
select whatsapp_meta_ligou(rm, socia, '{"telefone":"+5511974052210","nomeExibicao":"Ribeiro & Matos"}') from ids;

create temp table r1 as select automacoes_rodar() r;
select is((select r ->> 'entraram' from r1), '2', 'Irene e a Construtora entram na cobrança de 1 dia de atraso');
select is((select r ->> 'ficaramDeFora' from r1), '2', 'Eduardo e Antônia ficam de fora');
create temp table ex as select x.*, ct.k from automacao_execucoes x join automacoes a on a.id = x.automacao_id
  join parc on parc.id = x.origem_id join ct on ct.k = parc.k where a.pronta_chave = 'PARCELA_ATRASO';
select is((select motivo from ex where k = 'edu'), 'Sem WhatsApp no contato principal da ficha.', 'telefone fixo fica de fora, com o motivo');
select is((select motivo from ex where k = 'ant'), 'Pediu para não receber avisos de cobrança em 01/11/2026.', 'pediu para não receber cobrança');
select is((select x.situacao || ' ' || x.passo_id from automacao_execucoes x join ex on ex.id = x.id where ex.k = 'ire'), 'EM_ANDAMENTO msg-2',
  'Irene recebeu o 1º aviso e espera para o 2º');
select is((select x.proximo_em from automacao_execucoes x join ex on ex.id = x.id where ex.k = 'ire'), '2026-11-25 10:12-03'::timestamptz, 'espera 7 dias');
select is((select m.texto from conversa_mensagens m join conversas c on c.id = m.conversa_id where c.telefone = '+5511996027731' and m.autor = 'AVISO'),
  'Olá, Irene. Aqui é do escritório Ribeiro & Matos. O valor de R$ 1.800,00 (' || (select descricao from parc where k = 'ire') || ') venceu em 15/11 e ainda não aparece como pago. Se já pagou, pode desconsiderar esta mensagem. Se precisar dos dados para pagar ou quiser conversar sobre o pagamento, é só responder aqui.',
  'o aviso entra na conversa com os campos preenchidos e sem a frase do link');
select is((select m.envio || ' ' || m.aviso_tipo from conversa_mensagens m join conversas c on c.id = m.conversa_id where c.telefone = '+5511996027731' and m.autor = 'AVISO'),
  'NA_FILA Parcela em atraso · 1º aviso', 'na fila de envio, com o nome do passo');
select is((select jsonb_agg(p ->> 'rotulo') from automacao_execucoes x join ex on ex.id = x.id, jsonb_array_elements(x.caminho) p where ex.k = 'ire'),
  '["Gatilho", "Condições conferidas", "Parcela em atraso · 1º aviso", "Espera 7 dia(s)"]'::jsonb, 'o caminho registra cada passo');
select is(automacoes_rodar() ->> 'entraram', '0', 'rodar de novo não repete ninguém');

-- A Construtora paga: sai da cobrança e entra em "Pagamento recebido".
select portal_financeiro_receber_registrar(socia, rm, parc.id, jsonb_build_object('valor', 180000, 'recebidoEm', '2026-11-18', 'forma', 'PIX'))
  from ids, parc where k = 'con';
select automacoes_rodar();
select is((select x.situacao || ' · ' || x.motivo from automacao_execucoes x join ex on ex.id = x.id where ex.k = 'con'), 'CONCLUIDA · Pagou: a parcela saiu da automação.',
  'paga, a parcela sai da cobrança');
select is((select m.texto from conversa_mensagens m join conversas c on c.id = m.conversa_id where c.telefone = '+5511996027733' and m.aviso_tipo = 'Pagamento recebido'
            order by m.criada_em desc limit 1),
  'Olá, Rui. Aqui é do escritório Ribeiro & Matos. Recebemos o pagamento de R$ 1.800,00 (' || (select descricao from parc where k = 'con') || '). Agradecemos. Qualquer dúvida, é só responder esta mensagem.',
  'e recebe o aviso de pagamento recebido');

-- Sete dias depois, o 2º aviso. Na semana seguinte, à noite, espera o horário.
select ajustar_relogio(('2026-11-25 10:30-03'::timestamptz - now()));
select automacoes_rodar();
select is((select count(*)::integer from conversa_mensagens m join conversas c on c.id = m.conversa_id where c.telefone = '+5511996027731' and m.autor = 'AVISO'),
  2, '2º aviso depois de 7 dias');
select ajustar_relogio(('2026-12-02 21:00-03'::timestamptz - now()));
select automacoes_rodar();
select is((select x.proximo_em from automacao_execucoes x join ex on ex.id = x.id where ex.k = 'ire'), '2026-12-03 08:00-03'::timestamptz,
  'às 21h não sai: espera as 8h do dia útil seguinte');
select is((select count(*)::integer from conversa_mensagens m join conversas c on c.id = m.conversa_id where c.telefone = '+5511996027731' and m.autor = 'AVISO'),
  2, 'nada saiu fora do horário');

-- 1 cobrança por semana, somando as automações: uma segunda cobrança da mesma parcela espera.
select ajustar_relogio(('2026-12-03 08:05-03'::timestamptz - now()));
update automacao_execucoes x set ultima_msg_em = '2026-12-01 09:00-03' from ex where ex.id = x.id and ex.k = 'ire';
select automacoes_rodar();
select is((select x.proximo_em from automacao_execucoes x join ex on ex.id = x.id where ex.k = 'ire'), '2026-12-08 09:00-03'::timestamptz,
  'aviso há menos de 7 dias: espera completar a semana');
select is((select p ->> 'situacao' from automacao_execucoes x join ex on ex.id = x.id, jsonb_array_elements(x.caminho) p where ex.k = 'ire'
            order by (p ->> 'em') desc limit 1), 'ESPERA', 'o caminho mostra a espera do limite semanal');

-- Lembrete de audiência: 1 dia antes, espera até 2h antes e, sem resposta, passa para quem cuida.
select ajustar_relogio(('2026-12-07 10:00-03'::timestamptz - now()));
create temp table comp as select (portal_compromisso_marcar(socia, rm, jsonb_build_object('tipo', 'AUDIENCIA', 'titulo', 'Audiência de conciliação',
  'inicio', '2026-12-08T09:30:00-03:00', 'fim', '2026-12-08T10:30:00-03:00', 'modalidade', 'PRESENCIAL', 'local', 'Fórum Central, sala 4',
  'clienteId', cli.ire, 'responsavelId', larissa, 'lembrete', true)) ->> 'id')::uuid id from ids, cli;
select is((select q -> 'itens' -> 0 -> 'origem' ->> 'descricao' || ' · ' || (q -> 'itens' -> 0 ->> 'entra') from ids, automacoes a,
            lateral (select portal_automacao_quem_entraria(socia, rm, a.id) q) z where a.escritorio_id = ids.rm and a.pronta_chave = 'LEMBRETE_AUDIENCIA'),
  'Audiência de conciliação · true', 'F3.62: quem entraria no lembrete mostra o compromisso dos próximos dias');
select is((select portal_automacao_quem_entraria(socia, rm, a.id) ->> 'disponivel' from ids, automacoes a where a.escritorio_id = ids.rm and a.pronta_chave = 'ETAPA_CASO'),
  'true', 'F3.62: a etapa do caso também tem a lista');
select automacoes_rodar();
create temp table lem as select x.id from automacao_execucoes x join comp on comp.id = x.origem_id;
select is((select situacao || ' ' || to_char(proximo_em at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI') from automacao_execucoes x join lem using (id)),
  'EM_ANDAMENTO 08/12 07:30', 'o 1º lembrete sai e o 2º espera 2 horas antes da audiência');
select is((select m.texto from conversa_mensagens m join conversas c on c.id = m.conversa_id where c.telefone = '+5511996027731' and m.aviso_tipo = 'Lembrete · 1 dia antes'),
  'Olá, Irene. Aqui é do escritório Ribeiro & Matos. Lembrete: Audiência de conciliação, no dia 08/12, às 09:30. Local: Fórum Central, sala 4. Responda CONFIRMO, ou escreva se tiver alguma dúvida.', 'o lembrete com data, hora e local');
select ajustar_relogio(('2026-12-08 08:00-03'::timestamptz - now()));
select automacoes_rodar();
select is((select situacao from automacao_execucoes x join lem using (id)), 'CONCLUIDA', 'depois do 2º lembrete, sem resposta, a execução termina');
select is((select c.situacao || ' ' || (c.responsavel_id = ids.larissa)::text from conversas c, ids where c.telefone = '+5511996027731'),
  'PRECISA true', 'e a conversa passa para Larissa, que cuida do compromisso');

-- F3.64: Avisos automáticos, os últimos 7 dias.
select is((select portal_avisos_automaticos(socia, rm) -> 'porTipo' from ids), '{"LEMBRETE_AUDIENCIA": 2}'::jsonb, 'F3.64: os avisos dos últimos 7 dias, por tipo');
select ajustar_relogio(('2026-12-08 08:20-03'::timestamptz - now()));
select whatsapp_mensagem_recebida(rm, '+5511996027731', 'Irene', 'Confirmo, estarei lá.') from ids;
select is((select portal_avisos_automaticos(socia, rm) -> 'itens' -> 0 ->> 'situacao' from ids), 'RESPONDEU', 'a resposta do cliente aparece no aviso');
select is((select portal_avisos_automaticos(larissa, rm) ->> 'total' from ids), '2', 'Larissa (Jurídico) vê os lembretes');
select is((teste.erro($$ select portal_avisos_automaticos(socia, rm, 'NADA') from ids $$)) -> 'detalhe' -> 'campos', '["tipo"]'::jsonb, 'tipo desconhecido é recusado');

-- Desligada, a execução para.
select ajustar_relogio(('2026-12-08 08:10-03'::timestamptz - now()));
select portal_automacao_desligar(socia, rm, a.id, a.versao, 'Pausa no fim do ano') from ids, automacoes a where a.escritorio_id = ids.rm and a.pronta_chave = 'PARCELA_ATRASO';
update automacao_execucoes x set proximo_em = app_now() from ex where ex.id = x.id and ex.k = 'ire';
select automacoes_rodar();
select is((select x.situacao from automacao_execucoes x join ex on ex.id = x.id where ex.k = 'ire'), 'FICOU_DE_FORA', 'desligada, a execução para onde está');

-- Isolamento: o outro escritório não tem WhatsApp e nada dele andou.
select is((select count(*)::integer from automacao_execucoes x, ids where x.escritorio_id = ids.outro), 0, 'PT-01: o outro escritório não tem execução');
select is((select count(*)::integer from automacao_execucoes x where x.proximo_em is not null and x.situacao not in ('AGENDADA', 'EM_ANDAMENTO')), 0,
  'só execução em andamento tem próxima hora');

select * from finish();
rollback;
