-- Textos no tom do T3jus (D5, F3.91), aprovados pela Carol em 21/11/2026 com as 10 recomendações
-- de docs/design/aprovadas/textos-tom/NOTAS.md:
--  * os avisos prontos do WhatsApp dizem de quem são no começo ("Aqui é do escritório ...") e
--    terminam com "Qualquer dúvida, é só responder esta mensagem.";
--  * a cobrança perde a frase do {link de pagamento} no próprio texto (decisão 8), e o campo sai
--    da lista dos gatilhos de parcela (o motor segue tirando a frase de textos antigos);
--  * sem exclamação nos textos fixos, palavras sem gênero para quem recebe ("Agradecemos");
--  * fora do horário usa {horário de atendimento} (decisão 7);
--  * petições e planilha apagada ganham motivo próprio (SO_QUEM_GEROU, PLANILHA_APAGADA).
-- Só muda o texto que ainda é o semeado: o que o escritório ajustou fica como está.

-- Troca um trecho no corpo de uma função já criada, conferindo que o trecho existe.
create function d5_trocar(p_funcao regprocedure, p_de text, p_para text) returns void
language plpgsql
as $$
declare v_def text := pg_get_functiondef(p_funcao);
begin
  if position(p_de in v_def) = 0 then raise exception 'Trecho não encontrado em %: %', p_funcao, left(p_de, 80); end if;
  execute replace(v_def, p_de, p_para);
end $$;

-- ---------------------------------------------------------------------------------------
-- Avisos prontos do WhatsApp.

create temporary table d5_avisos (chave text primary key, antes text not null, depois text not null);
insert into d5_avisos values
  ('PAGAMENTO_RECEBIDO',
   'Olá, {nome}. Recebemos o pagamento de {valor} referente a {parcela}. Obrigado!',
   'Olá, {nome}. Aqui é do escritório {nome do escritório}. Recebemos o pagamento de {valor} ({parcela}). Agradecemos. Qualquer dúvida, é só responder esta mensagem.'),
  ('PARCELA_VAI_VENCER',
   'Olá, {nome}. A parcela {parcela}, de {valor}, vence em {vencimento}. Para pagar, use o link {link de pagamento}. Qualquer dúvida, é só responder.',
   'Olá, {nome}. Aqui é do escritório {nome do escritório}. Lembramos que o valor de {valor} ({parcela}) vence em {vencimento}. Se já pagou, pode desconsiderar esta mensagem. Se precisar dos dados para pagar, é só responder aqui.'),
  ('PARCELA_ATRASO',
   'Olá, {nome}. A parcela {parcela}, de {valor}, venceu em {vencimento} e ainda não aparece como paga. Se já pagou, pode desconsiderar. Para pagar, use o link {link de pagamento}. Qualquer dúvida, é só responder.',
   'Olá, {nome}. Aqui é do escritório {nome do escritório}. O valor de {valor} ({parcela}) venceu em {vencimento} e ainda não aparece como pago. Se já pagou, pode desconsiderar esta mensagem. Se precisar dos dados para pagar ou quiser conversar sobre o pagamento, é só responder aqui.'),
  ('ETAPA_CASO',
   'Olá, {nome}. Há novidade no seu caso: {texto da etapa} Qualquer dúvida, é só responder.',
   'Olá, {nome}. Aqui é do escritório {nome do escritório}. Novidade no caso {caso}: {texto da etapa} Qualquer dúvida, é só responder esta mensagem.'),
  ('LEMBRETE_AUDIENCIA',
   'Olá, {nome}. Lembrete: {compromisso} em {data}, às {hora}, em {local}. Qualquer dúvida, é só responder.',
   'Olá, {nome}. Aqui é do escritório {nome do escritório}. Lembrete: {compromisso}, no dia {data}, às {hora}. Local: {local}. Responda CONFIRMO, ou escreva se tiver alguma dúvida.'),
  ('PRESTACAO_CONTAS',
   'Olá, {nome}. A prestação de contas de {caso} está pronta: {resumo}. Qualquer dúvida, é só responder.',
   'Olá, {nome}. Aqui é do escritório {nome do escritório}. A prestação de contas do caso {caso} está pronta: {resumo}. Qualquer dúvida, é só responder esta mensagem.');

do $$
declare a record;
begin
  for a in select * from d5_avisos loop
    perform d5_trocar('whatsapp_avisos_garantir(uuid,text)', quote_literal(a.antes), quote_literal(a.depois));
  end loop;
end $$;

-- Os avisos de cada escritório que ainda têm o texto semeado. Texto mudado de aviso que já foi à
-- Meta volta para a análise, como no ajuste feito pela sócia dona.
do $$
declare w record;
begin
  perform set_config('t3jus.fim_da_guarda', 'on', true);
  for w in
    update whatsapp_avisos x set texto = a.depois,
           situacao = case when x.situacao = 'NAO_ENVIADO' then 'NAO_ENVIADO' else 'EM_ANALISE' end,
           situacao_em = case when x.situacao = 'NAO_ENVIADO' then x.situacao_em else app_now() end,
           motivo_meta = null, motivo_simples = null, sugestao_ia = null
      from d5_avisos a
     where a.chave = x.chave and x.texto = a.antes
    returning x.escritorio_id, x.chave, x.situacao, a.antes
  loop
    perform whatsapp_evento(w.escritorio_id, 'AVISO', jsonb_build_object('chave', w.chave, 'situacao', w.situacao, 'texto_anterior', w.antes, 'origem', 'D5'), null);
  end loop;
  perform set_config('t3jus.fim_da_guarda', 'off', true);
end $$;

-- ---------------------------------------------------------------------------------------
-- A IA do escritório: nome, apresentação e fora do horário.

do $d$ begin perform d5_trocar('ia_config_garantir(uuid)', $q$'Assistente virtual do ' || v_nome$q$, $q$'Assistente virtual do escritório ' || v_nome$q$); end $d$;
do $d$ begin perform d5_trocar('ia_config_garantir(uuid)',
  $q$'Olá! Sou a assistente virtual do escritório ' || v_nome || '. Posso ajudar com o andamento do seu caso, compromissos, parcelas e documentos. Se precisar, passo para uma pessoa da equipe.'$q$,
  $q$'Olá. Sou a assistente virtual do escritório ' || v_nome || '. Posso ajudar com o andamento do caso, compromissos, parcelas e documentos. Quando for preciso, passo a conversa para uma pessoa da equipe.'$q$); end $d$;
do $d$ begin perform d5_trocar('ia_config_garantir(uuid)',
  $q$'Recebi sua mensagem. Nossa equipe atende de segunda a sexta, das 9h às 18h. Uma pessoa vai ver {próximo atendimento}. Se eu souber responder antes, respondo por aqui.'$q$,
  $q$'A equipe do escritório atende {horário de atendimento}. Uma pessoa vai ver {próximo atendimento} e responde por aqui.'$q$); end $d$;

do $$
begin
  perform set_config('t3jus.fim_da_guarda', 'on', true);
  update ia_config c set nome = left('Assistente virtual do escritório ' || e.nome, 80)
    from escritorios e where e.id = c.escritorio_id and c.nome = left('Assistente virtual do ' || e.nome, 80);
  update ia_config c set apresentacao = left('Olá. Sou a assistente virtual do escritório ' || e.nome || '. Posso ajudar com o andamento do caso, compromissos, parcelas e documentos. Quando for preciso, passo a conversa para uma pessoa da equipe.', 300)
    from escritorios e where e.id = c.escritorio_id
     and c.apresentacao = left('Olá! Sou a assistente virtual do escritório ' || e.nome || '. Posso ajudar com o andamento do seu caso, compromissos, parcelas e documentos. Se precisar, passo para uma pessoa da equipe.', 300);
  update ia_config set msg_fora_horario = 'A equipe do escritório atende {horário de atendimento}. Uma pessoa vai ver {próximo atendimento} e responde por aqui.'
   where msg_fora_horario = 'Recebi sua mensagem. Nossa equipe atende de segunda a sexta, das 9h às 18h. Uma pessoa vai ver {próximo atendimento}. Se eu souber responder antes, respondo por aqui.';
  perform set_config('t3jus.fim_da_guarda', 'off', true);
end $$;

-- ---------------------------------------------------------------------------------------
-- Texto da etapa final do caso.

do $d$ begin perform d5_trocar('etapas_garantir(uuid)', $q$'o seu caso terminou. Obrigado pela confiança; seguimos à disposição.'$q$,
                 $q$'o seu caso terminou. Agradecemos a confiança e seguimos à disposição.'$q$); end $d$;
do $$
begin
  perform set_config('t3jus.fim_da_guarda', 'on', true);
  update etapas set texto_cliente = 'o seu caso terminou. Agradecemos a confiança e seguimos à disposição.'
   where texto_cliente = 'o seu caso terminou. Obrigado pela confiança; seguimos à disposição.';
  perform set_config('t3jus.fim_da_guarda', 'off', true);
end $$;

-- ---------------------------------------------------------------------------------------
-- Automações: sem {link de pagamento} nos gatilhos de parcela e o histórico em frase completa.

do $d$ begin perform d5_trocar('automacao_campos(text)', $q$'vencimento', 'link de pagamento', 'nome do escritório'$q$, $q$'vencimento', 'nome do escritório'$q$); end $d$;
do $d$ begin perform d5_trocar('automacao_andar(uuid)', $q$'Falta um dado para completar o texto da mensagem.'$q$,
                 $q$'Faltou um dado do cliente para completar a mensagem, e ela não saiu. Confira a ficha do cliente.'$q$); end $d$;
do $d$ begin perform d5_trocar('automacao_andar(uuid)', $q$'Passo desconhecido.'$q$,
                 $q$'Um passo desta automação não foi reconhecido, e a execução parou. Abra o desenho e confira os passos.'$q$); end $d$;
do $d$ begin perform d5_trocar('automacao_andar(uuid)', $q$'" não tem texto aprovado.'$q$,
                 $q$'" não saiu porque ainda não tem texto aprovado. A sócia dona aprova o texto na automação.'$q$); end $d$;

-- ---------------------------------------------------------------------------------------
-- Motivos próprios: petição (só quem gerou envia) e planilha das linhas de fora já apagada.

do $d$ begin perform d5_trocar('portal_peticao_enviar(uuid,uuid,uuid,text)', $q$'motivo', 'SEM_PERMISSAO'$q$, $q$'motivo', 'SO_QUEM_GEROU'$q$); end $d$;
do $d$ begin perform d5_trocar('portal_peticao_versao_preparar(uuid,uuid,uuid,jsonb)', $q$'motivo', 'SEM_PERMISSAO'$q$, $q$'motivo', 'SO_QUEM_GEROU'$q$); end $d$;
do $d$ begin perform d5_trocar('portal_peticao_versao_gravar(uuid,uuid,uuid,jsonb,jsonb)', $q$'motivo', 'SEM_PERMISSAO'$q$, $q$'motivo', 'SO_QUEM_GEROU'$q$); end $d$;
do $d$ begin perform d5_trocar('portal_importacao_fora(uuid,uuid,uuid)', $q$'A planilha das linhas de fora foi apagada', 'PRAZO_ENCERRADO'$q$,
                 $q$'A planilha das linhas de fora foi apagada', 'PLANILHA_APAGADA'$q$); end $d$;

drop function d5_trocar(regprocedure, text, text);
drop table d5_avisos;
