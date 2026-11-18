-- Equipe do escritório no Portal (F1.6): áreas por pessoa, convite, mudar áreas, reenviar,
-- retirar passando para alguém e o histórico (PA-01, PA-02, PT-20, PT-21, EX-10).
begin;
select plan(25);

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Larissa Costa') as larissa,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO') from ids;
select teste.vincular(intrusa, outro, 'SOCIO') from ids;

-- Sócio dono vê tudo.
select is((select portal_escritorio(socia, rm) -> 'areas' from ids), '["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"]'::jsonb,
  'PA-02: o sócio dono vê as quatro áreas');
select is((select (portal_escritorio(socia, rm) ->> 'dono')::boolean from ids), true, 'o sócio é o dono');

-- Convidar com áreas.
create temp table conv as select portal_convidar(socia, rm, larissa, 'Larissa Costa', array['JURIDICO', 'JURIDICO']) as vl from ids;
select is((select portal_escritorio(larissa, rm) -> 'areas' from ids), '["JURIDICO"]'::jsonb, 'PA-02: Larissa abre só o Jurídico');
select is((select (portal_escritorio(larissa, rm) ->> 'dono')::boolean from ids), false, 'Larissa não é dona');
select is((select portal_escritorio(larissa, rm) ->> 'ultimaExportacao' from ids), null, 'quem não é dono não vê a exportação');
select lives_ok($$ select entrar_area(larissa, rm, 'JURIDICO') from ids $$, 'PA-01: entra na área liberada');
select is((teste.erro($$ select entrar_area(larissa, rm, 'FINANCEIRO') from ids $$)) -> 'detalhe' ->> 'motivo', 'AREA_NAO_LIBERADA',
  'PA-01: área não liberada é recusada no servidor');
select is((teste.erro($$ select portal_convidar(socia, rm, larissa, 'Larissa', '{}') from ids $$)) -> 'detalhe' ->> 'motivo', 'JA_NA_EQUIPE',
  'quem já está na equipe não é convidado de novo');
select is((teste.erro($$ select portal_convidar(socia, rm, diego, 'Diego', array['RH']) from ids $$)) -> 'detalhe' -> 'campos', '["areas"]'::jsonb,
  'área desconhecida é recusada');
select is((teste.erro($$ select portal_convidar(socia, rm, diego, '  ', '{}') from ids $$)) -> 'detalhe' -> 'campos', '["nome"]'::jsonb,
  'nome vazio é recusado');

-- Só o sócio dono cuida da equipe; outro escritório não entra.
select is((teste.erro($$ select portal_equipe(larissa, rm) from ids $$)) ->> 'codigo', 'TC401', 'PA-02: quem não é dono não vê a equipe');
select is((teste.erro($$ select portal_equipe(intrusa, rm) from ids $$)) ->> 'codigo', 'TC401', 'PT-01: sócia de outro escritório não vê esta equipe');
select is((teste.erro($$ select portal_mudar_areas(intrusa, outro, vl, array['FINANCEIRO']) from ids, conv $$)) ->> 'codigo', 'TC404',
  'PT-01: vínculo de outro escritório não muda pelo escritório da intrusa');

-- Lista: o sócio primeiro, com as áreas e o convite pendente.
select is((select jsonb_agg(x ->> 'nome') from ids, jsonb_array_elements(portal_equipe(socia, rm)) x), '["Marina Ribeiro", "Larissa Costa"]'::jsonb,
  'a lista começa pelo sócio');
select is((select x ->> 'senhaCriadaEm' from ids, jsonb_array_elements(portal_equipe(socia, rm)) x where x ->> 'nome' = 'Larissa Costa'), null,
  'PT-20: convite pendente');

-- Mudar áreas e reenviar.
select is((select portal_mudar_areas(socia, rm, vl, array['CONTRATOS', 'FINANCEIRO']) from ids, conv), '["CONTRATOS", "FINANCEIRO"]'::jsonb,
  'PA-02: o sócio muda as áreas');
select is((select count(*)::int from areas_liberadas a, conv where a.vinculo_id = vl and a.retirado_em is not null), 1,
  'a área retirada fica guardada');
select ok((select portal_reenviar_convite(socia, rm, vl) = larissa from ids, conv), 'reenviar devolve a pessoa');
update pessoas set senha_criada_em = now() where nome = 'Larissa Costa';
select is((teste.erro($$ select portal_reenviar_convite(socia, rm, vl) from ids, conv $$)) -> 'detalhe' ->> 'motivo', 'JA_ENTROU',
  'quem já entrou não recebe convite de novo');

-- Retirar: quem já entrou precisa de alguém para receber o que era dela (EX-10).
select is((teste.erro($$ select portal_retirar(socia, rm, vl, 1, null) from ids, conv $$)) -> 'detalhe' -> 'campos', '["passarPara"]'::jsonb,
  'EX-10: sem para quem passar, não retira');
select is((teste.erro($$ select portal_retirar(socia, rm, vl, 1, larissa) from ids, conv $$)) -> 'detalhe' -> 'campos', '["passarPara"]'::jsonb,
  'EX-10: não passa para a própria pessoa');
select is((select portal_retirar(socia, rm, vl, 1, socia) ->> 'passouPara' from ids, conv), (select socia::text from ids),
  'PT-21: retirada, o que era dela passa para a sócia');
select is((teste.erro($$ select portal_escritorio(larissa, rm) from ids $$)) ->> 'codigo', 'TC401', 'PT-21: retirada não entra mais');

-- Convite pendente é só cancelado; o histórico conta tudo.
create temp table conv2 as select portal_convidar(socia, rm, diego, 'Diego Almeida', '{}') as vd from ids;
select lives_ok($$ select portal_retirar(socia, rm, vd, 1, null) from ids, conv2 $$, 'convite pendente é cancelado sem passar para ninguém');
select is((select array_agg(acao order by id desc) from ids, portal_historico_equipe(socia, rm)),
  array['equipe.convite_cancelado', 'equipe.convidada', 'equipe.retirada', 'equipe.convite_reenviado', 'equipe.areas_mudadas', 'equipe.convidada'],
  'PA-02: o histórico da equipe guarda tudo, do mais novo ao mais antigo');

select * from finish();
rollback;
