import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ABAS_FICHA, ehAbaFicha, FichaCliente } from "@t3jus/ui";

// Ficha do cliente (CO-02), tela aprovada: docs/design/aprovadas/console-ficha.html. O id vai
// para a API, que confere no banco se o cliente está atribuído a quem está usando (PT-24).

export async function generateMetadata({ params }: { params: Promise<{ aba: string }> }): Promise<Metadata> {
  const { aba } = await params;
  return { title: ehAbaFicha(aba) ? `${ABAS_FICHA[aba]} · Ficha do escritório` : "Ficha do escritório" };
}

export default async function Pagina({ params }: { params: Promise<{ id: string; aba: string }> }) {
  const { id, aba } = await params;
  if (!ehAbaFicha(aba) || !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  return <FichaCliente id={id} aba={aba} />;
}
