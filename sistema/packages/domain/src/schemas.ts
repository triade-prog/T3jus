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

const tokenHash = z.string().min(16).max(200).regex(/^[A-Za-z0-9_-]+$/);

/** A tela de nova senha ou do convite abre o link do e-mail (token_hash, de uso único). */
export const abrirLinkSenhaSchema = z.object({ tokenHash });

/**
 * Senha nova pelo link do e-mail. Pela tela, o link já foi aberto e fica num cookie do
 * servidor; o token_hash ou o access_token (modelo padrão do Supabase, depois do # no
 * endereço) ainda valem no corpo. Nunca os dois.
 */
export const redefinirSenhaSchema = z
  .object({
    tokenHash: tokenHash.optional(),
    accessToken: z.string().max(4000).regex(/^[\w-]+\.[\w-]+\.[\w-]+$/).optional(),
    novaSenha: z.string().min(12).max(200),
  })
  .refine((d) => !(d.tokenHash && d.accessToken), { message: "Link duplicado", path: ["tokenHash"] });

/** Convite aceito (PT-20): senha, o nome confirmado e o aceite dos Termos. */
export const criarSenhaSchema = z
  .object({
    tokenHash: tokenHash.optional(),
    accessToken: z.string().max(4000).regex(/^[\w-]+\.[\w-]+\.[\w-]+$/).optional(),
    novaSenha: z.string().min(12).max(200),
    nome: z.string().trim().min(1).max(120),
    aceiteTermos: z.literal(true),
  })
  .refine((d) => !(d.tokenHash && d.accessToken), { message: "Link duplicado", path: ["tokenHash"] });

export const escolherEscritorioSchema = z.object({
  escritorioId: z.string().uuid(),
});
