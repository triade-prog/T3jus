// A leitura do .docx para o PDF em leiaute simples (D23, CH-08).
import { describe, expect, it } from "vitest";
import { conferirDocx, criarDocx, lerDocxParaPdf, nomeDoPdf } from "./docx.ts";
import { timbradoDoDocx, type EscritorioNoPapel } from "./timbrado.ts";
import { abrirTexto, escreverZip, lerZip } from "./zip.ts";

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
    // F3.146: o logo vai em cima e as linhas inteiras embaixo (a 1ª não vira mais o logo).
    expect(l.cabecalho.map((p) => p.pedacos.map((x) => x.texto).join(""))).toEqual(["Ribeiro & Matos", "CNPJ 41.276.839/0001-34"]);
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

// O cabeçalho do .docx com as 4 linhas (F3.146, PA-07, razao-social-sobras D4, decisões 15 a 18).
const SANTANA: EscritorioNoPapel = {
  nome: "Santana Advocacia", tipo: "SOCIEDADE", razaoSocial: "SANTANA, LIMA E OLIVEIRA SOCIEDADE DE ADVOGADOS",
  cnpj: "47318552000106", oab: "OAB/BA 4.217", cep: "41820020", logradouro: "Av. Tancredo Neves", numero: "1.632", complemento: "sala 1.208",
  bairro: "Caminho das Árvores", cidade: "Salvador", uf: "BA", endereco: null, telefone: "7133524180", email: "contato@santana.adv.br",
  site: "santana.adv.br", whatsapp: null,
};
async function parte(b: Uint8Array, nome: string): Promise<string> {
  const m = lerZip(b);
  return await abrirTexto(b, m.get(nome)!);
}

describe("o cabeçalho do .docx com as 4 linhas (F3.146)", () => {
  it("4 parágrafos, a 10 mm da borda; CNPJ, CEP e telefone com espaço e hífen que não quebram", async () => {
    const b = await criarDocx([{ texto: "Corpo." }], timbradoDoDocx(SANTANA, { logo: false }));
    const hdr = await parte(b, "word/header1.xml");
    expect(hdr.match(/<w:p>/g)).toHaveLength(4);
    expect(hdr).toContain('<w:sz w:val="26"/>');
    expect(hdr).toContain("CNPJ\u00a047.318.552/0001</w:t><w:noBreakHyphen/>");
    expect(hdr).toContain("CEP\u00a041820</w:t><w:noBreakHyphen/>");
    expect(hdr).not.toContain("\u2011");
    expect(hdr).not.toMatch(/falta|confira/);
    expect(await parte(b, "word/document.xml")).toContain('w:header="567"');
    // O PDF do contrato lê o hífen que não quebra: o CNPJ sai inteiro.
    const l = await lerDocxParaPdf(b);
    expect(l.cabecalhoMm).toBeCloseTo(10, 1);
    expect(l.cabecalho.map((p) => p.pedacos.map((x) => x.texto).join("").replace(/\u00a0/g, " "))).toEqual([
      "SANTANA, LIMA E OLIVEIRA SOCIEDADE DE ADVOGADOS",
      "CNPJ 47.318.552/0001-06 · OAB/BA 4.217",
      "Av. Tancredo Neves, 1.632, sala 1.208, Caminho das Árvores, Salvador/BA, CEP 41820-020",
      "(71) 3352-4180 · contato@santana.adv.br · santana.adv.br",
    ]);
    expect(l.cabecalho[0]!.tamanho).toBe(13);
    expect(l.cabecalho[1]!.tamanho).toBe(9);
  });

  it("150 letras: a 1ª linha em 11 pt", async () => {
    const razao = "SANTANA, LIMA, OLIVEIRA, ALBUQUERQUE CAVALCANTI, VASCONCELOS FIGUEIREDO, MENEZES, ANDRADE, QUEIROZ MONTEIRO E BITTENCOURT PRADO SOCIEDADE DE ADVOGADOS";
    const b = await criarDocx([{ texto: "Corpo." }], timbradoDoDocx({ ...SANTANA, razaoSocial: razao }, { logo: false }));
    expect(await parte(b, "word/header1.xml")).toContain('<w:b/><w:sz w:val="22"/>');
  });

  it("logo e nome: o nome curto ao lado do logo, o texto alternativo é o nome curto e a razão social embaixo; caixa de 92 × 12 mm", async () => {
    const logo = { png: PNG_1X1, largura: 100, altura: 100, comNome: true, nome: "Santana Advocacia" };
    const b = await criarDocx([{ texto: "Corpo." }], timbradoDoDocx(SANTANA, { logo: true }), logo);
    const hdr = await parte(b, "word/header1.xml");
    expect(hdr).toContain('descr="Santana Advocacia"');
    expect(hdr).toContain('cy="432000"');
    const l = await lerDocxParaPdf(b);
    expect(l.cabecalho.map((p) => p.pedacos.map((x) => x.texto).join("").trim())[0]).toBe("Santana Advocacia");
    expect(l.cabecalho[1]!.pedacos[0]!.texto).toBe("SANTANA, LIMA E OLIVEIRA SOCIEDADE DE ADVOGADOS");
    expect(l.cabecalho).toHaveLength(5);
    expect(l.imagemCabecalho?.alturaMm).toBeCloseTo(12, 1);
  });

  it("razão social vazia com logo: a 1ª linha sai, o fio fica na última", async () => {
    const logo = { png: PNG_1X1, largura: 300, altura: 60, comNome: false, nome: "Santana Advocacia" };
    const b = await criarDocx([{ texto: "Corpo." }], timbradoDoDocx({ ...SANTANA, razaoSocial: null }, { logo: true }), logo);
    const hdr = await parte(b, "word/header1.xml");
    expect(hdr).not.toContain("<w:b/><w:sz");
    expect(hdr.match(/<w:pBdr>/g)).toHaveLength(1);
    expect((await lerDocxParaPdf(b)).cabecalho).toHaveLength(3);
  });

  it("o leitor dos campos mostra o hífen e o preenchimento não o troca", async () => {
    const b = await criarDocx([{ texto: "[CLIENTE_NOME]" }], timbradoDoDocx(SANTANA, { logo: false }));
    const c = await conferirDocx(b);
    expect(c.campos).toEqual(["CLIENTE_NOME"]);
    expect(c.faltas).toEqual([]);
  });
});
