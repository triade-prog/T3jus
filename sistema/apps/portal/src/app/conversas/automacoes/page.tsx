import type { Metadata } from "next";
import { AutomacoesPortal } from "@t3jus/ui";

// Conversas › Automações (PA-03), desenho aprovado em docs/design/aprovadas/portal-conversas-automacoes.
export const metadata: Metadata = { title: "Automações" };

export default function Pagina() {
  return <AutomacoesPortal />;
}
