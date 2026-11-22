// Troca de tela sem recarregar a página (lentidão do Portal, 22/11/2026): o clique num link
// interno troca só a tela; o JavaScript, o escritório e o sino que já estão na aba ficam. Links
// com ?, para a mesma página ou para as telas de entrada continuam com recarga completa.
import { expect, test } from "@playwright/test";
import { simular } from "./console-dados.ts";

const P = "http://localhost:3000";
const ESCRITORIO = {
  id: "e0000000-0000-4000-8000-0000000000a1", nome: "Ribeiro & Matos", pessoa: "Marina Ribeiro", dono: true, areas: ["JURIDICO"],
  socios: ["Marina Ribeiro"], pessoas: 5, outrosEscritorios: 0, cnpj: null, cidade: "São Paulo", uf: "SP", endereco: null, contatos: [], ultimaExportacao: null,
};
const SINO = { novos: 0, total: 0, itens: [] };

test("trocar de tela não recarrega a página nem pede o escritório de novo", async ({ page }) => {
  const pedidos = await simular(page, { "/v1/escritorio": { corpo: ESCRITORIO }, "/v1/escritorio/avisos": { corpo: SINO } });
  await page.goto(`${P}/ajuda`);
  await expect(page.locator(".escritorio strong")).toHaveText("Ribeiro & Matos");
  await page.evaluate(() => ((window as unknown as { marca: number }).marca = 1));

  await page.getByRole("link", { name: "Agenda", exact: true }).filter({ visible: true }).first().click();
  await expect(page).toHaveURL(`${P}/agenda`);
  // A moldura da tela nova já abre com o escritório, sem esperar a resposta.
  await expect(page.locator(".escritorio strong")).toHaveText("Ribeiro & Matos");
  // A mesma aba: a marca continua e o escritório veio uma vez só.
  expect(await page.evaluate(() => (window as unknown as { marca?: number }).marca)).toBe(1);
  expect(pedidos.filter((p) => p.caminho === "/v1/escritorio").length).toBe(1);
  expect(pedidos.filter((p) => p.caminho === "/v1/escritorio/avisos").length).toBe(1);

  // Voltar também troca só a tela.
  await page.goBack();
  await expect(page).toHaveURL(`${P}/ajuda`);
  expect(await page.evaluate(() => (window as unknown as { marca?: number }).marca)).toBe(1);
});

test("link com ? recarrega a página, como antes", async ({ page }) => {
  await simular(page, { "/v1/escritorio": { corpo: ESCRITORIO }, "/v1/escritorio/avisos": { corpo: SINO } });
  await page.goto(`${P}/ajuda`);
  await expect(page.locator(".escritorio strong")).toHaveText("Ribeiro & Matos");
  await page.evaluate(() => {
    (window as unknown as { marca: number }).marca = 1;
    const a = document.createElement("a");
    a.href = "/agenda?ver=dia";
    a.textContent = "Agenda do dia";
    document.querySelector("main")!.append(a);
  });
  await page.getByRole("link", { name: "Agenda do dia" }).click();
  await expect(page).toHaveURL(`${P}/agenda?ver=dia`);
  await page.waitForLoadState("load");
  expect(await page.evaluate(() => (window as unknown as { marca?: number }).marca)).toBeUndefined();
});
