-- Implantação assistida, parte 1 (F1.42; CO-08, migration 1180): a regra global (uma linha, só
-- a Administração muda, com histórico e versão), a condição do dia com a data de corte separada
-- da condição padrão, e a implantação do escritório congelada na abertura, com o guardião também
-- no INSERT, o isolamento por escritório e o autor sempre da sessão.
begin;
select plan(57);

create temp table ids as select
  teste.equipe('Carol', 'ADMINISTRACAO') as adm,
  teste.equipe('Marta Quintela', 'FINANCEIRO') as fin,
  teste.equipe('Rafael Teles', 'IMPLANTACAO') as imp,
  teste.equipe('Sueli Prado', 'SUPORTE') as sup,
  teste.pessoa('Renata Lima') as socia;
create temp table c as select
  console_criar_escritorio(adm, 'Cedro & Lima Advocacia', 'Recife', 'PE') as cedro,
  console_criar_escritorio(adm, 'Umbu Advocacia de Família', 'Petrolina', 'PE') as umbu from ids;
insert into vinculos (pessoa_id, escritorio_id, funcao, criado_por)
  select socia, cedro, 'SOCIO', adm from ids, c union all select imp, cedro, 'IMPLANTACAO', adm from ids, c;

create function pg_temp.regra() returns implantacao_regras language sql as $$ select * from implantacao_regras $$;
create function pg_temp.dados(p_mudar jsonb default '{}'::jsonb) returns jsonb language sql as $$
  select jsonb_build_object('nome', 'Implantação assistida', 'descricao', 'treino de toda a equipe e acompanhamento por 30 dias',
    'valorCentavos', 149000, 'condicaoPadrao', 'ISENTA', 'isencaoAte', null, 'isencaoTexto', 'Oferta de lançamento',
    'prazoDias', 30) || p_mudar $$;
-- Abre como a 1181 vai abrir: com o escritório e o autor do contexto e o evento da transição.
create function pg_temp.abrir(p_pessoa uuid, p_esc uuid, p_dia date default null) returns implantacoes
language plpgsql as $$
declare i implantacoes;
begin
  perform limpar_contexto();
  perform entrar_escritorio(p_pessoa, p_esc, 'console.implantacao.editar');
  perform definir_transicao('IMPLANTACAO_ABERTA');
  insert into implantacoes (escritorio_id, aberta_em, valor_centavos, condicao, nome, descricao)
  values (p_esc, p_dia, 1, 'COBRADA', 'Valor vindo de fora', 'x') returning * into i;
  perform limpar_contexto();
  return i;
end $$;

-- ---------------------------------------------------------------------------------------
-- A regra: uma linha só, nasce isenta e sem data de corte.
select is((select count(*)::int from implantacao_regras), 1, 'CO-08: a regra da implantação tem uma linha só');
select is((select row(nome, descricao, valor_centavos, condicao_padrao, isencao_ate, isencao_texto, prazo_dias)::text from implantacao_regras),
  row('Implantação assistida', 'treino de toda a equipe e acompanhamento por 30 dias', 149000, 'ISENTA', null::date,
      'Oferta de lançamento', 30)::text,
  'CO-08: R$ 1.490,00, isenta, sem data de corte, "Oferta de lançamento" e 30 dias (DC14)');
select throws_ok($$ insert into implantacao_regras (id, nome, descricao, valor_centavos, condicao_padrao, isencao_texto, prazo_dias)
                    values (false, 'Outra', 'x', 0, 'ISENTA', 'x', 30) $$, '23514', null, 'CO-08: não nasce uma segunda regra');
select throws_ok($$ delete from implantacao_regras $$, 'TC010', null, 'CO-08: a regra não se apaga');
select throws_ok($$ update implantacao_regras set versao = 9 $$, 'TC422', null, 'CO-08: a versão da regra é do banco');
select is((select row(c.condicao, c.texto)::text from implantacao_condicao(date '2030-01-01') c), row('ISENTA', 'Oferta de lançamento')::text,
  'CO-08: ISENTA com o corte nulo é isenta em qualquer dia');
select ok(not implantacao_na_fatura(), 'CO-08: a chave implantacao_na_fatura nasce desligada');
select is((select valor from configuracoes where chave = 'implantacao_na_fatura'), 'false'::jsonb, 'CO-08: a chave está em configuracoes');

-- Quem vê e quem muda.
select is((console_implantacao_regras(adm) ->> 'podeEditar')::boolean, true, 'CO-08: a Administração lê e pode mudar a regra') from ids;
select is((console_implantacao_regras(fin) ->> 'podeEditar')::boolean, false, 'CO-08: o Financeiro lê a regra, sem mudar') from ids;
select is(console_implantacao_regras(fin) -> 'regra' ->> 'valorCentavos', '149000', 'CO-08: o Financeiro vê o valor') from ids;
select is(console_implantacao_regras(adm) -> 'hoje' ->> 'condicao', 'ISENTA', 'CO-08: a leitura diz a condição de quem abrir hoje') from ids;
select is(teste.erro(format('select console_implantacao_regras(%L)', imp)) ->> 'codigo', 'TC401',
  'CO-08: a Implantação não lê a regra (os valores são da Administração e do Financeiro)') from ids;
select is(teste.erro(format('select console_implantacao_regras(%L)', sup)) ->> 'codigo', 'TC401', 'CO-08: o Suporte não lê a regra') from ids;
select is(teste.erro(format('select console_implantacao_regras(%L)', socia)) ->> 'codigo', 'TC401', 'CO-08: o sócio não lê a regra pelo Console') from ids;
select is(teste.erro(format('select console_implantacao_regras_salvar(%L, 1, %L)', fin, pg_temp.dados('{"valorCentavos": 0}'))) ->> 'codigo',
  'TC401', 'CO-08: o Financeiro não muda a regra') from ids;
select is(teste.erro(format('select console_implantacao_regras_salvar(%L, 1, %L)', imp, pg_temp.dados('{"valorCentavos": 0}'))) ->> 'codigo',
  'TC401', 'CO-08: a Implantação não muda a regra') from ids;
select is((select valor_centavos from implantacao_regras), 149000, 'CO-08: nada mudou com as recusas');

-- Os campos voltam todos juntos.
select is(teste.erro(format('select console_implantacao_regras_salvar(%L, 1, %L)', adm,
    pg_temp.dados('{"nome": "x", "valorCentavos": -1, "condicaoPadrao": "PARCIAL", "isencaoAte": "31/05/2027", "isencaoTexto": "", "prazoDias": 91}'))),
  jsonb_build_object('codigo', 'TC422', 'detalhe', jsonb_build_object('campos',
    jsonb_build_array('nome', 'valor', 'condicao', 'isencaoAte', 'isencaoTexto', 'prazoDias'))),
  'CO-08: a regra inválida volta com todos os campos presos') from ids;
select is(teste.erro(format('select console_implantacao_regras_salvar(%L, 1, %L)', adm, pg_temp.dados('{"valorCentavos": 10000001}'))) -> 'detalhe' -> 'campos',
  '["valor"]'::jsonb, 'CO-08: valor acima de R$ 100.000,00 é recusado') from ids;
select is(teste.erro(format('select console_implantacao_regras_salvar(%L, 1, %L)', adm, pg_temp.dados('{"prazoDias": 0}'))) -> 'detalhe' -> 'campos',
  '["prazoDias"]'::jsonb, 'CO-08: prazo de 0 dias é recusado') from ids;

-- Mudar a data de corte: no dia do corte, isenta; no dia seguinte, cobrada.
select is(console_implantacao_regras_salvar(adm, 1, pg_temp.dados('{"isencaoAte": "2027-05-31"}')), '{"versao": 2, "mudou": true}'::jsonb,
  'CO-08: a Administração grava a data de lançamento + 6 meses como corte') from ids;
select is((pg_temp.regra()).alterado_por, adm, 'CO-08: o autor da mudança vem da sessão') from ids;
select is((select row(c.condicao, c.texto)::text from implantacao_condicao(date '2027-05-31') c), row('ISENTA', 'Oferta de lançamento')::text,
  'CO-08: no dia do corte, a implantação ainda é isenta');
select is((select row(c.condicao, c.texto)::text from implantacao_condicao(date '2027-06-01') c), row('COBRADA', null::text)::text,
  'CO-08: no dia seguinte ao corte, é cobrada');
select is((select count(*)::int from planos_eventos e, ids where e.acao = 'implantacao.regra_mudou' and e.autor_id = adm), 1,
  'CO-08: a mudança vai para o histórico dos planos, com o autor');
select is((select dados -> 'antes' ->> 'isencaoAte' || '|' || (dados -> 'depois' ->> 'isencaoAte') from planos_eventos
            where acao = 'implantacao.regra_mudou'), null, 'CO-08: o antes era sem corte (nulo)');
select is((select dados -> 'depois' ->> 'isencaoAte' from planos_eventos where acao = 'implantacao.regra_mudou'), '2027-05-31',
  'CO-08: o depois traz o corte novo');
select is(console_implantacao_regras_salvar(adm, 2, pg_temp.dados('{"isencaoAte": "2027-05-31"}')), '{"versao": 2, "mudou": false}'::jsonb,
  'CO-08: salvar sem mudar nada não sobe a versão nem grava evento') from ids;
select is(jsonb_array_length(console_implantacao_regras(adm) -> 'historico'), 1, 'CO-08: o histórico da regra aparece na leitura') from ids;
select is(console_implantacao_regras(adm) -> 'historico' -> 0 ->> 'autor', 'Carol', 'CO-08: com o nome de quem mudou') from ids;

-- Conflito de versão: a segunda pessoa recebe a regra como está.
select is(teste.erro(format('select console_implantacao_regras_salvar(%L, 1, %L)', adm, pg_temp.dados('{"valorCentavos": 99000}'))) ->> 'codigo',
  'TC409', 'CO-08: salvar com a versão velha dá conflito') from ids;
select is(teste.erro(format('select console_implantacao_regras_salvar(%L, 1, %L)', adm, pg_temp.dados('{"valorCentavos": 99000}'))) -> 'detalhe' -> 'atual' ->> 'isencaoAte',
  '2027-05-31', 'CO-08: o conflito traz a regra salva agora') from ids;

-- ---------------------------------------------------------------------------------------
-- A implantação do escritório: nasce ABERTA, pelo guardião, com a regra do dia congelada.
create temp table i1 as select x.* from ids, c, lateral pg_temp.abrir(adm, cedro, date '2027-05-31') x;
select is((select row(numero, estado, nome, valor_centavos, condicao, condicao_texto, prazo_ate)::text from i1),
  row(1, 'ABERTA', 'Implantação assistida', 149000, 'ISENTA', 'Oferta de lançamento', date '2027-06-30')::text,
  'CO-08: abre com o valor e a condição da regra, não os que vieram no pedido, e o prazo de 30 dias');
select is((select count(*)::int from historico h, i1 where h.entidade = 'implantacoes' and h.entidade_id = i1.id::text
            and h.acao = 'estado.mudou' and h.dados ->> 'evento' = 'IMPLANTACAO_ABERTA' and h.autor_id = (select adm from ids)), 1,
  'CO-08: a abertura passa pelo guardião e fica no histórico com o autor');
select is(teste.erro(format('insert into implantacoes (escritorio_id) values (%L)', umbu)) ->> 'codigo', 'TC024',
  'CO-08: sem o evento da transição, a implantação não abre') from c;
select is(teste.erro(format($$ select definir_transicao('IMPLANTACAO_ABERTA', null, true);
                              insert into implantacoes (escritorio_id, estado) values (%L, 'CONCLUIDA') $$, umbu)) ->> 'codigo', 'TC021',
  'CO-08: a implantação só nasce ABERTA') from c;
select throws_ok(format('select pg_temp.abrir(%L, %L)', adm, cedro), '23505', null,
  'CO-08: duas implantações abertas no mesmo escritório, não') from ids, c;

-- A regra muda e a aberta não: vale só para as que abrirem depois.
select is(console_implantacao_regras_salvar(adm, 2, pg_temp.dados('{"valorCentavos": 99000, "condicaoPadrao": "COBRADA", "isencaoAte": "2027-05-31"}')) ->> 'versao',
  '3', 'CO-08: a Administração passa a regra para cobrada, de R$ 990,00') from ids;
select is((select row(valor_centavos, condicao)::text from implantacoes where id = (select id from i1)), row(149000, 'ISENTA')::text,
  'CO-08: mudar a regra não muda a implantação já aberta');
select is((select row(c.condicao, c.texto)::text from implantacao_condicao(date '2027-01-01') c), row('COBRADA', null::text)::text,
  'CO-08: COBRADA ignora a data de corte');
-- Aberta pelo sistema (o gatilho da 1181 não tem pessoa).
select limpar_contexto();
select definir_transicao('IMPLANTACAO_ABERTA', null, true);
create temp table i2 as with x as (insert into implantacoes (escritorio_id, aberta_em) select umbu, date '2027-01-10' from c returning *) select * from x;
select limpar_contexto();
select is((select row(valor_centavos, condicao, condicao_texto, prazo_ate)::text from i2), row(99000, 'COBRADA', null::text, date '2027-02-09')::text,
  'CO-08: a implantação que abre depois copia a regra nova, cobrada e sem texto de isenção');
select is((select autor_tipo::text from historico h, i2 where h.entidade = 'implantacoes' and h.entidade_id = i2.id::text), 'SISTEMA',
  'CO-08: a abertura pelo sistema fica no histórico como do sistema');

-- O congelado não muda; o prazo, sim, enquanto aberta.
select is(teste.erro(format('update implantacoes set valor_centavos = 0 where id = %L', id)) ->> 'codigo', 'TC010',
  'CO-08: o valor congelado não muda') from i1;
select is(teste.erro(format('update implantacoes set condicao = %L, condicao_texto = null where id = %L', 'COBRADA', id)) ->> 'codigo', 'TC010',
  'CO-08: a condição congelada não muda') from i1;
select is(teste.erro(format('update implantacoes set concluida_em = now() where id = %L', id)) ->> 'codigo', 'TC010',
  'CO-08: concluir só pelo estado, nunca marcando a data na mão') from i1;
update implantacoes set prazo_ate = date '2027-07-15' where id = (select id from i1);
select is((select row(prazo_ate, versao)::text from implantacoes where id = (select id from i1)), row(date '2027-07-15', 2)::text,
  'CO-08: o prazo muda enquanto aberta, e a versão sobe');

-- Concluir: a hora é do banco e o autor é o da sessão, mesmo se o pedido disser outro.
select limpar_contexto();
select entrar_escritorio(imp, cedro, 'console.implantacao.editar') from ids, c;
select definir_transicao('IMPLANTACAO_CONCLUIDA');
update implantacoes set estado = 'CONCLUIDA', resumo = 'Equipe toda treinada.', concluida_por = (select adm from ids)
 where id = (select id from i1);
select limpar_contexto();
select is((select row(estado, concluida_por = (select imp from ids), concluida_em is not null, resumo)::text from implantacoes where id = (select id from i1)),
  row('CONCLUIDA', true, true, 'Equipe toda treinada.')::text, 'CO-08: quem concluiu vem da sessão, nunca do pedido');
select is(teste.erro(format($$ select definir_transicao('TESTE', null, true); update implantacoes set prazo_ate = prazo_ate + 1 where id = %L $$, id)) ->> 'codigo',
  'TC010', 'CO-08: concluída, nada mais muda') from i1;
select is(teste.erro(format($$ select definir_transicao('TESTE', null, true); update implantacoes set estado = 'CANCELADA' where id = %L $$, id)) ->> 'codigo',
  'TC023', 'CO-08: concluída não volta nem é cancelada') from i1;
select is((select (pg_temp.abrir(adm, cedro)).numero from ids, c), 2, 'CO-08: depois da concluída, a próxima é a número 2');
select throws_ok($$ delete from implantacoes $$, 'TC010', null, 'CO-08: a implantação não se apaga');

-- ---------------------------------------------------------------------------------------
-- Isolamento, inventário e permissões.
select limpar_contexto();
select entrar_escritorio(adm, umbu, 'console.implantacao.ver') from ids, c;
create temp table vistos (escritorio_id uuid);
grant insert on vistos to dominio;
set local role dominio;
insert into vistos select escritorio_id from implantacoes;
reset role;
select is((select array_agg(distinct escritorio_id) from vistos), (select array[umbu] from c),
  'CO-08: com o Umbu no contexto, só aparece a implantação do Umbu');
select limpar_contexto();
select ok(exists (select 1 from pg_constraint where conrelid = 'implantacoes'::regclass and contype = 'u'
                   and conkey = array[(select attnum from pg_attribute where attrelid = 'implantacoes'::regclass and attname = 'escritorio_id'),
                                      (select attnum from pg_attribute where attrelid = 'implantacoes'::regclass and attname = 'id')]::int2[]),
  'CO-08: unique (escritorio_id, id) para as chaves compostas das tabelas filhas');
select is((select array_agg(polname::text order by polname) from pg_policy where polrelid = 'implantacoes'::regclass),
  array['fim_da_guarda', 'isolamento_escritorio'], 'CO-08: a implantação tem o isolamento e sai no fim da guarda (0540)');
select is((select row(exportar, prazo, situacao)::text from inventario_dados where tabela = 'implantacoes'),
  row(true, 'Enquanto o escritório for cliente do T3jus e 5 anos depois do fim do contrato', 'APROVADO')::text,
  'CO-08: no inventário, exportada e guardada 5 anos depois do fim do contrato');
select is((select array_agg(funcao || ':' || acao order by funcao, acao) from funcao_acoes where acao like '%.implantacao.%'),
  array['ADMINISTRACAO:console.implantacao.editar', 'ADMINISTRACAO:console.implantacao.prazo', 'ADMINISTRACAO:console.implantacao.regras',
        'ADMINISTRACAO:console.implantacao.ver', 'FINANCEIRO:console.implantacao.ver', 'IMPLANTACAO:console.implantacao.editar',
        'IMPLANTACAO:console.implantacao.ver', 'SOCIO:portal.implantacao.ver', 'SUPORTE:console.implantacao.ver'],
  'CO-08: as ações novas, por função (plano, seção 7)');

select * from finish();
rollback;
