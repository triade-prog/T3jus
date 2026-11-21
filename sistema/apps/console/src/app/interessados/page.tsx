import type { Metadata } from "next";
import { ListaInteressadosConsole } from "@t3jus/ui";

// Comercial › Interessados (F2.3, SC-05), tela aprovada em
// docs/design/aprovadas/site-comercial/interessados.html. Administração e Implantação: a API
// recusa quem não tem console.interessados.ver.

export const metadata: Metadata = { title: "Interessados" };

export default function Pagina() {
  return <ListaInteressadosConsole />;
}
