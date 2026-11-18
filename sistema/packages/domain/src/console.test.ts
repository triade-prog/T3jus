import { describe, expect, it } from "vitest";
import {
  cadastrarMembroSchema,
  cnpjValido,
  etapasImplantacao,
  contatoSchema,
  criarEscritorioSchema,
  fichaSchema,
  normalizarTelefone,
} from "./console.ts";

describe("contratos do Console (passo 1)", () => {
  it("CO-02: telefone de contato vira o formato internacional", () => {
    expect(normalizarTelefone("(61) 99999-0001")).toBe("+5561999990001");
    expect(normalizarTelefone("+55 61 3333-0000")).toBe("+556133330000");
  });

  it("CO-02: CNPJ confere os dígitos verificadores e guarda só os números", () => {
    expect(cnpjValido("11222333000181")).toBe(true);
    expect(cnpjValido("11222333000182")).toBe(false);
    expect(cnpjValido("11111111111111")).toBe(false);
    expect(cnpjValido("123")).toBe(false);
    expect(fichaSchema.shape.cnpj.parse("11.222.333/0001-81")).toBe("11222333000181");
    expect(fichaSchema.shape.cnpj.parse("")).toBeNull();
    expect(fichaSchema.shape.cnpj.parse(null)).toBeNull();
    expect(fichaSchema.shape.cnpj.safeParse("11.222.333/0001-82").success).toBe(false);
  });

  it("CO-02: contato precisa de telefone ou e-mail", () => {
    expect(contatoSchema.safeParse({ nome: "Zé", papel: "Secretária" }).success).toBe(false);
    expect(contatoSchema.parse({ nome: "Ana", papel: "Sócia", email: "ANA@Exemplo.invalid " }).email).toBe("ana@exemplo.invalid");
  });

  it("CO-01: cadastro de escritório pede nome, cidade e UF válida", () => {
    expect(criarEscritorioSchema.parse({ nome: " Ipê Advocacia ", cidade: "Brasília", uf: "DF" })).toEqual({
      nome: "Ipê Advocacia",
      cidade: "Brasília",
      uf: "DF",
    });
    expect(criarEscritorioSchema.safeParse({ nome: "Ipê Advocacia", cidade: "Brasília", uf: "ZZ" }).success).toBe(false);
  });

  it("PT-24: membro da equipe interna tem ao menos uma função conhecida", () => {
    expect(cadastrarMembroSchema.safeParse({ nome: "Bia", email: "bia@exemplo.invalid", funcoes: [] }).success).toBe(false);
    expect(cadastrarMembroSchema.safeParse({ nome: "Bia", email: "bia@exemplo.invalid", funcoes: ["DONO"] }).success).toBe(false);
    expect(cadastrarMembroSchema.parse({ nome: "Bia", email: "bia@exemplo.invalid", funcoes: ["SUPORTE"] }).funcoes).toEqual(["SUPORTE"]);
  });
});

describe("etapas da implantação (CO-01)", () => {
  it("conta as quatro etapas na ordem da tela", () => {
    const nada = etapasImplantacao({ situacoes: ["SEM_SOCIO", "SEM_CONTATO", "SEM_CONTRATO"], socios: [], equipe: [{}] });
    expect(nada.feitas).toBe(1);
    expect(nada.proxima).toBe("FICHA");
    expect(nada.lista.map((e) => e.nome)).toEqual(["Ficha", "Contrato", "Equipe", "Sócio no Portal"]);
  });
  it("sócio só conta depois de criar a senha", () => {
    const convidado = etapasImplantacao({ situacoes: [], socios: [{ senhaCriadaEm: null }], equipe: [{}] });
    expect(convidado.feitas).toBe(3);
    expect(convidado.proxima).toBe("SOCIO_NO_PORTAL");
    const entrou = etapasImplantacao({ situacoes: [], socios: [{ senhaCriadaEm: "2026-11-18T12:00:00Z" }], equipe: [{}] });
    expect(entrou.feitas).toBe(4);
    expect(entrou.proxima).toBeNull();
  });
});
