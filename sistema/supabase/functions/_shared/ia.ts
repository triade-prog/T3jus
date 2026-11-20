// O modelo de IA por trás da assistente virtual (F3.53). O resto do serviço só conhece a
// interface Cerebro: os testes usam um falso, e trocar de modelo muda só esta peça.
// O modelo recebe as instruções (regras fixas, configuração do escritório e só os dados de quem
// escreve) e a conversa, e devolve sempre o formato saidaIaSchema. O que ele responde ainda
// passa pela conferência das regras fixas (finalizarResposta) antes de sair.

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { saidaIaSchema, type SaidaIa } from "@t3jus/domain";
import { registrar } from "./registro.ts";

export interface PedidoIa {
  instrucoes: string;
  mensagens: { role: "user" | "assistant"; content: string }[];
}

export interface Cerebro {
  /** Nulo quando o modelo recusou ou não devolveu o formato: o serviço passa para uma pessoa. */
  pensar(p: PedidoIa): Promise<SaidaIa | null>;
}

/** Modelo padrão (escolha da Carol em 20/11: rápido e mais barato); IA_MODELO troca sem mexer no código. */
export const MODELO_PADRAO = "claude-haiku-5-5";

/** O Haiku não tem modelo reserva na API: pedir reserva a ele dá erro. */
const reserva = (modelo: string) =>
  modelo.startsWith("claude-haiku") ? {} : { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const };

export function cerebroClaude(apiKey: string, modelo = MODELO_PADRAO): Cerebro {
  // Responder a cliente não pode esperar muito: 2 tentativas e 40 s por chamada.
  const cliente = new Anthropic({ apiKey, maxRetries: 2, timeout: 40_000 });
  return {
    async pensar(p) {
      try {
        const r = await cliente.beta.messages.parse({
          model: modelo,
          max_tokens: 4000,
          system: p.instrucoes,
          messages: p.mensagens,
          output_config: { effort: "medium", format: betaZodOutputFormat(saidaIaSchema) },
          // Nos modelos que têm, se o modelo recusar por segurança a própria API tenta o reserva.
          ...reserva(modelo),
        });
        if (r.stop_reason === "refusal" || r.stop_reason === "max_tokens") {
          registrar("aviso", { funcao: "ia", evento: "sem_resposta", motivo: r.stop_reason });
          return null;
        }
        return r.parsed_output ?? null;
      } catch (e) {
        if (e instanceof Anthropic.RateLimitError) registrar("aviso", { funcao: "ia", evento: "limite" });
        else if (e instanceof Anthropic.APIError) registrar("erro", { funcao: "ia", status: e.status });
        else registrar("erro", { funcao: "ia", erro: e });
        return null;
      }
    },
  };
}
