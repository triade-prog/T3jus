-- Textos no tom do T3jus (D5, F3.91; migration 0610): os avisos prontos dizem de quem são e
-- não levam o {link de pagamento}, a IA nasce com o nome e o fora do horário novos, e os
-- motivos próprios das petições.
begin;
select plan(9);

create temp table ids as select teste.escritorio('Ribeiro & Matos') as rm;

select whatsapp_avisos_garantir((select rm from ids), 'NAO_ENVIADO');
select is((select count(*)::int from whatsapp_avisos where escritorio_id = (select rm from ids)
            and texto like 'Olá, {nome}. Aqui é do escritório {nome do escritório}. %'), 7,
  'os 7 avisos prontos (com o de cancelamento, F3.3) começam dizendo de quem são');
select is((select count(*)::int from whatsapp_avisos where escritorio_id = (select rm from ids)
            and (texto like '%link de pagamento%' or texto like '%!%' or texto like '%Obrigad%')), 0,
  'sem link de pagamento, sem exclamação e sem "Obrigado"');
select ok(not ('link de pagamento' = any (automacao_campos('PARCELA_ATRASO'))) and not ('link de pagamento' = any (automacao_campos('PARCELA_VAI_VENCER'))),
  'o campo {link de pagamento} sai dos gatilhos de parcela');

select ia_config_garantir((select rm from ids));
select is((select nome from ia_config where escritorio_id = (select rm from ids)), 'Assistente virtual do escritório Ribeiro & Matos', 'nome da IA');
select ok((select apresentacao from ia_config where escritorio_id = (select rm from ids)) like 'Olá. Sou a assistente virtual do escritório Ribeiro & Matos.%',
  'apresentação sem exclamação');
select is((select msg_fora_horario from ia_config where escritorio_id = (select rm from ids)),
  'A equipe do escritório atende {horário de atendimento}. Uma pessoa vai ver {próximo atendimento} e responde por aqui.',
  'fora do horário com {horário de atendimento} e sem prometer resposta da IA');

select ok(position('Agradecemos a confiança' in pg_get_functiondef('etapas_garantir(uuid)'::regprocedure)) > 0, 'etapa final sem "Obrigado"');
select ok(position('SEM_PERMISSAO' in pg_get_functiondef('portal_peticao_enviar(uuid,uuid,uuid,text)'::regprocedure)) = 0
          and position('SO_QUEM_GEROU' in pg_get_functiondef('portal_peticao_enviar(uuid,uuid,uuid,text)'::regprocedure)) > 0,
  'petição: só quem gerou envia, com motivo próprio');
select ok(position('PLANILHA_APAGADA' in pg_get_functiondef('portal_importacao_fora(uuid,uuid,uuid)'::regprocedure)) > 0,
  'planilha das linhas de fora apagada, com motivo próprio');

select * from finish();
rollback;
