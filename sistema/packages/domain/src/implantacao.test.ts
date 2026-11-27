import { describe, expect, it } from "vitest";
import { CONDICOES_IMPLANTACAO, implantacaoRegraSchema } from "./implantacao.ts";

const REGRA = {
  versao: 1, nome: "Implantação assistida", descricao: "treino de toda a equipe e acompanhamento por 30 dias",
  valorCentavos: 149000, condicaoPadrao: "ISENTA", isencaoAte: null, isencaoTexto: "Oferta de lançamento", prazoDias: 30,
};

describe("implantação assistida (CO-08)", () => {
  it("CO-08: a regra inteira passa, com ou sem data de corte", () => {
    expect(implantacaoRegraSchema.safeParse(REGRA).success).toBe(true);
    expect(implantacaoRegraSchema.safeParse({ ...REGRA, isencaoAte: "2027-05-31" }).success).toBe(true);
  });
  it("CO-08: o esquema só confere o formato; os limites ficam com o banco", () => {
    expect(implantacaoRegraSchema.safeParse({ ...REGRA, valorCentavos: -1, prazoDias: 0, condicaoPadrao: "X" }).success).toBe(true);
    expect(implantacaoRegraSchema.safeParse({ ...REGRA, valorCentavos: 1490.5 }).success).toBe(false);
    expect(implantacaoRegraSchema.safeParse({ ...REGRA, isencaoAte: "31/05/2027" }).success).toBe(false);
    const { versao: _v, ...semVersao } = REGRA;
    expect(implantacaoRegraSchema.safeParse(semVersao).success).toBe(false);
  });
  it("CO-08: as condições têm nome para a tela", () => {
    expect(CONDICOES_IMPLANTACAO).toEqual({ ISENTA: "Isenta", COBRADA: "Cobrada" });
  });
});
