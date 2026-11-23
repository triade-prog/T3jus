// Cadastro e primeira reunião pela conversa, parte 5 (AP-07; F3.130), desenho aprovado em
// docs/design/aprovadas/portal-jornada-fechamento (grupo 7, decisões 30 a 32): o Novo cliente com o
// nome e o telefone da conversa, a volta à conversa já ligada à ficha, e o Novo compromisso em cima
// da conversa com o quadro "Com quem". A API é simulada; aqui se testa a tela, a acessibilidade e o
// que ela manda ao servidor.
import { expect, test, type Page } from "@playwright/test";
import { semViolacoes } from "./console-dados.ts";

const P = "http://localhost:3000";
const ESC = "e0000000-0000-4000-8000-0000000000a1";
const ESCRITORIO = {
  id: ESC, nome: "Ribeiro & Matos", pessoa: "Marina Ribeiro", dono: true, areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"],
  socios: ["Marina Ribeiro"], pessoas: 7, outrosEscritorios: 0, funcoes: ["SOCIO"], cnpj: null, cidade: "São Paulo", uf: "SP", endereco: null,
  contatos: [], ultimaExportacao: null, conversasEsperando: 1,
};
const MARINA = { id: "aa000000-0000-4000-8000-000000000001", nome: "Marina Ribeiro" };
const DIEGO = { id: "aa000000-0000-4000-8000-000000000002", nome: "Diego Almeida" };
const RAF = "c0000000-0000-4000-8000-000000000003";
const CLI = "d0000000-0000-4000-8000-000000000003";
const atras = (min: number) => new Date(Date.now() - min * 60_000).toISOString();

type Resp = { status?: number; corpo: unknown };
type Pedido = { metodo: string; caminho: string; busca: string; corpo: unknown };
async function simular(page: Page, rotas: Record<string, Resp>) {
  const pedidos: Pedido[] = [];
  await page.route("**/api/v1/**", async (rota) => {
    const url = new URL(rota.request().url());
    const caminho = url.pathname.replace(/^\/api/, "");
    const metodo = rota.request().method();
    pedidos.push({ metodo, caminho, busca: url.search, corpo: rota.request().postDataJSON() });
    const x = rotas[`${metodo} ${caminho}${url.search}`] ?? rotas[`${metodo} ${caminho}`] ?? { status: 404, corpo: { erro: { codigo: "NOT_FOUND" } } };
    await rota.fulfill({ status: x.status ?? 200, contentType: "application/json", body: JSON.stringify(x.corpo) });
  });
  return pedidos;
}

const RAFAELA = {
  id: RAF, nome: "Rafaela Moura", telefone: "+5511976402281", cliente: null, quemEscreve: "Rafaela Moura", papel: null, resolvidaEm: null,
  situacao: "PRECISA", motivo: "CLIENTE_NOVO", responsavel: DIEGO, assumidaPor: null, esperandoDesde: atras(42), ultimaEm: atras(40),
  ultima: { autor: "CLIENTE", texto: "Rafaela Moura. Depois das 14h.", anexo: null },
};
const LISTA = {
  whatsapp: { situacao: "LIGADO", numero: "+551130001000", quemLiga: MARINA }, eu: MARINA.id,
  contagem: { precisa: 1, equipe: 0, ia: 0, resolvidas: 0 }, hoje: { resolvidas: 0, respondidas: 0, avisos: 0 }, conversas: [RAFAELA],
};
const CONV = {
  ...RAFAELA, versao: 1, motivoTexto: "Número que não está em Clientes, pedindo atendimento trabalhista.", responsavelRazao: "COMERCIAL",
  assumidaEm: null, notaIa: null, eu: MARINA.id, whatsappLigado: true, principal: false, juridico: true,
  mensagens: [{ id: "r1", autor: "CLIENTE", texto: "Oi, bom dia. Fui demitida, vocês atendem esse tipo de caso?", em: atras(45) }],
  contexto: { proxContato: null, caso: null, compromisso: null },
};
const LIGADA = { ...CONV, cliente: { id: CLI, nome: "Rafaela Moura" }, principal: true, versao: 2 };
const CONTATO = { id: RAF, nome: "Rafaela Moura", telefone: "+5511976402281", clienteId: null, responsavel: DIEGO };

function comuns(conversa: unknown): Record<string, Resp> {
  return {
    "GET /v1/escritorio": { corpo: ESCRITORIO },
    "GET /v1/escritorio/conversas": { corpo: LISTA },
    "GET /v1/escritorio/pessoas": { corpo: { pessoas: [MARINA, DIEGO] } },
    [`GET /v1/escritorio/conversas/${RAF}`]: { corpo: conversa },
    [`GET /v1/escritorio/conversas/${RAF}/contato`]: { corpo: CONTATO },
    "GET /v1/escritorio/clientes/duplicados": { corpo: { duplicados: [] } },
  };
}

const ehCelular = (page: Page) => (page.viewportSize()?.width ?? 1000) <= 760;

test.describe("Cadastro e primeira reunião pela conversa (AP-07)", () => {
  test("decisões 30 e 31: o Novo cliente vem com o nome e o telefone da conversa e volta para ela, já ligada", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(LIGADA),
      "POST /v1/escritorio/clientes": { status: 201, corpo: { id: CLI, versao: 1 } },
    });
    await page.goto(`${P}/clientes/novo?conversa=${RAF}`);
    const veio = page.getByRole("note").filter({ hasText: "Veio da conversa com (11) 97640-2281." });
    await expect(veio).toContainText("a conversa fica ligada à ficha de Rafaela e você volta para ela");
    await expect(veio.getByRole("link", { name: "Voltar sem cadastrar" })).toBeVisible();
    await expect(page.getByLabel(/Nome completo/)).toHaveValue("Rafaela Moura");
    await expect(page.getByLabel(/Telefone ou WhatsApp/)).toHaveValue("(11) 97640-2281");
    await expect(page.locator("label", { hasText: "Nome completo" }).getByText("da conversa")).toBeVisible();
    await expect(page.getByRole("button", { name: "Voltar à conversa", exact: true })).toBeVisible();
    await semViolacoes(page);

    await page.getByRole("button", { name: "Cadastrar e voltar à conversa" }).click();
    await expect(page).toHaveURL(`${P}/conversas?c=${RAF}`);
    const post = pedidos.find((p) => p.metodo === "POST" && p.caminho === "/v1/escritorio/clientes")!;
    expect((post.corpo as { conversaId: string; nome: string }).conversaId).toBe(RAF);
    expect((post.corpo as { nome: string }).nome).toBe("Rafaela Moura");

    const aviso = page.getByRole("status").filter({ hasText: "Rafaela Moura cadastrada." });
    await expect(aviso).toContainText("A conversa ficou ligada à ficha de Rafaela.");
    await expect(page.getByText("Cliente desde hoje")).toBeVisible();
    if (ehCelular(page)) await page.getByText("Sobre Rafaela").click();
    const ctx = page.getByRole(ehCelular(page) ? "group" : "complementary", { name: /Sobre Rafaela/ });
    await expect(ctx.getByRole("button", { name: "Marcar primeira reunião" })).toBeVisible();
    await expect(ctx.getByRole("link", { name: "Abrir a ficha" })).toHaveAttribute("href", `/clientes/${CLI}`);
    await semViolacoes(page);
  });

  test("voltar sem cadastrar leva de volta à conversa; sem conversa, o cadastro de sempre", async ({ page }) => {
    const pedidos = await simular(page, comuns(CONV));
    await page.goto(`${P}/clientes/novo?conversa=${RAF}`);
    await page.getByRole("link", { name: "Voltar sem cadastrar" }).click();
    await expect(page).toHaveURL(`${P}/conversas?c=${RAF}`);
    expect(pedidos.some((p) => p.metodo === "POST")).toBe(false);
    await page.goto(`${P}/clientes/novo`);
    await expect(page.getByRole("button", { name: "Cadastrar cliente" })).toBeVisible();
    await expect(page.getByText("Veio da conversa")).toHaveCount(0);
  });

  test("decisão 32: Marcar primeira reunião abre o Novo compromisso em cima da conversa, com Com quem", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(CONV),
      "POST /v1/escritorio/compromissos": { status: 201, corpo: { id: "cc000000-0000-4000-8000-000000000001", versao: 2 } },
    });
    await page.goto(`${P}/conversas?c=${RAF}`);
    await expect(page.getByText("Ainda não está em Clientes")).toBeVisible();
    if (ehCelular(page)) await page.getByText("Sobre Rafaela").click();
    const ctx = page.getByRole(ehCelular(page) ? "group" : "complementary", { name: /Sobre Rafaela/ });
    await ctx.getByRole("button", { name: "Marcar primeira reunião" }).click();

    const j = page.getByRole("dialog", { name: "Novo compromisso" });
    await expect(j).toContainText("Marcado a partir da conversa com Rafaela.");
    await expect(j.getByRole("radio", { name: "Reunião com cliente" })).toBeChecked();
    await expect(j.getByLabel("O que é")).toHaveValue("Primeira reunião · Rafaela Moura");
    const com = j.getByRole("group", { name: "Com quem" });
    await expect(com).toContainText("Rafaela Moura · (11) 97640-2281");
    await expect(com).toContainText("quando for cadastrada, o compromisso passa para a ficha dela");
    await expect(j.getByLabel("Cliente", { exact: true })).toHaveCount(0);
    await expect(j.getByLabel("Responsável")).toHaveValue(DIEGO.id);
    const lembrar = j.getByRole("checkbox", { name: /Lembrar Rafaela pelo WhatsApp/ });
    await expect(lembrar).toBeChecked();
    await expect(j).toContainText("Começa quando Rafaela for cadastrada em Clientes");
    await semViolacoes(page);

    await j.getByRole("button", { name: "Marcar compromisso" }).click();
    await expect(j).toBeHidden();
    const corpo = pedidos.find((p) => p.metodo === "POST" && p.caminho === "/v1/escritorio/compromissos")!.corpo as Record<string, unknown>;
    expect([corpo.conversaId, corpo.clienteId, corpo.lembrete, corpo.tipo, corpo.responsavelId]).toEqual([RAF, null, true, "CLIENTE", DIEGO.id]);
    await expect(page.getByRole("status").filter({ hasText: "Reunião marcada para" })).toContainText("O lembrete a Rafaela começa quando Rafaela for cadastrada");
  });
});
