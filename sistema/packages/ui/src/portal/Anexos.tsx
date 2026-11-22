"use client";
// Anexos do Portal fora do caso (F3.12, F3.22): o contrato assinado (CH-01) e a nota, guia,
// boleto ou comprovante de cada conta e de cada recebimento (FI-18). Desenhos aprovados em
// docs/design/aprovadas/portal-comercial-contratos ("Arquivo assinado" na ficha do contrato) e
// docs/design/aprovadas/portal-financeiro (o campo do arquivo em Lançar conta e em Registrar
// recebimento, e a coluna "Nota ou guia" de A pagar). O envio é o mesmo dos documentos do caso:
// registrar, mandar o arquivo direto ao Storage e concluir. Nada é apagado.

import { useEffect, useId, useState } from "react";
import { CATEGORIAS_ANEXO, CATEGORIAS_ANEXO_CONTA, type Anexo, type CategoriaAnexo, type DonoAnexo, type ListaAnexos } from "@t3jus/domain";
import { textoDoErro } from "../api.ts";
import { Icone } from "../Icone.tsx";
import { enviarArquivo, problemaDoArquivo, tamanhoLegivel, tipoDoArquivo } from "../console/documentos.ts";
import { descritoPor, ErroCampo } from "../console/pecas.tsx";
import { chamarPortal } from "./Moldura.tsx";

export const ACEITOS = "application/pdf,image/jpeg,image/png";

/** Envia um arquivo ao contrato, à conta ou ao recebimento. Devolve o erro ou null. */
export async function enviarAnexo(dono: DonoAnexo, donoId: string, arquivo: File, categoria: CategoriaAnexo | null,
                                  aoProgredir: (p: number) => void = () => {},
                                  assinado?: { documentoId: string; assinadoEm: string }): Promise<string | null> {
  const tipo = tipoDoArquivo(arquivo.name, arquivo.type);
  if (!tipo) return "Tipo não aceito. Envie PDF, JPG ou PNG.";
  const ini = await chamarPortal<{ id: string; enderecoDeEnvio: string }>("/v1/escritorio/anexos", {
    metodo: "POST", corpo: { dono, donoId, categoria, nome: arquivo.name, tipo, tamanho: arquivo.size, ...(assinado ?? {}) },
  });
  if (!ini.ok) return textoDoErro(ini.erro);
  const foi = await enviarArquivo(ini.dados.enderecoDeEnvio, arquivo, tipo, aoProgredir);
  const fim = foi ? await chamarPortal(`/v1/escritorio/anexos/${ini.dados.id}/concluir`, { metodo: "POST", corpo: {} }) : null;
  return fim?.ok ? null : "O envio caiu no meio. O arquivo não foi guardado. Envie de novo.";
}

/** Abre o anexo numa aba nova (o link vale 60 segundos). Devolve o erro ou null. */
export async function abrirAnexo(id: string): Promise<string | null> {
  const r = await chamarPortal<{ url: string }>(`/v1/escritorio/anexos/${id}/abrir`, { metodo: "POST", corpo: {} });
  if (!r.ok) return textoDoErro(r.erro);
  const u = new URL(r.dados.url);
  u.searchParams.delete("download");
  window.open(u.toString(), "_blank", "noopener");
  return null;
}

/** Os anexos das contas e dos recebimentos, agrupados pelo dono (o mais novo primeiro). */
export function useAnexosFinanceiro(contas: string[], pagamentos: string[]): { porDono: Map<string, Anexo[]>; recarregar: () => void } {
  const [porDono, setPorDono] = useState<Map<string, Anexo[]>>(new Map());
  const [vez, setVez] = useState(0);
  const chave = `${contas.join(",")}|${pagamentos.join(",")}`;
  useEffect(() => {
    if (!contas.length && !pagamentos.length) return;
    let vivo = true;
    void chamarPortal<ListaAnexos>("/v1/escritorio/financeiro/anexos/buscar", { metodo: "POST", corpo: { contas: contas.slice(0, 500), pagamentos: pagamentos.slice(0, 500) } })
      .then((r) => {
        if (!vivo || !r.ok) return;
        const m = new Map<string, Anexo[]>();
        for (const a of r.dados.anexos) m.set(a.donoId, [...(m.get(a.donoId) ?? []), a]);
        setPorDono(m);
      });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave, vez]);
  return { porDono, recarregar: () => setVez((v) => v + 1) };
}

/**
 * O campo do arquivo nas janelas: escolhe o arquivo, mostra o escolhido com "Tirar o anexo" e,
 * na conta, o que ele é (nota, guia, boleto ou comprovante). O envio acontece ao salvar.
 */
export function CampoAnexo({ rotulo, ajuda, opcional = true, arquivo, aoEscolher, categoria, aoCategoria, erro, progresso }: {
  rotulo: string;
  ajuda?: string;
  opcional?: boolean;
  arquivo: File | null;
  aoEscolher: (a: File | null, erro: string | null) => void;
  /** Só na conta: o que é o arquivo. */
  categoria?: CategoriaAnexo;
  aoCategoria?: (c: CategoriaAnexo) => void;
  erro: string | null;
  progresso: number | null;
}) {
  const id = useId();
  const idArq = `${id}-arq`;
  const idCat = `${id}-cat`;
  return (
    <div className="campo">
      {arquivo ? (
        <span className="fi-rotulo" id={`${id}-r`}>{rotulo} {opcional ? <span style={{ fontWeight: 400, color: "var(--texto-2)" }}>(opcional)</span> : null}</span>
      ) : (
        <label className="fi-rotulo" htmlFor={idArq}>{rotulo} {opcional ? <span style={{ fontWeight: 400, color: "var(--texto-2)" }}>(opcional)</span> : null}</label>
      )}
      {arquivo ? (
        <div className="fi-anexo" role="group" aria-labelledby={`${id}-r`}>
          <Icone nome="doc" className="ico" />
          <span><b>{arquivo.name}</b><small>{tamanhoLegivel(arquivo.size)} · vai junto ao salvar</small></span>
          <button className="fi-x" type="button" aria-label={`Tirar o anexo ${arquivo.name}`} onClick={() => aoEscolher(null, null)} disabled={progresso !== null}>
            <Icone nome="xis" className="ico" />
          </button>
        </div>
      ) : (
        <input className="entrada" id={idArq} type="file" accept={ACEITOS}
          aria-invalid={erro ? true : undefined} aria-describedby={descritoPor(`${id}-aj`, erro && `${id}-er`)}
          onChange={(e) => {
            const a = e.target.files?.[0] ?? null;
            aoEscolher(a, a ? problemaDoArquivo(a.name, a.type, a.size) : null);
          }} />
      )}
      {arquivo && aoCategoria ? (
        <div className="campo" style={{ marginTop: 8 }}>
          <label htmlFor={idCat}>O que é o arquivo</label>
          <select className="entrada" id={idCat} value={categoria} onChange={(e) => aoCategoria(e.target.value as CategoriaAnexo)} disabled={progresso !== null}>
            {CATEGORIAS_ANEXO_CONTA.map((c) => <option key={c} value={c}>{CATEGORIAS_ANEXO[c]}</option>)}
          </select>
        </div>
      ) : null}
      <p className="ajuda" id={`${id}-aj`}>{ajuda ? `${ajuda} ` : ""}PDF, JPG ou PNG, até 10 MB.</p>
      {erro ? <ErroCampo id={`${id}-er`}>{erro}</ErroCampo> : null}
      {progresso !== null ? (
        <div className="jr-progresso">
          <progress max={100} value={progresso} aria-label="Enviando o arquivo" />
          <span>{progresso}%</span>
        </div>
      ) : null}
    </div>
  );
}
