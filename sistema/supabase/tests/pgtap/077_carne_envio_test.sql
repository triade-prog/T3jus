-- Mandar o carnê pelo WhatsApp (parte do F3.79, FI-23): sem o WhatsApp ligado, sem celular e fora
-- da janela de 24 horas, o envio é recusado; dentro da janela, a mensagem com o PDF entra na fila
-- da conversa (também para o número do cliente, se marcar) e a ficha mostra para quem foi.
begin;
select plan(12);

select ajustar_relogio(('2026-11-18 09:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, diego, 'Diego Almeida', array['FINANCEIRO']) from ids;

create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Hélio Batista Corrêa', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(
       jsonb_build_object('nome', 'Marta Corrêa', 'papel', 'esposa', 'telefone', '+5511981143059', 'principal', true),
       jsonb_build_object('nome', 'Hélio Batista Corrêa', 'telefone', '+5511996027735', 'principal', false)))) ->> 'id')::uuid hel
  from ids;
create temp table ct as select
  (portal_contrato_criar(socia, rm, jsonb_build_object('clienteId', cli.hel, 'objeto', 'Ação revisional',
     'responsavelId', ids.diego, 'advogados', jsonb_build_array(ids.socia),
     'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'PARCELADO', 'total', 510000, 'parcelas', 6, 'primeiro', '2026-11-25')))) ->> 'id')::uuid hel
  from ids, cli;
select portal_contrato_assinatura(socia, rm, ct.hel, 1, '2026-11-18') from ids, ct;
create temp table g as select (portal_carne_gerar(diego, rm, ct.hel, jsonb_build_object('area', 'FINANCEIRO',
  'parcelas', (select jsonb_agg(id) from recebimentos_previstos where contrato_id = ct.hel))) ->> 'id')::uuid id from ids, ct;
create temp table d as select jsonb_build_object('area', 'FINANCEIRO', 'texto', 'Olá, Marta! Aqui está o carnê.',
  'arquivo', jsonb_build_object('caminho', ids.rm || '/carnes/' || g.id || '.pdf', 'nome', 'carne-helio-correa-C-2026-001.pdf', 'bytes', '214000')) j from ids, g;

select is((select portal_carne_envio(diego, rm, g.id, 'FINANCEIRO') ->> 'bloqueio' from ids, g), 'WHATSAPP_NAO_LIGADO', 'sem o WhatsApp ligado, nada sai');
select is((select portal_carne_envio(diego, rm, g.id, 'FINANCEIRO') -> 'para' ->> 'nome' from ids, g), 'Marta Corrêa', 'vai para o contato principal');
select is((select portal_carne_envio(diego, rm, g.id, 'FINANCEIRO') -> 'titular' ->> 'telefone' from ids, g), '+5511996027735', 'e oferece o número do próprio cliente');
select is((teste.erro($$ select portal_carne_enviar(diego, rm, g.id, d.j) from ids, g, d $$)) -> 'detalhe' ->> 'motivo', 'WHATSAPP_NAO_LIGADO', 'mandar sem o WhatsApp é recusado');

insert into whatsapp_escritorio (escritorio_id, numero, situacao, ligado_em) select rm, '+551130001000', 'LIGADO', now() from ids;
select is((select portal_carne_envio(diego, rm, g.id, 'FINANCEIRO') ->> 'bloqueio' from ids, g), 'JANELA_FECHADA_SEM_MODELO',
  'fora da janela de 24 horas, falta o aviso aprovado pela Meta');

select whatsapp_mensagem_recebida(rm, '+5511981143059', 'Marta', 'Boa tarde, pode mandar o carnê?') from ids;
select is((select portal_carne_envio(diego, rm, g.id, 'FINANCEIRO') ->> 'bloqueio' from ids, g), null, 'Marta escreveu: a conversa está aberta');
select is((teste.erro($$ select portal_carne_enviar(diego, rm, g.id, d.j || '{"arquivo": {"caminho": "x/y.pdf", "nome": "a.pdf", "bytes": "1"}}') from ids, g, d $$)) -> 'detalhe' -> 'campos',
  '["arquivo"]'::jsonb, 'o PDF precisa ser o do carnê, no lugar certo');
select is((teste.erro($$ select portal_carne_enviar(intrusa, outro, g.id, d.j) from ids, g, d $$)) ->> 'codigo', 'TC404', 'PT-01: carnê de outro escritório');

create temp table env as select portal_carne_enviar(diego, rm, g.id, d.j || '{"tambemCliente": true}') r from ids, g, d;
select is((select jsonb_array_length(r -> 'envios') from env), 2, 'vai para Marta e para Hélio');
select is((select string_agg(m.envio || ' ' || m.aviso_tipo || ' ' || (m.anexo ->> 'nome'), ', ') from conversa_mensagens m, g where m.dados ->> 'carne' = g.id::text),
  'NA_FILA Carnê de pagamento carne-helio-correa-C-2026-001.pdf, NA_FILA Carnê de pagamento carne-helio-correa-C-2026-001.pdf',
  'as mensagens com o PDF entram na fila da conversa, esperando a entrega pela Meta');
select is((select jsonb_array_length(portal_carne_opcoes(diego, rm, ct.hel, 'FINANCEIRO') -> 'carnes' -> 0 -> 'envios') from ids, ct), 2,
  'decisão 11: a folha "Carnê" mostra para quem foi');
select is((select count(*)::int from historico, g where acao = 'financeiro.carne_enviado' and entidade_id = g.id::text), 1, 'PT-03: o envio vai para o histórico');

select * from finish();
rollback;
