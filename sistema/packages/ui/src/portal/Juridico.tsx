"use client";
// Jurídico do Portal, parte 1 (EX-01, EX-03, EX-07, EX-14, CH-05), desenho aprovado em
// docs/design/aprovadas/portal-juridico (estados casos, casos-vazio, novo-caso, ficha,
// ficha-sem-financeiro, mudar-etapa, mudar-etapa-erro, etapa-mudada e etapa-final): a lista
// com a contagem por etapa, o cadastro com vários clientes (cada um com o próprio contrato), a
// ficha com a etapa no âmbar e a janela de mudar etapa com motivo e a prévia do aviso.
// Prazos, tarefas, documentos, "o que está travando", o resumo financeiro e o editor das etapas
// chegam nas próximas partes; o envio do aviso pelo WhatsApp chega com Conversas.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AREAS_DIREITO, dataBr, formatarCnj, numeroCnjValido, PAPEIS_CASO, reais, RESULTADOS_CASO, textoAvisoEtapa,
  type AreaDireito, type ClienteLinha, type DocumentoFaltando, type Etapa, type FichaCaso, type ListaCasos, type ListaClientes, type OpcoesCaso,
  type PapelCaso, type ResultadoCaso, type SituacaoCaso, percentual,
} from "@t3jus/domain";
import { textoDoErro, type ErroApi } from "../api.ts";
import { Icone } from "../Icone.tsx";
import { Aviso, Carregando, descritoPor, ErroAoCarregar, ErroCampo, Estado, faltaAcertar, focarPrimeiroErro, Janela } from "../console/pecas.tsx";
import { iniciais } from "../console/tempo.ts";
import { contar, diaCurto, lerDia } from "./agenda.ts";
import { Busca, CabAmbar, Chips, Selo, useCarga } from "./Comercial.tsx";
import { Toast } from "./FichaCliente.tsx";
import { SeloTipo } from "./Honorarios.tsx";
import { centavos as lerCentavos } from "./honorarios.ts";
import { botaoMudar, diaDaSemanaCurto, fraseAvisoEtapa, juntarNomes, situacaoEnvioEtapa, linhaProcesso, nomePapel, posicaoEtapa, proximaEtapa, ROTAS_JURIDICO, telefoneBr, urgenciaPrazo } from "./juridico.ts";
import { JanelaPrazo, JanelaTarefa, OQueTrava, PrazosETarefas, SeloUrgencia } from "./JuridicoPrazos.tsx";
import { DocumentosDoCaso, JanelaEnviarDocumento, JanelaJaChegou, JanelaPedirDeNovo, JanelaPedirDocumento } from "./JuridicoDocumentos.tsx";
import { chamarPortal, irPara, ROTAS_PORTAL, type EscritorioPortal } from "./Moldura.tsx";
import { MolduraArea } from "./MolduraArea.tsx";
import { PeticoesDoCaso } from "./Peticoes.tsx";
import { AvisoSemCasoJuridico } from "./SemCaso.tsx";
import { FolhaAcertoCaso, hrefDoAcerto, textoAcertoNoCaso } from "./AcertoCaso.tsx";

type Pessoa = { id: string; nome: string };
type Feito = { titulo: string; texto: string };

const fuso = { timeZone: "America/Sao_Paulo" } as const;
const diaDoInstante = (em: string) => new Intl.DateTimeFormat("en-CA", { ...fuso, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(em));
const centavosBr = (v: number | null | undefined) => (v ? (v / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "");

/** A trilha de etapas: as já feitas em vinho, a atual em âmbar, as que faltam vazias. */
function Trilha({ ordem, total, grande = false }: { ordem: number; total: number; grande?: boolean }) {
  return (
    <span className={grande ? "jr-trilha jr-trilha-g" : "jr-trilha"} aria-hidden="true">
      {Array.from({ length: total }, (_, i) => <i key={i} className={i + 1 < ordem ? "feita" : i + 1 === ordem ? "atual" : undefined} />)}
    </span>
  );
}

function usePessoas(): Pessoa[] | null {
  const [p, setP] = useState<Pessoa[] | null>(null);
  useEffect(() => {
    void chamarPortal<{ pessoas: Pessoa[] }>("/v1/escritorio/pessoas").then((x) => setP(x.ok ? x.dados.pessoas : []));
  }, []);
  return p;
}

// ------------------------------------------------------------------------- Lista

function CabCasos({ souDono = false }: { souDono?: boolean }) {
  return (
    <CabAmbar sobre="Jurídico" titulo="Casos e processos"
      lede="Cada caso com os clientes, a etapa, os prazos e o que falta. A lista mostra o número, o cliente e a etapa sem precisar abrir."
      acao={
        <div className="jr-cab-acoes">
          {souDono ? (
            <a className="btn btn-sec" href={ROTAS_JURIDICO.etapas}>
              <Icone nome="ajustes" className="ico" />
              Etapas do escritório
            </a>
          ) : null}
          <a data-muda className="btn btn-escuro" href={ROTAS_JURIDICO.novo}>
            <Icone nome="mais" className="ico" />
            Novo caso
          </a>
        </div>
      } />
  );
}

function CasosConteudo() {
  const [situacao, setSituacao] = useState<SituacaoCaso>("ANDAMENTO");
  const [busca, setBusca] = useState("");
  const [q, setQ] = useState("");
  const [resp, setResp] = useState("");
  const [etapa, setEtapa] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQ(busca.trim()), 250);
    return () => clearTimeout(t);
  }, [busca]);
  const filtros = new URLSearchParams({ situacao });
  if (q) filtros.set("q", q);
  if (resp) filtros.set("responsavel", resp);
  if (etapa) filtros.set("etapa", etapa);
  const { dados, recarregar } = useCarga<ListaCasos>(`/v1/escritorio/juridico/casos?${filtros}`);

  if (dados === "erro") return <><CabCasos /><ErroAoCarregar oque="os casos" aoTentar={recarregar} /></>;
  if (!dados) return <><CabCasos /><Carregando rotulo="Carregando os casos…" linhas={4} /></>;
  const t = dados.totais;
  if (!t.andamento && !t.encerrados) {
    return (
      <div className="hn">
        <CabCasos souDono={dados.souDono} />
        <section className="folha" aria-labelledby="t-jc" style={{ overflow: "hidden" }}>
          <h2 id="t-jc" className="sr">Lista de casos</h2>
          <AvisoSemCasoJuridico />
          <Estado icone="balanca" titulo="Nenhum caso ainda"
            acoes={
              <>
                <a className="btn btn-sec" href={ROTAS_PORTAL.clientes}><Icone nome="pessoas" className="ico" />Ver clientes</a>
                <a data-muda className="btn btn-pri" href={ROTAS_JURIDICO.novo}><Icone nome="mais" className="ico" />Cadastrar o primeiro caso</a>
              </>
            }>
            Um caso junta os clientes, o processo e a etapa em que está. Ele pode nascer antes da distribuição: o número entra depois.
          </Estado>
        </section>
      </div>
    );
  }
  const andamento = dados.etapas.filter((e) => !e.final);
  const lista = dados.casos;
  const n = lista.length;
  const filtrando = Boolean(q || resp || etapa);
  const resumo = filtrando
    ? <b>{contar(n, "caso encontrado", "casos encontrados")}{q ? <> para “{q}”</> : null}</b>
    : situacao === "ANDAMENTO" ? <><b>{contar(n, "caso em andamento", "casos em andamento")}</b>{t.prazoHoje ? ` · ${t.prazoHoje} com prazo hoje` : ""} · ordenados pelo prazo mais próximo</>
    : <b>{contar(n, "caso encerrado", "casos encerrados")}</b>;
  return (
    <div className="hn">
      <CabCasos souDono={dados.souDono} />
      <section className="folha jr-lista" aria-labelledby="t-jc" style={{ overflow: "hidden" }}>
        <h2 id="t-jc" className="sr">Lista de casos</h2>
        <Busca id="jr-b" rotulo="Buscar por caso, número ou cliente" dica="Caso, número ou cliente" valor={busca} aoMudar={setBusca}>
          <label className="sr" htmlFor="jr-resp">Responsável</label>
          <select className="entrada" id="jr-resp" value={resp} onChange={(e) => setResp(e.target.value)}>
            <option value="">Todos os responsáveis</option>
            {dados.responsaveis.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
          <label className="sr" htmlFor="jr-et">Etapa</label>
          <select className="entrada" id="jr-et" value={etapa} onChange={(e) => setEtapa(e.target.value)}>
            <option value="">Todas as etapas</option>
            {dados.etapas.map((e) => <option key={e.id} value={e.id}>{e.ordem}. {e.nome}</option>)}
          </select>
          <Chips rotulo="Mostrar" atual={situacao} aoEscolher={(v) => setSituacao(v as SituacaoCaso)}
            opcoes={[{ v: "ANDAMENTO", t: `Em andamento (${t.andamento})` }, { v: "ENCERRADO", t: `Encerrados (${t.encerrados})` }]} />
        </Busca>
        {situacao === "ANDAMENTO" ? <AvisoSemCasoJuridico /> : null}
        {situacao === "ANDAMENTO" ? (
          <div className="jr-onde">
            <h3 className="sobretitulo">Onde estão os {contar(t.andamento, "caso", "casos")} em andamento</h3>
            <ul>
              {andamento.map((e) => (
                <li key={e.id}>
                  <button type="button" aria-pressed={etapa === e.id} onClick={() => setEtapa(etapa === e.id ? "" : e.id)}>
                    <b className="num">{e.casos}</b>
                    <span>{e.nome}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className="hn-cont" role="status">{resumo}</p>
        {n ? (
          <table className="hn-tab jr-tab">
            <caption className="sr">Casos</caption>
            <colgroup>{(situacao === "ANDAMENTO" ? ["27%", "16%", "15%", "15%", "14%", "13%"] : ["36%", "22%", "22%", "20%"]).map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
            <thead><tr>{["Caso e processo", "Cliente", situacao === "ANDAMENTO" ? "Etapa" : "Resultado", "Responsável", ...(situacao === "ANDAMENTO" ? ["Próximo prazo", "Pendências"] : [])].map((x) => <th key={x} scope="col">{x}</th>)}</tr></thead>
            <tbody>
              {lista.map((c) => (
                <tr key={c.id} className={c.proximoPrazo?.data && c.proximoPrazo.data <= dados.hoje ? "jr-hoje" : undefined}>
                  <td>
                    <div className="esc">
                      <div>
                        <a className="jr-nome" href={ROTAS_JURIDICO.caso(c.id)}>{c.nome}</a>
                        <small>{linhaProcesso(c)}</small>
                      </div>
                    </div>
                  </td>
                  <td data-r="Cliente">
                    <div>
                      <b className="jr-cli">{c.cliente?.nome ?? "—"}</b>
                      {c.outrosClientes ? <small>e mais {contar(c.outrosClientes, "cliente", "clientes")}</small> : null}
                      {c.semContrato ? <small className="jr-sem">sem contrato</small> : null}
                    </div>
                  </td>
                  <td data-r={situacao === "ANDAMENTO" ? "Etapa" : "Resultado"}>
                    {c.situacao === "ENCERRADO" && c.resultado ? (
                      <Selo tom={c.resultado === "PERDA" ? "neutro" : "ativo"}>{RESULTADOS_CASO[c.resultado]}</Selo>
                    ) : (
                      <div className="jr-etapa">
                        <b>{c.etapa.nome}</b>
                        <Trilha ordem={c.etapa.ordem} total={dados.etapas.length} />
                        <small>{posicaoEtapa(c.etapa.ordem, dados.etapas)}</small>
                      </div>
                    )}
                  </td>
                  <td data-r="Responsável">
                    <span className="jr-resp"><span className="av-p" aria-hidden="true">{iniciais(c.responsavel.nome)}</span>{c.responsavel.nome}</span>
                  </td>
                  {situacao === "ANDAMENTO" ? (
                    <>
                      <td data-r="Próximo prazo">
                        {c.proximoPrazo ? <ProximoPrazo data={c.proximoPrazo.data} hoje={dados.hoje} oque={c.proximoPrazo.descricao} /> : <span className="hn-sem">Nenhum aberto</span>}
                      </td>
                      <td data-r="Pendências">
                        {c.pendencias ? <span className="jr-pend"><Icone nome="alerta" className="ico ico-s" />{contar(c.pendencias, "pendência", "pendências")}</span> : <span className="hn-sem">Nenhuma</span>}
                      </td>
                    </>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Estado icone="busca" titulo={filtrando ? "Nenhum caso encontrado" : "Nenhum caso aqui"}>
            {filtrando ? "Confira o nome do caso, o número ou o cliente, ou limpe os filtros." : situacao === "ENCERRADO" ? "Os casos encerrados aparecem aqui, com o resultado." : "Quando houver, eles aparecem nesta lista."}
          </Estado>
        )}
        <p className="hn-pe">
          <Icone nome="historico" className="ico" />
          <span>Caso não se apaga. O encerrado fica guardado com o resultado, e cada mudança de etapa fica no histórico com o motivo.</span>
        </p>
      </section>
    </div>
  );
}

/** O próximo prazo na lista: o selo até "Em 3 dias"; mais longe, a data e o dia da semana. */
function ProximoPrazo({ data, hoje, oque }: { data: string; hoje: string; oque: string }) {
  const u = urgenciaPrazo(data, hoje);
  const longe = u.tom === "neutro" && Number(u.texto.split(" ")[1]) > 3;
  return (
    <div className="jr-prox">
      {longe ? <span className="jr-data">{diaDaSemanaCurto(data)}</span> : <SeloUrgencia u={u} />}
      <small>{longe ? oque : `${data.slice(8, 10)}/${data.slice(5, 7)} · ${oque}`}</small>
    </div>
  );
}

export function CasosJuridicoPortal() {
  return <MolduraArea area="JURIDICO" secao="casos">{() => <CasosConteudo />}</MolduraArea>;
}

// ------------------------------------------------------------------------- Novo caso

interface LinhaCliente { chave: number; clienteId: string; papel: PapelCaso; contratoId: string }
interface DadosForm {
  nome: string; area: string; parteContraria: string; numero: string; sistema: string; tribunal: string; vara: string;
  valorCausa: string; distribuidoEm: string; responsavelId: string; avisarCliente: boolean;
}

const MSG: Record<string, string> = {
  nome: "Escreva o nome do caso, de 3 a 120 letras. Ex.: Souza x Clínica Bem Viver.",
  area: "Escolha a área.",
  parteContraria: "Escreva o nome da parte contrária, de 2 a 160 letras, ou deixe em branco.",
  clientes: "Escolha ao menos um cliente, cada um uma vez, com o papel. O contrato precisa ser do mesmo cliente.",
  numero: "Confira o número: são 20 dígitos no formato do CNJ, e os dígitos verificadores não bateram.",
  tribunal: "Escreva o tribunal com até 60 letras, ou deixe em branco.",
  vara: "Escreva a vara ou órgão com até 120 letras, ou deixe em branco.",
  sistema: "Escreva o sistema com até 40 letras, ou deixe em branco.",
  valorCausa: "Escreva o valor em reais. Ex.: 86.400,00.",
  distribuidoEm: "Escreva uma data de hoje ou antes, no formato dd/mm/aaaa.",
  etapaId: "Escolha a etapa em que o caso começa.",
  responsavelId: "Escolha quem cuida do caso.",
};
const ROTULO: Record<string, string> = {
  nome: "Nome do caso", area: "Área", parteContraria: "Parte contrária", clientes: "Clientes do caso", numero: "Número do processo",
  tribunal: "Tribunal", vara: "Vara ou órgão", sistema: "Sistema", valorCausa: "Valor da causa", distribuidoEm: "Distribuído em",
  etapaId: "Etapa", responsavelId: "Responsável",
};
const ID: Record<string, string> = {
  nome: "nc-nome", area: "nc-area", parteContraria: "nc-parte", clientes: "nc-cli-1", numero: "nc-num", tribunal: "nc-trib", vara: "nc-vara",
  sistema: "nc-sis", valorCausa: "nc-valor", distribuidoEm: "nc-dist", etapaId: "nc-etapa", responsavelId: "nc-resp",
};

/** Confere na tela o que dá para conferir antes de ir ao servidor. */
function errosDosDados(d: DadosForm): string[] {
  const e: string[] = [];
  if (d.nome.trim().length < 3) e.push("nome");
  if (!d.area) e.push("area");
  if (d.numero.trim() && !numeroCnjValido(d.numero)) e.push("numero");
  if (d.valorCausa.trim() && !lerCentavos(d.valorCausa)) e.push("valorCausa");
  if (d.distribuidoEm.trim() && !lerDia(d.distribuidoEm)) e.push("distribuidoEm");
  if (!d.responsavelId) e.push("responsavelId");
  return e;
}

function corpoDosDados(d: DadosForm) {
  return {
    nome: d.nome.trim(), area: d.area || null, parteContraria: d.parteContraria.trim() || null, numero: d.numero.trim() || null,
    sistema: d.sistema.trim() || null, tribunal: d.tribunal.trim() || null, vara: d.vara.trim() || null,
    valorCausa: d.valorCausa.trim() ? lerCentavos(d.valorCausa) : null, distribuidoEm: d.distribuidoEm.trim() ? lerDia(d.distribuidoEm) : null,
    responsavelId: d.responsavelId || null, avisarCliente: d.avisarCliente,
  };
}

/** Os campos do processo, iguais no cadastro e em Editar. */
function CamposProcesso({ p, d, mudar, tem }: { p: string; d: DadosForm; mudar: (x: Partial<DadosForm>) => void; tem: (c: string) => boolean }) {
  const campo = (c: "numero" | "sistema" | "tribunal" | "vara" | "valorCausa" | "distribuidoEm", id: string, rot: string, cls: string, o: { ajuda?: string; dica?: string; modo?: "numeric" | "decimal" } = {}) => (
    <div className={`campo ${cls}`}>
      <label htmlFor={`${p}-${id}`}>{rot}<span className="opcional"> (opcional)</span></label>
      {c === "valorCausa" ? (
        <span className="hn-afixo hn-antes">
          <span aria-hidden="true">R$</span>
          <input className="entrada" id={`${p}-${id}`} type="text" inputMode="decimal" autoComplete="off" value={d[c]} onChange={(e) => mudar({ [c]: e.target.value })}
            aria-invalid={tem(c) || undefined} aria-describedby={descritoPor(o.ajuda && `${p}-${id}-aj`, tem(c) && `${p}-${id}-er`)} />
        </span>
      ) : (
        <input className="entrada" id={`${p}-${id}`} type="text" inputMode={o.modo} autoComplete="off" placeholder={o.dica} value={d[c]} onChange={(e) => mudar({ [c]: e.target.value })}
          aria-invalid={tem(c) || undefined} aria-describedby={descritoPor(o.ajuda && `${p}-${id}-aj`, tem(c) && `${p}-${id}-er`)} />
      )}
      {o.ajuda ? <p className="ajuda" id={`${p}-${id}-aj`}>{o.ajuda}</p> : null}
      {tem(c) ? <ErroCampo id={`${p}-${id}-er`}>{MSG[c]}</ErroCampo> : null}
    </div>
  );
  return (
    <>
      {campo("numero", "num", "Número do processo", "c3", { ajuda: "No formato do CNJ. Conferimos os dígitos.", dica: "0000000-00.0000.0.00.0000", modo: "numeric" })}
      {campo("sistema", "sis", "Sistema", "c3", { ajuda: "Onde a equipe acompanha o processo. Ex.: PJe-JT, e-SAJ, Eproc." })}
      {campo("tribunal", "trib", "Tribunal", "c2", { dica: "Ex.: TRT-2" })}
      {campo("vara", "vara", "Vara ou órgão", "c2", { dica: "Ex.: 45ª Vara do Trabalho" })}
      {campo("valorCausa", "valor", "Valor da causa", "c2")}
      {campo("distribuidoEm", "dist", "Distribuído em", "c2", { ajuda: "dd/mm/aaaa", modo: "numeric" })}
    </>
  );
}

function NovoCaso({ escritorio }: { escritorio: EscritorioPortal }) {
  const pessoas = usePessoas();
  const [opcoes, setOpcoes] = useState<OpcoesCaso | null | "erro">(null);
  const [clientes, setClientes] = useState<ClienteLinha[] | null>(null);
  const [vez, setVez] = useState(0);
  const [rascunho, setD] = useState<DadosForm>({
    nome: "", area: "", parteContraria: "", numero: "", sistema: "", tribunal: "", vara: "", valorCausa: "", distribuidoEm: "", responsavelId: "", avisarCliente: true,
  });
  const [linhas, setLinhas] = useState<LinhaCliente[]>([{ chave: 1, clienteId: "", papel: "AUTOR", contratoId: "" }]);
  const [etapaId, setEtapaId] = useState("");
  const [erros, setErros] = useState<string[]>([]);
  const [falha, setFalha] = useState<ErroApi | null>(null);
  const [enviando, setEnviando] = useState(false);
  const topo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void chamarPortal<OpcoesCaso>("/v1/escritorio/juridico/opcoes").then((x) => {
      setOpcoes(x.ok ? x.dados : "erro");
      if (x.ok) setEtapaId((v) => v || (x.dados.etapas[0]?.id ?? ""));
    });
    void chamarPortal<ListaClientes>("/v1/escritorio/clientes?situacao=ATIVO").then((x) => setClientes(x.ok ? x.dados.clientes : []));
  }, [vez]);

  // Responsável: quem está cadastrando, até escolher outra pessoa.
  const eu = pessoas?.find((p) => p.nome === escritorio.pessoa)?.id ?? "";
  const d = { ...rascunho, responsavelId: rascunho.responsavelId || eu };
  if (opcoes === "erro") return <ErroAoCarregar oque="as etapas do escritório" aoTentar={() => setVez((v) => v + 1)} />;
  if (!opcoes) return <Carregando rotulo="Carregando…" linhas={4} />;
  const op = opcoes;
  const tem = (c: string) => erros.includes(c);
  const mudar = (x: Partial<DadosForm>) => setD((v) => ({ ...v, ...x }));
  const mudarLinha = (chave: number, x: Partial<LinhaCliente>) => setLinhas((l) => l.map((y) => (y.chave === chave ? { ...y, ...x } : y)));
  const nomeCliente = (id: string) => clientes?.find((c) => c.id === id)?.nome ?? "";
  const semContrato = linhas.filter((l) => l.clienteId && !l.contratoId);

  async function salvar() {
    setFalha(null);
    const e = errosDosDados(d);
    if (!linhas.some((l) => l.clienteId) || new Set(linhas.filter((l) => l.clienteId).map((l) => l.clienteId)).size !== linhas.filter((l) => l.clienteId).length) e.push("clientes");
    if (!etapaId) e.push("etapaId");
    if (e.length) {
      setErros(e);
      requestAnimationFrame(() => topo.current?.querySelector<HTMLElement>("a[data-primeiro]")?.focus());
      return;
    }
    setEnviando(true);
    const x = await chamarPortal<{ id: string }>("/v1/escritorio/juridico/casos", {
      metodo: "POST",
      corpo: {
        ...corpoDosDados(d), etapaId,
        clientes: linhas.filter((l) => l.clienteId).map((l) => ({ clienteId: l.clienteId, papel: l.papel, contratoId: l.contratoId || null })),
      },
    });
    setEnviando(false);
    if (x.ok) return irPara(`${ROTAS_JURIDICO.caso(x.dados.id)}?criado=1`);
    const campos = x.erro.detalhes?.campos;
    if (x.erro.codigo === "VALIDATION_ERROR" && Array.isArray(campos) && campos.length && !x.erro.detalhes?.motivo) {
      setErros(campos.map(String));
      requestAnimationFrame(() => topo.current?.querySelector<HTMLElement>("a[data-primeiro]")?.focus());
      return;
    }
    setErros(Array.isArray(campos) ? campos.map(String) : []);
    setFalha(x.erro);
    requestAnimationFrame(() => topo.current?.scrollIntoView({ block: "start" }));
  }

  const pontos = falha ? [] : erros.map((c) => ({ id: ID[c] ?? "nc-nome", texto: `${ROTULO[c] ?? c}: ${MSG[c] ?? "Confira este campo."}` }));
  const iniciais_ = op.etapas.filter((x) => !x.final);
  const ordenadas = pessoas ? [...pessoas.filter((p) => p.nome === escritorio.pessoa), ...pessoas.filter((p) => p.nome !== escritorio.pessoa)] : [];

  return (
    <div className="hn" ref={topo}>
      <div className="pt-cab">
        <div>
          <p className="sobretitulo">Casos e processos</p>
          <h1>Novo caso</h1>
          <span className="fio" aria-hidden="true" />
        </div>
      </div>
      <div className="hn-grade">
        <div className="hn-col">
          <section className="folha" aria-labelledby="t-nc">
            <div className="folha-cab">
              <div>
                <h2 id="t-nc">Dados do caso</h2>
                <p className="sub">Comece pelo que já sabe. O resto se completa na ficha.</p>
              </div>
            </div>
            <form className="form-folha" noValidate onSubmit={(ev) => { ev.preventDefault(); void salvar(); }}>
              {pontos.length ? (
                <div className="c6 hn-resumo-erros">
                  <Aviso tom="urgencia" titulo={faltaAcertar(pontos.length)}
                    acoes={<ul>{pontos.map((p, i) => <li key={`${p.id}-${i}`}><a href={`#${p.id}`} data-primeiro={i === 0 ? "" : undefined}>{p.texto}</a></li>)}</ul>}>
                    O caso ainda não foi cadastrado. Nada do que você escreveu se perdeu.
                  </Aviso>
                </div>
              ) : null}
              {falha ? (
                <div className="c6">
                  <Aviso tom="urgencia" titulo="O caso não foi cadastrado.">{textoDoErro(falha)} O que você escreveu continua aqui.</Aviso>
                </div>
              ) : null}

              <div className="hn-passo hn-primeiro">
                <div><h3>O caso</h3><small>Só o nome, um cliente, a etapa e o responsável são obrigatórios</small></div>
              </div>
              <div className="campo c4">
                <label htmlFor="nc-nome">Nome do caso</label>
                <input className="entrada" id="nc-nome" type="text" autoComplete="off" value={d.nome} onChange={(e) => mudar({ nome: e.target.value })}
                  aria-invalid={tem("nome") || undefined} aria-describedby={descritoPor("nc-nome-aj", tem("nome") && "nc-nome-er")} />
                <p className="ajuda" id="nc-nome-aj">Como a equipe chama o caso. Aparece na lista e nos avisos.</p>
                {tem("nome") ? <ErroCampo id="nc-nome-er">{MSG.nome}</ErroCampo> : null}
              </div>
              <div className="campo c2">
                <label htmlFor="nc-area">Área</label>
                <select className="entrada" id="nc-area" value={d.area} onChange={(e) => mudar({ area: e.target.value })}
                  aria-invalid={tem("area") || undefined} aria-describedby={descritoPor(tem("area") && "nc-area-er")}>
                  <option value="">Escolha</option>
                  {(Object.entries(AREAS_DIREITO) as [AreaDireito, string][]).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                </select>
                {tem("area") ? <ErroCampo id="nc-area-er">{MSG.area}</ErroCampo> : null}
              </div>
              <div className="campo c6">
                <label htmlFor="nc-parte">Parte contrária<span className="opcional"> (opcional)</span></label>
                <input className="entrada" id="nc-parte" type="text" autoComplete="off" value={d.parteContraria} onChange={(e) => mudar({ parteContraria: e.target.value })}
                  aria-invalid={tem("parteContraria") || undefined} aria-describedby={descritoPor("nc-parte-aj", tem("parteContraria") && "nc-parte-er")} />
                <p className="ajuda" id="nc-parte-aj">Vai no aviso ao cliente: “seu processo contra …”.</p>
                {tem("parteContraria") ? <ErroCampo id="nc-parte-er">{MSG.parteContraria}</ErroCampo> : null}
              </div>

              <div className="hn-passo">
                <div><h3>Clientes do caso</h3><small>Um processo pode ter mais de um cliente, cada um com os próprios honorários</small></div>
              </div>
              <div className="c6 jr-clientes">
                {linhas.map((l, i) => {
                  const contratos = op.contratos.filter((c) => c.clienteId === l.clienteId);
                  return (
                    <fieldset className="jr-cli-linha" key={l.chave}>
                      <legend className="sr">Cliente {i + 1}</legend>
                      <div className="campo">
                        <label htmlFor={`nc-cli-${i + 1}`}>Cliente</label>
                        <select className="entrada" id={`nc-cli-${i + 1}`} value={l.clienteId} onChange={(e) => mudarLinha(l.chave, { clienteId: e.target.value, contratoId: "" })}
                          aria-invalid={(tem("clientes") && i === 0) || undefined} aria-describedby={descritoPor(i === 0 && "nc-cli-aj", tem("clientes") && i === 0 && "nc-cli-er")}>
                          <option value="">{clientes === null ? "Carregando os clientes…" : "Escolha o cliente"}</option>
                          {(clientes ?? []).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                        </select>
                        {i === 0 ? <p className="ajuda" id="nc-cli-aj">Da lista de Clientes. Quem ainda não está lá, cadastre em <a href={`${ROTAS_PORTAL.clientes}/novo`}>Novo cliente</a>.</p> : null}
                      </div>
                      <div className="campo">
                        <label htmlFor={`nc-pap-${i + 1}`}>Papel</label>
                        <select className="entrada" id={`nc-pap-${i + 1}`} value={l.papel} onChange={(e) => mudarLinha(l.chave, { papel: e.target.value as PapelCaso })}>
                          {(Object.entries(PAPEIS_CASO) as [PapelCaso, string][]).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                        </select>
                      </div>
                      <div className="campo">
                        <label htmlFor={`nc-ct-${i + 1}`}>Contrato e honorários</label>
                        <select className="entrada" id={`nc-ct-${i + 1}`} value={l.contratoId} onChange={(e) => mudarLinha(l.chave, { contratoId: e.target.value })} disabled={!l.clienteId}>
                          <option value="">{l.clienteId && !contratos.length ? "Ainda sem contrato" : "Sem contrato"}</option>
                          {contratos.map((c) => <option key={c.id} value={c.id}>{c.numero}{c.situacao === "ELABORACAO" ? " (em elaboração)" : ""}</option>)}
                        </select>
                      </div>
                      {linhas.length > 1 ? (
                        <button className="btn btn-icone jr-tirar" type="button" onClick={() => setLinhas((x) => x.filter((y) => y.chave !== l.chave))}>
                          <Icone nome="xis" className="ico" />
                          <span className="sr">Tirar o cliente {i + 1}</span>
                        </button>
                      ) : null}
                    </fieldset>
                  );
                })}
                {tem("clientes") ? <ErroCampo id="nc-cli-er">{MSG.clientes}</ErroCampo> : null}
                {semContrato.length ? (
                  <Aviso tom="atencao" titulo={semContrato.length === 1 ? `${nomeCliente(semContrato[0]!.clienteId).split(/\s+/)[0]} ainda não tem contrato de honorários ligado.` : `${juntarNomes(semContrato.map((l) => nomeCliente(l.clienteId).split(/\s+/)[0]!))} ainda não têm contrato ligado.`}>
                    Dá para cadastrar o caso assim. Ele fica marcado “sem contrato” até a área Contratos ligar um.
                  </Aviso>
                ) : null}
                {linhas.length < 20 ? (
                  <button className="btn btn-fantasma" type="button" style={{ justifySelf: "start" }}
                    onClick={() => setLinhas((l) => [...l, { chave: Math.max(...l.map((y) => y.chave)) + 1, clienteId: "", papel: "AUTOR", contratoId: "" }])}>
                    <Icone nome="mais" className="ico" />
                    Adicionar outro cliente
                  </button>
                ) : null}
              </div>

              <div className="hn-passo">
                <div><h3>Processo</h3><small>Pode ficar para depois da distribuição</small></div>
              </div>
              <CamposProcesso p="nc" d={d} mudar={mudar} tem={tem} />

              <div className="hn-passo">
                <div><h3>Andamento</h3><small>Quem cuida e onde o caso começa</small></div>
              </div>
              <div className="campo c3">
                <label htmlFor="nc-etapa">Etapa</label>
                <select className="entrada" id="nc-etapa" value={etapaId} onChange={(e) => setEtapaId(e.target.value)}
                  aria-invalid={tem("etapaId") || undefined} aria-describedby={descritoPor("nc-etapa-aj", tem("etapaId") && "nc-etapa-er")}>
                  {iniciais_.map((x) => <option key={x.id} value={x.id}>{x.ordem}. {x.nome}</option>)}
                </select>
                <p className="ajuda" id="nc-etapa-aj">As etapas do escritório.</p>
                {tem("etapaId") ? <ErroCampo id="nc-etapa-er">{MSG.etapaId}</ErroCampo> : null}
              </div>
              <div className="campo c3">
                <label htmlFor="nc-resp">Responsável</label>
                <select className="entrada" id="nc-resp" value={d.responsavelId} onChange={(e) => mudar({ responsavelId: e.target.value })}
                  aria-invalid={tem("responsavelId") || undefined} aria-describedby={descritoPor("nc-resp-aj", tem("responsavelId") && "nc-resp-er")}>
                  <option value="">{pessoas === null ? "Carregando…" : "Escolha"}</option>
                  {ordenadas.map((p) => <option key={p.id} value={p.id}>{p.nome === escritorio.pessoa ? `${p.nome} (você)` : p.nome}</option>)}
                </select>
                <p className="ajuda" id="nc-resp-aj">Quem cuida do caso. Se sair da equipe, o caso passa para outra pessoa.</p>
                {tem("responsavelId") ? <ErroCampo id="nc-resp-er">{MSG.responsavelId}</ErroCampo> : null}
              </div>
              <label className="opcao c6">
                <input className="marcar" type="checkbox" checked={d.avisarCliente} onChange={(e) => mudar({ avisarCliente: e.target.checked })} />
                <span>
                  Avisar os clientes pelo WhatsApp quando o caso mudar de etapa
                  <small>Com o texto simples de cada etapa. Antes de enviar, sempre aparece a prévia.</small>
                </span>
              </label>

              <div className="form-pe">
                <span className="esq-pe">Os campos sem “(opcional)” são obrigatórios. O cadastro fica no histórico do caso, com seu nome e a hora.</span>
                <a className="btn btn-fantasma" href={ROTAS_JURIDICO.casos}>Cancelar</a>
                <button className="btn btn-pri" type="submit" disabled={enviando} aria-busy={enviando || undefined}>
                  <Icone nome="check" className="ico" />
                  Cadastrar caso
                </button>
              </div>
            </form>
          </section>
        </div>
        <aside className="hn-col so-pc" aria-label="Como funciona">
          <section className="explica campo-ambar" aria-labelledby="t-cf">
            <p className="sobretitulo">Como funciona</p>
            <h2 id="t-cf">Um caso, vários clientes.</h2>
            <ul>
              <li><Icone nome="pessoas" className="ico" /><span>Um processo pode ter mais de um cliente. Cada um tem o próprio contrato e os próprios honorários, e o caso aparece na ficha de cada um.</span></li>
              <li><Icone nome="balanca" className="ico" /><span>A etapa vem da lista do escritório. Mudar de etapa pede um motivo e fica no histórico.</span></li>
              <li><Icone nome="whats" className="ico" /><span>O cliente recebe um aviso simples pelo WhatsApp do escritório a cada etapa. Você vê o texto antes.</span></li>
              <li><Icone nome="relogio" className="ico" /><span>Os prazos são cadastrados pela equipe. O T3jus ainda não lê publicações dos tribunais.</span></li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

export function NovoCasoPortal() {
  return (
    <MolduraArea area="JURIDICO" secao="casos" trilha={[{ nome: "Novo caso" }]} pagina="co-ficha">
      {(e) => <NovoCaso escritorio={e} />}
    </MolduraArea>
  );
}

// ------------------------------------------------------------------------- Ficha

function JanelaEtapa({ f, escritorio, aberta, aoFechar, aoFeito }: {
  f: FichaCaso; escritorio: EscritorioPortal; aberta: boolean; aoFechar: () => void; aoFeito: (r: { encerrado: boolean; para: string; aviso: string | null }) => void;
}) {
  const [etapaId, setEtapaId] = useState("");
  const [motivo, setMotivo] = useState("");
  const [resultado, setResultado] = useState<ResultadoCaso | "">("");
  const [avisar, setAvisar] = useState(f.avisarCliente);
  const [ajustando, setAjustando] = useState(false);
  const [meio, setMeio] = useState("");
  const [valores, setValores] = useState<Record<string, string>>({});
  const [previsto, setPrevisto] = useState("");
  const [faltam, setFaltam] = useState<string[]>([]);
  const [erros, setErros] = useState<string[]>([]);
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const corpo = useRef<HTMLDivElement>(null);
  const para = f.etapas.find((e) => e.id === etapaId) ?? null;
  // Ao encerrar com ganho ou acordo, cada cliente com contrato informa o valor dele (F3.14, EX-08).
  const comValor = Boolean(para?.final) && (resultado === "GANHO" || resultado === "ACORDO");
  const comContrato = f.clientes.filter((c) => c.contrato);
  const exitos = comContrato.flatMap((c) => {
    const k = c.contrato?.condicoes?.find((x) => x.tipo === "EXITO");
    const base = lerCentavos(valores[c.id] ?? "");
    return k && k.tipo === "EXITO" && base ? [{ c, pb: k.percentual, base, exito: Math.round((base * k.percentual) / 10000) }] : [];
  });
  const atual = f.etapas.find((e) => e.id === f.etapa.id);
  const ultima = f.mudancas.find((m) => m.para.ordem === f.etapa.ordem);
  const primeiro = f.clientes[0];
  const nomes = juntarNomes(f.clientes.map((c) => c.nome));
  const texto = ajustando ? meio : para?.textoCliente ?? "";
  const tem = (c: string) => erros.includes(c);

  function escolher(e: Etapa) {
    setEtapaId(e.id);
    if (!ajustando) setMeio(e.textoCliente);
  }

  async function enviar() {
    const e: string[] = [];
    if (!para) e.push("etapaId");
    if (para?.final && !resultado) e.push("resultado");
    if (motivo.trim().length < 3) e.push("motivo");
    if (avisar && ajustando && (meio.trim().length < 10 || meio.trim().length > 240)) e.push("textoAviso");
    const sem = comValor ? comContrato.filter((c) => !lerCentavos(valores[c.id] ?? "")).map((c) => c.id) : [];
    if (sem.length) e.push("valores");
    if (comValor && comContrato.length && !lerDia(previsto)) e.push("previstoEm");
    setFalha(null);
    setFaltam(sem);
    if (e.length) {
      setErros(e);
      return focarPrimeiroErro(corpo.current);
    }
    setEnviando(true);
    const r = await chamarPortal<{ encerrado: boolean; aviso: string | null }>(`/v1/escritorio/juridico/casos/${f.id}/etapa`, {
      metodo: "POST",
      corpo: {
        versao: f.versao, etapaId, motivo: motivo.trim(), avisar, textoAviso: avisar && ajustando ? meio.trim() : null, resultado: para?.final ? resultado : null,
        valores: comValor ? Object.fromEntries(f.clientes.flatMap((c) => { const v = lerCentavos(valores[c.id] ?? ""); return v ? [[c.id, v]] : []; })) : null,
        previstoEm: comValor ? lerDia(previsto) : null,
      },
    });
    setEnviando(false);
    if (r.ok) return aoFeito({ encerrado: r.dados.encerrado, para: para!.nome, aviso: r.dados.aviso });
    const campos = r.erro.detalhes?.campos;
    if (r.erro.codigo === "VALIDATION_ERROR" && Array.isArray(campos) && campos.length) {
      const cl = r.erro.detalhes?.clientes;
      if (Array.isArray(cl)) setFaltam(cl.map(String));
      setErros(campos.map(String));
      return focarPrimeiroErro(corpo.current);
    }
    setFalha(r.erro.codigo === "VERSION_CONFLICT" ? "Outra pessoa mudou este caso enquanto você escrevia. Feche, recarregue a página e mude de novo." : textoDoErro(r.erro));
  }

  return (
    <Janela id="j-etapa" classe="jr-janela" aberta={aberta} aoFechar={aoFechar} sobretitulo={f.nome} titulo={para?.final ? "Encerrar o caso" : "Mudar etapa"} descricao="j-etapa-d"
      aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-pri" type="submit" disabled={enviando} aria-busy={enviando || undefined}>
            <Icone nome={para?.final ? "check" : "seta"} className="ico" />
            {botaoMudar(para?.nome ?? null, Boolean(para?.final), avisar && f.clientes.length > 0)}
          </button>
        </>
      }>
      <div ref={corpo} style={{ display: "grid", gap: 18 }}>
        <p id="j-etapa-d">
          {para?.final
            ? "É a etapa final: o T3jus pede o resultado. Fica no histórico do caso, com seu nome, a hora e o motivo."
            : "A mudança fica no histórico do caso, com seu nome, a hora e o motivo. Dá para voltar depois, também com motivo."}
        </p>
        {erros.length ? <Aviso tom="urgencia" titulo={faltaAcertar(erros.length)}>A etapa ainda não foi mudada. Nada do que você escreveu se perdeu.</Aviso> : null}
        {falha ? <Aviso tom="urgencia" titulo="A etapa não foi mudada.">{falha}</Aviso> : null}
        <p className="jr-agora">
          {para?.final
            ? <>De <b>{f.etapa.ordem}. {f.etapa.nome}</b> para <b>{para.ordem}. {para.nome}</b>, a etapa final.</>
            : <>Agora: <b>{f.etapa.ordem}. {f.etapa.nome}</b>, desde {dataBr(diaDoInstante(f.etapaDesde))}{ultima ? `, por ${ultima.por.nome}` : ""}.</>}
        </p>
        <fieldset className="grupo-opcoes" id="je-etapa" tabIndex={-1} aria-describedby={descritoPor(tem("etapaId") && "je-etapa-er")}>
          <legend>Nova etapa</legend>
          <div className="jr-opcoes">
            {f.etapas.map((e) => {
              const eAtual = e.id === atual?.id;
              return (
                <label key={e.id} className={`jr-op${eAtual ? " jr-op-atual" : ""}${e.id === etapaId ? " jr-op-sel" : ""}`}>
                  <input className="marcar" type="radio" name="je-etapa" value={e.id} disabled={eAtual} checked={e.id === etapaId} onChange={() => escolher(e)} />
                  <span className="jr-op-n" aria-hidden="true">{e.ordem}</span>
                  <span>
                    {e.nome}
                    {eAtual ? <small>Etapa atual</small> : e.final ? <small>Pede o resultado</small> : e.avisaFinanceiro ? <small>Avisa o Financeiro</small> : null}
                  </span>
                </label>
              );
            })}
          </div>
          {tem("etapaId") ? <ErroCampo id="je-etapa-er">Escolha a nova etapa.</ErroCampo> : null}
        </fieldset>
        {para?.final ? (
          <fieldset className="grupo-opcoes" id="je-res" tabIndex={-1} aria-describedby={descritoPor(tem("resultado") && "je-res-er")}>
            <legend>Resultado <span className="opcional">fica no histórico e nos indicadores</span></legend>
            <div className="jr-opcoes jr-opcoes-3">
              {(Object.entries(RESULTADOS_CASO) as [ResultadoCaso, string][]).map(([v, t]) => (
                <label key={v} className={`jr-op${resultado === v ? " jr-op-sel" : ""}`}>
                  <input className="marcar" type="radio" name="je-res" value={v} checked={resultado === v} onChange={() => setResultado(v)} />
                  <span>
                    {t}
                    <small>{v === "GANHO" ? "Decisão a favor do cliente" : v === "PERDA" ? "Decisão contra o cliente" : "As partes fecharam acordo"}</small>
                  </span>
                </label>
              ))}
            </div>
            {tem("resultado") ? <ErroCampo id="je-res-er">Diga como o caso terminou.</ErroCampo> : null}
          </fieldset>
        ) : null}
        {comValor && comContrato.length ? (
          <>
            <div className="fi-sub-par">
              {comContrato.map((c) => {
                const errou = tem("valores") && faltam.includes(c.id);
                return (
                  <div className="campo" key={c.id}>
                    <label htmlFor={`je-v-${c.id}`}>Valor {resultado === "ACORDO" ? "do acordo" : "ganho"} para {c.nome.split(/\s+/)[0]}</label>
                    <input className="entrada" id={`je-v-${c.id}`} inputMode="decimal" value={valores[c.id] ?? ""} placeholder="R$ 0,00"
                      onChange={(e) => setValores({ ...valores, [c.id]: e.target.value })}
                      aria-invalid={errou || undefined} aria-describedby={descritoPor(errou && `je-v-${c.id}-er`)} />
                    {errou ? <ErroCampo id={`je-v-${c.id}-er`}>Diga o valor de {c.nome.split(/\s+/)[0]}, em reais.</ErroCampo> : null}
                  </div>
                );
              })}
            </div>
            <div className="campo">
              <label htmlFor="je-prev">Pagamento previsto</label>
              <input className="entrada" id="je-prev" inputMode="numeric" value={previsto} placeholder="dd/mm/aaaa" onChange={(e) => setPrevisto(e.target.value)}
                aria-invalid={tem("previstoEm") || undefined} aria-describedby={descritoPor("je-prev-aj", tem("previstoEm") && "je-prev-er")} />
              <p className="ajuda" id="je-prev-aj">dd/mm/aaaa. Data em que a outra parte deve pagar.</p>
              {tem("previstoEm") ? <ErroCampo id="je-prev-er">Escreva uma data que exista, como 15/12/2026.</ErroCampo> : null}
            </div>
            {f.veHonorarios && exitos.length ? (
              <div className="jr-exito">
                <p className="jr-exito-t"><Icone nome="moeda" className="ico" />Vai para o Financeiro, para conferir</p>
                <table className="jr-exito-tab">
                  <caption className="sr">O êxito calculado pelo contrato de cada cliente</caption>
                  <thead><tr><th scope="col">Cliente e contrato</th><th scope="col">Êxito</th></tr></thead>
                  <tbody>
                    {exitos.map((x) => (
                      <tr key={x.c.id}><td>{x.c.nome.split(/\s+/)[0]} · {percentual(x.pb)} de {reais(x.base)}</td><td className="num">{reais(x.exito)}</td></tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr><th scope="row">A receber{lerDia(previsto) ? ` em ${dataBr(lerDia(previsto)!)}` : ""}</th><td className="num">{reais(exitos.reduce((a, x) => a + x.exito, 0))}</td></tr>
                  </tfoot>
                </table>
                <p>O caso fica “Encerrado · acerto pendente” até o Financeiro conferir, receber e repassar a {juntarNomes(comContrato.map((c) => c.nome.split(/\s+/)[0] ?? c.nome))}.</p>
              </div>
            ) : (
              <p className="ajuda">O T3jus calcula o êxito pelo contrato de cada cliente e manda ao Financeiro, para conferir antes de cobrar.</p>
            )}
          </>
        ) : null}
        {!para?.final && para?.avisaFinanceiro ? (
          <Aviso tom="info" titulo="O Financeiro ainda não recebe o valor desta etapa sozinho.">
            O valor a receber da etapa vai ao Financeiro numa próxima entrega. Por ora, avise quem cuida do Financeiro.
          </Aviso>
        ) : null}
        <div className="campo">
          <label htmlFor="je-mot">Motivo</label>
          <textarea className="entrada" id="je-mot" rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)}
            aria-invalid={tem("motivo") || undefined} aria-describedby={descritoPor("je-mot-aj", tem("motivo") && "je-mot-er")} />
          <p className="ajuda" id="je-mot-aj">Só para a equipe; o cliente não vê. Ex.: sentença procedente em parte; vamos recorrer.</p>
          {tem("motivo") ? <ErroCampo id="je-mot-er">Escreva o motivo, de 3 a 1.000 letras. Ele fica no histórico do caso.</ErroCampo> : null}
        </div>
        {f.clientes.length ? (
          <div className="jr-aviso">
            <p className="jr-aviso-t">Aviso aos clientes <small>pelo WhatsApp do escritório</small></p>
            <div className="jr-aviso-caixa">
              <label className="opcao">
                <input className="marcar" type="checkbox" checked={avisar} onChange={(e) => setAvisar(e.target.checked)} />
                <span>Avisar {nomes}<small>Cada um recebe o aviso no próprio número, com o primeiro nome.</small></span>
              </label>
              {avisar ? (
                para && primeiro ? (
                  <>
                    <p className="jr-previa-t"><Icone nome="whats" className="ico ico-s" />Prévia do aviso para {primeiro.nome.split(/\s+/)[0]}</p>
                    <p className="jr-previa">{textoAvisoEtapa(primeiro.nome, escritorio.nome, f.nome, texto || "…")}</p>
                    {ajustando ? (
                      <div className="campo">
                        <label htmlFor="je-txt">O meio do aviso, só desta vez</label>
                        <textarea className="entrada" id="je-txt" rows={3} value={meio} onChange={(e) => setMeio(e.target.value)}
                          aria-invalid={tem("textoAviso") || undefined} aria-describedby={descritoPor("je-txt-aj", tem("textoAviso") && "je-txt-er")} />
                        <p className="ajuda" id="je-txt-aj">O começo e o fim são fixos. {meio.trim().length} de 240 letras.</p>
                        {tem("textoAviso") ? <ErroCampo id="je-txt-er">Escreva de 10 a 240 letras.</ErroCampo> : null}
                      </div>
                    ) : (
                      <p className="ajuda">Texto da etapa, definido em Etapas do escritório.{" "}
                        <button className="jr-link" type="button" onClick={() => { setMeio(para.textoCliente); setAjustando(true); }}>Ajustar só desta vez</button>
                      </p>
                    )}
                    <p className="ajuda">{fraseAvisoEtapa(f.avisoEtapa).texto}</p>
                  </>
                ) : <p className="ajuda">Escolha a nova etapa para ver a prévia do aviso.</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </Janela>
  );
}

function dadosDaFicha(f: FichaCaso): DadosForm {
  return {
    nome: f.nome, area: f.area, parteContraria: f.parteContraria ?? "", numero: f.numero ? formatarCnj(f.numero) : "", sistema: f.sistema ?? "",
    tribunal: f.tribunal ?? "", vara: f.vara ?? "", valorCausa: centavosBr(f.valorCausa), distribuidoEm: f.distribuidoEm ? dataBr(f.distribuidoEm) : "",
    responsavelId: f.responsavel.id, avisarCliente: f.avisarCliente,
  };
}

function JanelaEditar({ f, aberta, aoFechar, aoFeito }: { f: FichaCaso; aberta: boolean; aoFechar: () => void; aoFeito: () => void }) {
  const pessoas = usePessoas();
  const [d, setD] = useState<DadosForm>(() => dadosDaFicha(f));
  const [erros, setErros] = useState<string[]>([]);
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const corpo = useRef<HTMLDivElement>(null);
  const tem = (c: string) => erros.includes(c);
  const mudar = (x: Partial<DadosForm>) => setD((v) => ({ ...v, ...x }));

  async function enviar() {
    const e = errosDosDados(d);
    setFalha(null);
    if (e.length) {
      setErros(e);
      return focarPrimeiroErro(corpo.current);
    }
    setEnviando(true);
    const r = await chamarPortal<{ versao: number }>(`/v1/escritorio/juridico/casos/${f.id}`, { metodo: "PUT", corpo: { ...corpoDosDados(d), versao: f.versao } });
    setEnviando(false);
    if (r.ok) return aoFeito();
    const campos = r.erro.detalhes?.campos;
    if (r.erro.codigo === "VALIDATION_ERROR" && Array.isArray(campos) && campos.length && !r.erro.detalhes?.motivo) {
      setErros(campos.map(String));
      return focarPrimeiroErro(corpo.current);
    }
    setFalha(r.erro.codigo === "VERSION_CONFLICT" ? "Outra pessoa mudou este caso enquanto você editava. Feche, recarregue a página e edite de novo." : textoDoErro(r.erro));
  }

  return (
    <Janela id="j-editar" classe="jr-janela" aberta={aberta} aoFechar={aoFechar} sobretitulo={f.nome} titulo="Editar os dados do processo" descricao="j-editar-d"
      aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-pri" type="submit" disabled={enviando} aria-busy={enviando || undefined}>
            <Icone nome="check" className="ico" />
            Salvar
          </button>
        </>
      }>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id="j-editar-d">O que muda fica no histórico do caso, com seu nome e a hora.</p>
        {erros.length ? <Aviso tom="urgencia" titulo={faltaAcertar(erros.length)}>Nada foi salvo ainda.</Aviso> : null}
        {falha ? <Aviso tom="urgencia" titulo="Os dados não foram salvos.">{falha}</Aviso> : null}
        <div className="hn-campos">
          <div className="campo c4">
            <label htmlFor="ed-nome">Nome do caso</label>
            <input className="entrada" id="ed-nome" type="text" autoComplete="off" value={d.nome} onChange={(e) => mudar({ nome: e.target.value })}
              aria-invalid={tem("nome") || undefined} aria-describedby={descritoPor(tem("nome") && "ed-nome-er")} />
            {tem("nome") ? <ErroCampo id="ed-nome-er">{MSG.nome}</ErroCampo> : null}
          </div>
          <div className="campo c2">
            <label htmlFor="ed-area">Área</label>
            <select className="entrada" id="ed-area" value={d.area} onChange={(e) => mudar({ area: e.target.value })}>
              {(Object.entries(AREAS_DIREITO) as [AreaDireito, string][]).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
            </select>
          </div>
          <div className="campo c6">
            <label htmlFor="ed-parte">Parte contrária<span className="opcional"> (opcional)</span></label>
            <input className="entrada" id="ed-parte" type="text" autoComplete="off" value={d.parteContraria} onChange={(e) => mudar({ parteContraria: e.target.value })}
              aria-invalid={tem("parteContraria") || undefined} aria-describedby={descritoPor(tem("parteContraria") && "ed-parte-er")} />
            {tem("parteContraria") ? <ErroCampo id="ed-parte-er">{MSG.parteContraria}</ErroCampo> : null}
          </div>
          <CamposProcesso p="ed" d={d} mudar={mudar} tem={tem} />
          <div className="campo c3">
            <label htmlFor="ed-resp">Responsável</label>
            <select className="entrada" id="ed-resp" value={d.responsavelId} onChange={(e) => mudar({ responsavelId: e.target.value })}
              aria-invalid={tem("responsavelId") || undefined} aria-describedby={descritoPor(tem("responsavelId") && "ed-resp-er")}>
              {pessoas === null ? <option value={f.responsavel.id}>{f.responsavel.nome}</option> : pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            {tem("responsavelId") ? <ErroCampo id="ed-resp-er">{MSG.responsavelId}</ErroCampo> : null}
          </div>
          <label className="opcao c6">
            <input className="marcar" type="checkbox" checked={d.avisarCliente} onChange={(e) => mudar({ avisarCliente: e.target.checked })} />
            <span>Avisar os clientes quando o caso mudar de etapa<small>Vem marcado na janela de mudar etapa.</small></span>
          </label>
        </div>
      </div>
    </Janela>
  );
}

function JanelaCliente({ f, aberta, aoFechar, aoFeito }: { f: FichaCaso; aberta: boolean; aoFechar: () => void; aoFeito: (nome: string) => void }) {
  const [clientes, setClientes] = useState<ClienteLinha[] | null>(null);
  const [opcoes, setOpcoes] = useState<OpcoesCaso | null>(null);
  const [clienteId, setClienteId] = useState("");
  const [papel, setPapel] = useState<PapelCaso>("AUTOR");
  const [contratoId, setContratoId] = useState("");
  const [erro, setErro] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  useEffect(() => {
    if (!aberta) return;
    void chamarPortal<ListaClientes>("/v1/escritorio/clientes?situacao=ATIVO").then((x) => setClientes(x.ok ? x.dados.clientes : []));
    void chamarPortal<OpcoesCaso>("/v1/escritorio/juridico/opcoes").then((x) => setOpcoes(x.ok ? x.dados : { etapas: [], contratos: [] }));
  }, [aberta]);
  const ja = new Set(f.clientes.map((c) => c.id));
  const livres = (clientes ?? []).filter((c) => !ja.has(c.id));
  const contratos = (opcoes?.contratos ?? []).filter((c) => c.clienteId === clienteId);

  async function enviar() {
    setFalha(null);
    if (!clienteId) {
      setErro(true);
      return document.getElementById("ac-cli")?.focus();
    }
    setEnviando(true);
    const r = await chamarPortal<{ id: string }>(`/v1/escritorio/juridico/casos/${f.id}/clientes`, { metodo: "POST", corpo: { clienteId, papel, contratoId: contratoId || null } });
    setEnviando(false);
    if (r.ok) return aoFeito(livres.find((c) => c.id === clienteId)?.nome ?? "");
    setFalha(textoDoErro(r.erro));
  }

  return (
    <Janela id="j-cliente" aberta={aberta} aoFechar={aoFechar} sobretitulo={f.nome} titulo="Adicionar cliente ao caso" descricao="j-cliente-d"
      aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-pri" type="submit" disabled={enviando} aria-busy={enviando || undefined}>
            <Icone nome="mais" className="ico" />
            Adicionar
          </button>
        </>
      }>
      <div style={{ display: "grid", gap: 16 }}>
        <p id="j-cliente-d">Cada cliente tem o próprio contrato e os próprios honorários, e o caso aparece na ficha dele.</p>
        {falha ? <Aviso tom="urgencia" titulo="O cliente não foi adicionado.">{falha}</Aviso> : null}
        <div className="campo">
          <label htmlFor="ac-cli">Cliente</label>
          <select className="entrada" id="ac-cli" value={clienteId} onChange={(e) => { setClienteId(e.target.value); setContratoId(""); setErro(false); }}
            aria-invalid={erro || undefined} aria-describedby={descritoPor(erro && "ac-cli-er")}>
            <option value="">{clientes === null ? "Carregando os clientes…" : "Escolha o cliente"}</option>
            {livres.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          {erro ? <ErroCampo id="ac-cli-er">Escolha o cliente.</ErroCampo> : null}
        </div>
        <div className="hn-campos">
          <div className="campo c3">
            <label htmlFor="ac-pap">Papel</label>
            <select className="entrada" id="ac-pap" value={papel} onChange={(e) => setPapel(e.target.value as PapelCaso)}>
              {(Object.entries(PAPEIS_CASO) as [PapelCaso, string][]).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
            </select>
          </div>
          <div className="campo c3">
            <label htmlFor="ac-ct">Contrato e honorários</label>
            <select className="entrada" id="ac-ct" value={contratoId} onChange={(e) => setContratoId(e.target.value)} disabled={!clienteId}>
              <option value="">Sem contrato</option>
              {contratos.map((c) => <option key={c.id} value={c.id}>{c.numero}</option>)}
            </select>
          </div>
        </div>
      </div>
    </Janela>
  );
}

function Dados({ f, aoEditar }: { f: FichaCaso; aoEditar?: () => void }) {
  const item = (rot: string, v: string | null | undefined) => <div><dt>{rot}</dt><dd>{v || <span className="hn-sem">—</span>}</dd></div>;
  return (
    <section className="folha" aria-labelledby="t-dp" style={{ overflow: "hidden" }}>
      <div className="folha-cab">
        <div>
          <h2 id="t-dp">Dados do processo</h2>
          <p className="sub">O que identifica o caso.</p>
        </div>
        {aoEditar ? (
          <button data-muda className="btn btn-sec" type="button" onClick={aoEditar}>
            <Icone nome="lapis" className="ico" />
            Editar
          </button>
        ) : null}
      </div>
      <dl className="dados-ficha jr-dados">
        {item("Área", AREAS_DIREITO[f.area])}
        {item("Parte contrária", f.parteContraria)}
        {item("Valor da causa", f.valorCausa ? reais(f.valorCausa) : null)}
        {item("Tribunal", f.tribunal)}
        {item("Vara ou órgão", f.vara)}
        {item("Sistema", f.sistema)}
        {item("Distribuído em", f.distribuidoEm ? dataBr(f.distribuidoEm) : null)}
        {item("Responsável", f.responsavel.nome)}
        {item("Número", f.numero ? formatarCnj(f.numero) : "Sem número ainda")}
      </dl>
    </section>
  );
}

function Clientes({ f, aoAdicionar }: { f: FichaCaso; aoAdicionar?: () => void }) {
  return (
    <section className="folha" aria-labelledby="t-cc" style={{ overflow: "hidden" }}>
      <div className="folha-cab">
        <div>
          <h2 id="t-cc">Clientes do caso</h2>
          <p className="sub">{contar(f.clientes.length, "cliente", "clientes")} · cada um com os próprios honorários</p>
        </div>
        {aoAdicionar ? (
          <button data-muda className="btn btn-sec" type="button" onClick={aoAdicionar}>
            <Icone nome="mais" className="ico" />
            Adicionar cliente
          </button>
        ) : null}
      </div>
      <ul className="jr-clis">
        {f.clientes.map((c) => (
          <li key={c.id}>
            <span className="av-p forte" aria-hidden="true">{iniciais(c.nome)}</span>
            <div>
              <a className="jr-nome" href={ROTAS_JURIDICO.cliente(c.id)}>{c.nome}</a>
              <small>{nomePapel(c.papel)}</small>
            </div>
            <span className="jr-tel">{c.telefone ? <><Icone nome="whats" className="ico ico-s" />{telefoneBr(c.telefone)}</> : null}</span>
            <div className="jr-hon">
              {!c.contrato ? <Selo tom="atencao" icone="alerta">sem contrato</Selo>
                : f.veHonorarios && c.contrato.condicoes ? (
                  <>
                    <div className="hn-selos">{c.contrato.condicoes.map((x) => <SeloTipo key={x.tipo} c={x} />)}</div>
                    <small>Contrato {c.contrato.numero}</small>
                  </>
                ) : <small>Contrato {c.contrato.numero}</small>}
            </div>
          </li>
        ))}
      </ul>
      {!f.veHonorarios ? (
        <p className="hn-pe">
          <Icone nome="cadeado" className="ico" />
          <span>Os valores dos honorários aparecem para quem tem a área Contratos ou Financeiro{f.quemTemContratos.length ? ` (${juntarNomes(f.quemTemContratos)})` : ""}.</span>
        </p>
      ) : null}
    </section>
  );
}

function Contratos({ f }: { f: FichaCaso }) {
  const ligados = f.clientes.filter((c) => c.contrato);
  return (
    <section className="folha" aria-labelledby="t-cl">
      <div className="folha-cab" style={{ paddingBottom: 8 }}><div><h2 id="t-cl" style={{ fontSize: 20 }}>Contratos ligados</h2></div></div>
      {ligados.length ? (
        <ul className="jr-contratos">
          {ligados.map((c) => (
            <li key={c.id}>
              <Icone nome="pena" className="ico ico-s" />
              <div>
                {f.veHonorarios ? <a href={ROTAS_JURIDICO.contrato(c.contrato!.id)}>{c.contrato!.numero} · {c.nome}</a> : <b>{c.contrato!.numero} · {c.nome}</b>}
                <small>{c.contrato!.assinadoEm ? `Assinado em ${dataBr(c.contrato!.assinadoEm)}` : "Em elaboração"}</small>
              </div>
            </li>
          ))}
        </ul>
      ) : <p className="hn-pe" style={{ borderTop: 0 }}><Icone nome="pena" className="ico" /><span>Nenhum contrato ligado ainda.</span></p>}
    </section>
  );
}

function AvisoCliente({ f }: { f: FichaCaso }) {
  const ultimo = f.mudancas.find((m) => m.aviso);
  return (
    <section className="folha" aria-labelledby="t-ac">
      <div className="folha-cab" style={{ paddingBottom: 8 }}><div><h2 id="t-ac" style={{ fontSize: 20 }}>Aviso ao cliente</h2></div></div>
      <div className="hn-folha-acao" style={{ paddingTop: 0 }}>
        <p className="jr-ligado"><Icone nome="whats" className="ico ico-s" />{f.avisarCliente ? `Ligado para ${juntarNomes(f.clientes.map((c) => c.nome.split(/\s+/)[0]!))}` : "Desligado neste caso"}</p>
        <p>A cada mudança de etapa, os clientes recebem um aviso simples pelo WhatsApp do escritório. {fraseAvisoEtapa(f.avisoEtapa).texto}</p>
        {ultimo ? (
          ultimo.envios?.some((e) => e.mensagem)
            ? <p>Último aviso: <b>{diaCurto(diaDoInstante(ultimo.em))} · {ultimo.para.nome}</b>, {ultimo.envios.map((e) => `${e.cliente.nome.split(/\s+/)[0]} ${situacaoEnvioEtapa(e)}`).join("; ")}.</p>
            : <p>Último aviso preparado: <b>{diaCurto(diaDoInstante(ultimo.em))} · {ultimo.para.nome}</b>, ainda não enviado.</p>
        ) : null}
      </div>
    </section>
  );
}

function Mudancas({ f }: { f: FichaCaso }) {
  const [aberto, setAberto] = useState<number | null>(null);
  return (
    <section className="folha" aria-labelledby="t-me">
      <div className="folha-cab" style={{ paddingBottom: 8 }}><div><h2 id="t-me" style={{ fontSize: 20 }}>Mudanças de etapa</h2></div></div>
      <ol className="jr-mudancas">
        {f.mudancas.map((m, i) => (
          <li key={i}>
            <time dateTime={m.em}>{diaCurto(diaDoInstante(m.em))}</time>
            <div>
              <p>Para <b>{m.para.nome}</b> · {m.por.nome}</p>
              <p className="jr-motivo">“{m.motivo}”</p>
              {m.resultado ? <Selo tom={m.resultado === "PERDA" ? "neutro" : "ativo"}>{RESULTADOS_CASO[m.resultado]}</Selo> : null}
              {m.aviso ? (
                <>
                  <button className="jr-link" type="button" aria-expanded={aberto === i} onClick={() => setAberto(aberto === i ? null : i)}>
                    {aberto === i ? "Esconder o aviso" : "Ver o aviso preparado"}
                  </button>
                  {aberto === i ? (
                    <>
                      <p className="jr-previa">{m.aviso}</p>
                      {m.envios?.length ? (
                        <ul className="jr-envios">
                          {m.envios.map((e) => (
                            <li key={e.cliente.id}><Icone nome="whats" className="ico ico-s" />{e.cliente.nome}: {situacaoEnvioEtapa(e)}</li>
                          ))}
                        </ul>
                      ) : null}
                      <button className="btn btn-sec btn-compacto" type="button" onClick={() => void navigator.clipboard?.writeText(m.aviso!)}>
                        <Icone nome="copiar" className="ico" />
                        Copiar o texto
                      </button>
                    </>
                  ) : null}
                </>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function FichaCasoConteudo({ id, escritorio, aoNome }: { id: string; escritorio: EscritorioPortal; aoNome: (n: string) => void }) {
  const [f, setF] = useState<FichaCaso | null | "erro" | "nao">(null);
  const [janela, setJanela] = useState<"etapa" | "editar" | "cliente" | "prazo" | "tarefa" | "pedir" | "enviar" | null>(null);
  const [doc, setDoc] = useState<{ d: DocumentoFaltando; acao: "denovo" | "chegou" } | null>(null);
  const [feito, setFeito] = useState<Feito | null>(null);
  const [vez, setVez] = useState(0);

  const carregar = useCallback(async () => {
    const r = await chamarPortal<FichaCaso>(`/v1/escritorio/juridico/casos/${id}`);
    setF(r.ok ? r.dados : r.status === 404 ? "nao" : "erro");
    if (r.ok) aoNome(r.dados.nome);
  }, [id, aoNome]);
  useEffect(() => {
    void Promise.resolve().then(() => carregar());
  }, [carregar, vez]);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    // Da assinatura do contrato (CH-10, F3.111): o caso abriu junto.
    const assinado = q.has("assinado");
    // Da ficha do cliente (F3.111): "Abrir o caso" de um contrato já assinado.
    const aberto = q.has("aberto");
    if (!q.has("criado") && !assinado && !aberto) return;
    q.delete("criado");
    q.delete("assinado");
    q.delete("aberto");
    window.history.replaceState(null, "", `${window.location.pathname}${q.size ? `?${q}` : ""}`);
    void Promise.resolve().then(() => setFeito(aberto
      ? { titulo: "Caso aberto", texto: "O cliente e o contrato estão neste caso. Número, vara e parte contrária entram aqui quando houver." }
      : assinado
      ? { titulo: "Assinatura registrada e caso aberto", texto: "O contrato está ativo e o caso está em Casos e processos, na primeira etapa. Número, vara e parte contrária entram aqui quando houver." }
      : { titulo: "Caso cadastrado", texto: "Ele está na lista de Casos e processos, na etapa escolhida." }));
  }, []);

  if (f === "erro") return <ErroAoCarregar oque="o caso" aoTentar={() => setVez((v) => v + 1)} />;
  if (f === "nao") return <ErroAoCarregar oque="o caso" aoTentar={() => setVez((v) => v + 1)} texto="Ele não existe ou é de outro escritório. Volte para Casos e processos e abra de novo." />;
  if (!f) return <Carregando rotulo="Carregando o caso…" linhas={4} />;
  const ficha = f;
  const andamento = f.situacao === "ANDAMENTO";
  const prox = proximaEtapa(f.etapa.ordem, f.etapas);
  const acertoTxt = andamento ? null : textoAcertoNoCaso(f);
  const verAcerto = andamento ? null : hrefDoAcerto(f.acerto);
  const fechar = () => { setJanela(null); setDoc(null); };
  const pronto = (x: Feito) => { fechar(); setFeito(x); setVez((v) => v + 1); };

  return (
    <div className="hn">
      <div className="ficha-cab">
        <div className="esq campo-vinho">
          <Icone nome="balanca" className="ico estatua" />
          <a className="voltar" href={ROTAS_JURIDICO.casos}>
            <Icone nome="esquerda" className="ico ico-s" />
            Casos e processos
          </a>
          <div className="ident">
            <div>
              <p className="sobretitulo">Caso · {AREAS_DIREITO[f.area]}</p>
              <h1>{f.nome}</h1>
              <p className="meta">
                {acertoTxt ? (
                  <span className="selo selo-atencao"><Icone nome="relogio" className="ico" />{acertoTxt.selo}</span>
                ) : (
                  <span className={`selo selo-${andamento ? "ativo" : "neutro"}`}>{andamento ? "Em andamento" : `Encerrado${f.resultado ? ` · ${RESULTADOS_CASO[f.resultado]}` : ""}`}</span>
                )}
                <span>{f.numero ? formatarCnj(f.numero) : "Sem número ainda"}</span>
                {f.tribunal || f.sistema ? <span>{[f.tribunal, f.sistema].filter(Boolean).join(" · ")}</span> : null}
              </p>
            </div>
          </div>
        </div>
        <section className="dir campo-ambar" aria-labelledby="t-et">
          <p className="sobretitulo" id="t-et">Etapa do caso</p>
          <p className="grande jr-grande"><span className="num">{posicaoEtapa(f.etapa.ordem, f.etapas)}</span> {f.etapa.nome}</p>
          <Trilha ordem={f.etapa.ordem} total={f.etapas.length} grande />
          <p className="hn-oque">
            {andamento
              ? <>Desde {diaCurto(diaDoInstante(f.etapaDesde))}.{prox ? <> Próxima: <b>{prox}</b>.</> : null}</>
              : acertoTxt ? <>{acertoTxt.frase}</>
              : <>Encerrado em {f.encerradoEm ? dataBr(diaDoInstante(f.encerradoEm)) : "—"}.</>}
          </p>
          {/* EX-17, decisão 21: no caso com acerto pendente, "Ver o acerto" no lugar de "Mudar etapa". */}
          {verAcerto ? (
            <a className="btn btn-pri" href={verAcerto}>
              <Icone nome="cadeado" className="ico" />
              Ver o acerto
            </a>
          ) : null}
          {andamento ? (
            <button data-muda className="btn btn-pri" type="button" onClick={() => setJanela("etapa")}>
              <Icone nome="seta" className="ico" />
              Mudar etapa
            </button>
          ) : null}
        </section>
      </div>
      <div className="hn-grade">
        <div className="hn-col">
          <Dados f={f} aoEditar={andamento ? () => setJanela("editar") : undefined} />
          <Clientes f={f} aoAdicionar={andamento ? () => setJanela("cliente") : undefined} />
          <PrazosETarefas f={f} escritorio={andamento ? escritorio : undefined} aoNovoPrazo={andamento ? () => setJanela("prazo") : undefined} aoNovaTarefa={andamento ? () => setJanela("tarefa") : undefined}
            aoMudou={(x) => { setFeito(x); setVez((v) => v + 1); }} />
          <DocumentosDoCaso f={f} andamento={andamento} aoPedir={() => setJanela("pedir")} aoEnviar={() => setJanela("enviar")}
            aoPedirDeNovo={(d) => setDoc({ d, acao: "denovo" })} aoChegou={(d) => setDoc({ d, acao: "chegou" })} />
        </div>
        <aside className="hn-col" aria-label="Sobre o caso">
          <OQueTrava f={f} aoMudou={(x) => { setFeito(x); setVez((v) => v + 1); }} aoDocumentoChegou={(d) => setDoc({ d, acao: "chegou" })} />
          <PeticoesDoCaso key={`pc-${vez}`} casoId={f.id} andamento={andamento} />
          {f.acerto ? <FolhaAcertoCaso a={f.acerto} /> : null}
          <Contratos f={f} />
          <AvisoCliente f={f} />
          <Mudancas f={f} />
        </aside>
      </div>
      {janela === "etapa" ? (
        <JanelaEtapa f={ficha} escritorio={escritorio} aberta aoFechar={fechar}
          aoFeito={(r) => {
            fechar();
            setFeito(r.encerrado
              ? { titulo: "Caso encerrado", texto: "O resultado ficou no histórico do caso." }
              : { titulo: `Etapa mudada para ${r.para}`, texto: r.aviso ? "O aviso ao cliente ficou guardado nas mudanças de etapa." : "A mudança ficou no histórico do caso." });
            setVez((v) => v + 1);
          }} />
      ) : null}
      {janela === "editar" ? (
        <JanelaEditar f={ficha} aberta aoFechar={fechar}
          aoFeito={() => { fechar(); setFeito({ titulo: "Dados salvos", texto: "A mudança ficou no histórico do caso." }); setVez((v) => v + 1); }} />
      ) : null}
      {janela === "cliente" ? (
        <JanelaCliente f={ficha} aberta aoFechar={fechar}
          aoFeito={(n) => { fechar(); setFeito({ titulo: "Cliente adicionado", texto: `${n} agora está no caso.` }); setVez((v) => v + 1); }} />
      ) : null}
      {janela === "prazo" ? (
        <JanelaPrazo caso={{ id: f.id, nome: f.nome, linha: linhaProcesso(f) }} escritorio={escritorio} aoFechar={fechar}
          aoFeito={(d) => { fechar(); setFeito({ titulo: "Prazo cadastrado", texto: `${d} está no caso e na lista de prazos.` }); setVez((v) => v + 1); }} />
      ) : null}
      {janela === "tarefa" ? (
        <JanelaTarefa caso={{ id: f.id, nome: f.nome, linha: linhaProcesso(f) }} escritorio={escritorio} aoFechar={fechar}
          aoFeito={(d) => { fechar(); setFeito({ titulo: "Tarefa criada", texto: `${d} está no caso e na lista de tarefas.` }); setVez((v) => v + 1); }} />
      ) : null}
      {janela === "pedir" ? <JanelaPedirDocumento f={ficha} aoFechar={fechar} aoFeito={pronto} /> : null}
      {janela === "enviar" ? <JanelaEnviarDocumento f={ficha} aoFechar={fechar} aoFeito={pronto} /> : null}
      {doc?.acao === "denovo" ? <JanelaPedirDeNovo f={ficha} d={doc.d} aoFechar={fechar} aoFeito={pronto} /> : null}
      {doc?.acao === "chegou" ? <JanelaJaChegou f={ficha} d={doc.d} aoFechar={fechar} aoFeito={pronto} /> : null}
      {feito ? <Toast feito={feito} aoFechar={() => setFeito(null)} /> : null}
    </div>
  );
}

export function FichaCasoPortal({ id }: { id: string }) {
  const [nome, setNome] = useState("Caso");
  return (
    <MolduraArea area="JURIDICO" secao="casos" trilha={[{ nome }]} pagina="co-ficha">
      {(e) => <FichaCasoConteudo id={id} escritorio={e} aoNome={setNome} />}
    </MolduraArea>
  );
}
