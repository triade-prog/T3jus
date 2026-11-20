# Portal: não receber avisos (ficha do cliente) e o sino de avisos · notas

Duas telas pequenas para a Carol aprovar antes do código. As duas mudam o mínimo no que já foi aprovado.

- **Tela 1, ficha do cliente: não receber avisos** (item F3.63, ideia PA-03). Na ficha, a equipe marca e retira o pedido de "não receber avisos" (todos os avisos automáticos ou só os de cobrança). O registro guarda quem pediu (o próprio cliente, um contato da ficha ou outra pessoa), como pediu (WhatsApp, telefone, pessoalmente ou e-mail) e quando. A ficha mostra que o cliente está fora dos avisos e desde quando. Retirar o pedido também fica registrado, e nada se apaga.
- **Tela 2, o sino de avisos** (item F3.57, ideia PD-07, e o lembrete de prazo de F3.38). É o painel que vários desenhos aprovados citam como "chega no sino". Ele cobre a conversa que a IA passou para a pessoa, a conversa que alguém assumiu, a conversa que alguém passou, a sugestão de mudança numa automação, o texto aprovado ou recusado pela Meta e o prazo em 2 dias.

Pesam também PA-01 (cada pessoa só vê o que pode abrir), PT-03 (nada é apagado) e PT-10 (WCAG 2.2 AA, celular, vazio e erros).

A base é o Portal v1 aprovado: a moldura, a barra de baixo no celular, o CSS e as peças, pelo `comum.py` e o `extra.py` sem mudança. A ficha é a do Clientes aprovado (Antônia Ferreira Prado e a PJ Construtora Vale Alto), e o `clientes.py` aprovado foi lido sem mudança. O elenco e o "hoje" são os de sempre: Ribeiro & Matos, Marina Ribeiro como sócia dona, quarta-feira, 18/11/2026, às 10h12. As peças novas têm prefixo `sa-` (sem avisos) e `si-` (sino).

## Como abrir

- `index.html` mostra os 15 estados em computador (1440) e celular (412), com legenda. Clique numa imagem para abrir o HTML naquele estado.
- `sem-avisos.html` e `sino.html` abrem sozinhos, com as fontes, o CSS e os ícones embutidos. O estado vem do endereço, por exemplo `sem-avisos.html?estado=marcar` ou `sino.html?estado=juridico`.
- Abaixo de 760 px, o HTML vira a versão de celular. Funcionam abrir e fechar as janelas e o painel do sino (clicando no sino ou no X, e com o Esc), os filtros do painel e abrir e fechar o histórico do pedido. O resto é desenho.
- A pasta `_fonte/` guarda os scripts, e `sh _fonte/gerar.sh` refaz tudo:
  - `comum.py` e `extra.py` são cópias sem mudança das de Conversas › Automações;
  - `clientes.py` é a cópia sem mudança do Clientes aprovado; o `base.py` o lê até o começo dos estados;
  - `sem_avisos.py` e `sino.py` geram os dois HTML;
  - `casos.py` gera a lista de estados e o `index.html`;
  - `fotos.cjs` faz as capturas e roda as conferências. Ele é o mesmo das Automações e só acrescenta `.si-link` às exceções de alvo, porque o aviso inteiro é o alvo, como no cartão aprovado;
  - `webp.py` converte as capturas para WebP.
- Todos os dados são fictícios.

## Decisões de design: tela 1 (não receber avisos)

1. **Três acréscimos na ficha aprovada, e nada mais:**
   - a folha **"Avisos automáticos"**, logo abaixo de Contatos. Fica perto de quem o escritório procura, e no celular aparece cedo, antes da lateral;
   - o selo **"Sem avisos de cobrança"** (ou "Sem avisos automáticos"), no cabeçalho vinho, ao lado de "Ativo". Ele é âmbar claro com texto tinta e o ícone do sino riscado. Quem abre a ficha vê na hora, sem rolar;
   - **duas janelas:** "Não receber avisos automáticos" (que também serve para mudar o pedido) e "Retirar o pedido".
2. **A folha tem dois jeitos:**
   - **Recebe** (estado `sa-recebe`): uma linha diz o que sai sozinho (cobrança de parcela, lembrete de audiência, aviso de etapa e prestação de contas, quando ligados) e oferece "Registrar pedido para não receber";
   - **Fora** (estado `sa-ficha`): uma faixa âmbar com filete vinho diz "Fora dos avisos de cobrança desde 03/11/2026". Abaixo vêm três dados: **quem pediu** (Joana Prado, filha, contato principal), **como pediu** (pelo WhatsApp) e **quem registrou** (Diego Almeida, na conversa, 03/11 às 14h22). A linha seguinte diz o que **continua** saindo: os lembretes e avisos de etapa, quando o pedido é só de cobrança, e as mensagens que a equipe escreve na conversa. Depois vêm os botões "Mudar o pedido" e "Retirar o pedido" e o **Histórico do pedido**, fechado num `details`.
3. **Registrar o pedido** (estado `sa-marcar`) pede quatro coisas, em cartões de rádio como no cadastro aprovado:
   - **o que não quer receber:** "Só os avisos de cobrança" (parcela a vencer e parcela atrasada) ou "Todos os avisos automáticos". Cada opção diz o que continua saindo;
   - **quem pediu:** os contatos da ficha, com o papel de cada um, mais "Outra pessoa". Com "Outra pessoa", aparece o campo "nome e o que é do cliente". Na PF, o próprio cliente é uma das opções; na PJ, o representante e os contatos;
   - **como pediu:** pelo WhatsApp (na conversa), por telefone, pessoalmente ou por e-mail;
   - **quando pediu:** o padrão é hoje. Pode ser um dia anterior, quando o pedido chegou antes e só agora está sendo registrado. Não pode ser depois de hoje.

   Uma nota lembra três coisas: o registro leva o nome de quem registrou e a hora, a mensagem escrita à mão continua saindo, e para voltar a receber existe "Retirar o pedido".
4. **Erros** (estado `sa-marcar-erros`): seguem o padrão aprovado. Há um resumo no topo, e o erro fica preso ao campo, com `aria-invalid` e `aria-describedby`. O botão nunca fica desabilitado. Os dois erros desenhados são "Outra pessoa" sem nome e a data depois de hoje.
5. **Registrado** (estado `sa-marcado`): aparece o aviso de sucesso, o selo entra no cabeçalho e a folha passa para "Fora", com "Marina Ribeiro (você), na ficha, hoje às 10h12".
6. **Mudar o pedido** (estado `sa-mudar`) usa o mesmo formulário, com o pedido atual escolhido. Serve, por exemplo, para passar de "só cobrança" para "todos". No servidor, isso retira o pedido atual e registra o novo (é o que a rota já faz), e os dois ficam no histórico.
7. **Retirar o pedido** (estado `sa-retirar`) é uma janela comum, não de perigo: voltar a receber não destrói nada. Ela pede **quem pediu para voltar** e **como**. Também diz que o pedido antigo continua no histórico e que nada é enviado na hora: as automações voltam a incluir o cliente na próxima vez que rodarem, respeitando os limites delas, como o de uma cobrança por semana.
8. **Retirado** (estado `sa-retirado`): o selo some, e a folha diz "Recebe os avisos automáticos desde 18/11/2026, quando o pedido foi retirado". O histórico vem aberto com as duas linhas, a retirada de hoje e o pedido de 03/11, cada uma com quem pediu, como e quem registrou.
9. **Toda a equipe registra** (estado `sa-sem-comercial`, Larissa, só com Jurídico). Quem recebe o pedido do cliente registra na hora, tenha a área que tiver. A folha não mostra valor nem parcela, só o tipo de aviso. É a pergunta 1.
10. **O pedido vale para o cliente, não para um número.** O pedido da filha tira a cliente dos avisos, por qualquer contato. Quem pediu fica registrado pelo nome e pelo papel. É a pergunta 4.

## Decisões de design: tela 2 (o sino)

11. **O sino já está na moldura aprovada, e ela não muda.** No computador, ele fica no topo, à direita da busca (Ctrl K). No celular, fica na barra vinho do alto, ao lado da busca. O ponto vinho continua sendo o sinal de "tem novo", e o número vai no rótulo ("Avisos, 4 novos"). O botão só ganha `aria-expanded`, `aria-controls` e o estado pressionado (fundo âmbar claro). A barra de baixo continua com Início, Conversas, Agenda e Mais.
12. **No computador, o painel desce do sino** (460 px), sem escurecer nem cobrir a página: é um `dialog` não modal. Ele fecha pelo X, pelo Esc ou por um novo clique no sino, e o foco volta ao sino. **No celular, o painel ocupa a tela**, com o cabeçalho vinho igual ao da barra, como a folha Mais: é um `dialog` modal.
13. **O que tem o painel:**
    - o cabeçalho "Para você · Avisos" com a contagem ("4 novos · 7 nos últimos 30 dias");
    - os filtros **Todos** e **Não lidos (4)**, e **Marcar todos como lidos**;
    - a lista por dia (Hoje, Ontem · 17/11), com o rótulo do dia preso no alto ao rolar;
    - no pé, a regra: os avisos ficam 30 dias, e marcar como lido não apaga nada.
14. **Cada aviso diz o que aconteceu, de quem, e leva ao lugar certo.** O título é uma frase com o nome em negrito ("A IA passou a conversa de **Joana Prado** para você"). O detalhe traz a fala do cliente, em Alegreya itálico, ou o motivo. A última linha tem a hora e o destino escrito ("Abrir a conversa", "Ver a sugestão", "Corrigir o texto", "Abrir o prazo"). O aviso inteiro é o link (o `::after` cobre o item), e abrir o aviso o marca como lido. O ícone mostra o tipo: IA, mão (assumiu), setas (passou), lápis (sugestão), alerta (recusado), check (aprovado) e relógio (prazo).
15. **Não lido não depende só de cor.** Ele tem filete vinho, ponto, título em negrito, a palavra "Novo" escrita e "Novo:" para o leitor de tela. Os selos "Recusado" (urgência), "em 2 dias" (atenção) e "Aprovado" (ok) seguem os do D2.
16. **Os avisos do exemplo** (estado `si-aberto`, Marina):
    - hoje, não lidos: a IA passou a conversa de Joana Prado; Gustavo Lima sugeriu uma mudança na cobrança; a Meta recusou o texto "Parcela atrasada, 2º aviso" (a automação continua em rascunho e nada foi enviado); o prazo da contestação de Irene Castro vence em 2 dias;
    - ontem, lidos: Felipe Matos assumiu a conversa de Ricardo Vale, que era dela; Diego Almeida passou a conversa de Daniela; a Meta aprovou o texto "Aviso de etapa do caso".
17. **Marcar todos como lidos** (estado `si-lidos`): um aviso de sucesso aparece no painel, e os avisos continuam na lista, sem o destaque. O ponto do sino some, e o rótulo vira "Avisos, nenhum novo". No lugar do botão fica "Tudo lido". Só se marcam os avisos que estavam na tela: um aviso que chegar no mesmo instante continua novo.
18. **Cada pessoa recebe só o que é dela** (estado `si-juridico`, Larissa). Ela recebe a conversa que a IA passou para ela, o prazo dela em 2 dias e a conversa que Marina assumiu. A sugestão de automação e o texto da Meta vão só para a sócia dona. O servidor manda a lista já filtrada (PA-01).
19. **Vazio** (estado `si-vazio`, Paula): explica o que chega ali (uma conversa passada para você, um prazo seu que vence em 2 dias, uma decisão que só você toma) e que cada aviso leva ao lugar certo.
20. **Erro** (estado `si-erro`): "Tentar de novo", o código para o suporte e a frase "nenhum aviso se perde". O ponto do sino continua com a última contagem conhecida.

## Acessibilidade (WCAG 2.2 AA)

- **Conferência automática** em 30 capturas (15 estados × computador e celular), feita pelo `fotos.cjs`. O resultado fica em `_conferencia.json`:
  - o axe (WCAG 2.0, 2.1 e 2.2, A e AA) não achou nenhuma violação;
  - nenhuma tela tem rolagem lateral;
  - nenhum erro de script;
  - todos os alvos têm 44 px ou mais. A única exceção é a palavra-marca "T3jus" no trilho (24 px), da moldura aprovada, a mesma exceção já registrada no Clientes.
- **Janelas** são `<dialog>` com rótulo e descrição. Os rádios ficam em `fieldset` com `legend`. Os erros ficam ligados ao campo, e há um resumo no topo.
- **Histórico do pedido** é um `details` com `summary`: funciona por teclado e leitor de tela, sem script.
- **Sino:** o botão tem `aria-expanded`, `aria-controls` e `aria-haspopup="dialog"`, e o rótulo traz o número ("Avisos, 4 novos"). O painel é um `dialog` com nome ("Avisos"), e o foco vai para ele ao abrir e volta ao sino ao fechar. Os filtros são botões com `aria-pressed`. O item com foco ganha o contorno de foco inteiro.
- **Contraste:** só entram pares do D2 e do Gabinete. A faixa "Fora" usa tinta e vinho sobre `#F2CDB3` (11,2:1 e 7,15:1). O selo do cabeçalho usa tinta sobre `#E9AE90` (8,6:1). "Novo" usa `#AC3F6B` sobre branco (5,7:1).

## O que precisa de dado novo no servidor

As tabelas têm `escritorio_id` e passam por `proteger_tabela_escritorio`. O escritório vem da sessão, nunca do navegador. Nada se apaga.

### Tela 1: acréscimos em `clientes_sem_avisos` (a tabela e a rota já existem)

| Campo novo | Para quê |
|---|---|
| `canal` (WHATSAPP, TELEFONE, PRESENCIAL, EMAIL) | "Como pediu". O `origem` atual (CONVERSA, FICHA) continua dizendo onde foi registrado |
| `contato_id` (opcional, referência ao contato da ficha) | Liga "quem pediu" ao contato, quando é um contato da ficha. `quem_pediu` (texto) continua guardando o nome e o papel, inclusive de "Outra pessoa" |
| `pedido_em` informado | Hoje o valor padrão é a hora do registro. A tela manda o dia do pedido, que pode ser anterior e nunca depois de hoje (recusar com `DATA_NO_FUTURO`). A hora do registro fica num campo novo, `registrado_em` |
| `retirado_quem_pediu`, `retirado_contato_id`, `retirado_canal` | Quem pediu para voltar a receber e como. Hoje só se guardam `retirado_em` e `retirado_por` |

- **Rota:** `POST /v1/escritorio/clientes/:id/sem-avisos` passa a aceitar `canal`, `contatoId` e `pedidoEm`. Com `retirar`, aceita também `quemPediu`, `contatoId` e `canal`. Erros novos: `QUEM_PEDIU_OBRIGATORIO`, quando não há contato nem nome, e `DATA_NO_FUTURO`.
- **Leitura:** a ficha (`GET` do cliente) passa a trazer o pedido ativo e o histórico dos pedidos do cliente, com o nome de quem registrou e de quem retirou.
- **Atenção no servidor:** hoje, qualquer pedido ativo tira o cliente da simulação de cobrança, o que está certo para os dois tipos. Quando os gatilhos de lembrete de audiência e de aviso de etapa rodarem, eles só podem respeitar o tipo `TODOS`.
- **Permissão:** hoje a rota exige `conversas.editar`, e Conversas é comum a toda a equipe. Isso já atende a recomendação da pergunta 1.

### Tela 2: o sino (tabela nova)

| Tabela | Campos | Observação |
|---|---|---|
| `aviso` | `id`, `escritorio_id`, `pessoa_id` (para quem), `tipo` (conversa_passada_ia, conversa_assumida, conversa_passada, automacao_sugestao, modelo_aprovado, modelo_recusado, prazo_2_dias; depois, os de Petições e Importação), `dados` (jsonb com nomes, trecho e motivo, já sem o que a pessoa não pode ver), `origem_tabela`, `origem_id` (o registro que explica o aviso, para o link), `criado_em`, `lido_em` | Só inserção e a marca de lido. Sem DELETE. A RLS deixa cada pessoa ler só os próprios avisos. Índice em `(escritorio_id, pessoa_id, criado_em desc)` |

- `GET /v1/avisos?cursor=` traz os últimos 30 dias, com `novos` (a contagem).
- A contagem de novos vem também com a sessão, para o ponto do sino aparecer sem abrir o painel.
- `POST /v1/avisos/:id/lido` marca um aviso como lido. Abrir o aviso chama essa rota.
- `POST /v1/avisos/lidos {ate}` marca todos como lidos até o instante do último aviso mostrado, para não marcar o que chegou depois.
- **Quem gera o aviso:** a passagem da IA, o assumir e o passar de Conversas; `POST /v1/automacoes/:id/sugerir-mudanca`, que vai para a sócia dona; a resposta da Meta sobre o modelo, que também vai para a sócia dona; e a rotina diária dos prazos (F3.38), que avisa o responsável quando o lembrete estiver marcado.

### Para o painel

- A tela 1 atende o que falta de F3.63 (PA-03). O registro de pedido pela conversa usa a mesma janela, com "pelo WhatsApp" já marcado e `origem` CONVERSA. Ela não foi desenhada aqui: entra como item "pendente" de PA-03 (o atalho na conversa).
- A tela 2 atende F3.57 (PD-07). O lembrete de prazo no sino é parte de F3.38, que continua pendente até a rotina diária existir.

## Perguntas para a Carol

### Tela 1: não receber avisos

1. **Quem pode marcar e retirar o pedido?** **Recomendo: qualquer pessoa da equipe.** Quem recebe o pedido do cliente (a recepção ao telefone, o advogado na reunião) registra na hora, e tudo fica com nome e hora. Retirar segue a mesma regra, mas sempre com quem pediu para voltar. A outra opção seria só a sócia dona e quem tem Financeiro. O risco é o pedido ficar esperando alguém e um aviso de cobrança sair no meio, contra a vontade do cliente.
2. **Bastam dois tipos (todos os avisos ou só cobrança)?** **Recomendo que sim, nesta versão.** É o que o cliente costuma pedir ("não me cobrem pelo WhatsApp" ou "não quero mensagem automática"). Escolher automação por automação confunde a equipe e o próprio cliente.
3. **Pode registrar um pedido com data anterior?** **Recomendo que sim, até hoje e nunca depois.** O pedido pode ter chegado na sexta e só ser registrado na segunda. A data do pedido e a hora do registro ficam separadas.
4. **O pedido de um contato (a filha) vale para o cliente todo?** **Recomendo que sim**, como o servidor já faz: o cliente sai dos avisos por qualquer número, e o nome de quem pediu fica registrado. Separar por contato abre brecha para o aviso chegar pela mãe depois de a filha ter pedido para parar.
5. **As mensagens escritas à mão pela equipe continuam saindo?** **Recomendo que sim.** O pedido vale para os avisos automáticos, e a conversa com o cliente segue normal. A janela e a ficha dizem isso. Depois, a conversa pode mostrar uma faixa "Pediu para não receber avisos de cobrança" (pendente).

### Tela 2: o sino

1. **O sino mostra o número ou só o ponto?** **Recomendo manter o ponto da moldura aprovada.** O número fica no rótulo, no cabeçalho do painel e no filtro "Não lidos". Assim a moldura não muda, e o sino não vira um contador que pressiona.
2. **O aviso também vai por e-mail ou notificação no celular?** **Recomendo só no sino nesta versão.** O prazo também aparece no Início, em "Pedem você agora". A notificação no celular entra com o app, para os tipos urgentes (prazo e conversa passada).
3. **Por quanto tempo o aviso fica no painel?** **Recomendo 30 dias.** Depois disso ele sai da lista, mas continua guardado, e o que ele conta segue no lugar de origem (a conversa, o prazo, a automação).
4. **A pessoa pode desligar tipos de aviso?** **Recomendo que não, nesta versão.** Todos os tipos pedem uma ação daquela pessoa, e são poucos. Se os pilotos acharem que vem aviso demais, a primeira opção a abrir é "conversa que alguém assumiu".
5. **Abrir o aviso marca como lido?** **Recomendo que sim.** "Marcar todos como lidos" só tira o destaque, sem apagar nada. Não há "marcar como não lido" nesta versão: o filtro "Não lidos" e o Início já cobrem o que falta fazer.
