import type { Metadata } from "next";
import { ConversasEmPreparo } from "@t3jus/ui";

// Automações (desenho aprovado); entra com a próxima parte de Conversas.
export const metadata: Metadata = { title: "Automações" };

export default function Pagina() {
  return <ConversasEmPreparo secao="automacoes" />;
}
