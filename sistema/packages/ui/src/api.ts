// Chamadas da tela para a própria API do app (/api, repassada à Edge Function). A tela nunca
// mostra a mensagem crua: traduz o código do erro (e o motivo, quando houver).

import { ehCodigoErro, TEXTOS_ERRO, TEXTOS_MOTIVO, type CodigoErro } from "@t3jus/domain";

export interface ErroApi {
  codigo: CodigoErro;
  detalhes?: Record<string, unknown>;
}

export type Resposta<T> = { ok: true; dados: T } | { ok: false; status: number; erro: ErroApi };

export async function chamarApi<T>(
  caminho: string,
  opcoes: {
    metodo?: "GET" | "POST" | "PUT" | "PATCH"; corpo?: unknown; sinal?: AbortSignal; buscar?: typeof fetch;
    /** Um arquivo, enviado como está (application/octet-stream), no lugar do JSON. */
    bruto?: Blob;
  } = {},
): Promise<Resposta<T>> {
  const buscar = opcoes.buscar ?? fetch;
  const temCorpo = opcoes.corpo !== undefined || opcoes.bruto !== undefined;
  let r: Response;
  try {
    r = await buscar(`/api${caminho}`, {
      method: opcoes.metodo ?? (temCorpo ? "POST" : "GET"),
      headers: opcoes.bruto ? { "content-type": "application/octet-stream" } : temCorpo ? { "content-type": "application/json" } : undefined,
      body: opcoes.bruto ?? (opcoes.corpo === undefined ? undefined : JSON.stringify(opcoes.corpo)),
      credentials: "same-origin",
      cache: "no-store",
      signal: opcoes.sinal,
    });
  } catch {
    return { ok: false, status: 0, erro: { codigo: "UPSTREAM_UNAVAILABLE" } };
  }
  const corpo = (await r.json().catch(() => null)) as { erro?: ErroApi } | null;
  if (r.ok) return { ok: true, dados: corpo as T };
  const e = corpo?.erro;
  return {
    ok: false,
    status: r.status,
    erro: e && ehCodigoErro(e.codigo) ? e : { codigo: r.status >= 500 ? "INTERNAL_ERROR" : "VALIDATION_ERROR" },
  };
}

/** O texto que a pessoa lê: o motivo da recusa, se houver, ou o texto do código. */
export function textoDoErro(e: ErroApi): string {
  const motivo = e.detalhes?.motivo;
  return (typeof motivo === "string" && TEXTOS_MOTIVO[motivo]) || TEXTOS_ERRO[e.codigo];
}
