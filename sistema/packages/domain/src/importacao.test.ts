import { describe, expect, it } from "vitest";
import { dataDoExcel, lerCsv, lerPlanilha, type ErroArquivo } from "./importacao.ts";

// Um .zip mínimo (só o que o leitor usa: diretório central e cabeçalhos locais).
async function deflate(cru: Uint8Array): Promise<Uint8Array> {
  const s = new Blob([cru.slice()]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(s).arrayBuffer());
}

async function zip(arquivos: Record<string, string>, comprimir = true): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const locais: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let pos = 0;
  for (const [nome, texto] of Object.entries(arquivos)) {
    const n = enc.encode(nome);
    const cru = enc.encode(texto);
    const dados = comprimir ? await deflate(cru) : cru;
    const l = new DataView(new ArrayBuffer(30));
    l.setUint32(0, 0x04034b50, true);
    l.setUint16(8, comprimir ? 8 : 0, true);
    l.setUint32(18, dados.length, true);
    l.setUint32(22, cru.length, true);
    l.setUint16(26, n.length, true);
    locais.push(new Uint8Array(l.buffer), n, dados);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(10, comprimir ? 8 : 0, true);
    c.setUint32(20, dados.length, true);
    c.setUint32(24, cru.length, true);
    c.setUint16(28, n.length, true);
    c.setUint32(42, pos, true);
    central.push(new Uint8Array(c.buffer), n);
    pos += 30 + n.length + dados.length;
  }
  const tamCentral = central.reduce((a, b) => a + b.length, 0);
  const fim = new DataView(new ArrayBuffer(22));
  fim.setUint32(0, 0x06054b50, true);
  fim.setUint16(8, Object.keys(arquivos).length, true);
  fim.setUint16(10, Object.keys(arquivos).length, true);
  fim.setUint32(12, tamCentral, true);
  fim.setUint32(16, pos, true);
  const partes = [...locais, ...central, new Uint8Array(fim.buffer)];
  const out = new Uint8Array(partes.reduce((a, b) => a + b.length, 0));
  let p = 0;
  for (const x of partes) { out.set(x, p); p += x.length; }
  return out;
}

const LIVRO = `<workbook xmlns:r="r"><sheets><sheet name="Clientes &amp; contratos" sheetId="1" r:id="rId1"/><sheet name="Resumo" sheetId="2" r:id="rId2"/></sheets></workbook>`;
const RELS = `<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="/xl/worksheets/sheet2.xml"/></Relationships>`;
const SST = `<sst><si><t>Nome</t></si><si><t>CPF</t></si><si><r><t>Rosa </t></r><r><t>Almeida</t></r></si><si><t>Valor</t></si><si><t>1º vencto</t></si></sst>`;
const ESTILOS = `<styleSheet><numFmts><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts><cellXfs count="3"><xf numFmtId="0"/><xf numFmtId="164"/><xf numFmtId="4"/></cellXfs></styleSheet>`;
const ABA1 = `<worksheet><sheetData>
<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>3</v></c><c r="D1" t="s"><v>4</v></c></row>
<row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2"><v>52998224725</v></c><c r="C2" s="2"><v>4800.5</v></c><c r="D2" s="1"><v>46275</v></c></row>
<row r="4"><c r="A4" t="inlineStr"><is><t>Vera &lt;Nunes&gt;</t></is></c><c r="C4"><v>1500</v></c></row>
</sheetData></worksheet>`;
const ABA2 = `<worksheet><sheetData></sheetData></worksheet>`;

describe("F3.55: ler a planilha (.xlsx e .csv) na memória", () => {
  it("lê as abas do .xlsx comprimido: textos, números com vírgula, datas e linhas vazias no meio", async () => {
    const b = await zip({ "xl/workbook.xml": LIVRO, "xl/_rels/workbook.xml.rels": RELS, "xl/sharedStrings.xml": SST, "xl/styles.xml": ESTILOS,
                    "xl/worksheets/sheet1.xml": ABA1, "xl/worksheets/sheet2.xml": ABA2 });
    const abas = await lerPlanilha(b, "clientes.xlsx");
    expect(abas[0]).toEqual({
      nome: "Clientes & contratos", colunas: ["Nome", "CPF", "Valor", "1º vencto"],
      linhas: [["Rosa Almeida", "52998224725", "4800,5", "10/09/2026"], ["", "", "", ""], ["Vera <Nunes>", "", "1500", ""]],
    });
    expect(abas[1]).toEqual({ nome: "Resumo", colunas: [], linhas: [] });
  });

  it("lê o .xlsx sem compressão", async () => {
    const b = await zip({ "xl/workbook.xml": LIVRO, "xl/_rels/workbook.xml.rels": RELS, "xl/sharedStrings.xml": SST, "xl/worksheets/sheet1.xml": ABA1 }, false);
    expect((await lerPlanilha(b, "a.xlsx"))[0]!.linhas[0]![0]).toBe("Rosa Almeida");
  });

  it("lê o .csv com ponto e vírgula, aspas e acentos do Windows", async () => {
    const texto = 'Nome;CPF;Obs.\r\n"Almeida; Rosa";529.982.247-25;"disse ""oi"""\r\nJoão;;\r\n';
    const latin = new Uint8Array([...texto].map((c) => (c === "ã" ? 0xe3 : c.charCodeAt(0))));
    const abas = await lerPlanilha(latin, "clientes.csv");
    expect(abas[0]!.linhas).toEqual([["Almeida; Rosa", "529.982.247-25", 'disse "oi"'], ["João", "", ""]]);
    expect(lerCsv("a,b\n1,2")).toEqual([["a", "b"], ["1", "2"]]);
  });

  it("decisão 9: cada problema de arquivo tem o seu motivo", async () => {
    const motivo = async (b: Uint8Array, nome: string) => (await lerPlanilha(b, nome).catch((e: ErroArquivo) => e)) as ErroArquivo;
    const enc = new TextEncoder();
    expect((await motivo(enc.encode("%PDF-1.7 ..."), "contrato.pdf")).motivo).toBe("ARQUIVO_FORMATO");
    expect((await motivo(enc.encode("%PDF-1.7"), "x.csv")).motivo).toBe("ARQUIVO_FORMATO");
    expect((await motivo(new Uint8Array(0), "x.csv")).motivo).toBe("ARQUIVO_VAZIO");
    expect((await motivo(enc.encode("Nome;CPF\n"), "x.csv")).motivo).toBe("ARQUIVO_VAZIO");
    expect((await motivo(enc.encode("529.982.247-25;rosa@x.com\nJoão;1\n"), "x.csv")).motivo).toBe("SEM_CABECALHO");
    expect((await motivo(enc.encode("Nome\n" + "a\n".repeat(2001)), "x.csv")).motivo).toBe("ARQUIVO_GRANDE");
    const ole = new Uint8Array(600);
    ole.set([0xd0, 0xcf, 0x11, 0xe0]);
    ole.set(new Uint8Array([...("EncryptedPackage")].flatMap((c) => [c.charCodeAt(0), 0])), 100);
    expect((await motivo(ole, "x.xlsx")).motivo).toBe("ARQUIVO_PROTEGIDO");
  });

  it("número de série do Excel vira data", () => {
    expect(dataDoExcel(46275)).toBe("10/09/2026");
    expect(dataDoExcel(1)).toBe("31/12/1899");
  });
});
