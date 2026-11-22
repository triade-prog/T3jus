**Aprovado pela Carol em 22/11/2026 às 18h28 (Bahia), com "aprovado": as recomendações das perguntas valem como decisões (D27).**

# Site comercial · Início, versão 3 · notas

Desenho para a Carol aprovar. Nada mudou em `sistema/apps/site`, nada foi publicado. Parte do site aprovado em 21/11/2026 (`docs/design/aprovadas/site-comercial/`) e da análise visual do t3jus.pro (identidade 9/10, dinamismo 4/10, demonstração do produto 5/10). Segue a IDENTIDADE.md e o conceito Gabinete. Logo, selo e símbolo são os SVGs oficiais, sem mudança. Todos os nomes e valores das telas são fictícios.

## Como abrir

- `index.html`: apresentação curta (antes e depois, decisões, perguntas).
- `inicio.html`: o Início novo, funcionando. As abas trocam a tela de verdade; `inicio.html#a-financeiro` abre direto numa aba. Os links do menu levam às páginas do site no ar (t3jus.pro), que não mudam.
- Capturas: `site-abertura-computador.webp` e `site-abertura-celular.webp` (primeira dobra, 2x), `site-abertura-rolada-computador.webp` (a tela da abertura já assentada), `site-inicio-computador.webp` e `site-inicio-celular.webp` (página inteira), `site-abas-*` (a seção das abas em dois estados), `antes-depois-abertura-computador.webp` (site no ar, v2 e v3).
- `capturas/`: as telas do Portal usadas na página. `_fonte/gerar.sh` refaz tudo.

## Diagnóstico sincero da v2

Concordo com as hipóteses e acrescento duas. Em ordem de peso:

1. **O produto apareceu em quantidade, não em tamanho.** Notebook, celular, três recortes e o selo dividiam 700 px. A tela do notebook ficava em cerca de 40% do tamanho real: o texto do Portal virava 5 ou 6 px. A Carol pediu “imagens reais” e recebeu um mosaico que não se lê. Parecia mais ilustração do que sistema.
2. **A abertura era a mesma de antes.** O mesmo corte diagonal, o mesmo título, o mesmo sobretítulo com fio, o mesmo texto à esquerda e os mesmos dois botões. O olho reconhece “o site de sempre com uma figura nova”, e a análise pedia uma mudança de sensação.
3. **A página cresceu em vez de mudar.** Somou três destaques, abas com sub-botões, oito miniaturas e duas caixas de “a caminho/planejado”, e manteve a faixa de fatos, as três dores, o caminho em 5 passos, o valor e a chamada: 9.000 px. O mesmo produto aparecia em três seções diferentes (destaques, abas e miniaturas), cada vez menor.
4. **A unidade básica continuou o cartão branco com texto miúdo.** Listas de 14 px, miniaturas de 200 px, legendas e selos pequenos. A análise apontava exatamente isso.
5. **Ritmo plano.** Quase todas as seções em sal, com o mesmo cabeçalho alinhado à esquerda. Só uma faixa vinho. Faltava um momento de produto ocupando a largura, faltava contraste de fundo e de escala entre as seções. Sem isso, nada lê como “tecnologia”.

## O que a v3 faz diferente

1. **Abertura centrada, com uma tela só e grande.** Título novo, curto, em 76 px: “O dia do escritório inteiro, *numa tela só.*” Embaixo, o Início real do Portal numa janela de navegador com 1.180 px de largura (92% do tamanho real; o texto do Portal fica legível). A janela atravessa a passagem do vinho para o sal, como nos sites de produto de referência. Duas anotações grandes dizem o que olhar (“Só as áreas dela” e “O que pede você hoje”). Ao fundo, a coluna do logo (símbolo oficial) em tom sobre tom, grande, dos dois lados. No celular, o mesmo Início num aparelho de 290 px, com a captura do próprio celular.
2. **Três destaques em painéis de cor inteira, com a tela quase em tamanho real.** Âmbar, vinho e âmbar claro (#F2CDB3), alternando o lado. Cada um mostra só o bloco que conta a história (as vencidas com motivo e próxima ação; o RPV dividido com prazo por parte; os prazos que vencem hoje), entre 88% e 100% do tamanho real, saindo pela borda do painel. As três dores do site viraram o título destes destaques (“Onde o dinheiro escapava, agora tem dono e data”), em vez de uma seção própria de cartões.
3. **“Por dentro do Portal”, em fundo branco, com quatro abas numeradas.** (Na primeira entrega era escura, em tinta; a Carol pediu fundo claro em 22/11, e a seção foi refeita.) É a única seção branca da página, entre duas em sal, e a tela fica num palco sal arredondado, com um fio âmbar decorativo e a coluna do logo, quase invisível, no canto. O vinho fica nos títulos e na aba ativa (vinho com texto branco e uma seta para a tela). As abas são as áreas na ordem do caminho (1 Comercial, 2 Contratos, 3 Jurídico, 4 Financeiro): o caminho em 5 passos deixou de ser uma seção e virou a própria navegação. Cada aba troca uma tela inteira de 1.200 px (94% do tamanho real), com um título, uma frase e três pontos. Sem sub-botões.
4. **Primeiro o que existe, depois o que vem, num espaço menor.** Um bloco branco “Também no T3jus” com seis itens prontos em três colunas. Embaixo, menor: “A caminho” (Em preparação: WhatsApp com a assistente, com a conversa recortada para ler mesmo pequena, e a importação do Astrea e do ADVBOX, cada um com o que falta) e “Planejado” (tracejado, quatro itens, sem data).
5. **Menos seções, mais contraste.** Ordem: abertura (vinho) · destaques (sal com painéis âmbar, vinho e âmbar claro) · por dentro (branco, com palco sal) · o que existe (sal) · seus dados (vinho) · chamada (campo âmbar com o selo inteiro). Nenhum fundo escuro além do vinho. Saíram a faixa de fatos (foi para “Seus dados”), os cartões das dores, o caminho em 5 passos (virou as abas) e a seção de valor (foi para a chamada final, com a mesma frase). Corpo em 17 px, títulos de seção entre 36 e 58 px. Cerca de 9.460 px no computador, com as fotos, quase o mesmo comprimento da v2, mas com menos seções e cada tela em tamanho legível.
6. **Movimento guiado pela rolagem (refeito em 22/11, a pedido da Carol).** Antes era discreto demais. Agora cada movimento mostra uma parte do produto. Detalhes na seção “Movimento” abaixo. Com `prefers-reduced-motion: reduce`, tudo fica parado e pronto.

## Movimento (22/11, a pedido da Carol)

O movimento de antes (a janela assentando, as seções subindo e o esmaecer nas abas) ficou discreto demais. Agora a rolagem conduz a leitura, e cada movimento aponta uma parte do produto.

| Onde | O que se move | Computador | Celular |
|---|---|---|---|
| Topo | Barra âmbar de progresso da leitura. O menu encolhe nos primeiros 140 px (sobe 12 px, e o logo vai a 86%) | sim | sim (10 px) |
| Abertura | O texto entra em sequência. A tela do Portal sai inclinada (14°, a 90%) e assenta até 600 px de rolagem. A coluna do logo, ao fundo, desce mais devagar e dá profundidade. As anotações entram uma depois da outra (1,3 s e 1,7 s) e sobem um pouco mais rápido que a tela. Os números “6 pedem você hoje” e “2 compromissos” contam até o valor que está na tela | sim | só a entrada do texto e do aparelho |
| Destaques | Cada painel entra deslizando de lados alternados (90 px). O trecho da tela sobe por dentro do painel. Quando o painel fica inteiro na tela, um realce âmbar é desenhado em volta do dado importante, lado por lado, e aparece uma etiqueta vinho: “O motivo e a próxima ação”, “Cada parte com o seu prazo” e “Vencem hoje, cada um com dono” | sim | desliza 24 px, sem realce |
| Retrato da advogada | A foto anda um pouco mais devagar que a página (escala 1,06 a partir do topo, para não cortar o rosto). O texto entra por cima do véu, linha por linha | sim | só o texto |
| Por dentro do Portal | A seção fica parada (sticky) enquanto a rolagem passa pelas 4 abas, cerca de 470 px por aba. A aba ativa acompanha, um fio âmbar enche sob cada aba e a tela nova entra pela direita. Clicar numa aba (ou usar as setas) leva a rolagem até o trecho dela. Uma linha avisa: “Role a página para passar pelas quatro áreas, ou escolha uma aba.” | só com 1021 px ou mais de largura e 820 px ou mais de altura | abas como antes, sem sticky |
| O que existe | Os 6 itens de “Também no T3jus” entram em cascata. As caixas “A caminho” e “Planejado” sobem | sim | sim |
| Seus dados | Os 4 itens entram em cascata, e o símbolo ao fundo anda devagar | sim | sem o símbolo |
| Chamada final | O bloco sobe, a foto da conversa cresce de 92% para 100% e o cartão “Na demonstração” sobe depois dela. O selo dá uma volta inteira, devagar (2,8 s), uma vez só, sem mudar o desenho | sim | sim |
| Microinterações | Botões e abas sobem 2 px no hover. Os ícones de “Também no T3jus” e de “Seus dados” se mexem no hover. A tela do destaque sobe 6 px | sim | — |

**Como é feito:**
- **Onde o navegador tem `animation-timeline` (Chrome e Edge):** animação guiada pela rolagem, só em CSS, com `scroll(root)`, `view()` e `view-timeline` nomeado por painel.
- **Onde não tem (Firefox e Safari, por enquanto):** a reserva usa IntersectionObserver e transições de tempo, com a mesma cascata e o mesmo realce. A barra, o menu e a tela da abertura vêm de um laço único com `requestAnimationFrame`.
- **Nas abas:** a rolagem guiada usa o mesmo laço nos dois casos.
- **Desempenho:** sem biblioteca. Só `transform` (`translate`, `scale`, `rotate`) e `opacity` são animados, e nada muda o layout.
- **Sem JavaScript:** nada fica escondido. As entradas só são ligadas pelo script, e o modo de rolagem guiada é decidido no `<head>`, antes da primeira pintura.
- **Com “menos movimento”:** tudo para e aparece pronto. O realce já aparece desenhado, e as abas voltam a ser abas comuns, sem trecho alto.

**Vídeo:** `rolagem-computador.webm` (1440 x 900, 35 s, 3,3 MB, VP9, sem som), gravado pelo Playwright (`recordVideo`) com a rolagem do gerador (`_fonte/video.cjs`).

**O que muda no layout:** no modo de rolagem guiada, “Por dentro do Portal” põe o texto à esquerda (340 px) e a tela à direita, para tudo caber parado numa tela de 900 px de altura. A captura fica com cerca de 740 px de largura, contra 1.100 px nas abas comuns. Em telas mais baixas, no tablet e no celular, as abas continuam como antes.

**Capturas:** a página inteira agora é fotografada com “menos movimento”, porque, com a rolagem guiada, o que está fora da tela ainda não entrou. O movimento aparece no vídeo e em três capturas no meio da rolagem: `site-rolagem-destaque-*`, `site-rolagem-abas-computador` e `site-rolagem-chamada-computador`.

## De onde vem cada imagem

| Arquivo | Origem |
|---|---|
| `capturas/abertura-inicio*.webp` | Portal (`sistema/apps/portal`, build de produção em `localhost:3000`) com os dados simulados de `tests/e2e/portal-inicio.spec.ts`, sócia dona Marina Ribeiro, 1280 px (2x) e celular 390 px (2x). Único ajuste herdado da v2: a audiência do dia às 14h30. |
| `capturas/destaque-a-receber*.webp` | `portal-financeiro.spec.ts`, A receber, 1120 px (recorte do bloco dos números e da lista); no celular, a tela rolada até as vencidas. |
| `capturas/destaque-repasses*.webp` | `portal-financeiro-repasses.spec.ts`, Repasses, 1120 px (recorte); no celular, rolada até o RPV. |
| `capturas/destaque-prazos*.webp` | `portal-juridico-prazos.spec.ts`, Prazos, 1440 px (recorte da lista); no celular, rolada até os prazos de hoje. |
| `capturas/aba-comercial*.webp` | `portal-comercial.spec.ts`, ficha da proposta P-2026-016. |
| `capturas/aba-contratos*.webp` | `portal-carne.spec.ts`, a janela Gerar carnê na ficha do contrato. |
| `capturas/aba-juridico*.webp` | `portal-juridico-casos.spec.ts`, ficha do caso Pereira x Mercado Bom Preço. O cartão “Petições do caso” usa a rota `GET /v1/escritorio/peticoes?caso=` com a petição fictícia deste caso em `portal-peticoes.spec.ts` (Recurso ordinário, aprovada). O único ajuste é que ela foi gerada “ontem, 14h42”, por causa do relógio parado. Até 22/11 a rota faltava, e a captura mostrava “Não deu para carregar as petições”. |
| `capturas/aba-financeiro*.webp` | `portal-financeiro-caixa.spec.ts`, Resumo do Financeiro. |
| `capturas/a-caminho-conversas.webp` | `portal-conversas.spec.ts`, só a coluna da conversa do Hélio Batista Corrêa (recorte), para ler em tamanho pequeno. |
| `marca/` | `sistema/apps/site/public/marca` (logo sobre vinho, selo, ícone) e `docs/marca/svg` (símbolo vinho e sal), sem mudança. O símbolo aparece grande, em tom sobre tom, com opacidade no CSS. |
| `fontes/` | `sistema/apps/site/public/fontes` (Alegreya e Poppins do site). |
| Ícones | `sistema/apps/site/src/components/Icones.astro`, sem mudança. |
| Janela de navegador e aparelho | Desenhados em CSS. |
| `fotos/advogada-leitura*.webp` | Imagens fornecidas pela Carol em 22/11/2026 (`fotos-carol/advogada-leitura.png`, 1448 x 1086). Computador: recorte 1448 x 621, rosto entre 41% e 59% da largura, com folga acima do cabelo. Celular e até 1020 px: recorte quadrado 720 x 720. |
| `fotos/consulta-juridica*.webp` | Imagens fornecidas pela Carol em 22/11/2026 (`fotos-carol/consulta-juridica.png`, 1448 x 1086). Computador: 1200 x 900; celular: 720 x 540. Os dois rostos ficam inteiros. |
| “Antes” no antes x depois | A captura do t3jus.pro que a Carol recebeu (FireShot, 2119 px, reduzida para 1440). “v2” é a captura da própria v2. |

**Datas corrigidas:** todas as capturas foram refeitas com o mesmo relógio, quarta-feira, 18/11/2026, 10h15 (Brasília), parado no navegador (`page.clock`) e no Node (de onde os testes tiram “hoje”). O Início, os Prazos, o Resumo, a Agenda e a proposta dizem o mesmo dia. Nenhum dado real. As duas fotos são as fornecidas pela Carol (ver abaixo).

**Conferência das capturas do Portal (22/11):** o gerador agora lista, para cada tela fotografada, as linhas com “Não deu”, “Tentar de novo”, “Carregando”, “Nenhum/Nenhuma”, “erro” e “não encontr”. Nenhuma tela tem erro nem carregando. Os “Nenhum” que sobraram são dados verdadeiros da tela: no Início, “Nenhum contato seu está vencido”; em Repasses, “Nenhum RPV ou precatório a caminho”; em Prazos, “Nenhum prazo sem dono”; e, no carnê, “Nenhum carnê gerado”, por trás da janela Gerar carnê. Na ficha do caso, os vazios de prazos, tarefas e arquivos ficam abaixo da parte fotografada.

**Achados no Portal (fora deste desenho, para quem cuida do Portal):** em 1120 e 1280 px de largura, a lista de Prazos aperta a coluna do texto até quebrar palavra por palavra (por isso a captura dos Prazos é de 1440 px); em 390 px, o botão “Cumprido” dos prazos aparece cortado, com o ícone fora do contorno (por isso o recorte do celular para antes dele).

## Fotos (imagens fornecidas pela Carol em 22/11/2026)

A origem e o uso das duas imagens são decisão da Carol. Elas entraram assim:

- **Advogada lendo (`advogada-leitura`), retrato largo entre os destaques e “Por dentro do Portal”.** O texto fica na coluna da esquerda, sobre um véu vinho escuro (#4F1D35 a 94–95%), longe do rosto. Os pares usados são sal e branco sobre vinho escuro e âmbar claro no sobretítulo, todos da IDENTIDADE.md. O texto diz para quem é o T3jus (“Para escritórios de 3 a 10 pessoas”) e a frase “Quem decide também atende, cobra e confere o caixa.” Não é legenda nem depoimento e não diz quem é a pessoa. Em 1020 px ou menos, a foto fica quadrada e o texto vai para baixo, sem nada por cima da imagem.
- **Atendimento (`consulta-juridica`), na chamada final, coluna da direita.** O cartão “Na demonstração, você vê” sobe só sobre a parte de baixo da foto, a mesa, e nunca cobre os rostos. Sem legenda.
- As duas imagens têm `loading="lazy"`, `width` e `height` e texto alternativo que descreve a cena sem dar nome nem papel de cliente. Em 760 px ou menos, o navegador baixa a versão de celular (`<picture>` e `srcset`).
- **Equilíbrio:** o produto segue como protagonista. No computador, as fotos ocupam cerca de 860 px de altura dos 9.460 px da página (o retrato tem uns 520 px e a foto da chamada uns 340). As telas do Portal continuam ocupando a maior parte. As pessoas aparecem duas vezes, como pausa: depois dos três destaques e no pedido de demonstração.
- Os arquivos originais estão em `fotos-carol/`, sem mudança. Os recortes estão em `fotos/` (WebP qualidade 80–82).

## Selos (saem do painel, com as correções já sabidas)

| Selo | Itens na página | Painel |
|---|---|---|
| No T3jus | A receber e cobrança (F3.17), carnê com Pix (F3.78), recibo (F3.19), repasses (F3.43, F3.45), prazos e lembrete (F3.34, F3.38, F3.4), propostas e documentos no timbrado (F3.5, F3.6, F3.7, F3.92, F3.16, F3.104), contratos e assinatura (F3.10, F3.12), casos, etapas, petições e agenda (F3.33, F3.36, F3.41, F3.1), Resumo, meta, a pagar, reembolso e contador (F3.47, F3.49, F3.18, F3.23, F3.50, F3.89), Início por áreas (F3.26), importar de planilha (F3.55) | feitos |
| Em preparação | WhatsApp com a assistente virtual | F3.58 pendente (Meta) |
| Em preparação | Trazer os dados do Astrea e do ADVBOX | F3.56 em andamento (falta conferir com os arquivos reais de um piloto; F3.114 a F3.117) |
| Planejado | Pix ou boleto com baixa automática (F3.20), leitura de publicações, assinatura eletrônica, Google Agenda ou Outlook | sem entrega |

O aviso de etapa ao cliente e o “pedir de novo” pelo WhatsApp não aparecem como prontos: dependem da Meta (F3.37b, F3.42b).

## Proposta escrita das prioridades 3 a 6 (não desenhadas)

### 3. Seção sobre o produto

- A seção “Por dentro do Portal” já é o lugar do produto. O passo seguinte é uma quinta aba, **Agenda da equipe**, e um bloco curto **“O Portal no celular”**: três aparelhos lado a lado (Início, Conversas, Agenda), capturados pelo mesmo gerador.
- O Console continua fora do site: é ferramenta interna da equipe T3jus. Ele entra só como frase, “a nossa equipe acompanha a implantação”, na chamada final, se a Carol quiser.

### 4. Fotos de pessoas e vídeo

- **Fotos (atualizado em 22/11: as imagens da Carol já ocupam o retrato e a chamada final; o que segue vale para substituí-las um dia):** sessão própria com a advogada parceira e a equipe dela, no escritório de verdade, com **autorização de uso de imagem por escrito** (nome, finalidade “site e divulgação do T3jus”, prazo, direito de revogar). Telas que aparecerem só com os dados fictícios. Luz natural, tons quentes. Lugar: um retrato largo entre os destaques e a seção do Portal, com uma frase da rotina (sem depoimento inventado). Banco de imagens (Unsplash ou Pexels) só como provisório, conferindo e guardando a licença de cada foto, sem marca de terceiros e sem rosto sem autorização de modelo.
- **Vídeo de 20 a 30 s:** gravação de tela do Portal pelo próprio gerador (o Playwright grava vídeo), com os mesmos dados e o mesmo relógio: abrir o Início, ver a parcela vencida, gerar o carnê, registrar o alvará e ver o repasse com prazo. MP4 e WebM, com capa, sem som, `muted` e `playsinline`, com botão de tocar (não toca sozinho para quem pediu menos movimento) e a descrição em texto ao lado. Lugar: dentro da janela da seção do Portal, como uma quinta “aba” chamada “Ver em 30 segundos”. Não na abertura, pelo peso.

### 5. Microanimações

- Já no desenho: entrada em sequência do texto da abertura, janela que assenta com a rolagem, anotações flutuando, seções que sobem ao aparecer, troca de tela com esmaecer, setas dos botões que andam 3 px no passar do mouse. Tudo desliga com menos movimento.
- Para o código: em Astro, sem biblioteca de animação; CSS e um script pequeno (o do desenho tem cerca de 50 linhas). Onde o navegador tiver, a inclinação pode passar para `animation-timeline: scroll()`, sem JavaScript. Nada de contador animado em número que não seja real.

### 6. Ritmo e espaçamento

- Alternância fixa de fundos: vinho, sal com painéis de cor, branco com palco sal, sal, vinho, âmbar. Nunca duas seções seguidas com o mesmo fundo e o mesmo cabeçalho.
- Uma ideia e uma imagem forte por seção. Corpo em 17 px (16 no celular), listas de no máximo três pontos, títulos de seção de 36 a 58 px, abertura de 44 a 76 px. Seções de 96 px no computador e 80 px no celular.
- Peso: a abertura carrega uma imagem com prioridade (a do Início, cerca de 150 KB em WebP); o resto vai com carregamento tardio. No código, o `<Image>` do Astro gera AVIF e WebP em vários tamanhos. As páginas Como funciona e Para quem é passam a usar as mesmas capturas no lugar dos cartões desenhados.

## Conferência

- **axe-core 4.14.1** (WCAG 2.0, 2.1 e 2.2, A e AA) em 18 estados, todos com **nenhuma violação**. Em 1440 e 390: página inicial com e sem movimento, cada uma das quatro abas, destaque Repasses no meio da rolagem (com o realce) e retrato no meio da rolagem. Só em 1440: abas guiadas pela rolagem em 60% do trecho (Jurídico), “O que existe” e chamada final no meio da rolagem. Só em 390: menu do celular aberto. Resultado em `_conferencia.json`. O axe marca como “a conferir” o contraste sobre degradê (na abertura); ali o texto está sobre vinho-escuro, com os pares da IDENTIDADE.md.
- **Marca sem corte:** o selo da chamada final agora fica inteiro, dentro do painel âmbar, abaixo do e-mail (120 px no computador, 100 px no celular), sem mudança no desenho. O logo do topo e do rodapé aparece inteiro. Só a coluna grande em tom sobre tom (símbolo oficial, como forma de fundo na abertura, na seção do Portal e em Seus dados) é cortada pela borda, de propósito.
- **Rolagem lateral:** 0 px em 1440 e em 390, também no meio das entradas que vêm dos lados. **CLS:** 0 em 1440 e 390, com e sem animação guiada, rolando a página inteira (o trecho alto das abas é definido antes da primeira pintura, e a contagem usa largura fixa). **Alvos:** nenhum abaixo de 40 px. **Erros de script:** nenhum.
- **Teclado:** abas no padrão WAI-ARIA (uma parada de Tab, setas, Home e End; o painel recebe foco), e o endereço guarda a aba. Conferido: seta à direita leva a Contratos e troca a imagem, End vai a Financeiro e Tab sai das abas para o painel. Com movimento, no computador: rolar até 60% do trecho das abas escolhe Jurídico, e clicar em Contratos leva a rolagem ao trecho de Contratos (27%) e guarda `#a-contratos`. Foco visível de 3 px (#AC3F6B no claro, #F2CDB3 sobre vinho). Há link “Pular para o conteúdo”.
- **Contraste:** âmbar nunca é texto no claro e nunca leva texto branco. No painel âmbar, o texto é tinta e vinho-escuro; os botões claros são vinho-escuro sobre #F2CDB3.
- **Imagens:** cada tela tem texto alternativo com o que mostra e “dados fictícios”; as anotações, o símbolo e o selo são decorativos. Sem JavaScript, aparece a aba Comercial, e nada fica escondido por causa do movimento.

## Limitações

- O “antes” é a captura de 2119 px que a Carol recebeu, reduzida para 1440; não é uma captura em 1440 exato.
- Não rodei o Lighthouse. As imagens somam cerca de 1,6 MB, quase todas com carregamento tardio; no código, o Astro deve gerar tamanhos menores para o celular.
- A pasta `site-abertura-v3` tinha um rascunho anterior pela metade; ele foi movido, sem mudança, para `site-abertura-v3-rascunho-anterior`.

## Gerador

`_fonte/gerar.sh <captura-do-site-no-ar.png>`, com o Portal em `http://localhost:3000`:
`capturas.cjs` (fotografa o Portal com o relógio parado) → `imagens.py` (WebP e recortes) → `inicio_v3.py` (monta o `inicio.html` a partir de `inicio.tpl.html`, com os ícones do site) → `fotos.cjs` (capturas da página e conferência) → `webp.py` e `antes-depois.cjs` (WebP e antes x depois) → `video.cjs` e ffmpeg (vídeo da rolagem em VP9).

## Revisão crítica (22/11, depois da seção clara)

Revi a página em 1440 e 390 px, seção por seção, parada e rolando. Notas de 0 a 10, antes e depois das correções desta revisão:

| Critério | Antes | Depois |
|---|---|---|
| Dinamismo visual | 7 | 7,5 |
| Demonstração do produto | 8 | 8,5 |
| Repetição de cartões brancos | 6,5 | 7,5 |
| Texto pequeno | 7,5 | 8 |
| Narrativa até a demonstração | 6,5 | 8 |
| Ritmo e espaçamento | 7 | 8 |
| Força da abertura | 8 | 8,5 |
| Consistência depois da seção clara | 6 | 8,5 |
| Legibilidade das telas no celular | 5 | 8 |
| Cortes e desalinhamentos | 5 | 9 |
| Hierarquia dos botões | 7,5 | 8,5 |
| Texto no celular | 8 | 8 |
| Tecnologia jurídica premium, com elegância | 7,5 | 8,5 |

**Corrigido nesta revisão**
1. **Tela das abas encolhida (erro da troca para o claro):** uma regra de CSS colada no lugar errado dava margem, borda e recuo à imagem da aba. No celular, a tela ficava com cerca de 200 px dentro do aparelho; no computador, perdia 48 px. Corrigido: a tela volta a ocupar o aparelho e a janela inteiros.
2. **Texto dos destaques cortado:** em 1440 e 1280, a numeração “01 / 03” ficava fora do painel, e num teste intermediário a terceira linha da lista também. A linha da grade passou a respeitar a altura do painel (640 px), e o título desceu para 38 px. Conferido em 1440, 1280, 1100, 800 e 390.
3. **O terceiro destaque era branco, ao lado da seção branca do Portal.** Passou para o âmbar claro #F2CDB3 (texto tinta e vinho), e os três painéis ficaram distintos: âmbar, vinho e âmbar claro.
4. **Pedido de demonstração logo depois das telas:** uma faixa “Quer ver estas telas com a rotina do seu escritório?” com o botão principal, no fim da seção do Portal. Antes, entre a abertura e a chamada final, não havia botão.
5. **A caminho:** a tela de Conversas ficava em 24% do tamanho real, ilegível (o mesmo erro da v2). Agora é só a coluna da conversa, em cerca de 65%, e a moldura tem altura máxima.
6. **Prazos no celular:** o recorte terminava num botão “Cumprido” cortado pelo próprio Portal; agora termina antes dele.
7. **Títulos quebrando no meio da frase** (“Depois, o / que vem.” e “levado a / sério.”): o cabeçalho dessas seções ficou mais largo.
8. **Abertura:** a inclinação inicial da tela caiu de 10° para 7°, e a escala inicial subiu de 0,94 para 0,96. Aparece mais produto na primeira dobra.
9. **Espaço entre seções:** de 112 para 96 px. Assim a página volta a cerca de 8.900 px, mesmo com a faixa nova.

**Para a Carol decidir (não aplicado)**
1. **Vídeo de 30 s no palco do Portal**, como uma quinta aba “Ver em 30 segundos”, gravado pelo gerador com os dados fictícios. *Recomendo* fazer: é o que mais aumenta o dinamismo sem tirar a sobriedade.
2. **Encurtar a página juntando “Seus dados” à chamada final** (quatro garantias numa linha, acima do botão). *Recomendo* manter separado por enquanto: sigilo é argumento de compra para advogado e merece a faixa vinho; reavaliar quando houver números de visita.
3. **Fotos:** as duas imagens da Carol já estão no retrato largo e na chamada final. Uma sessão com a equipe da advogada parceira, com autorização escrita, pode substituí-las depois nos mesmos lugares e com os mesmos recortes.

## Perguntas para a Carol

1. **O título novo, “O dia do escritório inteiro, numa tela só.”, pode substituir “Do primeiro atendimento ao honorário recebido.”?** *Recomendo* sim: ele descreve a tela que aparece logo abaixo. A frase antiga continua na página, como título da seção do Portal.
2. **A janela da abertura começa inclinada e assenta com a rolagem. Mantém?** *Recomendo* manter: é o único movimento “de produto” forte da página, e some para quem pede menos movimento e no celular.
3. **Saem do Início a faixa de fatos, os cartões das dores, o caminho em 5 passos e a seção de valor separada. Pode?** *Recomendo* sim: o conteúdo foi para os destaques, as abas numeradas, “Seus dados” e a chamada final, e segue completo em Como funciona e Para quem é.
4. **Vídeo:** *recomendo* uma gravação de tela do Portal feita pelo gerador, com dados fictícios. As fotos já foram resolvidas com as imagens da Carol.
