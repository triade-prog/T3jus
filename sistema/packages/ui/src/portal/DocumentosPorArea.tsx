"use client";
// Contratos › Procurações e modelos › Modelos de documento › Documentos por área (CH-14, F3.170),
// desenho aprovado em docs/design/aprovadas/portal-documentos-por-area (D36; Carol, 24/11/2026).
// O escritório diz, para cada uma das 8 áreas, o que vem marcado em Gerar documentos. Uma área
// aberta por vez; salvar manda a versão, e quem salvou antes aparece na comparação de sempre.

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import {
  AREAS_DOCUMENTOS, hojeBrasilia, rotuloAreaDocumentos, SUGESTAO_T3JUS_DOCUMENTOS,
  type AreaDireito, type DocumentosPorArea as DadosPorArea, type LinhaDocumentosPorArea,
} from "@t3jus/domain";
import { textoDoErro } from "../api.ts";
import { Icone, type NomeIcone } from "../Icone.tsx";
import { Aviso, Estado } from "../console/pecas.tsx";
import { Selo } from "./Comercial.tsx";
import { chamarPortal } from "./Moldura.tsx";
import {
  avisoSalvo, botaoSalvar, cabecalhoDaArea, conflitoDaArea, ehSugestao, legendaDaArea, naOrdem, nomeNaCaixa, origemDoModelo, quemMudou, textoDaLista,
  type ConflitoDaArea,
} from "./documentosPorArea.ts";
import { ROTAS_JURIDICO } from "./juridico.ts";

/**
 * Aviso que recebe o foco ao aparecer, sem região viva, para o leitor de tela não falar duas vezes
 * (como o aviso da volta em Gerar documentos, F3.160).
 */
export function AvisoFoco({ alvo, tom, icone, titulo, children, acoes }: {
  alvo: RefObject<HTMLDivElement | null>; tom: "urgencia" | "sucesso" | "info" | "atencao"; icone?: NomeIcone; titulo: ReactNode; children?: ReactNode; acoes?: ReactNode;
}) {
  const ico: NomeIcone = icone ?? (tom === "urgencia" ? "alerta" : tom === "sucesso" ? "check" : tom === "atencao" ? "relogio" : "ajuda");
  return (
    <div ref={alvo} tabIndex={-1} className={`aviso aviso-${tom}`}>
      <Icone nome={ico} className="ico" />
      <div>
        <strong className="aviso-titulo">{titulo}</strong>
        {children ? <p>{children}</p> : null}
        {acoes ? <div className="aviso-acoes">{acoes}</div> : null}
      </div>
    </div>
  );
}

export const API_POR_AREA = "/v1/escritorio/documentos/por-area";

type Aberta = { area: AreaDireito; antes: string[]; marcados: string[]; versao: number | null };
type Modo = "editar" | "salvando" | "conflito" | "erro";

/** A folha "Documentos por área", embaixo da lista dos modelos. */
export function DocumentosPorArea({ dados, aoTentar, aoMudar }: {
  dados: DadosPorArea | "erro" | null;
  aoTentar: () => void;
  /** Uma área foi salva: quem mostra a janela de arquivar precisa da lista nova. */
  aoMudar?: () => void;
}) {
  const hoje = hojeBrasilia();
  // O que já foi salvo aqui, por cima do que veio na carga (a versão mais nova vence).
  const [salvas, setSalvas] = useState<Partial<Record<AreaDireito, LinhaDocumentosPorArea>>>({});
  const [aberta, setAberta] = useState<Aberta | null>(null);
  const [modo, setModo] = useState<Modo>("editar");
  const [conflito, setConflito] = useState<(ConflitoDaArea & { versao: number | null }) | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState<{ titulo: string; texto: string } | null>(null);
  const refAviso = useRef<HTMLDivElement>(null);
  const focar = useRef<string | null>(null);

  useEffect(() => {
    const id = focar.current;
    if (!id) return;
    focar.current = null;
    requestAnimationFrame(() => (id === "aviso" ? refAviso.current : document.getElementById(id))?.focus());
  });

  const cab = (
    <div className="folha-cab">
      <div>
        <h2 id="t-da">Documentos por área</h2>
        <p className="sub">
          O que vem marcado em Gerar documentos, conforme a área do contrato ou do caso. O que o cliente entrega para o processo começar fica em{" "}
          <a href={ROTAS_JURIDICO.documentos}>Jurídico › Documentos para começar</a>.
        </p>
      </div>
    </div>
  );
  const pe = (
    <p className="hn-pe">
      <Icone nome="historico" className="ico" />
      <span>Vale da próxima vez que alguém abrir Gerar documentos. Os documentos já gerados não mudam, e “Gerar de novo” continua com as escolhas da última vez. Cada mudança fica no histórico do escritório, com quem mudou e quando.</span>
    </p>
  );
  const folha = (corpo: ReactNode) => (
    <section className="folha da-folha" id="da" aria-labelledby="t-da" style={{ overflow: "hidden" }}>{cab}{corpo}{pe}</section>
  );

  if (dados === "erro") {
    return folha(
      <Estado icone="alerta" erro titulo="Não deu para carregar os documentos por área."
        acoes={<button className="btn btn-sec" type="button" onClick={aoTentar}><Icone nome="trocar" className="ico" />Tentar de novo</button>}>
        Os modelos acima continuam valendo. Em Gerar documentos, quem gera continua podendo marcar o que quiser. Tente de novo em instantes.
      </Estado>,
    );
  }
  if (!dados) return folha(<p className="sub" role="status" style={{ margin: "0 24px 20px" }}>Carregando os documentos por área…</p>);

  const modelos = dados.modelos;
  const linha = (a: AreaDireito): LinhaDocumentosPorArea => {
    const base = dados.areas.find((l) => l.area === a) ?? { area: a, documentos: [], sugestao: [], igualSugestao: false, salva: false, versao: null, atualizadoPor: null, atualizadoEm: null };
    const meu = salvas[a];
    return meu && (meu.versao ?? 0) >= (base.versao ?? 0) ? meu : base;
  };
  const pode = dados.podeEditar;

  function abrir(a: AreaDireito) {
    const l = linha(a);
    setAberta({ area: a, antes: [...l.documentos], marcados: [...l.documentos], versao: l.versao });
    setModo("editar");
    setConflito(null);
    setErro(null);
    setSalvo(null);
    focar.current = `da-doc-${modelos[0]?.chave ?? ""}`;
  }
  function fechar(a: AreaDireito) {
    setAberta(null);
    setModo("editar");
    setConflito(null);
    setErro(null);
    focar.current = `da-mudar-${a}`;
  }
  function marcar(k: string, sim: boolean) {
    if (!aberta) return;
    setAberta({ ...aberta, marcados: sim ? [...aberta.marcados, k] : aberta.marcados.filter((x) => x !== k) });
  }

  async function salvar(versao: number | null) {
    if (!aberta) return;
    const a = aberta.area;
    const docs = naOrdem(aberta.marcados, modelos);
    setModo("salvando");
    setErro(null);
    const r = await chamarPortal<LinhaDocumentosPorArea>(`${API_POR_AREA}/${a}`, { metodo: "PUT", corpo: { versao, documentos: docs } });
    if (r.ok) {
      setSalvas((s) => ({ ...s, [a]: r.dados }));
      setAberta(null);
      setModo("editar");
      setConflito(null);
      setSalvo(avisoSalvo(a, r.dados.documentos, modelos));
      focar.current = `da-mudar-${a}`;
      aoMudar?.();
      return;
    }
    if (r.erro.codigo === "VERSION_CONFLICT") {
      const x = await chamarPortal<DadosPorArea>(API_POR_AREA);
      const agora = x.ok ? x.dados.areas.find((l) => l.area === a) : null;
      if (agora) {
        setSalvas((s) => ({ ...s, [a]: agora }));
        setConflito({ ...conflitoDaArea(a, aberta.antes, agora, docs, modelos), versao: agora.versao });
        setModo("conflito");
        focar.current = "aviso";
        return;
      }
    }
    setErro(r.erro.codigo === "UPSTREAM_UNAVAILABLE" || r.erro.codigo === "INTERNAL_ERROR"
      ? "O T3jus não respondeu a tempo. O que você marcou continua aqui: salve de novo em instantes."
      : `${textoDoErro(r.erro)} O que você marcou continua aqui.`);
    setModo("erro");
    focar.current = "aviso";
  }

  function ficarComSalva() {
    if (!aberta) return;
    fechar(aberta.area);
  }

  return folha(
    <>
      {salvo ? <Aviso tom="sucesso" className="da-topo" titulo={salvo.titulo}>{salvo.texto}</Aviso> : null}
      {dados.leitura === "SO_CONSULTA" ? (
        <div className="da-quem">
          <Icone nome="cadeado" className="ico" />
          <p><b>O Portal está só para consulta.</b> Dá para ver o que vem marcado em cada área, mas não para mudar. Quem pode enviar modelos volta a mudar quando o Portal voltar ao normal.</p>
        </div>
      ) : dados.leitura === "SEM_PERMISSAO" ? (
        <div className="da-quem">
          <Icone nome="cadeado" className="ico" />
          <p>Quem muda o que vem marcado em cada área é quem pode enviar e trocar modelos. Você vê o que vem marcado.</p>
        </div>
      ) : null}
      <ul className="da-lista">
        {AREAS_DOCUMENTOS.map((a) => {
          const l = linha(a);
          const nome = rotuloAreaDocumentos(a);
          if (aberta?.area === a && pode) {
            const salvando = modo === "salvando";
            return (
              <li key={a} className="da-aberta">
                <div className="da-edit" role="group" aria-labelledby="da-e-t">
                  <div className="da-edit-cab">
                    <h3 id="da-e-t">{nome}</h3>
                    <p>{cabecalhoDaArea(l, hoje)}</p>
                  </div>
                  {modo === "conflito" && conflito ? (
                    <AvisoFoco alvo={refAviso} tom="urgencia" titulo={conflito.titulo}
                        acoes={
                          <>
                            {conflito.linhas.length ? (
                              <table className="comparar">
                                <caption className="sr">{conflito.linhas.length === 1 ? "Documento que mudou" : "Documentos que mudaram"}</caption>
                                <thead><tr><th scope="col">Documento</th><th scope="col">Salvo agora</th><th scope="col">O que você marcou</th></tr></thead>
                                <tbody>
                                  {conflito.linhas.map((x) => <tr key={x.chave}><th scope="row">{x.documento}</th><td>{x.salvo}</td><td>{x.meu}</td></tr>)}
                                </tbody>
                              </table>
                            ) : null}
                            <div className="aviso-acoes" style={{ width: "100%" }}>
                              <button className="btn btn-pri" type="button" onClick={() => void salvar(conflito.versao)}>Salvar a minha versão</button>
                              <button className="btn btn-sec" type="button" onClick={ficarComSalva}>Ficar com a versão salva</button>
                            </div>
                          </>
                        }>
                        {conflito.texto}
                    </AvisoFoco>
                  ) : null}
                  {modo === "erro" && erro ? (
                    <AvisoFoco alvo={refAviso} tom="urgencia" titulo={`${nome} não foi salvo. Nada mudou.`}>{erro}</AvisoFoco>
                  ) : null}
                  <fieldset>
                    <legend>{legendaDaArea(a)}</legend>
                    <div className="da-ops">
                      {modelos.map((m) => (
                        <label className="opcao" key={m.chave}>
                          <input className="marcar" type="checkbox" id={`da-doc-${m.chave}`} name="da-doc" checked={aberta.marcados.includes(m.chave)} disabled={salvando}
                            onChange={(e) => marcar(m.chave, e.target.checked)} />
                          <span><strong style={{ fontWeight: 500 }}>{nomeNaCaixa(m)}</strong><small>{origemDoModelo(m, hoje)}</small></span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <p className="ajuda" style={{ margin: 0 }}>Modelo do escritório enviado depois vem desmarcado, até alguém marcar aqui. Quem gera sempre pode mudar antes de gerar.</p>
                  {modo === "conflito" ? null : (
                    <div className="da-edit-pe">
                      {salvando ? (
                        <>
                          <span className="da-pe-status" role="status">Salvando {nome}…</span>
                          <button className="btn btn-fantasma" type="button" disabled>Cancelar</button>
                          <button className="btn btn-pri" type="button" disabled aria-busy="true"><Icone nome="relogio" className="ico" />Salvando…</button>
                        </>
                      ) : (
                        <>
                          <button className="btn btn-fantasma da-volta" type="button" disabled={ehSugestao(aberta.marcados)}
                            onClick={() => setAberta({ ...aberta, marcados: [...SUGESTAO_T3JUS_DOCUMENTOS] })}>
                            <Icone nome="historico" className="ico ico-s" />Voltar à sugestão do T3jus
                          </button>
                          <button className="btn btn-fantasma" type="button" onClick={() => fechar(a)}>Cancelar</button>
                          <button className="btn btn-pri" type="button" onClick={() => void salvar(aberta.versao)}><Icone nome="check" className="ico" />{botaoSalvar(a)}</button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          }
          const texto = textoDaLista(l.documentos, modelos);
          return (
            <li key={a}>
              <div className="da-nome">
                <strong>{nome}</strong>
                {l.salva ? <Selo tom="implant">Do escritório</Selo> : <Selo tom="neutro">Sugestão do T3jus</Selo>}
              </div>
              <div className="da-docs">
                {texto ? <p>{texto}</p> : <p className="da-nenhum">Nenhum documento. Nada vem marcado; quem gera escolhe.</p>}
                <small>{quemMudou(l, hoje)}</small>
              </div>
              <div className="da-ac">
                {pode ? (
                  <button className="btn btn-sec btn-compacto" type="button" id={`da-mudar-${a}`} data-muda disabled={!!aberta && modo === "salvando"} onClick={() => abrir(a)}>
                    <Icone nome="lapis" className="ico ico-s" />Mudar<span className="sr"> os documentos de {nome}</span>
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </>,
  );
}
