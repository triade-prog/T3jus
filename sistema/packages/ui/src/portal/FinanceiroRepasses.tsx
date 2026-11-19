"use client";
// Financeiro do Portal, Repasses (FI-05, FI-06, FI-12), desenho aprovado em
// docs/design/aprovadas/portal-financeiro (estados repasses, registrar-rpv, repasse e prestacao;
// decisões 10 a 12). Alvará, RPV, precatório e depósito de acordo entram como valor de terceiros,
// na faixa âmbar, separados do caixa do escritório. A divisão sai do contrato do cliente no caso
// e pode ser ajustada antes de registrar; a soma fecha com o valor levantado. Cada parte tem
// prazo (3 dias úteis) e é feita ou dispensada com motivo. A prestação de contas é montada do
// registro e, por enquanto, vai pelo WhatsApp do aparelho; o envio pelo WhatsApp do escritório,
// com o "lida", vem com Conversas.

import { useEffect, useRef, useState } from "react";
import {
  contaPrestacao, dataBr, hojeBrasilia, PARA_ACRESCENTAR, PARA_DESTINACAO, reais, somarDiasUteis, textoPrestacaoContas, TIPOS_LEVANTAMENTO,
  type Destinacao, type FichaRepasse, type Levantamento, type ListaRepasses, type ParaDestinacao, type PropostaRepasse, type TipoLevantamento,
} from "@t3jus/domain";
import { textoDoErro } from "../api.ts";
import { Icone } from "../Icone.tsx";
import { formatarTelefone } from "../console/ficha.ts";
import { Aviso, Carregando, descritoPor, ErroAoCarregar, ErroCampo, Estado, faltaAcertar, focarPrimeiroErro, Janela } from "../console/pecas.tsx";
import { contar, diaBr, diaCurto, lerDia, nomeDoMes } from "./agenda.ts";
import { Selo, useCarga } from "./Comercial.tsx";
import { primeiroNome } from "./equipe.ts";
import { Toast } from "./FichaCliente.tsx";
import { ROTAS_FINANCEIRO } from "./financeiro.ts";
import { centavos as lerCentavos } from "./honorarios.ts";
import { chamarPortal } from "./Moldura.tsx";
import { MolduraArea } from "./MolduraArea.tsx";

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
  if (d.prazo < hoje) return <Selo tom="urgente" icone="alerta">Era {diaCurto(d.prazo)}</Selo>;
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

function CabRepasses({ aoRegistrar }: { aoRegistrar?: () => void }) {
  return (
    <div className="pt-cab">
      <div>
        <p className="sobretitulo">Financeiro</p>
        <h1>Repasses</h1>
        <span className="fio" aria-hidden="true" />
        <p className="lede">Dinheiro de terceiros que entra pelo escritório: quanto é de cada um, o que já foi repassado e o que falta.</p>
      </div>
      {aoRegistrar ? (
        <button className="btn btn-pri" type="button" onClick={aoRegistrar} style={{ marginBottom: 6 }}>
          <Icone nome="escudo" className="ico" />
          Registrar alvará ou RPV
        </button>
      ) : null}
    </div>
  );
}

function ComoFunciona({ prazo }: { prazo: number }) {
  return (
    <section className="explica campo-ambar" aria-labelledby="t-rp-cf">
      <p className="sobretitulo">Como funciona</p>
      <h2 id="t-rp-cf">Nada fica parado sem dono.</h2>
      <ul>
        <li><Icone nome="escudo" className="ico" /><span>Alvará, RPV, precatório e depósito de acordo entram como <b>valor de terceiros</b>, separados do caixa do escritório.</span></li>
        <li><Icone nome="pena" className="ico" /><span>O sistema propõe a divisão pelo contrato: honorários, reembolsos do caso e o que fica para o cliente. Perito e parceiro entram à mão.</span></li>
        <li><Icone nome="relogio" className="ico" /><span>Cada parte tem prazo de {prazo} dias úteis depois que o dinheiro entrou. O que não vai acontecer se dispensa com o motivo.</span></li>
        <li><Icone nome="whats" className="ico" /><span>A prestação de contas vai ao cliente pelo WhatsApp, depois que alguém revisa.</span></li>
      </ul>
    </section>
  );
}

// ------------------------------------------------------------------------- Lista

function Bloco({ l, hoje, prazo, aoFeito, aoDispensar, aoPrestacao }: {
  l: Levantamento; hoje: string; prazo: number;
  aoFeito: (l: Levantamento, d: Destinacao) => void; aoDispensar: (l: Levantamento, d: Destinacao) => void; aoPrestacao: (l: Levantamento) => void;
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
        </div>
        <div className="fi-lado">
          <span className="fi-v forte num">{reais(l.valor)}</span>
          <SeloFeitos l={l} hoje={hoje} />
        </div>
      </div>
      <ul className="fi-linhas">
        {l.destinacoes.map((d) => (
          <li key={d.id} className="fi-linha rp-linha">
            <div className="fi-quem">
              <strong>{d.nome}</strong>
              <small>{quemE(d)}</small>
              {d.para === "CLIENTE" ? (
                <p className="fi-prox"><Icone nome="whats" className="ico" />Prestação de contas: <b>{l.prestacaoEm ? `enviada em ${diaCurto(diaDoInstante(l.prestacaoEm))}` : "ainda não enviada"}</b></p>
              ) : null}
              {d.dispensa ? <p className="fi-prox"><Icone nome="alerta" className="ico" />Dispensado: <b>{d.dispensa.motivo}</b></p> : null}
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
          {feitas.length ? `${contar(feitas.length, "parte feita", "partes feitas")}.` : "Nada repassado ainda."} O prazo do escritório é de {prazo} dias úteis.
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

function RepassesConteudo({ escritorio }: { escritorio: string }) {
  const hoje = hojeBrasilia();
  const { dados, recarregar } = useCarga<ListaRepasses>("/v1/escritorio/financeiro/repasses");
  const [registrar, setRegistrar] = useState(false);
  const [feitoEm, setFeitoEm] = useState<{ l: Levantamento; d: Destinacao } | null>(null);
  const [dispensar, setDispensar] = useState<{ l: Levantamento; d: Destinacao } | null>(null);
  const [prestacao, setPrestacao] = useState<Levantamento | null>(null);
  const [feito, setFeito] = useState<Feito | null>(null);
  const terminar = (f: Feito) => {
    setRegistrar(false);
    setFeitoEm(null);
    setDispensar(null);
    setPrestacao(null);
    setFeito(f);
    recarregar();
  };
  const janelas = (
    <>
      {registrar && dados && dados !== "erro" ? <JanelaRegistrar casos={dados.casos} aoFechar={() => setRegistrar(false)} aoFeito={terminar} /> : null}
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
  return (
    <div className="fi">
      <CabRepasses aoRegistrar={() => setRegistrar(true)} />
      <div className="fi-nums" role="group" aria-label="Números dos repasses">
        <a href="#t-blocos">
          <span className="r">A repassar</span>
          <b className="num">{reais(t.aRepassar)}</b>
          <small>{t.repassesPendentes ? contar(t.repassesPendentes, "repasse", "repasses") : "nenhum"}</small>
        </a>
        <a href="#t-blocos">
          <span className="r">Honorários a transferir</span>
          <b className="num">{reais(t.honorarios)}</b>
          <small>para a conta do escritório</small>
        </a>
        <a href="#t-blocos">
          <span className="r">Casos para fechar</span>
          <b className="num">{t.casos}</b>
          <small>{t.casos === 1 ? "espera repasse" : "esperam repasse"}</small>
        </a>
        <a href="#t-repassados">
          <span className="r">Repassado em {mes}</span>
          <b className="num">{reais(dados.repassadoMes.valor)}</b>
          <small>{dados.repassadoMes.clientes ? contar(dados.repassadoMes.clientes, "cliente", "clientes") : "nenhum cliente ainda"}</small>
        </a>
      </div>
      <div className="fi-grade">
        <div className="fi-col">
          <h2 id="t-blocos" className="sr" tabIndex={-1}>Valores esperando repasse</h2>
          {dados.levantamentos.length ? (
            dados.levantamentos.map((l) => (
              <Bloco key={l.id} l={l} hoje={hoje} prazo={dados.prazoDias}
                aoFeito={(lv, d) => setFeitoEm({ l: lv, d })} aoDispensar={(lv, d) => setDispensar({ l: lv, d })} aoPrestacao={setPrestacao} />
            ))
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
  return <MolduraArea area="FINANCEIRO" secao="repasses">{(e) => <RepassesConteudo escritorio={e.nome} />}</MolduraArea>;
}

// ------------------------------------------------------------------------- Registrar alvará ou RPV

type LinhaTela = { chave: string; para: ParaDestinacao; nome: string; regra: string | null; valor: string; contaId?: string; proposta: boolean };

function JanelaRegistrar({ casos, aoFechar, aoFeito }: { casos: ListaRepasses["casos"]; aoFechar: () => void; aoFeito: (f: Feito) => void }) {
  const hoje = hojeBrasilia();
  const opcoes = casos.flatMap((c) => (c.clientes ?? []).map((k) => ({ valor: `${c.id}|${k.id}`, rotulo: `${k.nome} · ${c.nome}`, cliente: k.nome })));
  const [tipo, setTipo] = useState<TipoLevantamento | "">("");
  const [alvo, setAlvo] = useState(opcoes.length === 1 ? opcoes[0]!.valor : "");
  const [valor, setValor] = useState("");
  const [dia, setDia] = useState(diaBr(hoje));
  const [div, setDiv] = useState<{ chave: string; contrato: PropostaRepasse["contrato"]; linhas: LinhaTela[] } | null>(null);
  const [erros, setErros] = useState<string[]>([]);
  const [futuro, setFuturo] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const corpo = useRef<HTMLDivElement>(null);
  const seq = useRef(0);
  const tem = (c: string) => erros.includes(c);
  const total = lerCentavos(valor);
  const [casoId, clienteId] = alvo ? alvo.split("|") : [null, null];
  const nomeCliente = opcoes.find((o) => o.valor === alvo)?.cliente ?? "o cliente";
  // A divisão vale para o caso, o cliente e o valor escritos; mudou um deles, vem outra proposta.
  const chaveAtual = casoId && clienteId && total ? `${alvo}|${total}` : null;
  const linhas = div && div.chave === chaveAtual ? div.linhas : null;
  const contrato = linhas ? div!.contrato : null;
  const buscando = !!chaveAtual && !linhas;
  const setLinhas = (f: (ls: LinhaTela[]) => LinhaTela[]) => setDiv((d) => (d ? { ...d, linhas: f(d.linhas) } : d));

  // A proposta pelo contrato, quando o caso, o cliente e o valor estão escritos.
  useEffect(() => {
    if (!chaveAtual) return;
    const n = ++seq.current;
    void chamarPortal<PropostaRepasse>("/v1/escritorio/financeiro/repasses/proposta", { metodo: "POST", corpo: { casoId, clienteId, valor: total } }).then((r) => {
      if (n !== seq.current) return;
      const linhasProposta = r.ok
        ? r.dados.linhas.map((x, i) => ({ chave: `p${i}`, para: x.para, nome: x.nome, regra: x.regra, valor: paraCampo(x.valor), contaId: x.contaId, proposta: true }))
        : [];
      setDiv({ chave: chaveAtual, contrato: r.ok ? r.dados.contrato : null, linhas: linhasProposta });
    });
  }, [chaveAtual, casoId, clienteId, total]);

  const outras = (linhas ?? []).reduce((s, x) => s + (lerCentavos(x.valor) ?? 0), 0);
  const doCliente = (total ?? 0) - outras;
  const mudar = (chave: string, campo: "nome" | "valor" | "para", v: string) =>
    setLinhas((ls) => ls.map((x) => (x.chave === chave ? { ...x, [campo]: v } : x)));
  const acrescentar = () =>
    setLinhas((ls) => [...ls, { chave: `m${Date.now()}`, para: "PERITO", nome: "", regra: null, valor: "", proposta: false }]);

  async function enviar() {
    const e: string[] = [];
    const d = lerDia(dia);
    if (!tipo) e.push("tipo");
    if (!alvo) e.push("casoId");
    if (!total) e.push("valor");
    if (!d || d > hoje) e.push("entrouEm");
    const linhasRuins = (linhas ?? []).some((x) => !lerCentavos(x.valor) || x.nome.trim().length < 2);
    if (total && linhas && (linhasRuins || doCliente <= 0)) e.push("divisao");
    setFuturo(!!d && d > hoje);
    setFalha(null);
    if (e.length) {
      setErros(e);
      return focarPrimeiroErro(corpo.current);
    }
    setErros([]);
    setEnviando(true);
    const divisao = [
      { para: "CLIENTE", valor: doCliente },
      ...(linhas ?? []).map((x) => ({ para: x.para, nome: x.nome.trim(), regra: x.regra, valor: lerCentavos(x.valor), contaId: x.contaId ?? null })),
    ];
    const r = await chamarPortal<{ id: string }>("/v1/escritorio/financeiro/repasses", {
      metodo: "POST", corpo: { tipo, casoId, clienteId, valor: total, entrouEm: d, divisao },
    });
    setEnviando(false);
    if (r.ok) {
      return aoFeito({
        titulo: `${TIPOS_LEVANTAMENTO[tipo as TipoLevantamento]} registrado.`,
        texto: `${reais(total!)} de terceiros. ${reais(doCliente)} para ${nomeCliente}, até ${dataBr(somarDiasUteis(d!, 3))}.`,
      });
    }
    const campos = r.erro.detalhes?.campos;
    if (r.erro.codigo === "VALIDATION_ERROR" && Array.isArray(campos) && campos.length) {
      setErros(campos.map((c) => (c === "clienteId" ? "casoId" : String(c))));
      setFuturo(false);
      return focarPrimeiroErro(corpo.current);
    }
    setFalha(textoDoErro(r.erro));
  }

  return (
    <Janela id="j-rpv" classe="fi-larga" aberta aoFechar={aoFechar} sobretitulo="Repasses" titulo="Registrar alvará ou RPV" descricao="j-rpv-d"
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
        <p id="j-rpv-d">Diga o que entrou e de qual caso. A divisão sai do contrato, e você pode ajustar antes de registrar.</p>
        {erros.length ? <Aviso tom="urgencia" titulo={faltaAcertar(erros.length)}>Nada foi registrado ainda.</Aviso> : null}
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
              aria-invalid={tem("valor") || undefined} aria-describedby={descritoPor(tem("valor") && "rp-valor-er")} />
            {tem("valor") ? <ErroCampo id="rp-valor-er">Escreva o valor em reais. Ex.: 12.700,00.</ErroCampo> : null}
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

        <fieldset className="rp-div" aria-describedby={descritoPor(tem("divisao") && "rp-div-er")}>
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
                          <div className="fi-quem"><strong>{x.nome}</strong>{x.regra ? <small>{x.regra}</small> : null}</div>
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
              <button className="btn btn-sec btn-compacto" type="button" onClick={acrescentar} style={{ justifySelf: "start" }}>
                <Icone nome="mais" className="ico" />Acrescentar perito, parceiro ou outro
              </button>
              <p className={doCliente > 0 ? "fi-ref" : "fi-ref rp-ruim"} role="status">
                <Icone nome={doCliente > 0 ? "check" : "alerta"} className="ico" />
                <span>
                  {doCliente > 0
                    ? <>Soma da divisão: <b>{reais(total ?? 0)}</b>, igual ao valor levantado. Falta destinar: <b>R$ 0,00</b>. </>
                    : <>As outras partes somam <b>{reais(outras)}</b>, mais do que o valor levantado. </>}
                  Parcela em atraso do cliente <b>não</b> é descontada aqui sem o aceite de {primeiroNome(nomeCliente)}.
                </span>
              </p>
              {tem("divisao") ? <ErroCampo id="rp-div-er">Confira cada parte: todas precisam de nome e valor, e o cliente precisa ficar com algum valor.</ErroCampo> : null}
            </>
          )}
        </fieldset>
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

  async function marcar() {
    setFalha(null);
    setEnviando(true);
    const r = await chamarPortal<{ id: string }>(`/v1/escritorio/financeiro/repasses/${l.id}/prestacao`, { metodo: "POST", corpo: {} });
    setEnviando(false);
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
            <Icone nome="check" className="ico" />
            Marcar como enviada
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
        <AcoesPrestacao l={l} escritorio={escritorio} />
        <Aviso tom="info" titulo="O WhatsApp do escritório ainda não está ligado ao T3jus.">
          Por enquanto, envie pelo aparelho e marque aqui. Quando Conversas estiver pronta, a mensagem sai pelo número do escritório e mostra quando foi lida.
        </Aviso>
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
};

function detalheHistorico(acao: string, d: Record<string, unknown>): string | null {
  if (acao === "financeiro.levantamento") return d.seguiuProposta ? "divisão do contrato aceita sem mudança" : "divisão ajustada à mão";
  if (acao === "financeiro.repasse_dispensado") return String(d.motivo ?? "");
  if (acao === "financeiro.repasse_feito" && d.feitoEm) return `dinheiro saiu em ${dataBr(String(d.feitoEm))}`;
  return null;
}

function HistoricoRepasse({ f, hoje }: { f: FichaRepasse; hoje: string }) {
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
              const det = detalheHistorico(e.acao, e.dados);
              return (
                <li key={`${e.em}-${i}`}>
                  <time dateTime={e.em}>{horaDoInstante(e.em)}</time>
                  <span className="pto" aria-hidden="true" />
                  <div>
                    <p>{e.por ? <><b>{e.por.nome}</b> </> : null}{(FRASES[e.acao] ?? (() => e.acao))(e.dados)}</p>
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
  const [feito, setFeito] = useState<Feito | null>(null);
  const nome = dados && dados !== "erro" ? dados.cliente.nome : null;
  useEffect(() => {
    if (nome) aoNome(nome);
  }, [nome, aoNome]);
  const terminar = (x: Feito) => {
    setFeitoEm(null);
    setDispensar(null);
    setPrestacao(false);
    setFeito(x);
    recarregar();
  };

  if (dados === "erro") return <ErroAoCarregar oque="o repasse" aoTentar={recarregar} />;
  if (!dados) return <Carregando rotulo="Carregando o repasse…" linhas={5} />;
  const f = dados;
  const abertas = f.destinacoes.filter(pendente);
  const faltaPagar = abertas.reduce((s, d) => s + d.valor, 0);
  const pago = f.destinacoes.filter((d) => d.situacao === "FEITO").reduce((s, d) => s + d.valor, 0);
  const grupos = [
    { rot: "Cliente", cor: "var(--vinho)", v: f.destinacoes.filter((d) => d.para === "CLIENTE").reduce((s, d) => s + d.valor, 0) },
    { rot: "Escritório", cor: "var(--vinho-2)", v: f.destinacoes.filter((d) => d.escritorio).reduce((s, d) => s + d.valor, 0) },
    { rot: "Outros", cor: "var(--vinho-4)", v: f.destinacoes.filter((d) => !d.escritorio && d.para !== "CLIENTE").reduce((s, d) => s + d.valor, 0) },
  ].filter((g) => g.v > 0);
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
          <p className="fi-oque">
            {abertas.length
              ? <><b>Falta: {quemFalta.join(", ")}.</b> O caso só fecha no financeiro quando tudo for repassado.</>
              : <><b>Cada parte foi feita ou dispensada com motivo.</b></>}
          </p>
        </section>
      </div>

      <div className="fi-grade">
        <div className="fi-col">
          <section className="folha fi-terc" aria-labelledby="t-rp-partes" style={{ overflow: "hidden" }}>
            <div className="fi-terc-cab"><Icone nome="escudo" className="ico" />De terceiros · não é do escritório</div>
            <div className="folha-cab">
              <div>
                <h2 id="t-rp-partes"><Icone nome="enviar" className="ico" />Para onde vai cada parte</h2>
                <p className="sub">A divisão foi registrada por {f.autor.nome} em {diaCurto(diaDoInstante(f.criadoEm))}.</p>
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
            <table className="hn-tab fi-tab fi-dest">
              <caption className="sr">Partes do valor levantado</caption>
              <colgroup>{["40%", "22%", "18%", "20%"].map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
              <thead>
                <tr>
                  <th scope="col">Para quem</th><th scope="col">Situação</th><th scope="col" style={{ textAlign: "right" }}>Valor</th><th scope="col"><span className="sr">Ação</span></th>
                </tr>
              </thead>
              <tbody>
                {f.destinacoes.map((d) => (
                  <tr key={d.id} className={pendente(d) && d.prazo < hoje ? "fi-atraso" : d.situacao === "FEITO" ? "fi-pago" : undefined}>
                    <td>
                      <div className="fi-quem">
                        <strong>{d.nome}</strong>
                        <small>{quemE(d)}</small>
                        {d.dispensa ? <small>Dispensado por {d.dispensa.por.nome}: {d.dispensa.motivo}</small> : null}
                        {d.feitoPor ? <small>Registrado por {d.feitoPor.nome}</small> : null}
                      </div>
                    </td>
                    <td data-r="Situação"><SeloDestinacao d={d} hoje={hoje} /></td>
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
                {f.prestacaoEm && f.prestacaoPor
                  ? `Marcada como enviada por ${f.prestacaoPor.nome} em ${diaCurto(diaDoInstante(f.prestacaoEm))}, às ${horaDoInstante(f.prestacaoEm)}`
                  : "Ainda não enviada"}
              </p>
              <PreviaPrestacao l={f} escritorio={f.escritorio} rodape={f.prestacaoEm ? `Enviada em ${diaCurto(diaDoInstante(f.prestacaoEm))}` : "Prévia · ainda não enviada"} />
            </div>
          </section>
        </div>

        <aside className="fi-col" aria-label="Fechamento e histórico">
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
                <span>{f.prestacaoEm ? "Prestação de contas enviada ao cliente" : <><b>Prestação de contas:</b> ainda não enviada</>}</span>
              </li>
            </ul>
            </div>
            <div className="fi-reserva">
              <Icone nome="cadeado" className="ico" />
              <span><b>Encerrar o caso no financeiro</b> chega na próxima entrega, junto com as parcelas do contrato na mesma conta.</span>
            </div>
          </section>
          <HistoricoRepasse f={f} hoje={hoje} />
        </aside>
      </div>
      {feitoEm ? <JanelaFeito l={f} d={feitoEm} aoFechar={() => setFeitoEm(null)} aoFeito={terminar} /> : null}
      {dispensar ? <JanelaDispensar d={dispensar} aoFechar={() => setDispensar(null)} aoFeito={terminar} /> : null}
      {prestacao ? <JanelaPrestacao l={f} escritorio={f.escritorio} aoFechar={() => setPrestacao(false)} aoFeito={terminar} /> : null}
      {feito ? <Toast feito={feito} aoFechar={() => setFeito(null)} /> : null}
    </div>
  );
}

export function RepasseFinanceiro({ id }: { id: string }) {
  const [nome, setNome] = useState("Repasse");
  return (
    <MolduraArea area="FINANCEIRO" secao="repasses" trilha={[{ nome }]} pagina="co-ficha co-carteira">
      {() => <RepasseConteudo id={id} aoNome={setNome} />}
    </MolduraArea>
  );
}
