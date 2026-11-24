# Tabelas do Portal: toque, leitor de tela e foco (F3.165) · plano e desenho

> **Aprovado pela Carol em 24/11/2026, às 11h48 (Brasília), na opção "Aprovar como está".** Decisão 1: no celular, o botão compacto fica com 44 px visíveis dentro das tabelas. Decisão 2: o compacto de 36 px fora das tabelas (Portal e Console) não é corrigido agora e vira item pendente no painel. Decisão 3: a área invisível no computador e o retorno de foco, aprovados. A pasta `_fonte/` (ferramentas e dados da medição) ficou fora daqui.

**Versão 2**, 24/11/2026. Depois da revisão independente (`REVISAO.md`, veredito "ajustar"), para a Carol aprovar. O item é a sobra do F3.124 (PR #165): alvos de toque de 44 px nas ações das tabelas, leitor de tela de verdade nas cópias `pt-sobe` e retorno de foco quando o botão que abriu a janela sumiu. A ideia atendida é a PT-10.

**O repositório ficou como estava.** Nada foi programado nem posto em commit, e não há migration. Testei a proposta no Portal de verdade (build de produção da `main`, e9bdbc8): o CSS foi posto na página pelo teste (`addStyleTag`) e o retorno de foco entrou como script de teste (`addInitScript`). As ferramentas e os dados estão em `_fonte/`. A versão 1 (plano, medição, regra, protótipo e dados) está em `_fonte/v1/`. A medição completa está em `MEDICAO.md`, e as fotos estão em `index.html` e `fotos/`.

## O que mudou desde a revisão

Resposta ponto a ponto aos ajustes obrigatórios (numeração do `REVISAO.md`; o pedido da coordenação juntou o 1 e o 2).

| # | Ajuste pedido | O que fiz | Evidência |
| --- | --- | --- | --- |
| 1 | Limitar o alcance da regra: só `td` e as listas que trocam a tabela; sem a Agenda, sem links com área própria, sem janelas | A regra agora é `.pt .folha :is(table td, :is(.cartoes,.cb-cartoes).so-cel) :is(a[href],button):not(.c-nome,.sem-area,dialog *)`. A `.so-cel` sozinha não entra mais, e a Agenda não é `.cartoes`. O `.c-nome` e o conteúdo de `dialog` ficam de fora, e `.sem-area` é a saída para qualquer alvo novo que já cubra o cartão. | Agenda a 390 e 320 px, nas vistas semana e mês: hoje e com a v2, o canto do cartão abre a ficha e nenhum dia abre o vizinho (0 de 36 pares). Com a v1, o canto deixava de abrir a ficha nas 4 medidas, e a 320 a borda de cada dia abria o vizinho (36 de 36). `MEDICAO.md`, "Agenda do celular". |
| 2 | Medir o que a regra alcança: a ficha do cliente (`fl-tab`), as tabelas em janelas e 320 px | Entraram as 3 tabelas `fl-tab` (Propostas, Contratos e Casos) e a largura de 320 px em todas as telas. As tabelas dentro de janelas (`rp-tab` dos Repasses e outras) saíram do alcance pelo `:not(dialog *)`, então ficam como hoje. | Agora são 950 alvos medidos (eram 740). Hoje, 441 ficam abaixo de 44 px; com a v2, nenhum, em nenhuma largura. Na ficha do cliente a 1280 e 1440, o número da proposta ou do contrato tem 39 px hoje e 45 com a v2. |
| 3 | O foco precisa voltar também quando a janela some sem o evento `close` (Cancelar, X) | No `Janela`, a pista é guardada quando `aberta` vira verdadeiro, e a vigia começa na limpeza do `useEffect`. Isso vale para `aberta` falso e para a desmontagem, com ou sem `close`. No protótipo, o equivalente é vigiar a saída do `dialog` da página. | A pagar ("Paga" seguido de Cancelar, X ou Esc) e A receber ("Registrar" seguido de Cancelar, a 1280 e a 390). Hoje o foco se perde em 4 desses 5 casos; com o protótipo v2, volta ao botão nos 5. `_fonte/foco-antes.jsonl` e `foco-depois.jsonl`. |
| 4 | Rede lenta: não decidir só depois de dois quadros | Depois de fechar, a vigia fica de olho por 3 s (mudanças na página e na largura). Ela só age quando o foco está perdido (no `body`, num elemento escondido ou fora da página) e nenhuma janela está aberta. Quando a lista volta do servidor e tira a linha, a ordem de 1 a 5 roda de novo. | Equipe com o GET atrasado em 600 ms: hoje o foco se perde; com o protótipo v2, vai para "Gustavo Lima, abrir a ficha", a linha que ficou no lugar. Rodei 5 vezes cada caso: 55 de 55 certos. |
| 5 | Duas janelas seguidas; o `voltarFoco` de `Financeiro.tsx`; o título `.sr` da Equipe | Se outra janela está aberta, a vigia não mexe no foco. Uma janela aberta de dentro de outra (ou com o foco perdido) herda a pista da primeira. O `voltarFoco` local de `Financeiro.tsx` (linhas 1035, 1218, 1230, 1234 e 1237) e o estado `abriu` saem, porque o comum faz o mesmo. No passo 5, se o `h2` da folha é `.sr` ou invisível, o foco vai ao `h1`. | Duas janelas, em que a 1 abre a 2 e some, e depois Esc na 2: hoje o foco se perde; com a v2, vai ao "Paga" que abriu a 1. Equipe com a tabela vazia: hoje o foco se perde; com a v2, vai ao `h1` "Equipe". |
| 6 | Nome nas duas tabelas da Equipe | A tabela de pessoas ganha `aria-labelledby` no `h2` "Pessoas da equipe" (`Equipe.tsx` 847). A `equipe-retiradas` (`Equipe.tsx` 470) ganha "Pessoas retiradas", igual às listas do celular (`Equipe.tsx` 914 e 519). | Hoje as duas têm nome vazio (árvore do Chromium por CDP, na revisão). |
| 7 | Roteiro de VoiceOver da Carol | Refeito (seção b): atalho para ligar e desligar, endereço com dados de exemplo, sem o rotor "Linhas", passo 5 com o iPhone deitado, passos 3 e 5 só depois de programados, e "se não ouvir isso, anote o que ouviu" em cada passo. | Seção (b). |
| 8 | Painel: o compacto de 36 px no celular fora das tabelas; o que fazer se o VoiceOver achar falha | Um item pendente novo, citando PT-10, e a regra do que acontece se o VoiceOver falhar. | Seção "Painel". |

Recomendados:

- **9. Área dos links.** Feito. Os links crescem para cima e só 4 px para baixo, e os botões continuam com a área centrada. O e-mail da Equipe e o número CNJ ficam livres para selecionar (foto `equipe__1280__depois-toque.jpg`).
- **10. Links `display:inline`.** Entra uma linha na regra do `README.md`: alvo de célula não é `display:inline`. Hoje nenhum é; os que quebram linha são `inline-block` ou `flex`.
- **11. Celular, padding e fonte.** Recomendo mudar só a altura. O compacto continua com 12 px de padding e 13 px de fonte, que é a menor mudança à vista. Trazer os 16 px e a fonte de corpo que a linha 285 do `console.css` pedia fica para a Carol decidir (veja "Para a Carol decidir").
- **12. Nome da árvore.** O `ariaSnapshot` passa a se chamar "árvore do Playwright". A árvore do Chromium, por CDP (`Accessibility.getFullAXTree`, feita pela revisão), confirma o que a seção (b) afirma.
- **13. Teste 2.** Sem classe de teste no CSS de produção: o teste confere que o `::after` tem `position:absolute` e compara a altura das tabelas com números gravados.

## Em uma frase

No computador, botões e links das tabelas ganham uma área de toque invisível de 44 × 44 px, e **a tela fica igual pixel a pixel**. No celular, o botão compacto dos cartões passa de 36 para 44 px de altura. A janela que fecha, de qualquer jeito (Esc, Cancelar, X, ação feita, resposta lenta ou outra janela por cima), devolve o foco a um lugar que existe: o botão que a abriu, o equivalente da mesma linha, a linha, a linha que ficou no lugar ou o título.

## O que a medição mostrou (detalhes em `MEDICAO.md`)

- **950 alvos** em 45 telas: as 42 gravações do F3.124 e as 3 tabelas `fl-tab` da ficha do cliente. Medi a 800, 1024, 1280, 1440, 390 e 320 px, tocando de verdade (`elementFromPoint`), e não pela caixa desenhada. A Agenda do celular foi medida à parte, porque não tem tabela.
- **441 (46%) ficam abaixo de 44 px:** de 78 a 89 por largura no computador, 53 a 390 e 52 a 320.
- **6 ficam abaixo de 24 px**, um por largura e sempre o mesmo: o nome do caso na tabela de êxito de A receber. **Nenhum falha a WCAG 2.5.8.**
- **O grosso é o `.btn-compacto`, com 36 px.** Depois vêm os links de nome (de 19 a 42 px), o `a.oe-nome` da Equipe (24 px) e o número da ficha do cliente (39 px).
- **Achado da v1, confirmado pela revisão:** no celular, o compacto deveria ter 44 px. A linha 621 do `console.css` (`min-height:36px`) desfaz a 285, que pedia 44.

## (a) Toque de 44 px

### A regra (no fim do bloco "Tabelas do Portal" do `portal.css`)

```css
/* F3.165 · Alvos de toque de 44 px nas tabelas do Portal.
   Vale só para as células de tabela da folha e para as listas que trocam a tabela no celular
   (.cartoes.so-cel e .cb-cartoes.so-cel). Fica de fora: o que está dentro de janela (dialog), o link que já
   cobre o cartão inteiro (.c-nome) e qualquer alvo marcado com .sem-area.
   Computador: o desenho fica igual. Botões ganham uma área de toque invisível de pelo menos 44 x 44 px,
   centrada neles; links ganham a mesma área crescendo para cima (só 4 px para baixo), para não cobrir o
   texto que se copia logo abaixo (número do processo, e-mail). A linha não cresce.
   Celular: o botão compacto dessas tabelas e listas passa a ter 44 px de altura visível. */
.pt .folha :is(table td,:is(.cartoes,.cb-cartoes).so-cel) :is(a[href],button):not(.c-nome,.sem-area,dialog *){position:relative}
.pt .folha :is(table td,:is(.cartoes,.cb-cartoes).so-cel) :is(a[href],button):not(.c-nome,.sem-area,dialog *)::after{content:"";position:absolute;left:50%;top:50%;width:max(100%,44px);height:max(100%,44px);transform:translate(-50%,-50%)}
.pt .folha :is(table td,:is(.cartoes,.cb-cartoes).so-cel) a[href]:not(.btn,.c-nome,.sem-area,dialog *)::after{top:auto;bottom:-4px;height:max(calc(100% + 4px),44px);transform:translateX(-50%)}
@media (max-width:760px){
  .pt .folha :is(table td,:is(.cartoes,.cb-cartoes).so-cel) .btn-compacto:not(dialog *){min-height:44px}
}
```

- O `::after` é uma camada transparente presa ao alvo. Ela tem **no mínimo 44 × 44 px e nunca menos que o próprio alvo**. Por estar fora do fluxo, não muda a linha, a coluna nem o mínimo da tabela. Tocar nela é tocar no alvo. O foco, o hover e o leitor de tela não mudam.
- **Alcance:** células de tabela da folha (inclusive no modo cartões) e as listas `.cartoes.so-cel` e `.cb-cartoes.so-cel`. **Fora do alcance:** a Agenda (`.so-cel` sem `.cartoes`), as tabelas e listas dentro de `dialog`, o `.c-nome` (o cartão inteiro já é o alvo) e o que tiver `.sem-area`.
- Saem as duas regras soltas que faziam isso com menos alcance: `.cl-tab .esc a::after` (linha 226) e `.fl-tab .fl-num a::after` (linha 5298), que davam de 36 a 39 px.

### O que muda na tela

- **Computador (800 a 1440): nada.** As 18 fotos de antes e depois (9 telas, a 1024 e a 1280) são idênticas byte a byte, também na v2. Nenhuma tabela, linha ou alvo mudou de tamanho nas 45 telas medidas. As fotos anotadas desenham a área: tracejado vinho abaixo de 44 px, contorno âmbar a partir de 44.
- **Celular (390 e 320): o botão compacto cresce 8 px de altura** nos cartões. São 11 tabelas mais altas, de 8 a 48 px no total, sem mudar largura, texto, cor nem ordem. A Agenda não muda.

### Faixas do F3.124 e altura das linhas

**Nenhum mínimo muda, e nenhuma coluna passa a sair em outra largura.** O `tests/e2e/portal-tabelas.spec.ts` inteiro, com a regra v2 aplicada, passou nos 50 testes. No computador, a linha não cresce.

### Alternativa descartada: compacto de 44 px visível também no computador

As linhas cresceriam em 8 tabelas (Repasses +32 px, Modelos +54, ficha do contrato +16), e os botões passariam a pesar mais que o nome (`_fonte/proposta-b.css` e `_fonte/medidas-b.jsonl`).

### Pontos que continuam para a revisão

- **Os links passam a ter `position:relative`.** Eles passam a ser pintados acima dos irmãos sem posição, e foi isso que corrigiu o `a.pe-nome` das Petições. As fotos idênticas mostram que nenhum link cobriu nada à vista.
- **Alvos encostados** (Word e PDF a 0 px, Mudar áreas e Retirar a 5 px) só crescem na vertical, porque já passam de 44 px de largura. Medido: depois do ajuste, todo alvo tem 44 px ou mais pelo centro, sem perder área para o vizinho.

## (b) Leitor de tela nas cópias `pt-sobe` e nos cartões

### O que deu para conferir aqui

Conferi a árvore do Playwright (`ariaSnapshot`) da primeira linha de 8 telas, a 1024, a 1280 e no celular, e rodei o axe com as regras dos testes, hoje e com a regra v2. As saídas estão em `_fonte/arvore-antes.txt` e `_fonte/arvore-depois.txt`. A revisão conferiu os mesmos pontos na árvore do Chromium, por CDP (`Accessibility.getFullAXTree`).

| O que | Resultado |
| --- | --- |
| Cópia que sobe a 1024 (A pagar) | A célula Conta diz "… **Origem:** Adiantada pelo escritório … **Nota ou guia:** Falta a nota fiscal", com um só botão "Anexar a nota, guia ou boleto de …". A coluna escondida não aparece. |
| A mesma linha a 1280 | Cada coisa na sua coluna, uma vez só. |
| Casos a 1024 | "Cliente: Joana Pereira" dentro da célula do caso. |
| Cartões (no computador e no celular) | A tabela continua tabela (`table`, `row`, `cell`) com `display:block`, e o rótulo do `::before` entra na célula ("Categoria Custas adiantadas"). |
| Equipe | A tabela de pessoas e a de retiradas **não têm nome**. Corrigido no plano (ajuste 6). |
| axe (WCAG 2.2 AA), hoje e com a v2 | Nenhuma violação nos 18 pontos. |

### O que só dá num aparelho de verdade

O Chromium não diz como o **VoiceOver do iPhone** e o **NVDA no Windows** leem estas telas. Três coisas dependem deles:
1. a tabela com `display:block` (os cartões), que o WebKit já tratou como texto corrido;
2. o rótulo do cartão vindo de `::before`;
3. a navegação por célula no NVDA com colunas escondidas.

### Roteiro para a Carol, no iPhone (cerca de 10 minutos)

**Quando:** depois da programação, na versão publicada. Os passos 3 e 5 conferem o retorno de foco e o nome da tabela da Equipe, que ainda não existem hoje.

**Antes de começar:**
- Em Ajustes › Acessibilidade › Atalho de Acessibilidade, marque **VoiceOver**. Assim, três cliques no botão lateral ligam e desligam o VoiceOver a qualquer momento. Se ficar perdida, três cliques e pronto.
- Abra **app.t3jus.pro** no Safari e entre no **escritório de demonstração** (dados de exemplo). Os nomes de lá não são os das fotos. Para o passo 1, é preciso uma conta a pagar sem nota fiscal. Se não houver, crie uma em A pagar › Nova conta, sem anexar nota.
- Com o VoiceOver ligado: deslize um dedo para a direita para ir ao próximo item e para a esquerda para voltar. Toque duas vezes em qualquer lugar para ativar o item que ele acabou de ler.

**Os passos.** Em cada um, se não ouvir o que está escrito, anote o que ouviu, mesmo que seja só "tabela" ou "botão".

1. **A pagar, com o iPhone em pé.** Deslize até a conta sem nota. Você deve ouvir, em ordem: a data, o nome da conta, "Categoria …", "Nota ou guia: Falta a nota fiscal", o botão "Anexar a nota, guia ou boleto de …", o valor e o botão "Paga". Anote se algo vier repetido ou se ouvir um rótulo sem valor.
2. **A pagar, com o iPhone deitado.** Na mesma conta, "Falta a nota fiscal" deve aparecer uma vez só, e deve haver um só "Anexar" na linha.
3. **A receber, com o iPhone em pé.** Deslize até "Registrar recebimento de …", toque duas vezes e, na janela, vá até "Cancelar" e toque duas vezes. A próxima coisa lida deve ser o mesmo "Registrar recebimento de …". Se ele ler o começo da página ("T3jus", o menu), o foco se perdeu.
4. **Casos, com o iPhone deitado.** No primeiro caso, você deve ouvir "Cliente: …" uma vez (na célula do caso ou na coluna Cliente).
5. **Equipe, com o iPhone deitado.** Chegando à tabela, deve ouvir "Pessoas da equipe, tabela" (ou "tabela, Pessoas da equipe"). Com o iPhone em pé não há tabela: é a lista "Pessoas da equipe".

Ao terminar, três cliques no botão lateral desligam o VoiceOver. Mande as anotações (pode ser foto do papel).

**NVDA:** fica pendente até alguém com Windows rodar os passos 1 a 5 no Chrome, com Ctrl + Alt + setas para andar pelas células no passo 2.

## (c) Retorno de foco quando o botão que abriu a janela sumiu

### Como está hoje (medido em `_fonte/foco.spec.ts`)

As janelas usam `<dialog>` com `showModal()` no componente `Janela` (`console/pecas.tsx`, 98 usos no Portal), e 48 delas só existem quando estão abertas. **O navegador só devolve o foco quando a janela fecha com Esc**, porque é o único caminho que gera o evento `close` com o botão ainda na tela. Nos outros, o foco cai no `body`:

| Caso | Hoje | Com o protótipo v2 |
| --- | --- | --- |
| A pagar, 1280: "Paga" e Cancelar | perdido | o mesmo "Paga" (passo 1) |
| A pagar, 1280: "Paga" e X | perdido | o mesmo "Paga" (passo 1) |
| A pagar, 1280: "Paga" e Esc | o mesmo "Paga" | o mesmo "Paga" |
| A receber, 1280: "Registrar" e Cancelar | perdido | o mesmo "Registrar" (passo 1) |
| A receber, 390: "Registrar" e Cancelar | perdido | o mesmo "Registrar" (passo 1) |
| A pagar: "Anexar" da cópia a 1024, a janela aberta enquanto a tela passa a 1280, Esc | perdido | o "Anexar" da coluna (passo 2) |
| Equipe: Retirar Felipe, a resposta chega na hora | perdido | "Gustavo Lima, abrir a ficha" (passo 4) |
| Equipe: Retirar Felipe, a lista volta 600 ms depois | perdido | "Gustavo Lima, abrir a ficha" (passo 4) |
| Equipe: Retirar Gustavo, a última linha | perdido | "Felipe Matos, abrir a ficha" (passo 4, a anterior) |
| Equipe: Retirar e Esc | o mesmo "Retirar" | o mesmo "Retirar" |
| Duas janelas: a 1 abre a 2 e some; Esc na 2 | perdido | o "Paga" que abriu a 1 (pista herdada) |
| Equipe: a tabela fica vazia (o título da folha é `.sr`) | perdido | o `h1` "Equipe" (passo 5) |

Hoje o foco fica no lugar certo em 2 de 12 casos; com o protótipo v2, em 12 de 12. Cada caso rodou 5 vezes, e os 55 resultados certos do protótipo repetiram.

### A proposta

Um módulo novo, `packages/ui/src/console/foco.ts`, com:
- **`pistaDoFoco(origem)`**: guarda o elemento, a linha (`tr`, `.cartao` ou `li`), a posição da linha, o `data-acao`, o nome acessível e a folha. Se a origem é o `body` ou está dentro de outro `dialog`, devolve a pista da janela anterior (herança).
- **`vigiarFoco(pista)`**: fica de olho por 3 s (`MutationObserver` na página e `resize`). A cada mudança, se nenhuma janela está aberta e o foco está perdido (no `body`, num elemento escondido ou fora da página), aplica a ordem. Para quando acaba o tempo ou quando outra janela abre.
- **A ordem:**
  1. o botão que abriu, se está visível;
  2. o equivalente da mesma linha (mesmo `data-acao` ou mesmo nome acessível);
  3. a linha (o primeiro link ou botão visível);
  4. a linha que ficou no lugar (a mesma posição; se era a última, a anterior);
  5. o `h2` da folha, se é visível e não é `.sr` (com `tabIndex=-1`); senão, o `h1`.

No **`Janela`**:

```tsx
useEffect(() => {
  if (!aberta) return;
  const pista = pistaDoFoco(document.activeElement);
  return () => vigiarFoco(pista); // roda em aberta=false e na desmontagem, com ou sem close
}, [aberta]);
```

Em **`Financeiro.tsx`**, saem o `voltarFoco`, o estado `abriu` e as cinco chamadas (linhas 1035, 1218, 1219, 1230, 1234 e 1237). O "Registrar" que o fechamento abre herda a pista do botão que abriu o fechamento. O foco no `.fs-folha h2[tabindex]` (decisão 12) continua sendo o passo 5.

O **`data-acao` é opcional**: sem ele, o passo 2 usa o nome acessível, que já é igual na coluna e na cópia de hoje. Os dois `<dialog>` que não usam `Janela` (o "Mais" da `Moldura` e o `Sino`) ficam como estão, porque não abrem de tabela. O Console também usa `Janela` e ganha o conserto. Onde o botão continua na tela, nada muda.

## Arquivos que mudam (quando aprovado)

| Arquivo | O quê |
| --- | --- |
| `sistema/packages/ui/src/portal.css` | O bloco F3.165 acima. Saem `.cl-tab .esc a::after` (226) e `.fl-tab .fl-num a::after` (5298). |
| `sistema/packages/ui/src/console/foco.ts` (novo) | `pistaDoFoco`, `vigiarFoco` e a ordem de 1 a 5. |
| `sistema/packages/ui/src/console/pecas.tsx` | O `Janela`, com o efeito acima. |
| `sistema/packages/ui/src/portal/Financeiro.tsx` | Saem o `voltarFoco` local e o estado `abriu`. |
| `sistema/packages/ui/src/portal/Equipe.tsx` | `aria-labelledby` nas duas tabelas ("Pessoas da equipe" e "Pessoas retiradas"). |
| `sistema/tests/e2e/portal-tabelas.spec.ts` e `portal-tabelas-telas.json` | Os testes novos (abaixo) e as gravações da ficha do cliente (3 abas). |
| `sistema/README.md` | Na regra "Tabela nova no Portal": a área de toque vem da base; o alvo de célula não é `display:inline`; o botão repetido numa cópia leva o mesmo `aria-label` ou `data-acao`; o link que cobre o cartão inteiro leva `.sem-area`. |
| `docs/painel/dados/fases/F3/F3.165.json`, o item pendente novo e um histórico novo | Veja "Painel". |

**Nada de migration nem de função publicada:** é só CSS, um componente e testes.

## Testes novos (Playwright)

1. **Alvos de 44 px:** em toda tela de `portal-tabelas-telas.json`, mais a ficha do cliente, a 800, 1024, 1280 e 1440 e no celular a 390 e 320, todo alvo das tabelas e listas tem área de 44 × 44 px ou mais, medida com `elementFromPoint` a partir do centro.
2. **Desenho igual no computador:** o `::after` tem `position:absolute`, e a altura das tabelas a 1024 e 1280 é igual aos números gravados.
3. **Agenda intacta** a 390 e 320: o canto do cartão abre a ficha, e a borda de um dia não abre o vizinho.
4. **Celular:** todo `.btn-compacto` em `td` ou nas listas tem 44 px visíveis.
5. **Foco, os 12 casos da tabela acima**, inclusive Cancelar, X, o GET atrasado em 600 ms, duas janelas e a tabela vazia.
6. **Nomes:** as duas tabelas da Equipe têm nome. Na A pagar a 1024, "Nota ou guia: Falta a nota fiscal" aparece uma vez e há um só "Anexar".

Os testes que já existem seguem sem mudança. O `portal-tabelas.spec.ts` passou 50 de 50 com a regra v2.

## Riscos

1. **A área do link sobe sobre o respiro da célula de cima** (até 24 px). Não é alvo e abre a mesma linha.
2. **Um `overflow:hidden` em volta corta a área.** Não acontece em nenhuma das 45 telas; o teste 1 pega se aparecer.
3. **Link novo que cubra o cartão inteiro** precisa de `.sem-area` (está na regra do README). O teste 3 cobre a Agenda.
4. **A vigia de 3 s** só age com o foco perdido e nenhuma janela aberta, então não tira o foco de onde a pessoa o pôs. Se a resposta do servidor passar de 3 s, o foco pode se perder depois. O teste 5 fixa os 600 ms.
5. **Duas ações da mesma linha com o mesmo nome acessível** levariam o passo 2 ao lugar errado. Hoje não há; o `data-acao` resolve.
6. **Leitor de tela de verdade** ainda não foi usado. Por isso o roteiro e o pendente do NVDA.

## Painel

- A entrega cita F3.165 e PT-10.
- **O F3.165 fecha** com (a) e (c) programados e testados e o roteiro do VoiceOver feito pela Carol sem falha.
- **Se o VoiceOver achar falha:** o F3.165 fica "pendente", com o que faltou escrito no `proximo` (o passo e o que ela ouviu). A correção vem num commit que cita F3.165, e o roteiro roda de novo.
- **Item pendente novo, citando PT-10:** "NVDA (Windows) nas tabelas com cópia pt-sobe e nos cartões: rodar o roteiro do F3.165 com Ctrl + Alt + setas". Ele só sai se o NVDA for feito antes da entrega.
- **Item pendente novo, citando PT-10:** "Botão compacto de 36 px no celular fora das tabelas do Portal e no Console: o `console.css` 621 desfaz o 285 (`min-height:var(--alvo)` abaixo de 760 px)". O F3.165 corrige só dentro das tabelas. A raiz pode ser corrigida no mesmo commit se a Carol quiser (decisão 2 abaixo).

## Para a Carol decidir

1. **Celular, dentro das tabelas:** o compacto com 44 px visíveis, só a altura, com o mesmo padding e a mesma fonte (recomendado; está nas fotos), ou só com a área invisível, como no computador.
2. **Fora das tabelas e no Console:** corrigir a raiz agora (tirar o `min-height:36px` da linha 621 no celular, que traz o padding de 16 px e a fonte de corpo da linha 285 a todo compacto do Portal e do Console) ou deixar como item pendente (recomendado: muda telas que este item não fotografou).
3. **Aprovar** a área invisível no computador e o retorno de foco.

## Arquivos desta pasta

- `index.html`: o resumo e as fotos lado a lado (versão 2).
- `MEDICAO.md` e `alvos.csv`: a medição v2, com todos os alvos.
- `PLANO.md` (este arquivo) e `REVISAO.md` (a revisão independente).
- `fotos/`: `<tela>__<largura>__tela.jpg` (igual antes e depois no computador), `__antes-toque.jpg` e `__depois-toque.jpg` (com a área desenhada) e, no celular, `__antes.jpg` e `__depois.jpg`. São 9 telas, todas com `deviceScaleFactor` 2 e refeitas com a regra v2.
- `_fonte/`:
  - a regra e o protótipo: `proposta.css` (v2), `proposta-b.css` e `prototipo-foco.js` (v2);
  - os testes e o código comum: `comum.ts`, `medir.spec.ts`, `extras.spec.ts` (ficha do cliente e Agenda), `ficha-dados.ts`, `foco.spec.ts`, `arvore.spec.ts`, `foto.spec.ts`, `tabelas.spec.ts` e `pw.config.ts`;
  - os geradores: `gerar_medicao.py` e `gerar_index.py`;
  - os dados (`*.jsonl`, `arvore-*.txt`);
  - `v1/`: tudo da versão 1.
