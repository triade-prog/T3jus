// Financeiro do Portal, A receber (telas aprovadas em docs/design/aprovadas/portal-financeiro):
// a lista por vencimento com os quatro números que também são filtros, registrar recebimento
// (da linha e do alto, com os erros do servidor) e a ficha de parcelas do contrato com a
// cobrança. A API é simulada; aqui se testa a tela, a acessibilidade e o que ela manda.
import { expect, test, type Page } from "@playwright/test";
import { semViolacoes } from "./console-dados.ts";

const P = "http://localhost:3000";
const ESC = "e0000000-0000-4000-8000-0000000000a1";
const MARINA = { id: "a0000000-0000-4000-8000-000000000101", nome: "Marina Ribeiro" };
const DIEGO = { id: "a0000000-0000-4000-8000-000000000102", nome: "Diego Almeida" };
const FELIPE = { id: "a0000000-0000-4000-8000-000000000103", nome: "Felipe Matos" };
const ct = (n: number) => `f1000000-0000-4000-8000-0000000001${String(n).padStart(2, "0")}`;
const pc = (n: number) => `b2000000-0000-4000-8000-0000000001${String(n).padStart(2, "0")}`;

const ESCRITORIO = {
  id: ESC, nome: "Ribeiro & Matos", pessoa: "Marina Ribeiro", dono: true, areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"],
  socios: ["Marina Ribeiro"], pessoas: 5, outrosEscritorios: 0, funcoes: ["SOCIO"], cnpj: null, cidade: "São Paulo", uf: "SP", endereco: null,
  contatos: [], ultimaExportacao: null,
};
const SEM_AREA = { ...ESCRITORIO, pessoa: "Diego Almeida", dono: false, areas: ["COMERCIAL"], funcoes: ["EQUIPE"] };

const dia = (n: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(Date.now() + n * 864e5));
const br = (n: number) => dia(n).split("-").reverse().join("/");
const em = (n: number, h: string) => `${dia(n)}T${h}:00-03:00`;

const cobranca = (motivo: string | null, proxOque: string, d: number, quem = DIEGO) => ({
  tipo: "LIGACAO", texto: "Ninguém atendeu.", motivo, motivoDesde: em(-10, "10:05"), proxData: dia(d), proxOque, proxResponsavel: quem, autor: DIEGO, em: em(-10, "10:05"),
});
const parcela = (n: number, nome: string, objeto: string, descricao: string, d: number, valor: number, situacao: string, extra = {}) => ({
  id: pc(n), tipo: "PARCELADO", descricao, vencimento: dia(d), valor, recebido: 0, falta: valor, forma: "PIX", situacao, pagaEm: null,
  contrato: { id: ct(n), numero: `C-2026-0${n}`, objeto }, cliente: { id: `c${n}`, nome }, responsavel: DIEGO, cobranca: null, cancelado: null, ...extra,
});
const DANIELA = parcela(11, "Daniela Rocha Mendes", "Reclamação trabalhista", "Entrada 2 de 5", -74, 120000, "VENCIDA",
  { cobranca: cobranca("Está desempregada e pediu para pagar depois do acordo.", "propor descontar do valor do acordo", 8, MARINA) });
const HELIO = parcela(22, "Hélio Batista Corrêa", "Ação revisional", "Parcela 3 de 6", -24, 85000, "VENCIDA",
  { cobranca: cobranca("Não respondeu aos lembretes do WhatsApp", "ligar para Marta Corrêa, a esposa", 1) });
const BENEDITO = parcela(33, "Benedito Souza Lima", "Revisão de aposentadoria", "Parcela 2 de 4", 1, 145000, "A_VENCER");
const IRENE = parcela(44, "Irene Castro", "Consultoria previdenciária", "Parcela 1 de 3", 3, 110000, "A_VENCER", { forma: "BOLETO" });
const LISTA = {
  algum: true, contratos: true,
  totais: { aberto: { valor: 460000, n: 4 }, vencidas: { valor: 205000, n: 2 }, seteDias: { valor: 255000, n: 2 }, recebidoMes: { valor: 3124000, n: 19 } },
  responsaveis: [DIEGO, MARINA],
  parcelas: [DANIELA, HELIO, BENEDITO, IRENE],
};

const pg = (n: number, valor: number, d: number, recibo: number | null) => ({
  id: `p${n}`, valor, multaJuros: null, recebidoEm: dia(d), forma: "PIX", autor: MARINA, em: em(d, "15:20"), recibo: recibo ? { ano: 2026, numero: recibo } : null,
});
const fp = (n: number, d: number, situacao: string, extra = {}) => ({
  ...parcela(22, "Hélio Batista Corrêa", "Ação revisional", `Parcela ${n} de 4`, d, 85000, situacao), id: pc(60 + n), pagamentos: [], eventos: [], ...extra,
});
const FICHA = {
  id: ct(22), numero: "C-2026-022", objeto: "Ação revisional", situacao: "ATIVO", cliente: { id: "c22", nome: "Hélio Batista Corrêa" }, responsavel: DIEGO,
  condicoes: [{ tipo: "PARCELADO", total: 340000, parcelas: 4, primeiro: dia(-85) }],
  totais: { contratado: 340000, recebido: 170000, atraso: 85000, aVencer: 85000 }, aguardandoBase: 0,
  parcelas: [
    fp(1, -85, "PAGA", { recebido: 85000, falta: 0, pagaEm: dia(-85), pagamentos: [pg(1, 85000, -85, 98)] }),
    fp(2, -55, "PAGA", { recebido: 85000, falta: 0, pagaEm: dia(-51), pagamentos: [pg(2, 85000, -51, 131)] }),
    fp(3, -24, "VENCIDA", {
      cobranca: cobranca("Não respondeu aos lembretes do WhatsApp", "ligar para Marta Corrêa, a esposa", 1),
      eventos: [{ tipo: "LIGACAO", texto: "Ninguém atendeu.", motivo: "Não respondeu aos lembretes do WhatsApp", proxData: dia(1), proxOque: "ligar para Marta Corrêa, a esposa", proxResponsavel: DIEGO, autor: DIEGO, em: em(-10, "10:05") }],
    }),
    fp(4, 6, "A_VENCER"),
  ],
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

const comuns = (escritorio: unknown = ESCRITORIO) => ({
  "/v1/escritorio": { corpo: escritorio },
  "/v1/escritorio/pessoas": { corpo: { pessoas: [DIEGO, MARINA, FELIPE] } },
  "GET /v1/escritorio/financeiro/receber": { corpo: LISTA },
  [`GET /v1/escritorio/financeiro/contratos/${ct(22)}`]: { corpo: FICHA },
  // A folha "Carnê" (FI-23) da ficha: os detalhes ficam em portal-carne.spec.ts.
  [`GET /v1/escritorio/contratos/${ct(22)}/carnes`]: { corpo: {
    contrato: { id: ct(22), numero: "C-2026-022", objeto: "Ação revisional", situacao: "ATIVO" }, cliente: { id: "c22", nome: "Hélio Batista Corrêa" },
    parcelas: [], recebimento: { pixTipo: null, pixChave: null, recebedor: null, cidade: null, instrucoes: null }, dono: true, socioDono: null, carnes: [],
  } },
});

test.describe("Financeiro do Portal, A receber (FI-01 a FI-04, FI-14, FI-17)", () => {
  test("Lista: números do alto, grupos por vencimento, motivo e próxima ação; filtros vão ao servidor", async ({ page }) => {
    const pedidos = await simular(page, comuns());
    await page.goto(`${P}/financeiro/a-receber`);
    await expect(page.getByRole("heading", { level: 1, name: "A receber" })).toBeVisible();
    const nums = page.getByRole("group", { name: "Mostrar" });
    await expect(nums.getByRole("button", { name: /Em aberto/ })).toHaveAttribute("aria-pressed", "true");
    await expect(nums).toContainText("R$ 2.050,00");
    const tabela = page.getByRole("table", { name: /Parcelas em aberto/ });
    await expect(tabela.getByRole("rowgroup").filter({ hasText: "Vencidas · 2" })).toContainText("R$ 2.050,00");
    const hel = tabela.getByRole("row", { name: /Hélio/ });
    await expect(hel).toContainText("Vencida há 24 dias");
    await expect(hel).toContainText("Motivo: Não respondeu aos lembretes do WhatsApp");
    await expect(hel).toContainText(`Próxima ação, amanhã, ${br(1).slice(0, 5)}: ligar para Marta Corrêa, a esposa · Diego`);
    await expect(hel.getByRole("link", { name: "Hélio Batista Corrêa" })).toHaveAttribute("href", `/financeiro/a-receber/contratos/${ct(22)}`);
    await expect(tabela.getByRole("row", { name: /Benedito/ })).toContainText("Amanhã");
    await expect(tabela.getByRole("row", { name: /Irene/ })).toContainText("Boleto");
    await semViolacoes(page);

    await nums.getByRole("button", { name: /Vencidas/ }).click();
    await expect.poll(() => pedidos.some((p) => p.busca === "?mostrar=VENCIDAS")).toBe(true);
    await page.getByLabel("Forma de pagamento").selectOption("PIX");
    await expect.poll(() => pedidos.some((p) => p.busca === "?mostrar=VENCIDAS&forma=PIX")).toBe(true);
    await page.getByLabel("Responsável").selectOption(DIEGO.id);
    await expect.poll(() => pedidos.some((p) => p.busca === `?mostrar=VENCIDAS&responsavel=${DIEGO.id}&forma=PIX`)).toBe(true);
    await page.getByRole("button", { name: "Por cliente" }).click();
    await expect(page.getByRole("rowgroup").filter({ hasText: "Daniela Rocha Mendes · C-2026-011" })).toBeVisible();
  });

  test("Primeiro uso: as parcelas saem dos contratos", async ({ page }) => {
    await simular(page, { ...comuns(), "GET /v1/escritorio/financeiro/receber": { corpo: { ...LISTA, algum: false, parcelas: [] } } });
    await page.goto(`${P}/financeiro/a-receber`);
    await expect(page.getByRole("heading", { name: "Nenhuma parcela a receber ainda" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ir para Contratos" })).toHaveAttribute("href", "/contratos/contratos");
    await semViolacoes(page);
  });

  test("Registrar recebimento da linha: valor acima do que falta e data futura voltam presos ao campo", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(),
      [`POST /v1/escritorio/financeiro/parcelas/${pc(22)}/recebimentos`]: [
        { status: 422, corpo: { erro: { codigo: "VALIDATION_ERROR", detalhes: { motivo: "VALOR_ACIMA_DO_SALDO", campos: ["valor"], falta: 85000 } } } },
        { status: 201, corpo: { id: "p9", paga: true, falta: 0, recibo: { ano: 2026, numero: 187 } } },
      ],
    });
    await page.goto(`${P}/financeiro/a-receber`);
    await page.getByRole("button", { name: /Registrar recebimento de Hélio/ }).click();
    const j = page.getByRole("dialog", { name: "Registrar recebimento" });
    await expect(j.getByLabel("Valor recebido")).toHaveValue("850,00");
    await expect(j.getByLabel("Valor recebido")).toBeFocused();
    await expect(j.getByLabel("Dia em que o dinheiro entrou")).toHaveValue(br(0));
    await expect(j.getByLabel("Forma de pagamento")).toHaveValue("PIX");
    await expect(j).toContainText("No caixa, ele entra no dia em que o dinheiro entrou.");
    await semViolacoes(page);

    await j.getByLabel("Dia em que o dinheiro entrou").fill(br(2));
    await j.getByRole("button", { name: "Registrar recebimento" }).click();
    await expect(j.getByText("Esta data é depois de hoje.")).toBeVisible();
    await expect(j.getByLabel("Dia em que o dinheiro entrou")).toBeFocused();
    expect(pedidos.some((p) => p.metodo === "POST")).toBe(false);

    await j.getByLabel("Dia em que o dinheiro entrou").fill(br(0));
    await j.getByRole("button", { name: "Registrar recebimento" }).click();
    await expect(j.getByText(/O valor passa do que falta nesta parcela \(R\$ 850,00\)/)).toBeVisible();
    await semViolacoes(page);
    await j.getByLabel("Multa e juros").fill("23,80");
    await j.getByRole("button", { name: "Registrar recebimento" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Recebimento registrado." })).toContainText("Recibo nº 2026-0187");
    const corpo = pedidos.filter((p) => p.metodo === "POST").at(-1)?.corpo as Record<string, unknown>;
    expect(corpo).toEqual({ valor: 85000, multaJuros: 2380, recebidoEm: dia(0), forma: "PIX", recibo: true });
  });

  test("Registrar recebimento do alto: escolhe a parcela primeiro", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(),
      [`POST /v1/escritorio/financeiro/parcelas/${pc(44)}/recebimentos`]: { status: 201, corpo: { id: "p8", paga: false, falta: 60000, recibo: null } },
    });
    await page.goto(`${P}/financeiro/a-receber`);
    await page.locator(".pt-cab").getByRole("button", { name: "Registrar recebimento" }).click();
    const j = page.getByRole("dialog", { name: "Registrar recebimento" });
    await j.getByRole("button", { name: "Registrar recebimento" }).click();
    await expect(j.getByText("Escolha a parcela que o dinheiro paga.")).toBeVisible();
    await j.getByLabel("Parcela").selectOption(pc(44));
    await expect(j.getByLabel("Valor recebido")).toHaveValue("1.100,00");
    await expect(j.getByLabel("Forma de pagamento")).toHaveValue("BOLETO");
    await j.getByLabel("Valor recebido").fill("500,00");
    await j.getByText("Gerar o recibo").click();
    await j.getByRole("button", { name: "Registrar recebimento" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Recebimento registrado." })).toContainText("Falta R$ 600,00");
    expect((pedidos.filter((p) => p.metodo === "POST").at(-1)?.corpo as Record<string, unknown>).recibo).toBe(false);
  });

  test("Parcelas do contrato: atraso, totais, recibos e cobrança; anotar pede a próxima ação", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(),
      [`POST /v1/escritorio/financeiro/parcelas/${pc(63)}/cobranca`]: { status: 201, corpo: { id: "e1" } },
    });
    await page.goto(`${P}/financeiro/a-receber/contratos/${ct(22)}`);
    await expect(page.getByRole("heading", { level: 1, name: "Hélio Batista Corrêa" })).toBeVisible();
    const dir = page.locator(".dir");
    await expect(dir).toContainText("Em atraso");
    await expect(dir).toContainText("R$ 850,00");
    await expect(dir).toContainText("24 dias");
    await expect(page.locator(".fi-quatro")).toContainText("R$ 3.400,00");
    const tabela = page.getByRole("table", { name: "Parcelas do contrato" });
    await expect(tabela.getByRole("row", { name: /Parcela 1 de 4/ })).toContainText("Recibo 0098");
    await expect(tabela.getByRole("row", { name: /Parcela 2 de 4/ })).toContainText("4 dias de atraso");
    await expect(page.getByRole("link", { name: "Ver o contrato" })).toHaveAttribute("href", `/contratos/contratos/${ct(22)}`);
    const cob = page.getByRole("region", { name: "Cobrança" });
    await expect(cob).toContainText("Não respondeu aos lembretes do WhatsApp");
    await expect(cob).toContainText("Diego Almeida ligou");
    await semViolacoes(page);

    await cob.getByRole("button", { name: "Anotar cobrança" }).click();
    const j = page.getByRole("dialog", { name: "Anotar cobrança" });
    await expect(j.getByLabel("Como foi (opcional)")).toBeFocused();
    await j.getByRole("button", { name: "Anotar cobrança" }).click();
    await expect(j.getByRole("alert").filter({ hasText: "Falta acertar 2 pontos" })).toBeVisible();
    await semViolacoes(page);
    await j.getByRole("button", { name: "Mensagem" }).click();
    await j.getByLabel("O que fazer").fill("Mandar o Pix de novo");
    await j.getByLabel("Quando").fill(br(2));
    await j.getByRole("button", { name: "Anotar cobrança" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Cobrança anotada." })).toContainText("Mandar o Pix de novo · Diego");
    const corpo = pedidos.filter((p) => p.metodo === "POST").at(-1)?.corpo as Record<string, unknown>;
    expect(corpo).toEqual({ tipo: "MENSAGEM", texto: null, motivo: null, proxData: dia(2), proxOque: "Mandar o Pix de novo", proxResponsavelId: DIEGO.id, forma: "PIX" });
  });

  test("Parcelas do contrato mostram o que o escritório adiantou no caso (F3.23, FI-07)", async ({ page }) => {
    const PERICIA = {
      id: "cp1", descricao: "Perícia contábil · honorários do perito judicial", fornecedor: null, categoria: "CUSTAS", valor: 90000, valorPago: 90000,
      vencimento: dia(-15), forma: "PIX", pagaEm: dia(-15), situacao: "PAGA", recorrente: null,
      adiantada: { cliente: { id: "c22", nome: "Hélio Batista Corrêa" }, caso: { id: "s1", nome: "Corrêa x Banco Sul" }, como: "PROXIMA_PARCELA", reembolsadoEm: null,
        parcela: { id: pc(64), descricao: "Parcela 4 de 4", vencimento: dia(6), valor: 85000, contrato: { id: ct(22), numero: "C-2026-022" } } },
    };
    const COPIAS = { ...PERICIA, id: "cp2", descricao: "Cópias do processo", valor: 5000, valorPago: 5000,
      adiantada: { ...PERICIA.adiantada, como: "A_PARTE", reembolsadoEm: dia(-2), parcela: null } };
    await simular(page, { ...comuns(), [`GET /v1/escritorio/financeiro/contratos/${ct(22)}`]: { corpo: { ...FICHA, adiantados: [PERICIA, COPIAS] } } });
    await page.goto(`${P}/financeiro/a-receber/contratos/${ct(22)}`);
    const sec = page.getByRole("region", { name: "Adiantado pelo escritório neste caso" });
    await expect(sec.getByRole("listitem").first()).toContainText(`Paga pelo escritório em ${dia(-15).slice(8, 10)}/${dia(-15).slice(5, 7)} · Corrêa x Banco Sul · categoria “Custas adiantadas”`);
    await expect(sec.getByRole("listitem").first()).toContainText(`Reembolso combinado: junto com a parcela 4 de 4, de ${dia(6).slice(8, 10)}/${dia(6).slice(5, 7)}`);
    await expect(sec.getByRole("listitem").first()).toContainText("A reembolsar");
    await expect(sec.getByRole("listitem").nth(1)).toContainText("Reembolsado em");
    await semViolacoes(page);
  });

  test("Sem a área Financeiro, A receber não abre", async ({ page }) => {
    await simular(page, comuns(SEM_AREA));
    await page.goto(`${P}/financeiro/a-receber`);
    await expect(page.getByRole("heading", { name: "Esta área não está liberada para você" })).toBeVisible();
  });
});

// O comprovante de cada recebimento (F3.22, FI-18): na janela de registrar e depois, na ficha.
test.describe("Financeiro do Portal, comprovante do recebimento (FI-18)", () => {
  const ANEXO = "f9000000-0000-4000-8000-000000000022";
  async function storage(page: Page) {
    const envios: string[] = [];
    await page.route("**/arquivos-falsos/**", async (rota) => {
      envios.push(`${rota.request().method()} ${new URL(rota.request().url()).pathname}`);
      await rota.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });
    return envios;
  }
  const anexoRotas = {
    "POST /v1/escritorio/anexos": { status: 201, corpo: { id: ANEXO, enderecoDeEnvio: `${P}/arquivos-falsos/x/${ANEXO}?token=uso-unico` } },
    [`POST /v1/escritorio/anexos/${ANEXO}/concluir`]: { corpo: { id: ANEXO, categoria: "COMPROVANTE", nome: "pix-helio.pdf" } },
  };

  test("Registrar com o comprovante: o recebimento vai primeiro e o arquivo depois, ligado a ele", async ({ page }) => {
    const envios = await storage(page);
    const pedidos = await simular(page, {
      ...comuns(), ...anexoRotas,
      [`POST /v1/escritorio/financeiro/parcelas/${pc(22)}/recebimentos`]: { status: 201, corpo: { id: "a9000000-0000-4000-8000-000000000001", paga: true, falta: 0, recibo: null } },
    });
    await page.goto(`${P}/financeiro/a-receber`);
    await page.getByRole("button", { name: /Registrar recebimento de Hélio/ }).click();
    const j = page.getByRole("dialog", { name: "Registrar recebimento" });
    await j.getByLabel(/Comprovante/).setInputFiles({ name: "pix-helio.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(900, 1) });
    await expect(j.getByRole("group", { name: /Comprovante/ })).toContainText("pix-helio.pdf");
    await semViolacoes(page);
    await j.getByRole("button", { name: "Registrar recebimento" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Recebimento registrado." })).toContainText("Comprovante anexado.");
    expect(pedidos.filter((p) => p.metodo === "POST").map((p) => p.caminho)).toEqual([
      `/v1/escritorio/financeiro/parcelas/${pc(22)}/recebimentos`, "/v1/escritorio/anexos", `/v1/escritorio/anexos/${ANEXO}/concluir`,
    ]);
    expect(pedidos.find((p) => p.caminho === "/v1/escritorio/anexos")?.corpo).toMatchObject({ dono: "RECEBIMENTO", donoId: "a9000000-0000-4000-8000-000000000001", categoria: "COMPROVANTE" });
    expect(envios).toHaveLength(1);
  });

  test("Arquivo fora do aceito não vai, e o erro fica preso ao campo", async ({ page }) => {
    const pedidos = await simular(page, comuns());
    await page.goto(`${P}/financeiro/a-receber`);
    await page.getByRole("button", { name: /Registrar recebimento de Hélio/ }).click();
    const j = page.getByRole("dialog", { name: "Registrar recebimento" });
    await j.getByLabel(/Comprovante/).setInputFiles({ name: "planilha.xlsx", mimeType: "application/vnd.ms-excel", buffer: Buffer.alloc(10, 1) });
    await expect(j.getByText("Tipo não aceito. Envie PDF, JPG ou PNG.")).toBeVisible();
    await j.getByRole("button", { name: "Registrar recebimento" }).click();
    expect(pedidos.some((p) => p.metodo === "POST")).toBe(false);
  });

  test("Ficha do contrato: o comprovante abre, e o recebimento sem ele ganha Anexar comprovante", async ({ page }) => {
    const envios = await storage(page);
    const pedidos = await simular(page, {
      ...comuns(), ...anexoRotas,
      "POST /v1/escritorio/financeiro/anexos/buscar": { corpo: { anexos: [
        { id: "f9000000-0000-4000-8000-000000000001", categoria: "COMPROVANTE", nome: "pix-agosto.pdf", tipo: "application/pdf", tamanho: 1000, donoId: "p1", enviadoPor: MARINA, enviadoEm: em(-85, "15:21") },
      ] } },
      "POST /v1/escritorio/anexos/f9000000-0000-4000-8000-000000000001/abrir": { corpo: { url: `${P}/arquivos-falsos/ler?download=pix.pdf`, validadeSegundos: 60 } },
    });
    await page.goto(`${P}/financeiro/a-receber/contratos/${ct(22)}`);
    const tabela = page.getByRole("table", { name: "Parcelas do contrato" });
    const p1 = tabela.getByRole("row", { name: /Parcela 1 de 4/ });
    await expect(p1.getByRole("button", { name: /Comprovante.*pix-agosto\.pdf/ })).toBeVisible();
    const p2 = tabela.getByRole("row", { name: /Parcela 2 de 4/ });
    await semViolacoes(page);
    const aba = page.waitForEvent("popup");
    await p1.getByRole("button", { name: /Comprovante/ }).click();
    await aba;
    expect(pedidos.some((p) => p.caminho.endsWith("/abrir"))).toBe(true);
    await p2.getByRole("button", { name: /Anexar comprovante/ }).click();
    const j = page.getByRole("dialog", { name: "Anexar comprovante" });
    await j.getByRole("button", { name: "Anexar" }).click();
    await expect(j.getByText("Escolha o arquivo do comprovante.")).toBeVisible();
    await j.getByLabel(/Comprovante/).setInputFiles({ name: "pix-setembro.png", mimeType: "image/png", buffer: Buffer.alloc(500, 1) });
    await semViolacoes(page);
    await j.getByRole("button", { name: "Anexar" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Comprovante anexado." })).toBeVisible();
    expect(pedidos.find((p) => p.caminho === "/v1/escritorio/anexos")?.corpo).toMatchObject({ dono: "RECEBIMENTO", donoId: "p2", tipo: "image/png" });
    expect(envios.filter((e) => e.startsWith("PUT"))).toHaveLength(1);
  });
});
