// O logo do escritório no carnê e no recibo (F3.81, FI-23; resto do F3.19, FI-14), desenho
// aprovado em docs/design/aprovadas/portal-nao-paga-logo (decisões 14 a 20). A mesma conta roda
// no navegador (para mostrar a conferência na hora) e na API (que confere de novo o PNG que
// chegou, antes de guardar): corta a margem vazia, mede o tamanho e a proporção e acha o
// contraste com o papel da parte mais clara da borda do desenho, a que encosta no papel.

import { crc32 } from "./zip.ts";

/** Lado maior mínimo, em pixels, depois do corte: menos que isso sai borrado no recibo. */
export const LOGO_MIN_LADO = 600;
/** O logo guardado tem até 2400 px no lado maior. */
export const LOGO_MAX_LADO = 2400;
/** Até 8 vezes mais largo que alto (ou alto que largo). */
export const LOGO_MAX_PROPORCAO = 8;
/** O mínimo da WCAG para gráficos, contra o papel branco. */
export const LOGO_MIN_CONTRASTE = 3;
/** O arquivo enviado tem até 1 MB (pergunta 6). */
export const LOGO_MAX_BYTES = 1024 * 1024;
/** O PNG que a tela manda à API, já cortado: até 5 MB. */
export const LOGO_MAX_PNG_BYTES = 5 * 1024 * 1024;
/** Logo com menos de 2:1 é "quase quadrado" e pergunta como entra (pergunta 8). */
export const LOGO_QUASE_QUADRADO = 2;

export const FORMATOS_LOGO = { PNG: "PNG", JPG: "JPG", SVG: "SVG" } as const;
export type FormatoLogo = keyof typeof FORMATOS_LOGO;
export type MarcaDocumento = "LETRA" | "LOGO";
export type JeitoLogo = "SO_LOGO" | "LOGO_E_NOME";
export type CorLogo = "ARQUIVO" | "UMA_COR";

export type RecusaLogo = "LOGO_FORMATO" | "LOGO_GRANDE" | "LOGO_PEQUENO" | "LOGO_SVG_INSEGURO" | "LOGO_COMPRIDO" | "LOGO_VAZIO";

/** O formato pelo nome e pelo tipo do arquivo; null para o que não se aceita (PDF, Word, HEIC, WebP...). */
export function formatoDoLogo(nome: string, tipo: string): FormatoLogo | null {
  const ext = nome.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";
  if (tipo === "image/png" || ext === "png") return "PNG";
  if (tipo === "image/jpeg" || ext === "jpg" || ext === "jpeg") return "JPG";
  if (tipo === "image/svg+xml" || ext === "svg") return "SVG";
  return null;
}

/** O formato recusado, para a frase ("PDF", "HEIC"...). */
export function nomeDoFormato(nome: string): string {
  return (nome.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "desconhecido").toUpperCase();
}

/** SVG com código, evento, objeto de fora ou fonte e imagem de outro endereço é recusado. */
export function svgInseguro(texto: string): boolean {
  return /<script\b|<foreignObject\b|<iframe\b|<embed\b|<object\b|\son[a-z]+\s*=|javascript:|@import|@font-face|(?:href|src)\s*=\s*["']?\s*(?:https?:|\/\/|data:text)|url\(\s*["']?\s*(?:https?:|\/\/)/i.test(texto);
}

// ---------------------------------------------------------------------------------------
// Contraste (fórmula da WCAG).

function canal(c: number): number {
  const x = c / 255;
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
}

export function luminancia(r: number, g: number, b: number): number {
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

/** O contraste de uma cor com o papel branco. */
export function contrasteComPapel(r: number, g: number, b: number): number {
  return 1.05 / (luminancia(r, g, b) + 0.05);
}

// ---------------------------------------------------------------------------------------
// A conferência.

export interface CorteLogo { esquerda: number; topo: number; direita: number; baixo: number }

export interface AnaliseLogo {
  /** Tamanho do desenho recebido e depois do corte da margem vazia. */
  original: { largura: number; altura: number };
  largura: number;
  altura: number;
  corte: CorteLogo;
  proporcao: number;
  /** O contraste da cor mais clara da borda do desenho com o papel. */
  contraste: number;
  /** As cores da borda (as que encostam no papel), com a parte de cada uma. */
  cores: { cor: string; parte: number; contraste: number }[];
  passa: boolean;
  /** Por que o logo não pode ser usado de jeito nenhum (pequeno, comprido, vazio). */
  recusa: RecusaLogo | null;
}

/** Pixel que é papel: transparente ou quase branco. */
function vazio(px: ArrayLike<number>, i: number): boolean {
  return px[i + 3]! <= 16 || (px[i]! > 245 && px[i + 1]! > 245 && px[i + 2]! > 245);
}

/** Onde está o desenho, sem a margem vazia; null se não há desenho. */
export function caixaDoDesenho(px: ArrayLike<number>, largura: number, altura: number): { x: number; y: number; largura: number; altura: number } | null {
  let x0 = largura, y0 = altura, x1 = -1, y1 = -1;
  for (let y = 0; y < altura; y++) {
    const linha = y * largura * 4;
    for (let x = 0; x < largura; x++) {
      if (!vazio(px, linha + x * 4)) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, largura: x1 - x0 + 1, altura: y1 - y0 + 1 };
}

const hex = (n: number) => n.toString(16).padStart(2, "0").toUpperCase();

/**
 * Confere o logo a partir dos pixels RGBA (largura × altura). As cores da borda são as dos
 * pixels pintados com um vizinho vazio; contam as que têm 5% ou mais da borda, menos o branco de
 * dentro do logo (letras vazadas), que não é tinta no papel.
 */
export function analisarLogo(px: ArrayLike<number>, largura: number, altura: number): AnaliseLogo {
  const caixa = caixaDoDesenho(px, largura, altura);
  const original = { largura, altura };
  if (!caixa) {
    return { original, largura: 0, altura: 0, corte: { esquerda: 0, topo: 0, direita: 0, baixo: 0 }, proporcao: 0, contraste: 1, cores: [], passa: false, recusa: "LOGO_VAZIO" };
  }
  const corte = { esquerda: caixa.x, topo: caixa.y, direita: largura - caixa.x - caixa.largura, baixo: altura - caixa.y - caixa.altura };
  const contagem = new Map<string, { r: number; g: number; b: number; n: number }>();
  let total = 0;
  const xFim = caixa.x + caixa.largura, yFim = caixa.y + caixa.altura;
  for (let y = caixa.y; y < yFim; y++) {
    for (let x = caixa.x; x < xFim; x++) {
      const i = (y * largura + x) * 4;
      if (px[i + 3]! < 250 || vazio(px, i)) continue;
      const borda = x === 0 || y === 0 || x === largura - 1 || y === altura - 1
        || vazio(px, i - 4) || vazio(px, i + 4) || vazio(px, i - largura * 4) || vazio(px, i + largura * 4);
      if (!borda) continue;
      const r = Math.floor(px[i]! / 24) * 24 + 12, g = Math.floor(px[i + 1]! / 24) * 24 + 12, b = Math.floor(px[i + 2]! / 24) * 24 + 12;
      const k = `${r},${g},${b}`;
      const c = contagem.get(k);
      if (c) c.n++;
      else contagem.set(k, { r, g, b, n: 1 });
      total++;
    }
  }
  let cores = [...contagem.values()]
    .map((c) => ({ ...c, parte: c.n / (total || 1) }))
    .filter((c) => c.parte >= 0.05 && luminancia(c.r, c.g, c.b) < 0.85);
  // Desenho fino demais para ter cor com 5% da borda: vale a cor mais comum.
  if (!cores.length && contagem.size) {
    const maior = [...contagem.values()].sort((a, b) => b.n - a.n)[0]!;
    cores = [{ ...maior, parte: maior.n / (total || 1) }];
  }
  const lista = cores
    .map((c) => ({ cor: `#${hex(c.r)}${hex(c.g)}${hex(c.b)}`, parte: c.parte, contraste: contrasteComPapel(c.r, c.g, c.b) }))
    .sort((a, b) => b.parte - a.parte);
  const contraste = lista.length ? Math.min(...lista.map((c) => c.contraste)) : 1;
  const proporcao = Math.max(caixa.largura / caixa.altura, caixa.altura / caixa.largura);
  const lado = Math.max(caixa.largura, caixa.altura);
  const recusa: RecusaLogo | null = lado < LOGO_MIN_LADO ? "LOGO_PEQUENO" : proporcao > LOGO_MAX_PROPORCAO ? "LOGO_COMPRIDO" : null;
  return {
    original, largura: caixa.largura, altura: caixa.altura, corte, proporcao, contraste: Math.round(contraste * 100) / 100, cores: lista,
    passa: !recusa && contraste >= LOGO_MIN_CONTRASTE, recusa,
  };
}

/** "5,0:1" */
export function contrasteLegivel(c: number): string {
  return `${c.toFixed(1).replace(".", ",")}:1`;
}

/** Logo quase quadrado (menos de 2:1), que pergunta se entra com o nome ao lado. */
export function quaseQuadrado(l: { largura: number; altura: number }): boolean {
  return l.largura < LOGO_QUASE_QUADRADO * l.altura;
}

/** O jeito padrão: largo, só o logo; quase quadrado, o logo e o nome ao lado (pergunta 8). */
export function jeitoPadrao(l: { largura: number; altura: number }): JeitoLogo {
  return quaseQuadrado(l) ? "LOGO_E_NOME" : "SO_LOGO";
}

// ---------------------------------------------------------------------------------------
// Ler o PNG (na API, sem biblioteca: o navegador e o Deno já trazem o inflate).

export class ErroPng extends Error {}

async function inflar(dados: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream("deflate");
  const saida = new Response(new Blob([dados.slice().buffer]).stream().pipeThrough(ds));
  return new Uint8Array(await saida.arrayBuffer());
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/** Lê um PNG de 8 bits por canal, sem entrelaçar (o que o canvas grava), e devolve os pixels RGBA.
 * maxLado recusa antes de abrir, para não inflar um arquivo gigante. */
export async function lerPng(bytes: Uint8Array, maxLado = 10000): Promise<{ largura: number; altura: number; rgba: Uint8Array }> {
  const assinatura = [137, 80, 78, 71, 13, 10, 26, 10];
  if (bytes.length < 33 || assinatura.some((b, i) => bytes[i] !== b)) throw new ErroPng("não é PNG");
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let p = 8, largura = 0, altura = 0, profundidade = 0, tipo = 0, entrelacado = 0;
  let paleta: Uint8Array | null = null, transp: Uint8Array | null = null;
  const partes: Uint8Array[] = [];
  while (p + 8 <= bytes.length) {
    const tam = dv.getUint32(p);
    const nome = String.fromCharCode(bytes[p + 4]!, bytes[p + 5]!, bytes[p + 6]!, bytes[p + 7]!);
    const dados = bytes.subarray(p + 8, p + 8 + tam);
    if (p + 12 + tam > bytes.length) throw new ErroPng("PNG cortado");
    if (nome === "IHDR") {
      largura = dv.getUint32(p + 8); altura = dv.getUint32(p + 12);
      profundidade = bytes[p + 16]!; tipo = bytes[p + 17]!; entrelacado = bytes[p + 20]!;
    } else if (nome === "PLTE") paleta = dados;
    else if (nome === "tRNS") transp = dados;
    else if (nome === "IDAT") partes.push(dados);
    else if (nome === "IEND") break;
    p += 12 + tam;
  }
  if (!largura || !altura || largura > maxLado || altura > maxLado) throw new ErroPng("tamanho inválido");
  if (profundidade !== 8 || entrelacado !== 0 || ![0, 2, 3, 4, 6].includes(tipo)) throw new ErroPng("PNG fora do formato");
  const canais = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[tipo as 0 | 2 | 3 | 4 | 6];
  const junto = new Uint8Array(partes.reduce((t, x) => t + x.length, 0));
  let o = 0;
  for (const x of partes) { junto.set(x, o); o += x.length; }
  const cru = await inflar(junto);
  const passo = largura * canais;
  if (cru.length < (passo + 1) * altura) throw new ErroPng("PNG cortado");
  const linhas = new Uint8Array(passo * altura);
  for (let y = 0; y < altura; y++) {
    const filtro = cru[y * (passo + 1)]!;
    const de = y * (passo + 1) + 1, para = y * passo;
    for (let x = 0; x < passo; x++) {
      const v = cru[de + x]!;
      const a = x >= canais ? linhas[para + x - canais]! : 0;
      const b = y > 0 ? linhas[para - passo + x]! : 0;
      const c = y > 0 && x >= canais ? linhas[para - passo + x - canais]! : 0;
      linhas[para + x] = (filtro === 0 ? v : filtro === 1 ? v + a : filtro === 2 ? v + b : filtro === 3 ? v + ((a + b) >> 1) : filtro === 4 ? v + paeth(a, b, c) : -1) & 0xff;
      if (filtro > 4) throw new ErroPng("filtro inválido");
    }
  }
  const rgba = new Uint8Array(largura * altura * 4);
  for (let i = 0, j = 0; i < largura * altura; i++, j += canais) {
    let r: number, g: number, b: number, a = 255;
    if (tipo === 6) { r = linhas[j]!; g = linhas[j + 1]!; b = linhas[j + 2]!; a = linhas[j + 3]!; }
    else if (tipo === 2) { r = linhas[j]!; g = linhas[j + 1]!; b = linhas[j + 2]!; }
    else if (tipo === 4) { r = g = b = linhas[j]!; a = linhas[j + 1]!; }
    else if (tipo === 0) { r = g = b = linhas[j]!; }
    else {
      const k = linhas[j]!;
      if (!paleta || k * 3 + 2 >= paleta.length) throw new ErroPng("paleta inválida");
      r = paleta[k * 3]!; g = paleta[k * 3 + 1]!; b = paleta[k * 3 + 2]!;
      a = transp && k < transp.length ? transp[k]! : 255;
    }
    rgba[i * 4] = r; rgba[i * 4 + 1] = g; rgba[i * 4 + 2] = b; rgba[i * 4 + 3] = a;
  }
  return { largura, altura, rgba };
}

// ---------------------------------------------------------------------------------------
// O que a tela e os documentos usam.

/** O logo guardado, como a API devolve. */
export interface LogoEscritorio {
  id: string;
  nome: string;
  formato: FormatoLogo;
  bytes: number;
  largura: number;
  altura: number;
  corte: Partial<CorteLogo>;
  contraste: number;
  passa: boolean;
  enviadoPor?: { id: string; nome: string } | null;
  enviadoEm?: string;
}

/** A marca guardada junto de cada carnê e recibo (pergunta 9): o que foi no papel naquele dia. */
export interface MarcaNoDocumento {
  tipo: MarcaDocumento;
  logoId?: string;
  largura?: number;
  altura?: number;
  jeito?: JeitoLogo;
  cor?: CorLogo;
  /** "OAB/SP 31.874", o registro da sociedade. */
  oab?: string;
}

/**
 * O logo "em uma cor só" (CorLogo UMA_COR) para os documentos feitos no servidor (F3.92, F3.93): o
 * desenho fica preto, com a mesma transparência, como o filtro da tela (img.lg-uma-cor). Devolve
 * um PNG RGBA de 8 bits.
 */
export async function pngEmUmaCor(bytes: Uint8Array): Promise<Uint8Array> {
  const { largura, altura, rgba } = await lerPng(bytes);
  const linhas = new Uint8Array(altura * (largura * 4 + 1));
  for (let y = 0; y < altura; y++) {
    const o = y * (largura * 4 + 1);
    for (let x = 0; x < largura; x++) linhas[o + 1 + x * 4 + 3] = rgba[(y * largura + x) * 4 + 3]!;
  }
  const fluxo = new Blob([linhas]).stream().pipeThrough(new CompressionStream("deflate"));
  const idat = new Uint8Array(await new Response(fluxo).arrayBuffer());
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, largura);
  dv.setUint32(4, altura);
  ihdr.set([8, 6, 0, 0, 0], 8);
  const pedaco = (tipo: string, dados: Uint8Array) => {
    const b = new Uint8Array(12 + dados.length);
    const v = new DataView(b.buffer);
    v.setUint32(0, dados.length);
    b.set(new TextEncoder().encode(tipo), 4);
    b.set(dados, 8);
    v.setUint32(8 + dados.length, crc32(b.subarray(4, 8 + dados.length)));
    return b;
  };
  const partes = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), pedaco("IHDR", ihdr), pedaco("IDAT", idat), pedaco("IEND", new Uint8Array())];
  const out = new Uint8Array(partes.reduce((s, x) => s + x.length, 0));
  let i = 0;
  for (const x of partes) { out.set(x, i); i += x.length; }
  return out;
}

/** Endereço do PNG do logo (só para o escritório da sessão). */
export function enderecoDoLogo(id: string): string {
  return `/api/v1/escritorio/logos/${id}`;
}

/** "OAB/SP 31.874" */
export function fraseOabSociedade(uf: string | null | undefined, numero: string | null | undefined): string | null {
  if (!uf || !numero) return null;
  return `OAB/${uf.toUpperCase()} ${numero.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

/** As frases das recusas (decisão 20). */
export function textoRecusaLogo(m: RecusaLogo, d: { formato?: string; bytes?: number; largura?: number; altura?: number } = {}): { titulo: string; texto: string } {
  switch (m) {
    case "LOGO_FORMATO":
      return { titulo: `O T3jus não lê ${d.formato ?? "este formato"} como logo.`, texto: "Envie o logo em PNG, JPG ou SVG. PDF, Word, HEIC e WebP não entram: peça a quem fez o logo o arquivo em PNG." };
    case "LOGO_GRANDE":
      return { titulo: `O arquivo tem ${d.bytes ? (d.bytes / 1024 / 1024).toFixed(1).replace(".", ",") : "mais de 1"} MB.`, texto: "O limite é 1 MB. Salve o logo de novo em PNG, sem foto de fundo, ou peça a quem fez o logo uma versão menor." };
    case "LOGO_PEQUENO":
      return { titulo: `Ele tem ${d.largura ?? 0} × ${d.altura ?? 0} px e sairia borrado.`, texto: `O lado maior precisa de ${LOGO_MIN_LADO} px ou mais, depois do corte da margem. Envie o arquivo original: a foto de perfil do WhatsApp é pequena demais.` };
    case "LOGO_SVG_INSEGURO":
      return { titulo: "Este SVG tem código ou busca coisas de fora.", texto: "Por segurança, o T3jus não guarda SVG com script, fonte ou imagem de outro endereço. Exporte o logo de novo em SVG simples, ou envie em PNG." };
    case "LOGO_COMPRIDO":
      return { titulo: "O logo é comprido demais.", texto: `Ele tem mais de ${LOGO_MAX_PROPORCAO} vezes a largura pela altura e ficaria fino demais no papel. Envie a versão do logo com o símbolo e o nome mais juntos.` };
    case "LOGO_VAZIO":
      return { titulo: "Não achamos desenho no arquivo.", texto: "O arquivo parece todo branco ou transparente. Confira se é o logo certo." };
  }
}
