import { describe, expect, it } from "vitest";
import { TAMANHO_MAXIMO_DOCUMENTO } from "./console.ts";
import { iniciarDocumentoPessoalSchema, iniciarTermoCuratelaSchema, TIPO_TERMO_CURATELA, TIPOS_DOCUMENTO_PESSOAL } from "./documentos_pessoais.ts";
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
