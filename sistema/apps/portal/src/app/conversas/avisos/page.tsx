import type { Metadata } from "next";
import { AvisosAutomaticosPortal } from "@t3jus/ui";

// Conversas › Avisos automáticos (F3.64), tela aprovada em docs/design/aprovadas/portal-conversas-automacoes.
export const metadata: Metadata = { title: "Avisos automáticos" };

export default function Pagina() {
  return <AvisosAutomaticosPortal />;
}
