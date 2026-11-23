// Conversas do Portal, Mensagens (tela aprovada em docs/design/aprovadas/portal-agenda-conversas,
// estados fila, assumida, devolver, passar, resolvida, novo-contato, fila-vazia, nao-conectado e
// nao-conectado-equipe): a fila com quem espera, o motivo e o responsável; a conversa com o cliente,
// a IA, a equipe e os momentos; o contexto pelas áreas; assumir, escrever, devolver e passar.
// A API é simulada; aqui se testa a tela, a acessibilidade e o que ela manda.
import { expect, test, type Page } from "@playwright/test";
import { semViolacoes } from "./console-dados.ts";

const P = "http://localhost:3000";
const ESC = "e0000000-0000-4000-8000-0000000000a1";
const ESCRITORIO = {
  id: ESC, nome: "Ribeiro & Matos", pessoa: "Marina Ribeiro", dono: true, areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"],
  socios: ["Marina Ribeiro"], pessoas: 7, outrosEscritorios: 0, funcoes: ["SOCIO"], cnpj: null, cidade: "São Paulo", uf: "SP", endereco: null,
  contatos: [], ultimaExportacao: null, conversasEsperando: 3,
};
const PAULA_ESC = { ...ESCRITORIO, pessoa: "Paula Nunes", dono: false, areas: [], funcoes: ["EQUIPE"], conversasEsperando: 0 };

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

const MARINA = { id: "aa000000-0000-4000-8000-000000000001", nome: "Marina Ribeiro" };
const DIEGO = { id: "aa000000-0000-4000-8000-000000000002", nome: "Diego Almeida" };
const PAULA = { id: "aa000000-0000-4000-8000-000000000003", nome: "Paula Nunes" };
const HEL = "c0000000-0000-4000-8000-000000000001";
const ANT = "c0000000-0000-4000-8000-000000000002";
const RAF = "c0000000-0000-4000-8000-000000000003";
const GAB = "c0000000-0000-4000-8000-000000000004";
const atras = (min: number) => new Date(Date.now() - min * 60_000).toISOString();

const linha = (o: Record<string, unknown>) => ({
  cliente: null, quemEscreve: null, papel: null, resolvidaEm: null, motivo: null, responsavel: null, assumidaPor: null,
  esperandoDesde: null, ultimaEm: atras(30), ultima: null, ...o,
});
const HELIO = linha({
  id: HEL, nome: "Hélio Batista Corrêa", telefone: "+5511981143059", cliente: { id: "d0000000-0000-4000-8000-000000000001", nome: "Hélio Batista Corrêa" },
  quemEscreve: "Marta Corrêa", papel: "esposa", situacao: "PRECISA", motivo: "PROPOSTA_ACORDO", responsavel: MARINA, esperandoDesde: atras(65),
  ultima: { autor: "CLIENTE", texto: "Eles querem resposta até amanhã cedo.", anexo: null },
});
const ANTONIA = linha({
  id: ANT, nome: "Antônia Ferreira Prado", telefone: "+5511991234567", cliente: { id: "d0000000-0000-4000-8000-000000000002", nome: "Antônia Ferreira Prado" },
  quemEscreve: "Joana Prado", papel: "filha", situacao: "PRECISA", motivo: "DOCUMENTO_NOVO", responsavel: DIEGO, esperandoDesde: atras(125),
  ultima: { autor: "CLIENTE", texto: "Achei a carta do INSS!", anexo: "carta-inss.jpg" },
});
const RAFAELA = linha({
  id: RAF, nome: "Rafaela", telefone: "+5511976402281", quemEscreve: "Rafaela", situacao: "PRECISA", motivo: "CLIENTE_NOVO", responsavel: DIEGO,
  esperandoDesde: atras(42), ultima: { autor: "CLIENTE", texto: "Rafaela Moura. Depois das 14h.", anexo: null },
});
const GABRIELA = linha({
  id: GAB, nome: "Gabriela Teixeira", telefone: "+5511996027735", cliente: { id: "d0000000-0000-4000-8000-000000000004", nome: "Gabriela Teixeira" },
  quemEscreve: "Gabriela Teixeira", situacao: "IA", resolvidaEm: atras(80), ultima: { autor: "IA", texto: "Sim, é por vídeo.", anexo: null },
});

const LISTA = {
  whatsapp: { situacao: "LIGADO", numero: "+551130001000", quemLiga: MARINA }, eu: MARINA.id,
  contagem: { precisa: 3, equipe: 0, ia: 0, resolvidas: 1 }, hoje: { resolvidas: 14, respondidas: 3, avisos: 6 },
  conversas: [ANTONIA, HELIO, RAFAELA],
};

const msg = (o: Record<string, unknown>) => ({ em: atras(60), ...o });
const CONV_HELIO = {
  ...HELIO, versao: 3, motivoTexto: "Marta pergunta se vale aceitar R$ 18.000,00. Valor e estratégia são com a advogada; a IA não opina.",
  responsavelRazao: "CASO", assumidaEm: null, notaIa: null, eu: MARINA.id, whatsappLigado: true, principal: true, juridico: true,
  mensagens: [
    msg({ id: "m1", autor: "CLIENTE", texto: "Bom dia. O Hélio recebeu uma proposta de acordo da empresa, de R$ 18.000,00.", em: atras(70) }),
    msg({ id: "m2", autor: "IA", texto: "Proposta de acordo precisa ser avaliada pela advogada do caso. Já passei para ela.", envio: "ENTREGUE", em: atras(69) }),
    msg({ id: "m3", autor: "SISTEMA", evento: "IA_PASSOU", para: MARINA, razao: "CASO", motivo: "PROPOSTA_ACORDO", em: atras(65) }),
    msg({ id: "m4", autor: "CLIENTE", texto: "Tá bom. Eles querem resposta até amanhã cedo.", em: atras(30) }),
  ],
  contexto: {
    proxContato: null,
    caso: { id: "k1", nome: "Corrêa x Rota Sul", etapa: "Instrução marcada", responsavel: MARINA },
    compromisso: null,
  },
};
const CONV_HELIO_ASS = {
  ...CONV_HELIO, situacao: "EQUIPE", versao: 4, assumidaPor: MARINA, assumidaEm: atras(5), esperandoDesde: null, responsavelRazao: "ASSUMIU",
  mensagens: [...CONV_HELIO.mensagens, msg({ id: "m5", autor: "SISTEMA", evento: "ASSUMIU", pessoa: MARINA, em: atras(5) })],
};
const CONV_ANT = {
  ...ANTONIA, versao: 2, motivoTexto: "Joana mandou a foto da carta de indeferimento do INSS.", responsavelRazao: "PROXIMO_CONTATO",
  assumidaEm: null, notaIa: null, eu: PAULA.id, whatsappLigado: true, principal: true, juridico: false,
  mensagens: [
    msg({ id: "a1", autor: "CLIENTE", texto: "Achei a carta do INSS! Mando só a foto?", anexo: { nome: "carta-inss.jpg", tipo: "IMAGEM", bytes: "2400000" }, em: atras(130) }),
    msg({ id: "a2", autor: "SISTEMA", evento: "IA_PASSOU", para: DIEGO, razao: "PROXIMO_CONTATO", motivo: "DOCUMENTO_NOVO", em: atras(125) }),
  ],
  contexto: { proxContato: { em: "2026-11-13", oque: "ligar para Joana sobre a carta do INSS", vencido: true, responsavel: DIEGO }, caso: null, compromisso: null },
};
const CONV_RAF = {
  ...RAFAELA, versao: 1, motivoTexto: "Número que não está em Clientes, pedindo atendimento trabalhista.", responsavelRazao: "COMERCIAL",
  assumidaEm: null, notaIa: null, eu: MARINA.id, whatsappLigado: true, principal: false, juridico: true,
  mensagens: [msg({ id: "r1", autor: "CLIENTE", texto: "Oi, bom dia. Vocês atendem?", em: atras(45) })],
  contexto: { proxContato: null, caso: null, compromisso: null },
};
const CONV_GAB = {
  ...GABRIELA, versao: 5, motivoTexto: null, responsavelRazao: null, assumidaEm: null, notaIa: null, eu: MARINA.id, whatsappLigado: true,
  principal: true, juridico: true,
  mensagens: [
    msg({ id: "g1", autor: "CLIENTE", texto: "A audiência de hoje é por vídeo mesmo?", em: atras(85) }),
    msg({ id: "g2", autor: "IA", texto: "Sim, é por vídeo, hoje às 11h.", envio: "LIDA", em: atras(84) }),
    msg({ id: "g3", autor: "SISTEMA", evento: "IA_RESOLVEU", em: atras(80) }),
  ],
  contexto: { proxContato: null, caso: null, compromisso: null },
};

const PESSOAS = { pessoas: [MARINA, DIEGO, PAULA] };

function comuns(esc: unknown = ESCRITORIO, lista: unknown = LISTA): Record<string, Resp> {
  return {
    "GET /v1/escritorio": { corpo: esc },
    "GET /v1/escritorio/conversas": { corpo: lista },
    "GET /v1/escritorio/pessoas": { corpo: PESSOAS },
    [`GET /v1/escritorio/conversas/${HEL}`]: { corpo: CONV_HELIO },
    [`GET /v1/escritorio/conversas/${ANT}`]: { corpo: CONV_ANT },
    [`GET /v1/escritorio/conversas/${RAF}`]: { corpo: CONV_RAF },
    [`GET /v1/escritorio/conversas/${GAB}`]: { corpo: CONV_GAB },
  };
}

const ehCelular = (page: Page) => (page.viewportSize()?.width ?? 1000) <= 760;

test.describe("Conversas do Portal, Mensagens (PD-07, EX-10, AP-02)", () => {
  test("fila: quem espera, há quanto tempo, o motivo e o responsável; o número de quem espera no menu", async ({ page }) => {
    const pedidos = await simular(page, comuns());
    await page.goto(`${P}/conversas`);
    const lista = page.getByRole("list", { name: "Conversas" });
    await expect(lista.getByRole("listitem")).toHaveCount(3);
    await expect(lista.getByRole("listitem").first()).toContainText("Antônia Ferreira Prado");
    await expect(lista.getByRole("listitem").first()).toContainText("há 2 h");
    await expect(lista.getByRole("listitem").first()).toContainText("Joana Prado, filha");
    await expect(lista.getByRole("listitem").first()).toContainText("Documento novo");
    await expect(lista.getByRole("listitem").first()).toContainText("com Diego");
    await expect(lista.getByRole("listitem").nth(1)).toContainText("com Marina (você)");
    await expect(lista.getByRole("listitem").nth(2)).toContainText("Contato novo · (11) 97640-2281");
    await expect(page.getByRole("button", { name: /Precisa de alguém\s*3/ })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("navigation", { name: "Seções de Conversas" }).getByRole("link", { name: /Mensagens/ })).toHaveAttribute("aria-current", "page");
    if (!ehCelular(page)) {
      await expect(page.getByRole("heading", { name: "Hoje, até agora" })).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: /Conversas/ })).toContainText("3");
    } else {
      await expect(page.getByRole("navigation", { name: "Navegação do celular" }).getByRole("link", { name: /Conversas/ })).toContainText("3");
    }
    await semViolacoes(page);
    await page.getByRole("button", { name: /Resolvidas hoje/ }).click();
    await expect.poll(() => pedidos.some((p) => p.caminho === "/v1/escritorio/conversas" && p.busca.includes("mostrar=RESOLVIDAS"))).toBe(true);
    await expect(page).toHaveURL(`${P}/conversas?mostrar=resolvidas`);
    await page.getByRole("searchbox", { name: "Buscar conversa por nome ou telefone" }).fill("Joana");
    await page.getByRole("searchbox", { name: "Buscar conversa por nome ou telefone" }).press("Enter");
    await expect.poll(() => pedidos.some((p) => p.busca.includes("q=Joana"))).toBe(true);
  });

  test("conversa: cliente, IA e o momento da passagem; o contexto com o caso; assumir e escrever", async ({ page }) => {
    const rotas = comuns();
    const pedidos = await simular(page, rotas);
    await page.goto(`${P}/conversas?c=${HEL}`);
    await expect(page.getByRole("heading", { level: 2, name: "Hélio Batista Corrêa" })).toBeVisible();
    await expect(page.getByText("Quem escreve: Marta Corrêa, esposa, contato principal")).toBeVisible();
    const msgs = page.getByRole("list", { name: "Mensagens" });
    await expect(msgs).toContainText("Hoje");
    await expect(msgs).toContainText("IA do escritório");
    await expect(msgs).toContainText("A IA passou a conversa para Marina Ribeiro, que cuida do caso. Motivo: proposta de acordo.");
    await expect(page.getByText(/responsável: Marina Ribeiro \(você\)/)).toBeVisible();
    if (ehCelular(page)) await page.getByText("Sobre Hélio e o caso").click();
    const ctx = page.getByRole(ehCelular(page) ? "group" : "complementary", { name: /Sobre Hélio/ });
    await expect(ctx).toContainText("Proposta de acordo. Marta pergunta se vale aceitar R$ 18.000,00.");
    await expect(ctx).toContainText("Veio para você porque você cuida do caso.");
    await expect(ctx).toContainText("Corrêa x Rota Sul");
    await expect(ctx.getByRole("link", { name: "Abrir a ficha" })).toHaveAttribute("href", "/clientes/d0000000-0000-4000-8000-000000000001");
    await semViolacoes(page);

    rotas[`POST /v1/escritorio/conversas/${HEL}/assumir`] = { corpo: { versao: 4 } };
    rotas[`POST /v1/escritorio/conversas/${HEL}/mensagens`] = { status: 201, corpo: { id: "m6", envio: "NA_FILA" } };
    await page.getByRole("button", { name: "Assumir conversa" }).click();
    rotas[`GET /v1/escritorio/conversas/${HEL}`] = { corpo: CONV_HELIO_ASS };
    await expect(page.getByRole("status").filter({ hasText: "Você assumiu a conversa." })).toBeVisible();
    expect(pedidos.find((p) => p.caminho.endsWith("/assumir"))?.corpo).toEqual({ versao: 3 });
    await expect(page.getByText("Com você", { exact: true })).toBeVisible();
    await expect(msgs).toContainText("Você assumiu a conversa. A IA fica em silêncio até você devolver.");
    await page.getByRole("button", { name: "Fechar aviso" }).click();
    await page.getByRole("button", { name: "Enviar" }).click();
    await expect(page.getByText("Escreva a mensagem.")).toBeVisible();
    await page.getByRole("textbox", { name: "Mensagem para Marta" }).fill("Oi, Marta. Pode mandar a proposta por foto?");
    await page.getByRole("button", { name: "Enviar" }).click();
    await expect.poll(() => pedidos.find((p) => p.caminho.endsWith("/mensagens"))?.corpo).toEqual({ texto: "Oi, Marta. Pode mandar a proposta por foto?" });
    await semViolacoes(page);
  });

  test("devolver para a IA: o resumo vai como atendimento na ficha", async ({ page }) => {
    const rotas = { ...comuns(), [`GET /v1/escritorio/conversas/${HEL}`]: { corpo: CONV_HELIO_ASS } };
    const pedidos = await simular(page, rotas);
    await page.goto(`${P}/conversas?c=${HEL}`);
    await page.getByRole("button", { name: "Devolver para a IA" }).click();
    const j = page.getByRole("dialog", { name: "Devolver a conversa para a IA" });
    await expect(j.getByRole("checkbox", { name: /Registrar como atendimento na ficha de Hélio/ })).toBeChecked();
    await semViolacoes(page);
    await j.getByRole("button", { name: "Devolver para a IA" }).click();
    await expect(j.getByText("Escreva o resumo para registrar o atendimento.")).toBeVisible();
    await expect(j.getByRole("textbox", { name: /O que a IA precisa saber/ })).toBeFocused();
    rotas[`POST /v1/escritorio/conversas/${HEL}/devolver`] = { corpo: { versao: 5 } };
    await j.getByRole("textbox", { name: /O que a IA precisa saber/ }).fill("Marina liga para Marta hoje às 14h.");
    await j.getByRole("button", { name: "Devolver para a IA" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Conversa devolvida para a IA." })).toBeVisible();
    expect(pedidos.find((p) => p.caminho.endsWith("/devolver"))?.corpo).toEqual({ versao: 4, nota: "Marina liga para Marta hoje às 14h.", registrarAtendimento: true });
  });

  test("passar para outra pessoa: só a equipe ativa, com recado; o próximo contato vencido no contexto", async ({ page }) => {
    const rotas = { ...comuns(PAULA_ESC, { ...LISTA, eu: PAULA.id }) };
    const pedidos = await simular(page, rotas);
    await page.goto(`${P}/conversas?c=${ANT}`);
    await expect(page.getByText("Diego é o responsável, mas qualquer pessoa pode assumir.")).toBeVisible();
    if (ehCelular(page)) await page.getByText("Sobre Antônia").click();
    const ctx = page.getByRole(ehCelular(page) ? "group" : "complementary", { name: /Sobre Antônia/ });
    await expect(ctx).toContainText("Foi para Diego porque Diego é responsável pelo próximo contato.");
    await expect(ctx).toContainText("Era 13/11: ligar para Joana sobre a carta do INSS, com Diego Almeida.");
    await expect(ctx).not.toContainText("Caso");
    await expect(page.getByRole("list", { name: "Mensagens" })).toContainText("carta-inss.jpg");
    await page.getByRole("button", { name: "Passar para outra pessoa" }).click();
    const j = page.getByRole("dialog", { name: "Passar para outra pessoa" });
    await expect(j.getByRole("combobox", { name: "Passar para" })).toBeFocused();
    await expect(j.getByRole("combobox", { name: "Passar para" }).locator("option")).toHaveText(["Escolha uma pessoa", "Marina Ribeiro", "Paula Nunes (você)"]);
    await j.getByRole("button", { name: "Passar a conversa" }).click();
    await expect(j.getByText("Escolha uma pessoa ativa na equipe.")).toBeVisible();
    await semViolacoes(page);
    rotas[`POST /v1/escritorio/conversas/${ANT}/passar`] = { corpo: { versao: 3 } };
    await j.getByRole("combobox", { name: "Passar para" }).selectOption(PAULA.id);
    await j.getByRole("textbox", { name: /Recado/ }).fill("Confere se a foto está legível?");
    await j.getByRole("button", { name: "Passar a conversa" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Conversa passada para Paula Nunes." })).toBeVisible();
    expect(pedidos.find((p) => p.caminho.endsWith("/passar"))?.corpo).toEqual({ versao: 2, pessoa: PAULA.id, recado: "Confere se a foto está legível?" });
  });

  test("contato novo e resolvida pela IA", async ({ page }) => {
    await simular(page, comuns());
    await page.goto(`${P}/conversas?c=${RAF}`);
    await expect(page.getByText("Ainda não está em Clientes")).toBeVisible();
    if (ehCelular(page)) await page.getByText("Sobre Rafaela").click();
    const ctx = page.getByRole(ehCelular(page) ? "group" : "complementary", { name: /Sobre Rafaela/ });
    await expect(ctx).toContainText("Foi para Diego porque contato novo é da área Comercial.");
    await expect(ctx.getByRole("link", { name: "Cadastrar como cliente" })).toHaveAttribute("href", `/clientes/novo?conversa=${RAF}`);
    await semViolacoes(page);
    await page.goto(`${P}/conversas?mostrar=resolvidas&c=${GAB}`);
    await expect(page.getByText("Resolvida pela IA").first()).toBeVisible();
    await expect(page.getByRole("list", { name: "Mensagens" })).toContainText("A IA marcou a conversa como resolvida.");
    await expect(page.getByRole("button", { name: "Assumir mesmo assim" })).toBeVisible();
    await expect(page.getByText(/Se Gabriela escrever de novo, a IA volta a responder/)).toBeVisible();
    await semViolacoes(page);
  });

  test("WhatsApp não ligado: a sócia dona vê os passos; a equipe vê quem liga", async ({ page }) => {
    const vazio = { ...LISTA, whatsapp: { situacao: "NAO_LIGADO", numero: null, quemLiga: MARINA }, contagem: { precisa: 0, equipe: 0, ia: 0, resolvidas: 0 }, conversas: [] };
    await simular(page, comuns({ ...ESCRITORIO, conversasEsperando: 0 }, vazio));
    await page.goto(`${P}/conversas`);
    await expect(page.getByRole("heading", { name: "O WhatsApp do escritório ainda não está ligado" })).toBeVisible();
    await expect(page.getByText("Separe um número só do escritório.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Marcar a ligação com a equipe T3jus" })).toBeVisible();
    await expect(page.getByRole("complementary", { name: "Enquanto isso" })).toContainText("Avisos de pagamento e atraso");
    await semViolacoes(page);
    await page.unrouteAll();
    await simular(page, comuns(PAULA_ESC, vazio));
    await page.reload();
    await expect(page.getByText("Quem liga é Marina Ribeiro, a sócia dona.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Marcar a ligação com a equipe T3jus" })).toHaveCount(0);
    await semViolacoes(page);
  });

  test("ninguém esperando: a fila diz que está em dia", async ({ page }) => {
    await simular(page, comuns({ ...ESCRITORIO, conversasEsperando: 0 }, { ...LISTA, contagem: { precisa: 0, equipe: 0, ia: 2, resolvidas: 14 }, conversas: [] }));
    await page.goto(`${P}/conversas`);
    await expect(page.getByRole("heading", { name: "Ninguém esperando agora" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Ver as resolvidas hoje" })).toBeVisible();
    await semViolacoes(page);
  });

  test("F3.64: Avisos automáticos mostra o que saiu, a situação, a mensagem escolhida e os avisos ligados", async ({ page }) => {
    const hoje = new Date().toISOString();
    const aviso = (id: string, gatilho: string, nome: string, extra: Record<string, unknown> = {}) => ({
      id, mensagemId: id, execucaoId: id, gatilho, automacao: { id: "a-" + gatilho, nome }, nome, detalhe: null,
      cliente: { id: GAB, nome: "Gabriela Teixeira" }, para: { nome: "Gabriela Teixeira", papel: null }, conversaId: GAB, em: hoje,
      texto: `Olá, Gabriela. ${nome}.`, situacao: "LIDA", motivo: null, resposta: null, ...extra,
    });
    const itens = [
      aviso("m1", "PARCELA_ATRASO", "Parcela em atraso", { situacao: "NAO_ENTREGUE", motivo: "O número é fixo e não tem WhatsApp", texto: null, conversaId: null,
        cliente: { id: HEL, nome: "Hélio Batista Corrêa" }, para: null, detalhe: "Parcela 3 de 10 · venceu 15/11" }),
      aviso("m2", "LEMBRETE_AUDIENCIA", "Lembrete · 1 dia antes", { situacao: "RESPONDEU", resposta: "Confirmo, estarei lá.", detalhe: "Conciliação 18/11, 11:00" }),
      aviso("m3", "PAGAMENTO_RECEBIDO", "Pagamento recebido"),
    ];
    const lista = { itens, total: 3, naoEntregues: 1, porTipo: { PARCELA_ATRASO: 1, LEMBRETE_AUDIENCIA: 1, PAGAMENTO_RECEBIDO: 1 }, socioDono: MARINA, dono: false };
    const auto = (id: string, gatilho: string, nome: string, situacao = "LIGADA") => ({ id, nome, gatilho, situacao, origem: "PRONTA", fluxo: { passos: [{ id: "g", tipo: "GATILHO", dias: 3 }] } });
    const pedidos = await simular(page, {
      ...comuns(PAULA_ESC),
      "GET /v1/escritorio/avisos-automaticos": { corpo: lista },
      "GET /v1/escritorio/avisos-automaticos?tipo=LEMBRETE_AUDIENCIA": { corpo: { ...lista, itens: [itens[1]], total: 1, naoEntregues: 0 } },
      "GET /v1/escritorio/automacoes": { corpo: { dono: false, areas: [], pessoas: [MARINA], automacoes: [auto("a1", "PAGAMENTO_RECEBIDO", "Pagamento recebido"), auto("a2", "ETAPA_CASO", "Etapa do caso", "DESLIGADA")] } },
    });
    await page.goto(`${P}/conversas/avisos`);
    await expect(page.getByRole("heading", { level: 1, name: "Avisos automáticos" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Seções de Conversas" }).getByRole("link", { name: "Avisos automáticos" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByText("Últimos 7 dias · 3 avisos · 1 não entregue")).toBeVisible();
    const vis = ehCelular(page) ? page.locator(".cartoes") : page.locator("table.cv-tab");
    await expect(vis.getByText("O número é fixo e não tem WhatsApp")).toBeVisible();
    await expect(vis.getByRole("link", { name: "Corrigir na ficha" })).toHaveAttribute("href", `/clientes/${HEL}`);
    await expect(vis.getByText("“Confirmo, estarei lá.”")).toBeVisible();
    // A prévia abre no primeiro aviso que saiu; "Ver a mensagem" troca.
    await expect(page.getByRole("heading", { name: "Mensagem para Gabriela" })).toBeVisible();
    await expect(page.getByText("Olá, Gabriela. Lembrete · 1 dia antes.")).toBeVisible();
    await vis.getByRole("button", { name: "Ver a mensagem de pagamento recebido para Gabriela Teixeira" }).click();
    await expect(page.getByText("Olá, Gabriela. Pagamento recebido.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Abrir a conversa com Gabriela" })).toHaveAttribute("href", `/conversas?c=${GAB}`);
    // Só as ligadas aparecem em "Quais avisos saem"; quem muda é a sócia dona.
    const regras = page.locator(".cv-regras");
    await expect(regras.getByText("Pagamento recebido")).toBeVisible();
    await expect(regras.getByText("Etapa do caso")).toHaveCount(0);
    await expect(page.getByText("Quem muda é Marina Ribeiro, a sócia dona.", { exact: false })).toBeVisible();
    await semViolacoes(page);
    await page.getByRole("button", { name: "Audiência (1)" }).click();
    await expect(page.getByRole("button", { name: "Audiência (1)" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("Últimos 7 dias · 1 aviso")).toBeVisible();
    expect(pedidos.some((x) => x.caminho === "/v1/escritorio/avisos-automaticos" && x.busca === "?tipo=LEMBRETE_AUDIENCIA")).toBe(true);
  });
});
