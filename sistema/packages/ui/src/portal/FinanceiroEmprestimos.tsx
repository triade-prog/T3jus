"use client";
// Financeiro do Portal, Empréstimos (F3.51; FI-20), desenho aprovado em
// docs/design/aprovadas/portal-financeiro-emprestimos (T1 a T3). O empréstimo fica à parte, mas não é
// de terceiros: nunca usa o âmbar, só a areia e o vinho, sempre com "entra no saldo, mas não é
// receita". Aqui ficam a folha "Empréstimos" do Caixa, a janela "Registrar empréstimo" e a ficha do
// empréstimo (/financeiro/caixa/emprestimos/:id), com a devolução, o encerramento e o "lançado errado".
// Os números vêm prontos do servidor (0940 e 0941); a janela só calcula a prévia das parcelas.

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  CREDORES_EMPRESTIMO, custoEmprestimo, FORMAS_PAGAMENTO, hojeBrasilia, parcelasDoEmprestimo, reais, sugerirParcelasAntes, vencimentoDaParcela,
  type Anexo, type CaixaFinanceiro, type ContaPagar, type CredorEmprestimo, type DevolucaoEmprestimo, type DevolucaoRegistrada,
  type Emprestimo, type EmprestimoRegistrado, type EmprestimosCaixa, type FichaEmprestimo, type FormaPagamento,
} from "@t3jus/domain";
import { textoDoErro, type ErroApi } from "../api.ts";
import { Icone, type NomeIcone } from "../Icone.tsx";
import { Aviso, Carregando, descritoPor, ErroAoCarregar, ErroCampo, faltaAcertar, focarPrimeiroErro, Janela } from "../console/pecas.tsx";
import { abrirAnexo, CampoAnexo, enviarAnexo, useAnexosFinanceiro } from "./Anexos.tsx";
import { contar, DIAS_SEMANA, diaBr, diaCurto, diaDaSemana, lerDia, nomeDoMes, somarDias } from "./agenda.ts";
import { Selo, useCarga } from "./Comercial.tsx";
import { Toast } from "./FichaCliente.tsx";
import { JanelaAnexarConta, JanelaPaga } from "./FinanceiroPagar.tsx";
import { Folha } from "./FinanceiroResumo.tsx";
import { ROTAS_FINANCEIRO } from "./financeiro.ts";
import { centavos as lerCentavos } from "./honorarios.ts";
import { chamarPortal } from "./Moldura.tsx";
import { MolduraArea } from "./MolduraArea.tsx";

type Feito = { titulo: string; texto: string };

const fuso = { timeZone: "America/Sao_Paulo" } as const;
const diaDoInstante = (em: string) => new Intl.DateTimeFormat("en-CA", { ...fuso, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(em));
const horaDoInstante = (em: string) => {
  const [h, m] = new Intl.DateTimeFormat("pt-BR", { ...fuso, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(em)).split(":");
  return `${Number(h)}h${m}`;
};
/** "hoje, às 10h40" ou "em 21/10/2026, às 9h12". */
const quandoFoi = (em: string, hoje: string) => (diaDoInstante(em) === hoje ? `hoje, às ${horaDoInstante(em)}` : `em ${diaBr(diaDoInstante(em))}, às ${horaDoInstante(em)}`);
const MES_CURTO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const mesCurto = (d: string) => `${MES_CURTO[Number(d.slice(5, 7)) - 1]}/${d.slice(0, 4)}`;
const mesLongo = (d: string) => `${nomeDoMes(d)} de ${d.slice(0, 4)}`;
const paraCampo = (c: number) => reais(c).replace(/^R\$\s?/, "");

export const TIPO_LONGO: Record<CredorEmprestimo, string> = { BANCO: "Banco ou financeira", SOCIO: "Sócio do escritório", OUTRO: "Outra pessoa ou empresa" };
const ICONE_TIPO: Record<CredorEmprestimo, NomeIcone> = { BANCO: "coluna", SOCIO: "pessoas", OUTRO: "pessoa-mais" };
const FORMAS_ENTRADA: FormaPagamento[] = ["TRANSFERENCIA", "PIX", "DINHEIRO"];
const FORMAS_DEVOLUCAO: FormaPagamento[] = ["PIX", "TRANSFERENCIA", "DINHEIRO"];
const nomeForma = (f: FormaPagamento | null) => (f ? FORMAS_PAGAMENTO[f] : null);

/** As recusas do servidor que as ações do empréstimo podem dar, no texto da tela. */
const MOTIVOS: Record<string, string> = {
  JA_CANCELADO: "Este empréstimo já foi marcado como lançado errado. Recarregue a página para ver.",
  JA_ENCERRADO: "Este empréstimo já foi encerrado. Recarregue a página para ver.",
  EMPRESTIMO_COM_PAGAMENTO: "Já há parcela ou devolução paga. Use “Encerrar as parcelas que faltam”: o que entrou e o que foi pago ficam no caixa.",
  SEM_PAGAMENTO: "Nada foi pago ainda. Marque como lançado errado.",
  EMPRESTIMO_EM_PARCELAS: "Este empréstimo é em parcelas: marque a parcela como paga em A pagar.",
};
const textoRecusa = (e: ErroApi) => {
  const m = e.detalhes?.motivo;
  return typeof m === "string" && MOTIVOS[m] ? MOTIVOS[m]! : textoDoErro(e);
};
/** O texto da falha, com o código para o suporte (padrão aprovado). */
function TextoFalha({ texto, erro }: { texto: string; erro: ErroApi }) {
  return <>{texto} Se continuar, mande ao suporte o código <b className="num">{erro.codigo}</b>.</>;
}

export function SeloTipo({ tipo }: { tipo: CredorEmprestimo }) {
  return <span className="em-selo"><Icone nome={ICONE_TIPO[tipo]} className="ico" />{CREDORES_EMPRESTIMO[tipo]}</span>;
}
function SeloAntigo() {
  return <span className="em-selo em-selo-linha"><Icone nome="historico" className="ico" />Anterior ao T3jus</span>;
}

/** Quando vence: "sexta, 20/11" nesta semana, "05/12" no ano, "10/01/2027" fora dele. */
function quandoVence(d: string, hoje: string): string {
  if (d < hoje) return `venceu ${diaCurto(d)}`;
  if (d === hoje) return `hoje, ${diaCurto(d)}`;
  if (d <= somarDias(hoje, 6)) return `${DIAS_SEMANA[diaDaSemana(d)]}, ${diaCurto(d)}`;
  return d.slice(0, 4) === hoje.slice(0, 4) ? diaCurto(d) : diaBr(d);
}

// ---------------------------------------------------------------------------------- T1 · Caixa

function LinhaEmprestimo({ e, hoje, novo }: { e: Emprestimo; hoje: string; novo: boolean }) {
  const s = e.situacao;
  const livre = e.devolucao === "LIVRE";
  return (
    <li className={novo ? "em-linha em-novo" : "em-linha"}>
      <div className="fi-quem">
        <div className="em-selos">
          <SeloTipo tipo={e.credorTipo} />
          {e.anteriorAoT3jus ? <SeloAntigo /> : null}
          {novo ? <Selo tom="ativo">Novo</Selo> : null}
        </div>
        <a href={ROTAS_FINANCEIRO.emprestimo(e.id)}>{e.credor}</a>
        {e.finalidade ? <small>{e.finalidade}</small> : null}
        {livre ? (
          <p className="fi-prox"><Icone nome="trocar" className="ico" />Devolve quando der · {s.ultimoPagamento ? `última devolução em ${diaCurto(s.ultimoPagamento)}` : "nenhuma devolução ainda"}</p>
        ) : s.proxima ? (
          <p className="fi-prox"><Icone nome="agenda" className="ico" />Próxima: <b>{s.proxima.n}/{e.parcelasTotal}, {quandoVence(s.proxima.vencimento, hoje)}</b> · {reais(s.proxima.valor)}</p>
        ) : null}
        {e.anteriorAoT3jus ? (
          <p className="em-nota-l">Entrou antes do T3jus: não soma no saldo.{livre ? "" : " As parcelas que faltam estão em A pagar."}</p>
        ) : null}
      </div>
      <div className="fi-lado">
        <span className="fi-v forte num">{reais(livre ? s.faltaDevolver ?? 0 : s.faltaPagar)}</span>
        <span className="fi-pq em-det">
          {livre
            ? `Falta devolver · sem juros · devolvido ${reais(s.pagoNoT3jus)} de ${reais(e.valor)}`
            : `Falta pagar · ${s.parcelasPagas ?? 0} de ${e.parcelasTotal} pagas${s.terminaEm ? ` · termina em ${mesCurto(s.terminaEm)}` : ""}`}
        </span>
        {livre ? (
          <a className="btn btn-sec btn-compacto" href={`${ROTAS_FINANCEIRO.emprestimo(e.id)}?devolver=1`}>
            <Icone nome="mais" className="ico" />Registrar devolução<span className="sr"> a {e.credor}</span>
          </a>
        ) : null}
      </div>
    </li>
  );
}

/** A folha "Empréstimos" do Caixa, ou a linha discreta do vazio. */
export function FolhaEmprestimos({ e, hoje, novo, aoRegistrar }: { e: EmprestimosCaixa | undefined; hoje: string; novo: string | null; aoRegistrar: () => void }) {
  const botao = <button className="btn btn-sec" type="button" onClick={aoRegistrar}><Icone nome="mais" className="ico" />Registrar empréstimo</button>;
  if (!e || !e.lista.length) {
    return (
      <div className="em-vazio">
        <Icone nome="trocar" className="ico" />
        <p>Pegou empréstimo de banco ou de sócio? Registre aqui: entra no saldo, mas não conta como receita.</p>
        {botao}
      </div>
    );
  }
  return (
    <Folha id="t-emp" titulo="Empréstimos" icone="trocar" classe="em-folha" sub="Empréstimos de banco, de sócio ou de outra pessoa que o escritório está pagando."
      antes={<div className="em-faixa"><Icone nome="trocar" className="ico" />À parte · entra no saldo, mas não é receita</div>} acoes={botao}>
      <ul className="fi-linhas em-linhas">
        {e.lista.map((x) => <LinhaEmprestimo key={x.id} e={x} hoje={hoje} novo={x.id === novo} />)}
      </ul>
      <p className="fi-total">
        <span>Falta pagar, {e.n === 1 ? "no empréstimo ativo" : `nos ${e.n} empréstimos ativos`}</span>
        <b className="num">{reais(e.faltaPagar)}</b>
      </p>
      <p className="pt-pe-folha em-pe">
        <Icone nome="trocar" className="ico" />
        <span>O dinheiro emprestado entra no saldo do Caixa, mas não conta como receita. As parcelas e as devoluções saem do caixa com a categoria Empréstimos, fora das despesas do dia a dia, e vão ao contador numa aba própria.</span>
      </p>
    </Folha>
  );
}

// ------------------------------------------------------------------- T2 · Registrar empréstimo

function OpCartao({ nome, rotulo, sub, icone, marcado, aoMarcar, foco }: {
  nome: string; rotulo: string; sub: string; icone: NomeIcone; marcado: boolean; aoMarcar: () => void; foco?: boolean;
}) {
  return (
    <label className="opcao em-op">
      <input className="marcar" type="radio" name={nome} checked={marcado} onChange={aoMarcar} data-foco={foco ? "" : undefined} />
      <span><Icone nome={icone} className="ico" /><b>{rotulo}</b><small>{sub}</small></span>
    </label>
  );
}

type Opcao6 = "NENHUMA" | "UMA" | "CORRIGIR";

const ERROS_REGISTRAR = ["credorTipo", "credorNome", "finalidade", "valor", "recebidoEm", "forma", "valorContrato", "devolucao",
  "parcelasTotal", "parcelaValor", "parcelasAntes", "proximoVencimento", "parcelas"];

export function JanelaRegistrarEmprestimo({ c, aoFechar, aoFeito }: { c: CaixaFinanceiro; aoFechar: () => void; aoFeito: (f: Feito, id: string) => void }) {
  const hoje = c.hoje || hojeBrasilia();
  const [tipo, setTipo] = useState<CredorEmprestimo>("BANCO");
  const [nome, setNome] = useState("");
  const [para, setPara] = useState("");
  const [valor, setValor] = useState("");
  const [dia, setDia] = useState("");
  const [forma, setForma] = useState<FormaPagamento>("TRANSFERENCIA");
  const [contrato, setContrato] = useState("");
  const [modo, setModo] = useState<DevolucaoEmprestimo>("PARCELAS");
  const [total, setTotal] = useState("");
  const [parcela, setParcela] = useState("");
  const [antesTxt, setAntesTxt] = useState("");
  const [prox, setProx] = useState("");
  const [trocados, setTrocados] = useState<Record<number, string>>({});
  const [op6, setOp6] = useState<Opcao6 | null>(null);
  const [erros, setErros] = useState<string[]>([]);
  const [falha, setFalha] = useState<ErroApi | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [duvidaAberta] = useState(true);
  const corpo = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (falha) botao.current?.focus(); }, [falha]);
  const tem = (x: string) => erros.includes(x);
  const limpar = (x: string) => setErros((l) => l.filter((y) => y !== x));

  const e = c.emprestimos;
  const vValor = lerCentavos(valor);
  const vDia = lerDia(dia);
  const vContrato = contrato.trim() ? lerCentavos(contrato) : null;
  const vTotal = /^\d{1,3}$/.test(total.trim()) ? Number(total.trim()) : null;
  const vParcela = lerCentavos(parcela);
  const vAntes = antesTxt.trim() === "" ? 0 : /^\d{1,3}$/.test(antesTxt.trim()) ? Number(antesTxt.trim()) : null;
  const vProx = lerDia(prox);
  const livre = modo === "LIVRE";
  const socio = tipo === "SOCIO";

  // C6: a próxima parcela mais de um mês antes de hoje. A opção recomendada já vem marcada.
  const sugestao = !livre && vTotal && vTotal <= 120 && vAntes !== null && vAntes < vTotal && vProx
    ? sugerirParcelasAntes({ total: vTotal, antes: vAntes, proximo: vProx, hoje }) : null;
  const escolha: Opcao6 = op6 ?? (sugestao?.nenhuma ? "NENHUMA" : "UMA");
  const efetivo = sugestao && escolha !== "CORRIGIR"
    ? (escolha === "NENHUMA" && sugestao.nenhuma ? sugestao.nenhuma : sugestao.umaVencida)
    : vAntes !== null && vProx ? { antes: vAntes, proximo: vProx } : null;

  // B1: entrou antes do começo do caixa no T3jus (não soma no saldo). S-N1: antes do primeiro lançamento.
  const antigo = !!vDia && !!e?.comecoCaixa && vDia < e.comecoCaixa;
  const antesDoPrimeiro = !antigo && !!vDia && !c.abertura && !!e?.primeiroLancamento && vDia < e.primeiroLancamento;

  const prontas = !livre && vTotal && vTotal >= 1 && vTotal <= 120 && vParcela && efetivo && efetivo.antes < vTotal && vValor
    ? parcelasDoEmprestimo({ total: vTotal, antes: efetivo.antes, valor: vParcela, proximo: efetivo.proximo }) : null;
  const valores = prontas?.map((p) => {
    const t = trocados[p.n];
    return { ...p, valor: t !== undefined ? lerCentavos(t) ?? 0 : p.valor };
  }) ?? null;
  const algumTrocado = !!prontas && prontas.some((p) => trocados[p.n] !== undefined && lerCentavos(trocados[p.n]!) !== p.valor);
  const custo = valores && vValor ? custoEmprestimo({ valor: vValor, devolucao: "PARCELAS", parcelasAntes: efetivo!.antes, parcelaValor: vParcela, parcelas: valores.map((p) => p.valor) }) : null;
  const todosIguais = !!valores && valores.every((p) => p.valor === valores[0]!.valor);

  function validar(): string[] {
    const x: string[] = [];
    const n = nome.trim();
    if (n.length < 2 || n.length > 120) x.push("credorNome");
    if (para.trim() && (para.trim().length < 3 || para.trim().length > 120)) x.push("finalidade");
    if (!vValor) x.push("valor");
    if (!vDia || vDia > hoje) x.push("recebidoEm");
    if (contrato.trim() && !vContrato) x.push("valorContrato");
    if (!livre) {
      if (!vTotal || vTotal < 1 || vTotal > 120) x.push("parcelasTotal");
      if (!vParcela) x.push("parcelaValor");
      if (vAntes === null || (vTotal && vAntes >= vTotal)) x.push("parcelasAntes");
      if (!vProx || (vDia && vProx < vDia) || (efetivo && vTotal && vencimentoDaParcela(efetivo.proximo, efetivo.antes, vTotal) > somarDias(hoje, 3650))) x.push("proximoVencimento");
      if (valores && valores.some((p) => !p.valor)) x.push("parcelas");
    }
    return x;
  }

  async function enviar() {
    if (enviando) return;
    const x = validar();
    setFalha(null);
    if (x.length) {
      setErros(x);
      return focarPrimeiroErro(corpo.current);
    }
    setErros([]);
    setEnviando(true);
    const r = await chamarPortal<EmprestimoRegistrado>("/v1/escritorio/financeiro/emprestimos", {
      metodo: "POST",
      corpo: {
        credorTipo: tipo, credorNome: nome.trim(), finalidade: para.trim() || null, valor: vValor, valorContrato: vContrato,
        recebidoEm: vDia, forma, devolucao: modo,
        parcelasTotal: livre ? null : vTotal, parcelaValor: livre ? null : vParcela, parcelasAntes: livre ? null : efetivo!.antes,
        proximoVencimento: livre ? null : efetivo!.proximo,
        parcelas: !livre && algumTrocado && valores ? valores.map((p) => ({ n: p.n, valor: p.valor })) : null,
      },
    });
    setEnviando(false);
    if (r.ok) {
      const d = r.dados;
      const entrou = d.noCaixa ? `${reais(d.valor)} entraram no saldo do Caixa, sem contar como receita.` : "Fica fora do saldo, porque entrou antes do T3jus.";
      if (d.devolucao === "LIVRE") {
        return aoFeito({ titulo: "Empréstimo registrado.", texto: `${d.credor}: ${entrou} Cada devolução se registra na ficha do empréstimo.` }, d.id);
      }
      const p = d.situacao.proxima;
      return aoFeito({
        titulo: `Empréstimo registrado. ${d.parcelasCriadas === 1 ? "A parcela já está" : `As ${d.parcelasCriadas} parcelas já estão`} em A pagar.`,
        texto: `${d.credor}: ${entrou}${p ? ` A ${p.n === (d.parcelasAntes + 1) ? "primeira parcela" : `parcela ${p.n}/${d.parcelasTotal}`} vence em ${diaBr(p.vencimento)}.` : ""}`,
      }, d.id);
    }
    const campos = r.erro.detalhes?.campos;
    if (r.erro.codigo === "VALIDATION_ERROR" && Array.isArray(campos) && campos.length) {
      setErros(campos.map(String).filter((y) => ERROS_REGISTRAR.includes(y)));
      return focarPrimeiroErro(corpo.current);
    }
    setFalha(r.erro);
  }

  const campo = (id: string, rotulo: ReactNode, chave: string, v: string, mudar: (t: string) => void, o: {
    ajuda?: ReactNode; erro?: ReactNode; im?: "decimal" | "numeric"; foco?: boolean; max?: number;
  } = {}) => (
    <div className="campo">
      <label htmlFor={id}>{rotulo}</label>
      <input className="entrada" id={id} type="text" autoComplete="off" inputMode={o.im} maxLength={o.max} value={v}
        onChange={(ev) => { mudar(ev.target.value); limpar(chave); }} data-foco={o.foco ? "" : undefined}
        aria-invalid={tem(chave) || undefined} aria-describedby={descritoPor(!tem(chave) && !!o.ajuda && `${id}-aj`, tem(chave) && `${id}-er`)} />
      {tem(chave) ? <ErroCampo id={`${id}-er`}>{o.erro}</ErroCampo> : o.ajuda ? <p className="ajuda" id={`${id}-aj`}>{o.ajuda}</p> : null}
    </div>
  );

  const quantas = prontas?.length ?? 0;
  const previa = livre ? (
    <div className="em-previa" role="status">
      <p className="fi-rotulo">Sem parcelas fixas</p>
      <p className="em-previa-l">Nenhuma parcela nasce em A pagar. Cada vez que o escritório devolver, use <b>Registrar devolução</b> na ficha do empréstimo.</p>
      <p className="em-previa-c">
        Falta devolver começa em <b>{reais(vValor ?? 0)}</b>, sem juros.
        <small>Se as devoluções passarem do que entrou, o que passar fica como juros pagos {socio ? "ao sócio" : "a quem emprestou"}.</small>
      </p>
    </div>
  ) : valores && custo !== null ? (
    <div className="em-previa" role="status">
      <p className="fi-rotulo">O que vai nascer em A pagar</p>
      <p className="em-previa-l">
        <b>{todosIguais ? `${contar(quantas, "parcela", "parcelas")} de ${reais(valores[0]!.valor)}` : `${contar(quantas, "parcela", "parcelas")}, somando ${reais(valores.reduce((s, p) => s + p.valor, 0))}`}</b>
        {" "}· {quantas === 1 ? `em ${diaBr(valores[0]!.vencimento)}` : `de ${diaBr(valores[0]!.vencimento)} a ${diaBr(valores[valores.length - 1]!.vencimento)}`}
      </p>
      <p className="em-previa-c">
        Custo do empréstimo: <b>{reais(custo)}</b>
        <small>O total das parcelas menos o que entrou na conta. Inclui juros, IOF e tarifas.</small>
      </p>
      {efetivo!.antes > 0 ? (
        <p className="em-previa-c">
          Pago antes do T3jus: <b>{contar(efetivo!.antes, "parcela", "parcelas")}, {reais(efetivo!.antes * vParcela!)}</b>
          <small>Estimado pelo valor da parcela. Não sai do caixa daqui.</small>
        </p>
      ) : null}
      {vContrato && vValor ? (
        <p className="em-previa-c">
          IOF e tarifas na liberação: <b>{reais(vContrato - vValor)}</b>
          <small>Valor do contrato menos o que entrou na conta.</small>
        </p>
      ) : null}
      <details className="em-lista">
        <summary><Icone nome="baixo" className="ico ico-s" />Ver e mudar o valor de cada parcela</summary>
        <p className="ajuda">Mude o valor de uma parcela se o banco cobrar diferente: a primeira com tarifa, carência só de juros, tabela SAC. O total e o custo se refazem.</p>
        <ol className="em-parc-lista">
          {valores.map((p) => (
            <li key={p.n}>
              <label htmlFor={`pv-${p.n}`}><b>{p.n}/{vTotal}</b><small>{diaBr(p.vencimento)}</small></label>
              <input className="entrada" id={`pv-${p.n}`} type="text" inputMode="decimal" autoComplete="off"
                value={trocados[p.n] ?? paraCampo(vParcela!)} aria-label={`Valor da parcela ${p.n}, que vence em ${diaBr(p.vencimento)}`}
                aria-invalid={(tem("parcelas") && !p.valor) || undefined}
                onChange={(ev) => { const t = ev.target.value; setTrocados((m) => ({ ...m, [p.n]: t })); limpar("parcelas"); }} />
            </li>
          ))}
        </ol>
        {tem("parcelas") ? <ErroCampo id="rg-parc-er">Confira o valor de cada parcela: escreva em reais, como 1.250,00.</ErroCampo> : null}
      </details>
    </div>
  ) : (
    <div className="em-previa em-previa-vazia" role="status">
      <p className="fi-rotulo">O que vai nascer em A pagar</p>
      <p className="em-previa-l">{erros.length
        ? "A prévia volta quando o valor e o vencimento estiverem certos."
        : "A lista das parcelas e o custo do empréstimo aparecem aqui quando você preencher os campos de cima."}</p>
    </div>
  );

  return (
    <Janela id="j-emp" classe="fi-larga" aberta aoFechar={aoFechar} sobretitulo="Caixa" titulo="Registrar empréstimo" descricao="j-emp-d" aoEnviar={() => void enviar()}
      pe={<>
        <button className="btn btn-sec" type="button" onClick={aoFechar}>Cancelar</button>
        <button className="btn btn-pri" type="submit" aria-busy={enviando || undefined} ref={botao}>
          <Icone nome="check" className="ico" />{falha ? "Tentar de novo" : "Registrar empréstimo"}
        </button>
      </>}>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id="j-emp-d">Dinheiro emprestado que entrou na conta do escritório.</p>
        {erros.length ? <Aviso tom="urgencia" titulo={faltaAcertar(erros.length)}>O empréstimo ainda não foi registrado.</Aviso> : null}
        {falha ? (
          <Aviso tom="urgencia" titulo="Não deu para registrar o empréstimo.">
            <TextoFalha erro={falha} texto={`${falha.codigo === "VALIDATION_ERROR" ? textoRecusa(falha) + " " : ""}Nada foi salvo: o saldo do Caixa não mudou e nenhuma parcela entrou em A pagar. O que você preencheu continua aqui. Tente de novo.`} />
          </Aviso>
        ) : null}
        <fieldset className="fi-grupo-op">
          <legend>De quem é o empréstimo</legend>
          <div className="em-tres">
            <OpCartao nome="rg-tipo" rotulo="Banco ou financeira" sub="Banco, cooperativa, maquininha" icone="coluna" marcado={tipo === "BANCO"} aoMarcar={() => setTipo("BANCO")} foco />
            <OpCartao nome="rg-tipo" rotulo="Sócio do escritório" sub="Dinheiro de um sócio que vai voltar para ele" icone="pessoas" marcado={tipo === "SOCIO"} aoMarcar={() => setTipo("SOCIO")} />
            <OpCartao nome="rg-tipo" rotulo="Outra pessoa ou empresa" sub="Parente, amigo, outra empresa" icone="pessoa-mais" marcado={tipo === "OUTRO"} aoMarcar={() => setTipo("OUTRO")} />
          </div>
        </fieldset>
        <details className="em-duvida" open={duvidaAberta}>
          <summary><Icone nome="ajuda" className="ico ico-s" />Empréstimo, retirada ou aporte? Veja a diferença</summary>
          <ul className="em-duvidas">
            <li><Icone nome="pessoas" className="ico" /><span>Empréstimo no seu CPF que você pôs no escritório: escolha <b>Sócio</b>.</span></li>
            <li><Icone nome="pessoa-menos" className="ico" /><span>Parcela de um empréstimo seu, paga pelo escritório, sem o dinheiro ter entrado nele: é <b>Retirada</b>, não empréstimo.</span></li>
            <li><Icone nome="coluna" className="ico" /><span>Dinheiro seu que não vai voltar: é aporte de capital. Fale com o contador.</span></li>
          </ul>
        </details>
        <div className="fi-dois">
          {campo("rg-nome", socio ? "Nome do sócio" : "Nome do banco ou da pessoa", "credorNome", nome, setNome, {
            max: 120, erro: socio ? "Escreva o nome do sócio que emprestou." : "Escreva o nome do banco ou da pessoa que emprestou.",
          })}
          {campo("rg-para", <>Para que <span className="opcional">(opcional)</span></>, "finalidade", para, setPara, {
            max: 120, ajuda: "Como vai aparecer no Caixa e para o contador.", erro: "Escreva para que foi, com pelo menos 3 letras, ou deixe em branco.",
          })}
        </div>
        <div className="fi-dois">
          {campo("rg-valor", "Valor que entrou na conta", "valor", valor, setValor, {
            im: "decimal", ajuda: "O que caiu na conta, já sem IOF e tarifas.", erro: "Escreva quanto entrou na conta, já sem IOF e tarifas.",
          })}
          {campo("rg-dia", "Dia em que entrou", "recebidoEm", dia, setDia, {
            im: "numeric", ajuda: "dd/mm/aaaa · não pode ser depois de hoje",
            erro: vDia && vDia > hoje ? "Esta data é depois de hoje. Registre quando o dinheiro tiver entrado." : "Escreva a data no formato dd/mm/aaaa.",
          })}
        </div>
        {antigo ? (
          <Aviso tom="info" icone="historico" titulo="Entrou antes do T3jus: não soma no saldo.">
            {c.abertura
              ? `O caixa aqui começa no saldo de abertura de ${diaBr(c.abertura.data)}: este dinheiro já está nele, ou já foi gasto. `
              : `O caixa aqui começa em ${diaBr(e!.comecoCaixa!)}, no primeiro registro do escritório no T3jus: este dinheiro já estava na conta, ou já foi gasto. Cadastre o saldo de abertura em Escritório para o caixa começar do dia certo. `}
            {livre ? "As devoluções saem do caixa quando forem feitas." : "As parcelas que faltam entram em A pagar e saem do caixa quando forem pagas."}
          </Aviso>
        ) : antesDoPrimeiro ? (
          <Aviso tom="info" icone="historico" titulo="Entrou antes do primeiro lançamento?">
            O primeiro lançamento do escritório no T3jus é de {diaBr(e!.primeiroLancamento!)}. Se este dinheiro entrou antes de começar a usar o T3jus, cadastre o saldo de abertura em Escritório para o caixa começar do dia certo.
          </Aviso>
        ) : null}
        <div className="fi-dois">
          <div className="campo">
            <label htmlFor="rg-forma">Como entrou</label>
            <select className="entrada" id="rg-forma" value={forma} onChange={(ev) => setForma(ev.target.value as FormaPagamento)}>
              {FORMAS_ENTRADA.map((f) => <option key={f} value={f}>{FORMAS_PAGAMENTO[f]}</option>)}
            </select>
          </div>
          <div />
        </div>
        <details className="em-mais" open={!!contrato || tem("valorContrato") || undefined}>
          <summary><Icone nome="baixo" className="ico ico-s" />Mais detalhes: valor do contrato</summary>
          {campo("rg-contrato", <>Valor do contrato <span className="opcional">(opcional)</span></>, "valorContrato", contrato, setContrato, {
            im: "decimal", ajuda: "O valor antes do IOF e das tarifas, como está no contrato. A ficha e o contador veem a diferença como IOF e tarifas.",
            erro: "Escreva o valor do contrato em reais, ou deixe em branco.",
          })}
        </details>
        <fieldset className="fi-grupo-op">
          <legend>Como vai devolver</legend>
          <div className="em-dois-op">
            <OpCartao nome="rg-modo" rotulo="Em parcelas" sub="Valor e dia combinados, como no banco" icone="agenda" marcado={!livre} aoMarcar={() => setModo("PARCELAS")} />
            <OpCartao nome="rg-modo" rotulo="Devolve quando der" sub="Sem parcelas fixas, comum com sócio" icone="trocar" marcado={livre} aoMarcar={() => setModo("LIVRE")} />
          </div>
        </fieldset>
        {livre ? null : (
          <>
            <div className="fi-dois">
              {campo("rg-total", "Número de parcelas", "parcelasTotal", total, setTotal, {
                im: "numeric", max: 3, ajuda: "Todas as do contrato, de 1 a 120.", erro: "Escreva quantas parcelas tem o contrato, de 1 a 120.",
              })}
              {campo("rg-parcela", "Valor da parcela", "parcelaValor", parcela, setParcela, {
                im: "decimal", ajuda: "Se mudar de uma para outra, ajuste na lista abaixo.", erro: "Escreva o valor da parcela em reais. Ex.: 1.250,00.",
              })}
            </div>
            <div className="fi-dois">
              {campo("rg-antes", "Já pagou alguma parcela antes?", "parcelasAntes", antesTxt, setAntesTxt, {
                im: "numeric", max: 3, ajuda: "Já lançou parcelas deste empréstimo em A pagar? Conte-as aqui e cancele lá as que estão em aberto.",
                erro: "Escreva quantas parcelas já foram pagas, menos que o total. Nenhuma: 0.",
              })}
              {campo("rg-prox", "Vencimento da próxima parcela a pagar", "proximoVencimento", prox, setProx, {
                im: "numeric", ajuda: "dd/mm/aaaa · as outras vencem no mesmo dia dos meses seguintes",
                erro: !vProx ? "Escreva a data no formato dd/mm/aaaa."
                  : vDia && vProx < vDia ? `A próxima parcela não pode vencer antes do dia em que o dinheiro entrou (${diaBr(vDia)}). Confira a data.`
                  : "A última parcela passaria de 10 anos a partir de hoje. Confira o número de parcelas e o vencimento.",
              })}
            </div>
            {sugestao && vProx ? (
              <fieldset className="fi-grupo-op em-c6">
                <legend>A próxima parcela que você pôs vence em {diaBr(vProx)}, mais de um mês antes de hoje. As parcelas até {mesLongo(sugestao.ate)} já foram pagas?</legend>
                {sugestao.nenhuma ? (
                  <label className="opcao">
                    <input className="marcar" type="radio" name="rg-c6" checked={escolha === "NENHUMA"} onChange={() => setOp6("NENHUMA")} />
                    <span>Sim, {contar(sugestao.nenhuma.antes, "parcela foi paga", "parcelas foram pagas")} antes do T3jus<small>A próxima a pagar é a {sugestao.nenhuma.n}/{vTotal}, em {diaBr(sugestao.nenhuma.proximo)}. Nenhuma fica vencida.</small></span>
                  </label>
                ) : null}
                <label className="opcao">
                  <input className="marcar" type="radio" name="rg-c6" checked={escolha === "UMA"} onChange={() => setOp6("UMA")} />
                  <span>Uma ficou em aberto: {sugestao.umaVencida.antes} {sugestao.umaVencida.antes === 1 ? "foi paga" : "foram pagas"} antes<small>A {sugestao.umaVencida.n}/{vTotal}, de {diaBr(sugestao.umaVencida.proximo)}, entra em A pagar como vencida.</small></span>
                </label>
                <label className="opcao">
                  <input className="marcar" type="radio" name="rg-c6" checked={escolha === "CORRIGIR"} onChange={() => setOp6("CORRIGIR")} />
                  <span>Não, vou corrigir os números acima</span>
                </label>
              </fieldset>
            ) : null}
          </>
        )}
        {previa}
        <p className="fi-caixa-fixa">
          <Icone nome={antigo ? "historico" : "trocar"} className="ico" />
          {antigo ? (
            <span><b>Fica fora do saldo</b>, porque entrou antes do T3jus. {livre ? "As devoluções saem com a categoria Empréstimos." : `${quantas === 1 ? "A parcela que falta nasce" : quantas ? `As ${quantas} parcelas que faltam nascem` : "As parcelas que faltam nascem"} em A pagar, com a categoria Empréstimos.`}</span>
          ) : (
            <span>Entra no caixa <b>do escritório</b>: soma no saldo, mas não conta como receita. {livre ? "As devoluções saem com a categoria Empréstimos." : "As parcelas nascem em A pagar, com a categoria Empréstimos."}</span>
          )}
        </p>
        <p className="fi-ref"><Icone nome="historico" className="ico" /><span>Fica no histórico do escritório, com quem registrou e quando. Errou depois? Na ficha do empréstimo dá para marcar como lançado errado ou encerrar as parcelas que faltam.</span></p>
      </div>
    </Janela>
  );
}

// ------------------------------------------------------------------------- T3 · Ficha

type Parcela = FichaEmprestimo["parcelas"][number];
type Devolucao = FichaEmprestimo["devolucoes"][number];

function Comprovante({ c, anexos, aoAbrir, aoAnexar, rotulo }: { c: ContaPagar; anexos: Anexo[] | undefined; aoAbrir: (a: Anexo) => void; aoAnexar: () => void; rotulo: string }) {
  const a = anexos?.[0];
  if (a) {
    return (
      <span className="fi-docs">
        <button className="jr-link fi-doc-bt" type="button" onClick={() => aoAbrir(a)}>
          <Icone nome="link" className="ico" />Comprovante<span className="sr">: abrir {a.nome}, {rotulo}</span>
        </button>
      </span>
    );
  }
  if (!c.pagaEm) return <span className="fi-pq">—</span>;
  return (
    <div className="em-falta-comp">
      <span className="fi-pq">Sem comprovante</span>
      <button className="btn btn-sec btn-compacto" type="button" onClick={aoAnexar}><Icone nome="mais" className="ico" />Anexar<span className="sr"> o comprovante {rotulo}</span></button>
    </div>
  );
}

function Quatro({ itens }: { itens: [string, string, ReactNode][] }) {
  return (
    <dl className="fi-quatro em-quatro">
      {itens.map(([a, b, c]) => (
        <div key={a}><dt>{a}</dt><dd className="num">{b}{c ? <small className="em-q-sub">{c}</small> : null}</dd></div>
      ))}
    </dl>
  );
}

/** Uma linha do histórico, com as palavras da tela. */
function textoEvento(h: FichaEmprestimo["historico"][number], f: FichaEmprestimo, temComprovante: (id: string) => boolean): { o: ReactNode; d: ReactNode } | null {
  const x = h.dados as Record<string, unknown>;
  const n = (k: string) => (typeof x[k] === "number" ? (x[k] as number) : 0);
  const motivo = typeof x.motivo === "string" ? ` “${x.motivo}”` : "";
  switch (h.acao) {
    case "financeiro.emprestimo_registrado": {
      const entrou = f.noCaixa || x.noCaixa ? `${reais(f.valor)} entraram no saldo. ` : "";
      if (f.devolucao === "LIVRE") return { o: "registrou o empréstimo", d: `${entrou}Devolve quando der, sem juros.` };
      const criadas = n("parcelasCriadas");
      const antes = n("parcelasAntes");
      const parc = antes ? `${n("parcelas")} parcelas, ${antes} pagas antes do T3jus. As ${criadas} que faltavam nasceram em A pagar.`
        : criadas === 1 ? "A parcela nasceu em A pagar." : `As ${criadas} parcelas nasceram em A pagar.`;
      return { o: "registrou o empréstimo", d: `${entrou}${parc}${x.noCaixa === false ? " Fora do saldo: entrou antes do T3jus." : ""}` };
    }
    case "financeiro.conta_paga": {
      const p = f.parcelas.find((y) => y.pagaEm === x.pagaEm && (y.valorPago ?? y.valor) === x.valor);
      const forma = p ? nomeForma(p.forma) : null;
      return {
        o: p ? `marcou a parcela ${p.n}/${f.parcelasTotal} como paga` : "marcou uma parcela como paga",
        d: [reais(n("valor")), forma, p ? (temComprovante(p.id) ? "comprovante anexado" : "sem comprovante") : null].filter(Boolean).join(" · "),
      };
    }
    case "financeiro.emprestimo_devolucao": {
      const d = f.devolucoes.find((y) => y.id === x.conta);
      return {
        o: "registrou uma devolução",
        d: [reais(n("valor")), d ? nomeForma(d.forma) : null, d ? (temComprovante(d.id) ? "comprovante anexado" : "sem comprovante") : null,
          n("acimaDoQueFalta") ? `${reais(n("acimaDoQueFalta"))} além do que faltava` : null].filter(Boolean).join(" · "),
      };
    }
    case "financeiro.emprestimo_encerrado":
      if (f.devolucao === "LIVRE") {
        return { o: "encerrou o empréstimo", d: `${n("naoDevolvido") ? `Ficaram ${reais(n("naoDevolvido"))} sem devolver.` : "Nada faltava devolver."}${motivo}` };
      }
      return { o: "encerrou as parcelas que faltavam", d: `${contar(n("parcelasCanceladas"), "parcela cancelada", "parcelas canceladas")} (${reais(n("valorCancelado"))}).${motivo}` };
    case "financeiro.emprestimo_cancelado":
      return {
        o: "marcou como lançado errado",
        d: `${f.noCaixa || f.foraDoCaixa === null ? `Saiu do caixa (${reais(n("valor"))})` : "Saiu da exportação"}${n("parcelasCanceladas") ? ` e ${n("parcelasCanceladas") === 1 ? "a parcela foi cancelada" : `as ${n("parcelasCanceladas")} parcelas foram canceladas`}` : ""}.${motivo}`,
      };
    default:
      return null;
  }
}

function FolhaHistorico({ f, hoje, novo, temComprovante }: { f: FichaEmprestimo; hoje: string; novo: boolean; temComprovante: (id: string) => boolean }) {
  const itens = f.historico.map((h) => ({ h, t: textoEvento(h, f, temComprovante) })).filter((x) => x.t);
  return (
    <Folha id="t-hist" titulo="Histórico" icone="historico">
      <div className="eventos-dia" style={{ paddingTop: 0 }}>
        <ol className="eventos">
          {itens.map(({ h, t }, i) => {
            const d = diaDoInstante(h.em);
            return (
              <li key={`${h.acao}-${h.em}-${i}`}>
                <time dateTime={h.em}>{d === hoje ? horaDoInstante(h.em) : diaCurto(d)}{d === hoje ? null : <span className="sr">/{d.slice(0, 4)}</span>}</time>
                <span className={i === 0 && novo ? "pto forte" : "pto"} aria-hidden="true" />
                <div>
                  <p><b>{h.por?.nome ?? "Alguém da equipe"}</b> {t!.o}{i === 0 && novo ? <Selo tom="ativo">Novo</Selo> : null}</p>
                  <small>{t!.d}</small>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
      <p className="pt-pe-folha em-pe"><Icone nome="cadeado" className="ico" /><span>Nada se apaga. Correções ficam aqui, com quem fez, quando e o motivo.</span></p>
    </Folha>
  );
}

function FolhaDados({ f }: { f: FichaEmprestimo }) {
  const linhas: [string, ReactNode][] = [
    ["De quem", <>{f.credor}<small>{TIPO_LONGO[f.credorTipo]}</small></>],
  ];
  if (f.finalidade) linhas.push(["Para que", f.finalidade]);
  linhas.push(["Entrou na conta", <>{reais(f.valor)}<small>{[diaBr(f.recebidoEm), nomeForma(f.forma)].filter(Boolean).join(" · ")}</small></>]);
  if (f.valorContrato) linhas.push(["Valor do contrato", <>{reais(f.valorContrato)}<small>IOF e tarifas na liberação: {reais(f.iofTarifas ?? 0)}</small></>]);
  linhas.push(["No saldo do Caixa", f.cancelado ? <>Não<small>Lançado errado: saiu do saldo.</small></>
    : f.foraDoCaixa === "ANTES_DA_ABERTURA" ? <>Não<small>Entrou antes do T3jus: já está no saldo de abertura.</small></>
    : f.foraDoCaixa === "ANTES_DO_T3JUS" ? <>Não<small>Entrou antes do começo do caixa no T3jus. Cadastre o saldo de abertura em Escritório para o caixa começar do dia certo.</small></>
    : <>Sim, desde {diaBr(f.recebidoEm)}<small>Não conta como receita.</small></>]);
  linhas.push(["Registrado por", <>{f.registrado.por?.nome ?? "Alguém da equipe"}<small>{diaBr(diaDoInstante(f.registrado.em))}</small></>]);
  return (
    <Folha id="t-dados" titulo="Dados do empréstimo" icone="doc">
      <dl className="pd-ro">{linhas.map(([a, b]) => <div key={a}><dt>{a}</dt><dd>{b}</dd></div>)}</dl>
    </Folha>
  );
}

function situacaoParcela(p: Parcela, hoje: string, f: FichaEmprestimo): { selo: ReactNode; motivo: string | null } {
  if (p.pagaEm) return { selo: <Selo tom="ok" icone="check">Paga em {diaCurto(p.pagaEm)}</Selo>, motivo: [reais(p.valorPago ?? p.valor), nomeForma(p.forma)].filter(Boolean).join(" · ") };
  if (p.cancelada || p.situacao === "CANCELADA") {
    const quando = p.cancelada ? (diaDoInstante(p.cancelada.em) === hoje ? "hoje" : `em ${diaBr(diaDoInstante(p.cancelada.em))}`) : "";
    return { selo: <Selo tom="neutro">Cancelada</Selo>, motivo: `${f.cancelado ? "Lançado errado" : "Encerrada com as que faltavam"}${quando ? `, ${quando}` : ""}` };
  }
  if (p.vencimento < hoje) return { selo: <Selo tom="urgente" icone="alerta">Vencida</Selo>, motivo: null };
  if (p.vencimento === hoje) return { selo: <Selo tom="neutro">Vence hoje</Selo>, motivo: null };
  if (p.vencimento === somarDias(hoje, 1)) return { selo: <Selo tom="neutro">Vence amanhã</Selo>, motivo: null };
  if (p.vencimento <= somarDias(hoje, 6)) return { selo: <Selo tom="neutro">Vence {DIAS_SEMANA[diaDaSemana(p.vencimento)]}</Selo>, motivo: null };
  return { selo: <Selo tom="neutro">Em aberto</Selo>, motivo: null };
}

function FichaConteudo({ id, aoNome }: { id: string; aoNome: (n: string) => void }) {
  const hoje = hojeBrasilia();
  const { dados, recarregar } = useCarga<FichaEmprestimo>(`/v1/escritorio/financeiro/emprestimos/${id}`);
  const [janela, setJanela] = useState<"DEVOLUCAO" | "ENCERRAR" | "CANCELAR" | null>(null);
  const [pagar, setPagar] = useState<ContaPagar | null>(null);
  const [anexar, setAnexar] = useState<ContaPagar | null>(null);
  const [todas, setTodas] = useState(false);
  const [feito, setFeito] = useState<Feito | null>(null);
  const [novo, setNovo] = useState(false);
  const [falhaAbrir, setFalhaAbrir] = useState<string | null>(null);
  const f = dados && dados !== "erro" ? dados : null;
  const anexos = useAnexosFinanceiro(f ? [...f.parcelas.map((p) => p.id), ...f.devolucoes.map((d) => d.id)] : [], []);
  useEffect(() => { if (f) aoNome(f.credor); }, [f, aoNome]);
  // Vindo do Caixa (?devolver=1), a janela da devolução já abre.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (!q.has("devolver")) return;
    q.delete("devolver");
    window.history.replaceState(null, "", `${window.location.pathname}${q.size ? `?${q}` : ""}`);
    void Promise.resolve().then(() => setJanela("DEVOLUCAO"));
  }, []);

  if (dados === "erro") return <ErroAoCarregar oque="o empréstimo" aoTentar={recarregar} />;
  if (!f) return <Carregando rotulo="Carregando o empréstimo…" linhas={5} />;

  const s = f.situacao;
  const livre = f.devolucao === "LIVRE";
  const ativo = !f.cancelado && !f.encerrado && s.situacao === "ATIVO";
  const terminar = (x: Feito, comNovo = true) => {
    setJanela(null);
    setPagar(null);
    setAnexar(null);
    setFeito(x);
    setNovo(comNovo);
    recarregar();
    anexos.recarregar();
  };
  const temComprovante = (cid: string) => !!anexos.porDono.get(cid)?.length;
  async function abrir(a: Anexo) {
    setFalhaAbrir(null);
    const e = await abrirAnexo(a.id);
    if (e) setFalhaAbrir(e);
  }
  const proxima = s.proxima ? f.parcelas.find((p) => p.id === s.proxima!.id) ?? null : null;
  const dia = f.parcelas.reduce((m, p) => Math.max(m, Number(p.vencimento.slice(8, 10))), 0);
  const valorParcela = f.parcelaValor ?? 0;
  const modo = livre ? "devolve quando der" : `${f.parcelasTotal} parcelas de ${reais(valorParcela)}${dia ? ` · dia ${dia}` : ""}`;
  const seloSit = f.cancelado ? "Lançado errado · fora do caixa"
    : f.encerrado ? (diaDoInstante(f.encerrado.em) === hoje ? "Encerrado hoje" : `Encerrado em ${diaBr(diaDoInstante(f.encerrado.em))}`)
    : s.situacao === "QUITADO" ? "Quitado" : "Ativo";
  const temPago = s.jaPago > 0;

  // O cabeçalho: no vinho, de quem e para que; à direita, numa folha clara, o falta pagar e a próxima ação.
  const dir = f.cancelado ? (
    <section className="dir em-dir" aria-labelledby="t-dir">
      <p className="sobretitulo" id="t-dir">Fora do caixa</p>
      <p className="grande num">{reais(0)}</p>
      <p className="fi-oque"><b>Lançado errado {quandoFoi(f.cancelado.em, hoje)}.</b><br />
        Saiu do saldo e da exportação.{s.canceladas ? ` ${s.canceladas.n === 1 ? "A parcela foi cancelada" : `As ${s.canceladas.n} parcelas foram canceladas`} em A pagar.` : ""}</p>
    </section>
  ) : f.encerrado ? (
    <section className="dir em-dir" aria-labelledby="t-dir">
      <p className="sobretitulo" id="t-dir">{livre ? "Falta devolver" : "Falta pagar"}</p>
      <p className="grande num">{reais(0)}</p>
      <p className="fi-oque"><b>{livre ? "Empréstimo encerrado" : "Parcelas encerradas"} {quandoFoi(f.encerrado.em, hoje)}.</b><br />
        {livre
          ? `Devolvido ${reais(s.pagoNoT3jus)} de ${reais(f.valor)}.${s.naoDevolvido ? ` Encerrado com ${reais(s.naoDevolvido)} não devolvido.` : ""}`
          : `Pago no T3jus: ${reais(s.pagoNoT3jus)}. O que entrou e o que foi pago continuam no caixa.`}</p>
    </section>
  ) : livre ? (
    <section className="dir em-dir" aria-labelledby="t-dir">
      <p className="sobretitulo" id="t-dir">Falta devolver</p>
      <p className="grande num">{reais(s.faltaDevolver ?? 0)}</p>
      <p className="fi-oque"><b>Sem juros.</b> Devolvido {reais(s.pagoNoT3jus)} de {reais(f.valor)}.<br />
        {(() => {
          const u = f.devolucoes[f.devolucoes.length - 1];
          return u && u.pagaEm ? `Última devolução em ${diaCurto(u.pagaEm)}${u.forma ? `, por ${FORMAS_PAGAMENTO[u.forma]}` : ""}.` : "Nenhuma devolução registrada ainda.";
        })()}</p>
      {ativo ? <button className="btn btn-pri" type="button" onClick={() => setJanela("DEVOLUCAO")}><Icone nome="mais" className="ico" />Registrar devolução</button> : null}
    </section>
  ) : (
    <section className="dir em-dir" aria-labelledby="t-dir">
      <p className="sobretitulo" id="t-dir">Falta pagar</p>
      <p className="grande num">{reais(s.faltaPagar)}</p>
      <p className="fi-oque">
        {s.parcelasAbertas ? <><b>{contar(s.parcelasAbertas, "parcela", "parcelas")} de {reais(valorParcela)}</b>{s.terminaEm ? ` · termina em ${mesLongo(s.terminaEm)}` : ""}.</> : <b>Todas as parcelas foram pagas.</b>}
        {s.proxima ? <><br />Próxima: {s.proxima.n}/{f.parcelasTotal}, {quandoVence(s.proxima.vencimento, hoje)}.</> : null}
      </p>
      {ativo && proxima ? (
        <button className="btn btn-pri" type="button" onClick={() => setPagar(proxima)}>
          <Icone nome="check" className="ico" />Marcar a {proxima.n}/{f.parcelasTotal} como paga
        </button>
      ) : null}
    </section>
  );

  const motivo = f.encerrado ? (
    <div className="em-motivo">
      <Aviso tom="info" icone="cadeado" titulo={`${livre ? "Empréstimo encerrado" : "Parcelas encerradas"} por ${f.encerrado.por?.nome ?? "alguém da equipe"} ${quandoFoi(f.encerrado.em, hoje)}.`}>
        <b>Motivo:</b> “{f.encerrado.motivo}”{" "}
        {livre
          ? `${s.naoDevolvido ? `Ficaram ${reais(s.naoDevolvido)} sem devolver: para o contador, pode ser perdão da dívida ou aporte. ` : ""}A ficha fica só para leitura.`
          : `${s.canceladas ? `${s.canceladas.n === 1 ? "A parcela em aberto foi cancelada" : `As ${s.canceladas.n} parcelas em aberto foram canceladas`}. ` : ""}A ficha fica só para leitura.`}
      </Aviso>
    </div>
  ) : f.cancelado ? (
    <div className="em-motivo">
      <Aviso tom="info" icone="cadeado" titulo={`Marcado como lançado errado por ${f.cancelado.por?.nome ?? "alguém da equipe"} ${quandoFoi(f.cancelado.em, hoje)}.`}>
        <b>Motivo:</b> “{f.cancelado.motivo}”{" "}
        Saiu do saldo do Caixa e da exportação{s.canceladas ? `; ${s.canceladas.n === 1 ? "a parcela foi cancelada" : `as ${s.canceladas.n} parcelas foram canceladas`} em A pagar` : ""}. A ficha fica só para leitura.
      </Aviso>
    </div>
  ) : null;

  // As parcelas: as pagas e as quatro seguintes; o resto em "Ver todas".
  const primeiraAberta = f.parcelas.findIndex((p) => !p.pagaEm);
  const corte = primeiraAberta < 0 ? f.parcelas.length : primeiraAberta + 4;
  const mostradas = todas ? f.parcelas : f.parcelas.slice(0, corte);
  const resto = f.parcelas.length - mostradas.length;
  const rotuloParcela = (p: Parcela) => `da parcela ${p.n}/${f.parcelasTotal}`;
  const acaoParcela = (p: Parcela, cel = false) => {
    if (p.pagaEm || (p.cancelada && anexos.porDono.get(p.id)?.length)) {
      return <Comprovante c={p} anexos={anexos.porDono.get(p.id)} aoAbrir={(a) => void abrir(a)} aoAnexar={() => setAnexar(p)} rotulo={rotuloParcela(p)} />;
    }
    if (ativo && proxima && p.id === proxima.id) {
      return (
        <button className={cel ? "btn btn-sec" : "btn btn-sec btn-compacto"} type="button" onClick={() => setPagar(p)}
          aria-label={`Marcar paga a parcela ${p.n}/${f.parcelasTotal}`}>Marcar paga</button>
      );
    }
    return cel ? null : <span className="fi-pq">—</span>;
  };
  const antes = f.parcelasAntes;
  const vencAntes = (n: number) => (f.parcelas[0] ? vencimentoDaParcela(f.parcelas[0].vencimento, antes, n) : null);

  const principal = livre ? (
    <Folha id="t-parc" titulo="Devoluções" sub="Sem parcelas fixas: o escritório devolve quando der."
      acoes={ativo ? <button className="btn btn-sec" type="button" onClick={() => setJanela("DEVOLUCAO")}><Icone nome="mais" className="ico" />Registrar devolução</button> : undefined}>
      <Quatro itens={[
        ["Entrou na conta", reais(f.valor), diaBr(f.recebidoEm)],
        ["Devolvido", reais(s.pagoNoT3jus), s.devolucoes ? contar(s.devolucoes, "devolução", "devoluções") : "nenhuma devolução"],
        ["Falta devolver", reais(s.faltaDevolver ?? 0), "sem juros"],
        ["Custo do empréstimo", reais(s.custo), "o que passar do que entrou"],
      ]} />
      {f.devolucoes.length ? (
        <>
          <table className="so-pc fi-tab em-ftab" data-cartoes="600">
            <caption className="sr">Devoluções</caption>
            <colgroup>{["18%", "26%", "18%", "17%", "21%"].map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
            <thead><tr><th scope="col">Dia</th><th scope="col">Situação</th><th scope="col">Forma</th><th scope="col" style={{ textAlign: "right" }}>Valor</th><th scope="col">Comprovante</th></tr></thead>
            <tbody>
              {[...f.devolucoes].reverse().map((d: Devolucao) => (
                <tr key={d.id} className="fi-pago">
                  <td className="num">{diaBr(d.pagaEm ?? d.vencimento)}</td>
                  <td><div className="fi-sit"><Selo tom="ok" icone="check">Devolvido</Selo></div></td>
                  <td>{nomeForma(d.forma) ?? "—"}</td>
                  <td className="fi-v num">{reais(d.valorPago ?? d.valor)}</td>
                  <td><Comprovante c={d} anexos={anexos.porDono.get(d.id)} aoAbrir={(a) => void abrir(a)} aoAnexar={() => setAnexar(d)} rotulo={`da devolução de ${diaBr(d.pagaEm ?? d.vencimento)}`} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="cartoes so-cel" aria-label="Devoluções">
            {[...f.devolucoes].reverse().map((d) => (
              <li className="cartao" key={d.id}>
                <div className="c-topo">
                  <div><strong className="c-nome" style={{ fontSize: 18 }}>{diaBr(d.pagaEm ?? d.vencimento)}</strong>{d.forma ? <small>{FORMAS_PAGAMENTO[d.forma]}</small> : null}</div>
                  <span className="fi-cartao-v num" style={{ marginLeft: "auto" }}>{reais(d.valorPago ?? d.valor)}</span>
                </div>
                <div className="c-selos"><Selo tom="ok" icone="check">Devolvido</Selo></div>
                <div className="c-acoes"><Comprovante c={d} anexos={anexos.porDono.get(d.id)} aoAbrir={(a) => void abrir(a)} aoAnexar={() => setAnexar(d)} rotulo={`da devolução de ${diaBr(d.pagaEm ?? d.vencimento)}`} /></div>
              </li>
            ))}
          </ul>
        </>
      ) : <p className="fi-cob-sem">Nenhuma devolução registrada ainda.</p>}
      <p className="pt-pe-folha em-pe"><Icone nome="trocar" className="ico" /><span>Cada devolução sai do caixa com a categoria Empréstimos, fora das despesas. Se devolver mais do que falta, o que passar fica como juros pagos a {f.credor}.</span></p>
    </Folha>
  ) : (
    <Folha id="t-parc" titulo="Parcelas" sub="Cada parcela paga sai do caixa com a categoria Empréstimos, fora das despesas. A mesma parcela está em A pagar.">
      <Quatro itens={f.cancelado ? [
        ["Total das parcelas", reais(0), s.canceladas ? `${s.canceladas.n === 1 ? "a parcela foi cancelada" : `as ${s.canceladas.n} foram canceladas`}` : "nenhuma"],
        ["Custo do empréstimo", reais(0), "fora do caixa"],
        ["Já pago", reais(0), "nenhuma parcela paga"],
        ["Falta pagar", reais(0), "nada"],
      ] : [
        ["Total das parcelas", reais(s.totalParcelas ?? 0), f.encerrado ? "só as pagas; as outras foram canceladas"
          : f.parcelas.every((p) => p.valor === valorParcela) ? `${f.parcelasTotal} × ${reais(valorParcela)}` : contar(f.parcelasTotal ?? 0, "parcela", "parcelas")],
        ["Custo do empréstimo", reais(Math.max(s.custo, 0)), f.encerrado && s.custo <= 0 ? "pago menos o que entrou: nada, até aqui" : "total das parcelas menos o que entrou"],
        ["Já pago", reais(s.jaPago), s.pagoAntes
          ? <>antes do T3jus: {reais(s.pagoAntes)} (estimado)<br />no T3jus: {reais(s.pagoNoT3jus)}</>
          : s.pagoNoT3jus ? "no T3jus" : "nenhuma parcela paga"],
        ["Falta pagar", reais(s.faltaPagar), ativo && s.parcelasAbertas ? contar(s.parcelasAbertas, "parcela", "parcelas") : "nada"],
      ]} />
      {f.anteriorAoT3jus ? (
        <div className="fi-aviso-in em-aviso-topo">
          <Aviso tom="info" icone="historico" titulo="Entrou antes do T3jus: não soma no saldo.">
            {f.foraDoCaixa === "ANTES_DA_ABERTURA"
              ? "O caixa aqui começa no saldo de abertura, e este dinheiro já está nele. "
              : "O caixa aqui começa no primeiro registro do escritório no T3jus, e este dinheiro entrou antes. Cadastre o saldo de abertura em Escritório para o caixa começar do dia certo. "}
            As parcelas que faltam estão em A pagar e saem do caixa quando forem pagas.
          </Aviso>
        </div>
      ) : null}
      {falhaAbrir ? <div className="fi-aviso-in"><Aviso tom="urgencia" titulo="O arquivo não abriu.">{falhaAbrir}</Aviso></div> : null}
      <table className="so-pc fi-tab em-ftab" data-cartoes="600">
        <caption className="sr">Parcelas do empréstimo</caption>
        <colgroup>{["12%", "17%", "29%", "18%", "24%"].map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
        <thead><tr><th scope="col">Parcela</th><th scope="col">Vence</th><th scope="col">Situação</th><th scope="col" style={{ textAlign: "right" }}>Valor</th><th scope="col">Comprovante</th></tr></thead>
        <tbody>
          {antes ? (
            <tr className="fi-pago">
              <td><div className="fi-dt"><b>1 a {antes}</b></div></td>
              <td className="num">{vencAntes(1) ? <>{diaBr(vencAntes(1)!)}<br /><span className="fi-pq">a {diaBr(vencAntes(antes)!)}</span></> : "—"}</td>
              <td><div className="fi-sit"><Selo tom="neutro">Pagas antes do T3jus</Selo><p className="fi-motivo">Valor estimado: {antes} × {reais(valorParcela)}. Não saem do caixa daqui.</p></div></td>
              <td className="fi-v num">{reais(s.pagoAntes)}</td>
              <td><span className="fi-pq">—</span></td>
            </tr>
          ) : null}
          {mostradas.map((p) => {
            const x = situacaoParcela(p, hoje, f);
            return (
              <tr key={p.id} className={p.pagaEm ? "fi-pago" : p.cancelada ? "em-cancelada" : undefined}>
                <td><div className="fi-dt"><b>{p.n}/{f.parcelasTotal}</b></div></td>
                <td className="num">{diaBr(p.vencimento)}</td>
                <td><div className="fi-sit">{x.selo}{x.motivo ? <p className="fi-motivo">{x.motivo}</p> : null}</div></td>
                <td className="fi-v num">{reais(p.valorPago ?? p.valor)}</td>
                <td>{acaoParcela(p)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <ul className="cartoes so-cel" aria-label="Parcelas do empréstimo">
        {antes ? (
          <li className="cartao">
            <div className="c-topo">
              <div><strong className="c-nome" style={{ fontSize: 18 }}>Parcelas 1 a {antes}</strong>{vencAntes(1) ? <small>{diaBr(vencAntes(1)!)} a {diaBr(vencAntes(antes)!)}</small> : null}</div>
              <span className="fi-cartao-v num" style={{ marginLeft: "auto" }}>{reais(s.pagoAntes)}</span>
            </div>
            <div className="c-selos"><Selo tom="neutro">Pagas antes do T3jus</Selo></div>
            <p className="fi-pq">Valor estimado. Não saem do caixa daqui.</p>
          </li>
        ) : null}
        {mostradas.map((p) => {
          const a = acaoParcela(p, true);
          return (
            <li className="cartao" key={p.id}>
              <div className="c-topo">
                <div><strong className="c-nome" style={{ fontSize: 18 }}>Parcela {p.n}/{f.parcelasTotal}</strong><small>vence {diaBr(p.vencimento)}</small></div>
                <span className="fi-cartao-v num" style={{ marginLeft: "auto" }}>{reais(p.valorPago ?? p.valor)}</span>
              </div>
              <div className="c-selos">{situacaoParcela(p, hoje, f).selo}</div>
              {a ? <div className="c-acoes">{a}</div> : null}
            </li>
          );
        })}
      </ul>
      {resto > 0 ? (
        <p className="mais">
          <span>Mais {resto} parcelas {f.encerrado || f.cancelado ? "canceladas" : "em aberto"}, até {diaBr(f.parcelas[f.parcelas.length - 1]!.vencimento)}</span>
          <button className="btn btn-sec" type="button" onClick={() => setTodas(true)}>Ver todas</button>
        </p>
      ) : null}
      {ativo ? (
        <p className="pt-pe-folha em-pe"><Icone nome="ajuda" className="ico" /><span><b>Falta pagar</b> soma as parcelas que faltam, com os juros delas. Para quitar hoje, o valor é o do extrato do banco (o saldo devedor), que tira os juros futuros.</span></p>
      ) : null}
    </Folha>
  );

  const pe = !ativo ? null : livre && temPago ? (
    <Folha id="t-pe" titulo="Quitou ou não vai devolver o resto?" icone="ajustes">
      <div className="em-pe-corpo">
        <p>Quando a última devolução fechar a conta, ou se {f.credor} perdoar o resto, encerre aqui: o empréstimo fica quitado e sai da lista do Caixa. As devoluções continuam no caixa.</p>
        <button className="btn btn-perigo" type="button" onClick={() => setJanela("ENCERRAR")}><Icone nome="check" className="ico" />Encerrar o empréstimo</button>
      </div>
    </Folha>
  ) : temPago ? (
    <Folha id="t-pe" titulo="Quitou antes ou renegociou?" icone="ajustes">
      <div className="em-pe-corpo">
        <p>Para quitar antes, renegociar ou corrigir um erro descoberto depois do primeiro pagamento. As parcelas em aberto são canceladas; o que entrou e o que foi pago continuam no caixa.</p>
        <button className="btn btn-perigo" type="button" onClick={() => setJanela("ENCERRAR")}><Icone nome="xis" className="ico" />Encerrar as parcelas que faltam</button>
      </div>
    </Folha>
  ) : (
    <Folha id="t-pe" titulo="Registrou errado?" icone="ajustes">
      <div className="em-pe-corpo">
        <p>Nada foi pago ainda. Se registrou por engano ou com dados errados, marque como lançado errado: sai do caixa, da exportação{livre ? "" : " e de A pagar"}. Depois, registre de novo.</p>
        <button className="btn btn-perigo" type="button" onClick={() => setJanela("CANCELAR")}><Icone nome="xis" className="ico" />Lançado errado</button>
      </div>
    </Folha>
  );

  return (
    <div className="fi">
      <div className="ficha-cab em-cab">
        <div className="esq campo-vinho">
          <Icone nome="coluna" className="ico estatua" />
          <a className="voltar" href={ROTAS_FINANCEIRO.caixa}><Icone nome="esquerda" className="ico ico-s" />Caixa</a>
          <div className="ident">
            <div>
              <p className="sobretitulo">Empréstimo · {TIPO_LONGO[f.credorTipo]}</p>
              <h1>{f.credor}</h1>
              <p className="meta">
                <span className="selo em-selo-claro">{seloSit}</span>
                {f.anteriorAoT3jus ? <span className="selo em-selo-claro"><Icone nome="historico" className="ico" />Anterior ao T3jus</span> : null}
                <span>{[f.finalidade, modo].filter(Boolean).join(" · ")}</span>
              </p>
            </div>
          </div>
        </div>
        {dir}
      </div>
      {motivo}
      <div className="fi-grade">
        <div className="fi-col">{principal}{pe}</div>
        <aside className="fi-col" aria-label="Dados e histórico">
          <FolhaDados f={f} />
          <FolhaHistorico f={f} hoje={hoje} novo={novo} temComprovante={temComprovante} />
        </aside>
      </div>
      {janela === "DEVOLUCAO" ? <JanelaDevolucao f={f} aoFechar={() => setJanela(null)} aoFeito={terminar} /> : null}
      {janela === "ENCERRAR" ? <JanelaEncerrar f={f} aoFechar={() => setJanela(null)} aoFeito={terminar} /> : null}
      {janela === "CANCELAR" ? <JanelaCancelar f={f} aoFechar={() => setJanela(null)} aoFeito={terminar} /> : null}
      {pagar ? <JanelaPaga conta={pagar} aoFechar={() => setPagar(null)} aoFeito={(x) => terminar(x, true)} /> : null}
      {anexar ? <JanelaAnexarConta conta={anexar} aoFechar={() => setAnexar(null)} aoFeito={(x) => terminar(x, false)} /> : null}
      {feito ? <Toast feito={feito} aoFechar={() => setFeito(null)} /> : null}
    </div>
  );
}

export function EmprestimoFinanceiro({ id }: { id: string }) {
  const [nome, setNome] = useState("Empréstimo");
  return (
    <MolduraArea area="FINANCEIRO" secao="caixa" trilha={[{ nome }]} pagina="co-ficha co-carteira">
      {() => <FichaConteudo id={id} aoNome={setNome} />}
    </MolduraArea>
  );
}

// ------------------------------------------------------------------------- Janelas da ficha

function AlvoEmprestimo({ f, valor }: { f: FichaEmprestimo; valor: number }) {
  return (
    <div className="fi-alvo">
      <Icone nome={ICONE_TIPO[f.credorTipo]} className="ico" />
      <div>
        <strong>{f.credor} · {f.credorTipo === "SOCIO" ? "sócio" : f.credorTipo === "BANCO" ? "banco" : "outra pessoa"}</strong>
        <small>{[f.finalidade, `entrou em ${diaBr(f.recebidoEm)}`, f.devolucao === "LIVRE" ? "sem juros" : null].filter(Boolean).join(" · ")}</small>
      </div>
      <span className="fi-v num">{reais(valor)}</span>
    </div>
  );
}

function JanelaDevolucao({ f, aoFechar, aoFeito }: { f: FichaEmprestimo; aoFechar: () => void; aoFeito: (x: Feito) => void }) {
  const hoje = hojeBrasilia();
  const falta = f.situacao.faltaDevolver ?? 0;
  const [valor, setValor] = useState("");
  const [dia, setDia] = useState(diaBr(hoje));
  const [forma, setForma] = useState<FormaPagamento>("PIX");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erroArq, setErroArq] = useState<string | null>(null);
  const [progresso, setProgresso] = useState<number | null>(null);
  const [erros, setErros] = useState<string[]>([]);
  const [falha, setFalha] = useState<ErroApi | null>(null);
  const [enviando, setEnviando] = useState(false);
  const corpo = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (falha) botao.current?.focus(); }, [falha]);
  const tem = (x: string) => erros.includes(x);
  const v = lerCentavos(valor);
  const d = lerDia(dia);
  const acima = v && v > falta ? v - falta : 0;

  async function enviar() {
    if (enviando) return;
    const x: string[] = [];
    if (!v) x.push("valor");
    if (!d || d > hoje || d < f.recebidoEm) x.push("pagaEm");
    setFalha(null);
    if (x.length || erroArq) {
      setErros(x);
      return focarPrimeiroErro(corpo.current);
    }
    setErros([]);
    setEnviando(true);
    const r = await chamarPortal<DevolucaoRegistrada>(`/v1/escritorio/financeiro/emprestimos/${f.id}/devolucoes`, { metodo: "POST", corpo: { valor: v, pagaEm: d, forma } });
    if (r.ok) {
      let arq = "";
      if (arquivo) {
        setProgresso(0);
        const e = await enviarAnexo("CONTA", r.dados.id, arquivo, "COMPROVANTE", setProgresso);
        setProgresso(null);
        arq = e ? " O comprovante não foi guardado; anexe de novo na lista das devoluções." : " Comprovante anexado.";
      }
      setEnviando(false);
      const resta = r.dados.emprestimo.situacao.faltaDevolver ?? 0;
      return aoFeito({
        titulo: "Devolução registrada.",
        texto: `${reais(v!)} saíram do caixa com a categoria Empréstimos.${resta ? ` Falta devolver: ${reais(resta)}.` : " Nada falta devolver: o empréstimo está quitado."}${arq}`,
      });
    }
    setEnviando(false);
    const campos = r.erro.detalhes?.campos;
    if (r.erro.codigo === "VALIDATION_ERROR" && Array.isArray(campos) && campos.length) {
      setErros(campos.map(String));
      return focarPrimeiroErro(corpo.current);
    }
    setFalha(r.erro);
  }

  const erroDia = !d ? "Escreva a data no formato dd/mm/aaaa." : d > hoje ? "Esta data é depois de hoje. Registre quando o dinheiro sair da conta."
    : `A devolução não pode ser antes de ${diaBr(f.recebidoEm)}, quando o dinheiro entrou.`;
  return (
    <Janela id="j-dev" aberta aoFechar={aoFechar} sobretitulo={`Empréstimo de ${f.credor}`} titulo="Registrar devolução" descricao="j-dev-d" aoEnviar={() => void enviar()}
      pe={<>
        <button className="btn btn-sec" type="button" onClick={aoFechar}>Cancelar</button>
        <button className="btn btn-pri" type="submit" aria-busy={enviando || undefined} ref={botao}>
          <Icone nome="check" className="ico" />{falha ? "Tentar de novo" : "Registrar devolução"}
        </button>
      </>}>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id="j-dev-d">Dinheiro que o escritório devolveu a {f.credor}.</p>
        {erros.length ? <Aviso tom="urgencia" titulo={faltaAcertar(erros.length)}>A devolução ainda não foi registrada.</Aviso> : null}
        {falha ? (
          <Aviso tom="urgencia" titulo="Não deu para registrar a devolução.">
            <TextoFalha erro={falha} texto={`${MOTIVOS[String(falha.detalhes?.motivo)] ? `${textoRecusa(falha)} ` : ""}Nada foi salvo: o saldo e o falta devolver não mudaram. O que você preencheu continua aqui. Tente de novo.`} />
          </Aviso>
        ) : null}
        <AlvoEmprestimo f={f} valor={falta} />
        <div className="fi-dois">
          <div className="campo">
            <label htmlFor="dv-valor">Valor devolvido</label>
            <input className="entrada" id="dv-valor" type="text" inputMode="decimal" autoComplete="off" value={valor} data-foco=""
              onChange={(e) => { setValor(e.target.value); setErros((l) => l.filter((y) => y !== "valor")); }}
              aria-invalid={tem("valor") || undefined} aria-describedby={tem("valor") ? "dv-valor-er" : "dv-valor-aj"} />
            {tem("valor") ? <ErroCampo id="dv-valor-er">Escreva quanto o escritório devolveu.</ErroCampo> : <p className="ajuda" id="dv-valor-aj">Falta devolver: {reais(falta)}.</p>}
          </div>
          <div className="campo">
            <label htmlFor="dv-dia">Dia em que saiu da conta</label>
            <input className="entrada" id="dv-dia" type="text" inputMode="numeric" autoComplete="off" value={dia}
              onChange={(e) => { setDia(e.target.value); setErros((l) => l.filter((y) => y !== "pagaEm")); }}
              aria-invalid={tem("pagaEm") || undefined} aria-describedby={tem("pagaEm") ? "dv-dia-er" : "dv-dia-aj"} />
            {tem("pagaEm") ? <ErroCampo id="dv-dia-er">{erroDia}</ErroCampo>
              : <p className="ajuda" id="dv-dia-aj">dd/mm/aaaa · entre {diaBr(f.recebidoEm)}, quando o dinheiro entrou, e hoje</p>}
          </div>
        </div>
        {acima ? (
          <Aviso tom="info" icone="alerta" titulo={`Passa ${reais(acima)} do que falta devolver.`}>
            O que passar de {reais(falta)} fica como juros pagos a {f.credor}: {reais(acima)}. Depois desta devolução, nada falta devolver e o empréstimo fica quitado.
          </Aviso>
        ) : null}
        <div className="fi-dois">
          <div className="campo">
            <label htmlFor="dv-forma">Como saiu</label>
            <select className="entrada" id="dv-forma" value={forma} onChange={(e) => setForma(e.target.value as FormaPagamento)}>
              {FORMAS_DEVOLUCAO.map((x) => <option key={x} value={x}>{FORMAS_PAGAMENTO[x]}</option>)}
            </select>
          </div>
          <div />
        </div>
        <CampoAnexo rotulo="Comprovante" ajuda="Vai junto na aba Empréstimos da exportação para o contador."
          arquivo={arquivo} aoEscolher={(a, er) => { setArquivo(er ? null : a); setErroArq(er); }} erro={erroArq} progresso={progresso} />
        <p className="fi-caixa-fixa"><Icone nome="trocar" className="ico" /><span>Sai do caixa <b>do escritório</b> com a categoria Empréstimos, fora das despesas do dia a dia.</span></p>
      </div>
    </Janela>
  );
}

function CampoMotivo({ id, motivo, aoMudar, erro }: { id: string; motivo: string; aoMudar: (t: string) => void; erro: boolean }) {
  return (
    <div className="campo">
      <div className="pd-campo-linha"><label htmlFor={id}>Motivo</label><span className="contador" aria-hidden="true">{motivo.length} de 300</span></div>
      <textarea className="entrada" id={id} rows={3} maxLength={300} value={motivo} onChange={(e) => aoMudar(e.target.value)} data-foco=""
        aria-invalid={erro || undefined} aria-describedby={erro ? `${id}-er` : `${id}-aj`} />
      {erro ? <ErroCampo id={`${id}-er`}>Escreva o motivo, de 5 a 300 caracteres. Ele fica no histórico.</ErroCampo>
        : <p className="ajuda" id={`${id}-aj`}>De 5 a 300 caracteres. Fica no histórico.</p>}
    </div>
  );
}

function useMotivo(caminho: string, aoFeito: (x: Feito) => void, feito: Feito) {
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState(false);
  const [falha, setFalha] = useState<ErroApi | null>(null);
  const [enviando, setEnviando] = useState(false);
  const corpo = useRef<HTMLDivElement>(null);
  async function enviar() {
    if (enviando) return;
    const m = motivo.trim();
    setFalha(null);
    if (m.length < 5 || m.length > 300) {
      setErro(true);
      return focarPrimeiroErro(corpo.current);
    }
    setEnviando(true);
    const r = await chamarPortal<Emprestimo>(caminho, { metodo: "POST", corpo: { motivo: m } });
    setEnviando(false);
    if (r.ok) return aoFeito(feito);
    if (r.erro.codigo === "VALIDATION_ERROR" && Array.isArray(r.erro.detalhes?.campos) && (r.erro.detalhes!.campos as unknown[]).includes("motivo")) {
      setErro(true);
      return focarPrimeiroErro(corpo.current);
    }
    setFalha(r.erro);
  }
  return { motivo, setMotivo: (t: string) => { setMotivo(t); setErro(false); }, erro, falha, enviando, corpo, enviar };
}

function JanelaEncerrar({ f, aoFechar, aoFeito }: { f: FichaEmprestimo; aoFechar: () => void; aoFeito: (x: Feito) => void }) {
  const s = f.situacao;
  const livre = f.devolucao === "LIVRE";
  const abertas = s.parcelasAbertas ?? 0;
  const { motivo, setMotivo, erro: erroMotivo, falha, enviando, corpo, enviar } = useMotivo(`/v1/escritorio/financeiro/emprestimos/${f.id}/encerrar`, aoFeito, livre
    ? { titulo: "Empréstimo encerrado.", texto: `${f.credor} saiu da lista do Caixa. As devoluções continuam no caixa e na exportação.` }
    : { titulo: "Parcelas encerradas.", texto: `${abertas === 1 ? "A parcela em aberto foi cancelada" : `As ${abertas} parcelas em aberto foram canceladas`} em A pagar. O que entrou e o que foi pago continuam no caixa.` });
  const pagas = f.parcelas.filter((p) => p.pagaEm);
  const pagoT3 = s.pagoNoT3jus;
  return (
    <Janela id="j-enc" aberta alerta aoFechar={aoFechar} sobretitulo={`Empréstimo · ${f.credor}`} titulo={livre ? "Encerrar o empréstimo" : "Encerrar as parcelas que faltam"} descricao="j-enc-d"
      aoEnviar={() => void enviar()}
      pe={<>
        <button className="btn btn-sec" type="button" onClick={aoFechar}>Voltar</button>
        <button className="btn btn-perigo" type="submit" aria-busy={enviando || undefined}>
          <Icone nome={livre ? "check" : "xis"} className="ico" />{livre ? "Encerrar o empréstimo" : `Encerrar ${abertas === 1 ? "a parcela" : `as ${abertas} parcelas`}`}
        </button>
      </>}>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id="j-enc-d">{livre ? `Para quando a última devolução fechou a conta, ou ${f.credor} perdoou o resto.` : "Para quitação antecipada, renegociação ou erro descoberto depois de pagar."}</p>
        {falha ? <Aviso tom="urgencia" titulo="Não deu para encerrar."><TextoFalha erro={falha} texto={`${textoRecusa(falha)} Nada mudou.`} /></Aviso> : null}
        {livre ? (
          <ul className="fi-check em-o-que">
            <li><Icone nome="check" className="ico" /><span><b>Fica quitado e sai da lista do Caixa</b><small>A ficha continua aberta, só para leitura.</small></span></li>
            {s.faltaDevolver ? (
              <li><Icone nome="alerta" className="ico" /><span><b>Ficam {reais(s.faltaDevolver)} sem devolver</b><small>Para o contador, o que não foi devolvido pode ser perdão da dívida ou aporte. Fale com ele.</small></span></li>
            ) : null}
            <li><Icone nome="check" className="ico" /><span>O que entrou ({reais(f.valor)}) e as devoluções ({reais(pagoT3)}) ficam<small>No saldo do Caixa e na exportação para o contador, como estão.</small></span></li>
          </ul>
        ) : (
          <ul className="fi-check em-o-que">
            <li><Icone nome="xis" className="ico" /><span><b>{abertas === 1 ? "A parcela em aberto" : `As ${abertas} parcelas em aberto`} ({reais(s.faltaPagar)}) {abertas === 1 ? "será cancelada" : "serão canceladas"}</b>
              <small>Saem de A pagar, da previsão do Caixa e do falta pagar.{s.proxima ? ` A próxima seria a ${s.proxima.n}/${f.parcelasTotal}, em ${diaCurto(s.proxima.vencimento)}.` : ""}</small></span></li>
            <li><Icone nome="check" className="ico" /><span>
              {f.noCaixa ? `O que entrou (${reais(f.valor)}) e ` : ""}{pagas.length === 1 ? `a parcela paga (${reais(pagoT3)})` : pagas.length ? `as ${pagas.length} parcelas pagas (${reais(pagoT3)})` : "o que foi pago antes"} {f.noCaixa || pagas.length !== 1 ? "ficam" : "fica"}
              <small>No saldo do Caixa e na exportação para o contador, como estão.</small></span></li>
          </ul>
        )}
        <CampoMotivo id="en-motivo" motivo={motivo} aoMudar={setMotivo} erro={erroMotivo} />
        {livre ? null : (
          <div className="em-casos">
            <p className="fi-rotulo">Use para</p>
            <ul className="fi-check">
              <li><Icone nome="check" className="ico" /><span><b>Quitar antes:</b> marque como paga uma parcela com o valor que o banco cobrou para quitar, e então encerre o resto.</span></li>
              <li><Icone nome="check" className="ico" /><span><b>Renegociar:</b> encerre este e registre o novo empréstimo.</span></li>
              <li><Icone nome="check" className="ico" /><span><b>Erro descoberto depois de pagar:</b> encerre e registre de novo, contando em “Já pagou antes” o que foi pago.</span></li>
            </ul>
          </div>
        )}
        <p className="fi-ref"><Icone nome="historico" className="ico" /><span>Nada se apaga. Fica no histórico, com o motivo, quem encerrou e quando. A ficha continua aberta, só para leitura.</span></p>
      </div>
    </Janela>
  );
}

function JanelaCancelar({ f, aoFechar, aoFeito }: { f: FichaEmprestimo; aoFechar: () => void; aoFeito: (x: Feito) => void }) {
  const s = f.situacao;
  const abertas = s.parcelasAbertas ?? 0;
  const { motivo, setMotivo, erro: erroMotivo, falha, enviando, corpo, enviar } = useMotivo(`/v1/escritorio/financeiro/emprestimos/${f.id}/cancelar`, aoFeito, {
    titulo: "Marcado como lançado errado.",
    texto: `${f.noCaixa ? "Saiu do saldo do Caixa e da exportação" : "Saiu da exportação"}${abertas ? ", e as parcelas foram canceladas em A pagar" : ""}. Registre de novo com os dados certos.`,
  });
  return (
    <Janela id="j-can" aberta alerta aoFechar={aoFechar} sobretitulo={`Empréstimo · ${f.credor}`} titulo="Lançado errado" descricao="j-can-d" aoEnviar={() => void enviar()}
      pe={<>
        <button className="btn btn-sec" type="button" onClick={aoFechar}>Voltar</button>
        <button className="btn btn-perigo" type="submit" aria-busy={enviando || undefined}><Icone nome="xis" className="ico" />Marcar como lançado errado</button>
      </>}>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id="j-can-d">Para um empréstimo registrado por engano ou com dados errados, sem nada pago.</p>
        {falha ? <Aviso tom="urgencia" titulo="Não deu para marcar como lançado errado."><TextoFalha erro={falha} texto={`${textoRecusa(falha)} Nada mudou.`} /></Aviso> : null}
        <ul className="fi-check em-o-que">
          {f.noCaixa ? (
            <li><Icone nome="xis" className="ico" /><span><b>Sai do saldo do Caixa: {reais(f.valor)}</b><small>Também sai da exportação para o contador.</small></span></li>
          ) : (
            <li><Icone nome="xis" className="ico" /><span><b>Sai da exportação para o contador</b><small>O saldo do Caixa não muda: este empréstimo já estava fora dele, porque entrou antes do T3jus.</small></span></li>
          )}
          {abertas ? (
            <li><Icone nome="xis" className="ico" /><span><b>{abertas === 1 ? "A parcela em aberto" : `As ${abertas} parcelas em aberto`} ({reais(s.faltaPagar)}) {abertas === 1 ? "é cancelada" : "são canceladas"}</b><small>Saem de A pagar e da previsão.</small></span></li>
          ) : null}
          <li><Icone nome="historico" className="ico" /><span>Fica no histórico, com o motivo<small>Nada se apaga. A ficha continua aberta, só para leitura.</small></span></li>
        </ul>
        <CampoMotivo id="cn-motivo" motivo={motivo} aoMudar={setMotivo} erro={erroMotivo} />
        <p className="fi-ref"><Icone nome="ajuda" className="ico" /><span>Só vale enquanto nada foi pago. Com uma parcela paga, use <b>Encerrar as parcelas que faltam</b>: o que entrou e o que foi pago ficam no caixa.</span></p>
      </div>
    </Janela>
  );
}
