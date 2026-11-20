// F3.53: a IA atendendo uma conversa, com o banco e o modelo falsos.
import { assertEquals } from "@std/assert";
import type { AtendimentoIa, SaidaIa } from "@t3jus/domain";
import { atenderConversa } from "./atendimento.ts";
import type { Cerebro } from "./ia.ts";
import { bancoFalso } from "./teste_util.ts";

const ESC = "3e0f6c3b-8a4d-4f5e-8b1c-4d5e6f7a8b9c";
const CONV = "7c4d0a7f-2e8b-4d9c-8f5a-8b9c0d1e2f3a";

function atendimento(extra: Partial<AtendimentoIa> = {}, agora = "2026-11-18T10:12"): AtendimentoIa {
  return {
    conversa: { id: CONV, situacao: "IA", versao: 1, nome: "Marta", notaIa: null, pessoaRespondeu: false },
    iaSituacao: "LIGADA",
    mensagens: [{ autor: "CLIENTE", texto: "Quando é a audiência do Hélio?" }],
    contexto: {
      escritorio: "Ribeiro & Matos",
      config: { nome: "Assistente virtual do Ribeiro & Matos", apresentacao: "Olá! Sou a assistente virtual do Ribeiro & Matos.", tom: "CORDIAL",
        assuntos: ["COMPROMISSOS"], palavras: ["liminar"], dias: [1, 2, 3, 4, 5], horaInicio: "09:00", horaFim: "18:00",
        msgForaHorario: "Uma pessoa vai ver {próximo atendimento}.", telefoneUrgencia: null, situacao: "LIGADA" },
      agora, feriados: [], cliente: { nome: "Hélio Corrêa" }, contato: { nome: "Marta Corrêa", papel: "esposa", principal: false },
      quemResponde: { nome: "Larissa Costa", razao: "CASO" }, comercial: "Diego Almeida", respostas: [],
      dados: { compromissos: [{ titulo: "Audiência de conciliação", tipo: "AUDIENCIA", inicio: "2026-11-25T14:00", modalidade: "PRESENCIAL", local: "Fórum", link: null }] },
    },
    ...extra,
  };
}

function montar(a: AtendimentoIa, saida: SaidaIa | null) {
  let chamouModelo = 0;
  const cerebro: Cerebro = { pensar: () => { chamouModelo++; return Promise.resolve(saida); } };
  const db = bancoFalso({
    ia_atendimento: () => a,
    conversa_ia_respondeu: () => null,
    conversa_ia_passou: () => "pessoa",
    conversa_ia_nao_soube: () => "pergunta",
  });
  return { cerebro, db, modelo: () => chamouModelo };
}

const nomes = (db: ReturnType<typeof bancoFalso>) => db.chamadas.map((c) => c.funcao).filter((f) => f !== "ia_atendimento");

Deno.test("PA-05: responde com o que está no T3jus e se apresenta na primeira mensagem", async () => {
  const m = montar(atendimento(), { acao: "RESPONDER", texto: "A audiência é dia 25/11, às 14h, no Fórum.", motivo: null, fonte: "Agenda", resolvida: true, naoSoube: null });
  const r = await atenderConversa(m.db.banco, m.cerebro, ESC, CONV);
  assertEquals(r.acao, "RESPONDEU");
  assertEquals(nomes(m.db), ["conversa_ia_respondeu"]);
  assertEquals(m.db.chamadas[1]!.args.p_texto, "Olá! Sou a assistente virtual do Ribeiro & Matos.\n\nA audiência é dia 25/11, às 14h, no Fórum.");
  assertEquals(m.db.chamadas[1]!.args.p_resolvida, true);
});

Deno.test("PA-05: não entra em conversa com a equipe nem já respondida por uma pessoa", async () => {
  for (const conversa of [{ situacao: "EQUIPE" as const, pessoaRespondeu: true }, { situacao: "IA" as const, pessoaRespondeu: true }]) {
    const m = montar(atendimento({ conversa: { ...atendimento().conversa, ...conversa } }), null);
    assertEquals((await atenderConversa(m.db.banco, m.cerebro, ESC, CONV)).acao, "SILENCIO");
    assertEquals([nomes(m.db), m.modelo()], [[], 0]);
  }
});

Deno.test("PA-04: desligada, a conversa vai direto para a equipe, sem resposta automática", async () => {
  const m = montar(atendimento({ iaSituacao: "DESLIGADA" }), null);
  assertEquals((await atenderConversa(m.db.banco, m.cerebro, ESC, CONV)).acao, "PASSOU");
  assertEquals([nomes(m.db), m.modelo()], [["conversa_ia_passou"], 0]);
  assertEquals(m.db.chamadas[1]!.args.p_motivo, "IA_DESLIGADA");
});

Deno.test("PA-04: fora do horário, quando não sabe, passa e diz quando uma pessoa vai ver", async () => {
  const m = montar(atendimento({}, "2026-11-18T21:30"),
    { acao: "PASSAR", texto: "", motivo: "NAO_SOUBE", fonte: null, resolvida: false, naoSoube: "Vocês atendem no sábado?" });
  assertEquals((await atenderConversa(m.db.banco, m.cerebro, ESC, CONV)).acao, "PASSOU");
  assertEquals(nomes(m.db), ["conversa_ia_respondeu", "conversa_ia_nao_soube", "conversa_ia_passou"]);
  const texto = String(m.db.chamadas[1]!.args.p_texto);
  assertEquals(texto.endsWith("Uma pessoa vai ver amanhã, a partir das 9h."), true);
  assertEquals(m.db.chamadas[1]!.args.p_resolvida, false);
  assertEquals(m.db.chamadas[2]!.args.p_texto, "Vocês atendem no sábado?");
});

Deno.test("PA-05: palavra do escritório passa sem chamar o modelo; modelo fora do ar também passa", async () => {
  const p = montar(atendimento({ mensagens: [{ autor: "CLIENTE", texto: "Saiu a liminar?" }] }), null);
  await atenderConversa(p.db.banco, p.cerebro, ESC, CONV);
  assertEquals([p.modelo(), p.db.chamadas.at(-1)!.args.p_motivo], [0, "PALAVRA"]);
  const f = montar(atendimento(), null);
  await atenderConversa(f.db.banco, f.cerebro, ESC, CONV);
  assertEquals([f.modelo(), f.db.chamadas.at(-1)!.args.p_motivo], [1, "OUTRO"]);
});
