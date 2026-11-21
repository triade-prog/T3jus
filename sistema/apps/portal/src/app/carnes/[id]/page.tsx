import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CarneImprimir } from "@t3jus/ui";

// O carnê de pagamento em A4 (FI-23), para imprimir ou salvar em PDF pelo navegador. A área
// (Financeiro ou Contratos) diz por onde a pessoa entrou; o servidor confere a área e o
// escritório da sessão. Um carnê de outro escritório responde como não encontrado.
export const metadata: Metadata = { title: "Carnê" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Pagina({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ area?: string }> }) {
  const { id } = await params;
  const area = ((await searchParams).area ?? "financeiro").toUpperCase();
  if (!UUID.test(id) || (area !== "FINANCEIRO" && area !== "CONTRATOS")) notFound();
  return <CarneImprimir id={id.toLowerCase()} area={area} />;
}
