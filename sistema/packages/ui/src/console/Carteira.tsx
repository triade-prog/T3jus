"use client";
// Carteira de escritórios (CO-01, PT-24), tela aprovada em
// docs/design/aprovadas/console-carteira.html. Mostra só os clientes atribuídos a quem está
// usando (o banco filtra): resumo por estágio, o que pede a pessoa agora e a lista.

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import { criarEscritorioSchema, ESTAGIOS, UFS } from "@t3jus/domain";
import { textoDoErro, type ErroApi } from "../api.ts";
import { Icone } from "../Icone.tsx";
import {
  contarCarteira,
  etapasDoCliente,
  filtrarCarteira,
  ORDENS,
  pendencias,
  situacaoSocio,
  tarefasDaCarteira,
  TEXTOS_PENDENCIA,
  type ClienteCarteira,
  type Filtro,
  type Ordem,
} from "./carteira.ts";
import { CARTEIRA, chamarConsole, MolduraConsole, useSessaoConsole } from "./Moldura.tsx";
import { Aviso, ErroCampo, faltaAcertar, focarPrimeiroErro, Janela } from "./pecas.tsx";
import { haQuanto, iniciais } from "./tempo.ts";

const POR_PAGINA = 20;

const RESUMO: { filtro: Filtro; nome: string; ambar?: boolean }[] = [
  { filtro: "TODOS", nome: "Todos os escritórios" },
  { filtro: "IMPLANTACAO", nome: "Em implantação" },
  { filtro: "ATIVO", nome: "Ativos" },
  { filtro: "PENDENCIA", nome: "Com pendência", ambar: true },
];

function Estagio({ c }: { c: ClienteCarteira }) {
  if (c.estagio === "ATIVO") {
    return (
      <span className="selo selo-ativo">
        <span className="bolinha" style={{ color: "var(--ambar)" }} />
        {ESTAGIOS.ATIVO}
      </span>
    );
  }
  const e = etapasDoCliente(c);
  return (
    <div className="etapas">
      <span className="selo selo-implant">{ESTAGIOS.IMPLANTACAO}</span>
      <span className="lin">
        <span className={`trilho-etapas e${e.feitas}`} aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </span>
        <small>{e.proxima === null ? `${e.feitas} de ${e.total} · pronto` : `${e.feitas} de ${e.total} etapas`}</small>
      </span>
    </div>
  );
}

function Pendencias({ c }: { c: ClienteCarteira }) {
  const lista = pendencias(c);
  if (lista.length === 0) {
    return (
      <span className="selo selo-ok">
        <Icone nome="check" className="ico" />
        Em dia
      </span>
    );
  }
  return (
    <div className="pend">
      {lista.map((p) => (
        <span key={p} className="selo selo-atencao">
          {TEXTOS_PENDENCIA[p]}
        </span>
      ))}
    </div>
  );
}

/**
 * Cadastrar escritório (passo 1), janela aprovada em docs/design/aprovadas/console-v1
 * (carteira.html?estado=cadastrar): nome, cidade e UF; o resto se completa na ficha.
 */
function JanelaCadastrar({ aberta, aoFechar }: { aberta: boolean; aoFechar: () => void }) {
  const ids = useId();
  const corpo = useRef<HTMLDivElement>(null);
  const [nome, setNome] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [erros, setErros] = useState<{ nome?: string; cidade?: string; uf?: string }>({});
  const [falhou, setFalhou] = useState<ErroApi | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function cadastrar() {
    if (enviando) return;
    setFalhou(null);
    const v = criarEscritorioSchema.safeParse({ nome, cidade, uf });
    if (!v.success) {
      const campos = new Set(v.error.issues.map((i) => String(i.path[0])));
      setErros({
        nome: campos.has("nome") ? "Escreva o nome do escritório." : undefined,
        cidade: campos.has("cidade") ? "O nome da cidade precisa de ao menos 2 letras." : undefined,
        uf: campos.has("uf") ? "Escolha a UF." : undefined,
      });
      return focarPrimeiroErro(corpo.current);
    }
    setErros({});
    setEnviando(true);
    const r = await chamarConsole<{ id: string }>("/v1/clientes", { corpo: v.data });
    if (!r.ok) {
      setEnviando(false);
      return setFalhou(r.erro);
    }
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a ficha nova abre do zero, com o aviso de cadastrado
    window.location.assign(`/clientes/${r.dados.id}/ficha?cadastrado=1`);
  }

  const n = Object.values(erros).filter(Boolean).length;
  const campoTexto = (k: "nome" | "cidade", rotulo: string, valor: string, mudar: (v: string) => void, auto: string, foco?: boolean) => (
    <div className="campo">
      <label htmlFor={`${ids}-${k}`}>{rotulo}</label>
      <input className="entrada" id={`${ids}-${k}`} value={valor} autoComplete={auto} data-foco={foco || undefined}
        onChange={(e) => mudar(e.target.value)} aria-invalid={erros[k] ? true : undefined}
        aria-describedby={erros[k] ? `${ids}-${k}-erro` : undefined} />
      {erros[k] ? <ErroCampo id={`${ids}-${k}-erro`}>{erros[k]}</ErroCampo> : null}
    </div>
  );

  return (
    <Janela id={`${ids}-j`} aberta={aberta} aoFechar={() => { if (!enviando) aoFechar(); }} sobretitulo="Clientes" titulo="Cadastrar escritório"
      descricao={`${ids}-d`} aoEnviar={() => void cadastrar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" disabled={enviando} onClick={aoFechar}>
            Cancelar
          </button>
          <button className="btn btn-pri" type="submit" aria-busy={enviando || undefined} aria-disabled={enviando || undefined}>
            {enviando ? "Cadastrando…" : (
              <>
                <Icone nome="mais" className="ico" />
                Cadastrar escritório
              </>
            )}
          </button>
        </>
      }>
      <div ref={corpo} style={{ display: "contents" }}>
        <p id={`${ids}-d`}>Comece pelo básico. CNPJ, endereço e contatos você completa depois, na ficha.</p>
        {n ? <Aviso tom="urgencia" titulo={faltaAcertar(n)}>O escritório ainda não foi cadastrado.</Aviso> : null}
        {falhou ? (
          <Aviso tom="urgencia" titulo="Não deu para cadastrar agora.">
            {falhou.codigo === "FORBIDDEN" ? textoDoErro(falhou) : "O servidor não respondeu. O que você escreveu continua aqui: tente de novo."}
          </Aviso>
        ) : null}
        {campoTexto("nome", "Nome do escritório", nome, setNome, "organization", true)}
        <div className="duas">
          {campoTexto("cidade", "Cidade", cidade, setCidade, "address-level2")}
          <div className="campo">
            <label htmlFor={`${ids}-uf`}>UF</label>
            <select className="entrada" id={`${ids}-uf`} value={uf} onChange={(e) => setUf(e.target.value)}
              aria-invalid={erros.uf ? true : undefined} aria-describedby={erros.uf ? `${ids}-uf-erro` : undefined}>
              <option value="">Escolha</option>
              {UFS.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
            {erros.uf ? <ErroCampo id={`${ids}-uf-erro`}>{erros.uf}</ErroCampo> : null}
          </div>
        </div>
        <p className="permissao">
          <Icone nome="pessoas" className="ico" />
          O escritório entra “Em implantação” e você fica atribuída a ele como Administração.
        </p>
      </div>
    </Janela>
  );
}

export function Carteira() {
  const sessao = useSessaoConsole();
  const [lista, setLista] = useState<ClienteCarteira[] | null>(null);
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("TODOS");
  const [termo, setTermo] = useState("");
  const [ordem, setOrdem] = useState<Ordem>("PENDENCIAS");
  const [pagina, setPagina] = useState(1);
  const [agora, setAgora] = useState(() => new Date());
  const [cadastrar, setCadastrar] = useState(false);
  const ids = useId();
  const podeCadastrar = sessao?.acoes.includes("console.escritorios.criar") ?? false;
  const carregado = useRef(false);

  useEffect(() => {
    if (carregado.current) return;
    carregado.current = true;
    void chamarConsole<{ clientes: ClienteCarteira[] }>("/v1/clientes").then((r) => {
      setAgora(new Date());
      if (r.ok) setLista(r.dados.clientes);
      else if (r.status !== 401) setErro(r.erro);
    });
  }, []);

  const contagem = useMemo(() => contarCarteira(lista ?? []), [lista]);
  const tarefas = useMemo(() => tarefasDaCarteira(lista ?? [], agora), [lista, agora]);
  const visiveis = useMemo(() => filtrarCarteira(lista ?? [], { filtro, termo, ordem }), [lista, filtro, termo, ordem]);
  const paginas = Math.max(1, Math.ceil(visiveis.length / POR_PAGINA));
  const atual = Math.min(pagina, paginas);
  const daPagina = visiveis.slice((atual - 1) * POR_PAGINA, atual * POR_PAGINA);

  return (
    <MolduraConsole atual="clientes" pagina="co-carteira" sessao={sessao} pendencias={lista ? contagem.PENDENCIA : undefined}
      trilha={[{ nome: "Console", href: CARTEIRA }, { nome: "Clientes" }]}>
      <div>
        <div className="cabeca-ambar campo-ambar">
          <div>
            <p className="sobretitulo">Clientes</p>
            <h1>Carteira de escritórios</h1>
            <span className="fio" aria-hidden="true" />
            <p className="lede">Os escritórios que contrataram o T3jus e que você atende, da implantação ao uso diário.</p>
          </div>
          {podeCadastrar ? (
            <button className="btn btn-escuro" type="button" style={{ marginBottom: 6 }} onClick={() => setCadastrar(true)}>
              <Icone nome="mais" className="ico" />
              Cadastrar escritório
            </button>
          ) : null}
        </div>

        <div className="folha resumo" role="group" aria-label="Filtrar a carteira por estágio">
          {RESUMO.map((r) => (
            <button key={r.filtro} type="button" aria-pressed={filtro === r.filtro}
              onClick={() => { setFiltro(r.filtro); setPagina(1); }}>
              <span className="disco" style={r.ambar ? ({ "--c": "var(--ambar-2)" } as CSSProperties) : undefined}>
                <span>{lista ? contagem[r.filtro] : "–"}</span>
              </span>
              <span className="r">{r.nome}</span>
            </button>
          ))}
        </div>
      </div>

      {erro ? (
        <div className="aviso aviso-erro" role="alert">
          <Icone nome="alerta" className="ico" />
          <p>{textoDoErro(erro)}</p>
        </div>
      ) : null}

      {lista ? (
        <section className="pedem campo-vinho" aria-labelledby={`${ids}-pedem`}>
          <h2 id={`${ids}-pedem`}>
            <small>Hoje</small>Pedem você agora
          </h2>
          {tarefas.length === 0 ? (
            <p className="nada">
              <Icone nome="check" className="ico" />
              Nenhuma implantação esperando por você.
            </p>
          ) : (
            tarefas.map((t, i) => (
              <a key={t.clienteId} href={`/clientes/${t.clienteId}/${t.aba}`}>
                <span className="disco" aria-hidden="true">
                  <span>{i + 1}</span>
                </span>
                <span>
                  <strong>{t.titulo}</strong>
                  <span>{t.detalhe}</span>
                </span>
                <Icone nome="seta" className="ico ir" />
              </a>
            ))
          )}
        </section>
      ) : null}

      <section className="folha" aria-labelledby={`${ids}-lista`} aria-busy={lista === null} style={{ overflow: "hidden" }}>
        <h2 id={`${ids}-lista`} className="sr">
          Lista de escritórios
        </h2>
        <div className="ferramentas">
          <div className="campo-busca">
            <label className="sr" htmlFor={`${ids}-busca`}>
              Buscar na carteira
            </label>
            <Icone nome="busca" className="ico" />
            <input className="entrada" id={`${ids}-busca`} type="search" placeholder="Nome, cidade ou sócio" value={termo}
              onChange={(e) => { setTermo(e.target.value); setPagina(1); }} />
          </div>
          <label className="sr" htmlFor={`${ids}-ordem`}>
            Ordenar
          </label>
          <select id={`${ids}-ordem`} value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)}>
            {(Object.keys(ORDENS) as Ordem[]).map((o) => (
              <option key={o} value={o}>
                {ORDENS[o]}
              </option>
            ))}
          </select>
        </div>

        {lista === null ? (
          <div className="carregando" />
        ) : visiveis.length === 0 ? (
          <div className="vazio">
            <strong>{lista.length === 0 ? "Nenhum escritório com você ainda" : "Nenhum escritório encontrado"}</strong>
            {lista.length === 0
              ? "Quando a administração atribuir um cliente a você, ele aparece aqui."
              : "Tente outro nome ou volte para todos os escritórios."}
          </div>
        ) : (
          <div className="tabela">
            <table className="so-pc">
              <thead>
                <tr>
                  <th scope="col">Escritório</th>
                  <th scope="col">Estágio</th>
                  <th scope="col">Pendências</th>
                  <th scope="col">Sócio dono</th>
                  <th scope="col">Equipe</th>
                  <th scope="col">Atividade</th>
                  <th scope="col">
                    <span className="sr">Abrir</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {daPagina.map((c) => {
                  const socio = situacaoSocio(c, agora);
                  return (
                    <tr key={c.id}>
                      <td>
                        <div className="esc">
                          <span className={`mono ${c.estagio === "ATIVO" ? "m-ativo" : "m-impl"}`} aria-hidden="true">
                            {iniciais(c.nome).slice(0, 1)}
                          </span>
                          <div>
                            <a href={`/clientes/${c.id}`}>{c.nome}</a>
                            <small>{c.cidade ? `${c.cidade}${c.uf ? `, ${c.uf}` : ""}` : "Cidade não informada"}</small>
                          </div>
                        </div>
                      </td>
                      <td data-rotulo="Estágio">
                        <Estagio c={c} />
                      </td>
                      <td data-rotulo="Pendências">
                        <Pendencias c={c} />
                      </td>
                      <td className="socio" data-rotulo="Sócio dono">
                        {socio.nome ? (
                          <>
                            {socio.nome}
                            <small>{socio.detalhe}</small>
                          </>
                        ) : (
                          <span style={{ color: "var(--texto-2)" }}>{socio.detalhe}</span>
                        )}
                      </td>
                      <td data-rotulo="Equipe">
                        <div className="avs">
                          {c.equipe.map((p, i) => (
                            <span key={p.pessoaId} className={i % 2 ? "b" : undefined} role="img" aria-label={p.nome} title={p.nome}>
                              {iniciais(p.nome)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="quando" data-rotulo="Atividade">
                        {haQuanto(c.ultimaAtividade, agora)}
                      </td>
                      <td>
                        <a className="abrir" href={`/clientes/${c.id}`} aria-label={`Abrir ${c.nome}`}>
                          <Icone nome="seta" className="ico" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <ul className="cartoes so-cel" aria-label="Escritórios">
              {daPagina.map((c) => {
                const socio = situacaoSocio(c, agora);
                const e = etapasDoCliente(c);
                const lista = pendencias(c);
                return (
                  <li key={c.id} className="cartao">
                    <div className="c-topo">
                      <span className={`mono ${c.estagio === "ATIVO" ? "m-ativo" : "m-impl"}`} aria-hidden="true">
                        {iniciais(c.nome).slice(0, 1)}
                      </span>
                      <div>
                        <a className="c-nome" href={`/clientes/${c.id}`}>
                          {c.nome}
                        </a>
                        <small>{c.cidade ? `${c.cidade}${c.uf ? `, ${c.uf}` : ""}` : "Cidade não informada"}</small>
                      </div>
                      <Icone nome="dir" className="ico c-ir" />
                    </div>
                    <div className="c-selos">
                      {c.estagio === "ATIVO" ? (
                        <span className="selo selo-ativo">
                          <span className="bolinha" aria-hidden="true" />
                          {ESTAGIOS.ATIVO}
                        </span>
                      ) : (
                        <span className="selo selo-implant">{ESTAGIOS.IMPLANTACAO}</span>
                      )}
                      {lista.length ? (
                        lista.map((p) => (
                          <span key={p} className="selo selo-atencao">
                            {TEXTOS_PENDENCIA[p]}
                          </span>
                        ))
                      ) : (
                        <span className="selo selo-ok">
                          <Icone nome="check" className="ico" />
                          Em dia
                        </span>
                      )}
                    </div>
                    {c.estagio !== "ATIVO" ? (
                      <span className="lin" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className={`trilho-etapas e${e.feitas}`} aria-hidden="true">
                          <i />
                          <i />
                          <i />
                          <i />
                        </span>
                        <small style={{ fontSize: 12, color: "var(--texto-2)" }}>
                          {e.feitas} de {e.total} etapas{e.proxima === null ? " · pronto" : ""}
                        </small>
                      </span>
                    ) : null}
                    <dl className="c-dados">
                      <dt>Sócio dono</dt>
                      <dd>
                        {socio.nome ?? socio.detalhe}
                        {socio.nome ? (
                          <small style={{ display: "block", fontWeight: 400, fontSize: 12, color: "var(--texto-2)" }}>{socio.detalhe}</small>
                        ) : null}
                      </dd>
                      <dt>Atividade</dt>
                      <dd>{haQuanto(c.ultimaAtividade, agora)}</dd>
                      <dt>Equipe</dt>
                      <dd>
                        <span className="avs" aria-hidden="true" style={{ justifyContent: "flex-end" }}>
                          {c.equipe.map((p, i) => (
                            <span key={p.pessoaId} className={i % 2 ? "b" : undefined} title={p.nome}>
                              {iniciais(p.nome)}
                            </span>
                          ))}
                        </span>
                        <span className="sr">{c.equipe.map((p) => p.nome).join(", ")}</span>
                      </dd>
                    </dl>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {lista && visiveis.length > 0 ? (
          <div className="rodape-tab">
            <span aria-live="polite">
              Mostrando {daPagina.length} de {visiveis.length} {visiveis.length === 1 ? "escritório" : "escritórios"}
            </span>
            {paginas > 1 ? (
              <nav className="pag" aria-label="Páginas">
                {Array.from({ length: paginas }, (_, i) => i + 1).map((n) => (
                  <button key={n} type="button" aria-current={n === atual ? "page" : undefined} onClick={() => setPagina(n)}
                    aria-label={`Página ${n}`}>
                    {n}
                  </button>
                ))}
                <button type="button" aria-label="Próxima página" disabled={atual === paginas} onClick={() => setPagina(atual + 1)}>
                  <Icone nome="seta" className="ico" />
                </button>
              </nav>
            ) : null}
          </div>
        ) : null}
      </section>
      <JanelaCadastrar aberta={cadastrar} aoFechar={() => setCadastrar(false)} />
    </MolduraConsole>
  );
}
