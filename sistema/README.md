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

A migration `0060_console_clientes.sql` e a `api-console` trazem o Console no servidor. As telas ainda não existem (F1.5 no painel).

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

### Tela de entrar (F1.4)

`packages/ui` traz a moldura (`TelaAcesso`), o formulário (`Entrar`) e o estilo (`acesso.css`) da tela aprovada em `docs/design/aprovadas/entrar.html`. Cada app só passa os textos (`apps/*/src/acesso.ts`). Rotas: `/entrar` e `/entrar/link` (volta do link de acesso; `/entrar/link/sessao` quando "manter conectado" foi desmarcado). As fontes vêm do pacote `@fontsource`, servidas pelo próprio app, porque a CSP só aceita fonte de `'self'`.
