import type { Metadata } from "next";
import { InicioPortal } from "@t3jus/ui";

// Início do Portal: o dia da pessoa. Por enquanto, os contatos vencidos e de hoje (F1.14, AP-06);
// os outros blocos entram com as áreas deles.
export const metadata: Metadata = { title: "Início" };

export default function Pagina() {
  return <InicioPortal />;
}
