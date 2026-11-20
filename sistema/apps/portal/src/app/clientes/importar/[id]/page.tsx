import type { Metadata } from "next";
import { ImportarPlanilha } from "@t3jus/ui";

// Importar planilha, passos 2 (as colunas) e 3 (a prévia) de uma importação já começada (F3.55).
export const metadata: Metadata = { title: "Importar planilha" };

export default async function Pagina({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const q = await searchParams;
  return <ImportarPlanilha id={id} passo={q.passo === "previa" ? "previa" : "colunas"} />;
}
