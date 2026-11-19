// Financeiro do Portal, A pagar (telas aprovadas em docs/design/aprovadas/portal-financeiro,
// estados pagar e nova-conta): os quatro números do alto, as contas com categoria e origem, o
// adiantado por cliente, as saídas por categoria e as janelas de lançar conta, marcar paga e
// registrar reembolso. A API é simulada; aqui se testa a tela, a acessibilidade e o que ela manda.
import { expect, test, type Page } from "@playwright/test";
import { semViolacoes } from "./console-dados.ts";

const P = "http://localhost:3000";
const ESC = "e0000000-0000-4000-8000-0000000000a1";

const ESCRITORIO = {
  id: ESC, nome: "Ribeiro & Matos", pessoa: "Marina Ribeiro", dono: true, areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"],
  socios: ["Marina Ribeiro"], pessoas: 5, outrosEscritorios: 0, funcoes: ["SOCIO"], cnpj: null, cidade: "São Paulo", uf: "SP", endereco: null,
  contatos: [], ultimaExportacao: null,
};
const SEM_AREA = { ...ESCRITORIO, pessoa: "Diego Almeida", dono: false, areas: ["COMERCIAL"], funcoes: ["EQUIPE"] };

const dia = (n: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(Date.now() + n * 864e5));
const br = (n: number) => dia(n).split("-").reverse().join("/");

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
    const vez = pedidos.filter((p) => p.caminho === caminho && p.metodo === metodo).length - 1;
    const x = lista[Math.min(vez, lista.length - 1)]!;
    await rota.fulfill({ status: x.status ?? 200, contentType: "application/json", body: JSON.stringify(x.corpo) });
  });
  return pedidos;
}

const MES = `${dia(0).slice(0, 8)}01`;
const cid = (n: number) => `c3000000-0000-4000-8000-0000000001${String(n).padStart(2, "0")}`;
const DANI = { id: "d1000000-0000-4000-8000-000000000001", nome: "Daniela Rocha Mendes" };
const conta = (n: number, descricao: string, categoria: string, d: number, valor: number, extra = {}) => ({
  id: cid(n), descricao, fornecedor: null, categoria, valor, valorPago: null, vencimento: dia(d), forma: null, pagaEm: null,
  situacao: d < 0 ? "VENCIDA" : "A_VENCER", recorrente: null, adiantada: null, ...extra,
});
const CUSTAS = conta(1, "Custas recursais", "CUSTAS", 1, 48500, { adiantada: { cliente: DANI, como: "LEVANTAMENTO", reembolsadoEm: null } });
const ALUGUEL = conta(2, "Aluguel da sala", "ALUGUEL", 2, 360000, { fornecedor: "Imobiliária Paulista", forma: "BOLETO", recorrente: { dia: 20, mes: MES, lancadaSozinha: true } });
const LISTA = {
  algum: true, mes: MES,
  totais: { semana: { valor: 408500, contas: 2 }, vencidas: { valor: 0, contas: 0 }, recorrentes: { contas: 8, sozinhas: 8 }, reembolsar: { valor: 48500, clientes: 1 } },
  contas: [CUSTAS, ALUGUEL],
  depois: { contas: 9, valor: 1045410, ate: dia(10) },
  adiantados: [CUSTAS],
  categorias: [{ categoria: "ALUGUEL", valor: 430000 }, { categoria: "IMPOSTOS", valor: 285000 }, { categoria: "CUSTAS", valor: 48500 }],
};
const VAZIA = { ...LISTA, algum: false, contas: [], adiantados: [], categorias: [], depois: null };

const comuns = (escritorio: unknown = ESCRITORIO, lista: unknown = LISTA) => ({
  "/v1/escritorio": { corpo: escritorio },
  "GET /v1/escritorio/financeiro/pagar": { corpo: lista },
  "GET /v1/escritorio/clientes": { corpo: { clientes: [DANI], total: 1 } },
});

test.describe("Financeiro do Portal, A pagar (FI-01, FI-02, FI-07, FI-13, FI-20)", () => {
  test("Lista: números do alto, contas da semana com categoria e origem, adiantado e saídas por categoria", async ({ page }) => {
    const pedidos = await simular(page, comuns());
    await page.goto(`${P}/financeiro/a-pagar`);
    await expect(page.getByRole("heading", { level: 1, name: "A pagar" })).toBeVisible();
    const nums = page.getByRole("group", { name: "Mostrar" });
    await expect(nums.getByRole("button", { name: /Vencem esta semana/ })).toHaveAttribute("aria-pressed", "true");
    await expect(nums.getByRole("button", { name: /Recorrentes/ })).toContainText("lançadas sozinhas em 01/");
    const tabela = page.getByRole("table", { name: "Vencem esta semana" });
    const custas = tabela.getByRole("row", { name: /Custas recursais/ });
    await expect(custas).toContainText("Custas adiantadas");
    await expect(custas).toContainText("Vira reembolso de Daniela");
    await expect(custas).toContainText("amanhã");
    await expect(tabela.getByRole("row", { name: /Aluguel da sala/ })).toContainText("Recorrente · todo dia 20");
    await expect(page.getByText("Mais 9 contas até")).toContainText("R$ 10.454,10");
    const reemb = page.getByRole("region", { name: "Adiantado por cliente" });
    await expect(reemb).toContainText("Descontar do valor levantado");
    const cat = page.getByRole("group", { name: "Saídas por categoria" });
    await expect(cat).toContainText("Aluguel e condomínio");
    await expect(page.getByRole("complementary", { name: "Categorias" })).toContainText("R$ 7.635,00");
    await semViolacoes(page);
    await page.getByRole("button", { name: "Ver o mês todo" }).click();
    await expect.poll(() => pedidos.filter((p) => p.caminho === "/v1/escritorio/financeiro/pagar").at(-1)?.busca).toBe("?mostrar=MES");
    await expect(nums.getByRole("button", { name: /Vencem esta semana/ })).toHaveAttribute("aria-pressed", "false");
  });

  test("Primeiro uso: lançar as contas fixas", async ({ page }) => {
    await simular(page, comuns(ESCRITORIO, VAZIA));
    await page.goto(`${P}/financeiro/a-pagar`);
    await expect(page.getByRole("heading", { name: "Nenhuma conta lançada ainda" })).toBeVisible();
    await semViolacoes(page);
  });

  test("Lançar conta: erros presos ao campo; adiantada pede cliente e como volta; manda o que foi escolhido", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(),
      "POST /v1/escritorio/financeiro/contas": { status: 201, corpo: { id: "n1", recorrenteId: null } },
    });
    await page.goto(`${P}/financeiro/a-pagar`);
    await page.getByRole("button", { name: "Lançar conta" }).first().click();
    const j = page.getByRole("dialog", { name: "Lançar conta" });
    await expect(j.getByLabel("O que é")).toBeFocused();
    await j.getByLabel("Foi adiantada para um cliente").check();
    await j.getByRole("button", { name: "Lançar conta" }).click();
    await expect(j.getByRole("alert").filter({ hasText: "Falta acertar 6 pontos" })).toBeVisible();
    await expect(j.getByLabel("O que é")).toBeFocused();
    await semViolacoes(page);
    await j.getByLabel("O que é").fill("Custas da apelação");
    await j.getByLabel("Valor", { exact: true }).fill("1.248,36");
    await j.getByLabel("Vencimento").fill(br(3));
    await j.getByLabel("Categoria").selectOption("CUSTAS");
    await j.getByLabel("Como vai pagar (opcional)").selectOption("BOLETO");
    await j.getByLabel("Cliente", { exact: true }).selectOption(DANI.id);
    await j.getByLabel("Como o dinheiro volta").selectOption("PROXIMA_PARCELA");
    await j.getByRole("button", { name: "Lançar conta" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Conta lançada." })).toContainText("Vira reembolso de Daniela Rocha Mendes.");
    const corpo = pedidos.find((p) => p.metodo === "POST")?.corpo;
    expect(corpo).toEqual({
      descricao: "Custas da apelação", valor: 124836, vencimento: dia(3), categoria: "CUSTAS", forma: "BOLETO", repete: false, adiantada: true,
      clienteId: DANI.id, reembolsoComo: "PROXIMA_PARCELA",
    });
  });

  test("Marcar paga: data no futuro volta presa ao campo; depois manda o valor que saiu. Reembolso registrado", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(),
      [`POST /v1/escritorio/financeiro/contas/${cid(2)}/paga`]: { corpo: { id: cid(2), pagaEm: dia(0) } },
      [`POST /v1/escritorio/financeiro/contas/${cid(1)}/reembolso`]: { corpo: { id: cid(1), reembolsadoEm: dia(0) } },
    });
    await page.goto(`${P}/financeiro/a-pagar`);
    await page.getByRole("button", { name: /^Paga.*Aluguel da sala/ }).click();
    const j = page.getByRole("dialog", { name: "Marcar como paga" });
    await expect(j.getByLabel("Valor pago")).toBeFocused();
    await expect(j.getByLabel("Valor pago")).toHaveValue("3.600,00");
    await j.getByLabel("Dia do pagamento").fill(br(2));
    await j.getByRole("button", { name: "Marcar como paga" }).click();
    await expect(j.getByText("Esta data é depois de hoje.")).toBeVisible();
    await semViolacoes(page);
    await j.getByLabel("Dia do pagamento").fill(br(0));
    await j.getByLabel("Valor pago").fill("3.712,40");
    await j.getByRole("button", { name: "Marcar como paga" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Conta paga." })).toContainText("R$ 3.712,40");
    expect(pedidos.find((p) => p.caminho.endsWith("/paga"))?.corpo).toEqual({ valor: 371240, pagaEm: dia(0) });

    await page.getByRole("region", { name: "Adiantado por cliente" }).getByRole("button", { name: /Reembolsado/ }).click();
    const r = page.getByRole("dialog", { name: "Registrar reembolso" });
    await expect(r.getByLabel("Dia em que o dinheiro voltou")).toBeFocused();
    await r.getByRole("button", { name: "Registrar reembolso" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Reembolso registrado." })).toContainText("Daniela Rocha Mendes devolveu R$ 485,00");
    expect(pedidos.find((p) => p.caminho.endsWith("/reembolso"))?.corpo).toEqual({ reembolsadoEm: dia(0) });
  });

  test("Sem a área Financeiro, A pagar não abre", async ({ page }) => {
    await simular(page, comuns(SEM_AREA));
    await page.goto(`${P}/financeiro/a-pagar`);
    await expect(page.getByRole("heading", { name: "Esta área não está liberada para você" })).toBeVisible();
  });
});
