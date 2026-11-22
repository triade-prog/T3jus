import { describe, expect, it } from "vitest";
import { MAX_FOTOS_ASSINADO, nomeDoPdfDeFotos, pdfDeFotos } from "./pdf_fotos.ts";

const jpeg = (n = 40) => Uint8Array.from([0xff, 0xd8, ...Array(n).fill(7), 0xff, 0xd9]);
const texto = (b: Uint8Array) => new TextDecoder("latin1").decode(b);

describe("pdfDeFotos (F3.99)", () => {
  it("uma página por foto, na ordem, com a tabela de posições certa", () => {
    const pdf = pdfDeFotos([
      { jpeg: jpeg(), largura: 1500, altura: 2000 },
      { jpeg: jpeg(60), largura: 2000, altura: 1500 },
      { jpeg: jpeg(), largura: 800, altura: 800 },
    ]);
    const t = texto(pdf);
    expect(t.startsWith("%PDF-1.4\n")).toBe(true);
    expect(t.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(t).toContain("/Count 3");
    expect(t).toContain("/Kids [3 0 R 6 0 R 9 0 R]");
    // A segunda foto é deitada: a página também.
    expect(t).toContain("/MediaBox [0 0 841.89 595.28]");
    expect(t.match(/\/Subtype \/Image/g)).toHaveLength(3);
    // Cada entrada da xref aponta para o "N 0 obj" do objeto.
    const xref = Number(/startxref\n(\d+)/.exec(t)![1]);
    expect(t.slice(xref, xref + 4)).toBe("xref");
    const linhas = t.slice(xref).split("\n").slice(3, 3 + 10);
    linhas.forEach((l, i) => {
      const pos = Number(l.slice(0, 10));
      expect(t.slice(pos, pos + `${i + 1} 0 obj`.length)).toBe(`${i + 1} 0 obj`);
    });
  });

  it("recusa sem foto, mais de 10 e o que não é JPEG", () => {
    expect(() => pdfDeFotos([])).toThrow("FOTOS_QUANTIDADE");
    const f = { jpeg: jpeg(), largura: 10, altura: 10 };
    expect(() => pdfDeFotos(Array(MAX_FOTOS_ASSINADO + 1).fill(f))).toThrow("FOTOS_QUANTIDADE");
    expect(pdfDeFotos(Array(MAX_FOTOS_ASSINADO).fill(f)).length).toBeGreaterThan(0);
    expect(() => pdfDeFotos([{ ...f, jpeg: Uint8Array.from([0x89, 0x50, 0x4e, 0x47]) }])).toThrow("FOTO_NAO_JPEG");
  });

  it("nome do PDF", () => {
    expect(nomeDoPdfDeFotos("IMG_2031.jpg", 3)).toBe("IMG_2031-3-fotos.pdf");
    expect(nomeDoPdfDeFotos(".png", 2)).toBe("assinado-2-fotos.pdf");
  });
});
