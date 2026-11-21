"use client";
// Moldura do Console (telas aprovadas em docs/design/aprovadas/console-carteira.html e
// console-v1): menu lateral vinho com as áreas, barra do topo com o caminho e, no pé, quem
// está usando. As áreas que ainda não têm tela aparecem apagadas, sem link. No celular
// (até 760 px), a lateral vira gaveta, aberta pela barra vinho do topo; fecha com Esc.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { FUNCOES_CONSOLE, type FuncaoConsole } from "@t3jus/domain";
import { chamarApi } from "../api.ts";
import { Icone, type NomeIcone } from "../Icone.tsx";
import { LogoCompacto } from "../Marca.tsx";
import { iniciais } from "./tempo.ts";

export interface SessaoConsole {
  pessoaId: string;
  nome: string;
  funcoes: FuncaoConsole[];
  acoes: string[];
  /** Interessados que pedem atenção (F2.3), no contador de Comercial. */
  interessadosAtencao?: number;
}

const TELA_ENTRAR = "/entrar";
/** A carteira é a página inicial do Console. */
export const CARTEIRA = "/";

function irParaEntrar() {
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- recarga completa: a sessão acabou e nada da tela anterior pode ficar
  window.location.assign(TELA_ENTRAR);
}

/**
 * Chamada do Console: sessão vencida (401) volta para a tela de entrar. O resto da resposta
 * segue para a tela tratar.
 */
export async function chamarConsole<T>(caminho: string, opcoes?: Parameters<typeof chamarApi>[1]) {
  const r = await chamarApi<T>(caminho, opcoes);
  if (!r.ok && r.status === 401) irParaEntrar();
  return r;
}

/** Quem está no Console (GET /v1/sessao). */
export function useSessaoConsole(): SessaoConsole | null {
  const [sessao, setSessao] = useState<SessaoConsole | null>(null);
  useEffect(() => {
    let vivo = true;
    void chamarConsole<SessaoConsole>("/v1/sessao").then((r) => {
      if (vivo && r.ok) setSessao(r.dados);
    });
    return () => {
      vivo = false;
    };
  }, []);
  return sessao;
}

type Area = "inicio" | "clientes" | "equipe" | "suporte" | "comercial";

/** Página da Equipe T3jus (só Administração). */
export const EQUIPE = "/equipe";

const ITENS: { chave: Area | null; nome: string; icone: NomeIcone; href?: string }[] = [
  { chave: "inicio", nome: "Início", icone: "inicio" },
  { chave: "clientes", nome: "Clientes", icone: "escritorios", href: CARTEIRA },
];
const AREAS: { nome: string; icone: NomeIcone }[] = [{ nome: "Financeiro", icone: "moeda" }];

/** Comercial › Interessados (F2.3): Administração e Implantação. */
export const INTERESSADOS = "/interessados";

/** Suporte de acesso (F1.3): só aparece para quem tem Suporte ou Administração. */
const SUPORTE_HREF = "/suporte";

function ItemApagado({ nome, icone }: { nome: string; icone: NomeIcone }) {
  return (
    <span className="item" aria-disabled="true" title="Esta área ainda não tem tela">
      <Icone nome={icone} className="ico" />
      {nome}
    </span>
  );
}

export function MolduraConsole({
  atual,
  trilha,
  sessao,
  pendencias,
  pagina,
  children,
}: {
  atual: Area;
  /** Caminho na barra do topo; o último é a página atual. */
  trilha: { nome: string; href?: string }[];
  sessao: SessaoConsole | null;
  /** Clientes com pendência, no contador do menu. */
  pendencias?: number;
  /** Classe da página (co-carteira, co-ficha). */
  pagina: string;
  children: ReactNode;
}) {
  const [saindo, setSaindo] = useState(false);
  const [gaveta, setGaveta] = useState(false);
  const abrir = useRef<HTMLButtonElement>(null);
  const fechar = useRef<HTMLButtonElement>(null);

  function mudarGaveta(aberta: boolean) {
    setGaveta(aberta);
    // O foco vai para dentro da gaveta ao abrir e volta para o Menu ao fechar.
    requestAnimationFrame(() => (aberta ? fechar.current : abrir.current)?.focus());
  }

  useEffect(() => {
    if (!gaveta) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") mudarGaveta(false);
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [gaveta]);

  async function sair() {
    setSaindo(true);
    await chamarApi("/v1/auth/sair", { corpo: {} });
    irParaEntrar();
  }

  const funcao = sessao?.funcoes[0];
  const administra = sessao?.funcoes.includes("ADMINISTRACAO") ?? false;
  return (
    <div className={`co ${pagina}`}>
      <a className="pular" href="#conteudo">
        Pular para o conteúdo
      </a>
      <div className={gaveta ? "app gaveta" : "app"}>
        <header className="barra-cel">
          <button ref={abrir} className="bb" type="button" aria-controls="trilho" aria-expanded={gaveta} aria-label="Abrir menu"
            onClick={() => mudarGaveta(true)}>
            <Icone nome="menu" className="ico" />
          </button>
          <a className="marca-cel" href={CARTEIRA}>
            <LogoCompacto tom="sobre-vinho" className="logo" titulo="T3jus" />
            <span>Console</span>
            <span className="sr">, carteira de escritórios</span>
          </a>
        </header>
        <div className="veu-gaveta" onClick={() => mudarGaveta(false)} />
        <aside className="trilho" id="trilho" aria-label="Console T3jus">
          <button ref={fechar} className="fechar-menu" type="button" aria-label="Fechar menu" onClick={() => mudarGaveta(false)}>
            <Icone nome="xis" className="ico" />
          </button>
          <div className="marca">
            <a className="marca-palavra" href={CARTEIRA} aria-label="T3jus, carteira de escritórios">
              <LogoCompacto tom="sobre-vinho" className="logo" />
            </a>
            <span className="marca-sub">Console</span>
          </div>
          <nav aria-label="Navegação principal">
            {ITENS.map((i) =>
              i.href ? (
                <a key={i.nome} className="item" href={i.href} aria-current={i.chave === atual ? "page" : undefined}>
                  <Icone nome={i.icone} className="ico" />
                  {i.nome}
                  {pendencias ? (
                    <span className="cont" aria-label={`${pendencias} com pendência`}>
                      {pendencias}
                    </span>
                  ) : null}
                </a>
              ) : (
                <ItemApagado key={i.nome} nome={i.nome} icone={i.icone} />
              ),
            )}
            <p className="grupo">Áreas</p>
            {sessao?.acoes.includes("console.interessados.ver") ? (
              <a className="item" href={INTERESSADOS} aria-current={atual === "comercial" ? "page" : undefined}>
                <Icone nome="maleta" className="ico" />
                Comercial
                {sessao.interessadosAtencao ? (
                  <span className="cont" aria-label={`${sessao.interessadosAtencao} interessados pedem atenção`}>
                    {sessao.interessadosAtencao}
                  </span>
                ) : null}
              </a>
            ) : (
              <ItemApagado nome="Comercial" icone="maleta" />
            )}
            {AREAS.map((a) => (
              <ItemApagado key={a.nome} {...a} />
            ))}
            {sessao?.acoes.includes("console.suporte.ver") ? (
              <a className="item" href={SUPORTE_HREF} aria-current={atual === "suporte" ? "page" : undefined}>
                <Icone nome="escudo" className="ico" />
                Suporte
              </a>
            ) : null}
          </nav>
          <div className="trilho-pe">
            {administra ? (
              <nav aria-label="Administração">
                <a className="item" href={EQUIPE} aria-current={atual === "equipe" ? "page" : undefined}>
                  <Icone nome="cracha" className="ico" />
                  Equipe
                </a>
                <ItemApagado nome="Sistema" icone="ajustes" />
              </nav>
            ) : null}
            <div className="quem">
              <span className="av" aria-hidden="true">
                {sessao ? iniciais(sessao.nome).slice(0, 1) : ""}
              </span>
              <span>
                <strong>{sessao?.nome ?? " "}</strong>
                <small>{funcao ? FUNCOES_CONSOLE[funcao] : " "}</small>
              </span>
              <button className="sair" type="button" onClick={sair} disabled={saindo} aria-label="Sair do Console">
                <Icone nome="sair" className="ico" />
              </button>
            </div>
          </div>
        </aside>

        <div className="palco">
          <header className="topo">
            <nav className="trilha" aria-label="Você está em">
              {trilha.map((t, i) => (
                <span key={`${t.nome}-${i}`} style={{ display: "contents" }}>
                  {i > 0 ? <Icone nome="seta" className="ico ico-s" /> : null}
                  {i === trilha.length - 1 ? <span aria-current="page">{t.nome}</span> : <a href={t.href}>{t.nome}</a>}
                </span>
              ))}
            </nav>
          </header>
          <main className="conteudo" id="conteudo" tabIndex={-1}>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
