import type { Metadata } from "next";
import { WhatsappPortal } from "@t3jus/ui";

// Escritório › WhatsApp e IA (PA-04), tela aprovada em docs/design/aprovadas/portal-whatsapp.
// A parte e a seção vêm do endereço (?parte=ia&ia=passar, ?ligar=1, ?aviso=CHAVE) e são lidas na tela.
export const metadata: Metadata = { title: "WhatsApp e IA" };

export default function Pagina() {
  return <WhatsappPortal />;
}
