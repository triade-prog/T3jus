import { describe, expect, it } from "vitest";
import {
  avisoBaixaFeita, avisoDesfeita, comQuemFica, conflitoDaBaixa, errosDaBaixa, nomeDaParcela, notaDaBaixa, rotuloExplicacao, textoCustas, tituloErrosBaixa,
} from "./baixa.ts";

const MARINA = { id: "m", nome: "Marina Ribeiro" };
const DIEGO = { id: "d", nome: "Diego Almeida" };
const FELIPE = { id: "f", nome: "Felipe Matos" };

describe("F3.139: dar baixa sem receber (FI-24, FI-25)", () => {
  it("nota 9: o nome da parcela no botão e no aviso", () => {
    expect(nomeDaParcela("Parcela 6 de 6")).toBe("parcela 6/6");
    expect(nomeDaParcela("Fixo")).toBe("parcela fixo");
  });
  it("decisões 7, 8 e 13: o motivo e a explicação são obrigatórios, com o resumo no topo", () => {
    expect(errosDaBaixa(null, " a ")).toEqual({ motivo: "Escolha o motivo.", explicacao: "Escreva a explicação, com pelo menos 3 letras." });
    expect(errosDaBaixa("PERDOADA", "Perdoamos")).toEqual({});
    expect(tituloErrosBaixa(2)).toBe("Faltam 2 coisas para dar baixa sem receber.");
    expect(tituloErrosBaixa(1)).toBe("Falta 1 coisa para dar baixa sem receber.");
    expect(rotuloExplicacao(null)).toBe("Explicação");
    expect(rotuloExplicacao("PERDOADA")).toBe("Por que e quem decidiu");
    expect(rotuloExplicacao("INADIMPLENCIA")).toBe("O que aconteceu");
    expect(rotuloExplicacao("RENEGOCIADA")).toBe("O que foi combinado");
  });
  it("nota 5: para onde vão as custas", () => {
    expect(textoCustas({ valor: 41230, depois: null }, "Noemi Bastos Carvalho", "2026-11-18"))
      .toBe("As custas de R$ 412,30 ficam a reembolsar, em A pagar: não há outra parcela de Noemi para elas irem junto.");
    expect(textoCustas({ valor: 8640, depois: { id: "x", descricao: "Parcela 5 de 6", vencimento: "2026-12-05", valor: 90000, contrato: { id: "c", numero: "C-1" } } }, "Sebastião Lopes", "2026-11-18"))
      .toBe("As custas de R$ 86,40 passam a ir junto com a parcela 5/6, de dezembro.");
  });
  it("decisões 10 e 25: a nota da linha, com o recebido antes quando paga em parte", () => {
    const b = { motivo: "INADIMPLENCIA" as const, por: MARINA, em: "2026-11-18T13:14:00Z", recebidoAntes: 0, valor: 100000 };
    expect(notaDaBaixa(b)).toBe("Inadimplência · por Marina Ribeiro em 18/11");
    expect(notaDaBaixa({ ...b, motivo: "RENEGOCIADA", recebidoAntes: 40000, valor: 50000 }))
      .toBe("Recebido R$ 400,00 · baixa sem receber de R$ 500,00. Renegociada · por Marina Ribeiro em 18/11");
  });
  it("decisão 14: os conflitos dizem quem mexeu e quando, e que nada foi baixado", () => {
    const c = conflitoDaBaixa({ motivo: "PARCELA_MUDOU", por: DIEGO, em: "2026-11-18T13:13:00Z", valor: 50000, faltaAntes: 100000, falta: 50000 }, "2026-11-18");
    expect(c).toEqual({ titulo: "Diego Almeida registrou R$ 500,00 nesta parcela às 10h13.", quem: "Diego Almeida, hoje às 10h13", faltava: 100000, como: "Faltam R$ 500,00, ainda em atraso" });
    expect(conflitoDaBaixa({ motivo: "PARCELA_JA_BAIXADA", por: { id: "b", nome: "Bianca Torres" }, em: "2026-11-18T13:13:00Z" }, "2026-11-18")?.titulo)
      .toBe("Bianca Torres já deu baixa nesta parcela às 10h13.");
    expect(conflitoDaBaixa({ motivo: "PARCELA_JA_PAGA" }, "2026-11-18")).toBeNull();
  });
  it("decisão 15: o aviso depois da baixa, com o caso pronto e as custas", () => {
    const r = { descricao: "Parcela 6 de 6", casos: [{ id: "k", nome: "Carvalho x Construtora Lume", pronto: true, espera: false, fechado: null }], reembolsosBaixados: 0, baixa: null };
    expect(avisoBaixaFeita(r, "Noemi Bastos Carvalho", 41230)).toEqual({
      titulo: "A parcela 6/6 de Noemi saiu de Em atraso sem receber.",
      texto: "O caso Carvalho x Construtora Lume já pode ser encerrado no financeiro. As custas de R$ 412,30 ficaram a reembolsar, em A pagar. Dá para desfazer na linha da parcela.",
    });
  });
  it("decisão 17, pergunta 6: com quem fica a próxima ação do desfazer", () => {
    expect(comQuemFica(MARINA, "Marina Ribeiro", FELIPE)).toBe("com você");
    expect(comQuemFica(MARINA, "Diego Almeida", MARINA)).toBe("com Marina Ribeiro, que cuida do contrato");
    expect(avisoDesfeita({ descricao: "Parcela 6 de 6", proximaAcao: { com: MARINA, data: "2026-11-19", cliente: "Noemi Bastos Carvalho" } }, "Marina Ribeiro"))
      .toEqual({ titulo: "A parcela 6/6 voltou para Em atraso.", texto: "A próxima ação é falar com Noemi amanhã, com você." });
  });
});
