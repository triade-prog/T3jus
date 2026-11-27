-- O serviço da proposta do cliente excluído a pedido do titular (1090 e 1091; F3.159, PT-11, PT-03,
-- PT-07): na exclusão, o serviço vira o texto fixo no mesmo UPDATE do escopo (a versão sobe uma vez
-- só) e a fila da 0970 cobre a série até a versão final; as leituras trazem o texto fixo; a edição
-- não devolve o serviço; os clientes excluídos antes da 1090 entram pela função da 1091, que reabre o
-- Word da última versão de antes da troca.
begin;
select plan(40);

select ajustar_relogio(('2026-11-24 10:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Intrusa Souza') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;

create function pg_temp.cli(p_pessoa uuid, p_esc uuid, p_nome text) returns uuid language sql as $$
  select (portal_cliente_cadastrar(p_pessoa, p_esc, jsonb_build_object('tipo', 'PF', 'origem', 'GOOGLE', 'nome', p_nome,
    'contatos', jsonb_build_array(jsonb_build_object('nome', 'Contato', 'telefone', '+5511984723316', 'principal', true)))) ->> 'id')::uuid
$$;
create temp table cli as select
  pg_temp.cli(socia, rm, 'Helena Prado Souza') hel,
  pg_temp.cli(socia, rm, 'Ana Lima Duarte') ana,
  pg_temp.cli(socia, rm, 'Antônia Ferreira') ant,
  pg_temp.cli(socia, rm, 'Vera Lúcia Campos') vera,
  pg_temp.cli(intrusa, outro, 'Joana Pereira') joa,
  pg_temp.cli(intrusa, outro, 'Jorge Antigo') jorge
  from ids;

create function pg_temp.proposta(p_pessoa uuid, p_esc uuid, p_cliente uuid, p_servico text, p_rascunho boolean default false) returns uuid
language sql as $$
  select (portal_proposta_criar(p_pessoa, p_esc, jsonb_build_object('clienteId', p_cliente, 'servico', p_servico,
    'escopo', case when p_rascunho then '' else 'Ação e acompanhamento.' end, 'responsavelId', p_pessoa, 'rascunho', p_rascunho,
    'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'MENSAL', 'valor', 50000, 'primeiro', '2026-12-05', 'meses', 6)),
    'retorno', jsonb_build_object('em', '2026-11-30', 'responsavelId', p_pessoa))) ->> 'id')::uuid
$$;
-- Helena: uma proposta com escopo (que passa pela versão 3) e um rascunho sem escopo.
create temp table pr as select
  pg_temp.proposta(ids.socia, ids.rm, cli.hel, 'Divórcio de Helena Prado') hel,
  pg_temp.proposta(ids.socia, ids.rm, cli.hel, 'Inventário do pai de Helena', true) hel_sem,
  pg_temp.proposta(ids.socia, ids.rm, cli.ana, 'Revisão do contrato de Ana Lima') ana,
  pg_temp.proposta(ids.socia, ids.rm, cli.ant, 'Aposentadoria de Antônia') ant,
  pg_temp.proposta(ids.socia, ids.rm, cli.vera, 'Guarda dos filhos de Vera') vera,
  pg_temp.proposta(ids.intrusa, ids.outro, cli.joa, 'Pensão de Joana Pereira') joa,
  pg_temp.proposta(ids.intrusa, ids.outro, cli.jorge, 'Despejo de Jorge Antigo') jorge
  from ids, cli;
update propostas set servico = 'Divórcio de Helena Prado Souza' where id = (select hel from pr);
update propostas set servico = 'Divórcio consensual de Helena Prado Souza' where id = (select hel from pr);
-- Ana aceita e pede o contrato (a proposta aceita, sem contrato, ainda é de cliente excluível).
select portal_proposta_enviada(socia, rm, pr.ana, 1) from ids, pr;
select portal_proposta_resposta(socia, rm, pr.ana, 2, jsonb_build_object('resposta', 'ACEITOU', 'em', '2026-11-24', 'canal', 'PRESENCIAL')) from ids, pr;
select portal_proposta_pedir_contrato(socia, rm, pr.ana) from ids, pr;

create temp table antes as select id, servico, escopo, versao from propostas;

create function pg_temp.excluir(p_pessoa uuid, p_esc uuid, p_cliente uuid, p_nome text) returns jsonb language sql as $$
  select portal_cliente_excluir_dados(p_pessoa, p_esc, p_cliente, c.versao, jsonb_build_object('pedidoEm', hoje_brasilia(), 'canal', 'TELEFONE',
    'quemPediu', 'TITULAR', 'conferido', true, 'nomeConfirmado', p_nome)) from clientes_escritorio c where c.id = p_cliente
$$;

-- 1. O texto fixo.
select is(servico_apagado_texto(), 'Serviço apagado a pedido do titular', 'PT-11 F3.159: o texto fixo do serviço apagado');
select is(length(servico_apagado_texto()), 35, 'PT-11 F3.159: o texto tem 35 letras e cabe no check de 2 a 160');
select is((select provolatile from pg_proc where proname = 'servico_apagado_texto'), 'i', 'PT-11 F3.159: a função do texto é imutável');

-- 2. A exclusão de Helena e a de Ana.
select pg_temp.excluir(socia, rm, cli.hel, 'Helena Prado Souza') from ids, cli;
select pg_temp.excluir(socia, rm, cli.ana, 'Ana Lima Duarte') from ids, cli;
select ok((select bool_and(p.servico = servico_apagado_texto() and p.escopo is null) from propostas p, pr where p.id in (pr.hel, pr.hel_sem, pr.ana)),
  'PT-11 F3.159: na exclusão, toda proposta do cliente fica com o texto fixo e sem escopo');
select is((select p.versao - a.versao from propostas p join antes a using (id), pr where p.id = pr.hel), 1,
  'PT-11 F3.159: a proposta com escopo sobe exatamente uma versão (serviço e escopo no mesmo UPDATE)');
select is((select p.versao - a.versao from propostas p join antes a using (id), pr where p.id = pr.hel_sem), 1,
  'PT-11 F3.159: a proposta sem escopo também sobe uma versão');
select is((select p.versao from propostas p, pr where p.id = pr.hel), 4, 'PT-11 F3.159: a de Helena termina na versão 4');

-- 3. A fila tem a série até a versão final, a mesma regra da 0970.
select is((select array_agg(caminho order by caminho) from arquivos_apagar, cli where cliente_id = cli.hel),
  (select array_agg(c order by c) from (
     select ids.rm::text || '/propostas/' || p.id::text || '-v' || n::text || '.docx' c
       from ids, propostas p, cli cross join lateral generate_series(1, p.versao) n where p.cliente_id = cli.hel) s),
  'PT-11 F3.159: a fila tem cada .docx de 1 até a versão final de cada proposta');
select ok((select bool_and(concluido_em is null and conferir_ate = app_now() + interval '15 minutes') from arquivos_apagar, cli where cliente_id = cli.hel),
  'PT-07 F3.159: os .docx esperam 15 minutos, como na 0970');

-- 4. O resto fica intacto.
select ok((select bool_and(p.servico = a.servico and p.escopo is not distinct from a.escopo and p.versao = a.versao)
             from propostas p join antes a using (id), pr where p.id in (pr.ant, pr.vera, pr.joa, pr.jorge)),
  'PT-11 F3.159: as propostas de outro cliente e de outro escritório não mudam');
select is((select count(*)::int from historico where dados::text like '%Divórcio%' or dados::text like '%Ana Lima%'), 0,
  'PT-03 F3.159: a exclusão não leva o serviço para o histórico');

-- 5. As leituras trazem o texto fixo.
select is((select proposta_linha(p) ->> 'servico' from propostas p, pr where p.id = pr.hel), servico_apagado_texto(),
  'PT-11 F3.159: a linha da lista do Comercial traz o texto fixo');
select is((select portal_proposta(socia, rm, pr.hel) ->> 'servico' from ids, pr), servico_apagado_texto(),
  'PT-11 F3.159: a ficha da proposta traz o texto fixo');
select ok((select portal_proposta(socia, rm, pr.hel) -> 'escopo' = 'null'::jsonb from ids, pr), 'PT-11 F3.159: a ficha vem sem o escopo');
-- Desde a F3.181 (1140), o pedido do cliente excluído sai do bloco de Contratos; a proposta fica.
select is((select count(*)::int from ids, pr, jsonb_array_elements(portal_contratos_pedidos(socia, rm)) x where (x -> 'proposta' ->> 'id')::uuid = pr.ana),
  0, 'PT-11 F3.159 F3.181: o pedido de contrato do cliente excluído sai de Contratos');
select is((select count(*)::int from propostas p, pr where p.id = pr.ana and p.estado = 'ACEITA' and p.contrato_pedido_em is not null), 1,
  'PT-11 F3.159: a proposta aceita continua aceita e com o pedido (o UPDATE não mexe no estado)');

-- 6. A edição não devolve o serviço.
-- Desde a F3.204 (1145), a recusa vem antes dos campos, com o código CLIENTE_EXCLUIDO.
select is((select (teste.erro(format($$ select portal_proposta_editar(%L, %L, %L, %s, %L) $$, ids.socia, ids.rm, pr.hel_sem, p.versao,
             jsonb_build_object('servico', 'Inventário do pai de Helena', 'rascunho', true, 'responsavelId', ids.socia)))) -> 'detalhe' ->> 'motivo'
             from ids, pr, propostas p where p.id = pr.hel_sem), 'CLIENTE_EXCLUIDO',
  'PT-11 F3.159 F3.204: editar a proposta do cliente excluído é recusado (CLIENTE_EXCLUIDO)');
select is((select servico from propostas, pr where id = pr.hel_sem), servico_apagado_texto(), 'PT-11 F3.159: o serviço não volta pela edição');

-- 7. Os clientes excluídos antes da 1090 (a 1091).
-- (a) Vera é excluída agora e a fila dela conclui; depois o serviço livre é posto de volta sem subir
--     a versão (controle_versao desligado só aqui; revisão, m7), como se ela tivesse sido excluída
--     antes da 1090: a linha da versão final está concluída e a reabertura é exercitada.
select pg_temp.excluir(socia, rm, cli.vera, 'Vera Lúcia Campos') from ids, cli;
select ajustar_relogio(('2026-11-24 10:20-03'::timestamptz - now()));
select rotina_arquivos_apagar_registrar(array(select id from arquivos_apagar, cli where cliente_id = cli.vera));
select is((select count(*)::int from arquivos_apagar, cli where cliente_id = cli.vera and concluido_em is null), 0, 'a fila de Vera concluiu');
alter table propostas disable trigger controle_versao;
update propostas set servico = 'Guarda dos filhos de Vera Lúcia', escopo = 'Ação de guarda.' where id = (select vera from pr);
alter table propostas enable trigger controle_versao;
create temp table vera_antes as select p.versao, p.escritorio_id::text || '/propostas/' || p.id::text || '-v' || p.versao::text || '.docx' caminho
  from propostas p, pr where p.id = pr.vera;
create temp table fila_vera as select id, caminho, concluido_em, tentativas, conferir_ate from arquivos_apagar, cli where cliente_id = cli.vera;
-- (b) Jorge (outro escritório) é excluído sem os gatilhos, como antes da 0970: sem fila e com o serviço livre.
alter table clientes_escritorio disable trigger comercial_apagar_do_excluido;
alter table clientes_escritorio disable trigger z_cliente_excluido_arquivos;
select pg_temp.excluir(intrusa, outro, cli.jorge, 'Jorge Antigo') from ids, cli;
alter table clientes_escritorio enable trigger comercial_apagar_do_excluido;
alter table clientes_escritorio enable trigger z_cliente_excluido_arquivos;
create temp table jorge_antes as select p.versao, p.escritorio_id::text || '/propostas/' || p.id::text || '-v' || p.versao::text || '.docx' caminho
  from propostas p, pr where p.id = pr.jorge;
select is((select servico from propostas, pr where id = pr.jorge), 'Despejo de Jorge Antigo', 'sem o gatilho, o serviço fica (o caso de antes da 1090)');

select ajustar_relogio(('2026-11-24 11:00-03'::timestamptz - now()));
grant select on ids, cli, pr to dominio;
set local role dominio;
create temp table pre1 as select propostas_servico_preencher_excluidos() j;
create temp table pre2 as select propostas_servico_preencher_excluidos() j;
create temp table marcas as select coalesce(current_setting('t3jus.fim_da_guarda', true), '') fg, coalesce(current_setting('t3jus.aplicando_prazos', true), '') ap;
reset role;
select is((select j from pre1), jsonb_build_object(
    (select rm from ids)::text, '{"propostas": 1, "docxReabertos": 1}'::jsonb,
    (select outro from ids)::text, '{"propostas": 1, "docxReabertos": 1}'::jsonb),
  'PT-11 F3.159: o preenchimento conta por escritório as propostas trocadas e os .docx reabertos');
select is((select j from pre2), '{}'::jsonb, 'PT-11 F3.159: rodar de novo não muda nada (idempotente)');
select ok((select fg in ('', 'off') and ap in ('', 'off') from marcas), 'PT-11 F3.159: as marcas da rotina voltam como estavam');
select ok((select bool_and(servico = servico_apagado_texto() and escopo is null) from propostas, pr where id in (pr.vera, pr.jorge)),
  'PT-11 F3.159: o serviço de Vera e o de Jorge viram o texto fixo, sem escopo');
select is((select p.versao from propostas p, pr where p.id = pr.vera), (select versao + 1 from vera_antes), 'PT-11 F3.159: a troca sobe uma versão');
select ok((select concluido_em is null and tentativas = 0 and ultimo_erro is null and conferir_ate = '2026-11-24 11:15-03'::timestamptz
             from arquivos_apagar a, vera_antes v where a.caminho = v.caminho),
  'PT-07 F3.159: o Word da versão de antes volta à fila, pendente, e espera 15 minutos');
select is((select count(*)::int from arquivos_apagar a join fila_vera f using (id), vera_antes v
            where a.caminho <> v.caminho and a.concluido_em = f.concluido_em and a.tentativas = f.tentativas),
  (select count(*)::int - 1 from fila_vera), 'PT-07 F3.159: as outras linhas da fila de Vera não mudam');
select is((select count(*)::int from arquivos_apagar, cli where cliente_id = cli.vera), (select count(*)::int from fila_vera),
  'PT-07 F3.159: a reabertura não duplica a fila');
select ok((select a.concluido_em is null and a.escritorio = ids.outro and a.motivo = 'EXCLUSAO_TITULAR' and a.cliente_id = cli.jorge
                  and a.conferir_ate = '2026-11-24 11:15-03'::timestamptz
             from arquivos_apagar a, jorge_antes j, ids, cli where a.caminho = j.caminho),
  'PT-07 F3.159: sem linha na fila (antes da 0970 e da 0971), o Word da versão de antes entra');
select is((select count(*)::int from arquivos_apagar, cli where cliente_id = cli.jorge), 1, 'PT-07 F3.159: só esse caminho entra pelo preenchimento');
select ok((select bool_and(p.servico = a.servico and p.versao = a.versao) from propostas p join antes a using (id), pr where p.id in (pr.ant, pr.joa)),
  'PT-11 F3.159: o preenchimento não mexe na proposta de cliente ativo');
select is((select p.versao from propostas p, pr where p.id = pr.hel), 4, 'PT-11 F3.159: nem na que já tinha o texto fixo');
select is((select count(*)::int from arquivos_apagar, cli where cliente_id = cli.hel and concluido_em is null),
  (select sum(versao)::int from propostas, cli where cliente_id = cli.hel), 'PT-07 F3.159: a fila que ainda espera fica como está');

-- 8. A linha reaberta conclui e o evento sai de novo, sem dado pessoal.
select ajustar_relogio(('2026-11-24 11:16-03'::timestamptz - now()));
select is(rotina_arquivos_apagar_registrar(array(select a.id from arquivos_apagar a, vera_antes v where a.caminho = v.caminho)), 1,
  'PT-07 F3.159: passados os 15 minutos, a linha reaberta conclui');
select is((select count(*)::int from historico, cli where acao = 'cliente.arquivos_apagados' and entidade_id = cli.vera::text), 2,
  'PT-03 F3.159: o cliente.arquivos_apagados de Vera sai de novo (a limpeza do Word gerado depois da exclusão)');
select ok((select bool_and(not historico_tem_dado_proibido(dados) and dados::text not like '%Vera%')
             from historico, cli where acao = 'cliente.arquivos_apagados' and entidade_id = cli.vera::text),
  'PT-03 F3.159: sem dado pessoal');

-- 9. Inventário (PT-11).
select ok((select no_fim like '%o serviço vira um texto fixo%' and no_fim like '%.docx gerados%' and situacao = 'APROVADO'
             from inventario_dados where tabela = 'propostas'),
  'PT-11 F3.159 inventário: propostas citam o serviço e os .docx');
select ok((select length(no_fim) <= 200 from inventario_dados where tabela = 'propostas'), 'PT-11 F3.159 inventário: o texto cabe em 200 letras');

-- 10. Nada do serviço no histórico.
select is((select count(*)::int from historico where dados::text ~ '(Divórcio|Guarda dos filhos|Despejo de Jorge|Ana Lima)'), 0,
  'PT-03 F3.159: nenhuma linha do histórico guarda o serviço antigo');

-- 11. Acesso: a função do preenchimento não fica exposta pela API.
select ok(not has_function_privilege('service_role', 'propostas_servico_preencher_excluidos()', 'execute'),
  'PT-02 F3.159: a API não chama o preenchimento');

select * from finish();
rollback;
