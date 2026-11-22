# Portal: ficha do cliente, botões do Histórico e tabelas das abas · notas

> **Aprovado pela Carol em 22/11/2026, às 18h59 (Bahia).** Ela respondeu "APROVADO" sem mudar nada. As perguntas seguem a recomendação: os botões descem só quando não cabem ao lado do título; cartões em folha estreita no computador; o botão "Registrar assinatura" na coluna Caso fica como está nesta entrega.

As comparações (antes à esquerda, depois à direita) estão em `comparacao*.webp`. Os HTML e as capturas avulsas não vêm para o repositório: `sh _fonte/gerar.sh <pasta>` refaz tudo.

Dois ajustes pequenos na ficha do cliente, pedidos pela Carol, para ela aprovar antes do código. Os dois mudam só CSS, mais três trechos pequenos de JSX. Nenhuma outra tela muda.

- **Parte 1, aba Atendimentos:** "melhorar a disposição dos botões" do cabeçalho da folha "Histórico de atendimento".
- **Parte 2, abas Propostas e Contratos:** as tabelas saem sem o estilo aprovado.

## Como abrir

- `index.html` e os dois HTML (`historico-botoes.html`, `abas-tabelas.html`) ficam na pasta do projeto `t3jus/telas/portal-historico-botoes/`; aqui, `sh _fonte/gerar.sh <pasta>` refaz tudo.
- `historico-botoes.html?estado=depois-dois` (também `antes-` e `-um`, `-longo`) e `abas-tabelas.html?estado=depois-contratos&w=1088` (também `-propostas`, `-elaboracao`; `w` é a largura da folha). Os dois embutem o `console.css` e o `portal.css` do sistema sem mudança e, no "depois", o acréscimo proposto (`_fonte/proposta.css` e `_fonte/proposta-tabelas.css`). Abaixo de 760 px viram o celular.
- `comparacao.webp` e `comparacao-celular.webp` (Parte 1), `comparacao-tabelas.webp`, `comparacao-tabelas-1024.webp` e `comparacao-tabelas-celular.webp` (Parte 2): antes à esquerda, depois à direita.
- `sh _fonte/gerar.sh .` refaz tudo. `_fonte/varrer.cjs` confere, em várias larguras, que nada sai da célula nem da folha.
- Os dados são os dos prints da Carol (CAROLINA SOARES SANTANA, P-2026-001, C-2026-001).

## Parte 1 · Histórico de atendimento: botões do cabeçalho

### O problema

O cabeçalho da folha (`.folha-cab`) põe o texto e os botões numa linha só, sem quebra. Como o subtítulo é longo, ele fica com quase toda a largura, a caixa dos botões encolhe e os botões se empilham à direita, com larguras diferentes (150 e 225 px), presos à esquerda da caixa, e centralizados na altura do bloco de texto, não do título. No celular, com um botão só, ele não ocupa a largura toda (225 de 324 px), ao contrário dos outros botões do celular.

### A decisão

**Os botões ficam sempre juntos, numa linha, na ordem do código (o passo, primário, primeiro; "Registrar atendimento" depois). O texto pede pelo menos 400 px; se o texto e os botões não cabem lado a lado, o grupo inteiro desce para baixo do subtítulo, alinhado à esquerda com o título.** Quando cabem, o grupo fica à direita, com o topo alinhado ao topo do título.

Por quê: é a menor mudança que resolve os três defeitos (empilhado, larguras desiguais, desalinhado) sem fixar um layout por tamanho de tela. O grupo nunca se parte em dois, e a ordem de leitura e de foco (passo, depois registrar) é a mesma que se vê. Embaixo do texto, alinhado à esquerda, o primário fica onde o olho começa a linha, como nas outras folhas do Portal com ação logo abaixo do título.

### O que muda em cada tamanho (medido no HTML)

| Folha | Dois botões ("Abrir o caso", "Registrar atendimento") | Rótulo mais longo ("Registrar assinatura") | Um botão só ("Registrar atendimento", primário) |
| --- | --- | --- | --- |
| 1016 px (tela de 1600) | à direita, na linha do título | à direita, na linha do título | à direita, na linha do título |
| 840 px (o print) | numa linha, embaixo do subtítulo | numa linha, embaixo do subtítulo | à direita, na linha do título; o subtítulo em 2 linhas |
| 704 px (1440 com o menu) | numa linha, embaixo do subtítulo | numa linha, embaixo do subtítulo | à direita, na linha do título |
| celular 390 | um embaixo do outro, os dois com a largura toda (324 px), o passo em cima | igual | a largura toda (antes: 225 px) |

- Mesma altura: os dois são `.btn` de 44 px, numa linha com `align-items:center`. Os alvos de toque seguem 44 × 44 px (WCAG 2.2, 2.5.8), com 8 px entre eles.
- Espaços: 16 px entre o subtítulo e os botões quando descem; 24 px entre o texto e os botões quando ficam lado a lado.
- O rótulo mais longo de `BOTAO_PASSO` é "Registrar assinatura" (209 px). Cabe em todas as larguras acima sem quebrar.
- Cores, contraste e foco não mudam: são os botões aprovados.

### CSS e JSX (diff proposto)

`sistema/packages/ui/src/portal/FichaCliente.tsx`: `Folha` aceita uma classe; o `Historico` passa `cl-hist`. As outras folhas não mudam.

```diff
-function Folha({ titulo, sub, acoes, pequena, children, estilo }: { titulo: string; sub?: string; acoes?: ReactNode; pequena?: boolean; children: ReactNode; estilo?: React.CSSProperties }) {
+function Folha({ titulo, sub, acoes, pequena, children, estilo, classe }: { titulo: string; sub?: string; acoes?: ReactNode; pequena?: boolean; children: ReactNode; estilo?: React.CSSProperties; classe?: string }) {
   const id = useId();
   return (
-    <section className="folha" aria-labelledby={id} style={estilo}>
+    <section className={classe ? `folha ${classe}` : "folha"} aria-labelledby={id} style={estilo}>
@@ function Historico(
-    <Folha titulo="Histórico de atendimento" estilo={{ overflow: "hidden" }}
+    <Folha titulo="Histórico de atendimento" classe="cl-hist" estilo={{ overflow: "hidden" }}
```

`sistema/packages/ui/src/portal.css`: depois de `.cl-passo-cel .fl-passo-l .btn{...}` (linha ~5256) e dentro do `@media (max-width:760px)` que já existe logo abaixo.

```diff
 .cl-passo-cel .fl-passo-l .btn{width:100%;justify-content:center}
+
+/* Histórico de atendimento: os botões ficam juntos, numa linha e com a mesma altura. Ao lado
+   do título quando o texto ainda tem 400 px; se não, o grupo inteiro desce para baixo do texto. */
+.cl .cl-hist>.folha-cab{flex-wrap:wrap;align-items:flex-start;gap:16px 24px}
+.cl .cl-hist>.folha-cab>div:first-child{flex:1 1 400px;min-width:0}
 
 
 @media (max-width:760px){
@@
   .cl .folha-cab .acoes .btn{flex:1 1 100%}
+  .cl .cl-hist>.folha-cab>.acoes{flex:1 1 100%}
 }
```

## Parte 2 · Abas Propostas e Contratos: tabelas

### O problema

As tabelas das abas (`<table class="so-pc cl-tab fl-tab">`, em `FichaLigada.tsx`) não têm a base de tabela. No sistema, essas regras (`table-layout:fixed`, cabeçalho em caixa-alta de 12 px sobre `--rebaixado`, à esquerda, `padding` de 12/16 e 15/16, primeira coluna com 24 px) só existem como `.co-carteira table ...` (`console.css`, linhas 548 a 553). A ficha usa `pagina="co-ficha"`, sem `co-carteira`. No desenho aprovado (`portal-ficha-cliente-ligada`) as mesmas regras valiam para qualquer `table`, por isso lá a tabela saiu certa. Resultado no sistema: o estilo padrão do navegador. Cabeçalhos em negrito e centralizados, sem fundo; células sem `padding` ("P-2026-001" encostado na borda); "Criada em 21/11 por Carol" encostado em "Em 21/11".

Mais duas coisas:

- **"veio da P-2026-001" quebra no hífen** ("P-" numa linha, "2026-001" na outra). O desenho aprovado tinha o mesmo defeito ("P-/2026-014").
- **A coluna Recebimentos "saindo da folha".** Medi no HTML com o CSS atual, em folhas de 712 a 1300 px, e a tabela nunca passa da folha (1086 de 1088 px, por exemplo). No print, a folha continua além da borda da imagem: o botão "Gerar proposta" da aba Propostas e o lado direito do cabeçalho do cliente também ficam de fora. Então é o recorte do print. O que existe de verdade é outra coisa: em folhas estreitas (computador de 1024, folha de 712 px), as cinco colunas não cabem, e o botão da coluna Caso precisaria quebrar em três linhas.

### A decisão

1. **A ficha ganha a mesma base da lista, presa a `table.fl-tab`** (não mexe em `.co-carteira`, nem na lista de Clientes, nem nas outras telas). É o mesmo modelo de `table.cb-tab`, que já existe em `console.css`. Com isso, as abas ficam iguais ao aprovado: cabeçalho em caixa-alta de 12 px, à esquerda, sobre o fundo rebaixado, com filetes; 24 px à esquerda; 15/16 px nas células; o filete âmbar da linha viva com o texto afastado dele. Vale também para a aba Casos, que usa a mesma classe e tinha o mesmo defeito.
2. **O código não quebra no meio:** o número da proposta vai num `<span class="fl-cod">` com `white-space:nowrap`, na tabela e no cartão. Se não cabe, a quebra cai antes de "da" ou de "P-2026-001", nunca dentro dele.
3. **Nada sai da célula:** o link do recebimento e o botão da coluna Caso podem quebrar linha. Hoje os dois são `nowrap`. Numa folha de 968 a 1088 px, "Registrar assinatura" fica em duas linhas dentro do botão, com alvo de 44 px ou mais.
4. **Folha com menos de 880 px no computador (1024 a ~1190 px de tela): aparecem os cartões no lugar da tabela.** São os mesmos cartões aprovados do celular, em grade de colunas de 300 px ou mais. É uma consulta de contêiner na própria folha, que só vale acima de 760 px; o celular fica como está.

As larguras das colunas (`<colgroup>`) ficam as do código. Com `table-layout:fixed`, elas somam a largura da folha.

### O que muda em cada tamanho

| Folha | Antes | Depois |
| --- | --- | --- |
| 1088 px (1440) | estilo do navegador, sem `padding`, cabeçalho centralizado | tabela aprovada; nada sai da célula (conferido) |
| 968 px (1280) | igual | tabela aprovada; "Registrar assinatura" em 2 linhas na coluna Caso |
| 712 px (1024) | colunas apertadas, código quebrado em 3 linhas | cartões, como no celular |
| celular 390 | cartões (a tabela é `so-pc`) | os mesmos cartões; só o código da proposta deixa de quebrar |

No celular está certo mostrar os cartões. Eles trazem número, assunto e origem, honorários, caso, o selo da situação e o botão do passo (largura toda, primário). Não trazem o próximo recebimento: isso é do desenho aprovado do cartão e não muda aqui.

Contraste: o cabeçalho usa `--texto-2` sobre `--rebaixado`, o mesmo par da lista de Clientes, já aprovado. Os cabeçalhos seguem `<th scope="col">`, e a tabela segue com `<caption>`.

### CSS e JSX (diff proposto)

`sistema/packages/ui/src/portal.css`: depois de `.fl-tab tr.fl-off .fl-num a{...}` (linha ~5201).

```diff
 .fl-tab tr.fl-off .fl-num a{color:var(--vinho-2)}
+/* Tabelas das abas da ficha do cliente (Propostas, Contratos, Casos): a base que a lista de
+   Clientes recebe de .co-carteira e que a ficha não tem. Mesmas regras, presas a .fl-tab. */
+.co table.fl-tab{width:100%;border-collapse:collapse;table-layout:fixed}
+.co table.fl-tab thead th{white-space:nowrap;font-size:12px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;color:var(--texto-2);text-align:left;padding:12px 16px;background:var(--rebaixado);border-top:1px solid var(--divisor);border-bottom:1px solid var(--divisor)}
+.co table.fl-tab th:first-child,.co table.fl-tab td:first-child{padding-left:24px}
+.co table.fl-tab tbody td{padding:15px 16px;border-bottom:1px solid var(--divisor);vertical-align:middle}
+.co table.fl-tab tbody tr:last-child td{border-bottom:0}
+.co table.fl-tab tbody tr:hover td{background:#FCF8F5}
+/* Nada sai da célula: o link do recebimento e o botão da coluna Caso podem quebrar linha. */
+.co table.fl-tab .fl-ir{white-space:normal}
+.co table.fl-tab td .btn{white-space:normal;text-align:left;padding:6px 14px}
+/* O número da proposta não quebra no meio ("veio da P-2026-001"). */
+.fl-cod{white-space:nowrap}
+/* Folha estreita (menos de 880 px: computador de 1024 a ~1190 px e tablet): as cinco colunas não
+   cabem, então aparecem os cartões do celular no lugar da tabela. O celular fica como está. */
+.co .folha:has(>table.fl-tab){container-type:inline-size}
+@media (min-width:761px){
+  @container (max-width:879px){
+    .co .folha table.fl-tab.so-pc{display:none!important}
+    .co .folha .fl-cards.so-cel{display:grid!important;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));padding:0 24px 20px}
+  }
+}
```

`sistema/packages/ui/src/portal/FichaLigada.tsx`: o código da proposta num `span`. Para isso, o `sub` do `Cartao` passa a aceitar `ReactNode`.

```diff
-function Cartao({ nome, href, sub, dados, selos, acao }: { nome: string; href: string; sub: string; dados: [string, ReactNode][]; selos?: ReactNode; acao?: ReactNode }) {
+function Cartao({ nome, href, sub, dados, selos, acao }: { nome: string; href: string; sub: ReactNode; dados: [string, ReactNode][]; selos?: ReactNode; acao?: ReactNode }) {
@@ function AbaContratos(
-                    <small>{c.objeto}{c.proposta ? ` · veio da ${c.proposta.numero}` : ""}</small>
+                    <small>{c.objeto}{c.proposta ? <> · veio da <span className="fl-cod">{c.proposta.numero}</span></> : null}</small>
@@
-          <Cartao key={c.id} nome={c.numero} href={ROTAS_PASSO.contrato(c.id)} sub={`${c.objeto}${c.proposta ? ` · veio da ${c.proposta.numero}` : ""}`}
+          <Cartao key={c.id} nome={c.numero} href={ROTAS_PASSO.contrato(c.id)} sub={<>{c.objeto}{c.proposta ? <> · veio da <span className="fl-cod">{c.proposta.numero}</span></> : null}</>}
```

## Para a Carol decidir

1. **Parte 1:** botões embaixo do subtítulo quando não cabem ao lado (recomendado) ou sempre embaixo, em qualquer largura? Sempre embaixo é mais previsível, mas gasta uma linha a mais nas telas grandes, onde hoje cabem à direita.
2. **Parte 2:** cartões em folha estreita (recomendado) ou a tabela apertada, com botões de duas ou três linhas?
3. **Parte 2, fora do escopo:** o contrato em elaboração mostra "Registrar assinatura" na coluna Caso (o código atual). O desenho aprovado mostrava só "Abre ao registrar a assinatura", sem botão, porque o botão já está no cartão do próximo passo, no alto da ficha. Tirar o botão da tabela deixaria a coluna mais limpa. Fica para outra entrega, se ela quiser.
