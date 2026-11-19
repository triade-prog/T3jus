# Portal: Agenda e Conversas · notas

> **Aprovado pela Carol em 19/11/2026, às 0h36 (Brasília).** Ela já tinha pedido 4 ajustes, todos aplicados antes da aprovação: o tipo "Outro" na Agenda, "Mensagens" no lugar de "Caixa" em Conversas, o funil redesenhado e mais de um tipo de honorário no contrato e na proposta. As perguntas do fim seguem a recomendação até a Carol dizer o contrário.

As duas áreas comuns do Portal do advogado que ficam na barra de baixo do celular, para a Carol aprovar antes de virar código.

**Agenda** (rota `/agenda`) atende:

- EX-06: audiências como compromisso, com visão de mês, semana e dia, modalidade presencial ou virtual com link da sala, criadas clicando no dia;
- EX-11: lembrete da audiência ao cliente pelo WhatsApp (CPC, art. 334, § 8º);
- PD-04 e PD-07: os prazos do Jurídico na agenda de quem tem a área, cada item com responsável e levando ao registro que o explica.

EX-13 (Google Agenda e Outlook, [VAL]) só ganha um lugar reservado, marcado "Em estudo": não citar como atendida.

**Conversas** (rota `/conversas`) atende:

- as decisões da Carol sobre a IA no WhatsApp do escritório: o cliente fala com a IA, que passa para uma pessoa quando não sabe;
- EX-14: aviso ao cliente quando o caso muda de etapa, em linguagem simples;
- EX-11 e FI-12: lembrete de audiência e prestação de contas entre os avisos automáticos;
- PD-07 e EX-10: toda conversa que espera alguém tem responsável, e passar de pessoa nunca deixa a conversa sem dono.

VA-03 ([VAL]) aparece só como hipótese: a IA anota os dados de um contato novo como rascunho, e uma pessoa confere e cadastra. Não citar como atendida.

Pesam também PA-01 (áreas comuns; o que a pessoa não pode ver não aparece), PT-03 (nada é apagado; motivo em cancelar e remarcar), PT-10 (WCAG 2.2 AA, celular e estados), PT-11 (dado sensível fora do cadastro) e PT-25 (lista, ficha, criar e editar no mesmo padrão do Clientes).

As telas partem do Portal v1 aprovado (moldura, barra de baixo, CSS e peças) e seguem o Clientes aprovado. O cabeçalho da ficha do compromisso é o da ficha aprovada do Console v1, sem mudança. A agenda reaproveita o desenho da "Agenda de hoje" do Início aprovado (tipos, cores, linha de agora), e as conversas, o do "Esperando alguém". As peças novas têm o prefixo `ag-` (Agenda), `cv-` (Conversas) e `x-` (campos de janela, iguais aos do Clientes).

## Como abrir

- `index.html` mostra os 25 estados (14 da Agenda e 11 das Conversas) em computador (1440) e celular (412), com legenda. Clique numa imagem para abrir o HTML naquele estado.
- `agenda.html` e `conversas.html` abrem sozinhos, com as fontes, o CSS e os ícones embutidos. O `index.html` usa o Google Fonts.
- O estado vem do endereço, por exemplo `agenda.html?estado=mes`, `agenda.html?estado=novo-erros`, `conversas.html?estado=assumida` ou `conversas.html?estado=nao-conectado`. No celular, `&mais=1` abre a folha Mais.
- Abaixo de 760 px, o HTML vira a versão de celular. Funcionam os botões que abrem e fecham janelas (o + de cada dia abre "Novo compromisso"), o Esc, o Mais e os blocos que abrem e fecham. O resto é desenho.
- As capturas de celular mostram a página inteira, com a barra de baixo no fim. Com janela aberta, a captura mostra só a tela.
- A pasta `_fonte/` guarda os scripts, e `sh _fonte/gerar.sh` refaz tudo:
  - `comum.py` é a cópia sem mudança do Portal v1;
  - `extra.py` junta o que as duas telas usam: campos de janela no desenho do Clientes, cinco ícones novos no mesmo traço (vídeo, local, mão, devolver, sincronizar) e o acabamento da página;
  - `agenda.py` e `conversas.py` geram os HTML;
  - `casos.py` gera a lista de estados e o `index.html`;
  - `fotos.cjs` faz as capturas com deviceScaleFactor 2 e roda as conferências;
  - `webp.py` converte as capturas para WebP.
- Todos os dados são fictícios e seguem o elenco do Clientes e do Portal v1: Ribeiro & Matos, Marina Ribeiro (sócia dona), Felipe Matos, Larissa Costa (só Jurídico), Gustavo Lima, Diego Almeida (Comercial), Paula Nunes (recepção, sem área) e os clientes do Clientes. "Hoje" é quarta, 18/11/2026, às 10h12, como no Início aprovado.

## Decisões de design

### Agenda

1. **Uma agenda só, da equipe toda, com filtro por pessoa.** O padrão é "Toda a equipe". O filtro "Mostrar a agenda de" troca para uma pessoa, e uma linha diz o filtro e volta para a equipe toda (estado `pessoa`).
2. **Três visões, na mesma folha.** Mês, Semana e Dia ficam num seletor (links com `aria-current`), junto de ‹ Hoje › e do período em serifa. A semana é o padrão no computador, porque é a visão de trabalho do escritório.
3. **Semana:**
   - grade de segunda a domingo, das 8h às 19h, com o fim de semana mais estreito;
   - cada compromisso mostra a hora e o tipo por escrito ("11:00 · Audiência"), o título e, quando cabe, a modalidade e o local. A cor do filete repete o tipo, como no Início; nada depende só dela;
   - o que já passou fica em folha branca, com texto suave;
   - o dia de hoje tem o disco âmbar e a linha de agora em âmbar, que são o "ponto de atmosfera" do Gabinete nesta tela;
   - feriado nacional (20/11, Consciência Negra) aparece em hachura, com "Fórum fechado; prazos não correm".
4. **Criar clicando no dia (EX-06).** Cada dia tem um botão + de 44 px, com o nome do dia no rótulo para leitor de tela. Na visão Dia, os horários livres viram botões tracejados ("Marcar compromisso · livre das 12:00 às 14:30"). A janela abre com o dia e a hora do clique, e a grade mostra o lugar tracejado enquanto isso.
5. **Prazos do Jurídico (PD-04, PD-07):**
   - na semana, ficam numa faixa no alto de cada dia, com contorno #AC3F6B e o selo escrito ("Vence hoje", "Amanhã");
   - no dia, viram cartões com o processo, o responsável e "Abrir no Jurídico". O prazo é do Jurídico: a agenda só mostra, não edita;
   - quem não tem a área não vê a faixa nem a legenda de prazo, e o pé da folha diz por quê e quem libera, como no Clientes (estado `sem-juridico`, com a Paula).
6. **Novo compromisso:**
   - tipo (Audiência, Reunião com cliente, Assinatura, Interno ou Outro), o que é, dia, começa e termina. Outro abre o campo obrigatório “Qual tipo”, para escrever o tipo (ex.: Perícia, Diligência). Ver o item 7;
   - onde: Presencial ou Virtual. Virtual pede o link da sala, que vai no lembrete e no botão "Entrar na sala";
   - cliente, da lista de Clientes. Processo, opcional e só para quem tem o Jurídico;
   - responsável (obrigatório) e quem mais vai;
   - lembrete ao cliente pelo WhatsApp, já marcado nas audiências, com o motivo escrito (CPC, art. 334, § 8º). Vai para o contato principal da ficha, que aparece por extenso;
   - erros no padrão aprovado: resumo no topo e erro preso ao campo. São três: o que é vazio, término antes do início e virtual sem link. Com Outro marcado, o tipo vazio também é erro preso ao campo (estado `novo-outro-erro`).
   - presencial pede o endereço, que vai no lembrete; virtual pede o link.
7. **Tipo “Outro”, escrito pela equipe (pedido da Carol).** A quinta opção do Tipo é Outro. Ao marcar, aparece logo abaixo o campo “Qual tipo”, obrigatório (estados `novo-outro`, `novo-outro-erro` e `marcado-outro`):
   - o tipo escrito aparece com esse nome no compromisso (“16:00 · Perícia”), na ficha e na legenda, ao lado dos quatro tipos fixos. A legenda só mostra os tipos escritos que estão em uso no período;
   - todo tipo escrito usa a mesma cor (#AC3F6B, vinho-3). O que distingue é o nome, sempre escrito, então nada depende da cor;
   - o lembrete ao cliente vem desmarcado nos tipos que não são audiência; a pessoa marca quando o cliente precisa ir (na perícia, sim);
   - proposta para o código: os tipos já escritos no escritório viram sugestão ao digitar, para não nascer “Pericia” e “Perícia” separados (não está desenhado).
8. **Ficha do compromisso (PT-25):**
   - o cabeçalho é o da ficha aprovada: vinho com a estátua e, no âmbar, a ação do momento. Numa audiência virtual de hoje, a ação é "Entrar na sala" e "Copiar o link";
   - "Lembrete à cliente" mostra por que lembrar, o que saiu e quando, a resposta da cliente ("Confirmo") e a mensagem enviada, com o link para a conversa em Conversas;
   - ao lado, quem vai, o histórico (marcou, remarcou com motivo) e Cancelar.
9. **Cancelar não apaga (PT-03).** É um `alertdialog` com motivo obrigatório e "Avisar a cliente pelo WhatsApp", já marcado. O compromisso fica riscado na agenda e no histórico; o lembrete que não saiu é cancelado. Remarcar também pede motivo.
10. **Celular (a Agenda está na barra de baixo):**
   - a semana vira uma lista por dia, de hoje em diante, com os dias que já passaram recolhidos num bloco que abre;
   - cada dia tem o disco, um resumo ("hoje · 2 prazos · 4 compromissos") e o + de criar;
   - o mês vira um calendário compacto, com pontos por tipo, e embaixo a lista do dia escolhido;
   - o dia é a mesma lista, com a linha de agora;
   - o cabeçalho perde a explicação no celular para o calendário subir.
11. **Google Agenda e Outlook (EX-13).** Só um lugar reservado tracejado, com o selo "Em estudo" e "Contar como vocês usam". Nada promete a função (pergunta 4).

### Conversas

12. **Duas seções na barra da área: Mensagens e Avisos automáticos** (pergunta 1). Mensagens tem o contador de quem espera, igual ao do trilho e da barra de baixo.
13. **Mensagens em três colunas no computador:**
    - lista à esquerda, com busca e quatro filtros com número: Precisa de alguém, Com a equipe, Com a IA e Resolvidas hoje;
    - conversa no meio;
    - contexto à direita.
14. **Cada item da fila "Precisa de alguém"** mostra:
    - quanto tempo espera, em #AC3F6B, com ícone de relógio;
    - quem escreve (Joana, filha de Antônia) e a última mensagem;
    - o motivo num selo de atenção ("Proposta de acordo", "Documento novo", "Possível cliente novo");
    - o responsável.
15. **A IA sempre escolhe um responsável (PD-07, EX-10).** A regra proposta:
    - quem cuida do caso;
    - senão, quem tem o próximo contato do cliente;
    - contato novo vai para a área Comercial;
    - sem ninguém, vai para a sócia dona.

    O contexto diz por que a conversa veio para aquela pessoa. "Passar para outra pessoa" escolhe só entre pessoas ativas, com recado, e a troca fica registrada na conversa.
16. **A conversa:**
    - o cliente fica à esquerda, em balão branco;
    - a IA fica à direita, em âmbar claro, com o rótulo "IA do escritório";
    - a equipe fica à direita, em vinho, com o nome de quem escreveu;
    - os avisos automáticos ficam à direita, em folha tracejada, com o tipo e a situação (lido, entregue);
    - os momentos da conversa (a IA passou, você assumiu, a IA resolveu) ficam no meio, em linha própria, com a hora;
    - o cabeçalho liga a conversa à ficha de Clientes ("Abrir a ficha") e diz quem escreve.
17. **Assumir e devolver:**
    - enquanto a conversa espera, o campo de escrever dá lugar a "Assumir conversa", com a regra escrita: a IA fica em silêncio até a pessoa devolver;
    - assumida, a barra mostra "Com você" e "Devolver para a IA";
    - devolver pede, opcionalmente, o que a IA precisa saber (o cliente não vê) e oferece registrar a conversa como atendimento na ficha (AP-02), já marcado.
18. **Resolvida pela IA.** Mostra o que a IA usou para responder (o compromisso na Agenda, a ficha) e "Assumir mesmo assim", para corrigir. Se o cliente escrever de novo, a IA volta a responder.
19. **Contato novo (VA-03, hipótese):**
    - a IA anota nome, telefone, assunto, melhor horário e origem num rascunho tracejado;
    - "Cadastrar como cliente" abre o cadastro do Clientes preenchido para conferir, e "Marcar primeira reunião" abre a Agenda;
    - a IA não cadastra sozinha;
    - a gestação, por ser dado de saúde (sensível na LGPD), fica só na conversa e não vai para o cadastro (PT-11).
20. **Ligações com as outras áreas:**
    - a conversa de Joana mostra o próximo contato vencido de Antônia e o atalho "Registrar atendimento";
    - a de Hélio mostra o caso e a instrução marcada na Agenda;
    - a de Gabriela leva ao compromisso.

    Quem não tem o Jurídico não vê o bloco "Caso" (o servidor manda sem).
21. **Avisos automáticos:**
    - tabela dos últimos 7 dias com o tipo e o detalhe, o cliente e a quem foi, quando e a situação. O não entregue vem primeiro, com filete, selo de urgência, o motivo ("o número é fixo e não tem WhatsApp") e "Corrigir na ficha";
    - ao lado fica a mensagem escolhida, com o que a disparou ("Larissa mudou a etapa para Recurso enviado") e o texto em linguagem simples (EX-14). O texto vem do modelo da etapa, escrito pelo escritório; a IA não inventa aviso;
    - "Quais avisos saem" lista cada aviso, quando sai e se está ligado. Só a sócia dona muda;
    - a prestação de contas (FI-12) entra como um tipo de aviso. O conteúdo dela é do Financeiro.
22. **WhatsApp ainda não ligado:**
    - para a sócia dona, três passos: número só do escritório, ligação de 30 minutos com a equipe T3jus e revisão antes de qualquer envio, com o botão para marcar a ligação;
    - para a equipe, "Quem liga é Marina Ribeiro";
    - ao lado, "Enquanto isso": lembretes ficam na Agenda como "não enviados", e avisos de pagamento e de etapa não saem;
    - o contador some.
23. **Celular (Conversas está na barra de baixo, com contador):**
    - Mensagens mostra a lista; ao abrir, a conversa ocupa a tela, com "‹ Conversas" no alto;
    - o contexto do cliente fica num bloco "Sobre Antônia e o caso", que abre e fecha;
    - "Assumir conversa" fica embaixo, perto do polegar.

## Acessibilidade (WCAG 2.2 AA)

- **Conferência automática** em 50 capturas (25 estados × computador e celular), feita pelo `fotos.cjs`. O resultado completo fica em `_conferencia.json`:
  - o axe (WCAG 2.0, 2.1 e 2.2, A e AA) não achou nenhuma violação;
  - nenhuma tela tem rolagem lateral;
  - nenhum erro de script.
- **Alvos:**
  - todos os alvos têm 44 px ou mais. A única exceção do computador é o botão compacto "Corrigir na ficha", de 36 px, na tabela de avisos;
  - a palavra-marca "T3jus" do trilho tem 24 px, como no Clientes aprovado (é da moldura);
  - nos compromissos da lista do dia e nos itens da lista de conversas, o `::after` do link cobre o cartão inteiro, como no padrão aprovado do Console. A exceção está no `fotos.cjs`, com o motivo.
- **Contraste.** Só entram pares do D2 e do conceito Gabinete:
  - a IA usa tinta sobre #F2CDB3 (11,2:1);
  - a equipe usa branco sobre vinho (10,6:1), com o nome em #F2CDB3 (7,15:1);
  - o tempo de espera usa #AC3F6B sobre branco (5,7:1);
  - o número do dia de hoje usa #4F1D35 sobre âmbar, como corrigido no Portal v1;
  - a faixa de prazo usa o contorno #AC3F6B com texto tinta.
- **Estrutura.** Cada dia da semana é uma região com nome ("Quarta, 18 de novembro"). Os compromissos ficam em listas, e o tipo vem escrito e também em texto para leitor de tela. No mês do celular, cada dia diz quantos itens tem e se é feriado. O dia de hoje usa `aria-current="date"`.
- **Formulários:**
  - tipo e onde ficam em `fieldset` com `legend`;
  - os erros ficam ligados ao campo por `aria-describedby`, com `aria-invalid` e resumo no topo;
  - as horas e as datas são texto com `inputmode="numeric"`, como no Clientes.
- **Janelas.** São `<dialog>` com `showModal()`, Esc e foco no primeiro campo. Cancelar compromisso usa `alertdialog`, com "Voltar" no lugar de "Cancelar", como decidido na Equipe.
- **Cor.** Nada depende só dela:
  - tipo de compromisso, prazo, feriado, situação do aviso e estado da conversa têm texto e ícone;
  - os filtros usam `aria-pressed`;
  - o item aberto da lista usa `aria-current`.

## O que precisa de dado novo no servidor

Todas as tabelas têm `escritorio_id` e passam por `proteger_tabela_escritorio`. O escritório vem da sessão, nunca do navegador.

### Tabelas

| Tabela | Campos | Observação |
|---|---|---|
| `compromisso` | `id`, `escritorio_id`, `tipo` (audiencia, cliente, assinatura, interno, outro), `tipo_escrito` (texto curto, obrigatório quando `tipo` é outro), `titulo`, `inicio`, `fim`, `modalidade` (presencial, virtual), `local`, `link_sala`, `cliente_id`, `processo_id`, `responsavel_id`, `lembrete_cliente` (bool), `observacoes`, `situacao` (marcado, cancelado), `cancelado_em`, `cancelado_por`, `motivo_cancelamento`, `criado_por`, `criado_em`, `versao` | Sem DELETE. Remarcar grava o evento com motivo. `link_sala` é obrigatório quando é virtual. A lista de tipos escritos do escritório (para sugestão e legenda) sai de um `SELECT DISTINCT tipo_escrito` por `escritorio_id`. `processo_id` só é aceito de quem tem Jurídico |
| `compromisso_pessoa` | `compromisso_id`, `escritorio_id`, `pessoa_id` | Quem mais vai. O filtro por pessoa olha o responsável e esta tabela |
| `feriado` | `data`, `nome`, `abrangencia` (nacional; depois estadual e municipal) | Tabela global, só leitura. Os prazos (EX-04) também usam |
| `conversa` | `id`, `escritorio_id`, `telefone` (só dígitos), `cliente_id` (pode ser nulo), `contato_id`, `estado` (ia, espera, equipe, resolvida), `responsavel_id`, `motivo`, `esperando_desde`, `assumida_por`, `assumida_em`, `nota_para_ia` | Toda conversa em `espera` tem `responsavel_id` (EX-10). Retirar alguém da equipe passa as conversas dessa pessoa para quem foi escolhido |
| `mensagem` | `id`, `escritorio_id`, `conversa_id`, `de` (cliente, ia, pessoa, aviso, sistema), `pessoa_id`, `texto`, `anexo_id`, `enviada_em`, `situacao_entrega` (enviada, entregue, lida, falhou), `motivo_falha` | Só inserção. Os momentos da conversa (passou, assumiu, devolveu, resolveu, trocou de responsável) são mensagens `sistema` |
| `aviso_regra` | `escritorio_id`, `tipo` (pagamento_recebido, parcela_vai_vencer, parcela_atrasada, etapa_caso, lembrete_audiencia, prestacao_contas), `ligado`, `quando` (ex.: dias antes ou depois) | Só a sócia dona muda. Cada mudança vai para o histórico do escritório |
| `aviso_enviado` | `id`, `escritorio_id`, `tipo`, `cliente_id`, `contato_id`, `origem` (compromisso, parcela, etapa, repasse), `origem_id`, `mensagem_id`, `agendado_para`, `enviado_em`, `situacao` | O lembrete de audiência nasce agendado quando o compromisso é marcado e é cancelado se o compromisso for cancelado ou remarcado |
| `rascunho_cliente` | `conversa_id`, `escritorio_id`, `nome`, `telefone`, `assunto`, `melhor_horario` | VA-03, a validar. Sem dado sensível. Some quando o cliente é cadastrado |

### API

| Rota | O que faz | Erros |
|---|---|---|
| `GET /v1/agenda?de=&ate=&pessoa=` | Compromissos do período, feriados e, só para quem tem Jurídico, os prazos (o servidor manda sem para quem não tem) | — |
| `POST /v1/compromissos` | Marca o compromisso e agenda os lembretes | `TITULO_OBRIGATORIO`, `TIPO_ESCRITO_OBRIGATORIO`, `FIM_ANTES_DO_INICIO`, `LINK_SALA_OBRIGATORIO`, `RESPONSAVEL_INVALIDO`, `AREA_NAO_LIBERADA` (processo sem Jurídico) |
| `GET` e `PATCH /v1/compromissos/:id` | Ficha com lembretes e histórico. Editar usa a `versao`; mudar data ou hora pede `motivo` | 409 `CONFLITO_VERSAO`, `MOTIVO_OBRIGATORIO` |
| `POST /v1/compromissos/:id/cancelar` | Cancela com motivo e, se pedido, avisa o cliente | `MOTIVO_OBRIGATORIO` |
| `GET /v1/conversas?estado=&q=` | Lista com contagens por estado (o contador da barra vem daqui) | — |
| `GET /v1/conversas/:id` | Mensagens e contexto. O contexto vem filtrado pelas áreas: "Caso" só com Jurídico, valores só com Financeiro | — |
| `POST /v1/conversas/:id/assumir`, `/devolver`, `/passar` | Muda o estado e grava a mensagem `sistema`. Devolver aceita `nota_para_ia` e `registrar_atendimento`. Passar exige `responsavel_id` ativo | `JA_ASSUMIDA` (com quem), `RESPONSAVEL_INVALIDO` |
| `POST /v1/conversas/:id/mensagens` | Envia pela conta do escritório, só se a conversa está com a pessoa | `NAO_ASSUMIDA`, `WHATSAPP_NAO_LIGADO`, `JANELA_24H` (o WhatsApp só deixa responder em até 24 h sem modelo aprovado) |
| `GET /v1/avisos?tipo=&de=` e `GET`/`PATCH /v1/avisos/regras` | Avisos enviados e regras. Mudar regras é só da sócia dona | `SEM_PERMISSAO` |
| `GET /v1/whatsapp` | Se o número do escritório está ligado; a moldura usa para o estado `nao-conectado` | — |

### Para o painel

- A entrega da Agenda atende EX-06, EX-11 e PD-04, e atende PD-07 só na agenda. EX-13 fica como lugar reservado: não citar.
- A entrega das Conversas atende EX-14 e FI-12 só na parte do envio. O cálculo da prestação de contas é do Financeiro e fica pendente lá. VA-03 fica como hipótese: não citar.
- Itens "pendente" para o painel:
  - ligação do número de WhatsApp de cada escritório (depende de conta no provedor e de modelos de mensagem aprovados pela Meta);
  - modelo de texto por etapa do caso (EX-14), que depende das etapas definidas pelo escritório (EX-07);
  - sincronização com Google Agenda e Outlook (EX-13), se os pilotos pedirem.

## Perguntas para a Carol

1. **A área Conversas pode ter duas seções, Mensagens e Avisos automáticos?** **Recomendo que sim.** Os avisos saem pelo mesmo número e as respostas dos clientes caem em Mensagens, então o lugar de conferir o que saiu é ao lado. A outra opção seria pôr os avisos no Financeiro e no Jurídico, cada um com os seus. O risco é ninguém ver o aviso que não foi entregue.
2. **Quem vê as conversas?** **Recomendo: todos da equipe veem Mensagens, porque é comum, mas o contexto e os avisos seguem as áreas.** Quem não tem Financeiro não vê avisos de pagamento nem valores; quem não tem Jurídico não vê o bloco do caso. O texto que o cliente escreveu aparece para todos, porque quem atende precisa ler. A outra opção seria cada pessoa ver só as conversas de que é responsável. Isso protege mais o sigilo, mas trava a recepção quando o responsável falta.
3. **Qualquer pessoa pode assumir uma conversa que tem outro responsável?** **Recomendo que sim**, com a troca registrada na conversa e um aviso no sino do responsável. Assim o cliente não fica esperando quando o responsável está em audiência. A outra opção seria só o responsável e a sócia dona poderem assumir.
4. **Vale perguntar aos pilotos sobre Google Agenda e Outlook antes de fazer?** **Recomendo deixar só o lugar reservado (EX-13 segue [VAL])** e perguntar na conversa com a advogada parceira se ela usa outra agenda no celular. Sincronizar nos dois sentidos é caro e cria conflito de edição. Se pedirem, o primeiro passo barato é um link de assinatura (só leitura) para o Google Agenda.
5. **O lembrete de audiência sai por padrão em toda audiência, 1 dia e 2 horas antes?** **Recomendo que sim, já marcado e desmarcável em cada compromisso**, com os horários mudando só nas regras da sócia dona. A outra opção seria a pessoa marcar o lembrete toda vez. O risco é esquecer justo na conciliação, onde faltar gera multa.
