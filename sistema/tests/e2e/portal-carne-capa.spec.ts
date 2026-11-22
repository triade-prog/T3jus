// Carnê do Portal (FI-23): a capa com a lista "As parcelas deste carnê" não pode passar da faixa
// nem ficar por cima da via da parcela 1 (bug de 22/11/2026, carnê de 12 parcelas). A capa cresce
// uma faixa por vez até a folha inteira e, passando disso, a lista continua em folhas só dela,
// em 2 colunas.
// Confere de 1 a 120 parcelas (o máximo do contrato), com nome longo, valores altos e vencidas.
import { expect, test, type Page } from "@playwright/test";

const P = "http://localhost:3000";
const CARNE = "c4000000-0000-4000-8000-000000000077";
const ESCRITORIO = {
  id: "e0000000-0000-4000-8000-0000000000a1", nome: "Ribeiro & Matos", pessoa: "Marina Ribeiro", dono: true,
  areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"], socios: ["Marina Ribeiro"], pessoas: 5, outrosEscritorios: 0, funcoes: ["SOCIO"],
  cnpj: "11222333000181", cidade: "São Paulo", uf: "SP", endereco: "Rua Líbero Badaró, 377, cj. 1204", contatos: [], ultimaExportacao: null,
};

// Vencimentos em fevereiro e setembro (os meses de nome mais longo), valores de 5 dígitos e
// as primeiras parcelas vencidas (2, se não disser): o pior caso de largura e de altura das linhas.
function carne(n: number, comPix = true, vencidas = 2) {
  const parcelas = Array.from({ length: n }, (_, i) => {
    const mes = i % 12, ano = 2026 + Math.floor(i / 12);
    return {
      descricao: `Parcela ${i + 1} de ${n}`, ordem: i + 1, total: n, vencimento: `${ano}-${String(mes + 1).padStart(2, "0")}-22`,
      valor: 1234567, semValor: i < vencidas, txid: `C2026001P${String(i + 1).padStart(3, "0")}`,
      pix: comPix ? "00020126580014br.gov.bcb.pix0114112223330001815204000053039865802BR5923RIBEIRO E MATOS SOC ADV6009SAO PAULO6304ABCD" : null,
    };
  });
  return {
    id: CARNE, formato: "TRES", capa: true, geradoEm: "2026-11-21T15:32:00-03:00",
    escritorio: { nome: "Ribeiro & Matos", cnpj: "11222333000181", endereco: "Rua Líbero Badaró, 377, cj. 1204", cidade: "Presidente Jânio Quadros", uf: "BA", whatsapp: "+5511974052210" },
    cliente: { nome: "CAROLINA SOARES SANTANA DE ALBUQUERQUE MONTENEGRO", documento: "***.721.515-**", tipo: "PF" },
    contrato: { id: "f1000000-0000-4000-8000-000000000122", numero: "C-2026-001", objeto: "Processo trabalhista" },
    pix: comPix ? { tipo: "CNPJ", chave: "11222333000181", recebedor: "RIBEIRO E MATOS SOC ADV", cidade: "SAO PAULO" } : null,
    instrucoes: comPix ? "Transferência para o Banco do Brasil, agência 1234-5, conta 98765-0." : null,
    parcelas, mudancas: [],
  };
}

async function abrir(page: Page, corpo: unknown) {
  await page.route("**/api/v1/**", async (rota) => {
    const caminho = new URL(rota.request().url()).pathname.replace(/^\/api/, "");
    const r = caminho === "/v1/escritorio" ? ESCRITORIO : caminho === `/v1/escritorio/carnes/${CARNE}` ? corpo : null;
    await rota.fulfill({ status: r ? 200 : 404, contentType: "application/json", body: JSON.stringify(r ?? { erro: { codigo: "NOT_FOUND" } }) });
  });
  await page.goto(`${P}/carnes/${CARNE}?area=financeiro`);
  await expect(page.getByRole("region", { name: /^Folha 1 de/ })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

/** Tudo o que está dentro de cada faixa fica dentro dela (meio milímetro de tolerância). */
async function vazamentos(page: Page) {
  return page.evaluate(() => {
    const mm = 96 / 25.4;
    const fora: string[] = [];
    document.querySelectorAll<HTMLElement>(".ca-faixa").forEach((f, i) => {
      const r = f.getBoundingClientRect();
      f.querySelectorAll<HTMLElement>(":scope > :not(.ca-tesoura) *").forEach((el) => {
        const e = el.getBoundingClientRect();
        if (!e.width || !e.height) return;
        if (e.bottom > r.bottom + 0.5 * mm || e.right > r.right + 0.5 * mm) {
          fora.push(`faixa ${i + 1}: <${el.tagName.toLowerCase()} class="${el.className}"> "${(el.textContent ?? "").trim().slice(0, 30)}" passa ${(Math.max(e.bottom - r.bottom, e.right - r.right) / mm).toFixed(1)} mm`);
        }
      });
    });
    // Uma tabela não invade a coluna do lado.
    document.querySelectorAll<HTMLElement>(".ca-tab").forEach((t, i) => {
      if (t.getBoundingClientRect().right > t.parentElement!.getBoundingClientRect().right + 0.5 * mm) fora.push(`lista ${i + 1}: passa da coluna`);
    });
    document.querySelectorAll<HTMLElement>(".ca-folha").forEach((f, i) => {
      const r = f.getBoundingClientRect();
      const ult = [...f.querySelectorAll<HTMLElement>(".ca-faixa")].at(-1);
      if (ult && ult.getBoundingClientRect().bottom > r.bottom - 9.5 * mm) fora.push(`folha ${i + 1}: as faixas passam da margem`);
    });
    return fora;
  });
}

test.describe("Carnê do Portal: a capa não passa da faixa (FI-23)", () => {
  test.skip(({ isMobile }) => isMobile, "A medida é da folha A4; no celular a prévia só fica reduzida.");

  for (const n of [1, 3, 9, 10, 12, 24, 25, 39, 40, 60, 120]) {
    test(`FI-23: capa com ${n} parcela(s) cabe nas faixas e conta as folhas certas`, async ({ page }) => {
      await abrir(page, carne(n));
      expect(await vazamentos(page)).toEqual([]);
      // Cada parcela sai uma vez na lista e tem a sua faixa; o total aparece só no fim da lista.
      await expect(page.locator(".ca-capa tbody tr")).toHaveCount(n);
      await expect(page.locator(".ca-via")).toHaveCount(n);
      await expect(page.locator(".ca-capa tfoot")).toHaveCount(1);
      await expect(page.locator(".ca-capa tfoot")).toContainText(`R$ ${(12345.67 * n).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
      // O número de folhas na barra bate com as folhas desenhadas.
      const folhas = await page.locator(".ca-folha").count();
      await expect(page.locator(".ca-barra h1")).toContainText(`${folhas} ${folhas === 1 ? "folha" : "folhas"} A4`);
      await expect(page.getByRole("region", { name: `Folha ${folhas} de ${folhas}` })).toBeVisible();
    });
  }

  test("FI-23: 50 parcelas todas vencidas (linhas mais altas) também cabem, com a continuação", async ({ page }) => {
    await abrir(page, carne(50, true, 50));
    expect(await vazamentos(page)).toEqual([]);
    await expect(page.locator(".ca-capa tbody tr")).toHaveCount(50);
    await expect(page.locator(".ca-capa-cont")).toHaveCount(1);
    await expect(page.locator(".ca-capa").first()).toContainText("A lista continua na folha seguinte");
  });

  test("FI-23: sem Pix, a capa de 12 parcelas também cabe, e na impressão cada folha é uma página", async ({ page }) => {
    await abrir(page, carne(12, false));
    expect(await vazamentos(page)).toEqual([]);
    await page.emulateMedia({ media: "print" });
    expect(await vazamentos(page)).toEqual([]);
    const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
    const paginas = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
    expect(paginas).toBe(await page.locator(".ca-folha").count());
  });
});
