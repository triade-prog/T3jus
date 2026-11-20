import { describe, expect, it } from "vitest";
import {
  adicionarPasso, apagarPasso, diaUtil, feriadosNacionais, moverPasso, passoNovo, proximoHorario, quandoSai, simularFluxo,
  type DadosSimulacao, type Fluxo,
} from "./automacoes.ts";

const COBRANCA: Fluxo = {
  passos: [
    { id: "gatilho", tipo: "GATILHO", dias: 3 },
    { id: "cond", tipo: "CONDICOES", semCombinado: true },
    { id: "msg", tipo: "MENSAGEM", nome: "Cobrança gentil", modeloId: "m1" },
    { id: "espera", tipo: "ESPERA", dias: 5 },
    {
      id: "ramo", tipo: "RAMOS", ramos: [
        { quando: "PAGOU", passos: [{ id: "fim-p", tipo: "FIM" }] },
        { quando: "RESPONDEU", passos: [{ id: "ia", tipo: "IA" }, { id: "fim-r", tipo: "FIM" }] },
        { quando: "NADA", passos: [{ id: "pessoa", tipo: "PESSOA", pessoaId: "g", motivo: "5 dias sem pagamento nem resposta" }] },
      ],
    },
  ],
};

const dados = (f: Fluxo = COBRANCA): DadosSimulacao => ({
  gatilho: "PARCELA_ATRASO", nome: "Cobrança", fluxo: f, escritorio: "Ribeiro & Matos", hoje: "2026-11-18T13:12:00Z",
  exemplo: { cliente: "Farmácia Bom Jesus", contato: "Sueli Ramos", papel: "gerente", parcela: "Mensalidade de novembro", valor: 180000, vencimento: "2026-11-15", quemCuida: null },
  textos: { m1: "Olá, {nome}. A parcela {parcela}, de {valor}, venceu em {vencimento}. Para pagar: {link de pagamento}. Qualquer dúvida, é só responder." },
  aviso: null, pessoas: { g: "Gustavo Lima" }, socioDono: { id: "s", nome: "Marina Ribeiro" }, quemTemArea: null,
});

describe("limites de envio", () => {
  it("feriados nacionais, com a Sexta-feira Santa", () => {
    expect(feriadosNacionais(2027)).toContain("2027-03-26");
    expect(diaUtil("2026-11-20")).toBe(false);
    expect(diaUtil("2026-11-23")).toBe(true);
  });

  it("fora das 8h às 20h ou em dia sem envio, espera o próximo horário", () => {
    // Quinta, 19/11, 21h → sexta 20/11 é feriado → segunda, 23/11, 8h.
    expect(proximoHorario(new Date("2026-11-19T21:00:00Z")).toISOString()).toBe("2026-11-23T08:00:00.000Z");
    expect(proximoHorario(new Date("2026-11-18T06:30:00Z")).toISOString()).toBe("2026-11-18T08:00:00.000Z");
  });
});

describe("simular sem enviar", () => {
  it("nem pagou, nem respondeu: passa para Gustavo na segunda", () => {
    const s = simularFluxo(dados(), "NADA");
    expect(s.caminho.map((c) => c.rotulo)).toEqual(["1 Gatilho", "2 Condições", "3 Mensagem", "4 Espera", "5 Ramos", "Nem pagou, nem respondeu", "6 Passar para Gustavo"]);
    expect(s.conversa.find((l) => l.tipo === "AVISO")?.texto).toContain("Olá, Sueli. A parcela Mensalidade de novembro, de R$ 1.800,00, venceu em 15/11");
    expect(s.conversa.at(-1)?.em).toBe("2026-11-23T10:20:00-03:00");
  });

  it("pagou: o caminho vai para o fim", () => {
    const s = simularFluxo(dados(), "PAGOU");
    expect(s.caminho.at(-2)?.rotulo).toBe("Se pagou");
    expect(s.caminho.at(-1)?.rotulo).toBe("Fim");
  });

  it("sem ramo, pagar encerra a cobrança", () => {
    const f: Fluxo = { passos: [COBRANCA.passos[0]!, COBRANCA.passos[2]!, { id: "fim", tipo: "FIM" }] };
    expect(simularFluxo(dados(f), "PAGOU").caminho.at(-1)?.rotulo).toBe("Pagou");
  });

  it("sem parcela real, usa um exemplo", () => {
    expect(simularFluxo({ ...dados(), exemplo: null }, "NADA").exemplo).toBe(true);
  });
});

describe("mexer no desenho", () => {
  it("adiciona antes do fim e quem termina troca o fim", () => {
    const f: Fluxo = { passos: [{ id: "gatilho", tipo: "GATILHO", dias: 3 }, { id: "fim", tipo: "FIM" }] };
    const comMsg = adicionarPasso(f, {}, passoNovo(f, "MENSAGEM", "PARCELA_ATRASO"));
    expect(comMsg.passos.map((p) => p.tipo)).toEqual(["GATILHO", "MENSAGEM", "FIM"]);
    const comPessoa = adicionarPasso(comMsg, {}, passoNovo(comMsg, "PESSOA", "PARCELA_ATRASO"));
    expect(comPessoa.passos.map((p) => p.tipo)).toEqual(["GATILHO", "MENSAGEM", "PESSOA"]);
  });

  it("adiciona dentro de um ramo", () => {
    const f = adicionarPasso(COBRANCA, { ramos: "ramo", quando: "RESPONDEU" }, { id: "espera-9", tipo: "ESPERA", dias: 1 });
    const r = f.passos[4];
    expect(r?.tipo === "RAMOS" && r.ramos[1]!.passos.map((p) => p.id)).toEqual(["ia", "espera-9", "fim-r"]);
  });

  it("não move o gatilho nem passa de quem termina", () => {
    expect(moverPasso(COBRANCA, "cond", -1)).toEqual(COBRANCA);
    expect(moverPasso(COBRANCA, "espera", 1)).toEqual(COBRANCA);
    expect(moverPasso(COBRANCA, "msg", 1).passos.map((p) => p.id).slice(2, 4)).toEqual(["espera", "msg"]);
  });

  it("apaga em qualquer ramo, menos o gatilho", () => {
    expect(apagarPasso(COBRANCA, "gatilho")).toEqual(COBRANCA);
    const f = apagarPasso(COBRANCA, "ia");
    const r = f.passos[4];
    expect(r?.tipo === "RAMOS" && r.ramos[1]!.passos.map((p) => p.id)).toEqual(["fim-r"]);
  });

  it("quando sai, em linguagem simples", () => {
    expect(quandoSai("PARCELA_ATRASO", COBRANCA, [{ id: "g", nome: "Gustavo Lima" }]))
      .toBe("Quando a parcela chega a 3 dias de atraso. Se não pagar em 5 dias, passa para Gustavo.");
    const pronta: Fluxo = { passos: [{ id: "g", tipo: "GATILHO", dias: 1 }, { id: "m1", tipo: "MENSAGEM", nome: "1", aviso: "PARCELA_ATRASO" },
      { id: "e1", tipo: "ESPERA", dias: 7 }, { id: "m2", tipo: "MENSAGEM", nome: "2", aviso: "PARCELA_ATRASO" }, { id: "e2", tipo: "ESPERA", dias: 7 },
      { id: "m3", tipo: "MENSAGEM", nome: "3", aviso: "PARCELA_ATRASO" }, { id: "fim", tipo: "FIM" }] };
    expect(quandoSai("PARCELA_ATRASO", pronta, [])).toBe("1, 8 e 15 dias depois do vencimento. Para quando é paga.");
  });
});
