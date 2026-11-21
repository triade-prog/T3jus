# Site comercial do T3jus (t3jus.pro)

Site em Astro (F2.1; SC-01, SC-03, SC-06), programado a partir do desenho aprovado pela Carol em 21/11/2026 (`docs/design/aprovadas/site-comercial`). Quatro páginas estáticas, sem JavaScript além do formulário de demonstração.

| Rota | Arquivo | O que tem |
|---|---|---|
| `/` | `src/pages/index.astro` | Início: o caminho do honorário, o que já existe e o que é planejado, dados, valor e chamada |
| `/como-funciona` | `src/pages/como-funciona.astro` | As seis etapas, cada uma com a situação de hoje, e os passos para começar |
| `/para-quem-e` | `src/pages/para-quem-e.astro` | Perfil do escritório e perguntas frequentes (FAQPage) |
| `/demonstracao` | `src/pages/demonstracao.astro` | Pedido de demonstração (F2.2) |

- `src/layouts/Base.astro`: título, descrição, endereço canônico, prévia de compartilhamento (`og.png`) e dados estruturados de cada página; o medidor de visitas da Vercel (Web Analytics, sem cookies) é ligado no painel da Vercel.
- `src/components/`: topo, rodapé, ícones e o formulário (`Pedido.astro`). As regras do formulário ficam em `src/lib/pedido.ts` e valem também no servidor.
- `src/config.ts`: `privacidadePronta`. A Carol decidiu que o formulário só vai ao ar com a política de privacidade revisada (F2.4). Enquanto for `false`, a página Demonstração mostra o contato por e-mail no lugar do formulário e o rodapé mostra a política como "em preparação".
- **Honestidade (SC-03):** os selos "No T3jus", "Em preparação" e "Planejado" saem do painel. Quando um item muda de situação no painel, mude o selo aqui.
- `public/`: a marca (cópias sem alteração de `docs/marca/svg`), as fontes Alegreya e Poppins servidas pelo próprio site, `robots.txt` e `sitemap.xml`.

Rodar: `pnpm --filter @t3jus/site dev` (porta 3002). Conferir: `pnpm --filter @t3jus/site build && node scripts/conferir-site.mjs` (axe no computador e no celular, rolagem lateral e erros; `PW_CHROMIUM_PATH` para outro Chromium).

Na Vercel: projeto `site-t3jus`, diretório raiz `sistema/apps/site`; o `vercel.json` diz o framework (Astro), a instalação, o build e a pasta `dist`.

## Pedido de demonstração (F2.2)

- As páginas continuam estáticas; só `src/pages/api/pedido-demonstracao.ts` roda no servidor, pelo adaptador `@astrojs/vercel`. Ela confere o pedido com `src/lib/pedido.ts` (as mesmas regras do navegador), ignora robô (campo isca preenchido ou envio em menos de 3 segundos) e repassa à api-console (`POST /v1/site/pedidos`) com o segredo de repasse e o IP de quem pediu.
- O projeto do site na Vercel precisa de duas variáveis: `SUPABASE_FUNCTIONS_URL` (o endereço das Edge Functions, terminado em `/functions/v1`) e `REPASSE_SEGREDO` (o mesmo segredo dos apps). Sem elas, a rota responde 503 e a página mostra a falha com o e-mail como saída.
- O banco (migration 0570) guarda o interessado, aplica os limites e junta o pedido repetido; a api-console manda a resposta automática pelo Resend. O interessado aparece em Console › Comercial › Interessados.
