# Portal: o êxito com baixa sem receber na divisão do alvará (F3.174) e o "Baixado sem receber" nos Relatórios (F3.173) · notas

Desenho para a Carol aprovar, feito a partir do plano v2 (`t3jus/f3-174/plano.md`), que já aplica a `revisao.md`. Segue `docs/IDENTIDADE.md`, `docs/design/conceito-gabinete.md` e o design system D2. As perguntas A1 e A2 foram desenhadas com a opção recomendada pelo plano. Nada foi programado.

## Como abrir

- `index.html`: todos os estados, com a imagem do computador (1440) e a do celular (390) lado a lado, a legenda e o link para o HTML naquele estado.
- `financeiro.html?estado=eb-…` e `relatorios.html?estado=rb-…`: as telas vivas. Abaixo de 760 px viram celular.
- `<estado>-computador.png` e `<estado>-celular.png`: as capturas em escala 2. Os `.webp` são as mesmas imagens, menores, usadas no index. Quando há uma janela aberta, a captura cresce até mostrar a janela inteira.
- `_conferencia.json`: axe (WCAG 2.0, 2.1 e 2.2, A e AA), rolagem lateral, alvos menores que 44 px e erros de script, por estado e tamanho.
- `_fonte/gerar.sh <pasta>` refaz tudo. `exito_baixado.py` é o gerador novo, com os prefixos `eb-` e `rb-`. `comum.py`, `financeiro.py`, `relatorios.py`, `dados.py` e `webp.py` são cópias dos aprovados em `portal-relatorios`, sem mudança. A única diferença é que o `comum.py` lê do ambiente a pasta das telas aprovadas (`APROV`). O `fotos.cjs` vem de `portal-baixa-parcela-motivo`, com escala 2. O CSS `rp-` da janela foi copiado do `portal.css` de hoje.

## Os dados fictícios

São o escritório, a data e o elenco do D35: Ribeiro & Matos, quarta-feira, 18/11/2026, às 10h12, com Marina Ribeiro (sócia dona), Diego Almeida (Comercial e Financeiro) e Bianca Torres.

- **Parte A.** Rita Fonseca tem o contrato C-2026-021, do caso "Fonseca x Banco Aurora", com êxito de 30% sobre o acordo. A parcela do êxito é de R$ 4.800,00 e venceu em 20/10. Marina deu baixa sem receber por inadimplência em 05/11, com a explicação: "Rita disse que o banco não pagou o acordo; não vamos cobrar agora." Diego registra um alvará de R$ 16.000,00. Com o "sim" da A2, as custas de R$ 412,30 tiveram baixa junto com o êxito.
- **Parte B.** São os dados aprovados dos Relatórios, com duas clientes a mais. Rita, com o contrato só de êxito, teve R$ 4.800,00 baixados em 05/11. Noemi Bastos Carvalho, do C-2026-012, sob responsabilidade de Felipe, tem a parcela 6/6 de R$ 1.000,00, que venceu em 10/10, teve baixa em 15/10 e foi desfeita em 12/11 por Marina; as custas de R$ 412,30 foram junto. Sebastião tem R$ 500,00 renegociados em 10/11.
  - Nada entrou de Rita nem de Noemi no período, por isso **Entrou e Rendeu não mudam**.
  - A 6/6 de Noemi voltou para Em atraso, e por isso Falta receber passa de R$ 42.070,00 para R$ 43.070,00. O vencido sobe para R$ 8.050,00, com 1 parcela na faixa de 31 a 60 dias.
  - Em 31/08 a 6/6 de Noemi estava a vencer, então o Falta receber daquele dia passa de R$ 38.940,00 para R$ 39.940,00, e a comparação continua "R$ 3.130,00 a mais que em 31/08". O êxito de Rita fica fora de 31/08: o êxito entra quando acontece.
  - A soma por cliente continua fechando com a visão geral, conferida pelo gerador.
  - **Diferença com o D35:** lá, a 6/6 de Noemi vence em 10/11 e a baixa é em 18/11. O plano B usa a baixa em 15/10, então a parcela precisa ter vencido antes. Usei 10/10.

## Estados (12, cada um no computador e no celular)

| # | Estado | Quem | O que mostra |
|---|---|---|---|
| 1 | `eb-proposta` | Diego | A janela de hoje, com o que entrou, o caso, o valor, o dia, a faixa de terceiros e o quadro "Divisão proposta pelo contrato C-2026-021".<br>• Na célula dos honorários fica só "Êxito com baixa sem receber · veja abaixo".<br>• Abaixo da tabela, ainda dentro do quadro, vem o aviso: o título, o detalhe e a explicação entre aspas, o texto que orienta e o grupo "O que fazer com o êxito de Rita", sem nada marcado.<br>• Rita fica com R$ 11.200,00. |
| 2 | `eb-desfazer-escolhido` | Diego | "Desfazer a baixa antes de dividir" está marcado.<br>• Abre "Por que desfazer", já preenchido, com a ajuda "Fica no histórico da parcela.".<br>• Os honorários passam a dizer "Paga a parcela do êxito (falta R$ 4.800,00)".<br>• Entra "Reembolso: custas · R$ 412,30", com "Tinham baixa junto com o êxito; voltam a ser cobradas" (A2 com o sim).<br>• Rita fica com R$ 10.787,70. |
| 3 | `eb-mantida` | Diego | "Manter a baixa e tirar os honorários" está marcado. A linha dos honorários sai, Rita fica com R$ 16.000,00, e a nota sob o grupo diz o que acontece. |
| 4 | `eb-erro` | Diego | Diego tentou registrar sem escolher.<br>• No topo, o resumo "Falta acertar 1 coisa. Nada foi registrado ainda.", com um link de 44 px que leva ao primeiro rádio.<br>• Logo depois da legenda do grupo, o erro "Escolha o que fazer com o êxito de Rita: desfazer a baixa sem receber ou tirar os honorários.".<br>• Os rádios aparecem com `aria-invalid`, e o foco fica no primeiro. |
| 5 | `eb-conflito` | Diego | A recusa `EXITO_MUDOU` aparece no topo da janela, em `role="alert"`: "Bianca Torres desfez a baixa sem receber do êxito de Rita às 10h13. Nada foi registrado. Veja a divisão refeita antes de registrar.".<br>• O botão "Ver a divisão refeita" recebe o foco.<br>• O que Diego tinha escolhido ("Desfazer…" e a explicação) continua na janela. |
| 6 | `eb-historico` | Marina | A ficha do repasse de Rita, registrado com "Manter".<br>• No histórico, a linha "Registrado sem os honorários do êxito: a parcela de Rita continua com baixa sem receber (inadimplência, por Marina Ribeiro em 05/11).", sem a explicação da baixa.<br>• O fechamento do caso diz que o êxito ficou com baixa e foi mantido. |
| 7 | `rb-visao` | Marina | Na visão geral de setembro a novembro, a folha "Baixado sem receber" aparece na coluna lateral, depois de "Falta receber".<br>• O número R$ 5.800,00, de 2 parcelas, com "Inadimplência R$ 5.800,00" e "R$ 0,00 em jun. a ago.".<br>• As três linhas do plano, cada uma com "não soma" escrito.<br>• O pé do plano. |
| 8 | `rb-visao-nenhuma` | Marina | Junho a agosto, escolhido em "Escolher datas". A folha mostra só "Nenhuma baixa sem receber de jun. a ago.", com o mesmo pé. |
| 9 | `rb-mes-passado` | Marina | Noemi, de 01/10 a 31/10.<br>• O quinto número "Baixado sem receber · R$ 1.000,00".<br>• A lista com "15/10 · Baixa sem receber · Parcela 6/6 · inadimplência · por Marina Ribeiro · R$ 1.000,00", a explicação entre aspas e o selo "desfeita em 12/11". |
| 10 | `rb-cliente` | Marina | Noemi, de setembro a novembro.<br>• A baixa de 15/10 e "12/11 · Baixa desfeita · Parcela 6/6 · por Marina Ribeiro · R$ 1.000,00", com "não tira de 15/10".<br>• O número continua R$ 1.000,00, com "R$ 1.000,00 de baixas desfeitas no período". |
| 11 | `rb-clientes` | Marina | Por cliente, com a coluna "Baixado sem receber" e a lista ordenada por ela (opção nova em "Ordenar por", com `aria-sort` na coluna).<br>• Rita (R$ 4.800,00) e Noemi (R$ 1.000,00) aparecem no alto.<br>• O total R$ 5.800,00 tem "não soma" no pé.<br>• No celular, o campo entra no cartão. |
| 12 | `rb-como` | Marina | "Como contamos" aberto, com a regra nova, palavra por palavra, entre Falta receber e Rendeu. |

## Decisões de design

1. **O aviso é um aviso de atenção dentro do quadro "Divisão", e não dentro da célula** (nota 1 da revisão). Ele usa fundo âmbar suave, filete âmbar e texto em tinta. A janela já é de dinheiro de terceiros, então o âmbar não briga com a regra do FI-06. Na célula fica só a linha curta, com ícone e texto, nunca só cor.
2. **A escolha fica logo abaixo da tabela, porque ela muda a tabela.** O botão "Acrescentar…" e a linha "Soma da divisão" vêm depois do grupo, então quem escolhe vê a soma conferir em seguida.
3. **Os rádios são cartões, como na janela da baixa do D35.** São dois lado a lado no computador e empilhados no celular, cada um com mais de 44 px e com a ajuda dentro. O marcado ganha a borda vinho dupla.
4. **"Por que desfazer" e a nota do "Manter" abrem dentro do grupo, logo abaixo das opções.** O que a escolha pede aparece junto dela.
5. **Na linha dos honorários, o texto novo diz "Paga a parcela do êxito"**, nunca "dá baixa" (nota 15). O ícone muda de alerta para o check de hoje.
6. **O conflito não fecha a janela.** O aviso vem no topo, em `role="alert"`, e "Ver a divisão refeita" fica no pé, no lugar de "Registrar", com o foco, como no `bx-conflito` aprovado. A divisão de antes sai da janela, para não dizer "com baixa sem receber" logo abaixo de "Bianca desfez a baixa"; o que entrou, o caso, o valor e o dia continuam (A3, ui). Revisão do desenho, nota 2.
7. **No celular, o pé da janela empilha "Cancelar" e "Registrar" na largura toda**, como na janela aprovada da baixa.
8. **Relatórios: a folha nova usa a mesma `dl` da conta do Rendeu.** O número principal fica em vinho, e as três linhas ficam ao lado, sem total, cada uma dizendo se soma ou não. "não soma" e "desfeita em" aparecem sempre como texto.
9. **Por cliente:** a coluna nova fica entre "Falta receber" e "Despesas não reembolsadas", para ler "o que falta, o que teve baixa". Os títulos das colunas dessa tabela passam a quebrar em duas linhas, porque com 7 colunas "Despesas não reembolsadas" encavalava a 1440.
10. **Um cliente:** "Baixado sem receber" é o quinto número, na largura toda, como o "Baixado sem receber" da ficha do contrato no D35. A lista é uma `ul`: cada item tem dia, o quê, motivo, quem, valor e o selo "desfeita em", e se lê como uma frase.

## Acessibilidade (WCAG 2.2 AA)

- O axe deu **0 violações** nos 24 casos (12 estados × 2 tamanhos). **Nenhum caso tem rolagem lateral a 390 px**, e nenhum tem erro de script.
- O único "alvo pequeno" listado é a marca "T3jus" da moldura aprovada (204×24), que atende o mínimo de 24 px.
- O `fieldset.rp-div` aponta, com `aria-describedby`, para o texto do aviso (`#eb-aviso`: título, detalhe, explicação e orientação), e não para o grupo inteiro. No código, esse id se soma ao do erro (`rp-div-er`), sem tirar o lugar dele.
- O aviso é uma `section` com `h3`. O grupo é um `fieldset` com `legend`. Quando há erro, o grupo leva `aria-describedby` para a mensagem e cada rádio leva `aria-invalid`.
- O resumo de erros e o conflito usam `role="alert"`. A nota do "Manter" e a soma usam `role="status"`.
- O "Registrar" segue o padrão aprovado, com `aria-disabled` e `aria-busy`, nunca `disabled` (decisão 8). Não há estado de enviando desenhado: é o mesmo da baixa aprovada ("Registrando…").
- O "R$" nunca se separa do número (espaço não separável), também no detalhe do aviso.

## O que ficou só nas notas

- **Paga em parte:** o detalhe do aviso ganha a linha "Recebido R$ 1.000,00 de R$ 4.800,00. A baixa sem receber foi dos R$ 3.800,00 que faltavam.", abaixo da primeira linha, e a célula diz "Paga a parcela do êxito (falta R$ 3.800,00)".
- **Custas junto, no estado 1:** o detalhe ganha "As custas de R$ 412,30 tiveram baixa junto. Ao desfazer, elas entram na divisão como reembolso."
- **Renegociada (A1b, opção recomendada):** só a opção "Desfazer a baixa antes de dividir" aparece, sem o grupo de duas opções. O aviso acrescenta "Se o combinado já virou parcelas novas em Contratos, tire essas parcelas mudando as condições do contrato, ou o valor vai ser cobrado duas vezes.", com o link "Mudar as condições do contrato" para quem tem Contratos. O contrato encerrado depois da renegociada mostra o mesmo aviso.
- **O erro do campo** com "Desfazer" marcado e a explicação vazia: "Escreva por que desfazer, com pelo menos 3 letras.", preso ao campo, que recebe o foco.
- **O conflito com uma baixa nova:** "Bianca Torres deu baixa sem receber no êxito de Rita às 10h13. Nada foi registrado. Veja a divisão refeita antes de registrar.", no mesmo lugar e com o mesmo botão.
- **A confirmação depois do desfazer** é o aviso de hoje, com o texto "Alvará registrado. R$ 16.000,00 de terceiros. R$ 10.787,70 para Rita, até 24/11. A baixa sem receber do êxito foi desfeita, e os honorários pagam a parcela." O plano escreve R$ 11.200,00, que é o valor sem as custas; com o "sim" da A2, Rita fica com R$ 10.787,70. O prazo é 24/11 porque 20/11 é feriado nacional (0552).
- **Relatórios:**
  - o esqueleto de carregando ganha uma folha a mais na coluna lateral, com o título "Baixado sem receber";
  - para o cliente excluído, a explicação não aparece: o item da lista fica sem a linha entre aspas;
  - a planilha exportada ganha as linhas da aba "Números", a coluna em "Por cliente" e a aba nova "Baixas sem receber", sem a explicação;
  - num período sem baixa, Um cliente não mostra o quinto número.
- **As faixas da tabela `relatorio-clientes`** (`data-sai3`, `data-sai2` e `data-cartoes`) precisam ser medidas de novo no código, com a coluna nova (nota 6). O desenho mostra só a largura de 1440 e o cartão.

## Onde o desenho saiu do plano

1. **Custas na lista de Um cliente.** O plano pede dois itens no `rb-cliente`. Mantive os dois e acrescentei, abaixo da lista, uma linha sobre as custas de Noemi: "tiveram baixa junto em 15/10 e voltaram a ser cobradas em 12/11. Não somam: são despesa do escritório.". Sem ela, as custas que a visão geral mostra sumiriam no relatório do cliente. A Carol decide se fica.
2. **No `eb-conflito`, a divisão de antes sai da janela** (revisão do desenho, nota 2). O plano diz que "Ver a divisão refeita" mantém o resto do que foi preenchido; a divisão volta refeita, com o êxito como está agora.
3. **No `rb-visao-nenhuma`, a visão de junho a agosto foi simplificada.** Os três números saíram dos dados aprovados do período anterior, e março a maio (R$ 118.400,00) é inventado. Entrou mês a mês mostra só junho a agosto. Maiores clientes, Por área e Terceiros não foram redesenhados para esse período.
4. **A data da baixa de Noemi** segue o plano (vencida em 10/10, baixa em 15/10), e não o D35.
5. **"Bianca Torres desfez…"**: o plano escreve tudo como uma frase só. Aqui, a primeira frase virou o título do aviso, e o resto virou o texto.
