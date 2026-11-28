"use client";
// O sino do Console (F2.6; SC-02, SC-05), tela aprovada em
// docs/design/aprovadas/console-interessado-sino. Segue o sino aprovado do Portal (o mesmo CSS
// si-): no computador o painel desce do sino sem cobrir a página; no celular ocupa a tela. Nesta
// versão chegam três avisos de interessado: o pedido novo do site (para todos que veem
// Interessados), o interessado passado para você e o próximo passo vencido (uma vez, às 7h do dia
// seguinte). E um de cobrança (F1.22): a fatura de escritório em atraso, aos 7 e aos 30 dias, para
// a Administração e o Financeiro que atendem o escritório. Quem não vê nenhum dos dois tem o sino
// vazio, com o porquê.

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { diaComSemana, diaMesTeste, diaSeguinte, mesPorExtenso, TAMANHOS_INTERESSADO, type AvisoConsole, type ListaAvisosConsole } from "@t3jus/domain";
import { Icone, type NomeIcone } from "../Icone.tsx";
import { brl } from "./cobranca.ts";
import { diaMes } from "./interessados.ts";
import { CARTEIRA, chamarConsole, COBRANCA, INTERESSADOS } from "./Moldura.tsx";
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

/** A aba Assinatura do escritório do aviso do teste (sem o id, a carteira). */
const assinaturaDo = (escritorioId?: string) => (escritorioId ? `/clientes/${escritorioId}/assinatura` : "/");

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
    case "FATURA_ATRASO": {
      // Os dois marcos da régua aprovada (decisão 4 da cobrança): 7 dias e 30 dias.
      const dias = d.dias ?? 0;
      const consulta = d.marco === "CONSULTA";
      const fatura = [d.competencia ? `Fatura de ${mesPorExtenso(d.competencia)}` : "Fatura", typeof d.totalCentavos === "number" ? brl(d.totalCentavos) : null,
        d.vencimento ? `venceu em ${d.vencimento.slice(8, 10)}/${d.vencimento.slice(5, 7)}` : null].filter(Boolean).join(" · ");
      return {
        icone: "carteira", titulo: <>Fatura em atraso há {dias} {dias === 1 ? "dia" : "dias"}: <b>{d.escritorio ?? "escritório"}</b></>,
        detalhe: `${fatura}. ${consulta
          ? "Já dá para propor o Portal só para consulta, sempre com a sua confirmação."
          : "O Portal já mostra o aviso ao sócio dono."}`,
        onde: "Abrir a fatura", href: d.escritorioId && a.faturaId ? `${COBRANCA}/faturas/${d.escritorioId}/${a.faturaId}` : `${COBRANCA}/faturas`,
        selo: consulta ? { tom: "urgente", texto: `Em atraso · ${dias} dias` } : { tom: "atencao", texto: `Em atraso · ${dias} dias` },
      };
    }
    // O teste grátis (F1.34, CO-09), com os textos do desenho aprovado (teste-gratis, carteira.html,
    // sinos tg-admin e tg-financeiro). Todos levam à aba Assinatura do escritório.
    case "TESTE_COMECOU":
      return {
        icone: "relogio", titulo: <>O teste da <b>{d.escritorio ?? "escritório"}</b> começou</>,
        detalhe: `${d.origem === "LIBERADO" ? "Teste liberado pela Administração." : d.quem ? `Primeiro acesso de ${d.quem}.` : "Primeiro acesso de um sócio."}${d.fim ? ` Vai até ${diaComSemana(d.fim)}.` : ""}`,
        onde: "Abrir a assinatura", href: assinaturaDo(d.escritorioId),
      };
    case "TESTE_ACABANDO":
      return {
        icone: "relogio", titulo: <>O teste da <b>{d.escritorio ?? "escritório"}</b> acaba {d.fim ? `na ${diaComSemana(d.fim).replace("-feira", "")}` : "em breve"}</>,
        detalhe: `${d.prorrogado ? "Prorrogado. " : ""}${d.assinaturaPreparada ? "A assinatura está preparada." : "A assinatura ainda não foi preparada."}`,
        onde: "Abrir a assinatura", href: assinaturaDo(d.escritorioId),
      };
    case "TESTE_ACABOU":
      return {
        icone: "alerta", titulo: <>O teste da <b>{d.escritorio ?? "escritório"}</b> acabou sem assinar</>,
        detalhe: `${d.fim ? `Acabou em ${diaMesTeste(d.fim)}. Portal só para consulta desde ${diaMesTeste(diaSeguinte(d.fim))}. ` : ""}Proposta: encerrar como fim de contrato, com o motivo “teste não assinado”.`,
        onde: "Decidir", href: assinaturaDo(d.escritorioId), selo: { tom: "urgente", texto: "Propor encerrar" },
      };
    case "TESTE_QUER_ASSINAR":
      return {
        icone: "pena", titulo: <><b>{d.quem ?? "O sócio"}</b> pediu para assinar: <b>{d.escritorio ?? "escritório"}</b></>,
        detalhe: `Pelo Portal. ${d.assinaturaPreparada ? `A assinatura está preparada${d.plano ? ` (plano ${d.plano})` : ""}.` : "A assinatura ainda não foi preparada."}${d.fim ? d.acabou ? ` O teste acabou em ${diaMesTeste(d.fim)}.` : d.ultimoDia ? " Hoje é o último dia do teste: confirme antes da meia-noite." : ` O teste vai até ${diaComSemana(d.fim).replace("-feira", "")}.` : ""}`,
        onde: "Confirmar a assinatura", href: assinaturaDo(d.escritorioId),
        selo: d.urgente ? { tom: "urgente", texto: "Último dia" } : { tom: "atencao", texto: "Quer assinar" },
      };
    case "TESTE_REPETIDO":
      return {
        icone: "alerta", titulo: <>Teste repetido: <b>{d.escritorio ?? "escritório"}</b></>,
        detalhe: `${d.quem ?? "O sócio"} já foi sócio${d.anterior ? ` da ${d.anterior}` : " de outro escritório"}${d.anteriorInicio ? `, que teve teste em ${mesPorExtenso(d.anteriorInicio.slice(0, 7) + "-01", true)}` : ""}. O Portal ${d.escritorio ? `da ${d.escritorio} ` : ""}está só para consulta até a decisão.`,
        onde: "Liberar ou dispensar", href: assinaturaDo(d.escritorioId), selo: { tom: "atencao", texto: "Decidir" },
      };
    case "IMPLANTACAO_PRAZO": {
      // Os textos do desenho aprovado (console-implantacao, NOTAS.md item 9): 7, 3 e 0 dias.
      const dias = d.dias ?? 0;
      const quando = dias === 0 ? "vence hoje" : `vence em ${dias} dias`;
      const treino = typeof d.total === "number" ? ` (${d.treinadas ?? 0} de ${d.total} ${d.total === 1 ? "pessoa treinada" : "pessoas treinadas"})` : "";
      const faltam = d.faltam?.length ? `Faltam ${juntarNomes(d.faltam)}.`
        : d.total ? "Todas as pessoas foram treinadas: dá para concluir." : null;
      return {
        icone: "relogio", titulo: <>A implantação do escritório{d.escritorio ? <> <b>{d.escritorio}</b></> : null} {quando}{treino}</>,
        detalhe: [d.prazo && dias > 0 ? `Prazo: ${dataBr(d.prazo)}.` : null, faltam, d.responsavel ? `Quem acompanha: ${d.responsavel}.` : "Ninguém acompanha ainda."]
          .filter(Boolean).join(" "),
        // A aba Implantação entra com as telas (F1.47); até lá, a ficha abre no Contrato.
        onde: "Abrir a ficha", href: d.escritorioId ? `/clientes/${d.escritorioId}/contrato` : CARTEIRA,
        selo: dias === 0 ? { tom: "urgente", texto: "Vence hoje" } : { tom: "atencao", texto: `${dias} dias` },
      };
    }
    case "IMPLANTACAO_ISENCAO_FIM": {
      const dias = d.dias ?? 30;
      return {
        icone: "carteira", titulo: <>A isenção da implantação termina em {dias} {dias === 1 ? "dia" : "dias"}{d.isencaoAte ? `, em ${dataBr(d.isencaoAte)}` : ""}</>,
        detalhe: `Quem abrir a implantação a partir de ${d.cobradaDesde ? dataBr(d.cobradaDesde) : "então"} paga ${typeof d.valorCentavos === "number" ? brl(d.valorCentavos) : "a implantação"} à vista na 1ª fatura. Para manter grátis, mude a data de corte em Cobrança › Planos.`,
        onde: "Abrir a regra", href: `${COBRANCA}/planos`,
        selo: { tom: "atencao", texto: "Fim da isenção" },
      };
    }
    case "IMPLANTACAO_CARNE_RECUSADO":
      // Sem desenho próprio: segue o padrão do sino aprovado, à espera do ok da Carol.
      return {
        icone: "alerta", titulo: <>A 1ª fatura do escritório{d.escritorio ? <> <b>{d.escritorio}</b></> : null} não saiu: a implantação cobrada não vai no carnê</>,
        detalhe: [d.dia ? `A rotina da cobrança pulou o escritório em ${dataBr(d.dia)}.` : null,
          "Passe a assinatura para Pix ou boleto e a 1ª fatura sai com a implantação à vista.",
          d.responsavel ? `Quem acompanha: ${d.responsavel}.` : null].filter(Boolean).join(" "),
        onde: "Abrir a assinatura", href: d.escritorioId ? `/clientes/${d.escritorioId}/assinatura` : CARTEIRA,
        selo: { tom: "urgente", texto: "Fatura parada" },
      };
  }
}

/** 2026-12-31 → 31/12/2026. */
const dataBr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
/** ["A", "B", "C"] → "A, B e C". */
const juntarNomes = (n: string[]) => (n.length > 1 ? `${n.slice(0, -1).join(", ")} e ${n[n.length - 1]}` : n[0] ?? "");

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

function Explica({ interessados, cobranca }: { interessados: boolean; cobranca: boolean }) {
  return (
    <ul className="cs-explica">
      {interessados ? (
        <>
          <li><Icone nome="maleta" className="ico" /><span>Um pedido de demonstração novo pelo site</span></li>
          <li><Icone nome="pessoa-mais" className="ico" /><span>Um interessado que alguém passou para você</span></li>
          <li><Icone nome="relogio" className="ico" /><span>O próximo passo de um interessado seu que venceu</span></li>
        </>
      ) : null}
      {cobranca ? <li><Icone nome="carteira" className="ico" /><span>A fatura de um escritório que você atende em atraso há 7 dias e há 30 dias</span></li> : null}
    </ul>
  );
}

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
  } else if (!ok.total && !ok.veInteressados && !ok.veCobranca) {
    conteudo = (
      <Estado icone="sino" titulo="Nenhum aviso para você por enquanto." acoes={
        <ul className="cs-explica">
          <li><Icone nome="cadeado" className="ico" /><span>Pedido de demonstração e interessado não chegam aqui: têm dados pessoais de quem pediu.</span></li>
          <li><Icone nome="carteira" className="ico" /><span>Em estudo: pedido de suporte novo e fim de contrato chegando.</span></li>
        </ul>
      }>
        Nesta versão, o sino avisa sobre interessados, para a Administração e a Implantação, e sobre fatura em atraso, para a Administração e o Financeiro. Os avisos do Suporte entram depois.
      </Estado>
    );
  } else if (!ok.total) {
    conteudo = (
      <Estado icone="sino" titulo="Nenhum aviso por enquanto." acoes={<Explica interessados={ok.veInteressados} cobranca={!!ok.veCobranca} />}>
        {ok.veInteressados && ok.veCobranca ? "Chega aqui o que pede você no Comercial e na Cobrança. Cada aviso leva à ficha do interessado ou à fatura."
          : ok.veCobranca ? "Chega aqui o que pede você na Cobrança. Cada aviso leva à fatura."
          : "Chega aqui o que pede você no Comercial. Cada aviso leva à ficha do interessado."}
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
          <span>{ok && (!ok.veInteressados || ok.veCobranca)
            ? "Os avisos ficam aqui por 30 dias. Marcar como lido não apaga nada, e o que o aviso conta continua no lugar de origem."
            : "Os avisos ficam aqui por 30 dias. Marcar como lido não apaga nada, e o que o aviso conta continua na ficha do interessado."}</span>
        </p>
      )}
    </dialog>
  );
}
