-- Fim da guarda de 5 anos (F0.15, PT-11): a rotina da noite apaga tudo o que o T3jus guardou
-- do escritório e dos clientes dele, inclusive o histórico, e deixa só o nome com a data. Os
-- arquivos do Storage vão para a fila da api-console. O outro escritório não perde nada.
begin;
select plan(19);

create temp table ids as select
  teste.equipe('Carol', 'ADMINISTRACAO') as adm,
  teste.pessoa('Renata Cedro') as socia,
  teste.pessoa('Paula Nunes') as paula,
  teste.pessoa('Ana Duas Casas') as ana,
  teste.pessoa('Marina Ribeiro') as outra_socia;
create temp table c as select
  console_criar_escritorio(adm, 'Cedro & Lima', 'Recife', 'PE') as cedro,
  console_criar_escritorio(adm, 'Ribeiro & Matos', 'São Paulo', 'SP') as rm
  from ids;
insert into vinculos (pessoa_id, escritorio_id, funcao, criado_por)
select socia, cedro, 'SOCIO', adm from ids, c
union all select outra_socia, rm, 'SOCIO', adm from ids, c;
select portal_convidar(socia, cedro, paula, 'Paula Nunes', array['COMERCIAL', 'JURIDICO']),
       portal_convidar(socia, cedro, ana, 'Ana Duas Casas', array['COMERCIAL']),
       portal_convidar(outra_socia, rm, ana, 'Ana Duas Casas', array['COMERCIAL']) from ids, c;
update pessoas set senha_criada_em = now() where id in (select socia from ids union select paula from ids union select ana from ids union select outra_socia from ids);
update escritorios set endereco = 'Rua da Aurora, 100', cnpj = '11222333000181',
       contatos = '[{"nome": "Renata", "papel": "Sócia", "telefone": "+5581999990000"}]'::jsonb where id = (select cedro from c);
select console_escrever_nota(adm, cedro, 'Cliente pediu o distrato por e-mail') from ids, c;

-- Dados dos clientes dos dois escritórios: ficha, atendimento, caso.
create function pg_temp.cliente(p_pessoa uuid, p_esc uuid, p_nome text) returns uuid language sql as $$
  select (portal_cliente_cadastrar(p_pessoa, p_esc, jsonb_build_object('tipo', 'PF', 'nome', p_nome, 'origem', 'GOOGLE',
            'contatos', jsonb_build_array(jsonb_build_object('nome', p_nome, 'telefone', '+5511985521034', 'principal', true)))) ->> 'id')::uuid $$;
create temp table cli as select pg_temp.cliente(socia, cedro, 'Helena Prado') helena, pg_temp.cliente(outra_socia, rm, 'Joana Pereira') joana from ids, c;
select portal_juridico_etapas(socia, cedro), portal_juridico_etapas(outra_socia, rm) from ids, c;
select portal_juridico_caso_criar(socia, cedro, jsonb_build_object('nome', 'Prado x Banco', 'area', 'CIVEL',
         'etapaId', (select id from etapas where escritorio_id = c.cedro and ordem = 3), 'responsavelId', ids.paula,
         'clientes', jsonb_build_array(jsonb_build_object('clienteId', cli.helena, 'papel', 'AUTOR'))))
  from ids, c, cli;

-- Quanto cada escritório tem, em todas as tabelas de escritório.
create function pg_temp.linhas(p_esc uuid) returns bigint language plpgsql as $$
declare t regclass; n bigint; v bigint := 0;
begin
  for t in select c.oid::regclass from pg_class c join pg_namespace s on s.oid = c.relnamespace
             join pg_attribute a on a.attrelid = c.oid and a.attname = 'escritorio_id' and not a.attisdropped
            where s.nspname = 'public' and c.relkind = 'r' loop
    execute format('select count(*) from %s where escritorio_id = $1', t) into n using p_esc;
    v := v + n;
  end loop;
  return v;
end $$;
create temp table antes as select pg_temp.linhas(cedro) cedro, pg_temp.linhas(rm) rm from c;
select ok((select cedro > 20 from antes), 'o escritório tem dados espalhados pelas tabelas');

-- Fim do contrato hoje. Antes dos 5 anos, nada sai.
select console_encerrar_contrato(adm, cedro, cl.versao, jsonb_build_object('fimEm', hoje_brasilia(), 'motivo', 'Distrato', 'nomeConfirmado', 'Cedro & Lima'))
  from ids, c, clientes cl where cl.escritorio_id = c.cedro;
select ajustar_relogio(interval '5 years' - interval '2 days');
create temp table r1 as select aplicar_prazos() j;
select is((select j -> 'contratos' ->> 'guardas_terminadas' from r1), '0', 'antes dos 5 anos, a guarda continua');
select ok((select guarda_terminada_em is null and cnpj is not null from escritorios, c where id = c.cedro), 'os dados ficam até o fim da guarda');

-- Fim da guarda.
select ajustar_relogio(interval '5 years' + interval '1 day');
create temp table r2 as select aplicar_prazos() j;
select is((select j -> 'contratos' ->> 'guardas_terminadas' from r2), '1', 'PT-11: no fim da guarda, a rotina apaga o escritório');
select is((select pg_temp.linhas(cedro) from c), 1::bigint, 'tudo do escritório sai; fica só o registro de que a guarda terminou');
select is((select acao || '|' || interno from historico, c where escritorio_id = c.cedro), 'dados.guarda_terminada|true',
  'o registro que fica é interno do T3jus');
select ok((select (dados -> 'apagados' ->> 'clientes_escritorio')::int = 1 and (dados -> 'apagados' ->> 'notas_internas')::int = 1
             and (dados -> 'apagados' ->> 'casos')::int = 1 from historico, c where escritorio_id = c.cedro),
  'o registro conta o que saiu de cada tabela');
select ok((select not historico_tem_dado_proibido(dados) from historico, c where escritorio_id = c.cedro), 'PT-03: sem dado pessoal na contagem');
select is((select row(nome, cidade, uf, endereco, cnpj, contatos)::text from escritorios, c where id = c.cedro),
  row('Cedro & Lima', null::text, null::text, null::text, null::text, '[]'::jsonb)::text, 'do escritório fica só o nome');
select ok((select guarda_terminada_em is not null and contrato_fim_em is not null from escritorios, c where id = c.cedro), 'com o fim do contrato e o da guarda');
select is((select pg_temp.linhas(rm) from c), (select rm from antes) + 0, 'o outro escritório não perde nada');
select ok((select count(*) = 0 from pessoas where id = (select paula from ids)), 'quem só trabalhou ali e perdeu a entrada sai de pessoas');
select ok((select count(*) = 1 from pessoas where id = (select ana from ids)), 'quem trabalha em outro escritório fica');
select is((select count(*)::int from pg_trigger g join pg_class k on k.oid = g.tgrelid join pg_namespace s on s.oid = k.relnamespace
            where s.nspname = 'public' and not g.tgisinternal and g.tgenabled = 'D'), 0, 'as travas voltam a valer');

-- Os arquivos: as duas pastas na fila da api-console.
select is((select array_agg(bucket order by bucket) from guarda_arquivos, c where escritorio = c.cedro),
  array['documentos-console', 'documentos-portal'], 'as pastas do escritório nos dois buckets vão para a fila');
select is((select jsonb_array_length(rotina_guarda_arquivos_pendentes(10))), 2, 'a rota pede as duas');
select rotina_guarda_arquivos_registrar((rotina_guarda_arquivos_pendentes(10) -> 0 ->> 'id')::uuid, 3, true);
select rotina_guarda_arquivos_registrar((rotina_guarda_arquivos_pendentes(10) -> 0 ->> 'id')::uuid, 1000, false, 'Storage respondeu 503');
select is((select jsonb_array_length(rotina_guarda_arquivos_pendentes(10))), 1, 'a pasta vazia sai da fila; a que falhou fica para a próxima');
select is((select count(*)::int from historico, c where escritorio_id = c.cedro and acao = 'dados.guarda_arquivos_apagados'), 1,
  'a pasta apagada fica no registro, com a contagem');

-- Rodar de novo não faz nada.
create temp table r3 as select aplicar_prazos() j;
select is((select j -> 'contratos' ->> 'guardas_terminadas' from r3), '0', 'a guarda termina uma vez só');

select * from finish();
rollback;
