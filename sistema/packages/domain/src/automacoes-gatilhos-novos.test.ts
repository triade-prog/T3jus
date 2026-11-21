import { describe, expect, it } from "vitest";
import {
  AREA_DO_GATILHO, GATILHOS, nomeDoRamo, passoNovo, podeMontarGatilho, regrasDoGatilho, simularFluxo,
  type DadosSimulacao, type Fluxo,
} from "./automacoes.ts";

const DOC: Fluxo = {
  passos: [
    { id: "gatilho", tipo: "GATILHO", dias: 5 },
    { id: "msg", tipo: "MENSAGEM", nome: "Lembrete", modeloId: "m1" },
    { id: "espera", tipo: "ESPERA", dias: 3 },
    { id: "ramo", tipo: "RAMOS", ramos: [
      { quando: "CHEGOU", passos: [{ id: "fim-c", tipo: "FIM" }] },
      { quando: "RESPONDEU", passos: [{ id: "ia", tipo: "IA" }, { id: "fim-r", tipo: "FIM" }] },
      { quando: "NADA", passos: [{ id: "pessoa", tipo: "PESSOA", regra: "QUEM_PEDIU", motivo: "Sem documento" }] },
    ] },
  ],
};

const dados = (gatilho: DadosSimulacao["gatilho"], fluxo: Fluxo): DadosSimulacao => ({
  gatilho, nome: "Teste", fluxo, escritorio: "Ribeiro & Matos", hoje: "2026-11-18T13:12:00Z", exemplo: null,
  textos: { m1: "Olá, {nome}. Ainda falta {documentos}. {nome do escritório}" },
  aviso: null, pessoas: {}, socioDono: { id: "s", nome: "Marina Ribeiro" }, quemTemArea: null,
});

describe("F3.82: gatilhos cliente novo e documento pendente", () => {
  it("cliente novo é de Conversas (todos montam); documento pendente é do Jurídico", () => {
    expect(GATILHOS.CLIENTE_NOVO.area).toBe("CONVERSAS");
    expect(AREA_DO_GATILHO.CONVERSAS).toBe("Clientes");
    expect(GATILHOS.DOCUMENTO_PENDENTE.area).toBe("JURIDICO");
    expect(podeMontarGatilho("CLIENTE_NOVO", [])).toBe(true);
    expect(podeMontarGatilho("DOCUMENTO_PENDENTE", ["COMERCIAL"])).toBe(false);
    expect(podeMontarGatilho("DOCUMENTO_PENDENTE", ["JURIDICO"])).toBe(true);
  });

  it("documento pendente tem o caminho 'Se chegou' e quem pediu o documento", () => {
    expect(GATILHOS.DOCUMENTO_PENDENTE.ramos).toEqual(["CHEGOU", "RESPONDEU", "NADA"]);
    expect(nomeDoRamo("NADA", "DOCUMENTO_PENDENTE")).toBe("Nem chegou, nem respondeu");
    expect(regrasDoGatilho("DOCUMENTO_PENDENTE")[0]?.regra).toBe("QUEM_PEDIU");
    expect(regrasDoGatilho("CLIENTE_NOVO").map((r) => r.regra)).toEqual(["QUEM_CUIDA", "SOCIA_DONA"]);
    const p = passoNovo(DOC, "PESSOA", "DOCUMENTO_PENDENTE");
    expect(p.tipo === "PESSOA" && p.regra).toBe("QUEM_PEDIU");
  });

  it("a simulação segue 'Se chegou' até o fim e preenche os campos do documento", () => {
    const s = simularFluxo(dados("DOCUMENTO_PENDENTE", DOC), "CHEGOU");
    expect(s.caminho.map((c) => c.passo)).toContain("fim-c");
    const msg = s.conversa.find((l) => l.tipo === "AVISO");
    expect(msg && "texto" in msg ? msg.texto : "").not.toContain("{documentos}");
    const nada = simularFluxo(dados("DOCUMENTO_PENDENTE", DOC), "NADA");
    expect(nada.caminho.map((c) => c.passo)).toContain("pessoa");
  });
});
