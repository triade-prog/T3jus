import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ABAS_COBRANCA, CobrancaConsole, ehAbaCobranca } from "@t3jus/ui";

// Cobrança › Planos e Régua de cobrança (CO-06). As faturas ficam em /cobranca.

export async function generateMetadata({ params }: { params: Promise<{ aba: string }> }): Promise<Metadata> {
  const { aba } = await params;
  return { title: ehAbaCobranca(aba) ? `${ABAS_COBRANCA[aba]} · Cobrança` : "Cobrança" };
}

export default async function Pagina({ params }: { params: Promise<{ aba: string }> }) {
  const { aba } = await params;
  if (!ehAbaCobranca(aba) || aba === "faturas") notFound();
  return <CobrancaConsole aba={aba} />;
}
