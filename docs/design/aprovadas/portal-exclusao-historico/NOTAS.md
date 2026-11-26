# F3.177 · Exclusão a pedido do titular: os lançamentos do sistema antigo · notas

Decisão da Carol (25/11/2026, C1 opção b): quando um cliente é excluído a pedido dele, a descrição dos lançamentos importados do sistema antigo (`historico_financeiro_anterior.descricao`, texto livre de até 300 letras) e o detalhe escrito ao dispensar o lembrete de contrato (`lembrete_contrato.dispensa_detalhe`) **ficam guardados como estão** até o fim do prazo do imposto, como os arquivos das despesas da F3.156. O marco é 1º de janeiro de ano + 2 + 5 da data do lançamento: pago em 2026, troca em 01/01/2033. Só então a descrição vira “Lançamento do sistema antigo de cliente excluído” e o detalhe vira “Detalhe apagado a pedido do titular”. Data, valor e situação ficam sempre.

A janela aprovada da F3.156 (`docs/design/aprovadas/portal-exclusao-despesas`), que é a do código hoje, não fala desse dado, e a faixa do escudo diz "Nada aqui precisa ser guardado por lei.", o que deixa de ser verdade. Este desenho resolve isso. PT-11.

## O que mudou em relação ao aprovado

1. **Uma linha nova no quadro âmbar "O que a lei obriga a guardar"**, quando `historico.lancamentos > 0`. Fica depois das linhas da F3.156 (arquivos da despesa e pasta do contador), antes do pé do quadro.
2. **O quadro passa a aparecer também sem despesa**, só com a linha nova. Mesmo estilo aprovado (`pd-guarda`), mesmo título, mesmo pé.
3. **A frase em negrito da faixa do escudo** muda quando há histórico. O resto da faixa fica igual.
4. **"O que é apagado" e "O que fica, sem dado pessoal" não mudam** (na recomendada). A descrição não é apagada agora, e ela tem dado pessoal, então não entra em "O que fica, sem dado pessoal".
5. Sem histórico importado, a janela é a aprovada da F3.156, letra por letra, em todos os 5 estados aprovados de despesa; o gerador confere com `assert`.
6. O contorno tracejado em âmbar só marca o que é novo no desenho. As peças da F3.156, já programadas, aparecem sem contorno. **No produto, não há contorno.**

## O texto

### 1. A linha nova no quadro "O que a lei obriga a guardar" (quando `lancamentos > 0`)

Linha (negrito do item), com `{sistema}` = "do Astrea" (`ASTREA`), "do ADVBOX" (`ADVBOX_PLANILHA`) ou "do sistema antigo" (`origem` null, mais de um sistema):

| | Linha |
|---|---|
| 1 lançamento | **A descrição do lançamento {sistema}** |
| n lançamentos | **A descrição dos {n} lançamentos {sistema}** |

Explicação (`<small>`), montada em quatro pedaços, nesta ordem:

1. Sempre: "fica como veio na importação"
   - `detalhes = 1`: + ", com o detalhe escrito ao dispensar o lembrete de contrato"
   - `detalhes > 1`: + ", com os detalhes escritos ao dispensar os lembretes de contrato"
   - e fecha com "."
2. Só quando `semData > 0`:
   - 1 lançamento, sem data: "Ele veio sem data e conta pela data da importação."
   - n lançamentos, 1 sem data: "Um deles veio sem data e conta pela data da importação."
   - n lançamentos, s sem data: "{s} deles vieram sem data e contam pela data da importação."
3. Sempre: "O T3jus troca sozinho por um texto fixo em {dd/mm/aaaa}."
4. Sempre: "A data, o valor e se foi pago não mudam."

Exemplo completo (estado `historico-so`): **A descrição dos 12 lançamentos do Astrea** — fica como veio na importação, com o detalhe escrito ao dispensar o lembrete de contrato. O T3jus troca sozinho por um texto fixo em 01/01/2033. A data, o valor e se foi pago não mudam.

Pé do quadro (sempre, como aprovado): "Ficam pela obrigação fiscal do escritório, que vale mesmo com o pedido do titular (LGPD, art. 16, I)."

### 2. Faixa do escudo (quando `lancamentos > 0`)

Só a frase em negrito muda. `{desc}` = "essa descrição" (1 lançamento e nenhum detalhe) ou "essas descrições" (nos outros casos).

| Situação | Frase em negrito |
|---|---|
| Só histórico (sem arquivo de despesa) | **Fora {desc}, nada aqui precisa ser guardado por lei.** |
| Histórico + 1 arquivo, sem pasta | **Fora esse arquivo e {desc}, nada aqui precisa ser guardado por lei.** |
| Histórico + vários arquivos ou alguma pasta | **Fora esses arquivos e {desc}, nada aqui precisa ser guardado por lei.** |
| Sem histórico | como hoje (F3.156) |

O resto da faixa fica como está no código.

## O campo que o servidor devolve

Uma chave nova `historico` **dentro de `arquivosQueFicam`** (só para a sócia dona, nas mesmas condições). Com isso, `despesasDoExcluido` (`packages/ui/src/portal/exclusao.ts`) passa a montar a linha e a faixa a partir do mesmo objeto. Hoje a função devolve tudo null quando `despesas = 0`; isso precisa mudar para olhar também `historico`.

```ts
export interface ArquivosQueFicam {
  despesas: number; comArquivo: number; arquivos: number; pastas: number; ate: string | null; // F3.156, sem mudança
  /** F3.177: o que veio do sistema antigo e fica com a descrição até o prazo do imposto. null ou ausente = nada importado. */
  historico?: HistoricoQueFica | null;
}
export interface HistoricoQueFica {
  /** Linhas de historico_financeiro_anterior do cliente, sem as desfeitas. 0 = sem linha nova. */
  lancamentos: number;
  /** Lembretes de contrato do cliente dispensados com dispensa_detalhe preenchido. */
  detalhes: number;
  /** Quantos desses lançamentos não têm data (contam pela data da importação). */
  semData: number;
  /** O sistema de origem, se for um só; null quando há mais de um. */
  origem: "ASTREA" | "ADVBOX_PLANILHA" | null;
  /** O dia da troca (aaaa-mm-dd, sempre 1º de janeiro): o maior marco entre os lançamentos e os detalhes. Nunca null se lancamentos > 0. */
  ate: string;
}
```

Para quem programar (não é pergunta para a Carol, mas precisa estar fechado no plano):
- **Uma data só por cliente**, a mais tarde, como o `ate` da F3.156. A janela não lista data por lançamento.
- **Marco do lançamento:** `data` dele; sem `data`, a data da importação (`criado_em`), na recomendada. A `situacao` (PAGO ou EM_ABERTO) não muda o marco.
- **Marco do detalhe da dispensa:** sugiro o maior marco dos lançamentos que o lembrete cobre (o detalhe explica esses valores). Se não houver, a data da dispensa.
- **Linhas desfeitas** (`desfeito_em`): não entram na contagem, porque o escritório já as tirou da ficha. Sugiro trocar a descrição delas na hora, como o plano previa (o escritório desfez a importação, então não há o que guardar). Se o plano decidir guardá-las também, entram na contagem e no `ate`.

## Os estados desenhados

| Estado | `arquivosQueFicam` | O que aparece |
|---|---|---|
| `historico-nenhum` | sem `historico` | Nada muda (a janela de hoje). |
| `historico-so` | despesas 0; historico 12 lançamentos, 1 detalhe, 0 sem data, ASTREA, até 2033-01-01 | Quadro âmbar só com "A descrição dos 12 lançamentos do Astrea …"; faixa "Fora essas descrições, …". |
| `historico-e-despesas` | despesa paga com 1 arquivo, até 2033-01-01 (F3.156); historico 1 lançamento de 2024, até 2031-01-01 | Linha da descrição da despesa em "O que é apagado" (aprovada); no quadro, o arquivo (01/01/2033) e "A descrição do lançamento do Astrea" (01/01/2031); faixa "Fora esse arquivo e essa descrição, …". |
| `historico-em-aberto` | 2 despesas em aberto com arquivo, até null (F3.156); historico 4 lançamentos (2 em aberto no Astrea), 1 detalhe, até 2032-01-01 | A despesa em aberto continua sem data (aprovado); o lançamento em aberto **tem** data; faixa "Fora esses arquivos e essas descrições, …". |
| `historico-sem-data` | despesas 0; historico 3 lançamentos, 1 sem data, até 2033-01-01 | Linha com "Um deles veio sem data e conta pela data da importação."; faixa "Fora essas descrições, …". |

## Decisões

1. **Linha no quadro já aprovado, e não quadro novo.** A decisão da Carol põe esse texto na mesma regra dos arquivos das despesas: guardado pela obrigação fiscal até 1º de janeiro do 7º ano. O quadro "O que a lei obriga a guardar" já diz exatamente isso, com o mesmo pé (LGPD, art. 16, I). Nenhuma peça visual nova.
2. **Cada linha com a sua data.** Com despesa e histórico juntos, as datas podem ser diferentes (no desenho, 01/01/2033 e 01/01/2031). Juntar numa data só obrigaria a dar a mais tarde para tudo, e o arquivo seria prometido por mais tempo, ou o contrário.
3. **"Troca por um texto fixo", e não "apaga".** A linha não some: a data, o valor e se foi pago continuam. "Apaga" faria a advogada achar que o lançamento sai do histórico. O texto fixo exato (“Lançamento do sistema antigo de cliente excluído”) fica fora da tela para a linha não crescer; ele está aqui e no README.
4. **O detalhe da dispensa vai junto, na mesma linha.** Ele só existe por causa desses lançamentos (o lembrete nasce do valor em aberto importado), tem a mesma regra e a mesma data. Uma linha a mais só para ele alongaria o quadro no celular sem dizer nada novo.
5. **"Do Astrea", como na ficha.** A folha da ficha se chama "Do Astrea" (ou "Do ADVBOX") e conta "lançamentos". A janela usa as mesmas palavras. "Pagamentos" seria errado para os que estavam em aberto.
6. **"Se foi pago", e não "situação".** É a palavra da ficha ("pago antes do T3jus", "em aberto lá").
7. **Lançamento em aberto tem data.** Diferente da despesa da F3.156, a linha importada é uma foto do Astrea e não muda mais no T3jus: ela nunca vai ser paga aqui, então o marco não anda. Por isso o estado `historico-em-aberto` dá data ao histórico e mantém a despesa em aberto sem data, como aprovado. Não há texto especial para o em aberto.
8. **Lançamento sem data (a importação aceita, com o aviso `CAMPO_INVALIDO`).** Sem data, não há ano para contar. Recomendo contar pela data da importação: é mais tarde que a data real, então guarda pelo menos o tempo da lei, e a linha continua tendo uma data de troca. A janela diz isso numa frase só, e só quando acontece.
9. **A faixa do escudo muda só a frase em negrito**, como na F3.156, apontando para o quadro logo acima.

## Uma observação (não muda este desenho)

A descrição da despesa adiantada (F3.156) vira texto fixo **na hora**, mesmo com o arquivo guardado, e agora a descrição do lançamento antigo **fica** até o prazo. Na mesma janela, as duas aparecem com regras diferentes ("viram “Despesa adiantada…”" em "O que é apagado" e "fica como veio" no quadro). O texto está certo para cada regra, mas a Carol pode querer saber que a diferença fica visível.

## Como abrir e como refazer

- `index.html` mostra os 5 estados aprovados em computador (1440) e celular (412), com legenda. Clique numa imagem para abrir o HTML naquele estado.
- `exclusao.html` abre sozinho, por exemplo `exclusao.html?estado=historico-so`. Abaixo de 760 px, vira a versão de celular.
- As capturas são longas (a janela inteira, sem rolagem interna), como na F3.156. A conferência roda antes, no tamanho normal (1440 × 900 e 412 × 915).
- `_fonte/`: `comum.py`, `clientes.py`, `pendencias.py`, `f155.py`, `f156.py` e `webp.py` são as cópias do aprovado `portal-exclusao-despesas/_fonte`, sem mudança; `f177.py` executa o `f156.py` aprovado até antes dos estados dele, acrescenta as peças novas e grava `exclusao.html` (a alternativa B recusada não é mais gerada); `casos_177.py` gera a lista e o `index.html`; `fotos_177.cjs` é o `fotos_156.cjs` aprovado lendo `casos_177.json`; `sh _fonte/gerar.sh` refaz tudo (o axe vem de `AXE_PLAYWRIGHT`).
- **Conferência** (`_conferencia.json`): 10 capturas com deviceScaleFactor 2, nenhuma violação do axe (WCAG 2.0, 2.1 e 2.2, A e AA), nenhuma rolagem lateral, nenhum alvo menor que 44 px, nenhum erro de script.
- Dados fictícios, os mesmos do aprovado (Antônia Ferreira Prado).

## Perguntas que foram à Carol

1. **A linha no quadro "O que a lei obriga a guardar"** (como desenhada) está boa, com o detalhe da dispensa junto, na mesma linha?
2. **Lançamento sem data:** conta pela data da importação e fica guardado (A, recomendado), ou perde a descrição na hora (B)?
3. **"Troca sozinho por um texto fixo"** basta, ou a janela deve mostrar o texto exato (“Lançamento do sistema antigo de cliente excluído”)?

## Decisões da Carol (26/11/2026)

- **Aprovado na alternativa A**: o lançamento sem data conta pela data da importação e fica guardado, com a frase "Um deles veio sem data e conta pela data da importação." A alternativa B (o sem data perde a descrição na hora) foi recusada e não está nesta pasta.
- A linha nova fica no quadro "O que a lei obriga a guardar", com o detalhe da dispensa na mesma linha, e a janela diz "troca sozinho por um texto fixo", sem o texto exato (como desenhado).
- O contorno tracejado em âmbar é só marcação do desenho; no produto não há contorno.
- Programado na F3.177 e na F3.184 (`packages/ui/src/portal/exclusao.ts`, `despesasDoExcluido` e `linhaHistorico`; `ExclusaoCliente.tsx`), com a chave `arquivosQueFicam.historico` da ficha (migration 1116). Regra do servidor, pela revisão do plano: a linha desfeita não conta e troca na hora; a já vencida também troca na hora e não conta; o detalhe conta só enquanto os lançamentos que ele explica não venceram.
