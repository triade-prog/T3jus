// O PDF do carnê no servidor (F3.79, FI-23), para baixar e para mandar pelo WhatsApp. Segue a
// folha A4 aprovada em docs/design/aprovadas/portal-carne (carne-a4): 3 faixas por folha, cada uma
// com o canhoto (47 mm) à esquerda e a via do cliente à direita, linhas pontilhadas de corte, a
// capa na primeira faixa e, no formato "1 por folha", a via grande com o canhoto embaixo. O texto
// é o mesmo da página de imprimir (packages/ui/src/portal/Carne.tsx). Tudo em tinta e vinho; o
// âmbar só no filete. O QR é preto no branco, do mesmo Pix copia e cola.

import { PDFDocument, type PDFFont, type PDFPage, rgb, StandardFonts } from "pdf-lib";
import qrcode from "qrcode-generator";
import { chavePixParaLer, dataBr, reais, telefoneBr, TIPOS_CHAVE_PIX, type CarneParaImprimir } from "@t3jus/domain";

type Impressa = CarneParaImprimir["parcelas"][number];

const MM = 72 / 25.4;
const A4 = { w: 210 * MM, h: 297 * MM };
const MARGEM = 10 * MM;
const FAIXA = (277 / 3) * MM;
const CANHOTO = 47 * MM;
const VINHO = rgb(0x69 / 255, 0x27 / 255, 0x46 / 255);
const TINTA = rgb(0x2a / 255, 0x1a / 255, 0x22 / 255);
const SUAVE = rgb(0x5e / 255, 0x4a / 255, 0x54 / 255);
const AMBAR = rgb(0xdd / 255, 0x97 / 255, 0x60 / 255);
const CORTE = rgb(0.6, 0.6, 0.6);
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** A fonte padrão do PDF só tem o alfabeto latino (WinAnsi): o resto sai sem o caractere. */
const WINANSI = /[^\x20-\x7e\xa0-\xff‘’“”–—•…€]/g;
const limpo = (s: string) => s.replace(/\s+/g, " ").replace(WINANSI, "");
const mesRef = (v: string) => { const m = MESES[Number(v.slice(5, 7)) - 1] ?? ""; return `${m.charAt(0).toUpperCase()}${m.slice(1)} de ${v.slice(0, 4)}`; };
const diaCurto = (v: string) => `${v.slice(8, 10)}/${v.slice(5, 7)}`;
const cnpjLegivel = (c: string) => c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
const diaBrasilia = (em: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(em));

interface Fontes { r: PDFFont; b: PDFFont; s: PDFFont; m: PDFFont }

class Pena {
  constructor(private p: PDFPage, readonly f: Fontes) {}
  /** Escreve a partir do topo (y é a linha de cima), quebrando em `largura`. Devolve o y de baixo. */
  texto(s: string, x: number, y: number, o: { t?: number; f?: keyof Fontes; cor?: ReturnType<typeof rgb>; largura?: number; linhas?: number; dir?: boolean } = {}): number {
    const t = o.t ?? 7, f = this.f[o.f ?? "r"], cor = o.cor ?? TINTA, alto = t * 1.25;
    const linhas = o.largura ? quebrar(limpo(s), f, t, o.largura).slice(0, o.linhas ?? 99) : [limpo(s)];
    let yy = y;
    for (const l of linhas) {
      yy -= alto;
      const xx = o.dir ? x - f.widthOfTextAtSize(l, t) : x;
      this.p.drawText(l, { x: xx, y: yy + (alto - t) / 2 + t * 0.2, size: t, font: f, color: cor });
    }
    return yy;
  }
  linha(x1: number, y1: number, x2: number, y2: number, o: { cor?: ReturnType<typeof rgb>; esp?: number; tracejada?: boolean } = {}) {
    this.p.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: o.esp ?? 0.5, color: o.cor ?? CORTE,
      dashArray: o.tracejada ? [2.5, 2] : undefined });
  }
  caixa(x: number, y: number, w: number, h: number, cor: ReturnType<typeof rgb>, fundo = false) {
    this.p.drawRectangle({ x, y: y - h, width: w, height: h, borderColor: fundo ? undefined : cor, borderWidth: fundo ? 0 : 0.5, color: fundo ? cor : undefined });
  }
  qr(texto: string, x: number, y: number, lado: number) {
    const q = qrcode(0, "M");
    q.addData(texto);
    q.make();
    const n = q.getModuleCount(), m = lado / (n + 2);
    this.p.drawRectangle({ x, y: y - lado, width: lado, height: lado, color: rgb(1, 1, 1) });
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (q.isDark(r, c)) this.p.drawRectangle({ x: x + (c + 1) * m, y: y - (r + 2) * m, width: m + 0.05, height: m + 0.05, color: rgb(0, 0, 0) });
    }
  }
}

function quebrar(s: string, f: PDFFont, t: number, largura: number): string[] {
  const out: string[] = [];
  let atual = "";
  for (const palavra of s.split(" ")) {
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

const instrucoes = (c: CarneParaImprimir) => c.instrucoes ?? "Combine com o escritório a forma de pagamento.";
const whats = (c: CarneParaImprimir) => (c.escritorio.whatsapp ? telefoneBr(c.escritorio.whatsapp) : null);

function marca(pe: Pena, c: CarneParaImprimir, x: number, y: number, largura: number, t = 10): number {
  let yy = pe.texto(c.escritorio.nome, x, y, { t, f: "b", cor: VINHO, largura, linhas: 2 });
  if (c.escritorio.cnpj) yy = pe.texto(`CNPJ ${cnpjLegivel(c.escritorio.cnpj)}`, x, yy, { t: 6, cor: SUAVE });
  pe.linha(x, yy - 2, x + 24 * MM, yy - 2, { cor: AMBAR, esp: 1.2 });
  return yy - 5;
}

function rodape(pe: Pena, c: CarneParaImprimir, x: number, y: number, largura: number) {
  const w = whats(c);
  const t = `Pagando depois do vencimento, fale antes com o escritório: multa e juros seguem o contrato. ${w ? `Pagou? O recibo chega pelo WhatsApp do escritório, ${w}.` : "Pagou? Guarde o comprovante: o escritório dá o recibo."}`;
  pe.texto(t, x, y, { t: 5.6, cor: SUAVE, largura: largura - 22 * MM, linhas: 2 });
  pe.texto("Modelo T3jus", x + largura, y, { t: 5.6, cor: VINHO, dir: true });
}

function canhoto(pe: Pena, c: CarneParaImprimir, p: Impressa, x: number, y: number, largura: number) {
  let yy = pe.texto("CANHOTO · FICA COM O ESCRITÓRIO", x, y, { t: 5.2, cor: SUAVE });
  yy = pe.texto(c.escritorio.nome, x, yy - 1, { t: 7, f: "b", cor: VINHO, largura, linhas: 2 });
  yy = pe.texto(`Parcela ${p.ordem} de ${p.total}`, x, yy - 2, { t: 9, f: "b" });
  yy = pe.texto(mesRef(p.vencimento), x, yy, { t: 6, cor: SUAVE });
  const dado = (rot: string, val: string, mono = false) => {
    yy = pe.texto(rot, x, yy - 1.5, { t: 5.2, cor: SUAVE });
    yy = pe.texto(val, x, yy, { t: 6.6, f: mono ? "m" : "b", largura, linhas: 2 });
  };
  dado("Cliente", c.cliente.nome);
  dado("Contrato", c.contrato.numero);
  dado("Vencimento", `${dataBr(p.vencimento)}${p.semValor ? " (vencida)" : ""}`);
  dado("Valor", `${reais(p.valor)}${p.semValor ? " + encargos" : ""}`);
  dado("Identificador", p.txid, true);
  yy -= 6;
  for (const r of ["Pago em ____/____/______", "Forma ______________", "Visto ______________"]) yy = pe.texto(r, x, yy - 1, { t: 6, cor: SUAVE });
}

/** A via do cliente. Devolve o y de baixo do que escreveu (para a via grande continuar). */
function via(pe: Pena, c: CarneParaImprimir, p: Impressa, x: number, y: number, largura: number, grande: boolean): number {
  const esc = grande ? 1.25 : 1;
  const comPix = !!(c.pix && p.pix);
  // Cabeçalho: o escritório à esquerda, a parcela à direita.
  marca(pe, c, x, y, largura - 38 * MM, 10 * esc);
  pe.texto("VIA DO CLIENTE · PARCELA", x + largura, y, { t: 5.2 * esc, cor: SUAVE, dir: true });
  pe.texto(`${p.ordem} de ${p.total}`, x + largura, y - 7 * esc, { t: 13 * esc, f: "b", cor: VINHO, dir: true });
  if (p.semValor) {
    const n = pe.f.b.widthOfTextAtSize(limpo(`${p.ordem} de ${p.total}`), 13 * esc);
    pe.texto(`Vencida em ${diaCurto(p.vencimento)}`, x + largura - n - 3 * MM, y - 10 * esc, { t: 6.5 * esc, f: "b", dir: true });
  }
  let yy = y - 24 * esc;
  // Dados à esquerda, Pix à direita.
  const colDados = comPix ? largura * 0.52 : largura * 0.55;
  const doc = c.cliente.documento ? ` · ${c.cliente.tipo === "PJ" ? "CNPJ" : "CPF"} ${c.cliente.documento}` : "";
  const dado = (rot: string, val: string, xx: number, yy0: number, w: number, o: { t?: number; f?: keyof Fontes } = {}) => {
    const a = pe.texto(rot, xx, yy0, { t: 5.2 * esc, cor: SUAVE });
    return pe.texto(val, xx, a, { t: (o.t ?? 7) * esc, f: o.f ?? "b", largura: w, linhas: 2 });
  };
  let yd = dado("Cliente", `${c.cliente.nome}${doc}`, x, yy, colDados);
  yd = dado("Contrato", `${c.contrato.numero} · ${c.contrato.objeto}`, x, yd - 1, colDados);
  const meia = colDados / 2 - 2;
  const y1 = dado("Mês de referência", mesRef(p.vencimento), x, yd - 1, meia);
  const y2 = dado("Vencimento", dataBr(p.vencimento), x + meia + 4, yd - 1, meia);
  yd = Math.min(y1, y2);
  yd = dado("Valor", reais(p.valor), x, yd - 1, colDados, { t: 12, f: "b" });
  if (p.semValor) yd = dado("Encargos", "+ multa e juros, valor a combinar com o escritório", x, yd - 1, colDados, { t: 6.2, f: "r" });
  const xp = x + colDados + 4 * MM, wp = largura - colDados - 4 * MM;
  let yp = yy;
  if (comPix) {
    const lado = (grande ? 38 : 25) * MM;
    pe.qr(p.pix!, xp, yy, lado);
    const xt = xp + lado + 3 * MM, wt = wp - lado - 3 * MM;
    let a = pe.texto("Pague com Pix", xt, yy, { t: 7.5 * esc, f: "b", cor: VINHO });
    a = pe.texto(`Chave (${TIPOS_CHAVE_PIX[c.pix!.tipo]})`, xt, a - 1, { t: 5.2 * esc, cor: SUAVE });
    a = pe.texto(chavePixParaLer(c.pix!.tipo, c.pix!.chave), xt, a, { t: 6.4 * esc, f: "b", largura: wt, linhas: 2 });
    a = pe.texto("Recebedor", xt, a - 1, { t: 5.2 * esc, cor: SUAVE });
    pe.texto(c.pix!.recebedor, xt, a, { t: 6.4 * esc, f: "b", largura: wt, linhas: 2 });
    yp = yy - lado;
  } else {
    const a = pe.texto("Como pagar", xp, yy, { t: 7.5 * esc, f: "b", cor: VINHO });
    yp = pe.texto(instrucoes(c), xp, a - 1, { t: 6.2 * esc, largura: wp, linhas: 7 });
  }
  yy = Math.min(yd, yp) - 2 * MM;
  if (comPix) {
    pe.texto("Pix copia e cola", x, yy, { t: 5.2 * esc, cor: SUAVE });
    yy = pe.texto(p.pix!, x + 18 * MM, yy, { t: 5 * esc, f: "m", largura: largura - 18 * MM, linhas: 3 });
    yy = pe.texto(`Identificador da parcela: ${p.txid}. ${p.semValor ? "O Pix abre sem valor: digite o valor combinado com o escritório." : `Confira no app: ${c.pix!.recebedor}, ${reais(p.valor)}.`}`,
      x, yy - 1, { t: 5.8 * esc, largura });
  } else {
    yy = pe.texto(`Identificador da parcela: ${p.txid}. Escreva-o na descrição do pagamento.`, x, yy, { t: 5.8 * esc, largura });
  }
  if (grande) {
    yy -= 3 * MM;
    yy = pe.texto(`Como pagar${comPix ? " com Pix" : ""}`, x, yy, { t: 9, f: "b", cor: VINHO });
    if (comPix) {
      ["Abra o app do seu banco e escolha Pix: ler QR Code, ou Pix copia e cola.", "Leia o QR ou copie o código da parcela.",
        `Antes de confirmar, veja se aparece ${c.pix!.recebedor} e o valor.`].forEach((s, i) => { yy = pe.texto(`${i + 1}. ${s}`, x, yy - 1, { t: 8, largura }); });
    } else yy = pe.texto(instrucoes(c), x, yy - 1, { t: 8, largura });
    const w = whats(c);
    yy = pe.texto(`Depois de pagar, ${w ? `o recibo chega pelo WhatsApp do escritório. Dúvidas? Escreva para ${w}.` : "o escritório dá o recibo."}`, x, yy - 3, { t: 8, f: "b", largura });
  }
  return yy;
}

function capa(pe: Pena, c: CarneParaImprimir, x: number, y: number, largura: number) {
  const col = (largura - 8 * MM) / 3;
  // 1ª coluna: o escritório, o título e o cliente.
  let a = marca(pe, c, x, y, col);
  a = pe.texto("Carnê de honorários", x, a - 2, { t: 13, f: "b", cor: VINHO, largura: col, linhas: 2 });
  const local = [c.escritorio.endereco, [c.escritorio.cidade, c.escritorio.uf].filter(Boolean).join("/")].filter(Boolean).join(" · ");
  const dado = (rot: string, val: string, f: keyof Fontes = "b") => {
    a = pe.texto(rot, x, a - 2, { t: 5.2, cor: SUAVE });
    a = pe.texto(val, x, a, { t: 7, f, largura: col, linhas: 3 });
  };
  dado("Cliente", `${c.cliente.nome}${c.cliente.documento ? ` · ${c.cliente.tipo === "PJ" ? "CNPJ" : "CPF"} ${c.cliente.documento}` : ""}`);
  dado("Contrato", `${c.contrato.numero} · ${c.contrato.objeto}`);
  if (local) dado("Escritório", local, "r");
  // 2ª coluna: as parcelas e o total.
  const x2 = x + col + 4 * MM;
  let b = pe.texto("As parcelas deste carnê", x2, y, { t: 8, f: "b", cor: VINHO });
  const ws = [col * 0.17, col * 0.33, col * 0.27, col * 0.23];
  const linha = (vals: string[], f: keyof Fontes, t: number) => {
    let xx = x2;
    vals.forEach((v, i) => { pe.texto(v, i === 3 ? xx + ws[3]! : xx, b, { t, f, dir: i === 3 }); xx += ws[i]!; });
    b -= t * 1.35;
  };
  b -= 2;
  linha(["Parcela", "Referência", "Vence", "Valor"], "r", 5.4);
  pe.linha(x2, b + 2, x2 + col, b + 2);
  const cabe = Math.max(1, Math.floor((b - (y - FAIXA + 26 * MM)) / (6.4 * 1.35)));
  const ps = c.parcelas.length > cabe ? c.parcelas.slice(0, cabe - 1) : c.parcelas;
  for (const p of ps) linha([`${p.ordem} de ${p.total}`, mesRef(p.vencimento), dataBr(p.vencimento), reais(p.valor)], "r", 6.4);
  if (ps.length < c.parcelas.length) linha([`+ ${c.parcelas.length - ps.length} parcelas`, "", "", ""], "s", 6.4);
  pe.linha(x2, b + 2, x2 + col, b + 2);
  linha(["Total deste carnê", "", "", reais(c.parcelas.reduce((s, p) => s + p.valor, 0))], "b", 6.8);
  pe.texto(`Gerado em ${dataBr(diaBrasilia(c.geradoEm))}. As parcelas já pagas não entram.${c.pix ? " Cada parcela tem o seu Pix; pague uma de cada vez." : ""}`,
    x2, b - 2, { t: 5.8, cor: SUAVE, largura: col, linhas: 3 });
  // 3ª coluna: como pagar e o recibo.
  const x3 = x2 + col + 4 * MM;
  let d = pe.texto(c.pix ? "Como pagar com Pix" : "Como pagar", x3, y, { t: 8, f: "b", cor: VINHO });
  if (c.pix) {
    ["Abra o app do seu banco e escolha Pix: ler QR Code, ou Pix copia e cola.", "Leia o QR ou copie o código da parcela.",
      `Antes de confirmar, veja se aparece ${c.pix.recebedor} e o valor.`].forEach((s, i) => { d = pe.texto(`${i + 1}. ${s}`, x3, d - 1, { t: 6.4, largura: col, linhas: 3 }); });
    if (c.instrucoes) d = pe.texto(c.instrucoes, x3, d - 2, { t: 5.8, largura: col, linhas: 4 });
  } else d = pe.texto(instrucoes(c), x3, d - 1, { t: 6.4, largura: col, linhas: 8 });
  const w = whats(c);
  const recibo = `Depois de pagar, ${w ? `o recibo chega pelo WhatsApp do escritório. Dúvidas? Escreva para ${w}.` : "o escritório dá o recibo."}`;
  const linhasRecibo = quebrar(limpo(recibo), pe.f.b, 6.4, col - 4 * MM).length;
  const hCaixa = linhasRecibo * 8 + 4 * MM;
  pe.caixa(x3, d - 3, col, hCaixa, rgb(0xf6 / 255, 0xe6 / 255, 0xd8 / 255), true);
  d = pe.texto(recibo, x3 + 2 * MM, d - 3 - 2 * MM, { t: 6.4, f: "b", largura: col - 4 * MM }) - 2 * MM;
  pe.texto("Pagando depois do vencimento, multa e juros seguem o contrato. Fale antes com o escritório.", x3, d - 2, { t: 5.8, cor: SUAVE, largura: col, linhas: 3 });
}

/** As folhas do carnê num PDF (A4). */
export async function pdfDoCarne(c: CarneParaImprimir): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(limpo(`Carnê de ${c.cliente.nome} · ${c.contrato.numero}`));
  doc.setAuthor(limpo(c.escritorio.nome));
  doc.setProducer("T3jus");
  doc.setCreator("T3jus");
  const f: Fontes = {
    r: await doc.embedFont(StandardFonts.Helvetica), b: await doc.embedFont(StandardFonts.HelveticaBold),
    s: await doc.embedFont(StandardFonts.HelveticaOblique), m: await doc.embedFont(StandardFonts.Courier),
  };
  const largura = A4.w - 2 * MARGEM;
  if (c.formato === "UM") {
    for (const p of c.parcelas) {
      const pg = doc.addPage([A4.w, A4.h]);
      const pe = new Pena(pg, f);
      const topo = A4.h - MARGEM;
      via(pe, c, p, MARGEM + 4 * MM, topo - 4 * MM, largura - 8 * MM, true);
      rodape(pe, c, MARGEM + 4 * MM, MARGEM + 78 * MM, largura - 8 * MM);
      const yc = MARGEM + 68 * MM;
      pe.linha(MARGEM, yc, MARGEM + largura, yc, { tracejada: true });
      pe.texto("corte aqui", MARGEM + largura, yc + 8, { t: 5, cor: CORTE, dir: true });
      canhoto(pe, c, p, MARGEM + 4 * MM, yc - 4 * MM, 80 * MM);
    }
    return await doc.save();
  }
  const itens: (Impressa | "capa")[] = [...(c.capa ? (["capa"] as const) : []), ...c.parcelas];
  for (let i = 0; i < itens.length; i += 3) {
    const pg = doc.addPage([A4.w, A4.h]);
    const pe = new Pena(pg, f);
    itens.slice(i, i + 3).forEach((x, k) => {
      const topo = A4.h - MARGEM - k * FAIXA;
      if (k === 0) pe.linha(MARGEM, topo, MARGEM + largura, topo, { tracejada: true });
      pe.linha(MARGEM, topo - FAIXA, MARGEM + largura, topo - FAIXA, { tracejada: true });
      if (x === "capa") {
        capa(pe, c, MARGEM + 3 * MM, topo - 4 * MM, largura - 6 * MM);
        return;
      }
      canhoto(pe, c, x, MARGEM + 3 * MM, topo - 4 * MM, CANHOTO - 6 * MM);
      pe.linha(MARGEM + CANHOTO, topo - 2 * MM, MARGEM + CANHOTO, topo - FAIXA + 2 * MM, { tracejada: true });
      const xv = MARGEM + CANHOTO + 4 * MM, wv = largura - CANHOTO - 7 * MM;
      via(pe, c, x, xv, topo - 4 * MM, wv, false);
      rodape(pe, c, xv, topo - FAIXA + 9 * MM, wv);
    });
  }
  return await doc.save();
}

/** O nome do arquivo: carne-helio-correa-C-2026-014.pdf. */
export function nomeDoPdfCarne(c: CarneParaImprimir): string {
  const partes = c.cliente.nome.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const nome = [partes[0], partes.length > 1 ? partes[partes.length - 1] : null].filter(Boolean).join("-");
  return `carne-${nome}-${c.contrato.numero}.pdf`;
}
