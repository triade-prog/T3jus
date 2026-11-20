// Ler e escrever .zip sem biblioteca, com o DecompressionStream e o CompressionStream
// ("deflate-raw"), que existem no Node, no Deno e nos navegadores. Serve ao .docx das petições
// (EX-09), que é um .zip de arquivos XML. A leitura tem limites contra arquivo malicioso
// ("bomba de zip"): número de entradas, tamanho de cada uma e o total descompactado (PT-07).

export type MotivoZip = "ZIP_INVALIDO" | "ZIP_PROTEGIDO" | "ZIP_GRANDE";

export class ErroZip extends Error {
  constructor(readonly motivo: MotivoZip) {
    super(motivo);
    this.name = "ErroZip";
  }
}

export interface EntradaZip {
  nome: string;
  metodo: number;
  comprimido: number;
  tamanho: number;
  inicio: number;
}

export interface LimitesZip {
  entradas: number;
  porEntrada: number;
  total: number;
}

/** Um .docx comum tem dezenas de entradas e poucos MB descompactados. */
export const LIMITES_ZIP: LimitesZip = { entradas: 1000, porEntrada: 30 * 1024 * 1024, total: 60 * 1024 * 1024 };

/** O diretório central do .zip: nome, método e onde começa cada entrada. */
export function lerZip(b: Uint8Array, limites: LimitesZip = LIMITES_ZIP): Map<string, EntradaZip> {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let fim = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { fim = i; break; }
  }
  if (fim < 0) throw new ErroZip("ZIP_INVALIDO");
  const total = dv.getUint16(fim + 10, true);
  if (total > limites.entradas) throw new ErroZip("ZIP_GRANDE");
  let p = dv.getUint32(fim + 16, true);
  const dec = new TextDecoder();
  const mapa = new Map<string, EntradaZip>();
  let soma = 0;
  for (let n = 0; n < total; n++) {
    if (p + 46 > b.length || dv.getUint32(p, true) !== 0x02014b50) throw new ErroZip("ZIP_INVALIDO");
    const flags = dv.getUint16(p + 8, true);
    const metodo = dv.getUint16(p + 10, true);
    const comprimido = dv.getUint32(p + 20, true);
    const tamanho = dv.getUint32(p + 24, true);
    const lnome = dv.getUint16(p + 28, true);
    const lextra = dv.getUint16(p + 30, true);
    const lcom = dv.getUint16(p + 32, true);
    const local = dv.getUint32(p + 42, true);
    const nome = dec.decode(b.subarray(p + 46, p + 46 + lnome));
    if (flags & 1) throw new ErroZip("ZIP_PROTEGIDO");
    if (local + 30 > b.length || dv.getUint32(local, true) !== 0x04034b50) throw new ErroZip("ZIP_INVALIDO");
    if (tamanho > limites.porEntrada) throw new ErroZip("ZIP_GRANDE");
    soma += tamanho;
    if (soma > limites.total) throw new ErroZip("ZIP_GRANDE");
    const inicio = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true);
    if (inicio + comprimido > b.length) throw new ErroZip("ZIP_INVALIDO");
    mapa.set(nome, { nome, metodo, comprimido, tamanho, inicio });
    p += 46 + lnome + lextra + lcom;
  }
  return mapa;
}

/** Os bytes de uma entrada, sem passar do tamanho que o diretório central declara. */
export async function abrirEntrada(b: Uint8Array, e: EntradaZip): Promise<Uint8Array> {
  const dados = b.subarray(e.inicio, e.inicio + e.comprimido);
  if (e.metodo === 0) {
    if (e.comprimido !== e.tamanho) throw new ErroZip("ZIP_INVALIDO");
    return dados.slice();
  }
  if (e.metodo !== 8) throw new ErroZip("ZIP_INVALIDO");
  const leitor = new Blob([dados.slice()]).stream().pipeThrough(new DecompressionStream("deflate-raw")).getReader();
  const saida = new Uint8Array(e.tamanho);
  let n = 0;
  try {
    for (;;) {
      const { done, value } = await leitor.read();
      if (done) break;
      if (n + value.length > e.tamanho) {
        await leitor.cancel();
        throw new ErroZip("ZIP_GRANDE");
      }
      saida.set(value, n);
      n += value.length;
    }
  } catch (erro) {
    if (erro instanceof ErroZip) throw erro;
    throw new ErroZip("ZIP_INVALIDO");
  }
  if (n !== e.tamanho) throw new ErroZip("ZIP_INVALIDO");
  return saida;
}

export async function abrirTexto(b: Uint8Array, e: EntradaZip): Promise<string> {
  return new TextDecoder().decode(await abrirEntrada(b, e));
}

const TABELA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  return t;
})();

export function crc32(b: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = TABELA_CRC[(c ^ b[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

async function comprimir(b: Uint8Array): Promise<Uint8Array> {
  const fluxo = new Blob([b.slice()]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(fluxo).arrayBuffer());
}

/** Monta o .zip com as entradas na ordem dada, comprimidas com deflate. */
export async function escreverZip(entradas: { nome: string; dados: Uint8Array }[]): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const partes: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let pos = 0;
  for (const e of entradas) {
    const nome = enc.encode(e.nome);
    const dados = await comprimir(e.dados);
    const crc = crc32(e.dados);
    const local = new Uint8Array(30 + nome.length);
    const dl = new DataView(local.buffer);
    dl.setUint32(0, 0x04034b50, true);
    dl.setUint16(4, 20, true);
    dl.setUint16(6, 0x0800, true); // nomes em UTF-8
    dl.setUint16(8, 8, true);
    dl.setUint16(10, 0, true);
    dl.setUint16(12, 0x21, true); // 1/1/1980
    dl.setUint32(14, crc, true);
    dl.setUint32(18, dados.length, true);
    dl.setUint32(22, e.dados.length, true);
    dl.setUint16(26, nome.length, true);
    local.set(nome, 30);
    const cd = new Uint8Array(46 + nome.length);
    const dc = new DataView(cd.buffer);
    dc.setUint32(0, 0x02014b50, true);
    dc.setUint16(4, 20, true);
    dc.setUint16(6, 20, true);
    dc.setUint16(8, 0x0800, true);
    dc.setUint16(10, 8, true);
    dc.setUint16(14, 0x21, true);
    dc.setUint32(16, crc, true);
    dc.setUint32(20, dados.length, true);
    dc.setUint32(24, e.dados.length, true);
    dc.setUint16(28, nome.length, true);
    dc.setUint32(42, pos, true);
    cd.set(nome, 46);
    partes.push(local, dados);
    central.push(cd);
    pos += local.length + dados.length;
  }
  const tamCentral = central.reduce((s, c) => s + c.length, 0);
  const fim = new Uint8Array(22);
  const df = new DataView(fim.buffer);
  df.setUint32(0, 0x06054b50, true);
  df.setUint16(8, entradas.length, true);
  df.setUint16(10, entradas.length, true);
  df.setUint32(12, tamCentral, true);
  df.setUint32(16, pos, true);
  const saida = new Uint8Array(pos + tamCentral + 22);
  let n = 0;
  for (const p of [...partes, ...central, fim]) {
    saida.set(p, n);
    n += p.length;
  }
  return saida;
}
