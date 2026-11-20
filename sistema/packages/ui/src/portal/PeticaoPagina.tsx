"use client";
// A página de cada petição (EX-09), desenho aprovado em docs/design/aprovadas/portal-peticoes
// (estados gerada, revisao-enviada, revisar, revisar-ajuste, revisar-erro, passar-revisao,
// ajuste-pedido, reenviar-v2, revisar-v2, aprovada e reprovada; decisões 11 e 17 a 27).
// Quem gerou vê o resultado e o que acontece agora; quem revisa vê a prévia com um botão de
// comentar em cada parágrafo, os dados usados, as versões e a decisão. Só a aprovada sai pronta;
// o resto baixa com "Rascunho · em revisão" no cabeçalho. O servidor confere quem pode cada coisa.

import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  conferirDocx, ErroDocx, formatarCnj,
  type ComentarioPeticao, type DadosPeticao, type FichaPeticao, type ListaModelos, type ResultadoGerar, type RevisorPossivel, type VersaoPeticao,
} from "@t3jus/domain";
import { textoDoErro } from "../api.ts";
import { Icone } from "../Icone.tsx";
import { Aviso, Carregando, descritoPor, ErroAoCarregar, ErroCampo, Janela } from "../console/pecas.tsx";
import { Selo } from "./Comercial.tsx";
import { Toast } from "./FichaCliente.tsx";
import { urgenciaPrazo } from "./juridico.ts";
import {
  CabPeticoes, classeParagrafo, corpoDoForm, errosDoForm, FormDados, LegendaPrevia, motivosDoErro, Papel, SeloDados, SeloPeticao, TextoParagrafo, useBaixar,
  type FormPeticao,
} from "./Peticoes.tsx";
import { botaoDecisao, contar, erroDoArquivo, primeiroNome, quando, ROTAS_PETICOES, SELO_PETICAO, tamanhoArquivo, trechoCurto } from "./peticoes.ts";
import { chamarPortal, irPara, type EscritorioPortal } from "./Moldura.tsx";
import { MolduraArea } from "./MolduraArea.tsx";

type Feito = { titulo: string; texto: string };
const API = "/v1/escritorio/peticoes";
const TEXTO_DECISAO: Record<NonNullable<VersaoPeticao["decisao"]>["tipo"], string> = {
  APROVADA: "aprovou", AJUSTE: "pediu ajuste", REPROVADA: "reprovou", PASSADA: "passou a revisão",
};

function useFicha(id: string) {
  const [f, setF] = useState<FichaPeticao | null | "erro" | "nao">(null);
  const [vez, setVez] = useState(0);
  useEffect(() => {
    let vivo = true;
    void chamarPortal<FichaPeticao>(`${API}/${id}`).then((r) => {
      if (vivo) setF(r.ok ? r.dados : r.status === 404 ? "nao" : "erro");
    });
    return () => { vivo = false; };
  }, [id, vez]);
  return { f, setF, recarregar: () => setVez((v) => v + 1) };
}

/** O selo da situação e quem/quando, em destaque (pe-sit-grande). */
function SituacaoGrande({ f, eu }: { f: FichaPeticao; eu: string }) {
  const v = f.versoes.find((x) => x.numero === f.versaoAtual);
  let t: ReactNode = null;
  if (f.situacao === "APROVADA") {
    t = f.aprovadaPor && f.revisor
      ? <>Por <b>{f.aprovadaPor.nome}</b>, {quando(f.aprovadaEm!)} · versão {f.versaoAtual}</>
      : <>Sem revisão: {f.geradoPor.nome === eu ? "você" : primeiroNome(f.geradoPor.nome)} {f.caso.responsavel.id === f.geradoPor.id ? "é a responsável pelo caso" : "é a sócia dona"}</>;
  } else if (f.situacao === "REVISAO") {
    t = <>Com <b>{f.revisor?.nome === eu ? "você" : f.revisor?.nome}</b> desde {quando(v?.enviadaEm ?? f.geradoEm)}</>;
  } else if ((f.situacao === "AJUSTE" || f.situacao === "REPROVADA") && v?.decisao) {
    t = <>Por <b>{v.decisao.por.nome}</b>, {quando(v.decisao.em)} · versão {v.numero}</>;
  } else if (f.situacao === "RASCUNHO") {
    t = <>Gerada {quando(f.geradoEm)} · ainda não foi para a revisão</>;
  }
  return <p className="pe-sit-grande"><SeloPeticao s={f.situacao} /><span>{t}</span></p>;
}

function ArquivoPeticao({ f, aoBaixar, baixando, foco }: { f: FichaPeticao; aoBaixar: () => void; baixando: boolean; foco?: boolean }) {
  const pronta = f.situacao === "APROVADA";
  const v = f.versoes.find((x) => x.numero === f.versaoAtual);
  return (
    <div className="pe-arq">
      <span className="pe-ci" aria-hidden="true"><Icone nome="doc" className="ico" /></span>
      <div>
        <b>{v?.arquivo ?? f.arquivo}</b>
        <small>Word · versão {f.versaoAtual}{pronta ? (f.revisor ? " aprovada · sem a marca de rascunho" : ` · gerado ${quando(f.geradoEm)} por ${f.geradoPor.nome} · modelo ${f.modelo.nome}${f.modelo.versao ? ` v${f.modelo.versao}` : ""}`) : " · sai com “Rascunho · em revisão” no cabeçalho"}</small>
      </div>
      <button className={`btn ${pronta ? "btn-pri" : "btn-sec"}`} type="button" onClick={aoBaixar} disabled={baixando} data-foco={foco ? "" : undefined} autoFocus={foco}>
        <Icone nome="baixar" className="ico" />{pronta ? "Baixar o .docx" : "Baixar o rascunho"}
      </button>
    </div>
  );
}

const PRAZO = ({ f }: { f: FichaPeticao }) => {
  if (!f.caso.prazo) return null;
  const u = urgenciaPrazo(f.caso.prazo.data, new Date().toISOString().slice(0, 10));
  return <p className="pe-cuidado" style={{ margin: 0 }}><Icone nome="relogio" className="ico" /><span><b>O prazo do caso: {u.texto.toLowerCase()}.</b> {f.caso.prazo.descricao}.</span></p>;
};

function Versoes({ f }: { f: FichaPeticao }) {
  const descr = (v: VersaoPeticao) => {
    const coms = f.comentarios.filter((c) => c.versao === v.numero && c.enviado);
    const resolvidos = coms.filter((c) => c.resolvidoEm).length;
    const partes: string[] = [v.origem === "DOCX_EDITADO" ? ".docx editado no Word." : v.numero === 1 ? "Gerada pelos dados do cadastro." : "Refeita pelos dados."];
    if (v.recado) partes.push("Com recado.");
    if (v.decisao) {
      partes.push(`${primeiroNome(v.decisao.por.nome)} ${TEXTO_DECISAO[v.decisao.tipo]} ${quando(v.decisao.em).replace(/^(hoje|ontem), /, "às ")}.`);
      if (coms.length) partes.push(`${contar(coms.length, "comentário", "comentários")}${resolvidos ? `, ${resolvidos === coms.length ? (coms.length === 1 ? "resolvido" : "todos resolvidos") : `${resolvidos} resolvido${resolvidos > 1 ? "s" : ""}`}` : ""}.`);
    }
    if (v.marcados.length) partes.push(`${contar(v.marcados.length, "dado marcado", "dados marcados")}.`);
    return partes.join(" ");
  };
  const situacaoDa = (v: VersaoPeticao) => {
    if (v.numero === f.versaoAtual) return f.situacao;
    return v.decisao?.tipo === "REPROVADA" ? "REPROVADA" : v.decisao?.tipo === "APROVADA" ? "APROVADA" : "AJUSTE";
  };
  return (
    <section className="folha" aria-labelledby="t-hv">
      <div className="folha-cab" style={{ paddingBottom: 8 }}>
        <div><h2 id="t-hv" style={{ fontSize: 20 }}>Versões</h2><p className="sub">Todas ficam guardadas, com os comentários</p></div>
      </div>
      <ol className="pe-versoes">
        {[...f.versoes].sort((a, b) => a.numero - b.numero).map((v) => (
          <li key={v.id} className={v.numero === f.versaoAtual ? "pe-v-atual" : undefined}>
            <span className="pe-vn" aria-hidden="true">v{v.numero}</span>
            <span><b>Versão {v.numero}</b> · {quando(v.enviadaEm)} · {v.enviadaPor.nome}<small>{descr(v)}</small><SeloPeticao s={situacaoDa(v)} /></span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Comentario({ c, autorNoNome = true, aoDesfazer }: { c: ComentarioPeticao; autorNoNome?: boolean; aoDesfazer?: () => void }) {
  const rot = c.paragrafo ? `Comentário de ${c.autor.nome} no parágrafo ${c.paragrafo}` : `Comentário geral de ${c.autor.nome}`;
  return (
    <div className={`pe-com${c.resolvidoEm ? " pe-com-ok" : ""}${c.paragrafo ? "" : " pe-com-geral"}`} role="note" aria-label={rot}>
      <Icone nome="conversas" className="ico" />
      <div>
        <b>{autorNoNome ? c.autor.nome : c.paragrafo ? `No parágrafo ${c.paragrafo}` : "Comentário geral"}</b>
        {c.resolvidoEm ? <Selo tom="ok" icone="check">Resolvido{c.resolvidoNaVersao ? ` na v${c.resolvidoNaVersao}` : ""}</Selo> : null}
        {!c.enviado ? <Selo tom="neutro">Ainda não enviado</Selo> : null}
        {!autorNoNome && c.trecho ? <p className="pe-trecho">“{trechoCurto(c.trecho, 90)}”</p> : null}
        <p>{c.texto}</p>
        {aoDesfazer ? <p><button className="btn btn-fantasma btn-compacto" type="button" onClick={aoDesfazer}>Desfazer<span className="sr"> o comentário</span></button></p> : null}
      </div>
    </div>
  );
}

const resumoCaso = (f: FichaPeticao) => `${f.caso.nome}${f.caso.numero ? ` · ${formatarCnj(f.caso.numero)}` : ""}`;

// ------------------------------------------------------------------------- quem gerou, aprovada e reprovada

function Resultado({ f, eu, gerada, recarregar }: { f: FichaPeticao; eu: string; gerada: boolean; recarregar: () => void }) {
  const bx = useBaixar();
  const [recado, setRecado] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  const v = f.versoes.find((x) => x.numero === f.versaoAtual)!;
  const coms = f.comentarios.filter((c) => c.versao === f.versaoAtual && c.enviado);
  const geral = coms.find((c) => !c.paragrafo);
  const baixar = () => void bx.peticao(f.id);
  const marcados = v.marcados;

  async function enviar() {
    setEnviando(true);
    setFalha(null);
    const r = await chamarPortal<ResultadoGerar>(`${API}/${f.id}/enviar`, { metodo: "POST", corpo: { recado: recado.trim() || null } });
    setEnviando(false);
    if (!r.ok) return setFalha(textoDoErro(r.erro));
    recarregar();
  }

  let titulo = "";
  let sub = "";
  let corpo: ReactNode = null;
  let lateral: ReactNode = <Versoes f={f} />;
  if (f.situacao === "APROVADA") {
    titulo = f.revisor ? "Pronta para protocolar" : `${f.modelo.nome} pronto`;
    sub = f.revisor ? "Ficou nos documentos do caso como petição aprovada" : `${f.caso.nome} · ficou em Petições e nos documentos do caso`;
    corpo = (
      <>
        {f.revisor && v.decisao?.motivo ? (
          <div className="pe-com pe-com-geral" role="note" aria-label={`Comentário de ${v.decisao.por.nome} ao aprovar`}><Icone nome="conversas" className="ico" /><div><b>{v.decisao.por.nome}</b><p>{v.decisao.motivo}</p></div></div>
        ) : null}
        <ArquivoPeticao f={f} aoBaixar={baixar} baixando={!!bx.baixando} foco={gerada} />
        {marcados.length ? (
          <Aviso tom="atencao" icone="pena" titulo={marcados.length === 1 ? `${marcados[0]} saiu marcado como falta.` : `${contar(marcados.length, "dado saiu marcado", "dados saíram marcados")} como falta.`}>
            {marcados.length > 1 ? `${marcados.join(", ")}. ` : ""}Complete no Word, ou complete o cadastro e gere de novo. O arquivo anterior fica guardado.
          </Aviso>
        ) : null}
        <p className="pe-cuidado" style={{ margin: 0 }}><Icone nome="balanca" className="ico" /><span><b>O T3jus não protocola e não revisa o conteúdo jurídico.</b> {f.revisor ? `A revisão foi de ${f.aprovadaPor?.nome ?? f.revisor.nome}; a assinatura e o protocolo são do escritório.` : "Ele só preencheu o modelo do escritório com os dados do cadastro. A revisão, a assinatura e o protocolo são do escritório."}</span></p>
        {!f.revisor ? (
          <ol className="pe-proximo" aria-label="Próximos passos">
            <li><span><b>Revise no Word:</b> os dados marcados, a concordância (“vem” ou “vêm”, “inconformado” ou “inconformados”) e o texto.</span></li>
            <li><span><b>Assine e protocole</b> no sistema do tribunal, como sempre.</span></li>
            <li><span><b>Se quiser, anexe o protocolado</b> nos documentos do caso.</span></li>
          </ol>
        ) : null}
        <div className="pe-acoes-res">
          <a className="btn btn-sec" href={ROTAS_PETICOES.caso(f.caso.id)}><Icone nome="balanca" className="ico" />Abrir a ficha do caso</a>
          <a className="btn btn-fantasma" href={ROTAS_PETICOES.nova(f.caso.id)}><Icone nome="mais" className="ico" />Outra petição deste caso</a>
        </div>
      </>
    );
  } else if (f.situacao === "REPROVADA") {
    titulo = "Reprovada";
    sub = `Gerada por ${f.geradoPor.nome} ${quando(f.geradoEm)}`;
    corpo = (
      <>
        {v.decisao?.motivo ? <div className="pe-com pe-com-geral" role="note" aria-label={`Motivo de ${v.decisao.por.nome}`}><Icone nome="conversas" className="ico" /><div><b>Motivo</b><p>{v.decisao.motivo}</p></div></div> : null}
        <p className="pe-cuidado" style={{ margin: 0 }}><Icone nome="cadeado" className="ico" /><span><b>Fica guardada, mas não sai como pronta.</b> Não entra nos documentos do caso. Dá para baixar só como rascunho, para consulta.</span></p>
        <div className="pe-acoes-res">
          <button className="btn btn-sec" type="button" onClick={baixar} disabled={!!bx.baixando}><Icone nome="baixar" className="ico" />Baixar o rascunho</button>
          <a className="btn btn-fantasma" href={ROTAS_PETICOES.nova(f.caso.id)}><Icone nome="mais" className="ico" />Gerar outra petição deste caso</a>
        </div>
      </>
    );
  } else if (f.situacao === "REVISAO") {
    titulo = "Enviada para revisão";
    sub = "Ainda não está pronta: falta a aprovação do responsável pelo caso";
    const r = f.revisor ? primeiroNome(f.revisor.nome) : "O revisor";
    corpo = (
      <>
        <ArquivoPeticao f={f} aoBaixar={baixar} baixando={!!bx.baixando} foco={gerada} />
        <ol className="pe-proximo" aria-label="O que acontece agora">
          <li><span><b>{r} revisa:</b> aprova, pede ajuste ou reprova, com comentários.</span></li>
          <li><span><b>{f.geradoPor.nome === eu ? "Você é avisada" : `${primeiroNome(f.geradoPor.nome)} é avisada`}</b> no sino quando {r === "O revisor" ? "ele" : r} decidir.</span></li>
          <li><span><b>Aprovada, fica pronta</b> para baixar e protocolar. O T3jus não protocola.</span></li>
        </ol>
        <PRAZO f={f} />
      </>
    );
  } else if (f.situacao === "RASCUNHO") {
    titulo = "Rascunho";
    sub = "Gerada e ainda não enviada para a revisão";
    corpo = (
      <>
        <ArquivoPeticao f={f} aoBaixar={baixar} baixando={!!bx.baixando} foco={gerada} />
        {f.pode.enviar ? (
          <>
            <div className="pe-cuidado" style={{ margin: 0 }}><Icone nome="pessoas" className="ico" /><span><b>Falta enviar para a revisão{f.revisor ? ` de ${f.revisor.nome}` : ""}.</b> Só fica pronta depois que o responsável pelo caso aprovar.</span></div>
            <div className="campo">
              <label htmlFor="re-recado">Recado{f.revisor ? ` para ${primeiroNome(f.revisor.nome)}` : ""}<span className="opcional"> (opcional)</span></label>
              <textarea className="entrada" id="re-recado" style={{ minHeight: 72 }} maxLength={1000} value={recado} onChange={(e) => setRecado(e.target.value)} aria-describedby="re-recado-aj" />
              <p className="ajuda" id="re-recado-aj">Aparece no topo da revisão.</p>
            </div>
            {falha ? <Aviso tom="urgencia" titulo="Não foi enviada.">{falha}</Aviso> : null}
            <div className="pe-acoes-res">
              <button className="btn btn-pri" type="button" onClick={() => void enviar()} disabled={enviando}><Icone nome="enviar" className="ico" />{enviando ? "Enviando…" : `Enviar para revisão${f.revisor ? ` de ${f.revisor.nome}` : ""}`}</button>
            </div>
          </>
        ) : null}
      </>
    );
  } else {
    titulo = "Ajuste pedido";
    sub = `${f.revisor?.nome ?? "Quem revisou"} pediu ajuste na versão ${f.versaoAtual}`;
    corpo = (
      <>
        {geral ? <Comentario c={geral} autorNoNome={false} /> : null}
        {coms.filter((c) => c.paragrafo).map((c) => <Comentario key={c.id} c={c} autorNoNome={false} />)}
        <PRAZO f={f} />
        {f.pode.novaVersao ? (
          <div className="pe-acoes-res">
            <a className="btn btn-pri" href={ROTAS_PETICOES.versao(f.id)}>Corrigir e enviar a versão {f.versaoAtual + 1}<Icone nome="dir" className="ico" /></a>
            <button className="btn btn-sec" type="button" onClick={baixar} disabled={!!bx.baixando}><Icone nome="baixar" className="ico" />Baixar a v{f.versaoAtual}</button>
          </div>
        ) : null}
      </>
    );
    lateral = (
      <>
        <section className="folha" aria-labelledby="t-pv">
          <div className="folha-cab" style={{ paddingBottom: 8 }}><div><h2 id="t-pv" style={{ fontSize: 20 }}>Versão {f.versaoAtual}, com os comentários</h2></div></div>
          <div className="pe-papel-folha pe-mini"><PapelComentado f={f} comentarios={coms} /></div>
        </section>
        <Versoes f={f} />
      </>
    );
  }

  return (
    <div className="hn">
      <CabPeticoes titulo={f.modelo.nome} sobre={`Petições · ${f.caso.nome}`} voltar={{ href: ROTAS_PETICOES.lista, nome: "Petições" }} />
      <div className="hn-grade">
        <div className="hn-col">
          <section className="folha" aria-labelledby="t-res">
            <div className="folha-cab"><div><h2 id="t-res">{titulo}</h2><p className="sub">{sub}</p></div></div>
            <div className="pe-pronto">
              <SituacaoGrande f={f} eu={eu} />
              {bx.falha ? <Aviso tom="urgencia" titulo="Não deu para baixar.">{bx.falha}</Aviso> : null}
              {corpo}
            </div>
            {f.situacao === "APROVADA" ? (
              <div className="pe-reserva"><Icone nome="lapis" className="ico" /><span><b>Assinatura eletrônica: em estudo.</b> Quando existir, o botão para mandar assinar fica aqui. Por enquanto, a assinatura é a de sempre, no protocolo.</span></div>
            ) : null}
          </section>
          {f.situacao === "APROVADA" && !f.revisor ? (
            <section className="folha pe-mini" aria-labelledby="t-pv2">
              <div className="folha-cab" style={{ paddingBottom: 8 }}><div><h2 id="t-pv2" style={{ fontSize: 20 }}>Como saiu</h2><p className="sub">O começo do arquivo</p></div></div>
              {f.previaEditada ? null : <LegendaPrevia />}
              <div className="pe-papel-folha"><Papel paragrafos={f.previa} resto={f.resto} timbre={f.caso.nome} marcas={!f.previaEditada} /></div>
            </section>
          ) : null}
        </div>
        <aside className="hn-col" aria-label="Versões">{lateral}</aside>
      </div>
    </div>
  );
}

/** A prévia com os comentários no lugar (ajuste pedido), sem os botões de comentar. */
function PapelComentado({ f, comentarios }: { f: FichaPeticao; comentarios: ComentarioPeticao[] }) {
  return (
    <div className="pe-papel">
      <div className="pe-timbre"><span>{f.caso.nome}</span><span>Rascunho · em revisão</span></div>
      {f.previa.map((p, i) => {
        const cs = comentarios.filter((c) => c.paragrafo === i + 1);
        const c = classeParagrafo(p, i);
        return (
          <Fragment key={i}>
            <div className={`pe-par${cs.length ? " pe-com-tem" : ""}`}><div className="pe-par-t"><p className={c} style={c === "pe-tit" ? { textAlign: "center" } : undefined}><TextoParagrafo p={p} marcas={!f.previaEditada} /></p></div></div>
            {cs.map((x) => <Comentario key={x.id} c={x} />)}
          </Fragment>
        );
      })}
      <p className="pe-mais"><Icone nome="doc" className="ico" /><span>{f.resto}</span></p>
    </div>
  );
}

// ------------------------------------------------------------------------- revisão (decisões 21, 22 e 27)

function Revisar({ f, eu, recarregar, aoDecidido }: { f: FichaPeticao; eu: string; recarregar: () => void; aoDecidido: (x: Feito) => void }) {
  const bx = useBaixar();
  const [aberto, setAberto] = useState<number | null>(null);
  const [texto, setTexto] = useState("");
  const [erroTexto, setErroTexto] = useState(false);
  const [dec, setDec] = useState<"APROVAR" | "AJUSTE" | "REPROVAR" | null>(null);
  const [geral, setGeral] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [passar, setPassar] = useState(false);
  const v = f.versoes.find((x) => x.numero === f.versaoAtual)!;
  const coms = f.comentarios.filter((c) => c.versao === f.versaoAtual);
  const pendentes = coms.filter((c) => !c.enviado && c.paragrafo);
  const gerou = f.geradoPor.nome;
  const comEdit = useRef<HTMLTextAreaElement>(null);
  const NOME_PAR = (i: number) => trechoCurto(f.previa[i]!.map((s) => s.texto).join(""), 60);

  useEffect(() => {
    if (aberto !== null) requestAnimationFrame(() => comEdit.current?.focus());
  }, [aberto]);

  async function guardarComentario(n: number) {
    if (!texto.trim()) return setErroTexto(true);
    const r = await chamarPortal<ComentarioPeticao>(`${API}/${f.id}/comentarios`, { metodo: "POST", corpo: { paragrafo: n, texto: texto.trim() } });
    if (!r.ok) return setFalha(textoDoErro(r.erro));
    setAberto(null);
    setTexto("");
    recarregar();
  }

  async function desfazer(c: ComentarioPeticao) {
    const r = await chamarPortal(`${API}/comentarios/${c.id}/desfazer`, { metodo: "POST", corpo: {} });
    if (!r.ok) return setFalha(textoDoErro(r.erro));
    recarregar();
  }

  async function decidir() {
    setErro(null);
    setFalha(null);
    if (!dec) return setErro("DECISAO_OBRIGATORIA");
    if (dec === "AJUSTE" && !geral.trim() && !pendentes.length) return setErro("COMENTARIO_OBRIGATORIO");
    if (dec === "REPROVAR" && !geral.trim()) return setErro("MOTIVO_OBRIGATORIO");
    setEnviando(true);
    const r = await chamarPortal<FichaPeticao>(`${API}/${f.id}/decisao`, { metodo: "POST", corpo: { decisao: dec, comentario: geral.trim() || null, versao: f.versaoAtual } });
    setEnviando(false);
    if (r.ok) {
      const pn = primeiroNome(gerou);
      return aoDecidido(dec === "APROVAR"
        ? { titulo: "Petição aprovada.", texto: `Ficou pronta e entrou nos documentos do caso. ${pn} foi avisada no sino.` }
        : dec === "AJUSTE" ? { titulo: `Ajuste pedido a ${pn}.`, texto: "Ela foi avisada no sino, com os seus comentários." }
        : { titulo: "Petição reprovada.", texto: `Ficou guardada com o motivo. ${pn} foi avisada no sino.` });
    }
    const m = r.erro.detalhes?.motivo;
    if (m === "VERSAO_DESATUALIZADA") {
      setFalha("Chegou uma versão nova enquanto você revisava. A página foi atualizada; confira antes de decidir.");
      return recarregar();
    }
    if (m === "COMENTARIO_OBRIGATORIO" || m === "MOTIVO_OBRIGATORIO") return setErro(String(m));
    setFalha(textoDoErro(r.erro));
  }

  useEffect(() => {
    if (erro && erro !== "DECISAO_OBRIGATORIA") requestAnimationFrame(() => document.getElementById("rv-com")?.focus());
    else if (erro) requestAnimationFrame(() => document.querySelector<HTMLInputElement>('input[name="rv-dec"]')?.focus());
  }, [erro]);

  const msgErro = erro === "COMENTARIO_OBRIGATORIO" ? `Para pedir ajuste, escreva o que precisa mudar, aqui ou num parágrafo da prévia.`
    : erro === "MOTIVO_OBRIGATORIO" ? "Para reprovar, escreva o motivo. Ele fica guardado com a petição." : null;
  const recado = v.recado;
  const papelDoGerador = f.geradoPor.id === f.caso.responsavel.id ? "Responsável pelo caso" : "Da equipe";

  return (
    <div className="hn">
      <CabPeticoes titulo="Revisar petição" sobre={`Petições · ${f.caso.nome}`} voltar={{ href: ROTAS_PETICOES.lista, nome: "Petições" }} />
      {falha ? <Aviso tom="urgencia" titulo="Não deu certo.">{falha}</Aviso> : null}
      <div className="hn-grade pe-grade-rev">
        <div className="hn-col">
          <section className="folha" aria-labelledby="t-pv">
            <div className="folha-cab" style={{ paddingBottom: 8 }}>
              <div><h2 id="t-pv">{f.modelo.nome} · versão {f.versaoAtual}</h2><p className="sub">{resumoCaso(f)}</p></div>
              <div className="acoes"><button className="btn btn-sec" type="button" onClick={() => void bx.peticao(f.id, f.versaoAtual)} disabled={!!bx.baixando}><Icone nome="baixar" className="ico" />Baixar a v{f.versaoAtual}</button></div>
            </div>
            {bx.falha ? <div style={{ padding: "0 24px 12px" }}><Aviso tom="urgencia" titulo="Não deu para baixar.">{bx.falha}</Aviso></div> : null}
            {f.previaEditada ? <p className="pe-leg">Prévia do .docx que {primeiroNome(gerou)} editou no Word. Os dados não aparecem marcados, porque o texto agora é o do arquivo.</p> : <LegendaPrevia />}
            <p className="pe-leg">Para comentar um trecho, use o botão ao lado do parágrafo. O comentário fica preso a ele.</p>
            <div className="pe-papel-folha">
              <div className="pe-papel pe-papel-com">
                <div className="pe-timbre"><span>{f.caso.nome}</span><span>Rascunho · em revisão</span></div>
                {f.previa.map((p, i) => {
                  const n = i + 1;
                  const cs = coms.filter((c) => c.paragrafo === n);
                  const c = classeParagrafo(p, i);
                  return (
                    <Fragment key={i}>
                      <div className={`pe-par${cs.length ? " pe-com-tem" : ""}`}>
                        <div className="pe-par-t"><p className={c} style={c === "pe-tit" ? { textAlign: "center" } : undefined}><TextoParagrafo p={p} marcas={!f.previaEditada} /></p></div>
                        <button className="btn btn-fantasma btn-compacto pe-cbt" type="button" title="Comentar este parágrafo" aria-expanded={aberto === n}
                          onClick={() => { setAberto(aberto === n ? null : n); setTexto(""); setErroTexto(false); }}>
                          <Icone nome="conversas" className="ico ico-s" /><span className="sr">Comentar o parágrafo {n}: {NOME_PAR(i)}</span>
                        </button>
                      </div>
                      {cs.map((x) => <Comentario key={x.id} c={x} aoDesfazer={!x.enviado && x.autor.nome === eu ? () => void desfazer(x) : undefined} />)}
                      {aberto === n ? (
                        <div className="pe-com-edit">
                          <label htmlFor={`rv-c${n}`}>Comentário sobre o parágrafo {n}</label>
                          <textarea ref={comEdit} className="entrada" id={`rv-c${n}`} style={{ minHeight: 72 }} maxLength={2000} value={texto}
                            onChange={(e) => { setTexto(e.target.value); setErroTexto(false); }} aria-invalid={erroTexto || undefined} aria-describedby={erroTexto ? `rv-c${n}-er` : undefined} />
                          {erroTexto ? <ErroCampo id={`rv-c${n}-er`}>Escreva o comentário, ou cancele.</ErroCampo> : null}
                          <div className="pe-com-pe">
                            <button className="btn btn-fantasma btn-compacto" type="button" onClick={() => setAberto(null)}>Cancelar</button>
                            <button className="btn btn-sec btn-compacto" type="button" onClick={() => void guardarComentario(n)}><Icone nome="check" className="ico ico-s" />Guardar comentário</button>
                          </div>
                        </div>
                      ) : null}
                    </Fragment>
                  );
                })}
                <p className="pe-mais"><Icone nome="doc" className="ico" /><span>{f.resto}</span></p>
              </div>
            </div>
          </section>
        </div>
        <aside className="hn-col" aria-label="Revisão">
          <section className="folha" aria-labelledby="t-rr">
            <div className="folha-cab" style={{ paddingBottom: 8 }}>
              <div><h2 id="t-rr" style={{ fontSize: 20 }}>Enviada por {v.enviadaPor.nome}</h2><p className="sub">{v.enviadaPor.id === f.geradoPor.id ? papelDoGerador : "Da equipe"} · {quando(v.enviadaEm)} · versão {v.numero}</p></div>
            </div>
            {recado ? <blockquote className="pe-recado">{recado}</blockquote> : null}
            {f.caso.prazo ? (() => {
              const u = urgenciaPrazo(f.caso.prazo.data, new Date().toISOString().slice(0, 10));
              return <p className="pe-prazo"><Selo tom={u.tom === "urgente" ? "urgente" : u.tom === "atencao" ? "atencao" : "neutro"} icone="alerta">Prazo do caso: {u.texto.toLowerCase()}</Selo><span>{f.caso.prazo.descricao}</span></p>;
            })() : null}
            <dl className="pe-resumo pe-dados-rev">
              <div><dt>Partes</dt><dd>{f.dados.partes.map((p) => p.nome).join(" · ") || "—"}</dd></div>
              <div><dt>Endereçamento</dt><dd>{f.dados.enderecamento}</dd></div>
              <div><dt>Quem assina</dt><dd>{f.dados.advogados.map((a) => `${a.nome} · ${a.frase}`).join("; ") || "—"}</dd></div>
              <div><dt>Modelo</dt><dd>{f.modelo.nome} · {f.modelo.padrao ? "padrão do T3jus" : `do escritório${f.modelo.versao ? ` v${f.modelo.versao}` : ""}`}{v.origem === "DOCX_EDITADO" ? ` · v${v.numero} editada no Word` : ""}</dd></div>
              {v.marcados.length ? <div><dt>Dados marcados</dt><dd><SeloDados n={v.marcados.length} /><small>{v.marcados.join(", ")}</small></dd></div> : null}
            </dl>
          </section>
          <Versoes f={f} />
          <section className="folha pe-decisao" aria-labelledby="t-dc">
            <div className="folha-cab" style={{ paddingBottom: 8 }}><div><h2 id="t-dc" style={{ fontSize: 20 }}>Sua decisão</h2><p className="sub">Versão {f.versaoAtual}</p></div></div>
            <form className="pe-dec-form" noValidate onSubmit={(e) => { e.preventDefault(); void decidir(); }}>
              {msgErro ? <Aviso tom="urgencia" titulo="A decisão não foi enviada."
                acoes={<ul><li><a href="#rv-com">{erro === "MOTIVO_OBRIGATORIO" ? "Falta o motivo que diz o que não serve." : "Falta o comentário que diz o que ajustar."}</a></li></ul>} /> : null}
              <fieldset className="pe-fs pe-dec-ops" aria-describedby={erro === "DECISAO_OBRIGATORIA" ? "rv-dec-er" : undefined}>
                <legend className="sr">Decisão</legend>
                {erro === "DECISAO_OBRIGATORIA" ? <ErroCampo id="rv-dec-er">Escolha: aprovar, pedir ajuste ou reprovar.</ErroCampo> : null}
                {([
                  ["APROVAR", "Aprovar", "Fica pronta para baixar e protocolar."],
                  ["AJUSTE", "Pedir ajuste", `Volta para ${primeiroNome(gerou)} com seus comentários. Ela manda a versão ${f.versaoAtual + 1}.`],
                  ["REPROVAR", "Reprovar", "Fica guardada como reprovada e não sai como pronta."],
                ] as const).map(([k, t, s]) => (
                  <label className="opcao" key={k}>
                    <input className="marcar" type="radio" name="rv-dec" checked={dec === k} onChange={() => { setDec(k); setErro(null); }} />
                    <span><strong style={{ fontWeight: 500 }}>{t}</strong><small>{s}</small></span>
                  </label>
                ))}
              </fieldset>
              <div className="campo">
                <label htmlFor="rv-com">{dec === "REPROVAR" ? "Motivo" : "Comentário geral"}</label>
                <textarea className="entrada" id="rv-com" style={{ minHeight: 96 }} maxLength={2000} value={geral} onChange={(e) => { setGeral(e.target.value); if (msgErro) setErro(null); }}
                  aria-invalid={!!msgErro || undefined} aria-describedby={descritoPor("rv-com-aj", msgErro && "rv-com-er")} />
                <p className="ajuda" id="rv-com-aj">Opcional ao aprovar. Para pedir ajuste, é obrigatório: aqui ou num parágrafo da prévia. Para reprovar, escreva o motivo.</p>
                {msgErro ? <ErroCampo id="rv-com-er">{msgErro}</ErroCampo> : null}
              </div>
              {pendentes.length ? <p className="ajuda">{contar(pendentes.length, "comentário de parágrafo vai", "comentários de parágrafo vão")} junto com a decisão.</p> : null}
              {dec === "APROVAR" && geral.trim() ? <p className="ajuda">{primeiroNome(gerou)} recebe o aviso com o seu comentário.</p> : null}
              <div className="form-pe pe-rodape">
                <button className="btn btn-pri" type="submit" disabled={enviando}>
                  <Icone nome={dec === "APROVAR" ? "check" : dec === "AJUSTE" ? "lapis" : dec === "REPROVAR" ? "xis" : "enviar"} className="ico" />
                  {enviando ? "Enviando…" : botaoDecisao(dec, f.versaoAtual, gerou)}
                </button>
              </div>
              {f.pode.passar ? (
                <p className="pe-passar"><a href="#passar" onClick={(e) => { e.preventDefault(); setPassar(true); }}><Icone nome="pessoas" className="ico ico-s" />Passar a revisão para outro advogado</a></p>
              ) : null}
            </form>
          </section>
        </aside>
      </div>
      {passar ? (
        <JanelaPassar f={f} aoFechar={() => setPassar(false)}
          aoFeito={(nome) => { setPassar(false); aoDecidido({ titulo: `Revisão passada para ${nome}.`, texto: `${primeiroNome(nome)} e ${primeiroNome(gerou)} foram avisados no sino.` }); }} />
      ) : null}
    </div>
  );
}

function JanelaPassar({ f, aoFechar, aoFeito }: { f: FichaPeticao; aoFechar: () => void; aoFeito: (nome: string) => void }) {
  const [lista, setLista] = useState<RevisorPossivel[] | null | "erro">(null);
  const [para, setPara] = useState("");
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  useEffect(() => {
    void chamarPortal<{ revisores: RevisorPossivel[] }>(`${API}/${f.id}/revisores`).then((r) => {
      setLista(r.ok ? r.dados.revisores : "erro");
      if (r.ok && r.dados.revisores[0]) setPara(r.dados.revisores[0].id);
    });
  }, [f.id]);
  const escolhido = lista && lista !== "erro" ? lista.find((x) => x.id === para) : null;
  async function enviar() {
    setFalha(null);
    if (!para) return setErro(true);
    setEnviando(true);
    const r = await chamarPortal<FichaPeticao>(`${API}/${f.id}/passar`, { metodo: "POST", corpo: { pessoaId: para, motivo: motivo.trim() || null } });
    setEnviando(false);
    if (r.ok) return aoFeito(escolhido?.nome ?? "outro advogado");
    setFalha(textoDoErro(r.erro));
  }
  const vazio = lista !== null && lista !== "erro" && !lista.length;
  return (
    <Janela id="janela-passar" aberta aoFechar={aoFechar} sobretitulo={`${f.modelo.nome} · ${f.caso.nome}`} titulo="Passar a revisão" descricao="ps-desc" aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-pri" type="submit" disabled={enviando || vazio || lista === null}><Icone nome="pessoas" className="ico" />{escolhido ? `Passar para ${primeiroNome(escolhido.nome)}` : "Passar"}</button>
        </>
      }>
      <p id="ps-desc" className="sr">Para quando você não consegue revisar a tempo.</p>
      {falha ? <Aviso tom="urgencia" titulo="A revisão não foi passada.">{falha}</Aviso> : null}
      {lista === "erro" ? <Aviso tom="urgencia" titulo="Não deu para carregar quem pode revisar.">Feche e tente de novo.</Aviso> : null}
      {vazio ? <Aviso tom="atencao" titulo="Ninguém mais pode revisar.">Só advogados com OAB na Equipe e com a área Jurídico podem receber a revisão.</Aviso> : null}
      <div className="form-folha" style={{ padding: 0 }}>
        <div className="campo c6">
          <label htmlFor="ps-para">Passar para</label>
          <select className="entrada" id="ps-para" value={para} onChange={(e) => { setPara(e.target.value); setErro(false); }} data-foco
            aria-invalid={erro || undefined} aria-describedby={descritoPor("ps-para-aj", erro && "ps-para-er")}>
            {lista === null ? <option value="">Carregando…</option> : null}
            {lista && lista !== "erro" ? lista.map((p) => <option key={p.id} value={p.id}>{p.nome} · {p.frase}</option>) : null}
          </select>
          <p className="ajuda" id="ps-para-aj">Só aparecem advogados com OAB e com a área Jurídico.</p>
          {erro ? <ErroCampo id="ps-para-er">Escolha para quem passar.</ErroCampo> : null}
        </div>
        <div className="campo c6">
          <label htmlFor="ps-mot">Por quê<span className="opcional"> (opcional)</span></label>
          <textarea className="entrada" id="ps-mot" style={{ minHeight: 72 }} maxLength={300} value={motivo} onChange={(e) => setMotivo(e.target.value)} aria-describedby="ps-mot-aj" />
          <p className="ajuda" id="ps-mot-aj">Vai no aviso e fica no histórico da petição.</p>
        </div>
        <p className="pt-comuns c6"><Icone nome="historico" className="ico" /><span>Você continua no caso como antes. Só a revisão desta petição muda de mãos; {primeiroNome(f.geradoPor.nome)} é avisada.</span></p>
      </div>
    </Janela>
  );
}

// ------------------------------------------------------------------------- a página

function PeticaoConteudo({ id, escritorio, aoNome }: { id: string; escritorio: EscritorioPortal; aoNome: (n: string) => void }) {
  const { f, recarregar } = useFicha(id);
  const [feito, setFeito] = useState<Feito | null>(null);
  const [gerada, setGerada] = useState(false);
  useEffect(() => {
    if (f && f !== "erro" && f !== "nao") aoNome(f.modelo.nome);
  }, [f, aoNome]);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const g = q.get("gerada");
    const v = q.get("versao");
    if (!g && !v) return;
    window.history.replaceState(null, "", window.location.pathname);
    void Promise.resolve().then(() => {
      setGerada(true);
      setFeito(v ? { titulo: `Versão ${v} enviada.`, texto: "Quem revisa foi avisado no sino." } : null);
    });
  }, []);
  useEffect(() => {
    if (!gerada || !f || f === "erro" || f === "nao" || feito) return;
    const t: Feito = f.situacao === "REVISAO" ? { titulo: `Enviada para revisão de ${f.revisor?.nome ?? "quem revisa"}.`, texto: "O aviso chegou no sino." }
      : f.situacao === "RASCUNHO" ? { titulo: "Guardada como rascunho.", texto: "Ela fica em Petições até você enviar para a revisão." }
      : { titulo: "Petição gerada.", texto: `Ficou em Petições e nos documentos do caso ${f.caso.nome}.` };
    void Promise.resolve().then(() => setFeito(t));
  }, [gerada, f, feito]);

  if (f === "erro") return <ErroAoCarregar oque="a petição" aoTentar={recarregar} />;
  if (f === "nao") return <ErroAoCarregar oque="a petição" aoTentar={recarregar} texto="Ela não existe ou é de outro escritório. Volte para Petições e abra de novo." />;
  if (!f) return <Carregando rotulo="Carregando a petição…" linhas={4} />;
  const eu = escritorio.pessoa;
  return (
    <>
      {f.pode.revisar
        ? <Revisar f={f} eu={eu} recarregar={recarregar} aoDecidido={(x) => { setFeito(x); recarregar(); }} />
        : <Resultado f={f} eu={eu} gerada={gerada} recarregar={() => { setFeito({ titulo: "Enviada para revisão.", texto: "O aviso chegou no sino." }); recarregar(); }} />}
      {feito ? <Toast feito={feito} aoFechar={() => setFeito(null)} /> : null}
    </>
  );
}

export function PeticaoPortal({ id }: { id: string }) {
  const [nome, setNome] = useState("Petição");
  const aoNome = useCallback((n: string) => setNome(n), []);
  return (
    <MolduraArea area="JURIDICO" secao="peticoes" trilha={[{ nome }]}>
      {(e) => <PeticaoConteudo id={id} escritorio={e} aoNome={aoNome} />}
    </MolduraArea>
  );
}

// ------------------------------------------------------------------------- versão nova (decisão 23)

function VersaoConteudo({ id }: { id: string }) {
  const { f, recarregar } = useFicha(id);
  const [como, setComo] = useState<"DOCX" | "DADOS">("DOCX");
  const [etapa, setEtapa] = useState<"escolher" | "enviar">("escolher");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [faltas, setFaltas] = useState<number | null>(null);
  const [erroArq, setErroArq] = useState<string | null>(null);
  const [resolvidos, setResolvidos] = useState<string[] | null>(null);
  const [recado, setRecado] = useState("");
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [dados, setDados] = useState<DadosPeticao | null>(null);
  const [campos, setCampos] = useState<string[] | null>(null);
  const [form, setForm] = useState<FormPeticao | null>(null);
  const [errosForm, setErrosForm] = useState<Record<string, string>>({});
  const entrada = useRef<HTMLInputElement>(null);
  const bx = useBaixar();

  const ficha = f && f !== "erro" && f !== "nao" ? f : null;
  const coms = ficha ? ficha.comentarios.filter((c) => c.versao === ficha.versaoAtual && c.enviado) : [];
  const marcados = resolvidos ?? coms.map((c) => c.id);

  useEffect(() => {
    if (!ficha || como !== "DADOS" || etapa !== "enviar" || dados) return;
    void Promise.all([
      chamarPortal<DadosPeticao>(`${API}/casos/${ficha.caso.id}/dados`),
      chamarPortal<ListaModelos>(`${API}/modelos`),
    ]).then(([d, m]) => {
      if (!d.ok) return setFalha(textoDoErro(d.erro));
      const mod = m.ok ? m.dados.modelos.find((x) => x.id === ficha.modelo.id || x.substitui === ficha.modelo.id) : null;
      const cs = mod?.campos ?? (m.ok ? m.dados.campos.map((c) => c.campo) : []);
      setCampos(cs);
      setDados(d.dados);
      const escolhidos: Record<string, string[]> = {};
      for (const a of d.dados.advogados) if (ficha.dados.advogados.some((x) => x.pessoaId === a.pessoaId)) escolhidos[a.pessoaId] = a.inscricoes.map((i) => i.id);
      setForm({
        partes: ficha.dados.partes.map((p) => p.id).filter((x) => d.dados.clientes.some((c) => c.id === x)),
        escolhidos,
        enderecamento: ficha.dados.enderecamento,
        numero: ficha.dados.numero && !d.dados.caso.numero ? ficha.dados.numero : "",
        gravarNumero: false,
        valor: ficha.dados.valorCausa ? (ficha.dados.valorCausa / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "",
        qualif: d.dados.caso.parteContrariaQualificacao ?? "",
        cidadeData: ficha.dados.cidadeData,
      });
    });
  }, [ficha, como, etapa, dados]);

  if (f === "erro") return <ErroAoCarregar oque="a petição" aoTentar={recarregar} />;
  if (f === "nao") return <ErroAoCarregar oque="a petição" aoTentar={recarregar} texto="Ela não existe ou é de outro escritório." />;
  if (!ficha) return <Carregando rotulo="Carregando a petição…" linhas={4} />;
  const prox = ficha.versaoAtual + 1;
  const revisor = ficha.revisor;
  const voltar = { href: ROTAS_PETICOES.peticao(ficha.id), nome: ficha.modelo.nome };
  if (!ficha.pode.novaVersao) {
    return (
      <div className="hn">
        <CabPeticoes titulo={`Enviar a versão ${prox}`} sobre={`Petições · ${ficha.caso.nome}`} voltar={voltar} />
        <Aviso tom="atencao" titulo="Esta petição não espera uma versão nova.">Ela está como “{SELO_PETICAO[ficha.situacao].texto}”. Só quem gerou, ou a sócia dona, manda a versão nova, e só depois de um pedido de ajuste.</Aviso>
      </div>
    );
  }

  async function escolher(file: File | undefined) {
    if (!file) return;
    setArquivo(file);
    setErroArq(null);
    setFaltas(null);
    if (file.size > 5 * 1024 * 1024) return setErroArq(erroDoArquivo("ARQUIVO_GRANDE"));
    try {
      const r = await conferirDocx(new Uint8Array(await file.arrayBuffer()));
      setFaltas(r.faltas.length);
    } catch (e) {
      setErroArq(erroDoArquivo(e instanceof ErroDocx ? e.motivo : (e as { motivo?: string }).motivo ?? "ARQUIVO_INVALIDO"));
    }
  }

  async function enviarDocx() {
    setFalha(null);
    if (!arquivo || erroArq) {
      if (!arquivo) setErroArq("Escolha o .docx editado.");
      return requestAnimationFrame(() => document.getElementById("v2-arq-bt")?.focus());
    }
    const q = new URLSearchParams();
    if (recado.trim()) q.set("recado", recado.trim());
    if (marcados.length) q.set("resolvidos", marcados.join(","));
    setEnviando(true);
    const r = await chamarPortal<ResultadoGerar>(`${API}/${ficha!.id}/versoes/docx?${q}`, { bruto: arquivo });
    setEnviando(false);
    if (r.ok) return irPara(`${ROTAS_PETICOES.peticao(ficha!.id)}?versao=${r.dados.versao}`);
    if (r.erro.detalhes?.motivo && /^(ARQUIVO|ZIP)/.test(String(r.erro.detalhes.motivo))) return setErroArq(erroDoArquivo(r.erro.detalhes.motivo));
    setFalha(textoDoErro(r.erro));
  }

  async function enviarDados() {
    if (!dados || !form || !campos) return;
    const e = errosDoForm(form, dados, campos);
    setErrosForm(e);
    if (Object.keys(e).length) return requestAnimationFrame(() => document.querySelector<HTMLElement>(".hn-resumo-erros a")?.focus());
    setFalha(null);
    setEnviando(true);
    const r = await chamarPortal<ResultadoGerar>(`${API}/${ficha!.id}/versoes`, {
      metodo: "POST", corpo: { ...corpoDoForm(form, dados, campos), resolvidos: marcados, recado: recado.trim() || null },
    });
    setEnviando(false);
    if (r.ok) return irPara(`${ROTAS_PETICOES.peticao(ficha!.id)}?versao=${r.dados.versao}`);
    const m = motivosDoErro(r.erro);
    if (m) return setErrosForm(m);
    setFalha(textoDoErro(r.erro));
  }

  const listaComentarios = coms.length ? (
    <fieldset className="pe-fs c6">
      <legend>Os comentários de {revisor ? primeiroNome(revisor.nome) : "quem revisou"}</legend>
      {coms.map((c) => (
        <label className="opcao" key={c.id}>
          <input className="marcar" type="checkbox" checked={marcados.includes(c.id)}
            onChange={(e) => setResolvidos(e.target.checked ? [...marcados, c.id] : marcados.filter((x) => x !== c.id))} />
          <span><strong style={{ fontWeight: 500 }}>{c.paragrafo ? `Parágrafo ${c.paragrafo}` : "Comentário geral"}: {trechoCurto(c.texto, 70)}</strong><small>Marcar como resolvido</small></span>
        </label>
      ))}
    </fieldset>
  ) : null;
  const campoRecado = (
    <div className="campo c6">
      <label htmlFor="v2-rec">Recado{revisor ? ` para ${primeiroNome(revisor.nome)}` : ""}<span className="opcional"> (opcional)</span></label>
      <textarea className="entrada" id="v2-rec" style={{ minHeight: 72 }} maxLength={1000} value={recado} onChange={(e) => setRecado(e.target.value)} />
    </div>
  );
  const lateral = <aside className="hn-col" aria-label="Versões"><Versoes f={ficha} /></aside>;

  if (etapa === "escolher") {
    return (
      <div className="hn">
        <CabPeticoes titulo={`Corrigir e reenviar`} sobre={`Petições · ${ficha.caso.nome}`} voltar={voltar} />
        <div className="hn-grade">
          <div className="hn-col">
            <section className="folha" aria-labelledby="t-cr">
              <div className="folha-cab" style={{ paddingBottom: 8 }}><div><h2 id="t-cr">Como corrigir</h2><p className="sub">Vai como versão {prox}, para {revisor ? revisor.nome : "quem revisou"} de novo</p></div></div>
              <form className="pe-dec-form" noValidate onSubmit={(e) => { e.preventDefault(); setEtapa("enviar"); }}>
                <fieldset className="pe-fs pe-dec-ops">
                  <legend className="sr">Como corrigir</legend>
                  <label className="opcao"><input className="marcar" type="radio" name="aj-como" checked={como === "DADOS"} onChange={() => setComo("DADOS")} />
                    <span><strong style={{ fontWeight: 500 }}>Refazer pelos dados</strong><small>Volta ao formulário com tudo preenchido. Serve para dado do cadastro, como o endereço.</small></span></label>
                  <label className="opcao"><input className="marcar" type="radio" name="aj-como" checked={como === "DOCX"} onChange={() => setComo("DOCX")} />
                    <span><strong style={{ fontWeight: 500 }}>Enviar o .docx editado no Word</strong><small>Baixe a v{ficha.versaoAtual}, edite e envie. Serve para mudança no texto.</small></span></label>
                </fieldset>
                {bx.falha ? <Aviso tom="urgencia" titulo="Não deu para baixar.">{bx.falha}</Aviso> : null}
                <div className="form-pe pe-rodape">
                  <button className="btn btn-sec" type="button" onClick={() => void bx.peticao(ficha.id, ficha.versaoAtual)} disabled={!!bx.baixando}><Icone nome="baixar" className="ico" />Baixar a v{ficha.versaoAtual}</button>
                  <button className="btn btn-pri" type="submit">Continuar<Icone nome="dir" className="ico" /></button>
                </div>
              </form>
            </section>
          </div>
          {lateral}
        </div>
      </div>
    );
  }

  if (como === "DADOS") {
    return (
      <div className="hn">
        <CabPeticoes titulo={`Enviar a versão ${prox}`} sobre={`Petições · ${ficha.caso.nome}`} voltar={voltar} />
        {falha ? <Aviso tom="urgencia" titulo="A versão não foi enviada.">{falha}</Aviso> : null}
        <div className="hn-grade">
          <div className="hn-col">
            {dados && form && campos ? (
              <FormDados d={dados} modelo={{ nome: ficha.modelo.nome, campos }} f={form} mudar={(x) => setForm({ ...form, ...x })} erros={errosForm} ocupado={enviando}
                aoVoltar={() => setEtapa("escolher")} aoContinuar={() => void enviarDados()} rotuloContinuar={`Enviar a v${prox}${revisor ? ` para ${revisor.nome}` : ""}`} />
            ) : <Carregando rotulo="Carregando os dados do caso…" linhas={4} />}
            <section className="folha" aria-labelledby="t-v2c">
              <div className="folha-cab" style={{ paddingBottom: 8 }}><div><h2 id="t-v2c" style={{ fontSize: 20 }}>Junto com a versão {prox}</h2><p className="sub">A v{ficha.versaoAtual} e os comentários ficam guardados no histórico.</p></div></div>
              <div className="form-folha">{listaComentarios}{campoRecado}</div>
            </section>
          </div>
          {lateral}
        </div>
      </div>
    );
  }

  return (
    <div className="hn">
      <CabPeticoes titulo={`Enviar a versão ${prox}`} sobre={`Petições · ${ficha.caso.nome}`} voltar={voltar} />
      <div className="hn-grade">
        <div className="hn-col">
          <section className="folha" aria-labelledby="t-v2">
            <div className="folha-cab"><div><h2 id="t-v2">Versão {prox}</h2><p className="sub">A v{ficha.versaoAtual} e os comentários ficam guardados no histórico.</p></div></div>
            <form className="form-folha" noValidate onSubmit={(e) => { e.preventDefault(); void enviarDocx(); }}>
              {falha ? <div className="c6"><Aviso tom="urgencia" titulo="A versão não foi enviada.">{falha}</Aviso></div> : null}
              <div className="campo c6">
                <p className="pe-rot" id="v2-arq-r">Arquivo editado</p>
                <input ref={entrada} type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="sr" tabIndex={-1} aria-hidden="true"
                  onChange={(e) => { void escolher(e.target.files?.[0]); e.target.value = ""; }} />
                <div className={erroArq ? "pe-arq erro" : "pe-arq"} role="group" aria-labelledby="v2-arq-r">
                  <span className="pe-ci" aria-hidden="true"><Icone nome="doc" className="ico" /></span>
                  <div>
                    <b>{arquivo ? arquivo.name : "Nenhum arquivo escolhido"}</b>
                    <small>{arquivo ? `${tamanhoArquivo(arquivo.size)}${faltas === null ? "" : faltas ? ` · conferido agora: ${contar(faltas, "dado ainda marcado", "dados ainda marcados")} como falta` : " · conferido agora: nenhum dado marcado como falta"}` : `O .docx da v${ficha.versaoAtual}, editado no Word`}</small>
                  </div>
                  <button id="v2-arq-bt" className="btn btn-sec btn-compacto" type="button" onClick={() => entrada.current?.click()} data-foco autoFocus aria-describedby={erroArq ? "v2-arq-er" : undefined}>
                    <Icone nome="enviar" className="ico ico-s" />{arquivo ? "Trocar arquivo" : "Escolher arquivo"}
                  </button>
                </div>
                {erroArq ? <ErroCampo id="v2-arq-er">{erroArq}</ErroCampo> : faltas ? (
                  <Aviso tom="atencao" icone="pena" titulo={`Ainda há ${contar(faltas, "dado marcado", "dados marcados")} como falta no texto.`}>Dá para enviar assim; quem revisa vê em destaque.</Aviso>
                ) : <p className="ajuda">Só .docx, até 5 MB. Se ainda houver algo como [RG: falta] no texto, avisamos antes de enviar.</p>}
              </div>
              {listaComentarios}
              {campoRecado}
              <div className="form-pe pe-rodape">
                <button className="btn btn-fantasma" type="button" onClick={() => setEtapa("escolher")}><Icone nome="esquerda" className="ico" />Voltar</button>
                <button className="btn btn-pri" type="submit" disabled={enviando}><Icone nome="enviar" className="ico" />{enviando ? "Enviando…" : `Enviar a v${prox}${revisor ? ` para ${revisor.nome}` : ""}`}</button>
              </div>
            </form>
          </section>
        </div>
        {lateral}
      </div>
    </div>
  );
}

export function VersaoPeticaoPortal({ id }: { id: string }) {
  return (
    <MolduraArea area="JURIDICO" secao="peticoes" trilha={[{ nome: "Versão nova" }]}>
      {() => <VersaoConteudo id={id} />}
    </MolduraArea>
  );
}

