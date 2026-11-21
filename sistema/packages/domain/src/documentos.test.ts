// F3.16 (CH-08): contrato, procuração e declaração. Os valores que entram nos campos, o que sai
// marcado, os modelos padrão e a conferência do modelo do escritório.
import { describe, expect, it } from "vitest";
import {
  camposDoPadraoDocumento, campoConhecidoDocumento, condicoesNoDocumento, conferenciaModeloDocumento, fraseMudancas, marcadosDoModeloDocumento,
  MODELOS_PADRAO_DOCUMENTO, modeloPadraoDocumento, montarValoresDocumento, nomeArquivoDocumento, nomeZipDocumentos, padraoDoTipo,
  previaDocumento, trechoPoderes, escolhasDocumentosSchema, type DadosDocumentos, type EscolhasDocumentos,
} from "./documentos.ts";
import { conferirDocx, criarDocx, paragrafosDocx, preencherDocx } from "./docx.ts";

const FELIPE = "11111111-1111-4111-8111-111111111111";
const SP = "22222222-2222-4222-8222-222222222222";
const RJ = "33333333-3333-4333-8333-333333333333";

export const DADOS: DadosDocumentos = {
  contrato: { id: "c1", numero: "C-2026-033", objeto: "Ação previdenciária de aposentadoria por idade.", estado: "ELABORACAO", assinadoEm: null, versao: 1 },
  cliente: {
    id: "k1", nome: "Benedito Souza Lima", tipo: "PF", documento: "52998224725", nacionalidade: "brasileiro", estadoCivil: "CASADO",
    profissao: "aposentado", rg: null, rgOrgao: null, endereco: "Rua das Flores, 120", bairro: "Centro", cidade: "Campinas", uf: "SP",
    cep: "13010000", repNome: null, repCargo: null, repDocumento: null, repEstadoCivil: null, repProfissao: null, versao: 3,
  },
  condicoes: [{ tipo: "PARCELADO", total: 600000, parcelas: 3, primeiro: "2026-12-10" }],
  casos: [],
  advogados: [{
    pessoaId: FELIPE, nome: "Felipe Rocha", noContrato: true, responsavel: true, escolhidas: [SP],
    inscricoes: [
      { id: SP, uf: "SP", numero: "287104", letra: null, tipo: "PRINCIPAL", versao: 1, texto: "OAB/SP 287.104", documento: "OAB/SP nº 287.104" },
      { id: RJ, uf: "RJ", numero: "201555", letra: null, tipo: "SUPLEMENTAR", versao: 1, texto: "OAB/RJ 201.555", documento: "OAB/RJ nº 201.555" },
    ],
  }],
  semOab: [],
  escritorio: { nome: "Aurora Advocacia", cnpj: "11222333000181", endereco: "Av. Paulista, 1000", cidade: "São Paulo", uf: "SP", oab: "OAB/SP 31.874" },
  marca: null,
  hoje: "2026-11-21",
  modelos: [],
  atuais: [],
  ultima: null,
  mudancas: [],
  poderesIniciais: [],
};

export const ESCOLHAS: EscolhasDocumentos = {
  documentos: [{ tipo: "CONTRATO" }, { tipo: "PROCURACAO" }, { tipo: "HIPOSSUFICIENCIA" }],
  outorgados: [{ pessoaId: FELIPE, inscricoes: [SP] }],
  poderes: ["RECEBER_QUITAR", "ACORDO"],
  outroPoder: null,
  cidadeData: "São Paulo, 21 de novembro de 2026",
};

describe("os valores dos campos", () => {
  it("o dado que falta sai marcado e não bloqueia", () => {
    const v = montarValoresDocumento(DADOS, ESCOLHAS);
    expect(v.marcados).toEqual(["RG de Benedito Souza Lima"]);
    expect(v.valores.CLIENTE_QUALIFICACAO).toContain("[RG: falta]");
    expect(v.valores.CLIENTE_CPF).toBe("529.982.247-25");
    expect(v.valores.ADVOGADOS_OAB).toBe("FELIPE ROCHA, OAB/SP nº 287.104");
    expect(v.valores.ESCRITORIO_OAB).toBe("OAB/SP 31.874");
    expect(v.origem.PODERES_ESPECIAIS).toBe("formulario");
  });

  it("as condições de honorário viram alíneas com o valor por extenso", () => {
    expect(condicoesNoDocumento(DADOS.condicoes)).toBe(
      "a) honorários de R$ 6.000,00 (seis mil reais), em 3 parcelas mensais de R$ 2.000,00 (dois mil reais), a primeira em 10/12/2026 e a última em 10/02/2027.");
    expect(condicoesNoDocumento([])).toBe("[HONORÁRIOS: falta]");
  });

  it("os poderes especiais entram numa frase só; sem nenhum, nada entra", () => {
    expect(trechoPoderes(["RECEBER_QUITAR", "ACORDO"])).toBe(", com os poderes especiais para receber e dar quitação e firmar acordo");
    expect(trechoPoderes([])).toBe("");
    expect(trechoPoderes([], "levantar alvará")).toBe(", com os poderes especiais para levantar alvará");
  });

  it("empresa: quem assina por ela entra; sem ele, a marca de falta", () => {
    const pj = { ...DADOS, cliente: { ...DADOS.cliente, tipo: "PJ" as const, nome: "Farmácia Bem Estar Ltda", documento: "11222333000181", repNome: null } };
    const v = montarValoresDocumento(pj, ESCOLHAS);
    expect(v.valores.REPRESENTANTE_NOME).toBe("[REPRESENTANTE: falta]");
    expect(v.valores.CLIENTE_RG).toBe("");
    const com = montarValoresDocumento({ ...pj, cliente: { ...pj.cliente, repNome: "Marta Lima", repCargo: "Sócia administradora" } }, ESCOLHAS);
    expect(com.valores.CLIENTE_ASSINATURA).toContain("por MARTA LIMA, sócia administradora");
  });

  it("o escritório sem CNPJ só marca nos documentos que usam o CNPJ", () => {
    const v = montarValoresDocumento({ ...DADOS, escritorio: { ...DADOS.escritorio, cnpj: null } }, ESCOLHAS);
    expect(marcadosDoModeloDocumento(v, ["ESCRITORIO_CNPJ", "CLIENTE_RG"])).toEqual(["RG de Benedito Souza Lima", "CNPJ do escritório"]);
    expect(marcadosDoModeloDocumento(v, ["CLIENTE_NOME"])).toEqual([]);
  });
});

describe("os modelos padrão (em revisão pela advogada parceira)", () => {
  it("todos usam só campos conhecidos e estão marcados como em revisão", () => {
    expect(MODELOS_PADRAO_DOCUMENTO.map((m) => m.codigo)).toEqual(["CONTRATO", "PROCURACAO", "HIPOSSUFICIENCIA_PF", "HIPOSSUFICIENCIA_PJ"]);
    for (const m of MODELOS_PADRAO_DOCUMENTO) {
      expect(m.emRevisao).toBe(true);
      expect(camposDoPadraoDocumento(m).every(campoConhecidoDocumento)).toBe(true);
    }
    expect(camposDoPadraoDocumento(modeloPadraoDocumento("PROCURACAO")!)).toContain("PODERES_ESPECIAIS");
    expect(camposDoPadraoDocumento(modeloPadraoDocumento("CONTRATO")!)).toContain("HONORARIOS_CONDICOES");
  });

  it("a declaração de empresa usa o texto de pessoa jurídica (pergunta 5)", () => {
    expect(padraoDoTipo("HIPOSSUFICIENCIA", "PJ")).toBe("HIPOSSUFICIENCIA_PJ");
    expect(padraoDoTipo("HIPOSSUFICIENCIA", "PF")).toBe("HIPOSSUFICIENCIA_PF");
    expect(padraoDoTipo("PROCURACAO", "PJ")).toBe("PROCURACAO");
  });

  it("o .docx do padrão sai preenchido, sem nenhum campo sobrando, com os poderes na procuração", async () => {
    const p = modeloPadraoDocumento("PROCURACAO")!;
    const v = montarValoresDocumento(DADOS, ESCOLHAS);
    const docx = await preencherDocx(await criarDocx(p.paragrafos, ["Aurora Advocacia"]), v.valores);
    expect((await conferirDocx(docx)).campos).toEqual([]);
    const texto = (await paragrafosDocx(docx)).join("\n");
    expect(texto).toContain("BENEDITO SOUZA LIMA");
    expect(texto).toContain("poderes especiais para receber e dar quitação");
    expect(texto).toContain("São Paulo, 21 de novembro de 2026");
  });

  it("a prévia marca o que veio do cadastro, desta tela e o que falta", () => {
    const v = montarValoresDocumento(DADOS, ESCOLHAS);
    const previa = previaDocumento(["[CLIENTE_QUALIFICACAO]", "[CIDADE_DATA]"], v).flat();
    expect(previa.some((s) => s.t === "falta" && s.texto === "[RG: falta]")).toBe(true);
    expect(previa.at(-1)).toEqual({ t: "formulario", texto: "São Paulo, 21 de novembro de 2026" });
  });
});

describe("o modelo do escritório", () => {
  it("aponta o campo desconhecido, o de petição e o esperado que falta", () => {
    const c = conferenciaModeloDocumento("PROCURACAO", ["CLIENTE_NOME", "NOME_CLIENTE", "PARTE_CONTRARIA"], 4);
    expect(c.desconhecidos.map((d) => d.campo)).toEqual(["NOME_CLIENTE", "PARTE_CONTRARIA"]);
    expect(c.desconhecidos[0]!.sugestao).toBe("CLIENTE_NOME");
    expect(c.desconhecidos[1]!.peticao).toBe(true);
    expect(c.faltaEsperado?.campo).toBe("PODERES_ESPECIAIS");
    expect(c.semCampos).toBe(false);
    expect(conferenciaModeloDocumento("OUTRO", ["X_Y"], 1)).toMatchObject({ faltaEsperado: null, semCampos: true });
  });
});

describe("nomes, pedidos e mudanças", () => {
  it("os nomes dos arquivos não levam acento nem barra", () => {
    expect(nomeArquivoDocumento("PROCURACAO", "Procuração", "C-2026-033", "Benedito Souza Lima")).toBe("procuracao-c-2026-033-benedito-souza-lima.docx");
    expect(nomeArquivoDocumento("HIPOSSUFICIENCIA", "x", "C-2026-033", "Benedito", 2)).toBe("declaracao-hipossuficiencia-c-2026-033-benedito-v2.docx");
    expect(nomeArquivoDocumento("OUTRO", "Termo de ciência / LGPD", "C-2026-033", "José")).toBe("termo-de-ciencia-lgpd-c-2026-033-jose.docx");
    expect(nomeZipDocumentos("C-2026-033", "Benedito Souza Lima")).toBe("documentos-c-2026-033-benedito-souza-lima.zip");
  });

  it("o pedido recusa poder que não existe e texto longo", () => {
    expect(escolhasDocumentosSchema.safeParse(ESCOLHAS).success).toBe(true);
    expect(escolhasDocumentosSchema.safeParse({ ...ESCOLHAS, poderes: ["VENDER_IMOVEL"] }).success).toBe(false);
    expect(escolhasDocumentosSchema.safeParse({ ...ESCOLHAS, outroPoder: "x".repeat(301) }).success).toBe(false);
  });

  it("o que mudou no cadastro desde a última geração, com quem e quando", () => {
    expect(fraseMudancas([{ campos: ["rg", "versao"], por: { id: "d", nome: "Diego Almeida" }, em: "2026-11-21T18:52:00Z" }]))
      .toBe("o RG, mudado por Diego Almeida em 21/11, às 15h52");
    expect(fraseMudancas([{ campos: ["observacoes"], por: null, em: "2026-11-21T18:52:00Z" }])).toBeNull();
  });
});
