import { describe, expect, it } from "vitest";
import {
  conferirFormEscritorio, dadosDoForm, enderecoDoEscritorioNoDocumento, faltasDoEscritorio, formDoEscritorio, linhaDaSede,
  listaFaltasEscritorio, nomeDoEscritorioNoDocumento, qualificacaoDoEscritorio, type DadosEscritorioDocumentos,
} from "./escritorio_dados.ts";
import { linhasTimbrado } from "./proposta_docx.ts";
import { enderecoDoAdvogado, type DadosDocumentoPessoa } from "./dados_advogado.ts";
import { camposDoPadraoDocumento, marcadosDoModeloDocumento, modeloPadraoDocumento, paragrafosPadraoDocumento } from "./documentos.ts";

const completo: DadosEscritorioDocumentos = {
  nome: "Santana", tipo: "SOCIEDADE_INDIVIDUAL", razaoSocial: "Santana Sociedade Individual de Advocacia", cnpj: "60814144000103",
  oabUf: "BA", oabNumero: "4217", oab: "OAB/BA 4.217", cep: "46250000", logradouro: "Rua Sete de Setembro", numero: "120",
  complemento: "sala 4", bairro: "Centro", cidade: "Presidente Jânio Quadros", uf: "BA", endereco: "Rua Sete de Setembro, 120, sala 4, Centro",
  enderecoConfira: false, telefone: "77981239809", email: "contato@santana.adv.br", site: "santana.adv.br",
};

const faltando: DadosEscritorioDocumentos = {
  nome: "Santana", tipo: null, razaoSocial: null, cnpj: "60814144000103", oabUf: null, oabNumero: null, oab: null, cep: null,
  logradouro: null, numero: null, complemento: null, bairro: null, cidade: "Presidente Jânio Quadros", uf: "BA", endereco: null,
  enderecoConfira: false, telefone: null, email: null, site: null,
};

const carol: DadosDocumentoPessoa = {
  nomeCompleto: "Carolina Soares Santana", tratamento: "ADVOGADA", nacionalidade: "brasileira", estadoCivil: "CASADO", cpf: "52998224725",
  rg: "12.345.678-90", rgOrgao: "SSP/BA", enderecoDoEscritorio: true, cep: null, endereco: null, bairro: null, cidade: null, uf: null,
  emailProfissional: null, telefoneProfissional: null, atualizadoEm: null, atualizadoPor: null, versao: 1,
};

describe("PA-07: dados do escritório para os documentos", () => {
  it("decisão 8: a sede numa linha só, com o CEP", () => {
    expect(linhaDaSede(completo)).toBe("Rua Sete de Setembro, 120, sala 4, Centro, Presidente Jânio Quadros/BA, CEP 46250-000");
    expect(enderecoDoEscritorioNoDocumento(completo)).toBe(linhaDaSede(completo));
  });

  it("decisão 2: conta 5 dados com sociedade e diz quais faltam", () => {
    expect(faltasDoEscritorio(completo)).toEqual([]);
    expect(faltasDoEscritorio(faltando)).toEqual(["TIPO", "RAZAO_SOCIAL", "OAB", "SEDE"]);
    expect(listaFaltasEscritorio(faltasDoEscritorio(faltando))).toBe("o tipo, a razão social, o registro da sociedade na OAB e o endereço da sede");
  });

  it("decisão 7: sem razão social, o nome curto com a marca; com ela, em maiúsculas", () => {
    expect(nomeDoEscritorioNoDocumento(faltando)).toBe("SANTANA [RAZÃO SOCIAL: falta]");
    expect(nomeDoEscritorioNoDocumento(completo)).toBe("SANTANA SOCIEDADE INDIVIDUAL DE ADVOCACIA");
  });

  it("sem a sede completa, a marca com a cidade (o caso do print)", () => {
    expect(enderecoDoEscritorioNoDocumento(faltando)).toBe("[ENDEREÇO DO ESCRITÓRIO: falta], Presidente Jânio Quadros/BA");
  });

  it("decisão 18: o texto antigo sai com [confira] até alguém salvar", () => {
    const antigo = { ...faltando, logradouro: "Rua da Aurora, 295", endereco: "Rua da Aurora, 295", enderecoConfira: true };
    expect(enderecoDoEscritorioNoDocumento(antigo)).toBe("Rua da Aurora, 295, Presidente Jânio Quadros/BA [ENDEREÇO DO ESCRITÓRIO: confira]");
  });

  it("ficha sem as partes novas sai como saía", () => {
    expect(enderecoDoEscritorioNoDocumento({ endereco: "Rua A, 1", cidade: "Recife", uf: "PE" })).toBe("Rua A, 1, Recife, PE");
    expect(nomeDoEscritorioNoDocumento({ ...faltando, tipo: undefined } as unknown as DadosEscritorioDocumentos)).toContain("SANTANA");
  });

  it("decisão 3: a frase da contratada com sociedade", () => {
    expect(qualificacaoDoEscritorio(completo)).toBe(
      "SANTANA SOCIEDADE INDIVIDUAL DE ADVOCACIA, inscrita no CNPJ sob o nº 60.814.144/0001-03 e registrada na OAB/BA 4.217, " +
        "com sede em Rua Sete de Setembro, 120, sala 4, Centro, Presidente Jânio Quadros/BA, CEP 46250-000");
  });

  it("decisão 17: sem sociedade, a contratada é a sócia dona, com o endereço da sede", () => {
    const sem: DadosEscritorioDocumentos = {
      ...completo, tipo: "SEM_SOCIEDADE", razaoSocial: null, cnpj: null, oab: null,
      dona: { pessoaId: "p1", nome: "Carol Santana", dados: carol, inscricoes: [{ id: "i1", uf: "BA", numero: "63876", letra: "S", tipo: "PRINCIPAL" } as never] },
    };
    const q = qualificacaoDoEscritorio(sem);
    expect(q).toMatch(/^CAROLINA SOARES SANTANA, brasileira, casada/);
    expect(q).toContain("CEP 46250-000");
    expect(q).not.toContain("CNPJ");
    expect(nomeDoEscritorioNoDocumento(sem)).toBe("CAROLINA SOARES SANTANA");
    expect(faltasDoEscritorio(sem)).toEqual([]);
  });

  it("o contrato padrão troca o parágrafo da contratada sem sociedade", () => {
    const m = modeloPadraoDocumento("CONTRATO")!;
    expect(paragrafosPadraoDocumento(m, { tipo: "SEM_SOCIEDADE" }).some((p) => p.texto === "CONTRATADA: [ESCRITORIO_QUALIFICACAO].")).toBe(true);
    expect(camposDoPadraoDocumento(m, { tipo: "SEM_SOCIEDADE" })).not.toContain("ESCRITORIO_CNPJ");
    expect(paragrafosPadraoDocumento(m, { tipo: "SOCIEDADE" })).toBe(m.paragrafos);
    expect(marcadosDoModeloDocumento({ valores: {}, origem: {}, marcados: ["CNPJ do escritório"] }, ["ESCRITORIO_QUALIFICACAO"])).toEqual(["CNPJ do escritório"]);
  });

  it("o endereço profissional de quem usa o do escritório leva o CEP", () => {
    expect(enderecoDoAdvogado(carol, { endereco: completo.endereco, cidade: completo.cidade, uf: completo.uf, cep: completo.cep }))
      .toBe("Rua Sete de Setembro, 120, sala 4, Centro, Presidente Jânio Quadros/BA, CEP 46250-000");
  });

  it("decisão 9: o timbrado usa a razão social e o contato do escritório", () => {
    expect(linhasTimbrado({ ...completo, contatos: [{ telefone: "71999990000", email: "outro@x.com" }] })).toEqual([
      "Santana Sociedade Individual de Advocacia",
      "CNPJ 60.814.144/0001-03 · OAB/BA 4.217 · Rua Sete de Setembro, 120, sala 4, Centro · Presidente Jânio Quadros/BA · CEP 46250-000",
      "(77) 98123-9809 · contato@santana.adv.br · santana.adv.br",
    ]);
  });

  it("decisões 14 e 15: a conferência do formulário, com o código de cada campo", () => {
    const f = { ...formDoEscritorio(faltando), nome: "", cnpj: "11.111.111/1111-11", oabUf: "BA", cep: "4625", logradouro: "Rua A", telefone: "12", site: "nada" };
    expect(conferirFormEscritorio(f)).toEqual({
      nome: "NOME_OBRIGATORIO", tipo: "TIPO_OBRIGATORIO", cnpj: "CNPJ_INVALIDO", oabNumero: "OAB_INCOMPLETA", cep: "CEP_INVALIDO",
      numero: "NUMERO_OBRIGATORIO", telefone: "TELEFONE_INVALIDO", site: "SITE_INVALIDO",
    });
    expect(conferirFormEscritorio(formDoEscritorio(completo))).toEqual({});
    expect(conferirFormEscritorio({ ...formDoEscritorio(completo), tipo: "SEM_SOCIEDADE", cnpj: "123" })).toEqual({});
  });

  it("a prévia acompanha o formulário", () => {
    const d = dadosDoForm({ ...formDoEscritorio(faltando), tipo: "SOCIEDADE", razaoSocial: "Santana Advogados", oabUf: "ba", oabNumero: "4217" }, faltando);
    expect(nomeDoEscritorioNoDocumento(d)).toBe("SANTANA ADVOGADOS");
    expect(d.oab).toBe("OAB/BA 4.217");
  });
});
