// A IA que monta o fluxo de uma automação a partir de um pedido (F3.59; PA-03). Aqui ficam as
// regras puras, para o serviço (Deno), a tela e os testes: o que o modelo recebe, o formato que
// ele devolve, como isso vira um desenho válido, os alertas que o T3jus acrescenta e como aplicar
// ou recusar as sugestões, uma por uma ou todas. A IA sugere; quem aplica é a pessoa, e nada
// sai antes de testar e a sócia dona ligar.

import { z } from "zod";
import type { PessoaRef } from "./clientes.ts";
import {
  GATILHOS, GATILHOS_VALIDOS, passosEmOrdem,
  type Fluxo, type Gatilho, type Passo, type PassoRamos, type Quando, type RegraPessoa,
} from "./automacoes.ts";

export interface SugestaoIa {
  pedido: string;
  por: PessoaRef | null;
  em: string;
  /** O desenho inteiro que a IA propõe; o que não está no rascunho aparece tracejado. */
  fluxo: Fluxo;
  feito: { texto: string; passo: string | null }[];
  alertas: { texto: string; passo: string | null; automacao: { id: string; nome: string } | null }[];
  experimente: string[];
}

/** O que o banco entrega para a IA montar (portal_automacao_ia_contexto). */
export interface ContextoMontar {
  escritorio: string;
  eu: { id: string; nome: string };
  gatilhos: Gatilho[];
  pessoas: { id: string; nome: string; areas: string[]; dono: boolean }[];
  ligadas: { id: string; nome: string; gatilho: Gatilho }[];
  atual: { id: string; nome: string; gatilho: Gatilho; rascunho: Fluxo } | null;
}

// ------------------------------------------------------------------------------- o que o modelo devolve

const TIPOS_SAIDA = ["MENSAGEM", "ESPERA", "IA", "PESSOA", "FIM"] as const;
const passoSimples = {
  ref: z.string(),
  nome: z.string().nullable(),
  texto: z.string().nullable(),
  dias: z.number().int().nullable(),
  horasAntes: z.number().int().nullable(),
  pessoaId: z.string().nullable(),
  regra: z.enum(["QUEM_CUIDA", "AREA", "SOCIA_DONA", "QUEM_PEDIU"]).nullable(),
  motivo: z.string().nullable(),
};
const passoRamoSchema = z.object({ tipo: z.enum(TIPOS_SAIDA), ...passoSimples });
const passoSaidaSchema = z.object({
  tipo: z.enum([...TIPOS_SAIDA, "RAMOS"]),
  ...passoSimples,
  ramos: z.array(z.object({ quando: z.enum(["PAGOU", "CHEGOU", "RESPONDEU", "NADA"]), passos: z.array(passoRamoSchema) })).nullable(),
});

export const saidaMontarSchema = z.object({
  entendeu: z.boolean(),
  porque: z.string().nullable(),
  gatilho: z.enum(GATILHOS_VALIDOS).nullable(),
  nome: z.string().nullable(),
  dias: z.number().int().nullable(),
  semCombinado: z.boolean().nullable(),
  passos: z.array(passoSaidaSchema),
  feito: z.array(z.object({ texto: z.string(), ref: z.string().nullable() })),
  experimente: z.array(z.string()),
});
export type SaidaMontar = z.infer<typeof saidaMontarSchema>;
type PassoSaida = z.infer<typeof passoSaidaSchema>;

export const pedirIaSchema = z.object({ pedido: z.string().max(600) });

// ------------------------------------------------------------------------------- as instruções

export function instrucoesMontar(c: ContextoMontar): string {
  const gat = c.gatilhos.map((g) => {
    const i = GATILHOS[g];
    return `- ${g}: ${i.nome}. ${i.de} Campos do texto: ${i.campos.map((x) => `{${x}}`).join(", ")}. Caminhos possíveis depois de uma espera: ${i.ramos.join(", ")}.${i.dias ? ` Dias do gatilho de ${i.dias.min} a ${i.dias.max}.` : ""}`;
  }).join("\n");
  const pessoas = c.pessoas.map((p) => `- ${p.nome} (id ${p.id}; áreas: ${p.areas.join(", ") || "nenhuma"}${p.dono ? "; sócia dona" : ""})`).join("\n");
  const ligadas = c.ligadas.length ? c.ligadas.map((a) => `- ${a.nome} (${a.gatilho})`).join("\n") : "- nenhuma";
  const atual = c.atual
    ? `\nA pessoa está mudando a automação "${c.atual.nome}" (gatilho ${c.atual.gatilho}, que não muda). O desenho de agora, em JSON:\n${JSON.stringify(c.atual.rascunho)}\nDevolva o desenho inteiro já com a mudança, mantendo o que a pessoa não pediu para mudar.`
    : "";
  return `Você monta automações de mensagens de WhatsApp para o escritório de advocacia ${c.escritorio}, no T3jus. Quem pede é ${c.eu.nome}.
Responda só no formato pedido. Escreva em português do Brasil, em linguagem simples.

Como uma automação funciona: começa num gatilho, que vem de uma área do T3jus, e segue uma lista de passos, de cima para baixo.
Gatilhos que esta pessoa pode usar (só estes):
${gat}

Passos que você pode usar:
- MENSAGEM: um texto para o cliente, com "nome" (curto, até 60 letras) e "texto". Use só os campos do gatilho, entre chaves, no meio da frase (nunca no começo nem no fim do texto). Comece com “Olá, {nome}. Aqui é do escritório {nome do escritório}.” e termine convidando a responder, como “Qualquer dúvida, é só responder esta mensagem.”. Educado, curto, sem ameaça nem constrangimento (CDC, art. 42), sem juridiquês, sem opinião jurídica, sem exclamação, sem emoji e sem travessão. Prefira palavras sem gênero, como “boas-vindas” e “agradecemos”. Não use {link de pagamento}: o T3jus ainda não gera link.
- ESPERA: "dias" de 1 a 30; no lembrete de audiência pode ser "horasAntes" de 1 a 48, contadas antes do compromisso.
- RAMOS: só no caminho principal e sempre o último dele, logo depois de uma espera. Cada caminho tem "quando" (PAGOU, CHEGOU, RESPONDEU ou NADA, conforme o gatilho; CHEGOU é "o documento chegou") e os seus passos. Dentro de um caminho não há outro RAMOS.
- IA: a IA do escritório conversa com o cliente, só com o que está no T3jus.
- PESSOA: passa a conversa para alguém, com "motivo". Use "pessoaId" de uma pessoa da lista quando o pedido disser quem; senão "regra": QUEM_CUIDA (quem cuida do caso ou do contrato; no cliente novo, quem atende o cliente), AREA (quem tem a área; não existe no cliente novo), SOCIA_DONA ou QUEM_PEDIU (quem pediu o documento; só no documento pendente). É sempre o último passo da sua sequência.
- FIM: termina; "texto" opcional curto. Último passo da sua sequência.
Cada passo tem "ref": um apelido curto e único em letras minúsculas, números e hífen (ex.: msg-1, espera-1, pessoa-1). Campos que o passo não usa vão como null.
O gatilho e as condições não entram em "passos": diga o "gatilho", os "dias" do gatilho (nos de parcela, no cliente novo, de 0 a 30 dias depois de virar cliente, e no documento pendente, de 1 a 30 dias depois do pedido) e "semCombinado" (só nos de parcela: true para deixar de fora parcela com combinado de pagamento).

Regras fixas do T3jus, que valem sempre e que você não precisa criar: mensagens só das 8h às 20h em dia útil; no máximo 1 cobrança por semana por parcela, somando todas as automações; quem pediu para não receber avisos fica de fora; texto novo só sai depois que a sócia dona aprova e o WhatsApp (Meta) aprova.

Equipe do escritório:
${pessoas}

Automações já ligadas:
${ligadas}
${atual}
Em "feito", explique em 3 a 6 frases curtas o que você montou, cada uma com o "ref" do passo (ou null). Em "experimente", até 3 pedidos curtos de ajuste que fariam sentido depois.
Se o pedido não for uma automação que dá para montar com estes gatilhos e passos, devolva entendeu = false e, em "porque", explique em uma frase o que dá para fazer.`;
}

// ------------------------------------------------------------------------------- do formato ao desenho

const ehTerminal = (t: string) => t === "FIM" || t === "PESSOA" || t === "RAMOS";
const limpo = (s: string | null | undefined, max: number) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const igual = (a: Passo, b: Passo) => {
  const sem = (p: Passo) => JSON.stringify({ ...p, id: undefined, ...(p.tipo === "RAMOS" ? { ramos: p.ramos.map((r) => r.quando) } : {}) });
  return a.tipo === b.tipo && sem(a) === sem(b);
};

/**
 * Transforma o que o modelo devolveu num desenho no formato do T3jus: ids únicos, só o que o
 * gatilho permite e nada depois de quem termina. Passos que já estão iguais no rascunho guardam
 * o mesmo id (assim só o que muda aparece como sugestão). Devolve também os refs → ids.
 */
export function fluxoDaSaida(s: SaidaMontar, g: Gatilho, c: ContextoMontar): { fluxo: Fluxo; ids: Map<string, string> } {
  const info = GATILHOS[g];
  const existentes = c.atual ? passosEmOrdem(c.atual.rascunho) : [];
  const usados = new Set<string>();
  const ids = new Map<string, string>();
  const novoId = (base: string) => {
    const b = base.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "passo";
    for (let n = 0; ; n++) {
      const id = n ? `${b}-${n + 1}` : b;
      if (!usados.has(id) && !existentes.some((e) => e.id === id)) { usados.add(id); return id; }
    }
  };
  const darId = (p: Passo, ref: string | null): Passo => {
    const mesmo = existentes.find((e) => !usados.has(e.id) && igual({ ...p, id: e.id } as Passo, e));
    const id = mesmo ? mesmo.id : novoId(ref || p.tipo.toLowerCase());
    usados.add(id);
    if (ref) ids.set(ref, id);
    return { ...p, id } as Passo;
  };
  const pessoaOk = (id: string | null) => (id && c.pessoas.some((p) => p.id === id) ? id : null);
  const converter = (x: PassoSaida | z.infer<typeof passoRamoSchema>, nivel: number): Passo | null => {
    switch (x.tipo) {
      case "MENSAGEM": {
        const nome = limpo(x.nome, 80) || "Mensagem";
        return darId({ id: "", tipo: "MENSAGEM", nome, texto: (x.texto ?? "").trim().slice(0, 1024) }, x.ref);
      }
      case "ESPERA":
        if (x.horasAntes && g === "LEMBRETE_AUDIENCIA" && x.horasAntes >= 1 && x.horasAntes <= 48) return darId({ id: "", tipo: "ESPERA", horasAntes: x.horasAntes }, x.ref);
        if (x.dias && x.dias >= 1) return darId({ id: "", tipo: "ESPERA", dias: Math.min(30, x.dias) }, x.ref);
        return null;
      case "IA": return darId({ id: "", tipo: "IA" }, x.ref);
      case "PESSOA": {
        const pessoaId = pessoaOk(x.pessoaId);
        // A regra que o gatilho não tem vira a que faz sentido nele (PA-06).
        let regra: RegraPessoa | null = pessoaId ? null : (x.regra ?? (g === "DOCUMENTO_PENDENTE" ? "QUEM_PEDIU" : g === "CLIENTE_NOVO" ? "QUEM_CUIDA" : "AREA"));
        if (regra === "QUEM_PEDIU" && g !== "DOCUMENTO_PENDENTE") regra = "QUEM_CUIDA";
        if (regra === "AREA" && g === "CLIENTE_NOVO") regra = "QUEM_CUIDA";
        return darId({ id: "", tipo: "PESSOA", pessoaId, regra, motivo: limpo(x.motivo, 300) || null }, x.ref);
      }
      case "FIM": return darId({ id: "", tipo: "FIM", texto: limpo(x.texto, 120) || null }, x.ref);
      case "RAMOS": {
        if (nivel > 0 || !("ramos" in x) || !x.ramos) return null;
        const vistos = new Set<Quando>();
        const ramos = x.ramos
          .filter((y) => info.ramos.includes(y.quando) && !vistos.has(y.quando) && vistos.add(y.quando))
          .map((y) => ({ quando: y.quando, passos: seq(y.passos, 1) }));
        return ramos.length >= 2 ? darId({ id: "", tipo: "RAMOS", ramos } as PassoRamos, x.ref) : null;
      }
    }
  };
  const seq = (lista: (PassoSaida | z.infer<typeof passoRamoSchema>)[], nivel: number): Passo[] => {
    const out: Passo[] = [];
    for (const x of lista) {
      const p = converter(x, nivel);
      if (!p) continue;
      out.push(p);
      if (ehTerminal(p.tipo)) break;
    }
    return out;
  };
  const ant = c.atual?.rascunho.passos ?? [];
  const gatAnt = ant[0]?.tipo === "GATILHO" ? ant[0] : null;
  const gatilho: Passo = info.dias
    ? { id: "gatilho", tipo: "GATILHO", dias: Math.min(info.dias.max, Math.max(info.dias.min, s.dias ?? info.dias.padrao)),
        // Cliente novo: quem conta continua o do rascunho; a IA não muda isso (decisão 1).
        ...(g === "CLIENTE_NOVO" ? { conta: gatAnt?.conta ?? "FECHOU" } : {}) }
    : { id: "gatilho", tipo: "GATILHO" };
  const gatId = ant[0]?.tipo === "GATILHO" ? ant[0].id : "gatilho";
  usados.add(gatId);
  const inicio: Passo[] = [{ ...gatilho, id: gatId }];
  if (g.startsWith("PARCELA")) {
    const cond = ant.find((p) => p.tipo === "CONDICOES");
    const id = cond?.id ?? novoId("cond");
    usados.add(id);
    inicio.push({ id, tipo: "CONDICOES", semCombinado: s.semCombinado ?? true });
  }
  const corpo = seq(s.passos, 0);
  return { fluxo: { passos: [...inicio, ...(corpo.length ? corpo : [{ id: novoId("fim"), tipo: "FIM" } as Passo])] }, ids };
}

/** O que a pessoa precisa decidir, que o T3jus sabe sozinho (não depende do modelo). */
export function alertasDaSugestao(c: ContextoMontar, g: Gatilho, f: Fluxo): SugestaoIa["alertas"] {
  const out: SugestaoIa["alertas"] = [];
  const msgs = passosEmOrdem(f).filter((p) => p.tipo === "MENSAGEM" && typeof p.texto === "string");
  if (g === "PARCELA_ATRASO" || g === "PARCELA_VAI_VENCER") {
    for (const a of c.ligadas) {
      if (a.id === c.atual?.id || (a.gatilho !== "PARCELA_ATRASO" && a.gatilho !== "PARCELA_VAI_VENCER")) continue;
      out.push({
        texto: `Já existe a automação “${a.nome}” ligada. Com as duas, o cliente poderia receber duas cobranças na mesma semana, acima do limite de 1 por semana. Ao ligar esta, dá para desligar a outra.`,
        passo: null, automacao: { id: a.id, nome: a.nome },
      });
    }
  }
  const primeira = msgs[0];
  if (primeira) {
    out.push({
      texto: msgs.length === 1
        ? "O texto é um modelo novo. A sócia dona aprova e, ao ligar, ele vai para aprovação no WhatsApp (Meta), que costuma levar até 1 dia. Até lá, nada sai."
        : `Os ${msgs.length} textos são modelos novos. A sócia dona aprova cada um e, ao ligar, eles vão para aprovação no WhatsApp (Meta), que costuma levar até 1 dia. Até lá, nada sai.`,
      passo: primeira.id, automacao: null,
    });
  }
  return out;
}

// ------------------------------------------------------------------------------- aplicar e recusar

const ids = (f: Fluxo) => new Set(passosEmOrdem(f).map((p) => p.id));

/** O desenho que a tela mostra: o da sugestão, com o que já está salvo no lugar. */
export function fluxoComSugestao(rascunho: Fluxo, s: SugestaoIa | null): Fluxo {
  if (!s) return rascunho;
  const salvos = new Map(passosEmOrdem(rascunho).map((p) => [p.id, p]));
  const ir = (seq: Passo[]): Passo[] => seq.map((p) => {
    if (p.tipo === "RAMOS") return { ...p, ramos: p.ramos.map((r) => ({ ...r, passos: ir(r.passos) })) };
    return salvos.get(p.id) ?? p;
  });
  return { passos: ir(s.fluxo.passos) };
}

/** Todos os passos da sugestão que ainda não estão no rascunho (os tracejados, com os fins). */
export function passosTracejados(rascunho: Fluxo, s: SugestaoIa | null): Set<string> {
  if (!s) return new Set();
  const salvos = ids(rascunho);
  return new Set(passosEmOrdem(s.fluxo).filter((p) => !salvos.has(p.id)).map((p) => p.id));
}

/**
 * Os passos sugeridos que a pessoa aplica ou recusa. O fim não conta: ele vem junto com o passo
 * de antes (ou com o ramo, quando abre um caminho).
 */
export function passosSugeridos(rascunho: Fluxo, s: SugestaoIa | null): Set<string> {
  if (!s) return new Set();
  const salvos = ids(rascunho);
  return new Set(passosEmOrdem(s.fluxo).filter((p) => p.tipo !== "FIM" && !salvos.has(p.id)).map((p) => p.id));
}

/** Fica o que está em "ficar"; um fim fica quando o passo de antes ficou (ou abre o caminho). */
function podar(seq: Passo[], ficar: (id: string) => boolean, comFim = false): Passo[] {
  const out: Passo[] = [];
  seq.forEach((p, i) => {
    const antes = i === 0 ? true : out.at(-1)?.id === seq[i - 1]!.id;
    if (!(ficar(p.id) || (comFim && p.tipo === "FIM" && antes))) return;
    out.push(p.tipo === "RAMOS" ? { ...p, ramos: p.ramos.map((r) => ({ ...r, passos: podar(r.passos, ficar, comFim) })) } : p);
  });
  return out;
}

/** Os ramos que contêm cada passo (aplicar um passo de um caminho aplica também os ramos). */
function pais(f: Fluxo): Map<string, string> {
  const m = new Map<string, string>();
  const ir = (seq: Passo[], pai: string | null) => seq.forEach((p) => {
    if (pai) m.set(p.id, pai);
    if (p.tipo === "RAMOS") p.ramos.forEach((r) => ir(r.passos, p.id));
  });
  ir(f.passos, null);
  return m;
}

/**
 * Aplica sugestões ao rascunho: todas, ou só as escolhidas (com o ramo de que fazem parte).
 * Devolve o rascunho novo e a sugestão que sobra (nula quando não sobra nada tracejado).
 */
export function aplicarSugestao(rascunho: Fluxo, s: SugestaoIa, escolha: string[] | "TUDO"): { fluxo: Fluxo; sobra: Fluxo | null } {
  const junto = fluxoComSugestao(rascunho, s);
  if (escolha === "TUDO") return { fluxo: junto, sobra: null };
  const ficar = ids(rascunho);
  const pai = pais(junto);
  for (const id of escolha) {
    for (let x: string | undefined = id; x; x = pai.get(x)) ficar.add(x);
  }
  const fluxo = { passos: podar(junto.passos, (id) => ficar.has(id), true) };
  return { fluxo, sobra: passosSugeridos(fluxo, { ...s, fluxo: s.fluxo }).size ? s.fluxo : null };
}

/** Recusa sugestões: some da sugestão o passo (e, num ramo, os caminhos dele). */
export function recusarSugestao(rascunho: Fluxo, s: SugestaoIa, escolha: string[] | "TUDO"): Fluxo | null {
  if (escolha === "TUDO") return null;
  const salvos = ids(rascunho);
  const fora = new Set(escolha.filter((id) => !salvos.has(id)));
  const sobra = { passos: podar(s.fluxo.passos, (id) => !fora.has(id)) };
  return passosSugeridos(rascunho, { ...s, fluxo: sobra }).size ? sobra : null;
}
