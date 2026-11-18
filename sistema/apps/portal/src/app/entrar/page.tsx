import type { Metadata } from "next";
import { Entrar, TelaAcesso } from "@t3jus/ui";
import { TEXTOS_ACESSO, TEXTOS_ENTRAR } from "../../acesso";

export const metadata: Metadata = { title: "Entrar" };

export default function Pagina() {
  return (
    <TelaAcesso textos={TEXTOS_ACESSO}>
      <Entrar textos={TEXTOS_ENTRAR} />
    </TelaAcesso>
  );
}
