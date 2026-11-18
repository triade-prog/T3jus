// Marca provisória: o logo do T3jus está em aberto (E3). Símbolo em âmbar e o nome (DC10).

export function Marca({ sistema }: { sistema: string }) {
  return (
    <span className="inline-flex items-center gap-2 font-semibold tracking-tight">
      <svg aria-hidden="true" viewBox="0 0 32 32" className="h-7 w-7 text-lilas">
        <path d="M16 3 29 27H3Z" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
      </svg>
      <span>
        T3jus
        <small className="block text-[10px] font-medium tracking-widest text-tinta-suave uppercase">{sistema}</small>
      </span>
    </span>
  );
}
