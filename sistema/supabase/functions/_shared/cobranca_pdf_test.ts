// O PDF da fatura e do recibo da cobrança (F1.21): uma página A4 em cada estado do desenho
// aprovado, sem códigos depois de paga ou cancelada, e os marcadores "A DEFINIR" só sem emissor.
import { assertEquals, assertRejects } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { arquivoDoc, numeroDoc, pdfDaFatura, pdfDoReciboDaFatura } from "./cobranca_pdf.ts";
import { BASE, ESTADOS } from "./cobranca_pdf_exemplos.ts";

Deno.test("F1.21: a fatura sai numa página A4 em cada estado do desenho", async () => {
  for (const [nome, d] of Object.entries(ESTADOS)) {
    const pdf = await PDFDocument.load(await pdfDaFatura(d));
    assertEquals(pdf.getPageCount(), 1, nome);
    const { width, height } = pdf.getPage(0).getSize();
    assertEquals([Math.round(width), Math.round(height)], [595, 842], nome);
    assertEquals(pdf.getTitle(), "Fatura 2026/0187 do T3jus, Cedro & Lima Advocacia", nome);
  }
});

Deno.test("F1.21: o recibo sai só de fatura paga, numa página", async () => {
  const pdf = await PDFDocument.load(await pdfDoReciboDaFatura(ESTADOS.paga!));
  assertEquals(pdf.getPageCount(), 1);
  await assertRejects(() => pdfDoReciboDaFatura(BASE));
});

Deno.test("F1.21: o número e o nome do arquivo seguem o Console", () => {
  assertEquals(numeroDoc(BASE), "2026/0187");
  assertEquals(arquivoDoc(BASE, false), "fatura-2026-0187.pdf");
  assertEquals(arquivoDoc(BASE, true), "recibo-2026-0187.pdf");
});
