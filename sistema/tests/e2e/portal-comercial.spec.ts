// Comercial do Portal (telas aprovadas em docs/design/aprovadas/portal-comercial-contratos):
// Atendimentos, Propostas, ficha da proposta com a resposta, nova e editar proposta com as
// condições de honorário, Funil e Origem. A API é simulada; aqui se testa a tela, a
// acessibilidade e o que ela manda ao servidor.
import { expect, test, type Page } from "@playwright/test";
import { semViolacoes } from "./console-dados.ts";

const P = "http://localhost:3000";
const ESC = "e0000000-0000-4000-8000-0000000000a1";
const MARINA = { id: "a0000000-0000-4000-8000-000000000101", nome: "Marina Ribeiro" };
const DIEGO = { id: "a0000000-0000-4000-8000-000000000102", nome: "Diego Almeida" };
const FELIPE = { id: "a0000000-0000-4000-8000-000000000103", nome: "Felipe Matos" };
const cli = (n: number) => `c1000000-0000-4000-8000-0000000001${String(n).padStart(2, "0")}`;
const prop = (n: number) => `d1000000-0000-4000-8000-0000000001${String(n).padStart(2, "0")}`;

const ESCRITORIO = {
  id: ESC, nome: "Ribeiro & Matos", pessoa: "Marina Ribeiro", dono: true, areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"],
  socios: ["Marina Ribeiro"], pessoas: 5, outrosEscritorios: 0, funcoes: ["SOCIO"], cnpj: null, cidade: "São Paulo", uf: "SP", endereco: null,
  contatos: [], ultimaExportacao: null,
};
const DIEGO_ESC = { ...ESCRITORIO, pessoa: "Diego Almeida", dono: false, areas: ["COMERCIAL"], funcoes: ["EQUIPE"] };
const SEM_AREA = { ...ESCRITORIO, pessoa: "Felipe Matos", dono: false, areas: ["JURIDICO"], funcoes: ["EQUIPE"] };

const dia = (n: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(Date.now() + n * 864e5));
const br = (n: number) => dia(n).split("-").reverse().join("/");
const curto = (n: number) => br(n).slice(0, 5);
const em = (n: number, h: string) => `${dia(n)}T${h}:00-03:00`;

const ret = (n: number, nome: string, d: number | null, oque: string | null, resp: typeof MARINA | null, ultimo = true) => ({
  clienteId: cli(n), nome, tipo: "PF", em: d === null ? null : dia(d), oque, responsavel: resp,
  ultimo: ultimo ? { em: em(-6, "10:00"), canal: "TELEFONE", comQuem: "Joana Prado (filha)", resumo: "Conversa" } : null,
});
const RETORNOS = {
  algum: true,
  grupos: {
    vencidos: [ret(1, "Hélio Batista Corrêa", -8, "Pedir o extrato do benefício", DIEGO), ret(2, "Antônia Ferreira Prado", -5, "Ligar para Joana sobre a carta do INSS", DIEGO)],
    hoje: [ret(3, "Gabriela Teixeira", 0, "Responder à contraproposta: ela pediu 5 parcelas", MARINA)],
    semana: [ret(4, "Benedito Souza Lima", 2, "Colher a assinatura do contrato", DIEGO)],
    depois: [ret(5, "Irene Castro", 12, "Avisar sobre a avaliação do imóvel", MARINA)],
    semData: [ret(6, "Eduardo Nascimento", null, null, null)],
  },
  totais: { vencidos: 2, hoje: 1, semana: 1, semData: 1 },
  porResponsavel: [{ pessoa: DIEGO, vencidos: 2, hoje: 0, total: 3 }, { pessoa: MARINA, vencidos: 0, hoje: 1, total: 2 }],
  propostasEsperando: [
    { id: prop(15), numero: "P-2026-015", cliente: "Daniela Rocha Mendes", situacao: "ENVIADA", enviadaEm: em(-8, "10:00"), responsavel: DIEGO, retorno: { em: dia(-1), vencido: true } },
    { id: prop(16), numero: "P-2026-016", cliente: "Gabriela Teixeira", situacao: "NEGOCIACAO", enviadaEm: em(-6, "16:40"), responsavel: MARINA, retorno: { em: dia(0), vencido: false } },
  ],
};

const FIXO = { tipo: "FIXO", valor: 150000, vencimento: dia(20) };
const EXITO = { tipo: "EXITO", percentual: 2000, sobre: "O que o cliente receber (condenação ou acordo)", etapa: "Pagamento da condenação ou do acordo", dias: 15 };
const PARC = { tipo: "PARCELADO", total: 400000, parcelas: 4, primeiro: dia(27) };
const linha = (n: number, nome: string, servico: string, situacao: string, condicoes: unknown[], resp: typeof MARINA, retorno: unknown, extra = {}) => ({
  id: prop(n), numero: `P-2026-0${n}`, cliente: { id: cli(n), nome, tipo: "PF" }, servico, responsavel: resp, situacao, vencida: false, condicoes, retorno,
  criadaEm: em(-7, "10:05"), ...extra,
});
const L16 = linha(16, "Gabriela Teixeira", "Divórcio consensual", "NEGOCIACAO", [PARC], MARINA, { em: dia(0), vencido: false });
const L15 = linha(15, "Daniela Rocha Mendes", "Revisão de contrato bancário", "ENVIADA", [FIXO, EXITO], DIEGO, { em: dia(-1), vencido: true });
const L14 = linha(14, "Benedito Souza Lima", "Aposentadoria por idade", "ACEITA", [PARC, EXITO], DIEGO, { em: dia(2), vencido: false });
const L17 = linha(17, "Marcos Vinícius Duarte", "Trabalhista · vínculo com aplicativo", "RASCUNHO", [FIXO], MARINA, null, { criadaEm: new Date().toISOString() });
const LISTA = { algum: true, contagem: { andamento: 4, contrato: 0, recusadas: 1 }, propostas: [L17, L16, L15, L14] };

const ficha = (l: typeof L16, extra: Record<string, unknown> = {}) => ({
  ...l, escopo: "Petição de divórcio consensual com partilha de um apartamento.\nCustas e taxas de cartório ficam por conta da cliente.", validaAte: dia(12), enviadaEm: em(-6, "16:40"),
  respondidaEm: null, motivoRecusa: null, origem: "INDICACAO_CLIENTE", versao: 3,
  retornoCompleto: l.retorno ? { ...(l.retorno as object), oque: "Responder à contraproposta: ela pediu 5 parcelas", responsavel: l.responsavel } : null,
  podeContrato: true, quemTemContratos: ["Marina Ribeiro", "Felipe Matos"], contratoPedidoEm: null,
  historico: [
    { em: em(0, "09:12"), acao: "proposta.resposta", autor: "Marina Ribeiro", dados: { resposta: "MUDANCA", em: dia(0), canal: "WHATSAPP", motivo: null, observacao: "Gabriela pediu 5 parcelas no lugar de 4." } },
    { em: em(0, "09:12"), acao: "estado.mudou", autor: "Marina Ribeiro", dados: { de: "ENVIADA", para: "NEGOCIACAO" } },
    { em: em(-6, "16:40"), acao: "estado.mudou", autor: "Marina Ribeiro", dados: { de: "RASCUNHO", para: "ENVIADA" } },
    { em: em(-7, "10:05"), acao: "proposta.criada", autor: "Marina Ribeiro", dados: { numero: "P-2026-016", rascunho: false } },
    { em: em(-7, "10:05"), acao: "estado.mudou", autor: "Marina Ribeiro", dados: { para: "RASCUNHO" } },
  ],
  ...extra,
});
const F16 = ficha(L16);
const F14 = ficha(L14, { respondidaEm: dia(-1), retornoCompleto: { em: dia(2), vencido: false, oque: "Colher a assinatura do contrato", responsavel: DIEGO } });
const F17 = ficha(L17, { enviadaEm: null, escopo: "Ação na Justiça do Trabalho.", historico: [{ em: em(0, "08:00"), acao: "proposta.criada", autor: "Marina Ribeiro", dados: { rascunho: true } }] });

const CLIENTES = {
  comercial: true,
  clientes: [
    { id: cli(17), tipo: "PF", nome: "Marcos Vinícius Duarte", situacao: "ATIVO", versao: 1, contatoPrincipal: null, origem: "INDICACAO_CLIENTE" },
    { id: cli(16), tipo: "PF", nome: "Gabriela Teixeira", situacao: "ATIVO", versao: 1, contatoPrincipal: null, origem: "GOOGLE" },
  ],
};

const FUNIL = {
  de: dia(-90), ate: dia(0), primeiros: 24, comProposta: 14, contratos: 9,
  semProposta: { naoPegou: 5, naoVoltou: 3, emAtendimento: 2 },
  depoisProposta: { andamento: 4, recusadas: [{ motivo: "OUTRO_ESCRITORIO", n: 1 }] },
  agora: {
    primeiro: [{ clienteId: cli(17), nome: "Marcos Vinícius Duarte", detalhe: "Proposta em rascunho · Marina", rascunho: true, semRetorno: false },
      { clienteId: cli(6), nome: "Eduardo Nascimento", detalhe: "Atendido em 04/11", rascunho: false, semRetorno: true }],
    enviada: [{ id: prop(15), numero: "P-2026-015", clienteId: cli(15), nome: "Daniela Rocha Mendes", retorno: { em: dia(-1), vencido: true }, valorCerto: 150000, condicoes: [FIXO, EXITO] }],
    negociacao: [{ id: prop(16), numero: "P-2026-016", clienteId: cli(16), nome: "Gabriela Teixeira", retorno: { em: dia(0), vencido: false }, valorCerto: 400000, condicoes: [PARC] }],
    aceita: [{ id: prop(14), numero: "P-2026-014", clienteId: cli(14), nome: "Benedito Souza Lima", retorno: null, valorCerto: 400000, condicoes: [PARC, EXITO] }],
  },
};
const ORIGEM = {
  de: dia(-90), ate: dia(0), total: 24,
  linhas: [
    { origem: "INDICACAO_CLIENTE", contatos: 9, propostas: 5, contratos: 4, valorCerto: 2130000 },
    { origem: "GOOGLE", contatos: 6, propostas: 3, contratos: 2, valorCerto: 780000 },
    { origem: "INSTAGRAM", contatos: 3, propostas: 2, contratos: 0, valorCerto: 0 },
  ],
  indicacoes: [{ nome: "Rosa Almeida", n: 3 }, { nome: "Paulo Serra", n: 2 }, { nome: "João Lima", n: 1 }, { nome: "Ana Dias", n: 1 }],
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
  "GET /v1/escritorio/clientes": { corpo: CLIENTES },
  "GET /v1/escritorio/comercial/retornos": { corpo: RETORNOS },
  "GET /v1/escritorio/propostas": { corpo: LISTA },
  [`GET /v1/escritorio/propostas/${prop(16)}`]: { corpo: F16 },
  [`GET /v1/escritorio/propostas/${prop(14)}`]: { corpo: F14 },
  [`GET /v1/escritorio/propostas/${prop(17)}`]: { corpo: F17 },
  "GET /v1/escritorio/comercial/funil": { corpo: FUNIL },
  "GET /v1/escritorio/comercial/origem": { corpo: ORIGEM },
});

test.describe("Comercial do Portal (AP-02 a AP-06, PD-02)", () => {
  test("Atendimentos: retornos do escritório por data, filtro por responsável e propostas esperando", async ({ page }) => {
    const pedidos = await simular(page, comuns());
    await page.goto(`${P}/comercial`);
    await expect(page.getByRole("heading", { level: 1, name: "Atendimentos" })).toBeVisible();
    const resumo = page.getByRole("navigation", { name: "Resumo dos retornos" });
    await expect(resumo).toContainText("Vencidos");
    await expect(resumo).toContainText("de 5 a 8 dias");
    await expect(resumo).toContainText("com Marina");
    await expect(page.locator("#g-vencidos")).toContainText("Hélio Batista Corrêa");
    await expect(page.locator("#g-vencidos")).toContainText("vencido há 8 dias");
    await expect(page.locator("#g-hoje")).toContainText("Responder à contraproposta");
    await expect(page.locator("#g-sem")).toContainText("Ninguém marcou quando falar de novo.");
    await expect(page.getByRole("link", { name: "Abrir a ficha de Gabriela Teixeira" })).toHaveAttribute("href", `/clientes/${cli(3)}?aba=atendimentos`);
    await expect(page.getByRole("button", { name: "Todos (6)" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("link", { name: "P-2026-015 · Daniela Rocha Mendes" })).toBeVisible();
    await expect(page.locator(".cm-prop")).toContainText("retorno vencido ontem");
    await expect(page.locator(".cm-resp")).toContainText("2 vencidos");
    await semViolacoes(page);

    await page.getByRole("button", { name: "Diego (3)" }).click();
    await expect.poll(() => pedidos.some((p) => p.caminho === "/v1/escritorio/comercial/retornos" && p.busca === `?responsavel=${DIEGO.id}`)).toBe(true);

    await page.getByLabel("Buscar cliente").fill("irene");
    await expect(page.locator("#g-depois")).toContainText("Irene Castro");
    await expect(page.locator("#g-vencidos")).toHaveCount(0);
  });

  test("Atendimentos sem retorno marcado leva a Clientes", async ({ page }) => {
    await simular(page, { ...comuns(), "GET /v1/escritorio/comercial/retornos": { corpo: { ...RETORNOS, algum: false, grupos: { vencidos: [], hoje: [], semana: [], depois: [], semData: [] }, porResponsavel: [], propostasEsperando: [] } } });
    await page.goto(`${P}/comercial/atendimentos`);
    await expect(page.getByRole("heading", { name: "Nenhum retorno marcado ainda" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Abrir Clientes" })).toHaveAttribute("href", "/clientes");
    await semViolacoes(page);
  });

  test("Propostas: lista com honorários, retorno e situação; filtro e busca vão ao servidor", async ({ page }) => {
    const pedidos = await simular(page, comuns());
    await page.goto(`${P}/comercial/propostas`);
    await expect(page.getByRole("heading", { level: 1, name: "Propostas" })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "propostas em andamento" })).toContainText("4 propostas em andamento · 1 com o retorno vencido · 1 aceita esperando o contrato");
    const linha15 = page.getByRole("row").filter({ hasText: "Daniela Rocha Mendes" });
    await expect(linha15).toContainText("P-2026-015 · Revisão de contrato bancário");
    await expect(linha15).toContainText("Fixo R$ 1.500,00");
    await expect(linha15).toContainText("Êxito em percentual 20%");
    await expect(linha15).toContainText("vencido ontem");
    await expect(page.getByRole("row").filter({ hasText: "Marcos Vinícius" })).toContainText("criada hoje");
    await expect(page.getByRole("row").filter({ hasText: "Benedito" })).toContainText("Aceita");
    await semViolacoes(page);

    await page.getByRole("button", { name: "Recusadas (1)" }).click();
    await expect.poll(() => pedidos.some((p) => p.busca === "?mostrar=RECUSADAS")).toBe(true);
    await page.getByLabel("Buscar por cliente ou número").fill("P-2026");
    await expect.poll(() => pedidos.some((p) => p.busca === "?mostrar=RECUSADAS&q=P-2026")).toBe(true);
  });

  test("Propostas no primeiro uso chama para escrever a primeira", async ({ page }) => {
    await simular(page, { ...comuns(), "GET /v1/escritorio/propostas": { corpo: { algum: false, contagem: { andamento: 0, contrato: 0, recusadas: 0 }, propostas: [] } } });
    await page.goto(`${P}/comercial/propostas`);
    await expect(page.getByRole("heading", { name: "Nenhuma proposta ainda" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Escrever a primeira proposta" })).toHaveAttribute("href", "/comercial/propostas/nova");
  });

  test("Ficha da proposta: retorno no âmbar, condições com o que geram e histórico; recusa pede o motivo", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(),
      [`GET /v1/escritorio/propostas/${prop(16)}`]: [{ corpo: F16 }, { corpo: { ...F16, situacao: "RECUSADA", motivoRecusa: "VALOR_ALTO", respondidaEm: dia(0), retornoCompleto: null } }],
      [`POST /v1/escritorio/propostas/${prop(16)}/resposta`]: { corpo: { id: prop(16), versao: 4, situacao: "RECUSADA" } },
    });
    await page.goto(`${P}/comercial/propostas/${prop(16)}`);
    await expect(page.getByRole("heading", { level: 1, name: "Divórcio consensual" })).toBeVisible();
    await expect(page.locator(".ficha-cab .meta")).toContainText("Em negociação");
    await expect(page.locator(".ficha-cab .meta")).toContainText("para Gabriela Teixeira");
    await expect(page.locator(".ficha-cab .meta")).toContainText("R$ 4.000,00");
    await expect(page.locator(".dir")).toContainText("Responder à contraproposta");
    await expect(page.locator(".hn-lista")).toContainText("em 4 parcelas de R$ 1.000,00");
    await expect(page.locator(".hn-lista")).toContainText("Vira 4 recebimentos programados, quando o contrato for assinado.");
    await expect(page.getByRole("region", { name: "Histórico da proposta" })).toContainText("registrou a resposta: pediu mudança");
    await expect(page.getByRole("region", { name: "Histórico da proposta" })).toContainText("marcou como enviada");
    await expect(page.getByRole("region", { name: "Histórico da proposta" }).getByText("escreveu a proposta")).toBeVisible();
    await semViolacoes(page);

    await page.getByRole("button", { name: "Registrar resposta" }).click();
    const j = page.getByRole("dialog", { name: "Registrar resposta" });
    await expect(j.getByLabel("Data da resposta")).toHaveValue(br(0));
    await j.getByRole("radio", { name: /^Recusou/ }).check();
    await j.getByRole("button", { name: "Registrar a recusa" }).click();
    await expect(j.getByText("Falta acertar 1 ponto, marcado abaixo.")).toBeVisible();
    await expect(j.getByLabel("Motivo da recusa")).toHaveAttribute("aria-invalid", "true");
    await expect(j.getByLabel("Motivo da recusa")).toBeFocused();
    await semViolacoes(page);
    await j.getByLabel("Motivo da recusa").selectOption({ label: "Achou o valor alto" });
    await j.getByLabel("Observação").fill("Vai pensar até o fim do ano.");
    await j.getByRole("button", { name: "Registrar a recusa" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Recusa registrada" })).toBeVisible();
    const envio = pedidos.find((p) => p.metodo === "POST" && p.caminho.endsWith("/resposta"));
    expect(envio?.corpo).toEqual({ versao: 3, resposta: "RECUSOU", em: dia(0), canal: "WHATSAPP", motivo: "VALOR_ALTO", observacao: "Vai pensar até o fim do ano." });
    await expect(page.locator(".dir")).toContainText("Achou o valor alto.");
  });

  test("AP-05: Baixar a proposta (.docx) pede o arquivo no timbrado e abre o link temporário", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(),
      [`GET /v1/escritorio/propostas/${prop(16)}`]: { corpo: F16 },
      [`POST /v1/escritorio/propostas/${prop(16)}/docx`]: { corpo: { url: `${P}/arquivo-falso.docx`, validadeSegundos: 60 } },
    });
    await page.route(`${P}/arquivo-falso.docx`, (r) => r.fulfill({ status: 200, contentType: "text/plain", body: "ok" }));
    await page.goto(`${P}/comercial/propostas/${prop(16)}`);
    const botao = page.getByRole("button", { name: "Baixar a proposta (.docx)" });
    await expect(botao).toBeVisible();
    await semViolacoes(page);
    await botao.click();
    await expect.poll(() => pedidos.some((p) => p.metodo === "POST" && p.caminho === `/v1/escritorio/propostas/${prop(16)}/docx`)).toBe(true);
  });

  test("Aceitou com as condições leva a gerar o contrato; desmarcado, leva a editar", async ({ page }) => {
    const pedidos = await simular(page, { ...comuns(), [`POST /v1/escritorio/propostas/${prop(16)}/resposta`]: { corpo: { id: prop(16), versao: 4, situacao: "ACEITA" } } });
    await page.goto(`${P}/comercial/propostas/${prop(16)}`);
    await page.getByRole("button", { name: "Registrar resposta" }).click();
    const j = page.getByRole("dialog", { name: "Registrar resposta" });
    await j.getByLabel("Aceitou com as condições da proposta").uncheck();
    await expect(j.getByRole("button", { name: "Editar a proposta antes" })).toBeVisible();
    await j.getByLabel("Aceitou com as condições da proposta").check();
    await j.getByLabel("Por onde").selectOption({ label: "Presencial" });
    await j.getByRole("button", { name: "Registrar e gerar o contrato" }).click();
    await page.waitForURL(`**/contratos/contratos/novo?proposta=${prop(16)}`);
    expect(pedidos.find((p) => p.caminho.endsWith("/resposta"))?.corpo).toMatchObject({ resposta: "ACEITOU", canal: "PRESENCIAL", motivo: null });
  });

  test("Quem não tem Contratos vê a proposta aceita e pede o contrato", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(DIEGO_ESC),
      [`GET /v1/escritorio/propostas/${prop(14)}`]: [{ corpo: { ...F14, podeContrato: false } }, { corpo: { ...F14, podeContrato: false, contratoPedidoEm: new Date().toISOString() } }],
      [`POST /v1/escritorio/propostas/${prop(14)}/pedir-contrato`]: { status: 204, corpo: null },
    });
    await page.goto(`${P}/comercial/propostas/${prop(14)}`);
    await expect(page.locator(".dir")).toContainText("Falta o contrato");
    await expect(page.locator(".dir")).toContainText("Marina Ribeiro e Felipe Matos");
    await expect(page.getByText("Você vê a proposta, mas não cria o contrato.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Gerar o contrato" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Editar a proposta" })).toHaveCount(0);
    await semViolacoes(page);
    await page.getByRole("button", { name: "Pedir o contrato" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Contrato pedido" })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "Marina Ribeiro e Felipe Matos receberam o aviso" })).toBeVisible();
    await expect(page.locator(".dir")).toContainText("Você pediu hoje, às");
    await expect(page.locator(".dir")).toContainText("Marina Ribeiro e Felipe Matos receberam o aviso no sino. Quando o contrato for gerado, você também recebe um aviso.");
    await expect(page.locator(".dir .pc-pedido")).toContainText("Contrato pedido");
    await expect(page.getByRole("button", { name: "Pedir o contrato" })).toHaveCount(0);
    expect(pedidos.some((p) => p.metodo === "POST" && p.caminho.endsWith("/pedir-contrato"))).toBe(true);
  });

  test("Quem tem Contratos gera o contrato da proposta aceita", async ({ page }) => {
    await simular(page, comuns());
    await page.goto(`${P}/comercial/propostas/${prop(14)}`);
    await expect(page.getByRole("link", { name: "Gerar o contrato" })).toHaveAttribute("href", `/contratos/contratos/novo?proposta=${prop(14)}`);
    await expect(page.locator(".dir")).toContainText(`Colher a assinatura do contrato em ${curto(2)}, com Diego Almeida.`);
  });

  test("Rascunho: marcar como enviada; incompleta diz o que falta", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(),
      [`POST /v1/escritorio/propostas/${prop(17)}/enviada`]: [
        { status: 422, corpo: { erro: { codigo: "VALIDATION_ERROR", detalhes: { motivo: "PROPOSTA_INCOMPLETA" } } } },
        { corpo: 4 },
      ],
    });
    await page.goto(`${P}/comercial/propostas/${prop(17)}`);
    await expect(page.locator(".dir")).toContainText("Falta enviar");
    await page.getByRole("button", { name: "Marcar como enviada" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Não deu para concluir." })).toContainText("falta o que está incluído, as condições ou o retorno");
    await page.getByRole("button", { name: "Marcar como enviada" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Proposta marcada como enviada" })).toBeVisible();
    expect(pedidos.filter((p) => p.caminho.endsWith("/enviada")).at(-1)?.corpo).toEqual({ versao: 3 });
  });

  test("Nova proposta: cliente da lista, tipos marcados abrem blocos com o que geram, erros do servidor presos ao campo", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(),
      "POST /v1/escritorio/propostas": [
        { status: 422, corpo: { erro: { codigo: "VALIDATION_ERROR", detalhes: { campos: ["c2.etapa", "retorno.em"] } } } },
        { corpo: { id: prop(18), numero: "P-2026-018", versao: 1 } },
      ],
      [`GET /v1/escritorio/propostas/${prop(18)}`]: { corpo: { ...F17, id: prop(18), numero: "P-2026-018" } },
    });
    await page.goto(`${P}/comercial/propostas/nova?cliente=${cli(17)}`);
    await expect(page.getByRole("heading", { level: 1, name: "Nova proposta" })).toBeVisible();
    await expect(page.getByRole("group", { name: "Cliente" })).toContainText("Marcos Vinícius Duarte");
    await expect(page.getByRole("group", { name: "Cliente" })).toContainText("origem: Indicação de cliente");
    await page.getByLabel("Serviço").fill("Reclamação trabalhista · vínculo com aplicativo");
    await expect(page.getByLabel("Responsável", { exact: true })).toHaveValue(MARINA.id);
    await page.getByLabel("O que está incluído").fill("Ação na Justiça do Trabalho até o pagamento ou acordo.");
    const tipos = page.getByRole("group", { name: /Tipos de honorário/ });
    await tipos.getByText("Fixo", { exact: true }).click();
    await tipos.getByText("Êxito em percentual", { exact: true }).click();
    await expect(tipos).toContainText("2 marcados");
    const fixo = page.getByRole("group", { name: "Condição 1: Fixo" });
    await fixo.getByLabel("Valor").fill("500,00");
    await fixo.getByLabel("Vencimento").fill(br(20));
    await expect(fixo).toContainText(`Gera: R$ 500,00 a receber em ${br(20)}.`);
    const exito = page.getByRole("group", { name: "Condição 2: Êxito em percentual" });
    await exito.getByLabel("Percentual").fill("30");
    await page.getByLabel("Retorno", { exact: true }).fill(br(-3));
    await semViolacoes(page);

    await page.getByRole("button", { name: "Salvar proposta" }).click();
    const resumo = page.getByRole("alert").filter({ hasText: "Falta acertar 2 pontos" });
    await expect(resumo).toBeVisible();
    await expect(exito).toContainText("1 ponto para acertar");
    await expect(exito.getByLabel("Vira cobrança quando o caso chegar a")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByLabel("Retorno", { exact: true })).toHaveAttribute("aria-invalid", "true");
    await resumo.getByRole("link", { name: /Condição 2/ }).click();
    await expect(exito.getByLabel("Vira cobrança quando o caso chegar a")).toBeFocused();
    await semViolacoes(page);

    await exito.getByLabel("Vira cobrança quando o caso chegar a").selectOption("Sentença");
    await page.getByLabel("Retorno", { exact: true }).fill(br(7));
    await page.getByRole("button", { name: "Salvar proposta" }).click();
    await page.waitForURL(`**/comercial/propostas/${prop(18)}`);
    await expect(page.getByRole("status").filter({ hasText: "Proposta salva" })).toBeVisible();
    const corpo = pedidos.filter((p) => p.metodo === "POST" && p.caminho === "/v1/escritorio/propostas").at(-1)?.corpo;
    expect(corpo).toEqual({
      clienteId: cli(17), servico: "Reclamação trabalhista · vínculo com aplicativo", escopo: "Ação na Justiça do Trabalho até o pagamento ou acordo.",
      responsavelId: MARINA.id, validaAte: null,
      condicoes: [{ tipo: "FIXO", valor: 50000, vencimento: dia(20) }, { tipo: "EXITO", percentual: 3000, sobre: "O que o cliente receber (condenação ou acordo)", etapa: "Sentença", dias: 15 }],
      retorno: { em: dia(7), responsavelId: MARINA.id, oque: null }, rascunho: false,
    });
  });

  test("Tirar um tipo já preenchido pede confirmação; rascunho sem cliente diz o que falta", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(),
      "POST /v1/escritorio/propostas": { status: 422, corpo: { erro: { codigo: "VALIDATION_ERROR", detalhes: { campos: ["clienteId", "servico"] } } } },
    });
    await page.goto(`${P}/comercial/propostas/nova`);
    const tipos = page.getByRole("group", { name: /Tipos de honorário/ });
    await tipos.getByText("Mensal", { exact: true }).click();
    await page.getByRole("group", { name: "Condição 1: Mensal" }).getByLabel("Valor por mês").fill("2.500,00");
    await tipos.getByText("Mensal", { exact: true }).click();
    const conf = page.getByRole("alertdialog", { name: "Tirar a condição Mensal?" });
    await expect(conf).toBeVisible();
    await conf.getByRole("button", { name: "Manter" }).click();
    await expect(page.getByRole("group", { name: "Condição 1: Mensal" }).getByLabel("Valor por mês")).toHaveValue("2.500,00");
    await tipos.getByText("Mensal", { exact: true }).click();
    await conf.getByRole("button", { name: "Tirar a condição" }).click();
    await expect(page.getByRole("group", { name: "Condição 1: Mensal" })).toHaveCount(0);

    await page.getByRole("button", { name: "Salvar rascunho" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Falta acertar 2 pontos" })).toBeVisible();
    await expect(page.getByLabel("Cliente", { exact: true })).toHaveAttribute("aria-invalid", "true");
    expect(pedidos.find((p) => p.metodo === "POST")?.corpo).toMatchObject({ rascunho: true, retorno: null, condicoes: [] });
  });

  test("Editar a proposta vem preenchida e salva com a versão lida", async ({ page }) => {
    const pedidos = await simular(page, { ...comuns(), [`PUT /v1/escritorio/propostas/${prop(16)}`]: { corpo: { id: prop(16), versao: 4 } } });
    await page.goto(`${P}/comercial/propostas/${prop(16)}/editar`);
    await expect(page.getByRole("heading", { level: 1, name: "Editar proposta" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Trocar cliente" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Salvar rascunho" })).toHaveCount(0);
    const parc = page.getByRole("group", { name: "Condição 1: Parcelado" });
    await expect(parc.getByLabel("Valor total")).toHaveValue("4.000,00");
    await parc.getByLabel("Parcelas").fill("5");
    await expect(parc).toContainText("5 parcelas de R$ 800,00");
    await page.getByRole("button", { name: "Salvar as mudanças" }).click();
    await page.waitForURL(`**/comercial/propostas/${prop(16)}`);
    const corpo = pedidos.find((p) => p.metodo === "PUT")?.corpo as Record<string, unknown>;
    expect(corpo).toMatchObject({ versao: 3, condicoes: [{ tipo: "PARCELADO", total: 400000, parcelas: 5, primeiro: dia(27) }], retorno: { em: dia(0), responsavelId: MARINA.id } });
  });

  test("Funil: faixas que estreitam, quem ficou de fora e agora no funil; período vai ao servidor", async ({ page }) => {
    const pedidos = await simular(page, comuns());
    await page.goto(`${P}/comercial/funil`);
    await expect(page.getByRole("heading", { level: 1, name: "Funil" })).toBeVisible();
    const f = page.locator(".cm-f");
    await expect(f).toContainText("24");
    await expect(f).toContainText("58% passam");
    await expect(f).toContainText("10 não receberam proposta");
    await expect(f).toContainText("o escritório não pegou o caso");
    await expect(f).toContainText("fechou com outro escritório");
    await expect(page.locator(".cm-f-total")).toContainText("38% dos primeiros contatos viraram contrato no período.");
    await expect(page.locator(".cm-colunas")).toContainText("Sem retorno marcado");
    await expect(page.getByRole("link", { name: "Daniela Rocha Mendes" })).toHaveAttribute("href", `/comercial/propostas/${prop(15)}`);
    await expect(page.getByRole("complementary", { name: "Regra da OAB" })).toContainText("Provimento 205/2021");
    await semViolacoes(page);
    await page.getByRole("button", { name: "12 meses" }).click();
    await expect.poll(() => pedidos.some((p) => p.caminho === "/v1/escritorio/comercial/funil" && p.busca === "?periodo=12")).toBe(true);
  });

  test("Origem dos contatos: por origem, poucos dados e quem mais indicou", async ({ page }) => {
    await simular(page, comuns());
    await page.goto(`${P}/comercial/origem`);
    await expect(page.getByRole("heading", { level: 1, name: "Origem dos contatos" })).toBeVisible();
    const ind = page.getByRole("row").filter({ hasText: "Indicação de cliente" });
    await expect(ind).toContainText("44%");
    await expect(ind).toContainText("R$ 21.300,00");
    await expect(page.getByRole("row").filter({ hasText: "Instagram" })).toContainText("poucos dados");
    await expect(page.locator(".cm-motivos")).toContainText("Outras 2 pessoas");
    await semViolacoes(page);
  });

  test("Quem não tem a área Comercial vê quem libera", async ({ page }) => {
    await simular(page, comuns(SEM_AREA));
    await page.goto(`${P}/comercial/propostas`);
    await expect(page.getByRole("heading", { name: "Esta área não está liberada para você" })).toBeVisible();
    await expect(page.getByText("Quem libera as áreas é Marina Ribeiro, sócio dono.")).toBeVisible();
  });
});
