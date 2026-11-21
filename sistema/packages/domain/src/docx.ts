// O .docx das petições (EX-09), tela aprovada em docs/design/aprovadas/portal-peticoes. Sem
// biblioteca: o .docx é um .zip de XML (zip.ts). Aqui ficam:
// - a conferência do arquivo que o escritório envia (decisão 5): só .docx, sem macro, até 5 MB,
//   e os campos entre colchetes, inclusive os que o Word quebra em pedaços;
// - o preenchimento dos campos, trocando só o texto e mantendo a formatação do modelo;
// - a marca "Rascunho · em revisão" no cabeçalho, enquanto a petição não é aprovada (decisão 19);
// - o texto de cada parágrafo, para a prévia e os comentários da revisão (decisões 22 e 24);
// - um .docx simples a partir de parágrafos, para os 8 modelos padrão do T3jus.

import { abrirEntrada, abrirTexto, ErroZip, escreverZip, lerZip, type EntradaZip } from "./zip.ts";

export const LIMITE_MODELO_BYTES = 5 * 1024 * 1024;
export const TIPO_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export type MotivoDocx = "ARQUIVO_VAZIO" | "ARQUIVO_GRANDE" | "ARQUIVO_PDF" | "ARQUIVO_DOC_ANTIGO" | "ARQUIVO_MACRO" | "ARQUIVO_INVALIDO";

export class ErroDocx extends Error {
  constructor(readonly motivo: MotivoDocx) {
    super(motivo);
    this.name = "ErroDocx";
  }
}

/** Um campo entre colchetes: letras maiúsculas, números e sublinhado. */
export const CAMPO_DOCX = /\[([A-Z][A-Z0-9_]{1,40})\]/g;
/** O que saiu marcado por falta de dado: "[RG: falta]". */
export const MARCA_FALTA = /\[[^[\]]{1,80}: falta\]/g;

// ------------------------------------------------------------------------------- XML

const ENTIDADES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
function semEntidades(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (t, c: string) =>
    c[0] === "#" ? String.fromCodePoint(c[1] === "x" || c[1] === "X" ? parseInt(c.slice(2), 16) : parseInt(c.slice(1), 10)) : (ENTIDADES[c] ?? t));
}
export function escaparXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function semControle(s: string): string {
  // O XML não aceita caracteres de controle (fora tab e quebra de linha).
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

/**
 * As peças de texto do XML, em ordem, separadas por parágrafo. Um campo nunca atravessa
 * parágrafos, mas pode estar quebrado em várias peças (o Word divide o texto em "runs").
 * Parágrafo dentro de parágrafo (caixa de texto) vira outro grupo: o texto de fora continua
 * num grupo novo depois dele.
 */
interface Peca {
  inicio: number;
  fim: number;
  texto: string;
}
const TOKENS = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:t(?:\s[^>]*)?\/>|<w:p(?:\s[^>]*)?\/>|<w:p[\s>]|<\/w:p>|<w:tab\/>|<w:br(?:\s[^>]*)?\/>|<w:cr\/>/g;

function gruposDeTexto(xml: string): { pecas: Peca[]; texto: string }[] {
  const grupos: { pecas: Peca[]; texto: string }[] = [];
  let atual: Peca[] = [];
  let texto = "";
  const fechar = () => {
    if (atual.length || texto) grupos.push({ pecas: atual, texto });
    atual = [];
    texto = "";
  };
  for (const m of xml.matchAll(TOKENS)) {
    const t = m[0];
    if (t.startsWith("<w:t") && !t.startsWith("<w:tab")) {
      const conteudo = m[1] === undefined ? "" : semEntidades(m[1]);
      atual.push({ inicio: m.index!, fim: m.index! + t.length, texto: conteudo });
      texto += conteudo;
    } else if (t === "<w:tab/>") {
      texto += "\t";
      atual.push({ inicio: -1, fim: -1, texto: "\t" });
    } else if (t.startsWith("<w:br") || t === "<w:cr/>") {
      texto += "\n";
      atual.push({ inicio: -1, fim: -1, texto: "\n" });
    } else {
      fechar();
    }
  }
  fechar();
  return grupos;
}

/** Os campos de um XML, na ordem em que aparecem. */
function camposDoXml(xml: string): string[] {
  const achados: string[] = [];
  for (const g of gruposDeTexto(xml)) for (const m of g.texto.matchAll(CAMPO_DOCX)) achados.push(m[1]!);
  return achados;
}

/** Troca os campos conhecidos no XML; o que não está em `valores` fica como está. */
function preencherXml(xml: string, valores: Readonly<Record<string, string>>): string {
  const trocas: { inicio: number; fim: number; texto: string }[] = [];
  for (const g of gruposDeTexto(xml)) {
    const casos = [...g.texto.matchAll(CAMPO_DOCX)].filter((m) => Object.hasOwn(valores, m[1]!));
    if (!casos.length) continue;
    // De quem é cada caractere do texto do grupo.
    const dono: number[] = [];
    g.pecas.forEach((p, i) => { for (let k = 0; k < p.texto.length; k++) dono.push(i); });
    const novos = g.pecas.map(() => "");
    let pos = 0;
    for (const m of casos) {
      for (; pos < m.index!; pos++) novos[dono[pos]!] += g.texto[pos]!;
      novos[dono[m.index!]!] += semControle(valores[m[1]!]!);
      pos = m.index! + m[0].length;
    }
    for (; pos < g.texto.length; pos++) novos[dono[pos]!] += g.texto[pos]!;
    g.pecas.forEach((p, i) => {
      if (p.inicio < 0 || novos[i] === p.texto) return;
      const corpo = escaparXml(novos[i]!).replace(/\n/g, '</w:t><w:br/><w:t xml:space="preserve">').replace(/\t/g, '</w:t><w:tab/><w:t xml:space="preserve">');
      trocas.push({ inicio: p.inicio, fim: p.fim, texto: `<w:t xml:space="preserve">${corpo}</w:t>` });
    });
  }
  if (!trocas.length) return xml;
  let saida = "";
  let ultimo = 0;
  for (const t of trocas.sort((a, b) => a.inicio - b.inicio)) {
    saida += xml.slice(ultimo, t.inicio) + t.texto;
    ultimo = t.fim;
  }
  return saida + xml.slice(ultimo);
}

/** O texto de cada parágrafo com texto, na ordem do documento. */
function paragrafosDoXml(xml: string): string[] {
  return gruposDeTexto(xml).map((g) => g.texto.replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").trim()).filter((t) => t.length > 0);
}

// ------------------------------------------------------------------------------- .docx

interface Docx {
  bytes: Uint8Array;
  mapa: Map<string, EntradaZip>;
}

function comeca(b: Uint8Array, ...bytes: number[]) {
  return bytes.every((x, i) => b[i] === x);
}

async function abrirDocx(b: Uint8Array): Promise<Docx> {
  if (!b.length) throw new ErroDocx("ARQUIVO_VAZIO");
  if (b.length > LIMITE_MODELO_BYTES) throw new ErroDocx("ARQUIVO_GRANDE");
  if (comeca(b, 0x25, 0x50, 0x44, 0x46)) throw new ErroDocx("ARQUIVO_PDF");
  // O .doc antigo (e o .docx protegido por senha) é um arquivo OLE.
  if (comeca(b, 0xd0, 0xcf, 0x11, 0xe0)) throw new ErroDocx("ARQUIVO_DOC_ANTIGO");
  if (!comeca(b, 0x50, 0x4b)) throw new ErroDocx("ARQUIVO_INVALIDO");
  let mapa: Map<string, EntradaZip>;
  try {
    mapa = lerZip(b);
  } catch (e) {
    if (e instanceof ErroZip) throw new ErroDocx(e.motivo === "ZIP_GRANDE" ? "ARQUIVO_GRANDE" : "ARQUIVO_INVALIDO");
    throw e;
  }
  const tipos = mapa.get("[Content_Types].xml");
  if (!tipos || !mapa.has("word/document.xml")) throw new ErroDocx("ARQUIVO_INVALIDO");
  const ct = await texto({ bytes: b, mapa }, "[Content_Types].xml");
  if (/macroEnabled/i.test(ct) || [...mapa.keys()].some((n) => /vbaProject\.bin$|vbaData\.xml$/i.test(n))) throw new ErroDocx("ARQUIVO_MACRO");
  if (!/wordprocessingml\.document\.main\+xml/.test(ct)) throw new ErroDocx("ARQUIVO_INVALIDO");
  return { bytes: b, mapa };
}

async function texto(d: Docx, nome: string): Promise<string> {
  const e = d.mapa.get(nome);
  if (!e) throw new ErroDocx("ARQUIVO_INVALIDO");
  try {
    return await abrirTexto(d.bytes, e);
  } catch (erro) {
    if (erro instanceof ErroZip) throw new ErroDocx(erro.motivo === "ZIP_GRANDE" ? "ARQUIVO_GRANDE" : "ARQUIVO_INVALIDO");
    throw erro;
  }
}

/** O corpo, os cabeçalhos e os rodapés: onde os campos podem estar. */
function partesComTexto(d: Docx): string[] {
  const outras = [...d.mapa.keys()].filter((n) => /^word\/(header|footer)\d*\.xml$/.test(n)).sort();
  return ["word/document.xml", ...outras];
}

async function regravar(d: Docx, mudadas: Map<string, string>, novas: { nome: string; texto: string }[] = []): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const entradas: { nome: string; dados: Uint8Array }[] = [];
  for (const [nome, e] of d.mapa) {
    if (nome.endsWith("/")) continue;
    const m = mudadas.get(nome);
    entradas.push({ nome, dados: m !== undefined ? enc.encode(m) : await abrirEntrada(d.bytes, e) });
  }
  for (const n of novas) entradas.push({ nome: n.nome, dados: enc.encode(n.texto) });
  return await escreverZip(entradas);
}

export interface DocxConferido {
  /** Os campos achados, sem repetir, na ordem em que aparecem. */
  campos: string[];
  /** O texto de cada parágrafo do corpo. */
  paragrafos: string[];
  /** Quantas marcas "[…: falta]" ainda há (no .docx editado, decisão 23). */
  faltas: string[];
}

/** Confere o arquivo que chegou e lê os campos e os parágrafos (decisões 5 e 23). */
export async function conferirDocx(b: Uint8Array): Promise<DocxConferido> {
  const d = await abrirDocx(b);
  const campos: string[] = [];
  const faltas: string[] = [];
  for (const parte of partesComTexto(d)) {
    const xml = await texto(d, parte);
    for (const c of camposDoXml(xml)) if (!campos.includes(c)) campos.push(c);
    for (const g of gruposDeTexto(xml)) for (const m of g.texto.matchAll(MARCA_FALTA)) faltas.push(m[0]);
  }
  return { campos, paragrafos: paragrafosDoXml(await texto(d, "word/document.xml")), faltas };
}

/** Troca os campos pelos valores, no corpo, nos cabeçalhos e nos rodapés. "\n" vira quebra de linha. */
export async function preencherDocx(b: Uint8Array, valores: Readonly<Record<string, string>>): Promise<Uint8Array> {
  const d = await abrirDocx(b);
  const mudadas = new Map<string, string>();
  for (const parte of partesComTexto(d)) {
    const antes = await texto(d, parte);
    const depois = preencherXml(antes, valores);
    if (depois !== antes) mudadas.set(parte, depois);
  }
  return await regravar(d, mudadas);
}

export const TEXTO_RASCUNHO = "Rascunho · em revisão";
const PARAGRAFO_RASCUNHO =
  `<w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="7A1F2B"/><w:sz w:val="20"/></w:rPr>` +
  `<w:t xml:space="preserve">${escaparXml(TEXTO_RASCUNHO)}</w:t></w:r></w:p>`;
const ID_RASCUNHO = "rIdT3jusRascunho";
const PARTE_RASCUNHO = "word/headerT3jusRascunho.xml";

/**
 * Põe "Rascunho · em revisão" no alto do cabeçalho de cada página (decisão 19). O cabeçalho do
 * escritório (o papel timbrado) continua; a marca entra antes dele. Sem cabeçalho, cria um.
 */
export async function marcarRascunho(b: Uint8Array): Promise<Uint8Array> {
  const d = await abrirDocx(b);
  let doc = await texto(d, "word/document.xml");
  const relsNome = "word/_rels/document.xml.rels";
  let rels = d.mapa.has(relsNome)
    ? await texto(d, relsNome)
    : '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
  const alvos = new Map<string, string>();
  for (const m of rels.matchAll(/<Relationship\s[^>]*>/g)) {
    const id = /\sId="([^"]+)"/.exec(m[0])?.[1];
    const alvo = /\sTarget="([^"]+)"/.exec(m[0])?.[1];
    if (id && alvo) alvos.set(id, alvo.startsWith("/") ? alvo.slice(1) : `word/${alvo}`);
  }
  const mudadas = new Map<string, string>();
  const novas: { nome: string; texto: string }[] = [];
  let precisaParte = false;

  const ajustarSecao = (sec: string): string => {
    const refs = [...sec.matchAll(/<w:headerReference\s[^>]*\/>/g)].map((m) => ({
      tipo: /w:type="([^"]+)"/.exec(m[0])?.[1] ?? "default",
      id: /r:id="([^"]+)"/.exec(m[0])?.[1] ?? "",
    }));
    for (const r of refs) {
      const parte = alvos.get(r.id);
      if (parte && d.mapa.has(parte)) mudadas.set(parte, "");
    }
    const faltam: string[] = [];
    if (!refs.some((r) => r.tipo === "default")) faltam.push("default");
    if (/<w:titlePg(\s[^>]*)?\/>/.test(sec) && !/w:val="(0|false)"/.test(/<w:titlePg[^>]*\/>/.exec(sec)?.[0] ?? "") && !refs.some((r) => r.tipo === "first")) faltam.push("first");
    if (!faltam.length) return sec;
    precisaParte = true;
    const novasRefs = faltam.map((t) => `<w:headerReference w:type="${t}" r:id="${ID_RASCUNHO}"/>`).join("");
    return sec.replace(/^<w:sectPr(\s[^>]*)?>/, (abre) => abre + novasRefs);
  };

  if (/<w:sectPr[\s>]/.test(doc)) {
    doc = doc.replace(/<w:sectPr(?:\s[^>]*)?\/>/g, () => "<w:sectPr></w:sectPr>");
    doc = doc.replace(/<w:sectPr(?:\s[^>]*)?>[\s\S]*?<\/w:sectPr>/g, ajustarSecao);
  } else {
    doc = doc.replace(/<\/w:body>/, () => ajustarSecao("<w:sectPr></w:sectPr>") + "</w:body>");
  }

  for (const parte of [...mudadas.keys()]) {
    const xml = await texto(d, parte);
    mudadas.set(parte, xml.replace(/<w:hdr(\s[^>]*)?>/, (abre) => abre + PARAGRAFO_RASCUNHO));
  }
  if (precisaParte) {
    if (!/xmlns:r=/.test(/<w:document[^>]*>/.exec(doc)?.[0] ?? "")) {
      doc = doc.replace(/<w:document(\s|>)/, '<w:document xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"$1');
    }
    novas.push({
      nome: PARTE_RASCUNHO,
      texto: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${PARAGRAFO_RASCUNHO}</w:hdr>`,
    });
    rels = rels.replace(/<\/Relationships>/, `<Relationship Id="${ID_RASCUNHO}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="headerT3jusRascunho.xml"/></Relationships>`);
    mudadas.set(relsNome, rels);
    const ct = await texto(d, "[Content_Types].xml");
    mudadas.set("[Content_Types].xml", ct.replace(/<\/Types>/,
      `<Override PartName="/${PARTE_RASCUNHO}" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/></Types>`));
    if (!d.mapa.has(relsNome)) {
      novas.push({ nome: relsNome, texto: rels });
      mudadas.delete(relsNome);
    }
  }
  mudadas.set("word/document.xml", doc);
  return await regravar(d, mudadas, novas);
}

/** O texto de cada parágrafo do corpo (a prévia do .docx editado no Word, decisão 24). */
export async function paragrafosDocx(b: Uint8Array): Promise<string[]> {
  return paragrafosDoXml(await texto(await abrirDocx(b), "word/document.xml"));
}

// ------------------------------------------------------------------------------- criar

export type EstiloParagrafo = "normal" | "titulo" | "enderecamento" | "direita" | "assinatura";
export interface ParagrafoDocx {
  texto: string;
  estilo?: EstiloParagrafo;
}

function paragrafoXml(p: ParagrafoDocx): string {
  const estilo = p.estilo ?? "normal";
  const pPr = {
    normal: '<w:pPr><w:spacing w:after="160" w:line="360" w:lineRule="auto"/><w:ind w:firstLine="1418"/><w:jc w:val="both"/></w:pPr>',
    titulo: '<w:pPr><w:spacing w:before="240" w:after="240"/><w:jc w:val="center"/></w:pPr>',
    enderecamento: '<w:pPr><w:spacing w:after="720"/><w:jc w:val="both"/></w:pPr>',
    direita: '<w:pPr><w:spacing w:after="160"/><w:jc w:val="right"/></w:pPr>',
    assinatura: '<w:pPr><w:spacing w:before="480" w:after="0"/><w:jc w:val="center"/></w:pPr>',
  }[estilo];
  const rPr = estilo === "titulo" || estilo === "enderecamento" ? "<w:rPr><w:b/></w:rPr>" : "";
  const linhas = p.texto.split("\n").map((l) => `<w:t xml:space="preserve">${escaparXml(semControle(l))}</w:t>`).join("<w:br/>");
  return `<w:p>${pPr}<w:r>${rPr}${linhas}</w:r></w:p>`;
}

/** O timbrado no cabeçalho de cada página: a primeira linha em negrito, as outras menores. */
function cabecalhoXml(linhas: readonly string[], w: string): string {
  const ps = linhas.map((l, i) => {
    const rPr = i === 0 ? '<w:rPr><w:b/><w:sz w:val="26"/></w:rPr>' : '<w:rPr><w:sz w:val="18"/><w:color w:val="555555"/></w:rPr>';
    const borda = i === linhas.length - 1 ? '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="6" w:color="6B2346"/></w:pBdr>' : "";
    return `<w:p><w:pPr>${borda}<w:spacing w:after="0"/><w:jc w:val="center"/></w:pPr><w:r>${rPr}<w:t xml:space="preserve">${escaparXml(semControle(l))}</w:t></w:r></w:p>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr ${w}>${ps}</w:hdr>`;
}

/**
 * Um .docx simples (Times New Roman 12, A4, margens de 3 e 2 cm), para os modelos padrão. Com
 * `timbrado`, as linhas vão no cabeçalho de cada página (nome do escritório, CNPJ e endereço).
 */
export async function criarDocx(paragrafos: readonly ParagrafoDocx[], timbrado?: readonly string[]): Promise<Uint8Array> {
  const w = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
  const r = 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  const cab = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const enc = new TextEncoder();
  const corpo = paragrafos.map(paragrafoXml).join("");
  const arquivos: [string, string][] = [
    ["[Content_Types].xml", `${cab}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
      (timbrado?.length ? '<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>' : "") +
      "</Types>"],
    ["_rels/.rels", `${cab}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],
    ["word/_rels/document.xml.rels", `${cab}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      (timbrado?.length ? '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>' : "") +
      "</Relationships>"],
    ["word/styles.xml", `${cab}<w:styles ${w}><w:docDefaults><w:rPrDefault><w:rPr>` +
      '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="pt-BR"/>' +
      "</w:rPr></w:rPrDefault></w:docDefaults></w:styles>"],
    ["word/document.xml", `${cab}<w:document ${w} ${r}><w:body>${corpo}` +
      `<w:sectPr>${timbrado?.length ? '<w:headerReference w:type="default" r:id="rId2"/>' : ""}<w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1701" w:right="1134" w:bottom="1134" w:left="1701" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr>` +
      "</w:body></w:document>"],
  ];
  if (timbrado?.length) arquivos.push(["word/header1.xml", cabecalhoXml(timbrado, w)]);
  return await escreverZip(arquivos.map(([nome, t]) => ({ nome, dados: enc.encode(t) })));
}
