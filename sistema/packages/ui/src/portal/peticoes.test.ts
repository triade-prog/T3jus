import { describe, expect, it } from "vitest";
import type { AdvogadoDaPeticao, ModeloPeticao } from "@t3jus/domain";
import {
  botaoDecisao, botaoFinal, detalheSituacao, escolhaPadrao, fraseNoDocumento, gruposDeModelos, linhaVersaoModelo, modelosParaCaso, quando, quemAssina,
  tamanhoArquivo, textoMarcados, trechoCurto,
} from "./peticoes.ts";

const insc = (id: string, uf: string, numero: string, tipo: "PRINCIPAL" | "SUPLEMENTAR", letra: string | null = null) =>
  ({ id, uf, numero, letra, tipo, versao: 1, texto: "", documento: `OAB/${uf} nº ${numero}` }) as AdvogadoDaPeticao["inscricoes"][number];
const marina: AdvogadoDaPeticao = { pessoaId: "m", nome: "Marina Ribeiro", responsavel: false, socioDono: true, inscricoes: [insc("m1", "SP", "214538", "PRINCIPAL")] };
const felipe: AdvogadoDaPeticao = {
  pessoaId: "f", nome: "Felipe Matos", responsavel: true, socioDono: false,
  inscricoes: [insc("f1", "SP", "287104", "PRINCIPAL"), insc("f2", "RJ", "245880", "SUPLEMENTAR", "S")],
};

const modelo = (id: string, area: ModeloPeticao["area"], padrao: boolean, usos = 0): ModeloPeticao => ({
  id, padrao, nome: id, tipo: "OUTRA", area, substitui: null, versao: 2, versaoId: null, campos: [], desconhecidos: [],
  enviadoPor: padrao ? null : { id: "m", nome: "Marina Ribeiro" }, atualizadoEm: "2026-10-02T12:00:00Z", usos, linhaVersao: 0,
});

describe("Petições (EX-09): textos da tela", () => {
  it("quando: hoje, ontem, dia do ano e ano anterior, no fuso de Brasília", () => {
    const agora = new Date("2026-11-18T20:00:00-03:00");
    expect(quando("2026-11-18T15:42:00-03:00", agora)).toBe("hoje, 15h42");
    expect(quando("2026-11-17T18:20:00-03:00", agora)).toBe("ontem, 18h20");
    expect(quando("2026-11-16T10:12:00-03:00", agora)).toBe("16/11, 10h12");
    expect(quando("2025-03-12T14:02:00-03:00", agora)).toBe("12/03/2025, 14h02");
  });

  it("a situação na lista diz com quem está e quem decidiu (decisão 19)", () => {
    const base = { versao: 1, marcados: 0, geradoPor: { nome: "Beatriz Nogueira" }, revisor: { nome: "Felipe Matos" }, paraMim: false };
    expect(detalheSituacao({ ...base, situacao: "REVISAO" })).toBe("v1 · com Felipe Matos");
    expect(detalheSituacao({ ...base, situacao: "REVISAO", paraMim: true })).toBe("v1 · com você");
    expect(detalheSituacao({ ...base, situacao: "AJUSTE" })).toBe("v1 · pedido por Felipe Matos");
    expect(detalheSituacao({ ...base, situacao: "RASCUNHO", revisor: null })).toBe("Ainda não foi para a revisão");
    expect(detalheSituacao({ ...base, situacao: "APROVADA", revisor: null, marcados: 2, geradoPor: { nome: "Larissa Costa" } }))
      .toBe("Sem revisão: gerada por Larissa · 2 dados marcados");
    expect(textoMarcados(0)).toBe("Completa");
    expect(textoMarcados(1)).toBe("1 marcado");
  });

  it("modelos por área: a área do caso primeiro, depois qualquer área; o resto fica em Outras áreas", () => {
    const l = [modelo("ro", "TRABALHISTA", false, 4), modelo("ct", "TRABALHISTA", true, 2), modelo("ic", "CIVEL", false), modelo("ju", "QUALQUER", true, 6), modelo("sa", "SAUDE", true)];
    const g = modelosParaCaso(l, "TRABALHISTA");
    expect(g.daArea.grupo).toBe("Trabalhista");
    expect(g.daArea.modelos.map((m) => m.id)).toEqual(["ro", "ct"]);
    expect(g.qualquer.map((m) => m.id)).toEqual(["ju"]);
    expect(g.outras.map((m) => m.id).sort()).toEqual(["ic", "sa"]);
    expect(gruposDeModelos(l).map((x) => x.grupo)).toEqual(["Trabalhista", "Cível, consumidor e saúde", "Para qualquer área"]);
    expect(gruposDeModelos(l)[0]!.modelos.map((m) => m.id)).toEqual(["ro", "ct"]);
  });

  it("a linha de versão do modelo", () => {
    expect(linhaVersaoModelo(modelo("x", "QUALQUER", false))).toBe("v2 · enviado por Marina Ribeiro em 02/10/2026");
    expect(linhaVersaoModelo(modelo("x", "QUALQUER", true))).toBe("padrão do T3jus · atualizado em 02/10/2026");
  });

  it("quem assina: o responsável vem marcado com todas as inscrições, a principal primeiro", () => {
    const e = escolhaPadrao([marina, felipe]);
    expect(e).toEqual({ f: ["f1", "f2"] });
    expect(fraseNoDocumento([marina, felipe], e)).toBe("FELIPE MATOS, OAB/SP nº 287.104 e OAB/RJ nº 245.880-S.");
    expect(fraseNoDocumento([marina, felipe], { m: ["m1"], f: ["f1"] })).toBe("MARINA RIBEIRO, OAB/SP nº 214.538, e FELIPE MATOS, OAB/SP nº 287.104.");
    expect(fraseNoDocumento([marina, felipe], {})).toBe("ninguém assina ainda.");
    expect(quemAssina([marina, felipe], { m: ["m1"], f: ["f1"] })).toBe("Marina e Felipe assinam");
    // sem responsável com OAB, a sócia dona
    expect(escolhaPadrao([marina, { ...felipe, responsavel: false }])).toEqual({ m: ["m1"] });
  });

  it("os botões dizem o que acontece (decisões 10, 18 e 21)", () => {
    expect(botaoFinal(null, 0)).toBe("Gerar o .docx");
    expect(botaoFinal(null, 2)).toBe("Gerar com 2 dados marcados");
    expect(botaoFinal({ nome: "Felipe Matos" }, 1)).toBe("Enviar para revisão de Felipe Matos");
    expect(botaoDecisao("APROVAR", 2, "Beatriz Nogueira")).toBe("Aprovar a versão 2");
    expect(botaoDecisao("AJUSTE", 1, "Beatriz Nogueira")).toBe("Pedir ajuste a Beatriz");
    expect(botaoDecisao(null, 1, "Beatriz Nogueira")).toBe("Enviar decisão");
  });

  it("tamanho do arquivo e trecho curto", () => {
    expect(tamanhoArquivo(58 * 1024)).toBe("58 KB");
    expect(tamanhoArquivo(1.5 * 1024 * 1024)).toBe("1,5 MB");
    expect(trechoCurto("a  b\nc")).toBe("a b c");
    expect(trechoCurto("x".repeat(200), 10)).toBe(`${"x".repeat(9)}…`);
  });
});

describe("F3.175: a linha de versão no dia de Brasília", () => {
  it("um modelo enviado às 22h30 de Brasília é do próprio dia", () => {
    expect(linhaVersaoModelo({ ...modelo("x", "QUALQUER", false), atualizadoEm: "2026-11-25T01:30:00+00:00" })).toBe("v2 · enviado por Marina Ribeiro em 24/11/2026");
  });
});
