import { describe, expect, it } from "vitest";
import { assinaturaSalvarSchema, faixasDoCarne, mesPorExtenso, pagamentoManualSchema, REGUA_COBRANCA, textoAtraso, textoFaixas } from "./cobranca.ts";
import { TEXTOS_MOTIVO } from "./textos.ts";

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
  it("CO-10: as faixas do carnê e o texto delas", () => {
    const meses = Array.from({ length: 12 }, (_, i) => `2027-${String(i + 1).padStart(2, "0")}-01`);
    const parcelas = meses.map((competencia, i) => ({ competencia, valorCentavos: i < 3 ? 39920 : 49900 }));
    const faixas = faixasDoCarne(parcelas);
    expect(faixas).toEqual([
      { de: "2027-01-01", ate: "2027-03-01", quantidade: 3, valorCentavos: 39920 },
      { de: "2027-04-01", ate: "2027-12-01", quantidade: 9, valorCentavos: 49900 },
    ]);
    expect(textoFaixas(faixas)).toBe("3 parcelas de R$ 399,20 e 9 de R$ 499,00");
    expect(textoFaixas([{ quantidade: 12, valorCentavos: 49900 }])).toBe("12 parcelas de R$ 499,00");
    expect(textoFaixas([{ quantidade: 1, valorCentavos: 34930 }, { quantidade: 11, valorCentavos: 49900 }])).toBe("1 parcela de R$ 349,30 e 11 de R$ 499,00");
    expect(textoFaixas([])).toBe("");
  });
  it("CO-10: a confirmação da troca passa pelo esquema e os motivos têm texto", () => {
    const r = assinaturaSalvarSchema.safeParse({ diaVencimento: 10, forma: "CARNE", emailCobranca: "a@b.c", trocarCarne: true });
    expect(r.success && r.data.trocarCarne).toBe(true);
    for (const m of ["CARNE_TROCA_CONFIRMAR", "CARNE_DESCONTO_ATE_99", "DESCONTO_JA_PASSOU"]) expect(TEXTOS_MOTIVO[m]).toBeTruthy();
  });
  it("CO-09: os motivos do teste grátis têm texto", () => {
    for (const m of ["TESTE_ENCERRADO", "SEM_ASSINATURA", "SEM_TESTE_GRATIS", "TESTE_JA_DISPENSADO", "TESTE_NAO_REPETIDO", "TESTE_NAO_COMECOU", "PRORROGAR_DATA"])
      expect(TEXTOS_MOTIVO[m]).toBeTruthy();
    expect(TEXTOS_MOTIVO.SEM_ASSINATURA).not.toMatch(/outro escritório|repetid/i);
  });
  it("CO-09: os motivos da confirmação da assinatura têm texto", () => {
    for (const m of ["JA_ASSINADO", "ASSINATURA_NAO_PREPARADA", "TESTE_SEM_PRIMEIRO_ACESSO", "TESTE_REPETIDO", "SEM_TESTE_GRATIS"])
      expect(TEXTOS_MOTIVO[m]).toBeTruthy();
    expect(TEXTOS_MOTIVO.SEM_TESTE_GRATIS).toMatch(/regra antiga/);
    expect(TEXTOS_MOTIVO).not.toHaveProperty("CARNE_COM_DESCONTO");
  });
});
