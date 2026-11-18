import { redirect } from "next/navigation";

// A ficha abre na aba Sócio enquanto as outras abas não têm tela aprovada.
export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/clientes/${encodeURIComponent(id)}/socio`);
}
