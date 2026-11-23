"use client";
// Documentos pessoais na ficha do cliente (AP-08, F3.131), desenho aprovado em
// docs/design/aprovadas/portal-jornada-fechamento (grupo 9, decisões 34 a 40 e pergunta 9):
// - A folha nova "Documentos pessoais", logo abaixo de "Dados e qualificação": "Precisa de
//   atenção" (o comprovante que passou do prazo e o que um caso pediu e falta) e "Em dia".
// - "Anexar documento" segue as fotos aprovadas (F3.99): "Tirar foto" ou "Escolher arquivo";
//   até 10 fotos viram um PDF, na ordem da lista. A data é a do papel; é ela que conta o prazo.
//   Com um pedido aberto do mesmo documento num caso, "Marcar como chegou" vem marcado.
// - "Pedir pelo WhatsApp" / "Pedir de novo" só abre a conversa com o texto pronto, sem registrar
//   pedido (pergunta 9): o pedido com lembrete começa quando o caso abre.

import { useRef, useState } from "react";
import {
  MAX_FOTOS_ASSINADO, nomeDoDocumentoPessoal, textoPedirDocumentosPessoais, TIPOS_DOCUMENTO_PESSOAL,
  type DocumentoPessoal, type DocumentosPessoais, type FichaCliente, type PedidoPessoalAberto, type TipoDocumentoPessoal,
} from "@t3jus/domain";
import { textoDoErro } from "../api.ts";
import { Icone } from "../Icone.tsx";
import { enviarArquivo, tipoDoArquivo } from "../console/documentos.ts";
import { formatarTelefone } from "../console/ficha.ts";
import { Aviso, descritoPor, ErroAoCarregar, ErroCampo, Estado, Janela } from "../console/pecas.tsx";
import { lerDia } from "./agenda.ts";
import { useCarga } from "./Comercial.tsx";
import { juntarFotos, ordenarFotos } from "./fotos.ts";
import { chamarPortal } from "./Moldura.tsx";
import { tamanhoArquivo } from "./peticoes.ts";
import { problemaDosAssinados } from "./procuracoes.ts";

type Feito = { titulo: string; texto: string };
const dataBr = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
const ddmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
const primeiro = (n: string) => n.trim().split(/\s+/)[0] ?? n;
const diaDoEnvio = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(iso));

/** Os que quase todo caso pede (decisão 40). */
const COMUNS = ["RG e CPF, ou CNH", "Comprovante de residência de até 90 dias", "Certidão de casamento ou de nascimento"];

function contato(f: FichaCliente) {
  const c = f.contatos.find((x) => x.principal) ?? f.contatos[0];
  return { nome: c?.nome?.trim() || f.nome, telefone: c?.telefone ?? null };
}

/** O pedido do caso que falta: nenhum documento em uso do mesmo tipo (o vencido diz na própria linha). */
export function faltasDaFicha(d: DocumentosPessoais): PedidoPessoalAberto[] {
  return d.pedidos.filter((p) => !d.documentos.some((x) => x.tipo === p.tipoPessoal));
}

function metaDocumento(d: DocumentoPessoal, pedido: PedidoPessoalAberto | undefined, hoje: string) {
  const por = d.enviadoPor ? ` por ${primeiro(d.enviadoPor.nome)}` : "";
  const quando = diaDoEnvio(d.enviadoEm);
  const anexado = `anexado${por} ${quando === hoje ? "hoje" : `em ${ddmm(quando)}`}`;
  if (d.vencido) {
    return (
      <>
        <span className="jf-de">Do dia {dataBr(d.dataDocumento!)}, {d.dias} dias.</span>{" "}
        {anexado.charAt(0).toUpperCase() + anexado.slice(1)}.{pedido ? ` Um novo foi pedido ${pedido.pedidoEm === hoje ? "hoje" : `em ${ddmm(pedido.pedidoEm)}`}, para ${pedido.caso.nome}.` : ""}
      </>
    );
  }
  const arq = d.fotos ? `${d.fotos} fotos num PDF` : d.arquivoTipo === "application/pdf" ? "PDF" : "Foto";
  const papel = d.dataDocumento ? ` · do dia ${dataBr(d.dataDocumento)}` : "";
  return <>{arq}{papel} · {anexado}</>;
}

function Linha({ icone, nome, selo, meta, acoes, falta }: { icone: "doc" | "alerta"; nome: string; selo: React.ReactNode; meta: React.ReactNode; acoes: React.ReactNode; falta?: boolean }) {
  return (
    <li className={falta ? "falta" : undefined}>
      <span className="doc-ico" aria-hidden="true"><Icone nome={icone} className="ico" /></span>
      <div>
        <span className="doc-nome">{nome}</span>
        <p className="doc-meta">{selo}<span>{meta}</span></p>
      </div>
      <div className="doc-acoes">{acoes}</div>
    </li>
  );
}

export function FolhaDocumentosPessoais({ f, escritorio, aoFeito }: { f: FichaCliente; escritorio: string; aoFeito: (x: Feito) => void }) {
  const { dados, recarregar } = useCarga<DocumentosPessoais>(`/v1/escritorio/clientes/${f.id}/documentos`);
  const [anexar, setAnexar] = useState<{ tipo?: TipoDocumentoPessoal; substitui?: DocumentoPessoal; pedido?: PedidoPessoalAberto } | null>(null);
  const [pedir, setPedir] = useState<string[] | null>(null);
  const [abrindo, setAbrindo] = useState<string | null>(null);
  const [falha, setFalha] = useState<string | null>(null);
  const cab = (sub: string, acoes?: React.ReactNode) => (
    <div className="folha-cab">
      <div>
        <h2 id="t-dp">Documentos pessoais</h2>
        <p className="sub">{sub}</p>
      </div>
      {acoes ? <div className="acoes">{acoes}</div> : null}
    </div>
  );
  if (dados === "erro") {
    return <section className="folha" aria-labelledby="t-dp">{cab("Não deu para carregar")}<div style={{ padding: "0 24px 20px" }}><ErroAoCarregar oque="os documentos pessoais" aoTentar={recarregar} /></div></section>;
  }
  if (!dados) return <section className="folha" aria-labelledby="t-dp" aria-busy="true">{cab("Carregando…")}</section>;

  const pode = dados.podeAnexar;
  const faltas = faltasDaFicha(dados);
  const vencidos = dados.documentos.filter((d) => d.vencido);
  const emDia = dados.documentos.filter((d) => !d.vencido);
  const atencao = vencidos.length + faltas.length;
  const total = dados.documentos.length + faltas.length;
  const pedidoDe = (t: TipoDocumentoPessoal) => dados.pedidos.find((p) => p.tipoPessoal === t);

  async function abrir(d: DocumentoPessoal) {
    setFalha(null);
    setAbrindo(d.id);
    const r = await chamarPortal<{ url: string }>(`/v1/escritorio/clientes/documentos/${d.id}/abrir`, { metodo: "POST", corpo: {} });
    setAbrindo(null);
    if (!r.ok) return setFalha(textoDoErro(r.erro));
    const u = new URL(r.dados.url);
    u.searchParams.delete("download");
    window.open(u.toString(), "_blank", "noopener");
  }

  const nome = (d: DocumentoPessoal) => nomeDoDocumentoPessoal(d);
  const bAbrir = (d: DocumentoPessoal, sufixo = "") => (
    <button className="btn btn-sec btn-compacto" type="button" onClick={() => void abrir(d)} disabled={abrindo === d.id} aria-busy={abrindo === d.id || undefined}>
      <Icone nome="olho" className="ico ico-s" />Abrir<span className="sr">: {nome(d).toLowerCase()}{sufixo}</span>
    </button>
  );
  const bNovo = (d: DocumentoPessoal, pri = false) => pode ? (
    <button className={`btn ${pri ? "btn-sec" : "btn-fantasma"} btn-compacto`} type="button" onClick={() => setAnexar({ tipo: d.tipo, substitui: d, pedido: pedidoDe(d.tipo) })}>
      <Icone nome="enviar" className="ico ico-s" />Anexar um novo<span className="sr">: {nome(d).toLowerCase()}</span>
    </button>
  ) : null;

  const okSelo = (d: DocumentoPessoal) => (
    <span className="selo selo-ok"><Icone nome="check" className="ico" />{d.tipo === "COMPROVANTE_RESIDENCIA" && d.dias !== null ? `Em dia · ${d.dias} ${d.dias === 1 ? "dia" : "dias"}` : "Em dia"}</span>
  );
  const pe = (
    <p className="jf-dpe">
      <Icone nome="cadeado" className="ico" />
      <span>Anexar um novo guarda o anterior, com quem anexou e quando. Quem vê a ficha de {primeiro(f.nome)} vê estes documentos. O número do RG não sai da foto: complete em Dados e qualificação.</span>
    </p>
  );

  let corpo: React.ReactNode;
  let sub: string;
  if (!total) {
    sub = "Nenhum ainda";
    corpo = (
      <>
        <div className="jf-dvazio">
          <Estado icone="doc" titulo={`Nenhum documento de ${primeiro(f.nome)} ainda`}
            acoes={pode ? (
              <>
                <button className="btn btn-pri" type="button" onClick={() => setAnexar({})}><Icone nome="mais" className="ico" />Anexar documento</button>
                <button className="btn btn-sec" type="button" onClick={() => setPedir(COMUNS)}><Icone nome="whats" className="ico" />Pedir pelo WhatsApp</button>
              </>
            ) : undefined}>
            Os documentos pessoais ficam aqui e servem a todos os casos {f.tipo === "PJ" ? "do cliente" : `de ${primeiro(f.nome)}`}. Os que quase todo caso pede:
          </Estado>
          <ul className="jf-dcomuns">{COMUNS.map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
        <p className="jf-dpe">
          <Icone nome="whats" className="ico" />
          <span>“Pedir pelo WhatsApp” abre a conversa com o pedido escrito, para você conferir e enviar. Quando o caso abrir, a lista da área entra sozinha e o lembrete automático passa a valer.</span>
        </p>
      </>
    );
  } else {
    const partes = [
      emDia.length ? `${emDia.length} em dia` : null,
      vencidos.length ? `${vencidos.length} com mais de ${dados.validadeDias} dias` : null,
      faltas.length ? `${faltas.length} ${faltas.length === 1 ? "falta" : "faltam"}` : null,
    ].filter(Boolean);
    sub = `${total} ${total === 1 ? "documento" : "documentos"} · ${partes.join(", ")} · ${total === 1 ? "vale" : "valem"} para todos os casos de ${primeiro(f.nome)}`;
    corpo = (
      <>
        {atencao ? (
          <>
            <div className="jr-sub"><h3 className="sobretitulo">Precisa de atenção · {atencao}</h3></div>
            <ul className="lista docs jr-falta">
              {vencidos.map((d) => (
                <Linha key={d.id} icone="doc" nome={nome(d)} meta={metaDocumento(d, pedidoDe(d.tipo), dados.hoje)}
                  selo={<span className="selo selo-atencao"><Icone nome="relogio" className="ico" />Mais de {dados.validadeDias} dias</span>}
                  acoes={<>{bNovo(d, true)}{bAbrir(d, " antigo")}</>} />
              ))}
              {faltas.map((p) => (
                <Linha key={p.id} icone="alerta" falta nome={p.descricao} selo={<span className="selo selo-atencao">Falta</span>}
                  meta={`Pedida ${p.pedidoEm === dados.hoje ? `hoje, ${ddmm(p.pedidoEm)}` : `em ${ddmm(p.pedidoEm)}`}, para ${p.caso.nome}`}
                  acoes={pode ? (
                    <>
                      <button className="btn btn-sec btn-compacto" type="button" onClick={() => setAnexar({ tipo: p.tipoPessoal, pedido: p })}>
                        <Icone nome="enviar" className="ico ico-s" />Anexar<span className="sr">: {p.descricao.toLowerCase()}</span>
                      </button>
                      <button className="btn btn-sec btn-compacto" type="button" onClick={() => setPedir([p.descricao])}>
                        <Icone nome="whats" className="ico ico-s" />Pedir de novo<span className="sr">: {p.descricao.toLowerCase()}</span>
                      </button>
                    </>
                  ) : null} />
              ))}
            </ul>
          </>
        ) : null}
        {emDia.length ? (
          <>
            <div className="jr-sub"><h3 className="sobretitulo">{atencao ? `Em dia · ${emDia.length}` : `Guardados · ${emDia.length}`}</h3></div>
            <ul className="lista docs">
              {emDia.map((d) => (
                <Linha key={d.id} icone="doc" nome={nome(d)} selo={okSelo(d)} meta={metaDocumento(d, undefined, dados.hoje)} acoes={<>{bAbrir(d)}{bNovo(d)}</>} />
              ))}
            </ul>
          </>
        ) : null}
        {pe}
      </>
    );
  }

  return (
    <section className="folha" aria-labelledby="t-dp" style={{ overflow: "hidden" }}>
      {cab(sub, pode && total ? <button className="btn btn-sec" type="button" onClick={() => setAnexar({})}><Icone nome="mais" className="ico" />Anexar documento</button> : undefined)}
      {falha ? <div style={{ padding: "0 24px 12px" }}><Aviso tom="urgencia" titulo="O arquivo não abriu.">{falha}</Aviso></div> : null}
      {corpo}
      {anexar ? (
        <JanelaAnexarDocumento f={f} dados={dados} inicial={anexar} aoFechar={() => setAnexar(null)}
          aoFeito={(x) => { setAnexar(null); recarregar(); aoFeito(x); }} />
      ) : null}
      {pedir ? <JanelaPedirPelaConversa f={f} escritorio={escritorio} documentos={pedir} aoFechar={() => setPedir(null)} /> : null}
    </section>
  );
}

// ------------------------------------------------------------------------- Pedir pela conversa

function JanelaPedirPelaConversa({ f, escritorio, documentos, aoFechar }: { f: FichaCliente; escritorio: string; documentos: string[]; aoFechar: () => void }) {
  const c = contato(f);
  const texto = textoPedirDocumentosPessoais(c.nome, escritorio, f.nome, documentos);
  const fone = c.telefone?.replace(/\D/g, "") ?? "";
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }
  return (
    <Janela id="j-dp-pedir" aberta aoFechar={aoFechar} sobretitulo={`${f.nome} · documentos pessoais`} titulo="Pedir pelo WhatsApp" descricao="j-dp-pedir-d" aoEnviar={aoFechar}
      pe={<button className="btn btn-fantasma" type="button" onClick={aoFechar}>Fechar</button>}>
      <div style={{ display: "grid", gap: 16 }}>
        <p id="j-dp-pedir-d">O texto vai pronto para você conferir e enviar. Nada fica registrado como pedido: o pedido com lembrete começa quando o caso abre.</p>
        <div className="campo">
          <p className="jr-rot">Texto para {primeiro(c.nome)}{c.telefone ? ` · ${formatarTelefone(c.telefone)}` : ""}</p>
          <p className="jr-previa">{texto}</p>
        </div>
        <div className="jr-denovo-acoes">
          {fone ? (
            <a className="btn btn-pri" href={`https://wa.me/${fone}?text=${encodeURIComponent(texto)}`} target="_blank" rel="noopener noreferrer" data-foco>
              <Icone nome="whats" className="ico" />Abrir no WhatsApp
            </a>
          ) : null}
          <button className="btn btn-sec" type="button" onClick={() => void copiar()} data-foco={fone ? undefined : true}>
            <Icone nome="copiar" className="ico" />{copiado ? "Texto copiado" : "Copiar texto"}
          </button>
        </div>
        <span className="sr" role="status">{copiado ? "Texto copiado." : ""}</span>
        {!fone ? <Aviso tom="info" titulo="O contato principal não tem telefone na ficha.">Copie o texto e envie como achar melhor.</Aviso> : null}
      </div>
    </Janela>
  );
}

// ------------------------------------------------------------------------- Anexar documento

const ACEITOS = "application/pdf,image/jpeg,image/png";

export function JanelaAnexarDocumento({ f, dados, inicial, aoFechar, aoFeito }: {
  f: FichaCliente | { id: string; nome: string };
  dados: DocumentosPessoais;
  inicial: { tipo?: TipoDocumentoPessoal; substitui?: DocumentoPessoal; pedido?: PedidoPessoalAberto };
  aoFechar: () => void;
  aoFeito: (x: Feito) => void;
}) {
  const hoje = dados.hoje;
  const [tipo, setTipo] = useState<TipoDocumentoPessoal | "">(inicial.tipo ?? "");
  const [descricao, setDescricao] = useState(inicial.substitui?.descricao ?? "");
  const [arquivos, setArquivos] = useState<{ arq: File; camera: boolean }[]>([]);
  const [data, setData] = useState("");
  const [marcar, setMarcar] = useState(true);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [progresso, setProgresso] = useState<number | null>(null);
  const foto = useRef<HTMLInputElement>(null);
  const escolher = useRef<HTMLInputElement>(null);
  const corpo = useRef<HTMLDivElement>(null);
  const pedido = tipo ? (inicial.pedido?.tipoPessoal === tipo ? inicial.pedido : dados.pedidos.find((p) => p.tipoPessoal === tipo)) : undefined;
  const anterior = inicial.substitui && inicial.substitui.tipo === tipo ? inicial.substitui : undefined;
  const fotos = arquivos.length > 1 || arquivos.some((a) => /^image\//.test(a.arq.type) || /\.(jpe?g|png)$/i.test(a.arq.name));
  const chegaram = pedido ? dados.pedidos.filter((p) => p.caso.id === pedido.caso.id) : [];

  function juntar(novos: File[], camera: boolean) {
    setArquivos((a) => [...a, ...novos.map((arq) => ({ arq, camera }))]);
    setErros((e) => { const { arquivo: _a, ...resto } = e; return resto; });
  }

  async function enviar() {
    setFalha(null);
    const e: Record<string, string> = {};
    if (!tipo) e.tipo = "Escolha qual é o documento.";
    if (tipo === "OUTRO" && descricao.trim().length < 3) e.descricao = "Diga qual é o documento, com 3 a 160 letras.";
    const lista = arquivos.map((a) => a.arq);
    if (!lista.length) e.arquivo = "Tire a foto ou escolha o arquivo do documento.";
    else if (lista.length > MAX_FOTOS_ASSINADO) e.arquivo = `São ${lista.length} fotos e o limite é ${MAX_FOTOS_ASSINADO}. Tire a que sobrou ou junte as páginas num PDF só.`;
    else {
      const p = problemaDosAssinados(lista);
      if (p) e.arquivo = p.replace("papel assinado", "documento");
    }
    const dia = data.trim() ? lerDia(data) : null;
    if (data.trim() && !dia) e.data = "Escreva a data do documento no formato dd/mm/aaaa.";
    else if (dia && dia > hoje) e.data = `Confira a data: ela não pode ser depois de hoje (${dataBr(hoje)}).`;
    else if (!dia && tipo === "COMPROVANTE_RESIDENCIA") e.data = "Escreva a data da conta: é ela que conta os dias do comprovante.";
    setErros(e);
    if (Object.keys(e).length) return requestAnimationFrame(() => corpo.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-erro]')?.focus());
    setEnviando(true);
    const arquivo = lista.length > 1 ? await juntarFotos(ordenarFotos(lista)) : lista[0]!;
    if (typeof arquivo === "string") {
      setEnviando(false);
      setErros({ arquivo });
      return requestAnimationFrame(() => corpo.current?.querySelector<HTMLElement>("[data-erro]")?.focus());
    }
    const arquivoTipo = tipoDoArquivo(arquivo.name, arquivo.type);
    if (!arquivoTipo) {
      setEnviando(false);
      return setErros({ arquivo: "Tipo não aceito. Envie PDF, JPG ou PNG." });
    }
    const ini = await chamarPortal<{ id: string; enderecoDeEnvio: string }>(`/v1/escritorio/clientes/${f.id}/documentos`, {
      metodo: "POST",
      corpo: {
        tipo, descricao: descricao.trim() || null, dataDocumento: dia, nome: arquivo.name, arquivoTipo, tamanho: arquivo.size,
        fotos: lista.length > 1 ? lista.length : null, substitui: anterior?.id ?? null, pedidoId: pedido && marcar ? pedido.id : null,
      },
    });
    if (!ini.ok) {
      setEnviando(false);
      const campos = ini.erro.detalhes?.campos;
      if (ini.erro.codigo === "VALIDATION_ERROR" && Array.isArray(campos) && campos.length) {
        const m: Record<string, string> = {};
        for (const k of campos.map(String)) {
          if (k === "dataDocumento") m.data = "Confira a data do documento.";
          else if (k === "descricao") m.descricao = "Diga qual é o documento, com 3 a 160 letras.";
          else if (k === "tipo") m.tipo = "Escolha qual é o documento.";
          else m.arquivo = "Arquivo não aceito. Envie PDF ou foto, até 10 MB.";
        }
        setErros(m);
        return requestAnimationFrame(() => corpo.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-erro]')?.focus());
      }
      return setFalha(textoDoErro(ini.erro));
    }
    setProgresso(0);
    const foi = await enviarArquivo(ini.dados.enderecoDeEnvio, arquivo, arquivoTipo, setProgresso);
    const fim = foi ? await chamarPortal<DocumentoPessoal>(`/v1/escritorio/clientes/documentos/${ini.dados.id}/concluir`, { metodo: "POST", corpo: {} }) : null;
    setProgresso(null);
    setEnviando(false);
    if (!fim?.ok) return setFalha("O envio caiu no meio. O documento não foi guardado, e as fotos continuam aqui. Envie de novo.");
    const n = TIPOS_DOCUMENTO_PESSOAL[tipo as TipoDocumentoPessoal];
    aoFeito({
      titulo: `${tipo === "OUTRO" ? descricao.trim() : n} guardado na ficha.`,
      texto: pedido && marcar
        ? `Chegou também em ${pedido.caso.nome}: o lembrete deixa de pedir este.`
        : anterior ? "O anterior ficou guardado, com quem anexou e quando." : `Serve a todos os casos de ${primeiro(f.nome)}.`,
    });
  }

  const nErros = Object.keys(erros).length;
  return (
    <Janela id="j-dp" aberta aoFechar={aoFechar} sobretitulo={`${f.nome} · documentos pessoais`} titulo={anterior ? "Anexar um novo" : "Anexar documento"} descricao="j-dp-d"
      aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-pri" type="submit" disabled={enviando} aria-busy={enviando || undefined} data-foco={inicial.tipo ? true : undefined}>
            <Icone nome="check" className="ico" />{enviando ? "Guardando…" : "Guardar na ficha"}
          </button>
        </>
      }>
      <div ref={corpo} className="jf-anx-g">
        <p id="j-dp-d" style={{ margin: 0 }}>Fica na ficha de {primeiro(f.nome)}, com seu nome e a hora.{anterior ? " O anterior fica guardado." : ""}</p>
        {nErros ? (
          <Aviso tom="urgencia" titulo={`Nada foi guardado. Falta acertar ${nErros === 1 ? "1 ponto" : `${nErros} pontos`}.`}>
            {Object.entries(erros).map(([k, v], i) => (
              <span key={k}>{i ? " · " : ""}<a href={`#${k === "arquivo" ? "dp-foto" : `dp-${k}`}`}>{v}</a></span>
            ))}
            {arquivos.length ? " As fotos continuam aqui." : ""}
          </Aviso>
        ) : null}
        {falha ? <Aviso tom="urgencia" titulo="Nada foi guardado.">{falha}</Aviso> : null}
        <div className="campo">
          <label htmlFor="dp-tipo">Qual documento</label>
          <select className="entrada" id="dp-tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoDocumentoPessoal)} data-foco={inicial.tipo ? undefined : true}
            aria-invalid={erros.tipo ? true : undefined} aria-describedby={descritoPor("dp-tipo-aj", erros.tipo && "dp-tipo-er")}>
            <option value="" />
            {(Object.keys(TIPOS_DOCUMENTO_PESSOAL) as TipoDocumentoPessoal[]).map((t) => <option key={t} value={t}>{TIPOS_DOCUMENTO_PESSOAL[t]}</option>)}
          </select>
          <p className="ajuda" id="dp-tipo-aj">Documento pessoal fica na ficha e serve a todos os casos. Documento só do processo vai em Documentos do caso.</p>
          {erros.tipo ? <ErroCampo id="dp-tipo-er">{erros.tipo}</ErroCampo> : null}
        </div>
        {tipo === "OUTRO" || tipo === "CERTIDAO_OBITO" ? (
          <div className="campo">
            <label htmlFor="dp-descricao">{tipo === "OUTRO" ? "Qual é" : "De quem"}{tipo === "OUTRO" ? null : <span className="opcional"> (opcional)</span>}</label>
            <input className="entrada" id="dp-descricao" type="text" maxLength={160} value={descricao} onChange={(e) => setDescricao(e.target.value)}
              placeholder={tipo === "OUTRO" ? "Ex.: título de eleitor" : "Ex.: Certidão de óbito de Sebastião Prado"}
              aria-invalid={erros.descricao ? true : undefined} aria-describedby={descritoPor(erros.descricao && "dp-descricao-er")} />
            {erros.descricao ? <ErroCampo id="dp-descricao-er">{erros.descricao}</ErroCampo> : null}
          </div>
        ) : null}
        <div className="campo">
          <p className="pe-rot" id="dp-arq-r">O documento</p>
          <input ref={foto} type="file" accept="image/*" capture="environment" className="sr" tabIndex={-1} aria-hidden="true"
            onChange={(e) => { const a = [...(e.target.files ?? [])]; if (a.length) juntar(a, true); e.target.value = ""; }} />
          <input ref={escolher} type="file" accept={ACEITOS} multiple className="sr" tabIndex={-1} aria-hidden="true"
            onChange={(e) => { const a = [...(e.target.files ?? [])]; if (a.length) juntar(a, false); e.target.value = ""; }} />
          <div className="jf-fotos-bts" role="group" aria-labelledby="dp-arq-r">
            <button className="btn btn-sec" type="button" id="dp-foto" onClick={() => foto.current?.click()} data-erro={erros.arquivo ? "" : undefined}
              aria-describedby={descritoPor("dp-arq-aj", erros.arquivo && "dp-arq-er")}>
              <Icone nome="imagem" className="ico" />Tirar foto
            </button>
            <button className="btn btn-sec" type="button" onClick={() => escolher.current?.click()} aria-describedby="dp-arq-aj">
              <Icone nome="enviar" className="ico" />Escolher arquivo
            </button>
          </div>
          <p className="ajuda" id="dp-arq-aj">PDF ou foto, até 10 MB. Várias páginas: um PDF só ou até 10 fotos.</p>
          {erros.arquivo ? <ErroCampo id="dp-arq-er">{erros.arquivo}</ErroCampo> : null}
          {arquivos.length ? (
            <ol className={erros.arquivo ? "jf-fotos erro" : "jf-fotos"} aria-label={fotos ? "Fotos, na ordem das páginas" : "Arquivo escolhido"}>
              {arquivos.map((a, i) => (
                <li key={`${a.arq.name}-${i}`}>
                  <span className="jf-mini" aria-hidden="true"><Icone nome={fotos ? "imagem" : "doc"} className="ico" /></span>
                  <span><b>{fotos ? `Foto ${i + 1}` : a.arq.name}</b><small>{a.camera ? "da câmera" : a.arq.name} · {tamanhoArquivo(a.arq.size)}</small></span>
                  <button className="btn btn-fantasma btn-compacto" type="button" onClick={() => setArquivos((x) => x.filter((_, j) => j !== i))}>
                    <Icone nome="xis" className="ico ico-s" />Tirar<span className="sr"> {fotos ? `a foto ${i + 1}` : a.arq.name}</span>
                  </button>
                </li>
              ))}
            </ol>
          ) : null}
          {fotos && arquivos.length > 1 ? (
            <p className="jf-junta-pdf"><Icone nome="doc" className="ico" /><span>As fotos viram <b>um PDF só</b>, na ordem acima. No celular, “Tirar foto” abre a câmera.</span></p>
          ) : null}
          {progresso !== null ? <div className="jr-progresso"><progress max={100} value={progresso} aria-label="Enviando o documento" /><span>{progresso}%</span></div> : null}
        </div>
        <div className="campo">
          <label htmlFor="dp-data">Data do documento{tipo === "COMPROVANTE_RESIDENCIA" ? null : <span className="opcional"> (opcional)</span>}</label>
          <input className="entrada" id="dp-data" type="text" inputMode="numeric" placeholder="dd/mm/aaaa" maxLength={10} value={data} onChange={(e) => setData(e.target.value)}
            aria-invalid={erros.data ? true : undefined} aria-describedby={descritoPor("dp-data-aj", erros.data && "dp-data-er")} />
          <p className="ajuda" id="dp-data-aj">A data que está no papel: emissão da certidão, data da conta. No comprovante, é ela que conta os {dados.validadeDias} dias.</p>
          {erros.data ? <ErroCampo id="dp-data-er">{erros.data}</ErroCampo> : null}
        </div>
        {pedido ? (
          <label className="opcao">
            <input className="marcar" type="checkbox" checked={marcar} onChange={(e) => setMarcar(e.target.checked)} />
            <span>Marcar como chegou em {pedido.caso.nome}
              <small>Atende o pedido {pedido.pedidoEm === hoje ? `de hoje, ${ddmm(hoje)}` : `de ${ddmm(pedido.pedidoEm)}`}.{chegaram.length > 1 ? ` Faltam ${chegaram.length} pedidos pessoais neste caso.` : ""} O lembrete deixa de pedir este.</small>
            </span>
          </label>
        ) : null}
      </div>
    </Janela>
  );
}
