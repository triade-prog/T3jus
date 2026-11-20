// A IA que monta o fluxo de uma automação (F3.59; PA-03). O banco entrega o contexto (só o
// que a pessoa pode usar), o modelo devolve o formato saidaMontarSchema, as regras puras do
// domínio transformam isso num desenho e acrescentam os alertas, e o banco confere o formato
// e guarda a sugestão. Nada é aplicado ao rascunho aqui: quem aplica é a pessoa, na tela.

import {
  alertasDaSugestao, ErroDominio, fluxoDaSaida, instrucoesMontar,
  type ContextoMontar, type PaginaAutomacao,
} from "@t3jus/domain";
import type { Cerebro } from "./ia.ts";
import { registrar } from "./registro.ts";

interface Banco {
  rpc<T>(funcao: string, args: Record<string, unknown>): Promise<T>;
}

export async function montarSugestao(
  banco: Banco, ia: Cerebro | null | undefined, quem: { p_pessoa: string; p_escritorio: string }, id: string | null, pedido: string,
): Promise<PaginaAutomacao> {
  const texto = pedido.trim();
  if (texto.length < 3) throw new ErroDominio("VALIDATION_ERROR", { campos: ["pedido"] });
  // O contexto vem antes do modelo: quem não pode mudar nem chega a gastar uma chamada.
  const ctx = await banco.rpc<ContextoMontar>("portal_automacao_ia_contexto", { ...quem, p_id: id });
  if (!ia?.montar) throw new ErroDominio("UPSTREAM_UNAVAILABLE", { motivo: "IA_INDISPONIVEL" });
  const saida = await ia.montar({ instrucoes: instrucoesMontar(ctx), mensagens: [{ role: "user", content: texto }] });
  if (!saida) throw new ErroDominio("UPSTREAM_UNAVAILABLE", { motivo: "IA_INDISPONIVEL" });
  const gatilho = ctx.atual?.gatilho ?? saida.gatilho;
  if (!saida.entendeu || !gatilho || !ctx.gatilhos.includes(gatilho)) {
    registrar("aviso", { funcao: "montar", evento: "nao_entendeu" });
    throw new ErroDominio("VALIDATION_ERROR", {
      campos: ["pedido"], motivo: "NAO_ENTENDEU",
      porque: (saida.porque ?? "").slice(0, 300) || "Não deu para montar com os gatilhos das suas áreas.",
    });
  }
  const { fluxo, ids } = fluxoDaSaida(saida, gatilho, ctx);
  const feito = saida.feito
    .filter((f) => f.texto.trim())
    .slice(0, 8)
    .map((f) => ({ texto: f.texto.trim().slice(0, 300), passo: (f.ref && ids.get(f.ref)) || null }));
  return await banco.rpc<PaginaAutomacao>("portal_automacao_ia_sugerir", {
    ...quem,
    p_id: id,
    p_dados: {
      pedido: texto, gatilho, nome: (saida.nome ?? "").trim().slice(0, 80), fluxo, feito,
      alertas: alertasDaSugestao(ctx, gatilho, fluxo),
      experimente: saida.experimente.map((x) => x.trim()).filter(Boolean).slice(0, 3),
    },
  });
}
