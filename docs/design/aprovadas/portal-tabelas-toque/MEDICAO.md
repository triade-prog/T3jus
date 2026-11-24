# Alvos de toque nas tabelas do Portal (F3.165) · medição, versão 2

24/11/2026, versão 2 (depois da revisão independente, `REVISAO.md`). Medido no build da `main` (e9bdbc8) com o Portal em `next start`, pelo Chromium do Playwright 1.64.1.

## O que mudou desde a revisão

- Entraram a ficha do cliente (3 tabelas `fl-tab`), a largura de 320 px no celular e a Agenda do celular (que a regra da versão 1 alcançava sem querer).
- A regra de toque é a da versão 2 (`_fonte/proposta.css`): só `td` e as listas `.cartoes.so-cel` e `.cb-cartoes.so-cel`, sem janelas, sem `.c-nome` e com os links crescendo para cima. As colunas "com a proposta" são dela.
- Os números da versão 1 (740 alvos, 373 abaixo de 44 px) estão em `_fonte/v1/MEDICAO-v1.md`.

## Como foi medido

- **Telas:** as 42 gravações de `tests/e2e/portal-tabelas-telas.json` (30 endereços; algumas telas aparecem mais de uma vez, com dados de testes diferentes, e cada gravação conta), **mais, na versão 2, as três tabelas `fl-tab` da ficha do cliente** (Propostas, Contratos e Casos, com os dados do `portal-ficha-ligada.spec.ts` e das gravações de Propostas e Casos; `_fonte/extras.spec.ts`) **e a Agenda do celular** (seção própria abaixo). É a mesma fonte do `portal-tabelas.spec.ts` do F3.124, então cobre toda tabela com prioridade de coluna, as cópias `pt-sobe`, os cartões e as listas que trocam a tabela.
- **Larguras:** 800, 1024, 1280 e 1440 (computador, 900 px de altura) e 390 × 844 e 320 × 844 (celular, com toque; o 320 entrou na versão 2).
- **Alvos:** todo `a[href]`, `button`, `input`, `select`, `textarea`, `summary`, `[role=button|link|checkbox]` e `[tabindex]` visível dentro de uma tabela da folha (`.pt .folha table`, inclusive no modo cartões) ou de uma lista que troca a tabela (`.so-cel`).
- **Tamanho = área de toque real, não a caixa desenhada.** Para cada alvo, a página rola até ele e o `document.elementFromPoint` varre, a partir do centro, para cima, para baixo e para os lados, de meio em meio pixel, até sair do alvo. Isso pega o que a caixa não mostra: pseudo-elementos que já ampliam a área (por exemplo, `.cl-tab .esc a::after` nos Clientes e o cartão inteiro do `.c-nome` no celular), recortes e alvos vizinhos por cima. Os números estão arredondados para baixo (a varredura soma 0,5 px na borda).
- **Espaçamento:** a menor distância entre a área de toque do alvo e a do alvo vizinho mais perto (0 = encostados, como os botões PDF e Word dos Modelos).
- **WCAG 2.5.8 (AA, 24 px):** o alvo passa se tem 24 × 24 px ou mais, ou se o círculo de 24 px no centro dele não toca outro alvo nem o círculo de outro alvo pequeno (a exceção de espaçamento).
- Ferramenta: `_fonte/comum.ts` (função `alvos`) e `_fonte/medir.spec.ts`; os dados crus estão em `_fonte/medidas-antes.jsonl`, `_fonte/medidas-depois.jsonl` e nos `-extras.jsonl` (ficha do cliente); os da versão 1 ficam em `_fonte/v1/`, e a lista de **todos** os alvos, um por linha, em `alvos.csv`.

## Resumo

| Largura | Telas com alvo | Alvos | Abaixo de 44 px hoje | Abaixo de 24 px hoje | Falham a 2.5.8 hoje | Abaixo de 44 px com a proposta | Abaixo de 24 px com a proposta |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 800 | 38 | 158 | **78** (49%) | 1 | 0 | 0 | 0 |
| 1024 | 38 | 154 | **81** (53%) | 1 | 0 | 0 | 0 |
| 1280 | 38 | 162 | **89** (55%) | 1 | 0 | 0 | 0 |
| 1440 | 38 | 162 | **88** (54%) | 1 | 0 | 0 | 0 |
| 390 (celular) | 38 | 157 | **53** (34%) | 1 | 0 | 0 | 0 |
| 320 (celular) | 38 | 157 | **52** (33%) | 1 | 0 | 0 | 0 |
| **Total** | | **950** | **441** | **6** | **0** | **0** | 0 |

- **Hoje, 441 dos 950 alvos medidos (46%) ficam abaixo de 44 px.** No computador são de 78 a 89 por largura; no celular, 53 a 390 e 52 a 320.
- **Abaixo de 24 px: 1 alvo por largura**, o mesmo em todas: o nome do caso na tabela de êxito de A receber ("Pereira x Mercado Bom Preço", 178 × 19 px, um link de texto sem área ampliada). Ele passa a 2.5.8 pela exceção de espaçamento: o vizinho mais perto está a 230 px ou mais.
- **Nenhum alvo falha a WCAG 2.5.8 (AA) hoje.** O que falta é o 2.5.5 (AAA, 44 px), que é o padrão do próprio desenho do Gabinete ("Alvos de 44 px ou mais", `conceito-gabinete.md`, seção 4) e da variável `--alvo:44px` do `console.css`.
- **Com a proposta (`PLANO.md`), nenhum alvo fica abaixo de 44 px**, em nenhuma largura, e nenhum alvo encosta área com outro a ponto de roubar toque (a varredura mede cada alvo depois do ajuste e todos dão 44 px ou mais pelo centro).

## O que fica abaixo de 44 px hoje, por tipo

Altura × largura da área de toque, por largura de tela. "Espaço" é a menor distância até a área do alvo vizinho.

| Seletor | Onde aparece | Contexto | Quantos (todas as larguras) | Área de toque hoje (altura × largura) | Espaço até o vizinho | Exemplos |
| --- | --- | --- | --- | --- | --- | --- |
| `button.btn.btn-sec.btn-compacto` | /contratos/contratos/:id (2), /contratos/modelos, /equipe, /equipe (2), /financeiro/a-receber/contratos/:id, /financeiro/caixa/emprestimos/:id, /financeiro/caixa/emprestimos/:id (2), Financeiro · A pagar, Financeiro · A pagar (2), Financeiro · A pagar (3), Financeiro · A receber, Financeiro · A receber (2), Financeiro · A receber (3), Repasses · ficha do repasse | tabela | 125 | 36 × 58 a 167 | 0 px | Baixar em PDF (para mandar ou imprimir):; Registrar recebimento de Construtora Val |
| `a` | /clientes (2), /clientes (3), /financeiro/relatorios/clientes, Conversas · Automações, Ficha do cliente · casos, Ficha do cliente · contratos, Ficha do cliente · propostas, Financeiro · A pagar (2), Financeiro · A receber, Financeiro · A receber (2), Financeiro · A receber (3) | tabela | 86 | 19 a 41 × 87 a 302 | 34 px | Construtora Vale Alto Ltda.; Hélio Batista Corrêa |
| `button.btn.btn-sec.btn-compacto` | /contratos/contratos/:id (2), /financeiro/a-receber/contratos/:id, Financeiro · A pagar, Financeiro · A pagar (2), Financeiro · A pagar (3), Financeiro · A receber, Financeiro · A receber (2), Financeiro · A receber (3), Repasses · ficha do repasse | cartões | 58 | 36 × 97 a 297 | 5 px | Registrar recebimento de Construtora Val; Mudar valor ou dia de Aluguel da sala |
| `button.btn.btn-pri.btn-compacto` | /contratos/modelos, /meu-escritorio, Financeiro · A receber (2) | tabela | 24 | 36 × 90 a 172 | 7 px | Conferir o êxito de Joana Pereira; Pagar a fatura de dezembro de 2026 |
| `a` | Financeiro · A pagar (2), Financeiro · A receber, Financeiro · A receber (2), Financeiro · A receber (3) | cartões | 20 | 19 a 33 × 81 a 177 | 87 px | Construtora Vale Alto Ltda.; Aluguel da sala |
| `a.pe-nome` | Jurídico · Petições | tabela | 16 | 40 × 133 a 169 | 19 px | Recurso ordinário; Contestação cível |
| `button.btn.btn-sec.btn-compacto` | /financeiro/caixa/emprestimos/:id, /financeiro/caixa/emprestimos/:id (2) | lista | 15 | 36 × 100 a 100 | 160 px | Anexar o comprovante da devolução de 03/; Anexar o comprovante da parcela 17/40 |
| `a.oe-nome` | /equipe | tabela | 12 | 24 a 25 × 89 a 113 | 71 px | Marina Ribeiro , abrir a ficha; Felipe Matos , abrir a ficha |
| `a.pe-nome` | Jurídico · Petições | cartões | 8 | 40 × 137 a 169 | 36 px | Recurso ordinário; Contestação cível |
| `button.btn.btn-pri.btn-compacto` | /contratos/modelos, Financeiro · A receber (2) | cartões | 8 | 36 × 226 a 290 | 30 px | Conferir o êxito de Joana Pereira; Anexar o assinado : o contrato de Benedi |
| `a.btn.btn-sec.btn-compacto.pe-bx` | Jurídico · Petições | tabela | 8 | 36 × 44 a 44 | 63 px | Abrir Pedido de prazo, Oliveira x Banco ; Abrir Manifestação simples, Andrade x Un |
| `button.btn.btn-perigo.btn-compacto` | /equipe | tabela | 8 | 36 × 70 a 70 | 5 px | Retirar Felipe Matos da equipe; Retirar Gustavo Lima da equipe |
| `button.btn.btn-fantasma.btn-compacto` | Repasses · ficha do repasse | tabela | 8 | 36 × 92 a 92 | 7 px | Dispensar o repasse de Honorários de êxi; Dispensar o repasse de Dr. Rui Tavares |
| `a.btn.btn-sec.btn-compacto` | Conversas · Automações (2), Conversas · Avisos automáticos | tabela | 6 | 36 × 132 a 132 | 81 px | Corrigir na ficha |
| `a.btn.btn-sec.btn-compacto.pe-bx` | Jurídico · Petições | cartões | 4 | 36 × 44 a 44 | 46 px | Abrir Pedido de prazo, Oliveira x Banco ; Abrir Manifestação simples, Andrade x Un |
| `button.btn.btn-fantasma.btn-compacto` | Repasses · ficha do repasse | cartões | 4 | 36 × 250 a 290 | 7 px | Dispensar o repasse de Honorários de êxi; Dispensar o repasse de Dr. Rui Tavares |
| `button.btn.btn-sec.btn-compacto.pe-bx` | Jurídico · Petições | tabela | 4 | 36 × 44 a 44 | 59 px | Baixar Recurso ordinário, Pereira x Merc |
| `a.btn.btn-pri.btn-compacto` | Jurídico · Petições | tabela | 4 | 36 × 74 a 74 | 59 px | Revisar Contestação cível, Souza x Const |
| `button.btn.btn-sec.btn-compacto.pz-bot` | Repasses · ficha do repasse | tabela | 4 | 36 × 157 a 157 | 181 px | Anotar o atraso de Dr. Rui Tavares |
| `a.btn.btn-sec` | /clientes (3) | tabela | 4 | 40 × 174 a 174 | 189 px | Gerar proposta para Daniela Rocha Mendes |
| `a` | Conversas · Automações | lista | 3 | 35 × 188 a 258 | 272 px | Parcela em atraso; Cobrança gentil de parcela em atraso |
| `button.btn.btn-sec.btn-compacto.pe-bx` | Jurídico · Petições | cartões | 2 | 36 × 44 a 44 | 57 px | Baixar Recurso ordinário, Pereira x Merc |
| `a.btn.btn-pri.btn-compacto` | Jurídico · Petições | cartões | 2 | 36 × 72 a 74 | 46 px | Revisar Contestação cível, Souza x Const |
| `button.btn.btn-sec.btn-compacto.pz-bot` | Repasses · ficha do repasse | cartões | 2 | 36 × 157 a 157 | 36 px | Anotar o atraso de Dr. Rui Tavares |
| `a.em-selo-link` | Financeiro · A pagar (3) | cartões | 2 | 38 × 155 a 155 | 83 px | Empréstimo · 19/40: abrir a ficha de Ban |
| `a.btn.btn-sec` | /clientes (3) | lista | 2 | 40 × 220 a 290 | 29 px | Gerar proposta para Daniela Rocha Mendes |
| `a.em-selo-link` | Financeiro · A pagar (3) | tabela | 2 | 38 × 155 a 155 | 306 px | Empréstimo · 19/40: abrir a ficha de Ban |

Leitura:

- **O grosso é o botão compacto (`.btn-compacto`), com 36 px de altura**, nas colunas de ação: Registrar (A receber e parcelas), Paga (A pagar), Mudar e Encerrar (recorrentes), Mudar áreas e Retirar (Equipe), Pagar a fatura (Meu escritório), Baixar, Abrir e Revisar (Petições), Anexar o assinado, Word e PDF (Modelos), Feito, Dispensar e Anotar o atraso (Repasses), Não foi paga (ficha do contrato), Corrigir na ficha (Avisos e histórico das Automações), Anexar comprovante (empréstimos) e Conferir o êxito. A largura dele já passa de 44 px (o menor, o ícone de Baixar das Petições, tem 44); falta só a altura.
- **No celular o compacto também tem 36 px.** O `console.css` pede 44 px abaixo de 760 px (linha 285, `.co .btn-compacto{min-height:var(--alvo)}`), mas a regra da linha 621 (`.co .btn-compacto{min-height:36px}`), mais abaixo no arquivo e com o mesmo peso, desfaz isso. Por isso, no mesmo cartão, "Registrar" tem 36 px e "Criar o contrato" (`.btn` comum) tem 44.
- **Links de nome nas células** (cliente, conta, pessoa, caso): de 19 a 42 px de altura. Alguns já têm área ampliada por pseudo-elemento (Clientes, 38 px; A receber, 32 px), mas não chegam a 44. O `a.oe-nome` da Equipe tem 24 px no computador (no celular, 44).
- **Outros casos isolados:** `.fl-passo-l .btn` ("Gerar proposta" no Próximo passo dos Clientes, 40 px de propósito, `portal.css` linha 5343), `a.pe-nome` das Petições (a caixa tem 44 px, mas só 40 recebem o toque: os 4 de baixo ficam sob o `<small>` da linha seguinte, por causa da margem negativa), `a.em-selo-link` de A pagar (o selo do empréstimo, 38 px) e o link da lista de avisos das Automações no celular (36 px).

## O que já tem 44 px ou mais

| Seletor | Contexto | Quantos |
| --- | --- | --- |
| `a` | tabela | 92 |
| `a.c-nome` | lista | 58 |
| `a` | cartões | 56 |
| `select.entrada` | tabela | 52 |
| `a.pe-caso` | tabela | 28 |
| `select.entrada` | cartões | 26 |
| `a.jr-nome` | tabela | 20 |
| `a.pe-caso` | cartões | 16 |
| `button.btn.btn-sec.btn-compacto` | cartões | 16 |
| `a.btn.btn-pri` | cartões | 15 |
| `button.btn.btn-sec` | cartões | 15 |
| `button.jr-link.fi-doc-bt` | tabela | 14 |
| `button.jr-link.fi-doc-bt` | cartões | 12 |
| `a.jr-nome` | cartões | 10 |
| `button.btn.btn-sec` | lista | 8 |
| `button.btn.btn-pri` | lista | 8 |
| `a.rb-link` | cartões | 8 |
| `button.cv-ver` | tabela | 8 |
| `a.fl-ir` | tabela | 8 |
| `a.btn.btn-sec` | lista | 6 |
| `a.oe-nome` | lista | 6 |
| `button.btn.btn-sec` | tabela | 5 |
| `button.cv-ver` | lista | 4 |
| `button.btn.btn-perigo` | lista | 4 |
| `button.btn.btn-perigo` | tabela | 4 |
| `a.rb-link` | tabela | 4 |
| `a.btn.btn-pri` | tabela | 3 |
| `button.btn.btn-perigo` | cartões | 2 |
| `a` | lista | 1 |

São os links que já seguem o padrão `min-height:44px` (às vezes com margem negativa, como o `.cv-ver`, para a linha não crescer): `.cv-ver`, `.pe-caso`, `.fi-docs .fi-doc-bt` e `.jr-nome`; também, os botões comuns (`.btn` sem `-compacto`), os campos de Ligar as colunas (`select.entrada`, 44 px) e, no celular, os nomes que abrem o cartão inteiro (`a.c-nome`). As cópias `pt-sobe` que têm alvo (o "Anexar" da nota em A pagar) usam o `fi-doc-bt` e já têm 44 px; as outras cópias são só texto.

## Altura das linhas e faixas

- **Computador (800 a 1440): nenhuma tabela mudou de altura, nenhuma linha mudou de altura e nenhum alvo mudou de tamanho visível** com a proposta (0 diferenças em 180 medidas de tabela). As fotos de antes e depois do computador são idênticas pixel a pixel (conferido nas fotos de 1024 e 1280).
- **Celular (390 e 320):** 11 tabelas a 390 e 11 a 320 em modo cartões ficaram mais altas, só pelos 8 px a mais de cada botão compacto:

| Tela | Tabela | Altura da tabela antes → depois | Média do cartão antes → depois |
| --- | --- | --- | --- |
| Financeiro · A pagar · 390 | `a-pagar` | 738 → 754 px | 354.8 → 362.8 px |
| Financeiro · A pagar · 320 | `a-pagar` | 738 → 754 px | 354.8 → 362.8 px |
| Financeiro · A receber · 390 | `a-receber` | 1488 → 1520 px | 234.6 → 239.9 px |
| Financeiro · A receber · 320 | `a-receber` | 1650 → 1682 px | 261.7 → 267 px |
| Financeiro · A receber (2) · 390 | `exito` | 353 → 361 px | 336.7 → 344.7 px |
| Financeiro · A receber (2) · 390 | `a-receber` | 774 → 790 px | 179.5 → 183.5 px |
| Financeiro · A receber (2) · 320 | `exito` | 370 → 378 px | 354.1 → 362.1 px |
| Financeiro · A receber (2) · 320 | `a-receber` | 829 → 845 px | 193.3 → 197.3 px |
| Financeiro · A pagar (2) · 390 | `recorrentes` | 885 → 909 px | 281.7 → 289.7 px |
| Financeiro · A pagar (2) · 320 | `recorrentes` | 885 → 909 px | 281.7 → 289.7 px |
| /financeiro/a-receber/contratos/:id · 390 | `parcelas` | 1174 → 1182 px | 280.6 → 282.6 px |
| /financeiro/a-receber/contratos/:id · 320 | `parcelas` | 1192 → 1200 px | 284.9 → 286.9 px |
| /contratos/modelos · 390 | `procuracoes` | 1394 → 1418 px | 335.4 → 341.4 px |
| /contratos/modelos · 320 | `procuracoes` | 1529 → 1553 px | 369.3 → 375.3 px |
| Financeiro · A pagar (3) · 390 | `a-pagar` | 327 → 335 px | 310.8 → 318.8 px |
| Financeiro · A pagar (3) · 320 | `a-pagar` | 344 → 352 px | 328.4 → 336.4 px |
| Repasses · ficha do repasse · 390 | `hn-tab.fi-tab` | 776 → 824 px | 245.4 → 261.4 px |
| Repasses · ficha do repasse · 320 | `hn-tab.fi-tab` | 776 → 824 px | 245.4 → 261.4 px |
| Financeiro · A receber (3) · 390 | `a-receber` | 379 → 387 px | 175.7 → 179.7 px |
| Financeiro · A receber (3) · 320 | `a-receber` | 379 → 387 px | 175.7 → 179.7 px |
| /contratos/contratos/:id (2) · 390 | `ficha-pagas-antes` | 476 → 492 px | 224.2 → 232.2 px |
| /contratos/contratos/:id (2) · 320 | `ficha-pagas-antes` | 503 → 519 px | 237.4 → 245.4 px |

- **Faixas do F3.124 (`data-sai3`, `data-sai2`, `data-cartoes`):** não mudam. A área de toque do computador é um `::after` com `position:absolute`, fora do fluxo, então não entra no mínimo de nenhuma coluna. Conferido rodando o `tests/e2e/portal-tabelas.spec.ts` inteiro com a proposta aplicada: 50 de 50 testes passaram (faixas em N e N − 1 com dados longos, transbordo, respiro, grades que descem, axe por nível, cópias que sobem, E4 e E5). Nenhuma coluna passa a sair em outra largura.

## Ficha do cliente (`fl-tab`), nova na versão 2

| Tela | Largura | Alvos | Menor área hoje (altura) | Abaixo de 44 hoje | Menor área com a proposta | Abaixo de 44 com a proposta |
| --- | --- | --- | --- | --- | --- | --- |
| Ficha do cliente · casos | 320 | 3 | 118 | 0 | 118 | 0 |
| Ficha do cliente · casos | 390 | 3 | 107 | 0 | 107 | 0 |
| Ficha do cliente · casos | 800 | 3 | 107 | 0 | 107 | 0 |
| Ficha do cliente · casos | 1024 | 3 | 107 | 0 | 107 | 0 |
| Ficha do cliente · casos | 1280 | 3 | 39 | 3 | 45 | 0 |
| Ficha do cliente · casos | 1440 | 3 | 39 | 3 | 45 | 0 |
| Ficha do cliente · contratos | 320 | 2 | 44 | 0 | 44 | 0 |
| Ficha do cliente · contratos | 390 | 2 | 44 | 0 | 44 | 0 |
| Ficha do cliente · contratos | 800 | 2 | 44 | 0 | 44 | 0 |
| Ficha do cliente · contratos | 1024 | 2 | 44 | 0 | 44 | 0 |
| Ficha do cliente · contratos | 1280 | 2 | 39 | 1 | 45 | 0 |
| Ficha do cliente · contratos | 1440 | 2 | 39 | 1 | 45 | 0 |
| Ficha do cliente · propostas | 320 | 4 | 107 | 0 | 107 | 0 |
| Ficha do cliente · propostas | 390 | 4 | 107 | 0 | 107 | 0 |
| Ficha do cliente · propostas | 800 | 4 | 107 | 0 | 107 | 0 |
| Ficha do cliente · propostas | 1024 | 4 | 107 | 0 | 107 | 0 |
| Ficha do cliente · propostas | 1280 | 8 | 39 | 4 | 45 | 0 |
| Ficha do cliente · propostas | 1440 | 8 | 39 | 4 | 45 | 0 |

A regra antiga `.fl-tab .fl-num a::after` (`portal.css` 5298) dava 36 a 38 px ao número da proposta ou do contrato. Ela sai, e a regra nova cobre essas tabelas: 44 px ou mais em todas as larguras.

## Agenda do celular, nova na versão 2

A lista da Agenda no celular é um `.so-cel` sem `.cartoes`. A regra da versão 1 (`:is(td,.so-cel)`) a alcançava e passava por cima do `.ag-it a.t::after{inset:0}`, que faz o cartão inteiro abrir o compromisso. A da versão 2 só alcança `.cartoes.so-cel` e `.cb-cartoes.so-cel`. Medido com os dados da revisão (`_fonte/extras.spec.ts`, teste "Agenda"):

| Versão | Largura | Vista | Cartão | Canto de baixo do cartão abre a ficha | Dias do mês (largura) | Borda direita de um dia abre o vizinho |
| --- | --- | --- | --- | --- | --- | --- |
| hoje | 390 | mes | 266 × 79 | sim | 42 (45.7 px) | 0 de 36 pares |
| hoje | 390 | semana | 266 × 79 | sim | - | - |
| hoje | 320 | mes | 196 × 98 | sim | 42 (35.7 px) | 0 de 36 pares |
| hoje | 320 | semana | 196 × 98 | sim | - | - |
| proposta v1 | 390 | mes | 266 × 79 | **não** | 42 (45.7 px) | 0 de 36 pares |
| proposta v1 | 390 | semana | 266 × 79 | **não** | - | - |
| proposta v1 | 320 | mes | 196 × 98 | **não** | 42 (35.7 px) | 36 de 36 pares |
| proposta v1 | 320 | semana | 196 × 98 | **não** | - | - |
| proposta v2 | 390 | mes | 266 × 79 | sim | 42 (45.7 px) | 0 de 36 pares |
| proposta v2 | 390 | semana | 266 × 79 | sim | - | - |
| proposta v2 | 320 | mes | 196 × 98 | sim | 42 (35.7 px) | 0 de 36 pares |
| proposta v2 | 320 | semana | 196 × 98 | sim | - | - |

Com a versão 2, a Agenda fica igual a hoje: o canto do cartão abre a ficha, e nenhum dia abre o vizinho, a 390 e a 320. A versão 1 quebrava as duas coisas: o canto deixava de abrir a ficha nas quatro medidas, e a 320 a borda de cada dia abria o vizinho (36 de 36 pares).

## Arquivos

- `alvos.csv`: todos os alvos, um por linha (modo, tela, endereço, largura, tabela, contexto, seletor, nome acessível, área de toque, caixa desenhada, espaço até o vizinho, passa a 2.5.8, dentro de cópia `pt-sobe`).
- `_fonte/medidas-antes.jsonl`, `_fonte/medidas-depois.jsonl`, `_fonte/medidas-*-extras.jsonl` e `_fonte/agenda-*.jsonl`: os dados crus da versão 2. Os da versão 1 estão em `_fonte/v1/`.
