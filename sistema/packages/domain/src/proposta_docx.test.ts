import { describe, expect, it } from "vitest";
import { linhasTimbrado, nomeArquivoProposta } from "./proposta_docx.ts";

describe("AP-05: o timbrado e o nome do arquivo da proposta", () => {
  it("o timbrado leva só o que existe", () => {
    expect(linhasTimbrado({ nome: "Ribeiro & Matos", cnpj: "12345678000195", endereco: "Rua Augusta, 100", cidade: "São Paulo", uf: "SP",
      contatos: [{ telefone: "+5511996027736", email: "contato@rm.adv.br" }] }))
      .toEqual(["Ribeiro & Matos", "CNPJ 12.345.678/0001-95 · Rua Augusta, 100 · São Paulo/SP", "(11) 99602-7736 · contato@rm.adv.br"]);
    expect(linhasTimbrado({ nome: "Ribeiro & Matos", cnpj: null, endereco: null, cidade: null, uf: null })).toEqual(["Ribeiro & Matos"]);
  });
  it("o nome do arquivo sem acento", () => {
    expect(nomeArquivoProposta({ numero: "P-2026-014", cliente: { id: "x", nome: "Gabriela Teixeira Conceição", tipo: "PF" } }))
      .toBe("proposta-p-2026-014-gabriela-teixeira-conceicao.docx");
  });
});
