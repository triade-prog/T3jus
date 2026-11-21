-- "Não foi paga" na folha "Pago antes do T3jus" (F3.84, VA-05): só quem tem Financeiro; motivo
-- obrigatório; a parcela volta para A receber com o vencimento da planilha (já vencida) ou outra
-- data; a cobrança fica com quem cuida do contrato; nenhum aviso automático por passo de antes;
-- conflito quando outra pessoa já mudou; "Foi paga, sim" só sem movimento; o histórico; desfazer
-- a importação conta o contrato como mexido; isolamento (PT-01, PT-03, PT-09, PT-19).
begin;
select plan(30);

select ajustar_relogio(('2026-09-01 10:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Felipe Matos') as felipe,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, diego, 'Diego Almeida', array['COMERCIAL', 'CONTRATOS', 'FINANCEIRO']),
       portal_convidar(socia, rm, felipe, 'Felipe Matos', array['CONTRATOS']) from ids;

create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Rosa Almeida', 'origem', 'GOOGLE', 'documento', '52998224725',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Rosa Almeida', 'telefone', '+5511984512290', 'principal', true)))) ->> 'id')::uuid rosa
  from ids;

-- Seis parcelas de R$ 800,00 a partir de 10/09; a planilha disse que as duas primeiras foram pagas.
create temp table ct as select
  (portal_contrato_criar(socia, rm, jsonb_build_object('clienteId', cli.rosa, 'objeto', 'Aposentadoria por idade',
     'responsavelId', ids.socia, 'advogados', jsonb_build_array(ids.socia),
     'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'PARCELADO', 'total', 480000, 'parcelas', 6, 'primeiro', '2026-09-10')))) ->> 'id')::uuid id
  from ids, cli;
select portal_contrato_assinatura(socia, rm, ct.id, 1, '2026-09-01') from ids, ct;
select ajustar_relogio(('2026-11-18 10:12-03'::timestamptz - now()));
create temp table ps as select r.id, row_number() over (order by r.vencimento) n from recebimentos_previstos r, ct where r.contrato_id = ct.id;
update recebimentos_previstos r set pago_antes = true, cancelado_em = app_now(), cancelado_motivo = 'Paga antes do T3jus (importação)'
  from ps where ps.id = r.id and ps.n <= 2;
create temp table p1 as select id from ps where n = 1;
create temp table p2 as select id from ps where n = 2;
create temp table p3 as select id from ps where n = 3;

-- Quem pode.
select is((teste.erro($$ select portal_pago_antes_nao_paga(felipe, rm, ct.id, p2.id, '{"motivo": "A planilha estava errada"}') from ids, ct, p2 $$)) -> 'detalhe' ->> 'motivo',
  'AREA_NAO_LIBERADA', 'F3.84: sem a área Financeiro, não passa para A receber');
select is((teste.erro($$ select portal_pago_antes_nao_paga(intrusa, outro, ct.id, p2.id, '{"motivo": "A planilha estava errada"}') from ids, ct, p2 $$)) ->> 'codigo',
  'TC404', 'PT-01: o contrato de outro escritório não aparece');
select is((select (portal_contrato(felipe, rm, ct.id) ->> 'podeMarcarNaoPaga')::boolean from ids, ct), false, 'decisão 11: Felipe vê a folha sem o botão');
select is((select jsonb_agg(x ->> 'nome' order by x ->> 'nome') from ids, ct, jsonb_array_elements(portal_contrato(felipe, rm, ct.id) -> 'quemFinanceiro') x),
  '["Diego Almeida", "Marina Ribeiro"]'::jsonb, 'decisão 11: o pé diz quem tem a área Financeiro');
select is((select (portal_contrato(diego, rm, ct.id) ->> 'podeMarcarNaoPaga')::boolean from ids, ct), true, 'decisão 1: Diego, com Financeiro, tem o botão');

-- Recusas.
select is((teste.erro($$ select portal_pago_antes_nao_paga(diego, rm, ct.id, p3.id, '{"motivo": "A planilha estava errada"}') from ids, ct, p3 $$)) -> 'detalhe' ->> 'motivo',
  'NAO_E_PAGO_ANTES', 'só a parcela que veio paga antes');
select is((teste.erro($$ select portal_pago_antes_nao_paga(diego, rm, ct.id, p2.id, '{"motivo": " "}') from ids, ct, p2 $$)) -> 'detalhe' -> 'campos',
  '["motivo"]'::jsonb, 'decisão 5: o motivo é obrigatório');
select is((teste.erro($$ select portal_pago_antes_nao_paga(diego, rm, ct.id, p2.id, '{"motivo": "Combinado com a cliente", "vencimento": "2031-01-01"}') from ids, ct, p2 $$)) -> 'detalhe' ->> 'motivo',
  'VENCIMENTO_INVALIDO', 'a outra data não vai a mais de três anos');
select is((teste.erro($$ select portal_pago_antes_nao_paga(diego, rm, ct.id, p2.id, '{"motivo": "Combinado com a cliente", "vencimento": "2026-02-31"}') from ids, ct, p2 $$)) -> 'detalhe' -> 'campos',
  '["vencimento"]'::jsonb, 'data que não existe é recusada');

-- Não foi paga, com o vencimento da planilha.
create temp table np as select portal_pago_antes_nao_paga(diego, rm, ct.id, p2.id, '{"vencimento": "ORIGINAL", "motivo": "A cliente diz que não pagou a de outubro"}') j from ids, ct, p2;
create temp table nova as select (j ->> 'id')::uuid id from np;
select is((select j ->> 'vencimento' from np) || ' ' || (select j ->> 'situacao' from np) || ' ' || (select j ->> 'valor' from np),
  '2026-10-10 VENCIDA 80000', 'pergunta 1: mantém o vencimento da planilha e entra já vencida, com o mesmo valor');
select is((select (j ->> 'eraPagoAntes')::boolean and (j ->> 'semAvisoAutomatico')::boolean from np), true, 'decisão 9: marca "era paga antes" e "sem aviso automático"');
select is((select jsonb_build_array(j -> 'cobranca' ->> 'proxOque', j -> 'cobranca' ->> 'proxData', j -> 'cobranca' -> 'proxResponsavel' ->> 'nome') from np),
  '["Falar com Rosa Almeida", "2026-11-19", "Marina Ribeiro"]'::jsonb, 'pergunta 4: quem cuida do contrato fala com a cliente amanhã');
select is((select r.cancelado_em is not null and r.pago_antes from recebimentos_previstos r, p2 where r.id = p2.id), true, 'a linha da planilha não muda (nada se apaga)');

-- A ficha: a folha só com a outra parcela; a nova na programação; o histórico.
create temp table fc as select portal_contrato(diego, rm, ct.id) f from ids, ct;
select is((select count(*)::int from fc, jsonb_array_elements(f -> 'recebimentos') r where (r ->> 'pagoAntes')::boolean and not (r ->> 'corrigida')::boolean), 1,
  'decisão 8: na folha fica só a parcela 1');
select is((select (r ->> 'podeVoltar')::boolean from fc, jsonb_array_elements(f -> 'recebimentos') r, nova where r ->> 'id' = nova.id::text), true,
  'pergunta 2: dá para voltar atrás enquanto nada foi feito');
select is((select jsonb_build_array(m ->> 'tipo', m ->> 'vencimento', m ->> 'motivo', m -> 'por' ->> 'nome') from fc, jsonb_array_elements(f -> 'mudancasPagoAntes') m),
  '["NAO_PAGA", "2026-10-10", "A cliente diz que não pagou a de outubro", "Diego Almeida"]'::jsonb, 'decisão 8: o histórico dos recebimentos diz quem, o vencimento e o motivo');
select is((select h ->> 'acao' from fc, jsonb_array_elements(f -> 'historico') h limit 1), 'contrato.parcela_nao_paga', 'PT-03: vai para o histórico do contrato');
select is((select (portal_financeiro_receber(socia, rm, 'VENCIDAS') -> 'totais' -> 'vencidas' ->> 'valor')::bigint from ids), 160000::bigint,
  'decisão 9: entra em Vencidas de A receber, junto da parcela 3');

-- Conflito: outra pessoa já passou a mesma parcela.
select is((teste.erro($$ select portal_pago_antes_nao_paga(socia, rm, ct.id, p2.id, '{"motivo": "A planilha estava errada"}') from ids, ct, p2 $$)) -> 'detalhe' ->> 'motivo',
  'JA_MUDADA', 'decisão 7: se outra pessoa mudou, a janela diz quem');
select is((teste.erro($$ select portal_pago_antes_nao_paga(socia, rm, ct.id, p2.id, '{"motivo": "A planilha estava errada"}') from ids, ct, p2 $$)) -> 'detalhe' -> 'por' ->> 'nome',
  'Diego Almeida', 'decisão 7: com o nome de quem mudou');

-- Avisos automáticos (pergunta 3): a parcela que volta vencida não entra na cobrança de atraso.
select portal_automacoes(socia, rm) from ids;
update automacoes set entram_ja_atrasados = true where escritorio_id = (select rm from ids) and gatilho = 'PARCELA_ATRASO';
select is((select count(*)::int from automacoes a, automacao_candidatos(a) x, nova where a.escritorio_id = (select rm from ids) and x.origem_id = nova.id), 0,
  'pergunta 3: nenhum aviso automático por esta parcela');
select is((select count(*)::int from automacoes a, automacao_candidatos(a) x, p3
            where a.escritorio_id = (select rm from ids) and a.gatilho = 'PARCELA_ATRASO' and x.origem_id = p3.id), 1,
  'a parcela 3, vencida de verdade, continua entrando');

-- Outra data, combinada com a cliente: entra a vencer.
create temp table np1 as select portal_pago_antes_nao_paga(diego, rm, ct.id, p1.id, '{"vencimento": "2026-12-05", "motivo": "Combinado com a cliente"}') j from ids, ct, p1;
select is((select j ->> 'situacao' from np1) || ' ' || (select (j ->> 'semAvisoAutomatico') from np1), 'A_VENCER false',
  'pergunta 3: com outra data, os lembretes de antes do vencimento voltam a valer');

-- Foi paga, sim.
select is((teste.erro($$ select portal_pago_antes_foi_paga(diego, rm, nova.id, '{"motivo": ""}') from ids, nova $$)) -> 'detalhe' -> 'campos',
  '["motivo"]'::jsonb, 'decisão 10: voltar também pede motivo');
select portal_pago_antes_foi_paga(diego, rm, nova.id, '{"motivo": "Achou o comprovante"}') from ids, nova;
select is((select count(*)::int from ids, ct, jsonb_array_elements(portal_contrato(diego, rm, ct.id) -> 'recebimentos') r
            where (r ->> 'pagoAntes')::boolean and not (r ->> 'corrigida')::boolean), 1, 'decisão 10: a parcela 2 volta para a folha (a 1 saiu)');
select is((select (portal_financeiro_receber(socia, rm, 'VENCIDAS') -> 'totais' -> 'vencidas' ->> 'valor')::bigint from ids), 80000::bigint,
  'decisão 10: sai de A receber (fica só a parcela 3)');
select is((teste.erro($$ select portal_pago_antes_foi_paga(diego, rm, nova.id, '{"motivo": "De novo"}') from ids, nova $$)) -> 'detalhe' ->> 'motivo',
  'JA_VOLTOU', 'não volta duas vezes');
-- Com recebimento registrado, não volta mais.
create temp table nova1 as select (j ->> 'id')::uuid id from np1;
select portal_financeiro_receber_registrar(diego, rm, nova1.id, jsonb_build_object('valor', 30000, 'recebidoEm', '2026-11-18', 'forma', 'PIX')) from ids, nova1;
select is((teste.erro($$ select portal_pago_antes_foi_paga(diego, rm, nova1.id, '{"motivo": "Achou o comprovante"}') from ids, nova1 $$)) -> 'detalhe',
  '{"motivo": "JA_TEM_MOVIMENTO", "qual": "RECEBIMENTO"}'::jsonb, 'decisão 10: depois de um recebimento, o caminho é o de sempre');

-- PT-03: as mudanças só se acrescentam.
select throws_ok($$ delete from pago_antes_mudancas $$, 'TC023', null, 'PT-03: as mudanças não se apagam');
select is((select count(*)::int from pago_antes_mudancas), 3, 'NAO_PAGA, NAO_PAGA e FOI_PAGA, nesta ordem de fatos');

select * from finish();
rollback;
