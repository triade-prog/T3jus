-- Jornada do cliente, parte 3 (0852; EX-17): encerrar o caso no financeiro e os contratos ligados
-- de uma vez, só os que não têm outro caso em andamento, com o motivo fixo; se algo falha, nada
-- se encerra. A ficha do caso traz o resumo do acerto, com valores só para quem tem Financeiro.
begin;
select plan(17);

select ajustar_relogio(('2026-11-18 10:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Larissa Costa') as larissa,
  teste.escritorio('Ribeiro & Matos') as rm;
select teste.vincular(socia, rm, 'SOCIO') from ids;
select portal_convidar(socia, rm, diego, 'Diego Almeida', array['FINANCEIRO']),
       portal_convidar(socia, rm, larissa, 'Larissa Costa', array['JURIDICO']) from ids;

create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Antônia Ferreira Prado', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Antônia Ferreira Prado', 'telefone', '+5511996027736', 'principal', true)))) ->> 'id')::uuid ant,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Joana Prado', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Joana Prado', 'telefone', '+5511996027737', 'principal', true)))) ->> 'id')::uuid joana
  from ids;
create function pg_temp.contrato(p_cliente uuid, p_objeto text) returns uuid language sql as $$
  select (portal_contrato_criar(ids.socia, ids.rm, jsonb_build_object('clienteId', p_cliente, 'objeto', p_objeto,
    'responsavelId', ids.socia, 'advogados', jsonb_build_array(ids.socia),
    'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'EXITO', 'percentual', 3000, 'sobre', 'Atrasados', 'etapa', 'Encerrado', 'dias', 0)))) ->> 'id')::uuid
    from ids
$$;
create temp table ct as select pg_temp.contrato(cli.ant, 'Pensão por morte') ant, pg_temp.contrato(cli.joana, 'Pensão por morte e revisão') joana from cli;
select portal_contrato_assinatura_caso(socia, rm, ct.ant, 1, '2026-11-18', jsonb_build_object('modo', 'NOVO', 'nome', 'Ferreira Prado x INSS',
  'area', 'PREVIDENCIARIO', 'responsavelId', ids.larissa, 'papel', 'AUTOR')) from ids, ct;
create temp table cs as select c.id, (select id from etapas where escritorio_id = ids.rm and final) final
  from casos c, ids where c.escritorio_id = ids.rm and c.nome = 'Ferreira Prado x INSS';
-- O contrato de Joana está neste caso e num outro em andamento: não entra na cadeia (EX-01).
select portal_contrato_assinatura_caso(socia, rm, ct.joana, 1, '2026-11-18', jsonb_build_object('modo', 'NOVO', 'nome', 'Joana Prado x INSS (revisão)',
  'area', 'PREVIDENCIARIO', 'responsavelId', ids.larissa, 'papel', 'AUTOR')) from ids, ct;
insert into caso_clientes (escritorio_id, caso_id, cliente_id, papel, contrato_id, ordem)
  select ids.rm, cs.id, cli.joana, 'AUTOR', ct.joana, 2 from ids, cs, cli, ct;

select portal_juridico_caso_etapa(larissa, rm, cs.id, 1, jsonb_build_object('etapaId', cs.final, 'motivo', 'Sentença com ganho',
  'resultado', 'GANHO', 'previstoEm', '2026-12-15', 'valores', jsonb_build_object(cli.ant, 3864000, cli.joana, 100000))) from ids, cs, cli;
select portal_financeiro_exito_nao_cobrar(diego, rm, x.id, '{"motivo": "OUTRO", "explicacao": "Combinado com a sócia"}')
  from ids, exitos_conferir x, cs where x.caso_id = cs.id;
create temp table lv as select
  (portal_financeiro_levantamento_registrar(diego, rm, jsonb_build_object('tipo', 'RPV', 'casoId', cs.id, 'clienteId', cli.ant,
    'valor', 3864000, 'entrouEm', '2026-11-18', 'divisao', jsonb_build_array(
      jsonb_build_object('para', 'CLIENTE', 'valor', 2512800),
      jsonb_build_object('para', 'PERITO', 'nome', 'Dr. Rui Tavares', 'valor', 1351200)))) ->> 'id')::uuid id
  from ids, cs, cli;
select portal_financeiro_destinacao_feita(diego, rm, d.id, '{"feitoEm": "2026-11-18"}')
  from ids, lv, destinacoes d where d.levantamento_id = lv.id and d.para = 'CLIENTE';

-- A ficha do caso: o acerto pendente, com os valores só para quem tem Financeiro.
create temp table fm as select portal_juridico_caso(socia, rm, cs.id) -> 'acerto' a from ids, cs;
select is((select a -> 'pendente' from fm), 'true'::jsonb, 'decisão 21: "Encerrado · acerto pendente"');
select is((select a -> 'outros' -> 0 ->> 'nome' from fm), 'Dr. Rui Tavares', 'o quadro diz quem falta pagar');
select is((select a ->> 'levantamentoId' from fm), (select id::text from lv), 'e "Ver o acerto" leva à ficha do repasse');
create temp table fl as select portal_juridico_caso(larissa, rm, cs.id) -> 'acerto' a from ids, cs;
select is((select a -> 'outros' from fl), 'null'::jsonb, 'decisão 22: sem Financeiro, sem valores');
select is((select a -> 'faltaOutros' from fl), 'true'::jsonb, 'mas diz que falta pagar terceiros');
select is((select a -> 'levantamentoId' from fl), 'null'::jsonb, 'e sem o link');
select ok((select a -> 'quemCuida' ? 'Diego Almeida' from fl), 'com quem cuida');

-- O acerto traz os contratos que se encerram junto.
select portal_financeiro_destinacao_feita(diego, rm, d.id, '{"feitoEm": "2026-11-18"}')
  from ids, lv, destinacoes d where d.levantamento_id = lv.id and d.para = 'PERITO';
create temp table ac as select portal_financeiro_caso_acerto(socia, rm, cs.id) a from ids, cs;
select is((select jsonb_path_query_array(a -> 'contratosLigados', '$[*].id') from ac), jsonb_build_array((select ant::text from ct)),
  'EX-01: só o contrato sem outro caso em andamento');
select is((select a ->> 'motivoContratos' from ac), 'Caso Ferreira Prado x INSS encerrado no financeiro em 18/11/2026.', 'com o motivo que fica no contrato');
select is((select portal_financeiro_caso_acerto(diego, rm, cs.id) -> 'podeEncerrarContratos' from ids, cs), 'false'::jsonb,
  'quem não tem Contratos não encerra os contratos junto');

-- Recusas: contrato fora da cadeia, e a versão que mudou; nada se encerra.
select is((teste.erro($$ select portal_financeiro_caso_encerrar(socia, rm, cs.id, jsonb_build_array(jsonb_build_object('id', ct.joana, 'versao', 1)))
  from ids, cs, ct $$)) -> 'detalhe' ->> 'motivo', 'CONTRATO_FORA_DO_CASO', 'contrato com outro caso em andamento é recusado');
select ok((teste.erro($$ select portal_financeiro_caso_encerrar(socia, rm, cs.id, jsonb_build_array(jsonb_build_object('id', ct.ant, 'versao', 1)))
  from ids, cs, ct $$)) is not null, 'decisão 25: a versão que mudou é recusada');
select is((select count(*) from fechamentos_caso f, cs where f.caso_id = cs.id), 0::bigint, 'e nada foi encerrado');

-- Em cadeia: caso e contrato juntos.
select is((select jsonb_array_length(portal_financeiro_caso_encerrar(socia, rm, cs.id,
  jsonb_build_array(jsonb_build_object('id', ct.ant, 'versao', (select versao from contratos where id = ct.ant)))) -> 'contratosEncerrados')
  from ids, cs, ct), 1, 'EX-17: o caso e o contrato se encerram juntos');
select is((select motivo_encerramento from contratos, ct where id = ct.ant), 'Caso Ferreira Prado x INSS encerrado no financeiro em 18/11/2026.',
  'com o motivo fixo');
select is((select portal_cliente(socia, rm, cli.ant) -> 'passo' ->> 'tipo' from ids, cli), 'ATENDIDO',
  'decisão 26: a ficha de Antônia passa a dizer "Cliente atendido"');
select is((select estado from contratos, ct where id = ct.joana), 'ATIVO', 'o contrato de Joana, com outro caso em andamento, continua ativo');

select * from finish();
rollback;
