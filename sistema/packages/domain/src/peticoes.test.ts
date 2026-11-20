import { describe, expect, it } from "vitest";
import {
  conferirDocx, criarDocx, marcarRascunho, paragrafosDocx, preencherDocx, escreverZip, lerZip, abrirTexto,
  MODELOS_PADRAO, camposDoPadrao, campoConhecido, montarValores, montarPrevia, valorPorExtenso, dataPorExtenso,
  enderecamentoSugerido, qualificacaoDoCliente, sugestaoCampo, nomeArquivoPeticao, marcadosDoModelo,
  type DadosPeticao, type ClienteDaPeticao, type ErroDocx,
} from "./index.ts";

const enc = new TextEncoder();
const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';

/** Um .docx mínimo com o corpo dado (e um cabeçalho, se pedido). */
async function docx(corpo: string, extra: { nome: string; texto: string }[] = [], tipos = ""): Promise<Uint8Array> {
  return await escreverZip([
    { nome: "[Content_Types].xml", dados: enc.encode(`<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>${tipos}</Types>`) },
    { nome: "word/document.xml", dados: enc.encode(`<?xml version="1.0"?><w:document ${W}><w:body>${corpo}</w:body></w:document>`) },
    ...extra.map((e) => ({ nome: e.nome, dados: enc.encode(e.texto) })),
  ]);
}

async function xml(b: Uint8Array, nome = "word/document.xml") {
  const m = lerZip(b);
  return await abrirTexto(b, m.get(nome)!);
}

describe("o .docx das petições (EX-09)", () => {
  it("decisão 5: acha os campos, inclusive quebrados pelo Word em vários pedaços", async () => {
    const b = await docx('<w:p><w:r><w:t>Processo nº [NUMERO_</w:t></w:r><w:r><w:rPr><w:b/></w:rPr><w:t>PROCESSO]</w:t></w:r><w:r><w:t xml:space="preserve"> e [NOME_RECLAMADA]</w:t></w:r></w:p><w:p><w:r><w:t>[NUMERO_PROCESSO]</w:t></w:r></w:p>');
    const c = await conferirDocx(b);
    expect(c.campos).toEqual(["NUMERO_PROCESSO", "NOME_RECLAMADA"]);
    expect(c.paragrafos).toEqual(["Processo nº [NUMERO_PROCESSO] e [NOME_RECLAMADA]", "[NUMERO_PROCESSO]"]);
  });

  it("decisão 5: PDF, .doc antigo, macro e arquivo qualquer são recusados", async () => {
    const motivo = async (b: Uint8Array) => conferirDocx(b).then(() => null, (e: ErroDocx) => e.motivo);
    expect(await motivo(enc.encode("%PDF-1.7 ..."))).toBe("ARQUIVO_PDF");
    expect(await motivo(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 1, 2]))).toBe("ARQUIVO_DOC_ANTIGO");
    expect(await motivo(enc.encode("texto"))).toBe("ARQUIVO_INVALIDO");
    expect(await motivo(new Uint8Array())).toBe("ARQUIVO_VAZIO");
    expect(await motivo(new Uint8Array(5 * 1024 * 1024 + 1))).toBe("ARQUIVO_GRANDE");
    const macro = await docx("<w:p/>", [{ nome: "word/vbaProject.bin", texto: "x" }]);
    expect(await motivo(macro)).toBe("ARQUIVO_MACRO");
    const xlsx = await escreverZip([
      { nome: "[Content_Types].xml", dados: enc.encode("<Types/>") },
      { nome: "word/document.xml", dados: enc.encode("<x/>") },
    ]);
    expect(await motivo(xlsx)).toBe("ARQUIVO_INVALIDO");
  });

  it("preenche trocando só o texto, com a formatação de cada pedaço, e deixa o desconhecido", async () => {
    const b = await docx('<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>[CLIENTE_</w:t></w:r><w:r><w:t>NOME] &amp; [NOME_RECLAMADA]</w:t></w:r></w:p>');
    const saida = await preencherDocx(b, { CLIENTE_NOME: "JOANA <PEREIRA>", ADVOGADOS_ASSINATURA: "x" });
    const x = await xml(saida);
    expect(x).toContain('<w:rPr><w:b/></w:rPr><w:t xml:space="preserve">JOANA &lt;PEREIRA&gt;</w:t>');
    expect(await paragrafosDocx(saida)).toEqual(["JOANA <PEREIRA> & [NOME_RECLAMADA]"]);
  });

  it("a quebra de linha do valor vira <w:br/> (o bloco de assinatura)", async () => {
    const b = await docx("<w:p><w:r><w:t>[ADVOGADOS_ASSINATURA]</w:t></w:r></w:p>");
    const x = await xml(await preencherDocx(b, { ADVOGADOS_ASSINATURA: "MARINA RIBEIRO\nOAB/SP nº 214.538" }));
    expect(x).toContain('MARINA RIBEIRO</w:t><w:br/><w:t xml:space="preserve">OAB/SP nº 214.538');
  });

  it("preenche também o cabeçalho e o rodapé", async () => {
    const b = await docx("<w:p><w:r><w:t>Oi</w:t></w:r></w:p>", [{ nome: "word/header1.xml", texto: `<w:hdr ${W}><w:p><w:r><w:t>[ESCRITORIO_NOME]</w:t></w:r></w:p></w:hdr>` }]);
    expect(await xml(await preencherDocx(b, { ESCRITORIO_NOME: "Ribeiro &amp; Matos" }), "word/header1.xml")).toContain("Ribeiro &amp;amp; Matos");
  });

  it("decisão 19: o rascunho ganha a marca no cabeçalho; o cabeçalho do escritório continua", async () => {
    const sem = await marcarRascunho(await docx("<w:p><w:r><w:t>Texto</w:t></w:r></w:p><w:sectPr><w:pgSz w:w=\"11906\"/></w:sectPr>"));
    expect(await xml(sem)).toContain('<w:sectPr><w:headerReference w:type="default" r:id="rIdT3jusRascunho"/>');
    expect(await xml(sem, "word/headerT3jusRascunho.xml")).toContain("Rascunho · em revisão");
    expect(await xml(sem, "[Content_Types].xml")).toContain("/word/headerT3jusRascunho.xml");
    expect(await xml(sem, "word/_rels/document.xml.rels")).toContain('Id="rIdT3jusRascunho"');

    const com = await marcarRascunho(await docx(
      '<w:p/><w:sectPr><w:headerReference w:type="default" r:id="rId7"/></w:sectPr>',
      [
        { nome: "word/_rels/document.xml.rels", texto: '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId7" Type="x" Target="header1.xml"/></Relationships>' },
        { nome: "word/header1.xml", texto: `<w:hdr ${W}><w:p><w:r><w:t>Timbre</w:t></w:r></w:p></w:hdr>` },
      ],
    ));
    const h = await xml(com, "word/header1.xml");
    expect(h.indexOf("Rascunho · em revisão")).toBeLessThan(h.indexOf("Timbre"));
    expect(lerZip(com).has("word/headerT3jusRascunho.xml")).toBe(false);
  });

  it("os 8 modelos padrão viram .docx e só usam campos conhecidos", async () => {
    expect(MODELOS_PADRAO).toHaveLength(8);
    for (const m of MODELOS_PADRAO) {
      expect(camposDoPadrao(m).every(campoConhecido), m.codigo).toBe(true);
      const c = await conferirDocx(await criarDocx(m.paragrafos));
      expect(c.campos).toEqual(camposDoPadrao(m));
    }
  });
});

const joana: ClienteDaPeticao = {
  id: "c1", nome: "Joana Pereira", tipo: "PF", papel: "AUTOR", documento: "52998224725", nacionalidade: "Brasileira", estadoCivil: "SOLTEIRO",
  profissao: "Operadora de caixa", rg: "28.441.903-1", rgOrgao: "SSP/SP", endereco: "Rua Doutor Zuquim, 1.480, apto. 32", bairro: "Santana",
  cidade: "São Paulo", uf: "SP", cep: "02035021", repNome: null, repCargo: null,
};
const carlos: ClienteDaPeticao = { ...joana, id: "c2", nome: "Carlos Henrique Dias", rg: null, rgOrgao: null, estadoCivil: "CASADO", profissao: "Repositor" };
const dados: DadosPeticao = {
  caso: { id: "k", nome: "Pereira x Mercado", area: "TRABALHISTA", numero: null, vara: "45ª Vara do Trabalho de São Paulo", tribunal: "TRT-2", sistema: "PJe",
    parteContraria: "Mercado Bom Preço Ltda.", parteContrariaQualificacao: null, valorCausa: 8640000, responsavel: { id: "p1", nome: "Marina Ribeiro" } },
  clientes: [joana, carlos],
  advogados: [
    { pessoaId: "p1", nome: "Marina Ribeiro", responsavel: true, socioDono: true, inscricoes: [{ id: "i1", uf: "SP", numero: "214538", letra: null, tipo: "PRINCIPAL", versao: 1, texto: "", documento: "" }] },
    { pessoaId: "p2", nome: "Felipe Matos", responsavel: false, socioDono: false, inscricoes: [
      { id: "i2", uf: "SP", numero: "287104", letra: null, tipo: "PRINCIPAL", versao: 1, texto: "", documento: "" },
      { id: "i3", uf: "RJ", numero: "245880", letra: "S", tipo: "SUPLEMENTAR", versao: 1, texto: "", documento: "" },
    ] },
  ],
  semOab: [], escritorio: { nome: "Ribeiro & Matos", endereco: "Av. Paulista, 2.100", cidade: "São Paulo", uf: "SP" }, hoje: "2026-11-18",
  revisor: null, semRevisao: "RESPONSAVEL",
};

describe("os valores da petição (EX-09)", () => {
  it("decisão 8: o que falta sai marcado e entra na lista; as partes ligadas por “e”", () => {
    const v = montarValores(dados, {
      partes: ["c1", "c2"], advogados: [{ pessoaId: "p1", inscricoes: ["i1"] }, { pessoaId: "p2", inscricoes: ["i2"] }],
      enderecamento: "Excelentíssimo", cidadeData: "São Paulo, 18 de novembro de 2026",
    });
    expect(v.valores.PARTES_QUALIFICACAO).toBe(
      "JOANA PEREIRA, brasileira, solteiro(a), operadora de caixa, portador(a) do RG nº 28.441.903-1 SSP/SP, inscrito(a) no CPF sob o nº 529.982.247-25, " +
      "residente na Rua Doutor Zuquim, 1.480, apto. 32, Santana, São Paulo, SP, CEP 02035-021 e CARLOS HENRIQUE DIAS, brasileira, casado(a), repositor, " +
      "portador(a) do RG nº [RG: falta], inscrito(a) no CPF sob o nº 529.982.247-25, residente na Rua Doutor Zuquim, 1.480, apto. 32, Santana, São Paulo, SP, CEP 02035-021");
    expect(v.valores.NUMERO_PROCESSO).toBe("[NÚMERO DO PROCESSO: falta]");
    expect(v.marcados).toEqual(["RG de Carlos Henrique Dias", "Número do processo"]);
    expect(marcadosDoModelo(v, ["ENDERECAMENTO"])).toEqual([]);
    expect(v.valores.VALOR_CAUSA).toBe("R$ 86.400,00");
    expect(v.valores.VALOR_CAUSA_EXTENSO).toBe("oitenta e seis mil e quatrocentos reais");
    expect(v.valores.ADVOGADOS_OAB).toBe("MARINA RIBEIRO, OAB/SP nº 214.538, e FELIPE MATOS, OAB/SP nº 287.104");
    expect(v.valores.ADVOGADOS_ASSINATURA).toBe("MARINA RIBEIRO\nOAB/SP nº 214.538\n\nFELIPE MATOS\nOAB/SP nº 287.104");
  });

  it("quem tem mais de uma inscrição entra com as marcadas, a principal primeiro", () => {
    const v = montarValores(dados, { partes: ["c1"], advogados: [{ pessoaId: "p2", inscricoes: ["i3", "i2"] }], enderecamento: "x", cidadeData: "y" });
    expect(v.valores.ADVOGADOS_OAB).toBe("FELIPE MATOS, OAB/SP nº 287.104 e OAB/RJ nº 245.880-S");
  });

  it("o número escrito no formulário vale só ali e vem formatado", () => {
    const v = montarValores(dados, { partes: ["c1"], advogados: [], enderecamento: "x", cidadeData: "y", numero: "1001022-33.2026.5.02.0045" });
    expect(v.valores.NUMERO_PROCESSO).toBe("1001022-33.2026.5.02.0045");
    expect(v.origem.NUMERO_PROCESSO).toBe("formulario");
  });

  it("decisão 10: a prévia marca cadastro, formulário, falta e campo desconhecido", () => {
    const v = montarValores(dados, { partes: ["c2"], advogados: [], enderecamento: "Excelentíssimo", cidadeData: "y" });
    const [p] = montarPrevia(["[ENDERECAMENTO] — RG [CLIENTE_RG] e [NOME_RECLAMADA]."], v);
    expect(p).toEqual([
      { t: "formulario", texto: "Excelentíssimo" }, { t: "fixo", texto: " — RG " }, { t: "falta", texto: "[RG: falta]" },
      { t: "fixo", texto: " e " }, { t: "desconhecido", texto: "[NOME_RECLAMADA]" }, { t: "fixo", texto: "." },
    ]);
  });

  it("a PJ sai como pessoa jurídica, com o CNPJ e quem a representa", () => {
    expect(qualificacaoDoCliente({ ...joana, tipo: "PJ", documento: "11222333000181", repNome: "Ana Lima", repCargo: "sócia" }))
      .toBe("pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 11.222.333/0001-81, com sede na Rua Doutor Zuquim, 1.480, apto. 32, Santana, São Paulo, SP, CEP 02035-021, neste ato representada por Ana Lima, sócia");
  });

  it("valor por extenso, data por extenso e endereçamento", () => {
    expect(valorPorExtenso(3984000)).toBe("trinta e nove mil, oitocentos e quarenta reais".replace(", ", " "));
    expect(valorPorExtenso(150)).toBe("um real e cinquenta centavos");
    expect(valorPorExtenso(100000000)).toBe("um milhão de reais");
    expect(valorPorExtenso(250000000)).toBe("dois milhões e quinhentos mil reais");
    expect(valorPorExtenso(110000)).toBe("mil e cem reais");
    expect(valorPorExtenso(123000)).toBe("mil duzentos e trinta reais");
    expect(dataPorExtenso("2026-11-18")).toBe("18 de novembro de 2026");
    expect(enderecamentoSugerido(dados.caso, "SP")).toBe("Excelentíssimo(a) Senhor(a) Juiz(íza) da 45ª Vara do Trabalho de São Paulo – SP");
    expect(enderecamentoSugerido({ area: "CIVEL", vara: null, tribunal: null })).toBe("Excelentíssimo(a) Senhor(a) Juiz(íza) de Direito");
  });

  it("decisão 5: sugere o campo certo para o desconhecido; o nome do arquivo", () => {
    expect(sugestaoCampo("NOME_RECLAMADA")).toBe("PARTE_CONTRARIA");
    expect(sugestaoCampo("XPTO")).toBeNull();
    expect(nomeArquivoPeticao("Recurso ordinário", "Pereira x Mercado Bom Preço")).toBe("recurso-ordinario-pereira-x-mercado-bom-preco.docx");
    expect(nomeArquivoPeticao("Juntada", "Caso", 2)).toBe("juntada-caso-v2.docx");
  });
});
