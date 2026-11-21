-- Conversas › Automações. As seis prontas nascem ligadas, com o texto dos avisos; cada pessoa
-- vê só as das suas áreas; quem tem a área monta e o formato do desenho é conferido; os erros
-- ficam presos ao passo (sem saída, sem responsável, campo que o gatilho não tem, mais de uma
-- cobrança na semana); só a sócia dona aprova o texto, liga e desliga; o texto aprovado não
-- muda; ligar pede WhatsApp, revisão e resolve o conflito com a cobrança antiga; o texto novo
-- espera a Meta e a versão anterior segue; quem entraria hoje e quem fica de fora, com o motivo;
-- a simulação recebe só o que a pessoa pode ver; execuções, falha com responsável; nada se
-- apaga; isolamento (PA-03, FI-04, PD-07, PA-01, PT-03, PT-01).
begin;
select plan(56);

select ajustar_relogio(('2026-11-01 10:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Gustavo Lima') as gustavo,
  teste.pessoa('Felipe Matos') as felipe,
  teste.pessoa('Paula Nunes') as paula,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, gustavo, 'Gustavo Lima', array['FINANCEIRO']),
       portal_convidar(socia, rm, felipe, 'Felipe Matos', array['JURIDICO']),
       portal_convidar(socia, rm, paula, 'Paula Nunes', array[]::text[]) from ids;

-- Cinco clientes, cada um com uma parcela que venceu em 15/11 (3 dias de atraso hoje).
create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PJ', 'nome', 'Farmácia Bom Jesus Ltda', 'origem', 'INDICACAO_CLIENTE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Sueli Ramos', 'papel', 'gerente', 'telefone', '+5511996027738', 'principal', true)))) ->> 'id')::uuid far,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Irene Castro', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Irene Castro', 'telefone', '+5511996027731', 'principal', true)))) ->> 'id')::uuid ire,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Eduardo Nascimento', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Eduardo Nascimento', 'telefone', '+551130324410', 'principal', true)))) ->> 'id')::uuid edu,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Antônia Ferreira Prado', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Joana Prado', 'papel', 'filha', 'telefone', '+5511996027732', 'principal', true)))) ->> 'id')::uuid ant,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PJ', 'nome', 'Construtora Vale Alto Ltda', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Rui', 'telefone', '+5511996027733', 'principal', true)))) ->> 'id')::uuid con
  from ids;

create temp table ct as select k.k, (portal_contrato_criar(socia, rm, jsonb_build_object('clienteId', k.id, 'objeto', 'Assessoria',
     'responsavelId', ids.socia, 'advogados', jsonb_build_array(ids.socia),
     'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'PARCELADO', 'total', 180000, 'parcelas', 1, 'primeiro', '2026-11-15')))) ->> 'id')::uuid id
  from ids, cli, lateral (values ('far', cli.far), ('ire', cli.ire), ('edu', cli.edu), ('ant', cli.ant), ('con', cli.con)) k (k, id);
select portal_contrato_assinatura(socia, rm, ct.id, 1, '2026-11-01') from ids, ct;
select ajustar_relogio(('2026-11-18 10:12-03'::timestamptz - now()));
create temp table parc as select ct.k, r.id from ct join recebimentos_previstos r on r.contrato_id = ct.id;

-- As seis prontas.
select is((select jsonb_agg(a ->> 'prontaChave' || ':' || (a ->> 'situacao')) from ids, jsonb_array_elements(portal_automacoes(socia, rm) -> 'automacoes') a),
  '["PAGAMENTO_RECEBIDO:LIGADA","PARCELA_VAI_VENCER:LIGADA","PARCELA_ATRASO:LIGADA","ETAPA_CASO:LIGADA","LEMBRETE_AUDIENCIA:LIGADA","PRESTACAO_CONTAS:LIGADA"]'::jsonb,
  'EX-11, EX-14, FI-12: os seis avisos viram automações prontas, ligadas');
select is((select sum((a ->> 'erros')::integer) from ids, jsonb_array_elements(portal_automacoes(socia, rm) -> 'automacoes') a), 0::bigint,
  'as prontas não têm erro');
select is((select jsonb_array_length(portal_automacoes(gustavo, rm) -> 'automacoes') from ids), 4, 'PA-01: Gustavo (Financeiro) vê as quatro do Financeiro');
select ok((select portal_automacoes(gustavo, rm) -> 'pessoas' @> jsonb_build_array(jsonb_build_object('id', gustavo)) from ids), 'PA-03: a lista traz a equipe, para dizer para quem passa');
select is((select jsonb_agg(a ->> 'gatilho') from ids, jsonb_array_elements(portal_automacoes(felipe, rm) -> 'automacoes') a),
  '["ETAPA_CASO","LEMBRETE_AUDIENCIA"]'::jsonb, 'Felipe (Jurídico) vê as duas do Jurídico');
select is((select jsonb_array_length(portal_automacoes(paula, rm) -> 'automacoes') from ids), 0, 'sem área, nenhuma');
select throws_ok($$ select portal_automacoes(intrusa, rm) from ids $$, 'TC401', null, 'PT-01: outro escritório não lê');
create temp table pr as select (a ->> 'id')::uuid id, a ->> 'prontaChave' k from ids, jsonb_array_elements(portal_automacoes(socia, rm) -> 'automacoes') a;
select is((teste.erro($$ select portal_automacao(felipe, rm, pr.id) from ids, pr where k = 'PARCELA_ATRASO' $$)) ->> 'codigo', 'TC404',
  'quem não tem Financeiro nem sabe que a cobrança existe');
select is((select portal_automacao(socia, rm, pr.id) -> 'aviso' ->> 'situacao' from ids, pr where k = 'PARCELA_ATRASO'), 'NAO_ENVIADO',
  'a pronta usa o texto do aviso de Escritório › WhatsApp');
select is((select automacao_dias_cobranca(portal_automacao(socia, rm, pr.id) -> 'rascunho' -> 'passos') from ids, pr where k = 'PARCELA_ATRASO'),
  array[1, 8, 15], 'a cobrança pronta sai 1, 8 e 15 dias depois (1 por semana)');

-- Criar: quem tem a área do gatilho.
select is((teste.erro($$ select portal_automacao_criar(felipe, rm, '{"gatilho":"PARCELA_ATRASO","nome":"Cobrança"}') from ids $$)) -> 'detalhe' ->> 'motivo',
  'AREA_NAO_LIBERADA', 'sem Financeiro, não monta cobrança');
select is((teste.erro($$ select portal_automacao_criar(gustavo, rm, '{"gatilho":"NADA","nome":"x"}') from ids $$)) -> 'detalhe' -> 'campos',
  '["gatilho"]'::jsonb, 'gatilho desconhecido');
create temp table au as select (portal_automacao_criar(gustavo, rm, '{"gatilho":"PARCELA_ATRASO","nome":"Cobrança gentil de parcela em atraso"}') ->> 'id')::uuid id from ids;
select is((select portal_automacao(gustavo, rm, au.id) ->> 'situacao' from ids, au), 'RASCUNHO', 'nasce em rascunho');
select is((select portal_automacao(gustavo, rm, au.id) -> 'listaErros' from ids, au), '[{"passo":"msg","codigo":"TEXTO_VAZIO"}]'::jsonb,
  'com gatilho, condições, mensagem a escrever e fim');

-- O formato do desenho.
create function pg_temp.fluxo(t text) returns jsonb language sql as $$
  select replace(replace(t, 'GUSTAVO', (select gustavo::text from ids)), 'INTRUSA', (select intrusa::text from ids))::jsonb $$;
create function pg_temp.salvar(p uuid, t text) returns jsonb language sql as $$
  select portal_automacao_salvar(p, (select rm from ids), (select id from au),
                                 (select versao from automacoes where id = (select id from au)), jsonb_build_object('fluxo', pg_temp.fluxo(t))) $$;
select is((teste.erro($$ select pg_temp.salvar(gustavo, '{"passos":[{"id":"m","tipo":"MENSAGEM","nome":"A","texto":"Olá"},{"id":"g","tipo":"GATILHO","dias":3}]}') from ids $$))
  -> 'detalhe' -> 'campos', '["fluxo"]'::jsonb, 'o gatilho é o primeiro passo');
select is((teste.erro($$ select pg_temp.salvar(gustavo, '{"passos":[{"id":"g","tipo":"GATILHO","dias":3},{"id":"x","tipo":"SMS"}]}') from ids $$))
  -> 'detalhe' -> 'campos', '["fluxo"]'::jsonb, 'tipo de passo desconhecido');
select is((teste.erro($$ select pg_temp.salvar(gustavo, '{"passos":[{"id":"g","tipo":"GATILHO","dias":3},{"id":"m","tipo":"MENSAGEM","nome":"A","aviso":"PARCELA_ATRASO"},{"id":"f","tipo":"FIM"}]}') from ids $$))
  -> 'detalhe' -> 'campos', '["fluxo"]'::jsonb, 'o texto do aviso pronto é só das prontas');
select is((teste.erro($$ select pg_temp.salvar(gustavo, '{"passos":[{"id":"g","tipo":"GATILHO","dias":3},{"id":"f","tipo":"FIM"},{"id":"m","tipo":"IA"}]}') from ids $$))
  -> 'detalhe' -> 'campos', '["fluxo"]'::jsonb, 'nada vem depois do fim');
select is((teste.erro($$ select pg_temp.salvar(gustavo, '{"passos":[{"id":"g","tipo":"GATILHO","dias":3},{"id":"g","tipo":"FIM"}]}') from ids $$))
  -> 'detalhe' -> 'campos', '["fluxo"]'::jsonb, 'id de passo repetido');

-- Os três erros do desenho: campo que o gatilho não tem, caminho sem saída e passar para ninguém.
select is((select jsonb_agg(e ->> 'codigo' order by e ->> 'codigo') from ids,
  jsonb_array_elements(pg_temp.salvar(gustavo, '{"passos":[{"id":"gatilho","tipo":"GATILHO","dias":3},{"id":"cond","tipo":"CONDICOES","semCombinado":true},
   {"id":"msg","tipo":"MENSAGEM","nome":"Cobrança gentil · 1º aviso","texto":"Olá, {nome}. A parcela {parcela}, de {valor}, venceu antes da {data da audiência}. Qualquer dúvida, é só responder."},
   {"id":"espera","tipo":"ESPERA","dias":5},
   {"id":"ramo","tipo":"RAMOS","ramos":[{"quando":"PAGOU","passos":[{"id":"fim-p","tipo":"FIM"}]},{"quando":"RESPONDEU","passos":[]},
     {"quando":"NADA","passos":[{"id":"pessoa","tipo":"PESSOA","motivo":"5 dias sem pagamento nem resposta"}]}]}]}') -> 'listaErros') e),
  '["CAMPO_INEXISTENTE","PASSO_SEM_SAIDA","RESPONSAVEL_OBRIGATORIO"]'::jsonb, 'os erros ficam presos ao passo');
select is((select e -> 'campos' from ids, au, jsonb_array_elements(portal_automacao(gustavo, rm, au.id) -> 'listaErros') e where e ->> 'codigo' = 'CAMPO_INEXISTENTE'),
  '["data da audiência"]'::jsonb, 'com o campo que a parcela não tem');
select is((select e ->> 'ramo' from ids, au, jsonb_array_elements(portal_automacao(gustavo, rm, au.id) -> 'listaErros') e where e ->> 'codigo' = 'PASSO_SEM_SAIDA'),
  'RESPONDEU', 'e o caminho sem saída');
select is((teste.erro($$ select portal_automacao_simulacao(gustavo, rm, au.id) from ids, au $$)) -> 'detalhe' ->> 'motivo', 'FLUXO_COM_ERRO',
  'testar fica travado com erro');
select throws_ok($$ select portal_automacao_salvar(gustavo, rm, au.id, 1, '{"nome":"Outra"}') from ids, au $$, 'TC409', null, 'versão antiga dá conflito');
select is((select jsonb_agg(e ->> 'codigo') from ids, jsonb_array_elements(pg_temp.salvar(gustavo, '{"passos":[{"id":"gatilho","tipo":"GATILHO","dias":3},
   {"id":"m1","tipo":"MENSAGEM","nome":"1","texto":"Olá, {nome}. A parcela venceu. Qualquer dúvida, é só responder."},{"id":"e","tipo":"ESPERA","dias":5},
   {"id":"m2","tipo":"MENSAGEM","nome":"2","texto":"Olá, {nome}. A parcela continua em aberto. Qualquer dúvida, é só responder."},
   {"id":"p","tipo":"PESSOA","pessoaId":"INTRUSA"}]}') -> 'listaErros') e),
  '["LIMITE_SEMANAL","RESPONSAVEL_INVALIDO"]'::jsonb, 'duas cobranças em 5 dias passam do limite; pessoa de fora não é responsável');

-- O desenho certo.
select is((select pg_temp.salvar(gustavo, '{"passos":[{"id":"gatilho","tipo":"GATILHO","dias":3},{"id":"cond","tipo":"CONDICOES","semCombinado":true},
   {"id":"msg","tipo":"MENSAGEM","nome":"Cobrança gentil · 1º aviso","texto":"Olá, {nome}. A parcela {parcela}, de {valor}, venceu em {vencimento} e ainda não aparece como paga. Qualquer dúvida, é só responder."},
   {"id":"espera","tipo":"ESPERA","dias":5},
   {"id":"ramo","tipo":"RAMOS","ramos":[{"quando":"PAGOU","passos":[{"id":"fim-p","tipo":"FIM"}]},{"quando":"RESPONDEU","passos":[{"id":"ia","tipo":"IA"},{"id":"fim-r","tipo":"FIM"}]},
     {"quando":"NADA","passos":[{"id":"pessoa","tipo":"PESSOA","pessoaId":"GUSTAVO","motivo":"5 dias sem pagamento nem resposta"}]}]}]}') -> 'textosPorAprovarIds' from ids),
  '["msg"]'::jsonb, 'sem erro, falta só aprovar o texto');

-- Aprovar o texto: só a sócia dona; depois o texto não muda.
select is((teste.erro($$ select portal_automacao_aprovar_texto(gustavo, rm, au.id, a.versao, 'msg') from ids, au, automacoes a where a.id = au.id $$)) -> 'detalhe' ->> 'motivo',
  'SO_SOCIO_DONO', 'só a sócia dona aprova o texto');
select is((select portal_automacao_aprovar_texto(socia, rm, au.id, a.versao, 'msg') -> 'textosPorAprovar' from ids, au, automacoes a where a.id = au.id), '0'::jsonb,
  'aprovado, o texto vira modelo');
select ok((select automacao_passo(rascunho, 'msg') ? 'modeloId' and not automacao_passo(rascunho, 'msg') ? 'texto' from automacoes, au where automacoes.id = au.id),
  'o passo passa a usar o modelo');
select throws_ok($$ update automacao_modelos set texto = 'Outro texto qualquer aqui' $$, 'TC023', null, 'o texto aprovado não muda');

-- Ligar.
select is((teste.erro($$ select portal_automacao_ligar(gustavo, rm, au.id, a.versao, '{"revisou":true}') from ids, au, automacoes a where a.id = au.id $$)) -> 'detalhe' ->> 'motivo',
  'SO_SOCIO_DONO', 'só a sócia dona liga');
select is((teste.erro($$ select portal_automacao_ligar(socia, rm, au.id, a.versao, '{"revisou":true}') from ids, au, automacoes a where a.id = au.id $$)) -> 'detalhe' ->> 'motivo',
  'WHATSAPP_NAO_LIGADO', 'sem o WhatsApp ligado, monta e testa, mas não liga');
select whatsapp_meta_ligou(rm, socia, '{"telefone":"+5511974052210","nomeExibicao":"Ribeiro & Matos"}') from ids;
select is((teste.erro($$ select portal_automacao_ligar(socia, rm, au.id, a.versao, '{}') from ids, au, automacoes a where a.id = au.id $$)) -> 'detalhe' -> 'campos',
  '["revisou"]'::jsonb, 'pede a revisão');
select is((select jsonb_agg(c ->> 'nome') from ids, au, jsonb_array_elements(portal_automacao(socia, rm, au.id) -> 'conflitos') c), '["Parcela em atraso"]'::jsonb,
  'a cobrança pronta conflita (3 dias contra 1 e 8)');
select is((teste.erro($$ select portal_automacao_ligar(socia, rm, au.id, a.versao, '{"revisou":true}') from ids, au, automacoes a where a.id = au.id $$)) -> 'detalhe' ->> 'motivo',
  'CONFLITO_LIMITE_SEMANAL', 'não liga duas cobranças na mesma semana');
select is((select portal_automacao_ligar(socia, rm, au.id, a.versao, '{"revisou":true,"desligarConflitos":true,"entramJaAtrasados":false}') -> 'aguardando' ->> 'numero'
  from ids, au, automacoes a where a.id = au.id), '1', 'texto novo: a versão 1 espera a Meta');
select is((select situacao || ' · ' || desligada_motivo from automacoes, pr where automacoes.id = pr.id and pr.k = 'PARCELA_ATRASO'),
  'DESLIGADA · Desligada ao ligar “Cobrança gentil de parcela em atraso”: as duas cobrariam na mesma semana', 'e a antiga desliga, com o motivo');
select is((select meta_situacao from automacao_modelos, au where automacao_id = au.id), 'EM_ANALISE', 'o texto vai para a análise da Meta');
select is((teste.erro($$ select portal_automacao_ligar(socia, rm, au.id, a.versao, '{"revisou":true}') from ids, au, automacoes a where a.id = au.id $$)) -> 'detalhe' ->> 'motivo',
  'JA_EM_APROVACAO', 'não manda duas vezes');
select automacao_meta_modelo(rm, m.id, 'APROVADO') from ids, automacao_modelos m, au where m.automacao_id = au.id;
select is((select portal_automacao(socia, rm, au.id) ->> 'situacao' || ' v' || (portal_automacao(socia, rm, au.id) ->> 'versaoLigada') from ids, au), 'LIGADA v1',
  'aprovada pela Meta, liga sozinha');
select is((select jsonb_agg(e ->> 'tipo') from ids, au, jsonb_array_elements(portal_automacao(socia, rm, au.id) -> 'eventos') e),
  '["META_APROVOU","EM_APROVACAO","TEXTO_APROVADO","CRIADA"]'::jsonb, 'PT-03: cada passo fica no histórico');

-- Mudar uma ligada: o rascunho muda; a ligada continua valendo.
select is((select r ->> 'rascunhoMudou' || ' ' || (r ->> 'situacao') from ids, au,
  lateral (select portal_automacao_salvar(gustavo, rm, au.id, a.versao,
    jsonb_build_object('fluxo', jsonb_set(a.rascunho, '{passos,3,dias}', '7'))) r from automacoes a where a.id = au.id) x), 'true LIGADA',
  'editar a ligada cria rascunho; ela segue valendo');

-- Quem entraria hoje.
select portal_cliente_sem_avisos(socia, rm, cli.ant, '{"tipo":"COBRANCA","origem":"CONVERSA","quemPediu":"Joana"}') from ids, cli;
select portal_financeiro_cobranca_anotar(gustavo, rm, parc.id, jsonb_build_object('tipo', 'LIGACAO', 'texto', 'Combinado por telefone.',
  'motivo', 'Paga junto com a medição', 'proxData', '2026-11-25', 'proxOque', 'Paga junto com a medição', 'proxResponsavelId', ids.gustavo)) from ids, parc where parc.k = 'con';
select is((select jsonb_agg((i -> 'cliente' ->> 'nome') || ':' || coalesce(i ->> 'motivo', 'ENTRA') order by i -> 'cliente' ->> 'nome') from ids, au,
  jsonb_array_elements(portal_automacao_quem_entraria(gustavo, rm, au.id) -> 'itens') i),
  '["Antônia Ferreira Prado:SEM_AVISOS","Construtora Vale Alto Ltda:COMBINADO","Eduardo Nascimento:SEM_WHATSAPP","Farmácia Bom Jesus Ltda:ENTRA","Irene Castro:ENTRA"]'::jsonb,
  'FI-04: quem entraria e quem fica de fora, com o motivo');
select is((select i -> 'detalhe' ->> 'quemPediu' from ids, au, jsonb_array_elements(portal_automacao_quem_entraria(gustavo, rm, au.id) -> 'itens') i
  where i ->> 'motivo' = 'SEM_AVISOS'), 'Joana', 'o pedido diz quem pediu');
select is((select portal_automacao_quem_entraria(felipe, rm, pr.id) ->> 'disponivel' from ids, pr where k = 'ETAPA_CASO'), 'true',
  'F3.62: nos gatilhos do Jurídico também há a lista');

-- Simular: só os dados da parcela escolhida, sem enviar nada.
select is((select portal_automacao_simulacao(gustavo, rm, au.id, parc.id) -> 'exemplo' ->> 'contato' from ids, au, parc where parc.k = 'far'), 'Sueli Ramos',
  'simula com a parcela real, para o contato principal');
select is((teste.erro($$ select portal_automacao_simulacao(felipe, rm, pr.id, parc.id) from ids, pr, parc where pr.k = 'ETAPA_CASO' and parc.k = 'far' $$)) -> 'detalhe' ->> 'motivo',
  'CLIENTE_FORA_DO_GATILHO', 'parcela não serve para etapa do caso');

-- Sugerir mudança e desligar.
select is((select portal_automacao_sugerir(gustavo, rm, au.id, 'Esperar 7 dias em vez de 5') -> 'eventos' -> 0 ->> 'tipo' from ids, au), 'SUGESTAO',
  'quem não é dona sugere; a sugestão fica na automação');
select is((teste.erro($$ select portal_automacao_desligar(socia, rm, au.id, a.versao, '  ') from ids, au, automacoes a where a.id = au.id $$)) -> 'detalhe' -> 'campos',
  '["motivo"]'::jsonb, 'desligar pede motivo');
select is((select portal_automacao_desligar(socia, rm, au.id, a.versao, 'Clientes reclamaram do horário') -> 'desligada' ->> 'motivo' from ids, au, automacoes a where a.id = au.id),
  'Clientes reclamaram do horário', 'desligada, com o motivo');

-- Execuções: falha sempre com responsável; a falha vem primeiro.
select throws_ok($$ select automacao_execucao_registrar(rm, pr.id, jsonb_build_object('clienteId', cli.edu, 'origem', 'COMPROMISSO', 'origemId', gen_random_uuid(),
  'rotulo', 'Conciliação 25/11, 14:00', 'situacao', 'FALHOU', 'motivo', 'O número é fixo')) from ids, pr, cli where pr.k = 'LEMBRETE_AUDIENCIA' $$,
  '23514', null, 'PD-07: falha sem responsável não entra');
select automacao_execucao_registrar(rm, pr.id, jsonb_build_object('clienteId', cli.ire, 'origem', 'COMPROMISSO', 'origemId', gen_random_uuid(),
  'rotulo', 'Conciliação 18/11, 11:00', 'situacao', 'CONCLUIDA', 'caminho', '[{"passo":"gatilho"},{"passo":"msg-1"}]'::jsonb)) from ids, pr, cli where pr.k = 'LEMBRETE_AUDIENCIA';
select automacao_execucao_registrar(rm, pr.id, jsonb_build_object('clienteId', cli.edu, 'origem', 'COMPROMISSO', 'origemId', gen_random_uuid(),
  'rotulo', 'Conciliação 25/11, 14:00', 'situacao', 'FALHOU', 'motivo', 'O número é fixo e não tem WhatsApp', 'responsavelId', ids.felipe)) from ids, pr, cli where pr.k = 'LEMBRETE_AUDIENCIA';
select is((select jsonb_agg((i ->> 'situacao') || ':' || coalesce(i -> 'responsavel' ->> 'nome', '')) from ids, pr,
  jsonb_array_elements(portal_automacao_execucoes(felipe, rm, pr.id) -> 'itens') i where pr.k = 'LEMBRETE_AUDIENCIA'),
  '["FALHOU:Felipe Matos","CONCLUIDA:"]'::jsonb, 'a falha vem primeiro, com quem ficou responsável');
select is((select a -> 'seteDias' from ids, jsonb_array_elements(portal_automacoes(felipe, rm) -> 'automacoes') a where a ->> 'gatilho' = 'LEMBRETE_AUDIENCIA'),
  '{"enviadas": 2, "falhas": 1}'::jsonb, 'a lista mostra os últimos 7 dias');

-- Nada se apaga; isolamento.
select throws_ok($$ update automacao_versoes set fluxo = '{}' $$, 'TC023', null, 'PT-03: versão ligada não se reescreve');
select throws_ok($$ delete from automacoes $$, 'TC023', null, 'automação não se apaga');
select is((teste.erro($$ select portal_automacao(intrusa, outro, au.id) from ids, au $$)) ->> 'codigo', 'TC404', 'PT-01: outro escritório não encontra');

select * from finish();
rollback;
