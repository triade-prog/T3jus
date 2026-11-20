import type { Metadata } from "next";
import { ImportarPlanilha } from "@t3jus/ui";

// Importar planilha, passo 1 (F3.55, VA-05), tela aprovada em docs/design/aprovadas/portal-importacao.
// ?modelo=1 abre a janela das colunas da planilha-modelo.
export const metadata: Metadata = { title: "Importar planilha" };

export default async function Pagina({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  return <ImportarPlanilha modelo={q.modelo === "1"} />;
}
