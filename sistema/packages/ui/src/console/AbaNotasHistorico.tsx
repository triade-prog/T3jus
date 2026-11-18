"use client";
// Abas Notas internas (CO-03) e Histórico (CO-04), telas aprovadas em
// docs/design/aprovadas/console-v1 (ficha.html?aba=notas e ?aba=historico). A nota nova fica no
// topo e não muda depois de salva; o histórico vem por dia, com "Só equipe" nos eventos
// internos, e carrega os mais antigos pelo cursor da API.

import { useCallback, useEffect, useId, useState } from "react";
import { notaSchema } from "@t3jus/domain";
import { textoDoErro, type ErroApi } from "../api.ts";
import { Icone } from "../Icone.tsx";
import type { FichaDoCliente, Nota } from "./ficha.ts";
import { agruparPorDia, fraseDoEvento, type EventoHistorico } from "./historico.ts";
import { chamarConsole } from "./Moldura.tsx";
import { Aviso, Carregando, descritoPor, ErroAoCarregar, ErroCampo, Estado } from "./pecas.tsx";
import { dataHora, hora, iniciais } from "./tempo.ts";

const MAX_NOTA = 2000;

export function AbaNotas({ f, aoCarregar }: { f: FichaDoCliente; aoCarregar: (n: Nota[]) => void }) {
  const ids = useId();
  const id = f.escritorio.id;
  const pode = f.permissoes.includes("console.notas.escrever");
  const [notas, setNotas] = useState<Nota[] | null>(null);
  const [erroLista, setErroLista] = useState(false);
  const [texto, setTexto] = useState("");
  const [erroCampo, setErroCampo] = useState(false);
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    setErroLista(false);
    const r = await chamarConsole<{ notas: Nota[] }>(`/v1/clientes/${id}/notas`);
    if (r.ok) {
      setNotas(r.dados.notas);
      aoCarregar(r.dados.notas);
    } else if (r.status !== 401) setErroLista(true);
  }, [id, aoCarregar]);

  useEffect(() => {
    // Depois da montagem: a busca começa fora do efeito.
    void Promise.resolve().then(() => carregar());
  }, [carregar]);

  async function salvar() {
    setErro(null);
    const v = notaSchema.safeParse({ texto });
    if (!v.success) {
      setErroCampo(true);
      document.getElementById(`${ids}-nota`)?.focus();
      return;
    }
    setErroCampo(false);
    setSalvando(true);
    const r = await chamarConsole(`/v1/clientes/${id}/notas`, { corpo: v.data });
    setSalvando(false);
    if (!r.ok) return setErro(r.erro);
    setTexto("");
    await carregar();
  }

  return (
    <div className="grade">
      <div className="col">
        {pode ? (
          <section className="folha" aria-labelledby={`${ids}-nova`}>
            <div className="folha-cab">
              <h2 id={`${ids}-nova`}>Nova nota</h2>
            </div>
            <form className="form-folha" noValidate style={{ paddingTop: 0 }} onSubmit={(e) => { e.preventDefault(); void salvar(); }}>
              {erro ? (
                <div className="c6">
                  <Aviso tom="urgencia" titulo="A nota não foi salva.">{textoDoErro(erro)} O que você escreveu continua aqui.</Aviso>
                </div>
              ) : null}
              <div className="campo c6">
                <div className="campo-linha">
                  <label htmlFor={`${ids}-nota`}>Nota interna</label>
                  <span className="contador" id={`${ids}-cont`}>
                    {texto.length.toLocaleString("pt-BR")} de 2.000 caracteres
                  </span>
                </div>
                <textarea className="entrada" id={`${ids}-nota`} value={texto} maxLength={MAX_NOTA} onChange={(e) => setTexto(e.target.value)}
                  aria-invalid={erroCampo || undefined}
                  aria-describedby={descritoPor(erroCampo && `${ids}-erro`, `${ids}-ajuda`, `${ids}-cont`)} />
                {erroCampo ? <ErroCampo id={`${ids}-erro`}>Escreva a nota antes de salvar.</ErroCampo> : null}
                <p className="ajuda" id={`${ids}-ajuda`}>
                  Só a equipe T3jus vê. Depois de salva, a nota não muda nem sai.
                </p>
              </div>
              <div className="form-pe">
                <button className="btn btn-pri" type="submit" disabled={salvando}>
                  <Icone nome="pena" className="ico" />
                  {salvando ? "Salvando…" : "Salvar nota"}
                </button>
              </div>
            </form>
          </section>
        ) : null}
        {erroLista ? (
          <ErroAoCarregar oque="as notas internas" aoTentar={() => void carregar()} />
        ) : notas === null ? (
          <Carregando rotulo="Carregando as notas internas…" />
        ) : (
          <section className="folha" aria-labelledby={`${ids}-notas`}>
            <div className="folha-cab">
              <div>
                <h2 id={`${ids}-notas`}>Notas da equipe</h2>
                {notas.length ? (
                  <p className="sub">{notas.length === 1 ? "1 nota" : `${notas.length} notas, da mais nova para a mais antiga`}</p>
                ) : null}
              </div>
            </div>
            {notas.length === 0 ? (
              <div className="folha-corpo">
                <Estado icone="pena" titulo="Nenhuma nota ainda">
                  Anote o que a equipe precisa saber sobre este cliente: como prefere ser chamado, combinados, cuidados.
                </Estado>
              </div>
            ) : (
              <ol className="lista notas" reversed>
                {notas.map((n) => (
                  <li key={n.id}>
                    <blockquote>“{n.texto}”</blockquote>
                    <footer>
                      <span className="av-p" aria-hidden="true">
                        {iniciais(n.autor.nome ?? "T3")}
                      </span>
                      {n.autor.nome ?? "Equipe T3jus"} · <time dateTime={n.criadoEm}>{dataHora(n.criadoEm)}</time>
                    </footer>
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}
      </div>
      <aside className="col" aria-label="Sobre as notas">
        <section className="explica campo-ambar" aria-labelledby={`${ids}-so`}>
          <p className="sobretitulo">Só a equipe vê</p>
          <h2 id={`${ids}-so`}>O escritório nunca vê estas notas.</h2>
          <ul>
            <li>
              <Icone nome="escudo" className="ico" />
              <span>Nem no Portal, nem em exportação para o cliente.</span>
            </li>
            <li>
              <Icone nome="cadeado" className="ico" />
              <span>Ninguém edita nem apaga uma nota. Para corrigir, escreva outra.</span>
            </li>
            <li>
              <Icone nome="pessoas" className="ico" />
              <span>Todas as funções da equipe leem e escrevem notas.</span>
            </li>
          </ul>
        </section>
      </aside>
    </div>
  );
}

const POR_PAGINA = 20;

/** Lista do histórico por dia, com "Carregar mais antigos" (usada no cliente e na Equipe T3jus). */
export function ListaHistorico({ caminho, nomeDe, titulo, sub, vazio }: {
  caminho: string;
  nomeDe?: (id: string) => string | null;
  titulo: string;
  sub: string;
  vazio: string;
}) {
  const ids = useId();
  const [eventos, setEventos] = useState<EventoHistorico[] | null>(null);
  const [fim, setFim] = useState(false);
  const [erro, setErro] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const buscar = useCallback(async (antes?: number) => {
    setErro(false);
    setCarregando(true);
    const r = await chamarConsole<{ eventos: EventoHistorico[] }>(`${caminho}?limite=${POR_PAGINA}${antes ? `&antes=${antes}` : ""}`);
    setCarregando(false);
    if (!r.ok) {
      if (r.status !== 401) setErro(true);
      return;
    }
    setEventos((l) => (antes ? [...(l ?? []), ...r.dados.eventos] : r.dados.eventos));
    setFim(r.dados.eventos.length < POR_PAGINA);
  }, [caminho]);

  useEffect(() => {
    // Depois da montagem: a busca começa fora do efeito.
    void Promise.resolve().then(() => buscar());
  }, [buscar]);

  if (erro && eventos === null) return <ErroAoCarregar oque="o histórico" aoTentar={() => void buscar()} />;
  if (eventos === null) return <Carregando rotulo="Carregando o histórico…" linhas={4} />;
  return (
    <section className="folha" aria-labelledby={`${ids}-t`}>
      <div className="folha-cab">
        <div>
          <h2 id={`${ids}-t`}>{titulo}</h2>
          <p className="sub">{sub}</p>
        </div>
      </div>
      {eventos.length === 0 ? (
        <div className="folha-corpo">
          <Estado icone="historico" titulo="Nada registrado ainda">
            {vazio}
          </Estado>
        </div>
      ) : (
        <>
          {agruparPorDia(eventos).map((g) => (
            <div key={g.dia} className="eventos-dia">
              <h3>{g.dia}</h3>
              <ol className="eventos">
                {g.eventos.map((e) => {
                  const frase = fraseDoEvento(e, nomeDe);
                  return (
                    <li key={e.id}>
                      <time dateTime={e.ocorridoEm}>{hora(e.ocorridoEm)}</time>
                      <span className={e.interno ? "pto forte" : "pto"} aria-hidden="true" />
                      <div>
                        <p>
                          {frase.quem ? <b>{frase.quem}</b> : "O sistema"} {frase.fez}
                          {e.interno ? <span className="selo selo-neutro">Só equipe</span> : null}
                        </p>
                        {frase.detalhe ? <small>{frase.detalhe}</small> : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
          <div className="mais">
            <span aria-live="polite">
              {fim ? `Mostrando ${eventos.length === 1 ? "o único evento" : `todos os ${eventos.length} eventos`}` : `Mostrando os ${eventos.length} mais recentes`}
            </span>
            {erro ? <span role="alert">Não deu para carregar os mais antigos. Tente de novo.</span> : null}
            {!fim ? (
              <button className="btn btn-sec" type="button" disabled={carregando} onClick={() => void buscar(eventos.at(-1)?.id)}>
                <Icone nome="baixo" className="ico" />
                {carregando ? "Carregando…" : "Carregar mais antigos"}
              </button>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}

export function AbaHistorico({ f }: { f: FichaDoCliente }) {
  const ids = useId();
  const nomes = new Map<string, string>([
    ...f.equipe.map((p) => [p.pessoaId, p.nome] as [string, string]),
    ...f.socios.map((s) => [s.pessoaId, s.nome] as [string, string]),
  ]);
  return (
    <div className="grade">
      <div className="col">
        <ListaHistorico caminho={`/v1/clientes/${f.escritorio.id}/historico`} nomeDe={(id) => nomes.get(id) ?? null}
          titulo="Histórico administrativo" sub="Quem fez o quê, e quando. Nada aqui é apagado."
          vazio="Cada mudança na ficha, no contrato, no estágio e na equipe aparece aqui, com quem fez e quando." />
      </div>
      <aside className="col" aria-label="Sobre o histórico">
        <section className="folha" aria-labelledby={`${ids}-entra`}>
          <div className="folha-cab" style={{ paddingBottom: 4 }}>
            <h2 id={`${ids}-entra`} style={{ fontSize: 20 }}>
              O que entra aqui
            </h2>
          </div>
          <ul className="tratar">
            <li>Cadastro e mudanças da ficha</li>
            <li>Referência do contrato e estágio, com o motivo</li>
            <li>Convites de sócio</li>
            <li>Quem foi atribuído ou retirado</li>
            <li>
              <span className="selo selo-neutro">Só equipe</span>
              <span className="ok">o escritório não vê este evento</span>
            </li>
          </ul>
        </section>
      </aside>
    </div>
  );
}
