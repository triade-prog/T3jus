// O contrato, a procuração e a declaração em PDF (D23, CH-08), desenho aprovado em
// docs/design/aprovadas/portal-contrato-pdf. O PDF sai do .docx daquela versão, num leiaute
// simples em A4: o timbrado do cabeçalho (com o logo) em cada página, o texto com negrito,
// itálico, alinhamento e recuo, e no rodapé o contrato, a versão e o dia em que foi gerado
// (pergunta 4). Tabela, imagem no corpo, caixa de texto e colunas não são reproduzidas: o texto
// delas entra como parágrafo, e a tela avisa (`complexo`, pergunta 1).

import { PDFDocument, type PDFFont, type PDFImage, type PDFPage, StandardFonts } from "pdf-lib";
import { lerDocxParaPdf, type ParagrafoLido } from "@t3jus/domain";
import { A4, MM, SUAVE, TINTA, VINHO } from "./carne_pdf.ts";

// As margens do .docx padrão (criarDocx): 3 cm em cima e à esquerda, 2 cm embaixo e à direita.
const ESQ = 30 * MM, DIR = 20 * MM, TOPO = 30 * MM, BAIXO = 20 * MM;
// O cabeçalho começa onde o .docx diz (w:header): 10 mm no padrão novo (F3.146, decisão 15 de
// razao-social-sobras), 12,5 mm no de antes e na maioria dos modelos do Word.
const CAB_PADRAO = 12.5 * MM;
const LARGURA = A4.w - ESQ - DIR;

/** A fonte padrão do PDF só tem o alfabeto latino (WinAnsi): o resto sai sem o caractere. */
const WINANSI = /[^\x20-\x7e\xa0-\xff‘’“”–—•…€]/g;
const so = (s: string) => s.replace(/ /g, " ").replace(WINANSI, "");

interface Fontes { r: PDFFont; b: PDFFont; i: PDFFont; bi: PDFFont }

/**
 * A largura como o drawText desenha: letra por letra. O widthOfTextAtSize das fontes padrão
 * desconta o kerning (AT, TA, TE…), que o drawText não aplica; com ele as palavras se encostam.
 */
function larg(f: PDFFont, s: string, t: number): number {
  let w = 0;
  for (const ch of s) w += f.widthOfTextAtSize(ch, t);
  return w;
}
const fonteDe = (f: Fontes, negrito: boolean, italico: boolean) => (negrito ? (italico ? f.bi : f.b) : italico ? f.i : f.r);

interface Palavra { s: string; f: PDFFont; w: number; junto: boolean }

/** As linhas de um parágrafo, cada uma com as palavras e se é a última de um trecho (sem justificar). */
function linhasDe(p: ParagrafoLido, f: Fontes, t: number, largura: number): { palavras: Palavra[]; fim: boolean; recuo: number }[] {
  const saida: { palavras: Palavra[]; fim: boolean; recuo: number }[] = [];
  const esp = larg(f.r, " ", t);
  let linha: Palavra[] = [];
  let usado = 0;
  let recuo = p.recuo * MM;
  const soltar = (fim: boolean) => {
    saida.push({ palavras: linha, fim, recuo });
    linha = [];
    usado = 0;
    recuo = 0;
  };
  let junto = false;
  for (const pedaco of p.pedacos) {
    const fonte = fonteDe(f, pedaco.negrito, pedaco.italico);
    const trechos = pedaco.texto.replace(/\t/g, "    ").split("\n");
    trechos.forEach((trecho, k) => {
      if (k > 0) { soltar(true); junto = false; }
      for (const parte of trecho.split(/( +)/)) {
        if (!parte) continue;
        if (/^ +$/.test(parte)) { junto = false; continue; }
        const s = so(parte);
        if (!s) continue;
        let w = larg(fonte, s, t);
        // Palavra maior que a linha: quebra por letra.
        if (w > largura - recuo) {
          let resto = s;
          while (resto) {
            let n = resto.length;
            while (n > 1 && larg(fonte, resto.slice(0, n), t) > largura - recuo - usado) n--;
            const peca = resto.slice(0, n);
            linha.push({ s: peca, f: fonte, w: larg(fonte, peca, t), junto: false });
            resto = resto.slice(n);
            if (resto) soltar(false);
          }
          junto = true;
          continue;
        }
        const antes = linha.length && !junto ? esp : 0;
        if (linha.length && usado + antes + w > largura - recuo) {
          soltar(false);
          w = larg(fonte, s, t);
          linha.push({ s, f: fonte, w, junto: false });
          usado = w;
        } else {
          linha.push({ s, f: fonte, w, junto: linha.length > 0 && junto });
          usado += antes + w;
        }
        junto = true;
      }
    });
  }
  soltar(true);
  return saida;
}

function desenharLinha(pg: PDFPage, l: { palavras: Palavra[]; fim: boolean; recuo: number }, p: ParagrafoLido, x0: number, y: number, t: number, largura: number, esp: number, cor = TINTA) {
  const espacos = l.palavras.filter((w, i) => i > 0 && !w.junto).length;
  const natural = l.palavras.reduce((s, w, i) => s + w.w + (i > 0 && !w.junto ? esp : 0), 0);
  const livre = largura - l.recuo - natural;
  let x = x0 + l.recuo;
  let extra = 0;
  if (p.alinhamento === "centro") x += livre / 2;
  else if (p.alinhamento === "direita") x += livre;
  else if (p.alinhamento === "justificado" && !l.fim && espacos > 0) extra = livre / espacos;
  l.palavras.forEach((w, i) => {
    if (i > 0 && !w.junto) x += esp + extra;
    pg.drawText(w.s, { x, y, size: t, font: w.f, color: cor });
    x += w.w;
  });
}

export interface RodapePdf { contrato: string; versao: number; geradoEm: string }

const diaBr = (em: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(em));

/** O texto do rodapé (pergunta 4): "C-2026-033 · v2 · gerado em 21/11/2026". */
export function textoRodapePdf(r: RodapePdf): string {
  return `${r.contrato} · v${r.versao} · gerado em ${diaBr(r.geradoEm)}`;
}

/** Monta o PDF a partir do .docx. `complexo` diz se o modelo tem o que o leiaute simples não reproduz. */
export async function pdfDoDocx(docx: Uint8Array, rodape: RodapePdf): Promise<{ pdf: Uint8Array; complexo: boolean; fioMm: number | null; corpoMm: number }> {
  const lido = await lerDocxParaPdf(docx);
  const doc = await PDFDocument.create();
  doc.setTitle(so(`${rodape.contrato} · v${rodape.versao}`));
  doc.setProducer("T3jus");
  doc.setCreator("T3jus");
  const f: Fontes = {
    r: await doc.embedFont(StandardFonts.TimesRoman), b: await doc.embedFont(StandardFonts.TimesRomanBold),
    i: await doc.embedFont(StandardFonts.TimesRomanItalic), bi: await doc.embedFont(StandardFonts.TimesRomanBoldItalic),
  };
  const pe = await doc.embedFont(StandardFonts.Helvetica);
  let logo: PDFImage | null = null;
  if (lido.imagemCabecalho) {
    try {
      logo = lido.imagemCabecalho.tipo === "png" ? await doc.embedPng(lido.imagemCabecalho.bytes) : await doc.embedJpg(lido.imagemCabecalho.bytes);
    } catch {
      logo = null;
    }
  }

  // O cabeçalho de cada página: o logo no tamanho que o .docx dá (92 × 12 mm no padrão novo; sem a
  // medida, até 92 × 18 mm, como antes) e as linhas do timbrado, com o fio vinho.
  const cab = lido.cabecalhoMm !== null ? lido.cabecalhoMm * MM : CAB_PADRAO;
  const img = lido.imagemCabecalho;
  const cabecalho = (pg: PDFPage): number => {
    let y = A4.h - cab;
    if (!lido.cabecalho.length && !logo) return A4.h - TOPO;
    if (logo) {
      const esc = img?.larguraMm && img.alturaMm ? 0 : Math.min((92 * MM) / logo.width, (18 * MM) / logo.height);
      const w = esc ? logo.width * esc : img!.larguraMm! * MM, h = esc ? logo.height * esc : img!.alturaMm! * MM;
      y -= h;
      pg.drawImage(logo, { x: ESQ + (LARGURA - w) / 2, y, width: w, height: h });
      y -= 2 * MM;
    }
    lido.cabecalho.forEach((p, i) => {
      const t = Math.min(p.tamanho ?? 9, 13);
      for (const l of linhasDe(p, f, t, LARGURA)) {
        y -= t * 1.25;
        desenharLinha(pg, l, { ...p, alinhamento: p.alinhamento === "justificado" ? "centro" : p.alinhamento }, ESQ, y + t * 0.2, t, LARGURA, larg(f.r, " ", t), i === 0 ? TINTA : SUAVE);
      }
    });
    y -= 2 * MM;
    pg.drawLine({ start: { x: ESQ, y }, end: { x: A4.w - DIR, y }, thickness: 0.75, color: VINHO });
    fio = (A4.h - y) / MM;
    return Math.min(y - 6 * MM, A4.h - TOPO);
  };
  let fio: number | null = null;

  let pg = doc.addPage([A4.w, A4.h]);
  let y = cabecalho(pg);
  const corpoMm = (A4.h - y) / MM;
  const novaPagina = () => {
    pg = doc.addPage([A4.w, A4.h]);
    y = cabecalho(pg);
  };
  let anterior = 0;
  for (const p of lido.corpo) {
    const t = p.tamanho ?? 12;
    const alto = t * (p.alinhamento === "justificado" ? 1.5 : 1.3);
    const vazio = !p.pedacos.some((x) => x.texto.trim());
    y -= Math.max(p.antes, anterior * 0.5) * (vazio ? 0 : 1);
    if (vazio) {
      y -= alto * 0.6;
      anterior = 0;
      continue;
    }
    for (const l of linhasDe(p, f, t, LARGURA)) {
      if (y - alto < BAIXO + 6 * MM) novaPagina();
      y -= alto;
      desenharLinha(pg, l, p, ESQ, y + (alto - t) / 2 + t * 0.2, t, LARGURA, larg(f.r, " ", t));
    }
    y -= p.depois;
    anterior = p.depois;
  }

  // O rodapé: o contrato, a versão e o dia (pergunta 4) à esquerda, a página à direita.
  const paginas = doc.getPages();
  const pe1 = so(textoRodapePdf(rodape));
  paginas.forEach((p, i) => {
    const t = 7.5;
    p.drawText(pe1, { x: ESQ, y: 10 * MM, size: t, font: pe, color: SUAVE });
    const n = `página ${i + 1} de ${paginas.length}`;
    p.drawText(n, { x: A4.w - DIR - larg(pe, n, t), y: 10 * MM, size: t, font: pe, color: SUAVE });
  });
  // fioMm e corpoMm (da borda de cima): para o teste medir o cabeçalho (timbrado_docx_test.ts).
  return { pdf: await doc.save(), complexo: lido.complexo, fioMm: fio, corpoMm };
}
