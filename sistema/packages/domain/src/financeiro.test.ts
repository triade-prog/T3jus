// Dias úteis do prazo do repasse (F3.46): o mesmo cálculo do banco (0552).
import { describe, expect, it } from "vitest";
import {
  CATEGORIAS_LANCAR, CATEGORIAS_SAIDA, custoEmprestimo, diasUteisEntre, estimadaSugerida, feriadoNacional, parcelasDoEmprestimo, somarDiasUteis,
  sugerirParcelasAntes, vencimentoDaParcela,
} from "./financeiro.ts";

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

describe("data estimada sugerida do RPV e do precatório (F3.48)", () => {
  it("RPV: 2 meses depois de expedido", () => {
    expect(estimadaSugerida("RPV", "2026-11-18")).toBe("2027-01-01");
    expect(estimadaSugerida("RPV", "2026-03-05")).toBe("2026-05-01");
  });
  it("precatório: até 2 de abril, fim do ano seguinte; depois, do outro", () => {
    expect(estimadaSugerida("PRECATORIO", "2026-04-02")).toBe("2027-12-01");
    expect(estimadaSugerida("PRECATORIO", "2026-04-03")).toBe("2028-12-01");
  });
});

// F3.51 (FI-20): as datas das parcelas são as mesmas do banco (emprestimo_vencimento, teste 126).
describe("FI-20: parcelas do empréstimo", () => {
  it("dia 31 em fevereiro, em ano comum e bissexto, e a volta ao 31", () => {
    expect(vencimentoDaParcela("2027-01-31", 0, 2)).toBe("2027-02-28");
    expect(vencimentoDaParcela("2028-01-31", 0, 2)).toBe("2028-02-29");
    expect(vencimentoDaParcela("2027-01-31", 0, 3)).toBe("2027-03-31");
    expect(vencimentoDaParcela("2026-12-30", 0, 3)).toBe("2027-02-28");
  });
  it("com as pagas antes, a numeração começa depois delas", () => {
    expect(vencimentoDaParcela("2026-09-10", 16, 40)).toBe("2028-08-10");
    const p = parcelasDoEmprestimo({ total: 40, antes: 16, valor: 209000, proximo: "2026-09-10" });
    expect([p.length, p[0], p.at(-1)?.n]).toEqual([24, { n: 17, vencimento: "2026-09-10", valor: 209000 }, 40]);
  });
  it("o valor de cada parcela pode ser trocado antes de gravar (S2)", () => {
    const p = parcelasDoEmprestimo({ total: 3, antes: 0, valor: 100000, proximo: "2026-11-20", valores: [{ n: 1, valor: 120000 }] });
    expect(p.map((x) => [x.vencimento, x.valor])).toEqual([["2026-11-20", 120000], ["2026-12-20", 100000], ["2027-01-20", 100000]]);
  });
  it("o custo num número só (C3)", () => {
    expect(custoEmprestimo({ valor: 3000000, devolucao: "PARCELAS", parcelas: Array(24).fill(145000) })).toBe(480000);
    expect(custoEmprestimo({ valor: 8000000, devolucao: "PARCELAS", parcelasAntes: 16, parcelaValor: 209000, parcelas: Array(24).fill(209000) })).toBe(360000);
    expect(custoEmprestimo({ valor: 30000, devolucao: "LIVRE", devolvido: 40000 })).toBe(10000);
    expect(custoEmprestimo({ valor: 800000, devolucao: "LIVRE", devolvido: 250000 })).toBe(0);
  });
  it("sugere quantas foram pagas antes quando a próxima ficou mais de 1 mês para trás (C6)", () => {
    expect(sugerirParcelasAntes({ total: 48, antes: 0, proximo: "2024-07-20", hoje: "2026-11-18" })).toEqual({
      ate: "2026-10-20",
      nenhuma: { antes: 28, n: 29, proximo: "2026-11-20" },
      umaVencida: { antes: 27, n: 28, proximo: "2026-10-20" },
    });
    expect(sugerirParcelasAntes({ total: 14, antes: 0, proximo: "2026-10-25", hoje: "2026-11-18" })).toBeNull();
    expect(sugerirParcelasAntes({ total: 3, antes: 0, proximo: "2024-01-10", hoje: "2026-11-18" })?.nenhuma).toBeNull();
  });
  it("Lançar conta não oferece a categoria Empréstimos", () => {
    expect(Object.keys(CATEGORIAS_LANCAR)).toEqual(Object.keys(CATEGORIAS_SAIDA).filter((k) => k !== "EMPRESTIMOS"));
    expect(Object.keys(CATEGORIAS_SAIDA).at(-1)).toBe("EMPRESTIMOS");
  });
});
