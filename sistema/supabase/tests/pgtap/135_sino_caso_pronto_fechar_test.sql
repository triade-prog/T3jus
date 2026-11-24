-- O aviso no sino quando o caso sem levantamento fica pronto para encerrar no financeiro (0990;
-- F3.147: EX-16, EX-17; também EX-01, PT-01, PT-02 e PT-03). Quem recebe, os motivos, os
-- períodos (com a ordem e a regra das 24 horas), o "agora" de cada aviso, a rotina, o commit pela
-- API como service_role, os erros que não derrubam o pagamento e a folha do contrato.
-- O pgTAP nunca faz commit: pg_temp.fim() faz o papel do commit (dispara os gatilhos adiados) e
-- volta a adiar só os gatilhos nomeados, sem mexer nas outras restrições adiáveis.
begin;
select plan(77);

select ajustar_relogio(('2026-11-18 10:00-03'::timestamptz - now()));
set local track_functions = 'all';

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Bianca Torres') as bianca,
  teste.pessoa('Larissa Costa') as larissa,
  teste.pessoa('Felipe Matos') as felipe,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, diego, 'Diego Almeida', array['FINANCEIRO', 'COMERCIAL']),
       portal_convidar(socia, rm, bianca, 'Bianca Torres', array['CONTRATOS', 'FINANCEIRO']),
       portal_convidar(socia, rm, larissa, 'Larissa Costa', array['JURIDICO']),
       portal_convidar(socia, rm, felipe, 'Felipe Matos', array['CONTRATOS', 'COMERCIAL']) from ids;

-- ---------------------------------------------------------------------------------------
-- Ajudantes.
create temp sequence tel;
create function pg_temp.fim() returns void language plpgsql as $$
begin
  set constraints all immediate;
  set constraints caso_pronto_fim, caso_pronto_fim_mudou, caso_pronto_fim_saiu, destinacoes_fecham deferred;
end $$;
create function pg_temp.cliente(p_nome text) returns uuid language sql as $$
  select (portal_cliente_cadastrar(ids.socia, ids.rm, jsonb_build_object('tipo', 'PF', 'nome', p_nome, 'origem', 'GOOGLE',
    'contatos', jsonb_build_array(jsonb_build_object('nome', p_nome, 'telefone', '+55119842' || lpad(nextval('tel')::text, 5, '0'),
      'principal', true)))) ->> 'id')::uuid from ids
$$;
create function pg_temp.contrato(p_cliente uuid, p_condicoes jsonb, p_assinar boolean default true) returns uuid language plpgsql as $$
declare v uuid; v_relogio interval := (select adiantamento from app_relogio);
begin
  -- O contrato nasce em maio (o primeiro vencimento não pode ser no passado), e o relógio volta.
  perform ajustar_relogio(('2026-05-28 10:00-03'::timestamptz - now()));
  select (portal_contrato_criar(ids.socia, ids.rm, jsonb_build_object('clienteId', p_cliente, 'objeto', 'Honorários do caso',
    'responsavelId', ids.felipe, 'advogados', jsonb_build_array(ids.socia), 'condicoes', p_condicoes)) ->> 'id')::uuid into v from ids;
  if p_assinar then perform portal_contrato_assinatura(ids.socia, ids.rm, v, 1, '2026-05-28') from ids; end if;
  perform ajustar_relogio(v_relogio);
  return v;
end $$;
create function pg_temp.fixo(p_cliente uuid, p_valor bigint default 90000) returns uuid language sql as $$
  select pg_temp.contrato(p_cliente, jsonb_build_array(jsonb_build_object('tipo', 'FIXO', 'valor', p_valor, 'vencimento', '2026-06-02')))
$$;
create function pg_temp.caso(p_nome text, p_clientes jsonb) returns uuid language sql as $$
  select (portal_juridico_caso_criar(ids.socia, ids.rm, jsonb_build_object('nome', p_nome, 'area', 'CIVEL',
    'etapaId', (select id from etapas where escritorio_id = ids.rm and ordem = 5), 'responsavelId', ids.larissa,
    'clientes', p_clientes)) ->> 'id')::uuid from ids
$$;
create function pg_temp.um(p_cliente uuid, p_contrato uuid) returns jsonb language sql as $$
  select jsonb_build_array(jsonb_build_object('clienteId', p_cliente, 'papel', 'AUTOR', 'contratoId', p_contrato))
$$;
create function pg_temp.encerrar_por(p_pessoa uuid, p_caso uuid, p_dados jsonb default '{"resultado": "PERDA"}') returns jsonb language sql as $$
  select portal_juridico_caso_etapa(p_pessoa, ids.rm, p_caso, (select versao from casos where id = p_caso),
    jsonb_build_object('etapaId', (select id from etapas where escritorio_id = ids.rm and final), 'motivo', 'Sentença sem recurso') || p_dados) from ids
$$;
create function pg_temp.encerrar(p_caso uuid, p_dados jsonb default '{"resultado": "PERDA"}') returns jsonb language sql as $$
  select pg_temp.encerrar_por(ids.larissa, p_caso, p_dados) from ids
$$;
create function pg_temp.pagar_por(p_pessoa uuid, p_parcela uuid) returns jsonb language sql as $$
  select portal_financeiro_receber_registrar_recibo(p_pessoa, ids.rm, p_parcela,
    jsonb_build_object('valor', (select valor from recebimentos_previstos where id = p_parcela), 'recebidoEm', hoje_brasilia(), 'forma', 'PIX')) from ids
$$;
create function pg_temp.pagar(p_parcela uuid) returns jsonb language sql as $$ select pg_temp.pagar_por(ids.diego, p_parcela) from ids $$;
-- Paga todas as parcelas do contrato que vencem até o dia.
create function pg_temp.pagar_ate(p_contrato uuid, p_ate date) returns void language sql as $$
  select count(pg_temp.pagar(r.id)) from (select id from recebimentos_previstos where contrato_id = p_contrato and vencimento <= p_ate
                                            and cancelado_em is null order by vencimento) r;
$$;
create function pg_temp.parcela(p_contrato uuid, p_n integer) returns uuid language sql as $$
  select id from recebimentos_previstos where contrato_id = p_contrato and cancelado_em is null order by vencimento, id offset p_n - 1 limit 1
$$;
create function pg_temp.conta(p_caso uuid, p_desc text) returns uuid language sql as $$
  select (portal_financeiro_conta_lancar(ids.diego, ids.rm, jsonb_build_object('descricao', p_desc, 'categoria', 'CUSTAS', 'valor', 4500,
    'vencimento', hoje_brasilia(), 'adiantada', true, 'casoId', p_caso,
    'clienteId', (select cliente_id from caso_clientes where caso_id = p_caso order by ordem limit 1), 'reembolsoComo', 'PROXIMA_PARCELA')) ->> 'id')::uuid from ids
$$;
create function pg_temp.reembolsar(p_conta uuid) returns jsonb language sql as $$
  select portal_financeiro_conta_reembolsada(ids.diego, ids.rm, p_conta, jsonb_build_object('reembolsadoEm', hoje_brasilia())) from ids
$$;
-- Quem recebeu aviso do caso (de um período, ou de qualquer um).
create function pg_temp.avisados(p_caso uuid, p_periodo uuid default null) returns text[] language sql as $$
  select coalesce(array_agg(p.nome order by p.nome), '{}') from avisos_sino s join pessoas p on p.id = s.pessoa_id
   where s.tipo = 'CASO_PRONTO_FECHAR' and s.origem_id = p_caso and (p_periodo is null or s.dados ->> 'periodoId' = p_periodo::text)
$$;
-- O aviso de uma pessoa, como o sino o mostra, do período n do caso (1 = o primeiro).
create function pg_temp.aviso(p_caso uuid, p_pessoa uuid, p_n integer default 1) returns jsonb language sql as $$
  select aviso_sino_linha(s) from avisos_sino s join casos_prontos_fechar p on p.id = (s.dados ->> 'periodoId')::uuid
   where s.tipo = 'CASO_PRONTO_FECHAR' and s.origem_id = p_caso and s.pessoa_id = p_pessoa
     and p.id = (select id from casos_prontos_fechar where caso_id = p_caso order by ordem offset p_n - 1 limit 1)
$$;
create function pg_temp.periodo(p_caso uuid, p_n integer default 1) returns uuid language sql as $$
  select id from casos_prontos_fechar where caso_id = p_caso order by ordem offset p_n - 1 limit 1
$$;
-- Os períodos do caso, em ordem: o motivo e como saiu (ABERTO enquanto aberto).
create function pg_temp.periodos(p_caso uuid) returns text language sql as $$
  select coalesce(string_agg(motivo || ':' || coalesce(saiu_por, 'ABERTO'), ' ' order by ordem), '') from casos_prontos_fechar where caso_id = p_caso
$$;
create function pg_temp.falhas() returns bigint language sql as $$
  select count(*) from historico where acao in ('financeiro.caso_pronto_falhou', 'financeiro.caso_pronto_fora_sem_levantamento')
$$;
create function pg_temp.acertos() returns bigint language sql as $$
  select coalesce(pg_stat_get_xact_function_calls('caso_acerto(uuid,uuid)'::regprocedure), 0)
$$;
select portal_juridico_casos(socia, rm) from ids;

-- ---------------------------------------------------------------------------------------
-- 1, 14, 12. "Carvalho x Construtora Lume": Noemi em 3 parcelas e Cláudio à vista.
create temp table cli as select pg_temp.cliente('Noemi Bastos Carvalho') noemi, pg_temp.cliente('Cláudio Carvalho') claudio;
create temp table ct as select
  pg_temp.contrato(cli.noemi, jsonb_build_array(jsonb_build_object('tipo', 'PARCELADO', 'total', 300000, 'parcelas', 3, 'primeiro', '2026-08-10')))
    noemi,
  pg_temp.fixo(cli.claudio, 150000) claudio from cli;
create temp table cs as select pg_temp.caso('Carvalho x Construtora Lume', jsonb_build_array(
    jsonb_build_object('clienteId', cli.noemi, 'papel', 'AUTOR', 'contratoId', ct.noemi),
    jsonb_build_object('clienteId', cli.claudio, 'papel', 'AUTOR', 'contratoId', ct.claudio))) a from cli, ct;
select pg_temp.pagar_ate(ct.noemi, '2026-09-30'), pg_temp.pagar_ate(ct.claudio, '2026-09-30') from ct;
select pg_temp.encerrar(a) from cs;
select pg_temp.fim();
select is((select pg_temp.periodos(a) from cs), '', 'EX-16: com a parcela 3/3 aberta, o caso encerrado não fica pronto');

select pg_temp.pagar(pg_temp.parcela(ct.noemi, 3)) from ct;
select pg_temp.fim();
select is((select pg_temp.avisados(a) from cs), array['Bianca Torres', 'Marina Ribeiro'],
  'EX-16 (resposta 1): o último pagamento avisa Marina e Bianca; não Diego, que registrou, nem Larissa e Felipe, sem o Financeiro');
select is((select pg_temp.periodos(a) from cs), 'PAGAMENTO:ABERTO', 'o período abre com o motivo PAGAMENTO');
create temp table av1 as select pg_temp.aviso(a, socia) j from cs, ids;
select is((select (j -> 'dados') - 'periodoId' from av1), jsonb_build_object('caso', 'Carvalho x Construtora Lume',
    'clientes', jsonb_build_array('Noemi Bastos Carvalho', 'Cláudio Carvalho'), 'contratoId', (select id from contratos where id in (ct.noemi, ct.claudio) order by numero limit 1),
    'contrato', (select numero from contratos where id in (ct.noemi, ct.claudio) order by numero limit 1),
    'parcelas', 4, 'motivo', 'PAGAMENTO', 'quem', 'Diego Almeida'),
  'EX-01, PT-02: o aviso diz o caso, os clientes na ordem do caso, o contrato de menor número e quantas parcelas, sem valor')
  from ct;
select ok((select not (j -> 'dados' ?| array['valor', 'falta', 'calculado']) and j -> 'dados' ->> 'periodoId' is not null from av1),
  'PT-02: nenhum valor em reais nos dados');
select is((select j ->> 'origem' || ' ' || (j ->> 'tipo') || ' ' || (j ? 'agora')::text from av1), 'casos CASO_PRONTO_FECHAR false',
  'enquanto o caso está pronto, o aviso não traz "agora"');

-- 12. Encerrar no financeiro fecha o período com ENCERRADO; o aviso da Bianca continua não lido.
select portal_financeiro_caso_encerrar(socia, rm, a) from ids, cs;
select pg_temp.fim();
select is((select pg_temp.periodos(a) from cs), 'PAGAMENTO:ENCERRADO', 'EX-17: encerrar no financeiro fecha o período com ENCERRADO');
select is((select pg_temp.aviso(a, bianca) -> 'agora' -> 'encerrado' -> 'por' ->> 'nome' from cs, ids), 'Marina Ribeiro',
  'o aviso da Bianca mostra "Agora": encerrado por Marina');
select is((select (pg_temp.aviso(a, bianca) ->> 'lido')::boolean from cs, ids), false, 'resposta 4: encerrar não marca o aviso dos outros como lido');
select is((select count(*) from avisos_sino s, cs where s.origem_id = cs.a), 2::bigint, 'encerrar não manda aviso novo');

-- ---------------------------------------------------------------------------------------
-- 2. A parcela a vencer segura; a rotina não avisa; o pagamento dela avisa.
create temp table b as select pg_temp.cliente('Sônia Lima') cli;
alter table b add column ct uuid, add column caso uuid;
update b set ct = pg_temp.contrato(cli, jsonb_build_array(jsonb_build_object('tipo', 'PARCELADO', 'total', 200000, 'parcelas', 2, 'primeiro', '2026-10-20')));
update b set caso = pg_temp.caso('Lima x INSS', pg_temp.um(cli, ct));
select pg_temp.pagar(pg_temp.parcela(ct, 1)), pg_temp.encerrar(caso) from b;
select pg_temp.fim();
select avisar_casos_prontos_fechar();
select is((select pg_temp.periodos(caso) || pg_temp.avisados(caso)::text from b), '{}',
  'EX-16 (resposta 2): a parcela que ainda vai vencer segura o aviso, e a rotina não avisa');
select pg_temp.pagar(pg_temp.parcela(ct, 2)) from b;
select pg_temp.fim();
select is((select pg_temp.avisados(caso) from b), array['Bianca Torres', 'Marina Ribeiro'], 'o pagamento da última parcela, antes do vencimento, avisa');

-- 8. O caso pronto que ganha levantamento: o período fecha com FORA, e o aviso diz "fecha no repasse".
insert into levantamentos (escritorio_id, caso_id, cliente_id, tipo, valor, entrou_em, autor_id, responsavel_id)
select rm, caso, cli, 'RPV', 500000, hoje_brasilia(), diego, diego from b, ids;
select pg_temp.fim();
select is((select pg_temp.periodos(caso) from b), 'PAGAMENTO:FORA', 'o levantamento fecha o período com FORA');
select is((select pg_temp.aviso(caso, socia) -> 'agora' from b, ids), '{"fora": true}'::jsonb, 'o aviso mostra "Agora": fecha no repasse');

-- ---------------------------------------------------------------------------------------
-- 3. O acordo com êxito: não avisa no encerramento; avisa quando o êxito é marcado não cobrado, e,
-- em outro caso, quando o êxito é lançado e pago.
create temp table c as select pg_temp.cliente('Sérgio Gomes') s, pg_temp.cliente('Helena Freitas') h;
alter table c add column cs uuid, add column ch uuid, add column ks uuid, add column kh uuid;
update c set cs = pg_temp.contrato(s, jsonb_build_array(
    jsonb_build_object('tipo', 'PARCELADO', 'total', 200000, 'parcelas', 2, 'primeiro', '2026-08-10'),
    jsonb_build_object('tipo', 'EXITO', 'percentual', 2000, 'sobre', 'Valor do acordo', 'etapa', 'Encerrado', 'dias', 0))),
             ch = pg_temp.contrato(h, jsonb_build_array(
    jsonb_build_object('tipo', 'PARCELADO', 'total', 200000, 'parcelas', 2, 'primeiro', '2026-08-10'),
    jsonb_build_object('tipo', 'EXITO', 'percentual', 2000, 'sobre', 'Valor do acordo', 'etapa', 'Encerrado', 'dias', 0)));
update c set ks = pg_temp.caso('Gomes x Seguradora', pg_temp.um(s, cs)), kh = pg_temp.caso('Freitas x Banco', pg_temp.um(h, ch));
select pg_temp.pagar_ate(cs, '2026-10-31'), pg_temp.pagar_ate(ch, '2026-10-31') from c;
select pg_temp.encerrar(ks, jsonb_build_object('resultado', 'ACORDO', 'previstoEm', '2026-12-15', 'valores', jsonb_build_object(s, 1000000))),
       pg_temp.encerrar(kh, jsonb_build_object('resultado', 'ACORDO', 'previstoEm', '2026-12-15', 'valores', jsonb_build_object(h, 1000000))) from c;
select pg_temp.fim();
select is((select pg_temp.periodos(ks) || pg_temp.periodos(kh) from c), '', 'EX-16: o êxito para conferir segura o aviso no encerramento');
select portal_financeiro_exito_nao_cobrar(diego, rm, x.id, '{"motivo": "PERDOADO", "explicacao": "Acordo com desconto combinado."}')
  from ids, c, exitos_conferir x where x.caso_id = c.ks;
select pg_temp.fim();
select is((select pg_temp.avisados(ks) from c), array['Bianca Torres', 'Marina Ribeiro'], 'o êxito marcado não cobrado avisa');
select is((select pg_temp.aviso(ks, socia) -> 'dados' ->> 'motivo' || ' ' || (pg_temp.aviso(ks, socia) -> 'dados' ->> 'exito') from c, ids),
  'EXITO NAO_COBRADO', 'motivo EXITO, não cobrado');
select portal_financeiro_exito_lancar(diego, rm, x.id, '{"valor": 200000, "vencimento": "2026-12-15"}')
  from ids, c, exitos_conferir x where x.caso_id = c.kh;
select pg_temp.fim();
select is((select pg_temp.periodos(kh) from c), '', 'o êxito lançado e ainda não pago segura o aviso');
select pg_temp.pagar_por(bianca, r.id) from ids, c, recebimentos_previstos r where r.contrato_id = c.ch and r.exito_id is not null;
select pg_temp.fim();
select is((select pg_temp.avisados(kh) from c), array['Diego Almeida', 'Marina Ribeiro'], 'o pagamento do êxito avisa (menos a Bianca, que registrou)');
select is((select pg_temp.aviso(kh, socia) -> 'dados' ->> 'motivo' || ' ' || (pg_temp.aviso(kh, socia) -> 'dados' ->> 'exito') from c, ids),
  'EXITO PAGO', 'motivo EXITO, pago');

-- ---------------------------------------------------------------------------------------
-- 4. Encerrado no Jurídico já sem pendência: avisa no fim. Larissa, sem o Financeiro, não recebe;
-- Diego, que ganha a área Jurídico e encerra, recebe.
create temp table d as select pg_temp.cliente('Rosângela Teixeira') r, pg_temp.cliente('Paulo Henrique Dias') p;
alter table d add column cr uuid, add column cp uuid, add column kr uuid, add column kp uuid;
update d set cr = pg_temp.fixo(r), cp = pg_temp.fixo(p);
update d set kr = pg_temp.caso('Teixeira x Loja', pg_temp.um(r, cr)), kp = pg_temp.caso('Dias x Banco', pg_temp.um(p, cp));
select pg_temp.pagar_ate(cr, '2026-10-31'), pg_temp.pagar_ate(cp, '2026-10-31') from d;
select pg_temp.encerrar(kr) from d;
select pg_temp.fim();
select is((select pg_temp.avisados(kr) from d), array['Bianca Torres', 'Diego Almeida', 'Marina Ribeiro'],
  'resposta 1: o caso encerrado no Jurídico sem pendência avisa todos com o Financeiro (Larissa não tem)');
select is((select pg_temp.aviso(kr, socia) -> 'dados' ->> 'motivo' || ' ' || (pg_temp.aviso(kr, socia) -> 'dados' ->> 'quem') from d, ids),
  'CASO_ENCERRADO Larissa Costa', 'motivo CASO_ENCERRADO, com quem encerrou');
insert into areas_liberadas (escritorio_id, vinculo_id, area, criado_por)
select rm, v.id, 'JURIDICO', socia from ids, vinculos v where v.pessoa_id = ids.diego and v.escritorio_id = ids.rm and v.funcao = 'EQUIPE';
select pg_temp.encerrar_por(diego, kp) from ids, d;
select pg_temp.fim();
select is((select pg_temp.avisados(kp) from d), array['Bianca Torres', 'Diego Almeida', 'Marina Ribeiro'],
  'resposta 1: quem encerra pelo Jurídico também recebe, se tiver o Financeiro');

-- ---------------------------------------------------------------------------------------
-- 5 e 6. Não avisam: com levantamento, importação desfeita, importado encerrado e sem contrato.
-- "Registrar o resultado" no importado encerrado, nada pendente: avisa (ROTINA), e quem registrou
-- também recebe.
create temp table e as select pg_temp.cliente('Lauro Prado') l, pg_temp.cliente('Mirna Couto') m, pg_temp.cliente('Ítalo Reis') i,
  pg_temp.cliente('Vera Sá') v;
alter table e add column cl uuid, add column cm uuid, add column ci uuid, add column kl uuid, add column km uuid, add column ki uuid, add column kv uuid;
update e set cl = pg_temp.fixo(l), cm = pg_temp.fixo(m), ci = pg_temp.fixo(i);
update e set kl = pg_temp.caso('Prado x União', pg_temp.um(l, cl)), km = pg_temp.caso('Couto x Banco', pg_temp.um(m, cm)),
             ki = pg_temp.caso('Reis x Estado', pg_temp.um(i, ci)), kv = pg_temp.caso('Sá x Vizinho', jsonb_build_array(jsonb_build_object('clienteId', v, 'papel', 'AUTOR')));
select pg_temp.pagar_ate(cl, '2026-10-31'), pg_temp.pagar_ate(cm, '2026-10-31'), pg_temp.pagar_ate(ci, '2026-10-31') from e;
insert into levantamentos (escritorio_id, caso_id, cliente_id, tipo, valor, entrou_em, autor_id, responsavel_id)
select rm, kl, l, 'ALVARA', 300000, hoje_brasilia(), diego, diego from e, ids;
select pg_temp.encerrar(kl), pg_temp.encerrar(kv) from e;
update casos set situacao = 'ENCERRADO', encerrado_em = app_now(), resultado = null,
       encerrado_por = case when id = e.km then 'IMPORTACAO_DESFEITA' else 'IMPORTADO_ENCERRADO' end
  from e where casos.id in (e.km, e.ki);
select pg_temp.fim();
select avisar_casos_prontos_fechar();
select is((select array[pg_temp.periodos(kl), pg_temp.periodos(km), pg_temp.periodos(ki), pg_temp.periodos(kv)] from e), array['', '', '', ''],
  'não avisam o caso com levantamento, o da importação desfeita, o importado encerrado (nem pela rotina) e o sem contrato');
select portal_juridico_caso_resultado(socia, rm, ki, (select versao from casos where id = e.ki),
  '{"resultado": "GANHO", "motivo": "Sentença conferida no tribunal."}') from ids, e;
select pg_temp.fim();
select is((select pg_temp.avisados(ki) from e), array['Bianca Torres', 'Diego Almeida', 'Marina Ribeiro'],
  'C2: "Registrar o resultado" do importado encerrado avisa, e quem registrou (Marina) também recebe');
select is((select pg_temp.aviso(ki, socia) -> 'dados' ->> 'motivo' from e, ids), 'ROTINA', 'C2: com a frase de ROTINA');

-- ---------------------------------------------------------------------------------------
-- 7. Dois casos no mesmo contrato. O A fica pronto quando o B é aberto e ligado (OUTRO_CASO); o
-- período do A fecha com PENDENCIA quando o B encerra; o delete em caso_clientes confere o A.
create temp table g as select pg_temp.cliente('Ivone Martins') i, pg_temp.cliente('Ivo Prates') p;
alter table g add column ci uuid, add column cp uuid, add column a uuid, add column b uuid, add column a2 uuid, add column b2 uuid;
update g set ci = pg_temp.contrato(i, jsonb_build_array(jsonb_build_object('tipo', 'PARCELADO', 'total', 200000, 'parcelas', 2, 'primeiro', '2026-10-10'))),
             cp = pg_temp.contrato(p, jsonb_build_array(jsonb_build_object('tipo', 'PARCELADO', 'total', 200000, 'parcelas', 2, 'primeiro', '2026-10-10')));
update g set a = pg_temp.caso('Martins x INSS · pensão', pg_temp.um(i, ci)), a2 = pg_temp.caso('Prates x INSS', pg_temp.um(p, cp));
select pg_temp.pagar(pg_temp.parcela(ci, 1)), pg_temp.pagar(pg_temp.parcela(cp, 1)), pg_temp.encerrar(a), pg_temp.encerrar(a2) from g;
select pg_temp.fim();
update g set b = pg_temp.caso('Martins x INSS · aposentadoria', pg_temp.um(i, ci)), b2 = pg_temp.caso('Prates x Estado', pg_temp.um(p, cp));
select pg_temp.fim();
select is((select pg_temp.periodos(a) from g), 'OUTRO_CASO:ABERTO', 'resposta 3: o A fica pronto quando o B, em andamento, ganha o contrato');
select is((select pg_temp.aviso(a, diego) -> 'dados' ->> 'outroCaso' || ' / ' || (pg_temp.aviso(a, diego) -> 'dados' ->> 'contratoSegue') from g, ids),
  (select 'Martins x INSS · aposentadoria / ' || numero from contratos, g where id = g.ci), 'o aviso diz o caso e o contrato que seguem');
select is((select pg_temp.avisados(a) from g), array['Bianca Torres', 'Diego Almeida', 'Marina Ribeiro'],
  'quem ligou pelo Jurídico (Marina) também recebe');
select pg_temp.encerrar(b) from g;
select pg_temp.fim();
select is((select pg_temp.periodos(a) from g), 'OUTRO_CASO:PENDENCIA', 'o B encerra, as parcelas voltam ao A: o período fecha com PENDENCIA');
select is((select pg_temp.aviso(a, diego) -> 'agora' from g, ids), '{"pendente": true}'::jsonb, 'o aviso mostra "Agora": voltou a ter pendência');
delete from caso_clientes using g where caso_clientes.caso_id = g.b2;
select pg_temp.fim();
select is((select pg_temp.periodos(a2) from g), 'OUTRO_CASO:PENDENCIA', 'tirar o B do contrato (delete em caso_clientes) confere o A');

-- ---------------------------------------------------------------------------------------
-- 9. Encerrar o contrato com 10 parcelas futuras: um aviso por pessoa e um caso_acerto só.
create temp table i as select pg_temp.cliente('Tomás Reis') t;
alter table i add column ct uuid, add column caso uuid, add column antes bigint;
update i set ct = pg_temp.contrato(t, jsonb_build_array(jsonb_build_object('tipo', 'MENSAL', 'valor', 50000, 'primeiro', '2026-06-10', 'meses', 16)));
update i set caso = pg_temp.caso('Reis x Banco', pg_temp.um(t, ct));
select pg_temp.pagar_ate(ct, '2026-11-18'), pg_temp.encerrar(caso) from i;
select pg_temp.fim();
select portal_contrato_encerrar(felipe, rm, ct, (select versao from contratos where id = i.ct), 'Caso perdido; sem mais cobrança.') from ids, i;
update i set antes = pg_temp.acertos();
select pg_temp.fim();
select is((select count(*) from recebimentos_previstos r, i where r.contrato_id = i.ct and r.cancelado_em is not null), 10::bigint,
  'o contrato encerrado cancela as 10 parcelas futuras');
select is((select pg_temp.acertos() - antes from i), 1::bigint, 'a conferência chama caso_acerto uma vez só, não uma por parcela');
select is((select pg_temp.avisados(caso) from i), array['Bianca Torres', 'Diego Almeida', 'Marina Ribeiro'], 'um aviso por pessoa');
select is((select pg_temp.aviso(caso, socia) -> 'dados' ->> 'contratoEncerrado' from i, ids), (select numero from contratos, i where id = i.ct),
  'motivo CONTRATO_ENCERRADO, com o contrato');
select is((select pg_temp.periodos(caso) from i), 'CONTRATO_ENCERRADO:ABERTO', 'o período abre com CONTRATO_ENCERRADO');

-- ---------------------------------------------------------------------------------------
-- 10, 15 e 16. A rotina, o contexto e o acesso.
create temp table j as select pg_temp.cliente('Paulo Nogueira') p;
alter table j add column ct uuid, add column caso uuid;
update j set ct = pg_temp.fixo(p);
update j set caso = pg_temp.caso('Nogueira x Banco', pg_temp.um(p, ct));
select pg_temp.pagar_ate(ct, '2026-10-31'), pg_temp.encerrar(caso) from j;
-- Nenhum gatilho viu (como se faltasse um): só a rotina abre o período.
select set_config('t3jus.casos_prontos', '{}', true);
select pg_temp.fim();
select is((select pg_temp.periodos(caso) from j), '', 'sem anotação, nada abre');
select portal_avisos(intrusa, outro) from ids;
select caso_pronto_conferir(rm, caso, jsonb_build_object('escritorio', rm, 'motivo', 'ROTINA')) from ids, j;
select is((select pg_temp.periodos(caso) from j), '', 'PT-01: com o contexto de outro escritório, a conferência não grava');
select is((select (portal_avisos(intrusa, outro) ->> 'total')::int from ids), 0, 'PT-01: o outro escritório não vê aviso nenhum');
set local role dominio;
select is((select count(*) from casos_prontos_fechar), 0::bigint, 'PT-01: no contexto do outro escritório, nenhum período aparece');
reset role;
set local role service_role;
select throws_ok($$ select * from casos_prontos_fechar $$, '42501', null, 'nem a chave de serviço lê os períodos direto');
reset role;
update escritorios set contrato_fim_em = hoje_brasilia() - 1 from ids where escritorios.id = ids.outro;
select is(avisar_casos_prontos_fechar(), 1, 'a rotina abre o período que faltava (o outro escritório, em consulta, fica de fora)');
select is((select pg_temp.avisados(caso) from j), array['Bianca Torres', 'Diego Almeida', 'Marina Ribeiro'], 'a rotina avisa todos com o Financeiro');
select is((select pg_temp.aviso(caso, socia) -> 'dados' ->> 'motivo' || ' ' || coalesce(pg_temp.aviso(caso, socia) -> 'dados' ->> 'quem', '-') from j, ids),
  'ROTINA -', 'a rotina avisa com o motivo ROTINA, sem quem');
select is(avisar_casos_prontos_fechar(), 0, 'a rotina de novo não abre nada');
select is((select count(*) from avisos_sino s, j where s.origem_id = j.caso), 3::bigint, 'a rotina de novo não repete o aviso');
select is((select array_agg(p.proname::text order by p.proname) from pg_proc p
            where p.pronamespace = 'public'::regnamespace and p.prosecdef
              and (p.proname like 'caso\_pronto%' or p.proname in ('avisar_casos_prontos_fechar', 'casos_prontos_fechar_guardiao', 'aviso_sino_linha'))),
  array['avisar_casos_prontos_fechar', 'caso_pronto_fim'], 'das funções novas, só a adiada e a rotina são security definer');

-- ---------------------------------------------------------------------------------------
-- 11 e 27. Voltou a ter pendência, pronto de novo e a regra das 24 horas dos dois lados.
create temp table k as select pg_temp.cliente('Regina Lima') r;
alter table k add column ct uuid, add column caso uuid, add column c1 uuid, add column c2 uuid;
update k set ct = pg_temp.fixo(r);
update k set caso = pg_temp.caso('Lima x Condomínio Solar', pg_temp.um(r, ct));
select pg_temp.pagar_ate(ct, '2026-10-31'), pg_temp.encerrar(caso) from k;
select pg_temp.fim();
select portal_aviso_lido(bianca, rm, (pg_temp.aviso(caso, bianca) ->> 'id')::uuid) from ids, k;
select ajustar_relogio(('2026-11-19 09:00-03'::timestamptz - now()));
update k set c1 = pg_temp.conta(caso, 'Cópia do processo, R$ 45,00');
select pg_temp.fim();
select is((select pg_temp.periodos(caso) from k), 'CASO_ENCERRADO:PENDENCIA', 'a despesa nova fecha o período com PENDENCIA');
select pg_temp.reembolsar(c1) from k;
select pg_temp.fim();
select is((select pg_temp.avisados(caso, pg_temp.periodo(caso, 2)) from k), array['Bianca Torres'],
  'pronto de novo: o aviso não lido de 23 h segura (Marina); o lido não segura (Bianca); Diego registrou');
select is((select (pg_temp.aviso(caso, bianca, 2) -> 'dados') - 'periodoId' - 'caso' - 'clientes' - 'contratoId' - 'contrato' from k, ids),
  '{"parcelas": 1, "motivo": "REEMBOLSO", "denovo": true, "quem": "Diego Almeida"}'::jsonb,
  'PT-02: motivo REEMBOLSO de novo, sem a descrição que tem valor');
select ajustar_relogio(('2026-11-19 11:00-03'::timestamptz - now()));
update k set c2 = pg_temp.conta(caso, 'Cópia do processo');
select pg_temp.fim();
select pg_temp.reembolsar(c2) from k;
select pg_temp.fim();
select is((select pg_temp.avisados(caso, pg_temp.periodo(caso, 3)) from k), array['Marina Ribeiro'],
  'o não lido de 25 h não segura (Marina); o não lido de 2 h segura (Bianca)');
select is((select pg_temp.aviso(caso, socia, 3) -> 'dados' ->> 'reembolso' from k, ids), 'Cópia do processo', 'a descrição sem valor vai no aviso');
select is((select pg_temp.periodos(caso) from k), 'CASO_ENCERRADO:PENDENCIA REEMBOLSO:PENDENCIA REEMBOLSO:ABERTO', 'os três períodos, em ordem');

-- ---------------------------------------------------------------------------------------
-- 13 e 24. Dois períodos na mesma transação (o "depois" pela ordem) e o "depois" por pessoa.
create temp table l as select pg_temp.cliente('Lúcia Nogueira') c;
alter table l add column ct uuid, add column caso uuid;
update l set ct = pg_temp.fixo(c);
update l set caso = pg_temp.caso('Nogueira x Construtora', pg_temp.um(c, ct));
select pg_temp.pagar_ate(ct, '2026-10-31'), pg_temp.encerrar(caso) from l;
select pg_temp.fim();
select portal_aviso_lido(socia, rm, (pg_temp.aviso(caso, socia) ->> 'id')::uuid) from ids, l;
select pg_temp.conta(caso, 'Diligência do oficial') from l;
select pg_temp.fim();
select pg_temp.reembolsar(id) from contas_pagar, l where caso_id = l.caso and reembolsado_em is null;
select pg_temp.fim();
select is((select count(distinct pronto_em) || ' ' || pg_temp.periodos(caso) from casos_prontos_fechar, l where caso_id = l.caso group by l.caso),
  '1 CASO_ENCERRADO:PENDENCIA REEMBOLSO:ABERTO', 'os dois períodos têm o mesmo pronto_em; a ordem vem de "ordem"');
select is((select pg_temp.aviso(caso, socia, 1) -> 'agora' from l, ids), '{"depois": true}'::jsonb,
  'o aviso antigo da Marina, que recebeu o novo, diz "Aviso antigo"');
select is((select pg_temp.aviso(caso, socia, 2) ? 'agora' from l, ids), false, 'o aviso novo da Marina não traz "agora"');
select is((select pg_temp.aviso(caso, bianca, 1) ? 'agora' from l, ids), false,
  'C3: Bianca não recebeu o novo (24 h); o aviso antigo dela segue o período mais novo, aberto: sem "agora"');
select pg_temp.conta(caso, 'Postagem') from l;
select pg_temp.fim();
select is((select pg_temp.aviso(caso, bianca, 1) -> 'agora' from l, ids), '{"pendente": true}'::jsonb,
  'C3: o período mais novo voltou a ter pendência, e o aviso antigo da Bianca mostra isso');
select is((select pg_temp.aviso(caso, socia, 1) -> 'agora' from l, ids), '{"depois": true}'::jsonb, 'o da Marina continua "Aviso antigo"');
select pg_temp.reembolsar(id) from contas_pagar, l where caso_id = l.caso and reembolsado_em is null;
select portal_financeiro_caso_encerrar(socia, rm, caso) from ids, l;
select pg_temp.fim();
select is((select array[pg_temp.aviso(caso, socia, 1) -> 'agora' ? 'encerrado', pg_temp.aviso(caso, socia, 2) -> 'agora' ? 'encerrado',
                        pg_temp.aviso(caso, bianca, 1) -> 'agora' ? 'encerrado'] from l, ids), array[true, true, true],
  'encerrado o caso, todos os avisos dele dizem "encerrado"');

-- ---------------------------------------------------------------------------------------
-- 25 e 26. A despesa trocada de caso confere os dois; o contrato só de êxito que passa a ativo.
create temp table t as select pg_temp.cliente('Otávio Brito') oa, pg_temp.cliente('Beatriz Brito') ob, pg_temp.cliente('Celso Vidal') cv;
alter table t add column ca uuid, add column cb uuid, add column cc uuid, add column ka uuid, add column kb uuid, add column kc uuid, add column conta uuid;
update t set ca = pg_temp.fixo(oa), cb = pg_temp.fixo(ob),
             cc = pg_temp.contrato(cv, jsonb_build_array(jsonb_build_object('tipo', 'EXITO', 'percentual', 2000, 'sobre', 'Valor da condenação',
                                                                             'etapa', 'Encerrado', 'dias', 0)), false);
update t set ka = pg_temp.caso('Brito x Loja A', pg_temp.um(oa, ca)), kb = pg_temp.caso('Brito x Loja B', pg_temp.um(ob, cb)),
             kc = pg_temp.caso('Vidal x Empresa', pg_temp.um(cv, cc));
update t set conta = pg_temp.conta(ka, 'Custas da Loja A');
select pg_temp.pagar_ate(ca, '2026-10-31'), pg_temp.pagar_ate(cb, '2026-10-31'), pg_temp.encerrar(ka), pg_temp.encerrar(kb), pg_temp.encerrar(kc) from t;
select pg_temp.fim();
select is((select pg_temp.periodos(ka) || '|' || pg_temp.periodos(kb) || '|' || pg_temp.periodos(kc) from t), '|CASO_ENCERRADO:ABERTO|',
  'antes: A com a despesa, B pronto, C com o contrato em elaboração');
-- Nenhuma tela troca a conta de caso hoje (o guardião não deixa); o teste desliga o guardião só aqui.
set constraints all immediate;
alter table contas_pagar disable trigger contas_pagar_guardiao;
update contas_pagar set caso_id = t.kb from t where contas_pagar.id = t.conta;
alter table contas_pagar enable trigger contas_pagar_guardiao;
select pg_temp.fim();
select is((select pg_temp.periodos(ka) || '|' || pg_temp.periodos(kb) from t), 'ROTINA:ABERTO|CASO_ENCERRADO:PENDENCIA',
  'a despesa trocada de A para B confere os dois casos');
select portal_contrato_assinatura(socia, rm, cc, 1, '2026-05-28') from ids, t;
select pg_temp.fim();
select is((select pg_temp.periodos(kc) || ' ' || pg_temp.avisados(kc)::text from t), 'ROTINA:ABERTO {"Bianca Torres","Diego Almeida"}',
  'o contrato só de êxito que passa a ativo com o caso já encerrado avisa (Marina assinou)');

-- ---------------------------------------------------------------------------------------
-- 22. O commit pela API, como service_role (Postgres 17: o gatilho adiado roda com o papel do
-- commit). Sem security definer na função adiada, a conferência leria as tabelas como
-- service_role, e o commit falharia.
create temp table r as select pg_temp.cliente('Rui Campos') c;
alter table r add column ct uuid, add column caso uuid, add column parcela uuid;
update r set ct = pg_temp.fixo(c);
update r set caso = pg_temp.caso('Campos x Banco', pg_temp.um(c, ct));
update r set parcela = pg_temp.parcela(ct, 1);
select pg_temp.encerrar(caso) from r;
select pg_temp.fim();
select diego, rm, parcela, hoje_brasilia() hoje from ids, r \gset
set local role service_role;
select portal_financeiro_receber_registrar_recibo(:'diego', :'rm', :'parcela',
  jsonb_build_object('valor', 90000, 'recebidoEm', :'hoje', 'forma', 'PIX')) is not null;
set constraints all immediate;
reset role;
set constraints caso_pronto_fim, caso_pronto_fim_mudou, caso_pronto_fim_saiu, destinacoes_fecham deferred;
select is((select pg_temp.periodos(caso) || ' ' || pg_temp.avisados(caso)::text from r), 'PAGAMENTO:ABERTO {"Bianca Torres","Marina Ribeiro"}',
  'o commit pela API como service_role abre o período e avisa');

-- ---------------------------------------------------------------------------------------
-- 23. A importação em massa de casos fora do escopo não anota nem chama caso_acerto.
create temp table s as select pg_temp.cliente('Importado Silva') c;
alter table s add column ct uuid, add column antes bigint;
update s set ct = pg_temp.fixo(c);
insert into casos (escritorio_id, nome, area, etapa_id, responsavel_id, situacao, encerrado_em, encerrado_por, criado_por)
select ids.rm, 'Importado ' || n, 'CIVEL', (select id from etapas where escritorio_id = ids.rm and final), ids.larissa,
       'ENCERRADO', app_now(), 'IMPORTADO_ENCERRADO', ids.socia
  from ids, generate_series(1, 50) n;
select set_config('t3jus.casos_prontos', '{}', true);
update s set antes = pg_temp.acertos();
insert into caso_clientes (escritorio_id, caso_id, cliente_id, papel, contrato_id, ordem)
select ids.rm, ca.id, s.c, 'AUTOR', s.ct, 1 from ids, s, casos ca where ca.nome like 'Importado %' and ca.escritorio_id = ids.rm;
insert into recebimentos_previstos (escritorio_id, contrato_id, tipo, descricao, vencimento, valor, origem)
select ids.rm, s.ct, 'FIXO', 'Importada ' || n, date '2025-01-01' + n, 1000, 'PROGRAMADO' from ids, s, generate_series(1, 1000) n;
select is(current_setting('t3jus.casos_prontos', true), '{}', '1.000 parcelas e 50 casos importados encerrados não anotam nada');
select pg_temp.fim();
select is((select pg_temp.acertos() - antes from s), 0::bigint, 'nem chamam caso_acerto');

-- ---------------------------------------------------------------------------------------
-- 17. Erro forçado em três lugares: o pagamento fica, e o erro vai para o histórico interno.
create temp table m as select pg_temp.cliente('Mário Alves') c1, pg_temp.cliente('Márcia Alves') c2, pg_temp.cliente('Moacir Alves') c3;
alter table m add column ct1 uuid, add column ct2 uuid, add column ct3 uuid, add column k1 uuid, add column k2 uuid, add column k3 uuid;
update m set ct1 = pg_temp.fixo(c1), ct2 = pg_temp.fixo(c2), ct3 = pg_temp.fixo(c3);
update m set k1 = pg_temp.caso('Alves x Um', pg_temp.um(c1, ct1)), k2 = pg_temp.caso('Alves x Dois', pg_temp.um(c2, ct2)),
             k3 = pg_temp.caso('Alves x Três', pg_temp.um(c3, ct3));
select pg_temp.pagar_ate(ct2, '2026-10-31'), pg_temp.encerrar(k1), pg_temp.encerrar(k2), pg_temp.encerrar(k3) from m;
select pg_temp.fim();
create function pg_temp.erro() returns trigger language plpgsql as $$ begin raise exception 'erro forçado'; end $$;
savepoint erro_aviso;
create trigger erro_forcado before insert on avisos_sino for each row execute function pg_temp.erro();
select pg_temp.pagar(pg_temp.parcela(ct1, 1)) from m;
select pg_temp.fim();
select (select count(*) from pagamentos_recebidos p, m where p.parcela_id = pg_temp.parcela(m.ct1, 1)) || ' ' || pg_temp.periodos(k1) || ' '
       || (select count(*) from historico h where h.acao = 'financeiro.caso_pronto_falhou' and h.entidade_id = m.k1::text) erro_aviso from m \gset
rollback to savepoint erro_aviso;
select is(:'erro_aviso'::text, '1  1'::text, 'erro ao gravar o aviso: o pagamento fica, nenhum período, e o erro vai para o histórico interno');
savepoint erro_fechar;
create trigger erro_forcado before update on casos_prontos_fechar for each row execute function pg_temp.erro();
select pg_temp.conta(k2, 'Custas forçadas') from m;
select pg_temp.fim();
select (select count(*) from contas_pagar cp, m where cp.caso_id = m.k2) || ' ' || pg_temp.periodos(k2) || ' '
       || (select count(*) from historico h where h.acao = 'financeiro.caso_pronto_falhou' and h.entidade_id = m.k2::text) erro_fechar from m \gset
rollback to savepoint erro_fechar;
select is(:'erro_fechar'::text, '1 CASO_ENCERRADO:ABERTO 1'::text, 'erro ao fechar o período: a despesa fica, e o erro vai para o histórico interno');
savepoint erro_acerto;
create or replace function caso_acerto(p_escritorio uuid, p_caso uuid) returns jsonb language plpgsql as $$
begin raise exception 'erro forçado no acerto'; end $$;
select pg_temp.pagar(pg_temp.parcela(ct3, 1)) from m;
select pg_temp.fim();
select (select count(*) from pagamentos_recebidos p, m where p.parcela_id = pg_temp.parcela(m.ct3, 1)) || ' ' || pg_temp.periodos(k3) || ' '
       || (select count(*) from historico h where h.acao = 'financeiro.caso_pronto_falhou' and h.entidade_id = m.k3::text) erro_acerto from m \gset
rollback to savepoint erro_acerto;
select is(:'erro_acerto'::text, '1  1'::text, 'erro no caso_acerto: o pagamento fica, e o erro vai para o histórico interno');

-- ---------------------------------------------------------------------------------------
-- 18. O sino com 200 avisos do tipo novo não chama caso_acerto.
savepoint muitos;
insert into avisos_sino (escritorio_id, pessoa_id, tipo, dados, origem_tabela, origem_id)
select ids.rm, ids.socia, 'CASO_PRONTO_FECHAR', jsonb_build_object('caso', 'Lima x Condomínio Solar', 'periodoId', pg_temp.periodo(k.caso, 1)), 'casos', k.caso
  from ids, k, generate_series(1, 200);
select pg_temp.acertos() antes \gset
select (portal_avisos(socia, rm) ->> 'total') || ' ' || (pg_temp.acertos() - :antes) muitos from ids \gset
rollback to savepoint muitos;
select is(:'muitos'::text, '200 0'::text, 'o sino com 200 avisos do tipo novo não chama caso_acerto');

-- ---------------------------------------------------------------------------------------
-- 19. O guardião dos períodos.
select pg_temp.periodo(k.caso, 1) p1, pg_temp.periodo(k.caso, 3) p3 from k \gset
select throws_ok(format('delete from casos_prontos_fechar where id = %L', :'p3'), 'TC023', null, 'PT-03: o período não se apaga');
select throws_ok(format('update casos_prontos_fechar set pronto_em = pronto_em - interval ''1 day'' where id = %L', :'p3'), 'TC023', null,
  'PT-03: o período não muda o pronto_em');
select throws_ok(format('update casos_prontos_fechar set saiu_por = ''FORA'' where id = %L', :'p1'), 'TC023', null,
  'PT-03: o período fechado não se muda');

-- ---------------------------------------------------------------------------------------
-- 20. A folha do contrato pela regra da 0921: o importado encerrado só com levantamento.
create temp table f as select pg_temp.cliente('Fábio Teles') c;
alter table f add column ct uuid, add column k1 uuid, add column k2 uuid;
update f set ct = pg_temp.fixo(c);
update f set k1 = pg_temp.caso('Teles x Um', pg_temp.um(c, ct)), k2 = pg_temp.caso('Teles x Dois', pg_temp.um(c, ct));
update casos set situacao = 'ENCERRADO', encerrado_em = app_now(), encerrado_por = 'IMPORTADO_ENCERRADO' from f where casos.id in (f.k1, f.k2);
insert into levantamentos (escritorio_id, caso_id, cliente_id, tipo, valor, entrou_em, autor_id, responsavel_id)
select rm, k2, c, 'RPV', 100000, hoje_brasilia(), diego, diego from f, ids;
select is((select jsonb_path_query_array(portal_financeiro_contrato_fechamentos(diego, rm, ct), '$[*].casoId') from ids, f),
  (select jsonb_build_array(k2) from f), 'a folha do contrato mostra o importado encerrado com levantamento e não o sem levantamento');

-- ---------------------------------------------------------------------------------------
-- 21. O check do sino: os 25 tipos de TipoAvisoSino (avisos.ts) mais o novo.
select is((select array_agg(x order by x) from (select unnest(regexp_matches(pg_get_constraintdef(oid), '''([A-Z0-9_]+)''', 'g')) x
             from pg_constraint where conrelid = 'avisos_sino'::regclass and conname = 'avisos_sino_tipo_check') t),
  (select array_agg(x order by x) from unnest(array[
    'CONVERSA_IA', 'CONVERSA_ASSUMIDA', 'CONVERSA_PASSADA', 'AUTOMACAO_SUGESTAO',
    'MODELO_APROVADO', 'MODELO_RECUSADO', 'PRAZO_2_DIAS',
    'PETICAO_REVISAR', 'PETICAO_DECIDIDA', 'PETICAO_PASSADA',
    'BASE_DO_MES', 'PEDIDO_CONTRATO', 'CONTRATO_GERADO',
    'REPASSE_PASSADO', 'REPASSE_ATRASADO', 'REPASSE_PROXIMA_ACAO',
    'EXPORTAR_CONTADOR', 'DOCUMENTO_CHEGOU', 'CARNE_DESATUALIZADO', 'PEDIDO_CHAVE_PIX',
    'EXITO_VALOR_MUDOU', 'EXITO_NAO_COBRADO', 'CASO_ABERTO_NA_ASSINATURA', 'CLIENTE_FEZ_18',
    'DOCUMENTOS_INICIO_CHEGARAM', 'CASO_PRONTO_FECHAR']) x),
  'o check do sino tem os 25 tipos do domain mais CASO_PRONTO_FECHAR');

-- Nenhum cenário deixou erro nem saída do escopo sem levantamento no histórico.
select is(pg_temp.falhas(), 0::bigint, 'nenhum financeiro.caso_pronto_falhou nem caso_pronto_fora_sem_levantamento');

select * from finish();
rollback;
