# Portal: Clientes · notas

A tela Clientes do Portal do advogado (rota `/clientes`, hoje "em breve"), para a Carol aprovar antes de virar código. Ela atende:

- AP-01: cadastro único de clientes e contatos, com a qualificação usada nos documentos e a situação (ativo ou inativo);
- AP-02: histórico de atendimento;
- AP-04: origem dos contatos;
- AP-06: acompanhamento e próximo contato.

Pesam também PT-02 (cada pessoa vê o mínimo), PT-03 (nada é apagado em silêncio), PT-10 (WCAG 2.2 AA, celular e estados), PT-11 (LGPD: cadastro mínimo e finalidade por campo), PT-19 (edição simultânea) e PT-25 (lista, ficha, criar e editar no mesmo padrão). A ficha já reserva lugar para CH-08 (procuração com os dados do cliente) e EX-01 (um processo com vários clientes).

A tela parte do Portal v1 aprovado: moldura, barra de baixo no celular, CSS e peças. O cabeçalho da ficha é o da ficha aprovada do Console v1, sem mudança. Os padrões de busca, histórico com motivo, janelas e aviso de sucesso vêm do Suporte de acesso aprovado. As peças novas têm o prefixo `cl-`. A marca ficou como está nos HTML aprovados.

## Como abrir

- `index.html` mostra os 32 estados em computador (1440) e celular (412), com legenda. Clique numa imagem para abrir o HTML naquele estado.
- `clientes.html` abre sozinho, com as fontes, o CSS e os ícones embutidos. O `index.html` usa o Google Fonts.
- O estado vem do endereço, por exemplo `clientes.html?estado=ficha`, `?estado=novo-duplicado` ou `?estado=conflito`. No celular, `&mais=1` abre a folha Mais.
- Abaixo de 760 px, o HTML vira a versão de celular. Funcionam os botões que abrem e fecham janelas, o Esc, o Mais e o abrir e fechar da qualificação. O resto é desenho.
- As capturas de celular mostram a página inteira, com a barra de baixo no fim. Com janela aberta, a captura mostra só a tela.
- A pasta `_fonte/` guarda os scripts e `sh _fonte/gerar.sh` refaz tudo:
  - `comum.py` é a cópia sem mudança do Portal v1;
  - `clientes.py` gera o HTML;
  - `casos.py` gera a lista de estados e o `index.html`;
  - `fotos.cjs` faz as capturas com deviceScaleFactor 2 e roda as conferências;
  - `webp.py` converte as capturas para WebP.
- Todos os dados são fictícios. Os CPFs e o CNPJ foram gerados com dígitos válidos, e os e-mails usam o domínio `exemplo.com.br`.

## Decisões de design

1. **Clientes é parte comum, como no Portal v1 aprovado.** Todos da equipe abrem o item Clientes. A área Comercial libera o que é dela:
   - a origem;
   - o próximo contato;
   - o filtro "Contato vencido";
   - a aba Atendimentos.

   Quem não tem Comercial (o exemplo é Larissa, só com Jurídico) vê a lista com nome, tipo, contato principal e situação. Na ficha, vê dados, qualificação e contatos. Ela pode cadastrar e editar, porque a qualificação serve à procuração do Jurídico e dos Contratos. As colunas e a aba que faltam não aparecem como bloqueadas: uma linha diz que ficam na área Comercial e que quem libera é a sócia dona. O servidor manda a lista já sem esses campos (estados `lista-sem-comercial` e `ficha-sem-comercial`). Esta decisão é a pergunta 1.
2. **Lista:**
   - fica numa folha, abaixo do cabeçalho âmbar com padrão, como a Equipe aprovada. O botão "Novo cliente" fica no cabeçalho;
   - a busca é uma só, por nome, CPF, CNPJ ou telefone. O servidor compara só os dígitos, então "(11) 99123" e "1199123" acham o mesmo cliente. A busca olha também os contatos: "Prado" acha a cliente pela filha;
   - os filtros são três: Ativos (o padrão), Inativos e Contato vencido;
   - cada linha mostra nome e tipo, contato principal com o papel e o telefone, origem, próximo contato com o responsável, e situação;
   - a linha com contato vencido ganha um filete à esquerda e o selo de urgência com quantos dias. O contato de hoje ganha o selo de atenção "Hoje". Nada depende só de cor;
   - a lista não mostra CPF nem endereço (cadastro mínimo à vista, PT-11). Esses dados só aparecem na ficha;
   - no celular, a tabela vira cartões, como no Console. O cartão inteiro é o link.
3. **Cadastrar é uma página, não uma janela.** Com a qualificação aberta, o formulário fica longo demais para uma janela.
   - **O obrigatório é só nome e um telefone ou e-mail.** O CPF ou CNPJ é opcional, mas fica logo no começo, porque é a melhor chave contra cadastro duplicado.
   - **A qualificação vem fechada** num bloco "Qualificação para procuração e contrato", com o botão "Preencher agora". Quem tem os dados na mão preenche já; os outros completam depois.
   - **Cada campo diz para que serve.** O selo "procuração" vai no rótulo dos dados que entram na procuração e no contrato. Os outros campos trazem a finalidade na ajuda: "Para falar com o cliente", ou "Para saber de onde vêm os clientes. Não vai em documento". No topo da qualificação, uma faixa diz que só se pede o que vai para a procuração e o contrato, e que o escritório é o controlador.
   - **Pessoa física:** nacionalidade, estado civil, profissão, RG com órgão emissor, CEP, endereço, bairro, cidade e UF. Não há data de nascimento nem foto de documento.
   - **Pessoa jurídica:** razão social, CNPJ e sede. Em "Quem assina pela empresa" vai o representante legal: nome, cargo, CPF, estado civil e profissão. O contato da PJ é uma pessoa, com papel.
   - **Erros:** seguem o padrão aprovado (resumo no topo, erro preso ao campo com `aria-invalid` e `aria-describedby`, botão nunca desabilitado). O CPF e o CNPJ têm conferência de dígito. A mensagem diz o que fazer: ver se algum número foi trocado, ou deixar em branco por agora. Com o dígito certo, aparece "Dígitos conferidos".
   - **Possível duplicado avisa e não bloqueia.** Mesmo CPF, CNPJ ou telefone de outro cliente gera um aviso âmbar logo abaixo do campo, com o nome, a situação e "Abrir a ficha de …". O texto diz quando é certo cadastrar assim mesmo, como um parente que usa o mesmo número. O botão Cadastrar continua valendo.
4. **Ficha:**
   - o cabeçalho é o da ficha aprovada do Console: o vinho com a estátua (aqui, a balança) e o corte para o âmbar;
   - no vinho ficam o tipo, o nome, a situação e "cliente desde";
   - **o âmbar mostra o próximo contato**: a data, o selo "vencido há 5 dias", o que fazer, o responsável e o botão "Registrar atendimento". É o ponto de ação da ficha e o "ponto de atmosfera" do conceito Gabinete;
   - para quem não tem Comercial, o âmbar mostra quanto da procuração está pronto ("5 de 7 dados") e "Completar qualificação";
   - abaixo, duas abas: Ficha e Atendimentos.
5. **Aba Ficha:**
   - "Dados e qualificação" usa o `dados-ficha` aprovado. O dado que falta aparece como "Falta", com o selo "pede para a procuração";
   - os contatos são vários, cada um com papel (ex.: "Filha · acompanha o caso") e o selo "Principal" no que o escritório procura primeiro. A própria cliente pode não ser a principal;
   - na lateral ficam:
     - "Para gerar a procuração": quantos dados estão prontos, o que falta e o atalho para completar (CH-08);
     - a origem, com quem indicou, o primeiro contato e quem cadastrou;
     - "Contratos e casos": um espaço tracejado que diz o que vai aparecer ali, sem nada inventado. Ele já diz que um processo pode ter mais de um cliente (EX-01);
     - a situação, com Inativar.
6. **Aba Atendimentos:**
   - o histórico segue o desenho aprovado: agrupado por dia, com hora, quem atendeu e o canal (selo). Depois vem com quem falou, o resumo em Alegreya itálico e o próximo contato que aquele atendimento marcou;
   - se o próximo contato venceu, um aviso de urgência abre a folha e diz qual era e com quem;
   - **registrar** abre uma janela com:
     - data e hora (o padrão é agora);
     - canal: WhatsApp, Telefone, Presencial, E-mail ou Videochamada;
     - quem atendeu (o padrão é você);
     - com quem falou (os contatos da ficha, ou "Outra pessoa");
     - o resumo, com contador de até 2000 caracteres;
     - o grupo "Próximo contato", que substitui o marcado: data, responsável e o que fazer, ou "Sem próximo contato";
   - a data do próximo contato no passado dá erro;
   - não se edita nem se apaga um atendimento: para corrigir, registra-se outro (pergunta 3). Isso está escrito na janela e na lateral.
7. **Editar** é um estado da aba Ficha, como no Console aprovado. É o mesmo formulário do cadastro, preenchido (PT-25), com a qualificação aberta e os contatos em blocos: nome, papel, telefone, e-mail, "Contato principal" e remover.
8. **Conflito de edição (PT-19)** é igual ao do Console aprovado:
   - o aviso diz quem salvou antes e a hora ("Felipe Matos salvou esta ficha às 14h52, enquanto você editava");
   - compara só os campos que mudaram;
   - oferece "Salvar a minha versão" ou "Ficar com a versão salva";
   - os campos em conflito ganham o selo "Mudou". O que a pessoa escreveu continua no formulário.
9. **Inativar, não apagar (PT-03):**
   - a janela é um `alertdialog` com o botão de perigo e motivo obrigatório. Ela explica que nada é apagado, que o próximo contato marcado é encerrado e que dá para reativar;
   - o cliente inativo some da lista do dia a dia, mas continua no filtro Inativos, na busca e na exportação do escritório;
   - a ficha do inativo mostra uma faixa com quem inativou, quando e o motivo, mais o botão Reativar;
   - reativar tem motivo opcional e devolve tudo como estava;
   - não existe botão de apagar cliente. O pedido de exclusão feito pelo titular (LGPD) é a pergunta 5.
10. **O cadastro fica registrado.** Cadastrar, editar (com os campos), inativar e reativar vão para o histórico do escritório, com autor e hora. O formulário avisa isso no rodapé. O histórico de atendimento é outra coisa: é o que se conversou com o cliente.
11. **Celular:**
    - Clientes mora no Mais, então o botão Mais fica marcado como atual, como decidido no Portal v1;
    - a lista vira cartões e a ficha empilha cabeçalho, âmbar, abas (em botões de 44 px) e folhas;
    - nas janelas, os botões ficam no rodapé fixo da janela.

## Acessibilidade (WCAG 2.2 AA)

- **Conferência automática** em 64 capturas (32 estados × computador e celular), feita pelo `fotos.cjs`. O resultado completo fica em `_conferencia.json`:
  - o axe (WCAG 2.0, 2.1 e 2.2, A e AA) não achou nenhuma violação;
  - nenhuma tela tem rolagem lateral;
  - nenhum erro de script.
- **Alvos:**
  - no celular, todos os alvos têm 44 px ou mais;
  - no computador, todos os alvos das peças desta tela têm 44 px ou mais;
  - a única exceção é a palavra-marca "T3jus" no alto do trilho, com 24 px de altura. Ela é da moldura aprovada e não foi mexida, porque o logo está sendo trocado em outra frente. Mesmo assim, ela cumpre o mínimo de 24 px da WCAG 2.5.8. Vale dar 44 px a ela no logo novo;
  - o link do nome no cartão do celular não conta como alvo pequeno, porque o `::after` dele cobre o cartão inteiro (padrão aprovado do Console). A exceção está no `fotos.cjs`, com o motivo.
- **Contraste.** Só entram pares do D2 e do conceito Gabinete. O selo "procuração" usa vinho sobre sal-2 (9:1). O selo de vencido é branco sobre #AC3F6B (5,7:1).
- **Formulários:**
  - cada campo tem `label`;
  - tipo de cliente e "Próximo contato" ficam em `fieldset` com `legend`;
  - os erros ficam ligados ao campo por `aria-describedby`, com `aria-invalid`, e há um resumo no topo;
  - os campos de documento usam `inputmode="numeric"`, e as datas são texto dd/mm/aaaa, para não depender do calendário do navegador.
- **Qualificação.** O bloco é um `<details>` com `summary`: funciona por teclado e leitor de tela, sem script.
- **Estados.** O carregando usa `aria-busy` e um texto só para leitor de tela. O erro usa `role="alert"`, e a contagem da busca e o sucesso usam `role="status"`.
- **Janelas.** São `<dialog>` com `showModal()`, e o Esc fecha. O foco começa no primeiro campo, ou no campo com erro quando há erro.
- **Cor.** Vencido, hoje e inativo têm selo escrito e ícone, além da cor.

## O que precisa de dado novo no servidor

Todas as tabelas têm `escritorio_id` e passam por `proteger_tabela_escritorio`. O escritório vem da sessão, nunca do navegador.

### Tabelas

| Tabela | Campos | Observação |
|---|---|---|
| `cliente` | `id`, `escritorio_id`, `tipo` (pf, pj), `nome`, `documento` (CPF ou CNPJ, só dígitos), `email`, a qualificação (abaixo), `origem`, `origem_indicacao`, `situacao` (ativo, inativo), `inativado_em`, `inativado_por`, `motivo_inativacao`, `prox_contato_data`, `prox_contato_responsavel_id`, `prox_contato_oque`, `criado_por`, `criado_em`, `versao` | Sem índice único no documento: o duplicado é aviso, não bloqueio. Índice no documento e nos telefones normalizados, por escritório |
| `cliente_contato` | `id`, `escritorio_id`, `cliente_id`, `nome`, `papel`, `telefone` (só dígitos), `email`, `principal`, `ordem` | Até 10 por cliente; cada um com telefone ou e-mail; um só principal |
| `atendimento` | `id`, `escritorio_id`, `cliente_id`, `ocorrido_em`, `canal`, `contato_id` ou `com_quem_nome`, `atendido_por`, `resumo` (até 2000), `prox_data`, `prox_responsavel_id`, `prox_oque`, `criado_por`, `criado_em` | Sem UPDATE nem DELETE na API (e negado na RLS). Registrar com próximo contato atualiza o `cliente` na mesma transação |
| Histórico do escritório | Eventos `cliente_cadastrado`, `cliente_editado` (campos antes e depois), `cliente_inativado` (motivo), `cliente_reativado` (motivo) e `contato_incluido` ou `contato_removido` | Na mesma tabela de eventos da Equipe |

### Finalidade de cada campo (PT-11, inventário por tipo de dado)

| Campo | Finalidade | Obrigatório |
|---|---|---|
| Nome ou razão social | Identificar o cliente; vai na procuração e no contrato | Sim |
| Telefone e e-mail do cliente e dos contatos | Falar com o cliente e com quem o acompanha | Um dos dois |
| Nome e papel do contato | Saber com quem se fala e em nome de quem | Nome sim, papel não |
| CPF ou CNPJ | Procuração e contrato; evitar cadastro duplicado | Não |
| Nacionalidade, estado civil, profissão | Qualificação na procuração e no contrato | Não |
| RG e órgão emissor | Qualificação na procuração | Não |
| CEP, endereço, bairro, cidade, UF (sede, na PJ) | Qualificação na procuração e no contrato | Não |
| Representante legal (nome, cargo, CPF, estado civil, profissão) | Quem assina pela PJ na procuração e no contrato | Não |
| Origem e quem indicou | Saber de onde vêm os clientes (Comercial); não vai em documento | Não |
| Resumo do atendimento | Continuidade do atendimento; sigiloso (só Comercial) | Sim, ao registrar |
| Próximo contato | Acompanhamento (AP-06) | Não |
| Motivo de inativar | Auditoria e reativação | Sim, ao inativar |

### API

| Rota | O que faz | Erros |
|---|---|---|
| `GET /v1/clientes?q=&situacao=&vencidos=&cursor=` | Busca por nome, documento ou telefone (só dígitos), incluindo os contatos. Ordem: vencidos primeiro no filtro, depois alfabética. Sem Comercial, vem sem `origem` e sem `prox_contato_*`, e `vencidos` é recusado (403) | `AREA_NAO_LIBERADA` |
| `GET /v1/clientes/possiveis-duplicados?documento=&telefone=` | Lista nome, situação e "desde" de quem já tem o documento ou o telefone. Usado ao sair do campo | — |
| `POST /v1/clientes` | Cadastra com o mínimo e o que vier da qualificação | `NOME_OBRIGATORIO`, `CONTATO_OBRIGATORIO`, `CPF_INVALIDO`, `CNPJ_INVALIDO` |
| `GET /v1/clientes/:id` | Ficha, com `versao` e a contagem do que falta para a procuração (calculada no servidor, para servir também a CH-08) | 404 de outro escritório |
| `PATCH /v1/clientes/:id` | Edita dados, qualificação e contatos com a `versao` lida | 409 `CONFLITO_VERSAO`, com `salvo_por`, `salvo_em` e os campos que mudaram |
| `POST /v1/clientes/:id/inativar` e `/reativar` | Muda a situação, encerra o próximo contato e grava o evento | `MOTIVO_OBRIGATORIO`, `SEM_PERMISSAO` |
| `GET` e `POST /v1/clientes/:id/atendimentos` | Lista e registra atendimento (só Comercial) | `RESUMO_OBRIGATORIO`, `DATA_NO_PASSADO`, `RESPONSAVEL_INVALIDO`, `AREA_NAO_LIBERADA` |

### Para o painel

- A entrega desta tela atende AP-01, AP-02, AP-04 e AP-06.
- CH-08 e EX-01 só ganham o lugar reservado: não citar como atendidas.
- Dois itens "pendente" para o painel:
  - o próximo contato vencido avisar no Início do responsável (AP-06);
  - o pedido de exclusão do titular (PT-11), conforme a pergunta 5.

## Perguntas para a Carol

1. **Quem não tem a área Comercial vê os clientes?** Proposta: vê a lista e a ficha (dados, qualificação e contatos), cadastra e edita, mas não vê origem, próximo contato nem o histórico de atendimento. A outra opção seria esconder a página inteira de quem não tem Comercial, mas o Jurídico e os Contratos precisam da qualificação para a procuração, e a recepção precisa do telefone. **Recomendo a proposta**, como está nos estados `lista-sem-comercial` e `ficha-sem-comercial`.
2. **Quem pode inativar e reativar um cliente?** **Recomendo: quem tem Comercial e a sócia dona.** Quem cuida do relacionamento decide quando ele acaba, e tudo fica no histórico com o motivo. A outra opção seria todos da equipe; o risco é a recepção inativar por engano um cliente com caso em andamento.
3. **Atendimento registrado pode ser editado?** **Recomendo que não**: para corrigir, registra-se outro atendimento dizendo o que mudou. Isso segue PT-03, e o histórico vale como prova do que foi combinado. Se pesar no dia a dia, a saída menos arriscada é permitir corrigir só nos primeiros 15 minutos, com a versão anterior guardada.
4. **A lista de origens é fixa ou cada escritório monta a sua?** **Recomendo fixa nesta versão:** Indicação de cliente, Indicação de advogado ou parceiro, Google, Instagram, Site do escritório, Passou no escritório e Outra, mais o campo "Quem indicou". Uma lista fixa deixa o relatório de origem (AP-03 e AP-04) comparável entre escritórios. Dá para abrir a lista para a sócia dona depois, se os pilotos pedirem.
5. **O que fazer quando o cliente pede para apagar os dados dele (LGPD)?** Nesta tela não existe apagar, só inativar. **Recomendo deixar o pedido fora desta entrega**, como item "pendente" de PT-11 no painel. Depois, ele vira um fluxo próprio, feito pela sócia dona, que anonimiza nome, documento, contatos e resumos e guarda só o que a lei obriga a manter (por exemplo, o que está em processo ou contrato). Até lá, o pedido é tratado com o suporte T3jus.
