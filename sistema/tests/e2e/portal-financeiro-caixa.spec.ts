// Financeiro do Portal, Resumo e Caixa (telas aprovadas em docs/design/aprovadas/portal-financeiro,
// estados resumo, resumo-vazio, caixa e exportar): o mês do escritório ao lado do que é de
// terceiros, sem somar; o vencido por idade com o motivo e a próxima ação; o previsto contra o
// realizado com o alerta de queda; os próximos 7 dias e os repasses pendentes; os saldos, o mês a
// mês e a exportação para o contador. A API é simulada; aqui se testa a tela, a acessibilidade, o
// que ela manda e o arquivo que ela salva.
import { readFileSync } from "node:fs";
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

type Resp = { status?: number; corpo: unknown };
type Pedido = { metodo: string; caminho: string; busca: string; corpo: unknown };

async function simular(page: Page, rotas: Record<string, Resp | Resp[]>) {
  const pedidos: Pedido[] = [];
  await page.route("**/api/v1/**", async (rota) => {
    const url = new URL(rota.request().url());
    const caminho = url.pathname.replace(/^\/api/, "");
    const metodo = rota.request().method();
    pedidos.push({ metodo, caminho, busca: url.search, corpo: rota.request().postDataJSON() });
    const r = rotas[`${metodo} ${caminho}${url.search}`] ?? rotas[`${metodo} ${caminho}`] ?? rotas[caminho] ?? { status: 404, corpo: { erro: { codigo: "NOT_FOUND" } } };
    const lista = Array.isArray(r) ? r : [r];
    const vez = pedidos.filter((p) => p.caminho === caminho && p.metodo === metodo).length - 1;
    const x = lista[Math.min(vez, lista.length - 1)]!;
    await rota.fulfill({ status: x.status ?? 200, contentType: "application/json", body: JSON.stringify(x.corpo) });
  });
  return pedidos;
}

const id = (n: number) => `f6000000-0000-4000-8000-0000000001${String(n).padStart(2, "0")}`;
const MARINA = { id: "aa000000-0000-4000-8000-000000000001", nome: "Marina Ribeiro" };
const DIEGO = { id: "aa000000-0000-4000-8000-000000000002", nome: "Diego Almeida" };
const HOJE = "2026-11-18";

const cobranca = (motivo: string, proxData: string, proxOque: string, quem = DIEGO) => ({
  tipo: "LIGACAO", texto: null, motivo, motivoDesde: "2026-11-10T12:00:00Z", proxData, proxOque, proxResponsavel: quem, autor: quem, em: "2026-11-10T12:00:00Z",
});
const parcela = (n: number, cliente: string, objeto: string, descricao: string, vencimento: string, falta: number, forma: string | null, cob: unknown = null) => ({
  id: id(n), tipo: "PARCELADO", descricao, vencimento, valor: falta, recebido: 0, falta, forma,
  situacao: vencimento < HOJE ? "VENCIDA" : "A_VENCER", pagaEm: null,
  contrato: { id: id(50 + n), numero: `C-2026-0${n}`, objeto }, cliente: { id: id(70 + n), nome: cliente },
  responsavel: MARINA, cobranca: cob, cancelado: null,
});
const TERCEIROS = { saldo: 3028496, honorarios: 646997, clientes: 2, peritos: 1, parceiros: 1, outros: 0 };
const RESUMO = {
  hoje: HOJE, mes: "2026-11-01", algum: true,
  escritorio: { recebido: 3124000, vencidoMes: 500000, seteDias: 800000, restoMes: 406000 },
  vencidas: {
    valor: 705000, n: 4, semAcao: 0,
    faixas: [{ valor: 585000, n: 3 }, { valor: 0, n: 0 }, { valor: 120000, n: 1 }, { valor: 0, n: 0 }],
    parcelas: [
      parcela(1, "Daniela Rocha Mendes", "Reclamação trabalhista", "Entrada 2/5", "2026-09-05", 120000, "PIX",
        cobranca("Está desempregada e pediu para pagar depois do acordo.", "2026-11-26", "propor descontar do valor do acordo", MARINA)),
      parcela(2, "Hélio Batista Corrêa", "Ação revisional", "Parcela 3/6", "2026-10-25", 85000, "PIX",
        cobranca("Não respondeu aos lembretes do WhatsApp.", "2026-11-19", "ligar para Marta Corrêa, a esposa")),
      parcela(3, "Construtora Vale Alto Ltda.", "Assessoria mensal", "Mensalidade", "2026-11-10", 320000, "BOLETO",
        cobranca("Vai pagar junto com a medição da obra, no dia 25.", "2026-11-25", "conferir se o boleto foi pago")),
      parcela(4, "Farmácia Bom Jesus Ltda.", "Assessoria mensal", "Mensalidade", "2026-11-15", 180000, "DEBITO_AUTOMATICO",
        cobranca("O banco recusou o débito automático.", HOJE, "mandar um Pix de cobrança")),
    ],
  },
  proximas: {
    valor: 800000, n: 5, ate: "2026-11-25",
    parcelas: [
      parcela(5, "Benedito Souza Lima", "Revisão de aposentadoria", "Parcela 2/4", "2026-11-19", 145000, "PIX"),
      parcela(6, "Gabriela Teixeira", "Ação de cobrança", "Entrada", "2026-11-20", 400000, "PIX"),
      parcela(7, "Irene Castro", "Consultoria previdenciária", "Parcela 1/3", "2026-11-23", 110000, "BOLETO"),
      parcela(8, "Eduardo Nascimento", "Consulta", "Consulta de 10/11", "2026-11-24", 60000, "CARTAO"),
      parcela(9, "Hélio Batista Corrêa", "Ação revisional", "Parcela 4/6", "2026-11-25", 85000, "PIX"),
    ],
  },
  terceiros: TERCEIROS,
  repasses: {
    valor: 2381499, n: 4,
    lista: [
      { id: id(20), levantamentoId: id(30), para: "CLIENTE", nome: "Gabriela Teixeira", regra: null, valor: 490000, prazo: "2026-11-17", tipo: "ACORDO", cliente: "Gabriela Teixeira", caso: "Ação de cobrança" },
      { id: id(21), levantamentoId: id(31), para: "CLIENTE", nome: "Benedito Souza Lima", regra: null, valor: 1509659, prazo: "2026-11-20", tipo: "RPV", cliente: "Benedito Souza Lima", caso: "Revisão de aposentadoria" },
      { id: id(22), levantamentoId: id(32), para: "PARCEIRO", nome: "Oliveira & Prates Advocacia", regra: "20% dos honorários", valor: 231840, prazo: "2026-11-20", tipo: "RPV", cliente: "Irene Castro", caso: "Pensão" },
      { id: id(23), levantamentoId: id(32), para: "PERITO", nome: "Dr. Rui Tavares", regra: null, valor: 150000, prazo: "2026-11-20", tipo: "RPV", cliente: "Irene Castro", caso: "Pensão" },
    ],
  },
  meses: [
    { mes: "2026-08-01", previsto: 4410000, realizado: 4238000 },
    { mes: "2026-09-01", previsto: 4560000, realizado: 3991000 },
    { mes: "2026-10-01", previsto: 4720000, realizado: 4505000 },
    { mes: "2026-11-01", previsto: 4830000, realizado: 3124000 },
  ],
  porTipo: [
    { tipo: "PARCELADO", valor: 1284000, anteriores: 3900000, restante: 0 },
    { tipo: "MENSAL", valor: 960000, anteriores: 2880000, restante: 0 },
    { tipo: "EXITO", valor: 720000, anteriores: 3690000, restante: 0 },
    { tipo: "ATO", valor: 160000, anteriores: 480000, restante: 0 },
  ],
  contratado: { n: 4, valor: 2650000 },
  clientesReceberam: { n: 2, valor: 3142800 },
  fixas: { receita: 1480000, despesas: 1890000 },
};
const VAZIO = { ...RESUMO, algum: false };
const CAIXA = {
  hoje: HOJE, mes: "2026-11-01", saldo: 4031000, fechaMes: 3985000, terceiros: TERCEIROS,
  meses: [
    { mes: "2026-09-01", entradasPrevistas: 4560000, entradasRealizadas: 3991000, saidasPrevistas: 4120000, saidasRealizadas: 4164000, saldo: 2827000 },
    { mes: "2026-10-01", entradasPrevistas: 4720000, entradasRealizadas: 4505000, saidasPrevistas: 4140000, saidasRealizadas: 4087000, saldo: 3245000 },
    { mes: "2026-11-01", entradasPrevistas: 4830000, entradasRealizadas: 3124000, saidasPrevistas: 4090000, saidasRealizadas: 2338000, saldo: 4031000 },
    { mes: "2026-12-01", entradasPrevistas: 4690000, entradasRealizadas: null, saidasPrevistas: 4660000, saidasRealizadas: null, saldo: 4015000 },
    { mes: "2027-01-01", entradasPrevistas: 4966000, aCaminho: 486000, entradasRealizadas: null, saidasPrevistas: 4130000, saidasRealizadas: null, saldo: 4851000 },
    { mes: "2027-02-01", entradasPrevistas: 4520000, entradasRealizadas: null, saidasPrevistas: 4130000, saidasRealizadas: null, saldo: 5241000 },
  ],
  exportacoes: [{ mes: "2026-09-01", formato: "XLSX", em: "2026-10-05T14:00:00Z", por: MARINA }],
  mesesExportar: ["2026-11-01", "2026-10-01", "2026-09-01"],
  aCaminho: { total: 675000, n: 2, naPrevisao: 486000, passou: { valor: 189000, n: 1 }, itens: [
    { id: "ad000000-0000-4000-8000-000000000001", tipo: "RPV", tribunal: "TRF3", devedor: "INSS", numero: null, valorRequisitado: 630000, parteEscritorio: 189000,
      parteRegra: "30% de êxito", expedidoEm: "2026-08-03", estimadaMes: "2026-10-01", situacao: "A_CAMINHO", passou: true, criadoEm: "2026-08-03T12:00:00Z",
      caso: { id: "ca1", nome: "Castro x INSS" }, cliente: { id: "c1", nome: "Irene Castro" }, contratoId: null, levantamentoId: null },
    { id: "ad000000-0000-4000-8000-000000000002", tipo: "RPV", tribunal: "TJSP", devedor: "Prefeitura", numero: null, valorRequisitado: 1620000, parteEscritorio: 486000,
      parteRegra: "30% de êxito", expedidoEm: "2026-11-10", estimadaMes: "2027-01-01", situacao: "A_CAMINHO", passou: false, criadoEm: "2026-11-10T12:00:00Z",
      caso: { id: "ca2", nome: "Nascimento x Prefeitura" }, cliente: { id: "c2", nome: "Eduardo Nascimento" }, contratoId: null, levantamentoId: null },
  ] },
};
const PREVIA_OUT = {
  mes: "2026-10-01", aberto: false, recebimentos: { n: 41, valor: 4382000 }, honorariosTransferidos: { n: 1, valor: 123000 },
  despesas: { n: 31, valor: 4087000 }, recibos: 40, terceiros: { entrou: 630000, repassado: 630000 },
};
const PREVIA_NOV = { ...PREVIA_OUT, mes: "2026-11-01", aberto: true, recibos: 0 };
const DADOS = {
  id: id(90), mes: "2026-10-01", formato: "CSV", escritorio: "Ribeiro & Matos",
  recebimentos: [{ dia: "2026-10-26", cliente: "Farmácia Bom Jesus Ltda.", contrato: "C-2026-004", parcela: "Mensalidade", tipo: "MENSAL", referencia: "2026-10",
    forma: "BOLETO", valor: 180000, multaJuros: 0, recibo: "38/2026" }],
  despesas: [{ dia: "2026-10-05", vencimento: "2026-10-05", descricao: "Aluguel da sala", fornecedor: null, categoria: "ALUGUEL", forma: "PIX",
    valor: 150000, recorrente: true, cliente: null }],
  terceiros: [],
};

const comuns = (escritorio: unknown = ESCRITORIO) => ({
  "/v1/escritorio": { corpo: escritorio },
  "GET /v1/escritorio/financeiro/resumo": { corpo: RESUMO },
  "GET /v1/escritorio/financeiro/caixa": { corpo: CAIXA },
  "GET /v1/escritorio/financeiro/exportacoes/previa?mes=2026-10-01": { corpo: PREVIA_OUT },
  "GET /v1/escritorio/financeiro/exportacoes/previa?mes=2026-11-01": { corpo: PREVIA_NOV },
});
const ehCelular = (page: Page) => (page.viewportSize()?.width ?? 1000) <= 760;

test.describe("Financeiro do Portal, Resumo e Caixa (FI-03, FI-06, FI-09, FI-21, PD-03, PD-06, IN-02 a IN-14)", () => {
  test("Resumo: o mês do escritório ao lado do de terceiros, o vencido com o que fazer, o previsto e o alerta de queda", async ({ page }) => {
    await simular(page, comuns());
    await page.goto(`${P}/financeiro`);
    await expect(page.getByRole("heading", { level: 1, name: "Resumo" })).toBeVisible();
    await expect(page.getByText("Hoje, quarta-feira, 18 de novembro.")).toBeVisible();
    await expect(page.getByText("recebidos de R$ 48.300,00 previstos para o mês (65%)")).toBeVisible();
    const terc = page.getByRole("region", { name: "De terceiros · na conta" });
    await expect(terc).toContainText("R$ 30.284,96");
    await expect(terc).toContainText("Falta repassar a 2 clientes, 1 perito e 1 parceiro, e transferir R$ 6.469,97 de honorários");
    const venc = page.getByRole("region", { name: "Vencido" });
    await expect(venc.getByRole("group", { name: "Vencido por idade do atraso" })).toContainText("3 parcelas");
    await expect(venc).toContainText("Motivo: Está desempregada e pediu para pagar depois do acordo.");
    await expect(venc).toContainText("Próxima ação: 26/11, propor descontar do valor do acordo · Marina Ribeiro");
    await expect(venc).toContainText("74 dias");
    await expect(venc).toContainText("4 parcelas vencidas · todas têm responsável e próxima ação");
    const prev = page.getByRole("region", { name: "Previsto e realizado" });
    await expect(prev).toContainText("Recebido R$ 31.240,00");
    await expect(prev).toContainText("Até 30/11 R$ 4.060,00");
    await expect(prev).toContainText("de R$ 47.200,00 · 95%");
    await expect(prev.getByRole("status")).toContainText("Os honorários de êxito caíram neste mês.");
    await expect(prev.getByRole("status")).toContainText("41% abaixo da média de agosto a outubro (R$ 12.300,00)");
    const prox = page.getByRole("region", { name: "Entra nos próximos 7 dias" });
    await expect(prox).toContainText("Amanhã");
    await expect(prox).toContainText("5 parcelas até 25/11");
    const rep = page.getByRole("region", { name: "Repasses pendentes" });
    await expect(rep).toContainText("De terceiros · não é do escritório");
    await expect(rep).toContainText("Era 17/11");
    await expect(rep).toContainText("Advogado parceiro · RPV de Irene Castro · 20% dos honorários");
    await expect(rep).toContainText("4 repasses a fazer");
    const num = page.getByRole("region", { name: "Novembro em números" });
    await expect(num).toContainText("4 contratos novos");
    await expect(num.getByRole("group", { name: "Recebido por tipo de honorário" })).toContainText("Por ato e consultas");
    await expect(num).toContainText("78%");
    await semViolacoes(page);
  });

  test("Resumo vazio: os três primeiros passos, cada um levando aonde se faz", async ({ page }) => {
    await simular(page, { ...comuns(), "GET /v1/escritorio/financeiro/resumo": { corpo: VAZIO } });
    await page.goto(`${P}/financeiro`);
    await expect(page.getByRole("heading", { name: "O financeiro ainda está vazio" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ir para Contratos" })).toHaveAttribute("href", "/contratos");
    await expect(page.getByRole("link", { name: "Lançar conta" })).toHaveAttribute("href", "/financeiro/a-pagar?lancar=1");
    await expect(page.getByRole("link", { name: "Registrar valor" })).toHaveAttribute("href", "/financeiro/repasses?registrar=1");
    await semViolacoes(page);
  });

  test("Registrar valor, vindo do Resumo, já abre a janela em Repasses", async ({ page }) => {
    await simular(page, {
      ...comuns(),
      "GET /v1/escritorio/financeiro/repasses": { corpo: {
        hoje: HOJE, prazoDias: 3, algum: false, eu: "aa000000-0000-4000-8000-000000000001", podeEditar: true, podemCuidar: [],
        totais: { aRepassar: 0, repassesPendentes: 0, honorarios: 0, casos: 0, atrasados: 0, repassesAtrasados: 0, semMotivo: 0 },
        repassadoMes: { valor: 0, clientes: 0 }, repassados: [], levantamentos: [], casos: [],
        aCaminho: { total: 0, n: 0, naPrevisao: 0, passou: { valor: 0, n: 0 }, itens: [] },
      } },
    });
    await page.goto(`${P}/financeiro/repasses?registrar=1`);
    await expect(page.getByRole("dialog", { name: "Registrar alvará ou RPV" })).toBeVisible();
    await expect(page).toHaveURL(`${P}/financeiro/repasses`);
  });

  test("Caixa: os dois saldos sem somar, o previsto e o realizado mês a mês, o contador e o que está em validação", async ({ page }) => {
    await simular(page, comuns());
    await page.goto(`${P}/financeiro/caixa`);
    await expect(page.getByRole("heading", { level: 1, name: "Caixa" })).toBeVisible();
    const esc = page.getByRole("region", { name: "Do escritório · hoje" });
    await expect(esc).toContainText("R$ 40.310,00");
    await expect(esc).toContainText("fecha novembro em R$ 39.850,00");
    const terc = page.getByRole("region", { name: "De terceiros · hoje" });
    await expect(terc).toContainText("R$ 30.284,96");
    await expect(terc).toContainText("não entra na previsão. É de 2 clientes, 1 perito e 1 parceiro, mais honorários a transferir.");
    const prev = page.getByRole("region", { name: "Previsto e realizado" });
    const meses = prev.getByRole("group", { name: "Entradas do escritório por mês, previstas e realizadas" });
    await expect(meses).toContainText("R$ 39.910,00 realizados");
    await expect(meses).toContainText("Janeiro");
    if (ehCelular(page)) {
      await expect(prev.getByRole("list", { name: "Mês a mês" })).toContainText("R$ 46.900,00 prev.");
    } else {
      const tab = prev.getByRole("table", { name: "Entradas, saídas e saldo por mês" });
      await expect(tab.getByRole("row", { name: /Novembro \(até hoje\)/ })).toContainText("R$ 40.310,00");
      await expect(tab.getByRole("row", { name: /Dezembro \(previsto\)/ })).toContainText("—");
    }
    const cont = page.getByRole("region", { name: "Para o contador" });
    await expect(cont).toContainText("Setembro de 2026");
    await expect(cont).toContainText("Exportado em 05/10");
    await expect(cont).toContainText("Outubro de 2026Pronto para exportar");
    await expect(cont).toContainText("Pronto a partir de 01/12");
    // F3.48: o RPV com data estimada em âmbar no mês dele; o que passou sai da previsão, com aviso.
    await expect(meses).toContainText("dos quais R$ 4.860,00 de RPV");
    await expect(prev).toContainText("RPV ou precatório com data estimada");
    await expect(prev.getByRole("alert").or(prev.getByRole("status")).filter({ hasText: "1 RPV passou da data estimada e saiu da previsão." })).toBeVisible();
    await expect(prev).toContainText("Irene Castro, RPV: R$ 1.890,00 do escritório, era outubro");
    const rpvs = page.getByRole("region", { name: "RPVs e precatórios a caminho" });
    await expect(rpvs).toContainText("Eduardo Nascimento · RPV");
    await expect(rpvs).toContainText("Passou da data estimada");
    await expect(rpvs.getByRole("link", { name: "Ver em Repasses" })).toHaveAttribute("href", "/financeiro/repasses#t-cam");
    await expect(rpvs.getByRole("button", { name: /Mudar a data/ })).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Conferência com o extrato" })).toContainText("Este é o lugar dela.");
    await semViolacoes(page);
  });

  test("Exportar: a janela diz o que vai no arquivo, avisa do mês aberto e salva o .csv com o mês escolhido", async ({ page }) => {
    const pedidos = await simular(page, { ...comuns(), "POST /v1/escritorio/financeiro/exportacoes": { status: 201, corpo: DADOS } });
    await page.goto(`${P}/financeiro/caixa`);
    await page.getByRole("button", { name: "Exportar para o contador" }).click();
    const j = page.getByRole("dialog", { name: "Exportar para o contador" });
    await expect(j.getByLabel("Mês")).toHaveValue("2026-10-01");
    await expect(j).toContainText("42 recebimentos, por tipo de honorário");
    await expect(j).toContainText("R$ 45.050,00");
    await expect(j).toContainText("31 despesas pagas, por categoria");
    await expect(j).toContainText("40 recibos emitidos, com o número na planilha");
    await expect(j).toContainText("R$ 6.300,00 entraram e R$ 6.300,00 foram repassados. Não são receita do escritório.");
    await expect(j.getByRole("button", { name: "Exportar outubro" })).toBeFocused();
    await semViolacoes(page);
    await j.getByLabel("Mês").selectOption("2026-11-01");
    await expect(j.getByRole("status").filter({ hasText: "Novembro ainda não fechou." })).toBeVisible();
    await j.getByLabel("Mês").selectOption("2026-10-01");
    await j.getByRole("radio", { name: /Só a planilha \(\.csv\)/ }).check();
    const baixou = page.waitForEvent("download");
    await j.getByRole("button", { name: "Exportar outubro" }).click();
    const d = await baixou;
    expect(d.suggestedFilename()).toBe("contador-ribeiro-matos-2026-10.csv");
    const texto = readFileSync((await d.path())!, "utf8");
    expect(texto).toContain("Recebimento;26/10/2026;Mensalidade · contrato C-2026-004;Farmácia Bom Jesus Ltda.;Mensal;Boleto;1800,00;Recibo 38/2026");
    expect(pedidos.find((p) => p.metodo === "POST")!.corpo).toEqual({ mes: "2026-10-01", formato: "CSV" });
    await expect(j).toBeHidden();
    await expect(page.getByRole("status").filter({ hasText: "Exportação de outubro de 2026 gerada." })).toBeVisible();
  });

  test("Sem a área Financeiro, o Caixa não abre", async ({ page }) => {
    await simular(page, comuns(SEM_AREA));
    await page.goto(`${P}/financeiro/caixa`);
    await expect(page.getByRole("heading", { name: "Esta área não está liberada para você" })).toBeVisible();
  });
});

// As despesas sem nota na exportação (F3.22, FI-18 e FI-21).
test.describe("Financeiro do Portal, exportação com as notas (FI-18, FI-21)", () => {
  test("A janela lista as despesas sem nota, conta os anexos e marca a falta na planilha", async ({ page }) => {
    await simular(page, {
      ...comuns(), "POST /v1/escritorio/financeiro/exportacoes": { status: 201, corpo: DADOS },
      "GET /v1/escritorio/financeiro/exportacoes/anexos?mes=2026-10-01": { corpo: {
        mes: "2026-10-01",
        semNota: [{ id: "c1", descricao: DADOS.despesas[0]!.descricao, fornecedor: null, dia: DADOS.despesas[0]!.dia, valor: DADOS.despesas[0]!.valor }],
        anexos: [{ id: "a1", categoria: "COMPROVANTE", nome: "x.pdf", tipo: "application/pdf", tamanho: 10, donoId: "p1", enviadoPor: { id: "x", nome: "Marina" }, enviadoEm: "2026-10-05T12:00:00Z" }],
      } },
    });
    await page.goto(`${P}/financeiro/caixa`);
    await page.getByRole("button", { name: "Exportar para o contador" }).click();
    const j = page.getByRole("dialog", { name: "Exportar para o contador" });
    await expect(j).toContainText("1 despesa sem nota fiscal");
    await expect(j).toContainText(`${DADOS.despesas[0]!.descricao}`);
    await expect(j).toContainText("Vão marcadas na planilha.");
    await expect(j).toContainText("1 comprovante, nota ou guia anexado aos lançamentos");
    await semViolacoes(page);
    await j.getByRole("radio", { name: /Só a planilha \(\.csv\)/ }).check();
    const baixou = page.waitForEvent("download");
    await j.getByRole("button", { name: "Exportar outubro" }).click();
    const texto = readFileSync((await (await baixou).path())!, "utf8");
    expect(texto).toContain("Falta a nota");
  });

  // ------------------------------------------------------------------ F3.50 e F3.49

  test("F3.50: o Caixa começa no saldo de abertura, diz para quem vai e quando é o lembrete", async ({ page }) => {
    const caixa = { ...CAIXA, dono: true, lembrete: "2026-12-05",
      abertura: { id: id(80), data: "2026-08-31", valor: 1248000, motivo: null, por: MARINA, em: "2026-09-01T14:02:00Z" },
      contador: { nome: "Paulo Serra", firma: "Contabilidade Silva", email: "contato@exemplo.com.br", mandarAoExportar: true, lembrarDia5: true },
      exportacoes: [{ id: id(81), mes: "2026-10-01", formato: "XLSX", em: "2026-11-05T12:10:00Z", por: MARINA,
        envio: { para: "contato@exemplo.com.br", situacao: "ENVIADO", em: "2026-11-05T12:12:00Z", por: MARINA } }] };
    await simular(page, { ...comuns(), "GET /v1/escritorio/financeiro/caixa": { corpo: caixa } });
    await page.goto(`${P}/financeiro/caixa`);
    const esc = page.getByRole("region", { name: "Do escritório · hoje" });
    await expect(esc).toContainText("Começa no saldo de abertura de R$ 12.480,00, em 31/08/2026.");
    await expect(esc.getByRole("link", { name: "Ver em Escritório" })).toHaveAttribute("href", "/meu-escritorio/financeiro");
    const cont = page.getByRole("region", { name: "Para o contador" });
    await expect(cont).toContainText("Enviado por e-mail em 05/11, às 9h12");
    await expect(cont).toContainText("lembrete no sino em 05/12");
    await expect(cont).toContainText("Paulo Serra · Contabilidade Silva");
    await semViolacoes(page);
  });

  test("F3.50: sem saldo de abertura nem contador, o Caixa avisa e leva a Escritório", async ({ page }) => {
    await simular(page, { ...comuns(), "GET /v1/escritorio/financeiro/caixa": { corpo: { ...CAIXA, dono: true, abertura: null, contador: null, lembrete: null } } });
    await page.goto(`${P}/financeiro/caixa`);
    const esc = page.getByRole("region", { name: "Do escritório · hoje" });
    await expect(esc).toContainText("O saldo começa em R$ 0,00.");
    await expect(esc.getByRole("link", { name: "Lançar o saldo de abertura" })).toHaveAttribute("href", "/meu-escritorio/financeiro");
    await expect(page.getByRole("region", { name: "Para o contador" })).toContainText("Nenhum contador cadastrado.");
    await page.getByRole("button", { name: "Exportar para o contador" }).click();
    const j = page.getByRole("dialog", { name: "Exportar para o contador" });
    await expect(j).toContainText("Sem contador cadastrado: o arquivo só baixa no seu aparelho.");
    await expect(j.getByRole("link", { name: "Cadastrar o contador" })).toBeVisible();
    await semViolacoes(page);
  });

  test("F3.50: exportar e mandar ao contador; o e-mail que não sai é falha parcial, com Mandar de novo", async ({ page }) => {
    const caixa = { ...CAIXA, dono: true, abertura: null, lembrete: null,
      contador: { nome: "Paulo Serra", firma: "Contabilidade Silva", email: "contato@exemplo.com.br", mandarAoExportar: true, lembrarDia5: true } };
    const pedidos = await simular(page, {
      ...comuns(),
      "GET /v1/escritorio/financeiro/caixa": { corpo: caixa },
      "POST /v1/escritorio/financeiro/exportacoes": { status: 201, corpo: { ...DADOS, formato: "XLSX", saldoInicio: 2827000, saldoFim: 3245000 } },
      [`POST /v1/escritorio/financeiro/exportacoes/${id(90)}/enviar`]: [
        { corpo: { para: "contato@exemplo.com.br", situacao: "FALHOU", em: "2026-11-18T13:00:00Z", por: MARINA } },
        { corpo: { para: "contato@exemplo.com.br", situacao: "ENVIADO", em: "2026-11-18T13:01:00Z", por: MARINA } },
      ],
    });
    await page.goto(`${P}/financeiro/caixa`);
    await page.getByRole("button", { name: "Exportar para o contador" }).click();
    const j = page.getByRole("dialog", { name: "Exportar para o contador" });
    await expect(j.getByRole("checkbox", { name: /Mandar por e-mail a Paulo Serra, da Contabilidade Silva/ })).toBeChecked();
    await expect(j).toContainText("Saldo do caixa no começo e no fim do mês");
    const baixou = page.waitForEvent("download");
    await j.getByRole("button", { name: "Exportar e mandar" }).click();
    await baixou;
    await expect(j.getByRole("alert").filter({ hasText: "O arquivo foi gerado, mas o e-mail não saiu." })).toBeVisible();
    await semViolacoes(page);
    const envio = pedidos.find((p) => p.caminho.endsWith("/enviar"))!;
    expect((envio.corpo as { nome: string }).nome).toBe("contador-ribeiro-matos-2026-10.xlsx");
    expect((envio.corpo as { arquivo: string }).arquivo.startsWith("UEsDB")).toBe(true);
    await j.getByRole("button", { name: "Mandar de novo" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Exportação de outubro de 2026 mandada a Paulo Serra." })).toBeVisible();
    expect(pedidos.filter((p) => p.metodo === "POST" && p.caminho === "/v1/escritorio/financeiro/exportacoes")).toHaveLength(1);
  });

  test("F3.49: a meta no alto do Resumo; a dona muda, só em um mês; meses fechados comparados com a meta deles", async ({ page }) => {
    const meta = (valor: number, deMes: string, soMes = false) => ({ valor, deMes, soMes, por: MARINA, em: "2026-11-02T12:00:00Z" });
    const resumo = { ...RESUMO,
      meses: [
        { mes: "2026-08-01", previsto: 4410000, realizado: 4238000, meta: null },
        { mes: "2026-09-01", previsto: 4560000, realizado: 3991000, meta: 4500000 },
        { mes: "2026-10-01", previsto: 4720000, realizado: 4505000, meta: 4500000 },
        { mes: "2026-11-01", previsto: 4830000, realizado: 3124000, meta: 5000000 },
      ],
      meta: { mes: meta(5000000, "2026-11-01"), todoMes: meta(5000000, "2026-11-01"), antes: meta(4500000, "2026-09-01"), umMes: [],
              dono: true, socioDono: MARINA, media3: 4244667 } };
    const pedidos = await simular(page, { ...comuns(), "GET /v1/escritorio/financeiro/resumo": { corpo: resumo },
      "PUT /v1/escritorio/financeiro/meta": { corpo: resumo.meta } });
    await page.goto(`${P}/financeiro`);
    const prev = page.getByRole("region", { name: "Previsto e realizado" });
    await expect(prev).toContainText("Meta de novembro");
    await expect(prev).toContainText("R$ 50.000,00todo mês, desde novembro");
    await expect(prev.getByRole("img", { name: /Recebido R\$ 31\.240,00, 62% da meta de R\$ 50\.000,00/ })).toBeVisible();
    await expect(prev).toContainText("62% da meta. Faltam R$ 18.760,00 em 12 dias.");
    await expect(prev).toContainText("meta R$ 45.000,00 · bateu");
    await expect(prev).toContainText("sem meta");
    await semViolacoes(page);
    await prev.getByRole("button", { name: "Mudar a meta" }).click();
    const j = page.getByRole("dialog", { name: "Meta de receita" });
    await expect(j.getByLabel("Meta de receita do mês")).toBeFocused();
    await j.getByLabel("Meta de receita do mês").fill("0");
    await j.getByRole("button", { name: "Salvar a meta" }).click();
    await expect(j.getByText("Escreva um valor maior que zero.")).toBeVisible();
    await semViolacoes(page);
    await j.getByLabel("Meta de receita do mês").fill("40.000,00");
    await j.getByRole("radio", { name: /Só em um mês/ }).check();
    await j.getByLabel("Qual mês").selectOption("2026-12-01");
    await j.getByRole("button", { name: "Salvar a meta" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Dezembro de 2026 tem a meta de R$ 40.000,00, só esse mês." })).toBeVisible();
    expect(pedidos.find((p) => p.metodo === "PUT")!.corpo).toEqual({ valor: 4000000, mes: "2026-12-01", soMes: true });
  });

  test("F3.49: quem tem o Financeiro sem ser dona vê a meta, sem botão; sem meta, a faixa diz quem define", async ({ page }) => {
    const resumo = { ...RESUMO, meta: { mes: null, todoMes: null, antes: null, umMes: [], dono: false, socioDono: MARINA, media3: 0 } };
    await simular(page, { ...comuns(), "GET /v1/escritorio/financeiro/resumo": { corpo: resumo } });
    await page.goto(`${P}/financeiro`);
    const prev = page.getByRole("region", { name: "Previsto e realizado" });
    await expect(prev).toContainText("Sem meta. Quem define é Marina Ribeiro, a sócia dona.");
    await expect(prev.getByRole("button", { name: /meta/ })).toHaveCount(0);
  });
});
