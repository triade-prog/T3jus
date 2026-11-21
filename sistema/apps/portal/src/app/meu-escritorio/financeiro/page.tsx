import type { Metadata } from "next";
import { AjustesDoFinanceiro } from "@t3jus/ui";

// Escritório › Ajustes do financeiro (F3.50), tela aprovada em
// docs/design/aprovadas/portal-comercial-financeiro-pendencias: o contador, o saldo de abertura,
// o prazo para repassar e a meta. Só a sócia dona muda; o servidor confere de novo.
export const metadata: Metadata = { title: "Ajustes do financeiro" };

export default function Pagina() {
  return <AjustesDoFinanceiro />;
}
