-- Financeiro do Portal, A pagar: lançar conta, recorrente que nasce sozinha no dia 1º, adiantada
-- para um cliente que vira reembolso, marcar paga, saídas por categoria, nada se apaga, área
-- e isolamento (FI-01, FI-02, FI-07, FI-13, FI-20, PA-01, PT-01).
begin;
select plan(26);

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

create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Daniela Rocha Mendes', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Daniela Rocha Mendes', 'telefone', '+5511996027736', 'principal', true)))) ->> 'id')::uuid dan
  from ids;
create temp table cli_outro as select
  (portal_cliente_cadastrar(intrusa, outro, jsonb_build_object('tipo', 'PF', 'nome', 'Cliente de lá', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Cliente de lá', 'telefone', '+5511996027737', 'principal', true)))) ->> 'id')::uuid id
  from ids;

-- Área e isolamento.
select is((teste.erro($$ select portal_financeiro_pagar(paula, rm) from ids $$)) -> 'detalhe' ->> 'motivo', 'AREA_NAO_LIBERADA',
  'PA-01: sem a área Financeiro, A pagar é recusado');
select is((select portal_financeiro_pagar(diego, rm) ->> 'algum' from ids), 'false', 'primeiro uso: nenhuma conta');
select is((teste.erro($$ select portal_financeiro_pagar(diego, rm, 'TUDO') from ids $$)) -> 'detalhe' -> 'campos', '["mostrar"]'::jsonb, 'filtro inválido');

-- Lançar: campos.
select is((teste.erro($$ select portal_financeiro_conta_lancar(diego, rm, '{}'::jsonb) from ids $$)) -> 'detalhe' -> 'campos',
  '["categoria", "descricao", "valor", "vencimento"]'::jsonb, 'lançar sem nada aponta os campos');
select is((teste.erro($$ select portal_financeiro_conta_lancar(diego, rm, jsonb_build_object('descricao', 'Custas', 'categoria', 'CUSTAS',
  'valor', 48500, 'vencimento', '2026-11-19', 'adiantada', true, 'clienteId', cli_outro.id)) from ids, cli_outro $$)) -> 'detalhe' -> 'campos',
  '["clienteId", "reembolsoComo"]'::jsonb, 'FI-07: adiantada pede cliente do escritório e como volta');

-- Lançar: adiantada, recorrente e comum.
create temp table cs as select
  (portal_financeiro_conta_lancar(diego, rm, jsonb_build_object('descricao', 'Custas recursais', 'categoria', 'CUSTAS',
     'valor', 48500, 'vencimento', '2026-11-19', 'adiantada', true, 'clienteId', cli.dan, 'reembolsoComo', 'LEVANTAMENTO')) ->> 'id')::uuid custas,
  (portal_financeiro_conta_lancar(diego, rm, jsonb_build_object('descricao', 'Aluguel da sala', 'fornecedor', 'Imobiliária Paulista',
     'categoria', 'ALUGUEL', 'valor', 360000, 'vencimento', '2026-11-20', 'forma', 'BOLETO', 'repete', true)) ->> 'id')::uuid aluguel,
  (portal_financeiro_conta_lancar(diego, rm, jsonb_build_object('descricao', 'Contador', 'categoria', 'FORNECEDORES',
     'valor', 50000, 'vencimento', '2026-11-28')) ->> 'id')::uuid contador,
  (portal_financeiro_conta_lancar(diego, rm, jsonb_build_object('descricao', 'Tarifa do banco', 'categoria', 'TAXAS',
     'valor', 2100, 'vencimento', '2026-11-10')) ->> 'id')::uuid tarifa
  from ids, cli;

select is((select ((portal_financeiro_pagar(diego, rm) -> 'totais') #- '{recorrentes,ativas}' #- '{recorrentes,encerradasMes}') from ids),
  '{"semana": {"valor": 408500, "contas": 2}, "vencidas": {"valor": 2100, "contas": 1}, "recorrentes": {"contas": 1, "sozinhas": 0}, "reembolsar": {"valor": 48500, "clientes": 1}}'::jsonb,
  'os quatro números do alto');
select is((select jsonb_path_query_array(portal_financeiro_pagar(diego, rm) -> 'contas', '$[*].descricao') from ids),
  '["Custas recursais", "Aluguel da sala"]'::jsonb, 'esta semana, da mais próxima para a mais distante');
select is((select portal_financeiro_pagar(diego, rm) -> 'depois' from ids), '{"ate": "2026-11-30", "valor": 50000, "contas": 1}'::jsonb,
  'o que falta no mês depois da semana');
select is((select portal_financeiro_pagar(diego, rm, 'VENCIDAS') -> 'contas' -> 0 ->> 'situacao' from ids), 'VENCIDA', 'vencida no filtro');
select is((select jsonb_array_length(portal_financeiro_pagar(diego, rm, 'MES') -> 'contas') from ids), 4, 'o mês todo');
select is((select (portal_financeiro_pagar(diego, rm) -> 'contas' -> 1 -> 'recorrente') - 'id' from ids),
  '{"dia": 20, "mes": "2026-11-01", "lancadaSozinha": false}'::jsonb, 'FI-13: a origem diz que repete todo dia 20');
select is((select portal_financeiro_pagar(diego, rm) -> 'adiantados' -> 0 -> 'adiantada' ->> 'como' from ids), 'LEVANTAMENTO',
  'FI-07: o adiantado por cliente diz como volta');
select is((select portal_financeiro_pagar(diego, rm) -> 'categorias' -> 0 from ids), '{"valor": 360000, "categoria": "ALUGUEL"}'::jsonb,
  'FI-20: saídas do mês por categoria, da maior para a menor');

-- Pagar.
select is((teste.erro($$ select portal_financeiro_conta_paga(diego, rm, cs.tarifa, jsonb_build_object('valor', 2100, 'pagaEm', '2026-11-19')) from ids, cs $$)) -> 'detalhe',
  '{"motivo": "DATA_NO_FUTURO", "campos": ["pagaEm"]}'::jsonb, 'pagamento no futuro é recusado');
select ok((select portal_financeiro_conta_paga(diego, rm, cs.tarifa, jsonb_build_object('valor', 2350, 'pagaEm', '2026-11-12')) ? 'pagaEm' from ids, cs),
  'FI-02: conta paga com o valor que saiu');
select is((teste.erro($$ select portal_financeiro_conta_paga(diego, rm, cs.tarifa, jsonb_build_object('valor', 2350, 'pagaEm', '2026-11-12')) from ids, cs $$)) -> 'detalhe' ->> 'motivo',
  'CONTA_JA_PAGA', 'não se paga duas vezes');
select is((select portal_financeiro_pagar(diego, rm) -> 'totais' -> 'vencidas' from ids), '{"valor": 0, "contas": 0}'::jsonb, 'paga sai das vencidas');
select is((select (c ->> 'valor')::bigint from ids, jsonb_array_elements(portal_financeiro_pagar(diego, rm) -> 'categorias') c where c ->> 'categoria' = 'TAXAS'),
  2350::bigint, 'a categoria soma o valor pago');

-- Nada se apaga nem se reescreve.
select throws_ok($$ delete from contas_pagar where id = (select tarifa from cs) $$, 'TC023', null, 'conta não se apaga');
select throws_ok($$ update contas_pagar set valor = 1 where id = (select contador from cs) $$, 'TC023', null, 'valor da conta não se reescreve');

-- Reembolso.
select ok((select portal_financeiro_conta_reembolsada(diego, rm, cs.custas, jsonb_build_object('reembolsadoEm', '2026-11-18')) ? 'id' from ids, cs),
  'FI-07: o cliente devolveu');
select is((select jsonb_array_length(portal_financeiro_pagar(diego, rm) -> 'adiantados') from ids), 0, 'reembolsado sai do adiantado');
select is((teste.erro($$ select portal_financeiro_conta_reembolsada(diego, rm, cs.contador, jsonb_build_object('reembolsadoEm', '2026-11-18')) from ids, cs $$)) ->> 'codigo',
  'TC404', 'conta que não foi adiantada não tem reembolso');

-- Outro escritório não vê nem paga.
select is((teste.erro($$ select portal_financeiro_conta_paga(intrusa, outro, cs.contador, jsonb_build_object('valor', 1, 'pagaEm', '2026-11-12')) from ids, cs $$)) ->> 'codigo',
  'TC404', 'PT-01: conta de outro escritório não é encontrada');

-- O tempo passa: em fevereiro, dezembro, janeiro e fevereiro já nasceram sozinhos, uma vez só.
select ajustar_relogio(('2027-02-03 09:00-03'::timestamptz - now()));
select is((select (portal_financeiro_pagar(diego, rm, 'RECORRENTES') -> 'contas' -> 0 -> 'recorrente') - 'id' from ids),
  '{"dia": 20, "mes": "2027-02-01", "lancadaSozinha": true}'::jsonb, 'FI-13: a recorrente do mês nasceu sozinha');
select is((select count(*)::integer from contas_pagar c, ids where c.escritorio_id = ids.rm and c.descricao = 'Aluguel da sala'), 4,
  'novembro, dezembro, janeiro e fevereiro, uma vez cada (a lista abriu duas vezes)');

select * from finish();
rollback;
