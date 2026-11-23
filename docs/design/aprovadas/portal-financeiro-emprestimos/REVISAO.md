# Revisão do plano F3.51 · Empréstimos (FI-20)

Revisão independente, feita em 23/11/2026 sobre `emprestimos/plano.md` e o código da `main` (último merge: PR #138; a migration mais nova é a 0870). Não programei nada, não fiz commit e não mexi no plano. A decisão da Carol (o empréstimo fica à parte, entra no saldo, não é receita, e as parcelas vão numa linha própria ao contador) não está em discussão aqui.

**Veredito: aprovado com correções.** A base está certa. Conferi as afirmações do §0 uma a uma e elas batem com o código. A ideia de usar `contas_pagar` para as parcelas evita contar duas vezes no saldo. Redefinir `ajuste_abertura` e `saldo_escritorio_em` deixa o Caixa, os Ajustes e a exportação com o mesmo número. Dois pontos bloqueiam a execução e precisam ser corrigidos no plano antes de começar (B1 e B2). Os pontos "corrigir" podem entrar no plano junto.

Legenda: **bloqueia** (corrigir no plano antes de executar) · **corrigir** (entra nesta entrega) · **sugestão** (melhora, mas é opcional).

---

## 1. O que conferi e está certo

| Afirmação do plano | Onde conferi | Resultado |
|---|---|---|
| `categoria_saida_valida` está em 0230 l. 13, é `immutable` e é usada nos CHECKs de `contas_recorrentes` (l. 24) e `contas_pagar` (l. 40) | 0230 | Certo. Nenhuma migration posterior a redefine |
| A versão atual de `portal_financeiro_conta_lancar` é a 0511 (a função começa na l. 64 e a categoria é validada na l. 91) | 0511 | Certo |
| `caixa_entradas` está em 0290 e foi redefinida em 0650 l. 14. `caixa_saidas` só existe em 0290 l. 61 | grep em todas as migrations | Certo. As duas valem como estão |
| A versão atual de `saidas_previstas`, `conta_linha`, `portal_financeiro_pagar` e `despesas_fixas_mes` é a 0534 | 0534 l. 122, 134, 155 e 219 | Certo |
| `ajuste_abertura` e `saldo_escritorio_em` estão em 0556 l. 69 e 79 | 0556 | Certo. Nenhuma migration até a 0870 as redefine |
| O Caixa tem as camadas 0290 → 0555 → 0556 → 0557 | 0555 l. 47, 0556 l. 249, 0557 l. 110 | Certo |
| A prévia passa por 0290 → 0650, e a exportação por 0290 → 0556 → 0650 | 0650 l. 53 e 73, 0556 l. 282 | Certo |
| O Resumo não lê saídas: `v_recebido` sai de `caixa_entradas`, `fixas.despesas` sai de `despesas_fixas_mes` (só `mes`) e a meta vem da 0558 | 0290 l. 145 e 225, 0534 l. 237, 0558 l. 120 | Certo. O Resumo não muda |
| Os relatórios do sócio não leem parcela de empréstimo: `relatorio_entradas` não lê `contas_pagar`, e `relatorio_adiantadas` exige `cliente_id` | 0410 l. 143 e 197 a 209 | Certo |
| O Início não lê `contas_pagar` | 0400 l. 286 a 323 | Certo |
| A importação deixa as despesas de fora, e a receita exige cliente | 0820 l. 10 e 33 | Certo |
| As permissões `financeiro.ver` e `.editar` valem para SOCIO e EQUIPE | 0220 l. 12 a 14 | Certo, mas veja C1 |
| A exportação traz a `categoria` em cada linha de despesa, então filtrar por categoria basta | 0290 l. 405 a 409 | Certo |
| A planilha calcula "Despesas pagas" e "Resultado do mês" no navegador, a partir de `d.despesas` | `packages/ui/src/portal/planilha.ts` l. 166 a 177 | Certo. Tirar as parcelas de `despesas` no servidor já corrige o Resumo da planilha |
| O teste Deno lê a lista de categorias da 0230 por regex e compara **na ordem** | `app_test.ts` l. 1640 a 1645 | Certo. A ordem das chaves de `CATEGORIAS_SAIDA` precisa ser igual à da lista SQL nova |
| `proteger_tabela_escritorio` funciona sem `versao` e já põe `contrato_aceita_escrita`. O fim da guarda desliga os gatilhos de usuário, então o guardião novo não trava o apagamento | 0550 l. 13 a 51, 0540 (`disable trigger user`) | Certo |
| Fazer as contas: com `ajuste_abertura` novo (desconta L até a data da abertura) e o invólucro somando L(least(fm, hoje)), o saldo do Caixa, de cada mês e do "fecha o mês" fica igual a `saldo_escritorio_em` | 0290 l. 260 a 289, 0556 l. 264 a 273 | Certo, inclusive nos meses futuros. A observação "Atenção" do §2.1 item 9 está correta |
| A próxima ideia livre da seção 4 é FI-24, e o pgTAP 125 está livre | `IDEIAS.md` (23 ideias na seção 4, total 138), `tests/pgtap` vai até a 124 | Certo |

---

## 2. Bloqueia

### B1 · Empréstimo antigo sem saldo de abertura infla o saldo · bloqueia
**Plano:** §1.1 l. 43, §1.2 l. 56, §2.1 item 8 l. 148 a 151, T2 l. 238.
**Código:** 0556 l. 73 a 75 (`ajuste_abertura` é zero quando não há abertura).

Na implantação, o caso mais comum é este: um Pronampe pego em 2024, que a advogada registra agora para acompanhar as parcelas que faltam (é para isso que o plano tem "Já pagou alguma parcela antes?"). Com saldo de abertura numa data posterior ao recebimento, o valor é absorvido pela abertura, e o plano avisa disso (T2, l. 238). **Sem saldo de abertura**, `saldo_escritorio_em` soma o valor inteiro do empréstimo, mas as parcelas pagas antes e o que foi gasto com o dinheiro nunca passaram pelo T3jus. Resultado: um empréstimo de R$ 100.000,00 de 2024 faz o saldo de hoje pular R$ 100.000,00. A planilha do contador também mostra um saldo de começo e de fim de mês errados.

O saldo de abertura não é obrigatório: `ajustes_salvar` aceita salvar sem ele (0556 l. 175). Então o caso acontece.

**Correção (escolher uma e escrever no plano):**
- (a, recomendada) Se não houver saldo de abertura, ou se o dia em que entrou for anterior ao primeiro lançamento do escritório (a mesma conta de `primeiroLancamento`, 0556 l. 123), o empréstimo entra marcado como **"anterior ao T3jus"** (`antes_do_t3jus boolean`, ou `recebido_em` nulo com `entrou_antes = true`). Ele não soma no saldo e não aparece em "Empréstimos recebidos" do mês. Só as parcelas que faltam valem. É o mesmo raciocínio do "pago antes do T3jus" da 0820;
- (b) Recusar `recebido_em` anterior ao primeiro lançamento quando não houver abertura (`SEM_SALDO_ABERTURA`) e levar a pessoa a Ajustes.

**Testes:** com abertura, sem abertura, e com o dia em que entrou anterior ao primeiro lançamento.

### B2 · A coluna Empréstimos do Caixa está mal especificada e não fecha a conta · bloqueia
**Plano:** §2.1 item 9 l. 155 ("tira as parcelas de `saidasRealizadas` e de `saidasPrevistas` e põe `emprestimos: { entrou, parcelas, liquido }`"), §1.4 l. 69 e 70.
**Código:** 0290 l. 264 a 288.

Na base, as duas colunas usam critérios diferentes, e cada mês os usa de um jeito:
- **meses passados**: `saidasPrevistas = saidas_previstas(m, false)`, por **vencimento**, pagas ou não; `saidasRealizadas = caixa_saidas(m)`, por **`paga_em`**;
- **mês corrente**: `saidasPrevistas = v_sr + saidas_previstas(mes, true)`, ou seja, o pago no mês por `paga_em` mais o que falta e vence no mês;
- **meses futuros**: só a previsão, com `so_falta = true`.

Com um campo `parcelas` só, não dá para tirar o valor certo das duas colunas. Uma parcela de outubro paga em novembro está na previsão de outubro e no realizado de novembro. Quem executar o plano ao pé da letra deixa alguma coluna errada ou negativa, e a regra "saldo anterior + entradas − saídas ± empréstimos = saldo" deixa de valer.

**Correção:** especificar, mês a mês,
`emprestimos: { entrou, parcelasPrevistas, parcelasRealizadas, liquidoPrevisto, liquidoRealizado }`, com:
- `parcelasRealizadas = emprestimo_parcelas_pagas(m, least(fm, hoje))`, que sai de `saidasRealizadas`, ou `null` nos meses futuros;
- `parcelasPrevistas`: nos passados, `emprestimo_parcelas_previstas(m, false)`; no corrente, `emprestimo_parcelas_pagas(mes, hoje) + emprestimo_parcelas_previstas(mes, true)`; nos futuros, `emprestimo_parcelas_previstas(m, true)`. Sai de `saidasPrevistas`;
- `entrou`: entra no realizado e, no mês corrente e nos passados, também no previsto. Nos futuros é zero.

`emprestimo_parcelas_previstas` precisa do mesmo filtro `cancelada_em is null` da 0534 l. 128. No teste, use meses sem saldo de abertura e sem RPV a caminho. Esses dois também mexem no saldo do mês, e a regra só fecha sem eles.

---

## 3. Corrigir

### C1 · Não existe quem tenha `financeiro.ver` sem `.editar` · corrigir
**Plano:** §2.5 l. 202, T1 `em-sem-editar` l. 233, §1.7 l. 100.
**Código:** 0220 l. 12 a 14: SOCIO e EQUIPE têm as duas ações, e nenhuma migration dá uma sem a outra.

O teste e o estado de tela descrevem um caso que não existe. O que existe é **ter ou não a área Financeiro** (`entrar_area`). Troque o teste por "sem a área Financeiro, `TC401` nas quatro rotas e no Caixa". Tire o `em-sem-editar` do briefing, ou deixe-o marcado como "para quando houver papel só de leitura". Se ficar, o teste precisa tirar a linha de `funcao_acoes` dentro da transação.

### C2 · Não há saída depois da primeira parcela paga · corrigir
**Plano:** §1.8 l. 107 e 108, §7 l. 306.
**Código:** a coluna `cancelada_*` de `contas_pagar` (0534 l. 12 a 17) e o guardião (0534 l. 56) já deixam cancelar uma conta que não foi paga.

Com uma parcela paga, não se cancela nada. Ficam presas três situações comuns numa advogada pequena:
- quitou antes;
- renegociou;
- digitou errado o número ou o valor das parcelas e só percebeu depois de pagar a primeira.

As parcelas em aberto ficam **vencidas para sempre** em A pagar (nos totais `vencidas` e `semana`, 0534 l. 181 a 183), no "falta pagar" e na previsão do Caixa.

**Correção:** acrescentar já nesta entrega a ação **"Encerrar as parcelas que faltam"** (`.editar`, com motivo de 5 a 300 caracteres). Ela cancela as `contas_pagar` não pagas daquele empréstimo com as colunas que já existem, vai ao histórico (`financeiro.emprestimo_encerrado`) e deixa o empréstimo como quitado. É uma função pequena, que usa o que já existe. Cobre a quitação antecipada (paga-se a última com o valor do banco e encerra-se o resto), a renegociação (encerra e registra o novo) e o erro de digitação. Tire esse ponto do §7.

### C3 · O custo do empréstimo não conta as parcelas pagas antes · corrigir
**Plano:** §1.3 l. 63, §2.1 item 7 l. 147 ("custo é a soma das parcelas (pagas pelo valor pago e as outras pelo valor) menos o valor recebido").

As parcelas pagas antes do T3jus (`parcelas_antes`) não viram `contas_pagar`. Pela fórmula do plano, elas ficam fora da soma, e o custo sai baixo ou até negativo. Por exemplo: 24 parcelas de R$ 1.250,00 e R$ 25.000,00 recebidos, com 10 pagas antes, dão 14 × 1.250 − 25.000 = −R$ 7.500,00. **Correção:** custo = `parcelas_antes × parcela_valor` + Σ(pagas pelo valor pago) + Σ(em aberto pelo valor) − `valor`. O "já pago" da ficha e da aba do contador separa "pago antes do T3jus" (estimado) de "pago no T3jus". Se B1 for resolvido com a opção (a), o custo de um empréstimo anterior ao T3jus continua fazendo sentido.

### C4 · A situação na aba do contador tem que ser a do fim do mês exportado, não a de hoje · corrigir
**Plano:** §1.5 l. 83 ("situação de cada empréstimo ativo: ... já pago e falta pagar"), §2.4 l. 193 ("empréstimo no mês ou empréstimo ativo").

O contador usa a aba para o passivo **na data do balancete**. Se a advogada exporta outubro no dia 23 de novembro, o "já pago" e o "falta pagar" de hoje já trazem as parcelas de novembro. **Correção:** calcular a situação no último dia do mês exportado:
- "ativo" quer dizer recebido até `fm`, não cancelado e com parcela em aberto em `fm`;
- "já pago" é a soma do que foi pago até `fm`;
- "falta pagar" é o que ainda não estava pago em `fm`.

Uma função `emprestimo_situacao_em(e, p_dia)` resolve isso e também serve à ficha, com `p_dia = hoje`.

### C5 · "Resultado do mês" sem nenhuma parcela esconde os juros · corrigir
**Plano:** §1.5 l. 79.
**Código:** `planilha.ts` l. 177.

Tirar a parcela inteira de "Despesas pagas" está certo para o principal, que só devolve o dinheiro recebido. Mas os juros, o IOF e as tarifas são **despesa financeira** do escritório. Do jeito que está, o "Resultado do mês" fica maior do que é, e a sócia lê como lucro. **Correção:** a nota do Resumo da planilha passa a dizer: "O resultado não inclui os juros e encargos dos empréstimos: as parcelas estão na aba Empréstimos, com o custo total de cada um." No Resumo, a linha "Parcelas de empréstimo pagas" pode ganhar "(principal e juros)". A conta saldo de começo + recebimentos − despesas + empréstimos recebidos − parcelas = saldo de fim precisa fechar e virar teste (C9).

### C6 · O primeiro vencimento é ambíguo e pode criar parcelas vencidas em massa · corrigir
**Plano:** §1.2 l. 52 e 56, §2.1 item 13 l. 166.

Pela fórmula do item 13, o "primeiro vencimento" é o da **parcela `parcelas_antes + 1`**, a próxima a pagar, e não o da parcela 1. A janela de T2 (l. 237) não deixa isso claro. Se a pessoa puser o vencimento da parcela 1 de um empréstimo antigo, nascem dezenas de parcelas vencidas. **Correção:**
- chamar o campo de "Vencimento da próxima parcela a pagar";
- recusar vencimento anterior ao dia em que entrou;
- se ele cair mais de 1 mês antes de hoje, a janela pergunta se as anteriores já foram pagas e sugere o `parcelas_antes`;
- limitar a última parcela a hoje + 3650 dias, como em `conta_lancar` (0511 l. 93).

### C7 · Fatos errados nas telas do domínio · corrigir
**Plano:** §2.2 l. 175 e §4 PR 3 l. 280 ("`Recorrentes.tsx` (a lista de categorias)" e "a janela de recorrência passam a usar essa lista").
**Código:** `Recorrentes.tsx` só **mostra** `CATEGORIAS_SAIDA[r.categoria]` (l. 112, 199 e 342). Não tem como escolher categoria, e a mudança de recorrência (0534 l. 322) não troca a categoria.

A única escolha de categoria está em `FinanceiroPagar.tsx` l. 31 e 451, na janela "Lançar conta", que inclui o "Repete todo mês". Só ela passa a usar `CATEGORIAS_LANCAR`. Tire `Recorrentes.tsx` da lista do PR 3.

### C8 · O mês só com empréstimo não aparece para exportar · corrigir
**Código:** 0290 l. 292 a 296 (`v_inicio` de `mesesExportar` olha recebimentos, contas e levantamentos) e 0556 l. 123 a 126 (`primeiroLancamento` dos Ajustes).

Um escritório cujo primeiro registro é um empréstimo não consegue exportar esse mês. Além disso, os Ajustes sugerem uma data de abertura que ignora o empréstimo, o que leva de volta a B1. **Correção:** o invólucro do Caixa recalcula `mesesExportar` com `min(recebido_em)` dos empréstimos não cancelados. Os Ajustes ganham o mesmo dado num invólucro, ou num `create or replace` de uma peça pequena.

### C9 · Lacunas nos testes · corrigir
**Plano:** §2.5 l. 196 a 218. Acrescentar:
1. A conta da planilha fecha: `saldoInicio + recebimentos − despesas + empréstimos recebidos − parcelas = saldoFim`, em pgTAP sobre o JSON da exportação e em Vitest sobre `abasContador`;
2. Os Ajustes mostram o mesmo saldo do Caixa (`portal_financeiro_ajustes.saldoHoje = portal_financeiro_caixa.saldo`) com empréstimo, com e sem abertura;
3. O empréstimo cancelado tira as parcelas em aberto de A pagar (totais, semana e vencidas), de `saidas_previstas` e do "falta pagar", e a parcela paga continua no realizado;
4. A parcela de outubro paga em novembro cai na coluna certa (B2);
5. Isolamento: `GET /emprestimos/:id`, devolução e cancelamento com o id de outro escritório dão 404. `portal_financeiro_conta_paga` com a parcela de outro escritório também dá 404;
6. `contas_pagar` recusa `categoria = 'EMPRESTIMOS'` sem `emprestimo_id`, e o contrário, pelos CHECKs, mesmo por insert direto;
7. O teste Deno do FI-20 compara **na ordem**: a posição de `EMPRESTIMOS` na lista SQL nova tem que ser a mesma do objeto do domínio;
8. A paridade de `parcelasDoEmprestimo` com `vencimento_no_mes` fica em **pgTAP + Vitest com os mesmos casos**, por exemplo dia 31 caindo em fevereiro de ano bissexto e de ano comum. O Deno não roda SQL, e o paralelo com `somarDiasUteis` (`app_test.ts` l. 1485) é só um caso fixo;
9. B1: um empréstimo anterior ao T3jus sem abertura não mexe no saldo.

---

## 4. Sugestões

### S1 · Cortar o invólucro de A pagar · sugestão (complexidade)
**Plano:** §2.1 item 10 l. 159. **Código:** `FinanceiroPagar.tsx` l. 135 e 136: o total do bloco "Saídas do mês por categoria" é somado **na tela**.

Basta a tela separar a linha com a chave `EMPRESTIMOS`. Assim não é preciso renomear `portal_financeiro_pagar` (uma camada a menos) nem criar `emprestimosMes`. O selo "Empréstimo · 3/24" pode vir só de `conta_linha` (`create or replace` da 0534 l. 134), como o plano prefere.

### S2 · Na janela de registro, deixar mudar o valor de cada parcela · sugestão (contábil)
Tabela SAC, carência do Pronampe (no começo, só os juros) e a primeira parcela com IOF têm valores diferentes. Com `parcela_valor` fixo, o "falta pagar" e a previsão ficam errados até a quitação, porque o guardião (0534 l. 68) não deixa mudar o valor depois. A lista de parcelas que a janela já mostra (§2.2 l. 179) pode deixar o valor editável antes de gravar, mandando `parcelas: [{n, vencimento, valor}]`. `parcela_valor` passa a ser só o valor sugerido. Isso não é montar tabela Price ou SAC.

### S3 · Valor contratado (bruto), opcional · sugestão (contábil)
O contador lança o passivo pelo valor contratado e o IOF e as tarifas como despesa. Com só o líquido, ele depende do contrato. Um campo opcional "Valor do contrato (antes do IOF e das tarifas)" vai para a aba do contador, e "IOF e tarifas na liberação" sai da diferença. Se ficar de fora, a aba deve dizer "Valor líquido; o contrato traz o valor bruto e o IOF".

### S4 · Deixar claro o que o "falta pagar" é · sugestão
Na aba do contador, junto ao "Falta pagar", pôr "inclui os juros das parcelas futuras; o saldo devedor para quitar é o do extrato do banco". O plano já pensa assim no §1.6. É só levar isso ao arquivo.

### S5 · Textos de ajuda contra erros comuns · sugestão (contábil)
Na janela T2:
- empréstimo no CPF da sócia que ela pôs no escritório: é "De quem: Sócio", e não Banco;
- parcela de empréstimo pessoal da sócia paga pelo escritório, sem o dinheiro ter entrado nele: é **Retirada**, não empréstimo;
- dinheiro da sócia que não vai voltar: é aporte de capital, não empréstimo. Falar com o contador.

### S6 · Comprovante da parcela, em vez de só tirá-la do `semNota` · sugestão
**Plano:** §1.5 l. 88, §2.1 item 12 l. 164. **Código:** 0520 l. 285 a 288; `FinanceiroResumo.tsx` l. 1010 a 1015.

Está certo não marcar "Falta a nota". Mas o contador precisa do comprovante da parcela (boleto ou extrato). A aba Empréstimos pode ganhar a coluna "Comprovante: anexado / falta". A conta já está em `anexos.conta_id`. A prévia pode dizer "N parcelas sem comprovante".

### S7 · Devolução livre: limites e juros ao sócio · sugestão
**Plano:** §1.2 l. 57, §2.1 item 13 l. 168. A devolução não pode ser anterior ao dia em que entrou e cria a conta com `vencimento = paga_em`, que o plano não diz. Devolução acima do "falta devolver" passa a ser avisada na tela ("o que passar de R$ X fica como juros pagos ao sócio"), em vez de sumir no `greatest(…, 0)`.

### S8 · FK composta para o isolamento no banco · sugestão (segurança)
`contas_pagar.emprestimo_id references emprestimos` não garante que os dois são do mesmo escritório. Hoje só a função garante isso. Criar `unique (escritorio_id, id)` em `emprestimos` e `foreign key (escritorio_id, emprestimo_id) references emprestimos (escritorio_id, id)` custa pouco e fecha a porta no banco. A casa não usa esse padrão hoje, então é opcional.

### S9 · Ordem das checagens no invólucro de "Lançar conta" · sugestão (segurança)
**Plano:** §2.1 item 11 l. 160. O invólucro recusa `EMPRESTIMOS` antes de chamar a base. Assim, quem não tem a área Financeiro recebe um erro de campo (TC422) em vez de TC401. Chame `entrar_area` e `entrar_escritorio(..., 'financeiro.editar')` no invólucro antes de olhar a categoria. Uma alternativa sem invólucro: o CHECK novo de `contas_pagar` já recusa, e a tela já esconde a categoria. Mas aí o erro sai cru (23514), por isso o invólucro vale.

### S10 · Histórico sem o nome do credor · sugestão (LGPD)
Nos registros `financeiro.emprestimo_*`, guarde o id, o `credor_tipo`, o valor e as parcelas, sem `credor_nome` (o nome pode ser de pessoa física). É o mesmo cuidado da 0556 l. 187 com o contador.

### S11 · Inventário: PROPOSTA ou APROVADO · sugestão
**Plano:** §2.1 item 6 l. 142. O `sistema/README.md` (l. 66) diz que os prazos nascem `PROPOSTA` e viram `APROVADO` depois da Carol. As tabelas recentes do financeiro (0556 l. 53 a 59, 0557, 0621) já entraram `APROVADO`, com o mesmo texto de prazo. Siga o precedente, mas escreva no comentário da migration que o texto é o já aprovado para o financeiro.

### S12 · Painel, publicação e README · sugestão
**Plano:** §4 e §5.
- No PR 2, crie ou atualize um item em `docs/painel/dados/publicacao/contas-e-ambiente/` para "aplicar 0940/0941 e publicar a api-portal", como o P5 faz;
- No PR 3, atualize também a seção nova do `sistema/README.md` com as telas e o e2e. O plano só cita o README no PR 2;
- Antes de escrever a 0940, confira na `main` se alguma migration entre 0871 e 0939 redefiniu `caixa_entradas`, `caixa_saidas`, `ajuste_abertura`, `saldo_escritorio_em`, `categoria_saida_valida` ou envolveu `portal_financeiro_caixa`, `portal_financeiro_exportar`, `portal_financeiro_exportacao_previa` ou `portal_financeiro_exportacao_anexos`. O `create or replace` da 0940 apagaria a mudança em silêncio. Faça o mesmo com o número do pgTAP 125.

O resto do painel está de acordo com `docs/painel/LEIA-ME.md` e o `CLAUDE.md`:
- `refs ["FI-20"]`;
- `andamento` com `proximo` nos PRs 1 e 2, e `feito` com `evidencia` só no PR 3;
- uma linha de histórico por PR, pelo `novo-historico`;
- o `conferir` antes do commit;
- FI-24 só se a Carol quiser o que ficou para depois.

Sobre os itens já feitos: F3.18, F3.25 e F3.47 citam FI-20, e F3.51 é o pendente que completa a ideia. Então a regra da ideia atendida pela metade está cumprida.

### S13 · Ordem dos PRs · sugestão
A ordem desenho → servidor → telas segue o `CLAUDE.md`. Trocar 1 e 2 também é aceitável, porque o servidor não é tela. O PR 2 sozinho não muda nada para quem usa: sem a janela, ninguém registra empréstimo, e as colunas ficam iguais com zero empréstimo. A única peça "visível" do PR 2 é o arquivo do contador, cujo formato a Carol já decidiu. Confirme na prévia (T5) do desenho que a linha nova não pede outro campo.

### S14 · O que dá para cortar da primeira versão · sugestão (complexidade)
- O estado `em-quitado` com "ver quitados": na primeira versão, o empréstimo quitado pode só sair da folha e continuar acessível pela parcela em A pagar;
- O `em-sem-editar` (C1);
- O invólucro de A pagar (S1).

**Manter:** a forma `LIVRE` (empréstimo de sócio é o caso mais comum no escritório pequeno), o `parcelas_antes` e o "Encerrar as parcelas que faltam" (C2), que faz falta na primeira semana de uso.

### S15 · Parcelas já lançadas à mão · sugestão
Se algum escritório já lançou parcelas de empréstimo como conta (em OUTRAS ou TAXAS) antes da F3.51, registrar o empréstimo cria parcelas em dobro em A pagar. As pagas não mudam de categoria (guardião). Na janela, ponha um aviso: "Já lançou parcelas deste empréstimo em A pagar? Conte-as em 'já pagou antes' e cancele as que estão em aberto lá."

---

## 5. Resumo dos pontos

| # | Ponto | Classe |
|---|---|---|
| B1 | Empréstimo antigo sem saldo de abertura infla o saldo e a planilha | bloqueia |
| B2 | A coluna Empréstimos do Caixa não distingue previsto (vencimento) de realizado (pagamento) | bloqueia |
| C1 | `financeiro.ver` sem `.editar` não existe: o teste e o estado de tela são irreais | corrigir |
| C2 | Não há saída depois da primeira parcela paga (quitação, renegociação, erro) | corrigir |
| C3 | O custo ignora `parcelas_antes` | corrigir |
| C4 | A situação na aba do contador tem que ser a do fim do mês exportado | corrigir |
| C5 | "Resultado do mês" esconde os juros: precisa de nota | corrigir |
| C6 | O primeiro vencimento é ambíguo e cria parcelas vencidas | corrigir |
| C7 | `Recorrentes.tsx` não escolhe categoria | corrigir |
| C8 | `mesesExportar` e `primeiroLancamento` ignoram empréstimos | corrigir |
| C9 | Testes que faltam (a conta da planilha fecha, Ajustes igual ao Caixa, cancelado, isolamento, ordem) | corrigir |
| S1 a S15 | Cortes, ajudas de texto, campos contábeis opcionais, FK composta, LGPD, painel | sugestão |

---

## Segunda leitura (plano v2)

Feita em 23/11/2026 sobre a versão 2 do `plano.md` (489 linhas, com a seção 9 "Respostas à revisão"), conferindo de novo contra o código da `main`.

**Veredito: aprovado.** Nenhum ponto bloqueia mais. Abaixo há uma correção (N1), que cabe fazer no PR 2 antes de escrever a 0940, e quatro sugestões pequenas.

### Como ficaram B1, B2 e C1 a C9

| Ponto | Situação na v2 | Conferência |
|---|---|---|
| B1 | Resolvido no caso pedido, mas a regra gravada tem um furo (N1) | O `no_caixa` usa o mesmo filtro em `emprestimos_entrou` e em `ajuste_abertura` (§1.2, §2.1 itens 6 e 7). Sem abertura, o empréstimo antigo fica fora do saldo. Com abertura, o empréstimo até a data dela não entra (o limite `recebido_em >= a.data + 1` bate com o `p_dia >= a.data` da 0556 l. 75). A abertura criada depois absorve o empréstimo que conta. Os quatro testes estão no §2.6 item 8 |
| B2 | Resolvido | A tabela do §1.5 repete os três critérios da 0290 l. 264 a 288: nos meses passados, previsto por vencimento e realizado por `paga_em`; no mês corrente, o pago mais o que falta; nos futuros, só o que falta. Ela inclui `cancelada_em is null` (0534 l. 128) e põe `entrou` no previsto do mês corrente e dos passados, como a base faz com as entradas. A linha fecha no realizado |
| C1 | Resolvido | O teste usa `AREA_NAO_LIBERADA`, que já existe (0140, 0160 e 0170), e o estado `em-sem-editar` saiu |
| C2 | Resolvido | "Encerrar" usa as colunas `encerrado_*`, um CHECK impede que encerrado e cancelado andem juntos, e o guardião deixa preencher só um dos dois, uma vez. As parcelas são canceladas pelas colunas `cancelada_*` da 0534, que o guardião de `contas_pagar` já aceita em conta não paga. Veja S-N3 |
| C3 | Resolvido | §1.4 |
| C4 | Resolvido | `emprestimo_situacao_em(e, fm)`, que considera também o empréstimo encerrado depois de `fm` (§1.6) |
| C5 | Resolvido | A nota e "(principal e juros)" no Resumo da planilha; a conta que fecha é o teste 12 |
| C6 | Resolvido | §1.3 |
| C7 | Resolvido | Só `FinanceiroPagar.tsx` usa `CATEGORIAS_LANCAR` |
| C8 | Resolvido | Os invólucros do Caixa e dos Ajustes estão na 0941. O nome `financeiro_ajustes_sem_emprestimo` não colide com `financeiro_ajustes_sem_meta` (0558). `portal_financeiro_ajustes_salvar` e `portal_financeiro_abertura_corrigir` chamam `portal_financeiro_ajustes` pelo nome (0556 l. 214 e 244), então passam a devolver a versão nova sem mudança |
| C9 | Resolvido | Os nove casos estão no §2.6 |

### N1 · `no_caixa` gravado erra quando a abertura vem depois com data mais antiga · corrigir
**Plano:** §1.2 ("Por que gravar em vez de recalcular") e §2.1 item 6 (`emprestimo_comeco_caixa`).
**Código:** 0556 l. 218 a 245 (`portal_financeiro_abertura_corrigir` aceita qualquer data até hoje).

O `no_caixa = false` fica gravado. Dois casos deixam o empréstimo fora do saldo quando ele deveria estar lá:
1. **Abertura posterior com data anterior ao empréstimo.** Exemplo: um empréstimo de 03/2026 é registrado sem abertura, antes do primeiro lançamento, e fica com `no_caixa = false`. Depois a sócia cria ou corrige a abertura para 31/01/2026. Pela abertura, o caixa começa antes do empréstimo, mas o empréstimo continua fora: o saldo fica menor pelo valor inteiro dele. O mesmo acontece quando se corrige a abertura para uma data mais antiga, porque um empréstimo que estava até a data antiga ficou gravado como "fora".
2. **Sem abertura, lançamento antigo registrado depois.** Exemplo: a pessoa registra um recebimento antigo com data passada. O "começo do caixa" volta no tempo, mas o empréstimo que ficou entre a data nova e a antiga continua gravado como "fora".

O argumento do plano para gravar é que "uma abertura criada depois não muda o que o empréstimo já mostrava". Esse argumento não precisa da gravação: quando a abertura tem data igual ou posterior ao empréstimo, `ajuste_abertura` já o absorve, conte ele ou não. O saldo não muda.

**Correção (escolher uma):**
- (a, recomendada) Com saldo de abertura, quem decide é a abertura. Um empréstimo conta no caixa quando `no_caixa`, **ou** quando existe abertura atual e `recebido_em > a.data`. Use o mesmo predicado em `emprestimos_entrou`, em `ajuste_abertura` e no selo "anterior ao T3jus". Fora isso, o `no_caixa` gravado vale só para quando não há abertura. Assim o caso 1 se resolve e as contas continuam fechando (com a abertura, o que fica até a data dela é absorvido nos dois casos).
- (b) Calcular sempre, sem gravar: conta quando `recebido_em >= emprestimo_comeco_caixa(escritório)` naquele momento. Isso resolve também o caso 2, mas o selo "anterior ao T3jus" pode mudar quando a pessoa registra um lançamento antigo.

**Testes que faltam no §2.6 item 8:**
- empréstimo registrado sem abertura e fora do caixa, e depois uma abertura com data anterior a ele: o empréstimo passa a contar;
- correção da abertura para uma data mais antiga.

### Sugestões da segunda leitura
- **S-N1 · Defina de que tabelas sai o "começo do caixa".** `emprestimo_comeco_caixa` tem de ler as tabelas da base (0556 l. 123 a 126), e não o `primeiroLancamento` que a 0941 passa a calcular com empréstimos. Senão a peça depende do próprio resultado e varia com a ordem em que os empréstimos são registrados. Converta `escritorios.criado_em` para data no horário de Brasília (`(criado_em at time zone 'America/Sao_Paulo')::date`). E saiba que um escritório cadastrado no Console meses antes de começar a usar o T3jus faz contar um empréstimo daquele intervalo, embora o resto do intervalo não esteja no caixa. Vale mostrar o aviso de T2 também quando o dia em que entrou é anterior ao primeiro lançamento, mesmo que seja posterior ao cadastro.
- **S-N2 · Mude o saldo e o Caixa na mesma migration.** A 0940 redefine `ajuste_abertura` e `saldo_escritorio_em`, mas o invólucro que soma o empréstimo ao Caixa só vem na 0941. Se a publicação aplicar uma sem a outra (já aconteceu com a 0850, P5), o saldo do Caixa e o dos Ajustes ficam diferentes assim que houver um empréstimo. Leve o item 7 do §2.1 para a 0941, ou diga no item de publicação que as duas se aplicam juntas.
- **S-N3 · "Encerrar" no modo LIVRE com saldo não devolvido.** Dar por quitado o que o sócio não recebeu de volta é, para o contador, perdão da dívida ou aporte, não uma simples quitação. A situação na aba do contador deve mostrar "encerrado com R$ X não devolvido". Do mesmo jeito: um empréstimo com `parcelas_antes > 0`, ou que ficou fora do caixa, renegociado antes de pagar qualquer parcela no T3jus, hoje só pode ser "lançado errado", o que o apaga da exportação. Aceite "Encerrar" também quando `parcelas_antes > 0`.
- **S-N4 · Refaça `mesesExportar` com o mesmo limite.** O invólucro do Caixa tem de gerar a lista igual à base: no máximo 13 meses, do mais novo para o mais antigo, usando `greatest(..., mes − 12 meses)` (0290 l. 292 a 296). Senão a lista muda de tamanho quando há empréstimo.
