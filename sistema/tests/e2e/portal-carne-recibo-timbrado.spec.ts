// Razão social e contatos do escritório no carnê e no recibo (F3.133; PA-07, FI-23, FI-14). Desenho
// aprovado em docs/design/aprovadas/carne-recibo-razao-social (Carol, 22/11/2026, com as 4
// recomendações). A API é simulada; aqui se testa a folha, a acessibilidade e que nada passa da
// faixa. O carnê e o recibo sem `comTimbrado` (emitidos antes da 0890) continuam como eram.
import { deflateSync } from "node:zlib";
import { expect, test, type Page } from "@playwright/test";
import { semViolacoes } from "./console-dados.ts";

const P = "http://localhost:3000";
const CARNE = "c4000000-0000-4000-8000-000000000133";
const RECIBO = "a9000000-0000-4000-8000-000000000133";
const LOGO = "10900000-0000-4000-8000-000000000133";
const ESCRITORIO = {
  id: "e0000000-0000-4000-8000-0000000000a1", nome: "Santana Advocacia", pessoa: "Carol Santana", dono: true,
  areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"], socios: ["Carol Santana"], pessoas: 5, outrosEscritorios: 0, funcoes: ["SOCIO"],
  cnpj: "47318552000106", cidade: "Salvador", uf: "BA", endereco: "Av. Tancredo Neves, 1.632, sala 1.208, Caminho das Árvores", contatos: [], ultimaExportacao: null,
};
const RAZAO_LONGA = "SANTANA, LIMA, OLIVEIRA, ALBUQUERQUE CAVALCANTI, VASCONCELOS FIGUEIREDO, MENEZES, ANDRADE, "
  + "QUEIROZ MONTEIRO E BITTENCOURT PRADO SOCIEDADE DE ADVOGADOS";

// O timbrado do dia, como a 0890 guarda (escritorio_timbrado_json).
const COMPLETA = {
  comTimbrado: true, nome: "Santana Advocacia", tipo: "SOCIEDADE", razaoSocial: "SANTANA, LIMA E OLIVEIRA SOCIEDADE DE ADVOGADOS",
  cnpj: "47318552000106", oab: "OAB/BA 4.217", cep: "41820020", logradouro: "Av. Tancredo Neves", numero: "1.632", complemento: "sala 1.208",
  bairro: "Caminho das Árvores", cidade: "Salvador", uf: "BA", endereco: "Av. Tancredo Neves, 1.632, sala 1.208, Caminho das Árvores",
  enderecoConfira: false, telefone: "7133524180", email: "contato@santana.adv.br", site: "santana.adv.br", contatos: [], whatsapp: "+5571991874402", dona: null,
};
const SEM_SOCIEDADE = {
  ...COMPLETA, nome: "Carol Santana Advocacia", tipo: "SEM_SOCIEDADE", razaoSocial: null, cnpj: null, oab: null, email: "carolina@santana.adv.br", site: null,
  dona: { nome: "Carolina Soares Santana", dados: { nomeCompleto: "Carolina Soares Santana" }, inscricoes: [{ texto: "OAB/BA 63.876-S", tipo: "PRINCIPAL" }] },
};
const VAZIA = { ...COMPLETA, razaoSocial: null, oab: null, telefone: null, email: null, site: null, contatos: [{ telefone: "+5571988771020", email: "carol@santana.adv.br" }] };
const RIBEIRO = {
  ...COMPLETA, nome: "Ribeiro & Matos", razaoSocial: "Ribeiro & Matos Sociedade de Advogados", cnpj: "41276839000134", oab: "OAB/SP 31.874",
  cep: "05407002", logradouro: "Rua Cardeal Arcoverde", numero: "1749", complemento: "sala 92", bairro: "Pinheiros", cidade: "São Paulo", uf: "SP",
  endereco: "Rua Cardeal Arcoverde, 1749, sala 92, Pinheiros", telefone: "1130517720", email: "financeiro@ribeiromatos.adv.br", site: "ribeiromatos.adv.br",
  whatsapp: "+5511974052210",
};
const LONGA = { ...COMPLETA, razaoSocial: RAZAO_LONGA };
const ANTIGO = { nome: "Santana Advocacia", cnpj: "47318552000106", endereco: "Av. Tancredo Neves, 1.632, sala 1.208, Caminho das Árvores", cidade: "Salvador", uf: "BA",
  whatsapp: "+5571991874402", oab: "OAB/BA 4.217", contatos: [{ telefone: "+557133524180", email: "contato@santana.adv.br" }] };
const MARCA_LOGO = { tipo: "LOGO", logoId: LOGO, largura: 1440, altura: 380, jeito: "SO_LOGO", cor: "ARQUIVO", oab: "OAB/BA 4.217" };

/** Um PNG largo, de uma cor, para o logo. */
function png(largura: number, altura: number): Buffer {
  const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b: Buffer) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 0xff]! ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const pedaco = (tipo: string, dados: Buffer) => {
    const t = Buffer.concat([Buffer.from(tipo, "ascii"), dados]);
    const n = Buffer.alloc(4); n.writeUInt32BE(dados.length);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(t));
    return Buffer.concat([n, t, c]);
  };
  const cru = Buffer.alloc((largura * 4 + 1) * altura);
  for (let y = 0; y < altura; y++) for (let x = 0; x < largura; x++) {
    const i = y * (largura * 4 + 1) + 1 + x * 4;
    cru[i] = 0x69; cru[i + 1] = 0x27; cru[i + 2] = 0x46; cru[i + 3] = 255;
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largura, 0); ihdr.writeUInt32BE(altura, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), pedaco("IHDR", ihdr), pedaco("IDAT", deflateSync(cru)), pedaco("IEND", Buffer.alloc(0))]);
}
const PNG_LARGO = png(720, 190);

function carne(escritorio: unknown, o: { formato?: "TRES" | "UM"; logo?: boolean } = {}) {
  const pix = { tipo: "CNPJ", chave: "47318552000106", recebedor: "SANTANA LIMA OLIVEIRA ADV", cidade: "SALVADOR" };
  return {
    id: CARNE, formato: o.formato ?? "TRES", capa: (o.formato ?? "TRES") === "TRES", geradoEm: "2026-11-22T15:32:00-03:00", marca: o.logo ? MARCA_LOGO : null,
    escritorio, cliente: { nome: "Hélio Batista Corrêa", documento: "***.982.247-**", tipo: "PF" },
    contrato: { id: "f1000000-0000-4000-8000-000000000014", numero: "C-2026-014", objeto: "Ação revisional" },
    pix, instrucoes: null,
    parcelas: [1, 2, 3].map((n) => ({
      descricao: `Parcela ${n} de 6`, ordem: n, total: 6, vencimento: `2026-${String(9 + n).padStart(2, "0")}-25`, valor: 85000, semValor: n === 1, txid: `C2026014P0${n}`,
      pix: "00020126580014br.gov.bcb.pix0114473185520001065204000053039865802BR5925SANTANA LIMA OLIVEIRA ADV6008SALVADOR62150511C2026014P016304ABCD",
    })),
    mudancas: [],
  };
}

function recibo(escritorio: unknown, logo = false) {
  return {
    numero: { ano: 2026, numero: 187 }, marca: logo ? MARCA_LOGO : null, escritorio,
    cliente: { id: "c22", nome: "Hélio Batista Corrêa", tipo: "PF", documento: "31848261713" }, pagador: null,
    contrato: { id: "f1000000-0000-4000-8000-000000000014", numero: "C-2026-014", objeto: "Ação revisional" },
    parcela: { id: "b1000000-0000-4000-8000-000000000163", descricao: "Parcela 3 de 6", vencimento: "2026-11-10", ordem: 3, total: 6 },
    valor: 85000, multaJuros: 2380, forma: "PIX", pagoEm: "2026-11-18", registradoPor: { nome: "Carol Santana", oab: "OAB/BA 63.876-S" },
    registradoEm: "2026-11-18T15:20:00-03:00", pagamentoId: RECIBO, reembolsos: [],
  };
}

async function abrir(page: Page, caminho: string, corpo: unknown) {
  await page.route("**/api/v1/**", async (rota) => {
    const c = new URL(rota.request().url()).pathname.replace(/^\/api/, "");
    if (c === `/v1/escritorio/logos/${LOGO}`) return rota.fulfill({ status: 200, contentType: "image/png", body: PNG_LARGO });
    const r = c === "/v1/escritorio" ? ESCRITORIO : c === `/v1/escritorio/carnes/${CARNE}` || c === `/v1/escritorio/recibos/${RECIBO}` ? corpo : null;
    await rota.fulfill({ status: r ? 200 : 404, contentType: "application/json", body: JSON.stringify(r ?? { erro: { codigo: "NOT_FOUND" } }) });
  });
  await page.goto(`${P}${caminho}`);
  await page.evaluate(() => document.fonts.ready);
}
const abrirCarne = async (page: Page, corpo: unknown) => {
  await abrir(page, `/carnes/${CARNE}?area=financeiro`, corpo);
  await expect(page.getByRole("region", { name: /^Folha 1 de/ })).toBeVisible();
};
const abrirRecibo = async (page: Page, corpo: unknown) => {
  await abrir(page, `/recibos/${RECIBO}`, corpo);
  await expect(page.getByRole("article", { name: "Recibo nº 2026-0187" })).toBeVisible();
};

/** Tudo o que está dentro de cada faixa fica dentro dela, com 1 mm de folga até o pé da via (decisão 14). */
async function vazamentos(page: Page) {
  return page.evaluate(() => {
    // No celular a folha aparece inteira e reduzida: o milímetro é medido na largura da folha (210 mm).
    const mm = document.querySelector<HTMLElement>(".ca-folha")!.getBoundingClientRect().width / 210;
    const fora: string[] = [];
    document.querySelectorAll<HTMLElement>(".ca-faixa, .ca-folha.ca-uma").forEach((f, i) => {
      const r = f.getBoundingClientRect();
      f.querySelectorAll<HTMLElement>(":scope > :not(.ca-tesoura) *").forEach((el) => {
        const e = el.getBoundingClientRect();
        if (!e.width || !e.height) return;
        if (e.bottom > r.bottom + 0.5 * mm || e.right > r.right + 0.5 * mm) fora.push(`faixa ${i + 1}: <${el.tagName.toLowerCase()} class="${el.className}"> passa`);
      });
    });
    // A marca e a linha da identificação não encostam no corpo da via.
    document.querySelectorAll<HTMLElement>(".ca-via").forEach((v, i) => {
      const cab = v.querySelector(".ca-cab")!.getBoundingClientRect();
      const corpo = v.querySelector(".ca-corpo")!.getBoundingClientRect();
      const pe = v.querySelector(".ca-pe")!.getBoundingClientRect();
      const ultimo = [...v.querySelectorAll<HTMLElement>(":scope > :not(.ca-pe)")].at(-1)!.getBoundingClientRect();
      if (cab.bottom > corpo.top + 0.5) fora.push(`via ${i + 1}: o alto passa por cima do corpo`);
      if (pe.top - ultimo.bottom < 1 * mm) fora.push(`via ${i + 1}: menos de 1 mm até o pé (${((pe.top - ultimo.bottom) / mm).toFixed(1)} mm)`);
    });
    return fora;
  });
}

test.describe("Timbrado no carnê (F3.133, FI-23)", () => {
  test("PA-07: a via leva razão social · CNPJ · OAB; o canhoto fica com o nome curto; a capa tem o timbrado sem o site", async ({ page }) => {
    await abrirCarne(page, carne(COMPLETA));
    const via = page.getByRole("region", { name: "Via do cliente, parcela 1 de 6" });
    await expect(via.locator(".ca-ident")).toHaveText("SANTANA, LIMA E OLIVEIRA SOCIEDADE DE ADVOGADOS · CNPJ 47.318.552/0001-06 · OAB/BA 4.217");
    await expect(via.locator(".ca-ident b")).toHaveText("SANTANA, LIMA E OLIVEIRA SOCIEDADE DE ADVOGADOS");
    await expect(via.locator(".ca-esc-sub")).toHaveCount(0);
    await expect(page.locator(".ca-canhoto").first()).toContainText("Santana Advocacia");
    await expect(page.locator(".ca-canhoto").first()).not.toContainText("SOCIEDADE DE ADVOGADOS");
    const campo = page.locator(".ca-capa .ca-tim-esc dd");
    await expect(campo).toContainText("SANTANA, LIMA E OLIVEIRA SOCIEDADE DE ADVOGADOS");
    await expect(campo).toContainText("CNPJ 47.318.552/0001-06 · OAB/BA 4.217");
    await expect(campo).toContainText("Salvador/BA, CEP 41820-020");
    await expect(campo).toContainText("(71) 3352-4180 · contato@santana.adv.br");
    // decisão 11: o site fica só no recibo.
    expect(await campo.textContent()).not.toMatch(/· santana\.adv\.br/);
    await expect(page.locator(".ca-capa .ca-ident")).toHaveCount(0);
    expect(await vazamentos(page)).toEqual([]);
    await semViolacoes(page);
  });

  test("sem sociedade: a sócia dona com a OAB dela, sem CPF; razão social vazia sai com o nome curto, sem \"[falta]\"", async ({ page }) => {
    await abrirCarne(page, carne(SEM_SOCIEDADE));
    const via = page.getByRole("region", { name: "Via do cliente, parcela 1 de 6" });
    await expect(via.locator(".ca-ident")).toHaveText("Carolina Soares Santana · OAB/BA 63.876-S · sem CNPJ");
    await expect(page.locator("body")).not.toContainText("529.982");
    await semViolacoes(page);

    await page.unrouteAll();
    await abrirCarne(page, carne(VAZIA));
    const via2 = page.getByRole("region", { name: "Via do cliente, parcela 1 de 6" });
    await expect(via2.locator(".ca-ident")).toHaveText("CNPJ 47.318.552/0001-06");
    await expect(via2.locator(".ca-ident b")).toHaveCount(0);
    await expect(page.locator(".ca-capa .ca-tim-esc dd")).toContainText("(71) 98877-1020 · carol@santana.adv.br");
    await expect(page.locator("body")).not.toContainText(/: falta\]|: confira\]/i);
    await semViolacoes(page);
  });

  test("decisões 4 e 13: \"ADVOCACIA\" embaixo do nome que não diz isso, e a razão longa com logo cabe na faixa, também na impressão", async ({ page }) => {
    await abrirCarne(page, carne({ ...RIBEIRO, razaoSocial: RAZAO_LONGA }));
    const via = page.getByRole("region", { name: "Via do cliente, parcela 1 de 6" });
    await expect(via.locator(".ca-esc-sub")).toHaveText("Advocacia");
    await expect(page.locator(".ca-via.ca-longo")).toHaveCount(3);
    expect(await vazamentos(page)).toEqual([]);
    await page.emulateMedia({ media: "print" });
    expect(await vazamentos(page)).toEqual([]);
    await semViolacoes(page);

    await page.unrouteAll();
    await page.emulateMedia({ media: "screen" });
    await abrirCarne(page, carne(LONGA, { logo: true }));
    await expect(page.getByRole("region", { name: "Via do cliente, parcela 1 de 6" }).getByRole("img", { name: "Santana Advocacia" })).toBeVisible();
    const alto = await page.locator(".ca-via .ca-logo").first().evaluate((e) => e.getBoundingClientRect().height / (document.querySelector(".ca-folha")!.getBoundingClientRect().width / 210));
    expect(alto).toBeLessThanOrEqual(9.1);
    expect(await vazamentos(page)).toEqual([]);
    await page.emulateMedia({ media: "print" });
    expect(await vazamentos(page)).toEqual([]);
    const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
    expect((pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length).toBe(await page.locator(".ca-folha").count());
    await semViolacoes(page);
  });

  test("1 por folha com logo: a caixa de 12 mm e a linha da identificação em letra maior", async ({ page }) => {
    await abrirCarne(page, carne(LONGA, { formato: "UM", logo: true }));
    const via = page.getByRole("region", { name: "Via do cliente, parcela 1 de 6" });
    await expect(via.locator(".ca-ident")).toContainText(RAZAO_LONGA);
    const alto = await page.locator(".ca-uma .ca-logo").first().evaluate((e) => e.getBoundingClientRect().height / (document.querySelector(".ca-folha")!.getBoundingClientRect().width / 210));
    expect(alto).toBeGreaterThan(11.5);
    expect(await vazamentos(page)).toEqual([]);
    await semViolacoes(page);
  });

  test("carnê antigo, sem o timbrado do dia: sai como saía", async ({ page }) => {
    await abrirCarne(page, carne(ANTIGO));
    await expect(page.locator(".ca-tim")).toHaveCount(0);
    await expect(page.locator(".ca-ident")).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Via do cliente, parcela 1 de 6" }).locator(".ca-doc")).toHaveText("CNPJ 47.318.552/0001-06 · OAB/BA 4.217");
    await semViolacoes(page);
  });
});

test.describe("Timbrado no recibo (F3.133, FI-14)", () => {
  test("PA-07: a razão social em destaque, as 4 linhas, o WhatsApp por último e a assinatura com CNPJ · OAB", async ({ page }) => {
    await abrirRecibo(page, recibo(COMPLETA));
    const ender = page.locator(".rb-ender-tim");
    await expect(ender.locator(".rb-r1")).toHaveText("SANTANA, LIMA E OLIVEIRA SOCIEDADE DE ADVOGADOS");
    await expect(ender.locator(":scope > span")).toHaveText([
      "SANTANA, LIMA E OLIVEIRA SOCIEDADE DE ADVOGADOS",
      "CNPJ 47.318.552/0001-06 · OAB/BA 4.217",
      "Av. Tancredo Neves, 1.632, sala 1.208, Caminho das Árvores, Salvador/BA, CEP 41820-020",
      "(71) 3352-4180 · contato@santana.adv.br · santana.adv.br",
      "WhatsApp (71) 99187-4402",
    ]);
    await expect(page.locator(".rb-esc-sub")).toHaveCount(0);
    const ass = page.locator(".rb-ass");
    await expect(ass.locator("b").first()).toHaveText("SANTANA, LIMA E OLIVEIRA SOCIEDADE DE ADVOGADOS");
    await expect(ass).toContainText("CNPJ 47.318.552/0001-06 · OAB/BA 4.217");
    await semViolacoes(page);
  });

  test("sem sociedade: assina a sócia dona com a OAB dela, sem CPF; \"Ribeiro & Matos\" ganha o \"Advocacia\"", async ({ page }) => {
    await abrirRecibo(page, recibo(SEM_SOCIEDADE));
    await expect(page.locator(".rb-r1")).toHaveText("Carolina Soares Santana");
    await expect(page.locator(".rb-ender-tim")).toContainText("OAB/BA 63.876-S · sem CNPJ");
    await expect(page.locator(".rb-ass b").first()).toHaveText("Carolina Soares Santana");
    await expect(page.locator(".rb-ass")).toContainText("OAB/BA 63.876-S");
    await expect(page.locator(".rb-ass")).not.toContainText("CPF");
    await semViolacoes(page);

    await page.unrouteAll();
    await abrirRecibo(page, recibo(RIBEIRO));
    await expect(page.locator(".rb-esc-sub")).toHaveText("Advocacia");
    await expect(page.locator(".rb-r1")).toHaveText("Ribeiro & Matos Sociedade de Advogados");
    await semViolacoes(page);
  });

  test("decisão 13: a razão social de 150 letras com logo continua em 1 página A4", async ({ page }) => {
    await abrirRecibo(page, recibo(LONGA, true));
    await expect(page.locator(".rb-folha.rb-longo")).toHaveCount(1);
    await expect(page.locator(".rb-r1")).toHaveText(RAZAO_LONGA);
    await page.emulateMedia({ media: "print" });
    const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
    expect((pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length).toBe(1);
    await semViolacoes(page);
  });

  test("recibo emitido antes, sem o timbrado do dia: sai como saía", async ({ page }) => {
    await abrirRecibo(page, recibo(ANTIGO));
    await expect(page.locator(".rb-ender-tim")).toHaveCount(0);
    await expect(page.locator(".rb-esc-sub")).toHaveText("Advocacia");
    await expect(page.locator(".rb-ender")).toContainText("CNPJ 47.318.552/0001-06 · OAB/BA 4.217");
    await expect(page.locator(".rb-ass b").first()).toHaveText("Santana Advocacia");
    await semViolacoes(page);
  });
});
