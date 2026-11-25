// Financeiro do Portal, contas que repetem todo mês: a lista, a ficha e as janelas de mudar e
// encerrar. A API é simulada; aqui se testa a tela, a acessibilidade e o que ela manda.
import { expect, test, type Page } from "@playwright/test";
import { agora, fixarRelogio, semViolacoes } from "./console-dados.ts";

const P = "http://localhost:3000";
const ESC = "e0000000-0000-4000-8000-0000000000a1";

const ESCRITORIO = {
  id: ESC, nome: "Ribeiro & Matos", pessoa: "Marina Ribeiro", dono: true, areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"],
  socios: ["Marina Ribeiro"], pessoas: 5, outrosEscritorios: 0, funcoes: ["SOCIO"], cnpj: null, cidade: "São Paulo", uf: "SP", endereco: null,
  contatos: [], ultimaExportacao: null,
};
const SEM_AREA = { ...ESCRITORIO, pessoa: "Diego Almeida", dono: false, areas: ["COMERCIAL"], funcoes: ["EQUIPE"] };

const dia = (n: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(agora + n * 864e5));

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


// Contas que repetem todo mês (FI-13, F3.24), desenho aprovado em
// docs/design/aprovadas/portal-recibo-recorrente (estados rc-).
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const MES = `${dia(0).slice(0, 8)}01`;
const mais = (n: number) => { const a = Number(MES.slice(0, 4)); const m = Number(MES.slice(5, 7)) - 1 + n; return `${a + Math.floor(m / 12)}-${String((m % 12) + 1).padStart(2, "0")}-01`; };
const nome = (m: string) => MESES[Number(m.slice(5, 7)) - 1]!;
const PROX = mais(1);
const MARINA = { id: "a0000000-0000-4000-8000-000000000101", nome: "Marina Ribeiro" };
const rid = (n: number) => `c4000000-0000-4000-8000-0000000001${String(n).padStart(2, "0")}`;
const contaMes = (n: number, descricao: string, valor: number, diaV: number, paga = false) => ({
  id: `c5000000-0000-4000-8000-0000000001${n}`, descricao, fornecedor: null, categoria: "ALUGUEL", valor, valorPago: paga ? valor : null,
  vencimento: `${MES.slice(0, 8)}${String(diaV).padStart(2, "0")}`, forma: "BOLETO", pagaEm: paga ? `${MES.slice(0, 8)}05` : null,
  situacao: paga ? "PAGA" : "A_VENCER", recorrente: { id: rid(n), dia: diaV, mes: MES, lancadaSozinha: true }, adiantada: null, cancelada: null,
});
const rec = (n: number, descricao: string, categoria: string, valor: number, diaV: number, paga = false, extra = {}) => ({
  id: rid(n), descricao, fornecedor: n === 1 ? "Imobiliária Paulista" : null, categoria, forma: "BOLETO", valor, dia: diaV, desde: mais(-8), ultimoMes: null, encerrada: null,
  proxima: { mes: PROX, valor, dia: diaV, vencimento: `${PROX.slice(0, 8)}${String(diaV).padStart(2, "0")}` },
  doMes: contaMes(n, descricao, valor, diaV, paga), lancadas: 9, pagas: paga ? 9 : 8, ...extra,
});
const ALUGUEL = rec(1, "Aluguel da sala", "ALUGUEL", 360000, 20);
const SISTEMA = rec(2, "Sistema de petições", "FORNECEDORES", 18990, 21);
const FOLHA = rec(3, "Folha de pagamento", "PESSOAL", 980000, 5, true);
const ENCERRADA = rec(4, "Internet antiga", "FORNECEDORES", 16510, 10, true, {
  ultimoMes: mais(-1), proxima: null, doMes: null,
  encerrada: { em: `${mais(-1).slice(0, 8)}18T16:05:00-03:00`, por: MARINA, aPartirDe: MES, motivo: "Troquei de fornecedor", detalhe: null },
});
const LISTA = {
  algum: true, mes: MES,
  totais: { semana: { valor: 0, contas: 0 }, vencidas: { valor: 0, contas: 0 }, recorrentes: { contas: 3, sozinhas: 3, ativas: 3, encerradasMes: 0 }, reembolsar: { valor: 0, clientes: 0 } },
  contas: [], depois: null, adiantados: [], categorias: [],
};
const RECS = { mes: MES, ativas: [ALUGUEL, FOLHA, SISTEMA], encerradas: [ENCERRADA] };
const FICHA = {
  ...ALUGUEL,
  contas: [{ ...ALUGUEL.doMes, anexos: 1 }, { ...contaMes(1, "Aluguel da sala", 360000, 20, true), id: "c6000000-0000-4000-8000-000000000001", recorrente: { id: rid(1), dia: 20, mes: mais(-1), lancadaSozinha: true }, vencimento: `${mais(-1).slice(0, 8)}20`, pagaEm: `${mais(-1).slice(0, 8)}19`, anexos: 1 }],
  mudancas: [{ id: "m0", tipo: "VALOR", aPartirDe: mais(-6), valor: 360000, dia: 20, antes: { valor: 340000, dia: 20 }, motivo: "Reajuste anual do contrato de locação",
    detalhe: null, por: MARINA, em: `${mais(-7).slice(0, 8)}18T10:12:00-03:00`, mudouConta: false, cancelouConta: false }],
  criada: { em: `${mais(-9).slice(0, 8)}02T09:00:00-03:00`, por: MARINA, valor: 340000, dia: 20, mes: mais(-8), forma: "BOLETO" },
};

const comuns = (escritorio: unknown = ESCRITORIO) => ({
  "/v1/escritorio": { corpo: escritorio },
  "GET /v1/escritorio/financeiro/pagar": { corpo: LISTA },
  "GET /v1/escritorio/financeiro/recorrencias": { corpo: RECS },
  [`GET /v1/escritorio/financeiro/recorrencias/${rid(1)}`]: { corpo: FICHA },
});

// O relógio do navegador fica em AGORA, o mesmo instante de onde os dados contam (F3.164).
test.beforeEach(async ({ page }) => { await fixarRelogio(page); });

test.describe("Contas que repetem todo mês (FI-13, F3.24)", () => {
  test("Recorrentes do mês abre a lista: valor, dia, desde, o mês, Mudar e Encerrar; e as encerradas embaixo", async ({ page }) => {
    await simular(page, comuns());
    await page.goto(`${P}/financeiro/a-pagar`);
    await page.getByRole("group", { name: "Mostrar" }).getByRole("button", { name: /Recorrentes/ }).click();
    const t = page.getByRole("table", { name: "Contas que se repetem todo mês" });
    const al = t.getByRole("row", { name: /Aluguel da sala/ });
    await expect(al).toContainText("Todo dia 20");
    await expect(al).toContainText("R$ 3.600,00");
    await expect(al).toContainText("A pagar");
    await expect(al.getByRole("link", { name: "Aluguel da sala" })).toHaveAttribute("href", `/financeiro/a-pagar/recorrentes/${rid(1)}`);
    await expect(t.getByRole("row", { name: /Folha de pagamento/ })).toContainText("Paga");
    await expect(page.getByText(/3 contas ativas · nascem sozinhas no dia 1º/)).toBeVisible();
    const enc = page.getByRole("region", { name: "Encerradas" });
    await expect(enc).toContainText("Internet antiga");
    await expect(enc).toContainText("motivo: troquei de fornecedor");
    await semViolacoes(page);
  });

  test("Mudar valor ou dia: sem o valor volta preso ao campo; a partir do mês já lançado manda o mês dele", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(),
      [`POST /v1/escritorio/financeiro/recorrencias/${rid(1)}/mudancas`]: { status: 201, corpo: { id: "m1", mudouConta: true, cancelouConta: false, contaDoMes: null } },
    });
    await page.goto(`${P}/financeiro/a-pagar`);
    await page.getByRole("group", { name: "Mostrar" }).getByRole("button", { name: /Recorrentes/ }).click();
    await page.getByRole("button", { name: "Mudar valor ou dia de Aluguel da sala" }).click();
    const j = page.getByRole("dialog", { name: "Mudar valor ou dia" });
    await expect(j.getByLabel("A partir de")).toHaveValue(PROX);
    await expect(j.getByLabel("Valor novo")).toHaveValue("3.600,00");
    await expect(j.getByLabel("Vence")).toHaveValue("20");
    await expect(j.getByRole("list", { name: "O que vai acontecer" })).toContainText("já lançada (R$ 3.600,00");
    await expect(j.getByRole("list", { name: "O que vai acontecer" })).toContainText("não muda");
    await j.getByLabel("Valor novo").fill("");
    await j.getByRole("button", { name: "Salvar a mudança" }).click();
    await expect(j.getByText(/Escreva o valor novo. Hoje é R\$ 3.600,00/)).toBeVisible();
    await expect(j.getByLabel("Valor novo")).toBeFocused();
    expect(pedidos.some((p) => p.metodo === "POST")).toBe(false);
    await semViolacoes(page);
    await j.getByLabel("Valor novo").fill("3.780,00");
    await j.getByLabel("A partir de").selectOption(MES);
    await expect(j.getByRole("list", { name: "O que vai acontecer" })).toContainText("muda junto");
    await j.getByLabel("Por que mudou").fill("Reajuste anual do aluguel (IGP-M)");
    await j.getByRole("button", { name: "Salvar a mudança" }).click();
    await expect(page.getByRole("status").filter({ hasText: `Valor novo a partir de ${nome(MES)}.` })).toContainText("mudou junto");
    expect(pedidos.filter((p) => p.metodo === "POST").at(-1)?.corpo).toEqual({ tipo: "VALOR", aPartirDe: MES, valor: 378000, dia: 20, motivo: "Reajuste anual do aluguel (IGP-M)" });
  });

  test("Encerrar: o motivo é obrigatório; cancelar a do mês só quando marcado", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(),
      [`POST /v1/escritorio/financeiro/recorrencias/${rid(2)}/mudancas`]: { status: 201, corpo: { id: "m2", mudouConta: false, cancelouConta: false, contaDoMes: null } },
    });
    await page.goto(`${P}/financeiro/a-pagar`);
    await page.getByRole("group", { name: "Mostrar" }).getByRole("button", { name: /Recorrentes/ }).click();
    await page.getByRole("button", { name: "Encerrar a recorrência de Sistema de petições" }).click();
    const j = page.getByRole("dialog", { name: "Encerrar a recorrência" });
    await expect(j.getByLabel("Não nasce mais a partir de")).toHaveValue(PROX);
    await expect(j.getByRole("checkbox", { name: new RegExp(`Cancelar também a de ${nome(MES)}`) })).not.toBeChecked();
    await j.getByRole("button", { name: "Encerrar a recorrência" }).click();
    await expect(j.getByText("Escolha o motivo. Ele fica no histórico da conta e ajuda quem olhar depois.")).toBeVisible();
    await expect(j.getByLabel("Por que encerrar")).toBeFocused();
    await semViolacoes(page);
    await j.getByLabel("Por que encerrar").selectOption("Troquei de fornecedor");
    await j.getByLabel(/Detalhe/).fill("Passamos a usar o sistema do novo fornecedor.");
    await expect(j.getByRole("list", { name: "O que vai acontecer" })).toContainText("continua a pagar");
    await j.getByRole("button", { name: "Encerrar a recorrência" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Recorrência encerrada." })).toContainText(`continua a pagar`);
    expect(pedidos.filter((p) => p.metodo === "POST").at(-1)?.corpo).toEqual({
      tipo: "ENCERRAR", aPartirDe: PROX, motivo: "Troquei de fornecedor", detalhe: "Passamos a usar o sistema do novo fornecedor.", cancelarLancada: false,
    });
  });

  test("Ficha da conta: próxima conta, contas lançadas e as mudanças com quem fez e o motivo", async ({ page }) => {
    await simular(page, comuns());
    await page.goto(`${P}/financeiro/a-pagar/recorrentes/${rid(1)}`);
    await expect(page.getByRole("heading", { level: 1, name: "Aluguel da sala" })).toBeVisible();
    const dir = page.getByRole("region", { name: "Próxima conta" });
    await expect(dir).toContainText("R$ 3.600,00");
    await expect(dir).toContainText(`nasce em 01/${PROX.slice(5, 7)}`);
    await expect(page.getByRole("table", { name: "Contas lançadas" }).getByRole("row")).toHaveCount(3);
    const mud = page.getByRole("complementary", { name: "Mudanças" });
    await expect(mud).toContainText("Marina Ribeiro mudou o valor");
    await expect(mud).toContainText("De R$ 3.400,00 para R$ 3.600,00");
    await expect(mud).toContainText("criou a conta que repete todo mês");
    await semViolacoes(page);
    await dir.getByRole("button", { name: "Encerrar" }).click();
    await expect(page.getByRole("dialog", { name: "Encerrar a recorrência" })).toBeVisible();
  });

  test("Sem a área Financeiro, a ficha não abre", async ({ page }) => {
    await simular(page, comuns(SEM_AREA));
    await page.goto(`${P}/financeiro/a-pagar/recorrentes/${rid(1)}`);
    await expect(page.getByRole("heading", { name: "Aluguel da sala" })).toHaveCount(0);
  });
});
