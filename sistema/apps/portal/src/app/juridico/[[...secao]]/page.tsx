import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  CasosJuridicoPortal, DocumentosInicioJuridicoPortal, EtapasJuridicoPortal, FichaCasoPortal, ModelosPeticaoPortal, NovaPeticaoPortal, NovoCasoPortal, PeticaoPortal, PeticoesJuridicoPortal,
  PrazosJuridicoPortal, TarefasJuridicoPortal, VersaoPeticaoPortal,
} from "@t3jus/ui";
import { paginaDa } from "../../_area/pagina";

// Área Jurídico do Portal (EX-01, EX-03, EX-07, EX-14): Casos e processos (lista, novo caso e
// ficha com mudar etapa), Prazos e Tarefas (EX-02, EX-04), Etapas do escritório (EX-07), Documentos para começar (EX-18) e Petições
// (EX-09: lista, modelos, nova petição, a petição com a revisão e a versão nova). O escritório vem da
// sessão; um caso de outro escritório responde como não encontrado. A tela confere a área; o
// servidor confere de novo.
export const metadata: Metadata = { title: "Jurídico" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const COMOS = { resultado: "RESULTADO", importado: "IMPORTADO", desfeita: "DESFEITA" } as const;

export default async function Pagina({ params, searchParams }: {
  params: Promise<{ secao?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const s = (await params).secao ?? [];
  const [secao = "casos", a] = s;
  if (secao === "casos") {
    if (s.length > 2) notFound();
    if (!a) {
      // F3.143: os Encerrados com "Como encerrou" pela URL (?situacao=ENCERRADO&como=importado).
      const { situacao: si, como: co } = await searchParams;
      const enc = typeof si === "string" && si.toUpperCase() === "ENCERRADO";
      const como = enc && typeof co === "string" ? COMOS[co.toLowerCase() as keyof typeof COMOS] ?? null : null;
      return <CasosJuridicoPortal situacao={enc ? "ENCERRADO" : "ANDAMENTO"} como={como} />;
    }
    if (a === "novo") return <NovoCasoPortal />;
    if (a === "etapas") return <EtapasJuridicoPortal />;
    if (a === "documentos") return <DocumentosInicioJuridicoPortal />;
    if (UUID.test(a)) return <FichaCasoPortal id={a.toLowerCase()} />;
    notFound();
  }
  if (secao === "prazos" && s.length === 1) return <PrazosJuridicoPortal />;
  if (secao === "tarefas" && s.length === 1) return <TarefasJuridicoPortal />;
  if (secao === "peticoes") {
    if (s.length === 1) return <PeticoesJuridicoPortal />;
    if (a === "modelos" && s.length === 2) return <ModelosPeticaoPortal />;
    if (a === "nova" && s.length === 2) return <NovaPeticaoPortal />;
    if (a && UUID.test(a)) {
      if (s.length === 2) return <PeticaoPortal id={a.toLowerCase()} />;
      if (s.length === 3 && s[2] === "versao") return <VersaoPeticaoPortal id={a.toLowerCase()} />;
    }
    notFound();
  }
  return paginaDa("JURIDICO", params);
}
