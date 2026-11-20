// O sino de avisos (F3.57) e o "não receber avisos" na ficha do cliente (F3.63). Telas aprovadas
// em docs/design/aprovadas/portal-sem-avisos-sino. A API é simulada; aqui se testa a tela, a
// acessibilidade e o que ela manda ao servidor.
import { expect, test, type Page } from "@playwright/test";
import { h, semViolacoes } from "./console-dados.ts";

const P = "http://localhost:3000";
const ESC = "e0000000-0000-4000-8000-0000000000a1";
const CLI = "c1000000-0000-4000-8000-000000000101";
const JOANA = "d1000000-0000-4000-8000-000000000101";
const SONIA = "d1000000-0000-4000-8000-000000000102";
const MARINA = { id: "a0000000-0000-4000-8000-000000000101", nome: "Marina Ribeiro" };
const DIEGO = { id: "a0000000-0000-4000-8000-000000000103", nome: "Diego Almeida" };

const ESCRITORIO = {
  id: ESC, nome: "Ribeiro & Matos", pessoa: "Marina Ribeiro", dono: true, areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"],
  socios: ["Marina Ribeiro"], pessoas: 5, outrosEscritorios: 0, funcoes: ["SOCIO"], cnpj: null, cidade: "São Paulo", uf: "SP", endereco: null,
  contatos: [], ultimaExportacao: null,
};
const LARISSA = { ...ESCRITORIO, pessoa: "Larissa Costa", dono: false, areas: ["JURIDICO"], funcoes: ["EQUIPE"] };
const hojeBr = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(new Date());
const amanhaBr = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(new Date(Date.now() + 864e5));
const hojeIso = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

const FICHA = {
  id: CLI, tipo: "PF", nome: "Antônia Ferreira Prado", documento: "52998224725", nacionalidade: "brasileira", estadoCivil: "VIUVO", profissao: "aposentada",
  rg: "123", rgOrgao: "SSP", cep: "04117030", endereco: "Rua das Acácias, 418", bairro: "Vila Mariana", cidade: "São Paulo", uf: "SP",
  repNome: null, repCargo: null, repDocumento: null, repEstadoCivil: null, repProfissao: null, situacao: "ATIVO", inativadoEm: null,
  motivoInativacao: null, inativadoPor: null, criadoEm: h(24 * 22), criadoPor: { id: "x", nome: "Paula Nunes" }, versao: 3, comercial: false,
  podeInativar: false, faltando: [], alterado: null,
  contatos: [
    { id: JOANA, nome: "Joana Prado", papel: "Filha", telefone: "+5511991234567", email: null, principal: true },
    { id: SONIA, nome: "Sônia Martins", papel: "Vizinha", telefone: "+5511991234568", email: null, principal: false },
  ],
};
const PEDIDO = {
  id: "f0000000-0000-4000-8000-000000000001", tipo: "COBRANCA", origem: "CONVERSA", canal: "WHATSAPP", quem: "CONTATO", contatoId: JOANA,
  quemPediu: "Joana Prado", quemPapel: "Filha · contato principal", pedidoEm: h(24 * 15), registradoEm: h(24 * 15), registradoPor: DIEGO, retirada: null,
};
const SEM = { ativo: null, historico: [], podeMudar: true };
const COM = { ativo: PEDIDO, historico: [PEDIDO], podeMudar: true };

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
    const lista = Array.isArray(r) ? r : r ? [r] : [{ status: 404, corpo: { erro: { codigo: "NOT_FOUND" } } }];
    const vez = pedidos.filter((p) => p.caminho === caminho && p.metodo === metodo).length - 1;
    const x = lista[Math.min(vez, lista.length - 1)]!;
    await rota.fulfill({ status: x.status ?? 200, contentType: "application/json", body: JSON.stringify(x.corpo) });
  });
  return pedidos;
}

const ficha = (avisos: Resp | Resp[], extra: Record<string, Resp | Resp[]> = {}) => ({
  "/v1/escritorio": { corpo: ESCRITORIO },
  [`GET /v1/escritorio/clientes/${CLI}`]: { corpo: FICHA },
  [`GET /v1/escritorio/clientes/${CLI}/sem-avisos`]: avisos,
  "GET /v1/escritorio/avisos": { corpo: { novos: 0, total: 0, itens: [] } },
  ...extra,
});

test.describe("Ficha do cliente: não receber avisos (F3.63, PA-03)", () => {
  test("registrar: erros presos ao campo, depois manda quem pediu, como e o dia; a ficha mostra o selo", async ({ page }) => {
    const pedidos = await simular(page, ficha([{ corpo: SEM }, { corpo: { ...COM, ativo: { ...PEDIDO, origem: "FICHA", canal: "TELEFONE", registradoPor: MARINA } } }],
      { [`POST /v1/escritorio/clientes/${CLI}/sem-avisos`]: { corpo: { semAvisos: { id: PEDIDO.id, tipo: "COBRANCA" } } } }));
    await page.goto(`${P}/clientes/${CLI}`);
    const folha = page.getByRole("region", { name: "Avisos automáticos" });
    await expect(folha.getByText("Recebe os avisos automáticos.")).toBeVisible();
    await folha.getByRole("button", { name: "Registrar pedido para não receber" }).click();
    const j = page.getByRole("dialog", { name: "Não receber avisos automáticos" });
    await expect(j.getByRole("radio", { name: /Joana Prado/ })).toBeChecked();
    await expect(j.getByRole("radio", { name: /Titular/ })).toBeVisible();
    await j.getByRole("radio", { name: /^Outra pessoa/ }).check();
    await j.getByLabel("Quando pediu").fill(amanhaBr);
    await j.getByRole("button", { name: "Registrar pedido" }).click();
    await expect(j.getByText("Falta acertar 2 pontos, marcados abaixo.")).toBeVisible();
    await expect(j.getByLabel("Nome de quem pediu e o que é do cliente")).toHaveAttribute("aria-invalid", "true");
    await expect(j.getByText(`A data não pode ser depois de hoje (${hojeBr}).`)).toBeVisible();
    await semViolacoes(page);
    await j.getByRole("radio", { name: /^Sônia Martins/ }).check();
    await j.getByRole("radio", { name: /^Por telefone/ }).check();
    await j.getByLabel("Quando pediu").fill(hojeBr);
    await j.getByRole("button", { name: "Registrar pedido" }).click();
    await expect(page.getByText("Pedido registrado.")).toBeVisible();
    expect(pedidos.find((p) => p.metodo === "POST")?.corpo).toEqual({
      tipo: "COBRANCA", origem: "FICHA", canal: "TELEFONE", pedidoEm: hojeIso, quem: "CONTATO", contatoId: SONIA,
    });
    await expect(page.locator(".meta .sa-selo")).toHaveText("Sem avisos de cobrança");
    await expect(folha.getByText("Marina Ribeiro (você)")).toBeVisible();
  });

  test("fora dos avisos: quem pediu e como; retirar pede quem e como, e guarda no histórico", async ({ page }) => {
    const retirado = { ...PEDIDO, retirada: { em: h(0), por: MARINA, quem: "CONTATO", contatoId: JOANA, quemPediu: "Joana Prado", quemPapel: "Filha · contato principal", canal: "TELEFONE" } };
    const pedidos = await simular(page, ficha([{ corpo: COM }, { corpo: { ativo: null, historico: [retirado], podeMudar: true } }],
      { [`POST /v1/escritorio/clientes/${CLI}/sem-avisos`]: { corpo: { semAvisos: null } } }));
    await page.goto(`${P}/clientes/${CLI}`);
    const folha = page.getByRole("region", { name: "Avisos automáticos" });
    await expect(folha.getByText(/Fora dos avisos de cobrança desde/)).toBeVisible();
    const dl = folha.locator(".sa-dl");
    await expect(dl.getByText("Filha · contato principal")).toBeVisible();
    await expect(dl.getByText("Pelo WhatsApp")).toBeVisible();
    await expect(folha.getByText(/Continua recebendo:/)).toBeVisible();
    await semViolacoes(page);
    await folha.getByRole("button", { name: "Retirar o pedido" }).click();
    const j = page.getByRole("dialog", { name: "Antônia volta a receber os avisos de cobrança?" });
    await expect(j.getByRole("radio", { name: /Joana Prado/ })).toBeChecked();
    await j.getByRole("button", { name: "Voltar a receber" }).click();
    await expect(page.getByText("Pedido retirado.")).toBeVisible();
    expect(pedidos.find((p) => p.metodo === "POST")?.corpo).toEqual({ retirar: true, canal: "TELEFONE", quem: "CONTATO", contatoId: JOANA });
    await expect(page.locator(".meta .sa-selo")).toHaveCount(0);
    await expect(folha.getByText(/Recebe os avisos automáticos desde/)).toBeVisible();
    await expect(folha.getByText("Pedido retirado: voltou a receber os avisos de cobrança")).toBeVisible();
  });

  test("mudar o pedido: já vem com o outro tipo e diz que o atual fica no histórico", async ({ page }) => {
    const pedidos = await simular(page, ficha({ corpo: COM }, { [`POST /v1/escritorio/clientes/${CLI}/sem-avisos`]: { corpo: { semAvisos: { id: "x", tipo: "TODOS" } } } }));
    await page.goto(`${P}/clientes/${CLI}`);
    await page.getByRole("button", { name: "Mudar o pedido" }).click();
    const j = page.getByRole("dialog", { name: "Mudar o pedido de avisos" });
    await expect(j.getByRole("radio", { name: /Todos os avisos automáticos/ })).toBeChecked();
    await expect(j.getByText(/O pedido atual \(só cobrança/)).toBeVisible();
    await j.getByRole("button", { name: "Salvar o novo pedido" }).click();
    await expect(page.getByText("Pedido mudado.")).toBeVisible();
    expect((pedidos.find((p) => p.metodo === "POST")?.corpo as { tipo: string }).tipo).toBe("TODOS");
  });

  test("toda a equipe registra: Larissa, só com Jurídico, vê a folha e os botões", async ({ page }) => {
    await simular(page, { ...ficha({ corpo: COM }), "/v1/escritorio": { corpo: LARISSA } });
    await page.goto(`${P}/clientes/${CLI}`);
    await expect(page.getByRole("button", { name: "Retirar o pedido" })).toBeVisible();
  });
});

// ------------------------------------------------------------------ sino

const C1 = "b0000000-0000-4000-8000-000000000001";
const AV = (n: number, tipo: string, dados: Record<string, string>, horas: number, lido = false, origem = "conversas") => ({
  id: `a1000000-0000-4000-8000-00000000000${n}`, tipo, dados, origem, origemId: C1, em: h(horas), lido,
});
const ITENS = [
  AV(1, "CONVERSA_IA", { conversa: "Antônia Ferreira Prado", contato: "Joana Prado", trecho: "Quero falar com a doutora sobre a audiência da minha mãe." }, 0.1),
  AV(2, "AUTOMACAO_SUGESTAO", { quem: "Gustavo Lima", automacao: "Cobrança de parcela atrasada", texto: "Esperar 5 dias, e não 3." }, 0.2, false, "automacoes"),
  AV(3, "MODELO_RECUSADO", { automacao: "Cobrança gentil", modelo: "Parcela atrasada, 2º aviso", motivo: "O texto parece promoção." }, 0.3, false, "automacoes"),
  AV(4, "CONVERSA_ASSUMIDA", { quem: "Felipe Matos", conversa: "Construtora Vale Alto Ltda." }, 30, true),
];
const LISTA = { novos: 3, total: 4, itens: ITENS };

const sino = (avisos: Resp | Resp[], extra: Record<string, Resp | Resp[]> = {}) => ({
  "/v1/escritorio": { corpo: ESCRITORIO },
  "GET /v1/escritorio/clientes": { corpo: { comercial: true, clientes: [] } },
  "GET /v1/escritorio/avisos": avisos,
  ...extra,
});
const botaoSino = (page: Page) => page.getByRole("button", { name: /^Avisos,/ }).filter({ visible: true });

test.describe("O sino de avisos (F3.57, PD-07)", () => {
  test("o ponto e o número no rótulo; o painel por dia, com o que aconteceu e para onde vai", async ({ page }) => {
    await simular(page, sino({ corpo: LISTA }));
    await page.goto(`${P}/clientes`);
    await expect(botaoSino(page)).toHaveAccessibleName("Avisos, 3 novos");
    await botaoSino(page).click();
    await expect(botaoSino(page)).toHaveAttribute("aria-expanded", "true");
    const d = page.getByRole("dialog", { name: "Avisos" });
    await expect(d.getByText("3 novos")).toBeVisible();
    await expect(d.getByRole("heading", { name: "Hoje" })).toBeVisible();
    await expect(d.getByRole("heading", { name: /^Ontem/ })).toBeVisible();
    await expect(d.getByRole("link", { name: "Novo: A IA passou a conversa de Joana Prado para você" })).toHaveAttribute("href", `/conversas?c=${C1}`);
    await expect(d.getByRole("link", { name: /Gustavo Lima sugeriu uma mudança/ })).toHaveAttribute("href", `/conversas/automacoes?a=${C1}`);
    await expect(d.getByText("Recusado")).toBeVisible();
    await expect(d.getByText("Quero falar com a doutora sobre a audiência da minha mãe.")).toBeVisible();
    await semViolacoes(page);
    await d.getByRole("button", { name: /Não lidos/ }).click();
    await expect(d.getByRole("listitem")).toHaveCount(3);
    await page.keyboard.press("Escape");
    await expect(d).toBeHidden();
    await expect(botaoSino(page)).toBeFocused();
  });

  test("marcar todos vai até o último mostrado; abrir um aviso marca lido e leva ao lugar", async ({ page }) => {
    const lidos = { ...LISTA, novos: 0, itens: ITENS.map((i) => ({ ...i, lido: true })), marcados: 3 };
    const pedidos = await simular(page, sino({ corpo: LISTA }, {
      "POST /v1/escritorio/avisos/lidos": { corpo: lidos },
      [`POST /v1/escritorio/avisos/${ITENS[0]!.id}/lido`]: { corpo: LISTA },
      "GET /v1/escritorio/conversas": { corpo: { whatsapp: { situacao: "NAO_LIGADO" }, conversas: [], contagem: {} } },
    }));
    await page.goto(`${P}/clientes`);
    await botaoSino(page).click();
    const d = page.getByRole("dialog", { name: "Avisos" });
    await d.getByRole("button", { name: "Marcar todos como lidos" }).click();
    await expect(d.getByText("3 avisos marcados como lidos.")).toBeVisible();
    await expect(d.getByText("Tudo lido")).toBeVisible();
    await expect(botaoSino(page)).toHaveAccessibleName("Avisos, nenhum novo");
    expect(pedidos.find((p) => p.caminho === "/v1/escritorio/avisos/lidos")?.corpo).toEqual({ ate: ITENS[0]!.em });

    await page.reload();
    await botaoSino(page).click();
    await page.getByRole("link", { name: /A IA passou a conversa de Joana Prado/ }).click();
    await page.waitForURL(`**/conversas?c=${C1}`);
    expect(pedidos.some((p) => p.caminho === `/v1/escritorio/avisos/${ITENS[0]!.id}/lido`)).toBe(true);
  });

  test("vazio explica o que chega; erro oferece tentar de novo e diz que nada se perde", async ({ page }) => {
    await simular(page, sino([{ status: 500, corpo: { erro: { codigo: "INTERNAL_ERROR" } } }, { status: 500, corpo: { erro: { codigo: "INTERNAL_ERROR" } } },
      { corpo: { novos: 0, total: 0, itens: [] } }]));
    await page.goto(`${P}/clientes`);
    await botaoSino(page).click();
    const d = page.getByRole("dialog", { name: "Avisos" });
    await expect(d.getByText("Não deu para carregar os avisos")).toBeVisible();
    await expect(d.getByText(/Nenhum aviso se perde/)).toBeVisible();
    await d.getByRole("button", { name: "Tentar de novo" }).click();
    await expect(d.getByText("Nenhum aviso por enquanto.")).toBeVisible();
    await expect(d.getByText("Nenhum aviso nos últimos 30 dias")).toBeVisible();
    await semViolacoes(page);
  });
});
