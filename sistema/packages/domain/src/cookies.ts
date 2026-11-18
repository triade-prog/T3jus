// Cookies de sessão (F0.6). A api de cada sistema grava e lê; o repasse /api de cada app
// só deixa passar estes. Um lugar só, para a lista do repasse nunca ficar para trás.

/** Portal do advogado: sessão do Supabase Auth (tokens empacotados). */
export const COOKIES_PORTAL = {
  sessao: "__Host-portal",
  /** Link de nova senha ou convite já aberto: vale 1 hora, até a senha nova ser salva. */
  link: "__Host-portal-link",
} as const;

/** Console T3jus: sessão da equipe, em aal1 até o código do autenticador. */
export const COOKIES_CONSOLE = {
  sessao: "__Host-console",
  link: "__Host-console-link",
} as const;
