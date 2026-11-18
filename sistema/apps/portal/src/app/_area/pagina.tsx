import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AREAS_PORTAL, type AreaPortal } from "@t3jus/domain";
import { PaginaAreaPortal, SECOES_AREA } from "@t3jus/ui";

// Uma área do Portal e a seção aberta (PA-01): /juridico, /juridico/prazos. A tela mostra a
// área só a quem ela foi liberada; as rotas de dado de cada área conferem de novo no servidor.
// Cada área tem a própria pasta (sem rota dinâmica na raiz, que engoliria /entrar e as outras).

type Params = Promise<{ secao?: string[] }>;

export function metadataDa(area: AreaPortal): Metadata {
  return { title: AREAS_PORTAL[area] };
}

export async function paginaDa(area: AreaPortal, params: Params) {
  const p = await params;
  if ((p.secao?.length ?? 0) > 1) notFound();
  const secao = p.secao?.[0];
  if (secao && !SECOES_AREA[area].some((s) => s.chave === secao)) notFound();
  return <PaginaAreaPortal area={area} secao={secao} />;
}
