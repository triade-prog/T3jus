import { metadataDa, paginaDa } from "../../_area/pagina";

export const metadata = metadataDa("FINANCEIRO");

export default function Pagina({ params }: { params: Promise<{ secao?: string[] }> }) {
  return paginaDa("FINANCEIRO", params);
}
