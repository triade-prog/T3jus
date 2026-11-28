// Comercial (AP-03, AP-06, CH-06): textos dos retornos, o rascunho das condições de honorário
// indo e voltando do formato do servidor, e o histórico da proposta.
import { describe, expect, it } from "vitest";
import {
  clienteSaiuNoErro, comoSaiu, contagemEncerradas, encerradaDa, estaEncerrada, faixaVencidos, linhaDoEstadoGravado, partesDaBarra, quandoRetorno, SELO_ENCERRADA,
  taxa, textoPeriodo, textoUltimo, valorDaProposta,
} from "./comercial.ts";
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

describe("F3.204: a proposta encerrada a pedido do titular (AP-03, AP-05, PT-11)", () => {
  it("o selo fica fora da situação gravada, neutro e com o ícone do histórico", () => {
    expect(SELO_ENCERRADA).toEqual({ tom: "neutro", icone: "historico", texto: "Encerrada a pedido" });
    expect(estaEncerrada({})).toBe(false);
    expect(estaEncerrada({ encerrada: true })).toBe(true);
  });
  it("a linha embaixo do selo diz o que aconteceu até ali", () => {
    const base = { criadaEm: "2026-11-13T13:40:00Z", enviadaEm: "2026-11-15T01:30:00Z", respondidaEm: "2026-11-12" };
    expect(linhaDoEstadoGravado({ ...base, situacao: "RASCUNHO" })).toBe("Rascunho desde 13/11");
    // 22h30 de Brasília do dia 14, em UTC: vale o dia de Brasília.
    expect(linhaDoEstadoGravado({ ...base, situacao: "ENVIADA" })).toBe("Enviada em 14/11");
    expect(linhaDoEstadoGravado({ ...base, situacao: "NEGOCIACAO" })).toBe("Em negociação");
    expect(linhaDoEstadoGravado({ ...base, situacao: "ACEITA" })).toBe("Aceita em 12/11");
    expect(contagemEncerradas(1)).toBe("1 proposta encerrada a pedido do titular");
    expect(contagemEncerradas(2)).toBe("2 propostas encerradas a pedido do titular");
  });
  it("a ficha vale antes da 1144 pela situação do cliente, e depois pela marca do banco", () => {
    expect(encerradaDa({ situacao: "ENVIADA", clienteSituacao: "ARQUIVADO" })).toBe(true);
    expect(encerradaDa({ situacao: "RASCUNHO", clienteSituacao: "EXCLUIDO" })).toBe(true);
    expect(encerradaDa({ situacao: "RECUSADA", clienteSituacao: "ARQUIVADO" })).toBe(false);
    expect(encerradaDa({ situacao: "ENVIADA", clienteSituacao: "INATIVO" })).toBe(false);
    expect(encerradaDa({ situacao: "ENVIADA", clienteSituacao: "ATIVO", encerrada: false })).toBe(false);
    expect(comoSaiu("EXCLUIDO")).toBe("excluído");
    expect(comoSaiu("ARQUIVADO")).toBe("arquivado");
  });
  it("reconhece a recusa de quem saiu a pedido do titular", () => {
    expect(clienteSaiuNoErro({ codigo: "VALIDATION_ERROR", detalhes: { motivo: "CLIENTE_EXCLUIDO" } })).toBe("EXCLUIDO");
    expect(clienteSaiuNoErro({ codigo: "VALIDATION_ERROR", detalhes: { motivo: "CLIENTE_ARQUIVADO" } })).toBe("ARQUIVADO");
    expect(clienteSaiuNoErro({ codigo: "VALIDATION_ERROR", detalhes: { campos: ["clienteId"] } })).toBeNull();
    expect(clienteSaiuNoErro({ codigo: "VERSION_CONFLICT", detalhes: { motivo: "CLIENTE_EXCLUIDO" } })).toBeNull();
  });
  it("a barra do Funil: o arquivado vai para \"encerrada a pedido do titular\" e não para \"recusou\"", () => {
    const d = { primeiros: 24, comProposta: 14, contratos: 9, semProposta: { naoPegou: 5, naoVoltou: 3, emAtendimento: 2 } };
    const nova = partesDaBarra({ ...d, depoisProposta: { andamento: 3, encerradas: 1, recusadas: [{ motivo: "OUTRO_ESCRITORIO", n: 1 }] } });
    expect([nova.andamento, nova.encerradas, nova.recusaram]).toEqual([3, 1, 1]);
    expect(nova.desc).toBe("Dos 24: 9 viraram contrato, 3 com proposta em andamento, 1 encerrada a pedido do titular, 1 recusou a proposta, "
      + "o escritório não pegou 5, 3 não voltaram e 2 ainda em atendimento.");
    expect(partesDaBarra({ ...d, depoisProposta: { andamento: 2, encerradas: 2, recusadas: [] } }).desc).toContain("2 encerradas a pedido do titular");
    // O banco de antes da 1144 não manda `encerradas`: a barra é a de hoje.
    const velha = partesDaBarra({ ...d, depoisProposta: { andamento: 4, recusadas: [] } });
    expect([velha.encerradas, velha.recusaram]).toEqual([0, 1]);
    expect(velha.desc).not.toContain("encerrada");
  });
});
