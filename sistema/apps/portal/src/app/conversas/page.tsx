import type { Metadata } from "next";
import { ConversasPortal } from "@t3jus/ui";

// Conversas do Portal, Mensagens (PD-07, EX-10, AP-02), tela aprovada em
// docs/design/aprovadas/portal-agenda-conversas. A conversa aberta, o filtro e a busca vêm do
// endereço (?c=, ?mostrar=, ?q=) e são lidos na tela.
export const metadata: Metadata = { title: "Conversas" };

export default function Pagina() {
  return <ConversasPortal />;
}
