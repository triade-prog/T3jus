// Comercial (AP-03, AP-06, CH-06): textos dos retornos, o rascunho das condições de honorário
// indo e voltando do formato do servidor, e o histórico da proposta.
import { describe, expect, it } from "vitest";
import { faixaVencidos, quandoRetorno, taxa, textoPeriodo, textoUltimo, valorDaProposta } from "./comercial.ts";
import { errosPorCondicao, idDoErro } from "./Honorarios.tsx";
import { lerCondicao, ordenar, rascunhoCondicao, rascunhoDe, temDado } from "./honorarios.ts";
import { fraseDaProposta } from "./FichaProposta.tsx";

describe("AP-06: quando é o retorno", () => {
  it("diz há quantos dias venceu, hoje, o dia da semana e depois a data", () => {
    expect(quandoRetorno("2026-11-10", "2026-11-18")).toBe("há 8 dias");
    expect(quandoRetorno("2026-11-17", "2026-11-18")).toBe("ontem");
    expect(quandoRetorno("2026-11-18", "2026-11-18")).toBe("hoje");
    expect(quandoRetorno("2026-11-20", "2026-11-18")).toBe("sexta");
    expect(quandoRetorno("2026-12-02", "2026-11-18")).toBe("02/12");
  });
  it("resume os vencidos e o último atendimento", () => {
    expect(faixaVencidos(["2026-11-10", "2026-11-13"], "2026-11-18")).toBe("de 5 a 8 dias");
    expect(faixaVencidos(["2026-11-17"], "2026-11-18")).toBe("de 1 dia");
    expect(textoUltimo({ em: "2026-11-03T13:00:00Z", canal: "TELEFONE", comQuem: "Marta Corrêa (esposa)" })).toBe("03/11 · telefone · com Marta Corrêa (esposa)");
    expect(textoUltimo({ em: "2026-11-06T13:00:00Z", canal: "WHATSAPP", comQuem: null })).toBe("06/11 · WhatsApp");
  });
  it("taxa e período", () => {
    expect(taxa(9, 24)).toBe("38%");
    expect(taxa(1, 0)).toBe("—");
    expect(textoPeriodo("2026-08-20", "2026-11-18")).toBe("20/08 a 18/11/2026");
  });
});

describe("CH-06: rascunho das condições", () => {
  it("lê o que a pessoa digitou no formato do servidor", () => {
    const r = { ...rascunhoCondicao("PARCELADO"), total: "4.000,00", parcelas: "4", primeiro: "15/12/2026" };
    expect(lerCondicao(r)).toEqual({ tipo: "PARCELADO", total: 400000, parcelas: 4, primeiro: "2026-12-15" });
    const e = { ...rascunhoCondicao("EXITO"), percentual: "30" , etapa: "Sentença" };
    expect(lerCondicao(e)).toMatchObject({ percentual: 3000, dias: 15, etapa: "Sentença" });
    expect(lerCondicao({ ...rascunhoCondicao("FIXO"), valor: "abc", vencimento: "31/02/2026" })).toMatchObject({ valor: null, vencimento: null });
  });
  it("volta para o rascunho sem perder nada", () => {
    const c = { tipo: "MENSAL" as const, valor: 250000, primeiro: "2026-12-10", meses: null, reajuste: "IPCA, todo setembro" };
    expect(lerCondicao(rascunhoDe(c))).toEqual(c);
    const s = { tipo: "SUCUMBENCIA" as const, quem: "DIVIDIDA" as const, percentualEscritorio: 5050, etapa: "Pagamento da sucumbência" };
    expect(lerCondicao(rascunhoDe(s))).toEqual(s);
  });
  it("ordena como o servidor e sabe quando o bloco já tem dado", () => {
    expect(ordenar([rascunhoCondicao("RECORRENTE"), rascunhoCondicao("FIXO")]).map((r) => r.tipo)).toEqual(["FIXO", "RECORRENTE"]);
    expect(temDado(rascunhoCondicao("EXITO"))).toBe(false);
    expect(temDado({ ...rascunhoCondicao("EXITO"), percentual: "20" })).toBe(true);
  });
  it("leva cada erro do servidor ao campo certo", () => {
    expect(errosPorCondicao(["servico", "c1.valor", "c2.etapa", "c2.dias"])).toEqual({ 1: ["valor"], 2: ["etapa", "dias"] });
    expect(idDoErro("pn", "c2.etapa")).toBe("pn-c2-etapa");
    expect(idDoErro("pn", "c3.atos.1.valor")).toBe("pn-c3-ato1-valor");
    expect(idDoErro("pn", "condicoes")).toBe("pn-tipos");
  });
  it("valor curto da proposta", () => {
    expect(valorDaProposta([{ tipo: "PARCELADO", total: 400000, parcelas: 4, primeiro: "2026-12-15" }])).toBe("R$ 4.000,00");
    expect(valorDaProposta([{ tipo: "FIXO", valor: 150000, vencimento: "2026-12-10" }, { tipo: "EXITO", percentual: 2000, sobre: "x", etapa: "Sentença", dias: 5 }]))
      .toBe("R$ 1.500,00 mais êxito");
  });
});

describe("AP-03: histórico da proposta", () => {
  const ev = (acao: string, dados: Record<string, unknown>) => ({ em: "2026-11-18T12:12:00Z", acao, autor: "Marina Ribeiro", dados });
  it("conta cada passo e esconde a mudança de estado repetida", () => {
    expect(fraseDaProposta(ev("estado.mudou", { para: "ENVIADA" }))?.oque).toBe("marcou como enviada");
    expect(fraseDaProposta(ev("estado.mudou", { para: "RASCUNHO" }))).toBeNull();
    expect(fraseDaProposta(ev("estado.mudou", { para: "NEGOCIACAO" }))).toBeNull();
    const r = fraseDaProposta(ev("proposta.resposta", { resposta: "RECUSOU", motivo: "VALOR_ALTO", canal: "WHATSAPP", em: "2026-11-18", observacao: null }));
    expect(r).toMatchObject({ oque: "registrou a resposta: recusou", detalhe: "Motivo: Achou o valor alto. Por WhatsApp, em 18/11/2026." });
    expect(fraseDaProposta(ev("proposta.editada", { campos: ["servico"], condicoes_depois: [] }))?.detalhe).toBe("Mudou o serviço e as condições de honorário. A versão anterior fica guardada.");
  });
});
