# Plano de execução · F3.51 · Categoria Empréstimos nas entradas e saídas (FI-20)

Plano escrito em 23/11/2026 a partir da `main` (último merge: PR #138; a migration mais nova é a 0870). **Versão 3**: já incorpora a revisão em `emprestimos/revisao.md` (B1, B2, C1 a C9 e as sugestões) e a segunda leitura dela (N1 e S-N1 a S-N4). O que mudou em cada ponto está na seção 9. Nada foi programado nem commitado. As migrations usam somente a faixa **0940 a 0949**.

## 0. Ponto de partida

**Decisão da Carol, que não volta à mesa.** O empréstimo fica **à parte**, como os valores de terceiros:
- o dinheiro emprestado, de banco ou de sócio, **entra no saldo do Caixa** do escritório;
- ele **não conta** como receita nem como faturamento: fica fora do Resumo, dos relatórios do sócio e do Início;
- as parcelas pagas **saem do caixa** com a categoria Empréstimos, separadas das despesas do dia a dia;
- na exportação para o contador, as parcelas vão numa **linha e numa aba próprias**.

**O que existe hoje (conferido no código e confirmado pela revisão):**

| Peça | Onde | O que importa para empréstimos |
|---|---|---|
| Entradas | `pagamentos_recebidos` (0220). Só parcela de cliente, caixa `ESCRITORIO` ou `TERCEIROS` | Não existe entrada sem cliente. O empréstimo precisa de tabela própria. |
| Categorias de saída | `categoria_saida_valida(p)` (0230, l. 13), `immutable`. É usada no CHECK de `contas_recorrentes.categoria` (l. 24) e de `contas_pagar.categoria` (l. 40), e na validação de `portal_financeiro_conta_lancar` (versão atual em 0511, l. 91) | É preciso acrescentar `EMPRESTIMOS`. A conta solta e a recorrente não podem usar essa categoria. |
| Espelho no domínio | `CATEGORIAS_SAIDA` em `packages/domain/src/financeiro.ts:254`. O teste Deno `FI-20, FI-07` em `supabase/functions/api-portal/app_test.ts:1640` compara com a lista lida **do arquivo 0230**, **na ordem** | O teste passa a ler a definição da 0940. A ordem do domínio tem de ser a mesma do SQL. |
| Receita do mês | `caixa_entradas` (0290, redefinida em 0650 l. 14) | O Resumo a usa como "recebido" e como "realizado" contra a meta (0558). **Ela não pode incluir empréstimo.** |
| Saídas do caixa | `caixa_saidas` (0290 l. 61): `contas_pagar.valor_pago` por `paga_em` | A parcela paga, que é uma `contas_pagar`, já sai do saldo sem mudança nenhuma. Só a exibição precisa separar. |
| Saldo | `portal_financeiro_caixa`, em camadas: 0290 → 0555 → 0556 → 0557. Também `ajuste_abertura` e `saldo_escritorio_em` (0556, l. 69 e 79). Nos Ajustes: `saldoHoje` e `primeiroLancamento` (0556, l. 123 a 127) | O saldo precisa somar os empréstimos que contam. O ajuste da abertura desconta os empréstimos até a data dela. |
| Previsão | `saidas_previstas` (0534 l. 122): as `contas_pagar` não canceladas que vencem no mês | Parcelas que nascem já lançadas entram sozinhas na previsão. |
| A pagar | `portal_financeiro_pagar` (0534 l. 155). O total do bloco `categorias` é somado **na tela** (`FinanceiroPagar.tsx` l. 135 e 136) | Basta a tela separar a linha `EMPRESTIMOS`. |
| Despesas fixas | `despesas_fixas_mes` (0534 l. 219): só `contas_pagar` com `mes` (as recorrentes) | Parcela de empréstimo não tem `mes`. Fica fora sem mudança nenhuma. |
| Contador | Prévia: 0290 → 0650. Exportação: 0290 → 0556 → 0650. Arquivo: `packages/ui/src/portal/planilha.ts` (`abasContador` calcula "Despesas pagas" e "Resultado do mês" a partir de `d.despesas`). Tipo: `DadosExportacao` (`financeiro.ts:943`). Meses que se podem exportar: `mesesExportar` (0290 l. 292) | Hoje as parcelas cairiam em Despesas. |
| Notas faltando | `portal_financeiro_exportacao_anexos` (0520, `semNota`) | Parcela de banco não tem nota fiscal. |
| Relatórios do sócio, Início, importação | 0410 (`relatorio_entradas`, `relatorio_adiantadas`), 0400 (`portal_inicio_financeiro`), 0820 | **Nada muda.** Só testes de regressão. |
| Permissões | `financeiro.ver` e `financeiro.editar`, as duas para `SOCIO` e para `EQUIPE` (0220 l. 13). Nenhum papel tem uma sem a outra | O corte real é **ter a área Financeiro** (`entrar_area`, `AREA_NAO_LIBERADA`). |

## 1. Recomendações

### 1.1 Registro do empréstimo recebido
Uma janela curta, **"Registrar empréstimo"**:

| Campo | Regra |
|---|---|
| **De quem** | `BANCO` (banco ou financeira), `SOCIO` (sócio do escritório) ou `OUTRO` (outra pessoa ou empresa) |
| **Nome** | De 2 a 120 caracteres |
| **Valor que entrou na conta** | O líquido, já sem IOF e tarifas |
| **Dia em que entrou** | Não pode ser no futuro |
| **Forma** | `forma_pagamento_valida`. A tela oferece Transferência, Pix e Dinheiro |
| **Para que** | Opcional, até 120 caracteres |
| **Valor do contrato** | Opcional, recolhido em "mais detalhes": o valor antes do IOF e das tarifas (S3) |
| **Como vai devolver** | `PARCELAS` ou `LIVRE` |

O empréstimo é sempre do caixa **do escritório**, nunca de terceiros.

**Textos de ajuda na janela (S5):**
- "Empréstimo no seu CPF que você pôs no escritório: escolha **Sócio**."
- "Parcela de um empréstimo seu, pago pelo escritório, sem o dinheiro ter entrado nele: é **Retirada**, não empréstimo."
- "Dinheiro seu que não vai voltar: é aporte de capital. Fale com o contador."
- "Já lançou parcelas deste empréstimo em A pagar? Conte-as em 'já pagou antes' e cancele lá as que estão em aberto." (S15)

### 1.2 Empréstimo anterior ao T3jus (B1, decidido)
**Decisão:** quando o empréstimo é registrado, o servidor grava se ele **entra no caixa** (`no_caixa`). Ele fica **fora do caixa**, marcado como "anterior ao T3jus", quando:
- há saldo de abertura e o dia em que entrou é **igual ou anterior** à data da abertura (o dinheiro já está nela); ou
- **não há saldo de abertura** e o dia em que entrou é anterior ao começo do caixa no T3jus: o menor dia entre o primeiro lançamento do escritório (a mesma conta do `primeiroLancamento` dos Ajustes, 0556 l. 123: recebimentos, contas pagas e honorários transferidos) e o dia em que o escritório foi cadastrado (`escritorios.criado_em`).

O empréstimo anterior ao T3jus **não soma no saldo** e não aparece em "Empréstimos recebidos" do mês. Valem só as parcelas que faltam, que saem do caixa quando forem pagas. A ficha e a janela dizem isso com todas as letras: "Entrou antes do T3jus: não soma no saldo. As parcelas que faltam entram em A pagar."

**Por que esta opção (a da revisão) e não recusar (b):**
- é o mesmo raciocínio do "pago antes do T3jus" da 0820;
- não obriga a advogada a ir aos Ajustes antes de cadastrar o Pronampe de 2024, que é o caso mais comum na implantação;
- o saldo nunca pula pelo valor de um dinheiro que já foi gasto fora do T3jus.

**Regra de leitura: com saldo de abertura, quem decide é a abertura (N1, opção a).** O `no_caixa` gravado no registro vale só enquanto o escritório não tem saldo de abertura. Um empréstimo **conta no caixa** quando:

> `cancelado_em is null` e (`no_caixa` **ou** existe abertura atual e `recebido_em > a.data`)

Esse predicado fica numa peça só, `emprestimo_conta_no_caixa(e)`, usada em três lugares: `emprestimos_entrou`, `ajuste_abertura` e o selo "anterior ao T3jus".

As contas fecham em qualquer ordem:
- o empréstimo até a data da abertura é absorvido por ela, conte ou não;
- se a abertura for criada ou corrigida depois com uma data **anterior** ao empréstimo, ele passa a contar, como deve.

**Limite que fica, sem abertura:** se alguém registrar depois um lançamento mais antigo que um empréstimo marcado "fora", o empréstimo continua fora. O selo não muda sozinho, para que a ficha não troque de aspecto por causa de outro lançamento. Para corrigir, basta cadastrar o saldo de abertura, e daí em diante quem decide é ela. A ficha do empréstimo "anterior ao T3jus" lembra isso: "Cadastre o saldo de abertura em Ajustes para o caixa começar do dia certo."

**De onde sai o começo do caixa (S-N1):**
- `emprestimo_comeco_caixa` lê as tabelas da base, como a 0556 faz nas l. 123 a 126: `pagamentos_recebidos`, as `contas_pagar` pagas **fora da categoria Empréstimos** e as `destinacoes` do escritório;
- ela **não** usa o `primeiroLancamento` que a 0941 passa a calcular com os empréstimos, para não depender do próprio resultado;
- o cadastro entra como `(escritorios.criado_em at time zone 'America/Sao_Paulo')::date`.

**Aviso a mais na janela T2 (S-N1):** o aviso "entrou antes do T3jus?" aparece também quando o dia em que o dinheiro entrou é anterior ao primeiro lançamento, mesmo que seja posterior ao cadastro do escritório. É o caso do escritório cadastrado no Console meses antes de começar a usar o sistema. O aviso sugere cadastrar o saldo de abertura.

**Isto é decisão técnica, não da Carol.** Segue a regra que ela já aprovou para o financeiro do Astrea.

### 1.3 As parcelas: nascem todas no registro
**Em parcelas** (o padrão, e o caso do banco):
- a janela pede o número total de parcelas (de 1 a 120), o valor da parcela, "Já pagou alguma parcela antes?" (quantas, `parcelas_antes`) e o **"Vencimento da próxima parcela a pagar"** (C6);
- nascem como `contas_pagar` só as parcelas de `parcelas_antes + 1` até o total. Cada uma tem `categoria = 'EMPRESTIMOS'`, `emprestimo_id` e `emprestimo_parcela`. A descrição sai pronta: "Empréstimo Banco do Brasil · parcela 11/24". O fornecedor é o nome do credor;
- o vencimento segue `vencimento_no_mes` (0230 l. 112), no mesmo dia de cada mês ou no último dia de um mês mais curto.

**Regras do vencimento (C6):**
- o vencimento não pode ser anterior ao dia em que o dinheiro entrou;
- a última parcela vai no máximo até hoje + 3650 dias, a mesma regra de `conta_lancar` (0511 l. 93);
- se a próxima parcela cair mais de 1 mês antes de hoje, a janela avisa: "As parcelas até mm/aaaa já foram pagas?". Ela sugere o `parcelas_antes` que deixa só uma parcela vencida, ou nenhuma. A pessoa confirma.

**Valor por parcela (S2):** a prévia lista as parcelas com o valor sugerido. Cada valor pode ser trocado **antes de gravar**, o que cobre a tabela SAC, a carência só de juros e a primeira parcela com IOF. O servidor recebe `parcelas: [{ n, valor }]` opcional e confere que os números batem com o total e com o que já foi pago antes. `parcela_valor` fica como o valor sugerido. Isto não é montar tabela Price ou SAC: o T3jus não calcula juros.

**Pagamento:** usa o que já existe, o "Marcar paga" de A pagar (`portal_financeiro_conta_paga`), com o valor que saiu.

**Sem parcelas fixas** (`LIVRE`, o caso comum do sócio):
- nenhuma parcela nasce;
- a ficha ganha "Registrar devolução" (valor, dia e forma), que cria uma `contas_pagar` da categoria **já paga**, com `vencimento = paga_em` = o dia (S7);
- o dia da devolução não pode ser anterior ao dia em que o dinheiro entrou nem estar no futuro;
- devolução acima do "falta devolver" é aceita com o aviso "o que passar de R$ X fica como juros pagos ao sócio".

**Proteções:**
- `EMPRESTIMOS` não aparece em "Lançar conta" (incluindo "Repete todo mês") e é recusada no servidor;
- os CHECKs garantem que toda conta da categoria tem empréstimo, e o contrário.

**Por que não usar recorrência:** o empréstimo tem fim e número de parcelas conhecidos. A recorrência (0534) não tem fim previsto e nasce mês a mês. Lançadas de uma vez, as parcelas aparecem logo em A pagar, na previsão e no "falta pagar", sem rotina nenhuma.

### 1.4 Juros: um número só, o custo do empréstimo (C3)
Os juros não são separados em cada parcela. O custo do empréstimo é:

> **custo** = `parcelas_antes × parcela_valor` (pago antes do T3jus, estimado) + Σ(pagas no T3jus, pelo valor pago) + Σ(em aberto e não canceladas, pelo valor) − **valor que entrou**

- quando há valor do contrato, a ficha e a aba do contador mostram também "IOF e tarifas na liberação" = valor do contrato − valor que entrou (S3);
- o "já pago" separa "antes do T3jus (estimado)" de "no T3jus";
- no modo `LIVRE`, o custo é o que foi devolvido além do valor recebido, nunca abaixo de zero.

### 1.5 Como aparece no Caixa e no Resumo (B2)
**No Caixa:**
- o saldo e o "fecha o mês" somam os empréstimos que entram no caixa (`no_caixa`). As parcelas pagas já são descontadas por `caixa_saidas`, e as que ainda vencem no mês, por `saidas_previstas`;
- a tabela mês a mês ganha a coluna **"Empréstimos"**, com previsto e realizado como as outras colunas. Ela só aparece quando o escritório tem algum empréstimo;
- as colunas Entradas e Saídas passam a ser só do dia a dia;
- a folha **"Empréstimos · à parte"** traz os empréstimos ativos, o total que falta pagar e o botão "Registrar empréstimo". O tom é neutro, sem âmbar.

**A coluna, mês a mês (especificação de B2).** Os números de cada mês são `entrou`, `parcelasPrevistas`, `parcelasRealizadas`, `liquidoPrevisto` e `liquidoRealizado`:

| Mês | `entrou` | `parcelasRealizadas` (sai de `saidasRealizadas`) | `parcelasPrevistas` (sai de `saidasPrevistas`) |
|---|---|---|---|
| Passado | `emprestimos_entrou(m, fm)` | `emprestimo_parcelas_pagas(m, fm)`, por `paga_em` | `emprestimo_parcelas_previstas(m, false)`, por vencimento, pagas ou não |
| Corrente | `emprestimos_entrou(mes, hoje)` | `emprestimo_parcelas_pagas(mes, hoje)` | `emprestimo_parcelas_pagas(mes, hoje) + emprestimo_parcelas_previstas(mes, true)` |
| Futuro | 0 | `null` | `emprestimo_parcelas_previstas(m, true)` |

As fórmulas:
- `liquidoRealizado = entrou − parcelasRealizadas` (é `null` nos meses futuros);
- `liquidoPrevisto = entrou − parcelasPrevistas`, com `entrou` igual a zero nos meses futuros;
- `emprestimo_parcelas_previstas` usa o mesmo critério de `saidas_previstas` (0534 l. 128): `cancelada_em is null` e, com `so_falta`, `paga_em is null`.

A parcela de outubro paga em novembro fica na previsão de outubro e no realizado de novembro, como qualquer conta. No realizado, a linha fecha: saldo do mês anterior + entradas − saídas + líquido realizado = saldo do mês. Isso vale quando não há saldo de abertura nem RPV a caminho no mês, porque os dois também mexem no saldo, e é assim que o teste é montado.

**No Resumo: nenhum número muda.** Recebido, meta, recebido por tipo e cobertura das fixas continuam como estão.

**Em A pagar (S1, sem invólucro):**
- a parcela aparece na lista com o selo "Empréstimo · 3/24". O selo vem de `conta_linha`, que recebe `create or replace` (versão 0534 l. 134) e ganha `emprestimo: { id, parcela, total, credor }`;
- no bloco "Saídas do mês por categoria", a **tela** põe a linha `EMPRESTIMOS` abaixo de um divisor, fora do total. O servidor continua mandando a categoria como as outras.

### 1.6 O que vai ao contador (C4, C5, S4, S6)
**Aba Resumo:**
- "Recebimentos do escritório", "Despesas pagas" e "Resultado do mês" ficam sem empréstimo. O servidor tira as parcelas de `despesas`, então a planilha já faz a conta certa;
- entram duas linhas: "Empréstimos recebidos (não é receita)" e "Parcelas de empréstimo pagas (principal e juros)";
- a nota (C5) diz: "O resultado não inclui os juros e encargos dos empréstimos. As parcelas estão na aba Empréstimos, com o custo total de cada um.";
- a conta tem de fechar: saldo do começo + recebimentos − despesas + empréstimos recebidos − parcelas = saldo do fim.

**Aba Empréstimos**, em três blocos:
1. **Recebidos no mês** (só os que entram no caixa): dia, de quem (tipo e nome), para que, forma, valor que entrou e valor do contrato, se houver.
2. **Parcelas e devoluções pagas no mês:** pago em, vencimento, empréstimo, parcela n/N, forma, valor e **comprovante** ("anexado" ou "falta"), lido de `anexos.conta_id` (S6).
3. **Situação no último dia do mês exportado (C4):** cada empréstimo recebido até `fm`, não cancelado e com parcela em aberto em `fm`, ou encerrado depois de `fm`. Traz valor que entrou, valor do contrato, total das parcelas, custo, já pago até `fm` (antes do T3jus e no T3jus), falta pagar em `fm`, e se é anterior ao T3jus. No pé, a nota (S4): "Falta pagar inclui os juros das parcelas futuras; o saldo devedor para quitar é o do extrato do banco." Esse bloco sai de `emprestimo_situacao_em(e, fm)`, a mesma função que a ficha usa com `hoje`.

A aba aparece quando há empréstimo recebido ou parcela paga no mês, ou algum empréstimo ativo em `fm`.

**Arquivo .csv:** duas seções novas, "Empréstimo recebido (não é receita)" e "Parcela de empréstimo".

**A prévia da exportação** diz quantos empréstimos entraram e quantas parcelas foram pagas no mês, e quantas parcelas estão sem comprovante.

**Sem nota:** a parcela não entra em `semNota`. A falta do comprovante aparece só na aba Empréstimos.

### 1.7 "Falta pagar", e não saldo devedor
- **Em parcelas:** a soma das parcelas em aberto e não canceladas, com quantas são e o mês em que termina.
- **Sem parcelas fixas:** "falta devolver" = valor que entrou − devolvido, nunca abaixo de zero, com a nota "sem juros".
- O nome "saldo devedor" fica para o número do banco, que tira os juros futuros.

### 1.8 Permissões (C1)
- **Ver:** `entrar_area(..., 'FINANCEIRO')` + `financeiro.ver`.
- **Registrar, devolver, encerrar e cancelar:** `entrar_area` + `financeiro.editar`.
- Hoje toda pessoa com a área Financeiro tem as duas ações. O corte que existe na prática é ter a área ou não, e é isso que se testa (`AREA_NAO_LIBERADA`).
- As funções checam `.editar` mesmo assim, para quando surgir um papel só de leitura.
- O escritório vem sempre da sessão.

### 1.9 Corrigir, quitar antes ou renegociar (C2)
Nada se apaga. Há duas ações, as duas com motivo de 5 a 300 caracteres e registro no histórico:

| Ação | Quando vale | O que faz |
|---|---|---|
| **"Lançado errado"** (`cancelar`) | Só sem nenhuma parcela ou devolução paga. Com algo pago, recusa com `EMPRESTIMO_COM_PAGAMENTO` | O empréstimo sai do caixa, da folha e da exportação. As parcelas em aberto ficam canceladas pelas colunas `cancelada_*` (0534) |
| **"Encerrar as parcelas que faltam"** (`encerrar`) | Com alguma parcela ou devolução paga no T3jus, **ou** com `parcelas_antes > 0`, **ou** com o empréstimo anterior ao T3jus (S-N3) | Cancela as parcelas não pagas e marca o empréstimo como encerrado. O que entrou e o que foi pago continuam no caixa e na exportação |

O "Encerrar" cobre três casos:
- **quitação antecipada:** paga-se uma parcela com o valor que o banco cobrou e encerra-se o resto;
- **renegociação:** encerra-se o antigo e registra-se o novo;
- **erro de digitação** descoberto depois do primeiro pagamento: encerra-se e registra-se de novo, com "já pagou antes".

No modo `LIVRE`, "Encerrar" dá o empréstimo por quitado. Se ainda faltar devolver, a ficha e a situação na aba do contador mostram **"encerrado com R$ X não devolvido"**, e a janela avisa: "Para o contador, o que não foi devolvido pode ser perdão da dívida ou aporte. Fale com ele." O mesmo vale para o modo com parcelas encerrado com parcelas canceladas: a aba mostra "encerrado com N parcelas canceladas (R$ X)" (S-N3).

Os registros vão ao histórico como `financeiro.emprestimo_registrado`, `_devolucao`, `_encerrado` e `_cancelado`, com o id, o `credor_tipo`, o valor e as parcelas, **sem o nome do credor** (S10).

## 2. (a) Servidor e domínio

**Antes de escrever a 0940 (S12):** confira na `main` que nenhuma migration nova, da 0871 à 0939, redefiniu ou envolveu estas funções: `caixa_entradas`, `caixa_saidas`, `ajuste_abertura`, `saldo_escritorio_em`, `categoria_saida_valida`, `conta_linha`, `portal_financeiro_caixa`, `portal_financeiro_ajustes`, `portal_financeiro_exportar`, `portal_financeiro_exportacao_previa`, `portal_financeiro_exportacao_anexos` e `portal_financeiro_conta_lancar`. Confira também que o pgTAP 125 continua livre. Hoje está tudo livre.

### 2.1 Migration `0940_emprestimos.sql` (tabela, regras e API)

1. **Categoria e recorrentes:**
   - `create or replace function categoria_saida_valida(p text)` com `'EMPRESTIMOS'` **no fim** da lista. O `CATEGORIAS_SAIDA` do domínio ganha a chave no mesmo lugar;
   - `alter table contas_recorrentes add constraint contas_recorrentes_sem_emprestimo check (categoria <> 'EMPRESTIMOS')`.

2. **Tabela `emprestimos`:**
   ```
   id uuid pk, escritorio_id uuid not null references escritorios on delete restrict,
   credor_tipo text not null check (credor_tipo in ('BANCO','SOCIO','OUTRO')),
   credor_nome text not null check (length(btrim(credor_nome)) between 2 and 120),
   finalidade text check (length(btrim(finalidade)) between 3 and 120),
   valor bigint not null check (valor between 1 and 10000000000),
   valor_contrato bigint check (valor_contrato between 1 and 10000000000),
   recebido_em date not null, forma text check (forma is null or forma_pagamento_valida(forma)),
   no_caixa boolean not null,
   devolucao text not null check (devolucao in ('PARCELAS','LIVRE')),
   parcelas_total integer check (parcelas_total between 1 and 120),
   parcelas_antes integer not null default 0 check (parcelas_antes >= 0),
   parcela_valor bigint check (parcela_valor between 1 and 10000000000),
   encerrado_em timestamptz, encerrado_por uuid references pessoas, encerrado_motivo text check (length(btrim(encerrado_motivo)) between 5 and 300),
   cancelado_em timestamptz, cancelado_por uuid references pessoas, cancelado_motivo text check (length(btrim(cancelado_motivo)) between 5 and 300),
   autor_id uuid not null references pessoas, criado_em timestamptz not null default app_now(),
   unique (escritorio_id, id),
   check ((devolucao = 'PARCELAS') = (parcelas_total is not null) and (parcelas_total is null) = (parcela_valor is null)),
   check (devolucao = 'PARCELAS' and parcelas_antes < parcelas_total or devolucao = 'LIVRE' and parcelas_antes = 0),
   check ((cancelado_em is null) = (cancelado_por is null) and (cancelado_em is null) = (cancelado_motivo is null)),
   check ((encerrado_em is null) = (encerrado_por is null) and (encerrado_em is null) = (encerrado_motivo is null)),
   check (cancelado_em is null or encerrado_em is null)
   ```
   Depois, `call proteger_tabela_escritorio('emprestimos')`. A tabela não tem `versao` nem `estado`.

3. **Guardião `emprestimos_guardiao`** (no molde de 0556 l. 39): recusa DELETE e só deixa preencher, uma vez, ou as colunas `cancelado_*` ou as `encerrado_*`. O fim da guarda desliga os gatilhos de usuário (0540), então o guardião não atrapalha o apagamento.

4. **`contas_pagar`:**
   - colunas `emprestimo_id uuid` e `emprestimo_parcela integer`;
   - `foreign key (escritorio_id, emprestimo_id) references emprestimos (escritorio_id, id)` (S8);
   - `check ((categoria = 'EMPRESTIMOS') = (emprestimo_id is not null))` e `check (emprestimo_parcela is null or emprestimo_id is not null)`;
   - índice `unique (emprestimo_id, emprestimo_parcela)` e índice `contas_pagar_emprestimo`.

5. **Inventário:** `emprestimos`, `dado_pessoal = true` (o nome pode ser de uma pessoa física), com finalidade, base legal (art. 7º, V) e controlador "Escritório". O texto de prazo e de fim é o mesmo de `exportacoes_contador`, em `APROVADO`, com `exportar = true`. O comentário da migration diz que é o texto já aprovado para as tabelas do financeiro (precedentes: 0556, 0557, 0621) (S11).

6. **Peças** (`sql stable`):
   - `emprestimo_comeco_caixa(p_escritorio)`: o dia a partir do qual um empréstimo entra no caixa, lido das tabelas da base (§1.2, S-N1). Com abertura, é a data dela + 1. Sem abertura, é `least(primeiro lançamento da base, criado_em em Brasília)`;
   - `emprestimo_conta_no_caixa(e)`: o predicado do §1.2 (N1);
   - `emprestimos_entrou(p_escritorio, p_de, p_ate)`: soma `valor` dos empréstimos em que `emprestimo_conta_no_caixa` é verdadeiro, por `recebido_em`;
   - `emprestimo_parcelas_pagas(p_escritorio, p_de, p_ate)` e `emprestimo_parcelas_previstas(p_escritorio, p_mes, p_so_falta)`, conforme §1.5;
   - `emprestimo_situacao_em(e emprestimos, p_dia date)`: jsonb com já pago (antes do T3jus e no T3jus), falta pagar, parcelas em aberto, próxima parcela, termina em, custo, falta devolver e situação (`ATIVO`, `QUITADO`, `ENCERRADO` ou `CANCELADO`) naquele dia;
   - `emprestimo_linha(e)` = dados do empréstimo + `emprestimo_situacao_em(e, hoje)`.

7. **Saldo com empréstimos:** fica na **0941**, junto com o invólucro do Caixa (S-N2). Ver §2.2, item 0.

8. **Funções da API** (`security definer`, começando por `entrar_area` + `entrar_escritorio`):
   - `portal_financeiro_emprestimo_registrar` (`.editar`):
     - valida os campos com `recusar_campos` (nomes de campo iguais aos da tela);
     - calcula `no_caixa` com `recebido_em >= emprestimo_comeco_caixa(...)`;
     - insere as parcelas que faltam, com os valores de `parcelas[]` quando vierem, e aplica as regras de vencimento do §1.3;
     - registra no histórico e devolve `emprestimo_linha`;
   - `portal_financeiro_emprestimo` (`.ver`): a ficha, com as parcelas e a situação de cada uma, as devoluções, o comprovante de cada conta e o histórico;
   - `portal_financeiro_emprestimo_devolucao` (`.editar`): só `LIVRE`, não cancelado e não encerrado. Aplica as regras de data do §1.3;
   - `portal_financeiro_emprestimo_encerrar` (`.editar`): pede motivo. Recusa `JA_ENCERRADO`, `JA_CANCELADO` e `SEM_PAGAMENTO`. `SEM_PAGAMENTO` só vale quando não há nada pago no T3jus, `parcelas_antes = 0` e o empréstimo conta no caixa; nesse caso o certo é "lançado errado" (S-N3);
   - `portal_financeiro_emprestimo_cancelar` (`.editar`): pede motivo. Recusa `EMPRESTIMO_COM_PAGAMENTO` e `JA_CANCELADO`;
   - id de outro escritório: `TC404` em todas.

9. **Lançar conta:**
   - `alter function portal_financeiro_conta_lancar ... rename to financeiro_conta_lancar_sem_emprestimo` e um invólucro novo;
   - o invólucro chama **primeiro** `entrar_area` e `entrar_escritorio(..., 'financeiro.editar')` (S9);
   - depois recusa `categoria = 'EMPRESTIMOS'` com `recusar_campos('Parcela de empréstimo nasce do empréstimo, no Caixa', 'categoria')` e só então chama a base.

10. **`conta_linha`:** `create or replace` com `emprestimo`, como no §1.5. `portal_financeiro_pagar` não muda (S1).

11. Termina com `call fechar_acesso();`.

### 2.2 Migration `0941_emprestimos_caixa_contador.sql` (invólucros)

0. **Saldo com empréstimos (S-N2: na mesma migration do Caixa).** Se a publicação aplicar uma migration sem a outra, o saldo do Caixa e o dos Ajustes ficam diferentes. Por isso:
   - `create or replace function saldo_escritorio_em`: + `emprestimos_entrou(p_escritorio, '-infinity', p_dia)`;
   - `create or replace function ajuste_abertura`: desconta também `emprestimos_entrou(p_escritorio, '-infinity', a.data)`, com o mesmo predicado (N1);
   - com isso, a exportação (`saldoInicio` e `saldoFim`) e os Ajustes (`saldoHoje`) ficam com o mesmo número do Caixa.

   Enquanto a 0941 não for aplicada, nenhum empréstimo mexe em saldo nenhum, porque os dois lados ficam sem empréstimo. O item de publicação diz que a 0940 e a 0941 se aplicam juntas.
1. **Caixa:** `portal_financeiro_caixa` → `financeiro_caixa_sem_emprestimo`. O invólucro:
   - soma `emprestimos_entrou(-inf, hoje)` a `saldo` e a `fechaMes`;
   - em cada mês, soma `emprestimos_entrou(-inf, least(fm, hoje))` ao `saldo`;
   - tira `parcelasRealizadas` e `parcelasPrevistas` das colunas de saídas e põe `emprestimos` (§1.5);
   - recalcula `mesesExportar` com o menor `recebido_em` dos empréstimos que contam no caixa (C8). A lista é montada igual à da base: do mês corrente para trás, com no máximo 13 meses, pelo `greatest(..., mes − 12 meses)` da 0290, l. 292 a 296 (S-N4);
   - devolve `emprestimos: { algum, faltaPagar, n, lista }`.
2. **Ajustes (C8):** `portal_financeiro_ajustes` → `financeiro_ajustes_sem_emprestimo` (a versão atual é a de 0558). O invólucro faz `primeiroLancamento` levar em conta o menor `recebido_em` dos empréstimos que entram no caixa. `saldoHoje` já fica certo pelo item 7 do §2.1.
3. **Prévia da exportação:** `portal_financeiro_exportacao_previa` → `financeiro_exportacao_previa_sem_emprestimo`. Tira as parcelas de `despesas` e põe `emprestimos: { recebidos: {n, valor}, parcelas: {n, valor, semComprovante} }`.
4. **Exportação:** `portal_financeiro_exportar` → `financeiro_exportar_sem_emprestimo`. Tira de `despesas` as linhas `categoria = 'EMPRESTIMOS'` (a categoria já vem em cada linha) e devolve `emprestimos: { recebidos, parcelas, situacao }`, com a situação calculada em `fm` (C4).
5. **Anexos da exportação:** `portal_financeiro_exportacao_anexos` → `financeiro_exportacao_anexos_sem_emprestimo`. Tira as parcelas de `semNota`.
6. Cada função renomeada recebe `revoke all ... from public, anon, authenticated`, como a 0534 faz. A migration termina com `fechar_acesso()`.

### 2.3 Domínio (`packages/domain/src/financeiro.ts`)
- `CATEGORIAS_SAIDA` ganha `EMPRESTIMOS: "Empréstimos"` no fim, na mesma ordem do SQL;
- `CATEGORIAS_LANCAR` é a mesma lista sem `EMPRESTIMOS`. Só `FinanceiroPagar.tsx` (l. 31 e 451) usa essa lista. `Recorrentes.tsx` só mostra a categoria e não muda (C7);
- `CREDORES_EMPRESTIMO`, `DEVOLUCAO_EMPRESTIMO` e `SITUACAO_EMPRESTIMO`;
- os schemas zod `registrarEmprestimoSchema` (com `parcelas` opcional), `devolucaoEmprestimoSchema` e `motivoEmprestimoSchema`;
- os tipos `Emprestimo`, `FichaEmprestimo` e `EmprestimosCaixa`. `MesCaixa`, `CaixaFinanceiro`, `ContaPagar` e `AjustesFinanceiro` ganham os campos novos. `DadosExportacao.emprestimos?` e `PreviaExportacao.emprestimos?` entram como opcionais;
- as funções puras `parcelasDoEmprestimo({ total, antes, valor, proximo, valores? })`, `custoEmprestimo` e `sugerirParcelasAntes`.

### 2.4 API (`supabase/functions/api-portal/app.ts`, perto da l. 1034)
| Rota | O que faz |
|---|---|
| `POST /v1/escritorio/financeiro/emprestimos` | 201 |
| `GET /v1/escritorio/financeiro/emprestimos/:id` | A ficha |
| `POST /v1/escritorio/financeiro/emprestimos/:id/devolucoes` | 201 |
| `POST /v1/escritorio/financeiro/emprestimos/:id/encerrar` | Encerra, com motivo |
| `POST /v1/escritorio/financeiro/emprestimos/:id/cancelar` | Cancela, com motivo |

A lista vem dentro de `GET /financeiro/caixa`.

### 2.5 Arquivo do contador (`packages/ui/src/portal/planilha.ts`)
O formato está no §1.6: a aba Empréstimos com os três blocos, as duas linhas e a nota no Resumo, e as seções do .csv. O arquivo vai no PR do servidor: não é tela, e o formato já foi decidido pela Carol.

### 2.6 Testes
**pgTAP `supabase/tests/pgtap/125_emprestimos_test.sql`**, com os nomes começando por `FI-20`:
1. Registro em parcelas:
   - quantas nascem e a numeração com `parcelas_antes`;
   - valores por parcela (S2);
   - dia 31 em fevereiro de ano bissexto e de ano comum;
   - vencimento anterior ao dia em que o dinheiro entrou é recusado, e a última parcela não passa de 3650 dias (C6).
2. Modo `LIVRE`, com as regras de devolução (S7).
3. `EMPRESTIMOS` recusada em "Lançar conta", com "Repete todo mês" ou sem.
4. Os CHECKs de `contas_pagar` recusam, por insert direto, a categoria sem empréstimo e o empréstimo sem a categoria. A FK composta recusa um empréstimo de outro escritório.
5. Sem a área Financeiro: `AREA_NAO_LIBERADA` nas cinco funções e no Caixa. Quem não tem a área recebe esse erro de "Lançar conta", e não erro de campo (C1, S9).
6. Isolamento: ficha, devolução, encerrar e cancelar com id de outro escritório dão `TC404`. `portal_financeiro_conta_paga` com a parcela de outro escritório também.
7. Nada se apaga:
   - o guardião;
   - cancelar com e sem pagamento;
   - encerrar sem pagamento é recusado;
   - o cancelado tira as parcelas em aberto de A pagar (totais, semana e vencidas), de `saidas_previstas` e do falta pagar;
   - o encerrado faz o mesmo, mas mantém no realizado o que entrou e o que foi pago (C2).
8. **B1:**
   - empréstimo antigo **sem abertura** não mexe no saldo;
   - com abertura, empréstimo antes da data não soma de novo e depois dela soma;
   - abertura criada depois de um empréstimo que conta, com data posterior a ele, absorve o empréstimo sem contar duas vezes;
   - empréstimo anterior ao cadastro do escritório, num escritório ainda sem lançamentos, fica fora do caixa;
   - **N1:** empréstimo registrado sem abertura e fora do caixa, e depois uma abertura criada com data anterior a ele: o empréstimo passa a contar, e o Caixa e os Ajustes mostram o mesmo saldo;
   - **N1:** abertura corrigida para uma data mais antiga que um empréstimo absorvido: o empréstimo passa a contar;
   - **S-N1:** o começo do caixa não muda com a ordem em que os empréstimos são registrados, e `criado_em` é lido no horário de Brasília.
   - **S-N3:** "Encerrar" é aceito com `parcelas_antes > 0` e no empréstimo anterior ao T3jus, e a aba do contador mostra o não devolvido;
   - **S-N4:** `mesesExportar` tem no máximo 13 meses, com ou sem empréstimo.
9. **B2:**
   - os campos de previsto e realizado nos meses passado, corrente e futuro;
   - a parcela de outubro paga em novembro;
   - a linha de cada mês fecha (sem abertura e sem RPV).
10. Ajustes e Caixa com o mesmo saldo (`saldoHoje = caixa.saldo`), com empréstimo, com e sem abertura (C9.2). `primeiroLancamento` e `mesesExportar` com o empréstimo como primeiro registro (C8).
11. Regressão:
    - o Resumo não muda (recebido, meses, porTipo, fixas e meta);
    - os relatórios não mudam (`portal_relatorio_resumo`, Entrou e Rendeu);
    - o Início não muda (`portal_inicio_financeiro`).
12. Exportação e prévia:
    - despesas sem as parcelas;
    - `emprestimos` preenchido;
    - a situação calculada em `fm`, e não hoje, ao exportar outubro em novembro (C4);
    - a conta fecha: `saldoInicio + recebimentos − despesas + recebidos − parcelas = saldoFim` (C9.1);
    - a parcela fica fora de `semNota` e entra a contagem `semComprovante`.
13. Custo com `parcelas_antes` (C3) e paridade de `vencimento_no_mes`, com os mesmos casos do Vitest (C9.8).
14. A linha no `inventario_dados` (o teste 008 passa a cobrir a tabela).

**Deno (`app_test.ts`):**
- o teste `FI-20, FI-07` passa a ler a definição da 0940 e compara **na ordem** (C9.7);
- as cinco rotas, com o escritório vindo da sessão.

**Vitest:**
- `planilha.test.ts`: a aba Empréstimos, o Resumo e a conta que fecha sobre `abasContador`, e o .csv;
- testes do domínio para `parcelasDoEmprestimo`, com os mesmos casos de data do pgTAP, `custoEmprestimo` e `sugerirParcelasAntes`.

## 3. (b) Telas a desenhar (briefing para o especialista de frontend de SaaS)

Siga `docs/IDENTIDADE.md` e `docs/design/conceito-gabinete.md`, e parta do que já foi aprovado em `docs/design/aprovadas/portal-financeiro` (Caixa, A pagar, `nova-conta` e `exportar`) e em `portal-comercial-financeiro-pendencias` (`ct-caixa`, `ct-exportar` e `es-abertura`).

Entregue celular e computador de cada estado, a NOTAS.md com as decisões e as perguntas do §8, e a conferência WCAG 2.2 AA. O destino é `docs/design/aprovadas/portal-financeiro-emprestimos/`.

**Princípio:** empréstimo fica à parte, mas não é de terceiros. Nada de âmbar. Use o tom neutro ou areia, o selo "Empréstimo" e a frase "Entra no saldo, mas não é receita".

**T1 · Caixa:**
- **O que mostra:**
  - a folha "Empréstimos · à parte", com o total que falta pagar em destaque e uma linha por empréstimo ativo: o selo Banco, Sócio ou Outro, o nome, "falta pagar R$ X · 14 de 24 · termina em mar/2028" ou "falta devolver R$ X", a próxima parcela e o selo "anterior ao T3jus" quando for o caso;
  - o botão "Registrar empréstimo";
  - na tabela mês a mês, a coluna "Empréstimos", com previsto e realizado e sinal: + quando entrou, − nas parcelas. A explicação diz que Entradas e Saídas são do dia a dia e que o empréstimo fica à parte, mas entra no saldo.
- **Estados:**
  - `em-vazio`: uma linha discreta, "Pegou empréstimo de banco ou de sócio? Registre aqui: entra no saldo, mas não conta como receita.";
  - `em-caixa`.
- **Fora desta versão (S14):** `em-quitado` e `em-sem-editar`. O empréstimo quitado sai da folha e continua acessível pela ficha, a partir da parcela em A pagar.

**T2 · Janela "Registrar empréstimo":**
- **Campos:** os do §1.1 e do §1.3. Os textos de ajuda são os do §1.1. Ao lado de "Valor que entrou na conta", a ajuda "o que caiu na conta, já sem IOF e tarifas".
- **"Em parcelas":** a prévia calculada, por exemplo "14 parcelas de R$ 1.250,00 · de 10/12/2026 a 10/01/2028 · custo do empréstimo R$ 5.000,00". A lista das parcelas abre com o valor de cada uma editável (S2). Se a próxima parcela cair mais de 1 mês antes de hoje, aparece a pergunta sobre as anteriores (C6).
- **Avisos:**
  - "Entrou antes do T3jus: não soma no saldo; as parcelas que faltam entram em A pagar." (B1);
  - "Entrou antes do saldo de abertura: já está nele.".
- **Estados:**
  - `em-registrar`;
  - `em-registrar-parcelas`;
  - `em-registrar-antigo`: o aviso de B1 junto com a pergunta de C6;
  - `em-registrar-livre`;
  - `em-registrar-erros`;
  - `em-registrar-falha`: não perde o que foi digitado;
  - `em-registrado`: "As 14 parcelas já estão em A pagar".

**T3 · Ficha do empréstimo:** janela lateral ou página `/financeiro/caixa/emprestimos/:id`; o especialista escolhe.
- **O que mostra:**
  - no topo: de quem, para que, o valor que entrou, o valor do contrato, o dia, a forma e se é anterior ao T3jus;
  - os números: total das parcelas, custo, já pago (antes do T3jus e no T3jus) e falta pagar;
  - as parcelas, com n/N, vencimento, situação (paga em dd/mm com o valor, em aberto, vencida ou cancelada), "Marcar paga" (a mesma janela de A pagar) e o comprovante;
  - no modo sem parcelas: as devoluções e "Registrar devolução";
  - o histórico;
  - no pé: "Encerrar as parcelas que faltam" (quando há algo pago) ou "Lançado errado" (quando não há nada pago).
- **Estados:**
  - `em-ficha`;
  - `em-ficha-livre`;
  - `em-devolucao`: com o aviso do que passa do "falta devolver", com erros e com falha;
  - `em-encerrar`: diz que as N parcelas em aberto serão canceladas e que o que foi pago fica;
  - `em-cancelar`: diz que sai do caixa;
  - `em-encerrado` e `em-cancelado`: só leitura, com o motivo.

**T4 · A pagar:**
- o selo "Empréstimo · 3/24", com link para a ficha;
- no bloco "Saídas do mês por categoria", o divisor e a linha "Empréstimos (à parte)", fora do total;
- na janela "Lançar conta", sem a categoria Empréstimos, com a ajuda "Parcela de empréstimo? Registre o empréstimo no Caixa e as parcelas nascem sozinhas.".

**T5 · Exportar:** a prévia ganha a linha "Empréstimos · 1 recebido (R$ 30.000,00) e 3 parcelas pagas (R$ 3.750,00), 1 sem comprovante · vão numa aba à parte". O desenho confirma que a linha não pede outro campo (S13).

## 4. (c) Ordem dos PRs (um por vez)

| # | PR | Conteúdo | Painel |
|---|---|---|---|
| 1 | **Desenho** (só `docs/design/`) | T1 a T5, com a aprovação da Carol e as respostas do §8 na NOTAS.md | F3.51 vai para `andamento`. A `nota` registra a decisão da Carol e o desenho aprovado. O `proximo` passa a ser "Servidor e domínio dos empréstimos (0940/0941)". Uma linha de histórico com `--refs F3.51 FI-20` |
| 2 | **Servidor, domínio e arquivo do contador** | O §2 inteiro: a 0940 e a 0941, o domínio, as rotas, `planilha.ts` e os testes. Seção nova no `sistema/README.md` ("Financeiro do Portal, Empréstimos (F3.51; FI-20)"). Sai "a categoria Empréstimos (F3.51)" do "Falta" de F3.47 (README l. 326) | F3.51 continua `andamento`, com a evidência parcial na `nota` e o `proximo` "Telas dos empréstimos". Item de publicação novo em `publicacao/contas-e-ambiente/` (o próximo P livre, hoje P6): "Aplicar 0940 e 0941 juntas e publicar a api-portal" (S12, S-N2). Histórico |
| 3 | **Telas** | T1 a T5 em `FinanceiroResumo.tsx` (Caixa e exportar), `FinanceiroPagar.tsx` e um componente novo, `FinanceiroEmprestimos.tsx`. O e2e `tests/e2e/portal-financeiro-emprestimos.spec.ts` roda no celular e no computador, com axe. Ajustar `portal-financeiro-caixa.spec.ts` e `portal-financeiro-pagar.spec.ts`. A seção do README ganha as telas e o e2e (S12) | F3.51 vai para `feito`, com a `evidencia`. Sai o `proximo`. Histórico |

A ordem segue o `CLAUDE.md`. Trocar o 1 e o 2 também vale: o PR 2 sozinho não muda nada para quem usa, porque sem a janela ninguém registra empréstimo (S13).

Antes de cada commit, rode `pnpm lint && pnpm typecheck && pnpm test`, `pnpm test:deno`, `pnpm test:db`, `pnpm build && pnpm e2e` (no PR 3) e `python3 docs/painel/painel.py conferir`.

## 5. Painel (`docs/painel/dados/`, conforme `docs/painel/LEIA-ME.md`)
- **F3.51:**
  - mantém `refs: ["FI-20"]`;
  - o `proximo` atual ("perguntar à Carol se entra como receita ou à parte") sai no PR 1, e a `nota` registra a decisão: "à parte, como terceiros; entra no saldo, não é receita";
  - o texto pode ganhar o detalhe: "Empréstimos à parte: registrar o empréstimo recebido, as parcelas em A pagar, o saldo do Caixa sem contar como receita, e a aba própria ao contador".
- **Histórico:** uma linha por PR, com `python3 docs/painel/painel.py novo-historico --inicio HH:MM --fim HH:MM --refs F3.51 FI-20 --texto "..."`, no horário de Brasília.
- **Nenhum item pendente novo é obrigatório:**
  - F3.18, F3.25 e F3.47 já citam FI-20, e F3.51 é o item que completa a ideia;
  - F3.51 só vira `feito` no PR 3;
  - o que fica para depois (§7) não é parte da FI-20. Só vira item se a Carol quiser, e então primeiro como ideia nova no `IDEIAS.md` (FI-24, seção 4, com a contagem do fim atualizada).
- **Publicação:** um item novo no PR 2 (acima).
- **Peça:** F3.51 continua `S3`, como os outros itens do financeiro da F3. Mudar isso é assunto da fase inteira.

## 6. Riscos e cuidados
- **Contar duas vezes:** a parcela já está em `caixa_saidas` e em `saidas_previstas`. O invólucro do Caixa só a muda de coluna (§1.5), e o teste confere que a linha fecha.
- **Saldo de abertura e empréstimo antigo:** `no_caixa`, `ajuste_abertura` e `saldo_escritorio_em` usam o mesmo filtro (§1.2). Os quatro casos estão no teste 8.
- **`categoria_saida_valida` é `immutable` e está em CHECK:** só se acrescenta, no fim da lista.
- **Invólucros com `rename`:** siga o padrão das 0556, 0557, 0650 e 0534 e confira antes as migrations novas da `main` (§2).
- **Parcelas em dobro:** se o escritório já lançou parcelas à mão, a ajuda da janela evita a duplicidade (S15). As que já foram pagas não mudam de categoria.

## 7. Fica para depois (fora de F3.51)
- Juros separados em cada parcela, ou tabela Price ou SAC calculada pelo T3jus.
- O contrato do empréstimo anexado ao próprio empréstimo. Hoje o comprovante vai em cada parcela.
- Várias contas bancárias, com saldo por conta.
- Aviso no sino ou no Início da parcela que vai vencer.
- Empréstimo que o escritório **dá** (um ativo).
- Importar empréstimos do Astrea: a 0820 não muda; vale olhar quando houver um backup real.
- A lista "ver quitados" e um papel só de leitura no Financeiro.

Saiu da lista em relação à versão 1: quitar antes e renegociar, que agora o "Encerrar as parcelas que faltam" cobre (C2).

## 8. Dúvidas que só a Carol responde (cada uma com a minha recomendação)
1. **Juros:** o "custo do empréstimo" num número só, com o valor do contrato opcional, basta para o contador dos pilotos? **Recomendo que sim.** Os juros parcela a parcela ficam para quando um contador pedir.
2. **Sem parcelas fixas:** o empréstimo de sócio "devolve quando der" entra já na primeira versão? **Recomendo que sim.** É pequeno e é o caso mais comum no escritório pequeno.
3. **Quem vê:** quem tem a área Financeiro e não é sócio vê o empréstimo do sócio? **Recomendo que veja tudo, como hoje.** Isso deve mudar junto com a decisão sobre as retiradas (pergunta 4 do `portal-financeiro`), e não separado.
4. **Quem encerra e cancela:** qualquer pessoa com a área Financeiro, ou só a sócia dona? **Recomendo qualquer pessoa com a área**, porque o motivo é obrigatório e fica no histórico. Se a Carol preferir restringir, basta `so_socio_dono` nas duas funções.
5. **Resumo:** fica sem nenhuma menção a empréstimo? **Recomendo que sim.** O Resumo responde "como está a receita", e o empréstimo aparece no Caixa e em A pagar.

O B1 ("anterior ao T3jus" fora do saldo) não é pergunta: está decidido no §1.2 por seguir a regra que a Carol já aprovou para o histórico do Astrea. Ela só fica sabendo dele pelo aviso no desenho (T2, `em-registrar-antigo`).

## 9. Respostas à revisão

| Código | O que foi feito |
|---|---|
| **B1** | Aceito, com a opção (a). Conferi: `ajuste_abertura` dá zero sem abertura (0556 l. 73 a 75), e os Ajustes aceitam salvar sem ela (0556 l. 175). Entram o `no_caixa` gravado no registro, a peça `emprestimo_comeco_caixa` (com abertura, a data dela; sem abertura, o primeiro lançamento ou o cadastro do escritório), o mesmo filtro em `emprestimos_entrou` e `ajuste_abertura`, o estado de tela `em-registrar-antigo` e quatro testes (§1.2, §2.1, §2.6 item 8) |
| **B2** | Aceito. Conferi os três critérios de previsto e realizado (0290 l. 264 a 288). A coluna passa a ter `entrou`, `parcelasPrevistas`, `parcelasRealizadas`, `liquidoPrevisto` e `liquidoRealizado`, com a tabela das três situações de mês e o filtro de cancelada (§1.5). Testes no item 9 |
| **C1** | Aceito. Conferi a 0220 l. 13: SOCIO e EQUIPE têm as duas ações. O teste passa a ser "sem a área, `AREA_NAO_LIBERADA`", e `em-sem-editar` saiu do desenho. As funções continuam checando `.editar` (§1.8) |
| **C2** | Aceito. Entra "Encerrar as parcelas que faltam", com colunas `encerrado_*`, função, rota, histórico e os estados `em-encerrar` e `em-encerrado`. Quitar e renegociar saíram do §7 (§1.9) |
| **C3** | Aceito. A fórmula do custo conta `parcelas_antes × parcela_valor`, e o "já pago" separa antes do T3jus de no T3jus (§1.4) |
| **C4** | Aceito. A situação é calculada no último dia do mês exportado, por `emprestimo_situacao_em(e, p_dia)`, a mesma função da ficha (§1.6, §2.1 item 6, teste 12) |
| **C5** | Aceito. A nota do Resumo da planilha e "(principal e juros)" na linha das parcelas. A conta que fecha virou teste (§1.6) |
| **C6** | Aceito. O campo virou "Vencimento da próxima parcela a pagar". Entram as recusas de vencimento antes do dinheiro entrar e de mais de 3650 dias, e a sugestão de `parcelas_antes` (§1.3) |
| **C7** | Aceito. Conferi: `Recorrentes.tsx` só mostra a categoria (l. 112, 199 e 342). Só `FinanceiroPagar.tsx` usa `CATEGORIAS_LANCAR`, e `Recorrentes.tsx` saiu do PR 3 |
| **C8** | Aceito. Conferi 0290 l. 292 a 296 e 0556 l. 123 a 126. O invólucro do Caixa recalcula `mesesExportar`, e um invólucro novo dos Ajustes (sobre a versão da 0558) corrige `primeiroLancamento` (§2.2) |
| **C9** | Aceito, os nove itens: a conta da planilha fecha (teste 12 e Vitest), Ajustes igual ao Caixa (10), cancelado e encerrado (7), outubro pago em novembro (9), isolamento com `TC404` (6), os CHECKs por insert direto (4), a ordem no Deno, a paridade de datas em pgTAP e Vitest (13) e B1 (8) |
| **S1** | Aceito. Conferi que o total é somado na tela (`FinanceiroPagar.tsx` l. 135 e 136). Saiu o invólucro de A pagar, e o selo vem de `conta_linha` |
| **S2** | Aceito. O valor de cada parcela pode mudar antes de gravar. Cobre SAC e carência sem o T3jus calcular juros |
| **S3** | Aceito, como campo opcional em "mais detalhes", para não pesar a janela |
| **S4** | Aceito. A nota no pé da aba do contador |
| **S5** | Aceito. Os três textos de ajuda do §1.1 |
| **S6** | Aceito. A coluna Comprovante na aba e a contagem na prévia |
| **S7** | Aceito. As regras de data, o `vencimento = paga_em` e o aviso do valor acima |
| **S8** | Aceito. É barato e fecha o isolamento no banco para dado financeiro, ainda que a casa não use o padrão hoje |
| **S9** | Aceito. O invólucro chama `entrar_area` e `entrar_escritorio` antes de olhar a categoria |
| **S10** | Aceito. O histórico vai sem o `credor_nome` |
| **S11** | Aceito. Entra `APROVADO`, seguindo a 0556, a 0557 e a 0621, com o comentário na migration |
| **S12** | Aceito. Item de publicação no PR 2, README também no PR 3 e conferência das migrations 0871 a 0939 antes de escrever (hoje não existe nenhuma) |
| **S13** | Aceito. A ordem desenho → servidor → telas fica, e a troca segue permitida |
| **S14** | Aceito. Saíram `em-quitado`, `em-sem-editar` e o invólucro de A pagar. Ficam `LIVRE`, `parcelas_antes` e "Encerrar" |
| **S15** | Aceito. O aviso de parcelas já lançadas, na janela |

### Segunda leitura (plano v2)

| Código | O que foi feito |
|---|---|
| **N1** | Aceito, com a opção (a). Com saldo de abertura, quem decide é a abertura. A regra é a peça `emprestimo_conta_no_caixa`: não cancelado e (`no_caixa` ou `recebido_em > a.data`). Ela vale em `emprestimos_entrou`, em `ajuste_abertura` e no selo. A opção (b), sem gravar, ficou recusada: o selo mudaria sozinho quando alguém registrasse um lançamento antigo. O limite que sobra sem abertura está escrito no §1.2 e se corrige cadastrando o saldo de abertura. Os dois testes pedidos estão no §2.6, item 8 |
| **S-N1** | Aceito. O começo do caixa sai das tabelas da base, sem as parcelas de empréstimo e sem o `primeiroLancamento` novo, e `criado_em` é lido no horário de Brasília. O aviso de T2 aparece também quando o empréstimo é anterior ao primeiro lançamento. Teste no item 8 |
| **S-N2** | Aceito. `saldo_escritorio_em` e `ajuste_abertura` passaram para a 0941, junto com o invólucro do Caixa (§2.2, item 0). O item de publicação diz que as duas migrations se aplicam juntas |
| **S-N3** | Aceito. "Encerrar" passa a valer com `parcelas_antes > 0` e no empréstimo anterior ao T3jus. O "encerrado com R$ X não devolvido", e com as parcelas canceladas, aparece na ficha e na aba do contador, com o aviso de perdão ou aporte |
| **S-N4** | Aceito. `mesesExportar` continua com no máximo 13 meses, pelo mesmo `greatest` da 0290. Teste no item 8 |
