"use client";
// Comercial › Interessados (F2.3, SC-05), tela aprovada em
// docs/design/aprovadas/site-comercial/interessados.html: a lista com os números do alto, o
// funil, a busca e os filtros; a ficha com o pedido como chegou, a autorização de dados, as
// notas, o histórico, o responsável e as janelas (responsável, próximo passo, mudar estágio,
// virar escritório cliente, encerrar e reabrir). Quem vê e quem muda é decidido no banco.

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import {
  ESTAGIOS_INTERESSADO,
  FUNCOES_CONSOLE,
  ORIGENS_INTERESSADO,
  PORQUES_DESCARTADO,
  PORQUES_PERDIDO,
  TAMANHOS_INTERESSADO,
  UFS,
  whatsLegivel,
  type EstagioInteressado,
  type FichaInteressado,
  type FuncaoConsole,
  type Interessado,
  type ListaInteressados,
  type PessoaInteressados,
} from "@t3jus/domain";
import { textoDoErro, type ErroApi, type Resposta } from "../api.ts";
import { Icone } from "../Icone.tsx";
import {
  aberto,
  CHIPS,
  contarChips,
  COR_FUNIL,
  dataBrInteira,
  diaMes,
  filtrar,
  fraseEvento,
  horaBr,
  ICONE_ORIGEM,
  lerDataBr,
  lerHora,
  nomeMes,
  numeros,
  ORIGENS,
  prazo,
  quandoPasso,
  SELO_ESTAGIO,
  type Chip,
  type FiltroInteressados,
} from "./interessados.ts";
import { JanelaCadastrarInteressado } from "./CadastrarInteressado.tsx";
import { chamarConsole, INTERESSADOS, MolduraConsole, useSessaoConsole } from "./Moldura.tsx";
import { Aviso, Carregando, ErroCampo, Estado, faltaAcertar, focarPrimeiroErro, Janela } from "./pecas.tsx";
import { dataLonga, hora, iniciais } from "./tempo.ts";

const TRILHA = [{ nome: "Console", href: "/" }, { nome: "Comercial" }];

function Selo({ e }: { e: EstagioInteressado }) {
  const s = SELO_ESTAGIO[e];
  return (
    <span className={`selo ${s.classe}`}>
      <Icone nome={s.icone} className="ico" />
      {ESTAGIOS_INTERESSADO[e]}
    </span>
  );
}

function Pessoa({ nome }: { nome: string }) {
  return (
    <span className="in-pessoa">
      <span className="av-p" aria-hidden="true">{iniciais(nome)}</span>
      {nome}
    </span>
  );
}

const funcaoDe = (p: PessoaInteressados) => p.funcoes.map((f) => FUNCOES_CONSOLE[f as FuncaoConsole] ?? f).join(", ");
const cidadeUf = (i: Pick<Interessado, "cidade" | "uf">) => (i.cidade ? `${i.cidade}${i.uf ? `, ${i.uf}` : ""}` : null);

/** Sem permissão: a página é da Administração e da Implantação (decisão 9). */
function SemPermissao() {
  return (
    <div className="estado estado-erro" role="status">
      <span className="icone-estado"><Icone nome="cadeado" className="ico" /></span>
      <h1 style={{ fontSize: 30 }}>Esta página é da Administração e da Implantação</h1>
      <p>Os interessados têm nome, e-mail e WhatsApp de quem pediu demonstração. Por isso só quem atende o comercial vê. Se você precisa ver, peça à Administração.</p>
    </div>
  );
}

function ErroLista({ aoTentar }: { aoTentar: () => void }) {
  return (
    <div className="estado estado-erro" role="alert">
      <span className="icone-estado"><Icone nome="alerta" className="ico" /></span>
      <h3>Não deu para carregar os interessados</h3>
      <p>O servidor não respondeu. Nada se perdeu: os pedidos que chegarem pelo site enquanto isso ficam guardados e aparecem aqui. Tente de novo em instantes.</p>
      <div className="acoes">
        <button className="btn btn-pri" type="button" onClick={aoTentar}><Icone nome="reenviar" className="ico" />Tentar de novo</button>
      </div>
    </div>
  );
}

function PassoCelula({ i, hoje }: { i: Interessado; hoje: string }) {
  if (!aberto(i)) {
    const txt = i.estagio === "CLIENTE" ? `Cliente desde ${i.fim ? dataBrInteira(i.fim.em) : ""}` : i.fim?.porque ?? "";
    return <div className="in-passo"><span>{i.estagio === "CLIENTE" ? "Virou cliente" : txt}</span></div>;
  }
  if (!i.proximo) {
    return i.estagio === "NOVO" && !i.responsavel ? (
      <div className="in-passo">
        <span>Responder o pedido</span>
        <small className={i.prazoResposta < hoje ? "in-venc" : i.prazoResposta === hoje ? "in-hoje" : undefined}>até {diaMes(i.prazoResposta, hoje)}</small>
      </div>
    ) : <div className="in-passo"><span className="cb-peq">sem próximo passo</span></div>;
  }
  const t = prazo(i, hoje);
  return (
    <div className="in-passo">
      <span>{i.proximo.passo}</span>
      <small className={t === "venc" ? "in-venc" : t === "hoje" ? "in-hoje" : undefined}>
        {t === "venc" ? <Icone nome="alerta" className="ico" /> : null}
        {quandoPasso(i, hoje)}
      </small>
    </div>
  );
}

const hrefFicha = (id: string) => `${INTERESSADOS}/${id}`;

// ---------------------------------------------------------------- lista

export function ListaInteressadosConsole() {
  const sessao = useSessaoConsole();
  const ids = useId();
  const [dados, setDados] = useState<ListaInteressados | null>(null);
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [f, setF] = useState<FiltroInteressados>({ chip: "ANDAMENTO", busca: "", responsavel: "", origem: "" });
  const [cadastrando, setCadastrando] = useState(false);
  const carregado = useRef(false);

  const carregar = useCallback(async () => {
    setErro(null);
    const r = await chamarConsole<ListaInteressados>("/v1/interessados");
    if (r.ok) setDados(r.dados);
    else if (r.status !== 401) setErro(r.erro);
  }, []);

  useEffect(() => {
    if (carregado.current) return;
    carregado.current = true;
    void carregar();
  }, [carregar]);

  const hoje = dados?.hoje ?? "";
  const lista = useMemo(() => (dados ? filtrar(dados.interessados, f, hoje, sessao?.pessoaId) : []), [dados, f, hoje, sessao]);
  const chips = useMemo(() => contarChips(dados?.interessados ?? [], hoje), [dados, hoje]);
  const num = useMemo(() => numeros(dados?.interessados ?? [], hoje), [dados, hoje]);
  const proibido = erro?.codigo === "FORBIDDEN";
  const maxFunil = Math.max(1, ...num.funil.map((x) => x.quantos));

  async function ficarCom(i: Interessado) {
    if (!sessao) return;
    const r = await chamarConsole<{ versao: number }>(`/v1/interessados/${i.id}/responsavel`, { metodo: "PUT", corpo: { versao: i.versao, pessoaId: sessao.pessoaId } });
    if (r.ok) {
      window.location.assign(hrefFicha(i.id));
    } else void carregar();
  }

  const rotulo = f.chip === "TODOS" ? "Todos os interessados" : "Interessados em andamento, dos que pedem atenção primeiro";
  const filtrando = Boolean(f.busca.trim() || f.responsavel || f.origem);

  return (
    <MolduraConsole atual="comercial" pagina="co-in" sessao={sessao} trilha={[...TRILHA, { nome: "Interessados" }]}>
      {proibido ? <SemPermissao /> : (
        <>
          <div className="cabeca-ambar campo-ambar cabeca-equipe cb-cab cb-sem-num">
            <div>
              <p className="sobretitulo">Comercial</p>
              <h1>Interessados</h1>
              <span className="fio" aria-hidden="true" />
              <p className="lede">Os escritórios que pediram demonstração pelo site ou chegaram por indicação, do primeiro contato até virarem clientes.</p>
              {hoje ? <p className="cb-cab-linha"><span className="cb-peq" style={{ color: "var(--tinta)" }}>Hoje: {dataBrInteira(hoje)}</span></p> : null}
            </div>
            {dados?.podeEditar && sessao ? (
              <div className="in-cab-acao">
                <button className="btn btn-pri" type="button" onClick={() => setCadastrando(true)}><Icone nome="mais" className="ico" />Cadastrar interessado</button>
              </div>
            ) : null}
          </div>
          {cadastrando && dados && sessao ? (
            <JanelaCadastrarInteressado aberta hoje={dados.hoje} eu={sessao.pessoaId} pessoas={dados.pessoas} aoFechar={() => setCadastrando(false)} />
          ) : null}

          {erro ? <ErroLista aoTentar={() => void carregar()} /> : !dados ? <Carregando rotulo="Carregando os interessados…" linhas={5} /> : dados.interessados.length === 0 ? (
            <div className="estado" role="status">
              <span className="icone-estado"><Icone nome="maleta" className="ico" /></span>
              <h3>Nenhum interessado ainda</h3>
              <p>Os pedidos de demonstração do site entram aqui sozinhos, com a data, a origem e a autorização que a pessoa marcou. Quem chega por indicação, evento ou contato direto você cadastra em “Cadastrar interessado”.</p>
            </div>
          ) : (
            <>
              <section className="folha" aria-labelledby={`${ids}-num`}>
                <h2 id={`${ids}-num`} className="sr">Resumo dos interessados</h2>
                <dl className="cb-numeros" style={{ margin: 0 }}>
                  <div>
                    <dt>Sem responsável</dt>
                    <dd className={`cb-grande${num.sem.length ? " cb-urg" : ""}`}>{num.sem.length}</dd>
                    <dd><small>{num.sem.length ? "O site promete resposta em até 1 dia útil." : "Todos os pedidos têm quem cuide."}</small></dd>
                  </div>
                  <div>
                    <dt>Próximo passo vencido</dt>
                    <dd className={`cb-grande${num.vencidos.length ? " cb-urg" : ""}`}>{num.vencidos.length}</dd>
                    <dd><small>{num.vencidos.length ? num.vencidos.map((v) => `${v.nome} (${v.dias} ${v.dias === 1 ? "dia" : "dias"})`).join(", ") : "Nada atrasado."}</small></dd>
                  </div>
                  <div>
                    <dt>Pedidos em {nomeMes(hoje)}</dt>
                    <dd className="cb-grande">{dados.mes.pedidos}</dd>
                    <dd><small>{dados.mes.site} pelo site, {dados.mes.pedidos - dados.mes.site} por outros caminhos. {dados.mes.clientes ? <b>{dados.mes.clientes} {dados.mes.clientes === 1 ? "virou cliente" : "viraram clientes"}.</b> : null}</small></dd>
                  </div>
                  <div>
                    <dt>Em andamento, por estágio</dt>
                    <dd>
                      <ul className="in-funil" aria-label="Interessados por estágio">
                        {num.funil.map((x) => (
                          <li key={x.estagio}>
                            <span>{x.nome}</span>
                            <span className="cb-barra" aria-hidden="true"><i style={{ width: `${(x.quantos / maxFunil) * 100}%`, ["--c" as string]: COR_FUNIL[x.estagio] }} /></span>
                            <b>{x.quantos}</b>
                          </li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="folha" aria-labelledby={`${ids}-lista`} style={{ overflow: "hidden" }}>
                <h2 id={`${ids}-lista`} className="sr">Interessados</h2>
                <div className="ferramentas">
                  <div className="campo-busca">
                    <label className="sr" htmlFor={`${ids}-busca`}>Buscar interessado</label>
                    <Icone nome="busca" className="ico" />
                    <input className="entrada" id={`${ids}-busca`} type="search" value={f.busca} placeholder="Escritório, pessoa, e-mail ou cidade"
                      onChange={(e) => setF({ ...f, busca: e.target.value })} />
                  </div>
                  <label className="sr" htmlFor={`${ids}-resp`}>Responsável</label>
                  <select id={`${ids}-resp`} value={f.responsavel} onChange={(e) => setF({ ...f, responsavel: e.target.value })}>
                    <option value="">Responsável: todos</option>
                    <option value="MEUS">Os meus</option>
                    <option value="SEM">Sem responsável</option>
                    {dados.pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                  <label className="sr" htmlFor={`${ids}-orig`}>Origem</label>
                  <select id={`${ids}-orig`} value={f.origem} onChange={(e) => setF({ ...f, origem: e.target.value as FiltroInteressados["origem"] })}>
                    <option value="">Origem: todas</option>
                    {ORIGENS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <div className="chips" role="group" aria-label="Estágio">
                    {CHIPS.map((c) => (
                      <button key={c.chave} type="button" aria-pressed={f.chip === c.chave} onClick={() => setF({ ...f, chip: c.chave as Chip })}>
                        {c.nome} ({chips[c.chave]})
                      </button>
                    ))}
                  </div>
                </div>
                {lista.length === 0 ? (
                  <div className="estado" role="status" style={{ border: 0, boxShadow: "none" }}>
                    <span className="icone-estado"><Icone nome="busca" className="ico" /></span>
                    <h3>{f.busca.trim() ? `Nenhum interessado com “${f.busca.trim()}”` : "Nenhum interessado neste filtro"}</h3>
                    <p>{f.busca.trim() ? "Confira a grafia ou busque pelo e-mail." : "Troque o filtro para ver os outros."}</p>
                    {filtrando ? (
                      <div className="acoes"><button className="btn btn-sec" type="button" onClick={() => setF({ ...f, busca: "", responsavel: "", origem: "" })}>Limpar a busca</button></div>
                    ) : null}
                  </div>
                ) : (
                  <>
                    <table className="cb-tab so-pc">
                      <caption className="sr">{rotulo}</caption>
                      <colgroup><col style={{ width: "25%" }} /><col style={{ width: "10%" }} /><col style={{ width: "10%" }} /><col style={{ width: "17%" }} /><col style={{ width: "15%" }} /><col style={{ width: "19%" }} /><col style={{ width: 64 }} /></colgroup>
                      <thead>
                        <tr><th scope="col">Interessado</th><th scope="col">Origem</th><th scope="col">Chegou em</th><th scope="col">Estágio</th><th scope="col">Responsável</th><th scope="col">Próximo passo</th><th scope="col"><span className="sr">Abrir</span></th></tr>
                      </thead>
                      <tbody>
                        {lista.map((i) => (
                          <tr key={i.id} className={aberto(i) ? undefined : "in-fim"}>
                            <td><div className="cb-esc"><a href={hrefFicha(i.id)}>{i.escritorio}</a><small>{i.nome} · {cidadeUf(i) ?? "sem cidade"}</small></div></td>
                            <td><span className="in-origem"><Icone nome={ICONE_ORIGEM[i.origem]} className="ico" />{ORIGENS_INTERESSADO[i.origem]}</span></td>
                            <td className="num">{dataLonga(i.chegouEm)}</td>
                            <td><Selo e={i.estagio} /></td>
                            <td>
                              {i.responsavel ? <Pessoa nome={i.responsavel.nome} /> : i.estagio === "NOVO" && dados.podeEditar ? (
                                <div className="in-ninguem">
                                  <button className="btn btn-sec btn-compacto" type="button" onClick={() => void ficarCom(i)}><Icone nome="mais" className="ico" />Ficar com ele</button>
                                  <small><Icone nome="alerta" className="ico" />sem responsável</small>
                                </div>
                              ) : <span className="cb-peq">ninguém</span>}
                            </td>
                            <td><PassoCelula i={i} hoje={hoje} /></td>
                            <td><a className="cb-ir" href={hrefFicha(i.id)} aria-label={`Abrir ${i.escritorio}`}><Icone nome="dir" className="ico" /></a></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <ul className="cb-cartoes so-cel" aria-label={rotulo}>
                      {lista.map((i) => (
                        <li key={i.id} className="cb-cartao">
                          <div className="cb-c-topo"><div><a className="cb-c-nome" href={hrefFicha(i.id)}>{i.escritorio}</a><small>{i.nome} · {cidadeUf(i) ?? "sem cidade"}</small></div></div>
                          <div className="cb-sit"><Selo e={i.estagio} /></div>
                          <PassoCelula i={i} hoje={hoje} />
                          <dl>
                            <dt>Origem</dt><dd>{ORIGENS_INTERESSADO[i.origem]}</dd>
                            <dt>Chegou em</dt><dd>{dataLonga(i.chegouEm)}</dd>
                            <dt>Responsável</dt><dd>{i.responsavel?.nome ?? (i.estagio === "NOVO" ? "ninguém ainda" : "ninguém")}</dd>
                          </dl>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <div className="mais"><span>{f.chip === "ANDAMENTO" ? `${chips.ANDAMENTO} em andamento. Os encerrados ficam em “Clientes” e “Perdidos e descartados”.` : `Mostrando ${lista.length} ${lista.length === 1 ? "interessado" : "interessados"}`}</span></div>
              </section>
            </>
          )}
        </>
      )}
    </MolduraConsole>
  );
}

// ---------------------------------------------------------------- ficha

type Janelas = "responsavel" | "proximo" | "mudar" | "converter" | "encerrar" | "reabrir" | null;

/** Conflito de versão, sem permissão ou outro erro: o texto que a janela mostra. */
function textoFalha(e: ErroApi): string {
  if (e.codigo === "VERSION_CONFLICT") return "Outra pessoa mudou este interessado agora há pouco. A ficha foi atualizada: confira e tente de novo.";
  if (e.codigo === "FORBIDDEN") return textoDoErro(e);
  if (e.codigo === "INVALID_TRANSITION") return "Este interessado já mudou de estágio. A ficha foi atualizada.";
  return "O servidor não respondeu. O que você escreveu continua aqui: tente de novo.";
}

/** O que cada janela devolve: campos com erro (do banco) ou a falha geral. */
function camposDoErro(e: ErroApi): string[] {
  const c = e.detalhes?.campos;
  return e.codigo === "VALIDATION_ERROR" && Array.isArray(c) ? c.map(String) : [];
}

function Campo({ id, rotulo, erro, ajuda, opcional, children }: { id: string; rotulo: ReactNode; erro?: string; ajuda?: string; opcional?: boolean; children: ReactNode }) {
  return (
    <div className="campo">
      <label htmlFor={id}>{rotulo}{opcional ? <span className="opc"> (opcional)</span> : null}</label>
      {children}
      {ajuda ? <p className="ajuda" id={`${id}-ajuda`}>{ajuda}</p> : null}
      {erro ? <ErroCampo id={`${id}-erro`}>{erro}</ErroCampo> : null}
    </div>
  );
}

const descr = (id: string, erro?: string, ajuda?: string) => [ajuda ? `${id}-ajuda` : "", erro ? `${id}-erro` : ""].filter(Boolean).join(" ") || undefined;

/** Botões do pé da janela: cancelar e o principal (ocupado enquanto envia). */
function Pe({ enviando, aoCancelar, icone, texto }: { enviando: boolean; aoCancelar: () => void; icone: Parameters<typeof Icone>[0]["nome"]; texto: string }) {
  return (
    <>
      <button className="btn btn-fantasma" type="button" disabled={enviando} onClick={aoCancelar}>Cancelar</button>
      <button className="btn btn-pri" type="submit" aria-busy={enviando || undefined} aria-disabled={enviando || undefined}>
        {enviando ? "Salvando…" : <><Icone nome={icone} className="ico" />{texto}</>}
      </button>
    </>
  );
}

/** Estado comum das janelas: erros por campo, falha geral e o envio. */
function useEnvio(corpo: RefObject<HTMLDivElement | null>, aoFeito: () => void, aoConflito: () => void) {
  const [erros, setErros] = useState<Record<string, string>>({});
  const [falha, setFalha] = useState<ErroApi | null>(null);
  const [enviando, setEnviando] = useState(false);
  async function enviar<T>(validos: Record<string, string>, chamada: () => Promise<Resposta<T>>, mapa: Record<string, string> = {}) {
    setFalha(null);
    if (Object.keys(validos).length) {
      setErros(validos);
      return focarPrimeiroErro(corpo.current);
    }
    setErros({});
    setEnviando(true);
    const r = await chamada();
    setEnviando(false);
    if (r.ok) return aoFeito();
    const campos = camposDoErro(r.erro);
    if (campos.length) {
      setErros(Object.fromEntries(campos.map((c) => [c, mapa[c] ?? "Confira este campo."])));
      return focarPrimeiroErro(corpo.current);
    }
    if (r.erro.codigo === "VERSION_CONFLICT" || r.erro.codigo === "INVALID_TRANSITION") aoConflito();
    setFalha(r.erro);
  }
  const limpar = () => { setErros({}); setFalha(null); };
  return { erros, falha, enviando, enviar, limpar };
}

function Topo({ erros, falha, naoMudou }: { erros: Record<string, string>; falha: ErroApi | null; naoMudou: string }) {
  const n = Object.keys(erros).length;
  return (
    <>
      {n ? <Aviso tom="urgencia" titulo={faltaAcertar(n)}>{naoMudou}</Aviso> : null}
      {falha ? <Aviso tom="urgencia" titulo="Não deu para salvar agora.">{textoFalha(falha)}</Aviso> : null}
    </>
  );
}

function SelecaoPessoa({ id, valor, aoMudar, pessoas, erro, ajuda, rotulo }: {
  id: string; valor: string; aoMudar: (v: string) => void; pessoas: PessoaInteressados[]; erro?: string; ajuda?: string; rotulo: string;
}) {
  return (
    <Campo id={id} rotulo={rotulo} erro={erro} ajuda={ajuda}>
      <select className="entrada" id={id} value={valor} onChange={(e) => aoMudar(e.target.value)} data-foco
        aria-invalid={erro ? true : undefined} aria-describedby={descr(id, erro, ajuda)}>
        <option value="">Escolha</option>
        {pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome} · {funcaoDe(p)}</option>)}
      </select>
    </Campo>
  );
}

function JanelaResponsavel({ f, aberta, aoFechar, aoFeito, aoConflito }: JanelaProps) {
  const ids = useId();
  const [quem, setQuem] = useState(f.responsavel?.id ?? "");
  const [recado, setRecado] = useState("");
  const corpo = useRef<HTMLDivElement>(null);
  const e = useEnvio(corpo, aoFeito, aoConflito);
  const outro = f.pessoas.filter((p) => p.id !== f.responsavel?.id || !f.responsavel);
  return (
    <Janela id={`${ids}-j`} aberta={aberta} aoFechar={() => { if (!e.enviando) { e.limpar(); aoFechar(); } }} sobretitulo="Responsável"
      titulo={f.responsavel ? "Trocar o responsável" : "Atribuir o pedido"} descricao={`${ids}-d`}
      aoEnviar={() => void e.enviar(quem ? {} : { responsavel: "Escolha quem fica com o pedido." },
        () => chamarConsole(`/v1/interessados/${f.id}/responsavel`, { metodo: "PUT", corpo: { versao: f.versao, pessoaId: quem, ...(recado.trim() ? { recado: recado.trim() } : {}) } }),
        { responsavel: "Só quem vê Interessados pode ser responsável." })}
      pe={<Pe enviando={e.enviando} aoCancelar={aoFechar} icone="trocar" texto={f.responsavel ? "Trocar o responsável" : "Atribuir"} />}>
      <div ref={corpo} style={{ display: "contents" }}>
        <p id={`${ids}-d`}>Quem fica com o {f.escritorio} passa a ver o próximo passo e responde pelo pedido.</p>
        <Topo erros={e.erros} falha={e.falha} naoMudou="O responsável não mudou." />
        <SelecaoPessoa id={`${ids}-quem`} rotulo="Responsável" valor={quem} aoMudar={setQuem} pessoas={outro} erro={e.erros.responsavel}
          ajuda="Só aparece quem vê Interessados: Administração e Implantação." />
        <Campo id={`${ids}-rec`} rotulo="Recado para quem assume" opcional erro={e.erros.recado}>
          <textarea className="entrada" id={`${ids}-rec`} rows={2} maxLength={300} value={recado} onChange={(x) => setRecado(x.target.value)} />
        </Campo>
      </div>
    </Janela>
  );
}

interface JanelaProps {
  f: FichaInteressado;
  aberta: boolean;
  aoFechar: () => void;
  aoFeito: () => void;
  aoConflito: () => void;
}

function JanelaProximo({ f, aberta, aoFechar, aoFeito, aoConflito, eu }: JanelaProps & { eu: string }) {
  const ids = useId();
  const [passo, setPasso] = useState(f.proximo?.passo ?? "");
  const [data, setData] = useState(f.proximo?.data ? dataBrInteira(f.proximo.data) : "");
  const [hr, setHr] = useState(f.proximo?.hora ? horaBr(f.proximo.hora) : "");
  const [quem, setQuem] = useState(f.proximo?.quem?.id ?? f.responsavel?.id ?? eu);
  const corpo = useRef<HTMLDivElement>(null);
  const e = useEnvio(corpo, aoFeito, aoConflito);
  function salvar() {
    const v: Record<string, string> = {};
    const iso = lerDataBr(data);
    const h = hr.trim() ? lerHora(hr) : null;
    if (passo.trim().length < 2) v.passo = "Escreva o que fazer.";
    if (!iso) v.data = "Escreva a data como 26/11/2026.";
    if (hr.trim() && !h) v.hora = "Escreva a hora como 18h00.";
    if (!quem) v.quem = "Escolha quem faz.";
    void e.enviar(v, () => chamarConsole(`/v1/interessados/${f.id}/proximo`, { metodo: "PUT", corpo: { versao: f.versao, passo: passo.trim(), data: iso, hora: h, quem } }),
      { passo: "Escreva o que fazer.", data: "Confira a data.", quem: "Só quem vê Interessados pode fazer o passo." });
  }
  return (
    <Janela id={`${ids}-j`} aberta={aberta} aoFechar={() => { if (!e.enviando) { e.limpar(); aoFechar(); } }} sobretitulo="Próximo passo" titulo="Mudar o próximo passo"
      descricao={`${ids}-d`} aoEnviar={salvar} pe={<Pe enviando={e.enviando} aoCancelar={aoFechar} icone="check" texto="Salvar" />}>
      <div ref={corpo} style={{ display: "contents" }}>
        <p id={`${ids}-d`}>O próximo passo aparece na lista. Vencido, fica em destaque.</p>
        <Topo erros={e.erros} falha={e.falha} naoMudou="O próximo passo não mudou." />
        <Campo id={`${ids}-p`} rotulo="O que fazer" erro={e.erros.passo}>
          <input className="entrada" id={`${ids}-p`} value={passo} maxLength={160} onChange={(x) => setPasso(x.target.value)} data-foco
            aria-invalid={e.erros.passo ? true : undefined} aria-describedby={descr(`${ids}-p`, e.erros.passo)} />
        </Campo>
        <div className="cb-duas">
          <Campo id={`${ids}-d1`} rotulo="Data" erro={e.erros.data}>
            <input className="entrada" id={`${ids}-d1`} inputMode="numeric" placeholder="dd/mm/aaaa" value={data} onChange={(x) => setData(x.target.value)}
              aria-invalid={e.erros.data ? true : undefined} aria-describedby={descr(`${ids}-d1`, e.erros.data)} />
          </Campo>
          <Campo id={`${ids}-h`} rotulo="Hora" opcional erro={e.erros.hora}>
            <input className="entrada" id={`${ids}-h`} inputMode="numeric" placeholder="18h00" value={hr} onChange={(x) => setHr(x.target.value)}
              aria-invalid={e.erros.hora ? true : undefined} aria-describedby={descr(`${ids}-h`, e.erros.hora)} />
          </Campo>
        </div>
        <SelecaoPessoa id={`${ids}-q`} rotulo="Quem faz" valor={quem} aoMudar={setQuem} pessoas={f.pessoas} erro={e.erros.quem} />
      </div>
    </Janela>
  );
}

const OPCOES_ESTAGIO: { e: "EM_CONTATO" | "DEMONSTRACAO" | "PROPOSTA"; d: string }[] = [
  { e: "EM_CONTATO", d: "Já falamos com a pessoa" },
  { e: "DEMONSTRACAO", d: "Com data e hora" },
  { e: "PROPOSTA", d: "Valor e condições mandados" },
];

function JanelaMudar({ f, aberta, aoFechar, aoFeito, aoConflito }: JanelaProps) {
  const ids = useId();
  const opcoes = OPCOES_ESTAGIO.filter((o) => o.e !== f.estagio);
  const [novo, setNovo] = useState(opcoes[0]!.e);
  const [data, setData] = useState("");
  const [hr, setHr] = useState("");
  const [motivo, setMotivo] = useState("");
  const corpo = useRef<HTMLDivElement>(null);
  const e = useEnvio(corpo, aoFeito, aoConflito);
  const demo = novo === "DEMONSTRACAO";
  const iso = lerDataBr(data);
  const h = lerHora(hr);
  function salvar() {
    const v: Record<string, string> = {};
    if (demo && !iso) v.data = "Escreva a data da demonstração, como 26/11/2026.";
    if (demo && !h) v.hora = "Escreva a hora, como 18h00.";
    if (!motivo.trim()) v.motivo = "Escreva o motivo da mudança. Ele fica no histórico.";
    void e.enviar(v, () => chamarConsole(`/v1/interessados/${f.id}/estagio`, { metodo: "PUT", corpo: { versao: f.versao, estagio: novo, motivo: motivo.trim(), ...(demo ? { data: iso, hora: h } : {}) } }),
      { motivo: "Escreva o motivo da mudança. Ele fica no histórico.", data: "Escreva a data da demonstração.", hora: "Escreva a hora." });
  }
  return (
    <Janela id={`${ids}-j`} aberta={aberta} aoFechar={() => { if (!e.enviando) { e.limpar(); aoFechar(); } }} sobretitulo="Mudar estágio" titulo={`Mudar o estágio do ${f.escritorio}`}
      descricao={`${ids}-d`} aoEnviar={salvar} pe={<Pe enviando={e.enviando} aoCancelar={aoFechar} icone="trocar" texto="Mudar estágio" />}>
      <div ref={corpo} style={{ display: "contents" }}>
        <p id={`${ids}-d`}>O estágio só muda com um motivo, que fica no histórico, com o seu nome e a hora.</p>
        <Topo erros={e.erros} falha={e.falha} naoMudou="O estágio não mudou." />
        <p className="in-caminho"><Selo e={f.estagio} /><Icone nome="seta" className="ico" /><Selo e={novo} /></p>
        <fieldset className="grupo-opcoes in-estagios">
          <legend>Novo estágio</legend>
          {opcoes.map((o, i) => (
            <label key={o.e} className="opcao">
              <input className="marcar" type="radio" name={`${ids}-est`} checked={novo === o.e} onChange={() => setNovo(o.e)} data-foco={i === 0 || undefined} />
              <span>{ESTAGIOS_INTERESSADO[o.e]}<small>{o.d}</small></span>
            </label>
          ))}
        </fieldset>
        {demo ? (
          <div className="cb-duas">
            <Campo id={`${ids}-d1`} rotulo="Data da demonstração" erro={e.erros.data}>
              <input className="entrada" id={`${ids}-d1`} inputMode="numeric" placeholder="dd/mm/aaaa" value={data} onChange={(x) => setData(x.target.value)}
                aria-invalid={e.erros.data ? true : undefined} aria-describedby={descr(`${ids}-d1`, e.erros.data)} />
            </Campo>
            <Campo id={`${ids}-h`} rotulo="Hora" erro={e.erros.hora}>
              <input className="entrada" id={`${ids}-h`} inputMode="numeric" placeholder="18h00" value={hr} onChange={(x) => setHr(x.target.value)}
                aria-invalid={e.erros.hora ? true : undefined} aria-describedby={descr(`${ids}-h`, e.erros.hora)} />
            </Campo>
          </div>
        ) : null}
        <Campo id={`${ids}-m`} rotulo="Motivo" erro={e.erros.motivo} ajuda="Obrigatório. Fica no histórico do interessado, com seu nome e a data.">
          <textarea className="entrada" id={`${ids}-m`} rows={3} maxLength={300} value={motivo} onChange={(x) => setMotivo(x.target.value)} aria-required="true"
            aria-invalid={e.erros.motivo ? true : undefined} aria-describedby={descr(`${ids}-m`, e.erros.motivo, "s")} />
        </Campo>
        {demo && iso && h ? (
          <p className="permissao"><Icone nome="relogio" className="ico" />O próximo passo vira “Demonstração por vídeo, {diaMes(iso, f.hoje)} às {horaBr(h)}”{f.responsavel ? `, com ${f.responsavel.nome}` : ""}.</p>
        ) : null}
      </div>
    </Janela>
  );
}

function JanelaConverter({ f, aberta, aoFechar, aoFeito, aoConflito }: JanelaProps) {
  const ids = useId();
  const [nome, setNome] = useState(f.escritorio);
  const [cidade, setCidade] = useState(f.cidade ?? "");
  const [uf, setUf] = useState(f.uf ?? "");
  const [motivo, setMotivo] = useState("");
  const corpo = useRef<HTMLDivElement>(null);
  const e = useEnvio(corpo, aoFeito, aoConflito);
  function salvar() {
    const v: Record<string, string> = {};
    if (nome.trim().length < 2) v.nome = "Escreva o nome do escritório.";
    if (cidade.trim().length < 2) v.cidade = "Escreva a cidade.";
    if (!uf) v.uf = "Escolha a UF.";
    if (!motivo.trim()) v.motivo = "Escreva como fechou. Vai para o histórico.";
    void e.enviar(v, () => chamarConsole(`/v1/interessados/${f.id}/converter`, { corpo: { versao: f.versao, nome: nome.trim(), cidade: cidade.trim(), uf, motivo: motivo.trim() } }), { nome: "Confira o nome.", cidade: "Confira a cidade.", uf: "Confira a UF.", motivo: "Escreva como fechou." });
  }
  const veio = (sim: boolean) => (sim ? <span className="in-veio"><Icone nome="janela" className="ico" />veio do pedido</span> : null);
  return (
    <Janela id={`${ids}-j`} aberta={aberta} aoFechar={() => { if (!e.enviando) { e.limpar(); aoFechar(); } }} sobretitulo="Clientes" titulo="Cadastrar escritório"
      descricao={`${ids}-d`} aoEnviar={salvar} pe={<Pe enviando={e.enviando} aoCancelar={aoFechar} icone="mais" texto="Cadastrar escritório" />}>
      <div ref={corpo} style={{ display: "contents" }}>
        <p id={`${ids}-d`}>O cadastro de sempre, já preenchido com o que veio do {f.escritorio}. Confira e cadastre: nada precisa ser digitado de novo.</p>
        <Topo erros={e.erros} falha={e.falha} naoMudou="O escritório ainda não foi cadastrado." />
        <Campo id={`${ids}-n`} rotulo={<>Nome do escritório{veio(nome === f.escritorio)}</>} erro={e.erros.nome}>
          <input className="entrada" id={`${ids}-n`} value={nome} maxLength={160} autoComplete="organization" onChange={(x) => setNome(x.target.value)} data-foco
            aria-invalid={e.erros.nome ? true : undefined} aria-describedby={descr(`${ids}-n`, e.erros.nome)} />
        </Campo>
        <div className="duas">
          <Campo id={`${ids}-c`} rotulo={<>Cidade{veio(Boolean(f.cidade) && cidade === f.cidade)}</>} erro={e.erros.cidade}>
            <input className="entrada" id={`${ids}-c`} value={cidade} maxLength={80} autoComplete="address-level2" onChange={(x) => setCidade(x.target.value)}
              aria-invalid={e.erros.cidade ? true : undefined} aria-describedby={descr(`${ids}-c`, e.erros.cidade)} />
          </Campo>
          <Campo id={`${ids}-u`} rotulo="UF" erro={e.erros.uf}>
            <select className="entrada" id={`${ids}-u`} value={uf} onChange={(x) => setUf(x.target.value)}
              aria-invalid={e.erros.uf ? true : undefined} aria-describedby={descr(`${ids}-u`, e.erros.uf)}>
              <option value="">Escolha</option>
              {UFS.map((u) => <option key={u}>{u}</option>)}
            </select>
          </Campo>
        </div>
        <ul className="in-vai" aria-label="Também vai para a ficha do escritório">
          <li><Icone nome="pessoas" className="ico" /><span><b>Contato:</b> {[f.nome, f.email, f.whats ? whatsLegivel(f.whats) : null].filter(Boolean).join(", ")}</span></li>
          <li><Icone nome="historico" className="ico" /><span>{f.origem === "SITE" ? "O pedido, a autorização" : "O contato, de onde veio"}, as notas e o histórico do interessado ficam ligados à ficha</span></li>
          {f.responsavel ? <li><Icone nome="cracha" className="ico" /><span>{f.responsavel.nome} fica atribuído como Implantação</span></li> : null}
        </ul>
        <Campo id={`${ids}-m`} rotulo="Como fechou" erro={e.erros.motivo} ajuda="Obrigatório. Vai para o histórico do interessado e do escritório.">
          <textarea className="entrada" id={`${ids}-m`} rows={2} maxLength={300} value={motivo} onChange={(x) => setMotivo(x.target.value)} aria-required="true"
            aria-invalid={e.erros.motivo ? true : undefined} aria-describedby={descr(`${ids}-m`, e.erros.motivo, "s")} />
        </Campo>
        <p className="permissao"><Icone nome="ajuda" className="ico" />O escritório entra “Em implantação”. O sócio dono você convida depois, na aba Sócio.</p>
      </div>
    </Janela>
  );
}

function JanelaEncerrar({ f, aberta, aoFechar, aoFeito, aoConflito }: JanelaProps) {
  const ids = useId();
  const [como, setComo] = useState<"PERDIDO" | "DESCARTADO">("PERDIDO");
  const [porque, setPorque] = useState<string>(PORQUES_PERDIDO[0]);
  const [motivo, setMotivo] = useState("");
  const [volta, setVolta] = useState("");
  const corpo = useRef<HTMLDivElement>(null);
  const e = useEnvio(corpo, aoFeito, aoConflito);
  const lista = como === "PERDIDO" ? PORQUES_PERDIDO : PORQUES_DESCARTADO;
  function trocar(c: "PERDIDO" | "DESCARTADO") {
    setComo(c);
    setPorque((c === "PERDIDO" ? PORQUES_PERDIDO : PORQUES_DESCARTADO)[0]);
  }
  function salvar() {
    const v: Record<string, string> = {};
    const iso = volta.trim() ? lerDataBr(volta) : null;
    if (!motivo.trim()) v.motivo = "Escreva o motivo. Ele fica no histórico.";
    if (como === "PERDIDO" && volta.trim() && (!iso || iso <= f.hoje)) v.procurar = "Escreva uma data depois de hoje, como 01/03/2027.";
    void e.enviar(v, () => chamarConsole(`/v1/interessados/${f.id}/encerrar`, {
      corpo: { versao: f.versao, como, porque, motivo: motivo.trim(), ...(como === "PERDIDO" && iso ? { procurarEm: iso } : {}) },
    }), { motivo: "Escreva o motivo.", procurar: "Escreva uma data depois de hoje.", porque: "Escolha por quê." });
  }
  return (
    <Janela id={`${ids}-j`} aberta={aberta} alerta aoFechar={() => { if (!e.enviando) { e.limpar(); aoFechar(); } }} sobretitulo="Encerrar" titulo={`Encerrar o ${f.escritorio}?`}
      descricao={`${ids}-d`} aoEnviar={salvar}
      pe={<Pe enviando={e.enviando} aoCancelar={aoFechar} icone="check" texto={como === "PERDIDO" ? "Encerrar como perdido" : "Descartar"} />}>
      <div ref={corpo} style={{ display: "contents" }}>
        <p id={`${ids}-d`}>O interessado sai da lista em andamento. Nada é apagado e dá para reabrir depois, com motivo.</p>
        <Topo erros={e.erros} falha={e.falha} naoMudou="O interessado não foi encerrado." />
        <fieldset className="grupo-opcoes in-estagios">
          <legend>Como termina</legend>
          <label className="opcao">
            <input className="marcar" type="radio" name={`${ids}-fim`} checked={como === "PERDIDO"} onChange={() => trocar("PERDIDO")} data-foco />
            <span>Perdido<small>Era um escritório de verdade e não fechou</small></span>
          </label>
          <label className="opcao">
            <input className="marcar" type="radio" name={`${ids}-fim`} checked={como === "DESCARTADO"} onChange={() => trocar("DESCARTADO")} />
            <span>Descartado<small>Teste, propaganda, pedido repetido ou fora do público</small></span>
          </label>
        </fieldset>
        <Campo id={`${ids}-p`} rotulo={como === "PERDIDO" ? "Por que não fechou" : "Por que descartar"} erro={e.erros.porque}>
          <select className="entrada" id={`${ids}-p`} value={porque} onChange={(x) => setPorque(x.target.value)}>
            {lista.map((p) => <option key={p}>{p}</option>)}
          </select>
        </Campo>
        <Campo id={`${ids}-m`} rotulo="Motivo" erro={e.erros.motivo} ajuda="Obrigatório. Fica no histórico.">
          <textarea className="entrada" id={`${ids}-m`} rows={2} maxLength={300} value={motivo} onChange={(x) => setMotivo(x.target.value)} aria-required="true"
            aria-invalid={e.erros.motivo ? true : undefined} aria-describedby={descr(`${ids}-m`, e.erros.motivo, "s")} />
        </Campo>
        {como === "PERDIDO" ? (
          <Campo id={`${ids}-v`} rotulo="Lembrar de procurar de novo em" opcional erro={e.erros.procurar} ajuda="Vira o próximo passo de quem é responsável.">
            <input className="entrada" id={`${ids}-v`} inputMode="numeric" placeholder="dd/mm/aaaa" value={volta} onChange={(x) => setVolta(x.target.value)}
              aria-invalid={e.erros.procurar ? true : undefined} aria-describedby={descr(`${ids}-v`, e.erros.procurar, "s")} />
          </Campo>
        ) : null}
      </div>
    </Janela>
  );
}

function JanelaReabrir({ f, aberta, aoFechar, aoFeito, aoConflito }: JanelaProps) {
  const ids = useId();
  const [motivo, setMotivo] = useState("");
  const corpo = useRef<HTMLDivElement>(null);
  const e = useEnvio(corpo, aoFeito, aoConflito);
  return (
    <Janela id={`${ids}-j`} aberta={aberta} aoFechar={() => { if (!e.enviando) { e.limpar(); aoFechar(); } }} sobretitulo="Reabrir" titulo={`Reabrir o ${f.escritorio}`}
      descricao={`${ids}-d`}
      aoEnviar={() => void e.enviar(motivo.trim() ? {} : { motivo: "Escreva o motivo. Ele fica no histórico." },
        () => chamarConsole(`/v1/interessados/${f.id}/reabrir`, { corpo: { versao: f.versao, motivo: motivo.trim() } }), { motivo: "Escreva o motivo." })}
      pe={<Pe enviando={e.enviando} aoCancelar={aoFechar} icone="reenviar" texto="Reabrir" />}>
      <div ref={corpo} style={{ display: "contents" }}>
        <p id={`${ids}-d`}>O interessado volta para “Em contato”{f.responsavel ? `, com ${f.responsavel.nome}` : ", com você como responsável"}.</p>
        <Topo erros={e.erros} falha={e.falha} naoMudou="O interessado não foi reaberto." />
        <Campo id={`${ids}-m`} rotulo="Motivo" erro={e.erros.motivo} ajuda="Obrigatório. Fica no histórico.">
          <textarea className="entrada" id={`${ids}-m`} rows={2} maxLength={300} value={motivo} onChange={(x) => setMotivo(x.target.value)} data-foco aria-required="true"
            aria-invalid={e.erros.motivo ? true : undefined} aria-describedby={descr(`${ids}-m`, e.erros.motivo, "s")} />
        </Campo>
      </div>
    </Janela>
  );
}

function Notas({ f, aoSalvar }: { f: FichaInteressado; aoSalvar: () => void }) {
  const ids = useId();
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  async function salvar() {
    if (!texto.trim()) return setErro("Escreva a nota antes de salvar.");
    setErro(null);
    setSalvando(true);
    const r = await chamarConsole(`/v1/interessados/${f.id}/notas`, { corpo: { texto: texto.trim() } });
    setSalvando(false);
    if (!r.ok) return setErro(r.erro.codigo === "FORBIDDEN" ? textoDoErro(r.erro) : "Não deu para salvar a nota agora. O que você escreveu continua aqui.");
    setTexto("");
    aoSalvar();
  }
  return (
    <section className="folha" aria-labelledby={`${ids}-t`}>
      <div className="folha-cab"><div><h2 id={`${ids}-t`}>Notas</h2><p className="sub">Só a equipe T3jus vê. Depois de salva, a nota não muda nem sai.</p></div></div>
      {f.podeEditar ? (
        <form className="form-folha" noValidate style={{ paddingTop: 0 }} onSubmit={(e) => { e.preventDefault(); void salvar(); }}>
          <div className="campo c6">
            <label htmlFor={`${ids}-n`} className="sr">Nota nova</label>
            <textarea className="entrada" id={`${ids}-n`} rows={2} maxLength={2000} placeholder="Escreva uma nota sobre a conversa" value={texto}
              onChange={(e) => setTexto(e.target.value)} aria-invalid={erro ? true : undefined} aria-describedby={erro ? `${ids}-n-erro` : undefined} />
            {erro ? <ErroCampo id={`${ids}-n-erro`}>{erro}</ErroCampo> : null}
          </div>
          <div className="form-pe" style={{ gridColumn: "span 6" }}>
            <button className="btn btn-sec" type="submit" aria-busy={salvando || undefined}><Icone nome="pena" className="ico" />{salvando ? "Salvando…" : "Salvar nota"}</button>
          </div>
        </form>
      ) : null}
      {f.notas.length ? (
        <ol className="lista notas" reversed>
          {f.notas.map((n) => (
            <li key={n.id}>
              <blockquote>“{n.texto}”</blockquote>
              <footer><span className="av-p" aria-hidden="true">{iniciais(n.autor.nome)}</span>{n.autor.nome} · <time dateTime={n.criadoEm}>{dataLonga(n.criadoEm)}, {hora(n.criadoEm)}</time></footer>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

function Historico({ f }: { f: FichaInteressado }) {
  const ids = useId();
  const dias = useMemo(() => {
    const m = new Map<string, FichaInteressado["historico"]>();
    for (const e of f.historico) {
      const d = dataLonga(e.ocorridoEm);
      m.set(d, [...(m.get(d) ?? []), e]);
    }
    return [...m.entries()];
  }, [f.historico]);
  const hojeBr = dataBrInteira(f.hoje);
  return (
    <section className="folha" aria-labelledby={`${ids}-t`}>
      <div className="folha-cab"><div><h2 id={`${ids}-t`}>Histórico</h2><p className="sub">Quem fez o quê, e quando. Nada aqui é apagado.</p></div></div>
      <div style={{ padding: "0 24px 8px" }}>
        {dias.map(([dia, evs]) => (
          <div key={dia} className="eventos-dia">
            <h3>{dia === hojeBr ? `${dia} · hoje` : dia}</h3>
            <ol className="eventos">
              {evs.map((e) => {
                const x = fraseEvento(e);
                return (
                  <li key={e.id}>
                    <time dateTime={e.ocorridoEm}>{hora(e.ocorridoEm)}</time>
                    <span className={`pto${x.forte ? " forte" : ""}`} aria-hidden="true" />
                    <div><p><b>{x.quem}</b> {x.texto}</p>{x.detalhe ? <small>{x.detalhe}</small> : null}</div>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}

export function FichaInteressadoConsole({ id }: { id: string }) {
  const sessao = useSessaoConsole();
  const ids = useId();
  const [f, setF] = useState<FichaInteressado | null>(null);
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [janela, setJanela] = useState<Janelas>(null);
  const [aviso, setAviso] = useState<{ tom: "sucesso" | "atencao"; titulo: string; texto?: string; escritorio?: string } | null>(null);
  const [vindo, setVindo] = useState<"novo" | "juntado" | null>(null);
  const carregado = useRef(false);

  const carregar = useCallback(async () => {
    const r = await chamarConsole<FichaInteressado>(`/v1/interessados/${id}`);
    if (r.ok) {
      setErro(null);
      setF(r.dados);
    } else if (r.status !== 401) setErro(r.erro);
  }, [id]);

  useEffect(() => {
    if (carregado.current) return;
    carregado.current = true;
    // Vindo do cadastro à mão (F2.5): o aviso de cadastrado, de juntado ou a janela de reabrir.
    const q = new URLSearchParams(window.location.search);
    const vindo = q.get("novo") ? "novo" : q.get("juntado") ? "juntado" : q.get("reabrir") ? "reabrir" : null;
    if (vindo) window.history.replaceState(null, "", window.location.pathname);
    void carregar().then(() => {
      if (vindo === "reabrir") setJanela("reabrir");
      else if (vindo) setVindo(vindo);
    });
  }, [carregar]);

  const feito = (titulo: string, texto?: string) => () => {
    setJanela(null);
    setAviso({ tom: "sucesso", titulo, texto });
    void carregar();
  };
  const conflito = () => void carregar();

  async function ficarCom() {
    if (!f || !sessao) return;
    const r = await chamarConsole(`/v1/interessados/${f.id}/responsavel`, { metodo: "PUT", corpo: { versao: f.versao, pessoaId: sessao.pessoaId } });
    if (r.ok) setAviso({ tom: "sucesso", titulo: "Agora o pedido é seu.", texto: "Responda até o próximo dia útil, como o site promete." });
    else setAviso({ tom: "atencao", titulo: "Não deu para ficar com ele agora.", texto: textoFalha(r.erro) });
    void carregar();
  }

  const nome = f?.escritorio ?? "Interessado";
  if (erro) {
    return (
      <MolduraConsole atual="comercial" pagina="co-in" sessao={sessao} trilha={[...TRILHA, { nome: "Interessados", href: INTERESSADOS }, { nome: "Interessado" }]}>
        {erro.codigo === "FORBIDDEN" ? <SemPermissao /> : erro.codigo === "NOT_FOUND" ? (
          <Estado icone="busca" moldura nivel={1} titulo="Este interessado não está mais aqui"
            acoes={<a className="btn btn-pri" href={INTERESSADOS}>Voltar para Interessados</a>}>
            O endereço pode estar errado, ou os dados foram apagados no fim do prazo de 12 meses.
          </Estado>
        ) : <ErroLista aoTentar={() => void carregar()} />}
      </MolduraConsole>
    );
  }
  if (!f) {
    return (
      <MolduraConsole atual="comercial" pagina="co-in" sessao={sessao} trilha={[...TRILHA, { nome: "Interessados", href: INTERESSADOS }, { nome: "Interessado" }]}>
        <Carregando rotulo="Carregando o interessado…" />
      </MolduraConsole>
    );
  }

  const pode = f.podeEditar;
  const ab = aberto(f);
  const t = prazo(f, f.hoje);
  const meta = [f.nome, cidadeUf(f), `${TAMANHOS_INTERESSADO[f.tamanho]} ${f.tamanho === "SO_EU" ? "" : "pessoas"}`.trim()].filter(Boolean) as string[];
  const deOnde = f.origem === "SITE" ? "pelo site" : `por ${ORIGENS_INTERESSADO[f.origem].toLowerCase()}`;
  const ehHoje = (iso: string) => dataLonga(iso) === dataBrInteira(f.hoje);
  const quandoFoi = (iso: string) => (ehHoje(iso) ? `hoje, às ${hora(iso)}` : `em ${dataLonga(iso)}`);
  const sobre = f.cadastradoPor && f.cadastradoEm ? `Interessado · cadastrado à mão por ${f.cadastradoPor} ${quandoFoi(f.cadastradoEm)}` : `Interessado · chegou ${deOnde} ${quandoFoi(f.chegouEm)}`;
  const detalheOrigem = f.origemDetalhe?.detalhe ?? null;

  let direita: ReactNode;
  if (f.estagio === "CLIENTE") {
    direita = (
      <>
        <p className="sobretitulo" id={`${ids}-dir`}>Agora é cliente</p>
        <p className="in-passo-g">Na carteira, em implantação</p>
        {f.fim ? <p>Cadastrado em {dataLonga(f.fim.em)}, às {hora(f.fim.em)}.</p> : null}
        {f.clienteEscritorio ? <a className="btn btn-sec" href={`/clientes/${f.clienteEscritorio}/ficha`}><Icone nome="escritorios" className="ico" />Abrir a ficha do escritório</a> : null}
      </>
    );
  } else if (f.estagio === "PERDIDO" || f.estagio === "DESCARTADO") {
    direita = (
      <>
        <p className="sobretitulo" id={`${ids}-dir`}>{ESTAGIOS_INTERESSADO[f.estagio]} em {f.fim ? dataLonga(f.fim.em) : ""}</p>
        <p className="in-passo-g">{f.fim?.porque}</p>
        {f.estagio === "PERDIDO" && f.proximo?.data ? <p>Procurar de novo em <b>{dataBrInteira(f.proximo.data)}</b>{f.proximo.quem ? ` · ${f.proximo.quem.nome}` : ""}</p> : null}
        {f.apagarEm ? <p>Os dados são apagados em <b>{dataBrInteira(f.apagarEm)}</b>, 12 meses depois do último contato, ou antes, a pedido.</p> : null}
        {pode ? <button className="btn btn-sec" type="button" onClick={() => setJanela("reabrir")}><Icone nome="reenviar" className="ico" />Reabrir</button> : null}
      </>
    );
  } else if (!f.responsavel) {
    direita = (
      <>
        <p className="sobretitulo" id={`${ids}-dir`}>Próximo passo</p>
        <p className="in-passo-g">Responder o pedido</p>
        <p><b>Até {diaMes(f.prazoResposta, f.hoje)}</b> · 1 dia útil, como o site promete</p>
        {pode ? <button className="btn btn-pri" type="button" onClick={() => void ficarCom()}><Icone nome="mais" className="ico" />Ficar com ele</button> : null}
      </>
    );
  } else {
    direita = (
      <>
        <p className="sobretitulo" id={`${ids}-dir`}>Próximo passo</p>
        <p className="in-passo-g">{f.proximo?.passo ?? "Sem próximo passo"}</p>
        {f.proximo?.data ? (
          <p><b>{t === "venc" ? `Venceu em ${diaMes(f.proximo.data, f.hoje)}` : t === "hoje" ? `Hoje, ${diaMes(f.proximo.data, f.hoje)}` : diaMes(f.proximo.data, f.hoje)}{f.proximo.hora ? `, ${horaBr(f.proximo.hora)}` : ""}</b>{f.proximo.quem ? ` · ${f.proximo.quem.nome}` : ""}</p>
        ) : null}
        {pode ? <button className="btn btn-sec" type="button" onClick={() => setJanela("proximo")}><Icone nome="lapis" className="ico" />Mudar o próximo passo</button> : null}
      </>
    );
  }

  const aut = f.autorizacao;
  return (
    <MolduraConsole atual="comercial" pagina="co-in" sessao={sessao} trilha={[...TRILHA, { nome: "Interessados", href: INTERESSADOS }, { nome }]}>
      <div className="cb-fat-cab in-cab">
        <div className="esq campo-vinho">
          <Icone nome="maleta" className="ico estatua" />
          <a className="cb-voltar" href={INTERESSADOS}><Icone nome="esquerda" className="ico ico-s" />Interessados</a>
          <div><p className="sobretitulo">{sobre}</p><h1>{f.escritorio}</h1></div>
          <p className="meta">
            <Selo e={f.estagio} />
            {meta.map((m) => <span key={m} style={{ display: "contents" }}><span className="sep" aria-hidden="true" /><span>{m}</span></span>)}
          </p>
        </div>
        <section className="dir campo-ambar" aria-labelledby={`${ids}-dir`}>{direita}</section>
      </div>

      {vindo === "novo" ? (
        <Aviso tom="sucesso" titulo={`${f.escritorio} entrou em Interessados.`}>
          Está em {ESTAGIOS_INTERESSADO[f.estagio]}{f.responsavel ? `, com ${f.responsavel.id === sessao?.pessoaId ? "você" : f.responsavel.nome} como responsável` : ""}.
          {f.proximo?.data ? ` O próximo passo é ${f.proximo.passo.replace(/^./, (c) => c.toLowerCase())} até ${diaMes(f.proximo.data, f.hoje)}.` : ""}
        </Aviso>
      ) : vindo === "juntado" ? (
        <Aviso tom="sucesso" titulo="O contato novo foi juntado a este interessado.">O que foi escrito está nas notas e contou como novo contato. Nenhum interessado novo foi criado.</Aviso>
      ) : null}
      {aviso ? (
        <Aviso tom={aviso.tom} titulo={aviso.titulo}
          acoes={f.estagio === "CLIENTE" && f.clienteEscritorio ? <a className="btn btn-sec btn-compacto" href={`/clientes/${f.clienteEscritorio}/socio`}><Icone nome="mais" className="ico" />Convidar o sócio</a> : undefined}>
          {aviso.texto}
        </Aviso>
      ) : null}
      {ab && !f.responsavel ? (
        <Aviso tom="atencao" titulo="Ninguém cuida deste pedido ainda.">O site promete resposta em até 1 dia útil. Quem ficar com ele vira o responsável e o próximo passo passa a ser dele.</Aviso>
      ) : null}

      <div className="grade">
        <div className="col">
          <section className="folha" aria-labelledby={`${ids}-ped`} style={{ overflow: "hidden" }}>
            <div className="folha-cab"><div><h2 id={`${ids}-ped`}>{f.origem === "SITE" ? "Pedido de demonstração" : "Contato"}</h2>
              <p className="sub">{f.origem === "SITE" ? `Como chegou do site em ${dataLonga(f.chegouEm)}, às ${hora(f.chegouEm)}. O que a pessoa escreveu não muda.`
                : f.cadastradoPor && f.cadastradoEm ? `Cadastrado à mão por ${f.cadastradoPor} em ${dataLonga(f.cadastradoEm)}, às ${hora(f.cadastradoEm)}.` : `Cadastrado em ${dataLonga(f.chegouEm)}.`}</p></div></div>
            <dl className="in-dl">
              <dt>Nome</dt><dd>{f.nome}</dd>
              <dt>Escritório</dt><dd>{f.escritorio}</dd>
              <dt>E-mail</dt><dd>{f.email ? <a href={`mailto:${f.email}`}>{f.email}</a> : <span className="cb-peq">não informado</span>}</dd>
              <dt>WhatsApp</dt><dd>{f.whats ? whatsLegivel(f.whats) : <span className="cb-peq">não informado</span>}</dd>
              <dt>Tamanho</dt><dd>{TAMANHOS_INTERESSADO[f.tamanho]}{f.tamanho === "SO_EU" ? "" : " pessoas"}</dd>
              <dt>Área de atuação</dt><dd>{f.area ?? <span className="cb-peq">não informada</span>}</dd>
              <dt>Cidade</dt><dd>{cidadeUf(f) ?? <span className="cb-peq">não informada</span>}{f.cidadeCompletadaEm ? <small>completado pela equipe em {dataLonga(f.cidadeCompletadaEm)}</small> : null}</dd>
            </dl>
            {f.mensagem ? <p className="in-msg">“{f.mensagem}”</p> : null}
          </section>

          {aut ? (
            <section className="folha" aria-labelledby={`${ids}-lgpd`} style={{ overflow: "hidden" }}>
              <div className="folha-cab"><div><h2 id={`${ids}-lgpd`}>Autorização de dados</h2><p className="sub">Guardada com o pedido. Não dá para editar.</p></div></div>
              <div className="in-lgpd">
                <p className="in-l-topo">
                  <span className="selo selo-ok"><Icone nome="check" className="ico" />Autorizou</span>
                  <b>em {dataLonga(aut.aceita_em)}, às {hora(aut.aceita_em)}</b>
                  <span className="cb-peq">horário de Brasília · formulário de t3jus.pro{aut.pagina}</span>
                </p>
                <blockquote>“{aut.texto}”</blockquote>
                <ul>
                  <li><b>Texto aceito:</b> versão {aut.versao}</li>
                  <li><b>Para quê:</b> responder ao pedido e marcar a demonstração. Nada de propaganda.</li>
                  <li><b>Até quando:</b> se não virar cliente, os dados são apagados 12 meses depois do último contato, ou antes, se a pessoa pedir.</li>
                </ul>
              </div>
            </section>
          ) : f.baseLegal === "LEGITIMO_INTERESSE" ? (
            <section className="folha" aria-labelledby={`${ids}-lgpd`} style={{ overflow: "hidden" }}>
              <div className="folha-cab"><div><h2 id={`${ids}-lgpd`}>De onde veio o contato</h2><p className="sub">Guardado com o cadastro. Não dá para editar.</p></div></div>
              <div className="in-lgpd">
                <p className="in-l-topo">
                  <span className="selo selo-neutro"><Icone nome="escudo" className="ico" />Legítimo interesse</span>
                  {f.cadastradoEm ? <b>cadastrado em {dataLonga(f.cadastradoEm)}, às {hora(f.cadastradoEm)}</b> : null}
                  <span className="cb-peq">{f.cadastradoPor ? `por ${f.cadastradoPor} · ` : ""}sem a autorização do site</span>
                </p>
                {detalheOrigem ? <blockquote>“{detalheOrigem}”</blockquote> : null}
                <ul>
                  <li><b>A pessoa sabe:</b> {f.sabeDoContato ? "sim, ela pediu ou aceitou o contato. Se pedir para não ser mais procurada, encerre como descartado." : "ainda não. No primeiro contato, conte de onde veio o contato e que ela pode pedir para não ser mais procurada."}</li>
                  <li><b>Para quê:</b> apresentar o T3jus e marcar uma demonstração. Nada de propaganda.</li>
                  <li><b>Até quando:</b> se não virar cliente, os dados são apagados 12 meses depois do último contato, ou antes, se a pessoa pedir.</li>
                </ul>
              </div>
            </section>
          ) : null}

          <Notas f={f} aoSalvar={() => void carregar()} />
          <Historico f={f} />
        </div>

        <aside className="col" aria-label="Responsável e ações">
          {pode && ab ? (
            <section className="folha" aria-labelledby={`${ids}-ac`}>
              <div className="folha-cab" style={{ paddingBottom: 8 }}><h2 id={`${ids}-ac`} style={{ fontSize: 20 }}>O que fazer</h2></div>
              <div className="cb-acoes">
                <button className="btn btn-pri" type="button" onClick={() => setJanela("converter")}><Icone nome="escritorios" className="ico" />Virar escritório cliente</button>
                <button className="btn btn-sec" type="button" onClick={() => setJanela("mudar")}><Icone nome="trocar" className="ico" />Mudar estágio</button>
                <button className="btn btn-sec" type="button" onClick={() => setJanela("encerrar")}><Icone nome="xis" className="ico" />Perdido ou descartado</button>
                <p className="permissao"><Icone nome="ajuda" className="ico" />Mudar de estágio pede um motivo, que fica no histórico.</p>
              </div>
            </section>
          ) : null}

          {f.estagio === "PERDIDO" || f.estagio === "DESCARTADO" ? (
            <section className="folha" aria-labelledby={`${ids}-fim`}>
              <div className="folha-cab" style={{ paddingBottom: 8 }}><h2 id={`${ids}-fim`} style={{ fontSize: 20 }}>{f.estagio === "PERDIDO" ? "Por que perdemos" : "Descartado"}</h2></div>
              <div style={{ padding: "0 20px 18px" }} className="in-fim-box">
                {f.fim ? <span className="selo selo-neutro">{f.fim.porque}</span> : null}
                {f.fim ? <p className="in-motivo">“{f.fim.motivo}”</p> : null}
                <p className="cb-peq">{f.estagio === "PERDIDO" ? "Os motivos de perda aparecem juntos no filtro “Perdidos e descartados”, para ver o que mais falta no produto." : "Não conta nos números do funil. Não dá para virar escritório cliente; se era de verdade, reabra antes."}</p>
              </div>
            </section>
          ) : (
            <section className="folha" aria-labelledby={`${ids}-resp`}>
              <div className="folha-cab" style={{ paddingBottom: 8 }}><h2 id={`${ids}-resp`} style={{ fontSize: 20 }}>Responsável</h2></div>
              {f.responsavel ? (
                <div style={{ padding: "0 20px 18px", display: "grid", gap: 12 }}>
                  <Pessoa nome={f.responsavel.nome} />
                  {f.responsavelDesde ? <p className="cb-peq">Desde {dataLonga(f.responsavelDesde)}{f.responsavelPor && f.responsavelPor !== f.responsavel.nome ? `, por ${f.responsavelPor}` : ""}</p> : null}
                  {pode && ab ? <button className="btn btn-sec" type="button" onClick={() => setJanela("responsavel")}><Icone nome="trocar" className="ico" />Trocar o responsável</button> : null}
                </div>
              ) : (
                <div style={{ padding: "0 20px 18px", display: "grid", gap: 10 }}>
                  <p className="cb-peq">Ninguém cuida deste pedido ainda.</p>
                  {pode ? (
                    <>
                      <button className="btn btn-pri" type="button" onClick={() => void ficarCom()}><Icone nome="mais" className="ico" />Ficar com ele</button>
                      <button className="btn btn-sec" type="button" onClick={() => setJanela("responsavel")}>Atribuir a outra pessoa</button>
                    </>
                  ) : null}
                </div>
              )}
            </section>
          )}

          <section className="folha" aria-labelledby={`${ids}-org`}>
            <div className="folha-cab" style={{ paddingBottom: 8 }}><h2 id={`${ids}-org`} style={{ fontSize: 20 }}>Origem</h2></div>
            <dl className="cb-dl">
              <div><dt>Como chegou</dt><dd>{ORIGENS_INTERESSADO[f.origem]}</dd></div>
              {f.origemDetalhe?.pagina ? <div><dt>Página</dt><dd>t3jus.pro{f.origemDetalhe.pagina}</dd></div> : null}
              {f.origem === "SITE" ? <div><dt>Campanha</dt><dd>{f.origemDetalhe?.campanha ?? "nenhuma"}</dd></div> : null}
              {f.origem !== "SITE" && detalheOrigem ? <div><dt>De onde veio</dt><dd>{detalheOrigem}</dd></div> : null}
              {f.cadastradoPor ? <div><dt>Cadastro</dt><dd>À mão, por {f.cadastradoPor}</dd></div> : null}
              {f.origem !== "SITE" ? <div><dt>Data do contato</dt><dd>{dataLonga(f.chegouEm)}</dd></div> : null}
              {f.clienteEscritorio && f.clienteNome ? <div><dt>Escritório cliente</dt><dd><a href={`/clientes/${f.clienteEscritorio}/ficha`}>{f.clienteNome}</a></dd></div> : null}
            </dl>
          </section>
        </aside>
      </div>

      {pode && sessao ? (
        <>
          {janela === "responsavel" ? <JanelaResponsavel f={f} aberta aoFechar={() => setJanela(null)} aoConflito={conflito} aoFeito={feito("Responsável trocado.")} /> : null}
          {janela === "proximo" ? <JanelaProximo f={f} eu={sessao.pessoaId} aberta aoFechar={() => setJanela(null)} aoConflito={conflito} aoFeito={feito("Próximo passo salvo.")} /> : null}
          {janela === "mudar" ? <JanelaMudar f={f} aberta aoFechar={() => setJanela(null)} aoConflito={conflito} aoFeito={feito("Estágio mudado.", "O motivo ficou no histórico.")} /> : null}
          {janela === "encerrar" ? <JanelaEncerrar f={f} aberta aoFechar={() => setJanela(null)} aoConflito={conflito} aoFeito={feito("Interessado encerrado.", "Dá para reabrir depois, com motivo.")} /> : null}
          {janela === "reabrir" ? <JanelaReabrir f={f} aberta aoFechar={() => setJanela(null)} aoConflito={conflito} aoFeito={feito("Interessado reaberto.", "Voltou para Em contato.")} /> : null}
          {janela === "converter" ? (
            <JanelaConverter f={f} aberta aoFechar={() => setJanela(null)} aoConflito={conflito} aoFeito={() => {
              setJanela(null);
              setAviso({ tom: "sucesso", titulo: `${f.escritorio} agora é escritório cliente.`, texto: "Está na carteira em implantação, com o contato e o histórico do pedido. O próximo passo é convidar o sócio dono, na ficha do escritório." });
              void carregar();
            }} />
          ) : null}
        </>
      ) : null}
    </MolduraConsole>
  );
}
