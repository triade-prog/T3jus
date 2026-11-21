// Relatórios do sócio no Financeiro (F3.70; IN-02 a IN-05, IN-07, IN-08, IN-09, IN-12, IN-14,
// IN-15), tela aprovada em docs/design/aprovadas/portal-relatorios. Só a sócia dona vê; o período
// abre nos últimos 3 meses; terceiros só na folha âmbar. A API é simulada.
import { expect, test, type Page } from "@playwright/test";
import { semViolacoes } from "./console-dados.ts";

const P = "http://localhost:3000";
const ESC = "e0000000-0000-4000-8000-0000000000a1";
const VALE = "c1000000-0000-4000-8000-000000000301";
const HELIO = "c1000000-0000-4000-8000-000000000302";
const MARINA = { id: "a0000000-0000-4000-8000-000000000101", nome: "Marina Ribeiro" };
const FELIPE = { id: "a0000000-0000-4000-8000-000000000105", nome: "Felipe Matos" };

const BASE = {
  id: ESC, nome: "Ribeiro & Matos", socios: ["Marina Ribeiro"], pessoas: 5, outrosEscritorios: 0, cnpj: null, cidade: "São Paulo", uf: "SP",
  endereco: null, contatos: [], ultimaExportacao: null,
};
const ESC_MARINA = { ...BASE, pessoa: "Marina Ribeiro", dono: true, areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"], funcoes: ["SOCIO"] };
const ESC_BIANCA = { ...BASE, pessoa: "Bianca Torres", dono: false, areas: ["CONTRATOS", "FINANCEIRO"], funcoes: ["EQUIPE"] };

const PERIODO = { de: "2026-09-01", ate: "2026-11-18", comparar: "anterior", cde: "2026-06-01", cate: "2026-08-31", hoje: "2026-11-18", aberto: true };
const RESUMO = {
  periodo: PERIODO, algum: true, primeiro: "2026-02-03",
  entrou: { valor: 11620000, n: 41, anterior: 12203000, previstoMes: 1706000 },
  falta: {
    valor: 4207000, vencido: 705000, vencidas: 4, anterior: 3890000, vencidoAnterior: 410000,
    faixas: [{ valor: 585000, n: 3 }, { valor: 120000, n: 1 }, { valor: 0, n: 0 }, { valor: 0, n: 0 }],
    aVencerMes: { valor: 1206000, n: 8 }, aVencerDepois: { valor: 2296000, n: 14 },
    aparte: { valor: 2130000, lista: [{ id: "d1", tipo: "PRECATORIO", valor: 2130000, prazo: "2027-07-01", cliente: "Hélio Batista Corrêa", caso: "Corrêa x Estado" }],
      caminho: { valor: 675000, lista: [
        { id: "r1", tipo: "RPV", valor: 486000, estimadaMes: "2027-01-01", passou: false, cliente: "Eduardo Nascimento", caso: "Nascimento x Prefeitura" },
        { id: "r2", tipo: "RPV", valor: 189000, estimadaMes: "2026-10-01", passou: true, cliente: "Irene Castro", caso: "Castro x INSS" }] } },
  },
  rendeu: { valor: 11481500, adiantado: 138500, anterior: 12100000, despesas: [
    { id: "x1", descricao: "Perícia", valor: 90000, cliente: "Hélio Batista Corrêa" }, { id: "x2", descricao: "Custas", valor: 48500, cliente: "Daniela Rocha Mendes" }] },
  contratado: 15800000,
  meses: [
    { mes: "2026-09-01", anterior: false, valor: 3991000, parcial: false }, { mes: "2026-10-01", anterior: false, valor: 4505000, parcial: false },
    { mes: "2026-11-01", anterior: false, valor: 3124000, parcial: true }, { mes: "2026-06-01", anterior: true, valor: 3900000, parcial: false },
    { mes: "2026-07-01", anterior: true, valor: 4100000, parcial: false }, { mes: "2026-08-01", anterior: true, valor: 4203000, parcial: false },
  ],
  clientes: { n: 18, top: [
    { id: VALE, nome: "Construtora Vale Alto Ltda.", inativo: false, contratos: 3, entrou: 1445000 },
    { id: HELIO, nome: "Hélio Batista Corrêa", inativo: false, contratos: 1, entrou: 300000 },
  ] },
  areas: [{ area: "SEM_CASO", entrou: 3370000, casos: 0, contratos: 7 }, { area: "CIVEL", entrou: 2100000, casos: 5, contratos: 5 }],
  terceiros: { entrou: 16620656, n: 6, porTipo: { RPV: 3, ACORDO: 2, ALVARA: 1 }, repassado: 9631800, clientesRepassados: ["Irene Campos", "João Pedro Alves"],
    honorarios: 3918360, reembolso: 42000, outros: 0, naConta: 3028496 },
};
const cli = (id: string, nome: string, entrou: number, rendeu: number, x: Record<string, unknown> = {}) => ({
  id, nome, inativo: false, contratos: 1, responsaveis: ["Felipe Matos"], areas: ["CIVEL"], contratado: entrou, aparte: [],
  entrou, adiantado: entrou - rendeu, rendeu, falta: 240000, vencido: 0, ...x,
});
const CLIENTES = { periodo: PERIODO, clientes: [
  cli(VALE, "Construtora Vale Alto Ltda.", 1445000, 1445000, { contratos: 3, areas: ["CIVEL", "SEM_CASO", "TRIBUTARIO"], vencido: 320000, falta: 800000 }),
  cli(HELIO, "Hélio Batista Corrêa", 0, -90000, { aparte: [{ tipo: "PRECATORIO", valor: 2130000 }], areas: ["PREVIDENCIARIO"] }),
  cli("c1000000-0000-4000-8000-000000000303", "Farmácia Bom Jesus Ltda", 540000, 540000, { areas: ["SEM_CASO"], inativo: true }),
] };
const UM = {
  periodo: PERIODO,
  cliente: { id: VALE, nome: "Construtora Vale Alto Ltda.", inativo: false, contratos: 3, casos: 2, responsavel: FELIPE },
  atraso: { valor: 320000, n: 1, dias: 8, mais: { descricao: "Mensalidade de novembro", vencimento: "2026-11-10", contrato: "Assessoria mensal",
    prox: { data: "2026-11-25", oque: "conferir se o boleto foi pago", responsavel: FELIPE } } },
  numeros: { contratado: 1505000, entrou: 1445000, adiantado: 0, rendeu: 1445000, falta: 800000, vencido: 320000, entrouAnterior: 960000 },
  contratos: [
    { id: "k1", numero: "C-2026-004", objeto: "Assessoria mensal", estado: "ATIVO", caso: null, area: "SEM_CASO", entrou: 640000, falta: 320000, parcelasAbertas: 1 },
    { id: "k2", numero: "C-2026-011", objeto: "Ação de cobrança", estado: "ATIVO", caso: { id: "s1", nome: "Vale Alto x Concreto Forte" }, area: "CIVEL", entrou: 240000, falta: 480000, parcelasAbertas: 2 },
  ],
  entradas: [
    { id: "e1", dia: "2026-09-08", valor: 565000, origem: "PARCELA", descricao: "Entrada", forma: "PIX", tipo: "FIXO", area: "TRIBUTARIO", contrato: "Entrada e 20% do recuperado" },
    { id: "e2", dia: "2026-09-10", valor: 320000, origem: "PARCELA", descricao: "Mensalidade 4", forma: "BOLETO", tipo: "MENSAL", area: "SEM_CASO", contrato: "Assessoria mensal" },
  ],
  abertas: [{ id: "p1", descricao: "Mensalidade 6", vencimento: "2026-11-10", falta: 320000, contrato: "Assessoria mensal",
    cobranca: { motivo: "Vai pagar junto com a medição da obra", data: "2026-11-25", oque: "conferir se o boleto foi pago", responsavel: FELIPE } }],
  adiantadas: [{ id: "a1", descricao: "Custas iniciais", valor: 48620, pagaEm: "2026-08-12", reembolsadoEm: "2026-10-28", como: "PROXIMA_PARCELA" }],
  terceiros: [{ id: "l1", tipo: "ALVARA", valor: 630000, entrouEm: "2026-11-04", caso: "Vale Alto x Concreto Forte", repasse: { valor: 630000, feitoEm: "2026-11-05", prazo: "2026-11-07" } }],
};
const AREAS = { periodo: PERIODO, areas: [
  { area: "SEM_CASO", entrou: 3370000, anterior: 3100000, casos: null, encerrados: null, contratosSemCaso: 7, aparte: [], adiantado: 0, rendeu: 3370000, falta: 900000, vencido: 320000 },
  { area: "PREVIDENCIARIO", entrou: 1500000, anterior: 2400000, casos: 4, encerrados: 1, contratosSemCaso: null, aparte: [{ tipo: "PRECATORIO", valor: 2130000, cliente: "Hélio Batista Corrêa" }],
    adiantado: 90000, rendeu: 1410000, falta: 300000, vencido: 0 },
] };
const RESP = { periodo: PERIODO, responsaveis: [
  { pessoa: FELIPE, dono: false, casos: 4, encerrados: 1, contratosSemCaso: 2, entrou: 5000000, adiantado: 0, rendeu: 5000000, falta: 900000, vencido: 320000 },
  { pessoa: MARINA, dono: true, casos: 6, encerrados: 0, contratosSemCaso: 1, entrou: 3000000, adiantado: 90000, rendeu: 2910000, falta: 1500000, vencido: 0 },
] };

type Resp = { status?: number; corpo: unknown };
type Pedido = { metodo: string; caminho: string; busca: string; corpo: unknown };
async function simular(page: Page, rotas: Record<string, Resp | Resp[]>) {
  const pedidos: Pedido[] = [];
  await page.route("**/api/v1/**", async (rota) => {
    const url = new URL(rota.request().url());
    const caminho = url.pathname.replace(/^\/api/, "");
    const metodo = rota.request().method();
    pedidos.push({ metodo, caminho, busca: url.search, corpo: rota.request().postDataJSON() });
    const r = rotas[`${metodo} ${caminho}${url.search}`] ?? rotas[`${metodo} ${caminho}`] ?? rotas[caminho];
    const lista = Array.isArray(r) ? r : r ? [r] : [{ status: 404, corpo: { erro: { codigo: "NOT_FOUND" } } }];
    const vez = pedidos.filter((p) => p.caminho === caminho && p.metodo === metodo && p.busca === url.search).length - 1;
    const x = lista[Math.min(vez, lista.length - 1)]!;
    await rota.fulfill({ status: x.status ?? 200, contentType: "application/json", body: JSON.stringify(x.corpo) });
  });
  return pedidos;
}
const R = "/v1/escritorio/financeiro/relatorios";
const dona = (x: Record<string, Resp | Resp[]> = {}) => ({
  "GET /v1/escritorio": { corpo: ESC_MARINA },
  [`GET ${R}/resumo`]: { corpo: RESUMO },
  [`GET ${R}/clientes`]: { corpo: CLIENTES },
  [`GET ${R}/clientes/${VALE}`]: { corpo: UM },
  [`GET ${R}/areas`]: { corpo: AREAS },
  [`GET ${R}/responsaveis`]: { corpo: RESP },
  ...x,
});
const folha = (page: Page, nome: string) => page.getByRole("region", { name: nome, exact: true });

test.describe("F3.70: Relatórios do sócio", () => {
  test("visão geral: os três números com a comparação, mês a mês e terceiros à parte", async ({ page }) => {
    await simular(page, dona());
    await page.goto(`${P}/financeiro/relatorios`);
    await expect(page.getByRole("heading", { level: 1, name: "Relatórios" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Entrou · set–nov" })).toContainText("R$ 116.200,00");
    await expect(page.getByRole("region", { name: "Entrou · set–nov" })).toContainText("R$ 5.830,00 a menos que jun–ago");
    await expect(page.getByRole("region", { name: "Entrou · set–nov" })).toContainText("o período fecha R$ 11.230,00 a mais que jun–ago");
    await expect(page.getByRole("region", { name: "Falta receber · hoje" })).toContainText("R$ 7.050,00 vencidos");
    await expect(page.getByRole("region", { name: "Rendeu · set–nov" })).toContainText("R$ 114.815,00");
    await expect(page.getByRole("region", { name: "Período do relatório" })).toContainText("01/09 a 18/11/2026");
    await expect(page.getByText("comparado com 01/06 a 31/08/2026")).toBeVisible();
    await expect(page.getByRole("button", { name: "Últimos 3 meses" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("link", { name: "Visão geral" })).toHaveAttribute("aria-current", "page");
    await expect(folha(page, "Passou pelo escritório")).toContainText("Já contados em Entrou");
    await expect(folha(page, "Passou pelo escritório")).toContainText("R$ 30.284,96");
    await expect(folha(page, "Falta receber")).toContainText("À parte · não soma acima");
    // F3.72: a caminho, com data estimada, num grupo à parte; o que passou fica marcado.
    await expect(folha(page, "Falta receber")).toContainText("Já entrou, falta transferir ao escritório");
    await expect(folha(page, "Falta receber")).toContainText("A caminho, com data estimada");
    await expect(folha(page, "Falta receber")).toContainText("Eduardo Nascimento · RPVNascimento x Prefeitura · estimada para janeiro de 2027");
    await expect(folha(page, "Falta receber")).toContainText("era outubro de 2026Passou da data estimada");
    await expect(folha(page, "Falta receber")).toContainText("R$ 28.050,00");
    await expect(page.getByRole("region", { name: "Falta receber · hoje" })).toContainText("R$ 21.300,00 que já entrou e R$ 6.750,00 a caminho");
    await expect(page.locator("details.re-como")).toHaveAttribute("open", "");
    await semViolacoes(page);
  });

  test("a aba Relatórios aparece na barra do Financeiro só para a sócia dona", async ({ page }, info) => {
    test.skip(info.project.name === "celular", "a barra de seções é a mesma; basta conferir no computador");
    await simular(page, dona());
    await page.goto(`${P}/financeiro/relatorios`);
    const barra = page.getByRole("navigation", { name: "Seções do Financeiro" });
    await expect(barra.getByRole("link", { name: "Relatórios" })).toHaveAttribute("aria-current", "page");
  });

  test("quem tem o Financeiro sem ser dona não vê a aba e, pelo endereço, lê quem decide", async ({ page }) => {
    const pedidos = await simular(page, { "GET /v1/escritorio": { corpo: ESC_BIANCA } });
    await page.goto(`${P}/financeiro/relatorios`);
    await expect(page.getByRole("heading", { level: 1, name: "Os relatórios ficam com o sócio dono" })).toBeVisible();
    await expect(page.getByText("só Marina Ribeiro abre os relatórios do sócio")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Seções do Financeiro" }).getByRole("link", { name: "Relatórios" })).toHaveCount(0);
    expect(pedidos.some((p) => p.caminho.startsWith(R))).toBe(false);
    await semViolacoes(page);
  });

  test("os botões do período pedem as datas certas e guardam no endereço", async ({ page }) => {
    const pedidos = await simular(page, dona({ [`GET ${R}/resumo?de=2026-01-01&ate=2026-11-18`]: { corpo: { ...RESUMO, periodo: { ...PERIODO, de: "2026-01-01", cde: "2025-02-01", cate: "2025-12-31" } } } }));
    await page.goto(`${P}/financeiro/relatorios`);
    await expect(page.getByRole("region", { name: "Entrou · set–nov" })).toBeVisible();
    await page.getByRole("button", { name: "Este ano" }).click();
    await expect(page.getByRole("button", { name: "Este ano" })).toHaveAttribute("aria-pressed", "true");
    expect(pedidos.some((p) => p.caminho === `${R}/resumo` && p.busca === "?de=2026-01-01&ate=2026-11-18")).toBe(true);
    await expect(page).toHaveURL(/\?de=2026-01-01&ate=2026-11-18$/);
    await expect(page.getByRole("link", { name: "Por cliente", exact: true })).toHaveAttribute("href", "/financeiro/relatorios/clientes?de=2026-01-01&ate=2026-11-18");
  });

  test("escolher datas: erro preso ao campo e o relatório continua no período anterior", async ({ page }) => {
    const pedidos = await simular(page, dona({ [`GET ${R}/resumo?de=2026-07-01&ate=2026-09-30&comparar=nao`]: { corpo: { ...RESUMO, periodo: { ...PERIODO, de: "2026-07-01", ate: "2026-09-30", comparar: "nao", cde: null, cate: null, aberto: false } } } }));
    await page.goto(`${P}/financeiro/relatorios`);
    await page.getByRole("button", { name: "Escolher datas" }).click();
    const j = page.getByRole("dialog", { name: "Escolher datas" });
    await j.getByLabel("De").fill("31/09/2026");
    await j.getByLabel("Até").fill("15/08/2026");
    await j.getByRole("button", { name: "Ver o relatório" }).click();
    await expect(j.getByText("Falta acertar 1 ponto, marcado abaixo.")).toBeVisible();
    await expect(j.getByLabel("De")).toHaveAttribute("aria-invalid", "true");
    await expect(j.getByText("Setembro tem 30 dias. Confira o dia.")).toBeVisible();
    await expect(j.getByText("O relatório continua mostrando 01/09 a 18/11/2026.")).toBeVisible();
    await semViolacoes(page);
    await j.getByLabel("De").fill("01/07/2026");
    await j.getByLabel("Até").fill("30/09/2026");
    await expect(j.getByText("01/04 a 30/06/2026")).toBeVisible();
    await j.getByText("Não comparar").click();
    await j.getByRole("button", { name: "Ver o relatório" }).click();
    await expect(j).toBeHidden();
    await expect(page.getByText("sem comparação", { exact: true })).toBeVisible();
    expect(pedidos.some((p) => p.busca === "?de=2026-07-01&ate=2026-09-30&comparar=nao")).toBe(true);
  });

  test("por cliente: busca, ordem e rendeu negativo escrito", async ({ page }, info) => {
    await simular(page, dona());
    await page.goto(`${P}/financeiro/relatorios/clientes`);
    await expect(page.getByRole("heading", { name: "Por cliente", level: 2 })).toBeVisible();
    await expect(page.getByRole("status")).toContainText("3 clientes com contrato no período");
    if (info.project.name === "computador") {
      const tab = page.getByRole("table", { name: /Por cliente/ });
      await expect(tab.getByRole("columnheader", { name: "Entrou" })).toHaveAttribute("aria-sort", "descending");
      await expect(tab.getByRole("row").nth(1)).toContainText("Construtora Vale Alto Ltda.");
      await expect(tab).toContainText("adiantou mais do que entrou");
      await expect(tab).toContainText("Precatório: R$ 21.300,00, à parte");
      await page.getByLabel("Ordenar por").selectOption("rendeu");
      await expect(tab.getByRole("row").nth(1)).toContainText("Hélio Batista Corrêa");
    } else {
      await expect(page.getByRole("list", { name: "Por cliente" }).getByRole("listitem")).toHaveCount(3);
    }
    await expect(page.getByText("Hélio rendeu menos que zero")).toBeVisible();
    await page.getByLabel("Buscar cliente").fill("farmacia");
    await expect(page.getByRole("status")).toContainText("1 cliente encontrado");
    await page.getByLabel("Buscar cliente").fill("");
    await page.getByLabel("Área").selectOption("PREVIDENCIARIO");
    await expect(page.getByRole("status")).toContainText("1 cliente encontrado");
    await semViolacoes(page);
  });

  test("o relatório de um cliente: atraso, contratos, o que entrou e o que passou de terceiros", async ({ page }) => {
    await simular(page, dona());
    await page.goto(`${P}/financeiro/relatorios/clientes/${VALE}`);
    await expect(page.getByRole("heading", { level: 1, name: "Construtora Vale Alto Ltda." })).toBeVisible();
    await expect(page.getByRole("region", { name: "Em atraso" })).toContainText("R$ 3.200,00");
    await expect(page.getByRole("region", { name: "Em atraso" })).toContainText("Próxima ação: 25/11, Felipe");
    await expect(folha(page, "No período")).toContainText("R$ 4.850,00 a mais que jun–ago");
    await expect(folha(page, "O que entrou")).toContainText("Entrada");
    await expect(folha(page, "O que entrou")).toContainText("Nada entrou até hoje.");
    await expect(folha(page, "O que o escritório adiantou")).toContainText("Voltou");
    await expect(folha(page, "Passou pelo escritório")).toContainText("Repassado");
    await expect(page.getByRole("link", { name: "Por cliente" }).first()).toHaveAttribute("href", "/financeiro/relatorios/clientes");
    await semViolacoes(page);
  });

  test("por área e por responsável", async ({ page }) => {
    await simular(page, dona());
    await page.goto(`${P}/financeiro/relatorios/areas`);
    await expect(folha(page, "Entrou por área")).toContainText("Previdenciário caiu R$ 9.000,00 contra jun–ago.");
    await expect(folha(page, "Por área do direito")).toContainText("Sem caso ligado");
    await semViolacoes(page);
    await page.getByRole("link", { name: "Por responsável" }).click();
    await expect(folha(page, "Entrou por responsável")).toContainText("Felipe responde por 63% do que entrou.");
    await expect(page.getByText("Este número não é a parte de cada um.")).toBeVisible();
    await semViolacoes(page);
  });

  test("exportar baixa a planilha com o período aberto e vai ao histórico", async ({ page }) => {
    const pedidos = await simular(page, dona({
      [`POST ${R}/exportacoes`]: { status: 201, corpo: { periodo: PERIODO, formato: "XLSX", resumo: RESUMO, clientes: CLIENTES.clientes, areas: AREAS.areas,
        responsaveis: RESP.responsaveis, recebimentos: [], terceiros: [] } },
    }));
    await page.goto(`${P}/financeiro/relatorios/clientes`);
    await page.getByRole("button", { name: "Exportar" }).click();
    const j = page.getByRole("dialog", { name: "Exportar o relatório" });
    await expect(j).toContainText("Por cliente · 01/09 a 18/11/2026");
    await expect(j).toContainText("Valores de terceiros numa aba à parte");
    await semViolacoes(page);
    const baixa = page.waitForEvent("download");
    await j.getByRole("button", { name: "Baixar planilha" }).click();
    expect((await baixa).suggestedFilename()).toBe("relatorio-2026-09-01-a-2026-11-18.xlsx");
    expect(pedidos.find((p) => p.metodo === "POST")?.corpo).toEqual({ de: "2026-09-01", ate: "2026-11-18", comparar: "anterior", visao: "clientes", formato: "XLSX" });
    await expect(page.getByText("Relatório exportado.")).toBeVisible();
  });

  test("vazio: sem recebimento, os primeiros passos e nenhum número inventado", async ({ page }) => {
    await simular(page, dona({ [`GET ${R}/resumo`]: { corpo: { ...RESUMO, algum: false } } }));
    await page.goto(`${P}/financeiro/relatorios`);
    await expect(page.getByRole("heading", { name: "Ainda não há o que comparar" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ir para Contratos" })).toBeVisible();
    await expect(page.getByText("R$ 116.200,00")).toHaveCount(0);
    await semViolacoes(page);
  });

  test("erro: tentar de novo e o caminho por A receber", async ({ page }) => {
    await simular(page, dona({ [`GET ${R}/resumo`]: [{ status: 500, corpo: { erro: { codigo: "INTERNAL_ERROR" } } }, { corpo: RESUMO }] }));
    await page.goto(`${P}/financeiro/relatorios`);
    await expect(page.getByRole("heading", { name: "Não deu para montar o relatório" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Abrir A receber" })).toBeVisible();
    await semViolacoes(page);
    await page.getByRole("button", { name: "Tentar de novo" }).click();
    await expect(page.getByRole("region", { name: "Entrou · set–nov" })).toBeVisible();
  });
});
