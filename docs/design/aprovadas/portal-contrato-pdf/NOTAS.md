# Contrato em Word e PDF · notas

> **Para a Carol aprovar antes de programar.** Pedido dela: “Dentro de contrato não tem a opção de baixar o PDF ou o doc”.

A aba Documentos da ficha do contrato já foi aprovada (`docs/design/aprovadas/portal-procuracoes`, decisões 18 e 20) e está sendo programada no PR #103 (`Procuracoes.tsx`, função `DocumentosDaFicha`, coluna `pr-acoes`). Lá, cada documento tem só um “Baixar”, que entrega o .docx. Este desenho muda **só as ações de cada documento**. O resto da tela (cabeçalho, abas, quadro Assinatura e Advogados) é o aprovado, sem mudança.

Atende CH-08 (em parte, como o pacote aprovado). Pesam também PT-03 (versões e assinados guardados), PT-07 (arquivos privados, link temporário) e PT-10 (WCAG 2.2 AA, celular, erro).

## Como abrir

- `index.html` mostra os 5 estados lado a lado, computador (1440 px) e celular (390 px), com o rótulo e o que cada um mostra. Clique numa imagem para abrir o HTML naquele estado.
- `contrato-pdf.html?estado=ficha-pdf` (ou `pdf-preparando`, `pdf-erro`, `pdf-modelo-proprio`, `assinado`) abre sozinho. Abaixo de 760 px vira a versão de celular. Os links de Anexar e Gerar de novo levam ao pacote aprovado, na pasta vizinha `../portal-procuracoes/`.
- `_fonte/`: `sh _fonte/gerar.sh <pasta>` refaz tudo. `comum.py`, `pecas.py`, `contratos.py`, `procuracoes.py` e `peticoes_css.txt` são cópias sem mudança do pacote aprovado; `contrato_pdf.py` carrega o `procuracoes.py` e acrescenta as peças novas, com o prefixo `pdf-`; `index_gerar.py` monta o índice; `fotos.cjs` (o aprovado, com o celular em 390 px) faz as capturas com deviceScaleFactor 2 e roda o axe.
- Dados fictícios do elenco aprovado (Benedito Souza Lima, contrato C-2026-033, Marina Ribeiro). “Hoje” é 21/11/2026.

## O que muda

1. **Cada documento gerado tem duas saídas visíveis, Word e PDF.** No lugar do “Baixar” único, um grupo com o rótulo “Baixar” e dois botões colados: **Word** e **PDF**. Continua o “Anexar o assinado” à esquerda, como no aprovado.
2. **As ações descem para baixo do nome do documento.** Com três botões ao lado, o nome e o arquivo ficavam espremidos em quatro linhas. Agora o selo da situação fica à direita do nome e os botões numa linha só, embaixo.
3. **O nome do arquivo aparece sem extensão** (`contrato-honorarios-benedito-lima`), porque ele sai em dois formatos. O arquivo baixado leva a versão no nome (`…-v2.docx`, `…-v2.pdf`).
4. **Versões anteriores** também têm Word e PDF.
5. **Rodapé da folha** (no lugar da frase de hoje, que continua): “Word é para editar antes de imprimir. PDF é para mandar ao cliente ou imprimir como está.” e “O PDF sai do documento gerado. Se você mudou algo no Word, salve o PDF pelo próprio Word.”
6. **Documento assinado:** a ação passa a ser **“Baixar o assinado (PDF)”** ou **“(foto)”**, o arquivo como foi anexado. O Word e o PDF sem assinatura ficam numa lista que abre, “Sem assinatura (v2): Word e PDF”, com a frase “O que vale é o assinado. Use o Word só se for gerar uma versão nova.” (pergunta 3).

## Estados

| Estado | O que mostra |
|---|---|
| `ficha-pdf` | Os 3 documentos (contrato, procuração, declaração), cada um com Anexar o assinado e Baixar: Word e PDF |
| `pdf-preparando` | O PDF do contrato sendo preparado: o botão vira “Preparando o PDF” com o indicador girando, e uma linha embaixo diz “Leva alguns segundos; o arquivo baixa sozinho. Pode continuar na tela.” Word e os outros documentos seguem livres |
| `pdf-erro` | “Não deu para preparar o PDF do contrato.” / “Nada mudou no documento, e o Word continua para baixar. Tente de novo; se não sair, abra o Word e use Arquivo › Salvar como › PDF.”, com **Tentar de novo** e **Baixar o Word**; código `PDF_INDISPONIVEL` |
| `pdf-modelo-proprio` | Contrato do modelo do escritório (v2, com tabela e imagem). Aviso curto: “O PDF sai num leiaute simples, no timbrado. O texto é o mesmo do Word, mas a tabela e a imagem do seu modelo ficam só no Word. Para um PDF igual ao Word, salve como PDF pelo Word.” |
| `assinado` | Contrato ativo: contrato assinado em PDF e procuração em foto, com Baixar o assinado; o sem-assinatura do contrato aparece aberto. A declaração ainda espera o assinado, com Word e PDF |

## Decisões de design

1. **Dois botões visíveis, não um botão com menu.** A Carol não achou o PDF; um menu esconderia de novo. Dois botões colados sob o rótulo “Baixar” ocupam pouco, dizem o formato sem abrir nada e são dois alvos simples para teclado e leitor de tela (um menu pede `menu`/`menuitem`, setas e Esc, e no celular vira mais um toque).
2. **Word e PDF com o mesmo peso.** O passo a passo aprovado é revisar no Word e imprimir; o PDF serve para mandar ao cliente. Nenhum dos dois é “o certo”, então nenhum vira botão principal. O principal da linha continua sendo Anexar o assinado.
3. **O PDF é feito na hora, no servidor, a partir do .docx daquela versão,** e guardado para a próxima vez. A primeira vez leva alguns segundos; por isso o estado “Preparando”. O foco fica no botão (`aria-disabled`, não `disabled`), e a linha de situação é `role="status"`.
4. **Erro do PDF não trava nada:** o Word continua, o documento não muda e há duas saídas escritas. O aviso fica preso ao documento (não no topo), no tom aprovado em D5: o que aconteceu, o que continua igual, o que fazer.
5. **Modelo próprio com tabela ou imagem:** o PDF sai do mesmo texto num leiaute simples, no timbrado do escritório, e avisa. O aviso só aparece quando o modelo tem algo que o leiaute simples não reproduz (tabela, imagem, caixa de texto, colunas); o T3jus já lê o modelo na chegada (`docx.ts`) e guarda isso na versão. Depende da pergunta 1.
6. **O PDF não leva as edições feitas no Word do computador.** Ele sai do documento gerado. A frase do rodapé diz isso, para ninguém mandar ao cliente um PDF diferente do que revisou.
7. **No celular**, Anexar o assinado ocupa a linha toda e, embaixo, “Baixar” com Word e PDF meio a meio, 44 px de altura.

## Acessibilidade (WCAG 2.2 AA)

- **axe** (WCAG 2.0, 2.1 e 2.2, A e AA) em 10 capturas (5 estados × computador e celular) e no `index.html` (1440 e 390): **nenhuma violação**. Nenhuma tela tem rolagem lateral; nenhum erro de script. O resultado fica em `_conferencia.json`.
- **Alvos:** no celular, todos com 44 px ou mais. No computador, os botões compactos têm 36 px, como no aprovado. A única exceção é a palavra-marca “T3jus” da moldura aprovada (24 px), já registrada.
- **Nomes:** os dois botões ficam num `role="group"` com o nome “Baixar o contrato”; cada botão diz ao leitor de tela o formato, para que serve e o documento (“Baixar em Word (.docx, para editar): o contrato”, “Baixar em PDF (para mandar ou imprimir): a procuração”). O texto visível está dentro do nome (2.5.3).
- **Carregando:** `aria-disabled="true"` e `aria-describedby` apontando a linha de situação (`role="status"`); com movimento reduzido, o indicador para de girar.
- **Erro:** `role="alert"`, com as ações dentro do aviso.
- **Foco:** o contorno #AC3F6B de 3 px do aprovado; no grupo colado, o botão em foco sobe por cima do vizinho para o contorno aparecer inteiro.
- **Contraste:** só pares do D2 e do Gabinete (aviso âmbar #F2CDB3 com texto tinta).

## O que precisa no servidor

- `GET /v1/escritorio/documentos/:id/arquivo?formato=docx|pdf`: o .docx como hoje; o PDF convertido do .docx daquela versão, guardado no bucket privado `documentos-portal` ao lado dele e aberto por link temporário (PT-07). Sem UPDATE nem DELETE no documento gerado (PT-03).
- Conversão no servidor (por exemplo LibreOffice sem tela). Para os modelos padrão do T3jus e para o leiaute simples, o PDF pode ser montado direto do texto, com o timbrado (`linhasTimbrado`).
- `documento_modelo_versoes` ganha `leiaute_complexo` (tabela, imagem, caixa de texto, colunas), lido na conferência da chegada, para mostrar o aviso do estado 4.
- Erro novo `PDF_INDISPONIVEL` em `TEXTOS_ERRO`, com o texto acima.
- O .zip de “Baixar todos”, no resultado, depende da pergunta 2.

## Perguntas para a Carol

1. **Para modelo próprio do escritório, o PDF sai do mesmo texto num leiaute simples no timbrado, ou só oferecemos PDF para os modelos padrão?** **Recomendo o leiaute simples no timbrado, com o aviso curto.** O texto jurídico é o mesmo, e o escritório não fica sem PDF justamente nos documentos que mais usa. O aviso só aparece quando o modelo tem tabela ou imagem, e a saída “salve como PDF pelo Word” continua escrita. Só oferecer para os padrão deixaria o botão aparecendo e sumindo conforme o modelo, o que confunde.
2. **Os mesmos dois botões vão também para a lista de Procurações e modelos e para a página do resultado (e o “Baixar todos (.zip)” leva Word e PDF)?** **Recomendo que sim, com a mesma peça.** É a mesma pergunta em três lugares; ter o PDF só na ficha faria a mesma reclamação voltar. O .zip leva os dois formatos, em pastas Word e PDF.
3. **Depois de assinado, o Word e o PDF sem assinatura ficam escondidos numa lista que abre?** **Recomendo que sim.** O que vale é o assinado; deixar o PDF sem assinatura ao lado do assinado convida a mandar o papel errado ao cliente. Eles continuam a um toque, para quem precisa gerar uma versão nova.
4. **O PDF leva no rodapé a versão e a data em que foi gerado (“v2 · gerado em 21/11/2026”)?** **Recomendo que sim, em letra pequena.** Assim o papel impresso e assinado diz qual versão é, e quem anexa o assinado confere de olho. No Word, não entra nada: o escritório edita como quiser.
