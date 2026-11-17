# Sistema T3 Just

Código dos dois sistemas do T3 Just (DC1): a **Plataforma do escritório** e o **Console T3 Just** (equipe interna). As decisões estão em [`../docs/CONTEXTO.md`](../docs/CONTEXTO.md). O andamento está no painel de execução, em [`../docs/painel/`](../docs/painel/LEIA-ME.md). As ideias que cada parte atende estão no [`../IDEIAS.md`](../IDEIAS.md).

A base veio da fundação (passo 0) do TRÍADE Condo, que por sua vez veio do T-shirt Club (DC5, DC6): só as peças genéricas, com "condomínio" trocado por "escritório".

## Estrutura

```
apps/plataforma     Plataforma do escritório (Next.js 16, porta 3000)
apps/console        Console T3 Just (Next.js 16, porta 3001)
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
  - Na Plataforma, o escritório vem da sessão no servidor (`escolher_escritorio`), nunca do que o navegador manda.
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
4. Termine a migration com `call fechar_acesso();`.
5. Nomeie os testes de cada regra com o código da ideia (DC9).

Se a tabela não tiver escritório, ela precisa de um motivo em `tabelas_sem_escritorio`. Sem o motivo, o teste `001_acesso_rls_test.sql` falha.

## Rodar

Requisitos: Node 22, pnpm 10 e PostgreSQL 16 ou 17 com pgTAP (`postgresql-17-pgtap`).

```bash
pnpm install
cp .env.example apps/plataforma/.env.local   # e apps/console/.env.local
pnpm dev:plataforma   # http://localhost:3000
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
