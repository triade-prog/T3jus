import { describe, expect, it } from "vitest";
import {
  ambarBaixaNoContrato, avisoBaixaFeita, avisoDesfeita, comQuemFica, conflitoDaBaixa, ehAnotacaoDoDesfazer, errosDaBaixa, geraComBaixas, linhasDaBaixa,
  nomeDaParcela, notaDaBaixa, notaReembolsoBaixado, REGUA_DEPOIS_DE_DESFAZER, responsavelDepoisDoDesfazer, rotuloExplicacao, textoCustas,
  textoCustasBaixadasVoltam, tituloErrosBaixa,
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

describe("F3.139: as correções da revisão do código", () => {
  const EM = "2026-11-18T10:14:00-03:00";
  it("nota 4 (FI-25): as custas com baixa junto dizem o motivo, quem e a parcela", () => {
    expect(notaReembolsoBaixado({ motivo: "INADIMPLENCIA", por: MARINA, em: EM, parcela: "Parcela 6 de 6" }))
      .toBe("Inadimplência, por Marina Ribeiro em 18/11, junto com a parcela 6/6");
    expect(notaReembolsoBaixado({ motivo: "PERDOADA", por: MARINA, em: EM, parcela: null })).toBe("Perdoada, por Marina Ribeiro em 18/11");
  });
  it("nota 6: Contratos, para quem tem o Financeiro, diz quantas tiveram baixa e o âmbar leva ao Financeiro", () => {
    expect(geraComBaixas(6, 1)).toBe("6 recebimentos programados · 1 com baixa sem receber.");
    expect(geraComBaixas(6, 0)).toBe("6 recebimentos programados.");
    expect(geraComBaixas(1, 0)).toBe("1 recebimento programado.");
    expect(ambarBaixaNoContrato({ descricao: "Parcela 6 de 6", baixa: { em: EM } })).toBe("Parcela 6 de 6: baixa sem receber em 18/11");
  });
  it("nota 8: o histórico de cobrança mostra a baixa e o desfazer, e a próxima ação diz por que ficou com quem desfez", () => {
    const baixa = { motivo: "INADIMPLENCIA" as const, por: MARINA, em: EM };
    expect(linhasDaBaixa({ baixa })).toEqual([
      { em: EM, quem: "Marina Ribeiro", oque: "deu baixa sem receber, às 10h14", texto: "Inadimplência. A régua desta parcela parou, sem mandar mais nada." },
    ]);
    const d = { por: MARINA, em: "2026-11-18T10:31:00-03:00", explicacao: "Noemi ligou e prometeu pagar em dezembro.", baixa };
    expect(linhasDaBaixa({ baixa: null, baixaDesfeita: d })).toEqual([
      { em: d.em, quem: "Marina Ribeiro", oque: "desfez a baixa sem receber, às 10h31",
        texto: "“Noemi ligou e prometeu pagar em dezembro.” A régua não manda de uma vez os passos que venceram durante a baixa." },
      { em: EM, quem: "Marina Ribeiro", oque: "deu baixa sem receber, às 10h14", texto: "Inadimplência. A cobrança parou." },
    ]);
    expect(linhasDaBaixa({})).toEqual([]);
    expect(ehAnotacaoDoDesfazer({ tipo: "ANOTACAO", texto: "Baixa sem receber desfeita: Noemi ligou", autor: MARINA }, d)).toBe(true);
    expect(ehAnotacaoDoDesfazer({ tipo: "ANOTACAO", texto: "Noemi ligou", autor: MARINA }, d)).toBe(false);
    expect(ehAnotacaoDoDesfazer({ tipo: "ANOTACAO", texto: "Baixa sem receber desfeita: x", autor: MARINA }, null)).toBe(false);
    expect(responsavelDepoisDoDesfazer(MARINA, d, FELIPE)).toBe("responsável: Marina Ribeiro, que desfez a baixa (Felipe, que cuida do contrato, não tem Financeiro)");
    expect(responsavelDepoisDoDesfazer(MARINA, d, MARINA)).toBe("responsável: Marina Ribeiro, que desfez a baixa");
    expect(responsavelDepoisDoDesfazer(DIEGO, d, DIEGO)).toBe("responsável: Diego Almeida");
  });
  it("sugestões 12 e 14: o desfazer diz que as custas voltam e que a régua não manda mais nada desta parcela", () => {
    expect(textoCustasBaixadasVoltam([{ valor: 41230 }])).toBe("O reembolso das custas, R$ 412,30, que teve baixa junto, também volta para A pagar, a reembolsar.");
    expect(textoCustasBaixadasVoltam([{ valor: 100 }, { valor: 200 }])).toMatch(/^Os reembolsos das custas, R\$ 3,00, que tiveram baixa junto, também voltam/);
    expect(REGUA_DEPOIS_DE_DESFAZER).toContain("nenhum aviso automático sai desta parcela");
  });
});
