// Fechamento do caso no financeiro (F3.132; EX-16, EX-17, FI-08): os textos da janela comum e
// do quadro, pelo desenho aprovado em docs/design/aprovadas/portal-fechamento-sem-levantamento.
import { describe, expect, it } from "vitest";
import type { AcertoCaso, PendenciaCaso } from "@t3jus/domain";
import { contar } from "./agenda.ts";
import {
  ambarEncerra, botaoEncerrar, casoDoHash, comLevantamento, gruposDoQuadro, idDaFolha, linhaEAtalhoDaPendencia, linhaPronto, numerosDoFechamento,
  parcelaCurta, primeiroAtalho, rotuloEncerrarJunto, subDoCaso, textoAjudaPendencia, textoEncerrado, textoJaEncerrado, textoOrigem,
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
  it("decisão 10 e F3.150 (pergunta 5): sem Contratos, diz quem encerra, onde e que recebem o aviso no sino", () => {
    const ligados = [{ numero: "C-2026-012", cliente: { nome: "Noemi Bastos Carvalho" } }];
    expect(textoQuemEncerraContratos(ligados, ["Bianca Torres", "Felipe Matos", "Marina Ribeiro"])).toBe(
      "O C-2026-012 fica aberto. Quem encerra é a área Contratos (Bianca, Felipe e Marina), no passo “Encerrar o contrato” da ficha de Noemi. Eles recebem um aviso no sino.");
    expect(textoQuemEncerraContratos(ligados, undefined)).toBe(
      "O C-2026-012 fica aberto. Quem encerra é a área Contratos, no passo “Encerrar o contrato” da ficha de Noemi.");
    expect(textoQuemEncerraContratos(ligados, [])).toBe(
      "O C-2026-012 fica aberto. Quem encerra é a área Contratos, no passo “Encerrar o contrato” da ficha de Noemi.");
    expect(textoQuemEncerraContratos([...ligados, { numero: "C-2026-013", cliente: { nome: "Cláudio Carvalho" } }], ["Felipe Matos"])).toBe(
      "Os C-2026-012 e C-2026-013 ficam abertos. Quem encerra é a área Contratos (Felipe), no passo “Encerrar o contrato” das fichas de Noemi e Cláudio. Felipe recebe um aviso no sino.");
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

// O acerto do caso A, como a 0900 devolve (pgTAP 130): Noemi com a 6/6 vencida e as custas junto
// com ela; Cláudio pago e com o contrato encerrado por Felipe.
const N = { id: "ct12", numero: "C-2026-012" };
const P6 = "p6";
const noemi = (x: Partial<AcertoCaso> = {}): AcertoCaso => ({
  casoId: "k9", entrou: 0, destinadoPago: 0, faltaPagar: 0, prestacoesPendentes: 0, falta: 141230, fechado: null, comLevantamento: false,
  parcelas: { total: 7, pagas: 6, ultima: "2026-10-10", falta: 100000 },
  caso: { id: "k9", nome: "Carvalho x Construtora Lume", resultado: "PERDA", encerradoEm: "2026-11-06T20:10:00Z", encerradoPor: { id: "f", nome: "Felipe Matos" } },
  exitos: [], aVencer: null, recebidoNoCaso: 650000, contratosNoRecebido: 2, reembolsos: { adiantado: 41230, reembolsado: 0 },
  contratos: [
    { ...N, cliente: { id: "cn", nome: "Noemi Bastos Carvalho" }, situacao: "ATIVO", encerradoEm: null, encerradoPor: null, comCaso: false, exitoPercentual: 2000,
      parcelas: { total: 6, pagas: 5 }, recebido: 500000, falta: 100000, ultimaRecebidaEm: "2026-10-10", seguePor: [] },
    { id: "ct13", numero: "C-2026-013", cliente: { id: "cc", nome: "Cláudio Carvalho" }, situacao: "ENCERRADO", encerradoEm: "2026-11-12T12:30:00Z",
      encerradoPor: { id: "f", nome: "Felipe Matos" }, comCaso: false, exitoPercentual: 2000, parcelas: { total: 1, pagas: 1 }, recebido: 150000, falta: 0,
      ultimaRecebidaEm: "2026-06-02", seguePor: [] },
  ],
  pendencias: [
    { tipo: "PARCELA", nome: "Noemi Bastos Carvalho · Parcela 6 de 6", valor: 100000, vencimento: "2026-11-10", contratoId: N.id, parcelaId: P6,
      descricao: "Parcela 6 de 6", cliente: "Noemi Bastos Carvalho", clienteId: "cn", exito: false },
    { tipo: "REEMBOLSO", nome: "Custas iniciais e diligência do oficial", valor: 41230, contaId: "cp", categoria: "CUSTAS", cliente: "Noemi Bastos Carvalho", clienteId: "cn",
      parcela: { id: P6, descricao: "Parcela 6 de 6", vencimento: "2026-11-10", contrato: N } },
  ],
  ...x,
});
const HOJE = "2026-11-18";
const ctx = (contratoId: string) => ({ contratoId, casoId: "k9", hoje: HOJE, parcelasDaFicha: new Set(contratoId === N.id ? ["p1", P6] : ["pc"]), areas: ["FINANCEIRO"] });
const linhas = (a: AcertoCaso, contratoId: string) =>
  gruposDoQuadro(a, { contratoId, casoId: "k9", hoje: HOJE }).map((g) => [g.titulo, ...g.itens.map((x) => `${x.tom}: ${[x.forte, x.texto].filter(Boolean).join(" ")}${x.sub ? ` / ${x.sub}` : ""}${x.ir ? ` → ${x.ir.href}` : ""}`)]);

describe("A folha \"Fechamento do caso\" na ficha do contrato (F3.132, FI-08, decisão 6)", () => {
  it("estado 5: os grupos do contrato de Noemi, na ordem do desenho", () => {
    expect(linhas(noemi(), N.id)).toEqual([
      ["Resultado e êxito", "ok: Sem êxito a cobrar: o caso terminou com perda em 06/11 / Noemi e Cláudio · 20% do êxito sobre base zero"],
      ["Deste contrato · C-2026-012, Noemi", "ok: 5 de 6 parcelas recebidas · R$\u00a05.000,00", "falta: Parcela 6/6: falta R$\u00a01.000,00 / venceu em 10/11 · 8 dias de atraso"],
      ["Dos outros contratos do caso", "ok: C-2026-013 · Cláudio: tudo recebido / R$\u00a01.500,00 em 02/06 · contrato já encerrado em 12/11 → /financeiro/a-receber/contratos/ct13#t-fecha-k9"],
      ["Adiantado pelo escritório no caso", "falta: Custas iniciais e diligência do oficial: falta o reembolso de R$\u00a0412,30 / vai junto com a parcela 6/6"],
      ["Terceiros", "ok: Nenhum valor de terceiros entrou neste caso / não há repasse nem prestação de contas"],
    ]);
  });
  it("estado 12 (EX-01): pelo contrato de Cláudio, o caso inteiro, com o link para Noemi", () => {
    const g = linhas(noemi(), "ct13");
    expect(g[0]![1]).toBe("ok: Sem êxito a cobrar: o caso terminou com perda em 06/11 / Cláudio e Noemi · 20% do êxito sobre base zero");
    expect(g[1]).toEqual(["Deste contrato · C-2026-013, Cláudio", "ok: Tudo recebido · R$\u00a01.500,00 / recebido em 02/06 · contrato encerrado em 12/11"]);
    expect(g[2]).toEqual(["Dos outros contratos do caso",
      "falta: Noemi · parcela 6/6 · R$\u00a01.000,00 / C-2026-012 · venceu em 10/11 · 8 dias de atraso → /financeiro/a-receber/contratos/ct12#t-fecha-k9"]);
    expect(g[3]![1]).toContain("vai junto com a parcela 6/6 do contrato C-2026-012");
  });
  it("pergunta 3: o contrato que segue em outro caso diz com qual", () => {
    const a = noemi({ contratos: [noemi().contratos![0]!, { ...noemi().contratos![1]!, seguePor: [{ id: "k2", nome: "Andrade x Loja Dois" }] }] });
    expect(linhas(a, N.id)[2]![1]).toBe("ok: Contrato C-2026-013 segue no caso Andrade x Loja Dois: as parcelas ficam com ele → /financeiro/a-receber/contratos/ct13#t-fecha-k9");
  });
  it("os três números, cada um também em texto", () => {
    expect(numerosDoFechamento(noemi())).toEqual({ recebido: 650000, contratos: 2, reembolsado: 0, reembolsoTxt: "de R$\u00a0412,30 adiantados", falta: 141230,
      faltaTxt: "parcela 6/6 e custas", tom: "falta" });
    const pago = noemi({ pendencias: [], falta: 0, recebidoNoCaso: 750000, reembolsos: { adiantado: 41230, reembolsado: 41230 } });
    expect(numerosDoFechamento(pago)).toMatchObject({ falta: 0, faltaTxt: "tudo recebido e reembolsado", tom: "nada", reembolsoTxt: "tudo reembolsado" });
  });
  it("estado 16 (pergunta 1): \"pronto para encerrar depois de\" e a espera sem tom de atraso", () => {
    const joana = noemi({ aVencer: { vencimento: "2026-12-15", descricao: "Êxito", cliente: "Joana Pereira", exito: true },
      pendencias: [{ tipo: "PARCELA", nome: "Joana · Êxito", valor: 840000, vencimento: "2026-12-15", contratoId: N.id, parcelaId: "px", descricao: "Êxito", cliente: "Joana Pereira", exito: true }] });
    expect(linhaPronto(joana)).toEqual({ forte: "Pronto para encerrar depois do êxito de Joana, em 15/12." });
    expect(numerosDoFechamento(joana)).toMatchObject({ tom: "espera", faltaTxt: "a vencer em 15/12 · nada em atraso" });
    expect(linhas(joana, N.id)[1]![2]).toBe("espera: Êxito de Joana · R$\u00a08.400,00 a vencer em 15/12 / nada em atraso");
    const l = linhaEAtalhoDaPendencia(joana, joana.pendencias[0]!, ctx(N.id));
    expect(l).toMatchObject({ forte: "Êxito de Joana · R$\u00a08.400,00 · vence 15/12", espera: true, atalho: null });
    expect(linhaPronto(noemi())).toBeNull();
  });
  it("estado 13: o contrato só de êxito no caso perdido não tem nada a receber", () => {
    const a = noemi({ pendencias: [], falta: 0, recebidoNoCaso: 0, reembolsos: { adiantado: 0, reembolsado: 0 } });
    expect(linhaPronto(a)).toEqual({ forte: "Nada a receber neste caso.", texto: "Ele já pode ser encerrado no financeiro." });
    expect(numerosDoFechamento(a)).toMatchObject({ faltaTxt: "nada a receber", reembolsoTxt: "nada adiantado" });
  });
  it("o subtítulo e os ids das folhas (a confirmar, b)", () => {
    expect(subDoCaso(noemi().caso!)).toBe("Carvalho x Construtora Lume · encerrado com perda em 06/11, por Felipe Matos");
    expect([idDaFolha("t-fecha", "k9", true), idDaFolha("t-fecha", "k9", false), idDaFolha("t-orig", "k9", false)]).toEqual(["t-fecha", "t-fecha-k9", "t-orig-k9"]);
    expect([casoDoHash("#t-fecha"), casoDoHash("#t-fecha-k9"), casoDoHash("#t-parc"), casoDoHash("")]).toEqual([null, "k9", undefined, undefined]);
    expect([parcelaCurta("Parcela 6 de 6"), parcelaCurta("Mensalidade 3 de 12"), parcelaCurta("Fixo")]).toEqual(["Parcela 6/6", "Mensalidade 3/12", "Fixo"]);
  });
});

describe("A janela de pendência pela ficha do contrato (decisão 8)", () => {
  it("a parcela deste contrato registra daqui; o reembolso vai junto com ela", () => {
    const a = noemi();
    const p = linhaEAtalhoDaPendencia(a, a.pendencias[0]!, ctx(N.id));
    expect(p).toEqual({ forte: "Parcela 6/6 · R$\u00a01.000,00 · venceu 10/11", sub: "Noemi · C-2026-012 · 8 dias de atraso", espera: false,
      atalho: { tipo: "registrar", parcelaId: P6, rotulo: "Registrar recebimento da parcela 6/6" } });
    const r = linhaEAtalhoDaPendencia(a, a.pendencias[1]!, ctx(N.id));
    expect(r).toMatchObject({ forte: "Custas · R$\u00a0412,30 · vai junto com a parcela 6/6", sub: "adiantadas pelo escritório",
      atalho: { tipo: "registrar", parcelaId: P6 } });
  });
  it("estado 12: de outro contrato, o atalho abre o contrato dela (ajuste 7)", () => {
    const a = noemi();
    const p = linhaEAtalhoDaPendencia(a, a.pendencias[0]!, ctx("ct13"));
    expect(p).toMatchObject({ forte: "Noemi · parcela 6/6 · R$\u00a01.000,00", sub: "C-2026-012 · venceu em 10/11",
      atalho: { tipo: "link", href: "/financeiro/a-receber/contratos/ct12#t-fecha-k9", rotulo: "Abrir o contrato de Noemi" } });
    expect(linhaEAtalhoDaPendencia(a, a.pendencias[1]!, ctx("ct13")).atalho)
      .toEqual({ tipo: "link", href: "/financeiro/a-receber/contratos/ct12#t-fecha-k9", rotulo: "Abrir o contrato C-2026-012" });
  });
  it("o êxito para conferir, a parcela sem valor (só com Contratos) e o reembolso sem parcela", () => {
    const a = noemi();
    expect(linhaEAtalhoDaPendencia(a, { tipo: "EXITO", nome: "Noemi", valor: 20000, cliente: "Noemi Bastos Carvalho" }, ctx(N.id)).atalho)
      .toEqual({ tipo: "link", href: "/financeiro/a-receber", rotulo: "Conferir o êxito" });
    const sv: PendenciaCaso = { tipo: "PARCELA_SEM_VALOR", nome: "Mensalidade 3 de 12", valor: null, contratoId: N.id, descricao: "Mensalidade 3 de 12" };
    expect(linhaEAtalhoDaPendencia(a, sv, ctx(N.id)).atalho).toBeNull();
    expect(linhaEAtalhoDaPendencia({ ...a, quemContratos: ["Felipe Matos"] }, sv, ctx(N.id)).sub).toBe("C-2026-012 · quem informa é a área Contratos (Felipe)");
    expect(linhaEAtalhoDaPendencia(a, sv, { ...ctx(N.id), areas: ["CONTRATOS"] }).atalho).toEqual({ tipo: "link", href: "/contratos/honorarios", rotulo: "Informar a base" });
    expect(linhaEAtalhoDaPendencia(a, { tipo: "REEMBOLSO", nome: "Cópias", valor: 5000, parcela: null }, ctx(N.id)).atalho)
      .toEqual({ tipo: "link", href: "/financeiro/a-pagar", rotulo: "Ver em A pagar" });
  });
  it("ajuste 4: o âmbar só sobe \"Encerrar\" sem pendência e sem atraso no contrato", () => {
    const pronto = { acerto: noemi({ pendencias: [], falta: 0 }) };
    expect(ambarEncerra({ totais: { contratado: 0, recebido: 0, atraso: 0, aVencer: 0 } }, pronto)).toBe(true);
    expect(ambarEncerra({ totais: { contratado: 0, recebido: 0, atraso: 120000, aVencer: 0 } }, pronto)).toBe(false);
    expect(ambarEncerra({ totais: { contratado: 0, recebido: 0, atraso: 0, aVencer: 0 } }, { acerto: noemi() })).toBe(false);
    expect(ambarEncerra({ totais: { contratado: 0, recebido: 0, atraso: 0, aVencer: 0 } }, null)).toBe(false);
  });
});

describe("De onde veio (decisão 1)", () => {
  const ev = (acao: string, dados: Record<string, unknown>) => ({ acao, em: "2026-11-12T12:30:00Z", por: { id: "f", nome: "Felipe Matos" }, dados });
  it("cada evento em uma frase curta", () => {
    expect(textoOrigem(ev("juridico.etapa", { resultado: "PERDA" }), "Carvalho x Construtora Lume")).toEqual({ fez: "encerrou o caso com perda", detalhe: "Carvalho x Construtora Lume" });
    expect(textoOrigem(ev("contrato.encerrado", { deste: false, contrato: "C-2026-013", cliente_contrato: "Cláudio Carvalho", motivo: "Tudo recebido." }), "X"))
      .toEqual({ fez: "encerrou o contrato C-2026-013, de Cláudio", detalhe: "Em Contratos · motivo: “Tudo recebido.”" });
    expect(textoOrigem(ev("contrato.encerrado", { deste: true }), "X").fez).toBe("encerrou este contrato");
    expect(textoOrigem(ev("financeiro.recebimento", { parcela: "Parcela 6 de 6", valor: 141230, forma: "PIX" }), "X"))
      .toEqual({ fez: "registrou o recebimento", detalhe: "Parcela 6/6 · R$\u00a01.412,30 por Pix" });
    expect(textoOrigem(ev("financeiro.exito_nao_cobrado", { cliente: "Carlos Dias", motivo: "PERDOADO", explicacao: "Combinado com Marina" }), "X"))
      .toEqual({ fez: "marcou o êxito de Carlos como não cobrado", detalhe: "Perdoado · “Combinado com Marina”" });
    expect(textoOrigem(ev("financeiro.exito_lancado", { valor: 840000, vencimento: "2026-12-15" }), "X")).toEqual({ fez: "conferiu e lançou o êxito", detalhe: "R$\u00a08.400,00, vence 15/12/2026" });
  });
});
