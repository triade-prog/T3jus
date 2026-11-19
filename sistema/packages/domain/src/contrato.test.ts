import { describe, expect, it } from "vitest";
import { dataDigitada, datasDoFim, encerrarContratoT3jusSchema, somarDias } from "./contrato.ts";

describe("fim do contrato (F0.14)", () => {
  it("as datas do exemplo aprovado: fim em 19/11/2026", () => {
    expect(datasDoFim("2026-11-19")).toEqual({
      fimEm: "2026-11-19",
      consultaAte: "2026-12-18",
      acessoFechaEm: "2026-12-19",
      entradasAte: "2027-03-19",
      registrosAte: "2027-06-18",
      guardaAte: "2031-11-19",
    });
  });
  it("lê a data digitada e recusa a que não existe", () => {
    expect(dataDigitada("19/11/2026")).toBe("2026-11-19");
    expect(dataDigitada("31/02/2026")).toBeNull();
    expect(dataDigitada("2026-11-19")).toBeNull();
  });
  it("soma dias atravessando o ano", () => {
    expect(somarDias("2026-12-31", 1)).toBe("2027-01-01");
  });
  it("o pedido de encerrar exige data, motivo e o nome", () => {
    expect(encerrarContratoT3jusSchema.safeParse({ versao: 1, fimEm: "2026-11-19", motivo: " ", nomeConfirmado: "x" }).success).toBe(false);
    expect(encerrarContratoT3jusSchema.safeParse({ versao: 1, fimEm: "2026-11-19", motivo: "Distrato", nomeConfirmado: "Cedro" }).success).toBe(true);
  });
});
