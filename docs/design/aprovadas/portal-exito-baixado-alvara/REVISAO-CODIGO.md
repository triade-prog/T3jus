# Revisão do código da F3.174 (D38, plano seção A)

Revisão crítica, feita numa passada separada da programação, do commit `93f0ee6` contra o `PLANO.md` (seção A e a tabela "Revisão aplicada"), as `NOTAS.md` e o `index.html` desta pasta. Não houve outro agente disponível para a revisão. Por isso ela foi feita em separado, relendo o diff inteiro depois de os testes passarem.

## O que confere com o plano

| Ponto do plano | Onde está | Situação |
|---|---|---|
| A2.1, 1 e 2: `exito_parcelas_baixadas` com o recorte da 0651, sem a importação desfeita, com a baixa inteira, e `exitoBaixado` na proposta | `1100`, seções 1 e 2 | Confere. pgTAP 146, testes 1 e 8 |
| A2.2, 6: o embrulho da 0651 achado pelo conteúdo, `v jsonb;` no `declare`, a trava em ordem de `id` antes de ler as baixas, a corrida pelo conjunto de `baixa.id` e o cliente antigo pulado | `1100`, seção 3 | Confere. O `t1100_achar` exige uma função só, e o `t1100_trocar` exige a contagem exata |
| O desfazer pelo `portal_financeiro_parcela_baixa_desfazer`, antes do corpo, com o `baixaId` em vigor (senão `EXITO_MUDOU`) | `1100`, seção 3 | Confere. As custas baixadas junto voltam antes do corpo conferir o reembolso (A2 = sim): pgTAP 146, teste 11 |
| A rede `EXITO_BAIXADO`, também para a parte de honorários mandada à mão; a renegociada só desfaz (A1, b) | `1100`, passo 4 | Confere. A renegociada é recusada no servidor mesmo sem honorários |
| O rastro `levantamento_exito_mantido` sem a explicação, e o nome resolvido só na leitura | `1100`, passo 5 e seção 4 | Confere. O histórico guarda o id de quem deu a baixa, e a ficha mostra o nome |
| A2.2, 7: o schema com `exitoBaixadoVisto` (até 5 uuid) e `desfazerBaixa` | `domain/src/financeiro.ts` | Confere. Vitest e Deno |
| A2.2, 8: "Registrar" com `aria-disabled` e `aria-busy` e a guarda do segundo envio, sempre | `FinanceiroRepasses.tsx` | Confere |
| A3, ui: a linha curta na célula, o aviso e o grupo abaixo da tabela, dentro do `fieldset.rp-div`, e o `aria-describedby` somado ao do erro | `FinanceiroRepasses.tsx` | Confere. O e2e confere o atributo |
| Nota 12: `exitoBaixadoVisto` vai sempre, com `[]` sem baixa | `FinanceiroRepasses.tsx`, e2e e Deno | Confere |
| A4: os estados `eb-proposta`, `eb-desfazer-escolhido`, `eb-mantida`, `eb-erro`, `eb-conflito` e `eb-historico`, no celular e no computador, com axe e sem rolagem lateral | e2e `portal-financeiro-repasses.spec.ts` | Confere |
| A5: os textos dos estados, a confirmação depois do desfazer e os textos de reserva | `baixa.ts`, `textos.ts` | Confere |
| A6: concorrência com commit de verdade como `service_role`, nos dois lados | `tests/concorrencia/exito-baixado-divisao.sh` | Confere, no `test:db` |

## Achados e o que foi feito

1. **"Ver a divisão refeita" reenviava o registrar (corrigido no `93f0ee6`, antes do commit).** O botão do conflito e o "Registrar" ocupavam o mesmo lugar no rodapé, e o React reaproveitava o mesmo `<button>`. O clique limpava o conflito, o botão voltava a ser `type="submit"` ainda dentro do clique, e o navegador enviava o formulário de novo. Resultado: um segundo `POST` e o mesmo conflito outra vez. Agora cada botão tem a sua `key`, e o e2e confere que só houve um `POST`.
2. **O texto de erro dentro do aviso âmbar não tinha contraste (corrigido no `93f0ee6`).** O axe mediu 3,85:1 no vinho claro sobre o âmbar. Agora `.eb-ops .erro-msg` usa a cor do texto, que tem contraste nos dois temas. O ícone de alerta continua marcando o erro.
3. **Um `role="status"` novo quebrava um e2e antigo (corrigido no `93f0ee6`).** O aviso "Registrando." para o leitor de tela virou `aria-live="polite"`, sem papel de status.
4. **Registrar com a divisão ainda sendo calculada (corrigido neste commit).** Com a proposta a caminho, a tela mandava `exitoBaixadoVisto: []` sem saber do êxito. O servidor recusava (o caminho é seguro), mas o conflito dizia que alguém tinha dado a baixa "em 05/11", o que confunde. Antes do F3.174 esse envio já mandava a divisão só com o cliente. Agora o "Registrar" espera a proposta, enquanto a tela mostra "Calculando a divisão pelo contrato…".

## Diferenças do plano que ficam (para a Carol saber)

- **O desfazer tem um evento próprio no histórico.** O plano diz que "o histórico do levantamento leva `baixaDesfeita`". O código grava `financeiro.levantamento_exito_desfeito`, com a baixa, a parcela, o motivo, o valor e quantas custas voltaram, em vez de mexer no evento `financeiro.levantamento` da 0280. Assim, a função de outra frente não muda. O registrar também devolve `baixaDesfeita: true` para o aviso.
- **Isolamento (teste 13).** O escritório B não recebe um 404. Ele recebe a recusa que já existe para um caso que não é dele (`campos: casoId`), ou `TC401` sem contexto. Em nenhum dos dois casos ele vê o `exitoBaixado` do A.
- **A renegociada.** O aviso e o erro do grupo de uma opção só ("Desfazer a baixa antes de dividir") usam o tom dos textos aprovados, mas a frase exata não estava nos estados (era uma variação depois da resposta da A1).
- **`seguiuProposta`** fica `false` quando a pessoa escolhe "Manter" ou quando as custas entram, porque a divisão deixa de ser a proposta.
- **De fora:** a linha do fechamento "mantida ao registrar o alvará", que aparece no `eb-historico` do desenho, não entrou. A F3.173 (seção B) é outra entrega. Os itens F3.191 a F3.193 já estão no painel como pendentes.

## Testes depois da revisão

- `test:db`: 130 arquivos, 4.122 testes, com o pgTAP 146 (51) e o script de concorrência.
- Vitest: 65 arquivos, 782 testes. Deno (`api-portal`): 339 testes.
- e2e: `portal-financeiro-repasses.spec.ts` (46) e `portal-baixa-parcela.spec.ts` (14), no celular e no computador.
- Lint sem erro, com 4 avisos (2 novos: `aria-invalid` no rádio, como no desenho e no grupo de motivos aprovado). No typecheck, o `@t3jus/ui` falha em `css.test.ts` e `agenda.test.ts`. Os dois arquivos vieram da main, e esta entrega não mexe neles. Os pacotes tocados (domain, servidor e o build do Portal) passam.
