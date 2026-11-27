// "Não foi paga" na folha "Pago antes do T3jus" (F3.84, VA-05) e o logo do escritório e o
// registro da sociedade na OAB no carnê e no recibo (F3.81, FI-23; F3.19, FI-14). Telas aprovadas
// em docs/design/aprovadas/portal-nao-paga-logo. A API é simulada; aqui se testa a tela, a
// acessibilidade e o que ela manda ao servidor.
import { deflateSync } from "node:zlib";
import { expect, test, type Page } from "@playwright/test";
import { agora, fixarRelogio, semViolacoes } from "./console-dados.ts";
import { quadroAntesDoCommit } from "./quadro.ts";

const P = "http://localhost:3000";
const ESC = "e0000000-0000-4000-8000-0000000000a1";
const MARINA = { id: "a0000000-0000-4000-8000-000000000101", nome: "Marina Ribeiro" };
const DIEGO = { id: "a0000000-0000-4000-8000-000000000102", nome: "Diego Almeida" };
const FELIPE = { id: "a0000000-0000-4000-8000-000000000103", nome: "Felipe Matos" };
const CT = "f1000000-0000-4000-8000-000000000141";
const rc = (n: number) => `b1000000-0000-4000-8000-0000000001${String(n).padStart(2, "0")}`;
const LOGO = "10900000-0000-4000-8000-000000000001";
const CLARO = "10900000-0000-4000-8000-000000000002";

const ESCRITORIO = {
  id: ESC, nome: "Ribeiro & Matos", pessoa: "Marina Ribeiro", dono: true, areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"],
  socios: ["Marina Ribeiro"], pessoas: 5, outrosEscritorios: 0, funcoes: ["SOCIO"], cnpj: "41276839000134", cidade: "São Paulo", uf: "SP",
  endereco: "Rua Cardeal Arcoverde, 1749", contatos: [], ultimaExportacao: null,
};
const FELIPE_ESC = { ...ESCRITORIO, pessoa: "Felipe Matos", dono: false, areas: ["COMERCIAL", "CONTRATOS", "JURIDICO"], funcoes: ["EQUIPE"] };
const DIEGO_ESC = { ...ESCRITORIO, pessoa: "Diego Almeida", dono: false, areas: ["COMERCIAL", "FINANCEIRO"], funcoes: ["EQUIPE"] };

const dia = (n: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(agora + n * 864e5));
const br = (n: number) => dia(n).split("-").reverse().join("/");
const em = (n: number, h: string) => `${dia(n)}T${h}:00-03:00`;

// ------------------------------------------------------------------ o contrato de Rosa: 6 × R$ 800,00, 2 pagas antes
const parcela = (n: number, d: number, extra = {}) => ({
  id: rc(40 + n), tipo: "PARCELADO", descricao: `Parcela ${n} de 6`, vencimento: dia(d), valor: 80000, origem: "PROGRAMADO",
  criadoEm: em(-1, "15:42"), cancelado: null, base: null, pagoAntes: false, ...extra,
});
const paga = (n: number, d: number, extra = {}) => parcela(n, d, { pagoAntes: true, cancelado: { em: em(-1, "15:42"), motivo: "Paga antes do T3jus (importação)" }, ...extra });
const ANTES = [paga(1, -39), paga(2, -8), parcela(3, 22), parcela(4, 53), parcela(5, 83), parcela(6, 114)];
const ficha = (recebimentos: unknown[], extra = {}) => ({
  id: CT, numero: "C-2026-041", objeto: "Aposentadoria por idade", situacao: "ATIVO", cliente: { id: "c41", nome: "Rosa Almeida", tipo: "PF" },
  responsavel: MARINA, condicoes: [{ tipo: "PARCELADO", total: 480000, parcelas: 6, primeiro: dia(-39) }], proximo: { em: dia(22), valor: 80000, aDefinir: 0, itens: ["Parcela 3 de 6"] },
  basePendente: null, criadoEm: em(-1, "15:42"), observacoes: null, versao: 1, assinadoEm: dia(-40), assinaturaPor: MARINA, encerradoEm: null, motivoEncerramento: null,
  proposta: null, advogados: [MARINA], financeiro: true, historico: [], recebimentos, podeMarcarNaoPaga: true, quemFinanceiro: [DIEGO, MARINA], mudancasPagoAntes: [],
  importacao: { id: "e4000000-0000-4000-8000-000000000041", arquivo: "clientes-e-contratos-2026.xlsx", linha: 2, por: MARINA, em: em(-1, "15:42"),
    desfazerAte: `${dia(6)}T15:42:00-03:00`, desfeita: false },
  ...extra,
});
const MOTIVO = "A planilha dizia 2 pagas, mas Rosa só pagou a primeira. Ela confirmou por telefone hoje.";
const DEPOIS = ficha(
  [paga(1, -39), paga(2, -8, { corrigida: true }), parcela(2, -8, { id: rc(60), eraPagoAntes: true, podeVoltar: true, criadoEm: em(0, "10:14") }), ...ANTES.slice(2)],
  {
    historico: [{ em: em(0, "10:14"), acao: "contrato.parcela_nao_paga", autor: "Marina Ribeiro",
      dados: { descricao: "Parcela 2 de 6", vencimentoPlanilha: dia(-8), vencimento: dia(-8), motivo: MOTIVO } }],
    mudancasPagoAntes: [{ id: "m1", tipo: "NAO_PAGA", parcela: "Parcela 2 de 6", vencimentoPlanilha: dia(-8), vencimento: dia(-8), motivo: MOTIVO, por: MARINA, em: em(0, "10:14") }],
  },
);

type Resp = { status?: number; corpo: unknown; png?: Buffer };
type Pedido = { metodo: string; caminho: string; busca: string; corpo: unknown; tipo: string | null; bytes: number };

async function simular(page: Page, rotas: Record<string, Resp | Resp[]>) {
  const pedidos: Pedido[] = [];
  await page.route("**/api/v1/**", async (rota) => {
    const req = rota.request();
    const url = new URL(req.url());
    const caminho = url.pathname.replace(/^\/api/, "");
    const metodo = req.method();
    const tipo = req.headers()["content-type"] ?? null;
    const bruto = req.postDataBuffer();
    pedidos.push({ metodo, caminho, busca: url.search, corpo: tipo?.includes("json") ? req.postDataJSON() : null, tipo, bytes: bruto?.length ?? 0 });
    const r = rotas[`${metodo} ${caminho}${url.search}`] ?? rotas[`${metodo} ${caminho}`] ?? rotas[caminho];
    const lista = Array.isArray(r) ? r : r ? [r] : [{ status: 404, corpo: { erro: { codigo: "NOT_FOUND" } } }];
    const vez = pedidos.filter((p) => p.caminho === caminho && p.metodo === metodo).length - 1;
    const x = lista[Math.min(vez, lista.length - 1)]!;
    if (x.png) return rota.fulfill({ status: 200, contentType: "image/png", body: x.png });
    await rota.fulfill({ status: x.status ?? 200, contentType: "application/json", body: JSON.stringify(x.corpo) });
  });
  return pedidos;
}

/** Um PNG RGBA com um retângulo pintado e margem transparente em volta. */
function png(largura: number, altura: number, cor: [number, number, number], margem = 20): Buffer {
  const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b: Buffer) => { let c = ~0; for (const x of b) c = crcT[(c ^ x) & 0xff]! ^ (c >>> 8); return (~c) >>> 0; };
  const pedaco = (nome: string, dados: Buffer) => {
    const t = Buffer.concat([Buffer.from(nome, "ascii"), dados]);
    const out = Buffer.alloc(12 + dados.length);
    out.writeUInt32BE(dados.length, 0);
    t.copy(out, 4);
    out.writeUInt32BE(crc(t), 8 + dados.length);
    return out;
  };
  const cru = Buffer.alloc((largura * 4 + 1) * altura);
  for (let y = margem; y < altura - margem; y++) {
    for (let x = margem; x < largura - margem; x++) {
      const i = y * (largura * 4 + 1) + 1 + x * 4;
      cru[i] = cor[0]; cru[i + 1] = cor[1]; cru[i + 2] = cor[2]; cru[i + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largura, 0); ihdr.writeUInt32BE(altura, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), pedaco("IHDR", ihdr), pedaco("IDAT", deflateSync(cru)), pedaco("IEND", Buffer.alloc(0))]);
}
const PNG_LARGO = png(1440, 380, [0x1f, 0x2a, 0x44]);
const PNG_CLARO = png(1440, 380, [0xf0, 0xe0, 0xb0]);

const comunsContrato = (escritorio: unknown = ESCRITORIO) => ({
  "/v1/escritorio": { corpo: escritorio },
  "/v1/escritorio/pessoas": { corpo: { pessoas: [DIEGO, MARINA, FELIPE] } },
  [`GET /v1/escritorio/contratos/${CT}/carnes`]: { corpo: {
    contrato: { id: CT, numero: "C-2026-041", objeto: "Aposentadoria por idade", situacao: "ATIVO" }, cliente: { id: "c41", nome: "Rosa Almeida" },
    parcelas: [], recebimento: { pixTipo: null, pixChave: null, recebedor: null, cidade: null, instrucoes: null }, dono: true, socioDono: MARINA, carnes: [],
  } },
});

// O relógio do navegador fica em AGORA, o mesmo instante de onde os dados contam (F3.164).
test.beforeEach(async ({ page }) => { await fixarRelogio(page); });

test.describe("\"Não foi paga\" no Pago antes do T3jus (F3.84, VA-05)", () => {
  test("a parcela passa para A receber com motivo; sem motivo, o erro fica no campo", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comunsContrato(),
      [`GET /v1/escritorio/contratos/${CT}`]: [{ corpo: ficha(ANTES) }, { corpo: DEPOIS }],
      [`POST /v1/escritorio/contratos/${CT}/pago-antes/${rc(42)}/nao-paga`]: { status: 201, corpo: { ...parcela(2, -8), id: rc(60) } },
    });
    await page.goto(`${P}/contratos/contratos/${CT}?aba=recebimentos`);
    const folha = page.getByRole("region", { name: "Pago antes do T3jus" });
    await expect(folha).toContainText("2 parcelas que a planilha trouxe como já pagas.");
    await expect(folha).toContainText("Uma parcela não foi paga? Use “Não foi paga” na linha dela.");
    await expect(folha).toContainText(`A planilha inteira estava errada? Até ${br(6).slice(0, 5)} dá para desfazer a importação`);
    await expect(folha.getByRole("link", { name: "Desfazer a importação" })).toHaveAttribute("href", "/clientes/importacoes/e4000000-0000-4000-8000-000000000041?desfazer=1");
    await semViolacoes(page);

    await folha.getByRole("button", { name: `Não foi paga: parcela 2 de 6, de ${br(-8)}` }).click();
    const j = page.getByRole("dialog", { name: "A parcela 2 de 6 não foi paga?" });
    await expect(j).toContainText("O programado do contrato passa de R$ 3.200,00 para R$ 4.000,00.");
    await expect(j).toContainText("A cobrança fica com Marina Ribeiro, que cuida do contrato, com a próxima ação “Falar com Rosa Almeida” amanhã.");
    await expect(j).toContainText("Nenhum aviso automático sai para Rosa por esta parcela.");
    await expect(j.getByRole("radio", { name: new RegExp(`Manter ${br(-8)}, o da planilha`) })).toBeChecked();
    await expect(j.getByRole("radio", { name: new RegExp(`Manter ${br(-8)}`) })).toBeFocused();
    await expect(j).toContainText("Entra já vencida há 8 dias, em Vencidas.");
    await semViolacoes(page);

    await j.getByRole("button", { name: "Passar para A receber" }).click();
    await expect(j.getByText("Falta o motivo.")).toBeVisible();
    await expect(j.getByLabel("Por que não foi paga")).toHaveAttribute("aria-invalid", "true");
    await expect(j.getByLabel("Por que não foi paga")).toBeFocused();
    expect(pedidos.some((p) => p.metodo === "POST")).toBe(false);
    await semViolacoes(page);

    await j.getByLabel("Por que não foi paga").fill(MOTIVO);
    await j.getByRole("button", { name: "Passar para A receber" }).click();
    await expect(page.getByRole("status").filter({ hasText: "A parcela 2 de 6 passou para A receber." })).toBeVisible();
    expect(pedidos.find((p) => p.metodo === "POST")!.corpo).toEqual({ vencimento: "ORIGINAL", motivo: MOTIVO });

    // Depois: na programação, vencida, com "Foi paga, sim"; a folha com 1; o histórico; o cabeçalho em atraso.
    const prog = page.getByRole("table", { name: "Programação dos recebimentos" });
    const linha = prog.getByRole("row", { name: /Parcela 2 de 6/ });
    await expect(linha).toContainText("Era “paga antes do T3jus” até hoje");
    await expect(linha).toContainText("Vencida há 8 dias");
    await expect(linha.getByRole("button", { name: "Foi paga, sim: parcela 2 de 6" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Pago antes do T3jus" })).toContainText("1 parcela que a planilha trouxe como já paga. A parcela 2 passou para A receber hoje.");
    await expect(page.getByText("Recebimento em atraso")).toBeVisible();
    await expect(page.getByRole("link", { name: "Ver em A receber" })).toHaveAttribute("href", "/financeiro/a-receber");
    const hist = page.getByRole("region", { name: "Histórico dos recebimentos" });
    await expect(hist).toContainText("Marina Ribeiro passou a parcela 2 de 6 para A receber, às 10h14");
    await expect(hist).toContainText(`Vencimento mantido: ${br(-8)}`);
    await expect(hist).toContainText("Nenhum aviso automático saiu para Rosa.");
    await semViolacoes(page);
  });

  test("outra data, conflito com quem mudou antes e falha do servidor", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comunsContrato(),
      [`GET /v1/escritorio/contratos/${CT}`]: { corpo: ficha(ANTES) },
      [`POST /v1/escritorio/contratos/${CT}/pago-antes/${rc(42)}/nao-paga`]: [
        { status: 500, corpo: { erro: { codigo: "INTERNAL_ERROR" } } },
        { status: 409, corpo: { erro: { codigo: "VERSION_CONFLICT", detalhes: { motivo: "JA_MUDADA", por: DIEGO, em: em(0, "10:13"), como: { vencimento: dia(-8), situacao: "VENCIDA" } } } } },
      ],
    });
    await page.goto(`${P}/contratos/contratos/${CT}?aba=recebimentos`);
    await page.getByRole("button", { name: /Não foi paga: parcela 2 de 6/ }).click();
    const j = page.getByRole("dialog", { name: "A parcela 2 de 6 não foi paga?" });
    await j.getByRole("radio", { name: /Outra data, combinada com o cliente/ }).check();
    await j.getByLabel("Novo vencimento").fill(br(15));
    await j.getByLabel("Por que não foi paga").fill("Combinado com Rosa por telefone");
    await j.getByRole("button", { name: "Passar para A receber" }).click();
    await expect(j.getByText("Não deu para passar a parcela. Nada mudou.")).toBeVisible();
    await expect(j.getByRole("button", { name: "Tentar de novo" })).toBeFocused();
    await expect(j.getByLabel("Por que não foi paga")).toHaveValue("Combinado com Rosa por telefone");
    expect(pedidos.filter((p) => p.metodo === "POST")[0]!.corpo).toEqual({ vencimento: dia(15), motivo: "Combinado com Rosa por telefone" });
    await semViolacoes(page);

    await j.getByRole("button", { name: "Tentar de novo" }).click();
    await expect(j.getByText("Diego Almeida mexeu nesta parcela enquanto a janela estava aberta.")).toBeVisible();
    await expect(j).toContainText(`Em A receber, vencida desde ${br(-8)}`);
    await expect(j).toContainText("Você abriu a janela");
    await expect(j.getByRole("button", { name: "Ver como ficou" })).toBeFocused();
    await expect(j.getByRole("button", { name: "Passar para A receber" })).toHaveCount(0);
    await semViolacoes(page);
  });

  test("\"Foi paga, sim\" pede o motivo e diz por que não volta quando já há movimento", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comunsContrato(),
      [`GET /v1/escritorio/contratos/${CT}`]: { corpo: DEPOIS },
      [`POST /v1/escritorio/recebimentos/${rc(60)}/foi-paga`]: { status: 422, corpo: { erro: { codigo: "VALIDATION_ERROR", detalhes: { motivo: "JA_TEM_MOVIMENTO", qual: "CARNE" } } } },
    });
    await page.goto(`${P}/contratos/contratos/${CT}?aba=recebimentos`);
    await page.getByRole("button", { name: "Foi paga, sim: parcela 2 de 6" }).click();
    const j = page.getByRole("dialog", { name: "A parcela 2 de 6 foi paga, sim?" });
    await expect(j.getByLabel("Por que foi paga, afinal")).toBeFocused();
    await expect(j).toContainText("Só dá para voltar enquanto nada foi feito nela em A receber");
    await semViolacoes(page);
    await j.getByRole("button", { name: "Voltar para pago antes" }).click();
    await expect(j.getByLabel("Por que foi paga, afinal")).toHaveAttribute("aria-invalid", "true");
    await j.getByLabel("Por que foi paga, afinal").fill("Rosa mandou o comprovante");
    await j.getByRole("button", { name: "Voltar para pago antes" }).click();
    await expect(j.getByText("A parcela não volta mais.")).toBeVisible();
    await expect(j).toContainText("Ela já está num carnê.");
    expect(pedidos.find((p) => p.metodo === "POST")!.corpo).toEqual({ motivo: "Rosa mandou o comprovante" });
  });

  test("quem não tem o Financeiro vê a folha sem o botão e quem pode", async ({ page }) => {
    await simular(page, {
      ...comunsContrato(FELIPE_ESC),
      [`GET /v1/escritorio/contratos/${CT}`]: { corpo: ficha(ANTES, { financeiro: false, podeMarcarNaoPaga: false }) },
    });
    await page.goto(`${P}/contratos/contratos/${CT}?aba=recebimentos`);
    const folha = page.getByRole("region", { name: "Pago antes do T3jus" });
    await expect(folha).toContainText("2 parcelas que a planilha trouxe como já pagas.");
    await expect(folha.getByRole("button", { name: /Não foi paga/ })).toHaveCount(0);
    await expect(folha).toContainText("Quem tem a área Financeiro passa a parcela para A receber: Diego Almeida ou Marina Ribeiro.");
    await expect(folha).toContainText("é com Marina Ribeiro, que importou.");
    await semViolacoes(page);
  });
});

// ------------------------------------------------------------------ o logo e a OAB
const RECEB = {
  dono: true, socioDono: MARINA, versao: 3, pixTipo: "CNPJ", pixChave: "41276839000134", recebedor: "RIBEIRO E MATOS SOC ADV", cidade: "SAO PAULO",
  instrucoes: null, atualizadoPor: MARINA, atualizadoEm: em(-6, "10:02"), sugestao: { recebedor: "Ribeiro & Matos", cidade: "São Paulo", cnpj: "41276839000134" },
  marca: "LETRA", logoJeito: null, logoCor: "ARQUIVO", logo: null, oabUf: null, oabNumero: null, oab: null,
};
const logoGuardado = (id: string, passa: boolean, extra = {}) => ({
  id, nome: passa ? "logo-ribeiro-matos.png" : "logo-dourado.png", formato: "PNG", bytes: 88000, largura: 1400, altura: 340,
  corte: { esquerda: 20, topo: 20, direita: 20, baixo: 20 }, contraste: passa ? 14.2 : 1.2, passa, enviadoPor: MARINA, enviadoEm: em(0, "10:30"), ...extra,
});

test.describe("Logo do escritório no carnê e no recibo (F3.81, F3.19)", () => {
  test("enviar o logo, conferir, ver a prévia e salvar; a OAB só para ler, com o caminho para mudar (PA-07)", async ({ page }) => {
    const pedidos = await simular(page, {
      "/v1/escritorio": { corpo: ESCRITORIO },
      "GET /v1/escritorio/recebimento": [{ corpo: RECEB }, { corpo: { ...RECEB, versao: 4, marca: "LOGO", logo: logoGuardado(LOGO, true), logoJeito: "SO_LOGO", oabUf: "SP", oabNumero: "31874", oab: "OAB/SP 31.874", atualizadoEm: em(0, "10:31") } }],
      "POST /v1/escritorio/recebimento/logo": { status: 201, corpo: logoGuardado(LOGO, true) },
      "PUT /v1/escritorio/recebimento": { corpo: { versao: 4, desatualizados: 0, naoSalvo: null } },
      [`GET /v1/escritorio/logos/${LOGO}`]: { corpo: null, png: PNG_LARGO },
    });
    await page.goto(`${P}/meu-escritorio/recebimento`);
    const folha = page.getByRole("region", { name: "Marca e timbrado" });
    await expect(folha.getByRole("radio", { name: /O nome do escritório em letra/ })).toBeChecked();
    await expect(folha.getByRole("img", { name: /^Prévia do alto do carnê, em cores, com o nome em letra e a identificação do escritório: Ribeiro & Matos · CNPJ 41\.276\.839\/0001-34/ })).toBeVisible();
    await folha.getByRole("radio", { name: /O logo do escritório/ }).check();
    await expect(folha.getByRole("list", { name: "Como o T3jus confere o logo" })).toBeVisible();
    await semViolacoes(page);

    await folha.locator("#lg-arq").setInputFiles({ name: "logo-ribeiro-matos.png", mimeType: "image/png", buffer: PNG_LARGO });
    const conf = folha.getByRole("list", { name: "Conferência do logo para impressão" });
    await expect(conf).toContainText("Tamanho: 1400 × 340 px depois do corte.");
    await expect(conf).toContainText("Contraste com o papel: a parte mais clara tem 14,2:1.");
    await expect(folha).toContainText("enviado agora, ainda não salvo");
    const envio = pedidos.find((p) => p.caminho === "/v1/escritorio/recebimento/logo")!;
    expect(envio.tipo).toBe("application/octet-stream");
    expect(new URLSearchParams(envio.busca).get("formato")).toBe("PNG");
    expect(new URLSearchParams(envio.busca).get("corte")).toBe("20,20,20,20");
    expect(envio.bytes).toBeGreaterThan(100);
    await expect(folha.getByRole("img", { name: /^Prévia do alto do recibo, em preto e branco, com o logo e a identificação do escritório: / })).toBeVisible();
    await expect(folha.getByRole("radio", { name: /Só o logo/ })).toHaveCount(0);

    // PA-07, decisão 3: a OAB da sociedade se muda em Dados do escritório; aqui, só para ler.
    await expect(folha.getByLabel("Seccional")).toHaveCount(0);
    await expect(folha.getByRole("link", { name: "Mudar em Dados do escritório" })).toHaveAttribute("href", "/meu-escritorio");
    await semViolacoes(page);
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Marca salva: o logo do escritório." })).toBeVisible();
    expect(pedidos.find((p) => p.metodo === "PUT")!.corpo).toMatchObject({ versao: 3, marca: "LOGO", logoId: LOGO, logoJeito: "SO_LOGO", logoCor: "ARQUIVO" });
    expect(pedidos.find((p) => p.metodo === "PUT")!.corpo).not.toHaveProperty("oabUf");
    await expect(page.getByRole("button", { name: "Remover o logo" })).toBeVisible();
  });

  test("logo pequeno é recusado na hora; logo claro não é salvo e sai em uma cor só", async ({ page }) => {
    const pedidos = await simular(page, {
      "/v1/escritorio": { corpo: ESCRITORIO },
      "GET /v1/escritorio/recebimento": { corpo: RECEB },
      "POST /v1/escritorio/recebimento/logo": { status: 201, corpo: logoGuardado(CLARO, false) },
      "PUT /v1/escritorio/recebimento": [{ corpo: { versao: 4, desatualizados: 0, naoSalvo: { marca: "LOGO_SEM_CONTRASTE", contraste: 1.2 } } }, { corpo: { versao: 5, desatualizados: 0, naoSalvo: null } }],
      [`GET /v1/escritorio/logos/${CLARO}`]: { corpo: null, png: PNG_CLARO },
    });
    await page.goto(`${P}/meu-escritorio/recebimento`);
    const folha = page.getByRole("region", { name: "Marca e timbrado" });
    await folha.getByRole("radio", { name: /O logo do escritório/ }).check();
    await folha.locator("#lg-arq").setInputFiles({ name: "logo-whatsapp.png", mimeType: "image/png", buffer: png(240, 80, [0, 0, 0], 0) });
    await expect(folha.getByText("Não deu para usar “logo-whatsapp.png”.")).toBeVisible();
    await expect(folha).toContainText("Ele tem 240 × 80 px e sairia borrado.");
    expect(pedidos.some((p) => p.caminho.endsWith("/logo"))).toBe(false);
    await folha.locator("#lg-arq").setInputFiles({ name: "logo.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.7") });
    await expect(folha).toContainText("O T3jus não lê PDF como logo.");
    await semViolacoes(page);

    await folha.locator("#lg-arq").setInputFiles({ name: "logo-dourado.png", mimeType: "image/png", buffer: PNG_CLARO });
    await expect(folha.getByRole("list", { name: "Conferência do logo para impressão" })).toContainText("Contraste com o papel: 1,2:1. O logo some no papel.");
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(folha.getByText("A marca não foi salva: o logo some no papel.")).toBeVisible();
    await expect(folha.getByRole("radio", { name: /Nas cores do arquivo/ })).toHaveAttribute("aria-invalid", "true");
    await semViolacoes(page);
    await folha.getByRole("radio", { name: /Em uma cor só, na cor da tinta/ }).check();
    await expect(folha.getByText("A marca não foi salva: o logo some no papel.")).toHaveCount(0);
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect.poll(() => pedidos.filter((p) => p.metodo === "PUT").length).toBe(2);
    expect(pedidos.filter((p) => p.metodo === "PUT")[1]!.corpo).toMatchObject({ versao: 4, marca: "LOGO", logoId: CLARO, logoCor: "UMA_COR" });
  });

  // F3.183: depois do await, o quadro chega antes do commit que marca a forma do logo.
  test("logo sem contraste com o quadro antes do commit: o foco vai à forma marcada", async ({ page }) => {
    await quadroAntesDoCommit(page);
    await simular(page, {
      "/v1/escritorio": { corpo: ESCRITORIO },
      "GET /v1/escritorio/recebimento": { corpo: RECEB },
      "POST /v1/escritorio/recebimento/logo": { status: 201, corpo: logoGuardado(CLARO, false) },
      "PUT /v1/escritorio/recebimento": { corpo: { versao: 4, desatualizados: 0, naoSalvo: { marca: "LOGO_SEM_CONTRASTE", contraste: 1.2 } } },
      [`GET /v1/escritorio/logos/${CLARO}`]: { corpo: null, png: PNG_CLARO },
    });
    await page.goto(`${P}/meu-escritorio/recebimento`);
    const folha = page.getByRole("region", { name: "Marca e timbrado" });
    await folha.getByRole("radio", { name: /O logo do escritório/ }).check();
    await folha.locator("#lg-arq").setInputFiles({ name: "logo-dourado.png", mimeType: "image/png", buffer: PNG_CLARO });
    await expect(folha.getByRole("list", { name: "Conferência do logo para impressão" })).toContainText("Contraste com o papel: 1,2:1.");
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(folha.getByText("A marca não foi salva: o logo some no papel.")).toBeVisible();
    await expect(folha.getByRole("radio", { name: /Nas cores do arquivo/ })).toBeFocused();
  });

  test("remover o logo pede confirmação; quem não é dono vê a marca e a OAB só para ler", async ({ page }) => {
    const salvo = { ...RECEB, versao: 4, marca: "LOGO", logo: logoGuardado(LOGO, true), logoJeito: "SO_LOGO", oabUf: "SP", oabNumero: "31874", oab: "OAB/SP 31.874", atualizadoEm: em(0, "10:31") };
    const pedidos = await simular(page, {
      "/v1/escritorio": { corpo: ESCRITORIO },
      "GET /v1/escritorio/recebimento": [{ corpo: salvo }, { corpo: { ...salvo, versao: 5, marca: "LETRA", logo: null } }],
      "PUT /v1/escritorio/recebimento": { corpo: { versao: 5, desatualizados: 0, naoSalvo: null } },
      [`GET /v1/escritorio/logos/${LOGO}`]: { corpo: null, png: PNG_LARGO },
    });
    await page.goto(`${P}/meu-escritorio/recebimento`);
    await page.getByRole("button", { name: "Remover o logo" }).click();
    const j = page.getByRole("alertdialog", { name: "Remover o logo?" });
    await expect(j.getByRole("button", { name: "Voltar" })).toBeFocused();
    await expect(j).toContainText("Carnês e recibos já emitidos não mudam");
    await semViolacoes(page);
    await j.getByRole("button", { name: "Remover o logo" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Logo removido." })).toBeVisible();
    expect(pedidos.find((p) => p.metodo === "PUT")!.corpo).toMatchObject({ marca: "LETRA", logoId: null });

    await page.unrouteAll({ behavior: "ignoreErrors" });
    await simular(page, {
      "/v1/escritorio": { corpo: { ...DIEGO_ESC, oabSociedade: "OAB/SP 31.874" } },
      "GET /v1/escritorio/recebimento": { corpo: { ...salvo, dono: false } },
      [`GET /v1/escritorio/logos/${LOGO}`]: { corpo: null, png: PNG_LARGO },
    });
    await page.goto(`${P}/meu-escritorio/recebimento`);
    await expect(page.getByText("Quem muda a chave Pix, as instruções e a marca é Marina Ribeiro")).toBeVisible();
    await expect(page.getByText(/O logo do escritório, desde/)).toBeVisible();
    await expect(page.getByRole("img", { name: "Prévia do alto do carnê com o logo e a identificação do escritório: CNPJ 41.276.839/0001-34 · OAB/SP 31.874" })).toBeVisible();
    await expect(page.getByRole("definition").filter({ hasText: "OAB/SP 31.874" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Salvar" })).toHaveCount(0);
    await semViolacoes(page);
  });

  test("o carnê e o recibo saem com o logo do dia; o canhoto fica com o nome", async ({ page }) => {
    const CARNE = "c4000000-0000-4000-8000-000000000041";
    const RECIBO = "a9000000-0000-4000-8000-000000000041";
    const marca = { tipo: "LOGO", logoId: LOGO, largura: 1400, altura: 340, jeito: "SO_LOGO", cor: "ARQUIVO", oab: "OAB/SP 31.874" };
    await simular(page, {
      "/v1/escritorio": { corpo: ESCRITORIO },
      [`GET /v1/escritorio/carnes/${CARNE}`]: { corpo: {
        id: CARNE, formato: "TRES", capa: true, geradoEm: em(0, "15:32"), marca,
        escritorio: { nome: "Ribeiro & Matos", cnpj: "41276839000134", endereco: "Rua Cardeal Arcoverde, 1749", cidade: "São Paulo", uf: "SP", whatsapp: null, oab: "OAB/SP 31.874" },
        cliente: { nome: "Hélio Batista Corrêa", documento: "***.982.247-**", tipo: "PF" }, contrato: { id: CT, numero: "C-2026-014", objeto: "Ação revisional" },
        pix: null, instrucoes: "Transferência para o Banco do Brasil.",
        parcelas: [4, 5].map((n) => ({ descricao: `Parcela ${n} de 6`, ordem: n, total: 6, vencimento: dia(6 + 30 * (n - 4)), valor: 85000, semValor: false, txid: `C2026014P0${n}`, pix: null })),
        mudancas: [],
      } },
      [`GET /v1/escritorio/recibos/${RECIBO}`]: { corpo: {
        numero: { ano: 2026, numero: 187 }, marca,
        escritorio: { nome: "Ribeiro & Matos", cnpj: "41276839000134", endereco: "Rua Cardeal Arcoverde, 1749", cidade: "São Paulo", uf: "SP", contatos: [], whatsapp: null, oab: "OAB/SP 31.874" },
        cliente: { id: "c22", nome: "Hélio Batista Corrêa", tipo: "PF", documento: "52998224725" }, pagador: null,
        contrato: { id: CT, numero: "C-2026-014", objeto: "Ação revisional" }, parcela: { id: rc(63), descricao: "Parcela 3 de 6", vencimento: dia(-24), ordem: 3, total: 6 },
        valor: 85000, multaJuros: 0, forma: "PIX", pagoEm: dia(0), registradoPor: { nome: "Marina Ribeiro", oab: "OAB/SP 214.538" }, registradoEm: em(0, "15:20"), pagamentoId: RECIBO,
      } },
      [`GET /v1/escritorio/logos/${LOGO}`]: { corpo: null, png: PNG_LARGO },
    });
    await page.goto(`${P}/carnes/${CARNE}?area=financeiro`);
    const via = page.getByRole("region", { name: "Via do cliente, parcela 4 de 6" });
    await expect(via.getByRole("img", { name: "Ribeiro & Matos" })).toBeVisible();
    await expect(via).toContainText("CNPJ 41.276.839/0001-34 · OAB/SP 31.874");
    await expect(page.locator(".ca-canhoto").first()).toContainText("Ribeiro & Matos");
    await expect(page.locator(".ca-canhoto img")).toHaveCount(0);
    await semViolacoes(page);

    await page.goto(`${P}/recibos/${RECIBO}`);
    const folha = page.getByRole("article", { name: "Recibo nº 2026-0187" });
    await expect(folha.getByRole("img", { name: "Ribeiro & Matos" })).toBeVisible();
    await expect(folha).toContainText("OAB/SP 31.874");
    await semViolacoes(page);
  });
});
