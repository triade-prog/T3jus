// Fechamento do caso no financeiro (F3.132; EX-16, EX-17, FI-08): os textos da janela comum e
// do quadro, pelo desenho aprovado em docs/design/aprovadas/portal-fechamento-sem-levantamento.
import { describe, expect, it } from "vitest";
import type { PendenciaCaso } from "@t3jus/domain";
import { contar } from "./agenda.ts";
import {
  botaoEncerrar, comLevantamento, primeiroAtalho, rotuloEncerrarJunto, textoAjudaPendencia, textoEncerrado, textoJaEncerrado,
  textoQuemEncerraContratos, tituloPendencias,
} from "./fechamento.ts";

const pend = (x: Partial<PendenciaCaso>): PendenciaCaso => ({ tipo: "PARCELA", nome: "Noemi Bastos Carvalho · Parcela 6/6", valor: 100000, ...x });

describe("A janela de encerrar (F3.132, EX-17)", () => {
  it("decisão 9: o rótulo diz este contrato com um e os contratos ligados com mais", () => {
    expect(rotuloEncerrarJunto(1)).toBe("Encerrar também este contrato");
    expect(rotuloEncerrarJunto(2)).toBe("Encerrar também os contratos ligados");
  });
  it("decisão 9: o botão diz o que se encerra", () => {
    expect(botaoEncerrar(1, true)).toBe("Encerrar o caso e o contrato");
    expect(botaoEncerrar(2, true)).toBe("Encerrar o caso e os contratos");
    expect(botaoEncerrar(1, false)).toBe("Encerrar o caso");
    expect(botaoEncerrar(0, true)).toBe("Encerrar o caso");
  });
  it("FI-08: tudo recebido e repassado só com levantamento", () => {
    expect(textoEncerrado({ comLevantamento: true, entrou: 0 })).toBe("tudo recebido e repassado");
    expect(textoEncerrado({ comLevantamento: false, entrou: 0 })).toBe("tudo recebido");
    // A API de antes não manda o campo: vale o que entrou.
    expect(comLevantamento({ entrou: 3864000 })).toBe(true);
    expect(textoEncerrado({ entrou: 0 })).toBe("tudo recebido");
  });
  it("nota 1: o texto de ajuda da parcela não depende de quem vê", () => {
    expect(textoAjudaPendencia("Noemi Bastos Carvalho")).toBe(
      "Se Noemi não vai pagar, ainda não dá para dar baixa na parcela sem receber: anote a cobrança, e o caso segue “acerto pendente” até a parcela ser paga.");
  });
  it("decisão 10: sem Contratos, diz quem encerra e onde, sem a promessa de aviso", () => {
    const ligados = [{ numero: "C-2026-012", cliente: { nome: "Noemi Bastos Carvalho" } }];
    expect(textoQuemEncerraContratos(ligados, ["Marina Ribeiro", "Felipe Matos"])).toBe(
      "O C-2026-012 fica aberto. Quem encerra é a área Contratos (Marina e Felipe), no passo “Encerrar o contrato” da ficha de Noemi.");
    expect(textoQuemEncerraContratos(ligados, undefined)).toBe(
      "O C-2026-012 fica aberto. Quem encerra é a área Contratos, no passo “Encerrar o contrato” da ficha de Noemi.");
    expect(textoQuemEncerraContratos([...ligados, { numero: "C-2026-013", cliente: { nome: "Cláudio Carvalho" } }], ["Felipe Matos"])).toBe(
      "Os C-2026-012 e C-2026-013 ficam abertos. Quem encerra é a área Contratos (Felipe), no passo “Encerrar o contrato” das fichas de Noemi e Cláudio.");
  });
  it("decisão 9: o contrato já encerrado fica como está, com quem encerrou", () => {
    expect(textoJaEncerrado({ encerradoEm: "2026-11-12", encerradoPor: { nome: "Felipe Matos" } }, (x) => x.slice(8, 10) + "/" + x.slice(5, 7)))
      .toBe("Já encerrado em 12/11, por Felipe, em Contratos · fica como está");
  });
  it("o título do aviso: repasses, ou o que falta receber", () => {
    expect(tituloPendencias([pend({ tipo: "REPASSE" }), pend({ tipo: "REPASSE" })], contar)).toBe("Ainda há 2 repasses pendentes neste caso.");
    expect(tituloPendencias([pend({}), pend({ tipo: "REEMBOLSO" })], contar)).toBe("Ainda falta receber neste caso.");
    expect(tituloPendencias([pend({ tipo: "REPASSE" }), pend({})], contar)).toBe("Ainda há 2 pendências neste caso.");
  });
  it("decisão 8: o atalho é o da primeira pendência que tem um", () => {
    const a = primeiroAtalho([pend({ tipo: "REEMBOLSO" }), pend({ parcelaId: "p6" })],
      (p) => (p.parcelaId ? { tipo: "registrar", parcelaId: p.parcelaId, rotulo: "Registrar" } : null));
    expect(a).toEqual({ tipo: "registrar", parcelaId: "p6", rotulo: "Registrar" });
    expect(primeiroAtalho([pend({})], () => null)).toBeNull();
  });
});
