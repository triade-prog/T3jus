// Importar planilha (F3.55, VA-05), tela aprovada em docs/design/aprovadas/portal-importacao.
// Os quatro passos (arquivo, colunas, prévia, importar), o resultado, o histórico e o desfazer.
// A API é simulada; o arquivo vai como está (octet-stream) e só a API o lê.
import { expect, test, type Page } from "@playwright/test";
import { fixarRelogio, semViolacoes } from "./console-dados.ts";

const P = "http://localhost:3000";
const ESC = "e0000000-0000-4000-8000-0000000000a1";
const ID = "f1000000-0000-4000-8000-000000000501";
const ANT = "c1000000-0000-4000-8000-000000000302";
const MARINA = { id: "a0000000-0000-4000-8000-000000000101", nome: "Marina Ribeiro" };
const FELIPE = { id: "a0000000-0000-4000-8000-000000000105", nome: "Felipe Matos" };

const BASE = {
  id: ESC, nome: "Ribeiro & Matos", socios: ["Marina Ribeiro"], pessoas: 5, outrosEscritorios: 0, cnpj: null, cidade: "São Paulo", uf: "SP",
  endereco: null, contatos: [], ultimaExportacao: null,
};
const ESC_MARINA = { ...BASE, pessoa: "Marina Ribeiro", dono: true, areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"], funcoes: ["SOCIO"] };
const ESC_PAULA = { ...BASE, pessoa: "Paula Nunes", dono: false, areas: ["JURIDICO"], funcoes: ["EQUIPE"] };

const col = (indice: number, letra: string, nome: string, exemplo: string, sugestao: string | null, foraMotivo: string | null = null) =>
  ({ indice, letra, nome, exemplo, campo: sugestao && !foraMotivo ? sugestao : null, sugestao, foraMotivo });
const COLUNAS = [
  col(0, "A", "Nome do cliente", "Rosa Almeida", "nome"), col(1, "B", "CPF/CNPJ", "529.982.247-25", "documento"),
  col(2, "C", "Celular", "(11) 98451-2290", "telefone"), col(3, "D", "E-mail", "rosa.almeida@exemplo.com.br", "email"),
  col(4, "E", "Obs.", "prefere WhatsApp", null, "OBSERVACAO"),
  col(5, "F", "Serviço", "Aposentadoria por idade", "objeto"), col(6, "G", "Forma de cobrança", "parcelado", "tipo"),
  col(7, "H", "Valor", "R$ 4.800,00", "valor"), col(8, "I", "Parcelas", "6", "parcelas"), col(9, "J", "1º vencto", "10/09/2026", "primeiro"),
  col(10, "K", "Assinatura", "02/09/2026", "assinatura"), col(11, "L", "Advogado", "Dra. Marina", "responsavel"), col(12, "M", "Área", "Previdenciário", null, "AREA"),
];
const LIGACAO = Object.fromEntries(COLUNAS.filter((c) => c.campo).map((c) => [String(c.indice), c.campo]));
const IMP = {
  id: ID, arquivo: "clientes-e-contratos-2026.xlsx", oQue: "CLIENTES_CONTRATOS", origem: "PLANILHA", modelo: null, abasSistema: null, foraTipo: null, situacao: "PREVIA", versao: 2, criadoEm: "2026-11-20T18:30:00Z",
  por: MARINA, linhasLidas: null, contratos: true, comercial: true,
  abas: [{ indice: 0, nome: "Clientes e contratos", linhas: 12, colunas: 13 }, { indice: 1, nome: "Resumo", linhas: 3, colunas: 2 }],
  aba: 0, colunas: COLUNAS, ligacao: LIGACAO, pares: {}, temPrevia: false, importadoEm: null, desfazerAte: null, resumo: null, podeDesfazer: false,
  fora: 0, desfeita: null,
};
const PARES = {
  responsavel: [{ chave: "dra. marina", valor: "Dra. Marina", n: 6, sugestao: MARINA.id }, { chave: "dr. paulo", valor: "Dr. Paulo", n: 2, sugestao: null }],
  tipo: [{ chave: "parcelado", valor: "parcelado", n: 5, sugestao: "PARCELADO" }, { chave: "êxito", valor: "êxito", n: 3, sugestao: "EXITO" }],
  origem: [], equipe: [FELIPE, MARINA], colunas: COLUNAS,
};

const RESUMO = {
  contagens: { lidas: 10, prontas: 3, aviso: 4, erro: 3, puladas: 0, corrigidas: 0, decididas: 0 },
  clientes: { novos: 3, juntados: 0 }, contratos: { ativos: 2, elaboracao: 1, mensais: 0, exitos: 1 },
  financeiro: { parcelas: 5, valor: 450000, vencidas: 1, pagasAntes: 2, valorPagoAntes: 160000 },
  meses: [{ mes: "2026-12", valor: 160000 }, { mes: "2027-01", valor: 80000 }, { mes: "2027-02", valor: 80000 }],
};
const parc = (n: number, vencimento: string, valor: number, pagoAntes = false) => ({ n, vencimento, valor, pagoAntes });
const ROSA = {
  numero: 2, situacao: "PRONTA", decisao: null, problemas: [], valores: { nome: "Rosa Almeida" }, corrigidas: [],
  cliente: { nome: "Rosa Almeida", tipo: "PF", documento: "52998224725", contatos: [{ nome: "Rosa Almeida", telefone: "+5511984512290" }] },
  mesmaDe: null, telefoneDe: null, duplicado: null,
  contrato: {
    objeto: "Aposentadoria por idade", tipo: "PARCELADO", valor: 480000, parcelas: 6, primeiro: "2026-09-10", pagas: 2, assinatura: "2026-09-02",
    responsavel: MARINA,
    gera: { parcelas: 4, valor: 320000, vencidas: 0, valorVencido: 0, pagasAntes: 2, valorPagoAntes: 160000, proxima: "2026-11-10",
      lista: [parc(1, "2026-09-10", 80000, true), parc(2, "2026-10-10", 80000, true), parc(3, "2026-11-10", 80000), parc(4, "2026-12-10", 80000),
        parc(5, "2027-01-10", 80000), parc(6, "2027-02-10", 80000)] },
  },
};
const ANTONIA = {
  ...ROSA, numero: 3, situacao: "AVISO", valores: { nome: "Antonia F. Prado" },
  problemas: [{ codigo: "DUPLICADO", campo: "documento", nivel: "AVISO" }],
  cliente: { nome: "Antonia F. Prado", tipo: "PF", documento: "34567890123", contatos: [{ nome: "Antonia F. Prado", telefone: "+5511991234567" }] },
  contrato: { ...ROSA.contrato, objeto: "Revisão da pensão", tipo: "FIXO", valor: 150000, parcelas: 1, pagas: 0,
    gera: { parcelas: 1, valor: 150000, vencidas: 0, valorVencido: 0, pagasAntes: 0, valorPagoAntes: 0, proxima: "2026-12-10", lista: [parc(1, "2026-12-10", 150000)] } },
  duplicado: { id: ANT, nome: "Antônia Ferreira Prado", situacao: "ATIVO", desde: "2026-10-27T12:00:00Z", contratos: ["C-2026-031"],
    comparar: [
      { campo: "nome", planilha: "Antonia F. Prado", cadastrado: "Antônia Ferreira Prado", resultado: "FICA" },
      { campo: "documento", planilha: "34567890123", cadastrado: "34567890123", resultado: "IGUAL" },
      { campo: "email", planilha: "antonia.prado@exemplo.com.br", cadastrado: null, resultado: "ENTRA" },
    ] },
};
const MARCIO = {
  ...ROSA, numero: 4, situacao: "ERRO", valores: { nome: "Márcio Tavares", documento: "734.190.285-09", telefone: "(11) 97012-3348" },
  problemas: [{ codigo: "CPF_INVALIDO", campo: "documento", nivel: "ERRO", valor: "734.190.285-09" }],
  cliente: { nome: "Márcio Tavares", tipo: "PF", contatos: [{ nome: "Márcio Tavares", telefone: "+5511970123348" }] },
  contrato: { ...ROSA.contrato, objeto: "Reclamação trabalhista", tipo: "EXITO", valor: 3000, parcelas: null, primeiro: null, pagas: 0, responsavel: FELIPE,
    gera: { parcelas: 0, valor: 0, vencidas: 0, valorVencido: 0, pagasAntes: 0, valorPagoAntes: 0, proxima: null, lista: [] } },
};
const MARCIO_OK = { ...MARCIO, situacao: "PRONTA", problemas: [], corrigidas: [{ campo: "documento", antes: "734.190.285-09", agora: "734.190.285-04" }],
  cliente: { ...MARCIO.cliente, documento: "73419028504" } };
const PREVIA = (linhas: unknown[], r = RESUMO, total = linhas.length) => ({ importacao: { ...IMP, temPrevia: true, linhasLidas: 10 }, ...r, linhas, total });

const FIM = {
  ...IMP, situacao: "CONCLUIDA", importadoEm: "2026-11-20T18:42:00Z", desfazerAte: "2026-11-27T18:42:00Z", podeDesfazer: true, fora: 2, abas: null, colunas: null,
  resumo: { clientes: 6, juntados: 1, juntadosIds: [ANT], contratos: 6, ativos: 5, parcelas: 17, valor: 1910000, vencidas: 1, exitos: 2, valorPagoAntes: 160000, linhas: 8, fora: 2 },
};
const FORA = {
  arquivo: "clientes-e-contratos-2026.xlsx", ligacao: { 0: "nome", 1: "documento" },
  linhas: [
    { numero: 7, valores: { nome: "Vera Lúcia Nunes" }, situacao: "ERRO", problemas: [{ codigo: "CONTATO_OBRIGATORIO", campo: "telefone", nivel: "ERRO" }] },
    { numero: 9, valores: { nome: "Lúcia Helena Barros" }, situacao: "PULADA", problemas: [{ codigo: "VALOR_INVALIDO", campo: "valor", nivel: "ERRO", valor: "2.5OO" }] },
  ],
};
const PLANO = { clientes: 5, juntados: 1, contratos: 5, parcelas: 17, mexidos: [{ tipo: "CONTRATO", id: "x", nome: "C-2026-040 · Oficina Irmãos Dias" }] };

type Resp = { status?: number; corpo: unknown };
type Pedido = { metodo: string; caminho: string; busca: string; corpo: unknown; tipo: string | null; bytes: number };
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
    pedidos.push({ metodo, caminho, busca: url.search, corpo, tipo, bytes: req.postDataBuffer()?.length ?? 0 });
    const r = rotas[`${metodo} ${caminho}${url.search}`] ?? rotas[`${metodo} ${caminho}`] ?? rotas[caminho];
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
const XLSX = { name: "clientes-e-contratos-2026.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: Buffer.from("PK\u0003\u0004 planilha") };

// Os prazos de desfazer (desfazerAte) são datas fixas: o relógio fica em AGORA, antes deles (F3.164).
test.beforeEach(async ({ page }) => { await fixarRelogio(page); });

test.describe("F3.55: Importar planilha", () => {
  test("passo 1: escolher o arquivo envia como está e abre as colunas; a planilha-modelo abre na janela", async ({ page }) => {
    const pedidos = await simular(page, base({ [`POST ${A}`]: { status: 201, corpo: IMP } }));
    await page.goto(`${P}/clientes/importar?modelo=1`);
    const janela = page.getByRole("dialog", { name: "Colunas da planilha-modelo" });
    await expect(janela).toBeVisible();
    await expect(janela).toContainText("Responsável pelo contrato");
    await semViolacoes(page);
    await janela.getByRole("button", { name: "Fechar", exact: true }).last().click();
    await expect(page.getByRole("heading", { level: 1, name: "Importar planilha" })).toBeVisible();
    await expect(page.getByRole("radio", { name: /Clientes e contratos/ })).toBeChecked();
    await expect(page.getByText("O arquivo não fica guardado.")).toBeVisible();
    await expect(page.getByRole("region", { name: "Importações anteriores" })).toContainText("clientes-e-contratos-2026.xlsx");
    await semViolacoes(page);
    await page.getByRole("radio", { name: /Só clientes/ }).check();
    await page.getByLabel("Escolher a planilha").setInputFiles(XLSX);
    await expect(page).toHaveURL(`${P}/clientes/importar/${ID}?passo=colunas`);
    const envio = pedidos.find((p) => p.metodo === "POST" && p.caminho === A)!;
    expect(envio.busca).toBe("?oQue=CLIENTES&nome=clientes-e-contratos-2026.xlsx");
    expect(envio.tipo).toBe("application/octet-stream");
    expect(envio.bytes).toBe(XLSX.buffer.length);
  });

  test("passo 1: arquivo que não é planilha diz o que fazer; sem a área Contratos, só clientes", async ({ page }) => {
    await simular(page, base({
      "GET /v1/escritorio": { corpo: ESC_PAULA },
      [`POST ${A}`]: { status: 400, corpo: { erro: { codigo: "VALIDATION_ERROR", detalhes: { motivo: "ARQUIVO_FORMATO" } } } },
    }));
    await page.goto(`${P}/clientes/importar`);
    await expect(page.getByText("Contratos ficam na área Contratos, que não está liberada para você.")).toBeVisible();
    await expect(page.getByRole("radio")).toHaveCount(0);
    await page.getByLabel("Escolher a planilha").setInputFiles({ name: "contrato.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.7") });
    const erro = page.getByRole("alert").filter({ hasText: "Este arquivo não é uma planilha." });
    await expect(erro).toContainText("“contrato.pdf” não é .xlsx nem .csv");
    await expect(page.getByRole("region", { name: "Outros problemas de arquivo" })).toContainText("ARQUIVO_PROTEGIDO");
    await semViolacoes(page);
  });

  test("passo 2: as colunas ligadas pelo nome, os pares e o que falta ligar antes da prévia", async ({ page }) => {
    const pedidos = await simular(page, base({ [`PATCH ${A}/${ID}/colunas`]: { corpo: { versao: 3, ...RESUMO } } }));
    await page.goto(`${P}/clientes/importar/${ID}?passo=colunas`);
    await expect(page.getByRole("heading", { level: 2, name: "Ligue as colunas aos campos do T3jus" })).toBeVisible();
    await expect(page.getByLabel("Coluna A, Nome do cliente: vai para")).toHaveValue("nome");
    await expect(page.getByLabel("Coluna E, Obs.: vai para")).toHaveValue("");
    await expect(page.getByText("Observação livre não entra: pode trazer dado que o cadastro não pede (LGPD).")).toBeVisible();
    await expect(page.getByLabel("“Dra. Marina” vira")).toHaveValue(MARINA.id);
    await expect(page.getByText("Não está na Equipe. Os contratos dele ficam com quem você escolher.")).toBeVisible();
    await expect(page.getByRole("region", { name: "O que é obrigatório" })).toContainText("Falta ligar 1.");
    await semViolacoes(page);
    // Dr. Paulo fica com Felipe; o nome sai da coluna A: a prévia não é feita.
    await page.getByLabel("“Dr. Paulo” vira").selectOption(FELIPE.id);
    await page.getByLabel("Coluna A, Nome do cliente: vai para").selectOption("");
    await page.getByRole("button", { name: "Ver a prévia" }).click();
    const falta = page.getByRole("alert").filter({ hasText: "Falta ligar 1 campo obrigatório. A prévia ainda não foi feita." });
    await expect(falta).toContainText("Nome ou razão social");
    expect(pedidos.some((p) => p.metodo === "PATCH")).toBe(false);
    // Escolher "Nome" em outra coluna solta a anterior.
    await page.getByLabel("Coluna A, Nome do cliente: vai para").selectOption("nome");
    await page.getByRole("button", { name: "Ver a prévia" }).click();
    await expect(page).toHaveURL(`${P}/clientes/importar/${ID}?passo=previa`);
    const patch = pedidos.find((p) => p.metodo === "PATCH")!;
    expect(patch.corpo).toMatchObject({ versao: 2, aba: 0, ligacao: { 0: "nome" }, pares: { responsavel: { "dr. paulo": FELIPE.id, "dra. marina": MARINA.id } } });
    expect(Object.keys((patch.corpo as { ligacao: object }).ligacao)).not.toContain("4");
  });

  test("passo 3: corrigir o CPF, juntar o duplicado e importar o que está pronto", async ({ page }) => {
    const depois = { ...RESUMO, contagens: { ...RESUMO.contagens, prontas: 4, erro: 2, corrigidas: 1 } };
    const pedidos = await simular(page, base({
      [`GET ${A}/${ID}`]: { corpo: { ...IMP, temPrevia: true } },
      [`GET ${A}/${ID}/linhas`]: [{ corpo: PREVIA([ROSA, ANTONIA, MARCIO], RESUMO, 10) }, { corpo: PREVIA([ROSA, ANTONIA, MARCIO_OK], depois, 10) }],
      [`PATCH ${A}/${ID}/linhas/4`]: { corpo: { ...depois, versao: 3, linha: MARCIO_OK } },
      [`PATCH ${A}/${ID}/linhas/3`]: { corpo: { ...depois, versao: 4, linha: { ...ANTONIA, situacao: "PRONTA", decisao: "JUNTAR" } } },
      [`POST ${A}/${ID}/importar`]: { corpo: FIM },
      [`GET ${A}/${ID}/fora`]: { corpo: FORA },
    }));
    await page.goto(`${P}/clientes/importar/${ID}?passo=previa`);
    await expect(page.getByText("Nada foi salvo ainda.")).toBeVisible();
    const linhas = page.getByRole("list", { name: "Linhas da planilha" });
    await expect(linhas.getByRole("listitem")).toHaveCount(3);
    await expect(linhas.getByRole("listitem").nth(0)).toContainText("4 parcelas a vencer, R$ 3.200,00(2 pagas antes)");
    await expect(page.getByRole("region", { name: "O que vai entrar" })).toContainText("R$ 1.600,00 em 2 parcelas.");
    await semViolacoes(page);

    // Ver o que a linha 2 gera: as pagas antes ficam como informação.
    await linhas.getByRole("listitem").nth(0).getByRole("button", { name: "Ver o que gera" }).click();
    await expect(page.getByRole("list", { name: "Parcelas do contrato" })).toContainText("Parcela 1 de 6 · paga antes do T3jus");
    await page.getByRole("group", { name: /O que a linha 2 gera/ }).getByRole("button", { name: "Fechar" }).click();

    // Corrigir o CPF da linha 4.
    await linhas.getByRole("listitem").nth(2).getByRole("button", { name: "Corrigir" }).click();
    const cpf = page.getByLabel("CPF ou CNPJ");
    await expect(cpf).toHaveAccessibleDescription(/o último dígito não bate/);
    await cpf.fill("734.190.285-04");
    await page.getByRole("button", { name: "Salvar a correção" }).click();
    await expect(linhas.getByRole("listitem").nth(2)).toContainText("Corrigida por você: cpf ou cnpj era “734.190.285-09”.");
    expect(pedidos.find((p) => p.caminho.endsWith("/linhas/4"))!.corpo).toEqual({ campos: { documento: "734.190.285-04", telefone: "(11) 97012-3348" }, decisao: null });

    // Decidir o duplicado: comparar e juntar.
    await linhas.getByRole("listitem").nth(1).getByRole("button", { name: "Decidir" }).click();
    const cmp = page.getByRole("table", { name: /Linha 3 comparada ao cadastro de Antônia Ferreira Prado/ });
    await expect(cmp).toContainText("vazio · entra o da planilha");
    await semViolacoes(page);
    await page.getByRole("button", { name: "Confirmar a decisão" }).click();
    expect(pedidos.find((p) => p.caminho.endsWith("/linhas/3"))!.corpo).toEqual({ decisao: "JUNTAR" });

    // Importar.
    await page.getByRole("button", { name: /Importar 4 linhas prontas/ }).click();
    const conf = page.getByRole("dialog", { name: "Importar 4 linhas?" });
    await expect(conf).toContainText("Ou entra tudo ou nada.");
    await semViolacoes(page);
    await conf.getByRole("button", { name: "Importar 4 linhas" }).click();
    await expect(page).toHaveURL(`${P}/clientes/importacoes/${ID}`);
    expect(pedidos.find((p) => p.caminho.endsWith("/importar"))!.corpo).toEqual({ versao: 4 });
  });

  test("resultado: o que entrou, as linhas de fora e o desfazer com o motivo", async ({ page }) => {
    const pedidos = await simular(page, base({
      [`GET ${A}/${ID}`]: [{ corpo: FIM }, { corpo: { ...FIM, situacao: "DESFEITA", podeDesfazer: false, desfeita: { em: "2026-11-20T19:00:00Z", por: MARINA, motivo: "Importei a aba errada" } } }],
      [`GET ${A}/${ID}/fora`]: { corpo: FORA },
      [`GET ${A}/${ID}/desfazer`]: { corpo: PLANO },
      [`POST ${A}/${ID}/desfazer`]: { corpo: { ...FIM, situacao: "DESFEITA", feito: PLANO } },
    }));
    await page.goto(`${P}/clientes/importacoes/${ID}`);
    await expect(page.getByRole("heading", { level: 1, name: "Importação concluída" })).toBeVisible();
    const entrou = page.getByRole("region", { name: "O que entrou" });
    await expect(entrou).toContainText("5 clientes novos");
    await expect(entrou.getByRole("link", { name: "Ver clientes" })).toHaveAttribute("href", `/clientes?importacao=${ID}`);
    await expect(entrou.getByRole("link", { name: "Ver o cadastro" })).toHaveAttribute("href", `/clientes?importacao=${ID}&juntados=1`);
    await expect(entrou).toContainText("17 parcelas · R$ 19.100,00");
    await expect(page.getByRole("region", { name: "Ficaram de fora" })).toContainText("Lúcia Helena BarrosValor ilegível · pulada");
    await semViolacoes(page);

    await page.getByRole("button", { name: "Desfazer importação" }).click();
    const j = page.getByRole("alertdialog", { name: "Desfazer a importação?" });
    await expect(j).toContainText("5 clientes novos ficam inativos");
    await expect(j).toContainText("1 item já foi mexido depois da importação e fica como está.");
    await semViolacoes(page);
    await j.getByRole("button", { name: "Desfazer importação" }).click();
    await expect(j.getByLabel("Motivo")).toHaveAccessibleDescription(/pelo menos 3 letras/);
    await j.getByLabel("Motivo").fill("Importei a aba errada");
    await j.getByRole("button", { name: "Desfazer importação" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Importação desfeita" })).toBeVisible();
    expect(pedidos.find((p) => p.metodo === "POST" && p.caminho.endsWith("/desfazer"))!.corpo).toEqual({ motivo: "Importei a aba errada" });
  });

  test("histórico e entradas: Clientes e Contratos levam à importação", async ({ page }) => {
    await simular(page, base({
      "GET /v1/escritorio/clientes?situacao=ATIVO": { corpo: { comercial: true, clientes: [] } },
      "GET /v1/escritorio/clientes?situacao=INATIVO": { corpo: { comercial: true, clientes: [] } },
    }));
    await page.goto(`${P}/clientes/importacoes`);
    await expect(page.getByRole("heading", { level: 1, name: "Importações" })).toBeVisible();
    const t = page.getByRole("table", { name: "Importações do escritório" });
    await expect(t).toContainText("6 clientes, 6 contratos, 17 parcelas");
    await expect(t.getByRole("button", { name: "Desfazer" })).toBeVisible();
    await semViolacoes(page);
    await page.goto(`${P}/clientes`);
    await expect(page.getByRole("link", { name: "Importar dados" }).first()).toHaveAttribute("href", "/clientes/importar");
  });
});
