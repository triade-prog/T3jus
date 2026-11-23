"use client";
// Documentos para começar na abertura do caso (EX-18, F3.131), desenho aprovado em
// docs/design/aprovadas/portal-jornada-fechamento (grupo 9, decisões 42 a 45):
// - A lista da área vem pronta: o que está na ficha e em dia é "Já temos", sem caixa; o
//   comprovante vencido vem marcado, com o motivo; "Se houver" vem marcado para desmarcar.
//   "Pedir mais um documento" aceita texto livre. Trocar a área troca a lista.
// - "Avisar ... pelo WhatsApp com a lista" vem marcado, com a prévia (só o que falta).
// - A mesma seção serve às quatro portas do caso. Sem a área Jurídico, a lista entra inteira.
// O servidor confere tudo e cria os pedidos na mesma transação do caso (0854).

import { useEffect, useState } from "react";
import {
  AREAS_DIREITO, textoAvisoDocumentosInicio, textoNoMeio,
  type AreaDireito, type DocumentosNaAbertura, type ItemPreviaInicio, type PreviaDocumentosInicio,
} from "@t3jus/domain";
import { Icone } from "../Icone.tsx";
import { descritoPor, ErroCampo } from "../console/pecas.tsx";
import { ROTAS_JURIDICO } from "./juridico.ts";
import { chamarPortal } from "./Moldura.tsx";

const ddmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
const primeiro = (n: string) => n.trim().split(/\s+/)[0] ?? n;
const diaDoEnvio = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(iso));

/** O que a pessoa escolheu na seção. chave: a área e o cliente da lista que está na tela. */
export interface DocsEscolha { chave: string | null; pedir: string[]; mais: string; avisar: boolean }
export const DOCS_INICIAL: DocsEscolha = { chave: null, pedir: [], mais: "", avisar: true };

/** O que vai ao servidor. Sem a lista na tela, nada: o servidor usa a lista inteira, sem aviso. */
export function corpoDosDocumentos(v: DocsEscolha): DocumentosNaAbertura | null {
  if (!v.chave) return null;
  return { pedir: v.pedir, mais: v.mais.trim() ? [v.mais.trim()] : [], avisar: v.avisar };
}

/** O erro do "Pedir mais um documento", antes de ir ao servidor. */
export function erroDoMais(v: DocsEscolha): string | null {
  const t = v.mais.trim();
  return t && (t.length < 3 || t.length > 160) ? "Diga qual documento, com 3 a 160 letras." : null;
}

const aPedir = (i: ItemPreviaInicio) => i.situacao !== "JA_TEMOS";

function podeAvisar(p: PreviaDocumentosInicio) {
  return !!p.contato && p.whatsappLigado && p.contato.celular && !p.contato.semAvisos && !!p.modelo;
}

function usePrevia(area: AreaDireito | "", cliente: string | null) {
  const [p, setP] = useState<{ chave: string; previa: PreviaDocumentosInicio | "erro" } | null>(null);
  const chave = `${area}|${cliente ?? ""}`;
  useEffect(() => {
    if (!area) return;
    let vivo = true;
    const q = new URLSearchParams({ area, ...(cliente ? { cliente } : {}) });
    void chamarPortal<PreviaDocumentosInicio>(`/v1/escritorio/juridico/documentos-inicio/previa?${q}`).then((r) => {
      if (vivo) setP({ chave, previa: r.ok ? r.dados : "erro" });
    });
    return () => { vivo = false; };
  }, [area, cliente, chave]);
  return p && p.chave === chave ? p.previa : null;
}

function itemSub(i: ItemPreviaInicio, cliente: string) {
  const se = i.seHouver ? " · se houver" : "";
  if (i.situacao === "JA_TEMOS" && i.doc) return `Na ficha de ${cliente} desde ${ddmm(diaDoEnvio(i.doc.enviadoEm))}${se}`;
  if (i.situacao === "VENCIDO" && i.doc?.dataDocumento) return `O da ficha é de ${ddmm(i.doc.dataDocumento)}, com ${i.doc.dias} dias. Pedir um novo.`;
  return `${i.pessoal ? "Pessoal: quando chegar, fica na ficha" : "Do caso"}${se}`;
}

export function SecaoDocumentosInicio({ area, clienteId, caso, valor, aoMudar, pref, erroMais }: {
  area: AreaDireito | "";
  clienteId: string | null;
  /** O nome do caso, para a prévia do aviso. */
  caso: string;
  valor: DocsEscolha;
  aoMudar: (v: DocsEscolha) => void;
  pref: string;
  erroMais?: string | null;
}) {
  const p = usePrevia(area, clienteId);
  const chave = `${area}|${clienteId ?? ""}`;
  const pronto = p && p !== "erro" ? p : null;
  // A lista mudou (outra área ou outro cliente): o que pedir volta ao que vem marcado.
  useEffect(() => {
    if (pronto && valor.chave !== chave) {
      aoMudar({ ...valor, chave, pedir: pronto.itens.filter(aPedir).map((i) => i.itemId), avisar: valor.chave ? valor.avisar && podeAvisar(pronto) : podeAvisar(pronto) });
    }
  }, [pronto, chave, valor, aoMudar]);

  if (!area) return null;
  if (p === "erro") {
    return (
      <div className="jf-dsem" role="group" aria-label="Documentos para começar">
        <p style={{ margin: 0 }}><b>A lista de documentos não carregou.</b> O caso abre do mesmo jeito, com a lista inteira da área, sem aviso ao cliente.</p>
      </div>
    );
  }
  if (!pronto) return <p className="ajuda" style={{ margin: 0 }} role="status">Carregando os documentos para começar…</p>;
  const nomeArea = AREAS_DIREITO[area];
  const cliente = pronto.cliente ? primeiro(pronto.cliente.nome) : "o cliente";
  const conferir = pronto.podeConferir;
  const sel = new Set(valor.chave === chave ? valor.pedir : pronto.itens.filter(aPedir).map((i) => i.itemId));
  const mudar = (x: Partial<DocsEscolha>) => aoMudar({ ...valor, chave, pedir: [...sel], ...x });
  const mais = (
    <div className="jf-dmais campo">
      <label htmlFor={`${pref}-mais`}>Pedir mais um documento<span className="opcional"> (opcional)</span></label>
      <input className="entrada" id={`${pref}-mais`} value={valor.mais} maxLength={160} autoComplete="off"
        placeholder={pronto.cliente ? `Ex.: certidão de nascimento de ${cliente}` : "Ex.: certidão de nascimento"}
        onChange={(e) => mudar({ mais: e.target.value })}
        aria-invalid={erroMais ? true : undefined} aria-describedby={descritoPor(erroMais && `${pref}-mais-er`)} />
      {erroMais ? <ErroCampo id={`${pref}-mais-er`}>{erroMais}</ErroCampo> : null}
    </div>
  );
  const vaoPedir = [
    ...pronto.itens.filter((i) => aPedir(i) && (!conferir || sel.has(i.itemId))).map((i) => i.noAviso),
    ...(valor.mais.trim().length >= 3 ? [textoNoMeio(valor.mais.trim())] : []),
  ];
  const aviso = vaoPedir.length && pronto.contato ? (
    <div className="jf-davisa">
      {podeAvisar(pronto) ? (
        <>
          <label className="opcao">
            <input className="marcar" type="checkbox" checked={valor.avisar} onChange={(e) => mudar({ avisar: e.target.checked })} />
            <span>
              Avisar {pronto.contato.nome} pelo WhatsApp com a lista
              <small>{pronto.contato.nome === pronto.cliente?.nome ? "É o contato principal." : `${primeiro(pronto.contato.nome)} é o contato principal de ${cliente}.`} Desmarque para pedir de outro jeito.</small>
            </span>
          </label>
          {valor.avisar ? (
            <>
              <p className="jr-previa-t" style={{ marginTop: 8 }}><Icone nome="whats" className="ico" />Prévia</p>
              <p className="jr-previa">{textoAvisoDocumentosInicio(pronto.modelo!, pronto.contato.nome, pronto.escritorio, caso || "novo", vaoPedir)}</p>
            </>
          ) : null}
        </>
      ) : (
        <p className="ajuda" style={{ margin: 0 }}>
          {!pronto.whatsappLigado ? "O WhatsApp do escritório ainda não está ligado ao T3jus: os pedidos ficam registrados, e o pedido ao cliente vai de outro jeito."
            : pronto.contato.semAvisos ? `${cliente} pediu para não receber avisos. Os pedidos ficam registrados.`
            : "O contato principal não tem celular na ficha. Os pedidos ficam registrados."}
        </p>
      )}
    </div>
  ) : null;

  if (!pronto.itens.length) {
    return (
      <fieldset className="jf-dlista">
        <legend>Documentos para começar<small>{nomeArea} ainda não tem lista.</small></legend>
        <div className="jf-dsem">
          <p style={{ margin: 0 }}><b>Nada será pedido sozinho.</b> Peça agora o que faltar, ou <a href={ROTAS_JURIDICO.documentos}>monte a lista de {nomeArea.toLowerCase()}</a> para os próximos casos.</p>
        </div>
        {mais}
        {aviso}
      </fieldset>
    );
  }
  return (
    <fieldset className="jf-dlista">
      <legend>
        Documentos para começar
        <small>{conferir
          ? `A lista de ${nomeArea.toLowerCase()}, com o que já está na ficha. Desmarque o que não serve a este caso.`
          : `A lista de ${nomeArea.toLowerCase()} entra inteira. A responsável confere em Documentos do caso.`}</small>
      </legend>
      <ul className="jf-dl">
        {pronto.itens.map((i) => i.situacao === "JA_TEMOS" ? (
          <li key={i.itemId} className="jf-tem">
            <Icone nome="check" className="ico" />
            <span>{i.nome}<span className="jf-tip">Já temos</span><small>{itemSub(i, cliente)}</small></span>
          </li>
        ) : conferir ? (
          <li key={i.itemId}>
            <label className="opcao">
              <input className="marcar" type="checkbox" name={`${pref}-doc`} value={i.itemId} checked={sel.has(i.itemId)}
                onChange={(e) => { const s = new Set(sel); if (e.target.checked) s.add(i.itemId); else s.delete(i.itemId); mudar({ pedir: [...s] }); }} />
              <span>{i.nome}<small>{itemSub(i, cliente)}</small></span>
            </label>
          </li>
        ) : (
          <li key={i.itemId} className="jf-tem">
            <Icone nome="relogio" className="ico" />
            <span>{i.nome}<small>{itemSub(i, cliente)}</small></span>
          </li>
        ))}
      </ul>
      {mais}
      {aviso}
    </fieldset>
  );
}
