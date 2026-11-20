// O modelo de IA por trás da assistente virtual (F3.53). O resto do serviço só conhece a
// interface Cerebro: os testes usam um falso, e trocar de modelo ou de empresa muda só esta peça.
// O modelo recebe as instruções (regras fixas, configuração do escritório e só os dados de quem
// escreve) e a conversa, e devolve sempre o formato saidaIaSchema. O que ele responde ainda
// passa pela conferência das regras fixas (finalizarResposta) antes de sair.
// Empresa: OpenAI (decisão da Carol em 20/11/2026), pela API de Chat Completions com saída
// estruturada (JSON Schema estrito). Segredos: OPENAI_API_KEY e, opcional, IA_MODELO.

import { z } from "zod";
import { saidaIaSchema, saidaMontarSchema, type SaidaIa, type SaidaMontar } from "@t3jus/domain";
import { registrar } from "./registro.ts";

export interface PedidoIa {
  instrucoes: string;
  mensagens: { role: "user" | "assistant"; content: string }[];
}

export interface Cerebro {
  /** Nulo quando o modelo recusou ou não devolveu o formato: o serviço passa para uma pessoa. */
  pensar(p: PedidoIa): Promise<SaidaIa | null>;
  /** A IA que monta o fluxo de uma automação (F3.59). Nulo: não montou. */
  montar?(p: PedidoIa): Promise<SaidaMontar | null>;
}

/** Modelo padrão; a variável IA_MODELO troca sem mexer no código. */
export const MODELO_PADRAO = "gpt-4.1-mini";

const URL_OPENAI = "https://api.openai.com/v1/chat/completions";

/** O formato da saída em JSON Schema estrito: todo campo obrigatório e nada além deles. */
export function esquemaEstrito(esquema: z.ZodType = saidaIaSchema): Record<string, unknown> {
  const fechar = (s: unknown): unknown => {
    if (Array.isArray(s)) return s.map(fechar);
    if (!s || typeof s !== "object") return s;
    const o: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(s)) if (k !== "$schema" && k !== "minimum" && k !== "maximum") o[k] = fechar(v);
    if (o.type === "object" && o.properties) {
      o.additionalProperties = false;
      o.required = Object.keys(o.properties as object);
    }
    return o;
  };
  return fechar(z.toJSONSchema(esquema)) as Record<string, unknown>;
}
const ESQUEMA = esquemaEstrito();
const ESQUEMA_MONTAR = esquemaEstrito(saidaMontarSchema);

type Resposta = { choices?: { message?: { content?: string | null; refusal?: string | null }; finish_reason?: string }[] };

/** Uma chamada ao modelo com saída estruturada; nulo quando não veio o formato. */
async function pedirJson<T>(cfg: { apiKey: string; modelo: string; buscar: typeof fetch }, p: PedidoIa, nome: string,
                            esquema: Record<string, unknown>, validar: z.ZodType<T>, maxTokens: number, segundos: number): Promise<T | null> {
  for (let tentativa = 1; tentativa <= 2; tentativa++) {
    try {
      const r = await cfg.buscar(URL_OPENAI, {
        method: "POST",
        headers: { authorization: `Bearer ${cfg.apiKey}`, "content-type": "application/json" },
        signal: AbortSignal.timeout(segundos * 1000),
        body: JSON.stringify({
          model: cfg.modelo,
          max_completion_tokens: maxTokens,
          messages: [{ role: "system", content: p.instrucoes }, ...p.mensagens],
          response_format: { type: "json_schema", json_schema: { name: nome, strict: true, schema: esquema } },
        }),
      });
      if (r.status === 429 || r.status >= 500) {
        registrar("aviso", { funcao: "ia", evento: "indisponivel", status: r.status, tentativa });
        continue;
      }
      if (!r.ok) {
        registrar("erro", { funcao: "ia", status: r.status });
        return null;
      }
      const escolha = ((await r.json()) as Resposta).choices?.[0];
      if (!escolha?.message?.content || escolha.message.refusal || escolha.finish_reason === "length") {
        registrar("aviso", { funcao: "ia", evento: "sem_resposta", motivo: escolha?.message?.refusal ? "recusa" : escolha?.finish_reason ?? "vazia" });
        return null;
      }
      const saida = validar.safeParse(JSON.parse(escolha.message.content));
      if (!saida.success) {
        registrar("aviso", { funcao: "ia", evento: "formato_invalido" });
        return null;
      }
      return saida.data;
    } catch (e) {
      registrar("erro", { funcao: "ia", erro: e, tentativa });
    }
  }
  return null;
}

export function cerebroOpenAI(apiKey: string, modelo = MODELO_PADRAO, buscar: typeof fetch = fetch): Cerebro {
  const cfg = { apiKey, modelo, buscar };
  return {
    // Responder a cliente não pode esperar muito: 2 tentativas e 40 s por chamada.
    pensar: (p) => pedirJson(cfg, p, "resposta_ia", ESQUEMA, saidaIaSchema, 2000, 40),
    // Montar um fluxo é maior e a pessoa espera na tela: até 60 s.
    montar: (p) => pedirJson(cfg, p, "fluxo_automacao", ESQUEMA_MONTAR, saidaMontarSchema, 6000, 60),
  };
}
