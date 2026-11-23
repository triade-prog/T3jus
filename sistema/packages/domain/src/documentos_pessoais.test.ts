// F3.134 (AP-08): o prazo do comprovante. Quem muda e o corpo do PUT.
import { describe, expect, it } from "vitest";
import { OPCOES_PRAZO_COMPROVANTE, PRAZO_COMPROVANTE, prazoComprovanteSchema, quemMuda } from "./documentos_pessoais.ts";

describe("AP-08: quem muda o prazo do comprovante", () => {
  it("com uma sócia dona, o nome dela", () => {
    expect(quemMuda(["Marina Ribeiro"])).toBe("Quem muda é Marina Ribeiro, a sócia dona.");
  });
  it("com mais de um, todos, na ordem de entrada", () => {
    expect(quemMuda(["Marina Ribeiro", "Felipe Matos"])).toBe("Quem muda são os sócios donos: Marina Ribeiro e Felipe Matos.");
    expect(quemMuda(["A", "B", "C"], "as listas e o prazo")).toBe("Quem muda as listas e o prazo são os sócios donos: A, B e C.");
  });
  it("com o que muda e sem nome", () => {
    expect(quemMuda(["Marina Ribeiro"], "o prazo")).toBe("Quem muda o prazo é Marina Ribeiro, a sócia dona.");
    expect(quemMuda([])).toBe("Quem muda é a sócia dona.");
  });
});

describe("AP-08: o corpo do PUT do prazo", () => {
  it("aceita o número e a caixa; o limite fica com o banco", () => {
    expect(prazoComprovanteSchema.parse({ validadeDias: 60, trocarTexto: true })).toEqual({ validadeDias: 60, trocarTexto: true });
    expect(prazoComprovanteSchema.safeParse({ validadeDias: 400, trocarTexto: false }).success).toBe(true);
    expect(prazoComprovanteSchema.safeParse({ validadeDias: 60.5, trocarTexto: false }).success).toBe(false);
    expect(prazoComprovanteSchema.safeParse({ validadeDias: 60 }).success).toBe(false);
  });
  it("as opções rápidas ficam dentro do limite, com o padrão entre elas", () => {
    expect(OPCOES_PRAZO_COMPROVANTE.map((o) => o.dias)).toEqual([60, 90, 180]);
    expect(OPCOES_PRAZO_COMPROVANTE.some((o) => o.dias === PRAZO_COMPROVANTE.padrao)).toBe(true);
  });
});
