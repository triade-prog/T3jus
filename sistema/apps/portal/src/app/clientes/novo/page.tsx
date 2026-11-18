import type { Metadata } from "next";
import { NovoClientePortal } from "@t3jus/ui";

// Novo cliente (AP-01): o mínimo é nome e um telefone ou e-mail; a qualificação pode ficar para depois.
export const metadata: Metadata = { title: "Novo cliente" };

export default function Pagina() {
  return <NovoClientePortal />;
}
