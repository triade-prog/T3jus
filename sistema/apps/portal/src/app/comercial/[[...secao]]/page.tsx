import { metadataDa, paginaDa } from "../../_area/pagina";

export const metadata = metadataDa("COMERCIAL");

export default function Pagina({ params }: { params: Promise<{ secao?: string[] }> }) {
  return paginaDa("COMERCIAL", params);
}
