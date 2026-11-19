import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PagarFinanceiro, PaginaAreaPortal, ParcelasContratoFinanceiro, ReceberFinanceiro, RepasseFinanceiro, RepassesFinanceiro, SECOES_AREA } from "@t3jus/ui";

// Área Financeiro do Portal. A receber (FI-01 a FI-04, FI-14, FI-17): a lista e as parcelas de
// um contrato. A pagar (FI-01, FI-02, FI-07, FI-13, FI-20). Repasses (FI-05, FI-06, FI-12): a
// lista e a ficha de um repasse. Resumo e Caixa ainda estão em preparo. O escritório vem da sessão; um contrato de outro escritório responde como não encontrado. A tela
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
  if (secao === "a-pagar" && s.length === 1) return <PagarFinanceiro />;
  if (secao === "repasses") {
    if (!a) return <RepassesFinanceiro />;
    if (UUID.test(a) && !b) return <RepasseFinanceiro id={a.toLowerCase()} />;
    notFound();
  }
  if (s.length > 1) notFound();
  if (secao && !SECOES_AREA.FINANCEIRO.some((x) => x.chave === secao)) notFound();
  return <PaginaAreaPortal area="FINANCEIRO" secao={secao} />;
}
