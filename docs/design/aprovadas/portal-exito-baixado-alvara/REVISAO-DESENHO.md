# Revisão do desenho · êxito baixado na divisão do alvará (F3.174) e "Baixado sem receber" nos Relatórios (F3.173)

**Revisado em:** 25/11/2026, por um revisor independente (UX/UI de SaaS e acessibilidade).

**O que foi lido:**
- desta pasta: `index.html`, `NOTAS.md`, `_conferencia.json` e `_fonte/`;
- as 24 capturas: as de computador nas partes com janela, folha e tabela, e as de celular em fatias;
- o plano `f3-174/plano.md` (v2), com os estados `eb-1` a `eb-6` e `rb-1` a `rb-6`;
- `docs/IDENTIDADE.md` e `docs/design/conceito-gabinete.md`;
- os aprovados `portal-baixa-parcela-motivo` (com a `REVISAO-DESENHO.md` dele), `portal-relatorios` e `portal-tabelas-toque`;
- o código de hoje: `FinanceiroRepasses.tsx`, `Relatorios.tsx` e `portal.css`, e a `0552_repasse_prazo_ajustavel.sql`, para o prazo.

Abri também as telas no Playwright, a 1440 e a 390, para conferir a posição da janela e o foco de cada estado.

## Veredito

**Pronto para a Carol, depois das correções abaixo, que já foram aplicadas.**

O desenho segue o plano v2 com fidelidade:
- os textos dos 12 estados batem palavra por palavra;
- o aviso fica fora da célula, dentro do quadro "Divisão";
- o grupo de rádio é `fieldset` com `legend`, e o erro segue o padrão do grupo de motivos aprovado;
- o axe passa nos 24 casos, sem rolagem lateral.

Havia **3 notas médias**:
- a janela no celular ficava presa à esquerda;
- o conflito se contradizia na mesma tela;
- o prazo do repasse ignorava o feriado de 20/11.

Havia também **4 notas baixas**: o histórico diferente do código, a comparação de 31/08, o valor da confirmação no plano e uma quebra de linha. As outras são sugestões ou só registro.

## Notas

### 1. No celular, a janela fica presa à esquerda, com 32 px vazios à direita · média · **aplicada**
- **Evidência:** em todos os `eb-` a 390, a janela começava em x = 0 e tinha 358 px de largura (Playwright). Nas capturas, a borda direita da janela termina antes da tela, e a página aparece atrás. O `.janela.fi-larga{width:min(760px,calc(100vw - 32px))}` vence o `.janela{width:100%}` da folha de baixo. No código de hoje, há a regra `@media (max-width:760px){.janela.fi-larga{width:100%}}` (`portal.css:1546`), e a cópia do CSS no gerador não a tinha. O aprovado `bx-janela` ocupa a largura toda.
- **Correção:** acrescentar `.janela.fi-larga{width:100%}` no `@media (max-width:760px)` do `CSS_EB`.
- **Aplicada.** A janela agora tem x = 0 e 390 px nos 5 estados com janela.

### 2. O conflito se contradiz e tem dois botões principais · média · **aplicada**
- **Evidência:** `eb-conflito`, no computador e no celular.
  - **A contradição.** No topo, o aviso diz "Bianca Torres desfez a baixa sem receber do êxito de Rita às 10h13". Logo abaixo, na divisão antiga, o aviso âmbar continua com "O êxito de Rita está com baixa sem receber.", com o grupo "O que fazer…" e "Paga a parcela do êxito (falta R$ 4.800,00)".
  - **Os dois botões principais.** O "Registrar" continua ativo no pé. O "Ver a divisão refeita" também é um botão principal, dentro do aviso.
  - **O precedente.** É o mesmo problema da nota 4 da revisão do D35 (`portal-baixa-parcela-motivo/REVISAO-DESENHO.md`): lá, o conflito mostrava dois saldos diferentes, e a correção aprovada tirou os campos da janela e pôs a ação no pé.
- **Correção:**
  - no conflito, a divisão antiga sai e dá lugar a uma linha: "A divisão saiu daqui porque o êxito de Rita mudou. O que entrou, o caso, o valor e o dia continuam como você escreveu.";
  - o pé fica com "Cancelar" e "Ver a divisão refeita" (principal, com o foco), no lugar de "Registrar";
  - o aviso continua em `role="alert"`, com o texto do plano.

  Isso cumpre o plano, que pede "Ver a divisão refeita" mantendo o resto do que foi preenchido (A3, ui), e o padrão do `bx-conflito` aprovado.
- **Aplicada.** O Playwright confirma o foco em `BUTTON "Ver a divisão refeita"` a 1440 e a 390. A NOTAS (decisão 6 e "Onde o desenho saiu do plano", item 2) e a legenda do index foram atualizadas.

### 3. O prazo do repasse ignora o feriado de 20/11 · média · **aplicada**
- **Evidência:** a ficha de Rita (`eb-historico`) e a confirmação na NOTAS dizem "Até 23/11".
  - O prazo é de 3 dias úteis depois de 18/11 (quarta).
  - Pela `somar_dias_uteis` (`0552:41-53`), 20/11 é feriado nacional (`0552:37`, Lei 14.759/2023), e o código usa a mesma conta (`somarDiasUteis`).
  - As contas dão 19/11, 23/11 e 24/11. É uma data de dinheiro de terceiros que a sócia lê como compromisso.
- **Correção:** "Até 24/11" no selo do topo, na linha da tabela, no cartão do celular e no texto da confirmação.
- **Aplicada** no gerador (as 3 ocorrências) e na NOTAS.
- **Fora deste desenho:** os "Até 20/11" da lista de Repasses ao fundo vêm do Financeiro aprovado e caem no feriado. Não mexi, mas vale avisar quem cuida daqueles dados.

### 4. O histórico não segue o que o código de hoje escreve · baixa · **aplicada no desenho, com um ponto para o código**
- **Evidência:** `eb-historico`.
  - O desenho escreve "Diego Almeida registrou o alvará", com "R$ 16.000,00 · tudo para Rita". O `FRASES` de hoje escreve "**Diego Almeida** registrou Alvará de R$ 16.000,00" (`FinanceiroRepasses.tsx:834`). O detalhe sai do `detalheHistorico` (`:842`), e com os honorários tirados, `seguiuProposta` é falso: "divisão ajustada à mão".
  - O título do dia de hoje leva "· hoje" (`:871`), e o desenho não o tinha.
- **Correção no desenho:** "registrou Alvará de R$ 16.000,00", com "divisão ajustada à mão", e "18/11/2026 · hoje".
- **Para o código (não é do desenho):**
  - a linha nova não começa pelo nome em negrito, como as outras do `FRASES`, porque quem fez fica embaixo. Ela precisa de um caminho próprio no `HistoricoRepasse`;
  - também vale decidir se o "Manter" conta como "seguiu a proposta". Hoje sairia "divisão ajustada à mão", o que é verdade, mas não diz por quê.
- **Aplicada** no gerador.

### 5. A comparação do Falta receber com 31/08 não fecha · baixa · **aplicada**
- **Evidência:** `rb-visao` e `rb-como` diziam "R$ 4.130,00 a mais que em 31/08 (R$ 38.940,00)".
  - Os R$ 38.940,00 são o valor aprovado, de antes de Noemi entrar nos dados.
  - Em 31/08, a parcela 6/6 de Noemi, com vencimento em 10/10, estava a vencer, e "Falta receber" conta as parcelas a vencer até o fim de cada contrato ("Como contamos").
  - Por isso, o valor de 31/08 também sobe R$ 1.000,00, e a diferença continua R$ 3.130,00, como no aprovado.
- **Correção:** `FALTA_ANT` passa a ser R$ 39.940,00, com uma `assert` no gerador. O êxito de Rita fica fora de 31/08, porque o êxito entra quando acontece. Isso foi registrado na NOTAS.
- **Aplicada.** A tela agora diz "R$ 3.130,00 a mais que em 31/08 (R$ 39.940,00)".

### 6. O texto da confirmação no plano esquece as custas · baixa · **registrada, sem mudar o plano**
- **Evidência:** o plano (A5) escreve "R$ 11.200,00 para Rita". Com o "sim" da pergunta A2, as custas de R$ 412,30 entram na divisão, e Rita fica com R$ 10.787,70, como o desenho já mostra no `eb-desfazer-escolhido`.
- **Correção:** a NOTAS agora explica a diferença. Quem programar usa o valor calculado (`doCliente`), nunca o número escrito no plano.
- **Aplicada** na NOTAS. Não editei o plano.

### 7. O "✓ Soma da divisão" tranquiliza enquanto a escolha está pendente · sugestão · não aplicada
- **Evidência:** em `eb-proposta` e `eb-erro`, a soma aparece com check e "igual ao valor levantado", logo abaixo do aviso que pede uma decisão. Quem lê rápido entende que está tudo certo.
- **Sugestão:** enquanto nada estiver marcado, a soma pode perder o check, ou ganhar "Falta escolher o que fazer com o êxito de Rita." O plano não pede isso, então fica para a Carol decidir.

### 8. Na tabela Por cliente, um nome longo encosta na linha de baixo · sugestão · não aplicada
- **Evidência:** `rb-clientes`, a 1440. Com 7 colunas, "Construtora Vale Alto Ltda." quebra, e "Ltda." encosta em "3 contratos · Felipe Matos".
- **Sugestão:** isso entra na nova medição das faixas `data-sai3`/`sai2`/`cartoes`, que o plano já pede (B3, nota 6). Não muda o desenho.

### 9. "jun. a ago." quebra no meio · baixa · **aplicada**
- **Evidência:** `rb-visao-nenhuma`, a 1440: "Nenhuma baixa sem receber de jun. a / ago.".
- **Correção:** o período não quebra (`white-space:nowrap`).
- **Aplicada.**

### 10. O que foi conferido e está certo · registro
- **Textos.** Todos os textos exatos dos estados `eb-1` a `eb-6` e `rb-1` a `rb-6` batem com o plano. A única mudança é a do `eb-conflito`, em que a primeira frase vira o título do aviso, como a NOTAS já dizia. Não há "dá baixa" nos textos novos (nota 15 do plano).
- **Contas:**
  - Parte A: R$ 4.800,00 + R$ 11.200,00 = R$ 16.000,00, e R$ 4.800,00 + R$ 412,30 + R$ 10.787,70 = R$ 16.000,00;
  - folha: Rita, R$ 4.800,00, mais Noemi, R$ 1.000,00, dão R$ 5.800,00 em 2 parcelas;
  - Falta receber: R$ 43.070,00, com R$ 8.050,00 vencidos e 5 parcelas;
  - Noemi: 39 dias de 10/10 a 18/11.
- **Datas.** Nenhuma data está no futuro: 05/11, 15/10, 10/11 e 12/11 vêm todas antes de 18/11. O conflito às 10h13 vem depois da abertura, às 10h12.
- **Hierarquia.**
  - Na célula, só a linha curta, com ícone e texto.
  - O aviso âmbar segue o par `aviso-atencao` aprovado (fundo `--atencao-fundo-suave`).
  - O grupo vem antes da soma, e "Registrar" é a única ação principal.
  - "não soma" e "desfeita em" sempre aparecem escritos.
- **Coerência com hoje.**
  - A janela segue a `JanelaRegistrar` (legenda, tabela, `rp-cliente` e "Acrescentar…").
  - A folha nova usa a `dl.re-conta` do Rendeu.
  - A coluna nova tem `data-r`.
- **Acessibilidade:**
  - o grupo é `fieldset` com `legend`;
  - o erro vem logo depois da legenda, com `aria-describedby` no grupo e `aria-invalid` em cada rádio;
  - o `fieldset.rp-div` aponta para `#eb-aviso`;
  - o resumo é `role="alert"`, com um link de 44 px;
  - os rádios são cartões de 44 px ou mais;
  - no celular, o pé tem dois botões de 44 px, na largura toda;
  - o "R$" nunca quebra do número.
- **Foco, conferido no Playwright depois das correções:**
  - `eb-proposta`: "O que entrou";
  - `eb-desfazer-escolhido`: "Desfazer…";
  - `eb-mantida`: "Manter…";
  - `eb-erro`: o primeiro rádio;
  - `eb-conflito`: "Ver a divisão refeita".

## Depois das correções

- `sh _fonte/gerar.sh ..` refez os HTML, o `index.html`, as 24 capturas PNG (escala 2), os WebP e a `_conferencia.json`.
- **axe:** WCAG 2.0, 2.1 e 2.2, A e AA, com Chromium (`chromium.launch()` sem opções). Deu 0 violação nos 24 casos.
- **Rolagem lateral e erros de script:** 0 rolagem lateral e nenhum erro de script.
- **Alvos pequenos:** o único listado é a marca "T3jus" da moldura aprovada (204×24).
- **Arquivos mudados:**
  - `_fonte/exito_baixado.py`, nas notas 1 a 5 e 9;
  - `NOTAS.md`, nas notas 2, 3, 5 e 6;
  - esta revisão.

  `comum.py`, `financeiro.py`, `relatorios.py` e `dados.py` continuam cópias sem mudança. A correção do `FALTA_ANT` é feita pelo gerador. Nada foi para commit.
