-- O êxito lançado depois do alvará já nasce pago (1102; F3.199: CH-07, FI-05; usa o resultado da
-- etapa final, EX-08, sem mudá-lo; também PT-01, PT-03, IN-04). Plano F3.194/F3.192/F3.191 v5,
-- Parte A, e desenho D39 aprovados pela Carol em 26/11/2026, com a C2 (o "Não cobrar" recusa com
-- honorários já entrados) e a C3 (a proposta limita os honorários ao que falta do êxito lançado).
begin;
select plan(66);

create function pg_temp.fim() returns void language plpgsql as $$
begin
  set constraints all immediate;
  set constraints caso_pronto_fim, caso_pronto_fim_mudou, caso_pronto_fim_saiu, destinacoes_fecham, caso_fechou_fim deferred;
end $$;

select ajustar_relogio(('2026-10-01 10:00-03'::timestamptz - now()));
create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Larissa Costa') as larissa,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, diego, 'Diego Almeida', array['FINANCEIRO', 'COMERCIAL']),
       portal_convidar(socia, rm, larissa, 'Larissa Costa', array['JURIDICO']) from ids;
select portal_juridico_casos(socia, rm) from ids;
select portal_juridico_casos(intrusa, outro) from ids;

create function pg_temp.cliente(p_nome text, p_tel text) returns uuid language sql as $$
  select (portal_cliente_cadastrar(ids.socia, ids.rm, jsonb_build_object('tipo', 'PF', 'nome', p_nome, 'origem', 'GOOGLE',
    'contatos', jsonb_build_array(jsonb_build_object('nome', p_nome, 'telefone', p_tel, 'principal', true)))) ->> 'id')::uuid from ids
$$;
create function pg_temp.contrato(p_cliente uuid) returns uuid language sql as $$
  select (portal_contrato_criar(ids.socia, ids.rm, jsonb_build_object('clienteId', p_cliente, 'objeto', 'Indenização por vícios na obra',
    'responsavelId', ids.diego, 'advogados', jsonb_build_array(ids.socia),
    'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'EXITO', 'percentual', 3000, 'sobre', 'acordo', 'etapa', 'Encerrado', 'dias', 0)))) ->> 'id')::uuid from ids
$$;

-- Helena (o caso do desenho: o alvará antes do encerramento), Igor (o alvará depois do
-- encerramento e antes da conferência), Joana (paga em parte), Kátia (dois alvarás), Luís (sem
-- alvará), Otávio (o alvará no mês anterior) e Nádia (sem contrato), todos no mesmo caso.
create temp table cli as select
  pg_temp.cliente('Helena Duarte', '+5511984223190') helena, pg_temp.cliente('Igor Duarte', '+5511984223191') igor,
  pg_temp.cliente('Joana Duarte', '+5511984223192') joana, pg_temp.cliente('Kátia Duarte', '+5511984223193') katia,
  pg_temp.cliente('Luís Duarte', '+5511984223194') luis, pg_temp.cliente('Otávio Duarte', '+5511984223195') otavio,
  pg_temp.cliente('Nádia Duarte', '+5511984223196') nadia;
create temp table ct as select pg_temp.contrato(helena) helena, pg_temp.contrato(igor) igor, pg_temp.contrato(joana) joana,
  pg_temp.contrato(katia) katia, pg_temp.contrato(luis) luis, pg_temp.contrato(otavio) otavio from cli;
select portal_contrato_assinatura(socia, rm, x, 1, '2026-10-01') from ids, ct, unnest(array[ct.helena, ct.igor, ct.joana, ct.katia, ct.luis, ct.otavio]) x;
create temp table cs as select (portal_juridico_caso_criar(socia, rm, jsonb_build_object('nome', 'Duarte x Construtora Atlas', 'area', 'CIVEL',
    'etapaId', (select id from etapas where escritorio_id = ids.rm and ordem = 5), 'responsavelId', ids.larissa,
    'clientes', jsonb_build_array(
      jsonb_build_object('clienteId', cli.helena, 'papel', 'AUTOR', 'contratoId', ct.helena),
      jsonb_build_object('clienteId', cli.igor, 'papel', 'AUTOR', 'contratoId', ct.igor),
      jsonb_build_object('clienteId', cli.joana, 'papel', 'AUTOR', 'contratoId', ct.joana),
      jsonb_build_object('clienteId', cli.katia, 'papel', 'AUTOR', 'contratoId', ct.katia),
      jsonb_build_object('clienteId', cli.luis, 'papel', 'AUTOR', 'contratoId', ct.luis),
      jsonb_build_object('clienteId', cli.otavio, 'papel', 'AUTOR', 'contratoId', ct.otavio),
      jsonb_build_object('clienteId', cli.nadia, 'papel', 'AUTOR')))) ->> 'id')::uuid id
  from ids, cli, ct;

-- Registrar pela proposta do contrato (seguiuProposta), com o resto para o cliente.
create function pg_temp.reg(p_cliente uuid, p_valor bigint, p_dia date, p_partes jsonb default null) returns jsonb language sql as $$
  with p as (select coalesce(p_partes, (select coalesce(jsonb_agg(x - 'semLimite'), '[]'::jsonb)
                                           from jsonb_array_elements(repasse_proposta(ids.rm, cs.id, p_cliente, p_valor) -> 'linhas') x)) partes from ids, cs)
  select portal_financeiro_levantamento_registrar(ids.diego, ids.rm, jsonb_build_object('tipo', 'ALVARA', 'casoId', cs.id, 'clienteId', p_cliente,
    'valor', p_valor, 'entrouEm', p_dia, 'exitoBaixadoVisto', '[]'::jsonb,
    'divisao', jsonb_build_array(jsonb_build_object('para', 'CLIENTE',
                 'valor', p_valor - coalesce((select sum((x ->> 'valor')::bigint) from jsonb_array_elements(p.partes) x), 0))) || p.partes))
    from ids, cs, p
$$;
create function pg_temp.prop(p_cliente uuid, p_valor bigint) returns jsonb language sql as $$
  select portal_financeiro_repasse_proposta(ids.diego, ids.rm, jsonb_build_object('casoId', cs.id, 'clienteId', p_cliente, 'valor', p_valor)) from ids, cs
$$;
create function pg_temp.hon(p_lev jsonb) returns uuid language sql as $$
  select id from destinacoes where levantamento_id = (p_lev ->> 'id')::uuid and para = 'HONORARIOS'
$$;
create function pg_temp.exito(p_cliente uuid) returns uuid language sql as $$
  select x.id from exitos_conferir x, cs where x.caso_id = cs.id and x.cliente_id = p_cliente
$$;
create function pg_temp.lancar(p_cliente uuid, p_valor bigint default 480000, p_motivo text default null) returns jsonb language sql as $$
  select portal_financeiro_exito_lancar(ids.diego, ids.rm, pg_temp.exito(p_cliente),
    jsonb_build_object('valor', p_valor, 'vencimento', '2026-12-15', 'forma', 'PIX', 'motivoAjuste', p_motivo)) from ids
$$;
create function pg_temp.pagos(p_parcela uuid) returns jsonb language sql as $$
  select coalesce(jsonb_agg(jsonb_build_array(p.valor, p.recebido_em, p.caixa) order by p.recebido_em, p.criado_em), '[]'::jsonb)
    from pagamentos_recebidos p where p.parcela_id = p_parcela
$$;

-- 20/10: o alvará de Otávio (R$ 10.000,00), com o caso em andamento.
select ajustar_relogio(('2026-10-20 10:00-03'::timestamptz - now()));
create temp table lev as select pg_temp.reg(otavio, 1000000, '2026-10-20') otavio from cli;
select pg_temp.fim();
-- 05/11: o primeiro alvará de Kátia (R$ 6.000,00).
select ajustar_relogio(('2026-11-05 10:00-03'::timestamptz - now()));
alter table lev add column katia1 jsonb;
update lev set katia1 = pg_temp.reg(cli.katia, 600000, '2026-11-05') from cli;
select pg_temp.fim();
-- 12/11: o alvará de Helena (R$ 16.000,00), o segundo de Kátia e o de Joana (R$ 10.000,00 cada).
select ajustar_relogio(('2026-11-12 11:47-03'::timestamptz - now()));
create temp table prop_sem as select pg_temp.prop(helena, 1600000) v from cli;
alter table lev add column helena jsonb, add column katia2 jsonb, add column joana jsonb;
update lev set helena = pg_temp.reg(cli.helena, 1600000, '2026-11-12'), katia2 = pg_temp.reg(cli.katia, 1000000, '2026-11-12'),
               joana = pg_temp.reg(cli.joana, 1000000, '2026-11-12') from cli;
select pg_temp.fim();
-- 13/11: os honorários de Helena vão para o caixa do escritório.
select ajustar_relogio(('2026-11-13 15:02-03'::timestamptz - now()));
select portal_financeiro_destinacao_feita(diego, rm, pg_temp.hon(lev.helena), '{"feitoEm": "2026-11-13"}') from ids, lev;
-- 17/11, às 16h40: Marina encerra o caso com Acordo; o êxito de cada um vai para conferir.
select ajustar_relogio(('2026-11-17 16:40-03'::timestamptz - now()));
select portal_juridico_caso_etapa(larissa, rm, cs.id, (select versao from casos where id = cs.id), jsonb_build_object(
  'etapaId', (select id from etapas where escritorio_id = ids.rm and final), 'motivo', 'Acordo homologado', 'resultado', 'ACORDO',
  'previstoEm', '2026-12-15', 'valores', jsonb_build_object(cli.helena, 1600000, cli.igor, 1600000, cli.joana, 1600000, cli.katia, 1600000,
                                                            cli.luis, 1600000, cli.otavio, 1000000))) from ids, cs, cli;
-- 18/11, às 10h: o alvará de Igor, com o êxito para conferir.
select ajustar_relogio(('2026-11-18 10:00-03'::timestamptz - now()));
create temp table prop_conf as select pg_temp.prop(igor, 1600000) v from cli;
alter table lev add column igor jsonb;
update lev set igor = pg_temp.reg(cli.igor, 1600000, '2026-11-18') from cli;
select pg_temp.fim();
-- Hoje: quarta-feira, 18/11/2026, às 10h20. Diego confere.
select ajustar_relogio(('2026-11-18 10:20-03'::timestamptz - now()));
create temp table receb_antes as select portal_financeiro_receber(diego, rm) -> 'totais' v from ids;
create temp table caixa_antes as select caixa_entradas(rm, '2026-11-01', '2026-11-30') v from ids;

-- ---------------------------------------------------------------------------------------
-- 13. A situação do êxito na proposta: SEM_CONFERENCIA e PARA_CONFERIR (os outros, abaixo).
select is((select v -> 'exitoSituacao' from prop_sem), '{"situacao": "SEM_CONFERENCIA"}'::jsonb,
  'CH-07: com o caso em andamento, a proposta diz SEM_CONFERENCIA');
select is((select v -> 'exitoSituacao' from prop_conf), '{"situacao": "PARA_CONFERIR", "calculado": 480000}'::jsonb,
  'CH-07: com o êxito para conferir, PARA_CONFERIR com o calculado');
select is((select pg_temp.prop(nadia, 1000000) -> 'exitoSituacao' from cli), 'null'::jsonb, 'sem contrato com êxito, exitoSituacao é null');
select is((select jsonb_build_array(v -> 'linhas' -> 0 ->> 'valor', v -> 'linhas' -> 0 -> 'semLimite') from prop_conf), '["480000", null]'::jsonb,
  'C3: sem êxito lançado, os honorários não são limitados (sem semLimite)');

-- ---------------------------------------------------------------------------------------
-- 8. A linha do êxito traz os honorários que já entraram.
select is((select jsonb_build_array(x -> 'honorariosAlvaraTotal', x -> 'honorariosAlvara' -> 0 -> 'livre', x -> 'honorariosAlvara' -> 0 ->> 'tipo',
                                    x -> 'honorariosAlvara' -> 0 ->> 'entrouEm', x -> 'honorariosAlvara' -> 0 ->> 'levantamentoId')
             from ids, lateral jsonb_array_elements(portal_financeiro_exitos(ids.diego, ids.rm) -> 'itens') x, cli
            where x -> 'cliente' ->> 'id' = cli.helena::text),
  (select jsonb_build_array(480000, 480000, 'ALVARA', '2026-11-12', lev.helena ->> 'id') from lev),
  'CH-07: o êxito de Helena para conferir traz os honorários do alvará de 12/11');
select is((select jsonb_array_length(x -> 'honorariosAlvara') from ids, lateral jsonb_array_elements(portal_financeiro_exitos(ids.diego, ids.rm) -> 'itens') x, cli
            where x -> 'cliente' ->> 'id' = cli.katia::text), 2, 'os dois alvarás de Kátia, do mais antigo para o mais novo');
select is((select x -> 'honorariosAlvara' from ids, lateral jsonb_array_elements(portal_financeiro_exitos(ids.diego, ids.rm) -> 'itens') x, cli
            where x -> 'cliente' ->> 'id' = cli.luis::text), '[]'::jsonb, 'sem alvará, a lista vem vazia');

-- ---------------------------------------------------------------------------------------
-- 9. C2: o "Não cobrar" com honorários livres recusa, e nada muda.
select is((teste.erro($$ select portal_financeiro_exito_nao_cobrar(ids.diego, ids.rm, pg_temp.exito(cli.helena),
    '{"motivo": "PERDOADO", "explicacao": "Renegociado com a cliente"}') from ids, cli $$)) -> 'detalhe' ->> 'motivo',
  'HONORARIOS_JA_ENTRARAM', 'CH-07 (C2): com os honorários já entrados, o "Não cobrar" recusa');
select is((select situacao from exitos_conferir where id = (select pg_temp.exito(helena) from cli)), 'PARA_CONFERIR', 'e o êxito continua para conferir');
savepoint nao_cobrar;
select is((select portal_financeiro_exito_nao_cobrar(diego, rm, pg_temp.exito(cli.luis), '{"motivo": "PERDOADO", "explicacao": "Renegociado com o cliente"}') ->> 'situacao'
             from ids, cli), 'NAO_COBRADO', 'sem honorários do alvará, o "Não cobrar" continua');
select is((select pg_temp.prop(luis, 1000000) -> 'exitoSituacao' from cli), '{"situacao": "NAO_COBRADO"}'::jsonb, 'e a proposta diz NAO_COBRADO');
rollback to savepoint nao_cobrar;

-- ---------------------------------------------------------------------------------------
-- 2 e 1. O alvará antes do encerramento (Helena): lançar R$ 4.800,00 dá a parcela paga.
create temp table lh as select pg_temp.lancar(helena) v from cli;
create temp table ph as select (v -> 'parcela' ->> 'id')::uuid id from lh;
select is((select v -> 'parcela' ->> 'situacao' from lh), 'PAGA', 'CH-07, FI-05: a parcela do êxito de Helena nasce paga');
select is((select pg_temp.pagos(id) from ph), '[[480000, "2026-11-12", "TERCEIROS"]]'::jsonb,
  'FI-05: por um recebimento TERCEIROS no dia em que o alvará entrou');
select is((select destinacao_id from pagamentos_recebidos p, ph where p.parcela_id = ph.id), (select pg_temp.hon(helena) from lev),
  'ligado à parte de honorários do alvará');
select is((select jsonb_build_array(v -> 'parcela' ->> 'pagaEm', v -> 'parcela' -> 'baixaAlvara' -> 0 ->> 'entrouEm', v -> 'parcela' -> 'baixaAlvara' -> 0 ->> 'valor') from lh),
  '["2026-11-12", "2026-11-12", "480000"]'::jsonb, 'a parcela diz pagaEm e a origem "da divisão do alvará de 12/11"');
select is((select v -> 'pagoPeloAlvara' from lh), (select jsonb_build_array(jsonb_build_object('levantamentoId', helena ->> 'id', 'tipo', 'ALVARA', 'entrouEm', '2026-11-12', 'valor', 480000)) from lev),
  'a resposta traz pagoPeloAlvara, para a confirmação');
select ok((select not exists (select 1 from ids, ph, relatorio_abertas(ids.rm, '2026-11-18') a where a.parcela_id = ph.id)), 'FI-05: a parcela não está em A receber');
select ok((select not exists (select 1 from jsonb_array_elements(portal_financeiro_receber(ids.diego, ids.rm) -> 'itens') i, ph where i ->> 'id' = ph.id::text) from ids),
  'nem na lista de A receber');
select ok((select not exists (select 1 from jsonb_array_elements(inicio_financeiro_escritorio(socia, rm, 'EQUIPE')) i, ph where i ->> 'id' = ph.id::text) from ids),
  'nem no Início');
select is((select x ->> 'situacao' from ids, ph, ct, jsonb_array_elements(portal_carne_opcoes(ids.diego, ids.rm, ct.helena, 'FINANCEIRO') -> 'parcelas') x
            where x ->> 'id' = ph.id::text), 'PAGA', 'e no carnê ela aparece paga, sem cobrança');
select ok((select not exists (select 1 from jsonb_array_elements(caso_acerto(rm, cs.id) -> 'pendencias') j, ph where j::text like '%' || ph.id || '%') from ids, cs),
  'nem como pendência do acerto do caso');
select is((select (dados ->> 'pelaConferencia') || ' ' || (dados ->> 'destinacao') from historico h, ph where h.acao = 'financeiro.recebimento' and h.entidade_id = ph.id::text),
  (select 'true ' || pg_temp.hon(helena) from lev), 'PT-03: o recebimento fica no histórico da parcela, pela conferência');
create temp table hl as select h.* from historico h, lev where h.acao = 'financeiro.levantamento_exito_lancado_depois' and h.entidade_id = lev.helena ->> 'id';
select is((select jsonb_build_array(dados ->> 'parcela', dados ->> 'valor', dados ->> 'contrato', autor_id) from hl),
  (select jsonb_build_array(ph.id, '480000', (select numero from contratos where id = ct.helena), ids.diego) from ph, ct, ids),
  'PT-03: o histórico do repasse guarda a parcela, o valor, o contrato e quem lançou (pelo id)');
select is((select h -> 'dados' ->> 'valor' from ids, lev, jsonb_array_elements(portal_financeiro_repasse(ids.socia, ids.rm, (lev.helena ->> 'id')::uuid) -> 'historico') h
            where h ->> 'acao' = 'financeiro.levantamento_exito_lancado_depois'), '480000', 'e a ficha do repasse mostra a linha');
select is((select pg_temp.prop(helena, 500000) -> 'exitoSituacao' from cli), '{"situacao": "PAGO", "valor": 480000, "falta": 0, "pagoEm": "2026-11-12"}'::jsonb,
  'CH-07: com tudo pago, a proposta diz PAGO, com o dia do pagamento');

-- 15. pagou, na linha da parte (o lançar depois do alvará).
select is((select d -> 'pagou' from ids, lev, jsonb_array_elements(portal_financeiro_repasse(ids.socia, ids.rm, (lev.helena ->> 'id')::uuid) -> 'destinacoes') d
            where d ->> 'para' = 'HONORARIOS'),
  (select jsonb_build_array(jsonb_build_object('parcelaId', ph.id, 'descricao', 'Êxito · Duarte x Construtora Atlas', 'valor', 480000,
                                              'lancadaEm', r.criado_em, 'pagaEm', '2026-11-12', 'contrato', c.numero, 'lancadaPor', pessoa_ref(ids.diego)))
     from ph, ids, recebimentos_previstos r join contratos c on c.id = r.contrato_id where r.id = ph.id),
  'FI-05: a parte de honorários diz que pagou a parcela, lançada hoje por Diego');
select is((select d -> 'pagou' from ids, lev, jsonb_array_elements(portal_financeiro_repasse(ids.socia, ids.rm, (lev.helena ->> 'id')::uuid) -> 'destinacoes') d
            where d ->> 'para' = 'CLIENTE'), 'null'::jsonb, 'a parte do cliente não pagou nada');
select ok((select levantamento_linha(l) -> 'destinacoes' -> 0 ? 'pagou' from levantamentos l, lev where l.id = (lev.helena ->> 'id')::uuid),
  'o Início e a fila da prestação (levantamento_linha) recebem o campo');

-- 16. "Recebido no mês" soma o pagamento de 12/11; "Em aberto" não muda.
select is((select portal_financeiro_receber(diego, rm) -> 'totais' -> 'recebidoMes' from ids),
  (select jsonb_build_object('valor', (v -> 'recebidoMes' ->> 'valor')::bigint + 480000, 'n', (v -> 'recebidoMes' ->> 'n')::integer + 1) from receb_antes),
  'IN-04: "Recebido em novembro" soma os R$ 4.800,00 e a parcela');
select is((select portal_financeiro_receber(diego, rm) -> 'totais' -> 'aberto' from ids), (select v -> 'aberto' from receb_antes),
  '"Em aberto" não muda: a parcela nasce paga');

-- 10. Relatórios: os honorários contam uma vez em Entrou; o recebimento TERCEIROS fica fora do Caixa.
select is((select coalesce(sum(e.valor), 0)::bigint from ids, cli, relatorio_entradas(ids.rm, '2026-11-01', '2026-11-30') e where e.cliente_id = cli.helena),
  480000::bigint, 'IN-04: depois da transferência, os honorários de Helena entram uma vez em "Entrou"');
select is((select caixa_entradas(rm, '2026-11-01', '2026-11-30') from ids), (select v from caixa_antes), 'e o Caixa não conta o recebimento TERCEIROS');

-- 6. O "Dispensar" depois de pagar pelo lançar recusa (BAIXOU_EXITO); a trava vem antes da conferência.
select is((teste.erro($$ select portal_financeiro_destinacao_dispensar(ids.diego, ids.rm, pg_temp.hon(lev.igor), 'Não vamos cobrar')
    from ids, lev where pg_temp.lancar((select igor from cli)) is not null $$)) -> 'detalhe' ->> 'motivo', 'BAIXOU_EXITO',
  'FI-05: a parte que pagou o êxito no lançar não se dispensa');
select ok((select strpos(prosrc, 'for update') between 1 and strpos(prosrc, 'if exists (select 1 from pagamentos_recebidos') from pg_proc
            where oid = 'portal_financeiro_destinacao_dispensar(uuid,uuid,uuid,text)'::regprocedure),
  'o "Dispensar" trava a parte antes de conferir o pagamento (a corrida com o lançar)');

-- 1. O alvará depois do encerramento e antes da conferência (Igor): o mesmo resultado.
savepoint igor;
create temp table li as select pg_temp.lancar(igor) v from cli;
select is((select jsonb_build_array(v -> 'parcela' ->> 'situacao', pg_temp.pagos((v -> 'parcela' ->> 'id')::uuid)) from li),
  '["PAGA", [[480000, "2026-11-18", "TERCEIROS"]]]'::jsonb, 'CH-07: o alvará depois do encerramento também paga a parcela lançada');
rollback to savepoint igor;

-- ---------------------------------------------------------------------------------------
-- 4. Honorários maiores que o lançado: a parcela fica paga, e sobram R$ 1.800,00 na parte.
savepoint maior;
select ajustar_relogio(('2026-11-18 10:25-03'::timestamptz - now()));
select portal_financeiro_destinacao_feita(diego, rm, pg_temp.hon(lev.igor), '{"feitoEm": "2026-11-18"}') from ids, lev;
create temp table lm as select pg_temp.lancar(igor, 300000, 'A cliente abriu mão dos danos morais') v from cli;
select is((select jsonb_build_array(v -> 'parcela' ->> 'situacao', pg_temp.pagos((v -> 'parcela' ->> 'id')::uuid)) from lm),
  '["PAGA", [[300000, "2026-11-18", "TERCEIROS"]]]'::jsonb, 'CH-07: lançado R$ 3.000,00 com R$ 4.800,00 de honorários, a parcela fica paga');
select is((select sum(livre)::bigint from ids, cs, cli, exito_honorarios_livres(ids.rm, cs.id, cli.igor)), 180000::bigint,
  'e sobram R$ 1.800,00 na parte de honorários (a devolução é a F3.197)');
rollback to savepoint maior;

-- 5. A parte dispensada não paga nada.
savepoint dispensada;
select portal_financeiro_destinacao_dispensar(diego, rm, pg_temp.hon(lev.igor), 'Combinado com o cliente') from ids, lev;
create temp table ld as select pg_temp.lancar(igor) v from cli;
select is((select jsonb_build_array(v -> 'parcela' ->> 'situacao', v -> 'pagoPeloAlvara', pg_temp.pagos((v -> 'parcela' ->> 'id')::uuid)) from ld),
  '["A_VENCER", [], []]'::jsonb, 'FI-05: com a parte de honorários dispensada, a parcela nasce aberta');
rollback to savepoint dispensada;

-- ---------------------------------------------------------------------------------------
-- 3. Paga em parte (Joana): R$ 3.000,00 de honorários e R$ 4.800,00 lançados.
create temp table lj as select pg_temp.lancar(joana) v from cli;
create temp table pj as select (v -> 'parcela' ->> 'id')::uuid id from lj;
select is((select jsonb_build_array(v -> 'parcela' ->> 'situacao', pg_temp.pagos(pj.id)) from lj, pj),
  '["PARCIAL", [[300000, "2026-11-12", "TERCEIROS"]]]'::jsonb, 'CH-07: R$ 3.000,00 pagos pelo alvará');
select is((select a.falta from ids, pj, relatorio_abertas(ids.rm, '2026-11-18') a where a.parcela_id = pj.id), 180000::bigint,
  'FI-05: e R$ 1.800,00 ficam em A receber');
select is((select pg_temp.prop(joana, 1000000) -> 'exitoSituacao' from cli), '{"situacao": "LANCADO", "valor": 480000, "falta": 180000}'::jsonb,
  'CH-07: a proposta diz LANCADO, com o que falta');
select is((select d -> 'pagou' -> 0 -> 'valor' from ids, lev, jsonb_array_elements(portal_financeiro_repasse(ids.socia, ids.rm, (lev.joana ->> 'id')::uuid) -> 'destinacoes') d
            where d ->> 'para' = 'HONORARIOS'), '300000'::jsonb, 'FI-05: e a parte diz que pagou R$ 3.000,00');

-- 14. C3: o segundo alvará de Joana (R$ 10.000,00) fica limitado ao que falta.
create temp table pl as select pg_temp.prop(joana, 1000000) v from cli;
select is((select jsonb_build_array(v -> 'linhas' -> 0 -> 'valor', v -> 'linhas' -> 0 -> 'semLimite', v -> 'cliente') from pl), '[180000, 300000, 820000]'::jsonb,
  'FI-05 (C3): a linha fica nos R$ 1.800,00 que faltam, com semLimite = R$ 3.000,00, e Joana com R$ 8.200,00');
select ok((select v -> 'linhas' -> 0 ->> 'regra' like '30% · acordo · contrato % · até o que falta do êxito' from pl), 'C3: a regra diz "até o que falta do êxito"');
select is((select requisicao_parte(rm, cs.id, cli.joana, 1000000) ->> 'valor' from ids, cs, cli), '180000', 'C3: a parte do escritório no "A caminho" segue o limite');
select is((select jsonb_build_array(v -> 'linhas' -> 0 -> 'valor', v -> 'linhas' -> 0 -> 'semLimite') from cli, lateral (select pg_temp.prop(joana, 500000) v) p),
  '[150000, null]'::jsonb, 'C3: com os 30% abaixo do que falta (R$ 1.500,00), não há limite nem semLimite');
savepoint segundo;
select ajustar_relogio(('2026-11-18 10:30-03'::timestamptz - now()));
create temp table lj2 as select pg_temp.reg(joana, 1000000, '2026-11-18') v from cli;
select pg_temp.fim();
select is((select dados ->> 'seguiuProposta' from historico h, lj2 where h.acao = 'financeiro.levantamento' and h.entidade_id = lj2.v ->> 'id'), 'true',
  'C3: registrar pela proposta limitada fica seguiuProposta = true');
select is((select jsonb_build_array(r.situacao, pg_temp.pagos(pj.id) -> 1 -> 0) from pj, lateral (select parcela_linha(x) ->> 'situacao' situacao from recebimentos_previstos x where x.id = pj.id) r),
  '["PAGA", 180000]'::jsonb, 'e a divisão paga o resto da parcela (0651)');
select is((select pg_temp.prop(joana, 500000) -> 'linhas' from cli), '[]'::jsonb, 'C3: com o êxito pago, o alvará seguinte vem sem honorários');
select is((select pg_temp.prop(joana, 500000) -> 'cliente' from cli), '500000'::jsonb, 'e Joana fica com tudo');
rollback to savepoint segundo;
select is((select pg_temp.prop(helena, 500000) -> 'linhas' from cli), '[]'::jsonb, 'C3: o segundo alvará de Helena, com o êxito pago, vem sem honorários');

-- ---------------------------------------------------------------------------------------
-- 7. Dois alvarás (Kátia): pagam na ordem em que entraram.
create temp table lk as select pg_temp.lancar(katia) v from cli;
select is((select jsonb_build_array(v -> 'parcela' ->> 'situacao', pg_temp.pagos((v -> 'parcela' ->> 'id')::uuid)) from lk),
  '["PAGA", [[180000, "2026-11-05", "TERCEIROS"], [300000, "2026-11-12", "TERCEIROS"]]]'::jsonb,
  'CH-07: R$ 1.800,00 do alvará de 05/11 e R$ 3.000,00 do de 12/11');
select is((select jsonb_agg(jsonb_build_array(x ->> 'entrouEm', x -> 'valor') order by o) from lk, jsonb_array_elements(v -> 'pagoPeloAlvara') with ordinality t(x, o)),
  '[["2026-11-05", 180000], ["2026-11-12", 300000]]'::jsonb, 'e o pagoPeloAlvara lista os dois, do mais antigo');
select is((select jsonb_build_array((select destinacao_linha(d) -> 'pagou' -> 0 -> 'valor' from destinacoes d where d.id = pg_temp.hon(lev.katia1)),
                                    (select destinacao_linha(d) -> 'pagou' -> 0 -> 'valor' from destinacoes d where d.id = pg_temp.hon(lev.katia2))) from lev),
  '[180000, 300000]'::jsonb, 'FI-05: cada parte diz o que pagou');

-- 16b. O alvará no mês anterior (Otávio, 20/10): a parcela paga não soma em novembro.
create temp table receb_ot as select portal_financeiro_receber(diego, rm) -> 'totais' v from ids;
create temp table lo as select pg_temp.lancar(otavio, 300000) v from cli;
select is((select pg_temp.pagos((v -> 'parcela' ->> 'id')::uuid) from lo), '[[300000, "2026-10-20", "TERCEIROS"]]'::jsonb,
  'o êxito de Otávio é pago pelo alvará de 20/10');
select is((select portal_financeiro_receber(diego, rm) -> 'totais' -> 'recebidoMes' from ids), (select v -> 'recebidoMes' from receb_ot),
  'IN-04: com o alvará no mês anterior, "Recebido em novembro" não muda');

-- ---------------------------------------------------------------------------------------
-- 11. Regressão: sem alvará, o lançar continua igual; o alvará depois do lançar paga pela 0651.
create temp table ll as select pg_temp.lancar(luis) v from cli;
select is((select jsonb_build_array(v -> 'parcela' ->> 'situacao', v -> 'pagoPeloAlvara', v -> 'honorariosAlvara') from ll), '["A_VENCER", [], []]'::jsonb,
  'sem alvará, a parcela de Luís nasce aberta, como antes');
create temp table lv as select pg_temp.reg(luis, 1600000, '2026-11-18') v from cli;
select pg_temp.fim();
select is((select parcela_linha(r) ->> 'situacao' from recebimentos_previstos r, ll where r.id = (ll.v -> 'parcela' ->> 'id')::uuid), 'PAGA',
  'FI-05: o alvará depois do lançar paga a parcela pela 0651');
select is((select destinacao_linha(d) -> 'pagou' -> 0 -> 'valor' from destinacoes d, lv where d.id = pg_temp.hon(lv.v)), '480000'::jsonb,
  'e a parte traz pagou, como no outro caminho');
select ok((select not exists (select 1 from historico h, lv where h.acao = 'financeiro.levantamento_exito_lancado_depois' and h.entidade_id = lv.v ->> 'id')),
  'sem a linha do histórico do lançar depois (ela é só do primeiro caminho)');
select is((select pg_temp.prop(luis, 1000000) -> 'exitoSituacao' ->> 'situacao' from cli), 'PAGO', 'e a situação passa a PAGO');

-- ---------------------------------------------------------------------------------------
-- 12. Isolamento (PT-01): o outro escritório não vê nem lança o que é do Ribeiro & Matos.
select is((select count(*)::integer from ids, cs, cli, exito_honorarios_livres(ids.outro, cs.id, cli.katia)), 0,
  'PT-01: exito_honorarios_livres filtra o escritório');
select is((select exito_situacao(outro, cs.id, cli.helena) from ids, cs, cli), null::jsonb, 'PT-01: exito_situacao filtra o escritório');
select is((select destinacao_pagou(d) from destinacoes d, lev where d.id = pg_temp.hon(lev.helena)
            and not exists (select 1 from pagamentos_recebidos p where p.destinacao_id = d.id and p.escritorio_id = d.escritorio_id)), null,
  'PT-01: destinacao_pagou lê só os pagamentos do escritório da parte');
select is((teste.erro($$ select portal_financeiro_exito_lancar(ids.intrusa, ids.outro, pg_temp.exito(cli.igor), '{"valor": 480000, "vencimento": "2026-12-15"}') from ids, cli $$)) ->> 'codigo',
  'TC404', 'PT-01: o êxito do outro escritório não é encontrado');
select is((teste.erro($$ select portal_financeiro_exito_lancar(ids.intrusa, ids.rm, pg_temp.exito(cli.igor), '{"valor": 480000, "vencimento": "2026-12-15"}') from ids, cli $$)) ->> 'codigo',
  'TC401', 'PT-01: quem não é do escritório não lança');

select * from finish();
rollback;
