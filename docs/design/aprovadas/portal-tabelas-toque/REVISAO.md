# Revisão do plano F3.165 (tabelas do Portal: toque, leitor de tela e foco)

24/11/2026. Revisão independente (acessibilidade WCAG 2.2 e CSS), feita antes da aprovação da Carol. Li `PLANO.md`, `MEDICAO.md`, `alvos.csv`, os dados crus e os testes em `_fonte/`, o plano e a revisão do F3.124, `console.css`, `portal.css`, o `Janela` (`packages/ui/src/console/pecas.tsx`) e as telas que usam a regra. Rodei testes meus com o Playwright no Portal em `next start` (build da `main`, e9bdbc8), com a `proposta.css` e o `prototipo-foco.js` desta pasta. O repositório não foi mexido.

## Veredito: ajustar

A medição está correta, e o achado do `console.css` é real. Mas há três problemas que mudam o plano:

1. A regra de toque pega também a Agenda do celular, que ficou de fora da medição, e piora essa tela.
2. O retorno de foco proposto não cobre o caso mais comum: fechar a janela com "Cancelar" ou "X". Hoje, nesse caso, o foco já se perde, e com o protótipo continua se perdendo.
3. O retorno de foco também falha quando a lista demora a voltar do servidor.

O passo 3 do roteiro da Carol daria errado tanto hoje quanto com a proposta.

## Ponto a ponto

| # | Pergunta | Resposta | Evidência |
| --- | --- | --- | --- |
| 1 | A medição está certa e cobre todas as tabelas e listas? | **Sim, está certa. Não, não cobre tudo.** | Os números batem com os dados crus: 210 gravações (42 × 5 larguras), 740 alvos, 373 abaixo de 44 px (78 + 81 + 81 + 80 + 53). Com a proposta, o menor alvo tem 44 px, nenhum fica coberto, e as linhas no computador têm 0 diferenças. **Porém, a medição só usa o `portal-tabelas-telas.json`, e a regra vale para mais lugares.** Ficaram de fora: a Agenda (`.so-cel` em `Agenda.tsx` 441 e 533); as 3 tabelas `fl-tab` da ficha do cliente (`FichaLigada.tsx` 406, 530 e 628), justamente onde o plano tira a regra antiga `.fl-tab .fl-num a::after` (`portal.css` 5298); as tabelas dentro de janelas (`rp-tab`, `FinanceiroRepasses.tsx` 508, com botão compacto na célula); e `is-abas-t` (`ImportacaoSistemas.tsx` 494). |
| 2 | A regra `::after` de 44 × 44 é segura? | **Não.** | **(a) `.so-cel` não é só "a lista que troca a tabela".** É a classe geral de "só no celular". Medi a Agenda a 390 e a 320 px. No cartão do compromisso (`.ag-it .cx`, 266 × 79), o canto do cartão abre a ficha hoje e deixa de abrir com a proposta (de `true` para `false`). A regra nova, com peso (0,5,2), passa por cima de `.ag-it a.t::after{inset:0}` (`portal.css` 700). Além disso, o `position:relative` no link troca o bloco que contém a área: deixa de ser o `.cx` e passa a ser o link. **(b) Vizinhos:** no mês da Agenda a 320 px, os dias têm 35,7 px de largura com 2 px entre eles. Em 36 de 41 pares de dias, a borda direita de um dia abre o dia seguinte (o vizinho que vem depois no DOM fica por cima). Nas 42 gravações a afirmação do plano se sustenta: Word e PDF já passam de 44 px de largura, então só crescem na vertical. **(c)** Qualquer link que cubra o cartão inteiro e não seja `.c-nome` perde essa área (mesmo mecanismo). **(d)** `overflow`: entre a tabela e a `.folha` não achei nada que corte, em 6 telas × 3 larguras. A `.folha` da Equipe tem `overflow:hidden` inline (`Equipe.tsx` 846), mas a medição mostra 44 px ali. **(e)** As cópias com `display:none` não geram `::after`, então não há problema. Não há tooltip nem cabeçalho `sticky` em tabela. **(f)** `.co .btn` já tem `position:relative` (`console.css` 165), então a mudança de pintura vale só para os links. **(g)** Efeito colateral: a área do nome cobre o alto da linha de baixo. Fica difícil selecionar e copiar o número CNJ ou o e-mail (a Equipe passa de 24 para 44 px sobre o e-mail). |
| 3 | O achado do `console.css` 621 contra 285 é real? A correção quebra algo? | **Sim, é real. Não quebra.** | A linha 285 (`@media (max-width:760px)`, `.co .btn-compacto{min-height:var(--alvo)}`) é desfeita pela 621 (`.co .btn-compacto{min-height:36px;padding:0 12px;font-size:13px}`): mesmo peso e mais abaixo no arquivo. A intenção aprovada era 36 px só no computador ("no computador o botão compacto das tabelas tem 36 px", `docs/design/aprovadas/console-v1/NOTAS.md` linha 96). A correção do plano só vale dentro de `.pt .folha`, então não toca o Console. Ela traz o desenho de volta ao que foi aprovado. Ficam de fora: o Console e os compactos do Portal fora das tabelas continuam com 36 px no celular, e o padding e a fonte continuam os da 621. |
| 4 | O retorno de foco é correto e testável? | **Não, ainda não.** | **(a) Janela montada só quando aberta** (48 usos do tipo `{x ? <JanelaY …/> : null}`, como `JanelaPaga` e `JanelaRegistrar`). Ao clicar em "Cancelar" ou "X", o `dialog` sai do DOM ainda aberto. Não há evento `close`, e o foco vai para o `body`. Medi assim: em A pagar, "Paga" seguido de Cancelar e de X dá `body (perdido)` hoje e com o protótipo; Esc devolve o foco certo. Em A receber, "Registrar" seguido de Cancelar dá `body` a 1280 e a 390, hoje e com o protótipo. O plano diz que "o navegador devolve o foco ao elemento que a abriu", mas isso só vale para Esc. **(b) Latência:** o protótipo espera dois quadros. Com o GET da Equipe atrasado em 600 ms (rede real), ele vê o "Retirar" ainda na tela, registra "ficou", e depois a linha sai e o foco vai para o `body`. O teste do plano só passou porque a resposta simulada chega na hora. **(c) Várias janelas:** `Financeiro.tsx` 1234 fecha uma janela e abre outra. A pista da segunda vem de um elemento de dentro da primeira, ou do `body`. **(d)** Já existe um `voltarFoco` local (`Financeiro.tsx` 1035, 1218 e 1230), que mudaria o foco duas vezes. **(e)** O passo 5 foca o `h2` da folha, mas na Equipe esse `h2` é `.sr` (`Equipe.tsx` 847): o foco fica invisível. **(f)** A tabela vazia funciona: a `.folha` sai e o foco vai ao `h1`. |
| 5 | Leitor de tela: o que o plano diz é verdade? O roteiro serve? E o nome da tabela da Equipe? | **Em parte.** | Conferi a árvore real do Chromium por CDP (`Accessibility.getFullAXTree`). A tabela continua `table` com `display:block` a 390, o rótulo `::before` entra na célula ("Categoria Custas adiantadas"), a cópia a 1024 aparece uma vez só, e a tabela da Equipe tem nome vazio. As afirmações do plano são verdadeiras, mas o `ariaSnapshot` que o plano chama de "árvore do Chromium" é a árvore calculada pelo Playwright, não a do navegador. **Roteiro:** o passo 3 falha como está escrito (veja o ponto 4a). O passo 5 só mostra a tabela com o iPhone deitado; em pé, é a lista "Pessoas da equipe". A instrução do rotor "Linhas" lê linhas de texto, não linhas da tabela, e confunde quem é leigo. Faltam o atalho para desligar o VoiceOver e o endereço com dados de exemplo (o roteiro cita "Custas recursais" e "Felipe Matos", que só existem nos dados de teste). **Nome:** a tabela `equipe-retiradas` (`Equipe.tsx` 470) também não tem nome, e o plano não fala dela. |
| 6 | Os testes bastam? E o painel? | **Não, ainda não.** | O teste 1 varre só as 42 gravações e não pegaria a Agenda nem a `fl-tab`. Os testes 4 a 6 não cobrem Cancelar ou X, latência nem duas janelas seguidas. O teste 2 pede uma classe de teste dentro do CSS de produção. **Painel:** o pendente do NVDA citando PT-10 está certo pela regra do `CLAUDE.md`. Faltam o pendente do compacto de 36 px fora das tabelas (Console e Portal) e o caminho para o caso de o VoiceOver da Carol achar uma falha. |

## Ajustes

**Obrigatórios**

1. **Limitar o alcance da regra de toque.** Valer só para `.pt .folha table td` e para as listas que trocam a tabela (`.pt .folha .cartoes.so-cel`), e não para todo `.so-cel`. Ficam de fora os links que já têm `::after` próprio (por exemplo, `:not(.c-nome, .ag-it a.t)`, ou uma classe de saída como `.sem-area`) e o conteúdo de `dialog`. Remedir a Agenda a 390 e 320 px: o canto do cartão precisa abrir a ficha, e nenhum dia do mês pode abrir o vizinho.
2. **Medir o que a regra alcança.** Incluir na medição e no teste 1 a ficha do cliente (`fl-tab`, onde sai a regra antiga), as tabelas dentro de janelas, se continuarem no alcance, e uma largura de 320 px no celular.
3. **Retorno de foco que não dependa do evento `close`.** No `Janela`, guardar a pista ao abrir e devolver o foco também quando a janela fecha por desmontagem (limpeza do `useEffect`) ou quando `aberta` vira falso. Testar "Cancelar" e "X" em A pagar ("Paga") e em A receber ("Registrar"), que hoje perdem o foco.
4. **Retorno de foco com rede lenta.** Não decidir só depois de dois quadros. Uma saída é vigiar a origem por alguns segundos depois de fechar: se ela sair do DOM ou ficar escondida enquanto tem o foco, aplicar a ordem de 1 a 5. Outra é deixar a tela chamar `devolverFoco` depois do `recarregar`. Testar com o GET atrasado (600 ms).
5. **Várias janelas e foco duplicado.** Se outra janela abriu, não mexer no foco. A pista da segunda janela herda a da primeira quando a origem está dentro de um `dialog` ou é o `body`. Trocar o `voltarFoco` local de `Financeiro.tsx` (1035) pelo comum. No passo 5, se o `h2` da folha é `.sr`, usar o `h1`.
6. **Nome das duas tabelas da Equipe.** A tabela de pessoas recebe `aria-labelledby` no `h2` "Pessoas da equipe" (`Equipe.tsx` 847), e a `equipe-retiradas` recebe "Pessoas retiradas", igual às listas do celular (`Equipe.tsx` 914 e 519).
7. **Roteiro da Carol.**
   - Antes de começar: ligar em Ajustes › Acessibilidade › Atalho de Acessibilidade › VoiceOver, para desligar com três cliques no botão lateral.
   - Informar o endereço com os dados de exemplo.
   - Tirar a instrução do rotor "Linhas".
   - Fazer o passo 5 com o iPhone deitado.
   - Fazer o passo 3 só depois do ajuste 3.
   - Para cada passo, ter um "se não ouvir isso, anote o que ouviu".
8. **Painel.** Abrir um pendente citando PT-10: "botão compacto de 36 px no celular fora das tabelas do Portal e no Console (`console.css` 621 desfaz 285)", ou corrigir a raiz no mesmo commit com a Carol de acordo. Escrever no F3.165 o que acontece se o VoiceOver achar uma falha: o item fica pendente, com o que faltou.

**Recomendados**

9. **Área dos links de nome.** Usar a variante que cresce para cima, ou limitar a parte de baixo, onde há texto que se copia logo abaixo (número CNJ, e-mail na Equipe). Os botões continuam com a área centrada.
10. **Links `display:inline`.** Escrever na regra do `README.md` que o alvo de célula não pode ser `display:inline` (hoje nenhum é). Um link inline que quebra em duas linhas dá ao `::after` uma caixa errada.
11. **Celular.** Junto com o `min-height:44px`, trazer o padding de 16 px e a fonte de corpo que a linha 285 pedia. Ou dizer à Carol que ficam como estão.
12. **Texto do plano.** Chamar o `ariaSnapshot` de "árvore do Playwright". A árvore do Chromium (CDP) confirma o que o plano afirma.
13. **Teste 2.** Comparar com números fixos, ou só conferir `position:absolute` no `::after`, sem pôr classe de teste no CSS de produção.

## Como conferi

- Scripts em `/tmp/claude-0/-home-user/7fe7595c-7e93-5261-af28-cb4887976f66/scratchpad/rev/`:
  - `rev.spec.ts`: Cancelar, X e Esc; a Equipe com 600 ms de atraso; links quebrados e `overflow`.
  - `agenda.spec.ts`: a Agenda a 390 e 320 px.
  - `ar.spec.ts`: Registrar e Cancelar em A receber.
  - `ax.spec.ts`: a árvore pelo CDP.
- Resultados em `rev-*.jsonl`, `agenda.jsonl`, `ar.jsonl` e `ax.txt`, na mesma pasta.

## Segunda leitura (versão 2)

24/11/2026. Li o `PLANO.md` v2, o `MEDICAO.md` v2, os dados crus novos e o `prototipo-foco.js` v2. Rodei de novo os meus testes, agora com a `proposta.css` v2 e o protótipo v2. A v1 ficou guardada em `scratchpad/rev/v1/`.

### Veredito: pronto para a Carol

| Ajuste | Resolvido? | Evidência (medição minha, salvo onde está dito) |
| --- | --- | --- |
| 1. Alcance da regra | **Sim** | Agenda nas vistas semana e mês, a 390 e 320 px, 3 vezes cada. Com a v2, o canto do cartão abre a ficha (`true`, como hoje), e a borda de nenhum dia abre o vizinho (0, como hoje). Com a v1, o canto não abria a ficha, e a 320 px a borda abria o vizinho em 36 pares. A regra passou a valer só para `table td` e `.cartoes`/`.cb-cartoes.so-cel` e não alcança `.c-nome`, `.sem-area` nem o conteúdo de `dialog`. |
| 2. Medir o que a regra alcança | **Sim** | Os dados crus batem com o plano: 888 alvos mais 62 da ficha do cliente (`medidas-*-extras.jsonl`) dão 950. Hoje, 441 ficam abaixo de 44 px. Com a v2, o menor tem 44 px, nenhum fica coberto e há 0 diferenças de linha no computador, com 320 px incluído. As tabelas de janela ficam fora pelo `:not(dialog *)`. |
| 3. Cancelar e X | **Sim, no protótipo** | A pagar: "Paga" seguido de Cancelar, X e Esc devolve o foco ao mesmo "Paga" nos 3 casos (hoje, Cancelar e X perdem o foco). A receber: "Registrar" seguido de Cancelar devolve o foco ao mesmo "Registrar", a 1280 e a 390 (hoje, vai para o `body`). |
| 4. 600 ms | **Sim, no protótipo** | Na Equipe, com o GET atrasado em 600 ms, o foco termina em "Gustavo Lima, abrir a ficha" (hoje, vai para o `body`). O limite de 3 s está declarado como risco 4, o que é aceitável. |
| 5. Duas janelas, `voltarFoco`, `.sr` | **Sim** | O caso das duas janelas está em `_fonte/foco.spec.ts` 119. É sintético, mas segue o `Financeiro.tsx` 1234. A saída do `voltarFoco` local está listada, e o passo 5 vai ao `h1` quando o `h2` da folha é `.sr`. |
| 6. Nome das tabelas da Equipe | **Sim** | As duas tabelas estão no plano, com os nomes iguais aos das listas do celular. |
| 7. Roteiro | **Sim** | Tem o atalho de três cliques, o escritório de demonstração (já usado em outros planos), o passo 5 com o iPhone deitado e os passos 3 e 5 só depois da programação. A instrução do rotor "Linhas" saiu. Há "anote o que ouviu" em cada passo. |
| 8. Painel | **Sim** | Há dois pendentes citando PT-10 (NVDA e o compacto de 36 px fora das tabelas), mais a regra do que acontece se o VoiceOver falhar. |

### Para quem for programar (não bloqueia a aprovação)

- **Ordem dos efeitos no `Janela`.** O efeito novo guarda a pista com `document.activeElement`. Ele precisa rodar **antes** do efeito que chama `showModal()` e foca o `[data-foco]`, ou guardar a origem dentro desse mesmo efeito, antes do `showModal()`. Se ficar depois, a origem já é um elemento de dentro da janela, e a pista herdada fica errada. O protótipo não tem essa armadilha, porque intercepta o próprio `showModal`. O teste 5 do plano, rodando com o componente de verdade, pega o erro.
- **Duas execuções no desenvolvimento.** No modo de desenvolvimento, o React roda o efeito, a limpeza e o efeito de novo, e a limpeza dispara uma vigia falsa. Ela não move o foco, porque só age com o foco perdido e nenhuma janela aberta, mas convém não mostrar aviso no console.
- Na primeira rodada da minha Agenda v2, os testes de 390 e 320 px falharam uma vez ao carregar a página e passaram nas 3 repetições. Vale olhar se o teste 3 do plano fica instável.
