-- Quais inscrições na OAB de cada advogado vão no contrato (EX-12, F3.74): o padrão é todas, a
-- escolha ao criar, pelo menos uma, só da própria pessoa, mudar na ficha com a versão e o
-- histórico, inscrição nova não entra sozinha, a removida sai e sobra a que resta, quem deixa de
-- ser advogado do contrato leva a escolha; nada se apaga; isolamento (PT-01, PT-03, PT-19).
begin;
select plan(20);

select ajustar_relogio(('2026-11-18 12:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Felipe Matos') as felipe,
  teste.pessoa('Larissa Costa') as larissa,
  teste.pessoa('Paula Nunes') as paula,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, felipe, 'Felipe Matos', array['CONTRATOS']),
       portal_convidar(socia, rm, larissa, 'Larissa Costa', array['CONTRATOS']),
       portal_convidar(socia, rm, paula, 'Paula Nunes', array['CONTRATOS']) from ids;

create temp table oab as select
  (portal_oab_incluir(socia, rm, socia, '{"uf": "SP", "numero": "214538", "tipo": "PRINCIPAL"}') ->> 'id')::uuid ma,
  (portal_oab_incluir(socia, rm, felipe, '{"uf": "SP", "numero": "287104", "tipo": "PRINCIPAL"}') ->> 'id')::uuid fsp,
  (portal_oab_incluir(socia, rm, felipe, '{"uf": "RJ", "numero": "245880", "letra": "S", "tipo": "SUPLEMENTAR"}') ->> 'id')::uuid frj,
  (portal_oab_incluir(socia, rm, larissa, '{"uf": "SP", "numero": "401226", "tipo": "PRINCIPAL"}') ->> 'id')::uuid lsp
  from ids;

create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Benedito Souza Lima', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Benedito Souza Lima', 'telefone', '+5511996027736', 'principal', true)))) ->> 'id')::uuid ben
  from ids;

create temp table base as select jsonb_build_object('clienteId', cli.ben, 'objeto', 'Aposentadoria por idade', 'responsavelId', ids.socia,
  'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'FIXO', 'valor', 100000, 'vencimento', '2026-12-10'))) d from ids, cli;

-- Escolha ao criar (decisão 14).
select is((teste.erro($$ select portal_contrato_criar_oab(paula, rm, base.d || jsonb_build_object('advogados', jsonb_build_array(socia, felipe),
  'inscricoes', jsonb_build_object(felipe, '[]'::jsonb))) from ids, base $$)) -> 'detalhe' -> 'motivos',
  jsonb_build_object('inscricoes.' || (select felipe from ids), 'INSCRICAO_OBRIGATORIA'),
  'EX-12: advogado com OAB fica com pelo menos uma inscrição');
select is((teste.erro($$ select portal_contrato_criar_oab(paula, rm, base.d || jsonb_build_object('advogados', jsonb_build_array(socia, felipe),
  'inscricoes', jsonb_build_object(felipe, jsonb_build_array(oab.lsp)))) from ids, base, oab $$)) -> 'detalhe' -> 'motivos',
  jsonb_build_object('inscricoes.' || (select felipe from ids), 'INSCRICAO_DE_OUTRA_PESSOA'),
  'EX-12: só as inscrições da própria pessoa');
select is((teste.erro($$ select portal_contrato_criar_oab(paula, rm, base.d || jsonb_build_object('advogados', jsonb_build_array(socia),
  'inscricoes', jsonb_build_object(felipe, jsonb_build_array(oab.fsp)))) from ids, base, oab $$)) -> 'detalhe' -> 'motivos',
  '{"inscricoes": "INSCRICOES_INVALIDAS"}'::jsonb, 'EX-12: só de quem está marcado como advogado');
select is((select count(*) from contratos), 0::bigint, 'recusado, nada foi criado');

create temp table c1 as select (portal_contrato_criar_oab(paula, rm, base.d || jsonb_build_object('advogados', jsonb_build_array(socia, felipe),
  'inscricoes', jsonb_build_object(felipe, jsonb_build_array(oab.fsp)))) ->> 'id')::uuid id from ids, base, oab;
create temp table c2 as select (portal_contrato_criar_oab(paula, rm, base.d || jsonb_build_object('advogados', jsonb_build_array(felipe))) ->> 'id')::uuid id
  from ids, base;

select is((select contrato_oab_frase(rm, c1.id, felipe) from ids, c1), 'OAB/SP nº 287.104', 'decisão 17: só a escolhida vai no documento');
select is((select contrato_oab_frase(rm, c2.id, felipe) from ids, c2), 'OAB/SP nº 287.104 e OAB/RJ nº 245.880-S', 'decisão 20: sem escolha, vão todas, a principal primeiro');
select is((select contrato_oab_frase(rm, c1.id, socia) from ids, c1), 'OAB/SP nº 214.538', 'a única inscrição vai sempre');

create temp table ficha as select portal_contrato_inscricoes(paula, rm, c1.id) j from ids, c1;
select is((select x -> 'inscricoes' -> 1 ->> 'escolhida' from ficha, ids, jsonb_array_elements(j) x where x ->> 'pessoaId' = ids.felipe::text), 'false',
  'decisão 18: a ficha mostra a inscrição que fica fora');

-- Mudar inscrições na ficha (decisão 19).
select is((teste.erro($$ select portal_contrato_inscricoes_mudar(paula, rm, c1.id, felipe, 0, jsonb_build_array(oab.fsp, oab.frj)) from ids, c1, oab $$)) ->> 'codigo',
  'TC409', 'PT-19: a versão lida antiga é recusada');
select is((teste.erro($$ select portal_contrato_inscricoes_mudar(paula, rm, c1.id, felipe, 1, '[]'::jsonb) from ids, c1 $$)) -> 'detalhe' -> 'motivos',
  jsonb_build_object('inscricoes.' || (select felipe from ids), 'INSCRICAO_OBRIGATORIA'), 'na ficha também fica pelo menos uma');
select is((select portal_contrato_inscricoes_mudar(paula, rm, c1.id, felipe, (select versao from contratos where id = c1.id), jsonb_build_array(oab.frj)) ->> 'frase'
  from ids, c1, oab), 'OAB/RJ nº 245.880-S', 'trocar a escolha');
select is((select dados -> 'depois' ->> 'Felipe Matos' from historico where acao = 'contrato.inscricoes_mudadas' and entidade_id = (select id::text from c1)),
  'OAB/RJ nº 245.880-S', 'a mudança vai para o histórico com o depois');
select is((select count(*) from contrato_advogado_oab, c1 where contrato_id = c1.id and removido_em is not null), 2::bigint,
  'PT-03: as escolhas antigas (a de fora ao criar e a trocada agora) ficam marcadas, não apagadas');

-- Inscrição nova não entra sozinha; a removida sai e sobra a que resta (decisão 20).
select portal_oab_incluir(socia, rm, socia, '{"uf": "MG", "numero": "1", "tipo": "SUPLEMENTAR"}') from ids;
select is((select contrato_oab_frase(rm, c1.id, socia) from ids, c1), 'OAB/SP nº 214.538', 'inscrição nova não entra no contrato que já existe');
select portal_oab_remover(socia, rm, oab.frj, (select versao from oab_inscricao where id = oab.frj)) from ids, oab;
select is((select contrato_oab_frase(rm, c1.id, felipe) from ids, c1), 'OAB/SP nº 287.104', 'a escolhida removida: o contrato usa a que resta');
select ok((select (x ->> 'usaTodas')::boolean from ids, c1, jsonb_array_elements(portal_contrato_inscricoes(paula, rm, c1.id)) x where x ->> 'pessoaId' = ids.felipe::text),
  'e a ficha avisa');

-- Mudar o contrato e tirar um advogado leva a escolha dele.
select portal_contrato_condicoes_oab(paula, rm, c1.id, (select versao from contratos where id = c1.id),
  base.d - 'clienteId' || jsonb_build_object('advogados', jsonb_build_array(socia, larissa))) from ids, c1, base;
select is((select count(*) from contrato_advogado_oab, ids, c1 where contrato_id = c1.id and pessoa_id = felipe and removido_em is null), 0::bigint,
  'quem saiu do contrato leva a escolha');
select is((select contrato_oab_frase(rm, c1.id, larissa) from ids, c1), 'OAB/SP nº 401.226', 'quem entrou vem com todas');

-- Nada se apaga; isolamento.
select is((teste.erro($$ delete from contrato_advogado_oab $$)) ->> 'codigo', 'TC023', 'PT-03: a escolha não se apaga');
select is((teste.erro($$ select portal_contrato_inscricoes(intrusa, outro, c1.id) from ids, c1 $$)) ->> 'codigo', 'TC404',
  'PT-01: outro escritório não vê o contrato');

select * from finish();
rollback;
