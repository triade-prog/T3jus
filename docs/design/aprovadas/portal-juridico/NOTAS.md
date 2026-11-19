# Portal: Jurídico · notas

> **Aprovado pela Carol em 19/11/2026, às 0h36 (Brasília).** Ela já tinha pedido 4 ajustes, todos aplicados antes da aprovação: o tipo "Outro" na Agenda, "Mensagens" no lugar de "Caixa" em Conversas, o funil redesenhado e mais de um tipo de honorário no contrato e na proposta. À 1h01 ela confirmou que as perguntas do fim seguem a recomendação ("pode seguir"): valem como decisões.

A área Jurídico do Portal do advogado, para a Carol aprovar antes de virar código. É a primeira rodada: mostra a estrutura e as telas principais das quatro seções (Casos e processos, Prazos, Tarefas e Petições), com a ficha do caso como coração da área.

Ela atende:

- EX-01: casos e processos com área, parte contrária, tribunal e sistema; um processo com vários clientes, cada um com os próprios honorários;
- EX-02: tarefas com responsável e vencimento, nas visões “Minhas” e “Da equipe”;
- EX-03: etapas e pendências do caso;
- EX-04: prazos cadastrados à mão;
- EX-05: documentos ligados ao caso e documentos que faltam;
- EX-07: etapas definidas pelo escritório e a lista que mostra número, cliente e etapa sem abrir;
- EX-08: o resultado (ganho, perda ou acordo) pedido ao chegar à etapa final;
- EX-14: aviso ao cliente pelo WhatsApp quando o caso muda de etapa, em linguagem simples e com prévia;
- CH-05: contratos ligados ao caso;
- CH-07: a etapa que gera a cobrança e avisa o Financeiro;
- PD-04, PD-05 e PD-07: tarefas atrasadas ou próximas, o que está travado e por quem, responsável em tudo e cada alerta levando ao caso;
- IN-06: tarefas e bloqueios que pedem ação;
- IN-08: carga de cada pessoa e casos por etapa, de forma discreta;
- FI-08: resumo financeiro do caso, só para quem tem Financeiro.

Ficam só com lugar reservado ou citação: EX-09 (Petições, a validar: lugar reservado e a pergunta), EX-10 (todo prazo e tarefa tem responsável; a passagem é a da Equipe aprovada), EX-12 (a OAB da equipe aparece só como o que o gerador de petições usaria). EX-06, EX-11 e EX-13 são da Agenda, que é parte comum, e não foram desenhadas aqui. VA-02 (monitoramento de publicações) é integração posterior: as telas dizem que o T3jus ainda não lê publicações, e nada é desenhado como se existisse.

Pesam também PT-03 (nada é apagado; motivo obrigatório ao mudar de etapa), PT-10 (WCAG 2.2 AA, celular e estados), PT-11 (cadastro mínimo e finalidade por campo) e PT-25 (lista, ficha, criar e editar no mesmo padrão), além de PA-01 e PA-02 (a área só aparece para quem a sócia dona liberou).

A tela parte do Portal v1 aprovado (moldura, barra de seções da área, barra de baixo no celular, CSS e peças) e da área Clientes aprovada. O cabeçalho da ficha é o da ficha aprovada do Console v1, sem mudança. As peças novas têm o prefixo `ju-`.

## Como abrir

- `index.html` mostra os 16 estados em computador (1440) e celular (412), com legenda. Clique numa imagem para abrir o HTML naquele estado.
- `juridico.html` abre sozinho, com as fontes, o CSS e os ícones embutidos. O `index.html` usa o Google Fonts.
- O estado vem do endereço, por exemplo `juridico.html?estado=ficha`, `?estado=mudar-etapa-erro` ou `?estado=etapas`. No celular, `&mais=1` abre a folha Mais.
- Abaixo de 760 px, o HTML vira a versão de celular. Funcionam os botões que abrem e fecham janelas (Mudar etapa, Novo prazo), o Esc e o Mais. O resto é desenho.
- As capturas de celular mostram a página inteira, com a barra de baixo no fim. Com janela aberta, a captura mostra só a tela; no computador, as janelas longas foram capturadas numa tela mais alta para aparecerem inteiras.
- A pasta `_fonte/` guarda os scripts, e `sh _fonte/gerar.sh <pasta>` refaz tudo:
  - `comum.py` é a cópia sem mudança do Portal v1 (a mesma da área Clientes);
  - `juridico.py` gera o HTML;
  - `casos.py` gera a lista de estados e o `index.html`;
  - `fotos.cjs` faz as capturas com deviceScaleFactor 2 e roda as conferências;
  - `webp.py` converte as capturas para WebP.
- Todos os dados são fictícios e seguem o elenco das telas aprovadas: Marina Ribeiro (sócia dona), Felipe Matos, Larissa Costa (só Jurídico), Gustavo Lima, e os casos e prazos que já aparecem no Início aprovado.

## Decisões de design

1. **A área usa a moldura aprovada sem mudança.** A barra de seções no alto tem Casos e processos, Prazos, Tarefas e Petições. As seções não mudaram. A configuração das etapas não virou seção: é uma página dentro de Casos e processos, aberta pelo botão “Etapas do escritório”, que só a sócia dona vê.
2. **Lista de casos:**
   - fica numa folha abaixo do cabeçalho âmbar com padrão, como Clientes;
   - busca por caso, número, cliente ou parte contrária; filtros de responsável e de etapa; Em andamento (o padrão) e Encerrados;
   - cada linha mostra o caso (nome e número do processo, com a área), o cliente (“e mais 1 cliente” quando há vários), a etapa (nome, uma régua de 8 tracinhos e “5 de 8”), o responsável, o próximo prazo e as pendências. Tudo sem abrir o caso (EX-07);
   - a ordem é pelo prazo mais próximo. O caso com prazo hoje ganha um filete à esquerda e o selo “Vence hoje”;
   - acima da tabela, a faixa “Onde estão os 9 casos em andamento” conta os casos por etapa (IN-08). Cada número é um botão que filtra a lista. No celular, a faixa rola de lado dentro dela mesma;
   - no celular, a tabela vira cartões, como em Clientes.
3. **Cadastrar caso é uma página**, como cadastrar cliente:
   - obrigatórios: o nome do caso, um cliente, a etapa e o responsável. O número do processo e os dados do tribunal ficam num bloco “Processo”, que pode esperar a distribuição;
   - **clientes do caso (EX-01):** cada cliente é um bloco com o papel no processo e o contrato com os honorários dele. Dá para adicionar outros clientes;
   - cliente sem contrato gera um aviso de atenção e não bloqueia: o caso fica marcado “sem contrato” até a área Contratos ligar um (CH-05);
   - o aviso ao cliente pelo WhatsApp vem ligado, com a explicação de que a prévia sempre aparece antes do envio.
4. **Ficha do caso (o coração):**
   - o cabeçalho é o da ficha aprovada. No vinho ficam a área, o nome do caso, “Em andamento”, o número e o tribunal com o sistema (“TRT-2 · PJe-JT”);
   - **o âmbar mostra a etapa**: “5 de 8 Sentença”, a régua das 8 etapas, desde quando e qual é a próxima, e o botão Mudar etapa. É o ponto de ação da ficha;
   - na coluna principal: dados do processo, clientes do caso (cada um com papel, WhatsApp e os próprios honorários), prazos e tarefas (cada um com responsável e data), e documentos;
   - **documentos (EX-05):** primeiro os que faltam, com quem está e quando foram pedidos, com “Pedir de novo” (abre a conversa do cliente com o texto pronto) e “Já chegou”; depois os ligados ao caso;
   - na lateral, nesta ordem: **“O que está travando” (PD-05)**, que diz quem o caso espera, desde quando e o que isso trava (no celular, essa folha sobe para logo abaixo do cabeçalho); contratos ligados (CH-05); resumo financeiro (FI-08); aviso ao cliente (EX-14); e as mudanças de etapa, com data, quem mudou e o motivo;
   - o resumo financeiro mostra o que entrou, o que foi repassado e o que falta destinar. Uma linha diz que o caso só fecha no Financeiro com tudo recebido e repassado.
5. **Mudar etapa (janela):**
   - mostra a etapa atual e as 8 etapas em botões de opção. A atual fica tracejada e não dá para escolher. As etapas com efeito dizem qual: “Avisa o Financeiro” e “Pede o resultado”;
   - **o motivo é obrigatório** e é só para a equipe. Vazio, aparece o erro preso ao campo, com o resumo no topo, que diz que a etapa não mudou e que nenhum aviso foi enviado;
   - **o aviso aos clientes (EX-14)** vem marcado, com a prévia do texto do jeito que Joana vai receber. O começo e o fim da mensagem são fixos, com o primeiro nome do cliente e a parte contrária; o meio é o texto simples da etapa. “Ajustar só desta vez” muda o texto sem mudar a etapa do escritório;
   - o botão diz o que acontece: “Mudar para Recurso e avisar”;
   - voltar para uma etapa anterior é permitido, com motivo. Nesse caso o aviso começa desmarcado (não está desenhado nesta rodada);
   - depois de mudar, o âmbar passa a 6 de 8, o histórico ganha a linha nova com o motivo e a hora do aviso, e o aviso de sucesso confirma o envio.
6. **Etapa final (EX-08, CH-07, FI-08):**
   - ao escolher a última etapa, a janela vira “Encerrar o caso” e pede o resultado: Ganho, Perda ou Acordo;
   - com ganho ou acordo, pede o valor de cada cliente e a data prevista do pagamento;
   - **o êxito é calculado pelo contrato de cada cliente** (30% de R$ 28.000,00 para Joana, 25% de R$ 20.000,00 para Carlos) e vai ao Financeiro como valor a receber, “para conferir”. Quem tem Financeiro confere antes de cobrar;
   - o caso fica “Encerrado · acerto pendente” até o Financeiro registrar o recebimento e o repasse aos clientes;
   - o resultado alimenta os indicadores (taxa de êxito por área, por exemplo).
7. **Quem não tem Financeiro (Larissa, só Jurídico):** a ficha sai sem o resumo financeiro e sem os valores de honorários. Os clientes mostram “Honorários na área Contratos”, e os contratos ligados aparecem só com o número e a data de assinatura. Uma linha diz que os valores ficam em Contratos e Financeiro e quem libera. O servidor manda a ficha já sem esses campos. Na lista, Larissa não vê o botão “Etapas do escritório”.
8. **Etapas do escritório (EX-07):**
   - fica em Jurídico › Casos e processos › Etapas do escritório. Só a sócia dona edita; a equipe vê as etapas pela lista e pela ficha;
   - começam 8 etapas sugeridas: Preparação, Petição inicial, Citação e defesa, Instrução, Sentença, Recurso, Cumprimento e Encerrado;
   - cada etapa tem nome, “o que é” (só para a equipe), o texto para o cliente (até 240 caracteres, em linguagem simples) e a opção “Avisar o Financeiro ao entrar nesta etapa” (CH-07: pede valor e data prevista e cria um valor a receber, como na requisição de pagamento expedida);
   - cada linha mostra quantos casos estão na etapa. Subir e descer mudam a ordem; editar abre a etapa no próprio lugar, com a prévia do WhatsApp;
   - a última etapa é sempre a final e pede o resultado. Ela não sobe nem desce;
   - tirar uma etapa com casos pede para qual etapa eles vão. Nada some, e cada mudança fica no histórico do escritório.
9. **Prazos (EX-04):**
   - agrupados por Hoje, Amanhã, Até sexta e Depois, com o número de cada grupo;
   - cada prazo traz o dia num disco, o que é, o caso, o número do processo, o responsável e o botão “Cumprido”;
   - **a urgência vem escrita** e a cor só reforça, sem verde nem vermelho: hoje é o disco âmbar com o selo de urgência “Vence hoje”; amanhã é o disco âmbar claro com o selo de atenção; depois é o disco neutro com “Em 3 dias”;
   - “fazer até” é a margem do escritório antes do prazo final e aparece em destaque na linha;
   - o pé da folha diz que os prazos são cadastrados pela equipe e que o T3jus ainda não lê publicações nem conta dias úteis (VA-02 fica para depois);
   - **novo prazo** é uma janela: caso, o que é, prazo final, fazer até, responsável, a data da intimação (só para consulta) e o lembrete 2 dias antes, no Início e no sino.
10. **Tarefas (EX-02, PD-04, PD-07, IN-06):**
    - “Minhas” e “Da equipe”, nos mesmos botões de filtro do resto do Portal;
    - grupos: Atrasadas, Hoje, Esta semana e **Esperando alguém**, que diz o que a tarefa espera (um documento do cliente ou uma resposta) e desde quando. A ficha do caso mostra o mesmo em “O que está travando”;
    - cada tarefa tem a caixa de concluir, o caso (link para a ficha), o vencimento e, na visão da equipe, o responsável;
    - **carga da equipe (IN-08)** só aparece na visão da equipe, numa folha lateral pequena: casos e tarefas de cada pessoa em barras finas, com a nota “para ver onde o trabalho acumula, não para comparar pessoas”.
11. **Petições (EX-09, a validar):** a seção existe, mas só com o lugar reservado. A folha explica, com borda tracejada, o que está em estudo e faz uma pergunta curta aos escritórios: se usariam o gerador (toda semana, às vezes ou não) e, opcional, como fazem hoje. A resposta vai para a equipe T3jus, sem dado de cliente.
12. **Celular:** Jurídico mora no Mais, então o botão Mais fica marcado como atual. A barra de seções vira a grade de botões aprovada. A lista vira cartões, a ficha empilha cabeçalho, âmbar, “O que está travando” e as folhas, e nas janelas os botões ficam no rodapé.

## Acessibilidade (WCAG 2.2 AA)

- **Conferência automática** em 32 capturas (16 estados × computador e celular), feita pelo `fotos.cjs`. O resultado completo fica em `_conferencia.json`:
  - o axe (WCAG 2.0, 2.1 e 2.2, A e AA) não achou nenhuma violação;
  - nenhuma tela tem rolagem lateral;
  - nenhum erro de script.
- **Alvos:** no celular, todos têm 44 px ou mais. No computador, os botões compactos das listas (Cumprido, Abrir, Pedir de novo) têm 36 px, como no aprovado. A única exceção é a palavra-marca “T3jus” da moldura aprovada, com 24 px, já registrada em Clientes.
- **Contraste.** Só entram pares do D2 e do conceito Gabinete. O selo de urgência é branco sobre #AC3F6B (5,7:1); o de atenção é tinta sobre #E9AE90 (8,6:1); o número do disco de hoje é vinho escuro sobre âmbar (5,6:1), como corrigido no Portal v1. A régua de etapas é decorativa: o texto “5 de 8” e o nome da etapa dizem o mesmo, e cada tracinho tem texto para leitor de tela.
- **Formulários:** cada campo tem `label`; as etapas, o resultado, o aviso e a pergunta de Petições ficam em `fieldset` com `legend`; os erros ficam ligados ao campo por `aria-describedby`, com `aria-invalid`, e há resumo no topo. As datas são texto dd/mm/aaaa e os valores usam `inputmode`.
- **Janelas.** São `<dialog>` com `showModal()`, e o Esc fecha. O foco começa no motivo (ou no primeiro campo), e no campo com erro quando há erro.
- **Cor.** Nada depende só dela: prazo, tarefa atrasada, pendência e etapa têm texto, selo e ícone.

## O que precisa de dado novo no servidor

Todas as tabelas têm `escritorio_id` e passam por `proteger_tabela_escritorio`. O escritório vem da sessão, nunca do navegador.

### Tabelas

| Tabela | Campos | Observação |
|---|---|---|
| `etapa` | `id`, `escritorio_id`, `ordem`, `nome`, `descricao`, `texto_cliente` (até 240), `avisa_financeiro`, `final` | Uma só `final` por escritório, sempre a última. Nasce com as 8 sugeridas. Sem DELETE com casos: a remoção pede `mover_para` |
| `caso` | `id`, `escritorio_id`, `nome`, `area`, `parte_contraria`, `numero_cnj` (opcional, só dígitos), `tribunal`, `vara`, `sistema`, `valor_causa_centavos`, `etapa_id`, `etapa_desde`, `responsavel_id`, `avisar_cliente`, `situacao` (andamento, encerrado), `resultado` (ganho, perda, acordo), `acerto_pendente`, `criado_por`, `criado_em`, `versao` | `responsavel_id` obrigatório (EX-10) |
| `caso_cliente` | `id`, `escritorio_id`, `caso_id`, `cliente_id`, `papel`, `contrato_id` (opcional), `valor_resultado_centavos` | Um processo com vários clientes, cada um com o próprio contrato (EX-01) |
| `caso_etapa_mudanca` | `id`, `escritorio_id`, `caso_id`, `de_etapa_id`, `para_etapa_id`, `motivo`, `por`, `em`, `aviso_enviado_em`, `aviso_texto` | Sem UPDATE nem DELETE. É o histórico da ficha |
| `prazo` | `id`, `escritorio_id`, `caso_id`, `descricao`, `data_final`, `fazer_ate`, `intimacao_em`, `responsavel_id`, `lembrete_dias`, `cumprido_em`, `cumprido_por` | Cadastrado à mão (EX-04) |
| `tarefa` | `id`, `escritorio_id`, `caso_id`, `titulo`, `vence_em`, `responsavel_id`, `esperando` (texto), `esperando_desde`, `concluida_em`, `concluida_por` | `esperando` alimenta “Esperando alguém” e “O que está travando” (PD-05) |
| `documento_pedido` | `id`, `escritorio_id`, `caso_id`, `descricao`, `com_quem` (cliente do caso), `pedido_em`, `chegou_em`, `arquivo_id` | Os documentos que faltam (EX-05). Os arquivos ligados usam o mesmo armazenamento dos documentos do Console |
| `pendencia` | `id`, `escritorio_id`, `caso_id`, `quem` (cliente ou terceiro), `oque`, `desde`, `trava_prazo_id` ou `trava_tarefa_id`, `resolvida_em` | Pode ser derivada de `tarefa.esperando` e de `documento_pedido`; a decidir na programação |
| `peticao_interesse` | `id`, `escritorio_id`, `pessoa_id`, `resposta`, `como_faz_hoje`, `em` | Só a resposta da pergunta de EX-09 |
| Histórico do escritório | Eventos `etapa_criada`, `etapa_editada` (antes e depois), `etapa_movida`, `etapa_removida` (com `mover_para`), `caso_cadastrado`, `caso_editado` | Na mesma tabela de eventos da Equipe |

### API

| Rota | O que faz | Erros |
|---|---|---|
| `GET /v1/casos?q=&responsavel=&etapa=&situacao=&cursor=` | Lista com número, primeiro cliente e quantos mais, etapa (ordem e total), responsável, próximo prazo e pendências; e a contagem por etapa | `AREA_NAO_LIBERADA` |
| `POST /v1/casos` | Cadastra com nome, ao menos um cliente, etapa e responsável | `NOME_OBRIGATORIO`, `CLIENTE_OBRIGATORIO`, `RESPONSAVEL_INVALIDO`, `NUMERO_CNJ_INVALIDO` |
| `GET /v1/casos/:id` | Ficha. Sem Financeiro, vem sem `resumo_financeiro`; sem Contratos nem Financeiro, vem sem os valores de honorários | 404 de outro escritório |
| `POST /v1/casos/:id/etapa` | Muda a etapa com `motivo` e `avisar`. Na etapa final, exige `resultado`, os valores por cliente e a data prevista; cria os valores a receber do êxito (para conferir) e marca `acerto_pendente`. Com `avisa_financeiro`, cria o valor a receber da etapa. O aviso sai pelo WhatsApp do escritório | `MOTIVO_OBRIGATORIO`, `RESULTADO_OBRIGATORIO`, `VALOR_OBRIGATORIO`, `MESMA_ETAPA` |
| `GET /v1/casos/:id/aviso-etapa?para=` | Devolve a prévia do texto para cada cliente | — |
| `GET`, `POST`, `PATCH /v1/prazos` e `POST /v1/prazos/:id/cumprido` | Lista, cadastra, edita e marca cumprido | `DATA_OBRIGATORIA`, `RESPONSAVEL_INVALIDO` |
| `GET`, `POST`, `PATCH /v1/tarefas?visao=minhas\|equipe` | Lista, cadastra, conclui e reabre; a visão da equipe traz a carga por pessoa | `RESPONSAVEL_INVALIDO` |
| `GET`, `POST`, `PATCH /v1/etapas` e `POST /v1/etapas/ordem` | Lista e edita as etapas (só a sócia dona escreve) | `SEM_PERMISSAO`, `ETAPA_FINAL_FIXA`, `MOVER_PARA_OBRIGATORIO` |
| `POST /v1/peticoes/interesse` | Guarda a resposta da pergunta de Petições | — |

### Para o painel

- A entrega desta área atende EX-01, EX-02, EX-03, EX-04, EX-05, EX-07, EX-08, EX-14, CH-05, CH-07, PD-04, PD-05, PD-07, IN-06, IN-08 e FI-08.
- EX-09 só ganha o lugar reservado e a pergunta: não citar como atendida.
- Itens “pendente” para o painel:
  - FI-08: o fechamento financeiro do caso (“acerto pendente” até tudo recebido e repassado) depende da área Financeiro;
  - CH-07 e EX-08: a cobrança do êxito chega ao Financeiro “para conferir”; a tela de conferência é da área Financeiro;
  - EX-14: o envio depende da integração com o WhatsApp do escritório; até lá, a mudança de etapa grava o texto e marca “aviso não enviado”;
  - IN-08: os indicadores por etapa e por resultado ficam para a tela de indicadores.

## Perguntas para a Carol

1. **Uma lista de etapas para o escritório todo ou uma por tipo de caso?** Um caso previdenciário administrativo anda diferente de uma ação trabalhista. **Recomendo uma lista só nesta versão**, com etapas genéricas como as 8 sugeridas, e abrir listas por área depois, se os pilotos pedirem. Uma lista só deixa a lista de casos, os filtros e os indicadores simples e comparáveis.
2. **Quem pode mudar a etapa e registrar o resultado final?** **Recomendo: todos com a área Jurídico**, com motivo obrigatório e histórico. O resultado gera a cobrança do êxito só “para conferir”: quem tem Financeiro confere antes de cobrar o cliente. Assim quem acompanha o processo registra na hora, e o dinheiro passa por quem cuida dele.
3. **O aviso de etapa ao cliente pode sair sem prévia, de forma automática?** **Recomendo que não:** o aviso vem marcado, mas sempre com a prévia na janela de mudar etapa, e a pessoa pode desmarcar ou ajustar só daquela vez. Um aviso errado ao cliente custa mais que um clique.
4. **Quem tem só o Jurídico vê os honorários dos clientes do caso?** **Recomendo que não veja valores nem percentuais**, como no estado `ficha-sem-financeiro`: vê que há contrato, de qual cliente e quando foi assinado. Os valores ficam com quem tem Contratos ou Financeiro. Se pesar no dia a dia, a alternativa é mostrar só o tipo (“êxito”, “fixo”) sem números.
5. **Petições fica na barra agora, só com a pergunta, ou sai até ser validada?** **Recomendo deixar**, como está no estado `peticoes`: a seção já explica o que vem e colhe a resposta dos escritórios piloto dentro do próprio uso, o que ajuda a validar EX-09. Se a Carol preferir menos itens na barra, Petições sai e a pergunta vai para a conversa com os pilotos.
