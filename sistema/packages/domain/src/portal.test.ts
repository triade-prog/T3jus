import { describe, expect, it } from "vitest";
import { areasSchema, convidarEquipeSchema, retirarEquipeSchema } from "./portal.ts";

describe("Portal: áreas e equipe (PA-02)", () => {
  it("convite: e-mail normalizado, áreas sem repetição e lista vazia vale", () => {
    expect(convidarEquipeSchema.parse({ nome: " Ana ", email: "ANA@X.COM.BR", areas: ["JURIDICO", "JURIDICO"] }))
      .toEqual({ nome: "Ana", email: "ana@x.com.br", areas: ["JURIDICO"] });
    expect(areasSchema.parse({ areas: [] })).toEqual({ areas: [] });
    expect(areasSchema.safeParse({ areas: ["RH"] }).success).toBe(false);
  });

  it("retirar: passarPara é opcional no formato, o banco exige para quem já entrou", () => {
    expect(retirarEquipeSchema.parse({ versao: 1 })).toEqual({ versao: 1, passarPara: null });
    expect(retirarEquipeSchema.safeParse({ versao: 1, passarPara: "x" }).success).toBe(false);
  });
});
