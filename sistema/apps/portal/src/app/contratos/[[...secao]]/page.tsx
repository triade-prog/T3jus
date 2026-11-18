import { metadataDa, paginaDa } from "../../_area/pagina";

export const metadata = metadataDa("CONTRATOS");

export default function Pagina({ params }: { params: Promise<{ secao?: string[] }> }) {
  return paginaDa("CONTRATOS", params);
}
