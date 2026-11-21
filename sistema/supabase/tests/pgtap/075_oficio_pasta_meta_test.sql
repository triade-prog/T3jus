-- Sobras das pendências do Financeiro: o ofício requisitório anexado ao RPV a caminho (F3.88, FI-09),
-- a pasta .zip dos comprovantes do mês para o contador com o link de 30 dias (F3.89, F3.22b; FI-18,
-- FI-21) e "Tirar a meta" (F3.90, IN-09), sem mudar os meses fechados.
begin;
select plan(30);

select ajustar_relogio(('2026-11-18 10:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Larissa Moura') as larissa,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, diego, 'Diego Almeida', array['FINANCEIRO']),
       portal_convidar(socia, rm, larissa, 'Larissa Moura', array['JURIDICO']) from ids;

create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PJ', 'nome', 'Construtora Vale Alto Ltda.', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Paulo Vale', 'telefone', '+5511996027736', 'principal', true)))) ->> 'id')::uuid vale
  from ids;
create temp table ct as select
  (portal_contrato_criar(socia, rm, jsonb_build_object('clienteId', cli.vale, 'objeto', 'Cobrança contra a Prefeitura',
     'responsavelId', ids.socia, 'advogados', jsonb_build_array(ids.socia),
     'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'EXITO', 'percentual', 2000, 'sobre', 'O que voltar', 'etapa', 'Pagamento da RPV', 'dias', 15)))) ->> 'id')::uuid id
  from ids, cli;
select portal_juridico_etapas(socia, rm) from ids;
create temp table cs as select
  (portal_juridico_caso_criar(socia, rm, jsonb_build_object('nome', 'Vale Alto x Prefeitura', 'area', 'CIVEL',
     'etapaId', (select id from etapas where escritorio_id = ids.rm and ordem = 7), 'responsavelId', ids.socia,
     'clientes', jsonb_build_array(jsonb_build_object('clienteId', cli.vale, 'papel', 'AUTOR', 'contratoId', ct.id)))) ->> 'id')::uuid id
  from ids, cli, ct;
create temp table rq as select portal_financeiro_requisicao_registrar(diego, rm, jsonb_build_object('tipo', 'RPV', 'casoId', cs.id, 'clienteId', cli.vale,
  'tribunal', 'TJSP', 'devedor', 'Prefeitura de Santo André', 'valor', 1840000, 'expedidoEm', '2026-11-18', 'estimadaMes', '2027-01-01')) r from ids, cs, cli;

-- ------------------------------------------------------------------ F3.88 · o ofício requisitório
select is((select r -> 'oficio' from rq), 'null'::jsonb, 'sem ofício, a linha diz nulo');
select is((teste.erro($$ select portal_anexo_iniciar(larissa, rm, jsonb_build_object('dono', 'REQUISICAO', 'donoId', rq.r ->> 'id',
    'nome', 'oficio.pdf', 'tipo', 'application/pdf', 'tamanho', 312000)) from ids, rq $$)) -> 'detalhe' ->> 'motivo',
  'AREA_NAO_LIBERADA', 'PA-01: sem a área Financeiro, não anexa o ofício');
select is((teste.erro($$ select portal_anexo_iniciar(intrusa, outro, jsonb_build_object('dono', 'REQUISICAO', 'donoId', rq.r ->> 'id',
    'nome', 'oficio.pdf', 'tipo', 'application/pdf', 'tamanho', 312000)) from ids, rq $$)) ->> 'codigo',
  'TC404', 'PT-01: outro escritório não acha a requisição');
create temp table of as select portal_anexo_iniciar(diego, rm, jsonb_build_object('dono', 'REQUISICAO', 'donoId', rq.r ->> 'id', 'categoria', 'NOTA_FISCAL',
    'nome', 'oficio-rpv-vale-alto.pdf', 'tipo', 'application/pdf', 'tamanho', 312000)) id from ids, rq;
select is((select categoria from anexos, of where anexos.id = of.id), 'OFICIO_REQUISITORIO', 'o anexo da requisição é sempre o ofício');
select is((select requisicao_linha(x) -> 'oficio' from requisicoes_a_caminho x, rq where x.id = (rq.r ->> 'id')::uuid), 'null'::jsonb,
  'enquanto envia, o ofício não aparece');
select is((select portal_anexo_concluir(diego, rm, of.id) ->> 'donoId' from ids, of), (select r ->> 'id' from rq), 'concluído, o dono é a requisição');
select is((select portal_financeiro_repasses(diego, rm) -> 'aCaminho' -> 'itens' -> 0 -> 'oficio' ->> 'nome' from ids), 'oficio-rpv-vale-alto.pdf',
  'a folha "A caminho" mostra o ofício');
select is((select count(*)::integer from historico h, rq where h.acao = 'anexo.enviado' and h.entidade = 'requisicoes_a_caminho' and h.entidade_id = rq.r ->> 'id'), 1,
  'o envio fica no histórico da requisição');
select is((select portal_anexo_abrir(diego, rm, of.id) from ids, of), 'oficio-rpv-vale-alto.pdf', 'quem tem o Financeiro abre');
select is((teste.erro($$ select portal_anexo_abrir(larissa, rm, of.id) from ids, of $$)) -> 'detalhe' ->> 'motivo', 'AREA_NAO_LIBERADA',
  'sem o Financeiro, não abre');
select throws_ok($$ insert into anexos (escritorio_id, requisicao_id, categoria, nome, tipo, tamanho, enviado_por)
    select rm, (rq.r ->> 'id')::uuid, 'GUIA', 'x.pdf', 'application/pdf', 1, diego from ids, rq $$, '23514', null,
  'o ofício não vira outra categoria');

-- ------------------------------------------------------------------ F3.89 · a pasta do contador
select portal_financeiro_ajustes_salvar(socia, rm, jsonb_build_object(
  'contador', jsonb_build_object('nome', 'Paulo Serra', 'email', 'contato@exemplo.com.br', 'mandarAoExportar', true, 'lembrarDia5', false), 'prazoRepasseDias', 3)) from ids;
-- Uma conta paga em outubro, com a nota; outra de novembro (não entra).
create temp table cp as select
  (portal_financeiro_conta_lancar(socia, rm, jsonb_build_object('descricao', 'Aluguel da sala', 'categoria', 'FORNECEDORES', 'valor', 320000,
     'vencimento', '2026-10-05')) ->> 'id')::uuid out,
  (portal_financeiro_conta_lancar(socia, rm, jsonb_build_object('descricao', 'Internet', 'categoria', 'FORNECEDORES', 'valor', 15000,
     'vencimento', '2026-11-05')) ->> 'id')::uuid nov
  from ids;
select portal_financeiro_conta_paga(socia, rm, cp.out, jsonb_build_object('pagaEm', '2026-10-05', 'valor', 320000)),
       portal_financeiro_conta_paga(socia, rm, cp.nov, jsonb_build_object('pagaEm', '2026-11-05', 'valor', 15000)) from ids, cp;
create temp table na as select
  portal_anexo_iniciar(socia, rm, jsonb_build_object('dono', 'CONTA', 'donoId', cp.out, 'categoria', 'NOTA_FISCAL',
    'nome', 'nota-aluguel.pdf', 'tipo', 'application/pdf', 'tamanho', 84000)) a1,
  portal_anexo_iniciar(socia, rm, jsonb_build_object('dono', 'CONTA', 'donoId', cp.nov, 'categoria', 'NOTA_FISCAL',
    'nome', 'nota-internet.pdf', 'tipo', 'application/pdf', 'tamanho', 9000)) a2
  from ids, cp;
select portal_anexo_concluir(socia, rm, a1), portal_anexo_concluir(socia, rm, a2) from ids, na;
create temp table ex as select portal_financeiro_exportar(diego, rm, '{"mes": "2026-10-01", "formato": "XLSX"}'::jsonb) e from ids;

select is((teste.erro($$ select portal_financeiro_pasta_preparar(larissa, rm, (e ->> 'id')::uuid) from ids, ex $$)) -> 'detalhe' ->> 'motivo',
  'AREA_NAO_LIBERADA', 'sem o Financeiro, não monta a pasta');
select is((teste.erro($$ select portal_financeiro_pasta_preparar(intrusa, outro, (e ->> 'id')::uuid) from ids, ex $$)) ->> 'codigo',
  'TC404', 'PT-01: outro escritório não acha a exportação');
create temp table pp as select portal_financeiro_pasta_preparar(diego, rm, (e ->> 'id')::uuid) p from ids, ex;
select is((select jsonb_array_length(p -> 'anexos') from pp), 1, 'só os anexos dos lançamentos do mês');
select is((select p -> 'anexos' -> 0 ->> 'lancamento' from pp), 'Aluguel da sala', 'cada um com o lançamento');
select is((select p -> 'anexos' -> 0 ->> 'dia' from pp), '2026-10-05', 'e a data');
select is((select p -> 'pasta' from pp), 'null'::jsonb, 'ainda sem pasta');
select is((teste.erro($$ select portal_financeiro_pasta_registrar(diego, rm, (e ->> 'id')::uuid,
    jsonb_build_array(jsonb_build_object('caminho', 'outro/lugar.zip', 'arquivos', 1, 'tamanho', 84200))) from ids, ex $$)) -> 'detalhe' -> 'campos',
  '["partes"]'::jsonb, 'o caminho é sempre o que a API monta');
create temp table pr as select portal_financeiro_pasta_registrar(diego, rm, (e ->> 'id')::uuid,
    jsonb_build_array(jsonb_build_object('caminho', format('%s/exportacoes/%s-1.zip', rm, e ->> 'id'), 'nome', 'comprovantes-outubro-2026.zip',
                                         'arquivos', 1, 'tamanho', 84200))) p from ids, ex;
select is((select (p ->> 'arquivos')::integer from pr), 1, 'a pasta registrada');
select is((select portal_financeiro_pasta_preparar(diego, rm, (e ->> 'id')::uuid) -> 'pasta' ->> 'id' from ids, ex), (select p ->> 'id' from pr),
  'depois, preparar devolve a mesma pasta');
select is((select portal_financeiro_pasta_registrar(diego, rm, (e ->> 'id')::uuid, '[]'::jsonb) ->> 'id' from ids, ex), (select p ->> 'id' from pr),
  'a pasta se monta uma vez por exportação');
select is((select portal_financeiro_envio_preparar(diego, rm, (e ->> 'id')::uuid) -> 'pasta' ->> 'id' from ids, ex), (select p ->> 'id' from pr),
  'o envio sabe da pasta');
select is((teste.erro($$ select portal_financeiro_envio_registrar(diego, rm, (e ->> 'id')::uuid, 'ENVIADO', app_now() + interval '90 days') from ids, ex $$)) -> 'detalhe' -> 'campos',
  '["linkAte"]'::jsonb, 'o link não vale mais que 30 dias');
select is((select (portal_financeiro_envio_registrar(diego, rm, (e ->> 'id')::uuid, 'ENVIADO', app_now() + interval '30 days') ->> 'linkAte')::timestamptz from ids, ex),
  app_now() + interval '30 days', 'o envio guarda até quando o link vale');
select is((teste.erro($$ delete from exportacao_pastas $$)) ->> 'codigo', 'TC023', 'a pasta não se apaga');

-- ------------------------------------------------------------------ F3.90 · tirar a meta
insert into metas_receita (escritorio_id, valor, de_mes, criado_por) select rm, 4500000, '2026-09-01', socia from ids;
select portal_financeiro_meta(socia, rm, '{"valor": 5000000, "mes": "2026-11-01"}'::jsonb) from ids;
select portal_financeiro_meta(socia, rm, '{"valor": 4000000, "mes": "2027-01-01", "soMes": true}'::jsonb) from ids;
select is((teste.erro($$ select portal_financeiro_meta_tirar(diego, rm, '{"mes": "2026-12-01"}'::jsonb) from ids $$)) -> 'detalhe' ->> 'motivo',
  'SO_SOCIO_DONO', 'só a sócia dona tira a meta');
select is((teste.erro($$ select portal_financeiro_meta_tirar(socia, rm, '{"mes": "2026-10-01"}'::jsonb) from ids $$)) -> 'detalhe' -> 'campos',
  '["mes"]'::jsonb, 'mês fechado não muda');
create temp table mt as select portal_financeiro_meta_tirar(socia, rm, '{"mes": "2026-12-01"}'::jsonb) m from ids;
select is((select array_agg((meta_do_mes(rm, m)).valor order by m) from ids, unnest(array['2026-10-01', '2026-11-01', '2026-12-01', '2027-01-01', '2027-02-01']::date[]) m),
  array[4500000, 5000000, null, null, null]::bigint[], 'outubro e novembro ficam; de dezembro em diante, sem meta (a de janeiro sai também)');
select is((teste.erro($$ select portal_financeiro_meta_tirar(socia, rm, '{"mes": "2026-12-01"}'::jsonb) from ids $$)) -> 'detalhe' ->> 'motivo',
  'SEM_META', 'sem meta, não há o que tirar');
select portal_financeiro_meta(socia, rm, '{"valor": 5500000, "mes": "2027-02-01"}'::jsonb) from ids;
select is((select array_agg((meta_do_mes(rm, m)).valor order by m) from ids, unnest(array['2027-01-01', '2027-02-01']::date[]) m),
  array[null, 5500000]::bigint[], 'dá para definir de novo depois');

select * from finish();
rollback;
