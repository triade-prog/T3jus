"use client";
// O sino do Console (F2.6; SC-02, SC-05), tela aprovada em
// docs/design/aprovadas/console-interessado-sino. Segue o sino aprovado do Portal (o mesmo CSS
// si-): no computador o painel desce do sino sem cobrir a página; no celular ocupa a tela. Nesta
// versão chegam três avisos, todos de interessado: o pedido novo do site (para todos que veem
// Interessados), o interessado passado para você e o próximo passo vencido (uma vez, às 7h do dia
// seguinte). Quem não vê Interessados tem o sino vazio, com o porquê.

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { TAMANHOS_INTERESSADO, type AvisoConsole, type ListaAvisosConsole } from "@t3jus/domain";
import { Icone, type NomeIcone } from "../Icone.tsx";
import { diaMes } from "./interessados.ts";
import { chamarConsole, INTERESSADOS } from "./Moldura.tsx";
import { Aviso, Estado } from "./pecas.tsx";
import { hora } from "./tempo.ts";

const FUSO = "America/Sao_Paulo";
const diaDe = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
const hojeIso = () => diaDe(new Date().toISOString());

/** Rótulo do dia: Hoje, Ontem · 20/11 ou 19/11 (o mesmo do sino do Portal). */
function rotuloDia(iso: string, agora = new Date()): string {
  const d = diaDe(iso);
  const curto = `${d.slice(8, 10)}/${d.slice(5, 7)}`;
  if (d === diaDe(agora.toISOString())) return "Hoje";
  return d === diaDe(new Date(agora.getTime() - 86_400_000).toISOString()) ? `Ontem · ${curto}` : curto;
}

/** O que cada aviso diz: ícone, título, detalhe, destino e selo. */
export function descreverAvisoConsole(a: AvisoConsole, hoje = hojeIso()): { icone: NomeIcone; titulo: ReactNode; detalhe: ReactNode; onde: string; href: string; selo?: { tom: string; texto: string } } {
  const d = a.dados;
  const href = `${INTERESSADOS}/${a.interessadoId ?? ""}`;
  switch (a.tipo) {
    case "INTERESSADO_NOVO": {
      const tam = d.tamanho ? `${TAMANHOS_INTERESSADO[d.tamanho]}${d.tamanho === "SO_EU" ? "" : " pessoas"}` : null;
      const quem = [d.nome, tam].filter(Boolean).join(" · ");
      return {
        icone: "maleta", titulo: <>Pedido de demonstração pelo site: <b>{d.escritorio}</b></>,
        detalhe: <>{d.trecho ? <><q>{d.trecho}</q> </> : null}{quem}{quem ? ". " : ""}{a.agora ? `Agora com ${a.agora}.` : d.prazo ? `Ninguém cuida ainda; o site promete resposta até ${diaMes(d.prazo, hoje)}.` : "Ninguém cuida ainda."}</>,
        onde: "Abrir o pedido", href, selo: a.agora ? undefined : { tom: "atencao", texto: "Sem responsável" },
      };
    }
    case "INTERESSADO_ATRIBUIDO":
      return {
        icone: "pessoa-mais", titulo: <><b>{d.quem ?? "Alguém da equipe"}</b> {d.cadastro ? "cadastrou para você" : "passou para você"} o interessado <b>{d.escritorio}</b></>,
        detalhe: d.recado ? <q>{d.recado}</q> : d.nome ? `${d.nome}. Agora o próximo passo é seu.` : "Agora o próximo passo é seu.",
        onde: "Abrir o interessado", href,
      };
    case "INTERESSADO_VENCIDO":
      return {
        icone: "relogio", titulo: <>Próximo passo vencido: <b>{d.passo}</b></>,
        detalhe: [[d.escritorio, d.nome].filter(Boolean).join(" · "), d.data ? `Venceu em ${d.data.slice(8, 10)}/${d.data.slice(5, 7)}.` : null,
          d.responsavel ? `Responsável: ${d.responsavel}.` : null].filter(Boolean).join(". ").replace(/\.\./g, "."),
        onde: "Abrir o interessado", href, selo: { tom: "urgente", texto: "Vencido" },
      };
  }
}

/** O estado do sino, compartilhado pelos dois botões (topo e barra do celular). */
export function useSinoConsole() {
  const [lista, setLista] = useState<ListaAvisosConsole | "erro" | null>(null);
  const carregar = useCallback(async () => {
    const r = await chamarConsole<ListaAvisosConsole>("/v1/avisos");
    // No erro, o ponto continua com a última contagem conhecida.
    setLista((antes) => (r.ok ? r.dados : antes && antes !== "erro" ? antes : "erro"));
    return r.ok;
  }, []);
  useEffect(() => {
    void Promise.resolve().then(() => carregar());
  }, [carregar]);
  return { lista, setLista, carregar };
}

/** O botão do sino: o ponto quando há novo; o número vai no rótulo. */
export function BotaoSinoConsole({ cls, novos, aberto, aoClicar }: { cls: "icone-botao cs-sino" | "bb"; novos: number; aberto: boolean; aoClicar: (b: HTMLButtonElement) => void }) {
  return (
    <button className={cls} type="button" aria-label={novos ? `Avisos, ${novos} ${novos === 1 ? "novo" : "novos"}` : "Avisos, nenhum novo"}
      aria-haspopup="dialog" aria-controls="painel-avisos" aria-expanded={aberto} onClick={(e) => aoClicar(e.currentTarget)}>
      <Icone nome="sino" className="ico" />
      {novos ? <span className="ponto" /> : null}
    </button>
  );
}

const EXPLICA = (
  <ul className="cs-explica">
    <li><Icone nome="maleta" className="ico" /><span>Um pedido de demonstração novo pelo site</span></li>
    <li><Icone nome="pessoa-mais" className="ico" /><span>Um interessado que alguém passou para você</span></li>
    <li><Icone nome="relogio" className="ico" /><span>O próximo passo de um interessado seu que venceu</span></li>
  </ul>
);

export function PainelSinoConsole({ sino, aberto, aoFechar }: { sino: ReturnType<typeof useSinoConsole>; aberto: boolean; aoFechar: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [filtro, setFiltro] = useState<"todos" | "novos">("todos");
  const [msg, setMsg] = useState<number | null>(null);
  const [marcando, setMarcando] = useState(false);
  const { lista, setLista, carregar } = sino;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberto && !d.open) {
      if (window.matchMedia("(max-width:760px)").matches) d.showModal();
      else d.show();
      d.focus();
      void carregar();
    } else if (!aberto && d.open) d.close();
  }, [aberto, carregar]);

  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") aoFechar(); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [aberto, aoFechar]);

  async function marcarTodos() {
    if (!lista || lista === "erro" || !lista.itens.length) return;
    setMarcando(true);
    const r = await chamarConsole<ListaAvisosConsole>("/v1/avisos/lidos", { corpo: { ate: lista.itens[0]!.em } });
    setMarcando(false);
    if (r.ok) { setLista(r.dados); setMsg(r.dados.marcados ?? 0); setFiltro("todos"); }
  }

  // Abrir o aviso marca como lido e leva à ficha (com Ctrl ou numa aba nova, marca e deixa abrir).
  async function abrirAviso(e: React.MouseEvent<HTMLAnchorElement>, a: AvisoConsole) {
    if (a.lido) return;
    const novaAba = e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0;
    if (novaAba) { void chamarConsole(`/v1/avisos/${a.id}/lido`, { corpo: {} }); return; }
    e.preventDefault();
    const destino = e.currentTarget.href;
    await chamarConsole(`/v1/avisos/${a.id}/lido`, { corpo: {} });
    window.location.assign(destino);
  }

  const ok = lista && lista !== "erro" ? lista : null;
  const novos = ok?.novos ?? 0;
  const itens = (ok?.itens ?? []).filter((a) => filtro === "todos" || !a.lido);
  const grupos: { dia: string; itens: AvisoConsole[] }[] = [];
  for (const a of itens) {
    const dia = rotuloDia(a.em);
    const g = grupos.at(-1);
    if (g && g.dia === dia) g.itens.push(a);
    else grupos.push({ dia, itens: [a] });
  }

  let conteudo: ReactNode;
  if (lista === "erro") {
    conteudo = (
      <Estado icone="alerta" erro titulo="Não deu para carregar os avisos"
        acoes={<button className="btn btn-pri" type="button" onClick={() => void carregar()}><Icone nome="reenviar" className="ico" />Tentar de novo</button>}>
        O servidor não respondeu. Nenhum aviso se perde: eles continuam guardados. Tente de novo em instantes.
      </Estado>
    );
  } else if (!ok) {
    conteudo = <p className="sr" role="status">Carregando os avisos…</p>;
  } else if (!ok.total && !ok.veInteressados) {
    conteudo = (
      <Estado icone="sino" titulo="Nenhum aviso para você por enquanto." acoes={
        <ul className="cs-explica">
          <li><Icone nome="cadeado" className="ico" /><span>Pedido de demonstração e interessado não chegam aqui: têm dados pessoais de quem pediu.</span></li>
          <li><Icone nome="carteira" className="ico" /><span>Em estudo: fatura de escritório em atraso, pedido de suporte novo e fim de contrato chegando.</span></li>
        </ul>
      }>
        Nesta primeira versão, o sino só avisa sobre interessados, que são da Administração e da Implantação. Os avisos do Financeiro e do Suporte entram depois.
      </Estado>
    );
  } else if (!ok.total) {
    conteudo = (
      <Estado icone="sino" titulo="Nenhum aviso por enquanto." acoes={EXPLICA}>
        Chega aqui o que pede você no Comercial. Cada aviso leva à ficha do interessado.
      </Estado>
    );
  } else {
    conteudo = grupos.map((g) => (
      <div key={g.dia}>
        <h3 className="si-dia">{g.dia}</h3>
        <ul className="si-ul">
          {g.itens.map((a) => {
            const x = descreverAvisoConsole(a);
            return (
              <li key={a.id} className={a.lido ? "si-item" : "si-item si-novo"}>
                <span className="si-ico" aria-hidden="true"><Icone nome={x.icone} className="ico" /></span>
                <div>
                  <p className="si-tit">
                    <a className="si-link" href={x.href} onClick={(e) => void abrirAviso(e, a)}>
                      {a.lido ? null : <span className="sr">Novo: </span>}
                      {x.titulo}
                    </a>
                  </p>
                  <p className="si-det">{x.detalhe}</p>
                  <p className="si-meta">
                    {a.lido ? null : <span className="si-nv">Novo</span>}
                    {x.selo ? <span className={`selo selo-${x.selo.tom}`}>{x.selo.texto}</span> : null}
                    <time dateTime={a.em}>{hora(a.em)}</time>
                    <span className="si-onde">{x.onde}<Icone nome="dir" className="ico ico-s" /></span>
                  </p>
                </div>
                {a.lido ? <span aria-hidden="true" /> : <span className="si-pto" aria-hidden="true" />}
              </li>
            );
          })}
        </ul>
      </div>
    ));
  }

  const conta = lista === "erro" ? "Não deu para carregar"
    : !ok ? " "
    : !ok.total ? "Nenhum aviso nos últimos 30 dias"
    : <>{novos ? <b>{novos} {novos === 1 ? "novo" : "novos"}</b> : "Nenhum novo"} · {ok.total} nos últimos 30 dias</>;

  return (
    <dialog ref={ref} className="si-painel" id="painel-avisos" aria-labelledby="si-t" tabIndex={-1} onClose={aoFechar}>
      <div className="si-cab">
        <div>
          <p className="sobretitulo">Para você</p>
          <h2 id="si-t">Avisos</h2>
          <p className="si-conta">{conta}</p>
        </div>
        <button className="fechar" type="button" aria-label="Fechar os avisos" onClick={aoFechar}>
          <Icone nome="xis" className="ico" />
        </button>
      </div>
      {ok && ok.total ? (
        <div className="si-ferr">
          <div className="chips" role="group" aria-label="Mostrar avisos">
            <button type="button" aria-pressed={filtro === "todos"} onClick={() => setFiltro("todos")}>Todos</button>
            <button type="button" aria-pressed={filtro === "novos"} onClick={() => setFiltro("novos")}>Não lidos <span className="q">{novos}</span></button>
          </div>
          {novos ? (
            <button className="btn btn-fantasma si-todos" type="button" onClick={() => void marcarTodos()} disabled={marcando}>
              <Icone nome="checks" className="ico" />
              Marcar todos como lidos
            </button>
          ) : (
            <span className="si-tudo-lido"><Icone nome="check" className="ico" />Tudo lido</span>
          )}
        </div>
      ) : null}
      <div className="si-lista">
        {msg !== null ? (
          <div className="si-msg">
            <Aviso tom="sucesso" titulo={msg === 1 ? "1 aviso marcado como lido." : `${msg} avisos marcados como lidos.`}>Eles continuam aqui, sem o destaque.</Aviso>
          </div>
        ) : null}
        {conteudo}
        {ok && ok.total && filtro === "novos" && !itens.length ? <p className="si-det" style={{ padding: "16px 24px" }}>Nenhum aviso sem ler.</p> : null}
      </div>
      {lista === "erro" ? null : (
        <p className="si-pe">
          <Icone nome="historico" className="ico" />
          <span>{ok && !ok.veInteressados
            ? "Os avisos ficam aqui por 30 dias. Marcar como lido não apaga nada, e o que o aviso conta continua no lugar de origem."
            : "Os avisos ficam aqui por 30 dias. Marcar como lido não apaga nada, e o que o aviso conta continua na ficha do interessado."}</span>
        </p>
      )}
    </dialog>
  );
}
