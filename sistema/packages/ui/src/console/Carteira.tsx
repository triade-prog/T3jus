"use client";
// Carteira de escritórios (CO-01, PT-24), tela aprovada em
// docs/design/aprovadas/console-carteira.html. Mostra só os clientes atribuídos a quem está
// usando (o banco filtra): resumo por estágio, o que pede a pessoa agora e a lista.

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import { criarEscritorioSchema, diaBrasilia, ESTAGIOS, UFS } from "@t3jus/domain";
import { textoDoErro, type ErroApi } from "../api.ts";
import { Icone } from "../Icone.tsx";
import {
  atrasoDe,
  comAtraso,
  contarCarteira,
  etapasDoCliente,
  filtrarCarteira,
  encerrado,
  ORDENS,
  ORDENS_DA_LISTA,
  pendencias,
  situacaoSocio,
  tarefasDaCarteira,
  TEXTOS_PENDENCIA,
  type ClienteCarteira,
  type Filtro,
  type Ordem,
} from "./carteira.ts";
import { seloFatura } from "./cobranca.ts";
import { CARTEIRA, chamarConsole, COBRANCA, MolduraConsole, useSessaoConsole } from "./Moldura.tsx";
import { Aviso, ErroCampo, faltaAcertar, focarPrimeiroErro, Janela } from "./pecas.tsx";
import { dataBr } from "./FimContrato.tsx";
import { haQuanto, iniciais } from "./tempo.ts";

const POR_PAGINA = 20;

const RESUMO: { filtro: Filtro; nome: string; ambar?: boolean; enc?: boolean }[] = [
  { filtro: "TODOS", nome: "Todos os escritórios" },
  { filtro: "IMPLANTACAO", nome: "Em implantação" },
  { filtro: "ATIVO", nome: "Ativos" },
  { filtro: "PENDENCIA", nome: "Com pendência", ambar: true },
  { filtro: "ENCERRADOS", nome: "Encerrados", enc: true },
];

const monograma = (c: ClienteCarteira) => (encerrado(c) ? "m-enc" : c.estagio === "ATIVO" ? "m-ativo" : "m-impl");

/** Encerrado: o selo e a data do fim. */
function SituacaoEncerrado({ c }: { c: ClienteCarteira }) {
  return (
    <div className="fc-sit">
      <span className="selo selo-enc">
        <Icone nome="cadeado" className="ico" />
        Encerrado
      </span>
      {c.encerramento ? <small>em {dataBr(c.encerramento.fimEm)}</small> : null}
    </div>
  );
}

/** O próximo passo de um encerrado: o acesso fechar ou, depois, o fim da guarda. */
function ProximoPasso({ c, celular }: { c: ClienteCarteira; celular?: boolean }) {
  const e = c.encerramento;
  if (!e) return null;
  const sub: CSSProperties | undefined = celular ? { display: "block", width: "100%", fontSize: 12, color: "var(--texto-2)" } : undefined;
  return e.situacao === "FECHADO" ? (
    <>
      <span className="selo selo-neutro">
        <Icone nome="guardar" className="ico" />
        Guarda até {dataBr(e.guardaAte)}
      </span>
      <small style={sub}>Acesso fechado em {dataBr(e.acessoFechadoEm ?? e.acessoFechaEm)} · dá para reabrir</small>
    </>
  ) : (
    <>
      <span className="selo selo-atencao">
        <Icone nome="relogio" className="ico" />
        Só leitura até {dataBr(e.consultaAte, true)}
      </span>
      <small style={sub}>Acesso fecha em {dataBr(e.acessoFechaEm)}</small>
    </>
  );
}

/** Sócio de um encerrado: se baixou os dados, ou desde quando está sem acesso. */
function socioDoEncerrado(c: ClienteCarteira, padrao: { nome: string | null; detalhe: string }) {
  const e = c.encerramento;
  if (!e) return padrao;
  if (e.exportadoEm) return { ...padrao, detalhe: `Baixou os dados em ${dataBr(diaBrasilia(e.exportadoEm), true)}` };
  if (e.situacao === "FECHADO") return { ...padrao, detalhe: `Sem acesso desde ${dataBr(e.acessoFechadoEm ?? e.acessoFechaEm, true)}` };
  return { ...padrao, detalhe: "Ainda não baixou os dados" };
}

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

/** "Fatura em atraso · N dias": atenção até 29 dias, urgência a partir de 30 (CO-06). */
function SeloAtraso({ dias }: { dias: number }) {
  const s = seloFatura("EM_ATRASO", dias, "Fatura em atraso");
  return (
    <span className={s.classe}>
      <Icone nome={s.icone} className="ico" />
      {s.texto}
    </span>
  );
}

function Pendencias({ c }: { c: ClienteCarteira }) {
  const lista = pendencias(c);
  const atraso = atrasoDe(c);
  if (lista.length === 0 && atraso > 0) return <SeloAtraso dias={atraso} />;
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
      {atraso > 0 ? <SeloAtraso dias={atraso} /> : null}
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
  const [soAtraso, setSoAtraso] = useState(false);
  const verEncerrados = filtro === "ENCERRADOS";
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
  const filtrados = useMemo(() => filtrarCarteira(lista ?? [], { filtro, termo, ordem }), [lista, filtro, termo, ordem]);
  const emAtraso = useMemo(() => comAtraso(lista ?? []).filter((c) => !encerrado(c)).length, [lista]);
  const visiveis = useMemo(() => (soAtraso ? comAtraso(filtrados) : filtrados), [soAtraso, filtrados]);
  const verCobranca = sessao?.acoes.includes("console.cobranca.ver") ?? false;
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
            <p className="lede">
              {verEncerrados
                ? "Os escritórios que contrataram o T3jus e que você atende, da implantação ao uso diário, e os que já encerraram."
                : "Os escritórios que contrataram o T3jus e que você atende, da implantação ao uso diário."}
            </p>
          </div>
          {podeCadastrar ? (
            <button className="btn btn-escuro" type="button" style={{ marginBottom: 6 }} onClick={() => setCadastrar(true)}>
              <Icone nome="mais" className="ico" />
              Cadastrar escritório
            </button>
          ) : null}
        </div>

        <div className="folha resumo fc-cinco" role="group" aria-label="Filtrar a carteira por estágio">
          {RESUMO.map((r) => (
            <button key={r.filtro} type="button" aria-pressed={filtro === r.filtro}
              onClick={() => {
                if ((r.filtro === "ENCERRADOS") !== verEncerrados) setOrdem(r.filtro === "ENCERRADOS" ? "FIM" : "PENDENCIAS");
                setFiltro(r.filtro);
                setPagina(1);
              }}>
              <span className={r.enc ? "disco fc-disco-enc" : "disco"} style={r.ambar ? ({ "--c": "var(--ambar-2)" } as CSSProperties) : undefined}>
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

      {lista && !verEncerrados ? (
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
            {ORDENS_DA_LISTA[verEncerrados ? "ENCERRADOS" : "ABERTOS"].map((o) => (
              <option key={o} value={o}>
                {ORDENS[o]}
              </option>
            ))}
          </select>
          {emAtraso > 0 || soAtraso ? (
            <div className="chips" role="group" aria-label="Situação">
              <button type="button" aria-pressed={soAtraso} onClick={() => { setSoAtraso(!soAtraso); setPagina(1); }}>
                <Icone nome="fatura" className="ico" />
                Fatura em atraso ({emAtraso})
              </button>
            </div>
          ) : null}
        </div>

        {lista === null ? (
          <div className="carregando" />
        ) : visiveis.length === 0 ? (
          <div className="vazio">
            <strong>
              {lista.length === 0 ? "Nenhum escritório com você ainda" : verEncerrados && !termo ? "Nenhum escritório encerrado" : "Nenhum escritório encontrado"}
            </strong>
            {lista.length === 0
              ? "Quando a administração atribuir um cliente a você, ele aparece aqui."
              : verEncerrados && !termo
                ? "Quando um contrato terminar, o escritório aparece aqui até o fim da guarda de 5 anos."
                : "Tente outro nome ou volte para todos os escritórios."}
          </div>
        ) : (
          <div className="tabela">
            <table className="so-pc">
              <thead>
                <tr>
                  <th scope="col">Escritório</th>
                  <th scope="col">Estágio</th>
                  <th scope="col">{verEncerrados ? "Próximo passo" : "Pendências"}</th>
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
                  const socio = encerrado(c) ? socioDoEncerrado(c, situacaoSocio(c, agora)) : situacaoSocio(c, agora);
                  return (
                    <tr key={c.id}>
                      <td>
                        <div className="esc">
                          <span className={`mono ${monograma(c)}`} aria-hidden="true">
                            {iniciais(c.nome).slice(0, 1)}
                          </span>
                          <div>
                            <a href={`/clientes/${c.id}`}>{c.nome}</a>
                            <small>{c.cidade ? `${c.cidade}${c.uf ? `, ${c.uf}` : ""}` : "Cidade não informada"}</small>
                          </div>
                        </div>
                      </td>
                      <td data-rotulo="Estágio">
                        {encerrado(c) ? <SituacaoEncerrado c={c} /> : <Estagio c={c} />}
                      </td>
                      <td data-rotulo={verEncerrados ? "Próximo passo" : "Pendências"}>
                        {encerrado(c) ? (
                          <div className="fc-sit">
                            <ProximoPasso c={c} />
                          </div>
                        ) : (
                          <Pendencias c={c} />
                        )}
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
                const socio = encerrado(c) ? socioDoEncerrado(c, situacaoSocio(c, agora)) : situacaoSocio(c, agora);
                const e = etapasDoCliente(c);
                const lista = pendencias(c);
                return (
                  <li key={c.id} className="cartao">
                    <div className="c-topo">
                      <span className={`mono ${monograma(c)}`} aria-hidden="true">
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
                      {encerrado(c) ? (
                        <>
                          <span className="selo selo-enc">
                            <Icone nome="cadeado" className="ico" />
                            Encerrado{c.encerramento ? ` em ${dataBr(c.encerramento.fimEm)}` : ""}
                          </span>
                          <ProximoPasso c={c} celular />
                        </>
                      ) : c.estagio === "ATIVO" ? (
                        <span className="selo selo-ativo">
                          <span className="bolinha" aria-hidden="true" />
                          {ESTAGIOS.ATIVO}
                        </span>
                      ) : (
                        <span className="selo selo-implant">{ESTAGIOS.IMPLANTACAO}</span>
                      )}
                      {encerrado(c) ? (
                        atrasoDe(c) > 0 ? <SeloAtraso dias={atrasoDe(c)} /> : null
                      ) : lista.length || atrasoDe(c) > 0 ? (
                        <>
                          {lista.map((p) => (
                            <span key={p} className="selo selo-atencao">
                              {TEXTOS_PENDENCIA[p]}
                            </span>
                          ))}
                          {atrasoDe(c) > 0 ? <SeloAtraso dias={atrasoDe(c)} /> : null}
                        </>
                      ) : (
                        <span className="selo selo-ok">
                          <Icone nome="check" className="ico" />
                          Em dia
                        </span>
                      )}
                    </div>
                    {c.estagio === "IMPLANTACAO" ? (
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

        {lista && verEncerrados && visiveis.length > 0 ? (
          <p className="fc-nota-lista">
            <Icone nome="ajuda" className="ico" />
            <span>
              Encerrados não entram em “Todos os escritórios” nem nos outros números. Ficam aqui até o fim da guarda de 5 anos, com os dados dos clientes
              guardados; depois, sai tudo, menos o nome.
            </span>
          </p>
        ) : null}
        {lista && soAtraso && visiveis.length > 0 ? (
          <p className="fc-nota-lista">
            <Icone nome="ajuda" className="ico" />
            <span>
              “Fatura em atraso” não entra em “Com pendência”, que conta só o que falta na implantação. Os valores e as faturas ficam em Cobrança, para a
              Administração e o Financeiro.
            </span>
          </p>
        ) : null}
        {lista && visiveis.length > 0 ? (
          <div className="rodape-tab">
            <span aria-live="polite">
              {soAtraso
                ? `Mostrando ${visiveis.length} ${visiveis.length === 1 ? "escritório" : "escritórios"} com fatura em atraso, do atraso maior para o menor`
                : `Mostrando ${daPagina.length} de ${visiveis.length} ${visiveis.length === 1 ? "escritório" : "escritórios"}${verEncerrados ? (visiveis.length === 1 ? " encerrado" : " encerrados") : ""}`}
            </span>
            {soAtraso && verCobranca ? (
              <a className="ver" href={`${COBRANCA}?situacao=EM_ATRASO`}>
                Ver as faturas em Cobrança
                <Icone nome="dir" className="ico" />
              </a>
            ) : null}
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
