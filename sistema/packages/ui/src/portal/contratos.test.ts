import { describe, expect, it } from "vitest";
import type { RecebimentoPrevisto } from "@t3jus/domain";
import { fraseDoContrato, janelaProgramacao, resumoContrato, textoProximo } from "./contratos.ts";

const rec = (vencimento: string, valor: number | null, cancelado = false): RecebimentoPrevisto => ({
  id: vencimento + valor, tipo: "PARCELADO", descricao: "Parcela", vencimento, valor, origem: "PROGRAMADO", criadoEm: "2026-11-18T12:00:00Z",
  cancelado: cancelado ? { em: "2026-11-19T12:00:00Z", motivo: "Condição mudada: x" } : null, base: null,
});

describe("Contratos (CH-04, CH-06)", () => {
  it("o próximo recebimento soma o que vence no dia e diz o que falta definir", () => {
    expect(textoProximo({ situacao: "ATIVO", proximo: { em: "2026-12-10", valor: 66667, aDefinir: 1, itens: ["Parcela 1 de 3", "Percentual recorrente: mês 1 de 3"] } }))
      .toEqual({ linha: "10/12 · R$ 666,67 + a definir", sub: "parcela 1 de 3 e percentual recorrente: mês 1 de 3" });
    expect(textoProximo({ situacao: "ELABORACAO", proximo: null })).toBeNull();
  });

  it("o resumo do formulário junta o valor certo e o que depende do caso", () => {
    const r = resumoContrato([
      { tipo: "FIXO", valor: 150000, vencimento: "2026-11-25" },
      { tipo: "PARCELADO", total: 600000, parcelas: 6, primeiro: "2026-12-10" },
      { tipo: "EXITO", percentual: 3000, sobre: "Atrasados que o cliente receber", etapa: "Pagamento da RPV ou precatório", dias: 15 },
    ]);
    expect(r.certo).toBe(750000);
    expect(r.partes).toBe("fixo R$ 1.500,00 + parcelado R$ 6.000,00");
    expect(r.depende[0]!.titulo).toBe("30% atrasados que o cliente receber");
    expect(r.programacao.filter((x) => x.vencimento).length).toBe(7);
  });

  it("a programação da ficha mostra 3 meses à frente e conta o resto; cancelado não soma", () => {
    const j = janelaProgramacao([rec("2026-11-10", 100), rec("2026-12-10", 100), rec("2027-01-10", 100, true), rec("2027-03-10", 100), rec("2027-05-10", 100)], "2026-12-01");
    expect(j.mostrar.length).toBe(3);
    expect([j.depois, j.ate, j.programado]).toEqual([2, "2027-05-10", 400]);
  });

  it("o histórico diz o que mudou, com o motivo", () => {
    expect(fraseDoContrato({ em: "", acao: "contrato.editado", autor: "Paula", dados: { motivo: "Cliente pediu 4 parcelas", cancelados: 2, novos: 2, condicoes_antes: [] } }))
      .toEqual({ oque: "mudou as condições", detalhe: "Motivo: “Cliente pediu 4 parcelas”. 2 recebimentos futuros foram cancelados e 2 gerados de novo." });
    expect(fraseDoContrato({ em: "", acao: "estado.mudou", autor: null, dados: {} })).toBeNull();
  });
});

describe("EX-12: inscrições no histórico do contrato", () => {
  it("diz o depois e o antes de quem mudou", () => {
    expect(fraseDoContrato({ em: "", acao: "contrato.inscricoes_mudadas", autor: "Paula",
      dados: { antes: { "Felipe Matos": "OAB/SP nº 287.104", "Marina Ribeiro": "OAB/SP nº 214.538" }, depois: { "Felipe Matos": "OAB/RJ nº 245.880-S", "Marina Ribeiro": "OAB/SP nº 214.538" } } }))
      .toEqual({ oque: "mudou as inscrições na OAB do contrato", detalhe: "Felipe Matos: OAB/RJ nº 245.880-S (antes, OAB/SP nº 287.104)." });
  });
});

describe("F3.84: \"Não foi paga\" e \"Foi paga, sim\"", () => {
  it("a parcela que voltou para A receber entra na programação; a que voltou para a folha sai", () => {
    const paga = { ...rec("2026-11-10", 80000, true), pagoAntes: true, corrigida: true };
    const nova = { ...rec("2026-11-10", 80000), id: "nova", eraPagoAntes: true, podeVoltar: true };
    const desfeita = { ...rec("2026-10-10", 80000, true), id: "desfeita", eraPagoAntes: true };
    const j = janelaProgramacao([desfeita, paga, nova, rec("2026-12-10", 80000)], "2026-11-18");
    expect(j.mostrar.map((r) => r.id)).toEqual(["nova", "2026-12-1080000"]);
    expect(j.programado).toBe(160000);
  });

  it("o histórico diz a parcela, o vencimento e o motivo", () => {
    expect(fraseDoContrato({ em: "", acao: "contrato.parcela_nao_paga", autor: "Marina Ribeiro",
      dados: { descricao: "Parcela 2 de 6", vencimentoPlanilha: "2026-11-10", vencimento: "2026-11-10", motivo: "Rosa só pagou a primeira" } }))
      .toEqual({ oque: "passou a parcela 2 de 6 para A receber", detalhe: "Não foi paga. Vencimento mantido: 10/11/2026. Motivo: “Rosa só pagou a primeira”.", forte: true });
    expect(fraseDoContrato({ em: "", acao: "contrato.parcela_foi_paga", autor: "Marina Ribeiro", dados: { descricao: "Parcela 2 de 6", motivo: "Mandou o comprovante" } })!.oque)
      .toBe("voltou a parcela 2 de 6 para “Pago antes do T3jus”");
  });
});
