// Financeiro do Portal, Repasses (telas aprovadas em docs/design/aprovadas/portal-financeiro,
// estados repasses, registrar-rpv, repasse e prestacao): os números do alto, um bloco por valor
// de terceiros com a situação de cada parte, a janela de registrar com a divisão proposta pelo
// contrato, feito e dispensar com motivo, a prestação de contas e a ficha do repasse. A API é
// simulada; aqui se testa a tela, a acessibilidade e o que ela manda.
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

const dia = (n: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(Date.now() + n * 864e5));
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
};
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
      divisao: [
        { para: "CLIENTE", valor: 800000 },
        { para: "HONORARIOS", nome: "Honorários de êxito", regra: PROPOSTA.linhas[0]!.regra, valor: 381000, contaId: null },
        { para: "REEMBOLSO", nome: "Reembolso: Custas recursais", regra: PROPOSTA.linhas[1]!.regra, valor: 48500, contaId: PROPOSTA.linhas[1]!.contaId },
        { para: "PERITO", nome: "Dr. Rui Tavares", regra: null, valor: 40500, contaId: null },
      ],
    });
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
    await expect(j).toContainText("Olá, Benedito. Aqui é o escritório Ribeiro & Matos. O seu RPV foi pago");
    await expect(j.getByRole("table", { name: "A conta da prestação de contas" })).toContainText("Fica para você");
    await expect(j.getByRole("table", { name: "A conta da prestação de contas" })).toContainText("R$ 14.242,59");
    await expect(j).toContainText("(11) 97456-1180");
    await expect(j.getByRole("link", { name: "Abrir no WhatsApp" })).toHaveAttribute("href", /^https:\/\/wa\.me\/5511974561180\?text=Ol%C3%A1%2C%20Benedito/);
    await semViolacoes(page);
    await j.getByRole("button", { name: "Marcar como enviada" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Prestação de contas marcada como enviada." })).toBeVisible();
    expect(pedidos.some((p) => p.caminho.endsWith("/prestacao") && p.metodo === "POST")).toBe(true);
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

  test("F3.71: os repasses de cada um, e trocar quem cuida (só quem tem o Financeiro; o motivo vai junto)", async ({ page }) => {
    const LEV2 = { ...LEV, id: id(5), cliente: { ...BEN, id: "be000000-0000-4000-8000-000000000002", nome: "Irene Castro" }, responsavel: BIANCA };
    const trocado = { ...FICHA, responsavel: DIEGO, historico: [
      { acao: "financeiro.repasse_responsavel", em: new Date().toISOString(), por: MARINA, dados: { de: MARINA.id, para: DIEGO.id, motivo: "Bianca está de férias até 30/11." } },
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
      oQue: "Cobrar a nota por e-mail", em: new Date().toISOString(), por: MARINA } };
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

  test("Sem a área Financeiro, Repasses não abre", async ({ page }) => {
    await simular(page, comuns(SEM_AREA));
    await page.goto(`${P}/financeiro/repasses`);
    await expect(page.getByRole("heading", { name: "Esta área não está liberada para você" })).toBeVisible();
  });
});
