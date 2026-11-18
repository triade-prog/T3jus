// Ícones de traço do conceito Gabinete (espessura única, cantos vivos). Sempre decorativos:
// o texto ao lado diz o que é.

const DESENHOS = {
  olho: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  cadeado: (
    <>
      <path d="M5 10.5h14v10H5Z" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
      <path d="M12 14v3" />
    </>
  ),
  escudo: (
    <>
      <path d="M12 3.5 19.5 6v6c0 4.5-3.2 7.6-7.5 8.5C7.7 19.6 4.5 16.5 4.5 12V6Z" />
      <path d="M12 7v10" />
      <path d="M8.5 9v4.5c0 1.5 1.3 2.6 3.5 3.5M15.5 9v4.5c0 1.5-1.3 2.6-3.5 3.5" />
    </>
  ),
  envelope: (
    <>
      <path d="M3 5.5h18v13H3Z" />
      <path d="m3 5.5 9 7 9-7" />
    </>
  ),
  alerta: (
    <>
      <path d="M12 3.5 21.5 20h-19Z" />
      <path d="M12 10v4.5M12 16.8v.8" />
    </>
  ),
  check: <path d="m4.5 12.5 4.5 4.5L19.5 6.5" />,
  maleta: (
    <>
      <path d="M3 8h18v12H3Z" />
      <path d="M9 8V4.5h6V8" />
      <path d="M3 13h18" />
      <path d="M10.5 12v2.5h3V12" />
    </>
  ),
  pena: (
    <>
      <path d="M20 4C12 4 7.5 9 6.5 16.5L5 21" />
      <path d="M20 4c0 7.5-5 11.5-12.5 12.5" />
      <path d="M9.5 11h6M8 14h4.5" />
    </>
  ),
  carteira: (
    <>
      <path d="M3.5 6.5h17v13h-17Z" />
      <path d="M3.5 6.5 16 3.5v3" />
      <path d="M14 11.5h6.5v4H14Z" />
    </>
  ),
  balanca: (
    <>
      <path d="M12 3.5v16M7.5 20.5h9M4.5 7h15" />
      <path d="M4.5 7 2 13h5ZM19.5 7 17 13h5Z" />
      <path d="M2 13a2.5 2.5 0 0 0 5 0M17 13a2.5 2.5 0 0 0 5 0" />
    </>
  ),
  coluna: (
    <>
      <path d="M4 4h16l-1.5 2.5h-13Z" />
      <path d="M7 6.5v11M10.3 6.5v11M13.7 6.5v11M17 6.5v11" />
      <path d="M5.5 17.5h13L20 20H4Z" />
    </>
  ),
  escritorios: (
    <>
      <path d="M3 9 12 4l9 5Z" />
      <path d="M5.5 9v9M10 9v9M14 9v9M18.5 9v9" />
      <path d="M3 20.5h18" />
    </>
  ),
  ajuda: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.5v.7" />
      <path d="M12 16.6v.8" />
    </>
  ),
} as const;

export type NomeIcone = keyof typeof DESENHOS;

export function Icone({ nome, className = "ac-ico" }: { nome: NomeIcone; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {DESENHOS[nome]}
    </svg>
  );
}
