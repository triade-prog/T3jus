import type { Metadata } from "next";
import { CobrancaConsole } from "@t3jus/ui";

// Cobrança dos escritórios (CO-06), telas aprovadas em docs/design/aprovadas/console-cobranca:
// as faturas de todos os escritórios. Quem vê e quem muda o banco confere pela sessão.

export const metadata: Metadata = { title: "Cobrança" };

export default async function Pagina({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  return <CobrancaConsole aba="faturas" situacao={typeof q.situacao === "string" ? q.situacao : undefined} />;
}
