# F3.204 · Propostas de cliente excluído ou arquivado a pedido do titular · notas do desenho

**Aprovado pela Carol em 27/11/2026, com todas as recomendações** (as cinco perguntas no fim: P1 a P3 na opção A, a linha do histórico e os textos novos). Programado na F3.204 (migrations 1144 e 1145). No código, o selo vem de `SELO_ENCERRADA` (`packages/ui/src/portal/comercial.ts`) e a marca `encerrada` de `proposta_linha`; o segmento da barra é `.fb-e` e a coluna Situação da lista é `.cm-sit`. A linha do histórico aparece na enviada, em negociação e no rascunho; a ficha da proposta aceita fica como a F3.181 aprovou, sem a linha (este desenho só a mostra na enviada). O texto do arquivado na recusa da API é o da F3.181 ("Este cliente foi arquivado a pedido do titular").

Desenho das telas do plano `t3jus/f3-204/plano.md`, com as correções da `revisao.md`. Onde as duas discordam, vale a revisão:

- a situação da proposta continua a que foi gravada (Aceita, Enviada, Rascunho) e entra uma marca `encerrada`;
- a ficha da proposta aceita aprovada na F3.181 ("Não vira contrato") não muda;
- o Funil conta por cliente, sem conta dupla (M1);
- os estados foram juntados, retirados e acrescentados como a revisão pede;
- as perguntas seguem a ordem da revisão (P1 a P3), e a antiga C3 virou um estado para escolher.

Ideias: PT-11 (exclusão), AP-03 (Funil), AP-05 (Propostas) e PT-03 (nada some em silêncio).

O que muda, em uma frase: **a proposta de um cliente excluído ou arquivado a pedido do titular sai das listas de trabalho e fica como registro.** As listas de trabalho são Propostas › Em andamento, as colunas do Funil, "Propostas esperando resposta" em Atendimentos e o rodapé do Comercial no Início. O registro guarda o que aconteceu até ali e ganha o selo "Encerrada a pedido". Ninguém consegue mais responder, editar ou marcar como enviada.

O contorno tracejado em âmbar só marca o que é novo no desenho. As peças já aprovadas aparecem sem contorno, inclusive as da F3.181 (o escopo e o Word apagados). **No produto, não há contorno.**

Dados fictícios (os mesmos da F3.181):
- escritório Reis & Coelho: Paula Reis (sócia dona), Diego Martins (Comercial), Bianca Torres (Contratos);
- a cliente Marina Alves Coelho tem a proposta **P-2026-014** (Benefício por incapacidade, R$ 3.500,00 mais êxito), aceita e pedida em 12/11, e a **P-2026-019** (Revisão de aposentadoria, R$ 2.000,00 mais êxito), enviada em 14/11;
- Marina foi excluída, ou arquivada, a pedido em 20/11/2026.

Na lista aprovada, a P-2026-014 era de Benedito Souza Lima. Aqui ela é de Marina, e a de Benedito passa a ser a P-2026-018. Nas telas de Funil, Atendimentos e Início, a cliente dos desenhos aprovados (Antônia, que a troca de nomes da F3.181 transformava em Marina) virou Helena Prado Souza. Assim Marina, que foi excluída, não aparece com contrato nem com contato de hoje. O cadastro não guarda gênero, por isso os textos dizem "o cliente".

## O que mudou em relação ao aprovado

1. **Propostas, lista**:
   - filtro novo **"Encerradas a pedido (n)"**, depois de "Recusadas", que só aparece com n > 0;
   - "Em andamento (n)" deixa de contar a encerrada, e o "· 1 aceita esperando o contrato" também;
   - no filtro novo: a contagem, o selo na coluna Situação, a linha pequena "Enviada em 14/11" ou "Aceita em 12/11" embaixo do selo, o Retorno "—" (sem "validade vencida") e um pé próprio.
2. **Ficha da proposta enviada ou em negociação**: o quadro âmbar troca "Retorno" e "Registrar resposta" por "Não segue". Saem "Editar" (nas condições), "Editar a proposta" (na lateral) e o quadro "Sem redigitar". As condições dizem "Ficam como registro.".
3. **Ficha do rascunho**: "Não segue" no lugar de "Falta enviar". Sai "Marcar como enviada", que hoje ainda funciona para o arquivado.
4. **Histórico** (para escolher): uma linha calculada no topo, "Encerrada a pedido do titular".
5. **Ação recusada no instante** (página aberta antes): o aviso de urgência entre o cabeçalho e as folhas, no lugar do "Não deu para concluir.". Na resposta, a janela fecha antes (M2).
6. **Editar pelo link** e **salvar recusado** (M2): um aviso no lugar do formulário, com "Voltar para a proposta". Sai o "escreva uma proposta nova".
7. **Funil**:
   - as colunas Proposta enviada, Em negociação e Aceita deixam de mostrar a encerrada;
   - na barra do período, o segmento e a linha "encerrada a pedido do titular" (só o arquivado, só com n > 0);
   - a frase para o leitor de tela ganha o pedaço novo.
8. **Atendimentos e Início**: a encerrada sai de "Propostas esperando resposta" e do rodapé do Comercial. Não há peça nova, só o número muda.
9. **O que não muda**:
   - a ficha da proposta aceita aprovada na F3.181, com o selo "Aceita" e "Não vira contrato";
   - o bloco "Pedidos de contrato";
   - a Origem dos contatos;
   - "Saíram sem proposta";
   - a coluna "Contrato no período".

## O texto de cada peça nova

### 1. Lista de Propostas

- Filtro: **Encerradas a pedido ({n})**. No produto: `{ v: "ENCERRADAS", t: "Encerradas a pedido (n)" }`, só com `contagem.encerradas > 0`. Se o filtro estiver escolhido e o número cair a 0, a lista volta para "Em andamento".
- Contagem: 1: "**1 proposta encerrada a pedido do titular**" · n: "**{n} propostas encerradas a pedido do titular**". Com busca, vale a frase de hoje ("{n} propostas encontradas para …").
- Selo (Situação): **Encerrada a pedido**, tom neutro, ícone `historico`.
- Linha embaixo do selo, a partir do estado gravado:
  - Rascunho: "Rascunho desde {dd/mm}";
  - Enviada: "Enviada em {dd/mm}";
  - Em negociação: "Em negociação";
  - Aceita: "Aceita em {dd/mm}".
- Retorno: "—".
- Pé (no lugar do pé de hoje, só neste filtro): "Proposta de cliente excluído ou arquivado a pedido do titular não segue. Ela fica guardada como registro, com o que aconteceu até ali, e sai de Atendimentos, do Início e das colunas do Funil." O link é "Funil".
- Cliente excluído: "Cliente excluído" e "{número} · Serviço apagado a pedido do titular", como a lista já mostra hoje.
- No celular, a tabela vira cartões, como hoje. O selo e a linha pequena ficam à direita, em "Situação".

### 2. Ficha da proposta encerrada (quadro âmbar)

O sobretítulo é o estado gravado: "Enviada em 14/11", "Em negociação" ou "Rascunho". O título é **Não segue**, em 30 px, como "Não vira contrato".

| Estado gravado | Texto |
|---|---|
| Enviada ou em negociação, excluído | "O cliente foi excluído a pedido do titular em 20/11/2026. A proposta fica só como registro, sem resposta: não dá mais para registrar a resposta nem editar." |
| Enviada ou em negociação, arquivado | "O cliente foi arquivado a pedido do titular em 20/11/2026. A proposta fica só como registro, sem resposta: não dá mais para registrar a resposta nem editar." |
| Rascunho (excluído ou arquivado) | "O cliente foi {excluído/arquivado} a pedido do titular em 20/11/2026. A proposta não foi enviada e fica só como registro." |
| Aceita | Sem mudança: o quadro da F3.181 ("Não vira contrato"). |

Também na ficha:
- o selo do cabeçalho continua o estado gravado ("Enviada", "Rascunho"), como o "Aceita" da F3.181;
- as condições dizem "Ficam como registro.";
- no excluído, o escopo diz "Apagado a pedido do titular." e a lateral diz "O arquivo Word da proposta foi apagado com os dados do cliente." (já aprovados);
- "Vale até" sem "(vencida)".

### 3. Linha do histórico (estado `pr-historico-encerrada`, para escolher)

No topo do histórico, no dia em que o cliente saiu (a data vem de `clienteSaiuEm`), sem hora:
- linha: "**Encerrada a pedido do titular**", com o selo "Encerrada a pedido";
- texto pequeno: "O cliente foi {excluído/arquivado} a pedido do titular. A proposta não segue."

Sem protocolo e sem nome de quem fez. Não é uma mudança gravada: a linha sai da data do cliente.

### 4. Ação recusada no instante (aviso de urgência, a página recarrega)

| Ação | Título | Texto |
|---|---|---|
| Registrar a resposta | "Não deu para registrar a resposta." | "O cliente foi {excluído/arquivado} a pedido do titular agora há pouco. A proposta abaixo já mostra como ficou: ela não segue." |
| Marcar como enviada | "Não deu para marcar como enviada." | o mesmo |

Na resposta, a janela fecha primeiro e depois a página recarrega, como o pedir da F3.181 (M2). Vale para os códigos `CLIENTE_EXCLUIDO` e `CLIENTE_ARQUIVADO`.

### 5. Editar

- **Pelo link** (aviso informativo, no lugar do formulário): "A proposta não segue." · "O cliente foi {excluído/arquivado} a pedido do titular em 20/11/2026. Ela fica só como registro e não se edita mais." · [Voltar para a proposta]
- **Salvar recusado** (aviso de urgência, no lugar do formulário): "Não deu para salvar a proposta." · "O cliente foi {excluído/arquivado} a pedido do titular agora há pouco. A proposta não segue: ela fica só como registro, sem as mudanças." · [Voltar para a proposta]
- Proposta já respondida, de cliente ativo: continua o aviso de hoje ("Esta proposta já foi respondida…").

### 6. Funil, barra do período

- Legenda, em "Receberam proposta", entre "proposta em andamento (abaixo)" e as recusas: "**{n}** encerrada a pedido do titular". Só com n > 0.
- Segmento da barra: listrado no tom vinho #AC788D sobre branco, com contorno. É da família de "receberam proposta" e se distingue do listrado âmbar de "ainda em atendimento, sem motivo".
- Frase para o leitor de tela: "Dos 24: 9 viraram contrato, 3 com proposta em andamento, **1 encerrada a pedido do titular**, 1 fechou com outro escritório, …" (no plural, "encerradas").
- `recusaram` passa a ser `comProposta − contrato − andamento − encerradas`.

## Os campos que o servidor devolve

```ts
// PropostaLinha (proposta_linha): a situação continua o estado gravado (A1 da revisão)
encerrada: boolean;                 // proposta_encerrada(p, k): cliente EXCLUIDO ou ARQUIVADO e estado RASCUNHO, ENVIADA, NEGOCIACAO ou ACEITA
enviadaEm: string | null;           // para "Enviada em 14/11" (só data, sem dado pessoal)
respondidaEm: string | null;        // para "Aceita em 12/11"
// quando encerrada: vencida = false e retorno = null
// ListaPropostas
contagem: { andamento: number; contrato: number; recusadas: number; encerradas: number };
// GET /v1/escritorio/propostas?mostrar=ENCERRADAS  (a api-portal precisa aceitar o valor novo)
// FichaProposta: já tem clienteSituacao e clienteSaiuEm (F3.181); ganha encerrada (de PropostaLinha);
//   retornoCompleto = null quando encerrada. A linha do histórico (se escolhida) é montada na tela com clienteSaiuEm.
// Funil
depoisProposta: { andamento: number; encerradas: number; recusadas: { motivo: MotivoRecusa; n: number }[] };
// encerradas = clientes do período com proposta, sem contrato, ARQUIVADO e última proposta RASCUNHO/ENVIADA/NEGOCIACAO/ACEITA (M1)
// agora.enviada, agora.negociacao, agora.aceita: sem as encerradas
// Retornos.propostasEsperando e Início (propostasEsperando, propostaMaisAntiga): sem as encerradas
// POST .../enviada, .../resposta e PUT da edição: recusam com VALIDATION_ERROR e detalhes.motivo CLIENTE_EXCLUIDO ou CLIENTE_ARQUIVADO
```

No produto:
- o selo vem de `SELO_ENCERRADA = { tom: "neutro", icone: "historico" }`, fora de `SELO_SITUACAO`, e `SeloSituacao` mostra ele quando `encerrada`;
- `EDITAVEL` deixa de valer para a encerrada;
- o Portal lê `encerrada ?? false` e `encerradas ?? 0`, para funcionar antes da migration (A1, item 2).

## Os estados desenhados (16, cada um em computador e celular)

| Estado | Página | O que mostra |
|---|---|---|
| `pl-encerradas` | comercial | Filtro "Encerradas a pedido (2)", cliente arquivado: as duas propostas de Marina |
| `pl-encerradas-excluido` | comercial | O mesmo, com "Cliente excluído" |
| `pr-encerrada-enviada-excluido` | comercial | P-2026-019 enviada: "Não segue", sem botões; escopo e Word apagados |
| `pr-encerrada-enviada-arquivado` | comercial | O mesmo, arquivado, com o nome, o escopo e o Word |
| `pr-encerrada-rascunho` | comercial | Rascunho do arquivado: "Não segue", sem "Marcar como enviada" |
| `pr-historico-encerrada` | comercial | A linha calculada no topo do histórico (sem ela: `pr-encerrada-enviada-excluido`) |
| `pr-acao-recusada` | comercial | "Não deu para registrar a resposta.", já recarregada |
| `pr-acao-recusada-enviada` | comercial | "Não deu para marcar como enviada." no rascunho |
| `ed-encerrada` | comercial | Editar pelo link: "A proposta não segue." |
| `ed-encerrada-salvar` | comercial | Salvar recusado: "Não deu para salvar a proposta." |
| `fu-hoje` | funil | O Funil de hoje: os cartões "Cliente excluído" nas colunas e o arquivado em "andamento" |
| `fu-barra-encerrada` | funil | Depois: colunas sem a encerrada e a linha nova na barra |
| `at-hoje` / `at-depois` | funil | Atendimentos, "Propostas esperando resposta", antes e depois |
| `in-hoje` / `in-depois` | inicio | Início da equipe, rodapé do Comercial e cartão de cima, antes e depois |

Comparado com a lista da revisão:
- `pl-encerradas` ganhou a versão do excluído;
- `sai-das-listas` virou três pares, de antes e depois, nas próprias telas (Funil, Atendimentos, Início);
- `pr-acao-recusada` ganhou a versão do "marcar como enviada";
- `ed-encerrada` ganhou a do salvar recusado;
- **`cl-aba-propostas-encerrada` não foi desenhado.** Na ficha do cliente arquivado ou excluído, o produto não mostra a aba Propostas: `temAba` em `FichaCliente.tsx` só deixa Ficha e Atendimentos quando a situação é EXCLUIDO ou ARQUIVADO. Por isso o selo e o texto pequeno da revisão (b3) não aparecem para esse cliente. O mesmo vale para a quebra da aba citada no A1. A proposta do arquivado só se acha pela lista de Propostas, o que pesa na P2.

## Decisões de desenho, e por quê

1. **O selo do cabeçalho da ficha continua o estado gravado** ("Enviada", "Rascunho"), e o quadro âmbar diz "Não segue". É o que a F3.181 aprovou na aceita ("Aceita" e "Não vira contrato"). As três fichas ficam iguais entre si, e o fato (foi enviada em 14/11) não some.
2. **Na lista, o selo novo vem com a linha do que aconteceu** ("Aceita em 12/11"). Na lista, o que interessa é que ela não segue. A linha pequena guarda o fato sem precisar abrir a ficha.
3. **"Não segue", e não "Encerrada", no título do quadro.** "Não segue" diz o que importa para quem abre: não há mais o que fazer. É o par de "Não vira contrato".
4. **O filtro novo fica por último e só aparece quando há alguma.** Ele é raro, e quem não tem cliente que saiu não vê nada novo.
5. **No Funil, a encerrada simplesmente sai das colunas.** Não ganha cartão nem marca. As colunas são trabalho a fazer, e ali não há nada a fazer.
6. **O segmento da barra é listrado no tom vinho.** É gente que recebeu proposta (família vinho), mas não recusou nem está em andamento. O listrado diferencia do "em andamento" liso. A legenda e a frase para o leitor de tela dizem tudo em texto.
7. **A ação recusada usa o aviso da página e recarrega**, como o pedir da F3.181. A janela da resposta fecha antes (M2), porque o aviso dentro da janela ficaria sobre uma página velha.
8. **Editar pelo link e salvar recusado trocam o formulário pelo aviso.** Ficar no formulário não serve: salvar de novo seria recusado de novo. "Voltar para a proposta" leva à ficha, que já mostra "Não segue".
9. **O rodapé do Início segue o texto que o produto mostra hoje** (Inicio.tsx: "N propostas esperando resposta; a mais antiga: …"), e não o texto do desenho aprovado em 19/11. O desenho mostra o que a pessoa vai ver.
10. **Atendimentos e Início usam a data dos desenhos aprovados (18/11).** Só o rodapé e a lista mudam. Redesenhar a data mexeria no resto da tela, que não muda.

## Alternativas

- **Selo "Encerrada a pedido" também no cabeçalho da ficha**, no lugar do estado gravado ou ao lado dele. Não foi feito: mudaria a ficha aceita já aprovada na F3.181, e o fato iria só para o histórico.
- **P2 (B)**, a encerrada no filtro "Recusadas": não foi desenhada. Ela é a `pl-encerradas` dentro de outro filtro, com o selo novo no meio das recusadas.
- **P3 (B)**, o arquivado fora do período, e **P3 (C)**, contado como "em andamento": não foram desenhadas. Na (C), a barra é a de `fu-hoje`.
- **Histórico sem a linha**: é o histórico de `pr-encerrada-enviada-excluido`.

## Uma observação para a Carol (não muda este desenho)

No Funil, o cliente que fechou um contrato e tem outra proposta aberta já conta duas vezes, em "contrato" e em "em andamento", desde antes. Por isso "Receberam proposta" pode não ser a soma das linhas. A linha nova não piora isso: o arquivado com contrato conta só como contrato. A correção da conta antiga fica num item pendente do painel (AP-03), separado desta entrega (M1 da revisão).

## Como abrir e como refazer

- `index.html` mostra os 16 estados em computador (1440) e celular (412), com legenda. Clique numa imagem para abrir o HTML naquele estado.
- `comercial.html`, `funil.html` e `inicio.html` abrem sozinhos por `?estado=…`. Abaixo de 760 px viram a versão de celular. As páginas trazem também os estados aprovados de onde vieram (por exemplo, `comercial.html?estado=proposta-aceita-excluido`, a ficha da F3.181, sem mudança).
- `_fonte/` (as cópias aprovadas não mudam; a única mudança é que os caminhos vêm de `T3JUS_APROV` e `T3JUS_LOGO`, como o `comum.py` da F3.181 já fazia):
  - `comercial/` são as cópias de `portal-exclusao-contratos-conversas/_fonte/contratos`, com o `f181_contratos.py`, mais o `nomes_181.py` e o `pendencias.py` de lá. O `f204_comercial.py` importa o `f181_contratos.py`, acrescenta os estados `pl-`, `pr-` e `ed-` e grava `comercial.html`. Ele confere com `assert` que a ficha encerrada não tem "Registrar resposta", "Editar", "Marcar como enviada" nem "Sem redigitar". O `elenco_204.py` troca o primeiro nome da dona e de Felipe que o `nomes_181.py` deixa passar nas telas de Funil e Início.
  - `funil/` são as cópias de `portal-comercial-financeiro-pendencias/_fonte` (Funil em três números e uma barra). O `f204_funil.py` monta a barra com a linha nova a partir da `funil_barra` aprovada e grava `funil.html`.
  - `inicio/` são as cópias de `portal-inicio-audiencias/_fonte`. O `f204_inicio.py` executa o `inicio_audiencias.py` até a montagem da página, acrescenta `in-hoje` e `in-depois` e grava `inicio.html`.
  - `casos_204.py` gera a lista (`casos_204.json`) e o `index.html`. `fotos_204.cjs` é o `fotos_181.cjs` aprovado lendo `casos_204.json`, com uma exceção a mais nos alvos: o nome no cartão do Funil tem 24 px, dentro do AA (2.5.8), como no Funil aprovado. `webp.py` é o do Início aprovado, que reduz uma captura mais alta que o limite do WebP.
  - `sh _fonte/gerar.sh .` refaz tudo. O axe vem de `AXE_PLAYWRIGHT`.
- As capturas `in-hoje-celular` e `in-depois-celular` passam do limite do WebP (16.383 px) e foram reduzidas para 801 × 16.383, como no Início aprovado.
- **Conferência** (`_conferencia.json`): 32 capturas com deviceScaleFactor 2. Nenhuma violação do axe (WCAG 2.0, 2.1 e 2.2, A e AA), nenhuma rolagem lateral, nenhum alvo menor que 44 px (fora a exceção do cartão do Funil, já aprovada) e nenhum erro de script.

## Perguntas para a Carol

1. **O que acontece com a proposta de um cliente que pediu para ter os dados excluídos ou arquivados?** **Recomendado: (A).** Ela para de aparecer como trabalho a fazer, mas fica guardada como registro, com o que aconteceu de verdade ("Aceita em 12/11") e o selo "Encerrada a pedido". Ninguém consegue mais responder, editar ou marcar como enviada. Vale na hora também para os casos antigos. As outras: (B) trocar a situação para "Encerrada" no momento da exclusão, o que muda a exclusão e pede um conserto sem volta para os antigos; (C) deixar como está: ela fica para sempre em "Em andamento" e no Funil, com botões que dão erro.
2. **Na lista de Propostas, onde ficam essas propostas?** **Recomendado: (A) num filtro próprio, "Encerradas a pedido", que só aparece quando há alguma.** As outras: (B) junto das "Recusadas", o que mistura quem recusou com quem pediu para sair; (C) em nenhum filtro, mas aí ninguém acha mais essas propostas, porque a ficha do cliente arquivado ou excluído não mostra a aba Propostas.
3. **No Funil, como conta quem recebeu proposta, não fechou e depois pediu para sair (cliente arquivado)?** **Recomendado: (A) numa linha própria da barra, "encerrada a pedido do titular", que só aparece quando há alguma.** Quem fechou contrato continua contando como contrato. As outras: (B) sair do Funil, como o excluído já sai, o que muda os números dos meses passados e a Origem dos contatos; (C) continuar como "em andamento" para sempre.
4. **O histórico da proposta ganha a linha "Encerrada a pedido do titular", com a data em que o cliente saiu?** Compare `pr-historico-encerrada` com `pr-encerrada-enviada-excluido`. **Recomendado: sim.** Quem abre a proposta vê no histórico quando ela parou, sem procurar na ficha do cliente.
5. **Você aprova os textos novos?** São o "Não segue" da ficha, os avisos de quando alguém tenta responder, enviar ou editar depois da saída, o filtro, o selo e o pé da lista, e a linha da barra do Funil. **Recomendado: sim.**
