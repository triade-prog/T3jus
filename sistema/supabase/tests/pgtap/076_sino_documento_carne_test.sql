-- Avisos novos no sino: o arquivo que o cliente mandou com documento pedido em aberto (F3.86,
-- PA-06), o carnê desatualizado para quem gerou e o responsável do contrato e o pedido da chave
-- Pix à sócia dona (F3.80, FI-23).
begin;
select plan(21);

select ajustar_relogio(('2026-11-18 09:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Felipe Matos') as felipe,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Paula Nunes') as paula,
  teste.pessoa('Jurídico Só') as juri,
  teste.escritorio('Ribeiro & Matos') as rm;
select teste.vincular(socia, rm, 'SOCIO') from ids;
select portal_convidar(socia, rm, felipe, 'Felipe Matos', array['JURIDICO']),
       portal_convidar(socia, rm, diego, 'Diego Almeida', array['FINANCEIRO']),
       portal_convidar(socia, rm, paula, 'Paula Nunes', array['CONTRATOS']),
       portal_convidar(socia, rm, juri, 'Jurídico Só', array['JURIDICO']) from ids;

create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Carlos Dias', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Carlos Dias', 'telefone', '+5511977001122', 'principal', true)))) ->> 'id')::uuid carlos,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Hélio Batista Corrêa', 'origem', 'GOOGLE', 'documento', '52998224725',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Hélio Batista Corrêa', 'telefone', '+5511996027736', 'principal', true)))) ->> 'id')::uuid hel
  from ids;

-- ------------------------------------------------------------------ F3.86
select portal_juridico_etapas(socia, rm) from ids;
create temp table cs as select
  (portal_juridico_caso_criar(socia, rm, jsonb_build_object('nome', 'Dias x Mercado Bom Preço', 'area', 'TRABALHISTA',
     'etapaId', (select id from etapas where escritorio_id = ids.rm and ordem = 3), 'responsavelId', ids.socia,
     'clientes', jsonb_build_array(jsonb_build_object('clienteId', cli.carlos, 'papel', 'AUTOR')))) ->> 'id')::uuid dias
  from ids, cli;
create temp table pd as select
  (portal_juridico_documento_pedir(felipe, rm, cs.dias, jsonb_build_object('descricao', 'CTPS digital', 'clienteId', cli.carlos)) ->> 'id')::uuid ctps,
  (portal_juridico_documento_pedir(felipe, rm, cs.dias, jsonb_build_object('descricao', 'Holerites de 2025', 'clienteId', cli.carlos)) ->> 'id')::uuid holerites
  from ids, cs, cli;

insert into whatsapp_escritorio (escritorio_id, numero, situacao, ligado_em) select rm, '+551130001000', 'LIGADO', now() from ids;
create temp table cv as select whatsapp_mensagem_recebida(rm, '+5511977001122', 'Carlos', 'Bom dia, vou mandar agora.') c from ids;
select is((select count(*)::int from avisos_sino, ids where pessoa_id = felipe and tipo = 'DOCUMENTO_CHEGOU'), 0,
  'F3.86: mensagem só de texto não avisa');

select whatsapp_mensagem_recebida(rm, '+5511977001122', 'Carlos', null, '{"nome": "ctps.jpg", "tipo": "IMAGEM", "bytes": "900000"}') from ids;
create temp table av as select a.* from avisos_sino a, ids where a.pessoa_id = felipe and a.tipo = 'DOCUMENTO_CHEGOU';
select is((select count(*)::int from av), 1, 'F3.86: o arquivo do cliente avisa quem pediu o documento');
select is((select dados ->> 'texto' from av), 'CTPS digital, Holerites de 2025', 'F3.86: o aviso diz o que foi pedido');
select is((select dados ->> 'arquivo' || ' · ' || (dados ->> 'caso') || ' · ' || (dados ->> 'quantos') from av), 'ctps.jpg · Dias x Mercado Bom Preço · 2',
  'F3.86: o nome do arquivo, o caso e quantos faltam');
select is((select origem_id from av), (select c from cv), 'F3.86: o aviso leva à conversa');
select is((select count(*)::int from documento_pedidos, pd where id in (pd.ctps, pd.holerites) and chegou_em is null), 2,
  'F3.86: o pedido não se fecha sozinho');

select whatsapp_mensagem_recebida(rm, '+5511977001122', 'Carlos', null, '{"nome": "holerite.pdf", "tipo": "DOCUMENTO", "bytes": "300000"}') from ids;
select is((select count(*)::int from avisos_sino, ids where pessoa_id = felipe and tipo = 'DOCUMENTO_CHEGOU'), 1,
  'F3.86: enquanto o aviso não for lido, outro arquivo não repete o aviso');
update avisos_sino set lido_em = now() where tipo = 'DOCUMENTO_CHEGOU';
select portal_juridico_documento_chegou(felipe, rm, pd.ctps) from ids, pd;
select whatsapp_mensagem_recebida(rm, '+5511977001122', 'Carlos', null, '{"nome": "holerite-2.pdf", "tipo": "DOCUMENTO", "bytes": "300000"}') from ids;
select is((select string_agg(dados ->> 'texto', '|' order by dados ->> 'arquivo') from avisos_sino, ids where pessoa_id = felipe and tipo = 'DOCUMENTO_CHEGOU'),
  'CTPS digital, Holerites de 2025|Holerites de 2025', 'F3.86: depois de lido, o próximo arquivo avisa de novo, só com o que falta');

select whatsapp_mensagem_recebida(rm, '+5511900001111', 'Sem ficha', null, '{"nome": "foto.jpg", "tipo": "IMAGEM", "bytes": "1000"}') from ids;
select is((select count(*)::int from avisos_sino where tipo = 'DOCUMENTO_CHEGOU'), 2, 'F3.86: conversa sem cliente não avisa');

-- ------------------------------------------------------------------ F3.80: pedir a chave Pix
create temp table ct as select
  (portal_contrato_criar(socia, rm, jsonb_build_object('clienteId', cli.hel, 'objeto', 'Ação revisional',
     'responsavelId', ids.paula, 'advogados', jsonb_build_array(ids.socia),
     'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'PARCELADO', 'total', 510000, 'parcelas', 6, 'primeiro', '2026-11-25')))) ->> 'id')::uuid hel
  from ids, cli;
select portal_contrato_assinatura(socia, rm, ct.hel, 1, '2026-11-18') from ids, ct;

select is((select portal_recebimento_pedir(paula, rm, jsonb_build_object('area', 'CONTRATOS', 'contratoId', ct.hel)) from ids, ct),
  jsonb_build_object('para', jsonb_build_object('id', (select socia from ids), 'nome', 'Marina Ribeiro'), 'jaPedido', false),
  'F3.80: Paula pede a chave à sócia dona');
create temp table pc as select a.* from avisos_sino a, ids where a.pessoa_id = socia and a.tipo = 'PEDIDO_CHAVE_PIX';
select is((select dados ->> 'quem' || ' · ' || (dados ->> 'cliente') from pc), 'Paula Nunes · Hélio Batista Corrêa', 'F3.80: o aviso no sino da dona diz quem pediu e para qual cliente');
select is((select (portal_recebimento_pedir(paula, rm, '{"area": "CONTRATOS"}') ->> 'jaPedido')::boolean from ids), true,
  'F3.80: pedir de novo antes de ela ler não manda outro aviso');
select is((select count(*)::int from avisos_sino where tipo = 'PEDIDO_CHAVE_PIX'), 1, 'F3.80: continua um aviso só');
select is((select (portal_carne_opcoes(paula, rm, ct.hel, 'CONTRATOS') ->> 'chavePedida')::boolean from ids, ct), true, 'F3.80: a janela sabe que o pedido já saiu');
update avisos_sino set lido_em = now() where tipo = 'PEDIDO_CHAVE_PIX';
select is((select (portal_carne_opcoes(paula, rm, ct.hel, 'CONTRATOS') ->> 'chavePedida')::boolean from ids, ct), false, 'F3.80: depois que a dona leu, pode pedir de novo');
select is((teste.erro($$ select portal_recebimento_pedir(socia, rm, '{"area": "FINANCEIRO"}') from ids $$)) -> 'detalhe' ->> 'motivo', 'E_DONO',
  'F3.80: a sócia dona não pede a si mesma');
select is((teste.erro($$ select portal_recebimento_pedir(juri, rm, '{"area": "FINANCEIRO"}') from ids $$)) -> 'detalhe' ->> 'motivo', 'AREA_NAO_LIBERADA',
  'PA-01: sem a área, não pede');
select portal_recebimento_salvar(socia, rm, '{"versao": 0, "pixTipo": "CNPJ", "pixChave": "11222333000181", "recebedor": "RIBEIRO E MATOS SOC ADV", "cidade": "SAO PAULO"}') from ids;
select is((teste.erro($$ select portal_recebimento_pedir(diego, rm, '{"area": "FINANCEIRO"}') from ids $$)) -> 'detalhe' ->> 'motivo', 'JA_TEM_CHAVE',
  'F3.80: com a chave cadastrada, não há o que pedir');

-- ------------------------------------------------------------------ F3.80: carnê desatualizado
select portal_carne_gerar(diego, rm, ct.hel, jsonb_build_object('area', 'FINANCEIRO',
  'parcelas', (select jsonb_agg(id) from recebimentos_previstos where contrato_id = ct.hel))) from ids, ct;
select portal_recebimento_salvar(socia, rm, '{"versao": 1, "pixTipo": "EMAIL", "pixChave": "financeiro@ribeiromatos.adv.br", "recebedor": "RIBEIRO E MATOS SOC ADV", "cidade": "SAO PAULO"}') from ids;
select is((select string_agg(p.nome || ':' || (a.dados ->> 'motivo') || ':' || (a.dados ->> 'gerou'), ', ' order by p.nome)
             from avisos_sino a join pessoas p on p.id = a.pessoa_id where a.tipo = 'CARNE_DESATUALIZADO'),
  'Diego Almeida:CHAVE_PIX:true, Paula Nunes:CHAVE_PIX:false', 'F3.80: trocar a chave avisa quem gerou o carnê e o responsável do contrato');
select contrato_cancelar_futuros(rm, ct.hel, '2027-03-01', 'Renegociado com o cliente') from ids, ct;
select is((select count(*)::int from avisos_sino where tipo = 'CARNE_DESATUALIZADO'), 2, 'F3.80: o mesmo carnê não avisa duas vezes');

-- Um carnê novo, uma hora depois; Diego mesmo muda a parcela: só Paula recebe.
select ajustar_relogio(('2026-11-18 10:00-03'::timestamptz - now()));
select portal_carne_gerar(diego, rm, ct.hel, jsonb_build_object('area', 'FINANCEIRO',
  'parcelas', (select jsonb_agg(id) from recebimentos_previstos where contrato_id = ct.hel and cancelado_em is null))) from ids, ct;
select set_config('app.pessoa_id', diego::text, true) from ids;
select contrato_cancelar_futuros(rm, ct.hel, '2027-02-01', 'Acordo de quitação') from ids, ct;
select is((select string_agg(p.nome || ':' || (a.dados ->> 'motivo') || ':' || (a.dados ->> 'quem'), ', ')
             from avisos_sino a join pessoas p on p.id = a.pessoa_id where a.tipo = 'CARNE_DESATUALIZADO' and a.dados ->> 'motivo' = 'CANCELADA'),
  'Paula Nunes:CANCELADA:Diego Almeida', 'F3.80: quem mudou a parcela não recebe o aviso; o responsável recebe, com o nome de quem mudou');

select * from finish();
rollback;
