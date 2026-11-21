import { describe, expect, it } from "vitest";
import { assinaturaSalvarSchema, mesPorExtenso, pagamentoManualSchema, REGUA_COBRANCA, textoAtraso } from "./cobranca.ts";

describe("cobrança dos escritórios (CO-06)", () => {
  it("a régua é a do desenho aprovado: −20, −3, 0, +3, +7, +15, +30", () => {
    expect(REGUA_COBRANCA.map((p) => p.dia)).toEqual([-20, -3, 0, 3, 7, 15, 30]);
  });
  it("mês por extenso e o texto do atraso", () => {
    expect(mesPorExtenso("2026-12-01")).toBe("dezembro de 2026");
    expect(mesPorExtenso("2026-03-01", true)).toBe("março");
    expect(textoAtraso(41)).toBe("Fatura em atraso · 41 dias");
    expect(textoAtraso(1)).toBe("Fatura em atraso · 1 dia");
  });
  it("os esquemas só conferem o formato; os campos ficam com o banco", () => {
    expect(assinaturaSalvarSchema.safeParse({ diaVencimento: 31, forma: "X", emailCobranca: "x" }).success).toBe(true);
    expect(assinaturaSalvarSchema.safeParse({ diaVencimento: "10", forma: "PIX", emailCobranca: "a@b.c" }).success).toBe(false);
    expect(pagamentoManualSchema.safeParse({ pagoEm: "2026-11-17", valorCentavos: 43100.5, forma: "PIX", motivo: "x" }).success).toBe(false);
  });
});
