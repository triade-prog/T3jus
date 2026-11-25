// Frases do histórico da ficha para os avisos do fim do contrato (F0.16, PT-11).
import { describe, expect, it } from "vitest";
import { dataDoEvento, fraseDoEvento, type EventoHistorico } from "./historico.ts";

const RENATA = "1c8d4f1f-6e2b-4d3c-8f9a-2b3c4d5e6f70";
const nomes = (id: string) => (id === RENATA ? "Renata Lima" : null);
const evento = (dados: Record<string, unknown>): EventoHistorico => ({
  id: 1, ocorridoEm: "2026-11-19T17:41:00Z", autor: null, acao: "contrato.aviso_enviado",
  entidade: "escritorio", entidadeId: "e", dados, interno: true,
});

describe("PT-11: aviso por e-mail do fim do contrato no histórico", () => {
  it("o do dia do fim diz quem recebeu e o prazo para baixar os dados", () => {
    expect(fraseDoEvento(evento({ tipo: "FIM", pessoa_id: RENATA, consulta_ate: "2026-12-18", acesso_fecha_em: "2026-12-19" }), nomes)).toEqual({
      quem: null, fez: "avisou Renata Lima, quem cuida do escritório, por e-mail do fim do contrato",
      detalhe: "Prazo para baixar os dados: até 18/12/2026",
    });
  });
  it("o de 3 dias antes diz quando o acesso fecha", () => {
    expect(fraseDoEvento(evento({ tipo: "FECHA_EM_3", pessoa_id: RENATA, consulta_ate: "2026-12-18", acesso_fecha_em: "2026-12-19" }), nomes)).toEqual({
      quem: null, fez: "lembrou Renata Lima, quem cuida do escritório, por e-mail que o acesso fecha em 3 dias",
      detalhe: "Acesso fecha em 19/12/2026",
    });
  });
  it("sem o nome, não inventa", () => {
    expect(fraseDoEvento(evento({ tipo: "FIM", consulta_ate: "2026-12-18" })).fez).toBe("avisou quem cuida do escritório por e-mail do fim do contrato");
  });
});

describe("F3.175: data do evento no dia de Brasília", () => {
  it("um instante às 22h30 de Brasília fica no próprio dia; a data pura não anda", () => {
    expect(dataDoEvento("2026-11-25T01:30:00+00:00")).toBe("24/11/2026");
    expect(dataDoEvento("2026-11-30")).toBe("30/11/2026");
    expect(dataDoEvento(null)).toBe("uma data");
  });
  it("na frase do evento", () => {
    expect(fraseDoEvento({ ...evento({ fim_em: "2026-11-25T01:30:00+00:00" }), acao: "contrato.encerramento_marcado" }).fez).toBe("marcou o fim do contrato para 24/11/2026");
  });
});
