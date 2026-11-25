// Documentos para começar, parte 4a (AP-08, EX-18; F3.131), desenho aprovado em
// docs/design/aprovadas/portal-jornada-fechamento (grupo 9): a folha "Documentos pessoais" na
// ficha do cliente, a janela "Anexar documento" com as fotos que viram um PDF, a ficha sem
// documentos e a lista por área em Jurídico › Casos e processos. A API é simulada; aqui se testa a
// tela, a acessibilidade e o que ela manda ao servidor.
import { expect, test, type Page } from "@playwright/test";
import { agora, fixarRelogio, h, semViolacoes } from "./console-dados.ts";

const P = "http://localhost:3000";
const ESC = "e0000000-0000-4000-8000-0000000000a1";
const CLI = "c1000000-0000-4000-8000-000000000201";
const MARINA = { id: "a0000000-0000-4000-8000-000000000101", nome: "Marina Ribeiro" };
const PAULA = { id: "a0000000-0000-4000-8000-000000000104", nome: "Paula Nunes" };
const CASO = { id: "ca000000-0000-4000-8000-000000000001", nome: "Ferreira Prado x INSS" };
const NOVO = "f9000000-0000-4000-8000-000000000041";

const ESCRITORIO = {
  id: ESC, nome: "Ribeiro & Matos", pessoa: "Marina Ribeiro", dono: true, areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"],
  socios: ["Marina Ribeiro"], pessoas: 5, outrosEscritorios: 0, funcoes: ["SOCIO"], cnpj: null, cidade: "São Paulo", uf: "SP", endereco: null,
  contatos: [], ultimaExportacao: null,
};
const dia = (n: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(agora + n * 864e5));
const br = (n: number) => dia(n).split("-").reverse().join("/");

const FICHA = {
  id: CLI, tipo: "PF", nome: "Antônia Ferreira Prado", documento: "52998224725", nacionalidade: "brasileira", estadoCivil: "VIUVO", profissao: "Aposentada",
  rg: "12.345.678-9", rgOrgao: "SSP/SP", cep: "04117030", endereco: "Rua das Acácias, 418", bairro: "Vila Mariana", cidade: "São Paulo", uf: "SP",
  repNome: null, repCargo: null, repDocumento: null, repEstadoCivil: null, repProfissao: null, situacao: "ATIVO", inativadoEm: null,
  motivoInativacao: null, inativadoPor: null, criadoEm: h(24 * 22), criadoPor: MARINA, versao: 3, comercial: true, podeInativar: true, faltando: [],
  alterado: null, contatos: [{ id: "d0000000-0000-4000-8000-000000000201", nome: "Joana Prado", papel: "Filha", telefone: "+5511987654321", email: null, principal: true }],
  origem: "GOOGLE", origemIndicacao: null, atendimentos: 4, primeiroAtendimento: null, proxContato: null,
  passo: { tipo: "CASO", area: "JURIDICO", pode: true, quemPode: null, item: { id: CASO.id, nome: CASO.nome, etapa: { ordem: 1, nome: "Preparação" }, etapas: 8 } },
  contagens: { propostas: 1, contratos: 1, casos: 1 },
  noEscritorio: null,
};
const doc = (x: Record<string, unknown>) => ({
  id: "f1000000-0000-4000-8000-000000000001", tipo: "RG_CPF", descricao: null, dataDocumento: null, nome: "rg.pdf", arquivoTipo: "application/pdf",
  tamanho: 380000, fotos: 2, enviadoPor: PAULA, enviadoEm: `${dia(-12)}T15:00:00Z`, dias: null, vencido: false, anteriores: 0, ...x,
});
const DOCS = {
  hoje: dia(0), validadeDias: 90, podeAnexar: true, podeMudarPrazo: true, sociosDonos: ["Marina Ribeiro"],
  documentos: [
    doc({}),
    doc({ id: "f1000000-0000-4000-8000-000000000002", tipo: "CERTIDAO_OBITO", descricao: "Certidão de óbito de Sebastião Prado", fotos: null, dataDocumento: "2026-09-21" }),
    doc({ id: "f1000000-0000-4000-8000-000000000003", tipo: "COMPROVANTE_RESIDENCIA", fotos: null, dataDocumento: dia(-139), dias: 139, vencido: true, enviadoPor: MARINA }),
  ],
  pedidos: [
    { id: "d1000000-0000-4000-8000-000000000001", tipoPessoal: "COMPROVANTE_RESIDENCIA", descricao: "Comprovante de residência novo", pedidoEm: dia(0), caso: CASO },
    { id: "d1000000-0000-4000-8000-000000000002", tipoPessoal: "CERTIDAO_CASAMENTO", descricao: "Certidão de casamento", pedidoEm: dia(0), caso: CASO },
  ],
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
    const vez = pedidos.filter((p) => p.caminho === caminho && p.metodo === metodo && p.busca === url.search).length - 1;
    const x = lista[Math.min(vez, lista.length - 1)]!;
    await rota.fulfill({ status: x.status ?? 200, contentType: "application/json", body: JSON.stringify(x.corpo) });
  });
  await page.route("**/envio-falso/**", (rota) => rota.fulfill({ status: 200, body: "{}" }));
  return pedidos;
}
const comuns = (docs: unknown = DOCS) => ({
  "/v1/escritorio": { corpo: ESCRITORIO },
  [`GET /v1/escritorio/clientes/${CLI}`]: { corpo: FICHA },
  "/v1/escritorio/pessoas": { corpo: { pessoas: [MARINA, PAULA] } },
  [`GET /v1/escritorio/clientes/${CLI}/documentos`]: { corpo: docs },
});

// Uma foto PNG mínima de verdade (1 × 1), para o canvas conseguir ler e juntar num PDF.
const FOTO = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

// O relógio do navegador fica em AGORA, o mesmo instante de onde os dados contam (F3.164).
test.beforeEach(async ({ page }) => { await fixarRelogio(page); });

test.describe("Documentos pessoais na ficha do cliente (AP-08)", () => {
  test("a folha separa o que precisa de atenção do que está em dia", async ({ page }) => {
    await simular(page, comuns());
    await page.goto(`${P}/clientes/${CLI}`);
    const folha = page.getByRole("region", { name: "Documentos pessoais" });
    await expect(folha).toContainText("4 documentos · 2 em dia, 1 com mais de 90 dias, 1 falta · valem para todos os casos de Antônia");
    await expect(folha.getByRole("heading", { name: "Precisa de atenção · 2" })).toBeVisible();
    await expect(folha).toContainText("Mais de 90 dias");
    await expect(folha).toContainText(`Do dia ${br(-139)}, 139 dias.`);
    await expect(folha).toContainText(`Um novo foi pedido hoje, para ${CASO.nome}.`);
    await expect(folha).toContainText("Certidão de casamento");
    await expect(folha).toContainText(`Pedida hoje, ${br(0).slice(0, 5)}, para ${CASO.nome}`);
    await expect(folha.getByRole("heading", { name: "Em dia · 2" })).toBeVisible();
    await expect(folha).toContainText("2 fotos num PDF");
    await expect(folha.getByRole("button", { name: /^Anexar um novo\s*: comprovante de residência$/ })).toBeVisible();
    await expect(folha.getByRole("button", { name: /^Pedir de novo\s*: certidão de casamento$/ })).toBeVisible();
    await expect(folha).toContainText("O número do RG não sai da foto");
    await semViolacoes(page);
  });

  test("anexar a certidão que faltava: 2 fotos viram um PDF e o pedido do caso fecha junto", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(),
      [`POST /v1/escritorio/clientes/${CLI}/documentos`]: { status: 201, corpo: { id: NOVO, enderecoDeEnvio: `${P}/envio-falso/${NOVO}` } },
      [`POST /v1/escritorio/clientes/documentos/${NOVO}/concluir`]: { corpo: doc({ id: NOVO, tipo: "CERTIDAO_CASAMENTO" }) },
    });
    await page.goto(`${P}/clientes/${CLI}`);
    await page.getByRole("button", { name: /^Anexar\s*: certidão de casamento$/ }).click();
    const j = page.getByRole("dialog", { name: "Anexar documento" });
    await expect(j.getByLabel("Qual documento")).toHaveValue("CERTIDAO_CASAMENTO");
    await expect(j.getByRole("checkbox", { name: new RegExp(`Marcar como chegou em ${CASO.nome}`) })).toBeChecked();
    const [seletor] = await Promise.all([page.waitForEvent("filechooser"), j.getByRole("button", { name: "Escolher arquivo" }).click()]);
    await seletor.setFiles([
      { name: "IMG_0001.png", mimeType: "image/png", buffer: FOTO },
      { name: "IMG_0002.png", mimeType: "image/png", buffer: FOTO },
    ]);
    await expect(j.getByRole("list", { name: "Fotos, na ordem das páginas" }).getByRole("listitem")).toHaveCount(2);
    await expect(j.getByRole("button", { name: /Tirar\s*a foto 2/ })).toBeVisible();
    await expect(j).toContainText("As fotos viram um PDF só");
    await j.getByLabel(/Data do documento/).fill("14/05/2019");
    await semViolacoes(page);
    await j.getByRole("button", { name: "Guardar na ficha" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Certidão de casamento guardado na ficha." })).toBeVisible();
    const corpo = pedidos.find((p) => p.metodo === "POST" && p.caminho === `/v1/escritorio/clientes/${CLI}/documentos`)!.corpo as Record<string, unknown>;
    expect(corpo).toMatchObject({ tipo: "CERTIDAO_CASAMENTO", dataDocumento: "2019-05-14", arquivoTipo: "application/pdf", fotos: 2,
      pedidoId: "d1000000-0000-4000-8000-000000000002", substitui: null });
  });

  test("erro: 11 fotos e a data depois de hoje; nada é guardado e as fotos ficam", async ({ page }) => {
    const pedidos = await simular(page, comuns());
    await page.goto(`${P}/clientes/${CLI}`);
    await page.getByRole("region", { name: "Documentos pessoais" }).getByRole("button", { name: "Anexar documento" }).click();
    const j = page.getByRole("dialog", { name: "Anexar documento" });
    await j.getByLabel("Qual documento").selectOption("CERTIDAO_NASCIMENTO");
    const [seletor] = await Promise.all([page.waitForEvent("filechooser"), j.getByRole("button", { name: "Escolher arquivo" }).click()]);
    await seletor.setFiles(Array.from({ length: 11 }, (_, i) => ({ name: `IMG_${i + 1}.png`, mimeType: "image/png", buffer: FOTO })));
    await j.getByLabel(/Data do documento/).fill(br(7));
    await j.getByRole("button", { name: "Guardar na ficha" }).click();
    await expect(j.getByText("Nada foi guardado. Falta acertar 2 pontos.")).toBeVisible();
    await expect(j.getByText("São 11 fotos e o limite é 10.").first()).toBeVisible();
    await expect(j.getByLabel(/Data do documento/)).toHaveAttribute("aria-invalid", "true");
    await expect(j.getByRole("list", { name: "Fotos, na ordem das páginas" }).getByRole("listitem")).toHaveCount(11);
    expect(pedidos.filter((p) => p.metodo === "POST")).toHaveLength(0);
    await semViolacoes(page);
  });

  test("ficha sem documentos: o que quase todo caso pede e o pedido pelo WhatsApp, sem registrar", async ({ page }) => {
    const pedidos = await simular(page, comuns({ ...DOCS, documentos: [], pedidos: [] }));
    await page.goto(`${P}/clientes/${CLI}`);
    const folha = page.getByRole("region", { name: "Documentos pessoais" });
    await expect(folha.getByRole("heading", { name: "Nenhum documento de Antônia ainda" })).toBeVisible();
    await expect(folha).toContainText("Comprovante de residência de até 90 dias");
    await folha.getByRole("button", { name: "Pedir pelo WhatsApp" }).click();
    const j = page.getByRole("dialog", { name: "Pedir pelo WhatsApp" });
    await expect(j).toContainText("Olá, Joana. Aqui é do escritório Ribeiro & Matos. Para deixar os documentos de Antônia em dia, precisamos de: RG e CPF, ou CNH,");
    await expect(j.getByRole("link", { name: "Abrir no WhatsApp" })).toHaveAttribute("href", /^https:\/\/wa\.me\/5511987654321\?text=/);
    await semViolacoes(page);
    expect(pedidos.filter((p) => p.metodo === "POST")).toHaveLength(0);
  });
});

// ------------------------------------------------------------------------- a lista por área

const item = (n: number, nome: string, x: Record<string, unknown> = {}) => ({
  id: `d2000000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`, ordem: n, nome, comoPedir: null, pessoal: null, seHouver: false, versao: 1, ...x,
});
const PREV = [
  item(1, "RG e CPF, ou CNH", { pessoal: "RG_CPF", comoPedir: "Documento com foto e o CPF." }),
  item(2, "Comprovante de residência", { pessoal: "COMPROVANTE_RESIDENCIA", comoPedir: "Conta de luz, água ou telefone dos últimos 90 dias." }),
  item(3, "Extrato do CNIS", { comoPedir: "Pelo Meu INSS. Se não conseguir, a gente ajuda." }),
  item(4, "Carta do INSS", { seHouver: true }),
];
const SUG_FAM = [
  { nome: "RG e CPF, ou CNH", comoPedir: null, pessoal: "RG_CPF", seHouver: false },
  { nome: "Comprovantes de renda", comoPedir: null, pessoal: null, seHouver: false },
  { nome: "Lista dos bens e dívidas", comoPedir: null, pessoal: null, seHouver: true },
];
const LISTAS = (dono = true) => ({
  podeEditar: dono, podeMudarPrazo: dono, sociosDonos: ["Marina Ribeiro"], validadeDias: 90, comprovantesTotal: 41, comprovantesVencidos: 3, listasComFrase: 1,
  areas: [
    { area: "PREVIDENCIARIO", itens: PREV, sugestao: [] },
    { area: "TRABALHISTA", itens: [], sugestao: [] },
    { area: "FAMILIA", itens: [], sugestao: SUG_FAM },
  ],
});

test.describe("Documentos para começar, a lista por área (EX-18)", () => {
  test("a sócia dona vê as áreas, edita um documento e o que vai ao servidor", async ({ page }) => {
    const pedidos = await simular(page, {
      "/v1/escritorio": { corpo: ESCRITORIO },
      "GET /v1/escritorio/juridico/documentos-inicio": { corpo: LISTAS() },
      [`PATCH /v1/escritorio/juridico/documentos-inicio/${PREV[2]!.id}`]: { corpo: { ...PREV[2], versao: 2 } },
    });
    await page.goto(`${P}/juridico/casos/documentos`);
    await expect(page.getByRole("heading", { level: 1, name: "Documentos para começar" })).toBeVisible();
    const folha = page.getByRole("region", { name: "Documentos de previdenciário" });
    await expect(folha).toContainText("4 documentos · 2 pessoais, 2 do caso · vale para todo caso novo de previdenciário");
    await expect(folha.getByRole("group", { name: "Área" }).getByRole("button", { name: /Família · sem lista/ })).toBeVisible();
    await expect(folha).toContainText("Vale 90 dias");
    await expect(folha.getByRole("button", { name: "Subir RG e CPF, ou CNH" })).toBeDisabled();
    await folha.getByRole("button", { name: "Editar Extrato do CNIS" }).click();
    const form = folha.getByRole("form", { name: "Editando Extrato do CNIS" });
    await form.getByRole("checkbox", { name: /Só se houver/ }).check();
    await semViolacoes(page);
    await form.getByRole("button", { name: "Salvar documento" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Documento salvo" })).toBeVisible();
    expect(pedidos.find((p) => p.metodo === "PATCH")!.corpo).toEqual({
      nome: "Extrato do CNIS", comoPedir: "Pelo Meu INSS. Se não conseguir, a gente ajuda.", pessoal: null, seHouver: true, versao: 1 });
  });

  test("área sem lista: a sugestão à vista e Usar a sugestão do T3jus", async ({ page }) => {
    const pedidos = await simular(page, {
      "/v1/escritorio": { corpo: ESCRITORIO },
      "GET /v1/escritorio/juridico/documentos-inicio": { corpo: LISTAS() },
      "POST /v1/escritorio/juridico/documentos-inicio/sugestao": { corpo: [] },
    });
    await page.goto(`${P}/juridico/casos/documentos`);
    await page.getByRole("button", { name: /Família · sem lista/ }).click();
    const folha = page.getByRole("region", { name: "Documentos de família" });
    await expect(folha.getByRole("heading", { name: "Família ainda não tem lista" })).toBeVisible();
    await expect(folha).toContainText("Lista dos bens e dívidas · do caso, se houver");
    await semViolacoes(page);
    await folha.getByRole("button", { name: "Usar a sugestão do T3jus" }).click();
    await expect(page.getByRole("status").filter({ hasText: "A lista de família está pronta" })).toBeVisible();
    expect(pedidos.find((p) => p.caminho.endsWith("/sugestao"))!.corpo).toEqual({ area: "FAMILIA" });
  });

  test("a equipe vê a lista, sem editar", async ({ page }) => {
    await simular(page, {
      "/v1/escritorio": { corpo: { ...ESCRITORIO, pessoa: "Larissa Costa", dono: false, areas: ["JURIDICO"], funcoes: ["EQUIPE"] } },
      "GET /v1/escritorio/juridico/documentos-inicio": { corpo: LISTAS(false) },
    });
    await page.goto(`${P}/juridico/casos/documentos`);
    await expect(page.getByText("Extrato do CNIS")).toBeVisible();
    await expect(page.getByRole("button", { name: /Editar/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Adicionar documento" })).toHaveCount(0);
    await expect(page.getByText("Só a sócia dona muda estas listas. A equipe vê e pode pedir mais um documento em cada caso.").first()).toBeVisible();
  });
});
