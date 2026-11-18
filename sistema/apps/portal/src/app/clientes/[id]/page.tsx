import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FichaClientePortal } from "@t3jus/ui";

// Ficha do cliente (AP-01, AP-02, AP-06): abas Ficha e Atendimentos (só com a área Comercial).
// O escritório vem da sessão; um id de outro escritório responde como não encontrado.
export const metadata: Metadata = { title: "Ficha do cliente" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Pagina({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const q = await searchParams;
  return (
    <FichaClientePortal id={id.toLowerCase()} aba={q.aba === "atendimentos" ? "atendimentos" : "ficha"} editarAoAbrir={q.editar === "1"}
      cadastrado={q.cadastrado === "1"} />
  );
}
