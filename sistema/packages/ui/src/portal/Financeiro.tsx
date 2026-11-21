"use client";
// Financeiro do Portal, A receber (FI-01 a FI-04, FI-14, FI-17), desenho aprovado em
// docs/design/aprovadas/portal-financeiro (estados receber, contrato, registrar e registrar-erro;
// decisões 4 a 7): a lista por vencimento com os quatro números que também são filtros, a ficha
// de parcelas de um contrato com a cobrança, e as janelas de registrar recebimento e de anotar
// cobrança. As parcelas nascem dos contratos; nada se digita nem se apaga aqui.

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  dataBr, FORMAS_PAGAMENTO, hojeBrasilia, numeroRecibo, reais, TIPOS_COBRANCA,
  type FormaPagamento, type ListaReceber, type MostrarReceber, type ParcelaDoContrato, type ParcelaLinha, type ParcelasContrato,
  type RecebimentoRegistrado, type TipoCobranca, type ContaPagar, CATEGORIAS_SAIDA,
} from "@t3jus/domain";
import { textoDoErro } from "../api.ts";
import { Icone } from "../Icone.tsx";
import { Aviso, Carregando, descritoPor, ErroAoCarregar, ErroCampo, Estado, faltaAcertar, focarPrimeiroErro, Janela } from "../console/pecas.tsx";
import { contar, diaBr, diaCurto, lerDia, nomeDoMes } from "./agenda.ts";
import { BotaoCarne, FolhaCarne } from "./Carne.tsx";
import { Busca, Chips, Selo, useCarga } from "./Comercial.tsx";
import { diasEntre } from "./comercial.ts";
import { ROTAS_CONTRATOS } from "./contratos.ts";
import { primeiroNome } from "./equipe.ts";
import { Toast } from "./FichaCliente.tsx";
import { comoVolta, gruposPorCliente, gruposPorVencimento, mesReferencia, quandoAcao, ROTAS_FINANCEIRO, seloParcela, textoCobranca } from "./financeiro.ts";
import { centavos as lerCentavos } from "./honorarios.ts";
import { chamarPortal, type EscritorioPortal } from "./Moldura.tsx";
import { MolduraArea } from "./MolduraArea.tsx";

type Feito = { titulo: string; texto: string };
type Pessoa = { id: string; nome: string };

const ORDEM_FORMAS = Object.keys(FORMAS_PAGAMENTO) as FormaPagamento[];
const nomeForma = (f: FormaPagamento | null) => (f ? FORMAS_PAGAMENTO[f] : null);
const fuso = { timeZone: "America/Sao_Paulo" } as const;
const diaDoInstante = (em: string) => new Intl.DateTimeFormat("en-CA", { ...fuso, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(em));
const horaDoInstante = (em: string) => new Intl.DateTimeFormat("pt-BR", { ...fuso, hour: "2-digit", minute: "2-digit" }).format(new Date(em)).replace(":", "h");
/** Valor em reais para o campo, sem o "R$": 850,00. */
const paraCampo = (c: number) => reais(c).replace(/^R\$\s?/, "");

function SeloDaParcela({ p, hoje }: { p: Pick<ParcelaLinha, "situacao" | "vencimento" | "falta" | "pagaEm">; hoje: string }) {
  const s = seloParcela(p, hoje);
  return <Selo tom={s.tom} icone={s.icone}>{s.texto}</Selo>;
}

/** Motivo e próxima ação, como na lista e no Resumo. */
function MotivoEAcao({ p, hoje }: { p: ParcelaLinha; hoje: string }) {
  const c = p.cobranca;
  if (!c) return p.situacao === "VENCIDA" ? <p className="fi-motivo">Sem cobrança anotada ainda.</p> : null;
  return (
    <>
      {c.motivo ? <p className="fi-motivo"><b>Motivo:</b> {c.motivo}</p> : null}
      <p className="fi-motivo"><b>Próxima ação, {quandoAcao(c.proxData, hoje)}:</b> {c.proxOque} · {primeiroNome(c.proxResponsavel.nome)}</p>
    </>
  );
}

function usePessoas(): Pessoa[] {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  useEffect(() => {
    void chamarPortal<{ pessoas: Pessoa[] }>("/v1/escritorio/pessoas").then((x) => setPessoas(x.ok ? x.dados.pessoas : []));
  }, []);
  return pessoas;
}

// ------------------------------------------------------------------------- A receber

function CabReceber({ aoRegistrar }: { aoRegistrar?: () => void }) {
  return (
    <div className="pt-cab">
      <div>
        <p className="sobretitulo">Financeiro</p>
        <h1>A receber</h1>
        <span className="fio" aria-hidden="true" />
        <p className="lede">As parcelas de todos os contratos, com a forma de pagamento e a cobrança de cada uma.</p>
      </div>
      {aoRegistrar ? (
        <button className="btn btn-pri" type="button" onClick={aoRegistrar} style={{ marginBottom: 6 }}>
          <Icone nome="moeda" className="ico" />
          Registrar recebimento
        </button>
      ) : null}
    </div>
  );
}

const MESES_TITULO = (hoje: string) => nomeDoMes(hoje);

function ReceberConteudo() {
  const hoje = hojeBrasilia();
  const [mostrar, setMostrar] = useState<MostrarReceber>("ABERTO");
  const [busca, setBusca] = useState("");
  const [q, setQ] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [forma, setForma] = useState("");
  const [agrupar, setAgrupar] = useState<"VENCIMENTO" | "CLIENTE">("VENCIMENTO");
  const [registrar, setRegistrar] = useState<ParcelaLinha | "escolher" | null>(null);
  const [feito, setFeito] = useState<Feito | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setQ(busca.trim()), 250);
    return () => clearTimeout(t);
  }, [busca]);
  const filtro = `mostrar=${mostrar}${q ? `&q=${encodeURIComponent(q)}` : ""}${responsavel ? `&responsavel=${responsavel}` : ""}${forma ? `&forma=${forma}` : ""}`;
  const { dados, recarregar } = useCarga<ListaReceber>(`/v1/escritorio/financeiro/receber?${filtro}`);

  if (dados === "erro") return <div className="fi"><CabReceber /><ErroAoCarregar oque="as parcelas" aoTentar={recarregar} /></div>;
  if (!dados) return <div className="fi"><CabReceber /><Carregando rotulo="Carregando as parcelas…" linhas={5} /></div>;
  if (!dados.algum) {
    return (
      <div className="fi">
        <CabReceber />
        <section className="folha" aria-labelledby="t-rec" style={{ overflow: "hidden" }}>
          <h2 id="t-rec" className="sr">Parcelas</h2>
          <Estado icone="carteira" titulo="Nenhuma parcela a receber ainda"
            acoes={<a className="btn btn-pri" href={ROTAS_CONTRATOS.contratos}><Icone nome="pena" className="ico" />Ir para Contratos</a>}>
            As parcelas saem das condições de cada contrato, na área Contratos, quando a assinatura é registrada. Ninguém digita parcela aqui.
          </Estado>
        </section>
      </div>
    );
  }
  const t = dados.totais;
  const lista = dados.parcelas;
  const numero = (v: MostrarReceber, rotulo: ReactNode, x: { valor: number; n: number }, rotN: string) => (
    <button type="button" aria-pressed={mostrar === v} onClick={() => setMostrar(v)}>
      <span className="r">{rotulo}</span>
      <b className="num">{reais(x.valor)}</b>
      <small>{contar(x.n, "parcela", "parcelas")}{rotN}</small>
    </button>
  );
  const grupos = agrupar === "CLIENTE" ? gruposPorCliente(lista) : mostrar === "RECEBIDO_MES"
    ? [{ chave: "mes", titulo: `Recebido em ${MESES_TITULO(hoje)}`, total: lista.reduce((s, p) => s + (p.noMes ?? 0), 0), parcelas: lista }]
    : gruposPorVencimento(lista, hoje);
  const filtrado = q || responsavel || forma;
  const nomeMostrar: Record<MostrarReceber, string> = { ABERTO: "em aberto", VENCIDAS: "vencidas", SETE_DIAS: "nos próximos 7 dias", RECEBIDO_MES: `recebidas em ${MESES_TITULO(hoje)}` };
  return (
    <div className="fi">
      <CabReceber aoRegistrar={() => setRegistrar("escolher")} />
      <div className="fi-nums" role="group" aria-label="Mostrar">
        {numero("ABERTO", "Em aberto", t.aberto, "")}
        {numero("VENCIDAS", <><Icone nome="alerta" className="ico" />Vencidas</>, t.vencidas, "")}
        {numero("SETE_DIAS", "Próximos 7 dias", t.seteDias, "")}
        {numero("RECEBIDO_MES", `Recebido em ${MESES_TITULO(hoje)}`, t.recebidoMes, "")}
      </div>
      <section className="folha" aria-labelledby="t-rec" style={{ overflow: "hidden" }}>
        <h2 id="t-rec" className="sr">Parcelas</h2>
        <Busca id="fi-busca" rotulo="Buscar por cliente ou contrato" dica="Cliente ou contrato" valor={busca} aoMudar={setBusca}>
          <label className="sr" htmlFor="fi-resp">Responsável</label>
          <select className="entrada" id="fi-resp" value={responsavel} onChange={(e) => setResponsavel(e.target.value)}>
            <option value="">Todos os responsáveis</option>
            {dados.responsaveis.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
          <label className="sr" htmlFor="fi-forma">Forma de pagamento</label>
          <select className="entrada" id="fi-forma" value={forma} onChange={(e) => setForma(e.target.value)}>
            <option value="">Todas as formas</option>
            {ORDEM_FORMAS.map((f) => <option key={f} value={f}>{FORMAS_PAGAMENTO[f]}</option>)}
          </select>
          <Chips rotulo="Agrupar" atual={agrupar} aoEscolher={(v) => setAgrupar(v as "VENCIMENTO" | "CLIENTE")}
            opcoes={[{ v: "VENCIMENTO", t: "Por vencimento" }, { v: "CLIENTE", t: "Por cliente" }]} />
        </Busca>
        <p className="hn-cont" role="status">
          <b>{contar(lista.length, "parcela", "parcelas")} {nomeMostrar[mostrar]}</b>
          {q ? <> para “{q}”</> : null}
          {mostrar === "RECEBIDO_MES" ? " · pelo dia em que o dinheiro entrou" : agrupar === "CLIENTE" ? " · por cliente e contrato" : " · da mais antiga para a mais nova"}
        </p>
        {lista.length ? (
          <table className="hn-tab fi-tab">
            <caption className="sr">Parcelas {nomeMostrar[mostrar]}</caption>
            <colgroup>{["9%", "25%", "18%", "26%", "11%", "11%"].map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
            <thead>
              <tr>
                <th scope="col">Vence</th><th scope="col">Cliente e contrato</th><th scope="col">Forma e cobrança</th><th scope="col">Situação</th>
                <th scope="col" style={{ textAlign: "right" }}>Valor</th><th scope="col"><span className="sr">Ação</span></th>
              </tr>
            </thead>
            {grupos.map((g) => (
              <tbody key={g.chave}>
                <tr className="fi-grupo">
                  <th colSpan={6} scope="rowgroup">{g.titulo} · {g.parcelas.length} <span><b className="num">{reais(g.total)}</b></span></th>
                </tr>
                {g.parcelas.map((p) => {
                  const venc = p.situacao === "VENCIDA";
                  const cob = textoCobranca(p.cobranca);
                  return (
                    <tr key={p.id} className={venc ? "fi-atraso" : undefined}>
                      <td><div className="fi-dt"><b className="num">{diaCurto(p.vencimento)}</b><small>{p.vencimento.slice(0, 4)}</small></div></td>
                      <td data-r="Cliente e contrato">
                        <div className="fi-quem">
                          <a href={ROTAS_FINANCEIRO.contrato(p.contrato.id)}>{p.cliente.nome}</a>
                          <small>{p.contrato.objeto} · {p.descricao} · {mesReferencia(p.vencimento, hoje)}</small>
                        </div>
                      </td>
                      <td data-r="Forma e cobrança">
                        <div className="fi-forma">
                          <b>{nomeForma(p.forma) ?? "Forma a combinar"}</b>
                          {cob ? <small>{cob}</small> : null}
                        </div>
                      </td>
                      <td data-r="Situação">
                        <div className="fi-sit">
                          <SeloDaParcela p={p} hoje={hoje} />
                          {venc || p.cobranca ? <MotivoEAcao p={p} hoje={hoje} /> : null}
                        </div>
                      </td>
                      <td data-r="Valor" className="fi-v num">{reais(p.noMes ?? p.falta)}</td>
                      <td data-r="" className="fi-acao hn-acao">
                        {p.situacao !== "PAGA" ? (
                          <button className="btn btn-sec btn-compacto" type="button" onClick={() => setRegistrar(p)}>
                            Registrar<span className="sr"> recebimento de {p.cliente.nome}, {p.descricao}</span>
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            ))}
          </table>
        ) : (
          <Estado icone="busca" titulo={filtrado ? "Nenhuma parcela encontrada" : "Nenhuma parcela aqui"}>
            {filtrado ? "Confira o nome do cliente ou o contrato, ou limpe os filtros." : mostrar === "VENCIDAS" ? "Nenhuma parcela vencida. Tudo em dia." : "Quando houver, elas aparecem nesta lista."}
          </Estado>
        )}
        <p className="pt-pe-folha">
          <Icone nome="pena" className="ico" />
          <span>As parcelas saem das condições de cada contrato, na área Contratos. O recebimento se registra à mão; Pix e boleto com baixa sozinha chegam quando o banco do escritório estiver ligado.</span>
        </p>
      </section>
      {registrar ? (
        <JanelaRegistrar parcela={registrar === "escolher" ? null : registrar} aoFechar={() => setRegistrar(null)}
          aoFeito={(f) => { setRegistrar(null); setFeito(f); recarregar(); }} />
      ) : null}
      {feito ? <Toast feito={feito} aoFechar={() => setFeito(null)} /> : null}
    </div>
  );
}

export function ReceberFinanceiro() {
  return <MolduraArea area="FINANCEIRO" secao="a-receber">{() => <ReceberConteudo />}</MolduraArea>;
}

// ------------------------------------------------------------------------- Registrar recebimento

function textoRecebido(p: Pick<ParcelaLinha, "descricao" | "vencimento">, r: RecebimentoRegistrado, valor: number, hoje: string): Feito {
  const ref = mesReferencia(p.vencimento, hoje);
  const base = r.paga ? `${p.descricao} (${ref}) foi baixada.` : `${reais(valor)} na ${p.descricao.toLowerCase()} (${ref}). Falta ${reais(r.falta)}.`;
  return { titulo: "Recebimento registrado.", texto: `${base}${r.recibo ? ` Recibo nº ${r.recibo.ano}-${numeroRecibo(r.recibo)}.` : ""}` };
}

function JanelaRegistrar({ parcela, aoFechar, aoFeito }: { parcela: ParcelaLinha | null; aoFechar: () => void; aoFeito: (f: Feito) => void }) {
  const hoje = hojeBrasilia();
  const [escolhida, setEscolhida] = useState<ParcelaLinha | null>(parcela);
  const [abertas, setAbertas] = useState<ParcelaLinha[] | null>(parcela ? [] : null);
  const [valor, setValor] = useState(parcela ? paraCampo(parcela.falta) : "");
  const [dia, setDia] = useState(diaBr(hoje));
  const [forma, setForma] = useState<FormaPagamento>(parcela?.forma ?? "PIX");
  const [multa, setMulta] = useState("");
  const [recibo, setRecibo] = useState(true);
  const [erros, setErros] = useState<string[]>([]);
  const [motivos, setMotivos] = useState<Record<string, string>>({});
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const corpo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (parcela) return;
    void chamarPortal<ListaReceber>("/v1/escritorio/financeiro/receber?mostrar=ABERTO").then((x) => setAbertas(x.ok ? x.dados.parcelas : []));
  }, [parcela]);

  const p = escolhida;
  const tem = (c: string) => erros.includes(c);
  const escolher = (id: string) => {
    const x = abertas?.find((a) => a.id === id) ?? null;
    setEscolhida(x);
    if (x) {
      setValor(paraCampo(x.falta));
      if (x.forma) setForma(x.forma);
    }
  };

  async function enviar() {
    const e: string[] = [];
    const m: Record<string, string> = {};
    const c = lerCentavos(valor);
    const d = lerDia(dia);
    const mj = multa.trim() ? lerCentavos(multa) : null;
    if (!p) e.push("parcela");
    if (!c) e.push("valor");
    else if (p && c > p.falta) { e.push("valor"); m.valor = "ACIMA"; }
    if (!d) e.push("recebidoEm");
    else if (d > hoje) { e.push("recebidoEm"); m.recebidoEm = "FUTURO"; }
    if (multa.trim() && !mj) e.push("multaJuros");
    setFalha(null);
    if (e.length || !p) {
      setErros(e);
      setMotivos(m);
      return focarPrimeiroErro(corpo.current);
    }
    setEnviando(true);
    const r = await chamarPortal<RecebimentoRegistrado>(`/v1/escritorio/financeiro/parcelas/${p.id}/recebimentos`, {
      metodo: "POST", corpo: { valor: c, multaJuros: mj, recebidoEm: d, forma, recibo },
    });
    setEnviando(false);
    if (r.ok) return aoFeito(textoRecebido(p, r.dados, c!, hoje));
    const det = r.erro.detalhes;
    const campos = det?.campos;
    if (r.erro.codigo === "VALIDATION_ERROR" && Array.isArray(campos) && campos.length) {
      setErros(campos.map(String));
      setMotivos(det?.motivo === "VALOR_ACIMA_DO_SALDO" ? { valor: "ACIMA" } : det?.motivo === "DATA_NO_FUTURO" ? { recebidoEm: "FUTURO" } : {});
      return focarPrimeiroErro(corpo.current);
    }
    setFalha(textoDoErro(r.erro));
  }

  const d = lerDia(dia);
  const ref = p ? `${nomeDoMes(p.vencimento)} de ${p.vencimento.slice(0, 4)}` : "";
  const outroMes = p && d && d.slice(0, 7) !== p.vencimento.slice(0, 7);
  return (
    <Janela id="j-registrar" classe="fi-larga" aberta aoFechar={aoFechar} sobretitulo="A receber" titulo="Registrar recebimento" descricao="j-registrar-d"
      aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-sec" type="button" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-pri" type="submit" disabled={enviando} aria-busy={enviando || undefined}>
            <Icone nome="check" className="ico" />
            Registrar recebimento
          </button>
        </>
      }>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id="j-registrar-d">Baixa a parcela e gera o recibo.</p>
        {erros.length ? <Aviso tom="urgencia" titulo={faltaAcertar(erros.length)}>O recebimento ainda não foi registrado.</Aviso> : null}
        {falha ? <Aviso tom="urgencia" titulo="O recebimento não foi registrado.">{falha}</Aviso> : null}
        {parcela ? null : (
          <div className="campo">
            <label htmlFor="rg-parcela">Parcela</label>
            <select className="entrada" id="rg-parcela" value={p?.id ?? ""} onChange={(e) => escolher(e.target.value)} data-foco=""
              aria-invalid={tem("parcela") || undefined} aria-describedby={descritoPor(!tem("parcela") && "rg-parcela-aj", tem("parcela") && "rg-parcela-er")}>
              <option value="">{abertas === null ? "Carregando as parcelas…" : abertas.length ? "Escolha a parcela" : "Nenhuma parcela em aberto"}</option>
              {(abertas ?? []).map((a) => (
                <option key={a.id} value={a.id}>{a.cliente.nome} · {a.descricao} · vence {diaCurto(a.vencimento)} · falta {reais(a.falta)}</option>
              ))}
            </select>
            {tem("parcela") ? <ErroCampo id="rg-parcela-er">Escolha a parcela que o dinheiro paga.</ErroCampo>
              : <p className="ajuda" id="rg-parcela-aj">Da mais antiga para a mais nova.</p>}
          </div>
        )}
        {p ? (
          <div className="fi-alvo">
            <Icone nome="carteira" className="ico" />
            <div>
              <strong>{p.cliente.nome} · {p.descricao.toLowerCase()}</strong>
              <small>{p.contrato.objeto} · {p.vencimento < hoje ? "venceu" : "vence"} em {dataBr(p.vencimento)}{p.forma ? ` · ${FORMAS_PAGAMENTO[p.forma]}` : ""}</small>
            </div>
            <span className="fi-v num">{reais(p.falta)}</span>
          </div>
        ) : null}
        <div className="fi-dois">
          <div className="campo">
            <label htmlFor="rg-valor">Valor recebido</label>
            <input className="entrada" id="rg-valor" type="text" inputMode="decimal" autoComplete="off" value={valor} onChange={(e) => setValor(e.target.value)}
              data-foco={parcela ? "" : undefined} aria-invalid={tem("valor") || undefined}
              aria-describedby={descritoPor(!tem("valor") && p && "rg-valor-aj", tem("valor") && "rg-valor-er")} />
            {tem("valor") ? (
              <ErroCampo id="rg-valor-er">
                {motivos.valor === "ACIMA" && p
                  ? `O valor passa do que falta nesta parcela (${reais(p.falta)}). Se pagou duas parcelas, registre uma de cada vez. Multa e juros vão no campo de baixo.`
                  : "Escreva o valor em reais. Ex.: 850,00."}
              </ErroCampo>
            ) : p ? <p className="ajuda" id="rg-valor-aj">Falta receber nesta parcela: {reais(p.falta)}.</p> : null}
          </div>
          <div className="campo">
            <label htmlFor="rg-data">Dia em que o dinheiro entrou</label>
            <input className="entrada" id="rg-data" type="text" inputMode="numeric" autoComplete="off" value={dia} onChange={(e) => setDia(e.target.value)}
              aria-invalid={tem("recebidoEm") || undefined} aria-describedby={descritoPor(!tem("recebidoEm") && "rg-data-aj", tem("recebidoEm") && "rg-data-er")} />
            {tem("recebidoEm") ? (
              <ErroCampo id="rg-data-er">{motivos.recebidoEm === "FUTURO" ? "Esta data é depois de hoje. Registre quando o dinheiro estiver na conta." : "Escreva a data no formato dd/mm/aaaa."}</ErroCampo>
            ) : <p className="ajuda" id="rg-data-aj">dd/mm/aaaa</p>}
          </div>
        </div>
        {p ? (
          <p className="fi-ref">
            <Icone nome="check" className="ico" />
            <span>
              Este recebimento baixa a <b>parcela de {ref}</b>{outroMes && d ? `, mesmo pago em ${nomeDoMes(d)}` : ""}. No caixa, ele entra no dia em que o dinheiro entrou.
            </span>
          </p>
        ) : null}
        <div className="fi-dois">
          <div className="campo">
            <label htmlFor="rg-forma">Forma de pagamento</label>
            <select className="entrada" id="rg-forma" value={forma} onChange={(e) => setForma(e.target.value as FormaPagamento)}>
              {ORDEM_FORMAS.map((f) => <option key={f} value={f}>{FORMAS_PAGAMENTO[f]}</option>)}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="rg-multa">Multa e juros <span className="opcional">(opcional)</span></label>
            <input className="entrada" id="rg-multa" type="text" inputMode="decimal" autoComplete="off" value={multa} onChange={(e) => setMulta(e.target.value)}
              aria-invalid={tem("multaJuros") || undefined} aria-describedby={descritoPor(!tem("multaJuros") && "rg-multa-aj", tem("multaJuros") && "rg-multa-er")} />
            {tem("multaJuros") ? <ErroCampo id="rg-multa-er">Escreva o valor em reais, ou deixe em branco.</ErroCampo>
              : <p className="ajuda" id="rg-multa-aj">O que o cliente pagou a mais pelo atraso. Deixe em branco se não cobrou.</p>}
          </div>
        </div>
        <p className="fi-caixa-fixa">
          <Icone nome="coluna" className="ico" />
          <span>Entra no caixa <b>do escritório</b>: é honorário. Valores de terceiros se registram em Repasses.</span>
        </p>
        <label className="opcao">
          <input className="marcar" type="checkbox" checked={recibo} onChange={(e) => setRecibo(e.target.checked)} />
          <span>
            Gerar o recibo
            <small>O recibo ganha o número seguinte do escritório. O envio pelo WhatsApp chega quando o número do escritório estiver ligado.</small>
          </span>
        </label>
      </div>
    </Janela>
  );
}

// ------------------------------------------------------------------------- Anotar cobrança

function JanelaCobranca({ p, pessoas, eu, aoFechar, aoFeito }: {
  p: ParcelaLinha; pessoas: Pessoa[]; eu: string; aoFechar: () => void; aoFeito: (f: Feito) => void;
}) {
  const hoje = hojeBrasilia();
  const atual = p.cobranca;
  const meuId = pessoas.find((x) => x.nome === eu)?.id ?? "";
  const [tipo, setTipo] = useState<TipoCobranca>("LIGACAO");
  const [texto, setTexto] = useState("");
  const [motivo, setMotivo] = useState("");
  const [forma, setForma] = useState<string>(p.forma ?? "");
  const [data, setData] = useState("");
  const [oque, setOque] = useState("");
  const [resp, setResp] = useState(atual?.proxResponsavel.id ?? p.responsavel.id ?? meuId);
  const [erros, setErros] = useState<string[]>([]);
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const corpo = useRef<HTMLDivElement>(null);
  const tem = (c: string) => erros.includes(c);
  const precisaMotivo = p.situacao === "VENCIDA" && !atual?.motivo;

  async function enviar() {
    const e: string[] = [];
    const d = lerDia(data);
    if (precisaMotivo && motivo.trim().length < 3) e.push("motivo");
    if (!d || d < hoje) e.push("proxData");
    if (oque.trim().length < 3) e.push("proxOque");
    if (!resp) e.push("proxResponsavelId");
    setFalha(null);
    if (e.length) {
      setErros(e);
      return focarPrimeiroErro(corpo.current);
    }
    setEnviando(true);
    const r = await chamarPortal<{ id: string }>(`/v1/escritorio/financeiro/parcelas/${p.id}/cobranca`, {
      metodo: "POST",
      corpo: { tipo, texto: texto.trim() || null, motivo: motivo.trim() || null, proxData: d, proxOque: oque.trim(), proxResponsavelId: resp, forma: forma || null },
    });
    setEnviando(false);
    if (r.ok) {
      const quem = pessoas.find((x) => x.id === resp)?.nome ?? "";
      return aoFeito({ titulo: "Cobrança anotada.", texto: `Próxima ação, ${quandoAcao(d!, hoje)}: ${oque.trim()} · ${primeiroNome(quem)}.` });
    }
    const campos = r.erro.detalhes?.campos;
    if (r.erro.codigo === "VALIDATION_ERROR" && Array.isArray(campos) && campos.length) {
      setErros(campos.map(String));
      return focarPrimeiroErro(corpo.current);
    }
    setFalha(textoDoErro(r.erro));
  }

  return (
    <Janela id="j-cobranca" classe="fi-larga" aberta aoFechar={aoFechar} sobretitulo={`${p.cliente.nome} · ${p.descricao.toLowerCase()}`} titulo="Anotar cobrança"
      descricao="j-cobranca-d" aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-sec" type="button" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-pri" type="submit" disabled={enviando} aria-busy={enviando || undefined}>
            <Icone nome="check" className="ico" />
            Anotar cobrança
          </button>
        </>
      }>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id="j-cobranca-d">O que foi feito e o que vem depois. Toda parcela em aberto com cobrança tem uma próxima ação, com data e responsável.</p>
        {erros.length ? <Aviso tom="urgencia" titulo={faltaAcertar(erros.length)}>A cobrança ainda não foi anotada.</Aviso> : null}
        {falha ? <Aviso tom="urgencia" titulo="A cobrança não foi anotada.">{falha}</Aviso> : null}
        <fieldset className="fi-grupo-op">
          <legend>O que foi feito</legend>
          <Chips rotulo="O que foi feito" atual={tipo} aoEscolher={(v) => setTipo(v as TipoCobranca)}
            opcoes={(Object.keys(TIPOS_COBRANCA) as TipoCobranca[]).map((v) => ({ v, t: TIPOS_COBRANCA[v] }))} />
        </fieldset>
        <div className="campo">
          <label htmlFor="cb-texto">Como foi <span className="opcional">(opcional)</span></label>
          <textarea className="entrada" id="cb-texto" rows={2} value={texto} onChange={(e) => setTexto(e.target.value)} data-foco="" maxLength={1000} />
        </div>
        <div className="fi-dois">
          <div className="campo">
            <label htmlFor="cb-motivo">Motivo do atraso{precisaMotivo ? null : <> <span className="opcional">(opcional)</span></>}</label>
            <input className="entrada" id="cb-motivo" type="text" autoComplete="off" value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={300}
              aria-invalid={tem("motivo") || undefined} aria-describedby={descritoPor(!tem("motivo") && "cb-motivo-aj", tem("motivo") && "cb-motivo-er")} />
            {tem("motivo") ? <ErroCampo id="cb-motivo-er">Escreva por que a parcela atrasou. Ex.: está desempregada e pediu para pagar depois do acordo.</ErroCampo>
              : <p className="ajuda" id="cb-motivo-aj">{atual?.motivo ? `Hoje: ${atual.motivo}. Escreva só se mudou.` : "Por que o cliente não pagou, nas palavras dele."}</p>}
          </div>
          <div className="campo">
            <label htmlFor="cb-forma">Forma combinada <span className="opcional">(opcional)</span></label>
            <select className="entrada" id="cb-forma" value={forma} onChange={(e) => setForma(e.target.value)}>
              <option value="">A combinar</option>
              {ORDEM_FORMAS.map((f) => <option key={f} value={f}>{FORMAS_PAGAMENTO[f]}</option>)}
            </select>
          </div>
        </div>
        <fieldset className="fi-grupo-op">
          <legend>Próxima ação</legend>
          <div style={{ display: "grid", gap: 16 }}>
            <div className="campo">
              <label htmlFor="cb-oque">O que fazer</label>
              <input className="entrada" id="cb-oque" type="text" autoComplete="off" value={oque} onChange={(e) => setOque(e.target.value)} maxLength={300}
                aria-invalid={tem("proxOque") || undefined} aria-describedby={descritoPor(tem("proxOque") && "cb-oque-er")} />
              {tem("proxOque") ? <ErroCampo id="cb-oque-er">Escreva o que fazer. Ex.: ligar para a esposa.</ErroCampo> : null}
            </div>
            <div className="fi-dois">
              <div className="campo">
                <label htmlFor="cb-data">Quando</label>
                <input className="entrada" id="cb-data" type="text" inputMode="numeric" autoComplete="off" value={data} onChange={(e) => setData(e.target.value)}
                  aria-invalid={tem("proxData") || undefined} aria-describedby={descritoPor(!tem("proxData") && "cb-data-aj", tem("proxData") && "cb-data-er")} />
                {tem("proxData") ? <ErroCampo id="cb-data-er">Escreva hoje ou depois, no formato dd/mm/aaaa.</ErroCampo> : <p className="ajuda" id="cb-data-aj">dd/mm/aaaa</p>}
              </div>
              <div className="campo">
                <label htmlFor="cb-resp">Quem faz</label>
                <select className="entrada" id="cb-resp" value={resp} onChange={(e) => setResp(e.target.value)}
                  aria-invalid={tem("proxResponsavelId") || undefined} aria-describedby={descritoPor(tem("proxResponsavelId") && "cb-resp-er")}>
                  <option value="">Escolha</option>
                  {pessoas.map((x) => <option key={x.id} value={x.id}>{x.nome === eu ? `${x.nome} (você)` : x.nome}</option>)}
                </select>
                {tem("proxResponsavelId") ? <ErroCampo id="cb-resp-er">Escolha quem da equipe faz.</ErroCampo> : null}
              </div>
            </div>
          </div>
        </fieldset>
      </div>
    </Janela>
  );
}

// ------------------------------------------------------------------------- Parcelas de um contrato

function DirParcelas({ f, hoje, aoRegistrar }: { f: ParcelasContrato; hoje: string; aoRegistrar: (p: ParcelaDoContrato) => void }) {
  const vencidas = f.parcelas.filter((p) => p.situacao === "VENCIDA");
  const proxima = f.parcelas.find((p) => p.situacao === "A_VENCER" || p.situacao === "PARCIAL");
  const botao = (p: ParcelaDoContrato) => (
    <button className="btn btn-pri" type="button" onClick={() => aoRegistrar(p)}>
      <Icone nome="moeda" className="ico" />
      Registrar recebimento
    </button>
  );
  if (vencidas.length) {
    const v = vencidas[0]!;
    const d = diasEntre(v.vencimento, hoje);
    const c = v.cobranca;
    return (
      <section className="dir campo-ambar" aria-labelledby="t-dir">
        <p className="sobretitulo" id="t-dir">Em atraso</p>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <p className="grande num">{reais(f.totais.atraso)}</p>
          <Selo tom="urgente" icone="alerta">{d} {d === 1 ? "dia" : "dias"}</Selo>
        </div>
        <p className="fi-oque">
          <b>{v.descricao}, de {mesReferencia(v.vencimento, hoje)}.</b> Venceu em {diaCurto(v.vencimento)}.
          {vencidas.length > 1 ? ` E mais ${contar(vencidas.length - 1, "parcela vencida", "parcelas vencidas")}.` : ""}
          <br />
          {c ? `Próxima ação: ${quandoAcao(c.proxData, hoje)}, ${c.proxOque} · ${primeiroNome(c.proxResponsavel.nome)}.` : "Sem cobrança anotada ainda."}
        </p>
        {botao(v)}
      </section>
    );
  }
  if (proxima) {
    return (
      <section className="dir campo-ambar" aria-labelledby="t-dir">
        <p className="sobretitulo" id="t-dir">Em dia</p>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <p className="grande num">{reais(proxima.falta)}</p>
          <SeloDaParcela p={proxima} hoje={hoje} />
        </div>
        <p className="fi-oque"><b>Próxima: {proxima.descricao.toLowerCase()}, de {mesReferencia(proxima.vencimento, hoje)}.</b><br />Vence em {diaCurto(proxima.vencimento)}.</p>
        {botao(proxima)}
      </section>
    );
  }
  return (
    <section className="dir campo-ambar" aria-labelledby="t-dir">
      <p className="sobretitulo" id="t-dir">Tudo recebido</p>
      <p className="grande num">{reais(f.totais.recebido)}</p>
      <p className="fi-oque"><b>Nenhuma parcela em aberto.</b>{f.aguardandoBase ? <><br />{contar(f.aguardandoBase, "parcela espera", "parcelas esperam")} a base do mês, em Contratos.</> : null}</p>
    </section>
  );
}

function SituacaoNaFicha({ p, hoje }: { p: ParcelaDoContrato; hoje: string }) {
  let nota: string | null = null;
  if (p.situacao === "PAGA" && p.pagaEm) {
    const atraso = diasEntre(p.vencimento, p.pagaEm);
    if (atraso > 0) nota = `${contar(atraso, "dia", "dias")} de atraso; baixou ${mesReferencia(p.vencimento, hoje)}${p.pagaEm.slice(0, 7) !== p.vencimento.slice(0, 7) ? `, no caixa entrou em ${nomeDoMes(p.pagaEm)}` : ""}.`;
  } else if (p.situacao === "PARCIAL" || (p.situacao === "VENCIDA" && p.recebido > 0)) {
    nota = `Recebido ${reais(p.recebido)} de ${reais(p.valor)}.`;
  } else if (p.situacao === "CANCELADA" && p.cancelado) {
    nota = p.cancelado.motivo;
  } else if (p.cobranca && p.situacao === "VENCIDA") {
    nota = `${textoCobranca(p.cobranca)}.`;
  }
  return (
    <div className="fi-sit">
      <SeloDaParcela p={p} hoje={hoje} />
      {nota ? <p className="fi-motivo">{nota}</p> : null}
    </div>
  );
}

const NOME_EVENTO: Record<string, string> = { LIGACAO: "ligou", MENSAGEM: "mandou mensagem", ANOTACAO: "anotou", PASSADA: "" };

function Cobranca({ p, hoje, aoAnotar }: { p: ParcelaDoContrato | null; hoje: string; aoAnotar: () => void }) {
  const c = p?.cobranca;
  return (
    <section className="folha" aria-labelledby="t-cob" style={{ overflow: "hidden" }}>
      <div className="folha-cab">
        <div>
          <h2 id="t-cob"><Icone nome="sino" className="ico" />Cobrança</h2>
          {p ? <p className="sub">{p.descricao}, de {mesReferencia(p.vencimento, hoje)}</p> : null}
        </div>
      </div>
      {!p ? (
        <p className="fi-cob-sem">Nenhuma parcela em aberto. A cobrança volta a aparecer quando houver o que receber.</p>
      ) : (
        <div className="fi-cob">
          {c ? (
            <dl>
              {c.motivo ? (
                <div><dt>Motivo do atraso</dt><dd>{c.motivo}<small>anotado por {c.autor.nome} em {diaCurto(diaDoInstante(c.motivoDesde ?? c.em))}</small></dd></div>
              ) : null}
              <div>
                <dt>Próxima ação</dt>
                <dd>
                  {quandoAcao(c.proxData, hoje).replace(/^./, (x) => x.toUpperCase())}: {c.proxOque}
                  <small>responsável: {c.proxResponsavel.nome}</small>
                </dd>
              </div>
            </dl>
          ) : (
            <p style={{ fontSize: 13, lineHeight: 1.5 }}>{p.situacao === "VENCIDA" ? "Parcela vencida sem cobrança anotada. Anote o motivo e a próxima ação." : "Nada anotado nesta parcela ainda."}</p>
          )}
          <button className="btn btn-sec" type="button" onClick={aoAnotar}>
            <Icone nome="lapis" className="ico" />
            Anotar cobrança
          </button>
        </div>
      )}
      {p && p.eventos.length ? (
        <div className="eventos-dia" style={{ paddingTop: 0 }}>
          <h3>Histórico de cobrança</h3>
          <ol className="eventos">
            {p.eventos.map((e, i) => (
              <li key={`${e.em}-${i}`}>
                <time dateTime={e.em}>{diaCurto(diaDoInstante(e.em))}</time>
                <span className={i === 0 ? "pto forte" : "pto"} aria-hidden="true" />
                <div>
                  <p>
                    {e.tipo === "PASSADA"
                      ? <>Próxima ação passada a <b>{e.proxResponsavel.nome}</b>, que ficou com o trabalho de quem saiu</>
                      : <><b>{e.autor.nome}</b> {NOME_EVENTO[e.tipo]}, às {horaDoInstante(e.em)}</>}
                  </p>
                  <small>
                    {e.texto && e.tipo !== "PASSADA" ? `${e.texto} ` : ""}
                    {e.motivo ? <>Motivo anotado: <b>{e.motivo}</b>. </> : null}
                    Próxima: {diaCurto(e.proxData)}, {e.proxOque}.
                  </small>
                </div>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
}

function ParcelasConteudo({ id, escritorio, aoNome }: { id: string; escritorio: EscritorioPortal; aoNome: (n: string) => void }) {
  const hoje = hojeBrasilia();
  const { dados, recarregar } = useCarga<ParcelasContrato>(`/v1/escritorio/financeiro/contratos/${id}`);
  const pessoas = usePessoas();
  const [registrar, setRegistrar] = useState<ParcelaDoContrato | null>(null);
  const [anotar, setAnotar] = useState(false);
  const [carne, setCarne] = useState(false);
  const [feito, setFeito] = useState<Feito | null>(null);
  const nome = dados && dados !== "erro" ? dados.cliente.nome : null;
  useEffect(() => {
    if (nome) aoNome(nome);
  }, [nome, aoNome]);

  if (dados === "erro") return <ErroAoCarregar oque="as parcelas do contrato" aoTentar={recarregar} />;
  if (!dados) return <Carregando rotulo="Carregando as parcelas…" linhas={5} />;
  const f = dados;
  const emCobranca = f.parcelas.find((p) => p.situacao === "VENCIDA") ?? f.parcelas.find((p) => p.situacao === "PARCIAL" || p.situacao === "A_VENCER") ?? null;
  const verContrato = escritorio.areas.includes("CONTRATOS") ? (
    <a className="btn btn-sec" href={ROTAS_CONTRATOS.contrato(f.id)}><Icone nome="pena" className="ico" />Ver o contrato</a>
  ) : undefined;
  const vivas = f.parcelas.filter((p) => p.situacao !== "CANCELADA");
  return (
    <div className="fi">
      <div className="ficha-cab">
        <div className="esq campo-vinho">
          <Icone nome="coluna" className="ico estatua" />
          <a className="voltar" href={ROTAS_FINANCEIRO.receber}>
            <Icone nome="esquerda" className="ico ico-s" />
            A receber
          </a>
          <div className="ident">
            <div>
              <p className="sobretitulo">Contrato {f.numero} · {f.objeto}</p>
              <h1>{f.cliente.nome}</h1>
              <p className="meta">
                <span className="selo selo-ativo" style={{ background: "var(--ambar-3)", color: "var(--vinho)" }}>{f.situacao === "ATIVO" ? "Vigente" : "Encerrado"}</span>
                <span>{contar(vivas.length, "parcela", "parcelas")} · {reais(f.totais.contratado)}</span>
                <span className="sep" aria-hidden="true" />
                <span>responsável {f.responsavel.nome}</span>
              </p>
            </div>
          </div>
        </div>
        <DirParcelas f={f} hoje={hoje} aoRegistrar={setRegistrar} />
      </div>
      <div className="fi-grade">
        <div className="fi-col">
          <section className="folha" aria-labelledby="t-parc" style={{ overflow: "hidden" }}>
            <div className="folha-cab">
              <div>
                <h2 id="t-parc">Parcelas</h2>
                <p className="sub">Cada parcela guarda o mês a que se refere, mesmo quando é paga depois.</p>
              </div>
              <div className="acoes">
                {f.situacao === "ATIVO" && vivas.some((p) => p.situacao !== "PAGA") ? <BotaoCarne aoAbrir={() => setCarne(true)} /> : null}
                {verContrato}
              </div>
            </div>
            <dl className="fi-quatro">
              <div><dt>Contratado</dt><dd className="num">{reais(f.totais.contratado)}</dd></div>
              <div><dt>Recebido</dt><dd className="num">{reais(f.totais.recebido)}</dd></div>
              <div><dt>Em atraso</dt><dd className={f.totais.atraso ? "num urg" : "num"}>{reais(f.totais.atraso)}</dd></div>
              <div><dt>A vencer</dt><dd className="num">{reais(f.totais.aVencer)}</dd></div>
            </dl>
            {f.parcelas.length ? (
              <table className="hn-tab fi-tab">
                <caption className="sr">Parcelas do contrato</caption>
                <colgroup>{["21%", "11%", "9%", "28%", "14%", "17%"].map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
                <thead>
                  <tr>
                    <th scope="col">Parcela</th><th scope="col">Vence</th><th scope="col">Forma</th><th scope="col">Situação</th>
                    <th scope="col" style={{ textAlign: "right" }}>Valor</th><th scope="col">Recibo</th>
                  </tr>
                </thead>
                <tbody>
                  {f.parcelas.map((p) => {
                    const recibos = p.pagamentos.filter((x) => x.recibo);
                    const cls = p.situacao === "VENCIDA" ? "fi-atraso" : p.situacao === "PAGA" ? "fi-pago" : p.situacao === "CANCELADA" ? "fi-cancelada" : undefined;
                    return (
                      <tr key={p.id} className={cls}>
                        <td><div className="fi-dt"><b>{p.descricao}</b><small>{mesReferencia(p.vencimento, hoje)}</small></div></td>
                        <td data-r="Vence" className="num">{p.vencimento.slice(0, 4) === hoje.slice(0, 4) ? diaCurto(p.vencimento) : dataBr(p.vencimento)}</td>
                        <td data-r="Forma">{nomeForma(p.forma) ?? "—"}</td>
                        <td data-r="Situação"><SituacaoNaFicha p={p} hoje={hoje} /></td>
                        <td data-r="Valor" className="fi-v num">{reais(p.valor)}</td>
                        <td data-r="Recibo">
                          {recibos.length ? (
                            <div className="fi-docs">
                              {recibos.map((x) => (
                                <span key={x.id} className="fi-pq" style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 32 }}>
                                  <Icone nome="doc" className="ico ico-s" />Recibo {numeroRecibo(x.recibo!)}
                                </span>
                              ))}
                            </div>
                          ) : p.situacao === "VENCIDA" || p.situacao === "PARCIAL" ? (
                            <button className="btn btn-sec btn-compacto" type="button" onClick={() => setRegistrar(p)}>
                              Registrar<span className="sr"> recebimento da {p.descricao.toLowerCase()}</span>
                            </button>
                          ) : <span className="fi-pq">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <Estado icone="relogio" titulo="Nenhuma parcela com valor ainda">
                As parcelas deste contrato dependem da base do mês ou de uma etapa do caso. Quando o valor existir, elas aparecem aqui.
              </Estado>
            )}
            {f.aguardandoBase ? (
              <p className="pt-pe-folha"><Icone nome="relogio" className="ico" /><span>{contar(f.aguardandoBase, "parcela espera", "parcelas esperam")} a base do mês para ter valor. Ela se informa em Contratos, em Honorários.</span></p>
            ) : null}
          </section>
          {f.adiantados?.length ? <AdiantadoNoCaso contas={f.adiantados} /> : null}
        </div>
        <aside className="fi-col" aria-label="Carnê e cobrança">
          <FolhaCarne contrato={f.id} area="FINANCEIRO" escritorio={escritorio} aberta={carne} aoAbrir={() => setCarne(true)} aoFechar={() => setCarne(false)} />
          <Cobranca p={emCobranca} hoje={hoje} aoAnotar={() => setAnotar(true)} />
        </aside>
      </div>
      {registrar ? (
        <JanelaRegistrar parcela={registrar} aoFechar={() => setRegistrar(null)}
          aoFeito={(x) => { setRegistrar(null); setFeito(x); recarregar(); }} />
      ) : null}
      {anotar && emCobranca ? (
        <JanelaCobranca p={emCobranca} pessoas={pessoas} eu={escritorio.pessoa} aoFechar={() => setAnotar(false)}
          aoFeito={(x) => { setAnotar(false); setFeito(x); recarregar(); }} />
      ) : null}
      {feito ? <Toast feito={feito} aoFechar={() => setFeito(null)} /> : null}
    </div>
  );
}

/** O que o escritório adiantou nos casos deste contrato e como volta (F3.23, FI-07). */
function AdiantadoNoCaso({ contas }: { contas: ContaPagar[] }) {
  return (
    <section className="folha" aria-labelledby="t-adi" style={{ overflow: "hidden" }}>
      <div className="folha-cab">
        <div>
          <h2 id="t-adi"><Icone nome="reenviar" className="ico" />Adiantado pelo escritório neste caso</h2>
          <p className="sub">Vira valor a reembolsar pelo cliente, ligado a este caso.</p>
        </div>
      </div>
      <ul className="fi-linhas">
        {contas.map((c) => (
          <li key={c.id} className="fi-linha" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
            <div className="fi-quem">
              <strong>{c.descricao}</strong>
              <small>
                {c.pagaEm ? `Paga pelo escritório em ${diaCurto(c.pagaEm)}` : `Vence em ${diaCurto(c.vencimento)}, ainda não paga`}
                {c.adiantada?.caso ? ` · ${c.adiantada.caso.nome}` : ""} · categoria “{CATEGORIAS_SAIDA[c.categoria]}”
              </small>
              {c.adiantada && !c.adiantada.reembolsadoEm ? (
                <p className="fi-prox"><Icone nome="relogio" className="ico" />Reembolso combinado: <b>{comoVolta(c)}</b></p>
              ) : null}
            </div>
            <div className="fi-lado">
              <span className="fi-v num">{reais(c.valorPago ?? c.valor)}</span>
              {c.adiantada?.reembolsadoEm
                ? <Selo tom="ok" icone="check">Reembolsado em {diaCurto(c.adiantada.reembolsadoEm)}</Selo>
                : <Selo tom="atencao">A reembolsar</Selo>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ParcelasContratoFinanceiro({ id }: { id: string }) {
  const [nome, setNome] = useState("Contrato");
  return (
    <MolduraArea area="FINANCEIRO" secao="a-receber" trilha={[{ nome }]} pagina="co-ficha co-carteira">
      {(e) => <ParcelasConteudo id={id} escritorio={e} aoNome={setNome} />}
    </MolduraArea>
  );
}
