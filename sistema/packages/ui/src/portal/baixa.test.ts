import { describe, expect, it } from "vitest";
import {
  ambarBaixaNoContrato, avisoBaixaFeita, avisoDesfeita, comQuemFica, conflitoDaBaixa, ehAnotacaoDoDesfazer, errosDaBaixa, geraComBaixas, linhasDaBaixa,
  nomeDaParcela, notaDaBaixa, notaReembolsoBaixado, REGUA_DEPOIS_DE_DESFAZER, responsavelDepoisDoDesfazer, rotuloExplicacao, textoCustas,
  textoCustasBaixadasVoltam, tituloErrosBaixa,
  conflitoDoExito, errosDoExito, nomeDoLevantamento, porQueDesfazer, quemRegistrou, textoExitoBaixado, textoExitoMantido, tituloErrosExito,
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

describe("F3.174: o êxito baixado na divisão do alvará (FI-24, FI-25)", () => {
  const baixa = { id: "b", motivo: "INADIMPLENCIA" as const, explicacao: "Rita disse que o banco não pagou o acordo; não vamos cobrar agora.",
    valor: 480000, recebidoAntes: 0, por: MARINA, em: "2026-11-05T13:00:00Z", reembolsos: [], desfeita: null };
  const rita = { descricao: "Êxito · Fonseca x Banco Aurora", valor: 480000, baixa };
  it("eb-proposta: o aviso, com inadimplência, e o texto do alvará", () => {
    const t = textoExitoBaixado(rita, "Rita Fonseca", "ALVARA");
    expect(t.titulo).toBe("O êxito de Rita está com baixa sem receber.");
    expect(t.detalhe).toBe("Êxito · Fonseca x Banco Aurora · R$ 4.800,00 · inadimplência, por Marina Ribeiro em 05/11/2026.");
    expect(t.texto).toBe("Se os honorários deste alvará pagam esse êxito, desfaça a baixa antes de dividir. Se o escritório decidiu não cobrar, mantenha a baixa e tire os honorários: o valor fica com Rita.");
    expect([t.parcial, t.custas, t.renegociada]).toEqual([null, null, null]);
  });
  it("as variações das notas: perdoada, paga em parte, custas junto e renegociada", () => {
    expect(textoExitoBaixado({ ...rita, baixa: { ...baixa, motivo: "PERDOADA" } }, "Rita Fonseca").detalhe).toContain("· perdoada, por Marina Ribeiro");
    expect(textoExitoBaixado({ ...rita, baixa: { ...baixa, recebidoAntes: 100000, valor: 380000 } }, "Rita Fonseca").parcial)
      .toBe("Recebido R$ 1.000,00 de R$ 4.800,00. A baixa sem receber foi dos R$ 3.800,00 que faltavam.");
    expect(textoExitoBaixado({ ...rita, baixa: { ...baixa, reembolsos: [{ contaId: "c", descricao: "custas", valor: 41230, categoria: "CUSTAS" }] } }, "Rita Fonseca").custas)
      .toBe("As custas de R$ 412,30 tiveram baixa junto. Ao desfazer, elas entram na divisão como reembolso.");
    const r = textoExitoBaixado({ ...rita, baixa: { ...baixa, motivo: "RENEGOCIADA" } }, "Rita Fonseca", "RPV");
    expect(r.texto).toBe("Os honorários deste RPV pagam esse êxito: desfaça a baixa antes de dividir.");
    expect(r.renegociada).toContain("mudando as condições do contrato");
  });
  it("eb-erro: sem escolher, e com o desfazer sem explicação", () => {
    expect(errosDoExito(null, "", "Rita Fonseca", false).exito)
      .toBe("Escolha o que fazer com o êxito de Rita: desfazer a baixa sem receber ou tirar os honorários.");
    expect(errosDoExito("DESFAZER", " a ", "Rita Fonseca", false).porque).toBe("Escreva por que desfazer, com pelo menos 3 letras.");
    expect(errosDoExito("MANTER", "", "Rita Fonseca", false)).toEqual({});
    expect(tituloErrosExito(1)).toBe("Falta acertar 1 coisa.");
  });
  it("eb-desfazer-escolhido: o por que já preenchido", () => {
    expect(porQueDesfazer("ALVARA", 1600000, "2026-11-18")).toBe("O alvará de R$ 16.000,00 entrou em 18/11 e paga o êxito.");
    expect(nomeDoLevantamento("ACORDO")).toBe("depósito de acordo");
  });
  it("eb-conflito: quem desfez ou deu a baixa, na hora de Brasília", () => {
    const d = { motivo: "EXITO_MUDOU", tipo: "DESFEITA", por: { id: "b", nome: "Bianca Torres" }, em: "2026-11-18T13:13:00Z" };
    expect(conflitoDoExito(d, "2026-11-18", "Rita Fonseca")).toEqual({
      titulo: "Bianca Torres desfez a baixa sem receber do êxito de Rita às 10h13.",
      texto: "Nada foi registrado. Veja a divisão refeita antes de registrar.",
    });
    expect(conflitoDoExito({ ...d, tipo: "BAIXA" }, "2026-11-18", "Rita Fonseca")?.titulo)
      .toBe("Bianca Torres deu baixa sem receber no êxito de Rita às 10h13.");
    expect(conflitoDoExito({ ...d, em: "2026-11-18T02:30:00Z" }, "2026-11-18", "Rita Fonseca")?.titulo).toContain("em 17/11, às 23h30");
    expect(conflitoDoExito({ motivo: "PARCELA_MUDOU" }, "2026-11-18", "Rita Fonseca")).toBeNull();
  });
  it("eb-historico: a linha do repasse registrado com Manter, sem a explicação", () => {
    expect(textoExitoMantido({ baixas: [{ motivo: "INADIMPLENCIA", por: MARINA, em: "2026-11-05T13:00:00Z" }] }, "Rita Fonseca"))
      .toBe("Registrado sem os honorários do êxito: a parcela de Rita continua com baixa sem receber (inadimplência, por Marina Ribeiro em 05/11).");
    expect(quemRegistrou("Diego Almeida", "ALVARA")).toBe("Diego Almeida, ao registrar o alvará");
  });
});
