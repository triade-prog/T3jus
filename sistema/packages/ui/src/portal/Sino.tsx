"use client";
// O sino de avisos do Portal (F3.57; PD-07, PA-01, PT-03). Tela aprovada em
// docs/design/aprovadas/portal-sem-avisos-sino (sino.html). O botão fica na moldura (no topo do
// computador e na barra vinho do celular), com o ponto quando há aviso novo e o número no rótulo.
// No computador o painel desce do sino sem cobrir a página; no celular ocupa a tela. Cada aviso
// leva ao lugar certo e, ao abrir, fica lido. Decisões da Carol (20/11/2026): só o ponto no sino,
// só no sino (sem e-mail), 30 dias, sem desligar tipos, abrir marca lido.

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { AvisoSino, ListaAvisosSino } from "@t3jus/domain";
import { Icone, type NomeIcone } from "../Icone.tsx";
import { Aviso, Estado } from "../console/pecas.tsx";
import { hora } from "../console/tempo.ts";
import { chamarPortal } from "./Moldura.tsx";
import { valorDaProposta } from "./comercial.ts";
import { ROTAS_CONTRATOS } from "./contratos.ts";

const FUSO = "America/Sao_Paulo";
const diaDe = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
const MOTIVOS_IA: Record<string, string> = {
  PROPOSTA_ACORDO: "Proposta de acordo.", DOCUMENTO_NOVO: "Chegou um documento.", CLIENTE_NOVO: "Pode ser um cliente novo.", VALOR: "Pergunta de valor.",
  ESTRATEGIA: "Pergunta sobre a estratégia do caso.", RECLAMACAO: "Reclamação.", PEDIU_PESSOA: "Pediu para falar com uma pessoa.", OUTRO: "A IA não soube responder.",
};

/** Rótulo do dia: Hoje, Ontem · 17/11 ou 16/11. */
export function rotuloDia(iso: string, agora = new Date()): string {
  const d = diaDe(iso);
  const hoje = diaDe(agora.toISOString());
  const ontem = diaDe(new Date(agora.getTime() - 86_400_000).toISOString());
  const curto = `${d.slice(8, 10)}/${d.slice(5, 7)}`;
  return d === hoje ? "Hoje" : d === ontem ? `Ontem · ${curto}` : curto;
}

/** "a petição “Recurso ordinário”" (sem artigo do modelo, que pode ser masculino ou feminino). */
const minuscula = (m?: string) => (m ? `a petição “${m}”` : "a petição");

/** O que cada aviso diz: ícone, título, detalhe, destino e selo. */
export function descreverAviso(a: AvisoSino): { icone: NomeIcone; titulo: ReactNode; detalhe: ReactNode; onde: string; href: string; selo?: { tom: string; texto: string } } {
  const d = a.dados;
  const conversa = `/conversas?c=${a.origemId}`;
  const automacao = `/conversas/automacoes?a=${a.origemId}`;
  const peticao = `/juridico/peticoes/${a.origemId}`;
  const fala = (t?: string) => (t ? <q>{t}</q> : null);
  switch (a.tipo) {
    case "CONVERSA_IA":
      return {
        icone: "ia", titulo: <>A IA passou a conversa de <b>{d.contato ?? d.conversa}</b> para você</>,
        detalhe: <>{d.trecho ? fala(d.trecho) : MOTIVOS_IA[d.motivo ?? "OUTRO"]}{d.contato && d.conversa ? ` ${d.conversa}` : ""}</>,
        onde: "Abrir a conversa", href: conversa,
      };
    case "CONVERSA_ASSUMIDA":
      return {
        icone: "mao", titulo: <><b>{d.quem ?? "Alguém da equipe"}</b> assumiu a conversa de {d.conversa}, que era sua</>,
        detalhe: "A troca ficou registrada na conversa.", onde: "Abrir a conversa", href: conversa,
      };
    case "CONVERSA_PASSADA":
      return {
        icone: "trocar", titulo: <><b>{d.quem ?? "Alguém da equipe"}</b> passou a conversa de {d.conversa} para você</>,
        detalhe: d.recado ? fala(d.recado) : "Sem recado.", onde: "Abrir a conversa", href: conversa,
      };
    case "AUTOMACAO_SUGESTAO":
      return {
        icone: "lapis", titulo: <><b>{d.quem ?? "Alguém da equipe"}</b> sugeriu uma mudança em “{d.automacao}”</>,
        detalhe: fala(d.texto), onde: "Ver a sugestão", href: automacao,
      };
    case "MODELO_RECUSADO":
      return {
        icone: "alerta", titulo: <>A Meta recusou o texto “{d.modelo ?? d.automacao}”</>,
        detalhe: `${d.motivo ? `Motivo informado: ${d.motivo.replace(/\.$/, "")}. ` : ""}A automação “${d.automacao}” não ligou; nada foi enviado.`,
        onde: "Corrigir o texto", href: automacao, selo: { tom: "urgente", texto: "Recusado" },
      };
    case "MODELO_APROVADO":
      return {
        icone: "check", titulo: <>A Meta aprovou os textos de “{d.automacao}”</>,
        detalhe: `A automação ${d.automacao} já está funcionando.`, onde: "Ver a automação", href: automacao, selo: { tom: "ok", texto: "Aprovado" },
      };
    case "PETICAO_REVISAR":
      return {
        icone: "pena",
        titulo: d.passadaPor
          ? <><b>{d.passadaPor}</b> passou para você a revisão de {minuscula(d.modelo)} de {d.caso}</>
          : <><b>{d.quem ?? "Alguém da equipe"}</b> mandou {minuscula(d.modelo)} de {d.caso} para você revisar</>,
        detalhe: d.motivo ? fala(d.motivo) : d.versao && d.versao > 1 ? `Versão ${d.versao}, depois do ajuste.` : "Só fica pronta depois que você aprovar.",
        onde: "Revisar a petição", href: peticao, selo: { tom: "andamento", texto: "Revisar" },
      };
    case "PETICAO_DECIDIDA":
      return {
        icone: d.decisao === "APROVADA" ? "check" : d.decisao === "AJUSTE" ? "lapis" : "xis",
        titulo: <><b>{d.quem ?? "Quem revisou"}</b> {d.decisao === "APROVADA" ? "aprovou" : d.decisao === "AJUSTE" ? "pediu ajuste em" : "reprovou"} {minuscula(d.modelo)} de {d.caso}</>,
        detalhe: d.decisao === "APROVADA" ? "Ficou pronta e entrou nos documentos do caso." : d.decisao === "AJUSTE" ? "Veja os comentários e mande a versão nova." : "Ficou guardada com o motivo.",
        onde: d.decisao === "AJUSTE" ? "Ver o que ajustar" : "Abrir a petição", href: peticao,
        selo: d.decisao === "APROVADA" ? { tom: "ok", texto: "Aprovada" } : d.decisao === "AJUSTE" ? { tom: "atencao", texto: "Ajuste pedido" } : { tom: "neutro", texto: "Reprovada" },
      };
    case "PETICAO_PASSADA":
      return {
        icone: "trocar", titulo: <><b>{d.quem ?? "Quem revisava"}</b> passou a revisão de {minuscula(d.modelo)} de {d.caso} para {d.para ?? "outro advogado"}</>,
        detalhe: "Ela continua em revisão.", onde: "Abrir a petição", href: peticao,
      };
    case "BASE_DO_MES":
      // CH-06: no dia de pedir a base do percentual recorrente; informar fica em Honorários.
      return {
        icone: "relogio", titulo: <>Pedir a base do mês: <b>{d.cliente}</b>{d.contrato ? ` · ${d.contrato}` : ""}</>,
        detalhe: [d.sobre ? `${d.sobre}${d.mes && d.de ? `, mês ${d.mes} de ${d.de}` : ""}.` : null,
          d.vencimento ? `Sem a base, a cobrança de ${d.vencimento.split("-").reverse().join("/")} não sai.` : null].filter(Boolean).join(" "),
        onde: "Informar a base", href: "/contratos/honorarios", selo: { tom: "atencao", texto: "Base do mês" },
      };
    case "PEDIDO_CONTRATO": {
      // IN-01: o Comercial pediu o contrato da proposta aceita; gerar abre o Novo contrato preenchido.
      const valor = d.condicoes?.length ? valorDaProposta(d.condicoes) : null;
      return {
        icone: "pena", titulo: <><b>{d.quem}</b> pediu o contrato de <b>{d.cliente}</b></>,
        detalhe: `Proposta ${d.proposta}${d.servico ? `, ${d.servico.toLowerCase()}` : ""}${d.aceita ? `, aceita em ${d.aceita.slice(8, 10)}/${d.aceita.slice(5, 7)}` : ""}${valor ? `: ${valor}` : ""}. O contrato nasce com as condições da proposta.`,
        onde: "Gerar o contrato", href: ROTAS_CONTRATOS.daProposta(a.origemId), selo: { tom: "andamento", texto: "Pedido" },
      };
    }
    case "CONTRATO_GERADO":
      return {
        icone: "check", titulo: <><b>{d.quem}</b> gerou o contrato de <b>{d.cliente}</b></>,
        detalhe: `O contrato ${d.contrato} nasceu da proposta ${d.proposta}, que você pediu.`,
        onde: "Ver a proposta", href: ROTAS_CONTRATOS.proposta(a.origemId), selo: { tom: "ok", texto: "Contrato gerado" },
      };
    case "REPASSE_PASSADO":
      // F3.71: quem entra recebe o aviso novo; quem sai, o aviso já lido.
      return d.entrou
        ? {
            icone: "trocar", titulo: <><b>{d.quem ?? "Alguém da equipe"}</b> passou para você o repasse de <b>{d.cliente}</b></>,
            detalhe: [d.motivo ? `“${d.motivo}”` : null, d.partes ? `${d.partes === 1 ? "Falta 1 parte" : `Faltam ${d.partes} partes`}.` : null].filter(Boolean).join(" ") || "Agora os prazos e atrasos deste repasse chegam para você.",
            onde: "Abrir o repasse", href: `/financeiro/repasses/${a.origemId}`,
          }
        : {
            icone: "trocar", titulo: <><b>{d.quem ?? "Alguém da equipe"}</b> passou o repasse de {d.cliente} para {d.para ?? "outra pessoa"}</>,
            detalhe: "Você deixa de receber os avisos deste repasse.", onde: "Abrir o repasse", href: `/financeiro/repasses/${a.origemId}`,
          };
    case "REPASSE_ATRASADO":
      // F3.46: a parte passou do prazo; quem cuida anota o motivo e a próxima ação.
      return {
        icone: "alerta", titulo: <>O repasse de <b>{d.parte}</b>{d.cliente && d.cliente !== d.parte ? ` (${d.cliente})` : ""} passou do prazo</>,
        detalhe: `${d.prazo ? `Era ${d.prazo.split("-").reverse().slice(0, 2).join("/")}. ` : ""}Anote o motivo e a próxima ação na ficha do repasse.`,
        onde: "Anotar o atraso", href: `/financeiro/repasses/${a.origemId}`, selo: { tom: "urgente", texto: "Atrasado" },
      };
    case "REPASSE_PROXIMA_ACAO":
      return {
        icone: "relogio", titulo: <>Hoje: {d.oQue ? d.oQue.replace(/^./, (c) => c.toLowerCase()) : "a próxima ação"} · <b>{d.parte}</b></>,
        detalhe: `Repasse atrasado${d.cliente ? ` de ${d.cliente}` : ""}. Se mudou, atualize a anotação.`,
        onde: "Abrir o repasse", href: `/financeiro/repasses/${a.origemId}`, selo: { tom: "atencao", texto: "Próxima ação" },
      };
    case "PRAZO_2_DIAS":
      return {
        icone: "relogio", titulo: <>Prazo em 2 dias: <b>{d.prazo}</b>{d.cliente ? ` de ${d.cliente}` : ""}</>,
        detalhe: [d.vence ? `Vence ${d.vence}.` : null, "Responsável: você.", d.processo ? `Proc. ${d.processo}.` : null].filter(Boolean).join(" "),
        onde: "Abrir o prazo", href: "/juridico/prazos", selo: { tom: "atencao", texto: "em 2 dias" },
      };
  }
}

/** O estado do sino, compartilhado pelos dois botões (topo e barra do celular). */
export function useSino() {
  const [lista, setLista] = useState<ListaAvisosSino | "erro" | null>(null);
  const carregar = useCallback(async () => {
    const r = await chamarPortal<ListaAvisosSino>("/v1/escritorio/avisos");
    setLista((antes) => (r.ok ? r.dados : antes && antes !== "erro" ? antes : "erro"));
    return r.ok;
  }, []);
  useEffect(() => {
    void Promise.resolve().then(() => carregar());
  }, [carregar]);
  return { lista, setLista, carregar };
}

/** O botão do sino: o ponto quando há novo; o número vai no rótulo. */
export function BotaoSino({ cls, novos, aberto, aoClicar }: { cls: "icone-botao" | "bb"; novos: number; aberto: boolean; aoClicar: (b: HTMLButtonElement) => void }) {
  return (
    <button className={cls} type="button" aria-label={novos ? `Avisos, ${novos} ${novos === 1 ? "novo" : "novos"}` : "Avisos, nenhum novo"}
      aria-haspopup="dialog" aria-controls="painel-avisos" aria-expanded={aberto} onClick={(e) => aoClicar(e.currentTarget)}>
      <Icone nome="sino" className="ico" />
      {novos ? <span className="ponto" /> : null}
    </button>
  );
}

export function PainelSino({ sino, aberto, aoFechar }: {
  sino: ReturnType<typeof useSino>;
  aberto: boolean;
  aoFechar: () => void;
}) {
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
    const r = await chamarPortal<ListaAvisosSino>("/v1/escritorio/avisos/lidos", { corpo: { ate: lista.itens[0]!.em } });
    setMarcando(false);
    if (r.ok) { setLista(r.dados); setMsg(r.dados.marcados ?? 0); setFiltro("todos"); }
  }

  // Abrir o aviso marca como lido e leva ao lugar certo (com Ctrl ou numa aba nova, marca e deixa abrir).
  async function abrirAviso(e: React.MouseEvent<HTMLAnchorElement>, a: AvisoSino) {
    if (a.lido) return;
    const novaAba = e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0;
    if (novaAba) { void chamarPortal(`/v1/escritorio/avisos/${a.id}/lido`, { corpo: {} }); return; }
    e.preventDefault();
    const destino = e.currentTarget.href;
    await chamarPortal(`/v1/escritorio/avisos/${a.id}/lido`, { corpo: {} });
    window.location.assign(destino);
  }

  const ok = lista && lista !== "erro" ? lista : null;
  const novos = ok?.novos ?? 0;
  const itens = (ok?.itens ?? []).filter((a) => filtro === "todos" || !a.lido);
  const grupos: { dia: string; itens: AvisoSino[] }[] = [];
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
  } else if (!ok.total) {
    conteudo = (
      <Estado icone="sino" titulo="Nenhum aviso por enquanto.">
        Chega aqui o que pede você: uma conversa passada para você, um prazo seu que vence em 2 dias, uma decisão que só você toma. Cada aviso leva ao lugar certo.
      </Estado>
    );
  } else {
    conteudo = grupos.map((g) => (
      <div key={g.dia}>
        <h3 className="si-dia">{g.dia}</h3>
        <ul className="si-ul">
          {g.itens.map((a) => {
            const x = descreverAviso(a);
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
          <span>Os avisos ficam aqui por 30 dias. Marcar como lido não apaga nada, e o que o aviso conta continua no lugar de origem.</span>
        </p>
      )}
    </dialog>
  );
}
