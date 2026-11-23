import type { Metadata } from "next";
import { AdvogadosDocumentosPagina } from "@t3jus/ui";

// Escritório › Advogados nos documentos (PA-07), tela aprovada:
// docs/design/aprovadas/escritorio-dados-documentos/escritorio.html (estado escritorio-advogados).
export const metadata: Metadata = { title: "Advogados nos documentos" };

export default function Pagina() {
  return <AdvogadosDocumentosPagina />;
}
