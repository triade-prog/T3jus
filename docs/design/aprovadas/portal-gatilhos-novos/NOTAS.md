# Automações: gatilhos Cliente novo e Documento pendente · notas

> **Aprovado pela Carol em 21/11/2026, às 12h06 (Bahia).** Ela respondeu "pode seguir o recomendado": as 9 recomendações das perguntas do fim valem como decisões.

Acréscimo pequeno ao desenho aprovado de **Conversas › Automações** (`docs/design/aprovadas/portal-conversas-automacoes/`, aprovado em 19/11/2026). Atende a ideia **PA-06** (Carol pediu em 21/11/2026), sobre PA-03. O NOTAS.md aprovado deixou esses dois gatilhos pendentes (linhas 3 e 145).

- **Cliente novo:** quando alguém vira cliente do escritório. Serve para a mensagem de boas-vindas.
- **Documento pendente:** quando um documento pedido ao cliente na ficha do caso não chega em alguns dias. Serve para lembrar o cliente do que falta.
- A IA que monta fluxos usa os dois. Os chips "Boas-vindas ao cliente novo" e "Cobrar documento que falta" da janela "Pedir à IA" aprovada passam a levar a estes gatilhos.

O editor, o tracejado da IA, testar, ligar, histórico, os limites e o celular continuam como foram aprovados. Só entram o que os dois gatilhos pedem e uma linha na ficha do caso do Jurídico. As peças novas têm o prefixo `gn-`. O elenco e o "hoje" são os de sempre: Ribeiro & Matos, Marina Ribeiro como sócia dona, quarta-feira, 18/11/2026, às 10h12.

## Como abrir

- `index.html` mostra os 11 estados em computador (1440) e celular (412), com legenda. Clique numa imagem para abrir o HTML naquele estado.
- `gatilhos.html` e `juridico-lembrete.html` abrem sozinhos, com as fontes, o CSS e os ícones embutidos. O estado vem do endereço:
  - `gatilhos.html?estado=` com `escolher`, `cliente-gatilho`, `cliente-sugestao`, `cliente-testar`, `cliente-ligar`, `doc-gatilho`, `doc-mensagem`, `doc-testar`, `doc-ligar` ou `erros`;
  - `juridico-lembrete.html?estado=ficha`.
- Abaixo de 760 px, o HTML vira a versão de celular, com a barra embaixo. Funcionam a janela "Nova automação" (abre, fecha, Esc), o Mais e o "Mostrar no desenho". O resto é desenho.
- A pasta `_fonte/` guarda os scripts, e `sh _fonte/gerar.sh` refaz tudo:
  - `comum.py`, `extra.py`, `conversas.py`, `automacoes.py` e `juridico.py` são cópias **sem mudança** dos aprovados;
  - `gatilhos.py` lê o `automacoes.py` até o começo dos estados e desenha os estados novos;
  - `juridico_doc.py` lê o `juridico.py` do mesmo jeito e só troca o item "Falta" da folha Documentos e a nota do pé;
  - `casos.py` gera a lista de estados e o `index.html`;
  - `fotos.cjs` (o aprovado, sem mudança) faz as capturas e roda o axe; `webp.py` converte para WebP;
  - para o axe, use `AXE_PW=<caminho>/node_modules/@axe-core/playwright sh gerar.sh ..`.
- Todos os dados são fictícios. O envio pelo WhatsApp ainda espera a Meta: tudo aqui é desenho e simulação, nada é enviado.

## Os estados

| Estado | O que mostra |
|---|---|
| `gn-escolher` | "Nova automação": nome e "Quando começa", com os gatilhos agrupados por área. Cliente novo (em Clientes, que todos veem) e Documento pendente (no Jurídico) têm o selo "Novo" |
| `gn-cliente-gatilho` | O bloco do gatilho Cliente novo aberto: quem conta como cliente novo, quando sai, quem nunca recebe, os campos e os caminhos |
| `gn-cliente-sugestao` | A boas-vindas que a IA monta a partir do chip, com 4 passos tracejados e o assistente |
| `gn-cliente-testar` | A simulação com Paulo Saraiva e "Quem teria entrado" nos últimos 30 dias |
| `gn-cliente-ligar` | A frase de Ligar e os limites |
| `gn-doc-gatilho` | O bloco do gatilho Documento pendente aberto: os dias, as regras fixas, os campos e os caminhos |
| `gn-doc-mensagem` | O fluxo do lembrete, com 3 ramos, e a mensagem aberta. A prévia junta 2 documentos numa mensagem só |
| `gn-doc-testar` | A simulação com a CTPS de Carlos e "Quem entraria" hoje |
| `gn-doc-ligar` | Quem entra (só os novos ou também os já pendentes) e o limite semanal |
| `gn-erros` | A boas-vindas com o campo {documentos}, que esse gatilho não tem |
| `gn-juridico` | A ficha do caso aprovada, com uma linha em cada documento que falta |

## Decisões de design

### Escolher o gatilho

1. **A janela "Nova automação" agrupa os gatilhos por área.** O sistema já tem essa janela (nome e "Quando começa"), mas ela ainda não tinha desenho aprovado. Os gatilhos vêm agrupados, com um rótulo de área:
   - **Clientes**, que toda a equipe vê: Cliente novo;
   - **Jurídico:** Documento pendente, Etapa do caso e Lembrete de audiência;
   - **Financeiro:** Parcela em atraso, Parcela vai vencer, Pagamento recebido e Prestação de contas.

   Cada opção traz uma frase simples de quando ela começa. Os dois gatilhos novos levam o selo "Novo", em texto, e o ícone em campo âmbar. A pessoa só vê os gatilhos das áreas que tem; quem não tem o Jurídico não vê "Documento pendente". No pé, um atalho leva para "Pedir à IA". A frase que o código mostra hoje ("Cliente cadastrado, caso encerrado e documento pendente chegam depois") sai. Fica para depois só "caso encerrado".
2. **Dois ícones vêm do conjunto aprovado:** "pessoa com +" para Cliente novo e "documento" para Documento pendente. Nenhum ícone novo foi desenhado.

### Cliente novo

3. **O painel do gatilho tem cinco partes:**
   - **quem conta como cliente novo** (pergunta 1);
   - **quando sai:** no mesmo dia (recomendado) ou de 1 a 30 dias depois. Fora das 8h às 20h, ou fora de dia útil, a mensagem sai no próximo dia útil, às 8h;
   - **quem nunca recebe**, com cadeado, porque é regra fixa: importados da planilha, reativados, quem pediu para não receber avisos e quem não tem WhatsApp no contato principal;
   - **os campos** {nome}, {quem atende}, {horário de atendimento} e {nome do escritório}, cada um com um exemplo;
   - **os caminhos dos Ramos:** só "Se respondeu" e "Não respondeu". Boas-vindas não cobra nada, então não tem "Se pagou".
4. **A boas-vindas sugerida pela IA é curta:** gatilho, condições, mensagem, esperar até 2 dias, e depois um ramo com dois caminhos:
   - **Se respondeu:** a IA conversa com o que está no T3jus;
   - **Não respondeu:** fim, e nada mais sai.

   Não há "passar para pessoa", porque uma boas-vindas sem resposta não precisa de ninguém. O assistente avisa que os 38 clientes da importação de 12/11 ficam de fora. Os ramos com dois caminhos usam a mesma regra visual dos três, em duas colunas.
5. **"Quem teria entrado" olha os últimos 30 dias,** porque boas-vindas só vale para quem entrar daqui em diante. Hoje não há uma fila de pessoas esperando, como na cobrança. A lista mostra quem entraria e quem ficaria de fora, cada um com o motivo:
   - os 38 da planilha;
   - Roberto, que foi reativado;
   - Tereza, que só fez o primeiro atendimento, com o selo "Ainda não";
   - um número fixo, com "Corrigir na ficha".
6. **No Ligar, "quem entra" não tem escolha.** Só entra quem virar cliente depois de ligar, e cada cliente recebe uma vez só, para sempre. Os limites de sempre ganham uma linha: "Uma boas-vindas por cliente".

### Documento pendente

7. **O painel do gatilho tem quatro partes:**
   - **os dias sem chegar:** de 1 a 30, com 5 como padrão, contados do pedido ou do último "Pedir de novo", o que for mais novo;
   - **as regras fixas:** uma mensagem por cliente com tudo o que falta; no máximo 1 lembrete por semana por cliente; se chegou, sai na hora; caso encerrado sai; o pedido "só cobrança" não tira o cliente deste lembrete;
   - **os campos** {nome}, {documentos}, {caso}, {pedido em} e {nome do escritório};
   - **os três caminhos:** "Se chegou", "Se respondeu" e "Nem chegou, nem respondeu".
8. **O campo é {documentos}, no plural.** Ele vira a lista do que ainda falta, numa frase: "carta de indeferimento do INSS e laudo médico atualizado". Se o cliente mandar uma parte, o lembrete seguinte só cita o resto. Um campo {documento}, no singular, não existe, para não ter dois jeitos de escrever a mesma coisa.
9. **"Se chegou" funciona como "Se pagou".** O documento conta como chegado quando alguém marca "Já chegou" na ficha do caso ou envia o arquivo ligado ao pedido. Aí o cliente sai da automação na hora, mesmo no meio da espera.
10. **Quando o cliente manda um arquivo pela conversa, nada se fecha sozinho.** A IA agradece, e quem pediu o documento recebe um aviso para conferir o arquivo e marcar "Já chegou". A IA não decide se o arquivo é o certo (pergunta 7).
11. **"Passar para pessoa" ganha a regra "Quem pediu o documento".** Ela usa o `pedido_por` do pedido. Se essa pessoa estiver fora ou tiver saído da equipe, a conversa vai para quem cuida do caso; sem ninguém, vai para a sócia dona (PD-07).
12. **A prévia mostra o caso mais difícil:** Antônia, com dois documentos faltando, recebe uma mensagem só, que vai para a filha, Joana Prado, o contato principal. O pedido dela é de "não receber avisos de cobrança", então o lembrete de documento sai mesmo assim.
13. **"Quem entraria" separa três situações:**
    - **"Já pendente hoje":** só entra se a sócia dona escolher isso ao ligar. Cada um traz o botão "Já chegou? Marcar no caso", para limpar a lista antes de ligar;
    - **"Entra amanhã":** a Vale Alto chega a 5 dias amanhã. A nota lembra que o combinado no Financeiro só vale para cobrança;
    - **"Espera":** Roberto, porque pediram de novo ontem e a contagem recomeçou.

### Erro e Jurídico

14. **O erro desenhado é a boas-vindas com {documentos}.** É o engano mais provável agora que os dois gatilhos convivem. O bloco ganha o filete e a frase do erro, que já existe no código (`CAMPO_INEXISTENTE`). O assistente oferece duas saídas: pedir à IA para corrigir ou criar o lembrete de documento.
15. **Na ficha do caso, só uma linha discreta.** Cada "Falta" ganha uma linha com o ícone de raio em tinta suave: "Lembrete automático enviado em 16/11. Se não chegar até 23/11, passa para Larissa Costa." A primeira linha traz o link "Ver a automação". A nota do pé passa a dizer que "Pedir de novo" recomeça a contagem. Sem a automação ligada, a ficha fica igual à aprovada. O exemplo supõe a automação ligada desde 09/11, só para os pedidos novos.

## Acessibilidade (WCAG 2.2 AA)

- **Conferência automática** em 22 capturas (11 estados × computador e celular), pelo `fotos.cjs` aprovado. O resultado completo fica em `_conferencia.json`:
  - o axe (WCAG 2.0, 2.1 e 2.2, A e AA) achou **0 violações**;
  - nenhuma tela tem rolagem lateral;
  - nenhum erro de script.
- **Alvos:** todos têm 44 px ou mais. A única exceção é a palavra-marca "T3jus" do trilho (24 px), que é da moldura aprovada, como no desenho aprovado.
- **Contraste:** só pares já aprovados:
  - o selo "Novo" é vinho sobre #F2CDB3 (7,15:1);
  - os campos são vinho sobre o sal #F2ECE8 (9,06:1);
  - a linha da ficha é tinta suave sobre branco, com o ícone em #87335B;
  - o selo "Já pendente hoje" é o de atenção do D2.
- **Nada depende só de cor:** "Novo", "Já pendente hoje", "Entra amanhã", "Espera" e "Ainda não" vêm escritos. As regras fixas têm cadeado e o texto "regra fixa".
- **Formulários:** os gatilhos ficam em `fieldset` com `legend` por área, como rádios com rótulo inteiro. O campo de dias tem rótulo e ajuda ligados por `aria-describedby`. O fluxo continua sendo um `<ol>` com os ramos em `<ul>`, como no aprovado.

## O que precisa de dado novo no servidor

Tudo segue o aprovado: `escritorio_id`, `proteger_tabela_escritorio`, escritório vindo da sessão e nada apagado. Nenhuma tabela nova.

| Onde | O que muda |
|---|---|
| `GATILHOS` (`packages/domain/src/automacoes.ts`) e o check de `automacoes.gatilho` | **`CLIENTE_NOVO`**: área CONVERSAS (pergunta 2), ícone `pessoa-mais`, dias `{min: 0, max: 30, padrao: 0}`, campos `nome`, `quem atende`, `horário de atendimento` e `nome do escritório`, ramos `RESPONDEU` e `NADA`. **`DOCUMENTO_PENDENTE`**: área JURIDICO, ícone `doc`, dias `{min: 1, max: 30, padrao: 5}`, campos `nome`, `documentos`, `caso`, `pedido em` e `nome do escritório`, ramos `CHEGOU`, `RESPONDEU` e `NADA`. Os dois entram em `ORDEM_GATILHOS` |
| `Quando` e `RAMOS_QUANDO` | Novo `CHEGOU` ("Se chegou"). Com Documento pendente, `NADA` vira "Nem chegou, nem respondeu" em `nomeDoRamo` |
| `RegraPessoa` | Nova `QUEM_PEDIU` ("Quem pediu o documento"), só para Documento pendente. Com Cliente novo, `QUEM_CUIDA` vira "Quem atende o cliente" e `AREA` não aparece |
| Passo do gatilho | Cliente novo guarda `conta` (`FECHOU` ou `CADASTRO`, pergunta 1) além de `dias` |
| `automacao_candidatos` (0340) | **Cliente novo:** a primeira proposta `ACEITA` ou o primeiro contrato assinado do cliente, depois de ligar. Ficam de fora clientes com `importacao_id`, reativados e quem já teve execução desta automação. **Documento pendente:** a origem é o **cliente**, e não o pedido. Entra o cliente com pedido `chegou_em is null`, em caso não encerrado, com `greatest(pedido_em, repedido_em) + dias <= hoje`. Com `entram_ja_atrasados` falso, só os pedidos que chegam aos dias depois de ligar |
| `automacao_pagou` → equivalente `automacao_chegou` | Verdadeiro quando todos os pedidos da execução têm `chegou_em`. Se chegou só uma parte, a execução segue com o que falta |
| `automacao_campos_execucao` | {documentos}: a lista do que falta, juntada com vírgula e "e". {pedido em}: o pedido mais antigo. {caso}: o caso, ou os casos juntos, quando o cliente tem falta em mais de um. {quem atende}: o responsável pela proposta ou pelo contrato. {horário de atendimento}: vem de `ia_config` (dias e horas) |
| Limite semanal | 1 lembrete de documento por semana por cliente, somando as automações e o "Pedir de novo" (que já grava `repedido_em`). Funciona como o limite da cobrança por parcela |
| `automacao_fica_de_fora` | Para documento, o pedido "só cobrança" não tira o cliente; o pedido "todos" tira |
| Conversas | Arquivo recebido do cliente numa execução de Documento pendente avisa quem pediu o documento (sino) para conferir o arquivo |
| Ficha do caso (`documento_pedido_linha`) | Ganha `lembrete`: quando saiu o último, quando passa e para quem, e o id da automação. Só aparece com a automação ligada |

### Para o painel

- A entrega que construir isto atende **PA-06**.
- Itens "pendente", citando PA-06:
  - o envio real depende da Meta, como em PA-03;
  - o gatilho "caso encerrado" continua fora.

## Perguntas para a Carol

1. **Quem conta como "cliente novo"?** **Recomendo: quem aceita a primeira proposta ou assina o primeiro contrato.** Clientes trazidos pela importação de planilha e clientes reativados **nunca** recebem boas-vindas. Senão, uma importação de 200 clientes manda 200 mensagens para gente que já é do escritório.

   Achei mais um ponto. No T3jus, o cadastro em Clientes também guarda quem só veio para o primeiro atendimento e ainda não fechou: a proposta é feita para um cliente já cadastrado. Se a boas-vindas saísse no cadastro, chegaria para quem só pediu orçamento. Por isso, o padrão é "fechou", e "é cadastrado em Clientes" fica como opção no gatilho, para o escritório que quiser. A outra opção seria fixar uma regra só, sem escolha.
2. **De qual área é o gatilho Cliente novo?** **Recomendo Conversas.** Clientes é uma área de todos, e a automação de Conversas já é a que toda a equipe vê. A mensagem não leva valor nem proposta, então não há nada a esconder. Comercial seria a outra opção, mas aí só quem tem o Comercial veria e montaria a boas-vindas, e um escritório sem Comercial ficaria sem ela.
3. **Documento pendente: um lembrete por documento, ou um só por cliente, juntando o que falta?** **Recomendo um só por cliente, com tudo o que falta**, mesmo de casos diferentes (a mensagem cita o caso de cada um). Quem tem três documentos faltando recebe uma mensagem, não três.

   E **"Pedir de novo" recomeça a contagem?** **Recomendo que sim.** "Pedir de novo" já é um lembrete feito à mão; mandar outro automático no dia seguinte seria demais.
4. **Limite: no máximo 1 lembrete de documento por semana por cliente?** **Recomendo que sim**, somando todas as automações e o "Pedir de novo", como a cobrança tem 1 por semana por parcela. Os limites fixos de 8h às 20h, em dia útil, continuam.
5. **Os dois viram automações prontas (como as seis), desligadas, ou ficam só como exemplos da IA e na lista de gatilhos?** **Recomendo que fiquem só na lista de gatilhos e como exemplos da IA**, sem pronta. As seis prontas vieram de avisos que já saíam, com texto já combinado. Boas-vindas e lembrete de documento são novos, e o texto é a cara de cada escritório. Uma pronta desligada também ocuparia a lista sem fazer nada. O jeito mais curto continua sendo um clique: o chip da IA monta o fluxo inteiro.
6. **No dia de ligar, os documentos já pedidos e atrasados entram, ou só os novos?** **Recomendo: por padrão, só os novos**, com a opção de incluir os já pendentes. A tela mostra quem são e oferece "Já chegou? Marcar no caso" para cada um. A lista de pendentes costuma estar atrasada (o documento chegou por e-mail e ninguém marcou), e o cliente receberia lembrete de algo que já mandou.
7. **(nova) Quando o cliente manda um arquivo pela conversa, o pedido fecha sozinho?** **Recomendo que não.** Quem pediu recebe um aviso para conferir o arquivo e marcar "Já chegou". A IA não sabe se a foto é mesmo a CTPS, ou se está legível. Até alguém conferir, a automação não manda novo lembrete: o cliente "respondeu".
8. **(nova) Para quem passa o lembrete que ficou sem resposta?** **Recomendo: para quem pediu o documento**, e depois para quem cuida do caso e para a sócia dona. Quem pediu sabe para que serve o documento e é quem está travado esperando, como Larissa na tarefa das horas extras.
9. **(nova) A ficha do caso deve mostrar o lembrete automático em cada documento que falta?** **Recomendo que sim, numa linha discreta**, como no estado `gn-juridico`. Assim, quem abre o caso sabe que o cliente já foi lembrado e não pede de novo sem precisar.
