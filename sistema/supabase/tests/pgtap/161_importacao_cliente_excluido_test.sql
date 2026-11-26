-- As linhas da importação do cliente excluído a pedido do titular (1118 e 1119; F3.158, PT-11,
-- VA-05): saem as linhas do cliente novo e do juntado; a linha PULAR e a de erro que apontavam o
-- excluído como duplicado (a mesma pessoa, pelo CPF); a linha NOVO de outro cadastro fica, sem a
-- chave duplicado; a linha de outra pessoa com o telefone do excluído fica, sem a chave telefoneDe
-- (revisão v2, M-B); no financeiro, as linhas que acharam o cliente e as de fora com o CPF dele (no
-- bruto ou nas correções; revisão v2, m-a); o homônimo sem CPF fica (R2); a prévia, a importação de
-- processos e a do outro escritório não mudam; as linhas de fora e o desfazer depois da exclusão;
-- o preenchimento dos já excluídos (a 1119); o inventário.
begin;
select plan(31);

select ajustar_relogio(('2026-11-26 10:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Intrusa Souza') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;

create function pg_temp.cadastrar(p_nome text, p_doc text, p_tel text) returns uuid language sql as $$
  select (portal_cliente_cadastrar((select socia from ids), (select rm from ids), jsonb_strip_nulls(jsonb_build_object('tipo', 'PF', 'nome', p_nome,
    'documento', p_doc, 'contatos', jsonb_build_array(jsonb_build_object('nome', p_nome, 'telefone', p_tel, 'principal', true))))) ->> 'id')::uuid
$$;
-- Já cadastrados: Olga (vai ser juntada), Paula (o CPF B, a que pede a exclusão), Teresa (o telefone
-- da linha de Ulisses) e Xavier (excluído antes da 1118).
create temp table cli as select
  pg_temp.cadastrar('Olga Prado Lima', '12345678909', '+5511991110001') olga,
  pg_temp.cadastrar('Paula Reis Moura', '98765432100', '+5511982201764') paula,
  pg_temp.cadastrar('Teresa Campos', '11144477735', '+5511973330003') teresa,
  pg_temp.cadastrar('Xavier Antigo Melo', '22233344405', '+5511955550005') xavier;

create function pg_temp.planilha(p_linhas jsonb) returns jsonb language sql as $$
  select jsonb_build_object('arquivoNome', 'clientes.xlsx', 'oQue', 'CLIENTES', 'abas', jsonb_build_array(
    jsonb_build_object('nome', 'Clientes', 'colunas', jsonb_build_array('Nome', 'CPF', 'Celular', 'E-mail', 'Profissão'), 'linhas', p_linhas)))
$$;
-- Envia, liga as colunas, decide ({"numero": "decisão"}) e importa (p_importar = false deixa a prévia).
create function pg_temp.importar(p_pessoa uuid, p_esc uuid, p_linhas jsonb, p_decisoes jsonb, p_importar boolean default true) returns uuid
language plpgsql as $$
declare
  v uuid := (portal_importacao_criar(p_pessoa, p_esc, pg_temp.planilha(p_linhas)) ->> 'id')::uuid;
  k text;
begin
  perform portal_importacao_colunas(p_pessoa, p_esc, v, (select versao from importacoes where id = v),
    jsonb_build_object('ligacao', (select ligacao from importacoes where id = v)));
  for k in select jsonb_object_keys(p_decisoes) loop
    perform portal_importacao_linha(p_pessoa, p_esc, v, k::integer, jsonb_build_object('decisao', p_decisoes ->> k));
  end loop;
  if p_importar then
    perform portal_importacao_importar(p_pessoa, p_esc, v, (select versao from importacoes where id = v));
  end if;
  return v;
end $$;
create function pg_temp.excluir(p_cliente uuid) returns jsonb language sql as $$
  select portal_cliente_excluir_dados(ids.socia, ids.rm, p_cliente, c.versao,
    jsonb_build_object('pedidoEm', hoje_brasilia(), 'canal', 'TELEFONE', 'quemPediu', 'TITULAR', 'conferido', true, 'nomeConfirmado', c.nome))
    from clientes_escritorio c, ids where c.id = p_cliente
$$;
create function pg_temp.linhas(p_imp uuid) returns integer[] language sql as $$
  select coalesce(array_agg(numero order by numero), '{}') from importacao_linhas where importacao_id = p_imp
$$;
create function pg_temp.norm(p_imp uuid, p_numero integer) returns jsonb language sql as $$
  select norm from importacao_linhas where importacao_id = p_imp and numero = p_numero
$$;

-- A planilha: 2 Nina (nova), 3 Olga (juntada), 4 Paula (PULAR: o mesmo CPF), 5 Rita (o telefone de
-- Paula, SEGUIR), 6 Paula de novo sem contato (erro, com o duplicado), 7 uma linha de fora de outra
-- pessoa, 8 Ulisses (o telefone de Teresa, SEGUIR).
create temp table imp as select pg_temp.importar(socia, rm, jsonb_build_array(
    jsonb_build_array('Nina Nova Souza', '', '(11) 97000-1111', '', ''),
    jsonb_build_array('Olga P. Lima', '123.456.789-09', '(11) 99111-0001', 'olga@exemplo.com.br', 'professora'),
    jsonb_build_array('Paula Reis', '987.654.321-00', '(11) 96000-2222', '', ''),
    jsonb_build_array('Rita Alves', '', '(11) 98220-1764', '', ''),
    jsonb_build_array('Paula R. Moura', '987.654.321-00', '', '', ''),
    jsonb_build_array('Sem Contato Algum', '', '', '', ''),
    jsonb_build_array('Ulisses Dias', '', '(11) 97333-0003', '', '')),
  '{"3": "JUNTAR", "4": "PULAR", "5": "SEGUIR", "8": "SEGUIR"}') i1 from ids;
-- A segunda: Paula Segunda, outra pessoa com o mesmo CPF, entra como cadastro NOVO; Xavier juntado
-- (com a profissão) e Yara com o telefone dele.
alter table imp add column i2 uuid, add column prev uuid, add column fora uuid, add column fin uuid, add column casos uuid;
update imp set i2 = pg_temp.importar(socia, rm, jsonb_build_array(
    jsonb_build_array('Paula Segunda Reis', '987.654.321-00', '(11) 96111-3333', '', ''),
    jsonb_build_array('Xavier A. Melo', '222.333.444-05', '(11) 95555-0005', '', 'pedreiro'),
    jsonb_build_array('Yara Costa', '', '(11) 95555-0005', '', '')),
  '{"2": "NOVO", "3": "JUNTAR", "4": "SEGUIR"}') from ids;
-- O outro escritório: a mesma linha 2 e o mesmo CPF, sem contato (de fora).
update imp set fora = pg_temp.importar(intrusa, outro, jsonb_build_array(jsonb_build_array('Paula Reis Moura', '987.654.321-00', '', '', ''),
  jsonb_build_array('Outra Pessoa', '', '(11) 94444-0004', '', '')), '{}') from ids;
-- O financeiro do backup do Astrea, com a coluna do CPF: 2 Paula (achada pelo nome), 3 Paula com o
-- valor ilegível (de fora), 4 e 5 sem cadastro (o CPF dela entra no bruto e nas correções logo
-- abaixo), 6 o homônimo sem CPF.
create function pg_temp.backup() returns jsonb language sql as $$
  select jsonb_build_object(
    'arquivoNome', 'backup-astrea.xlsx', 'oQue', 'CLIENTES', 'origem', 'ASTREA', 'modelo', 'astrea-2026-11',
    'abas', jsonb_build_array(
      jsonb_build_object('nome', 'Contatos', 'colunas', jsonb_build_array('Nome', 'Tipo', 'Celular'),
        'linhas', jsonb_build_array(jsonb_build_array('Vera Nova Dias', 'Cliente', '(11) 93333-0006'))),
      jsonb_build_object('nome', 'Lançamentos', 'colunas', jsonb_build_array('Data', 'Cliente', 'Processo', 'Descrição', 'Valor', 'Situação', 'Tipo', 'CPF'),
        'linhas', jsonb_build_array(
          jsonb_build_array('01/03/2026', 'Paula Reis Moura', '', 'Honorários', '500,00', 'Pago', 'Receita', ''),
          jsonb_build_array('02/03/2026', 'Paula Reis Moura', '', 'Consulta', 'quinhentos', 'Pago', 'Receita', ''),
          jsonb_build_array('03/03/2026', 'Fulano Sem Cadastro', '', 'Consulta', '100,00', 'Pago', 'Receita', ''),
          jsonb_build_array('04/03/2026', 'Beltrano Sem Cadastro', '', 'Consulta', '100,00', 'Pago', 'Receita', ''),
          jsonb_build_array('05/03/2026', 'Paula Moura', '', 'Consulta', '100,00', 'Pago', 'Receita', '')))),
    'sistema', jsonb_build_array(
      jsonb_build_object('nome', 'Contatos', 'linhas', 1, 'destino', 'CLIENTES', 'reconhecida', true,
                         'porModelo', jsonb_build_object('0', 'nome', '1', 'tipo_contato', '2', 'telefone')),
      jsonb_build_object('nome', 'Lançamentos', 'linhas', 5, 'destino', 'FINANCEIRO', 'reconhecida', true,
                         'porModelo', jsonb_build_object('0', 'lanc_data', '1', 'cliente', '2', 'numero', '3', 'lanc_descricao', '4', 'lanc_valor',
                                                         '5', 'lanc_situacao', '6', 'lanc_tipo', '7', 'cliente_documento'))))
$$;
create function pg_temp.importar_backup() returns uuid language plpgsql as $$
declare
  s uuid := (select socia from ids);
  e uuid := (select rm from ids);
  j jsonb := portal_importacao_criar(s, e, pg_temp.backup());
  v uuid := (j ->> 'id')::uuid;
  f uuid;
begin
  perform portal_importacao_colunas(s, e, v, (select versao from importacoes where id = v), jsonb_build_object('aba', 0, 'ligacao', j -> 'ligacao'));
  f := (portal_importacao_importar(s, e, v, (select versao from importacoes where id = v)) -> 'filhaFinanceiro' ->> 'id')::uuid;
  perform portal_importacao_colunas(s, e, f, (select versao from importacoes where id = f), jsonb_build_object('ligacao', (select ligacao from importacoes where id = f)));
  perform portal_importacao_importar(s, e, f, (select versao from importacoes where id = f));
  return f;
end $$;
update imp set fin = pg_temp.importar_backup();
-- O CPF de Paula que a linha de fora traz: no bruto (como veio) e nas correções (corrigido na prévia).
update importacao_linhas set bruto = bruto || '{"cliente_documento": "987.654.321-00"}' where importacao_id = (select fin from imp) and numero = 4;
update importacao_linhas set correcoes = '{"cliente_documento": "98765432100"}' where importacao_id = (select fin from imp) and numero = 5;
-- Uma importação de processos concluída, com uma linha cujo duplicado (lá, um caso) tem o mesmo
-- uuid de Paula: posta direto, sem o guardião da transição.
alter table importacoes disable trigger guardiao_transicao;
insert into importacoes (id, escritorio_id, arquivo_nome, o_que, estado, criado_por, importado_em, desfazer_ate, origem)
  select gen_random_uuid(), rm, 'backup-astrea.xlsx', 'CASOS', 'CONCLUIDA', socia, app_now(), app_now() + interval '7 days', 'ASTREA' from ids;
update imp set casos = (select id from importacoes where o_que = 'CASOS' and escritorio_id = (select rm from ids));
alter table importacoes enable trigger guardiao_transicao;
insert into importacao_linhas (escritorio_id, importacao_id, numero, bruto, norm, situacao)
  select ids.rm, imp.casos, 2, '{"numero": "1000123-25.2025.5.02.0001"}', jsonb_build_object('duplicado', jsonb_build_object('id', cli.paula, 'nome', 'Caso')), 'IMPORTADA'
    from ids, imp, cli;
-- A prévia que ninguém importou ainda, com o CPF de Paula (por último: a prévia nova cancela a anterior).
update imp set prev = pg_temp.importar(socia, rm, jsonb_build_array(jsonb_build_array('Paula Reis Moura', '987.654.321-00', '(11) 96000-2222', '', '')),
  '{}', false) from ids;

-- 1. Antes da exclusão.
select is((select array[pg_temp.linhas(i1)::text, pg_temp.linhas(i2)::text, pg_temp.linhas(fin)::text] from imp),
  array['{2,3,4,5,6,7,8}', '{2,3,4}', '{2,3,4,5,6}'], 'as linhas das três importações antes da exclusão');
select is((select array_agg(situacao || coalesce('/' || decisao, '') order by numero) from importacao_linhas, imp where importacao_id = imp.i1),
  array['IMPORTADA', 'IMPORTADA/JUNTAR', 'PULADA/PULAR', 'IMPORTADA/SEGUIR', 'ERRO', 'ERRO', 'IMPORTADA/SEGUIR'], 'a planilha: novo, juntado, pulado, de fora');
select is((select array[pg_temp.norm(i1, 4) -> 'duplicado' ->> 'id', pg_temp.norm(i1, 6) -> 'duplicado' ->> 'id', pg_temp.norm(i1, 5) -> 'telefoneDe' ->> 'id',
                        pg_temp.norm(i2, 2) -> 'duplicado' ->> 'id'] from imp),
  (select array_fill(paula::text, array[4]) from cli), 'a linha PULAR, a de erro, a de Rita e a NOVO citam Paula');
select is((select array[(l.cliente_id = cli.paula)::text, l.situacao] from importacao_linhas l, imp, cli where l.importacao_id = imp.fin and l.numero = 3),
  array[null, 'ERRO'], 'no financeiro, a linha de valor ilegível ficou de fora');
select is((select pg_temp.norm(fin, 3) -> 'cliente' ->> 'id' from imp), (select paula::text from cli), 'e guarda o cliente que achou');
create temp table plano_antes as select portal_importacao_plano_desfazer(socia, rm, imp.i1) j from ids, imp;
create temp table prev_antes as select * from importacao_linhas where importacao_id = (select prev from imp);
create temp table fora_antes as select * from importacao_linhas where importacao_id = (select fora from imp);

-- 2. A exclusão do novo, do juntado e de Paula.
select pg_temp.excluir(l.cliente_id) from importacao_linhas l, imp where l.importacao_id = imp.i1 and l.numero = 2;
select pg_temp.excluir(olga) from cli;
select pg_temp.excluir(paula) from cli;

select is((select pg_temp.linhas(i1) from imp), '{5,7,8}'::integer[],
  'PT-11 F3.158: saem a linha da nova, a do juntado, a PULAR e a de erro com o mesmo CPF; Rita, a de fora e Ulisses ficam');
select ok((select not (pg_temp.norm(i1, 5) ? 'telefoneDe') from imp), 'PT-11 F3.158: a linha de Rita fica sem a chave telefoneDe (M-B)');
select is((select pg_temp.norm(i1, 5) -> 'cliente' ->> 'nome' from imp), 'Rita Alves', 'PT-11 F3.158: o resto da linha de Rita não muda');
select is((select pg_temp.norm(i1, 8) -> 'telefoneDe' ->> 'id' from imp), (select teresa::text from cli),
  'PT-11 F3.158: o telefoneDe de quem não foi excluído fica');
select is((select pg_temp.linhas(i2) from imp), '{2,3,4}'::integer[], 'PT-11 F3.158: a segunda importação não perde linha');
select ok((select not (pg_temp.norm(i2, 2) ? 'duplicado') from imp), 'PT-11 F3.158: a linha NOVO fica sem a chave duplicado (G1)');
select is((select array[l.situacao, c.nome] from importacao_linhas l join clientes_escritorio c on c.id = l.cliente_id, imp
            where l.importacao_id = imp.i2 and l.numero = 2), array['IMPORTADA', 'Paula Segunda Reis'],
  'PT-11 F3.158: e continua ligada ao outro cadastro');
select is((select pg_temp.linhas(fin) from imp), '{6}'::integer[],
  'PT-11 F3.158: no financeiro saem a que achou Paula, a de fora com ela, e as de fora com o CPF dela no bruto e nas correções');
select is((select (bruto ->> 'cliente') from importacao_linhas, imp where importacao_id = imp.fin and numero = 6), 'Paula Moura',
  'PT-11 F3.158: o homônimo sem CPF fica (R2, limite aceito)');
select is((select norm -> 'duplicado' ->> 'id' from importacao_linhas, imp where importacao_id = imp.casos), (select paula::text from cli),
  'PT-11 F3.158: na importação de processos o duplicado é um caso e não muda');
select ok((select count(*) = (select count(*) from prev_antes) and bool_and(l.norm = p.norm and l.bruto = p.bruto)
             from importacao_linhas l join prev_antes p on p.id = l.id), 'PT-11 F3.158: a prévia não muda');
select ok((select count(*) = 2 and bool_and(l.norm = p.norm and l.bruto = p.bruto)
             from importacao_linhas l join fora_antes p on p.id = l.id), 'PT-01 F3.158: a do outro escritório, com a linha 2 e o mesmo CPF, não muda');
select ok((select bool_and(c.documento is null) from clientes_escritorio c, cli where c.id in (cli.olga, cli.paula)),
  'a exclusão limpou o CPF da ficha (a 1118 procura pelo que estava antes)');

-- 3. As linhas de fora e o desfazer depois da exclusão.
create temp table fora1 as select portal_importacao_fora(socia, rm, imp.i1) j, portal_importacao(socia, rm, imp.i1) k from ids, imp;
select is((select jsonb_agg(x -> 'numero' order by (x ->> 'numero')::integer) from fora1, jsonb_array_elements(j -> 'linhas') x), '[7]'::jsonb,
  'PT-11 F3.158: as linhas de fora não trazem mais a de Paula');
select is((select (k ->> 'fora')::integer from fora1), (select jsonb_array_length(j -> 'linhas') from fora1),
  'PT-11 F3.158: a contagem de fora bate com a lista');
select is((select (j ->> 'juntados')::integer from plano_antes), 1, 'antes da exclusão, o desfazer contava Olga como juntada');
create temp table df as select portal_importacao_desfazer(socia, rm, imp.i1, 'Planilha errada') r from ids, imp;
select is((select (r -> 'feito') - 'mexidos' from df), '{"clientes": 2, "juntados": 0, "contratos": 0, "parcelas": 0}'::jsonb,
  'PT-11 F3.158: o desfazer depois da exclusão funciona, sem o juntado excluído (Rita e Ulisses ficam inativos)');
select is((select count(*) from historico h, cli where h.acao = 'cliente.juntado_desfeito' and h.entidade_id = cli.olga::text)::integer, 0,
  'PT-11 F3.158: e não escreve cliente.juntado_desfeito no excluído');
select is((select array_agg(c.estado order by c.nome) from clientes_escritorio c, cli where c.id in (cli.olga, cli.paula)), array['EXCLUIDO', 'EXCLUIDO'],
  'os excluídos continuam excluídos');

-- 4. Os excluídos antes da 1118 (a 1119): Xavier, juntado na segunda e com o telefone na linha de
-- Yara, é excluído sem o gatilho; o preenchimento roda pela rotina, só com o id.
alter table clientes_escritorio disable trigger importacao_apagar_do_excluido;
select pg_temp.excluir(xavier) from cli;
alter table clientes_escritorio enable trigger importacao_apagar_do_excluido;
select is((select array[(pg_temp.norm(i2, 3) -> 'cliente' ->> 'nome'), pg_temp.norm(i2, 4) -> 'telefoneDe' ->> 'id'] from imp),
  (select array['Xavier A. Melo', xavier::text] from cli), 'sem o gatilho, as linhas de Xavier ficam');
grant select on ids, cli, imp to dominio;
set local role dominio;
create temp table pre1 as select importacao_linhas_preencher_excluidos() j;
create temp table pre2 as select importacao_linhas_preencher_excluidos() j;
reset role;
select is((select j from pre1), jsonb_build_object((select rm from ids)::text, '{"clientes": 1, "linhas": 1, "chaves": 1}'::jsonb),
  'PT-11 F3.158: o preenchimento apaga a linha de Xavier e tira o telefoneDe da de Yara, contando por escritório');
select is((select array[pg_temp.linhas(i2)::text, (pg_temp.norm(i2, 4) ? 'telefoneDe')::text] from imp), array['{2,4}', 'false'],
  'PT-11 F3.158: a linha de Yara fica');
select is((select j from pre2), '{}'::jsonb, 'PT-11 F3.158: rodar de novo não muda nada (idempotente)');

-- 5. Inventário e gatilho.
select is((select array[prazo, no_fim] from inventario_dados where tabela = 'importacao_linhas'),
  array['As linhas da prévia: 24 horas; as da importação concluída ou desfeita (de fora e importadas): até o fim do prazo de desfazer (7 dias)',
        'Apagadas no fim do prazo de desfazer; as do cliente excluído a pedido do titular, e as que trazem o CPF dele, saem na exclusão'],
  'PT-11 F3.158: o inventário das linhas da importação');
select ok((select length(prazo) <= 200 and length(no_fim) <= 200 and situacao = 'APROVADO' from inventario_dados where tabela = 'importacao_linhas'),
  'PT-11 F3.158: os textos cabem em 200 letras e continuam aprovados');
select ok((select pg_get_triggerdef(oid) like '%AFTER UPDATE OF estado ON public.clientes_escritorio FOR EACH ROW WHEN (((new.estado = ''EXCLUIDO''::text) AND (old.estado <> ''EXCLUIDO''::text)))%'
             from pg_trigger where tgname = 'importacao_apagar_do_excluido'),
  'PT-11 F3.158: o gatilho é AFTER UPDATE OF estado, só na passagem a EXCLUIDO');

select * from finish();
rollback;
