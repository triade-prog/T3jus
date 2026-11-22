// Juntar as fotos de um papel assinado num PDF só (F3.99, CH-08; decisão 17 do desenho aprovado
// em docs/design/aprovadas/portal-procuracoes: "Várias páginas: um PDF só ou até 10 fotos").
// Cada foto vira uma página A4 em pé ou deitada, conforme a foto, com a imagem inteira e uma
// margem pequena. As fotos entram como JPEG do jeito que vieram (DCTDecode), sem biblioteca:
// quem chama já reduziu e converteu para JPEG (no navegador, pelo canvas).

export const MAX_FOTOS_ASSINADO = 10;

export interface FotoJpeg {
  /** Os bytes do JPEG (começam com FF D8). */
  jpeg: Uint8Array;
  largura: number;
  altura: number;
}

const A4 = { curto: 595.28, longo: 841.89 };
const MARGEM = 18;
const num = (n: number) => (Math.round(n * 100) / 100).toString();

/** Monta o PDF com uma foto por página, na ordem recebida. */
export function pdfDeFotos(fotos: FotoJpeg[]): Uint8Array {
  if (!fotos.length || fotos.length > MAX_FOTOS_ASSINADO) throw new Error("FOTOS_QUANTIDADE");
  for (const f of fotos) {
    if (f.jpeg.length < 4 || f.jpeg[0] !== 0xff || f.jpeg[1] !== 0xd8) throw new Error("FOTO_NAO_JPEG");
    if (!(f.largura > 0 && f.altura > 0)) throw new Error("FOTO_SEM_TAMANHO");
  }
  const enc = new TextEncoder();
  const partes: Uint8Array[] = [];
  const posicoes: number[] = [];
  let total = 0;
  const por = (p: Uint8Array | string) => {
    const b = typeof p === "string" ? enc.encode(p) : p;
    partes.push(b);
    total += b.length;
  };
  // Objetos: 1 catálogo, 2 páginas, e para cada foto i: página, imagem e conteúdo.
  const n = fotos.length;
  const obj = (id: number, corpo: () => void) => {
    posicoes[id] = total;
    por(`${id} 0 obj\n`);
    corpo();
    por("\nendobj\n");
  };
  por("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n");
  obj(1, () => por("<< /Type /Catalog /Pages 2 0 R >>"));
  const paginas = fotos.map((_, i) => `${3 + i * 3} 0 R`).join(" ");
  obj(2, () => por(`<< /Type /Pages /Kids [${paginas}] /Count ${n} >>`));
  fotos.forEach((f, i) => {
    const pag = 3 + i * 3;
    const img = pag + 1;
    const cont = pag + 2;
    const deitada = f.largura > f.altura;
    const pw = deitada ? A4.longo : A4.curto;
    const ph = deitada ? A4.curto : A4.longo;
    const escala = Math.min((pw - 2 * MARGEM) / f.largura, (ph - 2 * MARGEM) / f.altura);
    const w = f.largura * escala;
    const h = f.altura * escala;
    const x = (pw - w) / 2;
    const y = (ph - h) / 2;
    const desenho = `q ${num(w)} 0 0 ${num(h)} ${num(x)} ${num(y)} cm /F${i + 1} Do Q`;
    obj(pag, () => por(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(pw)} ${num(ph)}] /Resources << /XObject << /F${i + 1} ${img} 0 R >> >> /Contents ${cont} 0 R >>`));
    obj(img, () => {
      por(`<< /Type /XObject /Subtype /Image /Width ${f.largura} /Height ${f.altura} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${f.jpeg.length} >>\nstream\n`);
      por(f.jpeg);
      por("\nendstream");
    });
    obj(cont, () => por(`<< /Length ${desenho.length} >>\nstream\n${desenho}\nendstream`));
  });
  const ultimo = 2 + n * 3;
  const xref = total;
  por(`xref\n0 ${ultimo + 1}\n0000000000 65535 f \n`);
  for (let id = 1; id <= ultimo; id++) por(`${String(posicoes[id]).padStart(10, "0")} 00000 n \n`);
  por(`trailer\n<< /Size ${ultimo + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const saida = new Uint8Array(total);
  let p = 0;
  for (const b of partes) { saida.set(b, p); p += b.length; }
  return saida;
}

/** O nome do PDF: o da primeira foto, sem a extensão, com o número de fotos. */
export function nomeDoPdfDeFotos(primeira: string, n: number): string {
  const base = primeira.replace(/\.[^.]+$/, "").replace(/[/\\]/g, "-").slice(0, 150) || "assinado";
  return `${base}-${n}-fotos.pdf`;
}
