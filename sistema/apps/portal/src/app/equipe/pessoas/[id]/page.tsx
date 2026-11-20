import type { Metadata } from "next";
import { EquipePessoaPortal } from "@t3jus/ui";

// Ficha da pessoa na Equipe, com a OAB (EX-12), tela aprovada:
// docs/design/aprovadas/portal-equipe-oab/equipe.html. Só a sócia dona; a API confere.
export const metadata: Metadata = { title: "Pessoa da equipe" };

export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EquipePessoaPortal pessoaId={id} />;
}
