-- Ficha do cliente ligada (0740; AP-01, AP-05, IN-01, CH-10, EX-01): o próximo passo segue a
-- proposta, o contrato e o caso; as abas entram pela própria área; a assinatura abre o caso na
-- mesma transação (ou junta, ou diz que não tem caso); quem não tem Jurídico abre com os dados
-- do contrato e a responsável recebe o aviso no sino.
begin;
select plan(32);

select ajustar_relogio(('2026-11-18 12:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Bianca Lopes') as bianca,
  teste.pessoa('Larissa Costa') as larissa,
  teste.escritorio('Ribeiro & Matos') as rm;
select teste.vincular(socia, rm, 'SOCIO') from ids;
select portal_convidar(socia, rm, diego, 'Diego Almeida', array['COMERCIAL']) from ids;
select portal_convidar(socia, rm, bianca, 'Bianca Lopes', array['CONTRATOS']) from ids;
select portal_convidar(socia, rm, larissa, 'Larissa Costa', array['JURIDICO']) from ids;

create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Antônia Ferreira Prado', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Antônia Ferreira Prado', 'telefone', '+5511996027736', 'principal', true)))) ->> 'id')::uuid ant,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Rosa Almeida', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Rosa Almeida', 'telefone', '+5511996027737', 'principal', true)))) ->> 'id')::uuid rosa
  from ids;

-- Sem nada: fazer a proposta, que é de quem tem Comercial.
select is((select portal_cliente(socia, rm, cli.ant) -> 'passo' ->> 'tipo' from ids, cli), 'SEM_PROPOSTA', 'sem proposta: o passo é fazer a proposta');
select is((select portal_cliente(bianca, rm, cli.ant) -> 'passo' -> 'pode' from ids, cli), 'false'::jsonb, 'sem Comercial, não dá o passo');
select ok((select portal_cliente(bianca, rm, cli.ant) -> 'passo' -> 'quemPode' ? 'Diego Almeida' from ids, cli), 'e a ficha diz quem pode');
select is((select (l -> 'passo' ->> 'tipo') from ids, cli, jsonb_array_elements(portal_clientes(socia, rm) -> 'clientes') l
            where (l ->> 'id')::uuid = cli.ant), 'SEM_PROPOSTA', 'a lista traz o passo em cada linha');

-- Proposta enviada, depois aceita.
create temp table pr as select (portal_proposta_criar(diego, rm, jsonb_build_object('clienteId', cli.ant, 'servico', 'Pensão por morte',
  'escopo', 'Recurso no INSS e ação.', 'responsavelId', diego,
  'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'MENSAL', 'valor', 50000, 'primeiro', '2026-12-05', 'meses', 6)),
  'retorno', jsonb_build_object('em', '2026-11-20', 'responsavelId', diego))) ->> 'id')::uuid id from ids, cli;
select portal_proposta_enviada(diego, rm, pr.id, 1) from ids, pr;
select is((select portal_cliente(socia, rm, cli.ant) -> 'passo' ->> 'tipo' from ids, cli), 'PROPOSTA_ANDAMENTO', 'proposta enviada: registrar a resposta');
select is((select portal_cliente(socia, rm, cli.ant) -> 'passo' -> 'item' ->> 'numero' from ids, cli), 'P-2026-001', 'com o número da proposta');
select is((select portal_cliente(larissa, rm, cli.ant) -> 'passo' -> 'item' from ids, cli), 'null'::jsonb, 'quem não tem a área não recebe o item');
select portal_proposta_resposta(diego, rm, pr.id, 2, jsonb_build_object('resposta', 'ACEITOU', 'em', '2026-11-18', 'canal', 'PRESENCIAL')) from ids, pr;
select is((select portal_cliente(socia, rm, cli.ant) -> 'passo' ->> 'tipo' from ids, cli), 'PROPOSTA_ACEITA', 'aceita sem contrato: gerar o contrato');
select is((select portal_cliente(socia, rm, cli.ant) -> 'passo' ->> 'area' from ids, cli), 'CONTRATOS', 'e o passo é da área Contratos');

-- Contrato da proposta, com a área do direito.
create temp table ct as select (portal_contrato_criar_area(bianca, rm, jsonb_build_object('clienteId', cli.ant, 'objeto', 'Pensão por morte',
  'responsavelId', ids.larissa, 'advogados', jsonb_build_array(ids.socia), 'propostaId', pr.id, 'area', 'PREVIDENCIARIO',
  'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'MENSAL', 'valor', 50000, 'primeiro', '2026-12-05', 'meses', 6)))) ->> 'id')::uuid id
  from ids, cli, pr;
select is((select area from contratos, ct where contratos.id = ct.id), 'PREVIDENCIARIO', 'pergunta 6: o contrato guarda a área do direito');
select is((teste.erro($$ select portal_contrato_criar_area(socia, rm, jsonb_build_object('clienteId', cli.ant, 'objeto', 'X y z',
  'responsavelId', ids.socia, 'advogados', jsonb_build_array(ids.socia), 'area', 'ASTROLOGIA',
  'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'MENSAL', 'valor', 50000, 'primeiro', '2026-12-05', 'meses', 6)))) from ids, cli $$))
  -> 'detalhe' -> 'campos', '["area"]'::jsonb, 'área desconhecida é recusada');
select is((select portal_cliente(socia, rm, cli.ant) -> 'passo' ->> 'tipo' from ids, cli), 'CONTRATO_ELABORACAO', 'contrato em elaboração: registrar a assinatura');

-- As abas.
select is((select jsonb_array_length(portal_cliente_itens(socia, rm, cli.ant, 'PROPOSTAS') -> 'propostas') from ids, cli), 1, 'aba Propostas');
select is((select portal_cliente_itens(socia, rm, cli.ant, 'CONTRATOS') -> 'contratos' -> 0 -> 'proposta' ->> 'numero' from ids, cli), 'P-2026-001',
  'aba Contratos: o contrato diz de que proposta veio');
select is((teste.erro($$ select portal_cliente_itens(diego, rm, cli.ant, 'CONTRATOS') from ids, cli $$)) -> 'detalhe' ->> 'motivo', 'AREA_NAO_LIBERADA',
  'cada aba entra pela própria área');
select is((select portal_cliente(diego, rm, cli.ant) -> 'contagens' from ids, cli), '{"propostas": 1}'::jsonb, 'as contagens só das áreas da pessoa');

-- Bianca (sem Jurídico) assina: o caso abre com os dados do contrato, mesmo que ela peça outro nome.
create temp table ass as select portal_contrato_assinatura_caso(bianca, rm, ct.id, 2, '2026-11-18',
  jsonb_build_object('modo', 'NOVO', 'nome', 'Outro nome', 'area', 'CIVEL', 'responsavelId', ids.bianca, 'papel', 'REU')) r from ids, ct;
select isnt((select r ->> 'casoId' from ass), null, 'CH-10: a assinatura abre o caso');
select is((select r -> 'podeVerCaso' from ass), 'false'::jsonb, 'quem não tem Jurídico não é levada ao caso');
select is((select nome || '|' || area || '|' || (responsavel_id = ids.larissa) from casos, ass, ids where casos.id = (ass.r ->> 'casoId')::uuid),
  'Antônia Ferreira Prado · Pensão por morte|PREVIDENCIARIO|true', 'sem Jurídico, valem os dados do contrato (nome, área e responsável)');
select is((select papel || '|' || (contrato_id = ct.id) from caso_clientes, ass, ct where caso_id = (ass.r ->> 'casoId')::uuid), 'AUTOR|true',
  'o cliente entra no caso com o contrato');
select is((select estado from contratos, ct where contratos.id = ct.id), 'ATIVO', 'a assinatura ficou');
select is((select count(*) from avisos_sino, ids where pessoa_id = ids.larissa and tipo = 'CASO_ABERTO_NA_ASSINATURA'), 1::bigint,
  'pergunta 5: a responsável recebe o aviso no sino');
select is((select portal_cliente(socia, rm, cli.ant) -> 'passo' ->> 'tipo' from ids, cli), 'CASO', 'com o caso aberto: ver o caso');
select is((select portal_cliente(bianca, rm, cli.ant) -> 'passo' -> 'casoResponsavel' ->> 'nome' from ids, cli), 'Larissa Costa',
  'sem Jurídico, a ficha diz com quem está o caso');

-- Rosa: contrato sem proposta; a assinatura falha no caso e nada fica.
create temp table ct2 as select (portal_contrato_criar(socia, rm, jsonb_build_object('clienteId', cli.rosa, 'objeto', 'Consultoria mensal',
  'responsavelId', ids.socia, 'advogados', jsonb_build_array(ids.socia),
  'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'MENSAL', 'valor', 80000, 'primeiro', '2026-12-05', 'meses', 6)))) ->> 'id')::uuid id
  from ids, cli;
select is((teste.erro($$ select portal_contrato_assinatura_caso(socia, rm, ct2.id, 1, '2026-11-18',
  jsonb_build_object('modo', 'NOVO', 'nome', 'X', 'area', 'CIVEL', 'responsavelId', ids.socia, 'papel', 'AUTOR')) from ids, ct2 $$))
  -> 'detalhe' -> 'campos', '["caso.nome"]'::jsonb, 'caso com erro é recusado');
select is((select estado from contratos, ct2 where contratos.id = ct2.id), 'ELABORACAO', 'decisão 17: e a assinatura não fica');
select is((teste.erro($$ select portal_contrato_assinatura_caso(socia, rm, ct2.id, 1, '2026-11-18', '{}'::jsonb) from ids, ct2 $$))
  -> 'detalhe' -> 'campos', '["caso.modo"]'::jsonb, 'sem escolha do caso, recusa');

-- "Este contrato não tem caso" (pergunta 4): o passo para de pedir o caso.
select portal_contrato_assinatura_caso(socia, rm, ct2.id, 1, '2026-11-18', jsonb_build_object('modo', 'SEM')) from ids, ct2;
select is((select sem_caso from contratos, ct2 where contratos.id = ct2.id), true, 'pergunta 4: o contrato diz que não tem caso');
select is((select portal_cliente(socia, rm, cli.rosa) -> 'passo' ->> 'tipo' from ids, cli), 'SEM_PROPOSTA', 'e o passo não pede "Abrir o caso"');

-- Depois, quem tem Jurídico junta a Rosa ao caso da Antônia.
select is((teste.erro($$ select portal_contrato_caso(bianca, rm, ct2.id, jsonb_build_object('modo', 'JUNTAR', 'casoId', ass.r ->> 'casoId')) from ids, ct2, ass $$))
  -> 'detalhe' ->> 'motivo', 'AREA_NAO_LIBERADA', 'abrir ou juntar depois pede a área Jurídico');
select is((select portal_contrato_caso(larissa, rm, ct2.id, jsonb_build_object('modo', 'JUNTAR', 'casoId', ass.r ->> 'casoId', 'papel', 'AUTOR')) ->> 'casoId'
             from ids, ct2, ass), (select r ->> 'casoId' from ass), 'EX-01: o cliente entra no caso que já existe, com o próprio contrato');
select is((select jsonb_array_length(portal_cliente_itens(larissa, rm, cli.rosa, 'CASOS') -> 'casos') from ids, cli), 1, 'e o caso aparece na aba Casos da Rosa');

select * from finish();
rollback;
