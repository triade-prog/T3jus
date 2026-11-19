import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContratosPortal, FichaContratoPortal, HonorariosContratosPortal, MudarContratoPortal, NovoContratoPortal, PaginaAreaPortal } from "@t3jus/ui";

// Área Contratos do Portal (CH-01 a CH-04, CH-06, IN-01): Contratos (lista, novo, ficha com
// abas e mudar), Honorários e Procurações e modelos (ainda em preparo, CH-08). O escritório vem
// da sessão; um contrato de outro escritório responde como não encontrado. A tela confere a
// área; o servidor confere de novo.
export const metadata: Metadata = { title: "Contratos" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ABAS = ["contrato", "recebimentos", "documentos"] as const;

export default async function Pagina({ params, searchParams }: {
  params: Promise<{ secao?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const s = (await params).secao ?? [];
  const [secao = "contratos", a, b] = s;
  if (s.length > 3) notFound();
  if (secao === "honorarios" && s.length === 1) return <HonorariosContratosPortal />;
  if (secao === "modelos" && s.length === 1) return <PaginaAreaPortal area="CONTRATOS" secao="modelos" />;
  if (secao === "contratos") {
    if (!a) return <ContratosPortal />;
    if (a === "novo" && !b) {
      const p = (await searchParams).proposta;
      return <NovoContratoPortal propostaId={typeof p === "string" && UUID.test(p) ? p.toLowerCase() : null} />;
    }
    if (UUID.test(a) && !b) {
      const x = (await searchParams).aba;
      const aba = ABAS.find((y) => y === x) ?? "contrato";
      return <FichaContratoPortal id={a.toLowerCase()} aba={aba} />;
    }
    if (UUID.test(a) && b === "mudar") return <MudarContratoPortal id={a.toLowerCase()} />;
  }
  notFound();
}
