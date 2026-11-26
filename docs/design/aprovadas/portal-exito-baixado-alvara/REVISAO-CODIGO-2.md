# Segunda revisão do código da F3.174 (revisor independente)

Revisão de `git diff origin/main...claude/project-thread-uovozs` (commits `93f0ee6` e `55936a0`, sobre o `main` em `b76d1f5`). A revisão comparou o diff com o `PLANO.md` (seção A e a tabela "Revisão aplicada"), as `NOTAS.md` e o gerador do desenho (`_fonte/exito_baixado.py`). A `REVISAO-CODIGO.md` do autor foi lida só no fim.

## O que rodei

- **Banco.** Subi um Postgres 16 com pgTAP, apliquei todas as migrations em ordem e rodei `146_exito_baixado_divisao_test.sql` (51 de 51 passam) e `tests/concorrencia/exito-baixado-divisao.sh` (ok nos dois lados da corrida).
- **Cenários extras.** Fiz três cenários fora do pgTAP, sobre o mesmo cenário de dados e com `rollback`: os números E1 a E3 estão nas notas.
- **Função final.** Li a definição final do embrulho (`pg_get_functiondef` de `portal_financeiro_levantamento_registrar`) e as permissões (`proacl`) das funções novas.
- **Vitest.** Rodei `baixa.test.ts` e `financeiro.test.ts`: 30 de 30 passam.
- **Typecheck.** Rodei o typecheck do `@t3jus/ui` neste branch e numa cópia limpa do `origin/main` (`b76d1f5`). **Confirmado:** a `main` sem este diff falha com os mesmos 5 erros, em `css.test.ts` (4) e `agenda.test.ts:79` (1). A afirmação do autor confere.
- **Não rodei** o e2e (não há navegador do Playwright aqui) nem o Deno (não há `deno`).

## O que confere (sem achado)

- **A trava vem antes da leitura.** O registrar trava as parcelas do êxito (`for update of r`, em ordem de `id`, `1100:148-150`) e só depois lê `exito_parcelas_baixadas` (`:151`). A leitura é um comando novo do plpgsql, com um snapshot novo, então vê a baixa que acabou de ser gravada. O script de concorrência confirma isso nos dois sentidos.
- **O desfazer e o registrar estão numa transação só.**
  - O desfazer existente é chamado antes do corpo (`:174`).
  - A recusa de qualquer passo desfaz tudo. O pgTAP cobre a explicação curta.
  - Dois registros ao mesmo tempo, os dois com `desfazerBaixa`: o segundo espera a trava, vê `[]` no lugar de `[b]` e recusa com `EXITO_MUDOU`. Não há pagamento duplo.
- **`exitoBaixadoVisto` e `EXITO_MUDOU`.**
  - A comparação é por conjunto (`:154-160`), e um `baixaId` velho também recusa (`:168-173`).
  - O detalhe (`exito_ultima_mudanca`) ignora as linhas das custas e filtra pelo escritório: o escritório B não descobre nada do A.
- **Custas baixadas junto (A2).** O desfazer roda antes de o corpo conferir `conta_reembolso_baixado` (o corpo, na linha 41 da definição final). Por isso a linha "Reembolso" passa. No "Manter", a tela tira as linhas `eb-c-*`.
- **Renegociada só se desfaz.**
  - O passo 4 recusa mesmo sem honorários (`:187-194`). O cenário E3 confirmou `EXITO_BAIXADO` com `renegociada: true`.
  - A tela mostra só o rádio "Desfazer".
- **Paga em parte.** A célula usa `baixa.valor`, que é o que faltava. O laço da 0651 paga até o que falta e manda o resto ao caixa.
- **Vários êxitos ou clientes.** `recebimentos_previstos.exito_id` é `unique` (`0640:55`), e `exitos_conferir` é único por caso e cliente (`0640:42`). Há no máximo uma parcela de êxito por caso e cliente, então o `exitoBaixado[0]` da tela não perde nada. Cada cliente do mesmo caso é travado e conferido à parte. O pgTAP faz isso com Rita, Tiago e Sebastião.
- **"Manter" no histórico.**
  - `financeiro.levantamento_exito_mantido` não leva a explicação, e o nome é resolvido só na leitura.
  - O subtítulo e a linha do histórico da ficha batem com o `eb-historico`.
- **Isolamento, `security definer` e `search_path`.**
  - O escritório vem do `p_escritorio` da sessão (o `quem(c)` da api-portal), e todas as leituras novas filtram por ele.
  - As três funções novas são `sql stable`, com `search_path = public` e sem `security definer`.
  - Depois do `call fechar_acesso()`, só `dominio` as executa (`{dominio=X/dominio}`). O embrulho continua `security definer`, executável pelo `service_role`.
- **As trocas por trecho não falham em silêncio.**
  - `t1100_trocar` para a migration se a contagem não for exata.
  - `t1100_achar` exige uma função só com o trecho, no molde da `1010:500-505`.
  - O trecho da ficha (`'por', pessoa_ref(h.autor_id), 'dados', h.dados)`) aparece uma vez só em `financeiro_repasse_base`. As cópias da 0556 e da 0940 são de outras funções.
  - Nenhuma das migrations 1110 a 1120, que já estão no `main`, mexe nessas funções. A ordem diferente entre o banco novo e produção não muda o resultado.
- **Textos.** Os textos dos 6 estados, a confirmação e os textos de reserva conferem com o gerador do desenho, palavra por palavra.

## Achados

Nenhum achado grave: não encontrei caminho que leve dinheiro para o lugar errado nem que conte o mesmo dinheiro duas vezes. Os achados 1 e 2 são de registro e de mensagem sobre dinheiro.

### 1. Média: o histórico e o aviso dizem "os honorários pagam a parcela" mesmo quando não pagam

- **Evidência.**
  - `ui/src/portal/baixa.ts:270` (`TEXTO_EXITO_DESFEITO` fixo);
  - `FinanceiroRepasses.tsx:505-507`: com `baixaDesfeita`, a tela troca a lista `exitoBaixado` (o que foi pago de fato) pelo texto fixo;
  - `FinanceiroRepasses.tsx:1062`: a ficha mostra sempre o mesmo texto para `levantamento_exito_desfeito`;
  - `1100:205-210`: o evento não grava quanto foi pago.
- **Cenário E1.** Diego escolhe "Desfazer" e tira a linha de honorários (as linhas da divisão continuam removíveis).
  - O registrar passa e devolve `{"exitoBaixado": [], "baixaDesfeita": true}`.
  - A parcela volta a `VENCIDA`, com R$ 0,00 recebido.
  - O aviso e a ficha dizem "A baixa sem receber do êxito foi desfeita, e os honorários pagam a parcela.". O registro permanente diz que a parcela foi paga, e ela voltou para a cobrança.
- **Cenário E2.** O mesmo, com os honorários reduzidos a R$ 1.000,00, numa parcela que devia R$ 3.800,00.
  - O registrar devolve `exitoBaixado: [{valor: 100000, paga: false}]`.
  - A tela diz que os honorários "pagam a parcela" e esconde o "recebeu R$ 1.000,00".
- **Correção.**
  - **No servidor:** gravar o que foi pago no `levantamento_exito_desfeito`, como `pago` e `quitada`. Para isso, gravar o evento depois do laço de pagamento (`v_baixas`), e não antes.
  - **Na tela:** montar o texto com o resultado: "…foi desfeita, e os honorários pagam a parcela." só quando `paga`; "…foi desfeita; os honorários pagaram R$ X, e falta R$ Y." quando a parcela é paga em parte; "…foi desfeita, e a parcela volta a ser cobrada." quando não houve honorários.
  - **Opcional:** com "Desfazer" marcado e sem linha de honorários, a tela avisa antes de enviar.
- **Teste:** um pgTAP com o E1 e o E2, e o vitest do texto.

### 2. Média: entregue como feita sem a linha do "Fechamento do caso" do desenho, e sem item pendente

- **Evidência.**
  - O `eb-historico` aprovado (`_fonte/exito_baixado.py:252-256` e `NOTAS.md`, estado 6) traz no Fechamento: "Êxito do contrato C-…: baixa sem receber · inadimplência, por Marina Ribeiro em 05/11 · mantida ao registrar o alvará".
  - O código não tem esse texto (nenhum resultado para `mantida ao registrar` em `packages/`).
  - A `REVISAO-CODIGO.md` reconhece a falta ("De fora").
  - Mesmo assim, `docs/painel/dados/fases/F3/F3.174.json` está `feito`, e nenhum item pendente cita a falta. Os itens F3.191 a F3.193 tratam de outra coisa.
- **Por que importa.** Isso fere a regra do `CLAUDE.md`: a entrega que atende só parte não marca a ideia como atendida sem um pendente.
- **Correção:** implementar a linha (os dados já estão no `levantamento_exito_mantido`, e a folha "Fechamento do caso" da ficha fica em `FinanceiroRepasses.tsx:1282`) ou criar o pendente (por exemplo F3.194, com `refs` FI-24 e FI-05) e citá-lo no `proximo`/`nota` da F3.174.

### 3. Baixa: a ordem da publicação na P22 abre uma janela em que o Portal de hoje para de registrar

- **Evidência:** `docs/painel/dados/publicacao/contas-e-ambiente/P22.json`, nota, passos 4 e 5 (primeiro a 1100, depois a api-portal e o Portal).
- **O que acontece entre a 1100 e o Portal novo.**
  - O Portal de hoje não mostra a escolha.
  - O alvará com honorários de um êxito baixado recusa com `EXITO_BAIXADO`, e o `textos.ts` antigo não tem esse texto: sai a mensagem genérica de conflito.
  - Com a baixa renegociada, nenhum registro daquele cliente passa.
- **A ordem inversa é segura.** Conferi que o corpo antigo aceita os campos novos sem reclamar: `financeiro_levantamento_registrar_sem_exito` com `exitoBaixadoVisto` e `desfazerBaixa: null` registra normalmente. Sem a 1100, a proposta não traz `exitoBaixado`.
- **Correção:** na P22, publicar primeiro a api-portal e o Portal e só então aplicar a 1100. A conferência do passo 2 e a consulta da nota 11 continuam antes.

### 4. Baixa: o número 1100 é menor que o das migrations que já estão em produção

- **Evidência.** O `main` já tem as migrations 1110 a 1120, e a P21 aplicou de 1116 a 1119 no Supabase. A 1100 entra depois delas em produção, mas antes delas num banco novo (`test-db.sh`).
- **Impacto.**
  - Hoje nenhuma delas mexe nas mesmas funções, como conferido acima.
  - O `supabase db push` recusa uma migration local anterior à última aplicada, a menos que use `--include-all`. O `apply_migration` do MCP não tem esse problema.
- **Correção:** renumerar para 1121 (a próxima livre) ou deixar escrito na P22 que a aplicação é pelo `apply_migration`.

### 5. Baixa: "Ver a divisão refeita" perde a escolha e o "Por que desfazer"

- **Evidência.** Em `FinanceiroRepasses.tsx:453-459` e `:428-429`, a nova proposta zera `escolha` e `porque`. As linhas acrescentadas à mão (perito, parceiro) também somem, porque a divisão volta a ser a proposta.
- **O que o desenho e o plano pedem.** A `NOTAS.md`, estado 5, diz: "O que Diego tinha escolhido ('Desfazer…' e a explicação) continua na janela". O plano (A3, ui) diz que a tela "mantém o resto do que foi preenchido".
- **Impacto.** Quando a corrida foi uma baixa nova, Diego precisa escrever tudo de novo.
- **Correção:** na recarga do conflito, guardar a explicação digitada e as linhas manuais (`proposta: false`). Reaplicar a escolha só se o `baixa.id` escolhido ainda estiver em `exitoBaixado`.

### 6. Baixa (acessibilidade): o "Registrar" durante o cálculo da divisão não responde

- **Evidência.** Em `FinanceiroRepasses.tsx:465` (`if (buscando) return;`), o clique é ignorado sem nenhum aviso. O botão não fica `aria-disabled`, e a região `aria-live` (`"Registrando."`) não diz nada.
- **Impacto.** Para quem usa leitor de tela, o envio parece quebrado.
- **Correção:** com `buscando`, pôr `aria-disabled` no botão e anunciar "Calculando a divisão pelo contrato…" na região `aria-live` que já existe.

### 7. Baixa: o resumo de erros conta tudo, mas só tem link para os erros do êxito

- **Evidência.** `FinanceiroRepasses.tsx:522-524` e `:564-572`: o título usa `tituloErrosExito(erros.length)`, que conta todos os erros, e a lista tem só `exito` e `porque`.
- **Impacto.** Com o valor vazio e sem escolha, o título diz "Falta acertar 2 coisas." e mostra um link só.
- **Correção:** contar só os erros listados ou listar todos os erros, cada um com o seu link.

### 8. Baixa (desempenho): a ficha lê `pessoas` sem índice

- **Evidência.** Em `1100:96`, `where p.id::text = b ->> 'por'` converte a coluna, e o índice da chave não é usado.
- **Correção:** `pessoa_ref(nullif(b ->> 'por', '')::uuid)`, ou `p.id = (b ->> 'por')::uuid`.

### 9. Informação: o PR mostra conflito com o branch local

- **Evidência.** O branch local `claude/project-thread-uovozs` está 9 commits à frente do `origin/claude/project-thread-uovozs`, e o PR #200 mostra conflitos. A revisão foi do branch local, rebaseado sobre o `main` em `b76d1f5`.
- **O que fazer:** o PR só reflete este código depois de um push com `--force-with-lease`, feito por quem for publicar.

## Sobre a autorrevisão (`REVISAO-CODIGO.md`)

- **Os achados 1 a 4 do autor:** conferem com o código.
- **O que ela não pegou:**
  - o texto fixo do desfazer (achado 1 aqui);
  - que a falta do Fechamento exigia um item pendente (achado 2);
  - a ordem da publicação (achado 3).
- **"Isolamento (teste 13)":** confere. O escritório B recebe a recusa de campo e não recebe o `exitoBaixado`, nem o detalhe do `EXITO_MUDOU`, que filtra pelo escritório.

## O que foi aplicado (autor, no branch `claude/f3-174-exito-baixado-divisao`)

| Nota | Situação | Onde |
|---|---|---|
| 1. O texto do desfazer | **Aplicada** | `1100`: o `levantamento_exito_desfeito` é gravado depois do laço de pagamento, com `pago` (o que os honorários pagaram à parcela desfeita) e `falta`. `baixa.ts`: `textoExitoDesfeito(pago, falta)` dá "…e os honorários pagam a parcela.", "…desfeita; os honorários pagaram R$ X, e falta R$ Y." ou "…desfeita, e a parcela volta a ser cobrada.". A confirmação usa o `exitoBaixado` da resposta, e a ficha usa o evento (um evento sem `pago` mostra o texto de antes). Testes: pgTAP 146 com o E1 (sem honorários: `VENCIDA`, `[0, 480000]`), o E2 (R$ 1.000,00: `paga: false`, `[100000, 380000]`) e o caso inteiro (`[480000, 0]`), e o vitest dos três textos. O aviso opcional antes de enviar não entrou |
| 2. A linha do "Fechamento do caso" | **Aplicada** | O `levantamento_exito_mantido` guarda o número do contrato. `fechamentoExitoMantido` monta "Êxito do contrato C-2026-021: baixa sem receber", com "inadimplência, por Marina Ribeiro em 05/11 · mantida ao registrar o alvará", na lista do fechamento da ficha. Testes: pgTAP 146, vitest e e2e `eb-historico`. A F3.174 continua `feito` sem item pendente, porque o desenho do estado 6 está inteiro |
| 3. A ordem da publicação | **Aplicada** | P22: a api-portal e o Portal primeiro, e só depois a 1100, com a justificativa. A conferência do passo 2 e a consulta da nota 11 continuam antes |
| 4. O número 1100 | **Aplicada como escrita na P22** | A 1100 vai pelo `apply_migration`, com o conteúdo direto, fora de ordem. A P22 diz por quê (o `db push` recusaria) e que as migrations 1110 a 1119 não mexem nas funções trocadas |
| 5. "Ver a divisão refeita" | **Aplicada** | Antes da recarga, a tela guarda a escolha, o `baixa.id`, o "Por que desfazer" e as linhas acrescentadas à mão. Na proposta nova, as linhas à mão e a explicação voltam. A escolha só volta se a mesma baixa ainda estiver em vigor, e então a divisão é refeita com ela (honorários e custas). O e2e `eb-conflito` confere o perito acrescentado à mão |
| 6. "Registrar" durante o cálculo | **Aplicada** | Com a divisão sendo calculada, o botão fica `aria-disabled`. O clique anuncia "Calculando a divisão pelo contrato…" na região `aria-live` |
| 7. O resumo de erros | **Aplicada** | O título conta só os erros listados (`tituloErrosExito(errosEb.length)`) |
| 8. `pessoas` sem índice | **Aplicada** | `pessoa_ref(nullif(b ->> 'por', '')::uuid)` |
| 9. O PR e o branch local | Sem mudança aqui | Este branch não foi publicado (sem push) |

Testes rodados de novo: pgTAP 146 (57 de 57) e 080, o script `exito-baixado-divisao.sh`, vitest (784), e2e `portal-financeiro-repasses.spec.ts` (46, no celular e no computador, `--trace off`), lint sem erro e `painel conferir` com 0 erro.
