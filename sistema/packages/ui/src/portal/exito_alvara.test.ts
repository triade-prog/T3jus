import { describe, expect, it } from "vitest";
import type { HonorariosDoAlvara } from "@t3jus/domain";
import {
  AVISO_NAO_COBRAR_ALVARA, avisoConferir, avisoLimiteDoExito, confirmacaoLancado, fechamentoPagou, fraseDinheiroPeloEscritorio, linhaCurtaDoExito,
  recusaNaoCobrar, textoLancadoDepois, textoPagou, textoVerLevantamento,
} from "./exito_alvara.ts";

const HELENA = { id: "h", nome: "Helena Duarte" };
const DIEGO = { id: "d", nome: "Diego Almeida" };
const UM: HonorariosDoAlvara[] = [{ levantamentoId: "l1", tipo: "ALVARA", entrouEm: "2026-11-12", livre: 480000 }];
const DOIS: HonorariosDoAlvara[] = [
  { levantamentoId: "l0", tipo: "ALVARA", entrouEm: "2026-11-05", livre: 180000 },
  { levantamentoId: "l1", tipo: "ALVARA", entrouEm: "2026-11-12", livre: 300000 },
];
const nb = (s: string) => s.replace(/\u00a0/g, " ");

describe("F3.199: o êxito lançado depois do alvará já nasce pago (CH-07, FI-05)", () => {
  it("ea-conferir: o aviso informativo, com o link para o alvará", () => {
    const a = avisoConferir({ cliente: HELENA, honorariosAlvara: UM }, 480000)!;
    expect(a.tom).toBe("info");
    expect(nb(a.titulo)).toBe("Já entraram R$ 4.800,00 de honorários do êxito de Helena, pelo alvará de 12/11/2026.");
    expect(a.paras).toEqual(["Ao lançar, a parcela do êxito nasce paga por esses honorários. Se o valor lançado for maior, o resto fica em A receber."]);
    expect(a.link).toEqual({ texto: "Ver o alvará de 12/11 em Repasses", levantamentoId: "l1" });
    expect(a.lista).toEqual([]);
    expect(avisoConferir({ cliente: HELENA, honorariosAlvara: [] }, 480000)).toBeNull();
    expect(avisoConferir({ cliente: HELENA }, 480000)).toBeNull();
  });
  it("ea-conferir-sobra: o lançado menor vira atenção e pede a devolução", () => {
    const a = avisoConferir({ cliente: HELENA, honorariosAlvara: UM }, 300000)!;
    expect(a.tom).toBe("atencao");
    expect(nb(a.paras.join(" "))).toBe("Ao lançar, a parcela do êxito nasce paga por esses honorários. Os honorários do alvará passam do êxito lançado em R$ 1.800,00. "
      + "Esse valor foi descontado de Helena além do êxito. Combine com Helena a devolução, que ainda é feita fora do T3jus.");
    expect(avisoConferir({ cliente: HELENA, honorariosAlvara: UM }, null)!.tom).toBe("info");
  });
  it("ea-conferir-dois: dois alvarás, com a lista do mais antigo", () => {
    const a = avisoConferir({ cliente: HELENA, honorariosAlvara: DOIS }, 480000)!;
    expect(nb(a.titulo)).toBe("Já entraram R$ 4.800,00 de honorários do êxito de Helena, por 2 alvarás.");
    expect(a.lista).toEqual([{ rotulo: "Alvará de 05/11/2026", valor: 180000 }, { rotulo: "Alvará de 12/11/2026", valor: 300000 }]);
    expect(a.paras[0]).toContain("a começar pelo alvará mais antigo");
    expect(a.link).toBeNull();
  });
  it("revisão do desenho, nota 7: o link segue o tipo do levantamento", () => {
    expect(textoVerLevantamento({ tipo: "RPV", entrouEm: "2026-11-12" })).toBe("Ver o RPV de 12/11 em Repasses");
    expect(textoVerLevantamento({ tipo: "ALVARA", entrouEm: "2026-11-12" })).toBe("Ver o alvará de 12/11 em Repasses");
  });
  it("as duas frases revistas valem sem honorários já entrados", () => {
    expect(fraseDinheiroPeloEscritorio("ACORDO")).toBe("Se o dinheiro do acordo entrar pelo escritório (alvará ou depósito na conta), o honorário sai na divisão de Repasses e paga esta parcela, até o que faltar dela.");
    expect(AVISO_NAO_COBRAR_ALVARA.texto).not.toContain("baixado");
  });
  it("ea-nao-cobrar: a recusa (C2)", () => {
    const r = recusaNaoCobrar({ cliente: HELENA, honorariosAlvara: UM })!;
    expect(nb(r.titulo)).toBe("Os honorários deste êxito já entraram pelo alvará de 12/11 (R$ 4.800,00).");
    expect(r.texto).toBe("Para não cobrar, o dinheiro teria de voltar para Helena, e isso ainda não é feito pelo T3jus. Lance o êxito: ele nasce pago.");
    expect(r.descricao).toBe("Este êxito não pode ficar sem cobrança, porque os honorários dele já entraram. Volte para conferir e lance o êxito de Helena.");
    expect(recusaNaoCobrar({ cliente: HELENA, honorariosAlvara: [] })).toBeNull();
  });
  it("ea-lancado: a confirmação, com o dia do pagamento", () => {
    const p = [{ tipo: "ALVARA" as const, entrouEm: "2026-11-12", valor: 480000 }];
    const c = confirmacaoLancado("Helena Duarte", 480000, "2026-12-15", p);
    expect(c.titulo).toBe("Êxito lançado e pago em 12/11, pelo alvará.");
    expect(nb(c.texto)).toBe("Nada ficou em A receber. R$ 4.800,00 de Helena Duarte, pagos pelos honorários do alvará. Ficou no histórico do caso, do contrato e do repasse.");
    const parte = confirmacaoLancado("Helena Duarte", 480000, "2026-12-15", [{ tipo: "ALVARA", entrouEm: "2026-11-12", valor: 300000 }]);
    expect(parte.titulo).toBe("Êxito lançado.");
    expect(nb(parte.texto)).toBe("R$ 3.000,00 pagos em 12/11, pelo alvará, e R$ 1.800,00 ficam em A receber, com vencimento em 15/12.");
    expect(confirmacaoLancado("Helena Duarte", 480000, "2026-12-15", []).titulo).toBe("Êxito lançado em A receber.");
    expect(confirmacaoLancado("Helena Duarte", 480000, "2026-12-15", undefined).titulo).toBe("Êxito lançado em A receber.");
  });
  it("ea-proposta: a linha curta para cada situação", () => {
    expect(linhaCurtaDoExito({ situacao: "PARA_CONFERIR", calculado: 480000 }, "Helena Duarte")).toBe("O êxito de Helena ainda não foi lançado. Estes honorários pagam a parcela quando ela for lançada.");
    expect(linhaCurtaDoExito({ situacao: "SEM_CONFERENCIA" }, "Helena Duarte")).toBe("O caso de Helena ainda não foi encerrado. Estes honorários pagam o êxito quando ele for lançado.");
    expect(linhaCurtaDoExito({ situacao: "LANCADO", valor: 480000, falta: 180000 }, "Helena Duarte")).toBeNull();
    expect(linhaCurtaDoExito({ situacao: "PAGO", valor: 480000, falta: 0, pagoEm: "2026-11-12" }, "Helena Duarte")).toBeNull();
    expect(linhaCurtaDoExito({ situacao: "NAO_COBRADO" }, "Helena Duarte")).toBeNull();
    expect(linhaCurtaDoExito(null, "Helena Duarte")).toBeNull();
  });
  it("ea-exito-pago e ea-exito-falta: o aviso do limite (C3), só com semLimite", () => {
    const pago = avisoLimiteDoExito({ exitoSituacao: { situacao: "PAGO", valor: 480000, falta: 0, pagoEm: "2026-11-12" }, linhas: [] }, "Helena Duarte", "ALVARA")!;
    expect(nb(pago.titulo)).toBe("O êxito de Helena já foi pago (R$ 4.800,00, em 12/11).");
    expect(pago.texto).toBe("Por isso, este alvará não tem honorários do êxito.");
    const linha = { para: "HONORARIOS" as const, nome: "Honorários de êxito", regra: "30% · acordo · contrato C-2026-027 · até o que falta do êxito", valor: 180000 };
    const falta = avisoLimiteDoExito({ exitoSituacao: { situacao: "LANCADO", valor: 480000, falta: 180000 }, linhas: [{ ...linha, semLimite: 300000 }] }, "Helena Duarte", "ALVARA")!;
    expect(nb(falta.titulo)).toBe("Falta R$ 1.800,00 do êxito de Helena.");
    expect(nb(falta.texto)).toBe("Os honorários deste alvará ficam limitados a esse valor. Pelos 30% do contrato, seriam R$ 3.000,00.");
    expect(avisoLimiteDoExito({ exitoSituacao: { situacao: "LANCADO", valor: 480000, falta: 180000 }, linhas: [{ ...linha, valor: 150000, semLimite: null }] }, "Helena Duarte", "ALVARA")).toBeNull();
    expect(avisoLimiteDoExito({ exitoSituacao: { situacao: "PARA_CONFERIR", calculado: 480000 }, linhas: [linha] }, "Helena Duarte", "ALVARA")).toBeNull();
  });
  it("ea-repasse: a linha da parte, o fechamento e o histórico, nos dois caminhos", () => {
    const p = { parcelaId: "p", descricao: "Êxito · Duarte x Construtora Atlas", valor: 480000, lancadaEm: "2026-11-18T13:20:00Z", pagaEm: "2026-11-12", contrato: "C-2026-027", lancadaPor: DIEGO };
    expect(textoPagou(p)).toBe("Pagou a parcela do êxito, lançada em 18/11");
    expect(fechamentoPagou(p, "ALVARA")).toEqual({ titulo: "Êxito do contrato C-2026-027: pago por este alvará", detalhe: "lançado por Diego Almeida em 18/11 · pago em 12/11" });
    // O alvará depois do lançar (0651): a parcela já existia; a mesma linha e o mesmo item.
    expect(fechamentoPagou({ ...p, lancadaEm: "2026-10-20T13:00:00Z", pagaEm: "2026-11-18" }, "RPV").titulo).toBe("Êxito do contrato C-2026-027: pago por este RPV");
    const h = textoLancadoDepois({ valor: 480000 }, "Helena Duarte", "2026-11-18T13:20:00Z", DIEGO);
    expect(nb(h.texto)).toBe("A parcela do êxito de Helena foi lançada em 18/11 por Diego e paga por esta parte de honorários (R$ 4.800,00).");
    expect(h.quem).toBe("Diego Almeida, ao conferir o êxito em A receber");
  });
});
