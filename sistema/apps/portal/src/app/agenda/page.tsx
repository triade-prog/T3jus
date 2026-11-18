import type { Metadata } from "next";
import { PaginaComumPortal } from "@t3jus/ui";

// Agenda do Portal: por enquanto, a moldura e o que vem (PA-01).
export const metadata: Metadata = { title: "Agenda" };

export default function Pagina() {
  return <PaginaComumPortal lugar="agenda" />;
}
