"use client";
// Peças das telas do Console v1 (docs/design/aprovadas/console-v1): aviso, estado (vazio e
// erro), janela, campo com erro preso e esqueleto de carregando. Seguem o design system D2.

import { useEffect, useRef, type ReactNode } from "react";
import { Icone, type NomeIcone } from "../Icone.tsx";
import { pararVigiaDoFoco, pistaDoFoco, vigiarFoco, type PistaDoFoco } from "./foco.ts";

export type TomAviso = "urgencia" | "atencao" | "sucesso" | "info";

const ICONE_AVISO: Record<TomAviso, NomeIcone> = { urgencia: "alerta", atencao: "relogio", sucesso: "check", info: "ajuda" };

/** Aviso do D2. Urgência é `alert`; o resto, `status`. */
export function Aviso({ tom, titulo, children, acoes, className, icone }: {
  tom: TomAviso;
  /** Outro ícone no lugar do padrão do tom. */
  icone?: NomeIcone;
  titulo?: ReactNode;
  children?: ReactNode;
  acoes?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`aviso aviso-${tom}${className ? ` ${className}` : ""}`} role={tom === "urgencia" ? "alert" : "status"}>
      <Icone nome={icone ?? ICONE_AVISO[tom]} className="ico" />
      <div>
        {titulo ? <strong className="aviso-titulo">{titulo}</strong> : null}
        {children ? <p>{children}</p> : null}
        {acoes ? <div className="aviso-acoes">{acoes}</div> : null}
      </div>
    </div>
  );
}

/** Estado vazio (ou de erro) dentro de uma folha. */
export function Estado({ icone, titulo, children, acoes, erro, moldura = false, nivel = 3 }: {
  icone: NomeIcone;
  titulo: string;
  children: ReactNode;
  acoes?: ReactNode;
  erro?: boolean;
  moldura?: boolean;
  nivel?: 1 | 2 | 3;
}) {
  const T = `h${nivel}` as const;
  return (
    <div className={`estado${erro ? " estado-erro" : ""}${moldura ? "" : " sem-moldura"}`} role={erro ? "alert" : undefined}>
      <span className="icone-estado">
        <Icone nome={erro ? "alerta" : icone} className="ico" />
      </span>
      <T>{titulo}</T>
      <p>{children}</p>
      {acoes ? <div className="acoes">{acoes}</div> : null}
    </div>
  );
}

/** Erro de carregar uma aba: o que estava salvo continua salvo; tentar de novo. */
export function ErroAoCarregar({ oque, aoTentar, texto }: { oque: string; aoTentar: () => void; texto?: string }) {
  return (
    <Estado icone="alerta" erro moldura titulo={`Não deu para carregar ${oque}`}
      acoes={
        <button className="btn btn-pri" type="button" onClick={aoTentar}>
          <Icone nome="reenviar" className="ico" />
          Tentar de novo
        </button>
      }>
      {texto ?? "O servidor não respondeu. O que já estava salvo continua salvo. Tente de novo em instantes."}
    </Estado>
  );
}

/** Esqueleto de uma aba carregando, com o texto para leitor de tela. */
export function Carregando({ rotulo, linhas = 3 }: { rotulo: string; linhas?: number }) {
  return (
    <div aria-busy="true">
      <p className="sr" role="status">
        {rotulo}
      </p>
      <section className="folha" aria-hidden="true" style={{ padding: 24, display: "grid", gap: 18 }}>
        <span className="esqueleto esq-linha" style={{ width: "34%", height: 22 }} />
        {Array.from({ length: linhas }, (_, i) => (
          <div key={i} style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <span className="esqueleto" style={{ width: 40, height: 40, borderRadius: "50%", flex: "none" }} />
            <div style={{ flex: 1, display: "grid", gap: 8 }}>
              <span className="esqueleto esq-linha" style={{ width: "45%" }} />
              <span className="esqueleto esq-linha" style={{ width: "80%", height: 10 }} />
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

/**
 * Janela (dialog com showModal): o foco fica preso, Esc fecha e o foco volta a quem abriu. Se quem abriu
 * sumiu ou a janela fecha sem o evento close (Cancelar, X, desmontada), foco.ts acha o lugar (F3.165).
 * O formulário da janela é o `aoEnviar`; o rodapé recebe os botões.
 */
export function Janela({ id, aberta, aoFechar, titulo, sobretitulo, descricao, alerta, aoEnviar, children, pe, classe }: {
  id: string;
  /** Classe a mais no dialog (por exemplo, uma janela larga). */
  classe?: string;
  aberta: boolean;
  aoFechar: () => void;
  titulo: ReactNode;
  sobretitulo?: string;
  /** id do parágrafo que descreve a janela. */
  descricao?: string;
  alerta?: boolean;
  aoEnviar: () => void;
  children: ReactNode;
  pe: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const pista = useRef<PistaDoFoco | null>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (!aberta) {
      if (d.open) d.close();
      return;
    }
    if (!d.open) {
      // F3.165: a pista de quem abriu é guardada antes do showModal(); depois dele, o foco já está na janela.
      pista.current = pistaDoFoco(document.activeElement);
      d.showModal();
      d.querySelector<HTMLElement>("[data-foco]")?.focus();
    } else pararVigiaDoFoco(); // o efeito rodou de novo com a janela aberta (modo de desenvolvimento)
    const p = pista.current;
    // Roda quando aberta vira falso e quando a janela é desmontada, com ou sem o evento close.
    return () => {
      if (p) vigiarFoco(p);
    };
  }, [aberta]);
  return (
    <dialog ref={ref} className={classe ? `janela ${classe}` : "janela"} id={id} aria-labelledby={`${id}-t`} aria-describedby={descricao}
      role={alerta ? "alertdialog" : undefined} onClose={aoFechar}>
      <form className="janela-form" noValidate onSubmit={(e) => { e.preventDefault(); aoEnviar(); }}>
        <div className="janela-cabeca">
          <div>
            {sobretitulo ? <p className="sobretitulo">{sobretitulo}</p> : null}
            <h2 id={`${id}-t`}>{titulo}</h2>
          </div>
          <button className="fechar" type="button" aria-label="Fechar" onClick={aoFechar}>
            <Icone nome="xis" className="ico" />
          </button>
        </div>
        <div className="janela-corpo">{children}</div>
        <div className="janela-pe">{pe}</div>
      </form>
    </dialog>
  );
}

/** Mensagem de erro presa ao campo (aria-describedby aponta para o id). */
export function ErroCampo({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p className="erro-msg" id={id}>
      <Icone nome="alerta" className="ico ico-s" />
      {children}
    </p>
  );
}

/** Junta os ids de descrição que existem. */
export function descritoPor(...ids: (string | false | null | undefined)[]): string | undefined {
  const v = ids.filter(Boolean).join(" ");
  return v || undefined;
}

/** "Falta acertar 2 pontos, marcados abaixo." */
export function faltaAcertar(n: number): string {
  return n === 1 ? "Falta acertar 1 ponto, marcado abaixo." : `Falta acertar ${n} pontos, marcados abaixo.`;
}

/** Leva o foco ao primeiro campo marcado com erro dentro do elemento. */
export function focarPrimeiroErro(raiz: HTMLElement | null) {
  requestAnimationFrame(() => raiz?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
}
