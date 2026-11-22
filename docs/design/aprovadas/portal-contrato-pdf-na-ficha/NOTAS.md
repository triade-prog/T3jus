# Baixar o contrato na ficha · notas

> **Aprovado pela Carol em 22/11/2026 às 19h24 (Bahia), com as 5 recomendações (D29).** Ela abriu a aba Contrato da ficha (`/contratos/contratos/:id`) e não achou onde baixar o contrato em PDF.

O download existe e foi aprovado no D23 (`docs/design/aprovadas/portal-contrato-pdf`), mas mora só na aba Documentos, documento por documento, no grupo “Baixar: Word | PDF”. Quem abre a ficha cai na aba Contrato e não vê nada disso. Este desenho **acrescenta uma linha ao cabeçalho vinho da ficha**, que aparece nas três abas (Contrato, Recebimentos, Documentos). O resto da ficha (caixa âmbar à direita, abas, Condições de honorário, Casos, Responsáveis, Assinatura, Situação) é o aprovado, sem mudança. A aba Documentos continua como no D23.

Também corrige a trilha do topo, que hoje repete “Contratos”.

Atende CH-08 (em parte, como os pacotes aprovados) e CH-01 (o contrato e o assinado à mão na ficha). Pesam também PT-03 (versões e assinados guardados), PT-07 (arquivos privados, link temporário) e PT-10 (WCAG 2.2 AA, celular, erro).

## Como abrir

- `index.html` mostra os 5 estados lado a lado, computador (1440 px) e celular (390 px), com o rótulo e o que cada um mostra, e a trilha antes e depois. Clique numa imagem para abrir o HTML naquele estado.
- `ficha-pdf.html?estado=gerado` (ou `assinado`, `preparando`, `erro`, `sem-documento`) abre sozinho. Abaixo de 760 px vira a versão de celular. “Ver todos os documentos” e a aba Documentos levam ao desenho D23, na pasta vizinha `../contrato-pdf/`.
- `_fonte/`: `sh _fonte/gerar.sh <pasta>` refaz tudo. `comum.py`, `pecas.py`, `contratos.py`, `procuracoes.py`, `peticoes_css.txt` e `contrato_pdf.py` são cópias sem mudança do pacote D23; `ficha_pdf.py` carrega o `contrato_pdf.py` e acrescenta as peças novas, com o prefixo `fp-`; `index_ficha.py` monta o índice; `fotos.cjs` (o do D23, que agora também confere o índice sem capturá-lo) faz as capturas com deviceScaleFactor 2 e roda o axe.
- Dados fictícios do elenco aprovado: Farmácia Bom Jesus Ltda. (C-2026-019, Felipe Matos) nos estados 1 a 4 e Irene Castro (C-2026-021, Marina Ribeiro) no 5. “Hoje” é 21/11/2026.

## O que muda

1. **Uma linha nova no cabeçalho vinho, abaixo do selo de situação**, separada por um fio #87335B: o rótulo **“Baixar o contrato”** e os dois botões colados **Word** e **PDF**, a mesma peça do D23 (`BaixarWordPdf`), em branco sobre o vinho. Embaixo, em letra pequena, qual versão sai (“v1 · gerado em 01/09/2026”) e o link **“Ver todos os documentos”**, que abre a aba Documentos.
2. **Sai sempre o contrato de honorários da versão mais recente gerada.** A procuração e a declaração continuam só na aba Documentos.
3. **Com o assinado anexado**, a linha vira **“Contrato assinado”** com um botão só, **“Baixar o assinado (PDF)”** (ou “(foto)”), o arquivo como foi anexado, com o nome e a data embaixo. O Word e o PDF sem assinatura ficam na aba Documentos, na lista que abre do D23 (decisão 3 de lá).
4. **Sem contrato gerado**, a linha diz “O contrato ainda não foi gerado no T3jus.” e oferece **“Gerar o contrato”**, que abre `/contratos/modelos/gerar?contrato=<id>` com o contrato já escolhido. Embaixo: “Sai em Word e PDF, com os dados do cliente e do contrato.”
5. **Trilha:** “Contratos › C-2026-019”, no lugar de “Contratos › Contratos › C-2026-019”. O primeiro “Contratos” leva à lista de contratos.

## Estados

| Estado | O que mostra |
|---|---|
| `gerado` | Contrato ativo, com o contrato gerado (v1) e sem o assinado anexado: “Baixar o contrato” com Word e PDF, “v1 · gerado em 01/09/2026” e “Ver todos os documentos”. Na folha Assinatura, “Arquivo assinado: Ainda não anexado. Anexar o assinado” |
| `assinado` | O mesmo contrato com `contrato-assinado.pdf` anexado: “Contrato assinado” e “Baixar o assinado (PDF)”, com “contrato-assinado.pdf · anexado em 02/09/2026” e o link para os documentos |
| `preparando` | O botão PDF vira “Preparando o PDF”, com o indicador girando, e uma linha embaixo diz “Preparando o PDF do contrato. Leva alguns segundos; o arquivo baixa sozinho. Pode continuar na tela.” O Word segue livre |
| `erro` | “Não deu para preparar o PDF do contrato.” / “Nada mudou no contrato, e o Word continua para baixar. Tente de novo; se não sair, abra o Word e use Arquivo › Salvar como › PDF.”, com **Tentar de novo** e **Baixar o Word**; código `PDF_INDISPONIVEL` |
| `sem-documento` | Irene Castro, ativo, sem contrato gerado nem assinado anexado: “O contrato ainda não foi gerado no T3jus.” e **Gerar o contrato** |

## Decisões de design

1. **No cabeçalho, não na aba Contrato.** O cabeçalho aparece nas três abas, é o primeiro bloco que se lê e fica ao lado do nome do cliente e do número, que é o que identifica o arquivo. Um quadro dentro da aba Contrato resolveria só aquela aba, e a pergunta “onde baixo o contrato?” vale em todas. O vinho tinha espaço vazio abaixo do selo (a altura do cabeçalho é a da caixa âmbar), então a linha nova quase não aumenta a ficha no computador.
2. **Não na caixa âmbar.** A caixa da direita é o “Próximo passo” ou o “Próximo recebimento” e muda com a situação do contrato. Pôr o download ali o faria aparecer e sumir conforme a situação, e a caixa teria dois botões principais disputando.
3. **A mesma peça do D23, com o mesmo peso para Word e PDF.** Dois botões visíveis, não um menu (D23, decisões 1 e 2). Sobre o vinho, os botões são brancos com texto vinho: é o par branco e vinho (10,6:1) ao contrário, e o branco se destaca bem do fundo. Nenhum dos dois vira botão principal, porque o principal da ficha continua na caixa âmbar.
4. **Só o contrato, não os três documentos.** O cabeçalho é do contrato; a procuração e a declaração seguem na aba Documentos, que o link “Ver todos os documentos” abre. Assim a linha cabe numa faixa e não vira uma segunda lista.
5. **Depois de assinado, só o assinado.** Coerente com o D23: o que vale é o assinado, e o PDF sem assinatura ao lado convida a mandar o papel errado ao cliente.
6. **Preparando e erro presos à linha, no cabeçalho.** Como no D23, o aviso fica junto de onde se clicou, e não no topo da página. O aviso de erro é a folha branca aprovada (`aviso-urgencia`), que se lê sobre o vinho sem mudar nenhuma cor.
7. **Sem contrato gerado, oferecer gerar.** A linha fica no mesmo lugar em todos os contratos, então a pessoa aprende onde mora o arquivo. Só aparece quando a pessoa pode gerar (`podeGerar`) e o contrato não está encerrado (pergunta 2).
8. **No celular**, a linha ocupa a largura toda: o rótulo numa linha, Word e PDF meio a meio com 44 px de altura, e embaixo a versão e o link. Fica acima da caixa âmbar, como o resto do cabeçalho.

## Acessibilidade (WCAG 2.2 AA)

- **axe** (WCAG 2.0, 2.1 e 2.2, A e AA) nas 10 capturas (5 estados × computador e celular) e no `index.html` (1440 e 390): **nenhuma violação**. Nenhuma tela tem rolagem lateral; nenhum erro de script. O resultado fica em `_conferencia.json`.
- **Alvos:** no celular, todos com 44 px ou mais. No computador, Word e PDF são compactos (36 px), como no aprovado, e o link “Ver todos os documentos” tem 44 px. A única exceção é a palavra-marca “T3jus” da moldura aprovada (24 px), já registrada. No índice, os links das imagens aparecem com 24 px só porque as imagens carregam depois; com elas, têm a altura da captura.
- **Contraste sobre o vinho**, só pares aprovados do Gabinete: rótulo em sal #F1E6DF (8,65:1); versão e data em #E9AE90 (5,52:1); link e ícones em #F2CDB3 (7,15:1); botões brancos com texto vinho (10,6:1); fio em #87335B, só decorativo. O código do erro, em #E9AE90.
- **Foco:** sobre o vinho, o contorno #AC3F6B do aprovado some (1,9:1 contra o vinho). Por isso, dentro do cabeçalho, o contorno de 3 px passa a #F2CDB3 (7,15:1 contra o vinho). Dentro do aviso branco de erro volta o #AC3F6B. No grupo colado, o botão em foco sobe por cima do vizinho, como no D23.
- **Nomes:** os dois botões ficam num `role="group"` com o nome “Baixar o contrato, v1 · gerado em 01/09/2026”; cada botão diz ao leitor de tela o formato e para que serve (“Baixar o contrato em Word (.docx, para editar)”, “Baixar o contrato em PDF (para mandar ou imprimir)”). O texto visível está dentro do nome (2.5.3). “Baixar o assinado (PDF)” aponta a linha do arquivo com `aria-describedby`.
- **Carregando:** `aria-disabled="true"` (não `disabled`, para o foco ficar no botão) e `aria-describedby` apontando a linha de situação (`role="status"`); com movimento reduzido, o indicador para de girar.
- **Erro:** `role="alert"`, com as ações dentro do aviso; no sistema, o foco vai para “Tentar de novo” quando o aviso aparece.
- **Trilha:** o último item continua com `aria-current="page"`.

## O que precisa no servidor

Quase nada: a ficha já busca `GET /v1/escritorio/contratos/:id/documentos` (`DocumentosDoContrato`) e o PDF já sai por `POST …/documentos/:id/abrir?formato=pdf` (D23).

- **Qual documento:** o de `tipo` contrato com o maior número de versão em `documentos`. Se ele tiver `assinado`, a linha mostra “Baixar o assinado”, que abre o anexo por link temporário (PT-07).
- **Assinado registrado na folha Assinatura, sem documento gerado** (contratos que vieram da planilha ou foram assinados antes do T3jus): a linha usa o arquivo mais novo de `GET /v1/escritorio/contratos/:id/anexos`, o mesmo que a folha Assinatura mostra (pergunta 3).
- **Gerar o contrato:** só com `podeGerar` verdadeiro e o contrato fora de `ENCERRADO`. Sem documento, sem assinado e encerrado, a linha não aparece.
- **Trilha:** em `MolduraArea`, quando o nome da seção é igual ao da área (Contratos › Contratos), a trilha mostra só um “Contratos”, que leva à lista da seção (`/contratos/contratos`), e depois o número.
- Nenhuma rota nova, nenhum erro novo: `PDF_INDISPONIVEL` já existe desde o D23.

## Perguntas para a Carol

1. **A linha “Baixar o contrato” fica no cabeçalho vinho, visível nas três abas, ou só num quadro dentro da aba Contrato?** **Recomendo o cabeçalho.** Ele é o primeiro bloco que se vê em qualquer aba e já tinha espaço sobrando abaixo do selo. Um quadro na aba Contrato desceria para baixo das Condições de honorário no celular e repetiria o problema nas outras abas.
2. **Quando o contrato ainda não tem documento gerado, a linha mostra “Gerar o contrato” ou some?** **Recomendo mostrar “Gerar o contrato”**, quando a pessoa pode gerar e o contrato não está encerrado. A linha fica sempre no mesmo lugar, a pessoa aprende onde mora o arquivo e não sai procurando. Em contrato encerrado sem documento, a linha some, porque não há o que gerar.
3. **Se o assinado foi anexado direto na folha Assinatura (sem documento gerado no T3jus), o cabeçalho também oferece “Baixar o assinado”?** **Recomendo que sim.** Para quem lê a ficha, é o mesmo contrato assinado, não importa por onde entrou. É o caso dos contratos que vieram da planilha.
4. **Depois de assinado, o cabeçalho mostra só “Baixar o assinado”, sem o Word e o PDF sem assinatura?** **Recomendo que sim**, como no D23. O que vale é o assinado; o Word e o PDF sem assinatura continuam na aba Documentos, a um clique, pelo link “Ver todos os documentos”.
5. **Na aba Documentos, a linha do cabeçalho continua aparecendo, mesmo repetindo o contrato da lista?** **Recomendo que sim.** O cabeçalho é o mesmo nas três abas; tirar a linha numa delas faria a ficha mudar de forma ao trocar de aba, e a repetição é de um item só.
