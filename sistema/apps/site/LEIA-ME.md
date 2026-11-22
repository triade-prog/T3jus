# Site comercial do T3jus (t3jus.pro)

Site em Astro (F2.1; SC-01, SC-03, SC-06), programado a partir do desenho aprovado pela Carol em 21/11/2026 (`docs/design/aprovadas/site-comercial`). Quatro páginas estáticas. O Início foi refeito na v3, aprovada pela Carol em 22/11/2026 (`docs/design/aprovadas/site-abertura-v3`), com capturas reais do Portal e movimento guiado pela rolagem. Além disso, só há JavaScript no topo (a reserva do movimento) e no formulário de demonstração.

| Rota | Arquivo | O que tem |
|---|---|---|
| `/` | `src/pages/index.astro` | Início v3: abertura com o Início do Portal, três destaques (A receber, Repasses, Prazos), retrato, “Por dentro do Portal” em quatro abas, o que existe e o que vem, seus dados e a chamada |
| `/como-funciona` | `src/pages/como-funciona.astro` | As seis etapas, cada uma com a situação de hoje, e os passos para começar |
| `/para-quem-e` | `src/pages/para-quem-e.astro` | Perfil do escritório e perguntas frequentes (FAQPage) |
| `/demonstracao` | `src/pages/demonstracao.astro` | Pedido de demonstração (F2.2) |

- `src/layouts/Base.astro`: título, descrição, endereço canônico, prévia de compartilhamento (`og.png`) e dados estruturados de cada página; o medidor de visitas da Vercel (Web Analytics, sem cookies) é ligado no painel da Vercel.
- `src/components/`: topo, rodapé, ícones e o formulário (`Pedido.astro`). O topo vale para todas as páginas: fica no alto ao rolar, encolhe e mostra uma barra âmbar de progresso da leitura, e o menu tem “O sistema” (`/#por-dentro`). As regras do formulário ficam em `src/lib/pedido.ts` e valem também no servidor.
- `src/config.ts`: `privacidadePronta`. A Carol decidiu que o formulário só vai ao ar com a política de privacidade revisada (F2.4). Enquanto for `false`, a página Demonstração mostra o contato por e-mail no lugar do formulário e o rodapé mostra a política como "em preparação".
- **Honestidade (SC-03):** os selos "No T3jus", "Em preparação" e "Planejado" saem do painel. Quando um item muda de situação no painel, mude o selo aqui.
- `public/`: a marca (cópias sem alteração de `docs/marca/svg`, agora também `simbolo-vinho.svg` e `simbolo-sal.svg`), as fontes Alegreya e Poppins servidas pelo próprio site, `robots.txt` e `sitemap.xml`. Também `public/telas/` (17 capturas do Portal em WebP, com dados fictícios) e `public/fotos/` (as duas fotos fornecidas pela Carol em 22/11/2026, em dois tamanhos).
- **Estilos:**
  - `src/styles/site.css` tem a base (fontes, cores, botões), o topo e o rodapé, e vale para todas as páginas;
  - `src/styles/paginas.css` serve Como funciona, Para quem é e Demonstração;
  - `src/styles/inicio.css` é só do Início, copiado do `inicio.html` aprovado.

## Início v3: movimento e capturas

- **Como funciona:** o movimento é CSS guiado pela rolagem (`animation-timeline: scroll()`/`view()`) onde o navegador tem, marcado pela classe `sd` que o `<head>` do `Base.astro` põe antes da primeira pintura.
- **Onde o navegador não tem (Firefox e Safari, por enquanto):** `src/scripts/movimento.ts` faz a reserva com IntersectionObserver (classe `io`), e `src/scripts/topo.ts` faz a do topo (classe `compacto`).
- **O que mais o `movimento.ts` cuida:**
  - as abas no padrão WAI-ARIA;
  - no computador com 1021 px ou mais de largura e 820 px ou mais de altura (classe `historia`, também posta no `<head>`), a troca das 4 abas pela rolagem com o palco parado;
  - a volta do selo;
  - a contagem dos números da abertura.
- Sem biblioteca. Só `transform` e `opacity` são animados.
- Sem JavaScript, nada some, porque as entradas só existem com `sd` ou `io`. Com `prefers-reduced-motion: reduce`, tudo para e aparece pronto.
- **Cuidado ao mexer no CSS do movimento:** o minificador (Lightning CSS) junta `animation` e `animation-timeline` num atalho só, e o Chrome descarta o atalho. Por isso, `animation-timeline` e `animation-range` ficam numa regra à parte, com `html` na frente do seletor (por exemplo, `html.sd .destaque{animation-timeline:view()}`). Mantenha assim.
- **O que ficou diferente do `inicio.html` aprovado:**
  - na abertura, o texto e a janela sobem sem esmaecer, para o contraste valer desde o primeiro quadro (o axe roda logo depois de carregar);
  - a troca de tela das abas só anima depois da primeira troca;
  - no `<head>`, Alegreya itálico 500 e Poppins 500 são pré-carregadas, para não haver deslocamento quando a fonte chega;
  - a descrição da página é a de antes.
- **Refazer as capturas:**
  - o gerador está em `docs/design/aprovadas/site-abertura-v3/_fonte/`. O `gerar.sh` liga o Portal em `http://localhost:3000` (build de produção, API simulada pelos specs ponta a ponta, relógio parado em quarta, 18/11/2026, 10h15);
  - ele faz as capturas do Portal (`capturas.cjs`, que também lista telas com erro, carregando ou vazio indevido), os recortes em WebP (`imagens.py`) e as capturas e a conferência da página;
  - depois, copie `capturas/*.webp` para `public/telas/` e `fotos/*.webp` para `public/fotos/`, mantendo os nomes. Se mudar o tamanho de alguma imagem, atualize `width` e `height` no `index.astro`.
- **Selos:** os do Início seguem o painel. A receber, Repasses, Prazos, documentos, petições, recibo (F3.16, F3.19) e importar de planilha aparecem como “No T3jus”. Em “A caminho”, o atendimento pelo WhatsApp (F3.58, falta a Meta) e a vinda do Astrea e do ADVBOX (F3.56) aparecem como “Em preparação”. O resto aparece como “Planejado”.

Rodar: `pnpm --filter @t3jus/site dev` (porta 3002). Conferir: `pnpm --filter @t3jus/site build && node scripts/conferir-site.mjs` (axe no computador e no celular, rolagem lateral e erros; `PW_CHROMIUM_PATH` para outro Chromium).

Na Vercel: projeto `site-t3jus`, diretório raiz `sistema/apps/site`; o `vercel.json` diz o framework (Astro), a instalação, o build e a pasta `dist`.

## Pedido de demonstração (F2.2)

- As páginas continuam estáticas; só `src/pages/api/pedido-demonstracao.ts` roda no servidor, pelo adaptador `@astrojs/vercel`. Ela confere o pedido com `src/lib/pedido.ts` (as mesmas regras do navegador), ignora robô (campo isca preenchido ou envio em menos de 3 segundos) e repassa à api-console (`POST /v1/site/pedidos`) com o segredo de repasse e o IP de quem pediu.
- O projeto do site na Vercel precisa de duas variáveis: `SUPABASE_FUNCTIONS_URL` (o endereço das Edge Functions, terminado em `/functions/v1`) e `REPASSE_SEGREDO` (o mesmo segredo dos apps). Sem elas, a rota responde 503 e a página mostra a falha com o e-mail como saída.
- O banco (migration 0580) guarda o interessado, aplica os limites e junta o pedido repetido; a api-console manda a resposta automática pelo Resend. O interessado aparece em Console › Comercial › Interessados.
