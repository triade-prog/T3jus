"use client";
// Contas que repetem todo mês (FI-13, F3.24), desenho aprovado em
// docs/design/aprovadas/portal-recibo-recorrente (estados rc-, decisões 2.1 a 2.8): a lista que
// abre em "Recorrentes do mês" do A pagar, a ficha da conta e as janelas "Mudar valor ou dia" e
// "Encerrar a recorrência". A conta do mês já lançada e não paga muda só se a pessoa escolher o
// mês dela; ao encerrar, ela continua a pagar e só é cancelada se a pessoa marcar. Conta paga
// nunca muda e nada se apaga. As regras ficam no servidor (0534).

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  CATEGORIAS_SAIDA, FORMAS_PAGAMENTO, MOTIVOS_ENCERRAR, dataBr, reais,
  type FichaRecorrencia, type ListaRecorrencias, type Recorrencia, type RecorrenciaMudada,
} from "@t3jus/domain";
import { textoDoErro } from "../api.ts";
import { Icone } from "../Icone.tsx";
import { Aviso, Carregando, descritoPor, ErroAoCarregar, ErroCampo, Estado, faltaAcertar, focarPrimeiroErro, Janela } from "../console/pecas.tsx";
import { contar, diaCurto, nomeDoMes } from "./agenda.ts";
import { Selo, useCarga } from "./Comercial.tsx";
import { Toast } from "./FichaCliente.tsx";
import { mesCurto, mesEAno, mesMais, ROTAS_FINANCEIRO, rotaRecorrente, textoDia } from "./financeiro.ts";
import { centavos as lerCentavos } from "./honorarios.ts";
import { chamarPortal } from "./Moldura.tsx";
import { MolduraArea } from "./MolduraArea.tsx";

type Feito = { titulo: string; texto: string };
type Abrir = { r: Recorrencia; tipo: "VALOR" | "ENCERRAR" };

const fuso = { timeZone: "America/Sao_Paulo" } as const;
const diaDoInstante = (em: string) => new Intl.DateTimeFormat("en-CA", { ...fuso, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(em));
const horaDoInstante = (em: string) => new Intl.DateTimeFormat("pt-BR", { ...fuso, hour: "2-digit", minute: "2-digit" }).format(new Date(em)).replace(":", "h");
const paraCampo = (c: number) => reais(c).replace(/^R\$\s?/, "");
const nomeForma = (f: string | null) => (f ? FORMAS_PAGAMENTO[f as keyof typeof FORMAS_PAGAMENTO] : null);
const minuscula = (s: string) => s.replace(/^./, (x) => x.toLowerCase());
const aberta = (r: Recorrencia) => !!r.doMes && r.doMes.situacao !== "PAGA" && r.doMes.situacao !== "CANCELADA";

/** O que aconteceu com a conta do mês, como na coluna do mês da lista. */
function SituacaoDoMes({ r, mes, ultima }: { r: Recorrencia; mes: string; ultima?: boolean }) {
  const c = r.doMes;
  if (!c) return <div className="rc-mes"><Selo tom="neutro">Nasce em {diaCurto(mesMais(mes, 1))}</Selo></div>;
  if (c.situacao === "PAGA") return <div className="rc-mes"><Selo tom="ok" icone="check">Paga</Selo><small>paga em {diaCurto(c.pagaEm!)}</small></div>;
  if (c.situacao === "CANCELADA") return <div className="rc-mes"><Selo tom="neutro">Cancelada</Selo><small>não vai ser cobrada</small></div>;
  return (
    <div className="rc-mes">
      {c.situacao === "VENCIDA" ? <Selo tom="urgente" icone="alerta">Vencida</Selo> : <Selo tom="neutro">A pagar</Selo>}
      <small>{ultima ? "a última desta conta" : `vence ${diaCurto(c.vencimento)}`}</small>
    </div>
  );
}

function BotoesLinha({ r, aoAbrir }: { r: Recorrencia; aoAbrir: (a: Abrir) => void }) {
  return (
    <div className="rc-acoes">
      <button className="btn btn-sec btn-compacto" type="button" onClick={() => aoAbrir({ r, tipo: "VALOR" })} aria-label={`Mudar valor ou dia de ${r.descricao}`}>
        <Icone nome="lapis" className="ico" />Mudar
      </button>
      <button className="btn btn-sec btn-compacto" type="button" onClick={() => aoAbrir({ r, tipo: "ENCERRAR" })} aria-label={`Encerrar a recorrência de ${r.descricao}`}>
        <Icone nome="encerrar" className="ico" />Encerrar
      </button>
    </div>
  );
}

/** A lista que aparece em "Recorrentes do mês" do A pagar (estados rc-lista e rc-lista-encerrada). */
export function ListaRecorrentes({ aoMudou }: { aoMudou: () => void }) {
  const { dados, recarregar } = useCarga<ListaRecorrencias>("/v1/escritorio/financeiro/recorrencias");
  const [abrir, setAbrir] = useState<Abrir | null>(null);
  const [feito, setFeito] = useState<Feito | null>(null);
  const terminar = (f: Feito) => {
    setAbrir(null);
    setFeito(f);
    recarregar();
    aoMudou();
  };
  const janelas = (
    <>
      {abrir?.tipo === "VALOR" ? <JanelaMudar r={abrir.r} aoFechar={() => setAbrir(null)} aoFeito={terminar} /> : null}
      {abrir?.tipo === "ENCERRAR" ? <JanelaEncerrar r={abrir.r} aoFechar={() => setAbrir(null)} aoFeito={terminar} /> : null}
      {feito ? <Toast feito={feito} aoFechar={() => setFeito(null)} /> : null}
    </>
  );
  const cab = (
    <div className="folha-cab">
      <div>
        <h2 id="t-contas"><Icone nome="reenviar" className="ico" />Contas que repetem todo mês</h2>
        {dados && dados !== "erro" ? <p className="sub">Valor, dia e o que já aconteceu em {nomeDoMes(dados.mes)}</p> : null}
      </div>
    </div>
  );
  if (dados === "erro") return <section className="folha" aria-labelledby="t-contas">{cab}<ErroAoCarregar oque="as contas que repetem" aoTentar={recarregar} /></section>;
  if (!dados) return <section className="folha" aria-labelledby="t-contas">{cab}<Carregando rotulo="Carregando as contas que repetem…" linhas={4} /></section>;
  const mes = dados.mes;
  const total = dados.ativas.reduce((s, r) => s + (r.proxima?.valor ?? r.valor), 0);
  return (
    <>
      <section className="folha" aria-labelledby="t-contas" style={{ overflow: "hidden" }}>
        {cab}
        {dados.ativas.length ? (
          <>
            <table className="hn-tab fi-tab rc-tab">
              <caption className="sr">Contas que se repetem todo mês</caption>
              <colgroup>{["18%", "16%", "11%", "11%", "8%", "11%", "25%"].map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
              <thead>
                <tr>
                  <th scope="col">Conta</th><th scope="col">Categoria</th><th scope="col">Vence</th><th scope="col" style={{ textAlign: "right" }}>Valor</th>
                  <th scope="col">Desde</th><th scope="col">{nomeDoMes(mes).replace(/^./, (x) => x.toUpperCase())}</th><th scope="col"><span className="sr">Ações</span></th>
                </tr>
              </thead>
              <tbody>
                {dados.ativas.map((r) => (
                  <tr key={r.id}>
                    <td><div className="rc-quem"><a href={rotaRecorrente(r.id)}>{r.descricao}</a>{r.fornecedor ? <small>{r.fornecedor}</small> : null}</div></td>
                    <td data-r="Categoria"><span className="fi-cat">{CATEGORIAS_SAIDA[r.categoria]}</span></td>
                    <td data-r="Vence" className="num"><b>{textoDia(r.dia)}</b>{nomeForma(r.forma) ? <small className="rc-muda">{nomeForma(r.forma)}</small> : null}</td>
                    <td data-r="Valor" className="fi-v num">{reais(r.valor)}</td>
                    <td data-r="Desde" className="num">{mesCurto(r.desde)}</td>
                    <td data-r={nomeDoMes(mes)}><SituacaoDoMes r={r} mes={mes} /></td>
                    <td data-r="">{r.ultimoMes ? <Selo tom="neutro">Termina em {nomeDoMes(r.ultimoMes)}</Selo> : <BotoesLinha r={r} aoAbrir={setAbrir} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="rc-total"><span>{contar(dados.ativas.length, "conta ativa", "contas ativas")} · nascem sozinhas no dia 1º de cada mês</span><b className="num">{reais(total)}</b></p>
          </>
        ) : (
          <Estado icone="reenviar" titulo="Nenhuma conta repete todo mês">
            Ao lançar uma conta fixa, como o aluguel ou a folha, marque “Repete todo mês” e ela aparece aqui.
          </Estado>
        )}
        <p className="rc-nota">
          <Icone nome="historico" className="ico" />
          <span>Mudar o valor ou encerrar vale para as contas que ainda vão nascer, a partir do mês que você escolher. As contas pagas não mudam e nada se apaga.</span>
        </p>
      </section>
      {dados.encerradas.length ? (
        <section className="folha" aria-labelledby="t-enc" style={{ overflow: "hidden" }}>
          <div className="folha-cab">
            <div>
              <h2 id="t-enc"><Icone nome="encerrar" className="ico" />Encerradas</h2>
              <p className="sub">Não nascem mais. As contas que já existiam ficam no histórico.</p>
            </div>
          </div>
          <ul className="fi-linhas">
            {dados.encerradas.map((r) => (
              <li key={r.id} className="fi-linha rc-enc" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
                <div className="fi-quem">
                  <a href={rotaRecorrente(r.id)}>{r.descricao}</a>
                  <small>
                    {[r.fornecedor, reais(r.valor), textoDia(r.dia, false), r.ultimoMes ? `de ${mesEAno(r.desde)} a ${mesEAno(r.ultimoMes)}` : null].filter(Boolean).join(" · ")}
                  </small>
                  {r.encerrada ? (
                    <p className="fi-prox">
                      <Icone nome="encerrar" className="ico" />
                      Encerrada em {diaCurto(diaDoInstante(r.encerrada.em))} por {r.encerrada.por.nome} · motivo: <b>{minuscula(r.encerrada.motivo)}</b>
                    </p>
                  ) : null}
                </div>
                <div className="fi-lado"><Selo tom="neutro">Encerrada</Selo></div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {janelas}
    </>
  );
}

// ------------------------------------------------------------------------- Ficha da conta

function FichaConteudo({ id, aoNome }: { id: string; aoNome: (n: string) => void }) {
  const { dados, recarregar } = useCarga<FichaRecorrencia>(`/v1/escritorio/financeiro/recorrencias/${id}`);
  const [abrir, setAbrir] = useState<Abrir["tipo"] | null>(null);
  const [feito, setFeito] = useState<Feito | null>(null);
  const [novo, setNovo] = useState<string | null>(null);
  const nome = dados && dados !== "erro" ? dados.descricao : null;
  useEffect(() => {
    if (nome) aoNome(nome);
  }, [nome, aoNome]);
  if (dados === "erro") return <ErroAoCarregar oque="a conta" aoTentar={recarregar} />;
  if (!dados) return <Carregando rotulo="Carregando a conta…" linhas={5} />;
  const r = dados;
  const terminar = (f: Feito, m?: RecorrenciaMudada) => {
    setAbrir(null);
    setFeito(f);
    setNovo(m?.id ?? null);
    recarregar();
  };
  const enc = r.encerrada;
  const meta = [r.fornecedor, reais(r.valor), textoDia(r.dia, false), nomeForma(r.forma) ? minuscula(nomeForma(r.forma)!) : null].filter(Boolean).join(" · ");
  const ultimoAberto = !!enc && !!r.doMes && r.ultimoMes === r.doMes.recorrente?.mes;
  return (
    <div className="fi">
      <div className="ficha-cab">
        <div className="esq campo-vinho">
          <Icone nome="reenviar" className="ico estatua" />
          <a className="voltar" href={ROTAS_FINANCEIRO.pagar}><Icone nome="esquerda" className="ico ico-s" />A pagar</a>
          <div className="ident">
            <div>
              <p className="sobretitulo">Conta que repete todo mês · {CATEGORIAS_SAIDA[r.categoria]}</p>
              <h1>{r.descricao}</h1>
              <p className="meta">
                <span className="selo selo-ativo" style={{ background: "var(--ambar-3)", color: "var(--vinho)" }}>
                  {enc ? `Encerrada em ${dataBr(diaDoInstante(enc.em))}` : "Repete todo mês"}
                </span>
                <span>{meta}</span>
                <span className="sep" aria-hidden="true" />
                <span>desde {mesEAno(r.desde)}</span>
              </p>
            </div>
          </div>
        </div>
        {enc ? (
          <section className="dir campo-ambar" aria-labelledby="t-dir">
            <p className="sobretitulo" id="t-dir">Não repete mais</p>
            <div className="rc-dir-linha"><p className="grande num">{diaCurto(diaDoInstante(enc.em))}</p><Selo tom="neutro">Encerrada</Selo></div>
            <p className="fi-oque">
              <b>Nenhuma conta nasce a partir de {mesEAno(enc.aPartirDe)}.</b>
              {r.doMes && ultimoAberto ? <><br />{r.doMes.situacao === "CANCELADA" ? `A de ${nomeDoMes(r.doMes.vencimento)} foi cancelada.` : r.doMes.situacao === "PAGA" ? `A de ${nomeDoMes(r.doMes.vencimento)} já foi paga.` : `A de ${nomeDoMes(r.doMes.vencimento)}, de ${reais(r.doMes.valor)}, vence ${diaCurto(r.doMes.vencimento)} e continua a pagar.`}</> : null}
            </p>
          </section>
        ) : r.proxima ? (
          <section className="dir campo-ambar" aria-labelledby="t-dir">
            <p className="sobretitulo" id="t-dir">{r.proxima.valor !== r.valor ? "Próxima conta · valor novo" : "Próxima conta"}</p>
            <div className="rc-dir-linha"><p className="grande num">{reais(r.proxima.valor)}</p><Selo tom="ativo">nasce em {diaCurto(r.proxima.mes)}</Selo></div>
            <p className="fi-oque">
              <b>{nomeDoMes(r.proxima.mes).replace(/^./, (x) => x.toUpperCase())}, vence {diaCurto(r.proxima.vencimento)}.</b><br />
              {r.proxima.valor !== r.valor && r.doMes ? `${nomeDoMes(r.doMes.vencimento).replace(/^./, (x) => x.toUpperCase())} continua ${reais(r.doMes.valor)}: já estava lançada.` : "Nasce sozinha no dia 1º, com este valor."}
            </p>
            <div className="rc-dir-bts">
              <button className="btn btn-pri" type="button" onClick={() => setAbrir("VALOR")}><Icone nome="lapis" className="ico" />Mudar valor ou dia</button>
              <button className="btn btn-sec" type="button" onClick={() => setAbrir("ENCERRAR")}><Icone nome="encerrar" className="ico" />Encerrar</button>
            </div>
          </section>
        ) : null}
      </div>
      <div className="fi-grade">
        <div className="fi-col">
          <section className="folha" aria-labelledby="t-lanc" style={{ overflow: "hidden" }}>
            <div className="folha-cab">
              <div>
                <h2 id="t-lanc"><Icone nome="agenda" className="ico" />Contas lançadas</h2>
                <p className="sub">Cada mês é uma conta própria, com o seu boleto e a sua baixa.</p>
              </div>
            </div>
            <table className="hn-tab fi-tab">
              <caption className="sr">Contas lançadas</caption>
              <colgroup>{["20%", "14%", "18%", "24%", "24%"].map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
              <thead>
                <tr><th scope="col">Mês</th><th scope="col">Vence</th><th scope="col" style={{ textAlign: "right" }}>Valor</th><th scope="col">Situação</th><th scope="col">Nota ou boleto</th></tr>
              </thead>
              <tbody>
                {r.contas.map((c) => {
                  const m = c.recorrente?.mes ?? c.vencimento;
                  return (
                    <tr key={c.id} className={c.situacao === "VENCIDA" ? "fi-atraso" : c.situacao === "CANCELADA" ? "fi-cancelada" : undefined}>
                      <td><div className="fi-dt"><b>{nomeDoMes(m)}</b><small>{m.slice(0, 4)}</small></div></td>
                      <td data-r="Vence" className="num">{diaCurto(c.vencimento)}</td>
                      <td data-r="Valor" className="fi-v num">{reais(c.valorPago ?? c.valor)}</td>
                      <td data-r="Situação">
                        {c.situacao === "PAGA" ? <Selo tom="ok" icone="check">Paga em {diaCurto(c.pagaEm!)}</Selo>
                          : c.situacao === "CANCELADA" ? <div className="rc-mes"><Selo tom="neutro">Cancelada</Selo><small>{c.cancelada?.motivo}</small></div>
                          : enc && r.ultimoMes === m ? <div className="rc-mes"><Selo tom="neutro">A pagar</Selo><small>a última desta conta</small></div>
                          : c.situacao === "VENCIDA" ? <Selo tom="urgente" icone="alerta">Vencida</Selo> : <Selo tom="neutro">A pagar</Selo>}
                      </td>
                      <td data-r="Nota ou boleto">{c.anexos ? <span className="fi-docs"><Icone nome="doc" className="ico" />{c.anexos === 1 ? "Arquivo anexado" : `${c.anexos} arquivos anexados`}</span> : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mais"><span>{contar(r.lancadas, "conta", "contas")} desde {mesEAno(r.desde)} · {contar(r.pagas, "paga", "pagas")}</span></p>
          </section>
        </div>
        <aside className="fi-col" aria-label="Mudanças">
          <section className="folha" aria-labelledby="t-mud" style={{ overflow: "hidden" }}>
            <div className="folha-cab"><div><h2 id="t-mud"><Icone nome="historico" className="ico" />Mudanças</h2></div></div>
            <div className="eventos-dia" style={{ paddingTop: 0 }}>
              <ol className="eventos">
                {r.mudancas.map((x, i) => {
                  const d = diaDoInstante(x.em);
                  return (
                    <li key={x.id}>
                      <time dateTime={x.em}>{diaCurto(d)}<span className="sr">/{d.slice(0, 4)}</span></time>
                      <span className={i === 0 ? "pto forte" : "pto"} aria-hidden="true" />
                      <div>
                        <p>
                          <b>{x.por.nome}</b> {x.tipo === "VALOR" ? "mudou o valor" : "encerrou a recorrência"}, às {horaDoInstante(x.em)}
                          {novo === x.id ? <Selo tom="ativo">Novo</Selo> : null}
                        </p>
                        <small>
                          {x.tipo === "VALOR"
                            ? <>De {reais(x.antes?.valor ?? 0)}{x.antes && x.antes.dia !== x.dia ? `, ${textoDia(x.antes.dia, false)},` : ""} para {reais(x.valor!)}{x.antes?.dia !== x.dia ? `, ${textoDia(x.dia!, false)},` : ""} a partir de {mesEAno(x.aPartirDe)}.{" "}
                                {x.mudouConta ? "A conta do mês mudou junto." : ""}{x.motivo ? ` Motivo: ${minuscula(x.motivo)}.` : ""}</>
                            : <>Nenhuma conta nasce a partir de {mesEAno(x.aPartirDe)}. {x.cancelouConta ? "A conta do mês foi cancelada." : "A conta do mês continua a pagar."} Motivo: {minuscula(x.motivo ?? "")}.
                                {x.detalhe ? ` “${x.detalhe}”` : ""}</>}
                        </small>
                      </div>
                    </li>
                  );
                })}
                <li>
                  <time dateTime={r.criada.em}>{diaCurto(diaDoInstante(r.criada.em))}<span className="sr">/{diaDoInstante(r.criada.em).slice(0, 4)}</span></time>
                  <span className={r.mudancas.length ? "pto" : "pto forte"} aria-hidden="true" />
                  <div>
                    <p><b>{r.criada.por.nome}</b> criou a conta que repete todo mês</p>
                    <small>{reais(r.criada.valor)}, {textoDia(r.criada.dia, false)}{nomeForma(r.criada.forma) ? `, ${minuscula(nomeForma(r.criada.forma)!)}` : ""}, a partir de {mesEAno(r.criada.mes)}.</small>
                  </div>
                </li>
              </ol>
            </div>
            <p className="rc-nota">
              <Icone nome="cadeado" className="ico" />
              <span>Mudar ou encerrar não mexe nas contas pagas e não apaga nada. Tudo fica aqui, com o nome de quem fez e a hora.</span>
            </p>
          </section>
        </aside>
      </div>
      {abrir === "VALOR" ? <JanelaMudar r={r} aoFechar={() => setAbrir(null)} aoFeito={terminar} /> : null}
      {abrir === "ENCERRAR" ? <JanelaEncerrar r={r} aoFechar={() => setAbrir(null)} aoFeito={terminar} /> : null}
      {feito ? <Toast feito={feito} aoFechar={() => setFeito(null)} /> : null}
    </div>
  );
}

export function RecorrenteFinanceiro({ id }: { id: string }) {
  const [nome, setNome] = useState("Conta que repete");
  return (
    <MolduraArea area="FINANCEIRO" secao="a-pagar" trilha={[{ nome }]} pagina="co-ficha co-carteira">
      {() => <FichaConteudo id={id} aoNome={setNome} />}
    </MolduraArea>
  );
}

// ------------------------------------------------------------------------- Janelas

function Alvo({ r }: { r: Recorrencia }) {
  return (
    <div className="fi-alvo" style={{ gridTemplateColumns: "auto minmax(0,1fr)" }}>
      <Icone nome="reenviar" className="ico" />
      <div>
        <strong>Hoje: {reais(r.valor)}, {textoDia(r.dia, false)}</strong>
        <small>{[r.fornecedor, minuscula(CATEGORIAS_SAIDA[r.categoria]), nomeForma(r.forma) ? minuscula(nomeForma(r.forma)!) : null, `desde ${mesEAno(r.desde)}`].filter(Boolean).join(" · ")}</small>
      </div>
    </div>
  );
}

function Efeito({ itens }: { itens: { ico: "check" | "reenviar" | "encerrar" | "historico"; texto: ReactNode }[] }) {
  return (
    <div className="campo">
      <p className="rc-efeito-t" id="rc-efeito-t">O que vai acontecer</p>
      <ul className="rc-efeito" aria-labelledby="rc-efeito-t">
        {itens.map((x, i) => <li key={i}><Icone nome={x.ico} className="ico" /><span>{x.texto}</span></li>)}
      </ul>
    </div>
  );
}

/** O mês da conta do mês (o mês corrente), tirado da próxima ou da conta lançada. */
const mesAtual = (r: Recorrencia) => r.doMes?.recorrente?.mes ?? (r.proxima ? mesMais(r.proxima.mes, -1) : r.desde);

function JanelaMudar({ r, aoFechar, aoFeito }: { r: Recorrencia; aoFechar: () => void; aoFeito: (f: Feito, m?: RecorrenciaMudada) => void }) {
  const mes = mesAtual(r);
  const prox = mesMais(mes, 1);
  const podeAtual = aberta(r);
  const opcoes = [
    ...(podeAtual ? [{ v: mes, t: `${mesEAno(mes)} · já lançada, ainda não paga` }] : []),
    { v: prox, t: `${mesEAno(prox)} · a próxima, nasce em ${diaCurto(prox)}` },
    ...[2, 3, 4].map((n) => ({ v: mesMais(mes, n), t: mesEAno(mesMais(mes, n)) })),
  ];
  const [desde, setDesde] = useState(prox);
  const [valor, setValor] = useState(paraCampo(r.proxima?.valor ?? r.valor));
  const [dia, setDia] = useState(String(r.dia > 28 ? 0 : r.dia));
  const [motivo, setMotivo] = useState("");
  const [erros, setErros] = useState<string[]>([]);
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const corpo = useRef<HTMLDivElement>(null);
  const tem = (c: string) => erros.includes(c);
  const v = lerCentavos(valor);
  const d = Number(dia);

  async function enviar() {
    const e: string[] = [];
    if (!desde) e.push("aPartirDe");
    if (v === null || v <= 0) e.push("valor");
    setErros(e);
    setFalha(null);
    if (e.length) return focarPrimeiroErro(corpo.current);
    setEnviando(true);
    const res = await chamarPortal<RecorrenciaMudada>(`/v1/escritorio/financeiro/recorrencias/${r.id}/mudancas`, {
      metodo: "POST", corpo: { tipo: "VALOR", aPartirDe: desde, valor: v, dia: d, motivo: motivo.trim() || null },
    });
    setEnviando(false);
    if (res.ok) {
      const o = nomeDoMes(desde);
      return aoFeito({
        titulo: `Valor novo a partir de ${o}.`,
        texto: `${r.descricao} passa a ${reais(v!)}, ${textoDia(d, false)}, a partir de ${o}. ${res.dados.mudouConta ? `A de ${o}, ainda não paga, mudou junto; as pagas não mudaram.` : `${podeAtual ? `${nomeDoMes(mes).replace(/^./, (x) => x.toUpperCase())} e as pagas` : "As pagas"} não mudaram.`}`,
      }, res.dados);
    }
    const campos = (res.erro.detalhes?.campos as string[] | undefined) ?? [];
    if (campos.length) {
      setErros(campos);
      return focarPrimeiroErro(corpo.current);
    }
    setFalha(textoDoErro(res.erro));
  }

  const efeito = [
    ...(r.pagas ? [{ ico: "check" as const, texto: <><b>{contar(r.pagas, "conta paga", "contas pagas")}</b>: não mudam.</> }] : []),
    ...(r.doMes && r.doMes.situacao !== "PAGA" && r.doMes.situacao !== "CANCELADA"
      ? [{ ico: (desde === mes ? "reenviar" : "check") as "reenviar" | "check", texto: desde === mes
          ? <><b>{nomeDoMes(mes).replace(/^./, (x) => x.toUpperCase())}</b>, já lançada ({reais(r.doMes.valor)}, vence {diaCurto(r.doMes.vencimento)}): muda junto.</>
          : <><b>{nomeDoMes(mes).replace(/^./, (x) => x.toUpperCase())}</b>, já lançada ({reais(r.doMes.valor)}, vence {diaCurto(r.doMes.vencimento)}): não muda.</> }]
      : []),
    ...(desde && v ? [{ ico: "reenviar" as const, texto: <><b>De {nomeDoMes(desde)} em diante:</b> {reais(v)}, {textoDia(d, false)}.{desde !== mes ? ` A de ${nomeDoMes(desde)} nasce em ${diaCurto(desde)}.` : ""}</> }] : []),
  ];

  return (
    <Janela id="j-rc-mudar" aberta aoFechar={aoFechar} sobretitulo={`${r.descricao} · repete todo mês`} titulo="Mudar valor ou dia" descricao="j-rc-mudar-d" aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-sec" type="button" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-pri" type="submit" disabled={enviando} aria-busy={enviando || undefined}><Icone nome="check" className="ico" />Salvar a mudança</button>
        </>
      }>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id="j-rc-mudar-d">Vale para as contas que ainda vão nascer, a partir do mês que você escolher.</p>
        {erros.length ? <Aviso tom="urgencia" titulo={faltaAcertar(erros.length)}>Nada foi mudado ainda.</Aviso> : null}
        {falha ? <Aviso tom="urgencia" titulo="A mudança não foi salva.">{falha}</Aviso> : null}
        <Alvo r={r} />
        <div className="campo">
          <label htmlFor="rc-desde">A partir de</label>
          <select className="entrada" id="rc-desde" value={desde} onChange={(e) => setDesde(e.target.value)}
            aria-invalid={tem("aPartirDe") || undefined} aria-describedby={descritoPor(!tem("aPartirDe") && "rc-desde-aj", tem("aPartirDe") && "rc-desde-er")}>
            <option value="">Escolha o mês</option>
            {opcoes.map((o) => <option key={o.v} value={o.v}>{o.t}</option>)}
          </select>
          {tem("aPartirDe") ? <ErroCampo id="rc-desde-er">Escolha o mês em que o valor novo começa.</ErroCampo>
            : <p className="ajuda" id="rc-desde-aj">{podeAtual ? `Se o reajuste já vale para ${nomeDoMes(mes)}, escolha ${nomeDoMes(mes)}: a conta lançada e ainda não paga muda junto. ` : ""}As pagas nunca mudam.</p>}
        </div>
        <div className="fi-dois">
          <div className="campo">
            <label htmlFor="rc-valor">Valor novo</label>
            <input className="entrada" id="rc-valor" type="text" inputMode="decimal" autoComplete="off" value={valor} onChange={(e) => setValor(e.target.value)} data-foco=""
              aria-invalid={tem("valor") || undefined} aria-describedby={descritoPor(!tem("valor") && "rc-valor-aj", tem("valor") && "rc-valor-er")} />
            {tem("valor") ? <ErroCampo id="rc-valor-er">Escreva o valor novo. Hoje é {reais(r.valor)}; se só o dia mudou, repita o valor.</ErroCampo>
              : <p className="ajuda" id="rc-valor-aj">Hoje: {reais(r.valor)}.</p>}
          </div>
          <div className="campo">
            <label htmlFor="rc-dia">Vence</label>
            <select className="entrada" id="rc-dia" value={dia} onChange={(e) => setDia(e.target.value)} aria-invalid={tem("dia") || undefined}
              aria-describedby={descritoPor(!tem("dia") && "rc-dia-aj", tem("dia") && "rc-dia-er")}>
              {Array.from({ length: 28 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>Todo dia {n}{n === r.dia ? " (o de hoje)" : ""}</option>)}
              <option value="0">No último dia do mês</option>
            </select>
            {tem("dia") ? <ErroCampo id="rc-dia-er">Escolha um dia de 1 a 28, ou o último dia do mês.</ErroCampo>
              : <p className="ajuda" id="rc-dia-aj">Para mudar só o valor, deixe o dia como está.</p>}
          </div>
        </div>
        <div className="campo">
          <label htmlFor="rc-motivo">Por que mudou <span className="opcional">(opcional)</span></label>
          <input className="entrada" id="rc-motivo" type="text" autoComplete="off" maxLength={160} value={motivo} onChange={(e) => setMotivo(e.target.value)} aria-describedby="rc-motivo-aj" />
          <p className="ajuda" id="rc-motivo-aj">Fica no histórico da conta.</p>
        </div>
        <Efeito itens={efeito} />
      </div>
    </Janela>
  );
}

function JanelaEncerrar({ r, aoFechar, aoFeito }: { r: Recorrencia; aoFechar: () => void; aoFeito: (f: Feito, m?: RecorrenciaMudada) => void }) {
  const mes = mesAtual(r);
  const prox = mesMais(mes, 1);
  const [desde, setDesde] = useState(prox);
  const [cancelar, setCancelar] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [detalhe, setDetalhe] = useState("");
  const [erros, setErros] = useState<string[]>([]);
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const corpo = useRef<HTMLDivElement>(null);
  const tem = (c: string) => erros.includes(c);
  const podeCancelar = aberta(r) && desde === prox;
  const nm = nomeDoMes(mes);
  const Nm = nm.replace(/^./, (x) => x.toUpperCase());

  async function enviar() {
    const e: string[] = [];
    if (!motivo) e.push("motivo");
    if (motivo === "Outro" && !detalhe.trim()) e.push("detalhe");
    setErros(e);
    setFalha(null);
    if (e.length) return focarPrimeiroErro(corpo.current);
    setEnviando(true);
    const res = await chamarPortal<RecorrenciaMudada>(`/v1/escritorio/financeiro/recorrencias/${r.id}/mudancas`, {
      metodo: "POST", corpo: { tipo: "ENCERRAR", aPartirDe: desde, motivo, detalhe: detalhe.trim() || null, cancelarLancada: podeCancelar && cancelar },
    });
    setEnviando(false);
    if (res.ok) {
      return aoFeito({
        titulo: "Recorrência encerrada.",
        texto: `${r.descricao} não nasce mais a partir de ${nomeDoMes(desde)}. ${res.dados.cancelouConta ? `A conta de ${nm} foi cancelada` : aberta(r) ? `A conta de ${nm} continua a pagar` : "As contas que já existiam ficam"}, e o histórico ficou como estava.`,
      }, res.dados);
    }
    const campos = (res.erro.detalhes?.campos as string[] | undefined) ?? [];
    if (campos.length) {
      setErros(campos);
      return focarPrimeiroErro(corpo.current);
    }
    setFalha(textoDoErro(res.erro));
  }

  const efeito = [
    { ico: "encerrar" as const, texto: <><b>De {nomeDoMes(desde)} em diante:</b> nenhuma conta nasce.</> },
    ...(desde !== prox ? [{ ico: "reenviar" as const, texto: <><b>Até {nomeDoMes(mesMais(desde, -1))}</b>, as contas continuam a nascer no dia 1º.</> }] : []),
    ...(r.doMes && aberta(r)
      ? [{ ico: "check" as const, texto: <><b>{Nm}</b> ({reais(r.doMes.valor)}, vence {diaCurto(r.doMes.vencimento)}): {podeCancelar && cancelar ? "fica cancelada, com o motivo." : "continua a pagar."}</> }]
      : []),
    ...(r.pagas ? [{ ico: "historico" as const, texto: <><b>{contar(r.pagas, "conta paga", "contas pagas")}</b>: ficam no histórico e na exportação para o contador.</> }] : []),
  ];

  return (
    <Janela id="j-rc-enc" aberta aoFechar={aoFechar} sobretitulo={`${r.descricao} · repete todo mês`} titulo="Encerrar a recorrência" descricao="j-rc-enc-d" aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-sec" type="button" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-pri" type="submit" disabled={enviando} aria-busy={enviando || undefined}><Icone nome="encerrar" className="ico" />Encerrar a recorrência</button>
        </>
      }>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id="j-rc-enc-d">Nada se apaga: as contas que já existem ficam como estão. Só deixam de nascer contas novas.</p>
        {erros.length ? <Aviso tom="urgencia" titulo={faltaAcertar(erros.length)}>A recorrência continua ativa.</Aviso> : null}
        {falha ? <Aviso tom="urgencia" titulo="A recorrência não foi encerrada.">{falha}</Aviso> : null}
        <Alvo r={r} />
        <div className="campo">
          <label htmlFor="rc-ate">Não nasce mais a partir de</label>
          <select className="entrada" id="rc-ate" value={desde} onChange={(e) => setDesde(e.target.value)} data-foco="" aria-describedby="rc-ate-aj">
            {[1, 2, 3, 4].map((n) => <option key={n} value={mesMais(mes, n)}>{mesEAno(mesMais(mes, n))}{n === 1 ? " · a próxima" : ""}</option>)}
          </select>
          <p className="ajuda" id="rc-ate-aj">{r.doMes ? `A de ${nm} já nasceu em ${diaCurto(mes)}.${aberta(r) ? " Para ela, veja a opção abaixo." : ""}` : "As contas que já nasceram ficam como estão."}</p>
        </div>
        {podeCancelar && r.doMes ? (
          <label className="opcao">
            <input className="marcar" type="checkbox" checked={cancelar} onChange={(e) => setCancelar(e.target.checked)} />
            <span>
              Cancelar também a de {nm}
              <small>{reais(r.doMes.valor)}, vence {diaCurto(r.doMes.vencimento)}, ainda não paga. Marque só se ela não vai ser cobrada: fica no histórico como cancelada, com o motivo.</small>
            </span>
          </label>
        ) : null}
        <div className="campo">
          <label htmlFor="rc-mot">Por que encerrar</label>
          <select className="entrada" id="rc-mot" value={motivo} onChange={(e) => setMotivo(e.target.value)}
            aria-invalid={tem("motivo") || undefined} aria-describedby={tem("motivo") ? "rc-mot-er" : undefined}>
            <option value="">Escolha o motivo</option>
            {MOTIVOS_ENCERRAR.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          {tem("motivo") ? <ErroCampo id="rc-mot-er">Escolha o motivo. Ele fica no histórico da conta e ajuda quem olhar depois.</ErroCampo> : null}
        </div>
        <div className="campo">
          <label htmlFor="rc-det">Detalhe{motivo === "Outro" ? null : <> <span className="opcional">(opcional)</span></>}</label>
          <textarea className="entrada" id="rc-det" rows={3} maxLength={500} value={detalhe} onChange={(e) => setDetalhe(e.target.value)}
            aria-invalid={tem("detalhe") || undefined} aria-describedby={descritoPor(!tem("detalhe") && "rc-det-aj", tem("detalhe") && "rc-det-er")} />
          {tem("detalhe") ? <ErroCampo id="rc-det-er">Conte em poucas palavras por que a conta vai parar.</ErroCampo>
            : <p className="ajuda" id="rc-det-aj">Aparece junto com o motivo.</p>}
        </div>
        <Efeito itens={efeito} />
      </div>
    </Janela>
  );
}
