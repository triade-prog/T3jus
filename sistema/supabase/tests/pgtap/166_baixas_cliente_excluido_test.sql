-- A explicação da baixa sem receber do cliente excluído a pedido do titular (1132 e 1133; F3.193,
-- PT-11, FI-24, FI-25, PT-03): na exclusão, a explicação escrita (a linha BAIXA, a linha das custas
-- juntas e o DESFEITA) vira "Explicação apagada a pedido do titular"; o resto da linha não muda; o
-- guardião aceita só essa troca, só no cliente EXCLUIDO; os clientes excluídos antes da 1132 entram
-- pela função da 1133, também com o escritório só de consulta; as leituras mostram o texto fixo.
--
-- Não há caminho normal para baixa de cliente excluído (o contrato prende o cliente). O teste monta
-- o contrato, a parcela vencida, a baixa com as custas juntas e o desfazer, e exclui com o gatilho
-- cliente_excluido_nao_muda desligado só nesta transação (como o 150 e o
-- exclusao-desfazer-simultaneo.sh fazem).
begin;
select plan(22);

select ajustar_relogio(('2026-05-28 10:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Larissa Costa') as larissa,
  teste.escritorio('Ribeiro & Matos') as rm;
select teste.vincular(socia, rm, 'SOCIO') from ids;
select portal_convidar(socia, rm, diego, 'Diego Almeida', array['FINANCEIRO', 'COMERCIAL']),
       portal_convidar(socia, rm, larissa, 'Larissa Costa', array['JURIDICO']) from ids;

create function pg_temp.fim() returns void language plpgsql as $$
begin
  set constraints all immediate;
  set constraints caso_pronto_fim, caso_pronto_fim_mudou, caso_pronto_fim_saiu, destinacoes_fecham deferred;
end $$;
create function pg_temp.cliente(p_nome text, p_tel text) returns uuid language sql as $$
  select (portal_cliente_cadastrar(ids.socia, ids.rm, jsonb_build_object('tipo', 'PF', 'nome', p_nome, 'origem', 'GOOGLE',
    'contatos', jsonb_build_array(jsonb_build_object('nome', p_nome, 'telefone', p_tel, 'principal', true)))) ->> 'id')::uuid from ids
$$;
create function pg_temp.contrato(p_cliente uuid) returns uuid language sql as $$
  select (portal_contrato_criar(ids.socia, ids.rm, jsonb_build_object('clienteId', p_cliente, 'objeto', 'Vício construtivo',
    'responsavelId', ids.socia, 'advogados', jsonb_build_array(ids.socia),
    'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'FIXO', 'valor', 150000, 'vencimento', '2026-06-10')))) ->> 'id')::uuid from ids
$$;
create function pg_temp.caso(p_nome text, p_cliente uuid, p_contrato uuid) returns uuid language sql as $$
  select (portal_juridico_caso_criar(ids.socia, ids.rm, jsonb_build_object('nome', p_nome, 'area', 'CIVEL',
    'etapaId', (select id from etapas where escritorio_id = ids.rm and ordem = 5), 'responsavelId', ids.larissa,
    'clientes', jsonb_build_array(jsonb_build_object('clienteId', p_cliente, 'papel', 'AUTOR', 'contratoId', p_contrato)))) ->> 'id')::uuid from ids
$$;
create function pg_temp.excluir(p_cliente uuid) returns jsonb language sql as $$
  select portal_cliente_excluir_dados(ids.socia, c.escritorio_id, p_cliente, c.versao,
    jsonb_build_object('pedidoEm', hoje_brasilia(), 'canal', 'TELEFONE', 'quemPediu', 'TITULAR', 'conferido', true, 'nomeConfirmado', c.nome))
    from clientes_escritorio c, ids where c.id = p_cliente
$$;
create function pg_temp.baixar(p_parcela uuid, p_expl text, p_reembolso boolean default false) returns jsonb language sql as $$
  select portal_financeiro_parcela_baixar(ids.socia, ids.rm, p_parcela, jsonb_build_object('motivo', 'INADIMPLENCIA', 'explicacao', p_expl,
    'falta', (select valor from recebimentos_previstos where id = p_parcela), 'reembolso', p_reembolso)) from ids
$$;
select portal_juridico_casos(socia, rm) from ids;

-- Noemi (excluída com o gatilho), Cláudio (fica ativo) e Rosa (excluída "antes da 1132").
create temp table cli as select
  pg_temp.cliente('Noemi Bastos Carvalho', '+5511984223170') noemi,
  pg_temp.cliente('Cláudio Carvalho', '+5511984223171') claudio,
  pg_temp.cliente('Rosa Almeida', '+5511984223173') rosa;
create temp table ct as select pg_temp.contrato(cli.noemi) noemi, pg_temp.contrato(cli.claudio) claudio, pg_temp.contrato(cli.rosa) rosa from cli;
select portal_contrato_assinatura(socia, rm, x, 1, '2026-05-28') from ids, ct, unnest(array[ct.noemi, ct.claudio, ct.rosa]) x;
create temp table cs as select pg_temp.caso('Carvalho x Construtora Lume', cli.noemi, ct.noemi) noemi from cli, ct;
create temp table p as select
  (select id from recebimentos_previstos where contrato_id = ct.noemi) noemi,
  (select id from recebimentos_previstos where contrato_id = ct.claudio) claudio,
  (select id from recebimentos_previstos where contrato_id = ct.rosa) rosa
  from ct;

-- As custas de Noemi (R$ 412,30) voltam com a parcela única.
select ajustar_relogio(('2026-06-05 10:00-03'::timestamptz - now()));
create temp table cp as select (portal_financeiro_conta_lancar(diego, rm, jsonb_build_object('descricao', 'Custas iniciais e diligência do oficial',
  'categoria', 'CUSTAS', 'valor', 41230, 'vencimento', '2026-06-05', 'adiantada', true, 'clienteId', cli.noemi, 'casoId', cs.noemi,
  'reembolsoComo', 'PROXIMA_PARCELA')) ->> 'id')::uuid noemi from ids, cli, cs;

-- As baixas, em 20/06: a de Noemi com as custas junto, desfeita e baixada de novo.
select ajustar_relogio(('2026-06-20 10:00-03'::timestamptz - now()));
select pg_temp.baixar(p.noemi, 'Noemi disse que a mãe dela, Dona Rita, não vai pagar', true) from p;
select pg_temp.fim();
select portal_financeiro_parcela_baixa_desfazer(socia, rm, p.noemi, '{"explicacao": "Noemi ligou e prometeu pagar em julho"}') from ids, p;
select pg_temp.fim();
select pg_temp.baixar(p.noemi, 'Noemi não pagou em julho, como prometeu', false) from p;
select pg_temp.baixar(p.claudio, 'Cláudio pediu para não cobrar') from p;
select pg_temp.baixar(p.rosa, 'Rosa mudou de cidade e não atende') from p;
select pg_temp.fim();
select is((select string_agg(b.tipo || case when b.junto_de is null then '' else ' junta' end, ',' order by b.ordem) from parcela_baixas b, p where b.parcela_id = p.noemi),
  'BAIXA,BAIXA junta,DESFEITA,DESFEITA,BAIXA', 'a montagem: a baixa com as custas junto, os dois desfazer e a baixa de novo');
create temp table antes as select * from parcela_baixas;

-- O guardião antes da exclusão: o cliente ativo não troca.
select is((teste.erro($$ update parcela_baixas set explicacao = baixa_explicacao_excluido() where parcela_id = (select claudio from p) $$)) ->> 'codigo', 'TC023',
  'PT-11 F3.193: a explicação de cliente ativo não vira o texto fixo (TC023)');

-- 1. A exclusão de Noemi (com contrato, só possível com o gatilho desligado).
alter table clientes_escritorio disable trigger cliente_excluido_nao_muda;
select pg_temp.excluir(cli.noemi) from cli;
-- Rosa, como se fosse antes da 1132: sem o gatilho novo.
alter table clientes_escritorio disable trigger financeiro_baixas_apagar_do_excluido;
select pg_temp.excluir(cli.rosa) from cli;
alter table clientes_escritorio enable trigger financeiro_baixas_apagar_do_excluido;
alter table clientes_escritorio enable trigger cliente_excluido_nao_muda;

select is((select count(*)::integer from parcela_baixas b, p where b.parcela_id = p.noemi and b.explicacao = 'Explicação apagada a pedido do titular'), 5,
  'PT-11 F3.193: as cinco linhas de Noemi (as BAIXA, a das custas juntas e os DESFEITA) ficam com o texto fixo');
select ok((select bool_and((to_jsonb(b) - 'explicacao') = (to_jsonb(a) - 'explicacao')) from parcela_baixas b join antes a using (id), p where b.parcela_id = p.noemi),
  'PT-11 F3.193: o resto da linha não muda (motivo, valor, custas, quem e quando)');
select ok((select bool_and(b.explicacao = a.explicacao) from parcela_baixas b join antes a using (id), p where b.parcela_id in (p.claudio, p.rosa)),
  'PT-11 F3.193: a baixa de Cláudio, ativo, não muda; a de Rosa, sem o gatilho, também não');
select is((select count(*)::integer from parcela_baixas b, p where b.parcela_id = p.noemi), 5, 'PT-03: nada se apaga');

-- 2. O guardião.
select is((teste.erro($$ update parcela_baixas set explicacao = baixa_explicacao_excluido(), valor = valor + 1 where parcela_id = (select rosa from p) $$)) ->> 'codigo',
  'TC023', 'PT-11 F3.193: o texto fixo junto com outra coluna recusa');
select is((teste.erro($$ update parcela_baixas set explicacao = 'Outro texto qualquer' where parcela_id = (select rosa from p) $$)) ->> 'codigo',
  'TC023', 'PT-11 F3.193: texto diferente do fixo recusa, mesmo no cliente excluído');
select is((teste.erro($$ delete from parcela_baixas where parcela_id = (select rosa from p) $$)) ->> 'codigo', 'TC023', 'PT-03: DELETE recusa');
select is((teste.erro($$ update parcela_baixas set explicacao = baixa_explicacao_excluido() where parcela_id = (select noemi from p) $$)) ->> 'codigo',
  'TC023', 'PT-11 F3.193: a linha já trocada não muda de novo');
select is((select array_agg(tgname::text order by tgname) from pg_trigger where tgrelid = 'parcela_baixas'::regclass and not tgisinternal
             and tgname in ('parcela_baixas_guarda', 'parcela_baixas_so_acrescenta')),
  array['parcela_baixas_guarda'], 'PT-11 F3.193: o guardião próprio está no lugar do financeiro_so_acrescenta');
select ok((select pg_get_triggerdef(oid) like '%BEFORE DELETE OR UPDATE ON public.parcela_baixas FOR EACH ROW%' from pg_trigger where tgname = 'parcela_baixas_guarda'),
  'PT-11 F3.193: o guardião é BEFORE UPDATE OR DELETE');
select ok((select pg_get_triggerdef(oid) like '%AFTER UPDATE OF estado ON public.clientes_escritorio FOR EACH ROW WHEN (((new.estado = ''EXCLUIDO''::text) AND (old.estado <> ''EXCLUIDO''::text)))%'
             from pg_trigger where tgname = 'financeiro_baixas_apagar_do_excluido'),
  'PT-11 F3.193: o gatilho é AFTER UPDATE OF estado, só na passagem a EXCLUIDO (revisão, M2)');

-- 3. As leituras de quem tem o Financeiro: a ficha do contrato, a linha da parcela e "De onde veio".
select ok((select (portal_financeiro_contrato(diego, rm, ct.noemi))::text like '%Explicação apagada a pedido do titular%'
              and (portal_financeiro_contrato(diego, rm, ct.noemi))::text not like '%Dona Rita%' from ids, ct),
  'PT-11 F3.193: a ficha do contrato mostra o texto fixo');
select is((select parcela_linha(r) -> 'baixa' ->> 'explicacao' from recebimentos_previstos r, p where r.id = p.noemi),
  'Explicação apagada a pedido do titular', 'PT-11 F3.193: a parcela como as listas do Financeiro a mostram (parcela_linha) traz o texto fixo');
select ok((select bool_and(x -> 'dados' ->> 'explicacao' = 'Explicação apagada a pedido do titular') from ids, ct, cs,
             jsonb_array_elements(contrato_fechamento_origem(rm, ct.noemi, cs.noemi)) x where x -> 'dados' ? 'explicacao'),
  'PT-11 F3.193 (revisão, m9): "De onde veio" (contrato_fechamento_origem) mostra o texto fixo');

-- 4. Os clientes excluídos antes da 1132 (a 1133): Rosa. O escritório fica só para consulta.
update escritorios set contrato_fim_em = hoje_brasilia() - 1 from ids where escritorios.id = ids.rm;
grant select on ids, cli, p to dominio;
set local role dominio;
create temp table pre1 as select parcela_baixas_preencher_excluidos() j;
create temp table pre2 as select parcela_baixas_preencher_excluidos() j;
create temp table marcas as select coalesce(current_setting('t3jus.fim_da_guarda', true), '') fg, coalesce(current_setting('t3jus.aplicando_prazos', true), '') ap;
reset role;
select is((select j from pre1), jsonb_build_object((select rm from ids)::text, '{"clientes": 1, "baixas": 1}'::jsonb),
  'PT-11 F3.193: o preenchimento acha a baixa de Rosa e conta por escritório, também no escritório só de consulta');
select is((select j from pre2), '{}'::jsonb, 'PT-11 F3.193: rodar de novo não muda nada (idempotente)');
select ok((select fg in ('', 'off') and ap in ('', 'off') from marcas), 'PT-11 F3.193: as marcas da rotina voltam como estavam');
select is((select explicacao from parcela_baixas b, p where b.parcela_id = p.rosa), 'Explicação apagada a pedido do titular',
  'PT-11 F3.193: a explicação de Rosa virou o texto fixo');

-- 5. Inventário e acesso.
select ok((select no_fim like '%A pedido do titular, a explicação vira texto fixo%' and length(no_fim) <= 200 and situacao = 'APROVADO'
             from inventario_dados where tabela = 'parcela_baixas'),
  'PT-11 F3.193 inventário: a explicação vira texto fixo a pedido do titular, em até 200 letras, aprovado');
select ok(not has_function_privilege('service_role', 'parcela_baixas_preencher_excluidos()', 'execute')
          and not has_function_privilege('service_role', 'parcela_baixas_excluido_limpar(uuid,uuid)', 'execute'),
  'PT-02 F3.193: a API não chama o preenchimento nem a troca');

select * from finish();
rollback;
