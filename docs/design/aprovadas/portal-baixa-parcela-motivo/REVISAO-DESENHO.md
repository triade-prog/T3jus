# Portal: baixa de parcela vencida sem receber · revisão do desenho

**Item:** F3.139 (FI-24, com FI-08 e EX-16). **Revisado em:** 24/11/2026. **O que foi lido:** `index.html`, `NOTAS.md`, `_conferencia.json`, as 40 capturas (as de celular inteiras, em fatias; as de computador nas partes com janela e tabela), `PLANO.md` (v2), `REVISAO.md`, `docs/IDENTIDADE.md`, `docs/design/conceito-gabinete.md` e o aprovado `docs/design/aprovadas/portal-fechamento-sem-levantamento/`. Também abri o `index.html` no Playwright, a 1440 e a 390, para ver onde fica o foco, qual é o papel de cada janela e o que é lido em voz alta, em 12 estados.

## Veredito

**Ajustar antes de levar à Carol.** O desenho segue bem o plano v2. As janelas têm o padrão aprovado do "Não foi paga", o axe passa nos 20 estados e não há rolagem lateral. Os números de Noemi e de Sebastião batem entre os estados, **com uma exceção: a janela de encerrar mostra o recebido do aprovado, R$ 7.500,00, em vez de R$ 6.500,00.** Essa nota bloqueia. Há ainda 13 notas para ajustar: o "sem receber" falta em vários textos, o foco no envio está errado, o conflito traz números que se contradizem, a ajuda da pendência promete o que não acontece, a próxima ação vai para quem não tem Financeiro, e o sino de Contratos mostra texto livre e quebra o valor em reais. As outras 9 notas são sugestões.

Os tamanhos citados são a largura da captura: computador (1440) e celular (390).

## Bloqueia

### 1. A janela de encerrar diz "Recebido no caso R$ 7.500,00", e o resto do desenho diz R$ 6.500,00
- **Evidência:** `bx-encerrar`, nos dois tamanhos: "Recebido no caso · R$ 7.500,00 · 2 contratos". Em `bx-feita` e `bx-pronto`, a folha "Fechamento do caso" mostra R$ 6.500,00, e as `NOTAS.md` (estado 11) também dizem R$ 6.500,00. A conta certa é R$ 5.000,00 de Noemi (5 de 6 parcelas) mais R$ 1.500,00 de Cláudio. Os R$ 7.500,00 vêm do aprovado `encerrar`, em que Noemi pagou tudo: o valor foi copiado sem ser atualizado.
- **Por que bloqueia:** é a janela que confirma um registro que fica para sempre no histórico do caso. Se ela mostra R$ 1.000,00 a mais, a Carol aprova um número errado justo no ponto que este item muda: o recebido sem a parcela baixada.
- **Correção:** trocar por "R$ 6.500,00 · 2 contratos" no `bx-encerrar`. Conferir com uma busca se não sobrou outro número do aprovado nas peças `fl-`/`fs-` que o `baixa.py` reaproveita (Reembolsado, Falta e a descrição).

## Ajustar

### 2. Falta "sem receber" em textos de baixa (FI-02, nota 9 da revisão)
No T3jus, "baixa" sozinha quer dizer "recebido". O pedido é que todo botão e todo aviso de baixa digam "sem receber". Os textos abaixo ainda não dizem:

| Onde | Hoje | Proposta |
|---|---|---|
| `bx-erros`, resumo | "Faltam 2 coisas para dar baixa." | "Faltam 2 coisas para dar baixa sem receber." |
| `bx-falha`, título | "Não deu para dar baixa." | "Não deu para dar baixa sem receber." |
| `bx-enviando`, botão | "Dando baixa…" | "Dando baixa sem receber…" (cabe se o pé ficar empilhado, nota 3) |
| `bx-conflito` | "Nada foi baixado." | "A baixa sem receber não foi feita." Aqui o "baixado" sozinho é pior do que nos outros: Diego acabou de **registrar** R$ 500,00, que é justamente "baixa" no sentido de recebido. |
| `bx-janela`, caixa da pergunta 4 | "Dar baixa também no reembolso das custas (R$ 412,30)" | "Dar baixa sem receber também no reembolso das custas (R$ 412,30)" |
| `bx-desfazer*`, título, botão da linha e botão da janela | "Desfazer a baixa" | "Desfazer a baixa sem receber". No computador o botão cabe na coluna de 33%; no celular ocupa a largura do cartão. |
| `bx-desfazer*`, texto escondido do botão da linha | "Desfazer a baixa: parcela 6/6" | "Desfazer a baixa sem receber: parcela 6/6" |
| `bx-desfazer-renegociada`, linha "Parcela" | "R$ 500,00 baixados (recebido…)" | "R$ 500,00 com baixa sem receber (recebido R$ 400,00 de R$ 900,00)" |

O sino, o histórico e o selo já dizem "sem receber". O plano (seção 5) tinha "Dando baixa…" e "Desfazer a baixa": é o plano que precisa mudar, e as `NOTAS.md` devem registrar a mudança.

### 3. Enquanto envia, o foco vai para o "Fechar", e o pé da janela muda de forma
- **Evidência:** em `bx-enviando` (computador e celular), o anel de foco está no X, e o Playwright confirma `activeElement = BUTTON "Fechar"`. No celular, o pé de `bx-janela` e `bx-erros` tem "Voltar" e o botão de confirmar empilhados, na largura toda. Em `bx-enviando`, `bx-falha` e `bx-conflito`, os dois ficam lado a lado. O botão muda de lugar debaixo do dedo bem no momento do toque.
- **Correção:**
  - o foco fica no botão que enviou (`aria-busy="true"`);
  - enquanto envia, o X e o "Voltar" ficam visíveis. Se a pessoa fechar, o aviso de confirmação ou de falha aparece na ficha, para ninguém ficar sem saber se a baixa sem receber foi feita. Isso vai escrito nas notas;
  - no celular, o pé fica do mesmo jeito em todos os estados da janela. Empilhado é melhor, porque "Dar baixa sem receber na parcela 6/6" não cabe pela metade.

### 4. No conflito, a janela mostra dois saldos diferentes
- **Evidência:** `bx-conflito`, celular e computador. O quadro diz "Falta receber R$ 1.000,00", e logo abaixo "Como ficou" diz "faltam R$ 500,00, ainda em atraso". Quem lê rápido não sabe qual valor vale.
- **Correção:** no conflito, tirar o quadro de três números, ou dar a ele o rótulo "Quando você abriu" e o "Falta receber" riscado. A descrição "A parcela sai de Em atraso sem que o dinheiro tenha entrado…" também perde o sentido aqui, porque nada vai sair. Melhor trocá-la por "Nada mudou por aqui. Confira a parcela antes de decidir."

### 5. A ajuda da janela de pendência promete que o caso "deixa de esperar", mas as custas continuam segurando
- **Evidência:** `bx-pendencia`: "Se Noemi não vai pagar, você pode dar baixa na parcela sem receber, com o motivo. Ela sai de Em atraso, fica no contrato, e o caso deixa de esperar por ela." A mesma janela lista "Custas · R$ 412,30 · vai junto com a parcela 6/6". Em `bx-feita` (sem a caixa da pergunta 4), o caso continua travado pelas custas. A pessoa segue o atalho e não consegue encerrar.
- **Correção:** completar a frase conforme a resposta da pergunta 4. Com o sim: "…e o caso deixa de esperar por ela. As custas de R$ 412,30 saem junto só se você marcar isso na mesma janela." Com o não: "…As custas de R$ 412,30 continuam a reembolsar, em A pagar." O mesmo vale para a linha "O caso Carvalho x Construtora Lume deixa de esperar por ela." da janela de baixa: ela é verdadeira para a parcela, mas o caso ainda espera pelas custas.

### 6. "Renegociada" junto com a caixa "dar baixa também nas custas" não faz sentido
- **Evidência:** `bx-renegociada`. "Renegociada" está marcada, e a caixa "Dar baixa também no reembolso das custas (R$ 86,40) · Vale o mesmo motivo e a mesma explicação" continua ali. As custas de Sebastião já passam a ir com dezembro, como diz a linha logo acima. Uma baixa de reembolso com o motivo "Renegociada" e a explicação "Parcelado: 2 × R$ 250,00…" grava um registro sem sentido.
- **Correção:** quando "Renegociada" está marcada, a caixa sai e só fica a linha "As custas de R$ 86,40 passam a ir junto com a mensalidade de dezembro." Escrever isso na decisão 12 do plano e nas notas. A caixa também não deveria aparecer quando as custas já têm outra parcela para ir junto; nesse caso, basta a linha. Mostrar a caixa só quando as custas ficam "a reembolsar, em A pagar", como no caso de Noemi, também simplifica a pergunta 4.

### 7. O sino de Contratos mostra texto livre a quem não tem Financeiro e quebra o valor em reais
- **Evidência:** `bx-sino-contratos`, celular:
  - **o texto citado não é o que Diego escreveu.** O sino cita "Parcelado: 2 × R$ 250,00, em dezembro e janeiro.", mas a explicação de Diego em `bx-renegociada` e `bx-desfazer-renegociada` é "…em dezembro e janeiro, combinado com Sebastião por telefone hoje.";
  - **o valor quebra.** "R$" fica no fim de uma linha e "250,00" no começo da outra, e o título quebra em "C-2026-" / "029". As `NOTAS.md` dizem que "o valor em reais nunca quebra entre o 'R$' e o número".
- **O problema de fundo (PT-02):** o "combinado" é a explicação livre. Diego pode escrever "ele está 44 dias atrasado e já devia R$ 500,00", e Felipe, que não tem Financeiro, recebe isso no sino.
- **Correção:**
  - citar exatamente o que foi gravado;
  - pôr `white-space: nowrap` (ou `&nbsp;`) em "R$ 250,00" e no número do contrato;
  - com "Renegociada" marcada e quem dá a baixa sem Contratos, a ajuda do campo diz "Marina e Felipe vão ler este texto no aviso. Escreva só o que foi combinado." Uma alternativa é a Carol decidir se o aviso leva o texto ou só "Diego Almeida combinou uma condição nova com Sebastião Lopes. Veja com ele.", que entra na pergunta 3.

### 8. Depois de desfazer, a próxima ação de cobrança vai para Felipe, que não tem Financeiro
- **Evidência:** `bx-desfazer`, `bx-desfazer-encerrado` e `bx-desfeita`: "Felipe Matos fica com a próxima ação: falar com Noemi amanhã". O elenco diz que Felipe não tem a área Financeiro, e o estado 18 mostra que ele não vê nem A receber nem a cobrança. A regra "quem cuida do contrato", do aprovado `portal-nao-paga-logo`, não previu um responsável sem a área. O resultado é uma cobrança que só aparece para quem não pode abri-la, e o aviso dela daria a Felipe um dado de Financeiro.
- **Correção:** uma regra de reserva. Se quem cuida do contrato não tem Financeiro, a próxima ação fica com quem desfez (aqui, Marina) ou com quem cuidava da cobrança (Diego). Sem a regra, isso vira uma pergunta à Carol. Mudar o texto dos três estados.

### 9. O bloco âmbar narra um evento em vez de dizer como as coisas estão
- **Evidência:**
  - em `bx-feita`, o âmbar diz em negrito "A parcela 6/6 saiu de Em atraso sem receber.", a mesma frase do aviso de confirmação. O âmbar fica na ficha: amanhã a frase ainda estará ali, como se tivesse acabado de acontecer;
  - em `bx-desfeita`, o âmbar diz "Próxima ação: amanhã, com Felipe.", sem dizer o quê. O aprovado diz "Próxima ação: hoje, combinar com Sebastião".
- **Correção:**
  - em `bx-feita`: "Falta o reembolso das custas, R$ 412,30. Sem parcela de Noemi para ir junto, ficou a reembolsar em A pagar." O evento fica só no aviso de confirmação e no histórico;
  - em `bx-desfeita`: "Próxima ação: amanhã, falar com Noemi." (com o responsável que sair da nota 8).

### 10. Na tabela do computador, a linha baixada vira uma coluna estreita e muito alta
- **Evidência:**
  - `bx-feita` e `bx-pronto` (computador): na coluna Situação (24% de 684 px), ficam o selo, "Inadimplência · por Marina Ribeiro em 18/11", a explicação em itálico e a linha das custas. São cerca de 12 linhas, e as colunas Valor e "Recibo e ações" ficam vazias embaixo;
  - em `bx-parcial` (computador), o selo "Vencida há 44 dias" encosta em "R$ 900,00". Com "há 120 dias", ele invade a coluna Valor.
- **Correção:**
  - a nota, a explicação e as custas vão para uma linha de detalhe logo abaixo da linha da parcela, ocupando da coluna Situação até o fim (`colspan`), ainda dentro da mesma linha para o leitor de tela (por exemplo, com `aria-describedby` no selo). A linha da parcela fica da altura das outras;
  - dar um respiro mínimo entre o selo e o valor, ou deixar o selo quebrar dentro da própria célula.

### 11. "Dar baixa sem receber" pesa mais do que "Registrar", e o ícone de moeda diz o contrário
- **Evidência:** `bx-ficha` e `bx-desfeita` (os dois tamanhos). "Registrar" tem 36 px e não tem ícone. Logo abaixo, "Dar baixa sem receber" tem 44 px e um ícone de cifrão. A exceção parece a ação principal. O cifrão é o mesmo de "Registrar recebimento" e está também no botão de confirmar da janela: na ação de **não** receber, ele sugere dinheiro entrando. A regra da nota 20 explica a diferença de altura, mas não o peso visual.
- **Correção:**
  - tirar o ícone, ou usar um que não seja de dinheiro (o "desfazer" e o "cadeado" já existem; um "fora" ou "arquivar" funciona). Fazer o mesmo no botão de confirmar da janela;
  - enquanto o F3.165 não sai, "Registrar" vem primeiro e "Dar baixa sem receber" fica com a aparência mais leve (texto vinho com contorno, sem preenchimento), para a altura maior não parecer mais importante.

### 12. Contratado de Sebastião (R$ 4.900,00) e o número "Baixado sem receber R$ 0,00": hoje é uma escolha do desenhista, e devia ser uma pergunta
- **Evidência:** `bx-desfazer-renegociada` (no fundo): "Contratado R$ 4.900,00", enquanto o topo da ficha diz "6 mensalidades de R$ 900,00" (R$ 5.400,00). Embaixo, um bloco de largura toda diz "Baixado sem receber R$ 0,00" com "mais R$ 500,00 renegociados". As `NOTAS.md` contam essa escolha em "Onde saiu do plano", mas ela muda um número que a sócia lê, e não está nas perguntas. Para o leitor de tela, o HTML junta "R$ 0,00mais R$ 500,00 renegociados", porque falta um espaço antes do `<small>`.
- **Correção:**
  - levar a escolha à Carol, como parte da pergunta 3 (nota 22);
  - quando só há renegociada, o bloco se chama "Renegociado R$ 500,00", com a ajuda "vira parcelas novas em Contratos", em vez de mostrar um R$ 0,00 grande;
  - no Contratado, uma linha de apoio: "sem os R$ 500,00 renegociados";
  - pôr um espaço ou um separador antes do `<small>`.

### 13. "Tentar de novo" e "Ver como ficou" são links, mas fazem ações
- **Evidência:** no Playwright, o foco em `bx-falha` cai em `A "Tentar de novo"` e, em `bx-conflito`, em `A "Ver como ficou"`. "Tentar de novo" reenvia o formulário: é um botão. O leitor de tela anuncia "link", e o espaço não aciona um link.
- **Correção:** `<button>` nos dois. Na falha, o mesmo botão de confirmar com o texto "Tentar de novo". No conflito, um botão "Ver como ficou", que recarrega a ficha.

### 14. O aviso de confirmação pode cobrir o botão que está com o foco (WCAG 2.4.11), e ele traz uma ação
- **Evidência:** `bx-feita` e `bx-desfeita` (celular). O aviso fica preso no pé da tela, sobre a barra de baixo, e cobre cerca de 200 px de conteúdo. O foco vai para "Desfazer a baixa" (ou para "Dar baixa sem receber"), que fica no meio da página. Quando a página rola até ele, o aviso pode ficar por cima. Em `bx-desfeita`, o aviso tem o botão "Registrar recebimento".
- **Correção:**
  - `scroll-padding-bottom` do tamanho do aviso, ou o aviso no alto da ficha no celular;
  - um aviso que tem botão não some sozinho (WCAG 2.2.1). Escrever nas notas que ele só fecha pelo X.

## Sugestões

### 15. Mostrar o erro do grupo de motivos antes das opções
- **Evidência:** em `bx-erros` (celular), o erro "Escolha o motivo." aparece depois do terceiro cartão, fora da vista quando o foco cai em "Perdoada".
- **Sugestão:** pôr o erro logo depois da `legend`, dentro do `fieldset`, como fazem os aprovados de formulário.

### 16. A frase do pé "Só quem tem a área Financeiro dá baixa sem receber." aparece só no computador
- **Evidência:** no computador, a frase está em `bx-janela`, `bx-erros`, `bx-enviando`, `bx-renegociada` e `bx-falha`. No celular ela está escondida (`offsetParent` nulo). Para quem abre a janela, ela não diz nada de novo.
- **Sugestão:** tirar dos dois tamanhos, ou deixar igual nos dois. Se a pergunta 1 mudar a regra, ela volta como a linha "Quem dá baixa…".

### 17. Em Contratos, o âmbar junta uma frase completa com um pedaço de frase
- **Evidência:** `bx-contratos`: "**A parcela 6 de 6 teve baixa sem receber em 18/11.**" e, na linha seguinte, "no Financeiro, em A receber". O aprovado usa um rótulo curto ("Mensalidade 3") antes desse pedaço; uma frase com ponto final não combina com ele.
- **Sugestão:** "**Parcela 6 de 6: baixa sem receber em 18/11**" e, embaixo, "no Financeiro, em A receber".

### 18. O pé aprovado de Contratos agora fica ambíguo
- **Evidência:** `bx-contratos`: "Pagamentos, atrasos e baixas são registrados lá." O texto é aprovado e está igual em 32 telas, mas com este item "baixas" passa a ter dois sentidos.
- **Sugestão:** "Pagamentos, atrasos e baixas sem receber são registrados lá." Escrever nas notas que é uma mudança em texto aprovado.

### 19. A folha "Fechamento do caso" não mostra o baixado, e a janela de encerrar mostra
- **Evidência:** `bx-pronto` tem só três blocos (Recebido, Reembolsado e Falta "nada"). O "Baixado sem receber R$ 1.000,00" só aparece em `bx-encerrar`.
- **Sugestão:** um bloco "Baixado sem receber R$ 1.000,00 · parcela 6/6" na folha, ou ao menos a linha "Falta: nada" com "tudo recebido ou R$ 1.000,00 baixados sem receber", para a sócia ver o mesmo resumo antes de abrir a janela.

### 20. O aviso de cobrança em dobro pode ser concreto
- **Evidência:** `bx-desfazer-renegociada`: "Se o combinado já virou parcelas novas em Contratos, desfazer cobra o valor duas vezes."
- **Sugestão:** o servidor sabe se as condições do contrato mudaram depois da baixa. Com isso, a janela pode dizer "As condições do C-2026-029 mudaram em 18/11, depois da baixa. Desfazer cobra os R$ 500,00 duas vezes." ou "As condições ainda não mudaram." Fica nas notas para quem programar.

### 21. "Motivo do atraso" recebe o texto do desfazer
- **Evidência:** `bx-desfeita`, folha Cobrança: "Motivo do atraso: Baixa desfeita: Noemi ligou e prometeu pagar em dezembro". Isso não é o motivo do atraso.
- **Sugestão:** manter o último motivo de atraso que existe ("Noemi disse que não vai pagar…") e mostrar a desfeita só no histórico, ou mudar o rótulo para "Última anotação".

### 22. As perguntas à Carol: separar a 3 e acrescentar duas
- **A pergunta 3 junta três decisões e uma subpergunta.** Melhor separar em:
  - **3a.** "Renegociada" conta no Contratado? Com o exemplo dos números de Sebastião (nota 12).
  - **3b.** Quem não tem Contratos avisa pelo sino ou pessoalmente? Com o que o aviso mostra (nota 7).
- **Acrescentar:** quem fica com a próxima ação depois do desfazer, quando quem cuida do contrato não tem Financeiro (nota 8).
- **Na pergunta 4,** dizer que a caixa só aparece quando as custas ficam sem parcela (nota 6). Isso deixa a pergunta mais fácil de responder.
- **As perguntas 1, 2 e 5 estão bem formuladas:** cada uma tem uma recomendação e uma alternativa com a consequência.

### 23. Celular: o bloco "Baixado sem receber" encosta no primeiro cartão
- **Evidência:** em `bx-feita` e `bx-pronto` (celular), o fundo sal do quinto número termina colado no contorno do cartão "Parcela 1/6".
- **Sugestão:** o mesmo espaço que separa os outros números dos cartões (16 px).

## O que está bom e deve ficar
- Os números de Noemi batem entre `bx-ficha`, `bx-janela`, `bx-feita`, `bx-pronto` e `bx-desfeita`:
  - antes da baixa: Contratado R$ 6.000,00, Recebido R$ 5.000,00, Em atraso R$ 1.000,00 e Falta R$ 1.412,30;
  - depois: Em atraso R$ 0,00 e Baixado sem receber R$ 1.000,00.
- Os de Sebastião também batem: R$ 3.100,00 recebidos, R$ 500,00 em atraso e R$ 1.800,00 a vencer, que somam R$ 5.400,00. O que faltou está nas notas 1 e 12.
- O foco ao abrir, depois da baixa e depois do desfazer está onde o plano manda, e o texto escondido dos botões da linha nomeia a parcela.
- O caso sem Financeiro (estado 18) não deixa escapar nenhum dado da baixa, e a contagem continua 6.
- Do aprovado `portal-fechamento-sem-levantamento`, o que muda (a coluna "Recibo e ações", o texto da pendência, "tudo recebido ou baixado com motivo") está declarado nas notas. O que não foi declarado é o número da nota 1, que é erro, e o pé de Contratos da nota 18.
