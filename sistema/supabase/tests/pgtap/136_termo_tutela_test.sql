-- Termo de tutela como anexo na ficha do cliente menor (0960; F3.140, AP-01, CH-08): só do menor com
-- tutora ou tutor, representado ou assistido no dia, e ativo; em duas etapas, fora de Documentos
-- pessoais, um em uso por tipo e o anterior guardado (PT-03); a ficha e Gerar documentos mostram o
-- termo; aos 18 anos ele fica guardado e aparece em "Quem assinava" (pergunta 1); abrir fica no
-- histórico (PT-07); o escritório vem da sessão (PT-01); o inventário cita o termo e o art. 14 (PT-11).
begin;
select plan(65);

select ajustar_relogio(('2026-11-23 10:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Larissa Costa') as larissa,
  teste.pessoa('Paula Nunes') as paula,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, larissa, 'Larissa Costa', array['JURIDICO']) from ids;
-- Paula entra como sócia e depois tem o vínculo revogado (revisão do F3.118, I2).
create temp table vp as select teste.vincular(paula, rm, 'SOCIO') v from ids;

create function pg_temp.cli(p jsonb) returns jsonb
language sql as $$
  select '{"tipo": "PF", "origem": "GOOGLE", "contatos": [{"nome": "Contato", "telefone": "+5511984723316", "principal": true}]}'::jsonb || p
$$;
create function pg_temp.menor(p_nome text, p_nasc text, p_papel text, p_rl text) returns jsonb
language sql as $$
  select pg_temp.cli(jsonb_build_object('nome', p_nome, 'capacidade', 'MENOR', 'nascimento', p_nasc, 'rl_papel', p_papel, 'rl_nome', p_rl))
$$;
create function pg_temp.curatela(p_nome text) returns jsonb
language sql as $$
  select pg_temp.cli(jsonb_build_object('nome', p_nome, 'capacidade', 'CURATELA', 'rl_papel', 'CURADORA', 'rl_nome', 'Helena Ramos Castro'))
$$;
create function pg_temp.editar(p_cliente uuid, p jsonb) returns jsonb
language sql as $$
  select portal_cliente_editar(ids.socia, ids.rm, p_cliente, c.versao, p) from ids, clientes_escritorio c where c.id = p_cliente
$$;

create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, pg_temp.menor('Davi Torres Lima', '2015-05-02', 'TUTORA', 'Sônia Torres Lima')) ->> 'id')::uuid davi,
  (portal_cliente_cadastrar(socia, rm, pg_temp.menor('Lucas Prado', '2010-02-03', 'TUTOR', 'Marcos Prado')) ->> 'id')::uuid lucas,
  (portal_cliente_cadastrar(socia, rm, pg_temp.menor('Pedro Souza', '2014-03-14', 'MAE', 'Joana Souza')) ->> 'id')::uuid pedro,
  (portal_cliente_cadastrar(socia, rm, pg_temp.menor('Bia Souza', '2014-03-14', 'PAI', 'Carlos Souza')) ->> 'id')::uuid bia,
  (portal_cliente_cadastrar(socia, rm, pg_temp.menor('Ivo Lima', '2015-01-10', 'TUTORA', 'Sônia Lima')) ->> 'id')::uuid ivo,
  (portal_cliente_cadastrar(socia, rm, pg_temp.menor('Rui Lima', '2015-01-10', 'TUTOR', 'Dario Lima')) ->> 'id')::uuid rui,
  (portal_cliente_cadastrar(socia, rm, pg_temp.menor('Teo Lima', '2015-01-10', 'TUTORA', 'Sônia Lima')) ->> 'id')::uuid teo,
  (portal_cliente_cadastrar(socia, rm, pg_temp.menor('Rafaela Nunes Torres', '2008-11-24', 'TUTORA', 'Cleusa Nunes Torres')) ->> 'id')::uuid rafa,
  (portal_cliente_cadastrar(socia, rm, pg_temp.menor('Lia Nunes', '2008-11-24', 'TUTORA', 'Cleusa Nunes')) ->> 'id')::uuid lia,
  (portal_cliente_cadastrar(socia, rm, pg_temp.curatela('Sebastião Ramos Filho')) ->> 'id')::uuid seb,
  (portal_cliente_cadastrar(socia, rm, pg_temp.cli('{"nome": "Antônia Ferreira Prado"}')) ->> 'id')::uuid ant,
  (portal_cliente_cadastrar(socia, rm, pg_temp.cli('{"tipo": "PJ", "nome": "Padaria Estrela Ltda"}')) ->> 'id')::uuid pj
  from ids;

create function pg_temp.iniciar(p_pessoa uuid, p_cliente uuid, p_dados jsonb default '{}') returns uuid language sql as $$
  select portal_cliente_termo_tutela_iniciar(p_pessoa, ids.rm, p_cliente,
    jsonb_build_object('nome', 'termo-tutela.pdf', 'arquivoTipo', 'application/pdf', 'tamanho', 380000) || p_dados) from ids
$$;
create function pg_temp.termo(p_pessoa uuid, p_cliente uuid, p_dados jsonb default '{}') returns uuid language sql as $$
  select (portal_cliente_documento_concluir(p_pessoa, ids.rm, pg_temp.iniciar(p_pessoa, p_cliente, p_dados)) ->> 'id')::uuid from ids
$$;
create function pg_temp.ficha(p_cliente uuid) returns jsonb language sql as $$
  select portal_cliente(ids.socia, ids.rm, p_cliente) from ids
$$;

-- 1. RLS e tipo.
select ok((select relrowsecurity and relforcerowsecurity from pg_class where relname = 'cliente_documentos'),
  'PT-01 termo de tutela: cliente_documentos segue com RLS forçado');
select ok(not tipo_documento_pessoal_valido('TERMO_TUTELA') and tipo_termo_responsavel('TERMO_TUTELA') and tipo_termo_responsavel('TERMO_CURATELA')
          and not tipo_termo_responsavel('RG_CPF') and not tipo_termo_responsavel(null),
  'AP-08 termo de tutela: não é documento pessoal; é termo, como o de curatela');
select throws_ok($$ insert into documentos_inicio (escritorio_id, area, ordem, nome, pessoal, criado_por)
                    select rm, 'FAMILIA', 1, 'Termo de tutela', 'TERMO_TUTELA', socia from ids $$,
  '23514', null, 'EX-18 termo de tutela não entra na lista por área');
select throws_ok($$ insert into documento_pedidos (escritorio_id, caso_id, descricao, cliente_id, pedido_em, pedido_por, tipo_pessoal)
                    select rm, gen_random_uuid(), 'Termo', cli.davi, '2026-11-23', socia, 'TERMO_TUTELA' from ids, cli $$,
  '23514', null, 'EX-18 termo de tutela não vira pedido de documento do caso');
select throws_ok($$ insert into cliente_documentos (escritorio_id, cliente_id, tipo, descricao, nome, arquivo_tipo, tamanho, enviado_por)
                    select rm, cli.davi, 'TERMO_TUTELA', 'Termo do processo', 't.pdf', 'application/pdf', 10, socia from ids, cli $$,
  '23514', null, 'CH-08 termo de tutela: o check recusa descrição');
select throws_ok($$ insert into cliente_documentos (escritorio_id, cliente_id, tipo, data_documento, nome, arquivo_tipo, tamanho, enviado_por)
                    select rm, cli.davi, 'TERMO_TUTELA', '2026-11-01', 't.pdf', 'application/pdf', 10, socia from ids, cli $$,
  '23514', null, 'CH-08 termo de tutela: o check recusa data do papel');
select throws_ok($$ insert into cliente_documentos (escritorio_id, cliente_id, tipo, fotos, nome, arquivo_tipo, tamanho, enviado_por)
                    select rm, cli.davi, 'TERMO_TUTELA', 2, 't.pdf', 'application/pdf', 10, socia from ids, cli $$,
  '23514', null, 'CH-08 termo de tutela: o check recusa fotos juntadas');
select is((teste.erro($$ select portal_cliente_documento_iniciar(socia, rm, cli.davi, '{"tipo": "TERMO_TUTELA", "nome": "t.pdf",
  "arquivoTipo": "application/pdf", "tamanho": 10}') from ids, cli $$)) -> 'detalhe' -> 'campos', '["tipo"]'::jsonb,
  'AP-08 o envio comum recusa o tipo do termo de tutela');

-- 2. Quem recebe.
select is((teste.erro($$ select pg_temp.iniciar(socia, cli.ant) from ids, cli $$)) -> 'detalhe' ->> 'motivo', 'CLIENTE_NAO_TUTELA',
  'AP-01 termo de tutela: quem assina por si não recebe');
select is((teste.erro($$ select pg_temp.iniciar(socia, cli.pj) from ids, cli $$)) -> 'detalhe' ->> 'motivo', 'CLIENTE_NAO_TUTELA',
  'AP-01 termo de tutela: a empresa não recebe');
select is((teste.erro($$ select pg_temp.iniciar(socia, cli.seb) from ids, cli $$)) -> 'detalhe' ->> 'motivo', 'CLIENTE_NAO_TUTELA',
  'AP-01 termo de tutela: quem está sob curatela não recebe');
select is((teste.erro($$ select pg_temp.iniciar(socia, cli.pedro) from ids, cli $$)) -> 'detalhe' ->> 'motivo', 'CLIENTE_NAO_TUTELA',
  'AP-01 termo de tutela: o menor com a mãe não recebe');
select is((teste.erro($$ select pg_temp.iniciar(socia, cli.bia) from ids, cli $$)) -> 'detalhe' ->> 'motivo', 'CLIENTE_NAO_TUTELA',
  'AP-01 termo de tutela: o menor com o pai não recebe');
select is((teste.erro($$ select portal_cliente_termo_iniciar(socia, rm, cli.davi, '{"nome": "t.pdf", "arquivoTipo": "application/pdf", "tamanho": 10}') from ids, cli $$))
  -> 'detalhe' ->> 'motivo', 'CLIENTE_NAO_CURATELA', 'AP-01 o menor com tutora não recebe termo de curatela (a rota diz o tipo)');
select portal_cliente_inativar(socia, rm, cli.ivo, c.versao, 'Mudou de escritório') from ids, cli, clientes_escritorio c where c.id = cli.ivo;
select is((teste.erro($$ select pg_temp.iniciar(socia, cli.ivo) from ids, cli $$)) -> 'detalhe' ->> 'motivo', 'CLIENTE_NAO_ATIVO',
  'AP-01 termo de tutela: cliente inativo é recusado');

-- 3. Permissão e escritório da sessão.
select is((teste.erro($$ select portal_cliente_termo_tutela_iniciar(intrusa, rm, cli.davi, '{"nome": "t.pdf", "arquivoTipo": "application/pdf", "tamanho": 10}') from ids, cli $$)) ->> 'codigo',
  'TC401', 'AP-01 termo de tutela: quem não é do escritório não anexa');
select is((teste.erro($$ select portal_cliente_termo_tutela_iniciar(intrusa, outro, cli.davi, '{"nome": "t.pdf", "arquivoTipo": "application/pdf", "tamanho": 10}') from ids, cli $$)) ->> 'codigo',
  'TC404', 'PT-01 termo de tutela: o cliente de outro escritório não é encontrado');

-- 4. Aceita o representado com tutora e o assistido com tutor; o envio em duas etapas.
create temp table t0 as select pg_temp.iniciar(ids.socia, cli.davi) id from ids, cli;
select is((select situacao::text from cliente_documentos, t0 where cliente_documentos.id = t0.id), 'ENVIANDO', 'AP-01 termo de tutela: iniciar deixa enviando');
select is((select pg_temp.ficha(cli.davi) -> 'termoTutela' from cli), 'null'::jsonb, 'AP-01 termo de tutela: enquanto envia, a ficha não mostra');
select is((teste.erro($$ select portal_cliente_documento_concluir(intrusa, rm, t0.id) from ids, t0 $$)) ->> 'codigo', 'TC401',
  'AP-01 termo de tutela: quem não é do escritório não conclui');
select portal_cliente_documento_concluir(ids.socia, ids.rm, t0.id) from ids, t0;
create temp table f1 as select pg_temp.ficha(cli.davi) f from cli;
select ok((select f ? 'termoTutela' and f ? 'termoCuratela' from f1), 'I6: a ficha traz termoTutela e termoCuratela (o embrulho da 0960 vale)');
select is((select (f -> 'termoTutela' ->> 'id')::uuid from f1), (select id from t0), 'AP-01 termo de tutela: depois de concluir, a ficha mostra');
select is((select f -> 'termoTutela' ->> 'tipo' from f1), 'TERMO_TUTELA', 'AP-01 termo de tutela: com o tipo do termo');
select is((select f -> 'termoCuratela' from f1), 'null'::jsonb, 'AP-01 o menor com tutora não tem termo de curatela');
select is((select array_agg(k order by k) from f1, jsonb_object_keys(f -> 'termoTutela') k),
  array['anteriores', 'arquivoTipo', 'enviadoEm', 'enviadoPor', 'fotos', 'id', 'nome', 'tamanho', 'tipo'],
  'AP-01 termo de tutela: sem descrição, data do papel nem vencimento');
select ok((select pg_temp.termo(socia, cli.lucas, '{"nome": "termo-tutor.png", "arquivoTipo": "image/png"}') is not null from ids, cli)
          and (select pg_temp.ficha(cli.lucas) -> 'termoTutela' ->> 'nome' from cli) = 'termo-tutor.png',
  'AP-01 termo de tutela: o assistido com tutor recebe');

-- 5. Fora de Documentos pessoais (e o de curatela também, revisão do F3.118, I6).
select is((select jsonb_array_length(portal_cliente_documentos(socia, rm, cli.davi) -> 'documentos') from ids, cli), 0,
  'AP-08 termo de tutela não aparece em Documentos pessoais');
select is((select count(*)::int from ids, cli, cliente_documentos_em_uso(ids.rm, cli.davi)), 0, 'AP-08 termo de tutela fora de cliente_documentos_em_uso');
select portal_cliente_documento_concluir(ids.socia, ids.rm, portal_cliente_termo_iniciar(ids.socia, ids.rm, cli.seb,
  '{"nome": "termo-curatela.pdf", "arquivoTipo": "application/pdf", "tamanho": 380000}')) from ids, cli;
select is((select count(*)::int from ids, cli, cliente_documentos_em_uso(ids.rm, cli.seb)), 0, 'AP-08 o termo de curatela continua fora');
select is((teste.erro($$ select portal_cliente_documento_iniciar(socia, rm, cli.davi, jsonb_build_object('tipo', 'RG_CPF', 'nome', 'rg.pdf',
  'arquivoTipo', 'application/pdf', 'tamanho', 10, 'substitui', t0.id)) from ids, cli, t0 $$)) -> 'detalhe' -> 'campos', '["substitui"]'::jsonb,
  'AP-08 o envio comum não substitui o termo de tutela');
select is((select (cliente_termo_em_uso(ids.rm, cli.seb)).tipo from ids, cli), 'TERMO_CURATELA',
  'M10: cliente_termo_em_uso de dois argumentos continua só da curatela');
select ok((select (cliente_termo_em_uso(ids.rm, cli.davi)).id is null from ids, cli),
  'M10: a de dois argumentos não vê o termo de tutela');

-- 6. Um em uso; envios cruzados; o anterior guardado; o histórico com o tipo.
create temp table cruz as select pg_temp.iniciar(ids.larissa, cli.davi, '{"nome": "termo-a.pdf"}') a,
                                 pg_temp.iniciar(ids.larissa, cli.davi, '{"nome": "termo-b.jpg", "arquivoTipo": "image/jpeg"}') b from ids, cli;
select portal_cliente_documento_concluir(ids.larissa, ids.rm, cruz.a) from ids, cruz;
select portal_cliente_documento_concluir(ids.larissa, ids.rm, cruz.b) from ids, cruz;
create temp table f2 as select pg_temp.ficha(cli.davi) -> 'termoTutela' t from cli;
select is((select (t ->> 'id')::uuid from f2), (select b from cruz), 'PT-03 trocar o termo de tutela: o mais novo fica em uso');
select is((select t ->> 'anteriores' from f2), '2', 'PT-03 trocar o termo de tutela: os anteriores ficam guardados');
select is((select substituido_por from cliente_documentos, t0 where cliente_documentos.id = t0.id), (select a from cruz), 'M1: o primeiro aponta para o segundo');
select is((select count(*)::int from cliente_documentos, cli where cliente_id = cli.davi and tipo = 'TERMO_TUTELA' and situacao = 'PRONTO' and substituido_por is null), 1,
  'M1: dois envios cruzados deixam um só em uso');
select is((select count(*)::int from historico h, cli where h.acao = 'cliente.documento_anexado' and h.entidade_id = cli.davi::text
             and h.dados ->> 'tipo' = 'TERMO_TUTELA'), 3, 'AP-01 histórico do termo de tutela: cada envio fica com o tipo');
select is((teste.erro($$ delete from cliente_documentos where tipo = 'TERMO_TUTELA' $$)) ->> 'codigo', 'TC023', 'PT-03 termo de tutela não se apaga');
select is((teste.erro($$ select pg_temp.iniciar(socia, cli.davi, '{"arquivoTipo": "application/msword"}') from ids, cli $$)) -> 'detalhe' -> 'campos',
  '["arquivo"]'::jsonb, 'CH-08 termo de tutela: recusa .doc');
select is((teste.erro($$ select pg_temp.iniciar(socia, cli.davi, '{"tamanho": 10485761}') from ids, cli $$)) -> 'detalhe' -> 'campos',
  '["arquivo"]'::jsonb, 'CH-08 termo de tutela: recusa mais de 10 MB');

-- 7. Abrir fica no histórico; quem é de fora ou foi revogado não abre.
select is((select portal_cliente_documento_abrir(larissa, rm, cruz.b) from ids, cruz), 'termo-b.jpg', 'PT-07 abrir o termo de tutela: quem vê a ficha abre');
select is((select count(*)::int from historico h, cruz where h.acao = 'cliente.documento_aberto' and h.dados ->> 'documento' = cruz.b::text), 1,
  'PT-07 abrir o termo de tutela fica no histórico');
select is((teste.erro($$ select portal_cliente_documento_abrir(intrusa, rm, cruz.b) from ids, cruz $$)) ->> 'codigo', 'TC401',
  'PT-07 quem não é do escritório não abre o termo de tutela');
update vinculos set revogado_em = app_now(), revogado_por = ids.socia from ids, vp where vinculos.id = vp.v;
select is((teste.erro($$ select portal_cliente_documento_abrir(paula, rm, cruz.b) from ids, cruz $$)) ->> 'codigo', 'TC401',
  'PT-07 vínculo revogado não abre o termo de tutela');
select is((teste.erro($$ select pg_temp.iniciar(paula, cli.davi) from ids, cli $$)) ->> 'codigo', 'TC401',
  'AP-01 termo de tutela: vínculo revogado não anexa');

-- 8. Gerar documentos: com tutora traz o termo; com a mãe, não.
create temp table ct as select
  (portal_contrato_criar(socia, rm, jsonb_build_object('clienteId', cli.davi, 'objeto', 'Pensão por morte', 'responsavelId', ids.socia,
     'advogados', jsonb_build_array(ids.socia), 'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'FIXO', 'valor', 300000, 'vencimento', '2026-12-05')))) ->> 'id')::uuid davi,
  (portal_contrato_criar(socia, rm, jsonb_build_object('clienteId', cli.pedro, 'objeto', 'Pensão alimentícia', 'responsavelId', ids.socia,
     'advogados', jsonb_build_array(ids.socia), 'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'FIXO', 'valor', 300000, 'vencimento', '2026-12-05')))) ->> 'id')::uuid pedro,
  (portal_contrato_criar(socia, rm, jsonb_build_object('clienteId', cli.rafa, 'objeto', 'Pensão por morte', 'responsavelId', ids.socia,
     'advogados', jsonb_build_array(ids.socia), 'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'FIXO', 'valor', 300000, 'vencimento', '2026-12-05')))) ->> 'id')::uuid rafa
  from ids, cli;
select is((select (portal_documento_dados(socia, rm, ct.davi) -> 'termoTutela' ->> 'id')::uuid from ids, ct), (select b from cruz),
  'CH-08 Gerar documentos do menor com tutora traz o termo de tutela');
select is((select portal_documento_dados(socia, rm, ct.pedro) -> 'termoTutela' from ids, ct), 'null'::jsonb,
  'CH-08 Gerar documentos do menor com a mãe vem sem termo de tutela');

-- 9. Troca de papel: some e volta, e a linha continua; o concluir não confere o papel (M1).
create temp table m1 as select pg_temp.iniciar(ids.socia, cli.rui) id from ids, cli;
select pg_temp.editar(cli.rui, pg_temp.menor('Rui Lima', '2015-01-10', 'MAE', 'Dora Lima')) from cli;
select portal_cliente_documento_concluir(ids.socia, ids.rm, m1.id) from ids, m1;
select is((select situacao::text from cliente_documentos, m1 where cliente_documentos.id = m1.id), 'PRONTO',
  'M1: o envio iniciado com tutor e concluído depois da troca para a mãe fica pronto');
select is((select pg_temp.ficha(cli.rui) -> 'termoTutela' from cli), 'null'::jsonb, 'AP-01 com a mãe, a ficha não mostra o termo de tutela');
select pg_temp.editar(cli.rui, pg_temp.menor('Rui Lima', '2015-01-10', 'TUTOR', 'Dario Lima')) from cli;
select is((select (pg_temp.ficha(cli.rui) -> 'termoTutela' ->> 'id')::uuid from cli), (select id from m1),
  'I3: de volta ao tutor, o termo guardado aparece');

-- 10. Os dois tipos não se misturam: da tutela para a curatela.
create temp table tt as select pg_temp.termo(ids.socia, cli.teo) id from ids, cli;
select pg_temp.editar(cli.teo, pg_temp.curatela('Teo Lima')) from cli;
select ok((select f -> 'termoTutela' = 'null'::jsonb and f -> 'termoCuratela' = 'null'::jsonb from (select pg_temp.ficha(cli.teo) f from cli) x),
  'AP-01 da tutela para a curatela: nenhum termo à vista até mandar o de curatela');
create temp table tc as select (portal_cliente_documento_concluir(ids.socia, ids.rm, portal_cliente_termo_iniciar(ids.socia, ids.rm, cli.teo,
  '{"nome": "termo-curatela.pdf", "arquivoTipo": "application/pdf", "tamanho": 380000}')) ->> 'id')::uuid id from ids, cli;
select ok((select substituido_por is null from cliente_documentos, tt where cliente_documentos.id = tt.id)
          and (select (cliente_termo_em_uso(ids.rm, cli.teo, 'TERMO_TUTELA')).id from ids, cli) = (select id from tt),
  'AP-01 concluir o de curatela não substitui o de tutela');
select is((select (pg_temp.ficha(cli.teo) -> 'termoCuratela' ->> 'id')::uuid from cli), (select id from tc),
  'AP-01 o termo de curatela aparece na curatela');

-- 11. Aos 18 anos (relógio no dia dos 18 de Rafaela e Lia).
create temp table tr as select pg_temp.termo(ids.socia, cli.rafa, '{"nome": "termo-tutela-rafaela.pdf"}') id from ids, cli;
-- Lia tinha tutora e foi adotada: a ficha passou a ter a mãe antes dos 18.
select pg_temp.termo(ids.socia, cli.lia) from ids, cli;
select pg_temp.editar(cli.lia, pg_temp.menor('Lia Nunes', '2008-11-24', 'MAE', 'Cleusa Nunes')) from cli;
select ajustar_relogio(('2026-11-24 10:00-03'::timestamptz - now()));
create temp table f18 as select pg_temp.ficha(cli.rafa) f from cli;
select is((select f -> 'assina' ->> 'situacao' from f18), 'FEZ_18', 'contexto: Rafaela fez 18 hoje');
select is((select (f -> 'termoTutela' ->> 'id')::uuid from f18), (select id from tr),
  'I1: no dia dos 18, a ficha ainda traz o termo guardado (para a janela)');
select is((select portal_documento_dados(socia, rm, ct.rafa) -> 'termoTutela' from ids, ct), 'null'::jsonb,
  'I1: no dia dos 18, Gerar documentos não traz o termo');
select is((teste.erro($$ select pg_temp.iniciar(socia, cli.rafa) from ids, cli $$)) -> 'detalhe' ->> 'motivo', 'CLIENTE_NAO_TUTELA',
  'AP-01 termo de tutela: quem fez 18 anos não recebe');
select portal_cliente_assina_por_si(socia, rm, cli.rafa, c.versao, '{"estado_civil": "SOLTEIRO", "profissao": "atendente"}')
  from ids, cli, clientes_escritorio c where c.id = cli.rafa;
create temp table fq as select pg_temp.ficha(cli.rafa) f from cli;
select is((select (f -> 'quemAssinava' -> 'termo' ->> 'id')::uuid from fq), (select id from tr),
  'pergunta 1: depois de "Agora assina por si", o termo fica em Quem assinava');
select is((select f -> 'termoTutela' from fq), 'null'::jsonb, 'pergunta 1: e sai de termoTutela');
select portal_cliente_assina_por_si(socia, rm, cli.lia, c.versao, '{}') from ids, cli, clientes_escritorio c where c.id = cli.lia;
select is((select coalesce(pg_temp.ficha(cli.lia) -> 'quemAssinava' -> 'termo', 'null'::jsonb) from cli), 'null'::jsonb,
  'pergunta 1: com a mãe em Quem assinava, não vem o termo de tutela antigo');

-- 12. Arquivado: some de Quem assinava, e o termo continua abrível pelo id, com histórico (M10).
select portal_cliente_arquivar_lgpd(socia, rm, cli.rafa, c.versao, jsonb_build_object('pedidoEm', hoje_brasilia(), 'canal', 'TELEFONE',
  'quemPediu', 'TITULAR', 'conferido', true)) from ids, cli, clientes_escritorio c where c.id = cli.rafa;
select is((select coalesce(pg_temp.ficha(cli.rafa) -> 'quemAssinava' -> 'termo', 'null'::jsonb) from cli), 'null'::jsonb, 'M10: arquivado, Quem assinava fica sem o termo');
select is((select portal_cliente_documento_abrir(socia, rm, tr.id) from ids, tr), 'termo-tutela-rafaela.pdf',
  'M10: o termo de cliente arquivado continua abrível pelo id');
select is((select count(*)::int from historico h, tr where h.acao = 'cliente.documento_aberto' and h.dados ->> 'documento' = tr.id::text), 1,
  'M10: a abertura do termo de cliente arquivado fica no histórico');
select portal_cliente_arquivar_lgpd(socia, rm, cli.davi, c.versao, jsonb_build_object('pedidoEm', hoje_brasilia(), 'canal', 'TELEFONE',
  'quemPediu', 'TITULAR', 'conferido', true)) from ids, cli, clientes_escritorio c where c.id = cli.davi;
select ok((select pg_temp.ficha(cli.davi) -> 'termoTutela' = 'null'::jsonb from cli)
          and (select portal_documento_dados(socia, rm, ct.davi) -> 'termoTutela' = 'null'::jsonb from ids, ct),
  'M2: arquivado, o termo de tutela some da ficha e de Gerar documentos');

-- 13. Inventário.
select ok((select o_que like '%termo de tutela%' and base_legal like '%art. 14%' and base_legal like '%art. 11, II, "d"%'
             and para_que like '%termo de curatela ou o de tutela%' from inventario_dados where tabela = 'cliente_documentos'),
  'PT-11 inventário: documentos pessoais citam o termo de tutela, o art. 14 e o art. 11, II, "d"');

select * from finish();
rollback;
