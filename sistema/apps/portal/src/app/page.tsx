import type { Metadata } from "next";
import { PaginaComumPortal } from "@t3jus/ui";

// Início do Portal, dentro da moldura em áreas (PA-01). O Início com dados vem depois.
export const metadata: Metadata = { title: "Início" };

export default function Pagina() {
  return <PaginaComumPortal lugar="inicio" />;
}
