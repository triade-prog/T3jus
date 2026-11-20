// Escritório › WhatsApp e IA (tela aprovada em docs/design/aprovadas/portal-whatsapp, estados
// nao-ligado, passos, numero-erro, em-analise, ligado, modelo-recusado, desligar, ia, ia-passar,
// ia-saber, ia-ligar, ia-ligada e so-leitura): ligar o número passo a passo, a saúde e os avisos
// na Meta, ajustar o texto recusado, desligar com motivo, e como a IA atende (salvar com versão,
// palavras, respostas, ligar e pausar). A API é simulada; aqui se testa a tela, a
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
const PAULA_ESC = { ...ESCRITORIO, pessoa: "Paula Nunes", dono: false, areas: [], funcoes: ["EQUIPE"] };

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
const DIEGO = { id: "aa000000-0000-4000-8000-000000000002", nome: "Diego Almeida" };
const PAULA = { id: "aa000000-0000-4000-8000-000000000003", nome: "Paula Nunes" };
const hoje = (hh: string) => new Date(`${new Date().toISOString().slice(0, 10)}T${hh}:00-03:00`).toISOString();

const CHAVES = ["PAGAMENTO_RECEBIDO", "PARCELA_VAI_VENCER", "PARCELA_ATRASO", "ETAPA_CASO", "LEMBRETE_AUDIENCIA", "PRESTACAO_CONTAS"];
const avisos = (sit: string, mudar: Record<string, object> = {}) =>
  CHAVES.map((chave) => ({ chave, versao: 2, situacao: sit, situacaoEm: hoje("09:00"), texto: "Olá, {nome}. Texto do aviso.", motivoSimples: null, sugestaoIa: null, ...mudar[chave] }));

const BASE = {
  dono: true, quemCuida: MARINA, escritorio: { nome: "Ribeiro & Matos", cnpj: "41276839000134" },
  numero: null, rascunho: null, avisos: [], historico: [], ia: { situacao: "DESLIGADA" },
};
const NUMERO = {
  versao: 4, situacao: "LIGADO", numero: "+5511974052210", nomeExibicao: "Ribeiro & Matos Advocacia", nomeSituacao: "APROVADO", qualidade: "ALTA",
  limiteDia: 250, usadasHoje: 18, empresaVerificada: "EM_ANALISE", usaAppCelular: true, ligadoEm: hoje("08:00"), ligadoPor: MARINA,
  desligadoEm: null, desligadoPor: null, desligadoMotivo: null, temConta: true, avisosEntreguesMes: 214,
};
const LIGADO = {
  ...BASE, numero: NUMERO, avisos: avisos("APROVADO"),
  historico: [
    { tipo: "NOME", detalhe: { situacao: "APROVADO" }, pessoa: null, em: hoje("09:12") },
    { tipo: "LIGADO", detalhe: { numero: "+5511974052210" }, pessoa: MARINA, em: hoje("08:00") },
  ],
};
const CONFIG = {
  nome: "Assistente virtual do Ribeiro & Matos", apresentacao: "Olá! Sou a assistente virtual do escritório Ribeiro & Matos.", tom: "CORDIAL",
  assuntos: ["ANDAMENTO_CASO", "COMPROMISSOS", "PARCELAS", "DOCUMENTOS", "ENDERECO_HORARIO", "ARQUIVOS"], palavras: ["despejo", "penhora"],
  dias: [1, 2, 3, 4, 5], horaInicio: "09:00", horaFim: "18:00",
  msgForaHorario: "Recebi sua mensagem. Uma pessoa vai ver {próximo atendimento}.", telefoneUrgencia: null,
};
const IA = {
  dono: true, quemCuida: MARINA, comercial: DIEGO, whatsapp: { situacao: "LIGADO", numero: "+5511974052210" }, versao: 3, situacao: "DESLIGADA",
  config: CONFIG, ligadaEm: null, ligadaPor: null, pausadaEm: null, pausadaPor: null, testadaEm: null, testadaComo: null,
  respostas: [
    { id: "r1", versao: 1, pergunta: "Estacionamento", resposta: "O prédio não tem estacionamento para visitantes.", situacao: "PUBLICADA",
      escritaPor: MARINA, escritaEm: hoje("08:30"), publicadaPor: MARINA, publicadaEm: hoje("08:30") },
    { id: "r2", versao: 1, pergunta: "Formas de pagamento", resposta: "Pix, boleto e cartão.", situacao: "SUGERIDA",
      escritaPor: PAULA, escritaEm: hoje("08:40"), publicadaPor: null, publicadaEm: null },
  ],
  naoSoube: [], desdeQueLigou: null, historico: [],
};

async function entrar(page: Page, esc = ESCRITORIO) {
  return { "/v1/escritorio": { corpo: esc } } as Record<string, Resp>;
}

test("PA-04: sem número, a sócia dona liga passo a passo; fixo pede ligação de voz; o rascunho fica salvo", async ({ page }) => {
  const pedidos = await simular(page, {
    ...(await entrar(page)),
    "GET /v1/escritorio/whatsapp": { corpo: BASE },
    "GET /v1/escritorio/ia": { corpo: { ...IA, whatsapp: { situacao: "NAO_LIGADO", numero: null } } },
    "POST /v1/escritorio/whatsapp/conferir-numero": (c) => {
      const d = c as { telefone: string; receberCodigo: string; confirmouNumero: boolean };
      if (d.receberCodigo === "SMS" && d.telefone.includes("3032")) {
        return { status: 422, corpo: { erro: { codigo: "VALIDATION_ERROR", detalhes: { campos: ["receberCodigo"], motivos: { receberCodigo: "FIXO_SEM_SMS" } } } } };
      }
      return { corpo: { versao: 1, passo: 2, telefone: "+551130324410", receberCodigo: d.receberCodigo, usaAppCelular: false, confirmouNumero: true, atualizadoEm: hoje("10:00"), atualizadoPor: MARINA } };
    },
  });
  await page.goto(`${P}/meu-escritorio/whatsapp`);
  await expect(page.getByRole("heading", { level: 1, name: "WhatsApp e IA" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Seções do Escritório" }).getByRole("link", { name: "WhatsApp e IA" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { name: "Ligue o WhatsApp do escritório" })).toBeVisible();
  await expect(page.getByText("41.276.839/0001-34")).toBeVisible();
  await semViolacoes(page);

  await page.getByRole("link", { name: "Começar a ligar" }).click();
  await expect(page).toHaveURL(/ligar=1/);
  await expect(page.getByRole("heading", { name: "Qual número os clientes vão usar?" })).toBeVisible();
  await page.getByLabel("Número do WhatsApp do escritório").fill("(11) 3032-4410");
  await page.getByText("Confirmo que este número é do escritório").click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByText("Número fixo não recebe SMS. Escolha “Por ligação de voz”")).toBeVisible();
  await semViolacoes(page);
  await page.getByRole("radio", { name: /Por ligação de voz/ }).check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("heading", { name: "Agora abrimos a janela da Meta" })).toBeVisible();
  await expect(page.locator(".wa-passos [aria-current=step]")).toContainText("Meta");
  const conf = pedidos.filter((p) => p.caminho === "/v1/escritorio/whatsapp/conferir-numero").at(-1)!;
  expect(conf.corpo).toEqual({ telefone: "(11) 3032-4410", receberCodigo: "VOZ", usaAppCelular: false, confirmouNumero: true });
  await page.getByRole("button", { name: "Abrir a janela da Meta" }).click();
  await expect(page.getByText("A janela da Meta ainda não abre por aqui")).toBeVisible();
  await semViolacoes(page);
});

test("PA-04: número ligado mostra a saúde, os avisos e o histórico; desligar pede motivo e confirmação", async ({ page }) => {
  const pedidos = await simular(page, {
    ...(await entrar(page)),
    "GET /v1/escritorio/whatsapp": { corpo: LIGADO },
    "GET /v1/escritorio/ia": { corpo: IA },
    "POST /v1/escritorio/whatsapp/desligar": { corpo: { ...LIGADO, numero: { ...NUMERO, situacao: "DESLIGADO", desligadoEm: hoje("10:20"), desligadoPor: MARINA, desligadoMotivo: "Trocar de número" } } },
  });
  await page.goto(`${P}/meu-escritorio/whatsapp`);
  await expect(page.getByRole("heading", { name: "(11) 97405-2210" })).toBeVisible();
  await expect(page.getByText("18 de 250 hoje")).toBeVisible();
  await expect(page.getByText("Este mês: 214 avisos entregues.")).toBeVisible();
  await expect(page.getByText("A Meta aprovou o nome.")).toBeVisible();
  await semViolacoes(page);

  await page.getByRole("button", { name: "Desligar o WhatsApp" }).click();
  const j = page.getByRole("alertdialog", { name: "Desligar o WhatsApp do escritório?" });
  await expect(j).toBeVisible();
  await semViolacoes(page);
  await j.getByRole("button", { name: "Desligar o WhatsApp" }).click();
  await expect(j.getByText("Escreva o motivo.")).toBeVisible();
  await expect(j.getByText("Confirme que entendeu.")).toBeVisible();
  await j.getByLabel("Motivo").fill("Trocar de número");
  await j.getByText("Entendi que os avisos aos clientes param agora").click();
  await j.getByRole("button", { name: "Desligar o WhatsApp" }).click();
  await expect(page.getByText("WhatsApp desligado", { exact: true })).toBeVisible();
  await expect(page.getByText("Motivo: Trocar de número.")).toBeVisible();
  expect(pedidos.find((p) => p.caminho === "/v1/escritorio/whatsapp/desligar")!.corpo).toEqual({ versao: 4, motivo: "Trocar de número", entendi: true });
});

test("PA-04: aviso recusado volta com o motivo e a sugestão da IA; o texto não começa nem termina com campo", async ({ page }) => {
  const recusado = { ...LIGADO, avisos: avisos("APROVADO", { PARCELA_ATRASO: { situacao: "RECUSADO", texto: "{nome}, sua parcela venceu. Pague: {link}",
    motivoSimples: "O texto começa com um campo e termina com outro.", sugestaoIa: "Olá, {nome}. A parcela {parcela} venceu. Qualquer dúvida, é só responder." } }) };
  const pedidos = await simular(page, {
    ...(await entrar(page)),
    "GET /v1/escritorio/whatsapp": { corpo: recusado },
    "GET /v1/escritorio/ia": { corpo: IA },
    "POST /v1/escritorio/whatsapp/avisos/PARCELA_ATRASO": { corpo: { ...LIGADO, avisos: avisos("APROVADO", { PARCELA_ATRASO: { situacao: "EM_ANALISE" } }) } },
  });
  await page.goto(`${P}/meu-escritorio/whatsapp`);
  await expect(page.getByRole("alert").filter({ hasText: "A Meta recusou o texto de “Parcela em atraso”" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Partes da página" })).toContainText("1 aviso recusado");
  await semViolacoes(page);
  await page.getByRole("alert").getByRole("link", { name: "Ajustar o texto" }).click();
  await expect(page.getByRole("heading", { name: "Ajustar o texto: Parcela em atraso" })).toBeVisible();
  await expect(page.getByText("O texto começa com um campo e termina com outro.")).toBeVisible();
  await semViolacoes(page);
  await page.getByRole("button", { name: "Aprovar o texto e mandar à Meta" }).click();
  await expect(page.getByText("A Meta pede que o texto não comece nem termine com um campo entre chaves.")).toBeVisible();
  await page.getByRole("button", { name: "Usar esta sugestão" }).click();
  await page.getByRole("button", { name: "Aprovar o texto e mandar à Meta" }).click();
  await expect(page.getByText("Texto mandado à Meta")).toBeVisible();
  expect(pedidos.find((p) => p.caminho.endsWith("/avisos/PARCELA_ATRASO"))!.corpo).toEqual({ versao: 2, texto: "Olá, {nome}. A parcela {parcela} venceu. Qualquer dúvida, é só responder." });
});

test("PA-04: como a IA atende, o nome diz assistente virtual, palavras, salvar com a versão e ligar pede teste", async ({ page }) => {
  const pedidos = await simular(page, {
    ...(await entrar(page)),
    "GET /v1/escritorio/whatsapp": { corpo: LIGADO },
    "GET /v1/escritorio/ia": { corpo: IA },
    "PATCH /v1/escritorio/ia": (c) => ({ corpo: { ...IA, versao: 4, config: { ...CONFIG, ...(c as object) } } }),
    "POST /v1/escritorio/ia/ligar": { status: 422, corpo: { erro: { codigo: "VALIDATION_ERROR", detalhes: { motivo: "SEM_TESTE" } } } },
  });
  await page.goto(`${P}/meu-escritorio/whatsapp?parte=ia`);
  await expect(page.getByText("A IA ainda está desligada")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Partes da IA" }).getByRole("link", { name: /Apresentação e assuntos/ })).toHaveAttribute("aria-current", "page");
  await semViolacoes(page);
  await page.getByLabel("Nome da assistente").fill("Carla do Ribeiro & Matos");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("O nome precisa começar com “Assistente virtual”.")).toBeVisible();
  expect(pedidos.some((p) => p.metodo === "PATCH")).toBe(false);
  await page.getByLabel("Nome da assistente").fill("Assistente virtual Ribeiro & Matos");
  await page.getByText("Formal").click();
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Vale na próxima mensagem. A versão anterior fica no histórico.")).toBeVisible();
  const patch = pedidos.find((p) => p.metodo === "PATCH")!.corpo as Record<string, unknown>;
  expect([patch.versao, patch.nome, patch.tom]).toEqual([3, "Assistente virtual Ribeiro & Matos", "FORMAL"]);

  await page.getByRole("link", { name: /Quando passa para alguém/ }).click();
  await expect(page).toHaveURL(/ia=passar/);
  await page.getByRole("button", { name: "Tirar “despejo”" }).click();
  await page.getByLabel("Nova palavra ou expressão").fill("Rescisão");
  await page.getByRole("button", { name: "Acrescentar" }).click();
  await semViolacoes(page);
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Vale na próxima mensagem. A versão anterior fica no histórico.")).toBeVisible();
  expect((pedidos.filter((p) => p.metodo === "PATCH").at(-1)!.corpo as { palavras: string[]; versao: number })).toMatchObject({ palavras: ["penhora", "rescisão"], versao: 4 });

  await page.getByRole("button", { name: "Ligar a IA" }).click();
  const j = page.getByRole("dialog", { name: "Ligar a IA do escritório" });
  await expect(j).toBeVisible();
  await semViolacoes(page);
  await j.getByRole("button", { name: "Ligar a IA" }).click();
  await expect(j.getByText("Confirme que testou e revisou.")).toBeVisible();
  await j.getByText("Testei a IA e revisei o que ela responde").click();
  await j.getByRole("button", { name: "Ligar a IA" }).click();
  await expect(j.getByText("Teste a IA sem enviar antes de ligar.")).toBeVisible();
  await expect(j.getByRole("link", { name: "Testar sem enviar" })).toBeVisible();
});

test("PA-04: o que ela sabe, sugestões, publicar e virar resposta; IA ligada mostra o dia e pausa num clique", async ({ page }) => {
  const ligada = { ...IA, situacao: "LIGADA", ligadaEm: hoje("08:00"), ligadaPor: MARINA, testadaEm: hoje("07:50"), testadaComo: "Antônia",
    desdeQueLigou: { conversas: 4, resolvidasIa: 3, passadas: 1 },
    naoSoube: [{ id: "q1", texto: "Vocês atendem aos sábados?", em: hoje("09:31"), conversa: { id: "c1", nome: "Hélio Batista Corrêa" } }],
    historico: [{ numero: 2, oQueMudou: "Ligou a IA", pessoa: MARINA, em: hoje("08:00") }] };
  const pedidos = await simular(page, {
    ...(await entrar(page)),
    "GET /v1/escritorio/whatsapp": { corpo: { ...LIGADO, ia: { situacao: "LIGADA" } } },
    "GET /v1/escritorio/ia": { corpo: ligada },
    "PATCH /v1/escritorio/ia/respostas/r2": { corpo: { ...ligada, respostas: [IA.respostas[0], { ...IA.respostas[1], situacao: "PUBLICADA" }] } },
    "POST /v1/escritorio/ia/respostas": { corpo: { ...ligada, naoSoube: [] } },
    "POST /v1/escritorio/ia/pausar": { corpo: { ...ligada, situacao: "PAUSADA", pausadaEm: hoje("10:30"), pausadaPor: MARINA } },
  });
  await page.goto(`${P}/meu-escritorio/whatsapp?parte=ia`);
  await expect(page.getByText("A IA está ligada")).toBeVisible();
  await expect(page.getByText("resolvidas pela IA")).toBeVisible();
  await expect(page.getByText("ligou a IA.")).toBeVisible();
  await semViolacoes(page);

  await page.getByRole("link", { name: /O que ela sabe/ }).click();
  await expect(page.getByText("Sugerida por Paula")).toBeVisible();
  await page.getByRole("button", { name: /^Publicar.*Formas de pagamento/ }).click();
  await expect(page.getByText("Resposta publicada", { exact: true })).toBeVisible();
  expect(pedidos.find((p) => p.caminho === "/v1/escritorio/ia/respostas/r2")!.corpo).toEqual({ versao: 1, situacao: "PUBLICADA" });
  await page.getByRole("button", { name: "Fechar aviso" }).click();
  await page.getByRole("button", { name: "Virar resposta do escritório" }).click();
  const j = page.getByRole("dialog", { name: "Nova resposta do escritório" });
  await expect(j.getByLabel("Assunto")).toHaveValue("Vocês atendem aos sábados?");
  await j.getByLabel("Resposta").fill("Não atendemos aos sábados.");
  await semViolacoes(page);
  await j.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Nada por enquanto")).toBeVisible();
  expect(pedidos.find((p) => p.metodo === "POST" && p.caminho === "/v1/escritorio/ia/respostas")!.corpo)
    .toEqual({ pergunta: "Vocês atendem aos sábados?", resposta: "Não atendemos aos sábados.", perguntaId: "q1" });

  await page.getByRole("button", { name: "Fechar aviso" }).click();
  await page.getByRole("button", { name: "Pausar a IA agora" }).click();
  await expect(page.getByText("A IA está pausada")).toBeVisible();
  expect(pedidos.find((p) => p.caminho === "/v1/escritorio/ia/pausar")!.corpo).toEqual({ versao: 3 });
});

test("PA-02: quem não é a sócia dona vê para ler, sem trocar, desligar, salvar nem o gasto na Meta", async ({ page }) => {
  await simular(page, {
    ...(await entrar(page, PAULA_ESC)),
    "GET /v1/escritorio/whatsapp": { corpo: { ...LIGADO, dono: false, numero: { ...NUMERO, avisosEntreguesMes: null } } },
    "GET /v1/escritorio/ia": { corpo: { ...IA, dono: false } },
  });
  await page.goto(`${P}/meu-escritorio/whatsapp`);
  await expect(page.getByText("Você vê esta página só para ler")).toBeVisible();
  await expect(page.getByRole("button", { name: "Desligar o WhatsApp" })).toHaveCount(0);
  await expect(page.getByText("avisos entregues")).toHaveCount(0);
  await expect(page.getByText(/Quem cuida: Marina Ribeiro/)).toBeVisible();
  await semViolacoes(page);
  await page.getByRole("link", { name: /Como a IA atende/ }).click();
  await expect(page.getByRole("button", { name: "Salvar" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Ligar a IA" })).toHaveCount(0);
  await expect(page.getByLabel("Nome da assistente")).toHaveAttribute("readonly", "");
  await semViolacoes(page);
});

test("PA-04: Escritório ganha a barra de seções com Dados do escritório e WhatsApp e IA", async ({ page }) => {
  await simular(page, { ...(await entrar(page)) });
  await page.goto(`${P}/meu-escritorio`);
  const nav = page.getByRole("navigation", { name: "Seções do Escritório" });
  await expect(nav.getByRole("link", { name: "Dados do escritório" })).toHaveAttribute("aria-current", "page");
  await expect(nav.getByRole("link", { name: "WhatsApp e IA" })).toHaveAttribute("href", "/meu-escritorio/whatsapp");
});
