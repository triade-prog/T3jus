# Sistema T3jus

Código do T3jus (DC1): o **Portal do advogado** e o **Console T3jus** (equipe interna). O site comercial entra no passo 2, em `apps/site`. As decisões estão em [`../docs/CONTEXTO.md`](../docs/CONTEXTO.md). O andamento está no painel de execução, em [`../docs/painel/`](../docs/painel/LEIA-ME.md). As ideias que cada parte atende estão no [`../IDEIAS.md`](../IDEIAS.md).

A base veio da fundação (passo 0) do TRÍADE Condo, que por sua vez veio do T-shirt Club (DC5, DC6): só as peças genéricas, com "condomínio" trocado por "escritório".

## Estrutura

```
apps/portal     Portal do advogado (Next.js 16, porta 3000)
apps/console        Console T3jus (Next.js 16, porta 3001)
packages/domain     regras puras em TypeScript: dinheiro, erros, textos, esquemas, logs limpos
                    (roda no Node e no Deno)
packages/ui         tema (DC10) e componentes React
packages/servidor   cabeçalhos de segurança, CSP com nonce e o repasse /api
supabase/           migrations, Edge Functions (Deno + Hono) e testes pgTAP
tests/e2e           Playwright com axe, no celular e no computador
scripts/            banco de teste e Deno
```

## Como a base funciona (passo 0)

- **Só o servidor acessa o banco.**
  - O navegador fala só com o próprio app.
  - O app repassa `/api` para a Edge Function do sistema, com um segredo que só o servidor conhece.
  - A Edge Function só chama funções do banco. Nem a chave de serviço lê as tabelas direto.
- **O escritório é o dono de todo dado (PT-01).**
  - Toda tabela de dado de escritório tem `escritorio_id` e a política `isolamento_escritorio`. Só aparece o que é do escritório que está no contexto da transação.
  - O contexto é gravado por `entrar_escritorio`, e só depois de conferir o vínculo e a permissão.
  - No Portal, o escritório vem da sessão no servidor (`escolher_escritorio`), nunca do que o navegador manda.
- **A permissão é dada por pessoa + função + escritório + ação, e nega por padrão (PT-02).**
  - Quem pode o quê fica em `funcao_acoes`.
  - Cada linha entra junto com a funcionalidade que a usa (DC8).
- **O histórico é só de inserção (PT-03).**
  - O autor vem do contexto.
  - Senha, token e dado pessoal são recusados.
- **Mudança de estado passa pelo guardião.**
  - Só valem as transições cadastradas.
  - Cada mudança precisa de um evento e de um autor, e vai para o histórico na mesma transação.
- **Edição simultânea (PT-19).**
  - Cada tabela com `versao` filtra pela versão que a pessoa leu.
  - No conflito, a resposta traz a versão nova sem perder o que foi escrito.
- **Relógio da aplicação.** Toda hora vem de `app_now()`. Os testes adiantam o relógio para conferir prazos.
- **Dinheiro (PT-09).** Os valores ficam em centavos inteiros (`centavos`) com a moeda (`moeda`). No TypeScript, use `packages/domain/src/dinheiro.ts`.
- **Login (PT-08).**
  - O login usa o Supabase Auth, com e-mail verificado.
  - O autenticador é obrigatório para a equipe no Console e opcional para o sócio.
  - Há limite de tentativas.
  - A recuperação de senha responde sempre a mesma coisa, exista a conta ou não.
  - Depois de redefinir a senha, todas as sessões caem.

### Tabela nova, passo a passo

1. Crie a tabela com `escritorio_id uuid not null references escritorios (id)`. Se a pessoa edita o registro, inclua `versao integer not null default 1`. Se ele tem estado, inclua `estado`.
2. Chame `call proteger_tabela_escritorio('<tabela>')`. Ela liga o RLS, cria a política de isolamento e o controle de versão. Se houver `estado`, chame também `call ligar_guardiao('<tabela>')` e cadastre `estados_iniciais` e `transicoes_permitidas`.
3. Escreva as funções da API como `security definer`. Cada uma recebe `p_pessoa` e `p_escritorio` validados pela sessão e começa com `perform entrar_escritorio(p_pessoa, p_escritorio, '<recurso.acao>')`.
4. Ponha a tabela no inventário de dados (`inventario_dados`, migration 0070): o que guarda e, se for dado pessoal, para que serve, a base legal, o controlador, o prazo e o que acontece no fim. Marque `exportar` se ela entra na exportação do escritório. Sem a linha, o teste `008_inventario_exportacao_test.sql` falha.
5. Termine a migration com `call fechar_acesso();`.
6. Nomeie os testes de cada regra com o código da ideia (DC9).

Se a tabela não tiver escritório, ela precisa de um motivo em `tabelas_sem_escritorio`. Sem o motivo, o teste `001_acesso_rls_test.sql` falha.

### Inventário de dados e exportação (F0.11 e F0.12)

- **Inventário (PT-11).** `inventario_dados` tem uma linha por tabela. Dado pessoal precisa de finalidade, base legal, controlador, prazo e destino no fim; os prazos nascem como `PROPOSTA` e viram `APROVADO` numa migration nova, depois da Carol. Os nove primeiros foram aprovados na migration 0090.
- **Exportação (PT-15).** `exportar_escritorio` (ação `escritorio.exportar`, só o sócio) devolve a ficha, as pessoas do escritório e as tabelas marcadas para exportar, lidas do inventário. Não sai o que é interno do T3jus (tabelas internas, histórico interno, vínculos da equipe) nem as sessões. Cada exportação fica no histórico. Na API: `POST /v1/escritorio/exportacao`, sempre do escritório da sessão.
- **Rotina dos prazos (F0.13, migration 0080).** `aplicar_prazos()` roda toda noite às 3h de Brasília pelo pg_cron e só age em tabela com prazo `APROVADO`. Hoje aplica: sessões de escritório (30 dias), contadores de tentativas (1 dia) e entradas no sistema no histórico (6 meses). Os números ficam em `configuracoes` (`prazo_*`). Cada execução grava `dados.prazos_aplicados` no histórico com a contagem por tabela. O histórico continua só de inserção; só a rotina, como dono das tabelas e com a marca `t3jus.aplicando_prazos`, apaga. Os prazos do fim do contrato e da saída da pessoa ganharam gatilho no F0.14 (abaixo). Teste: `009_rotina_prazos_test.sql`.

## Console: escritório e acesso (passo 1)

A migration `0060_console_clientes.sql` e a `api-console` trazem o Console no servidor. A carteira e a ficha (aba Sócio) já têm tela (veja "Telas do Console" abaixo); as outras telas esperam aprovação.

- **Equipe interna (PT-24).** Quem é da equipe T3jus está em `equipe_t3`, com as funções em `equipe_funcoes`: ADMINISTRACAO, IMPLANTACAO, FINANCEIRO e SUPORTE. Cada pessoa só vê os escritórios atribuídos a ela, e só enquanto tem a função da atribuição. Sempre sobra alguém com administração.
- **Carteira (CO-01).** Cada escritório cliente tem um estágio (em implantação ou ativo) e as situações a tratar, calculadas da ficha: sem sócio, sem contato, sem contrato. Para ficar ativo, o escritório precisa ter o sócio convidado.
- **Ficha (CO-02).** Nome, cidade, UF, endereço, CNPJ (conferido e único) e contatos. A ficha é do escritório, que vai vê-la e editá-la no Portal; a referência do contrato fica na carteira e só a administração muda.
- **Interno (CO-03).** A carteira (`clientes`) e as notas (`notas_internas`) passam por `proteger_tabela_interna`: o escritório nunca as vê. As notas são só de inserção.
- **Histórico administrativo (CO-04).** Os eventos internos vão para o histórico com a marca de interno e não aparecem para o escritório.
- **Convites (PT-20, PT-22).** O convite do sócio e da equipe interna sai pelo Supabase Auth (`AdminAuth` em `_shared`). A pessoa cria a senha pelo link de uso único em `/criar-senha` do app de destino. Quem já tem conta não recebe e-mail novo, só o vínculo.

## Rodar

Requisitos: Node 22, pnpm 10 e PostgreSQL 16 ou 17 com pgTAP (`postgresql-17-pgtap`).

```bash
pnpm install
cp .env.example apps/portal/.env.local   # e apps/console/.env.local
pnpm dev:portal   # http://localhost:3000
pnpm dev:console      # http://localhost:3001
```

## Verificar (o mesmo que o CI faz)

```bash
pnpm lint && pnpm typecheck && pnpm test   # ESLint, TypeScript e Vitest
pnpm test:deno                             # Edge Functions no Deno
pnpm test:db                               # migrations, pgTAP e edição simultânea num Postgres temporário
pnpm build && pnpm e2e                     # Playwright com axe (PW_CHROMIUM_PATH para outro Chromium)
```

## Ainda não ligado

Para publicar, falta o projeto Supabase de desenvolvimento em São Paulo (E1) e os projetos na Vercel (E2). Os segredos das funções estão listados no fim do `supabase/config.toml`. O login foi testado com um Auth falso; a conferência com o Supabase Auth de verdade fica para quando o projeto existir.

### Telas de acesso (F1.4)

`packages/ui` traz a moldura (`TelaAcesso`), os cartões (`Entrar`, `NovaSenha`, `CriarSenha`, `EscolherEscritorio`), as peças comuns (`pecas.tsx`) e o estilo (`acesso.css`) das telas aprovadas em `docs/design/aprovadas/entrar.html` e `docs/design/aprovadas/acesso/`. Cada app só passa os textos (`apps/*/src/acesso.ts`). As fontes vêm do pacote `@fontsource`, servidas pelo próprio app, porque a CSP só aceita fonte de `'self'`.

| Rota | O que faz |
|---|---|
| `/entrar`, `/entrar/link` | Senha ou link de acesso por e-mail; `/entrar/link/sessao` quando "manter conectado" foi desmarcado. No Portal, depois de entrar, vai para `/escritorio`. |
| `/redefinir` | Volta do "Esqueci a senha". A tela abre o link (`POST /v1/auth/redefinir/abrir`), o servidor guarda num cookie próprio de 1 hora (`__Host-*-link`) e a senha nova vai sem o token (`POST /v1/auth/redefinir`). Ao salvar, sai da conta em todos os aparelhos. |
| `/criar-senha` | Volta do convite. Mostra quem convidou (`dados_convite`), pede nome, senha e aceite dos Termos (`aceitar_convite` grava no histórico). No Portal já entra; no Console segue para o autenticador. |
| `/escritorio` (Portal) | Escolha do escritório quando há mais de um (`escritorios_para_escolher`), do último usado ao mais antigo. Com um só, escolhe direto. |

Regras da senha: 12 caracteres ou mais e fora das listas de senhas vazadas. A API confere a lista pelo Have I Been Pwned por k-anonimato (`_shared/senha.ts`): só os 5 primeiros caracteres do SHA-1 saem do servidor. Se o serviço cair, a troca segue. O `config.toml` não exige maiúscula, número ou símbolo.

### Telas do Console (F1.5)

`packages/ui/src/console/` traz a moldura (`MolduraConsole`), a carteira (`Carteira`) e a ficha (`FichaCliente`) das telas aprovadas em `docs/design/aprovadas/console-carteira.html` e `console-ficha.html`. O estilo é `console.css`, copiado do desenho com escopo `.co`; até 760px vale a moldura de celular (barra no topo e menu em gaveta) e a tabela vira cartões. As regras da carteira (pendências, "Pedem você agora", busca e ordem) ficam em `carteira.ts`, com testes.

| Rota | O que faz |
|---|---|
| `/` | Carteira (`GET /v1/clientes`): só os clientes atribuídos a quem entrou, com estágio, etapas da implantação, pendências, sócio, equipe e última atividade (`console_carteira`, migration `0110`). |
| `/clientes/[id]` | Abre a ficha na aba Sócio. |
| `/clientes/[id]/socio` | Cabeçalho com a implantação (Ficha, Contrato, Equipe, Sócio no Portal) e "Passar para ativo" quando as quatro estão feitas. Caminho do convite de cada sócio (enviado, senha criada em `pessoas.senha_criada_em`), reenviar (`POST /v1/clientes/:id/socios/:vinculo/reenviar`) e convidar outro sócio. O e-mail do sócio vem do Auth, nunca do banco. |
| `/clientes/[id]/{ficha,contrato,equipe,notas,historico}` | Abas do Console v1, abaixo. |

O que o desenho mostra e ainda não tem dado: busca global e avisos no topo, plano do cliente, OAB e WhatsApp do sócio, "e-mail aberto" no caminho do convite, link do convite para copiar e prazo de implantação em dias.

### Contrato e documentos do cliente (CO-05)

O arquivo vai direto do navegador para o Storage, num bucket privado (`documentos-console`, PDF, JPG ou PNG até 10 MB), sem passar pela API nem pela Vercel. A tabela `documentos_cliente` é interna (o escritório não vê) e só recebe inserção; nada se apaga.

1. `POST /v1/clientes/:id/documentos` registra o anexo (categoria, nome, tipo, tamanho) e devolve um endereço de envio de uso único. O caminho no Storage é `<escritório>/<documento>`, montado no servidor.
2. O navegador manda o arquivo (`PUT`) para esse endereço. A CSP do Console aceita a origem do Storage pela variável `ARQUIVOS_ORIGEM`.
3. `POST /v1/clientes/:id/documentos/:doc/concluir` confere no Storage se o arquivo chegou com o tamanho e o tipo registrados e só então o anexo aparece na lista (`GET`).
4. `POST /v1/clientes/:id/documentos/:doc/abrir` devolve um link de 60 segundos e registra a abertura no histórico interno.

A conferência com o Storage de verdade fica para quando o projeto Supabase existir (E1); os testes usam um Storage falso.

### Console v1 (F1.8)

Telas aprovadas em `docs/design/aprovadas/console-v1/`, programadas em `packages/ui/src/console/`. As peças comuns (aviso, estado vazio e de erro, janela, erro preso ao campo, carregando) ficam em `pecas.tsx`.

| Rota | O que faz |
|---|---|
| `/` | Carteira com "Cadastrar escritório" (só quem tem `console.escritorios.criar`); ao cadastrar, abre a ficha nova. |
| `/clientes/[id]/ficha` | Ver e editar a ficha (`AbaFicha.tsx`, regras em `ficha.ts`). Erros presos aos campos e resumo no topo. No conflito (409) mostra quem salvou antes e a hora (`fichaAlteradaPor`/`fichaAlteradaEm`, migration `0130`) e os campos que mudaram. |
| `/clientes/[id]/contrato` | Referência do contrato (só Administração), documentos (envio direto ao Storage com progresso, fila, abrir e baixar) e estágio. Passar para ativo pede as 4 etapas e um motivo, obrigatório também no servidor. `?mudar=1` abre a janela do estágio. |
| `/clientes/[id]/equipe` | Quem atende o cliente; a Administração atribui (só funções que a pessoa tem) e retira. |
| `/clientes/[id]/notas` e `/historico` | Notas internas (até 2.000 caracteres) e histórico em frases, por dia, de 20 em 20. |
| `/equipe` | Equipe T3jus, só para a Administração: e-mail (do Auth) e convite pendente (`senha_criada_em` vazio), cadastrar, mudar funções, desativar e reativar (com as funções em branco), e o histórico da equipe. |

Ainda sem dado: busca global e avisos no topo, e a contagem de documentos nas abas.

### Equipe do escritório no Portal (F1.6)

Sem funções fixas (PA-02): o sócio dono convida e marca as áreas de cada pessoa (Comercial, Contratos, Financeiro, Jurídico). Quem entra pela equipe tem vínculo com a função `EQUIPE`; as áreas ficam em `areas_liberadas` (migration `0140`), ligadas ao vínculo, e nada se apaga. O sócio vê tudo. Toda rota de área futura entra por `entrar_area(pessoa, escritório, área)`, que recusa com `AREA_NAO_LIBERADA`.

| Rota | O que faz |
|---|---|
| `GET /v1/escritorio` | Ficha do escritório (só leitura), `dono`, `areas` da pessoa, quantos outros escritórios ela tem e, para o dono, a última exportação. |
| `GET /v1/escritorio/equipe` | Só o dono: pessoas com e-mail (do Auth), áreas, convite pendente e quando saiu. |
| `POST /v1/escritorio/equipe` | Convidar (nome, e-mail, áreas). A permissão é conferida antes de a conta nascer no Auth. |
| `PUT /v1/escritorio/equipe/:vinculo/areas` | Mudar as áreas; vale na próxima página que a pessoa abrir. |
| `POST /v1/escritorio/equipe/:vinculo/reenviar` | Novo convite para quem ainda não criou a senha. |
| `POST /v1/escritorio/equipe/:vinculo/retirar` | Retira (versão lida). Quem já entrou exige `passarPara`, alguém que continua na equipe (EX-10); convite pendente só é cancelado. |
| `GET /v1/escritorio/equipe/historico` | Convites, áreas, retiradas e exportações, de 50 em 50 (`antes`, `limite`). |

A troca real do responsável das tarefas, prazos, cobranças e atendimentos de quem saiu entra com essas tabelas (F1.10). Até lá, a escolha fica no histórico.

### Telas do Portal v1 (F1.6, F1.7, D3)

Telas aprovadas pela Carol em 18/11/2026, em `docs/design/aprovadas/portal-v1/`. O código fica em `packages/ui/src/portal/`, e o CSS do Portal em `packages/ui/src/portal.css`, sob a classe `.pt`, por cima do `console.css`.

- **Moldura** (`Moldura.tsx`): o trilho mostra só as áreas que a pessoa tem, a Equipe só para o sócio dono, e Escritório e Ajuda embaixo. Cada área tem uma barra de seções (`areas.ts`). No celular, uma barra fixa embaixo leva a Início, Conversas e Agenda; o Mais abre o resto numa folha. A moldura lê `GET /v1/escritorio`. Uma resposta 401 volta para `/entrar`, e `ESCRITORIO_REQUIRED` leva para a escolha do escritório.
- **Rotas:**
  - `/`, `/conversas`, `/clientes`, `/agenda` e `/ajuda` mostram o que vem.
  - Cada área tem a própria pasta: `/comercial`, `/contratos`, `/financeiro` e `/juridico`, com a seção opcional (`/juridico/prazos`). Seção que não existe dá 404. Uma área não liberada diz quem libera.
  - `/equipe` (com `?aba=historico`) é a Equipe do escritório.
  - `/meu-escritorio` é a área Escritório. O `/escritorio` continua sendo a escolha do escritório depois de entrar.
- **Exportar:** o arquivo JSON fica na memória da página. "Salvar de novo" não gera outra exportação.
- **Testes:** `tests/e2e/portal-v1.spec.ts` roda no celular e no computador, com axe. `packages/ui/src/portal/portal.test.ts` testa as regras de tela (convite vencido, frases do histórico, nome do arquivo).

### Suporte de acesso do Console (F1.3, PT-23)

Tela aprovada pela Carol em 18/11/2026, em `docs/design/aprovadas/console-suporte/`. O código fica em `packages/ui/src/console/Suporte.tsx` (regras em `suporte.ts`), na rota `/suporte` do Console.

- **Quem vê:** Suporte e Administração (`console.suporte.ver` e `console.suporte.agir`, migration `0150`). O item Suporte do menu só aparece para quem tem a ação. A busca e a ficha só mostram pessoas dos escritórios em que quem busca tem vínculo (PT-24). Uma pessoa fora deles responde como inexistente.
- **Rotas da api-console:**
  - `GET /v1/suporte/pessoas?q=` busca por nome ou e-mail;
  - `GET /v1/suporte/pessoas/:id` monta a ficha: o banco dá os escritórios e os aparelhos, e o Auth dá o e-mail, a última entrada e o autenticador;
  - `GET /v1/suporte/pessoas/:id/historico`;
  - `POST .../link-senha`, `.../desconectar`, `.../tirar-autenticador` (com `identidadeConferida: true`) e `.../reenviar-convite`, todas com `motivo`.
- **Regras:**
  - a senha e o link nunca passam pelo Console; o link vai pelo Auth só para o e-mail cadastrado, com o mesmo limite de 3 por hora da recuperação;
  - o e-mail nunca muda por esta tela;
  - o motivo fica só no histórico interno; o histórico da equipe do Portal recebe o evento sem o motivo, para o sócio dono saber;
  - desconectar apaga as linhas de `auth.sessions` da pessoa (o Auth recusa o token de uma sessão apagada). Por isso o papel `dominio` lê `auth.users` (id e e-mail) e lê e apaga `auth.sessions`;
  - nas janelas, o e-mail aparece mascarado (`ma***@dominio`).
- **Atalho:** a aba Sócio da ficha do cliente mostra "Suporte de acesso" para quem tem a ação.
- **Testes:** pgTAP `015_suporte_acesso_test.sql`, Deno `api-console/suporte_test.ts`, vitest `console/suporte.test.ts` e e2e `tests/e2e/console-suporte.spec.ts` (celular e computador, com axe).
- **Pendente (F1.12):** o e-mail de aviso quando o suporte tira o autenticador e a data da última troca de senha.

### Clientes do Portal (F1.13; AP-01, AP-02, AP-04, AP-06)

Tela aprovada em `docs/design/aprovadas/portal-clientes`, com as cinco recomendações da Carol (18/11/2026).

- **Banco (migration 0160):** `clientes_escritorio` (o nome `clientes` já é a carteira do Console) guarda o cliente, a qualificação para procuração e contrato e os contatos em `jsonb` (1 a 10, um principal, telefone no formato internacional). `atendimentos` é só de inserção: não se edita nem se apaga (decisão 3). O próximo contato não fica no cliente: vem do atendimento mais novo desde a última inativação (`prox_contato`), o que evita conflito de versão com quem edita a ficha.
- **Quem vê o quê (decisões 1 e 2):** todos da equipe abrem a lista e a ficha, cadastram e editam. Só quem tem a área Comercial (o sócio dono tem todas) recebe origem, próximo contato e atendimentos, filtra vencidos, inativa e reativa. O banco tira os campos; a tela só não mostra o que não veio.
- **Origem (decisão 4):** lista fixa em `ORIGENS` (domínio) e no `check` da tabela; um teste Deno confere os dois.
- **Histórico:** `cliente.cadastrado`, `cliente.editado` (só os nomes dos campos), `cliente.atendimento_registrado`; inativar e reativar passam pelo guardião com o motivo.
- **API:** `/v1/escritorio/clientes` (GET com `q`, `situacao`, `vencidos`; POST), `/clientes/duplicados`, `/clientes/:id` (GET e PUT com `versao`), `/clientes/:id/inativar`, `/reativar`, `/clientes/:id/atendimentos` (GET e POST) e `/v1/escritorio/pessoas`. Na recusa por área, a API devolve só o `motivo` (`AREA_NAO_LIBERADA`).
- **Pendências (feitas):** aviso do vencido no Início (F1.14) e pedido de exclusão do titular pela LGPD (F1.15), na seção abaixo.

### Início com os contatos do dia e pedido de exclusão (F1.14, F1.15; AP-06, PT-11)

Tela aprovada em `docs/design/aprovadas/portal-clientes-pendencias`, com as decisões da Carol de 18/11/2026.

- **Início (migration 0170, `portal_inicio_contatos`):** só para quem tem a área Comercial. Devolve os vencidos (do mais antigo) e os de hoje em que a pessoa é a responsável, com limite e totais, o próximo marcado (para o vazio) e, para a sócia dona, quantos vencidos a equipe tem e os pedidos de exclusão esperando. `de=EQUIPE` só para a dona (`SO_SOCIO_DONO`). A tela é `InicioPortal`; os outros blocos do Início entram com as áreas deles.
- **Pedido de exclusão:** `pedidos_exclusao` (um aberto por cliente, estados PENDENTE, ATENDIDO e RECUSADO, protocolo `EXC-aaaa-nnnn` por escritório) guarda o pedido sem dado pessoal do cliente. Quem não é a dona registra o pedido; só a dona exclui (confere quem pediu e o nome digitado) ou recusa com motivo.
- **Exclusão:** numa transação, o cliente passa a `EXCLUIDO` (sem volta), perde nome, documento, qualificação, representante, contatos e quem indicou; nos atendimentos saem com quem se falou e o próximo contato, e ficam data, canal, quem atendeu e o resumo (decisão 3). O gatilho dos atendimentos continua só de inserção, com uma única exceção conferida pelos dados: limpar esses campos de cliente já excluído. Cliente excluído não se edita, reativa nem recebe atendimento (`CLIENTE_EXCLUIDO`) e aparece só em Inativos, com a data e o protocolo (decisão 4).
- **API:** `GET /v1/escritorio/inicio/contatos?de=MEUS|EQUIPE`, `POST /clientes/:id/exclusao/pedido`, `POST /clientes/:id/exclusao/recusar` e `POST /clientes/:id/exclusao` (com `versao`, `conferido` e `nomeConfirmado`).
- **Pendente:** com contrato ou processo, o pedido só arquiva (decisão 5), em F1.16.

### Agenda do Portal (F3.1; EX-06, EX-11)

Tela aprovada em `docs/design/aprovadas/portal-agenda-conversas` (Carol, 19/11/2026). Todos da equipe usam a Agenda; ela não depende de área liberada.

- **Banco (migration 0180):** `compromissos` (tipo AUDIENCIA, CLIENTE, ASSINATURA, INTERNO ou OUTRO com `tipo_escrito`; presencial com endereço opcional ou virtual com link `https`; cliente, responsável, quem também vai, lembrete ao cliente e observações) e `feriados` (tabela global, nacionais de 2026 a 2028). Estados MARCADO e CANCELADO pelo guardião; nada se apaga.
- **Histórico:** `compromisso.marcado`, `compromisso.editado` (só os nomes dos campos), `compromisso.remarcado` (de, para e o motivo, obrigatório quando muda dia ou hora) e `estado.mudou` no cancelamento, com o motivo. Na retirada de alguém da equipe (`equipe.retirada`), os compromissos futuros da pessoa passam para quem o sócio escolheu (`compromisso.responsavel_passado`, parte de EX-10).
- **Prazos:** `portal_agenda` devolve `prazos` como lista (hoje vazia) para quem tem o Jurídico e `null` para quem não tem; a tela esconde a faixa e diz quem libera. Os prazos de verdade entram com o Jurídico (F3.4).
- **Lembrete:** fica marcado no compromisso; a ficha mostra os dois envios previstos (1 dia e 2 horas antes) como "Ainda não sai" até o WhatsApp do escritório estar ligado (F3.3).
- **API:** `GET /v1/escritorio/agenda?de&ate&pessoa` (até 62 dias), `POST /v1/escritorio/compromissos`, `GET` e `PUT /compromissos/:id` (com `versao` e `motivo`) e `POST /compromissos/:id/cancelar` (com `versao`, `motivo` e `avisar`).
- **Telas:** `AgendaPortal` (`/agenda?ver=mes|semana|dia&dia&pessoa`) e `FichaCompromissoPortal` (`/agenda/:id`); as regras de data, grade e texto ficam em `packages/ui/src/portal/agenda.ts`, com testes.

### Comercial do Portal (F3.5; AP-02 a AP-06, IN-01, PD-02, CH-06)

Telas aprovadas em `docs/design/aprovadas/portal-comercial-contratos` (Carol, 19/11/2026). Só quem tem a área Comercial abre; cada rota confere a área de novo (`entrar_area`).

- **Banco (migration 0190):** `retornos_cliente` (o retorno marcado na proposta; `prox_contato` passa a pegar o mais novo entre o último atendimento e o último retorno), `propostas` (número P-AAAA-NNN; estados RASCUNHO, ENVIADA, NEGOCIACAO, ACEITA, CONTRATO e RECUSADA pelo guardião; nada se apaga) e `honorario_condicoes` (uma linha por tipo, dona PROPOSTA ou CONTRATO, para Contratos usar as mesmas peças). `clientes_escritorio` ganhou `funil_motivo` (ainda sem tela, F3.8).
- **Condições de honorário:** os sete tipos de CH-06 conferidos no servidor (`honorario_erros_lista` devolve `c1.valor`, `c2.etapa`...), com as mesmas regras em `packages/domain/src/honorarios.ts` (leitura, "Gera:", divisão das parcelas em centavos e valor certo).
- **Resposta:** aceitou, pediu mudança (o retorno passa para hoje) ou recusou com motivo; grava também o atendimento do cliente. Quem não tem Contratos pede o contrato: o pedido fica na proposta e no histórico (o aviso e o gerar contrato vêm com Contratos, F3.7).
- **API:** `GET /v1/escritorio/comercial/retornos?responsavel`, `GET` e `POST /v1/escritorio/propostas` (`?mostrar&q`), `GET` e `PUT /propostas/:id` (com `versao`), `POST /propostas/:id/enviada`, `/resposta` e `/pedir-contrato`, `GET /comercial/funil?periodo` e `/comercial/origem?periodo` (30, 90 ou 12).
- **Telas:** `/comercial/atendimentos`, `/comercial/propostas`, `/comercial/propostas/nova?cliente=`, `/comercial/propostas/:id`, `/comercial/propostas/:id/editar`, `/comercial/funil` e `/comercial/origem`. As peças de honorário (`Honorarios.tsx`, `honorarios.ts`) servem também ao contrato.
- **Quem sai da equipe:** as propostas em andamento e os retornos dela passam para quem o sócio escolheu (`proposta.responsavel_passado`, EX-10).

### Contratos do Portal (F3.10; CH-01 a CH-04, CH-06, IN-01)

Telas aprovadas em `docs/design/aprovadas/portal-comercial-contratos`. Só quem tem a área Contratos abre; cada rota confere a área de novo.

- **Banco (migration 0200):** `contratos` (número C-AAAA-NNN; ELABORACAO → ATIVO → ENCERRADO pelo guardião, e ELABORACAO → ENCERRADO; sem DELETE), `contrato_advogados`, `recebimentos_previstos` e `bases_mensais`. As condições ficam em `honorario_condicoes` com dona CONTRATO.
- **Da proposta (IN-01):** `portal_contrato_da_proposta` devolve o que preenche o formulário; criar com `propostaId` exige a proposta ACEITA do mesmo cliente e a passa para CONTRATO.
- **Programação (CH-04):** nasce ao registrar a assinatura (`contrato_programar`, só o que vence de hoje em diante). Parcelas divididas em centavos exatos, com o resto nas primeiras. Mensal sem prazo programa 12 meses. Percentual recorrente com data gera os meses sem valor, e a base informada (`portal_contrato_base`) faz o valor. Nada se apaga: mudar ou encerrar cancela o que ia vencer, com o motivo.
- **Mudar (decisão 20):** contrato ativo pede motivo, aceita data passada só na condição que não mudou e refaz só os tipos que mudaram.
- **API:** `GET` e `POST /v1/escritorio/contratos` (`?mostrar=ATIVOS|ENCERRADOS|BASE&q`), `GET /contratos/da-proposta/:id`, `GET /contratos/honorarios`, `GET` e `PUT /contratos/:id` (com `versao` e `motivo`), `POST /contratos/:id/assinatura` e `/encerrar`, `POST /recebimentos/:id/base`.
- **Telas:** `/contratos/contratos`, `/contratos/contratos/novo?proposta=`, `/contratos/contratos/:id?aba=contrato|recebimentos|documentos`, `/contratos/contratos/:id/mudar` e `/contratos/honorarios`. Procurações e modelos (CH-08) ainda em preparo.
- **Comercial:** o Funil lista os contratos vindos de proposta e a Origem soma o valor certo contratado (F3.9).
- **Quem sai da equipe:** os contratos em elaboração e ativos passam para quem o sócio escolheu (`contrato.responsavel_passado`, EX-10).

### Financeiro do Portal, A receber (F3.17; FI-01 a FI-04, FI-14, FI-17)

Telas aprovadas em `docs/design/aprovadas/portal-financeiro`. Só quem tem a área Financeiro abre (`financeiro.ver`; registrar e anotar pedem `financeiro.editar`).

- **Banco (migration 0220):** `pagamentos_recebidos` (valor, multa e juros, dia em que o dinheiro entrou, forma, caixa do escritório ou de terceiros), `recibos` (número por escritório e ano, tirado com trava) e `cobranca_eventos` (ligação, mensagem, anotação ou passada, com motivo e próxima ação). As três só acrescentam: o guardião `financeiro_so_acrescenta` recusa UPDATE e DELETE. A parcela ganhou `forma`.
- **Situação da parcela:** sai dos pagamentos (`parcela_situacao`): cancelada, paga, vencida, parcial ou a vencer. Cancelar o futuro de um contrato não toca parcela que já recebeu algum pagamento.
- **Registrar (FI-02):** `portal_financeiro_receber_registrar` recusa parcela cancelada ou já paga, valor acima do que falta (devolve `falta`) e data no futuro. O pagamento atrasado baixa a parcela do mês a que ela se refere; no caixa, entra no dia em que o dinheiro entrou.
- **Cobrança (FI-04):** `portal_financeiro_cobranca_anotar` pede o motivo do atraso na primeira anotação de parcela vencida e sempre a próxima ação (dia, o que fazer, quem faz). Quem sai da equipe passa as próximas ações para quem o sócio escolheu (evento PASSADA, EX-10).
- **API:** `GET /v1/escritorio/financeiro/receber` (`?mostrar=ABERTO|VENCIDAS|SETE_DIAS|RECEBIDO_MES&q&responsavel&forma`), `GET /financeiro/contratos/:id`, `POST /financeiro/parcelas/:id/recebimentos` e `/cobranca`.
- **Telas:** `/financeiro/a-receber` e `/financeiro/a-receber/contratos/:id`. Resumo, Repasses e Caixa ainda mostram a área em preparo.

### Financeiro do Portal, A pagar (F3.18; FI-01, FI-02, FI-07, FI-13, FI-20)

- **Banco (migration 0230):** `contas_pagar` (categoria da FI-20, forma, pagamento e, se adiantada para um cliente, como o dinheiro volta e o reembolso) e `contas_recorrentes` (o modelo, com o dia e o primeiro mês que nasce sozinho). O guardião deixa a conta ganhar só o pagamento e o reembolso, uma vez cada; nada se apaga.
- **Recorrentes (FI-13):** `lancar_recorrentes` lança, uma vez só, todo mês que faltar desde o início, com o vencimento no dia da conta (ou no último dia de um mês mais curto). A lista de A pagar chama a peça ao abrir, então não depende de rotina agendada. Com o contrato encerrado, nada se lança.
- **Pagar (FI-02):** `portal_financeiro_conta_paga` guarda o dia e o valor que saiu (o imposto que muda todo mês sai com o valor do mês); recusa data no futuro e conta já paga.
- **Adiantada (FI-07):** pede o cliente do escritório e como volta (na próxima parcela, no levantamento ou à parte); `portal_financeiro_conta_reembolsada` tira do "Adiantado por cliente".
- **API:** `GET /v1/escritorio/financeiro/pagar` (`?mostrar=SEMANA|VENCIDAS|MES|RECORRENTES`), `POST /financeiro/contas`, `POST /financeiro/contas/:id/paga` e `/reembolso`.
- **Tela:** `/financeiro/a-pagar`, com as janelas de lançar conta, marcar paga e registrar o reembolso. A aprovação da sócia (FI-10) tem só o lugar reservado.

### Jurídico do Portal, casos (F3.33; EX-01, EX-03, EX-07, EX-08, EX-14, CH-05)

Telas aprovadas em `docs/design/aprovadas/portal-juridico`. Migration `0240_portal_juridico_casos.sql`, teste `024_portal_juridico_casos_test.sql`, e2e `portal-juridico-casos.spec.ts`.

- **Banco:** `etapas` (lista do escritório, uma só final; as 8 sugeridas nascem no primeiro uso, por `etapas_garantir`), `casos` (número do CNJ só com os 20 dígitos e conferido pelo módulo 97 em `numero_cnj_valido`; um número por escritório), `caso_clientes` (papel e o contrato de cada cliente, do mesmo cliente e não encerrado) e `caso_etapa_mudancas` (só acréscimo: motivo, resultado e o texto do aviso, com `aviso_enviado_em` vazio até Conversas).
- **Mudar etapa:** `portal_juridico_caso_etapa` pede o motivo, recusa a mesma etapa e caso encerrado, e na etapa final pede o resultado (ganho, perda ou acordo) e encerra. O aviso é montado por `aviso_etapa_texto` (o mesmo de `textoAvisoEtapa` em `@t3jus/domain`) e fica gravado; o meio pode ser ajustado só daquela vez.
- **Honorários na ficha:** só vêm para quem tem a área Contratos ou Financeiro (`caso_ve_honorarios`); os outros veem o número do contrato e quem vê os valores.
- **Saída da pessoa (EX-10):** o gatilho `casos_passar_de_quem_saiu` passa os casos em andamento para quem recebeu o que era dela.
- **Inventário:** as quatro tabelas usam o prazo de guarda de 5 anos; a migration também corrige o prazo das tabelas do Financeiro (0220 e 0230), que tinham nascido com o texto antigo.
- **API:** `GET /v1/escritorio/juridico/casos` (`?situacao=ANDAMENTO|ENCERRADO&q=&responsavel=&etapa=`), `GET /juridico/opcoes`, `POST /juridico/casos`, `GET` e `PUT /juridico/casos/:id`, `POST /juridico/casos/:id/clientes` e `POST /juridico/casos/:id/etapa`.
- **Tela:** `/juridico/casos` (lista com a contagem por etapa), `/juridico/casos/novo` e `/juridico/casos/:id` (ficha com as janelas de mudar etapa, editar os dados e adicionar cliente).
- **Falta:** documentos (F3.35), editar as etapas do escritório (F3.36), enviar o aviso pelo WhatsApp (F3.37) e o êxito que vai ao Financeiro com o resultado (F3.14).

### Jurídico do Portal, prazos e tarefas (F3.34; EX-02, EX-04, PD-05, IN-08)

Mesmas telas aprovadas (estados prazos, novo-prazo, tarefas, tarefas-equipe e a ficha). Migration `0250_portal_juridico_prazos_tarefas.sql`, teste `025_portal_juridico_prazos_tarefas_test.sql`, e2e `portal-juridico-prazos.spec.ts`.

- **Banco:** `prazos` (o que é, prazo final, "fazer até" no prazo final ou antes, intimação de hoje ou antes, responsável, `lembrar`, quem cumpriu e quando) e `tarefas` (título, vencimento, responsável, o que ela espera e desde quando, quem concluiu). As duas passam por `proteger_tabela_escritorio`, entram no inventário com a guarda de 5 anos e só aceitam caso em andamento do mesmo escritório. Cumprir vale uma vez (`PRAZO_JA_CUMPRIDO`) e fica no histórico do caso; tarefa concluída pode ser reaberta.
- **Lista de casos e ficha:** `caso_linha` ganhou `proximoPrazo` e `pendencias` (tarefas abertas esperando alguém); a lista vem pelo prazo mais próximo e traz `hoje` e `totais.prazoHoje`; a ficha traz `prazos` e `tarefas` (abertos primeiro, feitos nos últimos 30 dias depois).
- **Carga da equipe (IN-08):** na visão da equipe, `carga` traz por pessoa os casos em andamento, as tarefas abertas e as atrasadas.
- **Saída da pessoa (EX-10):** o gatilho `prazos_tarefas_passar_de_quem_saiu` passa os prazos e as tarefas abertas para quem recebeu o que era dela.
- **API:** `GET /v1/escritorio/juridico/prazos` (`?mostrar=ABERTOS|MEUS|CUMPRIDOS&responsavel=`), `POST /juridico/prazos`, `POST /juridico/prazos/:id/cumprido`, `GET /juridico/tarefas` (`?visao=MINHAS|EQUIPE&responsavel=`), `POST /juridico/tarefas`, `POST /juridico/tarefas/:id/concluida` (`{ concluir }`) e `POST /juridico/tarefas/:id/chegou`.
- **Tela:** `/juridico/prazos` (agrupados em Vencidos, Hoje, Amanhã, Até sexta e Depois, com a urgência escrita), `/juridico/tarefas` (Minhas e Da equipe, com a carga), a seção "Prazos e tarefas" e o quadro "O que está travando" na ficha, e as colunas Próximo prazo e Pendências na lista de casos. As regras de urgência e de grupos ficam em `packages/ui/src/portal/juridico.ts`.
- **Falta:** o lembrete 2 dias antes no Início e no sino (F3.38) e editar prazo e tarefa, inclusive trocar o responsável (F3.39). O T3jus não lê publicações nem conta dias úteis; a tela diz isso.

### Jurídico do Portal, etapas do escritório e Petições (F3.36, F3.40; EX-07, EX-09)

Mesmas telas aprovadas (estados etapas e peticoes). Migration `0260_portal_juridico_etapas_peticoes.sql`, teste `026_portal_juridico_etapas_peticoes_test.sql`, e2e `portal-juridico-etapas.spec.ts`.

- **Quem edita:** a ação `juridico.etapas.editar` é só da função SOCIO (a sócia dona). A equipe com a área Jurídico vê a lista (`podeEditar: false`).
- **Editar e adicionar:** `portal_juridico_etapa_salvar` (sem id, entra logo antes da final; com id, pede a versão). Nome único no escritório, sem contar acento. A final aceita texto novo, mas não "avisar o Financeiro" (ela pede o resultado).
- **Ordem:** `portal_juridico_etapa_mover` troca com a vizinha (`SOBE` ou `DESCE`) num só comando; a final e a vizinha dela não trocam (`ETAPA_FINAL_FIXA`).
- **Tirar:** `portal_juridico_etapa_remover` pede `moverPara` quando há casos (não pode ser a final). Cada caso ganha uma linha em `caso_etapa_mudancas`, sem aviso ao cliente. A etapa não é apagada: ganha `removida_em`, sai da ordem (vai para 1001 em diante) e some de `etapas_lista`; o gatilho `casos_etapa_viva` impede qualquer caso de entrar nela.
- **Histórico:** `juridico.etapa_criada`, `etapa_editada` (antes e depois), `etapa_movida` e `etapa_removida`. O histórico recusa a chave `nome`, por isso o nome da etapa vai como `etapa`.
- **Petições (EX-09, a validar):** `peticao_interesse` guarda só quem respondeu, a resposta (`SEMANA`, `AS_VEZES` ou `NAO`) e como faz hoje. A página mostra a última resposta da pessoa e deixa mudar.
- **API:** `GET` e `POST /v1/escritorio/juridico/etapas`, `PUT /juridico/etapas/:id`, `POST /juridico/etapas/:id/mover`, `POST /juridico/etapas/:id/remover`, `GET` e `POST /juridico/peticoes`.
- **Tela:** `/juridico/casos/etapas` (o botão "Etapas do escritório" aparece na lista de casos só para a sócia dona) e `/juridico/peticoes`.
- **Falta:** as respostas de Petições no Console e o gerador (F3.41); o pedido ao Financeiro ao entrar na etapa marcada (F3.14).

### Jurídico do Portal, documentos do caso (F3.35; EX-03, EX-05, PD-05)

Mesma ficha aprovada (folha "Documentos"). Migration `0270_portal_juridico_documentos.sql`, teste `027_portal_juridico_documentos_test.sql`, e2e `portal-juridico-documentos.spec.ts`.

- **Os que faltam:** `documento_pedidos` guarda o que falta, com qual cliente do caso está (`cliente_id` precisa estar em `caso_clientes`), quando foi pedido e, se for o caso, quando foi pedido de novo (`repedido_em`). Só caso em andamento recebe pedido. Pedido não se apaga e, depois de chegar, não muda mais.
- **Já chegou:** `portal_juridico_documento_chegou` fecha o pedido sem arquivo; com arquivo, o envio leva o `pedidoId` e o pedido fecha ao concluir. O que falta entra em `pendencias` (lista de casos) e na ficha em `faltam`, e a tela mostra em "O que está travando".
- **Pedir de novo:** a tela mostra o texto pronto (`textoPedirDocumento`, com o primeiro nome do cliente e o nome do escritório) para copiar ou abrir no WhatsApp do aparelho, e `portal_juridico_documento_repedir` guarda a data. Abrir a conversa pelo WhatsApp do escritório fica para Conversas (F3.42).
- **Ligados ao caso:** `documentos_caso`, com o mesmo envio em duas etapas do Console, num bucket separado e privado (`documentos-portal`, PDF, JPG ou PNG até 10 MB; caminho `<escritório>/<documento>`). Categorias: petição, decisão ou sentença, procuração, documento do cliente e outro. Nada se apaga. Caso encerrado ainda recebe arquivo.
- **Histórico:** `juridico.documento_pedido`, `documento_repedido`, `documento_chegou` (com `comArquivo`), `documento_anexado` e `documento_aberto`. O nome do arquivo não vai para o histórico.
- **API:** `POST /v1/escritorio/juridico/casos/:id/pedidos`, `/pedidos/:id/de-novo`, `/pedidos/:id/chegou`, `/casos/:id/documentos`, `/documentos/:id/concluir` e `/documentos/:id/abrir`. A CSP do Portal aceita a origem do Storage pela variável `ARQUIVOS_ORIGEM`, como no Console.

### Fim do contrato e saída da pessoa (F0.14; PT-11)

Telas aprovadas em `docs/design/aprovadas/console-fim-contrato` (decisões da Carol de 19/11/2026 no `NOTAS.md`). Migration `0210_fim_contrato.sql`, teste `021_fim_contrato_test.sql`, e2e `fim-contrato.spec.ts`.

- **Encerrar e reabrir** (`console_encerrar_contrato`, `console_reabrir_contrato`, ação `console.contrato.encerrar`, só a Administração). Pede data do fim (hoje ou depois), motivo e o nome do escritório. Data futura fica "marcada" e a rotina encerra no dia; desmarcar e reabrir pedem motivo. Reabrir vale até o fim da guarda de 5 anos e volta ao estágio de antes.
- **Os prazos** ficam em `configuracoes`: `prazo_consulta_dias` (30), `prazo_entrada_dias` (90) e `prazo_guarda_anos` (5). As datas que as telas mostram saem de `datas_do_contrato()` e, no navegador, de `datasDoFim()` (`@t3jus/domain`).
- **Só consulta.** Nos 30 dias, o gatilho `contrato_aceita_escrita` recusa (TC401, motivo `CONTRATO_ENCERRADO`) toda escrita no escritório, nos vínculos do Portal e em toda tabela que passa por `proteger_tabela_escritorio`; tabela nova ganha o gatilho sozinha. No Portal, a moldura põe a classe `pt-consulta` e esconde tudo o que tem `data-muda`: **botão novo de criar ou mudar algo no Portal leva `data-muda`**. Convites pendentes deixam de valer no dia do fim.
- **Acesso fechado.** No 30º dia, a rotina fecha o acesso (apaga as sessões) e o escritório some da escolha; quem só tinha ele vê "O acesso terminou". Nada dos clientes é apagado: tudo fica guardado 5 anos (o inventário diz isso em cada tabela com o prazo "Enquanto o escritório for cliente do T3jus e 5 anos depois do fim do contrato"; **tabela nova de dado do escritório usa esse texto**).
- **Saída da pessoa.** Quem fica 90 dias sem acesso a nenhum escritório nem à equipe T3jus tem a entrada (e-mail e senha no Supabase Auth) apagada pela rotina; `pessoas` fica com o nome e `entrada_apagada_em`. A data aparece antes na Equipe do Portal (filtro Retiradas), na Equipe T3jus e no Suporte. Voltar depois disso é por convite novo.
- **Contato do T3jus**: `CONTATO_T3JUS` em `@t3jus/domain`, provisório (`atendimento@exemplo.com.br`) até a Carol mandar o real.
- **Falta**: apagar tudo no fim da guarda de 5 anos (F0.15, inclusive os arquivos do Storage) e os avisos por e-mail à sócia dona (F0.16).
