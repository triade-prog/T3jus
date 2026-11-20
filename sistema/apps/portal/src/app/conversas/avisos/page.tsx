import type { Metadata } from "next";
import { ConversasEmPreparo } from "@t3jus/ui";

// Avisos automáticos (desenho aprovado); entra com a próxima parte de Conversas.
export const metadata: Metadata = { title: "Avisos automáticos" };

export default function Pagina() {
  return <ConversasEmPreparo secao="avisos" />;
}
