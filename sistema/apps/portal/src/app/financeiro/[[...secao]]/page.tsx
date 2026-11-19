import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PaginaAreaPortal, ParcelasContratoFinanceiro, ReceberFinanceiro, SECOES_AREA } from "@t3jus/ui";

// Área Financeiro do Portal. A receber (FI-01 a FI-04, FI-14, FI-17): a lista e as parcelas de
// um contrato. As outras seções (Resumo, A pagar, Repasses, Caixa) ainda estão em preparo. O
// escritório vem da sessão; um contrato de outro escritório responde como não encontrado. A tela
// confere a área; o servidor confere de novo.
export const metadata: Metadata = { title: "Financeiro" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Pagina({ params }: { params: Promise<{ secao?: string[] }> }) {
  const s = (await params).secao ?? [];
  const [secao, a, b] = s;
  if (s.length > 3) notFound();
  if (secao === "a-receber") {
    if (!a) return <ReceberFinanceiro />;
    if (a === "contratos" && b && UUID.test(b)) return <ParcelasContratoFinanceiro id={b.toLowerCase()} />;
    notFound();
  }
  if (s.length > 1) notFound();
  if (secao && !SECOES_AREA.FINANCEIRO.some((x) => x.chave === secao)) notFound();
  return <PaginaAreaPortal area="FINANCEIRO" secao={secao} />;
}
