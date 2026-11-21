-- Recibo em PDF (FI-14, F3.19): ao registrar com o recibo, a cópia do papel fica guardada com o
-- número, o escritório, o cliente com o documento completo, a parcela "n de m", o valor e quem
-- registrou; "Quem pagou" (contato principal ou outra pessoa) e os erros; a cópia não muda;
-- abre quem tem Financeiro ou Contratos; isolamento.
begin;
select plan(14);

select ajustar_relogio(('2026-11-01 10:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Paula Nunes') as paula,
  teste.pessoa('Rui Costa') as rui,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, diego, 'Diego Almeida', array['FINANCEIRO']),
       portal_convidar(socia, rm, paula, 'Paula Nunes', array['CONTRATOS']),
       portal_convidar(socia, rm, rui, 'Rui Costa', array['COMERCIAL']) from ids;
update escritorios set cnpj = '11222333000181', cidade = 'São Paulo', uf = 'SP', endereco = 'Rua Augusta, 1200, sala 34' where id = (select rm from ids);

create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Hélio Batista Corrêa', 'origem', 'GOOGLE', 'documento', '31848261713',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Marta Corrêa', 'papel', 'Esposa', 'telefone', '+5511996027736', 'principal', true)))) ->> 'id')::uuid hel
  from ids;
create temp table ct as select
  (portal_contrato_criar(socia, rm, jsonb_build_object('clienteId', cli.hel, 'objeto', 'Ação revisional',
     'responsavelId', ids.diego, 'advogados', jsonb_build_array(ids.socia),
     'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'PARCELADO', 'total', 255000, 'parcelas', 3, 'primeiro', '2026-11-10')))) ->> 'id')::uuid hel
  from ids, cli;
select portal_contrato_assinatura(socia, rm, ct.hel, 1, '2026-11-01') from ids, ct;
select ajustar_relogio(('2026-11-18 15:20-03'::timestamptz - now()));
create temp table parc as select r.id, row_number() over (order by r.vencimento) n
  from recebimentos_previstos r, ct where r.contrato_id = ct.hel;

-- Parcela 1, paga pelo cliente, com recibo.
create temp table p1 as select (portal_financeiro_receber_registrar_recibo(diego, rm, parc.id,
  jsonb_build_object('valor', 85000, 'multaJuros', 2380, 'recebidoEm', '2026-11-18', 'forma', 'PIX', 'recibo', true)) ->> 'id')::uuid id
  from ids, parc where parc.n = 1;
create temp table r1 as select portal_recibo(diego, rm, p1.id) j from ids, p1;

select is((select j -> 'numero' from r1), '{"ano": 2026, "numero": 1}'::jsonb, 'FI-14: o recibo tem o número do escritório no ano');
select is((select (j -> 'cliente' ->> 'documento') || ' · ' || (j -> 'escritorio' ->> 'cnpj') from r1), '31848261713 · 11222333000181',
  'o CPF do cliente vai completo, com o CNPJ do escritório (pergunta 2)');
select is((select (j -> 'parcela' ->> 'ordem') || ' de ' || (j -> 'parcela' ->> 'total') from r1), '1 de 3', 'a parcela sai como "1 de 3"');
select is((select (j ->> 'valor') || '+' || (j ->> 'multaJuros') || ' · ' || (j ->> 'forma') || ' · ' || (j ->> 'pagoEm') from r1),
  '85000+2380 · PIX · 2026-11-18', 'valor, multa e juros, forma e data do pagamento');
select is((select j -> 'registradoPor' ->> 'nome' from r1), 'Diego Almeida', 'quem registrou');
select ok((select j -> 'pagador' = 'null'::jsonb or not (j ? 'pagador') from r1), 'pago pelo cliente, não há outro pagador');
select is((select count(*) from recibo_copias), 1::bigint, 'a cópia do papel fica guardada');

-- A cópia não muda quando o cadastro muda depois.
update clientes_escritorio set nome = 'Hélio B. Corrêa' where id = (select hel from cli);
select is((select portal_recibo(paula, rm, p1.id) -> 'cliente' ->> 'nome' from ids, p1), 'Hélio Batista Corrêa',
  'o recibo mostra o que valia no registro; quem tem Contratos também abre');
select is((teste.erro($$ update recibo_copias set dados = '{}' $$)) ->> 'codigo', 'TC023', 'a cópia não se reescreve');

-- Parcela 2, paga pelo contato principal.
select portal_financeiro_receber_registrar_recibo(diego, rm, parc.id,
  jsonb_build_object('valor', 85000, 'recebidoEm', '2026-11-18', 'forma', 'PIX', 'recibo', true, 'pagador', jsonb_build_object('tipo', 'CONTATO', 'documento', '205.771.384-99')))
  from ids, parc where parc.n = 2;
select is((select dados -> 'pagador' from recibo_copias where pagador_tipo = 'CONTATO'),
  '{"nome": "Marta Corrêa", "tipo": "CONTATO", "papel": "Esposa", "documento": "20577138499"}'::jsonb,
  'pago pelo contato principal: o nome e o papel vêm do cadastro, o CPF de quem registrou');

-- Outra pessoa: nome e CPF ou CNPJ conferidos.
select is((teste.erro($$ select portal_financeiro_receber_registrar_recibo(diego, rm, parc.id,
  jsonb_build_object('valor', 85000, 'recebidoEm', '2026-11-18', 'forma', 'PIX', 'recibo', true, 'pagador', jsonb_build_object('tipo', 'OUTRO', 'documento', '111.111.111-11')))
  from ids, parc where parc.n = 3 $$)) -> 'detalhe' -> 'motivos',
  '{"pagador.nome": "PAGADOR_NOME_OBRIGATORIO", "pagador.documento": "PAGADOR_DOC_INVALIDO"}'::jsonb, 'outra pessoa pede o nome e um CPF ou CNPJ válido');
select is((select count(*) from pagamentos_recebidos), 2::bigint, 'com erro em quem pagou, nada se registra');

-- Quem não tem Financeiro nem Contratos não abre; outro escritório não encontra.
select is((teste.erro($$ select portal_recibo(rui, rm, p1.id) from ids, p1 $$)) -> 'detalhe' ->> 'motivo', 'AREA_NAO_LIBERADA',
  'sem Financeiro nem Contratos, o recibo é recusado');
select is((teste.erro($$ select portal_recibo(intrusa, outro, p1.id) from ids, p1 $$)) ->> 'codigo', 'TC404', 'PT-01: recibo de outro escritório não é encontrado');

select ajustar_relogio(interval '0');
select * from finish();
rollback;
