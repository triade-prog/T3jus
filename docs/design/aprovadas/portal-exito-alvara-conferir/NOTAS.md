# Portal: o êxito lançado depois do alvará já nasce pago (F3.199, D39) · notas

> **Aprovado pela Carol em 26/11/2026 às 22h11 (Bahia), com "Aprovado" e sem mudanças.** As recomendações valem como decisões, com a C2 (o "Não cobrar" é recusado quando os honorários já entraram pelo alvará) e a C3 ("limitar ao que falta" do êxito lançado, também nos alvarás seguintes). Desenho = D39; programar = F3.199 (CH-07, FI-05), na migration `1102_exito_lancado_pago_pelo_alvara.sql`, com os campos `semLimite` e `pagou` da revisão do desenho.

Este foi o desenho para a Carol aprovar. Ele parte do plano v5 (`t3jus/f3-191-192/plano.md`, Parte A, seção A4, igual à da v4) e segue `docs/IDENTIDADE.md`, `docs/design/conceito-gabinete.md` e o design system D2. Nada foi programado.

- **C2 está decidida:** com honorários já entrados, o "Não cobrar" é recusado.
- **C3 está decidida (27/11/2026): limitar.** O desenho usa essa opção, "limitar os honorários ao que falta do êxito lançado". O que depende dela traz a marca **[C3]** nestas notas e o selo "Depende da C3" no `index.html`.

## Como abrir

- **`index.html`:** todos os estados lado a lado, cada um com a captura do computador (1440) e a do celular (390), a legenda e o link para o HTML naquele estado. No fim ficam a tabela das duas frases revistas e as decisões e dúvidas.
- **`financeiro.html?estado=ea-…`:** as telas vivas. Abaixo de 760 px, elas viram a versão de celular.
- **`<estado>-computador.png` e `<estado>-celular.png`:** as capturas em escala 2 (Playwright, `chromium.launch()`, `deviceScaleFactor: 2`). Os `.webp` são as mesmas imagens, menores, e é deles que o index usa. Quando há uma janela aberta, a captura cresce até mostrar a janela inteira.
- **`_conferencia.json`:** o resultado do axe (WCAG 2.0, 2.1 e 2.2, níveis A e AA), da rolagem lateral, dos alvos menores que 44 px e dos erros de script, por estado e por tamanho.
- **`_fonte/gerar.sh <pasta>`** refaz tudo.
  - `exito_alvara.py` é o gerador novo, com o prefixo `ea-`.
  - `exito_baixado.py`, `comum.py`, `financeiro.py`, `relatorios.py`, `dados.py`, `fotos.cjs` e `webp.py` são cópias, sem mudança, do D38 aprovado (`docs/design/aprovadas/portal-exito-baixado-alvara/_fonte`).
  - A janela de Repasses e o `eb-proposta` vêm de lá.
  - As janelas "Conferir o êxito" e "Não cobrar este êxito" seguem o código de hoje (`FinanceiroExito.tsx:89-297`), com o CSS `ex-` copiado do `portal.css:4976-5023`. Esse código já é diferente do desenho aprovado em `portal-exito-conferir`: o pé é `ex-pe`, há o cabeçalho "De onde veio" e o responsável é fixo.

## Os dados fictícios (A4 do plano)

O escritório é o Ribeiro & Matos, na quarta-feira, 18/11/2026. Aparecem Diego Almeida (Comercial e Financeiro) e Marina Ribeiro (sócia dona).

- **Helena Duarte:** contrato C-2026-027, caso "Duarte x Construtora Atlas", processo 1004417-58.2026.8.26.0100, êxito de 30%.
- **Em 12/11,** Diego registrou um alvará de R$ 16.000,00, com R$ 4.800,00 de honorários. Os honorários foram transferidos em 13/11, e Helena recebeu R$ 11.200,00 em 16/11.
- **Em 17/11, às 16h40,** Marina encerrou o caso com Acordo. O êxito calculado é de R$ 4.800,00 (30% de R$ 16.000,00) e está "para conferir". O pagamento previsto, e o vencimento sugerido, é 15/12/2026.

## Estados (11, cada um no computador e no celular)

| # | Estado | Quem | O que mostra |
|---|---|---|---|
| 1 | `ea-conferir` | Diego | A janela "Conferir o êxito" de hoje, com o aviso novo no fim do corpo, logo acima de "Lançar em A receber". |
| 1b | `ea-conferir-sobra` | Diego | Variação: o lançado fica em R$ 3.000,00, com o motivo. O aviso vira de atenção e pede a devolução. Vale nos dois caminhos da C3. |
| 1c | `ea-conferir-dois` | Diego | Variação: dois alvarás, com a lista dos dois. |
| 3 | `ea-nao-cobrar` | Diego | A recusa do "Não cobrar" (C2 decidida). |
| 2 | `ea-lancado` | Diego | Depois de lançar, em A receber: a confirmação, e nenhuma parcela nova. |
| 4 | `ea-proposta` | Diego | Repasses, "Registrar alvará ou RPV", com o êxito `PARA_CONFERIR`: a linha curta na célula de honorários. |
| 4b | `ea-proposta-sem-conferencia` | Diego | O mesmo, com o caso ainda em andamento (`SEM_CONFERENCIA`). É o que Diego viu em 12/11. |
| 5 | `ea-repasse` | Marina | A ficha do repasse do alvará de 12/11, com a linha nova do histórico. |
| 6 | `ea-exito-pago` **[C3]** | Diego | Um segundo alvará, de R$ 5.000,00, com o êxito já pago: a divisão vem sem honorários, e o aviso fica abaixo da tabela. |
| 6b | `ea-exito-falta` **[C3]** | Diego | Variação: falta R$ 1.800,00 do êxito. Num segundo alvará de R$ 10.000,00, os honorários ficam limitados a R$ 1.800,00. |
| 7 | `eb-proposta-parte` **[C3]** | Diego | A variação "paga em parte" do `eb-proposta` aprovado (D38), revista: a linha de honorários passa de R$ 4.800,00 para R$ 3.800,00. |

Os estados 1b, 1c, 4b e 6b eram variações "nas notas" no plano. Eu desenhei cada um como estado próprio, para a Carol ver o texto no lugar.

## Textos exatos

### 1. `ea-conferir`: o aviso informativo (Aviso `info`, `id="cf-alvara"`)

- **Título:** "Já entraram R$ 4.800,00 de honorários do êxito de Helena, pelo alvará de 12/11/2026."
- **Texto:** "Ao lançar, a parcela do êxito nasce paga por esses honorários. Se o valor lançado for maior, o resto fica em A receber."
- **Ação:** o link "Ver o alvará de 12/11 em Repasses", que leva à ficha do repasse.

O aviso fica no lugar da frase "o honorário sai na divisão de Repasses" (`:217`). Com honorários já entrados, essa frase não aparece. O botão "Lançar em A receber" aponta para o aviso por `aria-describedby`.

### 1b. `ea-conferir-sobra`: o lançado é R$ 3.000,00 (Aviso `atencao`)

- **Título:** o mesmo do estado 1.
- **Texto:**
  - "Ao lançar, a parcela do êxito nasce paga por esses honorários."
  - "Os honorários do alvará passam do êxito lançado em R$ 1.800,00. Esse valor foi descontado de Helena além do êxito. Combine com ela a devolução, que ainda é feita fora do T3jus."
- **O motivo do ajuste** que está preenchido é só exemplo.
- **O tom muda ao vivo** enquanto Diego digita o valor. O aviso tem `role="status"`, então o leitor de tela anuncia a troca.

### 1c. `ea-conferir-dois`: dois alvarás

- **Título:** "Já entraram R$ 4.800,00 de honorários do êxito de Helena, por 2 alvarás."
- **A lista:**
  - "Alvará de 05/11/2026 · R$ 1.800,00";
  - "Alvará de 12/11/2026 · R$ 3.000,00".
- **Texto:** "Ao lançar, a parcela do êxito nasce paga por esses honorários, a começar pelo alvará mais antigo. Se o valor lançado for maior, o resto fica em A receber."
- **No código,** o `Aviso` precisa aceitar uma lista: hoje os filhos dele vão dentro de um `<p>`.

### 2. `ea-lancado`: a confirmação (o toast de sucesso de hoje, em `Financeiro.tsx:155`)

- **Título:** "Êxito lançado e pago em 12/11, pelo alvará."
- **Texto:** "Nada ficou em A receber. R$ 4.800,00 de Helena Duarte, pagos pelos honorários do alvará. Ficou no histórico do caso, do contrato e do repasse."

**Os números de A receber** (revisão, nota 3): "Em aberto" não muda, porque a parcela nasce paga. Como ela foi paga em 12/11, neste mês, "Recebido em novembro" passa de R$ 31.240,00 (19 parcelas) para R$ 36.040,00 (20): a `portal_financeiro_receber` (`0220:198-221`) soma todo pagamento da parcela no mês, sem olhar a caixa.

**Pago em parte (só nas notas):**
- **Título:** "Êxito lançado."
- **Texto:** "R$ 3.000,00 pagos em 12/11, pelo alvará, e R$ 1.800,00 ficam em A receber, com vencimento em 15/12."
- **Na lista,** a parcela aparece como a "lançada agora" do desenho aprovado, com R$ 1.800,00 em aberto.

**Onde a parcela paga aparece:**
- Na ficha do contrato, ela fica "Paga em 12/11", com a linha "pelo alvará de 12/11".
- Se o alvará foi no mês anterior, ela não entra em "Recebidas no mês".

### 3. `ea-nao-cobrar`: a recusa (C2)

- **A descrição da janela:** "Este êxito não pode ficar sem cobrança, porque os honorários dele já entraram. Volte para conferir e lance o êxito de Helena."
- **O aviso de atenção no topo** (`id="nc-recusa"`):
  - **título:** "Os honorários deste êxito já entraram pelo alvará de 12/11 (R$ 4.800,00)."
  - **texto:** "Para não cobrar, o dinheiro teria de voltar para Helena, e isso ainda não é feito pelo T3jus. Lance o êxito: ele nasce pago."
- **O pé:**
  - "Não cobrar" fica `aria-disabled="true"`, com `aria-describedby="nc-recusa"` e o estilo de desabilitado aprovado (tracejado, sem cor de ação);
  - "Voltar para conferir" é o botão principal e recebe o foco.
- **Se o servidor recusar** mesmo assim (corrida), entra `HONORARIOS_JA_ENTRARAM`, com a mensagem do plano: "Os honorários deste êxito já entraram pela divisão do alvará. Lance o êxito: ele nasce pago.". Ela aparece no aviso de urgência que a janela já tem ("Nada mudou no êxito.").

### 4. `ea-proposta`: a linha curta na célula de honorários

A linha tem o ícone de relógio em vinho e o texto em tinta. Ela não é alerta: os honorários continuam na divisão.

- **`PARA_CONFERIR`:** "O êxito de Helena ainda não foi lançado. Estes honorários pagam a parcela quando ela for lançada."
- **`SEM_CONFERENCIA`:** "O caso de Helena ainda não foi encerrado. Estes honorários pagam o êxito quando ele for lançado."
- **`LANCADO` com falta, `PAGO`, `NAO_COBRADO` ou `null`:** esta linha não aparece. `LANCADO` com falta segue com a linha de hoje, "Dá baixa na parcela …". `PAGO` mostra o estado 6. `NAO_COBRADO` fica com a F3.191 (D40).

### 5. `ea-repasse`: a ficha do repasse (Marina)

- **No histórico, dia 18/11/2026 · hoje, às 10h20:** "A parcela do êxito de Helena foi lançada em 18/11 por Diego e paga por esta parte de honorários (R$ 4.800,00)." Embaixo, em letra menor: "Diego Almeida, ao conferir o êxito em A receber".
- **Acréscimos do desenho:**
  - na linha dos honorários, "Pagou a parcela do êxito, lançada em 18/11";
  - no fechamento do caso, "Êxito do contrato C-2026-027: pago por este alvará", com "lançado por Diego Almeida em 18/11 · pago em 12/11" embaixo.

### 6. `ea-exito-pago` **[C3]**

- **A divisão** vem sem a linha de honorários, e Helena fica com R$ 5.000,00.
- **O aviso `info`, abaixo da tabela e dentro do quadro "Divisão"** (`id="ea-limite"`, apontado pelo `aria-describedby` do `fieldset`):
  - **título:** "O êxito de Helena já foi pago (R$ 4.800,00, em 12/11)."
  - **texto:** "Por isso, este alvará não tem honorários do êxito."

### 6b. `ea-exito-falta` **[C3]**

- **O cenário:** o primeiro alvará pagou R$ 3.000,00 dos R$ 4.800,00 lançados.
- **A divisão do segundo alvará, de R$ 10.000,00:**
  - **a linha:** "Honorários de êxito · 30% · acordo · contrato C-2026-027 · até o que falta do êxito", com R$ 1.800,00;
  - **a linha curta de hoje:** "Dá baixa na parcela “Êxito · Duarte x Construtora Atlas” (falta R$ 1.800,00)";
  - **Helena** fica com R$ 8.200,00.
- **O aviso:**
  - **título:** "Falta R$ 1.800,00 do êxito de Helena."
  - **texto:** "Os honorários deste alvará ficam limitados a esse valor. Pelos 30% do contrato, seriam R$ 3.000,00."

  A última frase é acréscimo do desenho.

### 7. `eb-proposta-parte` **[C3]**: a revisão da variação aprovada do D38

- **O cenário:** Rita pagou R$ 1.000,00 e teve baixa sem receber dos R$ 3.800,00 que faltavam. "Desfazer" está marcado.
- **O detalhe do aviso** ganha a linha que o D38 já previa nas notas: "Recebido R$ 1.000,00 de R$ 4.800,00. A baixa sem receber foi dos R$ 3.800,00 que faltavam."
- **A linha de honorários:**
  - passa de R$ 4.800,00 para **R$ 3.800,00**;
  - a regra ganha "· até o que falta do êxito";
  - a célula diz "Paga a parcela do êxito (falta R$ 3.800,00)".
- **Rita** fica com **R$ 11.787,70**, depois das custas de R$ 412,30. Hoje fica com R$ 10.787,70, ou seja, recebe R$ 1.000,00 a mais.
- **A ajuda de "Manter"** passa a dizer "Os R$ 3.800,00 ficam com Rita."

### As duas frases da janela de conferir

Elas só valiam quando o alvará vinha depois da conferência (A1.5). O trecho entre colchetes só entra com a C3 = limitar.

- **`FinanceiroExito.tsx:217`** (Conferir, sem honorários já entrados): "Se o dinheiro do acordo entrar pelo escritório (alvará ou depósito na conta), o honorário sai na divisão de Repasses e paga esta parcela[, até o que faltar dela]." Com honorários já entrados, a frase sai e o aviso do estado 1 toma o lugar.
- **`FinanceiroExito.tsx:291-292`** (Não cobrar, só sem honorários já entrados):
  - **título:** "Se o dinheiro vier por alvará, lance o êxito." (igual ao de hoje);
  - **texto:** "Ele fica em A receber, e os honorários da divisão do alvará, em Repasses, pagam a parcela[, até o que faltar dela]. O caso continua “Encerrado · acerto pendente” no Jurídico até tudo ser recebido e repassado."
  - **O que muda:** sai "é baixado", como já foi feito no D38.

## O que depende da C3

**Com "limitar"** (desenhado):
- `ea-exito-pago`, `ea-exito-falta` e `eb-proposta-parte`;
- os trechos "até o que faltar dela" das duas frases;
- a regra "· até o que falta do êxito".

**Com "só avisar":**
- **Esses três estados saem.** A proposta continua com os 30% inteiros, mesmo com o êxito pago.
- **O `eb-proposta` aprovado fica como está.**
- **A janela de registrar ganha um aviso de atenção** abaixo da tabela, sem mudar o valor. O texto do plano é: "Os honorários passam do que falta do êxito de Helena (R$ 0,00). Combine com ela a devolução." Para não sair "R$ 0,00", sugiro "O êxito de Helena já foi pago (R$ 4.800,00, em 12/11). Se estes honorários forem descontados, combine com ela a devolução." Essa sugestão pede um desenho próprio se a Carol escolher esse caminho.
- **As duas frases terminam em "e paga esta parcela."** e "pagam a parcela."

**Nos dois caminhos:** o `ea-conferir-sobra` fica igual. O limite não cobre o alvará que chegou antes da conferência com o lançado menor, e esse caso fica com a F3.197.

## Decisões de design

1. **No Conferir, o aviso fica no fim do corpo, logo acima do botão "Lançar".** É ali que a pessoa decide, como pede o plano. O tom é `info` quando nada sobra. Vira `atencao` quando há dinheiro a devolver à cliente, porque é dinheiro de terceiros descontado a mais.
2. **No Não cobrar, os campos de motivo e explicação saem quando a recusa já é sabida.** Não há o que enviar, e campos que não podem ser enviados confundem. A janela mostra só o aviso, o alvo e os dois botões.
3. **A linha curta de Repasses não é alerta.** Ela usa o ícone de relógio em vinho e o texto em tinta, porque nada precisa ser escolhido: só informa para onde vão os honorários.
4. **Os avisos de Repasses ficam abaixo da tabela, dentro do quadro "Divisão",** no mesmo lugar do aviso do D38. Na célula fica só a linha curta.
5. **No celular,** o pé da janela de recusa empilha os botões na largura toda, com "Voltar para conferir" embaixo, perto do polegar. A janela de conferir segue o `ex-pe` de hoje, com uma correção da revisão (nota 4): a 390, cada botão de `.ex-pe-dir` fica com a largura do texto (`.janela.fi-larga .ex-pe-dir .btn{width:auto;flex:1 1 auto}`), porque as duas metades iguais cortavam "Lançar em A receber". A mesma regra vai para o `portal.css` no PR.

## Acessibilidade (WCAG 2.2 AA)

- **axe:** 0 violações nos 22 casos (11 estados × 2 tamanhos).
- **Celular:** nenhuma rolagem lateral a 390 px, e nenhum erro de script.
- **O único "alvo pequeno"** listado é a marca "T3jus" da moldura aprovada (204×24), que atende o mínimo de 24 px. Todo o resto tem 44 px ou mais. O link "Ver o alvará de 12/11 em Repasses" tem `min-height: 44px`.
- **Foco visível** com o contorno de 3 px em #AC3F6B, como no D2. Ao abrir a recusa, o foco vai para "Voltar para conferir".
- **Os avisos** usam o `Aviso` do D2, com `role="status"` e um `id`:
  - "Lançar" aponta para `cf-alvara`;
  - "Não cobrar" aponta para `nc-recusa`;
  - o `fieldset` da divisão aponta para `ea-limite`.
- **O "Não cobrar" recusado** é `aria-disabled`, nunca `disabled`. Assim ele continua focável e é lido com o motivo.
- **Contraste:**
  - tinta sobre âmbar #F2CDB3 dá 11,2:1;
  - vinho sobre branco dá 10,6:1;
  - o texto secundário #6E5562 dá 5,5:1 ou mais.
- **O "R$"** nunca se separa do número: o espaço é não separável, e os valores nos avisos vão com `white-space: nowrap`.

## Onde o desenho saiu do plano

1. **O estado `ea-nao-cobrar` foi desenhado e fica:** o plano v5 o lista (A4.3 e D, C2), agora só com a recusa.
2. **Os campos do Não cobrar saem** na recusa (decisão 2). O plano fala só do botão.
3. **Entraram estes acréscimos:**
   - o link "Ver o alvará de 12/11 em Repasses" no aviso do Conferir;
   - "Pagou a parcela do êxito, lançada em 18/11" na ficha;
   - a linha do fechamento do caso;
   - a frase "Pelos 30% do contrato, seriam R$ 3.000,00." no `ea-exito-falta`.
4. **Os textos de uma frase só do plano** viraram título e texto do aviso, sem mudar palavras. Isso vale para os estados 3, 6 e 6b.
5. **No `ea-exito-falta`, o segundo alvará é de R$ 10.000,00, e não de R$ 5.000,00.** Com R$ 5.000,00, os 30% dariam R$ 1.500,00, abaixo dos R$ 1.800,00 que faltam, e o limite não apareceria.
6. **Na célula do `ea-exito-falta`** ficou a frase de hoje ("Dá baixa na parcela…", `FinanceiroRepasses.tsx:667`). O D38 pede "Paga a parcela" e nunca "dá baixa". Vale trocar também essa frase no PR, para ler "Paga a parcela “Êxito · …” (falta R$ 1.800,00)". Fica para a Carol confirmar.
7. **A descrição da janela de recusa é nova:** "Este êxito não pode ficar sem cobrança…". A de hoje diz que o êxito sai da lista, o que não acontece na recusa.
