-- Os avisos do sino dos clientes excluídos antes da 1110 (F3.172; PT-11), à parte da estrutura,
-- como a 0971, a 1091 e a 1093.
--
-- ATENÇÃO: isto não tem volta. Em cada aviso do sino de cliente já EXCLUIDO (origens clientes,
-- propostas e levantamentos), o nome do cliente vira "Cliente excluído", o serviço vira
-- "Serviço apagado a pedido do titular" e, no aviso dos 18 anos, saem a data e quem assinava. O
-- aviso não se apaga: continua no sino e na exportação, com o texto fixo.
--
-- Ordem da publicação (README, "Arquivos do cliente excluído"; painel, P19):
--   1. conferir com list_migrations que a 1090 está no ar (servico_apagado_texto);
--   2. aplicar a 1110 (daqui em diante, toda exclusão troca os avisos);
--   3. rodar a contagem só de leitura (project-files t3jus/f3-172/contagem-antes-1111.sql) e mostrar
--      à Carol;
--   4. com o ok dela, aplicar esta 1111 e conferir que avisos_sino_preencher_excluidos() devolve {}.
-- Nada a publicar no Portal, na api-console nem no Console.
--
-- A função é testada no pgTAP 150 (também com o escritório só de consulta) e é idempotente: rodar
-- de novo não muda nada. O resultado é a contagem por escritório ({escritório: {clientes, avisos}}).

select avisos_sino_preencher_excluidos() as preenchidos;
