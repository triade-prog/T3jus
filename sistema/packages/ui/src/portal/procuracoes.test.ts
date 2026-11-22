// As contas das telas de Procurações e modelos (F3.16), sem React.
import { describe, expect, it } from "vitest";
import type { Anexo, DadosDocumentos, DocumentosDoContrato } from "@t3jus/domain";
import { baixarNoCabecalho, botaoGerar, errosDocumentos, formInicialDocumentos, fraseVaoSair, pedidoDocumentos, problemaDoAssinado, problemaDosAssinados, seloAssinado, tituloFaltas } from "./procuracoes.ts";

const insc = (id: string) => ({ id, uf: "SP", numero: "214538", letra: null, tipo: "PRINCIPAL", versao: 1, texto: "OAB/SP 214.538", documento: "OAB/SP nº 214.538" }) as const;
const base = (extra: Partial<DadosDocumentos> = {}): DadosDocumentos => ({
  contrato: { id: "c", numero: "C-2026-033", objeto: "Aposentadoria", estado: "ELABORACAO", assinadoEm: null, versao: 1 },
  cliente: { id: "cl", nome: "Benedito Souza Lima", tipo: "PF", documento: null, nacionalidade: null, estadoCivil: null, profissao: null, rg: null, rgOrgao: null,
    endereco: null, bairro: null, cidade: null, uf: null, cep: null, repNome: null, repCargo: null, repDocumento: null, repEstadoCivil: null, repProfissao: null, versao: 1 },
  condicoes: [], casos: [],
  advogados: [
    { pessoaId: "m", nome: "Marina Ribeiro", noContrato: true, responsavel: true, inscricoes: [insc("i1")], escolhidas: ["i1"] },
    { pessoaId: "l", nome: "Larissa Costa", noContrato: false, responsavel: false, inscricoes: [insc("i2")], escolhidas: ["i2"] },
  ],
  semOab: [], escritorio: { nome: "Ribeiro & Matos", cnpj: null, endereco: null, cidade: "São Paulo", uf: "SP", oab: null }, marca: null, hoje: "2026-11-21",
  modelos: [
    { tipo: "CONTRATO", modeloId: null, nome: "Contrato de honorários", numero: null, padrao: "CONTRATO", emRevisao: true },
    { tipo: "PROCURACAO", modeloId: null, nome: "Procuração", numero: null, padrao: "PROCURACAO", emRevisao: true },
    { tipo: "HIPOSSUFICIENCIA", modeloId: null, nome: "Declaração de hipossuficiência", numero: null, padrao: "HIPOSSUFICIENCIA_PF", emRevisao: true },
  ],
  atuais: [], ultima: null, mudancas: [], poderesIniciais: ["ACORDO", "RECEBER_QUITAR"],
  ...extra,
});

describe("Procurações e modelos: a página de gerar", () => {
  it("começa com os três documentos, os advogados do contrato e os poderes na ordem da tela", () => {
    const f = formInicialDocumentos(base());
    expect(f.docs).toEqual(["CONTRATO", "PROCURACAO", "HIPOSSUFICIENCIA"]);
    expect(f.outorgados).toEqual({ m: ["i1"] });
    expect(f.poderes).toEqual(["RECEBER_QUITAR", "ACORDO"]);
    expect(f.cidadeData).toBe("São Paulo, 21 de novembro de 2026");
    expect(fraseVaoSair(base(), f)).toBe("Vão sair 3 arquivos .docx: contrato, procuração e declaração.");
    expect(botaoGerar(base(), f)).toBe("Gerar 3 documentos");
    expect(pedidoDocumentos(base(), f).outorgados).toEqual([{ pessoaId: "m", inscricoes: ["i1"] }]);
  });

  it("o contrato já assinado e o documento com assinado vêm desmarcados; gerar de novo vira versão 2", () => {
    const d = base({
      contrato: { id: "c", numero: "C-2026-033", objeto: "x", estado: "ATIVO", assinadoEm: "2026-09-02", versao: 2 },
      atuais: [{ chave: "PROCURACAO", tipo: "PROCURACAO", modeloId: null, numero: 1, geradoEm: "2026-09-01T12:00:00Z", assinado: false }],
      ultima: { geracaoId: "g", em: "2026-09-01T12:00:00Z", por: { id: "m", nome: "Marina Ribeiro" }, documentos: [{ tipo: "CONTRATO", modeloId: null }, { tipo: "PROCURACAO", modeloId: null }],
        outorgados: [{ pessoaId: "l", inscricoes: ["i2"] }], poderes: ["DESISTIR"], outroPoder: "representar perante o INSS", cidadeData: "x" },
    });
    const f = formInicialDocumentos(d);
    expect(f.docs).toEqual(["PROCURACAO"]);
    expect(f.outorgados).toEqual({ l: ["i2"] });
    expect(f.outroPoder).toBe("representar perante o INSS");
    expect(botaoGerar(d, f)).toBe("Gerar a versão 2");
  });

  it("só bloqueia nenhum documento e nenhum outorgado (e o tamanho dos textos)", () => {
    const f = { docs: [], outorgados: {}, poderes: [], outroPoder: "", cidadeData: "SP" };
    expect(errosDocumentos(f)).toEqual({ documentos: "DOCUMENTO_OBRIGATORIO", outorgados: "SEM_OUTORGADO", cidadeData: "CIDADE_DATA_OBRIGATORIA" });
    expect(tituloFaltas(["o RG"], "Benedito Souza Lima")).toBe("Falta 1 dado de Benedito: o RG.");
    expect(tituloFaltas(["o RG", "a profissão"], "Benedito Souza Lima")).toBe("Faltam 2 dados de Benedito: o RG e a profissão.");
  });
});

describe("Procurações e modelos: os assinados", () => {
  it("o .docx gerado não serve como assinado; PDF e foto até 10 MB, sim", () => {
    expect(problemaDoAssinado("contrato.docx", 100)).toMatch(/é o .docx gerado/);
    expect(problemaDoAssinado("contrato.pdf", 11 * 1024 * 1024)).toMatch(/10 MB/);
    expect(problemaDoAssinado("foto.JPG", 900)).toBeNull();
    // Várias páginas (F3.99): um PDF só ou até 10 fotos, sem misturar.
    const foto = (n: number) => ({ name: `IMG_${n}.jpg`, size: 2_000_000 });
    expect(problemaDosAssinados([])).toBeNull();
    expect(problemaDosAssinados([foto(1), foto(2), { name: "p3.png", size: 900 }])).toBeNull();
    expect(problemaDosAssinados(Array.from({ length: 10 }, (_, i) => foto(i)))).toBeNull();
    expect(problemaDosAssinados(Array.from({ length: 11 }, (_, i) => foto(i)))).toMatch(/São 11 fotos, e o limite é 10/);
    expect(problemaDosAssinados([foto(1), { name: "resto.pdf", size: 900 }])).toMatch(/sem misturar PDF e foto/);
    expect(problemaDosAssinados([foto(1), { name: "contrato.docx", size: 900 }])).toMatch(/é o .docx gerado/);
    expect(problemaDosAssinados([foto(1), { name: "grande.jpg", size: 11 * 1024 * 1024 }])).toMatch(/^grande\.jpg: o arquivo passou de 10 MB/);
    expect(seloAssinado("PROCURACAO", "2026-10-30")).toBe("Assinada em 30/10");
    expect(seloAssinado("CONTRATO", null)).toBe("Assinado");
  });
});

describe("Baixar o contrato no cabeçalho da ficha (D29)", () => {
  const pessoa = { id: "m", nome: "Marina Ribeiro" };
  const versao = (n: number, assinados: { anexoId: string; nome: string }[] = []) => ({
    id: `v${n}`, numero: n, arquivo: `contrato-v${n}.docx`, geracaoId: "g", modelo: { nome: "Contrato", padrao: true, numero: null }, geradoPor: pessoa,
    geradoEm: "2026-09-01T15:00:00Z", marcados: [], assinados: assinados.map((a) => ({ ...a, assinadoEm: null, enviadoPor: pessoa, enviadoEm: "2026-09-02T15:00:00Z" })),
  });
  const docs = (documentos: DocumentosDoContrato["documentos"], podeGerar = true): DocumentosDoContrato => ({
    contrato: { id: "c", numero: "C-2026-019", estado: "ATIVO", assinadoEm: null, versao: 1, cliente: { id: "cl", nome: "Farmácia Bom Jesus Ltda." } },
    documentos, faltam: 0, ultima: null, podeGerar,
  });
  const contrato = (v: ReturnType<typeof versao>) => ({ chave: "CONTRATO", tipo: "CONTRATO" as const, nome: "Contrato de honorários", situacao: "FALTA" as const, atual: v, anteriores: [] });
  const procuracao = { chave: "PROCURACAO", tipo: "PROCURACAO" as const, nome: "Procuração", situacao: "FALTA" as const, atual: versao(1), anteriores: [] };
  const anexo = { id: "a1", categoria: "CONTRATO_ASSINADO", nome: "assinado.jpg", tipo: "IMAGEM", tamanho: 10, donoId: "c", enviadoPor: pessoa, enviadoEm: "2026-09-03T15:00:00Z" } as unknown as Anexo;

  it("nada enquanto carrega ou com erro", () => {
    expect(baixarNoCabecalho(null, null, "ATIVO")).toBeNull();
    expect(baixarNoCabecalho("erro", [], "ATIVO")).toBeNull();
  });
  it("o contrato gerado mais recente, com a versão e o dia em Brasília", () => {
    expect(baixarNoCabecalho(docs([procuracao, contrato(versao(2))]), [], "ATIVO")).toEqual({ tipo: "gerado", documentoId: "v2", qual: "v2 · gerado em 01/09/2026" });
  });
  it("com o assinado do contrato, só o assinado (pergunta 4)", () => {
    expect(baixarNoCabecalho(docs([contrato(versao(1, [{ anexoId: "x", nome: "contrato-assinado.pdf" }]))]), [], "ATIVO"))
      .toEqual({ tipo: "assinado", anexoId: "x", nome: "contrato-assinado.pdf", formato: "PDF", qual: "contrato-assinado.pdf · anexado em 02/09/2026" });
  });
  it("sem contrato gerado, o assinado da folha Assinatura (pergunta 3)", () => {
    expect(baixarNoCabecalho(docs([procuracao]), [anexo], "ATIVO")).toMatchObject({ tipo: "assinado", anexoId: "a1", formato: "foto" });
  });
  it("sem nada: Gerar o contrato para quem pode, fora de encerrado (pergunta 2)", () => {
    expect(baixarNoCabecalho(docs([]), [], "ATIVO")).toEqual({ tipo: "gerar" });
    expect(baixarNoCabecalho(docs([]), [], "ENCERRADO")).toBeNull();
    expect(baixarNoCabecalho(docs([], false), [], "ATIVO")).toBeNull();
  });
});
