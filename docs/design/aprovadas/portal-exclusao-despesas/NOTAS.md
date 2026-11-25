# F3.156 · Exclusão a pedido do titular: a despesa adiantada ao cliente · notas

Quando o escritório adiantou uma despesa ao cliente, a exclusão a pedido do titular passa a fazer duas coisas. A descrição da despesa vira o texto fixo "Despesa adiantada a cliente excluído". A nota, a guia, o boleto ou o comprovante **ficam guardados** pela obrigação fiscal, com o nome do arquivo trocado pelo tipo ("Nota fiscal.pdf"), e o T3jus apaga sozinho no fim do prazo. A janela aprovada da F3.155 (`docs/design/aprovadas/portal-exclusao-arquivos`) ainda diz "O que fica, sem dado pessoal" e "Nada aqui precisa ser guardado por lei.", o que deixa de ser verdade quando há arquivo guardado. Este desenho resolve isso. PT-11.

Base: o plano `f3-156/plano.md`, seção 2.4 (campo `arquivosQueFicam`), com as correções da revisão: G2 (o marco é 1º de janeiro do 7º ano depois do ano da data mais tarde; pago em 2026, sai em 01/01/2033), M1 (conta em aberto não tem data; `ate` vem null) e M2 (a pasta já montada fica com a descrição antiga).

## O que mudou em relação ao aprovado

1. **Uma linha nova em "O que é apagado"**, quando `despesas > 0`, logo depois da linha dos arquivos da F3.155.
2. **Um quadro novo, "O que a lei obriga a guardar"**, quando `arquivos > 0`, logo abaixo de "O que fica, sem dado pessoal". Usa o estilo aprovado `pd-guarda` (fundo âmbar claro, filete âmbar, ícone de cadeado), o mesmo de "Por que não exclui" no arquivamento, que já existe no código (`portal.css`, `.pd-guarda`).
3. **A frase em negrito da faixa do escudo** muda quando `arquivos > 0`. O resto da faixa fica igual.
4. **O título "O que fica, sem dado pessoal" não muda.** Com o quadro à parte, ele continua verdade: o que tem dado pessoal e fica está no quadro da lei, não nessa lista.
5. Sem despesa, a janela é a aprovada da F3.155 (estado `excluir-arquivos`), letra por letra; o gerador confere com um `assert`. Com despesa e sem arquivo, só entra a linha do item 1.
6. O contorno tracejado em âmbar (e o sublinhado tracejado na faixa) só serve para achar o que é novo no desenho. **No produto, não há contorno.**

## O texto

### 1. "O que é apagado" (quando `despesas > 0`)

| | Linha | Explicação (`<small>`) |
|---|---|---|
| 1 despesa | **A descrição da despesa adiantada** | vira “Despesa adiantada a cliente excluído”. O valor, as datas e o reembolso continuam no Financeiro. |
| n despesas | **A descrição das {n} despesas adiantadas** | viram “Despesa adiantada a cliente excluído”. O valor, as datas e o reembolso continuam no Financeiro. |

### 2. Quadro "O que a lei obriga a guardar" (quando `arquivos > 0`)

Primeira linha, sobre os arquivos:

| | Linha |
|---|---|
| `arquivos = 1` | **O arquivo da despesa adiantada** |
| `arquivos > 1`, `comArquivo = 1` | **Os {arquivos} arquivos da despesa adiantada** |
| `arquivos > 1`, `comArquivo > 1` | **Os {arquivos} arquivos das {comArquivo} despesas adiantadas** |

Explicação: começa com "a nota, guia, boleto ou comprovante" (um arquivo) ou "notas, guias, boletos ou comprovantes" (vários), seguido de ", com o nome trocado pelo tipo, como “Nota fiscal.pdf”." e termina conforme `ate`:
- com data: "O T3jus apaga sozinho em {dd/mm/aaaa}." (ex.: 01/01/2033);
- `ate` null: "Enquanto houver despesa em aberto, não há data: o T3jus apaga sozinho em 1º de janeiro do 7º ano depois do pagamento."

Segunda linha, só quando `pastas > 0`:

| | Linha | Explicação |
|---|---|---|
| 1 pasta | **A pasta mandada ao contador** | fica como foi montada, com a descrição antiga no nome dos arquivos. A cópia do T3jus sai pela regra do mês da pasta; a que o contador recebeu fica fora do T3jus. |
| n pastas | **As {n} pastas mandadas ao contador** | ficam como foram montadas, com a descrição antiga no nome dos arquivos. As cópias do T3jus saem pela regra do mês de cada pasta; as que o contador recebeu ficam fora do T3jus. |

Pé do quadro (sempre): "Ficam pela obrigação fiscal do escritório, que vale mesmo com o pedido do titular (LGPD, art. 16, I)."

### 3. Faixa do escudo (quando `arquivos > 0`)

Só a frase em negrito muda:
- 1 arquivo e nenhuma pasta: **"Fora esse arquivo, nada aqui precisa ser guardado por lei."**
- mais de um arquivo, ou alguma pasta: **"Fora esses arquivos, nada aqui precisa ser guardado por lei."**

O resto ("Antônia ainda não tem contrato nem processo no T3jus; …") fica como no aprovado. Atenção para quem programar: o código de hoje usa outra redação no resto da frase ("Este cliente não tem contrato nem processo no T3jus; quem tem um deles é atendido arquivando, sem apagar."). Basta trocar a frase em negrito e manter o resto como está no código.

## Os estados desenhados

| Estado | `arquivosQueFicam` | O que aparece |
|---|---|---|
| `despesa-nenhuma` | despesas 0 | Nada muda (igual ao aprovado). |
| `despesa-paga-nota` | 1 despesa, 1 arquivo, 0 pastas, até 2033-01-01 | Linha "A descrição da despesa adiantada"; quadro com "O arquivo da despesa adiantada … apaga sozinho em 01/01/2033."; faixa "Fora esse arquivo, …". |
| `despesa-em-aberto` | 2 despesas, 2 com arquivo, 2 arquivos, 0 pastas, até null | "A descrição das 2 despesas adiantadas"; "Os 2 arquivos das 2 despesas adiantadas … Enquanto houver despesa em aberto, não há data …"; faixa "Fora esses arquivos, …". |
| `despesa-pasta-contador` | 1 despesa, 2 arquivos (nota e comprovante), 1 pasta, até 2033-01-01 | "Os 2 arquivos da despesa adiantada … 01/01/2033."; "A pasta mandada ao contador …". |
| `despesa-sem-arquivo` | 1 despesa, 0 arquivos | Só a linha da descrição; sem quadro; título e faixa aprovados. |

## Decisões

1. **Quadro à parte, e não o título trocado (recomendado, alternativa A).** O plano propunha trocar o título para "O que fica" e pôr a nota na lista. Prefiro manter "O que fica, sem dado pessoal" e separar o que fica **com** dado pessoal num quadro próprio, porque:
   - o título continua uma garantia verdadeira em todos os clientes, sem variar;
   - a nota guardada pode trazer nome e CPF, e é isso que a advogada precisa poder explicar ao titular; misturar com o que fica sem dado pessoal esconde justamente o ponto sensível;
   - o quadro âmbar com cadeado já é o padrão aprovado para "a lei impede apagar" (o "Por que não exclui" do arquivamento), então não há peça visual nova;
   - âmbar é atenção, não urgência: a exclusão segue normal, só com um aviso.
   O custo é a janela mais comprida no celular (cerca de 230 px a mais com um arquivo). Ela já rola, e o rodapé com o botão fica preso embaixo.
2. **A alternativa B (a proposta do plano)** trocava o título para "O que fica", punha a linha "A nota, guia, boleto ou comprovante da despesa" na lista e a faixa "Só a nota da despesa fica, pela lei fiscal." Era mais curta, mas o título perdia a garantia e o dado pessoal que fica se diluía na lista. A Carol a recusou; ela não está nesta pasta.
3. **A data é a de saída, e não "até".** "O T3jus apaga sozinho em 01/01/2033" diz o dia em que o arquivo some, sem dúvida sobre se o dia 1º está dentro ou fora.
4. **Conta em aberto (M1).** O campo traz uma só data (`ate`), e ela vem null quando alguma conta com arquivo está em aberto. Por isso o texto não dá data nenhuma nesse caso, nem a da despesa já paga, e explica a regra: "1º de janeiro do 7º ano depois do pagamento". É a regra de G2 dita de forma que a advogada consegue fazer a conta. "Depois do pagamento" simplifica a data mais tarde (pagamento ou reembolso); o detalhe fica no README.
5. **A pasta do contador (M2).** O texto não promete que o nome muda dentro da pasta: diz que ela fica como foi montada, com a descrição antiga. Separa a cópia do T3jus, que sai pela regra do mês da pasta, da que o contador recebeu, que fica fora do T3jus (e, portanto, com o escritório, como já diz a faixa do escudo). "Pela regra do mês da pasta" e não "na mesma data", porque o marco da pasta pode vir antes do da nota quando o reembolso é de outro ano.
6. **"O arquivo da despesa", e não "a nota fiscal".** O campo traz só contagens, não o tipo de cada arquivo, e a regra vale para nota, guia, boleto e comprovante. A explicação lista os quatro. Se a Carol preferir o tipo na linha ("A nota fiscal da despesa adiantada"), o campo precisa de uma contagem por categoria.
7. **A lei, de leve.** Uma citação só, no pé do quadro: "(LGPD, art. 16, I)". "Lei fiscal" e "obrigação fiscal" dizem o resto, sem CTN nem número de artigo na tela; a base completa fica no README e no inventário.
8. **A linha da descrição diz o que continua**: valor, datas e reembolso no Financeiro, para a advogada não achar que a despesa some do caixa. Ela aparece mesmo sem arquivo, porque a descrição é trocada em todas as despesas.
9. **A faixa do escudo muda só a frase em negrito.** "Fora esse arquivo" (ou "esses arquivos") aponta para o quadro logo acima e mantém o resto da mensagem, que continua verdade.

## Como abrir e como refazer

- `index.html` mostra os 5 estados aprovados em computador (1440) e celular (412), com legenda. Clique numa imagem para abrir o HTML naquele estado.
- `exclusao.html` abre sozinho. Exemplo: `exclusao.html?estado=despesa-paga-nota`. Abaixo de 760 px, ele vira a versão de celular.
- **As capturas são longas:** a janela aparece inteira, sem rolagem interna, porque o quadro novo fica no meio da coluna e sairia do quadro numa captura de 900 px. A conferência de rolagem lateral, alvos e axe roda antes, no tamanho normal (1440 × 900 e 412 × 915).
- `_fonte/`:
  - `comum.py`, `clientes.py`, `pendencias.py` e `f155.py` são as cópias do aprovado (`portal-exclusao-arquivos/_fonte`), sem mudança;
  - `f156.py` executa o `f155.py` aprovado até antes dos estados dele, acrescenta as peças novas e grava `exclusao.html` (a alternativa B recusada não é mais gerada);
  - `casos_156.py` gera a lista de estados e o `index.html`;
  - `fotos_156.cjs` é o `fotos_155.cjs` aprovado, com a captura longa descrita acima;
  - `webp.py` converte as capturas para WebP;
  - `sh _fonte/gerar.sh` refaz tudo. O axe vem de `AXE_PLAYWRIGHT` (veja o cabeçalho do script).
- **Conferência** (`_conferencia.json`): 10 capturas com deviceScaleFactor 2, nenhuma violação do axe (WCAG 2.0, 2.1 e 2.2, A e AA), nenhuma rolagem lateral, nenhum alvo menor que 44 px e nenhum erro de script.
- Os dados são fictícios, os mesmos do aprovado (Antônia Ferreira Prado, com os arquivos da F3.155).

## Perguntas para a Carol

1. **Quadro à parte "O que a lei obriga a guardar" (A, recomendado)** ou título trocado para "O que fica", com a nota na lista (B)?
2. **Conta em aberto:** basta a regra ("1º de janeiro do 7º ano depois do pagamento"), ou a janela deve mostrar também a data das despesas já pagas? A segunda opção pede mais um campo na ficha.
3. **Tipo do arquivo na linha:** "O arquivo da despesa adiantada" (como está) ou "A nota fiscal da despesa adiantada" quando houver um só tipo? A segunda pede a contagem por categoria.
4. **A pasta do contador:** o texto deixa claro que a cópia entregue ao contador não é apagada pelo T3jus. Está bom assim, ou a janela deve sugerir avisar o contador?

## Decisões da Carol (24/11/2026)

- **Aprovado** às 19h34 (Brasília), na **alternativa A**: o quadro à parte "O que a lei obriga a guardar", com o título "O que fica, sem dado pessoal" mantido. A alternativa B foi recusada e não está nesta pasta.
- **Conta em aberto:** sem despesa em aberto, a janela mostra a data; com alguma em aberto, explica a regra, sem data (como desenhado).
- **Tipo do arquivo na linha:** fica "O arquivo da despesa" (como desenhado), sem a contagem por categoria.
- **A pasta do contador:** a janela não sugere avisar o contador (como desenhado).
- O contorno tracejado em âmbar é só marcação do desenho; no produto não há contorno.
- Programado na F3.156 (`packages/ui/src/portal/exclusao.ts`, `despesasDoExcluido`; `ExclusaoCliente.tsx`), com a chave `arquivosQueFicam` da ficha (migration 1092).
