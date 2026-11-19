// Jurídico do Portal, parte 2 (telas aprovadas em docs/design/aprovadas/portal-juridico,
// estados prazos, novo-prazo, tarefas, tarefas-equipe e a seção "Prazos e tarefas" da ficha):
// prazos agrupados do que vence hoje ao que vence depois, com a urgência escrita; cumprir com
// confirmação; tarefas minhas e da equipe com a carga; "esperando alguém" e "já chegou"; o
// próximo prazo e as pendências na lista de casos. A API é simulada; aqui se testa a tela, a
// acessibilidade e o que ela manda.
import { expect, test, type Page } from "@playwright/test";
import { semViolacoes } from "./console-dados.ts";

const P = "http://localhost:3000";
const ESCRITORIO = {
  id: "e0000000-0000-4000-8000-0000000000a1", nome: "Ribeiro & Matos", pessoa: "Marina Ribeiro", dono: true, areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"],
  socios: ["Marina Ribeiro"], pessoas: 5, outrosEscritorios: 0, funcoes: ["SOCIO"], cnpj: null, cidade: "São Paulo", uf: "SP", endereco: null,
  contatos: [], ultimaExportacao: null,
};

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

const HOJE = "2026-11-18"; // quarta
const MARINA = { id: "p1000000-0000-4000-8000-000000000001", nome: "Marina Ribeiro" };
const FELIPE = { id: "p1000000-0000-4000-8000-000000000002", nome: "Felipe Matos" };
const LARISSA = { id: "p1000000-0000-4000-8000-000000000003", nome: "Larissa Costa" };
const caso = (n: number, nome: string, numero: string | null, vara: string | null = null) => ({ id: `a1000000-0000-4000-8000-00000000000${n}`, nome, numero, vara });
const PEREIRA = caso(1, "Pereira x Mercado Bom Preço", "10010225120265020045", "45ª Vara do Trabalho");
const SOUZA = caso(2, "Souza x Construtora Atlas", "08123456720268260100", "4ª Vara Cível");
const ANDRADE = caso(3, "Andrade x Unimed Paulistana", "10048712020258260011", "Foro de Pinheiros");
const prazo = (n: number, descricao: string, dataFinal: string, c: typeof PEREIRA, responsavel: typeof MARINA, extra: Record<string, unknown> = {}) => ({
  id: `b1000000-0000-4000-8000-00000000000${n}`, descricao, dataFinal, fazerAte: null, intimacaoEm: null, lembrar: true, cumpridoEm: null, cumpridoPor: null,
  responsavel, caso: c, ...extra,
});
const PRAZOS = [
  prazo(1, "Contestação", "2026-11-18", SOUZA, FELIPE),
  prazo(2, "Manifestação sobre laudo", "2026-11-18", ANDRADE, LARISSA),
  prazo(3, "Recurso ordinário", "2026-11-19", PEREIRA, MARINA, { fazerAte: "2026-11-18" }),
  prazo(4, "Réplica", "2026-11-20", SOUZA, FELIPE),
  prazo(5, "Alegações finais", "2026-11-26", PEREIRA, MARINA),
];
const LISTA_PRAZOS = { hoje: HOJE, totais: { abertos: 5, meus: 2, hoje: 2 }, responsaveis: [FELIPE, LARISSA, MARINA], prazos: PRAZOS };

const tarefa = (n: number, titulo: string, venceEm: string, c: { id: string; nome: string }, responsavel: typeof MARINA, extra: Record<string, unknown> = {}) => ({
  id: `d1000000-0000-4000-8000-00000000000${n}`, titulo, venceEm, esperando: null, esperandoDesde: null, concluidaEm: null, concluidaPor: null,
  responsavel, caso: { id: c.id, nome: c.nome }, ...extra,
});
const TAREFAS = [
  tarefa(1, "Devolver a minuta de acordo", "2026-11-17", SOUZA, MARINA),
  tarefa(2, "Minuta do recurso ordinário", "2026-11-18", PEREIRA, MARINA),
  tarefa(3, "Conversar com Joana sobre o acordo", "2026-11-20", PEREIRA, MARINA),
  tarefa(4, "Assinar e protocolar a petição inicial", "2026-11-25", ANDRADE, MARINA, { esperando: "o cliente: procuração assinada", esperandoDesde: "2026-11-11" }),
];
const MINHAS = { hoje: HOJE, totais: { minhas: 4, equipe: 6, atrasadas: 1, esperando: 1 }, responsaveis: [FELIPE, LARISSA, MARINA], tarefas: TAREFAS, carga: null };
const EQUIPE = {
  ...MINHAS,
  tarefas: [...TAREFAS, tarefa(5, "Calcular as horas extras", "2026-11-20", PEREIRA, LARISSA, { esperando: "o cliente: CTPS digital", esperandoDesde: "2026-11-10" }),
    tarefa(6, "Juntar o comprovante das custas", "2026-11-14", SOUZA, FELIPE)],
  carga: [
    { pessoa: MARINA, casos: 2, tarefas: 4, atrasadas: 1 },
    { pessoa: FELIPE, casos: 1, tarefas: 1, atrasadas: 1 },
    { pessoa: LARISSA, casos: 1, tarefas: 1, atrasadas: 0 },
  ],
};

const comuns = () => ({
  "/v1/escritorio": { corpo: ESCRITORIO },
  "GET /v1/escritorio/pessoas": { corpo: { pessoas: [MARINA, FELIPE, LARISSA] } },
  "GET /v1/escritorio/juridico/prazos": { corpo: LISTA_PRAZOS },
  "GET /v1/escritorio/juridico/tarefas": { corpo: MINHAS },
  "GET /v1/escritorio/juridico/tarefas?visao=EQUIPE": { corpo: EQUIPE },
  "GET /v1/escritorio/juridico/casos": {
    corpo: {
      hoje: HOJE, etapas: [], totais: { andamento: 3, encerrados: 0, prazoHoje: 2 }, responsaveis: [MARINA], souDono: true,
      casos: [PEREIRA, SOUZA, ANDRADE].map((c) => ({
        ...c, area: "TRABALHISTA", situacao: "ANDAMENTO", resultado: null, parteContraria: null, cliente: { id: "c1", nome: "Joana Pereira" }, outrosClientes: 0,
        semContrato: false, etapa: { id: "e1", ordem: 1, nome: "Preparação", final: false }, responsavel: MARINA, etapaDesde: "2026-11-07T13:00:00Z",
        proximoPrazo: c === PEREIRA ? { data: "2026-11-19", fazerAte: "2026-11-18", descricao: "Recurso ordinário" } : c === SOUZA ? { data: "2026-11-18", fazerAte: null, descricao: "Contestação" } : { data: "2026-11-26", fazerAte: null, descricao: "Réplica" },
        pendencias: c === PEREIRA ? 2 : 0,
      })),
    },
  },
});

test.describe("Jurídico do Portal, prazos e tarefas (EX-02, EX-04, PD-05, IN-08)", () => {
  test("Prazos: agrupados pela data, urgência escrita, fazer até e responsável", async ({ page }) => {
    const pedidos = await simular(page, comuns());
    await page.goto(`${P}/juridico/prazos`);
    await expect(page.getByRole("heading", { level: 1, name: "Prazos" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Prazos abertos" })).toBeVisible();
    await expect(page.getByText("5 prazos · 2 vencem hoje · do mais próximo para o mais distante")).toBeVisible();
    for (const g of ["Hoje · quarta, 18/11", "Amanhã · quinta, 19/11", "Até sexta", "Depois"]) await expect(page.getByRole("heading", { name: new RegExp(`^${g}`) })).toBeVisible();
    const recurso = page.getByRole("listitem").filter({ hasText: "Recurso ordinário" });
    await expect(recurso).toContainText("Amanhã");
    await expect(recurso).toContainText("fazer até hoje");
    await expect(recurso).toContainText("1001022-51.2026.5.02.0045");
    await expect(recurso).toContainText("Marina Ribeiro");
    await expect(page.getByRole("listitem").filter({ hasText: "Contestação" })).toContainText("Vence hoje");
    await expect(page.getByRole("listitem").filter({ hasText: "Alegações finais" })).toContainText("Em 8 dias");
    await expect(page.getByText("Nenhum prazo sem dono.")).toBeVisible();
    await expect(page.getByText(/não lê as publicações dos tribunais nem conta dias úteis/)).toBeVisible();
    await semViolacoes(page);
    await page.getByLabel("Responsável").selectOption(FELIPE.id);
    await expect.poll(() => pedidos.filter((p) => p.caminho === "/v1/escritorio/juridico/prazos").at(-1)?.busca).toContain(`responsavel=${FELIPE.id}`);
    await page.getByRole("button", { name: "Só meus (2)" }).click();
    await expect.poll(() => pedidos.filter((p) => p.caminho === "/v1/escritorio/juridico/prazos").at(-1)?.busca).toBe("?mostrar=MEUS");
  });

  test("Cumprido pede confirmação e manda o pedido", async ({ page }) => {
    const pedidos = await simular(page, { ...comuns(), [`POST /v1/escritorio/juridico/prazos/${PRAZOS[0]!.id}/cumprido`]: { corpo: { id: PRAZOS[0]!.id, cumpridoEm: "2026-11-18T13:00:00Z" } } });
    await page.goto(`${P}/juridico/prazos`);
    await page.getByRole("button", { name: "Cumprido: Contestação, Souza x Construtora Atlas" }).click();
    const j = page.getByRole("alertdialog", { name: "Marcar o prazo como cumprido?" });
    await expect(j).toContainText("Contestação, prazo final 18/11/2026");
    await expect(j.getByRole("button", { name: "Cancelar" })).toBeFocused();
    await semViolacoes(page);
    await j.getByRole("button", { name: "Marcar como cumprido" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Prazo cumprido" })).toBeVisible();
    expect(pedidos.some((p) => p.metodo === "POST" && p.caminho.endsWith("/cumprido"))).toBe(true);
  });

  test("Novo prazo: erros presos ao campo, fazer até depois do prazo, e o que vai ao servidor", async ({ page }) => {
    const pedidos = await simular(page, { ...comuns(), "POST /v1/escritorio/juridico/prazos": { status: 201, corpo: { id: "b9" } } });
    await page.goto(`${P}/juridico/prazos`);
    await page.getByRole("button", { name: "Novo prazo" }).click();
    const j = page.getByRole("dialog", { name: "Novo prazo" });
    await expect(j.getByLabel("Responsável", { exact: true })).toHaveValue(MARINA.id);
    await expect(j).toContainText("o T3jus ainda não lê publicações nem calcula dias úteis");
    await j.getByLabel("Prazo final").fill("02/12/2026");
    await j.getByLabel("Fazer até").fill("03/12/2026");
    await j.getByRole("button", { name: "Cadastrar prazo" }).click();
    await expect(j.getByText("Falta acertar 3 pontos, marcados abaixo.")).toBeVisible();
    await expect(j.getByLabel("Caso")).toBeFocused();
    await expect(j.getByText("no prazo final ou antes")).toBeVisible();
    await semViolacoes(page);
    await j.getByLabel("Caso").selectOption(ANDRADE.id);
    await expect(j.getByText("1004871-20.2025.8.26.0011 · Trabalhista")).toBeVisible();
    await j.getByLabel("O que é").fill("Alegações finais");
    await j.getByLabel("Fazer até").fill("01/12/2026");
    await j.getByLabel("Intimação em").fill("18/11/2026");
    await j.getByLabel("Responsável", { exact: true }).selectOption(LARISSA.id);
    await j.getByRole("button", { name: "Cadastrar prazo" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Prazo cadastrado" })).toBeVisible();
    expect(pedidos.find((p) => p.metodo === "POST" && p.caminho === "/v1/escritorio/juridico/prazos")!.corpo).toEqual({
      casoId: ANDRADE.id, descricao: "Alegações finais", dataFinal: "2026-12-02", fazerAte: "2026-12-01", intimacaoEm: "2026-11-18", responsavelId: LARISSA.id, lembrar: true,
    });
  });

  test("Minhas tarefas: grupos, esperando alguém, concluir e já chegou", async ({ page }) => {
    const t4 = TAREFAS[3]!.id;
    const pedidos = await simular(page, {
      ...comuns(),
      [`POST /v1/escritorio/juridico/tarefas/${TAREFAS[1]!.id}/concluida`]: { corpo: { id: TAREFAS[1]!.id, concluida: true } },
      [`POST /v1/escritorio/juridico/tarefas/${t4}/chegou`]: { corpo: { id: t4 } },
    });
    await page.goto(`${P}/juridico/tarefas`);
    await expect(page.getByRole("heading", { level: 1, name: "Tarefas" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Minhas tarefas" })).toBeVisible();
    await expect(page.getByText("4 abertas · 1 atrasada · 1 esperando alguém")).toBeVisible();
    for (const g of ["Atrasadas", "Hoje", "Esta semana", "Esperando alguém"]) await expect(page.getByRole("heading", { name: new RegExp(`^${g}`) })).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: "Devolver a minuta" })).toContainText("Venceu ontem");
    await expect(page.getByRole("listitem").filter({ hasText: "Conversar com Joana" })).toContainText("20/11 · sex");
    const espera = page.getByRole("listitem").filter({ hasText: "Assinar e protocolar" });
    await expect(espera).toContainText("Esperando o cliente: procuração assinada, há 7 dias");
    await expect(page.getByText("Cada uma com dono e data.")).toBeVisible();
    await semViolacoes(page);
    await page.getByRole("checkbox", { name: "Minuta do recurso ordinário" }).check();
    await expect(page.getByRole("status").filter({ hasText: "Tarefa concluída" })).toBeVisible();
    expect(pedidos.find((p) => p.caminho.endsWith("/concluida"))!.corpo).toEqual({ concluir: true });
    await espera.getByRole("button", { name: "Já chegou" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Não espera mais" })).toBeVisible();
  });

  test("Tarefas da equipe: responsável e a carga de cada pessoa", async ({ page }) => {
    await simular(page, comuns());
    await page.goto(`${P}/juridico/tarefas`);
    await page.getByRole("button", { name: "Da equipe (6)" }).click();
    await expect(page.getByRole("heading", { name: "Tarefas da equipe" })).toBeVisible();
    const carga = page.getByRole("region", { name: "Carga da equipe" });
    await expect(carga).toContainText("Marina Ribeiro");
    await expect(carga).toContainText("2 casos · 4 tarefas · 1 atrasada");
    await expect(carga).toContainText("não para comparar pessoas");
    await expect(page.getByRole("listitem").filter({ hasText: "Calcular as horas extras" })).toContainText("Larissa Costa");
    await expect(page.getByLabel("Responsável")).toBeVisible();
    await semViolacoes(page);
  });

  test("Lista de casos: próximo prazo e pendências", async ({ page }) => {
    await simular(page, comuns());
    await page.goto(`${P}/juridico/casos`);
    await expect(page.getByText("2 com prazo hoje · ordenados pelo prazo mais próximo")).toBeVisible();
    const tab = page.getByRole("table", { name: "Casos" });
    const pereira = tab.getByRole("row", { name: /Pereira x Mercado/ });
    await expect(pereira).toContainText("Amanhã");
    await expect(pereira).toContainText("19/11 · Recurso ordinário");
    await expect(pereira).toContainText("2 pendências");
    await expect(tab.getByRole("row", { name: /Souza x/ })).toContainText("Vence hoje");
    await expect(tab.getByRole("row", { name: /Andrade x/ })).toContainText("26/11 · qui");
    await semViolacoes(page);
  });

  test("Ficha: prazos e tarefas do caso, o que está travando e o novo prazo com o caso fixo", async ({ page }) => {
    const ficha = {
      ...PEREIRA, area: "TRABALHISTA", situacao: "ANDAMENTO", resultado: null, parteContraria: "Mercado Bom Preço", cliente: { id: "c1", nome: "Joana Pereira" },
      outrosClientes: 0, semContrato: false, etapa: { id: "e5", ordem: 5, nome: "Sentença", final: false }, responsavel: MARINA, etapaDesde: "2026-11-07T13:00:00Z",
      proximoPrazo: null, pendencias: 1, tribunal: "TRT-2", sistema: "PJe-JT", distribuidoEm: null, valorCausa: null, avisarCliente: true, encerradoEm: null,
      versao: 1, criadoEm: "2026-03-03T13:00:00Z", veHonorarios: true, clientes: [], quemTemContratos: [], mudancas: [],
      etapas: [5, 6].map((n) => ({ id: `e${n}`, ordem: n, nome: n === 5 ? "Sentença" : "Recurso", descricao: null, textoCliente: "x", avisaFinanceiro: false, final: false, casos: 0 })),
      hoje: HOJE, escritorio: "Ribeiro & Matos", faltam: [], documentos: [],
      prazos: [PRAZOS[2], prazo(8, "Embargos de declaração", "2026-11-13", PEREIRA, MARINA, { cumpridoEm: "2026-11-13T15:00:00Z", cumpridoPor: MARINA })],
      tarefas: [TAREFAS[1], tarefa(5, "Calcular as horas extras", "2026-11-20", PEREIRA, LARISSA, { esperando: "o cliente: CTPS digital", esperandoDesde: "2026-11-10" }),
        tarefa(7, "Pedir a cópia do laudo", "2026-11-12", PEREIRA, MARINA, { concluidaEm: "2026-11-12T15:00:00Z", concluidaPor: MARINA })],
    };
    const pedidos = await simular(page, {
      ...comuns(),
      [`GET /v1/escritorio/juridico/casos/${PEREIRA.id}`]: { corpo: ficha },
      "POST /v1/escritorio/juridico/prazos": { status: 201, corpo: { id: "b9" } },
      [`POST /v1/escritorio/juridico/tarefas/d1000000-0000-4000-8000-000000000007/concluida`]: { corpo: { id: "d7", concluida: false } },
    });
    await page.goto(`${P}/juridico/casos/${PEREIRA.id}`);
    const pt = page.getByRole("region", { name: "Prazos e tarefas" });
    await expect(pt).toContainText("1 prazo aberto · 2 tarefas abertas");
    await expect(pt).toContainText("Prazo final 19/11/2026 · fazer até hoje, 18/11 · Marina Ribeiro");
    await expect(pt).toContainText("Cumprido em 13/11 por Marina Ribeiro");
    await expect(pt.getByRole("listitem").filter({ hasText: "Calcular as horas extras" })).toContainText("Travada");
    const trava = page.getByRole("region", { name: "O que está travando" });
    await expect(trava).toContainText("Esperando o cliente: CTPS digital, há 8 dias.");
    await expect(trava).toContainText("Trava: Calcular as horas extras (Larissa Costa).");
    await semViolacoes(page);
    await pt.getByRole("checkbox", { name: /Pedir a cópia do laudo/ }).uncheck();
    await expect(page.getByRole("status").filter({ hasText: "Tarefa reaberta" })).toBeVisible();
    expect(pedidos.find((p) => p.caminho.endsWith("/concluida"))!.corpo).toEqual({ concluir: false });
    await pt.getByRole("button", { name: "Novo prazo" }).click();
    const j = page.getByRole("dialog", { name: "Novo prazo" });
    await expect(j).toContainText("Pereira x Mercado Bom Preço");
    await expect(j.getByLabel("O que é")).toBeFocused();
    await j.getByLabel("O que é").fill("Contrarrazões");
    await j.getByLabel("Prazo final").fill("01/12/2026");
    await j.getByRole("button", { name: "Cadastrar prazo" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Prazo cadastrado" })).toBeVisible();
    expect(pedidos.find((p) => p.metodo === "POST" && p.caminho === "/v1/escritorio/juridico/prazos")!.corpo).toMatchObject({ casoId: PEREIRA.id, dataFinal: "2026-12-01" });
  });
});
