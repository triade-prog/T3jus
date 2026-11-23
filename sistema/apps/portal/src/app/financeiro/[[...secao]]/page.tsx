import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CaixaDoFinanceiro, EmprestimoFinanceiro, PagarFinanceiro, ParcelasContratoFinanceiro, RecorrenteFinanceiro, ReceberFinanceiro, RelatoriosFinanceiro, RepasseFinanceiro, RepassesFinanceiro, ResumoDoFinanceiro } from "@t3jus/ui";

// Área Financeiro do Portal. A receber (FI-01 a FI-04, FI-14, FI-17): a lista e as parcelas de
// um contrato. A pagar (FI-01, FI-02, FI-07, FI-13, FI-20) e a ficha da conta que repete. Repasses (FI-05, FI-06, FI-12): a
// lista e a ficha de um repasse. Resumo (FI-03, PD-03, PD-06, IN-02 a IN-14) e Caixa (FI-09, FI-21), com a ficha de cada empréstimo (FI-20).
// Relatórios do sócio (F3.70, IN-15): visão geral, por cliente, um cliente, por área e por
// responsável; só a sócia dona (a tela confere e o servidor confere de novo). O
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
  if (secao === "a-pagar") {
    if (!a) return <PagarFinanceiro />;
    // A ficha de uma conta que repete todo mês (F3.24, FI-13).
    if (a === "recorrentes" && b && UUID.test(b)) return <RecorrenteFinanceiro id={b.toLowerCase()} />;
    notFound();
  }
  if (secao === "repasses") {
    if (!a) return <RepassesFinanceiro />;
    if (UUID.test(a) && !b) return <RepasseFinanceiro id={a.toLowerCase()} />;
    notFound();
  }
  if (secao === "caixa" && s.length === 1) return <CaixaDoFinanceiro />;
  // A ficha de um empréstimo (F3.51, FI-20).
  if (secao === "caixa" && a === "emprestimos" && b && UUID.test(b)) return <EmprestimoFinanceiro id={b.toLowerCase()} />;
  if (secao === "relatorios") {
    if (!a) return <RelatoriosFinanceiro visao="visao" />;
    if (a === "clientes" && !b) return <RelatoriosFinanceiro visao="clientes" />;
    if (a === "clientes" && b && UUID.test(b)) return <RelatoriosFinanceiro visao="cliente" cliente={b.toLowerCase()} />;
    if ((a === "areas" || a === "responsaveis") && !b) return <RelatoriosFinanceiro visao={a} />;
    notFound();
  }
  if (s.length === 0 || (secao === "resumo" && s.length === 1)) return <ResumoDoFinanceiro />;
  notFound();
}
