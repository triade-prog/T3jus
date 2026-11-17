# Contexto do projeto — T3 Just

Resumo para quem continuar o trabalho (pessoa ou nova sessão do Claude). Atualizado em 17/11/2026 (horário de Brasília), com o passo 0 (fundação) construído.

## Onde está cada coisa

| O quê | Onde |
|---|---|
| Visão, público, primeira versão e plano de validação | `docs/01-ideias-e-direcionamento.md` |
| Funcionalidades de 12 sistemas jurídicos | `docs/02-pesquisa-12-sistemas.md` |
| Análise crítica, preços de concorrentes e próximos passos | `docs/03-analise-critica.md` |
| Todas as ideias, com código por seção | `IDEIAS.md` |
| Painel de execução (fases, entregas, testes, publicação, dependências, decisões, histórico) | `docs/painel/dados/` (montado por `docs/painel/painel.py`; ver `docs/painel/LEIA-ME.md`) |
| Código do sistema (como rodar, como a base funciona, tabela nova passo a passo) | `sistema/` e o `README.md` dele |
| CI (lint, tipos, testes, banco, ponta a ponta, painel, segredos) | `.github/workflows/ci.yml` |
| Instruções para toda sessão do Claude | `CLAUDE.md` |
| Prévia clicável para a advogada parceira e o script da planilha de respostas | `prototipo/` e `apps-script/` |

## Decisões fechadas

As mesmas decisões estão no painel de execução (DC1 a DC10). Mudar qualquer uma atualiza primeiro este arquivo e o painel.

- **DC1 · Dois sistemas.** A Plataforma do escritório (o app que o escritório usa) e o Console T3 Just (sistema interno da equipe). A Base comum são as regras que os dois seguem por baixo; não é um terceiro sistema.
- **DC2 · O cliente é o escritório.** É a unidade que contrata e a unidade de separação dos dados: toda informação pertence a um escritório e nunca aparece em outro (PT-01). Uma pessoa pode ter vínculo com mais de um escritório (PT-22).
- **DC3 · Repositório privado** (Carol, 17/11/2026). O código e a arquitetura de segurança ficam fora do acesso público.
- **DC4 · Painel de execução e forma de trabalho iguais aos do TRÍADE Condo** (Carol, 17/11/2026): um JSON por registro em `docs/painel/dados/`, atualizado no mesmo commit de cada entrega, conferido pelo `painel.py` e pelo CI.
- **DC5 · Tecnologia igual à do TRÍADE Condo** (que veio do T-shirt Club): TypeScript em tudo; Next.js 16 + React 19 + Tailwind 4 nas telas; Supabase (PostgreSQL 17, região São Paulo `sa-east-1`) com Edge Functions (Deno + Hono) como servidor; monorepo pnpm com `apps/` e `packages/` (`domain`, `ui`, `servidor`); testes com Vitest, pgTAP e Playwright com axe; publicação na Vercel. Atende PT-05, PT-06 e PT-16.
- **DC6 · Do TRÍADE Condo vem só a fundação genérica** (o passo 0 dele, de 16/10/2026, com as correções genéricas feitas depois): acesso só pelo servidor, isolamento por escritório, permissões, histórico só de inserção, guardião de transições, controle de versão, relógio da aplicação, dinheiro em centavos, login, cabeçalhos de segurança e CI. "Condomínio" virou "escritório" e "síndico" virou "sócio". Nada do domínio do condomínio (WhatsApp, portaria, comunicados, preços) nem a identidade visual da TRÍADE.
- **DC7 · Ordem de construção por dependência, começando pequeno**: passo 0 Fundação → passo 1 Escritório e acesso (Console cadastra o escritório e convida o sócio; o sócio convida a equipe) → a primeira peça de negócio, escolhida com a advogada parceira. Diferente do TRÍADE Condo, aqui há primeira versão: o T3 Just ainda não validou o público (ver `docs/03`), então cada peça entra depois do que os pilotos mostrarem.
- **DC8 · Quadro de permissões e fluxos detalhados só quando houver funcionalidade pronta para eles.** A fundação traz o mecanismo de permissão (pessoa + função + escritório + ação, negar por padrão), não a tabela completa de quem pode o quê.
- **DC9 · Rastreio até a ideia.** O `IDEIAS.md` é a fonte única. Cada entrega do painel cita em `refs` os códigos das ideias que atende; cada regra vira teste automático com o código da ideia no nome.
- **DC10 · Tema provisório.** As telas usam o tema herdado da fundação do TRÍADE Condo só para funcionar. A identidade do T3 Just (nome, logo, cores e fontes) é uma decisão em aberto (E3) e troca o tema inteiro quando chegar.

## Em aberto

| O quê | Quem | Trava |
|---|---|---|
| Projeto Supabase de desenvolvimento em São Paulo (E1) | Carol | Publicar qualquer coisa |
| Projetos na Vercel (E2) | Carol | Publicar as telas |
| Identidade do T3 Just: logo, cores, fontes (E3) | Carol | Telas definitivas |
| Primeira peça de negócio depois do passo 1 | Carol, com a advogada parceira | Passo 2 |
| Área jurídica dos pilotos | Carol | Escolha da primeira peça |

## Situação

**17/11/2026.** O passo 0 (fundação) está construído e testado localmente: lint, tipos, Vitest, Deno, pgTAP, edição simultânea e ponta a ponta passando. Ainda não há projeto no Supabase nem na Vercel.
