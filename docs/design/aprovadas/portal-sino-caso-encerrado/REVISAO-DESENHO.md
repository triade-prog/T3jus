# Revisão do desenho · aviso no sino quando o caso fica pronto para encerrar no financeiro (F3.147)

Revisão independente feita em 23/11/2026, antes de o desenho ir para a Carol. Olhei as capturas de celular de oito estados (todos menos `sp-lido`) e a de computador do `sp-novo`; os outros estados no computador eu conferi pelo `index.html` no navegador, junto com o axe. Li também o `index.html` e o `_fonte/sino_caso.py`, e conferi contra o `PLANO.md` (v2), a `REVISAO.md` do plano, as `NOTAS.md`, o `docs/IDENTIDADE.md`, o `docs/design/conceito-gabinete.md`, o sino aprovado (`docs/design/aprovadas/portal-sem-avisos-sino`), a folha aprovada (`docs/design/aprovadas/portal-fechamento-sem-levantamento`, em especial `contrato-com-levantamento`) e o `sistema/packages/ui/src/portal/Sino.tsx`. Rodei o axe de novo (WCAG 2.0, 2.1 e 2.2, A e AA) em `sp-novo`, `sp-encerrado`, `sp-pendente`, `sp-fora` e `sp-denovo`, em 1440 e 390: nenhuma violação, como diz o `_conferencia.json`. Também li o nome acessível de cada link do aviso, o que o axe não julga.

## Veredito: aprovar com ajustes

O item é da mesma família do sino aprovado: o mesmo HTML e o mesmo CSS, ícone no círculo, título com o nome do caso em negrito (todo em negrito quando não lido, como os outros), detalhe, linha com "Novo", selo, hora e destino, faixa vinho à esquerda e ponto de não lido. A única peça nova, a linha "Agora:", é discreta, tem bom contraste (vinho `#692746` sobre `#FFFBF8`) e não depende de cor, porque o selo e a frase dizem o mesmo em palavras. Nenhum estado cita valor em reais (PT-02). Os nove estados do plano estão todos lá, com os motivos, o selo de cada `agora` e o destino `#t-fecha` do contrato. No celular, o texto quebra bem, sem rolagem lateral, e o destino desce para a linha de baixo quando não cabe, como o "Informar a base" do sino aprovado.

As diferenças em relação ao plano fazem sentido e eu as manteria:

- **Marina vê o `sp-novo`, e não o Diego.** Está certo: no fechamento aprovado foi o Diego quem registrou a parcela 6/6, e a regra da seção 2 tira o autor da ação de Financeiro.
- **`sp-varios` com 1 e 3 clientes**, já que o `sp-novo` mostra 2. Cobre os três casos de `clientes` e `maisClientes` sem estado a mais.
- **O número do contrato no destino** ("Ver o acerto no C-2026-012"). É melhor que no meio do detalhe, como estava no plano: encurta a frase e diz, antes do clique, qual contrato abre quando o caso tem mais de um.
- **"Ficou pronto de novo" no título.** É a primeira coisa que a pessoa lê e evita a frase longa no fim do detalhe.

Há, porém, um problema que faz o aviso dizer uma coisa falsa (ajustes 1 e 2) e outro que manda a pessoa procurar uma pendência que não existe mais (ajuste 3). Os três são de texto e de marcação, não de layout, e não pedem nova rodada de desenho completa: basta refazer as capturas dos estados afetados.

## Ajustes

### 1. O título diz "está pronto" quando o caso já não está

- **Problema:** o aviso não muda depois de gravado, mas o título está no presente. Em `sp-encerrado` o caso já foi encerrado; em `sp-pendente` voltou a ter pendência; em `sp-fora` saiu do escopo; e em `sp-denovo` o aviso antigo de 16/11 diz "está pronto" logo abaixo do aviso novo. A linha "Agora:" corrige embaixo, mas a frase em negrito em cima contradiz o selo.
- **Onde:** `sp-encerrado`, `sp-pendente`, `sp-fora` e o aviso de 16/11 do `sp-denovo`, nos dois tamanhos. Afeta também `sp-lido` se o caso mudar depois.
- **Correção:** escrever o fato no passado, que vale para sempre: "O caso **‹nome›** ficou pronto para encerrar no financeiro". O título do segundo período continua "ficou pronto de novo para encerrar no financeiro", e os dois ficam do mesmo molde. O plano (seção 3.2) diz que as palavras podem mudar; isto não muda regra nenhuma.

### 2. O leitor de tela não ouve o estado de agora

- **Problema:** o link do aviso é só o título. Com leitor de tela, quem navega pelos links ouve "Novo: O caso Carvalho x Construtora Lume está pronto para encerrar no financeiro" nos estados `encerrado`, `pendente` e `fora`, sem o selo nem a linha "Agora:" (conferi o nome acessível no `index.html`: nenhum `aria-describedby`). Nos outros tipos do sino isso basta, porque o selo não contradiz o título; neste tipo, o selo é a informação principal depois que o caso muda. É a WCAG 2.4.4 (finalidade do link pelo contexto) na prática, mesmo sem acusação do axe.
- **Onde:** `sp-encerrado`, `sp-pendente`, `sp-fora` e o aviso antigo do `sp-denovo`, nos dois tamanhos.
- **Correção:** quando houver `agora`, pôr dentro do link, depois do título, um trecho só para leitor de tela com o selo: `<span class="sr">. Agora: encerrado.</span>` (ou "voltou a ter pendência", "fecha pelo repasse"). Outra saída é `aria-describedby` apontando para a linha "Agora:". No `Sino.tsx`, isso pede que `descreverAviso` devolva também a linha de agora, não só `detalhe` e `selo`; anotar no plano para o Vitest cobrir.

### 3. "Ver o que falta" quando nada falta mais

- **Problema:** o `agora` é do período do aviso, como manda o plano. Em `sp-denovo`, o aviso de 16/11 mostra o selo de atenção "Voltou a ter pendência", "Agora: algo entrou no acerto depois deste aviso. Veja o que falta." e o destino "Ver o que falta no C-2026-009", mas o aviso logo acima diz que a pendência foi resolvida. Quem clica no antigo procura algo que não existe. O selo de atenção também puxa o olho para o aviso errado.
- **Onde:** aviso de 16/11 no `sp-denovo`, nos dois tamanhos; o mesmo texto aparece no `sp-pendente`.
- **Correção (sem mudar o plano):** escrever o `pendente` no passado e com destino neutro: "**Agora:** depois deste aviso, o acerto voltou a ter pendência." e destino "Ver o acerto no C-2026-009". A frase vale nos dois cenários: no `sp-pendente`, a folha de destino mostra o que falta; no `sp-denovo`, mostra o caso pronto. **Melhor ainda (pede uma linha no plano, seção 3.4):** quando existe um período mais novo do mesmo caso, o `agora` do aviso antigo vira `{ "depois": true }`, com selo neutro "Aviso antigo" e "Agora: o caso ficou pronto de novo; veja o aviso mais novo." É uma busca a mais pelo índice `(caso_id, pronto_em desc)`, que o plano já cria. Fica como sugestão para quem programar decidir com a revisão de código.

### 4. O aviso de outro caso é longo e confunde os dois casos

- **Problema:** o detalhe ocupa cinco linhas no celular, o maior de todos, e os dois casos têm quase o mesmo nome ("Martins x INSS · auxílio-doença" no título e "Martins x INSS · aposentadoria" no detalhe). Falta também a vírgula em "e neste nada falta receber".
- **Onde:** `sp-outro-caso`, celular (390) sobretudo.
- **Correção:** encurtar e pôr o contrato primeiro, como no plano: "Felipe Matos ligou o C-2026-007 ao caso Martins x INSS · aposentadoria, em andamento. As parcelas que faltam seguem com ele, e neste caso nada mais falta receber. Confira o acerto e encerre." Se a Carol responder não à pergunta 3, o estado sai inteiro.

### 5. O aviso de caso com levantamento usa palavra e destino diferentes da folha aprovada

- **Problema:** a folha de destino aprovada (`contrato-com-levantamento`) fala com a pessoa em "RPV" e "dinheiro de terceiros", e o título dela é "Fechamento do caso · só para ler", com o link "Ver o fechamento". O aviso diz "chegou um levantamento", o selo é "Com levantamento" e o destino é "Ver o contrato C-2026-004", diferente do "Ver o fechamento no …" do `sp-encerrado`, embora o link seja o mesmo `#t-fecha`.
- **Onde:** `sp-fora`, nos dois tamanhos.
- **Correção:** "**Agora:** entrou RPV ou alvará neste caso, e o fechamento passou para a ficha do repasse." Selo neutro "Fecha no repasse". Destino "Ver o fechamento no C-2026-004". Assim o aviso usa as palavras da tela onde a pessoa chega.

### 6. Pequenas diferenças entre as frases dos motivos

- **Problema:** o `REEMBOLSO` diz "Nada mais falta receber de Regina Souza", a `ROTINA` diz "Nada falta receber de Paulo Henrique Dias neste caso" e o `CASO_ENCERRADO` diz "nada falta receber de Rosângela Teixeira". São três formas para a mesma ideia. A frase do êxito "lançado e pago" ficou fora do desenho e só está descrita por molde nas notas.
- **Onde:** `sp-motivos`, nos dois tamanhos; `NOTAS.md`.
- **Correção:** um molde só, "nada falta receber de ‹cliente›", em todos (sem "mais", sem "neste caso"). Escrever nas notas a frase exata do êxito pago, para não ser inventada no código: "Bianca Torres registrou o pagamento do êxito de Sérgio Gomes. Confira o acerto e encerre."

### 7. Dois contratos, um só destino (só registrar)

- **Problema:** no `sp-novo`, "As 7 parcelas de Noemi Bastos Carvalho e Cláudio Carvalho" somam parcelas de dois contratos (C-2026-012 e C-2026-013), e o destino mostra só o C-2026-012. A regra do plano (EX-01, o de menor número) está certa, e a folha aprovada mostra o caso inteiro, mas isso não está dito nas notas.
- **Onde:** `sp-novo` e `sp-lido`, nos dois tamanhos; `NOTAS.md`.
- **Correção:** não mudar o desenho. Acrescentar às notas uma linha dizendo que, com mais de um contrato, o destino é o de menor número e a folha dele mostra o fechamento do caso inteiro, para a Carol não estranhar.

## O que está bom e não deve mudar

- A pergunta 4 aparece bem na tela: no `sp-encerrado`, o aviso segue "Novo" para a Bianca, e a linha "Agora:" diz quem encerrou e quando. "Confira o acerto e encerre." sai quando deixa de valer.
- Os selos usam os tons que o sino já usa, e o "Pronto" em contorno ok fica igual ao "Aprovado" aprovado.
- A ordem dentro de cada dia, os contadores do cabeçalho ("5 novos · 8 nos últimos 30 dias") e o filtro "Não lidos" batem com os avisos mostrados em todos os estados que conferi.
- Alvos de toque com 44 px ou mais, sem rolagem lateral, sem erro de script.
