import type { Metadata } from "next";
import { ImportarDados, ImportarPlanilha } from "@t3jus/ui";

// Importar dados (F3.55, F3.56; VA-05). A sócia dona escolhe a origem (planilha, Astrea ou
// ADVBOX); os outros vão direto à planilha. ?origem=planilha abre a planilha; ?modelo=1 abre a
// janela das colunas da planilha-modelo.
export const metadata: Metadata = { title: "Importar dados" };

export default async function Pagina({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  if (q.origem === "planilha" || q.modelo === "1") return <ImportarPlanilha modelo={q.modelo === "1"} />;
  return <ImportarDados />;
}
