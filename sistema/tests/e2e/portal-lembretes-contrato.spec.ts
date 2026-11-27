// Lembretes de contrato (F3.144, F3.145; VA-05), telas aprovadas em
// docs/design/aprovadas/portal-importacao-sobras (lista, entrada, viraram, dispensados,
// dispensar, dispensar-erro, dispensar-conflito, dispensado) e na rodada 2
// (dispensar-sem-motivo, ja-dispensado, trazido-resolvido, busca-vazia-viraram). A API é
// simulada; aqui se testa a tela, a acessibilidade e o que ela manda ao servidor.
import { expect, test, type Page } from "@playwright/test";
import { agora, fixarRelogio, semViolacoes } from "./console-dados.ts";

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

const ehCelular = (page: Page) => (page.viewportSize()?.width ?? 1000) < 760;
const MARINA = { id: "a0000000-0000-4000-8000-000000000101", nome: "Marina Ribeiro" };
const FELIPE = { id: "a0000000-0000-4000-8000-000000000102", nome: "Felipe Matos" };
const lid = (n: number) => `d1000000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`;
const cid = (n: number) => `c1000000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`;
const IMP = "f1000000-0000-4000-8000-000000000001";

const lembrete = (n: number, nome: string, valor: number, x: Record<string, unknown> = {}) => ({
  id: lid(n), situacao: "ABERTO", valor, lancamentos: 1, maisAntigo: "2026-11-15", cliente: { id: cid(n), nome }, caso: null, contratoAtivo: null,
  contrato: null, dispensa: null, importacaoId: IMP, origem: "ASTREA", ...x,
});
const ABERTOS = [
  lembrete(1, "Márcio Tavares", 375000, { lancamentos: 3, maisAntigo: "2026-06-10", caso: { id: "k1", nome: "Tavares x Metalúrgica Andrade", responsavel: FELIPE } }),
  lembrete(2, "Construtora Vale Alto Ltda.", 280000, { lancamentos: 2, contratoAtivo: { id: "k24", numero: "C-2026-024" } }),
  lembrete(3, "Osvaldo Pereira Lins", 125000, { caso: { id: "k3", nome: "Lins x Banco Horizonte", responsavel: MARINA } }),
];
const TOTAIS = { abertos: { n: 81, valor: 4525000 }, contrato: { n: 4, valor: 240000 }, dispensados: { n: 2, valor: 125000 } };
const IMPORTACOES = [{ id: IMP, origem: "ASTREA", em: "2026-11-21T19:52:00Z", por: MARINA, lembretes: 87, valor: 4890000 }];
const lista = (situacao: string, lembretes: unknown[], x: Record<string, unknown> = {}) => ({
  hoje: "2026-11-23", situacao, ordem: situacao === "ABERTO" ? "VALOR" : null, q: null, pular: 0, totais: TOTAIS, clientesAbertos: 81,
  total: situacao === "ABERTO" ? 81 : lembretes.length, valor: situacao === "ABERTO" ? 4525000 : 125000, lembretes, importacoes: IMPORTACOES, ...x,
});
const DISPENSADOS = [
  lembrete(4, "Jorge Batista", 50000, { situacao: "DISPENSADO", dispensa: { motivo: "PERDOADO", detalhe: "Cliente de longa data; a sócia decidiu não cobrar.", em: "2026-11-22T15:00:00Z", por: MARINA } }),
];

// O relógio do navegador fica em AGORA, o mesmo instante de onde os dados contam (F3.164).
test.beforeEach(async ({ page }) => { await fixarRelogio(page); });

test.describe("Lembretes de contrato (F3.144, F3.145)", () => {
  test("Abertos: os três números, o valor com o mais antigo, o contrato ativo e Criar o contrato com o cliente", async ({ page }) => {
    const pedidos = await simular(page, {
      "/v1/escritorio": { corpo: ESCRITORIO },
      "GET /v1/escritorio/contratos/lembretes": { corpo: lista("ABERTO", ABERTOS) },
    });
    await page.goto(`${P}/contratos/contratos/lembretes`);
    await expect(page.getByRole("heading", { level: 1, name: "Lembretes de contrato" })).toBeVisible();
    const nums = page.getByRole("navigation", { name: "Mostrar lembretes" });
    await expect(nums.getByRole("link", { name: /Abertos/ })).toHaveAttribute("aria-current", "true");
    await expect(nums).toContainText("R$ 45.250,00");
    await expect(page.getByRole("status").filter({ hasText: "81 lembretes abertos" })).toContainText("81 lembretes abertos · R$ 45.250,00 · do maior valor para o menor");
    const tab = page.getByRole("table", { name: "Lembretes de contrato abertos" });
    const marcio = tab.getByRole("row", { name: /Márcio Tavares/ });
    await expect(marcio).toContainText("Caso Tavares x Metalúrgica Andrade · com Felipe Matos");
    await expect(marcio).toContainText("3 lançamentos · o mais antigo venceu em 10/06/2026");
    await expect(marcio.getByRole("link", { name: "Criar o contrato de Márcio Tavares" })).toHaveAttribute("href", `/contratos/contratos/novo?cliente=${cid(1)}`);
    await expect(tab.getByRole("row", { name: /Vale Alto/ })).toContainText("Já tem o contrato C-2026-024, ativo.");
    await expect(page.getByText("Mostrando 3 de 81")).toBeVisible();
    await expect(page.getByRole("region", { name: "De onde vieram" })).toContainText("87 · R$ 48.900,00");
    await semViolacoes(page);
    await page.getByRole("combobox", { name: "Ordem" }).selectOption("ANTIGO");
    await expect.poll(() => pedidos.filter((p) => p.caminho === "/v1/escritorio/contratos/lembretes").at(-1)?.busca).toContain("ordem=ANTIGO");
    await page.getByRole("button", { name: "Mostrar mais 25" }).click();
    await expect.poll(() => pedidos.filter((p) => p.caminho === "/v1/escritorio/contratos/lembretes").at(-1)?.busca).toContain("pular=3");
  });

  test("Dispensar: sem motivo, Outro motivo sem detalhe, e o que vai ao servidor; o aviso com Desfazer", async ({ page }) => {
    const pedidos = await simular(page, {
      "/v1/escritorio": { corpo: ESCRITORIO },
      "GET /v1/escritorio/contratos/lembretes": { corpo: lista("ABERTO", ABERTOS) },
      [`POST /v1/escritorio/contratos/lembretes/${lid(3)}/dispensar`]: { corpo: {
        lembrete: { ...ABERTOS[2], situacao: "DISPENSADO" }, totais: { ...TOTAIS, abertos: { n: 80, valor: 4400000 }, dispensados: { n: 3, valor: 250000 } }, clientesAbertos: 80,
      } },
    });
    await page.goto(`${P}/contratos/contratos/lembretes`);
    await page.getByRole("button", { name: "Dispensar o lembrete de Osvaldo Pereira Lins" }).click();
    const j = page.getByRole("alertdialog", { name: "Dispensar o lembrete de Osvaldo?" });
    await expect(j).toContainText("Use quando o escritório não vai cobrar este valor pelo T3jus.");
    await expect(j).toContainText("O histórico do Astrea não muda.");
    await j.getByRole("button", { name: "Dispensar o lembrete" }).click();
    await expect(j).toContainText("Falta escolher o motivo.");
    await expect(j).toContainText("Escolha o motivo. Ele fica no histórico do cliente, com o seu nome.");
    await expect(j.getByRole("radio", { name: "Já negociado ou recebido fora do T3jus" })).toBeFocused();
    await semViolacoes(page);
    await j.getByRole("radio", { name: "Outro motivo" }).check();
    await j.getByRole("button", { name: "Dispensar o lembrete" }).click();
    await expect(j).toContainText("Falta escrever o motivo.");
    await expect(j.getByRole("textbox", { name: "Escreva o motivo" })).toBeFocused();
    expect(pedidos.some((p) => p.metodo === "POST")).toBe(false);
    await j.getByRole("textbox", { name: "Escreva o motivo" }).fill("Cliente faleceu, sem herdeiros");
    await j.getByRole("button", { name: "Dispensar o lembrete" }).click();
    await expect(page.getByText("Lembrete de Osvaldo dispensado.")).toBeVisible();
    expect(pedidos.find((p) => p.metodo === "POST")?.corpo).toEqual({ motivo: "OUTRO", detalhe: "Cliente faleceu, sem herdeiros" });
    await expect(page.getByRole("navigation", { name: "Mostrar lembretes" })).toContainText("R$ 44.000,00");
    await expect(page.getByRole("table", { name: "Lembretes de contrato abertos" }).getByRole("row", { name: /Osvaldo/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Desfazer" })).toBeVisible();
  });

  test("Já dispensado por outra pessoa: nada mudou, diz quem, e um botão só", async ({ page }) => {
    const em = new Date(agora - 3 * 60_000).toISOString();
    await simular(page, {
      "/v1/escritorio": { corpo: ESCRITORIO },
      "GET /v1/escritorio/contratos/lembretes": { corpo: lista("ABERTO", ABERTOS) },
      [`POST /v1/escritorio/contratos/lembretes/${lid(3)}/dispensar`]: { status: 409, corpo: { erro: { codigo: "VERSION_CONFLICT", detalhes: { motivo: "JA_DISPENSADO", por: FELIPE, em } } } },
    });
    await page.goto(`${P}/contratos/contratos/lembretes`);
    await page.getByRole("button", { name: "Dispensar o lembrete de Osvaldo Pereira Lins" }).click();
    const j = page.getByRole("alertdialog", { name: "Dispensar o lembrete de Osvaldo?" });
    await j.getByRole("radio", { name: "O escritório perdoou o valor" }).check();
    await j.getByRole("button", { name: "Dispensar o lembrete" }).click();
    await expect(j).toContainText("Este lembrete já foi dispensado.");
    await expect(j).toContainText("Felipe Matos já dispensou este lembrete há 3 minutos. Nada mudou: o motivo que você escolheu não foi gravado.");
    await expect(j).toContainText("Alguém mexeu neste lembrete enquanto a janela estava aberta.");
    await expect(j.getByRole("button", { name: "Ver a lista atualizada" })).toBeVisible();
    await expect(j.getByRole("button", { name: "Dispensar o lembrete" })).toHaveCount(0);
    await semViolacoes(page);
  });

  // F3.186 (desenho portal-exclusao-contratos-conversas, estados lembrete- e trazer-excluido-na-hora).
  test("F3.186: dispensar o lembrete de quem foi excluído com a janela aberta diz que ele saiu da lista", async ({ page }) => {
    await simular(page, {
      "/v1/escritorio": { corpo: ESCRITORIO },
      "GET /v1/escritorio/contratos/lembretes": { corpo: lista("ABERTO", ABERTOS) },
      [`POST /v1/escritorio/contratos/lembretes/${lid(3)}/dispensar`]: { status: 422, corpo: { erro: { codigo: "VALIDATION_ERROR", detalhes: { motivo: "CLIENTE_EXCLUIDO" } } } },
    });
    await page.goto(`${P}/contratos/contratos/lembretes`);
    await page.getByRole("button", { name: "Dispensar o lembrete de Osvaldo Pereira Lins" }).click();
    const j = page.getByRole("alertdialog", { name: "Dispensar o lembrete de Osvaldo?" });
    await j.getByRole("radio", { name: "O escritório perdoou o valor" }).check();
    await j.getByRole("button", { name: "Dispensar o lembrete" }).click();
    await expect(j).toContainText("Os dados do cliente foram excluídos enquanto a janela estava aberta.");
    await expect(j).toContainText("O cliente foi excluído a pedido do titular.");
    await expect(j).toContainText("O lembrete saiu da lista. Não há o que dispensar, e nada foi gravado.");
    await expect(j.getByRole("button", { name: "Ver a lista atualizada" })).toBeVisible();
    await semViolacoes(page);
  });

  test("F3.186: trazer de volta o lembrete de quem foi excluído agora há pouco mostra o aviso, mesmo com a lista vazia", async ({ page }) => {
    await simular(page, {
      "/v1/escritorio": { corpo: ESCRITORIO },
      "GET /v1/escritorio/contratos/lembretes": [{ corpo: lista("DISPENSADO", DISPENSADOS) }, { corpo: lista("DISPENSADO", []) }],
      [`POST /v1/escritorio/contratos/lembretes/${lid(4)}/trazer`]: { status: 422, corpo: { erro: { codigo: "VALIDATION_ERROR", detalhes: { motivo: "CLIENTE_EXCLUIDO" } } } },
    });
    await page.goto(`${P}/contratos/contratos/lembretes?mostrar=dispensados`);
    await page.getByRole("button", { name: "Trazer de volta o lembrete de Jorge Batista" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Não deu para trazer de volta. O cliente foi excluído a pedido do titular." }))
      .toContainText("O lembrete de Jorge saiu da lista. Não há o que trazer de volta. A lista abaixo já está atualizada.");
    await expect(page.getByRole("table", { name: "Lembretes dispensados" })).toHaveCount(0);
    await semViolacoes(page);
  });

  test("Dispensados: o motivo com quem e quando; trazer de volta já resolvido leva a Viraram contrato", async ({ page }) => {
    const pedidos = await simular(page, {
      "/v1/escritorio": { corpo: ESCRITORIO },
      "GET /v1/escritorio/contratos/lembretes": { corpo: lista("DISPENSADO", DISPENSADOS) },
      [`POST /v1/escritorio/contratos/lembretes/${lid(4)}/trazer`]: { corpo: {
        lembrete: { ...DISPENSADOS[0], situacao: "CONTRATO", dispensa: null, contrato: { id: "k39", numero: "C-2026-039", em: "2026-11-22T18:00:00Z", por: FELIPE } },
        totais: { ...TOTAIS, contrato: { n: 5, valor: 290000 }, dispensados: { n: 1, valor: 75000 } }, clientesAbertos: 81,
      } },
    });
    await page.goto(`${P}/contratos/contratos/lembretes?mostrar=dispensados`);
    const tab = page.getByRole("table", { name: "Lembretes dispensados" });
    const jorge = tab.getByRole("row", { name: /Jorge Batista/ });
    await expect(jorge).toContainText("O escritório perdoou o valor");
    await expect(jorge).toContainText("“Cliente de longa data; a sócia decidiu não cobrar.”");
    await expect(jorge).toContainText("Dispensado em 22/11 por Marina Ribeiro");
    await expect(page.getByRole("combobox", { name: "Ordem" })).toHaveCount(0);
    await semViolacoes(page);
    await jorge.getByRole("button", { name: "Trazer de volta o lembrete de Jorge Batista" }).click();
    await expect(page.getByText("O lembrete de Jorge voltou já resolvido.")).toBeVisible();
    await expect(page.getByText("O contrato C-2026-039 foi criado enquanto ele estava dispensado.")).toBeVisible();
    expect(pedidos.some((p) => p.metodo === "POST" && p.caminho.endsWith("/trazer"))).toBe(true);
    await page.getByRole("link", { name: "Ver em Viraram contrato" }).click();
    await expect.poll(() => pedidos.filter((p) => p.caminho === "/v1/escritorio/contratos/lembretes").at(-1)?.busca).toContain("situacao=CONTRATO");
  });

  test("Busca vazia em Viraram contrato: diz o grupo e que a busca vai junto", async ({ page }) => {
    await simular(page, {
      "/v1/escritorio": { corpo: ESCRITORIO },
      "GET /v1/escritorio/contratos/lembretes": { corpo: lista("CONTRATO", [], { q: "Tavares", total: 0, valor: 0 }) },
    });
    await page.goto(`${P}/contratos/contratos/lembretes?mostrar=viraram&q=Tavares`);
    await expect(page.getByRole("heading", { name: "Nenhum lembrete em Viraram contrato para “Tavares”" })).toBeVisible();
    await expect(page.getByText("Aqui a busca olha só os que viraram contrato.")).toBeVisible();
    await expect(page.getByRole("link", { name: /Abertos/ })).toHaveAttribute("href", "/contratos/contratos/lembretes?mostrar=abertos&q=Tavares");
    await expect(page.getByRole("button", { name: "Limpar a busca" })).toBeVisible();
    await semViolacoes(page);
  });

  test("A faixa na lista de Contratos leva aos lembretes e some sem nenhum aberto", async ({ page }) => {
    const LISTA = { algum: true, contagem: { ativos: 0, elaboracao: 0, encerrados: 0, base: 0 }, contratos: [] };
    await simular(page, {
      "/v1/escritorio": { corpo: ESCRITORIO },
      "GET /v1/escritorio/contratos": { corpo: LISTA },
      "GET /v1/escritorio/contratos/pedidos": { corpo: [] },
      "GET /v1/escritorio/contratos/sem-caso": { corpo: { contratos: [] } },
      "GET /v1/escritorio/contratos/lembretes/resumo": [
        { corpo: { clientes: 81, abertos: 81, valor: 4525000, origem: "ASTREA", importadoEm: "2026-11-21T19:52:00Z" } },
        { corpo: { clientes: 0, abertos: 0, valor: 0, origem: null, importadoEm: null } },
      ],
    });
    await page.goto(`${P}/contratos/contratos`);
    await expect(page.getByText("81 clientes têm valor em aberto no Astrea e ainda não têm contrato.")).toBeVisible();
    await expect(page.getByText("São R$ 45.250,00 que vieram da importação de 21/11.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Ver os lembretes" })).toHaveAttribute("href", "/contratos/contratos/lembretes");
    await semViolacoes(page);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Contratos" })).toBeVisible();
    await expect(page.getByText("têm valor em aberto no Astrea")).toHaveCount(0);
  });

  test("Celular: os números um embaixo do outro e as ações em largura cheia", async ({ page }) => {
    test.skip(!ehCelular(page), "só no celular");
    await simular(page, {
      "/v1/escritorio": { corpo: ESCRITORIO },
      "GET /v1/escritorio/contratos/lembretes": { corpo: lista("ABERTO", ABERTOS) },
    });
    await page.goto(`${P}/contratos/contratos/lembretes`);
    await expect(page.getByRole("table", { name: "Lembretes de contrato abertos" })).toBeVisible();
    const largura = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(largura).toBeLessThanOrEqual(0);
  });
});
