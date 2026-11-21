// O recibo em PDF no servidor (F3.93; FI-14, FI-21), para o .zip do contador e para baixar. Segue a
// folha A4 aprovada em docs/design/aprovadas/portal-recibo-recorrente (recibo-a4.html) e o logo do
// dia (docs/design/aprovadas/portal-nao-paga-logo, recibo-logo-a4.html): o timbre do escritório, o
// fio vinho com o toque âmbar, o número e o valor, o texto corrido, a discriminação (com o
// reembolso pago junto como segunda linha, F3.95), os dados do pagamento, o local e a data, a
// assinatura do escritório e o pé "Modelo T3jus". Os textos são os mesmos da página de imprimir
// (packages/ui/src/portal/Recibo.tsx), que saem de packages/domain/src/recibo.ts.

import { PDFDocument, type PDFFont, type PDFImage, type PDFPage, rgb, StandardFonts } from "pdf-lib";
import {
  dataBr, detalheDoReembolso, documentoComNome, FORMAS_PAGAMENTO, linhaDoReembolso, linhasTimbrado, localEData, mesDeReferencia,
  numeroDoRecibo, parcelaDoRecibo, reais, telefoneBr, textoDoRecibo, tituloDoRecibo, totalDoRecibo, type ReciboParaImprimir,
} from "@t3jus/domain";
import { A4, AMBAR, limpo, MM, quebrar, SUAVE, TINTA, VINHO } from "./carne_pdf.ts";

const SAL = rgb(0xf2 / 255, 0xec / 255, 0xe8 / 255);
const FIO = rgb(0xdd / 255, 0xd0 / 255, 0xd6 / 255);
const fuso = { timeZone: "America/Sao_Paulo" } as const;
const diaDe = (em: string) => new Intl.DateTimeFormat("en-CA", { ...fuso, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(em));
const horaDe = (em: string) => new Intl.DateTimeFormat("pt-BR", { ...fuso, hour: "2-digit", minute: "2-digit" }).format(new Date(em)).replace(":", "h");

interface F { r: PDFFont; b: PDFFont; i: PDFFont; sr: PDFFont; sb: PDFFont; si: PDFFont }

/** Escreve do topo (y é a linha de cima), quebrando em `largura`. Devolve o y de baixo. */
function texto(pg: PDFPage, s: string, x: number, y: number, o: { t: number; f: PDFFont; cor?: ReturnType<typeof rgb>; largura?: number; dir?: boolean; centro?: boolean; alto?: number }): number {
  const alto = o.t * (o.alto ?? 1.3);
  const linhas = o.largura && !o.dir && !o.centro ? quebrar(limpo(s), o.f, o.t, o.largura) : [limpo(s)];
  let yy = y;
  for (const l of linhas) {
    yy -= alto;
    const w = o.f.widthOfTextAtSize(l, o.t);
    const xx = o.dir ? x - w : o.centro ? x - w / 2 : x;
    pg.drawText(l, { x: xx, y: yy + (alto - o.t) / 2 + o.t * 0.2, size: o.t, font: o.f, color: o.cor ?? TINTA });
  }
  return yy;
}

/** O texto corrido em pedaços (negrito e itálico no meio da frase), quebrado por palavra. */
function corrido(pg: PDFPage, pedacos: { texto: string; forte?: boolean; extenso?: boolean }[], f: F, x: number, y: number, largura: number, t: number): number {
  const palavras: { s: string; f: PDFFont; junto: boolean }[] = [];
  // `junto`: a palavra continua a anterior, sem espaço (o espaço pode ter ficado no pedaço de antes).
  let junto = false;
  for (const p of pedacos) {
    const fonte = p.forte ? f.sb : p.extenso ? f.si : f.sr;
    const partes = p.texto.replace(/[^\S ]/g, " ").split(/( +)/);
    for (const parte of partes) {
      if (!parte) continue;
      if (/^\s+$/.test(parte)) { junto = false; continue; }
      palavras.push({ s: limpo(parte), f: fonte, junto });
      junto = true;
    }
  }
  const alto = t * 1.5;
  const esp = f.sr.widthOfTextAtSize(" ", t);
  let linha: { s: string; f: PDFFont; x: number }[] = [];
  let cx = 0;
  let yy = y;
  const soltar = () => {
    yy -= alto;
    for (const w of linha) pg.drawText(w.s, { x: x + w.x, y: yy + t * 0.35, size: t, font: w.f, color: TINTA });
    linha = [];
    cx = 0;
  };
  for (const w of palavras) {
    const lw = w.f.widthOfTextAtSize(w.s, t);
    const antes = linha.length && !w.junto ? esp : 0;
    if (linha.length && cx + antes + lw > largura && !w.junto) soltar();
    // A palavra presa à anterior (vírgula, parêntese) vai junto; se a linha estoura, estoura pouco.
    const sep = linha.length && !w.junto ? esp : 0;
    linha.push({ s: w.s, f: w.f, x: cx + sep });
    cx += sep + lw;
  }
  if (linha.length) soltar();
  return yy;
}

/** A folha do recibo num PDF A4. `logo` é o PNG do logo do dia, quando o recibo saiu com ele. */
export async function pdfDoRecibo(r: ReciboParaImprimir, logo: Uint8Array | null = null): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(limpo(tituloDoRecibo(r)));
  doc.setAuthor(limpo(r.escritorio.nome));
  doc.setProducer("T3jus");
  doc.setCreator("T3jus");
  const f: F = {
    r: await doc.embedFont(StandardFonts.Helvetica), b: await doc.embedFont(StandardFonts.HelveticaBold), i: await doc.embedFont(StandardFonts.HelveticaOblique),
    sr: await doc.embedFont(StandardFonts.TimesRoman), sb: await doc.embedFont(StandardFonts.TimesRomanBold), si: await doc.embedFont(StandardFonts.TimesRomanItalic),
  };
  let img: PDFImage | null = null;
  if (logo && r.marca?.tipo === "LOGO") {
    try { img = await doc.embedPng(logo); } catch { img = null; }
  }
  const pg = doc.addPage([A4.w, A4.h]);
  const esq = 18 * MM, dir = A4.w - 18 * MM, largura = dir - esq;
  const total = totalDoRecibo(r);
  const n = numeroDoRecibo(r);
  const venc = dataBr(r.parcela.vencimento);

  // A faixa vinho no alto da folha.
  pg.drawRectangle({ x: 0, y: A4.h - 3.2 * MM, width: A4.w, height: 3.2 * MM, color: VINHO });

  // Timbre: a marca à esquerda (logo de até 92 × 20 mm, ou o nome em letra) e o endereço à direita.
  let y = A4.h - 16 * MM;
  let baseMarca: number;
  if (img) {
    const esc = Math.min((92 * MM) / img.width, (20 * MM) / img.height);
    const w = img.width * esc, h = img.height * esc;
    pg.drawImage(img, { x: esq, y: y - h, width: w, height: h });
    baseMarca = y - h;
    if (r.marca?.jeito === "LOGO_E_NOME") texto(pg, r.escritorio.nome, esq + w + 3 * MM, y - h / 2 + 8, { t: 16, f: f.sb, cor: VINHO });
  } else {
    baseMarca = texto(pg, r.escritorio.nome, esq, y, { t: 24, f: f.sb, cor: VINHO, largura: largura - 100 * MM, alto: 1.05 });
    baseMarca = texto(pg, "A D V O C A C I A", esq, baseMarca - 1, { t: 7, f: f.b, cor: SUAVE });
  }
  const linhas = linhasTimbrado({ ...r.escritorio, oab: r.marca?.oab ?? r.escritorio.oab ?? null, contatos: r.escritorio.contatos ?? undefined }).slice(1);
  if (r.escritorio.whatsapp) linhas.push(`WhatsApp ${telefoneBr(r.escritorio.whatsapp)}`);
  let ye = y;
  for (const l of linhas) for (const q of quebrar(limpo(l), f.r, 7.8, 96 * MM)) ye = texto(pg, q, dir, ye, { t: 7.8, f: f.r, cor: SUAVE, dir: true, alto: 1.5 });
  y = Math.min(baseMarca, ye) - 5 * MM;

  // O fio vinho com o toque âmbar.
  pg.drawRectangle({ x: esq, y, width: largura, height: 0.5 * MM, color: VINHO });
  pg.drawRectangle({ x: esq, y: y - 0.37 * MM, width: 18 * MM, height: 1.25 * MM, color: AMBAR });
  y -= 8 * MM;

  // Número e valor.
  const topo = y;
  let yt = texto(pg, "RECIBO DE HONORÁRIOS", esq, topo, { t: 7, f: f.b, cor: SUAVE });
  yt = texto(pg, "Recibo", esq, yt - 1.5 * MM, { t: 32, f: f.sb, alto: 1 });
  yt = texto(pg, `Nº ${n}`, esq, yt - 2 * MM, { t: 11, f: f.b });
  const vw = 66 * MM, vh = 20 * MM;
  pg.drawRectangle({ x: dir - vw, y: topo - vh, width: vw, height: vh, borderColor: VINHO, borderWidth: 0.35 * MM });
  texto(pg, "VALOR RECEBIDO", dir - 5 * MM, topo - 4 * MM, { t: 7, f: f.b, cor: SUAVE, dir: true });
  texto(pg, reais(total), dir - 5 * MM, topo - 8 * MM, { t: 22, f: f.sb, dir: true, alto: 1 });
  y = Math.min(yt, topo - vh) - 7 * MM;

  // O texto corrido.
  y = corrido(pg, textoDoRecibo(r), f, esq, y, largura, 12);

  // Discriminação.
  y = texto(pg, "Discriminação", esq, y - 6 * MM, { t: 12.5, f: f.sb, cor: VINHO }) - 2 * MM;
  texto(pg, "DESCRIÇÃO", esq, y, { t: 6.8, f: f.b, cor: SUAVE });
  y = texto(pg, "VALOR", dir, y, { t: 6.8, f: f.b, cor: SUAVE, dir: true }) - 1.4 * MM;
  pg.drawLine({ start: { x: esq, y }, end: { x: dir, y }, thickness: 0.3 * MM, color: VINHO });
  const item = (titulo: string, sub: string, valor: number) => {
    const y0 = y - 2.2 * MM;
    let yy = texto(pg, titulo, esq, y0, { t: 9, f: f.r, largura: largura - 40 * MM });
    yy = texto(pg, sub, esq, yy, { t: 7.6, f: f.r, cor: SUAVE, largura: largura - 40 * MM });
    texto(pg, reais(valor), dir, y0, { t: 9, f: f.r, dir: true });
    y = yy - 2.2 * MM;
    pg.drawLine({ start: { x: esq, y }, end: { x: dir, y }, thickness: 0.2 * MM, color: FIO });
  };
  item(`Honorários · ${parcelaDoRecibo(r)}`, `Mês de referência: ${mesDeReferencia(r.parcela.vencimento)} · vencimento ${venc}`, r.valor);
  if (r.multaJuros) item("Multa e juros", "Pelo atraso, como registrado no recebimento", r.multaJuros);
  for (const x of r.reembolsos ?? []) item(linhaDoReembolso(x), `${detalheDoReembolso(x)} · ${FORMAS_PAGAMENTO[x.forma] ?? x.forma}`, x.valor);
  texto(pg, "Total recebido", esq, y - 2.6 * MM, { t: 9, f: f.b });
  y = texto(pg, reais(total), dir, y - 2 * MM, { t: 14, f: f.sb, dir: true });

  // Dados do pagamento, numa caixa sal de três colunas.
  const docCli = documentoComNome(r.cliente.documento);
  const dados: [string, string, string | null][] = [["CLIENTE", r.cliente.nome, docCli]];
  if (r.pagador) {
    dados.push(["QUEM PAGOU", r.pagador.nome, [documentoComNome(r.pagador.documento), r.pagador.papel].filter(Boolean).join(" · ") || "em favor do cliente"]);
  }
  dados.push(
    ["CONTRATO", r.contrato.numero, `Honorários · ${r.contrato.objeto}`],
    ["PARCELA", r.parcela.ordem && r.parcela.total ? `${r.parcela.ordem} de ${r.parcela.total}` : r.parcela.descricao, mesDeReferencia(r.parcela.vencimento)],
    ["FORMA", FORMAS_PAGAMENTO[r.forma] ?? r.forma, r.reembolsos?.some((x) => x.forma !== r.forma) ? "dos honorários · o reembolso, como na linha dele" : "registrada no escritório"],
    ["DATA DO PAGAMENTO", dataBr(r.pagoEm), `vencia em ${venc}`],
  );
  // Três colunas, linhas de 15 mm; o cliente ocupa duas quando não há "quem pagou".
  const col = (largura - 10 * MM - 12 * MM) / 3;
  const LINHA = 15 * MM;
  const posicoes: { x: number; y: number; w: number; d: [string, string, string | null] }[] = [];
  let c = 0, lin = 0;
  dados.forEach((d, i) => {
    const span = !r.pagador && i === 0 ? 2 : 1;
    if (c + span > 3) { c = 0; lin++; }
    posicoes.push({ x: esq + 5 * MM + c * (col + 6 * MM), y: y - 6.5 * MM - 4 * MM - lin * LINHA, w: col * span + (span - 1) * 6 * MM, d });
    c += span;
  });
  const alturaCaixa = (lin + 1) * LINHA + 6 * MM;
  pg.drawRectangle({ x: esq, y: y - 6.5 * MM - alturaCaixa, width: largura, height: alturaCaixa, color: SAL });
  for (const p of posicoes) {
    let yv = texto(pg, p.d[0], p.x, p.y, { t: 6.6, f: f.b, cor: SUAVE });
    yv = texto(pg, p.d[1], p.x, yv - 0.6 * MM, { t: 9, f: f.b, largura: p.w, alto: 1.35 });
    if (p.d[2]) texto(pg, p.d[2], p.x, yv, { t: 7.6, f: f.r, cor: SUAVE, largura: p.w });
  }

  // Local e data, quitação e assinatura do escritório, no pé da folha.
  const yFim = 62 * MM;
  texto(pg, localEData(r), esq, yFim, { t: 12, f: f.sr });
  texto(pg, "Este recibo dá quitação somente da parcela e dos valores descritos acima. As demais parcelas do contrato seguem como combinado.",
    esq, yFim - 8 * MM, { t: 7.8, f: f.r, cor: SUAVE, largura: 80 * MM, alto: 1.5 });
  const ax = dir - 42 * MM, aw = 84 * MM;
  pg.drawLine({ start: { x: dir - aw, y: yFim - 2 * MM }, end: { x: dir, y: yFim - 2 * MM }, thickness: 0.3 * MM, color: TINTA });
  let ya = texto(pg, r.escritorio.nome, ax, yFim - 3.5 * MM, { t: 9.2, f: f.b, centro: true });
  if (r.escritorio.cnpj) ya = texto(pg, documentoComNome(r.escritorio.cnpj) ?? "", ax, ya, { t: 8.4, f: f.r, cor: SUAVE, centro: true });
  const reg = `Recebimento registrado por ${r.registradoPor.nome}${r.registradoPor.oab ? `, ${r.registradoPor.oab}` : ""}, em ${dataBr(diaDe(r.registradoEm))}, às ${horaDe(r.registradoEm)}.`;
  for (const q of quebrar(limpo(reg), f.r, 7.4, aw)) ya = texto(pg, q, ax, ya, { t: 7.4, f: f.r, cor: SUAVE, centro: true });

  pg.drawLine({ start: { x: esq, y: 20 * MM }, end: { x: dir, y: 20 * MM }, thickness: 0.2 * MM, color: FIO });
  texto(pg, `Recibo nº ${n} · emitido pelo escritório em ${dataBr(diaDe(r.registradoEm))} · 1 página`, esq, 19 * MM, { t: 7, f: f.r, cor: SUAVE });
  texto(pg, "Modelo T3jus", dir, 19 * MM, { t: 7, f: f.b, cor: VINHO, dir: true });
  return await doc.save();
}

/** O PNG do logo do dia do recibo, do Storage do escritório; nulo quando saiu com o nome em letra. */
export async function logoDoRecibo(deps: { arquivos: { baixar(caminho: string): Promise<Uint8Array | null> } }, escritorio: string,
  r: ReciboParaImprimir, cache = new Map<string, Uint8Array | null>()): Promise<Uint8Array | null> {
  const id = r.marca?.tipo === "LOGO" ? r.marca.logoId : null;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  if (!cache.has(id)) cache.set(id, await deps.arquivos.baixar(`${escritorio}/logos/${id}.png`));
  return cache.get(id) ?? null;
}

/** O nome do arquivo: recibo-2026-0187-helio-correa.pdf. */
export function nomeDoPdfRecibo(r: ReciboParaImprimir): string {
  const partes = r.cliente.nome.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const nome = [partes[0], partes.length > 1 ? partes[partes.length - 1] : null].filter(Boolean).join("-");
  return `recibo-${numeroDoRecibo(r)}-${nome}.pdf`;
}
