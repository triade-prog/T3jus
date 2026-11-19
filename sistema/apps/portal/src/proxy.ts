// Proxy (antigo middleware): gera um nonce por requisição e grava a CSP e os cabeçalhos de
// segurança (F0.8). O nonce exige renderização dinâmica das páginas.
import { NextResponse, type NextRequest } from "next/server";
import { cabecalhosSeguranca, gerarNonce, montarCsp } from "@t3jus/servidor/cabecalhos";

export function proxy(request: NextRequest) {
  const nonce = gerarNonce();
  // O Storage entra em connect-src para o envio direto dos documentos dos casos (EX-05).
  const csp = montarCsp({ nonce, dev: process.env.NODE_ENV === "development", conectar: [process.env.ARQUIVOS_ORIGEM ?? ""] });

  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("content-security-policy", csp);

  const resposta = NextResponse.next({ request: { headers } });
  resposta.headers.set("content-security-policy", csp);
  for (const [k, v] of Object.entries(cabecalhosSeguranca("portal", request.nextUrl.pathname))) resposta.headers.set(k, v);
  return resposta;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
