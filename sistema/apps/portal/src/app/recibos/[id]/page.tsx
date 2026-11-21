import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReciboImprimir } from "@t3jus/ui";

// O recibo de um recebimento em A4 (FI-14), para imprimir ou salvar em PDF pelo navegador. O id
// é o do recebimento. A área (Financeiro ou Contratos) diz por onde a pessoa entrou e para onde
// "Voltar ao contrato" leva; o servidor confere a área e o escritório da sessão.
export const metadata: Metadata = { title: "Recibo" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Pagina({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ area?: string }> }) {
  const { id } = await params;
  const area = ((await searchParams).area ?? "financeiro").toUpperCase();
  if (!UUID.test(id) || (area !== "FINANCEIRO" && area !== "CONTRATOS")) notFound();
  return <ReciboImprimir id={id.toLowerCase()} area={area} />;
}
