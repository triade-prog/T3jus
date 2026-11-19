"use client";
// Moldura do Portal do advogado em áreas (PA-01), tela aprovada em docs/design/aprovadas/portal-v1
// (moldura.html). No alto, o que todo mundo usa; no meio, só as áreas que o sócio dono liberou
// para a pessoa (a que não foi liberada nem aparece); embaixo, Equipe (só o dono), Escritório e
// Ajuda. No celular (até 760 px), uma barra fixa embaixo com Início, Conversas, Agenda e Mais;
// o Mais abre uma folha com o resto (Carol, 18/11/2026).

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AREAS_PORTAL, type AreaPortal, type DatasContrato } from "@t3jus/domain";
import { chamarApi } from "../api.ts";
import { Icone, type NomeIcone } from "../Icone.tsx";
import { LogoCompacto } from "../Marca.tsx";
import { iniciais } from "../console/tempo.ts";
import { ICONE_AREA, ORDEM_AREAS, rotaArea, SECOES_AREA } from "./areas.ts";

/** O escritório da sessão, como GET /v1/escritorio devolve. */
export interface EscritorioPortal {
  id: string;
  nome: string;
  pessoa: string;
  dono: boolean;
  areas: AreaPortal[];
  socios: string[];
  pessoas: number;
  outrosEscritorios: number;
  cnpj: string | null;
  cidade: string | null;
  uf: string | null;
  endereco: string | null;
  contatos: { nome: string; papel?: string | null; telefone?: string | null; email?: string | null }[];
  ultimaExportacao: { em: string; por: string | null } | null;
  /** Contrato encerrado, nos 30 dias só para consulta (F0.14); fora disso, null. */
  encerramento?: DatasContrato | null;
}

/** Só consulta: o contrato terminou e ninguém cria nem muda nada (o banco recusa também). */
export const soConsulta = (e: Pick<EscritorioPortal, "encerramento"> | null) => !!e?.encerramento;

const diaBr = (iso: string, curta = false) => {
  const [a, m, d] = iso.slice(0, 10).split("-");
  return curta ? `${d}/${m}` : `${d}/${m}/${a}`;
};

/** Faixa fina no alto das páginas, durante os 30 dias só para consulta. */
function TiraSoConsulta({ e }: { e: EscritorioPortal }) {
  const d = e.encerramento!;
  return (
    <div className="fc-tira" role="note">
      <Icone nome="cadeado" className="ico" />
      <span>
        <b>Só consulta até {diaBr(d.consultaAte)}.</b> O contrato com o T3jus terminou; em {diaBr(d.acessoFechaEm, true)} o acesso fecha e os dados ficam
        guardados pelo T3jus por 5 anos.
      </span>
      <a href={ROTAS_PORTAL.escritorio}>{e.dono ? "Baixar os dados" : "Ver o aviso"}</a>
    </div>
  );
}

export const ROTAS_PORTAL = {
  inicio: "/",
  conversas: "/conversas",
  clientes: "/clientes",
  agenda: "/agenda",
  equipe: "/equipe",
  escritorio: "/meu-escritorio",
  ajuda: "/ajuda",
  escolher: "/escritorio",
} as const;

/** O papel que aparece embaixo do nome: o dono vê tudo; os outros, as áreas liberadas. */
export function papelNoEscritorio(e: Pick<EscritorioPortal, "dono" | "areas">): string {
  if (e.dono) return "Sócio dono · vê tudo";
  if (!e.areas.length) return "Só as partes comuns";
  const nomes = e.areas.map((a) => AREAS_PORTAL[a]);
  return `${nomes.length === 1 ? "Área" : "Áreas"}: ${nomes.length === 1 ? nomes[0] : `${nomes.slice(0, -1).join(", ")} e ${nomes.at(-1)}`}`;
}

function ir(destino: string) {
  // Recarga completa: a sessão mudou e nada da tela anterior pode ficar.
  window.location.assign(destino);
}

/** Vai para outra página do Portal com recarga completa (depois de cadastrar, por exemplo). */
export const irPara = ir;

/**
 * Chamada do Portal: sessão vencida (401) volta para entrar; sem escritório escolhido na
 * sessão, vai para a escolha. O resto segue para a tela tratar.
 */
export async function chamarPortal<T>(caminho: string, opcoes?: Parameters<typeof chamarApi>[1]) {
  const r = await chamarApi<T>(caminho, opcoes);
  if (!r.ok && r.status === 401) ir("/entrar");
  if (!r.ok && r.erro.codigo === "ESCRITORIO_REQUIRED") ir(ROTAS_PORTAL.escolher);
  return r;
}

/** O escritório da sessão (GET /v1/escritorio): null enquanto carrega; "erro" se falhar. */
export function useEscritorioPortal(): { escritorio: EscritorioPortal | null; erro: boolean; recarregar: () => void } {
  const [escritorio, setEscritorio] = useState<EscritorioPortal | null>(null);
  const [erro, setErro] = useState(false);
  const [vez, setVez] = useState(0);
  useEffect(() => {
    let vivo = true;
    void chamarPortal<EscritorioPortal>("/v1/escritorio").then((r) => {
      if (!vivo) return;
      if (r.ok) setEscritorio(r.dados);
      else if (r.status !== 401 && r.erro.codigo !== "ESCRITORIO_REQUIRED") setErro(true);
    });
    return () => {
      vivo = false;
    };
  }, [vez]);
  return { escritorio, erro, recarregar: () => { setErro(false); setVez((v) => v + 1); } };
}

export type LugarPortal = "inicio" | "conversas" | "clientes" | "agenda" | "equipe" | "escritorio" | "ajuda" | AreaPortal | null;

const COMUNS: { chave: LugarPortal; nome: string; icone: NomeIcone; href: string }[] = [
  { chave: "inicio", nome: "Início", icone: "inicio", href: ROTAS_PORTAL.inicio },
  { chave: "conversas", nome: "Conversas", icone: "conversas", href: ROTAS_PORTAL.conversas },
  { chave: "clientes", nome: "Clientes", icone: "pessoas", href: ROTAS_PORTAL.clientes },
  { chave: "agenda", nome: "Agenda", icone: "agenda", href: ROTAS_PORTAL.agenda },
];
const NO_CELULAR_EMBAIXO: LugarPortal[] = ["inicio", "conversas", "agenda"];

function atualDe(chave: LugarPortal, atual: LugarPortal, area: boolean) {
  return chave === atual ? (area ? ("true" as const) : ("page" as const)) : undefined;
}

export function MolduraPortal({
  atual,
  trilha,
  escritorio,
  barraArea,
  pagina = "",
  children,
}: {
  atual: LugarPortal;
  /** Caminho na barra do topo; o último é a página atual. */
  trilha: { nome: string; href?: string }[];
  escritorio: EscritorioPortal | null;
  /** Área aberta e a seção atual: mostra a barra de seções no alto. */
  barraArea?: { area: AreaPortal; secao?: string };
  /** Classes da página (co-equipe co-carteira, por exemplo). */
  pagina?: string;
  children: ReactNode;
}) {
  const [saindo, setSaindo] = useState(false);
  const mais = useRef<HTMLDialogElement>(null);
  const abrirMais = useRef<HTMLButtonElement>(null);
  const areas = ORDEM_AREAS.filter((a) => escritorio?.areas.includes(a));

  async function sair() {
    setSaindo(true);
    await chamarApi("/v1/auth/sair", { corpo: {} });
    ir("/entrar");
  }

  function abrirFolha() {
    mais.current?.showModal();
    mais.current?.querySelector<HTMLElement>(".fechar")?.focus();
  }

  const itemArea = (a: AreaPortal, cls: "item" | "pt-mi") => (
    <a key={a} className={cls} href={rotaArea(a)} aria-current={atualDe(a, atual, true)}>
      <Icone nome={ICONE_AREA[a]} className="ico" />
      {AREAS_PORTAL[a]}
      {cls === "pt-mi" ? <Icone nome="dir" className="ico ico-s pt-ir" /> : null}
    </a>
  );

  const papel = escritorio ? papelNoEscritorio(escritorio) : " ";
  return (
    <div className={`co pt ${pagina}${soConsulta(escritorio) ? " pt-consulta" : ""}`}>
      <a className="pular" href="#conteudo">
        Pular para o conteúdo
      </a>
      <div className="app">
        <header className="barra-cel">
          <a className="marca-cel" href={ROTAS_PORTAL.inicio}>
            <LogoCompacto tom="sobre-vinho" className="logo" titulo="T3jus" />
            <span>Portal</span>
            <span className="sr">, início</span>
          </a>
        </header>
        <aside className="trilho" id="trilho" aria-label="Portal do advogado">
          <div className="marca">
            <a className="marca-palavra" href={ROTAS_PORTAL.inicio} aria-label="T3jus, início">
              <LogoCompacto tom="sobre-vinho" className="logo" />
            </a>
          </div>
          <a className="escritorio" href={ROTAS_PORTAL.escritorio}>
            <span className="mo" aria-hidden="true">
              {escritorio ? iniciais(escritorio.nome).slice(0, 1) : ""}
            </span>
            <span>
              <strong>{escritorio?.nome ?? " "}</strong>
              <small>{escritorio ? `${escritorio.pessoas} ${escritorio.pessoas === 1 ? "pessoa" : "pessoas"}` : " "}</small>
              <span className="sr">, dados do escritório</span>
            </span>
          </a>
          <nav aria-label="Navegação principal">
            {COMUNS.map((i) => (
              <a key={i.nome} className="item" href={i.href} aria-current={atualDe(i.chave, atual, false)}>
                <Icone nome={i.icone} className="ico" />
                {i.nome}
              </a>
            ))}
            {areas.length ? <p className="grupo">Áreas</p> : null}
            {areas.map((a) => itemArea(a, "item"))}
          </nav>
          <div className="trilho-pe">
            <nav aria-label="Escritório">
              {escritorio?.dono ? (
                <a className="item" href={ROTAS_PORTAL.equipe} aria-current={atualDe("equipe", atual, false)}>
                  <Icone nome="cracha" className="ico" />
                  Equipe
                </a>
              ) : null}
              <a className="item" href={ROTAS_PORTAL.escritorio} aria-current={atualDe("escritorio", atual, false)}>
                <Icone nome="coluna" className="ico" />
                Escritório
              </a>
              <a className="item" href={ROTAS_PORTAL.ajuda} aria-current={atualDe("ajuda", atual, false)}>
                <Icone nome="ajuda" className="ico" />
                Ajuda
              </a>
            </nav>
            <div className="quem">
              <span className="av" aria-hidden="true">
                {escritorio ? iniciais(escritorio.pessoa).slice(0, 1) : ""}
              </span>
              <span>
                <strong>{escritorio?.pessoa ?? " "}</strong>
                <small>{papel}</small>
              </span>
              <button className="sair" type="button" onClick={sair} disabled={saindo} aria-label="Sair do Portal">
                <Icone nome="sair" className="ico" />
              </button>
            </div>
          </div>
        </aside>

        <div className="palco">
          {escritorio && soConsulta(escritorio) && atual !== "escritorio" ? <TiraSoConsulta e={escritorio} /> : null}
          <header className="topo">
            <nav className="trilha" aria-label="Você está em">
              {trilha.map((t, i) => (
                <span key={`${t.nome}-${i}`} style={{ display: "contents" }}>
                  {i > 0 ? <Icone nome="dir" className="ico ico-s" /> : null}
                  {i === trilha.length - 1 ? <span aria-current="page">{t.nome}</span> : <a href={t.href}>{t.nome}</a>}
                </span>
              ))}
            </nav>
          </header>
          {barraArea ? <BarraArea {...barraArea} /> : null}
          <main className="conteudo" id="conteudo" tabIndex={-1}>
            {children}
          </main>
        </div>

        <nav className="pt-baixo" aria-label="Navegação do celular">
          {COMUNS.filter((i) => NO_CELULAR_EMBAIXO.includes(i.chave)).map((i) => (
            <a key={i.nome} href={i.href} aria-current={atualDe(i.chave, atual, false)}>
              <Icone nome={i.icone} className="ico" />
              <span>{i.nome}</span>
            </a>
          ))}
          <button ref={abrirMais} type="button" aria-haspopup="dialog" aria-controls="folha-mais" onClick={abrirFolha}
            aria-current={atual && !NO_CELULAR_EMBAIXO.includes(atual) ? "true" : undefined}>
            <Icone nome="pontos" className="ico" />
            <span>Mais</span>
          </button>
        </nav>
      </div>

      <dialog ref={mais} className="janela pt-mais" id="folha-mais" aria-labelledby="folha-mais-t" onClose={() => abrirMais.current?.focus()}>
        <div className="janela-cabeca">
          <div>
            <p className="sobretitulo">{escritorio?.nome ?? ""}</p>
            <h2 id="folha-mais-t">Mais</h2>
          </div>
          <button className="fechar" type="button" aria-label="Fechar" onClick={() => mais.current?.close()}>
            <Icone nome="xis" className="ico" />
          </button>
        </div>
        <nav className="pt-mais-corpo" aria-label="Mais opções">
          <ul className="pt-ml">
            <li>
              <a className="pt-mi" href={ROTAS_PORTAL.clientes} aria-current={atualDe("clientes", atual, false)}>
                <Icone nome="pessoas" className="ico" />
                Clientes
                <Icone nome="dir" className="ico ico-s pt-ir" />
              </a>
            </li>
          </ul>
          {areas.length ? (
            <>
              <p className="pt-mg">Áreas</p>
              <ul className="pt-ml">
                {areas.map((a) => (
                  <li key={a}>{itemArea(a, "pt-mi")}</li>
                ))}
              </ul>
            </>
          ) : null}
          <p className="pt-mg">Escritório</p>
          <ul className="pt-ml">
            {escritorio?.dono ? (
              <li>
                <a className="pt-mi" href={ROTAS_PORTAL.equipe} aria-current={atualDe("equipe", atual, false)}>
                  <Icone nome="cracha" className="ico" />
                  Equipe
                  <Icone nome="dir" className="ico ico-s pt-ir" />
                </a>
              </li>
            ) : null}
            <li>
              <a className="pt-mi" href={ROTAS_PORTAL.escritorio} aria-current={atualDe("escritorio", atual, false)}>
                <Icone nome="coluna" className="ico" />
                Escritório
                <Icone nome="dir" className="ico ico-s pt-ir" />
              </a>
            </li>
            <li>
              <a className="pt-mi" href={ROTAS_PORTAL.ajuda} aria-current={atualDe("ajuda", atual, false)}>
                <Icone nome="ajuda" className="ico" />
                Ajuda
                <Icone nome="dir" className="ico ico-s pt-ir" />
              </a>
            </li>
          </ul>
          <p className="pt-mg">Sua conta</p>
          <div className="pt-conta">
            <span className="av-p forte" aria-hidden="true">
              {escritorio ? iniciais(escritorio.pessoa).slice(0, 1) : ""}
            </span>
            <span>
              <strong>{escritorio?.pessoa ?? " "}</strong>
              <small>{papel}</small>
            </span>
          </div>
          <ul className="pt-ml">
            <li>
              <a className="pt-mi" href={ROTAS_PORTAL.escolher}>
                <Icone nome="trocar" className="ico" />
                Trocar de escritório
                <Icone nome="dir" className="ico ico-s pt-ir" />
              </a>
            </li>
            <li>
              <button className="pt-mi" type="button" onClick={sair} disabled={saindo} style={{ width: "100%", border: 0, background: "transparent", font: "inherit", cursor: "pointer" }}>
                <Icone nome="sair" className="ico" />
                Sair
              </button>
            </li>
          </ul>
        </nav>
      </dialog>
    </div>
  );
}

/** Barra de seções da área, no alto: o nome da área e as seções. */
function BarraArea({ area, secao }: { area: AreaPortal; secao?: string }) {
  return (
    <div className="pt-barra-area">
      <p className="pt-area-nome">
        <Icone nome={ICONE_AREA[area]} className="ico" />
        {AREAS_PORTAL[area]}
      </p>
      <nav className="pt-secoes" aria-label={`Seções do ${AREAS_PORTAL[area]}`}>
        {SECOES_AREA[area].map((s) => (
          <a key={s.chave} href={rotaArea(area, s.chave)} aria-current={s.chave === secao ? "page" : undefined}>
            {s.nome}
          </a>
        ))}
      </nav>
    </div>
  );
}
