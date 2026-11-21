-- Anexos do Portal fora do caso: o contrato assinado (CH-01) e a nota, guia, boleto ou
-- comprovante de cada conta e de cada recebimento (FI-18), com o envio em duas etapas, nada se
-- apaga, a área de cada dono, o isolamento e as despesas sem nota na exportação (FI-21, PT-01).
begin;
select plan(27);

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
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Hélio Batista Corrêa', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Hélio Batista Corrêa', 'telefone', '+5511996027736', 'principal', true)))) ->> 'id')::uuid hel
  from ids;
create temp table ct as select
  (portal_contrato_criar(socia, rm, jsonb_build_object('clienteId', cli.hel, 'objeto', 'Ação revisional',
     'responsavelId', ids.paula, 'advogados', jsonb_build_array(ids.socia),
     'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'PARCELADO', 'total', 255000, 'parcelas', 3, 'primeiro', '2026-11-20')))) ->> 'id')::uuid hel
  from ids, cli;

-- O contrato assinado: só quem tem a área Contratos envia e abre.
select is((teste.erro($$ select portal_anexo_iniciar(diego, rm, jsonb_build_object('dono', 'CONTRATO', 'donoId', ct.hel,
    'nome', 'contrato-assinado.pdf', 'tipo', 'application/pdf', 'tamanho', 1000)) from ids, ct $$)) -> 'detalhe' ->> 'motivo',
  'AREA_NAO_LIBERADA', 'PA-01: sem a área Contratos, não anexa o assinado');
select is((teste.erro($$ select portal_anexo_iniciar(intrusa, outro, jsonb_build_object('dono', 'CONTRATO', 'donoId', ct.hel,
    'nome', 'contrato-assinado.pdf', 'tipo', 'application/pdf', 'tamanho', 1000)) from ids, ct $$)) ->> 'codigo',
  'TC404', 'PT-01: outro escritório não acha o contrato');
select is((teste.erro($$ select portal_anexo_iniciar(paula, rm, jsonb_build_object('dono', 'CONTRATO', 'donoId', ct.hel,
    'nome', 'a/b.pdf', 'tipo', 'application/pdf', 'tamanho', 1000)) from ids, ct $$)) -> 'detalhe' -> 'campos',
  '["arquivo"]'::jsonb, 'nome com barra é recusado');
select is((teste.erro($$ select portal_anexo_iniciar(paula, rm, jsonb_build_object('dono', 'CONTRATO', 'donoId', ct.hel,
    'nome', 'x.docx', 'tipo', 'application/msword', 'tamanho', 1000)) from ids, ct $$)) -> 'detalhe' -> 'campos',
  '["arquivo"]'::jsonb, 'tipo fora de PDF, JPG e PNG é recusado');
select is((teste.erro($$ select portal_anexo_iniciar(paula, rm, '{"dono": "CASO"}') from ids $$)) -> 'detalhe' -> 'campos',
  '["dono"]'::jsonb, 'dono desconhecido é recusado');

create temp table an as select
  portal_anexo_iniciar(paula, rm, jsonb_build_object('dono', 'CONTRATO', 'donoId', ct.hel, 'categoria', 'NOTA_FISCAL',
    'nome', 'contrato-assinado.pdf', 'tipo', 'application/pdf', 'tamanho', 84000)) assinado
  from ids, ct;
select is((select categoria from anexos, an where id = an.assinado), 'CONTRATO_ASSINADO', 'o anexo do contrato é sempre o assinado');
select is((select jsonb_array_length(portal_contrato_anexos(paula, rm, ct.hel) -> 'anexos') from ids, ct), 0, 'enviando não aparece na ficha');
select is((teste.erro($$ select portal_anexo_concluir(socia, rm, an.assinado) from ids, an $$)) ->> 'codigo', 'TC404', 'só quem iniciou conclui');
select is((select portal_anexo_concluir(paula, rm, an.assinado) ->> 'nome' from ids, an), 'contrato-assinado.pdf', 'concluir deixa pronto');
select is((select portal_contrato_anexos(paula, rm, ct.hel) -> 'anexos' -> 0 -> 'enviadoPor' ->> 'nome' from ids, ct), 'Paula Nunes',
  'CH-01: a ficha do contrato mostra o assinado, com quem enviou');
select ok((select exists (select 1 from historico h, ct where h.acao = 'anexo.enviado' and h.entidade = 'contratos' and h.entidade_id = ct.hel::text)),
  'o envio fica no histórico do contrato');
select is((select portal_contrato_assinatura(paula, rm, ct.hel, 1, '2026-11-18') ->> 'recebimentos' from ids, ct), '3',
  'com o assinado anexado, registrar a assinatura ativa o contrato');

-- Nada se apaga.
select throws_ok($$ delete from anexos $$, 'TC023', 'Anexo não se apaga', 'o anexo não se apaga');
select throws_ok($$ update anexos set nome = 'outro.pdf' $$, 'TC023', 'Anexo só muda de enviando para pronto', 'nem muda depois de pronto');

-- Abrir: Contratos abre; Financeiro não abre o contrato.
select is((select portal_anexo_abrir(socia, rm, an.assinado) from ids, an), 'contrato-assinado.pdf', 'abrir devolve o nome para baixar');
select is((teste.erro($$ select portal_anexo_abrir(diego, rm, an.assinado) from ids, an $$)) -> 'detalhe' ->> 'motivo', 'AREA_NAO_LIBERADA',
  'sem a área Contratos, não abre o assinado');
select is((teste.erro($$ select portal_anexo_abrir(intrusa, outro, an.assinado) from ids, an $$)) ->> 'codigo', 'TC404', 'outro escritório não abre');

-- A conta a pagar, com nota, guia ou boleto.
create temp table cp as select
  (portal_financeiro_conta_lancar(diego, rm, jsonb_build_object('descricao', 'Custas recursais', 'categoria', 'CUSTAS',
     'valor', 48500, 'vencimento', '2026-11-19')) ->> 'id')::uuid custas,
  (portal_financeiro_conta_lancar(diego, rm, jsonb_build_object('descricao', 'Sistema de petições', 'categoria', 'FORNECEDORES',
     'valor', 18990, 'vencimento', '2026-11-18')) ->> 'id')::uuid sistema
  from ids;
select is((teste.erro($$ select portal_anexo_iniciar(diego, rm, jsonb_build_object('dono', 'CONTA', 'donoId', cp.custas,
    'nome', 'guia.pdf', 'tipo', 'application/pdf', 'tamanho', 1000)) from ids, cp $$)) -> 'detalhe' -> 'campos',
  '["categoria"]'::jsonb, 'na conta, é preciso dizer se é nota, guia, boleto ou comprovante');
select is((teste.erro($$ select portal_anexo_iniciar(paula, rm, jsonb_build_object('dono', 'CONTA', 'donoId', cp.custas, 'categoria', 'GUIA',
    'nome', 'guia.pdf', 'tipo', 'application/pdf', 'tamanho', 1000)) from ids, cp $$)) -> 'detalhe' ->> 'motivo',
  'AREA_NAO_LIBERADA', 'sem a área Financeiro, não anexa à conta');
create temp table an2 as select
  portal_anexo_iniciar(diego, rm, jsonb_build_object('dono', 'CONTA', 'donoId', cp.custas, 'categoria', 'GUIA',
    'nome', 'guia-preparo-apelacao.pdf', 'tipo', 'application/pdf', 'tamanho', 212000)) guia
  from ids, cp;
select portal_anexo_concluir(diego, rm, an2.guia) from ids, an2;
select is((select portal_financeiro_anexos(diego, rm, array[cp.custas, cp.sistema], null) -> 'anexos' -> 0 ->> 'categoria' from ids, cp), 'GUIA',
  'FI-18: a lista de A pagar mostra a guia da conta');
select is((select (portal_financeiro_anexos(diego, rm, array[cp.custas, cp.sistema], null) -> 'anexos' -> 0 ->> 'donoId')::uuid from ids, cp),
  (select custas from cp), 'ligada à conta certa');

-- O recebimento, com o comprovante.
create temp table pg as select
  (portal_financeiro_receber_registrar(diego, rm, (select id from recebimentos_previstos where contrato_id = ct.hel order by vencimento limit 1),
     jsonb_build_object('valor', 85000, 'recebidoEm', '2026-11-18', 'forma', 'PIX')) ->> 'id')::uuid pix
  from ids, ct;
create temp table an3 as select
  portal_anexo_iniciar(diego, rm, jsonb_build_object('dono', 'RECEBIMENTO', 'donoId', pg.pix, 'categoria', 'NOTA_FISCAL',
    'nome', 'pix-helio.pdf', 'tipo', 'application/pdf', 'tamanho', 84000)) comp
  from ids, pg;
select is((select categoria from anexos, an3 where id = an3.comp), 'COMPROVANTE', 'o anexo do recebimento é sempre o comprovante');
select portal_anexo_concluir(diego, rm, an3.comp) from ids, an3;
select is((select jsonb_array_length(portal_financeiro_anexos(diego, rm, null, array[pg.pix]) -> 'anexos') from ids, pg), 1,
  'FI-18: o comprovante aparece no recebimento');
select ok((select exists (select 1 from historico h where h.acao = 'anexo.enviado' and h.entidade = 'recebimentos_previstos')),
  'o envio do comprovante fica no histórico da parcela');

-- Exportação: as despesas pagas sem nota.
select portal_financeiro_conta_paga(diego, rm, cp.custas, jsonb_build_object('pagaEm', '2026-11-18', 'valor', 48500)),
       portal_financeiro_conta_paga(diego, rm, cp.sistema, jsonb_build_object('pagaEm', '2026-11-18', 'valor', 18990)) from ids, cp;
create temp table ex as select portal_financeiro_exportacao_anexos(diego, rm, '2026-11-01') j from ids;
select is((select j -> 'semNota' -> 0 ->> 'descricao' from ex), 'Sistema de petições', 'FI-21: a exportação aponta a despesa sem nota');
select is((select jsonb_array_length(j -> 'semNota') from ex), 1, 'e só ela');
select is((select jsonb_array_length(j -> 'anexos') from ex), 2, 'os anexos do mês: a guia da conta e o comprovante do recebimento');

select * from finish();
rollback;
