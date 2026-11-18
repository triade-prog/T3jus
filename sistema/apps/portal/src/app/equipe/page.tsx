import type { Metadata } from "next";
import { EquipePortal } from "@t3jus/ui";

// Equipe do escritório (PA-02), tela aprovada: docs/design/aprovadas/portal-v1/equipe.html.
// Só o sócio dono: a API recusa quem não tem escritorio.equipe.gerenciar.
export const metadata: Metadata = { title: "Equipe" };

export default async function Pagina({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  return <EquipePortal aba={q.aba === "historico" ? "historico" : "pessoas"} />;
}
