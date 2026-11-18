import { describe, expect, it } from "vitest";
import { agruparEventosPorDia, fraseEquipe, listaAreas, situacaoNaEquipe, type EventoEquipe } from "./equipe.ts";
import { nomeArquivoExportacao } from "./Escritorio.tsx";
import { rotaArea } from "./areas.ts";
import { papelNoEscritorio } from "./Moldura.tsx";

const agora = new Date("2026-11-18T17:00:00Z"); // 14h00 em Brasília

describe("Portal v1: moldura (PA-01)", () => {
  it("o papel embaixo do nome segue o dono e as áreas", () => {
    expect(papelNoEscritorio({ dono: true, areas: [] })).toBe("Sócio dono · vê tudo");
    expect(papelNoEscritorio({ dono: false, areas: [] })).toBe("Só as partes comuns");
    expect(papelNoEscritorio({ dono: false, areas: ["JURIDICO"] })).toBe("Área: Jurídico");
    expect(papelNoEscritorio({ dono: false, areas: ["COMERCIAL", "CONTRATOS", "JURIDICO"] })).toBe("Áreas: Comercial, Contratos e Jurídico");
  });

  it("a rota da área é o nome em minúsculas, com a seção depois", () => {
    expect(rotaArea("JURIDICO")).toBe("/juridico");
    expect(rotaArea("FINANCEIRO", "a-receber")).toBe("/financeiro/a-receber");
  });
});

describe("Portal v1: equipe (PA-02)", () => {
  it("convite: pendente até 1 hora depois, vencido depois disso; ativa quando criou a senha", () => {
    expect(situacaoNaEquipe({ senhaCriadaEm: "2026-11-01T10:00:00Z", conviteEnviadoEm: "2026-11-01T09:00:00Z" }, agora)).toEqual({ tipo: "ativa" });
    expect(situacaoNaEquipe({ senhaCriadaEm: null, conviteEnviadoEm: "2026-11-18T16:30:00Z" }, agora)).toEqual({ tipo: "pendente", vence: "vale até 14h30" });
    expect(situacaoNaEquipe({ senhaCriadaEm: null, conviteEnviadoEm: "2026-11-18T12:00:00Z" }, agora)).toEqual({ tipo: "vencido", venceu: "venceu às 10h00" });
    expect(situacaoNaEquipe({ senhaCriadaEm: null, conviteEnviadoEm: "2026-11-17T19:40:00Z" }, agora)).toEqual({ tipo: "vencido", venceu: "venceu ontem, às 17h40" });
  });

  it("nomes das áreas em lista", () => {
    expect(listaAreas([])).toBe("");
    expect(listaAreas(["FINANCEIRO"])).toBe("Financeiro");
    expect(listaAreas(["CONTRATOS", "FINANCEIRO"])).toBe("Contratos e Financeiro");
  });

  const ev = (acao: string, extra: Partial<EventoEquipe> = {}): EventoEquipe => ({
    id: 1, ocorridoEm: "2026-11-18T14:05:00Z", autor: { id: "a", nome: "Marina Ribeiro" }, acao, entidadeId: "v", dados: null, pessoa: "Caio Mendes", passouPara: null, ...extra,
  });

  it("histórico: retirada diz para quem passou o que era da pessoa (EX-10)", () => {
    const f = fraseEquipe(ev("equipe.retirada", { passouPara: "Felipe Matos" }));
    expect(f.fez.map((x) => x.t).join("")).toBe("retirou Caio Mendes da equipe; o que era de Caio passou para Felipe Matos");
    expect(f.detalhe).toContain("a autoria do que Caio registrou não mudou");
  });

  it("histórico: mudança de áreas mostra o que entrou, saiu e ficou", () => {
    const f = fraseEquipe(ev("equipe.areas_mudadas", { dados: { antes: ["CONTRATOS", "COMERCIAL"], depois: ["COMERCIAL", "FINANCEIRO"] } }));
    expect(f.detalhe).toBe("Entrou: Financeiro · Saiu: Contratos · Ficou: Comercial");
    expect(fraseEquipe(ev("equipe.convidada", { dados: { areas: [] } })).detalhe).toBe("Só as partes comuns");
    expect(fraseEquipe(ev("escritorio.exportado")).exportacao).toBe(true);
  });

  it("histórico agrupado por dia, com o de hoje marcado", () => {
    const g = agruparEventosPorDia([{ ocorridoEm: "2026-11-18T13:00:00Z" }, { ocorridoEm: "2026-11-18T12:00:00Z" }, { ocorridoEm: "2026-11-17T12:00:00Z" }], agora);
    expect(g.map((x) => [x.dia, x.eventos.length])).toEqual([["18/11/2026 · hoje", 2], ["17/11/2026", 1]]);
  });
});

describe("Portal v1: exportação (PT-15)", () => {
  it("o nome do arquivo vem do escritório, sem acento, e da data", () => {
    expect(nomeArquivoExportacao("Ribeiro & Matos Advocacia", "2026-11-18T17:22:00Z")).toBe("ribeiro-matos-advocacia-2026-11-18.json");
    expect(nomeArquivoExportacao("Ação São João", "2026-11-18")).toBe("acao-sao-joao-2026-11-18.json");
  });
});
