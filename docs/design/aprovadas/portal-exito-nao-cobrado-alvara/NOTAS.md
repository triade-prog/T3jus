# Portal: o êxito marcado como "não cobrado" na divisão do alvará (F3.191, D40) · notas

> **Aprovado pela Carol em 26/11/2026 às 22h11 (Bahia), com "Aprovado" e sem mudanças.** As recomendações das dúvidas valem como decisões, com a C1 = (a), "Cobrar com motivo escrito". Desenho = D40; programar = F3.191 (CH-07, FI-05), na migration `1104`, depois da F3.199 (D39, `portal-exito-alvara-conferir`).

Desenho para a Carol aprovar, feito a partir do plano v5 (`t3jus/f3-191-192/plano.md`, Parte C), com a decisão dela na C1: "Cobrar com motivo escrito". Segue `docs/IDENTIDADE.md`, `docs/design/conceito-gabinete.md` e o design system D2. A linguagem é a do `eb-` aprovado (F3.174, `portal-exito-baixado-alvara`), que já está no código (`FinanceiroRepasses.tsx`). Nada foi programado.

## Como abrir

- `index.html`: todos os estados, com a imagem do computador (1440) e a do celular (390) lado a lado, a legenda e o link para o HTML naquele estado.
- As telas vivas (abaixo de 760 px viram celular):
  - `financeiro.html?estado=enc-…`: a janela "Registrar alvará ou RPV" e a ficha do repasse;
  - `sino.html?estado=enc-sino…`: o sino;
  - `caso.html?estado=enc-…`: a ficha do contrato, a ficha do caso e a ficha do cliente.
- `<estado>-computador.png` e `<estado>-celular.png`: as capturas em escala 2. Os `.webp` são as mesmas imagens, menores, usadas no index. Quando há uma janela aberta, a captura cresce até mostrar a janela inteira.
- `_conferencia.json`: axe (WCAG 2.0, 2.1 e 2.2, A e AA), rolagem lateral, alvos menores que 44 px e erros de script, por estado e tamanho.
- `_fonte/gerar.sh <pasta>` refaz tudo. As bases são lidas sem mudança:
  - `exito_baixado.py`, `comum.py`, `financeiro.py`, `relatorios.py`, `dados.py` e `fotos.cjs` vêm de `portal-exito-baixado-alvara`;
  - `fechamento.py`, `jornada.py`, `ficha_ligada.py`, `clientes.py` e `juridico.py` vêm de `portal-fechamento-sem-levantamento`;
  - `sino_caso.py`, `sino.py`, `base.py` e `extra.py` vêm de `portal-sino-caso-encerrado`.
- Os geradores novos são `enc_repasses.py`, `enc_sino.py`, `enc_caso.py`, `casos_enc.py` e `enc_index.py`. Cada um executa a base até o começo dos estados dela e monta só os estados `enc-`.

## Os dados fictícios

São o escritório, a data e o elenco do D35: Ribeiro & Matos, quarta-feira, 18/11/2026, às 10h12, com Marina Ribeiro (sócia dona), Diego Almeida (Comercial e Financeiro) e Larissa Costa (só Jurídico).

- **O caso (plano C5):** Sebastião Prado, contrato C-2026-034, só 20% do êxito, caso "Prado x Seguradora Lince", acordo de R$ 15.000,00. O êxito calculado é de R$ 3.000,00.
- **A responsável é Larissa Costa, só com a área Jurídico** (decidido na revisão; veja a dúvida 2).
- **Em 10/11/2026, Marina** encerrou o caso com acordo e conferiu o êxito: "Não cobrar", motivo Perdoado, com a explicação "Sebastião indicou três clientes; combinamos não cobrar o êxito.".
- **Hoje, Diego** registra um alvará de R$ 15.000,00. O combinado novo: "Sebastião aceitou pagar o êxito com este alvará, por telefone em 17/11.".
- **Avisados:** Marina (conferiu e encerrou, uma vez só) e Larissa (responsável). Diego, que cobra, não recebe.
- **Inventado para o desenho:**
  - a explicação do `enc-indevido`: "O acordo foi só sobre danos morais, que o contrato não cobre.";
  - o número do processo, a vara e o telefone;
  - no `enc-resumo-fechado`, o repasse às 15h05, a leitura da prestação às 15h40 e o encerramento por Marina às 16h20, tudo em 18/11.

## Estados (12 do plano e 4 variações, cada um no computador e no celular)

| # | Estado | Quem | O que mostra |
|---|---|---|---|
| 1 | `enc-proposta` | Diego | A divisão vem sem a linha de honorários, e Sebastião fica com R$ 15.000,00. Abaixo da tabela, dentro do quadro "Divisão proposta pelo contrato C-2026-034", vem o aviso âmbar e o grupo de dois cartões, sem nada marcado. |
| 2 | `enc-indevido` | Diego | Com o motivo Indevido, não há grupo de rádio. O aviso diz que a divisão não tem os honorários e manda falar com Marina, e não lançar como "Outro". |
| 3 | `enc-sem` | Diego | "Deixar sem os honorários" está marcado, com a nota em `role="status"`. |
| 4 | `enc-cobrar` | Diego | "Cobrar os honorários neste alvará" está marcado.<br>• A linha volta com R$ 3.000,00, a regra do servidor e o teto.<br>• Abre o quadro com o combinado (vazio) e a caixa.<br>• Sebastião fica com R$ 12.000,00. |
| 5 | `enc-erro` | Diego | Registrar sem escolher: o resumo no topo e o erro do grupo. |
| 5b | `enc-erro-cobrar` | Diego | **Variação**, que o plano deixava nas notas. Com "Cobrar", três erros ao mesmo tempo: valor acima do calculado (R$ 3.500,00), combinado vazio e caixa sem marcar. Cada erro fica preso ao seu campo, e o resumo tem três links. |
| 6 | `enc-conflito` | Diego | A recusa `EXITO_MUDOU` (`tipo: 'NAO_COBRADO'`): Marina marcou o êxito como não cobrado às 10h13. "Ver a divisão refeita" recebe o foco. |
| 7 | `enc-historico` | Marina | A ficha do repasse registrado com "Cobrar":<br>• a linha dos honorários;<br>• o subtítulo;<br>• a linha do histórico com o combinado;<br>• o fechamento;<br>• a prévia da prestação de contas. |
| 7b | `enc-historico-sem` | Marina | **Variação:** a ficha do repasse registrado com "Deixar sem". |
| 8 | `enc-sino` | Marina | O sino de quem tem o Financeiro: o valor, o calculado e o combinado, com "Abrir o repasse". |
| 8b | `enc-sino-larissa` | Larissa | O sino de quem não tem o Financeiro: sem valor, sem calculado e sem combinado, com "Abrir o caso". |
| 9 | `enc-caso-historico` | Marina | O "De onde veio" na ficha do contrato em Financeiro › A receber, com a linha nova. |
| 10 | `enc-acerto` | Marina | A ficha do caso no Jurídico, com "Acerto no Financeiro" (veja a dúvida 1). |
| 10b | `enc-acerto-larissa` | Larissa | **Variação:** o mesmo acerto sem valores. |
| 11 | `enc-resumo-fechado` | Marina | O caso encerrado. A linha do êxito fica na folha "Fechamento do caso" da ficha do repasse (veja a dúvida 1). |
| 12 | `enc-ficha-cliente` | Marina | A ficha de Sebastião, aba Casos, no âmbar "Fechar o caso". O passo "Conferir o êxito" diz que o êxito foi cobrado no alvará. |

## Os textos exatos

### Janela "Registrar alvará ou RPV" (Diego)

- **Aviso (Perdoado), dentro do quadro "Divisão"** (`section.eb-aviso`, com `h3`):
  - **Título:** "O êxito de Sebastião foi marcado como não cobrado."
  - **Detalhe:** "Êxito · Prado x Seguradora Lince · 20% · R$ 3.000,00 calculados · perdoado, por Marina Ribeiro em 10/11/2026."
  - **Explicação, entre aspas:** "Sebastião indicou três clientes; combinamos não cobrar o êxito."
  - **Orientação (frase nova, que não está no plano):** "Por isso, a divisão veio sem os honorários do êxito. Escolha se fica assim ou se eles são cobrados neste alvará, com o acordo de Sebastião."
- **Grupo** (`fieldset.eb-ops`), com a legenda "O que fazer com os honorários do êxito de Sebastião":
  - **"Deixar sem os honorários"**, com a ajuda "Os R$ 15.000,00 ficam com Sebastião, como decidido na conferência.";
  - **"Cobrar os honorários neste alvará"**, com a ajuda "Só cobre se Sebastião concordou. A prestação de contas vai mostrar os honorários, e Marina Ribeiro e Larissa Costa recebem um aviso. Se o combinado virou parcelas novas em Contratos, cobrar aqui cobra duas vezes.". A última frase aparece só com Perdoado.
- **"Deixar sem", nota** (`role="status"`): "Os honorários ficam fora da divisão. O êxito de Sebastião continua não cobrado, e isso fica no histórico do repasse."
- **"Cobrar":**
  - **a linha da tabela:** "Honorários de êxito", com a regra "20% · acordo · contrato C-2026-034 · combinado com Sebastião" e o teto "Até R$ 3.000,00, o êxito calculado na conferência.". O teto fica ligado ao campo do valor por `aria-describedby`;
  - **o campo:** "O que foi combinado com Sebastião", com `textarea` de até 1.000 letras e a ajuda "Fica na ficha do repasse e na ficha do contrato. O cliente vê os honorários na prestação de contas." (trocada na revisão; veja a dúvida 3);
  - **a caixa:** "Sebastião concordou com a cobrança destes honorários."
- **Indevido:**
  - **título:** "O êxito de Sebastião foi marcado como não devido na conferência.";
  - **detalhe:** o mesmo, com "indevido, por Marina Ribeiro em 10/11/2026.", e a explicação entre aspas;
  - **orientação:** "Por isso, a divisão não tem os honorários do êxito, e eles não podem ser cobrados neste alvará.";
  - **quadro branco, com o ícone de pessoas:** "Se foi um engano, fale com Marina Ribeiro. Por enquanto, o T3jus não refaz a conferência: registre o alvará assim e não lance os honorários como “Outro”." (decidido na revisão)
- **Erros:**
  - **resumo:** "Falta acertar 1 coisa." (ou "3 coisas"), com "Nada foi registrado ainda." e os links:
    - "Escolha o que fazer com os honorários do êxito de Sebastião.";
    - "Os honorários passam do êxito calculado na conferência.";
    - "Escreva o que foi combinado com Sebastião.";
    - "Confirme que Sebastião concordou com a cobrança.";
  - **do grupo:** "Escolha o que fazer com os honorários do êxito de Sebastião: deixar sem ou cobrar neste alvará.";
  - **do combinado:** "Escreva o que foi combinado com Sebastião, com pelo menos 3 letras.";
  - **da caixa:** "Confirme que Sebastião concordou com a cobrança.";
  - **do valor:** "Os honorários passam do êxito calculado na conferência (R$ 3.000,00)."
- **Conflito:**
  - **título:** "Marina Ribeiro marcou o êxito de Sebastião como não cobrado às 10h13.";
  - **texto:** "Nada foi registrado. Veja a divisão refeita: ela fica sem os honorários do êxito.";
  - **no lugar da divisão:** "A divisão saiu daqui porque o êxito de Sebastião mudou. O que entrou, o caso, o valor e o dia continuam como você escreveu.";
  - **botão:** "Ver a divisão refeita".
- **Confirmação (sem estado próprio):** "Alvará registrado. R$ 15.000,00 de terceiros. R$ 12.000,00 para Sebastião, até 24/11. Os honorários do êxito foram cobrados, e o combinado ficou na ficha do repasse." (decidido na revisão)

### Ficha do repasse (Marina)

- **Subtítulo de "Para onde vai cada parte":**
  - com "Cobrar": "Com os honorários do êxito, cobrados por Diego com o combinado com Sebastião.";
  - com "Deixar sem": "Sem os honorários do êxito: o êxito foi marcado como não cobrado na conferência."
- **Linha dos honorários:** "Honorários de êxito · Escritório · 20% · acordo · contrato C-2026-034 · combinado com Sebastião", com R$ 3.000,00 e o selo "A transferir".
- **Histórico, com "Cobrar":** "Honorários do êxito cobrados neste alvará, com o combinado com Sebastião: “Sebastião aceitou pagar o êxito com este alvará, por telefone em 17/11.” Na conferência, o êxito tinha sido marcado como não cobrado (perdoado, por Marina Ribeiro em 10/11)."
  - **Embaixo:** "Diego Almeida, ao registrar o alvará · Sebastião concordou, segundo Diego". O "segundo Diego" fica (decidido na revisão): deixa claro que a concordância é declarada (risco C8.3).
  - **A linha do registro:** "Diego Almeida registrou Alvará de R$ 15.000,00", com "com os honorários do êxito cobrados" no lugar de "divisão ajustada à mão".
- **Histórico, com "Deixar sem":** "Registrado sem os honorários do êxito: o êxito de Sebastião foi marcado como não cobrado na conferência (perdoado, por Marina Ribeiro em 10/11)."
- **Fechamento do caso:**
  - **com "Cobrar":** "Êxito de Sebastião cobrado no alvará de 18/11 (não cobrado na conferência)", com "R$ 3.000,00 · por Diego Almeida, com o combinado com Sebastião · na conferência: perdoado, por Marina Ribeiro em 10/11";
  - **com "Deixar sem":** "Êxito do contrato C-2026-034: não cobrado", com "perdoado, por Marina Ribeiro em 10/11 · deixado fora do alvará ao registrar".
- **Prestação de contas (prévia):**
  - Valor recebido R$ 15.000,00;
  - Honorários de êxito − R$ 3.000,00;
  - Fica para você R$ 12.000,00.

  É a conta de hoje (`contaPrestacao`), que usa o nome da parte, e não a regra.

### Sino

- **Marina (com o Financeiro):**
  - **título:** "**Diego Almeida** cobrou no alvará os honorários do êxito de Sebastião Prado";
  - **detalhe:** "Estava como não cobrado (perdoado). R$ 3.000,00 de R$ 3.000,00 calculados. Combinado: “Sebastião aceitou pagar o êxito com este alvará, por telefone em 17/11.” Prado x Seguradora Lince.";
  - **selo:** "Cobrado no alvará" (atenção);
  - **onde:** "Abrir o repasse".
- **Larissa (sem o Financeiro):**
  - **título:** "**Diego Almeida** cobrou no alvará os honorários do êxito de Sebastião Prado, que estava como não cobrado";
  - **detalhe:** "Na conferência, o motivo foi perdoado. Prado x Seguradora Lince. Os valores ficam com o Financeiro.";
  - **selo:** o mesmo;
  - **onde:** "Abrir o caso".
- **O ícone** é a balança, como os avisos do êxito de hoje. O plano escreve "Diego" e "Sebastião"; o sino de hoje usa o nome inteiro (`d.quem`, `d.cliente`), então ficou o nome inteiro.

### Telas do caso

- **"De onde veio":** "**Diego Almeida** cobrou no alvará de 18/11 os honorários do êxito de Sebastião, que estava como não cobrado", com o selo "Novo" e o detalhe "R$ 3.000,00 · “Sebastião aceitou pagar o êxito com este alvará, por telefone em 17/11.”".
- **O vazio das parcelas, no contrato só de êxito:** "O contrato é só de êxito. O êxito foi marcado como não cobrado na conferência, e os honorários foram cobrados no alvará de 18/11, na ficha do repasse."
  - **No âmbar:** "O êxito foi cobrado no alvará de 18/11. Os honorários vão ao caixa pela ficha do repasse.", com "Abrir o repasse".
- **Acerto no Financeiro (ficha do caso):** "Êxito não cobrado · cobrado no alvará".
  - **Embaixo, com o Financeiro:** "Não cobrado por Marina em 10/11 · R$ 3.000,00 cobrados por Diego em 18/11";
  - **sem o Financeiro:** "Não cobrado por Marina em 10/11 · cobrado por Diego em 18/11".
- **Ficha do cliente, passo "Conferir o êxito":** "Não cobrado, por Marina em 10/11 · cobrado no alvará de 18/11, por Diego".
- **Os textos do plano para o quadro e o resumo da ficha do contrato** (desenhados em outro lugar, veja a dúvida 1):
  - **quadro:** "Êxito de Sebastião não cobrado na conferência · cobrado no alvará de 18/11", com o sub "R$ 3.000,00 · por Diego", ou só "por Diego" sem o Financeiro;
  - **resumo:** "Êxito de Sebastião cobrado no alvará de 18/11 (não cobrado na conferência)".

## Variações só nas notas

- **Outro:** o detalhe diz "outro, por Marina Ribeiro em 10/11/2026.", e a ajuda do "Cobrar" fica sem a frase das parcelas novas.
- **Cliente excluído:** o aviso fica sem a linha entre aspas, e o "De onde veio" fica sem o combinado.
- **Já cobrado em parte:** o detalhe ganha "Já foram cobrados R$ 1.000,00 deste êxito no alvará de 05/11. Dá para cobrar até R$ 2.000,00.", e o teto da linha diz "Até R$ 2.000,00, o que falta do êxito calculado na conferência.".
- **Três avisados**, quando quem encerrou é outra pessoa: "…, e Marina Ribeiro, Felipe Matos e Larissa Costa recebem um aviso.".
- **As recusas do Portal antigo** (`EXITO_NAO_COBRADO`, `EXITO_INDEVIDO`, `EXITO_ACIMA_DO_CALCULADO`) usam os textos de reserva, no resumo de erros.

## Decisões de design

1. **Reaproveita o eb- sem mudança:** o aviso, os cartões, a nota, o resumo de erros, o conflito e o pé empilhado no celular. As peças novas (`enc-`) são só:
   - o quadro branco do "Cobrar", com o combinado e a caixa;
   - o teto e o erro dentro da linha dos honorários;
   - o quadro do Indevido.
2. **O combinado e a caixa abrem dentro do grupo, logo abaixo das opções**, como o "Por que desfazer" do eb-. Ficam numa folha branca, para separar o que a pessoa escreve do que o sistema avisa.
3. **O teto aparece na própria linha dos honorários.** É ali que a pessoa muda o valor, e o erro do valor também fica ali.
4. **O erro do grupo fica em tinta sobre o âmbar,** como no eb-, porque o #AC3F6B daria 3,9:1. Os erros dentro da folha branca do "Cobrar" voltam ao #AC3F6B (5,7:1). Os dois têm o ícone, e nenhum depende só de cor.
5. **No Indevido, não há botão desabilitado nem opção escondida em cinza.** O aviso diz o porquê e o caminho.
6. **"Cobrado no alvará" é sempre texto.** O selo do sino também tem o texto.

## Acessibilidade (WCAG 2.2 AA)

- **axe:** 0 violações nos 32 casos (16 estados × 2 tamanhos). Nenhum caso tem rolagem lateral a 390 px nem erro de script. O único "alvo pequeno" é a marca "T3jus" da moldura aprovada (204×24).
- **O aviso** é uma `section` com `aria-labelledby` no `h3`. O `fieldset.rp-div` aponta para o texto do aviso (`#eb-aviso`).
- **O grupo** é um `fieldset` com `legend`. No erro, ele tem `aria-describedby` para a mensagem, e os rádios têm `aria-invalid`.
- **O combinado** é um `textarea` com `label`. O `aria-describedby` aponta para a ajuda e, no erro, também para a mensagem, com `aria-invalid`.
- **A caixa "concordou"** é um `checkbox` dentro do `label` (o rótulo inteiro é o alvo, com 44 px ou mais). No erro, tem `aria-invalid` e `aria-describedby` para a mensagem.
- **O valor dos honorários** aponta para o teto e, no erro, também para a mensagem.
- **O foco no erro** vai ao primeiro campo com problema. Cada link do resumo leva ao seu campo.
- **O conflito** é `role="alert"`, e o foco vai para "Ver a divisão refeita". A nota do "Deixar sem" e a soma são `role="status"`.
- **O "R$"** nunca quebra do número (espaço não separável).

## Onde o desenho saiu do plano

1. **`enc-acerto` e `enc-resumo-fechado`** (dúvida 1).
2. **Quatro variações viraram estados:** `enc-erro-cobrar`, `enc-historico-sem`, `enc-sino-larissa` e `enc-acerto-larissa`.
3. **"são avisadas" virou "recebem um aviso"** (dúvida 4).
4. **Entrou uma frase de orientação no aviso:** "Por isso, a divisão veio sem os honorários…". Ela tem o mesmo papel da orientação do eb-.
5. **A pasta:** o plano pedia `portal-exito-nao-cobrado-divisao`. Decidido na revisão: fica `portal-exito-nao-cobrado-alvara`, e o plano acompanha.

## Dúvidas (com o que a revisão e o coordenador decidiram)

1. **O quadro do acerto e o resumo do fechado, na ficha do contrato, nunca aparecem num caso com alvará.**
   - **O que acontece hoje:** em `FechamentoCaso.tsx`, a ficha do contrato só mostra `gruposDoQuadro` e `resumoFechado` sem levantamento. `comLevantamento` vale para o caso inteiro (`caso_acerto_quadro`, 1010:709). Com alvará, a folha mostra só "O fechamento deste caso fica na ficha do repasse". Como o "Cobrar" sempre vem com um alvará, as linhas novas do quadro e do resumo não apareceriam.
   - **O que desenhei:**
     - o acerto na ficha do caso no Jurídico (`itensDoAcerto`, que funciona com alvará);
     - o resumo do fechado na folha "Fechamento do caso" da ficha do repasse, onde o eb- já pôs o êxito com baixa mantido (`fechamentoExitoMantido`).
   - **Proposta:**
     - a cobrança entra na folha do repasse;
     - as trocas em `caso_acerto_quadro` e no quadro e resumo da ui saem do plano, ou ficam só para consistência dos dados;
     - o `cobradoNoAlvara` de `caso_resumo_acerto` e de `cliente_fechamento` continua, porque essas duas telas aparecem.
2. **A responsável sem a área Financeiro.** No elenco aprovado (D35, `eb-conflito`) Bianca tem Contratos e Financeiro. **Decidido:** a responsável do exemplo é Larissa Costa, só com o Jurídico, para manter um elenco só. Os estados viraram `enc-sino-larissa` e `enc-acerto-larissa`.
3. **"Fica na prestação de contas do repasse", na ajuda do combinado.**
   - A prestação que vai ao cliente (`contaPrestacao`) usa o nome da parte ("Honorários de êxito − R$ 3.000,00"), e não a regra reescrita nem o texto do combinado. O cliente vê o desconto, mas não o "combinado com Sebastião".
   - **Decidido:** a ajuda virou "Fica na ficha do repasse e na ficha do contrato. O cliente vê os honorários na prestação de contas.", e a confirmação diz "e o combinado ficou na ficha do repasse". Se a Carol quiser que o cliente leia o combinado na prestação, isso é mudança na `contaPrestacao`, e precisa de item.
4. **"são avisadas" → "recebem um aviso".** "Avisadas" erra quando a lista tem homens, por exemplo com Felipe Matos. **Decidido:** "recebem um aviso".
5. **O selo do sino:** desenhei "Cobrado no alvará" no tom de atenção, porque o aviso pede o olhar de quem decidiu não cobrar. O plano não dizia o tom. **Decidido:** atenção, como "Valor mudou" no sino de hoje.
6. **O nome do passo "Repassar a Sebastião"** na ficha do cliente foi escrito pelo desenho. Conferido na revisão: o código dá `Repassar a ${primeiro}` (`fichaLigada.ts:216`). A linha do "Conferir o êxito" é a do plano.
7. **O desenho paralelo da F3.199 (`ea-`, em `telas/portal-exito-alvara-conferir/`)** usa a mesma base (o `_fonte` do eb- aprovado) e a mesma janela. Não foi mexido. Vale ver os dois juntos antes da aprovação: o `ea-` trata o êxito para conferir ou lançado, e o `enc-` trata o não cobrado, então os avisos nunca aparecem os dois na mesma divisão.
