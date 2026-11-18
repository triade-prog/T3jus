"use client";
// Carteira de escritórios (CO-01, PT-24), tela aprovada em
// docs/design/aprovadas/console-carteira.html. Mostra só os clientes atribuídos a quem está
// usando (o banco filtra): resumo por estágio, o que pede a pessoa agora e a lista.

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import { ESTAGIOS } from "@t3jus/domain";
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

export function Carteira() {
  const sessao = useSessaoConsole();
  const [lista, setLista] = useState<ClienteCarteira[] | null>(null);
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("TODOS");
  const [termo, setTermo] = useState("");
  const [ordem, setOrdem] = useState<Ordem>("PENDENCIAS");
  const [pagina, setPagina] = useState(1);
  const [agora, setAgora] = useState(() => new Date());
  const ids = useId();
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
            <table>
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
    </MolduraConsole>
  );
}
