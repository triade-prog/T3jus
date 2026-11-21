import { describe, expect, it } from "vitest";
import type { ParcelaLinha } from "@t3jus/domain";
import { situacaoPrestacao, gruposPorCliente, gruposPorVencimento, mesReferencia, origemConta, quandoAcao, quandoConta, seloParcela } from "./financeiro.ts";

const parc = (vencimento: string, falta: number, contrato = "c1", cliente = "Hélio"): ParcelaLinha => ({
  id: vencimento + contrato, tipo: "PARCELADO", descricao: "Parcela 1 de 6", vencimento, valor: falta, recebido: 0, falta, forma: null,
  situacao: "A_VENCER", pagaEm: null, contrato: { id: contrato, numero: "C-2026-001", objeto: "Ação" }, cliente: { id: cliente, nome: cliente },
  responsavel: { id: "d", nome: "Diego" }, cobranca: null, cancelado: null,
});

describe("Financeiro, A receber (FI-01 a FI-04)", () => {
  it("o mês de referência só leva o ano quando não é o corrente", () => {
    expect(mesReferencia("2026-10-25", "2026-11-18")).toBe("outubro");
    expect(mesReferencia("2027-01-25", "2026-11-18")).toBe("janeiro de 2027");
  });

  it("a situação da parcela em palavras", () => {
    const hoje = "2026-11-18"; // quarta
    expect(seloParcela({ situacao: "VENCIDA", vencimento: "2026-10-25", falta: 1, pagaEm: null }, hoje).texto).toBe("Vencida há 24 dias");
    expect(seloParcela({ situacao: "A_VENCER", vencimento: "2026-11-19", falta: 1, pagaEm: null }, hoje).texto).toBe("Amanhã");
    expect(seloParcela({ situacao: "A_VENCER", vencimento: "2026-11-20", falta: 1, pagaEm: null }, hoje).texto).toBe("Sexta");
    expect(seloParcela({ situacao: "A_VENCER", vencimento: "2026-11-28", falta: 1, pagaEm: null }, hoje).texto).toBe("A vencer");
    expect(seloParcela({ situacao: "PARCIAL", vencimento: "2026-11-30", falta: 35000, pagaEm: null }, hoje).texto).toBe("Parcial · falta R$ 350,00");
    expect(seloParcela({ situacao: "PAGA", vencimento: "2026-09-25", falta: 0, pagaEm: "2026-09-29" }, hoje).texto).toBe("Paga em 29/09");
    expect(quandoAcao("2026-11-19", hoje)).toBe("amanhã, 19/11");
    expect(quandoAcao(hoje, hoje)).toBe("hoje");
  });

  it("os grupos por vencimento somam o que falta em cada um", () => {
    const g = gruposPorVencimento([parc("2026-10-25", 85000), parc("2026-11-20", 400000), parc("2026-11-30", 96000), parc("2027-01-25", 85000)], "2026-11-18");
    expect(g.map((x) => [x.titulo, x.parcelas.length, x.total])).toEqual([
      ["Vencidas", 1, 85000], ["Próximos 7 dias", 1, 400000], ["Até 30/11", 1, 96000], ["Depois de 30/11", 1, 85000],
    ]);
  });

  it("por cliente: um grupo por contrato, da maior soma para a menor", () => {
    const g = gruposPorCliente([parc("2026-11-20", 100, "c1", "Hélio"), parc("2026-11-25", 500, "c2", "Irene"), parc("2026-12-20", 100, "c1", "Hélio")]);
    expect(g.map((x) => [x.titulo.split(" · ")[0], x.total])).toEqual([["Irene", 500], ["Hélio", 200]]);
  });
});

describe("A pagar", () => {
  const hoje = "2026-11-18";
  it("quandoConta: hoje, amanhã, dia da semana, atraso e ano", () => {
    expect([quandoConta("2026-11-18", hoje), quandoConta("2026-11-19", hoje), quandoConta("2026-11-20", hoje)]).toEqual(["hoje", "amanhã", "sexta"]);
    expect([quandoConta("2026-11-17", hoje), quandoConta("2026-11-10", hoje), quandoConta("2026-12-20", hoje)]).toEqual(["ontem", "há 8 dias", "2026"]);
  });
  it("origemConta: recorrente, adiantada e à mão", () => {
    const base = { recorrente: null, adiantada: null, forma: null } as const;
    expect(origemConta({ ...base, recorrente: { dia: 20, mes: "2026-11-01", lancadaSozinha: true } }))
      .toEqual({ titulo: "Recorrente · todo dia 20", detalhe: "Lançada sozinha em 01/11", repete: true });
    expect(origemConta({ ...base, adiantada: { cliente: { id: "c", nome: "Daniela Rocha Mendes" }, caso: null, como: "LEVANTAMENTO", reembolsadoEm: null, parcela: null } }).detalhe)
      .toBe("Vira reembolso de Daniela");
    expect(origemConta({ ...base, forma: "PIX" })).toEqual({ titulo: "Lançada à mão", detalhe: "Pix", repete: false });
  });
});

describe("Prestação de contas pela fila do WhatsApp (F3.44)", () => {
  const p = { id: "m", em: "2026-12-01T13:15:00Z", envioEm: null, motivo: null, para: "Joana Prado", telefone: "+5511996027732" };
  it("diz onde está a mensagem e quando foi lida", () => {
    expect(situacaoPrestacao({ ...p, envio: "NA_FILA" })).toBe("na fila do WhatsApp do escritório desde 01/12, às 10h15");
    expect(situacaoPrestacao({ ...p, envio: "LIDA", envioEm: "2026-12-01T14:02:00Z" })).toBe("lida pelo cliente em 01/12, às 11h02");
    expect(situacaoPrestacao({ ...p, envio: "FALHOU", motivo: "Número sem WhatsApp" })).toBe("não entregue: número sem WhatsApp");
  });
});
