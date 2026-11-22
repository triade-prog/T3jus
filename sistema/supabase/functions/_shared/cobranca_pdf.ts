// A fatura e o recibo da cobrança dos escritórios em PDF (F1.21, CO-06), do T3jus para o
// escritório. Seguem as folhas A4 aprovadas pela Carol em 22/11/2026 em
// docs/design/aprovadas/cobranca-pdfs (fatura-a4 e recibo-a4): o logo completo em vinho, os dados
// do emissor à direita, o fio vinho com o toque âmbar, o número e o valor numa caixa, o pagador,
// os itens, como pagar e as notas do pé. O dado vem do banco (cobranca_documento_json, 0695).
//
//  * Sem os dados do T3jus (configuracoes.cobranca_emissor), o lugar deles sai com o marcador
//    tracejado "A DEFINIR", como no desenho. O Portal não oferece o PDF nesse caso.
//  * Paga ou cancelada, os códigos não saem: um PDF antigo não vira cobrança de novo.
//  * Sem códigos (até ligar o Inter), a fatura diz como pagar falando com o T3jus.
//  * Sem endereço de cobrança, a fatura sai só com o Pix e diz por quê.
//  * Tudo o que informa está em tinta ou vinho; o âmbar é só filete. QR e barras pretos no branco.

import { PDFDocument, type PDFFont, type PDFImage, type PDFPage, rgb, StandardFonts } from "pdf-lib";
import qrcode from "qrcode-generator";
import { dataBr, ErroDominio, mesPorExtenso, reais, valorPorExtenso } from "@t3jus/domain";
import { type Arquivos, VALIDADE_LEITURA_S } from "./arquivos.ts";
import { logoCompletoPng, LOGO_PROPORCAO, simboloPng } from "./marca_t3jus.ts";

type Cor = ReturnType<typeof rgb>;
const MM = 72 / 25.4;
const A4 = { w: 210 * MM, h: 297 * MM };
const MARGEM = 18 * MM;
const LARG = A4.w - 2 * MARGEM;
const VINHO = rgb(0x69 / 255, 0x27 / 255, 0x46 / 255);
const TINTA = rgb(0x2a / 255, 0x1a / 255, 0x22 / 255);
const SUAVE = rgb(0x5e / 255, 0x4a / 255, 0x54 / 255);
const AMBAR = rgb(0xdd / 255, 0x97 / 255, 0x60 / 255);
const SAL = rgb(0xf2 / 255, 0xec / 255, 0xe8 / 255);
const FIO = rgb(0xdd / 255, 0xd0 / 255, 0xd6 / 255);
const URGENTE = rgb(0x9b / 255, 0x1c / 255, 0x31 / 255);
const PRETO = rgb(0, 0, 0);
const BRANCO = rgb(1, 1, 1);

/** O que o banco devolve (cobranca_documento_json). */
export interface DocumentoCobranca {
  id: string;
  numero: number;
  competencia: string;
  vencimento: string;
  plano: string;
  forma: "PIX" | "BOLETO" | "CARNE";
  totalCentavos: number;
  situacao: "A_VENCER" | "VENCE_HOJE" | "EM_ATRASO" | "PAGA" | "CANCELADA";
  atrasoDias: number | null;
  emitidaEm: string;
  pessoasAtivas: number;
  pessoasIncluidas: number | null;
  hoje: string;
  emissor: Emissor | null;
  pagador: {
    nome: string;
    cnpj: string | null;
    email: string | null;
    socio: string | null;
    endereco: { cep: string; logradouro: string; numero: string; complemento: string | null; bairro: string; cidade: string; uf: string } | null;
  };
  itens: { tipo: "MENSALIDADE" | "PESSOA_A_MAIS" | "DESCONTO"; descricao: string; quantidade: number; valorUnitarioCentavos: number; valorCentavos: number }[] | null;
  motivoDesconto: string | null;
  codigos: { provedor: string | null; pixCopiaCola: string | null; linhaBoleto: string | null; codigoBarras: string | null } | null;
  pagamento: { pagaEm: string; forma: string; baixa: "MANUAL" | "MEIO_DE_PAGAMENTO"; registradoEm: string | null; registradoPor: string | null } | null;
  canceladaEm: string | null;
  outrasAbertas: { numero: number; competencia: string; vencimento: string; totalCentavos: number }[];
  carne: { numero: string; parcela: number; de: number; geradoEm: string } | null;
}

export interface Emissor {
  razaoSocial: string;
  cnpj: string;
  endereco: string;
  cidade: string;
  uf?: string | null;
  contato: string;
  remetente?: string | null;
}

/** "2026/0187": o número da fatura (e do recibo), como no Console. */
export const numeroDoc = (d: Pick<DocumentoCobranca, "competencia" | "numero">) => `${d.competencia.slice(0, 4)}/${String(d.numero).padStart(4, "0")}`;

const FORMA_PAGA: Record<string, string> = { PIX: "Pix", BOLETO: "boleto", TRANSFERENCIA: "transferência", DINHEIRO: "dinheiro", OUTRA: "outra forma" };
const fuso = { timeZone: "America/Sao_Paulo" } as const;
const diaDe = (em: string) => new Intl.DateTimeFormat("en-CA", { ...fuso, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(em));
const horaDe = (em: string) => new Intl.DateTimeFormat("pt-BR", { ...fuso, hour: "2-digit", minute: "2-digit" }).format(new Date(em)).replace(":", "h");
const cnpjLegivel = (c: string) => c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
const cepLegivel = (c: string) => c.replace(/^(\d{5})(\d{3})$/, "$1-$2");

/** A fonte padrão do PDF só tem o alfabeto latino (WinAnsi): o resto sai sem o caractere. */
const WINANSI = /[^\x20-\x7e\xa0-\xff‘’“”–—•…€›‹]/g;
const limpo = (s: string) => s.replace(/\s+/g, " ").replace(WINANSI, "");

function quebrar(s: string, f: PDFFont, t: number, largura: number): string[] {
  const out: string[] = [];
  let atual = "";
  for (const palavra of limpo(s).split(" ")) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra;
    if (f.widthOfTextAtSize(tentativa, t) <= largura) { atual = tentativa; continue; }
    if (atual) out.push(atual);
    // Palavra maior que a linha (o Pix copia e cola): corta por letra.
    let resto = palavra;
    while (f.widthOfTextAtSize(resto, t) > largura) {
      let i = resto.length;
      while (i > 1 && f.widthOfTextAtSize(resto.slice(0, i), t) > largura) i--;
      out.push(resto.slice(0, i));
      resto = resto.slice(i);
    }
    atual = resto;
  }
  if (atual) out.push(atual);
  return out;
}

interface Fontes { r: PDFFont; b: PDFFont; i: PDFFont; sr: PDFFont; sb: PDFFont; si: PDFFont; m: PDFFont; mb: PDFFont }
interface Pedaco { s: string; f?: keyof Fontes; cor?: Cor; marcador?: boolean }

/** A pena: escreve de cima para baixo (y é a linha de cima) e devolve o y de baixo. */
class Pena {
  constructor(readonly pg: PDFPage, readonly f: Fontes) {}

  texto(s: string, x: number, y: number, o: { t?: number; f?: keyof Fontes; cor?: Cor; largura?: number; dir?: boolean; alto?: number } = {}): number {
    const t = o.t ?? 8.5, f = this.f[o.f ?? "r"], alto = t * (o.alto ?? 1.35);
    const linhas = o.largura && !o.dir ? quebrar(s, f, t, o.largura) : [limpo(s)];
    let yy = y;
    for (const l of linhas) {
      yy -= alto;
      const xx = o.dir ? x - f.widthOfTextAtSize(l, t) : x;
      this.pg.drawText(l, { x: xx, y: yy + (alto - t) / 2 + t * 0.2, size: t, font: f, color: o.cor ?? TINTA });
    }
    return yy;
  }

  largura(s: string, t: number, f: keyof Fontes = "r") { return this.f[f].widthOfTextAtSize(limpo(s), t); }

  /** Rótulo em maiúsculas pequenas, com espaço entre as letras (como o .dp-rot do desenho). */
  rotulo(s: string, x: number, y: number, o: { t?: number; cor?: Cor; dir?: boolean } = {}): number {
    const t = o.t ?? 6.2, f = this.f.b, esp = t * 0.14, txt = limpo(s.toUpperCase());
    const w = f.widthOfTextAtSize(txt, t) + esp * (txt.length - 1);
    let xx = o.dir ? x - w : x;
    const base = y - t * 1.5 + t * 0.35;
    for (const ch of txt) {
      this.pg.drawText(ch, { x: xx, y: base, size: t, font: f, color: o.cor ?? SUAVE });
      xx += f.widthOfTextAtSize(ch, t) + esp;
    }
    return y - t * 1.5;
  }

  /**
   * Texto em pedaços na mesma linha, quebrando por palavra (negrito, itálico e o marcador
   * "A DEFINIR" no meio da frase). Devolve o y de baixo.
   */
  corrido(pedacos: Pedaco[], x: number, y: number, largura: number, t: number, o: { alto?: number; justificar?: boolean } = {}): number {
    const palavras: { s: string; f: PDFFont; cor: Cor; marcador: boolean; junto: boolean }[] = [];
    let junto = false;
    for (const p of pedacos) {
      const fonte = this.f[p.f ?? "r"];
      if (p.marcador) {
        palavras.push({ s: limpo(p.s), f: this.f.i, cor: VINHO, marcador: true, junto });
        junto = true;
        continue;
      }
      for (const parte of limpo(p.s).split(/( +)/)) {
        if (!parte) continue;
        if (/^ +$/.test(parte)) { junto = false; continue; }
        palavras.push({ s: parte, f: fonte, cor: p.cor ?? TINTA, marcador: false, junto });
        junto = true;
      }
    }
    const alto = t * (o.alto ?? 1.4);
    const esp = this.f.r.widthOfTextAtSize(" ", t);
    const largDe = (w: (typeof palavras)[number]) => w.marcador ? this.larguraMarcador(w.s, t) : w.f.widthOfTextAtSize(w.s, t);
    let linha: { w: (typeof palavras)[number]; x: number; lw: number }[] = [];
    let cx = 0;
    let yy = y;
    const soltar = (ultima: boolean) => {
      yy -= alto;
      const sobra = largura - cx, buracos = linha.filter((l, i) => i > 0 && !l.w.junto).length;
      const extra = o.justificar && !ultima && buracos > 0 && sobra > 0 && sobra < largura * 0.25 ? sobra / buracos : 0;
      let ajuste = 0;
      linha.forEach((l, i) => {
        if (i > 0 && !l.w.junto) ajuste += extra;
        const xx = x + l.x + ajuste, base = yy + (alto - t) / 2 + t * 0.2;
        if (l.w.marcador) this.marcador(l.w.s, xx, base, t);
        else this.pg.drawText(l.w.s, { x: xx, y: base, size: t, font: l.w.f, color: l.w.cor });
      });
      linha = [];
      cx = 0;
    };
    for (const w of palavras) {
      const lw = largDe(w);
      const sep = linha.length && !w.junto ? esp : 0;
      if (linha.length && cx + sep + lw > largura) {
        // A palavra presa à anterior ("(", vírgula) desce junto com o pedaço a que está presa.
        let k = linha.length;
        if (w.junto) while (k > 0 && linha[k - 1]!.w.junto) k--;
        if (w.junto) k--;
        const desce = k > 0 ? linha.splice(k) : [];
        cx = linha.length ? linha.at(-1)!.x + linha.at(-1)!.lw : 0;
        if (linha.length) soltar(false);
        for (const d of desce) {
          const s3 = linha.length && !d.w.junto ? esp : 0;
          linha.push({ w: d.w, x: cx + s3, lw: d.lw });
          cx += s3 + d.lw;
        }
      }
      const s2 = linha.length && !w.junto ? esp : 0;
      linha.push({ w, x: cx + s2, lw });
      cx += s2 + lw;
    }
    if (linha.length) soltar(true);
    return yy;
  }

  private larguraMarcador(s: string, t: number) {
    return this.f.b.widthOfTextAtSize("A DEFINIR", t * 0.72) + 3 + this.f.i.widthOfTextAtSize(s, t) + 6;
  }

  /** O marcador tracejado do desenho: "A DEFINIR" e o que falta, em vinho. `base` é a linha de base. */
  marcador(s: string, x: number, base: number, t: number) {
    const w = this.larguraMarcador(s, t);
    this.pg.drawRectangle({ x, y: base - t * 0.32, width: w - 2.5, height: t * 1.28, borderColor: VINHO, borderWidth: 0.5, borderDashArray: [1.6, 1.2], color: rgb(0.99, 0.96, 0.97) });
    this.pg.drawText("A DEFINIR", { x: x + 3, y: base + t * 0.08, size: t * 0.72, font: this.f.b, color: VINHO });
    this.pg.drawText(limpo(s), { x: x + 3 + this.f.b.widthOfTextAtSize("A DEFINIR", t * 0.72) + 3, y: base, size: t, font: this.f.i, color: VINHO });
  }

  linha(x1: number, y1: number, x2: number, y2: number, cor: Cor = FIO, esp = 0.5, tracejada = false) {
    this.pg.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: esp, color: cor, dashArray: tracejada ? [2.5, 2] : undefined });
  }

  /** Retângulo pelo canto de cima. */
  caixa(x: number, y: number, w: number, h: number, o: { borda?: Cor; fundo?: Cor; esp?: number; tracejada?: boolean } = {}) {
    this.pg.drawRectangle({ x, y: y - h, width: w, height: h, color: o.fundo, borderColor: o.borda, borderWidth: o.borda ? (o.esp ?? 0.6) : 0,
      borderDashArray: o.tracejada ? [2.5, 2] : undefined });
  }

  qr(texto: string, x: number, y: number, lado: number) {
    const q = qrcode(0, "M");
    q.addData(texto);
    q.make();
    const n = q.getModuleCount(), m = lado / (n + 2);
    this.pg.drawRectangle({ x, y: y - lado, width: lado, height: lado, color: BRANCO });
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (q.isDark(r, c)) this.pg.drawRectangle({ x: x + (c + 1) * m, y: y - (r + 2) * m, width: m + 0.05, height: m + 0.05, color: PRETO });
    }
  }

  /** Código de barras do boleto: Intercalado 2 de 5 (padrão Febraban), 44 dígitos. */
  barras(digitos: string, x: number, y: number, largura: number, alto: number) {
    const PADRAO = ["nnwwn", "wnnnw", "nwnnw", "wwnnn", "nnwnw", "wnwnn", "nwwnn", "nnnww", "wnnwn", "nwnwn"];
    const d = digitos.replace(/\D/g, "");
    if (d.length % 2) return;
    const seq: [boolean, number][] = [[true, 1], [false, 1], [true, 1], [false, 1]];
    for (let i = 0; i < d.length; i += 2) {
      const a = PADRAO[Number(d[i])]!, b = PADRAO[Number(d[i + 1])]!;
      for (let k = 0; k < 5; k++) { seq.push([true, a[k] === "w" ? 3 : 1]); seq.push([false, b[k] === "w" ? 3 : 1]); }
    }
    seq.push([true, 3], [false, 1], [true, 1]);
    const unidade = largura / seq.reduce((s, [, u]) => s + u, 0);
    let xx = x;
    for (const [barra, u] of seq) {
      if (barra) this.pg.drawRectangle({ x: xx, y: y - alto, width: u * unidade, height: alto, color: PRETO });
      xx += u * unidade;
    }
  }
}

async function fontes(doc: PDFDocument): Promise<Fontes> {
  return {
    r: await doc.embedFont(StandardFonts.Helvetica), b: await doc.embedFont(StandardFonts.HelveticaBold),
    i: await doc.embedFont(StandardFonts.HelveticaOblique), sr: await doc.embedFont(StandardFonts.TimesRoman),
    sb: await doc.embedFont(StandardFonts.TimesRomanBold), si: await doc.embedFont(StandardFonts.TimesRomanItalic),
    m: await doc.embedFont(StandardFonts.Courier), mb: await doc.embedFont(StandardFonts.CourierBold),
  };
}

/** O emissor, ou o marcador "A DEFINIR" no lugar de cada dado. */
const dadoEmissor = (e: Emissor | null, k: keyof Emissor, falta: string): Pedaco =>
  e && e[k] ? { s: k === "cnpj" ? cnpjLegivel(String(e[k])) : String(e[k]) } : { s: falta, marcador: true };
const contato = (e: Emissor | null) => dadoEmissor(e, "contato", "atendimento@exemplo.com.br");
const remetente = (e: Emissor | null): Pedaco => (e ? { s: e.remetente || e.contato } : { s: "cobranca@exemplo.com.br", marcador: true });

/** A faixa vinho do alto, o logo, o emissor à direita e o fio com o toque âmbar. Devolve o y de baixo. */
function timbre(pe: Pena, logo: PDFImage, e: Emissor | null): number {
  pe.pg.drawRectangle({ x: 0, y: A4.h - 4 * MM, width: A4.w, height: 4 * MM, color: VINHO });
  const topo = A4.h - 12 * MM, altoLogo = 14 * MM;
  pe.pg.drawImage(logo, { x: MARGEM, y: topo - altoLogo, width: altoLogo * LOGO_PROPORCAO, height: altoLogo });
  // Os dados do emissor, alinhados à direita.
  const linhas: Pedaco[][] = [
    [dadoEmissor(e, "razaoSocial", "razão social do T3jus")],
    [{ s: "CNPJ ", cor: SUAVE }, dadoEmissor(e, "cnpj", "do T3jus")],
    [e ? { s: `${e.endereco} · ${e.cidade}${e.uf ? `, ${e.uf}` : ""}` } : { s: "endereço do T3jus", marcador: true }],
    [contato(e)],
  ];
  let y = topo + 1;
  const t = 7.6;
  for (const l of linhas) {
    const w = l.reduce((s, p) => s + (p.marcador ? pe.largura("A DEFINIR", t * 0.72, "b") + 3 + pe.largura(p.s, t, "i") + 6 : pe.largura(p.s, t)), 0);
    pe.corrido(l, MARGEM + LARG - w - 1, y, w + 2, t, { alto: 1.55 });
    y -= t * 1.55;
  }
  const fio = topo - altoLogo - 3 * MM;
  pe.linha(MARGEM, fio, MARGEM + LARG, fio, VINHO, 0.8);
  pe.pg.drawRectangle({ x: MARGEM, y: fio - 0.8, width: 22 * MM, height: 1.8, color: AMBAR });
  return fio - 5 * MM;
}

/** O pé: número, quando, por onde foi, e o símbolo com "T3jus · Sistema jurídico". */
function pe(pena: Pena, simbolo: PDFImage, partes: Pedaco[]) {
  const y = 16 * MM;
  pena.linha(MARGEM, y + 2 * MM, MARGEM + LARG, y + 2 * MM, FIO, 0.6);
  pena.corrido(partes.map((p) => ({ ...p, cor: p.cor ?? SUAVE })), MARGEM, y, LARG - 50 * MM, 6.6);
  const txt = "T3jus · Sistema jurídico", w = pena.largura(txt, 6.6);
  pena.texto(txt, MARGEM + LARG, y, { t: 6.6, cor: SUAVE, dir: true });
  pena.pg.drawImage(simbolo, { x: MARGEM + LARG - w - 10, y: y - 8, width: 7.5, height: 7.5 });
}

/** O título com o selo, o número e a caixa do valor à direita. Devolve o y de baixo. */
function topo(pena: Pena, y: number, o: { rotulo: string; titulo: string; selo: { texto: string; cor: Cor; cheio?: boolean } | null; numero: Pedaco[];
  rotValor: string; valor: string; riscado?: boolean; sobValor: Pedaco[] }): number {
  const wCaixa = 88 * MM, hCaixa = 30 * MM, xCaixa = MARGEM + LARG - wCaixa;
  pena.caixa(xCaixa, y, wCaixa, hCaixa, { borda: VINHO, esp: 0.8 });
  let yv = pena.rotulo(o.rotValor, xCaixa + wCaixa - 7 * MM, y - 4 * MM, { dir: true, cor: SUAVE });
  yv = pena.texto(o.valor, xCaixa + wCaixa - 7 * MM, yv - 1, { t: 24, f: "sb", dir: true, alto: 1.15 });
  if (o.riscado) {
    const w = pena.largura(o.valor, 24, "sb");
    pena.linha(xCaixa + wCaixa - 7 * MM - w, yv + 11, xCaixa + wCaixa - 7 * MM, yv + 11, TINTA, 1.1);
  }
  const wSob = o.sobValor.reduce((s, p) => s + pena.largura(p.s, 9, p.f ?? "r"), 0) + 2;
  pena.corrido(o.sobValor, xCaixa + wCaixa - 7 * MM - wSob, yv - 1, wSob + 2, 9);

  const larg = LARG - wCaixa - 6 * MM;
  let yt = y - 6 * MM;
  yt = pena.rotulo(o.rotulo, MARGEM, yt, { cor: SUAVE });
  yt = pena.texto(o.titulo, MARGEM, yt - 1, { t: 30, f: "sb", alto: 1.05 });
  if (o.selo) {
    const x = MARGEM + pena.largura(o.titulo, 30, "sb") + 4 * MM, ts = 7.4, ws = pena.largura(o.selo.texto, ts, "b") + 12;
    pena.pg.drawRectangle({ x, y: yt + 6, width: ws, height: 13, borderColor: o.selo.cor, borderWidth: 0.7, color: o.selo.cheio ? o.selo.cor : BRANCO });
    pena.pg.drawText(limpo(o.selo.texto), { x: x + 6, y: yt + 10, size: ts, font: pena.f.b, color: o.selo.cheio ? BRANCO : o.selo.cor });
  }
  pena.corrido(o.numero, MARGEM, yt - 2, larg, 9.5);
  return y - hCaixa - 4 * MM;
}

/** Faixa de aviso com o traço à esquerda (atraso, paga, cancelada, parcela, sem endereço). */
function faixa(pena: Pena, y: number, cor: Cor, pedacos: Pedaco[], x = MARGEM, largura = LARG): number {
  const t = 8.2, dentro = largura - 9 * MM;
  // Mede antes de desenhar: escreve num lugar fora da folha só para saber a altura.
  const alto = medir(pena, pedacos, dentro, t) + 5 * MM;
  pena.caixa(x, y, largura, alto, { fundo: SAL });
  pena.pg.drawRectangle({ x, y: y - alto, width: 1.6 * MM, height: alto, color: cor });
  pena.corrido(pedacos, x + 5 * MM, y - 2.5 * MM, dentro, t, { alto: 1.45 });
  return y - alto - 4 * MM;
}

/** Altura de um texto corrido sem desenhar (conta as linhas pela mesma quebra). */
function medir(pena: Pena, pedacos: Pedaco[], largura: number, t: number, alto = 1.45): number {
  const texto = pedacos.map((p) => (p.marcador ? `A DEFINIR ${p.s}  ` : p.s)).join("");
  return quebrar(texto, pena.f.b, t, largura).length * t * alto;
}

function secao(pena: Pena, y: number, titulo: string, sub?: string): number {
  const yy = pena.texto(titulo, MARGEM, y, { t: 13, f: "sb", cor: VINHO, alto: 1.2 });
  if (sub) pena.texto(sub, MARGEM + pena.largura(titulo, 13, "sb") + 3 * MM, y - 3.5, { t: 7.6, cor: SUAVE });
  return yy - 2 * MM;
}

function enderecoEm(d: DocumentoCobranca): [string, string] | null {
  const e = d.pagador.endereco;
  if (!e) return null;
  return [`${e.logradouro}, ${e.numero}${e.complemento ? `, ${e.complemento}` : ""} · ${e.bairro}`, `${e.cidade}, ${e.uf} · CEP ${cepLegivel(e.cep)}`];
}

/** A caixa sal com o pagador, o e-mail, o endereço, o plano e a forma. */
function dados(pena: Pena, y: number, d: DocumentoCobranca, forma: [string, string]): number {
  const alto = 33 * MM, x1 = MARGEM + 5 * MM, x2 = MARGEM + LARG / 2 + 3 * MM, x3 = x2 + LARG / 4 - 2 * MM, larg = LARG / 2 - 9 * MM;
  pena.caixa(MARGEM, y, LARG, alto, { fundo: SAL });
  const bloco = (x: number, yy: number, rot: string, val: string, sub: string | null, w = larg, italico = false) => {
    let b = pena.rotulo(rot, x, yy);
    b = pena.texto(val, x, b - 0.5, { t: 9.2, f: italico ? "i" : "b", largura: w });
    if (sub) b = pena.texto(sub, x, b, { t: 7.4, cor: SUAVE, largura: w });
    return b;
  };
  const cnpj = d.pagador.cnpj ? `CNPJ ${cnpjLegivel(d.pagador.cnpj)}` : null;
  bloco(x1, y - 3.5 * MM, "Pagador", d.pagador.nome, cnpj);
  bloco(x2, y - 3.5 * MM, "E-mail de cobrança", d.pagador.email ?? "não informado",
    d.pagador.socio ? `com cópia para ${d.pagador.socio}, sócio dono` : null);
  const end = enderecoEm(d);
  if (end) bloco(x1, y - 18 * MM, "Endereço de cobrança", end[0], end[1]);
  else bloco(x1, y - 18 * MM, "Endereço de cobrança", "não informado: o boleto não saiu", null, larg, true);
  bloco(x2, y - 18 * MM, "Plano", d.plano, `emitida em ${dataBr(diaDe(d.emitidaEm))}`, LARG / 4 - 6 * MM);
  bloco(x3, y - 18 * MM, "Forma", forma[0], forma[1], LARG / 4 - 6 * MM);
  return y - alto - 5 * MM;
}

/** O detalhe de cada item, como no Console. */
function detalheItem(d: DocumentoCobranca, i: NonNullable<DocumentoCobranca["itens"]>[number]): string {
  if (i.tipo === "MENSALIDADE") return `${mesPorExtenso(d.competencia)}${d.pessoasIncluidas ? ` · até ${d.pessoasIncluidas} pessoas` : ""} · todas as áreas do Portal`;
  if (i.tipo === "PESSOA_A_MAIS") {
    return `${i.quantidade} × ${reais(i.valorUnitarioCentavos)} · ${d.pessoasAtivas} pessoas ativas no dia da emissão (${dataBr(diaDe(d.emitidaEm))})${d.pessoasIncluidas ? `; o plano inclui ${d.pessoasIncluidas}` : ""}`;
  }
  return "";
}

function itens(pena: Pena, y: number, d: DocumentoCobranca, o: { titulo: string; sub?: string; total: string }): number {
  let yy = secao(pena, y, o.titulo, o.sub);
  pena.rotulo("Descrição", MARGEM, yy);
  yy = pena.rotulo("Valor", MARGEM + LARG, yy, { dir: true });
  pena.linha(MARGEM, yy - 1, MARGEM + LARG, yy - 1, VINHO, 0.8);
  yy -= 2;
  const lista = d.itens ?? [];
  lista.forEach((i, k) => {
    const topoItem = yy - 1.2 * MM;
    const valor = i.valorCentavos < 0 ? `- ${reais(-i.valorCentavos)}` : reais(i.valorCentavos);
    pena.texto(valor, MARGEM + LARG, topoItem, { t: 9, dir: true });
    let b = pena.texto(i.descricao, MARGEM, topoItem, { t: 9, largura: LARG - 35 * MM });
    const det = detalheItem(d, i);
    if (det) b = pena.texto(det, MARGEM, b, { t: 7.2, cor: SUAVE, largura: LARG - 35 * MM });
    if (i.tipo === "DESCONTO" && d.motivoDesconto) {
      const fim = pena.texto(`“${d.motivoDesconto}”`, MARGEM + 4 * MM, b - 1, { t: 8.4, f: "si", largura: LARG - 40 * MM });
      pena.pg.drawRectangle({ x: MARGEM, y: fim, width: 1.1, height: b - 1 - fim, color: AMBAR });
      b = fim;
    }
    yy = b - 1.2 * MM;
    if (k < lista.length - 1) pena.linha(MARGEM, yy, MARGEM + LARG, yy, FIO, 0.5);
  });
  pena.linha(MARGEM, yy, MARGEM + LARG, yy, VINHO, 0.6);
  pena.texto(o.total, MARGEM, yy - 2 * MM, { t: 9, f: "b" });
  return pena.texto(reais(d.totalCentavos), MARGEM + LARG, yy - 1.5 * MM, { t: 14, f: "sb", dir: true }) - 4 * MM;
}

function caixaPix(pena: Pena, y: number, d: DocumentoCobranca, pix: string, validade: string, recebedor: Pedaco): number {
  const lado = 26 * MM, x = MARGEM + 4 * MM, xt = x + lado + 6 * MM, larg = MARGEM + LARG - 5 * MM - xt;
  let b = pena.texto("Pix · Banco Inter", xt, y - 3 * MM, { t: 11, f: "sb", cor: VINHO });
  b = pena.corrido([{ s: "No app do banco, leia o QR Code ou cole o código. Antes de confirmar, veja se aparecem " }, { ...recebedor, f: recebedor.marcador ? undefined : "b" },
    { s: " e " }, { s: reais(d.totalCentavos), f: "b" }, { s: "." }], xt, b - 1, larg, 8.2);
  b = pena.rotulo("Pix copia e cola", xt, b - 2 * MM);
  const linhas = quebrar(pix, pena.f.m, 7, larg - 6);
  const hCod = linhas.length * 7 * 1.35 + 5;
  pena.caixa(xt, b - 1, larg, hCod, { fundo: SAL });
  b = pena.texto(pix, xt + 3, b - 3.5, { t: 7, f: "m", largura: larg - 6 });
  b = pena.texto(`${validade} Pago por Pix, a fatura fica paga na hora.`, xt, b - 3, { t: 7.4, cor: SUAVE, largura: larg });
  const fim = Math.min(b, y - lado - 6 * MM) - 3 * MM;
  pena.qr(pix, x, y - 3 * MM, lado);
  pena.caixa(MARGEM, y, LARG, y - fim, { borda: FIO, esp: 0.8 });
  return fim - 2.5 * MM;
}

function caixaBoleto(pena: Pena, y: number, linha: string, barras: string | null, vencimento: string): number {
  const x = MARGEM + 5 * MM, larg = LARG - 10 * MM;
  let b = pena.texto("Boleto · Banco Inter (077)", x, y - 3 * MM, { t: 11, f: "sb", cor: VINHO });
  const yl = pena.rotulo("Linha digitável", x, b - 1.5 * MM);
  pena.texto(linha, x + 30 * MM, b - 1 * MM, { t: 10.5, f: "mb" });
  b = yl - 2 * MM;
  if (barras && /^\d{44}$/.test(barras)) {
    pena.barras(barras, x, b, 103 * MM, 12 * MM);
    b -= 12 * MM + 1.5 * MM;
  }
  b = pena.texto(`Vencimento ${dataBr(vencimento)}. Pago por boleto, a baixa leva até 1 dia útil. O boleto completo, do banco, vai junto no e-mail e fica no Portal.`,
    x, b, { t: 7.4, cor: SUAVE, largura: larg }) - 3 * MM;
  pena.caixa(MARGEM, y, LARG, y - b, { borda: FIO, esp: 0.8 });
  return b - 4 * MM;
}

function semCodigos(pena: Pena, y: number, d: DocumentoCobranca): number {
  const e = d.emissor, n = numeroDoc(d);
  const xL = MARGEM + 5 * MM, wL = LARG * 0.58, xR = MARGEM + LARG * 0.64, wR = LARG * 0.36 - 5 * MM;
  let b = pena.corrido([{ s: "Os códigos de pagamento ainda não saem nesta fatura.", f: "b" },
    { s: " Enquanto a cobrança pelo Banco Inter não está ligada, o pagamento é combinado direto com a equipe do T3jus:" }], xL, y - 4 * MM, wL, 8.6);
  const passos: Pedaco[][] = [
    [{ s: "Escreva para " }, contato(e), { s: " com o número da fatura, " }, { s: n, f: "b" }, { s: ". A equipe responde com os dados para pagar." }],
    [{ s: "Pague " }, { s: reais(d.totalCentavos), f: "b" }, { s: " até " }, { s: dataBr(d.vencimento), f: "b" }, { s: " e responda com o comprovante." }],
    [{ s: "A equipe registra o pagamento. O recibo chega no e-mail de cobrança e a fatura aparece como paga no Portal." }],
  ];
  passos.forEach((p, i) => {
    const topoP = b - 2 * MM;
    pena.pg.drawCircle({ x: xL + 2.2 * MM, y: topoP - 2.4 * MM, size: 2.2 * MM, borderColor: VINHO, borderWidth: 0.7 });
    pena.texto(String(i + 1), xL + 2.2 * MM - 1.7, topoP - 0.6 * MM, { t: 7 });
    b = pena.corrido(p, xL + 7 * MM, topoP, wL - 7 * MM, 8.6);
  });
  // A caixa "Fale com o T3jus": mede primeiro, pinta o fundo e escreve por cima.
  const yc = y - 4 * MM, wt = wR - 8 * MM, diga = `Diga: fatura ${n}, ${d.pagador.nome}, ${reais(d.totalCentavos)}.`;
  // O contato em destaque cabe numa linha: o marcador "a definir" diminui até caber.
  const tc = [9.5, 9, 8.5, 8, 7.5].find((t) => pena.largura(contato(e).s, t, e ? "b" : "i") + (e ? 0 : pena.largura("A DEFINIR", t * 0.72, "b") + 9) <= wt) ?? 7;
  const hc = 3 * MM + 6.2 * 1.5 + 1 + tc * 1.4 + 1 + medirLinhas(pena, diga, wt, 7.8) + 4 * MM;
  const fim = Math.min(b, yc - hc) - 4 * MM;
  pena.caixa(xR, yc, wR, hc, { fundo: SAL });
  let c = pena.rotulo("Fale com o T3jus", xR + 4 * MM, yc - 3 * MM);
  c = pena.corrido([{ ...contato(e), f: "b" }], xR + 4 * MM, c - 1, wt, tc);
  pena.texto(diga, xR + 4 * MM, c - 1, { t: 7.8, cor: SUAVE, largura: wt });
  pena.caixa(MARGEM, y, LARG, y - fim, { borda: VINHO, esp: 0.6, tracejada: true });
  return fim - 4 * MM;
}

const medirLinhas = (pena: Pena, s: string, largura: number, t: number) => quebrar(s, pena.f.r, t, largura).length * t * 1.35;

/** As três notas do pé: quando pagar, recibo, dúvidas. */
function notas(pena: Pena, y: number, d: DocumentoCobranca, comCodigos: boolean, validade2via: string | null): number {
  const e = d.emissor, w = (LARG - 8 * MM) / 3, t = 7.6;
  const paga = d.situacao === "PAGA", cancelada = d.situacao === "CANCELADA";
  const col: [string, Pedaco[]][] = [
    paga || cancelada
      ? ["Guarde este documento", [{ s: "Ele mostra o que foi cobrado e o que aconteceu com a fatura. Nada é apagado no T3jus." }]]
      : !comCodigos
        ? ["Quando pagar", [{ s: "Até o vencimento. A fatura fica paga quando a equipe do T3jus registra o pagamento, a partir do comprovante." }]]
        : validade2via
          ? ["Quando pagar", [{ s: `Até ${dataBr(validade2via)}, com os códigos desta 2ª via. Pix fica pago na hora; boleto, em até 1 dia útil.` }]]
          : ["Quando pagar", [{ s: "Até o vencimento. Venceu? Peça a 2ª via, com códigos novos e o mesmo valor, sem multa nem juros." }]],
    cancelada
      ? ["Pagou por engano?", [{ s: "Escreva para " }, contato(e), { s: " com o comprovante: o valor é devolvido." }]]
      : ["Recibo", [{ s: "O recibo chega no e-mail de cobrança assim que o pagamento é confirmado e fica no Portal, em Escritório › Plano e faturas." }]],
    ["Dúvidas", [{ s: "Escreva para " }, contato(e), { s: ". A fatura também está no Portal, em Escritório." }]],
  ];
  let fim = y;
  col.forEach(([tit, txt], i) => {
    const x = MARGEM + i * (w + 4 * MM);
    const b = pena.texto(tit, x, y, { t: 7.8, f: "b" });
    fim = Math.min(fim, pena.corrido(txt.map((p) => ({ ...p, cor: p.cor ?? SUAVE })), x, b, w, t));
  });
  return fim;
}

/** A fatura em PDF (uma página A4). */
export async function pdfDaFatura(d: DocumentoCobranca): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const n = numeroDoc(d);
  doc.setTitle(limpo(`Fatura ${n} do T3jus, ${d.pagador.nome}`));
  doc.setAuthor("T3jus");
  doc.setLanguage("pt-BR");
  const pg = doc.addPage([A4.w, A4.h]);
  const pena = new Pena(pg, await fontes(doc));
  const logo = await doc.embedPng(logoCompletoPng()), simbolo = await doc.embedPng(simboloPng());
  const e = d.emissor;
  const paga = d.situacao === "PAGA", cancelada = d.situacao === "CANCELADA", atraso = d.situacao === "EM_ATRASO";
  const c = d.codigos;
  const pix = c?.pixCopiaCola ?? null, linha = c?.linhaBoleto ?? null;
  const comCodigos = !!(pix || linha);
  const comEndereco = !!d.pagador.endereco;

  let y = timbre(pena, logo, e);
  const parcela = d.carne ? ` · parcela ${d.carne.parcela} de ${d.carne.de}` : "";
  y = topo(pena, y, {
    rotulo: "Fatura da assinatura do T3jus",
    titulo: "Fatura",
    selo: paga ? { texto: "Paga", cor: VINHO, cheio: true } : cancelada ? { texto: "Cancelada · não pague", cor: SUAVE }
      : atraso ? { texto: `Em atraso · ${d.atrasoDias} ${d.atrasoDias === 1 ? "dia" : "dias"}`, cor: URGENTE }
      : d.situacao === "VENCE_HOJE" ? { texto: "Vence hoje", cor: VINHO } : { texto: "A vencer", cor: VINHO },
    numero: [{ s: "Nº " }, { s: n, f: "b" }, { s: ` · competência ${mesPorExtenso(d.competencia)}${parcela}`, cor: SUAVE }],
    rotValor: paga ? "Total pago" : cancelada ? "Valor cancelado" : atraso ? "Total em aberto" : "Total a pagar",
    valor: reais(d.totalCentavos),
    riscado: cancelada,
    sobValor: paga ? [{ s: "Paga em " }, { s: dataBr(d.pagamento!.pagaEm), f: "b" }]
      : cancelada ? [{ s: "Nada a pagar" }]
      : [{ s: atraso ? "Venceu em " : "Vence em " }, { s: dataBr(d.vencimento), f: "b" }],
  });

  // A faixa do que aconteceu com a fatura.
  if (atraso) {
    const outra = d.outrasAbertas[0];
    y = faixa(pena, y, URGENTE, [
      { s: `Esta fatura venceu em ${dataBr(d.vencimento)}, há ${d.atrasoDias} ${d.atrasoDias === 1 ? "dia" : "dias"}.`, f: "b" },
      { s: " Se já pagou, desconsidere e mande o comprovante para " }, contato(e), { s: "." },
      ...(outra ? [{ s: ` A fatura de ${mesPorExtenso(outra.competencia)} (${reais(outra.totalCentavos)}, venceu em ${dataBr(outra.vencimento)}) também está em aberto e tem o próprio documento.` }] : []),
    ]);
  } else if (paga) {
    const p = d.pagamento!;
    const como = p.baixa === "MANUAL" ? `por ${FORMA_PAGA[p.forma] ?? p.forma} fora da cobrança` : `por ${FORMA_PAGA[p.forma] ?? p.forma}, pela cobrança do Banco Inter`;
    y = faixa(pena, y, VINHO, [
      { s: `Fatura paga em ${dataBr(p.pagaEm)}, ${como}.`, f: "b" },
      { s: p.baixa === "MANUAL" ? " O pagamento foi registrado pela equipe do T3jus com o comprovante do escritório." : " O pagamento foi confirmado pelo Banco Inter." },
      { s: ` O recibo nº ${n} foi para o e-mail de cobrança e está no Portal.` },
    ]);
  } else if (cancelada) {
    y = faixa(pena, y, SUAVE, [
      { s: `Fatura cancelada em ${dataBr(diaDe(d.canceladaEm!))}. Não vale para pagamento: não pague.`, f: "b" },
      { s: " Nada foi cobrado. O Pix e o boleto dela deixaram de valer; se alguém pagar por engano, o valor é devolvido." },
    ]);
  } else if (d.carne) {
    y = faixa(pena, y, VINHO, [
      { s: `Parcela ${d.carne.parcela} de ${d.carne.de} do carnê ${d.carne.numero}.`, f: "b" },
      { s: comCodigos ? ` O Pix e o boleto abaixo são os mesmos da parcela ${d.carne.parcela} do carnê que o escritório recebeu em ${dataBr(diaDe(d.carne.geradoEm))}. Pague por um deles, uma vez só.`
        : ` Pague uma vez só: a parcela do carnê e esta fatura são a mesma cobrança.` },
    ]);
  }

  const forma: [string, string] = !comCodigos ? ["Boleto com Pix", "ainda não ligado"]
    : !comEndereco || !linha ? ["Só Pix", "falta o endereço para o boleto"] : ["Boleto com Pix", "Banco Inter"];
  y = dados(pena, y, d, paga || cancelada ? ["Boleto com Pix", "Banco Inter"] : forma);
  y = itens(pena, y, d, { titulo: "Itens da fatura", sub: "Em reais, com os centavos exatos.", total: "Total" });

  // Como pagar (ou o que aconteceu).
  if (paga) {
    const p = d.pagamento!;
    y = secao(pena, y, "Pagamento");
    const yTopo = y, w = LARG * 0.22;
    const col = (i: number, rot: string, val: string, sub: string) => {
      const b = pena.rotulo(rot, MARGEM + i * w, y);
      return pena.texto(sub, MARGEM + i * w, pena.texto(val, MARGEM + i * w, b - 0.5, { t: 9.2, f: "b" }), { t: 7.4, cor: SUAVE });
    };
    col(0, "Pago em", dataBr(p.pagaEm), "");
    col(1, "Forma", p.baixa === "MANUAL" ? `${FORMA_PAGA[p.forma] ?? p.forma} fora da cobrança` : FORMA_PAGA[p.forma] ?? p.forma,
      p.baixa === "MANUAL" ? "registrado à mão" : "baixa automática");
    y = Math.min(col(2, "Recibo", `nº ${n}`, "no Portal e no e-mail"), yTopo - 14 * MM) - 4 * MM;
    carimbo(pena, yTopo + 3 * MM, "PAGA", `em ${dataBr(p.pagaEm)} · os códigos não valem mais`, VINHO);
  } else if (cancelada) {
    y = secao(pena, y, "Como pagar");
    const yTopo = y;
    carimbo(pena, yTopo + 1 * MM, "CANCELADA", `em ${dataBr(diaDe(d.canceladaEm!))} · não pague`, SUAVE);
    y = pena.corrido([{ s: "Esta fatura foi cancelada. " }, { s: "Não há nada a pagar", f: "b" },
      { s: ", e por isso o Pix e o boleto não aparecem aqui. Se tiver dúvida, escreva para " }, contato(e), { s: "." }], MARGEM, y, LARG * 0.6, 8.6);
    y = Math.min(y, yTopo - 16 * MM) - 5 * MM;
  } else if (!comCodigos) {
    y = secao(pena, y, "Como pagar");
    y = semCodigos(pena, y, d);
  } else {
    // A 2ª via de verdade (códigos novos que valem 7 dias) depende do Inter ligado: até lá, os códigos são os da emissão.
    const recebedor: Pedaco = e ? { s: e.razaoSocial.toUpperCase() } : { s: "razão social do T3jus", marcador: true };
    const soPix = !linha || !comEndereco;
    y = secao(pena, y, "Como pagar", soPix ? "Esta fatura saiu só com Pix." : "Boleto com Pix do Banco Inter: é uma cobrança só. Pague por um dos dois.");
    if (pix) y = caixaPix(pena, y, d, pix, `Vale até o vencimento, ${dataBr(d.vencimento)}.`, recebedor);
    if (soPix) {
      y = faixa(pena, y, AMBAR, [
        { s: "O boleto não saiu porque falta o endereço de cobrança do escritório,", f: "b" },
        { s: " que o banco exige para registrar o boleto. Pague pelo Pix acima. Se preferir boleto, mande o endereço completo, com CEP, para " }, contato(e),
        { s: ": a equipe atualiza e manda a fatura de novo, com o boleto." },
      ]);
    } else if (linha) {
      y = caixaBoleto(pena, y, linha, c?.codigoBarras ?? null, d.vencimento);
    }
  }
  notas(pena, y - 1 * MM, d, comCodigos, null);
  pe(pena, simbolo, [{ s: `Fatura nº ${n} · emitida em ${dataBr(diaDe(d.emitidaEm))} · enviada por ` }, remetente(e)]);
  return await doc.save();
}

/** O carimbo decorativo (a mesma informação está na faixa em texto). */
function carimbo(pena: Pena, y: number, titulo: string, sub: string, cor: Cor) {
  const w = 58 * MM, h = 16 * MM, x = MARGEM + LARG - w - 4 * MM;
  pena.caixa(x, y, w, h, { borda: cor, esp: 1.4 });
  pena.texto(titulo, x + w / 2 - pena.largura(titulo, 15, "b") / 2, y - 2.5 * MM, { t: 15, f: "b", cor });
  pena.texto(sub, x + w / 2 - pena.largura(sub, 6.6) / 2, y - 10 * MM, { t: 6.6, cor });
}

/** O recibo do pagamento de uma fatura paga (uma página A4). */
export async function pdfDoReciboDaFatura(d: DocumentoCobranca): Promise<Uint8Array> {
  if (d.situacao !== "PAGA" || !d.pagamento) throw new Error("O recibo só sai de fatura paga");
  const doc = await PDFDocument.create();
  const n = numeroDoc(d), p = d.pagamento, e = d.emissor;
  doc.setTitle(limpo(`Recibo ${n} do T3jus, ${d.pagador.nome}`));
  doc.setAuthor("T3jus");
  doc.setLanguage("pt-BR");
  const pg = doc.addPage([A4.w, A4.h]);
  const pena = new Pena(pg, await fontes(doc));
  const logo = await doc.embedPng(logoCompletoPng()), simbolo = await doc.embedPng(simboloPng());
  const forma = FORMA_PAGA[p.forma] ?? p.forma;
  const manual = p.baixa === "MANUAL";
  const formaTxt = manual ? `${forma} fora da cobrança` : forma;

  let y = timbre(pena, logo, e);
  y = topo(pena, y, {
    rotulo: "Recibo de pagamento da assinatura", titulo: "Recibo", selo: null,
    numero: [{ s: "Nº " }, { s: n, f: "b" }, { s: " · o mesmo número da fatura", cor: SUAVE }],
    rotValor: "Valor recebido", valor: reais(d.totalCentavos),
    sobValor: [{ s: "Pago em " }, { s: dataBr(p.pagaEm), f: "b" }],
  });
  const cnpj = d.pagador.cnpj ? `, CNPJ ${cnpjLegivel(d.pagador.cnpj)}` : "";
  const ref: Pedaco[] = d.carne
    ? [{ s: "à " }, { s: `parcela ${d.carne.parcela} de ${d.carne.de} do carnê ${d.carne.numero}`, f: "sb" }, { s: ` da assinatura do T3jus (fatura nº ${n}), ` }]
    : [{ s: "à " }, { s: `fatura nº ${n}`, f: "sb" }, { s: " da assinatura do T3jus, " }];
  y = pena.corrido([
    { s: "Recebemos de ", f: "sr" }, { s: d.pagador.nome, f: "sb" }, { s: `${cnpj}, a quantia de `, f: "sr" }, { s: reais(d.totalCentavos), f: "sb" },
    { s: " (", f: "sr" }, { s: valorPorExtenso(d.totalCentavos), f: "si" }, { s: "), referente ", f: "sr" }, ...ref.map((r) => ({ ...r, f: r.f ?? "sr" as const })),
    { s: `plano ${d.plano}, competência `, f: "sr" }, { s: mesPorExtenso(d.competencia), f: "sb" }, { s: ", paga em ", f: "sr" }, { s: dataBr(p.pagaEm), f: "sb" },
    { s: " por ", f: "sr" }, { s: formaTxt, f: "sb" }, { s: ". Damos quitação desse valor.", f: "sr" },
  ], MARGEM, y - 2 * MM, LARG, 12, { alto: 1.5, justificar: true }) - 7 * MM;

  y = itens(pena, y, d, { titulo: "Discriminação", total: "Total recebido" });
  y = secao(pena, y, "Pagamento");
  const alto = 21 * MM, w = (LARG - 8 * MM) / 4;
  pena.caixa(MARGEM, y, LARG, alto, { fundo: SAL });
  const col = (i: number, rot: string, val: string, sub: string) => {
    const x = MARGEM + 4 * MM + i * w;
    const b = pena.rotulo(rot, x, y - 4 * MM);
    pena.texto(sub, x, pena.texto(val, x, b - 0.5, { t: 9, f: "b", largura: w - 3 * MM }), { t: 7.2, cor: SUAVE, largura: w - 3 * MM });
  };
  col(0, "Escritório", d.pagador.nome, d.pagador.cnpj ? `CNPJ ${cnpjLegivel(d.pagador.cnpj)}` : "");
  col(1, "Fatura", `nº ${n}`, d.carne ? `parcela ${d.carne.parcela} de ${d.carne.de} do carnê ${d.carne.numero}` : `competência ${mesPorExtenso(d.competencia)}`);
  col(2, "Data do pagamento", dataBr(p.pagaEm), `vencia em ${dataBr(d.vencimento)}`);
  col(3, "Forma", formaTxt, manual ? "registrado à mão pela equipe do T3jus" : `${forma} da fatura, Banco Inter; baixa automática`);

  // O fim: o local e a data à esquerda, quem emite à direita.
  const emitido = p.registradoEm ? diaDe(p.registradoEm) : p.pagaEm;
  const yFim = 62 * MM, xE = MARGEM + LARG - 86 * MM, wE = 86 * MM;
  pena.corrido([e ? { s: e.cidade, f: "sr" } : { s: "cidade do T3jus", marcador: true }, { s: `, ${dataBr(emitido)}.`, f: "sr" }], MARGEM, yFim - 14 * MM, LARG - wE - 10 * MM, 12);
  pena.texto("Este recibo é o comprovante do pagamento e dá quitação somente da fatura e do valor descritos acima. As outras faturas da assinatura seguem como combinado.",
    MARGEM, yFim - 22 * MM, { t: 7.6, cor: SUAVE, largura: LARG - wE - 12 * MM });
  pena.linha(xE, yFim, xE + wE, yFim, VINHO, 0.9);
  let b = pena.corrido([{ ...dadoEmissor(e, "razaoSocial", "razão social do T3jus"), f: "b" }], xE + 4 * MM, yFim - 2 * MM, wE - 8 * MM, 8.4);
  b = pena.corrido([{ s: "CNPJ ", cor: SUAVE }, dadoEmissor(e, "cnpj", "do T3jus")], xE + 4 * MM, b, wE - 8 * MM, 8.2);
  b = pena.texto("Emitido eletronicamente pelo T3jus; dispensa assinatura.", xE + 4 * MM, b, { t: 8, cor: SUAVE, largura: wE - 8 * MM });
  const reg = manual && p.registradoPor && p.registradoEm
    ? `Pagamento registrado à mão por ${p.registradoPor}, da equipe do T3jus, em ${dataBr(diaDe(p.registradoEm))}, às ${horaDe(p.registradoEm)}, a partir do comprovante enviado pelo escritório.`
    : `Pagamento confirmado pelo Banco Inter e registrado pelo sistema em ${dataBr(p.registradoEm ? diaDe(p.registradoEm) : p.pagaEm)}.`;
  const hReg = medirLinhas(pena, reg, wE - 16 * MM, 7.2) + 4 * MM;
  pena.caixa(xE + 4 * MM, b - 2 * MM, wE - 8 * MM, hReg, { fundo: SAL });
  pena.pg.drawRectangle({ x: xE + 4 * MM, y: b - 2 * MM - hReg, width: 0.8 * MM, height: hReg, color: AMBAR });
  pena.texto(reg, xE + 8 * MM, b - 4 * MM, { t: 7.2, cor: SUAVE, largura: wE - 16 * MM });

  pe(pena, simbolo, [{ s: `Recibo nº ${n} · emitido pelo T3jus em ${dataBr(emitido)} · enviado ao e-mail de cobrança por ` }, remetente(e), { s: " · 1 página" }]);
  return await doc.save();
}

/** Nome do arquivo para baixar: "fatura-2026-0187.pdf". */
export const arquivoDoc = (d: Pick<DocumentoCobranca, "competencia" | "numero">, recibo: boolean) =>
  `${recibo ? "recibo" : "fatura"}-${numeroDoc(d).replace("/", "-")}.pdf`;

/**
 * Monta o PDF, guarda em <escritório>/cobranca/ (troca o anterior: o documento mostra a fatura
 * como está hoje) e devolve o link de leitura, que vale pouco. Mesmo caminho do recibo do Portal.
 */
export async function baixarDocumentoCobranca(arquivos: Arquivos, escritorioId: string, d: DocumentoCobranca, recibo: boolean) {
  let pdf: Uint8Array;
  try {
    pdf = recibo ? await pdfDoReciboDaFatura(d) : await pdfDaFatura(d);
  } catch {
    throw new ErroDominio("VALIDATION_ERROR", { motivo: recibo ? "RECIBO_PDF_INDISPONIVEL" : "FATURA_PDF_INDISPONIVEL" });
  }
  const nome = arquivoDoc(d, recibo);
  const caminho = `${escritorioId}/cobranca/${nome}`;
  await arquivos.enviar(caminho, pdf, "application/pdf", true);
  return { url: await arquivos.enderecoDeLeitura(caminho, VALIDADE_LEITURA_S, nome), nome, tamanho: pdf.length };
}
