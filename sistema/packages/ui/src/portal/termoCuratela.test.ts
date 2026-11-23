import { describe, expect, it } from "vitest";
import { TIPO_TERMO_CURATELA } from "@t3jus/domain";
import { rascunhoVazio, TIPOS_NO_SELETOR } from "./clientes.ts";
import { codigoDoErroDoTermo, descricaoArquivoTermo, erroDoCodigoDoTermo, fichaMudou, metaTermoNaFicha } from "./termoCuratela.ts";

describe("F3.118: a linha do arquivo do termo, sem as páginas", () => {
  it("no formulário: PDF ou foto e o tamanho", () => {
    expect(descricaoArquivoTermo("termo-curatela-sebastiao.pdf", "application/pdf", 380 * 1024)).toBe("PDF · 380 KB");
    expect(descricaoArquivoTermo("termo.jpg", "image/jpeg", 1.2 * 1024 * 1024)).toBe("Foto · 1,2 MB");
    // Sem o tipo do navegador, vale a extensão.
    expect(descricaoArquivoTermo("termo.png", "", 2048)).toBe("Foto · 2 KB");
  });

  it("na ficha: o nome, quem enviou e o dia em São Paulo (na virada do dia UTC)", () => {
    expect(metaTermoNaFicha({ nome: "termo-curatela-sebastiao.pdf", enviadoPor: { id: "p", nome: "Paula Nunes" }, enviadoEm: "2026-11-06T01:30:00Z" }))
      .toBe("termo-curatela-sebastiao.pdf · enviado por Paula Nunes em 05/11");
    expect(metaTermoNaFicha({ nome: "t.pdf", enviadoPor: null, enviadoEm: "2026-11-05T15:00:00Z" })).toBe("t.pdf · enviado em 05/11");
  });
});

describe("F3.118: o código do erro do envio vai e volta pelo endereço", () => {
  it("o motivo tem prioridade; o código da API vale sem motivo", () => {
    expect(codigoDoErroDoTermo({ codigo: "VALIDATION_ERROR", detalhes: { motivo: "ARQUIVO_NAO_CHEGOU" } })).toBe("ARQUIVO_NAO_CHEGOU");
    expect(codigoDoErroDoTermo({ codigo: "UPSTREAM_UNAVAILABLE" })).toBe("UPSTREAM_UNAVAILABLE");
    expect(erroDoCodigoDoTermo("UPSTREAM_UNAVAILABLE")).toEqual({ codigo: "UPSTREAM_UNAVAILABLE" });
    expect(erroDoCodigoDoTermo("CLIENTE_NAO_CURATELA")).toEqual({ codigo: "VALIDATION_ERROR", detalhes: { motivo: "CLIENTE_NAO_CURATELA" } });
  });

  it("o que não é código é ignorado", () => {
    expect(erroDoCodigoDoTermo("<script>")).toBeNull();
    expect(erroDoCodigoDoTermo(null)).toBeNull();
  });
});

describe("M7: salvar só com o termo novo não diz que a ficha mudou", () => {
  it("compara o rascunho antes e depois", () => {
    const antes = rascunhoVazio("PF");
    expect(fichaMudou(antes, { ...antes })).toBe(false);
    expect(fichaMudou(antes, { ...antes, curProcesso: "1004587-22.2025.8.26.0100" })).toBe(true);
    expect(fichaMudou(antes, { ...antes, rlMoraJunto: !antes.rlMoraJunto })).toBe(true);
  });
});

describe("M8: os seletores de Documentos pessoais não oferecem o termo", () => {
  it("TIPOS_NO_SELETOR não tem TERMO_CURATELA", () => {
    expect(TIPOS_NO_SELETOR).not.toContain(TIPO_TERMO_CURATELA);
    expect(TIPOS_NO_SELETOR).toContain("RG_CPF");
  });
});
