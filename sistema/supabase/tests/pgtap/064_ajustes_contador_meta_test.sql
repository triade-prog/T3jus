-- Ajustes do financeiro (F3.50, F3.46) e a meta do mês (F3.49): o contador, o saldo de abertura no
-- Caixa, corrigir com motivo, o envio ao contador, o lembrete do dia 5 e a meta que não muda mês fechado.
begin;
select plan(33);

select ajustar_relogio(('2026-11-18 10:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Bianca Torres') as bianca,
  teste.pessoa('Larissa Moura') as larissa,
  teste.escritorio('Ribeiro & Matos') as rm;
select teste.vincular(socia, rm, 'SOCIO') from ids;
select portal_convidar(socia, rm, bianca, 'Bianca Torres', array['FINANCEIRO']),
       portal_convidar(socia, rm, larissa, 'Larissa Moura', array['JURIDICO']) from ids;

-- Ver e quem muda.
select is((teste.erro($$ select portal_financeiro_ajustes(larissa, rm) from ids $$)) -> 'detalhe' ->> 'motivo', 'AREA_NAO_LIBERADA', 'sem o Financeiro, não vê');
select is((select portal_financeiro_ajustes(bianca, rm) ->> 'dono' from ids), 'false', 'quem tem o Financeiro vê, sem ser dona');
select is((select portal_financeiro_ajustes(bianca, rm) -> 'contador' from ids), 'null'::jsonb, 'sem contador ainda');
select is((teste.erro($$ select portal_financeiro_ajustes_salvar(bianca, rm, '{"prazoRepasseDias": 3}'::jsonb) from ids $$)) -> 'detalhe' ->> 'motivo',
  'SO_SOCIO_DONO', 'só a sócia dona salva');

-- Salvar com erros: nada muda.
select is((teste.erro($$ select portal_financeiro_ajustes_salvar(socia, rm, jsonb_build_object(
    'contador', jsonb_build_object('nome', 'Paulo Serra', 'email', 'contato@exemplo'), 'prazoRepasseDias', 0)) from ids $$)) -> 'detalhe' -> 'campos',
  '["email", "prazoRepasseDias"]'::jsonb, 'e-mail incompleto e prazo zero');
select is((select count(*)::integer from contadores), 0, 'com erro, o contador não entra');

-- Salvar certo.
create temp table aj as select portal_financeiro_ajustes_salvar(socia, rm, jsonb_build_object(
    'contador', jsonb_build_object('nome', 'Paulo Serra', 'firma', 'Contabilidade Silva', 'email', 'Contato@Exemplo.com.br', 'telefone', '+551134567890',
                                   'mandarAoExportar', true, 'lembrarDia5', true),
    'prazoRepasseDias', 2,
    'abertura', jsonb_build_object('data', '2026-08-31', 'valor', 1248000))) a from ids;
select is((select a -> 'contador' ->> 'email' from aj), 'contato@exemplo.com.br', 'o contador, com o e-mail em minúsculas');
select is((select (a ->> 'prazoRepasseDias')::integer from aj), 2, 'o prazo para repassar muda junto');
select is((select (a -> 'abertura' ->> 'valor')::bigint from aj), 1248000::bigint, 'o saldo de abertura');
select is((select (a ->> 'saldoHoje')::bigint from aj), 1248000::bigint, 'sem lançamentos, o saldo de hoje é a abertura');
select is((select array_agg(x ->> 'acao' order by x ->> 'acao') from aj, jsonb_array_elements(a -> 'historico') x),
  array['financeiro.contador', 'financeiro.prazo_repasse', 'financeiro.saldo_abertura'], 'cada ajuste no histórico');
select ok((select not historico_tem_dado_proibido(h.dados) from historico h where h.acao = 'financeiro.contador'), 'o histórico do contador não guarda dado pessoal');
select is((teste.erro($$ select portal_financeiro_ajustes_salvar(socia, rm, jsonb_build_object('prazoRepasseDias', 2,
    'abertura', jsonb_build_object('data', '2026-08-31', 'valor', 1))) from ids $$)) -> 'detalhe' -> 'campos',
  '["aberturaValor"]'::jsonb, 'a abertura lançada só muda por Corrigir');

-- Caixa começa da abertura.
select is((select (portal_financeiro_caixa(bianca, rm) ->> 'saldo')::bigint from ids), 1248000::bigint, 'o Caixa começa no saldo de abertura');
select is((select portal_financeiro_caixa(bianca, rm) -> 'contador' ->> 'nome' from ids), 'Paulo Serra', 'e diz quem é o contador');
select is((select portal_financeiro_caixa(bianca, rm) ->> 'lembrete' from ids), '2026-12-05', 'e o próximo lembrete');

-- Corrigir: motivo obrigatório; a anterior fica marcada.
select is((teste.erro($$ select portal_financeiro_abertura_corrigir(socia, rm, jsonb_build_object('data', '2026-08-31', 'valor', 1318000)) from ids $$)) -> 'detalhe' -> 'campos',
  '["motivo"]'::jsonb, 'corrigir pede o motivo');
select is((select (portal_financeiro_abertura_corrigir(socia, rm, jsonb_build_object('data', '2026-08-31', 'valor', 1318000,
  'motivo', 'Faltou somar uma aplicação que voltou para a conta em 31/08.')) -> 'abertura' ->> 'valor')::bigint from ids), 1318000::bigint, 'o valor corrigido vale');
select is((select count(*)::integer from saldos_abertura where substituido_em is not null), 1, 'a anterior fica, marcada');
select is((select (h.dados ->> 'deValor')::bigint from historico h where h.acao = 'financeiro.saldo_abertura' and h.dados ? 'deValor'), 1248000::bigint,
  'o histórico guarda o valor anterior');
select is((teste.erro($$ delete from saldos_abertura $$)) ->> 'codigo', 'TC023', 'o saldo de abertura não se apaga');

-- Envio ao contador.
create temp table ex as select portal_financeiro_exportar(bianca, rm, '{"mes": "2026-10-01", "formato": "XLSX"}'::jsonb) e from ids;
select is((select (e ->> 'saldoFim')::bigint from ex), 1318000::bigint, 'a exportação diz o saldo do fim do mês');
select is((select p ->> 'para' from ids, ex, lateral (select portal_financeiro_envio_preparar(bianca, rm, (e ->> 'id')::uuid) p) z), 'contato@exemplo.com.br',
  'preparar diz para quem vai');
select is((select p ->> 'responderPara' from ids, ex, lateral (select portal_financeiro_envio_preparar(bianca, rm, (e ->> 'id')::uuid) p) z),
  (select bianca || '@exemplo.invalid' from ids), 'a resposta do contador volta para o e-mail de quem mandou');
select is((select portal_financeiro_envio_registrar(bianca, rm, (e ->> 'id')::uuid, 'FALHOU') ->> 'situacao' from ids, ex), 'FALHOU', 'a falha fica registrada');
select ajustar_relogio(('2026-11-18 10:05-03'::timestamptz - now()));
select is((select portal_financeiro_envio_registrar(bianca, rm, (e ->> 'id')::uuid, 'ENVIADO') ->> 'situacao' from ids, ex), 'ENVIADO', 'mandar de novo');
select is((select x -> 'envio' ->> 'situacao' from ids, jsonb_array_elements(portal_financeiro_caixa(bianca, rm) -> 'exportacoes') x), 'ENVIADO',
  'o Caixa mostra o último envio');

-- Lembrete do dia 5: outubro já exportado; em dezembro, novembro não.
select ajustar_relogio(('2026-12-05 08:00-03'::timestamptz - now()));
select is(lembrar_contador(), 2, 'no dia 5, quem tem o Financeiro (sócia e Bianca) recebe o lembrete');
select is(lembrar_contador(), 0, 'uma vez por mês');

-- Meta.
select ajustar_relogio(('2026-11-18 10:00-03'::timestamptz - now()));
select is((teste.erro($$ select portal_financeiro_meta(bianca, rm, '{"valor": 5000000, "mes": "2026-11-01"}'::jsonb) from ids $$)) -> 'detalhe' ->> 'motivo',
  'SO_SOCIO_DONO', 'só a sócia dona define a meta');
select is((teste.erro($$ select portal_financeiro_meta(socia, rm, '{"valor": 0, "mes": "2026-10-01"}'::jsonb) from ids $$)) -> 'detalhe' -> 'campos',
  '["valor", "mes"]'::jsonb, 'valor zero e mês fechado');
-- Setembro: 45 mil (gravada como se fosse em setembro); novembro: 50 mil, todo mês; dezembro: 40 mil, só esse mês.
insert into metas_receita (escritorio_id, valor, de_mes, criado_por) select rm, 4500000, '2026-09-01', socia from ids;
select portal_financeiro_meta(socia, rm, '{"valor": 5000000, "mes": "2026-11-01"}'::jsonb) from ids;
select portal_financeiro_meta(socia, rm, '{"valor": 4000000, "mes": "2026-12-01", "soMes": true}'::jsonb) from ids;
select is((select array_agg((meta_do_mes(rm, m)).valor order by m) from ids, unnest(array['2026-10-01', '2026-11-01', '2026-12-01', '2027-01-01']::date[]) m),
  array[4500000, 5000000, 4000000, 5000000]::bigint[], 'outubro fica com a de antes; dezembro só; janeiro volta à de todo mês');
select is((select (m ->> 'meta')::bigint from ids, jsonb_array_elements(portal_financeiro_resumo(bianca, rm) -> 'meses') m where m ->> 'mes' = '2026-10-01'),
  4500000::bigint, 'o Resumo compara outubro com a meta daquele mês');

select * from finish();
rollback;
