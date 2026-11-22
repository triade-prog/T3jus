import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FaturaConsole } from "@t3jus/ui";

// Cobrança › fatura aberta (CO-06). Os ids vão para a API, que confere no banco se o escritório
// está atribuído a quem está usando e se a fatura é dele.

export const metadata: Metadata = { title: "Fatura · Cobrança" };

const UUID = /^[0-9a-f-]{36}$/i;

export default async function Pagina({ params }: { params: Promise<{ escritorio: string; fatura: string }> }) {
  const { escritorio, fatura } = await params;
  if (!UUID.test(escritorio) || !UUID.test(fatura)) notFound();
  return <FaturaConsole escritorioId={escritorio} faturaId={fatura} />;
}
