# Revisão do desenho · o êxito "não cobrado" na divisão do alvará (F3.191, D40, estados `enc-`)

**Revisado em:** 27/11/2026, por um revisor independente (design de produto SaaS e acessibilidade).

**O que foi lido:**
- desta pasta: `index.html`, `financeiro.html`, `sino.html`, `caso.html`, `NOTAS.md`, `_conferencia.json` e `_fonte/` (os geradores novos `enc_*.py` e `casos_enc.py`);
- as capturas dos 16 estados, no computador e no celular;
- o plano `f3-191-192/plano.md` (v5), Parte C, e a `revisao-v4.md`;
- `docs/IDENTIDADE.md`, `docs/design/conceito-gabinete.md` e o aprovado `portal-exito-baixado-alvara` (com a `REVISAO-DESENHO.md` dele, para o formato);
- o desenho irmão `telas/portal-exito-alvara-conferir/` (F3.194, `ea-`), só para ler;
- o código de hoje: `FechamentoCaso.tsx`, `fechamento.ts`, `Financeiro.tsx`, `FinanceiroRepasses.tsx`, `acertoCaso.ts`, `fichaLigada.ts`, `Sino.tsx`, `contaPrestacao` (`domain/src/financeiro.ts:984`) e as migrations 0900, 0901, 1010 e 1100.

Abri as telas no Playwright, a 1440 e a 390, para conferir os `aria-describedby`, o foco no erro, o tamanho da caixa "concordou" e o que a Bianca vê.

## Veredito

**Pronto para a Carol, com as correções abaixo já aplicadas e regeneradas.** O plano precisa de ajustes antes de ser programado (notas 1, 4, 5 e 7). Os pontos leves foram decididos pelo coordenador e aplicados (seção "Decidido pelo coordenador").

O desenho segue o plano v5 com fidelidade:
- os textos da janela, do sino e da ficha do repasse batem com a C5;
- a acessibilidade é boa: todos os `aria-describedby` apontam para ids que existem, os três links do resumo levam ao campo certo, o foco vai ao primeiro campo com erro (`rp-v-0`) e a caixa "concordou" tem 294 × 70 px;
- as contas fecham em todos os estados: 15.000 = 12.000 + 3.000; no erro, 3.500 + 11.500; "até 24/11" respeita o feriado de 20/11, como no `eb-`;
- o axe passa nos 32 casos (16 estados × 2 tamanhos), sem rolagem lateral a 390 e sem erro de script. O único alvo pequeno é a marca "T3jus" da moldura aprovada.

**Não há nota grave.** Havia **3 erros médios no desenho**, já corrigidos (notas 2, 3 e 7), e **4 pontos médios no plano** (notas 1, 4, 5 e 6). A nota 6, o texto do Indevido, foi decidida pelo coordenador e aplicada. O resto é leve.

## Notas

### 1. O quadro do acerto e o resumo do fechado nunca aparecem num caso com alvará · média (plano) · **confirmada, a designer acertou**
- **Evidência no código:**
  - `portal_financeiro_contrato_fechamentos` (`0901:88-98`): quando o caso tem levantamento, a ficha do contrato recebe `comLevantamento: true` e **não recebe o `acerto`**. Só o caso sem levantamento recebe `portal_financeiro_caso_acerto`, que é quem traz `caso_acerto_quadro`;
  - `Financeiro.tsx:826` e `:1110`: `QuadroFechamentoContrato` (o `gruposDoQuadro`) só é montado para `!x.comLevantamento`;
  - `FechamentoCaso.tsx:357-377`: com levantamento, `FechamentoNaLateral` mostra só "O fechamento deste caso fica na ficha do repasse…". O `resumoFechado` (`:400`) fica no ramo sem levantamento.
  - Como o "Cobrar" só existe ao registrar um alvará, **`comLevantamento` é sempre verdadeiro** quando há cobrança. A troca em `caso_acerto_quadro` e a mudança no quadro e no resumo de `fechamento.ts` nunca seriam vistas.
- **O que a designer fez:** pôs o acerto na ficha do caso do Jurídico (`itensDoAcerto`, que funciona com alvará e lê `caso_resumo_acerto`) e o resumo na folha "Fechamento do caso" da ficha do repasse, onde o `eb-` já pôs o êxito com baixa mantido (`fechamentoExitoMantido`, `FinanceiroRepasses.tsx:1310`). As duas escolhas estão certas.
- **O que o plano deve mudar:**
  - **sai da C3.7 e da C4 (Seção 6):** a troca em `caso_acerto_quadro`; sai do `ui` o quadro (`fechamento.ts:199-208`) e o resumo (`:462-464`); sai do domain o `cobradoNoAlvara` do tipo do quadro. Menos uma troca por trecho (risco C8.1);
  - **entra na C4, `baixa.ts`:** `fechamentoExitoCobrado(dados)` e `fechamentoExitoNaoCobrado(dados)`, no molde de `fechamentoExitoMantido`, lidos do histórico do levantamento (`financeiro.levantamento_exito_cobrado` e `…_nao_cobrado`), e montados na folha "Fechamento do caso" da ficha do repasse;
  - **a C5 muda:** o estado 10 é "o acerto na ficha do caso (Jurídico)" e o 11 é "a folha Fechamento do caso, na ficha do repasse";
  - **a C6 muda:** o pgTAP 9 confere só `cliente_fechamento` e `caso_resumo_acerto`; o vitest testa as duas funções novas de `baixa.ts`; o e2e "o quadro e o resumo sem o Financeiro" vira "o acerto da ficha do caso e o sino sem o Financeiro".
  - O `cobradoNoAlvara` de `cliente_fechamento` e de `caso_resumo_acerto` continua: essas duas telas aparecem.

### 2. `enc-acerto-bianca` misturava Bianca e Larissa · média · **aplicada, e depois substituída pela decisão da responsável**
- **Evidência:** a variação usava `quem='juridico'`, a pessoa da moldura aprovada (Larissa Costa, "Área: Jurídico"). O rodapé dizia "Larissa Costa" e a barra lateral não tinha Contratos, num estado que diz ser da Bianca. A coluna dos honorários dizia "Honorários na área Contratos", que é o texto de quem não tem Contratos.
- **Primeira correção:** `quem='bianca'`, com a Bianca de Contratos e Jurídico.
- **Depois, com a decisão do coordenador** (dúvida 2): a responsável passou a ser Larissa Costa, só com o Jurídico. O estado virou `enc-acerto-larissa`, com a moldura da Larissa, e a coluna volta a "Honorários na área Contratos", porque ela não tem Contratos. O mesmo vale para o sino (`enc-sino-larissa`, com os outros avisos da Larissa do sino aprovado) e para os avisados ("Marina Ribeiro e Larissa Costa recebem um aviso").

### 3. "Resultado: Acordo de R$ 15.000,00" na ficha do caso · média · **aplicada**
- **Evidência:** a ficha do caso no Jurídico só guarda o resultado como categoria (`RESULTADOS_CASO`: Ganho, Perda, Acordo, `domain/src/juridico.ts:29`). Não há valor de acordo no caso, e a linha mostrava R$ 15.000,00 à Bianca, que não tem o Financeiro. A data "homologado em 06/11" também não existe no servidor.
- **Correção:** "Acordo · encerrado em 10/11/2026", no molde do aprovado ("Ganho · sentença de 30/10/2026"), nas duas variações. Com isso, quem não tem o Financeiro não vê nenhum valor em nenhum estado: conferi o texto do sino e do acerto sem o Financeiro (0 "R$", sem calculado e sem o combinado).

### 4. O histórico do levantamento não guarda o que as telas mostram · média (plano)
- **Evidência:** as linhas do histórico, o subtítulo e o fechamento dizem "perdoado, por Marina Ribeiro em 10/11" e, no "Deixar sem", "Êxito do contrato C-2026-034". A C3.6 grava `cobranca`, `exito`, `conferidoPor`, `motivo`, `calculado` e `honorarios`, **sem a data da conferência nem o número do contrato**. Para `financeiro.levantamento_exito_nao_cobrado` (C3.4.6), o plano não diz que dados vão.
- **E o combinado:** a revisão v4 diz que "a ficha do repasse lê o combinado da tabela", mas a C4 só lista em `levantamento_historico_dados` o `pessoa_ref` de `conferidoPor`. Nenhuma peça leva o combinado à ficha do repasse.
- **O plano deve dizer:**
  - os dois históricos gravam também `conferidoEm` e `contrato` (o número), como o `eb-` grava `em` e `contrato` de cada baixa (`1100:199-205`);
  - `levantamento_historico_dados` resolve `conferidoPor` e, para `levantamento_exito_cobrado`, junta o `combinado` de `exito_cobrancas_alvara` pela `cobranca`, com `null` para o cliente `EXCLUIDO`. Teste no 151.

### 5. A ficha do contrato ganha textos que o plano não lista · média (plano)
- **Evidência:** `enc-caso-historico` traz, além do "De onde veio", o âmbar "O êxito foi cobrado no alvará de 18/11. Os honorários vão ao caixa pela ficha do repasse." e o vazio das parcelas "O contrato é só de êxito. O êxito foi marcado como não cobrado na conferência, e os honorários foram cobrados no alvará de 18/11, na ficha do repasse.". São bons textos: sem eles, o contrato só de êxito diria "Nada em parcelas" sem explicar.
- **O plano deve listar,** na C4 `ui`, a troca em `dirDoFechamento` e no vazio da ficha do contrato (`Financeiro.tsx`). O dado já chega: a `origem` do fechamento com levantamento traz a ação `financeiro.exito_cobrado_no_alvara` (C3.7). Mais um caso no vitest.

### 6. O Indevido manda "falar com Marina antes de registrar", mas não há o que Marina possa fazer · média · **aplicada (decidido pelo coordenador)**
- **Evidência:** `enc-indevido`: "Se foi um engano, fale com Marina Ribeiro antes de registrar, e não lance os honorários como “Outro”." A conferência não tem volta (`0640:60-75`), e a F3.196 está pendente (C8.4). A frase sugere que a conversa resolve, e o dinheiro de terceiros fica parado sem registro.
- **Aplicado** (`_fonte/enc_repasses.py`): "Se foi um engano, fale com Marina Ribeiro. Por enquanto, o T3jus não refaz a conferência: registre o alvará assim e não lance os honorários como “Outro”." O plano (C5, estado 2) acompanha.

### 7. A ajuda do combinado prometia o texto na prestação de contas · média · **aplicada**
- **Evidência:** `contaPrestacao` (`domain/src/financeiro.ts:984-1001`) monta os descontos com `d.nome` ("Honorários de êxito − R$ 3.000,00"). Não usa a `regra` nem o combinado. A ajuda "Fica na prestação de contas do repasse e na ficha do contrato." dizia ao Diego que o cliente leria o combinado, e isso não acontece.
- **Correção** (`_fonte/enc_repasses.py`): "Fica na ficha do repasse e na ficha do contrato. O cliente vê os honorários na prestação de contas." O `index.html` registra a troca na dúvida 3.
- **Fica para o plano:**
  - a confirmação (C5, "Sem estado próprio") diz "com o combinado na prestação de contas do repasse" e vira "Os honorários do êxito foram cobrados, e o combinado ficou na ficha do repasse." (decidido pelo coordenador; já na `NOTAS.md`);
  - a C3.5.5 diz que "a prestação de contas mostra a cobrança" porque a `regra` é reescrita. A `regra` aparece na ficha do repasse, e não na prestação. O cliente vê só o desconto, e isso basta para o EOAB, art. 34, XXI. A frase deve dizer isso.

### 8. O conflito conta outra história · leve · registrada
- `enc-conflito` diz que Marina marcou o êxito como não cobrado "às 10h13" de hoje, e o resto do desenho diz 10/11. É a natureza do estado (a conferência acontece com a janela aberta), mas a legenda do `index.html` não avisa. **Sugestão:** acrescentar à legenda "Neste estado, a conferência acontece hoje, com a janela aberta."

### 9. Pequenas diferenças com o código de hoje · leve · registradas
- **O acerto na ficha do caso:** hoje o sub segue "valor · por Marina · em 10/11" (`acertoCaso.ts:69-70`). O desenho escreve "Não cobrado por Marina em 10/11 · R$ 3.000,00 cobrados por Diego em 18/11". É mais claro e pode ficar, mas é texto novo para o vitest.
- **`enc-resumo-fechado`:** a prestação diz "18/11 · 15h12 · lida", e o histórico não tem a linha do envio às 15h12, só a leitura às 15h40. Vem da base aprovada.
- **No mesmo estado,** o link "Comprovante" encosta na borda direita da folha a 1440 (direita em 987 px, a mesma da folha). Vem da tabela aprovada e não corta o texto.

### 10. Coerência com o `ea-` (F3.194) · registro
- Os dois desenhos usam a mesma janela e o mesmo molde do `eb-`. Como a NOTAS diz, os avisos nunca aparecem juntos: o `ea-` trata o êxito para conferir ou lançado, e o `enc-` trata o não cobrado.
- **A linguagem é coerente:** o `ea-` diz "pago pelo alvará" (o êxito lançado nasce pago), e o `enc-` diz "cobrado no alvará" (o êxito não cobrado volta a ser cobrado). São fatos diferentes, e a palavra diferente ajuda. Os dois usam "Ver a divisão refeita" no conflito.

## As dúvidas da designer

1. **O quadro e o resumo na ficha do contrato:** confirmado no código (nota 1). **Recomendação:** aceitar o que foi desenhado e mudar o plano como na nota 1.
2. **A responsável sem a área Financeiro:** recomendei Larissa Costa, para manter o elenco do D35 único. **Decidido pelo coordenador e aplicado:** a responsável é Larissa Costa, só com o Jurídico.
3. **"Fica na prestação de contas do repasse":** a designer tinha razão. **Aplicada** (nota 7). O plano muda a confirmação e a C3.5.5.
4. **"são avisadas" → "recebem um aviso":** **decidido:** "recebem um aviso". O plano acompanha (C5, estado 1).
5. **O selo do sino no tom de atenção:** **decidido: atenção.** No `Sino.tsx` de hoje, "Valor mudou" (`EXITO_VALOR_MUDOU`) é atenção e "Não cobrado" é neutro. Uma cobrança contra a decisão de quem conferiu é do mesmo tipo do "Valor mudou": pede o olhar de alguém. O plano deve escrever o tom.
6. **O nome do passo "Repassar a Sebastião":** **está certo.** `fichaLigada.ts:216` dá `REPASSE: \`Repassar a ${primeiro}\``.
7. **Ver junto com o `ea-`:** **feito** (nota 10). Não há conflito de linguagem nem de lugar. Na programação, a F3.194 vem antes e mexe na mesma `JanelaRegistrar`, então a F3.191 deve partir do código dela.

## Decidido pelo coordenador (27/11/2026, pontos leves, sem passar pela Carol)
- **A responsável do exemplo** é Larissa Costa, só com o Jurídico. Os estados `enc-sino-bianca` e `enc-acerto-bianca` viraram `enc-sino-larissa` e `enc-acerto-larissa`.
- **O texto do Indevido** é o sugerido na nota 6.
- **"segundo Diego"** fica no histórico.
- **A pasta** fica `portal-exito-nao-cobrado-alvara`. O plano deve trocar `portal-exito-nao-cobrado-divisao` por esse nome (C7, D40).
- **"recebem um aviso"**, no lugar de "são avisadas".
- **O selo do sino** fica no tom de atenção.
- **A confirmação** diz "e o combinado ficou na ficha do repasse".

Para a Carol fica a aprovação do desenho. As notas 1, 4, 5 e 7 são do plano, e não do desenho.

## O que mudou nos arquivos
- `_fonte/enc_caso.py`:
  - `enc-acerto-bianca` passou a ser da Bianca (Contratos e Jurídico); depois, com a decisão, virou `enc-acerto-larissa`;
  - a coluna dos honorários mostrou o percentual do contrato enquanto era a Bianca (voltou ao texto aprovado com a Larissa);
  - o Resultado ficou "Acordo · encerrado em 10/11/2026", sem valor.
- `_fonte/enc_repasses.py`: a ajuda do combinado diz "Fica na ficha do repasse e na ficha do contrato. O cliente vê os honorários na prestação de contas.".
- `_fonte/enc_index.py`: a dúvida 3 registra a troca.
- **Depois das decisões do coordenador:**
  - `_fonte/enc_caso.py`: a responsável é Larissa Costa; `enc-acerto-larissa` usa a moldura da Larissa (só Jurídico), e a coluna dos honorários volta a "Honorários na área Contratos";
  - `_fonte/enc_sino.py`: `enc-sino-larissa`, com a Larissa e os outros avisos dela do sino aprovado; saiu a troca das áreas da Bianca;
  - `_fonte/enc_repasses.py`: os avisados são "Marina Ribeiro e Larissa Costa", e o Indevido tem o texto novo;
  - `_fonte/casos_enc.py` e `_fonte/enc_index.py`: os nomes dos estados e as legendas; a dúvida 2 aparece como decidida;
  - as capturas antigas `enc-*-bianca-*` foram apagadas;
  - a `NOTAS.md` foi atualizada com tudo o que foi decidido.
- Tudo foi refeito com `sh _fonte/gerar.sh`: HTML, PNG, WebP e `_conferencia.json`.

## Depois das correções
- **axe:** 0 violações nos 32 casos, sem rolagem lateral e sem erro de script.
- **Alvo pequeno:** só a marca "T3jus" da moldura aprovada, como antes.
- **Privacidade:** a Larissa, sem o Financeiro, não vê valor, calculado nem combinado em nenhum estado (o sino e a ficha do caso).
- Conferido de novo depois das decisões: 32 casos, axe 0, rolagem lateral 0, erros de script 0.
