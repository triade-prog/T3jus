-- Jornada do cliente, parte 4a (0853; AP-08, EX-18): os documentos pessoais na ficha do cliente,
-- com o comprovante que vence pela data do papel e nada que se apague; e a lista por área, que
-- só a sócia dona muda.
begin;
select plan(24);

select ajustar_relogio(('2026-11-18 10:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Larissa Costa') as larissa,
  teste.pessoa('Bianca Lopes') as bianca,
  teste.escritorio('Ribeiro & Matos') as rm;
select teste.vincular(socia, rm, 'SOCIO') from ids;
select portal_convidar(socia, rm, larissa, 'Larissa Costa', array['JURIDICO']),
       portal_convidar(socia, rm, bianca, 'Bianca Lopes', array['COMERCIAL']) from ids;

create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Antônia Ferreira Prado', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Joana Prado', 'telefone', '+5511996027736', 'principal', true)))) ->> 'id')::uuid ant
  from ids;

create function pg_temp.anexar(p_pessoa uuid, p_dados jsonb) returns jsonb language sql as $$
  select portal_cliente_documento_concluir(p_pessoa, ids.rm,
    portal_cliente_documento_iniciar(p_pessoa, ids.rm, cli.ant,
      jsonb_build_object('nome', 'documento.pdf', 'arquivoTipo', 'application/pdf', 'tamanho', 1000) || p_dados))
    from ids, cli
$$;

-- 1. Anexar: o comprovante vence pela data que está no papel (decisão 36).
create temp table d1 as select pg_temp.anexar(ids.bianca, '{"tipo": "COMPROVANTE_RESIDENCIA", "dataDocumento": "2026-07-02"}') d from ids;
select is((select d ->> 'dias' from d1), '139', 'conta os dias da data do papel');
select is((select d -> 'vencido' from d1), 'true'::jsonb, 'decisão 36: com mais de 90 dias, o comprovante vence');
create temp table d2 as select pg_temp.anexar(ids.socia, '{"tipo": "RG_CPF", "fotos": 2}') d from ids;
select is((select d -> 'vencido' from d2), 'false'::jsonb, 'RG não vence');

-- Anexar um novo guarda o anterior (decisão 37).
create temp table d3 as select pg_temp.anexar(ids.socia, '{"tipo": "COMPROVANTE_RESIDENCIA", "dataDocumento": "2026-11-03"}') d from ids;
select is((select d -> 'vencido' from d3), 'false'::jsonb, 'o novo comprovante está em dia');
select is((select d ->> 'anteriores' from d3), '1', 'e guarda o anterior');
create temp table lista as select portal_cliente_documentos(larissa, rm, cli.ant) l from ids, cli;
select is((select jsonb_array_length(l -> 'documentos') from lista), 2, 'a ficha mostra só os em uso: RG e o comprovante novo');
select is((select l ->> 'validadeDias' from lista), '90', 'com o prazo do escritório');
select is((select count(*) from cliente_documentos, d1 where id = (d1.d ->> 'id')::uuid and substituido_por = (select (d ->> 'id')::uuid from d3)),
  1::bigint, 'o antigo aponta para o novo');

-- Recusas: data depois de hoje, "Outro" sem dizer o quê, 11 fotos.
select is((teste.erro($$ select portal_cliente_documento_iniciar(socia, rm, cli.ant, '{"tipo": "CERTIDAO_CASAMENTO", "dataDocumento": "2026-11-25",
  "nome": "c.pdf", "arquivoTipo": "application/pdf", "tamanho": 10}') from ids, cli $$)) -> 'detalhe' -> 'campos', '["dataDocumento"]'::jsonb,
  'decisão 39: data depois de hoje é recusada');
select is((teste.erro($$ select portal_cliente_documento_iniciar(socia, rm, cli.ant, '{"tipo": "OUTRO",
  "nome": "c.pdf", "arquivoTipo": "application/pdf", "tamanho": 10}') from ids, cli $$)) -> 'detalhe' -> 'campos', '["descricao"]'::jsonb,
  '"Outro documento pessoal" pede o que é');
select is((teste.erro($$ select portal_cliente_documento_iniciar(socia, rm, cli.ant, '{"tipo": "RG_CPF", "fotos": 11,
  "nome": "c.pdf", "arquivoTipo": "application/pdf", "tamanho": 10}') from ids, cli $$)) -> 'detalhe' -> 'campos', '["arquivo"]'::jsonb,
  'mais de 10 fotos é recusado');
select is((teste.erro($$ delete from cliente_documentos $$)) ->> 'codigo', 'TC023', 'PT-03: documento pessoal não se apaga');

-- O pedido aberto do caso fecha com o anexo da ficha (decisão 38).
create temp table ct as select (portal_contrato_criar(socia, rm, jsonb_build_object('clienteId', cli.ant, 'objeto', 'Pensão por morte',
  'responsavelId', socia, 'advogados', jsonb_build_array(socia),
  'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'EXITO', 'percentual', 3000, 'sobre', 'Atrasados', 'etapa', 'Encerrado', 'dias', 0)))) ->> 'id')::uuid id
  from ids, cli;
select portal_contrato_assinatura_caso(socia, rm, ct.id, 1, '2026-11-18', jsonb_build_object('modo', 'NOVO', 'nome', 'Ferreira Prado x INSS',
  'area', 'PREVIDENCIARIO', 'responsavelId', ids.larissa, 'papel', 'AUTOR')) from ids, ct;
create temp table cs as select c.id from casos c, ids where c.escritorio_id = ids.rm and c.nome = 'Ferreira Prado x INSS';
insert into documento_pedidos (escritorio_id, caso_id, descricao, cliente_id, pedido_em, pedido_por, tipo_pessoal, inicio)
  select ids.rm, cs.id, 'Certidão de casamento', cli.ant, '2026-11-18', ids.larissa, 'CERTIDAO_CASAMENTO', true from ids, cs, cli;
select is((select portal_cliente_documentos(socia, rm, cli.ant) -> 'pedidos' -> 0 ->> 'tipoPessoal' from ids, cli), 'CERTIDAO_CASAMENTO',
  'a ficha sabe do pedido aberto no caso');
select pg_temp.anexar(ids.socia, jsonb_build_object('tipo', 'CERTIDAO_CASAMENTO', 'pedidoId', p.id))
  from ids, documento_pedidos p where p.descricao = 'Certidão de casamento';
select ok((select chegou_em is not null from documento_pedidos where descricao = 'Certidão de casamento'), 'e o anexo da ficha fecha o pedido');

-- Abrir fica no histórico.
select is((select portal_cliente_documento_abrir(larissa, rm, (d2.d ->> 'id')::uuid) from ids, d2), 'documento.pdf', 'quem vê a ficha abre');

-- 3. A lista por área: só a sócia dona muda; a sugestão do T3jus entra inteira.
create temp table dl as select portal_juridico_documentos_inicio(larissa, rm) l from ids;
select is((select l -> 'podeEditar' from dl), 'false'::jsonb, 'decisão 41: a equipe vê, mas não muda');
select is((select jsonb_array_length(l -> 'areas' -> 0 -> 'sugestao') from dl), 7, 'previdenciário tem a sugestão de 7 documentos');
select is((teste.erro($$ select portal_juridico_documentos_inicio_sugestao(larissa, rm, 'PREVIDENCIARIO') from ids $$)) ->> 'codigo', 'TC401',
  'quem não é sócia dona não usa a sugestão');
create temp table l1 as select portal_juridico_documentos_inicio_sugestao(socia, rm, 'PREVIDENCIARIO') l from ids;
select is((select l -> 1 ->> 'pessoal' from l1), 'COMPROVANTE_RESIDENCIA', 'decisão 42: a sugestão vira a lista do escritório');
select is((teste.erro($$ select portal_juridico_documentos_inicio_sugestao(socia, rm, 'PREVIDENCIARIO') from ids $$)) -> 'detalhe' ->> 'motivo',
  'AREA_COM_LISTA', 'a área que já tem lista não recebe a sugestão de novo');

-- Editar com a versão lida, mover e tirar.
select portal_juridico_documento_inicio_salvar(socia, rm, (l -> 5 ->> 'id')::uuid, 1,
  '{"nome": "Laudos e exames médicos", "comoPedir": "Os dos últimos 2 anos.", "seHouver": true}') from ids, l1;
select ok((teste.erro($$ select portal_juridico_documento_inicio_salvar(socia, rm, (l -> 5 ->> 'id')::uuid, 1,
  '{"nome": "Laudos", "seHouver": true}') from ids, l1 $$)) is not null, 'a versão que mudou é recusada');
select is((select portal_juridico_documento_inicio_mover(socia, rm, (l -> 6 ->> 'id')::uuid, 'SOBE') -> 5 ->> 'nome' from ids, l1), 'Certidão de óbito',
  'subir troca com o vizinho');
select is((select jsonb_array_length(portal_juridico_documento_inicio_tirar(socia, rm, (l -> 4 ->> 'id')::uuid, 1)) from ids, l1), 6,
  'tirar da lista deixa 6');
select is((select count(*) from documentos_inicio where nome = 'Carta do INSS' and removido_em is not null), 1::bigint, 'e o tirado fica guardado');

select * from finish();
rollback;
