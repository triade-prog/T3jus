-- Pedidos de contrato do Comercial em Contratos (IN-01, F3.11): ao pedir, o sino de quem tem
-- Contratos avisa; o bloco lista os pedidos abertos do mais antigo para o mais novo; o pedido sai
-- quando o contrato nasce da proposta, e quem pediu recebe o aviso; isolamento e área.
begin;
select plan(10);

select ajustar_relogio(('2026-11-18 11:40-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Felipe Matos') as felipe,
  teste.pessoa('Paula Nunes') as paula,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, diego, 'Diego Almeida', array['COMERCIAL']),
       portal_convidar(socia, rm, felipe, 'Felipe Matos', array['CONTRATOS']),
       portal_convidar(socia, rm, paula, 'Paula Nunes', array['FINANCEIRO']) from ids;

create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Benedito Souza Lima', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Benedito', 'telefone', '+5511996027736', 'principal', true)))) ->> 'id')::uuid ben,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Daniela Rocha Mendes', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Daniela', 'telefone', '+5511996027737', 'principal', true)))) ->> 'id')::uuid dan
  from ids;

create temp table pr as select
  (portal_proposta_criar(diego, rm, jsonb_build_object('clienteId', cli.ben, 'servico', 'Aposentadoria por idade', 'escopo', 'Pedido no INSS.',
     'responsavelId', ids.diego, 'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'PARCELADO', 'total', 200000, 'parcelas', 3, 'primeiro', '2026-12-10')),
     'retorno', jsonb_build_object('em', '2026-11-20', 'responsavelId', ids.diego))) ->> 'id')::uuid ben,
  (portal_proposta_criar(diego, rm, jsonb_build_object('clienteId', cli.dan, 'servico', 'Revisão de contrato bancário', 'escopo', 'Ação revisional.',
     'responsavelId', ids.diego, 'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'FIXO', 'valor', 150000, 'vencimento', '2026-12-10')),
     'retorno', jsonb_build_object('em', '2026-11-20', 'responsavelId', ids.diego))) ->> 'id')::uuid dan
  from ids, cli;
select portal_proposta_enviada(diego, rm, pr.ben, 1), portal_proposta_enviada(diego, rm, pr.dan, 1) from ids, pr;
select portal_proposta_resposta(diego, rm, pr.ben, 2, jsonb_build_object('resposta', 'ACEITOU', 'em', '2026-11-17', 'canal', 'PRESENCIAL')),
       portal_proposta_resposta(diego, rm, pr.dan, 2, jsonb_build_object('resposta', 'ACEITOU', 'em', '2026-11-18', 'canal', 'WHATSAPP')) from ids, pr;

select is((select jsonb_array_length(portal_contratos_pedidos(socia, rm)) from ids), 0, 'sem pedido, a lista vem vazia');

select portal_proposta_pedir_contrato(diego, rm, pr.ben) from ids, pr;
select ajustar_relogio(('2026-11-18 14:05-03'::timestamptz - now()));
select portal_proposta_pedir_contrato(diego, rm, pr.dan) from ids, pr;

select is((select array_agg(pessoa_id order by pessoa_id) from avisos_sino, pr where tipo = 'PEDIDO_CONTRATO' and origem_id = pr.ben),
  (select array_agg(x order by x) from ids, unnest(array[socia, felipe]) x),
  'IN-01: o aviso vai para cada pessoa com a área Contratos, e não para quem pediu nem para quem não tem a área');
select is((select dados ->> 'quem' || ' · ' || (dados ->> 'cliente') || ' · ' || (dados ->> 'proposta') from avisos_sino, ids, pr
            where tipo = 'PEDIDO_CONTRATO' and origem_id = pr.ben and pessoa_id = felipe),
  'Diego Almeida · Benedito Souza Lima · P-2026-001', 'o aviso traz quem pediu, o cliente e a proposta');
select portal_proposta_pedir_contrato(diego, rm, pr.ben) from ids, pr;
select is((select count(*) from avisos_sino, pr where tipo = 'PEDIDO_CONTRATO' and origem_id = pr.ben), 2::bigint, 'pedir de novo não repete o aviso');

select is((select jsonb_agg(x -> 'cliente' ->> 'nome') from ids, jsonb_array_elements(portal_contratos_pedidos(felipe, rm)) x),
  '["Benedito Souza Lima", "Daniela Rocha Mendes"]'::jsonb, 'os pedidos vêm do mais antigo para o mais novo');
select is((select portal_contratos_pedidos(felipe, rm) -> 0 -> 'pedidoPor' ->> 'nome' from ids), 'Diego Almeida', 'com quem pediu');
select is((teste.erro($$ select portal_contratos_pedidos(diego, rm) from ids $$)) -> 'detalhe' ->> 'motivo', 'AREA_NAO_LIBERADA',
  'quem não tem Contratos não vê o bloco');
select is((select jsonb_array_length(portal_contratos_pedidos(intrusa, outro)) from ids), 0, 'outro escritório não vê os pedidos');

-- Felipe gera o contrato de Benedito a partir da proposta.
select portal_contrato_criar(felipe, rm, jsonb_build_object('clienteId', cli.ben, 'objeto', 'Aposentadoria por idade', 'responsavelId', ids.felipe,
  'advogados', jsonb_build_array(ids.socia), 'propostaId', pr.ben,
  'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'PARCELADO', 'total', 200000, 'parcelas', 3, 'primeiro', '2026-12-10')))) from ids, cli, pr;
select is((select jsonb_agg(x -> 'cliente' ->> 'nome') from ids, jsonb_array_elements(portal_contratos_pedidos(felipe, rm)) x),
  '["Daniela Rocha Mendes"]'::jsonb, 'o pedido sai quando o contrato nasce da proposta');
select is((select dados ->> 'quem' || ' · ' || (dados ->> 'cliente') from avisos_sino, ids where tipo = 'CONTRATO_GERADO' and pessoa_id = diego),
  'Felipe Matos · Benedito Souza Lima', 'quem pediu recebe o aviso do contrato gerado');

select ajustar_relogio(interval '0');
select * from finish();
rollback;
