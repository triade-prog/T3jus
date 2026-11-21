-- Contas que repetem todo mês (FI-13, F3.24): mudar o valor ou o dia a partir de um mês, a conta
-- do mês já lançada muda só se a pessoa escolher o mês dela, conta paga nunca muda, encerrar com
-- motivo e, se marcado, cancelar a conta do mês; a cancelada sai das somas; nada se apaga; a
-- rotina do dia 1º respeita as mudanças; área e isolamento.
begin;
select plan(31);

select ajustar_relogio(('2026-11-18 12:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Paula Nunes') as paula,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, diego, 'Diego Almeida', array['FINANCEIRO']),
       portal_convidar(socia, rm, paula, 'Paula Nunes', array['CONTRATOS']) from ids;

-- Aluguel (todo dia 20, R$ 3.600,00) e Sistema de petições (todo dia 21, R$ 189,90), lançados em outubro.
select ajustar_relogio(('2026-10-05 12:00-03'::timestamptz - now()));
create temp table cs as select
  (portal_financeiro_conta_lancar(diego, rm, jsonb_build_object('descricao', 'Aluguel da sala', 'fornecedor', 'Imobiliária Paulista',
     'categoria', 'ALUGUEL', 'valor', 360000, 'vencimento', '2026-10-20', 'forma', 'BOLETO', 'repete', true)) ->> 'recorrenteId')::uuid aluguel,
  (portal_financeiro_conta_lancar(diego, rm, jsonb_build_object('descricao', 'Sistema de petições', 'categoria', 'FORNECEDORES',
     'valor', 18990, 'vencimento', '2026-10-21', 'repete', true)) ->> 'recorrenteId')::uuid peticoes
  from ids;
select ajustar_relogio(('2026-11-18 12:00-03'::timestamptz - now()));
select portal_financeiro_pagar(diego, rm) from ids;
create temp table nov as select
  (select id from contas_pagar where recorrente_id = cs.aluguel and mes = '2026-11-01') aluguel,
  (select id from contas_pagar where recorrente_id = cs.peticoes and mes = '2026-11-01') peticoes,
  (select id from contas_pagar where recorrente_id = cs.aluguel and mes = '2026-10-01') aluguel_out
  from cs;
select portal_financeiro_conta_paga(diego, rm, nov.aluguel_out, '{"pagaEm": "2026-10-19", "valor": 360000}'::jsonb) from ids, nov;

-- Área e isolamento.
select is((teste.erro($$ select portal_recorrencias(paula, rm) from ids $$)) -> 'detalhe' ->> 'motivo', 'AREA_NAO_LIBERADA',
  'PA-01: sem a área Financeiro, a lista é recusada');
select is((teste.erro($$ select portal_recorrencia_mudar(paula, rm, cs.aluguel, '{"tipo": "VALOR"}'::jsonb) from ids, cs $$)) -> 'detalhe' ->> 'motivo',
  'AREA_NAO_LIBERADA', 'PA-01: sem a área Financeiro, mudar é recusado');
select is((teste.erro($$ select portal_recorrencia(intrusa, outro, cs.aluguel) from ids, cs $$)) ->> 'codigo', 'TC404',
  'PT-01: a conta de outro escritório não existe para ele');

-- A lista.
select is((select jsonb_array_length(portal_recorrencias(diego, rm) -> 'ativas') from ids), 2, 'duas contas que repetem, ativas');
select is((select (portal_recorrencias(diego, rm) -> 'ativas' -> 0) - 'doMes' from ids, cs),
  jsonb_build_object('id', (select aluguel from cs), 'descricao', 'Aluguel da sala', 'fornecedor', 'Imobiliária Paulista', 'categoria', 'ALUGUEL',
    'forma', 'BOLETO', 'valor', 360000, 'dia', 20, 'desde', '2026-10-01', 'ultimoMes', null, 'encerrada', null,
    'proxima', jsonb_build_object('mes', '2026-12-01', 'valor', 360000, 'dia', 20, 'vencimento', '2026-12-20'), 'lancadas', 2, 'pagas', 1),
  'a linha: valor, dia, desde quando, a próxima conta, lançadas e pagas');
select is((select portal_recorrencias(diego, rm) -> 'ativas' -> 0 -> 'doMes' ->> 'situacao' from ids), 'A_VENCER', 'o que aconteceu no mês');

-- Mudar: erros.
select is((teste.erro($$ select portal_recorrencia_mudar(diego, rm, cs.aluguel, '{"tipo": "VALOR"}'::jsonb) from ids, cs $$)) -> 'detalhe' -> 'motivos',
  '{"aPartirDe": "MES_OBRIGATORIO", "valor": "VALOR_OBRIGATORIO", "dia": "DIA_INVALIDO"}'::jsonb, 'sem o mês, o valor e o dia');
select is((teste.erro($$ select portal_recorrencia_mudar(diego, rm, cs.aluguel, '{"tipo": "VALOR", "aPartirDe": "2026-10-01", "valor": 378000, "dia": 31}'::jsonb) from ids, cs $$)) -> 'detalhe' -> 'motivos',
  '{"aPartirDe": "MES_PASSADO", "dia": "DIA_INVALIDO"}'::jsonb, 'mês que passou e dia 31 (vale 1 a 28 ou o último)');

-- Mudar a partir de dezembro: novembro, já lançada, não muda.
create temp table m1 as select portal_recorrencia_mudar(diego, rm, cs.aluguel,
  '{"tipo": "VALOR", "aPartirDe": "2026-12-01", "valor": 378000, "dia": 20, "motivo": "Reajuste anual do aluguel (IGP-M)"}'::jsonb) r from ids, cs;
select is((select r ->> 'mudouConta' from m1), 'false', 'a partir de dezembro: a conta de novembro não mudou');
select is((select valor from contas_pagar, nov where id = nov.aluguel), 360000::bigint, 'novembro continua R$ 3.600,00');
select is((select portal_recorrencia(diego, rm, cs.aluguel) -> 'proxima' from ids, cs),
  '{"mes": "2026-12-01", "valor": 378000, "dia": 20, "vencimento": "2026-12-20"}'::jsonb, 'a próxima conta já tem o valor novo');
select is((select (portal_recorrencia(diego, rm, cs.aluguel) -> 'mudancas' -> 0) - 'id' - 'em' from ids, cs),
  jsonb_build_object('tipo', 'VALOR', 'aPartirDe', '2026-12-01', 'valor', 378000, 'dia', 20, 'antes', jsonb_build_object('valor', 360000, 'dia', 20),
    'motivo', 'Reajuste anual do aluguel (IGP-M)', 'detalhe', null, 'por', jsonb_build_object('id', (select diego from ids), 'nome', 'Diego Almeida'),
    'mudouConta', false, 'cancelouConta', false),
  'a mudança fica na ficha: de quanto para quanto, quem fez e o motivo');

-- Mudar a partir de novembro, com dia no último do mês: a conta de novembro, aberta, muda junto.
create temp table m2 as select portal_recorrencia_mudar(diego, rm, cs.peticoes,
  '{"tipo": "VALOR", "aPartirDe": "2026-11-01", "valor": 21990, "dia": 0}'::jsonb) r from ids, cs;
select is((select r ->> 'mudouConta' from m2), 'true', 'a partir de novembro: a conta lançada e não paga muda junto');
select is((select (valor, vencimento)::text from contas_pagar, nov where id = nov.peticoes), '(21990,2026-11-30)', 'R$ 219,90, no último dia de novembro');

-- Conta paga nunca muda: a de outubro do aluguel ficou como estava.
select is((select (valor, valor_pago)::text from contas_pagar, nov where id = nov.aluguel_out), '(360000,360000)', 'conta paga não muda');
select throws_ok($$ update contas_pagar set valor = 1 where id = (select aluguel from nov) $$, 'TC023', null, 'fora da mudança, a conta não muda de valor');
select throws_ok($$ delete from recorrencia_mudancas $$, 'TC023', null, 'as mudanças não se apagam');

-- O tempo passa: dezembro e janeiro nascem com o valor e o dia que valem neles.
select ajustar_relogio(('2027-01-03 09:00-03'::timestamptz - now()));
select portal_financeiro_pagar(diego, rm) from ids;
select is((select (valor, vencimento)::text from contas_pagar, cs where recorrente_id = cs.aluguel and mes = '2026-12-01'), '(378000,2026-12-20)',
  'dezembro do aluguel nasceu com o valor novo');
select is((select (valor, vencimento)::text from contas_pagar, cs where recorrente_id = cs.peticoes and mes = '2027-01-01'), '(21990,2027-01-31)',
  'janeiro do sistema nasceu no último dia');

-- Encerrar: erros.
select is((teste.erro($$ select portal_recorrencia_mudar(diego, rm, cs.peticoes, '{"tipo": "ENCERRAR", "aPartirDe": "2027-01-01"}'::jsonb) from ids, cs $$)) -> 'detalhe' -> 'motivos',
  '{"aPartirDe": "MES_PASSADO", "motivo": "MOTIVO_OBRIGATORIO"}'::jsonb, 'encerrar vale da próxima em diante e pede o motivo');
select is((teste.erro($$ select portal_recorrencia_mudar(diego, rm, cs.peticoes, '{"tipo": "ENCERRAR", "aPartirDe": "2027-03-01", "motivo": "Outro", "cancelarLancada": true}'::jsonb) from ids, cs $$)) -> 'detalhe' -> 'motivos',
  '{"detalhe": "DETALHE_OBRIGATORIO", "cancelarLancada": "SO_COM_A_PROXIMA"}'::jsonb, '"Outro" pede o detalhe; cancelar a do mês só encerrando a partir da próxima');

-- Encerrar o sistema a partir de fevereiro, cancelando a de janeiro.
create temp table jan as select (select id from contas_pagar, cs where recorrente_id = cs.peticoes and mes = '2027-01-01') id from cs;
create temp table e1 as select portal_recorrencia_mudar(diego, rm, cs.peticoes, jsonb_build_object('tipo', 'ENCERRAR', 'aPartirDe', '2027-02-01',
  'motivo', 'Troquei de fornecedor', 'detalhe', 'Passamos a usar o sistema do novo fornecedor.', 'cancelarLancada', true)) r from ids, cs;
select is((select r ->> 'cancelouConta' from e1), 'true', 'a conta de janeiro foi cancelada');
select is((select conta_situacao(c) from contas_pagar c, jan where c.id = jan.id), 'CANCELADA', 'fica no histórico como cancelada');
select is((select cancelada_motivo from contas_pagar c, jan where c.id = jan.id), 'Troquei de fornecedor. Passamos a usar o sistema do novo fornecedor.', 'com o motivo');
select is((select (portal_financeiro_pagar(diego, rm, 'MES') -> 'categorias') from ids),
  '[{"valor": 378000, "categoria": "ALUGUEL"}]'::jsonb, 'a cancelada sai das saídas do mês');
select is((select saidas_previstas(rm, '2027-01-01', true) from ids), 378000::bigint, 'e das saídas previstas');
select is((teste.erro($$ select portal_financeiro_conta_paga(diego, rm, jan.id, '{"pagaEm": "2027-01-03", "valor": 21990}'::jsonb) from ids, jan $$)) -> 'detalhe' ->> 'motivo',
  'CONTA_CANCELADA', 'conta cancelada não se paga');
select is((teste.erro($$ select portal_recorrencia_mudar(diego, rm, cs.peticoes, '{"tipo": "VALOR", "aPartirDe": "2027-02-01", "valor": 100, "dia": 1}'::jsonb) from ids, cs $$)) -> 'detalhe' ->> 'motivo',
  'JA_ENCERRADA', 'encerrada não muda mais');

-- Em fevereiro, o sistema não nasce; ele desce para as encerradas.
select ajustar_relogio(('2027-02-02 09:00-03'::timestamptz - now()));
select portal_financeiro_pagar(diego, rm) from ids;
select is((select count(*) from contas_pagar, cs where recorrente_id = cs.peticoes and mes >= '2027-02-01'), 0::bigint, 'depois de encerrar, nenhuma conta nasce');
select is((select jsonb_build_object('ativas', jsonb_array_length(x -> 'ativas'), 'encerrada', x -> 'encerradas' -> 0 -> 'encerrada' ->> 'motivo',
                                     'ultimoMes', x -> 'encerradas' -> 0 ->> 'ultimoMes')
             from (select portal_recorrencias(diego, rm) x from ids) s),
  '{"ativas": 1, "encerrada": "Troquei de fornecedor", "ultimoMes": "2027-01-01"}'::jsonb, 'na lista, a encerrada fica embaixo, com o motivo e o último mês');
select is((select count(*) from contas_pagar, cs where recorrente_id = cs.peticoes), 4::bigint, 'nada se apagou: outubro a janeiro continuam lá');

select * from finish();
rollback;
