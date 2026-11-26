# Revisão do plano F3.174 e F3.173 · êxito baixado na divisão do alvará e "Baixado sem receber" nos Relatórios

**Quem revisou e como.** Revisão independente, feita em 25/11/2026 sobre o `main` em `a9136be`. Conferi as afirmações do `plano.md` contra o código: `CLAUDE.md`, `sistema/README.md`, `IDEIAS.md`, o `PLANO.md` aprovado da baixa sem receber, as migrations 0280, 0410, 0511, 0554, 0555, 0640, 0650, 0651, 0690, 1010 e 1092, a api-portal (`app.ts`, `baixa_parcela.ts`, `_shared/banco.ts`, `_shared/validar.ts`), o domain (`financeiro.ts`) e o ui (`FinanceiroRepasses.tsx`, `BaixaParcela.tsx`, `Financeiro.tsx`, `Relatorios.tsx`, `ACaminho.tsx`, `prioridades.json`). Não programei nada e não fiz commit.

**Resumo.** O plano é sólido no essencial. O diagnóstico da A1 está certo: a parcela baixada some de `exito_parcelas_abertas` (`0651:30`) e os honorários vão ao caixa sem rastro. A recusa no servidor com trava antes da leitura fecha a corrida, e a regra de data da Parte B concorda com `parcela_baixada_no_dia`. Não achei nota grave. Achei **8 médias** e **12 leves**. As médias mais importantes são estas: o aviso com botões iria para dentro de uma célula de tabela, ao contrário do que o próprio plano diz; a recomendação da pergunta A2 deixa o caso travado de novo; um estado da Parte B tem uma data no futuro; e o escopo pode ficar menor, com o desfazer e o registrar numa transação só.

---

## Notas médias

### 1. O aviso com dois botões de 44 px ficaria dentro de uma célula da tabela (média)
- **Evidência.** O plano põe o aviso "sob a linha de honorários, no lugar do `rp-baixa` (`:521-524`)" (A3, ui) e, na mesma seção, diz que "os botões novos ficam fora de tabela, no aviso". Só que o `rp-baixa` fica dentro de um `<td>` da tabela da divisão (`FinanceiroRepasses.tsx:510-525`: `<tbody>` → `<tr>` → `<td>` → `div.fi-quem` → `small.rp-baixa`). Um `h3` com parágrafo e dois botões dentro de uma célula de 48% de largura quebra a leitura por linha e coluna do leitor de tela e as faixas do celular. Também deixa de valer o "O `portal-tabelas-toque.spec.ts` não muda".
- **Correção.** Na célula de honorários, deixe só uma linha curta ("Êxito com baixa sem receber · veja abaixo"). O aviso inteiro (`h3`, detalhe e botões) vai depois da tabela, dentro do `fieldset.rp-div` (`:502`), ligado por `aria-describedby`. Hoje o `fieldset` já monta o `aria-describedby` com `descritoPor(tem("divisao") && "rp-div-er")`, então some o id do aviso ao do erro, sem trocar um pelo outro. Corrija A3 e A4 e diga à especialista de frontend onde o aviso fica.

### 2. A pergunta A2 (custas baixadas junto): a recomendação "não" trava o caso de novo (média)
- **Evidência.** As custas que tiveram baixa junto são sempre `PROXIMA_PARCELA` (`1010:206`). O desfazer as faz voltar (`1010:453-457`). `reembolso_proxima_parcela` escolhe a primeira parcela não paga que vence a partir da data da despesa (`0640:366-380`), e no caso típico essa é a própria parcela do êxito. Quando a divisão paga essa parcela pelo `TERCEIROS`, a despesa passa para a parcela seguinte. Num caso perdido ou encerrado, em geral não há parcela seguinte, e a despesa fica "a reembolsar" sem parcela. Foi esse o motivo da FI-25: deixar o caso fechar no financeiro (`IDEIAS.md:81`). Com o "não", desfazer para receber o êxito do alvará traz de volta exatamente a pendência que a FI-25 resolveu. E o dinheiro para reembolsar está ali, no alvará.
- **Correção.** Escreva na pergunta A2 essa consequência ("o caso volta a ter pendência de custas sem parcela; o 'pronto para encerrar' só volta quando alguém reembolsar à mão"). Reavalie a recomendação: o "sim" (as custas entram como "Reembolso" na proposta só quando a parcela de destino é a do êxito que a divisão paga) tende a ser o melhor para o escritório. Se o "não" continuar, acrescente um estado nas notas do desenho com o caso travado e um teste no pgTAP (o `caso_acerto` depois de desfazer e registrar).

### 3. O caminho da renegociada entrega tudo ao cliente e deixa a dívida nas parcelas novas (média)
- **Evidência.** Na renegociada, o segundo botão vira "Tirar os honorários da divisão", e a ajuda diz que "o valor vai entrar pelas parcelas novas" (A2.4, item 14; A5). A 0651 só paga parcelas com `exito_id` (`0651:27`), e as parcelas novas de Contratos não têm `exito_id` (`0640:55-56`, `origem = 'ENCERRAMENTO'`). Então, com esse botão, o escritório repassa R$ 16.000,00 a Rita e depois cobra dela em parcelas um dinheiro que estava na mão dele. O outro caminho ("desfaça, divida e depois mude as condições") pede três passos em duas áreas e, se a pessoa esquecer o último, cobra em dobro (`BaixaParcela.tsx:289-291`).
- **Correção.** Ponha isso na pergunta A1 como subitem, porque é a Carol quem decide o que é certo para o escritório. Uma opção: na renegociada, a recomendação principal é "Desfazer a baixa antes de dividir", e a nota do estado 4 leva o lembrete de mudar as condições em Contratos, com link. Outra: deixar os honorários irem ao caixa e o aviso dizer que as parcelas novas precisam sair. O plano não deve escolher sozinho.

### 4. O escopo pode ficar menor: o desfazer e o registrar podem ser uma transação só (média)
- **Evidência.** O plano faz o desfazer numa janela e numa transação separadas (A2.3). Isso puxa o rascunho para `RepassesConteudo`, cria o componente `JanelaDesfazerDaDivisao`, a falha do estado 7, a volta do estado 8, o foco feito à mão com `data-foco` e os riscos 3 e 5 (rascunho perdido ao recarregar, anotação "Falar com Rita amanhã" numa parcela já paga, `1010:465-467`). O sino também liga e desliga de novo (A2.4, item 21). Entre o desfazer e o registrar, a parcela volta a "Em atraso" e entra na régua.
- **Correção.** Pese a alternativa de o registrar aceitar `desfazerBaixa: { baixaId, explicacao }`. Na mesma transação, depois da trava (passo 1), ele grava a linha `DESFEITA`, limpa `baixa_id` e `cancelado_em` e paga pela 0651, sem anotação de cobrança. O texto do histórico do desfazer diz "desfeita para dividir o alvará de dd/mm". Com isso, os estados 6, 7 e 8 viram uma caixa "Por que desfazer" dentro do próprio registrar, e os riscos 3 e 5 e o teste 13 do sino deixam de existir. Se o plano mantiver as duas janelas, diga na A2.3 por que escolheu assim (por exemplo, reaproveitar a janela aprovada `bx-desfazer`).

### 5. Estado `rb-mes-passado` com uma data no futuro (média)
- **Evidência.** O "hoje" da Parte B é 18/11/2026 (B4). O estado 3 mostra "desfeita em 02/12", e a B2.1 usa o mesmo exemplo. Do jeito que está, a especialista desenharia um estado impossível. O e2e com a API simulada passaria assim mesmo, mas a tela aprovada ficaria errada.
- **Correção.** Nos estados, use uma baixa de 15/10 desfeita em 12/11 e o relatório de outubro (o período 01/10 a 31/10 continua mostrando R$ 1.000,00). Deixe o 02/12 só no teste pgTAP 1, que adianta o relógio.

### 6. A coluna nova em Por cliente muda as faixas da tabela, não só o `prioridades.json` (média)
- **Evidência.** A tabela `relatorio-clientes` tem as faixas medidas `data-sai3="880" data-sai2="760" data-cartoes="640"` (`Relatorios.tsx:732`). O `portal-tabelas.spec.ts` confere as faixas em N e N − 1, com dados longos, e se alguma tabela passa da folha (`README.md:215`). Mais uma coluna de valor muda a largura mínima. O plano (B3, ui) cita só `prioridades.json` e `portal-tabelas-telas.json`. Se a lista "Baixas sem receber no período" de Um cliente for uma `<table>`, ela é tabela nova e segue o passo a passo do README (passo 1 em diante, com `data-prio-tabela`, `data-r` e a entrada no toque).
- **Correção.** Em B3, acrescente: medir de novo as faixas de `relatorio-clientes` (e, se for o caso, o `portal-tabelas-alturas.json`); dizer se a lista de Um cliente é `dl`/`ul` ou tabela e, se for tabela, seguir "Tabela nova no Portal". Confira também se "Baixado sem receber" com prioridade 3 sai junto com "Despesas não reembolsadas" (`prioridades.json:23`), e diga a ordem.

### 7. A pergunta B1 (Rendeu) não é do F3.173, e a 1102 precisa mudar o tipo de retorno (média)
- **Evidência.** A pergunta faz sentido: o "Como contamos" diz que Rendeu desconta as despesas "que ainda não voltaram" (`Relatorios.tsx:144`), e a troca de `1010:907-910` tirou a custa perdoada desse desconto. Mas isso é o Rendeu (FI-07, IN-15), e não IN-04 nem IN-07. A troca também foi aprovada no `PLANO.md` da baixa (seção 3, item 13, `relatorio_adiantadas`). Além disso, a 1102 quer "a marca `baixada`" na lista do Rendeu. `relatorio_adiantadas` é `returns table (...)` (`0410:197-208`), e uma coluna nova pede `drop function` e `create` de novo, porque `create or replace` não muda o retorno. Ela é lida por `relatorio_por_cliente` (`0410:381`), pelo resumo e por quem mais a chamar.
- **Correção.** Tire a B1 do PR 2: um item pendente próprio, que cita FI-07, FI-25 e IN-15, com a pergunta à Carol e a 1102. Se ficar no PR 2, descreva o `drop` e o `create` com a lista de quem lê `relatorio_adiantadas` (com `grep` nas migrations) e um teste de que o Rendeu de um mês fechado não muda quando a custa é perdoada depois (a mesma regra da nota 11).

### 8. O escopo da Parte A passa do que a decisão 38 pediu (média)
- **Evidência.** A decisão 38 (e o item F3.174 no painel) pede que a proposta mostre o êxito baixado, com "Desfazer a baixa antes de dividir" (`PLANO.md` aprovado, decisão 38; `F3.174.json`). O plano acrescenta: recusa no servidor, "Manter a baixa", evento novo no histórico, conflito, linha no "A caminho", `podeDesfazerBaixa`/`quemDesfaz` e 13 estados. A recusa e o "Manter" se justificam (é o que torna a escolha rastreável). Três peças não se justificam agora:
  - `podeDesfazerBaixa` e `quemDesfaz`, para um caso que "hoje não existe" (A2.1, item 3; A4, "Ficam só nas notas"). O registrar pede `financeiro.editar` (`0280:346`), o mesmo do desfazer (`1010:247`), e o modo só para consulta derruba os dois (o gatilho de `0690:408-415` e `portal_exigir_escrita`);
  - o estado 13 do "A caminho": a decisão acontece no "Entrou na conta", que já recusa;
  - o estado 2 (paga em parte) e o 3 (custas) como estados próprios: podem ser variações nas notas do estado 1.
- **Correção.** Tire `podeDesfazerBaixa`, `quemDesfaz` e o estado 13 (ou deixe o 13 só nas notas). Ponha os estados 2 e 3 como variações. Isso diminui o desenho, os testes (pgTAP 2 e 11) e a troca na `portal_financeiro_repasse_proposta` (seção 3 da 1100, que some).

---

## Notas leves

### 9. Referências de linha erradas na 1010 (leve)
- **Evidência.** No desfazer, as linhas estão de 3 a 5 a mais que o plano diz: a importação desfeita é `1010:440-444` (o plano diz `437-441`); o `ENCERRADO` é `:445-447` (diz `442-444`); as custas que voltam são `:453-457` (diz `448-452`); a anotação de cobrança é `:461-467` (diz `457-464`); a trava é `:432` (diz `:431`). A B1 diz `1010:43-71` para a tabela, mas a tabela vai até a linha 63 e o inventário começa na 71.
- **Correção.** Corrija as referências antes da revisão da Carol, porque o PR vai copiar o texto.

### 10. "A 1010 já troca trechos nos três níveis" não é exato (leve)
- **Evidência.** A A1.4 cita `1010:921-923` como um dos três níveis do registrar, mas essa troca é em `repasse_proposta_sem_exito`, não no registrar. A 1010 troca só dois níveis: o corpo (`financeiro_levantamento_registrar_base`, `:924-926`) e o embrulho da 0651 (`:942-951`). O embrulho do meio (0554) não foi tocado.
- **Correção.** Diga "dois dos três níveis, e a proposta".

### 11. Os dados que já existem: honorários no caixa com o êxito baixado desde 24/11 (leve)
- **Evidência.** A 1010 está em produção desde 24/11/2026, às 19h55 (`P16.json`, evidência). Desde então, o "terceiro estado" (honorários registrados com o êxito baixado) pode já existir. A 1100 só impede casos novos.
- **Correção.** Na verificação antes de aplicar (A8.1), acrescente uma consulta: os levantamentos com `destinacoes.para = 'HONORARIOS'` de um caso e cliente cuja parcela de êxito tinha `baixa_id` no momento do registro. Se a consulta achar algum, avise a Carol. Não mude nada sozinho.

### 12. O `exitoBaixadoVisto` precisa ir sempre, também vazio (leve)
- **Evidência.** O passo 3 só roda "com `p_dados ? 'exitoBaixadoVisto'`" (A2.2, item 6). O e2e só confere o campo no "Manter" (A6). Se a tela mandar o campo só quando há êxito baixado, a corrida "baixa feita depois da proposta" chega como `EXITO_BAIXADO` (texto de reserva), e não como `EXITO_MUDOU` (com quem e quando).
- **Correção.** Escreva que o cliente novo manda sempre o campo, com `[]` quando não viu baixa, e acrescente isso ao e2e e ao Deno.

### 13. O botão "Registrar": mudar o `disabled` sempre, não só "para esse caso" (leve)
- **Evidência.** A2.3, item 12: "Para esse caso, o botão 'Registrar' deixa de usar `disabled`". Hoje ele tem `disabled={enviando}` (`FinanceiroRepasses.tsx:445`). Mudar só num caso deixa dois comportamentos no mesmo botão.
- **Correção.** Troque de uma vez por `aria-disabled` e `aria-busy`, como em `BaixaParcela.tsx:127` (o plano cita `:124`, mas o botão está na linha 127), com a guarda `saindo` contra o segundo envio.

### 14. `JanelaDesfazerBaixa` também pede `eu` (leve)
- **Evidência.** A assinatura é `{ p, f, eu, aoFechar, aoFeito }` (`BaixaParcela.tsx:220-222`), e o `eu` decide o "Você fica com a próxima ação" (`:257`, `:275`). A A2.3, item 8 cita só `p` e `f`.
- **Correção.** Diga de onde vem o `eu` em Repasses (em `Financeiro.tsx:1300` ele vem de `escritorio.pessoa`). Sugestão: a caixa "Por que desfazer" pode vir preenchida com "Alvará de R$ 16.000,00 entrou em 18/11", editável, porque o desfazer recusa explicação com menos de 3 letras (`1010:448`).

### 15. Texto: "os honorários dão baixa na parcela" ao lado de "baixa sem receber" (leve)
- **Evidência.** Estado 8 e A5 ("os honorários dão baixa na parcela do êxito de Rita") e estado 11 ("foi baixada pela divisão"). Está certo pela FI-02 (baixa sozinha quer dizer recebido), mas na mesma janela em que se fala de "baixa sem receber" as duas expressões se confundem.
- **Correção.** Nos textos novos, use "os honorários pagam a parcela do êxito de Rita". Deixe o texto de hoje do estado 11 como está, ou peça à Carol para trocar.

### 16. Sucumbência e linha manual de honorários (leve)
- **Evidência.** O passo 4 recusa qualquer parte `HONORARIOS` maior que zero. Na tela, a linha `HONORARIOS` só vem da proposta, com o valor editável, e as manuais são `PARCEIRO`, `PERITO` e `OUTRO` (`financeiro.ts:559`). Quem quiser pôr a sucumbência na linha de honorários, aumentando o valor, vai ser recusado. O servidor aceita qualquer `para` (`0280:375-378`).
- **Correção.** Diga nas notas que a sucumbência não entra na linha de honorários. Teste no pgTAP 3 que um `HONORARIOS` mandado à mão, que não veio da proposta, também é recusado.

### 17. Contrato encerrado e renegociada (leve)
- **Evidência.** A2.4, item 15: "a renegociada nunca existe nele". A baixa renegociada só nasce em `ATIVO` (`1010:368-371`), mas o contrato pode ser encerrado depois, com a baixa renegociada em vigor.
- **Correção.** Troque por "a renegociada só nasce com o contrato ativo; se ele foi encerrado depois, o aviso é o mesmo do estado 4". Ponha no pgTAP 9.

### 18. LGPD: a explicação da baixa é texto livre e não sai na exclusão (leve)
- **Evidência.** `parcela_baixas.explicacao` é texto livre ("Rita disse que o banco não pagou…") e está no inventário com "Exportadas ao escritório e apagadas com ele" (`1010:71-78`). A limpeza do cliente excluído troca a descrição das despesas e o nome dos arquivos (`1092:440-458`), mas não toca `parcela_baixas`. O F3.173 passa a mostrar essa explicação na folha de Um cliente.
- **Correção.** Na Parte B, não mostre a explicação de um cliente com `estado = 'EXCLUIDO'`. Abra um item pendente (PT-11) para a explicação da baixa na exclusão. O histórico novo `financeiro.levantamento_exito_mantido` está certo em não levar a explicação; deixe isso escrito.

### 19. Exportação ao contador (leve)
- **Evidência.** O plano não fala da exportação do contador. A baixa não é recebimento e não entra em `caixa_entradas` (`0650:14-23`), então não muda nada, mas o leitor fica sem saber se isso foi pensado.
- **Correção.** Uma linha na B2.8: "A exportação do contador não muda: a baixa não é entrada de caixa".

### 20. As linhas "desfeitas" da Parte B: custas e renegociada (leve)
- **Evidência.** O desfazer grava uma linha `DESFEITA` também para cada custa que foi junto (`1010:454-457`). Em B2.3, "Baixas desfeitas no período" só conta as de Perdoada e Inadimplência. Com isso, o desfazer de uma renegociada e o das custas não aparecem em lugar nenhum.
- **Correção.** Em `relatorio_baixas`, a `DESFEITA` herda `custas` e `motivo` da linha que ela desfaz (pelo `desfaz_id`). Em `relatorio_baixado_json`, cada grupo ("renegociado", "custas") ganha também o seu `desfeitas`, ou a folha diz que eles não aparecem. Acrescente o teste.

### 21. Caminhos dos testes (leve)
- **Evidência.** O script de concorrência está em `sistema/supabase/tests/concorrencia/`, ao lado de `levantamento-pela-api.sh`, e não em `tests/concorrencia/`, que lido a partir de `sistema/` seria outra pasta (A6). O e2e está certo em `sistema/tests/e2e/`.
- **Correção.** Escreva os caminhos completos.

### 22. Faltam testes de alguns caminhos (leve)
- **Evidência e correção.** Acrescente ao pgTAP 144 ou ao script:
  - "Entrou na conta" com `requisicaoId` e "Manter": a requisição passa a `ENTROU` (`0554:193-200`), e o histórico grava o `exito_mantido`;
  - o cliente antigo, sem `exitoBaixadoVisto` e sem honorários: passa e grava o histórico (passo 5);
  - a dispensa da parte do cliente ou de outra parte depois do "Manter" continua funcionando, e a parte de honorários que pagou o êxito continua sem poder ser dispensada (`BAIXOU_EXITO`, `0651:92-94`);
  - no script de concorrência, os dois lados (baixa primeiro e registrar primeiro) com o commit de verdade como `service_role`, porque o gatilho adiado da divisão e o `caso_pronto_fim` rodam no commit (`1080`, README F3.147).

---

## O que conferi e está certo

- `exito_parcelas_abertas` filtra `cancelado_em is null` (`0651:30`); a baixa é cancelamento com `baixa_id` (`1010:80-81`, `:391-392`).
- A cadeia do registrar: 0280 → `_base` (0554:174) → `_sem_exito` (0651:47) → o embrulho da 0651. A chamada no `declare` (`0651:54`) faz a recusa desfazer o levantamento.
- `lerCorpo` com zod tira as chaves desconhecidas (`_shared/validar.ts:7-13`); sem o campo no schema, `exitoBaixadoVisto` não chega ao banco.
- O TC409 com detalhe vira `VERSION_CONFLICT` com `detalhes` (`_shared/banco.ts:43-53`).
- A ordem das travas não cria impasse: a baixa trava o contrato (`for share`) e depois a parcela (`1010:342-344`); o desfazer trava a parcela (`1010:432`); o registrar travaria só a parcela.
- `requisicao_parte` e `seguiuProposta` só leem `linhas` (`0554:77-82`, `0280:393-395`).
- Nenhuma tabela nova, nenhum gatilho novo: `escritorio_id` e `proteger_tabela_escritorio` não se aplicam; o índice novo em `parcela_baixas` está certo. O escritório vem de `quem(c)`. A faixa 1100-1109 está livre (a última é a 1093; não há outro branch).
- `parcela_baixada_no_dia` usa o dia de Brasília (`1010:113-121`), e a regra da B2.1 concorda com ela.
- `IDEIAS.md` tem 141 ideias, e FI-05, FI-24, FI-25, IN-04 e IN-07 existem. D37 e D38 com `ordem` 87 e 88 estão livres (o maior é 86). O pgTAP 144 é o próximo livre.
- As perguntas A1 e B1 são de fato decisões da Carol (A1 muda o que o escritório pode fazer com o dinheiro; B1 muda um número que ela já vê). A A2 também é, mas precisa da consequência da nota 2.
