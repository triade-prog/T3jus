-- O êxito com baixa sem receber na divisão do alvará (1100; F3.174: FI-24, FI-05, FI-25; também
-- PT-01, PT-02, PT-03, IN-04, IN-07). Plano aprovado em docs/design/aprovadas/portal-exito-baixado-alvara
-- (seção A6), com as respostas A1 (não registrar os honorários com o êxito baixado: desfazer ou
-- manter e tirar os honorários; renegociada só desfazer) e A2 (sim: as custas voltam como reembolso).
begin;
select plan(57);

create function pg_temp.fim() returns void language plpgsql as $$
begin
  set constraints all immediate;
  set constraints caso_pronto_fim, caso_pronto_fim_mudou, caso_pronto_fim_saiu, destinacoes_fecham, caso_fechou_fim deferred;
end $$;

select ajustar_relogio(('2026-10-01 10:00-03'::timestamptz - now()));
create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Bianca Torres') as bianca,
  teste.pessoa('Larissa Costa') as larissa,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, diego, 'Diego Almeida', array['FINANCEIRO', 'COMERCIAL']),
       portal_convidar(socia, rm, bianca, 'Bianca Torres', array['FINANCEIRO']),
       portal_convidar(socia, rm, larissa, 'Larissa Costa', array['JURIDICO']) from ids;
select portal_juridico_casos(socia, rm) from ids;

create function pg_temp.cliente(p_nome text, p_tel text) returns uuid language sql as $$
  select (portal_cliente_cadastrar(ids.socia, ids.rm, jsonb_build_object('tipo', 'PF', 'nome', p_nome, 'origem', 'GOOGLE',
    'contatos', jsonb_build_array(jsonb_build_object('nome', p_nome, 'telefone', p_tel, 'principal', true)))) ->> 'id')::uuid from ids
$$;
create function pg_temp.contrato(p_cliente uuid) returns uuid language sql as $$
  select (portal_contrato_criar(ids.socia, ids.rm, jsonb_build_object('clienteId', p_cliente, 'objeto', 'Revisão de contrato bancário',
    'responsavelId', ids.socia, 'advogados', jsonb_build_array(ids.socia),
    'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'EXITO', 'percentual', 3000, 'sobre', 'acordo', 'etapa', 'Encerrado', 'dias', 0)))) ->> 'id')::uuid from ids
$$;

-- Rita (o caso do desenho), Tiago (paga em parte) e Sebastião (renegociada), no mesmo caso.
create temp table cli as select
  pg_temp.cliente('Rita Fonseca', '+5511984223180') rita,
  pg_temp.cliente('Tiago Fonseca', '+5511984223181') tiago,
  pg_temp.cliente('Sebastião Fonseca', '+5511984223182') seb;
create temp table ct as select pg_temp.contrato(rita) rita, pg_temp.contrato(tiago) tiago, pg_temp.contrato(seb) seb from cli;
select portal_contrato_assinatura(socia, rm, x, 1, '2026-10-01') from ids, ct, unnest(array[ct.rita, ct.tiago, ct.seb]) x;
create temp table cs as select (portal_juridico_caso_criar(socia, rm, jsonb_build_object('nome', 'Fonseca x Banco Aurora', 'area', 'CIVEL',
    'etapaId', (select id from etapas where escritorio_id = ids.rm and ordem = 5), 'responsavelId', ids.larissa,
    'clientes', jsonb_build_array(jsonb_build_object('clienteId', cli.rita, 'papel', 'AUTOR', 'contratoId', ct.rita),
                                  jsonb_build_object('clienteId', cli.tiago, 'papel', 'AUTOR', 'contratoId', ct.tiago),
                                  jsonb_build_object('clienteId', cli.seb, 'papel', 'AUTOR', 'contratoId', ct.seb)))) ->> 'id')::uuid id
  from ids, cli, ct;
-- As custas que o escritório adiantou para Rita, a voltar com a próxima parcela (a do êxito).
create temp table cp as select (portal_financeiro_conta_lancar(diego, rm, jsonb_build_object('descricao', 'Custas iniciais', 'categoria', 'CUSTAS',
     'valor', 41230, 'vencimento', '2026-10-01', 'adiantada', true, 'clienteId', cli.rita, 'casoId', cs.id, 'reembolsoComo', 'PROXIMA_PARCELA')) ->> 'id')::uuid rita
  from ids, cli, cs;

-- 10/10: o acordo; o êxito de cada um (30% de R$ 16.000,00) é lançado para 20/10.
select ajustar_relogio(('2026-10-10 10:00-03'::timestamptz - now()));
select portal_juridico_caso_etapa(larissa, rm, cs.id, (select versao from casos where id = cs.id), jsonb_build_object(
  'etapaId', (select id from etapas where escritorio_id = ids.rm and final), 'motivo', 'Acordo homologado', 'resultado', 'ACORDO',
  'previstoEm', '2026-10-20', 'valores', jsonb_build_object(cli.rita, 1600000, cli.tiago, 1600000, cli.seb, 1600000))) from ids, cs, cli;
select portal_financeiro_exito_lancar(diego, rm, x.id, '{"valor": 480000, "vencimento": "2026-10-20", "forma": "PIX"}')
  from ids, exitos_conferir x, cs where x.caso_id = cs.id;
create temp table p as select
  (select r.id from recebimentos_previstos r join exitos_conferir x on x.id = r.exito_id where x.cliente_id = cli.rita) rita,
  (select r.id from recebimentos_previstos r join exitos_conferir x on x.id = r.exito_id where x.cliente_id = cli.tiago) tiago,
  (select r.id from recebimentos_previstos r join exitos_conferir x on x.id = r.exito_id where x.cliente_id = cli.seb) seb
  from cli;

-- Tiago pagou R$ 1.000,00 em 01/11.
select ajustar_relogio(('2026-11-01 10:00-03'::timestamptz - now()));
select portal_financeiro_receber_registrar_recibo(diego, rm, p.tiago, '{"valor": 100000, "recebidoEm": "2026-11-01", "forma": "PIX"}') from ids, p;

-- 05/11: Marina dá baixa sem receber nos três (Rita com as custas junto).
select ajustar_relogio(('2026-11-05 10:00-03'::timestamptz - now()));
select portal_financeiro_parcela_baixar(socia, rm, p.rita, jsonb_build_object('motivo', 'INADIMPLENCIA',
  'explicacao', 'Rita disse que o banco não pagou o acordo; não vamos cobrar agora.', 'falta', 480000, 'reembolso', true)) from ids, p;
select portal_financeiro_parcela_baixar(socia, rm, p.tiago, jsonb_build_object('motivo', 'INADIMPLENCIA',
  'explicacao', 'Tiago sumiu depois do acordo.', 'falta', 380000)) from ids, p;
select portal_financeiro_parcela_baixar(socia, rm, p.seb, jsonb_build_object('motivo', 'RENEGOCIADA',
  'explicacao', 'Parcelado em 3 vezes a partir de dezembro.', 'falta', 480000)) from ids, p;
create temp table bx as select
  (select baixa_id from recebimentos_previstos where id = p.rita) rita,
  (select baixa_id from recebimentos_previstos where id = p.tiago) tiago,
  (select baixa_id from recebimentos_previstos where id = p.seb) seb
  from p;
create temp table rel as select (select count(*) from ids, p, relatorio_abertas(ids.rm, '2026-11-10') a where a.parcela_id = p.rita) abertas_1011;

-- Hoje: quarta-feira, 18/11/2026, às 10h12. Diego registra um alvará de R$ 16.000,00.
select ajustar_relogio(('2026-11-18 10:12-03'::timestamptz - now()));

-- Registrar com a divisão dada (o resto é do cliente) e os campos novos.
create function pg_temp.reg(p_pessoa uuid, p_cliente uuid, p_partes jsonb, p_extra jsonb default '{}'::jsonb) returns jsonb language sql as $$
  select portal_financeiro_levantamento_registrar(p_pessoa, ids.rm, jsonb_build_object('tipo', 'ALVARA', 'casoId', cs.id, 'clienteId', p_cliente,
    'valor', 1600000, 'entrouEm', '2026-11-18',
    'divisao', jsonb_build_array(jsonb_build_object('para', 'CLIENTE',
                 'valor', 1600000 - coalesce((select sum((x ->> 'valor')::bigint) from jsonb_array_elements(p_partes) x), 0))) || p_partes) || p_extra)
    from ids, cs
$$;
create function pg_temp.hon(p_valor bigint default 480000) returns jsonb language sql as $$
  select jsonb_build_array(jsonb_build_object('para', 'HONORARIOS', 'nome', 'Honorários de êxito', 'regra', '30% · acordo', 'valor', p_valor))
$$;
create function pg_temp.visto(p_baixa uuid) returns jsonb language sql as $$
  select jsonb_build_object('exitoBaixadoVisto', case when p_baixa is null then '[]'::jsonb else jsonb_build_array(p_baixa) end)
$$;
create function pg_temp.nada(p_cliente uuid) returns boolean language sql as $$
  select not exists (select 1 from levantamentos l where l.cliente_id = p_cliente)
     and not exists (select 1 from pagamentos_recebidos x where x.destinacao_id is not null)
$$;

-- ---------------------------------------------------------------------------------------
-- 1. A proposta traz o êxito baixado com a baixa inteira; as linhas não mudam.
create temp table prop as select portal_financeiro_repasse_proposta(diego, rm, jsonb_build_object('casoId', cs.id, 'clienteId', cli.rita, 'valor', 1600000)) v
  from ids, cs, cli;
select is((select jsonb_array_length(v -> 'exitoBaixado') from prop), 1, 'FI-24: a proposta traz o êxito de Rita com baixa sem receber');
select is((select v -> 'exitoBaixado' -> 0 -> 'baixa' ->> 'id' from prop), (select rita::text from bx), 'com a baixa em vigor');
select is((select jsonb_build_array(b -> 'baixa' ->> 'motivo', b -> 'baixa' ->> 'explicacao', b -> 'baixa' -> 'por' ->> 'nome', b ->> 'valor', b -> 'contrato' ->> 'estado')
             from prop, jsonb_array_elements(v -> 'exitoBaixado') b),
  '["INADIMPLENCIA", "Rita disse que o banco não pagou o acordo; não vamos cobrar agora.", "Marina Ribeiro", "480000", "ATIVO"]'::jsonb,
  'FI-24: o motivo, a explicação (só para o Financeiro), quem deu a baixa, o valor e o contrato');
select is((select v -> 'exitoBaixado' -> 0 -> 'baixa' -> 'reembolsos' -> 0 ->> 'valor' from prop), '41230', 'FI-25: e as custas que tiveram baixa junto');
select is((select v -> 'exito' from prop), '[]'::jsonb, 'FI-05: a parcela baixada não está entre as que a divisão paga');
select is((select v -> 'linhas' from prop), (select repasse_proposta_sem_exito(rm, cs.id, cli.rita, 1600000) -> 'linhas' from ids, cs, cli),
  'FI-05: as linhas são as de antes (honorários pelo contrato)');

-- ---------------------------------------------------------------------------------------
-- 2. A1: com o êxito baixado, os honorários são recusados; nada fica gravado.
select is((teste.erro($$ select pg_temp.reg(ids.diego, cli.rita, pg_temp.hon(), pg_temp.visto(bx.rita)) from ids, cli, bx $$)) -> 'detalhe' ->> 'motivo',
  'EXITO_BAIXADO', 'FI-24 (A1): registrar os honorários com o êxito baixado é recusado');
select is((teste.erro($$ select pg_temp.reg(ids.diego, cli.rita, jsonb_build_array(jsonb_build_object('para', 'HONORARIOS', 'nome', 'Sucumbência', 'valor', 50000))) from ids, cli $$)) ->> 'codigo',
  'TC409', 'FI-24: a parte de honorários mandada à mão, por cliente antigo, também (nota 16)');
select ok((select pg_temp.nada(rita) from cli), 'e não sobra levantamento, parte nem recebimento');

-- ---------------------------------------------------------------------------------------
-- 3. Desfazer a baixa antes de dividir, na mesma transação (decisão 6), com as custas (A2).
savepoint desfazer;
create temp table rd as select pg_temp.reg(ids.diego, cli.rita,
  pg_temp.hon() || jsonb_build_array(jsonb_build_object('para', 'REEMBOLSO', 'nome', 'Reembolso: Custas iniciais', 'valor', 41230, 'contaId', cp.rita)),
  pg_temp.visto(bx.rita) || jsonb_build_object('desfazerBaixa', jsonb_build_object('baixaId', bx.rita, 'explicacao', 'O alvará de R$ 16.000,00 entrou em 18/11 e paga o êxito.'))) v
  from ids, cli, bx, cp;
select pg_temp.fim();
select is((select v ->> 'baixaDesfeita' from rd), 'true', 'FI-24: o registrar desfaz a baixa');
select is((select count(*)::integer from parcela_baixas b, bx where b.desfaz_id in (select id from parcela_baixas where id = bx.rita or junto_de = bx.rita)), 2,
  'nasce a linha DESFEITA da parcela e a das custas');
select is((select parcela_linha(r) ->> 'situacao' from recebimentos_previstos r, p where r.id = p.rita), 'PAGA', 'FI-05: a parcela do êxito fica paga pela divisão');
select is((select caixa || ' ' || (destinacao_id is not null)::text || ' ' || valor from pagamentos_recebidos x, p where x.parcela_id = p.rita), 'TERCEIROS true 480000',
  'por um recebimento TERCEIROS ligado à parte de honorários');
select ok((select exists (select 1 from cobranca_eventos e, p where e.parcela_id = p.rita and e.texto like 'Baixa sem receber desfeita: %')),
  'a anotação de cobrança do desfazer existe');
select ok((select not exists (select 1 from jsonb_array_elements(inicio_financeiro_escritorio(socia, rm, 'EQUIPE')) i, p where i ->> 'id' = p.rita::text) from ids),
  'mas a parcela paga some do Início');
select ok((select not exists (select 1 from ids, p, relatorio_abertas(ids.rm, '2026-11-18') a where a.parcela_id = p.rita)), 'e de A receber');
select is((select dados -> 'baixaDesfeita' ->> 'motivo' from historico h, rd where h.acao = 'financeiro.levantamento_exito_desfeito' and h.entidade_id = rd.v ->> 'id'),
  'INADIMPLENCIA', 'o histórico do levantamento leva a baixa desfeita');
select is((select jsonb_build_array(dados -> 'baixaDesfeita' -> 'pago', dados -> 'baixaDesfeita' -> 'falta') from historico h, rd
            where h.acao = 'financeiro.levantamento_exito_desfeito' and h.entidade_id = rd.v ->> 'id'),
  '[480000, 0]'::jsonb, 'e o que os honorários pagaram de fato (a parcela inteira)');
select ok((select not exists (select 1 from historico h where h.acao = 'financeiro.levantamento_exito_mantido')), 'e não grava "mantido"');
-- 11. FI-25 (A2, com o sim): as custas entram como reembolso, e o acerto não pende mais delas.
select is((select count(*)::integer from destinacoes d, rd, cp where d.levantamento_id = (rd.v ->> 'id')::uuid and d.conta_id = cp.rita), 1,
  'FI-25 (A2): as custas baixadas junto entram na divisão como reembolso');
select ok((select not exists (select 1 from jsonb_array_elements(caso_acerto(rm, cs.id) -> 'pendencias') j where j ->> 'tipo' = 'REEMBOLSO') from ids, cs),
  'FI-25: o acerto do caso fica sem pendência de reembolso (o reembolso pende como repasse)');
-- 10. A parte de honorários que pagou o êxito continua sem se dispensar.
select is((teste.erro($$ select portal_financeiro_destinacao_dispensar(ids.diego, ids.rm, d.id, 'Não vamos cobrar') from ids, destinacoes d, rd
   where d.levantamento_id = (rd.v ->> 'id')::uuid and d.para = 'HONORARIOS' $$)) -> 'detalhe' ->> 'motivo', 'BAIXOU_EXITO',
  'a parte de honorários que pagou o êxito não se dispensa');
-- 12. Relatórios: transferidos os honorários, "Entrou" conta uma vez; o dia baixado não muda.
select portal_financeiro_destinacao_feita(diego, rm, d.id, '{"feitoEm": "2026-11-18"}') from ids, destinacoes d, rd
 where d.levantamento_id = (rd.v ->> 'id')::uuid and d.para = 'HONORARIOS';
select pg_temp.fim();
select is((select coalesce(sum(e.valor), 0)::bigint from ids, cli, relatorio_entradas(ids.rm, '2026-11-01', '2026-11-30') e where e.cliente_id = cli.rita),
  480000::bigint, 'IN-04: os honorários entram uma vez em "Entrou" (o recebimento TERCEIROS fica fora)');
select is((select count(*) from ids, p, relatorio_abertas(ids.rm, '2026-11-10') a where a.parcela_id = p.rita), (select abertas_1011 from rel),
  'IN-07: "Falta receber" de 10/11, quando a parcela estava baixada, não muda');
rollback to savepoint desfazer;

-- ---------------------------------------------------------------------------------------
-- 4. Paga em parte: recebidos R$ 1.000,00, baixa de R$ 3.800,00; a divisão paga R$ 3.800,00.
savepoint parcial;
select is((select b -> 'baixa' ->> 'recebidoAntes' from ids, cs, cli, jsonb_array_elements(exito_parcelas_baixadas(ids.rm, cs.id, cli.tiago)) b),
  '100000', 'FI-24: a baixa de Tiago diz o que já tinha entrado');
select pg_temp.reg(ids.diego, cli.tiago, pg_temp.hon(),
  pg_temp.visto(bx.tiago) || jsonb_build_object('desfazerBaixa', jsonb_build_object('baixaId', bx.tiago, 'explicacao', 'O alvará paga o êxito.'))) from ids, cli, bx;
select pg_temp.fim();
select is((select valor from pagamentos_recebidos x, p where x.parcela_id = p.tiago and x.destinacao_id is not null), 380000::bigint,
  'FI-05: depois do desfazer, a divisão paga só os R$ 3.800,00 que faltavam');
select is((select parcela_linha(r) ->> 'situacao' from recebimentos_previstos r, p where r.id = p.tiago), 'PAGA', 'e a parcela fica paga');
rollback to savepoint parcial;

-- Desfazer e depois tirar os honorários (E1) ou reduzi-los (E2): o histórico diz o que foi pago.
savepoint sem_hon;
create temp table re1 as select pg_temp.reg(ids.diego, cli.rita, '[]'::jsonb,
  pg_temp.visto(bx.rita) || jsonb_build_object('desfazerBaixa', jsonb_build_object('baixaId', bx.rita, 'explicacao', 'Vamos cobrar de novo.'))) v
  from ids, cli, bx;
select pg_temp.fim();
select is((select jsonb_build_array(re1.v -> 'baixaDesfeita', re1.v -> 'exitoBaixado', parcela_linha(r) ->> 'situacao') from re1, recebimentos_previstos r, p where r.id = p.rita),
  '[true, [], "VENCIDA"]'::jsonb, 'E1: desfazer sem honorários passa, e a parcela volta a ser cobrada');
select is((select jsonb_build_array(dados -> 'baixaDesfeita' -> 'pago', dados -> 'baixaDesfeita' -> 'falta') from historico h, re1
            where h.acao = 'financeiro.levantamento_exito_desfeito' and h.entidade_id = re1.v ->> 'id'),
  '[0, 480000]'::jsonb, 'E1: o histórico diz que nada foi pago e quanto falta');
rollback to savepoint sem_hon;
savepoint hon_menor;
create temp table re2 as select pg_temp.reg(ids.diego, cli.rita, pg_temp.hon(100000),
  pg_temp.visto(bx.rita) || jsonb_build_object('desfazerBaixa', jsonb_build_object('baixaId', bx.rita, 'explicacao', 'O alvará paga uma parte.'))) v
  from ids, cli, bx;
select pg_temp.fim();
select is((select jsonb_build_array(re2.v -> 'exitoBaixado' -> 0 -> 'valor', re2.v -> 'exitoBaixado' -> 0 -> 'paga') from re2),
  '[100000, false]'::jsonb, 'E2: com os honorários reduzidos, a resposta diz que a parcela recebeu R$ 1.000,00');
select is((select jsonb_build_array(dados -> 'baixaDesfeita' -> 'pago', dados -> 'baixaDesfeita' -> 'falta') from historico h, re2
            where h.acao = 'financeiro.levantamento_exito_desfeito' and h.entidade_id = re2.v ->> 'id'),
  '[100000, 380000]'::jsonb, 'E2: e o histórico, o pago e o que falta');
rollback to savepoint hon_menor;

-- ---------------------------------------------------------------------------------------
-- 5. A explicação do desfazer com menos de 3 letras recusa, e nada é gravado.
select is((teste.erro($$ select pg_temp.reg(ids.diego, cli.rita, pg_temp.hon(),
    pg_temp.visto(bx.rita) || jsonb_build_object('desfazerBaixa', jsonb_build_object('baixaId', bx.rita, 'explicacao', ' a '))) from ids, cli, bx $$)) -> 'detalhe' -> 'campos',
  '["explicacao"]'::jsonb, 'PT-03: o desfazer pede a explicação, de 3 a 1.000 letras');
select ok((select r.baixa_id = bx.rita from recebimentos_previstos r, p, bx where r.id = p.rita), 'e a baixa continua em vigor');
select ok((select pg_temp.nada(rita) from cli), 'sem levantamento nem recebimento');

-- ---------------------------------------------------------------------------------------
-- 6. Manter a baixa e tirar os honorários: passa, e fica no histórico, sem a explicação.
savepoint manter;
create temp table rm1 as select pg_temp.reg(ids.diego, cli.rita,
  jsonb_build_array(jsonb_build_object('para', 'PERITO', 'nome', 'Dr. Paulo Mendes', 'valor', 100000)), pg_temp.visto(bx.rita)) v from ids, cli, bx;
select pg_temp.fim();
select is((select parcela_linha(r) ->> 'situacao' from recebimentos_previstos r, p where r.id = p.rita), 'BAIXADA', 'FI-24: com "Manter", a parcela continua baixada');
create temp table hm as select h.dados from historico h, rm1 where h.acao = 'financeiro.levantamento_exito_mantido' and h.entidade_id = rm1.v ->> 'id';
select is((select jsonb_build_array(dados ->> 'tipo', dados -> 'baixas' -> 0 ->> 'baixa', dados -> 'baixas' -> 0 ->> 'motivo', dados -> 'baixas' -> 0 ->> 'valor') from hm),
  (select jsonb_build_array('ALVARA', rita::text, 'INADIMPLENCIA', '480000') from bx), 'PT-03: o histórico do repasse guarda a baixa mantida');
select ok((select dados::text not like '%banco não pagou%' from hm), 'PT-02: sem a explicação da baixa');
select is((select dados -> 'baixas' -> 0 ->> 'contrato' from hm), (select numero from contratos, ct where id = ct.rita),
  'e o número do contrato, para o fechamento do caso');
select is((select h -> 'dados' -> 'baixas' -> 0 -> 'por' ->> 'nome' from ids, rm1,
           jsonb_array_elements(portal_financeiro_repasse(ids.socia, ids.rm, (rm1.v ->> 'id')::uuid) -> 'historico') h
          where h ->> 'acao' = 'financeiro.levantamento_exito_mantido'), 'Marina Ribeiro',
  'a ficha do repasse diz quem deu a baixa (o histórico guarda só o id)');
-- 10. As outras partes continuam podendo ser dispensadas.
select is((portal_financeiro_destinacao_dispensar(diego, rm, d.id, 'O perito abriu mão') ->> 'situacao'), 'DISPENSADO',
  'depois do "Manter", a parte do perito ainda se dispensa') from ids, destinacoes d, rm1
 where d.levantamento_id = (rm1.v ->> 'id')::uuid and d.para = 'PERITO';
rollback to savepoint manter;
-- O cliente antigo, sem o campo e sem honorários, também passa e grava o histórico.
savepoint antigo;
select pg_temp.reg(ids.diego, cli.rita, '[]'::jsonb) from ids, cli;
select pg_temp.fim();
select is((select count(*)::integer from historico where acao = 'financeiro.levantamento_exito_mantido'), 1,
  'o cliente antigo, sem exitoBaixadoVisto e sem honorários, passa e grava o histórico');
rollback to savepoint antigo;

-- ---------------------------------------------------------------------------------------
-- 7. A corrida: EXITO_MUDOU, com quem e quando.
select is((teste.erro($$ select pg_temp.reg(ids.diego, cli.rita, '[]'::jsonb, pg_temp.visto(null)) from ids, cli $$)) -> 'detalhe',
  (select jsonb_build_object('motivo', 'EXITO_MUDOU', 'tipo', 'BAIXA', 'por', pessoa_ref(socia), 'em', '2026-11-05 10:00-03'::timestamptz, 'parcelaId', p.rita) from ids, p),
  'FI-24: a baixa feita depois da proposta (visto = []) recusa, com quem deu a baixa e quando');
savepoint corrida;
select ajustar_relogio(('2026-11-18 10:13-03'::timestamptz - now()));
select portal_financeiro_parcela_baixa_desfazer(bianca, rm, p.rita, '{"explicacao": "Rita pagou por fora"}') from ids, p;
select is((teste.erro($$ select pg_temp.reg(ids.diego, cli.rita, pg_temp.hon(), pg_temp.visto(bx.rita)) from ids, cli, bx $$)) -> 'detalhe',
  (select jsonb_build_object('motivo', 'EXITO_MUDOU', 'tipo', 'DESFEITA', 'por', pessoa_ref(bianca), 'em', app_now(), 'parcelaId', p.rita) from ids, p),
  'FI-24: a baixa desfeita por Bianca depois da proposta (visto = [b]) recusa, com quem e quando');
rollback to savepoint corrida;
select is((teste.erro($$ select pg_temp.reg(ids.diego, cli.rita, pg_temp.hon(),
    pg_temp.visto(bx.rita) || jsonb_build_object('desfazerBaixa', jsonb_build_object('baixaId', gen_random_uuid(), 'explicacao', 'Paga o êxito'))) from ids, cli, bx $$)) -> 'detalhe' ->> 'motivo',
  'EXITO_MUDOU', 'um desfazerBaixa.baixaId velho também recusa');
select ok((select pg_temp.nada(rita) from cli), 'e nada fica gravado');

-- ---------------------------------------------------------------------------------------
-- 8. A renegociada aparece com o motivo e só se desfaz (A1, b); o contrato encerrado depois
-- também. A importação desfeita não aparece.
select is((select b -> 'baixa' ->> 'motivo' from ids, cs, cli, jsonb_array_elements(exito_parcelas_baixadas(ids.rm, cs.id, cli.seb)) b), 'RENEGOCIADA',
  'FI-24: a renegociada aparece com o motivo');
select is((teste.erro($$ select pg_temp.reg(ids.diego, cli.seb, '[]'::jsonb, pg_temp.visto(bx.seb)) from ids, cli, bx $$)) -> 'detalhe' ->> 'renegociada',
  'true', 'A1, b: com a renegociada, "Manter" não existe: sem desfazer, recusa');
savepoint encerrado;
set local session_replication_role = replica;
update contratos set estado = 'ENCERRADO', encerrado_em = app_now(), motivo_encerramento = 'Acordo cumprido' where id = (select seb from ct);
set local session_replication_role = origin;
select is((select b -> 'contrato' ->> 'estado' from ids, cs, cli, jsonb_array_elements(exito_parcelas_baixadas(ids.rm, cs.id, cli.seb)) b), 'ENCERRADO',
  'o contrato encerrado depois da renegociada continua aparecendo');
select lives_ok($$ select pg_temp.reg(ids.diego, cli.seb, pg_temp.hon(),
    pg_temp.visto(bx.seb) || jsonb_build_object('desfazerBaixa', jsonb_build_object('baixaId', bx.seb, 'explicacao', 'O alvará paga o êxito.'))) from ids, cli, bx $$,
  'e o desfazer aceita o contrato encerrado');
rollback to savepoint encerrado;
savepoint importacao;
set local session_replication_role = replica;
with i as (insert into importacoes (escritorio_id, arquivo_nome, o_que, estado, criado_por, importado_em, desfazer_ate, desfeita_em, desfeita_por, motivo_desfazer)
  select rm, 'antigo.xlsx', 'CLIENTES_CONTRATOS', 'DESFEITA', socia, app_now(), app_now(), app_now(), socia, 'Planilha errada' from ids returning id)
update contratos set importacao_id = (select id from i) where id = (select tiago from ct);
set local session_replication_role = origin;
select is((select exito_parcelas_baixadas(rm, cs.id, cli.tiago) from ids, cs, cli), '[]'::jsonb, 'a importação desfeita não aparece nem segura o registrar');
rollback to savepoint importacao;

-- ---------------------------------------------------------------------------------------
-- 9. "Entrou na conta" com requisicaoId e "Manter": a requisição entra, e o histórico grava.
savepoint requisicao;
create temp table rq as select (portal_financeiro_requisicao_registrar(diego, rm, jsonb_build_object('tipo', 'RPV', 'casoId', cs.id, 'clienteId', cli.rita,
  'tribunal', 'TJSP', 'devedor', 'Banco Aurora', 'valor', 1500000, 'expedidoEm', '2026-11-10', 'estimadaMes', '2027-01-01')) ->> 'id')::uuid id from ids, cs, cli;
create temp table rr as select pg_temp.reg(ids.diego, cli.rita, '[]'::jsonb, pg_temp.visto(bx.rita) || jsonb_build_object('requisicaoId', rq.id)) v from ids, cli, bx, rq;
select pg_temp.fim();
select is((select situacao from requisicoes_a_caminho r, rq where r.id = rq.id), 'ENTROU', 'FI-05: a requisição passa a ENTROU');
select is((select count(*)::integer from historico h, rr where h.acao = 'financeiro.levantamento_exito_mantido' and h.entidade_id = rr.v ->> 'id'), 1,
  'e o histórico grava o "Manter"');
rollback to savepoint requisicao;

-- ---------------------------------------------------------------------------------------
-- Pela API: o registrar com desfazer e o fim da transação como service_role.
savepoint api;
select diego, rm, rita c_rita from ids, cli \gset
select id caso from cs \gset
select rita b_rita from bx \gset
set local role service_role;
select lives_ok(format($q$ select portal_financeiro_levantamento_registrar(%L, %L, jsonb_build_object('tipo', 'ALVARA', 'casoId', %L, 'clienteId', %L,
  'valor', 1600000, 'entrouEm', '2026-11-18', 'exitoBaixadoVisto', jsonb_build_array(%L),
  'desfazerBaixa', jsonb_build_object('baixaId', %L, 'explicacao', 'Paga o êxito'),
  'divisao', jsonb_build_array(jsonb_build_object('para', 'CLIENTE', 'valor', 1120000),
                               jsonb_build_object('para', 'HONORARIOS', 'nome', 'Honorários de êxito', 'valor', 480000)))) $q$,
  :'diego', :'rm', :'caso', :'c_rita', :'b_rita', :'b_rita'), 'F3.163: registrar com o desfazer pela API');
select lives_ok('set constraints all immediate', 'e o fim da transação como service_role passa');
reset role;
rollback to savepoint api;

-- ---------------------------------------------------------------------------------------
-- 13. Isolamento (PT-01): o escritório B não vê o êxito baixado do A.
select is((teste.erro($$ select portal_financeiro_repasse_proposta(ids.intrusa, ids.outro, jsonb_build_object('casoId', cs.id, 'clienteId', cli.rita, 'valor', 1600000)) from ids, cs, cli $$)) -> 'detalhe' -> 'campos',
  '["casoId"]'::jsonb, 'PT-01: o escritório B não acha o caso do A, e a proposta não sai');
select is((teste.erro($$ select pg_temp.reg(ids.intrusa, cli.rita, '[]'::jsonb, pg_temp.visto(null)) from ids, cli $$)) ->> 'codigo',
  'TC401', 'PT-01: e o registrar no escritório do A, com a pessoa do B, é recusado');
select is((select exito_parcelas_baixadas(outro, cs.id, cli.rita) from ids, cs, cli), '[]'::jsonb, 'PT-01: no escritório B, nenhuma baixa do A');

select * from finish();
rollback;
