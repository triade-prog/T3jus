"use client";
// Fechamento do caso no financeiro (F3.45, F3.128, F3.132; EX-16, EX-17, FI-08): a janela de
// encerrar e as linhas das pendências, comuns à ficha do repasse e à ficha do contrato. Desenho
// aprovado em docs/design/aprovadas/portal-fechamento-sem-levantamento (decisões 7 a 10 e 12):
// o botão nunca fica desabilitado; com pendência, a janela (alertdialog, foco em "Voltar ao …")
// diz o que falta e leva ao atalho da primeira; pronta, encerra o caso e, já marcado, os
// contratos ligados. Quem não encerra contratos vê a seção sem caixa, com quem encerra.

import { useState, type ReactNode } from "react";
import { reais, type AcertoCaso, type PendenciaCaso } from "@t3jus/domain";
import { textoDoErro } from "../api.ts";
import { Icone } from "../Icone.tsx";
import { Aviso, Janela } from "../console/pecas.tsx";
import { contar, diaCurto } from "./agenda.ts";
import { juntarComE } from "./clientes.ts";
import {
  AJUDA_REPASSE, botaoEncerrar, comLevantamento, detalheDaPendencia, primeiroAtalho, rotuloEncerrarJunto, textoAjudaPendencia, textoEncerrado,
  textoJaEncerrado, textoQuemEncerraContratos, tituloPendencias, type Atalho,
} from "./fechamento.ts";
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
  casoId, acerto, descricao, voltar, atalho, aoAtalho, aoFechar, aoFeito, aoJaEncerrado, linha = linhaDoRepasse, ajuda, nomeCaso, noContrato = false, resumo,
}: {
  casoId: string;
  acerto: AcertoCaso;
  nomeCaso: string;
  /** O parágrafo que descreve a janela. */
  descricao: string;
  voltar: "Voltar ao caso" | "Voltar ao contrato";
  atalho: (p: PendenciaCaso) => Atalho | null;
  aoAtalho: (a: Atalho) => void;
  aoFechar: () => void;
  aoFeito: (f: Feito) => void;
  /** CASO_JA_ENCERRADO: alguém encerrou pelo outro lado; a ficha recarrega e anuncia. */
  aoJaEncerrado: () => void;
  linha?: (p: PendenciaCaso) => LinhaPendencia;
  /** O texto de ajuda da janela de pendência, no lugar do padrão. */
  ajuda?: (lista: PendenciaCaso[]) => ReactNode;
  noContrato?: boolean;
  /** O resumo do caso pronto (estado 8): Recebido no caso, Reembolsado, Falta. */
  resumo?: ReactNode;
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
    const repasse = pend.lista.some((x) => x.tipo === "REPASSE");
    const parcela = pend.lista.find((x) => x.tipo === "PARCELA");
    const cliente = parcela ? (parcela.cliente ?? parcela.nome.split(" · ")[0]!) : null;
    const lev = comLevantamento(acerto);
    return (
      <Janela id="j-enc" aberta alerta aoFechar={aoFechar} sobretitulo="Fechamento do caso" titulo="Ainda não dá para encerrar" descricao="j-enc-d"
        aoEnviar={() => (a && a.tipo !== "link" ? aoAtalho(a) : aoFechar())}
        pe={
          <>
            <button className="btn btn-sec" type="button" onClick={aoFechar} data-foco="">{voltar}</button>
            {a ? <BotaoAtalho a={a} aoAtalho={aoAtalho} /> : null}
          </>
        }>
        <div style={{ display: "grid", gap: 16 }}>
          <p id="j-enc-d">{descricao}</p>
          <Aviso tom="urgencia" titulo={tituloPendencias(pend.lista, contar)}>
            {lev ? "O financeiro do caso só encerra com tudo recebido e tudo repassado." : "O financeiro do caso só encerra com tudo recebido."}
            {pend.falta ? ` Faltam ${reais(pend.falta)}.` : ""}
          </Aviso>
          <ul className="fi-check">
            {pend.lista.map((x, i) => <ItemPendencia key={i} l={linha(x)} />)}
          </ul>
          {ajuda ? ajuda(pend.lista) : (
            <Aviso tom="info" icone="ajuda">
              Registre o que falta e o caso fica pronto para encerrar.
              {repasse || (lev && !cliente) ? ` ${AJUDA_REPASSE}` : ""}
              {cliente ? ` ${textoAjudaPendencia(cliente)}` : ""}
            </Aviso>
          )}
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
        <p id="j-enc-d">{descricao} {tudo === "tudo recebido" ? "Tudo foi recebido." : "Tudo foi recebido e repassado."} O encerramento fica no histórico do caso, com o seu nome e a hora.</p>
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
