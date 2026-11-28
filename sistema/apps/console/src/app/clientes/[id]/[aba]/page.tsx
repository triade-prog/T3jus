import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ABAS_FICHA, ehAbaFicha, FichaCliente } from "@t3jus/ui";

// Ficha do cliente (CO-02), telas aprovadas: docs/design/aprovadas/console-ficha.html e console-v1/ficha.html. O id vai
// para a API, que confere no banco se o cliente está atribuído a quem está usando (PT-24).

export async function generateMetadata({ params }: { params: Promise<{ aba: string }> }): Promise<Metadata> {
  const { aba } = await params;
  return { title: ehAbaFicha(aba) ? `${ABAS_FICHA[aba]} · Ficha do escritório` : "Ficha do escritório" };
}

export default async function Pagina({ params, searchParams }: {
  params: Promise<{ id: string; aba: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id, aba } = await params;
  if (!ehAbaFicha(aba) || !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  // Atalhos de outras telas: abrir a ficha já editando, a janela de mudar o estágio ou o aviso
  // de escritório recém-cadastrado; na aba Implantação, a janela de concluir.
  const q = await searchParams;
  return <FichaCliente id={id} aba={aba} editar={q.editar === "1"} mudar={q.mudar === "1"} cadastrado={q.cadastrado === "1"} consulta={q.consulta === "1"} concluir={q.concluir === "1"} />;
}
