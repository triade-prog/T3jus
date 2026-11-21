"use client";
// Ficha do cliente › Avisos automáticos (F3.63; PA-03, PT-03). Tela aprovada em
// docs/design/aprovadas/portal-sem-avisos-sino (sem-avisos.html): a folha logo abaixo de
// Contatos, o selo no cabeçalho e as janelas de registrar, mudar e retirar o pedido. Toda a
// equipe registra (decisão da Carol, 20/11/2026); o pedido vale para o cliente, por qualquer
// contato; as mensagens escritas pela equipe continuam saindo. Nada se apaga.

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  CANAIS_SEM_AVISOS, hojeBrasilia,
  type AvisosDoCliente, type CanalSemAvisos, type FichaCliente, type PedidoSemAvisos,
} from "@t3jus/domain";
import { textoDoErro, type ErroApi } from "../api.ts";
import { Icone } from "../Icone.tsx";
import { Aviso, descritoPor, ErroCampo, faltaAcertar, focarPrimeiroErro, Janela } from "../console/pecas.tsx";
import { dataLonga, hora } from "../console/tempo.ts";
import { dataBr, lerData } from "./clientes.ts";
import { primeiroNome } from "./equipe.ts";
import { chamarPortal } from "./Moldura.tsx";

export type FeitoSemAvisos = { titulo: string; texto: string };

/** O que as janelas precisam do cliente: a ficha inteira serve, e a conversa monta o mesmo. */
export interface ClienteDoPedido {
  id: string;
  nome: string;
  tipo: "PF" | "PJ";
  contatos: { id: string; nome: string; papel: string | null; principal: boolean }[];
}

/**
 * Quando a janela abre dentro da conversa (F3.65): o pedido fica ligado à conversa e à mensagem
 * do cliente que o originou; "Pelo WhatsApp, nesta conversa" e quem escreve vêm marcados.
 */
export interface PedidoNaConversa {
  conversaId: string;
  /** O contato que escreve, na ficha; nulo quando é o próprio cliente ou não se sabe. */
  contatoId: string | null;
  /** Quem escreve é o próprio cliente (titular). */
  titular: boolean;
  /** O nome dito na conversa, quando o contato não está na ficha. */
  quemEscreve: string | null;
  mensagem: { id: string; texto: string; em: string; de: string } | null;
}
type Tipo = PedidoSemAvisos["tipo"];

const AUTOS = "Cobrança de parcela, lembrete de audiência, aviso de etapa e prestação de contas";
const OUTRA = "OUTRA";
const CLIENTE = "CLIENTE";

const canalNome = (c: CanalSemAvisos | null) => CANAIS_SEM_AVISOS.find((x) => x.canal === c)?.nome ?? "Pela conversa";
const canalCurto = (c: CanalSemAvisos | null) => CANAIS_SEM_AVISOS.find((x) => x.canal === c)?.curto ?? "pela conversa";
const oQue = (t: Tipo) => (t === "COBRANCA" ? "os avisos de cobrança" : "os avisos automáticos");
const diaDe = (iso: string) => dataLonga(iso);
const ehHoje = (iso: string) => diaDe(iso) === dataBr(hojeBrasilia());

/** O pedido do cliente: o que vale agora e o histórico (GET /v1/escritorio/clientes/:id/sem-avisos). */
export function useAvisosCliente(id: string, ligado: boolean): { dados: AvisosDoCliente | null; recarregar: () => void } {
  const [dados, setDados] = useState<AvisosDoCliente | null>(null);
  const [vez, setVez] = useState(0);
  useEffect(() => {
    if (!ligado) return;
    let vivo = true;
    void chamarPortal<AvisosDoCliente>(`/v1/escritorio/clientes/${id}/sem-avisos`).then((r) => vivo && r.ok && setDados(r.dados));
    return () => { vivo = false; };
  }, [id, ligado, vez]);
  return { dados, recarregar: useCallback(() => setVez((v) => v + 1), []) };
}

/** O selo do cabeçalho vinho, ao lado de "Ativo". */
export function SeloSemAvisos({ ativo }: { ativo: PedidoSemAvisos | null | undefined }) {
  if (!ativo) return null;
  return (
    <span className="selo sa-selo">
      <Icone nome="sino-mudo" className="ico" />
      {ativo.tipo === "COBRANCA" ? "Sem avisos de cobrança" : "Sem avisos automáticos"}
    </span>
  );
}

function quemTexto(nome: string | null, papel: string | null) {
  if (!nome) return "Não informado";
  return papel ? `${nome} (${papel.split(" · ")[0]!.toLowerCase()})` : nome;
}

/** Linhas do histórico, a mais nova primeiro: cada pedido e, se houver, a retirada. */
function linhasHistorico(h: PedidoSemAvisos[]) {
  const l: { em: string; titulo: string; sub: string }[] = [];
  for (const p of h) {
    if (p.retirada) {
      const r = p.retirada;
      const porQuem = r.por ? ` Registrado por ${r.por.nome}.` : "";
      l.push(r.quem
        ? { em: r.em, titulo: `Pedido retirado: voltou a receber ${oQue(p.tipo)}`, sub: `${quemTexto(r.quemPediu, r.quemPapel)}, ${canalCurto(r.canal)}.${porQuem}` }
        : { em: r.em, titulo: "Pedido mudado por um novo", sub: `O pedido seguinte passou a valer.${porQuem}` });
    }
    const quando = diaDe(p.pedidoEm) !== diaDe(p.registradoEm) ? ` Pedido feito em ${diaDe(p.pedidoEm)}.` : "";
    l.push({
      em: p.registradoEm,
      titulo: p.tipo === "COBRANCA" ? "Pediu para não receber avisos de cobrança" : "Pediu para não receber avisos automáticos",
      sub: `${quemTexto(p.quemPediu, p.quemPapel)}, ${canalCurto(p.canal)}. Registrado por ${p.registradoPor?.nome ?? "alguém da equipe"}, ${p.origem === "CONVERSA" ? "na conversa" : "na ficha"}.${quando}`,
    });
  }
  return l.sort((a, b) => b.em.localeCompare(a.em));
}

function Historico({ h, aberto }: { h: PedidoSemAvisos[]; aberto: boolean }) {
  const l = linhasHistorico(h);
  if (!l.length) return null;
  return (
    <details className="sa-hist" open={aberto || undefined}>
      <summary>
        <Icone nome="historico" className="ico ico-s" />
        Histórico do pedido <span className="q">({l.length})</span>
        <Icone nome="baixo" className="ico ico-abre" />
      </summary>
      <ol className="sa-ev">
        {l.map((x, i) => (
          <li key={i}>
            <time dateTime={x.em}>{diaDe(x.em)} · {hora(x.em)}</time>
            <div>
              <b>{x.titulo}</b>
              <small>{x.sub}</small>
            </div>
          </li>
        ))}
      </ol>
    </details>
  );
}

/** A folha "Avisos automáticos", logo abaixo de Contatos, com as janelas. */
export function FolhaSemAvisos({ f, dados, eu, podeEscrever, aoFeito }: {
  f: FichaCliente;
  dados: AvisosDoCliente | null;
  /** Nome de quem está usando (para o "você"). */
  eu: string | null;
  podeEscrever: boolean;
  aoFeito: (feito: FeitoSemAvisos) => void;
}) {
  const ids = useId();
  const [janela, setJanela] = useState<"pedido" | "mudar" | "retirar" | null>(null);
  const [vez, setVez] = useState(0);
  const [abrirHist, setAbrirHist] = useState(false);
  if (!dados) return null;
  const a = dados.ativo;
  const pode = podeEscrever && dados.podeMudar;
  const abrir = (j: typeof janela) => { setVez((v) => v + 1); setJanela(j); };
  const feito = (x: FeitoSemAvisos, hist = false) => { setJanela(null); setAbrirHist(hist); aoFeito(x); };
  const ultimaRetirada = !a ? dados.historico.find((p) => p.retirada?.quem) : undefined;

  let corpo;
  if (!a) {
    corpo = (
      <>
        <p className="sa-linha">
          <Icone nome="sino" className="ico" />
          <span>
            <b>{ultimaRetirada ? `Recebe os avisos automáticos desde ${diaDe(ultimaRetirada.retirada!.em)}, quando o pedido foi retirado.` : "Recebe os avisos automáticos."}</b>{" "}
            {AUTOS}, os que estiverem ligados. Se o cliente ou um contato pedir para não receber, registre aqui.
          </span>
        </p>
        {pode ? (
          <div className="sa-acoes">
            <button className="btn btn-sec" type="button" onClick={() => abrir("pedido")}>
              <Icone nome="sino-mudo" className="ico" />
              Registrar pedido para não receber
            </button>
          </div>
        ) : null}
      </>
    );
  } else {
    const reg = a.registradoPor;
    const voce = reg && eu && reg.nome === eu ? " (você)" : "";
    const quando = ehHoje(a.registradoEm) ? `hoje às ${hora(a.registradoEm)}` : `${diaDe(a.registradoEm).slice(0, 5)} às ${hora(a.registradoEm)}`;
    corpo = (
      <>
        <div className="sa-fora">
          <p className="sa-fora-tit">
            <Icone nome="sino-mudo" className="ico" />
            <span>
              <strong>{a.tipo === "COBRANCA" ? "Fora dos avisos de cobrança" : "Fora de todos os avisos automáticos"} desde {diaDe(a.pedidoEm)}</strong>
              <small>
                {a.tipo === "COBRANCA"
                  ? "Não recebe aviso de parcela a vencer nem de parcela atrasada."
                  : "Nada sai sozinho para este cliente: nem cobrança, nem lembrete, nem aviso de etapa."}
              </small>
            </span>
          </p>
          <dl className="sa-dl">
            <div>
              <dt>Quem pediu</dt>
              <dd>{a.quemPediu ?? "Não informado"}{a.quemPapel ? <small>{a.quemPapel.replace(/^./, (x) => x.toUpperCase())}</small> : null}</dd>
            </div>
            <div>
              <dt>Como pediu</dt>
              <dd>{canalNome(a.canal)}</dd>
            </div>
            <div>
              <dt>Registrado por</dt>
              <dd>{reg ? `${reg.nome}${voce}` : "Alguém da equipe"}<small>{a.origem === "CONVERSA" ? "Na conversa" : "Na ficha"}, {quando}</small></dd>
            </div>
          </dl>
        </div>
        {a.tipo === "COBRANCA" ? (
          <p className="sa-continua">
            <Icone nome="check" className="ico" />
            <span><b>Continua recebendo:</b> lembrete de audiência, aviso de etapa do caso e prestação de contas. Mensagens que a equipe escreve na conversa também continuam.</span>
          </p>
        ) : (
          <p className="sa-continua">
            <Icone nome="conversas" className="ico" />
            <span><b>Continua:</b> as mensagens que a equipe escreve na conversa.</span>
          </p>
        )}
        {pode ? (
          <div className="sa-acoes">
            <button className="btn btn-sec" type="button" onClick={() => abrir("mudar")}>
              <Icone nome="lapis" className="ico" />
              Mudar o pedido
            </button>
            <button className="btn btn-sec" type="button" onClick={() => abrir("retirar")}>
              <Icone nome="sino-volta" className="ico" />
              Retirar o pedido
            </button>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <section className="folha" aria-labelledby={`${ids}-t`}>
      <div className="folha-cab">
        <div>
          <h2 id={`${ids}-t`}>Avisos automáticos</h2>
          <p className="sub">O que sai sozinho pelo WhatsApp do escritório.</p>
        </div>
      </div>
      <div className="sa-corpo">
        {corpo}
        <Historico key={`h-${vez}-${abrirHist}`} h={dados.historico} aberto={abrirHist} />
      </div>
      {pode ? (
        <>
          <JanelaPedido key={`p-${vez}`} aberta={janela === "pedido" || janela === "mudar"} f={f} atual={janela === "mudar" ? a : null}
            aoFechar={() => setJanela(null)} aoFeito={(x) => feito(x)} />
          {a ? <JanelaRetirar key={`r-${vez}`} aberta={janela === "retirar"} f={f} atual={a} aoFechar={() => setJanela(null)} aoFeito={(x) => feito(x, true)} /> : null}
        </>
      ) : null}
    </section>
  );
}

// ------------------------------------------------------------------ janelas

type Opcao = { v: string; t: string; sub?: string; agora?: boolean };

/** Quem pode ter pedido: na PF, o próprio cliente; os contatos da ficha; e outra pessoa. */
function opcoesQuem(f: ClienteDoPedido, agora?: PedidoNaConversa): Opcao[] {
  const mesmo = (n: string) => n.trim().toLowerCase() === f.nome.trim().toLowerCase();
  const ops: Opcao[] = [
    ...(f.tipo === "PF" ? [{ v: CLIENTE, t: f.nome, sub: "Titular, o próprio cliente" }] : []),
    ...f.contatos.filter((c) => !(f.tipo === "PF" && mesmo(c.nome))).map((c) => ({
      v: c.id, t: c.nome,
      sub: [c.papel, c.principal ? "contato principal" : null].filter(Boolean).join(" · ").replace(/^./, (x) => x.toUpperCase()) || undefined,
    })),
    { v: OUTRA, t: "Outra pessoa", sub: "Escreva o nome" },
  ];
  if (agora) {
    const v = quemEscreveNaConversa(f, agora, ops);
    for (const o of ops) if (o.v === v) o.agora = true;
  }
  return ops;
}

/** Quem está escrevendo na conversa, entre as opções de "quem pediu". */
function quemEscreveNaConversa(f: ClienteDoPedido, agora: PedidoNaConversa, ops: Opcao[]): string {
  if (agora.contatoId && ops.some((o) => o.v === agora.contatoId)) return agora.contatoId;
  const contato = f.contatos.find((c) => c.id === agora.contatoId);
  if ((agora.titular || contato) && ops.some((o) => o.v === CLIENTE)) return CLIENTE;
  return OUTRA;
}

function Radios({ nome, legenda, itens, valor, aoEscolher, cls = "", erro }: {
  nome: string; legenda: string; itens: Opcao[]; valor: string; aoEscolher: (v: string) => void; cls?: string; erro?: string;
}) {
  return (
    <fieldset className={`x-ops ${cls}${erro ? " erro" : ""}`} aria-describedby={erro ? `${nome}-er` : undefined}>
      <legend>{legenda}</legend>
      <div className="x-ops-l">
        {itens.map((i) => (
          <label key={i.v} className="opcao">
            <input className="marcar" type="radio" name={nome} value={i.v} checked={valor === i.v} onChange={() => aoEscolher(i.v)} />
            <span>
              {i.t}
              {i.sub ? <small>{i.sub}</small> : null}
              {i.agora ? <span className="ca-agora"><Icone nome="conversas" className="ico" />Escrevendo nesta conversa</span> : null}
            </span>
          </label>
        ))}
      </div>
      {erro ? <ErroCampo id={`${nome}-er`}>{erro}</ErroCampo> : null}
    </fieldset>
  );
}

const COMO: Opcao[] = CANAIS_SEM_AVISOS.map((c) => ({ v: c.canal, t: c.nome, sub: c.canal === "WHATSAPP" ? "Na conversa" : undefined }));
const COMO_NA_CONVERSA: Opcao[] = COMO.map((o) => (o.v === "WHATSAPP" ? { ...o, sub: "Nesta conversa" } : o));

/** O que vai junto ao servidor quando o pedido é feito na conversa. */
function daConversa(agora: PedidoNaConversa | undefined) {
  return agora ? { conversaId: agora.conversaId, ...(agora.mensagem ? { mensagemId: agora.mensagem.id } : {}) } : {};
}

function quemDoValor(v: string, outra: string) {
  if (v === CLIENTE) return { quem: "CLIENTE" as const };
  if (v === OUTRA) return { quem: "OUTRA" as const, quemPediu: outra.trim() };
  return { quem: "CONTATO" as const, contatoId: v };
}

/** Erros do servidor presos ao campo. */
function errosDoServidor(e: ErroApi, hoje: string): Record<string, string> | null {
  const campos = (e.detalhes?.campos as string[] | undefined) ?? [];
  const r: Record<string, string> = {};
  if (campos.includes("pedidoEm")) r.data = e.detalhes?.motivo === "DATA_NO_FUTURO" ? `A data não pode ser depois de hoje (${dataBr(hoje)}).` : "Confira a data (dd/mm/aaaa).";
  if (campos.includes("quemPediu")) r.outra = "Escreva o nome de quem pediu e o que a pessoa é do cliente.";
  if (campos.includes("quem")) r.quem = "Escolha quem pediu.";
  if (campos.includes("canal")) r.como = "Diga como pediu.";
  return Object.keys(r).length ? r : null;
}

export function JanelaPedido({ aberta, f, atual, aoFechar, aoFeito, agora }: {
  aberta: boolean; f: ClienteDoPedido; atual: PedidoSemAvisos | null; aoFechar: () => void; aoFeito: (x: FeitoSemAvisos) => void;
  /** Aberta na conversa (F3.65). */
  agora?: PedidoNaConversa;
}) {
  const ids = useId();
  const corpo = useRef<HTMLDivElement>(null);
  const hoje = hojeBrasilia();
  const ops = opcoesQuem(f, agora);
  const principal = f.contatos.find((c) => c.principal)?.id;
  const escreve = agora ? quemEscreveNaConversa(f, agora, ops) : null;
  const [v, setV] = useState({
    tipo: (atual ? (atual.tipo === "COBRANCA" ? "TODOS" : "COBRANCA") : "COBRANCA") as Tipo,
    quem: escreve ?? (atual?.quem === "CLIENTE" ? CLIENTE : atual?.contatoId ?? (ops.some((o) => o.v === principal) ? principal! : ops[0]!.v)),
    outra: escreve === OUTRA ? (agora?.quemEscreve ?? "") : atual?.quem === "OUTRA" ? atual.quemPediu ?? "" : "",
    como: (agora ? "WHATSAPP" : atual?.canal ?? "WHATSAPP") as string,
    data: dataBr(hoje),
  });
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [enviando, setEnviando] = useState(false);
  const mudar = (k: keyof typeof v, x: string) => setV((o) => ({ ...o, [k]: x }));
  const n = Object.keys(erros).length;

  async function registrar() {
    setErro(null);
    const e: Record<string, string> = {};
    const dia = lerData(v.data);
    if (v.quem === OUTRA && !v.outra.trim()) e.outra = "Escreva o nome de quem pediu e o que a pessoa é do cliente.";
    if (!dia) e.data = "Escreva a data como dd/mm/aaaa.";
    else if (dia > hoje) e.data = `A data não pode ser depois de hoje (${dataBr(hoje)}).`;
    setErros(e);
    if (Object.keys(e).length) { focarPrimeiroErro(corpo.current); return; }
    setEnviando(true);
    const r = await chamarPortal(`/v1/escritorio/clientes/${f.id}/sem-avisos`, {
      corpo: { tipo: v.tipo, origem: agora ? "CONVERSA" : "FICHA", canal: v.como, pedidoEm: dia, ...quemDoValor(v.quem, v.outra), ...daConversa(agora) },
    });
    setEnviando(false);
    if (!r.ok) {
      const c = errosDoServidor(r.erro, hoje);
      if (c) { setErros(c); focarPrimeiroErro(corpo.current); } else setErro(r.erro);
      return;
    }
    const nome = f.tipo === "PF" ? primeiroNome(f.nome) : f.nome;
    aoFeito(atual
      ? { titulo: "Pedido mudado.", texto: `Agora ${nome} não recebe ${oQue(v.tipo)}. O pedido anterior ficou no histórico.` }
      : { titulo: "Pedido registrado.", texto: `${nome} não recebe mais ${oQue(v.tipo)}.${v.tipo === "COBRANCA" ? " Lembretes e avisos de etapa continuam." : " As mensagens escritas pela equipe continuam."}` });
  }

  const campoTexto = (k: "outra" | "data", rotulo: string, ajuda: string, extra: { numerico?: boolean; curto?: boolean } = {}) => {
    const id = `${ids}-${k}`;
    const e = erros[k];
    return (
      <div className="campo" style={extra.curto ? { maxWidth: 220 } : undefined}>
        <label htmlFor={id}>{rotulo}</label>
        <input className="entrada" id={id} value={v[k]} inputMode={extra.numerico ? "numeric" : undefined} maxLength={k === "outra" ? 120 : 10}
          onChange={(ev) => mudar(k, ev.target.value)} aria-invalid={e ? true : undefined}
          aria-describedby={descritoPor(!e && `${id}-aj`, e && `${id}-er`)} />
        {e ? <ErroCampo id={`${id}-er`}>{e}</ErroCampo> : <p className="ajuda" id={`${id}-aj`}>{ajuda}</p>}
      </div>
    );
  };

  return (
    <Janela id={`${ids}-j`} classe="x-larga sa-j" aberta={aberta} aoFechar={aoFechar} sobretitulo={f.nome}
      titulo={atual ? "Mudar o pedido de avisos" : "Não receber avisos automáticos"} descricao={`${ids}-d`} aoEnviar={() => void registrar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-pri" type="submit" disabled={enviando}>
            <Icone nome="check" className="ico" />
            {enviando ? "Salvando…" : atual ? "Salvar o novo pedido" : "Registrar pedido"}
          </button>
        </>
      }>
      <div ref={corpo} style={{ display: "contents" }}>
        <p id={`${ids}-d`}>
          {atual
            ? "Use quando o cliente ou um contato pedir outra coisa: por exemplo, parar também os lembretes."
            : agora?.mensagem
              ? `Registre o pedido que ${primeiroNome(agora.mensagem.de)} fez nesta conversa. Vale para todas as automações do escritório, a partir de agora.`
              : "Registre o pedido feito pelo cliente ou por um contato. Vale para todas as automações do escritório, a partir de agora."}
        </p>
        {n ? <Aviso tom="urgencia" titulo={faltaAcertar(n)}>O pedido ainda não foi registrado.</Aviso> : null}
        {erro ? <Aviso tom="urgencia" titulo="O pedido não foi registrado.">{textoDoErro(erro)} Nada foi salvo e o que você escolheu continua aqui.</Aviso> : null}
        {agora?.mensagem && !atual ? <CitaMensagem m={agora.mensagem} /> : null}
        <Radios nome={`${ids}-tipo`} legenda="O que não quer receber" cls="sa-tipo" valor={v.tipo} aoEscolher={(x) => mudar("tipo", x)} itens={[
          { v: "COBRANCA", t: "Só os avisos de cobrança", sub: "Parcela a vencer e parcela atrasada. Lembretes de audiência e avisos de etapa continuam." },
          { v: "TODOS", t: "Todos os avisos automáticos", sub: "Cobrança, lembrete de audiência, aviso de etapa e prestação de contas. Nada sai sozinho." },
        ]} />
        <Radios nome={`${ids}-quem`} legenda="Quem pediu" valor={v.quem} aoEscolher={(x) => mudar("quem", x)} itens={ops} erro={erros.quem} />
        {v.quem === OUTRA ? campoTexto("outra", "Nome de quem pediu e o que é do cliente", "Ex.: Marta Corrêa, esposa.") : null}
        <Radios nome={`${ids}-como`} legenda="Como pediu" cls="sa-como" valor={v.como} aoEscolher={(x) => mudar("como", x)} itens={agora ? COMO_NA_CONVERSA : COMO} erro={erros.como} />
        {campoTexto("data", "Quando pediu", "dd/mm/aaaa. Se o pedido chegou antes e só agora está sendo registrado, ponha o dia em que chegou.", { numerico: true })}
        <p className="pt-comuns">
          <Icone nome="historico" className="ico" />
          <span>
            {atual
              ? `O pedido atual (${atual.tipo === "COBRANCA" ? "só cobrança" : "todos os avisos"}, desde ${diaDe(atual.pedidoEm).slice(0, 5)}) fica no histórico, e o novo passa a valer agora. Fica registrado com seu nome e a hora.`
              : agora
                ? `Fica registrado com seu nome e a hora, como feito na conversa, e aparece também na ficha de ${f.tipo === "PF" ? primeiroNome(f.nome) : f.nome}. O que a equipe escreve nesta conversa continua saindo. Para mudar ou retirar depois, use este mesmo lugar ou a ficha: nada é apagado.`
                : "Fica registrado com seu nome e a hora. Mensagens escritas pela equipe na conversa continuam saindo. Para voltar a receber, use “Retirar o pedido” na ficha: nada é apagado."}
          </span>
        </p>
      </div>
    </Janela>
  );
}

export function JanelaRetirar({ aberta, f, atual, aoFechar, aoFeito, agora }: {
  aberta: boolean; f: ClienteDoPedido; atual: PedidoSemAvisos; aoFechar: () => void; aoFeito: (x: FeitoSemAvisos) => void;
  agora?: PedidoNaConversa;
}) {
  const ids = useId();
  const corpo = useRef<HTMLDivElement>(null);
  const ops = opcoesQuem(f, agora);
  const escreve = agora ? quemEscreveNaConversa(f, agora, ops) : null;
  const [v, setV] = useState({
    quem: escreve ?? (atual.quem === "CLIENTE" ? CLIENTE : atual.contatoId ?? (ops.find((o) => o.v !== OUTRA)?.v ?? OUTRA)),
    outra: escreve === OUTRA ? (agora?.quemEscreve ?? "") : "", como: agora ? "WHATSAPP" : "TELEFONE",
  });
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [enviando, setEnviando] = useState(false);
  const nome = f.tipo === "PF" ? primeiroNome(f.nome) : f.nome;
  const n = Object.keys(erros).length;

  async function retirar() {
    setErro(null);
    const e: Record<string, string> = {};
    if (v.quem === OUTRA && !v.outra.trim()) e.outra = "Escreva o nome de quem pediu e o que a pessoa é do cliente.";
    setErros(e);
    if (Object.keys(e).length) { focarPrimeiroErro(corpo.current); return; }
    setEnviando(true);
    const r = await chamarPortal(`/v1/escritorio/clientes/${f.id}/sem-avisos`, { corpo: { retirar: true, canal: v.como, ...quemDoValor(v.quem, v.outra), ...(agora ? { conversaId: agora.conversaId } : {}) } });
    setEnviando(false);
    if (!r.ok) {
      const c = errosDoServidor(r.erro, hojeBrasilia());
      if (c) { setErros(c); focarPrimeiroErro(corpo.current); } else setErro(r.erro);
      return;
    }
    aoFeito({ titulo: "Pedido retirado.", texto: `${nome} volta a receber ${oQue(atual.tipo)}. O pedido de ${diaDe(atual.pedidoEm).slice(0, 5)} ficou no histórico.` });
  }

  const outraId = `${ids}-outra`;
  return (
    <Janela id={`${ids}-j`} classe="x-larga sa-j" aberta={aberta} aoFechar={aoFechar} sobretitulo={f.nome}
      titulo={`${nome} volta a receber ${oQue(atual.tipo)}?`} descricao={`${ids}-d`} aoEnviar={() => void retirar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-pri" type="submit" disabled={enviando}>
            <Icone nome="sino-volta" className="ico" />
            {enviando ? "Salvando…" : "Voltar a receber"}
          </button>
        </>
      }>
      <div ref={corpo} style={{ display: "contents" }}>
        <p id={`${ids}-d`}>Retire o pedido só quando o cliente ou um contato pedir. Fica registrado quem pediu e quem retirou.</p>
        {n ? <Aviso tom="urgencia" titulo={faltaAcertar(n)}>O pedido continua valendo.</Aviso> : null}
        {erro ? <Aviso tom="urgencia" titulo="O pedido não foi retirado.">{textoDoErro(erro)}</Aviso> : null}
        <Radios nome={`${ids}-quem`} legenda="Quem pediu para voltar a receber" valor={v.quem} aoEscolher={(x) => setV((o) => ({ ...o, quem: x }))} itens={ops} erro={erros.quem} />
        {v.quem === OUTRA ? (
          <div className="campo">
            <label htmlFor={outraId}>Nome de quem pediu e o que é do cliente</label>
            <input className="entrada" id={outraId} value={v.outra} maxLength={120} onChange={(ev) => setV((o) => ({ ...o, outra: ev.target.value }))}
              aria-invalid={erros.outra ? true : undefined} aria-describedby={descritoPor(!erros.outra && `${outraId}-aj`, erros.outra && `${outraId}-er`)} />
            {erros.outra ? <ErroCampo id={`${outraId}-er`}>{erros.outra}</ErroCampo> : <p className="ajuda" id={`${outraId}-aj`}>Ex.: Marta Corrêa, esposa.</p>}
          </div>
        ) : null}
        <Radios nome={`${ids}-como`} legenda="Como pediu" cls="sa-como" valor={v.como} aoEscolher={(x) => setV((o) => ({ ...o, como: x }))} itens={agora ? COMO_NA_CONVERSA : COMO} erro={erros.como} />
        <p className="pt-comuns">
          <Icone nome="historico" className="ico" />
          <span>
            O pedido de {diaDe(atual.pedidoEm).slice(0, 5)} continua no histórico da ficha, com quem pediu e quem registrou. As automações voltam a incluir {nome} na
            próxima vez que rodarem; nada é enviado agora.
          </span>
        </p>
      </div>
    </Janela>
  );
}

/** A fala do cliente que originou o pedido, no alto da janela (F3.65). */
function CitaMensagem({ m }: { m: NonNullable<PedidoNaConversa["mensagem"]> }) {
  const quando = ehHoje(m.em) ? `hoje às ${hora(m.em)}` : `em ${diaDe(m.em).slice(0, 5)} às ${hora(m.em)}`;
  return (
    <p className="ca-cita">
      <q>{m.texto}</q>
      <small><b>{m.de}</b>, nesta conversa, {quando}. A mensagem fica ligada ao registro.</small>
    </p>
  );
}
