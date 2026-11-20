// F3.59: a IA monta o fluxo, com o banco e o modelo falsos.
import { assertEquals, assertRejects } from "@std/assert";
import { ErroDominio, type ContextoMontar, type SaidaMontar } from "@t3jus/domain";
import type { Cerebro } from "./ia.ts";
import { montarSugestao } from "./montar_fluxo.ts";
import { bancoFalso } from "./teste_util.ts";

const QUEM = { p_pessoa: "aa000000-0000-4000-8000-000000000001", p_escritorio: "e0000000-0000-4000-8000-0000000000a1" };
const CTX: ContextoMontar = {
  escritorio: "Ribeiro & Matos", eu: { id: QUEM.p_pessoa, nome: "Marina Ribeiro" }, gatilhos: ["PARCELA_ATRASO"],
  pessoas: [], ligadas: [{ id: "a-antiga", nome: "Parcela em atraso", gatilho: "PARCELA_ATRASO" }], atual: null,
};
const nada = { nome: null, texto: null, dias: null, horasAntes: null, pessoaId: null, regra: null, motivo: null, ramos: null };
const SAIDA: SaidaMontar = {
  entendeu: true, porque: null, gatilho: "PARCELA_ATRASO", nome: "Cobrança gentil", dias: 3, semCombinado: true,
  passos: [{ ...nada, tipo: "MENSAGEM", ref: "msg-1", nome: "Cobrança", texto: "Olá, {nome}. A parcela venceu." }, { ...nada, tipo: "FIM", ref: "fim" }],
  feito: [{ texto: "Escrevi o texto.", ref: "msg-1" }, { texto: "  ", ref: null }], experimente: ["Espere 7 dias", ""],
};

function montar(saida: SaidaMontar | null) {
  let pedidos = 0;
  const ia: Cerebro = { pensar: () => Promise.resolve(null), montar: () => { pedidos++; return Promise.resolve(saida); } };
  const db = bancoFalso({ portal_automacao_ia_contexto: () => CTX, portal_automacao_ia_sugerir: (a) => a.p_dados });
  return { ia, db, pedidos: () => pedidos };
}

Deno.test("F3.59: o pedido vira sugestão guardada, com o que a IA fez e os alertas do T3jus", async () => {
  const m = montar(SAIDA);
  const r = await montarSugestao(m.db.banco, m.ia, QUEM, null, "  Quero cobrar com educação  ") as unknown as Record<string, unknown>;
  assertEquals(m.db.chamadas.map((c) => c.funcao), ["portal_automacao_ia_contexto", "portal_automacao_ia_sugerir"]);
  assertEquals(r.pedido, "Quero cobrar com educação");
  assertEquals((r.fluxo as { passos: { id: string }[] }).passos.map((p) => p.id), ["gatilho", "cond", "msg-1", "fim"]);
  assertEquals(r.feito, [{ texto: "Escrevi o texto.", passo: "msg-1" }]);
  assertEquals((r.alertas as { automacao: { id: string } | null }[]).map((a) => a.automacao?.id ?? null), ["a-antiga", null]);
  assertEquals(r.experimente, ["Espere 7 dias"]);
});

Deno.test("F3.59: não entendeu, gatilho fora das áreas ou modelo fora do ar não guardam nada", async () => {
  for (const s of [{ ...SAIDA, entendeu: false, porque: "Só dá para automatizar mensagens." }, { ...SAIDA, gatilho: "ETAPA_CASO" as const }]) {
    const m = montar(s);
    const e = await assertRejects(() => montarSugestao(m.db.banco, m.ia, QUEM, null, "Faça café"), ErroDominio);
    assertEquals([e.codigo, e.detalhes?.motivo], ["VALIDATION_ERROR", "NAO_ENTENDEU"]);
    assertEquals(m.db.chamadas.length, 1);
  }
  const f = montar(null);
  assertEquals((await assertRejects(() => montarSugestao(f.db.banco, f.ia, QUEM, null, "Cobrar"), ErroDominio)).detalhes?.motivo, "IA_INDISPONIVEL");
  const sem = montar(SAIDA);
  assertEquals((await assertRejects(() => montarSugestao(sem.db.banco, null, QUEM, null, "Cobrar"), ErroDominio)).detalhes?.motivo, "IA_INDISPONIVEL");
  assertEquals((await assertRejects(() => montarSugestao(sem.db.banco, sem.ia, QUEM, null, "x"), ErroDominio)).detalhes?.campos, ["pedido"]);
  assertEquals(sem.pedidos(), 0);
});
