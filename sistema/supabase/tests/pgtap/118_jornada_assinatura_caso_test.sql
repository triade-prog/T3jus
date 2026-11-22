-- Jornada do cliente, parte 1 (0850; CH-11, CH-12): os contratos assinados que ficaram sem caso
-- aparecem para Contratos e Jurídico; "Abrir o caso" deles aceita "não tem caso" e abrir tira a
-- marca; a janela da assinatura sugere juntar ao caso em andamento em que o cliente está sem
-- contrato, e juntar só liga o contrato à linha que já existe.
begin;
select plan(18);

select ajustar_relogio(('2026-11-18 12:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Bianca Lopes') as bianca,
  teste.pessoa('Larissa Costa') as larissa,
  teste.escritorio('Ribeiro & Matos') as rm;
select teste.vincular(socia, rm, 'SOCIO') from ids;
select portal_convidar(socia, rm, diego, 'Diego Almeida', array['COMERCIAL']) from ids;
select portal_convidar(socia, rm, bianca, 'Bianca Lopes', array['CONTRATOS']) from ids;
select portal_convidar(socia, rm, larissa, 'Larissa Costa', array['JURIDICO']) from ids;

create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Hélio Batista Corrêa', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Hélio Batista Corrêa', 'telefone', '+5511996027736', 'principal', true)))) ->> 'id')::uuid helio,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Antônia Ferreira Prado', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Antônia Ferreira Prado', 'telefone', '+5511996027737', 'principal', true)))) ->> 'id')::uuid ant
  from ids;

create function pg_temp.contrato(p_cliente uuid, p_objeto text) returns uuid language sql as $$
  select (portal_contrato_criar(ids.socia, ids.rm, jsonb_build_object('clienteId', p_cliente, 'objeto', p_objeto,
    'responsavelId', ids.socia, 'advogados', jsonb_build_array(ids.socia),
    'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'MENSAL', 'valor', 50000, 'primeiro', '2026-12-05', 'meses', 6)))) ->> 'id')::uuid
    from ids
$$;

-- Hélio: assinado pelo caminho antigo (importação, ou a rota sem o caso), ficou sem caso.
create temp table ct as select pg_temp.contrato(cli.helio, 'Revisão de aposentadoria') helio from cli;
select portal_contrato_assinatura(socia, rm, ct.helio, 1, '2026-11-18') from ids, ct;

select is((select portal_contratos_sem_caso(bianca, rm) -> 'contratos' -> 0 ->> 'numero' from ids), (select numero from contratos, ct where id = ct.helio),
  'CH-11: o contrato assinado sem caso aparece na lista');
select is((select portal_contratos_sem_caso(bianca, rm) -> 'podeAbrir' from ids), 'false'::jsonb, 'quem não tem Jurídico vê a lista, mas não abre o caso');
select ok((select portal_contratos_sem_caso(bianca, rm) -> 'quemAbre' ? 'Larissa Costa' from ids), 'e a lista diz quem abre');
select is((select portal_contratos_sem_caso(larissa, rm) -> 'podeAbrir' from ids), 'true'::jsonb, 'quem tem Jurídico abre o caso');
select is((teste.erro($$ select portal_contratos_sem_caso(diego, rm) from ids $$)) -> 'detalhe' ->> 'motivo', 'AREA_NAO_LIBERADA',
  'sem Contratos nem Jurídico, a lista não abre');

-- Decisão 8: daqui também dá para dizer que o contrato não tem caso.
select is((select portal_contrato_caso(larissa, rm, ct.helio, jsonb_build_object('modo', 'SEM')) -> 'semCaso' from ids, ct), 'true'::jsonb,
  'decisão 8: "não tem caso" pelo Abrir o caso');
select is((select sem_caso from contratos, ct where id = ct.helio), true, 'o contrato fica marcado');
select is((select jsonb_array_length(portal_contratos_sem_caso(larissa, rm) -> 'contratos') from ids), 0, 'e sai da lista');

-- Decisão 28 (CH-13): abrir um caso depois tira a marca.
select isnt((select portal_contrato_caso(larissa, rm, ct.helio, jsonb_build_object('modo', 'NOVO', 'nome', 'Hélio x INSS', 'area', 'PREVIDENCIARIO',
  'responsavelId', ids.larissa, 'papel', 'AUTOR')) ->> 'casoId' from ids, ct), null, 'abrir o caso do contrato marcado sem caso');
select is((select sem_caso from contratos, ct where id = ct.helio), false, 'decisão 28: abrir o caso tira a marca');
select is((teste.erro($$ select portal_contrato_caso(larissa, rm, ct.helio, jsonb_build_object('modo', 'SEM')) from ids, ct $$)) -> 'detalhe' ->> 'motivo',
  'CONTRATO_COM_CASO', 'contrato que já está num caso não vira "sem caso"');
select is((select count(*) from historico, ct where entidade_id = ct.helio::text and acao = 'contrato.sem_caso_desfeito'), 1::bigint,
  'desfazer a marca fica no histórico do contrato');

-- CH-12: Antônia já tem o caso em andamento, cadastrado no Jurídico sem contrato.
create temp table caso as select (portal_juridico_caso_criar(larissa, rm, jsonb_build_object('nome', 'Ferreira Prado x INSS', 'area', 'PREVIDENCIARIO',
  'etapaId', (select id from etapas e where e.escritorio_id = ids.rm and not e.final order by e.ordem limit 1), 'responsavelId', ids.larissa,
  'clientes', jsonb_build_array(jsonb_build_object('clienteId', cli.ant, 'papel', 'AUTOR')))) ->> 'id')::uuid id
  from ids, cli;
create temp table ct2 as select pg_temp.contrato(cli.ant, 'Pensão por morte') id from cli;

select is((select portal_contrato_caso_opcoes(larissa, rm, ct2.id) ->> 'modoSugerido' from ids, ct2), 'JUNTAR',
  'CH-12: com o cliente num caso sem contrato, a sugestão é juntar');
select is((select portal_contrato_caso_opcoes(larissa, rm, ct2.id) -> 'casosDoCliente' -> 0 ->> 'id' from ids, ct2), (select id::text from caso),
  'e a janela traz esse caso');
select is((select portal_contrato_caso_opcoes(bianca, rm, ct2.id) ->> 'modoSugerido' from ids, ct2), 'NOVO',
  'quem não escolhe (sem Jurídico) continua com o caso novo');
select is((select portal_contrato_caso_opcoes(bianca, rm, ct2.id) -> 'casosDoCliente' from ids, ct2), 'null'::jsonb,
  'e não vê os casos do cliente');

select portal_contrato_assinatura_caso(socia, rm, ct2.id, 1, '2026-11-18',
  jsonb_build_object('modo', 'JUNTAR', 'casoId', caso.id, 'papel', 'AUTOR')) from ids, ct2, caso;
select is((select count(*) from caso_clientes, caso, cli where caso_id = caso.id and cliente_id = cli.ant), 1::bigint,
  'juntar não duplica o cliente no caso');
select is((select contrato_id from caso_clientes, caso, cli where caso_id = caso.id and cliente_id = cli.ant), (select id from ct2),
  'só liga o contrato à linha que já existia');

select * from finish();
rollback;
