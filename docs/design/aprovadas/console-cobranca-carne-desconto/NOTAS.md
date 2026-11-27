# D41 · CO-10 no carnê: o desconto de entrada só nas parcelas do prazo

Desenho para a Carol aprovar, feito em 27/11/2026 a partir do `plano-v2.md` (seções 1, 4.1 e 4.2). Ainda não é para programar.

**O problema.** Hoje o carnê nasce com um valor só, repetido nas 12 parcelas. Com desconto de entrada, ou o desconto fica de fora, ou vale o ano inteiro. O Pix e o boleto avulsos já fazem a conta certa, mês a mês.

**A regra do desenho.** Cada parcela tem o valor da sua competência, com a mesma conta do Pix e do boleto: mensalidade + pessoas a mais − desconto. O desconto entra só nas parcelas até a fatura do "até", que conta das 3 primeiras faturas reais, e é calculado só sobre a mensalidade. O carnê passa a ter **faixas de valor**, escritas por uma regra só no Console, no Portal e no PDF: "3 parcelas de R$ 399,20 e 9 de R$ 499,00" (no PDF e nas comparações, "3 × R$ 399,20 e 9 × R$ 499,00").

Seguem as 5 recomendações da seção 9 do plano, já aprovadas pela Carol:

1. mudar o desconto com o carnê em uso troca o carnê, com confirmação;
2. a pessoa a mais é contada no dia em que o carnê nasce;
3. o nome na tela, na fatura e no PDF é "Desconto de entrada";
4. o prazo do desconto conta das 3 primeiras faturas reais;
5. o carnê novo de 12 parcelas não repete mês pago adiantado: pula esse mês e vai um mês mais longe.

O contorno tracejado em âmbar marca o que é novo e existe só no desenho. As peças já aprovadas ficam sem contorno.

## Como abrir

Abra `index.html`. Ele mostra as capturas de cada estado, no computador (1440 px) e no celular (412 px), cada uma com a sua legenda. Clique numa captura para abrir o HTML naquele estado e estreite a janela para ver a versão de celular.

| Arquivo | O que é |
|---|---|
| `ficha.html` | Console › ficha do escritório › aba Assinatura (estados 1 a 10) |
| `cobranca.html` | Console › Cobrança › Fatura (estado 11) |
| `portal-escritorio.html` | Portal › Escritório › "Plano e faturas", visto pela sócia dona (estados 12 e 13) |
| `carne-a4.html`, `fatura-a4.html`, `recibo-a4.html` | Os PDFs em A4 (estado 14). Ctrl+P salva como PDF |
| `carne-desconto-exemplo.pdf`, `fatura-carne-desconto-exemplo.pdf`, `recibo-carne-desconto-exemplo.pdf` | Os PDFs de verdade, impressos pelo Chromium |
| `_conferencia.json` | O resultado das conferências (axe, alvos, rolagem, contraste e QR) |
| `_fonte/` | Os geradores. `sh _fonte/gerar.sh <pasta>` refaz tudo; o cabeçalho do `gerar.sh` diz do que ele precisa |

As páginas partem das telas aprovadas mais recentes, em `docs/design/aprovadas/cobranca-pdfs/` (ficha, cobrança e Portal), e os geradores aprovados de `console-cobranca` e `cobranca-pdfs` estão copiados sem mudança em `_fonte/aprovado-cb/` e `_fonte/aprovado-pdf/`. A única diferença está no caminho do repositório. Os estados aprovados continuam nas páginas, iguais.

## Preços e exemplos

Os preços vêm da revisão de preços (`precos/revisao.md`):

- Essencial: R$ 299,00, até 3 pessoas;
- Escritório: R$ 499,00, até 6 pessoas;
- Banca: R$ 749,00, até 10 pessoas;
- pessoa a mais: R$ 69,00 por mês.

O dia de hoje no desenho é 27/11/2026.

| Conta | Parcela |
|---|---|
| Escritório com 20% de desconto | R$ 499,00 − R$ 99,80 = **R$ 399,20** |
| Escritório com 30% de desconto | R$ 499,00 − R$ 149,70 = **R$ 349,30** |
| Escritório com 1 pessoa a mais e 20% | R$ 499,00 + R$ 69,00 − R$ 99,80 = **R$ 468,20**; sem o desconto, R$ 568,00 |
| Banca com 20% | R$ 749,00 − R$ 149,80 = **R$ 599,20** |

| Escritório | Onde aparece | Situação |
|---|---|---|
| Jatobá Advocacia | Console | Escritório novo. Ganhou 20% até a fatura de fevereiro de 2027 e paga todo dia 10. Na implantação (04/11), o desconto era "até janeiro"; o escritório passou para Ativo em 18/11, a 1ª fatura virou dezembro e o sistema ajustou o prazo para fevereiro. Carnê 2026/2027: 3 × R$ 399,20 e 9 × R$ 499,00, total R$ 5.688,60 |
| Umbu Advocacia | Console | Pagou dezembro por Pix, já com o desconto. O carnê nasce em janeiro: 2 × R$ 399,20 e 10 × R$ 499,00 |
| Cajá Advocacia | Console | Pagou dezembro e pagou fevereiro adiantado. O dia de vencimento muda de 10 para 20. O carnê novo vai de janeiro de 2027 a janeiro de 2028 e pula fevereiro: 1 × R$ 399,20 e 11 × R$ 499,00 |
| Murici | Console | Em implantação, ainda sem carnê |
| Ribeiro & Matos | Portal | Vem de outro sistema e tem 30% até fevereiro: 3 × R$ 349,30 e 9 × R$ 499,00. A parcela 1 foi paga em 25/11. Com 7 pessoas desde 25/11, o T3jus gera o carnê 2027: 2 × R$ 418,30 e 10 × R$ 568,00 |

## Os 14 estados (21 capturas, cada uma no computador e no celular)

A numeração é a da seção 4.2 do plano.

| # | Captura | Endereço | O que mostra |
|---|---|---|---|
| 1 | carne-desconto | `ficha.html?aba=assinatura&estado=cb-carne-desconto` | Mostra a folha do carnê com as faixas. A tira tem duas cores e uma legenda: "Parcelas 1 a 3 · dez/2026 a fev/2027 · com o desconto de entrada" e "Parcelas 4 a 12 · valor cheio". Cada canhoto mostra o seu valor. Os canhotos com desconto têm o selo "com desconto de entrada", com ícone e texto, sem depender só da cor. O "Como funciona" foi reescrito para o desconto. Em "Mudanças da assinatura", o carnê aparece com as faixas e o sistema ajusta o prazo |
| 2 | carne-desconto-meio | `…estado=cb-carne-desconto-meio` | Mostra o carnê que começa no meio do desconto, com 2 + 10 parcelas. A nota explica que dezembro foi pago por Pix, já com o desconto |
| 3 | carne-pulou-adiantada | `…estado=cb-carne-pulou-adiantada` | Mostra o carnê novo do Cajá. No lugar de fevereiro aparece "fora deste carnê · paga adiantada no carnê 2026/2027", e a nota diz que nenhum mês fica sem parcela nem com duas. O carnê antigo aparece abaixo como "Substituído" |
| 4 | editar-desconto | `…estado=cb-editar-carne-desconto` | Editar com Carnê e desconto. A ajuda diz: "No carnê, o desconto vale só nas parcelas até a fatura de…". Uma prévia das faixas é calculada na tela. A ajuda do motivo passa a dizer "Aparece na fatura do escritório. Escreva para o cliente ler." |
| 4b | editar-desconto-erros | `…estado=cb-editar-carne-desconto-erros` | Mostra o erro de 100%: "No carnê, o desconto vai até 99%.", junto do campo e no resumo. A prévia espera o valor ficar certo |
| 5 | desconto-troca | `…estado=cb-desconto-troca` | O `alertdialog` "Mudar o desconto troca o carnê" (20% → 30%) mostra: Hoje → Novo com as faixas; uma tabela mês a mês do que muda; as parcelas canceladas; que dezembro, já emitida, não muda; o e-mail; e o motivo escrito pelo sistema. O foco começa em "Cancelar" |
| 5b | desconto-troca-feito | `…estado=cb-desconto-troca-feito` | Mostra o resultado: o aviso "Assinatura salva e carnê trocado.", o carnê 2027 (2 × R$ 349,30 e 10 × R$ 499,00) e o antigo como "Substituído" |
| 6 | desconto-troca-pessoas | `…estado=cb-desconto-troca-pessoas` | É a mesma troca, com 7 pessoas. Uma linha a mais diz: "O carnê novo conta as pessoas de hoje: 7…". O carnê novo fica 2 × R$ 418,30 e 10 × R$ 568,00 |
| 7 | carne-novo-faixas | `…estado=cb-carne-novo-faixas` | O estado 40 revisto: "Gerar um carnê novo" com Hoje → Novo em faixas. O desconto continua nas 2 parcelas que faltam: 2 × R$ 468,20 e 10 × R$ 568,00 |
| 8 | carne-valor-mudou | `…estado=cb-carne-valor-mudou` | O aviso do estado 38 revisto. Ele compara o mesmo mês: "A parcela de janeiro está em R$ 399,20, e a mensalidade de janeiro hoje é R$ 468,20 (7 pessoas, 1 a mais)". O fim do desconto não acende o aviso |
| 9 | mudar-plano-carne | `…estado=cb-mudar-plano-carne` | Mudar de plano mostra a conta da 1ª parcela no plano novo ("Desconto de entrada (20% da mensalidade, 2ª de 3)") e a prévia do carnê novo no Banca: 2 × R$ 599,20 e 10 × R$ 749,00 |
| 10 | carne-historico | `…estado=cb-carne-historico` | "Mudanças da assinatura" mostra: o carnê gerado com as faixas, a mudança do desconto, a troca do carnê com o motivo do sistema e o ajuste do prazo ao passar para Ativo |
| 11 | fatura-desconto | `cobranca.html?aba=fatura&estado=carne-desconto` | O estado 19 revisto, com a fatura nº 2026/0203. Os itens são a mensalidade da parcela 1 de 12 e o "Desconto de entrada (20% da mensalidade)" − R$ 99,80, com o motivo entre aspas. Total: R$ 399,20 |
| 11b | fatura-desconto-pessoa | `…estado=carne-desconto-pessoa` | A fatura de janeiro do carnê 2027 traz a pessoa a mais "(7 ativas em 27/11/2026, no dia do carnê; 6 incluídas)". Total: R$ 468,20, como sai em 21/12/2026 |
| 12 | portal-desconto | `portal-escritorio.html?estado=cb-carne-desconto` | O Portal mostra "Próxima parcela 2 de 12 · R$ 349,30", o carnê com faixas e selos, e uma nota sobre até quando vai o desconto |
| 13 | portal-trocado | `…estado=cb-carne-trocado-desconto` | O aviso "Seu carnê mudou em 27/11/2026: use o carnê 2027 a partir de janeiro." vem com o motivo em palavras simples. Abaixo, o carnê 2027 e o antigo como "Substituído", com as parcelas canceladas para consulta |
| 14 | pdf-carne-desconto | `carne-a4.html?estado=carne-desconto` | Na capa, as faixas, o total e a lista com o valor de cada parcela e a marca "desc.". Cada parcela tem a conta "R$ 499,00 − R$ 99,80 do desconto de entrada (20%)" no canhoto e na via, com o Pix e o boleto do seu valor |
| 14 | pdf-carne-trocado | `carne-a4.html?estado=carne-trocado-desconto` | É o carnê antigo baixado depois da troca. A parcela 1 vale. As parcelas 2 a 12 dizem "Cancelada em 27/11/2026. Não pague.", sem códigos. O carnê que vale no lugar aparece descrito com as faixas |
| 14 | pdf-fatura-desconto | `fatura-a4.html?estado=fatura-carne-desconto` | A fatura da parcela traz a linha do desconto e o motivo. O Pix é o mesmo do canhoto 1 |
| 14 | pdf-fatura-pessoa | `fatura-a4.html?estado=fatura-carne-desconto-pessoa` | A fatura com a pessoa a mais "do dia do carnê" |
| 14 | pdf-recibo-desconto | `recibo-a4.html?estado=recibo-carne-desconto` | O recibo da parcela 1 do Ribeiro & Matos (R$ 349,30) traz a linha do desconto e o motivo |

## O que este desenho substitui no que já foi aprovado

Em `docs/design/aprovadas/console-cobranca/NOTAS.md`:

- **Decisão 16 (linha 215)**, "12 parcelas, uma por mês, **todas com o mesmo valor**", passa a ser: "12 parcelas, uma por mês, **cada uma com o valor da sua competência** (a conta do Pix e do boleto)". Sem desconto e sem mudança de pessoas, o carnê continua com um valor só ("12 parcelas de R$ 499,00").
- **Regra "O valor da parcela fica fixo" (linha 232)**: a primeira frase continua. A parcela não muda depois de gerada, e a mudança de pessoas só entra num carnê novo, com aviso (estado 8). Sai a frase "**O mesmo vale para o fim de um desconto**". O fim do desconto já está nas parcelas desde o dia em que o carnê nasce, então não pede carnê novo nem acende o aviso (plano, 1.9). Também entra uma regra nova: **mudar o desconto com o carnê em uso troca o carnê, com confirmação** (estados 5, 5b e 6).
- **Regra do carnê novo (linhas 229 e 230)**: continua, com duas mudanças. O carnê novo não repete mês pago adiantado: pula esse mês e termina um mês depois (estado 3). E a pessoa a mais é contada no dia em que o carnê nasce (estados 6, 11b e 13).

Estados revistos:

| Estado aprovado | Vira | O que muda |
|---|---|---|
| 19 · fatura-carne | 11 e 11b | O item único vira itens: mensalidade, desconto com motivo e pessoa a mais "no dia do carnê" |
| 38 · assinatura-carne | 1 e 8 | Os canhotos ganham o valor e o selo. O resumo e o histórico passam a usar faixas. O aviso de valor compara o mesmo mês |
| 39 · assinatura-editar-carne | 4, 4b e 5 | A ajuda do desconto e a prévia das faixas. O motivo "aparece na fatura". O desconto vai de 1 a 99% com Carnê. Salvar com carnê em uso pede confirmação |
| 40 · assinatura-carne-novo | 7 | "12 × R$ 490,00 → 12 × R$ 529,00" vira Hoje → Novo em faixas, com a tabela mês a mês |
| 46 · portal-carne | 12 e 13 | A próxima parcela com o valor dela. O carnê com faixas e selos. O aviso de carnê trocado |
| "Como funciona o carnê" (aside dos estados 38 a 40) | 1 | Ganha o item do desconto de entrada e o de "mudou o plano, o dia ou o desconto" |

Em `docs/design/aprovadas/cobranca-pdfs/` (o carnê do Pequi, "12 × R$ 490,00"), a capa e a tabela do PDF do carnê passam a mostrar faixas e o valor de cada parcela, e o carnê substituto aparece descrito com faixas (estado 14). A fatura e o recibo já tinham o item do desconto com motivo: só entra a marca da parcela do carnê.

Um ajuste pequeno nas peças aprovadas: no Portal, os links de telefone e e-mail da equipe ("Dados do escritório") tinham 32 px de altura e agora têm 44 px. Só a altura muda.

## Conferência (`_conferencia.json`)

- São 42 capturas (21 estados × computador e celular). O axe (WCAG 2.0, 2.1 e 2.2, níveis A e AA) não achou **nenhuma violação**. Também não houve rolagem lateral, erro de script nem alvo menor que 44 px. O botão compacto das tabelas, que tem 36 px no computador, segue o padrão aprovado.
- **Contraste AA** dos pares de cor novos, todos com razão de 4,5 ou mais:
  - selo "com desconto de entrada" e a marca "desc." do PDF: #4F1D35 sobre #F2CDB3;
  - selo "Substituído", valor cancelado e motivo escrito pelo sistema: sobre #F2ECE8;
  - nota e legenda das faixas: #6E5562 sobre branco.
- **PDFs**: o carnê tem 5 páginas A4 e os 12 QR, lidos de volta da imagem do PDF, são iguais ao copia e cola de cada parcela. A fatura tem 1 página e 1 QR igual ao canhoto 1. O recibo tem 1 página e nenhum QR.

## Para quem for programar

- O plano, na seção 5.1, usa a pessoa a mais de R$ 39,00 (43820, 53800 e o total 615660). Com os R$ 69,00 da revisão de preços, os números passam a ser 46820, 56800 e o total 651660. Veja a pergunta 5.
- O texto das faixas sai de `textoFaixas` (domínio) e de `carne_faixas` (servidor), como no plano. Os exemplos e as contas em centavos estão em `_fonte/d41_dados.py`, com `assert`.

## Perguntas para a Carol (cada uma com a recomendação)

1. **O selo do canhoto diz "com desconto de entrada". Pode ser mais curto, só "desconto"?** Recomendo manter o texto inteiro. "Desconto" sozinho parece uma promoção do mês. O nome inteiro é o mesmo da fatura e do PDF e cabe em duas linhas no canhoto do celular. No PDF, que tem pouco espaço, a lista da capa usa "desc.".
2. **No Portal, o carnê substituído continua à vista, abaixo do carnê novo (estado 13). Até quando?** Recomendo deixar à vista até a última parcela válida dele ser paga (no exemplo, já paga) ou por 60 dias. Depois ele vai para um "Carnês anteriores" fechado. A dona precisa ver, no começo, quais páginas descartar.
3. **O motivo do desconto aparece para o escritório na fatura, no recibo e no "Seu plano" do Portal. Pode?** Recomendo que sim, como o PDF aprovado já faz. Por isso a ajuda do campo passa a dizer "Aparece na fatura do escritório. Escreva para o cliente ler." O motivo da **troca do carnê**, escrito pelo sistema, fica só no Console.
4. **Quem baixa o carnê antigo depois da troca recebe o PDF com as parcelas canceladas marcadas "Não pague", sem códigos (estado 14, carnê trocado). Fica assim, ou o Portal deixa de oferecer o carnê antigo?** Recomendo como está desenhado: o PDF antigo continua disponível, marcado. Quem guardou a cópia impressa reconhece a página, e o PDF diz qual carnê vale no lugar.
5. **Os testes do plano (seção 5.1) usam pessoa a mais de R$ 39,00. Trocamos para R$ 69,00, o preço da revisão?** Recomendo trocar: 46820 e 56800, total 651660, os mesmos números deste desenho. Assim o teste, a tela e o PDF conferem os mesmos valores.
