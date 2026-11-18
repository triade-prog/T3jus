import type { Metadata } from "next";
import { Carteira } from "@t3jus/ui";

// Carteira de escritórios (CO-01), tela aprovada: docs/design/aprovadas/console-carteira.html.
export const metadata: Metadata = { title: "Carteira de escritórios" };

export default function Pagina() {
  return <Carteira />;
}
