// Conversas › Automações (PA-03; tela aprovada em docs/design/aprovadas/portal-conversas-automacoes,
// estados lista, pedir, vazio, nao-conectado, bloco, erros, testar, ligar, historico e so-leitura):
// a lista com as prontas e as criadas, criar um rascunho, o desenho com o que falta, editar e
// aprovar o texto, testar sem enviar, quem entraria hoje, ligar com o limite semanal, o histórico,
// desligar com motivo e quem só vê (sugerir mudança). A API é simulada; aqui se testa a tela, a
// acessibilidade e o que ela manda.
import { expect, test, type Page } from "@playwright/test";
import { semViolacoes } from "./console-dados.ts";

const P = "http://localhost:3000";
const ESC = "e0000000-0000-4000-8000-0000000000a1";
const ESCRITORIO = {
  id: ESC, nome: "Ribeiro & Matos", pessoa: "Marina Ribeiro", dono: true, areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"],
  socios: ["Marina Ribeiro"], pessoas: 7, outrosEscritorios: 0, funcoes: ["SOCIO"], cnpj: "41276839000134", cidade: "São Paulo", uf: "SP", endereco: null,
  contatos: [], ultimaExportacao: null, conversasEsperando: 0,
};
const GUSTAVO_ESC = { ...ESCRITORIO, pessoa: "Gustavo Lima", dono: false, areas: ["FINANCEIRO"], funcoes: ["EQUIPE"] };

type Resp = { status?: number; corpo: unknown };
type Pedido = { metodo: string; caminho: string; corpo: unknown };

async function simular(page: Page, rotas: Record<string, Resp | ((corpo: unknown) => Resp)>) {
  const pedidos: Pedido[] = [];
  await page.route("**/api/v1/**", async (rota) => {
    const url = new URL(rota.request().url());
    const caminho = url.pathname.replace(/^\/api/, "");
    const metodo = rota.request().method();
    const corpo = rota.request().postDataJSON();
    pedidos.push({ metodo, caminho, corpo });
    const r = rotas[`${metodo} ${caminho}`] ?? rotas[caminho];
    const x = typeof r === "function" ? r(corpo) : r ?? { status: 404, corpo: { erro: { codigo: "NOT_FOUND" } } };
    await rota.fulfill({ status: x.status ?? 200, contentType: "application/json", body: JSON.stringify(x.corpo) });
  });
  return pedidos;
}

const MARINA = { id: "aa000000-0000-4000-8000-000000000001", nome: "Marina Ribeiro" };
const GUSTAVO = { id: "aa000000-0000-4000-8000-000000000002", nome: "Gustavo Lima" };
const hoje = (hh: string) => new Date(`${new Date().toISOString().slice(0, 10)}T${hh}:00-03:00`).toISOString();
const ID = "ab000000-0000-4000-8000-000000000001";
const PRONTA = "ab000000-0000-4000-8000-000000000002";

const PRONTA_ATRASO = {
  passos: [
    { id: "gatilho", tipo: "GATILHO", dias: 1 },
    { id: "m1", tipo: "MENSAGEM", nome: "Primeiro aviso", aviso: "PARCELA_ATRASO" },
    { id: "e1", tipo: "ESPERA", dias: 7 },
    { id: "m2", tipo: "MENSAGEM", nome: "Segundo aviso", aviso: "PARCELA_ATRASO" },
    { id: "e2", tipo: "ESPERA", dias: 7 },
    { id: "m3", tipo: "MENSAGEM", nome: "Terceiro aviso", aviso: "PARCELA_ATRASO" },
    { id: "fim", tipo: "FIM" },
  ],
};
const COM_FALTA = {
  passos: [
    { id: "gatilho", tipo: "GATILHO", dias: 3 },
    { id: "cond", tipo: "CONDICOES", semCombinado: true },
    { id: "msg", tipo: "MENSAGEM", nome: "Cobrança gentil", texto: "Olá, {nome}. A parcela {parcela} venceu em {vencimento}." },
    { id: "espera", tipo: "ESPERA", dias: 5 },
    {
      id: "ramo", tipo: "RAMOS", ramos: [
        { quando: "PAGOU", passos: [{ id: "fim-p", tipo: "FIM" }] },
        { quando: "RESPONDEU", passos: [] },
        { quando: "NADA", passos: [{ id: "pessoa", tipo: "PESSOA", pessoaId: GUSTAVO.id, motivo: "5 dias sem pagamento nem resposta" }] },
      ],
    },
  ],
};
const PRONTO = {
  passos: [
    ...COM_FALTA.passos.slice(0, 2),
    { id: "msg", tipo: "MENSAGEM", nome: "Cobrança gentil", modeloId: "mod1" },
    COM_FALTA.passos[3],
    {
      id: "ramo", tipo: "RAMOS", ramos: [
        { quando: "PAGOU", passos: [{ id: "fim-p", tipo: "FIM" }] },
        { quando: "RESPONDEU", passos: [{ id: "ia", tipo: "IA" }, { id: "fim-r", tipo: "FIM" }] },
        { quando: "NADA", passos: [{ id: "pessoa", tipo: "PESSOA", pessoaId: GUSTAVO.id, motivo: "5 dias sem pagamento nem resposta" }] },
      ],
    },
  ],
};

const linha = (mudar: object = {}) => ({
  id: ID, versao: 3, nome: "Cobrança gentil de parcela em atraso", origem: "ESCRITORIO", prontaChave: null, gatilho: "PARCELA_ATRASO", area: "FINANCEIRO",
  situacao: "RASCUNHO", fluxo: COM_FALTA, versaoLigada: null, aguardando: null, desligada: null, erros: 2, textosPorAprovar: 1, rascunhoMudou: true,
  seteDias: { enviadas: 0, falhas: 0 }, atualizadaPor: GUSTAVO, atualizadaEm: hoje("09:40"), criadaPor: GUSTAVO, criadaEm: hoje("09:00"), ...mudar,
});
const pronta = {
  ...linha(), id: PRONTA, nome: "Parcela em atraso", origem: "PRONTA", prontaChave: "PARCELA_ATRASO", situacao: "LIGADA", fluxo: PRONTA_ATRASO,
  versaoLigada: 1, erros: 0, textosPorAprovar: 0, rascunhoMudou: false, seteDias: { enviadas: 12, falhas: 1 }, atualizadaPor: null, criadaPor: null,
};
const LISTA = { dono: true, areas: ESCRITORIO.areas, quemCuida: MARINA, whatsapp: { situacao: "LIGADO" }, semAvisos: 2, pessoas: [GUSTAVO, MARINA], automacoes: [linha(), pronta] };

const PESSOAS = [
  { id: MARINA.id, nome: MARINA.nome, areas: ESCRITORIO.areas, dono: true },
  { id: GUSTAVO.id, nome: GUSTAVO.nome, areas: ["FINANCEIRO"], dono: false },
];
const CAMPOS = ["nome", "parcela", "valor", "vencimento", "link de pagamento"];
const pagina = (mudar: object = {}) => ({
  ...linha(), eu: MARINA.id, dono: true, quemCuida: MARINA, whatsapp: { situacao: "LIGADO" }, rascunho: COM_FALTA,
  listaErros: [
    { passo: "msg", codigo: "TEXTO_RECUSADO", motivo: "Falta o link de pagamento." },
    { passo: "ramo", ramo: "RESPONDEU", codigo: "PASSO_SEM_SAIDA" },
  ],
  textosPorAprovarIds: ["msg"], conflitos: [], entramJaAtrasados: false, ligada: null, modelos: {}, aviso: null, pessoas: PESSOAS, campos: CAMPOS,
  execucoes: { total: 0, concluidas: 0, andamento: 0, falhas: 0 },
  eventos: [{ tipo: "CRIADA", detalhe: {}, pessoa: GUSTAVO, em: hoje("09:00") }],
  ...mudar,
});
const MODELO = { id: "mod1", nome: "Cobrança gentil", texto: "Olá, {nome}. A parcela {parcela} venceu em {vencimento}. Para pagar: {link de pagamento}.",
  aprovadoPor: MARINA, aprovadoEm: hoje("10:00"), metaSituacao: "NAO_ENVIADO", metaEm: null, metaMotivo: null };
const PRONTA_PAG = pagina({
  rascunho: PRONTO, fluxo: PRONTO, listaErros: [], erros: 0, textosPorAprovar: 0, textosPorAprovarIds: [], modelos: { mod1: MODELO },
  conflitos: [{ id: PRONTA, nome: "Parcela em atraso", dias: [1, 8, 15] }], versao: 5,
});

// Os testes do desenho rodam no computador; os do celular, no bloco do fim.
test.beforeEach(async ({ page }, info) => {
  void page;
  test.skip(info.project.name === "celular" && !info.titlePath.includes("no celular"), "no computador");
  test.skip(info.project.name !== "celular" && info.titlePath.includes("no celular"), "no celular");
});

const QUEM = {
  disponivel: true, dias: 3,
  itens: [
    { origem: { id: "pa1", descricao: "Mensalidade de novembro", quando: "2026-11-15" }, parcela: { id: "pa1", descricao: "Mensalidade de novembro", valor: 180000, vencimento: "2026-11-15" }, cliente: { id: "c1", nome: "Farmácia Bom Jesus" },
      contato: { nome: "Sueli Ramos", papel: "gerente" }, diasAtraso: 3, jaEmAtraso: false, entra: true, motivo: null, detalhe: null },
    { origem: { id: "pa2", descricao: "Parcela 2 de 6", quando: "2026-11-15" }, parcela: { id: "pa2", descricao: "Parcela 2 de 6", valor: 50000, vencimento: "2026-11-15" }, cliente: { id: "c2", nome: "Construtora Alves" },
      contato: { nome: "Rui Alves", papel: null }, diasAtraso: 3, jaEmAtraso: false, entra: false, motivo: "SEM_WHATSAPP", detalhe: null },
  ],
};
const SIM = {
  cliente: "Farmácia Bom Jesus", contato: "Sueli Ramos", exemplo: false,
  caminho: [
    { passo: "gatilho", tipo: "GATILHO", rotulo: "1 Gatilho" }, { passo: "msg", tipo: "MENSAGEM", rotulo: "3 Mensagem" },
    { passo: "ramo:NADA", tipo: "RAMOS", rotulo: "Nem pagou, nem respondeu" }, { passo: "pessoa", tipo: "PESSOA", rotulo: "6 Passar para Gustavo" },
  ],
  conversa: [
    { tipo: "SISTEMA", icone: "raio", texto: "Gatilho: a parcela chegou a 3 dias de atraso.", em: hoje("10:00") },
    { tipo: "AVISO", nome: "Cobrança gentil", texto: "Olá, Sueli. A parcela Mensalidade de novembro venceu em 15/11.", em: hoje("10:00") },
    { tipo: "SISTEMA", icone: "mao", texto: "A conversa passaria para Gustavo Lima.", em: hoje("10:20") },
  ],
};

test("PA-03: a lista mostra as criadas e as prontas; a nova automação começa em rascunho", async ({ page }) => {
  const pedidos = await simular(page, {
    "/v1/escritorio": { corpo: ESCRITORIO },
    "GET /v1/escritorio/automacoes": { corpo: LISTA },
    "POST /v1/escritorio/automacoes": { status: 201, corpo: pagina({ id: ID }) },
    [`GET /v1/escritorio/automacoes/${ID}`]: { corpo: pagina() },
  });
  await page.goto(`${P}/conversas/automacoes`);
  await expect(page.getByRole("heading", { level: 1, name: "Automações" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Parcela em atraso" }).first()).toBeVisible();
  await expect(page.getByText("1, 8 e 15 dias depois do vencimento").first()).toBeVisible();
  await expect(page.getByText("Falta: 2 ajustes e 1 texto por aprovar").first()).toBeVisible();
  await expect(page.getByText("2 clientes hoje.")).toBeVisible();
  await expect(page.getByText("Se não pagar em 5 dias, passa para Gustavo.").first()).toBeVisible();
  await semViolacoes(page);

  await page.getByRole("button", { name: "Pedir à IA" }).click();
  await page.getByRole("button", { name: "Pedir sugestão" }).click();
  await expect(page.getByText("A IA que monta o fluxo ainda está sendo preparada")).toBeVisible();
  await page.getByRole("button", { name: "Montar do zero" }).click();

  await expect(page.getByRole("heading", { name: "Nova automação" })).toBeVisible();
  await page.getByRole("button", { name: "Criar o rascunho" }).click();
  await expect(page.getByText("Dê um nome de 3 a 80 letras.")).toBeVisible();
  await expect(page.getByText("Escolha quando a automação começa.")).toBeVisible();
  await page.getByLabel("Nome").fill("Cobrança gentil de parcela em atraso");
  await page.getByRole("radio", { name: /^Parcela em atraso/ }).check();
  await page.getByRole("button", { name: "Criar o rascunho" }).click();
  await expect(page).toHaveURL(new RegExp(`a=${ID}`));
  expect(pedidos.find((x) => x.metodo === "POST")?.corpo).toEqual({ nome: "Cobrança gentil de parcela em atraso", gatilho: "PARCELA_ATRASO" });
  await expect(page.getByRole("heading", { level: 1, name: "Cobrança gentil de parcela em atraso" })).toBeVisible();
});

test("PA-03: o desenho mostra o que falta, a tela leva ao passo e o texto é salvo e aprovado", async ({ page }) => {
  let atual: object = pagina();
  const pedidos = await simular(page, {
    "/v1/escritorio": { corpo: ESCRITORIO },
    "GET /v1/escritorio/automacoes": { corpo: LISTA },
    [`GET /v1/escritorio/automacoes/${ID}`]: () => ({ corpo: atual }),
    [`PATCH /v1/escritorio/automacoes/${ID}`]: (c) => {
      atual = pagina({ versao: 4, rascunho: (c as { fluxo: object }).fluxo, listaErros: [{ passo: "ramo", ramo: "RESPONDEU", codigo: "PASSO_SEM_SAIDA" }] });
      return { corpo: atual };
    },
    [`POST /v1/escritorio/automacoes/${ID}/aprovar-texto`]: () => {
      atual = pagina({ versao: 5, textosPorAprovarIds: [], textosPorAprovar: 0, listaErros: [{ passo: "ramo", ramo: "RESPONDEU", codigo: "PASSO_SEM_SAIDA" }] });
      return { corpo: atual };
    },
  });
  await page.goto(`${P}/conversas/automacoes?a=${ID}`);
  await expect(page.getByText("2 passos precisam de ajuste antes de testar")).toBeVisible();
  await expect(page.getByRole("heading", { name: "O que falta · 2" })).toBeVisible();
  await expect(page.getByText("Este caminho não leva a nenhum passo. Quem cair aqui ficaria sem ninguém.", { exact: true })).toBeVisible();
  await expect(page.locator("a", { hasText: "Testar" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Testar Ajuste/ })).toHaveAttribute("aria-disabled", "true");
  await semViolacoes(page);

  await page.getByRole("link", { name: "Editar o passo 3, Mensagem" }).click();
  await expect(page).toHaveURL(/b=msg/);
  await expect(page.getByRole("heading", { name: "Editar a mensagem" })).toBeVisible();
  const texto = page.getByLabel("Texto da mensagem");
  await texto.click();
  await texto.press("End");
  await texto.pressSequentially(" Para pagar: ");
  await page.getByRole("button", { name: "{link de pagamento}" }).click();
  await expect(texto).toHaveValue("Olá, {nome}. A parcela {parcela} venceu em {vencimento}. Para pagar: {link de pagamento}");
  await expect(page.getByText("Olá, Sueli. A parcela Mensalidade de novembro venceu em 15/11.")).toBeVisible();
  await semViolacoes(page);
  await page.getByRole("button", { name: "Aprovar o texto" }).click();
  await expect(page.getByText("Texto aprovado.")).toBeVisible();
  const patch = pedidos.find((x) => x.metodo === "PATCH")?.corpo as { versao: number; fluxo: { passos: { id: string; texto?: string }[] } };
  expect(patch.versao).toBe(3);
  expect(patch.fluxo.passos.find((x) => x.id === "msg")?.texto).toContain("{link de pagamento}");
  expect(pedidos.find((x) => x.caminho.endsWith("/aprovar-texto"))?.corpo).toEqual({ versao: 4, passo: "msg" });
});

test("PA-03: testar sem enviar, quem entraria hoje e ligar desligando a pronta", async ({ page }) => {
  let atual: object = PRONTA_PAG;
  const pedidos = await simular(page, {
    "/v1/escritorio": { corpo: ESCRITORIO },
    "GET /v1/escritorio/automacoes": { corpo: LISTA },
    [`GET /v1/escritorio/automacoes/${ID}`]: () => ({ corpo: atual }),
    [`GET /v1/escritorio/automacoes/${ID}/quem-entraria`]: { corpo: QUEM },
    [`POST /v1/escritorio/automacoes/${ID}/simular`]: { corpo: SIM },
    [`POST /v1/escritorio/automacoes/${ID}/ligar`]: () => {
      atual = { ...PRONTA_PAG, situacao: "EM_APROVACAO", versao: 6, aguardando: { numero: 1, desde: hoje("10:30") }, rascunhoMudou: false };
      return { corpo: atual };
    },
  });
  await page.goto(`${P}/conversas/automacoes?a=${ID}&passo=testar`);
  await expect(page.getByRole("heading", { name: "Simular sem enviar" })).toBeVisible();
  await expect(page.getByText("2 parcelas: 1 entraria, 1 fica de fora")).toBeVisible();
  await expect(page.getByText("O número da ficha é fixo ou não tem celular.")).toBeVisible();
  await page.getByRole("button", { name: "Simular" }).click();
  await expect(page.getByText("Esta conversa não foi enviada.")).toBeVisible();
  await expect(page.getByRole("list", { name: "Caminho percorrido no fluxo" }).getByText("6 Passar para Gustavo")).toBeVisible();
  expect(pedidos.find((x) => x.caminho.endsWith("/simular"))?.corpo).toEqual({ parcelaId: "pa1", escolha: "NADA" });
  await semViolacoes(page);

  await page.getByRole("link", { name: "Seguir para ligar" }).click();
  await expect(page.getByRole("heading", { name: "Revise e ligue" })).toBeVisible();
  await expect(page.getByText("Desligar “Parcela em atraso” quando esta ligar")).toBeVisible();
  await page.getByRole("button", { name: "Ligar a automação" }).click();
  await expect(page.getByText("Confirme que revisou.")).toBeVisible();
  await page.getByText("Revisei o texto, os caminhos e quem entra").click();
  await semViolacoes(page);
  await page.getByRole("button", { name: "Ligar a automação" }).click();
  await expect(page.getByText("Enviada para a aprovação do WhatsApp.")).toBeVisible();
  expect(pedidos.find((x) => x.caminho.endsWith("/ligar"))?.corpo).toEqual({ versao: 5, revisou: true, desligarConflitos: true, entramJaAtrasados: false });
  await expect(page.getByText("Esperando a aprovação do WhatsApp")).toBeVisible();
});

test("PA-03: o histórico mostra as falhas e a sócia dona desliga com motivo", async ({ page }) => {
  let atual: object = { ...PRONTA_PAG, situacao: "LIGADA", versaoLigada: 2, rascunhoMudou: false, ligada: { numero: 2, em: hoje("08:00"), por: MARINA },
    execucoes: { total: 2, concluidas: 1, andamento: 0, falhas: 1 },
    eventos: [{ tipo: "LIGADA", detalhe: { numero: 2 }, pessoa: MARINA, em: hoje("08:00") }, { tipo: "CRIADA", detalhe: {}, pessoa: GUSTAVO, em: hoje("07:00") }] };
  const pedidos = await simular(page, {
    "/v1/escritorio": { corpo: ESCRITORIO },
    "GET /v1/escritorio/automacoes": { corpo: LISTA },
    [`GET /v1/escritorio/automacoes/${ID}`]: () => ({ corpo: atual }),
    [`GET /v1/escritorio/automacoes/${ID}/execucoes`]: { corpo: { temMais: false, itens: [
      { id: "x1", cliente: { id: "c2", nome: "Construtora Alves" }, rotulo: "Parcela 2 de 6", versao: 2,
        caminho: [{ passo: "gatilho", situacao: "OK" }, { passo: "msg", situacao: "FALHOU" }], situacao: "FALHOU",
        motivo: "O número não tem WhatsApp.", responsavel: GUSTAVO, conversaId: null, iniciadaEm: hoje("09:00"), terminadaEm: null },
      { id: "x2", cliente: { id: "c1", nome: "Farmácia Bom Jesus" }, rotulo: "Mensalidade de novembro", versao: 2,
        caminho: [{ passo: "gatilho", situacao: "OK" }, { passo: "msg", situacao: "OK" }], situacao: "CONCLUIDA",
        motivo: null, responsavel: null, conversaId: null, iniciadaEm: hoje("08:30"), terminadaEm: hoje("08:31") },
    ] } },
    [`POST /v1/escritorio/automacoes/${ID}/desligar`]: (c) => {
      atual = { ...(atual as object), situacao: "DESLIGADA", versao: 7, desligada: { em: hoje("11:00"), motivo: (c as { motivo: string }).motivo, por: MARINA } };
      return { corpo: atual };
    },
  });
  await page.goto(`${P}/conversas/automacoes?a=${ID}&passo=historico`);
  await expect(page.getByRole("heading", { name: "Execuções" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Falha precisa de alguém" })).toBeVisible();
  await expect(page.getByText("A conversa passou para Gustavo Lima.")).toBeVisible();
  await expect(page.getByText("Marina Ribeiro ligou a versão 2.")).toBeVisible();
  await semViolacoes(page);

  await page.getByRole("button", { name: "Desligar" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Desligar" }).click();
  await expect(page.getByText("Escreva o motivo.")).toBeVisible();
  await page.getByLabel("Motivo").fill("Vamos mudar o texto no fim do mês");
  await page.getByRole("alertdialog").getByRole("button", { name: "Desligar" }).click();
  await expect(page.getByText("Automação desligada.")).toBeVisible();
  expect(pedidos.find((x) => x.caminho.endsWith("/desligar"))?.corpo).toEqual({ versao: 5, motivo: "Vamos mudar o texto no fim do mês" });
});

test("PA-03: quem não é a sócia dona monta e testa, mas não liga; sugere a mudança", async ({ page }) => {
  const pag = { ...PRONTA_PAG, eu: GUSTAVO.id, dono: false };
  const pedidos = await simular(page, {
    "/v1/escritorio": { corpo: GUSTAVO_ESC },
    "GET /v1/escritorio/automacoes": { corpo: { ...LISTA, dono: false, areas: ["FINANCEIRO"] } },
    [`GET /v1/escritorio/automacoes/${ID}`]: { corpo: pag },
    [`POST /v1/escritorio/automacoes/${ID}/sugerir-mudanca`]: { corpo: pag },
  });
  await page.goto(`${P}/conversas/automacoes?a=${ID}`);
  await expect(page.getByRole("heading", { name: "Você está neste fluxo" })).toBeVisible();
  await expect(page.getByText("O passo 7 é com você.")).toBeVisible();
  await page.getByRole("link", { name: /Ligar/ }).first().click();
  await expect(page.getByText("Você pode ver e testar, não ligar")).toBeVisible();
  await expect(page.getByRole("button", { name: "Ligar a automação" })).toHaveCount(0);
  await semViolacoes(page);
  await page.getByRole("button", { name: "Sugerir mudança a Marina" }).click();
  await page.getByLabel("O que mudar").fill("Esperar 7 dias em vez de 5");
  await page.getByRole("button", { name: "Enviar sugestão" }).click();
  await expect(page.getByText("Sugestão enviada.")).toBeVisible();
  expect(pedidos.find((x) => x.caminho.endsWith("/sugerir-mudanca"))?.corpo).toEqual({ texto: "Esperar 7 dias em vez de 5" });
});

test.describe("no celular", () => {
  test("PA-03: a lista vira cartões e o desenho avisa que adicionar e mover ficam no computador", async ({ page }) => {
    await simular(page, {
      "/v1/escritorio": { corpo: ESCRITORIO },
      "GET /v1/escritorio/automacoes": { corpo: LISTA },
      [`GET /v1/escritorio/automacoes/${ID}`]: { corpo: PRONTA_PAG },
    });
    await page.goto(`${P}/conversas/automacoes`);
    await expect(page.getByRole("list", { name: "Prontas do T3jus" })).toBeVisible();
    await semViolacoes(page);
    await page.goto(`${P}/conversas/automacoes?a=${ID}`);
    await expect(page.getByText("Para adicionar, mover ou apagar passos, use o computador.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Adicionar passo" })).toBeHidden();
    await semViolacoes(page);
  });

  test("PA-03: sem WhatsApp ligado, dá para montar e as prontas esperam", async ({ page }) => {
    await simular(page, {
      "/v1/escritorio": { corpo: ESCRITORIO },
      "GET /v1/escritorio/automacoes": { corpo: { ...LISTA, whatsapp: { situacao: "NAO_LIGADO" }, automacoes: [pronta] } },
    });
    await page.goto(`${P}/conversas/automacoes`);
    await expect(page.getByRole("heading", { name: "Automações precisam do WhatsApp ligado" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "A pronta espera" })).toBeVisible();
    await semViolacoes(page);
  });
});
