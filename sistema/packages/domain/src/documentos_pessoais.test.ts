import { describe, expect, it } from "vitest";
import { TAMANHO_MAXIMO_DOCUMENTO } from "./console.ts";
import {
  iniciarDocumentoPessoalSchema, iniciarTermoCuratelaSchema, OPCOES_PRAZO_COMPROVANTE, PRAZO_COMPROVANTE, prazoComprovanteSchema, quemMuda, TIPO_TERMO_CURATELA,
  TIPOS_DOCUMENTO_PESSOAL,
} from "./documentos_pessoais.ts";
import { TEXTOS_MOTIVO } from "./textos.ts";

const termo = { nome: "termo-curatela.pdf", arquivoTipo: "application/pdf", tamanho: 380_000 };

describe("F3.118 / CH-08: o envio do termo de curatela", () => {
  it("aceita PDF, JPEG e PNG", () => {
    for (const arquivoTipo of ["application/pdf", "image/jpeg", "image/png"]) {
      expect(iniciarTermoCuratelaSchema.safeParse({ ...termo, arquivoTipo }).success).toBe(true);
    }
  });

  it("aceita até 10 MB e recusa o arquivo vazio e o de 10 MB + 1 byte", () => {
    expect(iniciarTermoCuratelaSchema.safeParse({ ...termo, tamanho: TAMANHO_MAXIMO_DOCUMENTO }).success).toBe(true);
    expect(iniciarTermoCuratelaSchema.safeParse({ ...termo, tamanho: 0 }).success).toBe(false);
    expect(iniciarTermoCuratelaSchema.safeParse({ ...termo, tamanho: TAMANHO_MAXIMO_DOCUMENTO + 1 }).success).toBe(false);
  });

  it("recusa .doc e nome com barra", () => {
    expect(iniciarTermoCuratelaSchema.safeParse({ ...termo, arquivoTipo: "application/msword" }).success).toBe(false);
    expect(iniciarTermoCuratelaSchema.safeParse({ ...termo, nome: "pasta/termo.pdf" }).success).toBe(false);
    expect(iniciarTermoCuratelaSchema.safeParse({ ...termo, nome: "pasta\\termo.pdf" }).success).toBe(false);
  });

  it("PT-01: descarta o escritório, o cliente e o tipo vindos do navegador", () => {
    const r = iniciarTermoCuratelaSchema.parse({ ...termo, escritorioId: "x", clienteId: "y", tipo: "RG_CPF" });
    expect(r).toEqual(termo);
  });

  it("tem o texto do erro raro de quem saiu da curatela no meio do envio", () => {
    expect(TEXTOS_MOTIVO.CLIENTE_NAO_CURATELA).toMatch(/sob curatela/);
  });
});

describe("AP-08: o termo fica fora de Documentos pessoais", () => {
  it("TIPOS_DOCUMENTO_PESSOAL não tem o termo (o seletor de Documentos pessoais não o oferece)", () => {
    expect(Object.keys(TIPOS_DOCUMENTO_PESSOAL)).not.toContain(TIPO_TERMO_CURATELA);
  });

  it("o envio comum recusa o tipo do termo", () => {
    expect(iniciarDocumentoPessoalSchema.safeParse({ ...termo, tipo: TIPO_TERMO_CURATELA }).success).toBe(false);
    expect(iniciarDocumentoPessoalSchema.safeParse({ ...termo, tipo: "RG_CPF" }).success).toBe(true);
  });
});

// F3.134 (AP-08): o prazo do comprovante. Quem muda e o corpo do PUT.
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
