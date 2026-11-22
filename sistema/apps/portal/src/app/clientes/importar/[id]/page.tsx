import type { Metadata } from "next";
import { ImportarPlanilha } from "@t3jus/ui";

// Uma importação já começada (F3.55, F3.56): as abas do backup (?passo=abas), as colunas
// (?passo=colunas, com ?aba= vinda das abas) e a prévia (?passo=previa).
export const metadata: Metadata = { title: "Importar dados" };

export default async function Pagina({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const q = await searchParams;
  const passo = q.passo === "previa" ? "previa" : q.passo === "abas" ? "abas" : "colunas";
  const aba = typeof q.aba === "string" && /^[0-9]{1,2}$/.test(q.aba) ? Number(q.aba) : undefined;
  return <ImportarPlanilha id={id} passo={passo} aba={aba} />;
}
