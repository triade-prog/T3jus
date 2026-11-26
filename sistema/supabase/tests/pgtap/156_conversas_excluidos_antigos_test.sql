-- As conversas dos clientes excluídos antes da 1114 (a 1115; F3.157, PT-11, PA-05, PT-01): o
-- preenchimento conta por escritório, também no escritório só de consulta e com o mesmo número em
-- dois escritórios; deixa as marcas como estavam; não mexe em cliente ativo; rodar de novo não muda
-- nada.
begin;
select plan(14);

select ajustar_relogio(('2026-12-10 09:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Intrusa Souza') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select whatsapp_meta_ligou(rm, socia, '{"telefone":"+5511974052210","nomeExibicao":"Ribeiro & Matos","numeroId":"109876543210"}') from ids;
select whatsapp_meta_ligou(outro, intrusa, '{"telefone":"+5511974052299","nomeExibicao":"Outro","numeroId":"109876543299"}') from ids;

create function pg_temp.cli(p_pessoa uuid, p_esc uuid, p_nome text, p_tel text) returns uuid language sql as $$
  select (portal_cliente_cadastrar(p_pessoa, p_esc, jsonb_build_object('tipo', 'PF', 'origem', 'GOOGLE', 'nome', p_nome,
    'contatos', jsonb_build_array(jsonb_build_object('nome', p_nome, 'telefone', p_tel, 'principal', true)))) ->> 'id')::uuid
$$;
create function pg_temp.excluir(p_cliente uuid) returns jsonb language sql as $$
  select portal_cliente_excluir_dados(case when c.escritorio_id = ids.rm then ids.socia else ids.intrusa end, c.escritorio_id, p_cliente, c.versao,
    jsonb_build_object('pedidoEm', hoje_brasilia(), 'canal', 'TELEFONE', 'quemPediu', 'TITULAR', 'conferido', true, 'nomeConfirmado', c.nome))
    from clientes_escritorio c, ids where c.id = p_cliente
$$;

-- Ana no Ribeiro & Matos e Ana no outro escritório, com o mesmo número (revisão, m7); Davi ativo.
create temp table cli as select pg_temp.cli(socia, rm, 'Ana Lima Duarte', '+5511981000001') ana,
  pg_temp.cli(intrusa, outro, 'Ana Lima Duarte', '+5511981000001') ana2,
  pg_temp.cli(socia, rm, 'Davi Prado', '+5511981000004') davi from ids;
create temp table cv as select
  whatsapp_mensagem_recebida(rm, '+5511981000001', 'Ana', 'Oi, meu CPF é 123.456.789-09', '{"nome":"rg.jpg","tipo":"IMAGEM","bytes":"10"}') ana,
  whatsapp_mensagem_recebida(outro, '+5511981000001', 'Ana', 'Oi do outro escritório') ana2,
  whatsapp_mensagem_recebida(rm, '+5511981000004', 'Davi', 'Bom dia') davi from ids;
-- Na conversa de Ana: a IA passa (aviso no sino com o trecho), a sócia assume e escreve (fica na
-- fila), e a IA não soube uma pergunta.
select conversa_ia_passou(rm, cv.ana, 'PEDIU_PESSOA', 'Ana quer falar') from ids, cv;
select portal_conversa_assumir(socia, rm, cv.ana, (select versao from conversas where id = cv.ana)) from ids, cv;
select portal_conversa_enviar(socia, rm, cv.ana, '{"texto":"Ana, já vejo"}') from ids, cv;
select conversa_ia_nao_soube(rm, cv.ana, 'Quanto custa o divórcio da Ana?') from ids, cv;

create temp table antes as select
  (select count(*)::int from conversa_mensagens, cv where conversa_id = cv.ana) msgs_ana,
  (select count(*)::int from conversa_mensagens, cv where conversa_id = cv.ana2) msgs_ana2,
  (select count(*)::int from avisos_sino, cv where origem_tabela = 'conversas' and origem_id = cv.ana) avisos_ana,
  (select to_jsonb(c) from conversas c, cv where c.id = cv.davi) davi,
  (select jsonb_agg(to_jsonb(m) order by m.id) from conversa_mensagens m, cv where m.conversa_id = cv.davi) davi_msgs;

-- Ana e Ana2 são excluídas sem o gatilho (o caso de antes da 1114).
alter table clientes_escritorio disable trigger conversas_apagar_do_excluido;
select pg_temp.excluir(ana) from cli;
select pg_temp.excluir(ana2) from cli;
alter table clientes_escritorio enable trigger conversas_apagar_do_excluido;
select ok((select count(*) = 2 from conversas, cv where id in (cv.ana, cv.ana2) and telefone is not null and apagada_em is null),
  'sem o gatilho, as conversas ficam com o número e o texto (o caso de antes da 1114)');
-- O Ribeiro & Matos fica só para consulta (como no teste 150).
update escritorios set contrato_fim_em = hoje_brasilia() - 1 from ids where escritorios.id = ids.rm;

grant select on ids, cli, cv to dominio;
set local role dominio;
create temp table pre1 as select conversas_preencher_excluidos() j;
create temp table pre2 as select conversas_preencher_excluidos() j;
create temp table marcas as select coalesce(current_setting('t3jus.fim_da_guarda', true), '') fg, coalesce(current_setting('t3jus.aplicando_prazos', true), '') ap;
reset role;

select is((select j from pre1), jsonb_build_object(
    (select rm from ids)::text, jsonb_build_object('clientes', 1, 'conversas', 1, 'mensagens', (select msgs_ana from antes), 'naFila', 1, 'ficaram', 0,
                                                    'automacoes', 0, 'rotulos', 0, 'perguntas', 1, 'avisos', (select avisos_ana from antes)),
    (select outro from ids)::text, jsonb_build_object('clientes', 1, 'conversas', 1, 'mensagens', (select msgs_ana2 from antes), 'naFila', 0, 'ficaram', 0,
                                                    'automacoes', 0, 'rotulos', 0, 'perguntas', 0, 'avisos', 0)),
  'PT-11 F3.157: o preenchimento conta por escritório, também no escritório só de consulta');
select is((select j from pre2), '{}'::jsonb, 'PT-11 F3.157: rodar de novo não muda nada (idempotente)');
select ok((select fg in ('', 'off') and ap in ('', 'off') from marcas), 'PT-11 F3.157: as marcas da rotina voltam como estavam');
select ok((select bool_and(telefone is null and nome_contato is null and apagada_em is not null) from conversas, cv where id in (cv.ana, cv.ana2)),
  'PT-11 F3.157 m7: a conversa de cada Ana, em cada escritório, fica sem o número e o nome');
select ok(not exists (select 1 from conversa_mensagens m, cv where m.conversa_id in (cv.ana, cv.ana2)
                       and (m.apagada_em is null or m.texto <> mensagem_apagada_texto() or m.envio = 'NA_FILA')),
  'PT-11 F3.157: as mensagens ficam com o texto fixo e nenhuma na fila');
select is((select anexo from conversa_mensagens, cv where conversa_id = cv.ana and anexo is not null),
  '{"nome": "Arquivo apagado", "tipo": "IMAGEM", "bytes": "10"}'::jsonb, 'PT-11 F3.157: do anexo ficam o tipo e o tamanho');
select is((select count(*)::int from ia_perguntas_sem_resposta, cv where conversa_id = cv.ana), 0, 'PT-11 F3.157: a pergunta sem resposta sai');
select ok((select bool_and(dados ->> 'conversa' = 'Cliente excluído' and not dados ? 'trecho') from avisos_sino, cv
            where origem_tabela = 'conversas' and origem_id = cv.ana),
  'PT-11 F3.157: os avisos do sino da conversa ficam sem o nome e o trecho');
select is((select array_agg(e.dados order by e.escritorio_id) from historico e, cli where e.acao = 'cliente.conversas_apagadas'
            and e.entidade_id in (cli.ana::text, cli.ana2::text)) is not null
          and (select bool_and((e.dados ->> 'antes')::boolean) from historico e where e.acao = 'cliente.conversas_apagadas'),
  true, 'PT-11 F3.157: cada cliente tem o evento, marcado como de antes');
select is((select count(*)::int from historico e, cli where e.acao = 'cliente.conversas_apagadas' and e.entidade_id in (cli.ana::text, cli.ana2::text)),
  2, 'PT-11 F3.157: um evento por cliente, mesmo rodando duas vezes');
select is((select to_jsonb(c) from conversas c, cv where c.id = cv.davi), (select davi from antes),
  'PT-01 F3.157: a conversa de Davi, ativo, não muda');
select is((select jsonb_agg(to_jsonb(m) order by m.id) from conversa_mensagens m, cv where m.conversa_id = cv.davi), (select davi_msgs from antes),
  'PT-01 F3.157: nem as mensagens dela');
select ok(not has_function_privilege('service_role', 'conversas_preencher_excluidos()', 'execute')
          and not has_function_privilege('service_role', 'conversas_apagar(uuid,uuid,text[],text)', 'execute'),
  'PT-02 F3.157: a API não chama o preenchimento nem o apagar');

select * from finish();
rollback;
