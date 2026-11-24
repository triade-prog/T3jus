# Clientes: termo de tutela · notas

**Aprovado pela Carol em 24/11/2026 às 0h06 (Bahia)** ("ok"). Pergunta 1: sim, aos 18 anos o termo fica à vista em “Quem assinava com …”, só para baixar (estado `ficha-quem-assinava-termo`).

Item F3.140 do painel (termo de tutela como anexo na ficha do menor quando quem assina é tutora ou tutor; refs AP-01 e CH-08). Textos do plano `planos/F3.140-termo-tutela.md` (seção 3, com os ajustes da seção 9, que valem por cima). Em Gerar documentos, os textos partem do plano do F3.142 (seção 9, B1).

Parte dos desenhos aprovados em `docs/design/aprovadas/portal-responsavel-legal` (D25) e `docs/design/aprovadas/portal-termo-curatela` e não muda nada deles. As peças são as mesmas: a linha do arquivo (`rl-arq`), o botão **Baixar o termo**, o aviso do termo não guardado e o erro ao baixar.

Elenco fictício: **Davi Torres Lima**, 11 anos (nasceu em 02/05/2015), com a tia e tutora **Sônia Torres Lima**. Para os 18 anos, **Rafaela Nunes Torres** e a avó e tutora **Cleusa Nunes Torres**, do D25. Escritório Ribeiro & Matos, hoje 23/11/2026.

Abra o `index.html` e use o botão **Estados**. Capturas em computador (1440 px) e celular (390 px).

## Estados

| Estado | O que é |
|---|---|
| `novo-tutela` | Novo cliente menor com “É: Tutora”. Logo depois de “Mora com Davi”, a subseção nova **O termo de tutela** e a linha do arquivo escolhido. A caixa da data de nascimento não muda. Com Mãe ou Pai, nada disso aparece. |
| `ficha-tutela` | Ficha de Davi. Na folha **Quem assina por Davi**: o subtítulo da tutora, a linha do termo com **Baixar o termo**, a frase dos 16 anos (sem mudança) e, embaixo, o lembrete de juntar o termo. A lateral não muda. |
| `gerar-tutela` | Gerar documentos de Davi: o quadro com a linha **Termo de tutela na ficha**, o aviso do representado (F3.142) com a frase do termo e **Baixar o termo**, e a frase do termo na faixa do botão. |
| `gerar-tutela-falta` | O mesmo, com o CPF e o RG de Sônia faltando: o quadro tracejado com a falta e depois a linha do termo, o aviso de atenção com **Completar na ficha** e **Baixar o termo**, e a faixa sem “Em todos” e com a frase do termo. |
| `fez-18-janela-tutela` | A janela dos 18 anos de Rafaela, com a frase a mais **“O termo de tutela também fica guardado.”** |
| `ficha-quem-assinava-termo` | **Pergunta 1: sim (Carol, 24/11/2026).** Ficha de Rafaela depois de “Salvar: Rafaela assina por si”: em **Quem assinava com Rafaela**, a linha do termo, só para baixar e sem o lembrete de juntar. A recomendação é sim. |

**Marca de desenho.** A nota tracejada no alto de cada captura, o contorno tracejado com o selo **“Novo”** e o sublinhado tracejado nas frases novas mostram o que muda em relação ao aprovado. **Nada disso vai para o produto.**

**O que não muda** fica como nos desenhos aprovados, com os nomes trocados. Onde o produto já usa a forma com “(a)” da pergunta 7 do D25 (a frase dos 16 anos na folha, os avisos do F3.142), o desenho segue o produto.

## Textos exatos

“Davi” e “Sônia” estão no lugar do primeiro nome do cliente e de quem assina.

### 1. Formulário (novo e editar), no painel “Menor de 18 anos”

Só com “É: Tutora” ou “É: Tutor”, logo depois de “Mora com Davi”.

- Subtítulo: **“O termo de tutela”**, com o texto menor **“O papel que mostra quem é a tutora ou o tutor. Vai junto com a procuração. Não pedimos o motivo da tutela nem documentos dos pais.”**
- Linha do arquivo, vazia:
  - **“Termo de tutela (opcional)”**;
  - **“PDF ou foto, até 10 MB. Fica guardado na ficha, só para o escritório.”**;
  - botão **“Escolher arquivo: termo de tutela”**.
- Linha do arquivo, escolhida ou já guardada: o nome do arquivo (no desenho, **“termo-tutela-davi.pdf”**), **“PDF · 380 KB”** e o botão **“Trocar arquivo: termo de tutela”**.
- A caixa “Por que pedimos a data de nascimento.” não muda.
- **Só nas notas, sem captura** (a peça é a da curatela, com a palavra trocada): os erros do arquivo ficam presos ao campo e fora do resumo de erros, com os textos que já existem: **“Tipo não aceito. Envie PDF, JPG ou PNG.”**, **“Tem 12,4 MB; o limite é 10 MB por arquivo. Diminua a resolução da digitalização e envie de novo.”** (o número é o do arquivo) e **“O arquivo está vazio.”**
- Com 18 anos ou mais pela data, a conta do formulário já diz que o cliente assina por si, e o campo do arquivo não aparece.

### 2. Ficha, folha “Quem assina por Davi”

- Subtítulo da folha:
  - tutora, representado: **“Tutora de Davi. Vai na procuração e no contrato, e assina por Davi.”** (é o que está na captura);
  - tutor: **“Tutor de Davi. Vai na procuração e no contrato, e assina por Davi.”**;
  - assistido: **“… e assina com Davi.”**
  - A ajuda aprovada do formulário, “Tutor é quem o juiz nomeou.”, não muda.
- Linha do termo, entre os dados e a frase dos 16 ou dos 18 anos:
  - **“Termo de tutela”**;
  - **“termo-tutela-davi.pdf · enviado por Paula Nunes em 18/11”**;
  - botão **“Baixar o termo”**.
- Lembrete, numa segunda frase de regra (ícone de documento) logo abaixo da frase dos 16 ou dos 18 anos: **“Ao gerar, lembre de juntar o termo de tutela à procuração.”** Aparece com ou sem termo guardado, só quando o cliente é representado ou assistido e quem assina é tutora ou tutor.
- Tutela sem termo: só a linha do termo some. O caminho para mandar é “Mudar”.

### 3. Aviso do termo não guardado, depois de salvar (só nas notas)

A mesma peça de `ficha-termo-falhou` da curatela: o aviso de feito no tom de atenção, embaixo à direita no computador e acima da barra de baixo no celular, com o X e sem sumir sozinho. A folha aparece sem a linha do termo.

- Título no cadastro: **“Davi Torres Lima cadastrado.”**; na edição: **“Ficha salva.”**
- Texto, uma frase fixa por caso:

| Caso | Código que chega | Texto do aviso |
|---|---|---|
| Arquivo recusado | conferência no navegador, ou `VALIDATION_ERROR` no envio | O termo de tutela não foi guardado: o arquivo precisa ser PDF ou foto, até 10 MB. Mande de novo em “Mudar”, na folha Quem assina por Davi. |
| Sem conexão ou servidor fora | falha de rede, `ARQUIVO_NAO_CHEGOU`, `UPSTREAM_UNAVAILABLE` | O termo de tutela não foi guardado: não deu para falar com o T3jus. Mande de novo em “Mudar”, na folha Quem assina por Davi. |
| Já não é tutela | motivo `CLIENTE_NAO_TUTELA` | O termo de tutela não foi guardado: hoje, na ficha, ninguém assina por Davi como tutora ou tutor. |
| Sessão encerrada | `UNAUTHORIZED` | O termo de tutela não foi guardado: sua sessão terminou. Entre de novo para enviar o termo. |
| Sem permissão | `FORBIDDEN` | O termo de tutela não foi guardado: o seu acesso não permite enviar o termo. Fale com quem cuida dos acessos. |
| Outro erro | qualquer outro | O termo de tutela não foi guardado: algo deu errado do nosso lado. Mande de novo em “Mudar”, na folha Quem assina por Davi. |

Textos de feito na edição, quando o termo sobe (só nas notas):

- ficha e termo mudaram: **“A mudança ficou no histórico, com seu nome e os campos alterados. O termo de tutela ficou guardado na ficha.”**;
- só o termo mudou: **“O termo de tutela ficou guardado na ficha.”**

### 4. Erro ao baixar o termo (só nas notas)

A mesma peça de `ficha-baixar-erro` da curatela, logo abaixo da linha do termo na folha, ou logo abaixo do aviso em Gerar documentos:

- título **“Não deu para baixar o termo.”**;
- texto do erro: o de `textoDoErro`, sem mudança (por exemplo, **“Não deu para falar com o T3jus agora. Confira a sua internet e tente de novo em instantes.”**);
- o botão **Baixar o termo** continua: tentar de novo é clicar nele outra vez.

### 5. Gerar documentos (sobre o aviso do menor do F3.142)

Os textos partem sempre das frases do F3.142, conferidas no PR #157: `avisoDoMenor`, `avisoFaltaQuemAssina`, `linhaFaltaNoQuadro` e a faixa `fraseDaFaixaGerar`, em `sistema/packages/ui/src/portal/procuracoes.ts`. A frase do termo vai **no fim** do texto do aviso que estiver na tela, e **Baixar o termo** vai nas ações dele, ao lado de “Completar na ficha” (`Procuracoes.tsx`). Na faixa, “Junte o termo de tutela à procuração.” entra depois do que `fraseDaFaixaGerar` devolve e antes de “Cada geração fica registrada, com quem gerou e quando.”

**`gerar-tutela`** (Davi, 11 anos; 3 documentos):

- quadro “Quem assina por Davi”: **“Sônia Torres Lima”**, **“Tutora · CPF 236.914.058-51”** e, na segunda linha, **“Termo de tutela na ficha”** (sem “· processo …”, porque o menor não guarda processo);
- aviso `info`, título: **“Davi tem 11 anos hoje: é representado(a).”**;
- aviso, texto: **“Só Sônia assina, em nome de Davi, os três documentos. Em 02/05/2031, aos 16 anos, Davi passa a ser assistido(a), e os dois assinam. O T3jus faz a conta pela data de nascimento, no dia de gerar. Junte uma cópia do termo de tutela à procuração: ele está na ficha, para baixar.”**, com o botão **“Baixar o termo”**;
- faixa do botão: **“Nenhum dado sai marcado. Em todos, Sônia assina por Davi. Junte o termo de tutela à procuração. Cada geração fica registrada, com quem gerou e quando.”**

**`gerar-tutela-falta`** (faltam o CPF e o RG de Sônia):

- quadro tracejado, nesta ordem: **“Tutora”**, **“Faltam o CPF e o RG dela”**, **“Termo de tutela na ficha”**;
- aviso de atenção, título: **“Faltam 2 dados de quem assina por Davi: o CPF e o RG de Sônia.”**;
- aviso, texto: **“Dá para gerar assim: os três documentos saem com [CPF DE QUEM ASSINA: falta] e [RG DE QUEM ASSINA: falta], para preencher à mão ou no Word. Ou complete a ficha antes. Junte uma cópia do termo de tutela à procuração: ele está na ficha, para baixar.”**;
- ações: **“Completar na ficha”** (aba nova, com “(abre numa aba nova)” para leitor de tela, como no F3.142) e depois **“Baixar o termo”**;
- faixa: **“2 dados saem marcados em cada um: o CPF e o RG de Sônia. Junte o termo de tutela à procuração. Cada geração fica registrada, com quem gerou e quando.”** (sem “Em todos”).

**Sem termo na ficha** (`gerar-tutela-sem-termo`, só nas notas): a última frase do aviso fica **“Junte uma cópia do termo de tutela à procuração.”**, sem botão, e o quadro não tem a linha “Termo de tutela na ficha”. A faixa continua com “Junte o termo de tutela à procuração.”

**Assistido com tutora ou tutor** (só nas notas; a mesma ficha de Davi a partir de 02/05/2031):

- título: **“Davi tem 16 anos hoje: é assistido(a).”**;
- texto: **“Os dois assinam os três documentos: Davi e a tutora, Sônia, que o(a) assiste. Em 02/05/2033, aos 18 anos, Davi passa a assinar sozinho(a). Junte uma cópia do termo de tutela à procuração: ele está na ficha, para baixar.”** (com tutor: “e o tutor, …”);
- faixa: **“Nenhum dado sai marcado. Em todos, Davi e Sônia assinam. Junte o termo de tutela à procuração. Cada geração fica registrada, com quem gerou e quando.”**

Com 18 anos (`gerar-fez-18` do D25), nada de termo: o aprovado não muda. O texto dos documentos gerados também não muda neste item (a qualificação não diz “conforme termo de tutela anexo”; isso foi para o F3.119).

### 6. Aos 18 anos

- **Janela “Rafaela agora assina por si”** (`fez-18-janela-tutela`). A frase do alto, como está no produto, ganha uma frase no meio quando há termo de tutela: **“Cleusa sai de “Quem assina” e fica na ficha, com a data. Nada é apagado. O termo de tutela também fica guardado. Os documentos gerados antes continuam como estavam.”** O resto da janela não muda.
- **Folha “Quem assinava com Rafaela”** (`ficha-quem-assinava-termo`, se a pergunta 1 for sim), depois dos dados:
  - **“Termo de tutela”**;
  - **“termo-tutela-rafaela.pdf · enviado por Paula Nunes em 08/07”**;
  - **“Baixar o termo”**;
  - sem o lembrete de juntar. O subtítulo aprovado (“Até 18/11/2026. Fica guardado, mas não entra nos documentos novos.”) já diz o que é.

## Acessibilidade

- A linha do termo é um grupo (`role="group"`) com o nome que vem do título da linha (“Termo de tutela”, ou o nome do arquivo no formulário). O ícone é decorativo (`aria-hidden`).
- O nome dos botões do formulário diz de que termo se trata (“Escolher arquivo: termo de tutela”, “Trocar arquivo: termo de tutela”), como na curatela.
- O aviso de Gerar documentos é `role="status"`, como o do F3.142; não entra outro `aria-live` em volta. “Completar na ficha” diz, para leitor de tela, que abre numa aba nova.
- O erro ao baixar e o aviso do termo não guardado seguem a curatela: `role="alert"` recriado a cada falha e apontado pelo botão com `aria-describedby`; `role="status"` já presente na página antes do texto entrar.
- A borda tracejada do quadro com falta não carrega sozinha a informação: a linha “Faltam o CPF e o RG dela” diz o mesmo.
- Conferência (`_conferencia.json`, axe-core 4.10 com WCAG 2.0, 2.1 e 2.2, A e AA): **nenhuma violação** nos 6 estados, nos dois tamanhos; **sem rolagem lateral** em nenhum; **alvos de 44 px ou mais**. Exceções iguais às dos desenhos aprovados: a marca T3jus do menu (204 × 24 px) e, só no computador, o botão compacto da linha do arquivo (“Baixar o termo”, “Trocar arquivo”) e do quadro (“Mudar na ficha”), com 36 px; no celular eles ocupam a linha toda e têm 44 px.

## Como gerar

`sh _fonte/gerar.sh .` (com `AXE_PW` apontando para `@axe-core/playwright` e `NODE_PATH` para onde está o `playwright`). As fontes são cópias sem mudança das do desenho `portal-termo-curatela`; `termo.py` lê `responsavel.py` até o começo dos estados e acrescenta só as peças com o prefixo `tt-` (mais a regra `rl-termo-ficha`, igual à do produto). No celular, a linha do termo na folha usa a margem do produto (16 px), e não a de 24 px da captura da curatela.

## Para decidir

1. **Aos 18 anos, o termo de tutela fica à vista em “Quem assinava com Rafaela”, para baixar, ou só guardado, sem aparecer?** (pergunta 1 do plano) **Recomendo à vista, só para baixar, sem o lembrete de juntar** (estado `ficha-quem-assinava-termo`). A tutela acabou, mas o termo prova que a procuração e o contrato assinados pela tutora valeram, e o caso costuma seguir depois dos 18. Fica com a mesma proteção, e cada abertura vai ao histórico. Com “só guardado”, o estado sai e nada mais muda. **Decidido: sim, à vista, só para baixar (Carol, 24/11/2026).**
2. O texto do inventário com o termo de tutela (pergunta 2 do plano) não é tela e não está neste desenho; segue no plano.
