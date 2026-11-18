// Contratos de entrada da API (PT-17), validados no servidor. O mesmo esquema serve às telas.

import { z } from "zod";

const email = z.string().trim().toLowerCase().max(254).email();

export const entrarSchema = z.object({
  email,
  senha: z.string().min(1).max(200),
  /** Desmarcado: a sessão acaba quando o navegador fecha. Sem o campo, mantém (12 h). */
  manterConectado: z.boolean().optional(),
});

export const codigoAutenticadorSchema = z.object({
  codigo: z.string().regex(/^\d{6}$/),
  factorId: z.string().uuid().optional(),
});

export const recuperarSenhaSchema = z.object({ email });

/** Pedido do link de acesso por e-mail (entrar sem senha). */
export const pedirLinkAcessoSchema = z.object({ email, manterConectado: z.boolean().optional() });

/** O link de acesso volta com o token_hash, de uso único. */
export const usarLinkAcessoSchema = z.object({
  tokenHash: z.string().min(16).max(200).regex(/^[A-Za-z0-9_-]+$/),
  manterConectado: z.boolean().optional(),
});

/**
 * Senha nova pelo link do e-mail: o token_hash (modelo de e-mail próprio) ou o access_token que
 * o modelo padrão do Supabase devolve depois do # no endereço. Um dos dois, nunca os dois.
 */
export const redefinirSenhaSchema = z
  .object({
    tokenHash: z.string().min(16).max(200).regex(/^[A-Za-z0-9_-]+$/).optional(),
    accessToken: z.string().max(4000).regex(/^[\w-]+\.[\w-]+\.[\w-]+$/).optional(),
    novaSenha: z.string().min(12).max(200),
  })
  .refine((d) => !d.tokenHash !== !d.accessToken, { message: "Link incompleto", path: ["tokenHash"] });

export const escolherEscritorioSchema = z.object({
  escritorioId: z.string().uuid(),
});
