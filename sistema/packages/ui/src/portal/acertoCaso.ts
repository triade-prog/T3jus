// O acerto do caso encerrado na ficha do caso (EX-17, F3.128, F3.132): os textos, sem React,
// para os testes de unidade. Desenho aprovado em docs/design/aprovadas/portal-jornada-fechamento
// (com levantamento) e em docs/design/aprovadas/portal-fechamento-sem-levantamento (estados 3 e 4,
// sem levantamento). Valores e o link só para quem tem a área Financeiro.

import { reais, type FichaCaso, type ResumoAcertoCaso } from "@t3jus/domain";
import { diaCurto } from "./agenda.ts";
import { juntarComE } from "./clientes.ts";
import { diasEntre } from "./comercial.ts";
import { primeiroNome } from "./equipe.ts";
import { dia, parcelaCurta } from "./fechamento.ts";
import { ROTAS_FINANCEIRO } from "./financeiro.ts";

const LEV: Record<string, string> = { RPV: "RPV recebida", ALVARA: "Alvará levantado", PRECATORIO: "Precatório recebido", ACORDO: "Acordo recebido" };
const RES: Record<string, string> = { GANHO: "ganho", PERDA: "perda", ACORDO: "acordo" };
type Outro = NonNullable<ResumoAcertoCaso["outros"]>[number];

/** Sem levantamento (F3.132). Sem o campo (API de antes), fica o quadro de antes. */
export const semLevantamento = (a: ResumoAcertoCaso) => a.semTerceiros ?? false;

/** "a parcela 6/6 de Noemi", "as custas": o que falta receber, dito curto. */
function oQueReceber(o: Outro): string {
  const quem = o.cliente ? ` de ${primeiroNome(o.cliente)}` : "";
  if (o.tipo === "REEMBOLSO") return o.categoria === "CUSTAS" ? "as custas" : "o reembolso";
  if (o.tipo === "EXITO") return `o êxito${quem}`;
  return `a ${parcelaCurta(o.descricao ?? o.nome).toLowerCase()}${quem}`;
}

/** O selo do cabeçalho e a frase do âmbar da etapa (decisão 21; estado 3 sem levantamento). */
export function textoAcertoNoCaso(f: FichaCaso): { selo: string; frase: string } | null {
  const a = f.acerto;
  if (!a?.pendente) return null;
  const quando = f.encerradoEm ? ` em ${dia(f.encerradoEm)}` : "";
  const res = f.resultado ? ` com ${RES[f.resultado] ?? f.resultado.toLowerCase()}` : "";
  const outros = a.outros ?? [];
  const falta = !a.comValores || !outros.length
    ? "encerrar"
    : semLevantamento(a) && outros.some((o) => o.tipo)
    ? `receber ${juntarComE([...new Set(outros.map(oQueReceber))])}, e encerrar`
    : `pagar ${juntarComE(outros.map((o) => o.nome))} e encerrar`;
  return {
    selo: "Encerrado · acerto pendente",
    frase: a.comValores ? `Encerrado${res}${quando}. Falta o acerto no Financeiro: ${falta}.` : `Encerrado${res}${quando}. O acerto está com o Financeiro.`,
  };
}

/** "Ver o acerto": a ficha do repasse com levantamento; sem ele, a folha do contrato (decisão 4). */
export function hrefDoAcerto(a: ResumoAcertoCaso | null | undefined, casoId?: string): string | null {
  if (!a?.pendente) return null;
  if (a.levantamentoId) return ROTAS_FINANCEIRO.repasse(a.levantamentoId);
  return a.contratoId ? `${ROTAS_FINANCEIRO.contrato(a.contratoId)}#t-fecha${casoId ? `-${casoId}` : ""}` : null;
}

/** Uma linha do quadro "Acerto no Financeiro": feito, falta ou depois (relógio). */
export type ItemAcerto = { tom: "ok" | "falta" | "depois"; forte?: string; texto: string; sub?: string };

/** As linhas do quadro (decisão 22 e estados 3 e 4). */
export function itensDoAcerto(a: ResumoAcertoCaso, caso: { encerradoEm: string | null; resultado: string | null }, hoje: string): ItemAcerto[] {
  const v = a.comValores;
  const sem = semLevantamento(a);
  const itens: ItemAcerto[] = [];
  if (sem) {
    itens.push({ tom: "ok", texto: "Nenhum valor de terceiros entrou", sub: v ? "Sem levantamento, sem repasse e sem prestação de contas" : undefined });
    if (a.semExito) {
      itens.push({ tom: "ok", texto: "Sem êxito a cobrar",
        sub: v && caso.resultado === "PERDA" && caso.encerradoEm ? `O caso terminou com perda em ${dia(caso.encerradoEm)}` : undefined });
    }
  }
  for (const x of a.exitos) {
    itens.push(x.feito
      ? { tom: "ok", texto: x.naoCobrado ? "Êxito não cobrado" : "Êxito conferido",
          sub: v ? [x.valor ? reais(x.valor) : null, x.por ? `por ${primeiroNome(x.por.nome)}` : null, x.em ? `em ${dia(x.em)}` : null].filter(Boolean).join(" · ") : undefined }
      : { tom: "falta", forte: "Êxito", texto: " esperando a conferência", sub: v && x.valor ? reais(x.valor) : undefined });
  }
  if (a.entrou) itens.push({ tom: "ok", texto: LEV[a.entrou.tipo] ?? "Dinheiro recebido", sub: v ? [a.entrou.valor ? reais(a.entrou.valor) : null, `em ${dia(a.entrou.em)}`].filter(Boolean).join(" · ") : undefined });
  for (const r of a.repasses) {
    const p = primeiroNome(r.cliente);
    itens.push(r.feito
      ? { tom: "ok", texto: `${p} recebeu a parte que cabe ao cliente`, sub: v ? [r.valor ? reais(r.valor) : null, r.em ? `em ${dia(r.em)}` : null].filter(Boolean).join(" · ") : undefined }
      : { tom: "falta", forte: `${p}:`, texto: ` falta repassar${v && r.valor ? ` ${reais(r.valor)}` : ""}`, sub: r.prazo ? `até ${dia(r.prazo)}` : undefined });
  }
  if (sem && v) {
    for (const c of a.contratos.filter((x) => x.tudoRecebido)) {
      itens.push({ tom: "ok", texto: `${primeiroNome(c.cliente)}: tudo recebido`,
        sub: [c.numero, c.recebido ? `${reais(c.recebido)}${c.ultimaRecebidaEm ? ` em ${diaCurto(c.ultimaRecebidaEm)}` : ""}` : null].filter(Boolean).join(" · ") });
    }
  }
  if (v) {
    for (const o of a.outros ?? []) {
      if (sem && o.tipo === "REEMBOLSO") {
        itens.push({ tom: "falta", forte: "Custas adiantadas:", texto: ` falta o reembolso de ${reais(o.valor ?? 0)}`,
          sub: o.junto ? `Vai junto com a ${parcelaCurta(o.junto).toLowerCase()}${o.cliente ? ` de ${primeiroNome(o.cliente)}` : ""}` : "A reembolsar, em A pagar" });
      } else if (sem && o.tipo) {
        const d = o.vencimento ? diasEntre(o.vencimento, hoje) : 0;
        itens.push({ tom: "falta", forte: `${primeiroNome(o.cliente ?? o.nome)}:`, texto: ` falta ${oQueReceber({ ...o, cliente: null })}${o.valor ? `, ${reais(o.valor)}` : ""}`,
          sub: o.vencimento ? (d > 0 ? `Venceu em ${diaCurto(o.vencimento)} · ${d} ${d === 1 ? "dia" : "dias"} de atraso` : `Vence em ${diaCurto(o.vencimento)}`) : undefined });
      } else {
        itens.push({ tom: "falta", forte: `${o.nome}:`, texto: ` falta pagar${o.valor ? ` ${reais(o.valor)}` : ""}`, sub: o.prazo ? `até ${dia(o.prazo)}` : undefined });
      }
    }
  } else if (sem && !a.fechado) {
    itens.push({ tom: "depois", texto: "O acerto está com o Financeiro", sub: "Os valores ficam no Financeiro" });
  } else if (a.faltaOutros) {
    itens.push({ tom: "falta", texto: "Faltam pagamentos a terceiros", sub: "Os valores ficam no Financeiro" });
  }
  if (!a.fechado && (a.entrou || (sem && a.pendente))) {
    const abertos = v ? a.contratos.filter((c) => c.situacao === "ATIVO") : [];
    itens.push({ tom: "depois",
      texto: `Depois: encerrar no financeiro${abertos.length ? ` e ${abertos.length === 1 ? `o contrato ${abertos[0]!.numero}` : `os contratos ${juntarComE(abertos.map((c) => c.numero))}`}` : ""}`,
      sub: abertos.length ? "Os dois de uma vez, na mesma janela" : undefined });
  }
  return itens;
}

/** A linha de cada contrato na folha "Contratos ligados" do Jurídico (estado 3). */
export function situacaoDoContratoNoCaso(a: ResumoAcertoCaso | null | undefined, contratoId: string): string | null {
  const c = a?.contratos.find((x) => x.id === contratoId);
  if (!c) return null;
  if (c.situacao === "ENCERRADO" && c.encerradoEm) return `Encerrado em ${dia(c.encerradoEm)}${c.encerradoPor ? `, por ${primeiroNome(c.encerradoPor.nome)}, em Contratos` : ""}`;
  return a?.pendente && c.situacao === "ATIVO" ? "ativo até o acerto" : null;
}
