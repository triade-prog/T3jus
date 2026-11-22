"use client";
// Escritório › Advogados nos documentos (PA-07, decisão 5), tela aprovada em
// docs/design/aprovadas/escritorio-dados-documentos (Carol, 22/11/2026): a qualificação de quem
// tem OAB na Equipe, como sai no contrato e na procuração. A sócia dona vê e muda os dados de
// todos; cada advogado vê a lista e completa só os próprios. CPF e RG dos outros não chegam a
// quem não é a sócia dona (0860, portal_escritorio_advogados).

import { useCallback, useEffect, useState } from "react";
import { faltasDoAdvogado, listaFaltas, TOTAL_DADOS_DOCUMENTO, TRATAMENTOS } from "@t3jus/domain";
import { Icone, type NomeIcone } from "../Icone.tsx";
import { Carregando, ErroAoCarregar, Estado } from "../console/pecas.tsx";
import { FormDados, FraseQualificacao, OndeEntram } from "./ContaDados.tsx";
import { rotaPessoaEquipe } from "./EquipeOab.tsx";
import { Toast, type Feito } from "./Equipe.tsx";
import { type AdvogadoNosDocumentos, type ListaAdvogados } from "./EscritorioDados.tsx";
import { chamarPortal, MolduraPortal, ROTAS_PORTAL, soConsulta, useEscritorioPortal } from "./Moldura.tsx";
import { BarraEscritorio, ROTAS_ESCRITORIO } from "./WhatsApp.tsx";

const plural = (n: number, s: string, p: string) => (n === 1 ? s : p);
const primeiro = (nome: string) => nome.trim().split(/\s+/)[0] ?? nome;

/** O endereço para abrir direto a edição de alguém: ?editar=<pessoa>. */
export const rotaEditarAdvogado = (pessoaId: string) => `${ROTAS_ESCRITORIO.advogados}?editar=${encodeURIComponent(pessoaId)}`;

function faltasDe(a: AdvogadoNosDocumentos, l: ListaAdvogados) {
  return a.dados ? faltasDoAdvogado(a.dados, a.inscricoes, l.escritorio) : a.faltas;
}

function papelDe(a: AdvogadoNosDocumentos): string {
  if (a.socioDono) return "Sócia dona";
  if (a.dados?.tratamento) return TRATAMENTOS[a.dados.tratamento];
  return "Advogado(a)";
}

const QUEM_MUDA: [NomeIcone, string, string][] = [
  ["coluna", "A sócia dona", "Vê e muda os dados de todos os advogados."],
  ["pena", "Cada advogado", "Vê a lista e completa só os próprios dados, aqui mesmo."],
  ["cracha", "A OAB", "Vem da Equipe; só a sócia dona muda."],
];

function QuemMuda() {
  return (
    <section className="folha" aria-labelledby="t-quem">
      <div className="folha-cab" style={{ paddingBottom: 8 }}>
        <div>
          <h2 id="t-quem" style={{ fontSize: 20 }}>Quem muda</h2>
        </div>
      </div>
      <ul className="cd-usos">
        {QUEM_MUDA.map(([ico, t, s]) => (
          <li key={t}>
            <span className="cd-ic" aria-hidden="true">
              <Icone nome={ico} className="ico" />
            </span>
            <div>
              <strong>{t}</strong>
              <span>{s}</span>
            </div>
          </li>
        ))}
      </ul>
      <p className="cd-pe">
        <Icone nome="historico" className="ico" />
        <span>A última mudança vale. O histórico guarda quem mudou quais campos, sem os números de CPF e RG.</span>
      </p>
    </section>
  );
}

function Lista({ l, pode, aoEditar }: { l: ListaAdvogados; pode: (a: AdvogadoNosDocumentos) => boolean; aoEditar: (a: AdvogadoNosDocumentos) => void }) {
  const dona = l.socios[0] ?? "a sócia dona";
  return (
    <section className="folha" aria-labelledby="t-advs" style={{ overflow: "hidden" }}>
      <div className="folha-cab">
        <div>
          <h2 id="t-advs">
            <Icone nome="balanca" className="ico" />
            Advogados nos documentos
          </h2>
          <p className="sub">Como cada pessoa sai na qualificação do contrato, da procuração e das petições. O que falta sai marcado.</p>
        </div>
      </div>
      {l.advogados.length ? (
        <ul className="ed-advs">
          {l.advogados.map((a) => {
            const f = faltasDe(a, l);
            const n = TOTAL_DADOS_DOCUMENTO - f.length;
            const eu = a.pessoaId === l.eu;
            return (
              <li key={a.pessoaId}>
                <div>
                  <p className="ed-adv-nome">{a.nome}{eu ? <span className="sr"> (você)</span> : null}</p>
                  <p className="ed-adv-meta">
                    {papelDe(a)}
                    {a.inscricoes.length ? ` · ${a.inscricoes.map((i) => i.texto).join(" · ")}` : null}
                  </p>
                  <div className="ed-adv-prog">
                    <div className="cd-tons" aria-hidden="true">
                      {Array.from({ length: TOTAL_DADOS_DOCUMENTO }, (_, i) => (
                        <i key={i} className={i < n ? undefined : "v"} />
                      ))}
                    </div>
                    <span>
                      {f.length ? (
                        <>
                          <b>{n} de {TOTAL_DADOS_DOCUMENTO}.</b> {plural(f.length, "Falta", "Faltam")}: {listaFaltas(f, eu)}.
                        </>
                      ) : (
                        <>
                          <b>{TOTAL_DADOS_DOCUMENTO} de {TOTAL_DADOS_DOCUMENTO}.</b> Completos.
                        </>
                      )}
                    </span>
                  </div>
                </div>
                {pode(a) ? (
                  <div className="ed-adv-bts">
                    <button className={`btn ${f.length ? "btn-pri" : "btn-sec"}`} type="button" onClick={() => aoEditar(a)}>
                      <Icone nome="lapis" className="ico" />
                      {f.length ? "Completar os dados" : "Ver e editar"}
                      <span className="sr"> de {a.nome}</span>
                    </button>
                  </div>
                ) : null}
                <p className="ed-adv-frase">
                  {a.dados ? (
                    <>
                      <FraseQualificacao dados={a.dados} oab={a.inscricoes} escritorio={l.escritorio} />.
                    </>
                  ) : (
                    <>
                      <strong>{a.nome.toUpperCase()}</strong>
                      {a.frase ? `, ${a.frase}` : ""}. A qualificação completa, com CPF e RG, só aparece para {primeiro(a.nome)} e para {dona}, sócia dona.
                    </>
                  )}
                </p>
              </li>
            );
          })}
        </ul>
      ) : (
        <Estado icone="balanca" titulo="Ninguém com OAB na Equipe">
          Os advogados aparecem aqui quando têm uma inscrição na OAB cadastrada na Equipe.
        </Estado>
      )}
      <p className="ed-fora">
        <Icone nome="ajuda" className="ico" />
        <span>
          Só aparece quem tem OAB na Equipe.
          {l.semOab.length
            ? ` ${l.semOab.map((p) => p.nome).join(", ")} não ${l.semOab.length === 1 ? "assina" : "assinam"} documentos e não ${l.semOab.length === 1 ? "está" : "estão"} na lista.`
            : ""}{" "}
          {l.dono ? (
            <>
              Para cadastrar ou corrigir uma OAB, <a href={ROTAS_PORTAL.equipe}>vá à Equipe</a>.
            </>
          ) : (
            `Para cadastrar ou corrigir uma OAB, fale com ${dona}, sócia dona.`
          )}
        </span>
      </p>
    </section>
  );
}

export function AdvogadosDocumentosPagina() {
  const { escritorio: e, erro: erroEscritorio, recarregar } = useEscritorioPortal();
  const [l, setL] = useState<ListaAdvogados | null>(null);
  const [erro, setErro] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [feito, setFeito] = useState<Feito | null>(null);

  const carregar = useCallback(async () => {
    setErro(false);
    const r = await chamarPortal<ListaAdvogados>("/v1/escritorio/advogados");
    if (r.ok) setL(r.dados);
    else if (r.status !== 401 && r.erro.codigo !== "ESCRITORIO_REQUIRED") setErro(true);
  }, []);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("editar");
    void Promise.resolve().then(() => {
      if (q) setEditando(q);
      return carregar();
    });
  }, [carregar]);

  const consulta = soConsulta(e);
  const pode = (a: AdvogadoNosDocumentos) => !consulta && !!a.dados && (l?.dono || a.pessoaId === l?.eu);
  const alvo = l && editando ? l.advogados.find((a) => a.pessoaId === editando && pode(a)) ?? null : null;
  const trilha = alvo
    ? [{ nome: "Escritório", href: ROTAS_PORTAL.escritorio }, { nome: "Advogados nos documentos", href: ROTAS_ESCRITORIO.advogados }, { nome: alvo.nome }]
    : [{ nome: "Escritório", href: ROTAS_PORTAL.escritorio }, { nome: "Advogados nos documentos" }];
  const fechar = () => {
    setEditando(null);
    if (window.location.search) window.history.replaceState(null, "", ROTAS_ESCRITORIO.advogados);
  };

  const completos = l ? l.advogados.filter((a) => !faltasDe(a, l).length).length : 0;
  const comFalta = l?.advogados.find((a) => faltasDe(a, l).length);

  return (
    <MolduraPortal atual="escritorio" trilha={trilha} escritorio={e} pagina="co-equipe"
      barra={<BarraEscritorio secao="advogados" financeiro={!!e?.areas.includes("FINANCEIRO")} />}>
      {erroEscritorio || erro ? (
        <ErroAoCarregar oque="os advogados do escritório" aoTentar={() => (erroEscritorio ? recarregar() : void carregar())} />
      ) : !l || !e ? (
        <Carregando rotulo="Carregando os advogados…" linhas={4} />
      ) : alvo && alvo.dados ? (
        <div className="cd">
          <header className="cd-cab">
            <div className="cd-topo campo-vinho">
              <Icone nome="cracha" className="ico estatua" />
              <div className="cd-quem">
                <a className="cd-voltar" href={ROTAS_ESCRITORIO.advogados} onClick={(ev) => { ev.preventDefault(); fechar(); }}>
                  <Icone nome="esquerda" className="ico ico-s" />
                  Advogados nos documentos
                </a>
                <p className="sobretitulo">Advogados nos documentos · editando</p>
                <h1>{alvo.nome}</h1>
                <p className="cd-meta">
                  <span className="selo">{papelDe(alvo)}</span>
                  {alvo.inscricoes.length ? <span>{alvo.inscricoes.map((i) => i.texto).join(" · ")}</span> : null}
                </p>
              </div>
            </div>
          </header>
          <FormDados voce={alvo.pessoaId === l.eu} nome={alvo.nome} escritorioNome={e.documentos?.razaoSocial || e.nome} dados={alvo.dados} oab={alvo.inscricoes}
            escritorio={l.escritorio}
            api={alvo.pessoaId === l.eu ? "/v1/escritorio/conta/dados" : `/v1/escritorio/equipe/pessoas/${alvo.pessoaId}/dados`}
            oabAcao={l.dono ? <a href={rotaPessoaEquipe(alvo.pessoaId)}>Mudar na Equipe</a> : null}
            aoCancelar={fechar}
            aoSalvo={() => {
              fechar();
              setFeito({
                titulo: alvo.pessoaId === l.eu ? "Seus dados foram salvos." : `Dados de ${primeiro(alvo.nome)} salvos.`,
                texto: "Valem para os documentos gerados daqui em diante. Os já gerados não mudam.",
              });
              void carregar();
              window.scrollTo({ top: 0 });
            }} />
        </div>
      ) : (
        <div className="cd">
          <header className="cd-cab">
            <div className="cd-topo campo-vinho">
              <Icone nome="cracha" className="ico estatua" />
              <div className="cd-quem">
                <p className="sobretitulo">Escritório · advogados nos documentos</p>
                <h1>Quem assina pelo escritório</h1>
                <p className="cd-meta">
                  <span>
                    {l.advogados.length} {plural(l.advogados.length, "pessoa", "pessoas")} com OAB na Equipe · a qualificação de cada uma sai no contrato e na procuração
                  </span>
                </p>
              </div>
              {l.advogados.length ? (
                <div className="cd-conta">
                  <span className={`disco${comFalta ? "" : " cd-ok"}`} aria-hidden="true">
                    <span>{completos}</span>
                  </span>
                  <p>
                    <b>de {l.advogados.length} {plural(l.advogados.length, "completo", "completos")}</b>
                    {comFalta
                      ? `${comFalta.nome} tem ${faltasDe(comFalta, l).length} ${plural(faltasDe(comFalta, l).length, "falta", "faltas")}`
                      : "todos com os dados completos"}
                    <span className="sr">: {completos} de {l.advogados.length} advogados com os dados completos</span>
                  </p>
                </div>
              ) : null}
            </div>
          </header>
          <div className="hn-grade">
            <div className="hn-col">
              <Lista l={l} pode={pode} aoEditar={(a) => {
                setFeito(null);
                setEditando(a.pessoaId);
                window.scrollTo({ top: 0 });
              }} />
            </div>
            <aside className="hn-col" aria-label="Quem muda e onde entram">
              <QuemMuda />
              <OndeEntram />
            </aside>
          </div>
        </div>
      )}
      {feito ? <Toast titulo={feito.titulo} texto={feito.texto} aoFechar={() => setFeito(null)} /> : null}
    </MolduraPortal>
  );
}
