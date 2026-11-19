"use client";
// Jurídico do Portal, parte 3b (EX-05, PD-05), desenho aprovado em
// docs/design/aprovadas/portal-juridico (folha "Documentos" da ficha do caso): primeiro os que
// faltam, com quem está e quando foram pedidos, com "Pedir de novo" e "Já chegou"; depois os
// ligados ao caso, com "Enviar arquivo" e "Abrir". Nada é apagado. Enquanto o WhatsApp do
// escritório não está ligado ao T3jus (Conversas), "Pedir de novo" mostra o texto pronto para
// copiar ou abrir no WhatsApp do aparelho, e guarda a data do novo pedido.

import { useRef, useState } from "react";
import {
  CATEGORIAS_DOCUMENTO_CASO, dataBr, textoPedirDocumento, type CategoriaDocumentoCaso, type DocumentoDoCaso, type DocumentoFaltando, type FichaCaso,
} from "@t3jus/domain";
import { textoDoErro } from "../api.ts";
import { Icone } from "../Icone.tsx";
import { enviarArquivo, problemaDoArquivo, tamanhoLegivel, tipoDoArquivo, tipoLegivel } from "../console/documentos.ts";
import { formatarTelefone } from "../console/ficha.ts";
import { Aviso, descritoPor, ErroCampo, faltaAcertar, focarPrimeiroErro, Janela } from "../console/pecas.tsx";
import { chamarPortal } from "./Moldura.tsx";

type Feito = { titulo: string; texto: string };
const ddmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
const primeiroNome = (n: string) => n.trim().split(/\s+/)[0] ?? n;

/** "Com Carlos · pedido em 10/11", e "de novo em 19/11" quando foi pedido outra vez. */
export function textoFalta(d: DocumentoFaltando): string {
  return `Com ${primeiroNome(d.cliente.nome)} · pedido em ${ddmm(d.pedidoEm)}${d.repedidoEm && d.repedidoEm !== d.pedidoEm ? `, de novo em ${ddmm(d.repedidoEm)}` : ""}`;
}

/** Envia um arquivo ao caso: registra, manda direto ao Storage e conclui. Devolve o erro ou null. */
async function enviarAoCaso(casoId: string, arquivo: File, categoria: CategoriaDocumentoCaso, pedidoId: string | null,
                            aoProgredir: (p: number) => void): Promise<string | null> {
  const tipo = tipoDoArquivo(arquivo.name, arquivo.type)!;
  const ini = await chamarPortal<{ id: string; enderecoDeEnvio: string }>(`/v1/escritorio/juridico/casos/${casoId}/documentos`, {
    metodo: "POST", corpo: { categoria, nome: arquivo.name, tipo, tamanho: arquivo.size, pedidoId },
  });
  if (!ini.ok) return textoDoErro(ini.erro);
  const foi = await enviarArquivo(ini.dados.enderecoDeEnvio, arquivo, tipo, aoProgredir);
  const fim = foi ? await chamarPortal(`/v1/escritorio/juridico/documentos/${ini.dados.id}/concluir`, { metodo: "POST", corpo: {} }) : null;
  return fim?.ok ? null : "O envio caiu no meio. O arquivo não foi guardado. Envie de novo.";
}

export function DocumentosDoCaso({ f, andamento, aoPedir, aoPedirDeNovo, aoChegou, aoEnviar }: {
  f: FichaCaso;
  andamento: boolean;
  aoPedir: () => void;
  aoPedirDeNovo: (d: DocumentoFaltando) => void;
  aoChegou: (d: DocumentoFaltando) => void;
  aoEnviar: () => void;
}) {
  const [abrindo, setAbrindo] = useState<string | null>(null);
  const [falha, setFalha] = useState<string | null>(null);

  async function abrir(d: DocumentoDoCaso) {
    setFalha(null);
    setAbrindo(d.id);
    const r = await chamarPortal<{ url: string }>(`/v1/escritorio/juridico/documentos/${d.id}/abrir`, { metodo: "POST", corpo: {} });
    setAbrindo(null);
    if (!r.ok) return setFalha(textoDoErro(r.erro));
    // Abrir mostra no navegador: o mesmo link, sem pedir para baixar.
    const u = new URL(r.dados.url);
    u.searchParams.delete("download");
    window.open(u.toString(), "_blank", "noopener");
  }

  return (
    <section className="folha" aria-labelledby="t-docs" style={{ overflow: "hidden" }}>
      <div className="folha-cab">
        <div>
          <h2 id="t-docs">Documentos</h2>
          <p className="sub">O que já está no caso e o que ainda falta</p>
        </div>
        {andamento ? (
          <div className="acoes">
            <button className="btn btn-sec" type="button" onClick={aoPedir}><Icone nome="mais" className="ico" />Pedir documento</button>
          </div>
        ) : null}
      </div>
      {falha ? <div style={{ padding: "0 24px 12px" }}><Aviso tom="urgencia" titulo="O arquivo não abriu.">{falha}</Aviso></div> : null}
      {f.faltam.length ? (
        <>
          <div className="jr-sub"><h3 className="sobretitulo">Faltam {f.faltam.length}</h3></div>
          <ul className="lista docs jr-falta">
            {f.faltam.map((d) => (
              <li key={d.id}>
                <span className="doc-ico" aria-hidden="true"><Icone nome="alerta" className="ico" /></span>
                <div>
                  <span className="doc-nome">{d.descricao}</span>
                  <p className="doc-meta"><span className="selo selo-atencao">Falta</span><span>{textoFalta(d)}</span></p>
                </div>
                <div className="doc-acoes">
                  <button className="btn btn-sec btn-compacto" type="button" onClick={() => aoPedirDeNovo(d)} aria-label={`Pedir de novo: ${d.descricao}`}>
                    <Icone nome="whats" className="ico ico-s" />Pedir de novo
                  </button>
                  <button className="btn btn-fantasma btn-compacto" type="button" onClick={() => aoChegou(d)} aria-label={`Já chegou: ${d.descricao}`}>
                    <Icone nome="enviar" className="ico ico-s" />Já chegou
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <div className="jr-sub">
        <h3 className="sobretitulo">Ligados ao caso · {f.documentos.length}</h3>
        <button className="btn btn-fantasma btn-compacto" type="button" onClick={aoEnviar}><Icone nome="enviar" className="ico" />Enviar arquivo</button>
      </div>
      {f.documentos.length ? (
        <ul className="lista docs">
          {f.documentos.map((d) => (
            <li key={d.id}>
              <span className="doc-ico" aria-hidden="true"><Icone nome={d.tipo === "application/pdf" ? "doc" : "imagem"} className="ico" /></span>
              <div>
                <span className="doc-nome">{d.nome}</span>
                <p className="doc-meta">
                  <span className="selo selo-neutro">{CATEGORIAS_DOCUMENTO_CASO[d.categoria]}</span>
                  <span>{tipoLegivel(d.tipo)} · {tamanhoLegivel(d.tamanho)} · {d.enviadoPor.nome} · {dataBr(d.enviadoEm.slice(0, 10))}</span>
                </p>
              </div>
              <div className="doc-acoes">
                <button className="btn btn-sec btn-compacto" type="button" onClick={() => void abrir(d)} disabled={abrindo === d.id}
                  aria-busy={abrindo === d.id || undefined} aria-label={`Abrir ${d.nome}`}>
                  <Icone nome="olho" className="ico ico-s" />Abrir
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="jr-vazio">Nenhum arquivo ligado a este caso ainda.</p>
      )}
      <p className="docs-pe">
        <Icone nome="cadeado" className="ico" />
        Nada é apagado: cada arquivo fica com quem enviou e quando. “Pedir de novo” mostra o texto pronto para o cliente.
      </p>
    </section>
  );
}

const MSG_PEDIR: Record<string, string> = {
  descricao: "Diga qual documento falta, com 3 a 160 letras.",
  clienteId: "Escolha com qual cliente do caso está o documento.",
};

export function JanelaPedirDocumento({ f, aoFechar, aoFeito }: { f: FichaCaso; aoFechar: () => void; aoFeito: (feito: Feito) => void }) {
  const [descricao, setDescricao] = useState("");
  const [clienteId, setClienteId] = useState(f.clientes.length === 1 ? f.clientes[0]!.id : "");
  const [erros, setErros] = useState<string[]>([]);
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const corpo = useRef<HTMLDivElement>(null);
  const tem = (c: string) => erros.includes(c);

  async function enviar() {
    const e: string[] = [];
    if (descricao.trim().length < 3) e.push("descricao");
    if (!clienteId) e.push("clienteId");
    setFalha(null);
    setErros(e);
    if (e.length) return focarPrimeiroErro(corpo.current);
    setEnviando(true);
    const r = await chamarPortal<DocumentoFaltando>(`/v1/escritorio/juridico/casos/${f.id}/pedidos`, { metodo: "POST", corpo: { descricao: descricao.trim(), clienteId } });
    setEnviando(false);
    if (r.ok) return aoFeito({ titulo: "Documento pedido", texto: `${r.dados.descricao} está em “Faltam” e em “O que está travando”.` });
    const campos = r.erro.detalhes?.campos;
    if (r.erro.codigo === "VALIDATION_ERROR" && Array.isArray(campos) && campos.length && !r.erro.detalhes?.motivo) {
      setErros(campos.map(String));
      return focarPrimeiroErro(corpo.current);
    }
    setFalha(textoDoErro(r.erro));
  }

  return (
    <Janela id="j-pedir" aberta aoFechar={aoFechar} sobretitulo={`Jurídico · ${f.nome}`} titulo="Pedir documento" descricao="j-pedir-d" aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-pri" type="submit" disabled={enviando} aria-busy={enviando || undefined}>
            <Icone nome="check" className="ico" />
            Registrar o pedido
          </button>
        </>
      }>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id="j-pedir-d">O documento fica em “Faltam” até chegar, e o caso mostra que está esperando o cliente.</p>
        {erros.length ? <Aviso tom="urgencia" titulo={faltaAcertar(erros.length)}>O pedido ainda não foi registrado.</Aviso> : null}
        {falha ? <Aviso tom="urgencia" titulo="O pedido não foi registrado.">{falha}</Aviso> : null}
        <div className="campo">
          <label htmlFor="pd-desc">Qual documento falta</label>
          <input className="entrada" id="pd-desc" type="text" autoComplete="off" maxLength={160} value={descricao} onChange={(e) => setDescricao(e.target.value)} data-foco
            placeholder="Ex.: CTPS digital de Carlos"
            aria-invalid={tem("descricao") || undefined} aria-describedby={descritoPor(tem("descricao") && "pd-desc-er")} />
          {tem("descricao") ? <ErroCampo id="pd-desc-er">{MSG_PEDIR.descricao}</ErroCampo> : null}
        </div>
        <fieldset className="grupo-opcoes" id="pd-cli" tabIndex={-1} aria-describedby={descritoPor(tem("clienteId") && "pd-cli-er")}>
          <legend>Com quem está</legend>
          <div className="jr-opcoes">
            {f.clientes.map((c) => (
              <label key={c.id} className={`jr-op${clienteId === c.id ? " jr-op-sel" : ""}`}>
                <input className="marcar" type="radio" name="pd-cli" value={c.id} checked={clienteId === c.id} onChange={() => setClienteId(c.id)} />
                <span>{c.nome}</span>
              </label>
            ))}
          </div>
          {tem("clienteId") ? <ErroCampo id="pd-cli-er">{MSG_PEDIR.clienteId}</ErroCampo> : null}
        </fieldset>
      </div>
    </Janela>
  );
}

export function JanelaPedirDeNovo({ f, d, aoFechar, aoFeito }: { f: FichaCaso; d: DocumentoFaltando; aoFechar: () => void; aoFeito: (feito: Feito) => void }) {
  const texto = textoPedirDocumento(d.cliente.nome, f.escritorio, f.parteContraria, d.descricao);
  const [copiado, setCopiado] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const fone = d.cliente.telefone?.replace(/\D/g, "") ?? "";

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }

  async function marcar() {
    setFalha(null);
    setEnviando(true);
    const r = await chamarPortal<DocumentoFaltando>(`/v1/escritorio/juridico/pedidos/${d.id}/de-novo`, { metodo: "POST", corpo: {} });
    setEnviando(false);
    if (r.ok) return aoFeito({ titulo: "Pedido de novo", texto: `${d.descricao}: a data do novo pedido ficou no caso.` });
    setFalha(textoDoErro(r.erro));
  }

  return (
    <Janela id="j-denovo" aberta aoFechar={aoFechar} sobretitulo={`Jurídico · ${f.nome}`} titulo="Pedir de novo" descricao="j-denovo-d" aoEnviar={() => void marcar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-pri" type="submit" disabled={enviando} aria-busy={enviando || undefined}>
            <Icone nome="check" className="ico" />
            Marcar como pedido hoje
          </button>
        </>
      }>
      <div style={{ display: "grid", gap: 16 }}>
        <p id="j-denovo-d"><b>{d.descricao}</b> · {textoFalta(d)}.</p>
        {falha ? <Aviso tom="urgencia" titulo="Nada mudou.">{falha}</Aviso> : null}
        <div className="campo">
          <p className="jr-rot">Texto para {primeiroNome(d.cliente.nome)}{d.cliente.telefone ? ` · ${formatarTelefone(d.cliente.telefone)}` : ""}</p>
          <p className="jr-previa">{texto}</p>
        </div>
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
        <Aviso tom="info" titulo="O WhatsApp do escritório ainda não está ligado ao T3jus.">
          Por enquanto, envie pelo aparelho e marque aqui. Quando Conversas estiver pronta, este botão abre a conversa do cliente com o texto.
        </Aviso>
      </div>
    </Janela>
  );
}

function CampoArquivo({ id, arquivo, aoEscolher, erro, progresso }: {
  id: string; arquivo: File | null; aoEscolher: (a: File | null) => void; erro: string | null; progresso: number | null;
}) {
  return (
    <div className="campo">
      <label htmlFor={id}>Arquivo</label>
      <input className="entrada" id={id} type="file" accept="application/pdf,image/jpeg,image/png"
        onChange={(e) => aoEscolher(e.target.files?.[0] ?? null)}
        aria-invalid={erro ? true : undefined} aria-describedby={descritoPor(`${id}-aj`, erro && `${id}-er`)} />
      <p className="ajuda" id={`${id}-aj`}>PDF, JPG ou PNG, até 10 MB.{arquivo ? ` ${arquivo.name} · ${tamanhoLegivel(arquivo.size)}` : ""}</p>
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

export function JanelaEnviarDocumento({ f, aoFechar, aoFeito }: { f: FichaCaso; aoFechar: () => void; aoFeito: (feito: Feito) => void }) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [categoria, setCategoria] = useState<CategoriaDocumentoCaso>("PETICAO");
  const [erro, setErro] = useState<string | null>(null);
  const [falha, setFalha] = useState<string | null>(null);
  const [progresso, setProgresso] = useState<number | null>(null);

  async function enviar() {
    setFalha(null);
    const problema = !arquivo ? "Escolha o arquivo." : problemaDoArquivo(arquivo.name, arquivo.type, arquivo.size);
    setErro(problema);
    if (problema || !arquivo) return document.getElementById("ev-arq")?.focus();
    setProgresso(0);
    const e = await enviarAoCaso(f.id, arquivo, categoria, null, setProgresso);
    setProgresso(null);
    if (e) return setFalha(e);
    aoFeito({ titulo: "Arquivo guardado", texto: `${arquivo.name} está ligado ao caso.` });
  }

  return (
    <Janela id="j-enviar" aberta aoFechar={aoFechar} sobretitulo={`Jurídico · ${f.nome}`} titulo="Enviar arquivo" descricao="j-enviar-d" aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-pri" type="submit" disabled={progresso !== null} aria-busy={progresso !== null || undefined}>
            <Icone nome="enviar" className="ico" />
            Enviar
          </button>
        </>
      }>
      <div style={{ display: "grid", gap: 16 }}>
        <p id="j-enviar-d">O arquivo fica ligado ao caso, com quem enviou e quando. Nada é apagado.</p>
        {falha ? <Aviso tom="urgencia" titulo="O arquivo não foi guardado.">{falha}</Aviso> : null}
        <div className="campo">
          <label htmlFor="ev-cat">O que é</label>
          <select className="entrada" id="ev-cat" value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaDocumentoCaso)} data-foco>
            {(Object.keys(CATEGORIAS_DOCUMENTO_CASO) as CategoriaDocumentoCaso[]).map((c) => <option key={c} value={c}>{CATEGORIAS_DOCUMENTO_CASO[c]}</option>)}
          </select>
        </div>
        <CampoArquivo id="ev-arq" arquivo={arquivo} aoEscolher={(a) => { setArquivo(a); setErro(null); }} erro={erro} progresso={progresso} />
      </div>
    </Janela>
  );
}

export function JanelaJaChegou({ f, d, aoFechar, aoFeito }: { f: FichaCaso; d: DocumentoFaltando; aoFechar: () => void; aoFeito: (feito: Feito) => void }) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [falha, setFalha] = useState<string | null>(null);
  const [progresso, setProgresso] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    setFalha(null);
    if (arquivo) {
      const problema = problemaDoArquivo(arquivo.name, arquivo.type, arquivo.size);
      setErro(problema);
      if (problema) return document.getElementById("jc-arq")?.focus();
      setProgresso(0);
      const e = await enviarAoCaso(f.id, arquivo, "DOCUMENTO_CLIENTE", d.id, setProgresso);
      setProgresso(null);
      if (e) return setFalha(e);
      return aoFeito({ titulo: "Documento chegou", texto: `${d.descricao} está ligado ao caso e saiu de “Faltam”.` });
    }
    setEnviando(true);
    const r = await chamarPortal(`/v1/escritorio/juridico/pedidos/${d.id}/chegou`, { metodo: "POST", corpo: {} });
    setEnviando(false);
    if (!r.ok) return setFalha(textoDoErro(r.erro));
    aoFeito({ titulo: "Documento chegou", texto: `${d.descricao} saiu de “Faltam”.` });
  }

  const ocupado = enviando || progresso !== null;
  return (
    <Janela id="j-chegou" aberta aoFechar={aoFechar} sobretitulo={`Jurídico · ${f.nome}`} titulo="Já chegou" descricao="j-chegou-d" aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-pri" type="submit" disabled={ocupado} aria-busy={ocupado || undefined} data-foco>
            <Icone nome="check" className="ico" />
            {arquivo ? "Guardar e marcar que chegou" : "Marcar que chegou"}
          </button>
        </>
      }>
      <div style={{ display: "grid", gap: 16 }}>
        <p id="j-chegou-d"><b>{d.descricao}</b> · {textoFalta(d)}. Ao marcar, ele sai de “Faltam” e de “O que está travando”.</p>
        {falha ? <Aviso tom="urgencia" titulo="Nada mudou.">{falha}</Aviso> : null}
        <CampoArquivo id="jc-arq" arquivo={arquivo} aoEscolher={(a) => { setArquivo(a); setErro(null); }} erro={erro} progresso={progresso} />
        <p className="ajuda" style={{ margin: 0 }}>O arquivo é opcional: se ele chegou em papel ou por outro caminho, só marque.</p>
      </div>
    </Janela>
  );
}
