"use client";
// Comercial do Portal (AP-02 a AP-06, PD-02), desenho aprovado em
// docs/design/aprovadas/portal-comercial-contratos (Carol, 19/11/2026): Atendimentos (os
// retornos do escritório inteiro), Propostas, Funil e Origem dos contatos. A ficha e o
// formulário da proposta ficam em FichaProposta.tsx e FormProposta.tsx.

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  hojeBrasilia, MOTIVOS_RECUSA, ORIGENS, PERIODOS_COMERCIAL, reais,
  type Funil, type ListaPropostas, type OrigemContatos, type PeriodoComercial, type PropostaLinha, type Retorno, type Retornos,
} from "@t3jus/domain";
import { Icone } from "../Icone.tsx";
import { Carregando, ErroAoCarregar, Estado } from "../console/pecas.tsx";
import { iniciais } from "../console/tempo.ts";
import { contar, diaCurto } from "./agenda.ts";
import { primeiroNome } from "./equipe.ts";
import { ateSemana, faixaVencidos, nomeSituacao, quandoRetorno, ROTAS_COMERCIAL, SELO_SITUACAO, taxa, textoPeriodo, textoUltimo } from "./comercial.ts";
import { SeloTipo } from "./Honorarios.tsx";
import { chamarPortal, ROTAS_PORTAL } from "./Moldura.tsx";
import { MolduraArea } from "./MolduraArea.tsx";

type Carga<T> = T | null | "erro";

export function useCarga<T>(caminho: string): { dados: Carga<T>; recarregar: () => void } {
  const [dados, setDados] = useState<Carga<T>>(null);
  const [vez, setVez] = useState(0);
  useEffect(() => {
    let vivo = true;
    void chamarPortal<T>(caminho).then((r) => {
      if (vivo) setDados(r.ok ? r.dados : "erro");
    });
    return () => {
      vivo = false;
    };
  }, [caminho, vez]);
  return { dados, recarregar: () => setVez((v) => v + 1) };
}

export function Selo({ tom, icone, children }: { tom: string; icone?: Parameters<typeof Icone>[0]["nome"]; children: ReactNode }) {
  return (
    <span className={`selo selo-${tom}`}>
      {icone ? <Icone nome={icone} className="ico" /> : null}
      {children}
    </span>
  );
}

export function SeloSituacao({ s }: { s: PropostaLinha["situacao"] }) {
  const x = SELO_SITUACAO[s];
  return <Selo tom={x.tom} icone={x.icone}>{nomeSituacao(s)}</Selo>;
}

/** O retorno numa linha: vencido e hoje com selo; o resto, a data. */
export function SeloRetorno({ r, hoje, prefixo = "", semData = "—" }: { r: { em: string; vencido: boolean } | null; hoje: string; prefixo?: string; semData?: string }) {
  if (!r) return <span className="hn-sem">{semData}</span>;
  if (r.vencido) return <Selo tom="urgente" icone="alerta">{prefixo}{prefixo ? "vencido " : `${diaCurto(r.em)} · vencido `}{quandoRetorno(r.em, hoje)}</Selo>;
  if (r.em === hoje) return <Selo tom="atencao" icone="relogio">{prefixo ? `${prefixo}hoje` : "Hoje"}</Selo>;
  const q = quandoRetorno(r.em, hoje);
  return <span className={prefixo ? "hn-sem" : "num"}>{prefixo ? `${prefixo}em ${diaCurto(r.em)}` : q === diaCurto(r.em) ? q : `${diaCurto(r.em)} · ${q}`}</span>;
}

export function Chips({ rotulo, opcoes, atual, aoEscolher }: { rotulo: string; opcoes: { v: string; t: string }[]; atual: string; aoEscolher: (v: string) => void }) {
  return (
    <div className="chips" role="group" aria-label={rotulo}>
      {opcoes.map((o) => (
        <button key={o.v} type="button" aria-pressed={o.v === atual} onClick={() => aoEscolher(o.v)}>{o.t}</button>
      ))}
    </div>
  );
}

export function Busca({ id, rotulo, dica, valor, aoMudar, children }: { id: string; rotulo: string; dica: string; valor: string; aoMudar: (v: string) => void; children?: ReactNode }) {
  return (
    <form className="hn-ferr" role="search" onSubmit={(e) => e.preventDefault()}>
      <div className="campo-busca">
        <label className="sr" htmlFor={id}>{rotulo}</label>
        <Icone nome="busca" className="ico" />
        <input className="entrada" id={id} type="search" placeholder={dica} autoComplete="off" value={valor} onChange={(e) => aoMudar(e.target.value)} />
      </div>
      {children}
    </form>
  );
}

export function CabAmbar({ sobre, titulo, lede, acao }: { sobre: string; titulo: string; lede: string; acao?: ReactNode }) {
  return (
    <div className="cabeca-ambar campo-ambar cabeca-equipe hn-cab-ambar">
      <div>
        <p className="sobretitulo">{sobre}</p>
        <h1>{titulo}</h1>
        <span className="fio" aria-hidden="true" />
        <p className="lede">{lede}</p>
      </div>
      {acao}
    </div>
  );
}

function CabSimples({ titulo }: { titulo: string }) {
  return (
    <div className="pt-cab">
      <div>
        <p className="sobretitulo">Comercial</p>
        <h1>{titulo}</h1>
        <span className="fio" aria-hidden="true" />
      </div>
    </div>
  );
}

function Oab({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <aside className="cm-oab" aria-label="Regra da OAB">
      <Icone nome="escudo" className="ico" />
      <div>
        <b>{titulo}</b> {children}
      </div>
    </aside>
  );
}

const sem = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// ------------------------------------------------------------------------- Atendimentos

const CAB_ATEND = (
  <CabAmbar sobre="Retornos do escritório" titulo="Atendimentos"
    lede="Quem precisa de retorno, de todos os clientes, por data. Cada conversa se registra na ficha do cliente, que é onde fica o histórico." />
);

function LinhaRetorno({ r, tipo, hoje }: { r: Retorno; tipo: "vencidos" | "hoje" | "semana" | "depois" | "semData"; hoje: string }) {
  const disco = tipo === "vencidos" ? "disco hn-d-urg" : tipo === "hoje" ? "disco hn-d-hoje" : "disco";
  const link = ROTAS_COMERCIAL.atendimentosCliente(r.clienteId);
  return (
    <li className={tipo === "vencidos" ? "cm-venc" : undefined}>
      <div className="cm-dia">
        <span className={disco} aria-hidden="true"><span>{r.em ? r.em.slice(8, 10) : "–"}</span></span>
        <small aria-hidden="true">{r.em ? diaCurto(r.em) : "sem data"}</small>
        <span className="sr">{r.em ? `${diaCurto(r.em)}, ${quandoRetorno(r.em, hoje)}` : "sem data"}</span>
      </div>
      <div className="cm-quem">
        <a href={link}>{r.nome}</a>
        {r.em ? <p><b>{r.oque ?? "Falar com o cliente"}</b></p> : <p>Ninguém marcou quando falar de novo.</p>}
        {tipo === "vencidos" && r.em ? <Selo tom="urgente" icone="alerta">vencido {quandoRetorno(r.em, hoje)}</Selo> : null}
        {tipo === "hoje" ? <Selo tom="atencao" icone="relogio">Hoje</Selo> : null}
      </div>
      <div className="cm-ult">
        {r.responsavel ? <>com <b>{r.responsavel.nome}</b><br /></> : null}
        Último atendimento: {textoUltimo(r.ultimo)}
      </div>
      <a className="btn btn-sec btn-compacto" href={link}>
        <Icone nome="dir" className="ico" />
        Abrir a ficha<span className="sr"> de {r.nome}</span>
      </a>
    </li>
  );
}

function Grupo({ id, titulo, itens, tipo, hoje }: { id: string; titulo: string; itens: Retorno[]; tipo: Parameters<typeof LinhaRetorno>[0]["tipo"]; hoje: string }) {
  if (!itens.length) return null;
  return (
    <div className="cm-grupo" id={id}>
      <h3>{titulo}<span className="q">{itens.length}</span></h3>
      <ul className="cm-ret">
        {itens.map((r) => <LinhaRetorno key={r.clienteId} r={r} tipo={tipo} hoje={hoje} />)}
      </ul>
    </div>
  );
}

function quemDoGrupo(itens: Retorno[]): string {
  const nomes = [...new Set(itens.map((r) => r.responsavel?.nome).filter((n): n is string => !!n))];
  if (!nomes.length) return "ninguém";
  return nomes.length <= 2 ? `com ${nomes.map(primeiroNome).join(" e ")}` : `com ${nomes.length} pessoas`;
}

function AtendimentosConteudo() {
  const [resp, setResp] = useState("");
  const [busca, setBusca] = useState("");
  const { dados, recarregar } = useCarga<Retornos>(`/v1/escritorio/comercial/retornos${resp ? `?responsavel=${resp}` : ""}`);
  const [semDataTodos, setSemDataTodos] = useState<number | null>(null);
  const hoje = hojeBrasilia();
  useEffect(() => {
    if (dados && dados !== "erro" && !resp) void Promise.resolve().then(() => setSemDataTodos(dados.grupos.semData.length));
  }, [dados, resp]);

  if (dados === "erro") return <>{CAB_ATEND}<ErroAoCarregar oque="os retornos" aoTentar={recarregar} /></>;
  if (!dados) return <>{CAB_ATEND}<Carregando rotulo="Carregando os retornos…" linhas={4} /></>;
  if (!dados.algum) {
    return (
      <div className="hn">
        {CAB_ATEND}
        <section className="folha" aria-labelledby="t-ret" style={{ overflow: "hidden" }}>
          <h2 id="t-ret" className="sr">Quem precisa de retorno</h2>
          <Estado icone="relogio" titulo="Nenhum retorno marcado ainda"
            acoes={
              <a className="btn btn-pri" href={ROTAS_PORTAL.clientes}>
                <Icone nome="pessoas" className="ico" />
                Abrir Clientes
              </a>
            }>
            Os retornos nascem do atendimento: ao registrar uma conversa na ficha do cliente, marque quando falar de novo e com quem. Eles aparecem aqui, para o escritório inteiro.
          </Estado>
        </section>
      </div>
    );
  }

  const q = sem(busca.trim());
  const f = (l: Retorno[]) => (q ? l.filter((r) => sem(r.nome).includes(q)) : l);
  const g = { vencidos: f(dados.grupos.vencidos), hoje: f(dados.grupos.hoje), semana: f(dados.grupos.semana), depois: f(dados.grupos.depois), semData: f(dados.grupos.semData) };
  const nada = !Object.values(g).some((l) => l.length);
  const todos = dados.porResponsavel.reduce((s, p) => s + p.total, 0) + (semDataTodos ?? dados.grupos.semData.length);
  const chips = [{ v: "", t: `Todos (${todos})` }, ...dados.porResponsavel.map((p) => ({ v: p.pessoa.id, t: `${primeiroNome(p.pessoa.nome)} (${p.total})` }))];
  const numeros: { id: string; n: number; disco: string; rot: string; sub: string }[] = [
    { id: "g-vencidos", n: dados.totais.vencidos, disco: "hn-d-urg", rot: "Vencidos", sub: faixaVencidos(dados.grupos.vencidos.map((r) => r.em!), hoje) },
    { id: "g-hoje", n: dados.totais.hoje, disco: "hn-d-hoje", rot: "Hoje", sub: quemDoGrupo(dados.grupos.hoje) },
    { id: "g-semana", n: dados.totais.semana, disco: "", rot: "Próximos 7 dias", sub: `até ${ateSemana(hoje)}` },
    { id: "g-sem", n: dados.totais.semData, disco: "", rot: "Sem próximo contato", sub: dados.totais.semData === 1 ? "cliente ativo" : "clientes ativos" },
  ];

  return (
    <div className="hn">
      {CAB_ATEND}
      <nav className="folha hn-numeros" aria-label="Resumo dos retornos">
        {numeros.map((x) => (
          <a key={x.id} href={`#${x.id}`}>
            <span className={`disco ${x.disco}`} aria-hidden="true"><span>{x.n}</span></span>
            <span className="r"><b>{x.rot}</b>{x.sub}</span>
            <span className="sr">: {x.n}</span>
          </a>
        ))}
      </nav>
      <div className="hn-grade">
        <div className="hn-col">
          <section className="folha" aria-labelledby="t-ret" style={{ overflow: "hidden" }}>
            <div className="folha-cab">
              <div>
                <h2 id="t-ret">Quem precisa de retorno</h2>
                <p className="sub">Do mais atrasado para o mais distante. Registrar o atendimento na ficha tira o cliente daqui ou muda a data.</p>
              </div>
            </div>
            <Busca id="cm-b" rotulo="Buscar cliente" dica="Buscar cliente" valor={busca} aoMudar={setBusca}>
              <Chips rotulo="Responsável" opcoes={chips} atual={resp} aoEscolher={setResp} />
            </Busca>
            {nada ? (
              <Estado icone="busca" titulo={q ? "Nenhum cliente com esse nome aqui" : "Ninguém com retorno marcado"}>
                {q ? "Confira o nome ou limpe a busca." : "Esta pessoa não tem retorno marcado agora."}
              </Estado>
            ) : (
              <>
                <Grupo id="g-vencidos" titulo="Vencidos" itens={g.vencidos} tipo="vencidos" hoje={hoje} />
                <Grupo id="g-hoje" titulo="Hoje" itens={g.hoje} tipo="hoje" hoje={hoje} />
                <Grupo id="g-semana" titulo="Próximos 7 dias" itens={g.semana} tipo="semana" hoje={hoje} />
                <Grupo id="g-depois" titulo="Depois" itens={g.depois} tipo="depois" hoje={hoje} />
                <Grupo id="g-sem" titulo="Sem próximo contato" itens={g.semData} tipo="semData" hoje={hoje} />
              </>
            )}
          </section>
        </div>
        <aside className="hn-col" aria-label="Também pedem retorno">
          <section className="folha" aria-labelledby="t-pe">
            <div className="folha-cab" style={{ paddingBottom: 8 }}>
              <div><h2 id="t-pe" style={{ fontSize: 20 }}>Propostas esperando resposta</h2></div>
            </div>
            {dados.propostasEsperando.length ? (
              <ul className="cm-prop">
                {dados.propostasEsperando.map((p) => (
                  <li key={p.id}>
                    <a href={ROTAS_COMERCIAL.proposta(p.id)}>{p.numero} · {p.cliente}</a>
                    <small>
                      {p.situacao === "NEGOCIACAO" ? "Em negociação" : p.enviadaEm ? `Enviada em ${diaCurto(p.enviadaEm.slice(0, 10))}` : "Enviada"} · com {p.responsavel.nome}
                    </small>
                    <SeloRetorno r={p.retorno} hoje={hoje} prefixo="retorno " semData="sem retorno marcado" />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="hn-pe" style={{ borderTop: 0 }}>
                <Icone nome="check" className="ico" />
                <span>Nenhuma proposta enviada esperando resposta.</span>
              </p>
            )}
            <div className="hn-folha-acao">
              <a className="btn btn-sec" href={ROTAS_COMERCIAL.propostas}>
                <Icone nome="dir" className="ico" />
                Ver todas as propostas
              </a>
            </div>
          </section>
          <section className="folha" aria-labelledby="t-rp">
            <div className="folha-cab" style={{ paddingBottom: 8 }}>
              <div>
                <h2 id="t-rp" style={{ fontSize: 20 }}>Por responsável</h2>
                <p className="sub">Quem saiu da equipe já não aparece: os retornos dela passaram para outra pessoa.</p>
              </div>
            </div>
            <ul className="cm-resp">
              {dados.porResponsavel.map((p) => (
                <li key={p.pessoa.id}>
                  <span className="av-p forte" aria-hidden="true">{iniciais(p.pessoa.nome)}</span>
                  <span className="n">{p.pessoa.nome}</span>
                  {p.vencidos ? <Selo tom="urgente" icone="alerta">{contar(p.vencidos, "vencido", "vencidos")}</Selo>
                    : p.hoje ? <Selo tom="atencao" icone="relogio">{p.hoje} hoje</Selo>
                    : <Selo tom="ok" icone="check">em dia</Selo>}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

export function AtendimentosComercial() {
  return <MolduraArea area="COMERCIAL" secao="atendimentos">{() => <AtendimentosConteudo />}</MolduraArea>;
}

// ------------------------------------------------------------------------- Propostas

function CabPropostas() {
  return (
    <CabAmbar sobre="Comercial" titulo="Propostas"
      lede="O que o escritório ofereceu, para quem, por quanto e quem acompanha. A proposta aceita vira contrato com as mesmas condições, sem redigitar."
      acao={
        <a data-muda className="btn btn-escuro" href={ROTAS_COMERCIAL.nova} style={{ marginBottom: 6 }}>
          <Icone nome="mais" className="ico" />
          Nova proposta
        </a>
      } />
  );
}

type Mostrar = "ANDAMENTO" | "CONTRATO" | "RECUSADAS";

function retornoNaLista(p: PropostaLinha, hoje: string): ReactNode {
  if (!p.retorno && p.situacao === "RASCUNHO") {
    const c = p.criadaEm.slice(0, 10);
    return <span className="num">criada {c === hoje ? "hoje" : `em ${diaCurto(c)}`}</span>;
  }
  if (p.situacao === "CONTRATO" || p.situacao === "RECUSADA") return <span className="hn-sem">—</span>;
  return <SeloRetorno r={p.retorno} hoje={hoje} semData="sem retorno" />;
}

function contagemTexto(lista: PropostaLinha[], mostrar: Mostrar, busca: string): ReactNode {
  const n = lista.length;
  if (busca) return <b>{contar(n, "proposta encontrada", "propostas encontradas")} para “{busca}”</b>;
  if (mostrar === "CONTRATO") return <b>{n === 1 ? "1 proposta virou contrato" : `${n} propostas viraram contrato`}</b>;
  if (mostrar === "RECUSADAS") return <b>{contar(n, "proposta recusada", "propostas recusadas")}</b>;
  const venc = lista.filter((p) => p.retorno?.vencido).length;
  const aceitas = lista.filter((p) => p.situacao === "ACEITA").length;
  return (
    <>
      <b>{n === 1 ? "1 proposta em andamento" : `${n} propostas em andamento`}</b>
      {venc ? ` · ${venc} com o retorno vencido` : ""}
      {aceitas ? ` · ${aceitas === 1 ? "1 aceita esperando o contrato" : `${aceitas} aceitas esperando o contrato`}` : ""}
    </>
  );
}

function PropostasConteudo() {
  const [mostrar, setMostrar] = useState<Mostrar>("ANDAMENTO");
  const [busca, setBusca] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQ(busca.trim()), 250);
    return () => clearTimeout(t);
  }, [busca]);
  const { dados, recarregar } = useCarga<ListaPropostas>(`/v1/escritorio/propostas?mostrar=${mostrar}${q ? `&q=${encodeURIComponent(q)}` : ""}`);
  const hoje = hojeBrasilia();

  if (dados === "erro") return <><CabPropostas /><ErroAoCarregar oque="as propostas" aoTentar={recarregar} /></>;
  if (!dados) return <><CabPropostas /><Carregando rotulo="Carregando as propostas…" linhas={4} /></>;
  if (!dados.algum) {
    return (
      <div className="hn">
        <CabPropostas />
        <section className="folha" aria-labelledby="t-pl" style={{ overflow: "hidden" }}>
          <h2 id="t-pl" className="sr">Lista de propostas</h2>
          <Estado icone="pena" titulo="Nenhuma proposta ainda"
            acoes={
              <a data-muda className="btn btn-pri" href={ROTAS_COMERCIAL.nova}>
                <Icone nome="mais" className="ico" />
                Escrever a primeira proposta
              </a>
            }>
            Escreva o serviço e as condições de honorário uma vez. Se o cliente aceitar, o contrato nasce com elas. A proposta é para quem já procurou o escritório e está em Clientes.
          </Estado>
        </section>
      </div>
    );
  }
  const c = dados.contagem;
  return (
    <div className="hn">
      <CabPropostas />
      <section className="folha" aria-labelledby="t-pl" style={{ overflow: "hidden" }}>
        <h2 id="t-pl" className="sr">Lista de propostas</h2>
        <Busca id="pr-b" rotulo="Buscar por cliente ou número" dica="Cliente ou número da proposta" valor={busca} aoMudar={setBusca}>
          <Chips rotulo="Mostrar" atual={mostrar} aoEscolher={(v) => setMostrar(v as Mostrar)}
            opcoes={[{ v: "ANDAMENTO", t: `Em andamento (${c.andamento})` }, { v: "CONTRATO", t: `Viraram contrato (${c.contrato})` }, { v: "RECUSADAS", t: `Recusadas (${c.recusadas})` }]} />
        </Busca>
        <p className="hn-cont" role="status">{contagemTexto(dados.propostas, mostrar, q)}</p>
        {dados.propostas.length ? (
          <table className="hn-tab">
            <caption className="sr">Propostas</caption>
            <colgroup>
              {["30%", "27%", "15%", "15%", "13%"].map((w, i) => <col key={i} style={{ width: w }} />)}
            </colgroup>
            <thead>
              <tr>
                {["Proposta", "Honorários", "Responsável", "Retorno", "Situação"].map((t) => <th key={t} scope="col">{t}</th>)}
              </tr>
            </thead>
            <tbody>
              {dados.propostas.map((p) => (
                <tr key={p.id} className={p.retorno?.vencido ? "hn-venc" : undefined}>
                  <td>
                    <div className="esc">
                      <div>
                        <a href={ROTAS_COMERCIAL.proposta(p.id)}>{p.cliente.nome}</a>
                        <small>{p.numero} · {p.servico}</small>
                      </div>
                    </div>
                  </td>
                  <td data-r="Honorários">
                    {p.condicoes.length ? <div className="hn-selos">{p.condicoes.map((x) => <SeloTipo key={x.tipo} c={x} />)}</div> : <span className="hn-sem">a escrever</span>}
                  </td>
                  <td data-r="Responsável">{p.responsavel.nome}</td>
                  <td data-r="Retorno">{retornoNaLista(p, hoje)}</td>
                  <td data-r="Situação">
                    <SeloSituacao s={p.situacao} />
                    {p.vencida ? <> <Selo tom="neutro" icone="relogio">validade vencida</Selo></> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Estado icone="busca" titulo={q ? "Nenhuma proposta encontrada" : "Nenhuma proposta aqui"}>
            {q ? "Confira o nome do cliente ou o número, ou limpe a busca." : "Quando houver, elas aparecem nesta lista."}
          </Estado>
        )}
        <p className="hn-pe">
          <Icone nome="historico" className="ico" />
          <span>Proposta não se apaga. A recusada fica guardada com o motivo, e é dela que sai a conta de conversão do <a href={ROTAS_COMERCIAL.funil}>Funil</a>.</span>
        </p>
      </section>
    </div>
  );
}

export function PropostasComercial() {
  return <MolduraArea area="COMERCIAL" secao="propostas">{() => <PropostasConteudo />}</MolduraArea>;
}

// ------------------------------------------------------------------------- Funil e Origem

function Periodo({ atual, aoEscolher }: { atual: PeriodoComercial; aoEscolher: (p: PeriodoComercial) => void }) {
  return <Chips rotulo="Período" atual={atual} aoEscolher={(v) => aoEscolher(v as PeriodoComercial)}
    opcoes={(["30", "90", "12"] as PeriodoComercial[]).map((k) => ({ v: k, t: PERIODOS_COMERCIAL[k] }))} />;
}

function Cartao({ href, nome, sub, selo }: { href: string; nome: string; sub: string; selo?: ReactNode }) {
  return (
    <li className="cm-card">
      <a href={href}>{nome}</a>
      <small>{sub}</small>
      {selo}
    </li>
  );
}

function Coluna({ titulo, n, desc, fim, children }: { titulo: string; n: number; desc: string; fim?: boolean; children: ReactNode }) {
  return (
    <div className={fim ? "cm-coluna cm-fim" : "cm-coluna"}>
      <h3>{titulo} <span className="disco" aria-hidden="true"><span>{n}</span></span><span className="sr">: {n}</span></h3>
      <p>{desc}</p>
      <ul>{children}</ul>
    </div>
  );
}

const pctLargura = (parte: number, todo: number) => `${todo ? Math.max(30, Math.round((100 * parte) / todo)) : 100}%`;

function FunilConteudo() {
  const [periodo, setPeriodo] = useState<PeriodoComercial>("90");
  const { dados, recarregar } = useCarga<Funil>(`/v1/escritorio/comercial/funil?periodo=${periodo}`);
  const hoje = hojeBrasilia();
  const cab = <CabSimples titulo="Funil" />;
  if (dados === "erro") return <>{cab}<ErroAoCarregar oque="o funil" aoTentar={recarregar} /></>;
  if (!dados) return <>{cab}<Carregando rotulo="Carregando o funil…" linhas={3} /></>;
  const d = dados;
  const per = textoPeriodo(d.de, d.ate);
  const semProp = d.primeiros - d.comProposta;
  const naoFecharam = d.comProposta - d.contratos;
  const perdas1 = ([[d.semProposta.naoPegou, "o escritório não pegou o caso"], [d.semProposta.naoVoltou, "não voltaram depois do atendimento"],
    [d.semProposta.emAtendimento, "ainda em atendimento, sem proposta"]] as [number, string][]).filter(([n]) => n);
  const perdas2 = ([[d.depoisProposta.andamento, "proposta em andamento (abaixo)"],
    ...d.depoisProposta.recusadas.map((r) => [r.n, r.motivo ? MOTIVOS_RECUSA[r.motivo].toLowerCase() : "recusaram"] as [number, string])] as [number, string][]).filter(([n]) => n);
  const card = (p: Funil["agora"]["enviada"][number], extra?: string) => (
    <Cartao key={p.id} href={ROTAS_COMERCIAL.proposta(p.id)} nome={p.nome}
      sub={`${p.numero}${extra ? ` · ${extra}` : p.valorCerto ? ` · ${reais(p.valorCerto)}` : ""}`}
      selo={p.retorno && (p.retorno.vencido || p.retorno.em === hoje) ? <SeloRetorno r={p.retorno} hoje={hoje} prefixo="retorno " /> : undefined} />
  );

  return (
    <div className="hn">
      {cab}
      <section className="folha" aria-labelledby="t-cv">
        <div className="folha-cab">
          <div>
            <h2 id="t-cv">Quanto vira contrato</h2>
            <p className="sub">Primeiros contatos de {per} e o que aconteceu com cada um.</p>
          </div>
          <div className="acoes"><Periodo atual={periodo} aoEscolher={setPeriodo} /></div>
        </div>
        {d.primeiros ? (
          <div className="cm-funil">
            <ol className="cm-f" aria-label={`Funil de ${per}`}>
              <li className="e1">
                <div className="cm-f-faixa" style={{ ["--w" as string]: "100%" }}><b className="num">{d.primeiros}</b><span>{d.primeiros === 1 ? "primeiro contato" : "primeiros contatos"}</span></div>
                <p className="cm-f-lado">Clientes novos cadastrados no período.</p>
              </li>
              <li className="cm-f-passa">
                <p className="cm-f-taxa"><b className="num">{taxa(d.comProposta, d.primeiros)}</b> passam</p>
                <div className="cm-f-perda">
                  <p><b>{semProp === 1 ? "1 não recebeu proposta" : `${semProp} não receberam proposta`}</b></p>
                  {perdas1.length ? <ul>{perdas1.map(([n, t]) => <li key={t}><b className="num">{n}</b><span>{t}</span></li>)}</ul> : null}
                </div>
              </li>
              <li className="e2">
                <div className="cm-f-faixa" style={{ ["--w" as string]: pctLargura(d.comProposta, d.primeiros) }}><b className="num">{d.comProposta}</b><span>{d.comProposta === 1 ? "recebeu proposta" : "receberam proposta"}</span></div>
                <p className="cm-f-lado">Proposta enviada ao cliente, por qualquer valor.</p>
              </li>
              <li className="cm-f-passa">
                <p className="cm-f-taxa"><b className="num">{taxa(d.contratos, d.comProposta)}</b> passam</p>
                <div className="cm-f-perda">
                  <p><b>{naoFecharam === 1 ? "1 ainda não fechou" : `${naoFecharam} ainda não fecharam`}</b></p>
                  {perdas2.length ? <ul>{perdas2.map(([n, t]) => <li key={t}><b className="num">{n}</b><span>{t}</span></li>)}</ul> : null}
                </div>
              </li>
              <li className="e3">
                <div className="cm-f-faixa" style={{ ["--w" as string]: pctLargura(d.contratos, d.primeiros) }}><b className="num">{d.contratos}</b><span>{d.contratos === 1 ? "virou contrato" : "viraram contrato"}</span></div>
                <p className="cm-f-lado">Contrato criado no T3jus, assinado ou não.</p>
              </li>
            </ol>
            <p className="cm-f-total"><b className="num">{taxa(d.contratos, d.primeiros)}</b> dos primeiros contatos viraram contrato no período.</p>
          </div>
        ) : (
          <Estado icone="pessoas" titulo="Nenhum primeiro contato no período">
            O funil conta os clientes cadastrados no período. Escolha um período maior ou cadastre quem procurou o escritório em Clientes.
          </Estado>
        )}
      </section>
      <section className="folha" aria-labelledby="t-ag" style={{ overflow: "hidden" }}>
        <div className="folha-cab">
          <div>
            <h2 id="t-ag">Agora no funil</h2>
            <p className="sub">Ninguém arrasta cartão: a etapa sai do que foi registrado (atendimento, proposta, resposta e contrato).</p>
          </div>
        </div>
        <div className="cm-colunas">
          <Coluna titulo="Primeiro contato" n={d.agora.primeiro.length} desc="Atendido, ainda sem proposta enviada.">
            {d.agora.primeiro.map((x) => (
              <Cartao key={x.clienteId} href={ROTAS_COMERCIAL.ficha(x.clienteId)} nome={x.nome} sub={x.detalhe}
                selo={x.rascunho ? <Selo tom="neutro">Rascunho</Selo> : x.semRetorno ? <Selo tom="atencao" icone="relogio">Sem retorno marcado</Selo> : undefined} />
            ))}
          </Coluna>
          <Coluna titulo="Proposta enviada" n={d.agora.enviada.length} desc="Esperando a resposta do cliente.">{d.agora.enviada.map((p) => card(p))}</Coluna>
          <Coluna titulo="Em negociação" n={d.agora.negociacao.length} desc="O cliente pediu mudança.">{d.agora.negociacao.map((p) => card(p))}</Coluna>
          <Coluna titulo="Aceita" n={d.agora.aceita.length} desc="Falta criar ou assinar o contrato.">{d.agora.aceita.map((p) => card(p, "falta o contrato"))}</Coluna>
          <Coluna titulo="Contrato no período" n={d.contratos} desc="Os 3 mais recentes." fim>
            {d.agora.contrato?.length ? d.agora.contrato.map((x) => (
              <Cartao key={x.id} href={ROTAS_COMERCIAL.contrato(x.id)} nome={x.nome}
                sub={`${x.numero} · ${x.valorCerto ? reais(x.valorCerto) : `criado em ${diaCurto(x.em)}`}`}
                selo={x.situacao === "ELABORACAO" ? <Selo tom="neutro">Em elaboração</Selo> : undefined} />
            )) : d.contratos ? null : <li className="cm-card"><small>Nenhum contrato no período. Eles aparecem aqui quando a proposta aceita vira contrato.</small></li>}
          </Coluna>
        </div>
      </section>
      <Oab titulo="Funil de quem já procurou o escritório.">
        O T3jus não faz anúncio, envio em massa nem lista de contatos comprada, e não conta pontos de “chance de fechar”. A publicidade da advocacia segue o Provimento 205/2021 da OAB.
      </Oab>
    </div>
  );
}

export function FunilComercial() {
  return <MolduraArea area="COMERCIAL" secao="funil">{() => <FunilConteudo />}</MolduraArea>;
}

function OrigemConteudo() {
  const [periodo, setPeriodo] = useState<PeriodoComercial>("90");
  const { dados, recarregar } = useCarga<OrigemContatos>(`/v1/escritorio/comercial/origem?periodo=${periodo}`);
  const maior = useMemo(() => (dados && dados !== "erro" ? Math.max(1, ...dados.linhas.map((l) => l.contatos)) : 1), [dados]);
  const cab = <CabSimples titulo="Origem dos contatos" />;
  if (dados === "erro") return <>{cab}<ErroAoCarregar oque="a origem dos contatos" aoTentar={recarregar} /></>;
  if (!dados) return <>{cab}<Carregando rotulo="Carregando a origem dos contatos…" linhas={3} /></>;
  const d = dados;
  const top = d.indicacoes.slice(0, 2);
  const resto = d.indicacoes.slice(2);
  return (
    <div className="hn">
      {cab}
      <div className="hn-grade">
        <div className="hn-col">
          <section className="folha" aria-labelledby="t-or" style={{ overflow: "hidden" }}>
            <div className="folha-cab">
              <div>
                <h2 id="t-or">De onde vêm os clientes</h2>
                <p className="sub">{contar(d.total, "primeiro contato", "primeiros contatos")} de {textoPeriodo(d.de, d.ate)}. A origem é a que foi marcada no cadastro do cliente.</p>
              </div>
              <div className="acoes"><Periodo atual={periodo} aoEscolher={setPeriodo} /></div>
            </div>
            {d.linhas.length ? (
              <>
                <div className="legenda" style={{ padding: "0 24px 16px" }}>
                  <span><i style={{ background: "var(--vinho)" }} />virou contrato</span>
                  <span><i style={{ background: "var(--vinho-4)" }} />recebeu proposta, não fechou</span>
                  <span><i style={{ background: "var(--ambar-2)" }} />só o primeiro contato</span>
                </div>
                <table className="hn-tab">
                  <caption className="sr">Origem dos contatos</caption>
                  <colgroup>{["31%", "11%", "11%", "11%", "17%", "19%"].map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
                  <thead>
                    <tr>{["Origem", "Contatos", "Propostas", "Contratos", "Viram contrato", "Contratado (valor certo)"].map((t) => <th key={t} scope="col">{t}</th>)}</tr>
                  </thead>
                  <tbody>
                    {d.linhas.map((l) => (
                      <tr key={l.origem ?? "sem"}>
                        <td>
                          <b>{l.origem ? ORIGENS[l.origem] : "Sem origem marcada"}</b>
                          <div className="cm-org-barra" aria-hidden="true">
                            <div className="tons">
                              <i style={{ width: `${(100 * l.contratos) / maior}%`, background: "var(--vinho)" }} />
                              <i style={{ width: `${(100 * (l.propostas - l.contratos)) / maior}%`, background: "var(--vinho-4)" }} />
                              <i style={{ width: `${(100 * (l.contatos - l.propostas)) / maior}%`, background: "var(--ambar-2)" }} />
                            </div>
                          </div>
                        </td>
                        <td data-r="Contatos"><span className="num">{l.contatos}</span></td>
                        <td data-r="Propostas"><span className="num">{l.propostas}</span></td>
                        <td data-r="Contratos"><span className="num">{l.contratos}</span></td>
                        <td data-r="Viram contrato">
                          <span>
                            <span className="cm-pct num">{taxa(l.contratos, l.contatos)}</span>
                            {l.contatos < 5 ? <span className="selo selo-neutro cm-poucos">poucos dados</span> : null}
                          </span>
                        </td>
                        <td data-r="Contratado (valor certo)"><span className="num hn-valor-c">{l.valorCerto ? reais(l.valorCerto) : "—"}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <Estado icone="pessoas" titulo="Nenhum primeiro contato no período">
                Escolha um período maior. A origem vem do cadastro de cada cliente, em Clientes.
              </Estado>
            )}
            <p className="hn-pe">
              <Icone nome="ajuda" className="ico" />
              <span>Com menos de 5 contatos, a porcentagem diz pouco: por isso o selo “poucos dados”. O valor certo soma o fixo, as parcelas e 12 meses de mensalidade; êxito e sucumbência só entram quando viram cobrança.</span>
            </p>
          </section>
        </div>
        <aside className="hn-col" aria-label="Indicações e regras">
          <section className="folha" aria-labelledby="t-qi">
            <div className="folha-cab" style={{ paddingBottom: 8 }}>
              <div>
                <h2 id="t-qi" style={{ fontSize: 20 }}>Quem mais indicou</h2>
                <p className="sub">Do campo “Quem indicou” do cadastro.</p>
              </div>
            </div>
            {d.indicacoes.length ? (
              <ul className="cm-motivos">
                {top.map((i) => <li key={i.nome}><span>{i.nome}</span><b className="num">{i.n}</b></li>)}
                {resto.length ? <li><span>{resto.length === 1 ? resto[0]!.nome : `Outras ${resto.length} pessoas`}</span><b className="num">{resto.reduce((s, i) => s + i.n, 0)}</b></li> : null}
              </ul>
            ) : (
              <p className="hn-pe" style={{ borderTop: 0 }}>
                <Icone nome="pessoas" className="ico" />
                <span>Ninguém indicado no período.</span>
              </p>
            )}
          </section>
          <Oab titulo="Para saber, não para captar.">
            Esta tela só conta de onde vieram os clientes que procuraram o escritório.
            <ul>
              <li>Não há campanha, anúncio nem envio em massa no T3jus.</li>
              <li>A lista de origens é fixa nesta versão e não tem “comprou contatos”.</li>
              <li>Publicidade da advocacia: Provimento 205/2021 da OAB.</li>
            </ul>
          </Oab>
        </aside>
      </div>
    </div>
  );
}

export function OrigemComercial() {
  return <MolduraArea area="COMERCIAL" secao="origem">{() => <OrigemConteudo />}</MolduraArea>;
}
