// Dias úteis do prazo do repasse (F3.46): o mesmo cálculo do banco (0552).
import { describe, expect, it } from "vitest";
import { diasUteisEntre, feriadoNacional, somarDiasUteis } from "./financeiro.ts";

describe("dias úteis com os feriados nacionais", () => {
  it("conhece os feriados fixos, o 20/11 e a Sexta-feira Santa", () => {
    expect(feriadoNacional("2026-11-20")).toBe(true);
    expect(feriadoNacional("2023-11-20")).toBe(false);
    expect(feriadoNacional("2026-04-03")).toBe(true);
    expect(feriadoNacional("2027-03-26")).toBe(true);
    expect(feriadoNacional("2026-02-17")).toBe(false);
  });
  it("pula o fim de semana e o feriado", () => {
    expect(somarDiasUteis("2026-11-17", 3)).toBe("2026-11-23");
    expect(somarDiasUteis("2026-11-19", 5)).toBe("2026-11-27");
    expect(somarDiasUteis("2026-11-12", 3)).toBe("2026-11-17");
  });
  it("conta os dias úteis de atraso", () => {
    expect(diasUteisEntre("2026-11-17", "2026-11-18")).toBe(1);
    expect(diasUteisEntre("2026-11-17", "2026-11-23")).toBe(3);
  });
});
