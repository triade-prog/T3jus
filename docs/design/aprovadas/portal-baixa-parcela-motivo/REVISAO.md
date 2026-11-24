# Revisão do plano · baixa de parcela vencida sem receber, com motivo (F3.139)

Revisão feita em 24/11/2026, antes do desenho, sobre o `PLANO.md` (v1) desta pasta. Conferi cada afirmação contra o repositório: `CLAUDE.md`, `sistema/README.md`, `IDEIAS.md` (FI-02, FI-08, FI-24, EX-16, PT-02, PT-03, PT-10, IN-04, IN-07), as notas, o plano e a revisão aprovados de `portal-fechamento-sem-levantamento`, o painel (`F3.139.json`, `F3.165.json`) e o código: migrations 0010, 0020, 0140, 0200, 0210, 0220, 0290, 0330, 0340, 0400, 0410, 0420, 0450, 0470, 0500, 0511, 0534, 0570, 0600, 0623, 0640, 0649, 0651, 0670, 0721, 0750, 0851, 0900, 0901 e 0990; `api-portal/app.ts`; `domain/src/financeiro.ts` e `textos.ts`; `ui/src/portal/Financeiro.tsx`, `financeiro.ts`, `fechamento.ts`, `FichaContrato.tsx` e `Carne.tsx`.

## Veredito: seguir para o desenho depois de um plano v2 com estas notas

A escolha central está certa. Tratar a baixa como um cancelamento marcado, com uma tabela só de inserção, aproveita os mais de 30 filtros `cancelado_em is null` que já existem: A receber, Início, régua, IA, carnê, acerto do caso e relatórios. Achar e mudar cada um deles seria mais arriscado. O caso fictício é bom e a janela segue o padrão aprovado do "Não foi paga".

O defeito do plano é dizer que só cinco lugares "não vêm de graça". O código mostra mais. Em quatro deles o resultado é grave: uma mensagem pode sair ao cliente, um dado do Financeiro aparece para quem não tem a área, um dinheiro recebido some do fechamento e o "Não foi paga" quebra. Nenhum desses pontos pede outra arquitetura: todos se corrigem dentro dela. As notas 1 a 4 bloqueiam e precisam entrar no v2 antes do desenho. As notas 5 a 16 devem entrar no v2. As de 17 em diante são sugestões.

Referências curtas: `0220:308` quer dizer `sistema/supabase/migrations/0220_portal_financeiro_receber.sql`, linha 308. Os `.tsx` e `.ts` estão em `sistema/packages/`.

---

## Bloqueiam

### 1. A régua de WhatsApp trata a baixa como "Pagou" e pode mandar mensagem ao cliente

- **Gravidade:** bloqueia.
- **Trecho:** decisão 27 ("Nenhuma mensagem sai ao cliente por causa da baixa") e seção 3, item 12 ("conferir que a fila reconfere a parcela").
- **Problema:** para a régua, uma parcela cancelada é uma parcela paga. A `automacao_pagou` devolve verdadeiro com `r.cancelado_em is not null or parcela_recebido(r.id) >= r.valor` (`0570:194-203`). O motor em vigor, `automacao_andar` (`0670:309-327` e `:447-455`), faz então uma destas duas coisas com a execução em andamento da parcela baixada:
  - se o fluxo tem um ramo **"Pagou"**, vai direto para ele. O editor deixa a pessoa pôr mensagens nesse ramo, como "Recebemos seu pagamento, obrigado". Essa mensagem sai para a Noemi, que não pagou;
  - se o fluxo não tem esse ramo, encerra a execução com o texto "Pagou: a parcela saiu da automação." (`0670:324`), que fica errado no histórico da automação.

  A baixa cai exatamente nas parcelas em atraso, as que estão na régua. O filtro dos candidatos (`0721:250`, a versão em vigor; o plano cita `0340` e `0570`, que já foram trocadas) só impede execuções **novas**.
- **Correção:**
  - `automacao_pagou` só conta como "Pagou" o dinheiro recebido.
  - A parcela cancelada (por baixa ou por condição) encerra a execução como `FICOU_DE_FORA`, sem passar por nenhum ramo, com o texto "A parcela teve baixa sem receber" ou "A parcela foi cancelada no contrato".
  - Isso entra na seção 3 como mudança explícita, com um teste pgTAP: execução no meio da espera, baixa, e o próximo passo não manda nada.
  - O item 12 deixa de ser "para conferir": o que foi conferido mostra que hoje não protege.

### 2. Quem não tem Financeiro vê "Cancelado: Baixa sem receber: Inadimplência" em Contratos

- **Gravidade:** bloqueia (PT-02).
- **Trecho:** decisão 4 (Felipe "não vê a baixa") e estado 16 (`bx-sem-financeiro`: "nada da baixa aparece").
- **Problema:**
  - A aba Recebimentos de Contratos traz `cancelado.motivo` **para todos**. Isso está em `portal_contrato`, na versão em vigor (`0600:362-372`, igual a `0470:233-239`). Só a coluna Situação depende do Financeiro (`0750:18`).
  - A tela mostra o motivo a todos: risca a linha (`FichaContrato.tsx:506`) e escreve "Cancelado: {motivo}" (`FichaContrato.tsx:523`).
  - O plano grava `cancelado_motivo = 'Baixa sem receber: <motivo>'` (seção 3, item 3). Por isso o Felipe leria que a Noemi não pagou e por quê.
  - Além disso, as contagens por condição de Contratos tiram a parcela cancelada (`FichaContrato.tsx:44` e `:379`). Para quem tem Contratos, a parcela baixada "some" do número de parcelas.
- **Correção:**
  - O `portal_contrato` não devolve o motivo da baixa a quem não tem Financeiro. Para essa pessoa, a linha aparece **sem risco**, com uma nota neutra: "Fora da cobrança, por decisão do Financeiro." Sem motivo, sem quem e sem explicação.
  - Quem tem Financeiro vê o selo "Baixa sem receber" (decisão 24).
  - As contagens de `:44` e `:379` passam a contar a baixada, como já contam a "paga antes".
  - O estado 16 é redesenhado com essa linha. O texto exato vai às perguntas (nota 15).
  - O histórico de Contratos (`0600:373-376`, entidade `contratos`) também aparece para quem não tem Financeiro. Por isso, o `financeiro.parcela_baixada` deve ser gravado na entidade `recebimentos_previstos`, como o recebimento (`0220:334`), nunca em `contratos`, como faz o "Não foi paga" (`0600:150`).

### 3. O dinheiro já recebido numa parcela paga em parte some do fechamento e de "Recebido no mês"

- **Gravidade:** bloqueia.
- **Trecho:** decisão 10 ("O que entrou continua recebido"), decisão 31 ("5 de 6 parcelas recebidas") e estado 10.
- **Problema:** três leituras tiram a parcela cancelada **também do que já foi recebido**:
  - **`caso_acerto_quadro`** soma `recebido`, `recebidoNoCaso`, `parcelas.total` e `parcelas.pagas` sobre `caso_acerto_parcelas`, que filtra `cancelado_em is null` (`0900:39`, `0900:134`, `:167-171`, `:178`). Com a baixa do saldo de uma parcela paga em parte (o caso do Sebastião), os R$ 400,00 recebidos saem de "Recebido no caso", e o registro do encerramento fica errado. Sem nenhuma parcial, a Noemi já vê "5 de 5", e não "5 de 6", como o plano promete;
  - **`caso_acerto`** faz o mesmo em `parcelas.total`, `pagas` e `ultima` (`0900:113-117`);
  - **A receber, "Recebido no mês"**, sai de `ps`, que filtra `r.cancelado_em is null` (`0220:194-199`, `:221`). O recebimento parcial deste mês desaparece do número quando a parcela recebe baixa.

  A ficha do contrato não tem esse problema, porque soma `recebido` sem filtro (`0220:257`). O caixa e os relatórios também não, porque leem `pagamentos_recebidos`.
- **Correção:**
  - A seção 3, item 1, passa a listar estes lugares entre os que "não vêm de graça".
  - `caso_acerto_parcelas` separa duas coisas. As pendências ficam só com as não canceladas. Os totais (total, pagas, recebido, última) contam as não canceladas **mais as baixadas**.
  - O `recebidoMes` de A receber sai de `pagamentos_recebidos`, olhe ou não o cancelamento.
  - Entram testes para a parcela paga em parte e depois baixada, nos três lugares.

### 4. A baixa da parcela que voltou pelo "Não foi paga" quebra o "Não foi paga" e o desfazer

- **Gravidade:** bloqueia.
- **Trecho:** seção 3 (a baixa vale para qualquer parcela vencida) e decisões 16 a 19 (desfazer).
- **Problema:** a parcela criada pelo "Não foi paga" tem `corrige_pago_antes_id`. A regra "uma correção por parcela paga antes" só vale entre as **não canceladas**, em três lugares:
  - o índice único `recebimentos_previstos_correcao`, `where … cancelado_em is null` (`0600:16-17`);
  - a recusa `JA_MUDADA` de `portal_pago_antes_nao_paga` (`0600:107-108`);
  - o `corrigida` de Contratos (`0600:365`).

  Depois da baixa da correção, o `corrigida` vira falso, o botão "Não foi paga" volta na linha "paga antes" e dá para criar **uma segunda** correção. Se depois alguém desfizer a baixa, o `update cancelado_em = null` bate no índice único: sai um erro 23505, sem texto, na janela de desfazer. E o "Foi paga, sim" na parcela baixada responde `JA_VOLTOU`, "A parcela já voltou para 'Pago antes do T3jus'" (`0600:172`, `textos.ts:134`), o que é falso.
- **Correção:**
  - `corrigida`, `JA_MUDADA` e o índice passam a considerar como "em vigor" a correção não cancelada **ou com baixa** (`cancelado_em is null or baixa_id is not null`).
  - O "Foi paga, sim" na baixada recusa com `PARCELA_BAIXADA`.
  - O desfazer confere o índice antes e recusa com um código próprio, se um dia isso for possível.
  - Entra uma linha nas notas e um teste.

---

## Ajustar

### 5. O reembolso não fica parado: ele pula para a próxima parcela

- **Gravidade:** ajustar.
- **Trecho:** decisão 12, pergunta 4 e o texto "As custas de R$ 412,30 continuam a reembolsar, em A pagar".
- **Problema:** a ligação do reembolso com a parcela é **calculada**. É a primeira parcela não cancelada do cliente que vence a partir do lançamento da conta, e o comentário diz "se a parcela for cancelada, passa para a seguinte" (`0511:5-8`, `:21-35`, `:39-45`). Por isso, a baixa muda a cobrança das custas sem que ninguém veja:
  - na Noemi, não há parcela seguinte. As custas viram `REEMBOLSO` sem parcela, e o atalho da pendência passa a ser "Ver em A pagar" (`0900:97-106`);
  - no Sebastião, as custas que iam com outubro **passariam a ir com novembro** e apareceriam em "Leva junto" na próxima linha.

  O desfazer faz o caminho de volta, também sem aviso.
- **Correção:**
  - A janela diz para onde vão as custas: "As custas de R$ X passam a ir junto com a parcela de novembro" ou "As custas de R$ X ficam a reembolsar, em A pagar".
  - A caixa da pergunta 4 aparece quando há reembolso ligado a esta parcela no momento da baixa.
  - A pergunta 4 à Carol conta esse comportamento.
  - O desfazer avisa quando as custas voltam para esta parcela.

### 6. A pergunta 4, se for sim, mexe em mais lugares do que o plano lista

- **Gravidade:** ajustar.
- **Trecho:** seção 3, item 11.
- **Problema:**
  - `contas_pagar_guardiao` compara a linha inteira, menos `v_livres` (`0534:56-57`). Uma coluna nova (`reembolso_baixa_id`) precisa entrar ali.
  - O sino do caso pronto exige que "tabela ou coluna nova que entra no `caso_acerto` ganhe o gatilho" (`0990`, cabeçalho). Os gatilhos de `contas_pagar` só olham `reembolsado_em`, `cancelada_em` e `caso_id` (`0990:543-551`), então a baixa das custas **não** dispararia o aviso.
  - O "a reembolsar" é lido em mais lugares que o `caso_acerto`: A pagar (`0230`), repasses (`0280`), o relatório de adiantadas (`relatorio_adiantadas`, `0410:197-209`), o 0512, a divisão do alvará (`0640`) e o `conta_linha` (`0511:57`).
- **Correção:** guardar a baixa das custas só em `parcela_baixas.reembolso_conta_id`, sem coluna em `contas_pagar`, e ler isso por uma função única (`conta_reembolso_baixado(c)`, que confere que a baixa não foi desfeita). Na seção 3, listar cada leitor do "a reembolsar" e o gatilho de `parcela_baixas` para o sino.

### 7. O sino do carnê desatualizado dispara com texto errado na baixa e no desfazer

- **Gravidade:** ajustar.
- **Trecho:** decisão 28 e estado 19 (só a lista "o que mudou" do carnê).
- **Problema:** o gatilho `avisos_sino_parcela_do_carne` (`0623:110-127`) dispara quando `cancelado_em` muda. Na baixa, o motivo vai como `CANCELADA` ("foi cancelada"). No desfazer, `cancelado_em` volta a nulo, e o `case` cai no `else 'VALOR'`, que diz que o **valor** da parcela mudou.
- **Correção:** dois motivos novos em `carne_avisar_desatualizado`, `BAIXADA` ("a parcela 6/6 teve baixa sem receber") e `BAIXA_DESFEITA` ("a parcela 6/6 voltou para A receber"), mais o texto em `Carne.tsx` (`textoMudanca`, `:104-110`). O `podeEntrar` de `Carne.tsx:744` também precisa tirar `BAIXADA`. Hoje o servidor já não manda essa parcela (`0450:140`), mas o tipo novo deixa o filtro incompleto.

### 8. Na parcela paga em parte não existe "Registrar" na linha

- **Gravidade:** ajustar.
- **Trecho:** decisão 1 ("Ao lado dele… entra o botão 'Dar baixa'") e estado 4.
- **Problema:** o "Registrar" compacto só aparece quando a parcela **não tem nenhum pagamento**. Se tem, a coluna mostra recibo e comprovante (`Financeiro.tsx:1164-1184`). Na linha do Sebastião não há "Registrar" para ter um botão ao lado. A coluna se chama "Recibo", tem 17% da largura (`:1143`) e passaria a ter recibo, comprovante, "Registrar", "Dar baixa" e depois "Desfazer a baixa".

  Há mais pontos da tela que o tipo novo atinge:
  - o botão do carnê aparece com `vivas.some(p => p.situacao !== "PAGA")` (`:1129`), e a baixada contaria;
  - a classe da linha (`:1155`) não conhece a baixada;
  - há 32 comparações com `"CANCELADA"` no `ui`, que precisam ser revistas.
- **Correção:**
  - Decidir onde ficam as ações da linha. Recomendo trocar o nome da coluna para "Recibo e ações", ou criar uma coluna "Ações". O estado 4 mostra a linha parcial **antes** da baixa.
  - A seção 3 lista as mudanças do `ui`: o filtro do carnê, a classe da linha e as 32 comparações.

### 9. "Baixa" já quer dizer "recebido" no T3jus

- **Gravidade:** ajustar (tom).
- **Trecho:** decisão 5 (botão "Dar baixa") e seção 5 ("Baixa feita.").
- **Problema:** a ideia aprovada e o código usam "baixa" para o recebimento:
  - a ideia FI-02 diz "cada recebimento baixa a parcela";
  - a rota de recebimento tem o comentário "Registrar recebimento: baixa a parcela do mês dela" (`app.ts:1004`);
  - a ficha escreve "baixou novembro" na parcela paga (`Financeiro.tsx:932`);
  - a divisão do alvará devolve `exitoBaixado` e o texto "Esta parte já deu baixa na parcela do êxito" (`0651`).

  Um botão "Dar baixa" sozinho, ao lado de "Registrar", lê-se como "dar como paga".
- **Correção:**
  - "Sem receber" vai **sempre** junto. Na linha, o botão é "Dar baixa sem receber". No celular cabe, porque o botão ocupa a largura do cartão.
  - O botão da janela é "Dar baixa sem receber na parcela 6/6".
  - O aviso fica "A parcela 6/6 de Noemi saiu de Em atraso sem receber." O "Baixa feita" sai.
  - O selo "Baixa sem receber" fica como está.

### 10. "Renegociada": contas em dobro, um exemplo impossível e ninguém avisa Contratos

- **Gravidade:** ajustar.
- **Trecho:** decisões 11, 20, 21 e 23, seção 3 item 6, caso B e pergunta 2.
- **Problema:**
  - **a. Contratado e "Baixado sem receber" em dobro.** O plano faz o Contratado contar a parcela baixada. Na renegociada, os R$ 500,00 voltam como parcelas novas, que também contam. O contrato passa a valer R$ 500,00 a mais, e "Baixado sem receber" mostra como perda um dinheiro que vai entrar.
  - **b. O exemplo não se faz no T3jus.** "Os R$ 500,00 entram somados às parcelas de dezembro e janeiro" não é possível: as parcelas nascem das condições (`0200:121-170`), e mudar uma condição refaz a programação daquele tipo a partir de hoje (`0200:512-517`). Não dá para somar valor a duas mensalidades. O que existe é uma condição nova, por exemplo "Parcelado: 2 × R$ 250,00 a partir de dezembro".
  - **c. Desfazer cobra duas vezes.** Desfazer uma renegociada depois que as parcelas novas foram criadas põe os R$ 500,00 de volta em atraso **e** mantém as novas.
  - **d. Contrato encerrado.** Com o contrato encerrado, "Renegociada" registra como baixa um dinheiro que vai entrar fora do T3jus.
  - **e. Ninguém avisa Contratos.** Diego (sem Contratos) dá a baixa, e Felipe (sem Financeiro) não pode ler a explicação. Nada avisa a área Contratos de que há uma condição a mudar.
- **Correção:**
  - O Contratado conta Perdoada e Inadimplência, e não Renegociada. "Baixado sem receber" separa "renegociado".
  - O exemplo vira uma condição nova.
  - O desfazer da renegociada avisa: "Se o combinado já virou parcelas novas em Contratos, desfazer cobra o valor duas vezes."
  - No contrato encerrado, "Renegociada" não é oferecida, e a janela diz: "Se o cliente ainda vai pagar, deixe a parcela em atraso e registre quando entrar."
  - Para o aviso a Contratos, a baixa renegociada feita por quem não tem Contratos cria uma próxima ação de cobrança, ou um aviso no sino, para quem cuida do contrato. A escolha vai à Carol (nota 15).

### 11. Relatórios: desfazer reescreve o passado, e o atraso perde as baixas

- **Gravidade:** ajustar.
- **Trecho:** decisão 9 ("Baixa com data passada abriria espaço para mexer em relatório já fechado"), decisão 30 e seção 7.
- **Problema:**
  - `relatorio_abertas` decide se a parcela estava em aberto num dia pelo `cancelado_em` da linha (`0410:185`). O desfazer zera esse campo. Com isso, os relatórios de meses passados passam a mostrar a parcela como aberta durante todo o tempo em que ficou baixada. É o mesmo "mexer em relatório fechado" que a decisão 9 quer evitar.
  - Os relatórios de valores vencidos (IN-04) e de atrasos por idade (IN-07) perdem a parcela sem dizer por quê.
- **Correção:**
  - `relatorio_abertas` lê os períodos em vigor de `parcela_baixas`, e não o `cancelado_em`. Entra um teste: baixa em outubro, desfeita em dezembro, e o relatório de novembro não muda.
  - O número "Baixado sem receber" nos Relatórios não precisa de ideia nova: o item pendente cita **IN-04** e **IN-07**, que já existem.

### 12. Falta conferir o Portal "só para consulta", e os códigos de erro não batem

- **Gravidade:** ajustar.
- **Trecho:** seção 3, item 5, e decisão 14.
- **Problema:**
  - O "Não foi paga", que é o padrão citado, entra com `pago_antes_entrar`. Ela chama `portal_exigir_escrita` (`0600:72-79`) e recusa a escrita quando o contrato do escritório com o T3jus acabou (`0210:382-393`, `0690:420`). As funções do plano só chamam `entrar_area` e `entrar_escritorio`.
  - `SEM_PERMISSAO` já existe em `TEXTOS_MOTIVO`, com outro texto: "Só quem fez a importação ou a sócia dona…" (`textos.ts:62`).
  - Quem perde a área recebe `TC401` com `AREA_NAO_LIBERADA` (`0140:106-108`), e quem perde a ação recebe `TC401` sem motivo (`0010:207-208`).
- **Correção:**
  - As duas funções entram como o "Não foi paga": área, ação e `portal_exigir_escrita`.
  - Os erros de permissão usam os códigos que já existem: `AREA_NAO_LIBERADA` e o 401 genérico. Nenhum `SEM_PERMISSAO` novo.
  - O desfazer recusa também quando o contrato não está `ATIVO` nem `ENCERRADO`, ou quando a importação dele foi desfeita.

### 13. Concorrência: clique duplo, alvará e desfazer

- **Gravidade:** ajustar.
- **Trecho:** decisões 13 e 14 e seção 3, item 12.
- **Problema:**
  - **Clique duplo.** Com o botão "nunca desabilitado" e sem estado de envio, um segundo clique dá à própria Marina "Marina Ribeiro já deu baixa nesta parcela às 10h13".
  - **Alvará.** A baixa do saldo de uma parcela de êxito tem um caminho de corrida. `exito_parcelas_abertas` lê fora da trava e depois trava sem conferir de novo (`0651:21-32`, `:66-69`). Uma baixa entre as duas coisas deixa o pagamento cair numa parcela baixada.
  - **Alvará depois da baixa.** Se o alvará chega depois de uma baixa do êxito, os honorários entram no caixa (`relatorio_entradas`, destinação), mas a parcela continua "baixa sem receber", porque não é mais aberta.
  - **Recebimento e baixa juntos.** O recebimento e a baixa travam a mesma linha (`for update`, `0220:304`), e o `falta` da tela resolve o caso. Isso está certo.
- **Correção:**
  - Enquanto envia, o botão fica `aria-busy` e diz "Dando baixa…", sem aceitar um segundo envio.
  - O servidor trata como sucesso uma baixa repetida da mesma pessoa com o mesmo saldo.
  - `exito_parcelas_abertas` confere de novo depois da trava.
  - A proposta de divisão do alvará mostra o êxito baixado do cliente, com "Desfazer a baixa" antes de dividir. Pode ficar só nas notas, mas precisa estar escrito.

### 14. O desfazer deixa a parcela em atraso sem ninguém cuidando dela

- **Gravidade:** ajustar.
- **Trecho:** decisões 16 e 17.
- **Problema:** depois do desfazer, a régua não volta para aquela parcela. `avisos_desde` corta os passos antigos, e a execução já existente impede outra da mesma automação (`0721:259`). Com isso, a parcela fica em atraso, e a próxima ação de cobrança dela pode ser velha ou nem existir. O "Não foi paga" resolve isso criando uma anotação com "Falar com <cliente>" amanhã, para quem cuida do contrato (`0600:147-149`).
- **Correção:** o desfazer cria a mesma anotação (tipo `ANOTACAO`, texto "Baixa desfeita: <explicação>", próxima ação amanhã, para quem cuida do contrato). O aviso de confirmação diz isso.

### 15. Perguntas para a Carol: as que faltam e as que podem sair

- **Gravidade:** ajustar.
- **Faltam:**
  - **O que vê quem não tem Financeiro** (nota 2). Recomendo a linha neutra "Fora da cobrança, por decisão do Financeiro", sem o motivo.
  - **Renegociada** (nota 10): não oferecer no contrato encerrado e não contar no Contratado. E, quando quem dá a baixa não tem Contratos, criar a próxima ação para quem cuida do contrato?
  - **"Inadimplência" e a IA** (nota 16): se o escritório ainda pode cobrar na Justiça, a IA não deve dar a entender ao cliente que nada está em aberto.
- **Podem sair ou encolher:**
  - A pergunta 2 cabe dentro da nova pergunta sobre a renegociada.
  - A pergunta 1 (desfazer) pode virar decisão, porque segue o padrão aprovado do "Foi paga, sim". Se ficar, deve citar o aviso da nota 10c.
  - A pergunta 3 fica: a aprovação foi "só com `financeiro.editar`", e vale mostrar que isso inclui a equipe. Mas a frase "Quem dá baixa: Marina Ribeiro ou Diego Almeida" (decisão 4) esquece a Bianca, que tem Financeiro no elenco aprovado (`portal-fechamento-sem-levantamento/NOTAS.md`, estado 1).
- **A pergunta 4** precisa contar o salto do reembolso (nota 5).

### 16. A IA e a parcela baixada por inadimplência

- **Gravidade:** ajustar.
- **Trecho:** decisão 27.
- **Problema:** a IA lista ao cliente só `VENCIDA`, `PARCIAL` e `A_VENCER` (`0330:90-99`). A parcela baixada some da conversa. Se o cliente perguntar "estou devendo algo?", a IA responde como se nada estivesse em aberto. Na baixa por inadimplência isso pode atrapalhar uma cobrança judicial que o escritório ainda faça.
- **Correção:** a IA recebe a parcela baixada como "assunto da equipe". Quando o cliente pergunta, ela passa a conversa para a pessoa. A decisão final vai à Carol (nota 15).

---

## Sugestões

### 17. Afirmações sobre o código para corrigir no v2

- **Gravidade:** sugestão.
- **O histórico e o texto livre.** O motivo dado para tirar a explicação do histórico está errado. `historico_tem_dado_proibido` só proíbe **chaves** como `nome`, `email`, `cpf` e `telefone` (`0020:47-66`), não texto livre. O próprio "Não foi paga" grava o motivo (`0600:150-152`), e a cobrança também (`0220:384-385`). Tirar a explicação pode ser uma boa escolha, mas com o motivo certo: ela já fica em `parcela_baixas`, e o histórico é lido por mais gente.
- **`0220:365`** é a `portal_financeiro_cobranca_anotar`, não o registrar. Ela também precisa recusar com `PARCELA_BAIXADA`, porque hoje diria "foi cancelada no contrato".
- **`0851:191`** é a próxima parcela do passo "Encerrar o contrato". O `cliente_fechamento` em vigor é o de `0900:243`.
- **Os gatilhos da régua.** As versões em vigor de `automacao_candidatos` e `automacao_andar` são as de `0721:234` e `0670:277`, não as de `0340` e `0570`.
- **"A parcela sem valor não tem o botão" (decisão 1).** Isso não precisa ser dito: a ficha nem lista parcela sem valor (`0220:275`). Mas vale uma nota: a pendência `PARCELA_SEM_VALOR` também segura o caso perdido para sempre, se a base nunca vier, e a baixa não resolve isso.

### 18. Estados que sobram e que faltam

- **Gravidade:** sugestão.
- **Sobram:**
  - o 17 (`bx-a-receber-vazio`) é o vazio aprovado sem mudança;
  - o 7 (`bx-ja-baixada`) cabe como variação do 6;
  - o 19 (carnê) pode ficar nas notas com o texto.
- **Faltam:**
  - a linha paga em parte **antes** da baixa (nota 8);
  - a janela enviando, com "Dando baixa…" (nota 13);
  - o desfazer da renegociada, com o aviso (nota 10);
  - o estado 16 refeito (nota 2).

### 19. Textos

- **Gravidade:** sugestão.
- **Legenda dos motivos.** "Por que a parcela não vai ser recebida" é falsa na renegociada, em que o dinheiro vai entrar. Melhor: "Por que a parcela sai de Em atraso sem receber".
- **Ajuda dos motivos.** As duas primeiras se confundem, e "por aqui" é vago. Proposta:
  - Perdoada: "O escritório decidiu abrir mão deste valor.";
  - Inadimplência: "O cliente não pagou, e o escritório parou de cobrar pelo T3jus.";
  - Renegociada: "O valor vai entrar em outra combinação com o cliente."
- **Erros.** `PARCELA_JA_BAIXADA` usa o mesmo botão "Ver como ficou" do conflito, no lugar de "Recarregue a página".
- **"A janela mostra a hora em que foi aberta (10h11)."** Isso é ruído na tela: basta a hora do outro no texto do conflito.

### 20. Acessibilidade e celular

- **Gravidade:** sugestão.
- **Tamanho dos botões.** O F3.165 (44 px) ainda está **pendente** e não foi aprovado (`F3.165.json`). Desenhar a 44 px está bem, mas as notas devem dizer que o resto da tabela segue a 36 px até o F3.165, para que ninguém compare telas diferentes.
- **Foco depois de desfazer.** O botão "Desfazer a baixa" some, que é o caso que o próprio F3.165 cita. O foco vai ao botão "Dar baixa sem receber", que volta a existir, ou ao título da linha.
- **Os números da ficha.** Cinco números em duas colunas deixam um sozinho na última linha. "Baixado sem receber" pode ocupar a largura toda.

### 21. Painel e `IDEIAS.md`

- **Gravidade:** sugestão.
- **FI-08.** O texto ainda diz "só encerra com tudo recebido e tudo repassado". No commit da entrega, ajustar para "tudo recebido ou baixado com motivo, e tudo repassado", sem mudar o código da ideia, para o `IDEIAS.md` não se contradizer com o FI-24.
- **Pendências dos Relatórios.** Os itens pendentes dos Relatórios citam IN-04 e IN-07 (nota 11), e não uma ideia nova.
- **A conta das ideias.** O total de 139 para 140 com o FI-25 confere: a seção FI tem 24 ideias hoje.

---

## Resumo para o v2

1. Régua: a parcela cancelada nunca vai ao ramo "Pagou" (nota 1).
2. Contratos sem Financeiro: nenhum motivo da baixa aparece, e as contagens incluem a baixada (nota 2).
3. Totais do acerto e "Recebido no mês" contam a baixada e o que já entrou nela (nota 3).
4. "Não foi paga": a correção com baixa continua valendo como correção (nota 4).
5. Corrigir também: o reembolso que pula, o sino do carnê, a linha parcial, "sem receber" em todo botão, a renegociada, os relatórios pelos períodos de baixa, `portal_exigir_escrita`, o clique duplo, a anotação no desfazer e as perguntas revistas (notas 5 a 16).
