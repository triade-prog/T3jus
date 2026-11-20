"use client";
// Financeiro do Portal, Relatórios do sócio (F3.70; IN-02 a IN-05, IN-07, IN-08, IN-09, IN-12,
// IN-14, IN-15; FI-06, FI-07), desenho aprovado em docs/design/aprovadas/portal-relatorios
// (Carol, 20/11/2026). Só a sócia dona vê; Entrou pelo dia em que o dinheiro entrou; Rendeu é o
// que entrou menos as despesas de caso adiantadas que não voltaram; abre nos últimos 3 meses,
// contra os 3 anteriores. Terceiros só na folha âmbar, nunca somados. Os números vêm prontos do
// servidor; aqui só se escreve, se ordena e se monta a planilha.

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  reais, TIPOS_LEVANTAMENTO,
  type AreaRelatorio, type ClienteRelatorio, type CompararCom, type DadosRelatorioExportado, type FormatoRelatorio, type PeriodoRelatorio,
  type RelatorioAreas, type RelatorioCliente, type RelatorioClientes, type RelatorioResponsaveis, type ResumoRelatorio, type VisaoRelatorio,
} from "@t3jus/domain";
import { textoDoErro, type ErroApi } from "../api.ts";
import { Icone, type NomeIcone } from "../Icone.tsx";
import { iniciais } from "../console/tempo.ts";
import { Aviso, descritoPor, ErroCampo, Estado, faltaAcertar, Janela } from "../console/pecas.tsx";
import { contar, diaCurto } from "./agenda.ts";
import { Selo } from "./Comercial.tsx";
import { ROTAS_FINANCEIRO } from "./financeiro.ts";
import { Cab, Folha, salvar } from "./FinanceiroResumo.tsx";
import { chamarPortal, type EscritorioPortal } from "./Moldura.tsx";
import { MolduraArea } from "./MolduraArea.tsx";
import { planilhaXlsx } from "./planilha.ts";
import {
  abasRelatorio, atalho, atalhoAtual, comparacao, comparaTexto, conferirPeriodo, consultaPeriodo, diaBr, filtrarClientes, fimDoMes, nomeArea,
  nomeArquivoRelatorio, nomeDoMesLongo, ORDENS_CLIENTES, periodoCurto, periodoTexto, reaisComSinal, ROTAS_RELATORIOS, rotuloComparacao,
  totaisClientes, type OrdemClientes,
} from "./relatorios.ts";

const ROTA_CONTRATOS = "/contratos";
const ROTA_JURIDICO = "/juridico";
const rotaCaso = (id: string) => `/juridico/casos/${id}`;
const rotaFichaCliente = (id: string) => `/clientes/${id}`;
const pct = (parte: number, todo: number) => (todo > 0 ? Math.round((parte / todo) * 100) : 0);
const largura = (v: number, max: number) => `${max > 0 ? Math.max(0, Math.min(100, (v / max) * 100)).toFixed(1) : 0}%`;
const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const FAIXAS = ["Até 30 dias", "31 a 60 dias", "61 a 90 dias", "Mais de 90"];

// ------------------------------------------------------------------------- período no endereço

type Pedido = { de?: string; ate?: string; comparar: CompararCom };

function lerPedido(): Pedido {
  const q = new URLSearchParams(window.location.search);
  const c = q.get("comparar");
  const de = q.get("de") ?? undefined;
  const ate = q.get("ate") ?? undefined;
  return { de, ate, comparar: c === "ano_passado" || c === "nao" ? c : "anterior" };
}

function consultaApi(p: Pedido): string {
  const q = new URLSearchParams();
  if (p.de) q.set("de", p.de);
  if (p.ate) q.set("ate", p.ate);
  if (p.comparar !== "anterior") q.set("comparar", p.comparar);
  const s = q.toString();
  return s ? `?${s}` : "";
}

type Carga<T> = { estado: "carregando" } | { estado: "erro"; erro: ErroApi } | { estado: "ok"; dados: T };

function useRelatorio<T>(caminho: string | null): { carga: Carga<T>; recarregar: () => void } {
  const [res, setRes] = useState<{ chave: string; carga: Carga<T> } | null>(null);
  const [vez, setVez] = useState(0);
  const chave = `${caminho}#${vez}`;
  useEffect(() => {
    if (!caminho) return;
    let vivo = true;
    void chamarPortal<T>(caminho).then((r) => {
      if (vivo) setRes({ chave, carga: r.ok ? { estado: "ok", dados: r.dados } : { estado: "erro", erro: r.erro } });
    });
    return () => {
      vivo = false;
    };
  }, [caminho, chave]);
  return { carga: res && res.chave === chave ? res.carga : { estado: "carregando" }, recarregar: () => setVez((v) => v + 1) };
}

// ------------------------------------------------------------------------- peças do alto

const VISTAS: { v: Exclude<VisaoRelatorio, "cliente">; nome: string; icone: NomeIcone; href: string }[] = [
  { v: "visao", nome: "Visão geral", icone: "funcoes", href: ROTAS_RELATORIOS.visao },
  { v: "clientes", nome: "Por cliente", icone: "pessoas", href: ROTAS_RELATORIOS.clientes },
  { v: "areas", nome: "Por área", icone: "balanca", href: ROTAS_RELATORIOS.areas },
  { v: "responsaveis", nome: "Por responsável", icone: "cracha", href: ROTAS_RELATORIOS.responsaveis },
];

function BarraPeriodo({ periodo, desligada, aoAtalho, aoEscolher }: {
  periodo: PeriodoRelatorio | null; desligada?: boolean; aoAtalho: (a: "mes" | "tres" | "ano") => void; aoEscolher: () => void;
}) {
  const atual = periodo ? atalhoAtual(periodo, periodo.hoje) : null;
  const botao = (a: "mes" | "tres" | "ano", t: string) => (
    <button type="button" aria-pressed={atual === a} disabled={desligada || !periodo} onClick={() => aoAtalho(a)}>{t}</button>
  );
  return (
    <section className="re-barra" aria-label="Período do relatório">
      <div className="chips" role="group" aria-label="Período">
        {botao("mes", "Este mês")}
        {botao("tres", "Últimos 3 meses")}
        {botao("ano", "Este ano")}
        <button type="button" aria-pressed={!!periodo && atual === null} aria-haspopup="dialog" disabled={desligada || !periodo} onClick={aoEscolher}>
          <Icone nome="agenda" className="ico ico-s" />Escolher datas
        </button>
      </div>
      <p className="re-per">
        {periodo ? (
          <>
            <b>{periodoTexto(periodo.de, periodo.ate)}</b>
            <span>{periodo.cde && periodo.cate ? `comparado com ${periodoTexto(periodo.cde, periodo.cate)}` : "sem comparação"}</span>
          </>
        ) : <span>Carregando o período…</span>}
      </p>
    </section>
  );
}

function Vistas({ atual, q }: { atual: VisaoRelatorio; q: string }) {
  return (
    <nav className="re-vistas" aria-label="Ver o relatório">
      {VISTAS.map((x) => (
        <a key={x.v} href={`${x.href}${q}`} aria-current={x.v === atual ? "page" : undefined}>
          <Icone nome={x.icone} className="ico" />{x.nome}
        </a>
      ))}
    </nav>
  );
}

function Como({ aberto, periodo }: { aberto: boolean; periodo: PeriodoRelatorio | null }) {
  const cmp = periodo && periodo.cde && periodo.cate
    ? `${periodo.comparar === "ano_passado" ? "Com o mesmo período do ano passado" : "Com o período anterior do mesmo tamanho"}. Neste caso, ${periodoTexto(periodo.cde, periodo.cate)}.`
    : "Sem comparação neste relatório.";
  return (
    <details className="re-como" open={aberto}>
      <summary>
        <Icone nome="ajuda" className="ico" />Como contamos<small>O que entra em cada número, em poucas linhas</small><Icone nome="baixo" className="ico re-seta" />
      </summary>
      <dl>
        <div><dt>Entrou</dt><dd>Honorários que entraram no caixa do escritório no período, <b>pelo dia em que o dinheiro entrou</b>. A parcela de um mês paga no mês seguinte conta no mês em que foi paga. Nunca inclui dinheiro de terceiros.</dd></div>
        <div><dt>Falta receber</dt><dd>Parcelas em aberto hoje: as <b>vencidas</b>, por idade, e as <b>a vencer até o fim de cada contrato</b>. Mensalidade sem data de fim conta só até este mês. A parte do escritório em RPV e precatório fica <b>à parte</b>.</dd></div>
        <div><dt>Rendeu</dt><dd>O que entrou <b>menos as despesas de caso que o escritório adiantou</b> (custas, perícia) e que ainda não voltaram. Não desconta aluguel, salários nem outras despesas fixas: essa conta é a DRE, que depende do contador.</dd></div>
        <div><dt>Contratado</dt><dd>Parcelas e mensalidades que venceram ou vencem no período, pelos contratos. O êxito entra quando acontece.</dd></div>
        <div><dt>Comparação</dt><dd>{cmp}{periodo?.aberto ? " O mês de hoje ainda está aberto, e isso aparece escrito." : ""}</dd></div>
        <div className="re-terc"><dt><Icone nome="escudo" className="ico" />De terceiros</dt><dd>Alvarás, RPVs e acordos do cliente só aparecem na folha com a faixa âmbar. Passam pelo escritório e são repassados: <b>nunca somam</b> com os números do escritório.</dd></div>
      </dl>
    </details>
  );
}

// ------------------------------------------------------------------------- a página e o período

function useNavegacao() {
  const [pedido, setPedido] = useState<Pedido | null>(null);
  useEffect(() => {
    void Promise.resolve().then(() => setPedido(lerPedido()));
  }, []);
  function mudar(p: Pedido, hoje: string) {
    const q = consultaPeriodo({ de: p.de ?? atalho("tres", hoje).de, ate: p.ate ?? hoje, comparar: p.comparar }, hoje);
    window.history.replaceState(null, "", `${window.location.pathname}${q}`);
    setPedido(lerPedido());
  }
  return { pedido, mudar };
}

function Pagina({ visao, cliente, children }: {
  visao: VisaoRelatorio;
  cliente?: string;
  children: (x: { pedido: Pedido; q: string; definirPeriodo: (p: PeriodoRelatorio) => void; topo: ReactNode; exportar: ReactNode }) => ReactNode;
}) {
  const { pedido, mudar } = useNavegacao();
  const [periodo, setPeriodo] = useState<PeriodoRelatorio | null>(null);
  const [janela, setJanela] = useState<"periodo" | "exportar" | null>(null);
  const [feito, setFeito] = useState<string | null>(null);
  if (!pedido) return null;
  const q = consultaApi(pedido);
  const definirPeriodo = (p: PeriodoRelatorio) => {
    if (!periodo || p.de !== periodo.de || p.ate !== periodo.ate || p.comparar !== periodo.comparar || p.hoje !== periodo.hoje) setPeriodo(p);
  };
  const aoAtalho = (a: "mes" | "tres" | "ano") => {
    if (!periodo) return;
    const x = atalho(a, periodo.hoje);
    mudar({ ...x, comparar: pedido.comparar }, periodo.hoje);
  };
  const barra = (
    <BarraPeriodo periodo={periodo} aoAtalho={aoAtalho} aoEscolher={() => setJanela("periodo")} />
  );
  const exportar = (
    <button className="btn btn-sec" type="button" disabled={!periodo} aria-haspopup="dialog" onClick={() => setJanela("exportar")}>
      <Icone nome="baixar" className="ico" />Exportar
    </button>
  );
  const topo = visao === "cliente" ? barra : (
    <>
      <Cab titulo="Relatórios" lede="Um período inteiro, comparado com o anterior: quanto entrou, quanto falta receber e quanto rendeu, por cliente, por área e por responsável." botao={exportar} />
      {barra}
      <div className="re-topo"><Vistas atual={visao} q={q} /></div>
      <Como aberto={visao === "visao"} periodo={periodo} />
    </>
  );
  return (
    <div className="fi re">
      {feito ? <Aviso tom="sucesso" titulo="Relatório exportado.">{feito}</Aviso> : null}
      {children({ pedido, q, definirPeriodo, topo, exportar })}
      {janela === "periodo" && periodo ? (
        <JanelaPeriodo periodo={periodo} aoFechar={() => setJanela(null)}
          aoEscolher={(p) => { setJanela(null); mudar(p, periodo.hoje); }} />
      ) : null}
      {janela === "exportar" && periodo ? (
        <JanelaExportar periodo={periodo} visao={visao} cliente={cliente} aoFechar={() => setJanela(null)}
          aoFeito={(t) => { setJanela(null); setFeito(t); }} />
      ) : null}
    </div>
  );
}

/** Erro ao carregar: o caminho alternativo é A receber. */
function ErroRelatorio({ erro, aoTentar }: { erro: ErroApi; aoTentar: () => void }) {
  const motivo = erro.detalhes?.motivo;
  if (motivo === "PERIODO_INVALIDO" || motivo === "PERIODO_LONGO") {
    return (
      <Estado icone="agenda" titulo="Este período não dá para mostrar" nivel={2} moldura
        acoes={<a className="btn btn-pri" href={window.location.pathname}><Icone nome="reenviar" className="ico" />Voltar aos últimos 3 meses</a>}>
        {textoDoErro(erro)} O relatório mostra até 2 anos por vez, e a data final pode ser hoje ou antes.
      </Estado>
    );
  }
  return (
    <section className="folha">
      <Estado icone="alerta" erro titulo="Não deu para montar o relatório" nivel={2}
        acoes={
          <>
            <button className="btn btn-pri" type="button" onClick={aoTentar}><Icone nome="reenviar" className="ico" />Tentar de novo</button>
            <a className="btn btn-sec" href={ROTAS_FINANCEIRO.receber}><Icone nome="moeda" className="ico" />Abrir A receber</a>
          </>
        }>
        {`O servidor não respondeu. Nenhum dado se perdeu: os recebimentos estão todos em A receber e no Caixa. Tente de novo em alguns segundos. Código para o suporte: ${erro.codigo}.`}
      </Estado>
    </section>
  );
}

function EsqueletoLinhas({ n }: { n: number }) {
  return (
    <div className="re-esq-folha" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <div className="re-esq-linha" key={i}>
          <span className="esqueleto esq-linha" style={{ height: 12, width: "80%" }} />
          <span className="esqueleto esq-linha" style={{ height: 14, width: `${90 - i * 12}%` }} />
          <span className="esqueleto esq-linha" style={{ height: 12, width: "100%" }} />
        </div>
      ))}
    </div>
  );
}

function FolhaCarregando({ id, titulo, icone, n }: { id: string; titulo: string; icone: NomeIcone; n: number }) {
  return (
    <section className="folha" aria-labelledby={id}>
      <div className="folha-cab"><div><h2 id={id}><Icone nome={icone} className="ico" />{titulo}</h2><p className="sub">Carregando…</p></div></div>
      <EsqueletoLinhas n={n} />
    </section>
  );
}

function Carregando({ pedido, visao }: { pedido: Pedido; visao: VisaoRelatorio }) {
  const quando = pedido.de && pedido.ate ? `de ${periodoTexto(pedido.de, pedido.ate)}` : "dos últimos 3 meses";
  return (
    <div aria-busy="true" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <p className="sr" role="status">Montando o relatório {quando}…</p>
      {visao === "visao" ? (
        <>
          <div className="re-esq-tres" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i}>
                <span className="esqueleto esq-linha" style={{ width: "50%", height: 11 }} />
                <span className="esqueleto" style={{ width: "75%", height: 38 }} />
                <span className="esqueleto esq-linha" style={{ width: "85%", height: 11 }} />
              </div>
            ))}
          </div>
          <div className="fi-grade">
            <div className="fi-col">
              <FolhaCarregando id="t-c1" titulo="Entrou mês a mês" icone="moeda" n={6} />
              <FolhaCarregando id="t-c2" titulo="Maiores clientes" icone="pessoas" n={5} />
            </div>
            <div className="fi-col">
              <FolhaCarregando id="t-c3" titulo="Falta receber" icone="alerta" n={4} />
              <FolhaCarregando id="t-c4" titulo="Rendeu" icone="funcoes" n={3} />
            </div>
          </div>
        </>
      ) : (
        <FolhaCarregando id="t-c1" titulo={VISTAS.find((x) => x.v === visao)?.nome ?? "Relatório"} icone="funcoes" n={6} />
      )}
    </div>
  );
}

/** Mostra o estado da carga e, quando chega, o conteúdo. */
function Carregado<T extends { periodo: PeriodoRelatorio }>({ carga, recarregar, pedido, visao, definirPeriodo, children }: {
  carga: Carga<T>; recarregar: () => void; pedido: Pedido; visao: VisaoRelatorio; definirPeriodo: (p: PeriodoRelatorio) => void;
  children: (d: T) => ReactNode;
}) {
  const p = carga.estado === "ok" ? carga.dados.periodo : null;
  useEffect(() => {
    if (p) definirPeriodo(p);
  });
  if (carga.estado === "carregando") return <Carregando pedido={pedido} visao={visao} />;
  if (carga.estado === "erro") return <ErroRelatorio erro={carga.erro} aoTentar={recarregar} />;
  return <>{children(carga.dados)}</>;
}

// ------------------------------------------------------------------------- os três números

function Tres({ r }: { r: ResumoRelatorio }) {
  const p = r.periodo;
  const ant = rotuloComparacao(p);
  const curto = periodoCurto(p.de, p.ate);
  const cmp = (atual: number, anterior: number | null) =>
    ant && anterior !== null ? `${comparaTexto(atual, anterior, ant)} (${reais(anterior)})` : null;
  const mes = maiuscula(nomeDoMesLongo(p.hoje));
  const fim = fimDoMes(p.hoje);
  return (
    <div className="re-tres campo-vinho">
      <Icone nome="coluna" className="ico estatua" />
      <section className="re-n" aria-labelledby="n-entrou">
        <p className="sobretitulo" id="n-entrou">Entrou · {curto}</p>
        <p><span className="fi-big num">{reais(r.entrou.valor)}</span></p>
        {cmp(r.entrou.valor, r.entrou.anterior) ? <p className="re-cmp"><Icone nome="historico" className="ico" /><span>{cmp(r.entrou.valor, r.entrou.anterior)}</span></p> : null}
        {p.aberto && r.entrou.previstoMes > 0 ? (
          <p>
            {mes} ainda está aberto. Se entrar o previsto até {diaCurto(fim)} (<b>{reais(r.entrou.previstoMes)}</b>), o período fecha{" "}
            <b>{ant && r.entrou.anterior !== null ? comparaTexto(r.entrou.valor + r.entrou.previstoMes, r.entrou.anterior, ant) : reais(r.entrou.valor + r.entrou.previstoMes)}</b>.
          </p>
        ) : p.aberto ? <p>{mes} ainda está aberto.</p> : null}
      </section>
      <section className="re-n" aria-labelledby="n-falta">
        <p className="sobretitulo" id="n-falta">Falta receber · hoje</p>
        <p><span className="fi-big num">{reais(r.falta.valor)}</span></p>
        {r.falta.vencido ? <Selo tom="urgente" icone="alerta">{reais(r.falta.vencido)} vencidos</Selo> : <Selo tom="ok" icone="check">Nada vencido</Selo>}
        {p.cate && r.falta.anterior !== null ? (
          <p className="re-cmp">
            <Icone nome="historico" className="ico" />
            <span>{comparaTexto(r.falta.valor, r.falta.anterior, `em ${diaCurto(p.cate)}`)} ({reais(r.falta.anterior)}). Vencido era {reais(r.falta.vencidoAnterior ?? 0)}.</span>
          </p>
        ) : null}
        {r.falta.aparte.valor ? (
          <p className="re-aparte">Mais <b>{reais(r.falta.aparte.valor)}</b> de RPV e precatório, à parte: só a parte do escritório, ainda a transferir.</p>
        ) : null}
      </section>
      <section className="re-n" aria-labelledby="n-rendeu">
        <p className="sobretitulo" id="n-rendeu">Rendeu · {curto}</p>
        <p><span className="fi-big num">{reaisComSinal(r.rendeu.valor)}</span></p>
        {cmp(r.rendeu.valor, r.rendeu.anterior) ? <p className="re-cmp"><Icone nome="historico" className="ico" /><span>{cmp(r.rendeu.valor, r.rendeu.anterior)}</span></p> : null}
        <p>
          {r.rendeu.adiantado
            ? <>Entrou menos <b>{reais(r.rendeu.adiantado)}</b> de despesas de caso que o escritório adiantou e ainda não voltaram. Sem aluguel e salários.</>
            : <>Nenhuma despesa de caso adiantada ficou sem voltar. Sem aluguel e salários.</>}
        </p>
      </section>
    </div>
  );
}

// ------------------------------------------------------------------------- folhas da visão geral

function FolhaMeses({ r }: { r: ResumoRelatorio }) {
  const p = r.periodo;
  const atuais = r.meses.filter((m) => !m.anterior);
  const anteriores = r.meses.filter((m) => m.anterior);
  const previsto = p.aberto ? r.entrou.previstoMes : 0;
  const max = Math.max(1, ...r.meses.map((m) => m.valor + (m.parcial ? previsto : 0)));
  const nome = (m: string) => maiuscula(nomeDoMesLongo(m)) + (m.slice(0, 4) !== p.ate.slice(0, 4) ? ` de ${m.slice(0, 4)}` : "");
  const fim = diaCurto(fimDoMes(p.hoje));
  return (
    <Folha id="t-meses" titulo="Entrou mês a mês" icone="moeda" sub="Honorários pelo dia em que o dinheiro entrou. Valores de terceiros ficam fora."
      ver={{ texto: "Caixa", href: ROTAS_FINANCEIRO.caixa }}>
      <div className="fi-barras" role="group" aria-label="Entrou por mês, neste período e no anterior">
        <p className="re-grupo-rot">Este período<span>{periodoTexto(p.de, p.ate)}</span></p>
        {atuais.map((m) => {
          const aberto = m.parcial && p.aberto;
          return (
            <div className="fi-barra" key={m.mes}>
              <span className="rot">{nome(m.mes)}{m.parcial ? <small>até {aberto ? "hoje" : diaCurto(p.ate)}</small> : null}</span>
              <span className="fi-trilho" aria-hidden="true">
                <i className="real" style={{ width: largura(m.valor, max) }} />
                {aberto && previsto ? <i className="re-falta" style={{ left: largura(m.valor, max), width: largura(previsto, max) }} /> : null}
              </span>
              <span className="val"><b className="num">{reais(m.valor)}</b>{aberto && previsto ? <small>até hoje · mais {reais(previsto)} previstos</small> : null}</span>
            </div>
          );
        })}
        {anteriores.length && p.cde && p.cate ? (
          <>
            <p className="re-grupo-rot">Período anterior<span>{periodoTexto(p.cde, p.cate)}</span></p>
            {anteriores.map((m) => (
              <div className="fi-barra" key={`a${m.mes}`}>
                <span className="rot">{nome(m.mes)}</span>
                <span className="fi-trilho" aria-hidden="true"><i className="tipo4" style={{ width: largura(m.valor, max) }} /></span>
                <span className="val"><b className="num">{reais(m.valor)}</b></span>
              </div>
            ))}
          </>
        ) : null}
      </div>
      <p className="legenda fi-leg">
        <span><i style={{ background: "var(--vinho)" }} />Entrou neste período</span>
        {p.aberto && previsto ? <span><i style={{ background: "var(--ambar-3)", boxShadow: "inset 0 0 0 1px var(--vinho-4)" }} />Previsto até {fim}</span> : null}
        {anteriores.length ? <span><i style={{ background: "var(--vinho-4)" }} />Entrou no período anterior</span> : null}
      </p>
      <div className="fi-barras" style={{ paddingTop: 0 }}>
        <p className="re-soma"><span>Este período{p.aberto ? ", até hoje" : ""}</span><b className="num">{reais(r.entrou.valor)}</b></p>
        {r.entrou.anterior !== null ? (
          <p className="re-soma" style={{ borderTop: 0, paddingTop: 0 }}><span>Período anterior</span><b className="num" style={{ color: "var(--texto-2)" }}>{reais(r.entrou.anterior)}</b></p>
        ) : null}
      </div>
    </Folha>
  );
}

function FolhaTopClientes({ r, q }: { r: ResumoRelatorio; q: string }) {
  const top = r.clientes.top;
  const max = Math.max(1, ...top.map((c) => c.entrou));
  const soma = top.reduce((s, c) => s + c.entrou, 0);
  return (
    <Folha id="t-topcli" titulo="Maiores clientes" icone="pessoas"
      sub={`Por quanto entrou no período. São ${contar(r.clientes.n, "cliente", "clientes")} com contrato no período.`}
      ver={{ texto: "Todos por cliente", href: `${ROTAS_RELATORIOS.clientes}${q}` }}>
      {top.length ? (
        <>
          <div className="fi-barras re-barras-nome" role="group" aria-label={`Os ${top.length} clientes que mais trouxeram no período`}>
            {top.map((c) => (
              <div className="fi-barra" key={c.id}>
                <span className="rot"><a href={`${ROTAS_RELATORIOS.cliente(c.id)}${q}`}>{c.nome}</a><small>{contar(c.contratos, "contrato", "contratos")}{c.inativo ? " · inativo" : ""}</small></span>
                <span className="fi-trilho" aria-hidden="true"><i className="real" style={{ width: largura(c.entrou, max) }} /></span>
                <span className="val"><b className="num">{reais(c.entrou)}</b><small>{pct(c.entrou, r.entrou.valor)}% do período</small></span>
              </div>
            ))}
          </div>
          {top.length >= 2 ? (
            <p className="re-leitura"><Icone nome="ajuda" className="ico" /><span>Os {top.length} maiores trouxeram <b>{pct(soma, r.entrou.valor)}%</b> do que entrou no período.</span></p>
          ) : null}
        </>
      ) : <p className="re-leitura"><Icone nome="ajuda" className="ico" /><span>Nada entrou de clientes neste período.</span></p>}
    </Folha>
  );
}

function FolhaTopAreas({ r, q }: { r: ResumoRelatorio; q: string }) {
  const max = Math.max(1, ...r.areas.map((a) => a.entrou));
  return (
    <Folha id="t-toparea" titulo="Por área do direito" icone="balanca" sub="A área é a do caso ligado ao contrato."
      ver={{ texto: "Detalhe por área", href: `${ROTAS_RELATORIOS.areas}${q}` }}>
      {r.areas.length ? (
        <div className="fi-barras re-barras-nome" role="group" aria-label="Entrou por área do direito">
          {r.areas.map((a) => (
            <div className="fi-barra" key={a.area}>
              <span className="rot"><a href={`${ROTAS_RELATORIOS.areas}${q}`}>{nomeArea(a.area)}</a>
                <small>{a.area === "SEM_CASO" ? contar(a.contratos, "contrato", "contratos") : contar(a.casos, "caso", "casos")}</small></span>
              <span className="fi-trilho" aria-hidden="true"><i className="real" style={{ width: largura(a.entrou, max) }} /></span>
              <span className="val"><b className="num">{reais(a.entrou)}</b><small>{pct(a.entrou, r.entrou.valor)}%</small></span>
            </div>
          ))}
        </div>
      ) : null}
      {r.areas.some((a) => a.area === "SEM_CASO") ? (
        <p className="re-leitura"><Icone nome="ajuda" className="ico" /><span>&quot;Sem caso ligado&quot; são as assessorias mensais, as consultorias e as consultas: contratos que não têm um processo por trás.</span></p>
      ) : null}
    </Folha>
  );
}

function ListaAparte({ itens, total }: { itens: { id: string; tipo: keyof typeof TIPOS_LEVANTAMENTO; valor: number; prazo: string; cliente: string; caso: string }[]; total: number }) {
  if (!itens.length) return null;
  return (
    <div className="re-aparte-f">
      <p><Icone nome="balanca" className="ico" />À parte · não soma acima</p>
      <ul>
        {itens.map((a) => (
          <li key={a.id}>
            <span><b>{a.cliente} · {TIPOS_LEVANTAMENTO[a.tipo]}</b><small>{a.caso} · transferir até {diaCurto(a.prazo)}</small></span>
            <span className="fi-v num">{reais(a.valor)}</span>
          </li>
        ))}
      </ul>
      <p className="re-pe"><span>Parte do escritório em RPV e precatório</span><b className="num">{reais(total)}</b></p>
    </div>
  );
}

function FolhaFalta({ r }: { r: ResumoRelatorio }) {
  const f = r.falta;
  const max = Math.max(1, ...f.faixas.map((x) => x.valor));
  return (
    <Folha id="t-falta" titulo="Falta receber" icone="alerta" sub="Hoje, de todos os contratos. Para cobrar, vá a A receber." ver={{ texto: "A receber", href: ROTAS_FINANCEIRO.receber }}>
      <p className="re-sub"><span><b>Vencido</b> · {contar(f.vencidas, "parcela", "parcelas")}</span><span className="fi-v num" style={f.vencido ? { color: "var(--vinho-3)" } : undefined}>{reais(f.vencido)}</span></p>
      {f.vencido ? (
        <div className="fi-barras" role="group" aria-label="Vencido por idade do atraso">
          {f.faixas.map((x, i) => (
            <div className="fi-barra" key={FAIXAS[i]}>
              <span className="rot">{FAIXAS[i]}</span>
              <span className="fi-trilho" aria-hidden="true"><i className="urg" style={{ width: largura(x.valor, max) }} /></span>
              <span className="val"><b className="num">{reais(x.valor)}</b><small>{x.n ? contar(x.n, "parcela", "parcelas") : "nenhuma"}</small></span>
            </div>
          ))}
        </div>
      ) : null}
      <p className="re-sub" style={{ borderTop: "1px solid var(--divisor)" }}>
        <span><b>A vencer em {nomeDoMesLongo(r.periodo.hoje)}</b> · {contar(f.aVencerMes.n, "parcela", "parcelas")}</span><span className="fi-v num">{reais(f.aVencerMes.valor)}</span>
      </p>
      <p className="re-sub"><span><b>A vencer depois</b>, até o fim dos contratos</span><span className="fi-v num">{reais(f.aVencerDepois.valor)}</span></p>
      <p className="fi-total"><span>Parcelas em aberto</span><b className="num">{reais(f.valor)}</b></p>
      <ListaAparte itens={f.aparte.lista} total={f.aparte.valor} />
    </Folha>
  );
}

function FolhaRendeu({ r }: { r: ResumoRelatorio }) {
  const d = r.rendeu.despesas;
  const quais = d.slice(0, 3).map((x) => `${x.descricao} de ${x.cliente} (${reais(x.valor)})`).join(", ");
  return (
    <Folha id="t-rendeu" titulo="Rendeu" icone="funcoes" sub="O que ficou para o escritório no período, antes das despesas fixas." ver={{ texto: "A pagar", href: ROTAS_FINANCEIRO.pagar }}>
      <dl className="re-conta">
        <div><dt>Entrou</dt><dd className="num">{reais(r.entrou.valor)}</dd></div>
        <div>
          <dt>Despesas de caso adiantadas que não voltaram{d.length ? <small>{quais}{d.length > 3 ? ` e mais ${d.length - 3}` : ""}</small> : <small>Nenhuma no período</small>}</dt>
          <dd className="num">− {reais(r.rendeu.adiantado)}</dd>
        </div>
        <div className="re-igual"><dt>Rendeu</dt><dd className="num">{reaisComSinal(r.rendeu.valor)}</dd></div>
      </dl>
      <p className="re-fora"><Icone nome="cadeado" className="ico" /><span><b>Fora desta conta:</b> aluguel, salários, impostos e retiradas. O resultado depois das despesas fixas é a DRE, que ainda depende do contador.</span></p>
    </Folha>
  );
}

function FolhaTerceiros({ r }: { r: ResumoRelatorio }) {
  const t = r.terceiros;
  const tipos = (Object.keys(t.porTipo) as (keyof typeof TIPOS_LEVANTAMENTO)[]).map((k) => `${t.porTipo[k]} ${k === "RPV" ? "RPV" : TIPOS_LEVANTAMENTO[k].toLowerCase()}`).join(", ");
  return (
    <Folha id="t-terc" titulo="Passou pelo escritório" icone="enviar" terc sub={`Alvarás, RPVs e acordos dos clientes, de ${periodoTexto(r.periodo.de, r.periodo.ate)}`}
      ver={{ texto: "Repasses", href: ROTAS_FINANCEIRO.repasses }}>
      <dl className="re-fluxo">
        <div><dt>Entrou de terceiros<small>{t.n ? `${contar(t.n, "valor", "valores")}: ${tipos}` : "Nenhum valor no período"}</small></dt><dd className="num">{reais(t.entrou)}</dd></div>
        <div><dt>Repassado a clientes{t.clientesRepassados.length ? <small>{t.clientesRepassados.join(", ")}</small> : null}</dt><dd className="num">{reais(t.repassado)}</dd></div>
        <div><dt>Honorários que passaram ao escritório<small>Já contados em Entrou, no dia da transferência. Não somar de novo.</small></dt><dd className="num">{reais(t.honorarios)}</dd></div>
        {t.reembolso ? <div><dt>Reembolso de despesa ao escritório<small>O que o escritório tinha adiantado no caso</small></dt><dd className="num">{reais(t.reembolso)}</dd></div> : null}
        {t.outros ? <div><dt>Pago a parceiros, peritos e outros</dt><dd className="num">{reais(t.outros)}</dd></div> : null}
        <div className="re-saldo"><dt>Ainda na conta, a repassar ou transferir</dt><dd className="num">{reais(t.naConta)}</dd></div>
      </dl>
      <p className="pt-pe-folha"><Icone nome="escudo" className="ico" /><span>Não é do escritório e não soma com Entrou, Falta receber ou Rendeu. É o mesmo saldo de terceiros do Caixa.</span></p>
    </Folha>
  );
}

function Vazio() {
  const passos: { n: string; t: string; p: string; b: ReactNode }[] = [
    { n: "1", t: "Cadastre os contratos", p: "Cada contrato de honorários gera as parcelas. É delas que saem Contratado e Falta receber.",
      b: <a className="btn btn-pri" href={ROTA_CONTRATOS}><Icone nome="pena" className="ico" />Ir para Contratos</a> },
    { n: "2", t: "Ligue cada contrato a um caso", p: "É o caso que diz a área do direito. Assessoria e consulta podem ficar sem caso: aparecem como \"Sem caso ligado\".",
      b: <a className="btn btn-sec" href={ROTA_JURIDICO}><Icone nome="balanca" className="ico" />Abrir Jurídico</a> },
    { n: "3", t: "Registre os recebimentos", p: "O primeiro recebimento registrado em A receber já monta o Entrou, por cliente, área e responsável.",
      b: <a className="btn btn-sec" href={ROTAS_FINANCEIRO.receber}><Icone nome="moeda" className="ico" />Abrir A receber</a> },
  ];
  return (
    <section className="folha" aria-labelledby="t-vz">
      <h2 className="sr" id="t-vz">Primeiros passos</h2>
      <Estado icone="funcoes" titulo="Ainda não há o que comparar">Os relatórios aparecem com o primeiro recebimento registrado. Até lá, nada aqui fica com número inventado.</Estado>
      <ol className="fi-passos">
        {passos.map((x) => <li key={x.n}><span className="disco"><span>{x.n}</span></span><h3>{x.t}</h3><p>{x.p}</p>{x.b}</li>)}
      </ol>
    </section>
  );
}

function VisaoGeral() {
  return (
    <Pagina visao="visao">
      {({ pedido, q, definirPeriodo, topo }) => <VisaoConteudo pedido={pedido} q={q} definirPeriodo={definirPeriodo} topo={topo} />}
    </Pagina>
  );
}

function VisaoConteudo({ pedido, q, definirPeriodo, topo }: { pedido: Pedido; q: string; definirPeriodo: (p: PeriodoRelatorio) => void; topo: ReactNode }) {
  const { carga, recarregar } = useRelatorio<ResumoRelatorio>(`/v1/escritorio/financeiro/relatorios/resumo${q}`);
  return (
    <>
      {topo}
      <Carregado carga={carga} recarregar={recarregar} pedido={pedido} visao="visao" definirPeriodo={definirPeriodo}>
        {(r) => !r.algum ? <Vazio /> : (
          <>
            <Tres r={r} />
            <div className="fi-grade">
              <div className="fi-col">
                <FolhaMeses r={r} />
                <FolhaTopClientes r={r} q={q} />
                <FolhaTopAreas r={r} q={q} />
              </div>
              <aside className="fi-col" aria-label="Falta receber, rendeu e terceiros">
                <FolhaFalta r={r} />
                <FolhaRendeu r={r} />
                <FolhaTerceiros r={r} />
              </aside>
            </div>
          </>
        )}
      </Carregado>
    </>
  );
}

// ------------------------------------------------------------------------- por cliente

function FaltaCliente({ c }: { c: ClienteRelatorio }) {
  return (
    <>
      <b className="num" style={{ fontWeight: 500 }}>{reais(c.falta)}</b>
      {c.vencido ? <><br /><Selo tom="urgente" icone="alerta">{reais(c.vencido)} vencido</Selo></> : null}
      {c.aparte.map((a, i) => (
        <span className="re-aparte-txt" key={i}><Icone nome="balanca" className="ico" /><span>{TIPOS_LEVANTAMENTO[a.tipo]}: {reais(a.valor)}, à parte</span></span>
      ))}
    </>
  );
}

function Rendeu({ v }: { v: number }) {
  return v < 0
    ? <><b className="num" style={{ fontWeight: 600 }}>{reaisComSinal(v)}</b><small>adiantou mais do que entrou</small></>
    : <b className="num" style={{ fontWeight: 600 }}>{reais(v)}</b>;
}

function PorCliente() {
  return (
    <Pagina visao="clientes">
      {({ pedido, q, definirPeriodo, topo }) => <ClientesConteudo pedido={pedido} q={q} definirPeriodo={definirPeriodo} topo={topo} />}
    </Pagina>
  );
}

const CELULAR_INICIO = 8;

function ClientesConteudo({ pedido, q, definirPeriodo, topo }: { pedido: Pedido; q: string; definirPeriodo: (p: PeriodoRelatorio) => void; topo: ReactNode }) {
  const { carga, recarregar } = useRelatorio<RelatorioClientes>(`/v1/escritorio/financeiro/relatorios/clientes${q}`);
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState<OrdemClientes>("entrou");
  const [area, setArea] = useState<AreaRelatorio | "">("");
  const [mostrar, setMostrar] = useState(CELULAR_INICIO);
  return (
    <>
      {topo}
      <Carregado carga={carga} recarregar={recarregar} pedido={pedido} visao="clientes" definirPeriodo={definirPeriodo}>
        {(d) => {
          const areas = [...new Set(d.clientes.flatMap((c) => c.areas))].sort((a, b) => nomeArea(a).localeCompare(nomeArea(b), "pt-BR"));
          const lista = filtrarClientes(d.clientes, { q: busca, area, ordem });
          const t = totaisClientes(lista);
          const negativos = lista.filter((c) => c.rendeu < 0);
          const ordemTexto = ORDENS_CLIENTES.find((o) => o.v === ordem)!.t.toLowerCase();
          const rotuloCol = (k: OrdemClientes) => (ordem === k ? (k === "rendeu" || k === "nome" ? "ascending" : "descending") : undefined);
          return (
            <section className="folha" aria-labelledby="t-cli" style={{ overflow: "hidden" }}>
              <div className="folha-cab">
                <div>
                  <h2 id="t-cli"><Icone nome="pessoas" className="ico" />Por cliente</h2>
                  <p className="sub">Cada cliente com o que foi contratado, o que entrou, o que falta e o que rendeu no período.</p>
                </div>
                <div className="acoes"><a className="ver" href={ROTAS_FINANCEIRO.receber}>Cobrar em A receber<Icone nome="dir" className="ico ico-s" /></a></div>
              </div>
              <form className="re-ferr" role="search" onSubmit={(e) => e.preventDefault()}>
                <div className="campo re-busca">
                  <label htmlFor="re-busca">Buscar cliente</label>
                  <span className="campo-busca">
                    <Icone nome="busca" className="ico" />
                    <input className="entrada" id="re-busca" type="search" placeholder="Nome do cliente" autoComplete="off" value={busca} onChange={(e) => setBusca(e.target.value)} />
                  </span>
                </div>
                <div className="campo">
                  <label htmlFor="re-ordem">Ordenar por</label>
                  <select className="entrada" id="re-ordem" value={ordem} onChange={(e) => setOrdem(e.target.value as OrdemClientes)}>
                    {ORDENS_CLIENTES.map((o) => <option key={o.v} value={o.v}>{o.t}</option>)}
                  </select>
                </div>
                <div className="campo">
                  <label htmlFor="re-area">Área</label>
                  <select className="entrada" id="re-area" value={area} onChange={(e) => setArea(e.target.value as AreaRelatorio | "")}>
                    <option value="">Todas as áreas</option>
                    {areas.map((a) => <option key={a} value={a}>{nomeArea(a)}</option>)}
                  </select>
                </div>
              </form>
              <p className="re-cont" role="status"><b>{busca || area ? contar(lista.length, "cliente encontrado", "clientes encontrados") : contar(lista.length, "cliente", "clientes")}</b>{busca || area ? "" : " com contrato no período"} · {ordemTexto}</p>
              {lista.length ? (
                <>
                  <table className="so-pc fi-tab re-tab">
                    <caption className="sr">Por cliente, de {periodoTexto(d.periodo.de, d.periodo.ate)}, ordenado por {ordemTexto}</caption>
                    <colgroup>{["27%", "13%", "13%", "19%", "13%", "15%"].map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
                    <thead>
                      <tr>
                        <th scope="col" aria-sort={rotuloCol("nome")}>Cliente</th>
                        <th scope="col" className="v">Contratado</th>
                        <th scope="col" className="v" aria-sort={rotuloCol("entrou")}>Entrou{ordem === "entrou" ? <Icone nome="baixo" className="ico" /> : null}</th>
                        <th scope="col" className="v" aria-sort={rotuloCol("falta") ?? rotuloCol("vencido")}>Falta receber</th>
                        <th scope="col" className="v">Despesas não reembolsadas</th>
                        <th scope="col" className="v" aria-sort={rotuloCol("rendeu")}>Rendeu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lista.map((c) => (
                        <tr key={c.id} className={c.rendeu < 0 ? "re-neg" : undefined}>
                          <td>
                            <div className="re-nome">
                              <a href={`${ROTAS_RELATORIOS.cliente(c.id)}${q}`}>{c.nome}</a>
                              <small>{contar(c.contratos, "contrato", "contratos")}{c.responsaveis.length ? ` · ${c.responsaveis.join(", ")}` : ""}</small>
                              {c.inativo ? <Selo tom="neutro">Inativo</Selo> : null}
                            </div>
                          </td>
                          <td className="v num">{reais(c.contratado)}</td>
                          <td className="v num"><b style={{ fontWeight: 600 }}>{reais(c.entrou)}</b></td>
                          <td className="v"><FaltaCliente c={c} /></td>
                          <td className="v num">{c.adiantado ? reais(c.adiantado) : <span className="fi-pq">—</span>}</td>
                          <td className="v re-rend"><Rendeu v={c.rendeu} /></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <th scope="row">{contar(lista.length, "cliente", "clientes")}</th>
                        <td className="num">{reais(t.contratado)}</td>
                        <td className="num">{reais(t.entrou)}</td>
                        <td className="num">{reais(t.falta)}<small>{reais(t.vencido)} vencidos{t.aparte ? ` · mais ${reais(t.aparte)} à parte` : ""}</small></td>
                        <td className="num">{reais(t.adiantado)}</td>
                        <td className="num">{reaisComSinal(t.rendeu)}</td>
                      </tr>
                    </tfoot>
                  </table>
                  <ul className="cartoes so-cel" aria-label="Por cliente">
                    {lista.slice(0, mostrar).map((c) => (
                      <li className="cartao" key={c.id}>
                        <div className="c-topo">
                          <div>
                            <a className="c-nome" href={`${ROTAS_RELATORIOS.cliente(c.id)}${q}`}>{c.nome}</a>
                            <small>{contar(c.contratos, "contrato", "contratos")}{c.responsaveis.length ? ` · ${c.responsaveis.join(", ")}` : ""}</small>
                          </div>
                          <span className="fi-cartao-v num" style={{ marginLeft: "auto" }}>{reais(c.entrou)}</span>
                        </div>
                        <dl className="c-dados">
                          <dt>Contratado</dt><dd className="num">{reais(c.contratado)}</dd>
                          <dt>Falta receber</dt><dd className="num">{reais(c.falta)}{c.aparte.map((a, i) => <small key={i}>{TIPOS_LEVANTAMENTO[a.tipo]}: {reais(a.valor)}, à parte</small>)}</dd>
                          <dt>Despesas não reembolsadas</dt><dd className="num">{reais(c.adiantado)}</dd>
                          <dt>Rendeu</dt><dd className="num">{reaisComSinal(c.rendeu)}</dd>
                        </dl>
                        {c.vencido || c.inativo ? (
                          <div className="c-selos">
                            {c.vencido ? <Selo tom="urgente" icone="alerta">{reais(c.vencido)} vencido</Selo> : null}
                            {c.inativo ? <Selo tom="neutro">Inativo</Selo> : null}
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  {lista.length > mostrar ? (
                    <p className="mais so-cel">
                      <span>Mostrando {mostrar} de {contar(lista.length, "cliente", "clientes")}</span>
                      <button className="btn btn-sec" type="button" onClick={() => setMostrar((n) => n + CELULAR_INICIO)}>Mostrar mais</button>
                    </p>
                  ) : null}
                  <dl className="fi-dl so-cel" style={{ paddingTop: 12, borderTop: "1px solid var(--divisor)" }}>
                    <div><dt>Entrou, {contar(lista.length, "cliente", "clientes")}</dt><dd className="num">{reais(t.entrou)}</dd></div>
                    <div><dt>Falta receber</dt><dd className="num">{reais(t.falta)}<br /><span className="fi-pq">{reais(t.vencido)} vencidos</span></dd></div>
                    <div><dt>Rendeu</dt><dd className="num">{reaisComSinal(t.rendeu)}</dd></div>
                  </dl>
                  {negativos.length ? (
                    <p className="pt-pe-folha"><Icone nome="ajuda" className="ico" />
                      <span>{negativos.map((c) => c.nome.split(" ")[0]).join(" e ")} {negativos.length === 1 ? "rendeu" : "renderam"} menos que zero: o escritório adiantou despesas de caso e o dinheiro ainda não voltou. O reembolso está combinado em A pagar.</span>
                    </p>
                  ) : null}
                </>
              ) : (
                <Estado icone="busca" titulo="Nenhum cliente com esse filtro">Confira o nome ou escolha &quot;Todas as áreas&quot;.</Estado>
              )}
            </section>
          );
        }}
      </Carregado>
    </>
  );
}

// ------------------------------------------------------------------------- um cliente

function UmCliente({ id }: { id: string }) {
  return (
    <Pagina visao="cliente" cliente={id}>
      {({ pedido, q, definirPeriodo, topo }) => <ClienteConteudo id={id} pedido={pedido} q={q} definirPeriodo={definirPeriodo} barra={topo} />}
    </Pagina>
  );
}

function ClienteConteudo({ id, pedido, q, definirPeriodo, barra }: { id: string; pedido: Pedido; q: string; definirPeriodo: (p: PeriodoRelatorio) => void; barra: ReactNode }) {
  const { carga, recarregar } = useRelatorio<RelatorioCliente>(`/v1/escritorio/financeiro/relatorios/clientes/${id}${q}`);
  if (carga.estado === "erro" && carga.erro.codigo === "NOT_FOUND") {
    return (
      <Estado icone="pessoas" titulo="Este cliente não está aqui" nivel={1} moldura
        acoes={<a className="btn btn-pri" href={`${ROTAS_RELATORIOS.clientes}${q}`}><Icone nome="esquerda" className="ico" />Voltar para Por cliente</a>}>
        O endereço pode estar errado, ou o cliente é de outro escritório.
      </Estado>
    );
  }
  return (
    <Carregado carga={carga} recarregar={recarregar} pedido={pedido} visao="cliente" definirPeriodo={definirPeriodo}>
      {(d) => <ClienteRelatorioTela d={d} q={q} barra={barra} />}
    </Carregado>
  );
}

function ClienteRelatorioTela({ d, q, barra }: { d: RelatorioCliente; q: string; barra: ReactNode }) {
  const p = d.periodo;
  const n = d.numeros;
  const ant = rotuloComparacao(p);
  const hoje = p.hoje;
  const meses = [...new Set(d.entradas.map((e) => e.dia.slice(0, 7)))];
  const mesesTodos: string[] = [];
  for (let m = p.de.slice(0, 7); m <= p.ate.slice(0, 7);) {
    mesesTodos.push(m);
    const [a, mm] = [Number(m.slice(0, 4)), Number(m.slice(5, 7))];
    m = mm === 12 ? `${a + 1}-01` : `${a}-${String(mm + 1).padStart(2, "0")}`;
  }
  const linhaMeses = mesesTodos.length <= 12 ? mesesTodos : meses;
  const adiantadoFaltando = d.adiantadas.filter((a) => !a.reembolsadoEm || a.reembolsadoEm > p.ate).reduce((s, a) => s + a.valor, 0);
  return (
    <>
      <div className="ficha-cab">
        <div className="esq campo-vinho">
          <Icone nome="coluna" className="ico estatua" />
          <a className="voltar" href={`${ROTAS_RELATORIOS.clientes}${q}`}><Icone nome="esquerda" className="ico ico-s" />Por cliente</a>
          <div className="ident">
            <div>
              <p className="sobretitulo">Relatório do cliente · {periodoTexto(p.de, p.ate)}</p>
              <h1>{d.cliente.nome}</h1>
              <p className="meta">
                <span className="selo" style={{ background: "var(--ambar-3)", color: "var(--vinho)" }}>{d.cliente.inativo ? "Inativo" : "Ativo"}</span>
                <span>{contar(d.cliente.contratos, "contrato", "contratos")} · {contar(d.cliente.casos, "caso", "casos")}</span>
                {d.cliente.responsavel ? <><span className="sep" aria-hidden="true" /><span>responsável {d.cliente.responsavel.nome}</span></> : null}
              </p>
            </div>
          </div>
        </div>
        {d.atraso ? (
          <section className="dir campo-ambar" aria-labelledby="t-dir">
            <p className="sobretitulo" id="t-dir">Em atraso</p>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <p className="grande num">{reais(d.atraso.valor)}</p>
              <Selo tom="urgente" icone="alerta">{contar(d.atraso.dias, "dia", "dias")}</Selo>
            </div>
            <p className="fi-oque">
              <b>{d.atraso.mais.descricao}.</b> Venceu em {diaCurto(d.atraso.mais.vencimento)}.
              {d.atraso.mais.prox ? <><br />Próxima ação: {diaCurto(d.atraso.mais.prox.data)}, {d.atraso.mais.prox.responsavel.nome.split(" ")[0]}: {d.atraso.mais.prox.oque}.</> : <><br />Sem cobrança anotada.</>}
            </p>
            <a className="btn btn-pri" href={ROTAS_FINANCEIRO.receber}><Icone nome="moeda" className="ico" />Ver em A receber</a>
          </section>
        ) : (
          <section className="dir campo-ambar" aria-labelledby="t-dir">
            <p className="sobretitulo" id="t-dir">Em dia</p>
            <p className="fi-oque">Nenhuma parcela vencida deste cliente.</p>
            <a className="btn btn-pri" href={ROTAS_FINANCEIRO.receber}><Icone nome="moeda" className="ico" />Ver em A receber</a>
          </section>
        )}
      </div>
      {barra}
      <div className="fi-grade">
        <div className="fi-col">
          <Folha id="t-num" titulo="No período" icone="funcoes" sub="Contratado, entrou, falta receber e rendeu, como nas outras visões.">
            <dl className="fi-quatro">
              <div><dt>Contratado no período</dt><dd className="num">{reais(n.contratado)}</dd></div>
              <div><dt>Entrou</dt><dd className="num">{reais(n.entrou)}</dd></div>
              <div><dt>Falta receber</dt><dd className={n.vencido ? "num urg" : "num"}>{reais(n.falta)}</dd></div>
              <div><dt>Rendeu</dt><dd className="num">{reaisComSinal(n.rendeu)}</dd></div>
            </dl>
            {ant && n.entrouAnterior !== null ? (
              <p className="re-leitura" style={{ marginTop: 14 }}><Icone nome="historico" className="ico" /><span>Entrou <b>{comparaTexto(n.entrou, n.entrouAnterior, ant)}</b> ({reais(n.entrouAnterior)}).</span></p>
            ) : null}
          </Folha>
          <Folha id="t-ct" titulo="Contratos e casos" icone="pena" sub="O que o cliente contratou e de onde veio cada valor."
            acoes={<a className="btn btn-sec" href={rotaFichaCliente(d.cliente.id)}><Icone nome="pessoas" className="ico" />Ficha do cliente</a>}>
            {d.contratos.length ? (
              <>
                <table className="so-pc fi-tab re-tab re-ct">
                  <caption className="sr">Contratos e casos de {d.cliente.nome}</caption>
                  <colgroup>{["34%", "30%", "14%", "22%"].map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
                  <thead><tr><th scope="col">Contrato</th><th scope="col">Caso e área</th><th scope="col" className="v">Entrou</th><th scope="col" className="v">Falta receber</th></tr></thead>
                  <tbody>
                    {d.contratos.map((c) => (
                      <tr key={c.id}>
                        <td><div className="re-nome"><a href={ROTAS_FINANCEIRO.contrato(c.id)}>{c.objeto}</a><small>{c.numero}{c.estado === "ENCERRADO" ? " · encerrado" : ""}</small></div></td>
                        <td><div className="re-nome">{c.caso ? <a href={rotaCaso(c.caso.id)}>{c.caso.nome}</a> : null}<small>{nomeArea(c.area)}</small></div></td>
                        <td className="v num"><b style={{ fontWeight: 600 }}>{reais(c.entrou)}</b></td>
                        <td className="v"><b className="num" style={{ fontWeight: 500 }}>{reais(c.falta)}</b>{c.parcelasAbertas ? <small>{contar(c.parcelasAbertas, "parcela em aberto", "parcelas em aberto")}</small> : null}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr><th scope="row">{contar(d.contratos.length, "contrato", "contratos")}</th><td /><td className="num">{reais(n.entrou)}</td><td className="num">{reais(n.falta)}</td></tr></tfoot>
                </table>
                <ul className="cartoes so-cel" aria-label="Contratos e casos">
                  {d.contratos.map((c) => (
                    <li className="cartao" key={c.id}>
                      <div className="c-topo"><div><a className="c-nome" href={ROTAS_FINANCEIRO.contrato(c.id)}>{c.objeto}</a><small>{c.numero}</small></div></div>
                      <dl className="c-dados">
                        <dt>Área</dt><dd>{nomeArea(c.area)}</dd>
                        <dt>Caso</dt><dd>{c.caso ? c.caso.nome : "Sem caso ligado"}</dd>
                        <dt>Entrou</dt><dd className="num">{reais(c.entrou)}</dd>
                        <dt>Falta receber</dt><dd className="num">{reais(c.falta)}</dd>
                      </dl>
                    </li>
                  ))}
                </ul>
              </>
            ) : <p className="re-cont">Nenhum contrato assinado com este cliente.</p>}
          </Folha>
          <Folha id="t-linha" titulo="O que entrou" icone="historico" sub="Pelo dia em que o dinheiro entrou, com o contrato de cada valor.">
            <ol className="re-linha-t">
              {linhaMeses.map((m) => {
                const evs = d.entradas.filter((e) => e.dia.startsWith(m));
                const total = evs.reduce((s, e) => s + e.valor, 0);
                const aberto = m === hoje.slice(0, 7) && p.aberto;
                return (
                  <li key={m}>
                    <p className="re-mes">{maiuscula(nomeDoMesLongo(`${m}-01`))}{aberto ? <small>até hoje</small> : null}<b className="num">{reais(total)}</b></p>
                    <ol className="re-evs">
                      {evs.length ? evs.map((e) => (
                        <li key={e.id}>
                          <time dateTime={e.dia}>{diaCurto(e.dia)}</time>
                          <span><strong>{e.descricao}</strong><small>{[e.contrato, nomeArea(e.area)].filter(Boolean).join(" · ")}</small></span>
                          <span className="fi-v num">{reais(e.valor)}</span>
                        </li>
                      )) : <li style={{ gridTemplateColumns: "1fr" }}><p className="re-nada">Nada entrou{aberto ? " até hoje" : " neste mês"}.</p></li>}
                    </ol>
                  </li>
                );
              })}
            </ol>
            <p className="fi-total"><span>{contar(d.entradas.length, "recebimento", "recebimentos")} no período</span><b className="num">{reais(n.entrou)}</b></p>
          </Folha>
        </div>
        <aside className="fi-col" aria-label="O que falta e o que foi adiantado">
          <Folha id="t-falta" titulo="O que falta" icone="alerta" sub="Para cobrar, o caminho é A receber." ver={{ texto: "A receber", href: ROTAS_FINANCEIRO.receber }}>
            {d.abertas.length ? (
              <ul className="fi-linhas">
                {d.abertas.map((a) => {
                  const venc = a.vencimento < hoje;
                  const dias = Math.round((Date.parse(hoje) - Date.parse(a.vencimento)) / 86400000);
                  return (
                    <li className={venc ? "fi-linha fi-venc" : "fi-linha"} key={a.id} style={venc ? undefined : { gridTemplateColumns: "minmax(0,1fr) auto" }}>
                      <div className="fi-quem">
                        <strong>{a.descricao}</strong>
                        <small>{a.contrato} · {venc ? "venceu" : "vence"} em {diaCurto(a.vencimento)}</small>
                        {venc && a.cobranca?.motivo ? <p className="fi-motivo"><b>Motivo:</b> {a.cobranca.motivo}</p> : null}
                        {venc && a.cobranca ? (
                          <p className="fi-prox"><Icone nome="relogio" className="ico ico-s" />Próxima ação: <b>{diaCurto(a.cobranca.data)}, {a.cobranca.oque}</b> · {a.cobranca.responsavel.nome}</p>
                        ) : null}
                      </div>
                      {venc ? (
                        <div className="fi-lado"><span className="fi-v forte num">{reais(a.falta)}</span><Selo tom="urgente" icone="alerta">{contar(dias, "dia", "dias")}</Selo></div>
                      ) : <span className="fi-v num">{reais(a.falta)}</span>}
                    </li>
                  );
                })}
              </ul>
            ) : <p className="re-cont">Nada em aberto deste cliente.</p>}
            <p className="fi-total"><span>{contar(d.abertas.length, "parcela em aberto", "parcelas em aberto")}</span><b className="num">{reais(n.falta)}</b></p>
          </Folha>
          <Folha id="t-adi" titulo="O que o escritório adiantou" icone="reenviar" sub="Despesas de caso que viram reembolso (FI-07). Só o que não voltou diminui o Rendeu.">
            {d.adiantadas.length ? (
              <ul className="fi-linhas">
                {d.adiantadas.map((a) => {
                  const voltou = !!a.reembolsadoEm && a.reembolsadoEm <= p.ate;
                  return (
                    <li className="fi-linha" key={a.id} style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
                      <div className="fi-quem"><strong>{a.descricao}</strong><small>Paga pelo escritório em {diaCurto(a.pagaEm)}{voltou ? ` · voltou em ${diaCurto(a.reembolsadoEm!)}` : " · ainda não voltou"}</small></div>
                      <div className="fi-lado"><span className="fi-v num">{reais(a.valor)}</span>{voltou ? <Selo tom="ok" icone="check">Voltou</Selo> : <Selo tom="atencao" icone="relogio">A reembolsar</Selo>}</div>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="re-cont">O escritório não adiantou despesas deste cliente no período.</p>}
            <p className="fi-total"><span>Não reembolsado</span><b className="num">{reais(adiantadoFaltando)}</b></p>
          </Folha>
          {d.terceiros.length ? (
            <Folha id="t-terc" titulo="Passou pelo escritório" icone="enviar" terc sub="Dinheiro do cliente que entrou e foi repassado">
              <ul className="fi-linhas">
                {d.terceiros.map((t) => (
                  <li className="fi-linha" key={t.id} style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
                    <div className="fi-quem">
                      <strong>{TIPOS_LEVANTAMENTO[t.tipo]} · {t.caso}</strong>
                      <small>Entrou em {diaCurto(t.entrouEm)}{t.repasse?.feitoEm ? ` · repassado ao cliente em ${diaCurto(t.repasse.feitoEm)}` : t.repasse ? ` · repassar até ${diaCurto(t.repasse.prazo)}` : ""}</small>
                    </div>
                    <div className="fi-lado">
                      <span className="fi-v num">{reais(t.valor)}</span>
                      {t.repasse?.feitoEm ? <Selo tom="ok" icone="check">Repassado</Selo> : t.repasse ? <Selo tom="atencao" icone="relogio">A repassar</Selo> : null}
                    </div>
                  </li>
                ))}
              </ul>
              <p className="pt-pe-folha"><Icone nome="escudo" className="ico" /><span>Era do cliente. Não entra em nenhum número acima; os honorários que vieram daqui já estão em Entrou.</span></p>
            </Folha>
          ) : null}
        </aside>
      </div>
    </>
  );
}

// ------------------------------------------------------------------------- por área

function PorArea() {
  return (
    <Pagina visao="areas">
      {({ pedido, q, definirPeriodo, topo }) => <AreasConteudo pedido={pedido} q={q} definirPeriodo={definirPeriodo} topo={topo} />}
    </Pagina>
  );
}

function AreasConteudo({ pedido, q, definirPeriodo, topo }: { pedido: Pedido; q: string; definirPeriodo: (p: PeriodoRelatorio) => void; topo: ReactNode }) {
  const { carga, recarregar } = useRelatorio<RelatorioAreas>(`/v1/escritorio/financeiro/relatorios/areas${q}`);
  return (
    <>
      {topo}
      <Carregado carga={carga} recarregar={recarregar} pedido={pedido} visao="areas" definirPeriodo={definirPeriodo}>
        {(d) => {
          const p = d.periodo;
          const ant = rotuloComparacao(p);
          const lista = d.areas;
          const total = lista.reduce((s, a) => s + a.entrou, 0);
          const max = Math.max(1, ...lista.map((a) => Math.max(a.entrou, a.anterior ?? 0)));
          const casos = lista.reduce((s, a) => s + (a.casos ?? 0), 0);
          const sem = lista.find((a) => a.area === "SEM_CASO");
          const rendeuCasos = lista.filter((a) => a.area !== "SEM_CASO").reduce((s, a) => s + a.rendeu, 0);
          const t = { falta: lista.reduce((s, a) => s + a.falta, 0), rendeu: lista.reduce((s, a) => s + a.rendeu, 0), aparte: lista.reduce((s, a) => s + a.aparte.reduce((x, y) => x + y.valor, 0), 0) };
          const queda = ant ? lista.filter((a) => a.anterior !== null && a.anterior > a.entrou).sort((a, b) => (b.anterior! - b.entrou) - (a.anterior! - a.entrou))[0] : undefined;
          if (!lista.length) return <section className="folha"><Estado icone="balanca" titulo="Nenhuma área neste período">Ainda não há contratos, casos ou recebimentos neste período.</Estado></section>;
          return (
            <>
              <Folha id="t-graf" titulo="Entrou por área" icone="moeda" sub={ant ? `Comparado com ${periodoTexto(p.cde!, p.cate!)}.` : "Sem comparação."}>
                <div className="fi-barras re-barras-nome" role="group" aria-label={`Entrou por área${ant ? `, neste período e em ${ant}` : ""}`}>
                  {lista.map((a) => (
                    <div className="fi-barra" key={a.area}>
                      <span className="rot">{nomeArea(a.area)}</span>
                      {ant ? (
                        <span className="fi-duplo" aria-hidden="true">
                          <span className="fi-trilho"><i className="tipo4" style={{ width: largura(a.anterior ?? 0, max) }} /></span>
                          <span className="fi-trilho"><i className="real" style={{ width: largura(a.entrou, max) }} /></span>
                        </span>
                      ) : <span className="fi-trilho" aria-hidden="true"><i className="real" style={{ width: largura(a.entrou, max) }} /></span>}
                      <span className="val"><b className="num">{reais(a.entrou)}</b>{ant ? <small>{ant}: {reais(a.anterior ?? 0)}</small> : null}</span>
                    </div>
                  ))}
                </div>
                {ant ? (
                  <p className="legenda fi-leg">
                    <span><i style={{ background: "var(--vinho-4)" }} />{maiuscula(ant)} (barra de cima)</span>
                    <span><i style={{ background: "var(--vinho)" }} />{maiuscula(periodoCurto(p.de, p.ate))} (barra de baixo)</span>
                  </p>
                ) : null}
                {queda && ant ? (
                  <p className="re-leitura"><Icone nome="ajuda" className="ico" /><span><b>{nomeArea(queda.area)} caiu {reais(queda.anterior! - queda.entrou)}</b> contra {ant}.</span></p>
                ) : null}
              </Folha>
              <Folha id="t-areas" titulo="Por área do direito" icone="balanca" sub="Entrou, falta receber e rendeu de cada área, com os casos de cada uma.">
                <table className="so-pc fi-tab re-tab">
                  <caption className="sr">Por área do direito, de {periodoTexto(p.de, p.ate)}</caption>
                  <colgroup>{["17%", "15%", "16%", "22%", "15%", "15%"].map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
                  <thead>
                    <tr>
                      <th scope="col">Área</th><th scope="col">Casos no período</th><th scope="col" className="v" aria-sort="descending">Entrou</th>
                      <th scope="col" className="v">Falta receber</th><th scope="col" className="v">Rendeu</th><th scope="col" className="v">Rendeu por caso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lista.map((a) => (
                      <tr key={a.area}>
                        <th scope="row" style={{ fontWeight: 500, textAlign: "left" }}>{nomeArea(a.area)}</th>
                        <td>
                          {a.area === "SEM_CASO"
                            ? <div className="re-carga"><b>—</b><small>{contar(a.contratosSemCaso ?? 0, "contrato sem caso", "contratos sem caso")}</small></div>
                            : <div className="re-carga"><b className="num">{a.casos}</b><small>{(a.casos ?? 0) === 1 ? "caso" : "casos"}{a.encerrados ? ` · ${contar(a.encerrados, "encerrado", "encerrados")} no período` : ""}</small></div>}
                        </td>
                        <td className="v num"><b style={{ fontWeight: 600 }}>{reais(a.entrou)}</b><small>{pct(a.entrou, total)}% do período</small></td>
                        <td className="v">
                          <b className="num" style={{ fontWeight: 500 }}>{reais(a.falta)}</b>
                          {a.vencido ? <><br /><Selo tom="urgente" icone="alerta">{reais(a.vencido)} vencido</Selo></> : null}
                          {a.aparte.map((x, i) => <span className="re-aparte-txt" key={i}><Icone nome="balanca" className="ico" /><span>{TIPOS_LEVANTAMENTO[x.tipo]} de {x.cliente.split(" ")[0]}: {reais(x.valor)}, à parte</span></span>)}
                        </td>
                        <td className="v num"><b style={{ fontWeight: 600 }}>{reaisComSinal(a.rendeu)}</b>{a.adiantado ? <small>− {reais(a.adiantado)} adiantados</small> : null}</td>
                        <td className="v num">{a.area === "SEM_CASO" || !a.casos ? <span className="fi-pq">não se aplica</span> : reaisComSinal(Math.round(a.rendeu / a.casos))}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th scope="row">{contar(lista.length, "área", "áreas")}</th>
                      <td style={{ textAlign: "left" }}>{contar(casos, "caso", "casos")}{sem ? <small>e {contar(sem.contratosSemCaso ?? 0, "contrato sem caso", "contratos sem caso")}</small> : null}</td>
                      <td className="num">{reais(total)}</td>
                      <td className="num">{reais(t.falta)}{t.aparte ? <small>mais {reais(t.aparte)} à parte</small> : null}</td>
                      <td className="num">{reaisComSinal(t.rendeu)}</td>
                      <td className="num">{casos ? <>{reaisComSinal(Math.round(rendeuCasos / casos))}<small>média dos casos</small></> : "—"}</td>
                    </tr>
                  </tfoot>
                </table>
                <ul className="cartoes so-cel" aria-label="Por área">
                  {lista.map((a) => (
                    <li className="cartao" key={a.area}>
                      <div className="c-topo">
                        <div><strong className="c-nome">{nomeArea(a.area)}</strong>
                          <small>{a.area === "SEM_CASO" ? contar(a.contratosSemCaso ?? 0, "contrato sem caso", "contratos sem caso") : contar(a.casos ?? 0, "caso", "casos")}</small></div>
                        <span className="fi-cartao-v num" style={{ marginLeft: "auto" }}>{reais(a.entrou)}</span>
                      </div>
                      <dl className="c-dados">
                        <dt>Falta receber</dt><dd className="num">{reais(a.falta)}</dd>
                        <dt>Rendeu</dt><dd className="num">{reaisComSinal(a.rendeu)}</dd>
                        <dt>Rendeu por caso</dt><dd className="num">{a.area === "SEM_CASO" || !a.casos ? "não se aplica" : reaisComSinal(Math.round(a.rendeu / a.casos))}</dd>
                      </dl>
                      {a.vencido ? <div className="c-selos"><Selo tom="urgente" icone="alerta">{reais(a.vencido)} vencido</Selo></div> : null}
                    </li>
                  ))}
                </ul>
                <p className="pt-pe-folha"><Icone nome="ajuda" className="ico" />
                  <span>A área é a do caso ligado ao contrato, como está em Jurídico. &quot;Casos no período&quot; conta os casos em andamento em algum dia do período, inclusive os que encerraram. &quot;Rendeu por caso&quot; divide o Rendeu da área por esses casos.</span>
                </p>
              </Folha>
            </>
          );
        }}
      </Carregado>
    </>
  );
}

// ------------------------------------------------------------------------- por responsável

function PorResponsavel() {
  return (
    <Pagina visao="responsaveis">
      {({ pedido, q, definirPeriodo, topo }) => <ResponsaveisConteudo pedido={pedido} q={q} definirPeriodo={definirPeriodo} topo={topo} />}
    </Pagina>
  );
}

function ResponsaveisConteudo({ pedido, q, definirPeriodo, topo }: { pedido: Pedido; q: string; definirPeriodo: (p: PeriodoRelatorio) => void; topo: ReactNode }) {
  const { carga, recarregar } = useRelatorio<RelatorioResponsaveis>(`/v1/escritorio/financeiro/relatorios/responsaveis${q}`);
  return (
    <>
      {topo}
      <Carregado carga={carga} recarregar={recarregar} pedido={pedido} visao="responsaveis" definirPeriodo={definirPeriodo}>
        {(d) => {
          const lista = d.responsaveis;
          if (!lista.length) return <section className="folha"><Estado icone="cracha" titulo="Ninguém responde por contratos neste período">Os responsáveis aparecem com os contratos e os casos.</Estado></section>;
          const total = lista.reduce((s, x) => s + x.entrou, 0);
          const max = Math.max(1, ...lista.map((x) => x.entrou));
          const t = {
            falta: lista.reduce((s, x) => s + x.falta, 0), vencido: lista.reduce((s, x) => s + x.vencido, 0), adiantado: lista.reduce((s, x) => s + x.adiantado, 0),
            rendeu: lista.reduce((s, x) => s + x.rendeu, 0), casos: lista.reduce((s, x) => s + x.casos, 0), sem: lista.reduce((s, x) => s + x.contratosSemCaso, 0),
          };
          const primeiro = lista[0]!;
          const maisFalta = [...lista].sort((a, b) => b.falta - a.falta)[0]!;
          return (
            <>
              <div className="fi-grade fi-grade-meio" style={{ gridTemplateColumns: "minmax(0,1fr)" }}>
                <Folha id="t-graf" titulo="Entrou por responsável" icone="cracha" sub="Quem cuida dos contratos que trouxeram o dinheiro.">
                  <div className="fi-barras re-barras-nome" role="group" aria-label="Entrou por responsável">
                    {lista.map((x) => (
                      <div className="fi-barra" key={x.pessoa.id}>
                        <span className="rot">{x.pessoa.nome}<small>{contar(x.casos, "caso", "casos")}</small></span>
                        <span className="fi-trilho" aria-hidden="true"><i className="real" style={{ width: largura(x.entrou, max) }} /></span>
                        <span className="val"><b className="num">{reais(x.entrou)}</b><small>{pct(x.entrou, total)}% do período</small></span>
                      </div>
                    ))}
                  </div>
                  {total ? (
                    <p className="re-leitura"><Icone nome="ajuda" className="ico" />
                      <span>{primeiro.pessoa.nome.split(" ")[0]} responde por <b>{pct(primeiro.entrou, total)}%</b> do que entrou.
                        {maisFalta.falta && maisFalta.pessoa.id !== primeiro.pessoa.id ? ` ${maisFalta.pessoa.nome.split(" ")[0]} tem mais a receber (${reais(maisFalta.falta)}).` : ""}</span>
                    </p>
                  ) : null}
                </Folha>
              </div>
              <Folha id="t-resp" titulo="Por responsável" icone="cracha" sub="Entrou, falta receber e casos de cada pessoa (a carga, IN-08).">
                <table className="so-pc fi-tab re-tab">
                  <caption className="sr">Por responsável, de {periodoTexto(d.periodo.de, d.periodo.ate)}</caption>
                  <colgroup>{["24%", "16%", "14%", "18%", "14%", "14%"].map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
                  <thead>
                    <tr>
                      <th scope="col">Responsável</th><th scope="col">Carga</th><th scope="col" className="v" aria-sort="descending">Entrou<Icone nome="baixo" className="ico" /></th>
                      <th scope="col" className="v">Falta receber</th><th scope="col" className="v">Despesas não reembolsadas</th><th scope="col" className="v">Rendeu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lista.map((x) => (
                      <tr key={x.pessoa.id}>
                        <th scope="row" style={{ textAlign: "left", fontWeight: 400 }}>
                          <span className="re-pessoa"><span className="av-p forte" aria-hidden="true">{iniciais(x.pessoa.nome)}</span>
                            <span><strong>{x.pessoa.nome}</strong><small>{x.dono ? "Sócio dono" : "Da equipe"}</small></span></span>
                        </th>
                        <td>
                          <div className="re-carga">
                            <b className="num">{x.casos}</b>
                            <small>{x.casos === 1 ? "caso" : "casos"}{x.encerrados ? `, ${contar(x.encerrados, "encerrado", "encerrados")}` : ""}</small>
                            <small>{contar(x.contratosSemCaso, "contrato sem caso", "contratos sem caso")}</small>
                          </div>
                        </td>
                        <td className="v num"><b style={{ fontWeight: 600 }}>{reais(x.entrou)}</b></td>
                        <td className="v"><b className="num" style={{ fontWeight: 500 }}>{reais(x.falta)}</b>{x.vencido ? <><br /><Selo tom="urgente" icone="alerta">{reais(x.vencido)} vencido</Selo></> : null}</td>
                        <td className="v num">{x.adiantado ? reais(x.adiantado) : <span className="fi-pq">—</span>}</td>
                        <td className="v num"><b style={{ fontWeight: 600 }}>{reaisComSinal(x.rendeu)}</b></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th scope="row">{contar(lista.length, "pessoa", "pessoas")}</th>
                      <td style={{ textAlign: "left" }}>{contar(t.casos, "caso", "casos")}<small>e {contar(t.sem, "contrato sem caso", "contratos sem caso")}</small></td>
                      <td className="num">{reais(total)}</td>
                      <td className="num">{reais(t.falta)}<small>{reais(t.vencido)} vencidos</small></td>
                      <td className="num">{reais(t.adiantado)}</td>
                      <td className="num">{reaisComSinal(t.rendeu)}</td>
                    </tr>
                  </tfoot>
                </table>
                <ul className="cartoes so-cel" aria-label="Por responsável">
                  {lista.map((x) => (
                    <li className="cartao" key={x.pessoa.id}>
                      <div className="c-topo">
                        <span className="av-p forte" aria-hidden="true" style={{ width: 40, height: 40, fontSize: 13 }}>{iniciais(x.pessoa.nome)}</span>
                        <div><strong className="c-nome">{x.pessoa.nome}</strong><small>{contar(x.casos, "caso", "casos")} · {x.contratosSemCaso} sem caso</small></div>
                        <span className="fi-cartao-v num" style={{ marginLeft: "auto" }}>{reais(x.entrou)}</span>
                      </div>
                      <dl className="c-dados">
                        <dt>Falta receber</dt><dd className="num">{reais(x.falta)}</dd>
                        <dt>Despesas não reembolsadas</dt><dd className="num">{reais(x.adiantado)}</dd>
                        <dt>Rendeu</dt><dd className="num">{reaisComSinal(x.rendeu)}</dd>
                      </dl>
                      {x.vencido ? <div className="c-selos"><Selo tom="urgente" icone="alerta">{reais(x.vencido)} vencido</Selo></div> : null}
                    </li>
                  ))}
                </ul>
                <p className="pt-pe-folha"><Icone nome="ajuda" className="ico" />
                  <span>O responsável é o do contrato, o mesmo do caso quando há caso. Quem cuida do Financeiro sem ser responsável por contrato não aparece aqui.</span>
                </p>
                <div className="fi-reserva"><Icone nome="cadeado" className="ico" /><span><b>Este número não é a parte de cada um.</b> A divisão de honorários entre sócios (FI-11) ainda está em validação com os pilotos.</span></div>
              </Folha>
            </>
          );
        }}
      </Carregado>
    </>
  );
}

// ------------------------------------------------------------------------- janelas

function JanelaPeriodo({ periodo, aoFechar, aoEscolher }: { periodo: PeriodoRelatorio; aoFechar: () => void; aoEscolher: (p: Pedido) => void }) {
  const hoje = periodo.hoje;
  const [de, setDe] = useState(diaBr(periodo.de));
  const [ate, setAte] = useState(diaBr(periodo.ate));
  const [comparar, setComparar] = useState<CompararCom>(periodo.comparar);
  const [erros, setErros] = useState<{ de?: string; ate?: string } | null>(null);
  const corpo = useRef<HTMLDivElement>(null);
  const conferido = conferirPeriodo(de, ate, hoje);
  const anterior = conferido.ok ? comparacao(conferido.de, conferido.ate, "anterior", hoje) : null;
  const passado = conferido.ok ? comparacao(conferido.de, conferido.ate, "ano_passado", hoje) : null;
  const n = erros ? Object.keys(erros).length : 0;

  function usarAtalho(a: "mesPassado" | "seis" | "anoPassado") {
    const x = atalho(a, hoje);
    setDe(diaBr(x.de));
    setAte(diaBr(x.ate));
    setErros(null);
  }
  function enviar() {
    const c = conferirPeriodo(de, ate, hoje);
    if (!c.ok) {
      setErros(c.erros);
      requestAnimationFrame(() => corpo.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    aoEscolher({ de: c.de, ate: c.ate, comparar });
  }
  const pista = "Aparece quando as datas estiverem certas.";
  return (
    <Janela id="janela-periodo" aberta aoFechar={aoFechar} sobretitulo="Relatórios" titulo="Escolher datas" descricao="j-per-d" aoEnviar={enviar}
      pe={
        <>
          <button className="btn btn-sec" type="button" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-pri" type="submit"><Icone nome="check" className="ico" />Ver o relatório</button>
        </>
      }>
      <div ref={corpo} style={{ display: "grid", gap: 18 }}>
        <p id="j-per-d">O relatório mostra o período que você escolher, com a comparação embaixo de cada número.</p>
        {n ? <Aviso tom="urgencia" titulo={faltaAcertar(n)}>O relatório continua mostrando {periodoTexto(periodo.de, periodo.ate)}.</Aviso> : null}
        <div>
          <p className="fi-rotulo" id="pe-at" style={{ marginBottom: 8 }}>Atalhos</p>
          <div className="re-atalhos" role="group" aria-labelledby="pe-at">
            <button type="button" onClick={() => usarAtalho("mesPassado")}>Mês passado</button>
            <button type="button" onClick={() => usarAtalho("seis")}>Últimos 6 meses</button>
            <button type="button" onClick={() => usarAtalho("anoPassado")}>Ano passado</button>
          </div>
        </div>
        <div className="fi-dois">
          <div className="campo">
            <label htmlFor="pe-de">De</label>
            <input className="entrada" id="pe-de" type="text" inputMode="numeric" autoComplete="off" value={de} onChange={(e) => setDe(e.target.value)} data-foco=""
              aria-invalid={!!erros?.de || undefined} aria-describedby={descritoPor(!erros?.de && "pe-de-aj", !!erros?.de && "pe-de-er")} />
            {erros?.de ? <ErroCampo id="pe-de-er">{erros.de}</ErroCampo> : <p className="ajuda" id="pe-de-aj">dd/mm/aaaa</p>}
          </div>
          <div className="campo">
            <label htmlFor="pe-ate">Até</label>
            <input className="entrada" id="pe-ate" type="text" inputMode="numeric" autoComplete="off" value={ate} onChange={(e) => setAte(e.target.value)}
              aria-invalid={!!erros?.ate || undefined} aria-describedby={descritoPor(!erros?.ate && "pe-ate-aj", !!erros?.ate && "pe-ate-er")} />
            {erros?.ate ? <ErroCampo id="pe-ate-er">{erros.ate}</ErroCampo> : <p className="ajuda" id="pe-ate-aj">dd/mm/aaaa. Pode ser hoje, {diaBr(hoje)}, ou antes.</p>}
          </div>
        </div>
        <fieldset className="fi-grupo-op">
          <legend>Comparar com</legend>
          <label className="opcao">
            <input className="marcar" type="radio" name="pe-cmp" checked={comparar === "anterior"} onChange={() => setComparar("anterior")} />
            <span>O período anterior, do mesmo tamanho<small>{anterior ? periodoTexto(anterior.de, anterior.ate) : pista}</small></span>
          </label>
          <label className="opcao">
            <input className="marcar" type="radio" name="pe-cmp" checked={comparar === "ano_passado"} onChange={() => setComparar("ano_passado")} />
            <span>O mesmo período do ano passado<small>{passado ? periodoTexto(passado.de, passado.ate) : pista}</small></span>
          </label>
          <label className="opcao">
            <input className="marcar" type="radio" name="pe-cmp" checked={comparar === "nao"} onChange={() => setComparar("nao")} />
            <span>Não comparar</span>
          </label>
        </fieldset>
        <p className="fi-ref"><Icone nome="ajuda" className="ico" /><span>Até 2 anos por vez. Datas antes do primeiro recebimento registrado aparecem vazias.</span></p>
      </div>
    </Janela>
  );
}

const NOME_VISAO: Record<VisaoRelatorio, string> = {
  visao: "Visão geral", clientes: "Por cliente", areas: "Por área", responsaveis: "Por responsável", cliente: "Relatório do cliente",
};

function JanelaExportar({ periodo, visao, cliente, aoFechar, aoFeito }: {
  periodo: PeriodoRelatorio; visao: VisaoRelatorio; cliente?: string; aoFechar: () => void; aoFeito: (texto: string) => void;
}) {
  const [formato, setFormato] = useState<FormatoRelatorio>("XLSX");
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const cmp = periodo.cde && periodo.cate ? `comparado com ${periodoTexto(periodo.cde, periodo.cate)}` : "sem comparação";

  async function enviar() {
    setFalha(null);
    setEnviando(true);
    const r = await chamarPortal<DadosRelatorioExportado>("/v1/escritorio/financeiro/relatorios/exportacoes", {
      metodo: "POST", corpo: { de: periodo.de, ate: periodo.ate, comparar: periodo.comparar, visao, formato },
    });
    setEnviando(false);
    if (!r.ok) return setFalha(textoDoErro(r.erro));
    if (formato === "XLSX") {
      const nome = nomeArquivoRelatorio(r.dados.periodo);
      salvar(nome, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", planilhaXlsx(abasRelatorio(r.dados)));
      aoFeito(`O arquivo ${nome} foi salvo, e a exportação ficou no histórico do escritório.`);
    } else {
      aoFeito("A janela de impressão abriu: escolha \"Salvar como PDF\". A exportação ficou no histórico do escritório.");
      setTimeout(() => window.print(), 50);
    }
  }
  void cliente;
  return (
    <Janela id="janela-exportar" aberta aoFechar={aoFechar} sobretitulo="Relatórios" titulo="Exportar o relatório" descricao="j-exp-d" aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-sec" type="button" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-pri" type="submit" disabled={enviando} aria-busy={enviando || undefined} data-foco="">
            <Icone nome="baixar" className="ico" />{formato === "XLSX" ? "Baixar planilha" : "Gerar PDF"}
          </button>
        </>
      }>
      <div style={{ display: "grid", gap: 18 }}>
        <p id="j-exp-d">Baixe o relatório aberto, com o mesmo período e a mesma comparação.</p>
        {falha ? <Aviso tom="urgencia" titulo="O arquivo não foi gerado.">{falha}</Aviso> : null}
        <div className="fi-alvo">
          <Icone nome="funcoes" className="ico" />
          <div><strong>{NOME_VISAO[visao]} · {periodoTexto(periodo.de, periodo.ate)}</strong><small>O relatório aberto agora, {cmp}</small></div>
        </div>
        <div>
          <p className="fi-rotulo" style={{ marginBottom: 6 }}>O que vai no arquivo</p>
          <ul className="fi-check">
            <li><Icone nome="check" className="ico" /><span>Os três números do período, com a comparação e o &quot;Como contamos&quot;</span></li>
            <li><Icone nome="check" className="ico" /><span>Por cliente, com contratado, entrou, falta receber, despesas não reembolsadas e rendeu</span></li>
            <li><Icone nome="check" className="ico" /><span>Por área e por responsável, uma aba cada</span></li>
            <li><Icone nome="check" className="ico" /><span>Os recebimentos, um por linha, com dia, cliente, contrato e área</span></li>
            <li><Icone nome="escudo" className="ico" /><span>Valores de terceiros numa aba à parte<small>Não são do escritório e não somam com as outras abas.</small></span></li>
          </ul>
        </div>
        <fieldset className="fi-grupo-op">
          <legend>Formato</legend>
          <label className="opcao">
            <input className="marcar" type="radio" name="ex-f" checked={formato === "XLSX"} onChange={() => setFormato("XLSX")} />
            <span>Planilha (.xlsx)<small>Uma aba por visão e a de terceiros. Valores com centavos, prontos para somar.</small></span>
          </label>
          <label className="opcao">
            <input className="marcar" type="radio" name="ex-f" checked={formato === "PDF"} onChange={() => setFormato("PDF")} />
            <span>PDF para ler e imprimir<small>As mesmas folhas desta tela, pela impressão do navegador.</small></span>
          </label>
        </fieldset>
        <p className="fi-ref"><Icone nome="historico" className="ico" /><span>O arquivo fica no histórico do escritório, com quem baixou e quando. Ele tem dados de clientes: guarde com cuidado.</span></p>
      </div>
    </Janela>
  );
}

// ------------------------------------------------------------------------- quem vê

function SemAcesso({ escritorio }: { escritorio: EscritorioPortal }) {
  const dono = escritorio.socios[0];
  return (
    <div className="fi re">
      <Estado icone="cadeado" titulo="Os relatórios ficam com o sócio dono" nivel={1} moldura
        acoes={
          <>
            <a className="btn btn-pri" href={ROTAS_FINANCEIRO.resumo}><Icone nome="carteira" className="ico" />Ir para o Resumo</a>
            <a className="btn btn-sec" href={ROTAS_FINANCEIRO.caixa}><Icone nome="moeda" className="ico" />Abrir o Caixa</a>
          </>
        }>
        {`Nesta versão, só ${dono ?? "o sócio dono"} abre os relatórios do sócio, porque eles mostram quanto rendeu cada cliente e cada pessoa. Quem decide quem vê é ${dono ? dono.split(" ")[0] : "ele"}. O resto do Financeiro continua com você.`}
      </Estado>
    </div>
  );
}

/** As visões dos Relatórios, dentro da área Financeiro. */
export function RelatoriosFinanceiro({ visao, cliente }: { visao: VisaoRelatorio; cliente?: string }) {
  const trilha = visao === "visao" ? [] : [{ nome: visao === "cliente" ? "Cliente" : NOME_VISAO[visao] }];
  return (
    <MolduraArea area="FINANCEIRO" secao="relatorios" trilha={trilha} pagina="co-ficha co-carteira">
      {(e) => {
        if (!e.dono) return <SemAcesso escritorio={e} />;
        if (visao === "clientes") return <PorCliente />;
        if (visao === "cliente" && cliente) return <UmCliente id={cliente} />;
        if (visao === "areas") return <PorArea />;
        if (visao === "responsaveis") return <PorResponsavel />;
        return <VisaoGeral />;
      }}
    </MolduraArea>
  );
}
