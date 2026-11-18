"use client";
// Moldura do Console (tela aprovada em docs/design/aprovadas/console-carteira.html): menu
// lateral vinho com as áreas, barra do topo com o caminho e, no pé, quem está usando.
// As áreas que ainda não têm tela aparecem apagadas, sem link.

import { useEffect, useState, type ReactNode } from "react";
import { FUNCOES_CONSOLE, type FuncaoConsole } from "@t3jus/domain";
import { chamarApi } from "../api.ts";
import { Icone, type NomeIcone } from "../Icone.tsx";
import { iniciais } from "./tempo.ts";

export interface SessaoConsole {
  pessoaId: string;
  nome: string;
  funcoes: FuncaoConsole[];
  acoes: string[];
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

type Area = "inicio" | "clientes";

const ITENS: { chave: Area | null; nome: string; icone: NomeIcone; href?: string }[] = [
  { chave: "inicio", nome: "Início", icone: "inicio" },
  { chave: "clientes", nome: "Clientes", icone: "escritorios", href: CARTEIRA },
];
const AREAS: { nome: string; icone: NomeIcone }[] = [
  { nome: "Comercial", icone: "maleta" },
  { nome: "Financeiro", icone: "moeda" },
  { nome: "Suporte", icone: "escudo" },
];
const ADMINISTRACAO: { nome: string; icone: NomeIcone }[] = [
  { nome: "Equipe", icone: "cracha" },
  { nome: "Sistema", icone: "ajustes" },
];

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

  async function sair() {
    setSaindo(true);
    await chamarApi("/v1/auth/sair", { corpo: {} });
    irParaEntrar();
  }

  const funcao = sessao?.funcoes[0];
  return (
    <div className={`co ${pagina}`}>
      <a className="pular" href="#conteudo">
        Pular para o conteúdo
      </a>
      <div className="app">
        <aside className="trilho" aria-label="Console T3jus">
          <div className="marca">
            <a className="marca-palavra" href={CARTEIRA} aria-label="T3jus, carteira de escritórios">
              T<b>3</b>jus
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
            {AREAS.map((a) => (
              <ItemApagado key={a.nome} {...a} />
            ))}
          </nav>
          <div className="trilho-pe">
            <nav aria-label="Administração">
              {ADMINISTRACAO.map((a) => (
                <ItemApagado key={a.nome} {...a} />
              ))}
            </nav>
            <div className="quem">
              <span className="av" aria-hidden="true">
                {sessao ? iniciais(sessao.nome).slice(0, 1) : ""}
              </span>
              <span>
                <strong>{sessao?.nome ?? " "}</strong>
                <small>{funcao ? FUNCOES_CONSOLE[funcao] : " "}</small>
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
