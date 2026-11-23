-- Arquivos do cliente excluído a pedido do titular (0970 e 0971; F3.141, PT-11, PT-07, PT-03, PT-15):
-- na mesma transação da exclusão, todo documento do cliente (pessoais, substituídos, ENVIANDO e o
-- termo de curatela) perde o nome do arquivo, a descrição e a data do papel, e o arquivo e os .docx
-- das propostas entram na fila arquivos_apagar; a guarda só aceita isso para cliente EXCLUIDO; as
-- leituras recusam o apagado; a rotina conclui a fila respeitando o envio atrasado; os clientes
-- excluídos antes da 0970 entram pela função da 0971.
begin;
select plan(74);

select ajustar_relogio(('2026-11-23 07:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Intrusa Souza') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;

create function pg_temp.cli(p_pessoa uuid, p_esc uuid, p jsonb) returns uuid language sql as $$
  select (portal_cliente_cadastrar(p_pessoa, p_esc,
    '{"tipo": "PF", "origem": "GOOGLE", "contatos": [{"nome": "Contato", "telefone": "+5511984723316", "principal": true}]}'::jsonb || p) ->> 'id')::uuid
$$;
create temp table cli as select
  pg_temp.cli(socia, rm, '{"nome": "Helena Prado Souza", "capacidade": "CURATELA", "rl_papel": "CURADORA", "rl_nome": "Clara Prado Souza",
                           "cur_processo": "1004587-22.2025.8.26.0100"}') hel,
  pg_temp.cli(socia, rm, '{"nome": "Antônia Ferreira"}') ant,
  pg_temp.cli(socia, rm, '{"nome": "Rui Teixeira"}') rui,
  pg_temp.cli(socia, rm, '{"nome": "Vera Lúcia Campos"}') vera,
  pg_temp.cli(socia, rm, '{"nome": "Ivo Arquivado"}') ivo,
  pg_temp.cli(intrusa, outro, '{"nome": "Joana Pereira"}') joa,
  pg_temp.cli(intrusa, outro, '{"nome": "Jorge Antigo"}') jorge
  from ids;

-- Anexa (iniciar e concluir) e devolve o id do documento.
create function pg_temp.anexar(p_pessoa uuid, p_esc uuid, p_cliente uuid, p_dados jsonb, p_concluir boolean default true) returns uuid
language plpgsql as $$
declare v uuid := portal_cliente_documento_iniciar(p_pessoa, p_esc, p_cliente,
  jsonb_build_object('arquivoTipo', 'application/pdf', 'tamanho', 1000) || p_dados);
begin
  if p_concluir then perform portal_cliente_documento_concluir(p_pessoa, p_esc, v); end if;
  return v;
end $$;

-- Às 7h, o RG de Helena (depois substituído).
create temp table d0 as select pg_temp.anexar(socia, rm, cli.hel, '{"tipo": "RG_CPF", "nome": "RG Helena Prado.pdf"}') rg_velho from ids, cli;
-- Às 10h, o resto.
select ajustar_relogio(('2026-11-23 10:00-03'::timestamptz - now()));
create temp table d as select d0.rg_velho,
  pg_temp.anexar(socia, rm, cli.hel, '{"tipo": "RG_CPF", "nome": "RG Helena Prado novo.pdf"}') rg,
  pg_temp.anexar(socia, rm, cli.hel, '{"tipo": "OUTRO", "descricao": "Certidão de óbito de João Prado", "nome": "obito joao.pdf"}') outro_doc,
  pg_temp.anexar(socia, rm, cli.hel, '{"tipo": "COMPROVANTE_RESIDENCIA", "dataDocumento": "2026-11-01", "nome": "conta de luz.pdf"}') comp,
  pg_temp.anexar(socia, rm, cli.hel, '{"tipo": "CNH", "nome": "CNH Helena.pdf"}', false) enviando,
  pg_temp.anexar(socia, rm, cli.ant, '{"tipo": "RG_CPF", "nome": "RG Antonia.pdf"}') rg_ant,
  pg_temp.anexar(socia, rm, cli.rui, '{"tipo": "RG_CPF", "nome": "RG Rui.pdf"}') rg_rui,
  pg_temp.anexar(socia, rm, cli.vera, '{"tipo": "RG_CPF", "nome": "RG Vera.pdf"}') rg_vera,
  pg_temp.anexar(socia, rm, cli.vera, '{"tipo": "CNH", "nome": "CNH Vera.pdf"}', false) env_vera,
  pg_temp.anexar(socia, rm, cli.ivo, '{"tipo": "RG_CPF", "nome": "RG Ivo.pdf"}') rg_ivo,
  pg_temp.anexar(intrusa, outro, cli.joa, '{"tipo": "RG_CPF", "nome": "RG Joana.pdf"}') rg_joa,
  pg_temp.anexar(intrusa, outro, cli.jorge, '{"tipo": "RG_CPF", "nome": "RG Jorge.pdf"}') rg_jorge
  from ids, cli, d0;
create temp table t as select portal_cliente_termo_iniciar(socia, rm, cli.hel, '{"nome": "termo curatela Helena.pdf", "arquivoTipo": "application/pdf", "tamanho": 5000}') termo
  from ids, cli;
select portal_cliente_documento_concluir(socia, rm, t.termo) from ids, t;

-- Propostas: a de Helena passa pela versão 3 antes da exclusão; a de Antônia e a de Vera ficam.
create function pg_temp.proposta(p_cliente uuid) returns uuid language sql as $$
  select (portal_proposta_criar(ids.socia, ids.rm, jsonb_build_object('clienteId', p_cliente, 'servico', 'Curatela',
    'escopo', 'Ação e acompanhamento.', 'responsavelId', ids.socia,
    'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'MENSAL', 'valor', 50000, 'primeiro', '2026-12-05', 'meses', 6)),
    'retorno', jsonb_build_object('em', '2026-11-30', 'responsavelId', ids.socia))) ->> 'id')::uuid
  from ids
$$;
create temp table pr as select pg_temp.proposta(cli.hel) hel, pg_temp.proposta(cli.ant) ant, pg_temp.proposta(cli.vera) vera from cli;
update propostas set servico = 'Curatela e interdição' where id = (select hel from pr);
update propostas set servico = 'Curatela e interdição.' where id = (select hel from pr);

create function pg_temp.excluir(p_cliente uuid, p_nome text) returns jsonb language sql as $$
  select portal_cliente_excluir_dados(ids.socia, ids.rm, p_cliente, c.versao, jsonb_build_object('pedidoEm', hoje_brasilia(), 'canal', 'TELEFONE',
    'quemPediu', 'TITULAR', 'conferido', true, 'nomeConfirmado', p_nome)) from ids, clientes_escritorio c where c.id = p_cliente
$$;

-- Gatilho novo e trava (revisão, B1).
select ok(exists (select 1 from pg_trigger where tgname = 'z_cliente_excluido_arquivos' and tgrelid = 'clientes_escritorio'::regclass),
  'PT-11: o gatilho da exclusão existe em clientes_escritorio');
select ok((select relrowsecurity and relforcerowsecurity from pg_class where relname = 'arquivos_apagar'), 'PT-01: a fila tem RLS forçado (global)');
select ok(exists (select 1 from tabelas_sem_escritorio where tabela = 'arquivos_apagar'), 'PT-01: a fila diz por que não tem escritorio_id');

-- 4. Atomicidade: exclusão recusada ou desfeita não deixa nada na fila.
select is((teste.erro($$ select pg_temp.excluir(cli.rui, 'Nome Errado') from cli $$)) ->> 'codigo', 'TC422',
  'PT-11: exclusão com o nome que não confere é recusada');
select is((teste.erro($$ do $x$ begin
    perform definir_transicao('EXCLUIU', null, true);
    update clientes_escritorio set estado = 'EXCLUIDO', excluido_em = app_now(), contatos = '[]' where id = (select rui from cli);
    raise exception 'falhou depois da exclusão' using errcode = 'TC500';
  end $x$ $$)) ->> 'codigo', 'TC500', 'PT-11: uma falha depois do gatilho desfaz a exclusão');
select is((select count(*)::int from arquivos_apagar, cli where cliente_id = cli.rui), 0, 'PT-11 atomicidade: a fila fica vazia');
select is((select nome from cliente_documentos, d where id = d.rg_rui), 'RG Rui.pdf', 'PT-11 atomicidade: o documento continua com o nome');

-- A exclusão de Helena, às 10h30.
select ajustar_relogio(('2026-11-23 10:30-03'::timestamptz - now()));
create temp table ex as select pg_temp.excluir(cli.hel, 'Helena Prado Souza') r from cli;
select ok((select r ->> 'protocolo' like 'EXC-2026-%' from ex), 'PT-11: a exclusão sai normalmente');

-- 1. Todos os documentos de Helena saem, de qualquer tipo e situação.
create temp table docs_hel as select x.* from cliente_documentos x, cli where x.cliente_id = cli.hel;
select is((select count(*)::int from docs_hel), 6, 'PT-11: Helena tinha 6 documentos (RG, RG substituído, outro, comprovante, enviando e termo)');
select is((select count(*)::int from docs_hel where apagado_em = app_now() and nome is null and descricao is null and data_documento is null), 6,
  'PT-11: todos ficam com apagado_em e sem nome, descrição e data do papel');
select is((select array_agg(tipo || ':' || situacao order by tipo, situacao) from docs_hel),
  array['CNH:ENVIANDO', 'COMPROVANTE_RESIDENCIA:PRONTO', 'OUTRO:PRONTO', 'RG_CPF:PRONTO', 'RG_CPF:PRONTO', 'TERMO_CURATELA:PRONTO'],
  'PT-11: ficam o tipo e a situação (a prova mínima de que existiram)');
select ok((select substituido_por = d.rg and tamanho = 1000 and concluido_em is not null from docs_hel, d where docs_hel.id = d.rg_velho),
  'PT-11: o substituído continua apontando para o novo, com o tamanho e as datas');

-- 2. A fila: exatamente os caminhos de Helena.
select is((select array_agg(caminho order by caminho) from arquivos_apagar, cli where cliente_id = cli.hel),
  (select array_agg(c order by c) from (
     select ids.rm::text || '/' || x.id::text c from docs_hel x, ids
     union all select ids.rm::text || '/propostas/' || pr.hel::text || '-v' || n::text || '.docx' from ids, pr,
       generate_series(1, (select versao from propostas where id = pr.hel)) n) s),
  'PT-11: a fila tem cada documento e cada .docx que pode existir da proposta');
select is((select versao from propostas, pr where id = pr.hel), 4, 'PT-11: a série vai até a versão final (o escopo limpo sobe a versão)');
select ok((select bool_and(bucket = 'documentos-portal' and motivo = 'EXCLUSAO_TITULAR' and escritorio = ids.rm and concluido_em is null and tentativas = 0)
             from arquivos_apagar, ids, cli where cliente_id = cli.hel), 'PT-11: tudo no documentos-portal, do próprio escritório, pendente');
select is((select count(*)::int from arquivos_apagar, cli where cliente_id <> cli.hel), 0, 'PT-11: nada de outro cliente entra na fila');
select ok((select bool_and(nome is not null and apagado_em is null) from cliente_documentos, d where id in (d.rg_ant, d.rg_rui, d.rg_joa, d.rg_vera)),
  'PT-11: os documentos de outro cliente e de outro escritório ficam intactos');

-- 3. A espera do envio atrasado (revisão, I1 e M2).
select is((select conferir_ate from arquivos_apagar, d, ids where caminho = ids.rm::text || '/' || d.rg_velho::text), app_now(),
  'PT-07: o documento criado há mais de 2 h 10 min não espera');
select is((select array_agg(distinct conferir_ate) from arquivos_apagar, cli, d where cliente_id = cli.hel and caminho !~ '/propostas/' and caminho !~ d.rg_velho::text),
  array['2026-11-23 12:10-03'::timestamptz], 'PT-07: os outros esperam até 2 h 10 min depois de criados (o endereço de envio vale 2 h)');
select is((select array_agg(distinct conferir_ate) from arquivos_apagar, cli where cliente_id = cli.hel and caminho ~ '/propostas/'),
  array['2026-11-23 10:45-03'::timestamptz], 'PT-07: os .docx esperam 15 minutos');

-- O registro na hora (revisão, M4).
select is((select dados from historico, cli where acao = 'cliente.arquivos_na_fila' and entidade_id = cli.hel::text),
  '{"documentos": 6, "propostas": 1}'::jsonb, 'PT-03: a exclusão registra na hora quantos arquivos foram para a fila');
select ok((select entidade = 'cliente' and not interno and autor_tipo = 'PESSOA' and not historico_tem_dado_proibido(dados)
             from historico, cli where acao = 'cliente.arquivos_na_fila' and entidade_id = cli.hel::text),
  'PT-03: no histórico do cliente, com a autora e sem dado pessoal');

-- 5. A guarda (revisão, I5).
select is((teste.erro($$ update cliente_documentos set nome = 'outro.pdf' where id = (select rg_ant from d) $$)) ->> 'codigo', 'TC023',
  'PT-03: o nome de documento de cliente ativo não muda');
select is((teste.erro($$ delete from cliente_documentos where id = (select rg_ant from d) $$)) ->> 'codigo', 'TC023', 'PT-03: documento não se apaga');
select is((teste.erro($$ update cliente_documentos set apagado_em = app_now(), nome = null where id = (select rg_ant from d) $$)) ->> 'codigo', 'TC023',
  'PT-11: cliente ativo não tem documento apagado');
-- Vera é excluída sem o gatilho, como um cliente excluído antes da 0970.
alter table clientes_escritorio disable trigger z_cliente_excluido_arquivos;
select pg_temp.excluir(cli.vera, 'Vera Lúcia Campos') from cli;
select definir_transicao('EXCLUIU', null, true);
update clientes_escritorio set estado = 'EXCLUIDO', excluido_em = app_now(), nome = 'Cliente excluído', contatos = '[]'
 where id = (select jorge from cli);
alter table clientes_escritorio enable trigger z_cliente_excluido_arquivos;
select is((select count(*)::int from arquivos_apagar, cli where cliente_id in (cli.vera, cli.jorge)), 0, 'sem o gatilho, nada entra na fila (o caso de antes da 0970)');
select is((teste.erro($$ update cliente_documentos set apagado_em = app_now() where id = (select rg_vera from d) $$)) ->> 'codigo', 'TC023',
  'PT-11: apagar mantendo o nome é recusado');
select is((teste.erro($$ update cliente_documentos set apagado_em = app_now(), nome = null, situacao = 'PRONTO', concluido_em = app_now()
                         where id = (select env_vera from d) $$)) ->> 'codigo', 'TC023', 'PT-11: apagar e concluir no mesmo UPDATE é recusado');
select is((teste.erro($$ update cliente_documentos set apagado_em = app_now(), nome = null, substituido_por = (select rg_ant from d)
                         where id = (select rg_vera from d) $$)) ->> 'codigo', 'TC023', 'PT-11: apagar e mudar o substituto é recusado');
select is((teste.erro($$ update cliente_documentos set apagado_em = app_now() + interval '1 day', nome = null where id = (select rg_vera from d) $$)) ->> 'codigo',
  'TC023', 'PT-11: apagado_em no futuro é recusado');
select is((teste.erro($$ update cliente_documentos set apagado_em = null, nome = 'volta.pdf' where id = (select rg from d) $$)) ->> 'codigo', 'TC023',
  'PT-03: documento apagado não volta');
select is((teste.erro($$ update cliente_documentos set tamanho = 2 where id = (select rg from d) $$)) ->> 'codigo', 'TC023',
  'PT-03: documento apagado não muda mais');
select is((teste.erro($$ select portal_cliente_documento_concluir(socia, rm, d.enviando) from ids, d $$)) ->> 'codigo', 'TC023',
  'PT-07: o envio atrasado do documento apagado não conclui');
-- Ivo é arquivado (o pedido do titular com contrato ou processo; aqui direto na tabela).
select definir_transicao('ARQUIVOU', null, true);
update clientes_escritorio set estado = 'ARQUIVADO', arquivado_em = app_now() where id = (select ivo from cli);
select is((teste.erro($$ update cliente_documentos set apagado_em = app_now(), nome = null where id = (select rg_ivo from d) $$)) ->> 'codigo', 'TC023',
  'PT-11: cliente arquivado (com contrato ou processo) não tem documento apagado');

-- Documento nasce só de cliente não excluído (revisão, B1).
select is((teste.erro($$ insert into cliente_documentos (escritorio_id, cliente_id, tipo, nome, arquivo_tipo, tamanho, enviado_por)
                         select rm, cli.hel, 'RG_CPF', 'rg.pdf', 'application/pdf', 10, socia from ids, cli $$)) ->> 'codigo', 'TC404',
  'PT-11: documento novo de cliente excluído é recusado, mesmo direto na tabela');
select is((teste.erro($$ insert into cliente_documentos (escritorio_id, cliente_id, tipo, nome, arquivo_tipo, tamanho, enviado_por, apagado_em)
                         select rm, cli.ant, 'RG_CPF', 'rg.pdf', 'application/pdf', 10, socia, app_now() from ids, cli $$)) ->> 'codigo', 'TC023',
  'PT-11: documento não nasce apagado');

-- 6. As leituras.
select is((teste.erro($$ select portal_cliente_documento_abrir(socia, rm, d.rg) from ids, d $$)) ->> 'codigo', 'TC404',
  'PT-07: abrir documento apagado dá 404');
select is((teste.erro($$ select portal_cliente_documento_abrir(socia, rm, d.rg_vera) from ids, d $$)) ->> 'codigo', 'TC404',
  'PT-07: abrir pelo id um documento de cliente excluído dá 404 (a lacuna da 0853)');
select is((teste.erro($$ select portal_cliente_documento_para_concluir(socia, rm, d.enviando) from ids, d $$)) ->> 'codigo', 'TC404',
  'PT-07: o envio atrasado do documento apagado recebe 404 antes de concluir');
select is((select portal_cliente_documento_abrir(socia, rm, d.rg_ant) from ids, d), 'RG Antonia.pdf', 'PT-07: o documento de cliente ativo continua abrindo');
select is((select count(*)::int from ids, cli, cliente_documentos_em_uso(ids.rm, cli.hel)), 0, 'PT-11: nenhum documento apagado fica em uso');
select ok((select (cliente_termo_em_uso(ids.rm, cli.hel)).id is null from ids, cli), 'PT-11: o termo apagado não fica em uso');

-- 7. Exportação (PT-15): a linha sai sem o nome; a fila não sai.
create temp table exp as select exportar_escritorio(socia, rm) j from ids;
select ok((select bool_and(x ->> 'nome' is null and x ->> 'apagado_em' is not null and x ->> 'descricao' is null)
             from exp, jsonb_array_elements(j -> 'tabelas' -> 'cliente_documentos') x, cli where (x ->> 'cliente_id')::uuid = cli.hel),
  'PT-15: a exportação traz o documento apagado sem o nome');
select ok((select not (j -> 'tabelas' ? 'arquivos_apagar') from exp), 'PT-15: a fila não sai na exportação');

-- 10. O caminho só entra dentro da pasta do escritório e nos dois formatos.
select throws_ok($$ insert into arquivos_apagar (escritorio, bucket, caminho, cliente_id) select rm, 'documentos-portal', outro::text || '/' || gen_random_uuid()::text, gen_random_uuid() from ids $$,
  '23514', null, 'PT-11: caminho de outro escritório é recusado');
select throws_ok($$ insert into arquivos_apagar (escritorio, bucket, caminho, cliente_id) select rm, 'documentos-portal', rm::text || '/../' || gen_random_uuid()::text, gen_random_uuid() from ids $$,
  '23514', null, 'PT-11: caminho com .. é recusado');
select throws_ok($$ insert into arquivos_apagar (escritorio, bucket, caminho, cliente_id) select rm, 'documentos-portal', rm::text || '/peticoes/x.docx', gen_random_uuid() from ids $$,
  '23514', null, 'PT-11: caminho fora dos dois formatos é recusado');
select throws_ok($$ insert into arquivos_apagar (escritorio, bucket, caminho, cliente_id) select rm, 'documentos-console', rm::text || '/' || gen_random_uuid()::text, gen_random_uuid() from ids $$,
  '23514', null, 'PT-11: só o bucket documentos-portal');

-- 9. Idempotente.
select is((select cliente_arquivos_apagar(cli.hel) from cli), '{"documentos": 0, "propostas": 0}'::jsonb, 'PT-11: chamar de novo não põe nada novo');
select is((select count(*)::int from arquivos_apagar, cli where cliente_id = cli.hel), 10, 'PT-11: a fila não duplica (6 documentos e 4 .docx)');

-- 11. A rota (revisão, I4): sem pg_net, não chama; a pendência olha as duas filas.
select ok((select guarda_arquivos_tem_pendencia()), 'PT-11: a fila da exclusão conta como pendência da rota');
select is((select guarda_arquivos_chamar()), false, 'PT-11: sem pg_net, guarda_arquivos_chamar devolve false e não quebra a exclusão');
select ok((select aplicar_prazos() ? 'arquivos_chamados'), 'PT-11: a rotina da noite continua chamando a rota');

-- 8. A fila na rotina. A rota roda como o papel do banco (dominio), como em produção.
grant select on ids, cli, d to dominio;
set local role dominio;
create temp table p1 as select rotina_arquivos_apagar_pendentes(500) j;
reset role;
select is((select jsonb_array_length(j) from p1), 10, 'PT-11: a rota pede os 10 arquivos pendentes');
select ok((select bool_and(x ? 'id' and x ? 'bucket' and x ? 'caminho' and not (x ? 'cliente_id')) from p1, jsonb_array_elements(j) x),
  'PT-11: só o id, o bucket e o caminho');
-- Uma falha soma a tentativa e guarda o erro; quem falhou menos vai primeiro.
create temp table falhou as select id from arquivos_apagar where caminho like '%-v1.docx' and cliente_id = (select hel from cli);
grant select on falhou to dominio;
set local role dominio;
select rotina_arquivos_apagar_registrar(array(select id from falhou), 'Storage respondeu 503');
reset role;
select is((select tentativas || ':' || ultimo_erro from arquivos_apagar where id = (select id from falhou)), '1:Storage respondeu 503',
  'PT-11: a falha fica na fila com o erro e a tentativa');
select is((rotina_arquivos_apagar_pendentes(500) -> 9 ->> 'id')::uuid, (select id from falhou), 'PT-11: quem falhou vai para o fim da fila');
-- Às 10h31, sem erro: só o RG antigo conclui; os outros esperam, sem somar tentativa (revisão, M1).
select ajustar_relogio(('2026-11-23 10:31-03'::timestamptz - now()));
set local role dominio;
create temp table r1 as select rotina_arquivos_apagar_registrar(array(select (x ->> 'id')::uuid from p1, jsonb_array_elements(j) x)) n;
reset role;
select is((select n from r1), 1, 'PT-07: antes de conferir_ate, só conclui o que não espera envio atrasado');
select is((select count(*)::int from arquivos_apagar, cli where cliente_id = cli.hel and concluido_em is null and tentativas = 0), 8,
  'PT-11: os que esperam não somam tentativa');
-- Às 12h11, duas chamadas, cada uma com metade (revisão, I2): o evento sai uma vez, na segunda.
select ajustar_relogio(('2026-11-23 12:11-03'::timestamptz - now()));
create temp table metades as select array_agg(id order by caminho) filter (where caminho ~ '/propostas/') a, array_agg(id order by caminho) filter (where caminho !~ '/propostas/') b
  from arquivos_apagar, cli where cliente_id = cli.hel and concluido_em is null;
grant select on metades to dominio;
set local role dominio;
select rotina_arquivos_apagar_registrar((select a from metades));
reset role;
select is((select count(*)::int from historico, cli where acao = 'cliente.arquivos_apagados' and entidade_id = cli.hel::text), 0,
  'PT-11: com arquivo ainda pendente, o evento não sai');
set local role dominio;
select rotina_arquivos_apagar_registrar((select b from metades));
select rotina_arquivos_apagar_registrar((select b from metades));
reset role;
select is((select count(*)::int from arquivos_apagar, cli where cliente_id = cli.hel and concluido_em is null), 0, 'PT-11: a fila de Helena conclui');
select is((select count(*)::int from historico, cli where acao = 'cliente.arquivos_apagados' and entidade_id = cli.hel::text), 1,
  'PT-11: o evento sai uma vez só, quando o último arquivo do cliente conclui');
select ok((select dados = '{"documentos": 6, "propostas": 1}'::jsonb and entidade = 'cliente' and escritorio_id = ids.rm and autor_tipo = 'SISTEMA'
                  and not historico_tem_dado_proibido(dados)
             from historico, cli, ids where acao = 'cliente.arquivos_apagados' and entidade_id = cli.hel::text),
  'PT-03: o evento fica no histórico do cliente, com as contagens e sem dado pessoal');
select ok((select not guarda_arquivos_tem_pendencia()), 'PT-11: sem nada pendente, a rota não é chamada');

-- 12. Os clientes excluídos antes da 0970 (0971; revisão, I3): roda como o papel do banco.
set local role dominio;
create temp table pre1 as select arquivos_apagar_preencher_excluidos() j;
create temp table pre2 as select arquivos_apagar_preencher_excluidos() j;
create temp table marcas as select coalesce(current_setting('t3jus.fim_da_guarda', true), '') fg, coalesce(current_setting('t3jus.aplicando_prazos', true), '') ap;
reset role;
select is((select j from pre1, ids), jsonb_build_object(
    (select rm from ids)::text, '{"clientes": 1, "documentos": 2, "propostas": 1}'::jsonb,
    (select outro from ids)::text, '{"clientes": 1, "documentos": 1, "propostas": 0}'::jsonb),
  'PT-11: o preenchimento conta por escritório os clientes, documentos e propostas que entraram');
select is((select j from pre2), '{}'::jsonb, 'PT-11: rodar de novo não muda nada (idempotente)');
select ok((select fg in ('', 'off') and ap in ('', 'off') from marcas), 'PT-11: as marcas da rotina voltam como estavam');
select is((select count(*)::int from cliente_documentos, cli where cliente_id in (cli.vera, cli.jorge) and apagado_em is not null and nome is null), 3,
  'PT-11: os documentos de Vera e de Jorge (outro escritório) saem');
select ok((select nome = 'RG Ivo.pdf' and apagado_em is null from cliente_documentos, d where id = d.rg_ivo),
  'PT-11: o cliente arquivado (não excluído) fica intacto');
select is((select count(*)::int from arquivos_apagar, cli where cliente_id = cli.vera), 2 + (select versao from propostas, pr where id = pr.vera),
  'PT-11: os arquivos e os .docx de Vera vão para a fila');
select ok((select dados ->> 'antes' = 'true' from historico, cli where acao = 'cliente.arquivos_na_fila' and entidade_id = cli.vera::text),
  'PT-03: o preenchimento deixa o registro de cada cliente, marcado como de antes');

-- 13. Inventário (PT-11).
select ok((select no_fim like '%A pedido do titular, o arquivo sai do Storage%' and situacao = 'APROVADO' from inventario_dados where tabela = 'cliente_documentos'),
  'PT-11 inventário: documentos pessoais dizem que o arquivo sai a pedido do titular');
select ok((select no_fim like '%.docx gerados%' from inventario_dados where tabela = 'propostas'), 'PT-11 inventário: propostas citam os .docx');
select ok((select not dado_pessoal and not exportar from inventario_dados where tabela = 'arquivos_apagar'), 'PT-11 inventário: a fila não é dado pessoal e não se exporta');

select * from finish();
rollback;
