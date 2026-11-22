// Juntar as fotos de um papel assinado num PDF só, no navegador (F3.99, decisão 17 do desenho
// aprovado em docs/design/aprovadas/portal-procuracoes). Cada foto é reduzida para no máximo
// 2000 px no lado maior e regravada em JPEG pelo canvas (o que também respeita a rotação do
// celular); o PDF sai do pdfDeFotos, uma foto por página, na ordem do nome do arquivo.
import { MAX_FOTOS_ASSINADO, nomeDoPdfDeFotos, pdfDeFotos, type FotoJpeg } from "@t3jus/domain";

const LADO_MAX = 2000;
const QUALIDADE = 0.85;
const LIMITE = 10 * 1024 * 1024;

/** As fotos na ordem do nome (no celular, o nome segue a hora da foto). */
export const ordenarFotos = (fotos: File[]) => [...fotos].sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { numeric: true }));

async function paraJpeg(arquivo: File): Promise<FotoJpeg> {
  const bmp = await createImageBitmap(arquivo);
  const escala = Math.min(1, LADO_MAX / Math.max(bmp.width, bmp.height));
  const largura = Math.max(1, Math.round(bmp.width * escala));
  const altura = Math.max(1, Math.round(bmp.height * escala));
  const tela = document.createElement("canvas");
  tela.width = largura;
  tela.height = altura;
  const ctx = tela.getContext("2d");
  if (!ctx) throw new Error("SEM_CANVAS");
  // Fundo branco: o PNG com transparência não vira preto no JPEG.
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, largura, altura);
  ctx.drawImage(bmp, 0, 0, largura, altura);
  bmp.close();
  const blob = await new Promise<Blob | null>((ok) => tela.toBlob(ok, "image/jpeg", QUALIDADE));
  if (!blob) throw new Error("SEM_JPEG");
  return { jpeg: new Uint8Array(await blob.arrayBuffer()), largura, altura };
}

/** Junta as fotos num PDF. Devolve o arquivo ou o texto do erro. */
export async function juntarFotos(fotos: File[]): Promise<File | string> {
  if (!fotos.length || fotos.length > MAX_FOTOS_ASSINADO) return "Escolha de 1 a 10 fotos.";
  const ordem = ordenarFotos(fotos);
  const paginas: FotoJpeg[] = [];
  for (const f of ordem) {
    try {
      paginas.push(await paraJpeg(f));
    } catch {
      return `Não deu para ler a foto ${f.name}. Tire a foto de novo ou escolha outra.`;
    }
  }
  const pdf = pdfDeFotos(paginas);
  if (pdf.length > LIMITE) return "As fotos juntas passaram de 10 MB. Escolha menos fotos ou junte as páginas num PDF só.";
  return new File([pdf as BlobPart], nomeDoPdfDeFotos(ordem[0]!.name, ordem.length), { type: "application/pdf" });
}
