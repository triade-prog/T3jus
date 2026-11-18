import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AREAS_PORTAL, areasSchema, convidarEquipeSchema, retirarEquipeSchema } from "./portal.ts";

describe("Portal: áreas e equipe (PA-02)", () => {
  it("as áreas do domínio são as mesmas do banco", () => {
    const sql = readFileSync(new URL("../../../supabase/migrations/0140_portal_equipe.sql", import.meta.url), "utf8");
    const doBanco = /area in \(([^)]+)\)/.exec(sql)?.[1].match(/'([A-Z]+)'/g)?.map((s) => s.slice(1, -1));
    expect(doBanco).toEqual(Object.keys(AREAS_PORTAL));
  });

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
