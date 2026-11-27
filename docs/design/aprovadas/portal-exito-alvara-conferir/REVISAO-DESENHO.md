# Revisão do desenho · o êxito lançado depois do alvará já nasce pago (F3.194, D39)

**Revisado em:** 27/11/2026, por um revisor independente (design de produto SaaS e acessibilidade).

**O que foi lido:**
- desta pasta: `index.html`, `financeiro.html`, `NOTAS.md`, `_conferencia.json`, as 22 capturas e `_fonte/`;
- o plano `f3-191-192/plano.md` (v5), Parte A (A1 a A7) e as perguntas C2 e C3 da Parte D;
- `docs/IDENTIDADE.md`, `docs/design/conceito-gabinete.md` e o aprovado `portal-exito-baixado-alvara` (D38), com a `REVISAO-DESENHO.md` e a `NOTAS.md` dele;
- o código de hoje: `FinanceiroExito.tsx` (`JanelaConferir` e `JanelaNaoCobrar`), `Financeiro.tsx` (a confirmação), `FinanceiroRepasses.tsx` (a célula de honorários e a ficha), `financeiro.ts` (`PropostaRepasse`, `Destinacao`, `FichaRepasse`), `portal.css` e a `0220_portal_financeiro_receber.sql`.

Também conferi que `comum.py`, `financeiro.py`, `relatorios.py`, `dados.py`, `fotos.cjs`, `webp.py` e `exito_baixado.py` são cópias idênticas das do D38 (md5). Abri as telas no Playwright a 1440 e a 390 para medir o foco, a posição da janela e o texto cortado nos botões.

## Veredito

**Pronto para a Carol, com as correções abaixo já aplicadas e duas notas médias para o plano.**

O desenho segue o plano com fidelidade:
- os textos dos 11 estados batem com a A4, palavra por palavra. Onde o plano tinha uma frase só, ela virou título e texto do aviso, sem mudar palavras;
- os estados que dependem da C3 estão marcados nos três lugares: o selo "Depende da C3" no `index.html`, a faixa da seção e o **[C3]** na `NOTAS.md`. Os trechos "até o que faltar dela" das duas frases revistas também estão marcados;
- o `ea-nao-cobrar` mostra só a recusa, como a C2 decidiu;
- o axe passa nos 22 casos, sem rolagem lateral nem erro de script.

**Notas:**
- **Graves:** nenhuma.
- **Médias:** 4.
  - Duas foram corrigidas no desenho: o "Recebido em novembro" do `ea-lancado` e o botão "Lançar em A receber" cortado no celular.
  - Duas pedem um campo que o plano ainda não devolve: o valor sem limite no `ea-exito-falta` e a linha "Pagou a parcela" na ficha.
- **Leves:** 2, corrigidas. As outras são sugestões.

## Notas

### 1. O aviso do `ea-exito-falta` precisa de um dado que a proposta não devolve · média · **para o plano** [C3]
- **Evidência:**
  - o aviso diz "Os honorários deste alvará ficam limitados a esse valor. Pelos 30% do contrato, seriam R$ 3.000,00.";
  - a `PropostaRepasse` (`financeiro.ts:599-608`) devolve, para cada linha, só `para`, `nome`, `regra` e `valor`;
  - na A2.8, a variável `v_limitado` existe dentro de `repasse_proposta_sem_exito`, mas não sai da função. O único rastro do limite é o texto " · até o que falta do êxito" na `regra`.
- **O que isso causa:**
  - sem um campo, a tela não sabe quando mostrar o aviso;
  - mostrar o aviso sempre que `exitoSituacao` é `LANCADO` com falta erra quando os 30% ficam abaixo do que falta. Por exemplo, com um alvará de R$ 5.000,00, os 30% são R$ 1.500,00 e não há limite;
  - "seriam R$ 3.000,00" só sai lendo o "30%" do texto da regra, e isso não serve.
- **Recomendação:**
  - a linha de honorários limitada ganha `semLimite` (o valor pelo percentual, antes do limite). É um campo só, que dá o sinal e o número;
  - o vitest do "aviso do estado 6" (A5) cobre os dois casos: com limite e sem limite;
  - sem esse campo, a frase "Pelos 30%…" sai, e o aviso precisa de outro sinal.
- **Acréscimo da designer: fica,** desde que o campo entre no plano. A frase ajuda a conferir a conta.

### 2. "Pagou a parcela do êxito" e a linha do fechamento, na ficha, não têm dado no plano · média · **para o plano**
- **Evidência:**
  - no `ea-repasse`, a linha dos honorários ganhou "Pagou a parcela do êxito, lançada em 18/11";
  - o fechamento ganhou "Êxito do contrato C-2026-027: pago por este alvará", com "lançado por Diego Almeida em 18/11 · pago em 12/11";
  - a `Destinacao` (`financeiro.ts:620-635`) não diz que pagou uma parcela;
  - o histórico `financeiro.levantamento_exito_lancado_depois` (A2.2) guarda a parcela, o valor e quem lançou, mas não a destinação;
  - a A3 (ui) só fala da linha do histórico.
- **Um ponto de coerência:** a parte de honorários também paga a parcela quando o alvará vem **depois** do lançar (0651). Se a linha sair só do histórico novo, ela aparece num caminho e some no outro.
- **Recomendação:** a ficha ganha, em cada destinação, `pagou?: {parcelaId, descricao, valor, lancadaEm?}`, lido de `pagamentos_recebidos.destinacao_id`. Isso vale para os dois caminhos, e a A3 (ui) e o vitest passam a citar a linha e o item do fechamento.
- **Acréscimos da designer: ficam,** com o campo. Eles respondem à pergunta que a sócia faz na ficha: "esses honorários já pagaram o êxito?". O verbo "Pagou" segue o D38 ("Paga a parcela").

### 3. Depois de lançar, "Recebido em novembro" não mudava · média · **aplicada**
- **Evidência:**
  - no `ea-lancado`, a parcela nasce paga com `recebido_em` = 12/11, neste mês (A2.2);
  - a `portal_financeiro_receber` (`0220:198-221`) soma em "Recebido no mês" todo pagamento da parcela com `recebido_em` no mês, sem olhar a caixa. O próprio plano (A4.2) só tira a parcela dessa conta quando o alvará é do mês anterior;
  - mesmo assim, o desenho mostrava R$ 31.240,00 e 19 parcelas, como antes de lançar.
- **Correção:**
  - `lancado()` troca o número para R$ 36.040,00 (R$ 31.240,00 + R$ 4.800,00) e 20 parcelas, com uma `assert`;
  - "Em aberto" (R$ 19.110,00, 12 parcelas) não muda, porque a parcela nasce paga;
  - a legenda do index e a `NOTAS.md` explicam a troca.
- **Para a Carol:** os honorários entram em "Recebido em novembro" duas vezes, uma em Repasses e outra em A receber. Isso já acontece hoje com o alvará depois do lançar, pela 0651, então não é novo deste desenho.

### 4. A 390, "Lançar em A receber" era cortado · média · **aplicada** (o código de hoje tem o mesmo defeito)
- **Evidência:**
  - nos três `ea-conferir`, o botão tinha 171 px, e o texto pedia 173 px (`scrollWidth`). O "r" final aparecia cortado na captura;
  - a causa é o `.janela.fi-larga .janela-pe .btn{width:100%}` (`portal.css:1585`), que divide o `.ex-pe-dir` em duas metades iguais;
  - é o botão que decide, e o texto cortado fere a WCAG 1.4.10.
- **Correção:**
  - em `CSS_EA`, no `@media (max-width:760px)`: `.janela.fi-larga .ex-pe-dir .btn{width:auto;flex:1 1 auto}`;
  - agora "Cancelar" tem 116 px, "Lançar em A receber" tem 226 px, e nada passa da largura. Os dois botões continuam com 44 px de altura;
  - **para o PR:** a mesma regra vai para o `portal.css`, porque a janela de hoje também corta o texto.

### 5. O `ea-proposta` parecia um terceiro alvará de R$ 16.000,00 · leve · **aplicada**
- **Evidência:** no exemplo, o alvará entra em 12/11, com o caso em andamento, e isso é o `ea-proposta-sem-conferencia`. O `ea-proposta` mostra o mesmo alvará entrando em 18/11, com o êxito para conferir. Ele só faz sentido como outra ordem dos fatos, e a legenda não dizia isso.
- **Correção:** a legenda agora começa por "Outra ordem dos fatos: o alvará de R$ 16.000,00 só entra em 18/11, depois do encerramento e antes da conferência."

### 6. O index e a NOTAS citavam o plano v4 e diziam que o `ea-nao-cobrar` podia sair · leve · **aplicada**
- **Correção:**
  - o plano citado agora é o v5. A Parte A não mudou da v4 para a v5;
  - o `ea-nao-cobrar` fica, como manda a C2. Saiu o "se ela preferir, ele sai", no index (Decisões e dúvidas) e na `NOTAS.md`.

### 7. Os outros acréscimos fora do plano · registro
- **O link "Ver o alvará de 12/11 em Repasses": fica.**
  - O `honorariosAlvara` (A2.4) traz `levantamentoId` e `tipo`, então o link tem dado;
  - ele tem 44 px e foco visível;
  - **no código,** o texto segue o `tipo` ("Ver o RPV de…").
- **A retirada dos campos de motivo na recusa: fica.**
  - A tela sabe da recusa antes de enviar, pela mesma regra do servidor: `honorariosAlvara` com `livre` > 0, igual ao `HONORARIOS_JA_ENTRARAM` (A2.5);
  - campos que não podem ser enviados confundem;
  - na corrida, quando a janela abriu sem honorários e o servidor recusa, o formulário inteiro continua, e a recusa aparece no aviso de urgência que já existe. A `NOTAS.md` já descreve isso.
- **A descrição nova da janela de recusa: fica.** A de hoje ("O êxito sai da lista para conferir sem virar parcela…") seria falsa na recusa. Há uma sugestão de texto na nota 9.

### 8. As contas e as datas · registro, tudo certo
- **O exemplo principal:**
  - 30% de R$ 16.000,00 = R$ 4.800,00;
  - R$ 4.800,00 + R$ 11.200,00 = R$ 16.000,00;
  - os fatos vêm em ordem: alvará em 12/11, transferência em 13/11, repasse em 16/11, encerramento em 17/11 às 16h40, lançamento em 18/11 às 10h20. Nenhuma data está no futuro.
- **`ea-conferir-sobra`:** 30% de R$ 10.000,00 = R$ 3.000,00, que bate com o motivo escrito. R$ 4.800,00 − R$ 3.000,00 = R$ 1.800,00.
- **`ea-conferir-dois`:** R$ 1.800,00 + R$ 3.000,00 = R$ 4.800,00. São os 30% de alvarás de R$ 6.000,00 e R$ 10.000,00, que somam os R$ 16.000,00.
- **`ea-exito-pago`:** a parte de Helena é R$ 5.000,00, e `pagoEm` = 12/11, o último `recebido_em`.
- **`ea-exito-falta`:** os 30% de R$ 10.000,00 dão R$ 3.000,00, acima do que falta (R$ 1.800,00). Por isso, a linha é limitada a R$ 1.800,00, e Helena fica com R$ 8.200,00. A soma dá R$ 10.000,00.
- **`eb-proposta-parte`:** a falta é R$ 4.800,00 − R$ 1.000,00 = R$ 3.800,00, e R$ 3.800,00 + R$ 412,30 + R$ 11.787,70 = R$ 16.000,00. São R$ 1.000,00 a mais para Rita do que no D38 (R$ 10.787,70).
- **A confirmação:** a data do pagamento (12/11) vem de `pagoPeloAlvara[].entrouEm`.

### 9. Textos: sugestões, não aplicadas (os textos são os do plano)
- **A recusa repete a instrução.** A descrição termina em "Volte para conferir e lance o êxito de Helena.", e o aviso termina em "Lance o êxito: ele nasce pago.". Basta ficar com a primeira frase da descrição: "Este êxito não pode ficar sem cobrança, porque os honorários dele já entraram.".
- **A confirmação pode ser lida como "lançado em 12/11".** O título "Êxito lançado e pago em 12/11, pelo alvará." junta o lançamento, que foi hoje, com o pagamento, que foi em 12/11. Uma opção: "Êxito lançado, já pago pelo alvará de 12/11.".
- **A linha do histórico repete quem fez.** "…foi lançada em 18/11 por Diego…" já está sob "18/11/2026 · hoje", e "Diego Almeida" vem de novo embaixo. As outras linhas começam pelo nome em negrito, mas esta não pode, como na nota 4 da revisão do D38. Sugestão: "A parcela do êxito de Helena foi lançada e paga por esta parte de honorários (R$ 4.800,00).".
- **O botão "Lançar em A receber".** Quando os honorários cobrem tudo, nada fica em A receber, e o aviso logo acima diz isso. Vale a Carol decidir se o botão passa a ser "Lançar o êxito" nesse caso. O plano não pede essa troca.
- **"Dá baixa na parcela…" no `ea-exito-falta`.** O texto continua o de hoje, e isso é coerente com o D38: lá, a nota 15 trocou para "Paga a parcela" só nos textos novos, e o texto do caso sem baixa ficou. Uniformizar para "Paga a parcela “Êxito · …” (falta R$ 1.800,00)" é uma troca de uma linha (`FinanceiroRepasses.tsx:667`). Fica para a Carol (item 6 da `NOTAS.md`).

### 10. Acessibilidade · registro, com duas sugestões para o código
- **Conferido:**
  - o `aria-describedby` vai de "Lançar" para `cf-alvara`, de "Não cobrar" para `nc-recusa` e do `fieldset` da divisão para `ea-limite`;
  - o "Não cobrar" é `aria-disabled`, e não `disabled`, então continua focável e é lido com o motivo;
  - o "R$" nunca quebra do número;
  - a janela ocupa os 390 px no celular;
  - todos os alvos têm 44 px. O único listado é a marca "T3jus" da moldura aprovada (204×24).
- **O foco, conferido no Playwright:**
  - `ea-conferir` e `ea-conferir-dois`: o valor;
  - `ea-conferir-sobra`: o motivo;
  - `ea-nao-cobrar`: "Voltar para conferir";
  - Repasses: "O que entrou";
  - `eb-proposta-parte`: "Desfazer".
- **Sugestão para o código: o aviso que muda de tom.** No `ea-conferir-sobra`, o aviso tem `role="status"` e muda de tom ao vivo. Ele deve trocar o conteúdo só quando o tom muda, e não a cada tecla, para o leitor de tela não repetir o aviso enquanto Diego digita.
- **Sugestão para o código: a lista de dois alvarás.** No `ea-conferir-dois`, cada item pode levar ao próprio alvará. Hoje o aviso não tem link, porque são dois alvarás.

## Depois das correções

- **O que foi refeito:** `sh _fonte/gerar.sh ..` refez o `financeiro.html`, o `index.html`, as 22 capturas PNG (escala 2), os WebP e a `_conferencia.json`.
- **axe:** WCAG 2.0, 2.1 e 2.2, A e AA, no Chromium (`chromium.launch()` sem opções). Nenhuma violação nos 22 casos, nenhuma rolagem lateral e nenhum erro de script.
- **Texto cortado:** nenhum botão tem `scrollWidth` maior que a largura, nos 22 casos.
- **Arquivos mudados:**
  - `_fonte/exito_alvara.py`:
    - `CSS_EA` (nota 4);
    - `lancado()` (nota 3);
    - as legendas de `ea-proposta` e `ea-lancado` (notas 3 e 5);
    - o texto da C2 em "Decisões e dúvidas" e o "plano v5" no cabeçalho (nota 6);
  - `NOTAS.md`: o plano v5, os números de A receber, o `ea-nao-cobrar` que fica e o pé do conferir no celular;
  - esta revisão.
- **O que não mudou:** as cópias do D38 continuam sem mudança, e nada foi para commit.

## Para a Carol decidir

1. **A C3** (aberta). Com "só avisar", saem o `ea-exito-pago`, o `ea-exito-falta` e o `eb-proposta-parte`, e também os trechos marcados das duas frases.
2. **Os textos da recusa** (`ea-nao-cobrar`) e a sugestão de tirar a frase repetida (nota 9).
3. **O "Dá baixa na parcela…"** do `ea-exito-falta`: fica como hoje, ou vira "Paga a parcela…" (nota 9).
4. **O botão "Lançar o êxito"** quando nada fica em A receber (nota 9).
5. **Os acréscimos da ficha e o "seriam R$ 3.000,00".** Eles ficam se o plano ganhar os campos das notas 1 e 2.
