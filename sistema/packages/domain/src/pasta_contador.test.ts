import { describe, expect, it } from "vitest";
import { dividirPasta, nomeDaPasta, nomeDoReciboNaPasta, nomesNaPasta, type AnexoDaPasta } from "./pasta_contador.ts";
import { abrirEntrada, escreverZip, lerZip } from "./zip.ts";

const a = (x: Partial<AnexoDaPasta>): AnexoDaPasta => ({
  id: "1", nome: "nota.pdf", tipo: "application/pdf", tamanho: 100, categoria: "NOTA_FISCAL", dia: "2026-10-05", lancamento: "Aluguel da sala", ...x,
});

describe("pasta do contador (F3.89, FI-21)", () => {
  it("cada arquivo leva a data e o lançamento no nome", () => {
    expect(nomesNaPasta([a({}), a({ tipo: "image/jpeg", categoria: "COMPROVANTE", lancamento: "Recebimento de Irene / parcela 2" })])).toEqual([
      "2026-10-05 - Aluguel da sala - Nota fiscal.pdf",
      "2026-10-05 - Recebimento de Irene parcela 2 - Comprovante.jpg",
    ]);
  });

  it("nomes repetidos ganham um número", () => {
    expect(nomesNaPasta([a({}), a({}), a({})])).toEqual([
      "2026-10-05 - Aluguel da sala - Nota fiscal.pdf",
      "2026-10-05 - Aluguel da sala - Nota fiscal (2).pdf",
      "2026-10-05 - Aluguel da sala - Nota fiscal (3).pdf",
    ]);
  });

  it("divide em partes sem partir um arquivo", () => {
    const p = dividirPasta([{ tamanho: 600 }, { tamanho: 300 }, { tamanho: 500 }, { tamanho: 2000 }], 1500);
    expect(p.map((x) => x.map((y) => y.tamanho))).toEqual([[600, 300], [500], [2000]]);
  });

  it("o nome da pasta diz o mês e a parte", () => {
    expect(nomeDaPasta("2026-03-01", 1, 1)).toBe("comprovantes-marco-2026.zip");
    expect(nomeDaPasta("2026-10-01", 2, 3)).toBe("comprovantes-outubro-2026-parte-2-de-3.zip");
  });

  it("o .zip sem comprimir abre com os mesmos bytes", async () => {
    const dados = new TextEncoder().encode("%PDF-1.4 conteúdo");
    const z = await escreverZip([{ nome: "2026-10-05 - Aluguel - Nota fiscal.pdf", dados }], { guardar: true });
    const e = lerZip(z).get("2026-10-05 - Aluguel - Nota fiscal.pdf")!;
    expect(e.metodo).toBe(0);
    expect(await abrirEntrada(z, e)).toEqual(dados);
  });
  it("F3.93: o recibo vai na pasta Recibos, com o dia, o número e o cliente", () => {
    expect(nomeDoReciboNaPasta({ pagoEm: "2026-11-28", numero: { ano: 2026, numero: 190 }, cliente: { nome: "Construtora Vale/Alto: Ltda." } }))
      .toBe("Recibos/2026-11-28 - Recibo 2026-0190 - Construtora Vale Alto Ltda..pdf");
  });
});
