# Clientes: termo de curatela · notas

**Aprovado pela Carol em 23/11/2026 às 8h11 (Bahia)** ("ok").

**Proposta para a Carol aprovar.** Item F3.118 do painel (termo de curatela como anexo da ficha; refs AP-01 e CH-08). Parte do desenho aprovado em `docs/design/aprovadas/portal-responsavel-legal` e não muda nada dele, a não ser a linha do arquivo do termo (abaixo). Mesmo elenco: Sebastião Ramos Filho, sob curatela, a curadora Helena Ramos Castro, escritório Ribeiro & Matos, hoje 22/11/2026. Dados fictícios.

Abra o `index.html` e use o botão **Estados**. Capturas em computador (1440 px) e celular (390 px).

## O que mudou

| Estado | O que é |
|---|---|
| `ficha-termo-falhou` | Novo. Ficha de Sebastião logo depois de **Cadastrar cliente**: os dados foram salvos, mas o termo não subiu (caso sem conexão). |
| `ficha-termo-falhou-salva` | Novo, variação do anterior: depois de **Salvar** na edição, com outro caso (arquivo recusado). |
| `ficha-baixar-erro` | Novo. Ficha de Sebastião com o termo e o erro ao clicar em **Baixar o termo**. |
| `ficha-curatela` | O aprovado, com a única mudança contornada: sai “2 páginas”. |
| `novo-curatela` | O aprovado, com a única mudança contornada: sai “2 páginas”. |

A nota tracejada e o contorno “Única mudança” das duas últimas capturas são marca de desenho e não vão para o produto.

### 1. O termo não foi guardado depois de salvar

- Usa o mesmo aviso de feito da ficha (o `toast` de “Marcos Vinícius Duarte cadastrado.”), no tom de atenção (`aviso-atencao`, ícone de alerta), no mesmo lugar: embaixo à direita no computador e acima da barra de baixo no celular. Tem o X para fechar e não some sozinho.
- A folha **Quem assina por Sebastião** aparece sem o bloco do termo, porque não há termo guardado. O resto da ficha está como no aprovado.
- Textos exatos:
  - Cadastro novo: título **“Sebastião Ramos Filho cadastrado.”** (o nome completo, como no aviso aprovado “Marcos Vinícius Duarte cadastrado.”)
  - Edição: título **“Ficha salva.”**
  - O texto é uma **frase fixa por caso**. A mensagem do servidor não entra no texto: os textos de `TEXTOS_ERRO` não cabem nessa frase (por exemplo, `VALIDATION_ERROR` é “Confira os campos destacados…”), e passar a primeira letra para minúscula ou cortar no ponto quebra siglas e números.

| Caso | Código que chega | Texto do aviso |
|---|---|---|
| Arquivo recusado (formato ou tamanho) | conferência no navegador antes do envio, ou `VALIDATION_ERROR` no envio do termo | O termo de curatela não foi guardado: o arquivo precisa ser PDF ou foto, até 10 MB. Mande de novo em “Mudar”, na folha Quem assina por Sebastião. |
| Sem conexão ou servidor fora | falha de rede, envio interrompido no meio, `UPSTREAM_UNAVAILABLE` | O termo de curatela não foi guardado: não deu para falar com o T3jus. Mande de novo em “Mudar”, na folha Quem assina por Sebastião. |
| O cliente deixou de estar sob curatela | motivo `CLIENTE_NAO_CURATELA` | O termo de curatela não foi guardado: Sebastião não está mais sob curatela na ficha. |
| Sessão encerrada | `UNAUTHORIZED` | O termo de curatela não foi guardado: sua sessão terminou. Entre de novo para enviar o termo. |
| Sem permissão | `FORBIDDEN` | O termo de curatela não foi guardado: o seu acesso não permite enviar o termo. Fale com quem cuida dos acessos. |
| Outro erro | qualquer outro (`INTERNAL_ERROR`, `RATE_LIMITED`, `NOT_FOUND`…) | O termo de curatela não foi guardado: algo deu errado do nosso lado. Mande de novo em “Mudar”, na folha Quem assina por Sebastião. |

“Sebastião” é o primeiro nome do cliente. As capturas mostram o caso sem conexão (`ficha-termo-falhou`) e o caso do arquivo recusado (`ficha-termo-falhou-salva`).

### 2. Erro ao baixar o termo

- Logo abaixo da linha do arquivo, dentro da folha Quem assina por Sebastião, um aviso curto (`aviso-urgencia`, o mesmo componente do formulário com erros, no tamanho do bloco):
  - título **“Não deu para baixar o termo.”**
  - texto do erro: o de `textoDoErro`, sem mudança. No desenho, `UPSTREAM_UNAVAILABLE`: **“Não deu para falar com o T3jus agora. Confira a sua internet e tente de novo em instantes.”**
- O botão **Baixar o termo** continua: tentar de novo é clicar nele outra vez.

### 3. A linha do arquivo do termo

O sistema não conta páginas, então “2 páginas” sai:

- formulário (`novo-curatela`): **“PDF · 380 KB”** (antes “PDF · 2 páginas · 380 KB”);
- ficha (`ficha-curatela`): **“termo-curatela-sebastiao.pdf · enviado por Paula Nunes em 05/11”** (antes “… · 2 páginas · enviado …”).

## Acessibilidade

- O aviso de feito em atenção tem `role="status"` (leitor de tela lê sem interromper), título e texto, ícone além da cor, e o X tem o nome “Fechar aviso”.
- O erro ao baixar tem `role="alert"` (é lido assim que aparece, logo depois do clique) e o botão **Baixar o termo** aponta para ele com `aria-describedby`, então quem volta ao botão ouve o erro de novo.
- **Para quem programar:** o aviso com `role="alert"` do erro ao baixar entra na página no momento do erro e é recriado a cada falha (sem isso, o leitor de tela não lê a segunda falha). A área com `role="status"` do aviso de feito já existe na página antes de o texto entrar; o texto é posto nela depois.
- Conferência (`_conferencia.json`, axe-core 4.10.3 com WCAG 2.0, 2.1 e 2.2, A e AA): **nenhuma violação** nos 5 estados, nos dois tamanhos; **sem rolagem lateral** em nenhum; **alvos de 44 px ou mais**. Exceções iguais às do desenho aprovado: a marca T3jus do menu (204 × 24 px) e, só no computador, o botão compacto da linha do arquivo (“Baixar o termo”, “Trocar arquivo”), com 36 px; no celular ele ocupa a linha toda e tem 44 px.

## Como gerar

`sh _fonte/gerar.sh .` (com `AXE_PW` apontando para `@axe-core/playwright` e `NODE_PATH` para onde está o `playwright`). As fontes são cópias sem mudança das do desenho aprovado; `termo.py` lê `responsavel.py` até o começo dos estados e acrescenta só as peças com o prefixo `tc-`.

## Para decidir

- Com o termo não guardado, a lateral “Para gerar a procuração” continua com “Tudo pronto. Ao gerar, lembre de juntar o termo de curatela à procuração.”, como no aprovado (o termo é opcional e não conta nos 12 dados). **Recomendo manter.**
