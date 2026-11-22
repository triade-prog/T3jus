// Jornada do cliente, parte 1 (CH-11, CH-12; F3.125, F3.126), tela aprovada em
// docs/design/aprovadas/portal-jornada-fechamento (grupos 1 a 3): o filtro "Assinados sem caso"
// em Contratos com a janela do caso que aceita "não tem caso"; o aviso no alto de Jurídico ›
// Casos e processos; e a assinatura que sugere juntar ao caso que o cliente já tem. A API é
// simulada; aqui se testa a tela, a acessibilidade e o que ela manda ao servidor.
import { expect, test, type Page } from "@playwright/test";
import { h, semViolacoes } from "./console-dados.ts";

const P = "http://localhost:3000";
const ESC = "e0000000-0000-4000-8000-0000000000a1";
const MARINA = { id: "a0000000-0000-4000-8000-000000000101", nome: "Marina Ribeiro" };
const LARISSA = { id: "a0000000-0000-4000-8000-000000000105", nome: "Larissa Costa" };
const CT = "b2000000-0000-4000-8000-000000000022";
const CT2 = "b2000000-0000-4000-8000-000000000025";
const CLI = "c1000000-0000-4000-8000-000000000222";
const CASO = "ca000000-0000-4000-8000-000000000007";

const ESCRITORIO = {
  id: ESC, nome: "Ribeiro & Matos", pessoa: "Marina Ribeiro", dono: true, areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"],
  socios: ["Marina Ribeiro"], pessoas: 5, outrosEscritorios: 0, funcoes: ["SOCIO"], cnpj: null, cidade: "São Paulo", uf: "SP", endereco: null,
  contatos: [], ultimaExportacao: null,
};
const SO_CONTRATOS = { ...ESCRITORIO, pessoa: "Bianca Lopes", dono: false, areas: ["CONTRATOS"], funcoes: ["EQUIPE"] };

const dia = (n: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(Date.now() + n * 864e5));

const SEM_CASO = {
  podeAbrir: true, quemAbre: null,
  contratos: [
    { id: CT, numero: "C-2026-022", objeto: "Revisão de aposentadoria", assinadoEm: dia(-19), area: "PREVIDENCIARIO", responsavel: MARINA,
      cliente: { id: CLI, nome: "Hélio Batista Corrêa" } },
    { id: CT2, numero: "C-2026-025", objeto: "Consultoria trabalhista", assinadoEm: dia(-5), area: "TRABALHISTA", responsavel: MARINA,
      cliente: { id: "c1000000-0000-4000-8000-000000000225", nome: "Irene Campos" } },
  ],
};
const LISTA = { algum: true, contagem: { ativos: 2, elaboracao: 0, encerrados: 0, base: 0 }, contratos: [] };
const opcoes = (id: string, numero: string, nome: string, extra = {}) => ({
  contrato: { id, numero, objeto: "Revisão de aposentadoria", situacao: "ATIVO", versao: 3, criadoEm: h(24 * 30), area: "PREVIDENCIARIO", semCaso: false,
              cliente: { id: CLI, nome } },
  casoLigado: null,
  sugestao: { nome: `${nome} · Revisão de aposentadoria`, area: "PREVIDENCIARIO", responsavelId: LARISSA.id, papel: "AUTOR" },
  responsavelSugerido: LARISSA, escolhe: true, responsaveis: [LARISSA, MARINA], casos: [], modoSugerido: "NOVO", casosDoCliente: [],
  ...extra,
});
const ETAPAS = [{ id: "e1000000-0000-4000-8000-000000000001", ordem: 1, nome: "Análise", final: false, aviso: null }];
const CASOS = { hoje: dia(0), etapas: ETAPAS, totais: { andamento: 1, encerrados: 0, prazoHoje: 0 }, responsaveis: [LARISSA], souDono: true, casos: [] };

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
const comuns = (escritorio: unknown = ESCRITORIO) => ({
  "/v1/escritorio": { corpo: escritorio },
  "/v1/escritorio/pessoas": { corpo: { pessoas: [LARISSA, MARINA] } },
  "GET /v1/escritorio/contratos": { corpo: LISTA },
  "GET /v1/escritorio/contratos/pedidos": { corpo: [] },
});

test.describe("Jornada do cliente: o caso da assinatura (CH-11, CH-12)", () => {
  test("Contratos: o filtro Assinados sem caso e a janela que marca 'não tem caso'", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(),
      "GET /v1/escritorio/contratos/sem-caso": [{ corpo: SEM_CASO }, { corpo: { ...SEM_CASO, contratos: SEM_CASO.contratos.slice(0, 1) } }],
      [`GET /v1/escritorio/contratos/${CT2}/caso`]: { corpo: opcoes(CT2, "C-2026-025", "Irene Campos") },
      [`POST /v1/escritorio/contratos/${CT2}/caso`]: { corpo: { casoId: null, semCaso: true } },
    });
    await page.goto(`${P}/contratos/contratos`);
    const chip = page.getByRole("button", { name: /Assinados sem caso/ });
    await expect(chip).toBeVisible();
    await chip.click();
    await expect(page.getByRole("status").filter({ hasText: "2 contratos assinados sem caso" })).toBeVisible();
    await expect(page.getByText("Estes contratos foram assinados sem a pergunta do caso.")).toBeVisible();
    await semViolacoes(page);
    await page.getByRole("button", { name: /Abrir o caso\s*: contrato C-2026-025, Irene Campos/ }).click();
    const j = page.getByRole("dialog", { name: "O caso deste contrato" });
    await j.getByRole("radio", { name: /Este contrato não tem caso/ }).check();
    await semViolacoes(page);
    await j.getByRole("button", { name: "Marcar sem caso" }).click();
    await expect(j).toHaveCount(0);
    await expect(page.getByRole("status").filter({ hasText: "1 contrato assinado sem caso" })).toBeVisible();
    const corpo = pedidos.filter((p) => p.metodo === "POST" && p.caminho === `/v1/escritorio/contratos/${CT2}/caso`).at(-1)?.corpo;
    expect(corpo).toEqual({ caso: { modo: "SEM" } });
  });

  test("Contratos: o link ?mostrar=sem-caso abre no filtro; sem nenhum, diz que está tudo em ordem", async ({ page }) => {
    await simular(page, { ...comuns(), "GET /v1/escritorio/contratos/sem-caso": { corpo: { ...SEM_CASO, contratos: [] } } });
    await page.goto(`${P}/contratos/contratos?mostrar=sem-caso`);
    await expect(page.getByRole("heading", { name: "Nenhum contrato assinado sem caso" })).toBeVisible();
    await semViolacoes(page);
    await page.getByRole("button", { name: "Ver todos os contratos" }).click();
    await expect(page.getByRole("button", { name: /Assinados sem caso/ })).toHaveCount(0);
  });

  test("quem não tem Jurídico vê a lista, sem o botão, e sabe quem abre", async ({ page }) => {
    await simular(page, {
      ...comuns(SO_CONTRATOS),
      "GET /v1/escritorio/contratos/sem-caso": { corpo: { ...SEM_CASO, podeAbrir: false, quemAbre: ["Larissa Costa"] } },
    });
    await page.goto(`${P}/contratos/contratos?mostrar=sem-caso`);
    await expect(page.getByText("Quem abre o caso tem a área Jurídico: Larissa Costa.", { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Abrir o caso/ })).toHaveCount(0);
    await semViolacoes(page);
  });

  test("Jurídico: o aviso dos assinados sem caso no alto de Casos e processos; abrir leva ao caso", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(),
      "GET /v1/escritorio/contratos/sem-caso": { corpo: SEM_CASO },
      "GET /v1/escritorio/juridico/casos": { corpo: CASOS },
      [`GET /v1/escritorio/contratos/${CT}/caso`]: { corpo: opcoes(CT, "C-2026-022", "Hélio Batista Corrêa") },
      [`POST /v1/escritorio/contratos/${CT}/caso`]: { corpo: { casoId: CASO, semCaso: false } },
    });
    await page.goto(`${P}/juridico/casos`);
    await expect(page.getByText("2 contratos assinados ainda não têm caso.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Ver na lista de Contratos" })).toHaveAttribute("href", "/contratos/contratos?mostrar=sem-caso");
    await semViolacoes(page);
    await page.getByRole("list", { name: "Contratos assinados sem caso" }).getByRole("button", { name: /Hélio Batista Corrêa/ }).click();
    const j = page.getByRole("dialog", { name: "O caso deste contrato" });
    await expect(j.getByLabel("Nome do caso")).toHaveValue("Hélio Batista Corrêa · Revisão de aposentadoria");
    await j.getByRole("button", { name: "Abrir o caso" }).click();
    await expect(page).toHaveURL(new RegExp(`/juridico/casos/${CASO}`));
    expect(pedidos.find((p) => p.metodo === "POST" && p.caminho === `/v1/escritorio/contratos/${CT}/caso`)?.corpo)
      .toMatchObject({ caso: { modo: "NOVO", responsavelId: LARISSA.id } });
  });

  test("Jurídico: sem nenhum assinado sem caso, o aviso não aparece", async ({ page }) => {
    await simular(page, {
      ...comuns(),
      "GET /v1/escritorio/contratos/sem-caso": { corpo: { ...SEM_CASO, contratos: [] } },
      "GET /v1/escritorio/juridico/casos": { corpo: CASOS },
    });
    await page.goto(`${P}/juridico/casos`);
    await expect(page.getByRole("heading", { name: /Onde estão os/ })).toBeVisible();
    await expect(page.getByText(/assinados? ainda não t/)).toHaveCount(0);
  });

  test("assinatura: com o cliente num caso sem contrato, a janela sugere juntar a ele (CH-12)", async ({ page }) => {
    const casoDoCliente = { id: CASO, nome: "Batista Corrêa x INSS", papel: "AUTOR", etapa: "Análise", responsavel: LARISSA, abertoPor: LARISSA, abertoEm: h(24 * 3) };
    const op = opcoes(CT, "C-2026-022", "Hélio Batista Corrêa", { modoSugerido: "JUNTAR", casosDoCliente: [casoDoCliente] });
    // A pergunta do caso é a mesma peça na assinatura e na janela curta; o caminho completo da
    // assinatura fica em portal-ficha-ligada.spec.ts. Aqui se vê a sugestão pela lista de Contratos.
    const pedidos = await simular(page, {
      ...comuns(),
      "GET /v1/escritorio/contratos/sem-caso": { corpo: { ...SEM_CASO, contratos: SEM_CASO.contratos.slice(0, 1) } },
      [`GET /v1/escritorio/contratos/${CT}/caso`]: { corpo: op },
      [`POST /v1/escritorio/contratos/${CT}/caso`]: { corpo: { casoId: CASO, semCaso: false } },
    });
    await page.goto(`${P}/contratos/contratos?mostrar=sem-caso`);
    await page.getByRole("button", { name: /Abrir o caso\s*: contrato C-2026-022/ }).click();
    const j = page.getByRole("dialog", { name: "O caso deste contrato" });
    await expect(j.getByRole("radio", { name: /Juntar a este caso: Batista Corrêa x INSS/ })).toBeChecked();
    await semViolacoes(page);
    await j.getByRole("button", { name: "Juntar ao caso" }).click();
    await expect(page).toHaveURL(new RegExp(`/juridico/casos/${CASO}`));
    expect(pedidos.find((p) => p.metodo === "POST" && p.caminho === `/v1/escritorio/contratos/${CT}/caso`)?.corpo)
      .toEqual({ caso: { modo: "JUNTAR", casoId: CASO, papel: "AUTOR" } });
  });
});
