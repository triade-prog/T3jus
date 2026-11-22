import type { Metadata } from "next";
import { ImportarAstrea } from "@t3jus/ui";

// Importar do Astrea, passo 1: pedir o backup e enviar (F3.56), tela aprovada em
// docs/design/aprovadas/portal-importacao-sistemas.
export const metadata: Metadata = { title: "Importar do Astrea" };

export default function Pagina() {
  return <ImportarAstrea />;
}
