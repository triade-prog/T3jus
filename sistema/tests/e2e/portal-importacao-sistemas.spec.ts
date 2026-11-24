// Importar do Astrea e do ADVBOX (F3.56, VA-05), tela aprovada em
// docs/design/aprovadas/portal-importacao-sistemas. A escolha da origem (só a sócia dona vê os
// sistemas), o backup do Astrea lido no navegador (ao T3jus vão só as abas que podem entrar,
// comprimidas), as abas, as colunas pelo modelo com o tipo de contato, a prévia com os contatos
// que não viraram clientes, a planilha do ADVBOX e o histórico com a origem. Parte 2: os processos
// ativos viram casos numa segunda prévia, depois dos clientes (colunas, prévia, resultado e a
// planilha de processos do ADVBOX). A API é simulada.
import { gunzipSync } from "node:zlib";
import { expect, test, type Page } from "@playwright/test";
import { planilhaXlsx } from "../../packages/ui/src/portal/planilha.ts";
import { fixarRelogio, semViolacoes } from "./console-dados.ts";

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
  { indice: 1, nome: "Processos", linhas: 312, destino: "CASOS", reconhecida: true, lida: true, ativos: 241, arquivados: 71 },
  { indice: 2, nome: "Lançamentos", linhas: 1204, destino: "FINANCEIRO", reconhecida: true, lida: false },
  { indice: 3, nome: "Tarefas", linhas: 97, destino: "TAREFAS", reconhecida: true, lida: false },
  { indice: 4, nome: "Honorários", linhas: 96, destino: "FORA", reconhecida: false, lida: true },
];
const IMP = {
  id: ID, arquivo: "backup-astrea-21-11-2026.xlsx", oQue: "CLIENTES", origem: "ASTREA", modelo: "astrea-2026-11", abasSistema: ABAS_SISTEMA, foraTipo: null,
  situacao: "PREVIA", versao: 2, criadoEm: "2026-11-22T19:03:00Z", por: MARINA, linhasLidas: null, contratos: false, comercial: true,
  abas: ABAS_SISTEMA.map((a) => ({ indice: a.indice, nome: a.nome, linhas: a.lida ? a.linhas : 0, colunas: a.lida ? 6 : 0 })),
  aba: 0, colunas: COLUNAS, ligacao: LIGACAO, pares: {}, temPrevia: false, importadoEm: null, desfazerAte: null, resumo: null, podeDesfazer: false,
  fora: 0, desfeita: null, arquivados: "FORA",
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

// Parte 2: os processos, numa importação filha da dos clientes do backup.
const IDC = "f1000000-0000-4000-8000-000000000602";
const ETAPA = "e1000000-0000-4000-8000-000000000001";
const COLUNAS_CASOS = [
  col(0, "A", "Número", "1004417-37.2025.5.02.0061", "numero"), col(1, "B", "Cliente", "Márcio Tavares", "cliente"),
  col(2, "C", "Área", "Trabalhista", "area"), col(3, "D", "Fase", "Audiência marcada", "etapa"),
  col(4, "E", "Situação", "Ativo", "situacao_processo"), col(5, "F", "Responsável", "Felipe Matos", "responsavel"),
];
const IMP_CASOS = {
  ...IMP, id: IDC, oQue: "CASOS", abasSistema: null, pai: ID, filha: null, abas: [{ indice: 0, nome: "Processos", linhas: 312, colunas: 6 }],
  colunas: COLUNAS_CASOS, ligacao: { 0: "numero", 1: "cliente", 2: "area", 3: "etapa", 4: "situacao_processo", 5: "responsavel" },
};
const PARES_CASOS = {
  ...PARES, tipoContato: [], colunas: COLUNAS_CASOS, etapas: [{ id: ETAPA, nome: "Instrução" }],
  responsavel: [{ chave: "felipe matos", valor: "Felipe Matos", n: 230, sugestao: FELIPE.id }, { chave: "joao antigo", valor: "João Antigo", n: 12, sugestao: null }],
  area: [{ chave: "trabalhista", valor: "Trabalhista", n: 180, sugestao: "TRABALHISTA" }],
  etapa: [{ chave: "audiencia marcada", valor: "Audiência marcada", n: 40, sugestao: ETAPA }],
  situacaoProcesso: [{ chave: "ativo", valor: "Ativo", n: 241, sugestao: "ATIVO" }, { chave: "arquivado", valor: "Arquivado", n: 71, sugestao: "FORA" }],
};
const RESUMO_CASOS = {
  ...RESUMO, contagens: { lidas: 241, prontas: 228, aviso: 9, erro: 4, puladas: 0, corrigidas: 0, decididas: 0 },
  clientes: { novos: 0, juntados: 0 }, casos: { novos: 226, juntados: 2, clientes: 190 },
};
const caso = (nome: string, numero: string | null, extra: Record<string, unknown> = {}) => ({
  nome, area: "TRABALHISTA", parteContraria: nome.split(" x ")[1] ?? null, numero, tribunal: "TRT-2", vara: null, valorCausa: 6420000,
  distribuidoEm: null, etapa: { id: ETAPA, nome: "Instrução" }, etapaAntiga: "Audiência marcada", papel: "AUTOR", responsavel: FELIPE, ...extra,
});
const linhaCaso = (numero: number, cliente: string, k: ReturnType<typeof caso>, x: Record<string, unknown> = {}) => ({
  numero, situacao: "PRONTA", decisao: null, problemas: [], valores: { cliente, numero: k.numero ?? "" }, corrigidas: [],
  cliente: { nome: cliente, tipo: "PF", contatos: [] }, mesmaDe: null, telefoneDe: null, duplicado: null, contrato: null,
  caso: k, clienteId: "c1", casoExistente: null, ...x,
});
const TAVARES = linhaCaso(14, "Márcio Tavares", caso("Tavares x Metalúrgica Andrade", "1004417-37.2025.5.02.0061"));
const RAMOS = linhaCaso(15, "Benedito Ramos Filho", caso("Ramos x INSS", "5012398-62.2024.4.03.6100"), {
  situacao: "AVISO", problemas: [{ codigo: "CASO_DUPLICADO", campo: "numero", nivel: "AVISO" }],
  casoExistente: { id: "k1", nome: "Ramos x INSS", numero: "5012398-62.2024.4.03.6100", situacao: "ATIVO", clientes: ["Antônia Ferreira Prado"], jaNoCaso: false },
});
const ROTA = linhaCaso(16, "Transportadora Rota Sul Ltda.", caso("Rota Sul x Distribuidora Leste", null), {
  situacao: "ERRO", problemas: [{ codigo: "NUMERO_CNJ_INVALIDO", campo: "numero", nivel: "ERRO", valor: "1000731-10.2025.5.02.0003" }],
});
const OKADA = linhaCaso(17, "", caso("Okada x Banco Horizonte", null), {
  situacao: "ERRO", clienteId: null, valores: { cliente: "C. Okada" }, problemas: [{ codigo: "CLIENTE_NAO_ENCONTRADO", campo: "cliente", nivel: "ERRO", valor: "C. Okada" }],
});

// Parte 3: o financeiro antigo, só como informação, em mais uma importação filha.
const IDF = "f1000000-0000-4000-8000-000000000603";
const COLUNAS_FIN = [
  col(0, "A", "Data", "10/10/2026", "lanc_data"), col(1, "B", "Cliente", "Benedito Ramos Filho", "cliente"),
  col(2, "C", "Descrição", "Honorários · parcela 3 de 6", "lanc_descricao"), col(3, "D", "Valor", "800,00", "lanc_valor"),
  col(4, "E", "Situação", "Pago", "lanc_situacao"), col(5, "F", "Tipo", "Receita", "lanc_tipo"),
];
const IMP_FIN = {
  ...IMP, id: IDF, oQue: "FINANCEIRO", abasSistema: null, pai: ID, filha: null, filhaFinanceiro: null, abas: [{ indice: 0, nome: "Lançamentos", linhas: 1204, colunas: 6 }],
  colunas: COLUNAS_FIN, ligacao: { 0: "lanc_data", 1: "cliente", 2: "lanc_descricao", 3: "lanc_valor", 4: "lanc_situacao", 5: "lanc_tipo" },
};
const PARES_FIN = {
  ...PARES, tipoContato: [], colunas: COLUNAS_FIN,
  lancSituacao: [{ chave: "pago", valor: "Pago", n: 1021, sugestao: "PAGO" }, { chave: "em aberto", valor: "Em aberto", n: 87, sugestao: "EM_ABERTO" }],
  lancTipo: [{ chave: "receita", valor: "Receita", n: 1108, sugestao: "RECEITA" }, { chave: "despesa", valor: "Despesa", n: 96, sugestao: "DESPESA" }],
};
const RESUMO_FIN = {
  ...RESUMO, contagens: { lidas: 1108, prontas: 1100, aviso: 3, erro: 5, puladas: 0, corrigidas: 0, decididas: 0 }, clientes: { novos: 0, juntados: 0 },
  financeiroAntigo: { recebidos: 1021, valorRecebido: 61243000, emAberto: 79, valorEmAberto: 4890000, lembretes: 72, clientes: 190, despesas: 96,
    grupos: { recebidos: { linhas: 1021, valor: 61243000 }, emAberto: { linhas: 87, valor: 4890000 }, despesas: { linhas: 96, valor: 1830000 } } },
};
const lanc = (numero: number, cliente: string, descricao: string, data: string | null, valor: number | null, situacao: string, x: Record<string, unknown> = {}) => ({
  numero, situacao: "PRONTA", decisao: null, problemas: [], valores: { cliente, lanc_descricao: descricao }, corrigidas: [],
  cliente: { nome: cliente, tipo: "PF", contatos: [] }, clienteId: "c1", mesmaDe: null, telefoneDe: null, duplicado: null, contrato: null,
  lancamento: { descricao, data, valor, situacao, caso: { id: "k1", nome: "Ramos x INSS" } }, ...x,
});
const L8 = lanc(8, "Benedito Ramos Filho", "Honorários · parcela 3 de 6", "2026-10-10", 80000, "PAGO");
const L31 = lanc(31, "Márcio Tavares", "Honorários · parcela 2 de 4", "2026-11-15", 125000, "EM_ABERTO", { lancamento: { descricao: "Honorários · parcela 2 de 4", data: "2026-11-15", valor: 125000, situacao: "EM_ABERTO", caso: null } });
const L40 = lanc(40, "", "Honorários", null, null, "PAGO", {
  situacao: "ERRO", valores: { cliente: "C. Okada", lanc_descricao: "Honorários", lanc_valor: "" }, cliente: { nome: "", tipo: "PF", contatos: [] }, clienteId: null,
  problemas: [{ codigo: "VALOR_FALTA", campo: "lanc_valor", nivel: "ERRO" }],
});

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

// Os prazos de desfazer (desfazerAte) são datas fixas: o relógio fica em AGORA, antes deles (F3.164).
test.beforeEach(async ({ page }) => { await fixarRelogio(page); });

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
    await expect(page.getByRole("region", { name: "O que vem do Astrea" })).toContainText("Processos ativos, como casos");
    await semViolacoes(page);
    await page.getByLabel("Escolher o backup").setInputFiles({ name: "backup-astrea.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: backup() });
    await expect(page).toHaveURL(`${P}/clientes/importar/${ID}?passo=abas`);
    const envio = pedidos.find((p) => p.metodo === "POST" && p.caminho === A)!;
    expect(envio.busca).toBe("?oQue=CLIENTES&origem=ASTREA&nome=backup-astrea.xlsx");
    expect(envio.tipo).toBe("application/octet-stream");
    const lido = JSON.parse(gunzipSync(envio.bruto!).toString("utf8")) as { abas: { nome: string; linhas: number; celulas: string[][] | null }[] };
    expect(lido.abas.map((a) => [a.nome, a.linhas, a.celulas?.length ?? null])).toEqual([["Contatos", 2, 2], ["Processos", 1, 1], ["Tarefas", 1, null]]);
  });

  test("Astrea, passo 2: as abas, as colunas pelo modelo e o tipo de contato", async ({ page }) => {
    const pedidos = await simular(page, base({
      [`PATCH ${A}/${ID}/colunas`]: { corpo: { versao: 3, ...RESUMO } },
      [`PATCH ${A}/${ID}/arquivados`]: [{ status: 409, corpo: { erro: { codigo: "CONFLICT" } } }, { corpo: { ...IMP, versao: 3, arquivados: "ENCERRADOS" } }],
    }));
    await page.goto(`${P}/clientes/importar/${ID}?passo=abas`);
    await expect(page.getByRole("status").filter({ hasText: "Este backup está um pouco diferente do modelo que conhecemos." })).toContainText("Uma aba é nova");
    const t = page.getByRole("table", { name: "Abas do backup" });
    await expect(t.getByRole("row", { name: /^Processos/ })).toContainText("Casos no Jurídico");
    await expect(t.getByRole("row", { name: /^Processos/ })).toContainText("241 ativos e 71 arquivados.");
    await expect(page.getByLabel("Aba Processos: vai para")).toHaveCount(0);
    await expect(page.getByLabel("Aba Contatos: vai para")).toHaveValue("CLIENTES");
    await semViolacoes(page);
    // F3.116 (estado astrea-abas): os arquivados ficam de fora, a não ser que a sócia escolha trazê-los como encerrados.
    const arq = page.getByRole("group", { name: "Processos arquivados (71)" });
    await expect(arq.getByRole("radio", { name: /Deixar de fora/ })).toBeChecked();
    await arq.getByRole("radio", { name: /Importar como encerrados/ }).check();
    await page.getByRole("button", { name: "Conferir as colunas" }).click();
    await expect(page.getByRole("alert").or(page.getByRole("status")).filter({ hasText: "A escolha dos arquivados não foi salva." })).toBeVisible();
    await semViolacoes(page);
    await page.getByRole("button", { name: "Conferir as colunas" }).click();
    await expect(page).toHaveURL(`${P}/clientes/importar/${ID}?passo=colunas&aba=0`);
    expect(pedidos.filter((p) => p.caminho === `${A}/${ID}/arquivados`).map((p) => p.corpo)).toEqual([
      { versao: 2, arquivados: "ENCERRADOS" }, { versao: 2, arquivados: "ENCERRADOS" },
    ]);

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
    const patch = pedidos.find((p) => p.metodo === "PATCH" && p.caminho.endsWith("/colunas"))!.corpo as { aba: number; ligacao: Record<string, string>; pares: { tipoContato: Record<string, string> } };
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
  // ----------------------------------------------------------------------------- parte 2: os processos

  test("processos, colunas: o responsável pelo caso é obrigatório e os arquivados ficam de fora", async ({ page }) => {
    const pedidos = await simular(page, base({
      [`GET ${A}/${IDC}`]: { corpo: IMP_CASOS },
      [`POST ${A}/${IDC}/pares`]: { corpo: PARES_CASOS },
      [`PATCH ${A}/${IDC}/colunas`]: { corpo: { versao: 3, ...RESUMO_CASOS } },
    }));
    await page.goto(`${P}/clientes/importar/${IDC}?passo=colunas`);
    await expect(page.getByRole("heading", { level: 1, name: "Importar os processos do Astrea" })).toBeVisible();
    const map = page.getByRole("table", { name: "Colunas dos processos" });
    await expect(map.getByRole("row", { name: /^Cliente , coluna B/ })).toContainText("Pelo modelo do Astrea");
    await expect(page.getByLabel("Coluna F, Responsável: vai para")).toHaveValue("responsavel");
    await expect(page.getByLabel("“Arquivado” vira")).toHaveValue("FORA");
    await expect(page.getByLabel("“Audiência marcada” vira")).toHaveValue("e1000000-0000-4000-8000-000000000001");
    await expect(page.getByRole("region", { name: "Só os processos ativos" })).toContainText("71 processos arquivados ficam de fora da prévia.");
    await expect(page.getByRole("region", { name: "Processos arquivados" })).toHaveCount(0);
    await semViolacoes(page);
    await page.getByRole("button", { name: "Ver a prévia" }).click();
    await expect(page.getByRole("alert").or(page.getByRole("status")).filter({ hasText: "Falta ligar 1 campo obrigatório" })).toContainText("Responsável pelo caso");
    await page.getByLabel("“João Antigo” vira").selectOption(FELIPE.id);
    await page.getByRole("button", { name: "Ver a prévia" }).click();
    await expect(page).toHaveURL(`${P}/clientes/importar/${IDC}?passo=previa`);
    const patch = pedidos.find((p) => p.metodo === "PATCH")!.corpo as { pares: { responsavel: Record<string, string>; situacaoProcesso: Record<string, string> } };
    expect([patch.pares.responsavel, patch.pares.situacaoProcesso]).toEqual([{ "felipe matos": FELIPE.id, "joao antigo": FELIPE.id }, { ativo: "ATIVO", arquivado: "FORA" }]);
    expect("arquivados" in (patch as object)).toBe(false);
  });

  test("F3.116, ADVBOX: a escolha dos arquivados fica ao lado das colunas e vai com elas", async ({ page }) => {
    const adv = { ...IMP_CASOS, origem: "ADVBOX_PLANILHA", pai: null, arquivo: "processos-advbox.xlsx" };
    const pedidos = await simular(page, base({
      [`GET ${A}/${IDC}`]: { corpo: adv },
      [`POST ${A}/${IDC}/pares`]: { corpo: PARES_CASOS },
      [`PATCH ${A}/${IDC}/colunas`]: { corpo: { versao: 3, ...RESUMO_CASOS } },
    }));
    await page.goto(`${P}/clientes/importar/${IDC}?passo=colunas`);
    const arq = page.getByRole("region", { name: "Processos arquivados" });
    await expect(arq).toContainText("71 no ADVBOX");
    await expect(arq.getByRole("radio", { name: /Deixar de fora/ })).toBeChecked();
    await arq.getByRole("radio", { name: /Importar como encerrados/ }).check();
    await expect(page.getByRole("region", { name: "Os ativos e os arquivados" })).toContainText("71 processos arquivados entram como encerrados, sem resultado nem acerto.");
    await expect(page.getByLabel("“Arquivado” vira").locator("option:checked")).toHaveText("Arquivado: entra encerrado");
    await semViolacoes(page);
    await page.getByLabel("“João Antigo” vira").selectOption(FELIPE.id);
    await page.getByRole("button", { name: "Ver a prévia" }).click();
    await expect(page).toHaveURL(`${P}/clientes/importar/${IDC}?passo=previa`);
    expect((pedidos.find((p) => p.metodo === "PATCH")!.corpo as { arquivados: string }).arquivados).toBe("ENCERRADOS");
  });

  test("processos, prévia: o caso aberto, o mesmo número de um caso que existe, o número errado e o cliente que não bate", async ({ page }) => {
    const prev = { ...IMP_CASOS, temPrevia: true, linhasLidas: 241, foraTipo: { ARQUIVADOS: 71 } };
    const pedidos = await simular(page, base({
      [`GET ${A}/${IDC}`]: { corpo: prev },
      [`GET ${A}/${IDC}/linhas`]: { corpo: { importacao: prev, ...RESUMO_CASOS, linhas: [TAVARES, RAMOS, ROTA, OKADA], total: 241 } },
      [`PATCH ${A}/${IDC}/linhas/15`]: { corpo: { versao: 3, ...RESUMO_CASOS, linha: { ...RAMOS, situacao: "PRONTA", decisao: "JUNTAR" } } },
    }));
    await page.goto(`${P}/clientes/importar/${IDC}?passo=previa`);
    await expect(page.getByRole("navigation", { name: "Resumo da prévia" })).toContainText("processos lidos");
    await expect(page.getByRole("status").filter({ hasText: "71 processos arquivados ficaram de fora da prévia." })).toBeVisible();
    const res = page.getByRole("region", { name: "O que vai entrar" });
    await expect(res).toContainText("Casos no Jurídico");
    await expect(res).toContainText("Nenhum contrato");
    const linhas = page.getByRole("list", { name: "Processos" });
    await linhas.getByRole("listitem").filter({ hasText: "Tavares x Metalúrgica Andrade" }).getByRole("button", { name: "Ver o caso" }).click();
    const caso = page.getByRole("group", { name: /O caso que vai entrar no Jurídico/ });
    await expect(caso).toContainText("Instrução (“Audiência marcada” no Astrea)");
    await expect(caso).toContainText("Márcio Tavares, autor(a)");
    await expect(caso).toContainText("Entra sem contrato.");
    await semViolacoes(page);
    await caso.getByRole("button", { name: "Fechar" }).click();

    const ramos = linhas.getByRole("listitem").filter({ hasText: "Ramos x INSS" });
    await expect(ramos).toContainText("Mesmo número do caso Ramos x INSS, já no Jurídico.");
    await ramos.getByRole("button", { name: "Decidir" }).click();
    await expect(page.getByRole("radio", { name: /Juntar ao caso que já existe/ })).toBeChecked();
    await page.getByRole("button", { name: "Confirmar a decisão" }).click();
    expect(pedidos.find((p) => p.metodo === "PATCH")!.corpo).toEqual({ decisao: "JUNTAR" });

    await expect(linhas.getByRole("listitem").filter({ hasText: "Rota Sul" })).toContainText("Número do processo inválido");
    const okada = linhas.getByRole("listitem").filter({ hasText: "Okada x Banco Horizonte" });
    await expect(okada).toContainText("Cliente não encontrado");
    await okada.getByRole("button", { name: "Escolher o cliente" }).click();
    await expect(page.getByLabel("Cliente", { exact: true })).toHaveValue("C. Okada");
    await expect(page.getByLabel("CPF ou CNPJ do cliente")).toBeVisible();
    await semViolacoes(page);
  });

  test("F3.116, prévia: o arquivado entra encerrado e o mesmo número entre ativo e arquivado pede você", async ({ page }) => {
    const prev = { ...IMP_CASOS, temPrevia: true, linhasLidas: 312, foraTipo: null, arquivados: "ENCERRADOS" };
    const ARQ = linhaCaso(18, "Rosa Almeida", caso("Almeida x Banco Sul", "1000456-74.2025.5.02.0001", { encerrado: true, etapa: { id: "fim", nome: "Encerrado" } }));
    const MESMO = linhaCaso(19, "Benedito Ramos Filho", caso("Ramos x Banco Sul", "1000456-74.2025.5.02.0001", { encerrado: false }), {
      situacao: "AVISO", mesmaDe: 18, problemas: [{ codigo: "CAMPO_INVALIDO", campo: "situacao_processo", nivel: "AVISO", valor: "Ativo" }],
    });
    const resumo = { ...RESUMO_CASOS, contagens: { ...RESUMO_CASOS.contagens, lidas: 312 }, casos: { ...RESUMO_CASOS.casos, encerrados: 71 } };
    const pedidos = await simular(page, base({
      [`GET ${A}/${IDC}`]: { corpo: prev },
      [`GET ${A}/${IDC}/linhas`]: { corpo: { importacao: prev, ...resumo, linhas: [ARQ, MESMO], total: 312 } },
      [`PATCH ${A}/${IDC}/linhas/19`]: { corpo: { versao: 3, ...resumo, linha: { ...MESMO, situacao: "PRONTA", decisao: "SEGUIR" } } },
    }));
    await page.goto(`${P}/clientes/importar/${IDC}?passo=previa`);
    await expect(page.getByRole("navigation", { name: "Resumo da prévia" })).toContainText("ativos e arquivados");
    await expect(page.getByRole("region", { name: "O que vai entrar" })).toContainText("dos novos, 71 entram encerrados, sem resultado nem acerto");
    const linhas = page.getByRole("list", { name: "Processos" });
    await expect(linhas.getByRole("listitem").filter({ hasText: "Almeida x Banco Sul" })).toContainText("1000456-74.2025.5.02.0001 · Trabalhista · encerrado");
    const mesmo = linhas.getByRole("listitem").filter({ hasText: "Ramos x Banco Sul" });
    await expect(mesmo).toContainText("Mesmo número, situação diferente");
    await expect(mesmo).toContainText("Este processo está ativo aqui e arquivado na linha 18. O caso nasce da linha 18, encerrado");
    await semViolacoes(page);
    await mesmo.getByRole("button", { name: "Seguir como a linha 18" }).click();
    expect(pedidos.find((p) => p.metodo === "PATCH")!.corpo).toEqual({ decisao: "SEGUIR" });
    await expect(mesmo).toContainText("Entra no caso da linha 18.");
  });

  test("processos, resultado: os clientes do backup chamam para os processos, e os casos levam ao Jurídico", async ({ page }) => {
    const pai = { ...FIM, filha: { id: IDC, situacao: "PREVIA", linhas: 312, criadoEm: "2026-11-22T19:20:00Z" } };
    const fimCasos = { ...IMP_CASOS, situacao: "CONCLUIDA", importadoEm: "2026-11-22T19:40:00Z", desfazerAte: "2026-11-29T19:40:00Z", podeDesfazer: true,
      resumo: { ...FIM.resumo, clientes: 0, juntados: 0, linhas: 228, fora: 0, casos: 226, juntadosCasos: 2, encerrados: 40 } };
    await simular(page, base({
      [`GET ${A}/${ID}`]: { corpo: pai },
      [`GET ${A}/${IDC}`]: { corpo: fimCasos },
      [`GET ${A}`]: { corpo: { importacoes: [fimCasos, FIM] } },
      [`GET ${A}/${IDC}/desfazer`]: { corpo: { clientes: 0, juntados: 0, contratos: 0, parcelas: 0, casos: 186, encerrados: 40, ligacoes: 2, mexidos: [{ tipo: "CASO", id: "x", nome: "Tavares x Metalúrgica Andrade" }] } },
    }));
    await page.goto(`${P}/clientes/importacoes/${ID}`);
    const agora = page.getByRole("region", { name: "Agora os processos" });
    await expect(agora).toContainText("312 processos da aba Processos esperam numa segunda prévia");
    await expect(agora.getByRole("link", { name: "Conferir os processos" })).toHaveAttribute("href", `/clientes/importar/${IDC}?passo=colunas`);
    await semViolacoes(page);

    await page.goto(`${P}/clientes/importacoes/${IDC}`);
    const entrou = page.getByRole("region", { name: "O que entrou" });
    await expect(entrou).toContainText("226 casos novos");
    await expect(entrou).toContainText("40 entraram encerrados, em Encerrados, sem resultado nem acerto.");
    await expect(entrou).toContainText("2 casos que já existiam ganharam o cliente");
    await expect(entrou.getByRole("link", { name: "Ver casos" })).toHaveAttribute("href", "/juridico/casos");
    await semViolacoes(page);

    await page.goto(`${P}/clientes/importacoes`);
    await expect(page.getByRole("table", { name: "Importações do escritório" })).toContainText("226 casos, 40 encerrados, 2 juntados");
    await page.getByRole("button", { name: "Desfazer" }).first().click();
    const janela = page.getByRole("alertdialog", { name: "Desfazer a importação?" });
    await expect(janela).toContainText("186 casos vão para Encerrados");
    await expect(janela).toContainText("40 casos que vieram encerrados ficam em Encerrados, marcados “importação desfeita”, com a data em que entraram.");
    await expect(janela).toContainText("2 casos que já existiam perdem só o cliente que a importação ligou.");
    await expect(janela).toContainText("Caso Tavares x Metalúrgica Andrade");
    await semViolacoes(page);
  });

  test("ADVBOX: a planilha de processos vai com oQue CASOS", async ({ page }) => {
    const adv = { ...IMP_CASOS, origem: "ADVBOX_PLANILHA", pai: null, arquivo: "processos-advbox.csv" };
    const pedidos = await simular(page, base({ [`POST ${A}`]: { status: 201, corpo: adv }, [`GET ${A}/${IDC}`]: { corpo: adv }, [`POST ${A}/${IDC}/pares`]: { corpo: PARES_CASOS } }));
    await page.goto(`${P}/clientes/importar/advbox`);
    await expect(page.getByRole("region", { name: "O que vem do ADVBOX" }).or(page.getByRole("region", { name: "O que muda pela planilha" }))).toContainText("planilha de processos");
    await page.getByRole("radio", { name: /A de processos/ }).check();
    await semViolacoes(page);
    await page.getByLabel("Escolher a planilha").setInputFiles({ name: "processos-advbox.csv", mimeType: "text/csv", buffer: Buffer.from("Número;Cliente\n1000123-25.2025.5.02.0001;Rosa\n") });
    await expect(page).toHaveURL(`${P}/clientes/importar/${IDC}?passo=colunas`);
    expect(pedidos.find((p) => p.metodo === "POST" && p.caminho === A)!.busca).toBe("?oQue=CASOS&origem=ADVBOX_PLANILHA&nome=processos-advbox.csv");
    await expect(page.getByRole("heading", { level: 1, name: "Importar os processos do ADVBOX" })).toBeVisible();
  });

  // ----------------------------------------------------------------------------- parte 3: o financeiro

  test("financeiro, colunas: pelo modelo do Astrea, com a situação e as despesas que ficam de fora", async ({ page }) => {
    const pedidos = await simular(page, base({
      [`GET ${A}/${IDF}`]: { corpo: IMP_FIN },
      [`POST ${A}/${IDF}/pares`]: { corpo: PARES_FIN },
      [`PATCH ${A}/${IDF}/colunas`]: { corpo: { versao: 3, ...RESUMO_FIN } },
    }));
    await page.goto(`${P}/clientes/importar/${IDF}?passo=colunas`);
    await expect(page.getByRole("heading", { level: 1, name: "Importar o financeiro do Astrea" })).toBeVisible();
    const map = page.getByRole("table", { name: "Colunas dos lançamentos" });
    await expect(map.getByRole("row", { name: /^Valor , coluna D/ })).toContainText("Pelo modelo do Astrea");
    await expect(page.getByLabel("“Em aberto” vira")).toHaveValue("EM_ABERTO");
    await expect(page.getByLabel("“Despesa” vira")).toHaveValue("DESPESA");
    await expect(page.getByRole("region", { name: "Só como informação" })).toContainText("96 despesas do escritório aparecem na prévia e ficam de fora.");
    await semViolacoes(page);
    await page.getByLabel("Coluna D, Valor: vai para").selectOption("");
    await page.getByRole("button", { name: "Ver a prévia" }).click();
    await expect(page.getByRole("alert").or(page.getByRole("status")).filter({ hasText: "Falta ligar 1 campo obrigatório" })).toContainText("Valor");
    await page.getByLabel("Coluna D, Valor: vai para").selectOption("lanc_valor");
    await page.getByRole("button", { name: "Ver a prévia" }).click();
    await expect(page).toHaveURL(`${P}/clientes/importar/${IDF}?passo=previa`);
    const patch = pedidos.find((p) => p.metodo === "PATCH")!.corpo as { pares: { lancSituacao: Record<string, string>; lancTipo: Record<string, string> } };
    expect([patch.pares.lancSituacao, patch.pares.lancTipo]).toEqual([{ pago: "PAGO", "em aberto": "EM_ABERTO" }, { receita: "RECEITA", despesa: "DESPESA" }]);
  });

  test("financeiro, prévia: o recebido é informação, o em aberto vira lembrete e nada vai para o Caixa", async ({ page }) => {
    const prev = { ...IMP_FIN, temPrevia: true, linhasLidas: 1204, foraTipo: { DESPESAS: 96 } };
    const fin = { ...RESUMO_FIN, contagens: { ...RESUMO_FIN.contagens, lidas: 1204 } };
    const L77 = lanc(77, "", "Aluguel da sala", "2026-11-05", 420000, "PAGO", {
      situacao: "FORA_REGRA", cliente: { nome: "", tipo: "PF", contatos: [] }, clienteId: null,
      lancamento: { descricao: "Aluguel da sala", data: "2026-11-05", valor: 420000, situacao: "PAGO", caso: null, grupo: "DESPESAS" },
    });
    const pedidos = await simular(page, base({
      [`GET ${A}/${IDF}`]: { corpo: prev },
      [`GET ${A}/${IDF}/lancamentos`]: { corpo: { importacao: prev, ...fin, linhas: [L8, L40, L31, L77], total: 1204 } },
      [`GET ${A}/${IDF}/lancamentos?grupo=DESPESAS`]: { corpo: { importacao: prev, ...fin, linhas: [L77], total: 96 } },
      [`PATCH ${A}/${IDF}/linhas/40`]: { corpo: { versao: 3, ...RESUMO_FIN, linha: { ...L40, situacao: "PRONTA", problemas: [] } } },
    }));
    await page.goto(`${P}/clientes/importar/${IDF}?passo=previa`);
    await expect(page.getByRole("navigation", { name: "Resumo da prévia" })).toContainText("lançamentos lidos");
    // F3.117 (estado previa-financeiro): a prévia agrupada, com as despesas listadas.
    const nums = page.getByRole("navigation", { name: "Resumo da prévia" });
    await expect(nums).toContainText("lançamentos lidos");
    await expect(nums).toContainText("aba Lançamentos");
    await expect(nums.getByRole("link", { name: /despesas/ })).toContainText("ficam de fora");
    await expect(page.getByText("O financeiro do Astrea entra só como informação.")).toBeVisible();
    await expect(page.getByText("Recebidos · R$ 612.430,00 · 1.021")).toBeVisible();
    await expect(page.getByText("Em aberto · R$ 48.900,00 · 87")).toBeVisible();
    await expect(page.getByText("Despesas do escritório · 96", { exact: true })).toBeVisible();
    const desp = page.getByRole("list", { name: "Despesas do escritório" }).getByRole("listitem");
    await expect(desp).toContainText("Fica de fora");
    await expect(desp).toContainText("Despesa do escritório: o Caixa começa no T3jus.");
    await expect(desp).toContainText("Sem cliente");
    await expect(desp).toContainText("pago em 05/11/2026 · R$ 4.200,00");
    await expect(desp.getByRole("button")).toHaveCount(0);
    const res = page.getByRole("region", { name: "O que vai entrar" });
    await expect(res).toContainText("Histórico financeiro");
    await expect(res).toContainText("1.021 recebidos, R$ 612.430,00, só como informação");
    await expect(res).toContainText("72 viram lembretes para criar o contrato");
    await expect(res).toContainText("Nada no Caixa");
    const linhas = page.getByRole("list", { name: "Recebidos" });
    const l8 = linhas.getByRole("listitem").filter({ hasText: "parcela 3 de 6" });
    await expect(l8).toContainText("recebido em 10/10/2026 · R$ 800,00");
    await expect(l8).toContainText("Ramos x INSS");
    await expect(l8).toContainText("Fica no histórico da ficha, como “pago antes do T3jus”.");
    await expect(page.getByRole("list", { name: "Em aberto" }).getByRole("listitem").filter({ hasText: "parcela 2 de 4" })).toContainText("Não vira cobrança. Vira um lembrete na ficha");
    const l40 = linhas.getByRole("listitem").filter({ hasText: "L40" });
    await expect(l40).toContainText("Sem o valor");
    await expect(l40).toContainText("O lançamento precisa do valor.");
    await semViolacoes(page);
    await l40.getByRole("button", { name: "Corrigir" }).click();
    await page.getByLabel("Valor", { exact: true }).fill("1.000,00");
    await page.getByRole("button", { name: "Salvar a correção" }).click();
    expect(pedidos.find((p) => p.metodo === "PATCH")!.corpo).toEqual({ campos: { lanc_valor: "1.000,00" }, decisao: null });
    await page.getByRole("group", { name: "Mostrar" }).getByRole("button", { name: "Despesas (96)" }).click();
    await expect(page.getByRole("list", { name: "Recebidos" })).toHaveCount(0);
    await expect(page.getByRole("list", { name: "Despesas do escritório" }).getByRole("listitem")).toHaveCount(1);
    expect(pedidos.some((p) => p.caminho === `${A}/${IDF}/lancamentos` && p.busca === "?grupo=DESPESAS")).toBe(true);
  });

  test("financeiro, resultado e desfazer: os clientes chamam para o financeiro; o lembrete que virou contrato fica", async ({ page }) => {
    const pai = { ...FIM, filhaFinanceiro: { id: IDF, situacao: "PREVIA", linhas: 1204, criadoEm: "2026-11-22T19:20:00Z" } };
    const fimFin = { ...IMP_FIN, situacao: "CONCLUIDA", importadoEm: "2026-11-22T19:50:00Z", desfazerAte: "2026-11-29T19:50:00Z", podeDesfazer: true,
      resumo: { ...FIM.resumo, clientes: 0, juntados: 0, linhas: 1108, fora: 0, recebidos: 1021, valorRecebido: 61243000, emAberto: 87, valorEmAberto: 4890000, lembretes: 87 } };
    await simular(page, base({
      [`GET ${A}/${ID}`]: { corpo: pai },
      [`GET ${A}/${IDF}`]: { corpo: fimFin },
      [`GET ${A}`]: { corpo: { importacoes: [fimFin, FIM] } },
      [`GET ${A}/${IDF}/desfazer`]: { corpo: { clientes: 0, juntados: 0, contratos: 0, parcelas: 0, lancamentos: 1108, lembretes: 86, mexidos: [{ tipo: "LEMBRETE", id: "x", nome: "Márcio Tavares" }] } },
    }));
    await page.goto(`${P}/clientes/importacoes/${ID}`);
    const depois = page.getByRole("region", { name: "Depois, o financeiro" });
    await expect(depois).toContainText("1.204 lançamentos da aba Lançamentos esperam");
    await expect(depois.getByRole("link", { name: "Conferir o financeiro" })).toHaveAttribute("href", `/clientes/importar/${IDF}?passo=colunas`);
    await semViolacoes(page);

    await page.goto(`${P}/clientes/importacoes/${IDF}`);
    const entrou = page.getByRole("region", { name: "O que entrou" });
    await expect(entrou).toContainText("87 lembretes de contrato");
    await expect(entrou).toContainText("R$ 48.900,00");
    await expect(entrou).toContainText("1.021 recebimentos de antes");
    await semViolacoes(page);

    await page.goto(`${P}/clientes/importacoes`);
    await expect(page.getByRole("table", { name: "Importações do escritório" })).toContainText("1.108 lançamentos, 87 lembretes");
    await page.getByRole("button", { name: "Desfazer" }).first().click();
    const janela = page.getByRole("alertdialog", { name: "Desfazer a importação?" });
    await expect(janela).toContainText("1.108 lançamentos saem das fichas");
    await expect(janela).toContainText("Lembrete de Márcio Tavares, que virou contrato");
    await semViolacoes(page);
  });
});
