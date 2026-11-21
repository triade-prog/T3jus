-- Pedido de exclusão de cliente com contrato ou processo: não exclui, arquiva a pedido (F1.16,
-- PT-11, decisão 5 do desenho aprovado em docs/design/aprovadas/portal-clientes-pendencias).
begin;
select plan(24);

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Diego Almeida') as diego,
  teste.escritorio('Ribeiro & Matos') as rm;
select teste.vincular(socia, rm, 'SOCIO') from ids;
select portal_convidar(socia, rm, diego, 'Diego Almeida', array['COMERCIAL']) from ids;

create function pg_temp.cliente(p_nome text, p_tel text) returns uuid language sql as $$
  select (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', p_nome, 'documento', '52998224725',
    'origem', 'GOOGLE', 'contatos', jsonb_build_array(jsonb_build_object('nome', p_nome, 'telefone', p_tel, 'principal', true))))
    ->> 'id')::uuid from ids $$;
create temp table cl as select pg_temp.cliente('Antônia Ferreira Prado', '+5511955554444') as antonia,
                               pg_temp.cliente('Rafael Moura', '+5511977776666') as rafael;
select portal_registrar_atendimento(diego, rm, antonia, jsonb_build_object('canal', 'WHATSAPP', 'resumo', 'Conversa sobre o caso',
  'comQuem', 'Joana (filha)', 'proxEm', hoje_brasilia() + 1, 'proxResponsavel', diego, 'proxOque', 'Ligar')) from ids, cl;
create temp table ct as select (portal_contrato_criar(socia, rm, jsonb_build_object('clienteId', antonia, 'objeto', 'Aposentadoria por idade',
  'responsavelId', socia, 'advogados', jsonb_build_array(socia),
  'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'PARCELADO', 'total', 300000, 'parcelas', 3, 'primeiro', hoje_brasilia() + 20)))) ->> 'id')::uuid id
  from ids, cl;

-- O que a dona vê antes.
select is((select jsonb_array_length(portal_cliente(socia, rm, antonia) -> 'vinculosLgpd' -> 'contratos') from ids, cl), 1,
  'PT-11: a ficha mostra à dona o contrato que impede a exclusão');
select is((select portal_cliente(socia, rm, antonia) -> 'vinculosLgpd' -> 'contratos' -> 0 ->> 'numero' from ids, cl),
  (select numero from contratos, ct where contratos.id = ct.id), 'com o número do contrato');
select ok((select portal_cliente(diego, rm, antonia) -> 'vinculosLgpd' = 'null'::jsonb from ids, cl), 'quem não é a dona não recebe os vínculos');
select ok((select portal_cliente(socia, rm, rafael) -> 'vinculosLgpd' = 'null'::jsonb from ids, cl), 'sem contrato nem processo, sem vínculos');

-- Com contrato, a exclusão é recusada.
select portal_cliente_pedir_exclusao(diego, rm, antonia, jsonb_build_object('pedidoEm', hoje_brasilia(), 'canal', 'WHATSAPP')) from ids, cl;
create temp table v as select versao from clientes_escritorio, cl where id = antonia;
select is((teste.erro($$ select portal_cliente_excluir_dados(socia, rm, antonia, versao, jsonb_build_object('pedidoEm', hoje_brasilia(),
  'canal', 'WHATSAPP', 'quemPediu', 'TITULAR', 'conferido', true, 'nomeConfirmado', 'Antônia Ferreira Prado')) from ids, cl, v $$))
  -> 'detalhe' ->> 'motivo', 'TEM_CONTRATO_OU_PROCESSO', 'PT-11: com contrato, não exclui');
select is((select estado from pedidos_exclusao, cl where cliente_id = antonia), 'PENDENTE', 'a recusa não mexe no pedido nem no cliente');

-- Arquivar: só a dona, com a conferência; sem contrato, não arquiva.
select is((teste.erro($$ select portal_cliente_arquivar_lgpd(diego, rm, antonia, versao, '{}') from ids, cl, v $$)) -> 'detalhe' ->> 'motivo',
  'SO_SOCIO_DONO', 'decisão 5: só a dona arquiva');
select is((teste.erro($$ select portal_cliente_arquivar_lgpd(socia, rm, antonia, versao, jsonb_build_object('pedidoEm', hoje_brasilia(),
  'canal', 'WHATSAPP')) from ids, cl, v $$)) -> 'detalhe' -> 'campos', '["quemPediu", "conferido"]'::jsonb,
  'pede quem pediu e a conferência, sem o nome');
select is((teste.erro($$ select portal_cliente_arquivar_lgpd(socia, rm, rafael, c.versao, jsonb_build_object('pedidoEm', hoje_brasilia(),
  'canal', 'EMAIL', 'quemPediu', 'TITULAR', 'conferido', true)) from ids, cl, clientes_escritorio c where c.id = rafael $$))
  -> 'detalhe' ->> 'motivo', 'SEM_CONTRATO_OU_PROCESSO', 'sem contrato nem processo, o pedido se atende excluindo');
select is((teste.erro($$ select portal_cliente_arquivar_lgpd(socia, rm, antonia, versao - 1, jsonb_build_object('pedidoEm', hoje_brasilia(),
  'canal', 'WHATSAPP', 'quemPediu', 'TITULAR', 'conferido', true)) from ids, cl, v $$)) ->> 'codigo', 'TC409',
  'PT-19: versão antiga recebe o conflito');

create temp table arq as select portal_cliente_arquivar_lgpd(socia, rm, antonia, versao, jsonb_build_object('pedidoEm', hoje_brasilia(),
  'canal', 'WHATSAPP', 'quemPediu', 'REPRESENTANTE', 'conferido', true, 'observacao', 'Pediu pela filha, com procuração')) as j from ids, cl, v;
select is((select j ->> 'protocolo' from arq), 'EXC-' || to_char(hoje_brasilia(), 'YYYY') || '-0001', 'o arquivamento devolve o protocolo');
select ok((select estado = 'ARQUIVADO' and nome = 'Antônia Ferreira Prado' and documento = '52998224725' and jsonb_array_length(contatos) = 1
                  and arquivado_em is not null from clientes_escritorio, cl where id = antonia), 'decisão 5: nada é apagado');
select is((select estado || '|' || quem_pediu || '|' || (resolvido_por = socia)::text from pedidos_exclusao, cl, ids where cliente_id = antonia),
  'ARQUIVADO|REPRESENTANTE|true', 'o pedido aberto fica arquivado, com quem pediu e quem arquivou');
select ok((select bool_and(com_quem = 'Joana (filha)') from atendimentos, cl where cliente_id = antonia), 'os atendimentos ficam como estão');
select ok((select prox_contato(antonia) is null from cl), 'o próximo contato se encerra');
select ok(not exists (select 1 from ids, jsonb_array_elements(portal_inicio_contatos(diego, rm, 'MEUS', 50) -> 'hoje') x
                       where x ->> 'nome' = 'Antônia Ferreira Prado')
          and not exists (select 1 from ids, jsonb_array_elements(portal_inicio_contatos(diego, rm, 'MEUS', 50) -> 'vencidos') x
                       where x ->> 'nome' = 'Antônia Ferreira Prado'), 'sai do Início');
select ok(not exists (select 1 from ids, jsonb_array_elements(portal_clientes(socia, rm) -> 'clientes') x where x ->> 'nome' = 'Antônia Ferreira Prado'),
  'sai de Ativos');
select ok(not exists (select 1 from ids, jsonb_array_elements(portal_clientes(socia, rm, 'Antônia') -> 'clientes') x),
  'sai da busca');
select is((select x -> 'arquivamento' ->> 'protocolo' from ids, jsonb_array_elements(portal_clientes(socia, rm, null, 'INATIVO') -> 'clientes') x
            where x ->> 'situacao' = 'ARQUIVADO'), 'EXC-' || to_char(hoje_brasilia(), 'YYYY') || '-0001',
  'fica em Inativos, como arquivado a pedido, com o protocolo');
select is((select portal_cliente(diego, rm, antonia) -> 'arquivamento' ->> 'canal' from ids, cl), 'WHATSAPP', 'a ficha mostra o registro do arquivamento');

-- Só leitura.
select is((teste.erro($$ select portal_cliente_editar(socia, rm, antonia, versao + 1, '{"nome":"Antônia"}') from ids, cl, v $$))
  -> 'detalhe' ->> 'motivo', 'CLIENTE_ARQUIVADO', 'o arquivado não se edita');
select is((teste.erro($$ select portal_cliente_reativar(socia, rm, antonia, versao + 1, null) from ids, cl, v $$))
  -> 'detalhe' ->> 'motivo', 'CLIENTE_ARQUIVADO', 'nem se reativa');
select is((teste.erro($$ select portal_registrar_atendimento(diego, rm, antonia, jsonb_build_object('canal', 'TELEFONE', 'resumo', 'Ligou')) from ids, cl $$))
  -> 'detalhe' ->> 'motivo', 'CLIENTE_ARQUIVADO', 'nem recebe atendimento');
select is((teste.erro($$ select portal_cliente_pedir_exclusao(diego, rm, antonia, jsonb_build_object('pedidoEm', hoje_brasilia(), 'canal', 'EMAIL')) from ids, cl $$))
  -> 'detalhe' ->> 'motivo', 'CLIENTE_ARQUIVADO', 'nem recebe outro pedido');

select * from finish();
rollback;
