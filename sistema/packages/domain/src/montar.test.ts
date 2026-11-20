import { describe, expect, it } from "vitest";
import type { Fluxo } from "./automacoes.ts";
import {
  alertasDaSugestao, aplicarSugestao, fluxoComSugestao, fluxoDaSaida, instrucoesMontar, passosSugeridos, recusarSugestao,
  saidaMontarSchema, type ContextoMontar, type SaidaMontar, type SugestaoIa,
} from "./montar.ts";

const GUSTAVO = "aa000000-0000-4000-8000-000000000009";
const CTX: ContextoMontar = {
  escritorio: "Ribeiro & Matos",
  eu: { id: "aa000000-0000-4000-8000-000000000001", nome: "Marina Ribeiro" },
  gatilhos: ["PARCELA_ATRASO", "PAGAMENTO_RECEBIDO"],
  pessoas: [{ id: GUSTAVO, nome: "Gustavo Lima", areas: ["FINANCEIRO"], dono: false }],
  ligadas: [{ id: "a-antiga", nome: "Parcela em atraso", gatilho: "PARCELA_ATRASO" }],
  atual: null,
};
const nada = { nome: null, texto: null, dias: null, horasAntes: null, pessoaId: null, regra: null, motivo: null, ramos: null };
const SAIDA: SaidaMontar = {
  entendeu: true, porque: null, gatilho: "PARCELA_ATRASO", nome: "Cobrança gentil", dias: 3, semCombinado: true,
  passos: [
    { ...nada, tipo: "MENSAGEM", ref: "msg-1", nome: "Cobrança gentil · 1º aviso", texto: "Olá, {nome}. A parcela {parcela} venceu em {vencimento}. Ribeiro & Matos" },
    { ...nada, tipo: "ESPERA", ref: "espera-1", dias: 5 },
    { ...nada, tipo: "RAMOS", ref: "ramos", ramos: [
      { quando: "PAGOU", passos: [{ ...nada, tipo: "FIM", ref: "fim-pagou" }] },
      { quando: "RESPONDEU", passos: [{ ...nada, tipo: "IA", ref: "ia" }, { ...nada, tipo: "FIM", ref: "fim" }] },
      { quando: "NADA", passos: [{ ...nada, tipo: "PESSOA", ref: "pessoa", pessoaId: GUSTAVO, motivo: "5 dias sem pagamento" }] },
    ] },
    { ...nada, tipo: "MENSAGEM", ref: "depois", nome: "Não pode vir depois do ramo", texto: "x" },
  ],
  feito: [{ texto: "Espera de 5 dias.", ref: "espera-1" }], experimente: ["Espere 7 dias em vez de 5"],
};

const sug = (fluxo: Fluxo): SugestaoIa => ({ pedido: "x", por: null, em: "2026-11-20T10:00:00Z", fluxo, feito: [], alertas: [], experimente: [] });

describe("F3.59: a IA monta o fluxo", () => {
  it("as instruções dizem o que a pessoa pode usar e as regras fixas", () => {
    const t = instrucoesMontar(CTX);
    expect(t).toContain("PARCELA_ATRASO: Parcela em atraso");
    expect(t).not.toContain("ETAPA_CASO:");
    expect(t).toContain(`Gustavo Lima (id ${GUSTAVO}; áreas: FINANCEIRO)`);
    expect(t).toContain("1 cobrança por semana por parcela");
    expect(t).toContain("Não use {link de pagamento}");
    expect(saidaMontarSchema.safeParse(SAIDA).success).toBe(true);
  });

  it("o formato vira desenho: gatilho e condições na frente, ids do ref e nada depois do ramo", () => {
    const { fluxo, ids } = fluxoDaSaida(SAIDA, "PARCELA_ATRASO", CTX);
    expect(fluxo.passos.map((p) => p.id)).toEqual(["gatilho", "cond", "msg-1", "espera-1", "ramos"]);
    expect(fluxo.passos[0]).toEqual({ id: "gatilho", tipo: "GATILHO", dias: 3 });
    expect(ids.get("pessoa")).toBe("pessoa");
    const r = fluxo.passos[4]!;
    expect(r.tipo === "RAMOS" && r.ramos.map((x) => x.passos.map((p) => p.id))).toEqual([["fim-pagou"], ["ia", "fim"], ["pessoa"]]);
  });

  it("pessoa fora da equipe vira a regra da área; caminho que o gatilho não tem sai", () => {
    const s: SaidaMontar = { ...SAIDA, gatilho: "PAGAMENTO_RECEBIDO", passos: [
      { ...nada, tipo: "MENSAGEM", ref: "m", nome: "Obrigado", texto: "Recebemos, {nome}." },
      { ...nada, tipo: "ESPERA", ref: "e", dias: 2 },
      { ...nada, tipo: "RAMOS", ref: "r", ramos: [
        { quando: "PAGOU", passos: [{ ...nada, tipo: "FIM", ref: "f1" }] },
        { quando: "RESPONDEU", passos: [{ ...nada, tipo: "PESSOA", ref: "p", pessoaId: "inventado" }] },
        { quando: "NADA", passos: [{ ...nada, tipo: "FIM", ref: "f2" }] },
      ] },
    ] };
    const { fluxo } = fluxoDaSaida(s, "PAGAMENTO_RECEBIDO", CTX);
    expect(fluxo.passos.map((p) => p.tipo)).toEqual(["GATILHO", "MENSAGEM", "ESPERA", "RAMOS"]);
    const r = fluxo.passos[3]!;
    expect(r.tipo === "RAMOS" && r.ramos.map((x) => x.quando)).toEqual(["RESPONDEU", "NADA"]);
    expect(r.tipo === "RAMOS" && r.ramos[0]!.passos[0]).toEqual({ id: "p", tipo: "PESSOA", pessoaId: null, regra: "AREA", motivo: null });
  });

  it("mudando uma automação, o que ficou igual guarda o id (só o novo fica tracejado)", () => {
    const antes = fluxoDaSaida(SAIDA, "PARCELA_ATRASO", CTX).fluxo;
    const mudou: SaidaMontar = { ...SAIDA, passos: SAIDA.passos.map((p) => (p.ref === "espera-1" ? { ...p, ref: "espera-7", dias: 7 } : p)) };
    const depois = fluxoDaSaida(mudou, "PARCELA_ATRASO", { ...CTX, atual: { id: "a1", nome: "x", gatilho: "PARCELA_ATRASO", rascunho: antes } }).fluxo;
    expect([...passosSugeridos(antes, sug(depois))]).toEqual(["espera-7"]);
  });

  it("alertas: a cobrança que já está ligada e o texto novo que precisa de aprovação", () => {
    const { fluxo } = fluxoDaSaida(SAIDA, "PARCELA_ATRASO", CTX);
    const a = alertasDaSugestao(CTX, "PARCELA_ATRASO", fluxo);
    expect(a.map((x) => [x.automacao?.id ?? null, x.passo])).toEqual([["a-antiga", null], [null, "msg-1"]]);
    expect(a[0]!.texto).toContain("Parcela em atraso");
  });

  it("aplicar e recusar, um por um ou tudo; aplicar um passo de um caminho aplica o ramo", () => {
    const { fluxo } = fluxoDaSaida(SAIDA, "PARCELA_ATRASO", CTX);
    const rasc: Fluxo = { passos: fluxo.passos.slice(0, 2) };
    const s = sug(fluxo);
    expect(passosSugeridos(rasc, s).size).toBe(5);
    const um = aplicarSugestao(rasc, s, ["pessoa"]);
    expect(um.fluxo.passos.map((p) => p.id)).toEqual(["gatilho", "cond", "ramos"]);
    // O fim que abre o caminho "Se pagou" vem com o ramo; o do caminho "Se respondeu" espera a IA.
    const r = um.fluxo.passos[2]!;
    expect(r.tipo === "RAMOS" && r.ramos.map((x) => x.passos.map((p) => p.id))).toEqual([["fim-pagou"], [], ["pessoa"]]);
    expect(um.sobra).not.toBeNull();
    expect(passosSugeridos(um.fluxo, s).has("pessoa")).toBe(false);
    expect(aplicarSugestao(rasc, s, "TUDO")).toEqual({ fluxo, sobra: null });
    const sem = recusarSugestao(rasc, s, ["ramos"])!;
    expect(passosEmOrdemIds(sem)).toEqual(["gatilho", "cond", "msg-1", "espera-1"]);
    expect(recusarSugestao(rasc, s, "TUDO")).toBeNull();
    expect(recusarSugestao(rasc, sug({ passos: [...rasc.passos, fluxo.passos[2]!] }), ["msg-1"])).toBeNull();
    // O que está salvo aparece com o conteúdo salvo, no lugar da sugestão.
    const editado: Fluxo = { passos: [...rasc.passos, { id: "msg-1", tipo: "MENSAGEM", nome: "Editado", texto: "y" }] };
    expect(fluxoComSugestao(editado, s).passos[2]).toEqual(editado.passos[2]);
  });
});

function passosEmOrdemIds(f: Fluxo): string[] {
  return f.passos.map((p) => p.id);
}
