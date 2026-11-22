import { describe, expect, it } from "vitest";
import type { PassoCliente } from "@t3jus/domain";
import { destinoPasso, PASSOS_FEITOS, textoPasso } from "./fichaLigada.ts";

const passo = (x: Partial<PassoCliente>): PassoCliente => ({ tipo: "SEM_PROPOSTA", area: "COMERCIAL", pode: true, quemPode: null, item: null, ...x });

describe("Ficha do cliente ligada: o próximo passo (F3.110)", () => {
  it("sem proposta: fazer a proposta, e o botão leva à proposta nova do cliente", () => {
    const t = textoPasso(passo({}), "Antônia Ferreira Prado");
    expect([t.titulo, t.curto, t.semAcao]).toEqual(["Fazer a proposta", "Sem proposta", null]);
    expect(destinoPasso(passo({}), "c1")).toBe("/comercial/propostas/nova?cliente=c1");
  });
  it("proposta enviada: o número, o envio e o retorno; o botão abre a resposta", () => {
    const p = passo({ tipo: "PROPOSTA_ANDAMENTO", item: { id: "p1", numero: "P-2026-014", enviadaEm: "2026-11-10T13:00:00Z", retorno: { em: "2026-11-20", vencido: false, responsavel: { id: "d", nome: "Diego Almeida" } } } });
    expect(textoPasso(p, "Antônia").oque).toBe("P-2026-014 enviada em 10/11 · retorno 20/11, com Diego.");
    expect(destinoPasso(p, "c1")).toBe("/comercial/propostas/p1?responder=1");
  });
  it("quem não tem a área vê quem pode, pelo primeiro nome", () => {
    const p = passo({ tipo: "CONTRATO_ELABORACAO", area: "CONTRATOS", pode: false, quemPode: ["Marina Ribeiro", "Felipe Matos"] });
    expect(textoPasso(p, "Antônia").semAcao).toBe("Quem registra a assinatura tem a área Contratos: Marina e Felipe.");
  });
  it("caso sem Jurídico: diz com quem está, sem link", () => {
    const p = passo({ tipo: "CASO", area: "JURIDICO", pode: false, quemPode: ["Larissa Costa"], casoResponsavel: { id: "l", nome: "Larissa Costa" } });
    const t = textoPasso(p, "Antônia");
    expect([t.oque, t.semAcao, destinoPasso(p, "c1")]).toEqual(["Caso aberto em Jurídico, com Larissa Costa.", null, null]);
  });
  it("a trilha: assinatura é o terceiro passo, o caso fecha os quatro", () => {
    expect([PASSOS_FEITOS.CONTRATO_ELABORACAO, PASSOS_FEITOS.CASO]).toEqual([2, 4]);
  });
});
