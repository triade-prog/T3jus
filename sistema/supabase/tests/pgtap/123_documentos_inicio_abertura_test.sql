-- Jornada do cliente, parte 4b (0854; EX-18): a lista da área na abertura do caso, com o que a
-- ficha já tem; os pedidos na mesma transação do caso; sem Jurídico, a lista inteira; o aviso
-- pela fila; "Juntar os documentos" no próximo passo; e o sino quando o último chega.
begin;
select plan(25);

select ajustar_relogio(('2026-11-18 10:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Larissa Costa') as larissa,
  teste.pessoa('Bianca Lopes') as bianca,
  teste.escritorio('Ribeiro & Matos') as rm;
select teste.vincular(socia, rm, 'SOCIO') from ids;
select portal_convidar(socia, rm, larissa, 'Larissa Costa', array['JURIDICO']),
       portal_convidar(socia, rm, bianca, 'Bianca Lopes', array['CONTRATOS', 'COMERCIAL']) from ids;

create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Antônia Ferreira Prado', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Joana Prado', 'telefone', '+5511996027736', 'principal', true)))) ->> 'id')::uuid ant,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Hélio Duarte', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Hélio Duarte', 'telefone', '+5511996027737', 'principal', true)))) ->> 'id')::uuid helio
  from ids;

create function pg_temp.anexar(p_cliente uuid, p_dados jsonb) returns jsonb language sql as $$
  select portal_cliente_documento_concluir(ids.socia, ids.rm,
    portal_cliente_documento_iniciar(ids.socia, ids.rm, p_cliente,
      jsonb_build_object('nome', 'documento.pdf', 'arquivoTipo', 'application/pdf', 'tamanho', 1000) || p_dados))
    from ids
$$;
create function pg_temp.contrato(p_cliente uuid) returns uuid language sql as $$
  select (portal_contrato_criar(ids.socia, ids.rm, jsonb_build_object('clienteId', p_cliente, 'objeto', 'Pensão por morte',
    'responsavelId', ids.socia, 'advogados', jsonb_build_array(ids.socia),
    'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'EXITO', 'percentual', 3000, 'sobre', 'Atrasados', 'etapa', 'Encerrado', 'dias', 0)))) ->> 'id')::uuid
    from ids
$$;

-- A ficha de Antônia tem o RG em dia e um comprovante de julho; previdenciário usa a sugestão.
select pg_temp.anexar(cli.ant, '{"tipo": "RG_CPF"}'), pg_temp.anexar(cli.ant, '{"tipo": "COMPROVANTE_RESIDENCIA", "dataDocumento": "2026-07-02"}') from cli;
create temp table lista as select portal_juridico_documentos_inicio_sugestao(socia, rm, 'PREVIDENCIARIO') l from ids;
create function pg_temp.item(p_nome text) returns text language sql as $$
  select i.id::text from documentos_inicio i, ids where i.escritorio_id = ids.rm and i.nome = p_nome and i.removido_em is null
$$;

-- 1. A prévia (decisão 43).
create temp table pv as select portal_cliente_documentos_previa(larissa, rm, 'PREVIDENCIARIO', cli.ant) p from ids, cli;
select is((select jsonb_array_length(p -> 'itens') from pv), 7, 'a prévia traz a lista da área');
select is((select p -> 'itens' -> 0 ->> 'situacao' from pv), 'JA_TEMOS', 'o RG em dia na ficha vem como "Já temos"');
select is((select p -> 'itens' -> 1 ->> 'situacao' from pv), 'VENCIDO', 'o comprovante de julho vem para pedir de novo');
select is((select p -> 'itens' -> 3 ->> 'situacao' from pv), 'PEDIR', 'o CNIS, do caso, vem para pedir');
select is((select p -> 'itens' -> 1 ->> 'noAviso' from pv), 'comprovante de residência (conta de luz, água ou telefone dos últimos 90 dias)',
  'no aviso, o nome vai com o "como pedir"');
select is((select p -> 'contato' ->> 'nome' from pv), 'Joana Prado', 'o aviso vai ao contato principal');
select is((select p -> 'podeConferir' from pv), 'true'::jsonb, 'quem tem Jurídico confere');
select is((select portal_cliente_documentos_previa(bianca, rm, 'PREVIDENCIARIO', cli.ant) -> 'podeConferir' from ids, cli), 'false'::jsonb,
  'decisão 45: sem Jurídico, não confere');
select is((select jsonb_array_length(portal_cliente_documentos_previa(larissa, rm, 'FAMILIA', null) -> 'itens') from ids), 0,
  'decisão 42: área sem lista não pede nada sozinha');

-- 2. Registrar assinatura: o que foi marcado, mais um, e o aviso. Sem o WhatsApp ligado, o caso fica.
create temp table ct as select pg_temp.contrato(cli.ant) ant, pg_temp.contrato(cli.helio) helio from cli;
select portal_contrato_assinatura_caso(socia, rm, ct.ant, 1, '2026-11-18', jsonb_build_object('modo', 'NOVO', 'nome', 'Ferreira Prado x INSS',
  'area', 'PREVIDENCIARIO', 'responsavelId', ids.larissa, 'papel', 'AUTOR',
  'documentos', jsonb_build_object('pedir', jsonb_build_array(pg_temp.item('Comprovante de residência'), pg_temp.item('Extrato do CNIS')),
                                   'mais', jsonb_build_array('Certidão de nascimento de Joana', ''), 'avisar', true))) from ids, ct;
create temp table cs as select c.id from casos c, ids where c.escritorio_id = ids.rm and c.nome = 'Ferreira Prado x INSS';
select is((select count(*) from documento_pedidos p, cs where p.caso_id = cs.id and p.inicio), 4::bigint,
  'o RG que já temos, os 2 marcados e mais um: 4 pedidos');
select is((select count(*) from documento_pedidos p, cs where p.caso_id = cs.id and p.chegou_em is not null and p.da_ficha_id is not null), 1::bigint,
  'o RG entra como chegado, da ficha');
select is((select h.dados ->> 'avisoMotivo' from historico h, cs where h.acao = 'juridico.documentos_inicio' and h.entidade_id = cs.id::text),
  'WHATSAPP_NAO_LIGADO', 'sem o WhatsApp ligado, o aviso não sai, e o caso e os pedidos ficam');

-- 3. O próximo passo e a ficha do caso (decisões 46 e 47).
create temp table pa as select cliente_passo(larissa, rm, cli.ant) p from ids, cli;
select is((select p ->> 'tipo' from pa), 'DOCUMENTOS', 'decisão 46: o passo vira "Juntar os documentos"');
select is((select (p -> 'item' ->> 'chegaram') || ' de ' || (p -> 'item' ->> 'total') from pa), '1 de 4', 'com a contagem');
select is((select jsonb_array_length(p -> 'item' -> 'faltam') from pa), 3, 'e o que falta');
create temp table fc as select portal_juridico_caso(larissa, rm, cs.id) f from ids, cs;
select is((select f -> 'inicio' ->> 'total' from fc), '4', 'a ficha do caso sabe dos 4');
select is((select f -> 'inicio' -> 'temos' -> 0 -> 'daFicha' from fc), 'true'::jsonb, 'com o selo "Da ficha"');
select is((select count(*) from fc, jsonb_array_elements(f -> 'faltam') x where x ->> 'tipoPessoal' = 'COMPROVANTE_RESIDENCIA'), 1::bigint,
  'o comprovante que falta é pessoal');

-- 4. Quando o último chega: o sino da responsável e o passo volta a "Caso" (decisão 48).
select portal_juridico_documento_chegou(socia, rm, p.id) from ids, cs, documento_pedidos p where p.caso_id = cs.id and p.chegou_em is null
  and p.descricao <> 'Extrato do CNIS';
select is((select count(*) from avisos_sino a, ids where a.pessoa_id = ids.larissa and a.tipo = 'DOCUMENTOS_INICIO_CHEGARAM'), 0::bigint,
  'faltando um, ainda não avisa');
select portal_juridico_documento_chegou(socia, rm, p.id) from ids, cs, documento_pedidos p where p.caso_id = cs.id and p.chegou_em is null;
select is((select a.dados ->> 'total' from avisos_sino a, ids where a.pessoa_id = ids.larissa and a.tipo = 'DOCUMENTOS_INICIO_CHEGARAM'), '4',
  'o último chegou: a responsável recebe o aviso no sino');
select is((select cliente_passo(larissa, rm, cli.ant) ->> 'tipo' from ids, cli), 'CASO', 'e o passo volta a "Caso em andamento"');

-- 5. Sem Jurídico, a lista entra inteira, sem conferir; com o WhatsApp ligado, o aviso vai pela fila.
insert into whatsapp_escritorio (escritorio_id, numero, situacao, ligado_em) select rm, '+551130001000', 'LIGADO', now() from ids;
update contratos set area = 'PREVIDENCIARIO' from ct where id = ct.helio;
select portal_contrato_assinatura_caso(bianca, rm, ct.helio, 2, '2026-11-18', jsonb_build_object('modo', 'NOVO',
  'documentos', jsonb_build_object('pedir', '[]'::jsonb, 'avisar', true))) from ids, ct;
create temp table ch as select cc.caso_id id from caso_clientes cc, cli where cc.cliente_id = cli.helio;
select is((select count(*) from documento_pedidos p, ch where p.caso_id = ch.id and p.chegou_em is null), 7::bigint,
  'decisão 45: sem Jurídico, os 7 da lista são pedidos');
select is((select m.aviso_tipo || ' · ' || m.envio from conversa_mensagens m, ch
            where m.dados ->> 'pedido' in (select p.id::text from documento_pedidos p where p.caso_id = ch.id)), 'Pedido de documento · NA_FILA',
  'decisão 44: o aviso com a lista vai para a fila do WhatsApp');
select ok((select m.texto like '%RG e CPF, ou CNH (documento com foto e o CPF), comprovante de residência%'
             from conversa_mensagens m, ch where m.dados ->> 'pedido' in (select p.id::text from documento_pedidos p where p.caso_id = ch.id)),
  'com o nome e o "como pedir" de cada um');

-- 6. Novo caso: sem dizer o que pedir, a lista inteira; um "mais" curto é recusado.
select is((teste.erro($$ select portal_juridico_caso_criar(larissa, rm, jsonb_build_object('nome', 'Duarte x INSS', 'area', 'PREVIDENCIARIO',
  'etapaId', (select id from etapas e where e.escritorio_id = ids.rm order by ordem limit 1), 'responsavelId', larissa,
  'clientes', jsonb_build_array(jsonb_build_object('clienteId', cli.helio, 'papel', 'AUTOR')),
  'documentos', jsonb_build_object('mais', jsonb_build_array('ab')))) from ids, cli $$)) -> 'detalhe' -> 'campos', '["documentos.mais"]'::jsonb,
  'o documento a mais com menos de 3 letras é recusado');

select * from finish();
rollback;
