// F3.98 (CH-08, AP-01): quem assina pelo cliente menor ou sob curatela. A conta pela data, a
// qualificação e o bloco de assinatura que saem na procuração e no contrato, e o que falta.
import { describe, expect, it } from "vitest";
import { faltasNoDocumento, montarValoresDocumento, type ClienteDoDocumento, type DadosDocumentos, type EscolhasDocumentos } from "./documentos.ts";
import { aniversario, idadeEm, idadeEmPalavras, nascimentoNoFuturo, quemAssina, situacaoNoDia, tituloDaIdade } from "./responsavel_legal.ts";
import { cadastrarClienteSchema } from "./clientes.ts";

// Os mesmos dados de documentos.test.ts (o escritório, o contrato e o advogado).
const FELIPE = "11111111-1111-4111-8111-111111111111";
const SP = "22222222-2222-4222-8222-222222222222";
const RJ = "33333333-3333-4333-8333-333333333333";

const DADOS: DadosDocumentos = {
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

const ESCOLHAS: EscolhasDocumentos = {
  documentos: [{ tipo: "CONTRATO" }, { tipo: "PROCURACAO" }, { tipo: "HIPOSSUFICIENCIA" }],
  outorgados: [{ pessoaId: FELIPE, inscricoes: [SP] }],
  poderes: ["RECEBER_QUITAR", "ACORDO"],
  outroPoder: null,
  cidadeData: "São Paulo, 21 de novembro de 2026",
};


const PEDRO: ClienteDoDocumento = {
  ...DADOS.cliente, id: "k2", nome: "Pedro Henrique Alves Souza", documento: "48821390730", nacionalidade: "brasileiro", estadoCivil: null, profissao: null,
  rg: null, endereco: "Rua Bresser, 845, apto. 12", bairro: "Brás", cidade: "São Paulo", uf: "SP", cep: "03017000",
  capacidade: "MENOR", nascimento: "2014-03-14", rlPapel: "MAE", rlNome: "Joana Alves Souza", rlDocumento: "37764021563", rlRg: "41.552.318-7",
  rlRgOrgao: "SSP/SP", rlNacionalidade: "brasileira", rlEstadoCivil: "DIVORCIADO", rlProfissao: "auxiliar administrativa", rlMoraJunto: true,
};
const valores = (c: ClienteDoDocumento) => montarValoresDocumento({ ...DADOS, hoje: "2026-11-22", cliente: c }, ESCOLHAS);

describe("F3.98: quem assina, pela data", () => {
  it("conta os anos completos e acha os aniversários", () => {
    expect(idadeEm("2014-03-14", "2026-11-22")).toBe(12);
    expect(idadeEm("2008-11-19", "2026-11-18")).toBe(17);
    expect(idadeEm("2008-11-19", "2026-11-19")).toBe(18);
    expect(aniversario("2014-03-14", 16)).toBe("2030-03-14");
    expect(aniversario("2012-02-29", 18)).toBe("2030-02-28");
  });
  it("F3.162: a idade em palavras, com o bebê e o singular", () => {
    expect(idadeEmPalavras(0)).toBe("menos de 1 ano");
    expect(idadeEmPalavras(-1)).toBe("menos de 1 ano");
    expect(idadeEmPalavras(1)).toBe("1 ano");
    expect(idadeEmPalavras(2)).toBe("2 anos");
    expect(idadeEmPalavras(15)).toBe("15 anos");
    expect(idadeEmPalavras(17)).toBe("17 anos");
    // Nasceu hoje, faltando um dia para 1 ano, no dia de 1 ano; 29/02 só completa o ano em 01/03.
    expect(idadeEmPalavras(idadeEm("2026-11-22", "2026-11-22"))).toBe("menos de 1 ano");
    expect(idadeEmPalavras(idadeEm("2025-11-23", "2026-11-22"))).toBe("menos de 1 ano");
    expect(idadeEmPalavras(idadeEm("2025-11-22", "2026-11-22"))).toBe("1 ano");
    expect(idadeEmPalavras(idadeEm("2024-02-29", "2025-02-28"))).toBe("menos de 1 ano");
    expect(idadeEmPalavras(idadeEm("2024-02-29", "2025-03-01"))).toBe("1 ano");
  });
  it("F3.162: o título do cadastro e de Gerar documentos, e a data depois de hoje", () => {
    expect(tituloDaIdade("Ana", 0, "REPRESENTADO")).toBe("Ana tem menos de 1 ano hoje: é representado(a).");
    expect(tituloDaIdade("Ana", 1, "REPRESENTADO")).toBe("Ana tem 1 ano hoje: é representado(a).");
    expect(tituloDaIdade("Pedro", 12, "REPRESENTADO")).toBe("Pedro tem 12 anos hoje: é representado(a).");
    expect(tituloDaIdade("Lucas", 16, "ASSISTIDO")).toBe("Lucas tem 16 anos hoje: é assistido(a).");
    expect(nascimentoNoFuturo("2026-11-23", "2026-11-22")).toBe(true);
    expect(nascimentoNoFuturo("2026-11-22", "2026-11-22")).toBe(false);
    expect(nascimentoNoFuturo("2014-03-14", "2026-11-22")).toBe(false);
  });
  it("até 15 anos, representado; 16 e 17, assistido; aos 18, assina por si", () => {
    expect(quemAssina(PEDRO, "2026-11-22")).toBe("REPRESENTADO");
    expect(quemAssina(PEDRO, "2030-03-14")).toBe("ASSISTIDO");
    expect(quemAssina(PEDRO, "2032-03-14")).toBe("PROPRIO");
    expect(situacaoNoDia("MENOR", "2008-11-19", "2026-11-22").situacao).toBe("FEZ_18");
  });
  it("pergunta 4: a curatela segue o termo; a empresa nunca tem responsável", () => {
    expect(quemAssina({ ...PEDRO, capacidade: "CURATELA", curModo: null }, "2026-11-22")).toBe("CURATELA_REPRESENTA");
    expect(quemAssina({ ...PEDRO, capacidade: "CURATELA", curModo: "ASSISTE" }, "2026-11-22")).toBe("CURATELA_ASSISTE");
    expect(quemAssina({ ...PEDRO, tipo: "PJ" }, "2026-11-22")).toBe("PROPRIO");
  });
});

describe("F3.98: o texto na procuração e no contrato", () => {
  it("representado: menor impúbere, nascido em, a mãe com a qualificação e ambos residentes", () => {
    const v = valores(PEDRO);
    expect(v.valores.CLIENTE_QUALIFICACAO).toBe(
      "brasileiro, menor impúbere, nascido(a) em 14/03/2014, inscrito(a) no CPF sob o nº 488.213.907-30, neste ato representado(a) por sua mãe, " +
      "JOANA ALVES SOUZA, brasileira, divorciada, auxiliar administrativa, portadora do RG nº 41.552.318-7 SSP/SP, inscrita no CPF sob o nº 377.640.215-63, " +
      "ambos residentes na Rua Bresser, 845, apto. 12, Brás, São Paulo, SP, CEP 03017-000");
    expect(v.valores.CLIENTE_ASSINATURA).toBe(
      "_______________________________________\nPEDRO HENRIQUE ALVES SOUZA\nrepresentado(a) por sua mãe, JOANA ALVES SOUZA\nCPF 377.640.215-63");
    expect(v.valores.REPRESENTANTE_NOME).toBe("JOANA ALVES SOUZA");
    expect(v.valores.CLIENTE_NASCIMENTO).toBe("14/03/2014");
    expect(v.marcados).toEqual([]);
  });
  it("assistido: estado civil e profissão quando houver, menor púbere e duas assinaturas", () => {
    const lucas = { ...PEDRO, nome: "Lucas Ferreira Moura", nascimento: "2010-02-03", estadoCivil: "SOLTEIRO" as const, profissao: "estudante",
      rlPapel: "PAI" as const, rlNome: "Marcos Ferreira Moura", rlEstadoCivil: "CASADO" as const, rlProfissao: "eletricista" };
    const v = valores(lucas);
    expect(v.valores.CLIENTE_QUALIFICACAO).toContain("brasileiro, solteiro(a), estudante, menor púbere, nascido(a) em 03/02/2010");
    expect(v.valores.CLIENTE_QUALIFICACAO).toContain("neste ato assistido(a) por seu pai, MARCOS FERREIRA MOURA, brasileira, casado, eletricista, portador do RG");
    expect(v.valores.CLIENTE_ASSINATURA?.split("\n\n")).toHaveLength(2);
    expect(v.valores.CLIENTE_ASSINATURA).toContain("pai, que o(a) assiste\nCPF 377.640.215-63");
  });
  it("curatela: qualificação completa, endereço de cada um, a curadora nomeada e o termo anexo", () => {
    const seb: ClienteDoDocumento = { ...PEDRO, nome: "Sebastião Ramos Filho", capacidade: "CURATELA", nascimento: null, estadoCivil: "VIUVO", profissao: "aposentado",
      rg: "6.214.873-0", rgOrgao: "SSP/SP", rlPapel: "CURADORA", rlNome: "Helena Ramos Castro", rlMoraJunto: false, rlEndereco: "Rua Loefgren, 1.415",
      rlCidade: "São Paulo", rlUf: "SP", curModo: "REPRESENTA", curProcesso: "1004587-22.2025.8.26.0100", curVara: "2ª Vara da Família e Sucessões" };
    const q = valores(seb).valores.CLIENTE_QUALIFICACAO;
    expect(q).toContain("viúvo(a), aposentado, portador(a) do RG nº 6.214.873-0 SSP/SP");
    expect(q).toContain("residente na Rua Bresser, 845, apto. 12, Brás, São Paulo, SP, CEP 03017-000, neste ato representado(a) por sua curadora, HELENA RAMOS CASTRO");
    expect(q).toContain("residente na Rua Loefgren, 1.415, São Paulo, SP, nomeada nos autos da ação de curatela nº 1004587-22.2025.8.26.0100, da 2ª Vara da Família e Sucessões, conforme termo de curatela anexo");
    expect(valores({ ...seb, curProcesso: null }).valores.CLIENTE_QUALIFICACAO).toMatch(/residente na Rua Loefgren, 1\.415, São Paulo, SP, conforme termo de curatela anexo$/);
  });
  it("o que falta de quem assina sai marcado e no aviso, sem bloquear", () => {
    const sem = { ...PEDRO, rlDocumento: null, rlRg: null };
    const v = valores(sem);
    expect(v.valores.CLIENTE_QUALIFICACAO).toContain("[RG DE QUEM ASSINA: falta]");
    expect(v.valores.CLIENTE_ASSINATURA).toContain("CPF [CPF DE QUEM ASSINA: falta]");
    expect(faltasNoDocumento(sem, "2026-11-22")).toEqual(["o CPF de quem assina", "o RG de quem assina"]);
  });
  it("pergunta 3: quem fez 18 anos assina por si no próprio dia, e passa a precisar de estado civil, profissão e RG", () => {
    const rafa = { ...PEDRO, nascimento: "2008-11-19" };
    expect(valores(rafa).valores.CLIENTE_QUALIFICACAO).toMatch(/^brasileiro, \[ESTADO CIVIL: falta\], \[PROFISSÃO: falta\], portador\(a\) do RG nº \[RG: falta\]/);
    expect(valores(rafa).valores.CLIENTE_ASSINATURA).toBe("_______________________________________\nPEDRO HENRIQUE ALVES SOUZA\nCPF 488.213.907-30");
    expect(faltasNoDocumento(rafa, "2026-11-22")).toEqual(["o estado civil", "a profissão", "o RG"]);
  });
});

describe("F3.98: o cadastro (pergunta 6)", () => {
  const base = { tipo: "PF", nome: "Pedro", contatos: [{ nome: "Joana", telefone: "+5511984723316", principal: true }] };
  it("o menor precisa da data de nascimento e de quem assina; o curatelado, do curador", () => {
    const r = cadastrarClienteSchema.safeParse({ ...base, capacidade: "MENOR" });
    expect(r.success ? [] : r.error.issues.map((i) => i.path[0])).toEqual(["nascimento", "rlNome", "rlPapel"]);
    const c = cadastrarClienteSchema.safeParse({ ...base, capacidade: "CURATELA", rlNome: "Helena", rlPapel: "MAE" });
    expect(c.success ? [] : c.error.issues.map((i) => i.path[0])).toEqual(["rlPapel"]);
    expect(cadastrarClienteSchema.safeParse({ ...base, capacidade: "MENOR", nascimento: "2014-03-14", rlNome: "Joana", rlPapel: "MAE" }).success).toBe(true);
  });
  it("quem assina por si continua como antes", () => {
    const r = cadastrarClienteSchema.parse(base);
    expect(r.capacidade).toBe("PLENA");
  });
});
