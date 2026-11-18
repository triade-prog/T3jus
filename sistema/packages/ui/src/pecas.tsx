"use client";
// Peças do cartão das telas de acesso (entrar, nova senha, convite, escolha do escritório),
// como nas telas aprovadas: aviso, título, campo de senha com Mostrar, regras da senha e
// erro preso ao campo.

import { forwardRef, useState, type ReactNode } from "react";
import { Icone, type NomeIcone } from "./Icone.tsx";

export function Aviso({ tom, icone, children }: { tom: "erro" | "info"; icone?: NomeIcone; children: ReactNode }) {
  return (
    <div className={tom === "erro" ? "ac-aviso ac-aviso-erro" : "ac-aviso"} role={tom === "erro" ? "alert" : "status"}>
      <Icone nome={icone ?? (tom === "erro" ? "alerta" : "check")} />
      <p>{children}</p>
    </div>
  );
}

/** Título do cartão: recebe o foco a cada etapa (o leitor de tela anuncia a troca). */
export const Cabecalho = forwardRef<HTMLHeadingElement, { titulo: string; lede?: ReactNode; children?: ReactNode }>(
  function Cabecalho({ titulo, lede, children }, ref) {
    return (
      <>
        <h1 ref={ref} tabIndex={-1}>
          {titulo}
        </h1>
        <span className="ac-fio" aria-hidden="true" />
        {lede ? <p className="ac-lede">{lede}</p> : null}
        {children}
      </>
    );
  },
);

export function ErroCampo({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p className="ac-erro-campo" id={id}>
      <Icone nome="alerta" />
      {children}
    </p>
  );
}

export function CampoSenha(props: {
  id: string;
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  descricao?: string;
  invalido?: boolean;
  erro?: string | null;
}) {
  const [ver, setVer] = useState(false);
  const idErro = `${props.id}-erro`;
  const descritores = [props.erro ? idErro : null, props.descricao ?? null].filter(Boolean).join(" ");
  return (
    <div className="ac-campo">
      <label htmlFor={props.id}>{props.rotulo}</label>
      <div className="ac-senha">
        <input className="ac-entrada" id={props.id} type={ver ? "text" : "password"} autoComplete="new-password" required
          aria-describedby={descritores || undefined} aria-invalid={props.invalido || Boolean(props.erro) || undefined}
          value={props.valor} onChange={(e) => props.aoMudar(e.target.value)} />
        <button type="button" aria-controls={props.id} aria-pressed={ver} onClick={() => setVer((v) => !v)}>
          <Icone nome="olho" className="ac-ico ac-ico-p" />
          {ver ? "Esconder" : "Mostrar"}
          <span className="ac-sr"> a senha</span>
        </button>
      </div>
      {props.erro ? <ErroCampo id={idErro}>{props.erro}</ErroCampo> : null}
    </div>
  );
}

export type EstadoRegra = "falta" | "ok" | "erro" | "conferindo";

const PREFIXO: Record<EstadoRegra, string> = { ok: "Cumprida: ", falta: "Falta: ", erro: "Não cumprida: ", conferindo: "Conferindo: " };

/** Mínimo da senha (igual ao Auth e ao contrato da API). */
export const SENHA_MINIMA = 12;

/** As duas regras da senha, sempre à vista. A de vazada só o servidor confere. */
export function estadoTamanho(senha: string, tentou: boolean): { estado: EstadoRegra; info: string } {
  const n = [...senha].length;
  if (n >= SENHA_MINIMA) return { estado: "ok", info: `${n} caracteres` };
  if (n === 0) return { estado: tentou ? "erro" : "falta", info: "" };
  const falta = SENHA_MINIMA - n;
  return { estado: tentou ? "erro" : "falta", info: `falta${falta === 1 ? "" : "m"} ${falta}` };
}

export function RegrasSenha({ id, tamanho, vazada }: { id: string; tamanho: { estado: EstadoRegra; info: string }; vazada: { estado: EstadoRegra; info: string } }) {
  const regra = (chave: string, r: { estado: EstadoRegra; info: string }, texto: string) => (
    <li className="ac-regra" data-regra={chave} data-estado={r.estado}>
      <span className="ac-regra-marca" aria-hidden="true">
        <Icone nome="check" className="ac-ico i-ok" />
        <Icone nome="xis" className="ac-ico i-erro" />
      </span>
      <span>
        <span className="ac-sr">{PREFIXO[r.estado]}</span>
        {texto} <span className="ac-regra-info">{r.info}</span>
      </span>
    </li>
  );
  return (
    <ul className="ac-regras" id={id} aria-label="Regras da senha">
      {regra("tamanho", tamanho, `Pelo menos ${SENHA_MINIMA} caracteres`)}
      {regra("vazada", vazada, "Fora das listas de senhas vazadas")}
    </ul>
  );
}

/** "Falta acertar 2 pontos, marcados abaixo." */
export function textoFaltam(n: number): string {
  return n === 1 ? "Falta acertar 1 ponto, marcado abaixo." : `Falta acertar ${n} pontos, marcados abaixo.`;
}

/** Lê o token_hash do link do e-mail e tira do endereço (não fica no histórico do navegador). */
export function tirarTokenDoEndereco(caminho: string): string | null {
  const token = new URLSearchParams(window.location.search).get("token_hash");
  window.history.replaceState(null, "", caminho);
  return token;
}
