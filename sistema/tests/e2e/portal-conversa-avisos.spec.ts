// Conversas › o atalho "Não receber avisos" dentro da conversa (F3.65, PA-03). Tela aprovada em
// docs/design/aprovadas/portal-pendencias-pequenas (estados atalho, janela, erro, registrado e
// ja-fora). A API é simulada; aqui se testa a tela, a acessibilidade e o que ela manda.
import { expect, test, type Page } from "@playwright/test";
import { semViolacoes } from "./console-dados.ts";

const P = "http://localhost:3000";
const ESC = "e0000000-0000-4000-8000-0000000000a1";
const ESCRITORIO = {
  id: ESC, nome: "Ribeiro & Matos", pessoa: "Marina Ribeiro", dono: true, areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"],
  socios: ["Marina Ribeiro"], pessoas: 7, outrosEscritorios: 0, funcoes: ["SOCIO"], cnpj: null, cidade: "São Paulo", uf: "SP", endereco: null,
  contatos: [], ultimaExportacao: null, conversasEsperando: 1,
};
const LARISSA_ESC = { ...ESCRITORIO, pessoa: "Larissa Costa", dono: false, areas: ["JURIDICO"], funcoes: ["EQUIPE"] };

type Resp = { status?: number; corpo: unknown };
type Pedido = { metodo: string; caminho: string; corpo: unknown };

async function simular(page: Page, rotas: Record<string, Resp>) {
  const pedidos: Pedido[] = [];
  await page.route("**/api/v1/**", async (rota) => {
    const url = new URL(rota.request().url());
    const caminho = url.pathname.replace(/^\/api/, "");
    const metodo = rota.request().method();
    pedidos.push({ metodo, caminho, corpo: rota.request().postDataJSON() });
    const x = rotas[`${metodo} ${caminho}`] ?? rotas[caminho] ?? { status: 404, corpo: { erro: { codigo: "NOT_FOUND" } } };
    await rota.fulfill({ status: x.status ?? 200, contentType: "application/json", body: JSON.stringify(x.corpo) });
  });
  return pedidos;
}

const MARINA = { id: "aa000000-0000-4000-8000-000000000001", nome: "Marina Ribeiro" };
const DIEGO = { id: "aa000000-0000-4000-8000-000000000002", nome: "Diego Almeida" };
const LARISSA = { id: "aa000000-0000-4000-8000-000000000004", nome: "Larissa Costa" };
const HEL = "c0000000-0000-4000-8000-000000000001";
const ANT = "c0000000-0000-4000-8000-000000000002";
const CLI_HEL = "d0000000-0000-4000-8000-000000000001";
const CLI_ANT = "d0000000-0000-4000-8000-000000000002";
const K_HELIO = "b0000000-0000-4000-8000-000000000001";
const K_MARTA = "b0000000-0000-4000-8000-000000000002";
const K_JOANA = "b0000000-0000-4000-8000-000000000003";
const M_PEDIDO = "f0000000-0000-4000-8000-000000000004";
const atras = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
const hojeBr = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date());
const hojeIso = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
const PEDIDO = "Doutora, dá para parar de mandar aquelas mensagens automáticas de parcela? Eu pago sempre em dia.";

const linha = (o: Record<string, unknown>) => ({
  cliente: null, quemEscreve: null, papel: null, resolvidaEm: null, motivo: null, responsavel: null, assumidaPor: null,
  esperandoDesde: null, ultimaEm: atras(5), ultima: null, ...o,
});
const HELIO = linha({
  id: HEL, nome: "Hélio Batista Corrêa", telefone: "+5511981143059", cliente: { id: CLI_HEL, nome: "Hélio Batista Corrêa" },
  quemEscreve: "Marta Corrêa", papel: "esposa", situacao: "EQUIPE", assumidaPor: MARINA, responsavel: MARINA,
  ultima: { autor: "CLIENTE", texto: PEDIDO, anexo: null },
});
const ANTONIA = linha({
  id: ANT, nome: "Antônia Ferreira Prado", telefone: "+5511991234567", cliente: { id: CLI_ANT, nome: "Antônia Ferreira Prado" },
  quemEscreve: "Joana Prado", papel: "filha", situacao: "PRECISA", motivo: "DOCUMENTO_NOVO", responsavel: DIEGO, esperandoDesde: atras(60),
  ultima: { autor: "CLIENTE", texto: "Bom dia", anexo: null },
});
const LISTA = {
  whatsapp: { situacao: "LIGADO", numero: "+551130001000", quemLiga: MARINA }, eu: MARINA.id,
  contagem: { precisa: 1, equipe: 1, ia: 0, resolvidas: 0 }, hoje: { resolvidas: 0, respondidas: 0, avisos: 0 }, conversas: [HELIO, ANTONIA],
};
const msg = (o: Record<string, unknown>) => ({ em: atras(10), ...o });
const AVISOS_HELIO = {
  tipo: "PF", podeMudar: true, ativo: null,
  contatos: [
    { id: K_HELIO, nome: "Hélio Batista Corrêa", papel: null, principal: false },
    { id: K_MARTA, nome: "Marta Corrêa", papel: "esposa", principal: true },
  ],
};
const CONV_HELIO = {
  ...HELIO, versao: 4, motivoTexto: null, responsavelRazao: "ASSUMIU", assumidaEm: atras(8), notaIa: null, eu: MARINA.id, whatsappLigado: true,
  principal: true, juridico: true, contatoId: K_MARTA, avisos: AVISOS_HELIO,
  mensagens: [
    msg({ id: "f0000000-0000-4000-8000-000000000001", autor: "CLIENTE", texto: "Bom dia, doutora.", em: atras(12) }),
    msg({ id: "f0000000-0000-4000-8000-000000000002", autor: "SISTEMA", evento: "ASSUMIU", pessoa: MARINA, em: atras(8) }),
    msg({ id: "f0000000-0000-4000-8000-000000000003", autor: "EQUIPE", pessoa: MARINA, texto: "Recebi, obrigada.", envio: "LIDA", em: atras(7) }),
    msg({ id: M_PEDIDO, autor: "CLIENTE", texto: PEDIDO, em: atras(5) }),
  ],
  contexto: { proxContato: null, caso: { id: "k1", nome: "Corrêa x Rota Sul", etapa: "Instrução marcada", responsavel: MARINA }, compromisso: null },
};
const ATIVO_HELIO = {
  id: "s1", tipo: "COBRANCA", origem: "CONVERSA", canal: "WHATSAPP", quem: "CONTATO", contatoId: K_MARTA, quemPediu: "Marta Corrêa",
  quemPapel: "Esposa · contato principal", pedidoEm: atras(1), registradoEm: atras(1), registradoPor: MARINA, retirada: null,
  mensagem: { id: M_PEDIDO, texto: PEDIDO, em: atras(5) },
};
const CONV_HELIO_REG = {
  ...CONV_HELIO, avisos: { ...AVISOS_HELIO, ativo: ATIVO_HELIO },
  mensagens: [...CONV_HELIO.mensagens, msg({ id: "f0000000-0000-4000-8000-000000000005", autor: "SISTEMA", evento: "SEM_AVISOS_REGISTRADO", pessoa: MARINA,
    tipoAvisos: "COBRANCA", quemPediu: "Marta Corrêa", em: atras(1) })],
};
const CONV_ANT = {
  ...ANTONIA, versao: 2, motivoTexto: "Joana mandou uma mensagem.", responsavelRazao: "PROXIMO_CONTATO", assumidaEm: null, notaIa: null, eu: LARISSA.id,
  whatsappLigado: true, principal: true, juridico: true, contatoId: K_JOANA,
  avisos: {
    tipo: "PF", podeMudar: true,
    contatos: [{ id: K_JOANA, nome: "Joana Prado", papel: "filha", principal: true }],
    ativo: {
      id: "s2", tipo: "COBRANCA", origem: "CONVERSA", canal: "WHATSAPP", quem: "CONTATO", contatoId: K_JOANA, quemPediu: "Joana Prado",
      quemPapel: "Filha · contato principal", pedidoEm: "2026-11-03T15:00:00Z", registradoEm: "2026-11-03T17:22:00Z", registradoPor: DIEGO, retirada: null, mensagem: null,
    },
  },
  mensagens: [msg({ id: "f0000000-0000-4000-8000-000000000010", autor: "CLIENTE", texto: "Bom dia", em: atras(60) })],
  contexto: { proxContato: null, caso: null, compromisso: null },
};
const CONV_SEM_CLIENTE = {
  ...linha({ id: "c0000000-0000-4000-8000-000000000003", nome: "Rafaela", telefone: "+5511976402281", quemEscreve: "Rafaela", situacao: "PRECISA",
    motivo: "CLIENTE_NOVO", responsavel: DIEGO }),
  versao: 1, motivoTexto: null, responsavelRazao: "COMERCIAL", assumidaEm: null, notaIa: null, eu: MARINA.id, whatsappLigado: true, principal: false,
  juridico: true, contatoId: null, avisos: null, mensagens: [msg({ id: "f0000000-0000-4000-8000-000000000020", autor: "CLIENTE", texto: "Oi" })],
  contexto: { proxContato: null, caso: null, compromisso: null },
};

function comuns(esc: unknown = ESCRITORIO): Record<string, Resp> {
  return {
    "GET /v1/escritorio": { corpo: esc },
    "GET /v1/escritorio/conversas": { corpo: LISTA },
    "GET /v1/escritorio/pessoas": { corpo: { pessoas: [MARINA, DIEGO, LARISSA] } },
    [`GET /v1/escritorio/conversas/${HEL}`]: { corpo: CONV_HELIO },
    [`GET /v1/escritorio/conversas/${ANT}`]: { corpo: CONV_ANT },
    [`GET /v1/escritorio/conversas/${CONV_SEM_CLIENTE.id}`]: { corpo: CONV_SEM_CLIENTE },
  };
}

const ehCelular = (page: Page) => (page.viewportSize()?.width ?? 1000) <= 760;
async function contexto(page: Page, nome: string) {
  if (ehCelular(page)) await page.locator("summary").filter({ hasText: `Sobre ${nome}` }).click();
  return page.getByRole(ehCelular(page) ? "group" : "complementary", { name: new RegExp(`Sobre ${nome}`) });
}

test.describe("Conversa: não receber avisos (F3.65, PA-03)", () => {
  test("o atalho abre a janela já com a mensagem, quem escreve e o WhatsApp; registra ligado à conversa", async ({ page }) => {
    const rotas = comuns();
    const pedidos = await simular(page, rotas);
    await page.goto(`${P}/conversas?c=${HEL}`);
    await expect(page.getByRole("heading", { level: 2, name: "Hélio Batista Corrêa" })).toBeVisible();
    if (ehCelular(page)) await expect(page.locator("summary").filter({ hasText: "Sobre Hélio, o caso e os avisos" })).toBeVisible();
    const ctx = await contexto(page, "Hélio");
    const sec = ctx.getByRole("region", { name: "Avisos automáticos" }).or(ctx.locator("section.cv-sec").filter({ hasText: "Avisos automáticos" }));
    await expect(sec).toContainText("Recebe os avisos automáticos. Saem para Marta, o contato principal.");
    await semViolacoes(page);
    await sec.getByRole("button", { name: "Não receber avisos" }).click();

    const j = page.getByRole("dialog", { name: "Não receber avisos automáticos" });
    await expect(j).toContainText("Registre o pedido que Marta fez nesta conversa.");
    await expect(j.locator("q")).toHaveText(PEDIDO);
    await expect(j).toContainText("Marta Corrêa, nesta conversa, hoje às");
    await expect(j.getByRole("radio", { name: /Marta Corrêa/ })).toBeChecked();
    await expect(j.getByRole("radio", { name: /Marta Corrêa/ })).toHaveAccessibleName(/Escrevendo nesta conversa/);
    await expect(j.getByRole("radio", { name: /Pelo WhatsApp/ })).toBeChecked();
    await expect(j.getByRole("radio", { name: /Pelo WhatsApp/ })).toHaveAccessibleName(/Nesta conversa/);
    await expect(j.getByRole("textbox", { name: "Quando pediu" })).toHaveValue(hojeBr);
    await semViolacoes(page);

    // Falha do servidor: nada foi salvo e o que se escolheu fica.
    rotas[`POST /v1/escritorio/clientes/${CLI_HEL}/sem-avisos`] = { status: 500, corpo: { erro: { codigo: "INTERNO", mensagem: "Falhou" } } };
    await j.getByRole("button", { name: "Registrar pedido" }).click();
    await expect(j.getByText("O pedido não foi registrado.")).toBeVisible();
    await expect(j).toContainText("Nada foi salvo e o que você escolheu continua aqui.");
    await expect(j.getByRole("radio", { name: /Marta Corrêa/ })).toBeChecked();

    rotas[`POST /v1/escritorio/clientes/${CLI_HEL}/sem-avisos`] = { corpo: { semAvisos: { id: "s1", tipo: "COBRANCA" } } };
    rotas[`GET /v1/escritorio/conversas/${HEL}`] = { corpo: CONV_HELIO_REG };
    await j.getByRole("button", { name: "Registrar pedido" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Pedido registrado." })).toBeVisible();
    expect(pedidos.filter((p) => p.metodo === "POST").at(-1)?.corpo).toEqual({
      tipo: "COBRANCA", origem: "CONVERSA", canal: "WHATSAPP", pedidoEm: hojeIso, quem: "CONTATO", contatoId: K_MARTA, conversaId: HEL, mensagemId: M_PEDIDO,
    });

    await expect(page.locator(".cv-cab").getByText("Sem avisos de cobrança")).toBeVisible();
    const msgs = page.getByRole("list", { name: "Mensagens" });
    await expect(msgs).toContainText("Você registrou o pedido de Marta: sem avisos de cobrança. Lembretes de audiência e avisos de etapa continuam.");
    await expect(msgs).toContainText("Só a equipe vê esta linha.");
    await page.getByRole("button", { name: "Fechar aviso" }).click();
    const ctx2 = ehCelular(page) ? page.getByRole("group", { name: /Sobre Hélio/ }) : page.getByRole("complementary", { name: /Sobre Hélio/ });
    if (ehCelular(page) && !(await ctx2.isVisible())) await page.locator("summary").filter({ hasText: "Sobre Hélio" }).click();
    await expect(ctx2).toContainText(`Fora dos avisos de cobrança desde ${hojeBr}`);
    await expect(ctx2).toContainText("Pedido de Marta Corrêa (esposa), pelo WhatsApp. Registrado por você, na conversa, hoje às");
    await expect(ctx2.getByRole("link", { name: "Ver o histórico na ficha" })).toHaveAttribute("href", `/clientes/${CLI_HEL}`);
    await semViolacoes(page);
  });

  test("F3.83: a IA passou o pedido de não receber avisos; o atalho já vem preenchido", async ({ page }) => {
    const rotas = comuns();
    rotas[`GET /v1/escritorio/conversas/${HEL}`] = { corpo: { ...CONV_HELIO, situacao: "PRECISA", assumidaPor: null, motivo: "SEM_AVISOS", responsavelRazao: "CASO",
      motivoTexto: "Confira a mensagem e, se for isso, registre em Avisos automáticos › Não receber avisos. A IA não registra sozinha." } };
    await simular(page, rotas);
    await page.goto(`${P}/conversas?c=${HEL}`);
    const ctx = await contexto(page, "Hélio");
    await expect(ctx).toContainText("Pedido para não receber avisos. Confira a mensagem e, se for isso, registre em Avisos automáticos › Não receber avisos.");
    await semViolacoes(page);
    await ctx.getByRole("button", { name: "Não receber avisos" }).click();
    const j = page.getByRole("dialog", { name: "Não receber avisos automáticos" });
    await expect(j.locator("q")).toHaveText(PEDIDO);
    await expect(j.getByRole("radio", { name: /Pelo WhatsApp/ })).toBeChecked();
  });

  test("já fora dos avisos: Larissa, só com Jurídico, muda e retira na conversa", async ({ page }) => {
    const rotas = comuns(LARISSA_ESC);
    const pedidos = await simular(page, rotas);
    await page.goto(`${P}/conversas?c=${ANT}`);
    await expect(page.locator(".cv-cab").getByText("Sem avisos de cobrança")).toBeVisible();
    const ctx = await contexto(page, "Antônia");
    await expect(ctx).toContainText("Fora dos avisos de cobrança desde 03/11/2026");
    await expect(ctx).toContainText("Registrado por Diego Almeida, na conversa, em 03/11 às");
    await semViolacoes(page);

    await ctx.getByRole("button", { name: "Mudar o pedido" }).click();
    const m = page.getByRole("dialog", { name: "Mudar o pedido de avisos" });
    await expect(m.getByRole("radio", { name: /Todos os avisos automáticos/ })).toBeChecked();
    await expect(m.getByRole("radio", { name: /Joana Prado/ })).toBeChecked();
    rotas[`POST /v1/escritorio/clientes/${CLI_ANT}/sem-avisos`] = { corpo: { semAvisos: { id: "s3", tipo: "TODOS" } } };
    await m.getByRole("button", { name: "Salvar o novo pedido" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Pedido mudado." })).toBeVisible();
    expect(pedidos.filter((p) => p.metodo === "POST").at(-1)?.corpo).toMatchObject({ tipo: "TODOS", origem: "CONVERSA", conversaId: ANT, contatoId: K_JOANA });
    await page.getByRole("button", { name: "Fechar aviso" }).click();

    const ctx2 = ehCelular(page) ? page.getByRole("group", { name: /Sobre Antônia/ }) : page.getByRole("complementary", { name: /Sobre Antônia/ });
    if (ehCelular(page) && !(await ctx2.isVisible())) await page.locator("summary").filter({ hasText: "Sobre Antônia" }).click();
    await ctx2.getByRole("button", { name: "Retirar o pedido" }).click();
    const r = page.getByRole("dialog", { name: "Antônia volta a receber os avisos de cobrança?" });
    await expect(r.getByRole("radio", { name: /Pelo WhatsApp/ })).toBeChecked();
    await r.getByRole("button", { name: "Voltar a receber" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Pedido retirado." })).toBeVisible();
    expect(pedidos.filter((p) => p.metodo === "POST").at(-1)?.corpo).toEqual({ retirar: true, canal: "WHATSAPP", quem: "CONTATO", contatoId: K_JOANA, conversaId: ANT });
  });

  test("contato que não está em Clientes não tem a seção", async ({ page }) => {
    await simular(page, comuns());
    await page.goto(`${P}/conversas?c=${CONV_SEM_CLIENTE.id}`);
    await expect(page.getByRole("heading", { level: 2, name: "Rafaela" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Não receber avisos" })).toHaveCount(0);
    await expect(page.locator("section.cv-sec").filter({ hasText: "Avisos automáticos" })).toHaveCount(0);
  });
});
