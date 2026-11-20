import type { Metadata } from "next";
import { ResultadoImportacao } from "@t3jus/ui";

// O resultado de uma importação: o que entrou, as linhas de fora e o desfazer (F3.55, VA-05).
export const metadata: Metadata = { title: "Importação" };

export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ResultadoImportacao id={id} />;
}
