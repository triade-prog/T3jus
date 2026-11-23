import { deBase64url } from "./cripto.ts";

/** Lê as claims do JWT. Só usar depois que o Auth validou o token. */
export function claimsJwt(token: string): Record<string, unknown> {
  const partes = token.split(".");
  if (partes.length !== 3) throw new Error("JWT inválido");
  return JSON.parse(deBase64url(partes[1]!));
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Quem o token diz ser, ANTES de o Auth validar (F3.136). Serve só para pedir ao banco o
 * contexto ao mesmo tempo que o Auth confere o token; o resultado só vale se o Auth aceitar o
 * token e devolver a mesma pessoa e a mesma sessão. Token fora do formato não vai ao banco.
 */
export function claimsSemValidar(token: string): { pessoaId: string; sessaoId: string } | null {
  try {
    const c = claimsJwt(token);
    if (typeof c.sub !== "string" || typeof c.session_id !== "string") return null;
    if (!UUID.test(c.sub) || !UUID.test(c.session_id)) return null;
    return { pessoaId: c.sub.toLowerCase(), sessaoId: c.session_id.toLowerCase() };
  } catch {
    return null;
  }
}
