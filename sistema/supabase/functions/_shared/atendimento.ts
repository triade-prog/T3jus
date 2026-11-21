// A IA atendendo uma conversa (F3.53; PA-05, PD-07). O serviço do WhatsApp chama
// atenderConversa depois de whatsapp_mensagem_recebida; a tela de teste chama planejarResposta
// com o mesmo contexto, sem gravar nada. Ordem: silêncio quando uma pessoa já está na conversa;
// passar direto com a IA desligada ou com palavra do escritório; senão o modelo responde, a
// resposta é conferida pelas regras fixas e, se precisar, a conversa passa para uma pessoa.

import {
  decidirAntes, finalizarResposta, instrucoesIa, mensagensParaIa, pedeSemAvisos, planoSemModelo,
  type AtendimentoIa, type ContextoIa, type MensagemIa, type PlanoIa,
} from "@t3jus/domain";
import type { Banco } from "./banco.ts";
import type { Cerebro } from "./ia.ts";

/** A resposta para um contexto e uma conversa, sem gravar nada (também é o Testar sem enviar). */
export async function planejarResposta(cerebro: Cerebro | null, ctx: ContextoIa, msgs: MensagemIa[], notaIa: string | null = null): Promise<PlanoIa> {
  // F3.83: o pedido claro de não receber avisos passa direto, sem o modelo.
  if (ctx.cliente && pedeSemAvisos(msgs.filter((m) => m.autor === "CLIENTE").at(-1)?.texto ?? null)) return planoSemModelo("SEM_AVISOS", ctx, msgs);
  if (!cerebro) return planoSemModelo("OUTRO", ctx, msgs);
  const pedido = { instrucoes: instrucoesIa(ctx, { notaIa }), mensagens: mensagensParaIa(msgs) };
  if (!pedido.mensagens.length) return planoSemModelo("OUTRO", ctx, msgs);
  const saida = await cerebro.pensar(pedido);
  if (!saida) return planoSemModelo("OUTRO", ctx, msgs);
  return finalizarResposta(saida, ctx, msgs);
}

export type ResultadoAtendimento =
  | { acao: "SILENCIO"; razao: string }
  | { acao: "RESPONDEU" | "PASSOU"; plano: PlanoIa };

/** Atende a última mensagem do cliente numa conversa e grava o que aconteceu. */
export async function atenderConversa(banco: Banco, cerebro: Cerebro | null, escritorio: string, conversa: string): Promise<ResultadoAtendimento> {
  const a = await banco.rpc<AtendimentoIa>("ia_atendimento", { p_escritorio: escritorio, p_conversa: conversa });
  const antes = decidirAntes(a);
  if (antes.acao === "SILENCIO") return { acao: "SILENCIO", razao: antes.razao };
  const plano = antes.acao === "PASSAR"
    ? planoSemModelo(antes.motivo, a.contexto, a.mensagens)
    : await planejarResposta(cerebro, a.contexto, a.mensagens, a.conversa.notaIa);
  if (plano.enviar) {
    await banco.rpc("conversa_ia_respondeu", {
      p_escritorio: escritorio, p_conversa: conversa, p_texto: plano.enviar, p_resolvida: !plano.passar && plano.resolvida,
    });
  }
  if (plano.naoSoube) {
    await banco.rpc("conversa_ia_nao_soube", { p_escritorio: escritorio, p_conversa: conversa, p_texto: plano.naoSoube });
  }
  if (plano.passar) {
    await banco.rpc("conversa_ia_passou", {
      p_escritorio: escritorio, p_conversa: conversa, p_motivo: plano.passar, p_motivo_texto: plano.motivoTexto,
    });
    return { acao: "PASSOU", plano };
  }
  return { acao: "RESPONDEU", plano };
}
