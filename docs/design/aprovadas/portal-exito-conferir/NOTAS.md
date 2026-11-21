# Portal: êxito para conferir · notas

**Aprovado pela Carol em 21/11/2026 às 17h59 (Bahia), com "aprovo pode seguir": as recomendações das 4 perguntas valem como decisões.** O êxito é lançado sempre (a opção "virá por alvará" sai da janela de não cobrar); o êxito para conferir não entra nos números do alto; mudar o valor só pede o motivo, com aviso no sino; o reembolso nunca é marcado como pago sozinho.

Desenho que a Carol aprovou antes de virar código. É um acréscimo ao Financeiro aprovado (19/11/2026). Ele atende:

- **CH-07** (cobrança do êxito a partir do contrato) e **EX-08** (resultado do caso): no Jurídico, ao encerrar com Ganho ou Acordo, o T3jus já calcula o êxito pelo contrato de cada cliente e manda ao Financeiro "para conferir" (decisão 6 do Jurídico aprovado). Faltava desenhar **onde e como o Financeiro confere**. É isso que esta pasta mostra;
- **FI-07** (reembolso de despesa adiantada ligado ao caso): como a parcela mostra o reembolso que vai junto e como "Registrar recebimento" registra os dois.

O ponto de partida é o Financeiro aprovado (A receber, ficha do contrato e a janela "Registrar recebimento"). As peças aprovadas não mudaram: o gerador importa o `financeiro.py` e o `comum.py` aprovados, sem mudança, e acrescenta os estados novos com peças de prefixo `ex-`. O método é o mesmo do carnê (`portal-carne`).

## Como abrir

- `index.html` apresenta o desenho para aprovação, com as capturas de computador (1440) e celular (390), a legenda de cada estado e as perguntas. Clique numa imagem para abrir o HTML naquele estado. Funciona publicado junto com os arquivos desta pasta (caminhos relativos).
- `financeiro.html?estado=…` segue o padrão das telas aprovadas (`<template data-est>`). Os 16 estados aprovados continuam lá, sem mudança; os 10 novos estão na tabela abaixo. Abaixo de 760 px vira celular. Funcionam as janelas (abrir, fechar, Esc) e os links entre os estados principais; o resto é desenho.
- `_fonte/gerar.sh` refaz tudo (HTML, `index.html`, capturas WebP, axe e `_conferencia.json`):
  - `exito.py`: os estados novos;
  - `casos_ex.py`: a lista de estados e o `index.html`;
  - `fotos.cjs`: capturas e conferências (axe, rolagem lateral, alvos, erros de script);
  - `financeiro.py`, `comum.py`, `webp.py`: cópias sem mudança das aprovadas. O `comum.py` lê o CSS das telas aprovadas em `/home/claude/t3just/docs/design/aprovadas/`, como no Financeiro aprovado.

## Estados (10, cada um em computador e celular)

| # | Estado | Quem | O que mostra |
|---|---|---|---|
| 1 | `receber-conferir` | Diego | A receber com o bloco novo "Êxito para conferir" no alto: Joana e Carlos, cada um com caso, contrato, a conta, o valor calculado, a data prevista, quem encerrou e quando, e "Conferir" |
| 2 | `conferir` | Diego | Janela "Conferir o êxito": de onde veio, honorário e vencimento preenchidos e editáveis, forma, responsável, a linha sobre alvará e Repasses, "Lançar em A receber" e "Não cobrar este êxito" |
| 3 | `conferir-erro` | Diego | Valor mudado para R$ 7.000,00 sem motivo e vencimento 31/11/2026, com resumo no topo e erro preso a cada campo |
| 4 | `conferir-erro-valor` | Diego | Valor em branco (o mesmo erro vale para zero) |
| 5 | `nao-cobrar` | Diego | Janela "Não cobrar este êxito", com o motivo e a explicação obrigatória |
| 6 | `conferido` | Diego | Aviso de sucesso; a parcela "Êxito · Pereira x Mercado Bom Preço" na lista, com os selos Novo, Êxito e A vencer e a origem; o bloco do alto fica só com Carlos |
| 7 | `conferido-contrato` | Diego | Ficha do contrato de Joana (peças do estado `contrato` aprovado) com a parcela do êxito e a origem "Do encerramento do caso em 18/11, conferido por Diego", o histórico e o fechamento do caso |
| 8 | `receber-reembolso` | Diego | Na lista do A receber, a parcela 2/3 da Construtora mostra "+ reembolso R$ 1.248,36" e "Leva junto: custas da apelação" |
| 9 | `registrar-reembolso` | Diego | A janela aprovada "Registrar recebimento", em 28/11, com a faixa do reembolso (parcela + reembolso = R$ 3.648,36) e a caixa "O reembolso também foi pago" desmarcada |
| 10 | `registrar-reembolso-junto` | Diego | A mesma janela com a caixa marcada: valor e forma do reembolso e o total registrado |

## Decisões de design

1. **O êxito para conferir mora em A receber, no alto, e só aparece quando há algo.** É uma pendência de quem cuida do dinheiro, e A receber é onde Diego já trabalha todo dia. O bloco vem antes dos quatro números, porque pede ação. Ele é uma folha branca com o filete vinho à esquerda e a balança (o ícone do Jurídico, de onde o valor veio), e o selo "2 esperando você".
2. **Êxito é dinheiro do escritório: família vinho, nunca o campo âmbar.** No Financeiro aprovado, o campo âmbar com escudo é o sinal de "De terceiros" (decisão 1). Por isso o bloco não usa âmbar como campo; o âmbar entra só no selo de atenção, como no resto da área.
3. **Os números do alto não mudam.** Até alguém conferir, o êxito é um cálculo, não uma cobrança. Somar ao "Em aberto" misturaria uma coisa com a outra. O bloco tem o próprio total, só de êxito ("2 clientes · R$ 13.400,00 calculados pelo contrato"), e uma linha diz que esses valores ainda não entram nos números. Depois de lançado, o êxito vira parcela como qualquer outra. Os números aprovados contam até 30/11 (o "Em aberto" é a soma dos três grupos do mês); por isso o êxito de 15/12 entra num grupo novo, "Em dezembro · lançada agora", e a contagem diz "12 parcelas em aberto até 30/11 · e a de êxito lançada agora, para 15/12".
4. **Cada linha diz tudo o que se confere sem abrir nada:** cliente e caso (com link para o caso no Jurídico), contrato e a conta ("30% de R$ 28.000,00 · cláusula 4ª"), o valor, a data prevista com o dia da semana, e quem encerrou o caso e quando. "Conferir" é o botão principal da linha, com rótulo completo para leitor de tela ("Conferir o êxito de Joana Pereira"). Uma linha por cliente, porque cada um tem o próprio contrato e o próprio percentual.
5. **A janela "Conferir o êxito"** segue o padrão das janelas aprovadas (larga, 760 px):
   - no alto, o alvo (Joana · honorário de êxito, R$ 8.400,00), como em "Registrar recebimento";
   - **De onde veio**, numa tabela de duas colunas: caso, resultado (acordo homologado em 18/11, quem encerrou e a hora), valor para Joana e a data prevista, contrato com a cláusula escrita entre aspas, e a conta em destaque;
   - honorário e vencimento já preenchidos e editáveis. A ajuda do valor diz que mudar pede o motivo; a do vencimento diz que a data sugerida é a do pagamento do acordo;
   - forma de pagamento e responsável pela cobrança (toda parcela tem responsável, como no aprovado);
   - uma linha explica que, **se o dinheiro do acordo entrar pelo escritório (alvará ou depósito), o honorário sai na divisão de Repasses e a parcela do êxito é baixada por lá**;
   - a faixa do caixa: entra no caixa do escritório, porque é honorário;
   - no pé: "Lançar em A receber" (principal), "Cancelar" e, separado à esquerda e sem peso, "Não cobrar este êxito". No celular, ele desce para baixo dos outros dois.
6. **Mudar o valor pede o motivo.** Se o valor sai diferente do calculado, aparece o campo "Por que mudou o valor", obrigatório, numa faixa sal logo abaixo, e a ajuda do valor passa a dizer "Era R$ 8.400,00, pelo contrato. Mudou para R$ 7.000,00". O motivo fica no histórico do caso e do contrato, com nome e hora.
7. **Erros** (`conferir-erro` e `conferir-erro-valor`): valor em branco ou zero ("Diga o valor do honorário. Se este êxito não vai ser cobrado, use 'Não cobrar este êxito'"), motivo faltando ao mudar o valor e vencimento que não existe ("novembro tem 30 dias"). Resumo no topo ("Falta acertar 2 pontos, marcados abaixo. O êxito ainda não foi lançado."), erro preso ao campo e foco no primeiro campo com erro, como em "Registrar recebimento".
8. **Não cobrar este êxito** abre uma janela por cima, com o motivo em opções (virá por alvará ou depósito e será dividido em Repasses; perdoado ou renegociado; não é devido; outro) e a explicação obrigatória. Uma faixa lembra que o caso continua "Encerrado · acerto pendente" no Jurídico. "Voltar" devolve à janela de conferir. Nada some sem explicação (PT-03).
9. **Depois de lançar** (`conferido`): o aviso de sucesso diz o valor, a cliente, a data e que ficou no histórico. Na lista, a parcela tem os selos **Novo**, **Êxito** (selo de tipo com contorno vinho-4 e a balança, legível sem cor) e **A vencer**, e a origem escrita: "Do encerramento do caso em 18/11, conferido por Diego". No celular, a parcela nova aparece num cartão "Lançada agora", antes da lista.
10. **Na ficha do contrato** (`conferido-contrato`), feita com as peças do estado `contrato` aprovado: o âmbar mostra a próxima (R$ 8.400,00 em 15/12); a tabela mostra a parcela do êxito com a origem e a conta; ao lado, **De onde veio** (encerramento, cálculo, conferência, com hora e pessoa) e **Fechamento do caso** (o êxito de Carlos ainda falta conferir; nenhum valor de terceiros entrou). O caso fica "Encerrado · acerto pendente" até tudo ser recebido e repassado.
11. **Reembolso junto com a parcela (FI-07).** A despesa adiantada que vai "junto com a próxima parcela" (a opção do A pagar aprovado) aparece na parcela:
    - **na lista**, embaixo do valor, "+ reembolso R$ 1.248,36" com o ícone de reembolso, e na situação "Leva junto: custas da apelação…". O valor da parcela não muda: o reembolso não é honorário e aparece separado;
    - **em "Registrar recebimento"**, uma faixa diz que o cliente deve pagar a parcela mais o reembolso, com a soma em tabela (parcela, reembolso com a origem, total a pagar);
    - a caixa **"O reembolso também foi pago"** vem **desmarcada**. Marcada, ela abre o valor e a forma do reembolso (pode ser outra forma: aqui o cheque é só da parcela) e mostra o total registrado. O botão passa a dizer "Registrar R$ 3.648,36";
    - os dois entram no caixa do escritório (a parcela é honorário; o reembolso devolve o que o escritório pagou). O reembolso sai de "A reembolsar" e o recibo mostra as duas linhas.
12. **Celular.** Como no aprovado: o Financeiro mora no Mais, as tabelas viram cartões e as janelas sobem de baixo, com os botões no rodapé. A tabela "De onde veio" vira rótulo em cima e valor embaixo.

## Quem pode o quê

| Ação | Quem |
|---|---|
| Ver o bloco "Êxito para conferir", conferir, lançar ou não cobrar | Quem tem a área Financeiro |
| Mudar o valor calculado | Quem tem a área Financeiro, com motivo obrigatório |
| Registrar o resultado e encerrar o caso (de onde vem o êxito) | Quem tem a área Jurídico (decisão do Jurídico aprovado) |
| Ser avisado de que o valor mudou ou não vai ser cobrado | Quem encerrou o caso e o responsável pelo caso, pelo sino (pergunta 3) |

Quem tem só o Jurídico não vê valores nem percentuais (pergunta 4 do Jurídico aprovado).

## Acessibilidade (WCAG 2.2 AA)

- **axe-core 4.10** (WCAG 2.0, 2.1 e 2.2, A e AA) em 20 capturas (10 estados × computador e celular): **nenhuma violação**. Nenhuma tela tem rolagem lateral e não houve erro de script. O resultado fica em `_conferencia.json`.
- **Alvos:** todos com 44 px ou mais; os botões compactos das tabelas têm 36 px, como no aprovado. A única exceção é a palavra-marca "T3jus" da moldura aprovada (24 px), igual às outras áreas.
- **Janelas:** `<dialog>` com `showModal()`, e o Esc fecha. O foco vai para o valor (conferir), para o primeiro campo com erro (erros), para a primeira opção (não cobrar), para o valor da parcela (registrar com reembolso) e para a caixa do reembolso quando ela está marcada.
- **Formulários:** cada campo com `label`, grupos em `fieldset` e `legend`, erros ligados por `aria-describedby` com `aria-invalid` e o resumo no topo. Valores com `inputmode="decimal"` e datas em texto dd/mm/aaaa.
- **Cor:** nada depende só da cor. O êxito tem selo escrito com a balança; o reembolso tem "+ reembolso" escrito e o ícone; a parcela nova tem o selo "Novo"; o bloco para conferir tem título, selo e contagem.
- **Tabelas:** `caption` e `th` com `scope`; a soma do reembolso é uma tabela com `caption` e `tfoot`.

## O que precisa de dado novo no servidor

Todas as tabelas têm `escritorio_id` e passam por `proteger_tabela_escritorio`. O escritório vem da sessão, nunca do navegador. Dinheiro em centavos.

| Tabela | Campos | Observação |
|---|---|---|
| `exitos_conferir` (nova) | `id`, `escritorio_id`, `caso_id`, `etapa_mudanca_id` (→ `caso_etapa_mudancas`), `cliente_id`, `contrato_id`, `condicao_id` (→ `honorario_condicoes`, tipo EXITO), `base` (valor do cliente), `percentual`, `clausula` (cópia do texto), `calculado`, `previsto_em`, `situacao` (PARA_CONFERIR, LANCADO, NAO_COBRADO), `valor_lancado`, `vencimento`, `motivo_ajuste`, `motivo_nao_cobrar` (ALVARA, PERDOADO, INDEVIDO, OUTRO), `explicacao`, `recebimento_id` (→ `recebimentos_previstos`), `conferido_por`, `conferido_em` | Criada pelo encerramento do caso (uma por cliente com contrato de êxito). Só inserção e uma única conferência; nada se apaga. `valor_lancado` diferente de `calculado` exige `motivo_ajuste`. `NAO_COBRADO` exige motivo e explicação |
| `recebimentos_previstos` (acréscimo) | `origem` ganha `ENCERRAMENTO`; `exito_id` (→ `exitos_conferir`) | A parcela do êxito nasce na conferência, com `tipo = 'EXITO'`, forma e responsável |
| `contas_pagar` (acréscimo) | `caso_id`, `reembolso_parcela_id` (→ `recebimentos_previstos`) | Liga o reembolso "junto com a próxima parcela" à parcela certa. Se a parcela for cancelada ou trocada, o reembolso passa para a seguinte (checagem no servidor) |
| `pagamentos_recebidos` (acréscimo) | `reembolso_conta_id` (→ `contas_pagar`) | O reembolso pago junto é outro registro de pagamento, no caixa do escritório, que marca `contas_pagar.reembolsado_em`. O recibo mostra as duas linhas |

- **Fechamento do caso (FI-08):** o caso só sai de "Encerrado · acerto pendente" com todos os `exitos_conferir` lançados e recebidos, ou não cobrados com motivo, e todas as destinações de Repasses feitas ou dispensadas.
- **Alvará:** quando um levantamento do mesmo caso é registrado em Repasses, a divisão proposta já traz o honorário do contrato e, se houver parcela de êxito lançada para o cliente, a destinação "honorários" a baixa (a parcela fica paga, com a origem "da divisão do alvará de dd/mm").
- **Aviso no sino** a quem encerrou o caso e ao responsável pelo caso quando o valor muda ou o êxito não é cobrado.

### API

| Rota | O que faz | Erros |
|---|---|---|
| `GET /v1/financeiro/exitos?situacao=PARA_CONFERIR` | Lista o bloco "Êxito para conferir", com a origem | `AREA_NAO_LIBERADA` |
| `POST /v1/financeiro/exitos/:id/lancar` | Confere e cria a parcela do êxito | `VALOR_OBRIGATORIO`, `MOTIVO_OBRIGATORIO`, `DATA_INVALIDA`, `JA_CONFERIDO` |
| `POST /v1/financeiro/exitos/:id/nao-cobrar` | Guarda o motivo e a explicação | `MOTIVO_OBRIGATORIO`, `JA_CONFERIDO` |
| `POST /v1/financeiro/parcelas/:id/recebimentos` (acréscimo) | Aceita `reembolso: { valor, forma }` para registrar o reembolso junto | `REEMBOLSO_ACIMA_DO_ADIANTADO`, `REEMBOLSO_JA_PAGO` |

### Para o painel

- A entrega desta tela atende **CH-07** e **EX-08** (a parte do Financeiro: conferir e lançar) e **FI-07** (o reembolso aparece e é registrado junto com a parcela).
- Item "pendente", citando CH-07: a baixa da parcela de êxito pela divisão do alvará em Repasses (depende de a divisão aprovada reconhecer a parcela lançada).

## Perguntas para a Carol

1. **Êxito que vai chegar por alvará: lançar em A receber ou não cobrar aqui?** (Recomendo **lançar sempre**: a parcela fica visível e, quando o alvará for dividido em Repasses, o T3jus a baixa por lá. "Não cobrar" fica para perdão, renegociação ou erro. Se a Carol concordar, a opção "virá por alvará" sai da janela de não cobrar.)
2. **O êxito para conferir entra nos números do alto do A receber?** (Recomendo **não**: até alguém conferir, é um cálculo, não uma cobrança. O bloco tem o próprio total, só de êxito; depois de lançado, entra na lista como qualquer parcela.)
3. **Mudar o valor calculado precisa de aprovação da sócia?** (Recomendo **não**: basta o motivo obrigatório, com nome e hora no histórico do caso e do contrato, e um aviso no sino de quem encerrou o caso. Aprovação pela sócia fica para quando FI-10 sair da validação.)
4. **O reembolso vem marcado como pago quando o valor recebido cobre a soma?** (Recomendo **não marcar sozinho**: a caixa vem sempre desmarcada e o T3jus só sugere "o valor cobre a parcela e o reembolso; marcar?". Assim nenhum reembolso sai de "A reembolsar" sem alguém dizer.)

## O que precisei supor

- **Carlos é Carlos Henrique Dias**, contrato CT-2026-015 (R$ 1.500,00 de entrada + 25% do êxito), como no Jurídico aprovado. O pedido falava em "Carlos Pereira"; mantive o nome aprovado.
- **Joana Pereira**, contrato CT-2026-014, assinado em 20/02/2026, 30% do êxito, como no Jurídico aprovado. O texto da cláusula ("cláusula 4ª", e "3ª" para Carlos) é fictício.
- **Marina Ribeiro encerrou o caso em 18/11, às 14h50** (o estado `etapa-final` aprovado é dela, com o acordo homologado em 18/11 e pagamento previsto em 15/12/2026). Diego conferiu às 15h40 do mesmo dia, para manter o "hoje" do Financeiro aprovado (18/11).
- **Diego Almeida** tem as áreas Comercial e Financeiro, como no carnê (a pessoa entra só nesta página, sem mudar o `comum.py`). Ele é o responsável pela cobrança do êxito de Joana.
- **Reembolso:** as custas da apelação (R$ 1.248,36) são a conta lançada no estado `nova-conta` aprovado, com vencimento 21/11 e "cobrar junto com a próxima parcela" (a 2/3 da Construtora, 28/11, cheque pré-datado). Na lista de 18/11, a linha diz que o escritório paga a guia em 21/11. Os estados de registrar se passam em **28/11**, sobre a ficha do contrato da Construtora (que não existia; montei com as peças da ficha aprovada: 3 parcelas de R$ 2.400,00, responsável Felipe Matos), para que "adiantadas em 21/11" e o dia do depósito do cheque façam sentido.
- O capturado em celular usa 390 px, como pedido (o Financeiro aprovado usou 412).
