# Portal: Comercial, período "30 dias / 90 dias / 12 meses" e tabela da Origem · notas

> **Aprovado pela Carol em 22/11/2026, às 19h44 (Bahia),** com a pílula única, sem mudar nada. As outras perguntas seguem a recomendação: cartões na folha estreita da Origem; a correção ampla das outras `.hn-tab` fica para outra entrega (F3.124 no painel).

As comparações (antes à esquerda, depois à direita) estão em `comparacao-*.webp`. O HTML e as capturas avulsas não vêm para o repositório: `sh _fonte/gerar.sh <pasta>` refaz tudo (a pasta precisa ter `_fonte/` dentro).

O pedido da Carol: "melhore a disposição dessa parte de 30 dias / 90 dias / 12 meses". A tela é **Comercial › Origem dos contatos**, folha "De onde vêm os clientes". O mesmo seletor (`Periodo`, em `Comercial.tsx`) está na folha "Quanto vira contrato", do **Funil**. A proposta vale para as duas e foi conferida nas duas. No mesmo print, a última coluna da tabela aparece cortada ("CONTRATADO ("). A correção vem junto.

## Como abrir

- `origem-periodo.html` fica na pasta do projeto `t3jus/telas/portal-origem-periodo/`, junto com as comparações.
- `origem-periodo.html?estado=depois-origem` (também `antes-origem`, `antes-funil` e `depois-funil`). A moldura do Portal (menu de 256 px, topo, `main.conteudo`) e a página com as classes reais (`co pt co-equipe co-carteira`) dão as larguras de verdade: redimensione a janela. O HTML embute o `console.css` e o `portal.css` do sistema sem mudança e, no "depois", o acréscimo proposto (`_fonte/proposta.css`). Abaixo de 760 px vira o celular.
- Comparações: `comparacao-origem-computador-1600.webp` (a largura do print: folha de 864 px), `comparacao-origem-1440.webp`, `comparacao-origem-1024.webp` e `comparacao-origem-celular.webp`, e as mesmas quatro do Funil (`comparacao-funil-*.webp`).
- `node _fonte/varrer.cjs <pasta>` confere, em 1600, 1440, 1280, 1024, 900, 760 e 390, que nada sai da folha, que a página não rola de lado, que os três botões ficam numa linha só e que cada um tem 44 px de altura.
- Os dados são parecidos com os do print: 1 primeiro contato de 25/08 a 22/11/2026; Indicação de cliente 1 / 1 / 1, 100%, "poucos dados", R$ 2.400,00.

## Parte 1 · O seletor de período

### O problema

O cabeçalho da folha (`.co .folha-cab`) põe o texto e a caixa `.acoes` numa linha só, sem quebra, com os dois centralizados na altura. O subtítulo é longo, então fica com quase toda a largura. A caixa encolhe e os chips (`.co-carteira .chips` + `.co-equipe .chips{flex-wrap:wrap}`) quebram: "30 dias" e "90 dias" numa linha, "12 meses" sozinho embaixo. São três pílulas soltas de 44 px, com 6 px entre elas, que parecem três botões independentes, e não uma escolha entre três. Medido no HTML com o CSS atual:

| Folha | Origem (antes) | Funil (antes) |
| --- | --- | --- |
| 864 px (tela de 1600, o print) | 2 linhas | 1 linha |
| 704 px (1440, com o menu) | 2 linhas | 1 linha |
| 584 px (1280) | 3 linhas, um embaixo do outro | 1 linha |
| 328 px (1024) | 3 linhas | 2 linhas |
| 484 px (900, tablet) | 3 linhas | 1 linha |

### A decisão

**Os três viram um controle segmentado: uma pílula só, com os três períodos dentro, que nunca se parte. Quando o texto ainda tem 400 px, ela fica à direita, com o topo alinhado ao topo do título. Se não cabe, o grupo inteiro desce para baixo do subtítulo, alinhado à esquerda com o título, como no Histórico da ficha (PR 130). No celular, ocupa a largura toda, com três partes iguais.**

Por quê:

- **É uma escolha entre três, e o desenho passa a mostrar isso.** Uma pílula só lê como "um destes", não como três ações. Ela ocupa 251 px, contra 255 px das três pílulas soltas. Fica mais calma ao lado do título, sem perder o alvo de 44 px.
- **A mesma regra do Histórico** (`flex:1 1 400px` no texto e `flex-wrap` no cabeçalho), já aprovada. Não fixa layout por tamanho de tela: decide pelo espaço da própria folha. Por isso a mesma regra serve à Origem, que tem a coluna lateral de 360 px, e ao Funil, que ocupa a largura toda.
- **As cores e o estado são os dos chips aprovados.** Escolhido: fundo `--ambar-3`, filete `--ambar-2`, texto vinho em 500 (vinho sobre #F2CDB3: 7,15:1). Os outros: `--texto-2` sobre o trilho `--rebaixado` (o par do cabeçalho de tabela, já aprovado). O estado não depende só de cor: o escolhido também tem o peso 500 e o `aria-pressed="true"`.

### O que muda em cada tamanho (medido no HTML)

| Tela (folha) | Origem, depois | Funil, depois |
| --- | --- | --- |
| 1600 (864 / 1248) | à direita, na linha do título; o subtítulo em 2 linhas | à direita, na linha do título |
| 1440 com menu (704 / 1088) | numa linha, embaixo do subtítulo | à direita, na linha do título |
| 1280 (584 / 968) | numa linha, embaixo do subtítulo | à direita, na linha do título |
| 1024 (328 / 712) | numa linha, embaixo do subtítulo | numa linha, embaixo do subtítulo |
| 900, tablet (484 / 868) | numa linha, embaixo do subtítulo | à direita, na linha do título |
| 760 e celular 390 | largura toda, três partes iguais (231 e 107 px cada) | igual |

- **Alvo de toque:** cada parte tem 44 px de altura (WCAG 2.2, 2.5.8), e no mínimo 79 px de largura no computador.
- **Foco:** contorno `--foco` (#AC3F6B) de 3 px, por cima das partes vizinhas (`z-index`), arredondado como a parte.
- **Teclado e leitor de tela:** os mesmos de hoje. `role="group"`, `aria-label="Período"`, três `<button>` com `aria-pressed`, na ordem 30 dias, 90 dias, 12 meses.
- **Espaços:** 16 px entre o subtítulo e o seletor quando ele desce; 24 px entre o texto e o seletor quando ficam lado a lado.

## Parte 2 · A coluna "Contratado (valor certo)" cortada

### A causa

O Portal usa `MolduraArea` com `pagina="co-equipe co-carteira"`. A classe `co-carteira` é da lista de clientes do Console, e traz três regras de `console.css` que valem para **qualquer** tabela da página, também a `.hn-tab` da Origem:

1. `.co-carteira table{table-layout:auto}` (linha 956). Isso anula o `table-layout:fixed` da linha 548, e o `<colgroup>` de 31/11/11/11/17/19% vira só sugestão.
2. `.co-carteira thead th{white-space:nowrap}` (linha 549). Nenhum cabeçalho quebra. "CONTRATADO (VALOR CERTO)", em caixa-alta de 12 px com 0,06em, pede 229 px.
3. `.co-carteira tbody td:first-child{min-width:250px}` (linha 1031; 210 px de 1024 a 1400).

Somadas, a tabela fica com 953 px. No print, a folha tem 864 px, com `overflow:hidden` (no `style` da `<section>`). Por isso os 90 px finais somem e o cabeçalho para em "CONTRATADO (". Em 1440, com o menu, o corte é de 250 px e some a coluna inteira. Em 1024, de 526 px. Não é o `colgroup` que corta: com a tabela em `auto`, ele nem chega a valer.

### A correção

Presa à tabela da Origem (classe nova `cm-org-tab`). A lista de Clientes do Console e as outras tabelas do Portal não mudam:

- A 1ª coluna perde o mínimo de 250 px.
- O cabeçalho quebra entre palavras ("CONTRATADO / (VALOR CERTO)", "VIRAM / CONTRATO") e se alinha embaixo.
- As colunas de número têm 12 px de respiro dos lados, em vez de 16. A última mantém 24 px à direita, como a primeira tem à esquerda.

Com isso, a menor largura da tabela cai de 953 para 683 px. Na folha do print (864 px), as seis colunas cabem, com os cabeçalhos em até 2 linhas.

- **Folha com menos de 760 px no computador** (telas de 1024 a ~1500 px, por causa da coluna lateral de 360 px): a tabela vira os mesmos cartões aprovados do celular (origem e barra em cima, depois Contatos, Propostas, Contratos, Viram contrato e Contratado em pares rótulo/valor). É uma consulta de contêiner na própria folha, que só vale acima de 760 px; o celular fica como está. Por que 760: em 704 px (1440), a tabela até cabe, mas aperta. O selo "poucos dados" quebra no meio, os cabeçalhos vão a 3 linhas e "Indicação de cliente" quebra. Os cartões leem melhor.
- **Tablet (761 a 1023):** hoje as regras de tablet da `co-carteira` (`tbody tr` em grade com uma coluna de 44 px) se misturam às da `.hn-tab`. Nos cartões da proposta elas são desfeitas de forma explícita.

| Tela (folha) | Antes | Depois |
| --- | --- | --- |
| 1600 (864) | tabela de 953 px; a última coluna cortada em "CONTRATADO (" | tabela de 862 px; nada sai da folha |
| 1440 com menu (704) | corte de 250 px: some a última coluna | cartões |
| 1280 (584) | corte de 270 px | cartões |
| 1024 (328) | corte de 526 px: só cabem Origem e Contatos | cartões |
| 900 tablet (484) | grade da carteira misturada à da `.hn-tab` | cartões |
| celular 390 | cartões | os mesmos cartões |

## Varredura (`_fonte/varrer.cjs`)

No "depois", em 1600, 1440, 1280, 1024, 900, 760 e 390, nas duas telas: **nada sai da folha, a página não rola de lado, o período fica numa linha só e cada botão tem 44 px.** No "antes", a Origem tem elementos fora da folha em 1600 (90 px), 1440 (250), 1280 (270) e 1024 (526), e o período quebra em 2 ou 3 linhas. O Funil quebra em 2 linhas em 1024.

## CSS e JSX (diff proposto)

`sistema/packages/ui/src/portal/Comercial.tsx`. `Chips` aceita uma classe a mais e `Periodo` passa `cm-periodo`. Os dois cabeçalhos com período recebem `cm-cab-per`, e a tabela da Origem recebe `cm-org-tab`. Os outros usos de `Chips` não mudam.

```diff
-export function Chips({ rotulo, opcoes, atual, aoEscolher }: { rotulo: string; opcoes: { v: string; t: string }[]; atual: string; aoEscolher: (v: string) => void }) {
+export function Chips({ rotulo, opcoes, atual, aoEscolher, classe }: { rotulo: string; opcoes: { v: string; t: string }[]; atual: string; aoEscolher: (v: string) => void; classe?: string }) {
   return (
-    <div className="chips" role="group" aria-label={rotulo}>
+    <div className={classe ? `chips ${classe}` : "chips"} role="group" aria-label={rotulo}>
@@ function Periodo(
-  return <Chips rotulo="Período" atual={atual} aoEscolher={(v) => aoEscolher(v as PeriodoComercial)}
+  return <Chips rotulo="Período" classe="cm-periodo" atual={atual} aoEscolher={(v) => aoEscolher(v as PeriodoComercial)}
@@ function FunilConteudo(
       <section className="folha" aria-labelledby="t-cv">
-        <div className="folha-cab">
+        <div className="folha-cab cm-cab-per">
@@ function OrigemConteudo(
           <section className="folha" aria-labelledby="t-or" style={{ overflow: "hidden" }}>
-            <div className="folha-cab">
+            <div className="folha-cab cm-cab-per">
@@
-                <table className="hn-tab">
+                <table className="hn-tab cm-org-tab">
```

`sistema/packages/ui/src/portal.css`: no fim do bloco do Comercial (depois de `.cm-oab ul{...}`, linha ~1212). É o conteúdo de `_fonte/proposta.css`:

```diff
 .cm-oab ul{margin:6px 0 0;padding-left:18px}
+
+/* Período do Funil e da Origem ("30 dias", "90 dias", "12 meses"): um controle segmentado.
+   Os três ficam sempre juntos, numa linha. Ao lado do título quando o texto ainda tem 400 px;
+   se não, o grupo inteiro desce para baixo do subtítulo, alinhado à esquerda com o título. */
+.hn .cm-cab-per{flex-wrap:wrap;align-items:flex-start;gap:16px 24px}
+.hn .cm-cab-per>div:first-child{flex:1 1 400px;min-width:0}
+.hn .cm-cab-per>.acoes{flex:none}
+.co .chips.cm-periodo{display:inline-flex;flex-wrap:nowrap;gap:0;margin-left:0;padding:0;border:1px solid var(--borda-folha);border-radius:23px;background:var(--rebaixado)}
+.co .chips.cm-periodo button{position:relative;min-height:44px;min-width:44px;padding:0 16px;border:0;border-radius:22px;background:transparent;white-space:nowrap;justify-content:center;font-size:13px;color:var(--texto-2)}
+.co .chips.cm-periodo button:hover{color:var(--vinho)}
+.co .chips.cm-periodo button[aria-pressed="true"]{background:var(--ambar-3);box-shadow:inset 0 0 0 1px var(--ambar-2);color:var(--vinho);font-weight:500}
+.co .chips.cm-periodo button:focus-visible{z-index:1;outline:3px solid var(--foco);outline-offset:1px;border-radius:22px}
+
+/* Tabela da Origem: o Portal herda de .co-carteira (Console, lista de clientes) a tabela em
+   layout automático, a 1ª coluna com no mínimo 250 px (210 px de 1024 a 1400) e o cabeçalho
+   sem quebra. Somadas, a tabela fica mais larga que a folha e a folha (overflow:hidden) corta a
+   última coluna. Aqui: sem o mínimo da 1ª coluna, cabeçalho que quebra entre palavras e 12 px de
+   respiro nas colunas de número. */
+.co-carteira .hn-tab.cm-org-tab tbody td:first-child{min-width:0}
+.co-carteira .hn-tab.cm-org-tab thead th{white-space:normal;vertical-align:bottom;line-height:1.35}
+.co-carteira .hn-tab.cm-org-tab th:not(:first-child),.co-carteira .hn-tab.cm-org-tab td:not(:first-child){padding-left:12px;padding-right:12px}
+.co-carteira .hn-tab.cm-org-tab th:last-child,.co-carteira .hn-tab.cm-org-tab td:last-child{padding-right:24px}
+/* Folha estreita (menos de 760 px no computador: telas de 1024 a ~1500 px): as seis colunas não
+   cabem sem apertar (o selo e o cabeçalho em 3 linhas), então a tabela vira os cartões aprovados
+   do celular. O celular fica como está. */
+.hn .folha:has(>.cm-org-tab){container-type:inline-size}
+@media (min-width:761px){
+  @container (max-width:759px){
+    .co-carteira .hn-tab.cm-org-tab,.co-carteira .hn-tab.cm-org-tab tbody{display:block}
+    .co-carteira .hn-tab.cm-org-tab colgroup{display:none}
+    .co-carteira .hn-tab.cm-org-tab thead{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
+    .co-carteira .hn-tab.cm-org-tab tbody{padding:0 24px 20px;display:grid;gap:12px}
+    .co-carteira .hn-tab.cm-org-tab tbody tr{display:grid;grid-template-columns:minmax(0,1fr);gap:8px;border:1px solid var(--borda-folha);border-radius:var(--raio-g);padding:14px 16px;background:var(--papel)}
+    .co-carteira .hn-tab.cm-org-tab tbody tr:hover{background:var(--papel)}
+    .co-carteira .hn-tab.cm-org-tab tbody td{display:flex;grid-column:1/-1;grid-row:auto;justify-content:space-between;align-items:flex-start;gap:12px;padding:0!important;border:0!important;text-align:right;font-size:13px;min-width:0}
+    .co-carteira .hn-tab.cm-org-tab tbody td:first-child{display:block;text-align:left;padding-bottom:8px!important;border-bottom:1px solid var(--divisor)!important}
+    .co-carteira .hn-tab.cm-org-tab tbody td::before{content:attr(data-r);color:var(--texto-2);text-align:left;flex:none;max-width:45%;font-size:13px;letter-spacing:0;text-transform:none;margin:0}
+    .co-carteira .hn-tab.cm-org-tab tbody td:first-child::before{display:none}
+  }
+}
+@media (max-width:760px){
+  .hn .cm-cab-per>.acoes{flex:1 1 100%}
+  .co .chips.cm-periodo{display:flex;width:100%}
+  .co .chips.cm-periodo button{flex:1 1 0;padding:0 8px}
+}
```

## O que a Carol decidiu (antes eram as perguntas)

1. **O seletor:** pílula única segmentada (recomendado) ou as três pílulas soltas de hoje, só sem quebrar e com a mesma regra de descer? As soltas mantêm o desenho dos outros filtros do Portal. A única deixa claro que é um período só.
2. **Folha estreita na Origem (1024 a ~1500 px):** cartões (recomendado) ou a tabela apertada, com cabeçalho em 3 linhas e o selo "poucos dados" quebrado?
3. **Fora do escopo, para outra entrega:** a mesma herança de `co-carteira` (`table-layout:auto` e cabeçalho sem quebra) vale para as outras `.hn-tab` do Portal. Elas não cortam com os dados de hoje, mas podem cortar com nomes ou valores longos. A correção ampla é tirar `co-carteira` do padrão do `MolduraArea`, ou dar à `.hn-tab` a base própria de tabela, como já tem a `table.cb-tab`. Isso pede uma varredura das outras telas.
