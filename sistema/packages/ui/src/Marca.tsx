// Logo oficial do T3jus (definido pela Carol em 18/11/2026). O desenho vem de logo-desenho.ts,
// contornado dos arquivos dela; aqui só se escolhe a forma e as cores.
//
// Cores do logo (as do arquivo dela): âmbar #DE6A00 e vinho #510116. Sobre o vinho da moldura,
// a versão dela é toda em sal (#FEFAF4).

import type { ReactNode } from "react";
import { COMPACTO, COMPLETO, PALAVRA, SELO, SIMBOLO } from "./logo-desenho.ts";

export const LOGO_CORES = { ambar: "#DE6A00", vinho: "#510116", sal: "#FEFAF4" } as const;

/** "cor": símbolo âmbar e letras vinho (fundo claro). "sal": tudo em sal (fundo vinho). "vinho": tudo em vinho. */
export type TomLogo = "cor" | "sal" | "vinho";

function cores(tom: TomLogo) {
  if (tom === "cor") return { simbolo: LOGO_CORES.ambar, letras: LOGO_CORES.vinho };
  const c = LOGO_CORES[tom];
  return { simbolo: c, letras: c };
}

type Props = { tom?: TomLogo; className?: string; titulo?: string };

/** Só a parte gráfica; o nome acessível fica com quem usa (link com aria-label) ou com `titulo`. */
function Svg({ w, h, titulo, className, children }: { w: number; h: number; titulo?: string; className?: string; children: ReactNode }) {
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} {...(titulo ? { role: "img", "aria-label": titulo } : { "aria-hidden": true })}
      focusable="false">
      {children}
    </svg>
  );
}

/** Símbolo e "T3jus", sem "Sistema jurídico": molduras do Console e do Portal. */
export function LogoCompacto({ tom = "cor", className, titulo }: Props) {
  const c = cores(tom);
  const p = COMPACTO.palavra;
  return (
    <Svg w={COMPACTO.w} h={COMPACTO.h} titulo={titulo} className={className}>
      <path fill={c.simbolo} fillRule="evenodd" d={SIMBOLO.d} />
      <path fill={c.letras} fillRule="evenodd" d={PALAVRA.d} transform={`translate(${p.x} ${p.y}) scale(${p.escala})`} />
    </Svg>
  );
}

/** Logo completo, com o fio e "Sistema jurídico": telas de acesso. */
export function LogoCompleto({ tom = "cor", className, titulo }: Props) {
  const c = cores(tom);
  return (
    <Svg w={COMPLETO.w} h={COMPLETO.h} titulo={titulo} className={className}>
      {[COMPLETO.simbolo, COMPLETO.fio, COMPLETO.linha].map((d, i) => (
        <path key={`s${i}`} fill={c.simbolo} fillRule="evenodd" d={d} />
      ))}
      {[COMPLETO.palavra, COMPLETO.apoio].map((d, i) => (
        <path key={`l${i}`} fill={c.letras} fillRule="evenodd" d={d} />
      ))}
    </Svg>
  );
}

/** Só o símbolo (coluna em T). */
export function Simbolo({ tom = "cor", className, titulo }: Props) {
  return (
    <Svg w={SIMBOLO.w} h={SIMBOLO.h} titulo={titulo} className={className}>
      <path fill={cores(tom).simbolo} fillRule="evenodd" d={SIMBOLO.d} />
    </Svg>
  );
}

/** Selo "Gestão jurídica · T3jus · Escritório em ordem", nas cores do arquivo da Carol. */
export function Selo({ className, titulo }: { className?: string; titulo?: string }) {
  return (
    <Svg w={SELO.lado} h={SELO.lado} titulo={titulo} className={className}>
      {SELO.camadas.map((c, i) => (
        <path key={i} fill={c.cor} fillRule="evenodd" d={c.d} />
      ))}
    </Svg>
  );
}

/** Mantido para quem já importava `Marca`: logo compacto e o nome do sistema embaixo. */
export function Marca({ sistema }: { sistema: string }) {
  return (
    <span className="inline-flex flex-col gap-1">
      <LogoCompacto className="h-8 w-auto" titulo="T3jus" />
      <small className="block text-[10px] font-medium tracking-widest text-tinta-suave uppercase">{sistema}</small>
    </span>
  );
}
