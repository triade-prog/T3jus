import { describe, expect, it } from "vitest";
import {
  dadosDocumentoVazios, enderecoDoAdvogado, estadoCivilNaTela, faltasDoAdvogado, listaFaltas, qualificacaoDoAdvogado,
  type DadosDocumentoPessoa,
} from "./dados_advogado.ts";
import { marcadosDoModeloDocumento, montarValoresDocumento, type DadosDocumentos } from "./documentos.ts";

const ESC = { endereco: "Av. Tancredo Neves, 1.632, sala 1.208, Caminho das Árvores", cidade: "Salvador", uf: "BA" };
const BA = { id: "i1", uf: "BA" as const, numero: "63876", letra: "S", tipo: "PRINCIPAL" as const, versao: 1, texto: "OAB/BA 63.876-S", documento: "OAB/BA nº 63.876-S" };
const SE = { id: "i2", uf: "SE" as const, numero: "1288", letra: null, tipo: "SUPLEMENTAR" as const, versao: 1, texto: "OAB/SE 1.288", documento: "OAB/SE nº 1.288" };

const CAROL: DadosDocumentoPessoa = {
  ...dadosDocumentoVazios("Carol Santana"),
  nomeCompleto: "Carolina Soares Santana", tratamento: "ADVOGADA", nacionalidade: "Brasileira", estadoCivil: "CASADO",
  cpf: "12345678909", rg: "08.765.432-10", rgOrgao: "SSP/BA", versao: 3,
};

describe("qualificação do advogado (EX-15)", () => {
  it("sai completa, com a concordância do tratamento e o endereço do escritório (decisões 2 e 9)", () => {
    expect(qualificacaoDoAdvogado(CAROL, [BA], ESC)).toBe(
      "CAROLINA SOARES SANTANA, brasileira, casada, advogada inscrita na OAB/BA sob o nº 63.876-S, portadora do RG nº 08.765.432-10 SSP/BA, " +
        "inscrita no CPF sob o nº 123.456.789-09, com escritório profissional na Av. Tancredo Neves, 1.632, sala 1.208, Caminho das Árvores, Salvador/BA",
    );
    expect(faltasDoAdvogado(CAROL, [BA], ESC)).toEqual([]);
  });

  it("marca o que falta, sem bloquear (decisão 3), e a principal vem primeiro", () => {
    const rafael: DadosDocumentoPessoa = { ...dadosDocumentoVazios("Rafael Menezes"), tratamento: "ADVOGADO", rg: "13.204.887-45" };
    const q = qualificacaoDoAdvogado(rafael, [SE, BA], ESC);
    expect(q).toContain("advogado inscrito na OAB/BA sob o nº 63.876-S e na OAB/SE sob o nº 1.288");
    expect(q).toContain("[NACIONALIDADE: falta], [ESTADO CIVIL: falta]");
    expect(q).toContain("portador do RG nº [RG: falta]");
    expect(q).toContain("inscrito no CPF sob o nº [CPF: falta]");
    expect(faltasDoAdvogado(rafael, [BA], ESC)).toEqual(["NACIONALIDADE", "ESTADO_CIVIL", "CPF", "RG"]);
    expect(listaFaltas(["ESTADO_CIVIL", "CPF", "RG"])).toBe("estado civil, CPF e RG");
  });

  it("sem tratamento, usa a forma neutra; CPF com dígito errado sai para conferir", () => {
    const d = { ...CAROL, tratamento: null, cpf: "12345678900" };
    const q = qualificacaoDoAdvogado(d, [BA], ESC);
    expect(q).toContain("casado(a), advogado(a) inscrito(a) na OAB/BA");
    expect(q).toContain("[CPF: confira]");
    expect(faltasDoAdvogado(d, [BA], ESC)).toEqual(["TRATAMENTO", "CPF"]);
  });

  it("endereço próprio com CEP; sem cidade, falta; sem OAB, conta como falta", () => {
    const d = { ...CAROL, enderecoDoEscritorio: false, endereco: "Rua Chile, 22", bairro: "Centro", cidade: "Salvador", uf: "BA", cep: "40020010" };
    expect(enderecoDoAdvogado(d, ESC)).toBe("Rua Chile, 22, Centro, Salvador/BA, CEP 40020-010");
    expect(enderecoDoAdvogado({ ...d, cidade: null }, ESC)).toBeNull();
    expect(faltasDoAdvogado(CAROL, [], ESC)).toEqual(["OAB"]);
    expect(enderecoDoAdvogado(CAROL, { endereco: null, cidade: null, uf: null })).toBeNull();
  });

  it("estado civil na tela", () => {
    expect(estadoCivilNaTela("VIUVO", "ADVOGADA")).toBe("Viúva");
    expect(estadoCivilNaTela("CASADO", null)).toBe("Casada ou casado");
  });
});

describe("os documentos usam a qualificação (EX-15)", () => {
  const dados = {
    contrato: { id: "c", numero: "C-2026-041", objeto: "Ação trabalhista", estado: "ELABORACAO", assinadoEm: null, versao: 1 },
    cliente: {
      id: "k", nome: "Benedito Souza Lima", tipo: "PF", documento: "52998224725", nacionalidade: "brasileiro", estadoCivil: "CASADO", profissao: "pedreiro",
      rg: "05.418.207-11", rgOrgao: "SSP/BA", endereco: "Rua A, 1", bairro: "Barbalho", cidade: "Salvador", uf: "BA", cep: "40301110",
      repNome: null, repCargo: null, repDocumento: null, repEstadoCivil: null, repProfissao: null, versao: 1,
    },
    condicoes: [], casos: [],
    advogados: [
      { pessoaId: "p1", nome: "Carol Santana", noContrato: true, responsavel: true, inscricoes: [BA], escolhidas: ["i1"], dados: CAROL },
      { pessoaId: "p2", nome: "Rafael Menezes", noContrato: true, responsavel: false, inscricoes: [SE], escolhidas: ["i2"],
        dados: { ...dadosDocumentoVazios("Rafael Augusto Menezes Lima"), tratamento: "ADVOGADO", nacionalidade: "brasileiro", rg: "1", rgOrgao: "SSP/BA" } },
    ],
    semOab: [], escritorio: { nome: "Santana Advocacia", cnpj: "52318904000162", endereco: ESC.endereco, cidade: "Salvador", uf: "BA", oab: "OAB/BA 4.217" },
    marca: null, hoje: "2026-11-22", modelos: [], atuais: [], ultima: null, mudancas: [], poderesIniciais: [],
  } as unknown as DadosDocumentos;
  const v = montarValoresDocumento(dados, {
    documentos: [{ tipo: "PROCURACAO" }],
    outorgados: [{ pessoaId: "p1", inscricoes: ["i1"] }, { pessoaId: "p2", inscricoes: ["i2"] }],
    poderes: [], cidadeData: "Salvador, 22 de novembro de 2026",
  });

  it("une as qualificações com ', e ' e usa o nome completo na OAB e na assinatura", () => {
    expect(v.valores.ADVOGADOS_QUALIFICACAO).toMatch(/^CAROLINA SOARES SANTANA, .*, e RAFAEL AUGUSTO MENEZES LIMA, brasileiro, \[ESTADO CIVIL: falta\]/);
    expect(v.valores.ADVOGADOS_OAB).toBe("CAROLINA SOARES SANTANA, OAB/BA nº 63.876-S, e RAFAEL AUGUSTO MENEZES LIMA, OAB/SE nº 1.288");
    expect(v.valores.ADVOGADOS_ASSINATURA).toContain("RAFAEL AUGUSTO MENEZES LIMA\nOAB/SE nº 1.288");
  });

  it("as faltas do advogado entram nos marcados só quando o modelo usa a qualificação", () => {
    expect(v.marcadosAdvogados).toEqual(["Estado civil de Rafael Menezes", "CPF de Rafael Menezes"]);
    expect(marcadosDoModeloDocumento(v, ["ADVOGADOS_QUALIFICACAO"])).toEqual(["Estado civil de Rafael Menezes", "CPF de Rafael Menezes"]);
    expect(marcadosDoModeloDocumento(v, ["ADVOGADOS_OAB"])).toEqual([]);
  });
});
