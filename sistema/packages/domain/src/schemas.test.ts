import { describe, expect, it } from "vitest";
import { criarSenhaSchema, entrarSchema, escolherEscritorioSchema, redefinirSenhaSchema } from "./schemas.ts";

describe("contratos de entrada", () => {
  it("normaliza o e-mail", () => {
    expect(entrarSchema.parse({ email: "  Ana@Exemplo.COM ", senha: "x" }).email).toBe("ana@exemplo.com");
  });

  it("senha nova com 12 caracteres ou mais", () => {
    expect(redefinirSenhaSchema.safeParse({ tokenHash: "a".repeat(20), novaSenha: "curta" }).success).toBe(false);
    expect(redefinirSenhaSchema.safeParse({ tokenHash: "a".repeat(20), novaSenha: "uma-senha-longa" }).success).toBe(true);
  });

  it("convite pede o nome e o aceite dos Termos", () => {
    const base = { novaSenha: "uma-senha-longa", nome: " Marina " };
    expect(criarSenhaSchema.safeParse({ ...base, aceiteTermos: true }).data?.nome).toBe("Marina");
    expect(criarSenhaSchema.safeParse({ ...base, aceiteTermos: false }).success).toBe(false);
    expect(criarSenhaSchema.safeParse({ ...base, nome: "   ", aceiteTermos: true }).success).toBe(false);
  });

  it("escritório escolhido é um identificador, nunca um nome", () => {
    expect(escolherEscritorioSchema.safeParse({ escritorioId: "Residencial Sol" }).success).toBe(false);
  });
});
