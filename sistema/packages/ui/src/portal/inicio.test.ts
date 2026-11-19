import { describe, expect, it } from "vitest";
import type { ContatoDoDia } from "@t3jus/domain";
import { diaDaSemana, discoData, hojeLongo, nomesDeHoje, peDoLimite, rotuloAtraso, saudacao, subtituloContatos } from "./inicio.ts";

const item = (nome: string): ContatoDoDia => ({
  clienteId: nome, tipo: "PF", nome, contatoPrincipal: null, em: "2026-11-18", oque: "Ligar", vencido: false, diasAtraso: 0,
  responsavel: { id: "d", nome: "Diego Almeida" },
});

describe("Início do Portal (F1.14)", () => {
  it("cumprimenta pela hora de Brasília", () => {
    expect(saudacao(new Date("2026-11-18T12:00:00Z"))).toBe("Bom dia");
    expect(saudacao(new Date("2026-11-18T18:00:00Z"))).toBe("Boa tarde");
    expect(saudacao(new Date("2026-11-19T00:30:00Z"))).toBe("Boa noite");
    expect(hojeLongo(new Date("2026-11-18T12:00:00Z"))).toBe("Quarta-feira, 18 de novembro");
  });

  it("diz o atraso e a data como no desenho", () => {
    expect(rotuloAtraso(1)).toBe("vencido ontem");
    expect(rotuloAtraso(8)).toBe("vencido há 8 dias");
    expect(discoData("2026-11-10")).toEqual({ dia: "10", mes: "nov" });
    expect(diaDaSemana("2026-11-20")).toBe("sexta, 20/11");
  });

  it("resume os contatos no subtítulo e no hero", () => {
    expect(subtituloContatos({ de: "MEUS", totalVencidos: 3, totalHoje: 2 })).toBe("Os seus: 3 vencidos e 2 para hoje");
    expect(subtituloContatos({ de: "MEUS", totalVencidos: 0, totalHoje: 1 })).toBe("Os seus: 1 para hoje");
    expect(subtituloContatos({ de: "MEUS", totalVencidos: 0, totalHoje: 0 })).toBe("Os seus: nada vencido, nada para hoje");
    expect(subtituloContatos({ de: "EQUIPE", totalVencidos: 4, totalHoje: 3 })).toBe("Da equipe: 4 vencidos e 3 para hoje, com o responsável de cada um");
    expect(nomesDeHoje([item("Rafael Moura"), item("Lúcia Barros")], 2)).toBe("Rafael e Lúcia");
    expect(nomesDeHoje([item("Rafael Moura"), item("Lúcia Barros")], 4)).toBe("Rafael, Lúcia e mais 2");
  });

  it("o pé diz quantos ficaram de fora e de que tipo", () => {
    const cinco = [1, 2, 3, 4, 5].map((n) => item(String(n)));
    expect(peDoLimite({ vencidos: cinco, hoje: [], totalVencidos: 7, totalHoje: 2 })).toBe("Mostrando 5 de 9. Os outros 4: 2 vencidos e 2 de hoje.");
    expect(peDoLimite({ vencidos: cinco.slice(0, 3), hoje: cinco.slice(0, 2), totalVencidos: 3, totalHoje: 2 })).toBeNull();
  });
});
