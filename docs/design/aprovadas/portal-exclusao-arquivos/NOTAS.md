# F3.155 · Exclusão a pedido do titular: os arquivos do cliente · notas

Desde a F3.141, ao excluir os dados a pedido do titular, o T3jus também apaga os arquivos do cliente. São três tipos: os documentos pessoais, o termo de curatela ou de tutela e o Word gerado de cada proposta. A janela aprovada (`docs/design/aprovadas/portal-clientes-pendencias`, estado `excluir`) ainda não diz isso. Este desenho põe **uma linha nova em "O que é apagado"** e não muda mais nada. PT-11.

## O que mudou em relação ao aprovado

- **Uma linha nova em "O que é apagado"**, logo depois de "Nome, CPF, RG e a qualificação". Os documentos são cópias desses mesmos dados, então as duas linhas ficam juntas.
- A linha **só aparece quando há arquivo**. Sem arquivo, a janela fica igual à aprovada, letra por letra; o gerador confere isso com um `assert`.
- "O que fica", o pedido, a confirmação, o rodapé, as cores e a marca não mudam.
- O contorno tracejado em âmbar só serve para achar a linha nova no desenho. **No produto, a linha é igual às outras.**

## O texto

A linha é formada por até três partes, nesta ordem e ligadas por vírgula e "e". A primeira letra vai em maiúscula.

| Parte | 1 | Vários |
|---|---|---|
| Documentos pessoais | o documento pessoal | os {n} documentos pessoais |
| Termo | o termo de curatela / o termo de tutela | (é sempre um: o termo atual) |
| Propostas | o arquivo Word da proposta | os arquivos Word das {n} propostas |

A explicação abaixo da linha (`<small>`) depende de quantos arquivos são no total:
- **1 arquivo:** "o arquivo é apagado do T3jus. Fica só que existiu: tipo, tamanho e datas, sem o nome do arquivo."
- **2 ou mais:** "os arquivos são apagados do T3jus. Fica só que existiram: tipo, tamanho e datas, sem o nome dos arquivos."

Os estados desenhados:

| Estado | Linha | Explicação |
|---|---|---|
| `excluir-arquivos`: PF com 3 documentos, o termo de curatela e 1 proposta | **Os 3 documentos pessoais, o termo de curatela e o arquivo Word da proposta** | os arquivos são apagados do T3jus. Fica só que existiram: tipo, tamanho e datas, sem o nome dos arquivos. |
| `excluir-um-documento`: PF com 1 documento | **O documento pessoal** | o arquivo é apagado do T3jus. Fica só que existiu: tipo, tamanho e datas, sem o nome do arquivo. |
| `excluir-pj-propostas`: PJ com 2 propostas e sem documentos | **Os arquivos Word das 2 propostas** | os arquivos são apagados do T3jus. Fica só que existiram: tipo, tamanho e datas, sem o nome dos arquivos. |
| `excluir-tutela`: menor sob tutela, com 2 documentos | **Os 2 documentos pessoais e o termo de tutela** | os arquivos são apagados do T3jus. Fica só que existiram: tipo, tamanho e datas, sem o nome dos arquivos. |
| `excluir-sem-arquivos`: nenhum arquivo | (a linha não aparece) | igual à janela aprovada |
| `excluir-alternativa-fica`: alternativa B, para comparar | **Os 3 documentos pessoais, o termo de curatela e o arquivo Word da proposta**, com "os arquivos são apagados do T3jus". Em "O que fica" entra **Que os arquivos existiram**, com "tipo, tamanho e datas de cada um, sem o nome do arquivo". | — |

## Decisões

1. **Sem jargão.** A sugestão do plano dizia "arquivo privado do escritório". Aqui fica "apagados do T3jus", que é o que a advogada precisa saber. "Word" no lugar de ".docx", porque é assim que o escritório chama o arquivo.
2. **"O arquivo Word da proposta", e não "a proposta".** A proposta continua no Comercial (valores e situação). Só o arquivo sai.
3. **A linha não diz "não dá para baixar de novo".** Isso seria falso para as propostas: depois da exclusão, um Word novo pode ser gerado, e ele sai com "Cliente excluído" e sem dado pessoal.
4. **"Sem o nome do arquivo" fica no texto**, porque o nome do Word da proposta traz o nome do cliente (`proposta-p-2026-014-nome-do-cliente.docx`).
5. **Recomendo não mexer em "O que fica" (alternativa A, a dos cinco primeiros estados).** O que fica dos arquivos (tipo, tamanho e datas) é um detalhe que ninguém consulta, então cabe na explicação da própria linha. É diferente dos atendimentos, que continuam visíveis na ficha e por isso têm linha própria em "O que fica". A alternativa B divide uma ideia em dois lugares e deixa a janela mais comprida no celular. Ela está desenhada só para a Carol comparar.
6. **A contagem**: na ficha, o campo `arquivosParaApagar` traz `{ documentos: n, termo: "CURATELA" | "TUTELA" | null, propostas: n }` e só vai para a sócia dona, que é quem vê o botão de excluir. Quem não é a dona vê só "Pedir a exclusão à sócia dona" e não recebe o campo.
   - `propostas` conta as propostas do cliente, não as versões do Word: o servidor apaga todas as versões que existirem.
   - Se houver termo de curatela e termo de tutela ao mesmo tempo (é raro), a parte vira "os termos de curatela e de tutela".
7. **A ordem de "Os 3 documentos…"**: documentos, depois o termo, depois as propostas. Vai do mais pessoal para o mais comercial.

## Como abrir e como refazer

- `index.html` mostra os 6 estados em computador (1440) e celular (412), com legenda. Clique numa imagem para abrir o HTML naquele estado.
- `exclusao.html` abre sozinho. Exemplo: `exclusao.html?estado=excluir-arquivos`. Abaixo de 760 px, ele vira a versão de celular.
- Para a captura do celular, a janela é rolada até "O que é apagado". Sem isso, a janela abre rolada até o campo com foco, como no aprovado, e a linha nova não aparece. O foco não muda.
- `_fonte/`:
  - `comum.py`, `clientes.py` e `pendencias.py` são as cópias do aprovado. Só mudou o caminho do repositório (`/home/user/t3jus`);
  - `f155.py` roda o `pendencias.py` aprovado e troca só a lista "O que é apagado";
  - `casos_155.py` gera a lista de estados e o `index.html`;
  - `fotos_155.cjs` é o `fotos_pd.cjs` aprovado, com a rolagem do celular descrita acima;
  - `webp.py` converte as capturas para WebP;
  - `sh _fonte/gerar.sh` refaz tudo. O axe vem de `AXE_PLAYWRIGHT` (veja o cabeçalho do script).
- **Conferência** (`_conferencia.json`): 12 capturas com deviceScaleFactor 2, nenhuma violação do axe (WCAG 2.0, 2.1 e 2.2, A e AA), nenhuma rolagem lateral, nenhum alvo menor que 44 px e nenhum erro de script.
- Os dados são fictícios, os mesmos do aprovado. A Construtora Vale Alto usa a ficha PJ aprovada de Clientes. Laura Prado Nogueira usa a ficha de Antônia com outro nome, porque só a janela está em revisão.

## Perguntas para a Carol

1. **"O que fica":** fica como está, com o que sobra dos arquivos dito na própria linha (A, recomendado)? Ou ganha a linha "Que os arquivos existiram" (B)?
2. **Lembrete para baixar antes:** a linha deve dizer "baixe antes o que o escritório precisar guardar"? Recomendo que não. O pedido é para apagar, e a faixa do escudo já diz que o que está fora do T3jus fica com o escritório. Um convite para baixar iria contra o pedido do titular.

## Decisões da Carol (24/11/2026)

- **Aprovado** às 11h34 (Brasília).
- **"O que fica" não muda (alternativa A).** O estado `excluir-alternativa-fica` fica só como registro da comparação e não vai para o produto.
- **Sem lembrete para baixar antes:** o desenho aprovado não tem o lembrete, como recomendado.
- O contorno tracejado em âmbar é só marcação do desenho; no produto a linha é igual às outras.
