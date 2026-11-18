import { describe, expect, it } from "vitest";
import type { FichaCliente } from "@t3jus/domain";
import { conferirCliente, corpoDoRascunho, diferencasCliente, juntarComE, lerData, lerHora, prontosParaProcuracao, rascunhoDaFicha, rascunhoVazio, rotuloProx } from "./clientes.ts";

const ficha = {
  id: "c1", tipo: "PF", nome: "Antônia Prado", documento: "52998224725", nacionalidade: "brasileira", estadoCivil: "VIUVO", profissao: null, rg: null, rgOrgao: null,
  cep: "04117030", endereco: "Rua A, 1", bairro: null, cidade: "São Paulo", uf: "SP", repNome: null, repCargo: null, repDocumento: null, repEstadoCivil: null,
  repProfissao: null, situacao: "ATIVO", inativadoEm: null, motivoInativacao: null, inativadoPor: null, criadoEm: "2026-11-01", criadoPor: null, versao: 2,
  comercial: true, podeInativar: true, faltando: ["PROFISSAO", "RG"], alterado: null, origem: "GOOGLE",
  contatos: [
    { id: "k1", nome: "Joana", papel: "Filha", telefone: "+5511991234567", email: null, principal: false },
    { id: "k2", nome: "Antônia Prado", papel: null, telefone: "+5511987654321", email: null, principal: true },
  ],
} as unknown as FichaCliente;

describe("Clientes do Portal: regras da tela", () => {
  it("rascunho da ficha: documento, CEP e telefones formatados; o principal marcado", () => {
    const r = rascunhoDaFicha(ficha);
    expect([r.documento, r.cep, r.contatos[0]!.telefone]).toEqual(["529.982.247-25", "04117-030", "(11) 99123-4567"]);
    expect(r.contatos.find((c) => c.chave === r.principal)?.id).toBe("k2");
    expect(corpoDoRascunho(r).contatos).toEqual([
      { id: "k1", nome: "Joana", papel: "Filha", telefone: "(11) 99123-4567", email: null, principal: false },
      { id: "k2", nome: "Antônia Prado", papel: null, telefone: "(11) 98765-4321", email: null, principal: true },
    ]);
  });

  it("conferir: textos aprovados presos ao campo e ao contato", () => {
    const r = { ...rascunhoVazio("PF"), documento: "529.982.247-24" };
    const v = conferirCliente(r);
    expect(v.ok).toBe(false);
    if (v.ok) return;
    const chave = r.contatos[0]!.chave;
    expect(v.erros.nome).toBe("Escreva o nome completo do cliente.");
    expect(v.erros.documento).toMatch(/^Confira o CPF/);
    expect(v.erros[`contato.${chave}.par`]).toMatch(/^Escreva um telefone ou um e-mail/);
  });

  it("conflito: só os campos que mudaram, com os nomes da tela", () => {
    const salvo = rascunhoDaFicha({ ...ficha, profissao: "Aposentada" } as FichaCliente);
    const meu = { ...rascunhoDaFicha(ficha), profissao: "Do lar", estadoCivil: "CASADO" };
    expect(diferencasCliente(salvo, meu).map((d) => [d.campo, d.salvo, d.meu])).toEqual([
      ["Estado civil", "Viúvo(a)", "Casado(a)"],
      ["Profissão", "Aposentada", "Do lar"],
    ]);
  });

  it("próximo contato: vencido, hoje, amanhã e dia da semana", () => {
    expect(rotuloProx({ em: "2026-11-13" }, "2026-11-18")).toMatchObject({ data: "13/11", rotulo: "vencido há 5 dias", tipo: "vencido" });
    expect(rotuloProx({ em: "2026-11-18" }, "2026-11-18").tipo).toBe("hoje");
    expect(rotuloProx({ em: "2026-11-19" }, "2026-11-18").rotulo).toBe("amanhã");
    expect(rotuloProx({ em: "2026-11-20" }, "2026-11-18").rotulo).toBe("sexta");
    expect(rotuloProx({ em: "2027-01-20" }, "2026-11-18").data).toBe("20/01/2027");
  });

  it("procuração, datas e horas digitadas", () => {
    expect(prontosParaProcuracao(ficha)).toEqual({ prontos: 4, total: 6, faltam: ["Profissão", "RG"] });
    expect(juntarComE(["a", "b", "c"])).toBe("a, b e c");
    expect([lerData("18/11/2026"), lerData("31/02/2026"), lerData("2026-11-18")]).toEqual(["2026-11-18", null, null]);
    expect([lerHora("9:05"), lerHora("15h10"), lerHora("25:00")]).toEqual(["09:05", "15:10", null]);
  });
});
