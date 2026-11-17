import { Marca } from "@t3just/ui";

// Página inicial provisória: a fundação (passo 0) não tem telas. As telas chegam depois
// das regras, a partir do passo 1 (DC7).
export default function Inicio() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-4 px-4 py-12">
      <Marca sistema="Portal do advogado" />
      <h1 className="text-2xl font-semibold tracking-tight">Portal do advogado</h1>
      <p className="text-tinta-suave">Gestão do escritório: atendimentos, contratos, honorários e prazos num lugar só.</p>
      <p className="rounded-md border border-info-borda bg-info-fundo px-3 py-2 text-info">
        Em construção. As telas chegam a partir do passo 1.
      </p>
    </main>
  );
}
