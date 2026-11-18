# Instruções para quem for construir o T3jus

- Comece lendo `docs/CONTEXTO.md` (decisões fechadas e situação).
- O sistema nasce em `sistema/`. Antes de escrever código, leia o `sistema/README.md` (como a base funciona e o passo a passo de tabela nova) e o `IDEIAS.md`.
- `IDEIAS.md` é a fonte única das ideias. Tudo o que vale construir precisa estar lá. Ideia nova entra primeiro no `IDEIAS.md`, com código na seção certa.
- Ao criar, mover ou renumerar ideias, mantenha códigos sem buracos e atualize a contagem no fim do `IDEIAS.md`.
- `docs/01` a `docs/04` são a pesquisa de descoberta: consulta, não lista de construção. `prototipo/` e `apps-script/` são a prévia para a advogada parceira e não fazem parte do sistema.
- Toda tabela de dado de escritório tem `escritorio_id` e passa por `proteger_tabela_escritorio`. O escritório vem sempre da sessão no servidor, nunca do navegador.
- Escreva documentação e textos em português do Brasil.
- A cada entrega, no mesmo commit do código, atualize o painel de execução em `docs/painel/dados/` (um arquivo JSON por registro): o arquivo do item (status com evidência e o campo `proximo`, quando houver), uma linha nova do histórico como arquivo novo (`python3 docs/painel/painel.py novo-historico`, horário de Brasília) e rode `python3 docs/painel/painel.py conferir` antes do commit. O passo a passo está em `docs/painel/LEIA-ME.md`. Cada entrega cita em `refs` os códigos das ideias que atende.
- Entrega que atende só parte de uma ideia não cita a ideia como atendida sem um item "pendente" no painel com o que falta, citando a mesma ideia. O status da ideia sai só das entregas e dos testes; publicação e dependências externas não o mudam.
