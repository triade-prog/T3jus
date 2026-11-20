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

async function simular(page: Page, rotas: Record<string, Resp>) {
  const pedidos: Pedido[] = [];
  await page.route("**/api/v1/**", async (rota) => {
    const url = new URL(rota.request().url());
    const caminho = url.pathname.replace(/^\/api/, "");
    const metodo = rota.request().method();
    pedidos.push({ metodo, caminho, busca: url.search, corpo: rota.request().postDataJSON() });
    const x = rotas[`${metodo} ${caminho}${url.search}`] ?? rotas[`${metodo} ${caminho}`] ?? rotas[caminho] ?? { status: 404, corpo: { erro: { codigo: "NOT_FOUND" } } };
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
    { mes: "2027-01-01", entradasPrevistas: 4966000, entradasRealizadas: null, saidasPrevistas: 4130000, saidasRealizadas: null, saldo: 4851000 },
    { mes: "2027-02-01", entradasPrevistas: 4520000, entradasRealizadas: null, saidasPrevistas: 4130000, saidasRealizadas: null, saldo: 5241000 },
  ],
  exportacoes: [{ mes: "2026-09-01", formato: "XLSX", em: "2026-10-05T14:00:00Z", por: MARINA }],
  mesesExportar: ["2026-11-01", "2026-10-01", "2026-09-01"],
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
        hoje: HOJE, prazoDias: 3, algum: false, totais: { aRepassar: 0, repassesPendentes: 0, honorarios: 0, casos: 0 },
        repassadoMes: { valor: 0, clientes: 0 }, repassados: [], levantamentos: [], casos: [],
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
    await expect(page.getByRole("region", { name: "RPVs e precatórios a caminho" })).toContainText("ainda está em validação com os pilotos");
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
