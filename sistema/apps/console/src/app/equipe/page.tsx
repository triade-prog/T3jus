import type { Metadata } from "next";
import { EquipeT3jus } from "@t3jus/ui";

// Equipe T3jus (PT-24), tela aprovada: docs/design/aprovadas/console-v1/equipe.html. Só a
// Administração: a API recusa quem não tem console.equipe.gerenciar.

export const metadata: Metadata = { title: "Equipe T3jus" };

export default async function Pagina({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  return <EquipeT3jus aba={q.aba === "historico" ? "historico" : "pessoas"} />;
}
