// O PDF da fatura e do recibo da cobrança (F1.21): uma página A4 em cada estado do desenho
// aprovado, sem códigos depois de paga ou cancelada, e os marcadores "A DEFINIR" só sem emissor.
import { assertEquals, assertRejects } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { arquivoCarne, arquivoDoc, faixasEmTexto, identificadorParcela, numeroDoc, pdfDaFatura, pdfDoCarne, pdfDoReciboDaFatura } from "./cobranca_pdf.ts";
import { BASE, CARNE, CARNE_DESCONTO, CARNES, ESTADOS } from "./cobranca_pdf_exemplos.ts";

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

Deno.test("F1.21: o carnê sai com a capa e as 12 parcelas em 5 folhas A4, em cada estado do desenho", async () => {
  for (const [nome, d] of Object.entries(CARNES)) {
    const pdf = await PDFDocument.load(await pdfDoCarne(d));
    assertEquals(pdf.getPageCount(), 5, nome);
    assertEquals(pdf.getTitle(), "Carnê 2026/2027 do T3jus, Pequi Advocacia", nome);
  }
  // Capa e 4 parcelas: 5 faixas, em 2 folhas, sem folha em branco.
  assertEquals((await PDFDocument.load(await pdfDoCarne({ ...CARNE, parcelas: 4, itens: CARNE.itens.slice(0, 4) }))).getPageCount(), 2);
});

Deno.test("F1.21: o identificador da parcela e o nome do arquivo do carnê", () => {
  assertEquals(identificadorParcela("2026/2027", 3), "C20262027P03");
  assertEquals(arquivoCarne(CARNE), "carne-2026-2027.pdf");
});

Deno.test("F1.29 (CO-10): a capa do carnê diz as faixas; sem faixas, o valor único", () => {
  assertEquals(faixasEmTexto(CARNE_DESCONTO.faixas, 12, 39920), "3 × R$ 399,20 e 9 × R$ 499,00");
  assertEquals(faixasEmTexto(undefined, 12, 49000), "12 × R$ 490,00");
  assertEquals(
    faixasEmTexto([{ de: "a", ate: "a", quantidade: 1, valorCentavos: 39920 }, { de: "b", ate: "b", quantidade: 1, valorCentavos: 46820 }, { de: "c", ate: "c", quantidade: 10, valorCentavos: 56800 }], 12, 0),
    "1 × R$ 399,20, 1 × R$ 468,20 e 10 × R$ 568,00",
  );
});

Deno.test("CO-08: a 1ª fatura com a implantação e a isenção (1182) sai numa página, sem mudar o visual", async () => {
  const d = {
    ...BASE,
    itens: [
      ...(BASE.itens ?? []),
      { tipo: "IMPLANTACAO" as const, descricao: "Implantação assistida · treino de toda a equipe e acompanhamento por 30 dias", quantidade: 1, valorUnitarioCentavos: 149000, valorCentavos: 149000 },
      { tipo: "ISENCAO" as const, descricao: "Isenção da implantação · Oferta de lançamento", quantidade: 1, valorUnitarioCentavos: -149000, valorCentavos: -149000 },
    ],
    implantacao: { nome: "Implantação assistida", descricao: "treino de toda a equipe e acompanhamento por 30 dias", condicao: "ISENTA" as const, condicaoTexto: "Oferta de lançamento", valorCentavos: 149000 },
  };
  const pdf = await PDFDocument.load(await pdfDaFatura(d));
  assertEquals(pdf.getPageCount(), 1);
});
