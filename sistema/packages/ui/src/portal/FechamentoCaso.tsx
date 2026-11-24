"use client";
// Fechamento do caso no financeiro (F3.45, F3.128, F3.132; EX-16, EX-17, FI-08): a janela de
// encerrar e as linhas das pendências, comuns à ficha do repasse e à ficha do contrato. Desenho
// aprovado em docs/design/aprovadas/portal-fechamento-sem-levantamento (decisões 7 a 10 e 12):
// o botão nunca fica desabilitado; com pendência, a janela (alertdialog, foco em "Voltar ao …")
// diz o que falta e leva ao atalho da primeira; pronta, encerra o caso e, já marcado, os
// contratos ligados. Quem não encerra contratos vê a seção sem caixa, com quem encerra.

import { useState, type ReactNode } from "react";
import { dataBr, reais, type AcertoCaso, type EventoDeOrigem, type FechamentoNoContrato, type PendenciaCaso } from "@t3jus/domain";
import { textoDoErro } from "../api.ts";
import { Icone } from "../Icone.tsx";
import { Aviso, Janela } from "../console/pecas.tsx";
import { contar, diaCurto } from "./agenda.ts";
import { juntarComE } from "./clientes.ts";
import {
  AJUDA_REPASSE, atalhoBaixar, botaoEncerrar, custasDaParcela, textoRegraEncerrar, comLevantamento, detalheDaPendencia, primeiroAtalho, rotuloEncerrarJunto, textoAjudaPendencia, textoEncerrado,
  textoJaEncerrado, textoQuemEncerraContratos, tituloPendencias, type Atalho,
  dia, gruposDoQuadro, idDaFolha, linhaJuridico, linhaPronto, numerosDoFechamento, resumoFechado, subDoCaso, textoOrigem, type ItemQuadro,
} from "./fechamento.ts";
import { ROTAS_FINANCEIRO } from "./financeiro.ts";
import { ROTAS_JURIDICO } from "./juridico.ts";
import { chamarPortal } from "./Moldura.tsx";

export type Feito = { titulo: string; texto: string };

const fuso = { timeZone: "America/Sao_Paulo" } as const;
const diaDoInstante = (em: string) => new Intl.DateTimeFormat("en-CA", { ...fuso, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(em));
/** "12/11" de uma data ou de um instante. */
export const diaOuInstante = (x: string) => diaCurto(/^\d{4}-\d{2}-\d{2}$/.test(x) ? x : diaDoInstante(x));
const horaDoInstante = (em: string) => new Intl.DateTimeFormat("pt-BR", { ...fuso, hour: "2-digit", minute: "2-digit" }).format(new Date(em)).replace(":", "h");

/** Decisão 12: o aviso de quando alguém encerrou o caso pelo outro lado, já com quem e a hora. */
export function textoJaEncerradoPorOutro(f: AcertoCaso["fechado"]): string {
  return f ? `Este caso já foi encerrado no financeiro por ${f.por.nome}, às ${horaDoInstante(f.em)}.` : "Este caso já foi encerrado no financeiro.";
}

/** As parcelas dos contratos do caso no fechamento (F3.45). */
export function ItemParcelas({ a }: { a: AcertoCaso }) {
  const p = a.parcelas;
  if (!p.total) return null;
  const todas = p.pagas === p.total;
  return (
    <li className={todas ? undefined : "falta"}>
      <Icone nome={todas ? "check" : "alerta"} className="ico" />
      <span>
        {todas ? "Parcelas do contrato todas recebidas" : <><b>Parcelas do contrato:</b> {p.falta ? `falta receber ${reais(p.falta)}` : "há parcela ainda sem valor"}</>}
        <small style={{ display: "block", color: "var(--texto-2)" }}>
          {p.pagas} de {p.total}{todas && p.ultima ? `, a última em ${diaCurto(p.ultima)}` : " recebidas"}
        </small>
      </span>
    </li>
  );
}

/** A linha de uma pendência: o texto, a linha de baixo e se é espera (relógio) ou falta (alerta). */
export type LinhaPendencia = { texto: ReactNode; sub: string; espera?: boolean };

/** A linha de hoje, da ficha do repasse. */
export function linhaDoRepasse(x: PendenciaCaso): LinhaPendencia {
  return { texto: <><b>{x.nome}:</b>{x.valor !== null ? ` ${reais(x.valor)}` : ""}</>, sub: detalheDaPendencia(x) };
}

/** Uma linha da lista de pendências: o ícone e o texto escondido dizem pendente ou a vencer (não só a cor). */
export function ItemPendencia({ l }: { l: LinhaPendencia }) {
  return (
    <li className={l.espera ? "fs-espera" : "falta"}>
      <Icone nome={l.espera ? "relogio" : "alerta"} className="ico" />
      <span>
        {l.texto}<span className="sr">{l.espera ? " (a vencer)" : " (pendente)"}</span>
        <small style={{ display: "block", color: "var(--texto-2)" }}>{l.sub}</small>
      </span>
    </li>
  );
}

function BotaoAtalho({ a, aoAtalho }: { a: Atalho; aoAtalho: (a: Atalho) => void }) {
  if (a.tipo === "link") {
    return <a className="btn btn-pri" href={a.href}><Icone nome="dir" className="ico" />{a.rotulo}</a>;
  }
  return (
    <button className="btn btn-pri" type="button" onClick={() => aoAtalho(a)}>
      <Icone nome={a.tipo === "repasse" ? "enviar" : "moeda"} className="ico" />{a.rotulo}
    </button>
  );
}

/**
 * Encerrar o caso no financeiro (decisões 7 a 10 e 12, FI-08, EX-17). Na ficha do repasse e na
 * do contrato; `noContrato` mostra o resumo "Recebido no caso · Reembolsado · Falta" (estado 8).
 */
export function JanelaFechamento({
  casoId, acerto, descricao, descricaoPronta, voltar, atalho, aoAtalho, aoFechar, aoFeito, aoJaEncerrado, linha = linhaDoRepasse, ajuda, nomeCaso,
  noContrato = false, resumo, baixar,
}: {
  casoId: string;
  acerto: AcertoCaso;
  nomeCaso: string;
  /** O parágrafo que descreve a janela. */
  descricao: string;
  /** O da janela pronta, quando é outro. */
  descricaoPronta?: string;
  voltar: "Voltar ao caso" | "Voltar ao contrato";
  atalho: (p: PendenciaCaso) => Atalho | null;
  aoAtalho: (a: Atalho) => void;
  aoFechar: () => void;
  aoFeito: (f: Feito) => void;
  /** CASO_JA_ENCERRADO: alguém encerrou pelo outro lado; a ficha recarrega e anuncia. */
  aoJaEncerrado: () => void;
  linha?: (p: PendenciaCaso) => LinhaPendencia;
  /** A segunda frase da ajuda da janela de pendência, no lugar da padrão (null: a padrão). */
  ajuda?: (lista: PendenciaCaso[]) => string | null;
  noContrato?: boolean;
  /** O resumo do caso pronto (estado 8): Recebido no caso, Reembolsado, Falta. */
  resumo?: ReactNode;
  /** F3.139: a data de hoje, quando quem vê pode dar baixa sem receber (ficha do contrato). */
  baixar?: { hoje: string };
}) {
  const [pend, setPend] = useState<{ lista: PendenciaCaso[]; falta: number }>({ lista: acerto.pendencias, falta: acerto.falta });
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  // EX-17 (decisão 24): os contratos ligados se encerram junto, já marcado. Decisão 10: quem não
  // encerra contratos vê a seção, sem a caixa.
  const ligados = acerto.contratosLigados ?? [];
  const ja = acerto.contratosJaEncerrados ?? [];
  const pode = !!acerto.podeEncerrarContratos;
  const [junto, setJunto] = useState(true);
  const comContratos = pode && junto && ligados.length > 0;
  const numeros = juntarComE(ligados.map((c) => c.numero));
  const tudo = textoEncerrado(acerto);

  async function enviar() {
    setFalha(null);
    setEnviando(true);
    const corpo = comContratos ? { contratos: ligados.map((c) => ({ id: c.id, versao: c.versao })) } : {};
    const r = await chamarPortal<AcertoCaso>(`/v1/escritorio/financeiro/casos/${casoId}/encerrar`, { metodo: "POST", corpo });
    setEnviando(false);
    if (r.ok) {
      const n = r.dados.contratosEncerrados?.length ?? 0;
      return aoFeito(n
        ? { titulo: n === 1 ? "Caso e contrato encerrados." : "Caso e contratos encerrados.",
            texto: `${nomeCaso}: ${tudo}. ${n === 1 ? `O contrato ${numeros} foi encerrado junto` : `Os contratos ${numeros} foram encerrados junto`}. Ficou no histórico do caso e do contrato.` }
        : { titulo: "Caso encerrado no financeiro.", texto: `${nomeCaso}: ${tudo}. O encerramento ficou no histórico do caso.` });
    }
    // Decisão 12 (sugestão 4): antes do ramo da cadeia, que pegaria qualquer erro.
    if (r.erro.detalhes?.motivo === "CASO_JA_ENCERRADO") return aoJaEncerrado();
    if (comContratos && r.erro.codigo !== "VALIDATION_ERROR" && r.erro.detalhes?.motivo !== "PENDENCIAS") {
      // Decisão 25: caso e contratos andam juntos; se algo falhou, nada foi encerrado.
      const mudou = r.erro.codigo === "VERSION_CONFLICT"
        ? (ligados.length === 1 ? `O contrato ${numeros} mudou agora há pouco. ` : "Um dos contratos mudou agora há pouco. ")
        : "";
      return setFalha(`${mudou}O caso e ${ligados.length === 1 ? "o contrato continuam abertos" : "os contratos continuam abertos"}. Feche esta janela, confira e tente de novo. ${textoDoErro(r.erro)}`);
    }
    if (r.erro.detalhes?.motivo === "PENDENCIAS") {
      return setPend({ lista: (r.erro.detalhes.pendencias ?? []) as PendenciaCaso[], falta: Number(r.erro.detalhes.falta ?? 0) });
    }
    setFalha(textoDoErro(r.erro));
  }

  if (pend.lista.length) {
    const a = primeiroAtalho(pend.lista, atalho);
    const b = atalhoBaixar(a, pend.lista, baixar?.hoje ?? "", !!baixar);
    const repasse = pend.lista.some((x) => x.tipo === "REPASSE");
    const parcela = pend.lista.find((x) => x.tipo === "PARCELA");
    const cliente = parcela ? (parcela.cliente ?? parcela.nome.split(" · ")[0]!) : null;
    const lev = comLevantamento(acerto);
    // Estado 16: tudo a vencer, nada em atraso.
    const aVencer = pend.lista.every((x) => linha(x).espera);
    const titulo = tituloPendencias(pend.lista, contar);
    const outra = ajuda?.(pend.lista) ?? null;
    return (
      <Janela id="j-enc" aberta alerta aoFechar={aoFechar} sobretitulo="Fechamento do caso" titulo="Ainda não dá para encerrar" descricao="j-enc-d"
        aoEnviar={() => (a && a.tipo !== "link" ? aoAtalho(a) : aoFechar())}
        pe={
          <>
            <button className="btn btn-sec" type="button" onClick={aoFechar} data-foco="">{voltar}</button>
            {b ? (
              <button className="btn btn-sec" type="button" onClick={() => aoAtalho(b)}>
                <Icone nome="moeda" className="ico" />{b.rotulo}
              </button>
            ) : null}
            {a ? <BotaoAtalho a={a} aoAtalho={aoAtalho} /> : null}
          </>
        }>
        <div style={{ display: "grid", gap: 16 }}>
          <p id="j-enc-d">{descricao}</p>
          <Aviso tom="urgencia" titulo={aVencer ? titulo.replace(/\.$/, ", a vencer.") : titulo}>
            {textoRegraEncerrar(lev)}
            {pend.falta ? ` Faltam ${reais(pend.falta)}.` : ""}
          </Aviso>
          <ul className="fi-check">
            {pend.lista.map((x, i) => <ItemPendencia key={i} l={linha(x)} />)}
          </ul>
          <Aviso tom="info" icone="ajuda">
            Registre o que falta e o caso fica pronto para encerrar.
            {repasse || (lev && !cliente) ? ` ${AJUDA_REPASSE}` : ""}
            {outra ? ` ${outra}` : cliente ? ` ${textoAjudaPendencia(cliente, custasDaParcela(pend.lista, parcela?.parcelaId))}` : ""}
          </Aviso>
        </div>
      </Janela>
    );
  }

  const depois = comContratos
    ? <>O caso sai de “acerto pendente” no Jurídico e {ligados.length === 1 ? "o contrato fica encerrado" : "os contratos ficam encerrados"}. Os dois andam juntos: ou ficam os dois, ou nenhum.</>
    : ligados.length && pode
    ? <>O caso sai de “acerto pendente” no Jurídico. {ligados.length === 1 ? "O contrato continua ativo" : "Os contratos continuam ativos"}, e o próximo passo do cliente lembra de encerrar.</>
    : ligados.length
    ? <>O caso sai de “acerto pendente” no Jurídico. {ligados.length === 1 ? `O contrato ${numeros} continua ativo` : `Os contratos ${numeros} continuam ativos`}, sem nada a cobrar, até a área Contratos {ligados.length === 1 ? "encerrá-lo" : "encerrá-los"}.</>
    : null;
  const itensJa = ja.map((c) => (
    <li key={c.id} className="fs-ja"><Icone nome="pasta" className="ico" /><span><b>{c.numero} · {c.cliente.nome}</b><small>{textoJaEncerrado(c, diaOuInstante)}</small></span></li>
  ));
  const itensLigados = ligados.map((c) => (
    <li key={c.id}><Icone nome="pena" className="ico" /><span><b>{c.numero} · {c.cliente.nome}</b><small>{c.objeto}</small></span></li>
  ));
  const motivo = acerto.motivoContratos && pode ? (
    <p className="jf-motivo"><Icone nome="doc" className="ico" /><span>Motivo que fica no contrato: “{acerto.motivoContratos}”</span></p>
  ) : null;
  // Sugestão 3: sem a caixa, o foco inicial vai para o botão.
  const focoNaCaixa = pode && ligados.length > 0;
  return (
    <Janela id="j-enc" aberta aoFechar={aoFechar} sobretitulo="Fechamento do caso" titulo="Encerrar o caso no financeiro" descricao="j-enc-d" aoEnviar={() => void enviar()}
      pe={
        <>
          <button className={noContrato ? "btn btn-fantasma" : "btn btn-sec"} type="button" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-pri" type="submit" disabled={enviando} aria-busy={enviando || undefined} data-foco={focoNaCaixa ? undefined : ""}>
            <Icone nome="cadeado" className="ico" />
            {botaoEncerrar(ligados.length, comContratos)}
          </button>
        </>
      }>
      <div style={{ display: "grid", gap: 16 }}>
        <p id="j-enc-d">{descricaoPronta ?? descricao} {tudo === "tudo recebido" ? "Tudo foi recebido." : "Tudo foi recebido e repassado."} O encerramento fica no histórico do caso, com o seu nome e a hora.</p>
        {falha ? <Aviso tom="urgencia" titulo={comContratos ? "Nada foi encerrado." : "O caso não foi encerrado."}>{falha}</Aviso> : null}
        {resumo}
        {ligados.length && pode ? (
          <fieldset className="fl-caso">
            <legend>Contratos ligados ao caso<small>Encerrar para as cobranças novas. Nada é apagado.</small></legend>
            <label className="opcao">
              <input className="marcar" type="checkbox" checked={junto} onChange={(e) => setJunto(e.target.checked)} data-foco="" aria-describedby="j-enc-ctrs" />
              <span>{rotuloEncerrarJunto(ligados.length)}<small>Só entram os que não têm outro caso em andamento.</small></span>
            </label>
            <ul className="jf-ctrs" id="j-enc-ctrs">{itensLigados}{itensJa}</ul>
            {motivo}
          </fieldset>
        ) : ligados.length || ja.length ? (
          <div className="fl-caso" role="group" aria-labelledby="j-enc-ctr-t">
            <p className="fs-leg" id="j-enc-ctr-t">Contratos ligados ao caso</p>
            <ul className="jf-ctrs">{itensLigados}{itensJa}</ul>
            {ligados.length ? (
              <p className="fs-quem-ctr"><Icone nome="pessoas" className="ico" /><span>{textoQuemEncerraContratos(ligados, acerto.quemContratos)}</span></p>
            ) : null}
          </div>
        ) : null}
        {depois ? (
          <p className="fl-depois">
            <Icone nome="seta" className="ico" />
            <span>{depois}</span>
          </p>
        ) : null}
      </div>
    </Janela>
  );
}

// ------------------------------------------------------------------ A folha da ficha do contrato

const R = (v: number) => reais(v).replace(" ", " ");

/** Uma linha do quadro: o ícone e o texto escondido dizem pendente ou a vencer (não só a cor). */
function LinhaQuadro({ x }: { x: ItemQuadro }) {
  const cls = x.tom === "falta" ? "falta" : x.tom === "espera" ? "fs-espera" : undefined;
  return (
    <li className={cls}>
      <Icone nome={x.tom === "ok" ? "check" : x.tom === "falta" ? "alerta" : "relogio"} className="ico" />
      <span>
        {x.forte ? <b>{x.forte}</b> : null}{x.forte && x.texto ? " " : null}{x.texto}
        {x.tom === "falta" ? <span className="sr"> (pendente)</span> : x.tom === "espera" ? <span className="sr"> (a vencer)</span> : null}
        {x.sub ? <small>{x.sub}</small> : null}
        {x.ir ? <a className="fs-ir" href={x.ir.href}>{x.ir.rotulo}<Icone nome="dir" className="ico ico-s" /></a> : null}
      </span>
    </li>
  );
}

/** Os três números (estado 5), cada um dito também em texto. */
export function NumerosFechamento({ a }: { a: AcertoCaso }) {
  const n = numerosDoFechamento(a);
  return (
    <dl className="fs-nums">
      <div><dt>Recebido no caso · {contar(n.contratos, "contrato", "contratos")}</dt><dd className="num">{R(n.recebido)}</dd></div>
      <div><dt>Reembolsado</dt><dd className="num">{R(n.reembolsado)}<small>{n.reembolsoTxt}</small></dd></div>
      <div className={n.tom === "falta" ? "falta" : n.tom === "espera" ? "fs-aguarda" : undefined}>
        <dt>Falta</dt><dd className="num">{n.tom === "nada" ? "nada" : R(n.falta)}<small>{n.faltaTxt}</small></dd>
      </div>
    </dl>
  );
}

/**
 * A folha larga "Fechamento do caso" (estados 5, 7, 12, 13 e 16), logo depois do âmbar. O botão
 * nunca fica desabilitado (decisão 7) e some quando o âmbar já tem o principal.
 */
export function QuadroFechamentoContrato({ casoId, acerto, contratoId, hoje, primeira, botao, aoEncerrar }: {
  casoId: string;
  acerto: AcertoCaso;
  contratoId: string;
  hoje: string;
  /** A primeira folha tem h2#t-fecha; as outras, t-fecha-<caso>. */
  primeira: boolean;
  botao: boolean;
  aoEncerrar: (botao: HTMLButtonElement) => void;
}) {
  const id = idDaFolha("t-fecha", casoId, primeira);
  const grupos = gruposDoQuadro(acerto, { contratoId, casoId, hoje });
  const pronto = linhaPronto(acerto);
  const jur = linhaJuridico();
  return (
    <section className="folha fs-folha" aria-labelledby={id} data-caso={casoId}>
      <div className="folha-cab">
        <div>
          <h2 id={id} tabIndex={-1}><Icone nome="cadeado" className="ico" />Fechamento do caso</h2>
          {acerto.caso ? <p className="sub">{subDoCaso(acerto.caso)}</p> : null}
        </div>
      </div>
      <div className="fs-grade">
        <div className="fs-quadro">
          {grupos.map((g) => (
            <div key={g.titulo} className="fs-grupo">
              <h3>{g.titulo}</h3>
              <ul className="fi-check">{g.itens.map((x, i) => <LinhaQuadro key={i} x={x} />)}</ul>
            </div>
          ))}
          {pronto ? (
            <p className="fs-pronto"><Icone nome="relogio" className="ico" /><span><b>{pronto.forte}</b>{pronto.texto ? ` ${pronto.texto}` : ""}</span></p>
          ) : null}
          <p className="fs-jur"><Icone nome="balanca" className="ico" /><span>{jur.antes} <b>{jur.forte}</b> {jur.depois}</span></p>
        </div>
        <div className="fs-lado">
          <NumerosFechamento a={acerto} />
          {botao ? (
            <button className="btn btn-sec" type="button" onClick={(e) => aoEncerrar(e.currentTarget)}>
              <Icone nome="cadeado" className="ico" />
              Encerrar o caso no financeiro
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/** A folha da lateral (estados 11 e 14): o caso já encerrado no financeiro, ou o que tem levantamento. */
export function FechamentoNaLateral({ fc, contratoId, primeira }: { fc: FechamentoNoContrato; contratoId: string; primeira: boolean }) {
  const id = idDaFolha("t-fecha", fc.casoId, primeira);
  if (fc.comLevantamento) {
    return (
      <section className="folha" aria-labelledby={id} data-caso={fc.casoId}>
        <div className="folha-cab">
          <div>
            <h2 id={id} tabIndex={-1}><Icone nome="cadeado" className="ico" />Fechamento do caso</h2>
            <p className="sub">{fc.caso.nome} · só para ler</p>
          </div>
        </div>
        <div className="fi-fecha">
          <ul className="fi-check">
            {fc.fechado ? <LinhaQuadro x={{ tom: "ok", texto: `Encerrado no financeiro em ${dia(fc.fechado.em)}, por ${fc.fechado.por.nome}` }} />
              : fc.falta ? <LinhaQuadro x={{ tom: "falta", forte: "Falta no caso:", texto: R(fc.falta), sub: "na ficha do repasse" }} />
              : <LinhaQuadro x={{ tom: "ok", texto: "Tudo recebido e repassado" }} />}
          </ul>
          <p className="fs-aponta">
            <Icone nome="enviar" className="ico" />
            <span>O fechamento deste caso fica na ficha do repasse, porque entrou dinheiro de terceiros.</span>
          </p>
          <a className="ver" href={ROTAS_FINANCEIRO.repasse(fc.levantamentoId)}>Ver o fechamento<Icone nome="dir" className="ico ico-s" /></a>
        </div>
      </section>
    );
  }
  if (fc.resumo) return null;
  const a = fc.acerto;
  const f = a.fechado!;
  const junto = fc.origem.some((e) => e.acao === "contrato.encerrado_com_caso" && e.dados.deste);
  const numero = a.contratos?.find((c) => c.id === contratoId)?.numero;
  return (
    <section className="folha" aria-labelledby={id} data-caso={fc.casoId}>
      <div className="folha-cab">
        <div>
          <h2 id={id} tabIndex={-1}><Icone nome="cadeado" className="ico" />Fechamento do caso</h2>
          {a.caso ? <p className="sub">{a.caso.nome}</p> : null}
        </div>
      </div>
      <div className="fi-fecha">
        <p className="jf-fechado">
          <Icone nome="check" className="ico" />
          <span>Encerrado no financeiro em {dataBr(diaDoInstante(f.em))}, por {f.por.nome}{junto && numero ? ` · ${numero} encerrado junto` : ""}</span>
        </p>
        <NumerosFechamento a={a} />
        <ul className="fi-check">{resumoFechado(a).map((t) => <LinhaQuadro key={t} x={{ tom: "ok", texto: t }} />)}</ul>
      </div>
    </section>
  );
}

/** Os fechados mais antigos (sugestão 2): uma linha cada. */
export function FechadosAntes({ lista }: { lista: Extract<FechamentoNoContrato, { resumo: true }>[] }) {
  if (!lista.length) return null;
  return (
    <section className="folha" aria-labelledby="t-fecha-antes">
      <div className="folha-cab"><div><h2 id="t-fecha-antes"><Icone nome="cadeado" className="ico" />Outros casos deste contrato</h2></div></div>
      <div className="fi-fecha">
        <ul className="fi-check">
          {lista.map((x) => (
            <LinhaQuadro key={x.casoId} x={{ tom: "ok", texto: `${x.caso.nome} · encerrado no financeiro em ${dia(x.fechado.em)}, por ${x.fechado.por.nome}` }} />
          ))}
        </ul>
      </div>
    </section>
  );
}

/** "De onde veio" (decisão 1): o que aconteceu no caso, por dia, com a hora e quem. */
export function DeOndeVeio({ casoId, caso, origem, primeira, varios, juridico }: {
  casoId: string;
  caso: string;
  origem: EventoDeOrigem[];
  primeira: boolean;
  /** Com mais de um caso no contrato, o nome do caso vai no subtítulo. */
  varios: boolean;
  /** "Ver o caso no Jurídico" só para quem tem a área Jurídico. */
  juridico: boolean;
}) {
  const id = idDaFolha("t-orig", casoId, primeira);
  const dias = [...new Set(origem.map((e) => diaDoInstante(e.em)))];
  return (
    <section className="folha" aria-labelledby={id}>
      <div className="folha-cab">
        <div>
          <h2 id={id}><Icone nome="historico" className="ico" />De onde veio</h2>
          {varios ? <p className="sub">{caso}</p> : null}
        </div>
      </div>
      {dias.map((d, i) => (
        <div key={d} className="eventos-dia" style={i === 0 ? { paddingTop: 0 } : undefined}>
          <h3>{dataBr(d)}</h3>
          <ol className="eventos">
            {origem.filter((e) => diaDoInstante(e.em) === d).map((e, j) => {
              const t = textoOrigem(e, caso);
              return (
                <li key={`${e.em}-${j}`}>
                  <time dateTime={e.em}>{horaDoInstante(e.em)}</time>
                  <span className={e.acao === "financeiro.caso_encerrado" ? "pto forte" : "pto"} aria-hidden="true" />
                  <div><p>{e.por ? <><b>{e.por.nome}</b> {t.fez}</> : <>O T3jus {t.fez}</>}</p>{t.detalhe ? <small>{t.detalhe}</small> : null}</div>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
      {juridico ? (
        <p className="fs-pe-orig"><a className="ver" href={ROTAS_JURIDICO.caso(casoId)}>Ver o caso no Jurídico<Icone nome="dir" className="ico ico-s" /></a></p>
      ) : null}
    </section>
  );
}
