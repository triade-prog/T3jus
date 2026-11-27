-- O êxito marcado como não cobrado na divisão do alvará (1104; F3.191: CH-07, FI-05; também PT-01,
-- PT-02, PT-03, PT-11, IN-04). Plano F3.194/F3.192/F3.191 v5, Parte C, e desenho D40 aprovados pela
-- Carol em 26/11/2026, com a C1 = (a), "Cobrar com motivo escrito": a linha sai da proposta, a janela
-- pede "Deixar sem" ou "Cobrar", e o "Cobrar" exige o combinado escrito e a confirmação do cliente,
-- nunca para Indevido e nunca acima do êxito calculado.
begin;
select plan(85);

create function pg_temp.fim() returns void language plpgsql as $$
begin
  set constraints all immediate;
  set constraints caso_pronto_fim, caso_pronto_fim_mudou, caso_pronto_fim_saiu, destinacoes_fecham, caso_fechou_fim deferred;
end $$;

select ajustar_relogio(('2026-10-01 10:00-03'::timestamptz - now()));
create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Felipe Matos') as felipe,
  teste.pessoa('Larissa Costa') as larissa,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, diego, 'Diego Almeida', array['FINANCEIRO', 'COMERCIAL']),
       portal_convidar(socia, rm, felipe, 'Felipe Matos', array['FINANCEIRO']),
       portal_convidar(socia, rm, larissa, 'Larissa Costa', array['JURIDICO']) from ids;
select portal_juridico_casos(socia, rm) from ids;
select portal_juridico_casos(intrusa, outro) from ids;

create function pg_temp.cliente(p_nome text, p_tel text) returns uuid language sql as $$
  select (portal_cliente_cadastrar(ids.socia, ids.rm, jsonb_build_object('tipo', 'PF', 'nome', p_nome, 'origem', 'GOOGLE',
    'contatos', jsonb_build_array(jsonb_build_object('nome', p_nome, 'telefone', p_tel, 'principal', true)))) ->> 'id')::uuid from ids
$$;
create function pg_temp.contrato(p_cliente uuid, p_pct integer default 2000) returns uuid language sql as $$
  select (portal_contrato_criar(ids.socia, ids.rm, jsonb_build_object('clienteId', p_cliente, 'objeto', 'Seguro de vida',
    'responsavelId', ids.larissa, 'advogados', jsonb_build_array(ids.socia),
    'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'EXITO', 'percentual', p_pct, 'sobre', 'acordo', 'etapa', 'Encerrado', 'dias', 0)))) ->> 'id')::uuid from ids
$$;

-- Sebastião (Perdoado, o caso do desenho), Tânia (Indevido), Úrsula (Outro, conferido por Felipe),
-- Vera (Perdoado, dois alvarás), Wagner (para conferir), Xavier (lançado) e Yara (marcada como não
-- cobrada com a janela aberta), todos no mesmo caso. Os três de outro caso (em andamento) servem à
-- conta do percentual.
create temp table cli as select
  pg_temp.cliente('Sebastião Prado', '+5511973104482') seb, pg_temp.cliente('Tânia Prado', '+5511973104483') tania,
  pg_temp.cliente('Úrsula Prado', '+5511973104484') ursula, pg_temp.cliente('Vera Prado', '+5511973104485') vera,
  pg_temp.cliente('Wagner Prado', '+5511973104486') wagner, pg_temp.cliente('Xavier Prado', '+5511973104487') xavier,
  pg_temp.cliente('Yara Prado', '+5511973104488') yara,
  pg_temp.cliente('Paulo Lima', '+5511973104489') p30, pg_temp.cliente('Pedro Lima', '+5511973104490') p155,
  pg_temp.cliente('Priscila Lima', '+5511973104491') p3333;
create temp table ct as select pg_temp.contrato(seb) seb, pg_temp.contrato(tania) tania, pg_temp.contrato(ursula) ursula,
  pg_temp.contrato(vera) vera, pg_temp.contrato(wagner) wagner, pg_temp.contrato(xavier) xavier, pg_temp.contrato(yara) yara,
  pg_temp.contrato(p30, 3000) p30, pg_temp.contrato(p155, 1550) p155, pg_temp.contrato(p3333, 3333) p3333 from cli;
select portal_contrato_assinatura(socia, rm, x, 1, '2026-10-01') from ids, ct,
  unnest(array[ct.seb, ct.tania, ct.ursula, ct.vera, ct.wagner, ct.xavier, ct.yara, ct.p30, ct.p155, ct.p3333]) x;
create temp table cs as select
  (portal_juridico_caso_criar(socia, rm, jsonb_build_object('nome', 'Prado x Seguradora Lince', 'area', 'CIVEL',
    'etapaId', (select id from etapas where escritorio_id = ids.rm and ordem = 5), 'responsavelId', ids.larissa,
    'clientes', jsonb_build_array(
      jsonb_build_object('clienteId', cli.seb, 'papel', 'AUTOR', 'contratoId', ct.seb),
      jsonb_build_object('clienteId', cli.tania, 'papel', 'AUTOR', 'contratoId', ct.tania),
      jsonb_build_object('clienteId', cli.ursula, 'papel', 'AUTOR', 'contratoId', ct.ursula),
      jsonb_build_object('clienteId', cli.vera, 'papel', 'AUTOR', 'contratoId', ct.vera),
      jsonb_build_object('clienteId', cli.wagner, 'papel', 'AUTOR', 'contratoId', ct.wagner),
      jsonb_build_object('clienteId', cli.xavier, 'papel', 'AUTOR', 'contratoId', ct.xavier),
      jsonb_build_object('clienteId', cli.yara, 'papel', 'AUTOR', 'contratoId', ct.yara)))) ->> 'id')::uuid id,
  (portal_juridico_caso_criar(socia, rm, jsonb_build_object('nome', 'Lima x Banco Aurora', 'area', 'CIVEL',
    'etapaId', (select id from etapas where escritorio_id = ids.rm and ordem = 5), 'responsavelId', ids.larissa,
    'clientes', jsonb_build_array(
      jsonb_build_object('clienteId', cli.p30, 'papel', 'AUTOR', 'contratoId', ct.p30),
      jsonb_build_object('clienteId', cli.p155, 'papel', 'AUTOR', 'contratoId', ct.p155),
      jsonb_build_object('clienteId', cli.p3333, 'papel', 'AUTOR', 'contratoId', ct.p3333)))) ->> 'id')::uuid lima
  from ids, cli, ct;

create function pg_temp.prop(p_cliente uuid, p_valor bigint, p_quem uuid default null) returns jsonb language sql as $$
  select portal_financeiro_repasse_proposta(coalesce(p_quem, ids.diego), ids.rm, jsonb_build_object('casoId', cs.id, 'clienteId', p_cliente, 'valor', p_valor)) from ids, cs
$$;
create function pg_temp.exito(p_cliente uuid) returns uuid language sql as $$
  select x.id from exitos_conferir x, cs where x.caso_id = cs.id and x.cliente_id = p_cliente
$$;
-- O registrar com a divisão: honorários de p_hon (0 sem a linha), o resto para o cliente, e os campos.
create function pg_temp.reg(p_cliente uuid, p_valor bigint, p_hon bigint, p_campos jsonb, p_dia date default '2026-11-18') returns jsonb language sql as $$
  select portal_financeiro_levantamento_registrar(ids.diego, ids.rm, jsonb_build_object('tipo', 'ALVARA', 'casoId', cs.id, 'clienteId', p_cliente,
    'valor', p_valor, 'entrouEm', p_dia, 'exitoBaixadoVisto', '[]'::jsonb,
    'divisao', jsonb_build_array(jsonb_build_object('para', 'CLIENTE', 'valor', p_valor - p_hon))
               || case when p_hon > 0 then jsonb_build_array(jsonb_build_object('para', 'HONORARIOS', 'nome', 'Honorários de êxito',
                                                                                 'regra', 'Regra escrita na tela', 'valor', p_hon))
                       else '[]'::jsonb end) || p_campos)
    from ids, cs
$$;
create function pg_temp.visto(p_cliente uuid) returns jsonb language sql as $$
  select jsonb_build_object('exitoNaoCobradoVisto', jsonb_build_array(pg_temp.exito(p_cliente)))
$$;
create function pg_temp.cobrar(p_cliente uuid, p_comb text default 'Sebastião aceitou pagar o êxito com este alvará, por telefone em 17/11.',
                               p_concordou jsonb default 'true'::jsonb) returns jsonb language sql as $$
  select pg_temp.visto(p_cliente) || jsonb_build_object('cobrarExitoNaoCobrado',
    jsonb_strip_nulls(jsonb_build_object('exitoId', pg_temp.exito(p_cliente), 'explicacao', p_comb, 'clienteConcordou', p_concordou)))
$$;
create function pg_temp.hon(p_lev jsonb) returns uuid language sql as $$
  select id from destinacoes where levantamento_id = (p_lev ->> 'id')::uuid and para = 'HONORARIOS'
$$;

-- 10/11, às 16h30: Marina encerra o caso com acordo (R$ 15.000,00 de cada um); às 16h40, confere.
select ajustar_relogio(('2026-11-10 16:30-03'::timestamptz - now()));
select portal_juridico_caso_etapa(socia, rm, cs.id, (select versao from casos where id = cs.id), jsonb_build_object(
  'etapaId', (select id from etapas where escritorio_id = ids.rm and final), 'motivo', 'Acordo homologado', 'resultado', 'ACORDO',
  'previstoEm', '2026-12-15', 'valores', jsonb_build_object(cli.seb, 1500000, cli.tania, 1500000, cli.ursula, 1500000, cli.vera, 1500000,
                                                            cli.wagner, 1500000, cli.xavier, 1500000, cli.yara, 1500000))) from ids, cs, cli;
select pg_temp.fim();
select ajustar_relogio(('2026-11-10 16:40-03'::timestamptz - now()));
select portal_financeiro_exito_nao_cobrar(socia, rm, pg_temp.exito(cli.seb), '{"motivo": "PERDOADO", "explicacao": "Sebastião indicou três clientes; combinamos não cobrar o êxito."}'),
       portal_financeiro_exito_nao_cobrar(socia, rm, pg_temp.exito(cli.tania), '{"motivo": "INDEVIDO", "explicacao": "O acordo foi só sobre danos morais, que o contrato não cobre."}'),
       portal_financeiro_exito_nao_cobrar(felipe, rm, pg_temp.exito(cli.ursula), '{"motivo": "OUTRO", "explicacao": "Combinado na reunião de 10/11."}'),
       portal_financeiro_exito_nao_cobrar(socia, rm, pg_temp.exito(cli.vera), '{"motivo": "PERDOADO", "explicacao": "Renegociado com a cliente."}'),
       portal_financeiro_exito_lancar(diego, rm, pg_temp.exito(cli.xavier), '{"valor": 300000, "vencimento": "2026-12-15", "forma": "PIX"}')
  from ids, cli;
select pg_temp.fim();
-- 12/11: o primeiro alvará de Vera (R$ 5.000,00), com R$ 1.000,00 cobrados.
select ajustar_relogio(('2026-11-12 11:00-03'::timestamptz - now()));
create temp table lev as select pg_temp.reg(vera, 500000, 100000, pg_temp.cobrar(vera, 'Vera aceitou pagar parte do êxito.'), '2026-11-12') vera1 from cli;
select pg_temp.fim();
-- Hoje: quarta-feira, 18/11/2026, às 10h12. Diego registra.
select ajustar_relogio(('2026-11-18 10:12-03'::timestamptz - now()));
create temp table prop_seb as select pg_temp.prop(seb, 1500000) v from cli;
create temp table prop_yara as select pg_temp.prop(yara, 1500000) v from cli;

-- ---------------------------------------------------------------------------------------
-- 1. A proposta vem sem a linha de honorários e com exitoNaoCobrado completo.
select is((select v -> 'linhas' from prop_seb), '[]'::jsonb, 'CH-07, FI-05: com o êxito não cobrado, a proposta vem sem a linha de honorários');
select is((select (v ->> 'cliente')::bigint from prop_seb), 1500000::bigint, 'e Sebastião fica com os R$ 15.000,00');
select is((select (v -> 'exitoNaoCobrado') - 'conferido' - 'avisados' - 'contrato' - 'explicacao' - 'exitoId' from prop_seb),
  jsonb_build_object('calculado', 300000, 'percentual', 2000, 'sobre', 'acordo', 'motivo', 'PERDOADO', 'podeCobrar', true, 'jaCobrado', 0,
    'limite', 300000, 'cobrancas', '[]'::jsonb,
    'regra', '20% · acordo · contrato ' || (select numero from contratos, ct where id = ct.seb) || ' · combinado com Sebastião',
    'honorarios', jsonb_build_object('para', 'HONORARIOS', 'nome', 'Honorários de êxito', 'valor', 300000,
                                     'regra', '20% · acordo · contrato ' || (select numero from contratos, ct where id = ct.seb) || ' · combinado com Sebastião')),
  'CH-07: exitoNaoCobrado traz o calculado, o motivo, podeCobrar, jaCobrado, limite e a linha de honorários do "Cobrar"');
select is((select jsonb_build_array(v -> 'exitoNaoCobrado' ->> 'exitoId', v -> 'exitoNaoCobrado' -> 'conferido' -> 'por' ->> 'nome',
                                    v -> 'exitoNaoCobrado' ->> 'explicacao', v -> 'exitoNaoCobrado' -> 'contrato' ->> 'numero') from prop_seb),
  (select jsonb_build_array(pg_temp.exito(cli.seb), 'Marina Ribeiro', 'Sebastião indicou três clientes; combinamos não cobrar o êxito.',
                            (select numero from contratos where id = ct.seb)) from cli, ct),
  'o êxito, quem conferiu, a explicação e o contrato');
select is((select jsonb_agg(a ->> 'nome' order by o) from prop_seb, jsonb_array_elements(v -> 'exitoNaoCobrado' -> 'avisados') with ordinality t(a, o)),
  '["Marina Ribeiro", "Larissa Costa"]'::jsonb, 'avisados: Marina (conferiu e encerrou, uma vez só) e Larissa (responsável), sem Diego, que pede');
select is((select jsonb_agg(a ->> 'nome' order by o) from cli, jsonb_array_elements(pg_temp.prop(cli.seb, 1500000, (select socia from ids)) -> 'exitoNaoCobrado' -> 'avisados') with ordinality t(a, o)),
  '["Larissa Costa"]'::jsonb, 'quem pede a proposta sai da lista dos avisados');
select is((select jsonb_agg(a ->> 'nome' order by o) from cli, jsonb_array_elements(pg_temp.prop(cli.ursula, 1500000) -> 'exitoNaoCobrado' -> 'avisados') with ordinality t(a, o)),
  '["Felipe Matos", "Marina Ribeiro", "Larissa Costa"]'::jsonb, 'com quem conferiu diferente de quem encerrou, três avisados, na ordem do texto');
select is((select requisicao_parte(ids.rm, cs.id, cli.seb, 1500000) ->> 'valor' from ids, cs, cli), '0', 'FI-05: o "A caminho" não estima esses honorários');

-- ---------------------------------------------------------------------------------------
-- 2. "Deixar sem" (Úrsula, Outro): passa, sem explicação no histórico, e seguiuProposta.
create temp table r_sem as select pg_temp.reg(ursula, 1500000, 0, pg_temp.visto(ursula)) v from cli;
select pg_temp.fim();
-- Daqui em diante, as recusas não gravam nada.
create temp table n_antes as select (select count(*) from levantamentos) lev, (select count(*) from exito_cobrancas_alvara) cob,
  (select count(*) from historico) hist, (select count(*) from avisos_sino) sino;
create function pg_temp.nada_mudou() returns boolean language sql as $$
  select (select count(*) from levantamentos) = n.lev and (select count(*) from exito_cobrancas_alvara) = n.cob
     and (select count(*) from historico) = n.hist and (select count(*) from avisos_sino) = n.sino from n_antes n
$$;
select is((select h.dados - 'exito' - 'conferidoPor' - 'conferidoEm' - 'contrato' from historico h, r_sem
            where h.entidade = 'levantamentos' and h.entidade_id = r_sem.v ->> 'id' and h.acao = 'financeiro.levantamento_exito_nao_cobrado'),
  '{"tipo": "ALVARA", "motivo": "OUTRO", "calculado": 300000}'::jsonb, 'CH-07: "Deixar sem" grava levantamento_exito_nao_cobrado, sem a explicação');
select is((select (h.dados ->> 'seguiuProposta')::boolean from historico h, r_sem
            where h.entidade = 'levantamentos' and h.entidade_id = r_sem.v ->> 'id' and h.acao = 'financeiro.levantamento'),
  true, 'e seguiu a proposta');
select is((select jsonb_build_array(situacao, motivo_nao_cobrar) from exitos_conferir where id = (select pg_temp.exito(ursula) from cli)),
  '["NAO_COBRADO", "OUTRO"]'::jsonb, 'o êxito continua não cobrado');
select is((select count(*)::integer from exito_cobrancas_alvara c, r_sem where c.levantamento_id = (r_sem.v ->> 'id')::uuid), 0, 'e nada é cobrado');
select is((select r_sem.v ->> 'exitoCobrado' from r_sem), 'false', 'a resposta diz que não cobrou');

-- ---------------------------------------------------------------------------------------
-- 3. A parte de honorários sem cobrarExitoNaoCobrado recusa, também a do cliente antigo.
select is((teste.erro($$ select pg_temp.reg(cli.seb, 1500000, 300000, pg_temp.visto(cli.seb)) from cli $$)),
  jsonb_build_object('codigo', 'TC409', 'detalhe', jsonb_build_object('motivo', 'EXITO_NAO_COBRADO', 'exito', (select pg_temp.exito(seb) from cli))),
  'CH-07: os honorários mandados sem a escolha recusam com EXITO_NAO_COBRADO');
select is((teste.erro($$ select pg_temp.reg(cli.seb, 1500000, 300000, '{}'::jsonb) from cli $$)) -> 'detalhe' ->> 'motivo',
  'EXITO_NAO_COBRADO', 'o Portal antigo (sem os campos) também recusa');
select ok(pg_temp.nada_mudou(), 'e nada é gravado');

-- ---------------------------------------------------------------------------------------
-- 5. Salvaguardas (antes do "Cobrar" que passa).
select is((teste.erro($$ select pg_temp.reg(cli.tania, 1500000, 300000, pg_temp.cobrar(cli.tania)) from cli $$)) -> 'detalhe',
  jsonb_build_object('motivo', 'EXITO_INDEVIDO', 'exito', (select pg_temp.exito(tania) from cli)), 'CH-07 (C1): Indevido não se cobra');
select is((select pg_temp.prop(tania, 1500000) -> 'exitoNaoCobrado' -> 'podeCobrar' from cli), 'false'::jsonb, 'e a proposta diz podeCobrar false');
select is((select pg_temp.prop(tania, 1500000) -> 'exitoNaoCobrado' -> 'honorarios' from cli), 'null'::jsonb, 'sem a linha do "Cobrar"');
select is((teste.erro($$ select pg_temp.reg(cli.seb, 1500000, 300000, pg_temp.cobrar(cli.seb, 'ab')) from cli $$)),
  jsonb_build_object('codigo', 'TC422', 'detalhe', jsonb_build_object('motivo', 'COMBINADO_OBRIGATORIO', 'campos', jsonb_build_array('cobrarExitoNaoCobrado.explicacao'))),
  'o combinado com menos de 3 letras recusa');
select is((teste.erro($$ select pg_temp.reg(cli.seb, 1500000, 300000, pg_temp.cobrar(cli.seb, '   ')) from cli $$)) -> 'detalhe' -> 'campos',
  '["cobrarExitoNaoCobrado.explicacao"]'::jsonb, 'só espaços também');
select is((select array_agg((teste.erro(format($f$ select pg_temp.reg(cli.seb, 1500000, 300000, pg_temp.cobrar(cli.seb, p_concordou => %L::jsonb)) from cli $f$, c))
                             -> 'detalhe' -> 'campos' ->> 0) order by c) from unnest(array['false', '"true"', '1', 'null']) c),
  array_fill('cobrarExitoNaoCobrado.clienteConcordou'::text, array[4]),
  'clienteConcordou falso, "true" em texto, 1 ou ausente recusa');
select is((teste.erro($$ select pg_temp.reg(cli.seb, 1500000, 350000, pg_temp.cobrar(cli.seb)) from cli $$)),
  jsonb_build_object('codigo', 'TC422', 'detalhe', jsonb_build_object('motivo', 'EXITO_ACIMA_DO_CALCULADO', 'campos', jsonb_build_array('honorarios'), 'limite', 300000)),
  'acima do calculado recusa, com o limite');
-- Vera: R$ 1.000,00 já cobrados em 12/11; dá para cobrar até R$ 2.000,00.
create temp table prop_vera as select pg_temp.prop(vera, 1500000) v from cli;
select is((select jsonb_build_array(v -> 'exitoNaoCobrado' -> 'jaCobrado', v -> 'exitoNaoCobrado' -> 'limite', v -> 'exitoNaoCobrado' -> 'honorarios' -> 'valor',
                                    v -> 'exitoNaoCobrado' -> 'cobrancas' -> 0 -> 'valor', v -> 'exitoNaoCobrado' -> 'cobrancas' -> 0 ->> 'entrouEm') from prop_vera),
  '[100000, 200000, 200000, 100000, "2026-11-12"]'::jsonb, 'o já cobrado em parte limita a linha do "Cobrar" ao que falta do calculado');
select is((teste.erro($$ select pg_temp.reg(cli.vera, 1500000, 250000, pg_temp.cobrar(cli.vera)) from cli $$)) -> 'detalhe' -> 'limite',
  '200000'::jsonb, 'somando o alvará anterior, passar recusa');
select ok(pg_temp.nada_mudou(), 'em todas as recusas, nada é gravado');
savepoint dispensa;
select portal_financeiro_destinacao_dispensar(socia, rm, pg_temp.hon(lev.vera1), 'Devolvido a Vera') from ids, lev;
select is((select pg_temp.prop(vera, 1500000) -> 'exitoNaoCobrado' -> 'jaCobrado' from cli), '0'::jsonb, 'a parte do alvará anterior dispensada deixa de contar');
select ok((select pg_temp.reg(vera, 1500000, 250000, pg_temp.cobrar(vera)) ->> 'id' from cli) is not null, 'e os R$ 2.500,00 passam');
rollback to savepoint dispensa;

-- ---------------------------------------------------------------------------------------
-- 7. EXITO_MUDOU.
-- Yara: a proposta vista sem não cobrado, e Marina marca às 10h13.
select is((select v -> 'exitoNaoCobrado' from prop_yara), 'null'::jsonb, 'Yara, para conferir: sem exitoNaoCobrado');
select ajustar_relogio(('2026-11-18 10:13-03'::timestamptz - now()));
select portal_financeiro_exito_nao_cobrar(socia, rm, pg_temp.exito(cli.yara), '{"motivo": "PERDOADO", "explicacao": "Combinado com a cliente."}') from ids, cli;
select ajustar_relogio(('2026-11-18 10:14-03'::timestamptz - now()));
create temp table n_antes2 as select (select count(*) from levantamentos) lev;
select is((select jsonb_build_array(e ->> 'codigo', e -> 'detalhe' ->> 'motivo', e -> 'detalhe' ->> 'tipo', e -> 'detalhe' -> 'por' ->> 'nome',
                                    e -> 'detalhe' ->> 'em' is not null)
             from cli, teste.erro($$ select pg_temp.reg(cli.yara, 1500000, 300000, '{"exitoNaoCobradoVisto": []}'::jsonb) from cli $$) e),
  '["TC409", "EXITO_MUDOU", "NAO_COBRADO", "Marina Ribeiro", true]'::jsonb,
  'CH-07: marcado como não cobrado depois da proposta (visto = []), recusa com EXITO_MUDOU, quem e quando');
select is((teste.erro($$ select pg_temp.reg(cli.wagner, 1500000, 300000, jsonb_build_object('exitoNaoCobradoVisto', jsonb_build_array(pg_temp.exito(cli.wagner)))) from cli $$)) -> 'detalhe' ->> 'motivo',
  'EXITO_MUDOU', 'visto = [x] sem não cobrado também recusa');
select is((teste.erro($$ select pg_temp.reg(cli.seb, 1500000, 300000, pg_temp.visto(cli.seb) || jsonb_build_object('cobrarExitoNaoCobrado',
             jsonb_build_object('exitoId', pg_temp.exito(cli.tania), 'explicacao', 'Combinado por telefone', 'clienteConcordou', true))) from cli $$)) -> 'detalhe' ->> 'motivo',
  'EXITO_MUDOU', 'um exitoId de outro êxito no "Cobrar" também recusa');
select is((teste.erro($$ select pg_temp.reg(cli.wagner, 1500000, 300000, '{"cobrarExitoNaoCobrado": "sim"}'::jsonb) from cli $$)) -> 'detalhe' -> 'campos',
  '["cobrarExitoNaoCobrado"]'::jsonb, 'cobrarExitoNaoCobrado que não é objeto recusa com o campo');
select is((select count(*) from levantamentos) - n.lev, 0::bigint, 'e nada é registrado') from n_antes2 n;

-- ---------------------------------------------------------------------------------------
-- 4. "Cobrar" com o combinado e a confirmação (Sebastião): passa.
create temp table r_cob as select pg_temp.reg(seb, 1500000, 300000, pg_temp.cobrar(seb)) v from cli;
select pg_temp.fim();
create temp table cob as select c.* from exito_cobrancas_alvara c, r_cob where c.levantamento_id = (r_cob.v ->> 'id')::uuid;
select is((select r_cob.v ->> 'exitoCobrado' from r_cob), 'true', 'CH-07 (C1): o "Cobrar" com o combinado e a confirmação passa');
select is((select jsonb_build_array(d.valor, d.regra) from destinacoes d, r_cob where d.levantamento_id = (r_cob.v ->> 'id')::uuid and d.para = 'HONORARIOS'),
  jsonb_build_array(300000, '20% · acordo · contrato ' || (select numero from contratos, ct where id = ct.seb) || ' · combinado com Sebastião'),
  'nasce a parte de honorários, com a regra do servidor (não a da tela)');
select is((select count(*)::integer from pagamentos_recebidos p, r_cob where p.destinacao_id = pg_temp.hon(r_cob.v)), 0,
  'sem recebimento TERCEIROS: não há parcela do êxito');
select is((select jsonb_build_array(exito_id, valor, combinado, cliente_concordou, autor_id) from cob),
  (select jsonb_build_array(pg_temp.exito(cli.seb), 300000, 'Sebastião aceitou pagar o êxito com este alvará, por telefone em 17/11.', true, ids.diego) from cli, ids),
  'nasce a linha em exito_cobrancas_alvara, com o combinado');
select is((select jsonb_object_keys_agg from (select jsonb_agg(k order by k) jsonb_object_keys_agg from historico h, r_cob, jsonb_object_keys(h.dados) k
             where h.entidade = 'levantamentos' and h.entidade_id = r_cob.v ->> 'id' and h.acao = 'financeiro.levantamento_exito_cobrado') t),
  '["calculado", "cobranca", "conferidoEm", "conferidoPor", "contrato", "exito", "honorarios", "motivo", "tipo"]'::jsonb,
  'PT-03: o histórico do levantamento guarda só ids, valor e motivo, sem o combinado');
select is((select jsonb_build_array(h.dados ->> 'cobranca', h.dados -> 'honorarios', h.dados ->> 'levantamento', h.dados ? 'combinado', h.dados ->> 'contrato')
             from historico h, r_cob, cs where h.entidade = 'casos' and h.entidade_id = cs.id::text and h.acao = 'financeiro.exito_cobrado_no_alvara'
              and h.dados ->> 'levantamento' = r_cob.v ->> 'id'),
  (select jsonb_build_array(cob.id, 300000, r_cob.v ->> 'id', false, (select numero from contratos where id = ct.seb)) from cob, r_cob, ct),
  'o histórico do caso também, sem o combinado');
select is((select situacao from exitos_conferir where id = (select pg_temp.exito(seb) from cli)), 'NAO_COBRADO', 'exitos_conferir continua NAO_COBRADO');
select is((select (h.dados ->> 'seguiuProposta')::boolean from historico h, r_cob
            where h.entidade = 'levantamentos' and h.entidade_id = r_cob.v ->> 'id' and h.acao = 'financeiro.levantamento'),
  false, 'seguiuProposta fica false: a pessoa pôs a linha de volta');
-- A regra no limite de 200 letras, com um nome de cliente de 120 letras.
savepoint nome_longo;
set local session_replication_role = replica;
update clientes_escritorio set nome = repeat('S', 160) where id = (select seb from cli);
set local session_replication_role = origin;
select is((select char_length(pg_temp.prop(seb, 1500000) -> 'exitoNaoCobrado' ->> 'regra') from cli), 200, 'com um nome de 160 letras, a regra fica em 200 letras');
rollback to savepoint nome_longo;
-- Depois da transferência, "Entrou" conta os honorários uma vez.
select portal_financeiro_destinacao_feita(diego, rm, pg_temp.hon(r_cob.v), '{"feitoEm": "2026-11-18"}') from ids, r_cob;
select pg_temp.fim();
select is((select coalesce(sum(e.valor), 0)::bigint from ids, cli, relatorio_entradas(ids.rm, '2026-11-01', '2026-11-30') e where e.cliente_id = cli.seb),
  300000::bigint, 'IN-04: transferidos, os honorários entram uma vez em "Entrou"');

-- ---------------------------------------------------------------------------------------
-- 6. O sino EXITO_COBRADO_NO_ALVARA.
select is((select jsonb_agg(p.nome order by p.nome) from avisos_sino s join pessoas p on p.id = s.pessoa_id, r_cob
            where s.tipo = 'EXITO_COBRADO_NO_ALVARA' and s.origem_id = (r_cob.v ->> 'id')::uuid),
  '["Larissa Costa", "Marina Ribeiro"]'::jsonb, 'CH-07: o sino chega uma vez a Marina (conferiu e encerrou) e a Larissa (responsável), e não a Diego');
select is((select jsonb_build_array(s.origem_tabela, s.dados ->> 'casoId', s.dados ->> 'levantamentoId') from avisos_sino s, r_cob, ids
            where s.tipo = 'EXITO_COBRADO_NO_ALVARA' and s.origem_id = (r_cob.v ->> 'id')::uuid and s.pessoa_id = ids.socia),
  (select jsonb_build_array('levantamentos', cs.id, r_cob.v ->> 'id') from cs, r_cob), 'a origem é levantamentos, com casoId nos dados');
select is((select s.dados - 'cliente' - 'caso' - 'casoId' - 'levantamentoId' from avisos_sino s, r_cob, ids
            where s.tipo = 'EXITO_COBRADO_NO_ALVARA' and s.origem_id = (r_cob.v ->> 'id')::uuid and s.pessoa_id = ids.socia),
  jsonb_build_object('quem', 'Diego Almeida', 'motivo', 'PERDOADO', 'tipo', 'ALVARA', 'valor', 300000, 'calculado', 300000,
                     'combinado', 'Sebastião aceitou pagar o êxito com este alvará, por telefone em 17/11.'),
  'quem tem o Financeiro recebe o valor, o calculado e o combinado');
select is((select array_agg(k order by k) from avisos_sino s, r_cob, ids, jsonb_object_keys(s.dados) k
            where s.tipo = 'EXITO_COBRADO_NO_ALVARA' and s.origem_id = (r_cob.v ->> 'id')::uuid and s.pessoa_id = ids.larissa),
  array['caso', 'casoId', 'cliente', 'levantamentoId', 'motivo', 'quem', 'tipo'],
  'PT-02: Larissa, sem o Financeiro, recebe sem valor, sem calculado e sem combinado');

-- ---------------------------------------------------------------------------------------
-- 8. "Entrou na conta" com requisicaoId e "Cobrar": a requisição passa a ENTROU.
savepoint requisicao;
create temp table rq as select (portal_financeiro_requisicao_registrar(diego, rm, jsonb_build_object('tipo', 'RPV', 'casoId', cs.id, 'clienteId', cli.ursula,
  'tribunal', 'TJSP', 'devedor', 'Seguradora Lince', 'valor', 1000000, 'expedidoEm', '2026-11-10', 'estimadaMes', '2027-01-01')) ->> 'id')::uuid id from ids, cs, cli;
select is((select requisicao_parte(ids.rm, cs.id, cli.ursula, 1000000) ->> 'valor' from ids, cs, cli), '0', 'o RPV a caminho não estima os honorários');
create temp table rr as select pg_temp.reg(cli.ursula, 1000000, 200000, pg_temp.cobrar(cli.ursula, 'Úrsula aceitou pagar o êxito com o RPV.') || jsonb_build_object('requisicaoId', rq.id)) v from cli, rq;
select pg_temp.fim();
select is((select situacao from requisicoes_a_caminho r, rq where r.id = rq.id), 'ENTROU', 'FI-05: com "Cobrar", a requisição passa a ENTROU');
select is((select count(*)::integer from exito_cobrancas_alvara c, rr where c.levantamento_id = (rr.v ->> 'id')::uuid), 1, 'e a cobrança fica registrada');
rollback to savepoint requisicao;

-- ---------------------------------------------------------------------------------------
-- 9. cobradoNoAlvara nas telas do caso.
create function pg_temp.passo(p_cliente uuid, p_valores boolean) returns jsonb language sql as $$
  select j from ids, cs, jsonb_array_elements(cliente_fechamento(ids.rm, p_cliente, cs.id, p_valores) -> 'passos') j where j ->> 'tipo' = 'EXITO'
$$;
select is((select jsonb_build_array(j -> 'naoCobrado', j -> 'cobradoNoAlvara' -> 'valor', j -> 'cobradoNoAlvara' -> 'por' ->> 'nome',
                                    j -> 'cobradoNoAlvara' ->> 'levantamentoId', j -> 'cobradoNoAlvara' ->> 'tipo')
             from cli, r_cob, lateral pg_temp.passo(cli.seb, true) j),
  (select jsonb_build_array(true, 300000, 'Diego Almeida', r_cob.v ->> 'id', 'ALVARA') from r_cob),
  'CH-07: o passo do fechamento diz cobrado no alvará, com naoCobrado ainda true');
select is((select j -> 'cobradoNoAlvara' -> 'valor' from cli, lateral pg_temp.passo(cli.seb, false) j), 'null'::jsonb,
  'PT-02: sem o Financeiro, o passo vem sem o valor');
select is((select x -> 'cobradoNoAlvara' -> 'valor' from ids, cs, jsonb_array_elements(caso_resumo_acerto(ids.diego, ids.rm, cs.id) -> 'exitos') x
            where x ->> 'cliente' = 'Sebastião Prado'), '300000'::jsonb, 'o acerto da ficha do caso também, com o valor para quem tem o Financeiro');
select is((select jsonb_build_array(x -> 'naoCobrado', x -> 'cobradoNoAlvara' -> 'valor', x -> 'cobradoNoAlvara' -> 'por' ->> 'nome')
             from ids, cs, jsonb_array_elements(caso_resumo_acerto(ids.larissa, ids.rm, cs.id) -> 'exitos') x where x ->> 'cliente' = 'Sebastião Prado'),
  '[true, null, "Diego Almeida"]'::jsonb, 'PT-02: para Larissa, sem o valor');
select is((select x -> 'cobradoNoAlvara' from ids, cs, jsonb_array_elements(caso_resumo_acerto(ids.diego, ids.rm, cs.id) -> 'exitos') x
            where x ->> 'cliente' = 'Úrsula Prado'), 'null'::jsonb, 'sem cobrança, cobradoNoAlvara é null');
select ok((select strpos(prosrc, 'cobradoNoAlvara') = 0 from pg_proc where oid = 'caso_acerto_quadro(uuid,uuid)'::regprocedure),
  'a 1104 não toca caso_acerto_quadro (o quadro não aparece num caso com alvará)');

-- ---------------------------------------------------------------------------------------
-- 10. O histórico do levantamento e o "De onde veio".
create function pg_temp.hist(p_lev jsonb, p_acao text) returns jsonb language sql as $$
  select h -> 'dados' from ids, jsonb_array_elements(portal_financeiro_repasse(ids.diego, ids.rm, (p_lev ->> 'id')::uuid) -> 'historico') h where h ->> 'acao' = p_acao
$$;
select is((select jsonb_build_array(d ->> 'combinado', d -> 'conferidoPor' ->> 'nome', d ->> 'conferidoEm' is not null, d ->> 'contrato')
             from r_cob, lateral pg_temp.hist(r_cob.v, 'financeiro.levantamento_exito_cobrado') d),
  (select jsonb_build_array('Sebastião aceitou pagar o êxito com este alvará, por telefone em 17/11.', 'Marina Ribeiro', true, numero) from contratos, ct where id = ct.seb),
  'a ficha do repasse mostra o combinado da cobrança e quem conferiu, com a data e o contrato');
select is((select jsonb_build_array(d -> 'conferidoPor' ->> 'nome', d ->> 'conferidoEm' is not null, d ->> 'contrato', d ? 'combinado')
             from r_sem, lateral pg_temp.hist(r_sem.v, 'financeiro.levantamento_exito_nao_cobrado') d),
  (select jsonb_build_array('Felipe Matos', true, numero, false) from contratos, ct where id = ct.ursula),
  'e o "Deixar sem" também grava a data da conferência e o contrato');
create function pg_temp.origem(p_contrato uuid) returns jsonb language sql as $$
  select e -> 'dados' from ids, cs, jsonb_array_elements(contrato_fechamento_origem(ids.rm, p_contrato, cs.id)) e where e ->> 'acao' = 'financeiro.exito_cobrado_no_alvara'
$$;
select is((select d from ct, r_cob, lateral pg_temp.origem(ct.seb) d),
  (select jsonb_build_object('levantamento', r_cob.v ->> 'id', 'tipo', 'ALVARA', 'entrouEm', '2026-11-18', 'valor', 300000, 'doContrato', true, 'motivo', 'PERDOADO',
                             'cliente', 'Sebastião Prado', 'combinado', 'Sebastião aceitou pagar o êxito com este alvará, por telefone em 17/11.') from r_cob),
  '"De onde veio" traz a cobrança no alvará, com o levantamento, o valor e o combinado');
select is((select d -> 'doContrato' from ct, lateral pg_temp.origem(ct.tania) d), 'false'::jsonb, 'na ficha de outro contrato do caso, doContrato é false');
savepoint excluido;
set local session_replication_role = replica;
update clientes_escritorio set estado = 'EXCLUIDO', excluido_em = app_now(), contatos = '[]'::jsonb, origem_indicacao = null
 where id in (select seb from cli union all select vera from cli);
set local session_replication_role = origin;
select is((select d ->> 'combinado' from r_cob, lateral pg_temp.hist(r_cob.v, 'financeiro.levantamento_exito_cobrado') d), null,
  'PT-11: o combinado some da ficha do repasse para o cliente excluído');
select is((select d ? 'combinado' from ct, lateral pg_temp.origem(ct.seb) d), false, 'e do "De onde veio"');
-- 13. O cliente excluído: a explicação some da proposta.
select is((select pg_temp.prop(vera, 1500000) -> 'exitoNaoCobrado' -> 'explicacao' from cli), 'null'::jsonb,
  'PT-11: a explicação da conferência some da proposta para o cliente excluído');
rollback to savepoint excluido;
select ok((select not (h.dados ? 'combinado') from historico h, r_cob where h.acao = 'financeiro.levantamento_exito_cobrado' and h.entidade_id = r_cob.v ->> 'id'),
  'o histórico em si não tem a chave combinado');

-- ---------------------------------------------------------------------------------------
-- 11. A tabela.
select is((teste.erro($$ update exito_cobrancas_alvara set combinado = 'Outro texto' where id = (select id from cob) $$)) ->> 'codigo', 'TC023',
  'PT-03: a cobrança não se muda');
select is((teste.erro($$ delete from exito_cobrancas_alvara where id = (select id from cob) $$)) ->> 'codigo', 'TC023', 'nem se apaga');
select throws_ok($$ insert into exito_cobrancas_alvara (escritorio_id, exito_id, levantamento_id, valor, combinado, cliente_concordou, autor_id)
                    select escritorio_id, exito_id, levantamento_id, 1, 'De novo', true, autor_id from cob $$, '23505', null,
  'o levantamento_id é único: uma cobrança por levantamento');
select throws_ok($$ insert into exito_cobrancas_alvara (escritorio_id, exito_id, levantamento_id, valor, combinado, cliente_concordou, autor_id)
                    select c.escritorio_id, c.exito_id, (lev.vera1 ->> 'id')::uuid, 1, 'De novo', false, c.autor_id from cob c, lev $$, '23514', null,
  'cliente_concordou é sempre true');
select is((select jsonb_build_array(dado_pessoal, exportar, situacao) from inventario_dados where tabela = 'exito_cobrancas_alvara'),
  '[true, true, "APROVADO"]'::jsonb, 'PT-11: está no inventário como dado pessoal');
select is((select jsonb_build_array(relrowsecurity, relforcerowsecurity) from pg_class where oid = 'exito_cobrancas_alvara'::regclass), '[true, true]'::jsonb,
  'PT-01: passa por proteger_tabela_escritorio (RLS forçado)');
select ok(exists (select 1 from pg_policy where polrelid = 'exito_cobrancas_alvara'::regclass and polname = 'isolamento_escritorio'), 'com a política de isolamento');
select is((select count(*)::integer from information_schema.role_table_grants where table_name = 'exito_cobrancas_alvara'
            and grantee in ('anon', 'authenticated', 'service_role')), 0, 'sem grant direto');

-- ---------------------------------------------------------------------------------------
-- 12. Uma conta só: a peça e a proposta dão o mesmo valor para três percentuais.
select is((select array_agg((exito_honorarios_do_contrato(ids.rm, cs.lima, c, 1234567) ->> 'valor')::bigint order by c) from ids, cs, cli,
             unnest(array[cli.p30, cli.p155, cli.p3333]) c),
          (select array_agg((portal_financeiro_repasse_proposta(ids.diego, ids.rm, jsonb_build_object('casoId', cs.lima, 'clienteId', c, 'valor', 1234567))
                             -> 'linhas' -> 0 ->> 'valor')::bigint order by c) from ids, cs, cli, unnest(array[cli.p30, cli.p155, cli.p3333]) c),
  'FI-05: exito_honorarios_do_contrato e a proposta dão o mesmo valor (30%, 15,5% e 33,33%)');
select is((select array_agg(v order by v) from ids, cs, cli, unnest(array[cli.p30, cli.p155, cli.p3333]) c,
             lateral (select (exito_honorarios_do_contrato(ids.rm, cs.lima, c, 1234567) ->> 'valor')::bigint v) t),
  array[191358::bigint, 370370, 411481], 'e os valores são os do percentual');
select is((select jsonb_build_array(x -> 'valor', x -> 'semLimite') from cli, jsonb_array_elements(pg_temp.prop(cli.xavier, 2000000) -> 'linhas') x
            where x ->> 'para' = 'HONORARIOS'), '[300000, 400000]'::jsonb, 'C3: a linha limitada ao que falta continua com semLimite');

-- ---------------------------------------------------------------------------------------
-- 14. Regressão.
select is((select jsonb_build_array(p -> 'exitoNaoCobrado', p -> 'linhas' -> 0 -> 'valor') from cli, lateral pg_temp.prop(cli.wagner, 1500000) p),
  '[null, 300000]'::jsonb, 'com o êxito para conferir, exitoNaoCobrado é null e a linha continua');
select is((select jsonb_build_array(p -> 'exitoNaoCobrado', p -> 'linhas' -> 0 -> 'valor') from cli, lateral pg_temp.prop(cli.xavier, 1500000) p),
  '[null, 300000]'::jsonb, 'com o êxito lançado, também');
select ok((select strpos(prosrc, 'for share') > 0 and strpos(prosrc, 'for update;') > 0 and strpos(prosrc, $q$if jsonb_typeof(v_cobrar) = 'object' then$q$) > 0
             from pg_proc where oid = 'portal_financeiro_levantamento_registrar(uuid,uuid,jsonb)'::regprocedure),
  'o registrar sem "Cobrar" continua com a trava for share, e o "Cobrar" trava com for update');
select ok((select pg_temp.reg(wagner, 1500000, 300000, '{"exitoNaoCobradoVisto": []}'::jsonb) ->> 'id' from cli) is not null,
  'o registrar comum (êxito para conferir, visto = []) continua passando');

-- ---------------------------------------------------------------------------------------
-- 15. Isolamento.
select is((teste.erro($$ select portal_financeiro_repasse(ids.intrusa, ids.outro, (r_cob.v ->> 'id')::uuid) from ids, r_cob $$)) ->> 'codigo', 'TC404',
  'PT-01: o escritório B recebe 404 na ficha do repasse');
select is((teste.erro($$ select portal_financeiro_levantamento_registrar(ids.intrusa, ids.rm, '{}'::jsonb) from ids $$)) ->> 'codigo', 'TC401',
  'quem não é do escritório não registra');
select is((select jsonb_build_array(exito_nao_cobrado(ids.outro, cs.id, cli.seb, 1500000), exito_ja_cobrado(ids.outro, pg_temp.exito(cli.seb)),
                                    exito_cobrado_no_alvara(ids.outro, pg_temp.exito(cli.seb), true), exito_honorarios_do_contrato(ids.outro, cs.id, cli.seb, 1500000),
                                    (select count(*) from exito_quem_avisar(ids.outro, pg_temp.exito(cli.seb))))
             from ids, cs, cli), '[null, 0, null, null, 0]'::jsonb, 'PT-01: as peças novas filtram o escritório');
select is((select jsonb_build_array(exito_ja_cobrado(ids.rm, pg_temp.exito(cli.seb)), exito_cobrado_no_alvara(ids.rm, pg_temp.exito(cli.seb), false) ->> 'tipo')
             from ids, cli), '[300000, "ALVARA"]'::jsonb, 'e, no escritório certo, acham a cobrança');
select is((select array_agg(p.proname::text order by p.proname) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prosecdef
            and p.proname in ('exito_honorarios_do_contrato', 'exito_ja_cobrado', 'exito_quem_avisar', 'exito_nao_cobrado', 'exito_cobrado_no_alvara',
                              'exito_divisao_com_regra', 'exito_proposta_para', 'exito_avisar_cobrado')), null::text[],
  'nenhuma peça nova é security definer');

select * from finish();
rollback;
