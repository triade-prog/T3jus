"use client";
// Ficha do cliente ligada a propostas, contratos e casos (F3.110; AP-01, AP-05, IN-01, EX-01),
// tela aprovada em docs/design/aprovadas/portal-ficha-cliente-ligada: o âmbar "Próximo passo"
// com a trilha (Proposta, Contrato, Assinatura, Caso) e o botão que segue o estado do cliente;
// as abas Propostas, Contratos e Casos, cada uma pela própria área; o "No escritório" da aba
// Ficha; e a coluna "Próximo passo" da lista de Clientes. O passo vem pronto do servidor.

import { useCallback, useEffect, useId, useState, type ReactNode } from "react";
import {
  AREAS_DIREITO,
  type AreaDireito, type CasoDoCliente, type ClienteLinha, type ContratoDoCliente, type FichaCliente, type PassoCliente, type PropostaDoCliente,
} from "@t3jus/domain";
import { Icone } from "../Icone.tsx";
import { Carregando, Estado } from "../console/pecas.tsx";
import { iniciais } from "../console/tempo.ts";
import { rotuloProx } from "./clientes.ts";
import { Selo, SeloSituacao } from "./Comercial.tsx";
import { valorDaProposta } from "./comercial.ts";
import { nomeSituacaoContrato, SELO_CONTRATO, textoProximo } from "./contratos.ts";
import { primeiroNome } from "./equipe.ts";
import { JanelaPedirPelaConversa } from "./DocumentosPessoais.tsx";
import { BOTAO_PASSO, botaoDoFechamento, contar, destinoPasso, detalheDoPassoFechamento, dia, nomeDoPassoFechamento, PASSOS_FEITOS, proximoDoFechamento, quemFazFechamento, ROTAS_PASSO, textoPasso, TRILHA, type AbaLigada } from "./fichaLigada.ts";
import { nomePapel } from "./juridico.ts";
import { chamarPortal } from "./Moldura.tsx";

/** O que abre uma janela na própria ficha: a assinatura ou o caso de um contrato. */
export type JanelaLigada = { tipo: "assinar" | "caso"; contrato: string; modo?: "NOVO" | "JUNTAR" };

const ICONE_PASSO = {
  SEM_PROPOSTA: "maleta", PROPOSTA_RASCUNHO: "maleta", PROPOSTA_ANDAMENTO: "conversas", PROPOSTA_ACEITA: "pena",
  CONTRATO_ELABORACAO: "check", CONTRATO_SEM_CASO: "balanca", CASO: "balanca",
  FECHAMENTO: "cadeado", CONTRATO_ATIVO: "pena", ATENDIDO: "maleta", DOCUMENTOS: "enviar",
} as const;

/** O botão do próximo passo; null quando a pessoa não pode dar o passo. */
export function BotaoPasso({ passo, cliente, nomeCliente, secundario = false, aoJanela }: {
  passo: PassoCliente;
  cliente: string;
  nomeCliente?: string;
  secundario?: boolean;
  aoJanela: (j: JanelaLigada) => void;
}) {
  if (!passo.pode) return null;
  const classe = `btn ${secundario ? "btn-sec" : "btn-pri"}`;
  const rotulo = BOTAO_PASSO[passo.tipo];
  const icone = <Icone nome={ICONE_PASSO[passo.tipo]} className="ico" />;
  const aria = nomeCliente && passo.tipo === "SEM_PROPOSTA" ? `${rotulo} para ${nomeCliente}` : undefined;
  if ((passo.tipo === "CONTRATO_ELABORACAO" || passo.tipo === "CONTRATO_SEM_CASO") && passo.item?.id) {
    const contrato = passo.item.id;
    return (
      <button data-muda className={classe} type="button" onClick={() => aoJanela({ tipo: passo.tipo === "CONTRATO_ELABORACAO" ? "assinar" : "caso", contrato })}>
        {icone}
        {rotulo}
      </button>
    );
  }
  if (passo.tipo === "FECHAMENTO") {
    const x = proximoDoFechamento(passo);
    const b = x ? botaoDoFechamento(x) : null;
    if (!b?.href) return null;
    return (
      <a data-muda className={classe} href={b.href}>
        <Icone nome={b.icone} className="ico" />
        {b.rotulo}
      </a>
    );
  }
  const href = destinoPasso(passo, cliente);
  if (!href) return null;
  return (
    <a data-muda={passo.tipo === "CASO" || passo.tipo === "CONTRATO_ATIVO" ? undefined : true} className={classe} href={href} aria-label={aria}>
      {icone}
      {rotulo}
    </a>
  );
}

/** Os passos do fechamento, no lugar da trilha (decisão 14). */
export function ListaFechamento({ passo, nomeCliente }: { passo: PassoCliente; nomeCliente: string }) {
  const todos = passo.item?.passos ?? [];
  const i = todos.findIndex((x) => !x.feito);
  const primeiro = primeiroNome(nomeCliente);
  return (
    <ol className="jf-fecha" aria-label={`Fechamento do caso, em ${todos.length} ${todos.length === 1 ? "passo" : "passos"}`}>
      {todos.map((x, n) => {
        const d = detalheDoPassoFechamento(x, todos);
        const nome = nomeDoPassoFechamento(x, primeiro);
        return (
          <li key={x.tipo} className={x.feito ? "jf-ok" : n === i ? "jf-ag" : undefined}>
            <span className="jf-m">{x.feito ? <Icone nome="check" className="ico" /> : n + 1}</span>
            <span>
              {n === i ? <b>{nome}</b> : nome}
              <span className="sr">{x.feito ? ": feito" : n === i ? ": é o próximo passo" : ": depois"}</span>
              {d ? <small>{d}</small> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function TrilhaCliente({ feitos, semCaso = false }: { feitos: number; semCaso?: boolean }) {
  return (
    <ol className="fl-jor" aria-label="Caminho do cliente no escritório">
      {TRILHA.map((nome, i) => semCaso && i === feitos ? (
        // CH-13 (decisão 27): o contrato sem caso termina na assinatura.
        <li key={nome}>Sem caso<span className="sr">: este contrato não tem caso</span></li>
      ) : (
        <li key={nome} className={i < feitos ? "fl-ok" : i === feitos ? "fl-ag" : undefined}>
          {i < feitos ? <Icone nome="check" className="ico" /> : null}
          {nome}
          <span className="sr">{i < feitos ? ": feito" : i === feitos ? ": é o próximo passo" : ": depois"}</span>
        </li>
      ))}
    </ol>
  );
}

/** "Juntar os documentos" (EX-18, decisão 46): "3 de 6", a barra (enfeite) e o que falta. */
function JuntarDocumentos({ passo }: { passo: PassoCliente }) {
  const i = passo.item;
  const total = i?.total ?? 0;
  const chegaram = i?.chegaram ?? 0;
  return (
    <>
      <p className="jf-dcont"><b>{chegaram} de {total}</b><span>chegaram para começar {i?.nome ?? "o caso"}</span></p>
      <ol className="jf-dbarra" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${Math.max(total, 1)}, 1fr)` }}>
        {Array.from({ length: total }, (_, n) => <li key={n} className={n < chegaram ? "ok" : undefined} />)}
      </ol>
      {i?.faltam?.length ? (
        <>
          <p className="cl-oque" style={{ marginTop: 6 }}><b>Faltam:</b></p>
          <ul className="jf-dfalta">{i.faltam.map((d) => <li key={d.id}>{d.descricao}</li>)}</ul>
        </>
      ) : null}
    </>
  );
}

/** Quem recebeu a lista e o lembrete automático, embaixo do "Juntar os documentos". */
function AvisoDaLista({ passo }: { passo: PassoCliente }) {
  const a = passo.item?.aviso;
  const para = a?.para ? primeiroNome(a.para) : null;
  return (
    <p className="jf-quem">
      <Icone nome="relogio" className="ico" />
      <span>
        {a && para ? `${para} recebeu a lista em ${dia(a.em)} pelo WhatsApp. ` : null}
        Enquanto faltar algo, a automação “Documento pendente”, se estiver ligada, lembra de novo. Os pessoais que chegarem vão para a ficha.
      </span>
    </p>
  );
}

/** O âmbar do topo: o próximo passo e, numa linha de baixo, o próximo contato (decisões 1 e 2). */
export function DirPasso({ f, passo, comercial, hoje, editando, aoRegistrar, aoJanela, escritorio = "" }: {
  f: FichaCliente;
  /** O nome do escritório, para o texto do "Pedir de novo" (EX-18). */
  escritorio?: string;
  passo: PassoCliente;
  comercial: boolean;
  hoje: string;
  editando: boolean;
  aoRegistrar: (() => void) | null;
  aoJanela: (j: JanelaLigada) => void;
}) {
  const t = textoPasso(passo, f.nome);
  const p = f.proxContato;
  const r = p ? rotuloProx(p, hoje) : null;
  const registrar = (secundario: boolean) => aoRegistrar ? (
    <button data-muda className={`btn ${secundario ? "btn-sec" : "btn-pri"}`} type="button" onClick={aoRegistrar}>
      <Icone nome="mais" className="ico" />
      Registrar atendimento
    </button>
  ) : null;
  const [pedir, setPedir] = useState(false);
  const fecha = passo.tipo === "FECHAMENTO" || passo.tipo === "ATENDIDO";
  const casoId = fecha ? passo.item?.caso?.id ?? null : null;
  // Decisão 18: no "Cliente atendido", "Gerar proposta" é secundário e "Ver o caso" fica ao lado.
  const principal = passo.tipo === "ATENDIDO"
    ? (passo.pode ? <BotaoPasso passo={passo} cliente={f.id} secundario aoJanela={aoJanela} /> : registrar(true))
    : passo.pode ? <BotaoPasso passo={passo} cliente={f.id} aoJanela={aoJanela} /> : registrar(false);
  const extra = passo.tipo === "DOCUMENTOS" && passo.item?.faltam?.length ? (
    // Decisão 46: "Pedir de novo" abre a conversa com o texto pronto do que falta.
    <button className="btn btn-sec" type="button" onClick={() => setPedir(true)}>
      <Icone nome="whats" className="ico" />
      Pedir de novo
    </button>
  ) : passo.pode && passo.tipo === "PROPOSTA_ANDAMENTO" && passo.item?.id ? (
    <a className="btn btn-sec" href={ROTAS_PASSO.proposta(passo.item.id)}>
      <Icone nome="olho" className="ico" />
      Ver a proposta
    </a>
  ) : casoId && (passo.tipo === "ATENDIDO" || !passo.pode) ? (
    // Decisão 16: sem a área do passo, quem tem Jurídico ainda vai ao caso.
    <a className={`btn ${passo.tipo === "ATENDIDO" ? "btn-fantasma" : "btn-sec"}`} href={ROTAS_PASSO.caso(casoId)}>
      <Icone nome="balanca" className="ico" />
      Ver o caso
    </a>
  ) : null;
  return (
    <section className="dir campo-ambar fl-passo" aria-labelledby="cl-t-passo">
      <p className="sobretitulo" id="cl-t-passo">
        {t.sobre}
      </p>
      <p className="grande" style={{ fontSize: 30 }}>{t.titulo}</p>
      {fecha ? null : <TrilhaCliente feitos={PASSOS_FEITOS[passo.tipo]} semCaso={passo.tipo === "CONTRATO_ATIVO"} />}
      {passo.tipo === "DOCUMENTOS" ? <JuntarDocumentos passo={passo} /> : <p className="cl-oque">{t.oque}</p>}
      {fecha ? <ListaFechamento passo={passo} nomeCliente={f.nome} /> : null}
      {t.semAcao ? (
        <p className="fl-semacao">
          <Icone nome="cadeado" className="ico" />
          <span>{t.semAcao}</span>
        </p>
      ) : null}
      {!editando && (principal || extra) ? (
        <div className="fl-acoes">
          {principal}
          {extra}
        </div>
      ) : null}
      {passo.tipo === "DOCUMENTOS" ? <AvisoDaLista passo={passo} /> : null}
      {pedir ? (
        <JanelaPedirPelaConversa f={f} escritorio={escritorio} documentos={(passo.item?.faltam ?? []).map((d) => d.descricao)} aoFechar={() => setPedir(false)} />
      ) : null}
      {passo.tipo === "FECHAMENTO" && passo.pode ? (
        <p className="jf-quem">
          <Icone nome="pessoas" className="ico" />
          <span>{quemFazFechamento(passo)}</span>
        </p>
      ) : null}
      {comercial ? (
        <div className="fl-contato">
          <span>
            <Icone nome="relogio" className="ico" />
            {p && r ? (
              <>
                <span>
                  Próximo contato <b>{r.data}</b>, com {primeiroNome(p.responsavel.nome)}
                </span>
                {r.tipo === "vencido" ? (
                  <span className="selo selo-urgente">
                    <Icone nome="alerta" className="ico" />
                    {r.rotulo}
                  </span>
                ) : (
                  <span className={r.tipo === "hoje" ? "selo selo-atencao" : "selo selo-neutro"}>{r.rotulo}</span>
                )}
              </>
            ) : (
              <span>Sem próximo contato marcado.</span>
            )}
          </span>
          {!editando && passo.pode ? registrar(true) : null}
        </div>
      ) : null}
    </section>
  );
}

// ------------------------------------------------------------------------- abas

function FolhaAba({ titulo, sub, acoes, children, ocupada }: { titulo: string; sub: string; acoes?: ReactNode; children: ReactNode; ocupada?: boolean }) {
  const id = useId();
  return (
    <section className="folha" aria-labelledby={id} aria-busy={ocupada || undefined} style={{ overflow: "hidden" }}>
      <div className="folha-cab">
        <div>
          <h2 id={id}>{titulo}</h2>
          <p className="sub">{sub}</p>
        </div>
        {acoes ? <div className="acoes">{acoes}</div> : null}
      </div>
      {children}
    </section>
  );
}

type Itens = { propostas?: PropostaDoCliente[]; contratos?: ContratoDoCliente[]; casos?: CasoDoCliente[] };
const TITULOS_ABA: Record<AbaLigada, string> = { propostas: "Propostas", contratos: "Contratos", casos: "Casos" };

function useItens(cliente: string, aba: AbaLigada, vez: number) {
  const [d, setD] = useState<Itens | "erro" | null>(null);
  const carregar = useCallback(async () => {
    setD(null);
    const r = await chamarPortal<Itens>(`/v1/escritorio/clientes/${cliente}/${aba}`);
    setD(r.ok ? r.dados : "erro");
  }, [cliente, aba]);
  useEffect(() => {
    void Promise.resolve().then(() => carregar());
  }, [carregar, vez]);
  return { d, carregar };
}

function Cartao({ nome, href, sub, dados, selos, acao }: { nome: string; href: string; sub: ReactNode; dados: [string, ReactNode][]; selos?: ReactNode; acao?: ReactNode }) {
  return (
    <li className="cartao">
      <div className="c-topo">
        <div>
          <a className="c-nome" href={href}>{nome}</a>
          <small>{sub}</small>
        </div>
        <Icone nome="dir" className="ico c-ir" />
      </div>
      <dl className="c-dados">
        {dados.map(([k, v]) => (
          <div key={k} style={{ display: "contents" }}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {selos ? <div className="c-selos">{selos}</div> : null}
      {acao ? <div className="fl-c-acao">{acao}</div> : null}
    </li>
  );
}

function Ir({ href, rotulo }: { href: string; rotulo: string }) {
  return (
    <a className="fl-ir" href={href} aria-label={rotulo}>
      Abrir
      <Icone nome="dir" className="ico ico-s" />
    </a>
  );
}

/** Uma aba de área na ficha (decisões 7 a 11): a lista, o vazio com o atalho, carregando e erro. */
export function AbaItensCliente({ aba, f, passo, hoje, vez, juridico, aoJanela }: {
  aba: AbaLigada;
  f: FichaCliente;
  passo: PassoCliente | undefined;
  hoje: string;
  /** Muda quando algo na ficha mudou (assinatura, caso), para a aba carregar de novo. */
  vez: number;
  /** A pessoa tem a área Jurídico: o caso ligado vira link. */
  juridico: boolean;
  aoJanela: (j: JanelaLigada) => void;
}) {
  const { d, carregar } = useItens(f.id, aba, vez);
  const primeiro = primeiroNome(f.nome);
  const titulo = TITULOS_ABA[aba];
  if (d === null) {
    return (
      <FolhaAba titulo={titulo} sub="Carregando…" ocupada>
        <Carregando rotulo={`Carregando ${aba === "casos" ? "os casos" : `as ${aba}`.replace("as contratos", "os contratos")} de ${primeiro}…`} linhas={3} />
      </FolhaAba>
    );
  }
  if (d === "erro") {
    const artigo = aba === "propostas" ? "as" : "os";
    return (
      <FolhaAba titulo={titulo} sub={`O que ${primeiro} tem nesta área.`}>
        <Estado icone="alerta" erro titulo={`Não deu para carregar ${artigo} ${aba} de ${primeiro}`}
          acoes={
            <button className="btn btn-pri" type="button" onClick={() => void carregar()}>
              <Icone nome="reenviar" className="ico" />
              Tentar de novo
            </button>
          }>
          O servidor não respondeu. A ficha e as outras abas continuam valendo, e nada foi mudado. Tente de novo; se continuar, fale com o suporte.
        </Estado>
      </FolhaAba>
    );
  }
  if (aba === "propostas") return <AbaPropostas lista={d.propostas ?? []} f={f} passo={passo} hoje={hoje} />;
  if (aba === "contratos") return <AbaContratos lista={d.contratos ?? []} f={f} passo={passo} juridico={juridico} aoJanela={aoJanela} />;
  return <AbaCasos lista={d.casos ?? []} f={f} passo={passo} aoJanela={aoJanela} />;
}

function textoSituacaoProposta(p: PropostaDoCliente): string {
  switch (p.situacao) {
    case "RASCUNHO": return `Rascunho desde ${dia(p.criadaEm)}`;
    case "ENVIADA":
    case "NEGOCIACAO":
      return [p.enviadaEm ? `Enviada em ${dia(p.enviadaEm)}` : "Enviada", p.retorno ? `retorno em ${dia(p.retorno.em)}` : null].filter(Boolean).join(" · ");
    case "ACEITA": return `Aceita${p.respondidaEm ? ` em ${dia(p.respondidaEm)}` : ""} · ${p.temContrato ? "virou contrato" : "falta o contrato"}`;
    default: return p.respondidaEm ? `Em ${dia(p.respondidaEm)}` : "";
  }
}

function AbaPropostas({ lista, f, passo, hoje }: { lista: PropostaDoCliente[]; f: FichaCliente; passo: PassoCliente | undefined; hoje: string }) {
  void hoje;
  const primeiro = primeiroNome(f.nome);
  const sub = `O que o escritório ofereceu a ${primeiro}. Cada proposta abre a própria ficha.`;
  const ativo = f.situacao === "ATIVO";
  const gerar = (secundario: boolean) => ativo ? (
    <a data-muda className={`btn ${secundario ? "btn-sec" : "btn-pri"}`} href={ROTAS_PASSO.novaProposta(f.id)}>
      <Icone nome="maleta" className="ico" />
      Gerar proposta
    </a>
  ) : null;
  if (!lista.length) {
    return (
      <FolhaAba titulo="Propostas" sub={sub}>
        <Estado icone="maleta" titulo={`Nenhuma proposta para ${primeiro} ainda`} acoes={gerar(false)}>
          A proposta já sai com o nome e a qualificação. Depois de aceita, vira contrato com um clique.
        </Estado>
      </FolhaAba>
    );
  }
  const viva = passo?.item?.id;
  return (
    <FolhaAba titulo="Propostas" sub={sub} acoes={gerar(true)}>
      <table className="so-pc cl-tab fl-tab">
        <caption className="sr">Propostas de {f.nome}</caption>
        <colgroup>
          <col style={{ width: "22%" }} />
          <col style={{ width: "32%" }} />
          <col style={{ width: "36%" }} />
          <col style={{ width: "10%" }} />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">Proposta</th>
            <th scope="col">Situação</th>
            <th scope="col">Honorários</th>
            <th scope="col"><span className="sr">Abrir</span></th>
          </tr>
        </thead>
        <tbody>
          {lista.map((p) => (
            <tr key={p.id} className={p.id === viva ? "fl-vivo" : p.situacao === "RECUSADA" ? "fl-off" : undefined}>
              <td>
                <div className="fl-num">
                  <a href={ROTAS_PASSO.proposta(p.id)}>{p.numero}</a>
                  <small>Criada em {dia(p.criadaEm)}{p.criadoPor ? ` por ${p.criadoPor.nome}` : ""}</small>
                </div>
              </td>
              <td>
                <div className="fl-et">
                  {p.situacao === "ACEITA" && p.temContrato ? <Selo tom="ok" icone="pena">Virou contrato</Selo> : <SeloSituacao s={p.situacao} />}
                  <small>{textoSituacaoProposta(p)}</small>
                </div>
              </td>
              <td>
                <b>{valorDaProposta(p.condicoes)}</b>
                <small>{p.servico}</small>
              </td>
              <td><Ir href={ROTAS_PASSO.proposta(p.id)} rotulo={`Abrir a proposta ${p.numero}`} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="cartoes so-cel fl-cards" aria-label={`Propostas de ${f.nome}`}>
        {lista.map((p) => (
          <Cartao key={p.id} nome={p.numero} href={ROTAS_PASSO.proposta(p.id)} sub={`Criada em ${dia(p.criadaEm)}${p.criadoPor ? ` por ${p.criadoPor.nome}` : ""}`}
            dados={[["Honorários", valorDaProposta(p.condicoes)], ["Situação", textoSituacaoProposta(p)]]}
            selos={p.situacao === "ACEITA" && p.temContrato ? <Selo tom="ok" icone="pena">Virou contrato</Selo> : <SeloSituacao s={p.situacao} />} />
        ))}
      </ul>
      <div className="fl-pe">
        <span><b>{contar(lista.length, "proposta", "propostas")}</b> · da mais nova para a mais antiga. Nada aqui é apagado.</span>
      </div>
    </FolhaAba>
  );
}

function AbaContratos({ lista, f, passo, juridico, aoJanela }: {
  lista: ContratoDoCliente[];
  f: FichaCliente;
  passo: PassoCliente | undefined;
  juridico: boolean;
  aoJanela: (j: JanelaLigada) => void;
}) {
  const primeiro = primeiroNome(f.nome);
  const sub = `Os contratos de honorários de ${primeiro}, com a situação, a assinatura e o caso ligado.`;
  const ativo = f.situacao === "ATIVO";
  if (!lista.length) {
    const aceita = passo?.tipo === "PROPOSTA_ACEITA" && passo.item?.id ? { ...passo.item, id: passo.item.id } : null;
    return (
      <FolhaAba titulo="Contratos" sub={sub}>
        <Estado icone="pena" titulo="Nenhum contrato ainda"
          acoes={!ativo ? null : aceita ? (
            <a data-muda className="btn btn-pri" href={ROTAS_PASSO.gerarContrato(aceita.id)}>
              <Icone nome="pena" className="ico" />
              Gerar contrato da {aceita.numero}
            </a>
          ) : (
            <a data-muda className="btn btn-sec" href={ROTAS_PASSO.novoContrato(f.id)}>
              <Icone nome="mais" className="ico" />
              Criar contrato sem proposta
            </a>
          )}>
          {aceita
            ? `A proposta ${aceita.numero} foi aceita${aceita.aceitaEm ? ` em ${dia(aceita.aceitaEm)}` : ""}. O contrato sai dela, com as condições e a qualificação já preenchidas.`
            : "O contrato nasce da proposta aceita. Sem proposta, dá para criar o contrato direto em Contratos."}
        </Estado>
      </FolhaAba>
    );
  }
  const situacao = (c: ContratoDoCliente) => (
    <Selo tom={c.situacao === "ELABORACAO" ? "atencao" : SELO_CONTRATO[c.situacao].tom} icone={c.situacao === "ELABORACAO" ? "relogio" : c.situacao === "ATIVO" ? "check" : SELO_CONTRATO[c.situacao].icone}>
      {nomeSituacaoContrato(c.situacao)}
    </Selo>
  );
  const sitSub = (c: ContratoDoCliente) =>
    c.situacao === "ELABORACAO" ? `Desde ${dia(c.criadoEm)} · falta a assinatura` : c.assinadoEm ? `Assinado em ${dia(c.assinadoEm)}` : "";
  const acao = (c: ContratoDoCliente, sec = false) => {
    if (!ativo) return null;
    if (c.situacao === "ELABORACAO") {
      return (
        <button data-muda className={`btn ${sec ? "btn-sec" : "btn-pri"}`} type="button" onClick={() => aoJanela({ tipo: "assinar", contrato: c.id })}>
          <Icone nome="check" className="ico" />
          Registrar assinatura
        </button>
      );
    }
    if (c.situacao === "ATIVO" && !c.caso && juridico) {
      return (
        <button data-muda className={`btn ${sec ? "btn-sec" : "btn-pri"}`} type="button" onClick={() => aoJanela({ tipo: "caso", contrato: c.id })}>
          <Icone nome="balanca" className="ico" />
          Abrir o caso
        </button>
      );
    }
    return null;
  };
  const caso = (c: ContratoDoCliente): ReactNode => {
    if (c.caso) return juridico ? <a className="fl-ir" href={ROTAS_PASSO.caso(c.caso.id)}>{c.caso.nome}</a> : <b>{c.caso.nome}</b>;
    if (c.situacao === "ELABORACAO") return <small>Abre ao registrar a assinatura</small>;
    if (c.semCaso) return <small>Este contrato não tem caso</small>;
    return <small>Sem caso ainda</small>;
  };
  const casoTexto = (c: ContratoDoCliente) => c.caso?.nome ?? (c.situacao === "ELABORACAO" ? "Abre na assinatura" : c.semCaso ? "Não tem caso" : "Sem caso ainda");
  const viva = passo?.item?.id;
  return (
    <FolhaAba titulo="Contratos" sub={sub}>
      <table className="so-pc cl-tab fl-tab">
        <caption className="sr">Contratos de {f.nome}</caption>
        <colgroup>
          <col style={{ width: "21%" }} />
          <col style={{ width: "18%" }} />
          <col style={{ width: "21%" }} />
          <col style={{ width: "20%" }} />
          <col style={{ width: "20%" }} />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">Contrato</th>
            <th scope="col">Situação</th>
            <th scope="col">Honorários</th>
            <th scope="col">Recebimentos</th>
            <th scope="col">Caso</th>
          </tr>
        </thead>
        <tbody>
          {lista.map((c) => {
            const prox = textoProximo(c);
            return (
              <tr key={c.id} className={c.id === viva ? "fl-vivo" : c.situacao === "ENCERRADO" ? "fl-off" : undefined}>
                <td>
                  <div className="fl-num">
                    <a href={ROTAS_PASSO.contrato(c.id)}>{c.numero}</a>
                    <small>{c.objeto}{c.proposta ? <> · veio da <span className="fl-cod">{c.proposta.numero}</span></> : null}</small>
                  </div>
                </td>
                <td>
                  <div className="fl-et">
                    {situacao(c)}
                    <small>{sitSub(c)}</small>
                  </div>
                </td>
                <td><b>{valorDaProposta(c.condicoes)}</b></td>
                <td>
                  {prox ? (
                    <a className="fl-ir" href={ROTAS_PASSO.recebimentos(c.id)} aria-label={`Recebimentos do ${c.numero}: ${prox.linha}`}>
                      <span className="num">{prox.linha}</span>
                    </a>
                  ) : c.situacao === "ELABORACAO" ? <small>A programação nasce na assinatura</small> : <small>Nenhum a vencer</small>}
                  {prox?.sub ? <small>{prox.sub}</small> : null}
                </td>
                <td>
                  {caso(c)}
                  {acao(c, true) ? <div style={{ marginTop: 6 }}>{acao(c, true)}</div> : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <ul className="cartoes so-cel fl-cards" aria-label={`Contratos de ${f.nome}`}>
        {lista.map((c) => (
          <Cartao key={c.id} nome={c.numero} href={ROTAS_PASSO.contrato(c.id)} sub={<>{c.objeto}{c.proposta ? <> · veio da <span className="fl-cod">{c.proposta.numero}</span></> : null}</>}
            dados={[["Honorários", valorDaProposta(c.condicoes)], ["Caso", casoTexto(c)]]} selos={situacao(c)} acao={acao(c)} />
        ))}
      </ul>
      <div className="fl-pe">
        <span><b>{contar(lista.length, "contrato", "contratos")}</b>. Baixar o documento, mudar condições e encerrar ficam na ficha do contrato.</span>
      </div>
    </FolhaAba>
  );
}

function AbaCasos({ lista, f, passo, aoJanela }: { lista: CasoDoCliente[]; f: FichaCliente; passo: PassoCliente | undefined; aoJanela: (j: JanelaLigada) => void }) {
  const primeiro = primeiroNome(f.nome);
  const sub = `Os casos e processos em que ${primeiro} é cliente. Um processo pode ter mais de um cliente.`;
  if (!lista.length) {
    const semCaso = passo?.tipo === "CONTRATO_SEM_CASO" && passo.pode && passo.item?.id ? { ...passo.item, id: passo.item.id } : null;
    return (
      <FolhaAba titulo="Casos" sub={sub}>
        <Estado icone="balanca" titulo="Nenhum caso ainda"
          acoes={semCaso && f.situacao === "ATIVO" ? (
            <>
              <button data-muda className="btn btn-pri" type="button" onClick={() => aoJanela({ tipo: "caso", contrato: semCaso.id })}>
                <Icone nome="balanca" className="ico" />
                Abrir o caso
              </button>
              <button data-muda className="btn btn-sec" type="button" onClick={() => aoJanela({ tipo: "caso", contrato: semCaso.id, modo: "JUNTAR" })}>
                <Icone nome="ramo" className="ico" />
                Juntar a um caso que já existe
              </button>
            </>
          ) : null}>
          {semCaso
            ? `O contrato ${semCaso.numero} foi assinado${semCaso.assinadoEm ? ` em ${dia(semCaso.assinadoEm)}` : ""} e ainda não tem caso. Abra o caso agora: nome, área e responsável vêm do contrato.`
            : "O caso abre em Jurídico quando a assinatura do contrato for registrada, já com os dados do contrato."}
        </Estado>
      </FolhaAba>
    );
  }
  const andamento = lista.filter((c) => c.situacao === "ANDAMENTO").length;
  const papel = (c: CasoDoCliente) => (c.outrosClientes ? `com mais ${contar(c.outrosClientes, "cliente", "clientes")}` : "Único cliente do caso");
  const area = (c: CasoDoCliente) => `${c.numero ?? "Sem número ainda"} · ${AREAS_DIREITO[c.area as AreaDireito] ?? c.area}`;
  return (
    <FolhaAba titulo="Casos" sub={sub}>
      <table className="so-pc cl-tab fl-tab">
        <caption className="sr">Casos de {f.nome}</caption>
        <colgroup>
          <col style={{ width: "27%" }} />
          <col style={{ width: "20%" }} />
          <col style={{ width: "17%" }} />
          <col style={{ width: "18%" }} />
          <col style={{ width: "18%" }} />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">Caso</th>
            <th scope="col">Etapa</th>
            <th scope="col">{primeiro} no caso</th>
            <th scope="col">Responsável</th>
            <th scope="col">Próximo prazo</th>
          </tr>
        </thead>
        <tbody>
          {lista.map((c) => (
            <tr key={c.id} className={c.situacao === "ENCERRADO" ? "fl-off" : undefined}>
              <td>
                <div className="fl-num">
                  <a href={ROTAS_PASSO.caso(c.id)}>{c.nome}</a>
                  <small>{area(c)}</small>
                </div>
              </td>
              <td>
                <div className="fl-et">
                  <b>{c.etapa.nome}</b>
                  <span className="jr-trilha" aria-hidden="true">
                    {Array.from({ length: c.etapas }, (_, i) => <i key={i} className={i + 1 < c.etapa.ordem ? "feita" : i + 1 === c.etapa.ordem ? "atual" : undefined} />)}
                  </span>
                  <small>{c.etapa.ordem} de {c.etapas} · desde {dia(c.etapaDesde)}</small>
                </div>
              </td>
              <td>
                <b>{nomePapel(c.papel)}</b>
                <small>{papel(c)}</small>
              </td>
              <td>
                <span className="jr-resp"><span className="av-p" aria-hidden="true">{iniciais(c.responsavel.nome)}</span>{c.responsavel.nome}</span>
              </td>
              <td>
                {c.proximoPrazo ? (
                  <>
                    <b className="num">{dia(c.proximoPrazo.data)}</b>
                    <small>{c.proximoPrazo.descricao}</small>
                  </>
                ) : <span className="cl-sem">Nenhum prazo aberto</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="cartoes so-cel fl-cards" aria-label={`Casos de ${f.nome}`}>
        {lista.map((c) => (
          <Cartao key={c.id} nome={c.nome} href={ROTAS_PASSO.caso(c.id)} sub={area(c)}
            dados={[["Etapa", `${c.etapa.nome} · ${c.etapa.ordem} de ${c.etapas}`], ["Papel", nomePapel(c.papel)], ["Responsável", c.responsavel.nome]]} />
        ))}
      </ul>
      <div className="fl-pe">
        <span><b>{contar(lista.length, "caso", "casos")}</b>{andamento === lista.length ? " em andamento" : `, ${andamento} em andamento`}. Prazos, tarefas e documentos ficam na ficha do caso.</span>
      </div>
    </FolhaAba>
  );
}

// ------------------------------------------------------------------------- "No escritório"

/** No lugar do quadro "Contratos e casos" da aba Ficha (decisões 12 e 23). */
export function NoEscritorio({ f }: { f: FichaCliente }) {
  const id = useId();
  const n = f.noEscritorio ?? {};
  const c = f.contagens ?? {};
  const primeiro = primeiroNome(f.nome);
  if (c.propostas === undefined && c.contratos === undefined && c.casos === undefined) return null;
  const linha = (icone: "maleta" | "pena" | "balanca", rotulo: string, texto: string, aba: AbaLigada, nomeAba: string) => (
    <li key={aba}>
      <Icone nome={icone} className="ico" />
      <span>
        <b>{rotulo}</b>
        <small>{texto}</small>
      </span>
      <a href={ROTAS_PASSO.aba(f.id, aba)} aria-label={`Ver a aba ${nomeAba}`}>Ver</a>
    </li>
  );
  const itens: ReactNode[] = [];
  if (c.propostas !== undefined) {
    itens.push(linha("maleta", "Proposta", n.proposta ? `${n.proposta.numero} · ${nomeSituacaoProposta(n.proposta.situacao)} · ${n.proposta.servico}` : "Nenhuma ainda", "propostas", "Propostas"));
  }
  if (c.contratos !== undefined) {
    itens.push(linha("pena", "Contrato", n.contrato
      ? `${n.contrato.numero} · ${nomeSituacaoContrato(n.contrato.situacao as ContratoDoCliente["situacao"]).toLowerCase()}${n.contrato.assinadoEm ? `, assinado em ${dia(n.contrato.assinadoEm)}` : ""} · ${n.contrato.objeto}`
      : "Nenhum ainda", "contratos", "Contratos"));
  }
  if (c.casos !== undefined) {
    itens.push(linha("balanca", "Caso", n.caso ? `${n.caso.nome}${n.caso.etapa ? ` · ${n.caso.etapa}` : ""}` : "Nenhum ainda", "casos", "Casos"));
  }
  return (
    <section className="folha" aria-labelledby={id}>
      <div className="folha-cab" style={{ paddingBottom: 8 }}>
        <div>
          <h2 id={id} style={{ fontSize: 20 }}>No escritório</h2>
          <p className="sub">O que {primeiro} tem aqui. Cada linha abre a aba.</p>
        </div>
      </div>
      <ul className="fl-resumo">{itens}</ul>
    </section>
  );
}

const SITUACOES_P: Record<string, string> = { RASCUNHO: "rascunho", ENVIADA: "enviada", NEGOCIACAO: "em negociação", ACEITA: "aceita", RECUSADA: "recusada" };
const nomeSituacaoProposta = (s: string) => SITUACOES_P[s] ?? s.toLowerCase();

// ------------------------------------------------------------------------- lista de Clientes

/** A coluna "Próximo passo" da lista (decisão 13): o texto e, só sem proposta, "Gerar proposta". */
export function PassoNaLista({ c }: { c: ClienteLinha }) {
  const p = c.passo;
  if (!p || c.situacao !== "ATIVO") return <span className="cl-sem">—</span>;
  const t = textoPasso(p, c.nome);
  const detalhe = p.tipo === "CASO" && !p.item ? t.detalhe : p.item ? t.detalhe : "";
  return (
    <div className="fl-passo-l">
      <span>
        {t.curto}
        {detalhe ? <small>{detalhe}</small> : null}
      </span>
      {p.tipo === "SEM_PROPOSTA" && p.pode ? (
        <a className="btn btn-sec" href={ROTAS_PASSO.novaProposta(c.id)} aria-label={`Gerar proposta para ${c.nome}`}>
          <Icone nome="maleta" className="ico" />
          Gerar proposta
        </a>
      ) : null}
    </div>
  );
}
