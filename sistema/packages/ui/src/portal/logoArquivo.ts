// O logo do escritório no navegador (F3.81, decisões 14 a 20 do desenho aprovado em
// docs/design/aprovadas/portal-nao-paga-logo): lê o PNG, o JPG ou o SVG escolhido, desenha num
// canvas (até 2400 px no lado maior), troca o fundo branco por transparente, confere com a mesma
// conta da API (packages/domain/src/logo.ts), corta a margem vazia e manda só o PNG à API, que
// confere de novo. O SVG nunca é guardado: vira pixels aqui, num <img>, onde script não roda.

import {
  analisarLogo, formatoDoLogo, LOGO_MAX_BYTES, LOGO_MAX_LADO, nomeDoFormato, svgInseguro,
  type AnaliseLogo, type FormatoLogo, type RecusaLogo,
} from "@t3jus/domain";

export type LogoPreparado =
  | { ok: true; formato: FormatoLogo; png: Blob; analise: AnaliseLogo; nome: string; bytes: number }
  | { ok: false; recusa: RecusaLogo; detalhes: { formato?: string; bytes?: number; largura?: number; altura?: number }; nome: string };

/** Lado maior do SVG desenhado: ele não tem tamanho próprio que valha, então sai no máximo. */
const LADO_SVG = 1600;

function carregar(url: string): Promise<HTMLImageElement> {
  return new Promise((ok, falha) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => ok(img);
    img.onerror = () => falha(new Error("imagem"));
    img.src = url;
  });
}

/** Pixel quase branco vira transparente: no papel branco é o mesmo, e "em uma cor só" não pinta o fundo. */
export function fundoTransparente(px: Uint8ClampedArray | Uint8Array): void {
  for (let i = 0; i < px.length; i += 4) {
    if (px[i]! > 245 && px[i + 1]! > 245 && px[i + 2]! > 245) px[i + 3] = 0;
  }
}

export async function prepararLogo(arquivo: File): Promise<LogoPreparado> {
  const nome = arquivo.name;
  const formato = formatoDoLogo(nome, arquivo.type);
  if (!formato) return { ok: false, recusa: "LOGO_FORMATO", detalhes: { formato: nomeDoFormato(nome) }, nome };
  if (arquivo.size > LOGO_MAX_BYTES) return { ok: false, recusa: "LOGO_GRANDE", detalhes: { bytes: arquivo.size }, nome };
  let fonte: Blob = arquivo;
  if (formato === "SVG") {
    const texto = await arquivo.text();
    if (svgInseguro(texto)) return { ok: false, recusa: "LOGO_SVG_INSEGURO", detalhes: {}, nome };
    fonte = new Blob([texto], { type: "image/svg+xml" });
  }
  const url = URL.createObjectURL(fonte);
  let img: HTMLImageElement;
  try {
    img = await carregar(url);
  } catch {
    URL.revokeObjectURL(url);
    return { ok: false, recusa: "LOGO_FORMATO", detalhes: { formato: formato === "JPG" ? "este JPG" : formato === "SVG" ? "este SVG" : "este PNG" }, nome };
  }
  let w = img.naturalWidth || LADO_SVG, h = img.naturalHeight || Math.round(LADO_SVG / 3);
  const escala = formato === "SVG" ? LADO_SVG / Math.max(w, h) : Math.min(1, LOGO_MAX_LADO / Math.max(w, h));
  w = Math.max(1, Math.round(w * escala));
  h = Math.max(1, Math.round(h * escala));
  const tela = document.createElement("canvas");
  tela.width = w;
  tela.height = h;
  const ctx = tela.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  URL.revokeObjectURL(url);
  const dados = ctx.getImageData(0, 0, w, h);
  fundoTransparente(dados.data);
  const analise = analisarLogo(dados.data, w, h);
  if (analise.recusa) {
    return { ok: false, recusa: analise.recusa, detalhes: { largura: analise.largura || w, altura: analise.altura || h }, nome };
  }
  // Só o desenho, sem a margem vazia.
  const corte = document.createElement("canvas");
  corte.width = analise.largura;
  corte.height = analise.altura;
  const c2 = corte.getContext("2d")!;
  ctx.putImageData(dados, 0, 0);
  c2.drawImage(tela, analise.corte.esquerda, analise.corte.topo, analise.largura, analise.altura, 0, 0, analise.largura, analise.altura);
  const png = await new Promise<Blob | null>((ok) => corte.toBlob(ok, "image/png"));
  if (!png) return { ok: false, recusa: "LOGO_FORMATO", detalhes: { formato }, nome };
  return { ok: true, formato, png, analise, nome, bytes: arquivo.size };
}

/** A consulta do envio: nome, formato, peso do arquivo escolhido e o corte feito aqui. */
export function consultaDoEnvio(p: Extract<LogoPreparado, { ok: true }>): string {
  const c = p.analise.corte;
  const q = new URLSearchParams({ nome: p.nome.slice(0, 200), formato: p.formato, bytes: String(p.bytes), corte: [c.esquerda, c.topo, c.direita, c.baixo].join(",") });
  return q.toString();
}
