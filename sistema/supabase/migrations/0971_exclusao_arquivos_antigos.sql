-- Arquivos dos clientes excluídos antes da 0970 (F3.141; PT-11), à parte da estrutura (revisão, I3).
--
-- ATENÇÃO: isto não tem volta. Para cada cliente já EXCLUIDO, a linha de cada documento pessoal e do
-- termo de curatela perde o nome do arquivo, a descrição e a data do papel, e o arquivo e os .docx
-- das propostas entram na fila arquivos_apagar, que a api-console apaga do Storage.
--
-- Ordem da publicação (README, "Arquivos do cliente excluído"):
--   1. aplicar a 0970 (estrutura e gatilhos);
--   2. rodar a contagem só de leitura e mostrar à Carol;
--   3. com o ok dela, aplicar esta 0971;
--   4. conferir a fila:
--        select escritorio, count(*), bool_and(caminho like escritorio::text || '/%')
--          from arquivos_apagar group by 1;
--   5. só então publicar a api-console, que é quem apaga.
--
-- A função é testada no pgTAP 133 e é idempotente: rodar de novo não muda nada. O resultado é a
-- contagem por escritório ({escritório: {clientes, documentos, propostas}}).

select arquivos_apagar_preencher_excluidos() as preenchidos;
