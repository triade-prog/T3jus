-- Escritório › WhatsApp e IA. Só a sócia dona liga, muda e desliga; a equipe lê. O assistente
-- fica salvo; o número é conferido (fixo não recebe SMS); o serviço registra o número sem
-- token, e os avisos vão para a Meta; a recusa volta com o motivo e o texto ajustado não pode
-- começar nem terminar com campo; desligar pede motivo e para a IA; a IA nasce desligada, o
-- nome diz "Assistente virtual", cada mudança guarda a versão, e sem teste não liga; pausar;
-- respostas sugeridas e publicadas; perguntas que a IA não soube viram resposta; isolamento
-- (PA-04, PA-02, PT-03, PT-01).
begin;
select plan(49);

select ajustar_relogio(('2026-11-18 10:12-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Paula Nunes') as paula,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, paula, 'Paula Nunes', array[]::text[]), portal_convidar(socia, rm, diego, 'Diego Almeida', array['COMERCIAL']) from ids;

-- Sem número.
select is((select portal_whatsapp(paula, rm) -> 'numero' from ids), 'null'::jsonb, 'sem número, a página diz que não está ligado');
select is((select portal_whatsapp(paula, rm) -> 'quemCuida' ->> 'nome' from ids), 'Marina Ribeiro', 'e diz quem cuida');
select is((select portal_whatsapp(paula, rm) ->> 'dono' from ids), 'false', 'Paula lê sem ser dona');
select is((teste.erro($$ select portal_whatsapp_rascunho(paula, rm, '{"passo":1}') from ids $$)) -> 'detalhe' ->> 'motivo',
  'SO_SOCIO_DONO', 'só a sócia dona usa o assistente');
select throws_ok($$ select portal_whatsapp(intrusa, rm) from ids $$, 'TC401', null, 'outro escritório não vê');

-- Passo 1: conferir o número.
select is((teste.erro($$ select portal_whatsapp_conferir_numero(socia, rm, '{"telefone":"+551130324410","receberCodigo":"SMS","confirmouNumero":true}') from ids $$))
  -> 'detalhe' -> 'motivos' ->> 'receberCodigo', 'FIXO_SEM_SMS', 'fixo não recebe SMS');
select is((teste.erro($$ select portal_whatsapp_conferir_numero(socia, rm, '{"telefone":"+5511123","receberCodigo":"VOZ"}') from ids $$))
  -> 'detalhe' -> 'motivos', '{"telefone":"NUMERO_INVALIDO","confirmouNumero":"CONFIRME_NUMERO_DO_ESCRITORIO"}'::jsonb,
  'número inválido e sem confirmar que é do escritório');
select is((select portal_whatsapp_conferir_numero(socia, rm, '{"telefone":"+551130324410","receberCodigo":"VOZ","confirmouNumero":true}') ->> 'passo' from ids),
  '2', 'fixo por ligação de voz passa para o passo 2');
select is((select portal_whatsapp_conferir_numero(socia, rm, '{"telefone":"+5511974052210","receberCodigo":"SMS","confirmouNumero":true,"usaAppCelular":true}') from ids)
  - 'versao' - 'atualizadoEm' - 'atualizadoPor',
  '{"passo":2,"telefone":"+5511974052210","receberCodigo":"SMS","usaAppCelular":true,"confirmouNumero":true}'::jsonb, 'o rascunho fica salvo');
select is((select portal_whatsapp(socia, rm) -> 'rascunho' -> 'atualizadoPor' ->> 'nome' from ids), 'Marina Ribeiro', 'com quem salvou');

-- O serviço registra o número depois da janela da Meta.
select is((teste.erro($$ select whatsapp_meta_ligou(rm, paula, '{"telefone":"+5511974052210"}') from ids $$)) -> 'detalhe' ->> 'motivo',
  'SO_SOCIO_DONO', 'o serviço só liga pela sócia dona');
select is((teste.erro($$ select whatsapp_meta_ligou(rm, socia, '{"telefone":"+5511974052210","token":"EAAG"}') from ids $$)) -> 'detalhe' -> 'campos',
  '["token"]'::jsonb, 'o token nunca entra no banco');
select lives_ok($$ select whatsapp_meta_ligou(rm, socia, '{"telefone":"+5511974052210","nomeExibicao":"Ribeiro & Matos Advocacia","usaAppCelular":true,
  "portfolioId":"123","contaWhatsappId":"456","numeroId":"789","tokenRef":"whatsapp/rm"}') from ids $$, 'liga o número');
select is((select portal_whatsapp(paula, rm) -> 'numero' ->> 'situacao' from ids), 'EM_ANALISE', 'esperando a Meta conferir o nome');
select ok((select whatsapp_ligado(rm) from ids), 'mas já recebe e responde');
select is((select jsonb_agg(a ->> 'situacao') from ids, jsonb_array_elements(portal_whatsapp(socia, rm) -> 'avisos') a),
  '["EM_ANALISE","EM_ANALISE","EM_ANALISE","EM_ANALISE","EM_ANALISE","EM_ANALISE"]'::jsonb, 'os 6 avisos vão para a análise da Meta');
select is((select portal_whatsapp(socia, rm) -> 'rascunho' ->> 'passo' from ids), '5', 'o assistente fica no passo Pronto');
select ok((select not (portal_whatsapp(socia, rm)::text ~ '(whatsapp/rm|tokenRef|789)') from ids), 'a página não devolve token nem ids da Meta');
select is((teste.erro($$ select whatsapp_meta_ligou(rm, socia, '{"telefone":"+5511974052210"}') from ids $$)) -> 'detalhe' ->> 'motivo',
  'JA_LIGADO', 'não liga duas vezes');
select is((teste.erro($$ select whatsapp_meta_ligou(outro, intrusa, '{"telefone":"+5511974052210"}') from ids $$)) -> 'detalhe' ->> 'motivo',
  'NUMERO_EM_OUTRA_CONTA', 'o mesmo número não liga em outro escritório');

-- Avisos da Meta.
select whatsapp_meta_evento(rm, 'NOME', '{"situacao":"APROVADO"}') from ids;
select whatsapp_meta_evento(rm, 'QUALIDADE', '{"situacao":"ALTA"}') from ids;
select whatsapp_meta_evento(rm, 'LIMITE', '{"limite":"250"}') from ids;
select whatsapp_meta_evento(rm, 'AVISO', '{"chave":"PAGAMENTO_RECEBIDO","situacao":"APROVADO"}') from ids;
select is((select (portal_whatsapp(paula, rm) -> 'numero') - array['versao', 'ligadoEm', 'ligadoPor', 'usadasHoje', 'desligadoEm', 'desligadoPor', 'desligadoMotivo', 'avisosEntreguesMes'] from ids),
  '{"situacao":"LIGADO","numero":"+5511974052210","nomeExibicao":"Ribeiro & Matos Advocacia","nomeSituacao":"APROVADO","qualidade":"ALTA",
    "limiteDia":250,"empresaVerificada":"NAO_ENVIADA","usaAppCelular":true,"temConta":true}'::jsonb, 'nome aprovado liga de vez, com a saúde');
select is((select portal_whatsapp(paula, rm) -> 'numero' -> 'avisosEntreguesMes' from ids), 'null'::jsonb, 'quem não é dona não vê o gasto na Meta');
select is((select portal_whatsapp(socia, rm) -> 'numero' ->> 'avisosEntreguesMes' from ids), '0', 'a sócia dona vê');
select is((teste.erro($$ select whatsapp_meta_evento(rm, 'AVISO', '{"chave":"PARCELA_ATRASO","situacao":"RECUSADO"}') from ids $$)) -> 'detalhe' -> 'campos',
  '["motivoSimples"]'::jsonb, 'recusa sem motivo simples não entra');
select whatsapp_meta_evento(rm, 'AVISO', '{"chave":"PARCELA_ATRASO","situacao":"RECUSADO","motivo":"INVALID_FORMAT","motivoSimples":"O texto começa com um campo.","sugestaoIa":"Olá, {nome}. A parcela venceu."}') from ids;
select is((select a ->> 'motivoSimples' from ids, jsonb_array_elements(portal_whatsapp(socia, rm) -> 'avisos') a where a ->> 'chave' = 'PARCELA_ATRASO'),
  'O texto começa com um campo.', 'a recusa volta com o motivo em palavras simples');
select is((teste.erro($$ select portal_whatsapp_aviso_ajustar(socia, rm, 'PARCELA_ATRASO', 2, '{nome}, sua parcela venceu. Pague: {link de pagamento}') from ids $$))
  -> 'detalhe' ->> 'motivo', 'CAMPO_NO_INICIO_OU_FIM', 'o texto não começa nem termina com campo');
select is((teste.erro($$ select portal_whatsapp_aviso_ajustar(paula, rm, 'PARCELA_ATRASO', 2, 'Olá, {nome}. A parcela venceu.') from ids $$))
  -> 'detalhe' ->> 'motivo', 'SO_SOCIO_DONO', 'só a sócia dona aprova texto');
select is((select a ->> 'situacao' from ids, jsonb_array_elements(portal_whatsapp_aviso_ajustar(socia, rm, 'PARCELA_ATRASO', 2, 'Olá, {nome}. A parcela {parcela} venceu.') -> 'avisos') a
  where a ->> 'chave' = 'PARCELA_ATRASO'), 'EM_ANALISE', 'o texto aprovado volta para a Meta');
select is((select count(*)::int from whatsapp_eventos, ids where escritorio_id = rm), 7, 'cada mudança fica no histórico do número');
select throws_ok($$ delete from whatsapp_eventos $$, 'TC023', null, 'o histórico do número não se apaga');

-- Como a IA atende.
select is((select portal_ia(paula, rm) ->> 'situacao' from ids), 'DESLIGADA', 'a IA nasce desligada');
select is((select portal_ia(paula, rm) -> 'config' ->> 'nome' from ids), 'Assistente virtual do escritório Ribeiro & Matos', 'com o nome do escritório');
select is((select portal_ia(paula, rm) -> 'comercial' ->> 'nome' from ids), 'Diego Almeida', 'contato novo vai para o Comercial');
select is((teste.erro($$ select portal_ia_salvar(socia, rm, 1, '{"nome":"Carla do Ribeiro & Matos"}') from ids $$)) -> 'detalhe' ->> 'motivo',
  'NOME_SEM_ASSISTENTE_VIRTUAL', 'a IA nunca finge ser pessoa');
select is((teste.erro($$ select portal_ia_salvar(paula, rm, 1, '{"tom":"FORMAL"}') from ids $$)) -> 'detalhe' ->> 'motivo',
  'SO_SOCIO_DONO', 'só a sócia dona muda a IA');
select is((select portal_ia_salvar(socia, rm, 1, '{"palavras":["Penhora","despejo","penhora"],"dias":[1,2,3,4,5],"horaInicio":"09:00","horaFim":"18:00"}') -> 'config' -> 'palavras' from ids),
  '["despejo","penhora"]'::jsonb, 'palavras do escritório sem repetir');
select is((select portal_ia(socia, rm) -> 'historico' -> 0 ->> 'oQueMudou' from ids), 'Mudou palavras do escritório', 'a versão anterior fica guardada');
select is((select conflito from (select teste.erro($$ select portal_ia_salvar(socia, rm, 1, '{"tom":"FORMAL"}') from ids $$) ->> 'codigo' conflito) x), 'TC409', 'com a versão lida');
select is((teste.erro($$ select portal_ia_ligar(socia, rm, 2, '{"revisou":true}') from ids $$)) -> 'detalhe' ->> 'motivo',
  'SEM_TESTE', 'sem teste sem enviar, a IA não liga');
update ia_config set testada_em = now(), testada_como = 'Antônia' where escritorio_id = (select rm from ids);
select is((select portal_ia_ligar(socia, rm, 3, '{"revisou":true}') ->> 'situacao' from ids), 'LIGADA', 'testada e revisada, liga');
select is((select portal_ia_pausar(socia, rm, 4) ->> 'situacao' from ids), 'PAUSADA', 'pausar é um clique');

-- Respostas do escritório.
select is((select r -> 'situacao' from ids, jsonb_array_elements(portal_ia_resposta_salvar(paula, rm, '{"pergunta":"Estacionamento","resposta":"O prédio não tem estacionamento."}') -> 'respostas') r),
  '"SUGERIDA"'::jsonb, 'quem não é dona sugere');
create temp table conv as select whatsapp_mensagem_recebida(rm, '+5511981143059', 'Hélio', 'Vocês atendem aos sábados?') c from ids;
select conversa_ia_nao_soube(rm, (select c from conv), 'Vocês atendem aos sábados?') from ids;
select is((select jsonb_array_length(portal_ia(socia, rm) -> 'naoSoube') from ids), 1, 'a pergunta que ela não soube aparece');
select is((select jsonb_array_length(portal_ia_resposta_salvar(socia, rm, jsonb_build_object('pergunta', 'Sábados', 'resposta', 'Não atendemos aos sábados.',
  'perguntaId', (select id from ia_perguntas_sem_resposta limit 1))) -> 'naoSoube') from ids), 0, 'e vira resposta com um clique');
select is((select count(*)::int from ia_respostas where situacao = 'PUBLICADA'), 1, 'a resposta da dona já sai publicada');

-- Desligar.
select is((teste.erro($$ select portal_whatsapp_desligar(socia, rm, 99, '{"motivo":"","entendi":true}') from ids $$)) -> 'detalhe' -> 'campos',
  '["motivo"]'::jsonb, 'desligar pede motivo');
select is((teste.erro($$ select portal_whatsapp_desligar(socia, rm, 99, '{"motivo":"Trocar de número","entendi":false}') from ids $$)) -> 'detalhe' -> 'campos',
  '["entendi"]'::jsonb, 'e a confirmação de que os avisos param');
select is((select portal_whatsapp_desligar(socia, rm, (select versao from whatsapp_escritorio w where w.escritorio_id = ids.rm),
  '{"motivo":"Trocar de número","entendi":true}') -> 'numero' ->> 'desligadoMotivo' from ids), 'Trocar de número', 'desliga com o motivo, sem apagar');
select ok((select not whatsapp_ligado(rm) from ids), 'desligado, nada entra');

select * from finish();
rollback;
