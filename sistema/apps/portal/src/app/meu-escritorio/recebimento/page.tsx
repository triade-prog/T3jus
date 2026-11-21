import type { Metadata } from "next";
import { RecebimentoPortal } from "@t3jus/ui";

// Escritório › Recebimento (FI-23), tela aprovada em docs/design/aprovadas/portal-carne: a chave
// Pix do escritório e as instruções de pagamento que vão no carnê. Só a sócia dona muda; o
// servidor confere de novo.
export const metadata: Metadata = { title: "Recebimento" };

export default function Pagina() {
  return <RecebimentoPortal />;
}
