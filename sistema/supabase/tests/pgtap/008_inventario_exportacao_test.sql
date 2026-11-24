-- Inventário de dados (F0.11; PT-11) e exportação completa do escritório (F0.12; PT-15).
begin;
select plan(16);

-- Inventário: toda tabela do public está nele, e nada sobra.
select is(
  (select array_agg(c.relname::text order by c.relname) from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
      and not exists (select 1 from inventario_dados i where i.tabela = c.relname)),
  null, 'PT-11: toda tabela tem linha no inventário (tabela nova precisa dizer o que guarda)');
select is(
  (select array_agg(tabela order by tabela) from inventario_dados i
    where not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                       where n.nspname = 'public' and c.relname = i.tabela)),
  null, 'PT-11: o inventário não cita tabela que não existe');
select throws_ok($$ insert into inventario_dados (tabela, dado_pessoal, o_que) values ('teste_x', true, 'Algo pessoal') $$,
  '23514', null, 'PT-11: dado pessoal sem finalidade, base, prazo e destino é recusado');
select is((select count(*)::int from inventario_dados where dado_pessoal and situacao = 'APROVADO'),
  (select count(*)::int from inventario_dados where dado_pessoal), 'os prazos estão aprovados pela Carol (migration 0090)');
select ok(not exists (select 1 from inventario_dados i join tabelas_internas t using (tabela) where i.exportar),
  'tabela interna do T3jus nunca é marcada para exportar');

-- Dois escritórios, com sócio, equipe convidada e eventos internos.
create temp table ids as select
  teste.pessoa('Sócia Ana') as ana,
  teste.pessoa('Sócio Bruno') as bruno,
  teste.pessoa('Estagiária Carla') as carla,
  teste.equipe('Carol', 'ADMINISTRACAO') as carol,
  teste.escritorio('Ipê Advocacia') as a,
  teste.escritorio('Jatobá Advogados') as b;
select teste.vincular(ana, a), teste.vincular(bruno, b), teste.vincular(carla, a, 'SOCIO'), teste.vincular(carol, a, 'ADMINISTRACAO') from ids;
insert into historico (ocorrido_em, escritorio_id, autor_tipo, autor_id, acao, entidade, entidade_id, dados, interno)
  select app_now(), a, 'PESSOA'::tipo_autor, carol, 'nota.escrita', 'nota', null::text, '{}'::jsonb, true from ids
  union all select app_now(), a, 'PESSOA', ana, 'caso.criado', 'caso', null, '{}', false from ids
  union all select app_now(), b, 'PESSOA', bruno, 'caso.criado', 'caso', null, '{}', false from ids;
insert into sessoes_escritorio (sessao_id, pessoa_id, escritorio_id) select gen_random_uuid(), ana, a from ids;

create temp table exp as select exportar_escritorio(ana, a) as j from ids;

select is((select j ->> 'formato' from exp), 't3jus.exportacao.v1', 'PT-15: a exportação diz o formato');
select is((select j -> 'escritorio' ->> 'nome' from exp), 'Ipê Advocacia', 'PT-15: leva a ficha do escritório');
select is((select array_agg(k order by k) from exp, jsonb_object_keys(j -> 'tabelas') k), array['anexos', 'areas_liberadas', 'assinatura_carne_parcelas', 'assinatura_carnes', 'atendimentos', 'automacao_eventos', 'automacao_execucoes', 'automacao_modelos', 'automacao_versoes', 'automacoes', 'avisos_sino', 'base_mes_pedidos', 'bases_mensais', 'carne_envios', 'carne_parcelas', 'carnes', 'caso_clientes', 'caso_etapa_mudancas', 'casos', 'casos_prontos_fechar', 'cliente_documentos', 'clientes_escritorio', 'clientes_quem_assinava', 'clientes_sem_avisos', 'cobranca_eventos', 'compromissos', 'contadores', 'contas_pagar', 'contas_recorrentes', 'contrato_advogado_oab', 'contrato_advogados', 'contratos', 'conversa_mensagens', 'conversas', 'destinacoes', 'documento_modelo_versoes', 'documento_modelos', 'documento_pedidos', 'documentos_caso', 'documentos_gerados', 'documentos_inicio', 'emprestimos', 'envios_contador', 'escritorio_logos', 'escritorio_recebimento', 'etapas', 'exitos_conferir', 'exportacao_pastas', 'exportacoes_contador', 'fatura_itens', 'faturas', 'fechamentos_caso', 'funil_saidas', 'historico', 'historico_financeiro_anterior', 'honorario_condicoes', 'ia_config', 'ia_config_versoes', 'ia_perguntas_sem_resposta', 'ia_respostas', 'importacoes', 'lembrete_contrato', 'levantamentos', 'metas_receita', 'oab_inscricao', 'pagamentos_recebidos', 'pago_antes_mudancas', 'pedidos_exclusao', 'pessoa_dados_documento', 'peticao_comentarios', 'peticao_eventos', 'peticao_interesse', 'peticao_modelo_versoes', 'peticao_modelos', 'peticao_versoes', 'peticoes', 'prazos', 'propostas', 'recebimentos_previstos', 'recibo_copias', 'recibo_envios', 'recibos', 'recorrencia_mudancas', 'reembolsos_recebidos', 'repasse_atraso_anotacoes', 'requisicoes_a_caminho', 'retornos_cliente', 'saldos_abertura', 'tarefas', 'vinculos', 'whatsapp_avisos', 'whatsapp_escritorio', 'whatsapp_eventos', 'whatsapp_ligacao_rascunho'],
  'PT-15: leva as tabelas marcadas no inventário (sem sessões nem tabelas internas)');
select is((select array_agg(p ->> 'nome' order by p ->> 'nome') from exp, jsonb_array_elements(j -> 'pessoas') p),
  array['Estagiária Carla', 'Sócia Ana'], 'PT-15: leva as pessoas do escritório, não a equipe T3jus');
select ok((select bool_and(v ->> 'funcao' = 'SOCIO') from exp, jsonb_array_elements(j -> 'tabelas' -> 'vinculos') v),
  'os vínculos da equipe T3jus não saem');
select is((select array_agg(h ->> 'acao') from exp, jsonb_array_elements(j -> 'tabelas' -> 'historico') h),
  array['caso.criado'], 'o histórico interno não sai, e nada do outro escritório entra');
select ok(not (select j::text like '%' || b::text || '%' from exp, ids), 'PT-15: nenhum dado do escritório B na exportação de A');
select is((select count(*)::int from historico, ids where acao = 'escritorio.exportado' and escritorio_id = a and autor_id = ana),
  1, 'PT-03: a exportação fica no histórico do escritório');

-- Permissão.
select throws_ok($$ select exportar_escritorio(ana, b) from ids $$, 'TC401', null, 'a sócia de A não exporta B');
select throws_ok($$ select exportar_escritorio(carol, a) from ids $$, 'TC401', null, 'a equipe T3jus não exporta pelo Portal');
delete from funcao_acoes where funcao = 'SOCIO' and acao = 'escritorio.exportar';
select throws_ok($$ select exportar_escritorio(ana, a) from ids $$, 'TC401', null, 'sem a ação escritorio.exportar, nada sai');

select * from finish();
rollback;
