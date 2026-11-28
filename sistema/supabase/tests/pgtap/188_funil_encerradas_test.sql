-- O Funil, Atendimentos e o Início sem a proposta encerrada a pedido do titular (1144; F3.204, AP-03,
-- PD-02, PT-11): as colunas de "Agora no funil" sem a encerrada; no período, o excluído continua fora
-- (desde a 0190) e o arquivado sem contrato com a última proposta aberta conta em
-- depoisProposta.encerradas, por cliente e sem conta dupla (revisão, M1): o arquivado com contrato conta
-- só como contrato e o que recusou continua em "recusou"; a conta da barra fecha; "Propostas esperando
-- resposta" e o rodapé do Comercial no Início sem a encerrada, e "a mais antiga" passa à seguinte; a
-- Origem continua batendo com os primeiros contatos.
begin;
select plan(17);

select ajustar_relogio(('2026-11-26 10:00-03'::timestamptz - now()));
update inventario_dados set situacao = 'PROPOSTA' where tabela = 'pessoas';

create temp table ids as select
  teste.pessoa('Paula Reis') as socia,
  teste.pessoa('Diego Martins') as diego,
  teste.escritorio('Reis & Coelho') as rc;
select teste.vincular(socia, rc, 'SOCIO') from ids;
select portal_convidar(socia, rc, diego, 'Diego Martins', array['COMERCIAL']) from ids;

create function pg_temp.cliente(p_nome text, p_tel text) returns uuid language sql as $$
  select (portal_cliente_cadastrar(socia, rc, jsonb_build_object('tipo', 'PF', 'origem', 'GOOGLE', 'nome', p_nome,
    'contatos', jsonb_build_array(jsonb_build_object('nome', p_nome, 'telefone', p_tel, 'principal', true)))) ->> 'id')::uuid from ids
$$;
create temp table cli as select
  pg_temp.cliente('Marina Alves Coelho', '+5511970123348') mar,   -- excluída: enviada e aceita
  pg_temp.cliente('Rui Arquivado Matos', '+5511955551234') rui,   -- arquivado, contrato direto, última em negociação
  pg_temp.cliente('Zeca Arquivado Lima', '+5511955554321') zeca,  -- arquivado, contrato pela proposta e outra enviada
  pg_temp.cliente('Lia Arquivada Reis', '+5511955556789') lia,    -- arquivada, contrato direto, última recusada
  pg_temp.cliente('Ana Ativa Lima', '+5511962310457') ana,        -- ativa, enviada
  pg_temp.cliente('Bia Ativa Prado', '+5511962310458') bia,       -- ativa, recusou (fechou com outro)
  pg_temp.cliente('Caio Ativo Souza', '+5511962310459') caio,     -- ativo, virou contrato
  pg_temp.cliente('Dora Ativa Nunes', '+5511962310460') dora;     -- ativa, sem proposta

create function pg_temp.proposta(p_cliente uuid, p_servico text, p_ate text) returns uuid language plpgsql as $$
declare v uuid; i ids;
begin
  select * into i from ids;
  v := (portal_proposta_criar(i.diego, i.rc, jsonb_build_object('clienteId', p_cliente, 'servico', p_servico, 'escopo', 'Ação e acompanhamento.',
    'responsavelId', i.diego, 'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'FIXO', 'valor', 200000, 'vencimento', '2026-12-10')),
    'retorno', jsonb_build_object('em', '2026-11-30', 'responsavelId', i.diego))) ->> 'id')::uuid;
  perform portal_proposta_enviada(i.diego, i.rc, v, 1);
  if p_ate = 'ENVIADA' then return v; end if;
  perform portal_proposta_resposta(i.diego, i.rc, v, 2, jsonb_build_object(
    'resposta', case p_ate when 'NEGOCIACAO' then 'MUDANCA' when 'RECUSADA' then 'RECUSOU' else 'ACEITOU' end,
    'em', '2026-11-12', 'canal', 'PRESENCIAL', 'motivo', case p_ate when 'RECUSADA' then case when p_servico like '%Bia%' then 'OUTRO_ESCRITORIO' else 'VALOR_ALTO' end end));
  return v;
end $$;
create function pg_temp.contrato(p_cliente uuid, p_proposta uuid) returns void language sql as $$
  select null::void from ids, portal_contrato_criar(socia, rc, jsonb_build_object('clienteId', p_cliente, 'propostaId', p_proposta, 'objeto', 'Contrato de teste',
    'responsavelId', socia, 'advogados', jsonb_build_array(socia),
    'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'FIXO', 'valor', 200000, 'vencimento', '2026-12-10'))))
$$;
-- Uma por vez, na ordem: a enviada de Marina é a mais antiga esperando resposta.
create temp table pr (nome text primary key, id uuid);
insert into pr select 'mar_env', pg_temp.proposta(mar, 'Revisão de Marina', 'ENVIADA') from cli;
insert into pr select 'mar_ace', pg_temp.proposta(mar, 'Benefício de Marina', 'ACEITA') from cli;
insert into pr select 'rui_neg', pg_temp.proposta(rui, 'Cobrança de Rui', 'NEGOCIACAO') from cli;
insert into pr select 'zeca_ctr', pg_temp.proposta(zeca, 'Inventário de Zeca', 'ACEITA') from cli;
insert into pr select 'lia_rec', pg_temp.proposta(lia, 'Despejo de Lia', 'RECUSADA') from cli;
insert into pr select 'ana_env', pg_temp.proposta(ana, 'Divórcio de Ana', 'ENVIADA') from cli;
insert into pr select 'bia_rec', pg_temp.proposta(bia, 'Pensão de Bia', 'RECUSADA') from cli;
insert into pr select 'caio_ctr', pg_temp.proposta(caio, 'Trabalhista de Caio', 'ACEITA') from cli;
select pg_temp.contrato(cli.zeca, (select id from pr where nome = 'zeca_ctr')), pg_temp.contrato(cli.caio, (select id from pr where nome = 'caio_ctr')),
       pg_temp.contrato(cli.rui, null), pg_temp.contrato(cli.lia, null) from cli;
-- Zeca, com o contrato, recebe outra proposta (a última dele).
insert into pr select 'zeca_env', pg_temp.proposta(zeca, 'Usucapião de Zeca', 'ENVIADA') from cli;

create function pg_temp.p(p_nome text) returns uuid language sql as $$ select id from pr where nome = p_nome $$;
create function pg_temp.funil() returns jsonb language sql as $$ select portal_comercial_funil(diego, rc, '90') from ids $$;
create function pg_temp.agora(p_coluna text) returns uuid[] language sql as $$
  select coalesce(array_agg((x ->> 'id')::uuid order by x ->> 'id'), '{}') from jsonb_array_elements(pg_temp.funil() -> 'agora' -> p_coluna) x $$;
create function pg_temp.esperando() returns uuid[] language sql as $$
  select coalesce(array_agg((x ->> 'id')::uuid order by x ->> 'id'), '{}') from ids, jsonb_array_elements(portal_comercial_retornos(diego, rc) -> 'propostasEsperando') x $$;
create function pg_temp.so(variadic p uuid[]) returns uuid[] language sql as $$ select array_agg(x order by x::text) from unnest(p) x $$;

-- 1. Antes.
select is(pg_temp.agora('enviada'), pg_temp.so(pg_temp.p('mar_env'), pg_temp.p('ana_env'), pg_temp.p('zeca_env')),
  'AP-03: antes, "Proposta enviada" tem Marina, Ana e a nova de Zeca');
select is((select portal_inicio_contatos(socia, rc, 'EQUIPE') -> 'propostaMaisAntiga' ->> 'id' from ids)::uuid, pg_temp.p('mar_env'),
  'PD-02: antes, a mais antiga esperando resposta é a de Marina');

-- 2. Marina é excluída; Rui, Zeca e Lia são arquivados a pedido.
select portal_cliente_excluir_dados(ids.socia, ids.rc, cli.mar, c.versao,
  jsonb_build_object('pedidoEm', hoje_brasilia(), 'canal', 'WHATSAPP', 'quemPediu', 'TITULAR', 'conferido', true, 'nomeConfirmado', c.nome))
  from ids, cli, clientes_escritorio c where c.id = cli.mar;
create function pg_temp.arquivar(p_cliente uuid) returns void language sql as $$
  select null::void from ids, clientes_escritorio c, portal_cliente_arquivar_lgpd(socia, rc, p_cliente, c.versao, jsonb_build_object('pedidoEm', hoje_brasilia(),
    'canal', 'EMAIL', 'quemPediu', 'TITULAR', 'conferido', true)) where c.id = p_cliente
$$;
select pg_temp.arquivar(rui), pg_temp.arquivar(zeca), pg_temp.arquivar(lia) from cli;

-- 3. "Agora no funil".
select is(pg_temp.agora('enviada'), array[pg_temp.p('ana_env')], 'AP-03 F3.204: "Proposta enviada" fica só com Ana (sai a do excluído e a do arquivado)');
select is(pg_temp.agora('negociacao'), '{}'::uuid[], 'AP-03 F3.204: "Em negociação" sem a do arquivado');
select is(pg_temp.agora('aceita'), '{}'::uuid[], 'AP-03 F3.204: "Aceita" sem o cartão "Cliente excluído"');
select is((select jsonb_array_length(pg_temp.funil() -> 'agora' -> 'contrato')), 2, 'AP-03: "Viraram contrato" não muda (Caio e Zeca)');

-- 4. O período.
select is((select jsonb_build_object('primeiros', f -> 'primeiros', 'comProposta', f -> 'comProposta', 'contratos', f -> 'contratos',
                                     'andamento', f -> 'depoisProposta' -> 'andamento', 'encerradas', f -> 'depoisProposta' -> 'encerradas')
             from pg_temp.funil() f),
  '{"primeiros": 7, "comProposta": 6, "contratos": 2, "andamento": 1, "encerradas": 1}'::jsonb,
  'AP-03 F3.204 P3: o excluído fora do período, como desde a 0190; o arquivado sem contrato (Rui) em "encerrada a pedido do titular"');
select is((select jsonb_agg(r order by r ->> 'motivo') from jsonb_array_elements(pg_temp.funil() -> 'depoisProposta' -> 'recusadas') r),
  '[{"n": 1, "motivo": "OUTRO_ESCRITORIO"}, {"n": 1, "motivo": "VALOR_ALTO"}]'::jsonb,
  'AP-03: a arquivada que recusou (Lia) continua em "recusou"');
select is((select (f ->> 'comProposta')::int - (f ->> 'contratos')::int - (f -> 'depoisProposta' ->> 'andamento')::int - (f -> 'depoisProposta' ->> 'encerradas')::int
             from pg_temp.funil() f),
  (select sum((r ->> 'n')::int)::int from jsonb_array_elements(pg_temp.funil() -> 'depoisProposta' -> 'recusadas') r),
  'AP-03 (revisão, M1): receberam proposta − contrato − em andamento − encerradas = recusaram (Zeca, com contrato, conta só como contrato)');
select is((select portal_comercial_origem(diego, rc, '90') ->> 'total' from ids)::int, (select (pg_temp.funil() ->> 'primeiros')::int),
  'AP-04: a Origem continua batendo com os primeiros contatos (o arquivado fica nos dois)');

-- 5. Atendimentos, "Propostas esperando resposta".
select is(pg_temp.esperando(), array[pg_temp.p('ana_env')], 'PD-02 F3.204: "Propostas esperando resposta" sem a do excluído e as dos arquivados');
select is((select portal_comercial_retornos(diego, rc, diego) -> 'propostasEsperando' -> 0 ->> 'id' from ids)::uuid, pg_temp.p('ana_env'),
  'PD-02: com o filtro do responsável, o mesmo');

-- 6. O Início, rodapé do Comercial.
select is((select (portal_inicio_contatos(socia, rc, 'EQUIPE') ->> 'propostasEsperando')::int from ids), 1,
  'PD-02 F3.204: o rodapé do Comercial conta só a de Ana');
select is((select portal_inicio_contatos(socia, rc, 'EQUIPE') -> 'propostaMaisAntiga' ->> 'id' from ids)::uuid, pg_temp.p('ana_env'),
  'PD-02 F3.204: "a mais antiga" passa à seguinte (a de Marina não fica a mais antiga para sempre)');
select is((select (portal_inicio_contatos(diego, rc, 'MEUS') ->> 'propostasEsperando')::int from ids), 1, 'PD-02: o mesmo em "Meus"');

-- 7. Nada se grava.
select is((select array_agg(estado order by nome) from pr join propostas p on p.id = pr.id where pr.nome in ('mar_env', 'mar_ace', 'rui_neg', 'zeca_env')),
  array['ACEITA', 'ENVIADA', 'NEGOCIACAO', 'ENVIADA'], 'PT-03: as propostas continuam com o estado gravado');
select is((select count(*)::int from propostas p, ids where p.escritorio_id = ids.rc and proposta_esta_encerrada(p)), 4,
  'F3.204: as quatro (duas de Marina, a de Rui e a nova de Zeca) estão encerradas na leitura');

select * from finish();
rollback;
