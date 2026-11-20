"use client";
// Jurídico › Petições (EX-09), desenho aprovado em docs/design/aprovadas/portal-peticoes
// (estados peticoes, aviso-revisao, peticoes-vazio, modelos, modelo-enviar, modelo-erro,
// nova-caso, nova-modelo, nova-dados, nova-erro, nova-previa, nova-dados-larissa, nova-faltas e
// revisao-enviar): a lista com a situação de cada petição, os modelos com a conferência do .docx
// assim que chega e a nova petição em 4 passos (caso, modelo, dados da peça, prévia). Sem IA: o
// texto é o do escritório e o T3jus só troca os campos entre colchetes. A página de cada petição
// (resultado e revisão) está em PeticaoPagina.tsx.

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import {
  AREAS_DIREITO, AREAS_MODELO, campoConhecido, CAMPOS_PETICAO, cidadeDataPadrao, enderecamentoSugerido, faltasDoCliente, formatarCnj, reais, TIPOS_PECA,
  type AreaModelo, type CampoPeticao, type ConferenciaModelo, type DadosPeticao, type LinhaCaso, type LinhaPeticao, type ListaCasos, type ListaModelos,
  type ListaPeticoes, type ModeloPeticao, type ParagrafoPrevia, type PreviaPeticao, type ResultadoGerar, type SituacaoPeticao, type TipoPeca,
} from "@t3jus/domain";
import { textoDoErro, type ErroApi } from "../api.ts";
import { Icone } from "../Icone.tsx";
import { Aviso, Carregando, descritoPor, ErroAoCarregar, ErroCampo, Estado, focarPrimeiroErro, Janela } from "../console/pecas.tsx";
import { iniciais } from "../console/tempo.ts";
import { Busca, Chips, Selo, useCarga } from "./Comercial.tsx";
import { Toast } from "./FichaCliente.tsx";
import { centavos as lerCentavos } from "./honorarios.ts";
import {
  botaoFinal, contar, detalheSituacao, ERROS_PETICAO, erroDoArquivo, escolhaPadrao, fraseNoDocumento, frasePulaRevisao, gruposDeModelos,
  linhaVersaoModelo, modelosParaCaso, papelAdvogado, primeiroNome, quando, quemAssina, RESUMO_ERRO, ROTAS_PETICOES, SELO_PETICAO, tamanhoArquivo,
  textoMarcados, usado,
} from "./peticoes.ts";
import { chamarPortal, irPara, type EscritorioPortal } from "./Moldura.tsx";
import { MolduraArea } from "./MolduraArea.tsx";

type Feito = { titulo: string; texto: string };
const API = "/v1/escritorio/peticoes";

// ------------------------------------------------------------------------- peças comuns

export function CabPeticoes({ titulo, sobre = "Jurídico", lede, acoes, voltar }: {
  titulo: string; sobre?: string; lede?: string; acoes?: ReactNode; voltar?: { href: string; nome: string };
}) {
  return (
    <div className="pt-cab">
      <div>
        {voltar ? <a className="pe-voltar" href={voltar.href}><Icone nome="esquerda" className="ico ico-s" />{voltar.nome}</a> : null}
        <p className="sobretitulo">{sobre}</p>
        <h1>{titulo}</h1>
        <span className="fio" aria-hidden="true" />
        {lede ? <p className="lede">{lede}</p> : null}
      </div>
      {acoes ? <div className="pe-cab-acoes">{acoes}</div> : null}
    </div>
  );
}

export function SeloPeticao({ s }: { s: SituacaoPeticao }) {
  const x = SELO_PETICAO[s];
  return <Selo tom={x.tom} icone={x.icone}>{x.texto}</Selo>;
}

export function SeloDados({ n }: { n: number }) {
  return n
    ? <Selo tom="atencao" icone="pena">{textoMarcados(n)}<span className="sr"> para completar</span></Selo>
    : <Selo tom="ok" icone="check">Completa</Selo>;
}

function Pessoa({ nome }: { nome: string }) {
  return <span className="jr-resp"><span className="av-p" aria-hidden="true">{iniciais(nome)}</span>{nome}</span>;
}

/** Baixar um .docx: pede o link temporário (PT-07) e abre. Fora da aprovada, sai com a marca de rascunho. */
export function useBaixar() {
  const [baixando, setBaixando] = useState<string | null>(null);
  const [falha, setFalha] = useState<string | null>(null);
  async function baixar(caminho: string) {
    setFalha(null);
    setBaixando(caminho);
    const r = await chamarPortal<{ url: string }>(caminho, { metodo: "POST", corpo: {} });
    setBaixando(null);
    if (!r.ok) return setFalha(textoDoErro(r.erro));
    window.location.assign(r.dados.url);
  }
  return { baixar, baixando, falha, peticao: (id: string, versao?: number) => baixar(`${API}/${id}/abrir${versao ? `?versao=${versao}` : ""}`) };
}

/** A legenda das marcas da prévia (decisão 10): traço, pontilhado e caixa, não só cor. */
export function LegendaPrevia() {
  return (
    <>
      <p className="pe-leg" aria-hidden="true">
        <span><i style={{ background: "var(--sal-2)", boxShadow: "inset 0 -2px 0 var(--vinho-4)" }} />do cadastro (traço)</span>
        <span><i style={{ background: "#FCF8F5", borderBottom: "2px dotted var(--vinho-2)" }} />deste formulário (pontilhado)</span>
        <span><i style={{ background: "var(--ambar-3)", boxShadow: "inset 0 0 0 1px var(--vinho-3)" }} />falta: completar no Word</span>
      </p>
      <p className="sr">Na prévia, os dados preenchidos vêm marcados. Os que faltam aparecem entre colchetes, com a palavra falta.</p>
    </>
  );
}

/** Um parágrafo da prévia, com as marcas de origem. */
export function TextoParagrafo({ p, marcas = true }: { p: ParagrafoPrevia; marcas?: boolean }) {
  return (
    <>
      {p.map((s, i) => {
        const linhas = s.texto.split("\n").map((l, j) => <Fragment key={j}>{j ? <br /> : null}{l}</Fragment>);
        if (s.t === "falta" || s.t === "desconhecido") return <mark key={i} className="pe-falta">{linhas}</mark>;
        if (!marcas || s.t === "fixo") return <Fragment key={i}>{linhas}</Fragment>;
        return <mark key={i} className={s.t === "formulario" ? "pe-f" : undefined}>{linhas}</mark>;
      })}
    </>
  );
}

/** A classe do parágrafo na prévia: o título da peça centrado; a assinatura também. */
export function classeParagrafo(p: ParagrafoPrevia, i: number): string | undefined {
  const t = p.map((s) => s.texto).join("").trim();
  if (i === 0 && /^excelent/i.test(t)) return "pe-end";
  if (/\n/.test(t) && /OAB\//.test(t)) return "pe-ass";
  if (t.length <= 60 && t === t.toUpperCase() && /[A-ZÁ-Ú]{4}/.test(t)) return "pe-tit";
  if (/^processo n/i.test(t)) return "pe-proc";
  return undefined;
}

/** A prévia em papel timbrado (decisão 10), o mesmo desenho de Contratos. */
export function Papel({ paragrafos, resto, timbre, marcas = true, rascunho = false }: {
  paragrafos: ParagrafoPrevia[]; resto: string; timbre: string; marcas?: boolean; rascunho?: boolean;
}) {
  return (
    <div className="pe-papel">
      <div className="pe-timbre"><span>{timbre}</span><span>{rascunho ? "Rascunho · em revisão" : "Advocacia"}</span></div>
      {paragrafos.map((p, i) => {
        const c = classeParagrafo(p, i);
        return <p key={i} className={c} style={c === "pe-tit" ? { textAlign: "center" } : undefined}><TextoParagrafo p={p} marcas={marcas} /></p>;
      })}
      <p className="pe-mais"><Icone nome="doc" className="ico" /><span>{resto}</span></p>
    </div>
  );
}

const EXPLICA_LISTA = (
  <section className="explica campo-ambar" aria-labelledby="t-expe">
    <p className="sobretitulo">Como funciona</p>
    <h2 id="t-expe">O texto é do escritório. Os dados, do cadastro.</h2>
    <ul>
      <li><Icone nome="doc" className="ico" /><span>Cada petição parte de um modelo do escritório, em Word, com campos entre colchetes como [PARTES_QUALIFICACAO] e [ADVOGADOS_OAB].</span></li>
      <li><Icone nome="pessoas" className="ico" /><span>A qualificação dos clientes, os dados do processo e a OAB dos advogados vêm do caso, da ficha do cliente e da Equipe.</span></li>
      <li><Icone nome="lapis" className="ico" /><span>Um formulário curto pede o resto: para quem vai a petição, quem assina e o que muda só desta vez.</span></li>
      <li><Icone nome="balanca" className="ico" /><span>Sai um .docx para revisar no Word. O T3jus não escreve a tese, não revisa o conteúdo jurídico e não protocola.</span></li>
    </ul>
  </section>
);

const EXPLICA_DADOS = (
  <section className="explica campo-ambar" aria-labelledby="t-exd">
    <p className="sobretitulo">De onde vêm os dados</p>
    <h2 id="t-exd">Você escolhe; o resto já está no T3jus.</h2>
    <ul>
      <li><Icone nome="pessoas" className="ico" /><span><b>Dos clientes:</b> nome, nacionalidade, estado civil, profissão, RG, CPF e endereço, da ficha de cada um.</span></li>
      <li><Icone nome="balanca" className="ico" /><span><b>Do caso:</b> número, vara, tribunal, parte contrária e valor da causa.</span></li>
      <li><Icone nome="cracha" className="ico" /><span><b>Da Equipe:</b> nome e OAB de quem assina.</span></li>
      <li><Icone nome="lapis" className="ico" /><span><b>De você:</b> o endereçamento e o que mudar só nesta petição.</span></li>
    </ul>
  </section>
);

function AcoesLista() {
  return (
    <>
      <a className="btn btn-sec" href={ROTAS_PETICOES.modelos}><Icone nome="doc" className="ico" />Modelos de petição</a>
      <a data-muda className="btn btn-pri" href={ROTAS_PETICOES.nova()}><Icone nome="mais" className="ico" />Nova petição</a>
    </>
  );
}

const LEDE_LISTA = "As petições feitas a partir dos modelos do escritório, já com os dados do cliente, do caso e dos advogados.";

// ------------------------------------------------------------------------- 1. lista

type Visao = "TODAS" | "MINHAS" | "REVISAR";

function ListaConteudo() {
  const inicial = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("ver") === "revisar" ? "REVISAR" : "TODAS";
  const [visao, setVisao] = useState<Visao>(inicial);
  const [busca, setBusca] = useState("");
  const [q, setQ] = useState("");
  const [sit, setSit] = useState<SituacaoPeticao | "">("");
  useEffect(() => {
    const t = setTimeout(() => setQ(busca.trim()), 250);
    return () => clearTimeout(t);
  }, [busca]);
  const f = new URLSearchParams({ visao });
  if (q) f.set("q", q);
  const { dados, recarregar } = useCarga<ListaPeticoes>(`${API}?${f}`);
  const bx = useBaixar();
  const cab = <CabPeticoes titulo="Petições" lede={LEDE_LISTA} acoes={<AcoesLista />} />;

  if (dados === "erro") return <div className="hn">{cab}<ErroAoCarregar oque="as petições" aoTentar={recarregar} /></div>;
  if (!dados) return <div className="hn">{cab}<Carregando rotulo="Carregando as petições…" linhas={4} /></div>;
  if (!dados.peticoes.length && visao === "TODAS" && !q) {
    return (
      <div className="hn">
        {cab}
        <div className="hn-grade">
          <div className="hn-col">
            <section className="folha" aria-label="Petições geradas" style={{ overflow: "hidden" }}>
              <Estado icone="pena" titulo="Nenhuma petição gerada ainda" nivel={2}
                acoes={
                  <>
                    <a className="btn btn-sec" href={ROTAS_PETICOES.modelos}><Icone nome="doc" className="ico" />Ver os modelos</a>
                    <a className="btn btn-pri" href={ROTAS_PETICOES.nova()}><Icone nome="mais" className="ico" />Gerar a primeira</a>
                  </>
                }>
                Aqui ficam as petições geradas pelo escritório, com o caso e quem gerou. Dois passos para começar:
              </Estado>
              <ol className="pe-inicio" style={{ margin: "-8px auto 28px", padding: "0 24px" }}>
                <li><span className="disco"><span>1</span></span><span><b>Confira os modelos</b><small>Já vêm 8 modelos padrão do T3jus. Troque pelos do escritório: um .docx com os campos entre colchetes.</small></span></li>
                <li><span className="disco"><span>2</span></span><span><b>Gere a primeira petição</b><small>Escolha o caso e o modelo. Também dá para começar pela ficha do caso, em “Gerar petição”.</small></span></li>
              </ol>
            </section>
          </div>
          <aside className="hn-col" aria-label="Como funcionam as petições">{EXPLICA_LISTA}</aside>
        </div>
      </div>
    );
  }
  const lista = sit ? dados.peticoes.filter((p) => p.situacao === sit) : dados.peticoes;
  const emRevisao = dados.peticoes.filter((p) => p.situacao === "REVISAO").length;
  const sub = visao === "REVISAR"
    ? `${contar(lista.length, "esperando", "esperando")} a sua revisão`
    : `${contar(lista.length, "petição", "petições")}${emRevisao ? ` · ${emRevisao} em revisão` : ""} · da mais nova para a mais antiga`;

  return (
    <div className="hn">
      {cab}
      <div className="hn-grade">
        <div className="hn-col">
          <section className="folha" aria-labelledby="t-pl" style={{ overflow: "hidden" }}>
            <div className="folha-cab">
              <div>
                <h2 id="t-pl">Petições</h2>
                <p className="sub" role="status">{sub}</p>
              </div>
            </div>
            <Busca id="pe-busca" rotulo="Buscar por caso, cliente ou modelo" dica="Caso, cliente ou modelo" valor={busca} aoMudar={setBusca}>
              <label className="sr" htmlFor="pe-f-sit">Situação</label>
              <select className="entrada" id="pe-f-sit" value={sit} onChange={(e) => setSit(e.target.value as SituacaoPeticao | "")} style={{ maxWidth: 200 }}>
                <option value="">Todas as situações</option>
                {(Object.keys(SELO_PETICAO) as SituacaoPeticao[]).map((s) => <option key={s} value={s}>{SELO_PETICAO[s].texto}</option>)}
              </select>
              <Chips rotulo="Mostrar" atual={visao} aoEscolher={(v) => setVisao(v as Visao)}
                opcoes={[{ v: "TODAS", t: "Todas" }, { v: "MINHAS", t: "Minhas" }, { v: "REVISAR", t: `Para eu revisar (${dados.paraRevisar})` }]} />
            </Busca>
            {bx.falha ? <div style={{ padding: "0 24px 12px" }}><Aviso tom="urgencia" titulo="Não deu para baixar.">{bx.falha}</Aviso></div> : null}
            {lista.length ? (
              <table className="hn-tab pe-tab">
                <caption className="sr">Petições</caption>
                <colgroup>{["33%", "19%", "17%", "31%"].map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
                <thead><tr>{["Petição e arquivo", "Caso", "Gerada por", "Situação"].map((x) => <th key={x} scope="col">{x}</th>)}</tr></thead>
                <tbody>{lista.map((p) => <LinhaLista key={p.id} p={p} aoBaixar={() => void bx.peticao(p.id)} baixando={bx.baixando?.includes(p.id) ?? false} />)}</tbody>
              </table>
            ) : (
              <Estado icone="busca" titulo={visao === "REVISAR" ? "Nada esperando a sua revisão" : "Nenhuma petição encontrada"}>
                {visao === "REVISAR" ? "Quando alguém mandar uma petição para você revisar, ela aparece aqui e no sino." : "Confira o caso, o cliente ou o modelo, ou limpe os filtros."}
              </Estado>
            )}
            <p className="hn-pe">
              <Icone nome="cadeado" className="ico" />
              <span>Só a aprovada sai pronta. Quem gera sem ser o responsável pelo caso manda para a revisão dele; a petição gerada pelo próprio responsável, ou pela sócia dona, já sai aprovada. Nada é apagado: reprovadas e versões antigas ficam guardadas.</span>
            </p>
          </section>
        </div>
        <aside className="hn-col" aria-label="Sobre as petições">{EXPLICA_LISTA}</aside>
      </div>
    </div>
  );
}

function LinhaLista({ p, aoBaixar, baixando }: { p: LinhaPeticao; aoBaixar: () => void; baixando: boolean }) {
  const href = ROTAS_PETICOES.peticao(p.id);
  const nome = `${p.modelo}, ${p.caso.nome}`;
  return (
    <tr className={p.paraMim ? "pe-nova" : undefined}>
      <td>
        <div className="pe-doc">
          <span className="pe-ci" aria-hidden="true"><Icone nome="doc" className="ico" /></span>
          <div><a className="pe-nome" href={href}>{p.modelo}</a><small>{p.arquivo}</small></div>
        </div>
      </td>
      <td data-r="Caso"><a className="pe-caso" href={ROTAS_PETICOES.caso(p.caso.id)}>{p.caso.nome}</a></td>
      <td data-r="Gerada por"><div className="pe-quem"><Pessoa nome={p.geradoPor.nome} /><span className="pe-quando">{quando(p.geradoEm)}</span></div></td>
      <td data-r="Situação">
        <div className="pe-dx">
          <div className="pe-sit"><SeloPeticao s={p.situacao} /><small>{detalheSituacao(p)}</small></div>
          {p.situacao === "APROVADA" ? (
            <button className="btn btn-sec btn-compacto pe-bx" type="button" title="Baixar o .docx" onClick={aoBaixar} disabled={baixando}>
              <Icone nome="baixar" className="ico ico-s" /><span className="sr">Baixar {nome}</span>
            </button>
          ) : p.paraMim ? (
            <a className="btn btn-pri btn-compacto" href={href}>Revisar<span className="sr"> {nome}</span></a>
          ) : (
            <a className="btn btn-sec btn-compacto pe-bx" href={href} title="Abrir"><Icone nome="olho" className="ico ico-s" /><span className="sr">Abrir {nome}</span></a>
          )}
        </div>
      </td>
    </tr>
  );
}

export function PeticoesJuridicoPortal() {
  return <MolduraArea area="JURIDICO" secao="peticoes">{() => <ListaConteudo />}</MolduraArea>;
}

// ------------------------------------------------------------------------- na ficha do caso (decisão 12)

/** "Petições do caso", na lateral da ficha, logo abaixo de "O que está travando". */
export function PeticoesDoCaso({ casoId, andamento }: { casoId: string; andamento: boolean }) {
  const { dados, recarregar } = useCarga<ListaPeticoes>(`${API}?caso=${casoId}`);
  const bx = useBaixar();
  return (
    <section className="folha" aria-labelledby="t-pc">
      <div className="folha-cab" style={{ paddingBottom: 8 }}>
        <div><h2 id="t-pc" style={{ fontSize: 20 }}>Petições do caso</h2><p className="sub">Geradas pelos modelos do escritório</p></div>
      </div>
      {dados === "erro" ? (
        <p className="pe-nota"><Icone nome="alerta" className="ico" /><span>Não deu para carregar as petições. <button className="btn btn-fantasma btn-compacto" type="button" onClick={recarregar}>Tentar de novo</button></span></p>
      ) : !dados ? (
        <p className="pe-nota" role="status"><span>Carregando as petições…</span></p>
      ) : dados.peticoes.length ? (
        <ul className="pe-do-caso">
          {dados.peticoes.map((p) => {
            const det = p.situacao === "APROVADA" ? (p.revisor ? `aprovada por ${primeiroNome(p.revisor.nome)}` : "sem revisão") : `v${p.versao}`;
            return (
              <li key={p.id}>
                <span>
                  <b><a className="pe-caso" style={{ minHeight: 0 }} href={ROTAS_PETICOES.peticao(p.id)}>{p.modelo}</a></b>
                  <small>{quando(p.geradoEm).replace(/^./, (x) => x.toUpperCase())} · {p.geradoPor.nome} · {det}</small>
                  <SeloPeticao s={p.situacao} />
                </span>
                {p.paraMim ? (
                  <a className="btn btn-pri btn-compacto" href={ROTAS_PETICOES.peticao(p.id)}>Revisar<span className="sr"> {p.modelo}</span></a>
                ) : p.situacao === "APROVADA" ? (
                  <button className="btn btn-sec btn-compacto" type="button" onClick={() => void bx.peticao(p.id)} disabled={!!bx.baixando}>
                    <Icone nome="baixar" className="ico ico-s" />Baixar<span className="sr"> {p.modelo}</span>
                  </button>
                ) : (
                  <a className="btn btn-sec btn-compacto" href={ROTAS_PETICOES.peticao(p.id)}>Abrir<span className="sr"> {p.modelo}</span></a>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="pe-nota"><Icone nome="pena" className="ico" /><span>Nenhuma petição gerada neste caso ainda.</span></p>
      )}
      {bx.falha ? <div style={{ padding: "0 24px 12px" }}><Aviso tom="urgencia" titulo="Não deu para baixar.">{bx.falha}</Aviso></div> : null}
      {andamento ? (
        <div className="pe-lat-acoes">
          <a className="btn btn-sec" href={ROTAS_PETICOES.nova(casoId)}><Icone nome="pena" className="ico" />Gerar petição</a>
          <p>Começando por aqui, o caso já vem escolhido. Só a aprovada entra em Documentos.</p>
        </div>
      ) : null}
    </section>
  );
}

// ------------------------------------------------------------------------- 2. modelos

function ModelosConteudo() {
  const { dados, recarregar } = useCarga<ListaModelos>(`${API}/modelos`);
  const [janela, setJanela] = useState<{ alvo: ModeloPeticao | null } | null>(null);
  const [feito, setFeito] = useState<Feito | null>(null);
  const bx = useBaixar();
  const cab = (
    <CabPeticoes titulo="Modelos de petição" sobre="Jurídico · Petições" voltar={{ href: ROTAS_PETICOES.lista, nome: "Petições" }}
      lede="Os textos do escritório, em Word. O T3jus só preenche os campos entre colchetes; o resto fica como está."
      acoes={dados && dados !== "erro" && dados.podeEnviar ? (
        <button data-muda className="btn btn-pri" type="button" onClick={() => setJanela({ alvo: null })}><Icone nome="enviar" className="ico" />Enviar modelo</button>
      ) : undefined} />
  );
  if (dados === "erro") return <div className="hn">{cab}<ErroAoCarregar oque="os modelos" aoTentar={recarregar} /></div>;
  if (!dados) return <div className="hn">{cab}<Carregando rotulo="Carregando os modelos…" linhas={4} /></div>;
  const grupos = gruposDeModelos(dados.modelos);
  const doEsc = dados.modelos.filter((m) => !m.padrao).length;
  const porGrupo = new Map<string, CampoPeticao[]>();
  for (const c of dados.campos) porGrupo.set(c.grupo, [...(porGrupo.get(c.grupo) ?? []), c]);

  return (
    <div className="hn">
      {cab}
      <div className="hn-grade">
        <div className="hn-col">
          <section className="folha" aria-labelledby="t-mo" style={{ overflow: "hidden" }}>
            <div className="folha-cab">
              <div>
                <h2 id="t-mo">Modelos</h2>
                <p className="sub">{contar(dados.modelos.length, "modelo", "modelos")} · {doEsc} do escritório e {dados.modelos.length - doEsc} padrão do T3jus · por área</p>
              </div>
            </div>
            {bx.falha ? <div style={{ padding: "0 24px 12px" }}><Aviso tom="urgencia" titulo="Não deu para baixar.">{bx.falha}</Aviso></div> : null}
            {grupos.map((g) => (
              <div className="pe-grupo" key={g.grupo}>
                <h3>{g.grupo}<span className="q">{g.modelos.length}</span></h3>
                <ul className="pe-modelos">
                  {g.modelos.map((m) => (
                    <li key={m.id} className={m.padrao ? undefined : "pe-do-esc"}>
                      <span className="pe-ci" aria-hidden="true"><Icone nome="doc" className="ico" /></span>
                      <div>
                        <strong>{m.nome}{m.padrao ? <Selo tom="neutro">Padrão T3jus</Selo> : <Selo tom="implant">Do escritório</Selo>}</strong>
                        <small>{linhaVersaoModelo(m)} · {contar(m.campos.length, "campo", "campos")} · {usado(m.usos)}</small>
                      </div>
                      <div className="pe-bts">
                        <button className="btn btn-sec btn-compacto" type="button" disabled={bx.baixando !== null}
                          onClick={() => void bx.baixar(`${API}/modelos/${encodeURIComponent(m.id)}/abrir`)}>
                          <Icone nome="baixar" className="ico ico-s" />Baixar<span className="sr"> o modelo {m.nome}</span>
                        </button>
                        {dados.podeEnviar ? (
                          <button className="btn btn-sec btn-compacto" type="button" onClick={() => setJanela({ alvo: m })}>
                            <Icone nome="trocar" className="ico ico-s" />{m.padrao ? "Usar o do escritório" : "Trocar"}<span className="sr">: {m.nome}</span>
                          </button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <p className="hn-pe">
              <Icone nome="historico" className="ico" />
              <span>Trocar um modelo cria a versão nova e guarda a anterior. As petições já geradas não mudam. Cada envio e cada troca ficam no histórico do escritório, com quem fez e quando.</span>
            </p>
          </section>
        </div>
        <aside className="hn-col" aria-label="Campos e permissões">
          <section className="folha" aria-labelledby="t-cps">
            <div className="folha-cab" style={{ paddingBottom: 8 }}>
              <div>
                <h2 id="t-cps" style={{ fontSize: 20 }}>Campos aceitos</h2>
                <p className="sub">Escreva no modelo do jeito que está aqui, com os colchetes.</p>
              </div>
            </div>
            <div className="pe-campos">
              {[...porGrupo.entries()].map(([g, cs]) => (
                <Fragment key={g}>
                  <h3>{g}</h3>
                  <dl>{cs.map((c) => <div key={c.campo}><dt><code>[{c.campo}]</code></dt><dd>{c.descricao}</dd></div>)}</dl>
                </Fragment>
              ))}
            </div>
            <p className="pe-nota"><Icone nome="ajuda" className="ico" /><span>Dado que falta no cadastro sai marcado, como [RG: falta]. Campo que o T3jus não conhece sai como está, para completar no Word.</span></p>
          </section>
          <section className="folha" aria-labelledby="t-qm">
            <div className="folha-cab" style={{ paddingBottom: 8 }}><div><h2 id="t-qm" style={{ fontSize: 20 }}>Quem muda os modelos</h2></div></div>
            <p className="pe-nota" style={{ fontSize: 13 }}><Icone nome="pessoas" className="ico" /><span>Quem tem a área Jurídico envia e troca modelos. A versão anterior fica guardada e a troca entra no histórico.</span></p>
          </section>
        </aside>
      </div>
      {janela ? (
        <JanelaModelo modelos={dados.modelos} alvo={janela.alvo} aoFechar={() => setJanela(null)}
          aoFeito={(m) => {
            setJanela(null);
            setFeito({ titulo: "Modelo salvo", texto: `${m.nome} está na versão ${m.versao}. A anterior ficou guardada.` });
            recarregar();
          }} />
      ) : null}
      {feito ? <Toast feito={feito} aoFechar={() => setFeito(null)} /> : null}
    </div>
  );
}

/** O valor do campo "Substitui": versão nova de um do escritório, troca de um padrão ou nenhum. */
function substituiDe(alvo: ModeloPeticao | null): string {
  if (!alvo) return "";
  return alvo.padrao ? `p:${alvo.id}` : `v:${alvo.id}`;
}

function JanelaModelo({ modelos, alvo, aoFechar, aoFeito }: {
  modelos: ModeloPeticao[]; alvo: ModeloPeticao | null; aoFechar: () => void; aoFeito: (m: ModeloPeticao) => void;
}) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [conf, setConf] = useState<ConferenciaModelo | null>(null);
  const [conferindo, setConferindo] = useState(false);
  const [erroArq, setErroArq] = useState<string | null>(null);
  const [nome, setNome] = useState(alvo?.nome ?? "");
  const [tipo, setTipo] = useState<TipoPeca | "">(alvo?.tipo ?? "");
  const [area, setArea] = useState<AreaModelo | "">(alvo?.area ?? "");
  const [subst, setSubst] = useState(substituiDe(alvo));
  const [erros, setErros] = useState<string[]>([]);
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);
  const tem = (c: string) => erros.includes(c);
  const doEsc = modelos.filter((m) => !m.padrao);
  const padroes = modelos.filter((m) => m.padrao);
  const alvoV = subst.startsWith("v:") ? modelos.find((m) => m.id === subst.slice(2)) : null;

  async function escolher(f: File | undefined) {
    if (!f) return;
    setArquivo(f);
    setConf(null);
    setErroArq(null);
    setFalha(null);
    setErros((e) => e.filter((x) => x !== "arquivo"));
    if (f.size > 5 * 1024 * 1024) return setErroArq(erroDoArquivo("ARQUIVO_GRANDE"));
    if (!nome.trim()) setNome(f.name.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").slice(0, 120));
    setConferindo(true);
    const r = await chamarPortal<ConferenciaModelo>(`${API}/modelos/conferir`, { bruto: f });
    setConferindo(false);
    if (r.ok) return setConf(r.dados);
    if (r.erro.detalhes?.motivo) return setErroArq(erroDoArquivo(r.erro.detalhes.motivo));
    setFalha(textoDoErro(r.erro));
  }

  async function salvar() {
    setFalha(null);
    const e: string[] = [];
    if (!arquivo || erroArq) e.push("arquivo");
    if (nome.trim().length < 3) e.push("nome");
    if (!tipo) e.push("tipo");
    if (!area) e.push("area");
    setErros(e);
    if (e.length) {
      if (e[0] === "arquivo") return requestAnimationFrame(() => document.getElementById("ma-arq-bt")?.focus());
      return focarPrimeiroErro(document.getElementById("janela-modelo"));
    }
    const q = new URLSearchParams({ nome: nome.trim(), tipo, area, arquivo: arquivo!.name.slice(0, 200).replace(/[/\\]/g, "-") });
    if (subst.startsWith("p:")) q.set("substitui", subst.slice(2));
    const caminho = alvoV ? `${API}/modelos/${alvoV.id}/versoes?${q}` : `${API}/modelos?${q}`;
    setEnviando(true);
    const r = await chamarPortal<{ modelo: ModeloPeticao }>(caminho, { bruto: arquivo! });
    setEnviando(false);
    if (r.ok) return aoFeito(r.dados.modelo);
    if (r.erro.detalhes?.motivo && String(r.erro.detalhes.motivo).startsWith("ARQUIVO")) return setErroArq(erroDoArquivo(r.erro.detalhes.motivo));
    setFalha(textoDoErro(r.erro));
  }

  const botao = alvoV ? `Salvar como v${alvoV.versao + 1}` : "Salvar modelo";
  return (
    <Janela id="janela-modelo" classe="pe-larga" aberta aoFechar={aoFechar} sobretitulo="Modelos de petição" titulo="Enviar modelo" descricao="ma-desc" aoEnviar={() => void salvar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-pri" type="submit" disabled={enviando || conferindo}><Icone nome="check" className="ico" />{enviando ? "Salvando…" : botao}</button>
        </>
      }>
      <p id="ma-desc" className="sr">Um .docx do escritório com os campos entre colchetes. Conferimos os campos assim que o arquivo chega.</p>
      {erroArq && tem("arquivo") ? (
        <Aviso tom="urgencia" titulo="O modelo não foi salvo.">Escolha um arquivo .docx de até 5 MB.{alvoV ? ` O modelo atual (v${alvoV.versao}) continua valendo.` : ""}</Aviso>
      ) : null}
      {falha ? <Aviso tom="urgencia" titulo="O modelo não foi salvo.">{falha}</Aviso> : null}
      <div className="form-folha" style={{ padding: 0 }}>
        <div className="campo c6">
          <p className="pe-rot" id="ma-arq-r">Arquivo do modelo</p>
          <input ref={entrada} type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="sr" tabIndex={-1}
            aria-hidden="true" onChange={(e) => { void escolher(e.target.files?.[0]); e.target.value = ""; }} />
          {arquivo ? (
            <div className={erroArq ? "pe-arq erro" : "pe-arq"} role="group" aria-labelledby="ma-arq-r">
              <span className="pe-ci" aria-hidden="true"><Icone nome="doc" className="ico" /></span>
              <div>
                <b>{arquivo.name}</b>
                <small>{/\.docx$/i.test(arquivo.name) ? "Word" : arquivo.name.split(".").pop()?.toUpperCase()} · {tamanhoArquivo(arquivo.size)}{conferindo ? " · conferindo…" : conf ? " · conferido agora" : ""}</small>
              </div>
              <button id="ma-arq-bt" className="btn btn-sec btn-compacto" type="button" onClick={() => entrada.current?.click()} aria-describedby={erroArq ? "ma-arq-er" : undefined}>
                <Icone nome="enviar" className="ico ico-s" />{erroArq ? "Escolher outro arquivo" : "Trocar arquivo"}
              </button>
            </div>
          ) : (
            <div className="pe-arq" role="group" aria-labelledby="ma-arq-r">
              <span className="pe-ci" aria-hidden="true"><Icone nome="doc" className="ico" /></span>
              <div><b>Nenhum arquivo escolhido</b><small>O .docx do escritório</small></div>
              <button id="ma-arq-bt" className="btn btn-sec btn-compacto" type="button" onClick={() => entrada.current?.click()} data-foco
                aria-describedby={descritoPor(tem("arquivo") && "ma-arq-er")}>
                <Icone nome="enviar" className="ico ico-s" />Escolher arquivo
              </button>
            </div>
          )}
          {erroArq ? <ErroCampo id="ma-arq-er">{erroArq}</ErroCampo> : tem("arquivo") ? <ErroCampo id="ma-arq-er">Escolha o .docx do modelo.</ErroCampo> : (
            <p className="ajuda">Só .docx, até 5 MB. Arquivos com macro (.docm) e PDF não servem.</p>
          )}
        </div>
        <div className="campo c6">
          <label htmlFor="ma-nome">Nome do modelo</label>
          <input className="entrada" id="ma-nome" type="text" autoComplete="off" maxLength={120} value={nome} onChange={(e) => setNome(e.target.value)}
            data-foco={arquivo ? "" : undefined} aria-invalid={tem("nome") || undefined} aria-describedby={descritoPor("ma-nome-aj", tem("nome") && "ma-nome-er")} />
          <p className="ajuda" id="ma-nome-aj">Como aparece na hora de escolher.</p>
          {tem("nome") ? <ErroCampo id="ma-nome-er">Escreva o nome do modelo, com 3 letras ou mais.</ErroCampo> : null}
        </div>
        <div className="campo c3">
          <label htmlFor="ma-tipo">Tipo de peça</label>
          <select className="entrada" id="ma-tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoPeca)}
            aria-invalid={tem("tipo") || undefined} aria-describedby={descritoPor(tem("tipo") && "ma-tipo-er")}>
            <option value="">Escolha</option>
            {(Object.entries(TIPOS_PECA) as [TipoPeca, string][]).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
          {tem("tipo") ? <ErroCampo id="ma-tipo-er">Escolha o tipo de peça.</ErroCampo> : null}
        </div>
        <div className="campo c3">
          <label htmlFor="ma-area">Área</label>
          <select className="entrada" id="ma-area" value={area} onChange={(e) => setArea(e.target.value as AreaModelo)}
            aria-invalid={tem("area") || undefined} aria-describedby={descritoPor("ma-area-aj", tem("area") && "ma-area-er")}>
            <option value="">Escolha</option>
            {(Object.entries(AREAS_MODELO) as [AreaModelo, string][]).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
          <p className="ajuda" id="ma-area-aj">Os modelos da área do caso aparecem primeiro.</p>
          {tem("area") ? <ErroCampo id="ma-area-er">Escolha a área.</ErroCampo> : null}
        </div>
        <div className="campo c6">
          <label htmlFor="ma-subst">Substitui</label>
          <select className="entrada" id="ma-subst" value={subst} onChange={(e) => setSubst(e.target.value)} aria-describedby="ma-subst-aj">
            {doEsc.map((m) => <option key={m.id} value={`v:${m.id}`}>{m.nome} · v{m.versao}, do escritório</option>)}
            {padroes.map((m) => <option key={m.id} value={`p:${m.id}`}>{m.nome} · padrão do T3jus</option>)}
            <option value="">Nenhum: é um modelo novo</option>
          </select>
          <p className="ajuda" id="ma-subst-aj">
            {alvoV ? `A v${alvoV.versao} fica guardada. As petições já geradas com ela não mudam.`
              : subst ? "O padrão do T3jus deixa de aparecer na escolha. As petições já geradas com ele não mudam."
              : "Entra como um modelo a mais na lista."}
          </p>
        </div>
        {conf ? (
          <section className="pe-conf c6" aria-labelledby="ma-conf-t">
            <h3 id="ma-conf-t"><Icone nome="doc" className="ico" />Conferimos o arquivo: {contar(conf.campos.length, "campo", "campos")}{conf.desconhecidos.length ? `, ${contar(conf.desconhecidos.length, "desconhecido", "desconhecidos")}` : ""}</h3>
            {conf.campos.length ? (
              <ul className="pe-chips" aria-label="Campos encontrados">
                {conf.campos.map((c) => campoConhecido(c)
                  ? <li key={c}><Icone nome="check" className="ico" /><code className="pe-code">[{c}]</code></li>
                  : <li key={c} className="pe-desc"><Icone nome="alerta" className="ico" /><code className="pe-code">[{c}]</code><span className="sr">: campo desconhecido</span></li>)}
              </ul>
            ) : null}
            {conf.desconhecidos.map((d) => (
              <Aviso key={d.campo} tom="atencao" icone="alerta" titulo={`O T3jus não conhece o campo [${d.campo}].`}>
                Na petição, ele sai do jeito que está, entre colchetes, para completar no Word.{d.sugestao ? ` Para preencher sozinho, troque no Word por [${d.sugestao}] e envie de novo.` : ""} Dá para salvar assim.
              </Aviso>
            ))}
            {conf.semCampos ? (
              <Aviso tom="atencao" icone="alerta" titulo="Nenhum campo conhecido neste arquivo.">
                A petição vai sair igual ao modelo, sem dados do cadastro. Confira a lista de campos aceitos. Dá para salvar assim.
              </Aviso>
            ) : null}
          </section>
        ) : null}
      </div>
    </Janela>
  );
}

export function ModelosPeticaoPortal() {
  return <MolduraArea area="JURIDICO" secao="peticoes" trilha={[{ nome: "Modelos de petição" }]}>{() => <ModelosConteudo />}</MolduraArea>;
}

// ------------------------------------------------------------------------- 3. nova petição

const PASSOS = ["Caso", "Modelo", "Dados da peça", "Prévia e gerar"];

function Passos({ atual, escolhas, final, aoIr }: { atual: number; escolhas: string[]; final: string; aoIr: (n: number) => void }) {
  const nomes = [...PASSOS.slice(0, 3), final];
  return (
    <ol className="pe-passos" aria-label={`Passo ${atual} de 4`}>
      {nomes.map((nome, i) => {
        const n = i + 1;
        const sub = escolhas[i] ? <small>{escolhas[i]}</small> : null;
        const corpo = <><span className="pe-n" aria-hidden="true">{n}</span><span style={{ minWidth: 0 }}><b>{nome}</b>{sub}</span></>;
        if (n < atual) {
          return (
            <li key={n} className="feito">
              <a href={`#passo-${n}`} onClick={(e) => { e.preventDefault(); aoIr(n); }}>{corpo}<span className="sr"> (feito; voltar a este passo)</span></a>
            </li>
          );
        }
        return <li key={n} aria-current={n === atual ? "step" : undefined}><span className="pe-pi" tabIndex={n === atual ? -1 : undefined}>{corpo}{n === atual ? <span className="sr"> (passo atual)</span> : null}</span></li>;
      })}
    </ol>
  );
}

interface Form {
  partes: string[];
  escolhidos: Record<string, string[]>;
  enderecamento: string;
  numero: string;
  gravarNumero: boolean;
  valor: string;
  qualif: string;
  cidadeData: string;
}

/** Os erros que voltam do servidor: { campo: código }. */
function motivosDoErro(e: ErroApi): Record<string, string> | null {
  const m = e.detalhes?.motivos;
  return m && typeof m === "object" ? (m as Record<string, string>) : null;
}

const centavosBr = (v: number | null | undefined) => (v ? (v / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "");

export function formInicial(d: DadosPeticao): Form {
  return {
    partes: d.clientes.map((c) => c.id),
    escolhidos: escolhaPadrao(d.advogados),
    enderecamento: enderecamentoSugerido(d.caso, d.escritorio.uf),
    numero: "",
    gravarNumero: false,
    valor: centavosBr(d.caso.valorCausa),
    qualif: d.caso.parteContrariaQualificacao ?? "",
    cidadeData: cidadeDataPadrao(d.escritorio, d.hoje),
  };
}

/** O corpo das escolhas (gerar, prévia e versão nova). */
export function corpoDoForm(f: Form, d: DadosPeticao, campos: string[]) {
  const usa = (c: string) => campos.includes(c);
  const v = lerCentavos(f.valor);
  return {
    partes: f.partes,
    advogados: d.advogados.filter((a) => f.escolhidos[a.pessoaId]?.length).map((a) => ({ pessoaId: a.pessoaId, inscricoes: f.escolhidos[a.pessoaId]! })),
    enderecamento: f.enderecamento,
    cidadeData: f.cidadeData,
    ...(d.caso.numero || !f.numero.trim() ? {} : { numero: f.numero.trim(), gravarNumero: f.gravarNumero }),
    ...(usa("VALOR_CAUSA") || usa("VALOR_CAUSA_EXTENSO") ? { valorCausa: f.valor.trim() ? (v ?? -1) : null } : {}),
    ...(usa("PARTE_CONTRARIA_QUALIFICACAO") ? { parteContrariaQualificacao: f.qualif.trim() || null } : {}),
  };
}

/** O que falta no cadastro, para o resumo ao lado (decisão 7). */
export function faltasDoForm(d: DadosPeticao, f: Form, campos: string[]): string[] {
  const usaCliente = campos.some((c) => c.startsWith("CLIENTE_") || c === "PARTES_QUALIFICACAO");
  const out: string[] = [];
  if (usaCliente) {
    for (const c of d.clientes.filter((x) => f.partes.includes(x.id))) {
      for (const x of faltasDoCliente(c)) out.push(`${x === "RG" || x === "CPF" || x === "CNPJ" ? `o ${x}` : `${x.startsWith("e") ? "o" : "a"} ${x}`} de ${primeiroNome(c.nome)}`);
    }
  }
  if (campos.includes("NUMERO_PROCESSO") && !d.caso.numero && !f.numero.trim()) out.unshift("o número do processo");
  return out;
}

/** O formulário da peça (decisão 7): só o que o modelo usa; o resto vem do cadastro. */
export function FormDados({ d, modelo, f, mudar, erros, aoVoltar, aoContinuar, rotuloContinuar = "Ver a prévia", rotuloVoltar = "Voltar", ocupado = false }: {
  d: DadosPeticao; modelo: { nome: string; campos: string[] }; f: Form; mudar: (x: Partial<Form>) => void; erros: Record<string, string>;
  aoVoltar: () => void; aoContinuar: () => void; rotuloContinuar?: string; rotuloVoltar?: string; ocupado?: boolean;
}) {
  const usa = (c: string) => modelo.campos.includes(c);
  const tem = (c: string) => !!erros[c];
  const msg = (c: string) => ERROS_PETICAO[erros[c]!] ?? "Confira este campo.";
  const c = d.caso;
  const pontos = Object.keys(erros);
  const ancora: Record<string, string> = { enderecamento: "nd-end", partes: `nd-parte-${f.partes[0] ?? d.clientes[0]?.id}`, advogados: `nd-adv-${d.advogados[0]?.pessoaId}`, numero: "nd-num", cidadeData: "nd-data", valorCausa: "nd-valor", parteContrariaQualificacao: "nd-contra" };
  const marcarAdv = (id: string, sim: boolean) => {
    const a = d.advogados.find((x) => x.pessoaId === id)!;
    const e = { ...f.escolhidos };
    if (sim) e[id] = a.inscricoes.map((i) => i.id);
    else delete e[id];
    mudar({ escolhidos: e });
  };
  const marcarInsc = (pessoa: string, insc: string, sim: boolean) => {
    const atual = f.escolhidos[pessoa] ?? [];
    const prox = sim ? [...atual, insc] : atual.filter((x) => x !== insc);
    const e = { ...f.escolhidos };
    if (prox.length) e[pessoa] = prox;
    else delete e[pessoa];
    mudar({ escolhidos: e });
  };
  const semOab = d.semOab.map((p) => p.nome);

  return (
    <section className="folha" aria-labelledby="t-nd">
      <div className="folha-cab">
        <div>
          <h2 id="t-nd">Dados da peça</h2>
          <p className="sub">Só o que o modelo {modelo.nome} usa. O resto vem do cadastro.</p>
        </div>
      </div>
      <form className="form-folha pe-form" noValidate onSubmit={(e) => { e.preventDefault(); aoContinuar(); }}>
        {pontos.length ? (
          <div className="c6 hn-resumo-erros">
            <Aviso tom="urgencia" titulo={`Falta acertar ${contar(pontos.length, "ponto", "pontos")} para ver a prévia.`}
              acoes={<ul>{pontos.map((p) => <li key={p}><a href={`#${ancora[p] ?? "nd-end"}`}>{RESUMO_ERRO[p] ?? p}</a></li>)}</ul>}>
              Nada foi gerado.
            </Aviso>
          </div>
        ) : null}

        <div className="pe-sec pe-primeira"><h3>Endereçamento</h3><small>Para quem vai a petição</small></div>
        <div className="campo c6">
          <label htmlFor="nd-end">Endereçamento</label>
          <textarea className="entrada" id="nd-end" style={{ minHeight: 72 }} value={f.enderecamento} maxLength={400} onChange={(e) => mudar({ enderecamento: e.target.value })}
            aria-invalid={tem("enderecamento") || undefined} aria-describedby={descritoPor("nd-end-aj", tem("enderecamento") && "nd-end-er")} />
          <p className="ajuda" id="nd-end-aj">
            {c.vara ? "Montado a partir da vara do caso. Mude se a peça vai para outro juízo, como o tribunal." : c.tribunal ? `Montado a partir do tribunal do caso (${[c.tribunal, c.sistema].filter(Boolean).join(" · ")}). O caso ainda não tem vara: confira.` : "O caso ainda não tem vara nem tribunal: complete o endereçamento."}
          </p>
          {tem("enderecamento") ? <ErroCampo id="nd-end-er">{msg("enderecamento")}</ErroCampo> : null}
        </div>

        <div className="pe-sec"><h3>Processo</h3><small>Do caso</small></div>
        {c.numero ? (
          <div className="c3"><p className="pe-dado"><span><small>Número do processo</small><b className="num">{formatarCnj(c.numero)}</b></span></p></div>
        ) : usa("NUMERO_PROCESSO") ? (
          <div className="campo c3">
            <label htmlFor="nd-num">Número do processo<span className="opcional"> (opcional)</span></label>
            <input className="entrada" id="nd-num" type="text" inputMode="numeric" autoComplete="off" placeholder="0000000-00.0000.0.00.0000" value={f.numero}
              onChange={(e) => mudar({ numero: e.target.value })} aria-invalid={tem("numero") || undefined} aria-describedby={descritoPor("nd-num-aj", tem("numero") && "nd-num-er")} />
            <p className="ajuda" id="nd-num-aj">O caso ainda não tem número. Escreva aqui ou deixe em branco: sai [NÚMERO DO PROCESSO: falta].</p>
            {tem("numero") ? <ErroCampo id="nd-num-er">{msg("numero")}</ErroCampo> : null}
          </div>
        ) : (
          <div className="c3"><p className="pe-dado"><span><small>Número do processo</small><b>Sem número ainda</b></span></p></div>
        )}
        {c.vara || c.tribunal ? (
          <div className="c3"><p className="pe-dado"><span><small>Vara e tribunal</small><b>{[c.vara, c.tribunal].filter(Boolean).join(" · ")}</b></span></p></div>
        ) : null}
        {usa("VALOR_CAUSA") || usa("VALOR_CAUSA_EXTENSO") ? (
          <div className="campo c3">
            <label htmlFor="nd-valor">Valor da causa</label>
            <span className="hn-afixo hn-antes">
              <span aria-hidden="true">R$</span>
              <input className="entrada" id="nd-valor" type="text" inputMode="decimal" autoComplete="off" value={f.valor} onChange={(e) => mudar({ valor: e.target.value })}
                aria-invalid={tem("valorCausa") || undefined} aria-describedby={descritoPor("nd-valor-aj", tem("valorCausa") && "nd-valor-er")} />
            </span>
            <p className="ajuda" id="nd-valor-aj">
              {c.valorCausa ? `Vem do caso. Mudar aqui vale só para esta petição; o caso continua com ${reais(c.valorCausa)}.` : "O caso não tem valor da causa. Escreva aqui para esta petição, ou deixe em branco."}
            </p>
            {tem("valorCausa") ? <ErroCampo id="nd-valor-er">{msg("valorCausa")}</ErroCampo> : null}
          </div>
        ) : null}
        {!c.numero && usa("NUMERO_PROCESSO") ? (
          <div className="c6">
            <label className="opcao">
              <input className="marcar" type="checkbox" checked={f.gravarNumero} onChange={(e) => mudar({ gravarNumero: e.target.checked })} />
              <span>Gravar o número também no caso<small>Só quando escrito acima. Fica no histórico do caso.</small></span>
            </label>
          </div>
        ) : null}

        <div className="pe-sec"><h3>Partes</h3><small>Os clientes do caso que entram na petição</small></div>
        <fieldset className="pe-fs c6" aria-describedby={descritoPor(tem("partes") && "nd-parte-er")}>
          <legend>Clientes que entram como partes</legend>
          {tem("partes") ? <ErroCampo id="nd-parte-er">{msg("partes")}</ErroCampo> : null}
          <div className="pe-partes">
            {d.clientes.map((cl) => {
              const faltas = faltasDoCliente(cl);
              const papel = cl.papel === "REU" ? "Réu" : cl.papel === "INTERESSADO" ? "Interessado(a)" : "Autor(a)";
              return (
                <Fragment key={cl.id}>
                  <label className="opcao">
                    <input className="marcar" type="checkbox" id={`nd-parte-${cl.id}`} checked={f.partes.includes(cl.id)} aria-invalid={tem("partes") || undefined}
                      onChange={(e) => mudar({ partes: e.target.checked ? [...f.partes, cl.id] : f.partes.filter((x) => x !== cl.id) })} />
                    <span>
                      <strong style={{ fontWeight: 500 }}>{cl.nome}</strong>
                      <small>
                        {papel}{faltas.length ? null : " · qualificação completa"}
                        {faltas.length ? <Selo tom="atencao" icone="pena">{faltas.length === 1 ? `Falta ${faltas[0] === "RG" || faltas[0] === "CPF" || faltas[0] === "CNPJ" ? "o" : faltas[0]!.startsWith("e") ? "o" : "a"} ${faltas[0]}` : `Faltam ${faltas.length} dados`}</Selo> : null}
                      </small>
                    </span>
                  </label>
                  {faltas.length ? <a className="pe-completar" href={ROTAS_PETICOES.cliente(cl.id)} target="_blank" rel="noopener">Completar na ficha de {primeiroNome(cl.nome)}</a> : null}
                </Fragment>
              );
            })}
          </div>
        </fieldset>
        <div className="c6">
          <p className="pe-dado"><span><small>Parte contrária</small><b>{c.parteContraria || "Não cadastrada no caso"}</b></span><span className="pe-de">do caso</span></p>
        </div>
        {usa("PARTE_CONTRARIA_QUALIFICACAO") ? (
          <div className="campo c6">
            <label htmlFor="nd-contra">Qualificação da parte contrária<span className="opcional"> (opcional)</span></label>
            <textarea className="entrada" id="nd-contra" style={{ minHeight: 72 }} maxLength={400} value={f.qualif} onChange={(e) => mudar({ qualif: e.target.value })}
              aria-invalid={tem("parteContrariaQualificacao") || undefined} aria-describedby={descritoPor("nd-contra-aj", tem("parteContrariaQualificacao") && "nd-contra-er")} />
            <p className="ajuda" id="nd-contra-aj">CNPJ ou CPF e endereço. Fica guardada no caso para as próximas petições.</p>
            {tem("parteContrariaQualificacao") ? <ErroCampo id="nd-contra-er">{msg("parteContrariaQualificacao")}</ErroCampo> : null}
          </div>
        ) : null}

        <div className="pe-sec"><h3>Quem assina</h3><small>Só aparece quem tem OAB na Equipe</small></div>
        <fieldset className="pe-fs c6" id="nd-adv" aria-describedby={descritoPor(tem("advogados") && "nd-adv-er", "nd-adv-aj")}>
          <legend>Advogados que assinam<small>a OAB vem da Equipe</small></legend>
          {tem("advogados") ? <ErroCampo id="nd-adv-er">{msg("advogados")}</ErroCampo> : null}
          {d.advogados.length ? (
            <div className="pe-adv">
              {d.advogados.map((a) => {
                const marcado = !!f.escolhidos[a.pessoaId]?.length;
                const pn = primeiroNome(a.nome);
                return (
                  <div className="pe-a" key={a.pessoaId}>
                    <label className="opcao">
                      <input className="marcar" type="checkbox" id={`nd-adv-${a.pessoaId}`} checked={marcado} aria-invalid={tem("advogados") || undefined}
                        onChange={(e) => marcarAdv(a.pessoaId, e.target.checked)} />
                      <span><strong style={{ fontWeight: 500 }}>{a.nome}</strong><small>{papelAdvogado(a)}</small></span>
                    </label>
                    {a.inscricoes.length > 1 ? (
                      <fieldset className="pe-insc" disabled={!marcado}>
                        <legend>Inscrições de {pn} nesta petição</legend>
                        {a.inscricoes.map((i) => {
                          const sim = f.escolhidos[a.pessoaId]?.includes(i.id) ?? false;
                          return (
                            <label className="opcao" key={i.id}>
                              <input className="marcar" type="checkbox" checked={sim} onChange={(e) => marcarInsc(a.pessoaId, i.id, e.target.checked)} />
                              <span>{i.documento}<small>{i.tipo === "PRINCIPAL" ? "principal" : i.tipo === "SUPLEMENTAR" ? "suplementar" : "transferida"}{marcado && !sim ? " · desmarcada só nesta petição" : ""}</small></span>
                            </label>
                          );
                        })}
                      </fieldset>
                    ) : a.inscricoes[0] ? (
                      <p className="pe-insc-uma">{a.inscricoes[0].documento}<small>única inscrição</small></p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <Aviso tom="atencao" titulo="Ninguém com OAB na Equipe.">A sócia dona cadastra a OAB de cada advogado em Equipe. Sem advogado, a petição não tem quem assine.</Aviso>
          )}
          <p className="ajuda" id="nd-adv-aj">
            Cada advogado entra com todas as inscrições, a principal primeiro. Desmarque a que não serve nesta petição.
            {semOab.length ? ` Sem OAB cadastrada, não aparecem aqui: ${semOab.length === 1 ? semOab[0] : `${semOab.slice(0, -1).join(", ")} e ${semOab.at(-1)}`}.` : ""} Estagiários não assinam nesta versão.
          </p>
          <p className="pe-sai" aria-live="polite"><Icone nome="pena" className="ico" /><span><b>No documento:</b> {fraseNoDocumento(d.advogados, f.escolhidos)}</span></p>
        </fieldset>
        <div className="campo c3">
          <label htmlFor="nd-data">Cidade e data</label>
          <input className="entrada" id="nd-data" type="text" autoComplete="off" maxLength={120} value={f.cidadeData} onChange={(e) => mudar({ cidadeData: e.target.value })}
            aria-invalid={tem("cidadeData") || undefined} aria-describedby={descritoPor("nd-data-aj", tem("cidadeData") && "nd-data-er")} />
          <p className="ajuda" id="nd-data-aj">Do endereço do escritório e de hoje.</p>
          {tem("cidadeData") ? <ErroCampo id="nd-data-er">{msg("cidadeData")}</ErroCampo> : null}
        </div>
        <div className="form-pe pe-rodape">
          <button className="btn btn-fantasma" type="button" onClick={aoVoltar}><Icone nome="esquerda" className="ico" />{rotuloVoltar}</button>
          <button className="btn btn-pri" type="submit" disabled={ocupado}>{ocupado ? "Montando…" : rotuloContinuar}<Icone nome="dir" className="ico" /></button>
        </div>
      </form>
    </section>
  );
}

/** A conferência dos erros do formulário antes de pedir a prévia (o servidor confere de novo). */
export function errosDoForm(f: Form, d: DadosPeticao, campos: string[]): Record<string, string> {
  const e: Record<string, string> = {};
  if (f.enderecamento.trim().length < 3) e.enderecamento = "ENDERECAMENTO_OBRIGATORIO";
  if (!f.partes.length) e.partes = "PARTE_OBRIGATORIA";
  if (!d.advogados.some((a) => f.escolhidos[a.pessoaId]?.length)) e.advogados = "SEM_ADVOGADO";
  if (f.cidadeData.trim().length < 3) e.cidadeData = "CIDADE_DATA_OBRIGATORIA";
  if ((campos.includes("VALOR_CAUSA") || campos.includes("VALOR_CAUSA_EXTENSO")) && f.valor.trim() && !lerCentavos(f.valor)) e.valorCausa = "VALOR_INVALIDO";
  const n = f.numero.replace(/\D/g, "");
  if (!d.caso.numero && f.numero.trim() && n.length !== 20) e.numero = "NUMERO_CNJ_INVALIDO";
  return e;
}

/** A lateral "Sua petição" (decisão 6), com Trocar. */
function SuaPeticao({ caso, sub, modelo, aoTrocarCaso, aoTrocarModelo, children }: {
  caso: string; sub: string; modelo?: { nome: string; sub: string }; aoTrocarCaso?: () => void; aoTrocarModelo?: () => void; children?: ReactNode;
}) {
  return (
    <section className="folha" aria-labelledby="t-sp">
      <div className="folha-cab" style={{ paddingBottom: 8 }}><div><h2 id="t-sp" style={{ fontSize: 20 }}>Sua petição</h2></div></div>
      <dl className="pe-resumo">
        <div>
          <dt>Caso</dt><dd>{caso}<small>{sub}</small></dd>
          {aoTrocarCaso ? <dd className="pe-tr"><button className="btn btn-fantasma btn-compacto" type="button" onClick={aoTrocarCaso}>Trocar<span className="sr"> o caso</span></button></dd> : null}
        </div>
        {modelo ? (
          <div>
            <dt>Modelo</dt><dd>{modelo.nome}<small>{modelo.sub}</small></dd>
            {aoTrocarModelo ? <dd className="pe-tr"><button className="btn btn-fantasma btn-compacto" type="button" onClick={aoTrocarModelo}>Trocar<span className="sr"> o modelo</span></button></dd> : null}
          </div>
        ) : null}
      </dl>
      {children}
    </section>
  );
}

const linhaDoCaso = (c: { numero: string | null; area: string }) => `${c.numero ? formatarCnj(c.numero) : "Sem número ainda"} · ${AREAS_DIREITO[c.area as keyof typeof AREAS_DIREITO] ?? c.area}`;

function NovaConteudo({ escritorio }: { escritorio: EscritorioPortal }) {
  const casoInicial = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("caso") : null;
  const [passo, setPasso] = useState(casoInicial ? 2 : 1);
  const [casoId, setCasoId] = useState<string | null>(casoInicial);
  const [modeloId, setModeloId] = useState<string | null>(null);
  const [dados, setDados] = useState<DadosPeticao | null | "erro">(null);
  const [f, setF] = useState<Form | null>(null);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroEscolha, setErroEscolha] = useState(false);
  const [previa, setPrevia] = useState<PreviaPeticao | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  const [recado, setRecado] = useState("");
  const [busca, setBusca] = useState("");
  const [outras, setOutras] = useState(false);
  const topo = useRef<HTMLDivElement>(null);
  const casos = useCarga<ListaCasos>("/v1/escritorio/juridico/casos?situacao=ANDAMENTO");
  const modelos = useCarga<ListaModelos>(`${API}/modelos`);

  useEffect(() => {
    if (!casoId) return;
    let vivo = true;
    void Promise.resolve().then(() => setDados(null));
    void chamarPortal<DadosPeticao>(`${API}/casos/${casoId}/dados`).then((r) => {
      if (!vivo) return;
      setDados(r.ok ? r.dados : "erro");
      if (r.ok) setF(formInicial(r.dados));
    });
    return () => { vivo = false; };
  }, [casoId]);

  const listaModelos = modelos.dados && modelos.dados !== "erro" ? modelos.dados.modelos : [];
  const modelo = listaModelos.find((m) => m.id === modeloId) ?? null;
  const d = dados && dados !== "erro" ? dados : null;

  function ir(n: number) {
    setFalha(null);
    setErroEscolha(false);
    setPasso(n);
    requestAnimationFrame(() => {
      topo.current?.scrollIntoView({ block: "start" });
      topo.current?.querySelector<HTMLElement>(".pe-passos li[aria-current] .pe-pi")?.focus();
    });
  }

  function escolha(m: ModeloPeticao) {
    return { padrao: m.padrao ? m.id : null, modeloId: m.padrao ? null : m.id };
  }

  async function verPrevia() {
    if (!d || !f || !modelo) return;
    const e = errosDoForm(f, d, modelo.campos);
    setErros(e);
    if (Object.keys(e).length) return requestAnimationFrame(() => topo.current?.querySelector<HTMLElement>(".hn-resumo-erros a")?.focus());
    setOcupado(true);
    setFalha(null);
    const r = await chamarPortal<PreviaPeticao>(`${API}/casos/${d.caso.id}/previa`, { metodo: "POST", corpo: { modelo: escolha(modelo), ...corpoDoForm(f, d, modelo.campos) } });
    setOcupado(false);
    if (r.ok) {
      setPrevia(r.dados);
      return ir(4);
    }
    const m = motivosDoErro(r.erro);
    if (m) {
      setErros(m);
      return focarPrimeiroErro(topo.current);
    }
    setFalha(textoDoErro(r.erro));
  }

  async function gerar(enviar: boolean) {
    if (!d || !f || !modelo) return;
    setOcupado(true);
    setFalha(null);
    const r = await chamarPortal<ResultadoGerar>(`${API}/casos/${d.caso.id}/gerar`, {
      metodo: "POST", corpo: { modelo: escolha(modelo), ...corpoDoForm(f, d, modelo.campos), enviar, recado: recado.trim() || null },
    });
    if (r.ok) return irPara(`${ROTAS_PETICOES.peticao(r.dados.id)}?gerada=1`);
    setOcupado(false);
    const m = motivosDoErro(r.erro);
    if (m) {
      setErros(m);
      return ir(3);
    }
    setFalha(textoDoErro(r.erro));
  }

  const final = d?.revisor ? "Prévia e enviar" : "Prévia e gerar";
  const escolhas = [
    d?.caso.nome ?? "",
    passo > 2 && modelo ? modelo.nome : "",
    passo > 3 && d && f ? quemAssina(d.advogados, f.escolhidos) : "",
    "",
  ];
  const cab = (
    <div ref={topo}>
      <CabPeticoes titulo="Nova petição" sobre="Petições" voltar={{ href: ROTAS_PETICOES.lista, nome: "Petições" }} />
      <Passos atual={passo} escolhas={escolhas} final={final} aoIr={ir} />
    </div>
  );
  const grade = (principal: ReactNode, lateral: ReactNode, rotulo = "Sua petição") => (
    <div className="hn">
      {cab}
      {falha ? <Aviso tom="urgencia" titulo="Não deu para seguir.">{falha} O que você escolheu continua aqui.</Aviso> : null}
      <div className="hn-grade">
        <div className="hn-col">{principal}</div>
        <aside className="hn-col" aria-label={rotulo}>{lateral}</aside>
      </div>
    </div>
  );
  const resumoCaso = d ? { caso: d.caso.nome, sub: linhaDoCaso(d.caso) } : null;

  // ------------------------------------------------ passo 1: caso
  if (passo === 1) {
    if (casos.dados === "erro") return <div className="hn">{cab}<ErroAoCarregar oque="os casos" aoTentar={casos.recarregar} /></div>;
    if (!casos.dados) return <div className="hn">{cab}<Carregando rotulo="Carregando os casos…" linhas={4} /></div>;
    const termo = busca.trim().toLowerCase();
    const lista = [...casos.dados.casos]
      .filter((c) => !termo || [c.nome, c.numero ?? "", c.cliente?.nome ?? ""].some((x) => x.toLowerCase().includes(termo)))
      .sort((a, b) => Number(b.responsavel.nome === escritorio.pessoa) - Number(a.responsavel.nome === escritorio.pessoa));
    return grade(
      <section className="folha" aria-labelledby="t-nc">
        <div className="folha-cab"><div><h2 id="t-nc">Para qual caso?</h2><p className="sub">Casos em andamento · os seus primeiro</p></div></div>
        <div className="pe-busca">
          <div className="campo-busca">
            <label className="sr" htmlFor="nv-busca">Buscar caso por nome, número ou cliente</label>
            <Icone nome="busca" className="ico" />
            <input className="entrada" id="nv-busca" type="search" placeholder="Caso, número ou cliente" autoComplete="off" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
        </div>
        <fieldset className="pe-fs" style={{ padding: 0 }} aria-describedby={erroEscolha ? "nv-caso-er" : undefined}>
          <legend className="sr">Caso</legend>
          {erroEscolha ? <div style={{ padding: "0 24px 8px" }}><ErroCampo id="nv-caso-er">Escolha o caso da petição.</ErroCampo></div> : null}
          {lista.length ? (
            <ul className="pe-escolhas">
              {lista.map((c: LinhaCaso) => (
                <li key={c.id}>
                  <label className="opcao">
                    <input className="marcar" type="radio" name="nv-caso" checked={casoId === c.id} onChange={() => { setCasoId(c.id); setModeloId(null); setErroEscolha(false); }} />
                    <span>
                      <strong>{c.nome}</strong>
                      <small><span className="num">{c.numero ? formatarCnj(c.numero) : "Sem número ainda"}</span> · {AREAS_DIREITO[c.area]}
                        <span className="pe-linha2" style={{ display: "block" }}>{c.cliente?.nome ?? "Sem cliente"}{c.outrosClientes ? ` e mais ${contar(c.outrosClientes, "cliente", "clientes")}` : ""} · etapa {c.etapa.nome}</span>
                      </small>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <Estado icone="busca" titulo={termo ? "Nenhum caso encontrado" : "Nenhum caso em andamento"}>
              {termo ? "Confira o nome, o número ou o cliente." : "A petição sai de um caso. Cadastre o caso em Casos e processos."}
            </Estado>
          )}
        </fieldset>
        <div className="form-folha" style={{ paddingTop: 8 }}>
          <div className="form-pe pe-rodape">
            <span className="esq-pe">Também dá para começar pela ficha do caso, em “Gerar petição”: o caso já vem escolhido.</span>
            <a className="btn btn-fantasma" href={ROTAS_PETICOES.lista}>Cancelar</a>
            <button className="btn btn-pri" type="button" onClick={() => (casoId ? ir(2) : setErroEscolha(true))}>Continuar<Icone nome="dir" className="ico" /></button>
          </div>
        </div>
      </section>,
      EXPLICA_DADOS,
    );
  }

  if (dados === "erro") return <div className="hn">{cab}<ErroAoCarregar oque="o caso" aoTentar={() => setCasoId((c) => (c ? `${c}` : c))} texto="O caso não existe, foi encerrado ou é de outro escritório. Volte e escolha outro." /></div>;
  if (!d || !f || modelos.dados === null) return <div className="hn">{cab}<Carregando rotulo="Carregando os dados do caso…" linhas={4} /></div>;
  if (modelos.dados === "erro") return <div className="hn">{cab}<ErroAoCarregar oque="os modelos" aoTentar={modelos.recarregar} /></div>;

  // ------------------------------------------------ passo 2: modelo
  if (passo === 2 || !modelo) {
    const g = modelosParaCaso(listaModelos, d.caso.area);
    const item = (m: ModeloPeticao) => (
      <li key={m.id}>
        <label className="opcao">
          <input className="marcar" type="radio" name="nv-mod" checked={modeloId === m.id} onChange={() => { setModeloId(m.id); setErroEscolha(false); }} />
          <span>
            <strong>{m.nome}{m.padrao ? <Selo tom="neutro">Padrão T3jus</Selo> : <Selo tom="implant">Do escritório</Selo>}</strong>
            <small>{m.padrao ? "" : `v${m.versao} · `}{contar(m.campos.length, "campo", "campos")} · {usado(m.usos)}</small>
          </span>
        </label>
      </li>
    );
    return grade(
      <section className="folha" aria-labelledby="t-nm">
        <div className="folha-cab">
          <div>
            <h2 id="t-nm">Qual modelo?</h2>
            <p className="sub">
              {g.daArea.modelos.length ? `Primeiro os de ${g.daArea.grupo}, a área do caso.` : "Nenhum modelo da área do caso ainda."}
              {g.outras.length ? ` ${g.outras.length === 1 ? "O outro fica" : `Os outros ${g.outras.length} ficam`} em “Outras áreas”.` : ""}
            </p>
          </div>
          <div className="acoes"><a className="btn btn-fantasma" href={ROTAS_PETICOES.modelos}><Icone nome="doc" className="ico" />Ver os modelos</a></div>
        </div>
        <fieldset className="pe-fs" style={{ padding: 0 }} aria-describedby={erroEscolha ? "nv-mod-er" : undefined}>
          <legend className="sr">Modelo</legend>
          {erroEscolha ? <div style={{ padding: "0 24px 8px" }}><ErroCampo id="nv-mod-er">Escolha o modelo da petição.</ErroCampo></div> : null}
          {g.daArea.modelos.length ? <><p className="pe-grupo-t" aria-hidden="true">{g.daArea.grupo}</p><ul className="pe-escolhas" aria-label={g.daArea.grupo}>{g.daArea.modelos.map(item)}</ul></> : null}
          {g.qualquer.length ? <><p className="pe-grupo-t" aria-hidden="true">Para qualquer área</p><ul className="pe-escolhas" aria-label="Para qualquer área">{g.qualquer.map(item)}</ul></> : null}
          {outras && g.outras.length ? <><p className="pe-grupo-t" aria-hidden="true">Outras áreas</p><ul className="pe-escolhas" id="nv-outras" aria-label="Outras áreas">{g.outras.map(item)}</ul></> : null}
        </fieldset>
        {g.outras.length ? (
          <div style={{ padding: "4px 24px 0" }}>
            <button className="btn btn-fantasma" type="button" aria-expanded={outras} aria-controls="nv-outras" onClick={() => setOutras((v) => !v)}>
              <Icone nome="baixo" className="ico" />Outras áreas ({g.outras.length})
            </button>
          </div>
        ) : null}
        <div className="form-folha" style={{ paddingTop: 12 }}>
          <div className="form-pe pe-rodape">
            <button className="btn btn-fantasma" type="button" onClick={() => ir(1)}><Icone nome="esquerda" className="ico" />Voltar</button>
            <button className="btn btn-pri" type="button" onClick={() => (modeloId ? ir(3) : setErroEscolha(true))}>Continuar<Icone nome="dir" className="ico" /></button>
          </div>
        </div>
      </section>,
      <>{resumoCaso ? <SuaPeticao {...resumoCaso} aoTrocarCaso={() => ir(1)} /> : null}{EXPLICA_DADOS}</>,
    );
  }

  const conhecidos = modelo.campos.filter((c) => CAMPOS_PETICAO.some((x) => x.campo === c));
  const doForm = conhecidos.filter((c) => CAMPOS_PETICAO.find((x) => x.campo === c)!.origem === "formulario").length;
  const resumoModelo = { nome: modelo.nome, sub: modelo.padrao ? "Padrão T3jus" : `Do escritório · v${modelo.versao}` };

  // ------------------------------------------------ passo 3: dados da peça
  if (passo === 3) {
    const faltas = faltasDoForm(d, f, modelo.campos);
    return grade(
      <FormDados d={d} modelo={modelo} f={f} mudar={(x) => setF({ ...f, ...x })} erros={erros} ocupado={ocupado}
        aoVoltar={() => ir(2)} aoContinuar={() => void verPrevia()} />,
      resumoCaso ? (
        <SuaPeticao {...resumoCaso} modelo={resumoModelo} aoTrocarCaso={() => ir(1)} aoTrocarModelo={() => ir(2)}>
          {faltas.length ? (
            <ul className="pe-faltas" aria-label="O que falta no cadastro">
              <li><Icone nome="pena" className="ico" /><span><b>{faltas.length === 1 ? "Falta 1 dado:" : `Faltam ${faltas.length} dados:`}</b> {faltas.length === 1 ? faltas[0] : `${faltas.slice(0, -1).join(", ")} e ${faltas.at(-1)}`}. Dá para seguir: {faltas.length === 1 ? "sai marcado" : "saem marcados"} para completar no Word.</span></li>
            </ul>
          ) : null}
          <p className="pe-nota"><Icone nome="doc" className="ico" /><span>{contar(modelo.campos.length, "campo", "campos")} neste modelo: {conhecidos.length - doForm} vêm do cadastro e {doForm} deste formulário.</span></p>
        </SuaPeticao>
      ) : null,
    );
  }

  // ------------------------------------------------ passo 4: prévia e gerar (ou enviar)
  if (!previa) return <div className="hn">{cab}<Carregando rotulo="Montando a prévia…" linhas={4} /></div>;
  const semNumero = previa.marcados.includes("Número do processo");
  const outrosMarcados = previa.marcados.filter((m) => m !== "Número do processo");
  const clienteDoMarcado = (m: string) => d.clientes.find((c) => m.endsWith(` de ${c.nome}`));
  const pulou = frasePulaRevisao(previa.semRevisao, escritorio.dono && previa.semRevisao === "RESPONSAVEL");
  return grade(
    <section className="folha" aria-labelledby="t-pv">
      <div className="folha-cab" style={{ paddingBottom: 8 }}>
        <div>
          <h2 id="t-pv">Prévia</h2>
          <p className="sub">{previa.revisor ? "O começo do documento. Enquanto não for aprovado, o arquivo sai com “Rascunho · em revisão” no cabeçalho." : "O começo do documento, com os dados de agora. No Word, a formatação é a do modelo."}</p>
        </div>
      </div>
      <LegendaPrevia />
      <div className="pe-papel-folha"><Papel paragrafos={previa.paragrafos} resto={previa.resto} timbre={escritorio.nome} rascunho={!!previa.revisor} /></div>
    </section>,
    <section className="folha" aria-labelledby="t-cf">
      <div className="folha-cab" style={{ paddingBottom: 8 }}>
        <div>
          <h2 id="t-cf" style={{ fontSize: 20 }}>{previa.revisor ? "Confira e envie" : "Confira antes de gerar"}</h2>
          <p className="sub">{modelo.nome} · {d.caso.nome}</p>
        </div>
      </div>
      <p className="pe-ok"><Icone nome="check" className="ico" /><span>
        {previa.campos.preenchidos === previa.campos.total ? `Todos os ${previa.campos.total} campos preenchidos.` : `${previa.campos.preenchidos} de ${previa.campos.total} campos preenchidos: ${previa.campos.cadastro} do cadastro e ${previa.campos.formulario} deste formulário.`}
      </span></p>
      {previa.revisor ? (
        <div className="pe-cuidado"><Icone nome="pessoas" className="ico" /><span><b>Vai para a revisão de {previa.revisor.nome},</b> {d.caso.responsavel.id === previa.revisor.id ? "o responsável pelo caso" : "a sócia dona, porque o responsável pelo caso não tem OAB"}. Só fica pronta depois que {primeiroNome(previa.revisor.nome)} aprovar. O aviso chega no sino.</span></div>
      ) : pulou ? (
        <p className="pe-ok"><Icone nome="pessoas" className="ico" /><span>{pulou}</span></p>
      ) : null}
      {previa.marcados.length || previa.desconhecidos.length ? (
        <ul className="pe-faltas" aria-label="O que falta">
          {semNumero ? (
            <li><Icone nome="balanca" className="ico" /><span><b>O caso ainda não tem número do processo.</b> Se a ação ainda não foi distribuída, talvez o modelo certo seja a petição inicial.
              <span className="pe-fa">
                <a href="#nd-num" onClick={(e) => { e.preventDefault(); ir(3); }}>Escrever o número</a>
                <a href="#passo-2" onClick={(e) => { e.preventDefault(); ir(2); }}>Trocar o modelo</a>
              </span></span></li>
          ) : null}
          {outrosMarcados.map((m) => {
            const cl = clienteDoMarcado(m);
            return (
              <li key={m}><Icone nome="pena" className="ico" /><span><b>Falta {m.replace(/^(\S)/, (x) => x.toLowerCase()).replace(/^(rg|cpf|cnpj)\b/i, (x) => x.toUpperCase())}.</b> Dá para gerar assim: sai marcado para completar no Word.
                {cl ? <span className="pe-fa"><a href={ROTAS_PETICOES.cliente(cl.id)} target="_blank" rel="noopener">Completar na ficha de {primeiroNome(cl.nome)}</a></span> : null}</span></li>
            );
          })}
          {previa.desconhecidos.length ? (
            <li><Icone nome="alerta" className="ico" /><span><b>O modelo usa {previa.desconhecidos.length === 1 ? "um campo" : "campos"} que o T3jus não conhece:</b> {previa.desconhecidos.map((x) => `[${x}]`).join(", ")}. {previa.desconhecidos.length === 1 ? "Sai" : "Saem"} como está, para completar no Word.</span></li>
          ) : null}
        </ul>
      ) : null}
      <p className="pe-cuidado"><Icone nome="balanca" className="ico" /><span><b>{previa.revisor ? "O escritório revisa e protocola." : "Você revisa e protocola."}</b> O T3jus preenche o modelo com os dados do cadastro. Não confere o conteúdo jurídico e não protocola no tribunal.</span></p>
      {previa.revisor ? (
        <div className="pe-lat-campo">
          <div className="campo">
            <label htmlFor="re-recado">Recado para {primeiroNome(previa.revisor.nome)}<span className="opcional"> (opcional)</span></label>
            <textarea className="entrada" id="re-recado" style={{ minHeight: 72 }} maxLength={1000} value={recado} onChange={(e) => setRecado(e.target.value)} aria-describedby="re-recado-aj" />
            <p className="ajuda" id="re-recado-aj">Aparece no topo da revisão.</p>
          </div>
        </div>
      ) : null}
      <div className="pe-lat-acoes form-pe pe-rodape">
        <button className="btn btn-fantasma" type="button" onClick={() => ir(3)}><Icone nome="esquerda" className="ico" />Mudar dados</button>
        {previa.revisor ? (
          <button className="btn btn-sec" type="button" disabled={ocupado} onClick={() => void gerar(false)}><Icone nome="doc" className="ico" />Guardar como rascunho</button>
        ) : null}
        <button className="btn btn-pri" type="button" disabled={ocupado} onClick={() => void gerar(true)}>
          <Icone nome={previa.revisor ? "enviar" : "doc"} className="ico" />{ocupado ? "Gerando…" : botaoFinal(previa.revisor, previa.marcados.length)}
        </button>
      </div>
    </section>,
    previa.revisor ? "Conferir e enviar" : "Conferir e gerar",
  );
}

export function NovaPeticaoPortal() {
  return (
    <MolduraArea area="JURIDICO" secao="peticoes" trilha={[{ nome: "Nova petição" }]}>
      {(e) => <NovaConteudo escritorio={e} />}
    </MolduraArea>
  );
}

export type { Form as FormPeticao };
export { motivosDoErro };
