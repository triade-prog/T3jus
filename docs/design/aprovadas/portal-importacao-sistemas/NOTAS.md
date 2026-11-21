# Clientes: Importar do Astrea e do ADVBOX · notas

> **Aprovado pela Carol em 21/11/2026, às 20h37 (Bahia).** Ela respondeu "aprovado" sem mudar nada. As 4 perguntas do fim seguem a recomendação até ela dizer o contrário: processos entram como casos (só os ativos, sem contrato); o financeiro do sistema antigo entra só como informação; importar de outro sistema é só da sócia dona; programar primeiro o backup do Astrea e a planilha do ADVBOX, e a conexão com a API do ADVBOX depois.

O desenho da importação direta de outros sistemas, no Portal do advogado, para a Carol aprovar antes de virar código. O caso de uso: o escritório chega ao T3jus vindo do Astrea ou do ADVBOX e quer trazer os clientes e os processos sem redigitar e sem montar planilha à mão.

Atende F3.56 (pendente no painel) e VA-05 (a validar): importação de dados de planilhas e de outros sistemas. Em 20/11/2026 a Carol decidiu que isso “fica para depois”; este desenho existe para quando for a hora, e as perguntas do fim dizem por onde começar.

Usa e não muda:

- **a importação de planilha aprovada** (`docs/design/aprovadas/portal-importacao/`, 20/11/2026) e o que já foi programado dela (`importacao.ts`, `Importacao.tsx`, migração `0420`): os quatro passos, a ligação de colunas, os pares de valores, a prévia com os quatro números, o duplicado que junta só os campos vazios, a confirmação, tudo ou nada, o resultado, o histórico, o desfazer em 7 dias e o arquivo apagado ao fim. As 4 respostas daquela rodada valem aqui;
- AP-01 e o Clientes aprovado (campos, conferência de CPF e CNPJ, lista fixa de origens);
- EX-01, EX-07, EX-10, EX-14 e o Jurídico aprovado: o caso com nome “Cliente x Parte contrária”, número CNJ, área, tribunal e sistema, as 8 etapas do escritório, o responsável obrigatório e a marca “sem contrato” até a área Contratos ligar um (CH-05);
- FI-01 a FI-03: ninguém digita parcela no Financeiro; a cobrança nasce do contrato;
- PT-03, PT-04, PT-07, PT-09, PT-10 e PT-11, e os textos no tom aprovado em 21/11/2026 (sem exclamação, sem código técnico na tela, erro dizendo o que houve, o que continua igual e o que fazer).

A tela parte do Portal v1 aprovado e da importação de planilha aprovada, sem mudança. As peças novas têm o prefixo `is-`.

## O que a pesquisa achou (21/11/2026)

- **Astrea (Aurum):** não tem API pública. Tem backup completo em .xlsx: o administrador vai em Administração (engrenagem) › aba Escritório › “Manutenção de conta” › “clique aqui”, e em até 24 horas chega o e-mail “Seu backup do Astrea está pronto” com o link. As abas e colunas do backup **não são publicadas**: os nomes usados no desenho (Contatos, Processos, Lançamentos, Tarefas, Agenda, Publicações) são ilustrativos e precisam ser conferidos com o backup real de um piloto antes de programar.
- **ADVBOX:** tem API (`https://app.advbox.com.br/api/v1`, `Authorization: Bearer <token>`), no plano “API para Escritórios”, a partir de R$ 280 por mês; a documentação diz que o token é entregue a parceiros e integradores aprovados. Limites: 30 leituras por minuto e 500 gravações por dia. Leitura: `/settings` (pessoas, origens, etapas e tipos de ação), `/customers`, `/lawsuits`, `/movements/{id}`, `/posts` (tarefas), `/transactions` (financeiro) e `/documents`. **Não há contratos** nem backup. Os relatórios do ADVBOX exportam planilha, sem as colunas publicadas.

## Como abrir

- `index.html` mostra os 21 estados em computador (1440) e celular (412), com legenda. Clique numa imagem para abrir o HTML naquele estado.
- `publicar.html` é o mesmo `index.html` com as capturas embutidas (10,6 MB), para publicar como uma página só.
- `sistemas.html` abre sozinho, com as fontes, o CSS e os ícones embutidos. O estado vem do endereço, por exemplo `sistemas.html?estado=origem`, `?estado=advbox-token-erro` ou `?estado=previa-casos`. No celular, `&mais=1` abre a folha Mais. Os links para a planilha levam à importação aprovada, em `../portal-importacao/`.
- Abaixo de 760 px, o HTML vira a versão de celular. Funcionam os botões que abrem e fecham janelas, o Esc e o Mais. O resto é desenho.
- As capturas de celular mostram a página inteira, com a barra de baixo no fim. Com janela aberta, a captura mostra só a tela.
- A pasta `_fonte/` guarda os scripts, e `sh _fonte/gerar.sh <pasta>` refaz tudo (precisa do `@axe-core/playwright` instalado ao lado ou da variável `AXE_DIR`, e do `playwright` achável pelo node, por exemplo com `NODE_PATH`):
  - `comum.py`, `pecas.py`, `clientes.py`, `contratos.py`, `importacao.py`, `fotos.cjs`, `webp.py` e `publicar.py` são cópias sem mudança da importação de planilha aprovada;
  - `sistemas.py` gera o HTML. Ele carrega as definições do `importacao.py` (sem gerar o HTML dele) e acrescenta as peças `is-`;
  - `casos.py` é o `casos.py` aprovado com os estados e textos desta rodada.
- Todos os dados são fictícios. CPFs, CNPJs e números de processo (CNJ, módulo 97) foram gerados com dígitos válidos; os errados de propósito são o CPF da linha C5 e o número do processo da linha P16. Os e-mails usam `exemplo.com.br`. O elenco é o de sempre (Ribeiro & Matos; Marina Ribeiro, sócia dona; Felipe Matos; Larissa Costa; Paula Nunes; Antônia Ferreira Prado, já cadastrada), mais clientes que só existem no sistema antigo. As marcas Astrea e ADVBOX aparecem só como nome, em texto, sem logo, cor ou tela deles.

## Decisões de design

### Entrada

1. **O botão de Clientes passa de “Importar planilha” para “Importar dados”** e abre a escolha da origem (estado `origem`). A planilha continua sendo o primeiro cartão e cai no fluxo aprovado sem mudança. O botão de Contratos continua “Importar planilha”, porque contrato só vem de planilha.
2. **A escolha da origem é uma página antes dos passos, com três cartões:** Planilha, Astrea e ADVBOX. Cada cartão diz o que traz e o que não traz (com ícone e texto, não só cor) e quanto tempo leva. “Usa outro sistema?” manda para a planilha: quase todos exportam, e a ligação de colunas serve para qualquer uma. Não há cartão para sistemas sem caminho conhecido.
3. **Na lista vazia de Clientes, a importação é a ação principal**, com as três origens logo embaixo como atalhos (estado `clientes-vazio`).
4. **A origem aparece escrita em tudo:** um selo (“Astrea · backup”, “ADVBOX · conexão”, “ADVBOX · planilha”, “Planilha”) no cabeçalho do fluxo, no caso aberto na prévia, no resultado, no histórico e na ficha de cada cliente e caso importado.

### Astrea, pelo backup

5. **O passo a passo é só texto**, com os nomes dos menus do Astrea num “caminho” (Administração (engrenagem) › Escritório; Manutenção de conta › clique aqui) e o assunto do e-mail que chega. Nada imita a tela do Astrea. Uma linha diz que os nomes são os de novembro de 2026 e que a pessoa pode sair enquanto espera as 24 horas (estado `astrea-pedir`).
6. **O backup tem limites maiores que a planilha:** até 20 MB e 10.000 linhas por aba (a planilha segue com 5 MB e 2.000), porque o backup traz o escritório inteiro. O aviso LGPD diz que só as abas escolhidas são lidas e que o arquivo é apagado ao fim, ao cancelar ou em 24 horas.
7. **As abas são reconhecidas pelo “modelo do Astrea”** (estado `astrea-abas`): Contatos vira clientes e partes contrárias; Processos vira casos no Jurídico; Lançamentos vira histórico financeiro, só informação. Tarefas, Agenda e Publicações ficam de fora, cada uma com o motivo. Os processos arquivados ficam de fora por padrão, com a opção de entrar como encerrados (pergunta 1).
8. **As colunas já vêm ligadas** (estado `astrea-colunas`), na tabela aprovada, com o selo novo “Pelo modelo do Astrea”. As três abas ficam em abas da página. Observações e etiquetas ficam de fora (cadastro mínimo, PT-11).
9. **O contato do Astrea não é sempre cliente.** O par de valores da coluna “Tipo” separa: “Cliente” vira cliente; “Parte contrária” entra só como parte contrária no caso de cada processo; testemunha, perito e correspondente ficam de fora. Assim o cadastro de clientes não se enche de terceiros.
10. **Backup diferente do esperado** (estado `astrea-diferente`): o que foi reconhecido segue ligado; abas e colunas novas ficam marcadas “Não reconhecida” (selo de atenção, com texto) e esperam a escolha, com um resumo no topo com links. Uma aba de honorários pode ser ligada “como a planilha de clientes e contratos”, e aí segue o fluxo aprovado. O T3jus recebe só os nomes das abas e colunas novas, sem nenhum dado, para atualizar o modelo. Se a pessoa enviou a exportação de contatos em vez do backup, ela segue como planilha comum.

### ADVBOX, pela conexão ou pela planilha

11. **Dois caminhos, com o custo dito** (estado `advbox-escolha`): pela conexão, para quem já tem o plano “API para Escritórios”; pela planilha, sem custo. A tela recomenda não contratar o plano só para importar. Uma faixa explica por que contratos não vêm do ADVBOX (não há contratos na API, e os relatórios não trazem as condições de honorário).
12. **O token** (estado `advbox-token`): onde achar (o ADVBOX entrega a quem tem o plano; pedir ao suporte deles, para consulta), o campo de senha com “Mostrar” e a lista do que o T3jus faz com ele: só lê; lê as listas do escritório, clientes, processos e lançamentos; não lê tarefas, andamentos e documentos; guarda cifrado no servidor só durante a leitura e apaga ao terminar, ao cancelar ou em 24 horas; e a sugestão de revogar o token depois. **Recomendo esse caminho, com o token apagado ao fim da leitura**, e não ao fim da importação: depois de lido, o T3jus não precisa mais dele.
13. **“Testar a conexão” só confere o token e lê as listas** (`GET /settings`). A leitura pesada começa só quando a pessoa manda (estado `advbox-conectado`), depois de ver o que vai ser lido e quanto tempo leva.
14. **Erros de conexão no tom aprovado** (estado `advbox-token-erro`): o token recusado aparece no topo e preso ao campo, dizendo que nada foi lido e que o token foi apagado. Ao lado: plano sem API (com botão para a planilha), pausa pedida pelo ADVBOX (seguimos sozinhos), ADVBOX fora do ar (tentamos de novo e avisamos no sino) e token que parou de valer no meio (o que foi lido fica 24 horas; com um token novo, segue de onde parou). Nenhum código técnico na tela.
15. **A leitura roda em segundo plano** (estado `advbox-lendo`): andamento por tipo de dado (listas, clientes, processos, lançamentos), início e previsão de término, e a pausa do ADVBOX explicada (“é o limite de leituras por minuto dele; nada se perde”). Com 30 leituras por minuto e uma leitura por processo, um escritório de 520 clientes e 384 processos leva cerca de 40 minutos; a tela diz isso antes de começar. Pode fechar a página: o aviso chega no sino aprovado (F3.57) com o texto “A leitura do ADVBOX terminou. 520 clientes, 384 processos e 2.310 lançamentos lidos. Nada entrou ainda.” e leva ao passo 2.
16. **Os valores do ADVBOX viram itens do T3jus uma vez por valor** (estado `advbox-valores`): pessoas do ADVBOX para a Equipe (quem não está na Equipe vai para quem a pessoa escolher, EX-10), origens para a lista fixa, etapas do ADVBOX para as 8 etapas do escritório e tipos de ação para a área. É o mesmo componente dos pares da planilha.
17. **Sem plano de API, a planilha** (estado `advbox-planilha`): exportar o relatório de clientes e importar; depois, se quiser, o de processos, que se liga aos clientes já cadastrados pelo CPF, CNPJ ou nome. Cai no passo 2 da importação aprovada, com as colunas ligadas “pelo modelo do ADVBOX”. Pela planilha, o financeiro fica de fora.

### A prévia, o que entra e o resultado

18. **A prévia é a aprovada, com uma aba por tipo de dado:** Clientes, Casos e Financeiro, cada uma com a quantidade e o que ainda pede a pessoa. Os quatro números e os filtros valem para a aba aberta. Cada linha leva o código da aba do backup (C de Contatos, P de Processos, L de Lançamentos; no ADVBOX, o número do registro lá), para a pessoa achar a linha no sistema antigo.
19. **Clientes** (estado `previa-sistema`): as mesmas regras da planilha (duplicado pelo CPF junta só os campos vazios; CPF errado se corrige ou se importa sem CPF). A linha mostra quantos casos e lançamentos se ligam ao cliente.
20. **Casos** (estado `previa-casos`): o processo aberto mostra o caso que vai entrar no Jurídico (nome, número, área, tribunal, etapa ligada com o nome antigo entre parênteses, responsável, cliente e papel, parte contrária, valor da causa). Todo caso importado **entra sem contrato**, como no Jurídico. Avisos: mesmo número de um caso que já existe (juntar liga o cliente ao caso existente e não cria outro) e cliente não encontrado (escolher ou pular). Erro: número de processo com dígito de conferência errado (corrigir ou importar sem número).
21. **Não vêm, e a tela diz:** prazos, audiências, tarefas, andamentos e documentos. Prazo trazido sem conferência é risco para o escritório; o resultado pede para cadastrar o próximo prazo de cada caso.
22. **Nenhuma mensagem ao cliente.** A importação não manda WhatsApp (EX-14 fica parado durante a importação); o aviso de mudança de etapa segue a regra do escritório a partir da próxima mudança. A prévia, a confirmação e o resultado dizem isso.
23. **Financeiro só como informação** (estado `previa-financeiro`, pergunta 2): recebidos ficam no histórico da ficha como “pago antes do T3jus”, fora do Caixa e sem recibo (a mesma regra da pergunta 2 aprovada); em aberto **não vira cobrança**: vira um lembrete na ficha do cliente para criar o contrato, porque no T3jus a cobrança nasce do contrato (FI-01); despesas do escritório ficam de fora, porque o Caixa começa no T3jus.
24. **O resumo lateral “O que vai entrar”** soma clientes, casos e o histórico financeiro, e tem um bloco “O que não entra”: nenhum contrato e nenhuma parcela em A receber, nada no Caixa, nenhuma mensagem. O botão “Importar o que está pronto” nunca fica desabilitado.
25. **A confirmação** (estado `confirmar-sistema`) repete o aprovado (tudo ou nada, o arquivo apagado, o prazo de desfazer) e acrescenta “Nenhuma mensagem sai para os clientes”.
26. **O resultado** (estado `resultado-sistema`) é o aprovado, com a origem no sobretítulo, os casos (com o link para o Jurídico) e os lembretes de contrato (R$ 48.900,00 em aberto no sistema antigo). As linhas de fora vão para a planilha de linhas que não entraram, que se corrige e se importa como planilha.
27. **O histórico** (estado `importacoes`) ganha a coluna Origem; na conexão com o ADVBOX, mostra a hora em que o token foi apagado.
28. **Desfazer** (estado `desfazer-sistema`) segue o aprovado: clientes novos inativos, cadastros juntados de volta ao que eram, e agora os casos saem da lista e ficam em Encerrados marcados “importação desfeita”, sem resultado; os casos que já existiam perdem só o cliente que a importação ligou; o histórico financeiro e os lembretes saem das fichas. O que alguém mexeu depois (um prazo, um atendimento, um lembrete que virou contrato) fica como está, e a lista vem no fim.

### Quem pode

29. **Importar de outro sistema: só a sócia dona** (pergunta 3). Traz o escritório inteiro, com processos e financeiro, e o token do ADVBOX dá acesso a toda a conta de lá. A planilha segue com a regra aprovada. O servidor recusa com `SEM_PERMISSAO`, e quem não é dona vê só o cartão Planilha (não desenhado nesta rodada: é o cartão da planilha sozinho, que leva direto ao fluxo aprovado).
30. **Celular.** Clientes mora no Mais, que fica marcado. Os cartões de origem ficam um embaixo do outro; os passos viram quatro botões numerados; as abas da prévia viram três botões iguais; tabelas de abas, colunas, prévia e histórico viram cartões, como no aprovado.

## Acessibilidade (WCAG 2.2 AA)

- **Conferência automática** em 42 capturas (21 estados × computador e celular), feita pelo `fotos.cjs` aprovado. O resultado completo fica em `_conferencia.json`:
  - o axe (WCAG 2.0, 2.1 e 2.2, A e AA) não achou nenhuma violação;
  - nenhuma tela tem rolagem lateral, no computador nem no celular;
  - nenhum erro de script.
- **Alvos.** Todos os alvos das peças desta tela têm 44 px ou mais. As exceções que o script aponta vêm de peças aprovadas, sem mudança: a palavra-marca “T3jus” no alto do trilho e o campo de arquivo escondido (`input type=file` com a classe `sr`), cujo alvo é o rótulo “Escolher o backup” ou “Escolher a planilha”, de 44 px.
- **Contraste.** Só pares do D2 e do conceito Gabinete. O selo da origem é tinta-vinho escuro sobre âmbar claro (#F2CDB3). O filete âmbar das abas e colunas não reconhecidas é só decoração; o selo escrito diz “Não reconhecida”.
- **Formulários.** Os cartões de origem e os caminhos do ADVBOX são rádios num `fieldset` com `legend`, e o cartão inteiro é o rótulo. Cada “Vai para” de aba, coluna e valor tem rótulo lido pelo leitor de tela (“Aba Contatos: vai para”). O token é `type=password`, com `autocomplete=off`, erro ligado por `aria-describedby` e `aria-invalid`, e o foco vai para ele quando há erro.
- **Estados.** A leitura do ADVBOX usa `aria-busy` e `role="status"`; os erros usam `role="alert"`. As abas da prévia são links com `aria-current="page"`, e a contagem do que pede a pessoa tem texto para o leitor (“18 pedem você”). As janelas são `<dialog>` com `showModal()`; o desfazer é `alertdialog`, com o foco no motivo.

## O que precisa de dado novo no servidor

Tudo em cima das tabelas da migração `0420` (`importacoes`, `importacao_linhas`). Toda tabela nova tem `escritorio_id` e passa por `proteger_tabela_escritorio`. O escritório vem sempre da sessão no servidor, nunca do navegador. Valores em centavos (inteiro).

### Tabelas e campos

| Tabela | Campos | Observação |
|---|---|---|
| `importacoes` (campos novos) | `origem` (PLANILHA, ASTREA, ADVBOX_API, ADVBOX_PLANILHA), `modelo_versao` (o modelo do sistema usado para ligar), `o_que` ganha CASOS (planilha de processos do ADVBOX) | Os limites passam a depender da origem: backup até 20 MB e 10.000 linhas por aba. Os `check` de `linhas_lidas` e `numero` (hoje até 2.000) mudam junto |
| `importacao_abas` | `id`, `escritorio_id`, `importacao_id`, `nome`, `linhas`, `destino` (CLIENTES, CASOS, FINANCEIRO, CLIENTES_CONTRATOS, FORA), `reconhecida`, `ligacao` (JSON), `pares` (JSON) | Uma por aba do backup ou por tipo de dado do ADVBOX. Substitui o `aba` único quando a origem não é planilha |
| `importacao_linhas` (campos novos) | `aba_id`, `tipo` (CLIENTE, CASO, LANCAMENTO), `id_origem` (o número do registro no ADVBOX ou o código da linha no backup), `caso_id` | `id_origem` liga processo a cliente e lançamento a cliente e caso dentro da mesma importação |
| `importacao_conexoes` | `id`, `escritorio_id`, `importacao_id`, `sistema` (ADVBOX), `token_cifrado` (no cofre do Supabase, Vault), `conta_nome` (o nome que o ADVBOX devolve), `testada_em`, `apagada_em` | **O token nunca volta ao navegador** depois de enviado: nenhuma rota o devolve, nem mascarado. Só a função de leitura, no servidor, decifra. Apagado ao terminar a leitura, ao cancelar ou em 24 horas; `apagada_em` fica para o histórico. Fora da exportação e das cópias de longo prazo |
| `importacao_leituras` | `id`, `escritorio_id`, `importacao_id`, `recurso` (settings, customers, lawsuits, transactions), `total`, `lidos`, `cursor`, `pausa_ate`, `situacao` (fila, lendo, pausa, pronta, falhou), `erro` | O andamento da tela e a retomada depois de pausa, queda ou token novo |
| `casos` e `caso_cliente` (campos novos) | `importacao_id` em `casos`; `importado_por_importacao_id` em `caso_cliente` | Para o filtro “Desta importação”, a linha na ficha e o desfazer (inclusive o cliente ligado a um caso que já existia) |
| `casos` (situação nova) | `encerrado_por` (RESULTADO, IMPORTACAO_DESFEITA) | O caso de uma importação desfeita fica em Encerrados sem resultado e sem acerto |
| `historico_financeiro_anterior` | `id`, `escritorio_id`, `importacao_id`, `cliente_id`, `caso_id`, `data`, `descricao`, `valor_centavos`, `situacao` (PAGO, EM_ABERTO), `origem` | Só informação: fora do Caixa, de A receber e dos relatórios do contador; não gera recibo. Depende da pergunta 2 |
| `lembrete_contrato` | `id`, `escritorio_id`, `cliente_id`, `caso_id`, `valor_em_aberto_centavos`, `importacao_id`, `resolvido_em`, `contrato_id` | Os “87 lembretes”: some quando um contrato é criado e ligado |
| Histórico do escritório | Eventos `importacao_concluida` (com a origem), `importacao_desfeita`, `cliente_juntado`, `caso_juntado`, `conexao_testada`, `token_apagado` | Na mesma tabela de eventos de Clientes |
| Modelos dos sistemas | Arquivo de configuração versionado no código (abas, colunas e sinônimos do Astrea e dos relatórios do ADVBOX) | Não é dado de escritório. Os nomes de abas e colunas não reconhecidas chegam à equipe do T3jus sem nenhum valor |

### API

| Rota | O que faz | Erros |
|---|---|---|
| `POST /v1/importacoes` | Ganha `origem`. No ASTREA, recebe o .xlsx, lê as abas, reconhece pelo modelo e devolve abas, colunas e pares | `ARQUIVO_FORMATO`, `ARQUIVO_GRANDE`, `SEM_PERMISSAO` (não é a sócia dona) |
| `PATCH /v1/importacoes/:id/abas` | Grava o destino de cada aba e a escolha dos arquivados | `ABA_SEM_DESTINO` |
| `POST /v1/importacoes/conexao` | Recebe o token do ADVBOX (só no corpo, por HTTPS), cifra, testa com `GET /settings` e devolve só o nome da conta e as contagens das listas. Nunca devolve o token | `TOKEN_INVALIDO` (401 do ADVBOX), `PLANO_SEM_API` (403), `SISTEMA_FORA` (5xx ou tempo esgotado), `SEM_PERMISSAO` |
| `POST /v1/importacoes/:id/ler` | Começa a leitura em segundo plano do que foi marcado | — |
| `GET /v1/importacoes/:id/leitura` | O andamento por recurso, a pausa e a previsão | — |
| `DELETE /v1/importacoes/:id/conexao` | Cancela a leitura e apaga o token e o que foi lido | — |
| Tarefa da leitura (servidor) | Lê o ADVBOX respeitando 30 leituras por minuto; no 429, espera o tempo pedido e segue do `cursor`; no 401 no meio, para, apaga o token e avisa no sino; ao terminar, apaga o token e avisa no sino | Nunca chama rota de gravação do ADVBOX |
| `PATCH /v1/importacoes/:id/colunas` e `/linhas/:n` | Como no aprovado, por aba; casos ganham `NUMERO_CNJ_INVALIDO`, `CLIENTE_NAO_ENCONTRADO`, `CASO_DUPLICADO` | — |
| `POST /v1/importacoes/:id/importar` | Grava clientes, casos (com `caso_cliente` e parte contrária), histórico financeiro e lembretes numa transação; apaga o arquivo; não dispara aviso ao cliente | 409 se a prévia mudou; tudo ou nada |
| `POST /v1/importacoes/:id/desfazer` | Como no aprovado, mais os casos, o histórico financeiro e os lembretes | `MOTIVO_OBRIGATORIO`, `PRAZO_ENCERRADO`, `SEM_PERMISSAO` |
| Tarefa diária | Apaga arquivos, tokens e leituras de mais de 24 horas | — |

## Para o painel

- Esta entrega é só desenho. Quando virar código, cita F3.56 e VA-05. Como VA-05 já tem a planilha, a entrega de sistemas deixa VA-05 atendida só se cobrir Astrea e ADVBOX; se sair só um (veja a pergunta 4), fica um item “pendente” citando VA-05 com o que falta.
- Itens “pendente” novos, conforme as respostas: conferir o modelo do backup do Astrea com o backup real de um piloto (dependência externa); cadastro do T3jus como integrador do ADVBOX para receber tokens (dependência externa, pergunta 4); processos como casos (pergunta 1); histórico financeiro e lembretes de contrato (pergunta 2).
- A leitura em segundo plano usa o sino aprovado (F3.57) para o aviso de fim.

## Perguntas para a Carol

1. **Os processos do Astrea e do ADVBOX entram como casos no Jurídico?** **Recomendo que sim, só os ativos**, com número, área, parte contrária, clientes, responsável e a etapa ligada, todos marcados “sem contrato”, e sem prazos, tarefas, andamentos e documentos. Os arquivados ficam de fora por padrão, com a opção de entrar como encerrados. É o que mais poupa trabalho de quem chega, e o prazo, que é o que mais pesa, fica para a pessoa cadastrar conferindo.
2. **O financeiro do sistema antigo entra?** **Recomendo que só como informação:** o que foi pago fica na ficha como “pago antes do T3jus” (a mesma regra da pergunta 2 aprovada), fora do Caixa e sem recibo; o que está em aberto não vira cobrança, vira um lembrete na ficha para criar o contrato; as despesas do escritório ficam de fora. Assim a cobrança continua nascendo só do contrato e o contador não recebe nada repetido. A outra opção é deixar o financeiro todo de fora.
3. **Quem pode importar de outro sistema?** **Recomendo só a sócia dona.** Traz o escritório inteiro de uma vez, com processos e financeiro, e o token do ADVBOX abre toda a conta de lá. A planilha continua com a regra aprovada (clientes, todos; contratos, quem tem Contratos).
4. **Por onde começar a programar?** **Recomendo o Astrea pelo backup e o ADVBOX pela planilha primeiro**, porque não custam nada a ninguém e reusam quase todo o fluxo que já existe. A conexão com a API do ADVBOX fica para quando um piloto usar ADVBOX com o plano de API e o T3jus estiver aprovado como integrador (a documentação diz que o token vai a parceiros aprovados). Antes de programar o Astrea, peço o backup real de um piloto para conferir as abas e colunas.
