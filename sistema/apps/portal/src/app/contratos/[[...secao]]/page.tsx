import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ContratosPortal, FichaContratoPortal, GerarDocumentosPortal, HonorariosContratosPortal, LembretesContratoPortal, ModelosDocumentoPortal, MudarContratoPortal,
  NovoContratoPortal, ProcuracoesContratosPortal,
} from "@t3jus/ui";

// Área Contratos do Portal (CH-01 a CH-04, CH-06, IN-01): Contratos (lista, novo, ficha com
// abas e mudar), Honorários e Procurações e modelos (CH-08, F3.16: lista, modelos de documento e
// gerar). Lembretes de contrato (F3.144): o que ficou em aberto no sistema antigo; "Criar o
// contrato" abre o contrato novo com ?cliente=. O escritório vem da sessão; um contrato de outro escritório responde como não
// encontrado. A tela confere a área; o servidor confere de novo.
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
  if (secao === "modelos") {
    if (!a) return <ProcuracoesContratosPortal />;
    if (a === "modelos" && !b) return <ModelosDocumentoPortal />;
    if (a === "gerar" && !b) {
      const c = (await searchParams).contrato;
      return <GerarDocumentosPortal contrato={typeof c === "string" && UUID.test(c) ? c.toLowerCase() : null} />;
    }
  }
  if (secao === "contratos") {
    if (!a) return <ContratosPortal />;
    if (a === "lembretes" && !b) return <LembretesContratoPortal />;
    if (a === "novo" && !b) {
      const { proposta: p, cliente: c } = await searchParams;
      return <NovoContratoPortal propostaId={typeof p === "string" && UUID.test(p) ? p.toLowerCase() : null}
        clienteId={typeof c === "string" && UUID.test(c) ? c.toLowerCase() : null} />;
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
