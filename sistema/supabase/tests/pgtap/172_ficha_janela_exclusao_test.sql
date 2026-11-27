-- A ficha do cliente com o que a janela de exclusão precisa saber a mais (1142; F3.181, F3.186,
-- F3.190, C9, F3.179 e F3.193, PT-11): as chaves novas vêm só para a sócia dona, no cliente que ela
-- pode excluir (na janela de arquivar, só saiDeContratos); quem assina por outro cliente (C9 = A;
-- revisão, M7: a mãe ou a tutora, quem assina pela empresa e quem assinava até os 18), sem os
-- clientes excluídos e sem os de outro escritório; as propostas com o "sobre" que vira texto fixo
-- (F3.179); as explicações da baixa (F3.193); depois da exclusão, as chaves não vêm e a ficha de
-- quem ela assinava continua com o nome e o CPF dela.
begin;
select plan(15);

select ajustar_relogio(('2026-11-26 10:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Paula Reis') as socia,
  teste.pessoa('Diego Martins') as diego,
  teste.pessoa('Intrusa Souza') as intrusa,
  teste.escritorio('Reis & Coelho') as rc,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rc, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rc, diego, 'Diego Martins', array['COMERCIAL']) from ids;

create function pg_temp.cli(p_pessoa uuid, p_esc uuid, p jsonb) returns uuid language sql as $$
  select (portal_cliente_cadastrar(p_pessoa, p_esc, '{"tipo": "PF", "origem": "GOOGLE", "contatos": [{"nome": "Contato", "telefone": "+5511984723316", "principal": true}]}'::jsonb
    || p) ->> 'id')::uuid
$$;
create temp table cli as select
  pg_temp.cli(socia, rc, '{"nome": "Marina Alves Coelho", "documento": "529.982.247-25"}') mar,
  pg_temp.cli(socia, rc, '{"nome": "João Coelho", "capacidade": "MENOR", "nascimento": "2014-03-14", "rl_papel": "MAE",
    "rl_nome": "Marina Alves Coelho", "rl_documento": "529.982.247-25", "nacionalidade": "brasileira", "endereco": "Rua Bresser, 845",
    "cidade": "São Paulo", "uf": "SP"}') joao,
  pg_temp.cli(socia, rc, '{"tipo": "PJ", "nome": "Padaria Estrela Ltda", "documento": "11.222.333/0001-81", "rep_nome": "Marina Alves Coelho",
    "rep_documento": "52998224725"}') padaria,
  pg_temp.cli(socia, rc, '{"nome": "Pedro Coelho", "documento": "488.213.907-30"}') pedro,
  pg_temp.cli(socia, rc, '{"nome": "Cris Sem Nada"}') cris,
  pg_temp.cli(intrusa, outro, '{"nome": "Lia de Fora", "capacidade": "MENOR", "nascimento": "2015-01-10", "rl_papel": "MAE",
    "rl_nome": "Marina Alves Coelho", "rl_documento": "529.982.247-25", "nacionalidade": "brasileira", "endereco": "Rua X, 1",
    "cidade": "São Paulo", "uf": "SP"}') fora
  from ids;
-- Pedro fez 18 anos: Marina assinava por ele até então (posto direto, como depois do dia dos 18).
insert into clientes_quem_assinava (escritorio_id, cliente_id, papel, nome, documento, ate, registrado_por)
  select rc, cli.pedro, 'MAE', 'Marina Alves Coelho', '52998224725', '2026-10-01', socia from ids, cli;

-- As propostas de Marina: uma com o êxito "sobre" o que ela receber, outra só com o fixo.
create function pg_temp.proposta(p_cliente uuid, p_condicoes jsonb) returns uuid language sql as $$
  select (portal_proposta_criar(ids.diego, ids.rc, jsonb_build_object('clienteId', p_cliente, 'servico', 'Benefício', 'responsavelId', ids.diego,
    'rascunho', true, 'condicoes', p_condicoes)) ->> 'id')::uuid from ids
$$;
create temp table pr as select
  pg_temp.proposta(cli.mar, '[{"tipo": "EXITO", "percentual": 2000, "sobre": "dos atrasados que Marina receber", "etapa": "Sentença", "dias": 15}]') exito,
  pg_temp.proposta(cli.mar, '[{"tipo": "FIXO", "valor": 350000, "vencimento": "2026-12-10"}]') fixo
  from cli;

-- 1. C9: quem ela assina.
select is((select cliente_assina_por_outro(rc, cli.mar) from ids, cli),
  (select jsonb_build_array(
     jsonb_build_object('id', joao, 'nome', 'João Coelho', 'tipo', 'PF', 'papel', 'como mãe e responsável legal', 'feminino', true),
     jsonb_build_object('id', padaria, 'nome', 'Padaria Estrela Ltda', 'tipo', 'PJ', 'papel', 'pela empresa', 'feminino', null),
     jsonb_build_object('id', pedro, 'nome', 'Pedro Coelho', 'tipo', 'PF', 'papel', 'assinava até os 18', 'feminino', true)) from cli),
  'C9 (revisão, M7): a mãe e responsável legal, quem assina pela empresa e quem assinava até os 18, em ordem de nome');
select is((select cliente_assina_por_outro(rc, cli.cris) from ids, cli), '[]'::jsonb, 'C9: sem documento, a lista vem vazia');
select is((select cliente_assina_por_outro(outro, cli.fora) from ids, cli), '[]'::jsonb, 'C9: o cliente não assina por ninguém');
select ok((select not (cliente_assina_por_outro(rc, cli.mar)::text like '%Lia de Fora%') from ids, cli), 'PT-01: o cliente de outro escritório fica de fora');

-- 2. F3.179 e F3.193.
select is((select cliente_bases_de_condicao(rc, cli.mar) from ids, cli), (select jsonb_build_array(numero) from propostas, pr where id = pr.exito),
  'F3.179: só a proposta com o "sobre" do êxito');
select is((select cliente_baixas_com_explicacao(rc, cli.mar) from ids, cli), 0, 'F3.193: sem contrato, nenhuma baixa (o contrato prende o cliente)');

-- 3. As chaves da ficha.
create function pg_temp.chaves(p_pessoa uuid, p_cliente uuid) returns text[] language sql as $$
  select array_agg(k order by k) from jsonb_object_keys(portal_cliente(p_pessoa, (select rc from ids), p_cliente)) k
   where k in ('arquivosParaApagar', 'arquivosQueFicam', 'saiDeContratos', 'conversasParaApagar', 'assinaPorOutro', 'basesDeCondicao', 'baixasComExplicacao')
$$;
select is(pg_temp.chaves(socia, mar), array['arquivosParaApagar', 'arquivosQueFicam', 'assinaPorOutro', 'baixasComExplicacao', 'basesDeCondicao',
                                             'conversasParaApagar', 'saiDeContratos'], 'PT-11: a dona recebe as chaves da janela') from ids, cli;
select is(pg_temp.chaves(diego, mar), null, 'PT-11: quem não é a dona não recebe nenhuma') from ids, cli;
select is((select portal_cliente(socia, rc, cli.mar) -> 'assinaPorOutro' from ids, cli), (select cliente_assina_por_outro(rc, cli.mar) from ids, cli),
  'C9: a ficha traz quem ela assina');
select is((select portal_cliente(socia, rc, cli.mar) -> 'basesDeCondicao' from ids, cli), (select cliente_bases_de_condicao(rc, cli.mar) from ids, cli),
  'F3.179: a ficha traz as propostas com o "sobre"');
select is((select portal_cliente(socia, rc, cli.mar) -> 'baixasComExplicacao' from ids, cli), '0'::jsonb, 'F3.193: e as baixas');
-- Com contrato, a janela é a de arquivar: só saiDeContratos.
select portal_contrato_criar(socia, rc, jsonb_build_object('clienteId', cli.pedro, 'objeto', 'Indenização', 'responsavelId', socia,
  'advogados', jsonb_build_array(socia), 'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'FIXO', 'valor', 300000, 'vencimento', '2026-12-05'))))
  from ids, cli;
select is(pg_temp.chaves(socia, pedro), array['saiDeContratos'], 'F3.181 C2: na janela de arquivar, só o que sai de Contratos') from ids, cli;

-- 4. Depois da exclusão.
select portal_cliente_excluir_dados(socia, rc, cli.mar, c.versao, jsonb_build_object('pedidoEm', hoje_brasilia(), 'canal', 'WHATSAPP',
  'quemPediu', 'TITULAR', 'conferido', true, 'nomeConfirmado', c.nome)) from ids, cli, clientes_escritorio c where c.id = cli.mar;
select is(pg_temp.chaves(socia, mar), null, 'PT-11: o cliente excluído não traz as chaves da janela') from ids, cli;
select is((select rl_nome || ' ' || regexp_replace(rl_documento, '[^0-9]', '', 'g') from clientes_escritorio, cli where id = cli.joao),
  'Marina Alves Coelho 52998224725', 'C9: a ficha de João continua com o nome e o CPF de quem assina por ele (servem ao contrato dele)');
select is((select cliente_assina_por_outro(rc, cli.mar) from ids, cli), '[]'::jsonb, 'C9: o excluído não tem mais documento');

select * from finish();
rollback;
