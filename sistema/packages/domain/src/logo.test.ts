import { describe, expect, it } from "vitest";
import {
  analisarLogo, contrasteComPapel, contrasteLegivel, formatoDoLogo, fraseOabSociedade, jeitoPadrao, lerPng, svgInseguro,
} from "./logo.ts";
import { linhasTimbrado } from "./proposta_docx.ts";

/** Uma imagem RGBA transparente com um retângulo pintado. */
function imagem(largura: number, altura: number, ret: { x: number; y: number; l: number; a: number; cor: [number, number, number] }[]) {
  const px = new Uint8Array(largura * altura * 4);
  for (const r of ret) {
    for (let y = r.y; y < r.y + r.a; y++) {
      for (let x = r.x; x < r.x + r.l; x++) {
        const i = (y * largura + x) * 4;
        px[i] = r.cor[0]; px[i + 1] = r.cor[1]; px[i + 2] = r.cor[2]; px[i + 3] = 255;
      }
    }
  }
  return px;
}

async function comprimir(b: Uint8Array): Promise<Uint8Array> {
  const fluxo = new Blob([b as BlobPart]).stream().pipeThrough(new CompressionStream("deflate"));
  return new Uint8Array(await new Response(fluxo).arrayBuffer());
}

/** Monta um PNG RGBA de 8 bits, sem filtro. */
async function png(largura: number, altura: number, rgba: Uint8Array): Promise<Uint8Array> {
  const crc = (b: Uint8Array) => {
    let c = ~0;
    for (const x of b) { c ^= x; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); }
    return ~c >>> 0;
  };
  const pedaco = (nome: string, dados: Uint8Array) => {
    const out = new Uint8Array(12 + dados.length);
    const dv = new DataView(out.buffer);
    dv.setUint32(0, dados.length);
    out.set([...nome].map((c) => c.charCodeAt(0)), 4);
    out.set(dados, 8);
    dv.setUint32(8 + dados.length, crc(out.subarray(4, 8 + dados.length)));
    return out;
  };
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, largura); dv.setUint32(4, altura); ihdr[8] = 8; ihdr[9] = 6;
  const cru = new Uint8Array((largura * 4 + 1) * altura);
  for (let y = 0; y < altura; y++) cru.set(rgba.subarray(y * largura * 4, (y + 1) * largura * 4), y * (largura * 4 + 1) + 1);
  const partes = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), pedaco("IHDR", ihdr), pedaco("IDAT", await comprimir(cru)), pedaco("IEND", new Uint8Array())];
  const total = new Uint8Array(partes.reduce((t, p) => t + p.length, 0));
  let o = 0;
  for (const p of partes) { total.set(p, o); o += p.length; }
  return total;
}

describe("logo do escritório (F3.81)", () => {
  it("decisão 15: corta a margem vazia e mede o contraste da borda com o papel", () => {
    const px = imagem(1000, 400, [{ x: 100, y: 50, l: 800, a: 200, cor: [0x1f, 0x2a, 0x44] }]);
    const a = analisarLogo(px, 1000, 400);
    expect([a.largura, a.altura]).toEqual([800, 200]);
    expect(a.corte).toEqual({ esquerda: 100, topo: 50, direita: 100, baixo: 150 });
    expect(a.contraste).toBeGreaterThan(10);
    expect(a.passa).toBe(true);
    expect(jeitoPadrao(a)).toBe("SO_LOGO");
  });

  it("pergunta 7: logo claro demais não passa", () => {
    const px = imagem(900, 400, [{ x: 0, y: 0, l: 900, a: 400, cor: [0xf0, 0xe0, 0xb0] }]);
    const a = analisarLogo(px, 900, 400);
    expect(a.contraste).toBeLessThan(3);
    expect(a.passa).toBe(false);
    expect(a.recusa).toBeNull();
  });

  it("decisão 20: pequeno, comprido e vazio são recusados", () => {
    expect(analisarLogo(imagem(240, 80, [{ x: 0, y: 0, l: 240, a: 80, cor: [0, 0, 0] }]), 240, 80).recusa).toBe("LOGO_PEQUENO");
    expect(analisarLogo(imagem(1800, 200, [{ x: 0, y: 0, l: 1800, a: 200, cor: [0, 0, 0] }]), 1800, 200).recusa).toBe("LOGO_COMPRIDO");
    expect(analisarLogo(new Uint8Array(100 * 100 * 4).fill(255), 100, 100).recusa).toBe("LOGO_VAZIO");
  });

  it("pergunta 8: quase quadrado entra com o nome ao lado", () => {
    expect(jeitoPadrao({ largura: 800, altura: 700 })).toBe("LOGO_E_NOME");
  });

  it("lê o PNG que a tela manda, para a API conferir de novo", async () => {
    const px = imagem(640, 200, [{ x: 20, y: 20, l: 600, a: 160, cor: [0x69, 0x27, 0x46] }]);
    const lido = await lerPng(await png(640, 200, px));
    expect([lido.largura, lido.altura]).toEqual([640, 200]);
    expect(Array.from(lido.rgba.subarray((30 * 640 + 30) * 4, (30 * 640 + 30) * 4 + 4))).toEqual([0x69, 0x27, 0x46, 255]);
    await expect(lerPng(new Uint8Array([1, 2, 3]))).rejects.toThrow();
  });

  it("pergunta 6: PNG, JPG e SVG; o resto não", () => {
    expect(formatoDoLogo("logo.PNG", "")).toBe("PNG");
    expect(formatoDoLogo("logo.jpeg", "image/jpeg")).toBe("JPG");
    expect(formatoDoLogo("logo.svg", "image/svg+xml")).toBe("SVG");
    expect(formatoDoLogo("logo.pdf", "application/pdf")).toBeNull();
    expect(formatoDoLogo("logo.webp", "image/webp")).toBeNull();
  });

  it("decisão 20: SVG com código ou coisa de fora é recusado", () => {
    expect(svgInseguro('<svg><path d="M0 0"/></svg>')).toBe(false);
    expect(svgInseguro("<svg><script>alert(1)</script></svg>")).toBe(true);
    expect(svgInseguro('<svg onload="x()"></svg>')).toBe(true);
    expect(svgInseguro('<svg><image href="https://x.com/a.png"/></svg>')).toBe(true);
    expect(svgInseguro("<svg><style>@import url(https://fonts.x/a.css);</style></svg>")).toBe(true);
  });

  it("contraste pela fórmula da WCAG", () => {
    expect(contrasteComPapel(0, 0, 0)).toBeCloseTo(21, 0);
    expect(contrasteLegivel(5.04)).toBe("5,0:1");
  });

  it("pergunta 5: o registro da sociedade na OAB vai depois do CNPJ no timbrado", () => {
    expect(fraseOabSociedade("sp", "31874")).toBe("OAB/SP 31.874");
    expect(fraseOabSociedade("SP", null)).toBeNull();
    expect(linhasTimbrado({ nome: "Ribeiro & Matos", cnpj: "41276839000134", oab: "OAB/SP 31.874", endereco: null, cidade: "São Paulo", uf: "SP" }))
      .toEqual(["Ribeiro & Matos", "CNPJ 41.276.839/0001-34 · OAB/SP 31.874 · São Paulo/SP"]);
  });
});
