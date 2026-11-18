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
- **Rotina dos prazos (F0.13, migration 0080).** `aplicar_prazos()` roda toda noite às 3h de Brasília pelo pg_cron e só age em tabela com prazo `APROVADO`. Hoje aplica: sessões de escritório (30 dias), contadores de tentativas (1 dia) e entradas no sistema no histórico (6 meses). Os números ficam em `configuracoes` (`prazo_*`). Cada execução grava `dados.prazos_aplicados` no histórico com a contagem por tabela. O histórico continua só de inserção; só a rotina, como dono das tabelas e com a marca `t3jus.aplicando_prazos`, apaga. Prazos que dependem do fim do contrato ou da saída da pessoa ainda não têm gatilho e aparecem em `sem_gatilho` (F0.14). Teste: `009_rotina_prazos_test.sql`.

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

`packages/ui/src/console/` traz a moldura (`MolduraConsole`), a carteira (`Carteira`) e a ficha (`FichaCliente`) das telas aprovadas em `docs/design/aprovadas/console-carteira.html` e `console-ficha.html`. O estilo é `console.css`, copiado do desenho com escopo `.co`; em tela estreita o menu vira faixa no topo e a tabela vira cartões, até a moldura de celular ser aprovada. As regras da carteira (pendências, "Pedem você agora", busca e ordem) ficam em `carteira.ts`, com testes.

| Rota | O que faz |
|---|---|
| `/` | Carteira (`GET /v1/clientes`): só os clientes atribuídos a quem entrou, com estágio, etapas da implantação, pendências, sócio, equipe e última atividade (`console_carteira`, migration `0110`). |
| `/clientes/[id]` | Abre a ficha na aba Sócio. |
| `/clientes/[id]/socio` | Cabeçalho com a implantação (Ficha, Contrato, Equipe, Sócio no Portal) e "Passar para ativo" quando as quatro estão feitas. Caminho do convite de cada sócio (enviado, senha criada em `pessoas.senha_criada_em`), reenviar (`POST /v1/clientes/:id/socios/:vinculo/reenviar`) e convidar outro sócio. O e-mail do sócio vem do Auth, nunca do banco. |
| `/clientes/[id]/{ficha,contrato,equipe,notas,historico}` | Ainda sem tela aprovada: mostram o aviso. |

O que o desenho mostra e ainda não tem dado: busca global e avisos no topo, plano do cliente, OAB e WhatsApp do sócio, "e-mail aberto" no caminho do convite, link do convite para copiar e prazo de implantação em dias.

### Contrato e documentos do cliente (CO-05)

O arquivo vai direto do navegador para o Storage, num bucket privado (`documentos-console`, PDF, JPG ou PNG até 10 MB), sem passar pela API nem pela Vercel. A tabela `documentos_cliente` é interna (o escritório não vê) e só recebe inserção; nada se apaga.

1. `POST /v1/clientes/:id/documentos` registra o anexo (categoria, nome, tipo, tamanho) e devolve um endereço de envio de uso único. O caminho no Storage é `<escritório>/<documento>`, montado no servidor.
2. O navegador manda o arquivo (`PUT`) para esse endereço. A CSP do Console aceita a origem do Storage pela variável `ARQUIVOS_ORIGEM`.
3. `POST /v1/clientes/:id/documentos/:doc/concluir` confere no Storage se o arquivo chegou com o tamanho e o tipo registrados e só então o anexo aparece na lista (`GET`).
4. `POST /v1/clientes/:id/documentos/:doc/abrir` devolve um link de 60 segundos e registra a abertura no histórico interno.

A conferência com o Storage de verdade fica para quando o projeto Supabase existir (E1); os testes usam um Storage falso.
