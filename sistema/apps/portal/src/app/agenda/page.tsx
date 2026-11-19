import type { Metadata } from "next";
import { AgendaPortal } from "@t3jus/ui";

// Agenda do escritório (EX-06, EX-11, PD-07), tela aprovada em
// docs/design/aprovadas/portal-agenda-conversas. Uma só, da equipe toda; o filtro por pessoa e a
// visão (mês, semana ou dia) vêm do endereço.
export const metadata: Metadata = { title: "Agenda" };

const DIA = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Pagina({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  const ver = q.ver === "mes" || q.ver === "dia" ? q.ver : "semana";
  const dia = typeof q.dia === "string" && DIA.test(q.dia) ? q.dia : undefined;
  const pessoa = typeof q.pessoa === "string" && UUID.test(q.pessoa) ? q.pessoa.toLowerCase() : null;
  const marcado = typeof q.marcado === "string" && UUID.test(q.marcado) ? q.marcado.toLowerCase() : undefined;
  return <AgendaPortal ver={ver} dia={dia} pessoa={pessoa} marcado={marcado} />;
}
