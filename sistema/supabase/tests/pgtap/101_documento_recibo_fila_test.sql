-- "Pedir de novo" e o recibo pela fila do WhatsApp do escritório (F3.42, EX-05; F3.19, FI-14):
-- os dois avisos novos entram nos avisos do escritório; o "Pedir de novo" põe o aviso
-- "Pedido de documento" na fila do contato principal, guarda a data e a ficha mostra; o recibo
-- vai com o PDF anexo e o aviso "Recibo de pagamento", não sai duas vezes e a automação
-- "Pagamento recebido" não manda outra para o mesmo pagamento; sem WhatsApp ou sem celular,
-- recusa; o Portal sabe se o WhatsApp está ligado; isolamento.
begin;
select plan(21);

select ajustar_relogio(('2026-11-18 10:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Rui Costa') as rui,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.pessoa('Ivo Outro') as ivo,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(ivo, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, diego, 'Diego Almeida', array['JURIDICO', 'FINANCEIRO']),
       portal_convidar(socia, rm, rui, 'Rui Costa', array['COMERCIAL']) from ids;

create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Hélio Batista Corrêa', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Marta Corrêa', 'papel', 'Esposa', 'telefone', '+5511996027736', 'principal', true)))) ->> 'id')::uuid hel,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Eduardo Nascimento', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Eduardo Nascimento', 'telefone', '+551130324410', 'principal', true)))) ->> 'id')::uuid edu
  from ids;

select portal_juridico_etapas(socia, rm) from ids;
create temp table cs as select
  (portal_juridico_caso_criar(diego, rm, jsonb_build_object('nome', 'Hélio x Banco Sul', 'area', 'CIVEL', 'parteContraria', 'Banco Sul S.A.',
     'etapaId', (select id from etapas e where e.escritorio_id = ids.rm and e.ordem = 1), 'responsavelId', ids.diego,
     'clientes', jsonb_build_array(jsonb_build_object('clienteId', cli.hel, 'papel', 'AUTOR'), jsonb_build_object('clienteId', cli.edu, 'papel', 'AUTOR')))) ->> 'id')::uuid id
  from ids, cli;
create temp table ped as select
  (portal_juridico_documento_pedir(diego, rm, cs.id, jsonb_build_object('descricao', 'Extrato do FGTS', 'clienteId', cli.hel)) ->> 'id')::uuid hel,
  (portal_juridico_documento_pedir(diego, rm, cs.id, jsonb_build_object('descricao', 'RG e CPF', 'clienteId', cli.edu)) ->> 'id')::uuid edu
  from ids, cs, cli;

-- Sem o WhatsApp ligado, recusa e o Portal sabe.
select is((teste.erro($$ select portal_juridico_documento_repedir_whatsapp(diego, rm, ped.hel) from ids, ped $$)) -> 'detalhe' ->> 'motivo',
  'WHATSAPP_NAO_LIGADO', 'sem o WhatsApp ligado, o "Pedir de novo" pela fila é recusado');
select is((select portal_escritorio(diego, rm) ->> 'whatsappLigado' from ids), 'false', 'o Portal sabe que o WhatsApp não está ligado');

select whatsapp_meta_ligou(rm, socia, '{"telefone":"+5511974052210","nomeExibicao":"Ribeiro & Matos"}') from ids;
select portal_automacoes(socia, rm) from ids;
select is((select portal_escritorio(diego, rm) ->> 'whatsappLigado' from ids), 'true', 'ligado, o Portal sabe');
select is((select string_agg(chave, ',' order by whatsapp_aviso_ordem(chave)) from whatsapp_avisos w, ids where w.escritorio_id = ids.rm and w.chave in ('DOCUMENTO_PEDIDO', 'RECIBO_PAGAMENTO')),
  'DOCUMENTO_PEDIDO,RECIBO_PAGAMENTO', 'os dois avisos novos estão nos avisos do escritório');

-- "Pedir de novo" pela fila.
select ajustar_relogio(('2026-11-20 09:30-03'::timestamptz - now()));
create temp table rp as select portal_juridico_documento_repedir_whatsapp(diego, rm, ped.hel) r from ids, ped;
create temp table m1 as select m.* from conversa_mensagens m, ids where m.escritorio_id = ids.rm and m.aviso_tipo = 'Pedido de documento';
select is((select texto from m1),
  'Olá, Marta. Aqui é do escritório Ribeiro & Matos. Para o caso Hélio x Banco Sul andar, ainda precisamos de: Extrato do FGTS. Pode mandar uma foto ou o arquivo por aqui mesmo. Se já mandou, agradecemos e pode desconsiderar esta mensagem.',
  'o aviso "Pedido de documento" sai com o texto aprovado, para o contato principal');
select is((select envio || ' · ' || (dados ->> 'aviso') || ' · ' || (dados -> 'campos' ->> 'documento') from m1), 'NA_FILA · DOCUMENTO_PEDIDO · Extrato do FGTS',
  'entra na fila com os campos do aviso da Meta');
select is((select telefone from conversas c, m1 where c.id = m1.conversa_id), '+5511996027736', 'na conversa do número da Marta');
select is((select r ->> 'repedidoEm' from rp), '2026-11-20', 'guarda a data do novo pedido');
select is((select r -> 'repedido' ->> 'envio' from rp), 'NA_FILA', 'a ficha mostra que o pedido está na fila');
select is((teste.erro($$ select portal_juridico_documento_repedir_whatsapp(diego, rm, ped.edu) from ids, ped $$)) -> 'detalhe' ->> 'motivo',
  'SEM_WHATSAPP', 'contato principal só com telefone fixo: recusa');
-- Quem pediu para não receber avisos não recebe.
select portal_cliente_sem_avisos(socia, rm, cli.hel, '{"tipo":"TODOS","origem":"CONVERSA","quemPediu":"Marta"}') from ids, cli;
select is((teste.erro($$ select portal_juridico_documento_repedir_whatsapp(diego, rm, ped.hel) from ids, ped $$)) -> 'detalhe' ->> 'motivo',
  'CLIENTE_SEM_AVISOS', 'o cliente que pediu para não receber avisos não recebe o pedido');
select portal_cliente_sem_avisos(socia, rm, cli.hel, '{"retirar":true,"origem":"CONVERSA","quemPediu":"Marta"}') from ids, cli;
select is((teste.erro($$ select portal_juridico_documento_repedir_whatsapp(ivo, outro, ped.hel) from ids, ped $$)) ->> 'codigo', 'TC404',
  'PT-01: pedido de outro escritório não é encontrado');

-- O recibo pela fila.
create temp table ct as select
  (portal_contrato_criar(socia, rm, jsonb_build_object('clienteId', cli.hel, 'objeto', 'Ação revisional',
     'responsavelId', ids.diego, 'advogados', jsonb_build_array(ids.socia),
     'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'PARCELADO', 'total', 255000, 'parcelas', 3, 'primeiro', '2026-11-25')))) ->> 'id')::uuid hel
  from ids, cli;
select portal_contrato_assinatura(socia, rm, ct.hel, 1, '2026-11-20') from ids, ct;
create temp table parc as select r.id, row_number() over (order by r.vencimento) n from recebimentos_previstos r, ct where r.contrato_id = ct.hel;
create temp table p1 as select (portal_financeiro_receber_registrar_recibo(diego, rm, parc.id,
  jsonb_build_object('valor', 85000, 'multaJuros', 2380, 'recebidoEm', '2026-11-20', 'forma', 'PIX', 'recibo', true)) ->> 'id')::uuid id
  from ids, parc where parc.n = 1;
create function pg_temp.arquivo(p uuid) returns jsonb language sql as $$
  select jsonb_build_object('caminho', format('%s/recibos/%s.pdf', (select rm from ids), p), 'nome', 'Recibo 2026-0001.pdf', 'bytes', '48211') $$;

select is((teste.erro($$ select portal_recibo_enviar(diego, rm, p1.id, jsonb_build_object('arquivo', jsonb_build_object('caminho', 'x/recibos/y.pdf', 'nome', 'Recibo.pdf', 'bytes', '10'))) from ids, p1 $$)) -> 'detalhe' -> 'campos',
  '["arquivo"]'::jsonb, 'o PDF tem de ser o do recibo deste pagamento');
create temp table env as select portal_recibo_enviar(diego, rm, p1.id, jsonb_build_object('arquivo', pg_temp.arquivo(p1.id))) r from ids, p1;
create temp table m2 as select m.* from conversa_mensagens m, ids where m.escritorio_id = ids.rm and m.aviso_tipo = 'Recibo de pagamento';
select is((select texto from m2),
  'Olá, Marta. Aqui é do escritório Ribeiro & Matos. Segue o recibo nº 2026-0001 do pagamento de R$ 873,80 (parcela 1 de 3). Agradecemos. Qualquer dúvida, é só responder esta mensagem.',
  'o aviso "Recibo de pagamento" leva o número, o valor com multa e juros e a parcela');
select is((select (anexo ->> 'tipo') || ' · ' || (anexo ->> 'nome') || ' · ' || envio from m2), 'DOCUMENTO · Recibo 2026-0001.pdf · NA_FILA', 'o PDF vai anexo, na fila');
select is((select r -> 'mensagem' ->> 'envio' from env), 'NA_FILA', 'a resposta diz que está na fila');
select is((teste.erro($$ select portal_recibo_enviar(diego, rm, p1.id, jsonb_build_object('arquivo', pg_temp.arquivo(p1.id))) from ids, p1 $$)) -> 'detalhe' ->> 'motivo',
  'RECIBO_JA_ENVIADO', 'o mesmo recibo não sai duas vezes');
select is((teste.erro($$ select portal_recibo_enviar(rui, rm, p1.id, jsonb_build_object('arquivo', pg_temp.arquivo(p1.id))) from ids, p1 $$)) -> 'detalhe' ->> 'motivo',
  'AREA_NAO_LIBERADA', 'sem Financeiro, não manda');
select is((teste.erro($$ select portal_recibo_enviar(ivo, outro, p1.id, jsonb_build_object('arquivo', pg_temp.arquivo(p1.id))) from ids, p1 $$)) ->> 'codigo', 'TC404',
  'PT-01: recibo de outro escritório não é encontrado');

-- A automação "Pagamento recebido" não manda outra para o pagamento do recibo; a parcela 2 ganha.
select portal_financeiro_receber_registrar_recibo(diego, rm, parc.id,
  jsonb_build_object('valor', 85000, 'recebidoEm', '2026-11-20', 'forma', 'PIX', 'recibo', false)) from ids, parc where parc.n = 2;
select ajustar_relogio(('2026-11-20 10:15-03'::timestamptz - now()));
select automacoes_rodar();
select is((select count(*)::integer from automacao_execucoes x join automacoes a on a.id = x.automacao_id, ids
            where a.escritorio_id = ids.rm and a.gatilho = 'PAGAMENTO_RECEBIDO'), 1, 'a automação só entra com o pagamento que não teve recibo pelo WhatsApp');
select is((teste.erro($$ update recibo_envios set enviado_em = now() $$)) ->> 'codigo', 'TC023', 'o envio fica registrado e não muda');

select ajustar_relogio(interval '0');
select * from finish();
rollback;
