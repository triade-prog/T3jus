import type { Metadata } from "next";
import { SuporteAcesso } from "@t3jus/ui";

// Suporte de acesso (F1.3, PT-23), tela aprovada: docs/design/aprovadas/console-suporte. Só
// Suporte e Administração; a API recusa quem não tem console.suporte.ver e só mostra pessoas
// dos escritórios que quem busca atende (PT-24).

export const metadata: Metadata = { title: "Suporte de acesso" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Pagina({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  const pessoa = typeof q.pessoa === "string" && UUID.test(q.pessoa) ? q.pessoa : null;
  const termo = typeof q.q === "string" ? q.q.slice(0, 120) : "";
  return <SuporteAcesso key={pessoa ?? "busca"} pessoaId={pessoa} termo={termo} />;
}
