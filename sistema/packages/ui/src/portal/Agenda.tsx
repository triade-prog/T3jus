"use client";
// Agenda do Portal (EX-06, EX-11, PD-07), desenho aprovado em
// docs/design/aprovadas/portal-agenda-conversas (Carol, 19/11/2026): uma agenda só, da equipe
// toda, com filtro por pessoa; visões Mês, Semana e Dia; criar clicando no dia; feriados; os
// prazos do Jurídico só para quem tem a área (o servidor manda sem para quem não tem). No
// celular, a semana vira lista por dia e o mês, um calendário compacto.

import { Fragment, useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { hojeBrasilia, TIPOS_COMPROMISSO_CURTO, type Agenda, type ClienteLinha, type CompromissoLinha, type ListaClientes, type PrazoAgenda } from "@t3jus/domain";
import { Icone } from "../Icone.tsx";
import { Carregando, ErroAoCarregar, Estado } from "../console/pecas.tsx";
import {
  contar, COR_TIPO, DIAS_CURTOS, DIAS_SEMANA, diaBr, diaCurto, diaDaSemana, diaDe, doDia, gradeDoMes, horaDe, HORA_FIM, HORA_INICIO,
  horariosDoLembrete, horariosLivres, jaPassou, lerDia, lerHorario, minutos, nomeDoMes, nomeDoTipo, numeroDoDia, periodo, posicaoNaGrade,
  quandoCurto, rotaAgenda, somarDias, type VisaoAgenda,
} from "./agenda.ts";
import { primeiroNome } from "./equipe.ts";
import { JanelaCompromisso, rascunhoNovo, type Marcado, type Pessoa, type Rascunho } from "./JanelaCompromisso.tsx";
import { chamarPortal, irPara, MolduraPortal, useEscritorioPortal } from "./Moldura.tsx";

const LEDE = "Audiências, reuniões com clientes, assinaturas e compromissos internos. Clique num dia para marcar. Os prazos do Jurídico aparecem aqui sozinhos.";
const LEDE_SEM = "Audiências, reuniões com clientes, assinaturas e compromissos internos. Clique num dia para marcar.";

type Fantasma = Pick<CompromissoLinha, "id" | "tipo" | "tipoEscrito" | "titulo" | "inicio" | "fim" | "modalidade" | "local" | "situacao" | "responsavel" | "tambemVai">;
type Item = CompromissoLinha | (Fantasma & { fantasma: true });

const ehFantasma = (c: Item): c is Fantasma & { fantasma: true } => "fantasma" in c;
const rotaFicha = (id: string) => `/agenda/${id}`;

function agoraEmMinutos(): number {
  return minutos(horaDe(new Date().toISOString()));
}

function quemVai(c: Pick<CompromissoLinha, "responsavel" | "tambemVai">): string {
  return [c.responsavel, ...c.tambemVai].map((p) => primeiroNome(p.nome)).join(", ");
}

function Onde({ c, curto }: { c: Item; curto?: boolean }) {
  const virtual = c.modalidade === "VIRTUAL";
  return (
    <>
      <Icone nome={virtual ? "video" : "local"} className="ico ico-s" />
      <span>
        {virtual ? "Virtual" : "Presencial"}
        {c.local ? ` · ${c.local}` : ""}
        {curto ? "" : ` · ${quemVai(c)}`}
      </span>
    </>
  );
}

function SeloLembrete({ c }: { c: Item }) {
  if (ehFantasma(c) || !c.lembrete || c.situacao !== "MARCADO" || !c.cliente) return null;
  return (
    <span className="selo selo-implant">
      <Icone nome="whats" className="ico" />
      Lembrete marcado
    </span>
  );
}

function classes(c: Item, extra: string[] = []): string {
  if (ehFantasma(c)) return ["fantasma", ...extra].join(" ");
  return [c.situacao === "CANCELADO" ? "cancelado" : jaPassou(c) ? "passou" : "", ...extra].filter(Boolean).join(" ");
}

// ------------------------------------------------------------------------------- peças

function Ferramentas({ vis, dia, pessoa, pessoas, eu, titulo }: { vis: VisaoAgenda; dia: string; pessoa: string | null; pessoas: Pessoa[]; eu: string | null; titulo: string }) {
  const p = periodo(vis, dia);
  const nomes = { mes: ["Mês anterior", "Próximo mês"], semana: ["Semana anterior", "Próxima semana"], dia: ["Dia anterior", "Próximo dia"] }[vis];
  const ordenadas = [...pessoas.filter((x) => x.nome === eu), ...pessoas.filter((x) => x.nome !== eu)];
  return (
    <div className="ag-ferr">
      <div className="ag-nav">
        <h2 className="ag-periodo">{titulo}</h2>
        <a className="btn btn-sec ag-q" href={rotaAgenda({ ver: vis, dia: p.ant, pessoa })} aria-label={nomes[0]}>
          <Icone nome="esquerda" className="ico" />
        </a>
        <a className="btn btn-sec" href={rotaAgenda({ ver: vis, pessoa })}>Hoje</a>
        <a className="btn btn-sec ag-q" href={rotaAgenda({ ver: vis, dia: p.prox, pessoa })} aria-label={nomes[1]}>
          <Icone nome="dir" className="ico" />
        </a>
      </div>
      <nav className="ag-vis" aria-label="Ver por">
        {(["mes", "semana", "dia"] as const).map((v) => (
          <a key={v} href={rotaAgenda({ ver: v, dia, pessoa })} aria-current={v === vis ? "page" : undefined}>
            {{ mes: "Mês", semana: "Semana", dia: "Dia" }[v]}
          </a>
        ))}
      </nav>
      <div className="ag-pessoa">
        <label htmlFor="ag-pessoa">Mostrar a agenda de</label>
        <select className="entrada" id="ag-pessoa" value={pessoa ?? ""} onChange={(ev) => irPara(rotaAgenda({ ver: vis, dia, pessoa: ev.target.value || null }))}>
          <option value="">Toda a equipe</option>
          {ordenadas.map((x) => (
            <option key={x.id} value={x.id}>
              {x.nome === eu ? `${x.nome} (você)` : x.nome}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function Legenda({ agenda, dica }: { agenda: Agenda; dica: boolean }) {
  const escritos = [...new Set(agenda.compromissos.filter((c) => c.tipo === "OUTRO" && c.tipoEscrito).map((c) => c.tipoEscrito!))].sort();
  return (
    <p className="legenda ag-leg">
      {(Object.keys(TIPOS_COMPROMISSO_CURTO) as (keyof typeof TIPOS_COMPROMISSO_CURTO)[]).map((t) => (
        <span key={t}>
          <i style={{ background: COR_TIPO[t] }} />
          {TIPOS_COMPROMISSO_CURTO[t]}
        </span>
      ))}
      {escritos.map((t) => (
        <span key={t}>
          <i style={{ background: COR_TIPO.OUTRO }} />
          {t}
        </span>
      ))}
      {agenda.juridico ? (
        <span>
          <i className="pz" />
          Prazo do Jurídico
        </span>
      ) : null}
      <span>
        <i className="fer" />
        Feriado
      </span>
      {dica ? (
        <span className="ag-dica">
          <Icone nome="mais" className="ico" />
          Use o + do dia para marcar um compromisso
        </span>
      ) : null}
    </p>
  );
}

function quandoVence(vence: string, hoje: string): string {
  if (vence === hoje) return "Vence hoje";
  if (vence === somarDias(hoje, 1)) return "Amanhã";
  return diaCurto(vence);
}

function PrazosDoDia({ prazos, hoje }: { prazos: PrazoAgenda[]; hoje: string }) {
  if (!prazos.length) return null;
  return (
    <ul className="ag-pzl" aria-label="Prazos do Jurídico">
      {prazos.map((p) => {
        const q = quandoVence(p.vence, hoje);
        return (
          <li key={p.id}>
            <Icone nome="balanca" className="ico" />
            <div>
              <strong>{p.titulo}</strong>
              <small>
                <span className="num">{p.processo}</span> · {p.responsavel.nome}
              </small>
            </div>
            {q === "Vence hoje" ? (
              <span className="selo selo-urgente">
                <Icone nome="alerta" className="ico" />
                {q}
              </span>
            ) : (
              <span className="selo selo-atencao">
                <Icone nome="relogio" className="ico" />
                {q}
              </span>
            )}
            <a className="ver" href={`/juridico/prazos`}>
              Abrir no Jurídico
              <Icone nome="dir" className="ico ico-s" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}

function ItemDaLista({ c, destaque }: { c: Item; destaque: string | null }) {
  const cls = classes(c, ["ag-it", !ehFantasma(c) && c.id === destaque ? "novo" : ""]);
  return (
    <li className={cls} style={{ "--t": COR_TIPO[c.tipo] } as CSSProperties}>
      <time dateTime={c.inicio}>
        {horaDe(c.inicio)}
        <small>até {horaDe(c.fim)}</small>
      </time>
      <div className="cx">
        <span className="tipo">{nomeDoTipo(c)}</span>
        {ehFantasma(c) ? (
          <span className="t">{c.titulo || "Novo compromisso"}</span>
        ) : (
          <a className="t" href={rotaFicha(c.id)}>
            {c.situacao === "CANCELADO" ? <span className="sr">Cancelado: </span> : null}
            {c.titulo}
          </a>
        )}
        <small>
          <Onde c={c} />
        </small>
        {c.situacao === "CANCELADO" ? <span className="selo selo-neutro">Cancelado</span> : <SeloLembrete c={c} />}
      </div>
    </li>
  );
}

/** Lista de um dia: prazos, compromissos, a linha de agora e (na visão Dia) os horários livres. */
function ListaDoDia({ dia, itens, prazos, hoje, livres, destaque, aoMarcar }: {
  dia: string;
  itens: Item[];
  prazos: PrazoAgenda[];
  hoje: string;
  livres?: boolean;
  destaque: string | null;
  aoMarcar: (dia: string, hora: string) => void;
}) {
  const agoraMin = dia === hoje ? agoraEmMinutos() : null;
  const linhas: ReactNode[] = [];
  let agoraPosto = dia !== hoje;
  const vagas = livres && dia >= hoje ? horariosLivres(itens.filter((c) => !ehFantasma(c)) as CompromissoLinha[], dia, agoraMin) : [];
  const vagaAntes = (ini: number) => vagas.filter((v) => v.ate !== null && minutos(v.ate) <= ini);
  const postas = new Set<string>();
  const botaoLivre = (v: { de: string; ate: string | null }) => (
    <li key={`livre-${v.de}`} className="ag-livre">
      <span />
      <button type="button" onClick={() => aoMarcar(dia, v.de)}>
        <Icone nome="mais" className="ico" />
        Marcar compromisso <span>{v.ate ? `livre das ${v.de} às ${v.ate}` : `livre depois das ${v.de}`}</span>
      </button>
    </li>
  );
  for (const c of itens) {
    const ini = diaDe(c.inicio) < dia ? 0 : minutos(horaDe(c.inicio));
    if (!agoraPosto && agoraMin !== null && ini > agoraMin) {
      linhas.push(
        <li key="agora" className="ag-agora-l">
          <b aria-hidden="true" />
          agora, {horaDe(new Date().toISOString()).replace(":", "h")}
        </li>,
      );
      agoraPosto = true;
    }
    for (const v of vagaAntes(ini)) if (!postas.has(v.de)) { postas.add(v.de); linhas.push(botaoLivre(v)); }
    linhas.push(<ItemDaLista key={c.id} c={c} destaque={destaque} />);
  }
  for (const v of vagas) if (!postas.has(v.de)) linhas.push(botaoLivre(v));
  return (
    <>
      <PrazosDoDia prazos={prazos} hoje={hoje} />
      {linhas.length ? (
        <ol className="ag-its" aria-label="Compromissos">
          {linhas}
        </ol>
      ) : null}
    </>
  );
}

function resumoDoDia(dia: string, hoje: string, n: number, nPz: number): string {
  const r: string[] = [];
  if (dia === hoje) r.push("hoje");
  if (nPz) r.push(contar(nPz, "prazo", "prazos"));
  r.push(n ? contar(n, "compromisso", "compromissos") : "nada marcado");
  return r.join(" · ");
}

function SecaoDoDia({ dia, itens, prazos, feriado, hoje, destaque, aoMarcar, titulo }: {
  dia: string;
  itens: Item[];
  prazos: PrazoAgenda[];
  feriado?: string;
  hoje: string;
  destaque: string | null;
  aoMarcar: (dia: string, hora?: string) => void;
  titulo?: string;
}) {
  const nome = DIAS_SEMANA[diaDaSemana(dia)]!;
  const Nome = titulo ?? nome.charAt(0).toUpperCase() + nome.slice(1);
  const rotulo = `${nome.charAt(0).toUpperCase() + nome.slice(1)}, ${numeroDoDia(dia)}`;
  if (feriado && !itens.length) {
    return (
      <section className="ag-ldia" aria-label={rotulo}>
        <h3 className="ag-ldia-t">
          <span className="disco"><span>{numeroDoDia(dia)}</span></span>
          <span>{Nome}<small>feriado</small></span>
        </h3>
        <p className="ag-fer-l">
          <span><b>Feriado: {feriado}.</b> Fórum fechado; prazos não correm.</span>
        </p>
      </section>
    );
  }
  return (
    <section className={`ag-ldia${dia === hoje ? " hoje" : ""}`} aria-label={rotulo}>
      <h3 className="ag-ldia-t">
        <span className="disco"><span>{numeroDoDia(dia)}</span></span>
        <span>
          {Nome}
          <small>{resumoDoDia(dia, hoje, itens.length, prazos.length)}{feriado ? ` · feriado: ${feriado}` : ""}</small>
        </span>
        <button className="ag-criar" type="button" onClick={() => aoMarcar(dia)} aria-label={`Novo compromisso na ${nome}, ${numeroDoDia(dia)}`}>
          <Icone nome="mais" className="ico" />
        </button>
      </h3>
      <ListaDoDia dia={dia} itens={itens} prazos={prazos} hoje={hoje} destaque={destaque} aoMarcar={aoMarcar} />
    </section>
  );
}

// ------------------------------------------------------------------------------- visões

interface Dados {
  agenda: Agenda;
  itens: Item[];
  hoje: string;
  destaque: string | null;
  prazosDe: (dia: string) => PrazoAgenda[];
  feriadoDe: (dia: string) => string | undefined;
  aoMarcar: (dia: string, hora?: string) => void;
  pessoa: string | null;
}

function EventoDaSemana({ c, dia, destaque }: { c: Item; dia: string; destaque: string | null }) {
  const { topo, altura } = posicaoNaGrade(c, dia);
  const cls = classes(c, ["ag-ev", altura < 50 ? "curto" : "", altura >= 90 ? "longo" : "", !ehFantasma(c) && c.id === destaque ? "novo" : ""]);
  const miolo = (
    <>
      <span className="l1">
        {horaDe(c.inicio)} · {nomeDoTipo(c)}
      </span>
      <strong>
        {!ehFantasma(c) && c.situacao === "CANCELADO" ? <span className="sr">Cancelado: </span> : null}
        {c.titulo || "Novo compromisso"}
      </strong>
      <small>
        <Onde c={c} />
      </small>
    </>
  );
  return (
    <li className={cls} style={{ "--t": COR_TIPO[c.tipo], top: topo, height: altura } as CSSProperties}>
      {ehFantasma(c) ? <a aria-hidden="true">{miolo}</a> : <a href={rotaFicha(c.id)}>{miolo}</a>}
    </li>
  );
}

function SemanaComputador({ dias, d }: { dias: string[]; d: Dados }) {
  const comPz = dias.some((x) => d.prazosDe(x).length);
  const agora = new Date().toISOString();
  const agoraMin = agoraEmMinutos();
  return (
    <div className={`ag-sem so-pc${comPz ? " com-pz" : ""}`}>
      <div className="ag-eixo" aria-hidden="true">
        <ol>
          {Array.from({ length: HORA_FIM - HORA_INICIO - 1 }, (_, i) => i + HORA_INICIO + 1).map((h) => (
            <li key={h} style={{ top: (h - HORA_INICIO) * 60 }}>{String(h).padStart(2, "0")}:00</li>
          ))}
        </ol>
      </div>
      {dias.map((dia, i) => {
        const hoje = dia === d.hoje;
        const nome = DIAS_SEMANA[i]!;
        const itens = doDia(d.itens, dia);
        const fer = d.feriadoDe(dia);
        const pz = d.prazosDe(dia);
        return (
          <section key={dia} className={`ag-col${hoje ? " hoje" : ""}`} aria-label={`${nome.charAt(0).toUpperCase() + nome.slice(1)}, ${numeroDoDia(dia)} de ${nomeDoMes(dia)}`}>
            <div className="ag-dcab">
              <a className="ag-dlink" href={rotaAgenda({ ver: "dia", dia, pessoa: d.pessoa })} aria-current={hoje ? "date" : undefined}>
                {DIAS_CURTOS[i]}
                <span className="disco"><span>{numeroDoDia(dia)}</span></span>
                <span className="sr"> de {nomeDoMes(dia)}{hoje ? ", hoje" : ""}</span>
              </a>
              {i < 5 ? (
                <button className="ag-criar" type="button" onClick={() => d.aoMarcar(dia)} aria-label={`Novo compromisso na ${nome}, ${numeroDoDia(dia)}`}>
                  <Icone nome="mais" className="ico" />
                </button>
              ) : null}
            </div>
            {comPz ? (
              <ul className="ag-pzs" aria-label={`Prazos do dia ${numeroDoDia(dia)}`}>
                {pz.map((p) => (
                  <li key={p.id} className="ag-pz">
                    <Icone nome="balanca" className="ico" />
                    <span>
                      <b>{quandoVence(p.vence, d.hoje)}</b> · {p.titulo} · {primeiroNome(p.responsavel.nome)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="ag-corpo">
              {fer ? (
                <div className="ag-feriado">
                  <p>
                    <b>Feriado</b>
                    {fer}. Fórum fechado; prazos não correm.
                  </p>
                </div>
              ) : null}
              {itens.length ? (
                <ol aria-label={`Compromissos do dia ${numeroDoDia(dia)}`}>
                  {itens.map((c) => <EventoDaSemana key={c.id} c={c} dia={dia} destaque={d.destaque} />)}
                </ol>
              ) : null}
              {hoje && agoraMin >= HORA_INICIO * 60 && agoraMin < HORA_FIM * 60 ? (
                <div className="ag-agora" style={{ top: agoraMin - HORA_INICIO * 60 }}>
                  <span>agora, {horaDe(agora).replace(":", "h")}</span>
                </div>
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function juntarDias(nomes: string[]): string {
  return nomes.length <= 1 ? (nomes[0] ?? "") : `${nomes.slice(0, -1).join(", ")} e ${nomes.at(-1)}`;
}

function SemanaCelular({ dias, d }: { dias: string[]; d: Dados }) {
  const passados = dias.filter((x) => x < d.hoje);
  const temHoje = dias.includes(d.hoje);
  const util = dias.slice(0, 5).filter((x) => !temHoje || x >= d.hoje);
  const fds = dias.slice(5);
  const fdsVazio = fds.every((x) => !doDia(d.itens, x).length && !d.prazosDe(x).length && !d.feriadoDe(x));
  const secao = (x: string) => (
    <SecaoDoDia key={x} dia={x} itens={doDia(d.itens, x)} prazos={d.prazosDe(x)} feriado={d.feriadoDe(x)} hoje={d.hoje} destaque={d.destaque} aoMarcar={d.aoMarcar} />
  );
  const nPassados = passados.reduce((n, x) => n + doDia(d.itens, x).length, 0);
  const nomes = passados.map((x) => DIAS_SEMANA[diaDaSemana(x)]!);
  return (
    <div className="so-cel">
      {temHoje && passados.length ? (
        <details className="ag-passados">
          <summary>
            <Icone nome="historico" className="ico" />
            <span>
              {juntarDias(nomes).replace(/^./, (x) => x.toUpperCase())} já {passados.length === 1 ? "passou" : "passaram"}{" "}
              <small>· {nPassados ? contar(nPassados, "compromisso", "compromissos") : "nada marcado"}</small>
            </span>
            <Icone nome="baixo" className="ico ico-s" />
          </summary>
          {passados.map(secao)}
        </details>
      ) : null}
      {(temHoje ? util : dias.slice(0, 5)).map(secao)}
      {fdsVazio ? (
        <div className="ag-fds">
          <Icone nome="agenda" className="ico" />
          <span>Sábado, {numeroDoDia(fds[0]!)}, e domingo, {numeroDoDia(fds[1]!)}: nada marcado.</span>
          <button className="ag-criar" type="button" onClick={() => d.aoMarcar(fds[0]!)} aria-label="Novo compromisso no fim de semana">
            <Icone nome="mais" className="ico" />
          </button>
        </div>
      ) : (
        fds.filter((x) => !temHoje || x >= d.hoje).map(secao)
      )}
    </div>
  );
}

function MesComputador({ dia, d }: { dia: string; d: Dados }) {
  const mes = dia.slice(0, 7);
  return (
    <div className="ag-mes so-pc" role="group" aria-label={`${nomeDoMes(dia)} de ${dia.slice(0, 4)}`}>
      {DIAS_CURTOS.map((s) => <div key={s} className="ag-msem" aria-hidden="true">{s}</div>)}
      {gradeDoMes(dia).map((x) => {
        const fora = x.slice(0, 7) !== mes;
        const hoje = x === d.hoje;
        const fer = d.feriadoDe(x);
        const nome = DIAS_SEMANA[diaDaSemana(x)]!;
        const lis: ReactNode[] = [];
        if (!fora) {
          if (fer) lis.push(<li key="fer" className="fer-n" style={{ background: "var(--papel)" }}><span>Feriado · {fer}</span></li>);
          for (const p of d.prazosDe(x)) {
            lis.push(
              <li key={p.id} className="pz">
                <Icone nome="balanca" className="ico" />
                <span><span className="sr">Prazo: </span>{p.titulo}</span>
              </li>,
            );
          }
          for (const c of doDia(d.itens, x)) {
            if (ehFantasma(c)) continue;
            lis.push(
              <li key={c.id} className={classes(c)} style={{ "--t": COR_TIPO[c.tipo] } as CSSProperties}>
                <i aria-hidden="true" />
                <a className="t" href={rotaFicha(c.id)}>
                  <span className="sr">{c.situacao === "CANCELADO" ? "Cancelado, " : ""}{nomeDoTipo(c)}: </span>
                  <b>{horaDe(c.inicio)}</b> {c.titulo}
                </a>
              </li>,
            );
          }
        }
        const mais = lis.length > 4 ? lis.length - 3 : 0;
        return (
          <div key={x} className={`ag-cel${fora ? " fora" : ""}${hoje ? " hoje" : ""}${!fora && fer ? " fer" : ""}`}>
            <div className="ag-dcab">
              <a className="ag-dlink" href={rotaAgenda({ ver: "dia", dia: x, pessoa: d.pessoa })} aria-current={hoje ? "date" : undefined}>
                <span className="disco"><span>{numeroDoDia(x)}</span></span>
                <span className="sr"> de {nomeDoMes(x)}{hoje ? ", hoje" : ""}</span>
              </a>
              <button className="ag-criar" type="button" onClick={() => d.aoMarcar(x)} aria-label={`Novo compromisso na ${nome}, ${numeroDoDia(x)} de ${nomeDoMes(x)}`}>
                <Icone nome="mais" className="ico" />
              </button>
            </div>
            {lis.length ? <ul>{mais ? lis.slice(0, 3) : lis}</ul> : null}
            {mais ? (
              <p className="mais-n">
                <a href={rotaAgenda({ ver: "dia", dia: x, pessoa: d.pessoa })}>e mais {mais}</a>
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function MesCelular({ dia, escolhido, d }: { dia: string; escolhido: string; d: Dados }) {
  const mes = dia.slice(0, 7);
  return (
    <div className="so-cel">
      <div className="ag-mini" role="group" aria-label={`${nomeDoMes(dia)} de ${dia.slice(0, 4)}`}>
        {DIAS_CURTOS.map((s) => <span key={s} className="s" aria-hidden="true">{s === "Sáb" ? "S" : s[0]}</span>)}
        {gradeDoMes(dia).map((x) => {
          const fora = x.slice(0, 7) !== mes;
          const itens = fora ? [] : doDia(d.itens, x).filter((c) => !ehFantasma(c));
          const tipos = [...new Set(itens.map((c) => c.tipo))].slice(0, 3);
          const pz = fora ? [] : d.prazosDe(x);
          const n = itens.length + pz.length;
          const fer = !fora && d.feriadoDe(x);
          return (
            <a key={x} href={rotaAgenda({ ver: "mes", dia: x, pessoa: d.pessoa })} className={fora ? "fora" : fer ? "fer" : undefined}
              aria-current={x === d.hoje ? "date" : undefined}
              aria-label={`${numeroDoDia(x)} de ${nomeDoMes(x)}${fer ? ", feriado" : ""}${n ? `, ${contar(n, "item", "itens")}` : ""}`}>
              {numeroDoDia(x)}
              <span className="pts" aria-hidden="true">
                {tipos.map((t) => <i key={t} style={{ "--t": COR_TIPO[t] } as CSSProperties} />)}
                {pz.length ? <i className="pz" /> : null}
              </span>
            </a>
          );
        })}
      </div>
      <SecaoDoDia dia={escolhido} itens={doDia(d.itens, escolhido)} prazos={d.prazosDe(escolhido)} feriado={d.feriadoDe(escolhido)} hoje={d.hoje}
        destaque={d.destaque} aoMarcar={d.aoMarcar} />
    </div>
  );
}

function Lembretes({ itens, dia }: { itens: CompromissoLinha[]; dia: string }) {
  const lista = itens.filter((c) => c.lembrete && c.cliente && c.situacao === "MARCADO" && !jaPassou(c) && diaDe(c.inicio) >= dia && diaDe(c.inicio) <= somarDias(dia, 1));
  return (
    <section className="folha" aria-labelledby="t-lemb">
      <div className="folha-cab">
        <div>
          <h2 id="t-lemb">
            <Icone nome="whats" className="ico" />
            Lembretes aos clientes
          </h2>
          <p className="sub">Pelo WhatsApp do escritório, {dia === hojeBrasilia() ? "hoje e amanhã" : `${diaCurto(dia)} e ${diaCurto(somarDias(dia, 1))}`}</p>
        </div>
      </div>
      {lista.length ? (
        <ul className="ag-lembs">
          {lista.map((c) => {
            const l = horariosDoLembrete(c.inicio);
            return (
              <li key={c.id}>
                <Icone nome="relogio" className="ico" />
                <div>
                  <strong>
                    {c.cliente!.nome} · {nomeDoTipo(c).toLowerCase()} {diaDe(c.inicio) === dia ? "" : "amanhã, "}
                    {horaDe(c.inicio)}
                  </strong>
                  <small>
                    Marcado para {quandoCurto(l.umDia)} (1 dia antes) e {quandoCurto(l.duasHoras)} (2 horas antes). Sai quando o WhatsApp do escritório estiver ligado.
                  </small>
                  <span className="selo selo-neutro">
                    <Icone nome="whats" className="ico" />
                    WhatsApp não ligado
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="ag-hist-nota">Nenhum lembrete marcado para estes dois dias.</p>
      )}
      <p className="ag-hist-nota">
        As respostas dos clientes vão chegar em <a href="/conversas">Conversas</a>.
      </p>
    </section>
  );
}

const RESERVA_SYNC = (
  <section className="folha" aria-labelledby="t-sync">
    <div className="folha-cab">
      <div>
        <h2 id="t-sync">
          <Icone nome="sincronia" className="ico" />
          Google Agenda e Outlook
        </h2>
      </div>
    </div>
    <div className="ag-reserva">
      <span className="selo selo-neutro">Em estudo</span>
      <span>
        Ver esta agenda no <b>Google Agenda</b> ou no <b>Outlook</b> ainda não existe. Estamos perguntando aos escritórios-piloto se isso faz falta antes de fazer.
      </span>
      <a className="btn btn-sec" href="/ajuda">
        <Icone nome="conversas" className="ico" />
        Contar como vocês usam
      </a>
    </div>
  </section>
);

function Toast({ feito, aoFechar }: { feito: { titulo: string; texto: string }; aoFechar: () => void }) {
  return (
    <div className="aviso aviso-sucesso toast" role="status">
      <Icone nome="check" className="ico" />
      <div>
        <strong className="aviso-titulo">{feito.titulo}</strong>
        <p>{feito.texto}</p>
      </div>
      <button className="fechar" type="button" aria-label="Fechar aviso" onClick={aoFechar}>
        <Icone nome="xis" className="ico" />
      </button>
    </div>
  );
}

// ------------------------------------------------------------------------------- tela

export function AgendaPortal({ ver = "semana", dia: diaPedido, pessoa = null, marcado: marcadoInicial }: {
  ver?: VisaoAgenda;
  dia?: string;
  pessoa?: string | null;
  /** Volta da ficha depois de remarcar ou cancelar: aviso e destaque. */
  marcado?: string;
}) {
  const { escritorio, erro: erroEscritorio, recarregar } = useEscritorioPortal();
  const hoje = hojeBrasilia();
  const dia = diaPedido && lerDia(diaBr(diaPedido)) ? diaPedido : hoje;
  const vis = ver;
  const p = periodo(vis, dia);
  const [agenda, setAgenda] = useState<Agenda | null>(null);
  const [erro, setErro] = useState(false);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [clientes, setClientes] = useState<ClienteLinha[] | null>(null);
  const [janela, setJanela] = useState<{ aberta: boolean; inicial: Rascunho }>({ aberta: false, inicial: rascunhoNovo(dia, "09:00", "") });
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);
  const [feito, setFeito] = useState<Marcado | null>(null);
  const [destaque, setDestaque] = useState<string | null>(marcadoInicial ?? null);
  const eu = escritorio?.pessoa ?? null;

  const ate = vis === "dia" ? somarDias(p.ate, 1) : p.ate;
  const endereco = `/v1/escritorio/agenda?de=${p.de}&ate=${ate}${pessoa ? `&pessoa=${pessoa}` : ""}`;
  const carregar = useCallback(async () => {
    setErro(false);
    const r = await chamarPortal<Agenda>(endereco);
    if (!r.ok) return setErro(true);
    setAgenda(r.dados);
  }, [endereco]);

  useEffect(() => {
    void Promise.resolve().then(() => carregar());
  }, [carregar]);
  useEffect(() => {
    void chamarPortal<{ pessoas: Pessoa[] }>("/v1/escritorio/pessoas").then((r) => r.ok && setPessoas(r.dados.pessoas));
    void chamarPortal<ListaClientes>("/v1/escritorio/clientes?situacao=ATIVO").then((r) => setClientes(r.ok ? r.dados.clientes : []));
  }, []);

  const euId = pessoas.find((x) => x.nome === eu)?.id ?? "";
  function abrirNovo(d: string, hora?: string) {
    const h = hora ?? (d === hoje ? `${String(Math.max(9, Math.min(18, Math.floor(agoraEmMinutos() / 60) + 1))).padStart(2, "0")}:00` : "09:00");
    setFeito(null);
    setJanela({ aberta: true, inicial: rascunhoNovo(d, h, euId) });
  }
  const aoMudar = useCallback((r: Rascunho) => setRascunho(r), []);

  const fantasma = useMemo<Item | null>(() => {
    if (!janela.aberta || !rascunho) return null;
    const d = lerDia(rascunho.dia);
    const i = lerHorario(rascunho.ini);
    const f = lerHorario(rascunho.fim);
    if (!d || !i || !f || f <= i) return null;
    const resp = pessoas.find((x) => x.id === rascunho.responsavelId) ?? { id: "", nome: eu ?? "" };
    return {
      fantasma: true, id: "novo", tipo: rascunho.tipo, tipoEscrito: rascunho.tipoEscrito || null, titulo: rascunho.titulo, inicio: `${d}T${i}:00-03:00`,
      fim: `${d}T${f}:00-03:00`, modalidade: rascunho.modalidade, local: rascunho.local || null, situacao: "MARCADO", responsavel: resp, tambemVai: [],
    };
  }, [janela.aberta, rascunho, pessoas, eu]);

  const trilha = [{ nome: "Agenda" }];
  if (!escritorio && !erroEscritorio) {
    return (
      <MolduraPortal atual="agenda" trilha={trilha} escritorio={null}>
        <Carregando rotulo="Carregando a agenda…" />
      </MolduraPortal>
    );
  }
  if (erroEscritorio || !escritorio) {
    return (
      <MolduraPortal atual="agenda" trilha={trilha} escritorio={null}>
        <ErroAoCarregar oque="a agenda" aoTentar={recarregar} />
      </MolduraPortal>
    );
  }

  const cab = (lede: string) => (
    <div className="pt-cab ag-cab">
      <div>
        <p className="sobretitulo">Da equipe toda</p>
        <h1>Agenda</h1>
        <span className="fio" aria-hidden="true" />
        <p className="lede">{lede}</p>
      </div>
      <button className="btn btn-pri" type="button" onClick={() => abrirNovo(vis === "semana" && !(dia >= p.de && dia <= p.ate) ? p.de : dia)}>
        <Icone nome="mais" className="ico" />
        Novo compromisso
      </button>
    </div>
  );

  const janelaEl = (
    <JanelaCompromisso aberta={janela.aberta} inicial={janela.inicial} pessoas={pessoas} clientes={clientes} tiposEscritos={agenda?.tiposEscritos ?? []} eu={eu}
      aoMudar={aoMudar} aoFechar={() => setJanela((j) => ({ ...j, aberta: false }))}
      aoFeito={(m) => {
        setJanela((j) => ({ ...j, aberta: false }));
        setFeito(m);
        setDestaque(m.id);
        if (m.dia < p.de || m.dia > ate) irPara(`${rotaAgenda({ ver: vis, dia: m.dia, pessoa })}${rotaAgenda({ ver: vis, dia: m.dia, pessoa }).includes("?") ? "&" : "?"}marcado=${m.id}`);
        else void carregar();
      }} />
  );

  let conteudo: ReactNode;
  if (erro) {
    conteudo = <ErroAoCarregar oque="a agenda" aoTentar={() => void carregar()} />;
  } else if (!agenda) {
    conteudo = <Carregando rotulo="Carregando a agenda…" />;
  } else if (!agenda.algum) {
    conteudo = (
      <div className="ag">
        {cab(agenda.juridico ? LEDE : LEDE_SEM)}
        <div className="ag-vazio">
          <div className="ag-col2">
            <Estado icone="agenda" titulo="A agenda do escritório começa aqui" moldura
              acoes={
                <button className="btn btn-pri" type="button" onClick={() => abrirNovo(hoje)}>
                  <Icone nome="mais" className="ico" />
                  Marcar o primeiro compromisso
                </button>
              }>
              Ainda não há nada marcado. A agenda é uma só para a equipe toda; cada pessoa pode ver só a sua.
            </Estado>
            <ol className="ag-passos" aria-label="Como começar">
              <li><span className="disco"><span>1</span></span><span>Use o <b>+</b> de um dia, ou “Novo compromisso”, para marcar uma audiência, uma reunião com cliente, uma assinatura ou algo interno.</span></li>
              <li><span className="disco"><span>2</span></span><span>Nas audiências, o lembrete ao cliente pelo WhatsApp já vem marcado: 1 dia antes e 2 horas antes.</span></li>
              <li><span className="disco"><span>3</span></span><span>Os prazos cadastrados no Jurídico aparecem aqui sozinhos, para quem tem a área.</span></li>
            </ol>
          </div>
          <aside className="ag-col2" aria-label="Agenda externa">{RESERVA_SYNC}</aside>
        </div>
      </div>
    );
  } else {
    const itens: Item[] = [...agenda.compromissos, ...(fantasma ? [fantasma] : [])].sort((a, b) => a.inicio.localeCompare(b.inicio));
    const prazos = agenda.prazos ?? [];
    const d: Dados = {
      agenda, itens, hoje, destaque, pessoa,
      prazosDe: (x) => prazos.filter((z) => z.vence === x),
      feriadoDe: (x) => agenda.feriados.find((f) => f.data === x)?.nome,
      aoMarcar: abrirNovo,
    };
    const filtrada = pessoas.find((x) => x.id === pessoa);
    const filtro = filtrada ? (
      <div className="ag-filtro" role="status">
        <span>
          Mostrando só a agenda de <b>{filtrada.nome}</b>: {contar(agenda.compromissos.filter((c) => diaDe(c.inicio) <= p.ate).length, "compromisso", "compromissos")}
          {agenda.juridico ? ` e ${contar(prazos.filter((z) => z.responsavel.id === filtrada.id).length, "prazo", "prazos")}` : ""}{" "}
          {{ mes: "neste mês", semana: "nesta semana", dia: "neste dia" }[vis]}.
        </span>
        <a className="btn btn-fantasma" href={rotaAgenda({ ver: vis, dia })}>
          <Icone nome="xis" className="ico" />
          Ver a equipe toda
        </a>
      </div>
    ) : null;
    const pe = !agenda.juridico ? (
      <p className="ag-pe">
        <Icone nome="cadeado" className="ico" />
        <span>
          Os prazos processuais ficam na área Jurídico, que não está liberada para você.
          {escritorio.socios[0] ? ` Quem libera é ${escritorio.socios[0]}, sócio dono.` : " Quem libera é o sócio dono."}
        </span>
      </p>
    ) : null;
    const folha = (miolo: ReactNode, dica = true) => (
      <section className="folha ag-folha" aria-labelledby="ag-t">
        <h2 className="sr" id="ag-t">Calendário</h2>
        <Ferramentas vis={vis} dia={dia} pessoa={pessoa} pessoas={pessoas} eu={eu} titulo={p.titulo} />
        <Legenda agenda={agenda} dica={dica} />
        {filtro}
        {miolo}
        {pe}
      </section>
    );
    if (vis === "dia") {
      const itensDia = doDia(itens, dia);
      conteudo = (
        <div className="ag">
          {cab(agenda.juridico ? LEDE : LEDE_SEM)}
          <div className="ag-dia">
            <div className="ag-col2">
              {folha(
                <SecaoDoDia dia={dia} itens={itensDia} prazos={d.prazosDe(dia)} feriado={d.feriadoDe(dia)} hoje={hoje} destaque={destaque}
                  aoMarcar={abrirNovo} titulo={dia === hoje ? "Hoje" : undefined} />,
                false,
              )}
            </div>
            <aside className="ag-col2" aria-label="Lembretes e agenda externa">
              <Lembretes itens={agenda.compromissos} dia={dia} />
              {RESERVA_SYNC}
            </aside>
          </div>
        </div>
      );
    } else if (vis === "mes") {
      const escolhido = diaPedido && diaPedido.slice(0, 7) === dia.slice(0, 7) ? diaPedido : hoje.slice(0, 7) === dia.slice(0, 7) ? hoje : `${dia.slice(0, 7)}-01`;
      conteudo = (
        <div className="ag">
          {cab(agenda.juridico ? LEDE : LEDE_SEM)}
          {folha(
            <>
              <MesComputador dia={dia} d={d} />
              <MesCelular dia={dia} escolhido={escolhido} d={d} />
            </>,
          )}
        </div>
      );
    } else {
      const dias = Array.from({ length: 7 }, (_, i) => somarDias(p.de, i));
      conteudo = (
        <div className="ag">
          {cab(agenda.juridico ? LEDE : LEDE_SEM)}
          {folha(
            <Fragment>
              <SemanaComputador dias={dias} d={d} />
              <SemanaCelular dias={dias} d={d} />
            </Fragment>,
          )}
        </div>
      );
    }
  }

  return (
    <MolduraPortal atual="agenda" trilha={trilha} escritorio={escritorio}>
      {conteudo}
      {janelaEl}
      {feito ? <Toast feito={feito} aoFechar={() => setFeito(null)} /> : null}
    </MolduraPortal>
  );
}
