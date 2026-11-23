-- Termo de curatela como anexo na ficha do cliente (0930; F3.118, AP-01, CH-08): só de pessoa física
-- sob curatela e ativa, em duas etapas, fora de Documentos pessoais, um em uso e o anterior guardado
-- (PT-03), escolhido no concluir (revisão, M1); a ficha e Gerar documentos mostram o termo; abrir
-- fica no histórico (PT-07); o escritório vem da sessão (PT-01); o inventário cita o termo (PT-11).
begin;
select plan(45);

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
-- Paula entra como sócia e depois tem o vínculo revogado (revisão, I2).
create temp table vp as select teste.vincular(paula, rm, 'SOCIO') v from ids;

create function pg_temp.cli(p jsonb) returns jsonb
language sql as $$
  select '{"tipo": "PF", "origem": "GOOGLE", "contatos": [{"nome": "Contato", "telefone": "+5511984723316", "principal": true}]}'::jsonb || p
$$;
create function pg_temp.curatela(p_nome text) returns jsonb
language sql as $$
  select pg_temp.cli(jsonb_build_object('nome', p_nome, 'capacidade', 'CURATELA', 'rl_papel', 'CURADORA',
    'rl_nome', 'Helena Ramos Castro', 'cur_processo', '1004587-22.2025.8.26.0100'))
$$;

create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, pg_temp.curatela('Sebastião Ramos Filho')) ->> 'id')::uuid seb,
  (portal_cliente_cadastrar(socia, rm, pg_temp.curatela('Ivo Ramos')) ->> 'id')::uuid ivo,
  (portal_cliente_cadastrar(socia, rm, pg_temp.curatela('Rui Teixeira')) ->> 'id')::uuid rui,
  (portal_cliente_cadastrar(socia, rm, pg_temp.cli('{"nome": "Antônia Ferreira Prado"}')) ->> 'id')::uuid ant,
  (portal_cliente_cadastrar(socia, rm, pg_temp.cli('{"nome": "Pedro Henrique Alves Souza", "capacidade": "MENOR", "nascimento": "2014-03-14",
     "rl_papel": "MAE", "rl_nome": "Joana Alves Souza"}')) ->> 'id')::uuid pedro,
  (portal_cliente_cadastrar(socia, rm, pg_temp.cli('{"tipo": "PJ", "nome": "Padaria Estrela Ltda"}')) ->> 'id')::uuid pj
  from ids;

create function pg_temp.iniciar(p_pessoa uuid, p_cliente uuid, p_dados jsonb default '{}') returns uuid language sql as $$
  select portal_cliente_termo_iniciar(p_pessoa, ids.rm, p_cliente,
    jsonb_build_object('nome', 'termo-curatela.pdf', 'arquivoTipo', 'application/pdf', 'tamanho', 380000) || p_dados) from ids
$$;
create function pg_temp.termo(p_pessoa uuid, p_cliente uuid, p_dados jsonb default '{}') returns jsonb language sql as $$
  select portal_cliente_documento_concluir(p_pessoa, ids.rm, pg_temp.iniciar(p_pessoa, p_cliente, p_dados)) from ids
$$;

-- RLS (revisão, M11): a tabela continua com o isolamento forçado.
select ok((select relrowsecurity and relforcerowsecurity from pg_class where relname = 'cliente_documentos'),
  'PT-01 termo: cliente_documentos segue com RLS forçado');

-- 1. Só pessoa física sob curatela.
select is((teste.erro($$ select pg_temp.iniciar(socia, cli.ant) from ids, cli $$)) -> 'detalhe' ->> 'motivo', 'CLIENTE_NAO_CURATELA',
  'AP-01 termo: quem assina por si não recebe termo');
select is((teste.erro($$ select pg_temp.iniciar(socia, cli.pedro) from ids, cli $$)) -> 'detalhe' ->> 'motivo', 'CLIENTE_NAO_CURATELA',
  'AP-01 termo: o menor não recebe termo de curatela');
select is((teste.erro($$ select pg_temp.iniciar(socia, cli.pj) from ids, cli $$)) -> 'detalhe' ->> 'motivo', 'CLIENTE_NAO_CURATELA',
  'AP-01 termo: a empresa não recebe termo');

-- 2. Cliente inativo é recusado.
select portal_cliente_inativar(socia, rm, cli.ivo, c.versao, 'Mudou de escritório') from ids, cli, clientes_escritorio c where c.id = cli.ivo;
select is((teste.erro($$ select pg_temp.iniciar(socia, cli.ivo) from ids, cli $$)) -> 'detalhe' ->> 'motivo', 'CLIENTE_NAO_ATIVO',
  'AP-01 termo: cliente inativo é recusado');

-- 3. Permissão (revisão, I2): pessoa de outro escritório e vínculo revogado não anexam.
select is((teste.erro($$ select portal_cliente_termo_iniciar(intrusa, rm, cli.seb, '{"nome": "t.pdf", "arquivoTipo": "application/pdf", "tamanho": 10}') from ids, cli $$)) ->> 'codigo',
  'TC401', 'AP-01 termo: quem não é do escritório não anexa');
-- 4. O escritório vem da sessão: no próprio escritório, o cliente do outro não existe.
select is((teste.erro($$ select portal_cliente_termo_iniciar(intrusa, outro, cli.seb, '{"nome": "t.pdf", "arquivoTipo": "application/pdf", "tamanho": 10}') from ids, cli $$)) ->> 'codigo',
  'TC404', 'PT-01 termo: o cliente de outro escritório não é encontrado');

-- 5. O envio em duas etapas.
create temp table t0 as select pg_temp.iniciar(ids.socia, cli.seb) id from ids, cli;
select is((select situacao::text from cliente_documentos, t0 where cliente_documentos.id = t0.id), 'ENVIANDO', 'AP-01 termo: iniciar deixa o termo enviando');
select is((select portal_cliente(socia, rm, cli.seb) -> 'termoCuratela' from ids, cli), 'null'::jsonb,
  'AP-01 termo: enquanto envia, a ficha não mostra o termo');
create temp table t1 as select portal_cliente_documento_concluir(ids.socia, ids.rm, t0.id) d from ids, t0;
create temp table f1 as select portal_cliente(socia, rm, cli.seb) f from ids, cli;
select ok((select f ? 'termoCuratela' from f1), 'I6: a ficha traz termoCuratela (o embrulho da 0930 vale)');
select is((select f -> 'termoCuratela' ->> 'nome' from f1), 'termo-curatela.pdf', 'AP-01 termo: depois de concluir, a ficha mostra o termo');
select is((select f -> 'termoCuratela' ->> 'tipo' from f1), 'TERMO_CURATELA', 'AP-01 termo: com o tipo do termo');
select is((select array_agg(k order by k) from f1, jsonb_object_keys(f -> 'termoCuratela') k),
  array['anteriores', 'arquivoTipo', 'enviadoEm', 'enviadoPor', 'fotos', 'id', 'nome', 'tamanho', 'tipo'],
  'AP-01 termo: sem descrição, data do papel nem vencimento');

-- 6. O termo não aparece em Documentos pessoais.
select is((select jsonb_array_length(portal_cliente_documentos(socia, rm, cli.seb) -> 'documentos') from ids, cli), 0,
  'AP-08 termo não aparece em Documentos pessoais');
select is((select count(*)::int from ids, cli, cliente_documentos_em_uso(ids.rm, cli.seb)), 0, 'AP-08 termo fora de cliente_documentos_em_uso');

-- 7. Nem na lista por área nem nos pedidos do caso (o check deles não aceita o termo).
select throws_ok($$ insert into documentos_inicio (escritorio_id, area, ordem, nome, pessoal, criado_por)
                    select rm, 'PREVIDENCIARIO', 1, 'Termo de curatela', 'TERMO_CURATELA', socia from ids $$,
  '23514', null, 'EX-18 termo não entra na lista por área');
select throws_ok($$ insert into documento_pedidos (escritorio_id, caso_id, descricao, cliente_id, pedido_em, pedido_por, tipo_pessoal)
                    select rm, gen_random_uuid(), 'Termo', cli.seb, '2026-11-23', socia, 'TERMO_CURATELA' from ids, cli $$,
  '23514', null, 'EX-18 termo não vira pedido de documento do caso');

-- 8. O envio comum recusa o termo: pelo tipo e como "substitui".
select is((teste.erro($$ select portal_cliente_documento_iniciar(socia, rm, cli.seb, '{"tipo": "TERMO_CURATELA", "nome": "t.pdf",
  "arquivoTipo": "application/pdf", "tamanho": 10}') from ids, cli $$)) -> 'detalhe' -> 'campos', '["tipo"]'::jsonb,
  'AP-08 o envio comum recusa o tipo do termo');
select is((teste.erro($$ select portal_cliente_documento_iniciar(socia, rm, cli.seb, jsonb_build_object('tipo', 'RG_CPF', 'nome', 'rg.pdf',
  'arquivoTipo', 'application/pdf', 'tamanho', 10, 'substitui', t0.id)) from ids, cli, t0 $$)) -> 'detalhe' -> 'campos', '["substitui"]'::jsonb,
  'AP-08 o envio comum não substitui o termo');

-- 9. Trocar o termo guarda o anterior; com dois envios cruzados, o anterior sai no concluir (M1).
create temp table cruz as select pg_temp.iniciar(ids.larissa, cli.seb, '{"nome": "termo-a.pdf"}') a,
                                 pg_temp.iniciar(ids.larissa, cli.seb, '{"nome": "termo-b.png", "arquivoTipo": "image/png"}') b from ids, cli;
select portal_cliente_documento_concluir(ids.larissa, ids.rm, cruz.a) from ids, cruz;
select portal_cliente_documento_concluir(ids.larissa, ids.rm, cruz.b) from ids, cruz;
create temp table f2 as select portal_cliente(socia, rm, cli.seb) -> 'termoCuratela' t from ids, cli;
select is((select (t ->> 'id')::uuid from f2), (select b from cruz), 'PT-03 trocar o termo: o mais novo fica em uso');
select is((select t ->> 'anteriores' from f2), '2', 'PT-03 trocar o termo: os dois anteriores ficam guardados');
select is((select substituido_por from cliente_documentos, t0 where cliente_documentos.id = t0.id), (select a from cruz), 'M1: o primeiro aponta para o segundo');
select is((select substituido_por from cliente_documentos, cruz where cliente_documentos.id = cruz.a), (select b from cruz), 'M1: o envio cruzado aponta para o último, sem dois em uso');
select is((select count(*)::int from cliente_documentos, cli where cliente_id = cli.seb and tipo = 'TERMO_CURATELA'), 3, 'PT-03 as 3 linhas continuam na tabela');

-- 15. O histórico do termo.
select is((select h.dados ->> 'substitui' from historico h, cruz where h.acao = 'cliente.documento_anexado' and h.dados ->> 'documento' = cruz.b::text),
  (select a::text from cruz), 'AP-01 histórico do termo: a troca diz qual substitui');
select is((select count(*)::int from historico h, cli where h.acao = 'cliente.documento_anexado' and h.entidade_id = cli.seb::text
             and h.dados ->> 'tipo' = 'TERMO_CURATELA'), 3, 'AP-01 histórico do termo: cada envio fica com o tipo');

-- 10. Não se apaga.
select is((teste.erro($$ delete from cliente_documentos where tipo = 'TERMO_CURATELA' $$)) ->> 'codigo', 'TC023', 'PT-03 termo não se apaga');

-- 11. O check do termo. Inserção direta como superusuário do teste (passa por cima do RLS; o que se
--     testa é o check, não o isolamento).
select throws_ok($$ insert into cliente_documentos (escritorio_id, cliente_id, tipo, descricao, nome, arquivo_tipo, tamanho, enviado_por)
                    select rm, cli.seb, 'TERMO_CURATELA', 'Termo do processo', 't.pdf', 'application/pdf', 10, socia from ids, cli $$,
  '23514', null, 'CH-08 termo: o check recusa descrição');
select throws_ok($$ insert into cliente_documentos (escritorio_id, cliente_id, tipo, data_documento, nome, arquivo_tipo, tamanho, enviado_por)
                    select rm, cli.seb, 'TERMO_CURATELA', '2026-11-01', 't.pdf', 'application/pdf', 10, socia from ids, cli $$,
  '23514', null, 'CH-08 termo: o check recusa data do papel');
select throws_ok($$ insert into cliente_documentos (escritorio_id, cliente_id, tipo, fotos, nome, arquivo_tipo, tamanho, enviado_por)
                    select rm, cli.seb, 'TERMO_CURATELA', 2, 't.pdf', 'application/pdf', 10, socia from ids, cli $$,
  '23514', null, 'CH-08 termo: o check recusa fotos juntadas');
select ok((select pg_temp.iniciar(socia, cli.seb, '{"nome": "termo.jpg", "arquivoTipo": "image/jpeg", "tamanho": 10485760}') is not null from ids, cli),
  'CH-08 termo: aceita foto JPEG de 10 MB');
select is((teste.erro($$ select pg_temp.iniciar(socia, cli.seb, '{"arquivoTipo": "application/msword"}') from ids, cli $$)) -> 'detalhe' -> 'campos',
  '["arquivo"]'::jsonb, 'CH-08 termo: recusa .doc');
select is((teste.erro($$ select pg_temp.iniciar(socia, cli.seb, '{"tamanho": 10485761}') from ids, cli $$)) -> 'detalhe' -> 'campos',
  '["arquivo"]'::jsonb, 'CH-08 termo: recusa mais de 10 MB');

-- 12. Abrir fica no histórico; quem é de fora ou foi revogado não abre (I2).
select is((select portal_cliente_documento_abrir(larissa, rm, cruz.b) from ids, cruz), 'termo-b.png', 'PT-07 abrir o termo: quem vê a ficha abre');
select is((select count(*)::int from historico h, cruz where h.acao = 'cliente.documento_aberto' and h.dados ->> 'documento' = cruz.b::text), 1,
  'PT-07 abrir o termo fica no histórico');
select is((teste.erro($$ select portal_cliente_documento_abrir(intrusa, rm, cruz.b) from ids, cruz $$)) ->> 'codigo', 'TC401',
  'PT-07 quem não é do escritório não abre o termo');
-- A revogação direta, como superusuário do teste (no Portal ela vem da Equipe, F1.6).
update vinculos set revogado_em = app_now(), revogado_por = ids.socia from ids, vp where vinculos.id = vp.v;
select is((teste.erro($$ select portal_cliente_documento_abrir(paula, rm, cruz.b) from ids, cruz $$)) ->> 'codigo', 'TC401',
  'PT-07 vínculo revogado não abre o termo');
select is((teste.erro($$ select pg_temp.iniciar(paula, cli.seb) from ids, cli $$)) ->> 'codigo', 'TC401',
  'AP-01 termo: vínculo revogado não anexa');

-- 14. Gerar documentos traz o termo; o de quem assina por si, não.
create temp table ct as select
  (portal_contrato_criar(socia, rm, jsonb_build_object('clienteId', cli.seb, 'objeto', 'Benefício assistencial', 'responsavelId', ids.socia,
     'advogados', jsonb_build_array(ids.socia), 'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'FIXO', 'valor', 300000, 'vencimento', '2026-12-05')))) ->> 'id')::uuid seb,
  (portal_contrato_criar(socia, rm, jsonb_build_object('clienteId', cli.ant, 'objeto', 'Indenização', 'responsavelId', ids.socia,
     'advogados', jsonb_build_array(ids.socia), 'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'FIXO', 'valor', 300000, 'vencimento', '2026-12-05')))) ->> 'id')::uuid ant
  from ids, cli;
select is((select (portal_documento_dados(socia, rm, ct.seb) -> 'termoCuratela' ->> 'id')::uuid from ids, ct), (select b from cruz),
  'CH-08 Gerar documentos traz o termo em uso');
select is((select portal_documento_dados(socia, rm, ct.ant) -> 'termoCuratela' from ids, ct), 'null'::jsonb,
  'CH-08 Gerar documentos de quem assina por si vem sem termo');

-- 13. A ficha só mostra o termo na curatela; quem sai e volta vê o termo guardado (revisão, I3).
select portal_cliente_editar(socia, rm, cli.seb, c.versao, pg_temp.cli('{"nome": "Sebastião Ramos Filho", "capacidade": "PLENA"}'))
  from ids, cli, clientes_escritorio c where c.id = cli.seb;
select is((select portal_cliente(socia, rm, cli.seb) -> 'termoCuratela' from ids, cli), 'null'::jsonb, 'PT-11 a ficha só mostra o termo na curatela');
select portal_cliente_editar(socia, rm, cli.seb, c.versao, pg_temp.curatela('Sebastião Ramos Filho'))
  from ids, cli, clientes_escritorio c where c.id = cli.seb;
select is((select (portal_cliente(socia, rm, cli.seb) -> 'termoCuratela' ->> 'id')::uuid from ids, cli), (select b from cruz),
  'I3: de volta à curatela, o termo guardado aparece');

-- M2: arquivado, o termo some da ficha e de Gerar documentos.
select portal_cliente_arquivar_lgpd(socia, rm, cli.seb, c.versao, jsonb_build_object('pedidoEm', hoje_brasilia(), 'canal', 'TELEFONE',
  'quemPediu', 'TITULAR', 'conferido', true)) from ids, cli, clientes_escritorio c where c.id = cli.seb;
select is((select portal_documento_dados(socia, rm, ct.seb) -> 'termoCuratela' from ids, ct), 'null'::jsonb,
  'M2: cliente arquivado não mostra o termo em Gerar documentos');

-- Excluído a pedido do titular: não é encontrado; a linha continua guardada (lacuna I4 no painel).
select pg_temp.termo(ids.socia, cli.rui) from ids, cli;
select portal_cliente_pedir_exclusao(socia, rm, cli.rui, jsonb_build_object('pedidoEm', hoje_brasilia(), 'canal', 'TELEFONE', 'quemPediu', 'TITULAR')) from ids, cli;
select portal_cliente_excluir_dados(socia, rm, cli.rui, c.versao, jsonb_build_object('pedidoEm', hoje_brasilia(), 'canal', 'TELEFONE',
  'quemPediu', 'TITULAR', 'conferido', true, 'nomeConfirmado', 'Rui Teixeira')) from ids, cli, clientes_escritorio c where c.id = cli.rui;
select is((teste.erro($$ select pg_temp.iniciar(socia, cli.rui) from ids, cli $$)) ->> 'codigo', 'TC404', 'AP-01 termo: excluído não é encontrado');

-- 16. Inventário.
select ok((select o_que like '%termo de curatela%' and base_legal like '%art. 11, II, "d"%' from inventario_dados where tabela = 'cliente_documentos'),
  'PT-11 inventário: documentos pessoais citam o termo de curatela e o art. 11, II, "d"');

select * from finish();
rollback;
