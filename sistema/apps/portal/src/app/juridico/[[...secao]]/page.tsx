import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CasosJuridicoPortal, FichaCasoPortal, NovoCasoPortal, PrazosJuridicoPortal, TarefasJuridicoPortal } from "@t3jus/ui";
import { paginaDa } from "../../_area/pagina";

// Área Jurídico do Portal (EX-01, EX-03, EX-07, EX-14): Casos e processos (lista, novo caso e
// ficha com mudar etapa), Prazos e Tarefas (EX-02, EX-04). Petições ainda em preparo. O escritório vem da
// sessão; um caso de outro escritório responde como não encontrado. A tela confere a área; o
// servidor confere de novo.
export const metadata: Metadata = { title: "Jurídico" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Pagina({ params }: { params: Promise<{ secao?: string[] }> }) {
  const s = (await params).secao ?? [];
  const [secao = "casos", a] = s;
  if (secao === "casos") {
    if (s.length > 2) notFound();
    if (!a) return <CasosJuridicoPortal />;
    if (a === "novo") return <NovoCasoPortal />;
    if (UUID.test(a)) return <FichaCasoPortal id={a.toLowerCase()} />;
    notFound();
  }
  if (secao === "prazos" && s.length === 1) return <PrazosJuridicoPortal />;
  if (secao === "tarefas" && s.length === 1) return <TarefasJuridicoPortal />;
  return paginaDa("JURIDICO", params);
}
