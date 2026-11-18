import type { Metadata } from "next";
import { EscolherEscritorio, TelaAcesso } from "@t3jus/ui";
import { TEXTOS_ACESSO } from "../../acesso";

// Escolha do escritório, depois de entrar. Tela aprovada: docs/design/aprovadas/acesso/.
export const metadata: Metadata = { title: "Qual escritório?" };

export default function Pagina() {
  return (
    <TelaAcesso textos={TEXTOS_ACESSO}>
      <EscolherEscritorio destino="/" />
    </TelaAcesso>
  );
}
