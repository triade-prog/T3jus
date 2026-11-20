import type { Metadata } from "next";
import { ListaClientesPortal } from "@t3jus/ui";

// Clientes do escritório (AP-01, AP-04, AP-06), tela aprovada em docs/design/aprovadas/portal-clientes.
// Todos da equipe abrem; a API tira o que é da área Comercial de quem não a tem.
export const metadata: Metadata = { title: "Clientes" };

export default async function Pagina({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  const termo = typeof q.q === "string" ? q.q.slice(0, 120) : "";
  const filtro = q.filtro === "inativos" || q.filtro === "vencidos" ? q.filtro : "ativos";
  // ?importacao=…: só os clientes que vieram de uma planilha (F3.55); &juntados=1: os completados.
  const importacao = typeof q.importacao === "string" && /^[0-9a-f-]{36}$/i.test(q.importacao) ? q.importacao : undefined;
  return <ListaClientesPortal termoInicial={termo} filtroInicial={filtro} importacao={importacao} juntados={q.juntados === "1"} />;
}
