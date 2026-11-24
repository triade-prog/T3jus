-- Baixa de parcela vencida sem receber, com motivo (1010; F3.139: FI-24, FI-25, FI-08, EX-16; também
-- FI-02, FI-04, IN-04, IN-07, PT-01, PT-02, PT-03). Um teste por nota que bloqueava na revisão:
--   1. régua: a execução no meio da espera termina FICOU_DE_FORA e nada sai, nunca "Pagou";
--   2. Contratos sem Financeiro não recebe o motivo nem quem fez;
--   3. parcela paga em parte e depois baixada mantém o recebido no acerto, no quadro e em
--      "Recebido no mês";
--   4. correção do "Não foi paga" baixada: não nasce uma segunda correção, o desfazer funciona e
--      o "Foi paga, sim" recusa com PARCELA_BAIXADA;
-- e o relatório (baixa em outubro, desfeita em dezembro, o fim de outubro não muda).
begin;
select plan(75);

select ajustar_relogio(('2026-05-28 10:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Bianca Torres') as bianca,
  teste.pessoa('Felipe Matos') as felipe,
  teste.pessoa('Larissa Costa') as larissa,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, diego, 'Diego Almeida', array['FINANCEIRO', 'COMERCIAL']),
       portal_convidar(socia, rm, bianca, 'Bianca Torres', array['FINANCEIRO']),
       portal_convidar(socia, rm, felipe, 'Felipe Matos', array['CONTRATOS', 'COMERCIAL', 'JURIDICO']),
       portal_convidar(socia, rm, larissa, 'Larissa Costa', array['JURIDICO']) from ids;

-- ---------------------------------------------------------------------------------------
-- Ajudantes.
create function pg_temp.fim() returns void language plpgsql as $$
begin
  set constraints all immediate;
  set constraints caso_pronto_fim, caso_pronto_fim_mudou, caso_pronto_fim_saiu, destinacoes_fecham deferred;
end $$;
create function pg_temp.cliente(p_nome text, p_tel text) returns uuid language sql as $$
  select (portal_cliente_cadastrar(ids.socia, ids.rm, jsonb_build_object('tipo', 'PF', 'nome', p_nome, 'origem', 'GOOGLE',
    'contatos', jsonb_build_array(jsonb_build_object('nome', p_nome, 'telefone', p_tel, 'principal', true)))) ->> 'id')::uuid from ids
$$;
create function pg_temp.contrato(p_cliente uuid, p_objeto text, p_condicoes jsonb) returns uuid language sql as $$
  select (portal_contrato_criar(ids.socia, ids.rm, jsonb_build_object('clienteId', p_cliente, 'objeto', p_objeto,
    'responsavelId', ids.felipe, 'advogados', jsonb_build_array(ids.socia), 'condicoes', p_condicoes)) ->> 'id')::uuid from ids
$$;
create function pg_temp.caso(p_nome text, p_clientes jsonb) returns uuid language sql as $$
  select (portal_juridico_caso_criar(ids.socia, ids.rm, jsonb_build_object('nome', p_nome, 'area', 'CIVEL',
    'etapaId', (select id from etapas where escritorio_id = ids.rm and ordem = 5), 'responsavelId', ids.larissa,
    'clientes', p_clientes)) ->> 'id')::uuid from ids
$$;
create function pg_temp.pagar(p_parcela uuid, p_dia text, p_valor bigint default null) returns jsonb language sql as $$
  select portal_financeiro_receber_registrar_recibo(ids.diego, ids.rm, p_parcela,
    jsonb_build_object('valor', coalesce(p_valor, (select valor from recebimentos_previstos where id = p_parcela)), 'recebidoEm', p_dia, 'forma', 'PIX')) from ids
$$;
create function pg_temp.parcela(p_contrato uuid, p_descricao text) returns uuid language sql as $$
  select id from recebimentos_previstos where contrato_id = p_contrato and descricao = p_descricao
$$;
create function pg_temp.dados(p_motivo text, p_expl text, p_falta bigint, p_reembolso boolean default false) returns jsonb language sql as $$
  select jsonb_build_object('motivo', p_motivo, 'explicacao', p_expl, 'falta', p_falta, 'reembolso', p_reembolso)
$$;
select portal_juridico_casos(socia, rm) from ids;

-- Os casos fictícios do desenho: Noemi (6 × R$ 1.000,00, a 6/6 vencida em 10/11) e Cláudio no
-- caso perdido "Carvalho x Construtora Lume"; Sebastião com 6 mensalidades de R$ 900,00 (a de
-- outubro paga em parte); Rosa, com parcelas pagas antes do T3jus; Tomás, para o relatório; e a
-- Construtora, para a régua da parcela cancelada por mudança de condição.
create temp table cli as select
  pg_temp.cliente('Noemi Bastos Carvalho', '+5511984223170') noemi,
  pg_temp.cliente('Cláudio Carvalho', '+5511984223171') claudio,
  pg_temp.cliente('Sebastião Lopes', '+5511984223172') seb,
  pg_temp.cliente('Rosa Almeida', '+5511984223173') rosa,
  pg_temp.cliente('Tomás Reis', '+5511984223174') tomas,
  pg_temp.cliente('Construtora Vale Alto', '+5511984223175') con;
create temp table ct as select
  pg_temp.contrato(cli.noemi, 'Vício construtivo', jsonb_build_array(
    jsonb_build_object('tipo', 'PARCELADO', 'total', 600000, 'parcelas', 6, 'primeiro', '2026-06-10'))) noemi,
  pg_temp.contrato(cli.claudio, 'Vício construtivo', jsonb_build_array(jsonb_build_object('tipo', 'FIXO', 'valor', 150000, 'vencimento', '2026-06-02'))) claudio,
  pg_temp.contrato(cli.seb, 'Indenização', jsonb_build_array(jsonb_build_object('tipo', 'MENSAL', 'valor', 90000, 'primeiro', '2026-08-05', 'meses', 6))) seb,
  pg_temp.contrato(cli.rosa, 'Aposentadoria', jsonb_build_array(
    jsonb_build_object('tipo', 'PARCELADO', 'total', 240000, 'parcelas', 3, 'primeiro', '2026-09-10'))) rosa,
  pg_temp.contrato(cli.tomas, 'Cobrança', jsonb_build_array(jsonb_build_object('tipo', 'FIXO', 'valor', 50000, 'vencimento', '2026-09-01'))) tomas,
  pg_temp.contrato(cli.con, 'Assessoria', jsonb_build_array(jsonb_build_object('tipo', 'FIXO', 'valor', 180000, 'vencimento', '2026-11-15'))) con
  from cli;
select portal_contrato_assinatura(socia, rm, x, 1, '2026-05-28')
  from ids, ct, unnest(array[ct.noemi, ct.claudio, ct.seb, ct.rosa, ct.tomas, ct.con]) x;
create temp table cs as select
  pg_temp.caso('Carvalho x Construtora Lume', jsonb_build_array(
    jsonb_build_object('clienteId', cli.noemi, 'papel', 'AUTOR', 'contratoId', ct.noemi),
    jsonb_build_object('clienteId', cli.claudio, 'papel', 'AUTOR', 'contratoId', ct.claudio))) a,
  pg_temp.caso('Lopes x Transportadora Rota Sul', jsonb_build_array(jsonb_build_object('clienteId', cli.seb, 'papel', 'AUTOR', 'contratoId', ct.seb))) seb
  from cli, ct;
create temp table p as select
  pg_temp.parcela(ct.noemi, 'Parcela 6 de 6') noemi6,
  (select id from recebimentos_previstos where contrato_id = ct.seb order by vencimento offset 2 limit 1) seb_out,
  (select id from recebimentos_previstos where contrato_id = ct.seb order by vencimento offset 3 limit 1) seb_nov,
  (select id from recebimentos_previstos where contrato_id = ct.seb order by vencimento offset 4 limit 1) seb_dez,
  pg_temp.parcela(ct.tomas, 'Fixo') tomas,
  pg_temp.parcela(ct.con, 'Fixo') con
  from ct;

-- As custas adiantadas: as de Noemi (R$ 412,30) voltam com a 6/6, a última; as de Sebastião
-- (R$ 86,40) com a mensalidade de outubro.
select ajustar_relogio(('2026-06-05 10:00-03'::timestamptz - now()));
create temp table cp as select
  (portal_financeiro_conta_lancar(diego, rm, jsonb_build_object('descricao', 'Custas iniciais e diligência do oficial', 'categoria', 'CUSTAS',
     'valor', 41230, 'vencimento', '2026-06-05', 'adiantada', true, 'clienteId', cli.noemi, 'casoId', cs.a, 'reembolsoComo', 'PROXIMA_PARCELA')) ->> 'id')::uuid noemi
  from ids, cli, cs;
select ajustar_relogio(('2026-09-20 10:00-03'::timestamptz - now()));
alter table cp add column seb uuid;
update cp set seb = (portal_financeiro_conta_lancar(diego, rm, jsonb_build_object('descricao', 'Cópias e autenticações', 'categoria', 'CUSTAS',
     'valor', 8640, 'vencimento', '2026-09-20', 'adiantada', true, 'clienteId', cli.seb, 'casoId', cs.seb, 'reembolsoComo', 'PROXIMA_PARCELA')) ->> 'id')::uuid
  from ids, cli, cs;

-- Relatório (IN-04, IN-07): a parcela de Tomás, vencida em 01/09, tem baixa em 15/10.
select ajustar_relogio(('2026-10-15 10:00-03'::timestamptz - now()));
select portal_financeiro_parcela_baixar(socia, rm, p.tomas, pg_temp.dados('INADIMPLENCIA', 'Tomás sumiu; não vamos cobrar', 50000)) from ids, p;
select ok((select not exists (select 1 from relatorio_abertas(rm, '2026-10-31') where parcela_id = p.tomas)
              and exists (select 1 from relatorio_abertas(rm, '2026-10-01') where parcela_id = p.tomas) from ids, p),
  'IN-04: a parcela não está aberta no fim de outubro, baixada; no começo de outubro, estava');

-- As automações e o WhatsApp, ligados em 01/11 (a régua só pega o que vence depois).
select ajustar_relogio(('2026-11-01 10:00-03'::timestamptz - now()));
select portal_automacoes(socia, rm) from ids;
select whatsapp_meta_ligou(rm, socia, '{"telefone":"+5511974052210","nomeExibicao":"Ribeiro & Matos"}') from ids;

-- Os pagamentos, o encerramento do caso e a parcela de Rosa que volta pelo "Não foi paga".
select ajustar_relogio(('2026-11-06 10:00-03'::timestamptz - now()));
select pg_temp.pagar(pg_temp.parcela(ct.noemi, 'Parcela ' || n || ' de 6'), '2026-' || lpad((5 + n)::text, 2, '0') || '-10') from ct, generate_series(1, 5) n;
select pg_temp.pagar(pg_temp.parcela(ct.claudio, 'Fixo'), '2026-06-02') from ct;
select pg_temp.pagar(r.id, r.vencimento::text) from ct, recebimentos_previstos r where r.contrato_id = ct.seb and r.vencimento < '2026-10-01';
select pg_temp.pagar(p.seb_out, '2026-11-03', 40000), pg_temp.pagar(p.seb_nov, '2026-11-05') from p;
select portal_juridico_caso_etapa(larissa, rm, cs.a, (select versao from casos where id = cs.a),
  jsonb_build_object('etapaId', (select id from etapas where escritorio_id = ids.rm and final), 'motivo', 'Sentença sem recurso', 'resultado', 'PERDA'))
  from ids, cs;
create temp table rosa as select r.id, row_number() over (order by r.vencimento) n from recebimentos_previstos r, ct where r.contrato_id = ct.rosa;
update recebimentos_previstos r set pago_antes = true, cancelado_em = app_now(), cancelado_motivo = 'Paga antes do T3jus (importação)'
  from rosa where rosa.id = r.id and rosa.n <= 2;

-- Hoje: quarta-feira, 18/11/2026. A régua manda o 1º aviso de Noemi e da Construtora.
select ajustar_relogio(('2026-11-18 10:00-03'::timestamptz - now()));
select automacoes_rodar();
create temp table ex as select x.id, x.origem_id from automacao_execucoes x join automacoes a on a.id = x.automacao_id, p
  where a.pronta_chave = 'PARCELA_ATRASO' and x.origem_id in (p.noemi6, p.con);
select is((select count(*)::integer from automacao_execucoes x join ex using (id) where x.situacao = 'EM_ANDAMENTO'), 2,
  'régua: Noemi e a Construtora receberam o 1º aviso e esperam o 2º');
select ajustar_relogio(('2026-11-18 10:12-03'::timestamptz - now()));

-- ---------------------------------------------------------------------------------------
-- 1. Quem pode (pergunta 1) e as recusas.
select is((teste.erro($$ select portal_financeiro_parcela_baixar(felipe, rm, p.noemi6, pg_temp.dados('PERDOADA', 'Não vamos cobrar', 100000)) from ids, p $$)) -> 'detalhe' ->> 'motivo',
  'AREA_NAO_LIBERADA', 'FI-24 (pergunta 1): sem a área Financeiro, Felipe não dá baixa');
select is((teste.erro($$ select portal_financeiro_parcela_baixa_previa(larissa, rm, p.noemi6) from ids, p $$)) -> 'detalhe' ->> 'motivo',
  'AREA_NAO_LIBERADA', 'PT-02: sem Financeiro, nem a prévia da janela');
select is((teste.erro($$ select portal_financeiro_parcela_baixar(intrusa, outro, p.noemi6, pg_temp.dados('PERDOADA', 'Não vamos cobrar', 100000)) from ids, p $$)) ->> 'codigo',
  'TC404', 'PT-01: a parcela de outro escritório não aparece');
select is((teste.erro($$ select portal_financeiro_parcela_baixar(diego, rm, p.seb_dez, pg_temp.dados('PERDOADA', 'Não vamos cobrar', 90000)) from ids, p $$)) -> 'detalhe' ->> 'motivo',
  'PARCELA_NAO_VENCIDA', 'a parcela a vencer não tem baixa: o caminho é mudar as condições ou encerrar');
select is((teste.erro($$ select portal_financeiro_parcela_baixar(diego, rm, p.seb_nov, pg_temp.dados('PERDOADA', 'Não vamos cobrar', 90000)) from ids, p $$)) -> 'detalhe' ->> 'motivo',
  'PARCELA_JA_PAGA', 'a parcela paga não tem baixa');
select is((teste.erro($$ select portal_financeiro_parcela_baixar(diego, rm, p.noemi6, jsonb_build_object('explicacao', ' a ', 'falta', 100000)) from ids, p $$)) -> 'detalhe' -> 'campos',
  '["explicacao", "motivo"]'::jsonb, 'PT-03: motivo e explicação (3 a 1.000 letras) são obrigatórios');
select is((teste.erro($$ select portal_financeiro_parcela_baixar(diego, rm, p.seb_out, pg_temp.dados('PERDOADA', 'Não vamos cobrar', 90000)) from ids, p $$)) -> 'detalhe',
  (select jsonb_build_object('motivo', 'PARCELA_MUDOU', 'por', pessoa_ref(diego), 'em', (select criado_em from pagamentos_recebidos where parcela_id = p.seb_out),
                             'valor', 40000, 'faltaAntes', 90000, 'falta', 50000) from ids, p),
  'decisão 14: o saldo não é o da tela; a recusa diz quem registrou, quando e quanto');

-- ---------------------------------------------------------------------------------------
-- 2. A prévia da janela de Noemi: as custas ficam sem parcela, e o caso espera por ela.
create temp table pv as select portal_financeiro_parcela_baixa_previa(socia, rm, p.noemi6) v from ids, p;
select is((select jsonb_build_array(v -> 'falta', v -> 'diasAtraso', v -> 'podeRenegociar', v -> 'temContratos') from pv), '[100000, 8, true, true]'::jsonb,
  'a prévia: falta R$ 1.000,00, há 8 dias, a renegociada vale e Marina tem Contratos');
select is((select v -> 'custas' -> 0 -> 'depois' from pv), 'null'::jsonb, 'nota 5: sem a 6/6, as custas de Noemi ficam a reembolsar, em A pagar');
select is((select jsonb_agg(jsonb_build_array(c ->> 'nome', c -> 'espera')) from pv, jsonb_array_elements(v -> 'casos') c),
  '[["Carvalho x Construtora Lume", true]]'::jsonb, 'o caso Carvalho x Construtora Lume espera pela parcela');
select is((select v -> 'proximaAcaoCom' ->> 'nome' from pv), 'Marina Ribeiro', 'pergunta 6: Felipe cuida do contrato sem Financeiro; a próxima ação de um desfazer fica com quem desfaz');

-- Diego tinha emitido um carnê da 6/6 (nota 7).
select portal_carne_gerar(diego, rm, ct.noemi, jsonb_build_object('area', 'FINANCEIRO', 'parcelas', jsonb_build_array(p.noemi6))) from ids, ct, p;

-- ---------------------------------------------------------------------------------------
-- 3. Marina dá baixa sem receber, com as custas junto (pergunta 4).
create temp table bx as select portal_financeiro_parcela_baixar(socia, rm, p.noemi6,
  pg_temp.dados('INADIMPLENCIA', 'Noemi recusou pagar depois da perda; não vamos cobrar na Justiça', 100000, true)) v from ids, p;
select pg_temp.fim();
select is((select jsonb_build_array(v ->> 'situacao', v -> 'baixa' ->> 'motivo', v -> 'reembolsosBaixados', v -> 'baixa' -> 'por' ->> 'nome') from bx),
  '["BAIXADA", "INADIMPLENCIA", 1, "Marina Ribeiro"]'::jsonb, 'FI-24: a parcela fica "Baixa sem receber", com o motivo e quem fez');
select is((select v -> 'baixa' -> 'reembolsos' -> 0 -> 'valor' from bx), '41230'::jsonb, 'FI-25: o reembolso das custas teve baixa junto');
select is((select cancelado_motivo from recebimentos_previstos r, p where r.id = p.noemi6), 'Baixa sem receber', 'nota 2: o cancelamento leva só o texto fixo, sem o motivo');
select is((select portal_financeiro_parcela_baixar(socia, rm, p.noemi6,
             pg_temp.dados('INADIMPLENCIA', 'Noemi recusou pagar depois da perda; não vamos cobrar na Justiça', 100000, true)) -> 'repetida' from ids, p),
  'true'::jsonb, 'decisão 13: a repetição da mesma pessoa, com o mesmo saldo e o mesmo motivo, é sucesso');
select is((select count(*)::integer from parcela_baixas b, p where b.parcela_id = p.noemi6), 2, 'e não grava nada de novo');
select is((teste.erro($$ select portal_financeiro_parcela_baixar(bianca, rm, p.noemi6, pg_temp.dados('PERDOADA', 'Perdoamos a parcela', 100000)) from ids, p $$)) -> 'detalhe',
  (select jsonb_build_object('motivo', 'PARCELA_JA_BAIXADA', 'por', pessoa_ref(socia), 'em', app_now()) from ids),
  'decisão 14: outra pessoa já deu baixa; a recusa diz quem e quando');

-- O carnê já emitido (nota 7): a mudança e o aviso dizem "teve baixa sem receber".
select is((select a.dados ->> 'motivo' from avisos_sino a, ids where a.tipo = 'CARNE_DESATUALIZADO' and a.pessoa_id = ids.diego),
  'BAIXADA', 'nota 7: o sino do carnê diz que a parcela teve baixa sem receber, não que foi cancelada');
select is((select carne_mudancas(k) -> 0 ->> 'tipo' from carnes k, ct where k.contrato_id = ct.noemi), 'BAIXADA',
  'nota 7: o "o que mudou" do carnê diz BAIXADA');
-- Revisão do código, nota 1 (pergunta 2, PT-02): Felipe cuida do contrato, mas não tem o Financeiro.
select is((select a.dados ->> 'quem' from avisos_sino a, ids where a.tipo = 'CARNE_DESATUALIZADO' and a.pessoa_id = ids.diego),
  'Marina Ribeiro', 'pergunta 2: Diego, que tem o Financeiro, lê quem deu a baixa');
select is((select jsonb_build_array(a.dados ? 'quem', a.dados ->> 'motivo', a.dados ->> 'parcela') from avisos_sino a, ids
            where a.tipo = 'CARNE_DESATUALIZADO' and a.pessoa_id = ids.felipe),
  '[false, "BAIXADA", "Parcela 6 de 6"]'::jsonb, 'pergunta 2, PT-02: Felipe, sem o Financeiro, lê só que a parcela teve baixa sem receber');
-- Revisão, nota 5: "De onde veio" traz a baixa com o motivo, o valor e as custas.
select is((select x - 'em' - 'por' from ids, ct, cs, jsonb_array_elements(contrato_fechamento_origem(rm, ct.noemi, cs.a)) x
            where x ->> 'acao' = 'financeiro.parcela_baixada'),
  '{"acao": "financeiro.parcela_baixada", "dados": {"motivo": "INADIMPLENCIA", "parcela": "Parcela 6 de 6", "valor": 100000, "reembolsos": 1, "custasAReembolsar": 0}}'::jsonb,
  'nota 5: "De onde veio" traz a baixa, com o motivo, o valor e o reembolso que teve baixa junto');

-- Saiu de Em atraso e de A receber, não conta como recebido, e o caso fica pronto.
select is((select (portal_financeiro_receber(diego, rm, 'VENCIDAS') -> 'parcelas') @> jsonb_build_array(jsonb_build_object('id', p.noemi6)) from ids, p),
  false, 'sai de Em atraso e de A receber');
create temp table fc as select portal_financeiro_contrato(diego, rm, ct.noemi) v from ids, ct;
select is((select v -> 'totais' from fc), '{"atraso": 0, "aVencer": 0, "baixado": 100000, "recebido": 500000, "contratado": 600000, "renegociado": 0}'::jsonb,
  'decisão 27: "Contratado" conta a baixada por inadimplência, "Recebido" não muda, "Em atraso" cai, entra "Baixado sem receber"');
select is((select jsonb_array_length(v -> 'parcelas') from fc), 6, 'decisão 25: a ficha continua com as 6 parcelas');
create temp table ac as select portal_financeiro_caso_acerto(diego, rm, cs.a) a from ids, cs;
select is((select a -> 'pendencias' from ac), '[]'::jsonb, 'FI-08, EX-16: tudo recebido ou baixado com motivo: nada pende');
select is((select (a -> 'parcelas') - 'ultima'::text from ac), '{"falta": 0, "pagas": 6, "total": 7, "baixadas": 1}'::jsonb,
  'nota 3: os totais contam a baixada (5 de Noemi e 1 de Cláudio pagas, a 6/6 baixada)');
select is((select jsonb_build_array(a -> 'baixado' -> 'valor', a -> 'baixado' -> 'parcelas' -> 0 ->> 'motivo', a -> 'baixado' -> 'reembolsos' -> 0 -> 'valor') from ac),
  '[100000, "INADIMPLENCIA", 41230]'::jsonb, 'bx-encerrar: "Baixado sem receber R$ 1.000,00 · inadimplência" e as custas baixadas');
select is((select jsonb_build_array(a -> 'recebidoNoCaso', a -> 'reembolsos' -> 'baixado') from ac), '[650000, 41230]'::jsonb,
  'o quadro: "Recebido no caso" não muda, e o reembolso aparece como baixado');
select is((select c -> 'baixas' -> 0 ->> 'descricao' from ac, jsonb_array_elements(a -> 'contratos') c where c ->> 'id' = (select noemi::text from ct)),
  'Parcela 6 de 6', 'o quadro diz qual parcela teve baixa sem receber');
select is((select (f ->> 'valor')::bigint from ids, cli, jsonb_array_elements(portal_cliente(socia, rm, cli.noemi) -> 'passo' -> 'item' -> 'passos') f
            where f ->> 'tipo' = 'FINANCEIRO'), 0::bigint, 'EX-16: o passo "Encerrar no financeiro" não conta mais a parcela');
select ok((select conta_reembolso_baixado(cp.noemi) and conta_parcela_reembolso(c) is null from cp, contas_pagar c where c.id = cp.noemi),
  'FI-25: a conta das custas tem baixa em vigor e não volta com parcela nenhuma');
select is((select conta_linha(c) -> 'reembolsoBaixado' ->> 'motivo' from cp, contas_pagar c where c.id = cp.noemi), 'INADIMPLENCIA',
  'a conta mostra o reembolso baixado sem receber, com o motivo');

-- O sino do caso pronto (F3.147) com o motivo BAIXA, para o resto do Financeiro.
select is((select s.dados ->> 'motivo' || ' · ' || (s.dados ->> 'parcela') || ' · ' || (s.dados ->> 'quem') || ' · ' || (s.dados ->> 'clienteParcela')
             from avisos_sino s, ids where s.tipo = 'CASO_PRONTO_FECHAR' and s.pessoa_id = ids.diego),
  'BAIXA · Parcela 6 de 6 · Marina Ribeiro · Noemi Bastos Carvalho', 'nota do sino: Diego recebe "Marina Ribeiro deu baixa sem receber na parcela 6/6"');
select is((select count(*)::integer from avisos_sino s, ids where s.tipo = 'CASO_PRONTO_FECHAR' and s.pessoa_id = ids.socia), 0,
  'quem deu a baixa não recebe o aviso');

-- O histórico fica na parcela, nunca no contrato (que Contratos mostra a quem não tem Financeiro).
select is((select h.dados ->> 'motivo' from historico h, p where h.entidade = 'recebimentos_previstos' and h.entidade_id = p.noemi6::text
             and h.acao = 'financeiro.parcela_baixada'), 'INADIMPLENCIA', 'FI-04: a baixa entra no histórico da parcela');
select is((select count(*)::integer from historico h, ct where h.entidade = 'contratos' and h.entidade_id = ct.noemi::text and h.acao like 'financeiro.parcela%'),
  0, 'nota 2: nada da baixa no histórico do contrato');

-- ---------------------------------------------------------------------------------------
-- 4. Em Contratos (nota 2, pergunta 2).
create temp table pcf as select l from ids, ct, p, jsonb_array_elements(portal_contrato(felipe, rm, ct.noemi) -> 'recebimentos') l where l ->> 'id' = p.noemi6::text;
select ok((select l -> 'foraDaCobranca' = 'true' and not (l ? 'cancelado') and not (l ? 'baixa') and not (l ? 'situacao') from pcf),
  'PT-02 (pergunta 2): Felipe, sem Financeiro, vê só "fora da cobrança", sem motivo, sem quem e sem o cancelado');
create temp table pcm as select l from ids, ct, p, jsonb_array_elements(portal_contrato(socia, rm, ct.noemi) -> 'recebimentos') l where l ->> 'id' = p.noemi6::text;
select is((select jsonb_build_array(l ->> 'situacao', l -> 'baixa' ->> 'motivo', l -> 'baixa' -> 'por' ->> 'nome') from pcm),
  '["BAIXADA", "INADIMPLENCIA", "Marina Ribeiro"]'::jsonb, 'Marina, com Financeiro, vê o selo, o motivo e quem');

-- ---------------------------------------------------------------------------------------
-- 5. As outras escritas na parcela baixada recusam com PARCELA_BAIXADA.
select is((teste.erro($$ select portal_financeiro_receber_registrar_recibo(diego, rm, p.noemi6, '{"valor": 100000, "recebidoEm": "2026-11-18", "forma": "PIX"}') from ids, p $$)) -> 'detalhe' ->> 'motivo',
  'PARCELA_BAIXADA', '"Registrar recebimento" na baixada: desfaça a baixa antes');
select is((teste.erro($$ select portal_financeiro_cobranca_anotar(diego, rm, p.noemi6, jsonb_build_object('tipo', 'LIGACAO', 'proxData', '2026-11-19',
             'proxOque', 'Ligar de novo', 'proxResponsavelId', diego)) from ids, p $$)) -> 'detalhe' ->> 'motivo',
  'PARCELA_BAIXADA', '"Anotar cobrança" na baixada também');

-- ---------------------------------------------------------------------------------------
-- 6. A régua (nota 1): a execução de Noemi no meio da espera termina FICOU_DE_FORA; a da
-- Construtora, com a parcela cancelada por mudança de condição, também, e nenhuma vai ao "Pagou".
update recebimentos_previstos set cancelado_em = app_now(), cancelado_motivo = 'Condição mudada: novo acordo' from p where id = p.con;
select ajustar_relogio(('2026-11-25 10:30-03'::timestamptz - now()));
select automacoes_rodar();
select ajustar_relogio(('2026-11-18 10:12-03'::timestamptz - now()));
select is((select x.situacao || ' · ' || x.motivo from automacao_execucoes x join ex using (id), p where ex.origem_id = p.noemi6),
  'FICOU_DE_FORA · A parcela teve baixa sem receber.', 'nota 1: a baixa encerra a régua como "ficou de fora", nunca "Pagou"');
select is((select x.situacao || ' · ' || x.motivo from automacao_execucoes x join ex using (id), p where ex.origem_id = p.con),
  'FICOU_DE_FORA · A parcela foi cancelada no contrato.', 'nota 1: a condição mudada também não vai mais ao "Pagou"');
select is((select count(*)::integer from conversa_mensagens m join conversas c on c.id = m.conversa_id
            where c.telefone in ('+5511984223170', '+5511984223175') and m.autor = 'AVISO' and m.aviso_tipo like 'Parcela em atraso%'), 2,
  'nenhum aviso de cobrança saiu depois da baixa');
select ok((select not automacao_pagou(x, a) from ex join automacao_execucoes x on x.id = ex.id join automacoes a on a.id = x.automacao_id, p where ex.origem_id = p.noemi6),
  '"Pagou" é só dinheiro recebido');

-- ---------------------------------------------------------------------------------------
-- 7. A parcela paga em parte e renegociada (nota 3, pergunta 3).
select is((select portal_financeiro_receber(diego, rm, 'RECEBIDO_MES') -> 'totais' -> 'recebidoMes' from ids),
  '{"n": 2, "valor": 130000}'::jsonb, 'antes da baixa: R$ 1.300,00 recebidos em novembro (R$ 400,00 da de outubro)');
create temp table pvs as select portal_financeiro_parcela_baixa_previa(diego, rm, p.seb_out) v from ids, p;
select ok((select v -> 'custas' -> 0 -> 'depois' <> 'null' and v -> 'temContratos' = 'false' from pvs),
  'nota 5: as custas de Sebastião passam para outra parcela; Diego não tem Contratos');
select is((select jsonb_agg(x ->> 'nome' order by x ->> 'nome') from pvs, jsonb_array_elements(v -> 'quemContratos') x),
  '["Felipe Matos", "Marina Ribeiro"]'::jsonb, '"Quem muda as condições é a área Contratos (Marina e Felipe)"');
select is((teste.erro($$ select portal_financeiro_parcela_baixar(diego, rm, p.seb_out, pg_temp.dados('RENEGOCIADA', 'Parcelado: 2 × R$ 250,00', 50000, true)) from ids, p $$)) -> 'detalhe' -> 'campos',
  '["reembolso"]'::jsonb, 'a renegociada nunca leva as custas junto');
select portal_financeiro_parcela_baixar(diego, rm, p.seb_out,
  pg_temp.dados('RENEGOCIADA', 'Parcelado: 2 × R$ 250,00, em dezembro e janeiro, combinado com Sebastião por telefone hoje.', 50000)) from ids, p;
select pg_temp.fim();
select is((select portal_financeiro_receber(diego, rm, 'RECEBIDO_MES') -> 'totais' -> 'recebidoMes' from ids),
  '{"n": 2, "valor": 130000}'::jsonb, 'nota 3: "Recebido no mês" mantém o que entrou na parcela baixada');
select is((select (portal_financeiro_contrato(diego, rm, ct.seb) -> 'totais') - 'aVencer'::text from ids, ct),
  '{"atraso": 0, "baixado": 0, "recebido": 310000, "contratado": 490000, "renegociado": 50000}'::jsonb,
  'pergunta 3a: a renegociada sai do Contratado (R$ 4.900,00, com os R$ 400,00 que entraram) e não conta em "Baixado sem receber"');
create temp table acs as select portal_financeiro_caso_acerto(diego, rm, cs.seb) a from ids, cs;
select is((select jsonb_build_array(a -> 'recebidoNoCaso', a -> 'parcelas' -> 'baixadas', a -> 'baixado' -> 'renegociado') from acs),
  '[310000, 1, 50000]'::jsonb, 'nota 3: o acerto e o quadro mantêm o recebido da parcela paga em parte');
select is((select jsonb_agg(s.dados ->> 'combinado' order by p2.nome) from avisos_sino s join pessoas p2 on p2.id = s.pessoa_id where s.tipo = 'BAIXA_RENEGOCIADA'),
  '["Parcelado: 2 × R$ 250,00, em dezembro e janeiro, combinado com Sebastião por telefone hoje.", "Parcelado: 2 × R$ 250,00, em dezembro e janeiro, combinado com Sebastião por telefone hoje."]'::jsonb,
  'pergunta 3b: Felipe e Marina, com Contratos, recebem o combinado no sino');
select ok((select bool_and(not (s.dados ? 'motivo') and not (s.dados ? 'valor')) from avisos_sino s where s.tipo = 'BAIXA_RENEGOCIADA'),
  'PT-02: o aviso a Contratos leva só o combinado, sem o atraso nem o motivo');
select is((select count(*)::integer from avisos_sino s, ids where s.tipo = 'BAIXA_RENEGOCIADA' and s.pessoa_id = ids.diego), 0, 'Diego, que deu a baixa, não recebe');

-- ---------------------------------------------------------------------------------------
-- 8. "Não foi paga" (nota 4): a correção baixada continua valendo como correção.
create temp table rn as select portal_pago_antes_nao_paga(socia, rm, ct.rosa, rosa.id, '{"motivo": "A planilha estava errada"}') ->> 'id' id
  from ids, ct, rosa where rosa.n = 2;
select portal_financeiro_parcela_baixar(socia, rm, rn.id::uuid, pg_temp.dados('PERDOADA', 'A sócia decidiu não cobrar', 80000)) from ids, rn;
select is((teste.erro($$ select portal_pago_antes_nao_paga(socia, rm, ct.rosa, rosa.id, '{"motivo": "De novo"}') from ids, ct, rosa where rosa.n = 2 $$)) -> 'detalhe' ->> 'motivo',
  'JA_MUDADA', 'nota 4: não nasce uma segunda correção enquanto a primeira está baixada');
select is((teste.erro($$ select portal_pago_antes_foi_paga(socia, rm, rn.id::uuid, '{"motivo": "Achei o comprovante"}') from ids, rn $$)) -> 'detalhe' ->> 'motivo',
  'PARCELA_BAIXADA', 'nota 4: "Foi paga, sim" na baixada recusa com PARCELA_BAIXADA');
select is((select l -> 'corrigida' from ids, ct, rosa, jsonb_array_elements(portal_contrato(socia, rm, ct.rosa) -> 'recebimentos') l
            where rosa.n = 2 and l ->> 'id' = rosa.id::text), 'true'::jsonb, 'nota 4: em Contratos, a paga antes continua "corrigida"');
select is((select portal_financeiro_parcela_baixa_desfazer(socia, rm, rn.id::uuid, '{"explicacao": "Rosa vai pagar afinal"}') ->> 'situacao' from ids, rn),
  'VENCIDA', 'nota 4: o desfazer da correção baixada funciona (o índice não bate)');

-- ---------------------------------------------------------------------------------------
-- A IA do escritório (pergunta 5): a parcela baixada é assunto da equipe, sem valor nem motivo.
select ia_config_garantir(rm) from ids;
update ia_config set assuntos = array['PARCELAS'] where escritorio_id = (select rm from ids);
select is((select ia_contexto_json(rm, cli.noemi, null) -> 'dados' -> 'parcelasComEquipe' from ids, cli), '1'::jsonb,
  'pergunta 5: a IA sabe que há uma parcela que é assunto da equipe');
select ok((select (ia_contexto_json(rm, cli.noemi, null) -> 'dados')::text !~ '(Inadimpl|recusou|100000)' from ids, cli),
  'pergunta 5: sem valor nem motivo da baixa');

-- ---------------------------------------------------------------------------------------
-- 9. Desfazer a baixa de Noemi (decisões 16 a 20).
select is((teste.erro($$ select portal_financeiro_parcela_baixa_desfazer(socia, rm, p.noemi6, '{"explicacao": "ok"}') from ids, p $$)) -> 'detalhe' -> 'campos',
  '["explicacao"]'::jsonb, '"Por que desfazer" é obrigatório');
select is((teste.erro($$ select portal_financeiro_parcela_baixa_desfazer(socia, rm, p.seb_nov, '{"explicacao": "Sem baixa"}') from ids, p $$)) -> 'detalhe' ->> 'motivo',
  'PARCELA_NAO_BAIXADA', 'a parcela sem baixa não se desfaz');
create temp table dz as select portal_financeiro_parcela_baixa_desfazer(socia, rm, p.noemi6, '{"explicacao": "Noemi pagou afinal"}') v from ids, p;
select pg_temp.fim();
select is((select jsonb_build_array(v ->> 'situacao', v -> 'proximaAcao' -> 'com' ->> 'nome', v -> 'proximaAcao' ->> 'data', v -> 'baixaDesfeita' -> 'por' ->> 'nome') from dz),
  '["VENCIDA", "Marina Ribeiro", "2026-11-19", "Marina Ribeiro"]'::jsonb,
  'decisão 17, pergunta 6: volta para Em atraso, e a próxima ação é amanhã, com quem desfez (Felipe não tem Financeiro)');
select is((select e.prox_oque || ' · ' || e.texto from cobranca_eventos e, p where e.parcela_id = p.noemi6 order by e.ordem desc limit 1),
  'Falar com Noemi Bastos Carvalho · Baixa sem receber desfeita: Noemi pagou afinal', 'nota 14: o desfazer põe alguém cuidando da parcela');
select ok((select not conta_reembolso_baixado(cp.noemi) from cp), 'FI-25: a baixa das custas também se desfaz');
select is((select x -> 'dados' from ids, ct, cs, jsonb_array_elements(contrato_fechamento_origem(rm, ct.noemi, cs.a)) x
            where x ->> 'acao' = 'financeiro.parcela_baixa_desfeita'),
  '{"com": "Marina Ribeiro", "motivo": "INADIMPLENCIA", "parcela": "Parcela 6 de 6", "valor": 100000, "explicacao": "Noemi pagou afinal"}'::jsonb,
  'nota 5: "De onde veio" traz o desfazer, com o porquê e com quem ficou a próxima ação');
select is((select a.dados ? 'quem' from avisos_sino a, ids where a.tipo = 'CARNE_DESATUALIZADO' and a.pessoa_id = ids.felipe),
  false, 'pergunta 2: no desfazer, Felipe também não lê quem desfez');
select ok(pg_get_functiondef('portal_financeiro_parcela_baixar(uuid,uuid,uuid,jsonb)'::regprocedure) ~ 'x\.escritorio_id = p_escritorio\) for share',
  'sugestão 16: a baixa trava o contrato, e uma "Renegociada" não passa num contrato que se encerra ao mesmo tempo');
select is((select string_agg(b.tipo, ',' order by b.ordem) from parcela_baixas b, p where b.parcela_id = p.noemi6), 'BAIXA,BAIXA,DESFEITA,DESFEITA',
  'decisão 19, PT-03: desfazer nunca apaga a baixa');
select is((select x.ac -> 'pendencias' -> 0 ->> 'tipo' from ids, cs, lateral (select portal_financeiro_caso_acerto(diego, rm, cs.a) ac) x), 'PARCELA',
  'o caso volta a esperar pela parcela');
select is((teste.erro($$ update parcela_baixas set explicacao = 'outra' $$)) ->> 'codigo', 'TC023', 'PT-03: a baixa não se muda nem se apaga');

-- ---------------------------------------------------------------------------------------
-- 10. O relatório não reescreve o passado (IN-04, IN-07): a baixa de Tomás de 15/10 é desfeita
-- em 02/12; o fim de outubro continua sem ela, e o dia 02/12 já a tem.
select ajustar_relogio(('2026-12-02 10:00-03'::timestamptz - now()));
select portal_financeiro_parcela_baixa_desfazer(socia, rm, p.tomas, '{"explicacao": "Tomás reapareceu e quer pagar"}') from ids, p;
select ok((select not exists (select 1 from relatorio_abertas(rm, '2026-10-31') where parcela_id = p.tomas)
              and exists (select 1 from relatorio_abertas(rm, '2026-12-02') where parcela_id = p.tomas) from ids, p),
  'IN-04, IN-07: desfazer em dezembro não muda o relatório de outubro');

select * from finish();
rollback;
