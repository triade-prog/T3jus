import type { Metadata } from "next";
import { ContaPortalPagina } from "@t3jus/ui";

// Sua conta: os próprios dados e a OAB, só para ler (EX-12, decisão 7), tela aprovada:
// docs/design/aprovadas/portal-equipe-oab/conta.html. A pessoa vem da sessão no servidor.
export const metadata: Metadata = { title: "Sua conta" };

export default function Pagina() {
  return <ContaPortalPagina />;
}
