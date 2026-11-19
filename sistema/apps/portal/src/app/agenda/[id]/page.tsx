import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FichaCompromissoPortal } from "@t3jus/ui";

// Ficha do compromisso (PT-25, EX-11, PT-03). O escritório vem da sessão; um id de outro
// escritório responde como não encontrado.
export const metadata: Metadata = { title: "Compromisso" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  return <FichaCompromissoPortal id={id.toLowerCase()} />;
}
