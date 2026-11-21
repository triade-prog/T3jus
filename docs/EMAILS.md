# E-mails do T3jus

Hoje todos os e-mails do sistema são do login e saem pelo Supabase Auth. O código não manda e-mail por conta própria: ele pede ao Auth e o Auth manda.

| E-mail | Quando sai | Modelo no Supabase | Arquivo | Leva para |
|---|---|---|---|---|
| Convite | Console convida o sócio ou alguém da equipe T3jus; Portal convida alguém da equipe do escritório; "reenviar convite" | Invite user | `sistema/supabase/templates/convite.html` | `/criar-senha` do app |
| Nova senha | "Esqueci a senha" no Portal ou no Console; suporte de acesso no Console | Reset password | `sistema/supabase/templates/nova-senha.html` | `/redefinir` do app |
| Link de acesso | "Entrar com link por e-mail" | Magic link | `sistema/supabase/templates/link-de-acesso.html` | `/entrar/link` ou `/entrar/link/sessao` |

Os três links valem 1 hora e funcionam uma vez só (decisão da Carol, 18/11/2026). O link de todos é `{{ .RedirectTo }}?token_hash={{ .TokenHash }}`: o modelo padrão do Supabase (`{{ .ConfirmationURL }}`) **não serve**, porque as telas do T3jus esperam o `token_hash`.

## E-mails que o próprio sistema manda

Estes saem pela API do Resend, com o segredo `RESEND_API_KEY` nas Edge Functions (Edge Functions > Secrets). Sem o segredo, a ação continua e o e-mail simplesmente não sai.

| E-mail | Quando sai | Onde está |
|---|---|---|
| Autenticador tirado | O suporte tira o autenticador de alguém no Console (F1.12): a própria pessoa fica sabendo e, se não foi ela que pediu, fala com o escritório | `sistema/supabase/functions/_shared/email.ts` |

A chave pode ser a mesma do SMTP ou uma nova (**API Keys > Create API Key**, nome `supabase-funcoes`, **Sending access**, domínio `t3jus.pro`). Só a Carol cola.

Ainda não sai: o aviso de fim de contrato (F0.16).

## Remetente

`T3jus <nao-responda@t3jus.pro>`, pelo Resend, com o domínio `t3jus.pro` verificado na região São Paulo (DNS na Hostinger). Quem tiver dúvida escreve para `contato@t3jus.pro`, que aparece no rodapé.

## Passo a passo no projeto hospedado (feito pela Carol)

A chave do Resend é segredo: só a Carol vê e cola. Ninguém pede a chave pelo chat.

### 1. Criar a chave no Resend

Em resend.com, **API Keys > Create API Key**:
- Nome: `supabase-auth`
- Permissão: **Sending access**
- Domínio: `t3jus.pro`

Copie a chave (começa com `re_`). Ela aparece uma vez só.

### 2. Ligar o SMTP no Supabase

No projeto **t3jus**, **Authentication > Emails > SMTP Settings**, ligue **Enable custom SMTP** e preencha:

| Campo | Valor |
|---|---|
| Sender email | `nao-responda@t3jus.pro` |
| Sender name | `T3jus` |
| Host | `smtp.resend.com` |
| Port number | `465` |
| Minimum interval between emails | `60` |
| Username | `resend` |
| Password | a chave do passo 1 |

Salve.

### 3. Colar os modelos

Em **Authentication > Emails > Templates**, para cada linha abaixo: abra o modelo, troque o assunto, apague o corpo inteiro e cole o conteúdo do arquivo (aba "Source"). Salve cada um.

| Modelo | Assunto | Arquivo |
|---|---|---|
| Invite user | `Seu convite para o T3jus` | `convite.html` |
| Reset password | `Crie uma nova senha no T3jus` | `nova-senha.html` |
| Magic link | `Seu link para entrar no T3jus` | `link-de-acesso.html` |

### 4. Endereços permitidos

Em **Authentication > URL Configuration**:
- **Site URL:** `https://app.t3jus.pro`
- **Redirect URLs** (adicione os oito):
  - `https://app.t3jus.pro/criar-senha`
  - `https://app.t3jus.pro/redefinir`
  - `https://app.t3jus.pro/entrar/link`
  - `https://app.t3jus.pro/entrar/link/sessao`
  - `https://console.t3jus.pro/criar-senha`
  - `https://console.t3jus.pro/redefinir`
  - `https://console.t3jus.pro/entrar/link`
  - `https://console.t3jus.pro/entrar/link/sessao`

Sem isso, o Supabase troca o endereço pelo Site URL e o link do e-mail abre a tela errada.

### 5. Conferir a validade

Em **Authentication > Sign In / Providers > Email**, **Email OTP Expiration** = `3600` (1 hora).

## Ambiente local

O `config.toml` traz os mesmos modelos e o SMTP do Resend **desligado** (`enabled = false`), para o Supabase local não mandar e-mail de verdade. Para testar o Resend localmente, ligue e exporte `RESEND_API_KEY`.

## Limites

Com SMTP próprio, o Supabase deixa mandar 30 e-mails por hora no projeto (Authentication > Rate Limits); o T3jus ainda limita os convites por pessoa (`limite_contar`). O plano grátis do Resend manda até 100 e-mails por dia.
