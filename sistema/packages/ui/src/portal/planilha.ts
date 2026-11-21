// O arquivo do contador (FI-21, decisão 15 do desenho do Financeiro): a planilha .xlsx com as
// abas Resumo, Recebimentos, Despesas e Terceiros (à parte, porque não são receita do
// escritório), ou um .csv só. Feito aqui, sem biblioteca: o .xlsx é um .zip de arquivos XML, e o
// .zip vai sem compressão (o formato aceita), com o CRC-32 de cada arquivo.

import {
  CATEGORIAS_SAIDA, FORMAS_PAGAMENTO, PARA_DESTINACAO, TIPOS_HONORARIO, TIPOS_LEVANTAMENTO,
  type DadosExportacao, type FormatoExportacao,
} from "@t3jus/domain";

// ------------------------------------------------------------------------------------- .zip

const TABELA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(b: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = TABELA_CRC[(c ^ b[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Um .zip sem compressão (método 0), com os nomes em UTF-8. */
export function zipar(arquivos: { nome: string; dados: Uint8Array }[]): Uint8Array {
  const cod = new TextEncoder();
  const partes: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let pos = 0;
  for (const a of arquivos) {
    const nome = cod.encode(a.nome);
    const crc = crc32(a.dados);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true);
    local.setUint16(8, 0, true);
    local.setUint16(10, 0, true);
    local.setUint16(12, 0x21, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, a.dados.length, true);
    local.setUint32(22, a.dados.length, true);
    local.setUint16(26, nome.length, true);
    local.setUint16(28, 0, true);
    const cab = new DataView(new ArrayBuffer(46));
    cab.setUint32(0, 0x02014b50, true);
    cab.setUint16(4, 20, true);
    cab.setUint16(6, 20, true);
    cab.setUint16(8, 0x0800, true);
    cab.setUint16(10, 0, true);
    cab.setUint16(12, 0, true);
    cab.setUint16(14, 0x21, true);
    cab.setUint32(16, crc, true);
    cab.setUint32(20, a.dados.length, true);
    cab.setUint32(24, a.dados.length, true);
    cab.setUint16(28, nome.length, true);
    cab.setUint32(42, pos, true);
    partes.push(new Uint8Array(local.buffer), nome, a.dados);
    central.push(new Uint8Array(cab.buffer), nome);
    pos += 30 + nome.length + a.dados.length;
  }
  const tamCentral = central.reduce((s, b) => s + b.length, 0);
  const fim = new DataView(new ArrayBuffer(22));
  fim.setUint32(0, 0x06054b50, true);
  fim.setUint16(8, arquivos.length, true);
  fim.setUint16(10, arquivos.length, true);
  fim.setUint32(12, tamCentral, true);
  fim.setUint32(16, pos, true);
  const tudo = [...partes, ...central, new Uint8Array(fim.buffer)];
  const saida = new Uint8Array(tudo.reduce((s, b) => s + b.length, 0));
  let i = 0;
  for (const b of tudo) {
    saida.set(b, i);
    i += b.length;
  }
  return saida;
}

// ------------------------------------------------------------------------------------- .xlsx

/** Uma célula: texto, número, reais (em centavos) ou vazia. */
export type Celula = string | number | { reais: number } | null;
export interface Aba { nome: string; larguras: number[]; linhas: Celula[][] }

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  // Caracteres de controle não valem em XML.
  // eslint-disable-next-line no-control-regex
  .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");

function coluna(i: number): string {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

function folhaXml(a: Aba): string {
  const cols = a.larguras.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("");
  const linhas = a.linhas.map((l, r) => {
    const cel = l.map((c, i) => {
      const ref = `${coluna(i)}${r + 1}`;
      const cab = r === 0 ? ' s="1"' : "";
      if (c === null || c === "") return "";
      if (typeof c === "number") return `<c r="${ref}"${cab}><v>${c}</v></c>`;
      if (typeof c === "object") return `<c r="${ref}" s="2"><v>${(c.reais / 100).toFixed(2)}</v></c>`;
      return `<c r="${ref}" t="inlineStr"${cab}><is><t xml:space="preserve">${xml(c)}</t></is></c>`;
    }).join("");
    return `<row r="${r + 1}">${cel}</row>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`
    + `<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`
    + `<cols>${cols}</cols><sheetData>${linhas}</sheetData></worksheet>`;
}

const ESTILOS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;R$&quot; #,##0.00"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

/** A planilha .xlsx com as abas, na ordem. */
export function planilhaXlsx(abas: Aba[]): Uint8Array {
  const cod = new TextEncoder();
  const ct = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`
    + `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>`
    + `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>`
    + `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>`
    + abas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")
    + `</Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
    + `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const livro = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>`
    + abas.map((a, i) => `<sheet name="${xml(a.nome.slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")
    + `</sheets></workbook>`;
  const livroRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
    + abas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")
    + `<Relationship Id="rId${abas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  return zipar([
    { nome: "[Content_Types].xml", dados: cod.encode(ct) },
    { nome: "_rels/.rels", dados: cod.encode(rels) },
    { nome: "xl/workbook.xml", dados: cod.encode(livro) },
    { nome: "xl/_rels/workbook.xml.rels", dados: cod.encode(livroRels) },
    { nome: "xl/styles.xml", dados: cod.encode(ESTILOS) },
    ...abas.map((a, i) => ({ nome: `xl/worksheets/sheet${i + 1}.xml`, dados: cod.encode(folhaXml(a)) })),
  ]);
}

// ------------------------------------------------------------------------------- o do contador

const dia = (d: string | null) => (d ? d.split("-").reverse().join("/") : "");
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
/** "outubro de 2026", de "2026-10-01" ou "2026-10". */
export const nomeMesAno = (m: string) => `${MESES[Number(m.slice(5, 7)) - 1]} de ${m.slice(0, 4)}`;
const tipoReceita = (t: DadosExportacao["recebimentos"][number]["tipo"]) =>
  t === "REEMBOLSO" ? "Reembolso de despesa" : t === "EXITO" ? "Êxito" : TIPOS_HONORARIO[t].nome;
const SITUACAO = { FEITO: "Feito", DISPENSADO: "Dispensado", PENDENTE: "Pendente" } as const;

/** As despesas sem nota (F3.22, FI-18), pela data, descrição e valor de cada uma. */
export type SemNota = { dia: string; descricao: string; valor: number }[];
const chaveDespesa = (x: { dia: string; descricao: string; valor: number }) => `${x.dia}|${x.descricao}|${x.valor}`;

/** As abas da planilha do contador, a partir dos dados do servidor. Com semNota, a aba Despesas marca a falta. */
export function abasContador(d: DadosExportacao, semNota?: SemNota): Aba[] {
  const falta = semNota ? new Set(semNota.map(chaveDespesa)) : null;
  const receita = d.recebimentos.reduce((s, r) => s + r.valor + r.multaJuros, 0);
  const despesa = d.despesas.reduce((s, x) => s + x.valor, 0);
  const terc = d.terceiros.filter((t) => t.para !== "HONORARIOS" && t.para !== "REEMBOLSO");
  return [
    {
      nome: "Resumo",
      larguras: [44, 18],
      linhas: [
        [`${d.escritorio} · ${nomeMesAno(d.mes)}`, null],
        ["Recebimentos do escritório", { reais: receita }],
        ["Despesas pagas", { reais: despesa }],
        ["Resultado do mês", { reais: receita - despesa }],
        ...(d.saldoInicio !== undefined && d.saldoFim !== undefined ? [
          ["Saldo do caixa do escritório no começo do mês", { reais: d.saldoInicio }],
          ["Saldo do caixa do escritório no fim do mês", { reais: d.saldoFim }],
        ] as Aba["linhas"] : []),
        [null, null],
        ["Valores de terceiros estão na aba Terceiros. Não são receita do escritório.", null],
        ["Gerado pelo T3jus, pelo dia em que o dinheiro entrou ou saiu.", null],
      ],
    },
    {
      nome: "Recebimentos",
      larguras: [12, 30, 12, 30, 22, 12, 18, 14, 14, 14, 10],
      linhas: [
        ["Data", "Cliente", "Contrato", "Parcela", "Tipo de honorário", "Referência", "Forma", "Valor", "Multa e juros", "Total", "Recibo"],
        ...d.recebimentos.map((r) => [
          dia(r.dia), r.cliente, r.contrato, r.parcela, tipoReceita(r.tipo), `${r.referencia.slice(5, 7)}/${r.referencia.slice(0, 4)}`,
          FORMAS_PAGAMENTO[r.forma], { reais: r.valor }, { reais: r.multaJuros }, { reais: r.valor + r.multaJuros }, r.recibo,
        ]),
      ],
    },
    {
      nome: "Despesas",
      larguras: falta ? [12, 12, 32, 24, 24, 18, 14, 11, 26, 18] : [12, 12, 32, 24, 24, 18, 14, 11, 26],
      linhas: [
        ["Pago em", "Vencimento", "Descrição", "Fornecedor", "Categoria", "Forma", "Valor", "Recorrente", "Adiantada para o cliente", ...(falta ? ["Nota ou guia"] : [])],
        ...d.despesas.map((x) => [
          dia(x.dia), dia(x.vencimento), x.descricao, x.fornecedor, CATEGORIAS_SAIDA[x.categoria], x.forma ? FORMAS_PAGAMENTO[x.forma] : null,
          { reais: x.valor }, x.recorrente ? "Sim" : "Não", x.cliente,
          ...(falta ? [falta.has(chaveDespesa(x)) ? "Falta a nota" : "Anexada"] : []),
        ]),
      ],
    },
    {
      nome: "Terceiros",
      larguras: [12, 18, 28, 28, 16, 22, 28, 14, 12, 12],
      linhas: [
        ["Entrou em", "O que entrou", "Cliente", "Caso", "Valor levantado", "Para", "Quem", "Valor", "Situação", "Feito em"],
        ...terc.map((t) => [
          dia(t.entrouEm), TIPOS_LEVANTAMENTO[t.tipo], t.cliente, t.caso, { reais: t.levantado }, PARA_DESTINACAO[t.para], t.nome,
          { reais: t.valor }, SITUACAO[t.situacao], dia(t.feitoEm),
        ]),
      ],
    },
  ];
}

/** O .csv do contador: uma tabela só, com a seção em cada linha, separada por ponto e vírgula. */
export function csvContador(d: DadosExportacao, semNota?: SemNota): string {
  const falta = semNota ? new Set(semNota.map(chaveDespesa)) : null;
  const campo = (v: string | number | null) => {
    const s = v === null ? "" : String(v);
    return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const valor = (c: number) => (c / 100).toFixed(2).replace(".", ",");
  const linhas: (string | number | null)[][] = [
    ["Seção", "Data", "Descrição", "Cliente ou fornecedor", "Categoria", "Forma", "Valor", "Situação"],
    ...d.recebimentos.map((r) => ["Recebimento", dia(r.dia), `${r.parcela}${r.contrato ? ` · contrato ${r.contrato}` : ""}`, r.cliente, tipoReceita(r.tipo),
      FORMAS_PAGAMENTO[r.forma], valor(r.valor + r.multaJuros), r.recibo ? `Recibo ${r.recibo}` : null]),
    ...d.despesas.map((x) => ["Despesa", dia(x.dia), x.descricao, x.fornecedor, CATEGORIAS_SAIDA[x.categoria], x.forma ? FORMAS_PAGAMENTO[x.forma] : null,
      valor(x.valor), [x.cliente ? `Adiantada para ${x.cliente}` : null, falta?.has(chaveDespesa(x)) ? "Falta a nota" : null].filter(Boolean).join(" · ") || null]),
    ...d.terceiros.filter((t) => t.para !== "HONORARIOS" && t.para !== "REEMBOLSO").map((t) => [
      "Terceiros (não é receita)", dia(t.feitoEm ?? t.entrouEm), `${TIPOS_LEVANTAMENTO[t.tipo]} · ${t.caso}`, t.nome, PARA_DESTINACAO[t.para], null,
      valor(t.valor), SITUACAO[t.situacao]]),
  ];
  return "﻿" + linhas.map((l) => l.map(campo).join(";")).join("\r\n") + "\r\n";
}

/** O arquivo pronto para salvar. */
export function arquivoContador(d: DadosExportacao, formato: FormatoExportacao, semNota?: SemNota): { nome: string; tipo: string; dados: Uint8Array | string } {
  const base = d.escritorio.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  const nome = `contador-${base || "escritorio"}-${d.mes.slice(0, 7)}`;
  return formato === "CSV"
    ? { nome: `${nome}.csv`, tipo: "text/csv;charset=utf-8", dados: csvContador(d, semNota) }
    : { nome: `${nome}.xlsx`, tipo: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", dados: planilhaXlsx(abasContador(d, semNota)) };
}
