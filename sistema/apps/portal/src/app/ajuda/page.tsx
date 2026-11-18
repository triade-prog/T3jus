import type { Metadata } from "next";
import { PaginaComumPortal } from "@t3jus/ui";

// Ajuda do Portal: por enquanto, a moldura e o que vem (PA-01).
export const metadata: Metadata = { title: "Ajuda" };

export default function Pagina() {
  return <PaginaComumPortal lugar="ajuda" />;
}
