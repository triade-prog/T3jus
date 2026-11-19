-- Pendências de Clientes: contatos do dia no Início (F1.14, AP-06) e pedido de exclusão do
-- titular (F1.15, PT-11).
begin;
select plan(43);

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Larissa Costa') as larissa,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, larissa, 'Larissa Costa', array['JURIDICO']),
       portal_convidar(socia, rm, diego, 'Diego Almeida', array['COMERCIAL']) from ids;

create function pg_temp.cliente(p_nome text, p_tel text) returns uuid language sql as $$
  select (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', p_nome, 'documento', '52998224725',
    'profissao', 'professora', 'cidade', 'São Paulo', 'uf', 'SP', 'origem', 'INDICACAO_CLIENTE', 'origem_indicacao', 'João Souza',
    'contatos', jsonb_build_array(jsonb_build_object('nome', p_nome, 'telefone', p_tel, 'principal', true),
                                  jsonb_build_object('nome', 'Beatriz', 'papel', 'filha', 'email', 'bia@exemplo.invalid', 'principal', false))))
    ->> 'id')::uuid from ids $$;
create function pg_temp.atender(p_cliente uuid, p_dias integer, p_resp uuid, p_oque text) returns uuid language sql as $$
  select portal_registrar_atendimento(diego, rm, p_cliente, jsonb_build_object('canal', 'WHATSAPP', 'resumo', 'Conversa sobre o caso',
    'comQuem', 'Beatriz (filha)', 'proxEm', hoje_brasilia() + p_dias, 'proxResponsavel', p_resp, 'proxOque', p_oque)) from ids $$;

create temp table cl as select pg_temp.cliente('Helena Prado', '+5511988887777') as helena,
                               pg_temp.cliente('Rafael Moura', '+5511977776666') as rafael,
                               pg_temp.cliente('Lúcia Barros', '+5511966665555') as lucia,
                               pg_temp.cliente('Antônia Prado', '+5511955554444') as antonia;
-- Helena vence em 1 dia e Rafael em 3 (de Diego); Lúcia em 3 (da sócia); Antônia daqui a 10.
select pg_temp.atender(helena, 1, diego, 'Cobrar os exames'), pg_temp.atender(rafael, 3, diego, 'Confirmar a reunião'),
       pg_temp.atender(lucia, 3, (select socia from ids), 'Pedir a carteira'), pg_temp.atender(antonia, 10, diego, 'Ligar') from cl, ids;
select ajustar_relogio(interval '3 days');

-- ---------------------------------------------------------------------------------------
-- Início (F1.14).
create temp table ini as select portal_inicio_contatos(diego, rm) as j from ids;
select is((select jsonb_agg(x ->> 'nome') from ini, jsonb_array_elements(j -> 'vencidos') x), '["Helena Prado"]'::jsonb,
  'AP-06: os vencidos de quem é o responsável');
select is((select jsonb_agg(x ->> 'nome') from ini, jsonb_array_elements(j -> 'hoje') x), '["Rafael Moura"]'::jsonb,
  'AP-06: depois os de hoje; o da sócia não entra');
select is((select (j -> 'vencidos' -> 0 ->> 'diasAtraso')::int from ini), 2, 'o vencido diz há quantos dias');
select is((select j -> 'proximo' ->> 'nome' from ini), 'Antônia Prado', 'diz o próximo contato marcado, para o vazio');
select is((select j -> 'vencidos' -> 0 -> 'contatoPrincipal' ->> 'telefone' from ini), '+5511988887777', 'com o contato principal');
select ok((select j -> 'equipeVencidos' = 'null'::jsonb and j -> 'pedidosExclusao' = 'null'::jsonb from ini),
  'quem não é a dona não recebe os números da equipe');
select is((select jsonb_agg(x ->> 'nome') from ids, jsonb_array_elements(portal_inicio_contatos(socia, rm) -> 'hoje') x),
  '["Lúcia Barros"]'::jsonb, 'decisão 1: a dona vê os dela por padrão');
select is((select (portal_inicio_contatos(socia, rm) ->> 'equipeVencidos')::int from ids), 1,
  'decisão 1: e quantos vencidos a equipe tem');
select is((select portal_inicio_contatos(socia, rm, 'EQUIPE') ->> 'totalHoje' from ids), '2', 'decisão 1: "Da equipe" mostra os de todos');
select is((teste.erro($$ select portal_inicio_contatos(diego, rm, 'EQUIPE') from ids $$)) -> 'detalhe' ->> 'motivo', 'SO_SOCIO_DONO',
  'só a dona vê os da equipe');
select is((teste.erro($$ select portal_inicio_contatos(larissa, rm) from ids $$)) -> 'detalhe' ->> 'motivo', 'AREA_NAO_LIBERADA',
  'sem Comercial, sem contatos no Início');
select is((teste.erro($$ select portal_inicio_contatos(intrusa, rm) from ids $$)) ->> 'codigo', 'TC401', 'outro escritório não lê');
select is((select jsonb_array_length(portal_inicio_contatos(diego, rm, 'MEUS', 1) -> 'vencidos') +
                  (portal_inicio_contatos(diego, rm, 'MEUS', 1) ->> 'totalVencidos')::int from ids), 2,
  'o limite corta a lista e o total continua certo');

-- ---------------------------------------------------------------------------------------
-- Pedido de exclusão (F1.15).
select is((teste.erro($$ select portal_cliente_pedir_exclusao(larissa, rm, antonia, '{"pedidoEm":"2099-01-01","canal":"FAX"}') from ids, cl $$))
  -> 'detalhe' -> 'campos', '["pedidoEm", "canal"]'::jsonb, 'o pedido confere a data e o canal');
create temp table p1 as select portal_cliente_pedir_exclusao(larissa, rm, antonia, jsonb_build_object(
  'pedidoEm', hoje_brasilia(), 'canal', 'WHATSAPP')) as j from ids, cl;
select is((select j ->> 'estado' from p1), 'PENDENTE', 'decisão 2: quem não é a dona registra o pedido para ela');
select is((teste.erro($$ select portal_cliente_pedir_exclusao(diego, rm, antonia, jsonb_build_object(
  'pedidoEm', hoje_brasilia(), 'canal', 'EMAIL', 'quemPediu', 'TITULAR')) from ids, cl $$)) -> 'detalhe' ->> 'motivo', 'PEDIDO_ABERTO',
  'um pedido aberto por cliente');
select is((select portal_cliente(diego, rm, antonia) -> 'pedidoExclusao' -> 'registradoPor' ->> 'nome' from ids, cl), 'Larissa Costa',
  'a ficha mostra o pedido aberto e quem registrou');
select is((select jsonb_array_length(portal_inicio_contatos(socia, rm) -> 'pedidosExclusao') from ids), 1,
  'o Início da dona avisa o pedido esperando');
select is((teste.erro($$ select portal_cliente_recusar_exclusao(diego, rm, antonia, 'Não veio da titular') from ids, cl $$))
  -> 'detalhe' ->> 'motivo', 'SO_SOCIO_DONO', 'só a dona recusa');
select is((teste.erro($$ select portal_cliente_recusar_exclusao(socia, rm, antonia, ' ') from ids, cl $$)) -> 'detalhe' -> 'campos',
  '["motivo"]'::jsonb, 'a recusa pede o motivo');
select is((select portal_cliente_recusar_exclusao(socia, rm, antonia, 'Não veio da titular') ->> 'estado' from ids, cl), 'RECUSADO',
  'a dona recusa o pedido');
select ok((select f -> 'pedidoExclusao' = 'null'::jsonb and f -> 'ultimaRecusa' ->> 'motivoRecusa' = 'Não veio da titular'
             from ids, cl, portal_cliente(socia, rm, antonia) f), 'a ficha mostra a recusa');
select is((teste.erro($$ select portal_cliente_recusar_exclusao(socia, rm, antonia, 'De novo') from ids, cl $$)) -> 'detalhe' ->> 'motivo',
  'SEM_PEDIDO', 'sem pedido aberto, não há o que recusar');

-- Pedido novo, e a dona exclui.
select portal_cliente_pedir_exclusao(diego, rm, helena, jsonb_build_object('pedidoEm', hoje_brasilia() - 1, 'canal', 'TELEFONE',
  'quemPediu', 'TITULAR', 'observacao', 'Pediu por telefone')) from ids, cl;
select is((teste.erro($$ select portal_cliente_excluir_dados(diego, rm, helena, 1, '{}') from ids, cl $$)) -> 'detalhe' ->> 'motivo',
  'SO_SOCIO_DONO', 'decisão 2: só a dona exclui');
create temp table v as select versao from clientes_escritorio, cl where id = helena;
select is((teste.erro($$ select portal_cliente_excluir_dados(socia, rm, helena, versao, jsonb_build_object('pedidoEm', hoje_brasilia(),
  'canal', 'TELEFONE', 'quemPediu', 'TITULAR', 'nomeConfirmado', 'Helena')) from ids, cl, v $$)) -> 'detalhe' -> 'campos',
  '["conferido", "nomeConfirmado"]'::jsonb, 'pede a conferência e o nome digitado igual');
select is((teste.erro($$ select portal_cliente_excluir_dados(socia, rm, helena, versao, jsonb_build_object('pedidoEm', hoje_brasilia(),
  'canal', 'TELEFONE', 'conferido', true, 'nomeConfirmado', 'Helena Prado')) from ids, cl, v $$)) -> 'detalhe' -> 'campos',
  '["quemPediu"]'::jsonb, 'ao excluir, a dona diz quem pediu');
select is((teste.erro($$ select portal_cliente_excluir_dados(socia, rm, helena, versao - 1, jsonb_build_object('pedidoEm', hoje_brasilia(),
  'canal', 'TELEFONE', 'quemPediu', 'TITULAR', 'conferido', true, 'nomeConfirmado', 'helena  prado')) from ids, cl, v $$)) ->> 'codigo',
  'TC409', 'PT-19: versão antiga recebe o conflito');
create temp table ex as select portal_cliente_excluir_dados(socia, rm, helena, versao, jsonb_build_object('pedidoEm', hoje_brasilia() - 1,
  'canal', 'TELEFONE', 'quemPediu', 'TITULAR', 'conferido', true, 'nomeConfirmado', ' helena  PRADO ')) as j from ids, cl, v;
select is((select j ->> 'protocolo' from ex), 'EXC-' || to_char(hoje_brasilia(), 'YYYY') || '-0001', 'a exclusão devolve o protocolo');
select ok((select estado = 'EXCLUIDO' and nome = 'Cliente excluído' and documento is null and contatos = '[]' and profissao is null
                  and cidade is null and origem_indicacao is null and origem = 'INDICACAO_CLIENTE' and excluido_em is not null
             from clientes_escritorio, cl where id = helena), 'nome, documento, qualificação, quem indicou e contatos saem; a origem fica');
select ok((select bool_and(com_quem is null and prox_em is null and prox_oque is null and resumo = 'Conversa sobre o caso' and canal = 'WHATSAPP')
             from atendimentos, cl where cliente_id = helena), 'decisão 3: o atendimento fica com data, canal, quem atendeu e resumo');
select is((select estado || '|' || observacao || '|' || (resolvido_por = socia)::text from pedidos_exclusao, cl, ids
            where cliente_id = helena), 'ATENDIDO|Pediu por telefone|true', 'o pedido aberto fica atendido, com quem resolveu');
select ok(not exists (select 1 from historico h, cl where h.entidade_id = helena::text and h.dados::text ~* 'helena|prado|52998224725'),
  'PT-03: o histórico do cliente não guarda dado pessoal');
select ok((select prox_contato(helena) is null from cl) and
          not (select portal_inicio_contatos(diego, rm) -> 'vencidos' @> '[{"nome":"Cliente excluído"}]' from ids),
  'o contato do excluído sai do Início');
select is((select jsonb_agg(x ->> 'nome') from ids, jsonb_array_elements(portal_clientes(socia, rm, null, 'INATIVO') -> 'clientes') x),
  '["Cliente excluído"]'::jsonb, 'decisão 4: o excluído fica em Inativos');
select ok((select x -> 'exclusao' ->> 'protocolo' like 'EXC-%' from ids, jsonb_array_elements(portal_clientes(socia, rm, null, 'INATIVO') -> 'clientes') x),
  'decisão 4: com o protocolo');
select ok(not exists (select 1 from ids, jsonb_array_elements(portal_clientes(socia, rm, 'excluído') -> 'clientes') x),
  'a busca não acha o excluído');
select is((select portal_cliente(larissa, rm, helena) -> 'exclusao' ->> 'canal' from ids, cl), 'TELEFONE', 'a ficha mostra o registro da exclusão');
select is((teste.erro($$ select portal_cliente_editar(socia, rm, helena, versao + 1, '{"nome":"Helena"}') from ids, cl, v $$))
  -> 'detalhe' ->> 'motivo', 'CLIENTE_EXCLUIDO', 'o excluído não se edita');
select is((teste.erro($$ select portal_cliente_reativar(socia, rm, helena, versao + 1, null) from ids, cl, v $$))
  -> 'detalhe' ->> 'motivo', 'CLIENTE_EXCLUIDO', 'nem se reativa');
select is((teste.erro($$ select pg_temp.atender(helena, 1, diego, 'Ligar') from cl, ids $$)) -> 'detalhe' ->> 'motivo', 'CLIENTE_EXCLUIDO',
  'nem recebe atendimento');
select is((teste.erro($$ select portal_cliente_excluir_dados(socia, rm, helena, versao + 1, '{}') from ids, cl, v $$))
  -> 'detalhe' ->> 'motivo', 'CLIENTE_EXCLUIDO', 'nem se exclui de novo');
select throws_ok($$ update atendimentos set resumo = 'outro' from cl where cliente_id = helena $$, 'TC010', null,
  'decisão 3: o atendimento do excluído continua sem edição');

-- A dona exclui sem pedido antes: o registro nasce atendido, com o protocolo seguinte.
select is((select portal_cliente_excluir_dados(socia, rm, rafael, c.versao, jsonb_build_object('pedidoEm', hoje_brasilia(),
  'canal', 'EMAIL', 'quemPediu', 'REPRESENTANTE', 'conferido', true, 'nomeConfirmado', 'Rafael Moura')) ->> 'protocolo'
  from ids, cl, clientes_escritorio c where c.id = rafael), 'EXC-' || to_char(hoje_brasilia(), 'YYYY') || '-0002', 'sem pedido antes, o protocolo segue');

select ajustar_relogio(interval '0');
select * from finish();
rollback;
