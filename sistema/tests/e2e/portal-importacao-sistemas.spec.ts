// Importar do Astrea e do ADVBOX, parte 1: os clientes (F3.56, VA-05), tela aprovada em
// docs/design/aprovadas/portal-importacao-sistemas. A escolha da origem (só a sócia dona vê os
// sistemas), o backup do Astrea lido no navegador (ao T3jus vão só as abas que podem entrar,
// comprimidas), as abas, as colunas pelo modelo com o tipo de contato, a prévia com os contatos
// que não viraram clientes, a planilha do ADVBOX e o histórico com a origem. A API é simulada.
import { gunzipSync } from "node:zlib";
import { expect, test, type Page } from "@playwright/test";
import { planilhaXlsx } from "../../packages/ui/src/portal/planilha.ts";
import { semViolacoes } from "./console-dados.ts";

const P = "http://localhost:3000";
const ESC = "e0000000-0000-4000-8000-0000000000a1";
const ID = "f1000000-0000-4000-8000-000000000601";
const MARINA = { id: "a0000000-0000-4000-8000-000000000101", nome: "Marina Ribeiro" };
const FELIPE = { id: "a0000000-0000-4000-8000-000000000105", nome: "Felipe Matos" };
const BASE = {
  id: ESC, nome: "Ribeiro & Matos", socios: ["Marina Ribeiro"], pessoas: 5, outrosEscritorios: 0, cnpj: null, cidade: "São Paulo", uf: "SP",
  endereco: null, contatos: [], ultimaExportacao: null,
};
const ESC_MARINA = { ...BASE, pessoa: "Marina Ribeiro", dono: true, areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"], funcoes: ["SOCIO"] };
const ESC_FELIPE = { ...BASE, pessoa: "Felipe Matos", dono: false, areas: ["CONTRATOS"], funcoes: ["EQUIPE"] };

const col = (indice: number, letra: string, nome: string, exemplo: string, modelo: string | null, sugestao: string | null = modelo, foraMotivo: string | null = null) =>
  ({ indice, letra, nome, exemplo, campo: modelo, sugestao, modelo, foraMotivo });
const COLUNAS = [
  col(0, "A", "Nome", "Benedito Ramos Filho", "nome"), col(1, "B", "Tipo", "Cliente", "tipo_contato", "tipo"),
  col(2, "C", "CPF/CNPJ", "462.803.157-62", "documento"), col(3, "D", "E-mail", "benedito.ramos@exemplo.com.br", "email"),
  col(4, "E", "Celular", "(11) 99642-1180", "telefone"), col(5, "F", "Observações", "liga depois das 18h", null, null, "OBSERVACAO"),
];
const LIGACAO = { 0: "nome", 1: "tipo_contato", 2: "documento", 3: "email", 4: "telefone" };
const ABAS_SISTEMA = [
  { indice: 0, nome: "Contatos", linhas: 486, destino: "CLIENTES", reconhecida: true, lida: true },
  { indice: 1, nome: "Processos", linhas: 312, destino: "CASOS", reconhecida: true, lida: false },
  { indice: 2, nome: "Lançamentos", linhas: 1204, destino: "FINANCEIRO", reconhecida: true, lida: false },
  { indice: 3, nome: "Tarefas", linhas: 97, destino: "TAREFAS", reconhecida: true, lida: false },
  { indice: 4, nome: "Honorários", linhas: 96, destino: "FORA", reconhecida: false, lida: true },
];
const IMP = {
  id: ID, arquivo: "backup-astrea-21-11-2026.xlsx", oQue: "CLIENTES", origem: "ASTREA", modelo: "astrea-2026-11", abasSistema: ABAS_SISTEMA, foraTipo: null,
  situacao: "PREVIA", versao: 2, criadoEm: "2026-11-22T19:03:00Z", por: MARINA, linhasLidas: null, contratos: false, comercial: true,
  abas: ABAS_SISTEMA.map((a) => ({ indice: a.indice, nome: a.nome, linhas: a.lida ? a.linhas : 0, colunas: a.lida ? 6 : 0 })),
  aba: 0, colunas: COLUNAS, ligacao: LIGACAO, pares: {}, temPrevia: false, importadoEm: null, desfazerAte: null, resumo: null, podeDesfazer: false,
  fora: 0, desfeita: null,
};
const PARES = {
  responsavel: [], tipo: [], origem: [], equipe: [FELIPE, MARINA], colunas: COLUNAS,
  tipoContato: [
    { chave: "cliente", valor: "Cliente", n: 214, sugestao: "CLIENTE" },
    { chave: "parte contraria", valor: "Parte contrária", n: 172, sugestao: "PARTE_CONTRARIA" },
    { chave: "perito", valor: "Perito", n: 100, sugestao: "FORA" },
  ],
};
const RESUMO = {
  contagens: { lidas: 214, prontas: 210, aviso: 3, erro: 1, puladas: 0, corrigidas: 0, decididas: 0 },
  clientes: { novos: 208, juntados: 2 }, contratos: { ativos: 0, elaboracao: 0, mensais: 0, exitos: 0 },
  financeiro: { parcelas: 0, valor: 0, vencidas: 0, pagasAntes: 0, valorPagoAntes: 0 }, meses: [],
};
const BENEDITO = {
  numero: 2, situacao: "PRONTA", decisao: null, problemas: [], valores: { nome: "Benedito Ramos Filho" }, corrigidas: [],
  cliente: { nome: "Benedito Ramos Filho", tipo: "PF", documento: "46280315762", contatos: [{ nome: "Benedito Ramos Filho", telefone: "+5511996421180" }] },
  mesmaDe: null, telefoneDe: null, duplicado: null, contrato: null,
};
const FIM = {
  ...IMP, situacao: "CONCLUIDA", importadoEm: "2026-11-22T19:20:00Z", desfazerAte: "2026-11-29T19:20:00Z", podeDesfazer: true, abas: null, colunas: null,
  resumo: { clientes: 210, juntados: 2, juntadosIds: [], contratos: 0, ativos: 0, parcelas: 0, valor: 0, vencidas: 0, exitos: 0, valorPagoAntes: 0, linhas: 210, fora: 4 },
};

type Resp = { status?: number; corpo: unknown };
type Pedido = { metodo: string; caminho: string; busca: string; corpo: unknown; tipo: string | null; bruto: Buffer | null };
async function simular(page: Page, rotas: Record<string, Resp | Resp[]>) {
  const pedidos: Pedido[] = [];
  await page.route("**/api/v1/**", async (rota) => {
    const req = rota.request();
    const url = new URL(req.url());
    const caminho = url.pathname.replace(/^\/api/, "");
    const metodo = req.method();
    const tipo = await req.headerValue("content-type");
    let corpo: unknown = null;
    try {
      corpo = tipo?.includes("json") ? req.postDataJSON() : null;
    } catch {
      corpo = null;
    }
    pedidos.push({ metodo, caminho, busca: url.search, corpo, tipo, bruto: req.postDataBuffer() });
    const r = rotas[`${metodo} ${caminho}${url.search}`] ?? rotas[`${metodo} ${caminho}`];
    const lista = Array.isArray(r) ? r : r ? [r] : [{ status: 404, corpo: { erro: { codigo: "NOT_FOUND" } } }];
    const vez = pedidos.filter((p) => p.caminho === caminho && p.metodo === metodo && p.busca === url.search).length - 1;
    const x = lista[Math.min(vez, lista.length - 1)]!;
    await rota.fulfill({ status: x.status ?? 200, contentType: "application/json", body: JSON.stringify(x.corpo) });
  });
  return pedidos;
}
const A = "/v1/escritorio/importacoes";
const base = (x: Record<string, Resp | Resp[]> = {}) => ({
  "GET /v1/escritorio": { corpo: ESC_MARINA },
  [`GET ${A}`]: { corpo: { importacoes: [FIM] } },
  [`GET ${A}/${ID}`]: { corpo: IMP },
  [`POST ${A}/${ID}/pares`]: { corpo: PARES },
  ...x,
});

/** Um backup pequeno, com as abas do modelo do Astrea. */
function backup(): Buffer {
  return Buffer.from(planilhaXlsx([
    { nome: "Contatos", larguras: [20, 12, 16], linhas: [["Nome", "Tipo", "CPF/CNPJ"], ["Benedito Ramos Filho", "Cliente", "462.803.157-62"], ["Construtora Alfa", "Parte contrária", ""]] },
    { nome: "Processos", larguras: [20], linhas: [["Número"], ["1000123-45.2025.5.02.0001"]] },
    { nome: "Tarefas", larguras: [20], linhas: [["Tarefa"], ["Ligar para o cliente"]] },
  ]));
}

test.describe("F3.56: Importar do Astrea e do ADVBOX", () => {
  test("escolher a origem: a sócia dona vê os três cartões; a equipe vai direto à planilha", async ({ page }) => {
    await simular(page, base());
    await page.goto(`${P}/clientes/importar`);
    await expect(page.getByRole("heading", { level: 1, name: "Importar dados" })).toBeVisible();
    const grupo = page.getByRole("group", { name: "De onde vêm os dados?" });
    await expect(grupo.getByRole("radio")).toHaveCount(3);
    await expect(page.getByRole("link", { name: "Continuar" })).toHaveAttribute("href", "/clientes/importar?origem=planilha");
    await grupo.getByRole("radio", { name: /Astrea/ }).check();
    await expect(page.getByRole("link", { name: "Continuar" })).toHaveAttribute("href", "/clientes/importar/astrea");
    await expect(page.getByRole("region", { name: "Importações anteriores" })).toContainText("Astrea · backup");
    await semViolacoes(page);

    await page.unrouteAll();
    await simular(page, base({ "GET /v1/escritorio": { corpo: ESC_FELIPE } }));
    await page.goto(`${P}/clientes/importar`);
    await expect(page.getByRole("heading", { level: 1, name: "Importar planilha" })).toBeVisible();
    await page.goto(`${P}/clientes/importar/astrea`);
    await expect(page.getByRole("heading", { name: "Só a sócia dona importa de outro sistema" })).toBeVisible();
    await semViolacoes(page);
  });

  test("Astrea, passo 1: o backup é lido aqui e só as abas que podem entrar vão ao T3jus, comprimidas", async ({ page }) => {
    const pedidos = await simular(page, base({ [`POST ${A}`]: { status: 201, corpo: IMP } }));
    await page.goto(`${P}/clientes/importar/astrea`);
    await expect(page.getByRole("heading", { level: 1, name: "Importar do Astrea" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Peça o backup no Astrea" })).toContainText("“Seu backup do Astrea está pronto”");
    await expect(page.getByRole("region", { name: "O que vem do Astrea" })).toContainText("Processos e financeiro, ainda não");
    await semViolacoes(page);
    await page.getByLabel("Escolher o backup").setInputFiles({ name: "backup-astrea.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: backup() });
    await expect(page).toHaveURL(`${P}/clientes/importar/${ID}?passo=abas`);
    const envio = pedidos.find((p) => p.metodo === "POST" && p.caminho === A)!;
    expect(envio.busca).toBe("?oQue=CLIENTES&origem=ASTREA&nome=backup-astrea.xlsx");
    expect(envio.tipo).toBe("application/octet-stream");
    const lido = JSON.parse(gunzipSync(envio.bruto!).toString("utf8")) as { abas: { nome: string; linhas: number; celulas: string[][] | null }[] };
    expect(lido.abas.map((a) => [a.nome, a.linhas, a.celulas?.length ?? null])).toEqual([["Contatos", 2, 2], ["Processos", 1, null], ["Tarefas", 1, null]]);
  });

  test("Astrea, passo 2: as abas, as colunas pelo modelo e o tipo de contato", async ({ page }) => {
    const pedidos = await simular(page, base({ [`PATCH ${A}/${ID}/colunas`]: { corpo: { versao: 3, ...RESUMO } } }));
    await page.goto(`${P}/clientes/importar/${ID}?passo=abas`);
    await expect(page.getByRole("status").filter({ hasText: "Este backup está um pouco diferente do modelo que conhecemos." })).toContainText("Uma aba é nova");
    const t = page.getByRole("table", { name: "Abas do backup" });
    await expect(t).toContainText("Os processos, como casos no Jurídico, entram numa próxima versão do T3jus.");
    await expect(page.getByLabel("Aba Processos: vai para")).toBeDisabled();
    await expect(page.getByLabel("Aba Contatos: vai para")).toHaveValue("CLIENTES");
    await semViolacoes(page);
    await expect(page.getByRole("link", { name: "Conferir as colunas" })).toHaveAttribute("href", `/clientes/importar/${ID}?passo=colunas&aba=0`);

    await page.goto(`${P}/clientes/importar/${ID}?passo=colunas&aba=0`);
    const map = page.getByRole("table", { name: "Colunas do cliente" });
    await expect(map.getByRole("row", { name: /^Tipo , coluna B/ })).toContainText("Pelo modelo do Astrea");
    await expect(page.getByLabel("Coluna B, Tipo: vai para")).toHaveValue("tipo_contato");
    const pares = page.getByRole("region", { name: "Valores que viram itens do T3jus" });
    await expect(pares).toContainText("Contatos · coluna “Tipo”");
    await expect(page.getByLabel("“Parte contrária” vira")).toHaveValue("PARTE_CONTRARIA");
    await expect(page.getByLabel("“Perito” vira")).toHaveAccessibleDescription("Ficam de fora: o cadastro de clientes não guarda terceiros.");
    await semViolacoes(page);
    await page.getByRole("button", { name: "Ver a prévia" }).click();
    await expect(page).toHaveURL(`${P}/clientes/importar/${ID}?passo=previa`);
    const patch = pedidos.find((p) => p.metodo === "PATCH")!.corpo as { aba: number; ligacao: Record<string, string>; pares: { tipoContato: Record<string, string> } };
    expect([patch.aba, patch.ligacao, patch.pares.tipoContato]).toEqual([0, LIGACAO, { cliente: "CLIENTE", "parte contraria": "PARTE_CONTRARIA", perito: "FORA" }]);
  });

  test("Astrea, prévia e resultado: os contatos que não viraram clientes e a origem escrita", async ({ page }) => {
    const prev = { ...IMP, temPrevia: true, linhasLidas: 214, foraTipo: { PARTE_CONTRARIA: 172, FORA: 100 } };
    await simular(page, base({
      [`GET ${A}/${ID}`]: { corpo: prev },
      [`GET ${A}/${ID}/linhas`]: { corpo: { importacao: prev, ...RESUMO, linhas: [BENEDITO], total: 214 } },
    }));
    await page.goto(`${P}/clientes/importar/${ID}?passo=previa`);
    await expect(page.getByRole("status").filter({ hasText: "272 contatos do backup não são clientes e ficaram de fora da prévia." }))
      .toContainText("São 172 partes contrárias e 100 terceiros");
    await expect(page.getByText("Astrea · backup").first()).toBeVisible();
    await semViolacoes(page);

    await page.unrouteAll();
    await simular(page, base({ [`GET ${A}/${ID}`]: { corpo: FIM } }));
    await page.goto(`${P}/clientes/importacoes`);
    await expect(page.getByRole("table", { name: "Importações do escritório" })).toContainText("Astrea · backup");
    await semViolacoes(page);
  });

  test("ADVBOX pela planilha: vai com a origem e abre as colunas ligadas pelo modelo", async ({ page }) => {
    const adv = { ...IMP, arquivo: "clientes-advbox.xlsx", origem: "ADVBOX_PLANILHA", modelo: "advbox-2026-11", abasSistema: null,
      colunas: COLUNAS.filter((c) => c.indice !== 1), ligacao: { 0: "nome", 2: "documento", 3: "email", 4: "telefone" }, abas: [{ indice: 0, nome: "Clientes", linhas: 520, colunas: 6 }] };
    const pedidos = await simular(page, base({ [`POST ${A}`]: { status: 201, corpo: adv }, [`GET ${A}/${ID}`]: { corpo: adv }, [`POST ${A}/${ID}/pares`]: { corpo: { ...PARES, tipoContato: [] } } }));
    await page.goto(`${P}/clientes/importar/advbox`);
    await expect(page.getByRole("heading", { level: 1, name: "Importar do ADVBOX" })).toBeVisible();
    await semViolacoes(page);
    await page.getByLabel("Escolher a planilha").setInputFiles({ name: "clientes-advbox.csv", mimeType: "text/csv", buffer: Buffer.from("Nome;CPF\nRosa;529.982.247-25\n") });
    await expect(page).toHaveURL(`${P}/clientes/importar/${ID}?passo=colunas`);
    expect(pedidos.find((p) => p.metodo === "POST" && p.caminho === A)!.busca).toBe("?oQue=CLIENTES&origem=ADVBOX_PLANILHA&nome=clientes-advbox.csv");
    await expect(page.getByRole("table", { name: "Colunas do cliente" }).getByRole("row", { name: /^CPF\/CNPJ , coluna C/ })).toContainText("Pelo modelo do ADVBOX");
    await semViolacoes(page);
  });
});
