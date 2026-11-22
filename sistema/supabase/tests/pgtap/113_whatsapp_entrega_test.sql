-- A entrega das mensagens pelo WhatsApp (F0.21, PT-04): o banco escolhe o que sai e como
-- (texto livre na janela de 24 horas, aviso aprovado fora dela), reserva o lote, registra o
-- resultado, tenta de novo a falha passageira até o limite, marca na hora a definitiva, vence a
-- mensagem velha e anda com entregue e lida pelo id da Meta. Só o escritório com o número da
-- Meta entra no lote.
begin;
select plan(33);

select ajustar_relogio(('2026-11-23 10:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.pessoa('Otávio Leal') as otavio,
  teste.escritorio('Leal Advocacia') as leal;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(otavio, leal, 'SOCIO') from ids;

create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Hélio Batista Corrêa', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Marta Corrêa', 'telefone', '+5511996027736', 'principal', true)))) ->> 'id')::uuid h,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Antônia Ferreira Prado', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Antônia', 'telefone', '+5511996027732', 'principal', true)))) ->> 'id')::uuid a
  from ids;

-- O escritório Ribeiro & Matos liga com o número da Meta; o Leal liga sem (o assistente antigo).
select whatsapp_meta_ligou(rm, socia, '{"telefone":"+5511974052210","nomeExibicao":"Ribeiro & Matos","numeroId":"109876543210"}') from ids;
select whatsapp_meta_ligou(leal, otavio, '{"telefone":"+5511974052299","nomeExibicao":"Leal Advocacia"}') from ids;

create temp table conv as select
  whatsapp_mensagem_recebida(rm, '+5511996027736', 'Marta', 'Bom dia, alguma novidade?') h,
  whatsapp_mensagem_recebida(rm, '+5511996027732', 'Antônia', 'Oi') a,
  whatsapp_mensagem_recebida(leal, '+5511996020000', 'Rui', 'Oi') l
  from ids;

create function pg_temp.msg(p_esc uuid, p_conv uuid, p_autor text, p_texto text, p_dados jsonb default null, p_anexo jsonb default null) returns uuid
language sql as $$
  insert into conversa_mensagens (escritorio_id, conversa_id, autor, pessoa_id, texto, anexo, aviso_tipo, envio, dados)
  values (p_esc, p_conv, p_autor, case when p_autor = 'EQUIPE' then (select socia from ids) end, p_texto, p_anexo,
          case when p_autor = 'AVISO' then 'Lembrete de audiência' end, 'NA_FILA', p_dados)
  returning id $$;
create function pg_temp.lote() returns jsonb language sql as $$ select rotina_whatsapp_pendentes(20) $$;
create function pg_temp.ids_do(p jsonb) returns text language sql as $$
  select coalesce(string_agg(x ->> 'texto', ' | ' order by x ->> 'texto'), '') from jsonb_array_elements(p) x $$;

-- Na janela: texto livre.
create temp table m1 as select pg_temp.msg(rm, conv.h, 'IA', 'Ainda não, avisamos assim que sair.') id from ids, conv;
select pg_temp.msg(leal, conv.l, 'IA', 'Do escritório sem número da Meta') from ids, conv;
create temp table l1 as select pg_temp.lote() j;

select is(jsonb_array_length((select j from l1)), 1, 'só o escritório com o número da Meta entra no lote');
select is((select j -> 0 ->> 'para' from l1), '5511996027736', 'vai para o número da conversa, sem o +');
select is((select j -> 0 ->> 'numeroId' from l1), '109876543210', 'sai pelo número da Meta do escritório');
select ok((select j -> 0 -> 'modelo' = 'null'::jsonb from l1), 'na janela de 24 horas sai como texto livre');
select is(jsonb_array_length(pg_temp.lote()), 0, 'a mensagem reservada não sai em outra chamada');
select is((select whatsapp_envio_situacao('109876543210', 'wamid.1', 'ENTREGUE')), false, 'sem o id da Meta registrado, nada muda');

select is(rotina_whatsapp_registrar(rm, m1.id, true, 'wamid.1'), 'ENVIADA', 'saiu: fica enviada') from ids, m1;
select is((select envio from conversa_mensagens m, m1 where m.id = m1.id), 'ENVIADA', 'a mensagem mostra enviada');
select is((teste.erro($$ select rotina_whatsapp_registrar((select leal from ids), (select id from m1), true, 'wamid.x') $$)) ->> 'codigo', 'TC404',
  'outro escritório não registra a mensagem');

-- Entregue e lida (webhook): só para a frente.
select is(whatsapp_envio_situacao('109876543210', 'wamid.1', 'ENTREGUE'), true, 'a Meta conta que entregou');
select is(whatsapp_envio_situacao('109876543210', 'wamid.1', 'LIDA'), true, 'e que o cliente leu');
select is(whatsapp_envio_situacao('109876543210', 'wamid.1', 'ENTREGUE'), false, 'entregue depois de lida não volta');
select is(whatsapp_envio_situacao('109876543210', 'wamid.1', 'FALHOU', 'x'), false, 'falha depois de lida não desfaz');
select is(whatsapp_envio_situacao('999', 'wamid.1', 'LIDA'), false, 'outro número não acha a mensagem');
select is((select envio from conversa_mensagens m, m1 where m.id = m1.id), 'LIDA', 'a mensagem fica lida');

-- Falha passageira: tenta de novo em 1, 5, 15 e 60 minutos; na 5ª, não entregue com o motivo.
create temp table m2 as select pg_temp.msg(rm, conv.h, 'EQUIPE', 'Pode mandar o RG?') id from ids, conv;
select is(jsonb_array_length(pg_temp.lote()), 1, 'a mensagem da equipe entra no lote');
select is(rotina_whatsapp_registrar(rm, m2.id, false, null, 'A Meta está fora do ar', '131016', true), 'NA_FILA', 'falha passageira volta para a fila')
  from ids, m2;
select is(jsonb_array_length(pg_temp.lote()), 0, 'e espera antes de tentar de novo');
select ajustar_relogio(('2026-11-23 10:02-03'::timestamptz - now()));
select is(jsonb_array_length(pg_temp.lote()), 1, 'depois de 1 minuto, tenta de novo');
select rotina_whatsapp_registrar(rm, m2.id, false, null, 'A Meta está fora do ar', '131016', true) from ids, m2;
select ajustar_relogio(('2026-11-23 10:08-03'::timestamptz - now()));
select pg_temp.lote();
select rotina_whatsapp_registrar(rm, m2.id, false, null, 'A Meta está fora do ar', '131016', true) from ids, m2;
select ajustar_relogio(('2026-11-23 10:24-03'::timestamptz - now()));
select pg_temp.lote();
select rotina_whatsapp_registrar(rm, m2.id, false, null, 'A Meta está fora do ar', '131016', true) from ids, m2;
select ajustar_relogio(('2026-11-23 11:25-03'::timestamptz - now()));
select is(jsonb_array_length(pg_temp.lote()), 1, 'a 5ª tentativa sai uma hora depois');
select is(rotina_whatsapp_registrar(rm, m2.id, false, null, 'A Meta está fora do ar', '131016', true), 'FALHOU', 'na 5ª, para') from ids, m2;
select is((select envio || ' · ' || envio_motivo from conversa_mensagens m, m2 where m.id = m2.id),
  'FALHOU · A Meta não aceitou depois de 5 tentativas: A Meta está fora do ar', 'fica não entregue, com o motivo');
select is((select tentativas || ' · ' || ultimo_erro from whatsapp_envios e, m2 where e.mensagem_id = m2.id), '5 · 131016', 'o código da Meta fica guardado');

-- Falha definitiva: marca na hora.
create temp table m3 as select pg_temp.msg(rm, conv.h, 'IA', 'Outra resposta') id from ids, conv;
select pg_temp.lote();
select is(rotina_whatsapp_registrar(rm, m3.id, false, null, 'O número do cliente não recebe mensagens pelo WhatsApp', '131026', false), 'FALHOU',
  'falha definitiva não tenta de novo') from ids, m3;

-- Fora da janela (o cliente não escreve há mais de 24 horas).
select ajustar_relogio(('2026-11-24 12:00-03'::timestamptz - now()));
create temp table m4 as select
  pg_temp.msg(rm, conv.h, 'AVISO', 'Olá, Marta. Aqui é do escritório Ribeiro & Matos. Lembrete: audiência, no dia 25/11, às 14:00. Local: Fórum. Responda CONFIRMO, ou escreva se tiver alguma dúvida.',
              '{"aviso":"LEMBRETE_AUDIENCIA"}') aviso,
  pg_temp.msg(rm, conv.h, 'EQUIPE', 'Texto livre fora da janela') livre,
  pg_temp.msg(rm, conv.a, 'AVISO', 'Olá, Antônia. Aqui é do escritório Ribeiro & Matos. Lembrete: audiência, no dia 25/11, às 15:00. Local: Fórum. Responda CONFIRMO, ou escreva se tiver alguma dúvida.',
              '{"aviso":"LEMBRETE_AUDIENCIA"}') sem_avisos
  from ids, conv;
select portal_cliente_sem_avisos(socia, rm, cli.a, '{"tipo":"TODOS","origem":"CONVERSA","quemPediu":"Antônia"}') from ids, cli;
select is(jsonb_array_length(pg_temp.lote()), 0, 'com o aviso em análise na Meta, nada sai fora da janela');
select is((select envio_motivo from conversa_mensagens m, m4 where m.id = m4.livre), 'Fora da janela de 24 horas, a Meta só aceita aviso aprovado',
  'texto livre fora da janela fica não entregue, com o motivo');
select is((select envio_motivo from conversa_mensagens m, m4 where m.id = m4.sem_avisos), 'O cliente pediu para não receber avisos',
  'quem pediu para não receber avisos não recebe, mesmo já na fila');
select is((select envio from conversa_mensagens m, m4 where m.id = m4.aviso), 'NA_FILA', 'o aviso em análise espera na fila');

update whatsapp_avisos set situacao = 'APROVADO' where escritorio_id = (select rm from ids) and chave = 'LEMBRETE_AUDIENCIA';
select is(jsonb_array_length(pg_temp.lote()), 0, 'espera 30 minutos antes de olhar de novo');
select ajustar_relogio(('2026-11-24 12:31-03'::timestamptz - now()));
create temp table l2 as select pg_temp.lote() j;
select is((select j -> 0 -> 'modelo' ->> 'nome' || ' · ' || (j -> 0 -> 'modelo' ->> 'idioma') from l2), 't3jus_lembrete_audiencia · pt_BR',
  'aprovado, sai como o aviso da Meta, com o nome combinado');
select ok((select (j -> 0 -> 'modelo' ->> 'texto') like 'Olá, {nome}.%' from l2), 'com o texto do aviso, para montar os campos');

-- Validade: o que não sai em 24 horas não sai mais.
select ajustar_relogio(('2026-11-25 13:00-03'::timestamptz - now()));
select is((whatsapp_envios_rotina()) ->> 'vencidas', '2', 'a rotina vence o que passou de 24 horas (os dois escritórios)');
select is((select envio_motivo from conversa_mensagens m, ids where m.escritorio_id = ids.leal and m.autor = 'IA'),
  'Ficou na fila mais de 24 horas sem poder sair', 'com o motivo');

select ajustar_relogio(interval '0');
select * from finish();
rollback;
