import type { Metadata } from "next";
import { ImportarAdvbox } from "@t3jus/ui";

// Importar do ADVBOX pela planilha exportada, passo 1 (F3.56), tela aprovada em
// docs/design/aprovadas/portal-importacao-sistemas.
export const metadata: Metadata = { title: "Importar do ADVBOX" };

export default function Pagina() {
  return <ImportarAdvbox />;
}
