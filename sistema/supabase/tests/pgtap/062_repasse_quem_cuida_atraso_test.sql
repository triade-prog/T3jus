-- Quem cuida do repasse (F3.71) e o prazo e o atraso do repasse (F3.46): só quem tem o Financeiro
-- cuida, o motivo vai ao histórico, o sino avisa quem entra e quem sai; o prazo do escritório, os
-- feriados nacionais, a anotação do atraso com a próxima ação e a rotina do sino (FI-05).
begin;
select plan(35);

select ajustar_relogio(('2026-11-19 10:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Bianca Torres') as bianca,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Larissa Moura') as larissa,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, bianca, 'Bianca Torres', array['CONTRATOS', 'FINANCEIRO']),
       portal_convidar(socia, rm, diego, 'Diego Almeida', array['COMERCIAL', 'FINANCEIRO']),
       portal_convidar(socia, rm, larissa, 'Larissa Moura', array['JURIDICO']) from ids;

create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Irene Castro', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Irene Castro', 'telefone', '+5511996027736', 'principal', true)))) ->> 'id')::uuid irene
  from ids;
create temp table ct as select
  (portal_contrato_criar(socia, rm, jsonb_build_object('clienteId', cli.irene, 'objeto', 'Aposentadoria por incapacidade',
     'responsavelId', ids.socia, 'advogados', jsonb_build_array(ids.socia),
     'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'EXITO', 'percentual', 3000, 'sobre', 'Atrasados', 'etapa', 'Pagamento da RPV', 'dias', 15)))) ->> 'id')::uuid id
  from ids, cli;
select portal_juridico_etapas(socia, rm) from ids;
create temp table cs as select
  (portal_juridico_caso_criar(socia, rm, jsonb_build_object('nome', 'Castro x INSS', 'area', 'PREVIDENCIARIO',
     'etapaId', (select id from etapas where escritorio_id = ids.rm and ordem = 7), 'responsavelId', ids.socia,
     'clientes', jsonb_build_array(jsonb_build_object('clienteId', cli.irene, 'papel', 'AUTOR', 'contratoId', ct.id)))) ->> 'id')::uuid id
  from ids, cli, ct;

-- Feriados nacionais e dias úteis.
select ok(feriado_nacional('2026-11-20'), 'Consciência Negra é feriado nacional');
select ok(feriado_nacional('2026-04-03'), 'Sexta-feira Santa de 2026 (Páscoa em 5/4)');
select ok(not feriado_nacional('2026-02-17'), 'Carnaval é ponto facultativo, não feriado nacional');
select is(somar_dias_uteis('2026-11-17', 3), '2026-11-23'::date, 'pula o fim de semana e o 20/11');
select is(dias_uteis_entre('2026-11-17', '2026-11-19'), 2, 'dias úteis entre dois dias');

-- O levantamento de 12/11: prazo 17/11, já atrasado em 19/11.
create temp table lv as select
  (portal_financeiro_levantamento_registrar(diego, rm, jsonb_build_object('tipo', 'RPV', 'casoId', cs.id, 'clienteId', cli.irene,
    'valor', 3864000, 'entrouEm', '2026-11-12', 'divisao', jsonb_build_array(
      jsonb_build_object('para', 'CLIENTE', 'valor', 3564000),
      jsonb_build_object('para', 'PERITO', 'nome', 'Dr. Rui Tavares', 'valor', 150000),
      jsonb_build_object('para', 'PARCEIRO', 'nome', 'Oliveira & Prates', 'valor', 150000)))) ->> 'id')::uuid id
  from ids, cs, cli;
create temp table ds as select
  (select d.id from destinacoes d, lv where d.levantamento_id = lv.id and para = 'CLIENTE') cliente,
  (select d.id from destinacoes d, lv where d.levantamento_id = lv.id and para = 'PERITO') perito,
  (select d.id from destinacoes d, lv where d.levantamento_id = lv.id and para = 'PARCEIRO') parceiro;
select is((select prazo from destinacoes, ds where id = ds.perito), '2026-11-17'::date, 'prazo padrão de 3 dias úteis');

-- F3.71: quem cuida.
create temp table fx as select portal_financeiro_repasse(diego, rm, lv.id) f from ids, lv;
select is((select f -> 'responsavel' ->> 'nome' from fx), 'Marina Ribeiro', 'nasce com a responsável pelo contrato');
select is((select f -> 'doContrato' ->> 'nome' from fx), 'Marina Ribeiro', 'a ficha diz quem é a do contrato');
select is((select jsonb_agg(x ->> 'nome' order by x ->> 'nome') from fx, jsonb_array_elements(f -> 'podemCuidar') x),
  '["Bianca Torres", "Diego Almeida", "Marina Ribeiro"]'::jsonb, 'só aparece quem tem a área Financeiro');
select is((teste.erro($$ select portal_financeiro_repasse_responsavel(diego, rm, lv.id, larissa) from ids, lv $$)) -> 'detalhe' ->> 'motivo',
  'SEM_AREA_FINANCEIRO', 'quem não tem o Financeiro não cuida do repasse');
select is((teste.erro($$ select portal_financeiro_repasse_responsavel(diego, rm, lv.id, intrusa) from ids, lv $$)) -> 'detalhe' -> 'campos',
  '["responsavelId"]'::jsonb, 'alguém de fora da equipe é recusado');
select is((select portal_financeiro_repasse_responsavel(diego, rm, lv.id, bianca, '  Bianca cuida dos pagamentos a perito e parceiro.  ') ->> 'nome' from ids, lv),
  'Bianca Torres', 'Diego passa o repasse para Bianca');
select is((select h.dados from historico h, lv where h.acao = 'financeiro.repasse_responsavel' and h.entidade_id = lv.id::text),
  (select jsonb_build_object('de', socia, 'para', bianca, 'motivo', 'Bianca cuida dos pagamentos a perito e parceiro.') from ids),
  'a troca vai ao histórico com quem era, quem passa a ser e o motivo');
select is((select count(*)::integer from avisos_sino a, ids where a.pessoa_id = ids.bianca and a.tipo = 'REPASSE_PASSADO' and a.lido_em is null
             and a.dados ->> 'entrou' = 'true' and a.dados ->> 'motivo' like 'Bianca cuida%'), 1, 'quem entra recebe o aviso novo no sino');
select is((select count(*)::integer from avisos_sino a, ids where a.pessoa_id = ids.socia and a.tipo = 'REPASSE_PASSADO' and a.lido_em is not null
             and a.dados ->> 'entrou' = 'false'), 1, 'quem sai recebe o aviso já lido');
select is((select count(*)::integer from levantamentos l, lv where l.id = lv.id and l.responsavel_id = (select bianca from ids)), 1,
  'vale para o repasse inteiro');
select is((teste.erro($$ select portal_financeiro_repasse_responsavel(larissa, rm, lv.id, bianca) from ids, lv $$)) -> 'detalhe' ->> 'motivo',
  'AREA_NAO_LIBERADA', 'quem não tem o Financeiro não troca');

-- F3.46: a lista mostra os atrasados.
create temp table lista as select portal_financeiro_repasses(bianca, rm) l from ids;
select is((select l -> 'totais' ->> 'atrasados' from lista), '3864000', 'Atrasados: a soma das partes que passaram do prazo');
select is((select (l -> 'totais' ->> 'semMotivo')::integer from lista), 3, 'todas ainda sem motivo anotado');
select is((select l ->> 'eu' from lista), (select bianca::text from ids), 'a lista diz quem é você, para "Os meus"');

-- Anotar o atraso.
select is((teste.erro($$ select portal_financeiro_destinacao_atraso(bianca, rm, ds.perito, jsonb_build_object('motivo', 'OUTRO', 'proximaEm', '2026-11-18', 'proximaComId', larissa, 'oQue', '')) from ids, ds $$)) -> 'detalhe' -> 'campos',
  '["texto", "proximaEm", "proximaComId", "oQue"]'::jsonb, 'outro motivo pede o texto; a data é hoje ou depois; com quem tem o Financeiro; o que fazer');
create temp table an as select portal_financeiro_destinacao_atraso(bianca, rm, ds.perito, jsonb_build_object('motivo', 'DOCUMENTO',
    'texto', 'O perito ainda não mandou a nota fiscal.', 'proximaEm', '2026-11-20', 'proximaComId', bianca, 'oQue', 'Cobrar a nota por e-mail')) d
  from ids, ds;
select is((select d -> 'atraso' ->> 'oQue' from an), 'Cobrar a nota por e-mail', 'a parte volta com a anotação');
select is((select prazo from destinacoes, ds where id = ds.perito), '2026-11-17'::date, 'o prazo não muda');
select ajustar_relogio(('2026-11-19 10:05-03'::timestamptz - now()));
select portal_financeiro_destinacao_atraso(bianca, rm, ds.perito, jsonb_build_object('motivo', 'SEM_RESPOSTA',
    'proximaEm', '2026-11-19', 'proximaComId', diego, 'oQue', 'Ligar para o perito')) from ids, ds;
select is((select portal_financeiro_repasse(bianca, rm, lv.id) -> 'destinacoes' -> 1 -> 'atraso' ->> 'motivo' from ids, lv), 'SEM_RESPOSTA',
  'a anotação mais nova é a que vale');
select is((select count(*)::integer from historico h, lv where h.acao = 'financeiro.repasse_atraso' and h.entidade_id = lv.id::text), 2,
  'cada anotação fica no histórico do repasse');
select is((select count(*)::integer from avisos_sino a, ids where a.pessoa_id = ids.diego and a.tipo = 'REPASSE_PROXIMA_ACAO'), 1,
  'a próxima ação de hoje, com outra pessoa, já chega no sino dela');
select is((select (portal_financeiro_repasses(bianca, rm) -> 'totais' ->> 'semMotivo')::integer from ids), 2, 'o perito saiu dos sem motivo');
select portal_financeiro_destinacao_feita(bianca, rm, ds.cliente, '{"feitoEm": "2026-11-18"}') from ids, ds;
select is((teste.erro($$ select portal_financeiro_destinacao_atraso(bianca, rm, ds.cliente, '{}'::jsonb) from ids, ds $$)) -> 'detalhe' ->> 'motivo',
  'REPASSE_JA_FEITO', 'repasse feito não se anota');
select is((teste.erro($$ update repasse_atraso_anotacoes set texto = 'outro' $$)) ->> 'codigo', 'TC023', 'a anotação não muda');

-- A rotina do sino: o aviso de atraso a quem cuida (uma vez) e o lembrete do dia da próxima ação.
select ajustar_relogio(('2026-11-20 07:00-03'::timestamptz - now()));
select is(lembrar_repasses(), 2, 'avisa os 2 atrasados ainda pendentes (o cliente já foi feito)');
select is((select count(*)::integer from avisos_sino a, ids where a.pessoa_id = ids.bianca and a.tipo = 'REPASSE_ATRASADO'), 2, 'a quem cuida');
select is(lembrar_repasses(), 0, 'não repete');

-- O prazo do escritório.
select is((teste.erro($$ select portal_financeiro_prazo_repasse(bianca, rm, 5) from ids $$)) -> 'detalhe' ->> 'motivo', 'SO_SOCIO_DONO',
  'só a sócia dona muda o prazo');
select is((teste.erro($$ select portal_financeiro_prazo_repasse(socia, rm, 31) from ids $$)) -> 'detalhe' -> 'campos', '["prazoRepasseDias"]'::jsonb,
  'de 1 a 30 dias úteis');
select portal_financeiro_prazo_repasse(socia, rm, 5) from ids;
create temp table lv2 as select (portal_financeiro_levantamento_registrar(diego, rm, jsonb_build_object('tipo', 'ALVARA', 'casoId', cs.id, 'clienteId', cli.irene,
    'valor', 100000, 'entrouEm', '2026-11-19', 'divisao', jsonb_build_array(jsonb_build_object('para', 'CLIENTE', 'valor', 100000)))) ->> 'id')::uuid id from ids, cs, cli;
select is((select prazo from destinacoes d, lv2 where d.levantamento_id = lv2.id),
  '2026-11-27'::date, 'o prazo novo vale para o que entra dali em diante, contando o feriado');

select * from finish();
rollback;
