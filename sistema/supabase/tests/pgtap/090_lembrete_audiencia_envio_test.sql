-- Lembrete de audiência e aviso de cancelamento pelo WhatsApp do escritório (F3.3, EX-11): o
-- lembrete de 1 dia antes sai no dia útil anterior; o de 2 horas não sai a menos de 30 minutos;
-- marcado em cima da hora, sai só o de 2 horas; remarcar recomeça e manda a nova data;
-- desmarcar e cancelar param o lembrete; cancelar com "avisar" põe o aviso na fila, ou diz por
-- que não saiu; na sala virtual vai o link; a ficha mostra o que saiu.
begin;
select plan(30);

select ajustar_relogio(('2026-12-01 10:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Larissa Costa') as larissa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.pessoa('Ivo Outro') as ivo,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(ivo, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, larissa, 'Larissa Costa', array['JURIDICO']) from ids;

create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Gabriela Teixeira', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Gabriela Teixeira', 'telefone', '+5511996027735', 'principal', true)))) ->> 'id')::uuid gab,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Eduardo Nascimento', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Eduardo Nascimento', 'telefone', '+551130324410', 'principal', true)))) ->> 'id')::uuid edu,
  (portal_cliente_cadastrar(ivo, outro, jsonb_build_object('tipo', 'PF', 'nome', 'Rita Souza', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Rita Souza', 'telefone', '+5511996027799', 'principal', true)))) ->> 'id')::uuid rita
  from ids;

create function pg_temp.dados(p_cliente uuid, p_resp uuid, p_inicio text, p_fim text, p_lembrete boolean default true,
                              p_modalidade text default 'PRESENCIAL') returns jsonb
language sql as $$
  select jsonb_build_object('tipo', 'AUDIENCIA', 'titulo', 'Audiência de conciliação', 'inicio', p_inicio, 'fim', p_fim,
    'modalidade', p_modalidade, 'local', 'Fórum Central, sala 4', 'clienteId', p_cliente, 'responsavelId', p_resp, 'lembrete', p_lembrete)
  || case when p_modalidade = 'VIRTUAL' then '{"linkSala":"https://teams.microsoft.com/l/sala-gabriela"}'::jsonb else '{}'::jsonb end
$$;

-- Quando sai cada lembrete.
select is(compromisso_lembrete_em('2026-11-23 09:00-03'), '2026-11-19 09:00-03'::timestamptz,
  'audiência de segunda: lembrete na quinta, porque sexta (20/11) é feriado e fim de semana não sai');
select is(compromisso_lembrete_em('2026-12-08 09:30-03'), '2026-12-07 09:30-03'::timestamptz, 'na terça, o lembrete sai na segunda, na mesma hora');
select is(compromisso_lembrete_em('2026-12-08 07:00-03'), '2026-12-07 08:00-03'::timestamptz, 'compromisso às 7h: o lembrete sai às 8h do dia anterior');
select is(compromisso_lembrete_horas('2026-12-08 09:00-03', 2), '2026-12-08 08:00-03'::timestamptz, 'às 9h, o de 2 horas sai às 8h');
select is(compromisso_lembrete_horas('2026-12-08 14:00-03', 2), '2026-12-08 12:00-03'::timestamptz, 'às 14h, sai ao meio-dia');
select is(compromisso_lembrete_horas('2026-12-08 08:20-03', 2), null, 'às 8h20, o de 2 horas não sai (faltaria menos de 30 minutos)');

-- O aviso de cancelamento entre os avisos do WhatsApp.
select whatsapp_meta_ligou(rm, socia, '{"telefone":"+5511974052210","nomeExibicao":"Ribeiro & Matos"}') from ids;
select is((select situacao from whatsapp_avisos w, ids where w.escritorio_id = ids.rm and w.chave = 'COMPROMISSO_CANCELADO'), 'EM_ANALISE',
  'o aviso "Compromisso cancelado" vai para a análise da Meta com os outros');
select portal_automacoes(socia, rm) from ids;

-- Audiência de segunda, 14/12, às 9h30: o lembrete sai na sexta, 11/12, às 9h30.
create temp table comp as select (portal_compromisso_marcar(socia, rm,
  pg_temp.dados(cli.gab, ids.larissa, '2026-12-14T09:30:00-03:00', '2026-12-14T10:30:00-03:00')) ->> 'id')::uuid id from ids, cli;
select ajustar_relogio(('2026-12-11 09:00-03'::timestamptz - now()));
select automacoes_rodar();
select is((select count(*)::integer from automacao_execucoes x join comp on comp.id = x.origem_id), 0, 'às 9h da sexta, ainda não entrou');
select is((select (portal_compromisso(socia, rm, comp.id) -> 'lembretes' ->> 'umDia')::timestamptz from ids, comp), '2026-12-11 09:30-03'::timestamptz,
  'a ficha mostra quando sai o de 1 dia antes');
select ajustar_relogio(('2026-12-11 09:40-03'::timestamptz - now()));
select automacoes_rodar();
create temp table lem as select x.id from automacao_execucoes x join comp on comp.id = x.origem_id;
select is((select situacao || ' ' || to_char(proximo_em at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI') from automacao_execucoes x join lem using (id)),
  'EM_ANDAMENTO 14/12 07:30', 'o lembrete de 1 dia antes sai na sexta e o de 2 horas espera a segunda');
select is((select m.texto || ' · ' || m.envio from conversa_mensagens m join conversas c on c.id = m.conversa_id
            where c.telefone = '+5511996027735' and m.aviso_tipo = 'Lembrete · 1 dia antes'),
  'Olá, Gabriela. Aqui é do escritório Ribeiro & Matos. Lembrete: Audiência de conciliação, no dia 14/12, às 09:30. Local: Fórum Central, sala 4. Responda CONFIRMO, ou escreva se tiver alguma dúvida. · NA_FILA',
  'o lembrete entra na fila da conversa');

-- Remarcar para 21/12 às 10h: recomeça, e a cliente recebe agora a nova data.
select portal_compromisso_editar(socia, rm, comp.id, c.versao, pg_temp.dados(cli.gab, ids.larissa, '2026-12-21T10:00:00-03:00', '2026-12-21T11:00:00-03:00'),
  'Redesignação publicada') from ids, cli, comp, compromissos c where c.id = comp.id;
select is((select situacao || ' ' || to_char(proximo_em at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI') || ' ' || passo_id from automacao_execucoes x join lem using (id)),
  'AGENDADA 18/12 10:00 gatilho', 'remarcado, o lembrete recomeça para o dia útil antes da nova data');
select is((select m.texto from conversa_mensagens m join conversas c on c.id = m.conversa_id
            where c.telefone = '+5511996027735' and m.aviso_tipo = 'Lembrete · nova data'),
  'Olá, Gabriela. Aqui é do escritório Ribeiro & Matos. Lembrete: Audiência de conciliação, no dia 21/12, às 10:00. Local: Fórum Central, sala 4. Responda CONFIRMO, ou escreva se tiver alguma dúvida.',
  'e a cliente, que já tinha o lembrete da data antiga, recebe a nova data na hora');
select is((select p ->> 'rotulo' from automacao_execucoes x join lem using (id), jsonb_array_elements(x.caminho) p where p ->> 'passo' = 'remarcado'),
  'Remarcado para 21/12, às 10:00; lembrete com a nova data enviado', 'o caminho registra a remarcação');
select is((select jsonb_array_length(portal_compromisso(socia, rm, comp.id) -> 'lembretes' -> 'mensagens') from ids, comp), 2,
  'a ficha mostra as duas mensagens que saíram');

-- A resposta da cliente aparece na ficha.
select ajustar_relogio(('2026-12-11 10:05-03'::timestamptz - now()));
select whatsapp_mensagem_recebida(rm, '+5511996027735', 'Gabriela', 'Confirmo, estarei lá.') from ids;
select is((select portal_compromisso(socia, rm, comp.id) -> 'lembretes' -> 'resposta' ->> 'texto' from ids, comp), 'Confirmo, estarei lá.',
  'a resposta da cliente aparece no lembrete');

-- Desmarcar o lembrete para; marcar de novo recomeça.
select portal_compromisso_editar(socia, rm, comp.id, c.versao, pg_temp.dados(cli.gab, ids.larissa, '2026-12-21T10:00:00-03:00', '2026-12-21T11:00:00-03:00', false))
  from ids, cli, comp, compromissos c where c.id = comp.id;
select is((select situacao || ' · ' || motivo from automacao_execucoes x join lem using (id)), 'FICOU_DE_FORA · O lembrete ao cliente foi desmarcado.',
  'desmarcado, o lembrete para');
select portal_compromisso_editar(socia, rm, comp.id, c.versao, pg_temp.dados(cli.gab, ids.larissa, '2026-12-21T10:00:00-03:00', '2026-12-21T11:00:00-03:00'))
  from ids, cli, comp, compromissos c where c.id = comp.id;
select is((select situacao || ' ' || to_char(proximo_em at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI') from automacao_execucoes x join lem using (id)),
  'AGENDADA 18/12 10:00', 'marcado de novo, volta a esperar o dia');

-- Cancelar com "Avisar a cliente": o lembrete para e o aviso entra na fila.
select portal_compromisso_cancelar(socia, rm, comp.id, c.versao, 'Acordo fechado antes da audiência', true) from ids, comp, compromissos c where c.id = comp.id;
select is((select situacao || ' · ' || motivo from automacao_execucoes x join lem using (id)), 'FICOU_DE_FORA · O compromisso foi cancelado.',
  'cancelado, o lembrete que não saiu é cancelado');
select is((select m.texto || ' · ' || m.envio from conversa_mensagens m join conversas c on c.id = m.conversa_id
            where c.telefone = '+5511996027735' and m.aviso_tipo = 'Compromisso cancelado'),
  'Olá, Gabriela. Aqui é do escritório Ribeiro & Matos. Avisamos que foi cancelado: Audiência de conciliação, no dia 21/12, às 10:00. Se houver nova data, avisamos por aqui. Qualquer dúvida, é só responder esta mensagem. · NA_FILA',
  'o aviso de cancelamento entra na fila da conversa');
select is((select portal_compromisso(socia, rm, comp.id) -> 'cancelamento' -> 'aviso' -> 'mensagem' ->> 'envio' from ids, comp), 'NA_FILA',
  'a ficha mostra o aviso de cancelamento e a situação dele');
select ajustar_relogio(('2026-12-18 10:10-03'::timestamptz - now()));
select automacoes_rodar();
select is((select count(*)::integer from conversa_mensagens m join conversas c on c.id = m.conversa_id
            where c.telefone = '+5511996027735' and m.autor = 'AVISO' and m.aviso_tipo like 'Lembrete%'), 2, 'depois de cancelar, nenhum lembrete sai');

-- Sem WhatsApp no contato: o aviso não sai e a ficha diz por quê.
create temp table comp2 as select (portal_compromisso_marcar(socia, rm,
  pg_temp.dados(cli.edu, ids.larissa, '2027-01-12T14:00:00-03:00', '2027-01-12T15:00:00-03:00')) ->> 'id')::uuid id from ids, cli;
select portal_compromisso_cancelar(socia, rm, comp2.id, 1, 'Cliente desistiu', true) from ids, comp2;
select is((select portal_compromisso(socia, rm, comp2.id) -> 'cancelamento' -> 'aviso' ->> 'motivo' from ids, comp2),
  'Sem WhatsApp no contato principal da ficha.', 'telefone fixo: o aviso não sai, com o motivo');

-- Sem o WhatsApp do escritório ligado: não sai (nem depois).
create temp table comp3 as select (portal_compromisso_marcar(ivo, outro,
  pg_temp.dados(cli.rita, ids.ivo, '2027-01-12T14:00:00-03:00', '2027-01-12T15:00:00-03:00')) ->> 'id')::uuid id from ids, cli;
select portal_compromisso_cancelar(ivo, outro, comp3.id, 1, 'Pauta retirada', true) from ids, comp3;
select is((select portal_compromisso(ivo, outro, comp3.id) -> 'cancelamento' -> 'aviso' ->> 'motivo' from ids, comp3),
  'O WhatsApp do escritório não estava ligado.', 'sem o WhatsApp ligado, o aviso não sai');
select is((select count(*)::integer from conversa_mensagens m, ids where m.escritorio_id = ids.outro), 0, 'e nada entra na fila');
select is((select portal_compromisso(ivo, outro, comp3.id) ->> 'whatsappLigado' from ids, comp3), 'false', 'a ficha sabe que o WhatsApp não está ligado');

-- Marcado em cima da hora, na sala virtual: sai só o lembrete de 2 horas, com o link.
select ajustar_relogio(('2026-12-22 10:00-03'::timestamptz - now()));
create temp table comp4 as select (portal_compromisso_marcar(socia, rm,
  pg_temp.dados(cli.gab, ids.larissa, '2026-12-22T12:30:00-03:00', '2026-12-22T13:30:00-03:00', true, 'VIRTUAL')) ->> 'id')::uuid id from ids, cli;
select automacoes_rodar();
select is((select p ->> 'rotulo' from automacao_execucoes x join comp4 on comp4.id = x.origem_id, jsonb_array_elements(x.caminho) p where p ->> 'passo' = 'msg-1'),
  'Lembrete · 1 dia antes não saiu: o lembrete de 2 horas antes sai logo depois', 'em cima da hora, o de 1 dia antes não sai');
select ajustar_relogio(('2026-12-22 10:31-03'::timestamptz - now()));
select automacoes_rodar();
select is((select m.texto from conversa_mensagens m join conversas c on c.id = m.conversa_id
            where c.telefone = '+5511996027735' and m.aviso_tipo = 'Lembrete · 2 horas antes'),
  'Olá, Gabriela. Aqui é do escritório Ribeiro & Matos. Lembrete: Audiência de conciliação, no dia 22/12, às 12:30. Local: sala virtual, pelo link https://teams.microsoft.com/l/sala-gabriela. Responda CONFIRMO, ou escreva se tiver alguma dúvida.',
  'sai só o de 2 horas, com o link da sala');

-- A menos de 30 minutos, não sai.
select ajustar_relogio(('2026-12-23 07:00-03'::timestamptz - now()));
create temp table comp5 as select (portal_compromisso_marcar(socia, rm,
  pg_temp.dados(cli.gab, ids.larissa, '2026-12-23T08:20:00-03:00', '2026-12-23T09:00:00-03:00')) ->> 'id')::uuid id from ids, cli;
select automacoes_rodar();
select ajustar_relogio(('2026-12-23 08:00-03'::timestamptz - now()));
select automacoes_rodar();
select is((select count(*)::integer from conversa_mensagens m where m.dados ->> 'execucao' in
            (select x.id::text from automacao_execucoes x join comp5 on comp5.id = x.origem_id)), 0,
  'compromisso às 8h20: nenhum lembrete sai (às 8h faltariam 20 minutos)');
select is((select portal_compromisso(socia, rm, comp5.id) -> 'lembretes' ->> 'antes' from ids, comp5), null, 'e a ficha diz que o de 2 horas não sai');

select * from finish();
rollback;
