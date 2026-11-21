-- O êxito para conferir (F3.14: CH-07, EX-08) e o reembolso junto da parcela (F3.85: FI-07):
-- o encerramento com o valor de cada cliente, o cálculo pelo contrato, conferir e lançar, mudar o
-- valor com motivo e aviso no sino, não cobrar com explicação, o fechamento do caso esperando a
-- conferência, o reembolso na parcela e registrado junto só quando pedido. Área e isolamento.
begin;
select plan(54);

select ajustar_relogio(('2026-11-18 14:50-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Larissa Costa') as larissa,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, diego, 'Diego Almeida', array['FINANCEIRO']),
       portal_convidar(socia, rm, larissa, 'Larissa Costa', array['JURIDICO']) from ids;

create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Joana Pereira', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Joana Pereira', 'telefone', '+5511996027736', 'principal', true)))) ->> 'id')::uuid joana,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Carlos Henrique Dias', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Carlos Henrique Dias', 'telefone', '+5511996027737', 'principal', true)))) ->> 'id')::uuid carlos
  from ids;
create temp table ct as select
  (portal_contrato_criar(socia, rm, jsonb_build_object('clienteId', cli.joana, 'objeto', 'Reclamação trabalhista',
     'responsavelId', ids.diego, 'advogados', jsonb_build_array(ids.socia),
     'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'EXITO', 'percentual', 3000, 'sobre', 'Valor do acordo ou da condenação',
                                                       'etapa', 'Encerrado', 'dias', 0)))) ->> 'id')::uuid joana,
  (portal_contrato_criar(socia, rm, jsonb_build_object('clienteId', cli.carlos, 'objeto', 'Reclamação trabalhista',
     'responsavelId', ids.socia, 'advogados', jsonb_build_array(ids.socia),
     'condicoes', jsonb_build_array(
       jsonb_build_object('tipo', 'PARCELADO', 'total', 720000, 'parcelas', 3, 'primeiro', '2026-11-28'),
       jsonb_build_object('tipo', 'EXITO', 'percentual', 2500, 'sobre', 'Valor do acordo ou da condenação', 'etapa', 'Encerrado', 'dias', 30)))) ->> 'id')::uuid carlos
  from ids, cli;
select portal_contrato_assinatura(socia, rm, ct.joana, 1, '2026-11-18'), portal_contrato_assinatura(socia, rm, ct.carlos, 1, '2026-11-18') from ids, ct;
select portal_juridico_casos(socia, rm) from ids;
create temp table cs as select
  (portal_juridico_caso_criar(socia, rm, jsonb_build_object('nome', 'Pereira x Mercado Bom Preço', 'area', 'TRABALHISTA',
     'etapaId', (select id from etapas where escritorio_id = ids.rm and ordem = 5), 'responsavelId', ids.larissa,
     'clientes', jsonb_build_array(jsonb_build_object('clienteId', cli.joana, 'papel', 'AUTOR', 'contratoId', ct.joana),
                                   jsonb_build_object('clienteId', cli.carlos, 'papel', 'AUTOR', 'contratoId', ct.carlos)))) ->> 'id')::uuid id,
  (select id from etapas where escritorio_id = ids.rm and final) final
  from ids, cli, ct;

-- O encerramento com ganho ou acordo pede o valor de cada cliente e a data prevista.
select is((teste.erro($$ select portal_juridico_caso_etapa(larissa, rm, cs.id, 1, jsonb_build_object('etapaId', cs.final, 'motivo', 'Acordo homologado',
  'resultado', 'ACORDO', 'valores', jsonb_build_object(cli.joana, 2800000))) from ids, cs, cli $$)) -> 'detalhe',
  jsonb_build_object('motivo', 'VALOR_OBRIGATORIO', 'campos', jsonb_build_array('previstoEm', 'valores'), 'clientes', jsonb_build_array((select carlos from cli)::text)),
  'EX-08: falta o valor de Carlos e a data prevista');
select is((teste.erro($$ select portal_juridico_caso_etapa(larissa, rm, cs.id, 1, jsonb_build_object('etapaId', cs.final, 'motivo', '',
  'resultado', 'ACORDO')) from ids, cs $$)) -> 'detalhe' -> 'campos', '["motivo", "previstoEm", "valores"]'::jsonb,
  'os erros do motivo e dos valores saem juntos');
select is((select situacao from casos where id = cs.id), 'ANDAMENTO', 'e o caso não foi encerrado') from cs;
select is((select count(*) from caso_etapa_mudancas m where m.caso_id = cs.id and m.resultado is not null), 0::bigint, 'nem a mudança ficou') from cs;

-- A conta adiantada de Carlos que volta junto com a próxima parcela (a 1/3, de 28/11).
create temp table cp as select
  (portal_financeiro_conta_lancar(diego, rm, jsonb_build_object('descricao', 'Custas da apelação', 'categoria', 'CUSTAS', 'valor', 124836,
     'vencimento', '2026-11-21', 'adiantada', true, 'clienteId', cli.carlos, 'casoId', cs.id, 'reembolsoComo', 'PROXIMA_PARCELA')) ->> 'id')::uuid custas
  from ids, cli, cs;

-- Encerrar com acordo, com os valores: o êxito de cada cliente vai para conferir.
select is((portal_juridico_caso_etapa(larissa, rm, cs.id, 1, jsonb_build_object('etapaId', cs.final, 'motivo', 'Acordo homologado em 18/11',
  'resultado', 'ACORDO', 'previstoEm', '2026-12-15', 'valores', jsonb_build_object(cli.joana, 2800000, cli.carlos, 2000000))) ->> 'exitos')::integer, 2,
  'EX-08: o encerramento com acordo cria os dois êxitos') from ids, cs, cli;
select is((select array_agg(calculado order by calculado desc) from exitos_conferir x, cs where x.caso_id = cs.id), array[840000, 500000]::bigint[],
  'CH-07: 30% de R$ 28.000,00 e 25% de R$ 20.000,00');
select is((select previsto_em from exitos_conferir x, cli where x.cliente_id = cli.carlos), '2026-12-18'::date,
  'a data prevista respeita os dias do contrato de Carlos (30 dias depois do encerramento)');
select is((select previsto_em from exitos_conferir x, cli where x.cliente_id = cli.joana), '2026-12-15'::date, 'e a do pagamento do acordo para Joana');

-- O bloco do A receber: só para quem tem o Financeiro; os números do alto não mudam.
select is((teste.erro($$ select portal_financeiro_exitos(larissa, rm) from ids $$)) -> 'detalhe' ->> 'motivo', 'AREA_NAO_LIBERADA',
  'PA-01: sem o Financeiro, o bloco é recusado');
create temp table bl as select portal_financeiro_exitos(diego, rm) b from ids;
select is((select (b ->> 'n')::integer from bl), 2, 'dois esperando conferência');
select is((select (b ->> 'total')::bigint from bl), 1340000::bigint, 'com o total só de êxito');
select is((select b -> 'itens' -> 0 -> 'encerrado' -> 'por' ->> 'nome' from bl), 'Larissa Costa', 'cada linha diz quem encerrou');
select is((select portal_financeiro_exitos(intrusa, outro) ->> 'n' from ids), '0', 'PT-01: o outro escritório não vê');
select is((select portal_financeiro_receber(diego, rm) -> 'totais' -> 'aberto' ->> 'valor' from ids), '720000',
  'decisão 2: o êxito para conferir fica fora dos números do alto');

-- Fechamento do caso: o êxito para conferir segura.
select is((select jsonb_path_query_array(portal_financeiro_caso_acerto(diego, rm, cs.id) -> 'pendencias', '$[*].tipo') from ids, cs),
  '["EXITO", "EXITO", "PARCELA", "PARCELA", "PARCELA", "REEMBOLSO"]'::jsonb, 'FI-08: o êxito para conferir pende no acerto do caso');

-- Conferir: erros.
create temp table ex as select
  (select id from exitos_conferir x where x.cliente_id = cli.joana) joana,
  (select id from exitos_conferir x where x.cliente_id = cli.carlos) carlos
  from cli;
select is((teste.erro($$ select portal_financeiro_exito_lancar(diego, rm, ex.joana, '{"valor": 700000, "vencimento": "2026-11-31"}') from ids, ex $$)) -> 'detalhe',
  '{"motivo": "MOTIVO_OBRIGATORIO", "campos": ["motivoAjuste", "vencimento"]}'::jsonb, 'mudar o valor pede o motivo; a data tem de existir');
select is((teste.erro($$ select portal_financeiro_exito_lancar(diego, rm, ex.joana, '{"valor": 0, "vencimento": "2026-12-15"}') from ids, ex $$)) -> 'detalhe' ->> 'motivo',
  'VALOR_OBRIGATORIO', 'valor zero é recusado');
select is((teste.erro($$ select portal_financeiro_exito_lancar(larissa, rm, ex.joana, '{"valor": 840000, "vencimento": "2026-12-15"}') from ids, ex $$)) -> 'detalhe' ->> 'motivo',
  'AREA_NAO_LIBERADA', 'PA-01: só quem tem o Financeiro confere');
select is((teste.erro($$ select portal_financeiro_exito_lancar(intrusa, outro, ex.joana, '{"valor": 840000, "vencimento": "2026-12-15"}') from ids, ex $$)) ->> 'codigo',
  'TC404', 'PT-01: o êxito de outro escritório não é achado');

-- Lançar com o valor mudado e motivo: a parcela nasce, o sino avisa quem encerrou e o responsável.
create temp table l1 as select portal_financeiro_exito_lancar(diego, rm, ex.joana,
  '{"valor": 700000, "vencimento": "2026-12-15", "forma": "PIX", "motivoAjuste": "Desconto combinado com a cliente"}') j from ids, ex;
select is((select j -> 'parcela' ->> 'tipo' from l1), 'EXITO', 'CH-07: a parcela do êxito nasce em A receber');
select is((select j -> 'parcela' -> 'exito' -> 'conferido' -> 'por' ->> 'nome' from l1), 'Diego Almeida', 'com a origem e quem conferiu');
select is((select (origem, valor, vencimento, forma)::text from recebimentos_previstos r, ex where r.exito_id = ex.joana),
  '(ENCERRAMENTO,700000,2026-12-15,PIX)', 'do encerramento, com o valor e o vencimento conferidos');
select is((select array_agg(p.nome order by p.nome) from avisos_sino a join pessoas p on p.id = a.pessoa_id where a.tipo = 'EXITO_VALOR_MUDOU'),
  array['Larissa Costa'], 'decisão 3: o sino avisa quem encerrou (e responsável pelo caso, a mesma pessoa)');
select is((select count(*) from historico h, ex where h.acao = 'financeiro.exito_lancado' and h.dados ->> 'exito' = ex.joana::text), 2::bigint,
  'o motivo fica no histórico do caso e do contrato');
select is((teste.erro($$ select portal_financeiro_exito_lancar(diego, rm, ex.joana, '{"valor": 840000, "vencimento": "2026-12-15"}') from ids, ex $$)) -> 'detalhe' ->> 'motivo',
  'JA_CONFERIDO', 'conferido uma vez só');
select is((teste.erro($$ update exitos_conferir set calculado = 1 where id = (select joana from ex) $$)) ->> 'codigo', 'TC023', 'o êxito conferido não se muda');

-- Não cobrar: motivo e explicação obrigatórios; "virá por alvará" não é motivo (decisão 1).
select is((teste.erro($$ select portal_financeiro_exito_nao_cobrar(diego, rm, ex.carlos, '{"motivo": "ALVARA", "explicacao": ""}') from ids, ex $$)) -> 'detalhe' -> 'campos',
  '["explicacao", "motivo"]'::jsonb, 'PT-03: sem motivo válido e sem explicação não some');
select is((portal_financeiro_exito_nao_cobrar(diego, rm, ex.carlos, '{"motivo": "PERDOADO", "explicacao": "Renegociado: Carlos paga só as parcelas fixas"}') ->> 'situacao'),
  'NAO_COBRADO', 'não cobrado, com a explicação') from ids, ex;
select is((select count(*) from avisos_sino where tipo = 'EXITO_NAO_COBRADO'), 1::bigint, 'e avisado no sino');
select is((portal_financeiro_exitos(diego, rm) ->> 'n'), '0', 'o bloco fica vazio') from ids;

-- O reembolso na parcela e registrado junto só quando pedido (decisão 4).
create temp table p1 as select r.id from recebimentos_previstos r, ct where r.contrato_id = ct.carlos and r.vencimento = '2026-11-28';
select is((select parcela_linha(r) -> 'reembolso' ->> 'valor' from recebimentos_previstos r, p1 where r.id = p1.id), '124836',
  'FI-07: a parcela 1/3 de Carlos leva junto as custas da apelação');
select ajustar_relogio(('2026-11-28 10:00-03'::timestamptz - now()));
select is((teste.erro($$ select portal_financeiro_receber_registrar_recibo(diego, rm, p1.id,
  '{"valor": 240000, "recebidoEm": "2026-11-28", "forma": "CHEQUE_PRE", "reembolso": {"valor": 200000, "forma": "PIX"}}') from ids, p1 $$)) -> 'detalhe' ->> 'motivo',
  'REEMBOLSO_ACIMA_DO_ADIANTADO', 'o reembolso não passa do adiantado');
select is((select count(*) from pagamentos_recebidos), 0::bigint, 'e nada foi registrado');
select portal_financeiro_receber_registrar_recibo(diego, rm, p1.id, '{"valor": 240000, "recebidoEm": "2026-11-28", "forma": "CHEQUE_PRE", "recibo": true}') from ids, p1;
select is((select reembolsado_em from contas_pagar c, cp where c.id = cp.custas), null, 'sem a caixa marcada, o reembolso continua a reembolsar');
create temp table p2 as select r.id from recebimentos_previstos r, ct where r.contrato_id = ct.carlos and r.vencimento = '2026-12-28';
select is((select parcela_linha(r) -> 'reembolso' ->> 'valor' from recebimentos_previstos r, p2 where r.id = p2.id), '124836',
  'e passa para a parcela seguinte');
select ajustar_relogio(('2026-12-28 10:00-03'::timestamptz - now()));
select is((portal_financeiro_receber_registrar_recibo(diego, rm, p2.id,
  '{"valor": 240000, "recebidoEm": "2026-12-28", "forma": "CHEQUE_PRE", "recibo": true, "reembolso": {"valor": 124836, "forma": "PIX"}}') -> 'reembolso' ->> 'valor'),
  '124836', 'com a caixa marcada, os dois são registrados') from ids, p2;
select is((select reembolsado_em from contas_pagar c, cp where c.id = cp.custas), '2026-12-28'::date, 'o reembolso sai de "A reembolsar"');
select is((select (valor, forma)::text from reembolsos_recebidos), '(124836,PIX)', 'com o valor e a forma do reembolso');
select is((teste.erro($$ select portal_financeiro_receber_registrar_recibo(diego, rm, r.id,
  '{"valor": 240000, "recebidoEm": "2026-12-28", "forma": "PIX", "reembolso": {"valor": 124836, "forma": "PIX"}}') from ids, ct, recebimentos_previstos r
   where r.contrato_id = ct.carlos and r.vencimento = '2027-01-28' $$)) -> 'detalhe' ->> 'motivo', 'REEMBOLSO_JA_PAGO', 'e não se paga duas vezes');

-- F3.95: o reembolso pago junto entra no caixa, no recibo (segunda linha) e na exportação.
create temp table pg2 as select p.id from pagamentos_recebidos p, p2 where p.parcela_id = p2.id;
select is(caixa_entradas(rm, '2026-12-28', '2026-12-28'), 364836::bigint, 'FI-07: o caixa do dia soma a parcela e o reembolso') from ids;
select is((portal_recibo(diego, rm, pg2.id) -> 'reembolsos' -> 0) - 'adiantadoEm',
  '{"descricao": "Custas da apelação", "valor": 124836, "forma": "PIX", "caso": "Pereira x Mercado Bom Preço"}'::jsonb,
  'FI-07: o recibo da parcela traz o reembolso como segunda linha') from ids, pg2;
select is((select portal_recibo(diego, rm, p.id) -> 'reembolsos' from pagamentos_recebidos p, p1, ids where p.parcela_id = p1.id), '[]'::jsonb,
  'e o recibo sem reembolso fica como era');
select is((portal_financeiro_exportacao_previa(diego, rm, '2026-12-01') -> 'recebimentos'), '{"n": 2, "valor": 364836}'::jsonb,
  'a prévia da exportação conta o reembolso nos recebimentos') from ids;
create temp table exp as select portal_financeiro_exportar(diego, rm, '{"mes": "2026-12-01", "formato": "XLSX"}') v from ids;
select is((select l ->> 'parcela' from exp, jsonb_array_elements(v -> 'recebimentos') l where l ->> 'tipo' = 'REEMBOLSO'), 'Reembolso · Custas da apelação',
  'a exportação tem a linha do reembolso');
select is((select count(distinct l ->> 'recibo') from exp, jsonb_array_elements(v -> 'recebimentos') l where l ->> 'recibo' is not null), 1::bigint,
  'com o mesmo recibo da parcela');

-- F3.94: a parte "honorários" da divisão do alvará baixa a parcela do êxito de Joana (R$ 7.000,00).
create temp table pj as select r.id from recebimentos_previstos r, ex where r.exito_id = ex.joana;
create temp table prop as select portal_financeiro_repasse_proposta(diego, rm, jsonb_build_object('casoId', cs.id, 'clienteId', cli.joana, 'valor', 2800000)) v
  from ids, cs, cli;
select is((select v -> 'exito' -> 0 ->> 'falta' from prop), '700000', 'CH-07: a divisão proposta diz qual parcela do êxito vai ser baixada');
select is((select v -> 'linhas' -> 0 ->> 'valor' from prop), '840000', 'e o honorário pelo contrato');
create temp table cx as select caixa_entradas(rm, '-infinity', '2026-12-28') antes from ids;
create temp table lv as select portal_financeiro_levantamento_registrar(diego, rm, jsonb_build_object('tipo', 'ALVARA', 'casoId', cs.id, 'clienteId', cli.joana,
  'valor', 2800000, 'entrouEm', '2026-12-20', 'divisao', jsonb_build_array(
    jsonb_build_object('para', 'CLIENTE', 'valor', 1960000),
    jsonb_build_object('para', 'HONORARIOS', 'nome', 'Honorários de êxito', 'regra', '30%', 'valor', 840000)))) v from ids, cs, cli;
select is((select v -> 'exitoBaixado' -> 0 ->> 'valor' from lv), '700000', 'CH-07: a parte "honorários" baixa a parcela do êxito até o que falta');
select is((select parcela_linha(r) ->> 'situacao' from recebimentos_previstos r, pj where r.id = pj.id), 'PAGA', 'a parcela do êxito fica paga');
select is((select (parcela_linha(r) -> 'baixaAlvara' -> 0) - 'levantamentoId' from recebimentos_previstos r, pj where r.id = pj.id),
  '{"tipo": "ALVARA", "entrouEm": "2026-12-20", "valor": 700000}'::jsonb, 'com a origem "da divisão do alvará de 20/12"');
select is((select caixa from pagamentos_recebidos p, pj where p.parcela_id = pj.id), 'TERCEIROS', 'a baixa não entra no caixa por fora');
select is(caixa_entradas(rm, '-infinity', '2026-12-28'), (select antes from cx), 'o caixa só muda quando o honorário for transferido') from ids;
select is((teste.erro($$ select portal_financeiro_destinacao_dispensar(diego, rm, d.id, 'Não vamos cobrar') from ids, destinacoes d
   where d.levantamento_id = (select (v ->> 'id')::uuid from lv) and d.para = 'HONORARIOS' $$)) -> 'detalhe' ->> 'motivo', 'BAIXOU_EXITO',
  'a parte que baixou o êxito não se dispensa');
select is((select v -> 'exito' from (select portal_financeiro_repasse_proposta(diego, rm, jsonb_build_object('casoId', cs.id, 'clienteId', cli.joana, 'valor', 100000)) v
  from ids, cs, cli) x), '[]'::jsonb, 'e um levantamento seguinte já não tem êxito para baixar');

select * from finish();
rollback;
