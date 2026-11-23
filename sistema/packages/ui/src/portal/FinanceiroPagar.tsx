"use client";
// Financeiro do Portal, A pagar (FI-01, FI-02, FI-07, FI-13, FI-20), desenho aprovado em
// docs/design/aprovadas/portal-financeiro (estados pagar e nova-conta; decisões 8 e 9): os
// quatro números do alto, as contas com categoria e origem, o adiantado por cliente que vira
// reembolso, as saídas do mês por categoria, e as janelas de lançar conta, marcar paga e
// registrar o reembolso. Nada se apaga: a conta só ganha o pagamento e o reembolso.
// A coluna "Nota ou guia" e o arquivo em Lançar conta são do F3.22 (FI-18): conta sem nota
// ganha o selo de atenção e pode receber o arquivo depois. A parcela de empréstimo (F3.51, desenho em
// portal-financeiro-emprestimos) entra na lista com o selo que leva à ficha e fica fora do total das
// saídas por categoria, abaixo de um divisor.

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  CATEGORIAS_LANCAR, CATEGORIAS_SAIDA, dataBr, formatarCnj, FORMAS_PAGAMENTO, hojeBrasilia, reais, REEMBOLSO_COMO,
  textoAnexado, type Anexo, type CategoriaAnexo,
  type CategoriaSaida, type ContaPagar, type FormaPagamento, type ListaClientes, type ListaPagar, type ParaAdiantar, type ParcelaDoReembolso, type MostrarPagar, type ReembolsoComo,
} from "@t3jus/domain";
import { abrirAnexo, CampoAnexo, enviarAnexo, useAnexosFinanceiro } from "./Anexos.tsx";
import { textoDoErro } from "../api.ts";
import { Icone } from "../Icone.tsx";
import { Aviso, Carregando, descritoPor, ErroAoCarregar, ErroCampo, Estado, faltaAcertar, focarPrimeiroErro, Janela } from "../console/pecas.tsx";
import { contar, diaBr, diaCurto, lerDia, nomeDoMes } from "./agenda.ts";
import { Selo, useCarga } from "./Comercial.tsx";
import { Toast } from "./FichaCliente.tsx";
import { comoVolta, origemConta, quandoConta, ROTAS_FINANCEIRO } from "./financeiro.ts";
import { centavos as lerCentavos } from "./honorarios.ts";
import { chamarPortal } from "./Moldura.tsx";
import { MolduraArea } from "./MolduraArea.tsx";
import { ListaRecorrentes } from "./Recorrentes.tsx";

type Feito = { titulo: string; texto: string };

// Lançar conta não oferece Empréstimos: a parcela nasce do empréstimo, no Caixa (F3.51).
const ORDEM_CATEGORIAS = Object.keys(CATEGORIAS_LANCAR) as CategoriaSaida[];
const ORDEM_FORMAS = Object.keys(FORMAS_PAGAMENTO) as FormaPagamento[];
const ORDEM_COMO = Object.keys(REEMBOLSO_COMO) as ReembolsoComo[];
const paraCampo = (c: number) => reais(c).replace(/^R\$\s?/, "");
const nomeCliente = (c: ContaPagar) => c.adiantada?.cliente.nome ?? "";


/** O selo da parcela de empréstimo, com o link para a ficha (F3.51). */
function SeloEmprestimo({ e }: { e: NonNullable<ContaPagar["emprestimo"]> }) {
  const qual = e.parcela ? `${e.parcela}/${e.total}` : "devolução";
  // O nome acessível começa pelo texto visível (WCAG 2.5.3, regra label-content-name-mismatch do axe).
  return (
    <a className="em-selo-link" href={ROTAS_FINANCEIRO.emprestimo(e.id)} aria-label={`Empréstimo · ${qual}: abrir a ficha de ${e.credor}`}>
      <span className="em-selo"><Icone nome="trocar" className="ico" />Empréstimo · {qual}</span>
    </a>
  );
}

function CabPagar({ aoLancar }: { aoLancar?: () => void }) {
  return (
    <div className="pt-cab">
      <div>
        <p className="sobretitulo">Financeiro</p>
        <h1>A pagar</h1>
        <span className="fio" aria-hidden="true" />
        <p className="lede">Contas do escritório, as que se repetem todo mês e o que foi adiantado por cliente.</p>
      </div>
      {aoLancar ? (
        <button className="btn btn-pri" type="button" onClick={aoLancar} style={{ marginBottom: 6 }}>
          <Icone nome="mais" className="ico" />
          Lançar conta
        </button>
      ) : null}
    </div>
  );
}

const TITULO_LISTA: Record<MostrarPagar, (mes: string) => { titulo: string; sub: string }> = {
  SEMANA: () => ({ titulo: "Vencem esta semana", sub: "Da mais próxima para a mais distante" }),
  VENCIDAS: () => ({ titulo: "Vencidas", sub: "Contas que passaram do vencimento sem pagamento" }),
  MES: (mes) => ({ titulo: `Contas de ${nomeDoMes(mes)}`, sub: "Pagas e a pagar, pelo vencimento" }),
  RECORRENTES: (mes) => ({ titulo: `Recorrentes de ${nomeDoMes(mes)}`, sub: "As que se repetem todo mês" }),
};

function PagarConteudo() {
  const hoje = hojeBrasilia();
  const [mostrar, setMostrar] = useState<MostrarPagar>("SEMANA");
  const [lancar, setLancar] = useState(false);
  // Vindo dos primeiros passos do Resumo (?lancar=1), a janela já abre.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (!q.has("lancar")) return;
    q.delete("lancar");
    window.history.replaceState(null, "", `${window.location.pathname}${q.size ? `?${q}` : ""}`);
    void Promise.resolve().then(() => setLancar(true));
  }, []);
  const [pagar, setPagar] = useState<ContaPagar | null>(null);
  const [reembolso, setReembolso] = useState<ContaPagar | null>(null);
  const [anexar, setAnexar] = useState<ContaPagar | null>(null);
  const [feito, setFeito] = useState<Feito | null>(null);
  const [falhaAbrir, setFalhaAbrir] = useState<string | null>(null);
  const { dados, recarregar } = useCarga<ListaPagar>(`/v1/escritorio/financeiro/pagar?mostrar=${mostrar}`);
  const anexos = useAnexosFinanceiro(dados && dados !== "erro" ? dados.contas.map((c) => c.id) : [], []);
  const terminar = (f: Feito) => {
    setLancar(false);
    setPagar(null);
    setReembolso(null);
    setAnexar(null);
    setFeito(f);
    recarregar();
    anexos.recarregar();
  };
  async function abrir(a: Anexo) {
    setFalhaAbrir(null);
    const e = await abrirAnexo(a.id);
    if (e) setFalhaAbrir(e);
  }
  const janelas = (
    <>
      {lancar ? <JanelaLancar aoFechar={() => setLancar(false)} aoFeito={terminar} /> : null}
      {pagar ? <JanelaPaga conta={pagar} aoFechar={() => setPagar(null)} aoFeito={terminar} /> : null}
      {reembolso ? <JanelaReembolso conta={reembolso} aoFechar={() => setReembolso(null)} aoFeito={terminar} /> : null}
      {anexar ? <JanelaAnexarConta conta={anexar} aoFechar={() => setAnexar(null)} aoFeito={terminar} /> : null}
      {feito ? <Toast feito={feito} aoFechar={() => setFeito(null)} /> : null}
    </>
  );

  if (dados === "erro") return <div className="fi"><CabPagar /><ErroAoCarregar oque="as contas" aoTentar={recarregar} /></div>;
  if (!dados) return <div className="fi"><CabPagar /><Carregando rotulo="Carregando as contas…" linhas={5} /></div>;
  if (!dados.algum) {
    return (
      <div className="fi">
        <CabPagar aoLancar={() => setLancar(true)} />
        <section className="folha" aria-labelledby="t-contas" style={{ overflow: "hidden" }}>
          <h2 id="t-contas" className="sr">Contas</h2>
          <Estado icone="moeda" titulo="Nenhuma conta lançada ainda"
            acoes={<button className="btn btn-pri" type="button" onClick={() => setLancar(true)}><Icone nome="mais" className="ico" />Lançar conta</button>}>
            Lance as contas fixas (aluguel, folha, impostos e sistemas). Marque “Repete todo mês” e elas aparecem sozinhas nos meses seguintes.
          </Estado>
        </section>
        {janelas}
      </div>
    );
  }

  const t = dados.totais;
  const cab = TITULO_LISTA[mostrar](dados.mes);
  const numero = (v: MostrarPagar, rotulo: ReactNode, valor: ReactNode, pe: string) => (
    <button type="button" aria-pressed={mostrar === v} onClick={() => setMostrar(v)}>
      <span className="r">{rotulo}</span>
      <b className="num">{valor}</b>
      <small>{pe}</small>
    </button>
  );
  const nenhumaOu = (n: number) => (n ? contar(n, "conta", "contas") : "nenhuma");
  // As parcelas de empréstimo ficam à parte, fora do total das saídas do mês (F3.51).
  const doDia = dados.categorias.filter((c) => c.categoria !== "EMPRESTIMOS");
  const deEmprestimo = dados.categorias.find((c) => c.categoria === "EMPRESTIMOS");
  const maior = Math.max(1, ...doDia.map((c) => c.valor));
  const totalMes = doDia.reduce((s, c) => s + c.valor, 0);
  const emprestimosSemana = dados.contas.filter((c) => c.emprestimo).length;
  const totalReembolso = dados.adiantados.reduce((s, c) => s + (c.valorPago ?? c.valor), 0);
  const clientesReembolso = new Set(dados.adiantados.map((c) => c.adiantada?.cliente.id)).size;
  return (
    <div className="fi">
      <CabPagar aoLancar={() => setLancar(true)} />
      <div className="fi-nums" role="group" aria-label="Mostrar">
        {numero("SEMANA", "Vencem esta semana", reais(t.semana.valor),
          `${nenhumaOu(t.semana.contas)}${mostrar === "SEMANA" && emprestimosSemana ? `, ${emprestimosSemana} de empréstimo` : ""}`)}
        {numero("VENCIDAS", <>{t.vencidas.contas ? <Icone nome="alerta" className="ico" /> : null}Vencidas</>, reais(t.vencidas.valor), nenhumaOu(t.vencidas.contas))}
        {numero("RECORRENTES", `Recorrentes de ${nomeDoMes(dados.mes)}`, t.recorrentes.ativas ?? t.recorrentes.contas,
          t.recorrentes.encerradasMes ? `ativas · ${contar(t.recorrentes.encerradasMes, "encerrada", "encerradas")} este mês`
            : t.recorrentes.sozinhas ? `${t.recorrentes.sozinhas === 1 ? "lançada sozinha" : "lançadas sozinhas"} em ${diaCurto(dados.mes)}` : "as próximas nascem sozinhas no dia 1º")}
        <a href="#t-reemb">
          <span className="r">A reembolsar por clientes</span>
          <b className="num">{reais(t.reembolsar.valor)}</b>
          <small>{t.reembolsar.clientes ? contar(t.reembolsar.clientes, "cliente", "clientes") : "nenhum"}</small>
        </a>
      </div>

      {mostrar === "RECORRENTES" ? <ListaRecorrentes aoMudou={recarregar} /> : (
      <section className="folha" aria-labelledby="t-contas" style={{ overflow: "hidden" }}>
        <div className="folha-cab">
          <div>
            <h2 id="t-contas"><Icone nome="agenda" className="ico" />{cab.titulo}</h2>
            <p className="sub">{cab.sub}</p>
          </div>
        </div>
        {falhaAbrir ? <div style={{ padding: "0 24px 12px" }}><Aviso tom="urgencia" titulo="O arquivo não abriu.">{falhaAbrir}</Aviso></div> : null}
        {dados.contas.length ? (
          <table className="hn-tab fi-tab fi-tab-pagar">
            <caption className="sr">{cab.titulo}</caption>
            <colgroup>{["9%", "21%", "14%", "20%", "14%", "11%", "11%"].map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
            <thead>
              <tr>
                <th scope="col">Vence</th><th scope="col">Conta</th><th scope="col">Categoria</th><th scope="col">Origem</th><th scope="col">Nota ou guia</th>
                <th scope="col" style={{ textAlign: "right" }}>Valor</th><th scope="col"><span className="sr">Ação</span></th>
              </tr>
            </thead>
            <tbody>
              {dados.contas.map((c) => {
                const o = origemConta(c);
                const venc = c.situacao === "VENCIDA";
                return (
                  <tr key={c.id} className={venc ? "fi-atraso" : undefined}>
                    <td><div className="fi-dt"><b className="num">{diaCurto(c.vencimento)}</b><small>{quandoConta(c.vencimento, hoje)}</small></div></td>
                    <td data-r="Conta">
                      <div className="fi-quem">
                        <strong>{c.descricao}</strong>
                        {c.adiantada || c.fornecedor ? <small>{c.adiantada ? nomeCliente(c) : c.fornecedor}</small> : null}
                      </div>
                    </td>
                    <td data-r="Categoria"><span className="fi-cat">{CATEGORIAS_SAIDA[c.categoria]}</span></td>
                    <td data-r="Origem">
                      {c.emprestimo ? (
                        <div className="fi-forma">
                          <SeloEmprestimo e={c.emprestimo} />
                          <small>Nasceu do empréstimo</small>
                        </div>
                      ) : (
                        <div className="fi-forma">
                          <b>{o.repete || c.adiantada ? <Icone nome="reenviar" className="ico" /> : null}{o.titulo}</b>
                          <small>{o.detalhe}</small>
                        </div>
                      )}
                    </td>
                    <td data-r="Nota ou guia">
                      {c.emprestimo ? <span className="fi-pq">Não tem nota fiscal</span>
                        : <NotaDaConta c={c} anexos={anexos.porDono.get(c.id)} aoAbrir={(a) => void abrir(a)} aoAnexar={() => setAnexar(c)} />}
                    </td>
                    <td data-r="Valor" className="fi-v num">
                      {reais(c.valorPago ?? c.valor)}
                      {venc ? <div><Selo tom="urgente" icone="alerta">Vencida</Selo></div> : null}
                    </td>
                    <td data-r="" className="fi-acao hn-acao">
                      {c.pagaEm ? (
                        <Selo tom="ok" icone="check">Paga em {diaCurto(c.pagaEm)}</Selo>
                      ) : (
                        <button className="btn btn-sec btn-compacto" type="button" onClick={() => setPagar(c)}>
                          Paga<span className="sr">: marcar {c.descricao} como paga</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <Estado icone="check" titulo={mostrar === "VENCIDAS" ? "Nenhuma conta vencida" : "Nenhuma conta aqui"}>
            {mostrar === "SEMANA" ? "Nada vence nos próximos 7 dias." : mostrar === "VENCIDAS" ? "Tudo pago em dia." : "Quando houver, elas aparecem nesta lista."}
          </Estado>
        )}
        {mostrar === "SEMANA" && dados.depois && dados.depois.contas > 0 ? (
          <p className="mais">
            <span>Mais {contar(dados.depois.contas, "conta", "contas")} até {diaCurto(dados.depois.ate)}, somando {reais(dados.depois.valor)}</span>
            <button className="btn btn-sec" type="button" onClick={() => setMostrar("MES")}>Ver o mês todo</button>
          </p>
        ) : null}
        <div className="fi-reserva">
          <Icone nome="cadeado" className="ico" />
          <span>
            <b>Aprovação dos pagamentos pela sócia</b> (lista da semana, e quem lança diferente de quem paga) ainda está em validação com os escritórios piloto. O lugar dela é aqui, acima da lista.
          </span>
        </div>
      </section>
      )}

      <div className="fi-grade fi-grade-meio">
        <div className="fi-col">
          <section className="folha" aria-labelledby="t-reemb" style={{ overflow: "hidden" }}>
            <div className="folha-cab">
              <div>
                <h2 id="t-reemb" tabIndex={-1}><Icone nome="reenviar" className="ico" />Adiantado por cliente</h2>
                <p className="sub">Custas e perícias pagas pelo escritório viram reembolso</p>
              </div>
            </div>
            {dados.adiantados.length ? (
              <>
                <ul className="fi-linhas">
                  {dados.adiantados.map((c) => (
                    <li key={c.id} className="fi-linha" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
                      <div className="fi-quem">
                        <strong>{nomeCliente(c)}</strong>
                        <small>{c.descricao}{c.adiantada!.caso ? ` · ${c.adiantada!.caso.nome}` : ""} · {c.pagaEm ? `paga em ${diaCurto(c.pagaEm)}` : `vence em ${diaCurto(c.vencimento)}`}</small>
                        <p className="fi-prox"><Icone nome="relogio" className="ico" />Como volta: <b>{comoVolta(c)}</b></p>
                      </div>
                      <div className="fi-lado">
                        <span className="fi-v num">{reais(c.valorPago ?? c.valor)}</span>
                        <button className="btn btn-sec btn-compacto" type="button" onClick={() => setReembolso(c)}>
                          Reembolsado<span className="sr">: {nomeCliente(c)} devolveu {c.descricao}</span>
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="fi-total"><span>{contar(clientesReembolso, "cliente", "clientes")}</span><b className="num">{reais(totalReembolso)}</b></p>
              </>
            ) : (
              <p className="fi-cob-sem">Nada a reembolsar. Ao lançar uma conta paga por um cliente, marque “Foi adiantada para um cliente”.</p>
            )}
          </section>
        </div>
        <aside className="fi-col" aria-label="Categorias">
          <section className="folha" aria-labelledby="t-cat" style={{ overflow: "hidden" }}>
            <div className="folha-cab">
              <div><h2 id="t-cat"><Icone nome="funcoes" className="ico" />Saídas de {nomeDoMes(dados.mes)} por categoria</h2></div>
            </div>
            {doDia.length ? (
              <div className="fi-barras" role="group" aria-label="Saídas por categoria">
                {doDia.map((c, i) => (
                  <div key={c.categoria} className="fi-barra" style={{ gridTemplateColumns: "minmax(0,1fr) 110px" }}>
                    <span className="rot">{CATEGORIAS_SAIDA[c.categoria]}</span>
                    <span className="val"><b className="num">{reais(c.valor)}</b></span>
                    <span className="fi-trilho" style={{ gridColumn: "1/-1" }} aria-hidden="true">
                      <i className={i < 2 ? "real" : i < 4 ? "tipo2" : "tipo4"} style={{ width: `${Math.max((c.valor / maior) * 100, 1.2).toFixed(1)}%` }} />
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="fi-cob-sem">Nenhuma conta com vencimento em {nomeDoMes(dados.mes)}.</p>
            )}
            <p className="fi-total"><span>Pagas e a pagar no mês</span><b className="num">{reais(totalMes)}</b></p>
            {deEmprestimo ? (
              <div className="em-cat-parte" role="group" aria-label="Empréstimos, à parte">
                <p className="em-cat-rot"><Icone nome="trocar" className="ico" />À parte · não é despesa do dia a dia</p>
                <div className="fi-barra" style={{ gridTemplateColumns: "minmax(0,1fr) 110px" }}>
                  <span className="rot">Empréstimos <span className="fi-pq">(à parte)</span><small>parcelas e devoluções do mês, fora do total</small></span>
                  <span className="val"><b className="num">{reais(deEmprestimo.valor)}</b></span>
                  <span className="fi-trilho" style={{ gridColumn: "1/-1" }} aria-hidden="true">
                    <i className="em-barra" style={{ width: `${Math.min(Math.max((deEmprestimo.valor / maior) * 100, 1.2), 100).toFixed(1)}%` }} />
                  </span>
                </div>
              </div>
            ) : null}
            <p className="pt-pe-folha">
              <Icone nome="ajustes" className="ico" />
              <span>São as mesmas categorias da exportação para o contador. Repasses a terceiros não entram aqui: não são despesa do escritório.{deEmprestimo ? " As parcelas de empréstimo também ficam fora do total." : ""}</span>
            </p>
          </section>
        </aside>
      </div>
      {janelas}
    </div>
  );
}

export function PagarFinanceiro() {
  return <MolduraArea area="FINANCEIRO" secao="a-pagar">{() => <PagarConteudo />}</MolduraArea>;
}

// ------------------------------------------------------------------------- Lançar conta

/** A frase sob "Como o dinheiro volta": em que parcela o reembolso vai aparecer. */
export function fraseDaParcela(p: ParcelaDoReembolso | null, cliente: string): string {
  return p
    ? `A próxima parcela de ${cliente} vence em ${diaCurto(p.vencimento)} e passa a mostrar este reembolso.`
    : `${cliente} não tem parcela a vencer. O reembolso fica a reembolsar até haver uma, ou cobre à parte.`;
}

function JanelaLancar({ aoFechar, aoFeito }: { aoFechar: () => void; aoFeito: (f: Feito) => void }) {
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [venc, setVenc] = useState("");
  const [categoria, setCategoria] = useState<CategoriaSaida | "">("");
  const [forma, setForma] = useState<FormaPagamento | "">("");
  const [repete, setRepete] = useState(false);
  const [adiantada, setAdiantada] = useState(false);
  const [cliente, setCliente] = useState("");
  const [caso, setCaso] = useState("");
  const [para, setPara] = useState<ParaAdiantar | null>(null);
  const [como, setComo] = useState<ReembolsoComo | "">("");
  const [clientes, setClientes] = useState<{ id: string; nome: string }[] | null>(null);
  const [erros, setErros] = useState<string[]>([]);
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [tipoArq, setTipoArq] = useState<CategoriaAnexo>("NOTA_FISCAL");
  const [erroArq, setErroArq] = useState<string | null>(null);
  const [progresso, setProgresso] = useState<number | null>(null);
  const corpo = useRef<HTMLDivElement>(null);
  const tem = (c: string) => erros.includes(c);

  useEffect(() => {
    if (!adiantada || clientes) return;
    void chamarPortal<ListaClientes>("/v1/escritorio/clientes?situacao=ATIVO").then((r) => setClientes(r.ok ? r.dados.clientes : []));
  }, [adiantada, clientes]);

  // Os casos do cliente escolhido e a parcela em que o reembolso voltaria (F3.23).
  useEffect(() => {
    if (!adiantada || !cliente) return;
    let vivo = true;
    void chamarPortal<ParaAdiantar>(`/v1/escritorio/financeiro/adiantar?cliente=${cliente}`).then((r) => {
      if (!vivo) return;
      const p = r.ok ? r.dados : { casos: [], proximaParcela: null };
      setPara(p);
      const andamento = p.casos.filter((x) => x.situacao === "ANDAMENTO");
      if (andamento.length === 1) setCaso(andamento[0]!.id);
    });
    return () => { vivo = false; };
  }, [adiantada, cliente]);
  const temCasos = !!para?.casos.length;
  const nomeDoCliente = clientes?.find((x) => x.id === cliente)?.nome ?? "o cliente";
  const parcelaPrevista: ParcelaDoReembolso | null = !para ? null : caso ? para.casos.find((x) => x.id === caso)?.proximaParcela ?? null : para.proximaParcela;

  async function enviar() {
    const e: string[] = [];
    const c = lerCentavos(valor);
    const d = lerDia(venc);
    if (descricao.trim().length < 3) e.push("descricao");
    if (!c) e.push("valor");
    if (!d) e.push("vencimento");
    if (!categoria) e.push("categoria");
    if (adiantada && !cliente) e.push("clienteId");
    if (adiantada && temCasos && !caso) e.push("casoId");
    if (adiantada && !como) e.push("reembolsoComo");
    setFalha(null);
    if (e.length || erroArq) {
      setErros(e);
      return focarPrimeiroErro(corpo.current);
    }
    setEnviando(true);
    const r = await chamarPortal<{ id: string }>("/v1/escritorio/financeiro/contas", {
      metodo: "POST",
      corpo: {
        descricao: descricao.trim(), valor: c, vencimento: d, categoria, forma: forma || null, repete, adiantada,
        clienteId: adiantada ? cliente : null, casoId: adiantada && caso ? caso : null, reembolsoComo: adiantada ? como : null,
      },
    });
    if (r.ok) {
      const nome = clientes?.find((x) => x.id === cliente)?.nome;
      const extra = repete ? ` Repete todo dia ${Number(d!.slice(8, 10))}; os próximos meses nascem sozinhos.` : adiantada && nome ? ` Vira reembolso de ${nome}.` : "";
      // A conta já existe; o arquivo vai depois, e a falha dele não desfaz a conta.
      let arq = "";
      if (arquivo) {
        setProgresso(0);
        const erro = await enviarAnexo("CONTA", r.dados.id, arquivo, tipoArq, setProgresso);
        setProgresso(null);
        arq = erro ? " O arquivo não foi guardado; anexe de novo pela lista, em “Nota ou guia”." : ` ${textoAnexado(tipoArq)}.`;
      }
      setEnviando(false);
      return aoFeito({ titulo: "Conta lançada.", texto: `${descricao.trim()}, ${reais(c!)}, vence em ${dataBr(d!)}.${extra}${arq}` });
    }
    setEnviando(false);
    const campos = r.erro.detalhes?.campos;
    if (r.erro.codigo === "VALIDATION_ERROR" && Array.isArray(campos) && campos.length) {
      setErros(campos.map(String));
      return focarPrimeiroErro(corpo.current);
    }
    setFalha(textoDoErro(r.erro));
  }

  return (
    <Janela id="j-conta" classe="fi-larga" aberta aoFechar={aoFechar} sobretitulo="A pagar" titulo="Lançar conta" descricao="j-conta-d"
      aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-sec" type="button" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-pri" type="submit" disabled={enviando} aria-busy={enviando || undefined}>
            <Icone nome="check" className="ico" />
            Lançar conta
          </button>
        </>
      }>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id="j-conta-d">Uma conta do escritório. Se foi paga para um cliente, marque abaixo.</p>
        {erros.length ? <Aviso tom="urgencia" titulo={faltaAcertar(erros.length)}>A conta ainda não foi lançada.</Aviso> : null}
        {falha ? <Aviso tom="urgencia" titulo="A conta não foi lançada.">{falha}</Aviso> : null}
        <div className="campo">
          <label htmlFor="nc-desc">O que é</label>
          <input className="entrada" id="nc-desc" type="text" autoComplete="off" maxLength={120} value={descricao} onChange={(e) => setDescricao(e.target.value)} data-foco=""
            aria-invalid={tem("descricao") || undefined} aria-describedby={descritoPor(!tem("descricao") && "nc-desc-aj", tem("descricao") && "nc-desc-er")} />
          {tem("descricao") ? <ErroCampo id="nc-desc-er">Escreva o que é a conta, com pelo menos 3 letras. Ex.: Aluguel da sala.</ErroCampo>
            : <p className="ajuda" id="nc-desc-aj">Como vai aparecer na lista e para o contador.</p>}
        </div>
        <div className="fi-dois">
          <div className="campo">
            <label htmlFor="nc-valor">Valor</label>
            <input className="entrada" id="nc-valor" type="text" inputMode="decimal" autoComplete="off" value={valor} onChange={(e) => setValor(e.target.value)}
              aria-invalid={tem("valor") || undefined} aria-describedby={descritoPor(tem("valor") && "nc-valor-er")} />
            {tem("valor") ? <ErroCampo id="nc-valor-er">Escreva o valor em reais. Ex.: 1.248,36.</ErroCampo> : null}
          </div>
          <div className="campo">
            <label htmlFor="nc-venc">Vencimento</label>
            <input className="entrada" id="nc-venc" type="text" inputMode="numeric" autoComplete="off" value={venc} onChange={(e) => setVenc(e.target.value)}
              aria-invalid={tem("vencimento") || undefined} aria-describedby={descritoPor(!tem("vencimento") && "nc-venc-aj", tem("vencimento") && "nc-venc-er")} />
            {tem("vencimento") ? <ErroCampo id="nc-venc-er">Escreva a data no formato dd/mm/aaaa.</ErroCampo> : <p className="ajuda" id="nc-venc-aj">dd/mm/aaaa</p>}
          </div>
        </div>
        <div className="fi-dois">
          <div className="campo">
            <label htmlFor="nc-cat">Categoria</label>
            <select className="entrada" id="nc-cat" value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaSaida)}
              aria-invalid={tem("categoria") || undefined} aria-describedby={descritoPor(tem("categoria") ? "nc-cat-er" : "nc-cat-aj")}>
              <option value="">Escolha a categoria</option>
              {ORDEM_CATEGORIAS.map((c) => <option key={c} value={c}>{CATEGORIAS_SAIDA[c]}</option>)}
            </select>
            {tem("categoria") ? <ErroCampo id="nc-cat-er">Escolha a categoria. Ela vai junto na exportação para o contador.</ErroCampo>
              : <p className="ajuda" id="nc-cat-aj">Parcela de empréstimo? Registre o empréstimo no Caixa e as parcelas nascem sozinhas. <a href={`${ROTAS_FINANCEIRO.caixa}?registrar=1`}>Registrar no Caixa</a></p>}
          </div>
          <div className="campo">
            <label htmlFor="nc-forma">Como vai pagar <span className="opcional">(opcional)</span></label>
            <select className="entrada" id="nc-forma" value={forma} onChange={(e) => setForma(e.target.value as FormaPagamento)}>
              <option value="">Ainda não sei</option>
              {ORDEM_FORMAS.map((f) => <option key={f} value={f}>{FORMAS_PAGAMENTO[f]}</option>)}
            </select>
          </div>
        </div>
        <fieldset className="fi-grupo-op">
          <legend>Esta conta</legend>
          <label className="opcao">
            <input className="marcar" type="checkbox" checked={repete} onChange={(e) => setRepete(e.target.checked)} />
            <span>
              Repete todo mês
              <small>Ela aparece sozinha no dia 1º de cada mês, com o mesmo valor e no mesmo dia. O valor que saiu de fato se escreve ao marcar como paga.</small>
            </span>
          </label>
          <label className="opcao">
            <input className="marcar" type="checkbox" checked={adiantada} onChange={(e) => setAdiantada(e.target.checked)} />
            <span>
              Foi adiantada para um cliente
              <small>Vira valor a reembolsar, ligado ao cliente e ao caso.</small>
            </span>
          </label>
          {adiantada ? (
            <div className="fi-sub-op">
              <div className="fi-sub-par">
              <div className="campo">
                <label htmlFor="nc-cli">Cliente</label>
                <select className="entrada" id="nc-cli" value={cliente} onChange={(e) => { setCliente(e.target.value); setCaso(""); setPara(null); }}
                  aria-invalid={tem("clienteId") || undefined} aria-describedby={descritoPor(tem("clienteId") && "nc-cli-er")}>
                  <option value="">{clientes === null ? "Carregando os clientes…" : clientes.length ? "Escolha o cliente" : "Nenhum cliente ativo"}</option>
                  {(clientes ?? []).map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
                </select>
                {tem("clienteId") ? <ErroCampo id="nc-cli-er">Escolha o cliente para quem o escritório pagou.</ErroCampo> : null}
              </div>
              <div className="campo">
                <label htmlFor="nc-caso">Caso</label>
                <select className="entrada" id="nc-caso" value={caso} onChange={(e) => setCaso(e.target.value)} disabled={!cliente || !para || !temCasos}
                  aria-invalid={tem("casoId") || undefined} aria-describedby={tem("casoId") ? "nc-caso-er" : "nc-caso-aj"}>
                  <option value="">{!cliente ? "Escolha antes o cliente" : !para ? "Carregando os casos…" : temCasos ? "Escolha o caso" : "Sem caso"}</option>
                  {(para?.casos ?? []).map((x) => (
                    <option key={x.id} value={x.id}>{x.numero ? `${x.nome} · ${formatarCnj(x.numero)}` : x.nome}{x.situacao === "ENCERRADO" ? " (encerrado)" : ""}</option>
                  ))}
                </select>
                {tem("casoId") ? <ErroCampo id="nc-caso-er">Escolha o caso em que o escritório pagou.</ErroCampo>
                  : <p className="ajuda" id="nc-caso-aj">{para && !temCasos ? "Este cliente não tem caso no Jurídico; o reembolso fica ligado só ao cliente." : "O reembolso fica ligado a este caso."}</p>}
              </div>
              </div>
              <div className="campo">
                <label htmlFor="nc-como">Como o dinheiro volta</label>
                <select className="entrada" id="nc-como" value={como} onChange={(e) => setComo(e.target.value as ReembolsoComo)}
                  aria-invalid={tem("reembolsoComo") || undefined} aria-describedby={tem("reembolsoComo") ? "nc-como-er" : como === "PROXIMA_PARCELA" && para ? "nc-como-aj" : undefined}>
                  <option value="">Escolha como volta</option>
                  {ORDEM_COMO.map((c) => <option key={c} value={c}>{REEMBOLSO_COMO[c]}</option>)}
                </select>
                {tem("reembolsoComo") ? <ErroCampo id="nc-como-er">Escolha como o cliente devolve o valor.</ErroCampo>
                  : como === "PROXIMA_PARCELA" && para ? <p className="ajuda" id="nc-como-aj">{fraseDaParcela(parcelaPrevista, nomeDoCliente)}</p> : null}
              </div>
            </div>
          ) : null}
        </fieldset>
        <CampoAnexo rotulo="Guia, boleto ou nota fiscal" ajuda="Vai junto na exportação para o contador."
          arquivo={arquivo} aoEscolher={(a, er) => { setArquivo(er ? null : a); setErroArq(er); }}
          categoria={tipoArq} aoCategoria={setTipoArq} erro={erroArq} progresso={progresso} />
      </div>
    </Janela>
  );
}

// ------------------------------------------------------------------------- Nota ou guia (FI-18)

/** A coluna "Nota ou guia": o arquivo mais novo da conta, ou o selo de atenção com "Anexar". */
function NotaDaConta({ c, anexos, aoAbrir, aoAnexar }: { c: ContaPagar; anexos: Anexo[] | undefined; aoAbrir: (a: Anexo) => void; aoAnexar: () => void }) {
  const a = anexos?.[0];
  if (a) {
    return (
      <span className="fi-docs">
        <button className="jr-link fi-doc-bt" type="button" onClick={() => aoAbrir(a)}>
          <Icone nome="doc" className="ico" />{textoAnexado(a.categoria)}<span className="sr">: abrir {a.nome} de {c.descricao}</span>
        </button>
      </span>
    );
  }
  return (
    <span className="fi-docs">
      <Selo tom="atencao" icone="alerta">Falta a nota fiscal</Selo>
      <button className="jr-link fi-doc-bt" type="button" onClick={aoAnexar}>
        <Icone nome="enviar" className="ico" />Anexar<span className="sr"> a nota, guia ou boleto de {c.descricao}</span>
      </button>
    </span>
  );
}

export function JanelaAnexarConta({ conta, aoFechar, aoFeito }: { conta: ContaPagar; aoFechar: () => void; aoFeito: (f: Feito) => void }) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [tipoArq, setTipoArq] = useState<CategoriaAnexo>("NOTA_FISCAL");
  const [erro, setErro] = useState<string | null>(null);
  const [falha, setFalha] = useState<string | null>(null);
  const [progresso, setProgresso] = useState<number | null>(null);
  const corpo = useRef<HTMLDivElement>(null);
  async function enviar() {
    setFalha(null);
    if (!arquivo || erro) {
      setErro(erro ?? "Escolha o arquivo da nota, guia ou boleto.");
      return focarPrimeiroErro(corpo.current);
    }
    setProgresso(0);
    const e = await enviarAnexo("CONTA", conta.id, arquivo, tipoArq, setProgresso);
    setProgresso(null);
    if (e) return setFalha(e);
    aoFeito({ titulo: `${textoAnexado(tipoArq)}.`, texto: `${conta.descricao}: o arquivo vai junto na exportação para o contador.` });
  }
  return (
    <Janela id="j-anexo-conta" aberta aoFechar={aoFechar} sobretitulo={`A pagar · ${conta.descricao}`} titulo="Anexar nota, guia ou boleto" descricao="j-anexo-conta-d"
      aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-sec" type="button" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-pri" type="submit" disabled={progresso !== null} aria-busy={progresso !== null || undefined}>
            <Icone nome="enviar" className="ico" />
            Anexar
          </button>
        </>
      }>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id="j-anexo-conta-d">{reais(conta.valorPago ?? conta.valor)}, vence em {dataBr(conta.vencimento)}. O arquivo fica na conta e vai junto na exportação para o contador.</p>
        {falha ? <Aviso tom="urgencia" titulo="O arquivo não foi anexado.">{falha}</Aviso> : null}
        <CampoAnexo rotulo="Guia, boleto ou nota fiscal" opcional={false}
          arquivo={arquivo} aoEscolher={(a, er) => { setArquivo(er ? null : a); setErro(er); }}
          categoria={tipoArq} aoCategoria={setTipoArq} erro={erro} progresso={progresso} />
      </div>
    </Janela>
  );
}

// ------------------------------------------------------------------------- Marcar paga e reembolso

function AlvoConta({ c }: { c: ContaPagar }) {
  return (
    <div className="fi-alvo">
      <Icone nome="moeda" className="ico" />
      <div>
        <strong>{c.descricao}</strong>
        <small>{CATEGORIAS_SAIDA[c.categoria]} · vence em {dataBr(c.vencimento)}{c.adiantada ? ` · adiantada para ${c.adiantada.cliente.nome}` : ""}</small>
      </div>
      <span className="fi-v num">{reais(c.valorPago ?? c.valor)}</span>
    </div>
  );
}

export function JanelaPaga({ conta, aoFechar, aoFeito }: { conta: ContaPagar; aoFechar: () => void; aoFeito: (f: Feito) => void }) {
  const hoje = hojeBrasilia();
  const [valor, setValor] = useState(paraCampo(conta.valor));
  const [dia, setDia] = useState(diaBr(hoje));
  const [erros, setErros] = useState<string[]>([]);
  const [futuro, setFuturo] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const corpo = useRef<HTMLDivElement>(null);
  const tem = (c: string) => erros.includes(c);

  async function enviar() {
    const e: string[] = [];
    const c = lerCentavos(valor);
    const d = lerDia(dia);
    if (!c) e.push("valor");
    if (!d || d > hoje) e.push("pagaEm");
    setFuturo(!!d && d > hoje);
    setFalha(null);
    if (e.length) {
      setErros(e);
      return focarPrimeiroErro(corpo.current);
    }
    setEnviando(true);
    const r = await chamarPortal<{ id: string }>(`/v1/escritorio/financeiro/contas/${conta.id}/paga`, { metodo: "POST", corpo: { valor: c, pagaEm: d } });
    setEnviando(false);
    if (r.ok) return aoFeito({ titulo: "Conta paga.", texto: `${conta.descricao}, ${reais(c!)}, paga em ${dataBr(d!)}.` });
    const campos = r.erro.detalhes?.campos;
    if (r.erro.codigo === "VALIDATION_ERROR" && Array.isArray(campos) && campos.length) {
      setErros(campos.map(String));
      setFuturo(r.erro.detalhes?.motivo === "DATA_NO_FUTURO");
      return focarPrimeiroErro(corpo.current);
    }
    setFalha(textoDoErro(r.erro));
  }

  return (
    <Janela id="j-paga" aberta aoFechar={aoFechar} sobretitulo="A pagar" titulo="Marcar como paga" descricao="j-paga-d" aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-sec" type="button" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-pri" type="submit" disabled={enviando} aria-busy={enviando || undefined}>
            <Icone nome="check" className="ico" />
            Marcar como paga
          </button>
        </>
      }>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id="j-paga-d">O dia e o valor que saíram do caixa. Depois de paga, a conta não muda mais.</p>
        {falha ? <Aviso tom="urgencia" titulo="A conta não foi marcada como paga.">{falha}</Aviso> : null}
        <AlvoConta c={conta} />
        <div className="fi-dois">
          <div className="campo">
            <label htmlFor="pg-valor">Valor pago</label>
            <input className="entrada" id="pg-valor" type="text" inputMode="decimal" autoComplete="off" value={valor} onChange={(e) => setValor(e.target.value)} data-foco=""
              aria-invalid={tem("valor") || undefined} aria-describedby={descritoPor(!tem("valor") && "pg-valor-aj", tem("valor") && "pg-valor-er")} />
            {tem("valor") ? <ErroCampo id="pg-valor-er">Escreva o valor em reais. Ex.: 2.850,00.</ErroCampo>
              : <p className="ajuda" id="pg-valor-aj">Se o valor mudou neste mês, como o do imposto, escreva o que saiu.</p>}
          </div>
          <div className="campo">
            <label htmlFor="pg-dia">Dia do pagamento</label>
            <input className="entrada" id="pg-dia" type="text" inputMode="numeric" autoComplete="off" value={dia} onChange={(e) => setDia(e.target.value)}
              aria-invalid={tem("pagaEm") || undefined} aria-describedby={descritoPor(!tem("pagaEm") && "pg-dia-aj", tem("pagaEm") && "pg-dia-er")} />
            {tem("pagaEm") ? <ErroCampo id="pg-dia-er">{futuro ? "Esta data é depois de hoje. Marque quando o dinheiro tiver saído." : "Escreva a data no formato dd/mm/aaaa."}</ErroCampo>
              : <p className="ajuda" id="pg-dia-aj">dd/mm/aaaa</p>}
          </div>
        </div>
      </div>
    </Janela>
  );
}

function JanelaReembolso({ conta, aoFechar, aoFeito }: { conta: ContaPagar; aoFechar: () => void; aoFeito: (f: Feito) => void }) {
  const hoje = hojeBrasilia();
  const [dia, setDia] = useState(diaBr(hoje));
  const [erro, setErro] = useState<"" | "formato" | "futuro">("");
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const corpo = useRef<HTMLDivElement>(null);
  const nome = conta.adiantada?.cliente.nome ?? "";

  async function enviar() {
    const d = lerDia(dia);
    const e = !d ? "formato" : d > hoje ? "futuro" : "";
    setErro(e);
    setFalha(null);
    if (e) return focarPrimeiroErro(corpo.current);
    setEnviando(true);
    const r = await chamarPortal<{ id: string }>(`/v1/escritorio/financeiro/contas/${conta.id}/reembolso`, { metodo: "POST", corpo: { reembolsadoEm: d } });
    setEnviando(false);
    if (r.ok) return aoFeito({ titulo: "Reembolso registrado.", texto: `${nome} devolveu ${reais(conta.valorPago ?? conta.valor)} de ${conta.descricao.toLowerCase()}.` });
    if (r.erro.detalhes?.motivo === "DATA_NO_FUTURO") {
      setErro("futuro");
      return focarPrimeiroErro(corpo.current);
    }
    setFalha(textoDoErro(r.erro));
  }

  return (
    <Janela id="j-reemb" aberta aoFechar={aoFechar} sobretitulo="Adiantado por cliente" titulo="Registrar reembolso" descricao="j-reemb-d" aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-sec" type="button" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-pri" type="submit" disabled={enviando} aria-busy={enviando || undefined}>
            <Icone nome="check" className="ico" />
            Registrar reembolso
          </button>
        </>
      }>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id="j-reemb-d">{nome} devolveu ao escritório o que foi adiantado. O valor sai do “Adiantado por cliente”.</p>
        {falha ? <Aviso tom="urgencia" titulo="O reembolso não foi registrado.">{falha}</Aviso> : null}
        <AlvoConta c={conta} />
        <div className="campo">
          <label htmlFor="rb-dia">Dia em que o dinheiro voltou</label>
          <input className="entrada" id="rb-dia" type="text" inputMode="numeric" autoComplete="off" value={dia} onChange={(e) => setDia(e.target.value)} data-foco=""
            aria-invalid={erro ? true : undefined} aria-describedby={descritoPor(!erro && "rb-dia-aj", !!erro && "rb-dia-er")} />
          {erro ? <ErroCampo id="rb-dia-er">{erro === "futuro" ? "Esta data é depois de hoje. Registre quando o dinheiro tiver voltado." : "Escreva a data no formato dd/mm/aaaa."}</ErroCampo>
            : <p className="ajuda" id="rb-dia-aj">dd/mm/aaaa</p>}
        </div>
      </div>
    </Janela>
  );
}
