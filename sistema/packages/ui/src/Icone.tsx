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
  // Fim do contrato e saída da pessoa (F0.14), do desenho aprovado em console-fim-contrato.
  fim: (
    <>
      <path d="M5 3.5h10l4 4V20.5H5Z" />
      <path d="M15 3.5v4h4" />
      <path d="m9 12.5 6 6M15 12.5l-6 6" />
    </>
  ),
  lixeira: (
    <>
      <path d="M4 6.5h16M9.5 6.5V4h5v2.5" />
      <path d="M6 6.5 7 20.5h10l1-14" />
      <path d="M10 10.5v6M14 10.5v6" />
    </>
  ),
  guardar: (
    <>
      <path d="M3.5 4.5h17v4h-17Z" />
      <path d="M5 8.5v11h14v-11" />
      <path d="M9.5 12.5h5" />
    </>
  ),
  abrir: (
    <>
      <path d="M5 10.5h14v10H5Z" />
      <path d="M8 10.5V7a4 4 0 0 1 7.6-1.7" />
      <path d="M12 14v3" />
    </>
  ),
  "pessoa-menos": (
    <>
      <circle cx="9.5" cy="8" r="3.5" />
      <path d="M3 20v-1.5A4.5 4.5 0 0 1 7.5 14h4a4.5 4.5 0 0 1 4.5 4.5V20" />
      <path d="M16 11h6" />
    </>
  ),
  dir: (
    <>
      <path d="m9 6 6 6-6 6" />
    </>
  ),
  video: (
    <>
      <path d="M3 6.5h12v11H3Z" />
      <path d="m15 10.5 6-3.5v10l-6-3.5" />
    </>
  ),
  local: (
    <>
      <path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11Z" />
      <path d="M12 7.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z" />
    </>
  ),
  whats: (
    <>
      <path d="M4.5 20 5.6 16A8.5 8.5 0 1 1 8.3 18.7Z" />
      <path d="M9 9.5c.3 2.3 2.2 4.3 4.5 5" />
    </>
  ),
  copiar: (
    <>
      <path d="M8.5 8.5h11v11h-11Z" />
      <path d="M15.5 8.5v-4h-11v11h4" />
    </>
  ),
  sincronia: (
    <>
      <path d="M20 12a8 8 0 0 1-14.3 4.9" />
      <path d="M4 12a8 8 0 0 1 14.3-4.9" />
      <path d="M18.5 3v4.2h-4.2" />
      <path d="M5.5 21v-4.2h4.2" />
    </>
  ),
  // Conversas (desenho aprovado de Agenda e Conversas).
  ia: <path d="M12 3.5 13.8 10 20.5 12l-6.7 2L12 20.5 10.2 14 3.5 12l6.7-2Z" />,
  mao: (
    <>
      <path d="M8 12V5.5a1.5 1.5 0 0 1 3 0V11" />
      <path d="M11 10V4.5a1.5 1.5 0 0 1 3 0V11" />
      <path d="M14 10.5V6a1.5 1.5 0 0 1 3 0v8c0 4-2.5 7-6.5 7S5 18.5 4 16l-1.5-4a1.4 1.4 0 0 1 2.5-1.3L8 14" />
    </>
  ),
  devolver: (
    <>
      <path d="M9 5 4 10l5 5" />
      <path d="M4 10h11a5 5 0 0 1 0 10h-3" />
    </>
  ),
  "pessoa-mais": (
    <>
      <circle cx="9.5" cy="8" r="3.5" />
      <path d="M3 20v-1.5A4.5 4.5 0 0 1 7.5 14h4a4.5 4.5 0 0 1 4.5 4.5V20" />
      <path d="M19 8v6M16 11h6" />
    </>
  ),
  // Escritório › WhatsApp e IA (desenho aprovado).
  ligar: <><path d="M12 3v9" /><path d="M7 6.2a7.5 7.5 0 1 0 10 0" /></>,
  pausa: <path d="M8 5v14M16 5v14" />,
  // Clientes › lista vazia, o atalho do ADVBOX (desenho aprovado portal-importacao-sistemas).
  link: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>,
  janela: <><path d="M3 4.5h18v15H3Z" /><path d="M3 8.5h18" /><path d="M13 13h5v4" /><path d="m18 13-6 6" /></>,
  chave: <><path d="M8.5 10a4.5 4.5 0 1 1 0 .1Z" /><path d="M13 12.5h8v3.5" /><path d="M17.5 12.5v2.5" /></>,
  medidor: <><path d="M3.5 17a8.5 8.5 0 1 1 17 0" /><path d="m12 17 4-6" /></>,
  selo: <><path d="M12 3 19 6v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6Z" /><path d="m8.5 12 2.5 2.5 4.5-5" /></>,
  livro: <><path d="M4 4.5h7v15H4Z" /><path d="M13 4.5h7v15h-7Z" /></>,
  raio: <path d="M13.5 3 5 13.5h6.5L10.5 21 19 10.5h-6.5L13.5 3Z" />,
  ramo: <><path d="M12 3v7" /><path d="m12 10-7 6.5V21" /><path d="m12 10 7 6.5V21" /><path d="M12 10v11" /></>,
  fluxo: <><path d="M4 3h7v5H4Z" /><path d="M13 16h7v5h-7Z" /><path d="M7.5 8v4h9v4" /></>,
  espera: <><path d="M6 3h12M6 21h12" /><path d="M7 3c0 5 10 5 10 9s-10 4-10 9" /><path d="M17 3c0 5-10 5-10 9s10 4 10 9" /></>,
  encerrar: <path d="M5 5h14v14H5Z" />,
  alvo: <><path d="M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Z" /><path d="M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z" /></>,
  filtro: <path d="M3.5 4.5h17l-6.5 8v6l-4 2v-8Z" />,
  celular: <><path d="M7 2.5h10v19H7Z" /><path d="M11 18.5h2" /></>,
  proibido: <><path d="M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Z" /><path d="m5.6 5.6 12.8 12.8" /></>,
  fonte: <><path d="M5 3h10l4 4v14H5Z" /><path d="M8.5 11h7M8.5 15h7" /></>,
  // Sino de avisos e "não receber avisos" (desenho aprovado em 20/11/2026).
  "sino-mudo": <><path d="M6 16.5V11a6 6 0 0 1 9.2-5.1" /><path d="M18 10.2v6.3l1.5 2H8" /><path d="M10 21h4" /><path d="M4 20 20 4" /></>,
  desfazer: <><path d="M9 5 4 10l5 5" /><path d="M4 10h11a5 5 0 0 1 0 10h-3" /></>,
  "sino-volta": <><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15Z" /><path d="M10 21h4" /><path d="m9.5 11.5 2 2 3.5-3.5" /></>,
  checks: <><path d="m2.5 12.5 4 4 8-9" /><path d="m11.5 16 1 .5 8-9" /></>,
  // Carnê de pagamento (FI-23, desenho aprovado em 20/11/2026).
  carne: <><path d="M3.5 5h17v14h-17Z" /><path d="M8.5 5v2M8.5 9.5v2M8.5 14v2M8.5 18.5V19" /><path d="M11.5 9.5h6M11.5 13h6M11.5 16h3.5" /></>,
  impressora: <><path d="M7 9V3.5h10V9" /><path d="M7 17H4V9h16v8h-3" /><path d="M7 14h10v6.5H7Z" /></>,
  qr: <><path d="M4 4h6v6H4ZM14 4h6v6h-6ZM4 14h6v6H4Z" /><path d="M14 14h2v2h-2ZM18 18h2v2h-2ZM14 18h2M18 14h2" /></>,
  // Cobrança dos escritórios (CO-06, desenho aprovado em 20/11/2026).
  fatura: <><path d="M5.5 3h13v18l-2.2-1.5L14 21l-2-1.5L10 21l-2.3-1.5L5.5 21Z" /><path d="M8.5 8h7M8.5 11.5h7M8.5 15h4" /></>,
  barras: <path d="M3.5 5v14M6.5 5v14M9 5v14M12.5 5v14M15 5v14M18 5v14M20.5 5v14" />,
  planos: <><path d="m12 3.5 8.5 4.5-8.5 4.5L3.5 8Z" /><path d="m3.5 12 8.5 4.5 8.5-4.5" /><path d="m3.5 16 8.5 4.5 8.5-4.5" /></>,
  arquivar: <><path d="M3.5 4.5h17v4h-17Z" /><path d="M5 8.5v11h14v-11" /><path d="M12 11.5v5M9.5 14l2.5 2.5 2.5-2.5" /></>,
  pagar: <><path d="M3 6.5h18v11H3Z" /><path d="M3 10h18" /><path d="M6.5 14.5h4" /></>,
} as const;

export type NomeIcone = keyof typeof DESENHOS;

export function Icone({ nome, className = "ac-ico" }: { nome: NomeIcone; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {DESENHOS[nome]}
    </svg>
  );
}
