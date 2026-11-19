import { describe, expect, it } from "vitest";
import { textoAvisoEtapa } from "@t3jus/domain";
import { botaoMudar, juntarNomes, linhaProcesso, posicaoEtapa, proximaEtapa, telefoneBr } from "./juridico.ts";

const etapas = [1, 2, 3, 4, 5, 6, 7, 8].map((ordem) => ({ ordem, nome: `E${ordem}` }));

describe("Jurídico, casos (EX-01, EX-03, EX-14)", () => {
  it("a linha do processo mostra o número no padrão do CNJ ou que ainda não tem", () => {
    expect(linhaProcesso({ numero: "10012347720265020011", area: "TRABALHISTA" })).toBe("1001234-77.2026.5.02.0011 · Trabalhista");
    expect(linhaProcesso({ numero: null, area: "FAMILIA" })).toBe("Sem número ainda · Família");
  });

  it("posição e próxima etapa", () => {
    expect(posicaoEtapa(5, etapas)).toBe("5 de 8");
    expect(proximaEtapa(5, etapas)).toBe("E6");
    expect(proximaEtapa(8, etapas)).toBeNull();
  });

  it("o botão diz para onde vai e se avisa", () => {
    expect(botaoMudar("Recurso", false, true)).toBe("Mudar para Recurso e avisar");
    expect(botaoMudar("Encerrado", true, false)).toBe("Encerrar o caso");
    expect(botaoMudar(null, false, true)).toBe("Mudar etapa");
  });

  it("nomes e telefone", () => {
    expect(juntarNomes(["Joana", "Carlos"])).toBe("Joana e Carlos");
    expect(juntarNomes(["A", "B", "C"])).toBe("A, B e C");
    expect(telefoneBr("+5511985521034")).toBe("(11) 98552-1034");
  });

  it("o aviso ao cliente igual ao do servidor", () => {
    expect(textoAvisoEtapa("Joana Pereira", "Ribeiro & Matos", "Mercado Bom Preço", "vamos pedir para o tribunal rever a decisão."))
      .toBe("Olá, Joana. Aqui é do escritório Ribeiro & Matos. Novidade no seu processo contra Mercado Bom Preço: vamos pedir para o tribunal rever a decisão. Qualquer dúvida, é só responder esta mensagem.");
  });
});
