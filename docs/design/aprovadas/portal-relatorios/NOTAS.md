# Portal: Relatórios do sócio · notas

> **Aprovado pela Carol em 20/11/2026, às 7h57 (Bahia).** Ela respondeu "aprovado", sem mudanças: as 4 recomendações do fim e a ideia nova IN-15 valem como decisões (ver "Decisões da Carol").

O pedido da Carol: *"Desenhar os relatórios do sócio"*: quanto entrou, quanto falta receber, quanto rendeu por cliente e por área. Desenho para ela aprovar antes de virar código.

**Leitura do pedido:** uma 6ª seção, **Relatórios**, na barra do Financeiro (Resumo, A receber, A pagar, Repasses, Caixa, Relatórios), só para a sócia dona nesta versão. O Resumo continua sendo "o mês de hoje e o que fazer"; o Caixa, "saldos e previsão"; A receber, "a lista de cobrança". Relatórios é **olhar um período, comparar com o anterior e entender de onde vem o dinheiro**. Nenhuma ação de cobrança acontece aqui: o relatório leva a A receber.

Atende:

- **IN-02** (contratado), **IN-03** (recebido = Entrou), **IN-04** (vencido e pendente = Falta receber), **IN-05** (o que vence até o fim dos contratos e o RPV e precatório com data estimada), **IN-07** (vencido por idade), **IN-09** (comparação com o período anterior, escrita em texto), **IN-12** (receita e casos por área de atuação e por responsável), **IN-08** como número de apoio (carga: casos por responsável), **IN-14** (o que passou de terceiros e foi repassado no período);
- **FI-06** (terceiros só numa folha âmbar à parte, nunca somados) e **FI-07** (as despesas de caso adiantadas e não reembolsadas descontam do Rendeu).
- **"Rendeu por cliente" não tem código próprio.** Sugestão de ideia nova para a seção 6 do `IDEIAS.md`: **IN-15 · Quanto rendeu cada cliente, área e responsável no período: o que entrou menos as despesas de caso adiantadas que não voltaram, sem ratear despesa fixa [V1]**. Aprovada com o desenho e registrada no `IDEIAS.md`.
- **Não desenhei nada de DRE (FI-22)** nem rateio de custo fixo. A tela diz, no Rendeu, que essa conta é a DRE e depende do contador.

A base é o **Financeiro aprovado** (`portal-financeiro`, 19/11/2026): o `comum.py` e o `financeiro.py` foram **copiados sem mudança**. O `relatorios.py` lê as peças do `financeiro.py` (folha, faixa de terceiros, barras, tabelas, janelas, cabeçalho da ficha) sem executar a parte que grava o `financeiro.html`. A pessoa sem acesso é Bianca Torres (Contratos e Financeiro), a mesma do Início por áreas aprovado. As peças novas têm o prefixo `re-`. Mesmo elenco, mesmos clientes, contratos e valores de novembro, mesma data (quarta, 18/11/2026).

## Como abrir

- `index.html` mostra os 12 estados em computador (1440) e celular (412), com legenda. Clique numa imagem para abrir o HTML naquele estado.
- `relatorios.html` abre sozinho, com as fontes, o CSS e os ícones embutidos. O estado vem do endereço: `?estado=visao`, `clientes`, `cliente`, `areas`, `responsaveis`, `periodo`, `periodo-erro`, `exportar`, `vazio`, `carregando`, `erro` e `sem-acesso`. No celular, `&mais=1` abre a folha Mais.
- As visões (Visão geral, Por cliente, Por área, Por responsável) trocam de estado. "Escolher datas" e "Exportar" abrem as janelas; Esc fecha. "Como contamos" abre e fecha. As outras seções do Financeiro levam às telas aprovadas, ao lado desta pasta (`../portal-financeiro/`).
- Abaixo de 760 px, vira a versão de celular: o Financeiro mora no Mais, que fica marcado; as tabelas viram cartões.
- `_fonte/`, e `sh _fonte/gerar.sh <pasta>` refaz tudo:
  - `comum.py` e `financeiro.py`: cópias sem mudança do Financeiro aprovado;
  - `dados.py`: os dados fictícios, um registro por contrato. Todas as somas saem dele e são conferidas com `assert` (ver abaixo);
  - `relatorios.py`: gera o `relatorios.html`;
  - `casos.py`: gera a lista de estados (`casos.json`) e o `index.html`;
  - `fotos.cjs`: o `fotos.cjs` aprovado, com o axe vindo do `node_modules` ou do caminho em `AXE_PLAYWRIGHT`. Faz as capturas (deviceScaleFactor 2) e as conferências;
  - `webp.py`: converte as capturas para WebP.

### Os números fecham

- **Entrou** set–nov: R$ 116.200,00 = R$ 39.910,00 + R$ 45.050,00 + R$ 31.240,00 (os meses do Caixa aprovado). Por cliente, por área e por responsável somam o mesmo valor.
- **Falta receber**: R$ 42.070,00 em parcelas = R$ 7.050,00 vencidos (os 4 do Resumo, com a mesma idade) + R$ 12.060,00 até 30/11 (os R$ 8.000,00 e os R$ 4.060,00 de A receber) + R$ 22.960,00 depois. À parte, R$ 32.629,97 de RPV e precatório: os R$ 4.860,00 e R$ 21.300,00 do Caixa e os R$ 6.469,97 de honorários do RPV de Benedito, ainda a transferir.
- **Rendeu**: R$ 116.200,00 − R$ 1.385,00 (as custas de Daniela e a perícia de Hélio, o "A reembolsar" de A pagar) = R$ 114.815,00.
- **Terceiros**: entraram R$ 166.206,56; foram repassados R$ 96.318,00 aos clientes; R$ 39.183,60 de honorários e R$ 420,00 de reembolso passaram ao escritório; ficam R$ 30.284,96, o saldo de terceiros do Caixa aprovado. Os R$ 31.428,00 repassados em novembro também batem com o Resumo.

## Decisões de design

1. **Período padrão: Últimos 3 meses** (01/09 a 18/11/2026), contra junho a agosto. Três meses mostram uma tendência sem misturar o ano inteiro, cabem todos os clientes ativos e são o horizonte do Caixa. "Este mês" já é o Resumo; "Este ano" fica a um toque. O seletor tem Este mês, Últimos 3 meses, Este ano e Escolher datas, e o período escolhido fica escrito à direita, com o da comparação.
2. **Mês aberto escrito.** A comparação de um período que inclui o mês de hoje é injusta. Em vez de esconder, o Entrou diz as duas coisas: "R$ 5.830,00 a menos que jun–ago" e "se entrar o previsto até 30/11 (R$ 17.060,00), fecha R$ 11.230,00 a mais". No gráfico, o que falta de novembro aparece como previsto (âmbar-3 com contorno), igual ao Resumo.
3. **"Como contamos" na própria tela**, num bloco que abre e fecha (aberto na Visão geral, fechado nas outras): Entrou, Falta receber, Rendeu, Contratado, Comparação e De terceiros, cada um em duas ou três linhas.
4. **Três números no campo vinho**, cada um com a comparação em texto e um ícone (nunca seta colorida sozinha). Falta receber traz o selo escrito do vencido e, separado por um fio tracejado, o RPV e precatório à parte.
5. **Visão geral** (coluna principal): Entrou mês a mês (este período e o anterior, em grupos com rótulo), Maiores clientes (5) e Por área do direito, cada nome levando ao detalhe. Na coluna da direita: Falta receber (vencido por idade, a vencer, e a caixa "À parte · não soma acima"), a conta do Rendeu e, por último, a folha âmbar de terceiros. Cada folha tem uma linha de leitura curta quando ajuda a entender o número (ex.: "os 5 maiores trouxeram 60%, e dois são êxito de caso encerrado, que não se repete").
6. **Terceiros (FI-06):** só na folha com a faixa âmbar-3, o escudo e "De terceiros · não é do escritório", e o título "Passou pelo escritório". Mostra o fluxo (entrou, repassado, honorários que passaram ao escritório, ainda na conta). A linha dos honorários diz "já contados em Entrou, não somar de novo". Nada de terceiros aparece nos três números, nas tabelas nem no gráfico.
7. **Por cliente:** tabela com Contratado, Entrou (ordem padrão, com `aria-sort`), Falta receber (selo escrito do vencido; RPV ou precatório à parte numa linha menor), Despesas não reembolsadas e Rendeu. Busca, ordenação e filtro de área. O total no pé é igual ao Entrou do período. **Rendeu negativo** aparece com o sinal de menos e o texto "adiantou mais do que entrou" (Hélio e Daniela), e o pé da folha explica. No celular, cartões, 8 de 18 com "Mostrar mais" e os totais embaixo.
8. **Relatório de um cliente** (Construtora Vale Alto): o cabeçalho da ficha aprovada, com o atraso no âmbar e "Ver em A receber". Os quatro números com a comparação; contratos e casos com a área (inclusive "Sem caso ligado" para a assessoria); o que entrou, por mês, com o contrato de cada valor; o que falta (com o motivo e a próxima ação já anotados em A receber); o que o escritório adiantou e já voltou; e o alvará que passou e foi repassado, na folha âmbar. Links para a ficha do cliente, o contrato, o caso e A receber.
9. **Área = área do direito do caso** (Jurídico aprovado). Contrato sem caso (assessoria, consultoria, consulta) aparece como **"Sem caso ligado"**, que é a maior fatia (29%). Por área tem o gráfico contra jun–ago (barra de cima e de baixo, como no Resumo) e a tabela com casos no período, entrou, falta receber, rendeu e rendeu por caso.
10. **Por responsável:** entrou, carga (casos e contratos sem caso, IN-08), falta receber, despesas e rendeu. O responsável é o do contrato. Uma reserva lembra que **o número não é a parte de cada um** (FI-11, divisão entre sócios, está em validação).
11. **Gráficos:** poucos, todos de barras horizontais nas cores do Gabinete, com o valor em reais escrito ao lado, legenda em quadradinho, `role="group"` com rótulo e barras decorativas (`aria-hidden`). Nada depende só da cor: grupos com rótulo, posição fixa (cima e baixo) e texto.
12. **Escolher datas** é uma janela: atalhos (Mês passado, Últimos 6 meses, Ano passado), De e Até em dd/mm/aaaa e com o que comparar (período anterior do mesmo tamanho, mesmo período do ano passado, não comparar). Erros: dia que não existe e data final antes da inicial, com resumo no topo, cada erro preso ao campo, e o aviso de que o relatório continua no período anterior.
13. **Exportar** baixa o relatório aberto (planilha .xlsx com uma aba por visão, ou PDF), com o período, a comparação e o que vai no arquivo. **Terceiros vão numa aba à parte**, que não soma com as outras. A exportação fica no histórico, e a janela lembra que o arquivo tem dados de clientes.
14. **Quem vê:** só a sócia dona. Quem tem Financeiro sem ser dona (Bianca) não vê a aba, e a barra dela tem as cinco seções aprovadas. Se abrir o endereço direto, uma mensagem calma diz que só Marina abre os relatórios, que é ela quem decide quem vê, e leva ao Resumo e ao Caixa. Não há aba travada nem número escondido.
15. **Vazio, carregando e erro** seguem o Início por áreas: o vazio diz o que precisa existir (contratos, caso ligado, recebimentos) e leva a Contratos, Jurídico e A receber, sem número inventado; o carregando mostra o período e as visões e o esqueleto com `aria-busy`; o erro tem Tentar de novo, o caminho alternativo (A receber) e o código para o suporte.

## Acessibilidade (WCAG 2.2 AA)

- **Conferência automática** em 24 capturas (12 estados × computador e celular), pelo `fotos.cjs`. O resultado está em `_conferencia.json`:
  - o axe (WCAG 2.0, 2.1 e 2.2, A e AA) não achou nenhuma violação;
  - nenhuma tela tem rolagem lateral;
  - nenhum alvo menor que 44 px; a única exceção é a palavra-marca "T3jus" da moldura aprovada (24 px), igual às áreas aprovadas;
  - nenhum erro de script.
- **Estrutura:** um `h1` (Relatórios, ou o nome do cliente); `h2` por folha; os três números são `section` com rótulo. As visões são uma `nav` com `aria-current="page"`; o período é um grupo de botões com `aria-pressed`.
- **Tabelas:** `caption`, `th` com `scope` (cabeçalho de linha nas áreas e responsáveis), `aria-sort` na coluna ordenada, total em `tfoot`.
- **Contraste:** só pares do D2 e do Gabinete. Sobre o vinho: branco, #F2CDB3 e #E9AE90 (sobretítulo); selo de vencido branco sobre #AC3F6B; faixa de terceiros #4F1D35 sobre #F2CDB3. Âmbar nunca é texto sobre fundo claro.
- **Formulários e janelas:** `label` em todos os campos, `fieldset` e `legend` nos grupos, erros com `aria-invalid`, `aria-describedby` e resumo no topo; `<dialog>` com `showModal()`, Esc fecha, foco no primeiro campo ou no campo com erro.
- **Carregando:** `aria-busy` na região e aviso `role="status"`; erro com `role="alert"`.

## O que precisa de dado novo no servidor

Nenhuma tabela nova: tudo sai das tabelas aprovadas do Financeiro (`parcela`, `recebimento`, `reembolso`, `levantamento`, `destinacao`), dos contratos e dos casos (com `area` e `responsavel_id`). Todas têm `escritorio_id` e passam por `proteger_tabela_escritorio`. O escritório vem sempre da sessão, nunca do navegador. **Tudo é calculado no servidor**, em centavos (inteiro); a tela só mostra.

| Rota | O que devolve | Erros |
|---|---|---|
| `GET /v1/financeiro/relatorios/resumo?de=&ate=&comparar=anterior\|ano_passado\|nao` | Os três números do período e do de comparação, entrou por mês, previsto que falta do mês aberto, falta receber (por idade, a vencer, e RPV e precatório à parte com data estimada), a conta do rendeu, os 5 maiores clientes, as áreas e o bloco `terceiros` (separado, sem total comum) | `SEM_PERMISSAO`, `PERIODO_INVALIDO`, `PERIODO_LONGO` |
| `GET /v1/financeiro/relatorios/clientes?de=&ate=&ordem=&area=&q=&cursor=` | Por cliente: contratado, entrou, falta receber, vencido, despesas não reembolsadas, rendeu, RPV à parte; e o total do período | `SEM_PERMISSAO` |
| `GET /v1/financeiro/relatorios/clientes/:id?de=&ate=` | Contratos e casos do cliente, recebimentos do período, o que falta, os reembolsos e os levantamentos de terceiros dele | `SEM_PERMISSAO`, 404 de outro escritório |
| `GET /v1/financeiro/relatorios/areas?de=&ate=` | Por área do caso (e "sem caso"): entrou e o do período de comparação, falta receber, rendeu, casos no período e rendeu por caso | `SEM_PERMISSAO` |
| `GET /v1/financeiro/relatorios/responsaveis?de=&ate=` | Por responsável do contrato: entrou, falta receber, vencido, despesas, rendeu, casos e contratos sem caso | `SEM_PERMISSAO` |
| `POST /v1/financeiro/relatorios/exportacoes` | Gera o .xlsx (uma aba por visão e a de terceiros) ou o PDF do relatório aberto e registra no histórico | `SEM_PERMISSAO` |

Regras:

- **Só a sócia dona.** Para qualquer outra pessoa, 403 `SEM_PERMISSAO`, mesmo com a área Financeiro. A moldura já chega sem a aba (o servidor decide as seções).
- **Entrou** = soma de `recebimento.valor_centavos` com `caixa = escritorio` e `recebido_em` no período, mais as `destinacao` de honorários com `feito_em` no período. Reembolso não é honorário: não entra.
- **Falta receber** = parcelas `aberta` ou `parcial` (o que falta), vencidas e a vencer até o fim do contrato; mensalidade sem data de fim só até o mês corrente. RPV e precatório: `levantamento` previsto e `destinacao` de honorários pendente, só a parte do escritório, em lista separada.
- **Rendeu** = Entrou − `reembolso` com `situacao = a_reembolsar` cuja despesa foi paga no período.
- **Período:** `de` e `ate` em `aaaa-mm-dd`, até 2 anos; `ate` não passa de `hoje_brasilia()`.

## Para o painel

- Esta entrega atende IN-02, IN-03, IN-04, IN-05, IN-07, IN-09, IN-12 e IN-14 na visão do período, e usa IN-08 como apoio (carga por responsável). FI-06 e FI-07 são regra da tela.
- IN-08 também pede "casos por etapa": isso está no Jurídico aprovado. Aqui só entra a carga.
- A IN-15 entrou no `IDEIAS.md` com a aprovação e é citada nesta entrega.
- **Diferença no aprovado, para corrigir ao programar:** o Resumo aprovado mostra R$ 7.200,00 de êxito em novembro, mas os Repasses aprovados transferiram R$ 11.373,60 de honorários de êxito (Irene, R$ 9.273,60; Gabriela, R$ 2.100,00). Aqui sigo os Repasses e mantenho o total do mês (R$ 31.240,00). No sistema, os dois saem da mesma conta e não vão divergir.
- As listas de casos do Financeiro e do Jurídico aprovados não são as mesmas; os casos daqui juntam as duas (19 no período). No sistema, o número vem do servidor.

## Perguntas para a Carol

1. **Quem vê os relatórios?** **Recomendo só a sócia dona nesta versão.** Eles mostram quanto rendeu cada cliente e cada advogado, o que é sensível dentro da equipe. Se um piloto tiver outro sócio, o próximo passo é a sócia dona liberar para "sócios", sem abrir para todo o Financeiro.
2. **O que é "rendeu"?** **Recomendo: o que entrou menos as despesas de caso que o escritório adiantou e ainda não voltaram, sem descontar aluguel, salários ou outras despesas fixas.** É uma conta que o sistema faz sem erro e que o advogado entende. Ratear o fixo por cliente é DRE, depende do contador e fica para a FI-22.
3. **"Entrou" conta pela data em que o dinheiro entrou ou pelo mês da parcela?** **Recomendo a data em que entrou** (caixa), como o Caixa aprovado. A parcela de outubro paga em novembro conta em novembro. O mês da parcela (competência) fica para a DRE.
4. **Qual período abre por padrão?** **Recomendo os últimos 3 meses**, comparados com os 3 anteriores, com o mês de hoje escrito como "ainda aberto". O mês corrente já está no Resumo; o ano inteiro fica a um toque.

## Decisões da Carol (20/11/2026)

1. **Quem vê:** só a sócia dona, nesta versão.
2. **Rendeu:** o que entrou menos as despesas de caso adiantadas que ainda não voltaram, sem custo fixo (o rateio fica para a DRE, FI-22).
3. **Entrou:** pela data em que o dinheiro entrou (caixa).
4. **Período padrão:** os últimos 3 meses, comparados com os 3 anteriores, com o mês de hoje marcado como "ainda aberto".
