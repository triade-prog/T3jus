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
  xis: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  busca: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5" />
    </>
  ),
  seta: <path d="m9 5 7 7-7 7" />,
  sair: (
    <>
      <path d="M13.5 4.5h-9v15h9" />
      <path d="M9.5 12h11" />
      <path d="m17 8.5 3.5 3.5-3.5 3.5" />
    </>
  ),
  relogio: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  ajuda: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.5v.7" />
      <path d="M12 16.6v.8" />
    </>
  ),
  inicio: (
    <>
      <path d="M3 10 12 4l9 6" />
      <path d="M5 9.5V20h14V9.5" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  moeda: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M14.8 9.2c-.5-.9-1.6-1.4-2.8-1.4-1.6 0-2.8.8-2.8 2.1 0 2.9 5.8 1.4 5.8 4.3 0 1.3-1.3 2.2-3 2.2-1.3 0-2.5-.6-3-1.6M12 6v1.8M12 16.4v1.6" />
    </>
  ),
  cracha: (
    <>
      <path d="M5 3.5h14v17H5Z" />
      <circle cx="12" cy="10" r="2.6" />
      <path d="M8 17a4 4 0 0 1 8 0" />
    </>
  ),
  ajustes: (
    <>
      <path d="M4 7h9M18 7h2M4 17h3M11 17h9" />
      <path d="M13 5h5v4h-5ZM7 15h4v4H7Z" />
    </>
  ),
  esquerda: <path d="m15 6-6 6 6 6" />,
  mais: <path d="M12 5v14M5 12h14" />,
  reenviar: (
    <>
      <path d="M20 12a8 8 0 1 1-2.3-5.6" />
      <path d="M20 4v5h-5" />
    </>
  ),
  doc: (
    <>
      <path d="M5.5 3h9l4 4v14h-13Z" /><path d="M14.5 3v4h4M8.5 12h7M8.5 15.5h7" />
    </>
  ),
  imagem: (
    <>
      <path d="M4 5h16v14H4Z" /><circle cx="9" cy="10" r="1.8" /><path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5" />
    </>
  ),
  baixar: (
    <>
      <path d="M12 4v11M7 10.5l5 5 5-5" /><path d="M4.5 19.5h15" />
    </>
  ),
  enviar: (
    <>
      <path d="M12 15.5V4.5M7 9l5-5 5 5" /><path d="M4.5 14v5.5h15V14" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </>
  ),
  lapis: (
    <>
      <path d="M4 20h4L19.5 8.5l-4-4L4 16Z" /><path d="m13.5 6.5 4 4" />
    </>
  ),
  telefone: (
    <>
      <path d="M5 4h4l1.5 4.5-2.5 1.5a11 11 0 0 0 6 6l1.5-2.5L20 15v4a1.5 1.5 0 0 1-1.5 1.5A16 16 0 0 1 3.5 5.5 1.5 1.5 0 0 1 5 4Z" />
    </>
  ),
  pessoaMais: (
    <>
      <circle cx="9.5" cy="8" r="3.5" /><path d="M3 20v-1.5A4.5 4.5 0 0 1 7.5 14h4a4.5 4.5 0 0 1 4.5 4.5V20" /><path d="M19 8v6M16 11h6" />
    </>
  ),
  pessoaMenos: (
    <>
      <circle cx="9.5" cy="8" r="3.5" /><path d="M3 20v-1.5A4.5 4.5 0 0 1 7.5 14h4a4.5 4.5 0 0 1 4.5 4.5V20" /><path d="M16 11h6" />
    </>
  ),
  historico: (
    <>
      <path d="M4 12a8 8 0 1 0 2.3-5.6" /><path d="M4 4v4.5h4.5" /><path d="M12 8v4.5l3 2" />
    </>
  ),
  pessoas: (
    <>
      <circle cx="9" cy="8" r="3.2" /><path d="M3 20v-1.5A4.5 4.5 0 0 1 7.5 14h3a4.5 4.5 0 0 1 4.5 4.5V20" /><path d="M15 4.9a3.2 3.2 0 0 1 0 6.2" /><path d="M18 14.2a4.5 4.5 0 0 1 3 4.3V20" />
    </>
  ),
  sino: (
    <>
      <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15Z" /><path d="M10 21h4" />
    </>
  ),
  baixo: (
    <>
      <path d="m6 9 6 6 6-6" />
    </>
  ),
  conversas: (
    <>
      <path d="M3.5 4.5h17v12h-9l-4.5 3.5v-3.5H3.5Z" />
      <path d="M8 9h8M8 12.5h5" />
    </>
  ),
  agenda: (
    <>
      <path d="M4 5.5h16v15H4Z" />
      <path d="M4 10h16M8.5 3v4.5M15.5 3v4.5" />
      <path d="M8 13.5h3v3H8Z" />
    </>
  ),
  pontos: <path d="M6 12h.01M12 12h.01M18 12h.01" strokeWidth="3" strokeLinecap="round" />,
  trocar: (
    <>
      <path d="M4 8h14l-3.5-3.5" />
      <path d="M20 16H6l3.5 3.5" />
    </>
  ),
  funcoes: (
    <>
      <path d="M4 6.5h4M12 6.5h8M4 12h10M18 12h2M4 17.5h2M10 17.5h10" />
      <path d="M8 4.5v4M14 10v4M6 15.5v4" />
    </>
  ),
  pasta: <path d="M3 6h7l2 2.5h9V19H3Z" />,
  dir: (
    <>
      <path d="m9 6 6 6-6 6" />
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
