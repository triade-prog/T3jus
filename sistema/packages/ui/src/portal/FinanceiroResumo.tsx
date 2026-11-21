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
  type AnexosDaExportacao, type CaixaFinanceiro, type DadosExportacao, type FormatoExportacao, type MesCaixa, type ParcelaLinha, type PreviaExportacao,
  type RepassePendente, type ResumoFinanceiro, type TerceirosNaConta,
} from "@t3jus/domain";
import { textoDoErro } from "../api.ts";
import { Icone, type NomeIcone } from "../Icone.tsx";
import { iniciais } from "../console/tempo.ts";
import { Aviso, Carregando, ErroAoCarregar, Estado, Janela } from "../console/pecas.tsx";
import { rotaArea } from "./areas.ts";
import { contar, diaCurto, diaLongo, nomeDoMes, somarDias } from "./agenda.ts";
import { Selo, useCarga } from "./Comercial.tsx";
import { Toast } from "./FichaCliente.tsx";
import { mesReferencia, quandoAcao, ROTAS_FINANCEIRO, seloParcela } from "./financeiro.ts";
import { chamarPortal } from "./Moldura.tsx";
import { MolduraArea } from "./MolduraArea.tsx";
import { FolhaACaminho } from "./ACaminho.tsx";
import { arquivoContador, nomeMesAno } from "./planilha.ts";

type Feito = { titulo: string; texto: string };
const fuso = { timeZone: "America/Sao_Paulo" } as const;
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

function FolhaPrevisto({ r, mes }: { r: ResumoFinanceiro; mes: string }) {
  const e = r.escritorio;
  const previsto = e.recebido + e.vencidoMes + e.seteDias + e.restoMes;
  const fim = diaCurto(somarDias(proximoMes(r.mes), -1));
  const segs = [
    { v: e.recebido, cor: "var(--vinho)", t: "Recebido" },
    { v: e.vencidoMes, cor: "var(--vinho-3)", t: "Vencido" },
    { v: e.seteDias, cor: "var(--ambar)", t: "Próximos 7 dias" },
    { v: e.restoMes, cor: "var(--ambar-3)", t: `Até ${fim}`, contorno: true },
  ];
  const max = Math.max(...r.meses.flatMap((m) => [m.previsto, m.realizado]), 1);
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
      <p className="fi-sub3">Comparado com os meses anteriores</p>
      <div className="fi-barras" role="group" aria-label={`Realizado contra previsto, de ${nomeDoMes(r.meses[0]!.mes)} a ${mes}`}>
        {r.meses.map((m) => (
          <div className="fi-barra" key={m.mes}>
            <span className="rot">{maiuscula(nomeDoMes(m.mes))}{m.mes === r.mes ? <small>até hoje</small> : null}</span>
            <span className="fi-duplo" aria-hidden="true">
              <span className="fi-trilho"><i className="prev" style={{ width: largura(m.previsto, max) }} /></span>
              <span className="fi-trilho"><i className="real" style={{ width: largura(m.realizado, max) }} /></span>
            </span>
            <span className="val"><b className="num">{reais(m.realizado)}</b><small>de {reais(m.previsto)}{m.previsto ? ` · ${pct(m.realizado, m.previsto)}%` : ""}</small></span>
          </div>
        ))}
      </div>
      <p className="legenda fi-leg">
        <span><i style={{ background: "var(--ambar-3)", boxShadow: "inset 0 0 0 1px var(--vinho-4)" }} />Previsto (barra de cima)</span>
        <span><i style={{ background: "var(--vinho)" }} />Realizado (barra de baixo)</span>
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
          <FolhaVencido r={dados} />
          <FolhaPrevisto r={dados} mes={mes} />
        </div>
        <div className="fi-col">
          <FolhaProximas r={dados} />
          <FolhaRepasses r={dados} />
          <FolhaNumeros r={dados} mes={mes} />
        </div>
      </div>
    </div>
  );
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
  return (
    <Folha id="t-exp" titulo="Para o contador" icone="doc" sub="Recebimentos, despesas e recibos do mês, com terceiros à parte">
      <dl className="fi-dl">
        {ultima ? (
          <div>
            <dt>{maiuscula(nomeMesAno(ultima.mes))}</dt>
            <dd>Exportado em {diaCurto(diaDoInstante(ultima.em))}<br /><span className="fi-pq">por {ultima.por?.nome ?? "alguém da equipe"}</span></dd>
          </div>
        ) : null}
        {anterior && !anteriorFeita ? (
          <div><dt>{maiuscula(nomeMesAno(anterior))}</dt><dd>Pronto para exportar</dd></div>
        ) : null}
        <div><dt>{maiuscula(nomeMesAno(c.mes))}</dt><dd>Pronto a partir de {diaCurto(proximoMes(c.mes))}</dd></div>
      </dl>
      <div className="fi-cob">
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

  async function enviar() {
    setFalha(null);
    setEnviando(true);
    const r = await chamarPortal<DadosExportacao>("/v1/escritorio/financeiro/exportacoes", { metodo: "POST", corpo: { mes, formato } });
    setEnviando(false);
    if (!r.ok) return setFalha(textoDoErro(r.erro));
    const a = arquivoContador(r.dados, formato, an?.semNota);
    salvar(a.nome, a.tipo, a.dados);
    aoFeito({ titulo: `Exportação de ${nome} gerada.`, texto: `O arquivo ${a.nome} foi salvo, e a exportação ficou no histórico do escritório.` });
  }

  const an = anexos && anexos.mes === mes ? anexos.a : null;
  const rec = p && p !== "erro" ? { n: p.recebimentos.n + p.honorariosTransferidos.n, valor: p.recebimentos.valor + p.honorariosTransferidos.valor } : null;
  return (
    <Janela id="j-exp" aberta aoFechar={aoFechar} sobretitulo="Caixa" titulo="Exportar para o contador" descricao="j-exp-d" aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-sec" type="button" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-pri" type="submit" disabled={enviando} aria-busy={enviando || undefined} data-foco="">
            <Icone nome="baixar" className="ico" />Exportar {nomeDoMes(mes)}
          </button>
        </>
      }>
      <div style={{ display: "grid", gap: 18 }}>
        <p id="j-exp-d">Tudo o que o contador pede do mês, num arquivo só.</p>
        {falha ? <Aviso tom="urgencia" titulo="O arquivo não foi gerado.">{falha}</Aviso> : null}
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
              <li>
                <Icone nome="escudo" className="ico" />
                <span>
                  Valores de terceiros numa aba à parte
                  <small>{p.terceiros.entrou || p.terceiros.repassado
                    ? `${reais(p.terceiros.entrou)} entraram e ${reais(p.terceiros.repassado)} foram repassados. Não são receita do escritório.`
                    : "Nenhum valor de terceiros entrou ou foi repassado no mês."}</small>
                </span>
              </li>
              {an ? (
                <li>
                  <Icone nome="doc" className="ico" />
                  <span>
                    {an.anexos.length ? `${contar(an.anexos.length, "comprovante, nota ou guia anexado", "comprovantes, notas e guias anexados")} aos lançamentos` : "Nenhum comprovante, nota ou guia anexado no mês"}
                    <small>Ficam guardados em cada lançamento. A pasta com os arquivos (.zip) chega numa próxima entrega.</small>
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
            <span>Planilha (.xlsx)<small>O mais pedido pelos contadores, com uma aba para cada parte</small></span>
          </label>
          <label className="opcao">
            <input className="marcar" type="radio" name="ex-f" checked={formato === "CSV"} onChange={() => setFormato("CSV")} />
            <span>Só a planilha (.csv)<small>Uma tabela só, para abrir em qualquer programa</small></span>
          </label>
        </fieldset>
        <p className="fi-ref"><Icone nome="historico" className="ico" /><span>A exportação fica no histórico do escritório, com quem gerou e quando.</span></p>
      </div>
    </Janela>
  );
}
