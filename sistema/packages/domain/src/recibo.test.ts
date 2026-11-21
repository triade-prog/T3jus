import { describe, expect, it } from "vitest";
import type { ReciboParaImprimir } from "./financeiro.ts";
import { documentoFormatado, localEData, numeroDoRecibo, textoDoRecibo, tituloDoRecibo, totalDoRecibo } from "./recibo.ts";

const R: ReciboParaImprimir = {
  numero: { ano: 2026, numero: 187 },
  escritorio: { nome: "Ribeiro & Matos", cnpj: "11222333000181", endereco: "Rua Augusta, 1200", cidade: "São Paulo", uf: "SP", contatos: [], whatsapp: null },
  cliente: { id: "c", nome: "Hélio Batista Corrêa", tipo: "PF", documento: "31848261713" },
  pagador: null,
  contrato: { id: "k", numero: "C-2026-014", objeto: "Ação revisional" },
  parcela: { id: "p", descricao: "Parcela 3 de 6", vencimento: "2026-10-25", ordem: 3, total: 6 },
  valor: 85000, multaJuros: null, forma: "PIX", pagoEm: "2026-11-18",
  registradoPor: { nome: "Marina Ribeiro", oab: "OAB/SP nº 214.538" }, registradoEm: "2026-11-18T18:20:00Z", pagamentoId: "x",
};
const corrido = (r: ReciboParaImprimir) => textoDoRecibo(r).map((p) => p.texto).join("");

describe("recibo em PDF (FI-14)", () => {
  it("número, título do arquivo e local com a data", () => {
    expect(numeroDoRecibo(R)).toBe("2026-0187");
    expect(tituloDoRecibo(R)).toBe("Recibo 2026-0187 · Hélio Batista Corrêa · Ribeiro & Matos");
    expect(localEData(R)).toBe("São Paulo, 18 de novembro de 2026.");
  });
  it("CPF e CNPJ completos e formatados", () => {
    expect(documentoFormatado("31848261713")).toBe("318.482.617-13");
    expect(documentoFormatado("11222333000181")).toBe("11.222.333/0001-81");
    expect(documentoFormatado(null)).toBeNull();
  });
  it("o texto corrido diz quem, quanto por extenso, a parcela, o mês, a forma e a data", () => {
    expect(corrido(R)).toBe("Recebemos de Hélio Batista Corrêa, CPF 318.482.617-13, a quantia de R$ 850,00 (oitocentos e cinquenta reais), "
      + "referente à parcela 3 de 6 dos honorários advocatícios do contrato C-2026-014 (ação revisional), mês de referência outubro de 2026, "
      + "paga por Pix em 18/11/2026. Por ser verdade, damos quitação do valor acima.");
  });
  it("com multa e juros, o total soma e o texto avisa", () => {
    const m = { ...R, multaJuros: 2380 };
    expect(totalDoRecibo(m)).toBe(87380);
    expect(corrido(m)).toContain("R$ 873,80 (oitocentos e setenta e três reais e oitenta centavos)");
    expect(corrido(m)).toContain("já com multa e juros pelo atraso");
  });
  it("pago por outra pessoa: de quem veio e em favor do cliente", () => {
    const t = { ...R, pagador: { tipo: "CONTATO" as const, nome: "Marta Corrêa", documento: "20577138499", papel: "Esposa" } };
    expect(corrido(t)).toMatch(/^Recebemos de Marta Corrêa, CPF 205\.771\.384-99, em favor de Hélio Batista Corrêa, CPF 318\.482\.617-13, a quantia/);
  });
});
