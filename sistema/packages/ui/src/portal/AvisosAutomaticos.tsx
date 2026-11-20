"use client";
// Conversas › Avisos automáticos (F3.64; PA-03, PD-07), tela aprovada em
// docs/design/aprovadas/portal-conversas-automacoes (estado avisos): o que o T3jus mandou
// sozinho pelo WhatsApp nos últimos 7 dias, com a situação de cada aviso, a mensagem escolhida
// e quais avisos estão ligados. O banco entrega só os avisos das automações das áreas da pessoa.

import { useEffect, useState } from "react";
import {
  FILTROS_AVISO, GATILHOS, quandoSai, SITUACAO_AVISO,
  type AvisoAutomatico, type Gatilho, type ListaAutomacoes, type ListaAvisosAutomaticos,
} from "@t3jus/domain";
import { Icone, type NomeIcone } from "../Icone.tsx";
import { Carregando, ErroAoCarregar, Estado } from "../console/pecas.tsx";
import { diaCurto, diaDe, horaDe } from "./agenda.ts";
import { BarraConversas, ROTAS_CONVERSAS } from "./Conversas.tsx";
import { chamarPortal, MolduraPortal, ROTAS_PORTAL, useEscritorioPortal } from "./Moldura.tsx";

const ic = (n: string) => n as NomeIcone;
const primeiro = (nome: string) => nome.split(/\s+/)[0] ?? nome;

function quando(iso: string): string {
  const hoje = diaDe(new Date().toISOString());
  const dia = diaDe(iso);
  return `${dia === hoje ? "hoje" : diaCurto(dia)}, ${horaDe(iso)}`;
}

const para = (a: AvisoAutomatico) =>
  a.para ? `Para ${a.para.nome}${a.para.papel ? `, ${a.para.papel}` : ""}` : "Sem contato de WhatsApp";

const DISPAROU: Record<Gatilho, string> = {
  PAGAMENTO_RECEBIDO: "o Financeiro registrou o recebimento da parcela.",
  PARCELA_VAI_VENCER: "a parcela em aberto chegou perto do vencimento, no Financeiro.",
  PARCELA_ATRASO: "a parcela passou do vencimento sem pagamento registrado no Financeiro.",
  ETAPA_CASO: "a etapa do caso mudou no Jurídico, e a etapa tem texto para o cliente.",
  LEMBRETE_AUDIENCIA: "o compromisso do cliente na Agenda está chegando.",
  PRESTACAO_CONTAS: "o repasse ao cliente foi registrado no Financeiro.",
};

function Situacao({ a, compacto }: { a: AvisoAutomatico; compacto: boolean }) {
  const t = SITUACAO_AVISO[a.situacao];
  return (
    <>
      {a.situacao === "NAO_ENTREGUE" ? (
        <span className="selo selo-urgente"><Icone nome="alerta" className="ico" />{t}</span>
      ) : a.situacao === "RESPONDEU" ? (
        <span className="selo selo-ok"><Icone nome="check" className="ico" />{t}</span>
      ) : (
        <span className="selo selo-neutro">{t}</span>
      )}
      {a.situacao === "NAO_ENTREGUE" && a.motivo ? <small>{a.motivo}</small> : null}
      {a.situacao === "RESPONDEU" && a.resposta ? <small>“{a.resposta}”</small> : null}
      {a.situacao === "NAO_ENTREGUE" ? (
        <a className={`btn btn-sec${compacto ? " btn-compacto" : ""}`} href={`${ROTAS_PORTAL.clientes}/${a.cliente.id}`}>Corrigir na ficha</a>
      ) : null}
    </>
  );
}

function Previa({ a }: { a: AvisoAutomatico }) {
  const g = GATILHOS[a.gatilho];
  const nome = a.para?.nome ?? a.cliente.nome;
  return (
    <section className="folha" aria-labelledby="t-prev">
      <div className="folha-cab">
        <div>
          <p className="sobretitulo">{g.nome}</p>
          <h2 id="t-prev">Mensagem para {primeiro(nome)}</h2>
        </div>
      </div>
      <div className="cv-prev">
        <dl className="cv-dl">
          <div><dt>Cliente</dt><dd>{a.cliente.nome}</dd></div>
          <div><dt>Para</dt><dd>{a.para ? `${a.para.nome}${a.para.papel ? `, ${a.para.papel}` : ""}` : "Ninguém: falta o WhatsApp na ficha"}</dd></div>
          <div><dt>Enviado</dt><dd>{quando(a.em)} · {SITUACAO_AVISO[a.situacao]}</dd></div>
        </dl>
        {a.texto ? (
          <p className="cv-av">
            <span className="de"><Icone nome="whats" className="ico" />Aviso automático · {g.nome}</span>
            {a.texto}
          </p>
        ) : (
          <p className="cv-nota"><Icone nome="alerta" className="ico" /><span><b>Não saiu.</b> {a.motivo ?? "O aviso não pôde ser montado."}</span></p>
        )}
        <p className="cv-nota">
          <Icone nome={ic(g.icone)} className="ico" />
          <span><b>O que disparou:</b> {DISPAROU[a.gatilho].replace(/^./, (c) => c.toUpperCase())} A automação “{a.automacao.nome}” mandou {a.nome.toLowerCase().startsWith(g.nome.toLowerCase()) ? "este aviso" : `“${a.nome}”`}.</span>
        </p>
        {a.conversaId ? (
          <a className="ver" href={`${ROTAS_CONVERSAS.mensagens}?c=${a.conversaId}`}>Abrir a conversa com {primeiro(nome)}<Icone nome="dir" className="ico ico-s" /></a>
        ) : null}
      </div>
    </section>
  );
}

function Regras({ auto, lista }: { auto: ListaAutomacoes | "erro" | null; lista: ListaAvisosAutomaticos }) {
  const ligadas = auto && auto !== "erro" ? auto.automacoes.filter((a) => a.situacao === "LIGADA") : [];
  const dono = lista.socioDono?.nome;
  return (
    <section className="folha" aria-labelledby="t-reg">
      <div className="folha-cab">
        <div>
          <h2 id="t-reg">Quais avisos saem</h2>
          <p className="sub">Pelo WhatsApp do escritório, para o contato principal da ficha</p>
        </div>
      </div>
      {auto === null ? (
        <div className="cv-prev"><Carregando rotulo="Carregando os avisos ligados" linhas={3} /></div>
      ) : auto === "erro" ? (
        <div className="cv-prev"><p className="sub">Não deu para carregar os avisos ligados agora.</p></div>
      ) : ligadas.length ? (
        <ul className="cv-regras">
          {ligadas.map((a) => (
            <li key={a.id}>
              <strong>{a.nome}</strong>
              <span className="selo selo-ok"><Icone nome="check" className="ico" />Ligado</span>
              <small>{quandoSai(a.gatilho, a.fluxo, auto.pessoas)}</small>
            </li>
          ))}
        </ul>
      ) : (
        <div className="cv-prev"><p className="sub">Nenhum aviso ligado nas suas áreas. Nada sai sozinho até alguém ligar.</p></div>
      )}
      <div className="cv-prev">
        <p className="cv-nota">
          <Icone nome="cadeado" className="ico" />
          <span>{lista.dono ? "Quem muda é você, a sócia dona." : `Quem muda é ${dono ?? "a sócia dona"}${dono ? ", a sócia dona" : ""}.`} Cada mudança fica no histórico do escritório.</span>
        </p>
        <a className="btn btn-sec" href={ROTAS_CONVERSAS.automacoes}><Icone nome="ajustes" className="ico" />{lista.dono ? "Mudar avisos" : "Ver as automações"}</a>
      </div>
    </section>
  );
}

export function AvisosAutomaticosPortal() {
  const { escritorio, erro: erroEsc, recarregar } = useEscritorioPortal();
  const [tipo, setTipo] = useState<Gatilho | null>(null);
  const [lista, setLista] = useState<ListaAvisosAutomaticos | "erro" | null>(null);
  const [auto, setAuto] = useState<ListaAutomacoes | "erro" | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [vez, setVez] = useState(0);

  useEffect(() => {
    let vivo = true;
    void chamarPortal<ListaAvisosAutomaticos>(`/v1/escritorio/avisos-automaticos${tipo ? `?tipo=${tipo}` : ""}`)
      .then((r) => vivo && setLista(r.ok ? r.dados : "erro"));
    return () => { vivo = false; };
  }, [tipo, vez]);
  useEffect(() => {
    let vivo = true;
    void chamarPortal<ListaAutomacoes>("/v1/escritorio/automacoes").then((r) => vivo && setAuto(r.ok ? r.dados : "erro"));
    return () => { vivo = false; };
  }, []);

  async function mais() {
    if (!lista || lista === "erro") return;
    setCarregando(true);
    const q = new URLSearchParams({ pular: String(lista.itens.length) });
    if (tipo) q.set("tipo", tipo);
    const r = await chamarPortal<ListaAvisosAutomaticos>(`/v1/escritorio/avisos-automaticos?${q}`);
    setCarregando(false);
    if (r.ok) setLista({ ...r.dados, itens: [...lista.itens, ...r.dados.itens] });
  }

  const trilha = [{ nome: "Conversas", href: ROTAS_CONVERSAS.mensagens }, { nome: "Avisos automáticos" }];
  const barra = <BarraConversas secao="avisos" esperando={escritorio?.conversasEsperando ?? 0} />;
  const cab = (
    <div className="pt-cab">
      <div>
        <p className="sobretitulo">Pelo WhatsApp do escritório</p>
        <h1>Avisos automáticos</h1>
        <span className="fio" aria-hidden="true" />
        <p className="lede">O que o T3jus manda sozinho aos clientes: pagamento, atraso, etapa do caso, lembrete de audiência e prestação de contas. Nada sai sem estar ligado em Automações.</p>
      </div>
    </div>
  );

  let miolo;
  if (erroEsc || lista === "erro") {
    miolo = <ErroAoCarregar oque="os avisos automáticos" aoTentar={() => { recarregar(); setVez((v) => v + 1); }} />;
  } else if (!lista) {
    miolo = <Carregando rotulo="Carregando os avisos automáticos" linhas={6} />;
  } else {
    const todos = Object.values(lista.porTipo).reduce((s, n) => s + (n ?? 0), 0);
    const atual = lista.itens.find((a) => a.id === sel) ?? lista.itens.find((a) => a.situacao !== "NAO_ENTREGUE") ?? lista.itens[0] ?? null;
    const filtros = FILTROS_AVISO.filter((f) => f.gatilho === null || (lista.porTipo[f.gatilho] ?? 0) > 0 || f.gatilho === tipo);
    const ver = (a: AvisoAutomatico) => (
      <button type="button" className="cv-ver" aria-current={a.id === atual?.id || undefined} onClick={() => setSel(a.id)}
        style={{ background: "none", border: 0, padding: 0, cursor: "pointer", font: "inherit" }}>
        Ver a mensagem<span className="sr"> de {GATILHOS[a.gatilho].nome.toLowerCase()} para {a.cliente.nome}</span>
      </button>
    );
    const tipoDe = (a: AvisoAutomatico) => (
      <div className="cv-tipo">
        <Icone nome={ic(a.situacao === "NAO_ENTREGUE" ? "alerta" : GATILHOS[a.gatilho].icone)} className="ico" />
        <div><strong>{a.nome}</strong>{a.detalhe ? <small>{a.detalhe}</small> : null}</div>
      </div>
    );
    miolo = (
      <div className="cv">
        {cab}
        <div className="cv-av-grade">
          <div className="cv-col">
            <section className="folha" aria-labelledby="t-env" style={{ overflow: "hidden" }}>
              <div className="folha-cab">
                <div>
                  <h2 id="t-env">Avisos enviados</h2>
                  <p className="sub">
                    Últimos 7 dias · {lista.total} {lista.total === 1 ? "aviso" : "avisos"}
                    {lista.naoEntregues ? ` · ${lista.naoEntregues} não ${lista.naoEntregues === 1 ? "entregue" : "entregues"}` : ""}
                  </p>
                </div>
              </div>
              {todos ? (
                <div className="cv-av-ferr" role="group" aria-label="Mostrar">
                  {filtros.map((f) => (
                    <button key={f.nome} type="button" aria-pressed={f.gatilho === tipo}
                      onClick={() => { setTipo(f.gatilho); setSel(null); }}>
                      {f.nome} ({f.gatilho ? lista.porTipo[f.gatilho] ?? 0 : todos})
                    </button>
                  ))}
                </div>
              ) : null}
              {!lista.itens.length ? (
                <div style={{ padding: "0 24px 24px" }}>
                  <Estado icone="whats" titulo={tipo ? "Nenhum aviso deste tipo nos últimos 7 dias" : "Nenhum aviso saiu nos últimos 7 dias"}>
                    Os avisos aparecem aqui assim que uma automação ligada manda a primeira mensagem.
                  </Estado>
                </div>
              ) : (
                <>
                  <table className="so-pc cv-tab">
                    <caption className="sr">Avisos automáticos enviados</caption>
                    <colgroup><col style={{ width: "34%" }} /><col style={{ width: "25%" }} /><col style={{ width: "17%" }} /><col style={{ width: "24%" }} /></colgroup>
                    <thead><tr><th scope="col">Aviso</th><th scope="col">Cliente</th><th scope="col">Enviado</th><th scope="col">Situação</th></tr></thead>
                    <tbody>
                      {lista.itens.map((a) => (
                        <tr key={a.id} className={a.situacao === "NAO_ENTREGUE" ? "falha" : a.id === atual?.id ? "sel" : undefined}>
                          <td>{tipoDe(a)}</td>
                          <td><div className="cv-c"><strong>{a.cliente.nome}</strong><small>{para(a)}</small></div></td>
                          <td className="num" style={{ whiteSpace: "nowrap" }}>{quando(a.em)}</td>
                          <td><div className="cv-sit"><Situacao a={a} compacto />{a.situacao !== "NAO_ENTREGUE" || a.texto ? ver(a) : null}</div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <ul className="cartoes so-cel" aria-label="Avisos enviados">
                    {lista.itens.map((a) => (
                      <li key={a.id} className="cartao"
                        style={a.situacao === "NAO_ENTREGUE" ? { borderColor: "var(--vinho-3)", boxShadow: "inset 3px 0 0 var(--vinho-3)" }
                          : a.id === atual?.id ? { background: "var(--ambar-3)", boxShadow: "inset 3px 0 0 var(--vinho)" } : undefined}>
                        {tipoDe(a)}
                        <dl className="c-dados"><dt>Cliente</dt><dd>{a.cliente.nome}</dd><dt>Enviado</dt><dd className="num">{quando(a.em)}</dd></dl>
                        <div className="cv-sit"><Situacao a={a} compacto={false} />{a.situacao !== "NAO_ENTREGUE" || a.texto ? ver(a) : null}</div>
                      </li>
                    ))}
                  </ul>
                  <div className="mais">
                    <span>Mostrando {lista.itens.length} de {lista.total}</span>
                    {lista.itens.length < lista.total ? (
                      <button className="btn btn-sec" type="button" disabled={carregando} onClick={() => void mais()}>
                        {carregando ? "Carregando…" : "Carregar mais"}
                      </button>
                    ) : null}
                  </div>
                </>
              )}
            </section>
          </div>
          <aside className="cv-col" aria-label="Mensagem e regras">
            {atual ? <Previa a={atual} /> : null}
            <Regras auto={auto} lista={lista} />
          </aside>
        </div>
      </div>
    );
  }

  return (
    <MolduraPortal atual="conversas" trilha={trilha} escritorio={escritorio} barra={barra}>
      {miolo}
    </MolduraPortal>
  );
}
