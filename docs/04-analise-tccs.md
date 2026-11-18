# O que os dois TCCs trazem para o T3jus

Análise de 18/11/2026. Pesquisa de consulta, como os docs 01 a 03. As ideias aprovadas pela Carol em 18/11/2026 estão no `IDEIAS.md` (CH-06 a CH-08, FI-07 a FI-11, EX-06 a EX-09, IN-07 e IN-08).

## Os dois trabalhos

| | TCC 1: "Procedimentos internos do setor financeiro de um escritório de advocacia" | TCC 2: "Juris Tantum" |
|---|---|---|
| Autores, ano | Lucas Cervo e Ricardo Pereira, Ciências Contábeis, UFSM, 2011 | Antonio Lacerda Rolim Neto, Análise e Desenvolvimento de Sistemas, IFPB, 2025 |
| O que é | Estudo de caso real: entrevistas com o sócio-gerente e o financeiro de um escritório (Santa Maria, RS, com filiais) | Um sistema web acadêmico para escritórios: clientes, advogados, processos, teses, audiências, gerador de procuração e petição, estatísticas |
| Valor para o T3jus | **Alto.** É exatamente o problema que o T3jus quer resolver, contado por quem vive ele | **Baixo a médio.** Confirma a lacuna (não tem financeiro) e traz 2 ou 3 ideias pontuais |

## TCC 1: o que serve

### 1. Os tipos de honorário que existem na prática
O escritório tinha sete fontes de receita, cada uma cobrada de um jeito:
- êxito: percentual sobre o que o cliente recebe (precatório ou RPV), definido em contrato;
- sucumbência e honorários de execução, definidos pelo juiz;
- mensalidade fixa (no caso, de sindicatos; equivale ao "partido mensal");
- honorário por entrar com a ação, geralmente parcelado;
- consulta avulsa;
- percentual mensal sobre um benefício no contracheque do cliente, por 12 meses, com valor que muda todo mês;
- diligências para parceiros, com reembolso de custos.

Para o T3jus: o contrato (CH-02) precisa aceitar mais de um tipo de honorário no mesmo cliente, não só "fixo parcelado".

### 2. O dinheiro dos outros passa pela conta do escritório
Repasse ao cliente, ao perito e ao escritório parceiro; custas e sucumbência que o escritório adianta e depois cobra do cliente. Isso confirma FI-05, FI-06 e VA-01, e acrescenta um ponto que ainda não está no `IDEIAS.md`: **despesa adiantada pelo escritório vira valor a reembolsar, por cliente e por processo**.

### 3. O sócio sabia o que queria e a planilha não entregava
O gerente pediu 14 relatórios. Os que não existiam eram justamente os do T3jus: inadimplência por cliente, custas a reembolsar por cliente, resultado de cada processo, repasses feitos a clientes, cobranças do contracheque esquecidas. A causa era sempre a mesma: os dados estavam em planilhas do Access que não somavam nada. É um bom argumento de venda e uma lista pronta de indicadores.

### 4. A passagem do jurídico para o financeiro é onde o dinheiro escapa
- Quando a execução terminava, o jurídico precisava avisar o financeiro para cobrar. Sem aviso formal, a cobrança se perdia, principalmente quando alguém da equipe saía.
- O TCC propõe uma "ordem de faturamento" assinada. No T3jus isso pode ser automático: **uma etapa do caso (ex.: requisição expedida) gera a cobrança e o aviso**.
- O processo só era arquivado depois de tudo recebido e tudo repassado. Vale virar regra: **fechamento financeiro do caso**.

### 5. Pagar com previsão, não no susto
- Contas a pagar só existiam no dia do pagamento. A proposta: toda sexta o sócio aprova a lista da semana seguinte, e o que for pago fora da lista precisa de justificativa.
- Quem lança a conta não é quem paga (separação de funções), e o advogado não deve receber dinheiro do cliente em mãos.
- Previsão de caixa (projetado contra realizado), incluindo os precatórios e RPVs com data estimada de recebimento.

### 6. Divisão de honorários entre sócios
Cada processo era dividido conforme a participação de cada sócio na data em que a ação foi ajuizada; havia adiantamento mensal fixo e acerto no fim do ano. Para escritórios de 3 a 10 pessoas isso aparece como "quanto cada sócio ou advogado leva de cada caso". Hipótese a validar com a advogada parceira.

### O que não serve (ou serve com cuidado)
- **Contabilidade formal** (DRE pelo regime de competência, custo do processo guardado no ativo, plano de contas): é trabalho do contador. O T3jus deve registrar o "a receber" no momento certo e exportar para o contador, não virar sistema contábil.
- **Filiais e centros de custo**: fora do público de 3 a 10 pessoas.
- **Datas desatualizadas**: o texto é de 2011. A regra do precatório citada (corte em 30 de junho) mudou com a EC 114/2021 (hoje o corte é 2 de abril). Qualquer regra de prazo precisa ser conferida na lei atual antes de virar código.

## TCC 2: o que serve

- **Confirma a lacuna**: o próprio quadro comparativo do autor marca "dashboard financeiro" como algo que o Juris Tantum não tem. Os sistemas acadêmicos e vários do mercado ficam em processo e documento; o T3jus fica no dinheiro.
- **Procuração e contrato gerados a partir do cadastro** (arquivo editável, não travado): útil no momento em que o cliente fecha. Liga com CH-01.
- **Audiências na agenda**, com visão de mês, semana e dia: cabe como um tipo de compromisso dentro de EX-04.
- **Pessoa com vínculo em mais de um escritório**: ele resolveu o mesmo problema que o PT-22 já prevê.

### O que não serve
- **Tecnologia**: Next.js, Express, Prisma e login por token guardado uma semana. A base do T3jus (Supabase, isolamento verificado no servidor, RLS, convites, auditoria) já é mais forte. Nada a copiar.
- **Gerador de petições**: a recomendação inicial era deixar de fora (é produção jurídica, outra categoria de produto, como Looplex e Projuris), mas a Carol decidiu incluir em 18/11/2026 como EX-09, a validar com a advogada parceira.
- **Banco de teses com estatística de vitória**: produção jurídica; fica de fora.
- **Comparativo de concorrentes**: superficial e com erros (diz, por exemplo, que o Astrea não tem agenda de audiências). Usar a nossa pesquisa (`docs/02-pesquisa-12-sistemas.md`).
- **Fases fixas do processo** (protocolo, contestação, impugnação, interlocutória, sentença): servem a um tipo de ação só. O T3jus deve deixar o escritório definir as etapas.

## Ideias novas sugeridas para o `IDEIAS.md`

Incluídas no `IDEIAS.md` em 18/11/2026, junto com EX-07, EX-08, EX-09 e IN-08, que saíram do Juris Tantum.

| Código | Ideia | Etiqueta | De onde |
|---|---|---|---|
| CH-06 | Vários tipos de honorário no mesmo contrato: fixo, parcelado, mensal, êxito em percentual, sucumbência, por ato ou consulta, percentual recorrente | [V1] | TCC 1 |
| CH-07 | Etapa do caso gera a cobrança e avisa o financeiro (ex.: requisição expedida vira valor a receber com data prevista) | [V1] | TCC 1 |
| CH-08 | Procuração e contrato de honorários gerados com os dados do cadastro, em arquivo editável | [VAL] | TCC 2 |
| FI-07 | Despesa adiantada pelo escritório (custas, sucumbência) vira valor a reembolsar, por cliente e por caso | [V1] | TCC 1 |
| FI-08 | Fechamento financeiro do caso: só encerra com tudo recebido e tudo repassado | [V1] | TCC 1 |
| FI-09 | Previsão de caixa, prevista contra realizada, incluindo precatórios e RPVs com data estimada | [V1] | TCC 1 |
| FI-10 | Aprovação de pagamentos pelo sócio (lista da semana) e separação entre quem lança e quem paga | [VAL] | TCC 1 |
| FI-11 | Divisão de honorários entre sócios ou advogados por caso, com adiantamento e acerto | [VAL] | TCC 1 |
| EX-06 | Audiências como compromisso na agenda, com visão de mês, semana e dia | [V1] | TCC 2 |
| IN-07 | Receita por tipo de honorário e atrasos por idade (até 30, 60, 90 dias) | [V1] | TCC 1 |
| EX-07 | Etapas do caso definidas pelo escritório; a lista mostra número, cliente e etapa | [V1] | TCC 2 |
| EX-08 | Na etapa final, o sistema pede o resultado, que alimenta a cobrança do êxito e os indicadores | [V1] | TCC 2 |
| IN-08 | Carga de cada advogado e casos por etapa | [V1] | TCC 2 |
| EX-09 | Gerador de petições com modelos do escritório e dados do cadastro, em arquivo editável | [VAL] | TCC 2 (Carol pediu) |

Perguntas que valem levar à advogada parceira, saídas do TCC 1:
1. Quais desses tipos de honorário ela usa hoje?
2. Ela adianta custas pelo cliente? Como lembra de cobrar depois?
3. Quem avisa que chegou a hora de cobrar o êxito?
4. Como os honorários são divididos entre quem trabalhou no caso?

## Segunda leitura (18/11/2026)

A Carol pediu uma nova revisão dos dois PDFs para achar o que tinha passado, incluindo os quadros e telas que só aparecem como imagem. O resultado entrou no `IDEIAS.md`.

### Ideias que já existiam e ficaram mais precisas

| Código | O que mudou | Por quê |
|---|---|---|
| AP-01 | O cadastro guarda a qualificação usada nos documentos (CPF, RG, estado civil, profissão, endereço) | O modelo de dados do Juris Tantum mostra que procuração e petição dependem desses campos |
| CH-06 | O percentual recorrente pode incidir sobre uma base que muda todo mês, com lembrete para pedir a base | No TCC 1, a cobrança sobre o contracheque era esquecida porque o valor mudava e alguém precisava pedir o documento todo mês |
| FI-02 | Cada recebimento baixa a parcela e o mês a que se refere, mesmo pago com atraso | No TCC 1, o pagamento atrasado de uma mensalidade aparecia como receita do mês em que entrou, escondendo quem estava em atraso |
| FI-05 | Os repasses têm beneficiário definido: cliente, perito ou escritório parceiro | Os três apareciam com controles separados no TCC 1 |
| EX-01 | Processo com área, parte contrária e tribunal; vários clientes no mesmo processo, cada um com os próprios honorários | A "ordem de faturamento" do TCC 1 lista vários clientes por processo, cada um com seus honorários; o Juris Tantum guarda área, parte contrária e sistema |
| EX-06 | Audiência com modalidade (presencial ou virtual) e link da sala | Campos do modelo de dados do Juris Tantum |

### Ideias novas

| Código | Ideia | Etiqueta | De onde |
|---|---|---|---|
| FI-12 | Prestação de contas ao cliente gerada no recebimento, enviada pelo WhatsApp | [V1] | TCC 1: a assistente montava à mão um "documento explicativo" com honorários, custas, repasses e o valor do cliente |
| FI-13 | Contas recorrentes previsíveis lançadas sozinhas todo mês | [V1] | TCC 1: contas guardadas numa pasta por vencimento, sem registro |
| FI-14 | Recibo gerado a cada pagamento recebido | [V1] | TCC 1: recibo manual a cada parcela em dinheiro ou cheque |
| FI-15 | Precatório ou RPV atualizado entre a requisição e o pagamento | [VAL] | TCC 1: correção monetária mensal sobre o valor requisitado |
| FI-16 | Conferência com o extrato do banco | [VAL] | TCC 1: sem cruzar pagamentos com extrato, o desvio só aparecia quando os comprovantes voltavam |
| EX-10 | Quem sai da equipe passa tarefas e cobranças para um responsável | [V1] | TCC 1: a troca de funcionário fazia a cobrança ser esquecida |
| EX-11 | Lembrete da audiência para o cliente pelo WhatsApp | [V1] | TCC 2: faltar à conciliação gera multa de até 2% (CPC art. 334, § 8º) e, no juizado, revelia (Lei 9.099, art. 20) |
| IN-09 | Comparação com meses anteriores e com a meta, com alerta de queda | [V1] | TCC 1: o sócio usava a comparação para achar falhas e fraudes |
| IN-10 | Quanto das despesas fixas a receita recorrente cobre | [V1] | TCC 1: o sócio media sua margem de segurança assim |
| IN-11 | Recebido e repassado por parceiro ou correspondente | [VAL] | TCC 1: avaliar se a parceria compensa |

### Conferido e deixado de fora
- Filiais e envio de movimento por planilha (fora do público de 3 a 10 pessoas).
- Plano de contas, DRE por competência e custo do processo no ativo (trabalho do contador).
- Números de processos, advogados e teses na tela inicial "para dar sensação de crescimento" (não ajuda a decidir nada; o Painel do dia já cobre o que importa).
