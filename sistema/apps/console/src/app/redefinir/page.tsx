import type { Metadata } from "next";
import { NovaSenha, TelaAcesso } from "@t3jus/ui";
import { TEXTOS_ACESSO, TEXTOS_NOVA_SENHA } from "../../acesso";

// Volta do link de "Esqueci a senha" (?token_hash=...). Tela aprovada: docs/design/aprovadas/acesso/.
export const metadata: Metadata = { title: "Nova senha" };

export default function Pagina() {
  return (
    <TelaAcesso textos={TEXTOS_ACESSO}>
      <NovaSenha textos={TEXTOS_NOVA_SENHA} />
    </TelaAcesso>
  );
}
