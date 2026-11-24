import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FichaClientePortal, lerVoltaDeGerar, type AbaCliente } from "@t3jus/ui";

const ABAS: AbaCliente[] = ["atendimentos", "propostas", "contratos", "casos"];

// Ficha do cliente (AP-01, AP-02, AP-06, F3.110): abas Ficha, Atendimentos (Comercial), Propostas
// (Comercial), Contratos (Contratos) e Casos (Jurídico); a ficha só mostra a aba de quem tem a área.
// O escritório vem da sessão; um id de outro escritório responde como não encontrado. Vindo de Gerar
// documentos (F3.160), o endereço só traz de=gerar, o UUID do contrato e a parte (lista fixa); a
// volta é sempre montada pela tela, nunca lida do endereço.
export const metadata: Metadata = { title: "Ficha do cliente" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Pagina({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const q = await searchParams;
  return (
    <FichaClientePortal id={id.toLowerCase()} aba={ABAS.find((a) => a === q.aba) ?? "ficha"} editarAoAbrir={q.editar === "1"}
      cadastrado={q.cadastrado === "1"} termo={typeof q.termo === "string" ? q.termo : null}
      termoTipo={typeof q.termoTipo === "string" ? q.termoTipo : null} volta={lerVoltaDeGerar(q)} />
  );
}
