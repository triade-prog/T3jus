# Portal · Financeiro · Empréstimos (F3.51 · FI-20) · notas

**Aprovado pela Carol em 22/11/2026, às 23h41 (Bahia), com todas as recomendações.** A decisão de produto veio antes, no mesmo dia: empréstimos à parte, como terceiros. Respostas que valem para a programação:

- **Juros:** o contador recebe o custo do empréstimo num número só (total das parcelas menos o que entrou), sem os juros de cada parcela.
- **Sócio sem parcelas fixas** ("devolve quando der", com Registrar devolução) entra já na primeira versão.
- **Quem vê:** quem tem a área Financeiro vê todos os empréstimos, inclusive os de sócio; muda junto com a decisão sobre as retiradas.
- **Encerrar e cancelar:** qualquer pessoa com a área Financeiro, sempre com motivo e histórico.
- **Resumo:** não menciona empréstimos.
- **Desenho:** a folha Empréstimos fica na coluna principal do Caixa; a tabela mês a mês passa a 5 colunas (realizado e previsto na mesma célula); o "Falta pagar" total soma sócio e banco.

O plano de execução (versão 3) está em `PLANO.md`, e a revisão independente, com a segunda leitura, em `REVISAO.md`. As imagens aqui estão em WebP (1600 px de largura no computador); `_fonte/gerar.sh` refaz as capturas em PNG.


Desenho para a Carol aprovar antes de virar código. Segue o plano `PLANO.md` (versão 2, já com a revisão) e a decisão da Carol, que não volta à mesa: o empréstimo fica **à parte**, como os valores de terceiros. O dinheiro emprestado (de banco, de sócio ou de outra pessoa) entra no saldo do Caixa, mas não conta como receita. As parcelas pagas saem com a categoria Empréstimos, separadas das despesas, e vão ao contador numa linha e numa aba próprias.

As dúvidas abertas do plano (§8) estão desenhadas como o plano recomenda. Veja "Perguntas para a Carol" no fim.

## Como abrir

- `index.html` mostra os 21 estados lado a lado, no computador (1440) e no celular (412), cada um com rótulo e uma nota. Clique numa imagem para abrir o HTML naquele estado.
- `emprestimos.html` abre sozinho, com as fontes, o CSS e os ícones embutidos. O estado vem do endereço, por exemplo `emprestimos.html?estado=em-ficha`. Abaixo de 760 px, ele vira a versão de celular. Funcionam as janelas (abrir, fechar, Esc), o Mais e os links entre os estados. O resto é desenho.
- Com janela aberta, a captura cresce até mostrar a janela inteira, sem a rolagem interna, para todos os campos aparecerem.
- `_fonte/` refaz tudo com `sh _fonte/gerar.sh`:
  - `comum.py`, `financeiro.py`, `pend.py` e `financeiro_pend.py` são os geradores das telas aprovadas (Financeiro de 19/11 e as pendências do Caixa, F3.50), copiados sem mudança. Só o caminho das telas aprovadas, no `comum.py`, passou a vir de `APROV`;
  - `emprestimos.py` importa esses geradores, tira os estados antigos da página e põe os 21 novos. As peças novas têm o prefixo `em-`;
  - `casos.py` gera a lista de estados e o `index.html`;
  - `fotos.cjs` faz as capturas (PNG, deviceScaleFactor 2) e as conferências. O resultado fica em `_conferencia.json`.
- Os dados são fictícios e fecham entre as telas. Hoje é 18/11/2026, e o saldo de abertura é de 31/08/2026. Os empréstimos são:
  - **Banco do Brasil** (Pronampe), de 04/2025, anterior ao T3jus. São 40 parcelas de R$ 2.090,00: 16 foram pagas antes do T3jus, 2 no T3jus, e 22 faltam (R$ 45.980,00);
  - **Sicoob**, de 05/10/2026, com R$ 30.000,00 que entraram. São 24 parcelas de R$ 1.450,00: 1 foi paga e 23 faltam (R$ 33.350,00);
  - **Marina Ribeiro**, sócia, que pôs R$ 8.000,00 em 12/09 e recebeu de volta R$ 2.500,00. Faltam R$ 5.500,00.

  O falta pagar soma R$ 84.830,00. O saldo de hoje (R$ 70.180,00) é o do Caixa aprovado (R$ 40.310,00) mais R$ 29.870,00 de empréstimos: o que entrou no caixa menos o que foi pago. A coluna Empréstimos de cada mês fecha com o saldo.

## Decisões de design

1. **Empréstimo é à parte, mas não é de terceiros. Por isso, nunca leva âmbar.** O âmbar segue só para terceiros. O empréstimo usa a areia (sal-2) com texto vinho e o ícone de duas setas (dinheiro que entra e volta), sempre com a frase "entra no saldo, mas não é receita". A folha do Caixa repete a estrutura da folha de terceiros (uma faixa no alto e o título), mas a faixa é areia, com "À parte · entra no saldo, mas não é receita".
2. **Caixa (T1).**
   - O campo vinho do saldo ganha uma linha: "Inclui R$ 29.870,00 de empréstimos, já descontado o que foi pago. Entra no saldo, mas não é receita."
   - A folha "Empréstimos" fica na coluna principal, logo abaixo de "Previsto e realizado", onde o Caixa aprovado tinha espaço livre. Cada linha mostra:
     - os selos Banco, Sócio ou Outro, e "Anterior ao T3jus" quando for o caso;
     - o nome, que leva à ficha, e para que é o empréstimo;
     - a próxima parcela;
     - à direita, o falta pagar em destaque, com "18 de 40 pagas · termina em ago/2028". No sócio, é o falta devolver, com "sem juros" e o botão "Registrar devolução".
   - O pé da folha traz o total que falta pagar e a regra em uma frase.
   - O gráfico "Previsto e realizado" não muda: ele mostra as entradas do dia a dia.
   - **A tabela mês a mês volta.** O Caixa das pendências (F3.50) a tinha tirado. Ela ganha a coluna "Empréstimos · à parte", com sinal (+ o que entrou, − as parcelas e devoluções), realizado em cima e previsto embaixo.
   - Para caber a coluna nova sem rolagem lateral, cada tipo virou uma coluna só, com o realizado e "de R$ X prev." embaixo. São 5 colunas em vez de 6. A coluna dos empréstimos tem fundo areia e só aparece quando o escritório tem algum empréstimo.
   - **Vazio:** uma linha tracejada e discreta, com o texto do plano e "Registrar empréstimo".
   - O quitado sai da folha (S14). Para ele, não há lista "ver quitados" nesta versão.
3. **Registrar empréstimo (T2) é uma janela larga**, na ordem em que a pessoa pensa: de quem, quanto entrou e quando, e como vai devolver.
   - "De quem" e "Como vai devolver" são cartões de opção com ícone, mais rápidos de ler que uma lista.
   - Os três textos de ajuda (sócio, retirada e aporte) ficam em "Empréstimo, retirada ou aporte? Veja a diferença". O bloco vem aberto na janela vazia e fechado depois, para a janela não pesar.
   - O valor do contrato fica em "Mais detalhes" (S3).
   - A ajuda de "Já pagou alguma parcela antes?" traz o aviso das parcelas já lançadas à mão (S15).
   - **A prévia** diz o que vai nascer em A pagar ("14 parcelas de R$ 1.250,00 · de 10/12/2026 a 10/01/2028"), o custo do empréstimo num número só (com a explicação de uma linha) e, se houver valor do contrato, o IOF e as tarifas.
   - A lista das parcelas abre com o valor de cada uma editável (S2). A ajuda dá os exemplos (tarifa na primeira, carência, SAC), sem falar em juros por parcela.
   - **Anterior ao T3jus (B1 e C6):**
     - o aviso informativo aparece logo abaixo do dia em que o dinheiro entrou;
     - a pergunta sobre as parcelas anteriores vem como três opções. A recomendada já vem marcada (28 pagas, nenhuma vencida), e há a que deixa uma em aberto e a que deixa corrigir os números;
     - a prévia mostra o pago antes do T3jus como estimado;
     - a faixa do pé troca para "Fica fora do saldo".
   - O texto do aviso usa o caso do escritório do elenco, que tem saldo de abertura: "o dinheiro já está nele, ou já foi gasto". Sem saldo de abertura, o texto do plano é o mesmo, sem a data.
   - **Sem parcelas fixas:** a prévia diz que nenhuma parcela nasce, que cada devolução se registra na ficha e que o falta devolver começa no valor que entrou, sem juros.
   - **Erros e falha** seguem o padrão aprovado: resumo no topo, erro no lugar da ajuda, foco no primeiro campo com erro e o botão nunca desabilitado. Na falha, nada se perde e há o código para o suporte.
   - **Registrado:** o aviso "As 14 parcelas já estão em A pagar". O empréstimo novo entra no alto da folha, com o selo "Novo".
4. **A ficha do empréstimo (T3) é uma página**, `/financeiro/caixa/emprestimos/:id`, e não uma janela lateral:
   - as parcelas precisam de uma tabela larga;
   - o "Marcar paga" abre a mesma janela de A pagar, e janela sobre janela confunde;
   - a ficha de contrato aprovada já é página.

   O que a ficha mostra:
   - **Cabeçalho:** no vinho, de quem, para que, o modo e os selos (Ativo, Anterior ao T3jus, Encerrado, Lançado errado). À direita, numa folha clara (sem âmbar), o falta pagar e a próxima ação ("Marcar a 19/40 como paga" ou "Registrar devolução").
   - **Os quatro números:** total das parcelas, custo do empréstimo, já pago (antes do T3jus, estimado, e no T3jus) e falta pagar.
   - **As parcelas pagas antes do T3jus** viram uma linha só ("1 a 16"), com o valor estimado.
   - **A parcela paga sem comprovante** mostra "Sem comprovante" e "Anexar", porque o contador vai cobrar isso na aba Empréstimos (S6).
   - **A nota de "Falta pagar"** explica que o número inclui os juros futuros e que, para quitar hoje, vale o saldo devedor do extrato do banco (S4). É a única vez que "saldo devedor" aparece, e é para dizer o que ele não é.
   - **Ao lado:** os dados do empréstimo (com "No saldo do Caixa: sim ou não, e por quê") e o histórico, com "Nada se apaga".
   - **O pé mostra só a saída certa.** "Encerrar as parcelas que faltam" aparece quando há algo pago; "Lançado errado", quando não há nada pago. Os dois botões usam o estilo de perigo aprovado. No modo sem parcelas, é "Encerrar o empréstimo" (dá por quitado).
   - **As janelas de encerrar e de lançado errado** são `alertdialog`. Elas dizem, com valores, o que sai e o que fica e pedem o motivo (de 5 a 300 caracteres, com contador). A de encerrar lembra os três usos: quitar antes, renegociar e erro descoberto depois de pagar.
   - **Encerrado e cancelado** ficam só para leitura: o motivo no alto, as parcelas "Cancelada" com o valor riscado, o falta pagar zerado e a linha nova no histórico.
   - **A devolução acima do que falta** é aceita com o aviso do plano: "o que passar de R$ 5.500,00 fica como juros pagos à sócia".
5. **A pagar (T4).**
   - A parcela entra na lista como qualquer conta, com a categoria Empréstimos e, na coluna Origem, o selo "Empréstimo · 19/40", que é um link para a ficha. Na coluna da nota, ela diz "Não tem nota fiscal", para ninguém procurar uma.
   - Nas saídas por categoria, "Empréstimos (à parte)" fica abaixo de um divisor tracejado, com a barra em listras areia e vinho, **fora do total**. A nota do pé passou a dizer isso.
   - Em "Lançar conta", a categoria Empréstimos sai da lista e a ajuda leva a registrar o empréstimo no Caixa.
6. **Exportar (T5).** A janela aprovada ganha só uma linha, sem campo novo (S13): "Empréstimos numa aba à parte · 1 recebido (R$ 30.000,00) e 2 pagamentos (R$ 3.090,00): 1 parcela e 1 devolução, 1 sem comprovante". O saldo do começo e do fim do mês passa a contar os empréstimos.
7. **O Resumo, o Início e os relatórios do sócio não mudam**, como o plano recomenda. Por isso, não há tela deles aqui.
8. **Quem vê e quem mexe:** qualquer pessoa com a área Financeiro vê, registra, devolve, encerra e marca como lançado errado. Não desenhei um estado "sem editar" (S14 e C1). Quem não tem a área não vê o Financeiro, como já aprovado (`fi-sem-area`).
9. **Celular:**
   - a folha vira lista com o valor embaixo do nome;
   - a tabela mês a mês e as parcelas viram cartões, com a linha "Empréstimos" em cada mês;
   - as janelas sobem de baixo, com os cartões de opção um embaixo do outro e os botões ocupando a largura.

## Acessibilidade (WCAG 2.2 AA)

- **Conferência automática** nos 42 casos (21 estados, no computador e no celular), em `_conferencia.json`:
  - o axe (WCAG 2.0, 2.1 e 2.2, A e AA, com contraste de cor) não achou nenhuma violação;
  - nenhuma tela tem rolagem lateral, nem na página nem dentro das janelas;
  - não houve nenhum erro de script.
- **Alvos:** todos têm 44 px ou mais, e os botões compactos das tabelas no computador têm 36 px, como no aprovado. A única exceção é a palavra-marca "T3jus" da moldura aprovada (24 px), igual às outras áreas.
- **Contraste:** só entram pares do Gabinete.
  - Vinho sobre sal-2: 9,06:1. Vinho-2 (#87335B) sobre sal-2: cerca de 6,7:1. Texto secundário #6E5562 sobre papel e sal-2: 5,5:1 ou mais.
  - Sobre o vinho, a linha nova do saldo usa âmbar-3 (7,15:1) e papel, como a linha aprovada do saldo de abertura.
  - Nenhum texto em âmbar.
- **Cor:** nada depende só da cor.
  - "À parte" tem rótulo escrito e ícone;
  - o sinal + ou − vem escrito;
  - "Cancelada" tem selo além do valor riscado;
  - a barra em listras tem o valor e o rótulo ao lado.
- **Formulários:**
  - os grupos de opção ficam em `fieldset` com `legend`;
  - o erro fica ligado por `aria-describedby`, com `aria-invalid`;
  - os valores usam `inputmode="decimal"`;
  - cada valor de parcela da lista tem rótulo próprio ("Valor da parcela 3, que vence em 10/02/2027");
  - "Veja a diferença", "Mais detalhes" e a lista das parcelas são `details`/`summary`, com alvo de 44 px.
- **Janelas:** são `<dialog>`, e o Esc fecha. O foco vai para o primeiro campo, para o campo com erro, para a opção recomendada (C6) ou para "Tentar de novo" (na falha). Encerrar e lançado errado são `alertdialog`.

## O que o desenho pede ao servidor, além do plano

Nada novo. Todos os números vêm de `emprestimo_situacao_em`, `portal_financeiro_caixa.emprestimos` e `conta_linha.emprestimo`. Há dois detalhes de texto:

- a linha do saldo ("Inclui R$ X de empréstimos") precisa do líquido acumulado dos empréstimos que entram no caixa até hoje (`emprestimos_entrou` − `emprestimo_parcelas_pagas`);
- o "Registrado por" e o "No saldo do Caixa" da ficha vêm de `autor_id`, `criado_em` e `no_caixa`, que já estão na tabela.

## Perguntas para a Carol

As cinco perguntas do plano (§8) estão desenhadas conforme a recomendação. Se ela não disser nada, valem assim:

1. **Juros:** o custo do empréstimo num número só, com o valor do contrato opcional, basta? *Desenhado assim.*
2. **Sem parcelas fixas** (sócio "devolve quando der", com "Registrar devolução") entra já? *Desenhado assim.*
3. **Quem vê:** quem tem a área Financeiro e não é sócio vê o empréstimo do sócio? *Desenhado: vê tudo, como hoje.*
4. **Quem encerra e cancela:** qualquer pessoa com a área, com motivo e histórico? *Desenhado assim.*
5. **Resumo:** fica sem nenhuma menção a empréstimo? *Desenhado assim.*

E três perguntas novas, só de desenho:

6. **Onde fica a folha "Empréstimos" no Caixa:** na coluna principal, abaixo da previsão (como está), ou na coluna da direita, junto de "RPVs a caminho"? **Recomendo a coluna principal**, porque ela é larga o bastante para o falta pagar e a próxima parcela ficarem na mesma linha.
7. **A tabela mês a mês com 5 colunas** (realizado em cima e previsto embaixo, na mesma célula), no lugar das 6 colunas da tabela aprovada, para caber a coluna dos empréstimos sem rolagem lateral. Pode? **Recomendo que sim.** A outra saída seria rolar a tabela para o lado no computador.
8. **"Falta pagar" do sócio:** o total da folha soma o "falta devolver" do sócio com o "falta pagar" dos bancos (R$ 84.830,00). Prefere separar os dois? **Recomendo somar**, porque o total responde quanto o escritório ainda deve e cada linha diz de quem é.
