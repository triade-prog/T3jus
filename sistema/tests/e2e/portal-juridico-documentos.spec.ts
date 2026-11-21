// Jurídico do Portal, parte 3b (tela aprovada em docs/design/aprovadas/portal-juridico, folha
// "Documentos" da ficha do caso): os que faltam, com quem está e quando foram pedidos, "Pedir de
// novo" com o texto pronto, "Já chegou" com ou sem arquivo, os ligados ao caso com "Enviar
// arquivo" e "Abrir", e o que falta em "O que está travando". A API e o Storage são simulados.
import { expect, test, type Page } from "@playwright/test";
import { semViolacoes } from "./console-dados.ts";

const P = "http://localhost:3000";
const ESC = "e0000000-0000-4000-8000-0000000000a1";
const ESCRITORIO = {
  id: ESC, nome: "Ribeiro & Matos", pessoa: "Marina Ribeiro", dono: true, areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"],
  socios: ["Marina Ribeiro"], pessoas: 5, outrosEscritorios: 0, funcoes: ["SOCIO"], cnpj: null, cidade: "São Paulo", uf: "SP", endereco: null,
  contatos: [], ultimaExportacao: null,
};

type Resp = { status?: number; corpo: unknown };
type Pedido = { metodo: string; caminho: string; corpo: unknown };

async function simular(page: Page, rotas: Record<string, Resp>) {
  const pedidos: Pedido[] = [];
  const envios: string[] = [];
  await page.route("**/arquivos-falsos/**", async (rota) => {
    envios.push(`${rota.request().method()} ${new URL(rota.request().url()).pathname}`);
    await rota.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
  await page.route("**/api/v1/**", async (rota) => {
    const url = new URL(rota.request().url());
    const caminho = url.pathname.replace(/^\/api/, "");
    const metodo = rota.request().method();
    pedidos.push({ metodo, caminho, corpo: rota.request().postDataJSON() });
    const x = rotas[`${metodo} ${caminho}`] ?? rotas[caminho] ?? { status: 404, corpo: { erro: { codigo: "NOT_FOUND" } } };
    await rota.fulfill({ status: x.status ?? 200, contentType: "application/json", body: JSON.stringify(x.corpo) });
  });
  return { pedidos, envios };
}

const MARINA = { id: "p1000000-0000-4000-8000-000000000001", nome: "Marina Ribeiro" };
const LARISSA = { id: "p1000000-0000-4000-8000-000000000002", nome: "Larissa Costa" };
const JOANA = { id: "c1000000-0000-4000-8000-000000000001", nome: "Joana Pereira" };
const CARLOS = { id: "c1000000-0000-4000-8000-000000000002", nome: "Carlos Dias" };
const CASO = "a1000000-0000-4000-8000-000000000001";
const PEDIDO_CTPS = "f1000000-0000-4000-8000-000000000001";
const PEDIDO_HOL = "f1000000-0000-4000-8000-000000000002";
const DOC = (n: number) => `f2000000-0000-4000-8000-00000000000${n}`;
const NOVO = "f2000000-0000-4000-8000-000000000009";

const FALTAM = [
  { id: PEDIDO_CTPS, descricao: "CTPS digital de Carlos", pedidoEm: "2026-11-10", repedidoEm: null, cliente: { ...CARLOS, telefone: "+5511971084426" }, pedidoPor: LARISSA },
  { id: PEDIDO_HOL, descricao: "Holerites de janeiro a março de 2025", pedidoEm: "2026-11-12", repedidoEm: null, cliente: { ...JOANA, telefone: "+5511985521034" }, pedidoPor: MARINA },
];
const DOCUMENTOS = [
  { id: DOC(1), categoria: "DECISAO", nome: "sentenca-07-11-2026.pdf", tipo: "application/pdf", tamanho: 421888, enviadoPor: MARINA, enviadoEm: "2026-11-07T15:00:00Z", pedido: null },
  { id: DOC(2), categoria: "PETICAO", nome: "peticao-inicial.pdf", tipo: "application/pdf", tamanho: 1153434, enviadoPor: LARISSA, enviadoEm: "2026-03-03T15:00:00Z", pedido: null },
];
const etapa = (n: number, nome: string) => ({ id: `e${n}`, ordem: n, nome, descricao: null, textoCliente: "x", avisaFinanceiro: false, final: n === 8, casos: 0 });
const FICHA = {
  id: CASO, nome: "Pereira x Mercado Bom Preço", area: "TRABALHISTA", numero: "10010225120265020045", situacao: "ANDAMENTO", resultado: null,
  parteContraria: "Mercado Bom Preço", cliente: JOANA, outrosClientes: 1, semContrato: false, etapa: { id: "e5", ordem: 5, nome: "Sentença", final: false },
  responsavel: MARINA, etapaDesde: "2026-11-07T13:00:00Z", proximoPrazo: null, pendencias: 2,
  tribunal: "TRT-2", vara: null, sistema: "PJe-JT", distribuidoEm: null, valorCausa: null, avisarCliente: true, encerradoEm: null, versao: 1,
  criadoEm: "2026-03-03T13:00:00Z", veHonorarios: true, quemTemContratos: [], mudancas: [],
  clientes: [{ ...JOANA, papel: "AUTOR", telefone: "+5511985521034", contrato: null }, { ...CARLOS, papel: "AUTOR", telefone: "+5511971084426", contrato: null }],
  etapas: [etapa(5, "Sentença"), etapa(6, "Recurso"), etapa(8, "Encerrado")],
  hoje: "2026-11-19", prazos: [], tarefas: [], escritorio: "Ribeiro & Matos", faltam: FALTAM, documentos: DOCUMENTOS,
};

const comuns = (ficha: unknown = FICHA) => ({
  "/v1/escritorio": { corpo: ESCRITORIO },
  "GET /v1/escritorio/pessoas": { corpo: { pessoas: [MARINA, LARISSA] } },
  [`GET /v1/escritorio/juridico/casos/${CASO}`]: { corpo: ficha },
});

const pdf = (nome: string, bytes = 1200) => ({ name: nome, mimeType: "application/pdf", buffer: Buffer.alloc(bytes, 1) });

test.describe("Jurídico do Portal, documentos do caso (EX-05, PD-05)", () => {
  test("Ficha: faltam, ligados, o que está travando e abrir um arquivo", async ({ page }) => {
    const { pedidos } = await simular(page, {
      ...comuns(),
      [`POST /v1/escritorio/juridico/documentos/${DOC(1)}/abrir`]: { corpo: { url: "https://storage.exemplo/ler/x?token=curto&download=sentenca.pdf", validadeSegundos: 60 } },
    });
    await page.addInitScript(() => {
      (window as unknown as { abertos: string[] }).abertos = [];
      window.open = (u?: string | URL) => { (window as unknown as { abertos: string[] }).abertos.push(String(u)); return null; };
    });
    await page.goto(`${P}/juridico/casos/${CASO}`);
    const docs = page.getByRole("region", { name: "Documentos" });
    await expect(docs.getByRole("heading", { name: "Faltam 2" })).toBeVisible();
    await expect(docs).toContainText("CTPS digital de Carlos");
    await expect(docs).toContainText("Com Carlos · pedido em 10/11");
    await expect(docs.getByRole("heading", { name: "Ligados ao caso · 2" })).toBeVisible();
    await expect(docs).toContainText("Decisão ou sentença");
    await expect(docs).toContainText("PDF · 412 KB · Marina Ribeiro · 07/11/2026");
    await expect(docs).toContainText("Nada é apagado");
    const trava = page.getByRole("region", { name: "O que está travando" });
    await expect(trava).toContainText("Esperando Carlos: CTPS digital de Carlos, há 9 dias.");
    await semViolacoes(page);

    await docs.getByRole("button", { name: "Abrir sentenca-07-11-2026.pdf" }).click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { abertos: string[] }).abertos)).toEqual(["https://storage.exemplo/ler/x?token=curto"]);
    expect(pedidos.some((p) => p.caminho === `/v1/escritorio/juridico/documentos/${DOC(1)}/abrir`)).toBe(true);
  });

  test("Pedir documento: confere os campos e registra com quem está", async ({ page }) => {
    const { pedidos } = await simular(page, {
      ...comuns({ ...FICHA, faltam: [], documentos: [], pendencias: 0 }),
      [`POST /v1/escritorio/juridico/casos/${CASO}/pedidos`]: { status: 201, corpo: FALTAM[0] },
    });
    await page.goto(`${P}/juridico/casos/${CASO}`);
    const docs = page.getByRole("region", { name: "Documentos" });
    await expect(docs).toContainText("Nenhum arquivo ligado a este caso ainda.");
    await expect(page.getByRole("region", { name: "O que está travando" })).toHaveCount(0);
    await docs.getByRole("button", { name: "Pedir documento" }).click();
    const j = page.getByRole("dialog", { name: "Pedir documento" });
    await j.getByRole("button", { name: "Registrar o pedido" }).click();
    await expect(j.getByRole("alert").filter({ hasText: "O pedido ainda não foi registrado." })).toBeVisible();
    await expect(j.getByLabel("Qual documento falta")).toBeFocused();
    await expect(j).toContainText("Escolha com qual cliente do caso está o documento.");
    await semViolacoes(page);
    await j.getByLabel("Qual documento falta").fill("CTPS digital de Carlos");
    await j.getByRole("radio", { name: "Carlos Dias" }).check();
    await j.getByRole("button", { name: "Registrar o pedido" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Documento pedido" })).toBeVisible();
    expect(pedidos.find((p) => p.metodo === "POST" && p.caminho.endsWith("/pedidos"))?.corpo).toEqual({ descricao: "CTPS digital de Carlos", clienteId: CARLOS.id });
  });

  test("Pedir de novo: texto pronto com o primeiro nome, WhatsApp do aparelho e a data do novo pedido", async ({ page }) => {
    const { pedidos } = await simular(page, {
      ...comuns(),
      [`POST /v1/escritorio/juridico/pedidos/${PEDIDO_CTPS}/de-novo`]: { corpo: { ...FALTAM[0], repedidoEm: "2026-11-19" } },
    });
    await page.goto(`${P}/juridico/casos/${CASO}`);
    await page.getByRole("button", { name: "Pedir de novo: CTPS digital de Carlos" }).click();
    const j = page.getByRole("dialog", { name: "Pedir de novo" });
    await expect(j).toContainText("Olá, Carlos. Aqui é do escritório Ribeiro & Matos. Para o seu processo contra Mercado Bom Preço andar, ainda precisamos de: CTPS digital de Carlos. Pode mandar uma foto ou o arquivo por aqui mesmo. Se já mandou, agradecemos e pode desconsiderar esta mensagem.");
    await expect(j).toContainText("Texto para Carlos · (11) 97108-4426");
    await expect(j.getByRole("link", { name: "Abrir no WhatsApp" })).toHaveAttribute("href", /^https:\/\/wa\.me\/5511971084426\?text=Ol%C3%A1%2C%20Carlos/);
    await expect(j).toContainText("O WhatsApp do escritório ainda não está ligado ao T3jus.");
    await semViolacoes(page);
    await j.getByRole("button", { name: "Marcar como pedido hoje" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Pedido de novo" })).toBeVisible();
    expect(pedidos.some((p) => p.metodo === "POST" && p.caminho === `/v1/escritorio/juridico/pedidos/${PEDIDO_CTPS}/de-novo`)).toBe(true);
  });

  test("Já chegou: só marcar, ou guardar o arquivo junto (fecha o pedido)", async ({ page }) => {
    const { pedidos, envios } = await simular(page, {
      ...comuns(),
      [`POST /v1/escritorio/juridico/pedidos/${PEDIDO_HOL}/chegou`]: { corpo: { id: PEDIDO_HOL, chegouEm: "2026-11-19T15:00:00Z" } },
      [`POST /v1/escritorio/juridico/casos/${CASO}/documentos`]: { status: 201, corpo: { id: NOVO, enderecoDeEnvio: `${P}/arquivos-falsos/${ESC}/${NOVO}?token=uso-unico` } },
      [`POST /v1/escritorio/juridico/documentos/${NOVO}/concluir`]: { corpo: { id: NOVO } },
    });
    await page.goto(`${P}/juridico/casos/${CASO}`);
    // Sem arquivo, pela folha "O que está travando".
    await page.getByRole("region", { name: "O que está travando" }).getByRole("button", { name: "Já chegou: Holerites de janeiro a março de 2025" }).click();
    let j = page.getByRole("dialog", { name: "Já chegou" });
    await expect(j).toContainText("O arquivo é opcional");
    await semViolacoes(page);
    await j.getByRole("button", { name: "Marcar que chegou" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Documento chegou" })).toBeVisible();
    expect(pedidos.some((p) => p.caminho === `/v1/escritorio/juridico/pedidos/${PEDIDO_HOL}/chegou`)).toBe(true);

    // Com o arquivo, pela folha "Documentos".
    await page.getByRole("region", { name: "Documentos" }).getByRole("button", { name: "Já chegou: CTPS digital de Carlos" }).click();
    j = page.getByRole("dialog", { name: "Já chegou" });
    await j.getByLabel("Arquivo").setInputFiles(pdf("ctps-carlos.pdf"));
    await j.getByRole("button", { name: "Guardar e marcar que chegou" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Documento chegou" })).toContainText("está ligado ao caso");
    expect(pedidos.find((p) => p.caminho === `/v1/escritorio/juridico/casos/${CASO}/documentos`)?.corpo).toEqual({
      categoria: "DOCUMENTO_CLIENTE", nome: "ctps-carlos.pdf", tipo: "application/pdf", tamanho: 1200, pedidoId: PEDIDO_CTPS,
    });
    expect(envios).toEqual([`PUT /arquivos-falsos/${ESC}/${NOVO}`]);
    expect(pedidos.some((p) => p.caminho === `/v1/escritorio/juridico/documentos/${NOVO}/concluir`)).toBe(true);
  });

  test("Enviar arquivo: recusa o tipo errado e guarda com o que é", async ({ page }) => {
    const { pedidos, envios } = await simular(page, {
      ...comuns(),
      [`POST /v1/escritorio/juridico/casos/${CASO}/documentos`]: { status: 201, corpo: { id: NOVO, enderecoDeEnvio: `${P}/arquivos-falsos/${ESC}/${NOVO}?token=uso-unico` } },
      [`POST /v1/escritorio/juridico/documentos/${NOVO}/concluir`]: { corpo: { id: NOVO } },
    });
    await page.goto(`${P}/juridico/casos/${CASO}`);
    await page.getByRole("region", { name: "Documentos" }).getByRole("button", { name: "Enviar arquivo" }).click();
    const j = page.getByRole("dialog", { name: "Enviar arquivo" });
    await j.getByRole("button", { name: "Enviar" }).click();
    await expect(j).toContainText("Escolha o arquivo.");
    await j.getByLabel("Arquivo").setInputFiles({ name: "planilha.xlsx", mimeType: "application/vnd.ms-excel", buffer: Buffer.from("x") });
    await j.getByRole("button", { name: "Enviar" }).click();
    await expect(j).toContainText("Tipo não aceito. Envie PDF, JPG ou PNG.");
    await semViolacoes(page);
    await j.getByLabel("O que é").selectOption("PROCURACAO");
    await j.getByLabel("Arquivo").setInputFiles(pdf("procuracao-joana.pdf", 2048));
    await j.getByRole("button", { name: "Enviar" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Arquivo guardado" })).toContainText("procuracao-joana.pdf está ligado ao caso.");
    expect(pedidos.find((p) => p.caminho === `/v1/escritorio/juridico/casos/${CASO}/documentos`)?.corpo).toEqual({
      categoria: "PROCURACAO", nome: "procuracao-joana.pdf", tipo: "application/pdf", tamanho: 2048, pedidoId: null,
    });
    expect(envios).toEqual([`PUT /arquivos-falsos/${ESC}/${NOVO}`]);
  });

  test("Caso encerrado: não pede documento, mas ainda guarda arquivo", async ({ page }) => {
    await simular(page, comuns({ ...FICHA, situacao: "ENCERRADO", resultado: "ACORDO", encerradoEm: "2026-11-18T15:00:00Z", faltam: [] }));
    await page.goto(`${P}/juridico/casos/${CASO}`);
    const docs = page.getByRole("region", { name: "Documentos" });
    await expect(docs.getByRole("heading", { name: "Ligados ao caso · 2" })).toBeVisible();
    await expect(docs.getByRole("button", { name: "Pedir documento" })).toHaveCount(0);
    await expect(docs.getByRole("button", { name: "Enviar arquivo" })).toBeVisible();
  });
});
