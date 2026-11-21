"use client";
// Conversas › Automações (PA-03), tela aprovada em docs/design/aprovadas/portal-conversas-automacoes
// (estados lista, pedir, vazio, nao-conectado, sugestao, bloco, erros, testar, ligar, historico e
// so-leitura). O banco confere o desenho e diz o que falta; só a sócia dona aprova o texto, liga e
// desliga. A IA monta o fluxo a partir de um pedido (F3.59): o que ela sugere aparece tracejado,
// com aplicar e recusar, até a pessoa decidir. No celular, adicionar, mover e apagar passos fica no computador.
// O endereço guarda o estado: ?a=<id>&passo=montar|testar|ligar|historico&b=<passo>.

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AREA_DO_GATILHO, CONTA_CLIENTE_NOVO, GATILHOS, ORDEM_GATILHOS, PASSOS_ADICIONAVEIS, TIPOS_PASSO, TITULOS_ERRO_FLUXO, podeMontarGatilho, regrasDoGatilho,
  acharPasso, adicionarPasso, apagarPasso, aplicarSugestao, fluxoComSugestao, moverPasso, passosSugeridos, passosTracejados, recusarSugestao, nomeDoRamo, passoNovo, podeMover, quandoSai, quemRecebe, reais, textoDoErroFluxo, trocarPasso,
  type AreaAutomacao, type ErroFluxo, type EscolhaSimulacao, type ExecucaoAutomacao, type Fluxo, type Gatilho, type LinhaAutomacao, type ListaAutomacoes,
  type PaginaAutomacao, type Passo, type PassoMensagem, type PassoPessoa, type PassoRamos, type Quando, type QuemEntraria, type Simulacao, type TipoPasso,
} from "@t3jus/domain";
import { textoDoErro, type ErroApi } from "../api.ts";
import { Icone, type NomeIcone } from "../Icone.tsx";
import { Aviso, Carregando, descritoPor, ErroAoCarregar, ErroCampo, Estado, Janela } from "../console/pecas.tsx";
import { diaCurto, diaDe, horaDe } from "./agenda.ts";
import { BarraConversas, ROTAS_CONVERSAS } from "./Conversas.tsx";
import { Toast, type Feito } from "./FichaCliente.tsx";
import { chamarPortal, MolduraPortal, ROTAS_PORTAL, useEscritorioPortal } from "./Moldura.tsx";
import { ROTAS_ESCRITORIO } from "./WhatsApp.tsx";

type PassoEditor = "montar" | "testar" | "ligar" | "historico";
interface Endereco { a: string | null; passo: PassoEditor; b: string | null }

const RAIZ = ROTAS_CONVERSAS.automacoes;
const ic = (n: string) => n as NomeIcone;
const primeiro = (n: string | null | undefined) => (n ?? "").trim().split(/\s+/)[0] ?? "";
const quando = (iso: string | null | undefined) => {
  if (!iso) return "";
  const dia = diaDe(iso);
  const hoje = diaDe(new Date().toISOString());
  return `${dia === hoje ? "hoje" : diaCurto(dia)}, ${horaDe(iso)}`;
};

function lerEndereco(): Endereco {
  const q = new URLSearchParams(window.location.search);
  const p = q.get("passo");
  return { a: q.get("a"), passo: p === "testar" || p === "ligar" || p === "historico" ? p : "montar", b: q.get("b") };
}
export function hrefAutomacao(e: Partial<Endereco>): string {
  const q = new URLSearchParams();
  if (e.a) q.set("a", e.a);
  if (e.a && e.passo && e.passo !== "montar") q.set("passo", e.passo);
  if (e.a && e.b) q.set("b", e.b);
  const s = q.toString();
  return s ? `${RAIZ}?${s}` : RAIZ;
}

function Selo({ tipo, icone, children }: { tipo: "neutro" | "implant" | "atencao" | "ativo" | "urgente" | "ok"; icone?: string; children: ReactNode }) {
  return <span className={`selo selo-${tipo}`}>{icone ? <Icone nome={ic(icone)} className="ico" /> : null}{children}</span>;
}

function SeloSituacao({ a }: { a: LinhaAutomacao }) {
  if (a.situacao === "LIGADA") return <Selo tipo="ativo" icone="check">Ligada</Selo>;
  if (a.situacao === "DESLIGADA") return <Selo tipo="neutro" icone="ligar">Desligada</Selo>;
  if (a.situacao === "EM_APROVACAO") return <Selo tipo="atencao" icone="relogio">Em aprovação no WhatsApp</Selo>;
  return <Selo tipo="implant" icone="lapis">Rascunho</Selo>;
}

function Folha({ id, titulo, sub, sobre, children, acoes }: { id: string; titulo: ReactNode; sub?: ReactNode; sobre?: string; children: ReactNode; acoes?: ReactNode }) {
  return (
    <section className="folha" aria-labelledby={id} style={{ overflow: "hidden" }}>
      <div className="folha-cab">
        <div>
          {sobre ? <p className="sobretitulo">{sobre}</p> : null}
          <h2 id={id}>{titulo}</h2>
          {sub ? <p className="sub">{sub}</p> : null}
        </div>
        {acoes}
      </div>
      {children}
    </section>
  );
}

function Limites({ dono, semAvisos, curto }: { dono: string; semAvisos: number | null; curto?: boolean }) {
  return (
    <Folha id="t-lim" titulo="Limites que valem sempre" sub={curto ? "Para todas as automações" : "Fixos no T3jus; o escritório não afrouxa"}>
      <ul className="au-lim">
        <li><Icone nome="relogio" className="ico" /><span><b>8h às 20h, em dia útil.</b><small>Fora disso, a mensagem espera o próximo horário. Feriado nacional conta como dia sem envio.</small></span></li>
        <li><Icone nome="moeda" className="ico" /><span><b>1 cobrança por semana por parcela</b>, somando todas.<small>Sem expor nem constranger o cliente (CDC, art. 42).</small></span></li>
        <li><Icone nome="cadeado" className="ico" /><span><b>Quem pediu para não receber avisos fica de fora.</b>{semAvisos !== null ? <small>{semAvisos === 0 ? "Nenhum cliente pediu, por enquanto." : `${semAvisos} ${semAvisos === 1 ? "cliente hoje" : "clientes hoje"}.`} O pedido fica na ficha.</small> : null}</span></li>
        <li><Icone nome="whats" className="ico" /><span><b>Só sai texto aprovado</b> por {primeiro(dono) || "a sócia dona"} e pela Meta.<small>Quem aprova o texto é a sócia dona.</small></span></li>
        <li><Icone nome="pessoas" className="ico" /><span><b>Toda passagem tem responsável.</b><small>Pessoa ativa ou regra: quem cuida, a área, a sócia dona.</small></span></li>
      </ul>
    </Folha>
  );
}

// ------------------------------------------------------------------------------- lista

function SeteDias({ a }: { a: LinhaAutomacao }) {
  if (a.situacao === "RASCUNHO" || (!a.seteDias.enviadas && !a.seteDias.falhas && !a.versaoLigada)) return <div className="au-7d" style={{ color: "var(--texto-2)" }}>Ainda não saiu</div>;
  return (
    <div className="au-7d">
      <b>{a.seteDias.enviadas}</b> {a.seteDias.enviadas === 1 ? "enviada" : "enviadas"}<br />
      {a.seteDias.falhas ? <span className="falha"><Icone nome="alerta" className="ico" />{a.seteDias.falhas} {a.seteDias.falhas === 1 ? "falha" : "falhas"}</span> : <small style={{ color: "var(--texto-2)" }}>sem falha</small>}
    </div>
  );
}

function SubSituacao({ a, whats }: { a: LinhaAutomacao; whats: boolean }) {
  if (a.situacao === "DESLIGADA" && a.desligada) return <small>Motivo: “{a.desligada.motivo}”</small>;
  if (a.situacao === "EM_APROVACAO" && a.aguardando) return <small>Enviada à Meta {quando(a.aguardando.desde)}{a.versaoLigada ? ` · a versão ${a.versaoLigada} segue valendo` : ""}</small>;
  if (a.situacao === "RASCUNHO") {
    const falta = [a.erros ? `${a.erros} ${a.erros === 1 ? "ajuste" : "ajustes"}` : null, a.textosPorAprovar ? `${a.textosPorAprovar} ${a.textosPorAprovar === 1 ? "texto" : "textos"} por aprovar` : null].filter(Boolean);
    return <small>{falta.length ? `Falta: ${falta.join(" e ")}` : "Pronta para testar e ligar"}</small>;
  }
  if (a.rascunhoMudou) return <small>Mudanças no rascunho, ainda não ligadas</small>;
  if (!whats) return <small>Espera o WhatsApp do escritório</small>;
  return null;
}

function TabelaAutomacoes({ criadas, prontas, pessoas, whats }: { criadas: LinhaAutomacao[]; prontas: LinhaAutomacao[]; pessoas: { id: string; nome: string }[]; whats: boolean }) {
  const linha = (a: LinhaAutomacao) => (
    <tr key={a.id} className={a.situacao === "RASCUNHO" ? "au-rasc" : undefined}>
      <td><div className="au-nome"><Icone nome={ic(a.origem === "PRONTA" ? GATILHOS[a.gatilho].icone : "fluxo")} className="ico" /><div><a href={hrefAutomacao({ a: a.id })}>{a.nome}</a><small>{quandoSai(a.gatilho, a.fluxo, pessoas)}</small></div></div></td>
      <td><div className="au-sit"><SeloSituacao a={a} /><SubSituacao a={a} whats={whats} /></div></td>
      <td><SeteDias a={a} /></td>
      <td><p className="au-quem"><b>{a.atualizadaPor?.nome ?? "T3jus"}</b><br />{quando(a.atualizadaEm)}</p></td>
    </tr>
  );
  const cartao = (a: LinhaAutomacao) => (
    <li key={a.id} className="cartao" style={a.situacao === "RASCUNHO" ? { boxShadow: "inset 3px 0 0 var(--ambar)" } : undefined}>
      <div className="au-nome"><Icone nome={ic(a.origem === "PRONTA" ? GATILHOS[a.gatilho].icone : "fluxo")} className="ico" /><div><a href={hrefAutomacao({ a: a.id })}>{a.nome}</a><small>{quandoSai(a.gatilho, a.fluxo, pessoas)}</small></div></div>
      <div className="au-sit"><SeloSituacao a={a} /><SubSituacao a={a} whats={whats} /></div>
      <dl className="c-dados"><dt>Últimos 7 dias</dt><dd>{a.situacao === "RASCUNHO" ? "Ainda não saiu" : `${a.seteDias.enviadas} enviadas${a.seteDias.falhas ? `, ${a.seteDias.falhas} falha` : ""}`}</dd>
        <dt>Mexeu por último</dt><dd>{a.atualizadaPor?.nome ?? "T3jus"}, {quando(a.atualizadaEm)}</dd></dl>
    </li>
  );
  return (
    <>
      <table className="so-pc au-tab cv-tab">
        <caption className="sr">Automações do escritório</caption>
        <colgroup><col style={{ width: "38%" }} /><col style={{ width: "25%" }} /><col style={{ width: "17%" }} /><col style={{ width: "20%" }} /></colgroup>
        <thead><tr><th scope="col">Automação e quando sai</th><th scope="col">Situação</th><th scope="col">Últimos 7 dias</th><th scope="col">Mexeu por último</th></tr></thead>
        {criadas.length ? <tbody><tr><th colSpan={4} scope="rowgroup">Criadas pelo escritório<small>{criadas.length}</small></th></tr>{criadas.map(linha)}</tbody> : null}
        {prontas.length ? <tbody><tr><th colSpan={4} scope="rowgroup">Prontas do T3jus<small>{prontas.length} · vieram dos avisos automáticos</small></th></tr>{prontas.map(linha)}</tbody> : null}
      </table>
      {criadas.length ? <><p className="au-sub3 so-cel">Criadas pelo escritório · {criadas.length}</p><ul className="cartoes so-cel" aria-label="Criadas pelo escritório">{criadas.map(cartao)}</ul></> : null}
      {prontas.length ? <><p className="au-sub3 so-cel">Prontas do T3jus · {prontas.length}</p><ul className="cartoes so-cel" aria-label="Prontas do T3jus">{prontas.map(cartao)}</ul></> : null}
    </>
  );
}

const EXEMPLOS = [
  "Quero cobrar com educação quem atrasar a parcela, e se não pagar em 5 dias passa para a pessoa do Financeiro.",
  "Agradeça quando o pagamento de uma parcela for registrado, e se o cliente responder deixe a IA conversar.",
  "Lembre o cliente da audiência 1 dia antes e 2 horas antes; se não responder, passe para quem cuida do caso.",
];

/** O que deu errado ao pedir à IA, em palavras simples (F3.59). */
function falhaDaIa(e: ErroApi): { titulo: string; texto: string } {
  if (e.codigo === "UPSTREAM_UNAVAILABLE") return { titulo: "A IA não respondeu agora", texto: "Nada foi salvo. Tente de novo em instantes ou monte do zero." };
  if (e.detalhes?.motivo === "NAO_ENTENDEU") return { titulo: "A IA não conseguiu montar com esse pedido", texto: String(e.detalhes.porque ?? "Diga quando começa, o que dizer e para quem passa.") };
  if (e.detalhes?.motivo === "PRONTA") return { titulo: "As prontas do T3jus não passam pela IA", texto: "Mude os passos aqui mesmo, ou peça à IA uma automação nova." };
  return { titulo: "Nada foi salvo", texto: textoDoErro(e) };
}

function JanelaPedir({ aberta, inicial, aoFechar, aoMontar, aoCriada }: {
  aberta: boolean; inicial: string; aoFechar: () => void; aoMontar: () => void; aoCriada: (id: string) => void;
}) {
  const [texto, setTexto] = useState(inicial);
  const [enviando, setEnviando] = useState(false);
  const [erroCampo, setErroCampo] = useState<string | null>(null);
  const [falha, setFalha] = useState<{ titulo: string; texto: string; fora: boolean } | null>(null);
  async function pedir() {
    if (enviando) return;
    if (texto.trim().length < 3) { setErroCampo("Escreva o que você quer que aconteça."); return; }
    setErroCampo(null);
    setFalha(null);
    setEnviando(true);
    const r = await chamarPortal<PaginaAutomacao>("/v1/escritorio/automacoes/ia", { corpo: { pedido: texto.trim() } });
    setEnviando(false);
    if (r.ok) { aoCriada(r.dados.id); return; }
    setFalha({ ...falhaDaIa(r.erro), fora: r.erro.codigo === "UPSTREAM_UNAVAILABLE" });
  }
  return (
    <Janela id="janela-pedir" aberta={aberta} aoFechar={aoFechar} sobretitulo="Automações" titulo="Pedir à IA" descricao="janela-pedir-d"
      aoEnviar={() => void pedir()}
      pe={<>
        {falha?.fora ? <button className="btn btn-fantasma" type="button" onClick={aoMontar}><Icone nome="mais" className="ico" />Montar do zero</button>
          : <button className="btn btn-fantasma" type="button" onClick={aoFechar}>Cancelar</button>}
        <button className="btn btn-pri" type="submit" disabled={enviando} aria-busy={enviando || undefined}>
          <Icone nome="ia" className="ico" />{enviando ? "A IA está montando…" : falha ? "Pedir de novo" : "Pedir sugestão"}
        </button></>}>
      <p id="janela-pedir-d" className="ajuda">Escreva como falaria com alguém da equipe.</p>
      <div aria-live="polite">
        {falha ? <Aviso tom="atencao" icone="ia" titulo={falha.titulo}>{falha.texto}</Aviso> : null}
        {enviando ? <p className="ajuda">A IA está montando o desenho. Costuma levar alguns segundos.</p> : null}
      </div>
      <div className="campo">
        <label htmlFor="pd-txt">O que você quer que aconteça</label>
        <textarea className="entrada" id="pd-txt" data-foco value={texto} maxLength={600} onChange={(e) => setTexto(e.target.value)}
          aria-describedby={descritoPor("pd-aj", erroCampo ? "pd-er" : null)} aria-invalid={erroCampo ? true : undefined} style={{ minHeight: 110 }} />
        <p className="ajuda" id="pd-aj">Diga quando começa, o que dizer e para quem passa. A IA usa as áreas, a equipe e os modelos do escritório.</p>
        {erroCampo ? <ErroCampo id="pd-er">{erroCampo}</ErroCampo> : null}
      </div>
      <div className="campo" role="group" aria-labelledby="pd-ex">
        <p className="au-rot-p" id="pd-ex">Ou comece por um exemplo</p>
        <div className="au-chips">
          {[["Agradecer o pagamento", EXEMPLOS[1]!],
            ["Lembrete de audiência", EXEMPLOS[2]!],
            ["Cobrança gentil de parcela", EXEMPLOS[0]!]].map(([t, pedido]) => (
            <button key={t} type="button" onClick={() => setTexto(pedido!)}>{t}</button>
          ))}
        </div>
      </div>
      <p className="pt-comuns"><Icone nome="escudo" className="ico" /><span>A IA monta um rascunho com os passos tracejados. Nada é salvo antes de você aplicar, e nada sai antes de você testar e ligar.</span></p>
    </Janela>
  );
}

// A frase curta de cada gatilho na escolha (desenho de PA-06, estado gn-escolher).
const RESUMO_GATILHO: Record<Gatilho, string> = {
  CLIENTE_NOVO: "Quando aceita a primeira proposta ou assina o primeiro contrato. Para a boas-vindas.",
  DOCUMENTO_PENDENTE: "Quando um documento pedido ao cliente não chega em alguns dias. Para lembrar do que falta.",
  ETAPA_CASO: "Quando a etapa muda e tem texto para o cliente.",
  LEMBRETE_AUDIENCIA: "1 dia antes de audiência, reunião ou perícia com o cliente.",
  PARCELA_ATRASO: "Parcela sem pagamento alguns dias depois do vencimento.",
  PARCELA_VAI_VENCER: "Alguns dias antes do vencimento.",
  PAGAMENTO_RECEBIDO: "Quando o Financeiro registra o recebimento.",
  PRESTACAO_CONTAS: "Quando o repasse ao cliente é registrado.",
};

function JanelaNova({ aberta, areas, aoFechar, aoCriada }: { aberta: boolean; areas: string[]; aoFechar: () => void; aoCriada: (id: string) => void }) {
  const gatilhos = ORDEM_GATILHOS.filter((g) => podeMontarGatilho(g, areas));
  const grupos = (["CONVERSAS", "JURIDICO", "FINANCEIRO"] as AreaAutomacao[])
    .map((a) => ({ a, gs: gatilhos.filter((g) => GATILHOS[g].area === a) })).filter((x) => x.gs.length);
  const [nome, setNome] = useState("");
  const [gatilho, setGatilho] = useState<Gatilho | null>(null);
  const [erros, setErros] = useState<string[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  async function criar() {
    const f = [...(nome.trim().length < 3 ? ["nome"] : []), ...(gatilho ? [] : ["gatilho"])];
    setErros(f);
    if (f.length) return;
    setEnviando(true);
    const r = await chamarPortal<PaginaAutomacao>("/v1/escritorio/automacoes", { corpo: { nome: nome.trim(), gatilho } });
    setEnviando(false);
    if (!r.ok) { setErro(textoDoErro(r.erro)); return; }
    aoCriada(r.dados.id);
  }
  return (
    <Janela id="janela-nova" aberta={aberta} aoFechar={aoFechar} sobretitulo="Automações" titulo="Nova automação" descricao="janela-nova-d" aoEnviar={() => void criar()}
      pe={<><button className="btn btn-fantasma" type="button" onClick={aoFechar}>Cancelar</button>
        <button className="btn btn-pri" type="submit" disabled={enviando}><Icone nome="mais" className="ico" />Criar o rascunho</button></>}>
      <p id="janela-nova-d" className="ajuda">Começa em rascunho, com o gatilho, uma mensagem para escrever e o fim. Nada sai antes de testar e a sócia dona ligar.</p>
      {erro ? <Aviso tom="urgencia" titulo="Não deu para criar">{erro}</Aviso> : null}
      <div className="campo">
        <label htmlFor="nv-nome">Nome</label>
        <input className="entrada" id="nv-nome" data-foco value={nome} maxLength={80} onChange={(e) => setNome(e.target.value)}
          aria-invalid={erros.includes("nome") || undefined} aria-describedby={descritoPor("nv-nome-aj", erros.includes("nome") && "nv-nome-er")} />
        <p className="ajuda" id="nv-nome-aj">Só a equipe vê. Ex.: “Cobrança gentil de parcela em atraso”.</p>
        {erros.includes("nome") ? <ErroCampo id="nv-nome-er">Dê um nome de 3 a 80 letras.</ErroCampo> : null}
      </div>
      <fieldset className="campo" aria-describedby={descritoPor(erros.includes("gatilho") && "nv-g-er")}>
        <legend>Quando começa</legend>
        <div className="gn-tipos">
          {grupos.map(({ a, gs }) => (
            <fieldset key={a}>
              <legend>{AREA_DO_GATILHO[a]}{a === "CONVERSAS" ? " · todos da equipe veem" : ""}</legend>
              <ul>
                {gs.map((g) => (
                  <li key={g} className={GATILHOS[g].novo ? "gn-novo-l" : undefined}>
                    <label>
                      <input className="marcar" type="radio" name="nv-g" checked={gatilho === g} onChange={() => setGatilho(g)} />
                      <span className="au-ic"><Icone nome={ic(GATILHOS[g].icone)} className="ico" /></span>
                      <span><b>{GATILHOS[g].nome}{GATILHOS[g].novo ? <span className="gn-novo">Novo</span> : null}</b><small>{RESUMO_GATILHO[g]}</small></span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          ))}
        </div>
        {erros.includes("gatilho") ? <ErroCampo id="nv-g-er">Escolha quando a automação começa.</ErroCampo> : null}
      </fieldset>
    </Janela>
  );
}

function Lista({ l, aoAbrir }: { l: ListaAutomacoes; aoAbrir: (id: string) => void }) {
  const [janela, setJanela] = useState<"pedir" | "nova" | null>(null);
  const [pedido, setPedido] = useState("");
  const whats = l.whatsapp.situacao === "LIGADO" || l.whatsapp.situacao === "EM_ANALISE";
  const criadas = l.automacoes.filter((a) => a.origem === "ESCRITORIO");
  const prontas = l.automacoes.filter((a) => a.origem === "PRONTA");
  const pessoas = l.pessoas ?? [];
  const podeMontar = l.areas.includes("FINANCEIRO") || l.areas.includes("JURIDICO");
  const pedir = (t = "") => { setPedido(t); setJanela("pedir"); };
  const n = (s: string) => l.automacoes.filter((a) => a.situacao === s).length;
  const falhas = l.automacoes.reduce((x, a) => x + a.seteDias.falhas, 0);
  const acoes = podeMontar ? (
    <div className="au-acoes-cab">
      <button className="btn btn-sec" type="button" onClick={() => setJanela("nova")}><Icone nome="mais" className="ico" />Nova automação</button>
      <button className="btn btn-pri" type="button" onClick={() => pedir()}><Icone nome="ia" className="ico" />Pedir à IA</button>
    </div>
  ) : null;
  const janelas = (
    <>
      {janela === "pedir" ? <JanelaPedir aberta inicial={pedido} aoFechar={() => setJanela(null)} aoMontar={() => setJanela("nova")} aoCriada={aoAbrir} /> : null}
      {janela === "nova" ? <JanelaNova aberta areas={l.areas} aoFechar={() => setJanela(null)} aoCriada={aoAbrir} /> : null}
    </>
  );

  if (!whats && !criadas.length) {
    return (
      <div className="au">
        <div className="cv-nc">
          <div className="cv-col">
            <div className="estado" role="status">
              <span className="icone-estado"><Icone nome="whats" className="ico" /></span>
              <h2 style={{ fontSize: 26 }}>Automações precisam do WhatsApp ligado</h2>
              <p style={{ maxWidth: "60ch" }}>O WhatsApp do escritório ainda não está ligado. Você já pode montar e testar; ligar fica para depois que o número estiver pronto.</p>
              <ol className="cv-passos">
                <li><span className="disco"><span>1</span></span><span><b>Monte e teste à vontade.</b><small>O desenho e a simulação funcionam sem o WhatsApp: nada é enviado no teste.</small></span></li>
                <li><span className="disco"><span>2</span></span><span><b>Ligue o número do escritório.</b><small>{l.dono ? "Em Escritório › WhatsApp e IA, ou com a equipe T3jus." : `Quem liga é ${l.quemCuida?.nome ?? "a sócia dona"}.`}</small></span></li>
                <li><span className="disco"><span>3</span></span><span><b>Depois, ligue as automações.</b><small>Cada texto novo passa pela aprovação do WhatsApp antes de sair.</small></span></li>
              </ol>
              <div className="acoes">
                {l.dono ? <a className="btn btn-pri" href={ROTAS_ESCRITORIO.whatsapp}><Icone nome="whats" className="ico" />Ligar o WhatsApp</a> : null}
                {podeMontar ? <button className="btn btn-sec" type="button" onClick={() => setJanela("nova")}><Icone nome="mais" className="ico" />Montar mesmo assim</button> : null}
              </div>
            </div>
          </div>
          <aside className="cv-col" aria-label="Prontas">
            <Folha id="t-enq" titulo={prontas.length === 1 ? "A pronta espera" : `As ${prontas.length} prontas esperam`} sub="Ligadas assim que o número estiver pronto">
              <ul className="cv-lista-x">
                {prontas.map((a) => <li key={a.id}><Icone nome={ic(GATILHOS[a.gatilho].icone)} className="ico" /><span><a href={hrefAutomacao({ a: a.id })}><b>{a.nome}</b></a> · {quandoSai(a.gatilho, a.fluxo, pessoas)}</span></li>)}
              </ul>
            </Folha>
          </aside>
        </div>
        {janelas}
      </div>
    );
  }

  return (
    <div className="au">
      <div className="pt-cab">
        <div>
          <p className="sobretitulo">Pelo WhatsApp do escritório</p>
          <h1>Automações</h1>
          <span className="fio" aria-hidden="true" />
          <p className="lede">Mensagens que saem sozinhas, montadas em passos: quando sai, o texto, quanto esperar e para quem passa. Quem tem a área monta e testa; {l.quemCuida ? primeiro(l.quemCuida.nome) : "a sócia dona"} aprova o texto e liga.</p>
        </div>
        {acoes}
      </div>
      {!whats ? <Aviso tom="atencao" icone="whats" titulo="O WhatsApp do escritório ainda não está ligado">Monte e teste à vontade; ligar fica para depois que o número estiver pronto.</Aviso> : null}
      <div className="au-grade">
        <div className="au-col">
          <section className="folha" aria-labelledby="t-au" style={{ overflow: "hidden" }}>
            <div className="folha-cab"><div><h2 id="t-au">Automações</h2><p className="sub">{criadas.length ? "Ligada, desligada, rascunho ou em aprovação no WhatsApp" : "Só as prontas, por enquanto"}</p></div></div>
            {criadas.length ? (
              <div className="au-num">
                <div><span className="disco"><span>{n("LIGADA")}</span></span>{n("LIGADA") === 1 ? "ligada" : "ligadas"}</div>
                <div><span className="disco"><span>{n("EM_APROVACAO")}</span></span>em aprovação</div>
                <div><span className="disco"><span>{n("RASCUNHO")}</span></span>{n("RASCUNHO") === 1 ? "rascunho" : "rascunhos"}</div>
                <div><span className={`disco${falhas ? " urg" : ""}`}><span>{falhas}</span></span>{falhas === 1 ? "falha" : "falhas"} em 7 dias</div>
              </div>
            ) : podeMontar ? (
              <div className="au-vazio">
                <Estado icone="fluxo" titulo="Nenhuma automação criada ainda"
                  acoes={<><button className="btn btn-pri" type="button" onClick={() => pedir()}><Icone nome="ia" className="ico" />Pedir à IA</button>
                    <button className="btn btn-sec" type="button" onClick={() => setJanela("nova")}><Icone nome="mais" className="ico" />Montar do zero</button></>}>
                  As prontas abaixo já cobrem os avisos de sempre. Para algo do jeito do escritório, monte em passos: gatilho, mensagem, espera, caminhos e para quem passa.
                </Estado>
                <ul className="au-ex" aria-label="Exemplos de pedido">
                  {EXEMPLOS.map((t) => <li key={t}><button type="button" onClick={() => pedir(t)}><Icone nome="ia" className="ico" />“{t}”</button></li>)}
                </ul>
              </div>
            ) : null}
            {l.automacoes.length ? <TabelaAutomacoes criadas={criadas} prontas={prontas} pessoas={pessoas} whats={whats} /> : (
              <div className="au-vazio"><Estado icone="cadeado" titulo="Nenhuma automação para você">As automações aparecem para quem tem a área do gatilho (Financeiro ou Jurídico).</Estado></div>
            )}
          </section>
        </div>
        <aside className="au-col" aria-label="Limites">
          <Limites dono={l.quemCuida?.nome ?? ""} semAvisos={l.semAvisos} curto />
          <Folha id="t-reg" titulo="O que já saiu">
            <div className="cv-prev">
              <p style={{ fontSize: 13, lineHeight: 1.5 }}>Cada mensagem enviada fica em Avisos automáticos, com a situação de entrega e o que a disparou.</p>
              <a className="ver" href={ROTAS_CONVERSAS.avisos}>Abrir Avisos automáticos<Icone nome="dir" className="ico ico-s" /></a>
            </div>
          </Folha>
        </aside>
      </div>
      {janelas}
    </div>
  );
}

// ------------------------------------------------------------------------------- desenho

interface CtxDesenho {
  p: PaginaAutomacao;
  numeros: Map<string, number>;
  erros: Map<string, ErroFluxo[]>;
  sel: string | null;
  podeMudar: boolean;
  aoAdicionar: (onde: { ramos?: string; quando?: Quando }) => void;
  /** F3.59: o que a IA sugeriu e ainda não está no rascunho (tracejado). */
  tracejados: Set<string>;
  mudando: boolean;
  aoDecidir: (acao: "aplicar" | "recusar", id: string) => void;
}

function textoDaMensagem(p: PaginaAutomacao, m: PassoMensagem): string {
  if (typeof m.texto === "string") return m.texto;
  if (m.modeloId) return p.modelos[m.modeloId]?.texto ?? "";
  if (m.aviso) return p.aviso?.texto ?? "";
  return "";
}

function SobreTexto({ p, m }: { p: PaginaAutomacao; m: PassoMensagem }) {
  if (m.aviso) return <>Texto do aviso pronto, ajustado em Escritório › WhatsApp e IA.</>;
  if (m.modeloId) {
    const mod = p.modelos[m.modeloId];
    const meta = { NAO_ENVIADO: "ainda não foi à Meta", EM_ANALISE: "em aprovação no WhatsApp", APROVADO: "aprovado pela Meta", RECUSADO: "recusado pela Meta" }[mod?.metaSituacao ?? "NAO_ENVIADO"];
    return <>Aprovado por {primeiro(mod?.aprovadoPor?.nome)} · {meta}.</>;
  }
  return <>Rascunho, falta a sócia dona aprovar.</>;
}

function Bloco({ ctx, passo }: { ctx: CtxDesenho; passo: Passo }) {
  const { p } = ctx;
  const g = p.gatilho;
  const num = ctx.numeros.get(passo.id) ?? 0;
  const tipo = TIPOS_PASSO[passo.tipo];
  const erros = ctx.erros.get(passo.id)?.filter((e) => !e.ramo) ?? [];
  const sel = ctx.sel === passo.id;
  const voce = passo.tipo === "PESSOA" && passo.pessoaId === p.eu;
  const sug = ctx.tracejados.has(passo.id);
  const cls = { GATILHO: "gatilho", CONDICOES: "condicao", MENSAGEM: "mensagem", ESPERA: "espera", RAMOS: "ramo", IA: "ia", PESSOA: "pessoa", FIM: "fim" }[passo.tipo];
  let titulo: ReactNode = tipo.nome;
  let corpo: ReactNode = null;
  switch (passo.tipo) {
    case "GATILHO":
      titulo = GATILHOS[g].titulo(passo.dias ?? null);
      corpo = <p className="au-det">{g === "CLIENTE_NOVO" ? `Conta: ${CONTA_CLIENTE_NOVO[passo.conta ?? "FECHOU"].nome.toLowerCase()}. Importados da planilha e reativados nunca recebem.` : GATILHOS[g].de}</p>;
      break;
    case "CONDICOES":
      titulo = "Só quem pode receber";
      corpo = (
        <ul className="au-cond">
          {passo.semCombinado ? <li><Icone nome="check" className="ico" /><span>Parcela sem combinado de pagamento no Financeiro</span></li> : null}
          <li><Icone nome="check" className="ico" /><span>Contato principal tem WhatsApp</span></li>
          <li><Icone nome="cadeado" className="ico" /><span>Quem pediu para não receber avisos fica de fora (regra fixa)</span></li>
        </ul>
      );
      break;
    case "MENSAGEM": {
      titulo = passo.nome;
      const t = textoDaMensagem(p, passo);
      corpo = (
        <>
          {t ? <p className="au-cita">“{t.length > 118 ? `${t.slice(0, 118)}…` : t}”</p> : null}
          <p className="au-det"><b>Texto:</b> <SobreTexto p={p} m={passo} /> Sai das 8h às 20h, em dia útil.</p>
        </>
      );
      break;
    }
    case "ESPERA":
      titulo = passo.horasAntes ? `Esperar até ${passo.horasAntes} ${passo.horasAntes === 1 ? "hora" : "horas"} antes` : `Esperar até ${passo.dias} ${passo.dias === 1 ? "dia" : "dias"}`;
      corpo = <p className="au-det">{passo.horasAntes ? "Conta a partir da hora do compromisso." : "Segue antes se o cliente pagar ou responder. A espera conta dias corridos."}</p>;
      break;
    case "RAMOS":
      titulo = g.startsWith("PARCELA") ? "O que o cliente fez?" : "O cliente respondeu?";
      corpo = <p className="au-det">{passo.ramos.length} caminhos. Cada um termina em fim ou numa pessoa.</p>;
      break;
    case "IA":
      titulo = "A IA conversa com o cliente";
      corpo = <p className="au-det">Só com o que está no T3jus. Acordo, desconto ou reclamação vão para uma pessoa da equipe.</p>;
      break;
    case "PESSOA": {
      const quem = quemRecebe(passo, p.pessoas, g);
      titulo = passo.pessoaId || passo.regra ? `Passar para ${quem}` : "Passar para: ninguém escolhido";
      corpo = (
        <p className="au-det">
          {passo.motivo ? <>Motivo: {passo.motivo}. </> : null}
          {passo.pessoaId ? `Se ${primeiro(quem)} estiver fora ou sair da equipe, vai para quem tem a área; sem ninguém, para a sócia dona.` : null}
        </p>
      );
      break;
    }
    case "FIM":
      break;
  }
  const id = `b-${passo.id}`;
  return (
    <article className={`au-b t-${cls}${sug ? " sug" : ""}${erros.length ? " erro" : ""}${sel ? " sel" : ""}${voce ? " eu" : ""}`} id={id} aria-labelledby={`${id}-t`} aria-current={sel || undefined} tabIndex={-1}>
      <div className="au-b-cab">
        <span className="au-ic"><Icone nome={ic(tipo.icone)} className="ico" /></span>
        <p className="au-tipo">{num} · {tipo.nome}</p>
        {voce ? <span className="au-voce"><Icone nome="pessoas" className="ico ico-s" />Você</span> : null}
        {erros.length ? <Selo tipo="urgente" icone="alerta">Precisa de ajuste</Selo> : sug ? <Selo tipo="implant" icone="ia">Sugerido pela IA</Selo> : null}
        {sug ? null : (
          <a className="au-ed" href={hrefAutomacao({ a: p.id, b: passo.id })} aria-label={`${ctx.podeMudar ? "Editar" : "Ver"} o passo ${num}, ${tipo.nome}`}>
            <Icone nome={ctx.podeMudar ? "lapis" : "olho"} className="ico" />
          </a>
        )}
      </div>
      <h3 id={`${id}-t`}>{sug ? <span className="sr">Sugerido pela IA, ainda não salvo. </span> : null}{titulo}</h3>
      {corpo}
      {erros.map((e, i) => <p key={i} className="au-err" id={`${id}-er${i}`}><Icone nome="alerta" className="ico" /><span>{textoDoErroFluxo(e, g)}</span></p>)}
      {sug && ctx.podeMudar ? (
        <div className="au-b-acoes">
          <button className="btn btn-pri" type="button" disabled={ctx.mudando} onClick={() => ctx.aoDecidir("aplicar", passo.id)}><Icone nome="check" className="ico" />Aplicar<span className="sr"> o passo {num}, {tipo.nome}</span></button>
          <button className="btn btn-sec" type="button" disabled={ctx.mudando} onClick={() => ctx.aoDecidir("recusar", passo.id)}><Icone nome="xis" className="ico" />Recusar<span className="sr"> o passo {num}, {tipo.nome}</span></button>
        </div>
      ) : null}
    </article>
  );
}

function Sequencia({ ctx, passos, rotulo }: { ctx: CtxDesenho; passos: Passo[]; rotulo?: string }) {
  return (
    <ol className="au-fluxo" aria-label={rotulo}>
      {passos.map((s) => {
        const sug = ctx.tracejados.has(s.id);
        const temSug = ctx.tracejados.size > 0;
        if (s.tipo === "FIM") {
          return (
            <li key={s.id} className={`au-li-fim${sug ? " sug" : ""}`}>
              {sug ? (
                <span className="au-fim" id={`b-${s.id}`}><Icone nome="encerrar" className="ico" /><span className="sr">Sugerido pela IA: </span>{s.texto || "Fim"}</span>
              ) : (
                <a className="au-fim" id={`b-${s.id}`} href={hrefAutomacao({ a: ctx.p.id, b: s.id })} aria-current={ctx.sel === s.id || undefined}>
                  <Icone nome="encerrar" className="ico" />{s.texto || "Fim"}
                </a>
              )}
            </li>
          );
        }
        if (s.tipo === "RAMOS") {
          return (
            <li key={s.id} className={`au-li-ramo${sug ? " sug" : ""}`}>
              <Bloco ctx={ctx} passo={s} />
              <ul className={`au-ramos${sug ? " sug" : ""}`} aria-label={`Caminhos depois do passo ${ctx.numeros.get(s.id)}`}>
                {s.ramos.map((r) => (
                  <li key={r.quando}>
                    <span className="au-rot"><Icone nome={ic(r.quando === "PAGOU" ? "moeda" : r.quando === "CHEGOU" ? "doc" : r.quando === "RESPONDEU" ? "conversas" : "relogio")} className="ico" />{nomeDoRamo(r.quando, ctx.p.gatilho)}</span>
                    {r.passos.length ? <Sequencia ctx={ctx} passos={r.passos} /> : (
                      <ol className="au-fluxo">
                        <li>
                          <div className="au-falta" id={`b-${s.id}-${r.quando}`} role="group" aria-labelledby={`b-${s.id}-${r.quando}-t`} tabIndex={-1}>
                            <p id={`b-${s.id}-${r.quando}-t`}><Icone nome="alerta" className="ico ico-s" /> Este caminho não leva a nenhum passo. Quem cair aqui ficaria sem ninguém.</p>
                            {ctx.podeMudar && !temSug ? <button className="btn btn-sec so-pc" type="button" onClick={() => ctx.aoAdicionar({ ramos: s.id, quando: r.quando })}><Icone nome="mais" className="ico" />Adicionar passo</button> : null}
                          </div>
                        </li>
                      </ol>
                    )}
                    {r.passos.length > 0 && ctx.podeMudar && !temSug && r.passos.at(-1)?.tipo !== "PESSOA" ? (
                      <button className="btn btn-fantasma so-pc" type="button" style={{ marginTop: 10 }} onClick={() => ctx.aoAdicionar({ ramos: s.id, quando: r.quando })}>
                        <Icone nome="mais" className="ico" />Passo neste caminho
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </li>
          );
        }
        return <li key={s.id} className={sug ? "sug" : undefined}><Bloco ctx={ctx} passo={s} /></li>;
      })}
    </ol>
  );
}

function numerar(f: Fluxo): Map<string, number> {
  const m = new Map<string, number>();
  let n = 0;
  const ir = (seq: Passo[]) => seq.forEach((p) => { if (p.tipo !== "FIM") m.set(p.id, ++n); if (p.tipo === "RAMOS") p.ramos.forEach((r) => ir(r.passos)); });
  ir(f.passos);
  return m;
}

function irParaBloco(id: string) {
  const b = document.getElementById(id);
  if (!b) return;
  b.scrollIntoView({ block: "center" });
  b.focus({ preventScroll: true });
}

// ------------------------------------------------------------------------------- editar o passo

function JanelaAdicionar({ g, onde, aoFechar, aoEscolher }: { g: Gatilho; onde: { ramos?: string; quando?: Quando }; aoFechar: () => void; aoEscolher: (t: TipoPasso) => void }) {
  const tipos = PASSOS_ADICIONAVEIS.filter((t) => (t !== "CONDICOES" || (g.startsWith("PARCELA") && !onde.ramos)) && (t !== "RAMOS" || !onde.ramos));
  const [tipo, setTipo] = useState<TipoPasso | null>(null);
  return (
    <Janela id="janela-add" aberta aoFechar={aoFechar} sobretitulo={onde.quando ? `Caminho “${nomeDoRamo(onde.quando, g)}”` : "Caminho principal"} titulo="Adicionar passo"
      descricao="janela-add-d" aoEnviar={() => tipo && aoEscolher(tipo)}
      pe={<><button className="btn btn-fantasma" type="button" onClick={aoFechar}>Cancelar</button>
        <button className="btn btn-pri" type="submit" disabled={!tipo}><Icone nome="mais" className="ico" />Adicionar</button></>}>
      <p id="janela-add-d" className="ajuda">O passo entra no fim do caminho, antes de quem termina. Fim, Ramos e Passar para pessoa terminam o caminho.</p>
      <fieldset className="campo">
        <legend>Tipo de passo</legend>
        <ul className="au-tipos">
          {tipos.map((t) => (
            <li key={t}>
              <label>
                <input className="marcar" type="radio" name="add-tipo" checked={tipo === t} onChange={() => setTipo(t)} data-foco={t === tipos[0] || undefined} />
                <span className="au-ic"><Icone nome={ic(TIPOS_PASSO[t].icone)} className="ico" /></span>
                <span>{TIPOS_PASSO[t].nome}<small>{TIPOS_PASSO[t].ajuda}</small></span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
    </Janela>
  );
}

const EXEMPLO_CAMPOS: Record<string, string> = {
  nome: "Sueli", parcela: "Mensalidade de novembro", valor: "R$ 1.800,00", vencimento: "15/11", "link de pagamento": "(link de pagamento)",
  caso: "Ação revisional", etapa: "Instrução", "texto da etapa": "a audiência foi marcada.", compromisso: "Audiência de conciliação",
  data: "25/11", hora: "14:00", local: "Fórum Central, sala 4", resumo: "o valor foi depositado na sua conta",
};

function EditarPasso({ p, passo, num, aoSalvar, mudando, falha }: {
  p: PaginaAutomacao; passo: Passo; num: number; mudando: boolean; falha: string | null;
  aoSalvar: (f: Fluxo, aprovar?: string) => void;
}) {
  const [d, setD] = useState<Passo>(passo);
  const txt = useRef<HTMLTextAreaElement>(null);
  const g = p.gatilho;
  const tipo = TIPOS_PASSO[passo.tipo];
  const ro = !podeMudarAutomacao(p);
  const erros = p.listaErros.filter((e) => e.passo === passo.id && !e.ramo);
  const salvar = (aprovar?: string) => aoSalvar(trocarPasso(p.rascunho, passo.id, d), aprovar);
  const nomeEscritorio = "o escritório";
  let campos: ReactNode = null;
  switch (d.tipo) {
    case "GATILHO":
      campos = (
        <>
          <p className="au-det">{GATILHOS[g].de}</p>
          {g === "CLIENTE_NOVO" && d.tipo === "GATILHO" ? (
            <fieldset className="campo">
              <legend>Quem conta como cliente novo</legend>
              {(["FECHOU", "CADASTRO"] as const).map((c) => (
                <label key={c} className="opcao"><input className="marcar" type="radio" name="bl-conta" disabled={ro} checked={(d.conta ?? "FECHOU") === c} onChange={() => setD({ ...d, conta: c })} />
                  <span>{CONTA_CLIENTE_NOVO[c].nome}<small>{CONTA_CLIENTE_NOVO[c].ajuda}</small></span></label>
              ))}
            </fieldset>
          ) : null}
          {g === "CLIENTE_NOVO" || g === "DOCUMENTO_PENDENTE" ? (
            <div className="campo">
              <p className="au-rot-p">Regras fixas</p>
              <ul className="gn-regras">
                {(g === "CLIENTE_NOVO"
                  ? ["Importados da planilha e clientes reativados nunca recebem.", "Uma boas-vindas por cliente, para sempre.", "Quem pediu para não receber avisos e quem não tem WhatsApp no contato principal ficam de fora."]
                  : ["Uma mensagem por cliente, com tudo o que falta.", "No máximo 1 lembrete de documento por semana por cliente, somando o “Pedir de novo”.", "Chegou ou o caso encerrou: sai na hora.", "O pedido de não receber só cobrança não tira o cliente deste lembrete."]
                ).map((t) => <li key={t}><Icone nome="cadeado" className="ico" /><span>{t} <small>Regra fixa.</small></span></li>)}
              </ul>
            </div>
          ) : null}
          {GATILHOS[g].dias ? (
            <div className="campo">
              <label htmlFor="bl-dias">{g === "PARCELA_ATRASO" ? "Dias de atraso" : g === "PARCELA_VAI_VENCER" ? "Dias antes do vencimento" : g === "CLIENTE_NOVO" ? "Dias depois de virar cliente (0 é no mesmo dia)" : "Dias sem chegar, contados do pedido ou do último “Pedir de novo”"}</label>
              <input className="entrada" id="bl-dias" type="number" inputMode="numeric" min={GATILHOS[g].dias.min} max={GATILHOS[g].dias.max} disabled={ro} data-foco
                value={d.dias ?? ""} onChange={(e) => setD({ ...d, dias: e.target.value === "" ? null : Number(e.target.value) })} aria-describedby="bl-dias-aj" />
              <p className="ajuda" id="bl-dias-aj">De {GATILHOS[g].dias.min} a {GATILHOS[g].dias.max}. O gatilho não muda depois de criar.</p>
            </div>
          ) : <p className="ajuda">Este gatilho não tem ajuste. Para outro gatilho, crie outra automação.</p>}
          <div className="campo">
            <p className="au-rot-p">Campos do texto</p>
            <div className="gn-cam">{GATILHOS[g].campos.map((c) => <code key={c} className="gn-campos-c">{`{${c}}`}</code>)}</div>
          </div>
        </>
      );
      break;
    case "CONDICOES":
      campos = (
        <>
          <label className="opcao">
            <input className="marcar" type="checkbox" checked={d.semCombinado} disabled={ro} data-foco onChange={(e) => setD({ ...d, semCombinado: e.target.checked })} />
            <span>Só parcela sem combinado de pagamento no Financeiro<small className="ajuda" style={{ display: "block" }}>Quem combinou outra data (próxima ação da cobrança) fica de fora até lá.</small></span>
          </label>
          <ul className="au-cond">
            <li><Icone nome="cadeado" className="ico" /><span>Contato principal com WhatsApp (regra fixa)</span></li>
            <li><Icone nome="cadeado" className="ico" /><span>Quem pediu para não receber avisos fica de fora (regra fixa)</span></li>
          </ul>
        </>
      );
      break;
    case "MENSAGEM": {
      const t = textoDaMensagem(p, d);
      const mod = d.modeloId ? p.modelos[d.modeloId] : null;
      const inserir = (c: string) => {
        const el = txt.current;
        const atual = d.texto ?? "";
        const i = el?.selectionStart ?? atual.length;
        const j = el?.selectionEnd ?? atual.length;
        const novo = `${atual.slice(0, i)}{${c}}${atual.slice(j)}`;
        setD({ ...d, texto: novo.slice(0, 1024) });
        void Promise.resolve().then(() => { el?.focus(); el?.setSelectionRange(i + c.length + 2, i + c.length + 2); });
      };
      campos = (
        <>
          <div className="campo">
            <label htmlFor="bl-nome">Nome da mensagem</label>
            <input className="entrada" id="bl-nome" value={d.nome} maxLength={80} disabled={ro} onChange={(e) => setD({ ...d, nome: e.target.value })} aria-describedby="bl-nome-aj" />
            <p className="ajuda" id="bl-nome-aj">Só a equipe vê. Aparece no histórico e em Avisos automáticos.</p>
          </div>
          {d.aviso ? (
            <>
              <p className="au-txt-fixo">{t}</p>
              <p className="ajuda">É o texto do aviso pronto. {p.dono ? <a href={`${ROTAS_ESCRITORIO.whatsapp}?aviso=${d.aviso}`}>Ajustar em Escritório › WhatsApp e IA</a> : "A sócia dona ajusta em Escritório › WhatsApp e IA."}</p>
            </>
          ) : d.modeloId ? (
            <>
              <p className="au-txt-fixo">{t}</p>
              <p className="ajuda">Aprovado por {mod?.aprovadoPor?.nome ?? "a sócia dona"} {mod ? quando(mod.aprovadoEm) : ""}. O texto aprovado fica fixo; só mudam os campos de cada cliente.</p>
              {mod?.metaSituacao === "RECUSADO" ? <Aviso tom="urgencia" titulo="A Meta recusou este texto">{mod.metaMotivo}</Aviso> : null}
              {!ro ? <button className="btn btn-sec" type="button" onClick={() => setD({ ...d, modeloId: null, texto: t })}><Icone nome="lapis" className="ico" />Escrever um texto novo</button> : null}
            </>
          ) : (
            <>
              <div className="pt-cuidado"><Icone nome="lapis" className="ico" /><span><b>Rascunho, ainda não vale.</b> Depois que a sócia dona aprovar, o texto fica fixo: só mudam os campos de cada cliente.</span></div>
              <div className="campo">
                <div className="campo-linha"><label htmlFor="bl-txt">Texto da mensagem</label><span className="contador" id="bl-cont">{(d.texto ?? "").length} de 1.024 caracteres</span></div>
                <textarea ref={txt} className="entrada" id="bl-txt" data-foco style={{ minHeight: 190 }} maxLength={1024} disabled={ro} value={d.texto ?? ""}
                  onChange={(e) => setD({ ...d, texto: e.target.value })} aria-invalid={erros.length ? true : undefined}
                  aria-describedby={descritoPor("bl-cont", "bl-aj", erros.length > 0 && "bl-er")} />
                <p className="ajuda" id="bl-aj">Os campos entre chaves são trocados pelo dado de cada cliente. Use linguagem simples, sem ameaça nem exposição (CDC, art. 42).</p>
                {erros.length ? <ErroCampo id="bl-er">{erros.map((e) => textoDoErroFluxo(e, g)).join(" ")}</ErroCampo> : null}
              </div>
              {!ro ? (
                <div className="campo" role="group" aria-labelledby="bl-cp">
                  <p className="au-rot-p" id="bl-cp">Inserir campo · os que este gatilho tem</p>
                  <div className="au-campos">{p.campos.map((c) => <button key={c} type="button" onClick={() => inserir(c)}>{`{${c}}`}</button>)}</div>
                </div>
              ) : null}
            </>
          )}
          {t ? (
            <div className="campo" role="group" aria-labelledby="bl-pv">
              <p className="au-rot-p" id="bl-pv">Prévia · como um cliente veria</p>
              <div className="au-wpp">
                <p className="b"><span className="de"><Icone nome="whats" className="ico" />{nomeEscritorio === "o escritório" ? "Escritório" : nomeEscritorio}</span>
                  {t.replace(/\{([^{}]{1,40})\}/g, (m, c: string) => (c === "nome do escritório" ? "Ribeiro & Matos" : EXEMPLO_CAMPOS[c] ?? m))}<time>10:00</time></p>
                <small>Prévia com dados de exemplo, nada foi enviado.</small>
              </div>
            </div>
          ) : null}
          {typeof d.texto === "string" ? (
            <Aviso tom="atencao" icone="relogio" titulo="Modelo novo do WhatsApp">
              O WhatsApp só deixa o escritório começar uma conversa com texto aprovado pela Meta. Ao ligar, este texto vai para aprovação (costuma levar até 1 dia) e a automação fica “Em aprovação no WhatsApp”. Mudar o texto depois pede nova aprovação.
            </Aviso>
          ) : null}
        </>
      );
      break;
    }
    case "ESPERA":
      campos = (
        <>
          {g === "LEMBRETE_AUDIENCIA" ? (
            <fieldset className="campo">
              <legend>Como conta</legend>
              <label className="opcao"><input className="marcar" type="radio" name="bl-un" disabled={ro} checked={!d.horasAntes} onChange={() => setD({ ...d, dias: 1, horasAntes: null })} /><span>Dias depois do passo anterior</span></label>
              <label className="opcao"><input className="marcar" type="radio" name="bl-un" disabled={ro} checked={!!d.horasAntes} onChange={() => setD({ ...d, dias: null, horasAntes: 2 })} /><span>Horas antes do compromisso</span></label>
            </fieldset>
          ) : null}
          <div className="campo">
            <label htmlFor="bl-esp">{d.horasAntes ? "Horas antes do compromisso" : "Dias"}</label>
            <input className="entrada" id="bl-esp" type="number" inputMode="numeric" min={1} max={d.horasAntes ? 48 : 30} disabled={ro} data-foco
              value={(d.horasAntes ?? d.dias) ?? ""} onChange={(e) => {
                const v = e.target.value === "" ? null : Number(e.target.value);
                setD(d.horasAntes ? { ...d, horasAntes: v } : { ...d, dias: v });
              }} aria-describedby="bl-esp-aj" />
            <p className="ajuda" id="bl-esp-aj">{d.horasAntes ? "De 1 a 48 horas." : "De 1 a 30 dias corridos. Se o cliente pagar ou responder antes, segue na hora."}</p>
          </div>
        </>
      );
      break;
    case "RAMOS":
      campos = (
        <fieldset className="campo">
          <legend>Caminhos</legend>
          {GATILHOS[g].ramos.map((q) => {
            const tem = d.ramos.some((r) => r.quando === q);
            const ok = !tem || d.ramos.length > 2;
            return (
              <label key={q} className="opcao">
                <input className="marcar" type="checkbox" checked={tem} disabled={ro || !ok} onChange={(e) => setD({
                  ...d, ramos: e.target.checked
                    ? GATILHOS[g].ramos.filter((x) => x === q || d.ramos.some((r) => r.quando === x)).map((x) => d.ramos.find((r) => r.quando === x) ?? { quando: x, passos: [] })
                    : d.ramos.filter((r) => r.quando !== q),
                })} />
                <span>{nomeDoRamo(q, g)}</span>
              </label>
            );
          })}
          <p className="ajuda">Pelo menos dois caminhos. Tirar um caminho tira os passos dele.</p>
        </fieldset>
      );
      break;
    case "IA":
      campos = <p className="au-det">A IA responde só com o que está no T3jus e com as respostas do escritório. Acordo, desconto, reclamação ou o que ela não souber passam para uma pessoa. Ela segue o que está em Escritório › WhatsApp e IA.</p>;
      break;
    case "PESSOA": {
      const pessoa = d as PassoPessoa;
      const modo = pessoa.pessoaId !== undefined && pessoa.pessoaId !== null ? "PESSOA" : pessoa.regra ?? "";
      campos = (
        <>
          <fieldset className="campo">
            <legend>Para quem passa</legend>
            {regrasDoGatilho(g).map(({ regra: r, nome }) => (
              <label key={r} className="opcao"><input className="marcar" type="radio" name="bl-quem" disabled={ro} checked={modo === r} onChange={() => setD({ ...pessoa, regra: r, pessoaId: null })} />
                <span>{nome}{r === "QUEM_PEDIU" ? <small>Se ela estiver fora, quem cuida do caso; sem ninguém, a sócia dona.</small> : null}</span></label>
            ))}
            <label className="opcao"><input className="marcar" type="radio" name="bl-quem" disabled={ro} checked={modo === "PESSOA"}
              onChange={() => setD({ ...pessoa, regra: null, pessoaId: p.pessoas.find((x) => x.areas.includes(p.area))?.id ?? p.pessoas[0]?.id ?? null })} />
              <span>Uma pessoa da equipe</span></label>
          </fieldset>
          {modo === "PESSOA" ? (
            <div className="campo">
              <label htmlFor="bl-pessoa">Pessoa</label>
              <select className="entrada" id="bl-pessoa" disabled={ro} value={pessoa.pessoaId ?? ""} onChange={(e) => setD({ ...pessoa, pessoaId: e.target.value })} aria-describedby="bl-pessoa-aj">
                {p.pessoas.map((x) => <option key={x.id} value={x.id}>{x.nome}{x.dono ? " · sócia dona" : x.areas.includes(p.area) ? "" : " · sem a área"}</option>)}
              </select>
              <p className="ajuda" id="bl-pessoa-aj">Se a pessoa estiver fora ou sair da equipe, vai para quem tem a área; sem ninguém, para a sócia dona.</p>
            </div>
          ) : null}
          <div className="campo">
            <label htmlFor="bl-motivo">Motivo que a pessoa vê</label>
            <input className="entrada" id="bl-motivo" maxLength={300} disabled={ro} value={pessoa.motivo ?? ""} onChange={(e) => setD({ ...pessoa, motivo: e.target.value })} />
          </div>
          {erros.length ? <ErroCampo id="bl-p-er">{erros.map((e) => textoDoErroFluxo(e, g)).join(" ")}</ErroCampo> : null}
        </>
      );
      break;
    }
    case "FIM":
      campos = (
        <div className="campo">
          <label htmlFor="bl-fim">Texto do fim (opcional)</label>
          <input className="entrada" id="bl-fim" maxLength={120} disabled={ro} data-foco value={d.texto ?? ""} onChange={(e) => setD({ ...d, texto: e.target.value || null })} />
          <p className="ajuda">Só a equipe vê, no desenho. Ex.: “Fim · o aviso Pagamento recebido agradece”.</p>
        </div>
      );
      break;
  }
  const seq = sequenciaDe(p.rascunho, passo.id);
  const i = seq ? seq.findIndex((x) => x.id === passo.id) : -1;
  const aprovar = d.tipo === "MENSAGEM" && typeof d.texto === "string" && p.dono && !ro;
  return (
    <section className="folha au-as" aria-labelledby="bl-t">
      <a className="au-voltar-cel" href={hrefAutomacao({ a: p.id })}><Icone nome="esquerda" className="ico ico-s" />Voltar ao fluxo</a>
      <div className="folha-cab">
        <div><p className="sobretitulo">Passo {num || ""} · {tipo.nome}</p><h2 id="bl-t">{ro ? "Ver" : "Editar"} {passo.tipo === "MENSAGEM" ? "a mensagem" : "o passo"}</h2></div>
        <a className="btn btn-fantasma" href={hrefAutomacao({ a: p.id })} aria-label="Fechar a edição do passo"><Icone nome="xis" className="ico" /></a>
      </div>
      <form className="au-bl-corpo" onSubmit={(e) => { e.preventDefault(); salvar(); }}>
        {falha ? <Aviso tom="urgencia" titulo="Nada mudou">{falha}</Aviso> : null}
        {campos}
      </form>
      {!ro ? (
        <div className="au-bl-pe">
          {passo.tipo !== "GATILHO" && seq ? (
            <div className="au-mover so-pc">
              <button className="btn btn-fantasma" type="button" disabled={mudando || !podeMover(seq, i, -1)} onClick={() => aoSalvar(moverPasso(p.rascunho, passo.id, -1))}>Subir</button>
              <button className="btn btn-fantasma" type="button" disabled={mudando || !podeMover(seq, i, 1)} onClick={() => aoSalvar(moverPasso(p.rascunho, passo.id, 1))}>Descer</button>
              <button className="btn btn-fantasma" type="button" disabled={mudando} onClick={() => aoSalvar(apagarPasso(p.rascunho, passo.id))}><Icone nome="lixeira" className="ico" />Apagar</button>
            </div>
          ) : null}
          <button className="btn btn-sec" type="button" disabled={mudando} onClick={() => salvar()}>Salvar no rascunho</button>
          {aprovar ? <button className="btn btn-pri" type="button" disabled={mudando} onClick={() => salvar(passo.id)}><Icone nome="check" className="ico" />Aprovar o texto</button> : null}
        </div>
      ) : null}
    </section>
  );
}

function sequenciaDe(f: Fluxo, id: string): Passo[] | null {
  const busca = (seq: Passo[]): Passo[] | null => {
    if (seq.some((p) => p.id === id)) return seq;
    for (const p of seq) if (p.tipo === "RAMOS") for (const r of p.ramos) { const s = busca(r.passos); if (s) return s; }
    return null;
  };
  return busca(f.passos);
}

const podeMudarAutomacao = (p: PaginaAutomacao) => p.dono || p.pessoas.some((x) => x.id === p.eu && x.areas.includes(p.area));

// ------------------------------------------------------------------------------- partes do editor

function Passos({ p, atual }: { p: PaginaAutomacao; atual: PassoEditor }) {
  const erros = p.listaErros.length;
  const nSug = passosSugeridos(p.rascunho, p.sugestao).size;
  const ligada = p.situacao === "LIGADA" && !p.rascunhoMudou;
  const itens: { k: PassoEditor; n: string; nome: string; sub: string; bloq: string }[] = [
    { k: "montar", n: "1", nome: "Montar", sub: nSug ? `${nSug} ${nSug === 1 ? "sugestão" : "sugestões"} para revisar` : erros ? `${erros} ${erros === 1 ? "passo para ajustar" : "passos para ajustar"}` : podeMudarAutomacao(p) ? `${numerar(p.rascunho).size} passos, todos salvos` : "Só ver", bloq: "" },
    { k: "testar", n: "2", nome: "Testar", sub: "Sem enviar nada", bloq: erros ? `Ajuste ${erros === 1 ? "o passo" : `os ${erros} passos`} antes` : "" },
    { k: "ligar", n: "3", nome: "Ligar", sub: ligada ? `Ligada · versão ${p.versaoLigada}` : p.situacao === "EM_APROVACAO" ? "Espera a Meta" : p.dono ? "Revisar e ligar" : "Só a sócia dona", bloq: erros ? "Ajuste os passos antes" : nSug ? "Aplique ou recuse as sugestões" : "" },
    { k: "historico", n: "4", nome: "Histórico", sub: p.execucoes.total ? `${p.execucoes.total} em 30 dias` : "Ainda nada saiu", bloq: "" },
  ];
  return (
    <nav aria-label="Passos da automação">
      <ol className="au-passos">
        {itens.map((x) => (
          <li key={x.k}>
            {x.bloq ? (
              <span className="bloq" role="link" aria-disabled="true"><span className="disco"><span>{x.n}</span></span><span><strong>{x.nome}</strong><small>{x.bloq}</small></span></span>
            ) : (
              <a href={hrefAutomacao({ a: p.id, passo: x.k })} aria-current={x.k === atual ? "step" : undefined} className={ligada && x.k !== atual ? "feito" : undefined}>
                <span className="disco"><span>{x.n}</span></span><span><strong>{x.nome}</strong><small>{x.sub}</small></span>
              </a>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function CabEditor({ p, sobre, acoes }: { p: PaginaAutomacao; sobre: string; acoes?: ReactNode }) {
  const sub = p.situacao === "LIGADA" ? `Ligada ${p.ligada ? `desde ${quando(p.ligada.em)}${p.ligada.por ? ` por ${primeiro(p.ligada.por.nome)}` : ""}` : ""} · versão ${p.versaoLigada}${p.rascunhoMudou ? " · rascunho com mudanças" : ""}`
    : p.situacao === "EM_APROVACAO" ? `Enviada à Meta ${quando(p.aguardando?.desde)} · espera a aprovação`
    : p.situacao === "DESLIGADA" ? `Desligada ${quando(p.desligada?.em)}${p.desligada?.por ? ` por ${primeiro(p.desligada.por.nome)}` : ""}`
    : passosSugeridos(p.rascunho, p.sugestao).size
      ? `Salvo ${quando(p.atualizadaEm)} · ${numerar(p.rascunho).size} ${numerar(p.rascunho).size === 1 ? "passo salvo" : "passos salvos"}, ${passosSugeridos(p.rascunho, p.sugestao).size} ${passosSugeridos(p.rascunho, p.sugestao).size === 1 ? "sugerido" : "sugeridos"}`
    : `Salvo ${quando(p.atualizadaEm)}${p.listaErros.length ? ` · ${p.listaErros.length} ${p.listaErros.length === 1 ? "passo" : "passos"} com ajuste` : p.textosPorAprovar ? " · texto por aprovar" : ""}`;
  return (
    <div className="au-ed-cab">
      <div>
        <p className="sobretitulo">{sobre}</p>
        <h1>{p.nome}</h1>
        <div className="selos"><SeloSituacao a={p} /><span className="sub">{sub}</span></div>
      </div>
      <div className="au-acoes-cab">{acoes}</div>
    </div>
  );
}

/** Pedir à IA uma mudança nesta automação (F3.59). A sugestão nova substitui a anterior. */
function PedirMudanca({ p, inicial, aoNova }: { p: PaginaAutomacao; inicial?: string; aoNova: (n: PaginaAutomacao) => void }) {
  const [texto, setTexto] = useState(inicial ?? "");
  const [enviando, setEnviando] = useState(false);
  const [falha, setFalha] = useState<{ titulo: string; texto: string } | null>(null);
  useEffect(() => { if (inicial) void Promise.resolve().then(() => setTexto(inicial)); }, [inicial]);
  async function pedir() {
    if (enviando || texto.trim().length < 3) { setFalha({ titulo: "Escreva o pedido", texto: "Diga o que mudar, como falaria com alguém da equipe." }); return; }
    setEnviando(true);
    setFalha(null);
    const r = await chamarPortal<PaginaAutomacao>(`/v1/escritorio/automacoes/${p.id}/ia`, { corpo: { pedido: texto.trim() } });
    setEnviando(false);
    if (r.ok) { setTexto(""); aoNova(r.dados); return; }
    setFalha(falhaDaIa(r.erro));
  }
  return (
    <form className="au-as-sec au-pedir" noValidate onSubmit={(e) => { e.preventDefault(); void pedir(); }}>
      <label className="au-rot-p" htmlFor="as-txt">Peça uma mudança</label>
      <textarea className="entrada" id="as-txt" value={texto} maxLength={600} placeholder="Ex.: espere 7 dias em vez de 5" onChange={(e) => setTexto(e.target.value)} />
      <div aria-live="polite">{falha ? <Aviso tom="atencao" icone="ia" titulo={falha.titulo}>{falha.texto}</Aviso> : null}</div>
      <button className="btn btn-sec" type="submit" disabled={enviando} aria-busy={enviando || undefined}>
        <Icone nome="enviar" className="ico" />{enviando ? "A IA está montando…" : "Pedir à IA"}
      </button>
    </form>
  );
}

/** O painel da IA ao lado do desenho, enquanto há sugestão para revisar (estado sugestao). */
function Assistente({ p, aoNova }: { p: PaginaAutomacao; aoNova: (n: PaginaAutomacao) => void }) {
  const s = p.sugestao!;
  const [pedido, setPedido] = useState<string | undefined>(undefined);
  const mostrar = (passo: string, rotulo: string) => (
    <a className="au-mostrar" href={`#b-${passo}`} onClick={(ev) => { ev.preventDefault(); irParaBloco(`b-${passo}`); }}>
      <Icone nome="alvo" className="ico ico-s" />Mostrar no desenho<span className="sr">: {rotulo.slice(0, 40)}</span>
    </a>
  );
  const podeMudar = podeMudarAutomacao(p);
  return (
    <aside className="folha au-as" aria-labelledby="as-t">
      <div className="au-as-cab"><span className="disco"><Icone nome="ia" className="ico" /></span><div><p className="sobretitulo">IA do escritório</p><h2 id="as-t">Assistente</h2></div></div>
      <section className="au-as-sec" aria-labelledby="as-p">
        <h3 id="as-p">{s.por?.id === p.eu ? "Você pediu" : `${primeiro(s.por?.nome) || "Alguém"} pediu`}</h3>
        <p className="au-pedido"><span className="de">{s.por?.nome ?? "Equipe"}</span>{s.pedido}<time>{horaDe(s.em)}</time></p>
      </section>
      {s.feito.length ? (
        <section className="au-as-sec" aria-labelledby="as-f">
          <h3 id="as-f">O que a IA fez</h3>
          <ul className="au-fez">
            {s.feito.map((f, i) => (
              <li key={i}><span className="ok" aria-hidden="true"><Icone nome="check" className="ico" /></span>
                <div>{f.texto}{f.passo && acharPasso(fluxoComSugestao(p.rascunho, s), f.passo) ? <><br />{mostrar(f.passo, f.texto)}</> : null}</div></li>
            ))}
          </ul>
        </section>
      ) : null}
      {s.alertas.length ? (
        <section className="au-as-sec" aria-labelledby="as-a">
          <h3 id="as-a">Para você decidir · {s.alertas.length}</h3>
          <ul className="au-fez">
            {s.alertas.map((a, i) => (
              <li key={i} className="alerta"><span className="al" aria-hidden="true">!</span>
                <div><span className="sr">Atenção: </span>{a.texto}
                  {a.automacao ? <><br /><a className="au-mostrar" href={hrefAutomacao({ a: a.automacao.id })}><Icone nome="dir" className="ico ico-s" />Ver a automação “{a.automacao.nome}”</a></> : null}
                  {a.passo && acharPasso(fluxoComSugestao(p.rascunho, s), a.passo) ? <><br />{mostrar(a.passo, a.texto)}</> : null}
                </div></li>
            ))}
          </ul>
        </section>
      ) : null}
      {podeMudar && s.experimente.length ? (
        <section className="au-as-sec" aria-labelledby="as-e">
          <h3 id="as-e">Experimente a seguir</h3>
          <div className="au-chips">{s.experimente.map((t) => <button key={t} type="button" onClick={() => setPedido(t)}>{t}</button>)}</div>
        </section>
      ) : null}
      {podeMudar ? <PedirMudanca p={p} inicial={pedido} aoNova={aoNova} /> : null}
      <p className="au-as-pe"><Icone nome="escudo" className="ico" /><span><b>A IA sugere, você aprova.</b> Aplicar muda só o rascunho. Nada sai para cliente antes de testar e {p.dono ? "você" : primeiro(p.quemCuida?.nome) || "a sócia dona"} ligar.</span></p>
    </aside>
  );
}

function LadoMontar({ p, aoSugerir, aoNova }: { p: PaginaAutomacao; aoSugerir: () => void; aoNova: (n: PaginaAutomacao) => void }) {
  const g = p.gatilho;
  const numeros = numerar(p.rascunho);
  const meu = (Array.from(numeros.keys()).map((id) => acharPasso(p.rascunho, id)).find((x) => x?.tipo === "PESSOA" && x.pessoaId === p.eu)) ?? null;
  const sugestoes = p.eventos.filter((e) => e.tipo === "SUGESTAO").slice(0, 3);
  if (p.sugestao) return <Assistente p={p} aoNova={aoNova} />;
  if (p.listaErros.length) {
    return (
      <aside className="folha au-as" aria-labelledby="as-t">
        <div className="au-as-cab"><span className="disco"><Icone nome="alerta" className="ico" /></span><div><p className="sobretitulo">Antes de testar</p><h2 id="as-t">O que falta · {p.listaErros.length}</h2></div></div>
        <section className="au-as-sec" aria-label="Ajustes">
          <ul className="au-fez">
            {p.listaErros.map((e, i) => {
              const alvo = e.ramo ? `b-${e.passo}-${e.ramo}` : `b-${e.passo}`;
              return (
                <li key={i} className="alerta"><span className="al" aria-hidden="true">!</span>
                  <div><span className="sr">Atenção: </span><b>{TITULOS_ERRO_FLUXO[e.codigo]}.</b> {textoDoErroFluxo(e, g)}<br />
                    <a className="au-mostrar" href={`#${alvo}`} onClick={(ev) => { ev.preventDefault(); irParaBloco(alvo); }}><Icone nome="alvo" className="ico ico-s" />Mostrar no desenho<span className="sr">: {TITULOS_ERRO_FLUXO[e.codigo]}</span></a></div>
                </li>
              );
            })}
          </ul>
        </section>
        <p className="au-as-pe"><Icone nome="escudo" className="ico" /><span><b>Testar e ligar ficam travados</b> até cada passo marcado ser ajustado.</span></p>
      </aside>
    );
  }
  return (
    <aside className="folha au-as" aria-labelledby="ro-t">
      <div className="folha-cab"><div><p className="sobretitulo">Sobre esta automação</p><h2 id="ro-t">{meu ? "Você está neste fluxo" : p.origem === "PRONTA" ? "Pronta do T3jus" : "Criada pelo escritório"}</h2></div></div>
      <div className="cv-prev">
        {meu ? <p className="cv-por"><b>O passo {numeros.get(meu.id)} é com você.</b> Quando a conversa chega lá, ela passa para você, com o motivo, e entra em “Precisa de alguém”.</p> : null}
        {p.origem === "PRONTA" ? <p className="cv-por">Veio dos avisos automáticos. O texto de cada mensagem é o do aviso, ajustado em Escritório › WhatsApp e IA; os outros passos dá para mudar aqui.</p> : null}
        <dl className="cv-dl">
          <div><dt>Situação</dt><dd>{p.situacao === "LIGADA" ? "Ligada" : p.situacao === "EM_APROVACAO" ? "Em aprovação no WhatsApp" : p.situacao === "DESLIGADA" ? "Desligada" : "Rascunho"}</dd></div>
          <div><dt>Área</dt><dd>{p.area === "JURIDICO" ? "Jurídico" : "Financeiro"}</dd></div>
          <div><dt>Montada por</dt><dd>{p.criadaPor?.nome ?? "T3jus"}</dd></div>
          {p.versaoLigada ? <div><dt>Versão ligada</dt><dd>{p.versaoLigada}</dd></div> : null}
          {p.textosPorAprovar ? <div><dt>Textos por aprovar</dt><dd>{p.textosPorAprovar}</dd></div> : null}
        </dl>
        {p.dono && sugestoes.length ? (
          <div role="group" aria-labelledby="sug-t">
            <p className="au-rot-p" id="sug-t">Sugestões da equipe</p>
            <ul className="au-hist">{sugestoes.map((s, i) => <li key={i}><time>{diaCurto(diaDe(s.em))}</time><span><b>{s.pessoa?.nome}</b>: “{String(s.detalhe.texto ?? "")}”</span></li>)}</ul>
          </div>
        ) : null}
        <a className="btn btn-sec" href={hrefAutomacao({ a: p.id, passo: "testar" })}><Icone nome="olho" className="ico" />Testar sem enviar</a>
        {!p.dono ? <button className="btn btn-sec" type="button" onClick={aoSugerir}><Icone nome="conversas" className="ico" />Sugerir mudança a {primeiro(p.quemCuida?.nome) || "a sócia dona"}</button> : null}
      </div>
      {p.origem === "ESCRITORIO" && podeMudarAutomacao(p) ? <PedirMudanca p={p} aoNova={aoNova} /> : null}
    </aside>
  );
}

function Montar({ p, b, mudando, falha, aoSalvar, aoSugerir, aoDecidir, aoNova }: {
  p: PaginaAutomacao; b: string | null; mudando: boolean; falha: string | null;
  aoSalvar: (f: Fluxo, aprovar?: string) => void; aoSugerir: () => void;
  aoDecidir: (acao: "aplicar" | "recusar", escolha: string[] | "TUDO") => void; aoNova: (n: PaginaAutomacao) => void;
}) {
  const [onde, setOnde] = useState<{ ramos?: string; quando?: Quando } | null>(null);
  const desenho = fluxoComSugestao(p.rascunho, p.sugestao);
  const tracejados = passosTracejados(p.rascunho, p.sugestao);
  const nSug = passosSugeridos(p.rascunho, p.sugestao).size;
  const numeros = numerar(desenho);
  const erros = new Map<string, ErroFluxo[]>();
  p.listaErros.forEach((e) => erros.set(e.passo, [...(erros.get(e.passo) ?? []), e]));
  const podeMudar = podeMudarAutomacao(p);
  const ctx: CtxDesenho = { p, numeros, erros, sel: b, podeMudar, aoAdicionar: setOnde, tracejados, mudando, aoDecidir: (a, id) => aoDecidir(a, [id]) };
  const passo = b ? acharPasso(p.rascunho, b) : null;
  const ultimo = p.rascunho.passos[p.rascunho.passos.length - 1];
  const resumo = p.listaErros.map((e, i) => {
    const alvo = e.ramo ? `b-${e.passo}-${e.ramo}` : `b-${e.passo}`;
    const nome = e.ramo ? `Caminho “${nomeDoRamo(e.ramo, p.gatilho)}”` : `Passo ${numeros.get(e.passo) ?? ""}, ${TIPOS_PASSO[acharPasso(p.rascunho, e.passo)?.tipo ?? "FIM"].nome}`;
    return <span key={i}>{i ? " · " : ""}<a href={`#${alvo}`} onClick={(ev) => { ev.preventDefault(); irParaBloco(alvo); }}>{nome}: {TITULOS_ERRO_FLUXO[e.codigo].replace(/^./, (c) => c.toLowerCase())}</a></span>;
  });
  return (
    <div className={`au-editor${passo ? " largo bloco-aberto" : ""}`}>
      <div className="au-col">
        <section className="folha" aria-labelledby="t-des" style={{ overflow: "hidden" }}>
          <h2 className="sr" id="t-des">Desenho do fluxo</h2>
          {p.listaErros.length ? (
            <div style={{ padding: "16px 20px 4px" }}>
              <Aviso tom="urgencia" titulo={`${p.listaErros.length} ${p.listaErros.length === 1 ? "passo precisa" : "passos precisam"} de ajuste antes de testar`}>{resumo}</Aviso>
            </div>
          ) : null}
          {falha && !passo ? <div style={{ padding: "16px 20px 4px" }}><Aviso tom="urgencia" titulo="Nada mudou">{falha}</Aviso></div> : null}
          {nSug ? (
            <div className="au-faixa" role="region" aria-label="Sugestões da IA">
              <Icone nome="ia" className="ico" />
              <p><b>{nSug} {nSug === 1 ? "passo sugerido" : "passos sugeridos"} pela IA</b>: revise antes de aplicar.{podeMudar ? " Você também pode aplicar ou recusar um por um." : ` Quem aplica é quem tem a área ou ${primeiro(p.quemCuida?.nome) || "a sócia dona"}.`}</p>
              {podeMudar ? (
                <div className="bts">
                  <button className="btn btn-sec" type="button" disabled={mudando} onClick={() => aoDecidir("recusar", "TUDO")}><Icone nome="xis" className="ico" />Recusar tudo</button>
                  <button className="btn btn-pri" type="button" disabled={mudando} onClick={() => aoDecidir("aplicar", "TUDO")}><Icone nome="check" className="ico" />Aplicar tudo</button>
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="au-ferr">
            <div className="au-leg" aria-label="Legenda">
              <span><i aria-hidden="true" />Contorno contínuo: salvo no rascunho</span>
              {nSug ? <span><i className="t" aria-hidden="true" />Tracejado: sugerido pela IA, ainda não salvo</span> : null}
              {p.listaErros.length ? <span><i className="e" aria-hidden="true" />Filete: precisa de ajuste</span> : null}
            </div>
            {podeMudar && !nSug && ultimo?.tipo !== "RAMOS" ? <button className="btn btn-sec so-pc" type="button" disabled={mudando} onClick={() => setOnde({})}><Icone nome="mais" className="ico" />Adicionar passo</button> : null}
          </div>
          <div className="au-tela"><Sequencia ctx={ctx} passos={desenho.passos} rotulo="Passos da automação, de cima para baixo" /></div>
          <p className="au-tela-pe"><Icone nome="celular" className="ico" />
            <span className="so-cel">No celular dá para {nSug ? "aplicar e recusar sugestões, " : ""}editar cada passo, aprovar o texto, testar e ligar. Para adicionar, mover ou apagar passos, use o computador.</span>
            <span className="so-pc-i">O desenho também é uma lista: leitores de tela leem os passos em ordem, com os caminhos de cada ramo.</span></p>
        </section>
      </div>
      <div className="au-col au-lado">
        {passo ? <EditarPasso key={`${passo.id}-${p.versao}`} p={p} passo={passo} num={numeros.get(passo.id) ?? 0} mudando={mudando} falha={falha} aoSalvar={aoSalvar} /> : <LadoMontar p={p} aoSugerir={aoSugerir} aoNova={aoNova} />}
      </div>
      {onde ? <JanelaAdicionar g={p.gatilho} onde={onde} aoFechar={() => setOnde(null)} aoEscolher={(t) => {
        const novo = passoNovo(p.rascunho, t, p.gatilho);
        setOnde(null);
        aoSalvar(adicionarPasso(p.rascunho, onde, novo));
      }} /> : null}
    </div>
  );
}

const MOTIVO_FORA: Record<string, string> = {
  SEM_WHATSAPP: "O número da ficha é fixo ou não tem celular.",
  SEM_AVISOS: "Pediu para não receber avisos",
  COMBINADO: "Tem combinado no Financeiro",
};

/** A linha de "Quem entraria" nos gatilhos novos (PA-06): o que faz entrar e quando. */
function detalheNovo(g: Gatilho, i: QuemEntraria["itens"][number]): string {
  const para = i.contato.nome ? ` · para ${i.contato.nome}${i.contato.papel ? `, ${i.contato.papel}` : ""}` : "";
  if (g === "CLIENTE_NOVO") {
    if (i.motivo === "IMPORTADO") return `Vieram pela importação de ${diaCurto(i.origem.quando)}. Já eram do escritório.`;
    if (i.motivo === "AINDA_NAO") return `Cadastrado em ${diaCurto(i.origem.quando)}, ainda sem proposta aceita nem contrato. Entra se fechar.`;
    if (i.motivo === "JA_RECEBEU") return "Já recebeu a boas-vindas. Cada cliente recebe uma vez só.";
    return `${i.origem.descricao} em ${diaCurto(i.origem.quando)}${para}${i.quemAtende ? ` · atende ${i.quemAtende.nome}` : ""}`;
  }
  const docs = i.documentos ?? [];
  const casos = [...new Set(docs.map((x) => x.caso.nome))];
  const base = `${docs.length > 1 ? `${docs.length} documentos numa mensagem só · ` : ""}${i.origem.descricao} · ${casos.join(", ")}`;
  if (i.quando === "ESPERA") return `${base} · ${i.repedido ? `pediram de novo em ${diaCurto(i.repedido)}, a contagem recomeçou` : "ainda dentro do prazo"}: entra em ${diaCurto(i.origem.quando)}, se não chegar`;
  if (i.quando === "AMANHA") return `${base} · chega aos dias do gatilho amanhã, ${diaCurto(i.origem.quando)}${para}`;
  return `${base} · pedido em ${diaCurto(docs[0]?.pedidoEm ?? i.origem.quando)}${para}`;
}

function Testar({ p }: { p: PaginaAutomacao }) {
  const [quem, setQuem] = useState<QuemEntraria | "erro" | null>(null);
  const [parcela, setParcela] = useState<string>("");
  const [escolha, setEscolha] = useState<EscolhaSimulacao>("NADA");
  const [sim, setSim] = useState<Simulacao | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [rodando, setRodando] = useState(false);
  const g = p.gatilho;
  useEffect(() => {
    let vivo = true;
    void chamarPortal<QuemEntraria>(`/v1/escritorio/automacoes/${p.id}/quem-entraria`).then((r) => {
      if (!vivo) return;
      setQuem(r.ok ? r.dados : "erro");
      if (r.ok) setParcela(r.dados.itens.find((i) => i.entra && i.parcela)?.parcela?.id ?? "");
    });
    return () => { vivo = false; };
  }, [p.id]);
  async function simular() {
    setRodando(true);
    setErro(null);
    const r = await chamarPortal<Simulacao>(`/v1/escritorio/automacoes/${p.id}/simular`, { corpo: { parcelaId: parcela || null, escolha } });
    setRodando(false);
    if (!r.ok) { setErro(textoDoErro(r.erro)); return; }
    setSim(r.dados);
  }
  const itens = quem && quem !== "erro" ? quem.itens : [];
  const entram = itens.filter((i) => i.entra);
  const fora = itens.filter((i) => !i.entra);
  const escolhas: [EscolhaSimulacao, string][] = GATILHOS[g].ramos.includes("PAGOU")
    ? [["NADA", "Não pagar nem responder"], ["RESPONDEU", "Responder"], ["PAGOU", "Pagar"]]
    : GATILHOS[g].ramos.includes("CHEGOU")
      ? [["NADA", "Não mandar nem responder"], ["RESPONDEU", "Responder ou mandar um arquivo"], ["CHEGOU", "O documento chegar"]]
      : [["NADA", "Não responder"], ["RESPONDEU", "Responder"]];
  const novo = g === "CLIENTE_NOVO" || g === "DOCUMENTO_PENDENTE";
  const subQuem = !quem || quem === "erro" || !quem.disponivel ? undefined
    : g === "CLIENTE_NOVO" ? `Se estivesse ligada nos últimos 30 dias: ${entram.length} ${entram.length === 1 ? "entraria" : "entrariam"}, ${fora.reduce((n, i) => n + (i.quantos ?? 1), 0)} ficariam de fora`
    : g === "DOCUMENTO_PENDENTE" ? `${itens.reduce((n, i) => n + (i.documentos?.length ?? 0), 0)} documentos faltando, de ${itens.length} ${itens.length === 1 ? "cliente" : "clientes"}: ${itens.filter((i) => i.quando === "HOJE").length} já ${itens.filter((i) => i.quando === "HOJE").length === 1 ? "passou" : "passaram"} de ${quem.dias ?? 5} dias hoje`
    : `${itens.length} ${g.startsWith("PARCELA") ? (itens.length === 1 ? "parcela" : "parcelas") : g === "LEMBRETE_AUDIENCIA" ? (itens.length === 1 ? "compromisso nos próximos 7 dias" : "compromissos nos próximos 7 dias") : (itens.length === 1 ? "mudança de etapa nos últimos 7 dias" : "mudanças de etapa nos últimos 7 dias")}: ${entram.length} ${entram.length === 1 ? "entraria" : "entrariam"}, ${fora.length} ${fora.length === 1 ? "fica" : "ficam"} de fora`;
  const agora = g === "DOCUMENTO_PENDENTE" ? entram.filter((i) => i.quando !== "ESPERA") : entram;
  const depois = g === "DOCUMENTO_PENDENTE" ? entram.filter((i) => i.quando === "ESPERA") : [];
  return (
    <div className="au-teste">
      <div className="au-col">
        <Folha id="t-sim" titulo="Simular sem enviar" sub="Escolha um cliente e o que ele faria. Nada sai pelo WhatsApp.">
          <form className="au-sim-ctl" onSubmit={(e) => { e.preventDefault(); void simular(); }}>
            <div className="campo">
              <label htmlFor="ts-cli">Simular com</label>
              <select className="entrada" id="ts-cli" value={parcela} onChange={(e) => setParcela(e.target.value)} aria-describedby="ts-cli-aj">
                <option value="">Cliente de exemplo</option>
                {itens.flatMap((i) => (i.parcela ? [<option key={i.parcela.id} value={i.parcela.id}>{i.cliente.nome} · {i.parcela.descricao}</option>] : []))}
              </select>
              <p className="ajuda" id="ts-cli-aj">{g === "PARCELA_ATRASO" ? "Clientes com parcela em atraso hoje." : g === "PARCELA_VAI_VENCER" ? "Parcelas que entram hoje." : "Para este gatilho, a simulação usa um exemplo."}</p>
            </div>
            <fieldset className="campo">
              <legend>E se o cliente</legend>
              {escolhas.map(([v, t]) => (
                <label key={v} className="opcao"><input className="marcar" type="radio" name="ts-cam" checked={escolha === v} onChange={() => setEscolha(v)} /><span>{t}</span></label>
              ))}
            </fieldset>
            <button className="btn btn-pri au-sim-bt" type="submit" disabled={rodando}><Icone nome="olho" className="ico" />Simular</button>
          </form>
          {erro ? <div className="au-pe-nota"><Aviso tom="urgencia" titulo="Não deu para simular">{erro}</Aviso></div> : null}
          {sim ? (
            <>
              <p className="au-simfaixa"><Icone nome="olho" className="ico" /><span><b>Simulação.</b> Esta conversa não foi enviada. Os horários seguem os limites: 8h às 20h, em dia útil.{sim.exemplo ? " Dados de exemplo." : ""}</span></p>
              <ol className="au-caminho" aria-label="Caminho percorrido no fluxo">
                {sim.caminho.map((c, i) => <li key={i} className="r"><span><Icone nome={ic(TIPOS_PASSO[c.tipo].icone)} className="ico" />{c.rotulo}</span></li>)}
              </ol>
              <ol className="cv-msgs" aria-label="Conversa simulada">
                {sim.conversa.flatMap((l, i) => {
                  const d = diaDe(l.em);
                  const out: ReactNode[] = [];
                  const antes = sim.conversa[i - 1];
                  if (!antes || diaDe(antes.em) !== d) { out.push(<li key={`d${i}`} className="cv-dia">{d === diaDe(new Date().toISOString()) ? "Hoje" : ""} {diaCurto(d)}</li>); }
                  if (l.tipo === "SISTEMA") out.push(<li key={i} className="cv-sis"><Icone nome={ic(l.icone)} className="ico" /><span>{l.texto}<time>{horaDe(l.em)}</time></span></li>);
                  else if (l.tipo === "AVISO") out.push(<li key={i} className="cv-m eq"><div className="cv-b"><span className="de">Aviso automático · {l.nome}</span>{l.texto}<time>{horaDe(l.em)}</time></div></li>);
                  else out.push(<li key={i} className="cv-m"><div className="cv-b"><span className="de">{primeiro(sim.contato)}</span>{l.texto}<time>{horaDe(l.em)}</time></div></li>);
                  return out;
                })}
              </ol>
            </>
          ) : null}
        </Folha>
      </div>
      <aside className="au-col" aria-label="Quem entraria">
        <Folha id="t-quem" titulo={g === "CLIENTE_NOVO" ? "Quem teria entrado" : g === "DOCUMENTO_PENDENTE" ? "Quem entraria" : "Quem entraria hoje"} sub={subQuem}>
          {quem === "erro" ? <div className="au-pe-nota"><Aviso tom="urgencia" titulo="Não deu para carregar">Tente de novo em instantes.</Aviso></div>
            : !quem ? <div className="au-pe-nota"><Carregando rotulo="Carregando quem entraria" linhas={3} /></div>
            : !quem.disponivel ? <p className="au-pe-nota ajuda">Neste gatilho, cada cliente entra na hora em que o registro é feito no Financeiro. A simulação já funciona.</p>
            : !itens.length ? <p className="au-pe-nota ajuda">{g === "CLIENTE_NOVO" ? "Ninguém virou cliente nos últimos 30 dias." : g === "DOCUMENTO_PENDENTE" ? "Nenhum documento pedido está faltando." : "Hoje ninguém entraria nesta automação."}</p>
            : novo ? (
              <>
                <p className="au-sub3">Entrariam · {agora.length}</p>
                <ul className="au-quem-l">
                  {agora.map((i) => (
                    <li key={i.origem.id}><strong>{i.cliente.nome}</strong>
                      {i.quando === "HOJE" ? <Selo tipo="atencao" icone="relogio">Já pendente hoje</Selo> : i.quando === "AMANHA" ? <Selo tipo="ok" icone="check">Entra amanhã</Selo> : <Selo tipo="ok" icone="check">Entraria</Selo>}
                      <small>{detalheNovo(g, i)}</small>
                      {i.quando === "HOJE" && i.documentos?.[0] ? <a className="btn btn-sec gn-ja" href={`/juridico/casos/${i.documentos[0].caso.id}`}><Icone nome="check" className="ico" />Já chegou? Marcar no caso</a> : null}
                    </li>
                  ))}
                </ul>
                {depois.length ? (
                  <>
                    <p className="au-sub3">Ainda não · {depois.length}</p>
                    <ul className="au-quem-l">
                      {depois.map((i) => <li key={i.origem.id}><strong>{i.cliente.nome}</strong><Selo tipo="atencao" icone="relogio">Espera</Selo><small>{detalheNovo(g, i)}</small></li>)}
                    </ul>
                  </>
                ) : null}
                {fora.length ? (
                  <>
                    <p className="au-sub3">{g === "CLIENTE_NOVO" ? "Ficam de fora" : "Ficam de fora"} · {fora.reduce((n, i) => n + (i.quantos ?? 1), 0)}</p>
                    <ul className="au-quem-l">
                      {fora.map((i) => (
                        <li key={i.origem.id}><strong>{i.cliente.nome}</strong>
                          {i.motivo === "AINDA_NAO" ? <Selo tipo="atencao" icone="relogio">Ainda não</Selo> : <Selo tipo="neutro">Fica de fora</Selo>}
                          <small>{i.motivo === "SEM_AVISOS" ? `${i.detalhe?.quemPediu ? `${i.detalhe.quemPediu} pediu` : "Pediu"}${i.detalhe?.em ? ` em ${diaCurto(diaDe(i.detalhe.em))}` : ""} para não receber avisos.`
                            : i.motivo === "SEM_WHATSAPP" ? MOTIVO_FORA.SEM_WHATSAPP : detalheNovo(g, i)}</small>
                          {i.motivo === "SEM_WHATSAPP" ? <a className="btn btn-sec" href={`${ROTAS_PORTAL.clientes}/${i.cliente.id}`}><Icone nome="pessoas" className="ico" />Corrigir na ficha</a> : null}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </>
            ) : (
              <>
                <p className="au-sub3">Entrariam · {entram.length}</p>
                <ul className="au-quem-l">
                  {entram.map((i) => (
                    <li key={i.origem.id}><strong>{i.cliente.nome}</strong><Selo tipo="ok" icone="check">Entraria</Selo>
                      <small>{i.parcela ? `${i.parcela.descricao} · ${reais(i.parcela.valor)}` : `${i.origem.descricao} · ${quandoOrigem(i.origem.quando)}`}{g === "PARCELA_ATRASO" ? ` · ${i.diasAtraso} ${i.diasAtraso === 1 ? "dia" : "dias"}` : ""} · Para {i.contato.nome}{i.contato.papel ? `, ${i.contato.papel}` : ""}{i.jaEmAtraso ? " · já em atraso, só entra se você escolher ao ligar" : ""}</small></li>
                  ))}
                </ul>
                <p className="au-sub3">Ficam de fora · {fora.length}</p>
                <ul className="au-quem-l">
                  {fora.map((i) => (
                    <li key={i.origem.id}><strong>{i.cliente.nome}</strong><Selo tipo="neutro">Fica de fora</Selo>
                      <small>{i.motivo === "COMBINADO" ? `${MOTIVO_FORA.COMBINADO}: ${i.detalhe?.oQue ?? ""}${i.detalhe?.data ? `, em ${diaCurto(i.detalhe.data)}` : ""}.`
                        : i.motivo === "SEM_AVISOS" ? `${i.detalhe?.quemPediu ? `${i.detalhe.quemPediu} pediu` : "Pediu"}${i.detalhe?.em ? ` em ${diaCurto(diaDe(i.detalhe.em))}` : ""} para não receber avisos${i.detalhe?.tipo === "COBRANCA" ? " de cobrança" : ""}.`
                        : MOTIVO_FORA.SEM_WHATSAPP}</small>
                      {i.motivo === "SEM_WHATSAPP" ? <a className="btn btn-sec" href={`${ROTAS_PORTAL.clientes}/${i.cliente.id}`}><Icone nome="pessoas" className="ico" />Corrigir na ficha</a> : null}
                    </li>
                  ))}
                </ul>
              </>
            )}
          {g === "PARCELA_ATRASO" ? <p className="pt-pe-folha"><Icone nome="ajuda" className="ico" /><span>Quem já está em atraso só entra se a sócia dona escolher isso ao ligar.</span></p> : null}
          {g === "DOCUMENTO_PENDENTE" ? <p className="pt-pe-folha"><Icone nome="ajuda" className="ico" /><span>“Já pendente hoje” só entra se você escolher isso ao ligar. Antes, vale conferir na ficha do caso se algum já chegou por e-mail ou em mãos.</span></p> : null}
          {g === "CLIENTE_NOVO" ? <p className="pt-pe-folha"><Icone nome="ajuda" className="ico" /><span>Boas-vindas só vale para quem entrar depois de ligar. Quem já é cliente hoje não recebe, nem estes {entram.length}.</span></p> : null}
        </Folha>
      </aside>
    </div>
  );
}

/** Dia (vencimento) ou dia e hora (compromisso, mudança de etapa) de quem entraria. */
const quandoOrigem = (q: string) => (q.length <= 10 ? diaCurto(q) : `${diaCurto(diaDe(q))}, ${horaDe(q)}`);

function Frase({ p }: { p: PaginaAutomacao }) {
  const g = p.gatilho;
  const f = p.rascunho;
  const gat = f.passos[0]?.tipo === "GATILHO" ? f.passos[0] : null;
  const cond = f.passos.find((x) => x.tipo === "CONDICOES");
  const msgs = f.passos.filter((x) => x.tipo === "MENSAGEM").length;
  const espera = f.passos.filter((x) => x.tipo === "ESPERA").reduce((s, x) => s + (x.tipo === "ESPERA" ? x.dias ?? 0 : 0), 0);
  const ramos = f.passos.find((x) => x.tipo === "RAMOS") as PassoRamos | undefined;
  const resp = ramos?.ramos.find((r) => r.quando === "RESPONDEU");
  const nada = ramos?.ramos.find((r) => r.quando === "NADA")?.passos.find((x) => x.tipo === "PESSOA") as PassoPessoa | undefined;
  const fim = f.passos.find((x) => x.tipo === "PESSOA") as PassoPessoa | undefined;
  return (
    <p className="au-frase">
      {GATILHOS[g].toda(gat?.dias ?? null)}{cond && cond.tipo === "CONDICOES" && cond.semCombinado ? ", sem combinado de pagamento," : ""} recebe <b>{msgs === 1 ? "uma mensagem" : `${msgs} mensagens`}</b> pelo WhatsApp.
      {resp?.passos.some((x) => x.tipo === "IA") ? <> Se o cliente responder, <b>a IA conversa</b> com o que está no T3jus.</> : null}
      {nada ? <> Se{espera ? <> em <b>{espera} {espera === 1 ? "dia" : "dias"}</b></> : null} {GATILHOS[g].ramos.includes("PAGOU") ? "não pagar nem responder" : GATILHOS[g].ramos.includes("CHEGOU") ? "o documento não chegar nem o cliente responder" : "não responder"}, a conversa <b>passa para {quemRecebe(nada, p.pessoas, g)}</b>.</> : null}
      {fim ? <> Depois, a conversa <b>passa para {quemRecebe(fim, p.pessoas, g)}</b>.</> : null}
    </p>
  );
}

function Ligar({ p, mudando, falha, aoLigar, aoSugerir }: {
  p: PaginaAutomacao; mudando: boolean; falha: string | null;
  aoLigar: (d: { revisou: boolean; desligarConflitos: boolean; entramJaAtrasados: boolean }) => void; aoSugerir: () => void;
}) {
  const [todas, setTodas] = useState(false);
  const [desligar, setDesligar] = useState(true);
  const [revisou, setRevisou] = useState(false);
  const [erroRev, setErroRev] = useState(false);
  const whats = p.whatsapp.situacao === "LIGADO" || p.whatsapp.situacao === "EM_ANALISE";
  const ligada = (p.situacao === "LIGADA" || p.situacao === "EM_APROVACAO") && !p.rascunhoMudou;
  const textosNovos = Object.values(p.modelos).some((m) => m.metaSituacao !== "APROVADO");
  const numeros = numerar(p.rascunho);
  let corpo: ReactNode;
  if (ligada) {
    corpo = (
      <div className="au-conf">
        <Aviso tom={p.situacao === "LIGADA" ? "sucesso" : "atencao"} titulo={p.situacao === "LIGADA" ? `Ligada · versão ${p.versaoLigada}` : "Esperando a aprovação do WhatsApp"}>
          {p.situacao === "LIGADA" ? "Para mudar, edite em Montar: a versão ligada continua valendo até você ligar a nova." : "A Meta costuma responder em até 1 dia. Aprovado, ela começa sozinha; recusado, volta com o motivo."}
        </Aviso>
      </div>
    );
  } else if (!p.dono) {
    corpo = (
      <div className="au-conf">
        <Aviso tom="info" icone="cadeado" titulo="Você pode ver e testar, não ligar"
          acoes={<button className="btn btn-sec" type="button" onClick={aoSugerir}><Icone nome="conversas" className="ico" />Sugerir mudança a {primeiro(p.quemCuida?.nome) || "a sócia dona"}</button>}>
          Quem aprova o texto e liga as automações é {p.quemCuida?.nome ?? "a sócia dona"}.
        </Aviso>
      </div>
    );
  } else {
    corpo = (
      <form className="au-conf" onSubmit={(e) => {
        e.preventDefault();
        if (!revisou) { setErroRev(true); document.getElementById("lg-ok")?.focus(); return; }
        aoLigar({ revisou, desligarConflitos: desligar, entramJaAtrasados: todas });
      }}>
        {falha ? <Aviso tom="urgencia" titulo="Não ligou">{falha}</Aviso> : null}
        {!whats ? <Aviso tom="atencao" icone="whats" titulo="O WhatsApp do escritório não está ligado" acoes={<a className="btn btn-sec" href={ROTAS_ESCRITORIO.whatsapp}>Ligar o WhatsApp</a>}>Dá para testar; ligar fica para depois que o número estiver pronto.</Aviso> : null}
        {p.textosPorAprovarIds.length ? (
          <Aviso tom="atencao" titulo="Aprove os textos antes de ligar">
            {p.textosPorAprovarIds.map((id, i) => <span key={id}>{i ? " · " : ""}<a href={hrefAutomacao({ a: p.id, b: id })}>Passo {numeros.get(id)}: {(acharPasso(p.rascunho, id) as PassoMensagem | null)?.nome}</a></span>)}
          </Aviso>
        ) : null}
        {p.gatilho === "DOCUMENTO_PENDENTE" ? (
          <fieldset className="campo">
            <legend>Quem entra</legend>
            <label className="opcao"><input className="marcar" type="radio" name="lg-quem" checked={!todas} onChange={() => setTodas(false)} />
              <span>Só os documentos que passarem do prazo daqui em diante<small className="ajuda" style={{ display: "block" }}>Recomendado. A lista de pendentes costuma estar atrasada: o cliente não recebe lembrete de algo que já mandou.</small></span></label>
            <label className="opcao"><input className="marcar" type="radio" name="lg-quem" checked={todas} onChange={() => setTodas(true)} />
              <span>Também os que já estão pendentes hoje<small className="ajuda" style={{ display: "block" }}>Saem a partir do próximo horário permitido. Veja quem são em Testar.</small></span></label>
            <p className="ajuda">No máximo 1 lembrete de documento por semana por cliente, somando o “Pedir de novo”.</p>
          </fieldset>
        ) : null}
        {p.gatilho === "CLIENTE_NOVO" ? (
          <p className="ajuda">Quem entra: só quem virar cliente depois de ligar. Uma boas-vindas por cliente, para sempre.</p>
        ) : null}
        {p.gatilho === "PARCELA_ATRASO" ? (
          <fieldset className="campo">
            <legend>Quem entra</legend>
            <label className="opcao"><input className="marcar" type="radio" name="lg-quem" checked={!todas} onChange={() => setTodas(false)} />
              <span>Só as parcelas que atrasarem daqui em diante<small className="ajuda" style={{ display: "block" }}>Recomendado. Ninguém recebe cobrança de surpresa por algo antigo.</small></span></label>
            <label className="opcao"><input className="marcar" type="radio" name="lg-quem" checked={todas} onChange={() => setTodas(true)} />
              <span>Também as que já estão em atraso hoje<small className="ajuda" style={{ display: "block" }}>Saem a partir do próximo horário permitido. Veja quem são em Testar.</small></span></label>
          </fieldset>
        ) : null}
        {p.conflitos.length ? (
          <label className="opcao">
            <input className="marcar" type="checkbox" checked={desligar} onChange={(e) => setDesligar(e.target.checked)} />
            <span>Desligar {p.conflitos.map((c) => `“${c.nome}”`).join(" e ")} quando esta ligar
              <small className="ajuda" style={{ display: "block" }}>Evita duas cobranças na mesma semana. Fica no histórico; dá para ligar de novo.</small></span>
          </label>
        ) : null}
        <label className="opcao">
          <input className="marcar" type="checkbox" id="lg-ok" checked={revisou} onChange={(e) => { setRevisou(e.target.checked); setErroRev(false); }}
            aria-describedby={descritoPor(erroRev && "lg-ok-er")} />
          <span>Revisei o texto, os caminhos e quem entra</span>
        </label>
        {erroRev ? <ErroCampo id="lg-ok-er">Confirme que revisou.</ErroCampo> : null}
        <button className="btn btn-pri" type="submit" disabled={mudando || !whats || p.textosPorAprovarIds.length > 0}><Icone nome="ligar" className="ico" />Ligar a automação</button>
        <p className="x-pe-nota"><Icone nome="cadeado" className="ico" /><span>Só {p.quemCuida?.nome ?? "a sócia dona"}, a sócia dona, liga e desliga. Fica no histórico quem ligou e quando.</span></p>
      </form>
    );
  }
  return (
    <div className="au-grade" style={{ gridTemplateColumns: "minmax(0,1fr) 380px" }}>
      <div className="au-col">
        <Folha id="t-lg" titulo={ligada ? "O que está valendo" : "Revise e ligue"} sub="Em linguagem simples, o que vai acontecer">
          <Frase p={p} />
          {corpo}
        </Folha>
      </div>
      <aside className="au-col" aria-label="Limites e o que acontece depois">
        <Limites dono={p.quemCuida?.nome ?? ""} semAvisos={null} />
        <Folha id="t-dep" titulo="Depois de ligar">
          <ol className="cv-passos" style={{ padding: "0 24px 22px", margin: 0 }}>
            <li><span className="disco"><span>1</span></span><span><b>{textosNovos ? "O texto vai para aprovação no WhatsApp." : "Os textos já estão aprovados."}</b><small>{textosNovos ? "A automação fica “Em aprovação no WhatsApp”. Costuma levar até 1 dia. Nada sai antes." : "Ela começa a valer na hora."}</small></span></li>
            <li><span className="disco"><span>2</span></span><span><b>Aprovado, ela começa sozinha.</b><small>Se a Meta recusar, a automação volta ao que era, com o motivo.</small></span></li>
            <li><span className="disco"><span>3</span></span><span><b>Cada execução fica no histórico.</b><small>Por cliente, com o caminho e as falhas. Desligar é um botão, a qualquer hora.</small></span></li>
          </ol>
        </Folha>
      </aside>
    </div>
  );
}

const TEXTO_EVENTO = (e: PaginaAutomacao["eventos"][number]): string => {
  const quem = e.pessoa?.nome ?? "T3jus";
  switch (e.tipo) {
    case "CRIADA": return `${quem} criou a automação.`;
    case "TEXTO_APROVADO": return `${quem} aprovou o texto “${String(e.detalhe.nome ?? "")}”.`;
    case "LIGADA": return e.detalhe.pronta ? "Versão 1, pronta do T3jus, ligada." : `${quem} ligou a versão ${String(e.detalhe.numero ?? "")}.`;
    case "EM_APROVACAO": return `${quem} ligou a versão ${String(e.detalhe.numero ?? "")}; o texto foi para a Meta.`;
    case "META_APROVOU": return `A Meta aprovou o texto; a versão ${String(e.detalhe.numero ?? "")} começou a valer.`;
    case "META_RECUSOU": return `A Meta recusou “${String(e.detalhe.nome ?? "")}”: ${String(e.detalhe.motivo ?? "")}`;
    case "DESLIGADA": return `${quem} desligou: “${String(e.detalhe.motivo ?? "")}”.`;
    case "DESLIGADA_POR_CONFLITO": return `${quem} desligou ao ligar “${String(e.detalhe.nome ?? "")}”, para não cobrar duas vezes na semana.`;
    case "SUGESTAO": return `${quem} sugeriu: “${String(e.detalhe.texto ?? "")}”.`;
  }
};

const SITUACAO_EXEC: Record<ExecucaoAutomacao["situacao"], [string, "urgente" | "implant" | "ok" | "neutro", string]> = {
  FALHOU: ["Falhou", "urgente", "alerta"],
  EM_ANDAMENTO: ["Em andamento", "implant", "relogio"],
  AGENDADA: ["Agendada", "implant", "relogio"],
  CONCLUIDA: ["Concluída", "ok", "check"],
  FICOU_DE_FORA: ["Ficou de fora", "neutro", "proibido"],
};

function Historico({ p }: { p: PaginaAutomacao }) {
  const [itens, setItens] = useState<ExecucaoAutomacao[] | "erro" | null>(null);
  const [temMais, setTemMais] = useState(false);
  const numeros = numerar(p.rascunho);
  useEffect(() => {
    let vivo = true;
    void chamarPortal<{ itens: ExecucaoAutomacao[]; temMais: boolean }>(`/v1/escritorio/automacoes/${p.id}/execucoes`).then((r) => {
      if (!vivo) return;
      setItens(r.ok ? r.dados.itens : "erro");
      if (r.ok) setTemMais(r.dados.temMais);
    });
    return () => { vivo = false; };
  }, [p.id]);
  async function mais() {
    if (!itens || itens === "erro") return;
    const r = await chamarPortal<{ itens: ExecucaoAutomacao[]; temMais: boolean }>(`/v1/escritorio/automacoes/${p.id}/execucoes?antes=${encodeURIComponent(itens.at(-1)?.iniciadaEm ?? "")}`);
    if (r.ok) { setItens([...itens, ...r.dados.itens]); setTemMais(r.dados.temMais); }
  }
  const rotuloDoPasso = (c: ExecucaoAutomacao["caminho"][number]) => {
    if (c.rotulo) return c.rotulo;
    const x = acharPasso(p.rascunho, c.passo);
    return x ? (x.tipo === "MENSAGEM" ? x.nome : `${numeros.get(x.id) ?? ""} ${TIPOS_PASSO[x.tipo].nome}`.trim()) : c.passo;
  };
  const caminho = (e: ExecucaoAutomacao) => (
    <ol className="au-path" aria-label="Caminho">
      {e.caminho.map((c, i) => <li key={i} className={c.situacao === "FALHOU" ? "x" : c.situacao === "ESPERA" ? "w" : "r"}><span>{rotuloDoPasso(c)}</span></li>)}
    </ol>
  );
  const situacao = (e: ExecucaoAutomacao, compacto: boolean) => {
    const [t, tipo, icone] = SITUACAO_EXEC[e.situacao];
    return (
      <div className="au-sit">
        <Selo tipo={tipo} icone={icone}>{t}</Selo>
        {e.motivo ? <small>{e.motivo}</small> : null}
        {e.situacao === "FALHOU" && e.responsavel ? <small>Passou para {e.responsavel.nome}.</small> : null}
        {e.situacao === "FALHOU" ? <a className={`btn btn-sec${compacto ? " btn-compacto" : ""}`} href={`${ROTAS_PORTAL.clientes}/${e.cliente.id}`}>Corrigir na ficha</a> : null}
      </div>
    );
  };
  const lista = itens && itens !== "erro" ? itens : [];
  const falha = lista.find((e) => e.situacao === "FALHOU");
  return (
    <div className="au-grade" style={{ gridTemplateColumns: "minmax(0,1fr) 360px" }}>
      <div className="au-col">
        <Folha id="t-hist" titulo="Execuções" sub="Últimos 30 dias · uma linha por cliente e origem">
          <div className="au-num">
            <div><span className="disco"><span>{p.execucoes.total}</span></span>execuções</div>
            <div><span className="disco"><span>{p.execucoes.concluidas}</span></span>concluídas</div>
            <div><span className="disco"><span>{p.execucoes.andamento}</span></span>em andamento</div>
            <div><span className={`disco${p.execucoes.falhas ? " urg" : ""}`}><span>{p.execucoes.falhas}</span></span>com falha</div>
          </div>
          {itens === "erro" ? <div className="au-pe-nota"><ErroAoCarregar oque="as execuções" aoTentar={() => setItens(null)} /></div>
            : !itens ? <div className="au-pe-nota"><Carregando rotulo="Carregando as execuções" linhas={4} /></div>
            : !lista.length ? (
              <div className="au-vazio"><Estado icone="historico" titulo="Ainda nada saiu">
                {p.situacao === "LIGADA" ? "Quando a automação rodar para um cliente, cada execução aparece aqui, com o caminho no fluxo e as falhas." : "Depois de ligada, cada execução aparece aqui, com o caminho no fluxo e as falhas."}
              </Estado></div>
            ) : (
              <>
                <table className="so-pc au-hist-tab cv-tab">
                  <caption className="sr">Execuções da automação {p.nome}</caption>
                  <colgroup><col style={{ width: "24%" }} /><col style={{ width: "17%" }} /><col style={{ width: "33%" }} /><col style={{ width: "26%" }} /></colgroup>
                  <thead><tr><th scope="col">Cliente</th><th scope="col">Começou</th><th scope="col">Caminho no fluxo</th><th scope="col">Situação</th></tr></thead>
                  <tbody>
                    {lista.map((e) => (
                      <tr key={e.id} className={e.situacao === "FALHOU" ? "falha" : undefined}>
                        <td><div className="cv-c"><strong>{e.cliente.nome}</strong><small>{e.rotulo}</small></div></td>
                        <td className="num">{quando(e.iniciadaEm)}</td>
                        <td>{caminho(e)}</td>
                        <td>{situacao(e, true)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <ul className="cartoes so-cel" aria-label="Execuções">
                  {lista.map((e) => (
                    <li key={e.id} className="cartao" style={e.situacao === "FALHOU" ? { borderColor: "var(--vinho-3)", boxShadow: "inset 3px 0 0 var(--vinho-3)" } : undefined}>
                      <div className="cv-c"><strong>{e.cliente.nome}</strong><small>{e.rotulo} · começou {quando(e.iniciadaEm)}</small></div>
                      {caminho(e)}
                      {situacao(e, false)}
                    </li>
                  ))}
                </ul>
                {temMais ? <div className="mais"><span>Mostrando {lista.length}</span><button className="btn btn-sec" type="button" onClick={() => void mais()}>Carregar mais</button></div> : null}
              </>
            )}
        </Folha>
      </div>
      <aside className="au-col" aria-label="Falhas e mudanças">
        {falha ? (
          <Folha id="t-fal" titulo="Falha precisa de alguém">
            <div className="cv-prev">
              <Aviso tom="urgencia" titulo={`${falha.cliente.nome}: ${falha.rotulo}`}>{falha.motivo}{falha.responsavel ? ` A conversa passou para ${falha.responsavel.nome}.` : ""}</Aviso>
              <a className="btn btn-sec" href={`${ROTAS_PORTAL.clientes}/${falha.cliente.id}`}><Icone nome="pessoas" className="ico" />Corrigir na ficha</a>
            </div>
          </Folha>
        ) : null}
        <Folha id="t-mud" titulo="Mudanças" sub="Nada é apagado; cada versão fica aqui">
          <ul className="au-hist" style={{ padding: "0 24px 20px", gap: 10 }}>
            {p.eventos.map((e, i) => <li key={i}><time>{diaCurto(diaDe(e.em))}</time><span>{TEXTO_EVENTO(e)}</span></li>)}
          </ul>
        </Folha>
      </aside>
    </div>
  );
}

function JanelaDesligar({ p, aoFechar, aoDesligar, falha, mudando }: { p: PaginaAutomacao; aoFechar: () => void; aoDesligar: (m: string) => void; falha: string | null; mudando: boolean }) {
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState(false);
  return (
    <Janela id="janela-desligar" aberta alerta aoFechar={aoFechar} sobretitulo={p.nome} titulo="Desligar a automação?" descricao="jd-d"
      aoEnviar={() => { if (motivo.trim().length < 3) { setErro(true); return; } aoDesligar(motivo.trim()); }}
      pe={<><button className="btn btn-fantasma" type="button" onClick={aoFechar}>Cancelar</button>
        <button className="btn btn-perigo" type="submit" disabled={mudando}><Icone nome="ligar" className="ico" />Desligar</button></>}>
      <p id="jd-d" className="ajuda">Nada sai mais por esta automação a partir de agora. O desenho, as versões e o histórico ficam guardados, e dá para ligar de novo.</p>
      {falha ? <Aviso tom="urgencia" titulo="Não desligou">{falha}</Aviso> : null}
      <div className="campo">
        <label htmlFor="jd-motivo">Motivo</label>
        <textarea className="entrada" id="jd-motivo" data-foco value={motivo} maxLength={600} onChange={(e) => { setMotivo(e.target.value); setErro(false); }}
          aria-invalid={erro || undefined} aria-describedby={descritoPor("jd-aj", erro && "jd-er")} />
        <p className="ajuda" id="jd-aj">Obrigatório. Aparece na lista e no histórico, com o seu nome e a hora.</p>
        {erro ? <ErroCampo id="jd-er">Escreva o motivo.</ErroCampo> : null}
      </div>
    </Janela>
  );
}

function JanelaSugerir({ p, aoFechar, aoFeito }: { p: PaginaAutomacao; aoFechar: () => void; aoFeito: (p: PaginaAutomacao) => void }) {
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  async function enviar() {
    if (texto.trim().length < 3) { setErro("Escreva a sugestão."); return; }
    const r = await chamarPortal<PaginaAutomacao>(`/v1/escritorio/automacoes/${p.id}/sugerir-mudanca`, { corpo: { texto: texto.trim() } });
    if (!r.ok) { setErro(textoDoErro(r.erro)); return; }
    aoFeito(r.dados);
  }
  const dona = p.quemCuida?.nome ?? "a sócia dona";
  return (
    <Janela id="janela-sugerir" aberta aoFechar={aoFechar} sobretitulo={p.nome} titulo={`Sugerir mudança a ${primeiro(dona)}`} descricao="js-d" aoEnviar={() => void enviar()}
      pe={<><button className="btn btn-fantasma" type="button" onClick={aoFechar}>Cancelar</button>
        <button className="btn btn-pri" type="submit"><Icone nome="enviar" className="ico" />Enviar sugestão</button></>}>
      <p id="js-d" className="ajuda">{dona} vê a sugestão nesta automação. O aviso no sino chega com o sino.</p>
      <div className="campo">
        <label htmlFor="js-txt">O que mudar</label>
        <textarea className="entrada" id="js-txt" data-foco value={texto} maxLength={600} onChange={(e) => { setTexto(e.target.value); setErro(null); }}
          aria-invalid={erro ? true : undefined} aria-describedby={descritoPor(erro && "js-er")} />
        {erro ? <ErroCampo id="js-er">{erro}</ErroCampo> : null}
      </div>
    </Janela>
  );
}

function Editor({ id, passo, b, aoMudou }: { id: string; passo: PassoEditor; b: string | null; aoMudou: () => void }) {
  const [p, setP] = useState<PaginaAutomacao | "erro" | null>(null);
  const [mudando, setMudando] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  const [janela, setJanela] = useState<"desligar" | "sugerir" | null>(null);
  const [feito, setFeito] = useState<Feito | null>(null);
  const [vez, setVez] = useState(0);
  useEffect(() => {
    let vivo = true;
    void chamarPortal<PaginaAutomacao>(`/v1/escritorio/automacoes/${id}`).then((r) => vivo && setP(r.ok ? r.dados : "erro"));
    return () => { vivo = false; };
  }, [id, vez]);

  if (p === "erro") {
    return <Estado icone="alerta" erro moldura titulo="Não deu para abrir esta automação" acoes={<a className="btn btn-pri" href={RAIZ}>Voltar às automações</a>}>
      Ela pode ser de uma área que você não tem, ou de outro escritório.
    </Estado>;
  }
  if (!p) return <Carregando rotulo="Carregando a automação" linhas={6} />;
  const pag = p;

  function falhou(e: ErroApi) {
    setFalha(e.codigo === "VERSION_CONFLICT" ? "Alguém mudou esta automação agora. Ela foi carregada de novo." : textoDoErro(e));
    if (e.codigo === "VERSION_CONFLICT") setVez((v) => v + 1);
  }
  async function salvar(f: Fluxo, aprovar?: string) {
    setMudando(true);
    setFalha(null);
    const r = await chamarPortal<PaginaAutomacao>(`/v1/escritorio/automacoes/${pag.id}`, { metodo: "PATCH", corpo: { versao: pag.versao, fluxo: f } });
    if (!r.ok) { setMudando(false); falhou(r.erro); return; }
    let novo = r.dados;
    if (aprovar) {
      const a = await chamarPortal<PaginaAutomacao>(`/v1/escritorio/automacoes/${pag.id}/aprovar-texto`, { corpo: { versao: novo.versao, passo: aprovar } });
      if (!a.ok) { setMudando(false); setP(novo); falhou(a.erro); return; }
      novo = a.dados;
      setFeito({ titulo: "Texto aprovado.", texto: "Ele fica fixo; só mudam os campos de cada cliente. Ao ligar, vai para a aprovação do WhatsApp." });
    }
    setMudando(false);
    setP(novo);
    aoMudou();
  }
  // F3.59: aplicar ou recusar sugestões da IA. O rascunho e o que sobra da sugestão vão juntos.
  async function decidir(acao: "aplicar" | "recusar", escolha: string[] | "TUDO") {
    if (!pag.sugestao) return;
    setMudando(true);
    setFalha(null);
    const corpo = acao === "aplicar"
      ? (() => { const r = aplicarSugestao(pag.rascunho, pag.sugestao, escolha); return { versao: pag.versao, fluxo: r.fluxo, sugestao: r.sobra ? { fluxo: r.sobra } : null }; })()
      : (() => { const sobra = recusarSugestao(pag.rascunho, pag.sugestao, escolha); return { versao: pag.versao, sugestao: sobra ? { fluxo: sobra } : null }; })();
    const r = await chamarPortal<PaginaAutomacao>(`/v1/escritorio/automacoes/${pag.id}`, { metodo: "PATCH", corpo });
    setMudando(false);
    if (!r.ok) { falhou(r.erro); return; }
    setP(r.dados);
    aoMudou();
    if (escolha === "TUDO") {
      setFeito(acao === "aplicar"
        ? { titulo: "Sugestões aplicadas.", texto: r.dados.listaErros.length ? "Estão no rascunho. Ajuste os passos marcados antes de testar." : "Estão no rascunho. Agora é testar sem enviar." }
        : { titulo: "Sugestões recusadas.", texto: "O rascunho ficou como estava." });
    }
  }
  async function ligar(d: { revisou: boolean; desligarConflitos: boolean; entramJaAtrasados: boolean }) {
    setMudando(true);
    setFalha(null);
    const r = await chamarPortal<PaginaAutomacao>(`/v1/escritorio/automacoes/${pag.id}/ligar`, { corpo: { versao: pag.versao, ...d } });
    setMudando(false);
    if (!r.ok) { falhou(r.erro); return; }
    setP(r.dados);
    setFeito(r.dados.situacao === "LIGADA"
      ? { titulo: "Automação ligada.", texto: "Ela já vale. Cada execução aparece no Histórico." }
      : { titulo: "Enviada para a aprovação do WhatsApp.", texto: "Costuma levar até 1 dia. Aprovada, ela começa sozinha." });
  }
  async function desligar(motivo: string) {
    setMudando(true);
    setFalha(null);
    const r = await chamarPortal<PaginaAutomacao>(`/v1/escritorio/automacoes/${pag.id}/desligar`, { corpo: { versao: pag.versao, motivo } });
    setMudando(false);
    if (!r.ok) { falhou(r.erro); return; }
    setJanela(null);
    setP(r.dados);
    setFeito({ titulo: "Automação desligada.", texto: "Nada mais sai por ela. Dá para ligar de novo em Ligar." });
  }

  const sobre = pag.origem === "PRONTA" ? "Automação · pronta do T3jus" : `Automação · ${passo === "testar" ? "teste sem enviar" : passo === "ligar" ? "ligar" : passo === "historico" ? "histórico" : pag.eventos.some((e) => e.tipo === "CRIADA" && e.detalhe.ia) ? `criada com a IA ${diaDe(pag.criadaEm) === diaDe(new Date().toISOString()) ? "hoje" : `em ${diaCurto(diaDe(pag.criadaEm))}`}` : `criada por ${primeiro(pag.criadaPor?.nome)} em ${diaCurto(diaDe(pag.criadaEm))}`}`;
  const acoes = passo === "historico" || passo === "ligar"
    ? (pag.dono && (pag.situacao === "LIGADA" || pag.situacao === "EM_APROVACAO")
      ? <button className="btn btn-sec" type="button" onClick={() => { setFalha(null); setJanela("desligar"); }}><Icone nome="ligar" className="ico" />Desligar</button> : null)
    : passo === "testar"
      ? <a className="btn btn-pri" href={hrefAutomacao({ a: pag.id, passo: "ligar" })}><Icone nome="ligar" className="ico" />Seguir para ligar</a>
      : pag.listaErros.length
        ? <span className="btn btn-sec" role="link" aria-disabled="true"><Icone nome="olho" className="ico" />Testar sem enviar</span>
        : <a className="btn btn-sec" href={hrefAutomacao({ a: pag.id, passo: "testar" })}><Icone nome="olho" className="ico" />Testar sem enviar</a>;
  const bloqueado = ((passo === "testar" || passo === "ligar") && pag.listaErros.length > 0)
    || (passo === "ligar" && passosSugeridos(pag.rascunho, pag.sugestao).size > 0);
  return (
    <div className="au">
      <CabEditor p={pag} sobre={sobre} acoes={acoes} />
      <Passos p={pag} atual={bloqueado ? "montar" : passo} />
      {bloqueado || passo === "montar"
        ? <Montar p={pag} b={b} mudando={mudando} falha={falha} aoSalvar={(f, a) => void salvar(f, a)} aoSugerir={() => setJanela("sugerir")}
            aoDecidir={(a, e) => void decidir(a, e)} aoNova={(n) => { setP(n); setFalha(null); aoMudou(); }} />
        : passo === "testar" ? <Testar p={pag} />
        : passo === "ligar" ? <Ligar p={pag} mudando={mudando} falha={falha} aoLigar={(d) => void ligar(d)} aoSugerir={() => setJanela("sugerir")} />
        : <Historico p={pag} />}
      {janela === "desligar" ? <JanelaDesligar p={pag} falha={falha} mudando={mudando} aoFechar={() => setJanela(null)} aoDesligar={(m) => void desligar(m)} /> : null}
      {janela === "sugerir" ? <JanelaSugerir p={pag} aoFechar={() => setJanela(null)} aoFeito={(n) => { setJanela(null); setP(n); setFeito({ titulo: "Sugestão enviada.", texto: `${pag.quemCuida?.nome ?? "A sócia dona"} vê a sugestão nesta automação.` }); }} /> : null}
      {feito ? <Toast feito={feito} aoFechar={() => setFeito(null)} /> : null}
    </div>
  );
}

// ------------------------------------------------------------------------------- página

export function AutomacoesPortal() {
  const { escritorio, erro: erroEsc, recarregar } = useEscritorioPortal();
  const [end, setEnd] = useState<Endereco | null>(null);
  const [lista, setLista] = useState<ListaAutomacoes | "erro" | null>(null);
  const [vez, setVez] = useState(0);
  const [nome, setNome] = useState<string | null>(null);

  useEffect(() => {
    const ler = () => setEnd(lerEndereco());
    void Promise.resolve().then(ler);
    window.addEventListener("popstate", ler);
    return () => window.removeEventListener("popstate", ler);
  }, []);
  useEffect(() => {
    let vivo = true;
    void chamarPortal<ListaAutomacoes>("/v1/escritorio/automacoes").then((r) => vivo && setLista(r.ok ? r.dados : "erro"));
    return () => { vivo = false; };
  }, [vez]);
  useEffect(() => {
    const nomeAtual = end?.a && lista && lista !== "erro" ? lista.automacoes.find((x) => x.id === end.a)?.nome ?? null : null;
    void Promise.resolve().then(() => setNome(nomeAtual));
  }, [end, lista]);

  function ir(e: Partial<Endereco>) {
    const url = hrefAutomacao(e);
    window.history.pushState(null, "", url);
    setEnd(lerEndereco());
    window.scrollTo({ top: 0 });
  }
  // Os links internos da tela mudam o endereço sem recarregar.
  function aoClicar(ev: React.MouseEvent) {
    const a = (ev.target as HTMLElement).closest("a");
    if (!a || ev.metaKey || ev.ctrlKey || ev.shiftKey || a.target) return;
    const href = a.getAttribute("href") ?? "";
    if (!href.startsWith(RAIZ)) return;
    ev.preventDefault();
    const q = new URLSearchParams(href.split("?")[1] ?? "");
    const p = q.get("passo");
    const manter = end?.a === q.get("a") && (p ?? "montar") === end?.passo;
    window.history.pushState(null, "", href);
    setEnd(lerEndereco());
    if (!manter) window.scrollTo({ top: 0 });
    const b = q.get("b");
    if (b) void Promise.resolve().then(() => document.getElementById("bl-t")?.closest("section")?.querySelector<HTMLElement>("[data-foco]")?.focus());
  }

  const trilha = [{ nome: "Conversas", href: ROTAS_CONVERSAS.mensagens }, ...(end?.a ? [{ nome: "Automações", href: RAIZ }, { nome: nome ?? "Automação" }] : [{ nome: "Automações" }])];
  let miolo: ReactNode;
  if (erroEsc || lista === "erro") miolo = <ErroAoCarregar oque="as automações" aoTentar={() => { recarregar(); setVez((v) => v + 1); }} />;
  else if (!end || !lista) miolo = <Carregando rotulo="Carregando as automações" linhas={6} />;
  else if (end.a) miolo = <Editor key={end.a} id={end.a} passo={end.passo} b={end.b} aoMudou={() => setVez((v) => v + 1)} />;
  else miolo = <Lista l={lista} aoAbrir={(id) => { setVez((v) => v + 1); ir({ a: id }); }} />;
  return (
    <MolduraPortal atual="conversas" trilha={trilha} escritorio={escritorio} pagina="co-equipe co-carteira"
      barra={<BarraConversas secao="automacoes" esperando={escritorio?.conversasEsperando ?? 0} />}>
      <div onClickCapture={aoClicar}>{miolo}</div>
    </MolduraPortal>
  );
}
