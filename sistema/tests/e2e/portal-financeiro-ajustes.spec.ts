// Escritório › Ajustes do financeiro (F3.50, F3.46, F3.49), tela aprovada em
// docs/design/aprovadas/portal-comercial-financeiro-pendencias (estados es-ajustes, es-vazio,
// es-erros, es-abertura, es-equipe e es-sem-area): o contador, o saldo de abertura, o prazo para
// repassar e a meta. Só a sócia dona muda; quem tem o Financeiro vê; sem a área, não abre.
// A API é simulada; aqui se testa a tela, a acessibilidade e o que ela manda.
import { expect, test, type Page } from "@playwright/test";
import { semViolacoes } from "./console-dados.ts";

const P = "http://localhost:3000";
const ESC = "e0000000-0000-4000-8000-0000000000a1";
const ESCRITORIO = {
  id: ESC, nome: "Ribeiro & Matos", pessoa: "Marina Ribeiro", dono: true, areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"],
  socios: ["Marina Ribeiro"], pessoas: 5, outrosEscritorios: 0, funcoes: ["SOCIO"], cnpj: null, cidade: "São Paulo", uf: "SP", endereco: null,
  contatos: [], ultimaExportacao: null,
};
const BIANCA_ESC = { ...ESCRITORIO, pessoa: "Bianca Torres", dono: false, areas: ["FINANCEIRO"], funcoes: ["EQUIPE"] };
const SEM_AREA = { ...ESCRITORIO, pessoa: "Diego Almeida", dono: false, areas: ["COMERCIAL"], funcoes: ["EQUIPE"] };

type Resp = { status?: number; corpo: unknown };
type Pedido = { metodo: string; caminho: string; corpo: unknown };

async function simular(page: Page, rotas: Record<string, Resp | Resp[]>) {
  const pedidos: Pedido[] = [];
  await page.route("**/api/v1/**", async (rota) => {
    const url = new URL(rota.request().url());
    const caminho = url.pathname.replace(/^\/api/, "");
    const metodo = rota.request().method();
    pedidos.push({ metodo, caminho, corpo: rota.request().postDataJSON() });
    const r = rotas[`${metodo} ${caminho}`] ?? rotas[caminho] ?? { status: 404, corpo: { erro: { codigo: "NOT_FOUND" } } };
    const lista = Array.isArray(r) ? r : [r];
    const vez = pedidos.filter((p) => p.caminho === caminho && p.metodo === metodo).length - 1;
    const x = lista[Math.min(vez, lista.length - 1)]!;
    await rota.fulfill({ status: x.status ?? 200, contentType: "application/json", body: JSON.stringify(x.corpo) });
  });
  return pedidos;
}

const MARINA = { id: "aa000000-0000-4000-8000-000000000001", nome: "Marina Ribeiro" };
const SEM_META = { mes: null, todoMes: null, antes: null, umMes: [] };
const VAZIO = {
  dono: true, socioDono: MARINA, contador: null, abertura: null, primeiroLancamento: "2026-09-01", saldoHoje: 0,
  prazoRepasseDias: 3, historico: [], meta: SEM_META,
};
const CONTADOR = { nome: "Paulo Serra", firma: "Contabilidade Silva", email: "contato@exemplo.com.br", telefone: "+551134567890", mandarAoExportar: true, lembrarDia5: true, atualizadoEm: "2026-11-18T13:00:00Z", por: MARINA };
const ABERTURA = { data: "2026-08-31", valor: 1248000, motivo: null, por: MARINA, em: "2026-11-18T13:00:00Z" };
const META = { valor: 5000000, deMes: "2026-11-01", soMes: false, por: MARINA, em: "2026-11-02T12:00:00Z" };
const CHEIO = {
  ...VAZIO, contador: CONTADOR, abertura: ABERTURA, saldoHoje: 4031000, prazoRepasseDias: 2,
  meta: { mes: META, todoMes: META, antes: null, umMes: [{ ...META, valor: 4000000, deMes: "2026-12-01", soMes: true }] },
  historico: [
    { acao: "financeiro.contador", dados: { situacao: "CADASTRADO", firma: "Contabilidade Silva" }, por: MARINA, em: "2026-11-18T13:00:00Z" },
    { acao: "financeiro.saldo_abertura", dados: { valor: 1248000, data: "2026-08-31" }, por: MARINA, em: "2026-11-18T13:00:00Z" },
    { acao: "financeiro.prazo_repasse", dados: { de: 3, para: 2 }, por: MARINA, em: "2026-11-18T13:00:00Z" },
  ],
};
const R = "/v1/escritorio/financeiro/ajustes";
const PAGINA = `${P}/meu-escritorio/financeiro`;

test.describe("Ajustes do financeiro (F3.50, F3.46, F3.49; FI-21, FI-09, IN-09)", () => {
  test("Vazio: a dona vê o que falta, os erros não salvam nada e o certo manda contador, prazo e abertura", async ({ page }) => {
    const pedidos = await simular(page, {
      "/v1/escritorio": { corpo: ESCRITORIO },
      [`GET ${R}`]: [{ corpo: VAZIO }, { corpo: CHEIO }],
      [`PUT ${R}`]: [
        { status: 422, corpo: { erro: { codigo: "VALIDATION_ERROR", mensagem: "Confira", detalhes: { campos: ["email"] } } } },
        { corpo: CHEIO },
      ],
    });
    await page.goto(PAGINA);
    await expect(page.getByRole("heading", { level: 1, name: "Ajustes do financeiro" })).toBeVisible();
    await expect(page.getByText("Falta o saldo de abertura e o contador.")).toBeVisible();
    await expect(page.getByLabel("Data", { exact: true })).toHaveValue("31/08/2026");
    await expect(page.getByText("Nada mudou ainda.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Definir no Resumo" })).toHaveAttribute("href", /#t-meta$/);
    await semViolacoes(page);

    // Erros na tela: e-mail incompleto e prazo zero.
    await page.getByLabel("Nome do contador").fill("Paulo Serra");
    await page.getByRole("textbox", { name: "E-mail do contador" }).fill("contato@exemplo");
    await page.getByLabel("Dias úteis para repassar").fill("0");
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText("Este e-mail está incompleto")).toBeVisible();
    await expect(page.getByText("Escreva de 1 a 30 dias úteis.")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "E-mail do contador" })).toBeFocused();
    expect(pedidos.filter((p) => p.metodo === "PUT")).toHaveLength(0);
    await semViolacoes(page);

    // O servidor recusa um campo: a tela marca o campo.
    await page.getByRole("textbox", { name: "E-mail do contador" }).fill("contato@exemplo.com.br");
    await page.getByLabel("Dias úteis para repassar").fill("2");
    await page.getByLabel("Saldo na conta nesse dia").fill("12.480,00");
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText("Este e-mail está incompleto")).toBeVisible();
    await page.getByRole("button", { name: "Salvar" }).click();

    await expect(page.getByText("Ajustes salvos.")).toBeVisible();
    await expect(page.getByText("O prazo para repassar agora é de 2 dias úteis")).toBeVisible();
    const puts = pedidos.filter((p) => p.metodo === "PUT");
    expect(puts).toHaveLength(2);
    expect(puts[1]!.corpo).toEqual({
      contador: { nome: "Paulo Serra", firma: null, email: "contato@exemplo.com.br", telefone: null, mandarAoExportar: true, lembrarDia5: true },
      prazoRepasseDias: 2,
      abertura: { data: "2026-08-31", valor: 1248000 },
    });
    // Depois de salvo, a abertura muda só por Corrigir.
    await expect(page.getByRole("button", { name: "Corrigir" })).toBeVisible();
    await expect(page.getByText("cadastrou o contador")).toBeVisible();
  });

  test("Corrigir o saldo de abertura pede o motivo e diz como fica o Caixa", async ({ page }) => {
    const pedidos = await simular(page, {
      "/v1/escritorio": { corpo: ESCRITORIO },
      [`GET ${R}`]: { corpo: CHEIO },
      [`POST ${R}/abertura`]: { corpo: { ...CHEIO, abertura: { ...ABERTURA, valor: 1318000, motivo: "Faltou uma aplicação." }, saldoHoje: 4101000 } },
    });
    await page.goto(PAGINA);
    await expect(page.getByText("R$ 12.480,00").first()).toBeVisible();
    await page.getByRole("button", { name: "Corrigir" }).click();
    const j = page.getByRole("dialog", { name: "Corrigir o saldo de abertura" });
    await expect(j).toBeVisible();
    await j.getByLabel("Saldo certo").fill("13.180,00");
    await expect(j.getByText("passa de")).toContainText("R$ 41.010,00");
    await j.getByRole("button", { name: "Corrigir o saldo" }).click();
    await expect(j.getByText("Escreva o motivo, com pelo menos 5 letras.")).toBeVisible();
    await semViolacoes(page);
    await j.getByLabel("Por que corrigir").fill("Faltou uma aplicação.");
    await j.getByRole("button", { name: "Corrigir o saldo" }).click();
    await expect(page.getByText("Saldo de abertura corrigido.")).toBeVisible();
    expect(pedidos.find((p) => p.metodo === "POST")!.corpo).toEqual({ data: "2026-08-31", valor: 1318000, motivo: "Faltou uma aplicação." });
  });

  test("Quem tem o Financeiro sem ser dona vê só para ler, com a meta", async ({ page }) => {
    await simular(page, {
      "/v1/escritorio": { corpo: BIANCA_ESC },
      [`GET ${R}`]: { corpo: { ...CHEIO, dono: false } },
    });
    await page.goto(PAGINA);
    await expect(page.getByText("Você vê esta página só para ler.")).toBeVisible();
    await expect(page.getByText("Paulo Serra · Contabilidade Silva")).toBeVisible();
    await expect(page.getByText("R$ 50.000,00 todo mês")).toBeVisible();
    await expect(page.getByText("2 dias úteis", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Salvar" })).toHaveCount(0);
    await expect(page.getByRole("textbox")).toHaveCount(0);
    await semViolacoes(page);
  });

  test("Sem a área Financeiro, os ajustes não abrem", async ({ page }) => {
    const pedidos = await simular(page, { "/v1/escritorio": { corpo: SEM_AREA } });
    await page.goto(PAGINA);
    await expect(page.getByText("Os ajustes do financeiro são da área Financeiro")).toBeVisible();
    expect(pedidos.some((p) => p.caminho === R)).toBe(false);
    await semViolacoes(page);
  });
});
