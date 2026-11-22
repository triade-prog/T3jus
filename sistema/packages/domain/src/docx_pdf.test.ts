// A leitura do .docx para o PDF em leiaute simples (D23, CH-08).
import { describe, expect, it } from "vitest";
import { criarDocx, lerDocxParaPdf, nomeDoPdf } from "./docx.ts";
import { escreverZip } from "./zip.ts";

const PNG_1X1 = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));

async function docxDe(corpo: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const w = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
  return await escreverZip([
    { nome: "[Content_Types].xml", dados: enc.encode('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>') },
    { nome: "word/document.xml", dados: enc.encode(`<?xml version="1.0"?><w:document ${w}><w:body>${corpo}</w:body></w:document>`) },
  ]);
}

describe("lerDocxParaPdf", () => {
  it("lê o padrão do T3jus: título centrado em negrito, texto justificado com recuo e o timbrado com o logo", async () => {
    const b = await criarDocx(
      [{ texto: "CONTRATO DE HONORÁRIOS", estilo: "titulo" }, { texto: "Cláusula primeira: o objeto." }, { texto: "Benedito\nCPF", estilo: "assinatura" }],
      ["Ribeiro & Matos", "CNPJ 41.276.839/0001-34"], { png: PNG_1X1, largura: 1, altura: 1, comNome: false });
    const l = await lerDocxParaPdf(b);
    expect(l.complexo).toBe(false);
    expect(l.corpo.map((p) => p.alinhamento)).toEqual(["centro", "justificado", "centro"]);
    expect(l.corpo[0]!.pedacos).toEqual([{ texto: "CONTRATO DE HONORÁRIOS", negrito: true, italico: false }]);
    expect(l.corpo[1]!.recuo).toBeCloseTo(25, 0);
    expect(l.corpo[1]!.tamanho).toBe(12);
    expect(l.corpo[2]!.pedacos[0]!.texto).toBe("Benedito\nCPF");
    expect(l.cabecalho.map((p) => p.pedacos.map((x) => x.texto).join(""))).toEqual(["CNPJ 41.276.839/0001-34"]);
    expect(l.imagemCabecalho?.tipo).toBe("png");
  });

  it("marca como complexo o modelo com tabela, imagem, caixa de texto ou colunas, e lê o texto deles", async () => {
    const tabela = await lerDocxParaPdf(await docxDe("<w:tbl><w:tr><w:tc><w:p><w:r><w:t>Na tabela</w:t></w:r></w:p></w:tc></w:tr></w:tbl>"));
    expect(tabela.complexo).toBe(true);
    expect(tabela.corpo.map((p) => p.pedacos.map((x) => x.texto).join(""))).toEqual(["Na tabela"]);
    expect((await lerDocxParaPdf(await docxDe("<w:p><w:r><w:drawing/></w:r></w:p>"))).complexo).toBe(true);
    expect((await lerDocxParaPdf(await docxDe('<w:p><w:r><w:t>a</w:t></w:r></w:p><w:sectPr><w:cols w:num="2"/></w:sectPr>'))).complexo).toBe(true);
    const caixa = await lerDocxParaPdf(await docxDe("<w:p><w:r><w:t>Fora</w:t></w:r><w:r><w:pict><w:txbxContent><w:p><w:r><w:t>Dentro</w:t></w:r></w:p></w:txbxContent></w:pict></w:r></w:p>"));
    expect(caixa.complexo).toBe(true);
    expect(caixa.corpo.map((p) => p.pedacos.map((x) => x.texto).join(""))).toEqual(["Dentro", "Fora"]);
  });

  it("junta os pedaços com o mesmo jeito e separa negrito e itálico; respeita o negrito desligado", async () => {
    const l = await lerDocxParaPdf(await docxDe(
      '<w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:t xml:space="preserve">São </w:t></w:r><w:r><w:t>Paulo</w:t></w:r>' +
      '<w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">, 21</w:t></w:r><w:r><w:rPr><w:b w:val="0"/><w:i/></w:rPr><w:t> de novembro</w:t></w:r></w:p>'));
    expect(l.corpo[0]!.alinhamento).toBe("direita");
    expect(l.corpo[0]!.pedacos).toEqual([
      { texto: "São Paulo", negrito: false, italico: false },
      { texto: ", 21", negrito: true, italico: false },
      { texto: " de novembro", negrito: false, italico: true },
    ]);
    expect(l.cabecalho).toEqual([]);
    expect(l.imagemCabecalho).toBeNull();
  });

  it("dá ao PDF o nome do .docx", () => {
    expect(nomeDoPdf("contrato-c-2026-033-benedito-lima-v2.docx")).toBe("contrato-c-2026-033-benedito-lima-v2.pdf");
  });
});
