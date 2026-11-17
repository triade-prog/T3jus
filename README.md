# T3 Just

SaaS de gestão para pequenos escritórios de advocacia: do primeiro atendimento ao honorário recebido, sem perder o controle do trabalho.

O projeto saiu da descoberta e começou a construção: a fundação técnica (passo 0) está em `sistema/`, com a base vinda do TRÍADE Condo. Quem for construir começa pelo [`CLAUDE.md`](CLAUDE.md) e pelo [`docs/CONTEXTO.md`](docs/CONTEXTO.md).

## Conteúdo

| Caminho | O que é |
| --- | --- |
| [`sistema/`](sistema/) | Código do sistema: Plataforma do escritório, Console T3 Just, banco e Edge Functions ([como funciona](sistema/README.md)) |
| [`IDEIAS.md`](IDEIAS.md) | Fonte única das ideias, com código por seção |
| [`docs/CONTEXTO.md`](docs/CONTEXTO.md) | Decisões fechadas e situação |
| [`docs/painel/`](docs/painel/LEIA-ME.md) | Painel de execução: fases, entregas, testes e histórico |
| [`docs/01-ideias-e-direcionamento.md`](docs/01-ideias-e-direcionamento.md) | Visão, público, primeira versão, riscos e plano de validação (6/11/2026) |
| [`docs/02-pesquisa-12-sistemas.md`](docs/02-pesquisa-12-sistemas.md) | Lista consolidada de funcionalidades de 12 sistemas jurídicos nacionais e internacionais |
| [`docs/03-analise-critica.md`](docs/03-analise-critica.md) | Análise crítica da ideia, preços de concorrentes e próximos passos (10/11/2026) |
| [`prototipo/index.html`](prototipo/index.html) | Prévia clicável com 6 telas de exemplo e 33 perguntas para a advogada parceira |
| [`apps-script/`](apps-script/) | Script do Google que grava as respostas da prévia numa planilha, e o passo a passo para ativar |

## Protótipo

Link público (depois de ativar o GitHub Pages): https://triade-prog.github.io/t3just/prototipo/

Os dados das telas são inventados. As respostas de quem responde são enviadas automaticamente para uma planilha no Google Drive (ver [`apps-script/LEIA-ME.md`](apps-script/LEIA-ME.md)). Também ficam salvas no navegador. Na última página dá para enviar pelo WhatsApp ou copiar o texto.

## Situação

- Público hipotético: escritórios de 3 a 10 pessoas, com o sócio centralizando a gestão.
- Uma advogada parceira acompanha o desenvolvimento e vai responder o protótipo.
- Tecnologia definida (DC5 no `docs/CONTEXTO.md`). Sem orçamento, prazo ou preço definidos.
