import { describe, expect, it } from "vitest";
import { cadastrarClienteSchema, cpfValido, diasEntre, formatarDocumento, hojeBrasilia, registrarAtendimentoSchema } from "./clientes.ts";

const base = { tipo: "PF", nome: " Helena Prado ", contatos: [{ nome: "Helena", telefone: "(11) 98888-7777", principal: true }] };

describe("Clientes do Portal (AP-01, AP-02)", () => {
  it("CPF: confere os dígitos e recusa números repetidos", () => {
    expect(cpfValido("52998224725")).toBe(true);
    expect(cpfValido("52998224724")).toBe(false);
    expect(cpfValido("11111111111")).toBe(false);
    expect(formatarDocumento("52998224725")).toBe("529.982.247-25");
    expect(formatarDocumento("11222333000181")).toBe("11.222.333/0001-81");
  });

  it("cadastro: o mínimo é nome e um contato; em branco vira vazio; telefone no formato internacional", () => {
    const r = cadastrarClienteSchema.parse({ ...base, documento: "529.982.247-25", rg: "  ", cep: "04117-030" });
    expect([r.nome, r.documento, r.rg, r.cep, r.contatos[0]!.telefone]).toEqual(["Helena Prado", "52998224725", null, "04117030", "+5511988887777"]);
  });

  it("cadastro: documento confere pelo tipo, e o contato precisa de telefone ou e-mail e de um principal", () => {
    const campos = (x: unknown) => {
      const r = cadastrarClienteSchema.safeParse(x);
      return r.success ? [] : [...new Set(r.error.issues.map((i) => i.path.join(".")))];
    };
    expect(campos({ ...base, documento: "52998224724" })).toEqual(["documento"]);
    expect(campos({ ...base, tipo: "PJ", documento: "52998224725" })).toEqual(["documento"]);
    expect(campos({ ...base, contatos: [{ nome: "Helena", principal: true }] })).toEqual(["contatos.0.telefone"]);
    expect(campos({ ...base, contatos: [{ nome: "Helena", telefone: "11988887777", principal: false }] })).toEqual(["contatos"]);
    expect(campos({ ...base, origem: "TV" })).toEqual(["origem"]);
  });

  it("atendimento: o próximo contato vai inteiro ou não vai", () => {
    expect(registrarAtendimentoSchema.safeParse({ canal: "WHATSAPP", resumo: "Oi" }).success).toBe(true);
    const r = registrarAtendimentoSchema.safeParse({ canal: "WHATSAPP", resumo: "Oi", proxEm: "2026-11-20" });
    expect(r.success ? [] : r.error.issues.map((i) => i.path[0])).toEqual(["proxResponsavel", "proxOque"]);
  });

  it("datas: dias entre duas datas e hoje em Brasília", () => {
    expect(diasEntre("2026-11-13", "2026-11-18")).toBe(5);
    expect(hojeBrasilia(new Date("2026-11-19T02:30:00Z"))).toBe("2026-11-18");
  });
});
