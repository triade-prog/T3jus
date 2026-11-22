"use client";
// Contratos › Procurações e modelos (CH-08, F3.16), desenho aprovado em
// docs/design/aprovadas/portal-procuracoes (Carol, 21/11/2026): a lista dos documentos gerados com
// o que falta anexar primeiro, os modelos de documento com a conferência do .docx assim que chega,
// a página única de gerar com a prévia em abas, o resultado com "Baixar todos (.zip)" recebendo o
// foco, a janela de anexar os assinados (anexar o contrato é registrar a assinatura) e a aba
// Documentos da ficha do contrato. Sem IA: o texto é o do modelo e o T3jus só troca os campos.

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import {
  CODIGOS_PODERES, DOCUMENTOS_CONTRATO, faltasDoAdvogado, faltasNoDocumento, formatarDocumento, hojeBrasilia, PAPEIS_RESPONSAVEL, quemAssina, rotuloQuemAssina, O_QUE_LEVA, PODERES_ESPECIAIS, TIPOS_DOCUMENTO_CONTRATO,
  type CampoDocumento, type ConferenciaModeloDocumento, type ContratoLinha, type DadosDocumentos, type DocumentoDoContrato,
  type DocumentosDoContrato, type FichaContrato, type LinhaDocumento, type ListaContratos, type ListaDocumentos, type ListaModelosDocumento,
  type ModeloDocumentoLinha, type PessoaComOab, type PoderEspecial, type PreviaDocumentos, type ResultadoDocumentos, type TipoDocumentoContrato,
  type VersaoDocumento, type DadoQueConta,
} from "@t3jus/domain";
import { textoDoErro } from "../api.ts";
import { Icone } from "../Icone.tsx";
import { Aviso, Carregando, descritoPor, ErroAoCarregar, ErroCampo, Estado, focarPrimeiroErro, Janela } from "../console/pecas.tsx";
import { iniciais } from "../console/tempo.ts";
import { lerDia } from "./agenda.ts";
import { abrirAnexo, enviarAnexo } from "./Anexos.tsx";
import { juntarFotos, ordenarFotos } from "./fotos.ts";
import { Busca, Chips, Selo, useCarga } from "./Comercial.tsx";
import { Toast } from "./FichaCliente.tsx";
import { chamarPortal, irPara, ROTAS_PORTAL } from "./Moldura.tsx";
import { rotaPessoaEquipe } from "./EquipeOab.tsx";
import { MolduraArea } from "./MolduraArea.tsx";
import { CabPeticoes, LegendaPrevia, Papel, SeloDados, useBaixar } from "./Peticoes.tsx";
import { contar, erroDoArquivo, Quando, quando, tamanhoArquivo } from "./peticoes.ts";
import {
  API_DOCUMENTOS, botaoGerar, chaveModelo, chavesAssinadas, ERROS_DOCUMENTO, errosDocumentos, formInicialDocumentos, fraseNoDocumentoOutorgados,
  fraseVaoSair, juntar, nomeCurto, origemModelo, PODERES_TELA, pedidoDocumentos, problemaDosAssinados, RESUMO_ERRO_DOCUMENTO, ROTAS_DOCUMENTOS,
  rotuloAssinado, seloAba, seloAssinado, tituloFaltas, type FormDocumentos,
} from "./procuracoes.ts";

type Feito = { titulo: string; texto: string };
const SOBRE = "Procurações e modelos";
const primeiro = (nome: string) => nome.trim().split(/\s+/)[0] ?? nome;
const diaBr = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

// ------------------------------------------------------------- Word e PDF (D23, docs/design/aprovadas/portal-contrato-pdf)

type Bx = ReturnType<typeof useBaixar>;
const caminhoWord = (id: string) => `${API_DOCUMENTOS}/${id}/abrir`;
/** O nome do arquivo sem a extensão: ele sai em dois formatos (D23, item 3). */
const semExtensao = (arquivo: string) => arquivo.replace(/\.docx$/i, "");
/** "o contrato", "a procuração", "a declaração". */
function oDocumento(tipo: TipoDocumentoContrato, nome?: string): string {
  if (tipo === "CONTRATO") return "o contrato";
  if (tipo === "OUTRO") return `o documento ${nome ?? ""}`.trim();
  return `a ${nomeCurto(tipo, nome).toLowerCase()}`;
}

/**
 * O PDF de cada documento: feito no servidor na primeira vez (alguns segundos), com o estado
 * "Preparando" preso ao documento; o Word e os outros documentos seguem livres (D23, decisão 3).
 */
export function usePdf() {
  const [preparando, setPreparando] = useState<ReadonlySet<string>>(new Set());
  const [falhou, setFalhou] = useState<string | null>(null);
  const [simples, setSimples] = useState<ReadonlySet<string>>(new Set());
  async function baixar(id: string) {
    if (preparando.has(id)) return;
    setFalhou(null);
    setPreparando((p) => new Set(p).add(id));
    const r = await chamarPortal<{ url: string; complexo?: boolean }>(`${API_DOCUMENTOS}/${id}/abrir?formato=pdf`, { metodo: "POST", corpo: {} });
    setPreparando((p) => { const n = new Set(p); n.delete(id); return n; });
    if (!r.ok) return setFalhou(id);
    if (r.dados.complexo) setSimples((x) => new Set(x).add(id));
    window.location.assign(r.dados.url);
  }
  return { baixar, preparando, falhou, simples };
}
type Pdf = ReturnType<typeof usePdf>;

/** "Baixar" com os dois botões colados, Word e PDF, do mesmo peso (D23, decisões 1 e 2). */
function BaixarWordPdf({ id, curto, v = "", bx, pdf }: { id: string; curto: string; v?: string; bx: Bx; pdf: Pdf }) {
  const prep = pdf.preparando.has(id);
  return (
    <div className="pdf-bx-w">
      <span className="pdf-bx-rot" aria-hidden="true">Baixar</span>
      <div className="pdf-bx" role="group" aria-label={`Baixar ${curto}${v}`}>
        <button className="btn btn-sec btn-compacto" type="button" disabled={bx.baixando !== null} onClick={() => void bx.baixar(caminhoWord(id))}>
          <Icone nome="baixar" className="ico ico-s" /><span className="sr">Baixar em </span>Word<span className="sr"> (.docx, para editar){v}: {curto}</span>
        </button>
        {prep ? (
          <button className="btn btn-sec btn-compacto" type="button" aria-disabled="true" aria-describedby={`pdf-st-${id}`}>
            <span className="pdf-gira" aria-hidden="true" />Preparando o PDF<span className="sr">: {curto}</span>
          </button>
        ) : (
          <button className="btn btn-sec btn-compacto" type="button" onClick={() => void pdf.baixar(id)}>
            <Icone nome="baixar" className="ico ico-s" /><span className="sr">Baixar em </span>PDF
            <span className="sr"> (para mandar ou imprimir{pdf.simples.has(id) ? ", leiaute simples" : ""}){v}: {curto}</span>
          </button>
        )}
      </div>
    </div>
  );
}

/** A linha de situação do PDF sendo preparado (`role="status"`, apontada pelo botão). */
function StatusPdf({ id, curto, pdf }: { id: string; curto: string; pdf: Pdf }) {
  return (
    <div id={`pdf-st-${id}`} role="status">
      {pdf.preparando.has(id) ? (
        <p className="pdf-status"><Icone nome="relogio" className="ico ico-s" /><span><b>Preparando o PDF {curto.replace(/^(o|a) /, (m) => (m === "o " ? "do " : "da "))}.</b> Leva alguns segundos; o arquivo baixa sozinho. Pode continuar na tela.</span></p>
      ) : null}
    </div>
  );
}

/** O erro do PDF, preso ao documento: nada mudou e o Word continua (D23, decisão 4). */
function ErroPdf({ id, curto, bx, pdf }: { id: string; curto: string; bx: Bx; pdf: Pdf }) {
  if (pdf.falhou !== id) return null;
  const de = curto.replace(/^(o|a) /, (m) => (m === "o " ? "do " : "da "));
  return (
    <div className="pdf-erro">
      <Aviso tom="urgencia" titulo={`Não deu para preparar o PDF ${de}.`}
        acoes={<>
          <button className="btn btn-sec btn-compacto" type="button" onClick={() => void pdf.baixar(id)}><Icone nome="reenviar" className="ico ico-s" />Tentar de novo<span className="sr">: PDF {de}</span></button>
          <button className="btn btn-sec btn-compacto" type="button" disabled={bx.baixando !== null} onClick={() => void bx.baixar(caminhoWord(id))}><Icone nome="baixar" className="ico ico-s" />Baixar o Word<span className="sr"> (.docx, para editar): {curto}</span></button>
        </>}>
        Nada mudou no documento, e o Word continua para baixar. Tente de novo; se não sair, abra o Word e use Arquivo › Salvar como › PDF.
      </Aviso>
      <p className="codigo">PDF_INDISPONIVEL</p>
    </div>
  );
}

/** O aviso do leiaute simples, quando o modelo tem tabela, imagem, caixa de texto ou colunas (pergunta 1). */
function NotaSimples() {
  return (
    <p className="pdf-nota"><Icone nome="alerta" className="ico ico-s" /><span><b>O PDF sai num leiaute simples, no timbrado.</b> O texto é o mesmo do Word, mas a tabela e a imagem do seu modelo ficam só no Word. Para um PDF igual ao Word, salve como PDF pelo Word.</span></p>
  );
}

/** "Baixar o assinado (PDF)" ou "(foto)": o arquivo como foi anexado (pergunta 3). */
const formatoAssinado = (nome: string) => (/\.pdf$/i.test(nome) ? "PDF" : "foto");

function Reserva({ longa = false }: { longa?: boolean }) {
  return (
    <p className="pe-reserva" style={longa ? undefined : { margin: 0 }}>
      <Icone nome="lapis" className="ico" />
      <span>
        <b>Assinatura eletrônica: em estudo.</b>{" "}
        {longa ? "Quando existir, o botão para mandar assinar fica aqui. Por enquanto, imprime-se, assina-se e anexa-se o assinado."
          : "O lugar fica reservado. Por enquanto, o escritório imprime, colhe a assinatura e anexa o arquivo assinado."}
      </span>
    </p>
  );
}

function SeloSituacaoDoc({ tipo, falta, dia }: { tipo: TipoDocumentoContrato; falta: boolean; dia: string | null }) {
  return falta
    ? <Selo tom="atencao" icone="relogio">Falta anexar o assinado</Selo>
    : <Selo tom="ok" icone="check">{seloAssinado(tipo, dia)}</Selo>;
}

// ------------------------------------------------------------------------- 1. lista (decisões 1 a 4)

type Situacao = "TODOS" | "FALTA" | "ASSINADOS";

function ListaConteudo() {
  const [sit, setSit] = useState<Situacao>("TODOS");
  const [busca, setBusca] = useState("");
  const [q, setQ] = useState("");
  const [janela, setJanela] = useState<{ contrato: string; so?: string } | null>(null);
  const [feito, setFeito] = useState<Feito | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setQ(busca.trim()), 250);
    return () => clearTimeout(t);
  }, [busca]);
  const f = new URLSearchParams({ situacao: sit });
  if (q) f.set("q", q);
  const { dados, recarregar } = useCarga<ListaDocumentos>(`${API_DOCUMENTOS}?${f}`);
  const bx = useBaixar();
  const pdf = usePdf();
  const acoes = (
    <>
      <a className="btn btn-sec" href={ROTAS_DOCUMENTOS.modelos}><Icone nome="doc" className="ico" />Modelos de documento</a>
      {dados && dados !== "erro" && !dados.podeGerar ? null : <a data-muda className="btn btn-pri" href={ROTAS_DOCUMENTOS.gerar()}><Icone nome="pena" className="ico" />Gerar documentos</a>}
    </>
  );
  const cab = (
    <CabPeticoes titulo="Procurações e modelos" sobre="Contratos" acoes={acoes}
      lede="Contrato de honorários, procuração e declaração de hipossuficiência, com os dados do cliente e dos advogados, no timbrado do escritório." />
  );
  if (dados === "erro") return <div className="hn">{cab}<ErroAoCarregar oque="os documentos" aoTentar={recarregar} /></div>;
  if (!dados) return <div className="hn">{cab}<Carregando rotulo="Carregando os documentos…" linhas={4} /></div>;

  const vazio = !dados.contagem.todos && sit === "TODOS" && !q;
  const esperando = dados.esperandoContrato[0];
  const contratos = new Set(dados.documentos.map((d) => d.contrato.id)).size;

  return (
    <div className="hn">
      {cab}
      {vazio ? (
        <section className="folha" aria-label="Documentos gerados" style={{ overflow: "hidden" }}>
          <Estado icone="pena" titulo="Nenhum documento gerado ainda" nivel={2}
            acoes={
              <>
                <a className="btn btn-sec" href={ROTAS_DOCUMENTOS.modelos}><Icone nome="doc" className="ico" />Ver os modelos</a>
                {dados.podeGerar ? <a className="btn btn-pri" href={ROTAS_DOCUMENTOS.gerar()}><Icone nome="pena" className="ico" />Gerar os primeiros</a> : null}
              </>
            }>
            Aqui ficam o contrato, a procuração e a declaração gerados para cada contrato, com quem gerou e se o assinado já foi anexado. Dois passos para começar:
          </Estado>
          <ol className="pe-inicio" style={{ margin: "-8px auto 28px", padding: "0 24px" }}>
            <li><span className="disco"><span>1</span></span><span><b>Confira os modelos</b><small>Já vêm os três padrão do T3jus. Troque pelos do escritório: um .docx com os campos entre colchetes.</small></span></li>
            <li><span className="disco"><span>2</span></span><span><b>Gere a partir de um contrato</b><small>Pode ser um contrato em elaboração. Também dá para começar pela ficha do contrato, aba Documentos.</small></span></li>
          </ol>
        </section>
      ) : (
        <section className="folha" aria-labelledby="t-pr-l" style={{ overflow: "hidden" }}>
          <div className="folha-cab">
            <div>
              <h2 id="t-pr-l">Documentos gerados</h2>
              <p className="sub">Arquivo do Word, para revisar antes de imprimir. O que falta anexar vem primeiro.</p>
            </div>
          </div>
          <Busca id="pr-busca" rotulo="Buscar por cliente ou número do contrato" dica="Cliente ou número do contrato" valor={busca} aoMudar={setBusca}>
            <Chips rotulo="Situação da assinatura" atual={sit} aoEscolher={(v) => setSit(v as Situacao)}
              opcoes={[
                { v: "TODOS", t: `Todos (${dados.contagem.todos})` },
                { v: "FALTA", t: `Falta anexar o assinado (${dados.contagem.falta})` },
                { v: "ASSINADOS", t: `Assinados (${dados.contagem.assinados})` },
              ]} />
          </Busca>
          {esperando && dados.contagem.falta ? (
            <div style={{ padding: "0 24px 12px" }}>
              <Aviso tom="atencao" icone="relogio" titulo={dados.contagem.falta === 1 ? "1 documento espera o assinado." : `${dados.contagem.falta} documentos esperam o assinado.`}
                acoes={<button className="btn btn-sec" type="button" onClick={() => setJanela({ contrato: esperando.id })}><Icone nome="enviar" className="ico" />Anexar os de {primeiro(esperando.cliente)}</button>}>
                O contrato de {esperando.cliente} só fica ativo, e a programação dos recebimentos só vai ao Financeiro, quando o contrato assinado for anexado.
              </Aviso>
            </div>
          ) : null}
          {bx.falha ? <div style={{ padding: "0 24px 12px" }}><Aviso tom="urgencia" titulo="Não deu para baixar.">{bx.falha}</Aviso></div> : null}
          {dados.documentos.filter((d) => d.id === pdf.falhou).map((d) => (
            <div key={d.id} style={{ padding: "0 24px 12px" }}><ErroPdf id={d.id} curto={`${oDocumento(d.tipo, d.nome)} de ${primeiro(d.cliente.nome)}`} bx={bx} pdf={pdf} /></div>
          ))}
          <p className="pr-conta" role="status"><b>{contar(dados.documentos.length, "documento", "documentos")}</b> de {contar(contratos, "contrato", "contratos")}</p>
          {dados.documentos.length ? (
            <table className="hn-tab pe-tab pr-tab">
              <caption className="sr">Documentos gerados</caption>
              <colgroup>{["42%", "22%", "18%", "18%"].map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
              <thead><tr>{["Documento", "Cliente e contrato", "Assinatura"].map((x) => <th key={x} scope="col">{x}</th>)}<th scope="col"><span className="sr">Ações</span></th></tr></thead>
              <tbody>
                {dados.documentos.map((d) => (
                  <LinhaDoc key={d.id} d={d} bx={bx} pdf={pdf} aoAnexar={() => setJanela({ contrato: d.contrato.id, so: d.chave })} />
                ))}
              </tbody>
            </table>
          ) : (
            <Estado icone="busca" titulo="Nenhum documento encontrado">Confira o cliente ou o número do contrato, ou mostre todos.</Estado>
          )}
          <p className="hn-pe">
            <Icone nome="historico" className="ico" />
            <span>Gerar de novo guarda o anterior como versão. Nada é apagado: cada documento fica também na ficha do contrato, aba Documentos.</span>
          </p>
        </section>
      )}
      <div className="pr-apoio">
        <QuadroModelos />
        <QuadroAdvogados />
        <section className="folha" aria-labelledby="t-pr-as">
          <div className="folha-cab" style={{ paddingBottom: 8 }}><div><h2 id="t-pr-as" style={{ fontSize: 20 }}>Assinatura</h2></div></div>
          <div style={{ padding: "0 24px 20px" }}><Reserva /></div>
        </section>
      </div>
      {janela ? (
        <JanelaAssinados contrato={janela.contrato} so={janela.so} aoFechar={() => setJanela(null)}
          aoFeito={(r) => { setJanela(null); setFeito(feitoDosAssinados(r)); recarregar(); }} />
      ) : null}
      {feito ? <Toast feito={feito} aoFechar={() => setFeito(null)} /> : null}
    </div>
  );
}

function LinhaDoc({ d, bx, pdf, aoAnexar }: { d: LinhaDocumento; bx: Bx; pdf: Pdf; aoAnexar: () => void }) {
  const falta = d.situacao === "FALTA";
  const de = `${oDocumento(d.tipo, d.nome)} de ${primeiro(d.cliente.nome)}`;
  return (
    <tr className={falta ? "pr-falta" : undefined}>
      <td>
        <div className="pe-doc">
          <span className="pe-ci" aria-hidden="true"><Icone nome="doc" className="ico" /></span>
          <div>
            <b>{d.nome} <span className="pr-v">v{d.numero}</span></b>
            <small>{semExtensao(d.arquivo)}</small>
            <small>Gerado por {d.geradoPor.nome}, {quando(d.geradoEm)}</small>
            {d.marcados ? <SeloDados n={d.marcados} /> : null}
          </div>
        </div>
      </td>
      <td data-r="Cliente e contrato">
        <a className="pe-caso" href={ROTAS_DOCUMENTOS.documentosDoContrato(d.contrato.id)}>{d.cliente.nome}</a>
        <small className="pr-sub">{d.contrato.numero} · {d.contrato.estado === "ELABORACAO" ? "em elaboração" : d.contrato.estado === "ATIVO" ? "ativo" : "encerrado"}</small>
      </td>
      <td data-r="Assinatura">
        <SeloSituacaoDoc tipo={d.tipo} falta={falta} dia={d.assinado?.assinadoEm ?? null} />
        {falta && d.tipo === "CONTRATO" && d.contrato.estado === "ELABORACAO" ? <small className="pr-sub">O assinado ativa o contrato</small> : null}
      </td>
      <td>
        <div className="pr-acoes">
          {falta && d.contrato.estado !== "ENCERRADO" ? (
            <button className="btn btn-pri btn-compacto" type="button" onClick={aoAnexar}>
              <Icone nome="enviar" className="ico ico-s" />Anexar o assinado<span className="sr">: {de}</span>
            </button>
          ) : null}
          <BaixarWordPdf id={d.id} curto={de} bx={bx} pdf={pdf} />
        </div>
        <StatusPdf id={d.id} curto={de} pdf={pdf} />
        {pdf.simples.has(d.id) ? <NotaSimples /> : null}
      </td>
    </tr>
  );
}

function QuadroModelos() {
  const { dados } = useCarga<ListaModelosDocumento>(`${API_DOCUMENTOS}/modelos`);
  const lista = dados && dados !== "erro" ? dados.modelos : [];
  return (
    <section className="folha" aria-labelledby="t-pr-mo">
      <div className="folha-cab" style={{ paddingBottom: 8 }}>
        <div><h2 id="t-pr-mo" style={{ fontSize: 20 }}>Modelos</h2><p className="sub">O texto é do escritório; o T3jus preenche os campos.</p></div>
      </div>
      <ul className="pr-mini">
        {lista.map((m) => (
          <li key={m.id}>
            <span className="pe-ci" aria-hidden="true"><Icone nome="doc" className="ico" /></span>
            <span><b>{m.nome}</b><small>{m.padrao ? (m.emRevisao ? "Padrão T3jus · em revisão" : "Padrão T3jus") : `Do escritório · v${m.versao}`}</small></span>
          </li>
        ))}
        {dados === "erro" ? <li><span><small>Não deu para carregar os modelos.</small></span></li> : null}
      </ul>
      <div className="pe-lat-acoes"><a className="btn btn-sec" href={ROTAS_DOCUMENTOS.modelos}><Icone nome="doc" className="ico" />Modelos de documento</a></div>
    </section>
  );
}

function QuadroAdvogados() {
  const { dados } = useCarga<{ pessoas: PessoaComOab[] }>("/v1/escritorio/pessoas/oab");
  if (!dados || dados === "erro") return <section className="folha" aria-label="Advogados nos documentos"><p className="pe-nota" role="status"><span>{dados === "erro" ? "Não deu para carregar a Equipe." : "Carregando a Equipe…"}</span></p></section>;
  const com = dados.pessoas.filter((p) => p.oab.length);
  const sem = dados.pessoas.filter((p) => !p.oab.length).map((p) => p.nome);
  return (
    <section className="folha" aria-labelledby="t-pr-ad">
      <div className="folha-cab" style={{ paddingBottom: 8 }}>
        <div><h2 id="t-pr-ad" style={{ fontSize: 20 }}>Advogados nos documentos</h2><p className="sub">Nome e OAB vêm da Equipe.</p></div>
      </div>
      <ul className="hn-pessoas">
        {com.map((p) => (
          <li key={p.id}>
            <span className="av-p" aria-hidden="true">{iniciais(p.nome)}</span>
            <div><strong>{p.nome}</strong><small>{p.oab.map((i) => i.documento).join(" · ")}</small></div>
          </li>
        ))}
      </ul>
      <p className="hn-pe">
        <Icone nome="ajuda" className="ico" />
        <span>{sem.length ? `${juntar(sem)} ${sem.length === 1 ? "não tem" : "não têm"} OAB na Equipe e não ${sem.length === 1 ? "aparece" : "aparecem"} como outorgados. ` : ""}Cada advogado entra com todas as inscrições, a principal primeiro.</span>
      </p>
    </section>
  );
}

export function ProcuracoesContratosPortal() {
  return <MolduraArea area="CONTRATOS" secao="modelos">{() => <ListaConteudo />}</MolduraArea>;
}

// ------------------------------------------------------------------------- 2. modelos (decisões 5 e 6)

function ModelosConteudo() {
  const { dados, recarregar } = useCarga<ListaModelosDocumento>(`${API_DOCUMENTOS}/modelos`);
  const [janela, setJanela] = useState<{ alvo: ModeloDocumentoLinha | null } | null>(null);
  const [feito, setFeito] = useState<Feito | null>(null);
  const bx = useBaixar();
  const cab = (
    <CabPeticoes titulo="Modelos de documento" sobre={SOBRE} voltar={{ href: ROTAS_DOCUMENTOS.lista, nome: SOBRE }}
      lede="Os textos do escritório, em Word. O T3jus só preenche os campos entre colchetes; o resto fica como está."
      acoes={dados && dados !== "erro" && dados.podeEnviar ? (
        <button data-muda className="btn btn-pri" type="button" onClick={() => setJanela({ alvo: null })}><Icone nome="enviar" className="ico" />Enviar modelo</button>
      ) : undefined} />
  );
  if (dados === "erro") return <div className="hn">{cab}<ErroAoCarregar oque="os modelos" aoTentar={recarregar} /></div>;
  if (!dados) return <div className="hn">{cab}<Carregando rotulo="Carregando os modelos…" linhas={4} /></div>;
  const porGrupo = new Map<string, CampoDocumento[]>();
  for (const c of dados.campos) porGrupo.set(c.grupo, [...(porGrupo.get(c.grupo) ?? []), c]);
  const baixarModelo = (m: ModeloDocumentoLinha, codigo?: string, versao?: number) =>
    void bx.baixar(`${API_DOCUMENTOS}/modelos/${encodeURIComponent(codigo ?? m.id)}/abrir${versao ? `?versao=${versao}` : ""}`);

  return (
    <div className="hn">
      {cab}
      <div className="hn-grade">
        <div className="hn-col">
          <section className="folha" aria-labelledby="t-pr-ms" style={{ overflow: "hidden" }}>
            <div className="folha-cab">
              <div>
                <h2 id="t-pr-ms">Documentos</h2>
                <p className="sub">{contar(dados.modelos.length, "modelo", "modelos")} · {dados.modelos.filter((m) => !m.padrao).length} do escritório</p>
              </div>
            </div>
            {bx.falha ? <div style={{ padding: "0 24px 12px" }}><Aviso tom="urgencia" titulo="Não deu para baixar.">{bx.falha}</Aviso></div> : null}
            <ul className="pe-modelos">
              {dados.modelos.map((m) => (
                <li key={m.id} className={m.padrao ? undefined : "pe-do-esc"}>
                  <span className="pe-ci" aria-hidden="true"><Icone nome="doc" className="ico" /></span>
                  <div>
                    <strong>
                      {m.nome}
                      {m.padrao ? <Selo tom="neutro">Padrão T3jus</Selo> : <Selo tom="implant">Do escritório</Selo>}
                      {m.emRevisao ? <Selo tom="atencao" icone="relogio">Em revisão</Selo> : null}
                    </strong>
                    <small>
                      {m.padrao ? `Padrão T3jus, de ${diaBr(m.atualizadoEm.slice(0, 10))}` : `v${m.versao} · enviado por ${m.enviadoPor?.nome ?? "alguém da equipe"}, ${quando(m.atualizadoEm)}`}
                      {" · "}{contar(m.campos.length, "campo", "campos")} · usado {m.usos} {m.usos === 1 ? "vez" : "vezes"}
                    </small>
                    {m.codigos && m.codigos.length > 1 ? <small>Duas versões de texto: {m.codigos.map((c) => c.nome.replace(/^Declaração de hipossuficiência,? ?/i, "")).join(" e ")}. O T3jus escolhe pelo tipo do cliente.</small> : null}
                    {m.anteriores.length ? (
                      <details className="pr-ant">
                        <summary>Versões anteriores ({m.anteriores.length})</summary>
                        <ul>
                          {m.anteriores.map((a) => (
                            <li key={a.versaoId}>
                              <span><b>v{a.numero}</b> · {a.nomeArquivo} · {a.enviadoPor.nome}, {quando(a.enviadoEm)}<small>{a.usos ? `${contar(a.usos, "documento gerado", "documentos gerados")} com ela ${a.usos === 1 ? "continua" : "continuam"} como ${a.usos === 1 ? "estava" : "estavam"}.` : "Nenhum documento gerado com ela."}</small></span>
                              <button className="btn btn-sec btn-compacto" type="button" disabled={bx.baixando !== null} onClick={() => baixarModelo(m, undefined, a.numero)}>
                                <Icone nome="baixar" className="ico ico-s" />Baixar<span className="sr"> a versão {a.numero} de {m.nome}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </details>
                    ) : null}
                  </div>
                  <div className="pe-bts">
                    {(m.codigos && m.codigos.length > 1 ? m.codigos : [null]).map((c) => (
                      <button key={c?.codigo ?? "x"} className="btn btn-sec btn-compacto" type="button" disabled={bx.baixando !== null} onClick={() => baixarModelo(m, c?.codigo)}>
                        <Icone nome="baixar" className="ico ico-s" />{c ? (/jur/i.test(c.nome) ? "Baixar PJ" : "Baixar PF") : "Baixar"}<span className="sr"> o modelo {c?.nome ?? m.nome}</span>
                      </button>
                    ))}
                    {dados.podeEnviar ? (
                      <button className="btn btn-sec btn-compacto" type="button" onClick={() => setJanela({ alvo: m })}>
                        <Icone nome="trocar" className="ico ico-s" />{m.padrao ? "Usar o do escritório" : "Trocar"}<span className="sr">: {m.nome}</span>
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
            {dados.podeEnviar && !dados.modelos.some((m) => m.tipo === "OUTRO") ? (
              <div className="pr-outro">
                <Icone nome="mais" className="ico" />
                <span><b>Outros documentos do escritório.</b> Substabelecimento, declaração de residência, termo de acordo: envie como “Outro documento”, com os mesmos campos. Ele aparece como mais uma caixa na hora de gerar.</span>
                <button className="btn btn-sec btn-compacto" type="button" onClick={() => setJanela({ alvo: null })}><Icone nome="enviar" className="ico ico-s" />Enviar outro documento</button>
              </div>
            ) : null}
            <p className="hn-pe">
              <Icone nome="historico" className="ico" />
              <span>Trocar um modelo cria a versão nova e guarda a anterior. Os documentos já gerados não mudam. Cada envio e cada troca ficam no histórico do escritório, com quem fez e quando.</span>
            </p>
          </section>
        </div>
        <aside className="hn-col" aria-label="Campos aceitos">
          <section className="folha" aria-labelledby="t-pr-cps">
            <div className="folha-cab" style={{ paddingBottom: 8 }}>
              <div><h2 id="t-pr-cps" style={{ fontSize: 20 }}>Campos aceitos</h2><p className="sub">Escreva no modelo do jeito que está aqui, com os colchetes.</p></div>
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
        </aside>
      </div>
      {janela ? (
        <JanelaModeloDoc modelos={dados.modelos} alvo={janela.alvo} aoFechar={() => setJanela(null)}
          aoFeito={(m) => {
            setJanela(null);
            setFeito({ titulo: "Modelo salvo", texto: m.versao > 1 ? `${m.nome} está na versão ${m.versao}. A anterior ficou guardada.` : `${m.nome} passa a valer nos próximos documentos.` });
            recarregar();
          }} />
      ) : null}
      {feito ? <Toast feito={feito} aoFechar={() => setFeito(null)} /> : null}
    </div>
  );
}

function JanelaModeloDoc({ modelos, alvo, aoFechar, aoFeito }: {
  modelos: ModeloDocumentoLinha[]; alvo: ModeloDocumentoLinha | null; aoFechar: () => void; aoFeito: (m: ModeloDocumentoLinha) => void;
}) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [conf, setConf] = useState<ConferenciaModeloDocumento | null>(null);
  const [conferindo, setConferindo] = useState(false);
  const [erroArq, setErroArq] = useState<string | null>(null);
  const [nome, setNome] = useState(alvo && !alvo.padrao ? alvo.nome : alvo ? `${alvo.nome} do escritório` : "");
  const [tipo, setTipo] = useState<TipoDocumentoContrato | "">(alvo?.tipo ?? "");
  const [erros, setErros] = useState<string[]>([]);
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);
  const tem = (c: string) => erros.includes(c);
  // Versão nova só do modelo do escritório do mesmo tipo; trocar o padrão cria o modelo do escritório.
  const atual = tipo && tipo !== "OUTRO" ? modelos.find((m) => m.tipo === tipo && !m.padrao) : alvo && !alvo.padrao && alvo.tipo === "OUTRO" ? alvo : null;

  async function conferir(f: File, t: TipoDocumentoContrato | "") {
    setConferindo(true);
    const r = await chamarPortal<ConferenciaModeloDocumento>(`${API_DOCUMENTOS}/modelos/conferir?tipo=${t || "OUTRO"}`, { bruto: f });
    setConferindo(false);
    if (r.ok) return setConf(r.dados);
    if (r.erro.detalhes?.motivo) return setErroArq(erroDoArquivo(r.erro.detalhes.motivo));
    setFalha(textoDoErro(r.erro));
  }

  async function escolher(f: File | undefined) {
    if (!f) return;
    setArquivo(f);
    setConf(null);
    setErroArq(null);
    setFalha(null);
    setErros((e) => e.filter((x) => x !== "arquivo"));
    if (f.size > 5 * 1024 * 1024) return setErroArq(erroDoArquivo("ARQUIVO_GRANDE"));
    if (!nome.trim()) setNome(f.name.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").slice(0, 120));
    await conferir(f, tipo);
  }

  async function salvar() {
    setFalha(null);
    const e: string[] = [];
    if (!arquivo || erroArq) e.push("arquivo");
    if (nome.trim().length < 3) e.push("nome");
    if (!tipo) e.push("tipo");
    setErros(e);
    if (e.length) {
      if (e[0] === "arquivo") return requestAnimationFrame(() => document.getElementById("md-arq-bt")?.focus());
      return focarPrimeiroErro(document.getElementById("janela-modelo-doc"));
    }
    const q = new URLSearchParams({ nome: nome.trim(), tipo, arquivo: arquivo!.name.slice(0, 200).replace(/[/\\]/g, "-") });
    const caminho = atual ? `${API_DOCUMENTOS}/modelos/${atual.id}/versoes?${q}` : `${API_DOCUMENTOS}/modelos?${q}`;
    setEnviando(true);
    const r = await chamarPortal<{ modelo: ModeloDocumentoLinha }>(caminho, { bruto: arquivo! });
    setEnviando(false);
    if (r.ok) return aoFeito(r.dados.modelo);
    if (r.erro.detalhes?.motivo && String(r.erro.detalhes.motivo).startsWith("ARQUIVO")) return setErroArq(erroDoArquivo(r.erro.detalhes.motivo));
    setFalha(textoDoErro(r.erro));
  }

  const botao = atual ? `Salvar como v${atual.versao + 1}` : "Salvar modelo";
  return (
    <Janela id="janela-modelo-doc" classe="pe-larga" aberta aoFechar={aoFechar} sobretitulo="Modelos de documento" titulo="Enviar modelo" descricao="md-desc" aoEnviar={() => void salvar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-pri" type="submit" disabled={enviando || conferindo}><Icone nome="check" className="ico" />{enviando ? "Salvando…" : botao}</button>
        </>
      }>
      <p id="md-desc" className="sr">Um .docx do escritório com os campos entre colchetes. Conferimos os campos assim que o arquivo chega.</p>
      {erroArq && tem("arquivo") ? (
        <Aviso tom="urgencia" titulo="O modelo não foi salvo.">Escolha um arquivo .docx de até 5 MB.{atual ? ` O modelo atual (v${atual.versao}) continua valendo.` : " O modelo atual continua valendo."}</Aviso>
      ) : null}
      {falha ? <Aviso tom="urgencia" titulo="O modelo não foi salvo.">{falha}</Aviso> : null}
      <div className="form-folha" style={{ padding: 0 }}>
        <div className="campo c6">
          <p className="pe-rot" id="md-arq-r">Arquivo do modelo</p>
          <input ref={entrada} type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="sr" tabIndex={-1}
            aria-hidden="true" onChange={(e) => { void escolher(e.target.files?.[0]); e.target.value = ""; }} />
          <div className={erroArq ? "pe-arq erro" : "pe-arq"} role="group" aria-labelledby="md-arq-r">
            <span className="pe-ci" aria-hidden="true"><Icone nome="doc" className="ico" /></span>
            <div>
              <b>{arquivo ? arquivo.name : "Nenhum arquivo escolhido"}</b>
              <small>{arquivo ? `${/\.docx$/i.test(arquivo.name) ? "Word" : arquivo.name.split(".").pop()?.toUpperCase()} · ${tamanhoArquivo(arquivo.size)}${conferindo ? " · conferindo…" : conf ? " · conferido agora" : ""}` : "O .docx do escritório"}</small>
            </div>
            <button id="md-arq-bt" className="btn btn-sec btn-compacto" type="button" onClick={() => entrada.current?.click()} data-foco={arquivo ? undefined : ""}
              aria-describedby={descritoPor((erroArq || tem("arquivo")) && "md-arq-er")}>
              <Icone nome="enviar" className="ico ico-s" />{erroArq ? "Escolher outro arquivo" : arquivo ? "Trocar arquivo" : "Escolher arquivo"}
            </button>
          </div>
          {erroArq ? <ErroCampo id="md-arq-er">{erroArq}</ErroCampo> : tem("arquivo") ? <ErroCampo id="md-arq-er">Escolha o .docx do modelo.</ErroCampo> : (
            <p className="ajuda">Só .docx, até 5 MB. PDF, .doc antigo e arquivos com macro (.docm) não servem.</p>
          )}
        </div>
        <div className="campo c3">
          <label htmlFor="md-tipo">Documento</label>
          <select className="entrada" id="md-tipo" value={tipo} onChange={(e) => { const t = e.target.value as TipoDocumentoContrato; setTipo(t); if (arquivo && !erroArq) void conferir(arquivo, t); }}
            aria-invalid={tem("tipo") || undefined} aria-describedby={descritoPor(tem("tipo") && "md-tipo-er")}>
            <option value="">Escolha</option>
            {TIPOS_DOCUMENTO_CONTRATO.map((t) => <option key={t} value={t}>{DOCUMENTOS_CONTRATO[t]}</option>)}
          </select>
          {tem("tipo") ? <ErroCampo id="md-tipo-er">Escolha qual documento é este modelo.</ErroCampo> : null}
        </div>
        <div className="campo c3">
          <label htmlFor="md-nome">Nome do modelo</label>
          <input className="entrada" id="md-nome" type="text" autoComplete="off" maxLength={120} value={nome} onChange={(e) => setNome(e.target.value)}
            aria-invalid={tem("nome") || undefined} aria-describedby={descritoPor("md-nome-aj", tem("nome") && "md-nome-er")} />
          <p className="ajuda" id="md-nome-aj">Como aparece na hora de gerar.</p>
          {tem("nome") ? <ErroCampo id="md-nome-er">Escreva o nome do modelo, com 3 letras ou mais.</ErroCampo> : null}
        </div>
        <p className="ajuda c6" role="status">
          {!tipo ? "Escolha o documento para saber o que este modelo substitui."
            : tipo === "OUTRO" ? (atual ? `Versão nova de ${atual.nome}. A v${atual.versao} fica guardada.` : "Entra como um documento a mais, que aparece como mais uma caixa na hora de gerar.")
            : atual ? `Substitui ${atual.nome}, v${atual.versao}, do escritório. A versão anterior fica guardada e os documentos já gerados não mudam.`
            : `Substitui o padrão do T3jus (${DOCUMENTOS_CONTRATO[tipo]}). Os documentos já gerados com ele não mudam.`}
        </p>
        {conf ? (
          <section className="pe-conf c6" aria-labelledby="md-conf-t">
            <h3 id="md-conf-t"><Icone nome="doc" className="ico" />Conferimos o arquivo: {contar(conf.campos.length, "campo", "campos")}{conf.desconhecidos.length ? `, ${contar(conf.desconhecidos.length, "desconhecido", "desconhecidos")}` : ""}</h3>
            {conf.campos.length ? (
              <ul className="pe-chips" aria-label="Campos encontrados">
                {conf.campos.map((c) => conf.desconhecidos.some((d) => d.campo === c)
                  ? <li key={c} className="pe-desc"><Icone nome="alerta" className="ico" /><code className="pe-code">[{c}]</code><span className="sr">: campo desconhecido</span></li>
                  : <li key={c}><Icone nome="check" className="ico" /><code className="pe-code">[{c}]</code></li>)}
              </ul>
            ) : null}
            {conf.desconhecidos.map((d) => (
              <Aviso key={d.campo} tom="atencao" icone="alerta" titulo={`O T3jus não conhece o campo [${d.campo}].`}>
                {d.peticao ? "Este campo é das petições. " : ""}No documento, ele sai do jeito que está, entre colchetes, para completar no Word.{d.sugestao ? ` Para preencher sozinho, troque no Word por [${d.sugestao}] e envie de novo.` : ""} Dá para salvar assim.
              </Aviso>
            ))}
            {conf.faltaEsperado ? (
              <Aviso tom="atencao" icone="alerta" titulo={`Falta o campo [${conf.faltaEsperado.campo}].`}>
                Sem ele, {conf.faltaEsperado.sem}. Se o texto já está escrito no modelo, tudo bem. Dá para salvar assim.
              </Aviso>
            ) : null}
            {conf.semCampos ? (
              <Aviso tom="atencao" icone="alerta" titulo="Nenhum campo conhecido neste arquivo.">
                O documento vai sair igual ao modelo, sem dados do cadastro. Confira a lista de campos aceitos. Dá para salvar assim.
              </Aviso>
            ) : null}
          </section>
        ) : null}
      </div>
    </Janela>
  );
}

export function ModelosDocumentoPortal() {
  return <MolduraArea area="CONTRATOS" secao="modelos" trilha={[{ nome: "Modelos de documento" }]}>{() => <ModelosConteudo />}</MolduraArea>;
}

// ------------------------------------------------------------------------- 3. gerar (decisões 7 a 16)

function EscolherContrato() {
  const { dados, recarregar } = useCarga<ListaContratos>("/v1/escritorio/contratos?mostrar=ATIVOS");
  const [escolhido, setEscolhido] = useState("");
  const [erro, setErro] = useState(false);
  const cab = <CabPeticoes titulo="Gerar documentos" sobre={SOBRE} voltar={{ href: ROTAS_DOCUMENTOS.lista, nome: SOBRE }} lede="Os documentos saem sempre de um contrato: é nele que ficam os advogados, as condições e o assinado." />;
  if (dados === "erro") return <div className="hn">{cab}<ErroAoCarregar oque="os contratos" aoTentar={recarregar} /></div>;
  if (!dados) return <div className="hn">{cab}<Carregando rotulo="Carregando os contratos…" linhas={4} /></div>;
  const ordem = (c: ContratoLinha) => (c.situacao === "ELABORACAO" ? 0 : 1);
  const lista = [...dados.contratos].sort((a, b) => ordem(a) - ordem(b));
  return (
    <div className="hn">
      {cab}
      <section className="folha" aria-labelledby="t-pr-ec">
        <div className="folha-cab"><div><h2 id="t-pr-ec">De qual contrato?</h2><p className="sub">Os em elaboração vêm primeiro, depois os ativos.</p></div></div>
        {lista.length ? (
          <form onSubmit={(e) => { e.preventDefault(); if (!escolhido) { setErro(true); return focarPrimeiroErro(e.currentTarget); } irPara(ROTAS_DOCUMENTOS.gerar(escolhido)); }}>
            <fieldset className="pe-fs" aria-describedby={descritoPor(erro && "pr-ec-er")}>
              <legend className="sr">Contrato</legend>
              {erro ? <div style={{ padding: "0 24px" }}><ErroCampo id="pr-ec-er">Escolha o contrato.</ErroCampo></div> : null}
              <ul className="pe-escolhas">
                {lista.map((c, i) => (
                  <li key={c.id}>
                    <label className="opcao">
                      <input className="marcar" type="radio" name="contrato" value={c.id} checked={escolhido === c.id} aria-invalid={(erro && i === 0) || undefined}
                        onChange={() => { setEscolhido(c.id); setErro(false); }} />
                      <span>
                        <strong>{c.cliente.nome}</strong>
                        <small className="pe-linha2">{c.numero} · {c.objeto}</small>
                        <small>{c.situacao === "ELABORACAO" ? "Em elaboração" : "Ativo"}</small>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
            <div className="form-pe pe-rodape" style={{ padding: "8px 24px 20px" }}>
              <a className="btn btn-fantasma" href={ROTAS_DOCUMENTOS.novoContrato}><Icone nome="mais" className="ico" />Cliente sem contrato? Criar um em elaboração</a>
              <button className="btn btn-pri" type="submit">Continuar<Icone nome="dir" className="ico" /></button>
            </div>
          </form>
        ) : (
          <Estado icone="pena" titulo="Nenhum contrato aberto" acoes={<a className="btn btn-pri" href={ROTAS_DOCUMENTOS.novoContrato}><Icone nome="mais" className="ico" />Criar contrato</a>}>
            Crie o contrato em elaboração: leva um minuto, e ele só vale quando o assinado for anexado.
          </Estado>
        )}
      </section>
    </div>
  );
}

/** Os erros que voltam do servidor: { campo: código }. */
const ARTIGO_FALTA: Record<DadoQueConta, string> = {
  NOME_COMPLETO: "o nome completo", TRATAMENTO: "o tratamento", NACIONALIDADE: "a nacionalidade", ESTADO_CIVIL: "o estado civil",
  CPF: "o CPF", RG: "o RG", ENDERECO: "o endereço profissional", OAB: "a OAB",
};
/** "o estado civil e o CPF". */
function listaFaltasArtigo(f: DadoQueConta[]): string {
  const r = f.map((k) => ARTIGO_FALTA[k]);
  return r.length <= 1 ? (r[0] ?? "") : `${r.slice(0, -1).join(", ")} e ${r.at(-1)}`;
}

/** No cartão do advogado: "Faltam 2" com o link para completar, ou "completos" (decisão 20). */
function DadosDoAdvogado({ a, escritorio, eu }: { a: DadosDocumentos["advogados"][number]; escritorio: DadosDocumentos["escritorio"]; eu?: string }) {
  if (!a.dados) return null;
  const f = faltasDoAdvogado(a.dados, a.inscricoes, escritorio).filter((x) => x !== "OAB");
  if (!f.length) {
    return (
      <p className="cd-adv-dados ok">
        <Icone nome="check" className="ico" />
        <span>Dados para os documentos completos.</span>
      </p>
    );
  }
  const txt = listaFaltasArtigo(f);
  return (
    <p className="cd-adv-dados">
      <span className="selo selo-atencao">{f.length === 1 ? "Falta 1" : `Faltam ${f.length}`}</span>
      <span>{txt.charAt(0).toUpperCase() + txt.slice(1)} de {primeiro(a.nome)} {f.length === 1 ? "sai marcado" : "saem marcados"}.</span>
      <a href={a.pessoaId === eu ? ROTAS_PORTAL.conta : rotaPessoaEquipe(a.pessoaId)} target="_blank" rel="noopener">
        {a.pessoaId === eu ? "Completar em Sua conta" : "Completar na Equipe"}
        <span className="sr"> (abre numa aba nova)</span>
      </a>
    </p>
  );
}

function motivosDe(e: { detalhes?: Record<string, unknown> }): Record<string, string> | null {
  const m = e.detalhes?.motivos;
  return m && typeof m === "object" ? (m as Record<string, string>) : null;
}

function GerarConteudo({ contrato, aoResultado }: { contrato: string; aoResultado: (r: ResultadoDocumentos, d: DadosDocumentos) => void }) {
  const [d, setD] = useState<DadosDocumentos | null | "erro" | "nao">(null);
  const [f, setF] = useState<FormDocumentos | null>(null);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [falha, setFalha] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);
  const [previa, setPrevia] = useState<PreviaDocumentos | null | "erro">(null);
  const [aba, setAba] = useState(0);
  const resumo = useRef<HTMLDivElement>(null);
  const form = useRef<HTMLFormElement>(null);

  const carregar = useCallback(async () => {
    const r = await chamarPortal<DadosDocumentos>(`/v1/escritorio/contratos/${contrato}/documentos-dados`);
    if (!r.ok) return setD(r.status === 404 ? "nao" : "erro");
    setD(r.dados);
    setF(formInicialDocumentos(r.dados));
  }, [contrato]);
  useEffect(() => { void Promise.resolve().then(() => carregar()); }, [carregar]);

  // A prévia acompanha o formulário (decisão 12), sem gravar nada.
  const chave = d && d !== "erro" && d !== "nao" && f ? JSON.stringify(pedidoDocumentos(d, f)) : "";
  useEffect(() => {
    if (!chave) return;
    const ped = JSON.parse(chave) as ReturnType<typeof pedidoDocumentos>;
    if (!ped.documentos.length || !ped.outorgados.length || ped.cidadeData.length < 3) return;
    let vivo = true;
    const t = setTimeout(() => {
      void chamarPortal<PreviaDocumentos>(`/v1/escritorio/contratos/${contrato}/documentos/previa`, { metodo: "POST", corpo: ped })
        .then((r) => { if (vivo) setPrevia(r.ok ? r.dados : "erro"); });
    }, 350);
    return () => { vivo = false; clearTimeout(t); };
  }, [chave, contrato]);

  const cab = (titulo: string, lede?: string) => <CabPeticoes titulo={titulo} sobre={SOBRE} voltar={{ href: ROTAS_DOCUMENTOS.lista, nome: SOBRE }} lede={lede} />;
  if (d === "erro") return <div className="hn">{cab("Gerar documentos")}<ErroAoCarregar oque="os dados do contrato" aoTentar={() => void carregar()} /></div>;
  if (d === "nao") return <div className="hn">{cab("Gerar documentos")}<ErroAoCarregar oque="o contrato" aoTentar={() => void carregar()} texto="Ele não existe ou é de outro escritório. Volte e escolha o contrato de novo." /></div>;
  if (!d || !f) return <div className="hn">{cab("Gerar documentos")}<Carregando rotulo="Carregando os dados do contrato…" linhas={5} /></div>;
  const dados = d;
  const form_ = f;

  const mudar = (x: Partial<FormDocumentos>) => { setF({ ...form_, ...x }); setFalha(null); };
  const tem = (k: string) => k in erros;
  const msg = (k: string) => ERROS_DOCUMENTO[erros[k] ?? ""] ?? "Confira este campo.";
  const cli = dados.cliente;
  const faltas = faltasNoDocumento(cli, dados.hoje);
  const quem = quemAssina(cli, dados.hoje);
  const faltasAdv = dados.advogados
    .filter((a) => form_.outorgados[a.pessoaId]?.length)
    .map((a) => ({ a, f: a.dados ? faltasDoAdvogado(a.dados, a.inscricoes, dados.escritorio).filter((x) => x !== "OAB") : [] }))
    .filter((x) => x.f.length);
  const assinadas = chavesAssinadas(dados);
  const semOab = dados.semOab.map((p) => p.nome);
  const docsPedido = dados.modelos.filter((m) => form_.docs.includes(chaveModelo(m)));
  const prev = previa && previa !== "erro" && previa.documentos.length ? previa : null;
  const abaAtual = prev ? Math.min(aba, prev.documentos.length - 1) : 0;
  const temProcuracao = form_.docs.includes("PROCURACAO");
  const hipoPj = cli.tipo === "PJ" && form_.docs.includes("HIPOSSUFICIENCIA");
  const atualDe = (k: string) => dados.atuais.find((a) => a.chave === k);

  function marcarDoc(k: string, sim: boolean) {
    mudar({ docs: sim ? [...form_.docs, k] : form_.docs.filter((x) => x !== k) });
  }
  function marcarAdv(id: string, sim: boolean) {
    const a = dados.advogados.find((x) => x.pessoaId === id)!;
    const o = { ...form_.outorgados };
    if (sim) o[id] = a.escolhidas.length ? [...a.escolhidas] : a.inscricoes.map((i) => i.id);
    else delete o[id];
    mudar({ outorgados: o });
  }
  function marcarInsc(id: string, insc: string, sim: boolean) {
    const atual = form_.outorgados[id] ?? [];
    const prox = sim ? [...atual, insc] : atual.filter((x) => x !== insc);
    const o = { ...form_.outorgados };
    if (prox.length) o[id] = prox; else delete o[id];
    mudar({ outorgados: o });
  }
  function marcarPoder(p: PoderEspecial, sim: boolean) {
    mudar({ poderes: CODIGOS_PODERES.filter((x) => (x === p ? sim : form_.poderes.includes(x))) });
  }

  async function gerar() {
    setFalha(null);
    const e = errosDocumentos(form_);
    setErros(e);
    if (Object.keys(e).length) return requestAnimationFrame(() => resumo.current?.focus());
    setGerando(true);
    const r = await chamarPortal<ResultadoDocumentos>(`/v1/escritorio/contratos/${contrato}/documentos`, { metodo: "POST", corpo: pedidoDocumentos(dados, form_) });
    setGerando(false);
    if (r.ok) return aoResultado(r.dados, dados);
    const m = motivosDe(r.erro);
    if (r.erro.codigo === "VALIDATION_ERROR" && m) {
      setErros(m);
      return requestAnimationFrame(() => resumo.current?.focus());
    }
    setFalha(textoDoErro(r.erro));
  }

  const vNova = dados.ultima ? botaoGerar(dados, form_).match(/versão (\d+)/)?.[1] : null;
  const assinadosAntes = dados.atuais.filter((a) => a.assinado);
  const nomesDoc = (ks: { tipo: TipoDocumentoContrato; modeloId: string | null }[]) =>
    juntar(ks.map((k) => nomeCurto(k.tipo, dados.modelos.find((m) => chaveModelo(m) === chaveModelo(k))?.nome).toLowerCase()));

  return (
    <div className="hn">
      {cab(dados.ultima ? "Gerar de novo" : "Gerar documentos")}
      {dados.ultima ? (
        <Aviso tom="info" icone="historico" titulo={`A versão anterior é de ${Quando(dados.ultima.em).toLowerCase()}, gerada por ${dados.ultima.por.nome}.`}>
          {(() => {
            const mud = dados.mudancas.length ? `Desde então mudou ${(dados.mudancas.flatMap((x) => x.campos)).length === 1 ? "um dado" : "o cadastro"} de ${primeiro(cli.nome)}.` : "O cadastro do cliente não mudou desde então.";
            return `${mud} A página abre com as mesmas escolhas. A versão anterior fica guardada.${assinadosAntes.length ? ` Já ${assinadosAntes.length === 1 ? "tem o assinado anexado" : "têm o assinado anexado"}: ${nomesDoc(assinadosAntes)}. ${assinadosAntes.length === 1 ? "A caixa vem desmarcada" : "As caixas vêm desmarcadas"}: o assinado continua valendo.` : ""}`;
          })()}
        </Aviso>
      ) : null}
      {Object.keys(erros).length ? (
        <div ref={resumo} tabIndex={-1} className="pr-resumo-erro">
          <Aviso tom="urgencia" titulo="Nada foi gerado.">
            Acerte {Object.keys(erros).length === 1 ? "o ponto abaixo" : `os ${Object.keys(erros).length} pontos abaixo`}. O que foi escolhido continua aqui.
            <ul>{Object.keys(erros).map((k) => <li key={k}><a href={`#pr-g-${k}`} onClick={(ev) => { ev.preventDefault(); document.getElementById(`pr-g-${k}`)?.focus(); }}>{RESUMO_ERRO_DOCUMENTO[k] ?? "Confira os dados"}</a></li>)}</ul>
          </Aviso>
        </div>
      ) : <div ref={resumo} tabIndex={-1} />}
      <div className="hn-grade pr-gerar">
        <div className="hn-col">
          <section className="folha" aria-labelledby="t-pr-g">
            <div className="folha-cab">
              <div><h2 id="t-pr-g">O que gerar</h2><p className="sub">Os dados vêm da ficha do cliente, do contrato e da Equipe. Os campos sem “(opcional)” são obrigatórios.</p></div>
            </div>
            <form ref={form} className="form-folha pe-form" noValidate onSubmit={(e) => { e.preventDefault(); void gerar(); }} id="pr-form">
              <div className="c6">
                <p className="pe-rot">Contrato</p>
                <div className="pr-contrato">
                  <span className="av-p" aria-hidden="true">{iniciais(cli.nome)}</span>
                  <span><b>{cli.nome}</b><small>{dados.contrato.numero} · {dados.contrato.objeto} · {dados.contrato.estado === "ELABORACAO" ? "em elaboração" : dados.contrato.estado === "ATIVO" ? "ativo" : "encerrado"}</small></span>
                  <a className="btn btn-sec btn-compacto" href={ROTAS_DOCUMENTOS.gerar()}><Icone nome="trocar" className="ico ico-s" />Trocar contrato</a>
                </div>
                <p className="ajuda">Veio da ficha do contrato. As condições, os advogados e as inscrições já estão lá.</p>
              </div>
              {faltasAdv.map(({ a, f }) => (
                <div className="c6" key={a.pessoaId}>
                  <Aviso tom="atencao" icone="pena"
                    titulo={`${f.length === 1 ? "Falta 1 dado" : `Faltam ${f.length} dados`} de ${a.nome}, ${a.dados?.tratamento === "ADVOGADA" ? "advogada" : "advogado"}: ${listaFaltasArtigo(f)}.`}
                    acoes={<a className="btn btn-sec" href={a.pessoaId === dados.eu ? ROTAS_PORTAL.conta : rotaPessoaEquipe(a.pessoaId)} target="_blank" rel="noopener"><Icone nome="lapis" className="ico" />{a.pessoaId === dados.eu ? "Completar os seus dados" : `Completar os dados de ${primeiro(a.nome)}`}<span className="sr"> (abre numa aba nova)</span></a>}>
                    Dá para gerar assim: a qualificação de {primeiro(a.nome)} sai com {f.length === 1 ? "o dado marcado" : "os dados marcados"}, como [CPF: falta], para preencher à mão ou no Word.
                  </Aviso>
                </div>
              ))}
              {faltas.length ? (
                <div className="c6">
                  <Aviso tom="atencao" icone="pena" titulo={tituloFaltas(faltas, cli.nome)}
                    acoes={<a className="btn btn-sec" href={ROTAS_DOCUMENTOS.cliente(cli.id)} target="_blank" rel="noopener"><Icone nome="lapis" className="ico" />Completar na ficha<span className="sr"> (abre numa aba nova)</span></a>}>
                    Dá para gerar assim: {docsPedido.length > 1 ? `os ${docsPedido.length} documentos saem` : "o documento sai"} com o dado marcado, como [RG: falta], para preencher à mão ou no Word. Ou complete a ficha antes.
                  </Aviso>
                </div>
              ) : null}
              {cli.tipo === "PF" && quem !== "PROPRIO" ? (
                <div className="c6">
                  <p className="pe-rot">Quem assina por {primeiro(cli.nome)}</p>
                  <div className="pe-dado">
                    <span>
                      <b>{cli.rlNome || "Não cadastrado"}</b>
                      <small>{[cli.rlPapel ? PAPEIS_RESPONSAVEL[cli.rlPapel] : null, cli.rlDocumento ? `CPF ${formatarDocumento(cli.rlDocumento)}` : null].filter(Boolean).join(" · ") || "Papel e CPF não cadastrados"}</small>
                    </span>
                    <span className="selo selo-implant">{rotuloQuemAssina(quem)}</span>
                    <a className="pe-completar" style={{ marginLeft: "auto" }} href={ROTAS_DOCUMENTOS.cliente(cli.id)} target="_blank" rel="noopener">Mudar na ficha<span className="sr"> (abre numa aba nova)</span></a>
                  </div>
                  <p className="ajuda">
                    {quem === "REPRESENTADO" ? `${primeiro(cli.nome)} tem menos de 16 anos: a procuração e o contrato saem com “neste ato representado(a) por…”, e só ${cli.rlNome ? primeiro(cli.rlNome) : "quem responde"} assina.`
                      : quem === "ASSISTIDO" ? `${primeiro(cli.nome)} tem 16 ou 17 anos: os documentos saem com “neste ato assistido(a) por…”, e os dois assinam.`
                      : quem === "CURATELA_ASSISTE" ? "Sob curatela, com assistência: os documentos saem com “neste ato assistido(a) por…”, e os dois assinam. Junte o termo de curatela à procuração."
                      : "Sob curatela: os documentos saem com “neste ato representado(a) por…”, e só quem foi nomeado pelo juiz assina. Junte o termo de curatela à procuração."}
                  </p>
                </div>
              ) : null}
              {cli.tipo === "PJ" ? (
                <div className="c6">
                  <p className="pe-rot">Quem assina pela empresa</p>
                  <div className="pe-dado">
                    <span><b>{cli.repNome || "Não cadastrado"}</b><small>{[cli.repCargo, cli.repDocumento ? `CPF ${cli.repDocumento}` : null].filter(Boolean).join(" · ") || "Cargo e CPF não cadastrados"}</small></span>
                    <a className="pe-completar" style={{ marginLeft: "auto" }} href={ROTAS_DOCUMENTOS.cliente(cli.id)} target="_blank" rel="noopener">Mudar na ficha</a>
                  </div>
                  <p className="ajuda">A procuração e o contrato saem com “neste ato representada por…”, e a assinatura sai em nome da empresa, por quem a representa.</p>
                </div>
              ) : null}

              <fieldset className="pe-fs c6" id="pr-g-documentos" tabIndex={-1} aria-describedby={descritoPor(tem("documentos") && "pr-doc-er")}>
                <legend>Documentos</legend>
                {tem("documentos") ? <ErroCampo id="pr-doc-er">{msg("documentos")}</ErroCampo> : null}
                <div className="pe-partes">
                  {dados.modelos.map((m) => {
                    const k = chaveModelo(m);
                    const at = atualDe(k);
                    const ja = assinadas.has(k);
                    return (
                      <label className="opcao" key={k}>
                        <input className="marcar" type="checkbox" checked={form_.docs.includes(k)} aria-invalid={tem("documentos") || undefined} onChange={(e) => marcarDoc(k, e.target.checked)} />
                        <span>
                          <strong style={{ fontWeight: 500 }}>{m.nome}</strong>
                          <small>{O_QUE_LEVA[m.tipo]} {origemModelo(m)}.</small>
                          {ja ? <small><b>{k === "CONTRATO" && dados.contrato.assinadoEm ? `Já assinado em ${diaBr(dados.contrato.assinadoEm)}.` : `A v${at?.numero ?? 1} já tem o assinado.`}</b> Gere de novo só se o documento mudou.</small> : null}
                          {m.tipo === "HIPOSSUFICIENCIA" && cli.tipo === "PJ" ? (
                            <small className="pr-pj">Para a empresa, a declaração sozinha não basta: o juiz pede prova de que ela não pode pagar as custas (Súmula 481 do STJ). Sai a versão para pessoa jurídica, que diz que a prova vai junto.</small>
                          ) : null}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset className="pe-fs pe-adv-fs c6" id="pr-g-outorgados" tabIndex={-1} aria-describedby={descritoPor(tem("outorgados") && "pr-adv-er", "pr-adv-aj")}>
                <legend>Advogados outorgados<small>dados da Equipe e de Sua conta</small></legend>
                {tem("outorgados") ? <ErroCampo id="pr-adv-er">{msg("outorgados")}</ErroCampo> : null}
                {dados.advogados.length ? (
                  <div className="pe-adv">
                    {dados.advogados.map((a) => {
                      const marcado = !!form_.outorgados[a.pessoaId]?.length;
                      return (
                        <div className="pe-a" key={a.pessoaId}>
                          <label className="opcao">
                            <input className="marcar" type="checkbox" checked={marcado} aria-invalid={tem("outorgados") || undefined} onChange={(e) => marcarAdv(a.pessoaId, e.target.checked)} />
                            <span><strong style={{ fontWeight: 500 }}>{a.nome}</strong><small>{a.responsavel ? "Responsável pelo contrato" : a.noContrato ? "Advogado no contrato" : "Não está no contrato"}</small></span>
                          </label>
                          {a.inscricoes.length > 1 ? (
                            <fieldset className="pe-insc" disabled={!marcado}>
                              <legend>Inscrições de {primeiro(a.nome)} nestes documentos</legend>
                              {a.inscricoes.map((i) => (
                                <label className="opcao" key={i.id}>
                                  <input className="marcar" type="checkbox" checked={form_.outorgados[a.pessoaId]?.includes(i.id) ?? false} onChange={(e) => marcarInsc(a.pessoaId, i.id, e.target.checked)} />
                                  <span>{i.documento}<small>{i.tipo === "PRINCIPAL" ? "principal" : i.tipo === "SUPLEMENTAR" ? "suplementar" : "transferida"}</small></span>
                                </label>
                              ))}
                            </fieldset>
                          ) : a.inscricoes[0] ? <p className="pe-insc-uma">{a.inscricoes[0].documento}<small>única inscrição</small></p> : null}
                          <DadosDoAdvogado a={a} escritorio={dados.escritorio} eu={dados.eu} />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <Aviso tom="atencao" titulo="Ninguém com OAB na Equipe.">A sócia dona cadastra a OAB de cada advogado em Equipe. Sem advogado, os documentos não têm outorgado.</Aviso>
                )}
                <p className="ajuda" id="pr-adv-aj">
                  Vêm marcados os advogados do contrato. Mudar aqui vale só para estes documentos.
                  {semOab.length ? ` Sem OAB na Equipe, não aparecem: ${juntar(semOab)}.` : ""}
                </p>
                <p className="pe-sai" aria-live="polite"><Icone nome="pena" className="ico" /><span><b>No documento:</b> {fraseNoDocumentoOutorgados(dados, form_)}</span></p>
              </fieldset>

              {temProcuracao ? (
                <>
                  <fieldset className="pe-fs c6" id="pr-g-poderes" tabIndex={-1} aria-describedby={descritoPor("pr-pod-aj", tem("poderes") && "pr-pod-er")}>
                    <legend>Poderes especiais da procuração</legend>
                    <p className="ajuda" id="pr-pod-aj" style={{ marginTop: -4 }}>Os poderes gerais (<i>ad judicia et extra</i>) já estão no modelo. Marque os que precisam estar escritos (art. 105 do Código de Processo Civil).</p>
                    {tem("poderes") ? <ErroCampo id="pr-pod-er">{msg("poderes")}</ErroCampo> : null}
                    <div className="pr-poderes">
                      {CODIGOS_PODERES.map((p) => (
                        <label className="opcao" key={p}>
                          <input className="marcar" type="checkbox" checked={form_.poderes.includes(p)} onChange={(e) => marcarPoder(p, e.target.checked)} />
                          <span>{PODERES_TELA[p].rotulo}{PODERES_TELA[p].ajuda ? <small>{PODERES_TELA[p].ajuda}</small> : null}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <div className="campo c6">
                    <label htmlFor="pr-g-outroPoder">Outro poder<span className="opcional"> (opcional)</span></label>
                    <input className="entrada" id="pr-g-outroPoder" type="text" autoComplete="off" maxLength={300} value={form_.outroPoder} onChange={(e) => mudar({ outroPoder: e.target.value })}
                      aria-invalid={tem("outroPoder") || undefined} aria-describedby={descritoPor("pr-op-aj", tem("outroPoder") && "pr-op-er")} />
                    <p className="ajuda" id="pr-op-aj">Escreva como deve sair no documento. Ex.: representar perante o INSS e ter vista de processos administrativos.</p>
                    {tem("outroPoder") ? <ErroCampo id="pr-op-er">{msg("outroPoder")}</ErroCampo> : null}
                  </div>
                </>
              ) : null}
              <div className="campo c6">
                <label htmlFor="pr-g-cidadeData">Cidade e data</label>
                <input className="entrada" id="pr-g-cidadeData" type="text" autoComplete="off" maxLength={120} value={form_.cidadeData} onChange={(e) => mudar({ cidadeData: e.target.value })}
                  aria-invalid={tem("cidadeData") || undefined} aria-describedby={descritoPor("pr-cd-aj", tem("cidadeData") && "pr-cd-er")} />
                <p className="ajuda" id="pr-cd-aj">Do endereço do escritório e de hoje. Mude se a assinatura for em outro dia.</p>
                {tem("cidadeData") ? <ErroCampo id="pr-cd-er">{msg("cidadeData")}</ErroCampo> : null}
              </div>
            </form>
          </section>
        </div>
        <aside className="hn-col" aria-label="Prévia dos documentos">
          <section className="folha pr-previa" aria-labelledby="t-pr-pv">
            <div className="folha-cab" style={{ paddingBottom: 8 }}>
              <div><h2 id="t-pr-pv" style={{ fontSize: 20 }}>Prévia</h2><p className="sub">O começo de cada documento, com os dados de agora.</p></div>
            </div>
            <LegendaPrevia />
            {prev ? (
              <>
                <div className="pr-abas" role="tablist" aria-label="Documentos da prévia"
                  onKeyDown={(e) => {
                    const n = prev.documentos.length;
                    const ir = e.key === "ArrowRight" ? (abaAtual + 1) % n : e.key === "ArrowLeft" ? (abaAtual - 1 + n) % n : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : null;
                    if (ir === null) return;
                    e.preventDefault();
                    setAba(ir);
                    requestAnimationFrame(() => document.getElementById(`pr-aba-${ir}`)?.focus());
                  }}>
                  {prev.documentos.map((x, i) => (
                    <button key={i} id={`pr-aba-${i}`} type="button" role="tab" aria-selected={i === abaAtual} aria-controls="pr-painel" tabIndex={i === abaAtual ? 0 : -1} onClick={() => setAba(i)}>
                      {nomeCurto(x.tipo, x.nome)}
                      {seloAba(x.marcados.length) ? <span className="pr-falta-n">{seloAba(x.marcados.length)}</span> : <span className="sr"> (nada marcado)</span>}
                    </button>
                  ))}
                </div>
                <div id="pr-painel" role="tabpanel" aria-labelledby={`pr-aba-${abaAtual}`} tabIndex={0} className="pe-papel-folha pe-mini pr-papel">
                  <Papel paragrafos={prev.documentos[abaAtual]!.paragrafos} timbre={dados.escritorio.nome}
                    resto={`${origemModelo(dados.modelos.find((m) => m.tipo === prev.documentos[abaAtual]!.tipo && (m.tipo !== "OUTRO" || m.modeloId === prev.documentos[abaAtual]!.modeloId)) ?? { padrao: "CONTRATO", numero: null, emRevisao: false })}. O T3jus não muda o texto do modelo; só troca os campos.`}
                    rascunho={dados.modelos.some((m) => m.tipo === prev.documentos[abaAtual]!.tipo && m.emRevisao)} />
                </div>
              </>
            ) : (
              <p className="pe-nota" role="status">
                <Icone nome="doc" className="ico" />
                <span>{previa === "erro" ? "Não deu para montar a prévia agora. Dá para gerar assim mesmo." : !form_.docs.length ? "Marque um documento para ver a prévia." : !Object.keys(form_.outorgados).length ? "Marque um advogado para ver a prévia." : "Montando a prévia…"}</span>
              </p>
            )}
          </section>
        </aside>
      </div>
      <section className="folha pr-faixa" aria-label="Gerar">
        <div>
          <p><b>{fraseVaoSair(dados, form_)}</b></p>
          <p className="sub">
            {prev ? prev.frase : faltas.length ? "Algum dado sai marcado, para completar." : "Nenhum dado sai marcado."} Cada geração fica registrada, com quem gerou e quando.
            {hipoPj ? " Junte à declaração da empresa a prova de que ela não pode pagar as custas." : ""}
          </p>
          {falha ? <Aviso tom="urgencia" titulo="Nada foi gerado.">{falha}</Aviso> : null}
        </div>
        <div className="pr-faixa-bt">
          <a className="btn btn-fantasma" href={ROTAS_DOCUMENTOS.lista}>Cancelar</a>
          <button className="btn btn-pri" type="submit" form="pr-form" disabled={gerando} aria-busy={gerando || undefined}>
            <Icone nome="doc" className="ico" />{gerando ? "Gerando…" : vNova ? `Gerar a versão ${vNova}` : botaoGerar(dados, form_)}
          </button>
        </div>
      </section>
    </div>
  );
}

function Resultado({ r, d, aoAnexar }: { r: ResultadoDocumentos; d: DadosDocumentos; aoAnexar: () => void }) {
  const bx = useBaixar();
  const pdf = usePdf();
  const zip = useRef<HTMLButtonElement>(null);
  useEffect(() => { zip.current?.focus(); }, []);
  const marcados = [...new Set(r.documentos.flatMap((x) => x.marcados))];
  const versao = Math.max(...r.documentos.map((x) => x.numero));
  const u = r.usado;
  const pn = primeiro(d.cliente.nome);
  return (
    <div className="hn">
      <CabPeticoes titulo="Documentos gerados" sobre={SOBRE} voltar={{ href: ROTAS_DOCUMENTOS.lista, nome: SOBRE }} />
      <div className="hn-grade">
        <div className="hn-col">
          <section className="folha" aria-labelledby="t-pr-r">
            <div className="folha-cab">
              <div>
                <h2 id="t-pr-r">{r.documentos.length === 1 ? "1 documento pronto" : `${r.documentos.length} documentos prontos`}</h2>
                <p className="sub">{d.contrato.numero} · {d.cliente.nome} · versão {versao} · gerados agora por {u.por.nome}</p>
              </div>
              <button ref={zip} className="btn btn-pri" type="button" disabled={bx.baixando !== null} onClick={() => void bx.baixar(`${API_DOCUMENTOS}/geracoes/${r.geracaoId}/zip`)}>
                <Icone nome="baixar" className="ico" />Baixar todos (.zip)<span className="sr">, em Word e PDF</span>
              </button>
            </div>
            <div className="pe-pronto">
              {bx.falha ? <Aviso tom="urgencia" titulo="Não deu para baixar.">{bx.falha}</Aviso> : null}
              {r.documentos.map((x) => (
                <Fragment key={x.id}>
                  <div className="pe-arq">
                    <span className="pe-ci" aria-hidden="true"><Icone nome="doc" className="ico" /></span>
                    <div><b>{x.nome}</b><small>{semExtensao(x.arquivo)} · Word e PDF</small></div>
                    <BaixarWordPdf id={x.id} curto={oDocumento(x.tipo, x.nome)} bx={bx} pdf={pdf} />
                  </div>
                  <StatusPdf id={x.id} curto={oDocumento(x.tipo, x.nome)} pdf={pdf} />
                  <ErroPdf id={x.id} curto={oDocumento(x.tipo, x.nome)} bx={bx} pdf={pdf} />
                  {pdf.simples.has(x.id) ? <NotaSimples /> : null}
                </Fragment>
              ))}
              {marcados.length ? (
                <Aviso tom="atencao" icone="pena" titulo={`Saiu marcado: ${juntar(marcados)}.`}
                  acoes={<a className="btn btn-sec" href={ROTAS_DOCUMENTOS.cliente(d.cliente.id)}><Icone nome="lapis" className="ico" />Completar na ficha</a>}>
                  Preencha à mão ou no Word. Ou complete a ficha e gere de novo: a versão {versao} fica guardada.
                </Aviso>
              ) : null}
              <p className="pe-cuidado" style={{ margin: 0 }}><Icone nome="balanca" className="ico" /><span><b>Você revisa antes de imprimir.</b> O T3jus preencheu os modelos com os dados do cadastro e do contrato. Ele não confere o conteúdo jurídico.</span></p>
              <ol className="pe-proximo">
                <li><span><b>Revise no Word</b> os dados marcados, a concordância e as cláusulas.</span></li>
                <li><span><b>Imprima</b> no timbrado. O arquivo já sai com ele.</span></li>
                <li><span><b>Colha as assinaturas:</b> {pn} {r.documentos.length > 1 ? "em todos" : "no documento"}{r.documentos.some((x) => x.tipo === "CONTRATO") ? "; no contrato, também quem assina pelo escritório" : ""}.</span></li>
                <li><span><b>Anexe os assinados.</b>{r.documentos.some((x) => x.tipo === "CONTRATO") && d.contrato.estado === "ELABORACAO" ? " O contrato assinado ativa o contrato e manda a programação dos recebimentos ao Financeiro." : " Ficam guardados no contrato."}</span></li>
              </ol>
              <div className="pe-acoes-res">
                <button className="btn btn-sec" type="button" onClick={aoAnexar}><Icone nome="enviar" className="ico" />Anexar os assinados</button>
                <a className="btn btn-fantasma" href={ROTAS_DOCUMENTOS.documentosDoContrato(d.contrato.id)}><Icone nome="dir" className="ico" />Ir para o contrato {d.contrato.numero}</a>
              </div>
            </div>
            <Reserva longa />
          </section>
        </div>
        <aside className="hn-col" aria-label="O que foi usado">
          <section className="folha" aria-labelledby="t-pr-u">
            <div className="folha-cab" style={{ paddingBottom: 8 }}><div><h2 id="t-pr-u" style={{ fontSize: 20 }}>O que foi usado</h2></div></div>
            <dl className="pr-usado">
              <div><dt>Contrato</dt><dd>{u.contrato.numero}</dd></div>
              <div><dt>Modelos</dt><dd>{u.documentos.map((x) => <span key={x.id}>{nomeCurto(x.tipo, x.nome)}: {x.modelo}</span>)}</dd></div>
              <div><dt>Outorgados</dt><dd>{u.outorgados.map((o) => <span key={o.pessoaId}>{o.nome}, {o.frase}</span>)}</dd></div>
              {u.documentos.some((x) => x.tipo === "PROCURACAO") ? (
                <div><dt>Poderes especiais</dt><dd>{u.poderes.length || u.outroPoder ? juntar([...u.poderes.map((p) => PODERES_ESPECIAIS[p] as string), ...(u.outroPoder ? [u.outroPoder] : [])]).replace(/^./, (c) => c.toUpperCase()) : "Só os gerais"}</dd></div>
              ) : null}
              {u.representante ? <div><dt>{u.representante.cargo && /^(mãe|pai|tutora?|curadora?)$/i.test(u.representante.cargo) ? "Quem assinou pelo cliente" : "Quem assina pela empresa"}</dt><dd>{u.representante.nome}{u.representante.cargo ? `, ${u.representante.cargo}` : ""}</dd></div> : null}
              <div><dt>Cidade e data</dt><dd>{u.cidadeData}</dd></div>
              <div><dt>Saiu marcado</dt><dd>{marcados.length ? juntar(marcados) : "Nada"}</dd></div>
            </dl>
            <p className="hn-pe"><Icone nome="historico" className="ico" /><span>Fica guardado como estava hoje, mesmo que a Equipe ou a ficha mudem depois.</span></p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function GerarPagina({ contrato }: { contrato: string | null }) {
  const [res, setRes] = useState<{ r: ResultadoDocumentos; d: DadosDocumentos } | null>(null);
  const [janela, setJanela] = useState(false);
  const [feito, setFeito] = useState<Feito | null>(null);
  if (!contrato) return <EscolherContrato />;
  return (
    <>
      {res ? <Resultado r={res.r} d={res.d} aoAnexar={() => setJanela(true)} /> : (
        <GerarConteudo contrato={contrato} aoResultado={(r, d) => {
          setRes({ r, d });
          window.scrollTo({ top: 0 });
          setFeito({ titulo: r.documentos.length === 1 ? "1 documento gerado." : `${r.documentos.length} documentos gerados.`, texto: `Ficaram em Procurações e modelos e na ficha do contrato ${d.contrato.numero}, aba Documentos.` });
        }} />
      )}
      {janela && res ? (
        <JanelaAssinados contrato={contrato} aoFechar={() => setJanela(false)}
          aoFeito={(x) => { setJanela(false); irPara(`${ROTAS_DOCUMENTOS.documentosDoContrato(contrato)}&anexado=${x.ativou ? "ativo" : x.n}`); }} />
      ) : null}
      {feito ? <Toast feito={feito} aoFechar={() => setFeito(null)} /> : null}
    </>
  );
}

export function GerarDocumentosPortal({ contrato }: { contrato: string | null }) {
  return (
    <MolduraArea area="CONTRATOS" secao="modelos" trilha={[{ nome: "Gerar documentos" }]}>
      {() => <GerarPagina contrato={contrato} />}
    </MolduraArea>
  );
}

// ------------------------------------------------------------------------- 4. anexar os assinados (decisão 17)

export interface ResultadoAssinados { n: number; ativou: boolean; numero: string }

export function feitoDosAssinados(r: ResultadoAssinados): Feito {
  return r.ativou
    ? { titulo: "Contrato assinado anexado.", texto: `O contrato${r.numero ? ` ${r.numero}` : ""} está ativo e a programação dos recebimentos foi ao Financeiro.${r.n > 1 ? ` ${r.n} arquivos ficaram guardados.` : ""}` }
    : { titulo: r.n === 1 ? "Assinado anexado." : `${r.n} assinados anexados.`, texto: `${r.n === 1 ? "Ficou guardado" : "Ficaram guardados"} no contrato${r.numero ? ` ${r.numero}` : ""}, aba Documentos.` };
}

interface Bloco { arquivos: File[]; data: string }

function CampoAssinado({ id, doc, b, erro, aoMudar, progresso }: {
  id: string; doc: DocumentoDoContrato; b: Bloco; erro: string | null; aoMudar: (b: Bloco) => void; progresso: number | null;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const rot = rotuloAssinado(doc.tipo);
  const um = b.arquivos[0];
  const varias = b.arquivos.length > 1;
  return (
    <div className="campo">
      <p className="pe-rot" id={`${id}-r`}>{rot}</p>
      <input ref={entrada} type="file" accept="application/pdf,image/jpeg,image/png" className="sr" tabIndex={-1} aria-hidden="true"
        multiple onChange={(e) => { const a = [...(e.target.files ?? [])]; if (a.length) aoMudar({ ...b, arquivos: a }); e.target.value = ""; }} />
      <div className={erro ? "pe-arq erro" : "pe-arq"} role="group" aria-labelledby={`${id}-r`}>
        <span className="pe-ci" aria-hidden="true"><Icone nome="doc" className="ico" /></span>
        <div>
          <b>{varias ? `${b.arquivos.length} fotos: ${ordenarFotos(b.arquivos).map((a) => a.name).join(", ")}` : um ? um.name : "Nenhum arquivo escolhido"}</b>
          <small>{varias ? `Viram um PDF só, uma foto por página, na ordem do nome · ${tamanhoArquivo(b.arquivos.reduce((t, a) => t + a.size, 0))}`
            : um ? `${/\.pdf$/i.test(um.name) ? "PDF" : /\.(jpe?g|png)$/i.test(um.name) ? "Foto" : (um.name.split(".").pop() ?? "").toUpperCase()} · ${tamanhoArquivo(um.size)}` : "Pode ficar em branco se ainda não foi assinado"}</small>
        </div>
        <button id={`${id}-bt`} className="btn btn-sec btn-compacto" type="button" onClick={() => entrada.current?.click()} disabled={progresso !== null}
          data-erro={erro ? "" : undefined} aria-describedby={descritoPor(`${id}-aj`, erro && `${id}-er`)}>
          <Icone nome="enviar" className="ico ico-s" />{um ? "Trocar arquivo" : "Escolher arquivo"}<span className="sr">: {rot.toLowerCase()}</span>
        </button>
      </div>
      <p className="ajuda" id={`${id}-aj`}>PDF ou foto, até 10 MB. Várias páginas: um PDF só ou até 10 fotos.</p>
      {erro ? <ErroCampo id={`${id}-er`}>{erro}</ErroCampo> : null}
      {progresso !== null ? <div className="jr-progresso"><progress max={100} value={progresso} aria-label={`Enviando: ${rot.toLowerCase()}`} /><span>{progresso}%</span></div> : null}
    </div>
  );
}

export function JanelaAssinados({ contrato, so, aoFechar, aoFeito }: {
  contrato: string; so?: string; aoFechar: () => void; aoFeito: (r: ResultadoAssinados) => void;
}) {
  const { dados, recarregar } = useCarga<DocumentosDoContrato>(`/v1/escritorio/contratos/${contrato}/documentos`);
  const hoje = hojeBrasilia();
  const [blocos, setBlocos] = useState<Record<string, Bloco>>({});
  const [erros, setErros] = useState<Record<string, string>>({});
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [progresso, setProgresso] = useState<number | null>(null);
  const [feitos, setFeitos] = useState<string[]>([]);
  const corpo = useRef<HTMLDivElement>(null);

  const pronto = dados && dados !== "erro" ? dados : null;
  const docs = pronto ? (() => {
    const base = so ? pronto.documentos.filter((x) => x.chave === so) : pronto.documentos.filter((x) => x.situacao === "FALTA");
    const l = base.length ? base : pronto.documentos;
    return [...l].sort((a, b) => (a.tipo === "CONTRATO" ? -1 : b.tipo === "CONTRATO" ? 1 : 0));
  })() : [];
  const bloco = (k: string): Bloco => blocos[k] ?? { arquivos: [], data: `${hoje.slice(8, 10)}/${hoje.slice(5, 7)}/${hoje.slice(0, 4)}` };
  const ativa = !!pronto && pronto.contrato.estado === "ELABORACAO" && docs.some((x) => x.tipo === "CONTRATO" && !feitos.includes(x.chave) && bloco(x.chave).arquivos.length);

  async function enviar() {
    if (!pronto) return;
    setFalha(null);
    const e: Record<string, string> = {};
    const escolhidos = docs.filter((x) => !feitos.includes(x.chave) && bloco(x.chave).arquivos.length);
    for (const x of escolhidos) {
      const b = bloco(x.chave);
      const p = problemaDosAssinados(b.arquivos);
      if (p) e[`${x.chave}:arq`] = p;
      const dia = lerDia(b.data);
      if (!dia) e[`${x.chave}:data`] = "Escreva a data da assinatura no formato dd/mm/aaaa.";
      else if (dia > hoje) e[`${x.chave}:data`] = "A data da assinatura é depois de hoje. Escreva o dia em que o papel foi assinado.";
    }
    if (!escolhidos.length && docs[0]) e[`${docs[0].chave}:arq`] = "Escolha o arquivo de ao menos um documento assinado.";
    setErros(e);
    if (Object.keys(e).length) return requestAnimationFrame(() => corpo.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-erro]')?.focus());
    // Várias fotos viram um PDF só antes de enviar qualquer coisa (F3.99): o assinado continua
    // sendo um arquivo por documento.
    const arquivos = new Map<string, File>();
    const naoJuntou: Record<string, string> = {};
    setEnviando(escolhidos[0]!.chave);
    for (const x of escolhidos) {
      const b = bloco(x.chave);
      const a = b.arquivos.length > 1 ? await juntarFotos(b.arquivos) : b.arquivos[0]!;
      if (typeof a === "string") naoJuntou[`${x.chave}:arq`] = a;
      else arquivos.set(x.chave, a);
    }
    if (Object.keys(naoJuntou).length) {
      setEnviando(null);
      setErros(naoJuntou);
      return requestAnimationFrame(() => corpo.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-erro]')?.focus());
    }
    const ok: string[] = [...feitos];
    let ativou = false;
    for (const x of escolhidos) {
      const b = bloco(x.chave);
      setEnviando(x.chave);
      setProgresso(0);
      const dia = lerDia(b.data)!;
      const arquivo = arquivos.get(x.chave)!;
      const erro = await enviarAnexo("CONTRATO", contrato, arquivo, null, setProgresso, { documentoId: x.atual.id, assinadoEm: dia });
      setProgresso(null);
      if (erro) {
        setEnviando(null);
        setFeitos(ok);
        const ja = ok.length ? ` Já ficaram guardados: ${juntar(docs.filter((d) => ok.includes(d.chave)).map((d) => d.nome.toLowerCase()))}.` : "";
        return setFalha(`${x.nome} não foi anexado. ${erro}${ja}${pronto.contrato.estado === "ELABORACAO" ? " O contrato continua em elaboração." : ""}`);
      }
      ok.push(x.chave);
      // Anexar o contrato assinado é registrar a assinatura (decisão 17): a mesma rota da aba Contrato.
      if (x.tipo === "CONTRATO" && pronto.contrato.estado === "ELABORACAO") {
        const r = await chamarPortal<{ recebimentos: number }>(`/v1/escritorio/contratos/${contrato}/assinatura`, { metodo: "POST", corpo: { versao: pronto.contrato.versao, assinadoEm: dia } });
        if (!r.ok) {
          setEnviando(null);
          setFeitos(ok);
          return setFalha(r.erro.codigo === "VERSION_CONFLICT"
            ? "O arquivo do contrato ficou guardado, mas alguém mudou o contrato agora há pouco e a assinatura não foi registrada. Feche, recarregue a página e registre na aba Contrato."
            : `O arquivo do contrato ficou guardado, mas a assinatura não foi registrada. ${textoDoErro(r.erro)} O contrato continua em elaboração.`);
        }
        ativou = true;
      }
    }
    setEnviando(null);
    aoFeito({ n: ok.length, ativou, numero: pronto.contrato.numero });
  }

  return (
    <Janela id="j-assinados" classe="pe-larga" aberta aoFechar={aoFechar} sobretitulo={pronto ? `${pronto.contrato.numero} · ${pronto.contrato.cliente.nome}` : "Contrato"}
      titulo="Anexar os assinados" descricao="j-assinados-d" aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-pri" type="submit" disabled={!pronto || enviando !== null} aria-busy={enviando !== null || undefined}>
            <Icone nome="check" className="ico" />{enviando ? "Anexando…" : ativa ? "Anexar e ativar o contrato" : "Anexar"}
          </button>
        </>
      }>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id="j-assinados-d">Um arquivo por documento, com a data em que foi assinado. Anexe só os que já estão assinados.</p>
        {dados === "erro" ? <ErroAoCarregar oque="os documentos do contrato" aoTentar={recarregar} /> : !dados ? <Carregando rotulo="Carregando os documentos…" linhas={2} /> : null}
        {Object.keys(erros).length ? (
          <Aviso tom="urgencia" titulo="Nada foi anexado.">
            Acerte {Object.keys(erros).length === 1 ? "o ponto marcado abaixo" : `os ${Object.keys(erros).length} pontos marcados abaixo`}.{pronto?.contrato.estado === "ELABORACAO" ? " O contrato continua em elaboração." : ""}
          </Aviso>
        ) : null}
        {falha ? <Aviso tom="urgencia" titulo="Nem tudo foi anexado.">{falha}</Aviso> : null}
        {pronto && !pronto.documentos.length ? (
          <Aviso tom="info" titulo="Nenhum documento gerado neste contrato.">Gere os documentos primeiro. O contrato assinado feito fora do T3jus se anexa em “Registrar assinatura”, na aba Contrato.</Aviso>
        ) : null}
        {docs.map((x) => {
          const k = x.chave;
          const b = bloco(k);
          const contratoBloco = x.tipo === "CONTRATO";
          const idb = `as-${k.replace(/[^a-z0-9]/gi, "")}`;
          if (feitos.includes(k)) return <Aviso key={k} tom="sucesso" titulo={`${x.nome}: anexado.`}>O arquivo ficou guardado.</Aviso>;
          return (
            <fieldset key={k} className={contratoBloco ? "pr-bloco pr-bloco-contrato" : "pr-bloco"}>
              <legend><span>{x.nome}</span><small>v{x.atual.numero} · {x.atual.arquivo}</small></legend>
              <div className="pr-bloco-g">
                <CampoAssinado id={idb} doc={x} b={b} erro={erros[`${k}:arq`] ?? null} progresso={enviando === k ? progresso : null}
                  aoMudar={(n) => { setBlocos({ ...blocos, [k]: n }); setErros(({ [`${k}:arq`]: _, ...r }) => r); }} />
                <div className="campo">
                  <label htmlFor={`${idb}-data`}>Assinado em</label>
                  <input className="entrada" id={`${idb}-data`} type="text" inputMode="numeric" autoComplete="off" value={b.data} disabled={enviando !== null}
                    onChange={(e) => setBlocos({ ...blocos, [k]: { ...b, data: e.target.value } })}
                    aria-invalid={erros[`${k}:data`] ? true : undefined} aria-describedby={descritoPor(`${idb}-data-aj`, erros[`${k}:data`] && `${idb}-data-er`)} />
                  <p className="ajuda" id={`${idb}-data-aj`}>dd/mm/aaaa, hoje ou antes.</p>
                  {erros[`${k}:data`] ? <ErroCampo id={`${idb}-data-er`}>{erros[`${k}:data`]}</ErroCampo> : null}
                </div>
              </div>
              {contratoBloco && pronto?.contrato.estado === "ELABORACAO" ? (
                <p className="pe-sai"><Icone nome="pena" className="ico" /><span><b>Anexar o contrato assinado registra a assinatura.</b> O contrato {pronto.contrato.numero} fica ativo e a programação dos recebimentos vai ao Financeiro. É o mesmo que “Registrar assinatura”, na aba Contrato.</span></p>
              ) : (
                <p className="ajuda">Fica guardad{contratoBloco ? "o" : "a"} no contrato. Não muda a situação do contrato.{x.situacao === "ASSINADO" ? " Já há um assinado: o novo passa a valer, e o anterior continua guardado." : ""}</p>
              )}
            </fieldset>
          );
        })}
      </div>
    </Janela>
  );
}

// ------------------------------------------------------------------------- 5. aba Documentos da ficha (decisões 18 a 20)

function LinhaVersao({ v, tipo, curto, bx, pdf, anterior = false }: { v: VersaoDocumento; tipo: TipoDocumentoContrato; curto: string; bx: Bx; pdf: Pdf; anterior?: boolean }) {
  const ass = v.assinados[0];
  return (
    <li>
      <span>
        <b>v{v.numero}</b> · {semExtensao(v.arquivo)} · {quando(v.geradoEm)} · {v.geradoPor.nome}
        <small>{v.modelo.padrao ? "Padrão T3jus" : `Modelo do escritório, v${v.modelo.numero ?? 1}`}{v.marcados.length ? ` · saiu marcado: ${juntar(v.marcados)}` : ""}{ass ? ` · ${seloAssinado(tipo, ass.assinadoEm).toLowerCase()}` : anterior ? " · sem assinado" : ""}</small>
      </span>
      <span className="pr-acoes">
        {ass ? <button className="btn btn-sec btn-compacto" type="button" onClick={() => void abrirAnexo(ass.anexoId)}><Icone nome="olho" className="ico ico-s" />O assinado<span className="sr"> da versão {v.numero}</span></button> : null}
        <BaixarWordPdf id={v.id} curto={curto} v={`, versão ${v.numero}`} bx={bx} pdf={pdf} />
      </span>
    </li>
  );
}

export function DocumentosDaFicha({ f, dados, aoAnexar, aoTentar }: {
  f: FichaContrato; dados: DocumentosDoContrato | null | "erro"; aoAnexar: (so?: string) => void; aoTentar: () => void;
}) {
  const bx = useBaixar();
  const pdf = usePdf();
  const gerar = dados && dados !== "erro" && dados.podeGerar ? (
    <a data-muda className="btn btn-sec" href={ROTAS_DOCUMENTOS.gerar(f.id)}>
      <Icone nome={dados.documentos.length ? "reenviar" : "pena"} className="ico" />{dados.documentos.length ? "Gerar de novo" : "Gerar documentos"}
    </a>
  ) : null;
  const ins = new Map((f.inscricoes ?? []).map((a) => [a.pessoaId, a]));
  return (
    <div className="hn-grade">
      <div className="hn-col">
        <section className="folha" aria-labelledby="t-dc">
          <div className="folha-cab">
            <div>
              <h2 id="t-dc">Documentos deste contrato</h2>
              <p className="sub">
                {dados && dados !== "erro" && dados.documentos.length
                  ? `${contar(dados.documentos.length, "documento", "documentos")} · versão ${Math.max(...dados.documentos.map((x) => x.atual.numero))}${dados.faltam ? ` · falta anexar ${dados.faltam === dados.documentos.length ? "os assinados" : contar(dados.faltam, "assinado", "assinados")}` : " · todos assinados"}`
                  : "Contrato, procuração e declaração gerados com os dados do cliente e dos advogados."}
              </p>
            </div>
            {gerar}
          </div>
          {bx.falha ? <div style={{ padding: "0 24px 12px" }}><Aviso tom="urgencia" titulo="Não deu para baixar.">{bx.falha}</Aviso></div> : null}
          {dados === "erro" ? <ErroAoCarregar oque="os documentos" aoTentar={aoTentar} /> : !dados ? <Carregando rotulo="Carregando os documentos…" linhas={3} /> : dados.documentos.length ? (
            <ul className="pr-docs">
              {dados.documentos.map((x) => {
                const falta = x.situacao === "FALTA";
                const ass = x.atual.assinados[0];
                const curto = oDocumento(x.tipo, x.nome);
                const ids = [x.atual.id, ...x.anteriores.map((v) => v.id)];
                return (
                  <li key={x.chave} className="pdf-doc">
                    <span className="pe-ci" aria-hidden="true"><Icone nome="doc" className="ico" /></span>
                    <div>
                      <b>{x.nome} <span className="pr-v">v{x.atual.numero}</span></b>
                      {ass ? (
                        <small>{ass.nome} · {formatoAssinado(ass.nome) === "PDF" ? "PDF" : "foto"} · anexado {quando(ass.enviadoEm)} por {ass.enviadoPor.nome}</small>
                      ) : (
                        <small>{semExtensao(x.atual.arquivo)} · {quando(x.atual.geradoEm)} · {x.atual.geradoPor.nome} · {x.atual.modelo.padrao ? "Padrão T3jus" : `Modelo do escritório, v${x.atual.modelo.numero ?? 1}`}</small>
                      )}
                      {x.atual.marcados.length ? <SeloDados n={x.atual.marcados.length} /> : null}
                    </div>
                    <div className="pdf-sit"><SeloSituacaoDoc tipo={x.tipo} falta={falta} dia={ass?.assinadoEm ?? null} /></div>
                    <div className="pdf-bts">
                      {falta && f.situacao !== "ENCERRADO" ? (
                        <button className="btn btn-pri btn-compacto" type="button" onClick={() => aoAnexar(x.chave)}><Icone nome="enviar" className="ico ico-s" />Anexar o assinado<span className="sr">: {curto}</span></button>
                      ) : null}
                      {ass ? (
                        <button className="btn btn-sec btn-compacto" type="button" onClick={() => void abrirAnexo(ass.anexoId)}><Icone nome="baixar" className="ico ico-s" />Baixar o assinado ({formatoAssinado(ass.nome)})<span className="sr">: {curto}</span></button>
                      ) : (
                        <BaixarWordPdf id={x.atual.id} curto={curto} bx={bx} pdf={pdf} />
                      )}
                    </div>
                    <div className="pdf-mais">
                      <StatusPdf id={x.atual.id} curto={curto} pdf={pdf} />
                      {ids.includes(pdf.falhou ?? "") ? <ErroPdf id={pdf.falhou!} curto={curto} bx={bx} pdf={pdf} /> : null}
                      {ids.some((i) => pdf.simples.has(i)) ? <NotaSimples /> : null}
                      {ass ? (
                        <details className="pdf-sem">
                          <summary><Icone nome="doc" className="ico ico-s" />Sem assinatura (v{x.atual.numero}): Word e PDF</summary>
                          <div className="pdf-sem-c">
                            <p>O que vale é o assinado. Use o Word só se for gerar uma versão nova.</p>
                            <div className="pdf-sem-l"><b>v{x.atual.numero}</b><span>{semExtensao(x.atual.arquivo)} · {quando(x.atual.geradoEm)}</span><BaixarWordPdf id={x.atual.id} curto={curto} v=", sem assinatura" bx={bx} pdf={pdf} /></div>
                          </div>
                        </details>
                      ) : null}
                      {x.anteriores.length ? (
                        <details className="pr-ant">
                          <summary><Icone nome="historico" className="ico ico-s" />{x.anteriores.length === 1 ? "Versão anterior (1)" : `Versões anteriores (${x.anteriores.length})`}</summary>
                          <ul>{x.anteriores.map((v) => <LinhaVersao key={v.id} v={v} tipo={x.tipo} curto={curto} anterior bx={bx} pdf={pdf} />)}</ul>
                        </details>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Estado icone="doc" titulo="Nenhum documento gerado ainda"
              acoes={dados.podeGerar ? <a className="btn btn-pri" href={ROTAS_DOCUMENTOS.gerar(f.id)}><Icone nome="pena" className="ico" />Gerar documentos</a> : undefined}>
              O contrato de honorários, a procuração e a declaração saem no timbrado do escritório, com os dados de {primeiro(f.cliente.nome)} e dos advogados deste contrato.
            </Estado>
          )}
          <div className="hn-pe pdf-ajuda"><Icone nome="ajuda" className="ico" />
            <ul>
              <li><b>Word</b> é para editar antes de imprimir. <b>PDF</b> é para mandar ao cliente ou imprimir como está.</li>
              <li>O PDF sai do documento gerado. Se você mudou algo no Word, salve o PDF pelo próprio Word.</li>
              <li>Gerar de novo guarda a versão anterior. O assinado anexado continua valendo mesmo depois de uma versão nova.</li>
            </ul>
          </div>
        </section>
      </div>
      <aside className="hn-col" aria-label="Assinatura e advogados">
        <section className="folha" aria-labelledby="t-dc-as">
          <div className="folha-cab" style={{ paddingBottom: 8 }}><div><h2 id="t-dc-as" style={{ fontSize: 20 }}>Assinatura</h2></div></div>
          <p className="pe-nota" style={{ fontSize: 13 }}><Icone nome="pena" className="ico" /><span>Anexar o <b>contrato</b> assinado é o mesmo que registrar a assinatura na aba Contrato: o contrato fica ativo e a programação vai ao Financeiro. A procuração e a declaração só ficam guardadas.</span></p>
          <div style={{ padding: "0 24px 20px" }}><Reserva /></div>
        </section>
        <section className="folha" aria-labelledby="t-dc-ad">
          <div className="folha-cab" style={{ paddingBottom: 8 }}><div><h2 id="t-dc-ad" style={{ fontSize: 20 }}>Advogados nos documentos</h2><p className="sub">Os do contrato, com as inscrições escolhidas.</p></div></div>
          <ul className="hn-pessoas">
            {f.advogados.map((a) => {
              const i = ins.get(a.id);
              const esc = i?.inscricoes.filter((x) => x.escolhida).map((x) => x.documento) ?? [];
              return (
                <li key={a.id}>
                  <span className="av-p" aria-hidden="true">{iniciais(a.nome)}</span>
                  <div><strong>{a.nome}</strong><small>{esc.length ? esc.join(" · ") : "Sem OAB na Equipe: não entra como outorgado"}</small></div>
                </li>
              );
            })}
          </ul>
          <p className="hn-pe"><Icone nome="ajuda" className="ico" /><span>Cada advogado entra com as inscrições escolhidas no contrato. Na hora de gerar, dá para incluir outro só naqueles documentos.</span></p>
        </section>
      </aside>
    </div>
  );
}

/** O próximo passo do cabeçalho da ficha quando há documento esperando o assinado (decisão 20). */
export function proximoDosDocumentos(d: DocumentosDoContrato | null | "erro"): { texto: string; contrato: boolean } | null {
  if (!d || d === "erro" || !d.faltam) return null;
  const n = d.faltam;
  const contrato = d.documentos.some((x) => x.tipo === "CONTRATO" && x.situacao === "FALTA");
  return { texto: n === d.documentos.length && n > 1 ? `Os ${n} documentos esperam o assinado.` : n === 1 ? "1 documento espera o assinado." : `${n} documentos esperam o assinado.`, contrato };
}

