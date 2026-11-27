// O êxito lançado depois do alvará já nasce pago (F3.199; CH-07, FI-05). Os textos do desenho
// aprovado em docs/design/aprovadas/portal-exito-alvara-conferir (D39): o aviso da janela de
// conferir, a confirmação do lançado, a recusa do "Não cobrar" (C2), a linha curta e o aviso da
// divisão do alvará (C3: limitado ao que falta do êxito) e as linhas da ficha do repasse.

import {
  dataBr, reais,
  type ExitoParaConferir, type ExitoSituacao, type HonorariosDoAlvara, type PagouDaParte, type PessoaRef, type PropostaRepasse, type TipoLevantamento,
} from "@t3jus/domain";
import { diaCurto } from "./agenda.ts";
import { nomeDoLevantamento } from "./baixa.ts";
import { primeiroNome } from "./equipe.ts";

const FUSO = { timeZone: "America/Sao_Paulo" } as const;
const diaDoInstante = (em: string) => new Intl.DateTimeFormat("en-CA", { ...FUSO, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(em));

const PLURAL: Record<TipoLevantamento, string> = { ALVARA: "alvarás", RPV: "RPVs", PRECATORIO: "precatórios", ACORDO: "depósitos de acordo" };

/** "2 alvarás"; com tipos diferentes, "2 levantamentos". */
function variosLevantamentos(hs: { tipo: TipoLevantamento }[]): string {
  const t = hs[0]!.tipo;
  return `${hs.length} ${hs.every((h) => h.tipo === t) ? PLURAL[t] : "levantamentos"}`;
}
const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Os honorários que já entraram e ainda estão livres (o mesmo sinal do HONORARIOS_JA_ENTRARAM). */
export function honorariosLivres(x: Pick<ExitoParaConferir, "honorariosAlvara">): HonorariosDoAlvara[] {
  return (x.honorariosAlvara ?? []).filter((h) => h.livre > 0);
}

/** O link do aviso: "Ver o alvará de 12/11 em Repasses" ("Ver o RPV de…"), pelo tipo do levantamento. */
export function textoVerLevantamento(h: Pick<HonorariosDoAlvara, "tipo" | "entrouEm">): string {
  return `Ver o ${nomeDoLevantamento(h.tipo)} de ${diaCurto(h.entrouEm)} em Repasses`;
}

export interface AvisoConferir {
  tom: "info" | "atencao";
  titulo: string;
  paras: string[];
  /** Com mais de um levantamento: um item para cada, do mais antigo. */
  lista: { rotulo: string; valor: number }[];
  /** Com um levantamento só: o link para a ficha dele. */
  link: { texto: string; levantamentoId: string } | null;
}

/**
 * O aviso acima do "Lançar" (ea-conferir, ea-conferir-sobra, ea-conferir-dois). O tom vira de
 * atenção quando o lançado fica abaixo dos honorários que já entraram: o excesso foi descontado do
 * cliente além do êxito, e a devolução ainda é feita fora do T3jus (F3.197).
 */
export function avisoConferir(x: Pick<ExitoParaConferir, "honorariosAlvara" | "cliente">, valorLancado: number | null): AvisoConferir | null {
  const hs = honorariosLivres(x);
  if (!hs.length) return null;
  const pn = primeiroNome(x.cliente.nome);
  const total = hs.reduce((t, h) => t + h.livre, 0);
  const um = hs.length === 1;
  const titulo = um
    ? `Já entraram ${reais(total)} de honorários do êxito de ${pn}, pelo ${nomeDoLevantamento(hs[0]!.tipo)} de ${dataBr(hs[0]!.entrouEm)}.`
    : `Já entraram ${reais(total)} de honorários do êxito de ${pn}, por ${variosLevantamentos(hs)}.`;
  const lista = um ? [] : hs.map((h) => ({ rotulo: `${maiuscula(nomeDoLevantamento(h.tipo))} de ${dataBr(h.entrouEm)}`, valor: h.livre }));
  const link = um ? { texto: textoVerLevantamento(hs[0]!), levantamentoId: hs[0]!.levantamentoId } : null;
  const sobra = valorLancado !== null && valorLancado > 0 && valorLancado < total ? total - valorLancado : 0;
  if (sobra) {
    return {
      tom: "atencao", titulo, lista, link,
      paras: [
        "Ao lançar, a parcela do êxito nasce paga por esses honorários.",
        `Os honorários ${um ? `do ${nomeDoLevantamento(hs[0]!.tipo)}` : "que já entraram"} passam do êxito lançado em ${reais(sobra)}. Esse valor foi descontado de ${pn} além do êxito. Combine com ${pn} a devolução, que ainda é feita fora do T3jus.`,
      ],
    };
  }
  return {
    tom: "info", titulo, lista, link,
    paras: [um
      ? "Ao lançar, a parcela do êxito nasce paga por esses honorários. Se o valor lançado for maior, o resto fica em A receber."
      : `Ao lançar, a parcela do êxito nasce paga por esses honorários, a começar pelo ${nomeDoLevantamento(hs[0]!.tipo)} mais antigo. Se o valor lançado for maior, o resto fica em A receber.`],
  };
}

/** A frase de :217 da janela de conferir, sem honorários já entrados (D39: "e paga esta parcela, até o que faltar dela"). */
export function fraseDinheiroPeloEscritorio(resultado: string | null): string {
  return `Se o dinheiro do ${resultado === "ACORDO" ? "acordo" : "processo"} entrar pelo escritório (alvará ou depósito na conta), o honorário sai na divisão de Repasses e paga esta parcela, até o que faltar dela.`;
}

/** O aviso do "Não cobrar" sem honorários já entrados (D39: sai o "é baixado"). */
export const AVISO_NAO_COBRAR_ALVARA = {
  titulo: "Se o dinheiro vier por alvará, lance o êxito.",
  texto: "Ele fica em A receber, e os honorários da divisão do alvará, em Repasses, pagam a parcela, até o que faltar dela. O caso continua “Encerrado · acerto pendente” no Jurídico até tudo ser recebido e repassado.",
} as const;

/** A recusa do "Não cobrar" com honorários já entrados (ea-nao-cobrar, C2). */
export function recusaNaoCobrar(x: Pick<ExitoParaConferir, "honorariosAlvara" | "cliente">): { descricao: string; titulo: string; texto: string } | null {
  const hs = honorariosLivres(x);
  if (!hs.length) return null;
  const pn = primeiroNome(x.cliente.nome);
  const total = hs.reduce((t, h) => t + h.livre, 0);
  return {
    descricao: `Este êxito não pode ficar sem cobrança, porque os honorários dele já entraram. Volte para conferir e lance o êxito de ${pn}.`,
    titulo: hs.length === 1
      ? `Os honorários deste êxito já entraram pelo ${nomeDoLevantamento(hs[0]!.tipo)} de ${diaCurto(hs[0]!.entrouEm)} (${reais(total)}).`
      : `Os honorários deste êxito já entraram por ${variosLevantamentos(hs)} (${reais(total)}).`,
    texto: `Para não cobrar, o dinheiro teria de voltar para ${pn}, e isso ainda não é feito pelo T3jus. Lance o êxito: ele nasce pago.`,
  };
}

/** A confirmação depois de lançar (ea-lancado): pago inteiro, em parte, ou sem alvará (o texto de antes). */
export function confirmacaoLancado(cliente: string, valor: number, vencimento: string,
  pagos: { tipo: TipoLevantamento; entrouEm: string; valor: number }[] | undefined): { titulo: string; texto: string } {
  const ps = pagos ?? [];
  const pago = ps.reduce((t, p) => t + p.valor, 0);
  if (!pago) return { titulo: "Êxito lançado em A receber.", texto: `${reais(valor)} de ${cliente}, para ${dataBr(vencimento)}. Ficou no histórico do caso e do contrato.` };
  const ultimo = ps.reduce((u, p) => (p.entrouEm > u ? p.entrouEm : u), ps[0]!.entrouEm);
  const pelo = ps.length === 1 ? `pelo ${nomeDoLevantamento(ps[0]!.tipo)}` : `por ${variosLevantamentos(ps)}`;
  if (pago >= valor) {
    return {
      titulo: `Êxito lançado e pago em ${diaCurto(ultimo)}, ${pelo}.`,
      texto: `Nada ficou em A receber. ${reais(valor)} de ${cliente}, pagos pelos honorários ${ps.length === 1 ? `do ${nomeDoLevantamento(ps[0]!.tipo)}` : "que já entraram"}. Ficou no histórico do caso, do contrato e do repasse.`,
    };
  }
  return {
    titulo: "Êxito lançado.",
    texto: `${reais(pago)} pagos em ${diaCurto(ultimo)}, ${pelo}, e ${reais(valor - pago)} ficam em A receber, com vencimento em ${diaCurto(vencimento)}.`,
  };
}

/** A linha curta na célula de honorários da divisão (ea-proposta), só sem valor conferido. */
export function linhaCurtaDoExito(s: ExitoSituacao | null | undefined, cliente: string): string | null {
  const pn = primeiroNome(cliente);
  if (s?.situacao === "PARA_CONFERIR") return `O êxito de ${pn} ainda não foi lançado. Estes honorários pagam a parcela quando ela for lançada.`;
  if (s?.situacao === "SEM_CONFERENCIA") return `O caso de ${pn} ainda não foi encerrado. Estes honorários pagam o êxito quando ele for lançado.`;
  return null;
}

/**
 * O aviso abaixo da tabela da divisão (ea-exito-pago, ea-exito-falta; C3): o êxito já pago, ou os
 * honorários limitados ao que falta dele. O limite só se vê quando a linha traz semLimite.
 */
export function avisoLimiteDoExito(p: Pick<PropostaRepasse, "exitoSituacao" | "linhas">, cliente: string, tipo: string | null | undefined): { titulo: string; texto: string } | null {
  const s = p.exitoSituacao;
  const pn = primeiroNome(cliente);
  const deste = nomeDoLevantamento(tipo);
  const hon = p.linhas.find((l) => l.para === "HONORARIOS");
  if (s?.situacao === "PAGO" && !hon) {
    return {
      titulo: `O êxito de ${pn} já foi pago (${reais(s.valor)}${s.pagoEm ? `, em ${diaCurto(s.pagoEm)}` : ""}).`,
      texto: `Por isso, este ${deste} não tem honorários do êxito.`,
    };
  }
  if (s?.situacao === "LANCADO" && hon && typeof hon.semLimite === "number") {
    const pct = hon.regra.split(" · ")[0] ?? "";
    return {
      titulo: `Falta ${reais(s.falta)} do êxito de ${pn}.`,
      texto: `Os honorários deste ${deste} ficam limitados a esse valor.${pct.endsWith("%") ? ` Pelos ${pct} do contrato, seriam ${reais(hon.semLimite)}.` : ""}`,
    };
  }
  return null;
}

/** A parte pagou só um pedaço da parcela (revisão de código da F3.199, nota 3). */
const emParte = (p: Pick<PagouDaParte, "valor" | "parcelaValor">) => typeof p.parcelaValor === "number" && p.valor < p.parcelaValor;

/**
 * Na linha da parte de honorários da ficha: "Pagou a parcela do êxito, lançada em 18/11", ou, em
 * parte, "Pagou R$ 3.000,00 da parcela do êxito, lançada em 18/11".
 */
export function textoPagou(p: Pick<PagouDaParte, "lancadaEm" | "valor" | "parcelaValor">): string {
  const dia = diaCurto(diaDoInstante(p.lancadaEm));
  return emParte(p) ? `Pagou ${reais(p.valor)} da parcela do êxito, lançada em ${dia}` : `Pagou a parcela do êxito, lançada em ${dia}`;
}

/**
 * O item do "Fechamento do caso": "Êxito do contrato C-2026-027: pago por este alvará", ou, em
 * parte, "Êxito do contrato C-2026-027: R$ 3.000,00 pagos por este alvará".
 */
export function fechamentoPagou(p: PagouDaParte, tipo: string | null | undefined): { titulo: string; detalhe: string } {
  const partes = [p.lancadaPor ? `lançado por ${p.lancadaPor.nome} em ${diaCurto(diaDoInstante(p.lancadaEm))}` : `lançado em ${diaCurto(diaDoInstante(p.lancadaEm))}`,
    p.pagaEm ? `pago em ${diaCurto(p.pagaEm)}` : null].filter(Boolean);
  const pago = emParte(p) ? `${reais(p.valor)} pagos` : "pago";
  return { titulo: `Êxito${p.contrato ? ` do contrato ${p.contrato}` : ""}: ${pago} por este ${nomeDoLevantamento(tipo)}`, detalhe: partes.join(" · ") };
}

/** A linha do histórico do repasse quando o êxito foi lançado depois do alvará (ea-repasse). */
export function textoLancadoDepois(d: Record<string, unknown>, cliente: string, em: string, por: PessoaRef | null): { texto: string; quem: string } {
  const pn = primeiroNome(cliente);
  const valor = typeof d.valor === "number" ? d.valor : Number(d.valor ?? 0);
  return {
    texto: `A parcela do êxito de ${pn} foi lançada em ${diaCurto(diaDoInstante(em))}${por ? ` por ${primeiroNome(por.nome)}` : ""} e paga por esta parte de honorários (${reais(valor)}).`,
    quem: `${por?.nome ?? "Alguém da equipe"}, ao conferir o êxito em A receber`,
  };
}
