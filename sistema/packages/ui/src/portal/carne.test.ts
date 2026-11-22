// A capa do carnê (FI-23): quantas faixas ela ocupa e quantas folhas A4 o carnê tem. O teste de
// ponta a ponta (tests/e2e/portal-carne-capa.spec.ts) confere na folha que nada passa da faixa.
import { describe, expect, it } from "vitest";
import { blocosDaCapa, folhasDoCarne } from "./Carne.tsx";

const ps = (n: number, vencidas = 0) => Array.from({ length: n }, (_, i) => ({ semValor: i < vencidas }));

describe("blocosDaCapa", () => {
  it("até 8 parcelas a capa fica numa faixa, como no desenho aprovado", () => {
    expect(blocosDaCapa(ps(8))).toEqual([{ de: 0, ate: 8, faixas: 1, continuacao: false, colunas: [] }]);
  });
  it("12 parcelas (o carnê que saía sobreposto) ocupam 2 faixas", () => {
    expect(blocosDaCapa(ps(12))[0]).toMatchObject({ ate: 12, faixas: 2, continuacao: false });
  });
  it("a linha vencida é mais alta e conta mais", () => {
    expect(blocosDaCapa(ps(8, 2))[0]!.faixas).toBe(2);
  });
  it("lista longa: a capa enche a folha e o resto vai para a continuação, em 2 colunas, sem perder parcela", () => {
    const b = blocosDaCapa(ps(120));
    expect(b[0]).toMatchObject({ de: 0, faixas: 3, continuacao: false });
    expect(b.slice(1).every((x) => x.continuacao && x.faixas === 3 && x.colunas.length <= 2)).toBe(true);
    b.forEach((x, i) => { if (i) expect(x.de).toBe(b[i - 1]!.ate); });
    expect(b.at(-1)!.ate).toBe(120);
  });
});

describe("folhasDoCarne", () => {
  it("3 por folha: capa de 1 faixa mais as parcelas", () => {
    expect(folhasDoCarne(ps(3), "TRES", true)).toBe(2);
    expect(folhasDoCarne(ps(3), "TRES", false)).toBe(1);
  });
  it("12 parcelas com capa: 2 faixas de capa e 12 de parcelas, 5 folhas", () => {
    expect(folhasDoCarne(ps(12), "TRES", true)).toBe(5);
  });
  it("1 por folha não tem capa", () => {
    expect(folhasDoCarne(ps(12), "UM", true)).toBe(12);
  });
});
