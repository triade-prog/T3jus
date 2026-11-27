// Financeiro do Portal, Repasses (telas aprovadas em docs/design/aprovadas/portal-financeiro,
// estados repasses, registrar-rpv, repasse e prestacao): os números do alto, um bloco por valor
// de terceiros com a situação de cada parte, a janela de registrar com a divisão proposta pelo
// contrato, feito e dispensar com motivo, a prestação de contas e a ficha do repasse. A API é
// simulada; aqui se testa a tela, a acessibilidade e o que ela manda.
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
const br = (n: number) => dia(n).split("-").reverse().join("/");
const ddmm = (n: number) => br(n).slice(0, 5);

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

const id = (n: number) => `f5000000-0000-4000-8000-0000000001${String(n).padStart(2, "0")}`;
const CASO = { id: "ca000000-0000-4000-8000-000000000001", nome: "Revisão de aposentadoria", parteContraria: "INSS", area: "PREVIDENCIARIO" };
const BEN = { id: "be000000-0000-4000-8000-000000000001", nome: "Benedito Souza Lima", telefone: "+5511974561180" };
const MARINA = { id: "aa000000-0000-4000-8000-000000000001", nome: "Marina Ribeiro" };
const BIANCA = { id: "aa000000-0000-4000-8000-000000000002", nome: "Bianca Torres" };
const DIEGO = { id: "aa000000-0000-4000-8000-000000000003", nome: "Diego Almeida" };
const PODEM = [
  { ...BIANCA, dono: false, areas: ["CONTRATOS", "FINANCEIRO"] },
  { ...DIEGO, dono: false, areas: ["COMERCIAL", "FINANCEIRO"] },
  { ...MARINA, dono: true, areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"] },
];
const parte = (n: number, para: string, nome: string, valor: number, extra = {}) => ({
  id: id(n), para, nome, regra: null, valor, prazo: dia(1), escritorio: para === "HONORARIOS" || para === "REEMBOLSO",
  situacao: "PENDENTE", feitoEm: null, feitoPor: null, dispensa: null, contaId: null, ...extra,
});
const LEV = {
  id: id(1), tipo: "RPV", valor: 2156656, entrouEm: dia(-2), criadoEm: `${dia(-2)}T19:12:00Z`, autor: MARINA, responsavel: MARINA, prestacaoEm: null, prestacaoPor: null,
  caso: CASO, cliente: BEN, feitos: 0, total: 3,
  destinacoes: [
    parte(10, "CLIENTE", BEN.nome, 1424259),
    parte(11, "HONORARIOS", "Honorários de êxito", 646997, { regra: "30% · Atrasados que o cliente receber · contrato C-2026-014" }),
    parte(12, "PERITO", "Dr. Rui Tavares", 85400, { prazo: dia(-1) }),
  ],
};
const LISTA = {
  hoje: dia(0), prazoDias: 3, algum: true, eu: MARINA.id, podeEditar: true, podemCuidar: PODEM,
  totais: { aRepassar: 1509659, repassesPendentes: 2, honorarios: 646997, casos: 1, atrasados: 85400, repassesAtrasados: 1, semMotivo: 1 },
  repassadoMes: { valor: 2512800, clientes: 1 },
  repassados: [{ levantamentoId: id(2), cliente: "Irene Castro", tipo: "RPV", valor: 2512800, feitoEm: dia(-3) }],
  levantamentos: [LEV],
  casos: [{ id: CASO.id, nome: CASO.nome, parteContraria: "INSS", clientes: [{ id: BEN.id, nome: BEN.nome }] }],
  aCaminho: { total: 0, n: 0, naPrevisao: 0, passou: { valor: 0, n: 0 }, itens: [] as unknown[] },
};
// RPV e precatório a caminho (F3.48): um que passou da data estimada e um para daqui a dois meses.
const mesMais = (n: number) => { const [a, m] = dia(0).split("-").map(Number); const d = new Date(Date.UTC(a!, m! - 1 + n, 1)); return d.toISOString().slice(0, 10); };
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const mesAno = (m: string) => `${MESES[Number(m.slice(5, 7)) - 1]} de ${m.slice(0, 4)}`;
const IRENE = { id: "be000000-0000-4000-8000-000000000002", nome: "Irene Castro" };
const req = (n: number, extra: Record<string, unknown>) => ({
  id: `ad000000-0000-4000-8000-00000000000${n}`, tipo: "RPV", tribunal: "TRF3", devedor: "INSS", numero: null, valorRequisitado: 630000,
  parteEscritorio: 189000, parteRegra: "30% de êxito", expedidoEm: dia(-120), estimadaMes: mesMais(-1), situacao: "A_CAMINHO", passou: true,
  criadoEm: `${dia(-100)}T12:00:00Z`, caso: { id: CASO.id, nome: CASO.nome }, cliente: IRENE, contratoId: null, levantamentoId: null, ...extra,
});
const PASSOU = req(1, {});
const EDUARDO = req(2, { valorRequisitado: 1620000, parteEscritorio: 486000, estimadaMes: mesMais(2), passou: false, cliente: BEN, tribunal: "TJSP", devedor: "Prefeitura" });
const COM_CAMINHO = { ...LISTA, aCaminho: { total: 675000, n: 2, naPrevisao: 486000, passou: { valor: 189000, n: 1 }, itens: [PASSOU, EDUARDO] } };
const VAZIA = { ...LISTA, algum: false, totais: { aRepassar: 0, repassesPendentes: 0, honorarios: 0, casos: 0, atrasados: 0, repassesAtrasados: 0, semMotivo: 0 }, repassadoMes: { valor: 0, clientes: 0 }, repassados: [], levantamentos: [] };
const ACERTO = {
  casoId: CASO.id, entrou: 2156656, destinadoPago: 0, faltaPagar: 2156656,
  parcelas: { total: 6, pagas: 6, ultima: dia(-40), falta: 0 }, prestacoesPendentes: 1,
  pendencias: [
    { tipo: "REPASSE", para: "CLIENTE", nome: BEN.nome, valor: 1424259, prazo: dia(1), levantamentoId: id(1) },
    { tipo: "REPASSE", para: "PERITO", nome: "Dr. Rui Tavares", valor: 85400, prazo: dia(-1), levantamentoId: id(1) },
  ],
  falta: 1509659, fechado: null,
};
const FICHA = {
  ...LEV, hoje: dia(0), escritorio: "Ribeiro & Matos", acerto: ACERTO, eu: MARINA.id, podeEditar: true, prazoDias: 3, doContrato: MARINA, podemCuidar: PODEM,
  historico: [{ acao: "financeiro.levantamento", em: `${dia(-2)}T19:12:00Z`, por: MARINA, dados: { tipo: "RPV", valor: 2156656, seguiuProposta: true } }],
};
const PROPOSTA = {
  contrato: { id: "c0000000-0000-4000-8000-000000000014", numero: "C-2026-014" },
  linhas: [
    { para: "HONORARIOS", nome: "Honorários de êxito", regra: "30% · Atrasados que o cliente receber · contrato C-2026-014", valor: 381000 },
    { para: "REEMBOLSO", nome: "Reembolso: Custas recursais", regra: "Adiantado pelo escritório em 10/11/2026", valor: 48500, contaId: "c3000000-0000-4000-8000-000000000101" },
  ],
  cliente: 840500, falta: 0,
};

const comuns = (escritorio: unknown = ESCRITORIO, lista: unknown = LISTA) => ({
  "/v1/escritorio": { corpo: escritorio },
  "GET /v1/escritorio/financeiro/repasses": { corpo: lista },
  [`GET /v1/escritorio/financeiro/repasses/${id(1)}`]: { corpo: FICHA },
});

// O relógio do navegador fica em AGORA, o mesmo instante de onde os dados contam (F3.164).
test.beforeEach(async ({ page }) => { await fixarRelogio(page); });

test.describe("Financeiro do Portal, Repasses (FI-05, FI-06, FI-12)", () => {
  test("Lista: números do alto, um bloco de terceiros por valor, cada parte com prazo, e o repassado no mês", async ({ page }) => {
    await simular(page, comuns());
    await page.goto(`${P}/financeiro/repasses`);
    await expect(page.getByRole("heading", { level: 1, name: "Repasses" })).toBeVisible();
    const nums = page.getByRole("group", { name: "Números dos repasses" });
    await expect(nums).toContainText("R$ 15.096,59");
    await expect(nums).toContainText("2 repasses");
    await expect(nums).toContainText("R$ 6.469,97");
    const bloco = page.getByRole("region", { name: BEN.nome });
    await expect(bloco).toContainText("De terceiros · RPV");
    await expect(bloco).toContainText(`Revisão de aposentadoria × INSS · entrou em ${ddmm(-2)}`);
    await expect(bloco).toContainText("0 de 3 feitos");
    await expect(bloco).toContainText(`Até ${ddmm(1)}`);
    await expect(bloco).toContainText(`Atrasado · era ${ddmm(-1)}`);
    await expect(bloco).toContainText("Cuida: Marina Ribeiro (você)");
    await expect(bloco).toContainText("Sem motivo anotado.");
    await expect(nums).toContainText("Atrasados");
    await expect(nums).toContainText("1 repasse · 1 sem motivo");
    await expect(bloco).toContainText("Prestação de contas: ainda não enviada");
    await expect(bloco).toContainText("O prazo do escritório é de 3 dias úteis.");
    await expect(page.getByRole("region", { name: /Repassado em/ })).toContainText("Irene Castro");
    await expect(page.getByRole("region", { name: "Nada fica parado sem dono." })).toBeVisible();
    await semViolacoes(page);
  });

  test("Primeiro uso: registrar o primeiro alvará ou RPV", async ({ page }) => {
    await simular(page, comuns(ESCRITORIO, VAZIA));
    await page.goto(`${P}/financeiro/repasses`);
    await expect(page.getByRole("heading", { name: "Nenhum alvará ou RPV registrado ainda" })).toBeVisible();
    await semViolacoes(page);
  });

  test("Registrar: erros presos ao campo; a divisão vem do contrato, aceita perito à mão, e o cliente fica com o resto", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(),
      "POST /v1/escritorio/financeiro/repasses/proposta": { corpo: PROPOSTA },
      "POST /v1/escritorio/financeiro/repasses": { status: 201, corpo: { id: id(3) } },
    });
    await page.goto(`${P}/financeiro/repasses`);
    await page.getByRole("button", { name: "Registrar alvará ou RPV" }).first().click();
    const j = page.getByRole("dialog", { name: "Registrar alvará ou RPV" });
    await expect(j.getByLabel("O que entrou")).toBeFocused();
    await j.getByLabel("Dia em que entrou").fill(br(2));
    await j.getByRole("button", { name: "Registrar" }).click();
    await expect(j.getByRole("alert").filter({ hasText: "Falta acertar 3 pontos" })).toBeVisible();
    await expect(j.getByText("Esta data é depois de hoje.")).toBeVisible();
    await semViolacoes(page);
    await j.getByLabel("O que entrou").selectOption("ALVARA");
    await j.getByLabel("Dia em que entrou").fill(br(0));
    await j.getByLabel("Valor levantado").fill("12.700,00");
    await expect(j.getByRole("table", { name: "Para quem vai cada parte" })).toContainText("Honorários de êxito");
    await expect(j.getByRole("table", { name: "Para quem vai cada parte" })).toContainText("R$ 8.405,00");
    await expect(j.getByRole("status")).toContainText("Falta destinar: R$ 0,00");
    await j.getByRole("button", { name: "Acrescentar perito, parceiro ou outro" }).click();
    await j.getByLabel("Nome de quem recebe").fill("Dr. Rui Tavares");
    await j.getByLabel("Valor de Dr. Rui Tavares").fill("405,00");
    await expect(j.getByRole("table", { name: "Para quem vai cada parte" })).toContainText("R$ 8.000,00");
    await semViolacoes(page);
    await j.getByRole("button", { name: "Registrar" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Alvará registrado." })).toContainText("R$ 8.000,00 para Benedito Souza Lima");
    expect(pedidos.find((p) => p.metodo === "POST" && p.caminho === "/v1/escritorio/financeiro/repasses")?.corpo).toEqual({
      tipo: "ALVARA", casoId: CASO.id, clienteId: BEN.id, valor: 1270000, entrouEm: dia(0),
      // F3.174, nota 12: sem êxito baixado, o corpo leva exitoBaixadoVisto: [].
      exitoBaixadoVisto: [],
      divisao: [
        { para: "CLIENTE", valor: 800000 },
        { para: "HONORARIOS", nome: "Honorários de êxito", regra: PROPOSTA.linhas[0]!.regra, valor: 381000, contaId: null },
        { para: "REEMBOLSO", nome: "Reembolso: Custas recursais", regra: PROPOSTA.linhas[1]!.regra, valor: 48500, contaId: PROPOSTA.linhas[1]!.contaId },
        { para: "PERITO", nome: "Dr. Rui Tavares", regra: null, valor: 40500, contaId: null },
      ],
    });
  });

  test("F3.94: a parte \"honorários\" diz qual parcela do êxito baixa, e o aviso diz que baixou", async ({ page }) => {
    await simular(page, {
      ...comuns(),
      "POST /v1/escritorio/financeiro/repasses/proposta": { corpo: { ...PROPOSTA, exito: [{ id: id(9), descricao: "Êxito · Lima x INSS", vencimento: dia(10), falta: 381000 }] } },
      "POST /v1/escritorio/financeiro/repasses": { status: 201, corpo: { id: id(3), exitoBaixado: [{ parcelaId: id(9), descricao: "Êxito · Lima x INSS", valor: 381000, paga: true }] } },
    });
    await page.goto(`${P}/financeiro/repasses`);
    await page.getByRole("button", { name: "Registrar alvará ou RPV" }).first().click();
    const j = page.getByRole("dialog", { name: "Registrar alvará ou RPV" });
    await j.getByLabel("O que entrou").selectOption("ALVARA");
    await j.getByLabel("Valor levantado").fill("12.700,00");
    const tab = j.getByRole("table", { name: "Para quem vai cada parte" });
    await expect(tab.getByRole("row", { name: /Honorários de êxito/ })).toContainText("Dá baixa na parcela “Êxito · Lima x INSS” (falta R$ 3.810,00)");
    await expect(tab.getByRole("row", { name: /Reembolso/ })).not.toContainText("Dá baixa");
    await semViolacoes(page);
    await j.getByRole("button", { name: "Registrar" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Alvará registrado." })).toContainText("A parcela “Êxito · Lima x INSS” foi baixada pela divisão.");
  });

  test("Feito e dispensar: o dia do repasse; dispensar pede o motivo", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(),
      [`POST /v1/escritorio/financeiro/destinacoes/${id(10)}/feito`]: { corpo: { ...LEV.destinacoes[0], situacao: "FEITO", feitoEm: dia(0) } },
      [`POST /v1/escritorio/financeiro/destinacoes/${id(12)}/dispensar`]: { corpo: { ...LEV.destinacoes[2], situacao: "DISPENSADO" } },
    });
    await page.goto(`${P}/financeiro/repasses`);
    await page.getByRole("button", { name: `Feito: registrar o repasse de ${BEN.nome}` }).click();
    const f = page.getByRole("dialog", { name: "Registrar repasse" });
    await expect(f.getByLabel("Dia do repasse")).toBeFocused();
    await f.getByLabel("Dia do repasse").fill(br(-5));
    await f.getByRole("button", { name: "Registrar" }).click();
    await expect(f.getByText(`O dinheiro entrou em ${br(-2)}.`)).toBeVisible();
    await semViolacoes(page);
    await f.getByLabel("Dia do repasse").fill(br(0));
    await f.getByRole("button", { name: "Registrar" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Repasse registrado." })).toContainText("R$ 14.242,59 para Benedito Souza Lima");
    expect(pedidos.find((p) => p.caminho.endsWith("/feito"))?.corpo).toEqual({ feitoEm: dia(0) });

    await expect(page.getByRole("button", { name: `Dispensar o repasse de ${BEN.nome}` })).toHaveCount(0);
    await page.getByRole("button", { name: "Dispensar o repasse de Dr. Rui Tavares" }).click();
    const d = page.getByRole("dialog", { name: "Dispensar este repasse" });
    await d.getByRole("button", { name: "Dispensar" }).click();
    await expect(d.getByText("Escreva o motivo, com pelo menos 5 letras.")).toBeVisible();
    await d.getByLabel("Por que não vai acontecer").fill("O perito recebeu direto do tribunal");
    await d.getByRole("button", { name: "Dispensar" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Repasse dispensado." })).toBeVisible();
    expect(pedidos.find((p) => p.caminho.endsWith("/dispensar"))?.corpo).toEqual({ motivo: "O perito recebeu direto do tribunal" });
  });

  test("Prestação de contas: a conta sai do registro, com o WhatsApp do cliente, e fica marcada como enviada", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(),
      [`POST /v1/escritorio/financeiro/repasses/${id(1)}/prestacao`]: { corpo: { id: id(1), prestacaoEm: `${dia(0)}T13:00:00Z` } },
    });
    await page.goto(`${P}/financeiro/repasses`);
    await page.getByRole("button", { name: `Prestação de contas a ${BEN.nome}` }).click();
    const j = page.getByRole("dialog", { name: "Prestação de contas a Benedito" });
    await expect(j).toContainText("Olá, Benedito. Aqui é do escritório Ribeiro & Matos. O seu RPV foi pago");
    await expect(j.getByRole("table", { name: "A conta da prestação de contas" })).toContainText("Fica para você");
    await expect(j.getByRole("table", { name: "A conta da prestação de contas" })).toContainText("R$ 14.242,59");
    await expect(j).toContainText("(11) 97456-1180");
    await expect(j.getByRole("link", { name: "Abrir no WhatsApp" })).toHaveAttribute("href", /^https:\/\/wa\.me\/5511974561180\?text=Ol%C3%A1%2C%20Benedito/);
    await semViolacoes(page);
    await j.getByRole("button", { name: "Marcar como enviada" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Prestação de contas marcada como enviada." })).toBeVisible();
    expect(pedidos.some((p) => p.caminho.endsWith("/prestacao") && p.metodo === "POST")).toBe(true);
  });

  test("F3.44: com o WhatsApp ligado, a prestação revisada entra na fila do número do escritório e o repasse mostra quando foi lida", async ({ page }) => {
    const ligada = { ...LISTA, levantamentos: [{ ...LEV, whatsappLigado: true }] };
    const naFila = { id: "m1", envio: "NA_FILA", em: `${dia(0)}T13:15:00Z`, envioEm: null, motivo: null, para: BEN.nome, telefone: "+5511974561180" };
    const depois = { ...LISTA, levantamentos: [{ ...LEV, whatsappLigado: true, prestacaoEm: `${dia(0)}T13:15:00Z`, prestacaoPor: MARINA,
      prestacao: { ...naFila, envio: "LIDA", envioEm: `${dia(0)}T14:02:00Z` } }] };
    const pedidos = await simular(page, {
      ...comuns(ESCRITORIO, ligada),
      "GET /v1/escritorio/financeiro/repasses": [{ corpo: ligada }, { corpo: depois }],
      [`POST /v1/escritorio/financeiro/repasses/${id(1)}/prestacao/envio`]: { status: 201, corpo: { ...LEV, prestacao: naFila } },
    });
    await page.goto(`${P}/financeiro/repasses`);
    await page.getByRole("button", { name: `Prestação de contas a ${BEN.nome}` }).click();
    const j = page.getByRole("dialog", { name: "Prestação de contas a Benedito" });
    await expect(j).toContainText("Sai pelo WhatsApp do escritório.");
    await expect(j.getByRole("link", { name: "Abrir no WhatsApp" })).toHaveCount(0);
    await semViolacoes(page);
    await j.getByRole("button", { name: "Mandar pelo WhatsApp" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Prestação de contas na fila do WhatsApp." })).toBeVisible();
    expect(pedidos.some((p) => p.caminho.endsWith("/prestacao/envio") && p.metodo === "POST")).toBe(true);
    await expect(page.getByText("Prestação de contas: lida pelo cliente em")).toBeVisible();
  });

  test("Ficha do repasse: o que ainda está com o escritório, cada parte, o fechamento e o histórico", async ({ page }) => {
    await simular(page, comuns());
    await page.goto(`${P}/financeiro/repasses/${id(1)}`);
    await expect(page.getByRole("heading", { level: 1, name: BEN.nome })).toBeVisible();
    await expect(page.getByText("Ainda com o escritório")).toBeVisible();
    const partes = page.getByRole("table", { name: "Partes do valor levantado" });
    await expect(partes.getByRole("row", { name: /Honorários de êxito/ })).toContainText("Escritório · 30%");
    await expect(partes.getByRole("row", { name: /Dr. Rui Tavares/ })).toContainText(`Atrasado · era ${ddmm(-1)}`);
    await expect(page.getByRole("region", { name: "Quem cuida deste repasse" })).toContainText("Marina Ribeiro (você)");
    await expect(page.getByRole("region", { name: "Quem cuida deste repasse" })).toContainText("É a responsável pelo contrato de Benedito.");
    const fecha = page.getByRole("region", { name: "Fechamento do caso" });
    await expect(fecha).toContainText("R$ 21.566,56");
    await expect(fecha).toContainText("Perito: falta pagar R$ 854,00");
    await expect(page.getByRole("region", { name: "Histórico" })).toContainText("Marina Ribeiro registrou RPV de R$ 21.566,56");
    await expect(page.getByRole("region", { name: "Histórico" })).toContainText("divisão do contrato aceita sem mudança");
    await semViolacoes(page);
  });

  test("Encerrar o caso com pendência (F3.45): a janela diz o que falta e leva a registrar o repasse", async ({ page }) => {
    await simular(page, comuns());
    await page.goto(`${P}/financeiro/repasses/${id(1)}`);
    const fecha = page.getByRole("region", { name: "Fechamento do caso" });
    await expect(fecha).toContainText("Parcelas do contrato todas recebidas");
    await expect(fecha).toContainText(`6 de 6, a última em ${ddmm(-40)}`);
    await fecha.getByRole("button", { name: "Encerrar o caso no financeiro" }).click();
    const j = page.getByRole("alertdialog", { name: "Ainda não dá para encerrar" });
    await expect(j.getByRole("button", { name: "Voltar ao caso" })).toBeFocused();
    await expect(j).toContainText("Ainda há 2 repasses pendentes neste caso.");
    await expect(j).toContainText("Faltam R$ 15.096,59.");
    await expect(j.getByRole("listitem").nth(1)).toContainText("Dr. Rui Tavares: R$ 854,00");
    await expect(j.getByRole("listitem").nth(1)).toContainText(`perito · combinado para até ${ddmm(-1)}`);
    await semViolacoes(page);
    await j.getByRole("button", { name: "Registrar repasse a Benedito" }).click();
    await expect(page.getByRole("dialog", { name: "Registrar repasse" })).toBeVisible();
  });

  test("Encerrar o caso sem pendência: confirma, vai ao servidor e mostra quem encerrou", async ({ page }) => {
    const pronto = { ...ACERTO, pendencias: [], falta: 0, faltaPagar: 0, destinadoPago: 2156656 };
    const fechado = { ...pronto, fechado: { em: `${dia(0)}T13:00:00Z`, por: MARINA } };
    const pedidos = await simular(page, {
      ...comuns(),
      [`GET /v1/escritorio/financeiro/repasses/${id(1)}`]: [{ corpo: { ...FICHA, acerto: pronto } }, { corpo: { ...FICHA, acerto: fechado } }],
      [`POST /v1/escritorio/financeiro/casos/${CASO.id}/encerrar`]: { corpo: fechado },
    });
    await page.goto(`${P}/financeiro/repasses/${id(1)}`);
    await page.getByRole("button", { name: "Encerrar o caso no financeiro" }).click();
    const j = page.getByRole("dialog", { name: "Encerrar o caso no financeiro" });
    await expect(j).toContainText("Tudo foi recebido e repassado.");
    await j.getByRole("button", { name: "Encerrar o caso" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Caso encerrado no financeiro." })).toBeVisible();
    expect(pedidos.some((p) => p.metodo === "POST" && p.caminho === `/v1/escritorio/financeiro/casos/${CASO.id}/encerrar`)).toBe(true);
    await expect(page.getByRole("region", { name: "Fechamento do caso" })).toContainText(`Caso encerrado no financeiro em ${ddmm(0)}, por Marina Ribeiro.`);
  });

  test("EX-17: com tudo pago, o âmbar encerra o caso e o contrato ligado de uma vez", async ({ page }) => {
    const CT = "c7000000-0000-4000-8000-000000000047";
    const ligado = { id: CT, numero: "C-2025-047", objeto: "Pensão por morte", versao: 6, cliente: { id: BEN.id, nome: BEN.nome } };
    const pronto = { ...ACERTO, pendencias: [], falta: 0, faltaPagar: 0, destinadoPago: 2156656, contratosLigados: [ligado], podeEncerrarContratos: true,
      motivoContratos: `Caso ${CASO.nome} encerrado no financeiro em ${ddmm(0)}/2026.` };
    const feitas = FICHA.destinacoes.map((d: Record<string, unknown>) => ({ ...d, situacao: "FEITO", feitoEm: dia(-1) }));
    const fechado = { ...pronto, fechado: { em: `${dia(0)}T13:00:00Z`, por: MARINA }, contratosEncerrados: [{ id: CT, numero: "C-2025-047" }] };
    const pedidos = await simular(page, {
      ...comuns(),
      [`GET /v1/escritorio/financeiro/repasses/${id(1)}`]: [{ corpo: { ...FICHA, destinacoes: feitas, acerto: pronto } }, { corpo: { ...FICHA, destinacoes: feitas, acerto: fechado } }],
      [`POST /v1/escritorio/financeiro/casos/${CASO.id}/encerrar`]: [
        { status: 409, corpo: { erro: { codigo: "VERSION_CONFLICT", mensagem: "Alguém mudou o contrato." } } },
        { corpo: fechado },
      ],
    });
    await page.goto(`${P}/financeiro/repasses/${id(1)}`);
    await expect(page.getByRole("region", { name: "Fechamento do caso" }).getByRole("button", { name: "Encerrar o caso no financeiro" })).toHaveCount(0);
    await page.getByRole("button", { name: "Encerrar o caso no financeiro" }).click();
    const j = page.getByRole("dialog", { name: "Encerrar o caso no financeiro" });
    await expect(j.getByRole("checkbox", { name: /Encerrar também este contrato/ })).toBeChecked();
    await expect(j).toContainText("C-2025-047");
    await expect(j).toContainText(`Motivo que fica no contrato: “Caso ${CASO.nome} encerrado`);
    await semViolacoes(page);
    await j.getByRole("button", { name: "Encerrar o caso e o contrato" }).click();
    await expect(j.getByText("Nada foi encerrado.")).toBeVisible();
    await expect(j).toContainText("O contrato C-2025-047 mudou agora há pouco.");
    await j.getByRole("button", { name: "Encerrar o caso e o contrato" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Caso e contrato encerrados." })).toBeVisible();
    const corpos = pedidos.filter((p) => p.metodo === "POST" && p.caminho.endsWith("/encerrar")).map((p) => p.corpo);
    expect(corpos.at(-1)).toEqual({ contratos: [{ id: CT, versao: 6 }] });
    await expect(page.getByRole("link", { name: /Ver a ficha de/ })).toBeVisible();
  });

  test("F3.132, decisão 10: quem não encerra contratos vê a seção sem caixa, com quem encerra, e encerra só o caso", async ({ page }) => {
    const ligado = { id: "c7000000-0000-4000-8000-000000000047", numero: "C-2025-047", objeto: "Pensão por morte", versao: 6, cliente: { id: BEN.id, nome: BEN.nome } };
    const ja = { id: "c7000000-0000-4000-8000-000000000048", numero: "C-2025-048", cliente: { id: BEN.id, nome: BEN.nome }, encerradoEm: `${dia(-6)}T12:30:00Z`, encerradoPor: { id: "f", nome: "Felipe Matos" } };
    const pronto = { ...ACERTO, pendencias: [], falta: 0, faltaPagar: 0, contratosLigados: [ligado], contratosJaEncerrados: [ja], podeEncerrarContratos: false,
      quemContratos: ["Bianca Torres", "Felipe Matos", "Marina Ribeiro"], motivoContratos: "Caso encerrado." };
    const pedidos = await simular(page, {
      ...comuns(),
      [`GET /v1/escritorio/financeiro/repasses/${id(1)}`]: { corpo: { ...FICHA, acerto: pronto } },
      [`POST /v1/escritorio/financeiro/casos/${CASO.id}/encerrar`]: { corpo: { ...pronto, fechado: { em: `${dia(0)}T13:00:00Z`, por: DIEGO }, contratosEncerrados: [] } },
    });
    await page.goto(`${P}/financeiro/repasses/${id(1)}`);
    await page.getByRole("button", { name: "Encerrar o caso no financeiro" }).first().click();
    const j = page.getByRole("dialog", { name: "Encerrar o caso no financeiro" });
    const grupo = j.getByRole("group", { name: "Contratos ligados ao caso" });
    await expect(grupo).toContainText("C-2025-047 · Benedito Souza Lima");
    await expect(grupo).toContainText(
      "O C-2025-047 fica aberto. Quem encerra é a área Contratos (Bianca, Felipe e Marina), no passo “Encerrar o contrato” da ficha de Benedito. Eles recebem um aviso no sino.");
    await expect(grupo).toContainText(`Já encerrado em ${ddmm(-6)}, por Felipe, em Contratos · fica como está`);
    await expect(j.getByRole("checkbox")).toHaveCount(0);
    await expect(j).not.toContainText("Motivo que fica no contrato");
    await expect(j.getByRole("button", { name: "Encerrar o caso", exact: true })).toBeFocused();
    await semViolacoes(page);
    await j.getByRole("button", { name: "Encerrar o caso", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Caso encerrado no financeiro." })).toBeVisible();
    expect(pedidos.filter((p) => p.metodo === "POST" && p.caminho.endsWith("/encerrar")).at(-1)?.corpo).toEqual({});
  });

  test("F3.132, decisão 12: se o caso já foi encerrado pelo outro lado, a janela fecha e a ficha diz por quem", async ({ page }) => {
    const pronto = { ...ACERTO, pendencias: [], falta: 0, faltaPagar: 0 };
    const fechado = { ...pronto, fechado: { em: `${dia(0)}T13:05:00Z`, por: DIEGO } };
    await simular(page, {
      ...comuns(),
      [`GET /v1/escritorio/financeiro/repasses/${id(1)}`]: [{ corpo: { ...FICHA, acerto: pronto } }, { corpo: { ...FICHA, acerto: fechado } }],
      [`POST /v1/escritorio/financeiro/casos/${CASO.id}/encerrar`]: { status: 422, corpo: { erro: { codigo: "VALIDATION_ERROR", detalhes: { motivo: "CASO_JA_ENCERRADO" } } } },
    });
    await page.goto(`${P}/financeiro/repasses/${id(1)}`);
    await page.getByRole("button", { name: "Encerrar o caso no financeiro" }).first().click();
    await page.getByRole("dialog", { name: "Encerrar o caso no financeiro" }).getByRole("button", { name: "Encerrar o caso" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("status").filter({ hasText: "Este caso já foi encerrado no financeiro por Diego Almeida, às 10h05." })).toBeVisible();
    await semViolacoes(page);
  });

  test("EX-17: desmarcado, encerra só o caso", async ({ page }) => {
    const ligado = { id: "c7000000-0000-4000-8000-000000000047", numero: "C-2025-047", objeto: "Pensão por morte", versao: 6, cliente: { id: BEN.id, nome: BEN.nome } };
    const pronto = { ...ACERTO, pendencias: [], falta: 0, faltaPagar: 0, contratosLigados: [ligado], podeEncerrarContratos: true, motivoContratos: "Caso encerrado." };
    const pedidos = await simular(page, {
      ...comuns(),
      [`GET /v1/escritorio/financeiro/repasses/${id(1)}`]: { corpo: { ...FICHA, acerto: pronto } },
      [`POST /v1/escritorio/financeiro/casos/${CASO.id}/encerrar`]: { corpo: { ...pronto, fechado: { em: `${dia(0)}T13:00:00Z`, por: MARINA }, contratosEncerrados: [] } },
    });
    await page.goto(`${P}/financeiro/repasses/${id(1)}`);
    await page.getByRole("button", { name: "Encerrar o caso no financeiro" }).first().click();
    const j = page.getByRole("dialog", { name: "Encerrar o caso no financeiro" });
    await j.getByRole("checkbox", { name: /Encerrar também este contrato/ }).uncheck();
    await expect(j).toContainText("O contrato continua ativo");
    await j.getByRole("button", { name: "Encerrar o caso", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Caso encerrado no financeiro." })).toBeVisible();
    expect(pedidos.filter((p) => p.metodo === "POST" && p.caminho.endsWith("/encerrar")).at(-1)?.corpo).toEqual({});
  });

  test("F3.71: os repasses de cada um, e trocar quem cuida (só quem tem o Financeiro; o motivo vai junto)", async ({ page }) => {
    const LEV2 = { ...LEV, id: id(5), cliente: { ...BEN, id: "be000000-0000-4000-8000-000000000002", nome: "Irene Castro" }, responsavel: BIANCA };
    const trocado = { ...FICHA, responsavel: DIEGO, historico: [
      { acao: "financeiro.repasse_responsavel", em: new Date(agora).toISOString(), por: MARINA, dados: { de: MARINA.id, para: DIEGO.id, motivo: "Bianca está de férias até 30/11." } },
      ...FICHA.historico] };
    const pedidos = await simular(page, {
      ...comuns(ESCRITORIO, { ...LISTA, levantamentos: [LEV, LEV2] }),
      [`GET /v1/escritorio/financeiro/repasses/${id(1)}`]: [{ corpo: FICHA }, { corpo: trocado }],
      [`PUT /v1/escritorio/financeiro/repasses/${id(1)}/responsavel`]: [
        { status: 422, corpo: { erro: { codigo: "VALIDATION_ERROR", detalhes: { motivo: "SEM_AREA_FINANCEIRO" } } } },
        { corpo: { responsavel: DIEGO } },
      ],
    });
    await page.goto(`${P}/financeiro/repasses`);
    const chips = page.getByRole("group", { name: "Quem cuida" });
    await expect(chips.getByRole("button", { name: "Todos (2)" })).toHaveAttribute("aria-pressed", "true");
    await chips.getByRole("button", { name: "Bianca (1)" }).click();
    await expect(page.getByRole("region", { name: "Irene Castro" })).toContainText("Cuida: Bianca Torres");
    await expect(page.getByRole("region", { name: BEN.nome })).toHaveCount(0);
    await chips.getByRole("button", { name: "Os meus (1)" }).click();
    await expect(page.getByRole("region", { name: BEN.nome })).toBeVisible();
    await semViolacoes(page);

    await page.goto(`${P}/financeiro/repasses/${id(1)}`);
    await page.getByRole("button", { name: "Trocar o responsável" }).click();
    const j = page.getByRole("dialog", { name: "Trocar o responsável" });
    await expect(j.getByRole("radio", { name: /Bianca Torres/ })).toBeFocused();
    await expect(j).toContainText("Só aparece quem tem a área Financeiro.");
    await expect(j.getByText("responsável agora")).toBeVisible();
    await j.getByRole("radio", { name: /Diego Almeida/ }).check();
    await j.getByLabel(/Por quê/).fill("Bianca está de férias até 30/11.");
    await j.getByRole("button", { name: "Trocar o responsável" }).click();
    await expect(j.getByRole("alert").filter({ hasText: "Falta acertar 1 ponto" })).toBeVisible();
    await expect(j.getByText("Diego Almeida não tem mais a área Financeiro")).toBeVisible();
    await semViolacoes(page);
    await j.getByRole("button", { name: "Trocar o responsável" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Diego Almeida passou a cuidar do repasse." })).toBeVisible();
    const put = pedidos.filter((p) => p.metodo === "PUT" && p.caminho.endsWith("/responsavel")).pop()!;
    expect(put.corpo).toEqual({ responsavelId: DIEGO.id, motivo: "Bianca está de férias até 30/11." });
    await expect(page.getByRole("region", { name: "Histórico" })).toContainText("Marina Ribeiro passou o repasse para Diego Almeida");
    await expect(page.getByRole("region", { name: "Histórico" })).toContainText("“Bianca está de férias até 30/11.”");
  });

  test("F3.46: anotar o atraso com o motivo e a próxima ação; o prazo não muda", async ({ page }) => {
    const anotada = { ...LEV.destinacoes[2], atraso: {
      id: "ab000000-0000-4000-8000-000000000001", motivo: "DOCUMENTO", texto: null, proximaEm: dia(1), proximaCom: BIANCA,
      oQue: "Cobrar a nota por e-mail", em: new Date(agora).toISOString(), por: MARINA } };
    const depois = { ...LISTA, totais: { ...LISTA.totais, semMotivo: 0 }, levantamentos: [{ ...LEV, destinacoes: [LEV.destinacoes[0], LEV.destinacoes[1], anotada] }] };
    const pedidos = await simular(page, {
      ...comuns(),
      "GET /v1/escritorio/financeiro/repasses": [{ corpo: LISTA }, { corpo: depois }],
      [`POST /v1/escritorio/financeiro/destinacoes/${id(12)}/atraso`]: { corpo: anotada },
    });
    await page.goto(`${P}/financeiro/repasses`);
    await page.getByRole("button", { name: "Anotar o atraso de Dr. Rui Tavares" }).click();
    const j = page.getByRole("dialog", { name: "Anotar o atraso" });
    await expect(j.getByRole("radio", { name: /Esperando um documento/ })).toBeFocused();
    await expect(j).toContainText(`prazo era ${ddmm(-1)}`);
    await j.getByLabel("Quando").fill(br(-1));
    await j.getByRole("button", { name: "Salvar a anotação" }).click();
    await expect(j.getByRole("alert").filter({ hasText: "Falta acertar 2 pontos" })).toBeVisible();
    await expect(j.getByText(`A próxima ação é hoje ou depois. Hoje é ${br(0)}.`)).toBeVisible();
    await expect(j.getByText("Diga o que vai ser feito")).toBeVisible();
    await semViolacoes(page);
    await j.getByLabel("Quando").fill(br(1));
    await j.getByLabel("Com quem").selectOption(BIANCA.id);
    await j.getByLabel("O que fazer").fill("Cobrar a nota por e-mail");
    await j.getByRole("button", { name: "Salvar a anotação" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Anotação do atraso salva." })).toBeVisible();
    const post = pedidos.find((p) => p.metodo === "POST" && p.caminho.endsWith("/atraso"))!;
    expect(post.corpo).toEqual({ motivo: "DOCUMENTO", texto: null, proximaEm: dia(1), proximaComId: BIANCA.id, oQue: "Cobrar a nota por e-mail" });
    const bloco = page.getByRole("region", { name: BEN.nome });
    await expect(bloco).toContainText("Motivo do atraso: esperando um documento");
    await expect(bloco).toContainText(`Próxima ação: ${ddmm(1)}, cobrar a nota por e-mail · Bianca`);
    await expect(bloco.getByRole("button", { name: "Mudar a anotação de Dr. Rui Tavares" })).toBeVisible();
    await expect(page.getByRole("group", { name: "Números dos repasses" })).toContainText("todos com motivo");
  });

  test("F3.48: a folha A caminho, registrar o expedido com a parte do escritório pelo contrato", async ({ page }) => {
    const novo = req(3, { valorRequisitado: 1840000, parteEscritorio: 381000, estimadaMes: mesMais(2), passou: false, cliente: BEN, criadoEm: new Date(agora).toISOString(), expedidoEm: dia(0), tribunal: "TJSP", devedor: "Prefeitura de Santo André" });
    const OFICIO = "0f000000-0000-4000-8000-0000000000f1";
    const oficio = { id: OFICIO, categoria: "OFICIO_REQUISITORIO", nome: "oficio-rpv-vale-alto.pdf", tipo: "application/pdf", tamanho: 312000,
      donoId: novo.id, enviadoPor: { id: "x", nome: "Marina Ribeiro" }, enviadoEm: new Date(agora).toISOString() };
    const depois = { ...COM_CAMINHO, aCaminho: { ...COM_CAMINHO.aCaminho, total: 1056000, n: 3, itens: [PASSOU, EDUARDO, { ...novo, oficio }] } };
    const envios: string[] = [];
    await page.route("**/arquivos-falsos/**", async (rota) => {
      envios.push(`${rota.request().method()} ${new URL(rota.request().url()).pathname}`);
      await rota.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });
    const pedidos = await simular(page, {
      ...comuns(ESCRITORIO, COM_CAMINHO),
      "GET /v1/escritorio/financeiro/repasses": [{ corpo: COM_CAMINHO }, { corpo: depois }],
      "POST /v1/escritorio/financeiro/repasses/proposta": { corpo: PROPOSTA },
      "POST /v1/escritorio/financeiro/a-caminho": { status: 201, corpo: novo },
      "POST /v1/escritorio/anexos": { status: 201, corpo: { id: OFICIO, enderecoDeEnvio: `${P}/arquivos-falsos/${OFICIO}?token=uso-unico` } },
      [`POST /v1/escritorio/anexos/${OFICIO}/concluir`]: { corpo: oficio },
    });
    await page.goto(`${P}/financeiro/repasses`);
    const nums = page.getByRole("group", { name: "Números dos repasses" });
    await expect(nums).toContainText("A caminho");
    await expect(nums).toContainText("R$ 6.750,00");
    const folha = page.getByRole("region", { name: "A caminho" });
    await expect(folha).toContainText("Irene Castro · RPV");
    await expect(folha).toContainText("Passou da data estimada");
    await expect(folha).toContainText(`Era ${mesAno(mesMais(-1))}`);
    await expect(folha).toContainText(`Data estimada: ${mesAno(mesMais(2))}`);
    await expect(folha).toContainText("Parte do escritório em 2 requisições");
    await semViolacoes(page);

    await page.getByRole("button", { name: "Registrar RPV expedido" }).click();
    const j = page.getByRole("dialog", { name: "Registrar RPV ou precatório expedido" });
    await expect(j.getByRole("radio", { name: /^RPV/ })).toBeFocused();
    await expect(j.getByLabel("Data estimada de pagamento")).toHaveValue(`${mesMais(2).slice(5, 7)}/${mesMais(2).slice(0, 4)}`);
    await j.getByLabel("Data estimada de pagamento").fill("01/2020");
    await j.getByRole("button", { name: "Registrar a caminho" }).click();
    await expect(j.getByRole("alert").filter({ hasText: "Falta acertar" })).toBeVisible();
    await expect(j.getByText("Escreva o tribunal, por exemplo: TJSP.")).toBeVisible();
    await expect(j.getByText(/A data estimada vem depois da expedição/)).toBeVisible();
    await semViolacoes(page);
    await j.getByLabel("Caso").selectOption(`${CASO.id}|${BEN.id}`);
    await j.getByLabel("Tribunal").fill("TJSP");
    await j.getByLabel("Quem paga", { exact: true }).fill("Prefeitura de Santo André");
    await j.getByLabel("Valor requisitado").fill("18.400,00");
    await j.getByLabel("Data estimada de pagamento").fill(`${mesMais(2).slice(5, 7)}/${mesMais(2).slice(0, 4)}`);
    await expect(j).toContainText("Honorários · 30% de êxito");
    await expect(j).toContainText("R$ 3.810,00");
    await expect(j).toContainText(`entram na previsão do Caixa em ${mesAno(mesMais(2))}`);
    await j.getByLabel(/Ofício requisitório/).setInputFiles({ name: "oficio-rpv-vale-alto.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(900, 1) });
    await expect(j).toContainText("vai junto ao salvar");
    await semViolacoes(page);
    await j.getByRole("button", { name: "Registrar a caminho" }).click();
    await expect(page.getByRole("status").filter({ hasText: "RPV a caminho registrado." })).toContainText("Ofício anexado.");
    expect(pedidos.find((p) => p.caminho === "/v1/escritorio/anexos")?.corpo).toEqual({
      dono: "REQUISICAO", donoId: novo.id, categoria: null, nome: "oficio-rpv-vale-alto.pdf", tipo: "application/pdf", tamanho: 900,
    });
    expect(envios).toEqual([`PUT /arquivos-falsos/${OFICIO}`]);
    await expect(folha.getByRole("button", { name: /Ofício anexado ?: abrir oficio-rpv-vale-alto\.pdf/ })).toBeVisible();
    const post = pedidos.find((p) => p.metodo === "POST" && p.caminho.endsWith("/a-caminho"))!;
    expect(post.corpo).toEqual({ tipo: "RPV", casoId: CASO.id, clienteId: BEN.id, tribunal: "TJSP", devedor: "Prefeitura de Santo André", numero: null,
      valor: 1840000, expedidoEm: dia(0), estimadaMes: mesMais(2) });
    await expect(folha).toContainText("Novo");
  });

  test("F3.48: mudar a data com motivo e, quando entra, o registrar já vem preenchido", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(ESCRITORIO, COM_CAMINHO),
      [`POST /v1/escritorio/financeiro/a-caminho/${PASSOU.id}/data`]: { corpo: { ...PASSOU, estimadaMes: mesMais(1), passou: false } },
      "POST /v1/escritorio/financeiro/repasses/proposta": { corpo: PROPOSTA },
      "POST /v1/escritorio/financeiro/repasses": { status: 201, corpo: { id: id(3) } },
    });
    await page.goto(`${P}/financeiro/repasses`);
    await page.getByRole("button", { name: "Mudar a data de Irene Castro" }).click();
    const j = page.getByRole("dialog", { name: "Mudar a data estimada" });
    await j.getByRole("button", { name: "Salvar a data" }).click();
    await expect(j.getByText("Escreva o mês, deste em diante, no formato mm/aaaa.")).toBeVisible();
    await expect(j.getByText("Escreva o motivo, com pelo menos 5 letras.")).toBeVisible();
    await semViolacoes(page);
    await j.getByRole("textbox", { name: "Nova data estimada" }).fill(`${mesMais(1).slice(5, 7)}/${mesMais(1).slice(0, 4)}`);
    await j.getByLabel("Por quê").fill("O TRF3 publicou a nova data.");
    await j.getByRole("button", { name: "Salvar a data" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Data estimada mudada." })).toBeVisible();
    const post = pedidos.find((p) => p.caminho.endsWith("/data"))!;
    expect(post.corpo).toEqual({ situacao: "A_CAMINHO", estimadaMes: mesMais(1), motivo: "O TRF3 publicou a nova data." });

    await page.getByRole("button", { name: `Entrou na conta: RPV de ${BEN.nome}` }).click();
    const r = page.getByRole("dialog", { name: "Registrar o levantamento" });
    await expect(r).toContainText("Vem do RPV a caminho");
    await expect(r).toContainText("Requisitado: R$ 16.200,00");
    await r.getByLabel("Valor levantado").fill("16.300,00");
    await r.getByRole("button", { name: "Registrar", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Saiu de “A caminho” e da previsão do Caixa." })).toBeVisible();
    const lev = pedidos.find((p) => p.metodo === "POST" && p.caminho === "/v1/escritorio/financeiro/repasses")!;
    expect((lev.corpo as { requisicaoId: string }).requisicaoId).toBe(EDUARDO.id);
  });

  test("Sem a área Financeiro, Repasses não abre", async ({ page }) => {
    await simular(page, comuns(SEM_AREA));
    await page.goto(`${P}/financeiro/repasses`);
    await expect(page.getByRole("heading", { name: "Esta área não está liberada para você" })).toBeVisible();
  });
});

// F3.174 (FI-24, FI-05, FI-25): o êxito com baixa sem receber na divisão do alvará, desenho aprovado
// em docs/design/aprovadas/portal-exito-baixado-alvara (estados eb-proposta, eb-desfazer-escolhido,
// eb-mantida, eb-erro, eb-conflito e eb-historico).
const RITA = { id: "be000000-0000-4000-8000-000000000021", nome: "Rita Fonseca" };
const CASO_R = { id: "ca000000-0000-4000-8000-000000000021", nome: "Fonseca x Banco Aurora" };
const B_RITA = "bb000000-0000-4000-8000-000000000021";
const CUSTAS = "c3000000-0000-4000-8000-000000000121";
const EB = {
  parcelaId: "f6000000-0000-4000-8000-000000000021", descricao: "Êxito · Fonseca x Banco Aurora", vencimento: "2026-10-20", valor: 480000,
  contrato: { id: "c0000000-0000-4000-8000-000000000021", numero: "C-2026-021", estado: "ATIVO" },
  baixa: { id: B_RITA, motivo: "INADIMPLENCIA", explicacao: "Rita disse que o banco não pagou o acordo; não vamos cobrar agora.", valor: 480000,
    recebidoAntes: 0, por: MARINA, em: "2026-11-05T13:00:00Z", reembolsos: [{ contaId: CUSTAS, descricao: "custas", valor: 41230, categoria: "CUSTAS" }], desfeita: null },
};
const PROP_R = {
  contrato: { id: EB.contrato.id, numero: "C-2026-021" },
  linhas: [{ para: "HONORARIOS", nome: "Honorários de êxito", regra: "30% · acordo · contrato C-2026-021", valor: 480000 }],
  cliente: 1120000, falta: 0, exito: [], exitoBaixado: [EB],
};
const LISTA_R = { ...LISTA, casos: [{ id: CASO_R.id, nome: CASO_R.nome, parteContraria: "Banco Aurora", clientes: [RITA] }] };
const POST_REP = "POST /v1/escritorio/financeiro/repasses";
const postsRep = (pedidos: Pedido[]) => pedidos.filter((p) => p.metodo === "POST" && p.caminho === "/v1/escritorio/financeiro/repasses");

async function abrirRita(page: Page) {
  await page.goto(`${P}/financeiro/repasses`);
  await page.getByRole("button", { name: "Registrar alvará ou RPV" }).first().click();
  const j = page.getByRole("dialog", { name: "Registrar alvará ou RPV" });
  await j.getByLabel("O que entrou").selectOption("ALVARA");
  await j.getByLabel("Valor levantado").fill("16.000,00");
  await expect(j.getByRole("heading", { name: "O êxito de Rita está com baixa sem receber." })).toBeVisible();
  return j;
}

test.describe("F3.174: o êxito com baixa sem receber na divisão do alvará (FI-24, FI-05, FI-25)", () => {
  test("eb-proposta, eb-erro e eb-desfazer-escolhido: pelo teclado, desfazer a baixa e registrar numa vez só", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(ESCRITORIO, LISTA_R),
      "POST /v1/escritorio/financeiro/repasses/proposta": { corpo: PROP_R },
      [POST_REP]: { status: 201, corpo: { id: id(3), exitoBaixado: [{ parcelaId: EB.parcelaId, descricao: EB.descricao, valor: 480000, paga: true }], baixaDesfeita: true } },
    });
    const j = await abrirRita(page);
    const tab = j.getByRole("table", { name: "Para quem vai cada parte" });
    // eb-proposta: na célula, só a linha curta; o aviso e a escolha abaixo da tabela, sem nada marcado.
    await expect(tab.getByRole("row", { name: /Honorários de êxito/ })).toContainText("Êxito com baixa sem receber · veja abaixo");
    await expect(j.getByText("Êxito · Fonseca x Banco Aurora · R$ 4.800,00 · inadimplência, por Marina Ribeiro em 05/11/2026.")).toBeVisible();
    await expect(j.getByText("Rita disse que o banco não pagou o acordo; não vamos cobrar agora.")).toBeVisible();
    await expect(j.getByText("As custas de R$ 412,30 tiveram baixa junto. Ao desfazer, elas entram na divisão como reembolso.")).toBeVisible();
    const grupo = j.getByRole("group", { name: "O que fazer com o êxito de Rita" });
    await expect(grupo.getByRole("radio", { checked: true })).toHaveCount(0);
    await expect(j.getByRole("group", { name: /Divisão proposta pelo contrato C-2026-021/ })).toHaveAttribute("aria-describedby", "eb-aviso");
    await expect(tab.getByRole("row", { name: /Rita Fonseca/ })).toContainText("R$ 11.200,00");
    await semViolacoes(page);
    // eb-erro: registrar sem escolher.
    await j.getByRole("button", { name: "Registrar" }).click();
    await expect(j.getByRole("alert").filter({ hasText: "Falta acertar 1 coisa." })).toContainText("Nada foi registrado ainda.");
    await expect(grupo.getByText("Escolha o que fazer com o êxito de Rita: desfazer a baixa sem receber ou tirar os honorários.")).toBeVisible();
    const desfazer = grupo.getByRole("radio", { name: /Desfazer a baixa antes de dividir/ });
    await expect(desfazer).toBeFocused();
    await expect(desfazer).toHaveAttribute("aria-invalid", "true");
    await semViolacoes(page);
    expect(postsRep(pedidos)).toHaveLength(0);
    // eb-desfazer-escolhido, pelo teclado.
    await page.keyboard.press("Space");
    await expect(desfazer).toBeChecked();
    const porque = j.getByLabel("Por que desfazer");
    await expect(porque).toHaveValue(`O alvará de R$ 16.000,00 entrou em ${ddmm(0)} e paga o êxito.`);
    await expect(tab.getByRole("row", { name: /Honorários de êxito/ })).toContainText("Paga a parcela do êxito (falta R$ 4.800,00)");
    await expect(tab.getByRole("row", { name: /Reembolso: custas/ })).toContainText("Tinham baixa junto com o êxito; voltam a ser cobradas");
    await expect(tab.getByRole("row", { name: /Rita Fonseca/ })).toContainText("R$ 10.787,70");
    await semViolacoes(page);
    // A variação das notas: "Desfazer" com o campo vazio.
    await porque.fill("");
    await j.getByRole("button", { name: "Registrar" }).click();
    await expect(j.getByText("Escreva por que desfazer, com pelo menos 3 letras.")).toBeVisible();
    await expect(porque).toBeFocused();
    await porque.fill("O alvará entrou e paga o êxito.");
    await j.getByRole("button", { name: "Registrar" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("status").filter({ hasText: "Alvará registrado." }))
      .toContainText("A baixa sem receber do êxito foi desfeita, e os honorários pagam a parcela.");
    expect(postsRep(pedidos)).toHaveLength(1);
    expect(postsRep(pedidos)[0]!.corpo).toMatchObject({
      exitoBaixadoVisto: [B_RITA],
      desfazerBaixa: { baixaId: B_RITA, explicacao: "O alvará entrou e paga o êxito." },
      divisao: [
        { para: "CLIENTE", valor: 1078770 },
        { para: "HONORARIOS", nome: "Honorários de êxito", valor: 480000 },
        { para: "REEMBOLSO", nome: "Reembolso: custas", valor: 41230, contaId: CUSTAS },
      ],
    });
  });

  test("eb-mantida: manter a baixa tira os honorários, e o corpo vai sem eles", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(ESCRITORIO, LISTA_R),
      "POST /v1/escritorio/financeiro/repasses/proposta": { corpo: PROP_R },
      [POST_REP]: { status: 201, corpo: { id: id(3), exitoBaixado: [] } },
    });
    const j = await abrirRita(page);
    const tab = j.getByRole("table", { name: "Para quem vai cada parte" });
    const manter = j.getByRole("radio", { name: /Manter a baixa e tirar os honorários/ });
    await expect(manter).toHaveAccessibleName(/Os R\$ 4\.800,00 ficam com Rita/);
    await manter.check();
    await expect(tab.getByRole("row", { name: /Honorários de êxito/ })).toHaveCount(0);
    await expect(tab.getByRole("row", { name: /Rita Fonseca/ })).toContainText("R$ 16.000,00");
    await expect(j.getByText("Os honorários saíram da divisão. O êxito de Rita continua com baixa sem receber, e isso fica no histórico do repasse.")).toBeVisible();
    await semViolacoes(page);
    // Escolher a outra opção depois põe a linha de volta, com o valor proposto.
    await j.getByRole("radio", { name: /Desfazer a baixa antes de dividir/ }).check();
    await expect(tab.getByLabel("Valor de Honorários de êxito")).toHaveValue("4.800,00");
    await manter.check();
    await j.getByRole("button", { name: "Registrar" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Alvará registrado." })).toBeVisible();
    const corpo = postsRep(pedidos)[0]!.corpo as Record<string, unknown>;
    expect(corpo.divisao).toEqual([{ para: "CLIENTE", valor: 1600000 }]);
    expect([corpo.exitoBaixadoVisto, "desfazerBaixa" in corpo]).toEqual([[B_RITA], false]);
  });

  test("eb-conflito: Bianca desfez a baixa com a janela aberta; nada foi registrado e a divisão vem refeita", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(ESCRITORIO, LISTA_R),
      "POST /v1/escritorio/financeiro/repasses/proposta": [{ corpo: PROP_R }, { corpo: { ...PROP_R, exitoBaixado: [] } }],
      [POST_REP]: { status: 409, corpo: { erro: { codigo: "VERSION_CONFLICT", detalhes: {
        motivo: "EXITO_MUDOU", tipo: "DESFEITA", por: BIANCA, em: `${dia(0)}T13:13:00Z`, parcelaId: EB.parcelaId } } } },
    });
    const j = await abrirRita(page);
    await j.getByRole("button", { name: "Acrescentar perito, parceiro ou outro" }).click();
    await j.getByLabel("Nome de quem recebe").fill("Dr. Rui Tavares");
    await j.getByLabel("Valor de Dr. Rui Tavares").fill("405,00");
    await j.getByRole("radio", { name: /Desfazer a baixa antes de dividir/ }).check();
    await j.getByRole("button", { name: "Registrar" }).click();
    const alerta = j.getByRole("alert").filter({ hasText: "Bianca Torres" });
    await expect(alerta).toContainText("Bianca Torres desfez a baixa sem receber do êxito de Rita às 10h13.");
    await expect(alerta).toContainText("Nada foi registrado. Veja a divisão refeita antes de registrar.");
    const refeita = j.getByRole("button", { name: "Ver a divisão refeita" });
    await expect(refeita).toBeFocused();
    await expect(j.getByRole("table", { name: "Para quem vai cada parte" })).toHaveCount(0);
    await semViolacoes(page);
    await refeita.click();
    await expect(j.getByRole("table", { name: "Para quem vai cada parte" }).getByRole("row", { name: /Honorários de êxito/ })).not.toContainText("baixa sem receber");
    await expect(j.getByRole("heading", { name: "O êxito de Rita está com baixa sem receber." })).toHaveCount(0);
    await expect(j.getByLabel("O que entrou")).toHaveValue("ALVARA");
    await expect(j.getByLabel("Valor levantado")).toHaveValue("16.000,00");
    // A linha acrescentada à mão continua na divisão refeita.
    await expect(j.getByLabel("Valor de Dr. Rui Tavares")).toHaveValue("405,00");
    expect(pedidos.filter((p) => p.caminho === "/v1/escritorio/financeiro/repasses/proposta")).toHaveLength(2);
    // O clique em "Ver a divisão refeita" não reenvia o registrar.
    expect(postsRep(pedidos)).toHaveLength(1);
  });

  test("eb-historico: na ficha do repasse, a escolha de manter a baixa, sem a explicação", async ({ page }) => {
    const ficha = { ...FICHA, cliente: RITA, tipo: "ALVARA", historico: [
      { acao: "financeiro.levantamento_exito_mantido", em: `${dia(0)}T13:14:00Z`, por: DIEGO,
        dados: { tipo: "ALVARA", baixas: [{ baixa: B_RITA, motivo: "INADIMPLENCIA", valor: 480000, por: MARINA, em: "2026-11-05T13:00:00Z", contrato: "C-2026-021" }] } },
      { acao: "financeiro.levantamento", em: `${dia(0)}T13:14:00Z`, por: DIEGO, dados: { tipo: "ALVARA", valor: 1600000, seguiuProposta: false } },
    ] };
    await simular(page, { ...comuns(), [`GET /v1/escritorio/financeiro/repasses/${id(1)}`]: { corpo: ficha } });
    await page.goto(`${P}/financeiro/repasses/${id(1)}`);
    const h = page.getByRole("region", { name: "Histórico" });
    await expect(h).toContainText("Registrado sem os honorários do êxito: a parcela de Rita continua com baixa sem receber (inadimplência, por Marina Ribeiro em 05/11).");
    await expect(h).toContainText("Diego Almeida, ao registrar o alvará");
    await expect(h).not.toContainText("banco não pagou");
    await expect(page.getByText("Sem os honorários do êxito: Diego Almeida manteve a baixa sem receber ao registrar.")).toBeVisible();
    const fecha = page.getByRole("region", { name: "Fechamento do caso" });
    await expect(fecha).toContainText("Êxito do contrato C-2026-021: baixa sem receber");
    await expect(fecha).toContainText("inadimplência, por Marina Ribeiro em 05/11 · mantida ao registrar o alvará");
    await semViolacoes(page);
  });
});

// F3.199 (CH-07, FI-05): o êxito lançado depois do alvará já nasce pago, desenho aprovado em
// docs/design/aprovadas/portal-exito-alvara-conferir (D39), estados ea-proposta, ea-exito-pago,
// ea-exito-falta (C3: os honorários limitados ao que falta do êxito) e ea-repasse.
const HELENA = { id: "be000000-0000-4000-8000-000000000031", nome: "Helena Duarte" };
const CASO_H = { id: "ca000000-0000-4000-8000-000000000031", nome: "Duarte x Construtora Atlas" };
const LISTA_H = { ...LISTA, casos: [{ id: CASO_H.id, nome: CASO_H.nome, parteContraria: "Construtora Atlas", clientes: [HELENA] }] };
const HON_H = { para: "HONORARIOS", nome: "Honorários de êxito", regra: "30% · acordo · contrato C-2026-027", valor: 300000 };
const propH = (extra: Record<string, unknown>) => ({ contrato: { id: "c0000000-0000-4000-8000-000000000027", numero: "C-2026-027" },
  linhas: [HON_H], cliente: 700000, falta: 0, exito: [], exitoBaixado: [], ...extra });
const nbsp = (s: string) => s.replace(/\u00a0/g, " ");

async function abrirHelena(page: Page) {
  await page.goto(`${P}/financeiro/repasses`);
  await page.getByRole("button", { name: "Registrar alvará ou RPV" }).first().click();
  const j = page.getByRole("dialog", { name: "Registrar alvará ou RPV" });
  await j.getByLabel("O que entrou").selectOption("ALVARA");
  await j.getByLabel("Valor levantado").fill("10.000,00");
  await expect(j.getByRole("table", { name: "Para quem vai cada parte" })).toBeVisible();
  return j;
}

test.describe("F3.199: o êxito lançado depois do alvará já nasce pago (CH-07, FI-05)", () => {
  test("ea-proposta: o êxito ainda não lançado ganha só a linha curta na célula, sem alerta", async ({ page }) => {
    await simular(page, {
      ...comuns(ESCRITORIO, LISTA_H),
      "POST /v1/escritorio/financeiro/repasses/proposta": { corpo: propH({ exitoSituacao: { situacao: "PARA_CONFERIR", calculado: 300000 } }) },
    });
    const j = await abrirHelena(page);
    const hon = j.getByRole("table", { name: "Para quem vai cada parte" }).getByRole("row", { name: /Honorários de êxito/ });
    await expect(hon).toContainText("O êxito de Helena ainda não foi lançado. Estes honorários pagam a parcela quando ela for lançada.");
    await expect(j.locator("#ea-limite")).toHaveCount(0);
    await expect(j.getByRole("alert")).toHaveCount(0);
    await semViolacoes(page);
  });

  test("ea-exito-falta e ea-exito-pago: o aviso do limite abaixo da tabela, só quando o limite valeu", async ({ page }) => {
    await simular(page, {
      ...comuns(ESCRITORIO, LISTA_H),
      "POST /v1/escritorio/financeiro/repasses/proposta": [
        { corpo: propH({ exitoSituacao: { situacao: "LANCADO", valor: 480000, falta: 180000 },
          linhas: [{ ...HON_H, regra: `${HON_H.regra} · até o que falta do êxito`, valor: 180000, semLimite: 300000 }], cliente: 820000 }) },
        { corpo: propH({ exitoSituacao: { situacao: "PAGO", valor: 480000, falta: 0, pagoEm: dia(-6) }, linhas: [], cliente: 1000000 }) },
      ],
    });
    const j = await abrirHelena(page);
    const aviso = j.locator("#ea-limite");
    await expect(aviso).toBeVisible();
    expect(nbsp(await aviso.innerText())).toContain("Falta R$ 1.800,00 do êxito de Helena.");
    expect(nbsp(await aviso.innerText())).toContain("Os honorários deste alvará ficam limitados a esse valor. Pelos 30% do contrato, seriam R$ 3.000,00.");
    await expect(j.getByRole("group", { name: /Divisão proposta pelo contrato C-2026-027/ })).toHaveAttribute("aria-describedby", /ea-limite/);
    await expect(j.getByRole("table", { name: "Para quem vai cada parte" }).getByLabel("Valor de Honorários de êxito")).toHaveValue("1.800,00");
    await semViolacoes(page);
    // Outro valor refaz a proposta: agora o êxito já está pago e não há honorários.
    await j.getByLabel("Valor levantado").fill("10.000,01");
    await expect(aviso).toContainText("já foi pago");
    expect(nbsp(await aviso.innerText())).toContain(`O êxito de Helena já foi pago (R$ 4.800,00, em ${br(-6).slice(0, 5)}).`);
    await expect(aviso).toContainText("Por isso, este alvará não tem honorários do êxito.");
    await expect(j.getByRole("table", { name: "Para quem vai cada parte" }).getByRole("row", { name: /Honorários de êxito/ })).toHaveCount(0);
    await semViolacoes(page);
  });

  test("ea-repasse: na ficha, a parte de honorários que pagou o êxito, o fechamento e o histórico", async ({ page }) => {
    const pagou = [{ parcelaId: "f6000000-0000-4000-8000-000000000031", descricao: "Êxito · Duarte x Construtora Atlas", valor: 300000,
      lancadaEm: `${dia(0)}T13:20:00Z`, pagaEm: dia(-6), contrato: "C-2026-027", lancadaPor: DIEGO }];
    const ficha = { ...FICHA, cliente: HELENA, tipo: "ALVARA", destinacoes: [
      parte(10, "CLIENTE", HELENA.nome, 700000, { situacao: "FEITO", feitoEm: dia(-5), feitoPor: MARINA }),
      parte(11, "HONORARIOS", "Honorários de êxito", 300000, { regra: "30% · acordo · contrato C-2026-027", pagou }),
    ], historico: [
      { acao: "financeiro.levantamento_exito_lancado_depois", em: `${dia(0)}T13:20:00Z`, por: DIEGO,
        dados: { tipo: "ALVARA", valor: 300000, contrato: "C-2026-027" } },
      { acao: "financeiro.levantamento", em: `${dia(-6)}T19:12:00Z`, por: MARINA, dados: { tipo: "ALVARA", valor: 1000000, seguiuProposta: true } },
    ] };
    await simular(page, { ...comuns(), [`GET /v1/escritorio/financeiro/repasses/${id(1)}`]: { corpo: ficha } });
    await page.goto(`${P}/financeiro/repasses/${id(1)}`);
    await expect(page.getByRole("row", { name: /Honorários de êxito/ }).first()).toContainText(`Pagou a parcela do êxito, lançada em ${ddmm(0)}`);
    const fecha = page.getByRole("region", { name: "Fechamento do caso" });
    await expect(fecha).toContainText("Êxito do contrato C-2026-027: pago por este alvará");
    await expect(fecha).toContainText(`lançado por Diego Almeida em ${ddmm(0)} · pago em ${ddmm(-6)}`);
    const h = page.getByRole("region", { name: "Histórico" });
    expect(nbsp(await h.innerText())).toContain(`A parcela do êxito de Helena foi lançada em ${ddmm(0)} por Diego e paga por esta parte de honorários (R$ 3.000,00).`);
    await expect(h).toContainText("Diego Almeida, ao conferir o êxito em A receber");
    await semViolacoes(page);
  });
});
