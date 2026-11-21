import type { Metadata } from "next";
import { FichaInteressadoConsole } from "@t3jus/ui";

// Ficha do interessado (F2.3, SC-05): o pedido como chegou, a autorização, notas, histórico,
// responsável, próximo passo e virar escritório cliente.

export const metadata: Metadata = { title: "Interessado" };

export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FichaInteressadoConsole id={id} />;
}
