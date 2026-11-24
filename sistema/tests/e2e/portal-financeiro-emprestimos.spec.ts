// Financeiro do Portal, Empréstimos (F3.51; FI-20; telas aprovadas em
// docs/design/aprovadas/portal-financeiro-emprestimos): a folha "Empréstimos · à parte" do Caixa, a
// coluna do mês a mês e a linha do saldo; a janela de registrar, com as parcelas que nascem em A
// pagar, o antigo (C6) e o devolve quando der; a ficha, com encerrar, lançado errado e devolução; o
// selo e a categoria à parte em A pagar; a linha da exportação. A API é simulada; aqui se testa a
// tela, a acessibilidade e o que ela manda.
import { expect, test, type Page } from "@playwright/test";
import { semViolacoes } from "./console-dados.ts";

const P = "http://localhost:3000";
const ESC = "e0000000-0000-4000-8000-0000000000a1";
const ESCRITORIO = {
  id: ESC, nome: "Ribeiro & Matos", pessoa: "Marina Ribeiro", dono: true, areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"],
  socios: ["Marina Ribeiro"], pessoas: 5, outrosEscritorios: 0, funcoes: ["SOCIO"], cnpj: null, cidade: "São Paulo", uf: "SP", endereco: null,
  contatos: [], ultimaExportacao: null,
};

type Resp = { status?: number; corpo: unknown };
type Pedido = { metodo: string; caminho: string; busca: string; corpo: unknown };

async function simular(page: Page, rotas: Record<string, Resp | Resp[]>) {
  const pedidos: Pedido[] = [];
  await page.clock.setFixedTime(new Date("2026-11-18T13:00:00Z"));
  await page.route("**/api/v1/**", async (rota) => {
    const url = new URL(rota.request().url());
    const caminho = url.pathname.replace(/^\/api/, "");
    const metodo = rota.request().method();
    pedidos.push({ metodo, caminho, busca: url.search, corpo: rota.request().postDataJSON() });
    const r = rotas[`${metodo} ${caminho}${url.search}`] ?? rotas[`${metodo} ${caminho}`] ?? rotas[caminho] ?? { status: 404, corpo: { erro: { codigo: "NOT_FOUND" } } };
    const lista = Array.isArray(r) ? r : [r];
    const vez = pedidos.filter((p) => p.caminho === caminho && p.metodo === metodo).length - 1;
    const x = lista[Math.min(vez, lista.length - 1)]!;
    await rota.fulfill({ status: x.status ?? 200, contentType: "application/json", body: JSON.stringify(x.corpo) });
  });
  return pedidos;
}

const HOJE = "2026-11-18";
const MARINA = { id: "aa000000-0000-4000-8000-000000000001", nome: "Marina Ribeiro" };
const BB = "e5000000-0000-4000-8000-000000000001";
const SICOOB = "e5000000-0000-4000-8000-000000000002";
const SOCIA = "e5000000-0000-4000-8000-000000000003";
const NOVO = "e5000000-0000-4000-8000-000000000004";
const conta = (n: number) => `c5000000-0000-4000-8000-0000000002${String(n).padStart(2, "0")}`;
const contaSicoob = (n: number) => `c6000000-0000-4000-8000-0000000003${String(n).padStart(2, "0")}`;
const ehCelular = (page: Page) => (page.viewportSize()?.width ?? 1000) <= 760;
const API = "/v1/escritorio/financeiro/emprestimos";

const situacao = (x: Record<string, unknown>) => ({
  dia: HOJE, situacao: "ATIVO", pagoAntes: 0, pagoNoT3jus: 0, jaPago: 0, faltaPagar: 0, faltaDevolver: null, naoDevolvido: null,
  parcelasPagas: null, parcelasAbertas: null, canceladas: null, devolucoes: null, proxima: null, terminaEm: null, ultimoPagamento: null,
  totalParcelas: null, custo: 0, ...x,
});
const base = {
  valorContrato: null, iofTarifas: null, forma: "TRANSFERENCIA", parcelasAntes: 0, noCaixa: true, anteriorAoT3jus: false, foraDoCaixa: null,
  registrado: { em: "2026-09-05T13:00:00Z", por: MARINA }, encerrado: null, cancelado: null,
};
// O Banco do Brasil, de antes do T3jus: 40 de R$ 2.090,00, 16 pagas antes, 2 pagas aqui.
const EMP_BB = {
  ...base, id: BB, credorTipo: "BANCO", credor: "Banco do Brasil", finalidade: "Capital de giro", valor: 6000000, recebidoEm: "2025-03-10",
  devolucao: "PARCELAS", parcelasTotal: 40, parcelasAntes: 16, parcelaValor: 209000, noCaixa: false, anteriorAoT3jus: true, foraDoCaixa: "ANTES_DO_T3JUS",
  situacao: situacao({
    pagoAntes: 3344000, pagoNoT3jus: 418000, jaPago: 3762000, faltaPagar: 4598000, parcelasPagas: 18, parcelasAbertas: 22,
    proxima: { id: conta(19), n: 19, vencimento: "2026-11-20", valor: 209000 }, terminaEm: "2028-08-20", ultimoPagamento: "2026-10-20", totalParcelas: 8360000, custo: 2360000,
  }),
};
// O Sicoob: 24 de R$ 1.450,00, entrou em setembro, nada pago ainda.
const EMP_SICOOB = {
  ...base, id: SICOOB, credorTipo: "BANCO", credor: "Sicoob", finalidade: "Reforma da sala", valor: 3000000, recebidoEm: "2026-09-05",
  devolucao: "PARCELAS", parcelasTotal: 24, parcelaValor: 145000,
  situacao: situacao({
    faltaPagar: 3480000, parcelasPagas: 0, parcelasAbertas: 24, proxima: { id: contaSicoob(1), n: 1, vencimento: "2026-12-05", valor: 145000 },
    terminaEm: "2028-11-05", totalParcelas: 3480000, custo: 480000,
  }),
};
// A sócia, que devolve quando der: R$ 8.000,00, R$ 2.000,00 devolvidos.
const EMP_SOCIA = {
  ...base, id: SOCIA, credorTipo: "SOCIO", credor: "Marina Ribeiro", finalidade: "Folha de outubro", valor: 800000, recebidoEm: "2026-10-02", forma: "PIX",
  devolucao: "LIVRE", parcelasTotal: null, parcelaValor: null,
  situacao: situacao({ pagoNoT3jus: 200000, jaPago: 200000, faltaPagar: 600000, faltaDevolver: 600000, devolucoes: 1, ultimoPagamento: "2026-11-03", custo: 0 }),
};
const EMPRESTIMOS = {
  algum: true, n: 3, faltaPagar: 8678000, noSaldo: 3182000, comecoCaixa: "2026-02-01", primeiroLancamento: "2026-02-01",
  lista: [EMP_SOCIA, EMP_SICOOB, EMP_BB],
};
const mes = (m: string, ent: number, entR: number | null, sai: number, saiR: number | null, saldo: number, emp: Record<string, unknown>) => ({
  mes: m, entradasPrevistas: ent, entradasRealizadas: entR, saidasPrevistas: sai, saidasRealizadas: saiR, saldo,
  emprestimos: { entrou: 0, parcelasPrevistas: 0, parcelasRealizadas: null, liquidoPrevisto: 0, liquidoRealizado: null, ...emp },
});
const CAIXA = {
  hoje: HOJE, mes: "2026-11-01", saldo: 4031000, fechaMes: 3985000, dono: true,
  terceiros: { saldo: 0, honorarios: 0, clientes: 0, peritos: 0, parceiros: 0, outros: 0 },
  abertura: null,
  aCaminho: { total: 0, n: 0, naPrevisao: 0, passou: { valor: 0, n: 0 }, itens: [] },
  meses: [
    mes("2026-10-01", 4720000, 4505000, 4140000, 4087000, 3245000, { entrou: 800000, parcelasPrevistas: 209000, parcelasRealizadas: 209000, liquidoPrevisto: 591000, liquidoRealizado: 591000 }),
    mes("2026-11-01", 4830000, 3124000, 4090000, 2338000, 4031000, { parcelasPrevistas: 409000, parcelasRealizadas: 409000, liquidoPrevisto: -409000, liquidoRealizado: -409000 }),
    mes("2026-12-01", 4690000, null, 4660000, null, 3661000, { parcelasPrevistas: 354000, liquidoPrevisto: -354000 }),
  ],
  exportacoes: [], mesesExportar: ["2026-11-01", "2026-10-01"],
  emprestimos: EMPRESTIMOS,
};
const PREVIA = {
  mes: "2026-10-01", aberto: false, recebimentos: { n: 41, valor: 4382000 }, honorariosTransferidos: { n: 0, valor: 0 },
  despesas: { n: 31, valor: 4087000 }, recibos: 40, terceiros: { entrou: 0, repassado: 0 },
  emprestimos: { recebidos: { n: 1, valor: 800000 }, parcelas: { n: 2, valor: 409000, devolucoes: 1, semComprovante: 1 } },
};

const parcela = (n: number, vencimento: string, paga: string | null, extra: Record<string, unknown> = {}) => ({
  id: conta(n), n, descricao: `Banco do Brasil · parcela ${n}/40`, fornecedor: "Banco do Brasil", categoria: "EMPRESTIMOS", valor: 209000,
  valorPago: paga ? 209000 : null, vencimento, forma: "DEBITO_AUTOMATICO", pagaEm: paga, situacao: paga ? "PAGA" : "A_VENCER",
  recorrente: null, adiantada: null, anexos: 0, emprestimo: { id: BB, parcela: n, total: 40, credor: "Banco do Brasil", credorTipo: "BANCO", devolucao: false },
  ...extra,
});
const mesDaParcela = (n: number) => {
  const d = new Date(Date.UTC(2026, 8 + (n - 17), 20));
  return d.toISOString().slice(0, 10);
};
const FICHA_BB = {
  ...EMP_BB,
  parcelas: Array.from({ length: 24 }, (_, i) => {
    const n = i + 17;
    return parcela(n, mesDaParcela(n), n <= 18 ? mesDaParcela(n) : null);
  }),
  devolucoes: [],
  historico: [
    { acao: "financeiro.conta_paga", em: "2026-10-20T14:00:00Z", por: MARINA, dados: { pagaEm: "2026-10-20", valor: 209000 } },
    { acao: "financeiro.conta_paga", em: "2026-09-21T14:00:00Z", por: MARINA, dados: { pagaEm: "2026-09-20", valor: 209000 } },
    { acao: "financeiro.emprestimo_registrado", em: "2026-09-05T13:00:00Z", por: MARINA,
      dados: { credorTipo: "BANCO", valor: 6000000, recebidoEm: "2025-03-10", devolucao: "PARCELAS", noCaixa: false, parcelas: 40, parcelasAntes: 16, parcelasCriadas: 24 } },
  ],
};
const FICHA_SICOOB = {
  ...EMP_SICOOB,
  parcelas: Array.from({ length: 24 }, (_, i) => ({
    ...parcela(i + 1, new Date(Date.UTC(2026, 11 + i, 5)).toISOString().slice(0, 10), null),
    id: contaSicoob(i + 1), descricao: `Sicoob · parcela ${i + 1}/24`, fornecedor: "Sicoob", valor: 145000,
    emprestimo: { id: SICOOB, parcela: i + 1, total: 24, credor: "Sicoob", credorTipo: "BANCO", devolucao: false },
  })),
  devolucoes: [],
  historico: [{ acao: "financeiro.emprestimo_registrado", em: "2026-09-05T13:00:00Z", por: MARINA,
    dados: { credorTipo: "BANCO", valor: 3000000, recebidoEm: "2026-09-05", devolucao: "PARCELAS", noCaixa: true, parcelas: 24, parcelasAntes: 0, parcelasCriadas: 24 } }],
};
const DEVOLUCAO = {
  id: conta(90), descricao: "Devolução a Marina Ribeiro", fornecedor: "Marina Ribeiro", categoria: "EMPRESTIMOS", valor: 200000, valorPago: 200000,
  vencimento: "2026-11-03", forma: "PIX", pagaEm: "2026-11-03", situacao: "PAGA", recorrente: null, adiantada: null, anexos: 0,
  emprestimo: { id: SOCIA, parcela: null, total: null, credor: "Marina Ribeiro", credorTipo: "SOCIO", devolucao: true },
};
const FICHA_SOCIA = {
  ...EMP_SOCIA, parcelas: [], devolucoes: [DEVOLUCAO],
  historico: [
    { acao: "financeiro.emprestimo_devolucao", em: "2026-11-03T15:00:00Z", por: MARINA, dados: { conta: conta(90), valor: 200000, pagaEm: "2026-11-03", acimaDoQueFalta: 0 } },
    { acao: "financeiro.emprestimo_registrado", em: "2026-10-02T13:00:00Z", por: MARINA,
      dados: { credorTipo: "SOCIO", valor: 800000, recebidoEm: "2026-10-02", devolucao: "LIVRE", noCaixa: true, parcelas: null, parcelasAntes: 0, parcelasCriadas: 0 } },
  ],
};

const comuns = (caixa: unknown = CAIXA) => ({
  "/v1/escritorio": { corpo: ESCRITORIO },
  "GET /v1/escritorio/financeiro/caixa": { corpo: caixa },
  "GET /v1/escritorio/financeiro/exportacoes/previa?mes=2026-10-01": { corpo: PREVIA },
  "GET /v1/escritorio/financeiro/exportacoes/previa?mes=2026-11-01": { corpo: { ...PREVIA, mes: "2026-11-01", aberto: true } },
  "POST /v1/escritorio/financeiro/anexos/buscar": { corpo: { anexos: [] } },
  [`GET ${API}/${BB}`]: { corpo: FICHA_BB },
  [`GET ${API}/${SICOOB}`]: { corpo: FICHA_SICOOB },
  [`GET ${API}/${SOCIA}`]: { corpo: FICHA_SOCIA },
});

test.describe("Financeiro do Portal, Empréstimos (F3.51, FI-20)", () => {
  test("Caixa: a folha à parte, o falta pagar, a linha do saldo e a coluna do mês a mês", async ({ page }) => {
    await simular(page, comuns());
    await page.goto(`${P}/financeiro/caixa`);
    const folha = page.getByRole("region", { name: "Empréstimos" });
    await expect(folha).toContainText("À parte · entra no saldo, mas não é receita");
    await expect(folha.getByRole("link", { name: "Banco do Brasil" })).toHaveAttribute("href", `/financeiro/caixa/emprestimos/${BB}`);
    await expect(folha).toContainText("Anterior ao T3jus");
    await expect(folha).toContainText("Falta pagar · 18 de 40 pagas · termina em ago/2028");
    await expect(folha).toContainText("Próxima: 19/40, sexta, 20/11");
    await expect(folha).toContainText("Falta devolver · sem juros · devolvido R$ 2.000,00 de R$ 8.000,00");
    await expect(folha.getByRole("link", { name: "Registrar devolução a Marina Ribeiro" })).toHaveAttribute("href", `/financeiro/caixa/emprestimos/${SOCIA}?devolver=1`);
    await expect(folha).toContainText("Falta pagar, nos 3 empréstimos ativos");
    await expect(folha).toContainText("R$ 86.780,00");
    await expect(page.getByRole("region", { name: "Do escritório · hoje" })).toContainText("Inclui R$ 31.820,00 de empréstimos, já descontado o que foi pago. Entra no saldo, mas não é receita.");
    const meses = page.getByRole("region", { name: "Mês a mês" });
    // F3.124: com a coluna Empréstimos, a tabela precisa de 720 px de folha. No celular e no computador
    // até 1440 (folha de 564 px a 1280), fica a lista do celular; a tabela aparece com a folha larga.
    const lista = meses.getByRole("list", { name: "Mês a mês" });
    await expect(lista.getByRole("listitem").nth(1)).toContainText("Empréstimos−R$ 4.090,00");
    await expect(lista.getByRole("listitem").nth(2)).toContainText("−R$ 3.540,00 prev.");
    if (!ehCelular(page)) {
      await page.setViewportSize({ width: 1920, height: 1000 });
      await expect(lista).toBeHidden();
      const tab = meses.getByRole("table", { name: "Entradas, saídas, empréstimos e saldo por mês" });
      await expect(tab.getByRole("columnheader", { name: /Empréstimos/ })).toBeVisible();
      await expect(tab.getByRole("row", { name: /Outubro/ })).toContainText("+R$ 5.910,00");
      await expect(tab.getByRole("row", { name: /Dezembro \(previsto\)/ })).toContainText("−R$ 3.540,00previsto");
    }
    await expect(meses).toContainText("Entra no saldo, mas não é receita nem despesa.");
    await semViolacoes(page);
  });

  test("Caixa sem empréstimo: só a linha discreta, que abre a janela; sem coluna no mês a mês", async ({ page }) => {
    const vazio = { ...EMPRESTIMOS, algum: false, n: 0, faltaPagar: 0, noSaldo: 0, lista: [] };
    await simular(page, comuns({ ...CAIXA, emprestimos: vazio, meses: CAIXA.meses.map((m) => ({ ...m, emprestimos: undefined })) }));
    await page.goto(`${P}/financeiro/caixa`);
    await expect(page.getByText("Pegou empréstimo de banco ou de sócio? Registre aqui: entra no saldo, mas não conta como receita.")).toBeVisible();
    await expect(page.getByRole("region", { name: "Empréstimos" })).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Do escritório · hoje" })).not.toContainText("de empréstimos");
    if (!ehCelular(page)) await expect(page.getByRole("table", { name: "Entradas, saídas e saldo por mês" })).toBeVisible();
    await semViolacoes(page);
    await page.getByRole("button", { name: "Registrar empréstimo" }).click();
    await expect(page.getByRole("dialog", { name: "Registrar empréstimo" })).toBeVisible();
  });

  test("Registrar em parcelas: erros presos ao campo, a prévia do que nasce em A pagar, uma parcela trocada e o que vai ao servidor", async ({ page }) => {
    const registrado = {
      ...EMP_SICOOB, id: NOVO, credor: "Caixa Econômica", finalidade: "Capital de giro", valor: 2000000, valorContrato: 2060000, iofTarifas: 60000,
      recebidoEm: "2026-11-10", parcelasTotal: 12, parcelaValor: 200000, parcelasCriadas: 12,
      situacao: situacao({ faltaPagar: 2050000, parcelasAbertas: 12, proxima: { id: conta(1), n: 1, vencimento: "2026-12-10", valor: 250000 } }),
    };
    const pedidos = await simular(page, {
      ...comuns(),
      [`POST ${API}`]: [
        { status: 500, corpo: { erro: { codigo: "INTERNAL_ERROR", mensagem: "falhou" } } },
        { status: 201, corpo: registrado },
      ],
    });
    await page.goto(`${P}/financeiro/caixa`);
    await page.getByRole("region", { name: "Empréstimos" }).getByRole("button", { name: "Registrar empréstimo" }).click();
    const j = page.getByRole("dialog", { name: "Registrar empréstimo" });
    await expect(j.getByRole("radio", { name: /Banco ou financeira/ })).toBeChecked();
    await expect(j.getByRole("status").filter({ hasText: "aparecem aqui quando você preencher" })).toBeVisible();
    await j.getByRole("button", { name: "Registrar empréstimo" }).click();
    await expect(j.getByRole("alert").filter({ hasText: "Falta acertar" })).toBeVisible();
    await expect(j.getByLabel("Nome do banco ou da pessoa")).toBeFocused();
    await expect(j.getByLabel("Nome do banco ou da pessoa")).toHaveAccessibleDescription(/Escreva o nome do banco ou da pessoa que emprestou\./);
    await semViolacoes(page);

    await j.getByLabel("Nome do banco ou da pessoa").fill("Caixa Econômica");
    await j.getByLabel("Para que (opcional)").fill("Capital de giro");
    await j.getByLabel("Valor que entrou na conta").fill("20.000,00");
    await j.getByLabel("Dia em que entrou").fill("10/11/2026");
    await j.getByText("Mais detalhes: valor do contrato").click();
    await j.getByLabel("Valor do contrato (opcional)").fill("20.600,00");
    await j.getByLabel("Número de parcelas").fill("12");
    await j.getByLabel("Valor da parcela", { exact: true }).fill("2.000,00");
    await j.getByLabel("Já pagou alguma parcela antes?").fill("0");
    await j.getByLabel("Vencimento da próxima parcela a pagar").fill("10/12/2026");
    const previa = j.getByRole("status").filter({ hasText: "O que vai nascer em A pagar" });
    await expect(previa).toContainText("12 parcelas de R$ 2.000,00 · de 10/12/2026 a 10/11/2027");
    await expect(previa).toContainText("Custo do empréstimo: R$ 4.000,00");
    await expect(previa).toContainText("IOF e tarifas na liberação: R$ 600,00");
    await j.getByText("Ver e mudar o valor de cada parcela").click();
    await j.getByLabel("Valor da parcela 1, que vence em 10/12/2026").fill("2.500,00");
    await expect(previa).toContainText("12 parcelas, somando R$ 24.500,00");
    await expect(previa).toContainText("Custo do empréstimo: R$ 4.500,00");
    await semViolacoes(page);

    await j.getByRole("button", { name: "Registrar empréstimo" }).click();
    await expect(j.getByRole("alert").filter({ hasText: "Não deu para registrar o empréstimo." })).toContainText("nenhuma parcela entrou em A pagar");
    await expect(j.getByRole("alert")).toContainText("INTERNAL_ERROR");
    await expect(j.getByRole("button", { name: "Tentar de novo" })).toBeFocused();
    await j.getByRole("button", { name: "Tentar de novo" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Empréstimo registrado. As 12 parcelas já estão em A pagar." }))
      .toContainText("Caixa Econômica: R$ 20.000,00 entraram no saldo do Caixa, sem contar como receita. A primeira parcela vence em 10/12/2026.");
    const corpo = pedidos.filter((p) => p.metodo === "POST" && p.caminho === API).at(-1)!.corpo;
    expect(corpo).toEqual({
      credorTipo: "BANCO", credorNome: "Caixa Econômica", finalidade: "Capital de giro", valor: 2000000, valorContrato: 2060000,
      recebidoEm: "2026-11-10", forma: "TRANSFERENCIA", devolucao: "PARCELAS", parcelasTotal: 12, parcelaValor: 200000, parcelasAntes: 0,
      proximoVencimento: "2026-12-10", parcelas: [{ n: 1, valor: 250000 }, ...Array.from({ length: 11 }, (_, i) => ({ n: i + 2, valor: 200000 }))],
    });
  });

  test("Registrar o antigo: entrou antes do T3jus, a próxima parcela mais de um mês atrás e a sugestão das pagas antes", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(), [`POST ${API}`]: { status: 201, corpo: { ...EMP_BB, id: NOVO, parcelasCriadas: 26, parcelasAntes: 14 } },
    });
    await page.goto(`${P}/financeiro/caixa?registrar=1`);
    const j = page.getByRole("dialog", { name: "Registrar empréstimo" });
    await j.getByLabel("Nome do banco ou da pessoa").fill("Banco do Brasil");
    await j.getByLabel("Valor que entrou na conta").fill("60.000,00");
    await j.getByLabel("Dia em que entrou").fill("10/03/2025");
    await expect(j.getByText("Entrou antes do T3jus: não soma no saldo.", { exact: true })).toBeVisible();
    await j.getByLabel("Número de parcelas").fill("40");
    await j.getByLabel("Valor da parcela", { exact: true }).fill("2.090,00");
    await j.getByLabel("Já pagou alguma parcela antes?").fill("10");
    await j.getByLabel("Vencimento da próxima parcela a pagar").fill("10/08/2026");
    const c6 = j.getByRole("group", { name: /A próxima parcela que você pôs vence em 10\/08\/2026/ });
    await expect(c6).toContainText(/As parcelas até novembro de 2026 já foram pagas\?/i);
    await expect(c6.getByRole("radio", { name: /Sim, 14 parcelas foram pagas antes do T3jus/ })).toBeChecked();
    await expect(c6).toContainText("A próxima a pagar é a 15/40, em 10/12/2026. Nenhuma fica vencida.");
    await expect(j.getByRole("status").filter({ hasText: "26 parcelas de R$ 2.090,00" })).toContainText("Pago antes do T3jus: 14 parcelas, R$ 29.260,00");
    await expect(j).toContainText("Fica fora do saldo, porque entrou antes do T3jus.");
    await semViolacoes(page);
    await c6.getByRole("radio", { name: /Uma ficou em aberto/ }).check();
    await expect(j.getByRole("status").filter({ hasText: "27 parcelas de R$ 2.090,00" })).toContainText("de 10/11/2026");
    await c6.getByRole("radio", { name: /Sim, 14 parcelas/ }).check();
    await j.getByRole("button", { name: "Registrar empréstimo" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Empréstimo registrado." })).toContainText("Fica fora do saldo, porque entrou antes do T3jus.");
    expect(pedidos.find((p) => p.metodo === "POST" && p.caminho === API)!.corpo).toMatchObject({
      recebidoEm: "2025-03-10", parcelasTotal: 40, parcelaValor: 209000, parcelasAntes: 14, proximoVencimento: "2026-12-10", parcelas: null,
    });
  });

  test("Registrar o da sócia, que devolve quando der: sem parcelas e com o falta devolver", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(), [`POST ${API}`]: { status: 201, corpo: { ...EMP_SOCIA, id: NOVO, parcelasCriadas: 0 } },
    });
    await page.goto(`${P}/financeiro/caixa`);
    await page.getByRole("region", { name: "Empréstimos" }).getByRole("button", { name: "Registrar empréstimo" }).click();
    const j = page.getByRole("dialog", { name: "Registrar empréstimo" });
    await j.getByRole("radio", { name: /Sócio do escritório/ }).check();
    await j.getByLabel("Nome do sócio").fill("Marina Ribeiro");
    await j.getByLabel("Valor que entrou na conta").fill("8.000,00");
    await j.getByLabel("Dia em que entrou").fill("02/10/2026");
    await j.getByLabel("Como entrou").selectOption("PIX");
    await j.getByRole("radio", { name: /Devolve quando der/ }).check();
    await expect(j.getByLabel("Número de parcelas")).toHaveCount(0);
    await expect(j.getByRole("status").filter({ hasText: "Sem parcelas fixas" })).toContainText("Falta devolver começa em R$ 8.000,00, sem juros.");
    await semViolacoes(page);
    await j.getByRole("button", { name: "Registrar empréstimo" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Empréstimo registrado." })).toContainText("Cada devolução se registra na ficha do empréstimo.");
    expect(pedidos.find((p) => p.metodo === "POST" && p.caminho === API)!.corpo).toEqual({
      credorTipo: "SOCIO", credorNome: "Marina Ribeiro", finalidade: null, valor: 800000, valorContrato: null, recebidoEm: "2026-10-02", forma: "PIX",
      devolucao: "LIVRE", parcelasTotal: null, parcelaValor: null, parcelasAntes: null, proximoVencimento: null, parcelas: null,
    });
  });

  test("Ficha em parcelas: as pagas antes do T3jus, a próxima para marcar paga, Ver todas e encerrar as que faltam", async ({ page }) => {
    const encerrado = { ...FICHA_BB, encerrado: { em: "2026-11-18T13:00:00Z", por: MARINA, motivo: "Quitamos antes com o saldo devedor do banco." } };
    const pedidos = await simular(page, {
      ...comuns(),
      [`GET ${API}/${BB}`]: [{ corpo: FICHA_BB }, { corpo: encerrado }],
      [`POST ${API}/${BB}/encerrar`]: [
        { status: 422, corpo: { erro: { codigo: "VALIDATION_ERROR", mensagem: "x", detalhes: { motivo: "JA_ENCERRADO" } } } },
        { corpo: EMP_BB },
      ],
    });
    await page.goto(`${P}/financeiro/caixa/emprestimos/${BB}`);
    await expect(page.getByRole("heading", { level: 1, name: "Banco do Brasil" })).toBeVisible();
    await expect(page.getByText("Empréstimo · Banco ou financeira")).toBeVisible();
    const parc = page.getByRole("region", { name: "Parcelas" });
    await expect(parc).toContainText("Total das parcelasR$ 83.600,00");
    await expect(parc).toContainText("antes do T3jus: R$ 33.440,00 (estimado)");
    await expect(parc).toContainText("Entrou antes do T3jus: não soma no saldo.");
    await expect(parc).toContainText("Pagas antes do T3jus");
    await expect(parc.getByRole("button", { name: /Marcar paga a parcela \d+\/40/ })).toHaveCount(1);
    await expect(parc.getByRole("button", { name: "Marcar paga a parcela 19/40" })).toBeVisible();
    await expect(parc).toContainText("Mais 18 parcelas em aberto, até 20/08/2028");
    await expect(page.getByRole("region", { name: "Histórico" })).toContainText("registrou o empréstimo");
    await expect(page.getByRole("region", { name: "Dados do empréstimo" })).toContainText("Entrou antes do começo do caixa no T3jus.");
    await semViolacoes(page);
    await parc.getByRole("button", { name: "Ver todas" }).click();
    await expect(parc.getByRole("button", { name: "Ver todas" })).toHaveCount(0);

    await page.getByRole("button", { name: "Encerrar as parcelas que faltam" }).click();
    const j = page.getByRole("alertdialog", { name: "Encerrar as parcelas que faltam" });
    await expect(j).toContainText("As 22 parcelas em aberto (R$ 45.980,00) serão canceladas");
    await expect(j.getByLabel("Motivo")).toBeFocused();
    await j.getByRole("button", { name: "Encerrar as 22 parcelas" }).click();
    await expect(j.getByLabel("Motivo")).toHaveAccessibleDescription(/Escreva o motivo, de 5 a 300 caracteres\./);
    await semViolacoes(page);
    await j.getByLabel("Motivo").fill("Quitamos antes com o saldo devedor do banco.");
    await j.getByRole("button", { name: "Encerrar as 22 parcelas" }).click();
    await expect(j.getByRole("alert").filter({ hasText: "Não deu para encerrar." })).toContainText("Este empréstimo já foi encerrado. Recarregue a página para ver. Nada mudou.");
    await j.getByRole("button", { name: "Encerrar as 22 parcelas" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Parcelas encerradas." })).toContainText("As 22 parcelas em aberto foram canceladas em A pagar.");
    expect(pedidos.filter((p) => p.caminho === `${API}/${BB}/encerrar`).at(-1)!.corpo).toEqual({ motivo: "Quitamos antes com o saldo devedor do banco." });
    await expect(page.getByText("Parcelas encerradas por Marina Ribeiro hoje, às 10h00.")).toBeVisible();
    await expect(page.getByRole("button", { name: /Encerrar|Lançado errado|Marcar/ })).toHaveCount(0);
  });

  test("Ficha da sócia, vinda do Caixa: a devolução já abre, avisa do que passa e manda o que foi escrito; depois, encerrar", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(),
      [`POST ${API}/${SOCIA}/devolucoes`]: { status: 201, corpo: { id: conta(91), acimaDoQueFalta: 100000, emprestimo: { ...EMP_SOCIA, situacao: { ...EMP_SOCIA.situacao, faltaDevolver: 0 } } } },
    });
    await page.goto(`${P}/financeiro/caixa/emprestimos/${SOCIA}?devolver=1`);
    const j = page.getByRole("dialog", { name: "Registrar devolução" });
    await expect(j).toBeVisible();
    await expect(page).toHaveURL(`${P}/financeiro/caixa/emprestimos/${SOCIA}`);
    await expect(j.getByLabel("Dia em que saiu da conta")).toHaveValue("18/11/2026");
    await j.getByLabel("Valor devolvido").fill("7.000,00");
    await expect(j).toContainText("Passa R$ 1.000,00 do que falta devolver.");
    await semViolacoes(page);
    await j.getByRole("button", { name: "Registrar devolução" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Devolução registrada." })).toContainText("Nada falta devolver: o empréstimo está quitado.");
    expect(pedidos.find((p) => p.caminho === `${API}/${SOCIA}/devolucoes`)!.corpo).toEqual({ valor: 700000, pagaEm: "2026-11-18", forma: "PIX" });

    const dev = page.getByRole("region", { name: "Devoluções" });
    await expect(dev).toContainText("Devolvido");
    await expect(dev).toContainText("Falta devolverR$ 6.000,00");
    await page.getByRole("button", { name: "Encerrar o empréstimo" }).click();
    const e = page.getByRole("alertdialog", { name: "Encerrar o empréstimo" });
    await expect(e).toContainText("Ficam R$ 6.000,00 sem devolver");
    await semViolacoes(page);
  });

  test("Ficha sem nada pago: Lançado errado, com a recusa do servidor e o pedido; o cancelado fica só para leitura", async ({ page }) => {
    const cancelado = {
      ...FICHA_SICOOB, cancelado: { em: "2026-11-17T18:00:00Z", por: MARINA, motivo: "Valor da parcela errado." },
      situacao: { ...FICHA_SICOOB.situacao, situacao: "CANCELADO", faltaPagar: 0, canceladas: { n: 24, valor: 3480000 }, proxima: null },
      parcelas: FICHA_SICOOB.parcelas.map((p) => ({ ...p, situacao: "CANCELADA", cancelada: { em: "2026-11-17T18:00:00Z", por: MARINA, motivo: "x" } })),
    };
    const pedidos = await simular(page, {
      ...comuns(),
      [`GET ${API}/${SICOOB}`]: [{ corpo: FICHA_SICOOB }, { corpo: cancelado }],
      [`POST ${API}/${SICOOB}/cancelar`]: [
        { status: 422, corpo: { erro: { codigo: "VALIDATION_ERROR", mensagem: "x", detalhes: { motivo: "EMPRESTIMO_COM_PAGAMENTO" } } } },
        { corpo: EMP_SICOOB },
      ],
    });
    await page.goto(`${P}/financeiro/caixa/emprestimos/${SICOOB}`);
    await expect(page.getByRole("region", { name: "Registrou errado?" })).toContainText("Nada foi pago ainda.");
    await page.getByRole("button", { name: "Lançado errado" }).click();
    const j = page.getByRole("alertdialog", { name: "Lançado errado" });
    await expect(j).toContainText("Sai do saldo do Caixa: R$ 30.000,00");
    await expect(j).toContainText("As 24 parcelas em aberto (R$ 34.800,00) são canceladas");
    await j.getByLabel("Motivo").fill("Valor da parcela errado.");
    await expect(j).toContainText("24 de 300");
    await semViolacoes(page);
    await j.getByRole("button", { name: "Marcar como lançado errado" }).click();
    await expect(j.getByRole("alert")).toContainText("Já há parcela ou devolução paga.");
    await j.getByRole("button", { name: "Marcar como lançado errado" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Marcado como lançado errado." })).toBeVisible();
    expect(pedidos.filter((p) => p.caminho === `${API}/${SICOOB}/cancelar`).at(-1)!.corpo).toEqual({ motivo: "Valor da parcela errado." });
    await expect(page.getByText("Marcado como lançado errado por Marina Ribeiro em 17/11/2026, às 15h00.")).toBeVisible();
    await expect(page.getByText("Lançado errado · fora do caixa")).toBeVisible();
    await expect(page.getByRole("button", { name: /Encerrar|Lançado errado|Marcar/ })).toHaveCount(0);
    await semViolacoes(page);
  });

  test("A pagar: o selo leva à ficha, a categoria fica à parte; Lançar conta não oferece Empréstimos e leva ao Caixa", async ({ page }) => {
    const p19 = { ...parcela(19, "2026-11-20", null), n: undefined, anexos: undefined };
    const lista = {
      algum: true, mes: "2026-11-01",
      totais: { semana: { valor: 209000, contas: 1 }, vencidas: { valor: 0, contas: 0 }, recorrentes: { contas: 0, sozinhas: 0 }, reembolsar: { valor: 0, clientes: 0 } },
      contas: [p19], depois: null, adiantados: [],
      categorias: [{ categoria: "ALUGUEL", valor: 430000 }, { categoria: "EMPRESTIMOS", valor: 409000 }],
    };
    await simular(page, { ...comuns(), "GET /v1/escritorio/financeiro/pagar": { corpo: lista }, "GET /v1/escritorio/clientes": { corpo: { clientes: [], total: 0 } } });
    await page.goto(`${P}/financeiro/a-pagar`);
    const selo = page.getByRole("link", { name: "Empréstimo · 19/40: abrir a ficha de Banco do Brasil" }).first();
    await expect(selo).toHaveAttribute("href", `/financeiro/caixa/emprestimos/${BB}`);
    await expect(selo).toContainText("Empréstimo · 19/40");
    await expect(page.getByText("Nasceu do empréstimo").first()).toBeVisible();
    const parte = page.getByRole("group", { name: "Empréstimos, à parte" });
    await expect(parte).toContainText("R$ 4.090,00");
    await expect(page.getByText("Pagas e a pagar no mês")).toBeVisible();
    await expect(page.getByText("As parcelas de empréstimo também ficam fora do total.")).toBeVisible();
    await semViolacoes(page);
    await page.getByRole("button", { name: "Lançar conta" }).first().click();
    const j = page.getByRole("dialog", { name: "Lançar conta" });
    await expect(j.getByLabel("Categoria").locator("option", { hasText: "Empréstimos" })).toHaveCount(0);
    await expect(j.getByLabel("Categoria")).toHaveAccessibleDescription(/Parcela de empréstimo\? Registre o empréstimo no Caixa/);
    await expect(j.getByRole("link", { name: "Registrar no Caixa" })).toHaveAttribute("href", "/financeiro/caixa?registrar=1");
    await semViolacoes(page);
  });

  test("Exportar: os empréstimos vão numa aba à parte, com o que entrou e o que foi pago no mês", async ({ page }) => {
    await simular(page, comuns());
    await page.goto(`${P}/financeiro/caixa`);
    await page.getByRole("button", { name: "Exportar para o contador" }).click();
    const j = page.getByRole("dialog", { name: "Exportar para o contador" });
    await expect(j).toContainText("Saldo do caixa no começo e no fim do mêsSem saldo de abertura, o saldo começa em R$ 0,00 e com os empréstimos");
    await expect(j).toContainText("Empréstimos numa aba à parte");
    await expect(j).toContainText("1 recebido (R$ 8.000,00) e 2 pagamentos (R$ 4.090,00): 1 parcela e 1 devolução, 1 sem comprovante.");
    await semViolacoes(page);
  });
});
