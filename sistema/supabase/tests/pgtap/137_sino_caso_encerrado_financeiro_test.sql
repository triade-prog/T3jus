-- O aviso no sino quando o caso é encerrado no financeiro (1020; F3.150: EX-16, EX-17; também
-- PT-02, sem valor nos dados, e PT-10, nada de um escritório no aviso de outro). Quem recebe (os
-- dois grupos e as seis respostas da Carol), os dados de cada papel, o gatilho adiado que vê a
-- cadeia inteira, o "agoraFechou", o commit pela API como service_role, o erro que não derruba o
-- encerramento e a lista exata do check do sino (o tipo mais novo).
-- O pgTAP nunca faz commit: pg_temp.fim() faz o papel do commit (dispara os gatilhos adiados) e
-- volta a adiar só os gatilhos nomeados.
begin;
select plan(67);

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
-- Felipe com o Jurídico, como pede o NOTAS.md do desenho (o destino "Ver o caso").
select portal_convidar(socia, rm, diego, 'Diego Almeida', array['FINANCEIRO', 'COMERCIAL']),
       portal_convidar(socia, rm, bianca, 'Bianca Torres', array['CONTRATOS', 'FINANCEIRO']),
       portal_convidar(socia, rm, larissa, 'Larissa Costa', array['JURIDICO']),
       portal_convidar(socia, rm, felipe, 'Felipe Matos', array['COMERCIAL', 'CONTRATOS', 'JURIDICO']) from ids;

-- ---------------------------------------------------------------------------------------
-- Ajudantes (cliente, contrato, fixo, um e pagar_ate copiados do 135).
create temp sequence tel;
create function pg_temp.fim() returns void language plpgsql as $$
begin
  set constraints all immediate;
  set constraints caso_fechou_fim, caso_pronto_fim, caso_pronto_fim_mudou, caso_pronto_fim_saiu, destinacoes_fecham deferred;
end $$;
create function pg_temp.cliente(p_nome text) returns uuid language sql as $$
  select (portal_cliente_cadastrar(ids.socia, ids.rm, jsonb_build_object('tipo', 'PF', 'nome', p_nome, 'origem', 'GOOGLE',
    'contatos', jsonb_build_array(jsonb_build_object('nome', p_nome, 'telefone', '+55119843' || lpad(nextval('tel')::text, 5, '0'),
      'principal', true)))) ->> 'id')::uuid from ids
$$;
create function pg_temp.contrato(p_cliente uuid, p_condicoes jsonb) returns uuid language plpgsql as $$
declare v uuid; v_relogio interval := (select adiantamento from app_relogio);
begin
  perform ajustar_relogio(('2026-05-28 10:00-03'::timestamptz - now()));
  select (portal_contrato_criar(ids.socia, ids.rm, jsonb_build_object('clienteId', p_cliente, 'objeto', 'Honorários do caso',
    'responsavelId', ids.felipe, 'advogados', jsonb_build_array(ids.socia), 'condicoes', p_condicoes)) ->> 'id')::uuid into v from ids;
  perform portal_contrato_assinatura(ids.socia, ids.rm, v, 1, '2026-05-28') from ids;
  perform ajustar_relogio(v_relogio);
  return v;
end $$;
create function pg_temp.fixo(p_cliente uuid) returns uuid language sql as $$
  select pg_temp.contrato(p_cliente, jsonb_build_array(jsonb_build_object('tipo', 'FIXO', 'valor', 90000, 'vencimento', '2026-06-02')))
$$;
create function pg_temp.um(p_cliente uuid, p_contrato uuid) returns jsonb language sql as $$
  select jsonb_build_array(jsonb_build_object('clienteId', p_cliente, 'papel', 'AUTOR', 'contratoId', p_contrato))
$$;
create function pg_temp.pagar_ate(p_pessoa uuid, p_contrato uuid) returns void language sql as $$
  select count(portal_financeiro_receber_registrar_recibo(p_pessoa, ids.rm, r.id,
    jsonb_build_object('valor', r.valor, 'recebidoEm', hoje_brasilia(), 'forma', 'PIX')))
    from ids, (select id, valor from recebimentos_previstos where contrato_id = p_contrato and cancelado_em is null order by vencimento) r;
$$;
create function pg_temp.caso(p_nome text, p_clientes jsonb, p_resp uuid) returns uuid language sql as $$
  select (portal_juridico_caso_criar(ids.socia, ids.rm, jsonb_build_object('nome', p_nome, 'area', 'CIVEL',
    'etapaId', (select id from etapas where escritorio_id = ids.rm and ordem = 5), 'responsavelId', p_resp,
    'clientes', p_clientes)) ->> 'id')::uuid from ids
$$;
-- Um caso com um contrato fixo por cliente, encerrado no Jurídico; a última parcela de cada
-- contrato é paga por p_pagador (que não recebe o aviso de "pronto").
create function pg_temp.montar(p_nome text, p_clientes text[], p_resp uuid, p_pagador uuid default null) returns uuid language plpgsql as $$
declare v_cli uuid; v_ct uuid; v_lista jsonb := '[]'; v_cts uuid[] := '{}'; v_caso uuid; n text;
begin
  foreach n in array p_clientes loop
    v_cli := pg_temp.cliente(n); v_ct := pg_temp.fixo(v_cli);
    v_lista := v_lista || jsonb_build_object('clienteId', v_cli, 'papel', 'AUTOR', 'contratoId', v_ct);
    v_cts := v_cts || v_ct;
  end loop;
  v_caso := pg_temp.caso(p_nome, v_lista, p_resp);
  perform portal_juridico_caso_etapa(ids.larissa, ids.rm, v_caso, (select versao from casos where id = v_caso),
    jsonb_build_object('etapaId', (select id from etapas where escritorio_id = ids.rm and final), 'motivo', 'Sentença sem recurso', 'resultado', 'PERDA'))
    from ids;
  perform pg_temp.fim();
  foreach v_ct in array v_cts loop perform pg_temp.pagar_ate(coalesce(p_pagador, (select diego from ids)), v_ct); end loop;
  perform pg_temp.fim();
  return v_caso;
end $$;
-- O n-ésimo contrato do caso, por número.
create function pg_temp.ct(p_caso uuid, p_n integer default 1) returns uuid language sql as $$
  select c.id from contratos c where c.id in (select contrato_id from caso_clientes where caso_id = p_caso) order by c.numero offset p_n - 1 limit 1
$$;
create function pg_temp.num(p_contrato uuid) returns text language sql as $$ select numero from contratos where id = p_contrato $$;
create function pg_temp.encerrar_contrato(p_pessoa uuid, p_contrato uuid) returns jsonb language sql as $$
  select portal_contrato_encerrar(p_pessoa, ids.rm, p_contrato, (select versao from contratos where id = p_contrato), 'Tudo recebido.') from ids
$$;
-- Encerrar no financeiro pela função de quatro argumentos (a da API), levando os contratos dados.
create function pg_temp.fechar(p_pessoa uuid, p_caso uuid, p_contratos uuid[] default '{}') returns jsonb language sql as $$
  select portal_financeiro_caso_encerrar(p_pessoa, ids.rm, p_caso,
    coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'versao', c.versao)) from contratos c where c.id = any (p_contratos)), '[]'::jsonb)) from ids
$$;
-- Quem recebeu o aviso novo do caso, "Nome:PAPEL", em ordem.
create function pg_temp.avisados(p_caso uuid) returns text[] language sql as $$
  select coalesce(array_agg(p.nome || ':' || (s.dados ->> 'papel') order by p.nome), '{}') from avisos_sino s join pessoas p on p.id = s.pessoa_id
   where s.tipo = 'CASO_ENCERRADO_FINANCEIRO' and s.origem_id = p_caso
$$;
create function pg_temp.aviso(p_caso uuid, p_pessoa uuid) returns jsonb language sql as $$
  select aviso_sino_linha(s) from avisos_sino s where s.tipo = 'CASO_ENCERRADO_FINANCEIRO' and s.origem_id = p_caso and s.pessoa_id = p_pessoa
$$;
create function pg_temp.pronto(p_caso uuid, p_pessoa uuid) returns boolean language sql as $$
  select exists (select 1 from avisos_sino where tipo = 'CASO_PRONTO_FECHAR' and origem_id = p_caso and pessoa_id = p_pessoa)
$$;
create function pg_temp.falhas() returns bigint language sql as $$
  select count(*) from historico where acao = 'financeiro.caso_fechou_falhou'
$$;
create function pg_temp.acertos() returns bigint language sql as $$
  select coalesce(pg_stat_get_xact_function_calls('caso_acerto(uuid,uuid)'::regprocedure), 0)
$$;
create function pg_temp.ref(p uuid) returns jsonb language sql as $$ select jsonb_build_object('id', id, 'nome', nome) from pessoas where id = p $$;
select portal_juridico_casos(socia, rm) from ids;

-- ---------------------------------------------------------------------------------------
-- 1. Carvalho, grupo A. Felipe é o responsável; o contrato de Cláudio foi encerrado por ele em
-- 12/11; Diego (sem Contratos) encerra o caso no financeiro sem os contratos.
create temp table carv as select pg_temp.montar('Carvalho x Construtora Lume', array['Noemi Bastos Carvalho', 'Cláudio Carvalho'], felipe) caso from ids;
select ajustar_relogio(('2026-11-12 09:30-03'::timestamptz - now()));
select pg_temp.encerrar_contrato(felipe, pg_temp.ct(caso, 2)) from ids, carv;
select ajustar_relogio(('2026-11-18 10:05-03'::timestamptz - now()));
select pg_temp.fim();
select pg_temp.fechar(diego, caso) from ids, carv;
select is((select count(*) from avisos_sino s, carv where s.origem_id = carv.caso and s.tipo = 'CASO_ENCERRADO_FINANCEIRO'), 0::bigint,
  'EX-17: antes do commit, nenhum aviso (o gatilho é adiado)');
select pg_temp.fim();
select is((select pg_temp.avisados(caso) from carv), array['Bianca Torres:CONTRATOS', 'Felipe Matos:CONTRATOS', 'Marina Ribeiro:CONTRATOS'],
  'EX-17 (resposta 1, 6): sobrou contrato, avisa quem encerra contratos (Bianca, Felipe e Marina); não Diego, que encerrou, nem Larissa');
select is((select count(*) from avisos_sino s, carv, ids where s.origem_id = carv.caso and s.pessoa_id = ids.felipe), 1::bigint,
  'Felipe, responsável e do grupo A, recebe um aviso só (o que pede a ação)');
create temp table c1 as select pg_temp.aviso(caso, felipe) j, pg_temp.ct(caso, 1) noemi, pg_temp.ct(caso, 2) claudio from carv, ids;
select is((select j -> 'dados' from c1), jsonb_build_object('papel', 'CONTRATOS', 'caso', 'Carvalho x Construtora Lume', 'quem', 'Diego Almeida',
    'clienteId', (select cliente_id from contratos where id = c1.noemi), 'cliente', 'Noemi Bastos Carvalho',
    'abertos', jsonb_build_array(jsonb_build_object('id', c1.noemi, 'numero', pg_temp.num(c1.noemi), 'cliente', 'Noemi Bastos Carvalho',
                                                    'clienteId', (select cliente_id from contratos where id = c1.noemi))),
    'jaEncerrados', jsonb_build_array(jsonb_build_object('numero', pg_temp.num(c1.claudio), 'cliente', 'Cláudio Carvalho'))),
  'EX-01, PT-02: os dados do grupo A são exatamente papel, caso, quem, o primeiro cliente, abertos e jaEncerrados, sem valor')
  from c1;
select is((select (j ? 'agoraFechou')::text || ' ' || (j ->> 'tipo') || ' ' || (j ->> 'origem') from c1), 'false CASO_ENCERRADO_FINANCEIRO casos',
  'enquanto nada muda, a linha não traz agoraFechou');

-- 2. A cadeia: Marina encerra com o contrato; Larissa é a responsável.
create temp table fon as select pg_temp.montar('Fontes x Hospital São Lucas', array['Márcia Fontes'], larissa) caso from ids;
select pg_temp.fechar(socia, caso, array[pg_temp.ct(caso)]) from ids, fon;
select is((select count(*) from avisos_sino s, fon where s.origem_id = fon.caso and s.tipo = 'CASO_ENCERRADO_FINANCEIRO'), 0::bigint,
  'a cadeia: antes do commit, nada');
select pg_temp.fim();
select is((select pg_temp.avisados(caso) from fon), array['Larissa Costa:RESPONSAVEL'],
  'EX-17 (resposta 1): com o contrato encerrado junto, ninguém do grupo A recebe; Larissa sim; Marina, que encerrou, não');
select is((select pg_temp.aviso(caso, larissa) -> 'dados' from fon, ids), jsonb_build_object('papel', 'RESPONSAVEL', 'caso', 'Fontes x Hospital São Lucas',
    'quem', 'Marina Ribeiro', 'clienteId', (select cliente_id from contratos where id = pg_temp.ct(fon.caso)), 'cliente', 'Márcia Fontes',
    'juntos', jsonb_build_array(jsonb_build_object('numero', pg_temp.num(pg_temp.ct(fon.caso)), 'cliente', 'Márcia Fontes'))),
  'o gatilho adiado vê a cadeia inteira: juntos, sem abertos e sem quemContratos') from fon;

-- 4. O aviso e a ficha concordam: onde o aviso diria "terminou", o passo do fechamento acabou.
select is((select cliente_fechamento(rm, cc.cliente_id, fon.caso, false) ->> 'pendente' from ids, fon, caso_clientes cc where cc.caso_id = fon.caso),
  'false', 'EX-17: sem abertos e sem seguem, cliente_fechamento não tem pendente');

-- ---------------------------------------------------------------------------------------
-- 3. Resposta 2: Diego é o responsável (Financeiro, sem Contratos).
-- a) Bianca pagou a última parcela (Diego recebeu o "pronto") e encerra com a cadeia: ninguém recebe.
create temp table d1 as select pg_temp.montar('Diego 1 x Loja', array['Ana Prado'], diego, bianca) caso from ids;
select ok((select pg_temp.pronto(caso, diego) from d1, ids), 'Diego recebeu o aviso de "pronto"');
select pg_temp.fechar(bianca, caso, array[pg_temp.ct(caso)]) from ids, d1;
select pg_temp.fim();
select is((select pg_temp.avisados(caso) from d1), '{}'::text[],
  'resposta 2: com a cadeia, o fechamento terminou e Diego já tem o "pronto": não recebe');
-- b) Sem a cadeia: Diego recebe, com quem encerra contratos.
create temp table d2 as select pg_temp.montar('Diego 2 x Loja', array['Beto Prado'], diego, bianca) caso from ids;
select pg_temp.fechar(bianca, caso) from ids, d2;
select pg_temp.fim();
select is((select pg_temp.avisados(caso) from d2), array['Diego Almeida:RESPONSAVEL', 'Felipe Matos:CONTRATOS', 'Marina Ribeiro:CONTRATOS'],
  'resposta 2: com contrato aberto, Diego recebe; Bianca, que encerrou, não');
select is((select pg_temp.aviso(caso, diego) -> 'dados' -> 'quemContratos' from d2, ids), '["Bianca Torres", "Felipe Matos", "Marina Ribeiro"]'::jsonb,
  'resposta 6: a responsável vê quem encerra contratos, em ordem alfabética, com a Bianca');
select ok((select pg_temp.aviso(caso, diego) -> 'dados' ? 'abertos' and not (pg_temp.aviso(caso, felipe) -> 'dados' ? 'quemContratos') from d2, ids),
  'quemContratos só no papel RESPONSAVEL');
-- c) Com seguem e sem abertos: Diego recebe (o contrato que segue com outro caso fica aberto).
create temp table d3 as select pg_temp.montar('Diego 3 x Loja', array['Carla Prado'], diego, bianca) caso from ids;
alter table d3 add column outro uuid;
update d3 set outro = pg_temp.caso('Carla Prado x Banco', pg_temp.um((select cliente_id from contratos where id = pg_temp.ct(caso)), pg_temp.ct(caso)),
  (select larissa from ids));
select pg_temp.fim();
select pg_temp.fechar(bianca, caso) from ids, d3;
select pg_temp.fim();
select is((select pg_temp.avisados(caso) from d3), array['Diego Almeida:RESPONSAVEL'],
  'resposta 4 (P3): só seguem, Diego recebe mesmo com o "pronto"; o grupo A não, porque não há o que encerrar');
-- d) Com o aviso de "pronto" de 31 dias: recebe.
create temp table d4 as select pg_temp.montar('Diego 4 x Loja', array['Davi Prado'], diego, bianca) caso from ids;
-- O aviso não se muda pela aplicação; o teste desliga o guardião só aqui para envelhecer o "pronto".
alter table avisos_sino disable trigger avisos_sino_guardiao;
update avisos_sino set criado_em = criado_em - interval '31 days' from d4, ids
 where avisos_sino.origem_id = d4.caso and avisos_sino.pessoa_id = ids.diego and avisos_sino.tipo = 'CASO_PRONTO_FECHAR';
alter table avisos_sino enable trigger avisos_sino_guardiao;
select pg_temp.fechar(bianca, caso, array[pg_temp.ct(caso)]) from ids, d4;
select pg_temp.fim();
select is((select pg_temp.avisados(caso) from d4), array['Diego Almeida:RESPONSAVEL'], 'resposta 2: o "pronto" de mais de 30 dias não conta');
-- e) Diego registrou o último pagamento (não tem o "pronto"): recebe.
create temp table d5 as select pg_temp.montar('Diego 5 x Loja', array['Elza Prado'], diego, diego) caso from ids;
select ok((select not pg_temp.pronto(caso, diego) from d5, ids), 'Diego, que pagou, não recebeu o "pronto"');
select pg_temp.fechar(bianca, caso, array[pg_temp.ct(caso)]) from ids, d5;
select pg_temp.fim();
select is((select pg_temp.avisados(caso) from d5), array['Diego Almeida:RESPONSAVEL'], 'resposta 2: sem o "pronto", a responsável recebe que terminou');
select is((select pg_temp.aviso(caso, diego) -> 'dados' ->> 'juntos' is not null and not (pg_temp.aviso(caso, diego) -> 'dados' ? 'abertos') from d5, ids), true,
  'e o aviso traz o contrato encerrado junto');
-- f) Grupo A com o "pronto": Bianca (Contratos e Financeiro) recebeu o "pronto" e o caso fica com abertos.
create temp table d6 as select pg_temp.montar('Larissa 6 x Loja', array['Fábio Prado'], larissa, diego) caso from ids;
select ok((select pg_temp.pronto(caso, bianca) from d6, ids), 'Bianca recebeu o "pronto"');
select pg_temp.fechar(diego, caso) from ids, d6;
select pg_temp.fim();
select is((select pg_temp.avisados(caso) from d6),
  array['Bianca Torres:CONTRATOS', 'Felipe Matos:CONTRATOS', 'Larissa Costa:RESPONSAVEL', 'Marina Ribeiro:CONTRATOS'],
  'resposta 1 (tabela 2.3): quem encerra contratos recebe mesmo com o "pronto", porque há o que encerrar');
-- g) A responsável do grupo A, com o "pronto", e o caso terminou: Marina não recebe nada.
create temp table d7 as select pg_temp.montar('Marina 7 x Loja', array['Gil Prado'], socia, diego) caso from ids;
select ok((select pg_temp.pronto(caso, socia) from d7, ids), 'Marina recebeu o "pronto"');
select pg_temp.fechar(bianca, caso, array[pg_temp.ct(caso)]) from ids, d7;
select pg_temp.fim();
select is((select pg_temp.avisados(caso) from d7), '{}'::text[], 'resposta 2: Marina, responsável com o "pronto", não recebe quando terminou');

-- ---------------------------------------------------------------------------------------
-- 5. Fica de fora a responsável que é a autora; o grupo A continua recebendo.
create temp table d8 as select pg_temp.montar('Diego 8 x Loja', array['Hugo Prado'], diego, bianca) caso from ids;
select pg_temp.fechar(diego, caso) from ids, d8;
select pg_temp.fim();
select is((select pg_temp.avisados(caso) from d8), array['Bianca Torres:CONTRATOS', 'Felipe Matos:CONTRATOS', 'Marina Ribeiro:CONTRATOS'],
  'a responsável que encerrou não recebe; o grupo A sim');

-- 6. Seguem (resposta 4), com Larissa: o contrato também está num caso em andamento.
create temp table mar as select pg_temp.montar('Martins x INSS · auxílio-doença', array['Ivone Martins'], larissa) caso from ids;
alter table mar add column outro uuid;
update mar set outro = pg_temp.caso('Martins x INSS · aposentadoria', pg_temp.um((select cliente_id from contratos where id = pg_temp.ct(caso)), pg_temp.ct(caso)),
  (select larissa from ids));
select pg_temp.fim();
select pg_temp.fechar(diego, caso) from ids, mar;
select pg_temp.fim();
select is((select pg_temp.avisados(caso) from mar), array['Larissa Costa:RESPONSAVEL'], 'resposta 4: só seguem; Larissa recebe e o grupo A não');
select is((select pg_temp.aviso(caso, larissa) -> 'dados' -> 'seguem' from mar, ids),
  (select jsonb_build_array(jsonb_build_object('id', pg_temp.ct(caso), 'numero', pg_temp.num(pg_temp.ct(caso)), 'cliente', 'Ivone Martins',
                                               'outroCaso', 'Martins x INSS · aposentadoria')) from mar),
  'seguem traz o contrato, o cliente e o outro caso, e não entra em abertos');
select is((select cliente_fechamento(rm, cc.cliente_id, mar.caso, false) ->> 'pendente' from ids, mar, caso_clientes cc where cc.caso_id = mar.caso),
  'true', 'o aviso não diz "terminou" e a ficha também tem o passo pendente');

-- ---------------------------------------------------------------------------------------
-- 7. Vários contratos (Nogueira): o de Rui já estava encerrado; ficam dois abertos.
create temp table nog as select pg_temp.montar('Nogueira x Transportes Serra', array['Rui Nogueira', 'Lúcia Nogueira', 'Paulo Nogueira'], felipe) caso from ids;
select pg_temp.encerrar_contrato(felipe, pg_temp.ct(caso, 1)) from ids, nog;
select pg_temp.fim();
select pg_temp.fechar(diego, caso) from ids, nog;
select pg_temp.fim();
select is((select jsonb_path_query_array(pg_temp.aviso(caso, felipe) -> 'dados' -> 'abertos', '$[*].numero') from nog, ids),
  (select jsonb_build_array(pg_temp.num(pg_temp.ct(caso, 2)), pg_temp.num(pg_temp.ct(caso, 3))) from nog), 'dois abertos, em ordem de número');
select is((select pg_temp.avisados(caso) from nog), array['Bianca Torres:CONTRATOS', 'Felipe Matos:CONTRATOS', 'Marina Ribeiro:CONTRATOS'], 'um aviso por pessoa');
select ajustar_relogio(('2026-11-18 14:10-03'::timestamptz - now()));
select pg_temp.encerrar_contrato(felipe, pg_temp.ct(caso, 2)) from ids, nog;
select is((select pg_temp.aviso(caso, felipe) -> 'agoraFechou' from nog, ids),
  (select jsonb_build_object('abertos', jsonb_build_array(jsonb_build_object('id', pg_temp.ct(caso, 3), 'numero', pg_temp.num(pg_temp.ct(caso, 3)))),
     'saiu', jsonb_build_array(jsonb_build_object('numero', pg_temp.num(pg_temp.ct(caso, 2)), 'em', app_now(), 'por', pg_temp.ref(ids.felipe), 'voce', true)))
     from nog, ids),
  'Felipe encerra o primeiro: o Agora traz o que falta e o que saiu, com "voce"');
select is((select pg_temp.aviso(caso, bianca) -> 'agoraFechou' -> 'saiu' -> 0 -> 'voce' from nog, ids), 'false'::jsonb, 'no aviso da Bianca, "voce" é falso');
select ajustar_relogio(('2026-11-18 15:20-03'::timestamptz - now()));
select pg_temp.encerrar_contrato(bianca, pg_temp.ct(caso, 3)) from ids, nog;
create temp table n2 as select pg_temp.aviso(caso, felipe) -> 'agoraFechou' g from nog, ids;
select is((select g -> 'encerrados' from n2), jsonb_build_object('em', app_now(), 'por', null, 'voce', false),
  'Bianca encerra o segundo: encerrados, sem um "por" (duas pessoas)');
select is((select jsonb_path_query_array(g, '$.saiu[*].por.nome') || jsonb_build_array(g ? 'abertos') from n2), '["Felipe Matos", "Bianca Torres", false]'::jsonb,
  'os saiu de pessoas diferentes trazem o "por" de cada uma, e abertos some quando nenhum sobrou');
-- Carvalho: Felipe encerra o contrato de Noemi.
select pg_temp.encerrar_contrato(felipe, pg_temp.ct(caso, 1)) from ids, carv;
select is((select pg_temp.aviso(caso, felipe) -> 'agoraFechou' -> 'encerrados' from carv, ids), jsonb_build_object('em', app_now(), 'por', pg_temp.ref(felipe), 'voce', true),
  'Carvalho: encerrados por Felipe, com "voce" no aviso dele') from ids;
select is((select pg_temp.aviso(caso, socia) -> 'agoraFechou' -> 'encerrados' -> 'voce' from carv, ids), 'false'::jsonb, 'e sem "voce" no da Marina');
-- O aviso RESPONSAVEL de outro caso também traz encerrados.
select pg_temp.encerrar_contrato(felipe, pg_temp.ct(caso)) from ids, d2;
select is((select pg_temp.aviso(caso, diego) -> 'agoraFechou' -> 'encerrados' -> 'por' ->> 'nome' from d2, ids), 'Felipe Matos', 'o aviso da responsável também traz encerrados');
-- Viana: três contratos; um passa a seguir com outro caso e os outros dois não mudam.
create temp table via as select pg_temp.montar('Inventário de Augusto Viana', array['Clara Viana', 'Rafael Viana', 'Sônia Viana'], larissa) caso from ids;
select pg_temp.fechar(diego, caso) from ids, via;
select pg_temp.fim();
select is((select pg_temp.aviso(caso, felipe) ? 'agoraFechou' from via, ids), false, 'Viana: nada mudou, sem agoraFechou');
select pg_temp.caso('Sônia Viana x Banco', pg_temp.um((select cliente_id from contratos where id = pg_temp.ct(caso, 3)), pg_temp.ct(caso, 3)), larissa) from via, ids;
select is((select pg_temp.aviso(caso, felipe) -> 'agoraFechou' from via, ids),
  (select jsonb_build_object('abertos', jsonb_build_array(jsonb_build_object('id', pg_temp.ct(caso, 1), 'numero', pg_temp.num(pg_temp.ct(caso, 1))),
                                                          jsonb_build_object('id', pg_temp.ct(caso, 2), 'numero', pg_temp.num(pg_temp.ct(caso, 2)))),
                             'seguem', jsonb_build_array(jsonb_build_object('id', pg_temp.ct(caso, 3), 'numero', pg_temp.num(pg_temp.ct(caso, 3)),
                                                                            'outroCaso', 'Sônia Viana x Banco'))) from via),
  'um contrato passa a seguir com outro caso: abertos traz os dois que continuam, e seguem o que mudou');

-- ---------------------------------------------------------------------------------------
-- 18. juntos pelo histórico, não pela data: o contrato encerrado à parte na mesma transação, com o
-- relógio igual, sai em jaEncerrados.
create temp table jj as select pg_temp.montar('Junto x Data', array['Iara Souza', 'João Souza'], larissa) caso from ids;
select pg_temp.encerrar_contrato(socia, pg_temp.ct(caso, 1)) from ids, jj;
select pg_temp.fechar(socia, caso, array[pg_temp.ct(caso, 2)]) from ids, jj;
select pg_temp.fim();
select is((select (pg_temp.aviso(caso, larissa) -> 'dados' -> 'juntos') || (pg_temp.aviso(caso, larissa) -> 'dados' -> 'jaEncerrados') from jj, ids),
  (select jsonb_build_array(jsonb_build_object('numero', pg_temp.num(pg_temp.ct(caso, 2)), 'cliente', 'João Souza'),
                            jsonb_build_object('numero', pg_temp.num(pg_temp.ct(caso, 1)), 'cliente', 'Iara Souza')) from jj),
  'o encerrado à parte, no mesmo instante, é jaEncerrados; o levado pela cadeia é juntos');

-- 11. Com levantamento (resposta 3): RPV com o repasse feito, encerrado sem os contratos.
create temp table rpv as select pg_temp.montar('Benedito x INSS', array['Benedito Souza Lima'], larissa) caso from ids;
alter table rpv add column lv uuid;
update rpv set lv = (portal_financeiro_levantamento_registrar(ids.diego, ids.rm, jsonb_build_object('tipo', 'RPV', 'casoId', rpv.caso,
    'clienteId', (select cliente_id from caso_clientes where caso_id = rpv.caso), 'valor', 500000, 'entrouEm', '2026-11-18',
    'divisao', jsonb_build_array(jsonb_build_object('para', 'CLIENTE', 'valor', 500000)))) ->> 'id')::uuid from ids;
select portal_financeiro_destinacao_feita(diego, rm, d.id, '{"feitoEm": "2026-11-18"}') from ids, rpv, destinacoes d where d.levantamento_id = rpv.lv;
select pg_temp.fim();
select pg_temp.fechar(diego, caso) from ids, rpv;
select pg_temp.fim();
select is((select pg_temp.avisados(caso) from rpv),
  array['Bianca Torres:CONTRATOS', 'Felipe Matos:CONTRATOS', 'Larissa Costa:RESPONSAVEL', 'Marina Ribeiro:CONTRATOS'],
  'resposta 3: com RPV ou alvará, o aviso vale igual');

-- ---------------------------------------------------------------------------------------
-- 8. Escritórios (PT-10).
select is((portal_avisos(intrusa, outro) ->> 'total')::integer, 0, 'PT-10: a pessoa do outro escritório não vê nenhum aviso') from ids;
-- Um aviso gravado direto no outro escritório, apontando para um contrato encerrado do primeiro:
-- lido como postgres (sem o RLS), por aviso_sino_linha, o filtro do escritório não deixa ler.
insert into avisos_sino (escritorio_id, pessoa_id, tipo, dados, origem_tabela, origem_id)
select outro, intrusa, 'CASO_ENCERRADO_FINANCEIRO',
       jsonb_build_object('papel', 'CONTRATOS', 'caso', 'Forjado', 'abertos', jsonb_build_array(jsonb_build_object('id', pg_temp.ct(nog.caso, 2), 'numero', 'C-X'))),
       'casos', nog.caso from ids, nog;
select is((select count(*) from avisos_sino s, ids where s.escritorio_id = ids.outro and aviso_sino_linha(s) ? 'agoraFechou'), 0::bigint,
  'PT-10: o agoraFechou não lê contrato de outro escritório');
select is((select count(*) from ids, jsonb_array_elements(portal_avisos(ids.intrusa, ids.outro) -> 'itens') i where i ? 'agoraFechou'), 0::bigint,
  'nem pelo portal_avisos da pessoa do outro escritório');
-- Um contrato.encerrado no histórico do outro escritório, com o id de um contrato do primeiro, não vira o "por".
insert into historico (ocorrido_em, escritorio_id, autor_tipo, autor_id, acao, entidade, entidade_id, dados, interno)
select app_now() + interval '1 hour', outro, 'PESSOA', intrusa, 'contrato.encerrado', 'contratos', pg_temp.ct(carv.caso, 1)::text, '{}', false from ids, carv;
select is((select pg_temp.aviso(caso, felipe) -> 'agoraFechou' -> 'encerrados' -> 'por' ->> 'nome' from carv, ids), 'Felipe Matos',
  'PT-10: o histórico de outro escritório não vira o "por"');
-- caso_fechou_avisar com o contexto do outro escritório não grava; com o certo, grava uma vez só.
alter table avisos_sino disable trigger avisos_sino_guardiao;
delete from avisos_sino s using fon, ids where s.origem_id = fon.caso and s.pessoa_id = ids.larissa and s.tipo = 'CASO_ENCERRADO_FINANCEIRO';
alter table avisos_sino enable trigger avisos_sino_guardiao;
select portal_avisos(intrusa, outro) from ids;
select caso_fechou_avisar(rm, fon.caso, socia, app_now()) from ids, fon;
select is((select pg_temp.avisados(caso) from fon), '{}'::text[], 'PT-10: com o contexto de outro escritório, nada é gravado');
select portal_avisos(socia, rm) from ids;
select caso_fechou_avisar(rm, fon.caso, socia, app_now()) from ids, fon;
select is((select pg_temp.avisados(caso) from fon), array['Larissa Costa:RESPONSAVEL'], 'com o contexto do escritório do caso, grava');

-- 14. Uma vez só.
select caso_fechou_avisar(rm, fon.caso, socia, app_now()), caso_fechou_avisar(rm, nog.caso, diego, app_now()) from ids, fon, nog;
select is((select count(*) from avisos_sino s, ids where s.escritorio_id = ids.rm and s.tipo = 'CASO_ENCERRADO_FINANCEIRO'
             and s.origem_id in (select caso from fon union select caso from nog)), 4::bigint,
  'chamar de novo não duplica nada');

-- 9. Custo: 200 avisos com abertos reais; o sino não chama caso_acerto.
insert into avisos_sino (escritorio_id, pessoa_id, tipo, dados, origem_tabela, origem_id)
select ids.rm, ids.felipe, 'CASO_ENCERRADO_FINANCEIRO', s.dados, 'casos', s.origem_id
  from ids, avisos_sino s, generate_series(1, 200) n where s.tipo = 'CASO_ENCERRADO_FINANCEIRO' and s.origem_id = (select caso from via) and s.pessoa_id = ids.felipe;
create temp table custo as select pg_temp.acertos() antes;
select ok((select jsonb_array_length(portal_avisos(felipe, rm) -> 'itens') = 200 from ids), 'o sino mostra até 200 avisos');
select is((select pg_temp.acertos() - antes from custo), 0::bigint, 'o agoraFechou de 200 avisos não chama caso_acerto');

-- 10. PT-02: nenhum dado do tipo tem valor em reais.
select is((select count(*) from avisos_sino where tipo = 'CASO_ENCERRADO_FINANCEIRO'
             and (dados ?| array['valor', 'falta', 'calculado', 'recebido', 'entrou'] or dados::text ~ 'R\$|\d+,\d{2}')), 0::bigint,
  'PT-02: nenhum aviso do tipo tem valor em reais');

-- 15. A regra dos nomes: a mesma do quemContratos da 0900.
select is((select array_agg(q.nome order by q.nome) from ids, quem_encerra_contratos(ids.rm) q),
  (select array(select jsonb_array_elements_text(caso_acerto_quadro(rm, carv.caso) -> 'quemContratos')) from ids, carv),
  'quem_encerra_contratos dá os mesmos nomes do quemContratos da 0900');

-- 16. security definer e search_path.
select is((select array_agg(p.proname::text order by p.proname) from pg_proc p
            where p.pronamespace = 'public'::regnamespace and p.prosecdef
              and (p.proname like 'caso\_fechou%' or p.proname in ('quem_encerra_contratos', 'aviso_sino_linha'))),
  array['caso_fechou_fim'], 'das funções novas, só a do gatilho adiado é security definer; aviso_sino_linha não');
select is((select array_agg(p.proname::text || '=' || coalesce(array_to_string(p.proconfig, ','), '-') order by p.proname) from pg_proc p
            where p.pronamespace = 'public'::regnamespace and (p.proname like 'caso\_fechou%' or p.proname = 'quem_encerra_contratos')),
  array['caso_fechou_agora=search_path=public', 'caso_fechou_avisar=search_path=public', 'caso_fechou_dados=search_path=public',
        'caso_fechou_fim=search_path=public', 'caso_fechou_registrar=search_path=public', 'quem_encerra_contratos=search_path=public'],
  'todas as funções novas fixam o search_path');

-- 17. O check do sino: os 26 tipos de TipoAvisoSino de antes mais o CASO_ENCERRADO_FINANCEIRO.
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
    'DOCUMENTOS_INICIO_CHEGARAM', 'CASO_PRONTO_FECHAR', 'CASO_ENCERRADO_FINANCEIRO',
    -- F3.139 (1010): o aviso a Contratos da baixa renegociada.
    'BAIXA_RENEGOCIADA',
    -- F3.191 (1104): a cobrança no alvará do êxito não cobrado.
    'EXITO_COBRADO_NO_ALVARA']) x),
  'o check do sino tem exatamente os 29 tipos do domain');

-- 19. Ramos sem mistura: o "pronto" nunca traz agoraFechou, e o tipo novo nunca traz agora.
select ok((select bool_or(aviso_sino_linha(s) ? 'agora') from avisos_sino s where s.tipo = 'CASO_PRONTO_FECHAR')
          and (select bool_or(aviso_sino_linha(s) ? 'agoraFechou') from avisos_sino s where s.tipo = 'CASO_ENCERRADO_FINANCEIRO')
          and not exists (select 1 from avisos_sino s where (s.tipo = 'CASO_PRONTO_FECHAR' and aviso_sino_linha(s) ? 'agoraFechou')
                                                          or (s.tipo = 'CASO_ENCERRADO_FINANCEIRO' and aviso_sino_linha(s) ? 'agora')),
  'cada tipo tem o seu ramo do "agora", sem mistura');

select is(pg_temp.falhas(), 0::bigint, 'até aqui, nenhum financeiro.caso_fechou_falhou');

-- ---------------------------------------------------------------------------------------
-- 13. O commit pela API como service_role, em cadeia (Postgres 17: o gatilho adiado roda com o
-- papel do commit). Sem security definer na função adiada, o bloco de exceção engoliria o
-- permission denied e nenhum aviso sairia: por isso o teste confere os avisos gravados.
-- Caso sem levantamento (a destinacoes_fecham é o F3.163).
create temp table api as select pg_temp.montar('Campos x Banco', array['Rui Campos', 'Rita Campos'], larissa) caso from ids;
select bianca, rm, caso, jsonb_build_array(jsonb_build_object('id', pg_temp.ct(caso, 1), 'versao', (select versao from contratos where id = pg_temp.ct(caso, 1)))) leva
  from ids, api \gset
set local role service_role;
select portal_financeiro_caso_encerrar(:'bianca', :'rm', :'caso', :'leva'::jsonb) is not null;
set constraints all immediate;
reset role;
set constraints caso_fechou_fim, caso_pronto_fim, caso_pronto_fim_mudou, caso_pronto_fim_saiu, destinacoes_fecham deferred;
select is((select pg_temp.avisados(caso) from api), array['Felipe Matos:CONTRATOS', 'Larissa Costa:RESPONSAVEL', 'Marina Ribeiro:CONTRATOS'],
  'o commit pela API como service_role avisa (Bianca, que encerrou, não)');
select is((select jsonb_path_query_array(pg_temp.aviso(caso, felipe) -> 'dados' -> 'abertos', '$[*].id') from api, ids),
  (select jsonb_build_array(pg_temp.ct(caso, 2)) from api), 'o grupo A só com o contrato que ficou aberto');
select is((select (pg_temp.aviso(caso, larissa) -> 'dados') - 'caso' - 'quem' - 'clienteId' - 'cliente' - 'papel' from api, ids),
  (select jsonb_build_object('juntos', jsonb_build_array(jsonb_build_object('numero', pg_temp.num(pg_temp.ct(caso, 1)), 'cliente', 'Rui Campos')),
     'abertos', jsonb_build_array(jsonb_build_object('id', pg_temp.ct(caso, 2), 'numero', pg_temp.num(pg_temp.ct(caso, 2)), 'cliente', 'Rita Campos',
                                                     'clienteId', (select cliente_id from contratos where id = pg_temp.ct(caso, 2)))),
     'quemContratos', jsonb_build_array('Bianca Torres', 'Felipe Matos', 'Marina Ribeiro')) from api),
  'Larissa: juntos (lido no commit), abertos e quemContratos');
select is((select estado::text from contratos where id = pg_temp.ct((select caso from api), 1)), 'ENCERRADO', 'o contrato levado ficou encerrado');
select is(pg_temp.falhas(), 0::bigint, 'e nenhuma falha');

-- ---------------------------------------------------------------------------------------
-- 12. Erro forçado: tudo ou nada. O aviso da responsável falha; os do grupo A, gravados antes,
-- saem junto; o encerramento e a cadeia ficam; fica um financeiro.caso_fechou_falhou interno.
create function public.t137_falha() returns trigger language plpgsql as $$
begin
  if new.tipo = 'CASO_ENCERRADO_FINANCEIRO' and new.dados ->> 'papel' = 'RESPONSAVEL' then raise exception 'falha de teste'; end if;
  return new;
end $$;
create trigger t137_falha before insert on avisos_sino for each row execute function public.t137_falha();
create temp table err as select pg_temp.montar('Erro x Banco', array['Saulo Reis', 'Sara Reis'], larissa) caso from ids;
select pg_temp.fechar(socia, caso, array[pg_temp.ct(caso, 1)]) from ids, err;
select pg_temp.fim();
drop trigger t137_falha on avisos_sino;
drop function public.t137_falha();
select is((select count(*) from avisos_sino s, err where s.origem_id = err.caso and s.tipo = 'CASO_ENCERRADO_FINANCEIRO'), 0::bigint,
  'com um erro, nenhum aviso do tipo fica gravado (os do grupo A saem junto)');
select is((select (select count(*) from fechamentos_caso f where f.caso_id = err.caso)::text || ' '
                  || (select estado::text from contratos where id = pg_temp.ct(err.caso, 1)) from err),
  '1 ENCERRADO', 'o encerramento e a cadeia ficam');
select is((select count(*) from historico h, err where h.acao = 'financeiro.caso_fechou_falhou' and h.interno and h.entidade_id = err.caso::text), 1::bigint,
  'e fica um financeiro.caso_fechou_falhou interno');

-- ---------------------------------------------------------------------------------------
-- 5. Larissa retirada da equipe depois do caso encerrado no Jurídico: o caso guarda a responsável,
-- mas ela não recebe; o grupo A continua recebendo.
create temp table ret as select pg_temp.montar('Retirada x Loja', array['Tânia Reis'], larissa) caso from ids;
select portal_retirar(socia, rm, v.id, v.versao, socia) from ids, vinculos v where v.pessoa_id = ids.larissa and v.escritorio_id = ids.rm and v.revogado_em is null;
select is((select ca.responsavel_id from casos ca, ret where ca.id = ret.caso), (select larissa from ids), 'o caso encerrado guarda a responsável');
select pg_temp.fechar(diego, caso) from ids, ret;
select pg_temp.fim();
select is((select pg_temp.avisados(caso) from ret), array['Bianca Torres:CONTRATOS', 'Felipe Matos:CONTRATOS', 'Marina Ribeiro:CONTRATOS'],
  'quem saiu da equipe não recebe; o grupo A sim');

select is(pg_temp.falhas(), 1::bigint, 'no fim, só a falha forçada do teste 12');

select * from finish();
rollback;
