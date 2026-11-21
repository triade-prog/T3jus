-- Logo do escritório no carnê e no recibo e o registro da sociedade na OAB (F3.81, FI-23; resto do
-- F3.19, FI-14): só a sócia dona envia e escolhe; logo claro demais só em uma cor; a OAB com
-- seccional e número; o carnê e o recibo guardam a marca do dia; isolamento (PT-01, PT-03).
begin;
select plan(25);

select ajustar_relogio(('2026-11-18 10:12-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro,
  gen_random_uuid() as largo,
  gen_random_uuid() as claro,
  gen_random_uuid() as alheio;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, diego, 'Diego Almeida', array['FINANCEIRO', 'CONTRATOS']) from ids;

-- O logo, já conferido pela API.
select is((teste.erro($$ select portal_recebimento_logo_registrar(diego, rm, jsonb_build_object('id', largo, 'nome', 'logo.png', 'formato', 'PNG', 'bytes', 86000,
  'largura', 1425, 'altura', 366, 'corte', '{}'::jsonb, 'contraste', 5.0, 'passa', true)) from ids $$)) -> 'detalhe' ->> 'motivo',
  'SO_SOCIO_DONO', 'decisão 22: só a sócia dona envia o logo');
select is((select portal_recebimento_logo_registrar(socia, rm, jsonb_build_object('id', largo, 'nome', 'logo-ribeiro-matos.png', 'formato', 'PNG', 'bytes', 86000,
  'largura', 1425, 'altura', 366, 'corte', '{"esquerda": 180}'::jsonb, 'contraste', 5.0, 'passa', true)) ->> 'largura' from ids), '1425',
  'decisão 15: o logo fica guardado com o tamanho depois do corte');
select portal_recebimento_logo_registrar(socia, rm, jsonb_build_object('id', claro, 'nome', 'logo-dourado.png', 'formato', 'SVG', 'bytes', 9000,
  'largura', 1400, 'altura', 380, 'corte', '{}'::jsonb, 'contraste', 1.2, 'passa', false)) from ids;
select portal_recebimento_logo_registrar(intrusa, outro, jsonb_build_object('id', alheio, 'nome', 'outro.png', 'formato', 'PNG', 'bytes', 9000,
  'largura', 900, 'altura', 300, 'corte', '{}'::jsonb, 'contraste', 9, 'passa', true)) from ids;
select is((select portal_recebimento_logo_arquivo(diego, rm, largo) from ids), (select rm::text || '/logos/' || largo::text || '.png' from ids),
  'o arquivo fica numa pasta do escritório, e toda a equipe abre (carnê e recibo)');
select is((teste.erro($$ select portal_recebimento_logo_arquivo(diego, rm, alheio) from ids $$)) ->> 'codigo', 'TC404', 'PT-01: o logo de outro escritório não abre');

-- Salvar a marca e a OAB.
select is((select portal_recebimento(socia, rm) ->> 'marca' from ids), 'LETRA', 'decisão 13: o padrão é o nome em letra');
select is((teste.erro($$ select portal_recebimento_salvar(socia, rm, jsonb_build_object('versao', 0, 'marca', 'LOGO', 'logoId', alheio)) from ids $$)) -> 'detalhe' ->> 'motivo',
  'LOGO_DE_OUTRO_ESCRITORIO', 'PT-01: não usa o logo de outro escritório');
select is((teste.erro($$ select portal_recebimento_salvar(socia, rm, '{"versao": 0, "oabUf": "SP", "oabNumero": ""}') from ids $$)) -> 'detalhe' -> 'campos',
  '["oabNumero"]'::jsonb, 'pergunta 5: seccional sem número');
select is((teste.erro($$ select portal_recebimento_salvar(socia, rm, '{"versao": 0, "oabUf": "XX", "oabNumero": "31874"}') from ids $$)) -> 'detalhe' -> 'campos',
  '["oabUf"]'::jsonb, 'seccional que não existe');
select is((teste.erro($$ select portal_recebimento_salvar(socia, rm, '{"versao": 0, "oabUf": "SP", "oabNumero": "0123"}') from ids $$)) -> 'detalhe' -> 'campos',
  '["oabNumero"]'::jsonb, 'número com zero na frente');
create temp table s1 as select portal_recebimento_salvar(socia, rm, jsonb_build_object('versao', 0, 'marca', 'LOGO', 'logoId', claro, 'logoCor', 'ARQUIVO',
  'oabUf', 'sp', 'oabNumero', '31.874')) r from ids;
select is((select r -> 'naoSalvo' ->> 'marca' from s1), 'LOGO_SEM_CONTRASTE', 'pergunta 7: logo claro demais nas cores do arquivo não é salvo');
select is((select portal_recebimento(socia, rm) ->> 'marca' from ids) || ' · ' || (select portal_recebimento(socia, rm) ->> 'oab' from ids), 'LETRA · OAB/SP 31.874',
  'decisão 19: o resto se salva (a OAB), a marca não');
select is((select portal_recebimento_salvar(socia, rm, jsonb_build_object('versao', 1, 'marca', 'LOGO', 'logoId', claro, 'logoCor', 'UMA_COR')) -> 'naoSalvo' from ids),
  'null'::jsonb, 'pergunta 7: em uma cor só, na cor da tinta, vale');
select is((select portal_recebimento_salvar(socia, rm, jsonb_build_object('versao', 2, 'marca', 'LOGO', 'logoId', largo, 'logoCor', 'ARQUIVO')) ->> 'versao' from ids),
  '3', 'troca para o logo largo');
select is((select portal_recebimento_marca(diego, rm) - 'logoId' from ids),
  '{"tipo": "LOGO", "largura": 1425, "altura": 366, "jeito": "SO_LOGO", "cor": "ARQUIVO", "oab": "OAB/SP 31.874"}'::jsonb,
  'F3.92: a proposta em Word lê a marca de hoje, com a OAB');
select is((teste.erro($$ select portal_recebimento_marca(intrusa, rm) from ids $$)) ->> 'codigo', 'TC401', 'PT-01: a marca de outro escritório não abre');
select is((select jsonb_build_array(r ->> 'marca', r -> 'logo' ->> 'nome', r ->> 'logoCor') from ids, lateral (select portal_recebimento(diego, rm) r) x),
  '["LOGO", "logo-ribeiro-matos.png", "ARQUIVO"]'::jsonb, 'decisão 22: Diego vê a marca em uso');
select is((select portal_escritorio(diego, rm) ->> 'oabSociedade' from ids), 'OAB/SP 31.874', 'decisão 23: "Dados do escritório" mostra o registro');
select is((select count(*)::int from historico h, ids where h.escritorio_id = ids.rm and h.acao = 'escritorio.oab_sociedade'), 1,
  'PT-03: a OAB da sociedade vai para o histórico');

-- O carnê guarda a marca do dia.
create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Hélio Batista Corrêa', 'origem', 'GOOGLE', 'documento', '52998224725',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Hélio Batista Corrêa', 'telefone', '+5511996027736', 'principal', true)))) ->> 'id')::uuid hel
  from ids;
create temp table ct as select
  (portal_contrato_criar(socia, rm, jsonb_build_object('clienteId', cli.hel, 'objeto', 'Ação revisional', 'responsavelId', ids.diego,
     'advogados', jsonb_build_array(ids.socia),
     'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'PARCELADO', 'total', 510000, 'parcelas', 6, 'primeiro', '2026-11-25')))) ->> 'id')::uuid id
  from ids, cli;
select portal_contrato_assinatura(socia, rm, ct.id, 1, '2026-11-18') from ids, ct;
create temp table k1 as select (portal_carne_gerar(diego, rm, ct.id, jsonb_build_object('area', 'FINANCEIRO',
  'parcelas', (select jsonb_agg(r.id) from recebimentos_previstos r where r.contrato_id = ct.id))) ->> 'id')::uuid id from ids, ct;
select is((select (portal_carne(diego, rm, k1.id, 'FINANCEIRO') -> 'marca') - 'logoId' from ids, k1),
  '{"tipo": "LOGO", "largura": 1425, "altura": 366, "jeito": "SO_LOGO", "cor": "ARQUIVO", "oab": "OAB/SP 31.874"}'::jsonb,
  'decisão 25: o carnê guarda a marca usada, com a OAB');
select is((select portal_carne(diego, rm, k1.id, 'FINANCEIRO') -> 'escritorio' ->> 'oab' from ids, k1), 'OAB/SP 31.874', 'decisão 24: a OAB depois do CNPJ');

-- O recibo guarda a marca do dia; trocar depois não muda o que saiu.
create temp table pg as select (portal_financeiro_receber_registrar_recibo(diego, rm, r.id, jsonb_build_object('valor', 85000, 'recebidoEm', '2026-11-18',
  'forma', 'PIX', 'recibo', true)) ->> 'id')::uuid id
  from ids, ct, lateral (select id from recebimentos_previstos where contrato_id = ct.id order by vencimento limit 1) r;
select is((select portal_recibo(diego, rm, pg.id) -> 'marca' ->> 'tipo' from ids, pg), 'LOGO', 'o recibo sai com o logo');
select portal_recebimento_salvar(socia, rm, jsonb_build_object('versao', 3, 'marca', 'LETRA', 'oabUf', null, 'oabNumero', null)) from ids;
select is((select portal_recibo(diego, rm, pg.id) -> 'marca' ->> 'tipo' from ids, pg) || ' · ' || (select portal_recibo(diego, rm, pg.id) -> 'escritorio' ->> 'oab' from ids, pg),
  'LOGO · OAB/SP 31.874', 'pergunta 9: o recibo já emitido fica como foi');
select is((select portal_carne(diego, rm, k1.id, 'FINANCEIRO') -> 'marca' ->> 'tipo' from ids, k1), 'LOGO', 'pergunta 9: o carnê já gerado fica como foi');
select is((select portal_recebimento_marca(diego, rm) ->> 'tipo' from ids), 'LETRA', 'F3.92: a próxima proposta sai com a marca nova');
select throws_ok($$ delete from escritorio_logos $$, 'TC023', null, 'decisão 21: o arquivo do logo fica guardado (nada se apaga)');

select * from finish();
rollback;
