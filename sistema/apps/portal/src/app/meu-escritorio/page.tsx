import type { Metadata } from "next";
import { EscritorioDoPortal } from "@t3jus/ui";

// Área Escritório (F1.7), tela aprovada: docs/design/aprovadas/portal-v1/escritorio.html.
// O endereço /escritorio é a escolha do escritório depois de entrar; por isso este mora aqui.
export const metadata: Metadata = { title: "Escritório" };

export default function Pagina() {
  return <EscritorioDoPortal />;
}
