// O êxito marcado como não cobrado na divisão do alvará (F3.191; CH-07, FI-05): os textos exatos do
// desenho aprovado em docs/design/aprovadas/portal-exito-nao-cobrado-alvara (D40, NOTAS.md).
import { describe, expect, it } from "vitest";
import type { AvisoSino, ExitoNaoCobrado, PassoFechamento, ResumoAcertoCaso } from "@t3jus/domain";
import { itensDoAcerto } from "./acertoCaso.ts";
import { conflitoDoExito } from "./baixa.ts";
import {
  acertoExitoCobrado, ajudasDaEscolha, COBRAR_SEM_LINHA, CONFIRMACAO_COBRADO, contratoExitoCobrado, errosDoNaoCobrado, fechamentoExitoCobrado, fechamentoExitoNaoCobrado,
  listaDeNomes, notaDeixarSem, origemExitoCobrado, passoExitoCobrado, resumoDoNaoCobrado, subtituloNaoCobrado, tetoDoExito, textoExitoCobradoHist,
  textoExitoNaoCobrado, textoExitoNaoCobradoHist,
} from "./exito_nao_cobrado.ts";
import { textoOrigem } from "./fechamento.ts";
import { detalheDoPassoFechamento } from "./fichaLigada.ts";
import { descreverAviso } from "./Sino.tsx";

const nb = (s: string) => s.replace(/\u00a0/g, " ");
const SEB = "Sebastião Prado";
const CASO = "Prado x Seguradora Lince";
const MARINA = { id: "m", nome: "Marina Ribeiro" };
const DIEGO = { id: "d", nome: "Diego Almeida" };
const LARISSA = { id: "l", nome: "Larissa Costa" };
const FELIPE = { id: "f", nome: "Felipe Matos" };
const CONFERIDO_EM = "2026-11-10T19:40:00Z"; // 10/11, 16h40 em Brasília
const COMB = "Sebastião aceitou pagar o êxito com este alvará, por telefone em 17/11.";
const REGRA = "20% · acordo · contrato C-2026-034 · combinado com Sebastião";

const NC: ExitoNaoCobrado = {
  exitoId: "x1", calculado: 300000, percentual: 2000, sobre: "acordo", motivo: "PERDOADO",
  conferido: { por: MARINA, em: CONFERIDO_EM }, contrato: { id: "c1", numero: "C-2026-034" },
  explicacao: "Sebastião indicou três clientes; combinamos não cobrar o êxito.",
  podeCobrar: true, jaCobrado: 0, limite: 300000, cobrancas: [], avisados: [MARINA, LARISSA], regra: REGRA,
  honorarios: { para: "HONORARIOS", nome: "Honorários de êxito", regra: REGRA, valor: 300000 },
};

describe("F3.191: o aviso e a escolha na janela (enc-proposta, enc-indevido)", () => {
  it("enc-proposta: o aviso com o detalhe, a explicação e a orientação", () => {
    const t = textoExitoNaoCobrado(NC, SEB, CASO, "ALVARA");
    expect(t.titulo).toBe("O êxito de Sebastião foi marcado como não cobrado.");
    expect(nb(t.detalhe)).toBe("Êxito · Prado x Seguradora Lince · 20% · R$ 3.000,00 calculados · perdoado, por Marina Ribeiro em 10/11/2026.");
    expect(t.explicacao).toBe("Sebastião indicou três clientes; combinamos não cobrar o êxito.");
    expect(t.texto).toBe("Por isso, a divisão veio sem os honorários do êxito. Escolha se fica assim ou se eles são cobrados neste alvará, com o acordo de Sebastião.");
    expect([t.parcial, t.semEscolha]).toEqual([null, null]);
  });
  it("as ajudas dos cartões, com os avisados e a frase das parcelas novas só com Perdoado", () => {
    const a = ajudasDaEscolha(NC, SEB, 1500000);
    expect(nb(a.sem)).toBe("Os R$ 15.000,00 ficam com Sebastião, como decidido na conferência.");
    expect(a.cobrar).toBe("Só cobre se Sebastião concordou. A prestação de contas vai mostrar os honorários, e Marina Ribeiro e Larissa Costa recebem um aviso. Se o combinado virou parcelas novas em Contratos, cobrar aqui cobra duas vezes.");
    expect(ajudasDaEscolha({ ...NC, motivo: "OUTRO" }, SEB, 1500000).cobrar).not.toContain("parcelas novas");
    expect(ajudasDaEscolha({ ...NC, avisados: [MARINA, FELIPE, LARISSA] }, SEB, 1500000).cobrar).toContain("e Marina Ribeiro, Felipe Matos e Larissa Costa recebem um aviso.");
    expect(ajudasDaEscolha({ ...NC, avisados: [LARISSA] }, SEB, 1500000).cobrar).toContain("e Larissa Costa recebe um aviso.");
    expect(listaDeNomes([])).toBe("");
  });
  it("variações: Outro, cliente excluído e já cobrado em parte", () => {
    expect(nb(textoExitoNaoCobrado({ ...NC, motivo: "OUTRO" }, SEB, CASO).detalhe)).toContain("· outro, por Marina Ribeiro em 10/11/2026.");
    expect(textoExitoNaoCobrado({ ...NC, explicacao: null }, SEB, CASO).explicacao).toBeNull();
    const parte = { ...NC, jaCobrado: 100000, limite: 200000, cobrancas: [{ levantamentoId: "l0", tipo: "ALVARA" as const, entrouEm: "2026-11-05", valor: 100000 }] };
    expect(nb(textoExitoNaoCobrado(parte, SEB, CASO).parcial!)).toBe("Já foram cobrados R$ 1.000,00 deste êxito no alvará de 05/11. Dá para cobrar até R$ 2.000,00.");
    expect(nb(tetoDoExito(parte))).toBe("Até R$ 2.000,00, o que falta do êxito calculado na conferência.");
    expect(nb(tetoDoExito(NC))).toBe("Até R$ 3.000,00, o êxito calculado na conferência.");
  });
  it("enc-indevido: sem a escolha, e o caminho é falar com quem conferiu", () => {
    const t = textoExitoNaoCobrado({ ...NC, motivo: "INDEVIDO", podeCobrar: false, honorarios: null }, SEB, CASO, "ALVARA");
    expect(t.titulo).toBe("O êxito de Sebastião foi marcado como não devido na conferência.");
    expect(nb(t.detalhe)).toContain("· indevido, por Marina Ribeiro em 10/11/2026.");
    expect(t.texto).toBe("Por isso, a divisão não tem os honorários do êxito, e eles não podem ser cobrados neste alvará.");
    expect(t.semEscolha).toBe("Se foi um engano, fale com Marina Ribeiro. Por enquanto, o T3jus não refaz a conferência: registre o alvará assim e não lance os honorários como “Outro”.");
  });
  it("lacuna conservadora: o calculado já todo cobrado não oferece o \"Cobrar\"", () => {
    const t = textoExitoNaoCobrado({ ...NC, podeCobrar: false, jaCobrado: 300000, limite: 0, honorarios: null,
      cobrancas: [{ levantamentoId: "l0", tipo: "ALVARA", entrouEm: "2026-11-05", valor: 300000 }] }, SEB, CASO, "ALVARA");
    expect(t.semEscolha).toBeNull();
    expect(t.texto).toContain("já foi todo cobrado");
    expect(nb(t.parcial!)).toBe("Já foram cobrados R$ 3.000,00 deste êxito no alvará de 05/11.");
  });
  it("enc-sem: a nota do \"Deixar sem\", e a confirmação do \"Cobrar\"", () => {
    expect(notaDeixarSem(SEB)).toBe("Os honorários ficam fora da divisão. O êxito de Sebastião continua não cobrado, e isso fica no histórico do repasse.");
    expect(CONFIRMACAO_COBRADO).toBe("Os honorários do êxito foram cobrados, e o combinado ficou na ficha do repasse.");
  });
});

describe("F3.191: os erros (enc-erro, enc-erro-cobrar) e o conflito (enc-conflito)", () => {
  it("enc-erro: sem escolher, só o erro do grupo", () => {
    const e = errosDoNaoCobrado(NC, null, "", false, 0, SEB);
    expect(e).toEqual({ grupo: "Escolha o que fazer com os honorários do êxito de Sebastião: deixar sem ou cobrar neste alvará." });
    expect(resumoDoNaoCobrado(e, SEB)).toEqual([{ campo: "grupo", texto: "Escolha o que fazer com os honorários do êxito de Sebastião." }]);
    expect(errosDoNaoCobrado(NC, "SEM", "", false, 0, SEB)).toEqual({});
    expect(errosDoNaoCobrado({ ...NC, podeCobrar: false }, null, "", false, 0, SEB)).toEqual({});
  });
  it("enc-erro-cobrar: o valor acima do calculado, o combinado vazio e a caixa sem marcar", () => {
    const e = errosDoNaoCobrado(NC, "COBRAR", "  ab ", false, 350000, SEB);
    expect(nb(e.valor!)).toBe("Os honorários passam do êxito calculado na conferência (R$ 3.000,00).");
    expect(e.combinado).toBe("Escreva o que foi combinado com Sebastião, com pelo menos 3 letras.");
    expect(e.concordou).toBe("Confirme que Sebastião concordou com a cobrança.");
    expect(resumoDoNaoCobrado(e, SEB).map((x) => x.texto)).toEqual([
      "Os honorários passam do êxito calculado na conferência.", "Escreva o que foi combinado com Sebastião.", "Confirme que Sebastião concordou com a cobrança.",
    ]);
    expect(errosDoNaoCobrado(NC, "COBRAR", COMB, true, 300000, SEB)).toEqual({});
  });
  it("revisão M3: \"Cobrar\" com a linha de honorários tirada é erro no grupo, e não \"Deixar sem\" calado", () => {
    const e = errosDoNaoCobrado(NC, "COBRAR", COMB, true, 0, SEB);
    expect(e).toEqual({ grupo: COBRAR_SEM_LINHA });
    expect(resumoDoNaoCobrado(e, SEB)).toEqual([{ campo: "grupo", texto: "Ponha a linha de honorários de volta ou escolha deixar sem." }]);
  });
  it("enc-conflito: Marina marcou o êxito como não cobrado às 10h13", () => {
    const d = { motivo: "EXITO_MUDOU", tipo: "NAO_COBRADO", por: MARINA, em: "2026-11-18T13:13:00Z" };
    expect(conflitoDoExito(d, "2026-11-18", SEB)).toEqual({
      titulo: "Marina Ribeiro marcou o êxito de Sebastião como não cobrado às 10h13.",
      texto: "Nada foi registrado. Veja a divisão refeita: ela fica sem os honorários do êxito.",
    });
    expect(conflitoDoExito({ motivo: "EXITO_MUDOU", tipo: "CONFERENCIA" }, "2026-11-18", SEB)?.titulo).toBe("O êxito de Sebastião mudou enquanto você dividia.");
  });
});

describe("F3.191: a ficha do repasse (enc-historico, enc-historico-sem, enc-resumo-fechado)", () => {
  const dados = { tipo: "ALVARA", motivo: "PERDOADO", conferidoPor: MARINA, conferidoEm: CONFERIDO_EM, contrato: "C-2026-034", honorarios: 300000, combinado: COMB };
  it("o subtítulo de \"Para onde vai cada parte\"", () => {
    expect(subtituloNaoCobrado(true, DIEGO, SEB)).toBe("Com os honorários do êxito, cobrados por Diego com o combinado com Sebastião.");
    expect(subtituloNaoCobrado(false, null, SEB)).toBe("Sem os honorários do êxito: o êxito foi marcado como não cobrado na conferência.");
  });
  it("a linha do histórico com \"Cobrar\", com o combinado e o \"segundo Diego\"", () => {
    const t = textoExitoCobradoHist(dados, SEB, DIEGO, "ALVARA");
    expect(`${t.antes} “${t.combinado}” ${t.depois}`).toBe(
      "Honorários do êxito cobrados neste alvará, com o combinado com Sebastião: “Sebastião aceitou pagar o êxito com este alvará, por telefone em 17/11.” Na conferência, o êxito tinha sido marcado como não cobrado (perdoado, por Marina Ribeiro em 10/11).");
    expect(t.quem).toBe("Diego Almeida, ao registrar o alvará · Sebastião concordou, segundo Diego");
    // O cliente excluído: o combinado não vem.
    const sem = textoExitoCobradoHist({ ...dados, combinado: null }, SEB, DIEGO, "ALVARA");
    expect([sem.antes, sem.combinado]).toEqual(["Honorários do êxito cobrados neste alvará, com o combinado com Sebastião.", null]);
  });
  it("a linha do histórico com \"Deixar sem\"", () => {
    expect(textoExitoNaoCobradoHist(dados, SEB)).toBe(
      "Registrado sem os honorários do êxito: o êxito de Sebastião foi marcado como não cobrado na conferência (perdoado, por Marina Ribeiro em 10/11).");
  });
  it("o Fechamento do caso, com \"Cobrar\" e com \"Deixar sem\"", () => {
    const c = fechamentoExitoCobrado(dados, SEB, DIEGO, "2026-11-18", "ALVARA");
    expect(c.titulo).toBe("Êxito de Sebastião cobrado no alvará de 18/11 (não cobrado na conferência)");
    expect(nb(c.detalhe)).toBe("R$ 3.000,00 · por Diego Almeida, com o combinado com Sebastião · na conferência: perdoado, por Marina Ribeiro em 10/11");
    expect(fechamentoExitoNaoCobrado(dados, "ALVARA")).toEqual({
      titulo: "Êxito do contrato C-2026-034: não cobrado", detalhe: "perdoado, por Marina Ribeiro em 10/11 · deixado fora do alvará ao registrar",
    });
  });
});

describe("F3.191: as telas do caso e o sino", () => {
  const cobrado = { em: "2026-11-18T13:14:00Z", por: DIEGO, levantamentoId: "l1", tipo: "ALVARA" as const, entrouEm: "2026-11-18" };
  const semFin = { ...cobrado, levantamentoId: null, entrouEm: null };
  it("enc-caso-historico: o \"De onde veio\", pelo textoOrigem", () => {
    const d = { levantamento: "l1", tipo: "ALVARA", entrouEm: "2026-11-18", valor: 300000, doContrato: true, motivo: "PERDOADO", cliente: SEB, combinado: COMB };
    const t = textoOrigem({ acao: "financeiro.exito_cobrado_no_alvara", em: "2026-11-18T13:14:00Z", por: DIEGO, dados: d }, CASO);
    expect(t.fez).toBe("cobrou no alvará de 18/11 os honorários do êxito de Sebastião, que estava como não cobrado");
    expect(nb(t.detalhe)).toBe("R$ 3.000,00 · “Sebastião aceitou pagar o êxito com este alvará, por telefone em 17/11.”");
    expect(origemExitoCobrado({ ...d, combinado: undefined }).detalhe.endsWith("3.000,00")).toBe(true);
  });
  it("a ficha do contrato só de êxito: o âmbar e o vazio das parcelas", () => {
    expect(contratoExitoCobrado(cobrado)).toEqual({
      ambar: "O êxito foi cobrado no alvará de 18/11. Os honorários vão ao caixa pela ficha do repasse.",
      vazio: "O contrato é só de êxito. O êxito foi marcado como não cobrado na conferência, e os honorários foram cobrados no alvará de 18/11, na ficha do repasse.",
    });
  });
  it("enc-acerto e enc-acerto-larissa: o acerto na ficha do caso, com e sem o valor", () => {
    expect(acertoExitoCobrado({ ...cobrado, valor: 300000 }, { por: MARINA, em: CONFERIDO_EM }).texto).toBe("Êxito não cobrado · cobrado no alvará");
    expect(nb(acertoExitoCobrado({ ...cobrado, valor: 300000 }, { por: MARINA, em: CONFERIDO_EM }).sub)).toBe("Não cobrado por Marina em 10/11 · R$ 3.000,00 cobrados por Diego em 18/11");
    expect(acertoExitoCobrado(cobrado, { por: MARINA, em: CONFERIDO_EM }).sub).toBe("Não cobrado por Marina em 10/11 · cobrado por Diego em 18/11");
    // Revisão, M2: sem o Financeiro, o levantamento e o dia não vêm; o tipo vem, como no D40.
    expect(acertoExitoCobrado(semFin, { por: MARINA, em: CONFERIDO_EM })).toEqual({
      texto: "Êxito não cobrado · cobrado no alvará", sub: "Não cobrado por Marina em 10/11 · cobrado por Diego em 18/11",
    });
    const a = {
      comValores: false, levantamentoId: "l1", entrou: { tipo: "ALVARA", em: "2026-11-18", valor: null }, repasses: [], outros: [], contratos: [], semExito: false,
      exitos: [{ cliente: SEB, feito: true, naoCobrado: true, em: CONFERIDO_EM, por: MARINA, valor: null, cobradoNoAlvara: semFin }],
    } as unknown as ResumoAcertoCaso;
    expect(itensDoAcerto(a, { encerradoEm: "2026-11-10", resultado: "ACORDO" }, "2026-11-18")[0]).toEqual({
      tom: "ok", texto: "Êxito não cobrado · cobrado no alvará", sub: "Não cobrado por Marina em 10/11 · cobrado por Diego em 18/11",
    });
  });
  it("enc-ficha-cliente: o passo \"Conferir o êxito\"", () => {
    expect(passoExitoCobrado(cobrado, { por: MARINA, em: CONFERIDO_EM })).toBe("Não cobrado, por Marina em 10/11 · cobrado no alvará de 18/11, por Diego");
    const p: PassoFechamento = { tipo: "EXITO", area: "FINANCEIRO", feito: true, em: CONFERIDO_EM, por: MARINA, naoCobrado: true, cobradoNoAlvara: cobrado };
    expect(detalheDoPassoFechamento(p, [p])).toBe("Não cobrado, por Marina em 10/11 · cobrado no alvará de 18/11, por Diego");
    expect(detalheDoPassoFechamento({ ...p, cobradoNoAlvara: null }, [p])).toBe("Não cobrado, por Marina em 10/11");
    // Revisão, M2: sem o Financeiro, cai para o dia em que foi cobrado.
    expect(passoExitoCobrado(semFin, { por: MARINA, em: CONFERIDO_EM })).toBe("Não cobrado, por Marina em 10/11 · cobrado no alvará em 18/11, por Diego");
  });
  it("enc-sino e enc-sino-larissa: o destino, o selo e, sem o Financeiro, o texto sem valores (PT-02)", () => {
    const base: AvisoSino = {
      id: "s1", tipo: "EXITO_COBRADO_NO_ALVARA", origem: "levantamentos", origemId: "l1", em: "2026-11-18T13:14:00Z", lido: false,
      dados: { quem: "Diego Almeida", cliente: SEB, caso: CASO, casoId: "k1", levantamentoId: "l1", motivo: "PERDOADO", tipo: "ALVARA" },
    };
    const marina = descreverAviso({ ...base, dados: { ...base.dados, valor: 300000, calculado: 300000, combinado: COMB } }, new Date("2026-11-18T16:00:00-03:00"));
    expect([marina.onde, marina.href, marina.selo, marina.icone]).toEqual(["Abrir o repasse", "/financeiro/repasses/l1", { tom: "atencao", texto: "Cobrado no alvará" }, "balanca"]);
    const larissa = descreverAviso(base, new Date("2026-11-18T16:00:00-03:00"));
    expect([larissa.onde, larissa.href, larissa.selo]).toEqual(["Abrir o caso", "/juridico/casos/k1", { tom: "atencao", texto: "Cobrado no alvará" }]);
    expect(larissa.detalhe).toBe("Na conferência, o motivo foi perdoado. Prado x Seguradora Lince. Os valores ficam com o Financeiro.");
  });
});
