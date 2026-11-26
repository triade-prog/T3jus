"use client";
// Financeiro do Portal, Repasses (FI-05, FI-06, FI-12), desenho aprovado em
// docs/design/aprovadas/portal-financeiro (estados repasses, registrar-rpv, repasse e prestacao;
// decisões 10 a 12). Alvará, RPV, precatório e depósito de acordo entram como valor de terceiros,
// na faixa âmbar, separados do caixa do escritório. A divisão sai do contrato do cliente no caso
// e pode ser ajustada antes de registrar; a soma fecha com o valor levantado. Cada parte tem
// prazo (3 dias úteis) e é feita ou dispensada com motivo. A prestação de contas é montada do
// registro e, por enquanto, vai pelo WhatsApp do aparelho; o envio pelo WhatsApp do escritório,
// com o "lida", vem com Conversas.

import { useEffect, useRef, useState, type MouseEvent } from "react";
import {
  contaPrestacao, dataBr, hojeBrasilia, TIPOS_REQUISICAO, MOTIVOS_ATRASO_REPASSE, PARA_ACRESCENTAR, PARA_DESTINACAO, reais, somarDiasUteis, textoPrestacaoContas, TIPOS_LEVANTAMENTO,
  type Destinacao, type ExitoBaixado, type MotivoAtrasoRepasse, type RequisicaoACaminho, type FichaRepasse, type PendenciaCaso, type Levantamento, type ListaRepasses, type ParaDestinacao, type PropostaRepasse, type TipoLevantamento,
} from "@t3jus/domain";
import { textoDoErro } from "../api.ts";
import { Icone } from "../Icone.tsx";
import { formatarTelefone } from "../console/ficha.ts";
import { Aviso, Carregando, descritoPor, ErroAoCarregar, ErroCampo, Estado, faltaAcertar, focarPrimeiroErro, Janela } from "../console/pecas.tsx";
import { contar, diaBr, diaCurto, lerDia, nomeDoMes } from "./agenda.ts";
import { Selo, useCarga } from "./Comercial.tsx";
import { primeiroNome } from "./equipe.ts";
import { Toast } from "./FichaCliente.tsx";
import { quando, ROTAS_FINANCEIRO, situacaoPrestacao } from "./financeiro.ts";
import { centavos as lerCentavos } from "./honorarios.ts";
import { chamarPortal } from "./Moldura.tsx";
import { MolduraArea } from "./MolduraArea.tsx";
import { FolhaACaminho, JanelaExpedido, JanelaDataRequisicao, mesAno } from "./ACaminho.tsx";
import { ItemParcelas, JanelaFechamento, textoJaEncerradoPorOutro } from "./FechamentoCaso.tsx";
import { rotuloRepasse, type Atalho } from "./fechamento.ts";
import {
  conflitoDoExito, errosDoExito, nomeDoLevantamento, porQueDesfazer, quemRegistrou, TEXTO_EXITO_DESFEITO, textoExitoBaixado, textoExitoMantido, tituloErrosExito,
  type EscolhaExito,
} from "./baixa.ts";
import { ROTAS_CONTRATOS } from "./contratos.ts";
import { atrasada, FolhaQuemCuida, JanelaAnotarAtraso, JanelaTrocarResponsavel, NotaAtraso, SeloAtraso } from "./RepasseCuida.tsx";

type Feito = { titulo: string; texto: string };
const fuso = { timeZone: "America/Sao_Paulo" } as const;
const diaDoInstante = (em: string) => new Intl.DateTimeFormat("en-CA", { ...fuso, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(em));
const horaDoInstante = (em: string) => new Intl.DateTimeFormat("pt-BR", { ...fuso, hour: "2-digit", minute: "2-digit" }).format(new Date(em)).replace(":", "h");
const ORDEM_TIPOS = Object.keys(TIPOS_LEVANTAMENTO) as TipoLevantamento[];
const paraCampo = (c: number) => reais(c).replace(/^R\$\s?/, "");
const pendente = (d: Destinacao) => d.situacao === "PENDENTE";

/** O que a parte é, numa linha: "Cliente · o que fica para ele", "Escritório · 30% · ...". */
function quemE(d: Destinacao): string {
  if (d.para === "CLIENTE") return "Cliente · o que fica para ele";
  const lado = d.escritorio ? "Escritório" : PARA_DESTINACAO[d.para];
  return d.regra ? `${lado} · ${d.regra}` : lado;
}

/** A situação da parte em palavras: feita, dispensada, no prazo ou atrasada. */
export function SeloDestinacao({ d, hoje }: { d: Destinacao; hoje: string }) {
  if (d.situacao === "FEITO") return <Selo tom="ok" icone="check">{d.escritorio ? "Transferido" : "Repassado"} {diaCurto(d.feitoEm!)}</Selo>;
  if (d.situacao === "DISPENSADO") return <Selo tom="neutro">Dispensado</Selo>;
  if (d.prazo < hoje) return <SeloAtraso d={d} />;
  return <Selo tom={d.prazo === hoje ? "atencao" : "neutro"} icone={d.prazo === hoje ? "relogio" : undefined}>Até {diaCurto(d.prazo)}</Selo>;
}

function SeloFeitos({ l, hoje }: { l: Pick<Levantamento, "feitos" | "total" | "destinacoes">; hoje: string }) {
  const atraso = l.destinacoes.some((d) => pendente(d) && d.prazo < hoje);
  const tudo = l.feitos === l.total;
  return (
    <Selo tom={tudo ? "ok" : atraso ? "urgente" : "atencao"} icone={tudo ? "check" : atraso ? "alerta" : undefined}>
      {l.feitos} de {l.total} feitos
    </Selo>
  );
}

function CabRepasses({ aoRegistrar, aoExpedido }: { aoRegistrar?: () => void; aoExpedido?: () => void }) {
  return (
    <div className="pt-cab">
      <div>
        <p className="sobretitulo">Financeiro</p>
        <h1>Repasses</h1>
        <span className="fio" aria-hidden="true" />
        <p className="lede">Dinheiro de terceiros que entra pelo escritório: quanto é de cada um, o que já foi repassado, o que falta e o que ainda está a caminho.</p>
      </div>
      {aoRegistrar ? (
        <span className="rv-cab-bot" style={{ marginBottom: 6 }}>
          {aoExpedido ? (
            <button className="btn btn-sec" type="button" onClick={aoExpedido}><Icone nome="balanca" className="ico" />Registrar RPV expedido</button>
          ) : null}
          <button className="btn btn-pri" type="button" onClick={aoRegistrar}>
            <Icone nome="escudo" className="ico" />
            Registrar alvará ou RPV
          </button>
        </span>
      ) : null}
    </div>
  );
}

function ComoFunciona({ prazo }: { prazo: number }) {
  const dias = prazo === 1 ? "1 dia útil" : `${prazo} dias úteis`;
  return (
    <section className="explica campo-ambar" aria-labelledby="t-rp-cf">
      <p className="sobretitulo">Como funciona</p>
      <h2 id="t-rp-cf">Nada fica parado sem dono.</h2>
      <ul>
        <li><Icone nome="escudo" className="ico" /><span>Alvará, RPV, precatório e depósito de acordo entram como <b>valor de terceiros</b>, separados do caixa do escritório.</span></li>
        <li><Icone nome="pena" className="ico" /><span>O sistema propõe a divisão pelo contrato: honorários, reembolsos do caso e o que fica para o cliente. Perito e parceiro entram à mão.</span></li>
        <li><Icone nome="relogio" className="ico" /><span>Cada parte tem prazo: <b>{dias}</b> depois que o dinheiro entra, sem contar sábado, domingo e feriado nacional. Quem muda é a sócia dona, em Escritório › Ajustes do financeiro.</span></li>
        <li><Icone nome="alerta" className="ico" /><span>Passou do prazo, a parte fica atrasada até ser feita. Anote o motivo e a próxima ação, como na cobrança das parcelas. O que não vai acontecer se dispensa com o motivo.</span></li>
        <li><Icone nome="pessoas" className="ico" /><span>Cada repasse tem quem cuida: no começo, o responsável pelo contrato. Dá para trocar na ficha do repasse.</span></li>
        <li><Icone nome="whats" className="ico" /><span>A prestação de contas vai ao cliente pelo WhatsApp, depois que alguém revisa.</span></li>
      </ul>
    </section>
  );
}

// ------------------------------------------------------------------------- Lista

function Bloco({ l, hoje, prazo, eu, aoFeito, aoDispensar, aoPrestacao, aoAnotar }: {
  l: Levantamento; hoje: string; prazo: number; eu: string;
  aoFeito: (l: Levantamento, d: Destinacao) => void; aoDispensar: (l: Levantamento, d: Destinacao) => void; aoPrestacao: (l: Levantamento) => void;
  aoAnotar?: (l: Levantamento, d: Destinacao) => void;
}) {
  const t = `t-lv-${l.id}`;
  const feitas = l.destinacoes.filter((d) => d.situacao === "FEITO");
  return (
    <section className="folha fi-terc" aria-labelledby={t}>
      <div className="fi-terc-cab"><Icone nome="escudo" className="ico" />De terceiros · {TIPOS_LEVANTAMENTO[l.tipo]}</div>
      <div className="folha-cab">
        <div>
          <h2 id={t}><a className="fi-h2-link" href={ROTAS_FINANCEIRO.repasse(l.id)}>{l.cliente.nome}</a></h2>
          <p className="sub">{l.caso.nome}{l.caso.parteContraria ? ` × ${l.caso.parteContraria}` : ""} · entrou em {diaCurto(l.entrouEm)}</p>
          <p className="rp-resp"><Icone nome="pessoas" className="ico" /><span>Cuida: <b>{l.responsavel.nome}{l.responsavel.id === eu ? " (você)" : ""}</b></span></p>
        </div>
        <div className="fi-lado">
          <span className="fi-v forte num">{reais(l.valor)}</span>
          <SeloFeitos l={l} hoje={hoje} />
        </div>
      </div>
      <ul className="fi-linhas">
        {l.destinacoes.map((d) => (
          <li key={d.id} className={atrasada(d, hoje) ? "fi-linha rp-linha pz-linha-atraso" : "fi-linha rp-linha"}>
            <div className="fi-quem">
              <strong>{d.nome}</strong>
              <small>{quemE(d)}</small>
              {d.para === "CLIENTE" ? (
                <p className="fi-prox"><Icone nome="whats" className="ico" />Prestação de contas: <b>{l.prestacao ? situacaoPrestacao(l.prestacao) : l.prestacaoEm ? `enviada em ${diaCurto(diaDoInstante(l.prestacaoEm))}` : "ainda não enviada"}</b></p>
              ) : null}
              {d.dispensa ? <p className="fi-prox"><Icone nome="alerta" className="ico" />Dispensado: <b>{d.dispensa.motivo}</b></p> : null}
              <NotaAtraso d={d} hoje={hoje} prazoDias={prazo} aoAnotar={aoAnotar ? (x) => aoAnotar(l, x) : undefined} />
            </div>
            <div className="fi-lado">
              <span className="fi-v num">{reais(d.valor)}</span>
              <SeloDestinacao d={d} hoje={hoje} />
              {pendente(d) ? (
                <div className="rp-acoes">
                  <button className="btn btn-sec btn-compacto" type="button" onClick={() => aoFeito(l, d)} aria-label={`Feito: registrar o repasse de ${d.nome}`}>
                    Feito
                  </button>
                  {d.para !== "CLIENTE" ? (
                    <button className="btn btn-fantasma btn-compacto" type="button" onClick={() => aoDispensar(l, d)} aria-label={`Dispensar o repasse de ${d.nome}`}>
                      Dispensar
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      <div className="mais">
        <span>
          {feitas.length ? `${contar(feitas.length, "parte feita", "partes feitas")}.` : "Nada repassado ainda."} O prazo do escritório é de {prazo === 1 ? "1 dia útil" : `${prazo} dias úteis`}.
        </span>
        <span className="rp-acoes">
          <button className="btn btn-sec" type="button" onClick={() => aoPrestacao(l)}>
            <Icone nome="whats" className="ico" />Prestação de contas<span className="sr"> a {l.cliente.nome}</span>
          </button>
          <a className="btn btn-pri" href={ROTAS_FINANCEIRO.repasse(l.id)}>
            Abrir o repasse<span className="sr"> de {l.cliente.nome}</span><Icone nome="dir" className="ico" />
          </a>
        </span>
      </div>
    </section>
  );
}

function RepassesConteudo({ escritorio, temContratos }: { escritorio: string; temContratos: boolean }) {
  const hoje = hojeBrasilia();
  const { dados, recarregar } = useCarga<ListaRepasses>("/v1/escritorio/financeiro/repasses");
  const [registrar, setRegistrar] = useState(false);
  // Vindo dos primeiros passos do Resumo (?registrar=1), a janela já abre.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (!q.has("registrar")) return;
    q.delete("registrar");
    window.history.replaceState(null, "", `${window.location.pathname}${q.size ? `?${q}` : ""}`);
    void Promise.resolve().then(() => setRegistrar(true));
  }, []);
  const [feitoEm, setFeitoEm] = useState<{ l: Levantamento; d: Destinacao } | null>(null);
  const [dispensar, setDispensar] = useState<{ l: Levantamento; d: Destinacao } | null>(null);
  const [prestacao, setPrestacao] = useState<Levantamento | null>(null);
  const [anotar, setAnotar] = useState<{ l: Levantamento; d: Destinacao } | null>(null);
  const [quem, setQuem] = useState<string>("TODOS");
  const [expedido, setExpedido] = useState(false);
  const [mudarData, setMudarData] = useState<RequisicaoACaminho | null>(null);
  const [entrou, setEntrou] = useState<RequisicaoACaminho | null>(null);
  const [feito, setFeito] = useState<Feito | null>(null);
  const terminar = (f: Feito) => {
    setExpedido(false);
    setMudarData(null);
    setEntrou(null);
    setAnotar(null);
    setRegistrar(false);
    setFeitoEm(null);
    setDispensar(null);
    setPrestacao(null);
    setFeito(f);
    recarregar();
  };
  const janelas = (
    <>
      {anotar && dados && dados !== "erro" ? (
        <JanelaAnotarAtraso d={anotar.d} l={anotar.l} pessoas={dados.podemCuidar} responsavelId={anotar.l.responsavel.id} hoje={hoje}
          aoFechar={() => setAnotar(null)} aoFeito={terminar} />
      ) : null}
      {registrar && dados && dados !== "erro" ? <JanelaRegistrar casos={dados.casos} prazoDias={dados.prazoDias} temContratos={temContratos} aoFechar={() => setRegistrar(false)} aoFeito={terminar} /> : null}
      {entrou && dados && dados !== "erro" ? <JanelaRegistrar casos={dados.casos} prazoDias={dados.prazoDias} temContratos={temContratos} de={entrou} aoFechar={() => setEntrou(null)} aoFeito={terminar} /> : null}
      {expedido && dados && dados !== "erro" ? <JanelaExpedido casos={dados.casos} aoFechar={() => setExpedido(false)} aoFeito={terminar} /> : null}
      {mudarData ? <JanelaDataRequisicao r={mudarData} hoje={hoje} aoFechar={() => setMudarData(null)} aoFeito={terminar} /> : null}
      {feitoEm ? <JanelaFeito l={feitoEm.l} d={feitoEm.d} aoFechar={() => setFeitoEm(null)} aoFeito={terminar} /> : null}
      {dispensar ? <JanelaDispensar d={dispensar.d} aoFechar={() => setDispensar(null)} aoFeito={terminar} /> : null}
      {prestacao ? <JanelaPrestacao l={prestacao} escritorio={escritorio} aoFechar={() => setPrestacao(null)} aoFeito={terminar} /> : null}
      {feito ? <Toast feito={feito} aoFechar={() => setFeito(null)} /> : null}
    </>
  );

  if (dados === "erro") return <div className="fi"><CabRepasses /><ErroAoCarregar oque="os repasses" aoTentar={recarregar} /></div>;
  if (!dados) return <div className="fi"><CabRepasses /><Carregando rotulo="Carregando os repasses…" linhas={5} /></div>;
  const t = dados.totais;
  const mes = nomeDoMes(dados.hoje);
  // Os filtros por quem cuida: Todos, Os meus e cada outra pessoa que cuida de algum repasse aberto.
  const outros = [...new Map(dados.levantamentos.filter((l) => l.responsavel.id !== dados.eu).map((l) => [l.responsavel.id, l.responsavel])).values()]
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const chips = [
    { chave: "TODOS", rotulo: "Todos", n: dados.levantamentos.length },
    { chave: "EU", rotulo: "Os meus", n: dados.levantamentos.filter((l) => l.responsavel.id === dados.eu).length },
    ...outros.map((p) => ({ chave: p.id, rotulo: primeiroNome(p.nome), n: dados.levantamentos.filter((l) => l.responsavel.id === p.id).length })),
  ];
  const visiveis = dados.levantamentos.filter((l) => quem === "TODOS" || (quem === "EU" ? l.responsavel.id === dados.eu : l.responsavel.id === quem));
  return (
    <div className="fi">
      <CabRepasses aoRegistrar={() => setRegistrar(true)} aoExpedido={dados.podeEditar ? () => setExpedido(true) : undefined} />
      <div className="fi-nums" role="group" aria-label="Números dos repasses">
        <a href="#t-blocos">
          <span className="r">A repassar</span>
          <b className="num">{reais(t.aRepassar)}</b>
          <small>{t.repassesPendentes ? contar(t.repassesPendentes, "repasse", "repasses") : "nenhum"}</small>
        </a>
        <a href="#t-blocos">
          <span className="r"><Icone nome="alerta" className="ico" />Atrasados</span>
          <b className="num">{reais(t.atrasados)}</b>
          <small>
            {t.repassesAtrasados
              ? `${contar(t.repassesAtrasados, "repasse", "repasses")} · ${t.semMotivo ? `${t.semMotivo} sem motivo` : "todos com motivo"}`
              : "nenhum"}
          </small>
        </a>
        <a href="#t-blocos">
          <span className="r">Honorários a transferir</span>
          <b className="num">{reais(t.honorarios)}</b>
          <small>para a conta do escritório</small>
        </a>
        <a href="#t-cam">
          <span className="r">A caminho</span>
          <b className="num">{reais(dados.aCaminho.total)}</b>
          <small>{dados.aCaminho.n ? "do escritório, em RPV e precatório" : "nenhum RPV ou precatório"}</small>
        </a>
      </div>
      <div className="fi-grade">
        <div className="fi-col">
          <h2 id="t-blocos" className="sr" tabIndex={-1}>Valores esperando repasse</h2>
          {chips.length > 2 || dados.levantamentos.some((l) => l.responsavel.id !== dados.eu) ? (
            <div className="rp-filtro">
              <div className="chips rp-chips" role="group" aria-label="Quem cuida">
                {chips.map((c) => (
                  <button key={c.chave} type="button" aria-pressed={quem === c.chave} onClick={() => setQuem(c.chave)}>{c.rotulo} ({c.n})</button>
                ))}
              </div>
            </div>
          ) : null}
          {visiveis.length ? (
            visiveis.map((l) => (
              <Bloco key={l.id} l={l} hoje={hoje} prazo={dados.prazoDias} eu={dados.eu}
                aoFeito={(lv, d) => setFeitoEm({ l: lv, d })} aoDispensar={(lv, d) => setDispensar({ l: lv, d })} aoPrestacao={setPrestacao}
                aoAnotar={dados.podeEditar ? (lv, d) => setAnotar({ l: lv, d }) : undefined} />
            ))
          ) : dados.levantamentos.length ? (
            <section className="folha" aria-label="Nada neste filtro" style={{ overflow: "hidden" }}>
              <Estado icone="pessoas" titulo="Nenhum repasse aqui" acoes={<button className="btn btn-sec" type="button" onClick={() => setQuem("TODOS")}>Ver todos</button>}>
                Ninguém deste filtro cuida de um repasse aberto agora.
              </Estado>
            </section>
          ) : (
            <section className="folha" aria-label="Nada a repassar" style={{ overflow: "hidden" }}>
              <Estado icone="escudo" titulo={dados.algum ? "Nada esperando repasse" : "Nenhum alvará ou RPV registrado ainda"}
                acoes={<button className="btn btn-pri" type="button" onClick={() => setRegistrar(true)}><Icone nome="escudo" className="ico" />Registrar alvará ou RPV</button>}>
                {dados.algum
                  ? "Tudo o que entrou já foi repassado ou dispensado com motivo."
                  : "Quando um alvará, RPV, precatório ou depósito de acordo entrar na conta do escritório, registre aqui. O T3jus propõe a divisão pelo contrato."}
              </Estado>
            </section>
          )}
          <FolhaACaminho a={dados.aCaminho} aoRegistrar={dados.podeEditar ? () => setExpedido(true) : undefined}
            aoData={dados.podeEditar ? setMudarData : undefined} aoEntrou={dados.podeEditar ? setEntrou : undefined} />
        </div>
        <aside className="fi-col" aria-label="Como funciona e repassados">
          <ComoFunciona prazo={dados.prazoDias} />
          <section className="folha fi-terc" aria-labelledby="t-repassados" style={{ overflow: "hidden" }}>
            <div className="fi-terc-cab"><Icone nome="escudo" className="ico" />De terceiros · não é do escritório</div>
            <div className="folha-cab">
              <div><h2 id="t-repassados" tabIndex={-1}><Icone nome="check" className="ico" />Repassado em {mes}</h2></div>
            </div>
            {dados.repassados.length ? (
              <>
                <ul className="fi-linhas">
                  {dados.repassados.map((r, i) => (
                    <li key={`${r.levantamentoId}-${i}`} className="fi-linha" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
                      <div className="fi-quem">
                        <a href={ROTAS_FINANCEIRO.repasse(r.levantamentoId)}>{r.cliente}</a>
                        <small>{TIPOS_LEVANTAMENTO[r.tipo]} · repassado em {diaCurto(r.feitoEm)}</small>
                      </div>
                      <span className="fi-v num">{reais(r.valor)}</span>
                    </li>
                  ))}
                </ul>
                <p className="fi-total"><span>{contar(dados.repassadoMes.clientes, "cliente recebeu", "clientes receberam")} valores</span><b className="num">{reais(dados.repassadoMes.valor)}</b></p>
              </>
            ) : (
              <p className="fi-cob-sem">Nenhum repasse a cliente em {mes} ainda.</p>
            )}
          </section>
        </aside>
      </div>
      {janelas}
    </div>
  );
}

export function RepassesFinanceiro() {
  return <MolduraArea area="FINANCEIRO" secao="repasses">{(e) => <RepassesConteudo escritorio={e.nome} temContratos={e.areas.includes("CONTRATOS")} />}</MolduraArea>;
}

// ------------------------------------------------------------------------- Registrar alvará ou RPV

type LinhaTela = { chave: string; para: ParaDestinacao; nome: string; regra: string | null; valor: string; contaId?: string; proposta: boolean };

/** F3.174 (decisão 4): a escolha muda a divisão. "Manter" tira os honorários propostos (e as custas que
 *  voltariam); "Desfazer" põe de volta os honorários, com o valor proposto, e as custas que tiveram
 *  baixa junto, como reembolso (pergunta A2). */
function linhasDaEscolha(ls: LinhaTela[], base: LinhaTela[], escolha: EscolhaExito, eb: ExitoBaixado): LinhaTela[] {
  const custa = (c: string) => `eb-c-${c}`;
  if (escolha === "MANTER") return ls.filter((x) => !(x.proposta && x.para === "HONORARIOS") && !x.chave.startsWith("eb-c-"));
  const hon = base.filter((b) => b.para === "HONORARIOS" && !ls.some((x) => x.chave === b.chave));
  const custas = eb.baixa.reembolsos.filter((r) => !ls.some((x) => x.chave === custa(r.contaId))).map((r): LinhaTela => ({
    chave: custa(r.contaId), para: "REEMBOLSO", nome: `Reembolso: ${r.descricao}`, regra: "Tinham baixa junto com o êxito; voltam a ser cobradas",
    valor: paraCampo(r.valor), contaId: r.contaId, proposta: true,
  }));
  return [...hon, ...ls, ...custas];
}

/** O "R$" nunca se separa do número (NOTAS do desenho, acessibilidade). */
function comValores(t: string) {
  return t.split(/(R\$\s?[\d.]+,\d{2})/).map((x, i) => (i % 2 ? <span key={i} className="eb-num">{x}</span> : x));
}

function JanelaRegistrar({ casos, prazoDias, de, temContratos, aoFechar, aoFeito }: {
  casos: ListaRepasses["casos"]; prazoDias: number; aoFechar: () => void; aoFeito: (f: Feito) => void;
  /** "Entrou na conta" de um RPV ou precatório a caminho (F3.48): já vem preenchida e liga os dois. */
  de?: RequisicaoACaminho;
  /** Quem vê tem a área Contratos (o link "Mudar as condições do contrato" da renegociada). */
  temContratos?: boolean;
}) {
  const hoje = hojeBrasilia();
  const opcoes = casos.flatMap((c) => (c.clientes ?? []).map((k) => ({ valor: `${c.id}|${k.id}`, rotulo: `${k.nome} · ${c.nome}`, cliente: k.nome })));
  const [tipo, setTipo] = useState<TipoLevantamento | "">(de ? de.tipo : "");
  const [alvo, setAlvo] = useState(de ? `${de.caso.id}|${de.cliente.id}` : opcoes.length === 1 ? opcoes[0]!.valor : "");
  const [valor, setValor] = useState("");
  const [dia, setDia] = useState(diaBr(hoje));
  const [div, setDiv] = useState<{
    chave: string; contrato: PropostaRepasse["contrato"]; linhas: LinhaTela[]; base: LinhaTela[]; exito?: PropostaRepasse["exito"]; exitoBaixado: ExitoBaixado[];
  } | null>(null);
  const [erros, setErros] = useState<string[]>([]);
  const [futuro, setFuturo] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  // F3.174: a escolha do êxito baixado, o "Por que desfazer" e o conflito (EXITO_MUDOU).
  const [escolha, setEscolha] = useState<EscolhaExito | null>(null);
  const [porque, setPorque] = useState("");
  const [conflito, setConflito] = useState<{ titulo: string; texto: string } | null>(null);
  const [recarga, setRecarga] = useState(0);
  // Decisão 8: o segundo clique, antes de o React desenhar o "Registrando…", não envia de novo.
  const saindo = useRef(false);
  const corpo = useRef<HTMLDivElement>(null);
  const seq = useRef(0);
  const tem = (c: string) => erros.includes(c);
  const total = lerCentavos(valor);
  const [casoId, clienteId] = alvo ? alvo.split("|") : [null, null];
  const nomeCliente = opcoes.find((o) => o.valor === alvo)?.cliente ?? "o cliente";
  const pn = primeiroNome(nomeCliente);
  // A divisão vale para o caso, o cliente e o valor escritos; mudou um deles, vem outra proposta.
  const chaveAtual = casoId && clienteId && total ? `${alvo}|${total}` : null;
  const linhas = div && div.chave === chaveAtual ? div.linhas : null;
  const contrato = linhas ? div!.contrato : null;
  const buscando = !!chaveAtual && !linhas;
  const setLinhas = (f: (ls: LinhaTela[]) => LinhaTela[]) => setDiv((d) => (d ? { ...d, linhas: f(d.linhas) } : d));
  const eb = linhas ? div!.exitoBaixado[0] ?? null : null;
  const soDesfazer = eb?.baixa.motivo === "RENEGOCIADA";
  const txEb = eb ? textoExitoBaixado(eb, nomeCliente, tipo || null) : null;
  const msgEb = eb ? errosDoExito(null, "", nomeCliente, soDesfazer).exito : undefined;
  const honProposto = div?.base.find((x) => x.para === "HONORARIOS");

  // A proposta pelo contrato, quando o caso, o cliente e o valor estão escritos.
  useEffect(() => {
    if (!chaveAtual) return;
    const n = ++seq.current;
    void chamarPortal<PropostaRepasse>("/v1/escritorio/financeiro/repasses/proposta", { metodo: "POST", corpo: { casoId, clienteId, valor: total } }).then((r) => {
      if (n !== seq.current) return;
      const linhasProposta = r.ok
        ? r.dados.linhas.map((x, i) => ({ chave: `p${i}`, para: x.para, nome: x.nome, regra: x.regra, valor: paraCampo(x.valor), contaId: x.contaId, proposta: true }))
        : [];
      setEscolha(null);
      setPorque("");
      setDiv({ chave: chaveAtual, contrato: r.ok ? r.dados.contrato : null, linhas: linhasProposta, base: linhasProposta,
        exito: r.ok ? r.dados.exito : undefined, exitoBaixado: r.ok ? r.dados.exitoBaixado ?? [] : [] });
    });
  }, [chaveAtual, casoId, clienteId, total, recarga]);

  // eb-conflito: o foco vai a "Ver a divisão refeita".
  useEffect(() => {
    if (conflito) corpo.current?.closest("dialog")?.querySelector<HTMLElement>("[data-refeita]")?.focus();
  }, [conflito]);

  const outras = (linhas ?? []).reduce((s, x) => s + (lerCentavos(x.valor) ?? 0), 0);
  const doCliente = (total ?? 0) - outras;
  const mudar = (chave: string, campo: "nome" | "valor" | "para", v: string) =>
    setLinhas((ls) => ls.map((x) => (x.chave === chave ? { ...x, [campo]: v } : x)));
  const acrescentar = () =>
    setLinhas((ls) => [...ls, { chave: `m${Date.now()}`, para: "PERITO", nome: "", regra: null, valor: "", proposta: false }]);
  const escolher = (x: EscolhaExito) => {
    if (!eb || !div) return;
    setEscolha(x);
    setErros((es) => es.filter((c) => c !== "exito" && (x === "DESFAZER" || c !== "porque")));
    if (x === "DESFAZER" && !porque.trim()) setPorque(porQueDesfazer(tipo || null, total, lerDia(dia)));
    setLinhas((ls) => linhasDaEscolha(ls, div.base, x, eb));
  };
  const verRefeita = () => {
    setConflito(null);
    setErros([]);
    setFalha(null);
    setDiv(null);
    setRecarga((n) => n + 1);
  };

  async function enviar() {
    if (saindo.current) return;
    if (conflito) return verRefeita();
    // Com a divisão ainda sendo calculada, a tela não sabe do êxito baixado: espera a proposta.
    if (buscando) return;
    const e: string[] = [];
    const d = lerDia(dia);
    if (!tipo) e.push("tipo");
    if (!alvo) e.push("casoId");
    if (!total) e.push("valor");
    if (!d || d > hoje) e.push("entrouEm");
    const linhasRuins = (linhas ?? []).some((x) => !lerCentavos(x.valor) || x.nome.trim().length < 2);
    if (total && linhas && (linhasRuins || doCliente <= 0)) e.push("divisao");
    if (eb) {
      const ee = errosDoExito(escolha, porque, nomeCliente, soDesfazer);
      if (ee.exito) e.push("exito");
      if (ee.porque) e.push("porque");
    }
    setFuturo(!!d && d > hoje);
    setFalha(null);
    if (e.length) {
      setErros(e);
      return focarPrimeiroErro(corpo.current);
    }
    setErros([]);
    saindo.current = true;
    setEnviando(true);
    const divisao = [
      { para: "CLIENTE", valor: doCliente },
      ...(linhas ?? []).map((x) => ({ para: x.para, nome: x.nome.trim(), regra: x.regra, valor: lerCentavos(x.valor), contaId: x.contaId ?? null })),
    ];
    // Nota 12: exitoBaixadoVisto vai sempre, com [] quando a tela não viu baixa.
    const exitoBaixadoVisto = (div?.exitoBaixado ?? []).map((b) => b.baixa.id);
    const desfazerBaixa = eb && escolha === "DESFAZER" ? { baixaId: eb.baixa.id, explicacao: porque.trim() } : undefined;
    const r = await chamarPortal<{ id: string; exitoBaixado?: { descricao: string; valor: number; paga: boolean }[]; baixaDesfeita?: boolean }>("/v1/escritorio/financeiro/repasses", {
      metodo: "POST",
      corpo: { tipo, casoId, clienteId, valor: total, entrouEm: d, divisao, exitoBaixadoVisto, ...(desfazerBaixa ? { desfazerBaixa } : {}), ...(de ? { requisicaoId: de.id } : {}) },
    });
    saindo.current = false;
    setEnviando(false);
    if (r.ok) {
      return aoFeito({
        titulo: `${TIPOS_LEVANTAMENTO[tipo as TipoLevantamento]} registrado.`,
        texto: `${reais(total!)} de terceiros. ${reais(doCliente)} para ${nomeCliente}, até ${dataBr(somarDiasUteis(d!, prazoDias))}.${de ? " Saiu de “A caminho” e da previsão do Caixa." : ""}`
          + (r.dados.baixaDesfeita
            ? ` ${TEXTO_EXITO_DESFEITO}`
            : (r.dados.exitoBaixado ?? []).map((b) => ` A parcela “${b.descricao}” ${b.paga ? "foi baixada" : `recebeu ${reais(b.valor)}`} pela divisão.`).join("")),
      });
    }
    const c = conflitoDoExito(r.erro.detalhes, hoje, nomeCliente);
    if (c) return setConflito(c);
    const campos = r.erro.detalhes?.campos;
    if (r.erro.codigo === "VALIDATION_ERROR" && Array.isArray(campos) && campos.length) {
      // A explicação do desfazer (o banco a confere no desfazer que já existe) volta ao "Por que desfazer".
      setErros(campos.map((x) => (x === "clienteId" ? "casoId" : x === "explicacao" ? "porque" : String(x))));
      setFuturo(false);
      return focarPrimeiroErro(corpo.current);
    }
    setFalha(textoDoErro(r.erro));
  }

  const errosEb = [tem("exito") && { id: "eb-op-desfazer", texto: `Escolha o que fazer com o êxito de ${pn}.` },
    tem("porque") && { id: "eb-porque", texto: "Escreva por que desfazer." }].filter(Boolean) as { id: string; texto: string }[];
  const ir = (id: string) => (ev: MouseEvent) => {
    ev.preventDefault();
    document.getElementById(id)?.focus();
  };

  return (
    <Janela id="j-rpv" classe="fi-larga" aberta aoFechar={aoFechar} sobretitulo="Repasses" titulo={de ? "Registrar o levantamento" : "Registrar alvará ou RPV"} descricao="j-rpv-d"
      aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-sec" type="button" onClick={aoFechar}>Cancelar</button>
          {conflito ? (
            // Chaves diferentes: o clique em "Ver a divisão refeita" não pode virar envio no mesmo botão.
            <button key="refeita" className="btn btn-pri" type="button" data-refeita onClick={verRefeita}>
              <Icone nome="reenviar" className="ico" />
              Ver a divisão refeita
            </button>
          ) : (
            <button key="registrar" className="btn btn-pri" type="submit" aria-disabled={enviando || undefined} aria-busy={enviando || undefined}>
              <Icone nome="check" className="ico" />
              {enviando ? "Registrando…" : "Registrar"}
            </button>
          )}
        </>
      }>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id="j-rpv-d">{de ? "O dinheiro entrou na conta." : "Diga o que entrou e de qual caso."} A divisão sai do contrato, e você pode ajustar antes de registrar.</p>
        <p className="sr" aria-live="polite">{enviando ? "Registrando." : ""}</p>
        {de ? (
          <p className="rv-de">
            <Icone nome="balanca" className="ico" />
            <span>Vem do {TIPOS_REQUISICAO[de.tipo].titulo} a caminho: <b>{de.cliente.nome}</b>, requisitado {reais(de.valorRequisitado)}, estimado para {mesAno(de.estimadaMes)}. Ao registrar, ele sai de “A caminho” e da previsão do Caixa.</span>
          </p>
        ) : null}
        {conflito ? (
          <div className="aviso aviso-atencao" role="alert">
            <Icone nome="pessoas" className="ico" />
            <div><strong className="aviso-titulo">{conflito.titulo}</strong><p>{conflito.texto}</p></div>
          </div>
        ) : null}
        {errosEb.length ? (
          <div className="aviso aviso-urgencia eb-resumo" role="alert">
            <Icone nome="alerta" className="ico" />
            <div>
              <strong className="aviso-titulo">{tituloErrosExito(erros.length)}</strong>
              <p>Nada foi registrado ainda.</p>
              <ul>{errosEb.map((x) => <li key={x.id}><a href={`#${x.id}`} onClick={ir(x.id)}>{x.texto}</a></li>)}</ul>
            </div>
          </div>
        ) : erros.length ? <Aviso tom="urgencia" titulo={faltaAcertar(erros.length)}>Nada foi registrado ainda.</Aviso> : null}
        {falha ? <Aviso tom="urgencia" titulo="Nada foi registrado.">{falha}</Aviso> : null}
        <div className="fi-dois">
          <div className="campo">
            <label htmlFor="rp-tipo">O que entrou</label>
            <select className="entrada" id="rp-tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoLevantamento)} data-foco=""
              aria-invalid={tem("tipo") || undefined} aria-describedby={descritoPor(tem("tipo") && "rp-tipo-er")}>
              <option value="">Escolha</option>
              {ORDEM_TIPOS.map((x) => <option key={x} value={x}>{TIPOS_LEVANTAMENTO[x]}</option>)}
            </select>
            {tem("tipo") ? <ErroCampo id="rp-tipo-er">Escolha o que entrou: alvará, RPV, precatório ou depósito de acordo.</ErroCampo> : null}
          </div>
          <div className="campo">
            <label htmlFor="rp-caso">Caso e cliente</label>
            <select className="entrada" id="rp-caso" value={alvo} onChange={(e) => setAlvo(e.target.value)}
              aria-invalid={tem("casoId") || undefined} aria-describedby={descritoPor(tem("casoId") && "rp-caso-er")}>
              <option value="">{opcoes.length ? "Escolha o caso" : "Nenhum caso cadastrado"}</option>
              {opcoes.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
            </select>
            {tem("casoId") ? <ErroCampo id="rp-caso-er">Escolha o caso e o cliente de quem é o dinheiro.</ErroCampo> : null}
          </div>
        </div>
        <div className="fi-dois">
          <div className="campo">
            <label htmlFor="rp-valor">Valor levantado</label>
            <input className="entrada" id="rp-valor" type="text" inputMode="decimal" autoComplete="off" value={valor} onChange={(e) => setValor(e.target.value)}
              aria-invalid={tem("valor") || undefined} aria-describedby={descritoPor(!!de && !tem("valor") && "rp-valor-aj", tem("valor") && "rp-valor-er")} />
            {tem("valor") ? <ErroCampo id="rp-valor-er">Escreva o valor em reais. Ex.: 12.700,00.</ErroCampo>
              : de ? <p className="ajuda" id="rp-valor-aj">Requisitado: {reais(de.valorRequisitado)}. O que entra costuma vir corrigido.</p> : null}
          </div>
          <div className="campo">
            <label htmlFor="rp-dia">Dia em que entrou</label>
            <input className="entrada" id="rp-dia" type="text" inputMode="numeric" autoComplete="off" value={dia} onChange={(e) => setDia(e.target.value)}
              aria-invalid={tem("entrouEm") || undefined} aria-describedby={descritoPor(!tem("entrouEm") && "rp-dia-aj", tem("entrouEm") && "rp-dia-er")} />
            {tem("entrouEm") ? <ErroCampo id="rp-dia-er">{futuro ? "Esta data é depois de hoje. Registre quando o dinheiro tiver entrado." : "Escreva a data no formato dd/mm/aaaa."}</ErroCampo>
              : <p className="ajuda" id="rp-dia-aj">dd/mm/aaaa</p>}
          </div>
        </div>
        <p className="fi-caixa-fixa">
          <Icone nome="escudo" className="ico" />
          <span>Entra como <b>valor de terceiros</b>. Só a parte do escritório passa para o caixa dele, quando for transferida.</span>
        </p>

        {conflito ? (
          // Revisão do desenho, nota 2: a divisão de antes sai, para não contradizer o aviso do topo.
          <fieldset className="rp-div">
            <legend>Divisão {contrato ? `proposta pelo contrato ${contrato.numero}` : "do valor"}</legend>
            <p className="ajuda eb-velha">
              <Icone nome="reenviar" className="ico" />
              <span>A divisão saiu daqui porque o êxito de {pn} mudou. O que entrou, o caso, o valor e o dia continuam como você escreveu.</span>
            </p>
          </fieldset>
        ) : (
        <fieldset className="rp-div" aria-describedby={descritoPor(!!eb && "eb-aviso", tem("divisao") && "rp-div-er")}>
          <legend>Divisão {contrato ? `proposta pelo contrato ${contrato.numero}` : "do valor"}</legend>
          {!linhas ? (
            <p className="ajuda">{buscando ? "Calculando a divisão pelo contrato…" : "Escolha o caso e escreva o valor para ver a divisão."}</p>
          ) : (
            <>
              <table className="fi-tab rp-tab">
                <caption className="sr">Para quem vai cada parte</caption>
                <colgroup>{["48%", "20%", "32%"].map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
                <thead>
                  <tr><th scope="col">Para quem</th><th scope="col">Caixa</th><th scope="col" style={{ textAlign: "right" }}>Valor</th></tr>
                </thead>
                <tbody>
                  {linhas.map((x, i) => (
                    <tr key={x.chave}>
                      <td>
                        {x.proposta ? (
                          <div className="fi-quem">
                            <strong>{x.nome}</strong>{x.regra ? <small>{x.regra}</small> : null}
                            {/* F3.174 (nota 1): na célula, só a linha curta; o aviso fica abaixo da tabela. */}
                            {x.para === "HONORARIOS" && eb ? (
                              escolha === "DESFAZER"
                                ? <small className="rp-baixa"><Icone nome="check" className="ico" />Paga a parcela do êxito (falta {reais(eb.baixa.valor)})</small>
                                : <small className="eb-cel"><Icone nome="alerta" className="ico" />Êxito com baixa sem receber · veja abaixo</small>
                            ) : x.para === "HONORARIOS" && div?.exito?.length
                              /* F3.94: a parte "honorários" baixa a parcela do êxito do cliente no caso. */
                              ? <small className="rp-baixa"><Icone nome="check" className="ico" />Dá baixa na parcela {div.exito.map((e) => `“${e.descricao}” (falta ${reais(e.falta)})`).join(" e ")}</small>
                              : null}
                          </div>
                        ) : (
                          <div className="rp-manual">
                            <label className="sr" htmlFor={`rp-para-${i}`}>Quem é</label>
                            <select className="entrada" id={`rp-para-${i}`} value={x.para} onChange={(e) => mudar(x.chave, "para", e.target.value)}>
                              {PARA_ACRESCENTAR.map((p) => <option key={p} value={p}>{PARA_DESTINACAO[p]}</option>)}
                            </select>
                            <label className="sr" htmlFor={`rp-nome-${i}`}>Nome de quem recebe</label>
                            <input className="entrada" id={`rp-nome-${i}`} type="text" autoComplete="off" maxLength={120} placeholder="Nome" value={x.nome}
                              onChange={(e) => mudar(x.chave, "nome", e.target.value)} />
                          </div>
                        )}
                      </td>
                      <td data-r="Caixa">
                        {x.para === "HONORARIOS" || x.para === "REEMBOLSO"
                          ? <span className="fi-cat"><Icone nome="coluna" className="ico" />Escritório</span>
                          : <span className="fi-cat terc"><Icone nome="escudo" className="ico" />Terceiros</span>}
                      </td>
                      <td data-r="Valor" className="rp-valor">
                        <div className="rp-valor-in">
                        <label className="sr" htmlFor={`rp-v-${i}`}>Valor de {x.nome || "esta parte"}</label>
                        <input className="entrada num" id={`rp-v-${i}`} type="text" inputMode="decimal" autoComplete="off" value={x.valor}
                          onChange={(e) => mudar(x.chave, "valor", e.target.value)} />
                        <button className="btn btn-fantasma btn-compacto" type="button" onClick={() => setLinhas((ls) => ls.filter((y) => y.chave !== x.chave))}>
                          <Icone nome="xis" className="ico" /><span className="sr">Tirar {x.nome || "esta parte"} da divisão</span>
                        </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr className="rp-cliente">
                    <td><div className="fi-quem"><strong>{nomeCliente}</strong><small>Cliente · o que fica, depois das outras partes</small></div></td>
                    <td data-r="Caixa"><span className="fi-cat terc"><Icone nome="escudo" className="ico" />Terceiros</span></td>
                    <td data-r="Valor" className="fi-v num">{reais(Math.max(doCliente, 0))}</td>
                  </tr>
                </tbody>
              </table>
              {eb && txEb ? (
                // F3.174 (eb-proposta): o aviso e a escolha, abaixo da tabela, dentro do quadro "Divisão".
                <section className="eb-aviso" aria-labelledby="eb-aviso-t">
                  <div className="eb-txt" id="eb-aviso">
                    <h3 id="eb-aviso-t"><Icone nome="alerta" className="ico" />{txEb.titulo}</h3>
                    <p className="eb-det">{comValores(txEb.detalhe)}</p>
                    {txEb.parcial ? <p className="eb-det">{comValores(txEb.parcial)}</p> : null}
                    {txEb.custas ? <p className="eb-det">{comValores(txEb.custas)}</p> : null}
                    <p className="eb-expl"><q>{txEb.explicacao}</q></p>
                    <p>{txEb.texto}</p>
                    {txEb.renegociada ? (
                      <p>
                        {txEb.renegociada}
                        {temContratos ? <> <a href={ROTAS_CONTRATOS.mudar(eb.contrato.id)}>Mudar as condições do contrato</a></> : null}
                      </p>
                    ) : null}
                  </div>
                  <fieldset className="eb-ops" aria-describedby={tem("exito") ? "eb-ops-er" : undefined}>
                    <legend>O que fazer com o êxito de {pn}</legend>
                    {tem("exito") ? <ErroCampo id="eb-ops-er">{msgEb}</ErroCampo> : null}
                    <div className="eb-ops-l">
                      <label className="opcao">
                        <input className="marcar" type="radio" name="eb-exito" id="eb-op-desfazer" value="DESFAZER" checked={escolha === "DESFAZER"}
                          onChange={() => escolher("DESFAZER")} aria-invalid={tem("exito") || undefined} />
                        <span>Desfazer a baixa antes de dividir<small>A parcela volta a ser cobrada e os honorários deste {nomeDoLevantamento(tipo || null)} a pagam.</small></span>
                      </label>
                      {soDesfazer ? null : (
                        <label className="opcao">
                          <input className="marcar" type="radio" name="eb-exito" id="eb-op-manter" value="MANTER" checked={escolha === "MANTER"}
                            onChange={() => escolher("MANTER")} aria-invalid={tem("exito") || undefined} />
                          <span>Manter a baixa e tirar os honorários<small>Os {reais(lerCentavos(honProposto?.valor ?? "") ?? eb.valor)} ficam com {pn}. A escolha fica no histórico do repasse.</small></span>
                        </label>
                      )}
                    </div>
                    {escolha === "DESFAZER" ? (
                      <div className="campo eb-porque">
                        <label htmlFor="eb-porque">Por que desfazer</label>
                        <textarea className="entrada" id="eb-porque" maxLength={1000} value={porque} onChange={(e) => setPorque(e.target.value)}
                          aria-invalid={tem("porque") || undefined} aria-describedby={descritoPor("eb-porque-aj", tem("porque") && "eb-porque-er")} />
                        <p className="ajuda" id="eb-porque-aj">Fica no histórico da parcela.</p>
                        {tem("porque") ? <ErroCampo id="eb-porque-er">Escreva por que desfazer, com pelo menos 3 letras.</ErroCampo> : null}
                      </div>
                    ) : null}
                    {escolha === "MANTER" ? (
                      <p className="eb-nota" role="status">
                        <Icone nome="historico" className="ico" />
                        <span>Os honorários saíram da divisão. O êxito de {pn} continua com baixa sem receber, e isso fica no histórico do repasse.</span>
                      </p>
                    ) : null}
                  </fieldset>
                </section>
              ) : null}
              <button className="btn btn-sec btn-compacto" type="button" onClick={acrescentar} style={{ justifySelf: "start" }}>
                <Icone nome="mais" className="ico" />Acrescentar perito, parceiro ou outro
              </button>
              <p className={doCliente > 0 ? "fi-ref" : "fi-ref rp-ruim"} role="status">
                <Icone nome={doCliente > 0 ? "check" : "alerta"} className="ico" />
                <span>
                  {doCliente > 0
                    ? <>Soma da divisão: <b>{reais(total ?? 0)}</b>, igual ao valor levantado. Falta destinar: <b>R$ 0,00</b>. </>
                    : <>As outras partes somam <b>{reais(outras)}</b>, mais do que o valor levantado. </>}
                  Parcela em atraso do cliente <b>não</b> é descontada aqui sem o aceite de {pn}.
                </span>
              </p>
              {tem("divisao") ? <ErroCampo id="rp-div-er">Confira cada parte: todas precisam de nome e valor, e o cliente precisa ficar com algum valor.</ErroCampo> : null}
            </>
          )}
        </fieldset>
        )}
      </div>
    </Janela>
  );
}

// ------------------------------------------------------------------------- Feito e dispensar

function AlvoDestinacao({ d }: { d: Destinacao }) {
  return (
    <div className="fi-alvo">
      <Icone nome={d.escritorio ? "coluna" : "escudo"} className="ico" />
      <div>
        <strong>{d.nome}</strong>
        <small>{quemE(d)} · prazo {dataBr(d.prazo)}</small>
      </div>
      <span className="fi-v num">{reais(d.valor)}</span>
    </div>
  );
}

function JanelaFeito({ l, d, aoFechar, aoFeito }: { l: Pick<Levantamento, "entrouEm">; d: Destinacao; aoFechar: () => void; aoFeito: (f: Feito) => void }) {
  const hoje = hojeBrasilia();
  const [dia, setDia] = useState(diaBr(hoje));
  const [erro, setErro] = useState<"" | "formato" | "futuro" | "antes">("");
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const corpo = useRef<HTMLDivElement>(null);

  async function enviar() {
    const x = lerDia(dia);
    const e = !x ? "formato" : x > hoje ? "futuro" : x < l.entrouEm ? "antes" : "";
    setErro(e);
    setFalha(null);
    if (e) return focarPrimeiroErro(corpo.current);
    setEnviando(true);
    const r = await chamarPortal<Destinacao>(`/v1/escritorio/financeiro/destinacoes/${d.id}/feito`, { metodo: "POST", corpo: { feitoEm: x } });
    setEnviando(false);
    if (r.ok) {
      return aoFeito({
        titulo: d.escritorio ? "Transferência registrada." : "Repasse registrado.",
        texto: `${reais(d.valor)} para ${d.nome}, em ${dataBr(x!)}.${d.para === "REEMBOLSO" ? " O adiantamento ficou reembolsado em A pagar." : ""}`,
      });
    }
    if (r.erro.detalhes?.motivo === "DATA_NO_FUTURO") {
      setErro("futuro");
      return focarPrimeiroErro(corpo.current);
    }
    setFalha(textoDoErro(r.erro));
  }

  return (
    <Janela id="j-feito" aberta aoFechar={aoFechar} sobretitulo="Repasses" titulo={d.escritorio ? "Registrar transferência" : "Registrar repasse"} descricao="j-feito-d"
      aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-sec" type="button" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-pri" type="submit" disabled={enviando} aria-busy={enviando || undefined}>
            <Icone nome="check" className="ico" />
            Registrar
          </button>
        </>
      }>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id="j-feito-d">O dia em que o dinheiro saiu da conta. Depois de registrado, o repasse não muda mais.</p>
        {falha ? <Aviso tom="urgencia" titulo="Nada foi registrado.">{falha}</Aviso> : null}
        <AlvoDestinacao d={d} />
        <div className="campo">
          <label htmlFor="fe-dia">Dia do repasse</label>
          <input className="entrada" id="fe-dia" type="text" inputMode="numeric" autoComplete="off" value={dia} onChange={(e) => setDia(e.target.value)} data-foco=""
            aria-invalid={erro ? true : undefined} aria-describedby={descritoPor(!erro && "fe-dia-aj", !!erro && "fe-dia-er")} />
          {erro ? (
            <ErroCampo id="fe-dia-er">
              {erro === "futuro" ? "Esta data é depois de hoje. Registre quando o dinheiro tiver saído."
                : erro === "antes" ? `O dinheiro entrou em ${dataBr(l.entrouEm)}. O repasse não pode ser antes disso.`
                : "Escreva a data no formato dd/mm/aaaa."}
            </ErroCampo>
          ) : <p className="ajuda" id="fe-dia-aj">dd/mm/aaaa</p>}
        </div>
      </div>
    </Janela>
  );
}

function JanelaDispensar({ d, aoFechar, aoFeito }: { d: Destinacao; aoFechar: () => void; aoFeito: (f: Feito) => void }) {
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const corpo = useRef<HTMLDivElement>(null);

  async function enviar() {
    const curto = motivo.trim().length < 5;
    setErro(curto);
    setFalha(null);
    if (curto) return focarPrimeiroErro(corpo.current);
    setEnviando(true);
    const r = await chamarPortal<Destinacao>(`/v1/escritorio/financeiro/destinacoes/${d.id}/dispensar`, { metodo: "POST", corpo: { motivo: motivo.trim() } });
    setEnviando(false);
    if (r.ok) return aoFeito({ titulo: "Repasse dispensado.", texto: `${d.nome}: o motivo ficou no histórico do repasse.` });
    if (r.erro.detalhes?.motivo === "MOTIVO_OBRIGATORIO") {
      setErro(true);
      return focarPrimeiroErro(corpo.current);
    }
    setFalha(textoDoErro(r.erro));
  }

  return (
    <Janela id="j-disp" aberta aoFechar={aoFechar} sobretitulo="Repasses" titulo="Dispensar este repasse" descricao="j-disp-d" aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-sec" type="button" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-pri" type="submit" disabled={enviando} aria-busy={enviando || undefined}>
            Dispensar
          </button>
        </>
      }>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id="j-disp-d">Use quando o repasse não vai acontecer. Nada some: a parte fica no registro, com o motivo, seu nome e a hora.</p>
        {falha ? <Aviso tom="urgencia" titulo="Nada mudou.">{falha}</Aviso> : null}
        <AlvoDestinacao d={d} />
        <div className="campo">
          <label htmlFor="ds-motivo">Por que não vai acontecer</label>
          <textarea className="entrada" id="ds-motivo" rows={3} maxLength={500} value={motivo} onChange={(e) => setMotivo(e.target.value)} data-foco=""
            aria-invalid={erro || undefined} aria-describedby={descritoPor(!erro && "ds-motivo-aj", erro && "ds-motivo-er")} />
          {erro ? <ErroCampo id="ds-motivo-er">Escreva o motivo, com pelo menos 5 letras.</ErroCampo>
            : <p className="ajuda" id="ds-motivo-aj">Ex.: o perito recebeu direto do tribunal.</p>}
        </div>
      </div>
    </Janela>
  );
}

// ------------------------------------------------------------------------- Prestação de contas

function PreviaPrestacao({ l, escritorio, rodape }: { l: Pick<Levantamento, "tipo" | "valor" | "cliente" | "destinacoes">; escritorio: string; rodape: string }) {
  const c = contaPrestacao(l, escritorio);
  return (
    <div className="fi-balao">
      <p>{c.abertura}</p>
      <table>
        <caption className="sr">A conta da prestação de contas</caption>
        <tbody>
          <tr><td>Valor recebido</td><td>{reais(l.valor)}</td></tr>
          {c.descontos.map((d, i) => <tr key={i}><td>{d.rotulo}</td><td>− {reais(d.valor)}</td></tr>)}
          <tr className="fi-fica"><td>Fica para você</td><td>{reais(c.fica)}</td></tr>
        </tbody>
      </table>
      <p>{c.fecho}</p>
      <small>{rodape}</small>
    </div>
  );
}

function AcoesPrestacao({ l, escritorio }: { l: Pick<Levantamento, "tipo" | "valor" | "cliente" | "destinacoes">; escritorio: string }) {
  const [copiado, setCopiado] = useState(false);
  const texto = textoPrestacaoContas(l, escritorio);
  const fone = l.cliente.telefone?.replace(/\D/g, "") ?? "";
  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }
  return (
    <>
      <div className="jr-denovo-acoes">
        <button className="btn btn-sec" type="button" onClick={() => void copiar()} data-foco>
          <Icone nome="copiar" className="ico" />{copiado ? "Texto copiado" : "Copiar texto"}
        </button>
        {fone ? (
          <a className="btn btn-sec" href={`https://wa.me/${fone}?text=${encodeURIComponent(texto)}`} target="_blank" rel="noopener noreferrer">
            <Icone nome="whats" className="ico" />Abrir no WhatsApp
          </a>
        ) : null}
      </div>
      <span className="sr" role="status">{copiado ? "Texto copiado." : ""}</span>
    </>
  );
}

function JanelaPrestacao({ l, escritorio, aoFechar, aoFeito }: { l: Levantamento; escritorio: string; aoFechar: () => void; aoFeito: (f: Feito) => void }) {
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const nome = primeiroNome(l.cliente.nome);
  const descontos = l.destinacoes.filter((d) => d.para !== "CLIENTE" && d.situacao !== "DISPENSADO").reduce((s, d) => s + d.valor, 0);
  const fica = l.destinacoes.find((d) => d.para === "CLIENTE")?.valor ?? 0;

  // Com o WhatsApp do escritório ligado, a mensagem entra na fila do número do escritório
  // (F3.44). Sem ele, ou depois de já ter ido pela fila, fica o envio pelo aparelho.
  const pelaFila = !!l.whatsappLigado && !l.prestacao;

  async function marcar() {
    setFalha(null);
    setEnviando(true);
    const r = pelaFila
      ? await chamarPortal<Levantamento>(`/v1/escritorio/financeiro/repasses/${l.id}/prestacao/envio`, { metodo: "POST", corpo: {} })
      : await chamarPortal<{ id: string }>(`/v1/escritorio/financeiro/repasses/${l.id}/prestacao`, { metodo: "POST", corpo: {} });
    setEnviando(false);
    if (r.ok && pelaFila) return aoFeito({ titulo: "Prestação de contas na fila do WhatsApp.", texto: `A mensagem a ${l.cliente.nome} sai pelo número do escritório. O repasse mostra quando for lida.` });
    if (r.ok) return aoFeito({ titulo: "Prestação de contas marcada como enviada.", texto: `O envio a ${l.cliente.nome} ficou no histórico do repasse.` });
    setFalha(textoDoErro(r.erro));
  }

  return (
    <Janela id="j-prest" classe="fi-larga" aberta aoFechar={aoFechar} sobretitulo="Repasses · Prestação de contas" titulo={`Prestação de contas a ${nome}`} descricao="j-prest-d"
      aoEnviar={() => void marcar()}
      pe={
        <>
          <button className="btn btn-sec" type="button" onClick={aoFechar}>Voltar</button>
          <button className="btn btn-pri" type="submit" disabled={enviando} aria-busy={enviando || undefined}>
            <Icone nome={pelaFila ? "whats" : "check"} className="ico" />
            {pelaFila ? "Mandar pelo WhatsApp" : "Marcar como enviada"}
          </button>
        </>
      }>
      <div style={{ display: "grid", gap: 16 }}>
        <p id="j-prest-d">Revise antes de enviar. O envio fica no histórico do repasse.</p>
        {falha ? <Aviso tom="urgencia" titulo="Nada mudou.">{falha}</Aviso> : null}
        <div className="fi-zap">
          <p className="fi-zap-cab"><Icone nome="whats" className="ico" />Para {l.cliente.nome}{l.cliente.telefone ? ` · ${formatarTelefone(l.cliente.telefone)}` : ""}</p>
          <PreviaPrestacao l={l} escritorio={escritorio} rodape={l.prestacaoEm ? `Enviada em ${diaCurto(diaDoInstante(l.prestacaoEm))}` : "Prévia · ainda não enviada"} />
        </div>
        <p className="fi-ref">
          <Icone nome="check" className="ico" />
          <span>
            A conta fecha: {reais(l.valor)} levantados = {reais(descontos)} de outras partes + {reais(fica)} para {nome}. Os valores vêm do registro; para mudar um número, registre de novo.
          </span>
        </p>
        {pelaFila ? (
          <Aviso tom="info" titulo="Sai pelo WhatsApp do escritório.">
            A mensagem entra na fila do número do escritório, para o contato principal de {nome}. O repasse mostra quando ela for lida.
          </Aviso>
        ) : (
          <>
            <AcoesPrestacao l={l} escritorio={escritorio} />
            {l.prestacao ? (
              <Aviso tom="info" titulo="Esta prestação de contas já foi pelo WhatsApp do escritório.">
                Situação: {situacaoPrestacao(l.prestacao)}. Para mandar de novo, envie pelo aparelho e marque aqui.
              </Aviso>
            ) : (
              <Aviso tom="info" titulo="O WhatsApp do escritório ainda não está ligado ao T3jus.">
                Por enquanto, envie pelo aparelho e marque aqui. Quando o número do escritório for ligado, a mensagem sai por ele e mostra quando foi lida.
              </Aviso>
            )}
          </>
        )}
      </div>
    </Janela>
  );
}

// ------------------------------------------------------------------------- Ficha do repasse

const FRASES: Record<string, (d: Record<string, unknown>) => string> = {
  "financeiro.levantamento": (d) => `registrou ${TIPOS_LEVANTAMENTO[d.tipo as TipoLevantamento] ?? "o valor"} de ${reais(Number(d.valor))}`,
  "financeiro.repasse_feito": (d) => `registrou ${reais(Number(d.valor))} para ${d.para === "CLIENTE" ? "o cliente" : PARA_DESTINACAO[d.para as ParaDestinacao]?.toLowerCase() ?? "uma parte"}`,
  "financeiro.repasse_dispensado": (d) => `dispensou ${reais(Number(d.valor))} de ${PARA_DESTINACAO[d.para as ParaDestinacao]?.toLowerCase() ?? "uma parte"}`,
  "financeiro.prestacao_enviada": () => "marcou a prestação de contas como enviada",
  "financeiro.repasse_atraso": (d) => `anotou o atraso de ${String(d.parte ?? "uma parte")}: ${MOTIVOS_ATRASO_REPASSE[d.motivo as MotivoAtrasoRepasse]?.curto ?? "motivo"}`,
};

function detalheHistorico(acao: string, d: Record<string, unknown>): string | null {
  if (acao === "financeiro.levantamento") return d.seguiuProposta ? "divisão do contrato aceita sem mudança" : "divisão ajustada à mão";
  if (acao === "financeiro.repasse_dispensado") return String(d.motivo ?? "");
  if (acao === "financeiro.repasse_feito" && d.feitoEm) return `dinheiro saiu em ${dataBr(String(d.feitoEm))}`;
  if (acao === "financeiro.repasse_responsavel") return d.motivo ? `“${String(d.motivo)}”` : null;
  if (acao === "financeiro.repasse_atraso") return `${d.texto ? `${String(d.texto)} ` : ""}Próxima ação em ${diaCurto(String(d.proximaEm))}: ${String(d.oQue ?? "")}`.trim();
  return null;
}

function HistoricoRepasse({ f, hoje }: { f: FichaRepasse; hoje: string }) {
  const nomes = new Map<string, string>([
    ...f.podemCuidar.map((p) => [p.id, p.nome] as [string, string]),
    ...(f.doContrato ? [[f.doContrato.id, f.doContrato.nome] as [string, string]] : []),
    [f.responsavel.id, f.responsavel.nome],
  ]);
  const dias: { dia: string; itens: FichaRepasse["historico"] }[] = [];
  for (const e of f.historico) {
    const dia = diaDoInstante(e.em);
    const ult = dias[dias.length - 1];
    if (ult?.dia === dia) ult.itens.push(e);
    else dias.push({ dia, itens: [e] });
  }
  return (
    <section className="folha" aria-labelledby="t-rp-h" style={{ overflow: "hidden" }}>
      <div className="folha-cab" style={{ paddingBottom: 8 }}>
        <div><h2 id="t-rp-h" style={{ fontSize: 20 }}><Icone nome="historico" className="ico" />Histórico</h2></div>
      </div>
      {dias.map((g) => (
        <div className="eventos-dia" key={g.dia}>
          <h3>{dataBr(g.dia)}{g.dia === hoje ? " · hoje" : ""}</h3>
          <ol className="eventos">
            {g.itens.map((e, i) => {
              // F3.174 (eb-historico): a escolha do êxito baixado, ao registrar.
              if (e.acao === "financeiro.levantamento_exito_mantido" || e.acao === "financeiro.levantamento_exito_desfeito") {
                return (
                  <li key={`${e.em}-${i}`} className="eb-hist-novo">
                    <time dateTime={e.em}>{horaDoInstante(e.em)}</time>
                    <span className="pto" aria-hidden="true" />
                    <div>
                      <p>{e.acao === "financeiro.levantamento_exito_mantido" ? textoExitoMantido(e.dados, f.cliente.nome) : TEXTO_EXITO_DESFEITO}</p>
                      <small>{quemRegistrou(e.por?.nome, String(e.dados.tipo ?? f.tipo))}</small>
                    </div>
                  </li>
                );
              }
              const det = detalheHistorico(e.acao, e.dados);
              return (
                <li key={`${e.em}-${i}`}>
                  <time dateTime={e.em}>{horaDoInstante(e.em)}</time>
                  <span className="pto" aria-hidden="true" />
                  <div>
                    <p>
                      {e.por ? <><b>{e.por.nome}</b> </> : null}
                      {e.acao === "financeiro.repasse_responsavel"
                        ? <>passou o repasse para <b>{nomes.get(String(e.dados.para)) ?? "outra pessoa"}</b></>
                        : (FRASES[e.acao] ?? (() => e.acao))(e.dados)}
                    </p>
                    {det ? <small>{det}</small> : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </section>
  );
}

function RepasseConteudo({ id, aoNome }: { id: string; aoNome: (n: string) => void }) {
  const hoje = hojeBrasilia();
  const { dados, recarregar } = useCarga<FichaRepasse>(`/v1/escritorio/financeiro/repasses/${id}`);
  const [feitoEm, setFeitoEm] = useState<Destinacao | null>(null);
  const [dispensar, setDispensar] = useState<Destinacao | null>(null);
  const [prestacao, setPrestacao] = useState(false);
  const [encerrar, setEncerrar] = useState(false);
  const [trocar, setTrocar] = useState(false);
  const [anotar, setAnotar] = useState<Destinacao | null>(null);
  const [feito, setFeito] = useState<Feito | null>(null);
  const [jaEncerrado, setJaEncerrado] = useState(false);
  const nome = dados && dados !== "erro" ? dados.cliente.nome : null;
  useEffect(() => {
    if (nome) aoNome(nome);
  }, [nome, aoNome]);
  const terminar = (x: Feito) => {
    setFeitoEm(null);
    setDispensar(null);
    setPrestacao(false);
    setEncerrar(false);
    setTrocar(false);
    setAnotar(null);
    setFeito(x);
    recarregar();
  };

  if (dados === "erro") return <ErroAoCarregar oque="o repasse" aoTentar={recarregar} />;
  if (!dados) return <Carregando rotulo="Carregando o repasse…" linhas={5} />;
  const f = dados;
  const mantido = f.historico.find((h) => h.acao === "financeiro.levantamento_exito_mantido");
  const abertas = f.destinacoes.filter(pendente);
  const faltaPagar = abertas.reduce((s, d) => s + d.valor, 0);
  const pago = f.destinacoes.filter((d) => d.situacao === "FEITO").reduce((s, d) => s + d.valor, 0);
  const grupos = [
    { rot: "Cliente", cor: "var(--vinho)", v: f.destinacoes.filter((d) => d.para === "CLIENTE").reduce((s, d) => s + d.valor, 0) },
    { rot: "Escritório", cor: "var(--vinho-2)", v: f.destinacoes.filter((d) => d.escritorio).reduce((s, d) => s + d.valor, 0) },
    { rot: "Outros", cor: "var(--vinho-4)", v: f.destinacoes.filter((d) => !d.escritorio && d.para !== "CLIENTE").reduce((s, d) => s + d.valor, 0) },
  ].filter((g) => g.v > 0);
  const prontoParaEncerrar = !f.acerto.fechado && !abertas.length && !f.acerto.pendencias.length;
  const quemFalta = abertas.map((d) => (d.para === "CLIENTE" ? primeiroNome(d.nome) : PARA_DESTINACAO[d.para].toLowerCase()));
  return (
    <div className="fi">
      <div className="ficha-cab">
        <div className="esq campo-vinho">
          <Icone nome="balanca" className="ico estatua" />
          <a className="voltar" href={ROTAS_FINANCEIRO.repasses}>
            <Icone nome="esquerda" className="ico ico-s" />
            Repasses
          </a>
          <div className="ident">
            <div>
              <p className="sobretitulo">{TIPOS_LEVANTAMENTO[f.tipo]} · {f.caso.nome}{f.caso.parteContraria ? ` × ${f.caso.parteContraria}` : ""}</p>
              <h1>{f.cliente.nome}</h1>
              <p className="meta">
                <span className="selo selo-ativo" style={{ background: "var(--ambar-3)", color: "var(--vinho)" }}>{f.feitos} de {f.total} feitos</span>
                <span>levantado em {dataBr(f.entrouEm)}</span>
                <span className="sep" aria-hidden="true" />
                <span className="num">{reais(f.valor)}</span>
                <span className="sep" aria-hidden="true" />
                <span>responsável {f.responsavel.nome}</span>
              </p>
            </div>
          </div>
        </div>
        <section className="dir campo-ambar" aria-labelledby="t-rp-dir">
          <p className="sobretitulo" id="t-rp-dir">{abertas.length ? "Ainda com o escritório" : "Tudo destinado"}</p>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <p className="grande num">{reais(faltaPagar)}</p>
            {abertas.length ? <Selo tom="atencao">{contar(abertas.length, "repasse", "repasses")}</Selo> : null}
          </div>
          {f.acerto.fechado ? (
            <>
              <p className="fi-oque"><b>Caso encerrado no financeiro em {diaCurto(diaDoInstante(f.acerto.fechado.em))}.</b></p>
              <a className="btn btn-pri" href={`/clientes/${f.cliente.id}`}><Icone nome="pessoas" className="ico" />Ver a ficha de {primeiroNome(f.cliente.nome)}</a>
            </>
          ) : prontoParaEncerrar ? (
            // EX-17, decisão 23: com tudo pago, o âmbar passa a encerrar; o botão fica uma vez só.
            <>
              <p className="fi-oque"><b>Nada falta.</b> O caso já pode ser encerrado no financeiro.</p>
              <button className="btn btn-pri" type="button" onClick={() => setEncerrar(true)}><Icone nome="cadeado" className="ico" />Encerrar o caso no financeiro</button>
            </>
          ) : (
            <p className="fi-oque">
              {abertas.length
                ? <><b>Falta: {quemFalta.join(", ")}.</b> O caso só fecha no financeiro quando tudo for repassado.</>
                : <><b>Cada parte foi feita ou dispensada com motivo.</b></>}
            </p>
          )}
        </section>
      </div>

      <div className="fi-grade pt-desce">
        <div className="fi-col">
          <section className="folha fi-terc" aria-labelledby="t-rp-partes" style={{ overflow: "hidden" }}>
            <div className="fi-terc-cab"><Icone nome="escudo" className="ico" />De terceiros · não é do escritório</div>
            <div className="folha-cab">
              <div>
                <h2 id="t-rp-partes"><Icone nome="enviar" className="ico" />Para onde vai cada parte</h2>
                {/* F3.174 (eb-historico): registrado com "Manter", sem os honorários do êxito. */}
                {mantido
                  ? <p className="sub">Sem os honorários do êxito: {mantido.por?.nome ?? f.autor.nome} manteve a baixa sem receber ao registrar.</p>
                  : <p className="sub">A divisão foi registrada por {f.autor.nome} em {diaCurto(diaDoInstante(f.criadoEm))}.</p>}
              </div>
            </div>
            <div className="fi-split">
              <div className="tons" role="img" aria-label={grupos.map((g) => `${g.rot} ${reais(g.v)}`).join(", ")}>
                {grupos.map((g) => <i key={g.rot} style={{ flex: g.v, background: g.cor }} />)}
              </div>
              <p className="legenda" aria-hidden="true">
                {grupos.map((g) => <span key={g.rot}><i style={{ background: g.cor }} />{g.rot} {reais(g.v)}</span>)}
              </p>
            </div>
            <table className="hn-tab fi-tab fi-dest" data-cartoes="680">
              <caption className="sr">Partes do valor levantado</caption>
              <colgroup>{["34%", "32%", "16%", "18%"].map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
              <thead>
                <tr>
                  <th scope="col">Para quem</th><th scope="col">Situação</th><th scope="col" style={{ textAlign: "right" }}>Valor</th><th scope="col"><span className="sr">Ação</span></th>
                </tr>
              </thead>
              <tbody>
                {f.destinacoes.map((d) => (
                  <tr key={d.id} className={atrasada(d, hoje) ? "fi-atraso" : d.situacao === "FEITO" ? "fi-pago" : undefined}>
                    <td>
                      <div className="fi-quem">
                        <strong>{d.nome}</strong>
                        <small>{quemE(d)}</small>
                        {d.dispensa ? <small>Dispensado por {d.dispensa.por.nome}: {d.dispensa.motivo}</small> : null}
                        {d.feitoPor ? <small>Registrado por {d.feitoPor.nome}</small> : null}
                      </div>
                    </td>
                    <td data-r="Situação">
                      <div className="fi-sit">
                        <SeloDestinacao d={d} hoje={hoje} />
                        <NotaAtraso d={d} hoje={hoje} prazoDias={f.prazoDias} aoAnotar={f.podeEditar ? setAnotar : undefined} />
                      </div>
                    </td>
                    <td data-r="Valor" className="fi-v num">{reais(d.valor)}</td>
                    <td data-r="" className="fi-acao hn-acao">
                      {pendente(d) ? (
                        <div className="rp-acoes">
                          <button className="btn btn-sec btn-compacto" type="button" onClick={() => setFeitoEm(d)} aria-label={`Feito: registrar o repasse de ${d.nome}`}>
                            Feito
                          </button>
                          {d.para !== "CLIENTE" ? (
                            <button className="btn btn-fantasma btn-compacto" type="button" onClick={() => setDispensar(d)} aria-label={`Dispensar o repasse de ${d.nome}`}>
                              Dispensar
                            </button>
                          ) : null}
                        </div>
                      ) : d.para === "REEMBOLSO" ? <span className="fi-pq">Despesa ligada</span> : <span className="fi-pq">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="fi-total rp-total"><span>Levantado e destinado · falta destinar R$ 0,00</span><b className="num">{reais(f.valor)}</b></p>
          </section>

          <section className="folha" aria-labelledby="t-rp-prest" style={{ overflow: "hidden" }}>
            <div className="folha-cab">
              <div>
                <h2 id="t-rp-prest"><Icone nome="whats" className="ico" />Prestação de contas ao cliente</h2>
                <p className="sub">Montada do registro. Os números não se editam aqui.</p>
              </div>
              <div className="acoes">
                <button className="btn btn-pri" type="button" onClick={() => setPrestacao(true)}>
                  <Icone nome="whats" className="ico" />{f.prestacaoEm ? "Ver e enviar de novo" : "Revisar e enviar"}
                </button>
              </div>
            </div>
            <div className="fi-zap rp-zap">
              <p className="fi-zap-cab">
                <Icone nome="whats" className="ico" />
                {f.prestacao && f.prestacaoPor
                  ? `Mandada pelo WhatsApp por ${f.prestacaoPor.nome}: ${situacaoPrestacao(f.prestacao)}`
                  : f.prestacaoEm && f.prestacaoPor
                  ? `Marcada como enviada por ${f.prestacaoPor.nome} em ${diaCurto(diaDoInstante(f.prestacaoEm))}, às ${horaDoInstante(f.prestacaoEm)}`
                  : "Ainda não enviada"}
              </p>
              <PreviaPrestacao l={f} escritorio={f.escritorio} rodape={f.prestacaoEm ? `Enviada em ${diaCurto(diaDoInstante(f.prestacaoEm))}` : "Prévia · ainda não enviada"} />
            </div>
          </section>
        </div>

        <aside className="fi-col" aria-label="Responsável, fechamento e histórico">
          <FolhaQuemCuida f={f} aoTrocar={() => setTrocar(true)} />
          <section className="folha" aria-labelledby="t-rp-fecha" style={{ overflow: "hidden" }}>
            <div className="folha-cab">
              <div>
                <h2 id="t-rp-fecha"><Icone nome="cadeado" className="ico" />Fechamento do caso</h2>
                <p className="sub">Só encerra com tudo recebido e tudo repassado</p>
              </div>
            </div>
            <div className="fi-fecha">
            <div className="fi-fecha-num">
              <div><b className="num">{reais(f.valor)}</b><small>entrou</small></div>
              <div><b className="num">{reais(pago)}</b><small>destinado e pago</small></div>
              <div className={faltaPagar ? "falta" : undefined}><b className="num">{reais(faltaPagar)}</b><small>falta pagar</small></div>
            </div>
            <ul className="fi-check">
              <li><Icone nome="check" className="ico" /><span>{TIPOS_LEVANTAMENTO[f.tipo]} registrado em {dataBr(f.entrouEm)}</span></li>
              <ItemParcelas a={f.acerto} />
              {f.destinacoes.map((d) => (
                <li key={d.id} className={pendente(d) ? "falta" : undefined}>
                  <Icone nome={pendente(d) ? "alerta" : "check"} className="ico" />
                  <span>
                    {pendente(d)
                      ? <><b>{PARA_DESTINACAO[d.para]}:</b> falta pagar {reais(d.valor)}, até {diaCurto(d.prazo)}</>
                      : d.situacao === "DISPENSADO" ? <>{d.nome}: dispensado, com motivo</> : <>{d.nome}: feito em {diaCurto(d.feitoEm!)}</>}
                  </span>
                </li>
              ))}
              <li className={f.prestacaoEm ? undefined : "falta"}>
                <Icone nome={f.prestacaoEm ? "check" : "alerta"} className="ico" />
                <span>{f.prestacao?.envio === "LIDA" ? `Prestação de contas lida pelo cliente em ${quando(f.prestacao.envioEm ?? f.prestacao.em)}` : f.prestacaoEm ? "Prestação de contas enviada ao cliente" : <><b>Prestação de contas:</b> ainda não enviada</>}</span>
              </li>
            </ul>
            </div>
            <div className="fi-fecha-acao">
              {f.acerto.fechado ? (
                <p className="fi-fechado">
                  <Icone nome="check" className="ico" />
                  <span>Caso encerrado no financeiro em {diaCurto(diaDoInstante(f.acerto.fechado.em))}, por {f.acerto.fechado.por.nome}.</span>
                </p>
              ) : prontoParaEncerrar ? null : (
                <button className="btn btn-sec" type="button" onClick={() => setEncerrar(true)} style={{ width: "100%" }}>
                  <Icone nome="cadeado" className="ico" />Encerrar o caso no financeiro
                </button>
              )}
            </div>
          </section>
          <HistoricoRepasse f={f} hoje={hoje} />
        </aside>
      </div>
      {feitoEm ? <JanelaFeito l={f} d={feitoEm} aoFechar={() => setFeitoEm(null)} aoFeito={terminar} /> : null}
      {dispensar ? <JanelaDispensar d={dispensar} aoFechar={() => setDispensar(null)} aoFeito={terminar} /> : null}
      {prestacao ? <JanelaPrestacao l={f} escritorio={f.escritorio} aoFechar={() => setPrestacao(false)} aoFeito={terminar} /> : null}
      {trocar ? <JanelaTrocarResponsavel f={f} aoFechar={() => setTrocar(false)} aoFeito={terminar} /> : null}
      {anotar ? (
        <JanelaAnotarAtraso d={anotar} l={f} pessoas={f.podemCuidar} responsavelId={f.responsavel.id} hoje={hoje} aoFechar={() => setAnotar(null)} aoFeito={terminar} />
      ) : null}
      {encerrar ? (
        <JanelaFechamento casoId={f.caso.id} acerto={f.acerto} nomeCaso={f.caso.nome} voltar="Voltar ao caso"
          descricao={`Este é o caso de ${f.cliente.nome}, ${TIPOS_LEVANTAMENTO[f.tipo]} de ${dataBr(f.entrouEm)}.`}
          atalho={(x) => atalhoDoRepasse(f, x)} aoFechar={() => setEncerrar(false)} aoFeito={terminar}
          aoAtalho={(x) => { const d = x.tipo === "repasse" ? f.destinacoes.find((y) => y.id === x.destinacaoId) : undefined; setEncerrar(false); if (d) setFeitoEm(d); }}
          aoJaEncerrado={() => { setEncerrar(false); setJaEncerrado(true); recarregar(); }} />
      ) : null}
      <p className="fs-anuncio" role="status" aria-live="polite">{jaEncerrado && f.acerto.fechado ? textoJaEncerradoPorOutro(f.acerto.fechado) : ""}</p>
      {feito ? <Toast feito={feito} aoFechar={() => setFeito(null)} /> : null}
    </div>
  );
}

/** O atalho da janela de pendência na ficha do repasse: registrar o repasse daqui (o de hoje). */
function atalhoDoRepasse(f: FichaRepasse, x: PendenciaCaso): Atalho | null {
  if (x.tipo !== "REPASSE" || x.levantamentoId !== f.id) return null;
  const d = f.destinacoes.find((y) => pendente(y) && y.nome === x.nome && y.valor === x.valor);
  return d ? { tipo: "repasse", destinacaoId: d.id, rotulo: rotuloRepasse(d) } : null;
}

export function RepasseFinanceiro({ id }: { id: string }) {
  const [nome, setNome] = useState("Repasse");
  return (
    <MolduraArea area="FINANCEIRO" secao="repasses" trilha={[{ nome }]} pagina="co-ficha co-carteira">
      {() => <RepasseConteudo id={id} aoNome={setNome} />}
    </MolduraArea>
  );
}
