-- Enviar, responder e editar a proposta de cliente excluído ou arquivado a pedido do titular (1145;
-- F3.204, PT-11, AP-05): a recusa clara (CLIENTE_EXCLUIDO ou CLIENTE_ARQUIVADO) vem antes de qualquer
-- outra conferência (o escopo apagado, o estado, os campos e a versão); nada muda (propostas,
-- atendimentos, retornos e histórico); o rascunho do arquivado não se marca mais como enviado; o cliente
-- ativo segue como antes; a proposta de outro escritório continua "não encontrada".
begin;
select plan(20);

select ajustar_relogio(('2026-11-26 10:00-03'::timestamptz - now()));
update inventario_dados set situacao = 'PROPOSTA' where tabela = 'pessoas';

create temp table ids as select
  teste.pessoa('Paula Reis') as socia,
  teste.pessoa('Diego Martins') as diego,
  teste.pessoa('Intrusa Souza') as intrusa,
  teste.escritorio('Reis & Coelho') as rc,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rc, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rc, diego, 'Diego Martins', array['COMERCIAL']) from ids;

create function pg_temp.cliente(p_nome text, p_tel text) returns uuid language sql as $$
  select (portal_cliente_cadastrar(socia, rc, jsonb_build_object('tipo', 'PF', 'origem', 'GOOGLE', 'nome', p_nome,
    'contatos', jsonb_build_array(jsonb_build_object('nome', p_nome, 'telefone', p_tel, 'principal', true)))) ->> 'id')::uuid from ids
$$;
create temp table cli as select
  pg_temp.cliente('Marina Alves Coelho', '+5511970123348') mar,
  pg_temp.cliente('Rui Arquivado Matos', '+5511955551234') rui,
  pg_temp.cliente('Ana Ativa Lima', '+5511962310457') ana;

create function pg_temp.dados(p_cliente uuid, p_servico text) returns jsonb language sql as $$
  select jsonb_build_object('clienteId', p_cliente, 'servico', p_servico, 'escopo', 'Ação e acompanhamento.',
    'responsavelId', diego, 'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'FIXO', 'valor', 200000, 'vencimento', '2026-12-10')),
    'retorno', jsonb_build_object('em', '2026-11-30', 'responsavelId', diego)) from ids
$$;
create function pg_temp.proposta(p_cliente uuid, p_servico text, p_ate text) returns uuid language plpgsql as $$
declare v uuid; i ids;
begin
  select * into i from ids;
  v := (portal_proposta_criar(i.diego, i.rc, pg_temp.dados(p_cliente, p_servico)) ->> 'id')::uuid;
  if p_ate = 'RASCUNHO' then return v; end if;
  perform portal_proposta_enviada(i.diego, i.rc, v, 1);
  if p_ate = 'ENVIADA' then return v; end if;
  perform portal_proposta_resposta(i.diego, i.rc, v, 2, '{"resposta": "MUDANCA", "em": "2026-11-12", "canal": "PRESENCIAL"}');
  return v;
end $$;
create temp table pr as select
  pg_temp.proposta(cli.mar, 'Rascunho de Marina', 'RASCUNHO') mar_ras,
  pg_temp.proposta(cli.mar, 'Revisão de Marina', 'ENVIADA') mar_env,
  pg_temp.proposta(cli.rui, 'Rascunho de Rui', 'RASCUNHO') rui_ras,
  pg_temp.proposta(cli.rui, 'Despejo de Rui', 'ENVIADA') rui_env,
  pg_temp.proposta(cli.rui, 'Cobrança de Rui', 'NEGOCIACAO') rui_neg,
  pg_temp.proposta(cli.ana, 'Rascunho de Ana', 'RASCUNHO') ana_ras,
  pg_temp.proposta(cli.ana, 'Divórcio de Ana', 'ENVIADA') ana_env
  from cli;
select portal_contrato_criar(socia, rc, jsonb_build_object('clienteId', cli.rui, 'objeto', 'Consultoria de Rui',
  'responsavelId', socia, 'advogados', jsonb_build_array(socia),
  'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'FIXO', 'valor', 350000, 'vencimento', '2026-12-10')))) from ids, cli;

select portal_cliente_excluir_dados(ids.socia, ids.rc, cli.mar, c.versao,
  jsonb_build_object('pedidoEm', hoje_brasilia(), 'canal', 'WHATSAPP', 'quemPediu', 'TITULAR', 'conferido', true, 'nomeConfirmado', c.nome))
  from ids, cli, clientes_escritorio c where c.id = cli.mar;
select portal_cliente_arquivar_lgpd(socia, rc, cli.rui, c.versao, jsonb_build_object('pedidoEm', hoje_brasilia(), 'canal', 'EMAIL',
  'quemPediu', 'TITULAR', 'conferido', true)) from ids, cli, clientes_escritorio c where c.id = cli.rui;

create temp table antes as select
  (select jsonb_object_agg(p.id, to_jsonb(p)) from propostas p, cli where p.cliente_id in (cli.mar, cli.rui)) propostas,
  (select count(*) from atendimentos a, ids where a.escritorio_id = ids.rc) atendimentos,
  (select count(*) from retornos_cliente r, ids where r.escritorio_id = ids.rc) retornos,
  (select count(*) from historico h, ids where h.escritorio_id = ids.rc) historico;
create function pg_temp.motivo(p_sql text) returns text language sql as $$ select teste.erro(p_sql) -> 'detalhe' ->> 'motivo' $$;
create function pg_temp.versao(p uuid) returns integer language sql as $$ select versao from propostas where id = p $$;

-- 1. Marcar como enviada.
select is(pg_temp.motivo($$ select portal_proposta_enviada(diego, rc, pr.mar_ras, pg_temp.versao(pr.mar_ras)) from ids, pr $$), 'CLIENTE_EXCLUIDO',
  'PT-11 F3.204: o rascunho do excluído é recusado como excluído (e não mais "Complete a proposta", pelo escopo apagado)');
select is(pg_temp.motivo($$ select portal_proposta_enviada(diego, rc, pr.rui_ras, pg_temp.versao(pr.rui_ras)) from ids, pr $$), 'CLIENTE_ARQUIVADO',
  'PT-11 F3.204: o rascunho do arquivado a pedido não se marca mais como enviado');
select is(pg_temp.motivo($$ select portal_proposta_enviada(diego, rc, pr.rui_env, 99) from ids, pr $$), 'CLIENTE_ARQUIVADO',
  'F3.204: a recusa vem antes do "já enviada" e da versão');

-- 2. Registrar a resposta.
select is(pg_temp.motivo($$ select portal_proposta_resposta(diego, rc, pr.mar_env, pg_temp.versao(pr.mar_env),
    '{"resposta": "ACEITOU", "em": "2026-11-26", "canal": "WHATSAPP"}') from ids, pr $$), 'CLIENTE_EXCLUIDO',
  'PT-11 F3.204: a resposta da proposta do excluído é recusada com o código, antes do UPDATE');
select is(pg_temp.motivo($$ select portal_proposta_resposta(diego, rc, pr.rui_env, pg_temp.versao(pr.rui_env),
    '{"resposta": "RECUSOU", "em": "2026-11-26", "canal": "WHATSAPP", "motivo": "VALOR_ALTO"}') from ids, pr $$), 'CLIENTE_ARQUIVADO',
  'PT-11 F3.204: a recusa da proposta do arquivado também não entra');
select is(pg_temp.motivo($$ select portal_proposta_resposta(diego, rc, pr.rui_neg, pg_temp.versao(pr.rui_neg),
    '{"resposta": "ACEITOU", "em": "2026-11-26", "canal": "WHATSAPP"}') from ids, pr $$), 'CLIENTE_ARQUIVADO',
  'F3.204: a em negociação do arquivado também');
select is(pg_temp.motivo($$ select portal_proposta_resposta(diego, rc, pr.rui_ras, 1, '{}') from ids, pr $$), 'CLIENTE_ARQUIVADO',
  'F3.204: antes do "marque como enviada" e dos campos');

-- 3. Editar.
select is(pg_temp.motivo($$ select portal_proposta_editar(diego, rc, pr.mar_env, pg_temp.versao(pr.mar_env), pg_temp.dados(cli.mar, 'Outro serviço')) from ids, pr, cli $$),
  'CLIENTE_EXCLUIDO', 'PT-11 F3.204: editar a do excluído é recusado como excluído (e não mais "Confira a proposta" no campo do cliente)');
select is(pg_temp.motivo($$ select portal_proposta_editar(diego, rc, pr.rui_ras, pg_temp.versao(pr.rui_ras), pg_temp.dados(cli.rui, 'Outro serviço')) from ids, pr, cli $$),
  'CLIENTE_ARQUIVADO', 'PT-11 F3.204: editar a do arquivado também');
select is(pg_temp.motivo($$ select portal_proposta_editar(diego, rc, pr.rui_env, 99, '{}') from ids, pr $$), 'CLIENTE_ARQUIVADO',
  'F3.204: antes da versão e dos campos');

-- 4. Nada muda.
select is((select jsonb_object_agg(p.id, to_jsonb(p)) from propostas p, cli where p.cliente_id in (cli.mar, cli.rui)), (select propostas from antes),
  'PT-11 F3.204: as propostas do excluído e do arquivado ficam como estavam');
select is((select count(*) from atendimentos a, ids where a.escritorio_id = ids.rc), (select atendimentos from antes),
  'F3.204: nenhum atendimento novo');
select is((select count(*) from retornos_cliente r, ids where r.escritorio_id = ids.rc), (select retornos from antes),
  'F3.204: nenhum retorno novo');
select is((select count(*) from historico h, ids where h.escritorio_id = ids.rc), (select historico from antes),
  'PT-03 F3.204: nenhum histórico novo');

-- 5. Outro escritório e a proposta que não existe.
select is((teste.erro($$ select portal_proposta_enviada(intrusa, outro, pr.rui_ras, 1) from ids, pr $$)) ->> 'codigo', 'TC404',
  'PT-01: a proposta de outro escritório continua "não encontrada", sem dizer nada do cliente');
select is((teste.erro($$ select portal_proposta_resposta(diego, rc, gen_random_uuid(), 1, '{}') from ids $$)) ->> 'codigo', 'TC404',
  'F3.204: a proposta que não existe continua 404');

-- 6. O cliente ativo segue como antes.
select is((select portal_proposta_enviada(diego, rc, pr.ana_ras, pg_temp.versao(pr.ana_ras)) from ids, pr), 2, 'F3.204: o rascunho do ativo se marca como enviado');
select is((select portal_proposta_resposta(diego, rc, pr.ana_env, pg_temp.versao(pr.ana_env), '{"resposta": "ACEITOU", "em": "2026-11-26", "canal": "WHATSAPP"}') ->> 'situacao' from ids, pr),
  'ACEITA', 'F3.204: a resposta do ativo entra');
select is((select count(*) from atendimentos a, ids where a.escritorio_id = ids.rc), (select atendimentos + 1 from antes),
  'F3.204: com o atendimento do cliente');
select is((select portal_proposta_editar(diego, rc, pr.ana_ras, pg_temp.versao(pr.ana_ras), pg_temp.dados(cli.ana, 'Rascunho de Ana, revisto')) ->> 'versao' from ids, pr, cli)::int,
  (select pg_temp.versao(ana_ras) from pr), 'F3.204: editar a do ativo continua');

select * from finish();
rollback;
