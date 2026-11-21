// O êxito para conferir e o reembolso junto da parcela (F3.14 e F3.85), desenho aprovado em
// docs/design/aprovadas/portal-exito-conferir: o bloco do alto do A receber (fora dos números),
// conferir e lançar (com o motivo quando o valor muda), não cobrar (motivo e explicação), a
// linha da parcela com o êxito e o reembolso, e registrar a parcela com o reembolso junto.
// A API é simulada; aqui se testa a tela, a acessibilidade e o que ela manda.
import { expect, test, type Page } from "@playwright/test";
import { semViolacoes } from "./console-dados.ts";

const P = "http://localhost:3000";
const ESC = "e0000000-0000-4000-8000-0000000000a1";
const MARINA = { id: "a0000000-0000-4000-8000-000000000101", nome: "Marina Ribeiro" };
const DIEGO = { id: "a0000000-0000-4000-8000-000000000102", nome: "Diego Almeida" };
const EXITO = "e5000000-0000-4000-8000-000000000001";
const CASO = "ca000000-0000-4000-8000-000000000001";
const PARC = "b2000000-0000-4000-8000-000000000201";
const PARC_R = "b2000000-0000-4000-8000-000000000202";

const ESCRITORIO = {
  id: ESC, nome: "Ribeiro & Matos", pessoa: "Diego Almeida", dono: false, areas: ["FINANCEIRO", "JURIDICO"],
  socios: ["Marina Ribeiro"], pessoas: 5, outrosEscritorios: 0, funcoes: ["EQUIPE"], cnpj: null, cidade: "São Paulo", uf: "SP", endereco: null,
  contatos: [], ultimaExportacao: null,
};

const dia = (n: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(Date.now() + n * 864e5));
const br = (n: number) => dia(n).split("-").reverse().join("/");

const X = {
  id: EXITO, situacao: "PARA_CONFERIR", cliente: { id: "c1", nome: "Joana Pereira" },
  caso: { id: CASO, nome: "Pereira x Mercado Bom Preço", numero: "1001022-51.2026.5.02.0045", resultado: "ACORDO" },
  contrato: { id: "k1", numero: "C-2026-014", assinadoEm: "2026-02-20", responsavel: DIEGO },
  base: 2800000, percentual: 3000, sobre: "Valor da condenação ou do acordo", calculado: 840000, previstoEm: dia(24),
  encerrado: { por: MARINA, em: "2026-11-18T17:50:00Z", motivo: "Acordo homologado em audiência." },
  valorLancado: null, vencimento: null, motivoAjuste: null, motivoNaoCobrar: null, explicacao: null, recebimentoId: null, conferido: null,
};
const EXITOS = { total: 840000, n: 1, itens: [X] };
const SEM_EXITOS = { total: 0, n: 0, itens: [] };

const parcela = (id: string, nome: string, descricao: string, d: number, valor: number, extra = {}) => ({
  id, tipo: "PARCELADO", descricao, vencimento: dia(d), valor, recebido: 0, falta: valor, forma: "PIX", situacao: "A_VENCER", pagaEm: null,
  contrato: { id: "k2", numero: "C-2026-020", objeto: "Ação de cobrança" }, cliente: { id: "c2", nome }, responsavel: DIEGO, cobranca: null, cancelado: null, ...extra,
});
const LANCADA = parcela(PARC, "Joana Pereira", "Êxito · Pereira x Mercado Bom Preço", 24, 840000, {
  tipo: "EXITO", contrato: { id: "k1", numero: "C-2026-014", objeto: "Reclamação trabalhista" }, cliente: { id: "c1", nome: "Joana Pereira" },
  exito: { id: EXITO, encerradoEm: "2026-11-18T17:50:00Z", conferido: { por: DIEGO, em: "2026-11-21T13:00:00Z" }, calculado: 840000, base: 2800000, percentual: 3000, motivoAjuste: null, caso: { id: CASO, nome: "Pereira x Mercado Bom Preço" } },
});
const COM_REEMB = parcela(PARC_R, "Construtora Vale Alto Ltda.", "Parcela 2 de 3", 3, 240000, {
  reembolso: { valor: 124836, contas: [{ id: "cp1", descricao: "Custas da apelação", valor: 124836, pagaEm: dia(-4), caso: { id: CASO, nome: "Ação de cobrança" } }] },
});
const lista = (parcelas: unknown[]) => ({
  algum: true, contratos: true,
  totais: { aberto: { valor: 720000, n: 3 }, vencidas: { valor: 0, n: 0 }, seteDias: { valor: 240000, n: 1 }, recebidoMes: { valor: 0, n: 0 } },
  responsaveis: [DIEGO], parcelas,
});

type Resp = { status?: number; corpo: unknown };
type Pedido = { metodo: string; caminho: string; corpo: unknown };

async function simular(page: Page, rotas: Record<string, Resp | Resp[]>) {
  const pedidos: Pedido[] = [];
  await page.route("**/api/v1/**", async (rota) => {
    const url = new URL(rota.request().url());
    const caminho = url.pathname.replace(/^\/api/, "");
    const metodo = rota.request().method();
    pedidos.push({ metodo, caminho, corpo: rota.request().postDataJSON() });
    const r = rotas[`${metodo} ${caminho}`] ?? rotas[caminho];
    const l = Array.isArray(r) ? r : r ? [r] : [{ status: 404, corpo: { erro: { codigo: "NOT_FOUND" } } }];
    const vez = pedidos.filter((p) => p.caminho === caminho && p.metodo === metodo).length - 1;
    const x = l[Math.min(vez, l.length - 1)]!;
    await rota.fulfill({ status: x.status ?? 200, contentType: "application/json", body: JSON.stringify(x.corpo) });
  });
  return pedidos;
}

const comuns = () => ({
  "/v1/escritorio": { corpo: ESCRITORIO },
  "/v1/escritorio/pessoas": { corpo: { pessoas: [DIEGO, MARINA] } },
  "/v1/escritorio/avisos": { corpo: { novos: 0, total: 0, itens: [] } },
});

test.describe("Êxito para conferir e reembolso junto (F3.14, F3.85)", () => {
  test("Bloco do alto fora dos números; conferir com valor mudado pede o motivo e lança em A receber", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(),
      "GET /v1/escritorio/financeiro/exitos": [{ corpo: EXITOS }, { corpo: SEM_EXITOS }],
      "GET /v1/escritorio/financeiro/receber": [{ corpo: lista([]) }, { corpo: lista([LANCADA]) }],
      [`POST /v1/escritorio/financeiro/exitos/${EXITO}/lancar`]: [
        { status: 422, corpo: { erro: { codigo: "VALIDATION_ERROR", detalhes: { motivo: "MOTIVO_OBRIGATORIO", campos: ["motivoAjuste"] } } } },
        { status: 201, corpo: { ...X, situacao: "LANCADO", parcela: { ...LANCADA, valor: 800000, falta: 800000 } } },
      ],
    });
    await page.goto(`${P}/financeiro/a-receber`);
    const bloco = page.getByRole("region", { name: "Êxito para conferir" });
    await expect(bloco).toContainText("1 cliente · R$ 8.400,00 calculados pelo contrato");
    await expect(bloco).toContainText("1 esperando você");
    const linha = bloco.getByRole("row", { name: /Joana Pereira/ });
    await expect(linha).toContainText("30% de R$ 28.000,00");
    await expect(linha).toContainText("Marina Ribeiro");
    await expect(page.getByRole("group", { name: "Mostrar" })).toContainText("R$ 7.200,00");
    await semViolacoes(page);

    await linha.getByRole("button", { name: /Conferir o êxito de Joana Pereira/ }).click();
    const j = page.getByRole("dialog", { name: "Conferir o êxito" });
    await expect(j.getByLabel("Honorário de êxito")).toHaveValue("8.400,00");
    await expect(j.getByLabel("Vencimento")).toHaveValue(br(24));
    await expect(j).toContainText("30% de R$ 28.000,00 = R$ 8.400,00");
    await expect(j).toContainText("Diego Almeida");
    await semViolacoes(page);

    await j.getByLabel("Honorário de êxito").fill("");
    await j.getByRole("button", { name: "Lançar em A receber" }).click();
    await expect(j.getByText(/Diga o valor do honorário/)).toBeVisible();
    await expect(j.getByLabel("Honorário de êxito")).toBeFocused();
    expect(pedidos.some((p) => p.metodo === "POST")).toBe(false);

    await j.getByLabel("Honorário de êxito").fill("8.000,00");
    await j.getByRole("button", { name: "Lançar em A receber" }).click();
    await expect(j.getByLabel("Por que mudou o valor")).toBeFocused();
    await expect(j).toContainText("Escreva por que o valor mudou");
    await expect(j).toContainText("Era R$ 8.400,00, pelo contrato. Mudou para R$ 8.000,00.");
    expect(pedidos.some((p) => p.metodo === "POST")).toBe(false);
    // O servidor também pede o motivo, e o erro volta preso ao campo.
    await j.getByLabel("Por que mudou o valor").fill("Desconto combinado na audiência.");
    await j.getByRole("button", { name: "Lançar em A receber" }).click();
    await expect(j.getByLabel("Por que mudou o valor")).toHaveAttribute("aria-invalid", "true");
    await j.getByRole("button", { name: "Lançar em A receber" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Êxito lançado em A receber." })).toContainText(`R$ 8.000,00 de Joana Pereira, para ${br(24)}`);
    const corpo = pedidos.filter((p) => p.metodo === "POST").at(-1)!.corpo;
    expect(corpo).toEqual({ valor: 800000, vencimento: dia(24), forma: "PIX", motivoAjuste: "Desconto combinado na audiência." });
    await expect(page.getByRole("region", { name: "Êxito para conferir" })).toHaveCount(0);
    const nova = page.getByRole("row", { name: /Joana Pereira/ });
    await expect(nova).toContainText("Novo");
    await expect(nova).toContainText("Êxito");
    await expect(nova).toContainText("Do encerramento do caso em 18/11, conferido por Diego.");
    await semViolacoes(page);
  });

  test("Não cobrar: motivo e explicação obrigatórios; Voltar reabre a conferência", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(),
      "GET /v1/escritorio/financeiro/exitos": [{ corpo: EXITOS }, { corpo: SEM_EXITOS }],
      "GET /v1/escritorio/financeiro/receber": { corpo: lista([]) },
      [`POST /v1/escritorio/financeiro/exitos/${EXITO}/nao-cobrar`]: { corpo: { ...X, situacao: "NAO_COBRADO" } },
    });
    await page.goto(`${P}/financeiro/a-receber`);
    await page.getByRole("button", { name: /Conferir o êxito de Joana Pereira/ }).click();
    await page.getByRole("button", { name: "Não cobrar este êxito" }).click();
    const n = page.getByRole("dialog", { name: "Não cobrar este êxito" });
    await expect(n.getByRole("radio")).toHaveCount(3);
    // Decisão 1: "virá por alvará" não é motivo para não cobrar.
    await expect(n).not.toContainText("virá por alvará");
    await n.getByRole("button", { name: "Voltar" }).click();
    await expect(page.getByRole("dialog", { name: "Conferir o êxito" })).toBeVisible();
    await page.getByRole("button", { name: "Não cobrar este êxito" }).click();
    await n.getByRole("button", { name: "Não cobrar" }).click();
    await expect(n).toContainText("Escolha o motivo.");
    await expect(n).toContainText("Escreva a explicação");
    await semViolacoes(page);
    await n.getByRole("radio", { name: /Perdoado ou renegociado/ }).check();
    await n.getByLabel("Explique").fill("Renegociado com Joana em troca de pagar as parcelas fixas em dia.");
    await n.getByRole("button", { name: "Não cobrar" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Êxito não cobrado." })).toBeVisible();
    expect(pedidos.filter((p) => p.metodo === "POST").at(-1)!.corpo).toEqual({ motivo: "PERDOADO", explicacao: "Renegociado com Joana em troca de pagar as parcelas fixas em dia." });
    await expect(page.getByRole("region", { name: "Êxito para conferir" })).toHaveCount(0);
  });

  test("Reembolso junto: a linha mostra, e registrar leva o reembolso só quando marcado", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(),
      "GET /v1/escritorio/financeiro/exitos": { corpo: SEM_EXITOS },
      "GET /v1/escritorio/financeiro/receber": { corpo: lista([COM_REEMB]) },
      [`POST /v1/escritorio/financeiro/parcelas/${PARC_R}/recebimentos`]: [
        { status: 422, corpo: { erro: { codigo: "VALIDATION_ERROR", detalhes: { motivo: "REEMBOLSO_INTEIRO", campos: ["reembolsoValor"] } } } },
        { status: 201, corpo: { id: "p7", paga: true, falta: 0, recibo: { ano: 2026, numero: 190 }, reembolso: { valor: 124836, forma: "PIX" } } },
      ],
    });
    await page.goto(`${P}/financeiro/a-receber`);
    await expect(page.getByRole("region", { name: "Êxito para conferir" })).toHaveCount(0);
    const linha = page.getByRole("row", { name: /Construtora Vale Alto/ });
    await expect(linha).toContainText("+ reembolso R$ 1.248,36");
    await expect(linha).toContainText("Leva junto: reembolso custas da apelação, R$ 1.248,36.");
    await semViolacoes(page);

    await linha.getByRole("button", { name: /Registrar/ }).click();
    const j = page.getByRole("dialog", { name: "Registrar recebimento" });
    await expect(j).toContainText("Esta parcela leva junto um reembolso.");
    await expect(j.getByRole("table", { name: "Parcela e reembolso" })).toContainText("Total a pagar");
    await expect(j.getByRole("table", { name: "Parcela e reembolso" })).toContainText("R$ 3.648,36");
    const marcar = j.getByRole("checkbox", { name: /O reembolso também foi pago/ });
    await expect(marcar).not.toBeChecked();
    await marcar.check();
    await expect(j.getByLabel("Valor do reembolso")).toHaveValue("1.248,36");
    await expect(j.getByRole("button", { name: "Registrar R$ 3.648,36" })).toBeVisible();
    await j.getByLabel("Valor do reembolso").fill("2.000,00");
    await j.getByRole("button", { name: /^Registrar R\$/ }).click();
    await expect(j).toContainText("O valor passa do que o escritório adiantou (R$ 1.248,36).");
    await expect(j.getByLabel("Valor do reembolso")).toBeFocused();
    expect(pedidos.some((p) => p.metodo === "POST")).toBe(false);
    await semViolacoes(page);
    await j.getByLabel("Valor do reembolso").fill("1.248,36");
    await j.getByLabel("Forma do reembolso").selectOption("TRANSFERENCIA");
    await j.getByRole("button", { name: "Registrar R$ 3.648,36" }).click();
    await expect(j).toContainText("O reembolso se registra inteiro");
    await j.getByRole("button", { name: "Registrar R$ 3.648,36" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Recebimento registrado." })).toContainText("O reembolso de R$ 1.248,36 também ficou registrado.");
    const corpo = pedidos.filter((p) => p.metodo === "POST").at(-1)!.corpo as Record<string, unknown>;
    expect(corpo.valor).toBe(240000);
    expect(corpo.reembolso).toEqual({ valor: 124836, forma: "TRANSFERENCIA" });
  });

  test("F3.94: a parcela do êxito baixada pela divisão do alvará diz de onde veio a baixa", async ({ page }) => {
    const paga = { ...LANCADA, recebido: 840000, falta: 0, situacao: "PAGA", pagaEm: dia(-1),
      baixaAlvara: [{ tipo: "ALVARA", entrouEm: dia(-1), valor: 840000, levantamentoId: "l1" }] };
    await simular(page, {
      ...comuns(),
      "GET /v1/escritorio/financeiro/exitos": { corpo: SEM_EXITOS },
      "GET /v1/escritorio/financeiro/receber": { corpo: lista([paga]) },
    });
    await page.goto(`${P}/financeiro/a-receber`);
    const linha = page.getByRole("row", { name: /Joana Pereira/ });
    await expect(linha).toContainText(`Baixada pela divisão do alvará de ${br(-1).slice(0, 5)}.`);
    await semViolacoes(page);
  });

  test("F3.95: o valor que cobre a parcela e o reembolso só sugere marcar", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(),
      "GET /v1/escritorio/financeiro/exitos": { corpo: SEM_EXITOS },
      "GET /v1/escritorio/financeiro/receber": { corpo: lista([COM_REEMB]) },
      [`POST /v1/escritorio/financeiro/parcelas/${PARC_R}/recebimentos`]: { status: 201, corpo: { id: "p7", paga: true, falta: 0, recibo: { ano: 2026, numero: 190 }, reembolso: { valor: 124836, forma: "PIX" } } },
    });
    await page.goto(`${P}/financeiro/a-receber`);
    await page.getByRole("row", { name: /Construtora Vale Alto/ }).getByRole("button", { name: /Registrar/ }).click();
    const j = page.getByRole("dialog", { name: "Registrar recebimento" });
    const marcar = j.getByRole("checkbox", { name: /O reembolso também foi pago/ });
    await expect(j.getByText(/O valor cobre a parcela e o reembolso/)).toHaveCount(0);
    await j.getByLabel("Valor recebido da parcela").fill("3.648,36");
    await expect(j.getByText("O valor cobre a parcela e o reembolso (R$ 2.400,00 + R$ 1.248,36). Marcar o reembolso como pago?")).toBeVisible();
    await expect(marcar).not.toBeChecked();
    await semViolacoes(page);
    await j.getByRole("button", { name: "Marcar o reembolso" }).click();
    await expect(marcar).toBeChecked();
    await expect(j.getByLabel("Valor recebido da parcela")).toHaveValue("2.400,00");
    await expect(j.getByLabel("Valor do reembolso")).toHaveValue("1.248,36");
    await expect(j.getByText(/O valor cobre a parcela e o reembolso/)).toHaveCount(0);
    await j.getByRole("button", { name: "Registrar R$ 3.648,36" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Recebimento registrado." })).toBeVisible();
    const corpo = pedidos.filter((p) => p.metodo === "POST").at(-1)!.corpo as Record<string, unknown>;
    expect(corpo.valor).toBe(240000);
    expect(corpo.reembolso).toEqual({ valor: 124836, forma: "PIX" });
  });

  test("F3.95: o recibo mostra o reembolso como segunda linha e soma no total", async ({ page }) => {
    const id = "a9000000-0000-4000-8000-000000000019";
    await simular(page, {
      ...comuns(),
      [`GET /v1/escritorio/recibos/${id}`]: { corpo: {
        numero: { ano: 2026, numero: 190 },
        escritorio: { nome: "Ribeiro & Matos", cnpj: "11222333000181", endereco: "Rua Augusta, 1200", cidade: "São Paulo", uf: "SP", contatos: [], whatsapp: null },
        cliente: { id: "c2", nome: "Construtora Vale Alto Ltda.", tipo: "PJ", documento: "11222333000181" }, pagador: null,
        contrato: { id: "k2", numero: "C-2026-020", objeto: "Ação de cobrança" },
        parcela: { id: PARC_R, descricao: "Parcela 2 de 3", vencimento: dia(0), ordem: 2, total: 3 },
        valor: 240000, multaJuros: null, forma: "CHEQUE_PRE", pagoEm: dia(0),
        registradoPor: { nome: "Diego Almeida", oab: null }, registradoEm: new Date().toISOString(), pagamentoId: id,
        reembolsos: [{ descricao: "Custas da apelação", valor: 124836, forma: "PIX", adiantadoEm: dia(-4), caso: "Ação de cobrança" }],
      } },
    });
    await page.goto(`${P}/recibos/${id}`);
    const folha = page.getByRole("article", { name: "Recibo nº 2026-0190" });
    const tab = folha.getByRole("table");
    await expect(tab.getByRole("row").nth(1)).toContainText("Honorários · parcela 2 de 3");
    await expect(tab.getByRole("row").nth(2)).toContainText("Reembolso · custas da apelação");
    await expect(tab.getByRole("row").nth(2)).toContainText(`Despesa adiantada pelo escritório em ${br(-4)} no caso Ação de cobrança · Pix`);
    await expect(tab).toContainText("R$ 3.648,36");
    await expect(folha).toContainText("e ao reembolso de R$ 1.248,36 de despesa adiantada pelo escritório (custas da apelação), pagos por Cheque pré-datado (honorários) e Pix (reembolso)");
    await semViolacoes(page);
  });

  test("Celular: o bloco e a janela de conferir cabem na tela", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await simular(page, {
      ...comuns(),
      "GET /v1/escritorio/financeiro/exitos": { corpo: EXITOS },
      "GET /v1/escritorio/financeiro/receber": { corpo: lista([LANCADA, COM_REEMB]) },
    });
    await page.goto(`${P}/financeiro/a-receber`);
    await expect(page.getByRole("region", { name: "Êxito para conferir" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await page.getByRole("button", { name: /Conferir o êxito de Joana Pereira/ }).click();
    await expect(page.getByRole("dialog", { name: "Conferir o êxito" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await semViolacoes(page);
  });
});
