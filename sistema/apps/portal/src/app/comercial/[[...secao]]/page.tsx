import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  AtendimentosComercial, EditarPropostaPortal, FichaPropostaPortal, FunilComercial, NovaPropostaPortal, OrigemComercial, PropostasComercial,
} from "@t3jus/ui";

// Área Comercial do Portal (AP-02 a AP-06, PD-02): Atendimentos, Propostas (lista, nova, ficha
// e editar), Funil e Origem dos contatos. O escritório vem da sessão; uma proposta de outro
// escritório responde como não encontrada. A tela confere a área; o servidor confere de novo.
export const metadata: Metadata = { title: "Comercial" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Pagina({ params, searchParams }: {
  params: Promise<{ secao?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const s = (await params).secao ?? [];
  const [secao = "atendimentos", a, b] = s;
  if (s.length > 3) notFound();
  if (secao === "atendimentos" && s.length <= 1) return <AtendimentosComercial />;
  if (secao === "funil" && s.length === 1) return <FunilComercial />;
  if (secao === "origem" && s.length === 1) return <OrigemComercial />;
  if (secao === "propostas") {
    if (!a) return <PropostasComercial />;
    if (a === "nova" && !b) {
      const c = (await searchParams).cliente;
      return <NovaPropostaPortal clienteId={typeof c === "string" && UUID.test(c) ? c.toLowerCase() : null} />;
    }
    if (UUID.test(a) && !b) return <FichaPropostaPortal id={a.toLowerCase()} />;
    if (UUID.test(a) && b === "editar") return <EditarPropostaPortal id={a.toLowerCase()} />;
  }
  notFound();
}
