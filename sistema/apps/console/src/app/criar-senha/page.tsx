import type { Metadata } from "next";
import { CriarSenha, TelaAcesso } from "@t3jus/ui";
import { TEXTOS_ACESSO, TEXTOS_CONVITE } from "../../acesso";

// Volta do link do convite (?token_hash=...). Tela aprovada: docs/design/aprovadas/acesso/.
export const metadata: Metadata = { title: "Criar senha" };

export default function Pagina() {
  return (
    <TelaAcesso textos={TEXTOS_ACESSO} denso>
      <CriarSenha textos={TEXTOS_CONVITE} />
    </TelaAcesso>
  );
}
