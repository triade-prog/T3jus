"use client";
// Financeiro do Portal, Resumo e Caixa (FI-03, FI-06, FI-09, FI-21, PD-03, PD-06, IN-02 a IN-05,
// IN-07, IN-09, IN-10, IN-14), desenho aprovado em docs/design/aprovadas/portal-financeiro
// (estados resumo, resumo-vazio, caixa e exportar; decisões 1, 2, 3, 14 e 15). O dinheiro do
// escritório fica na família vinho e o de terceiros no âmbar, e os dois nunca se somam. O Resumo
// responde, nesta ordem: o que está atrasado e o que fazer, quanto entrou contra o previsto e o
// que falta repassar. O Caixa mostra os dois saldos, o previsto e o realizado mês a mês e a
// exportação para o contador. Os números vêm prontos do servidor; a planilha é montada aqui.

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  alertaDeQueda, FORMAS_PAGAMENTO, PARA_DESTINACAO, quemEspera, reais, receitaPorGrupo, TIPOS_LEVANTAMENTO, TIPOS_REQUISICAO,
  type AnexosDaExportacao, type CaixaFinanceiro, type DadosExportacao, type EnvioContador, type FormatoExportacao, type MesCaixa, type ParcelaLinha, type PreviaExportacao,
  type PastaParaBaixar, type RepassePendente, type ResumoFinanceiro, type TerceirosNaConta,
} from "@t3jus/domain";
import { textoDoErro } from "../api.ts";
import { Icone, type NomeIcone } from "../Icone.tsx";
import { iniciais } from "../console/tempo.ts";
import { Aviso, Carregando, ErroAoCarregar, Estado, Janela } from "../console/pecas.tsx";
import { rotaArea } from "./areas.ts";
import { contar, diaBr, diaCurto, diaLongo, nomeDoMes, somarDias } from "./agenda.ts";
import { Selo, useCarga } from "./Comercial.tsx";
import { Toast } from "./FichaCliente.tsx";
import { mesReferencia, quandoAcao, ROTAS_FINANCEIRO, seloParcela } from "./financeiro.ts";
import { chamarPortal } from "./Moldura.tsx";
import { MolduraArea } from "./MolduraArea.tsx";
import { FolhaACaminho } from "./ACaminho.tsx";
import { arquivoContador, nomeMesAno } from "./planilha.ts";
import { tamanhoLegivel } from "../console/documentos.ts";

type Feito = { titulo: string; texto: string };
const fuso = { timeZone: "America/Sao_Paulo" } as const;
const horaDoInstante = (em: string) => {
  const [h, m] = new Intl.DateTimeFormat("pt-BR", { ...fuso, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(em)).split(":");
  return `${Number(h)}h${m}`;
};
const diaDoInstante = (em: string) => new Intl.DateTimeFormat("en-CA", { ...fuso, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(em));
const MES_CURTO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** "Novembro", ou "Janeiro de 2027" fora do ano de hoje. */
const nomeMes = (m: string, hoje: string) => maiuscula(m.slice(0, 4) === hoje.slice(0, 4) ? nomeDoMes(m) : nomeMesAno(m));
const pct = (parte: number, todo: number) => (todo > 0 ? Math.round((parte / todo) * 100) : 0);
const largura = (v: number, max: number) => `${max > 0 ? Math.min(100, (v / max) * 100).toFixed(1) : 0}%`;
const proximoMes = (m: string) => {
  const [a, n] = [Number(m.slice(0, 4)), Number(m.slice(5, 7))];
  return n === 12 ? `${a + 1}-01-01` : `${a}-${String(n + 1).padStart(2, "0")}-01`;
};

// ------------------------------------------------------------------------------- peças comuns

export function Cab({ titulo, lede, botao }: { titulo: string; lede: string; botao?: ReactNode }) {
  return (
    <div className="pt-cab">
      <div>
        <p className="sobretitulo">Financeiro</p>
        <h1>{titulo}</h1>
        <span className="fio" aria-hidden="true" />
        <p className="lede">{lede}</p>
      </div>
      {botao}
    </div>
  );
}

export function Folha({ id, titulo, icone, sub, ver, acoes, terc, children }: {
  id: string; titulo: string; icone: NomeIcone; sub?: string; ver?: { texto: string; href: string }; acoes?: ReactNode; terc?: boolean; children: ReactNode;
}) {
  return (
    <section className={terc ? "folha fi-terc" : "folha"} aria-labelledby={id} style={{ overflow: "hidden" }}>
      {terc ? <div className="fi-terc-cab"><Icone nome="escudo" className="ico" />De terceiros · não é do escritório</div> : null}
      <div className="folha-cab">
        <div>
          <h2 id={id}><Icone nome={icone} className="ico" />{titulo}</h2>
          {sub ? <p className="sub">{sub}</p> : null}
        </div>
        {ver || acoes ? (
          <div className="acoes">
            {acoes}
            {ver ? <a className="ver" href={ver.href}>{ver.texto}<Icone nome="dir" className="ico ico-s" /></a> : null}
          </div>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/** O que diz o campo âmbar: quanto é de terceiros e quem espera. */
function textoTerceiros(t: TerceirosNaConta): ReactNode {
  if (!t.saldo) return "Nada de terceiros na conta agora: tudo o que entrou já foi repassado ou transferido.";
  const quem = quemEspera(t);
  const hon = t.honorarios ? <>transferir <b>{reais(t.honorarios)}</b> de honorários para a conta do escritório</> : null;
  if (!quem) return <>Não é do escritório até ser transferido. Falta {hon}.</>;
  return <>Não é do escritório. Falta repassar a <b>{quem}</b>{hon ? <>, e {hon}</> : null}.</>;
}

// ------------------------------------------------------------------------------------- Resumo

function Abertura({ r, mes }: { r: ResumoFinanceiro; mes: string }) {
  const e = r.escritorio;
  const previsto = e.recebido + e.vencidoMes + e.seteDias + e.restoMes;
  const p = pct(e.recebido, previsto);
  return (
    <div className="ficha-cab fi-hero">
      <div className="esq campo-vinho">
        <Icone nome="coluna" className="ico estatua" />
        <p className="sobretitulo">Dinheiro do escritório · {mes}</p>
        <p><span className="fi-big num">{reais(e.recebido)}</span></p>
        <p className="fi-de">recebidos de <b>{reais(previsto)}</b> previstos para o mês ({p}%)</p>
        <div className="fi-trilha" role="img" aria-label={`${p}% do previsto já recebido`}><i style={{ width: `${Math.min(p, 100)}%` }} /></div>
        <div className="fi-hero-num">
          <span><b className="num">{reais(r.vencidas.valor)}</b>vencidos, {contar(r.vencidas.n, "parcela", "parcelas")}</span>
          <span><b className="num">{reais(r.proximas.valor)}</b>entram em 7 dias</span>
        </div>
      </div>
      <section className="dir campo-ambar" aria-labelledby="t-terc">
        <p className="fi-terc-rot" id="t-terc"><Icone nome="escudo" className="ico" />De terceiros · na conta</p>
        <p className="grande num">{reais(r.terceiros.saldo)}</p>
        <p className="fi-oque">{textoTerceiros(r.terceiros)}</p>
        <a className="btn btn-pri" href={ROTAS_FINANCEIRO.repasses}><Icone nome="enviar" className="ico" />Ver repasses</a>
      </section>
    </div>
  );
}

const FAIXAS = ["Até 30 dias", "31 a 60 dias", "61 a 90 dias", "Mais de 90"];

function LinhaVencida({ p, hoje }: { p: ParcelaLinha; hoje: string }) {
  const c = p.cobranca;
  const dias = Math.round((Date.parse(hoje) - Date.parse(p.vencimento)) / 86400000);
  return (
    <li className="fi-linha fi-venc">
      <div className="fi-quem">
        <a href={ROTAS_FINANCEIRO.contrato(p.contrato.id)}>{p.cliente.nome}</a>
        <small>{p.contrato.objeto} · {p.descricao} · {mesReferencia(p.vencimento, hoje)} · venceu {diaCurto(p.vencimento)}</small>
        {c?.motivo ? <p className="fi-motivo"><b>Motivo:</b> {c.motivo}</p> : null}
        {c ? (
          <p className="fi-prox">
            <Icone nome="relogio" className="ico ico-s" />
            Próxima ação: <b>{quandoAcao(c.proxData, hoje)}, {c.proxOque}</b> · {c.proxResponsavel.nome}
          </p>
        ) : (
          <p className="fi-motivo"><b>Sem cobrança anotada.</b> Anote o motivo e a próxima ação nas parcelas do contrato.</p>
        )}
      </div>
      <div className="fi-lado">
        <span className="fi-v forte num">{reais(p.falta)}</span>
        <Selo tom="urgente" icone="alerta">{contar(dias, "dia", "dias")}</Selo>
      </div>
    </li>
  );
}

function FolhaVencido({ r }: { r: ResumoFinanceiro }) {
  const v = r.vencidas;
  const max = Math.max(...v.faixas.map((f) => f.valor), 1);
  const pe = v.semAcao === 0 ? "todas têm responsável e próxima ação" : `${contar(v.semAcao, "sem próxima ação em dia", "sem próxima ação em dia")}`;
  return (
    <Folha id="t-venc" titulo="Vencido" icone="alerta" sub="O que já devia ter entrado, do mais antigo ao mais recente" ver={{ texto: "A receber", href: ROTAS_FINANCEIRO.receber }}>
      {v.n === 0 ? (
        <p className="fi-cob-sem">Nenhuma parcela vencida. Tudo o que venceu foi recebido.</p>
      ) : (
        <>
          <p className="fi-sub3" style={{ marginTop: 0, borderTop: 0, paddingTop: 0 }}>Por idade do atraso</p>
          <div className="fi-barras" role="group" aria-label="Vencido por idade do atraso">
            {v.faixas.map((f, i) => (
              <div className="fi-barra" key={FAIXAS[i]}>
                <span className="rot">{FAIXAS[i]}</span>
                <span className="fi-trilho" aria-hidden="true"><i className="urg" style={{ width: largura(f.valor, max) }} /></span>
                <span className="val"><b className="num">{reais(f.valor)}</b><small>{f.n ? contar(f.n, "parcela", "parcelas") : "nenhuma"}</small></span>
              </div>
            ))}
          </div>
          <p className="fi-sub3" style={{ marginTop: 0 }}>Cada atraso, com o motivo e o que fazer</p>
          <ul className="fi-linhas">{v.parcelas.map((p) => <LinhaVencida key={p.id} p={p} hoje={r.hoje} />)}</ul>
          <p className="fi-total">
            <span>
              {contar(v.n, "parcela vencida", "parcelas vencidas")} · {pe}
              {v.n > v.parcelas.length ? ` · aqui as ${v.parcelas.length} mais antigas` : ""}
            </span>
            <b className="num">{reais(v.valor)}</b>
          </p>
        </>
      )}
    </Folha>
  );
}

/** A meta do mês no Resumo (F3.49): o valor, a barra com o traço e quanto falta. */
function MetaDoMes({ r, mes, previsto, aoMudar }: { r: ResumoFinanceiro; mes: string; previsto: number; aoMudar?: () => void }) {
  const mt = r.meta;
  if (!mt) return null;
  const m = mt.mes;
  const dona = mt.socioDono?.nome ?? "a sócia dona";
  if (!m) {
    return (
      <div className="mt-meta mt-vazia" id="t-meta">
        <div>
          <p className="mt-rot">Meta de {mes}</p>
          <p className="mt-txt">{aoMudar ? "Sem meta. Com uma meta, o Resumo mostra quanto falta para chegar nela, ao lado dos meses anteriores." : `Sem meta. Quem define é ${dona}, a sócia dona.`}</p>
        </div>
        {aoMudar ? <button className="btn btn-sec" type="button" onClick={aoMudar}><Icone nome="mais" className="ico" />Definir a meta</button> : null}
      </div>
    );
  }
  const rec = r.escritorio.recebido;
  const mx = Math.max(m.valor, previsto, rec, 1) * 1.04;
  const pctMeta = Math.round((rec / m.valor) * 100);
  const fimMes = somarDias(proximoMes(r.mes), -1);
  const dias = Math.max(0, Math.round((Date.parse(`${fimMes}T12:00:00Z`) - Date.parse(`${r.hoje}T12:00:00Z`)) / 864e5));
  const falta = Math.max(0, m.valor - rec);
  const dif = previsto - m.valor;
  return (
    <div className="mt-meta" id="t-meta">
      <div className="mt-topo">
        <div>
          <p className="mt-rot">Meta de {mes}</p>
          <p className="mt-valor"><b className="num">{reais(m.valor)}</b><span>{m.soMes ? "só este mês" : `todo mês, desde ${nomeDoMes(m.deMes)}`}</span></p>
        </div>
        {aoMudar ? <button className="btn btn-sec btn-compacto" type="button" onClick={aoMudar}><Icone nome="lapis" className="ico" />Mudar a meta</button>
          : <span className="fi-pq">Definida por {dona}, a sócia dona</span>}
      </div>
      <div className="mt-barra" role="img"
        aria-label={`Recebido ${reais(rec)}, ${pctMeta}% da meta de ${reais(m.valor)}. Se todo o previsto entrar, ${reais(previsto)}, ${Math.round((previsto / m.valor) * 100)}% da meta.`}>
        <span className="fi-trilho"><i className="prev" style={{ width: largura(previsto, mx) }} /><i className="real" style={{ width: largura(rec, mx) }} /></span>
        <span className="mt-traco" style={{ left: largura(m.valor, mx) }}><span>meta</span></span>
      </div>
      <p className="mt-txt">
        <b>{pctMeta}% da meta.</b>{" "}
        {falta ? `Faltam ${reais(falta)} em ${dias === 1 ? "1 dia" : `${dias} dias`}. ` : "A meta já foi batida. "}
        Se todo o previsto entrar, {mes} fecha em {reais(previsto)}:{" "}
        <b>{dif === 0 ? "exatamente a meta" : dif > 0 ? `${reais(dif)} acima da meta` : `${reais(-dif)} abaixo da meta`}</b>.
      </p>
    </div>
  );
}

function FolhaPrevisto({ r, mes, aoMeta }: { r: ResumoFinanceiro; mes: string; aoMeta?: () => void }) {
  const e = r.escritorio;
  const previsto = e.recebido + e.vencidoMes + e.seteDias + e.restoMes;
  const fim = diaCurto(somarDias(proximoMes(r.mes), -1));
  const segs = [
    { v: e.recebido, cor: "var(--vinho)", t: "Recebido" },
    { v: e.vencidoMes, cor: "var(--vinho-3)", t: "Vencido" },
    { v: e.seteDias, cor: "var(--ambar)", t: "Próximos 7 dias" },
    { v: e.restoMes, cor: "var(--ambar-3)", t: `Até ${fim}`, contorno: true },
  ];
  const comMeta = r.meses.some((m) => m.meta);
  const max = Math.max(...r.meses.flatMap((m) => [m.previsto, m.realizado, m.meta ?? 0]), 1) * (comMeta ? 1.04 : 1);
  const grupos = receitaPorGrupo(r.porTipo);
  const queda = alertaDeQueda(grupos);
  const anteriores = r.meses.slice(0, 3);
  const de = anteriores.length ? `${nomeDoMes(anteriores[0]!.mes)} a ${nomeDoMes(anteriores[anteriores.length - 1]!.mes)}` : "";
  return (
    <Folha id="t-prev" titulo="Previsto e realizado" icone="moeda" sub={`Honorários do escritório em ${mes}. Valores de terceiros ficam fora.`}
      ver={{ texto: "Caixa", href: rotaArea("FINANCEIRO", "caixa") }}>
      <p className="fi-grande"><b className="num">{reais(e.recebido)}</b><span>de {reais(previsto)} previstos</span></p>
      <div className="fi-tons">
        <div className="tons" role="img" aria-label={segs.map((s) => `${s.t} ${reais(s.v)}`).join(", ")}>
          {segs.filter((s) => s.v > 0).map((s) => <i key={s.t} style={{ flex: s.v, background: s.cor }} />)}
        </div>
        <p className="legenda">
          {segs.map((s) => (
            <span key={s.t}><i style={{ background: s.cor, boxShadow: s.contorno ? "inset 0 0 0 1px var(--vinho-4)" : undefined }} />{s.t} {reais(s.v)}</span>
          ))}
        </p>
      </div>
      <MetaDoMes r={r} mes={mes} previsto={previsto} aoMudar={aoMeta} />
      <p className="fi-sub3">Comparado com os meses anteriores{comMeta ? " e com a meta" : ""}</p>
      <div className="fi-barras" role="group" aria-label={`Realizado contra previsto${comMeta ? " e contra a meta" : ""}, de ${nomeDoMes(r.meses[0]!.mes)} a ${mes}`}>
        {r.meses.map((m) => (
          <div className="fi-barra" key={m.mes}>
            <span className="rot">{maiuscula(nomeDoMes(m.mes))}{m.mes === r.mes ? <small>até hoje</small> : null}</span>
            <span className={comMeta ? "fi-duplo mt-duplo" : "fi-duplo"} aria-hidden="true">
              <span className="fi-trilho"><i className="prev" style={{ width: largura(m.previsto, max) }} /></span>
              <span className="fi-trilho"><i className="real" style={{ width: largura(m.realizado, max) }} /></span>
              {comMeta && m.meta ? <span className="mt-traco mt-traco-p" style={{ left: largura(m.meta, max) }} /> : null}
            </span>
            <span className="val"><b className="num">{reais(m.realizado)}</b><small>{
              !comMeta || !m.meta
                ? <>de {reais(m.previsto)}{m.previsto ? ` · ${pct(m.realizado, m.previsto)}%` : ""}{comMeta ? " · sem meta" : ""}</>
                : m.mes === r.mes ? `meta ${reais(m.meta)} · ${pct(m.realizado, m.meta)}% até hoje`
                : m.realizado >= m.meta ? <>meta {reais(m.meta)} · <b>bateu</b></>
                : `meta ${reais(m.meta)} · ${pct(m.realizado, m.meta)}%`
            }</small></span>
          </div>
        ))}
      </div>
      <p className="legenda fi-leg">
        <span><i style={{ background: "var(--ambar-3)", boxShadow: "inset 0 0 0 1px var(--vinho-4)" }} />Previsto (barra de cima)</span>
        <span><i style={{ background: "var(--vinho)" }} />Realizado (barra de baixo)</span>
        {comMeta ? <span><i className="mt-leg-traco" />Meta do mês (traço)</span> : null}
      </p>
      {queda ? (
        <div className="fi-aviso-in">
          <Aviso tom="atencao" icone="alerta" titulo={`Os honorários de ${queda.nome.toLowerCase()} caíram neste mês.`}>
            Entraram {reais(queda.valor)} até hoje, {queda.pct}% abaixo da média de {de} ({reais(queda.media)}).{" "}
            {queda.grupo === "EXITO"
              ? "Pode ser só a data dos alvarás e RPVs; confira em Repasses o que está para entrar."
              : "Mesmo que tudo o que vence até o fim do mês entre, fica abaixo da média. Confira em A receber."}
          </Aviso>
        </div>
      ) : null}
    </Folha>
  );
}

function FolhaProximas({ r }: { r: ResumoFinanceiro }) {
  const x = r.proximas;
  const amanha = somarDias(r.hoje, 1);
  return (
    <Folha id="t-prox" titulo="Entra nos próximos 7 dias" icone="agenda" sub="As parcelas que vencem até lá, com a forma de pagamento">
      {x.n === 0 ? (
        <p className="fi-cob-sem">Nenhuma parcela vence nos próximos 7 dias.</p>
      ) : (
        <>
          <ul className="fi-linhas">
            {x.parcelas.map((p) => {
              const s = seloParcela(p, r.hoje);
              return (
                <li className="fi-linha" key={p.id}>
                  <span className="data">
                    <span className={p.vencimento <= amanha ? "disco hoje" : "disco"}><span>{p.vencimento.slice(8, 10)}</span></span>
                    <small>{MES_CURTO[Number(p.vencimento.slice(5, 7)) - 1]}</small>
                  </span>
                  <div className="fi-quem">
                    <a href={ROTAS_FINANCEIRO.contrato(p.contrato.id)}>{p.cliente.nome}</a>
                    <small>{p.descricao} · {mesReferencia(p.vencimento, r.hoje)}{p.forma ? ` · ${FORMAS_PAGAMENTO[p.forma]}` : ""}</small>
                    <span className="fi-por"><Selo tom={s.tom} icone={s.icone}>{s.texto}</Selo></span>
                  </div>
                  <div className="fi-lado"><span className="fi-v num">{reais(p.falta)}</span></div>
                </li>
              );
            })}
          </ul>
          <p className="fi-total"><span>{contar(x.n, "parcela", "parcelas")} até {diaCurto(x.ate!)}</span><b className="num">{reais(x.valor)}</b></p>
        </>
      )}
    </Folha>
  );
}

function SeloPrazo({ prazo, hoje }: { prazo: string; hoje: string }) {
  if (prazo < hoje) return <Selo tom="urgente" icone="alerta">Era {diaCurto(prazo)}</Selo>;
  if (prazo === hoje) return <Selo tom="atencao" icone="relogio">Até hoje</Selo>;
  return <Selo tom={prazo === somarDias(hoje, 1) ? "atencao" : "neutro"} icone={prazo === somarDias(hoje, 1) ? "relogio" : undefined}>Até {diaCurto(prazo)}</Selo>;
}

function deOnde(x: RepassePendente): string {
  const tipo = TIPOS_LEVANTAMENTO[x.tipo];
  if (x.para === "CLIENTE") return `Cliente · ${tipo} · ${x.caso}`;
  return `${PARA_DESTINACAO[x.para]} · ${tipo} de ${x.cliente}${x.regra ? ` · ${x.regra}` : ""}`;
}

function FolhaRepasses({ r }: { r: ResumoFinanceiro }) {
  const x = r.repasses;
  return (
    <Folha id="t-rep" titulo="Repasses pendentes" icone="enviar" terc sub="Quem ainda espera dinheiro que está com o escritório"
      ver={{ texto: "Repasses", href: ROTAS_FINANCEIRO.repasses }}>
      {x.n === 0 ? (
        <p className="fi-cob-sem">Ninguém espera repasse agora.</p>
      ) : (
        <>
          <ul className="fi-linhas">
            {x.lista.map((d) => (
              <li className="fi-linha rs-rep" key={d.id}>
                <span className="av-p forte rs-av" aria-hidden="true">{iniciais(d.nome)}</span>
                <div className="fi-quem">
                  <a href={ROTAS_FINANCEIRO.repasse(d.levantamentoId)}>{d.nome}</a>
                  <small>{deOnde(d)}</small>
                </div>
                <div className="fi-lado"><span className="fi-v num">{reais(d.valor)}</span><SeloPrazo prazo={d.prazo} hoje={r.hoje} /></div>
              </li>
            ))}
          </ul>
          <p className="fi-total">
            <span>{contar(x.n, "repasse a fazer", "repasses a fazer")}{x.n > x.lista.length ? ` · aqui os ${x.lista.length} de prazo mais curto` : ""}</span>
            <b className="num">{reais(x.valor)}</b>
          </p>
        </>
      )}
      {r.terceiros.honorarios ? (
        <p className="pt-pe-folha">
          <Icone nome="moeda" className="ico" />
          <span>Mais {reais(r.terceiros.honorarios)} de honorários e reembolsos a transferir para a conta do escritório.</span>
        </p>
      ) : null}
    </Folha>
  );
}

const COR_GRUPO = ["real", "tipo2", "urg", "tipo4"];

function FolhaNumeros({ r, mes }: { r: ResumoFinanceiro; mes: string }) {
  const grupos = receitaPorGrupo(r.porTipo);
  const max = Math.max(...grupos.map((g) => g.valor), 1);
  const f = r.fixas;
  const cobre = pct(f.receita, f.despesas);
  return (
    <Folha id="t-num" titulo={`${maiuscula(mes)} em números`} icone="funcoes">
      <dl className="fi-dl">
        <div>
          <dt>Contratado no mês</dt>
          <dd className="num">{reais(r.contratado.valor)}<br /><span className="fi-pq">{r.contratado.n ? contar(r.contratado.n, "contrato novo", "contratos novos") : "nenhum contrato novo"}</span></dd>
        </div>
        <div>
          <dt>Clientes que receberam valores</dt>
          <dd>{r.clientesReceberam.n ? contar(r.clientesReceberam.n, "cliente", "clientes") : "nenhum ainda"}<br /><span className="fi-pq num">{reais(r.clientesReceberam.valor)} repassados</span></dd>
        </div>
      </dl>
      <p className="fi-sub3" style={{ marginTop: 0 }}>Recebido por tipo de honorário</p>
      {grupos.length ? (
        <div className="fi-barras" role="group" aria-label="Recebido por tipo de honorário">
          {grupos.map((g, i) => (
            <div className="fi-barra rs-tipo" key={g.grupo}>
              <span className="rot">{g.nome}</span>
              <span className="fi-trilho" aria-hidden="true"><i className={COR_GRUPO[i % 4]} style={{ width: largura(g.valor, max) }} /></span>
              <span className="val"><b className="num">{reais(g.valor)}</b></span>
            </div>
          ))}
        </div>
      ) : (
        <p className="fi-cob-sem">Nenhum honorário recebido nos últimos meses.</p>
      )}
      <p className="fi-sub3" style={{ marginTop: 0 }}>Despesas fixas cobertas pela receita recorrente</p>
      {f.despesas ? (
        <div className="fi-medidor">
          <p><span className="fi-pct num">{cobre}%</span></p>
          <span className="fi-trilho" role="img" aria-label={`${cobre}% coberto`}><i className="real" style={{ width: `${Math.min(cobre, 100)}%` }} /></span>
          <p>
            As mensalidades e parcelas previstas ({reais(f.receita)}) cobrem <b>{cobre}%</b> das despesas fixas do mês ({reais(f.despesas)}).
            {cobre < 100 ? " O resto depende de êxito e de contratos novos." : " Elas pagam as fixas sozinhas."}
          </p>
        </div>
      ) : (
        <p className="fi-cob-sem">Nenhuma despesa fixa lançada neste mês. Em A pagar, marque &quot;Repete todo mês&quot; nas contas fixas.</p>
      )}
    </Folha>
  );
}

function ResumoVazio() {
  const passos = [
    { n: 1, t: "Cadastre os contratos", p: "Cada contrato de honorários, na área Contratos, gera as parcelas daqui, com vencimento e forma de pagamento. Você não digita parcela.",
      b: <a className="btn btn-pri" href={rotaArea("CONTRATOS")}><Icone nome="pena" className="ico" />Ir para Contratos</a> },
    { n: 2, t: "Lance as contas fixas", p: "Aluguel, folha, impostos e sistemas. Marque \"todo mês\" e elas aparecem sozinhas nos meses seguintes.",
      b: <a className="btn btn-sec" href={`${ROTAS_FINANCEIRO.pagar}?lancar=1`}><Icone nome="mais" className="ico" />Lançar conta</a> },
    { n: 3, t: "Registre alvarás e RPVs", p: "Quando um valor de terceiros entrar, o sistema mostra quanto é de cada um e guarda até tudo ser repassado.",
      b: <a className="btn btn-sec" href={`${ROTAS_FINANCEIRO.repasses}?registrar=1`}><Icone nome="escudo" className="ico" />Registrar valor</a> },
  ];
  return (
    <section className="folha" aria-labelledby="t-vz">
      <h2 className="sr" id="t-vz">Primeiros passos</h2>
      <Estado icone="carteira" titulo="O financeiro ainda está vazio">
        Ele se monta a partir dos contratos. Comece pelo primeiro passo; os outros podem vir quando acontecerem.
      </Estado>
      <ol className="fi-passos">
        {passos.map((x) => (
          <li key={x.n}>
            <span className="disco"><span>{x.n}</span></span>
            <h3>{x.t}</h3>
            <p>{x.p}</p>
            {x.b}
          </li>
        ))}
      </ol>
    </section>
  );
}

function ResumoConteudo() {
  const { dados, recarregar } = useCarga<ResumoFinanceiro>("/v1/escritorio/financeiro/resumo");
  const [meta, setMeta] = useState(false);
  const [feito, setFeito] = useState<Feito | null>(null);
  const lede = "Do honorário contratado ao dinheiro recebido e repassado.";
  if (dados === "erro") return <div className="fi"><Cab titulo="Resumo" lede={lede} /><ErroAoCarregar oque="o resumo" aoTentar={recarregar} /></div>;
  if (!dados) return <div className="fi"><Cab titulo="Resumo" lede={lede} /><Carregando rotulo="Carregando o resumo…" linhas={5} /></div>;
  if (!dados.algum) return <div className="fi"><Cab titulo="Resumo" lede={lede} /><ResumoVazio /></div>;
  const mes = nomeDoMes(dados.mes);
  return (
    <div className="fi">
      <Cab titulo="Resumo" lede={`${lede} Hoje, ${diaLongo(dados.hoje).replace(/^(\S+?),/, "$1-feira,").replace(/^(sábado|domingo)-feira/, "$1")}.`} />
      <Abertura r={dados} mes={mes} />
      <div className="fi-grade">
        <div className="fi-col">
          <FolhaPrevisto r={dados} mes={mes} aoMeta={dados.meta?.dono ? () => setMeta(true) : undefined} />
          <FolhaVencido r={dados} />
        </div>
        <div className="fi-col">
          <FolhaProximas r={dados} />
          <FolhaRepasses r={dados} />
          <FolhaNumeros r={dados} mes={mes} />
        </div>
      </div>
      {meta && dados.meta ? (
        <JanelaMeta r={dados} aoFechar={() => setMeta(false)} aoFeito={(f) => { setMeta(false); setFeito(f); recarregar(); }} />
      ) : null}
      {feito ? <Toast feito={feito} aoFechar={() => setFeito(null)} /> : null}
    </div>
  );
}

/** Definir ou mudar a meta (F3.49): valor e de quando vale. Meses fechados não mudam. */
function JanelaMeta({ r, aoFechar, aoFeito }: { r: ResumoFinanceiro; aoFechar: () => void; aoFeito: (f: Feito) => void }) {
  const mt = r.meta!;
  const opcoes = [0, 1, 2, 3].map((n) => somarMeses(r.mes, n));
  const [valor, setValor] = useState(mt.mes ? valorCampo(mt.mes.valor) : "");
  const [so, setSo] = useState(false);
  const [mesSo, setMesSo] = useState(opcoes[1]!);
  const [erros, setErros] = useState<string[]>([]);
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const corpo = useRef<HTMLDivElement>(null);
  const tem = (c: string) => erros.includes(c);
  const atual = nomeMesAno(r.mes);
  const todo = mt.todoMes;
  const prevMes = r.escritorio.recebido + r.escritorio.vencidoMes + r.escritorio.seteDias + r.escritorio.restoMes;
  const de3 = r.meses.filter((m) => m.mes < r.mes).slice(-3);

  async function enviar() {
    if (enviando) return;
    const v = lerCentavosMeta(valor);
    const e = !v ? ["valor"] : [];
    setFalha(null);
    if (e.length) { setErros(e); return focarErro(corpo.current); }
    setEnviando(true);
    const x = await chamarPortal("/v1/escritorio/financeiro/meta", { metodo: "PUT", corpo: { valor: v, mes: so ? mesSo : r.mes, soMes: so } });
    setEnviando(false);
    if (x.ok) {
      return aoFeito({
        titulo: "Meta salva.",
        texto: so ? `${maiuscula(nomeMesAno(mesSo))} tem a meta de ${reais(v!)}, só esse mês.` : `A meta agora é ${reais(v!)} todo mês, a partir de ${atual}. Os meses que já fecharam continuam com a meta deles.`,
      });
    }
    const cs = x.erro.detalhes?.campos;
    if (x.erro.codigo === "VALIDATION_ERROR" && Array.isArray(cs) && cs.length) { setErros(cs.map(String)); return focarErro(corpo.current); }
    setFalha(`${textoDoErro(x.erro)} Nada foi salvo: ${nomeDoMes(r.mes)} continua com a meta de antes. O valor que você escreveu continua aqui.`);
  }

  // Tirar a meta (F3.90): sem meta a partir do mês escolhido; os meses fechados não mudam.
  const temMeta = !!(mt.mes || mt.todoMes || mt.umMes.length);
  async function tirar() {
    if (enviando) return;
    const de = so ? mesSo : r.mes;
    setFalha(null);
    setErros([]);
    setEnviando(true);
    const x = await chamarPortal("/v1/escritorio/financeiro/meta/tirar", { metodo: "POST", corpo: { mes: de } });
    setEnviando(false);
    if (x.ok) {
      return aoFeito({
        titulo: "Meta tirada.",
        texto: `De ${nomeMesAno(de)} em diante, o escritório fica sem meta. Os meses que já fecharam continuam com a meta deles.`,
      });
    }
    setFalha(`${textoDoErro(x.erro)} Nada mudou: ${nomeDoMes(r.mes)} continua com a meta de antes.`);
  }

  return (
    <Janela id="j-meta" aberta aoFechar={aoFechar} sobretitulo="Resumo" titulo="Meta de receita" descricao="j-meta-d" aoEnviar={() => void enviar()}
      pe={<>
        {temMeta ? <button className="btn btn-fantasma pd-pe-j" type="button" onClick={() => void tirar()} disabled={enviando}><Icone nome="xis" className="ico" />Tirar a meta</button> : null}
        <button className="btn btn-sec" type="button" onClick={aoFechar}>Cancelar</button>
        <button className="btn btn-pri" type="submit" aria-busy={enviando || undefined}><Icone nome="check" className="ico" />Salvar a meta</button>
      </>}>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id="j-meta-d">Quanto o escritório quer receber de honorários no mês.</p>
        {erros.length ? <Aviso tom="urgencia" titulo={erros.length === 1 ? "Falta acertar 1 ponto, marcado abaixo." : `Falta acertar ${erros.length} pontos, marcados abaixo.`}>A meta ainda não foi salva.</Aviso> : null}
        {falha ? <Aviso tom="urgencia" titulo="Não deu para salvar a meta.">{falha}</Aviso> : null}
        <div className="campo">
          <label htmlFor="mt-valor">Meta de receita do mês</label>
          <input className="entrada" id="mt-valor" inputMode="decimal" autoComplete="off" value={valor} onChange={(e) => { setValor(e.target.value); setErros((x) => x.filter((c) => c !== "valor")); }} data-foco=""
            aria-invalid={tem("valor") || undefined} aria-describedby={tem("valor") ? "mt-valor-er" : "mt-valor-aj"} />
          {tem("valor") ? <p className="erro-msg" id="mt-valor-er"><Icone nome="alerta" className="ico ico-s" />Escreva um valor maior que zero.{temMeta ? " Para ficar sem meta, use “Tirar a meta”." : ""}</p>
            : <p className="ajuda" id="mt-valor-aj">Honorários que entram no caixa do escritório no mês. Valores de terceiros não contam.</p>}
        </div>
        <fieldset className="fi-grupo-op">
          <legend>Vale para</legend>
          <label className="opcao">
            <input className="marcar" type="radio" name="mt-v" checked={!so} onChange={() => setSo(false)} />
            <span>Todo mês, a partir de {atual}<small>{todo && todo.deMes < r.mes ? `Substitui a de ${reais(todo.valor)}, que valia desde ${nomeMesAno(todo.deMes)}. Os meses que já fecharam continuam comparados com ela.` : "Os meses que já fecharam não mudam."}</small></span>
          </label>
          <label className="opcao">
            <input className="marcar" type="radio" name="mt-v" checked={so} onChange={() => setSo(true)} />
            <span>Só em um mês<small>Os outros meses continuam com a meta de todo mês.</small></span>
          </label>
          {so ? (
            <div className="pd-op-dentro campo">
              <label htmlFor="mt-mes">Qual mês</label>
              <select className="entrada" id="mt-mes" value={mesSo} onChange={(e) => setMesSo(e.target.value)} aria-invalid={tem("mes") || undefined} aria-describedby={tem("mes") ? "mt-mes-er" : undefined}>
                {opcoes.map((m) => <option key={m} value={m}>{maiuscula(nomeMesAno(m))}</option>)}
              </select>
              {tem("mes") ? <p className="erro-msg" id="mt-mes-er"><Icone nome="alerta" className="ico ico-s" />Este mês já fechou. A meta de um mês fechado não muda, para a comparação continuar verdadeira.</p> : null}
            </div>
          ) : null}
        </fieldset>
        <dl className="fi-dl mt-ref">
          {de3.length ? <div><dt>Média de {nomeDoMes(de3[0]!.mes)} a {nomeDoMes(de3[de3.length - 1]!.mes)}</dt><dd className="num">{reais(mt.media3)}</dd></div> : null}
          <div><dt>Previsto para {nomeDoMes(r.mes)}</dt><dd className="num">{reais(prevMes)}</dd></div>
          {mt.umMes.length ? <div><dt>Meses com meta só deles</dt><dd>{mt.umMes.map((x) => <span key={x.deMes}>{maiuscula(nomeMesAno(x.deMes))}: {reais(x.valor)}<br /></span>)}<span className="fi-pq">continuam como estão</span></dd></div> : null}
        </dl>
        <p className="fi-ref"><Icone nome="historico" className="ico" /><span>Quem vê o Financeiro vê a meta. Só você, a sócia dona, muda. Cada mudança fica no histórico, e a meta de um mês que já fechou não muda.</span></p>
      </div>
    </Janela>
  );
}

const somarMeses = (mes: string, n: number) => {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(a!, m! - 1 + n, 1));
  return d.toISOString().slice(0, 10);
};
const valorCampo = (c: number) => new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(c / 100);
function lerCentavosMeta(t: string): number | null {
  const x = t.replace(/[R$\s.]/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(x)) return null;
  const v = Math.round(Number(x) * 100);
  return v > 0 ? v : null;
}
function focarErro(el: HTMLElement | null) {
  el?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
}

export function ResumoDoFinanceiro() {
  return <MolduraArea area="FINANCEIRO" secao="resumo" pagina="co-ficha co-carteira">{() => <ResumoConteudo />}</MolduraArea>;
}

// -------------------------------------------------------------------------------------- Caixa

/** Passou da data estimada: saiu da previsão até alguém mudar a data em Repasses. */
function PassouDaData({ c }: { c: CaixaFinanceiro }) {
  const lista = c.aCaminho.itens.filter((r) => r.passou);
  const n = c.aCaminho.passou.n;
  return (
    <div className="fi-aviso-in">
      <Aviso tom="atencao" icone="alerta"
        titulo={n === 1 ? `1 ${TIPOS_REQUISICAO[lista[0]?.tipo ?? "RPV"].titulo} passou da data estimada e saiu da previsão.` : `${n} RPVs e precatórios passaram da data estimada e saíram da previsão.`}
        acoes={<a className="btn btn-sec btn-compacto" href={`${ROTAS_FINANCEIRO.repasses}#t-cam`}><Icone nome="agenda" className="ico" />Mudar a data</a>}>
        {lista.map((r) => `${r.cliente.nome}, ${TIPOS_REQUISICAO[r.tipo].titulo}: ${reais(r.parteEscritorio)} do escritório, era ${nomeDoMes(r.estimadaMes)}`).join("; ")}. Volta à previsão quando tiver data nova.
      </Aviso>
    </div>
  );
}

function FolhaPrevistoCaixa({ c }: { c: CaixaFinanceiro }) {
  const max = Math.max(...c.meses.flatMap((m) => [m.entradasPrevistas, m.entradasRealizadas ?? 0]), 1);
  const primeiro = c.meses[0]!.mes;
  const ultimo = c.meses[c.meses.length - 1]!.mes;
  const sub = (m: MesCaixa) => (m.mes === c.mes ? "até hoje" : m.mes > c.mes ? "previsto" : null);
  const futuro = (m: MesCaixa) => m.mes > c.mes;
  const valorOuTraco = (v: number | null) => (v === null ? <span className="fi-pq">—</span> : reais(v));
  return (
    <Folha id="t-prev" titulo="Previsto e realizado" icone="moeda"
      sub={`Entradas do escritório, de ${nomeDoMes(primeiro)} a ${nomeDoMes(ultimo)}. Saldo de ${nomeDoMes(c.mes)} em diante é previsão.`}>
      <div className="fi-meses" role="group" aria-label="Entradas do escritório por mês, previstas e realizadas">
        {c.meses.map((m) => (
          <div className={m.mes === c.mes ? "fi-mes fi-hoje" : "fi-mes"} key={m.mes}>
            <span className="rot">{maiuscula(nomeDoMes(m.mes))}{sub(m) ? <small>{sub(m)}</small> : null}</span>
            <span className="fi-duplo" aria-hidden="true">
              <span className="fi-trilho">
                <i className="prev" style={{ width: largura(m.entradasPrevistas, max) }} />
                {futuro(m) && m.aCaminho ? (
                  <i className="rpv" style={{ left: largura(m.entradasPrevistas - m.aCaminho, max), width: largura(m.aCaminho, max), borderRadius: "0 4px 4px 0" }} />
                ) : null}
              </span>
              {futuro(m) ? null : <span className="fi-trilho"><i className="real" style={{ width: largura(m.entradasRealizadas ?? 0, max) }} /></span>}
            </span>
            <span className="val">
              {futuro(m)
                ? <><b className="num">{reais(m.entradasPrevistas)}</b> previstos{m.aCaminho ? <><br />dos quais {reais(m.aCaminho)} de RPV</> : null}</>
                : <><b className="num">{reais(m.entradasRealizadas ?? 0)}</b> realizados<br />de {reais(m.entradasPrevistas)} previstos</>}
            </span>
          </div>
        ))}
      </div>
      <p className="legenda fi-leg">
        <span><i style={{ background: "var(--ambar-3)", boxShadow: "inset 0 0 0 1px var(--vinho-4)" }} />Previsto</span>
        <span><i style={{ background: "var(--vinho)" }} />Realizado</span>
        {c.aCaminho.n ? <span><i style={{ background: "var(--ambar)" }} />RPV ou precatório com data estimada</span> : null}
      </p>
      {c.aCaminho.passou.n ? <PassouDaData c={c} /> : null}
      <p className="fi-sub3" style={{ marginTop: 0 }}>Mês a mês</p>
      <div style={{ overflowX: "auto" }} className="so-pc">
        <table className="fi-tab fi-tab-caixa">
          <caption className="sr">Entradas, saídas e saldo por mês</caption>
          <colgroup><col style={{ width: "18%" }} /><col /><col /><col /><col /><col /></colgroup>
          <thead>
            <tr>
              <th scope="col">Mês</th><th scope="col">Entradas previstas</th><th scope="col">Entradas realizadas</th>
              <th scope="col">Saídas previstas</th><th scope="col">Saídas realizadas</th><th scope="col">Saldo no fim</th>
            </tr>
          </thead>
          <tbody>
            {c.meses.map((m) => (
              <tr key={m.mes} className={futuro(m) ? "fi-futuro" : undefined}>
                <td><b style={{ fontWeight: 500 }} title={nomeMesAno(m.mes)}>{maiuscula(nomeDoMes(m.mes))}</b>{sub(m) ? <span className="fi-pq"> ({sub(m)})</span> : null}</td>
                <td className="num">{reais(m.entradasPrevistas)}</td>
                <td className="num">{valorOuTraco(m.entradasRealizadas)}</td>
                <td className="num">{reais(m.saidasPrevistas)}</td>
                <td className="num">{valorOuTraco(m.saidasRealizadas)}</td>
                <td className="num"><b style={{ fontWeight: 600 }}>{reais(m.saldo)}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="cartoes so-cel" aria-label="Mês a mês">
        {c.meses.map((m) => (
          <li className="cartao" key={m.mes}>
            <div className="c-topo"><div><strong className="c-nome rs-mes">{nomeMes(m.mes, c.hoje)}</strong><small>{sub(m) ?? "realizado"}</small></div></div>
            <dl className="c-dados">
              <dt>Entradas</dt><dd className="num">{futuro(m) ? `${reais(m.entradasPrevistas)} prev.` : reais(m.entradasRealizadas ?? 0)}</dd>
              <dt>Saídas</dt><dd className="num">{futuro(m) ? `${reais(m.saidasPrevistas)} prev.` : reais(m.saidasRealizadas ?? 0)}</dd>
              <dt>Saldo no fim</dt><dd className="num">{reais(m.saldo)}</dd>
            </dl>
          </li>
        ))}
      </ul>
    </Folha>
  );
}

function FolhaContador({ c, aoExportar }: { c: CaixaFinanceiro; aoExportar: () => void }) {
  const ultima = c.exportacoes[0];
  const anterior = c.mesesExportar.find((m) => m < c.mes);
  const anteriorFeita = anterior ? c.exportacoes.some((e) => e.mes === anterior) : false;
  const ct = c.contador ?? null;
  const quando = (em: string) => `${diaCurto(diaDoInstante(em))}, às ${horaDoInstante(em)}`;
  return (
    <Folha id="t-exp" titulo="Para o contador" icone="doc" sub="Recebimentos, despesas e recibos do mês, com terceiros à parte">
      <dl className="fi-dl">
        {ultima ? (
          <div>
            <dt>{maiuscula(nomeMesAno(ultima.mes))}</dt>
            {ultima.envio ? (
              <dd>
                {ultima.envio.situacao === "ENVIADO" ? `Enviado por e-mail em ${quando(ultima.envio.em)}` : `O e-mail não saiu em ${quando(ultima.envio.em)}`}
                <br /><span className="fi-pq">por {ultima.envio.por?.nome ?? "alguém da equipe"}{ultima.envio.situacao === "ENVIADO" ? " · entregue ao envio" : " · exporte de novo para mandar"}</span>
              </dd>
            ) : (
              <dd>Exportado em {diaCurto(diaDoInstante(ultima.em))}<br /><span className="fi-pq">por {ultima.por?.nome ?? "alguém da equipe"}</span></dd>
            )}
          </div>
        ) : null}
        {anterior && !anteriorFeita ? (
          <div><dt>{maiuscula(nomeMesAno(anterior))}</dt><dd>Pronto para exportar</dd></div>
        ) : null}
        <div>
          <dt>{maiuscula(nomeMesAno(c.mes))}</dt>
          <dd>Pronto a partir de {diaCurto(proximoMes(c.mes))}{c.lembrete ? <><br /><span className="fi-pq">lembrete no sino em {diaCurto(c.lembrete)}</span></> : null}</dd>
        </div>
        {ct ? <div><dt>Para quem vai</dt><dd>{ct.nome}{ct.firma ? ` · ${ct.firma}` : ""}<br /><span className="fi-pq">{ct.email}</span></dd></div> : null}
      </dl>
      {ct === null && c.contador !== undefined ? (
        <p className="ct-sem"><Icone nome="envelope" className="ico" /><span><b>Nenhum contador cadastrado.</b> Com o nome e o e-mail dele, a exportação vai por e-mail sem você anexar nada.</span></p>
      ) : null}
      <div className="fi-cob">
        {ct === null && c.contador !== undefined && c.dono ? <a className="btn btn-sec" href={ROTA_AJUSTES}><Icone nome="mais" className="ico" />Cadastrar o contador</a> : null}
        <button className="btn btn-sec" type="button" onClick={aoExportar}><Icone nome="baixar" className="ico" />Exportar um mês</button>
      </div>
    </Folha>
  );
}

function CaixaConteudo() {
  const { dados, recarregar } = useCarga<CaixaFinanceiro>("/v1/escritorio/financeiro/caixa");
  const [exportar, setExportar] = useState(false);
  const [feito, setFeito] = useState<Feito | null>(null);
  const lede = "O que entrou e saiu, o que está previsto e o saldo do escritório, sem misturar o que é de terceiros.";
  const botao = (
    <button className="btn btn-pri" type="button" onClick={() => setExportar(true)} style={{ marginBottom: 6 }}>
      <Icone nome="baixar" className="ico" />Exportar para o contador
    </button>
  );
  if (dados === "erro") return <div className="fi"><Cab titulo="Caixa" lede={lede} /><ErroAoCarregar oque="o caixa" aoTentar={recarregar} /></div>;
  if (!dados) return <div className="fi"><Cab titulo="Caixa" lede={lede} /><Carregando rotulo="Carregando o caixa…" linhas={5} /></div>;
  const c = dados;
  const mes = nomeDoMes(c.mes);
  return (
    <div className="fi">
      <Cab titulo="Caixa" lede={lede} botao={botao} />
      <div className="fi-saldos">
        <section className="fi-saldo campo-vinho" aria-labelledby="t-s1" style={{ position: "relative" }}>
          <Icone nome="coluna" className="ico estatua" />
          <p className="sobretitulo" id="t-s1">Do escritório · hoje</p>
          <p><span className="fi-big num">{reais(c.saldo)}</span></p>
          <p>Saldo do caixa do escritório, pelos registros do T3jus. Se tudo o que está previsto entrar e sair, fecha {mes} em <b>{reais(c.fechaMes)}</b>.</p>
          {c.abertura ? (
            <p className="ct-abertura"><Icone nome="historico" className="ico" /><span>Começa no saldo de abertura de <b>{reais(c.abertura.valor)}</b>, em {diaBr(c.abertura.data)}.</span> <a href={ROTA_AJUSTES}>Ver em Escritório</a></p>
          ) : c.abertura === null ? (
            <>
              <p className="ct-abertura ct-falta"><Icone nome="alerta" className="ico" /><span><b>O saldo começa em R$ 0,00.</b> Falta o saldo de abertura: o que havia na conta antes do primeiro lançamento.</span></p>
              {c.dono ? <a className="btn btn-escuro ct-bot" href={ROTA_AJUSTES}><Icone nome="lapis" className="ico" />Lançar o saldo de abertura</a> : null}
            </>
          ) : null}
        </section>
        <section className="fi-saldo campo-ambar" aria-labelledby="t-s2" style={{ position: "relative" }}>
          <p className="fi-terc-rot" id="t-s2"><Icone nome="escudo" className="ico" />De terceiros · hoje</p>
          <p><span className="fi-big num">{reais(c.terceiros.saldo)}</span></p>
          <p>
            {c.terceiros.saldo
              ? <>Está na conta, mas não é do escritório e <b>não entra na previsão</b>.{quemEspera(c.terceiros) ? ` É de ${quemEspera(c.terceiros)}` : ""}{c.terceiros.honorarios ? `${quemEspera(c.terceiros) ? "," : " Há"} mais honorários a transferir` : ""}.</>
              : "Nada de terceiros na conta agora: tudo o que entrou já foi repassado ou transferido."}
          </p>
          <a className="btn btn-escuro" href={ROTAS_FINANCEIRO.repasses} style={{ justifySelf: "start", marginTop: 4 }}><Icone nome="enviar" className="ico" />Ver repasses</a>
        </section>
      </div>
      <div className="fi-grade">
        <div className="fi-col"><FolhaPrevistoCaixa c={c} /></div>
        <aside className="fi-col" aria-label="A caminho e contador">
          <FolhaACaminho a={c.aCaminho} titulo="RPVs e precatórios a caminho" ateMes={c.meses[c.meses.length - 1]!.mes} verEm={`${ROTAS_FINANCEIRO.repasses}#t-cam`} />
          <FolhaContador c={c} aoExportar={() => setExportar(true)} />
          <section className="folha" aria-labelledby="t-conc" style={{ overflow: "hidden" }}>
            <div className="folha-cab"><div><h2 id="t-conc"><Icone nome="sincronia" className="ico" />Conferência com o extrato</h2></div></div>
            <div className="fi-reserva">
              <Icone nome="cadeado" className="ico" />
              <span><b>Conferir com o extrato do banco</b>, apontando o que saiu sem lançamento, ainda está em validação com os pilotos. Este é o lugar dela.</span>
            </div>
          </section>
        </aside>
      </div>
      {exportar ? (
        <JanelaExportar c={c} aoFechar={() => setExportar(false)}
          aoFeito={(f) => { setExportar(false); setFeito(f); recarregar(); }} />
      ) : null}
      {feito ? <Toast feito={feito} aoFechar={() => setFeito(null)} /> : null}
    </div>
  );
}

export function CaixaDoFinanceiro() {
  return <MolduraArea area="FINANCEIRO" secao="caixa">{() => <CaixaConteudo />}</MolduraArea>;
}

// ----------------------------------------------------------------------- Exportar para o contador

/** Os bytes do arquivo em base64, para ir anexado ao e-mail do contador. */
function emBase64(d: Uint8Array | string): string {
  const b = typeof d === "string" ? new TextEncoder().encode(d) : d;
  let s = "";
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
}

const ROTA_AJUSTES = "/meu-escritorio/financeiro";

export function salvar(nome: string, tipo: string, dados: Uint8Array | string) {
  const blob = new Blob([dados as BlobPart], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function JanelaExportar({ c, aoFechar, aoFeito }: { c: CaixaFinanceiro; aoFechar: () => void; aoFeito: (f: Feito) => void }) {
  const [mes, setMes] = useState(c.mesesExportar.find((m) => m < c.mes) ?? c.mes);
  const [formato, setFormato] = useState<FormatoExportacao>("XLSX");
  const [previa, setPrevia] = useState<{ mes: string; p: PreviaExportacao | "erro" } | null>(null);
  const [anexos, setAnexos] = useState<{ mes: string; a: AnexosDaExportacao | null } | null>(null);
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const seq = useRef(0);
  const p = previa && previa.mes === mes ? previa.p : null;
  const nome = nomeMesAno(mes);

  useEffect(() => {
    const n = ++seq.current;
    void chamarPortal<PreviaExportacao>(`/v1/escritorio/financeiro/exportacoes/previa?mes=${mes}`).then((r) => {
      if (n === seq.current) setPrevia({ mes, p: r.ok ? r.dados : "erro" });
    });
    void chamarPortal<AnexosDaExportacao>(`/v1/escritorio/financeiro/exportacoes/anexos?mes=${mes}`).then((r) => {
      if (n === seq.current) setAnexos({ mes, a: r.ok ? r.dados : null });
    });
  }, [mes]);

  const ct = c.contador ?? null;
  const [mandar, setMandar] = useState(!!ct?.mandarAoExportar);
  // O e-mail que não saiu (F3.50): o arquivo já foi gerado e baixado; "Mandar de novo" manda o mesmo.
  const [naoSaiu, setNaoSaiu] = useState<{ id: string; nome: string; base64: string; mes: string } | null>(null);

  async function mandarAoContador(x: { id: string; nome: string; base64: string; mes: string }): Promise<boolean> {
    const e = await chamarPortal<EnvioContador>(`/v1/escritorio/financeiro/exportacoes/${x.id}/enviar`, { metodo: "POST", corpo: { nome: x.nome, arquivo: x.base64 } });
    if (e.ok && e.dados.situacao === "ENVIADO") return true;
    setNaoSaiu(x);
    return false;
  }

  // Os comprovantes do mês num .zip (F3.22b): o servidor monta e devolve um link curto por parte.
  async function baixarComprovantes(id: string): Promise<boolean> {
    const r = await chamarPortal<PastaParaBaixar>(`/v1/escritorio/financeiro/exportacoes/${id}/pasta`, { metodo: "POST", corpo: {} });
    if (!r.ok) return false;
    for (const x of r.dados.pasta?.partes ?? []) {
      const a = document.createElement("a");
      a.href = x.url;
      a.download = x.nome;
      document.body.append(a);
      a.click();
      a.remove();
    }
    return true;
  }

  async function enviar() {
    if (enviando) return;
    setFalha(null);
    setEnviando(true);
    if (naoSaiu) {
      const ok = await mandarAoContador(naoSaiu);
      setEnviando(false);
      if (ok) aoFeito({ titulo: `Exportação de ${nomeMesAno(naoSaiu.mes)} mandada a ${ct?.nome ?? "o contador"}.`, texto: "O envio ficou no histórico do escritório." });
      return;
    }
    const r = await chamarPortal<DadosExportacao>("/v1/escritorio/financeiro/exportacoes", { metodo: "POST", corpo: { mes, formato } });
    if (!r.ok) {
      setEnviando(false);
      return setFalha(textoDoErro(r.erro));
    }
    const a = arquivoContador(r.dados, formato, an?.semNota);
    salvar(a.nome, a.tipo, a.dados);
    const comZip = formato === "XLSX" && !!an?.anexos.length;
    const zipOk = comZip ? await baixarComprovantes(r.dados.id) : true;
    const semZip = zipOk ? "" : " Os comprovantes (.zip) não baixaram agora; exporte o mês de novo para baixar.";
    if (mandar && ct) {
      const ok = await mandarAoContador({ id: r.dados.id, nome: a.nome, base64: emBase64(a.dados), mes });
      setEnviando(false);
      if (!ok) return;
      return aoFeito(comZip
        ? { titulo: `${maiuscula(nomeDoMes(mes))} foi para ${ct.nome}.`, texto: `A planilha e o link dos comprovantes (.zip) saíram para ${ct.email}. ${zipOk ? "Também baixaram no seu aparelho." : `A planilha também baixou no seu aparelho.${semZip}`}` }
        : { titulo: `Exportação de ${nome} mandada a ${ct.nome}.`, texto: `O arquivo ${a.nome} também foi salvo no seu aparelho. A exportação e o envio ficaram no histórico.` });
    }
    setEnviando(false);
    aoFeito({
      titulo: `Exportação de ${nome} gerada.`,
      texto: comZip && zipOk
        ? `A planilha ${a.nome} e os comprovantes (.zip) foram salvos, e a exportação ficou no histórico do escritório.`
        : `O arquivo ${a.nome} foi salvo, e a exportação ficou no histórico do escritório.${semZip}`,
    });
  }

  const an = anexos && anexos.mes === mes ? anexos.a : null;
  const rec = p && p !== "erro" ? { n: p.recebimentos.n + p.honorariosTransferidos.n, valor: p.recebimentos.valor + p.honorariosTransferidos.valor } : null;
  return (
    <Janela id="j-exp" aberta aoFechar={aoFechar} sobretitulo="Caixa" titulo="Exportar para o contador" descricao="j-exp-d" aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-sec" type="button" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-pri" type="submit" disabled={enviando} aria-busy={enviando || undefined} data-foco="">
            <Icone nome={ct && (mandar || naoSaiu) ? "envelope" : "baixar"} className="ico" />{naoSaiu ? "Mandar de novo" : ct && mandar ? "Exportar e mandar" : `Exportar ${nomeDoMes(mes)}`}
          </button>
        </>
      }>
      <div style={{ display: "grid", gap: 18 }}>
        <p id="j-exp-d">Tudo o que o contador pede do mês, num arquivo só.</p>
        {falha ? <Aviso tom="urgencia" titulo="O arquivo não foi gerado.">{falha}</Aviso> : null}
        {naoSaiu ? (
          <Aviso tom="urgencia" titulo="O arquivo foi gerado, mas o e-mail não saiu.">
            A exportação de {nomeMesAno(naoSaiu.mes)} está no histórico e já baixou no seu aparelho. Só o envio a {ct?.nome ?? "o contador"} falhou; nada mais mudou. Tente mandar de novo.
          </Aviso>
        ) : null}
        <div className="campo">
          <label htmlFor="ex-mes">Mês</label>
          <select className="entrada" id="ex-mes" value={mes} onChange={(e) => setMes(e.target.value)}>
            {c.mesesExportar.map((m) => <option key={m} value={m}>{maiuscula(nomeMesAno(m))}{m === c.mes ? " (ainda aberto)" : ""}</option>)}
          </select>
        </div>
        <div aria-live="polite">
          <p className="fi-rotulo" style={{ marginBottom: 6 }}>O que vai no arquivo</p>
          {p === "erro" ? (
            <p className="fi-cob-sem" style={{ padding: 0 }}>Não deu para ver o que vai no arquivo. Feche e abra a janela de novo.</p>
          ) : !p || !rec ? (
            <p className="fi-cob-sem" style={{ padding: 0 }}>Conferindo {nome}…</p>
          ) : (
            <ul className="fi-check">
              <li><Icone nome="check" className="ico" /><span>{contar(rec.n, "recebimento", "recebimentos")}, por tipo de honorário<small>{reais(rec.valor)}</small></span></li>
              <li><Icone nome="check" className="ico" /><span>{contar(p.despesas.n, "despesa paga", "despesas pagas")}, por categoria<small>{reais(p.despesas.valor)}</small></span></li>
              <li><Icone nome="check" className="ico" /><span>{p.recibos ? `${contar(p.recibos, "recibo emitido", "recibos emitidos")}, com o número na planilha` : "Nenhum recibo emitido no mês"}</span></li>
              {formato === "XLSX" ? (
                <li><Icone nome="check" className="ico" /><span>Saldo do caixa no começo e no fim do mês<small>{c.abertura ? "A partir do saldo de abertura" : "Sem saldo de abertura, o saldo começa em R$ 0,00"}</small></span></li>
              ) : null}
              <li>
                <Icone nome="escudo" className="ico" />
                <span>
                  Valores de terceiros numa aba à parte
                  <small>{p.terceiros.entrou || p.terceiros.repassado
                    ? `${reais(p.terceiros.entrou)} entraram e ${reais(p.terceiros.repassado)} foram repassados. Não são receita do escritório.`
                    : "Nenhum valor de terceiros entrou ou foi repassado no mês."}</small>
                </span>
              </li>
              {an && an.anexos.length && formato === "XLSX" ? (
                <li>
                  <Icone nome="check" className="ico" />
                  <span>
                    Os comprovantes num .zip: {contar(an.anexos.length, "comprovante, nota ou guia", "comprovantes, notas e guias")}
                    <small>{tamanhoLegivel(an.anexos.reduce((t, x) => t + x.tamanho, 0))} · cada arquivo com a data e o lançamento no nome</small>
                  </span>
                </li>
              ) : an ? (
                <li>
                  <Icone nome="doc" className="ico" />
                  <span>
                    {an.anexos.length ? `${contar(an.anexos.length, "comprovante, nota ou guia anexado", "comprovantes, notas e guias anexados")} aos lançamentos` : "Nenhum comprovante, nota ou guia anexado no mês"}
                    <small>{an.anexos.length ? "Ficam guardados em cada lançamento. Para levar num .zip, escolha a planilha (.xlsx)." : "Ficam guardados em cada lançamento, quando anexados."}</small>
                  </span>
                </li>
              ) : null}
              {an && an.semNota.length ? (
                <li className="rs-falta">
                  <Icone nome="alerta" className="ico" />
                  <span>
                    {contar(an.semNota.length, "despesa sem nota fiscal", "despesas sem nota fiscal")}
                    <small>{an.semNota.slice(0, 3).map((x) => `${x.descricao}, ${diaCurto(x.dia)}`).join(" · ")}{an.semNota.length > 3 ? ` e mais ${an.semNota.length - 3}` : ""}. Vão marcadas na planilha.</small>
                  </span>
                </li>
              ) : null}
            </ul>
          )}
          {p && p !== "erro" && p.aberto ? (
            <Aviso tom="atencao" className="rs-aberto" titulo={`${maiuscula(nomeDoMes(mes))} ainda não fechou.`}>O arquivo leva o que entrou e saiu até hoje. Exporte de novo depois do dia 1º.</Aviso>
          ) : null}
        </div>
        <fieldset className="fi-grupo-op">
          <legend>Formato</legend>
          <label className="opcao">
            <input className="marcar" type="radio" name="ex-f" checked={formato === "XLSX"} onChange={() => setFormato("XLSX")} />
            <span>Planilha (.xlsx) e os comprovantes (.zip)<small>O mais pedido pelos contadores, com uma aba para cada parte</small></span>
          </label>
          <label className="opcao">
            <input className="marcar" type="radio" name="ex-f" checked={formato === "CSV"} onChange={() => setFormato("CSV")} />
            <span>Só a planilha (.csv)<small>Uma tabela só, para abrir em qualquer programa</small></span>
          </label>
        </fieldset>
        {ct ? (
          <label className="opcao">
            <input className="marcar" type="checkbox" checked={mandar} onChange={(e) => setMandar(e.target.checked)} disabled={!!naoSaiu} />
            <span>Mandar por e-mail a {ct.nome}{ct.firma ? `, da ${ct.firma}` : ""}<small>{ct.email} · a planilha vai anexada{formato === "XLSX" && an?.anexos.length ? "; os comprovantes vão num link do .zip, que vale por 30 dias" : ""}.</small></span>
          </label>
        ) : (
          <>
            <p className="ct-sem"><Icone nome="envelope" className="ico" /><span><b>Sem contador cadastrado:</b> o arquivo só baixa no seu aparelho. Cadastre o contador para mandar por e-mail.</span></p>
            {c.dono ? <a className="btn btn-sec" href={ROTA_AJUSTES} style={{ justifySelf: "start" }}><Icone nome="mais" className="ico" />Cadastrar o contador</a> : null}
          </>
        )}
        <p className="fi-ref"><Icone nome="historico" className="ico" /><span>A exportação{ct ? " e o envio ficam" : " fica"} no histórico do escritório, com quem gerou{ct ? ", para quem foi" : ""} e quando.</span></p>
      </div>
    </Janela>
  );
}
