import { metadataDa, paginaDa } from "../../_area/pagina";

export const metadata = metadataDa("JURIDICO");

export default function Pagina({ params }: { params: Promise<{ secao?: string[] }> }) {
  return paginaDa("JURIDICO", params);
}
