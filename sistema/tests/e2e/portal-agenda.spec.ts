// Agenda do Portal (tela aprovada em docs/design/aprovadas/portal-agenda-conversas): semana,
// mês e dia, filtro por pessoa, quem não tem o Jurídico, marcar com erros presos ao campo,
// tipo "Outro", ficha com lembrete e cancelar com motivo. A API é simulada; aqui se testa a
// tela, a acessibilidade e o que ela manda ao servidor.
import { expect, test, type Page } from "@playwright/test";
import { semViolacoes } from "./console-dados.ts";

const P = "http://localhost:3000";
const ESC = "e0000000-0000-4000-8000-0000000000a1";
const MARINA = { id: "a0000000-0000-4000-8000-000000000101", nome: "Marina Ribeiro" };
const LARISSA = { id: "a0000000-0000-4000-8000-000000000102", nome: "Larissa Costa" };
const PAULA = { id: "a0000000-0000-4000-8000-000000000104", nome: "Paula Nunes" };
const cid = (n: number) => `b1000000-0000-4000-8000-0000000001${String(n).padStart(2, "0")}`;
const CLIENTE = "c1000000-0000-4000-8000-000000000101";

const ESCRITORIO = {
  id: ESC, nome: "Ribeiro & Matos", pessoa: "Marina Ribeiro", dono: true, areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"],
  socios: ["Marina Ribeiro"], pessoas: 5, outrosEscritorios: 0, funcoes: ["SOCIO"], cnpj: null, cidade: "São Paulo", uf: "SP", endereco: null,
  contatos: [], ultimaExportacao: null,
};
const SEM_AREA = { ...ESCRITORIO, pessoa: "Paula Nunes", dono: false, areas: [], funcoes: ["EQUIPE"] };

/** Dia em Brasília, aaaa-mm-dd, a n dias de hoje. */
const dia = (n: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(Date.now() + n * 864e5));
const em = (n: number, h: string) => `${dia(n)}T${h}:00-03:00`;
const br = (n: number) => dia(n).split("-").reverse().join("/");

const comp = (n: number, extra: Record<string, unknown>) => ({
  id: cid(n), tipo: "CLIENTE", tipoEscrito: null, titulo: "Reunião", inicio: em(0, "14:30"), fim: em(0, "15:30"), modalidade: "PRESENCIAL",
  local: "Escritório", situacao: "MARCADO", lembrete: false, responsavel: LARISSA, tambemVai: [], cliente: null, ...extra,
});
const AUDIENCIA = comp(1, {
  tipo: "AUDIENCIA", titulo: "Conciliação · Teixeira x Banco Horizonte", inicio: em(1, "11:00"), fim: em(1, "12:00"), modalidade: "VIRTUAL",
  local: null, lembrete: true, responsavel: MARINA, tambemVai: [LARISSA], cliente: { id: CLIENTE, nome: "Gabriela Teixeira" },
});
const PERICIA = comp(2, { tipo: "OUTRO", tipoEscrito: "Perícia", titulo: "Perícia médica · Andrade x Unimed", inicio: em(0, "16:00"), fim: em(0, "17:00") });
const CANCELADO = comp(3, { tipo: "INTERNO", titulo: "Reunião de sócios", inicio: em(0, "09:00"), fim: em(0, "09:45"), situacao: "CANCELADO", responsavel: MARINA });
const AGENDA = { juridico: true, algum: true, compromissos: [CANCELADO, comp(4, {}), PERICIA, AUDIENCIA], feriados: [], prazos: [], tiposEscritos: ["Perícia"] };

const FICHA = {
  ...AUDIENCIA, linkSala: "https://teams.microsoft.com/l/meetup-join/abc", observacoes: "Levar a planilha de cálculo atualizada.", versao: 2,
  criadoEm: em(-10, "09:12"), criadoPor: LARISSA,
  contatoCliente: { id: "k1", nome: "Gabriela Teixeira", papel: null, telefone: "+5511996027735", email: null },
  cancelamento: null,
  historico: [
    { em: em(-10, "09:12"), acao: "compromisso.marcado", autor: "Larissa Costa", dados: { inicio: em(1, "14:00"), tipo: "AUDIENCIA", lembrete: true } },
    { em: em(-3, "16:40"), acao: "compromisso.remarcado", autor: "Larissa Costa", dados: { de: em(1, "14:00"), para: em(1, "11:00"), motivo: "redesignação publicada" } },
  ],
};
const CLIENTES = {
  comercial: true,
  clientes: [{ id: CLIENTE, tipo: "PF", nome: "Gabriela Teixeira", situacao: "ATIVO", versao: 1, contatoPrincipal: { id: "k1", nome: "Gabriela Teixeira", papel: null, telefone: "+5511996027735", email: null } }],
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

const comuns = (escritorio = ESCRITORIO, agenda: unknown = AGENDA) => ({
  "/v1/escritorio": { corpo: escritorio },
  "/v1/escritorio/pessoas": { corpo: { pessoas: [LARISSA, MARINA, PAULA] } },
  "GET /v1/escritorio/clientes": { corpo: CLIENTES },
  "GET /v1/escritorio/agenda": { corpo: agenda },
});
const ehCelular = (page: Page) => (page.viewportSize()?.width ?? 1000) <= 760;
/** A semana do computador ou a lista do celular, conforme a tela. */
const visivel = (page: Page) => page.locator(ehCelular(page) ? ".so-cel" : ".so-pc");

test.describe("Agenda do Portal (EX-06, PD-07)", () => {
  test("semana da equipe toda: tipos escritos, cancelado riscado e o período certo", async ({ page }) => {
    const pedidos = await simular(page, comuns());
    await page.goto(`${P}/agenda`);
    await expect(page.getByRole("heading", { level: 1, name: "Agenda" })).toBeVisible();
    await expect(page.locator(".ag-leg").getByText("Prazo do Jurídico")).toBeVisible();
    await expect(page.locator(".ag-leg").getByText("Perícia")).toBeVisible();
    const pedido = pedidos.find((p) => p.caminho === "/v1/escritorio/agenda")!;
    expect(pedido.busca).toMatch(/^\?de=\d{4}-\d{2}-\d{2}&ate=\d{4}-\d{2}-\d{2}$/);
    await expect(visivel(page).getByRole("link", { name: /Perícia médica/ }).first()).toBeVisible();
    await expect(visivel(page).getByRole("link", { name: /Cancelado: Reunião de sócios/ }).first()).toBeAttached();
    await semViolacoes(page);
  });

  test("filtro por pessoa vai para o endereço e diz o que mostra", async ({ page }) => {
    const pedidos = await simular(page, comuns());
    await page.goto(`${P}/agenda`);
    await page.getByLabel("Mostrar a agenda de").selectOption(LARISSA.id);
    await expect(page).toHaveURL(new RegExp(`pessoa=${LARISSA.id}`));
    await expect(page.getByRole("status").filter({ hasText: "Mostrando só a agenda de Larissa Costa" })).toBeVisible();
    expect(pedidos.some((p) => p.busca.includes(`pessoa=${LARISSA.id}`))).toBe(true);
    await semViolacoes(page);
  });

  test("quem não tem o Jurídico não vê prazos e sabe quem libera", async ({ page }) => {
    await simular(page, comuns(SEM_AREA, { ...AGENDA, juridico: false, prazos: null }));
    await page.goto(`${P}/agenda`);
    await expect(page.getByText("Os prazos processuais ficam na área Jurídico, que não está liberada para você.", { exact: false })).toBeVisible();
    await expect(page.locator(".ag-leg").getByText("Prazo do Jurídico")).toHaveCount(0);
    await semViolacoes(page);
  });

  test("mês e dia", async ({ page }) => {
    await simular(page, comuns());
    await page.goto(`${P}/agenda?ver=mes`);
    await expect(page.getByRole("link", { name: "Mês", exact: true })).toHaveAttribute("aria-current", "page");
    await semViolacoes(page);
    await page.goto(`${P}/agenda?ver=dia&dia=${dia(0)}`);
    await expect(page.getByRole("heading", { name: "Lembretes aos clientes" })).toBeVisible();
    await expect(page.getByText("Google Agenda e Outlook")).toBeVisible();
    await expect(page.getByText("Em estudo")).toBeVisible();
    await semViolacoes(page);
  });

  test("agenda vazia mostra como começar", async ({ page }) => {
    await simular(page, comuns(ESCRITORIO, { ...AGENDA, algum: false, compromissos: [] }));
    await page.goto(`${P}/agenda`);
    await expect(page.getByRole("heading", { name: "A agenda do escritório começa aqui" })).toBeVisible();
    await semViolacoes(page);
  });
});

const CASO = { id: "b2000000-0000-4000-8000-000000000001", nome: "Pereira x Mercado Bom Preço", numero: "10010225120265020045", parteContraria: "Mercado Bom Preço Ltda." };
const PRAZO_HOJE = {
  id: "b3000000-0000-4000-8000-000000000001", titulo: "Recurso ordinário", vence: dia(0), fazerAte: null, processo: "1001022-51.2026.5.02.0045",
  caso: { id: CASO.id, nome: CASO.nome }, responsavel: MARINA,
};

test.describe("O Jurídico na Agenda (F3.4: PD-04, PD-07, EX-06)", () => {
  test("o prazo aparece no dia, com o processo e o caminho para o caso", async ({ page }) => {
    await simular(page, comuns(ESCRITORIO, { ...AGENDA, prazos: [PRAZO_HOJE] }));
    await page.goto(`${P}/agenda?ver=dia&dia=${dia(0)}`);
    const pz = page.getByRole("list", { name: "Prazos do Jurídico" }).getByRole("listitem").filter({ hasText: "Recurso ordinário" });
    await expect(pz).toContainText("1001022-51.2026.5.02.0045 · Marina Ribeiro");
    await expect(pz).toContainText("Vence hoje");
    await expect(pz.getByRole("link", { name: "Abrir no Jurídico" })).toHaveAttribute("href", `/juridico/casos/${CASO.id}`);
    await semViolacoes(page);
  });

  test("o compromisso escolhe o processo e o manda ao servidor", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(), "GET /v1/escritorio/agenda/casos": { corpo: [CASO] },
      "POST /v1/escritorio/compromissos": { status: 201, corpo: { id: cid(9), versao: 1 } },
    });
    await page.goto(`${P}/agenda`);
    await page.getByRole("button", { name: "Novo compromisso", exact: true }).click();
    const j = page.getByRole("dialog", { name: "Novo compromisso" });
    await j.getByLabel("O que é").fill("Audiência de instrução");
    await j.getByLabel("Dia").fill(br(2));
    await j.getByLabel("Começa").fill("14:00");
    await j.getByLabel("Termina").fill("15:00");
    await j.getByLabel("Processo").selectOption(CASO.id);
    await expect(j.getByLabel("Processo")).toContainText("Pereira x Mercado Bom Preço · 1001022-51.2026.5.02.0045");
    await semViolacoes(page);
    await j.getByRole("button", { name: "Marcar compromisso" }).click();
    await expect.poll(() => pedidos.find((p) => p.metodo === "POST")?.corpo).toMatchObject({ casoId: CASO.id });
  });

  test("sem o Jurídico, a janela não pergunta o processo nem manda o campo", async ({ page }) => {
    const pedidos = await simular(page, { ...comuns(SEM_AREA, { ...AGENDA, juridico: false, prazos: null }), "POST /v1/escritorio/compromissos": { status: 201, corpo: { id: cid(9), versao: 1 } } });
    await page.goto(`${P}/agenda`);
    await page.getByRole("button", { name: "Novo compromisso", exact: true }).click();
    const j = page.getByRole("dialog", { name: "Novo compromisso" });
    await expect(j.getByLabel("Processo")).toHaveCount(0);
    expect(pedidos.some((p) => p.caminho === "/v1/escritorio/agenda/casos")).toBe(false);
  });
});

test.describe("Marcar compromisso (EX-06, EX-11)", () => {
  test("erros presos ao campo e o pedido que vai ao servidor", async ({ page }) => {
    const pedidos = await simular(page, { ...comuns(), "POST /v1/escritorio/compromissos": { status: 201, corpo: { id: cid(9), versao: 1 } } });
    await page.goto(`${P}/agenda`);
    await page.getByRole("button", { name: "Novo compromisso", exact: true }).click();
    const j = page.getByRole("dialog", { name: "Novo compromisso" });
    await expect(j).toBeVisible();
    await expect(j.getByLabel("Lembrar Gabriela pelo WhatsApp")).toHaveCount(0);
    await j.getByLabel("Virtual, com link da sala").check();
    await j.getByLabel("Dia").fill(br(1));
    await j.getByLabel("Começa").fill("16:00");
    await j.getByLabel("Termina").fill("15:00");
    await j.getByRole("button", { name: "Marcar compromisso" }).click();
    await expect(j.getByText("Falta acertar 3 pontos, marcados abaixo.")).toBeVisible();
    await expect(j.getByLabel("O que é")).toHaveAttribute("aria-invalid", "true");
    await expect(j.getByText("Termina antes de começar. Confira as horas.")).toBeVisible();
    await expect(j.getByText("Cole o link da sala virtual, ou marque Presencial.")).toBeVisible();
    await semViolacoes(page);
    await j.getByLabel("O que é").fill("Conciliação · Mendes x Loja Bela Casa");
    await j.getByLabel("Termina").fill("17:00");
    await j.getByLabel("Link da sala", { exact: true }).fill("https://teams.microsoft.com/l/meetup-join/xyz");
    await j.getByLabel("Cliente", { exact: true }).selectOption(CLIENTE);
    await expect(j.getByLabel("Lembrar Gabriela pelo WhatsApp")).toBeChecked();
    await j.getByLabel("Responsável").selectOption(LARISSA.id);
    await j.getByRole("button", { name: "Marcar compromisso" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Audiência marcada para" })).toBeVisible();
    const corpo = pedidos.find((p) => p.metodo === "POST")!.corpo as Record<string, unknown>;
    expect(corpo).toMatchObject({
      tipo: "AUDIENCIA", titulo: "Conciliação · Mendes x Loja Bela Casa", inicio: em(1, "16:00"), fim: em(1, "17:00"), modalidade: "VIRTUAL",
      linkSala: "https://teams.microsoft.com/l/meetup-join/xyz", clienteId: CLIENTE, responsavelId: LARISSA.id, lembrete: true, tambemVai: [],
    });
  });

  test("tipo Outro pede o tipo escrito", async ({ page }) => {
    await simular(page, comuns());
    await page.goto(`${P}/agenda`);
    await page.getByRole("button", { name: "Novo compromisso", exact: true }).click();
    const j = page.getByRole("dialog", { name: "Novo compromisso" });
    await j.getByLabel("Outro").check();
    await expect(j.getByLabel("Qual tipo")).toBeVisible();
    await j.getByLabel("O que é").fill("Perícia médica");
    await j.getByRole("button", { name: "Marcar compromisso" }).click();
    await expect(j.getByText("Escreva qual é o tipo, por exemplo Perícia ou Diligência.")).toBeVisible();
    await semViolacoes(page);
  });
});

test.describe("Ficha do compromisso (PT-25, PT-03)", () => {
  test("dados, lembrete ao cliente e histórico com o motivo", async ({ page }) => {
    await simular(page, { ...comuns(), [`GET /v1/escritorio/compromissos/${cid(1)}`]: { corpo: FICHA } });
    await page.goto(`${P}/agenda/${cid(1)}`);
    await expect(page.getByRole("heading", { level: 1, name: "Conciliação · Teixeira x Banco Horizonte" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Entrar na sala" })).toHaveAttribute("href", FICHA.linkSala);
    await expect(page.getByText("Por que lembrar.", { exact: false })).toBeVisible();
    await expect(page.getByText("O WhatsApp do escritório ainda não está ligado.", { exact: false })).toBeVisible();
    await expect(page.getByText("Motivo: redesignação publicada", { exact: false })).toBeVisible();
    await semViolacoes(page);
  });

  test("F3.3: o lembrete mostra o que saiu, a resposta da cliente e a conversa", async ({ page }) => {
    const ficha = {
      ...FICHA, whatsappLigado: true,
      lembretes: {
        umDia: em(0, "11:00"), horasAntes: 2, antes: em(1, "09:00"), situacao: "EM_ANDAMENTO", motivo: null, proximoEm: em(1, "09:00"),
        automacaoLigada: true, conversaId: "c0000000-0000-4000-8000-000000000001", previa: null,
        mensagens: [{ id: "m1", nome: "Lembrete · 1 dia antes", em: em(0, "11:00"), envio: "LIDA", envioEm: em(0, "11:01"), envioMotivo: null,
          texto: "Olá, Gabriela. Aqui é do escritório Ribeiro & Matos. Lembrete: Conciliação, no dia amanhã, às 11:00. Responda CONFIRMO." }],
        resposta: { em: em(0, "11:26"), texto: "Confirmo, estarei lá." },
      },
    };
    await simular(page, { ...comuns(), [`GET /v1/escritorio/compromissos/${cid(1)}`]: { corpo: ficha } });
    await page.goto(`${P}/agenda/${cid(1)}`);
    await expect(page.getByText("Confirmou presença")).toBeVisible();
    await expect(page.getByText("Lembrete de 1 dia antes enviado")).toBeVisible();
    await expect(page.getByText("Gabriela respondeu: “Confirmo, estarei lá.”")).toBeVisible();
    await expect(page.getByText("Lembrete de 2 horas antes, com o link da sala")).toBeVisible();
    await expect(page.getByText("Agendado", { exact: true })).toBeVisible();
    await expect(page.getByText("O WhatsApp do escritório ainda não está ligado.", { exact: false })).toHaveCount(0);
    await expect(page.getByText(`Mensagem enviada em ${br(0).slice(0, 5)}, às 11:00`)).toBeVisible();
    await expect(page.getByRole("link", { name: "Ver a conversa com Gabriela" })).toHaveAttribute("href", /c=c0000000-0000-4000-8000-000000000001/);
    await semViolacoes(page);
  });

  test("F3.3: cancelado, a ficha diz por que o aviso não saiu", async ({ page }) => {
    const ficha = {
      ...FICHA, situacao: "CANCELADO", whatsappLigado: true,
      cancelamento: { em: em(0, "10:00"), por: MARINA, motivo: "acordo fechado", avisar: true, aviso: { motivo: "Sem WhatsApp no contato principal da ficha.", mensagem: null } },
      lembretes: { umDia: em(0, "11:00"), horasAntes: 2, antes: em(1, "09:00"), situacao: "FICOU_DE_FORA", motivo: "O compromisso foi cancelado.", proximoEm: null,
        automacaoLigada: true, conversaId: null, previa: null, mensagens: [], resposta: null },
    };
    await simular(page, { ...comuns(), [`GET /v1/escritorio/compromissos/${cid(1)}`]: { corpo: ficha } });
    await page.goto(`${P}/agenda/${cid(1)}`);
    await expect(page.getByText("O aviso de cancelamento não saiu: sem WhatsApp no contato principal da ficha.", { exact: false })).toBeVisible();
    await semViolacoes(page);
  });

  test("cancelar pede motivo e não apaga", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(),
      [`GET /v1/escritorio/compromissos/${cid(1)}`]: [{ corpo: FICHA }, { corpo: { ...FICHA, situacao: "CANCELADO", versao: 3, cancelamento: { em: em(0, "10:00"), por: MARINA, motivo: "acordo fechado", avisar: true } } }],
      [`POST /v1/escritorio/compromissos/${cid(1)}/cancelar`]: { corpo: { versao: 3 } },
    });
    await page.goto(`${P}/agenda/${cid(1)}`);
    await page.getByRole("button", { name: "Cancelar compromisso" }).click();
    const j = page.getByRole("alertdialog");
    await expect(j.getByLabel("Avisar Gabriela pelo WhatsApp")).toBeChecked();
    await j.getByRole("button", { name: "Cancelar a audiência" }).click();
    await expect(j.getByText("Escreva o motivo. Ele fica no histórico.")).toBeVisible();
    await semViolacoes(page);
    await j.getByLabel("Motivo").fill("acordo fechado");
    await j.getByRole("button", { name: "Cancelar a audiência" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Compromisso cancelado." })).toBeVisible();
    expect(pedidos.find((p) => p.metodo === "POST")!.corpo).toEqual({ versao: 2, motivo: "acordo fechado", avisar: true });
    await expect(page.getByRole("button", { name: "Editar ou remarcar" })).toHaveCount(0);
  });
});
