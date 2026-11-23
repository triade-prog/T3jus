"use client";
// Moldura do Portal do advogado em áreas (PA-01), tela aprovada em docs/design/aprovadas/portal-v1
// (moldura.html). No alto, o que todo mundo usa; no meio, só as áreas que o sócio dono liberou
// para a pessoa (a que não foi liberada nem aparece); embaixo, Equipe (só o dono), Escritório e
// Ajuda. No celular (até 760 px), uma barra fixa embaixo com Início, Conversas, Agenda e Mais;
// o Mais abre uma folha com o resto (Carol, 18/11/2026).

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AREAS_PORTAL, mesPorExtenso, type AreaPortal, type DadosEscritorioDocumentos, type DatasContrato } from "@t3jus/domain";
import { chamarApi } from "../api.ts";
import { Icone, type NomeIcone } from "../Icone.tsx";
import { LogoCompacto } from "../Marca.tsx";
import { iniciais } from "../console/tempo.ts";
import { ICONE_AREA, ORDEM_AREAS, rotaArea, SECOES_AREA } from "./areas.ts";
import type { CobrancaPortal } from "./PlanoFaturas.tsx";
import { BotaoSino, PainelSino, useSino } from "./Sino.tsx";

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
  /** O registro da sociedade na OAB, "OAB/SP 31.874" (F3.19, decisão 23); null se não há. */
  oabSociedade?: string | null;
  contatos: { nome: string; papel?: string | null; telefone?: string | null; email?: string | null }[];
  ultimaExportacao: { em: string; por: string | null } | null;
  /** O WhatsApp do escritório está ligado ao T3jus: os avisos saem pela fila (F3.19, F3.42). */
  whatsappLigado?: boolean;
  /** Contrato encerrado, nos 30 dias só para consulta (F0.14); fora disso, null. */
  encerramento?: DatasContrato | null;
  /** A cobrança do T3jus: só consulta por atraso e o aviso de fatura vencida (F1.20, CO-06). */
  cobranca?: CobrancaPortal | null;
  /** Conversas que esperam alguém da equipe (o número no trilho e na barra do celular). */
  conversasEsperando?: number;
  /** A versão do escritório, para salvar os dados (PA-07). */
  versao?: number;
  /** Os dados do escritório para os documentos (PA-07, 0860). */
  documentos?: DadosEscritorioDocumentos;
  /** A última mudança dos dados do escritório: quando, quem e onde (Portal ou Console). */
  dadosMudados?: { em: string; por: string | null; onde: "PORTAL" | "CONSOLE" | null } | null;
}

/**
 * Só consulta: o contrato terminou, ou a equipe T3jus deixou o Portal só para consulta por
 * fatura em atraso (CO-06). Ninguém cria nem muda nada (o banco recusa também).
 */
export const soConsulta = (e: Pick<EscritorioPortal, "encerramento" | "cobranca"> | null) => !!e?.encerramento || !!e?.cobranca?.soConsultaDesde;

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

/**
 * As faixas da cobrança, no alto de todas as páginas (desenho, 25 e 26): o sócio dono vê o
 * atraso (de 7 dias em diante) e o só consulta, com "Ver e pagar"; a equipe vê só o só
 * consulta, sem valores, e com quem falar.
 */
function TiraCobranca({ e }: { e: EscritorioPortal }) {
  const c = e.cobranca;
  if (!c) return null;
  const pagar = `${ROTAS_PORTAL.escritorio}#plano`;
  if (c.soConsultaDesde) {
    if (c.veFaturas) {
      return (
        <div className="fc-tira" role="note" aria-label="Situação do Portal">
          <Icone nome="cadeado" className="ico" />
          <span>
            <b>Portal só para consulta desde {diaBr(c.soConsultaDesde)}.</b> Há faturas em atraso. Ao pagar, tudo volta ao normal na hora; nenhum dado foi apagado.
          </span>
          <a href={pagar}>Ver e pagar</a>
        </div>
      );
    }
    return (
      <div className="fc-tira" role="note" aria-label="Situação do Portal">
        <Icone nome="cadeado" className="ico" />
        <span>
          <b>Portal só para consulta.</b> O escritório tem uma pendência com o T3jus. Você continua vendo tudo, mas não cria nem muda nada. Para voltar ao normal,
          fale com {c.socioDono ? `${c.socioDono}, quem cuida do escritório` : "o sócio dono"}.
        </span>
      </div>
    );
  }
  if (c.atraso && c.veFaturas) {
    return (
      <div className="cb-tira-atraso" role="note" aria-label="Fatura em atraso">
        <Icone nome="relogio" className="ico" />
        <span>
          <b>
            A fatura de {mesPorExtenso(c.atraso.competencia, true)} venceu em {diaBr(c.atraso.vencimento)}.
          </b>{" "}
          Só o sócio dono vê este aviso.
        </span>
        <a href={pagar}>Ver e pagar</a>
      </div>
    );
  }
  return null;
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
  /** Sua conta: os próprios dados e a OAB, só para ler (EX-12, decisão 7 da OAB). */
  conta: "/conta",
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

/*
 * O escritório da sessão fica guardado na memória da aba enquanto a pessoa navega pelo Portal
 * sem recarregar a página: a tela nova mostra na hora o que já veio e confere de novo por trás
 * (no máximo a cada FRESCOR_MS). Várias partes da mesma tela pedindo juntas viram uma chamada
 * só. Recarregar a página, sair ou trocar de escritório (sempre com recarga) limpa tudo.
 */
const FRESCOR_MS = 15_000;
type FotoEscritorio = { escritorio: EscritorioPortal | null; erro: boolean };
const escritorioGuardado: { foto: FotoEscritorio; em: number; emVoo: Promise<void> | null } = {
  foto: { escritorio: null, erro: false }, em: 0, emVoo: null,
};
const FOTO_VAZIA: FotoEscritorio = { escritorio: null, erro: false };
const ouvintesEscritorio = new Set<() => void>();
const avisarEscritorio = (foto: FotoEscritorio) => {
  escritorioGuardado.foto = foto;
  for (const f of ouvintesEscritorio) f();
};

function buscarEscritorio(forcar = false): Promise<void> {
  const g = escritorioGuardado;
  if (g.emVoo) return g.emVoo;
  if (!forcar && g.foto.escritorio && Date.now() - g.em < FRESCOR_MS) return Promise.resolve();
  g.emVoo = chamarPortal<EscritorioPortal>("/v1/escritorio").then((r) => {
    g.emVoo = null;
    if (r.ok) {
      g.em = Date.now();
      avisarEscritorio({ escritorio: r.dados, erro: false });
    } else if (r.status !== 401 && r.erro.codigo !== "ESCRITORIO_REQUIRED" && !g.foto.escritorio) {
      // Com o escritório já na tela, uma falha na conferência de fundo não apaga nada.
      avisarEscritorio({ escritorio: null, erro: true });
    }
  });
  return g.emVoo;
}

// Começa a buscar o escritório assim que o código do Portal chega ao navegador, antes de a tela
// ligar, para os dados da tela não esperarem uma viagem a mais. Fora das telas de entrada.
if (typeof window !== "undefined" && !/^\/(entrar|criar-senha|redefinir|escritorio)(\/|$)/.test(window.location.pathname)) {
  void buscarEscritorio();
}

function assinarEscritorio(f: () => void) {
  ouvintesEscritorio.add(f);
  return () => {
    ouvintesEscritorio.delete(f);
  };
}

/** O escritório da sessão (GET /v1/escritorio): null enquanto carrega; "erro" se falhar. */
export function useEscritorioPortal(): { escritorio: EscritorioPortal | null; erro: boolean; recarregar: () => void } {
  // Na primeira montagem depois do servidor, a foto vazia (a mesma do servidor); depois, a guardada.
  const foto = useSyncExternalStore(assinarEscritorio, () => escritorioGuardado.foto, () => FOTO_VAZIA);
  useEffect(() => {
    void buscarEscritorio();
  }, []);
  const recarregar = useCallback(() => {
    if (escritorioGuardado.foto.erro) avisarEscritorio(FOTO_VAZIA);
    void buscarEscritorio(true);
  }, []);
  return { escritorio: foto.escritorio, erro: foto.erro, recarregar };
}

/*
 * Troca de tela sem recarregar a página. Os links do Portal são links comuns (<a href>); a
 * moldura pega o clique num link interno e pede só a tela nova ao Next, sem jogar fora o
 * JavaScript, o escritório e o sino que já estão na aba. Continuam com recarga completa: as
 * telas de entrada e a escolha do escritório (a sessão muda), os arquivos da /api, os links
 * para fora, os que abrem em outra aba ou baixam, os com tecla de atalho, os com ? e os que
 * levam à mesma página.
 */
const SEMPRE_RECARREGA = /^\/(entrar|criar-senha|redefinir|escritorio|api)(\/|$)/;

function linkInterno(alvo: EventTarget | null): URL | null {
  const a = alvo instanceof Element ? alvo.closest("a") : null;
  if (!a || !a.getAttribute("href") || (a.target && a.target !== "_self") || a.hasAttribute("download")) return null;
  const u = new URL(a.href, window.location.href);
  if (u.origin !== window.location.origin || SEMPRE_RECARREGA.test(u.pathname)) return null;
  // Endereço com ?: a tela lê o pedido ao abrir (a conversa, o dia da agenda); a mesma tela:
  // recarregar é o jeito de ver os dados de novo. Nos dois casos, recarga completa, como antes.
  if (u.search || u.pathname === window.location.pathname) return null;
  return u;
}

function useNavegarSemRecarga() {
  const router = useRouter();
  useEffect(() => {
    const clicar = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const u = linkInterno(e.target);
      if (!u) return;
      e.preventDefault();
      router.push(`${u.pathname}${u.search}${u.hash}`);
    };
    // Na janela, depois dos cliques das telas: quem já tratou o clique (preventDefault) fica como está.
    window.addEventListener("click", clicar);
    return () => window.removeEventListener("click", clicar);
  }, [router]);
}

export type LugarPortal = "inicio" | "conversas" | "clientes" | "agenda" | "equipe" | "escritorio" | "ajuda" | "conta" | AreaPortal | null;

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
  barra,
  pagina = "",
  children,
}: {
  atual: LugarPortal;
  /** Caminho na barra do topo; o último é a página atual. */
  trilha: { nome: string; href?: string }[];
  escritorio: EscritorioPortal | null;
  /** Área aberta e a seção atual: mostra a barra de seções no alto. */
  barraArea?: { area: AreaPortal; secao?: string };
  /** Barra de seções de uma área comum (Conversas), no mesmo lugar da barra de área. */
  barra?: ReactNode;
  /** Classes da página (co-equipe co-carteira, por exemplo). */
  pagina?: string;
  children: ReactNode;
}) {
  useNavegarSemRecarga();
  const [saindo, setSaindo] = useState(false);
  const mais = useRef<HTMLDialogElement>(null);
  const abrirMais = useRef<HTMLButtonElement>(null);
  const areas = ORDEM_AREAS.filter((a) => escritorio?.areas.includes(a));
  // O sino (F3.57): um painel para os dois botões (o do topo e o da barra do celular).
  const sino = useSino();
  const [sinoAberto, setSinoAberto] = useState(false);
  const sinoQueAbriu = useRef<HTMLButtonElement | null>(null);
  const novos = sino.lista && sino.lista !== "erro" ? sino.lista.novos : 0;
  const clicarSino = (b: HTMLButtonElement) => {
    sinoQueAbriu.current = b;
    setSinoAberto((x) => !x);
  };
  const fecharSino = useCallback(() => {
    setSinoAberto(false);
    sinoQueAbriu.current?.focus();
  }, []);

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
  const esperando = escritorio?.conversasEsperando ?? 0;
  const contador = (cls: string, chave: LugarPortal) =>
    chave === "conversas" && esperando > 0 ? (
      <span className={cls} aria-label={`, ${esperando} ${esperando === 1 ? "esperando" : "esperando"}`}>{esperando}</span>
    ) : null;
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
          <BotaoSino cls="bb" novos={novos} aberto={sinoAberto} aoClicar={clicarSino} />
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
                {contador("cont", i.chave)}
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
              <a className="oe-quem" href={ROTAS_PORTAL.conta} aria-current={atualDe("conta", atual, false)}>
                <span className="av" aria-hidden="true">
                  {escritorio ? iniciais(escritorio.pessoa).slice(0, 1) : ""}
                </span>
                <span>
                  <strong>{escritorio?.pessoa ?? " "}</strong>
                  <small>{papel}</small>
                  <span className="sr">, sua conta</span>
                </span>
              </a>
              <button className="sair" type="button" onClick={sair} disabled={saindo} aria-label="Sair do Portal">
                <Icone nome="sair" className="ico" />
              </button>
            </div>
          </div>
        </aside>

        <div className="palco">
          {escritorio?.encerramento ? (atual !== "escritorio" ? <TiraSoConsulta e={escritorio} /> : null) : escritorio ? <TiraCobranca e={escritorio} /> : null}
          <header className="topo">
            <nav className="trilha" aria-label="Você está em">
              {trilha.map((t, i) => (
                <span key={`${t.nome}-${i}`} style={{ display: "contents" }}>
                  {i > 0 ? <Icone nome="dir" className="ico ico-s" /> : null}
                  {i === trilha.length - 1 ? <span aria-current="page">{t.nome}</span> : <a href={t.href}>{t.nome}</a>}
                </span>
              ))}
            </nav>
            <BotaoSino cls="icone-botao" novos={novos} aberto={sinoAberto} aoClicar={clicarSino} />
          </header>
          {barraArea ? <BarraArea {...barraArea} dono={!!escritorio?.dono} /> : barra ?? null}
          <main className="conteudo" id="conteudo" tabIndex={-1}>
            {children}
          </main>
        </div>

        <nav className="pt-baixo" aria-label="Navegação do celular">
          {COMUNS.filter((i) => NO_CELULAR_EMBAIXO.includes(i.chave)).map((i) => (
            <a key={i.nome} href={i.href} aria-current={atualDe(i.chave, atual, false)}>
              <Icone nome={i.icone} className="ico" />
              <span>{i.nome}</span>
              {contador("pt-cont", i.chave)}
            </a>
          ))}
          <button ref={abrirMais} type="button" aria-haspopup="dialog" aria-controls="folha-mais" onClick={abrirFolha}
            aria-current={atual && !NO_CELULAR_EMBAIXO.includes(atual) ? "true" : undefined}>
            <Icone nome="pontos" className="ico" />
            <span>Mais</span>
          </button>
        </nav>
      </div>

      <PainelSino sino={sino} aberto={sinoAberto} aoFechar={fecharSino} />

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
              <a className="pt-mi" href={ROTAS_PORTAL.conta} aria-current={atualDe("conta", atual, false)}>
                <Icone nome="cracha" className="ico" />
                Sua conta
                <Icone nome="dir" className="ico ico-s pt-ir" />
              </a>
            </li>
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
function BarraArea({ area, secao, dono }: { area: AreaPortal; secao?: string; dono: boolean }) {
  return (
    <div className="pt-barra-area">
      <p className="pt-area-nome">
        <Icone nome={ICONE_AREA[area]} className="ico" />
        {AREAS_PORTAL[area]}
      </p>
      <nav className="pt-secoes" aria-label={`Seções do ${AREAS_PORTAL[area]}`}>
        {SECOES_AREA[area].filter((s) => dono || !s.soDono).map((s) => (
          <a key={s.chave} href={rotaArea(area, s.chave)} aria-current={s.chave === secao ? "page" : undefined}>
            {s.nome}
          </a>
        ))}
      </nav>
    </div>
  );
}
