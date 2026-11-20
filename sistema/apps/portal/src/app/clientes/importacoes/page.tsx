import type { Metadata } from "next";
import { ImportacoesHistorico } from "@t3jus/ui";

// As importações do escritório, com o desfazer de 7 dias (F3.55, VA-05).
export const metadata: Metadata = { title: "Importações" };

export default function Pagina() {
  return <ImportacoesHistorico />;
}
