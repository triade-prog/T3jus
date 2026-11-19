// Condições de honorário (CH-02, CH-06): os sete tipos, a conferência de cada um e o que cada
// condição gera. As mesmas regras estão no banco (0190_portal_comercial.sql, honorario_conferir),
// que é quem decide; aqui elas servem para a tela mostrar o erro no campo e o resumo "Gera:"
// enquanto a pessoa preenche. Dinheiro sempre em centavos (PT-09); percentual em pontos-base
// (30% = 3000), para nunca usar ponto flutuante.

import { dinheiro, formatar, repartir } from "./dinheiro.ts";

export const TIPOS_HONORARIO = {
  FIXO: { nome: "Fixo", explica: "Um valor só, com uma data de pagamento." },
  PARCELADO: { nome: "Parcelado", explica: "Um valor dividido em parcelas com dia certo." },
  MENSAL: { nome: "Mensal", explica: "O mesmo valor todo mês, como numa assessoria." },
  EXITO: { nome: "Êxito em percentual", explica: "Um percentual do que o cliente ganhar, cobrado numa etapa do caso." },
  SUCUMBENCIA: { nome: "Sucumbência", explica: "O valor que o juiz fixar para a parte contrária pagar." },
  ATO: { nome: "Por ato ou consulta", explica: "Um valor para cada audiência, diligência ou consulta feita." },
  RECORRENTE: { nome: "Percentual recorrente", explica: "Um percentual de um valor que muda todo mês, como o benefício no contracheque." },
} as const;
export type TipoHonorario = keyof typeof TIPOS_HONORARIO;
export const ORDEM_TIPOS_HONORARIO = Object.keys(TIPOS_HONORARIO) as TipoHonorario[];

/** Etapas do caso que viram cobrança. Quando o Jurídico existir, viram as etapas do escritório (EX-07). */
export const ETAPAS_COBRANCA = [
  "Pagamento da condenação ou do acordo",
  "Pagamento da RPV ou precatório",
  "Sentença",
  "Acordo homologado",
  "Alvará levantado",
  "Benefício implantado",
  "Pagamento da sucumbência",
] as const;

export const SOBRE_EXITO = [
  "O que o cliente receber (condenação ou acordo)",
  "Atrasados que o cliente receber",
  "Valor da condenação",
  "Valor do acordo",
  "Proveito econômico",
] as const;

export interface CondicaoFixo { tipo: "FIXO"; valor: number; vencimento: string }
export interface CondicaoParcelado { tipo: "PARCELADO"; total: number; parcelas: number; primeiro: string }
export interface CondicaoMensal { tipo: "MENSAL"; valor: number; primeiro: string; meses: number | null; reajuste: string | null }
export interface CondicaoExito { tipo: "EXITO"; percentual: number; sobre: string; etapa: string; dias: number }
export interface CondicaoSucumbencia { tipo: "SUCUMBENCIA"; quem: "ESCRITORIO" | "DIVIDIDA"; percentualEscritorio: number | null; etapa: string }
export interface CondicaoAto { tipo: "ATO"; atos: { nome: string; valor: number }[] }
export interface CondicaoRecorrente {
  tipo: "RECORRENTE"; percentual: number; sobre: string; etapa: string | null; primeiro: string | null; dia: number; meses: number;
  diaLembrete: number; quemLembrete: string | null; pedirWhats: boolean;
}
export type Condicao = CondicaoFixo | CondicaoParcelado | CondicaoMensal | CondicaoExito | CondicaoSucumbencia | CondicaoAto | CondicaoRecorrente;

// ------------------------------------------------------------------------- datas (aaaa-mm-dd)

const DIA = /^(\d{4})-(\d{2})-(\d{2})$/;
export function dataValida(d: unknown): d is string {
  if (typeof d !== "string" || !DIA.test(d)) return false;
  const x = new Date(`${d}T12:00:00Z`);
  return !Number.isNaN(x.getTime()) && x.toISOString().slice(0, 10) === d;
}
/** Soma meses mantendo o dia; no mês mais curto, cai no último dia (31/01 + 1 mês = 28/02). */
export function somarMeses(d: string, n: number): string {
  const [a, m, dd] = d.split("-").map(Number) as [number, number, number];
  const alvo = new Date(Date.UTC(a, m - 1 + n, 1));
  const ultimo = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate();
  alvo.setUTCDate(Math.min(dd, ultimo));
  return alvo.toISOString().slice(0, 10);
}
export const dataBr = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
export const reais = (c: number) => formatar(dinheiro(c));
/** 3000 → "30%"; 1250 → "12,5%". */
export function percentual(pb: number): string {
  const inteiro = Math.floor(pb / 100);
  const resto = pb % 100;
  return resto ? `${inteiro},${String(resto).padStart(2, "0").replace(/0$/, "")}%` : `${inteiro}%`;
}

/** As parcelas em centavos exatos: o centavo que sobra vai para as primeiras. */
export function dividirParcelas(total: number, n: number): number[] {
  return repartir(dinheiro(total), n).map((x) => x.centavos);
}
/** "3 parcelas de R$ 1.000,00" ou "2 de R$ 666,67 e 1 de R$ 666,66". */
export function resumoParcelas(total: number, n: number): string {
  const ps = dividirParcelas(total, n);
  if (new Set(ps).size === 1) return `${n} ${n === 1 ? "parcela" : "parcelas"} de ${reais(ps[0]!)}`;
  const a = ps[0]!;
  const na = ps.filter((x) => x === a).length;
  return `${na} de ${reais(a)} e ${n - na} de ${reais(ps.at(-1)!)}`;
}

// ------------------------------------------------------------------------- conferência

const inteiro = (x: unknown, min: number, max: number): x is number => typeof x === "number" && Number.isSafeInteger(x) && x >= min && x <= max;
const textoOk = (x: unknown, min: number, max: number): x is string => typeof x === "string" && x.trim().length >= min && x.trim().length <= max;
const VALOR_MAX = 100_000_000_00;

/**
 * Os campos errados de uma condição, pelo nome do campo ("valor", "primeiro"...). `hoje`
 * (aaaa-mm-dd) recusa data no passado, como no contrato; a proposta não passa `hoje`.
 */
export function conferirCondicao(c: Partial<Condicao> & { tipo?: string }, hoje?: string): string[] {
  const e: string[] = [];
  const data = (campo: string, v: unknown) => {
    if (!dataValida(v)) e.push(campo);
    else if (hoje && v < hoje) e.push(campo);
  };
  const x = c as Record<string, unknown>;
  switch (c.tipo) {
    case "FIXO":
      if (!inteiro(x.valor, 1, VALOR_MAX)) e.push("valor");
      data("vencimento", x.vencimento);
      break;
    case "PARCELADO":
      if (!inteiro(x.total, 1, VALOR_MAX)) e.push("total");
      if (!inteiro(x.parcelas, 1, 120)) e.push("parcelas");
      else if (inteiro(x.total, 1, VALOR_MAX) && x.total < x.parcelas) e.push("total");
      data("primeiro", x.primeiro);
      break;
    case "MENSAL":
      if (!inteiro(x.valor, 1, VALOR_MAX)) e.push("valor");
      data("primeiro", x.primeiro);
      if (x.meses !== null && x.meses !== undefined && !inteiro(x.meses, 1, 120)) e.push("meses");
      if (x.reajuste && !textoOk(x.reajuste, 2, 120)) e.push("reajuste");
      break;
    case "EXITO":
      if (!inteiro(x.percentual, 1, 10000)) e.push("percentual");
      if (!textoOk(x.sobre, 2, 120)) e.push("sobre");
      if (!textoOk(x.etapa, 2, 80)) e.push("etapa");
      if (!inteiro(x.dias, 0, 180)) e.push("dias");
      break;
    case "SUCUMBENCIA":
      if (x.quem !== "ESCRITORIO" && x.quem !== "DIVIDIDA") e.push("quem");
      if (x.quem === "DIVIDIDA" && !inteiro(x.percentualEscritorio, 1, 9999)) e.push("percentualEscritorio");
      if (!textoOk(x.etapa, 2, 80)) e.push("etapa");
      break;
    case "ATO": {
      const atos = Array.isArray(x.atos) ? (x.atos as { nome?: unknown; valor?: unknown }[]) : [];
      if (atos.length < 1 || atos.length > 10) e.push("atos");
      atos.forEach((a, i) => {
        if (!textoOk(a?.nome, 2, 80)) e.push(`atos.${i}.nome`);
        if (!inteiro(a?.valor, 1, VALOR_MAX)) e.push(`atos.${i}.valor`);
      });
      break;
    }
    case "RECORRENTE":
      if (!inteiro(x.percentual, 1, 10000)) e.push("percentual");
      if (!textoOk(x.sobre, 2, 120)) e.push("sobre");
      if (!x.etapa) data("primeiro", x.primeiro);
      else if (!textoOk(x.etapa, 2, 80)) e.push("etapa");
      if (!inteiro(x.dia, 1, 28)) e.push("dia");
      if (!inteiro(x.meses, 1, 120)) e.push("meses");
      if (!inteiro(x.diaLembrete, 1, 28)) e.push("diaLembrete");
      break;
    default:
      e.push("tipo");
  }
  return e;
}

/** Conferência de uma lista (proposta ou contrato): pelo menos uma, no máximo uma de cada tipo. */
export function conferirCondicoes(lista: Partial<Condicao>[], hoje?: string): Record<string, string[]> {
  const erros: Record<string, string[]> = {};
  if (lista.length === 0) erros.condicoes = ["vazia"];
  const vistos = new Set<string>();
  lista.forEach((c, i) => {
    if (c.tipo && vistos.has(c.tipo)) (erros.condicoes ??= []).push("repetida");
    if (c.tipo) vistos.add(c.tipo);
    const e = conferirCondicao(c, hoje);
    if (e.length) erros[`c${i + 1}`] = e;
  });
  return erros;
}

// ------------------------------------------------------------------------- o que cada uma gera

export interface Recebimento {
  /** aaaa-mm-dd, ou nulo quando depende de uma etapa do caso. */
  vencimento: string | null;
  quando: string;
  descricao: string;
  /** Centavos, ou nulo quando "a definir". */
  valor: number | null;
  tipo: TipoHonorario;
}

/** A programação: o que tem data e valor certos, em ordem, e o que depende do caso no fim. */
export function programacao(lista: Condicao[], meses = 120): Recebimento[] {
  const certos: Recebimento[] = [];
  const variaveis: Recebimento[] = [];
  for (const c of lista) {
    switch (c.tipo) {
      case "FIXO":
        certos.push({ vencimento: c.vencimento, quando: dataBr(c.vencimento), descricao: "Fixo", valor: c.valor, tipo: c.tipo });
        break;
      case "PARCELADO":
        dividirParcelas(c.total, c.parcelas).forEach((v, i) => {
          const d = somarMeses(c.primeiro, i);
          certos.push({ vencimento: d, quando: dataBr(d), descricao: `Parcela ${i + 1} de ${c.parcelas}`, valor: v, tipo: c.tipo });
        });
        break;
      case "MENSAL":
        for (let i = 0; i < Math.min(c.meses ?? 12, meses); i++) {
          const d = somarMeses(c.primeiro, i);
          certos.push({ vencimento: d, quando: dataBr(d), descricao: `Mensalidade ${i + 1}${c.meses ? ` de ${c.meses}` : ""}`, valor: c.valor, tipo: c.tipo });
        }
        break;
      case "EXITO":
        variaveis.push({ vencimento: null, quando: "na etapa", descricao: `Êxito de ${percentual(c.percentual)}`, valor: null, tipo: c.tipo });
        break;
      case "SUCUMBENCIA":
        variaveis.push({ vencimento: null, quando: "na etapa", descricao: "Sucumbência", valor: null, tipo: c.tipo });
        break;
      case "ATO":
        variaveis.push({ vencimento: null, quando: "a cada ato", descricao: c.atos.map((a) => `${reais(a.valor)} por ${a.nome.toLowerCase()}`).join("; "), valor: null, tipo: c.tipo });
        break;
      case "RECORRENTE":
        variaveis.push({ vencimento: null, quando: "mês a mês", descricao: `${percentual(c.percentual)} ${de(c.sobre)}, ${c.meses} ${c.meses === 1 ? "vez" : "vezes"}`, valor: null, tipo: c.tipo });
        break;
    }
  }
  certos.sort((a, b) => (a.vencimento! < b.vencimento! ? -1 : a.vencimento! > b.vencimento! ? 1 : 0));
  return [...certos, ...variaveis];
}

/** "Atrasados que o cliente receber" → "dos atrasados que o cliente receber". */
function de(s: string): string {
  const t = s.trim();
  const m = /^(o|a|os|as)\s/i.exec(t);
  if (m) return `d${t.charAt(0).toLowerCase()}${t.slice(1)}`;
  const primeira = t.split(/\s/)[0]!.toLowerCase();
  const fem = /(ção|são|dade|base|renda|pensão|remuneração|condenação)$/.test(primeira);
  const plural = /s$/.test(primeira);
  return `d${fem ? "a" : "o"}${plural ? "s" : ""} ${t.charAt(0).toLowerCase()}${t.slice(1)}`;
}

/** O valor certo: fixo, parcelas e até 12 mensalidades (sem prazo, conta 12 meses). */
export function valorCerto(lista: Condicao[]): number {
  let t = 0;
  for (const c of lista) {
    if (c.tipo === "FIXO") t += c.valor;
    if (c.tipo === "PARCELADO") t += c.total;
    if (c.tipo === "MENSAL") t += c.valor * Math.min(c.meses ?? 12, 12);
  }
  return t;
}

/** A frase "Gera:" de cada condição, ou o que falta para ela existir. */
export function textoGera(c: Partial<Condicao> & { tipo: TipoHonorario }, cliente = "o cliente"): string {
  if (conferirCondicao(c).length) return faltaParaGerar(c);
  const k = c as Condicao;
  switch (k.tipo) {
    case "FIXO":
      return `${reais(k.valor)} a receber em ${dataBr(k.vencimento)}.`;
    case "PARCELADO": {
      const ult = somarMeses(k.primeiro, k.parcelas - 1);
      const dia = Number(k.primeiro.slice(8, 10));
      return k.parcelas === 1
        ? `${reais(k.total)} a receber em ${dataBr(k.primeiro)}.`
        : `${k.parcelas} parcelas${new Set(dividirParcelas(k.total, k.parcelas)).size > 1 ? `: ${resumoParcelas(k.total, k.parcelas)}` : ` de ${reais(dividirParcelas(k.total, k.parcelas)[0]!)}`}, todo dia ${dia}, de ${dataBr(k.primeiro)} a ${dataBr(ult)}. A soma dá ${reais(k.total)} exatos.`;
    }
    case "MENSAL":
      return `${reais(k.valor)} todo dia ${Number(k.primeiro.slice(8, 10))}, desde ${dataBr(k.primeiro)}, ${k.meses ? `por ${k.meses} ${k.meses === 1 ? "mês" : "meses"}` : "sem prazo para acabar"}.`;
    case "EXITO":
      return `${percentual(k.percentual)} ${de(k.sobre)}, com vencimento ${k.dias} ${k.dias === 1 ? "dia" : "dias"} depois de o caso chegar a “${k.etapa}”. Nessa hora, quem marca a etapa informa o valor.`;
    case "SUCUMBENCIA":
      return `${k.quem === "ESCRITORIO" ? "A sucumbência inteira fica com o escritório" : `${percentual(k.percentualEscritorio!)} da sucumbência ficam com o escritório`}. Vira valor a receber quando o caso chegar a “${k.etapa}”.`;
    case "ATO":
      return `${k.atos.map((a) => `${reais(a.valor)} por ${a.nome.toLowerCase()}`).join("; ")}, cobrado quando o ato for marcado como feito no caso.`;
    case "RECORRENTE":
      return `${k.meses} ${k.meses === 1 ? "cobrança" : "cobranças"} de ${percentual(k.percentual)} ${de(k.sobre)}, todo dia ${k.dia}, ${k.etapa ? `a partir de “${k.etapa}”` : `desde ${dataBr(k.primeiro!)}`}. Todo dia ${k.diaLembrete}, ${k.quemLembrete ? "quem foi escolhido" : "o responsável"} recebe o lembrete para pedir a base; o valor de cada mês sai quando ela for informada.${k.pedirWhats ? ` O pedido também vai a ${cliente} pelo WhatsApp do escritório.` : ""}`;
  }
}

function faltaParaGerar(c: Partial<Condicao> & { tipo: TipoHonorario }): string {
  const e = conferirCondicao(c);
  const nomes: Record<string, string> = {
    valor: "o valor", total: "o valor total", parcelas: "as parcelas", primeiro: "o primeiro vencimento", vencimento: "o vencimento",
    meses: "os meses", percentual: "o percentual", sobre: "sobre o quê", etapa: "a etapa", dias: "os dias", quem: "com quem fica",
    percentualEscritorio: "a parte do escritório", atos: "os atos", dia: "o dia de cobrar", diaLembrete: "o dia do lembrete", reajuste: "o reajuste",
  };
  const faltas = [...new Set(e.map((x) => nomes[x.split(".").length > 1 ? "atos" : x] ?? x))];
  const lista = faltas.length <= 1 ? (faltas[0] ?? "") : `${faltas.slice(0, -1).join(", ")} e ${faltas.at(-1)}`;
  return `Falta ${lista} para ver o que esta condição gera.`;
}

/** Para ler na ficha: o valor grande, o complemento pequeno e o detalhe. */
export function leituraCondicao(c: Condicao): { valor: string; complemento: string; detalhe: string } {
  switch (c.tipo) {
    case "FIXO":
      return { valor: reais(c.valor), complemento: "", detalhe: `Vence em ${dataBr(c.vencimento)}.` };
    case "PARCELADO": {
      const ult = somarMeses(c.primeiro, c.parcelas - 1);
      return {
        valor: reais(c.total),
        complemento: c.parcelas === 1 ? "em 1 parcela" : new Set(dividirParcelas(c.total, c.parcelas)).size > 1 ? `em ${c.parcelas} parcelas: ${resumoParcelas(c.total, c.parcelas)}` : `em ${resumoParcelas(c.total, c.parcelas)}`,
        detalhe: c.parcelas === 1 ? `Vence em ${dataBr(c.primeiro)}.` : `Todo dia ${Number(c.primeiro.slice(8, 10))}, de ${dataBr(c.primeiro)} a ${dataBr(ult)}.`,
      };
    }
    case "MENSAL":
      return {
        valor: reais(c.valor), complemento: "por mês",
        detalhe: `Todo dia ${Number(c.primeiro.slice(8, 10))}, desde ${dataBr(c.primeiro)}, ${c.meses ? `por ${c.meses} ${c.meses === 1 ? "mês" : "meses"}` : "sem prazo para acabar"}.${c.reajuste ? ` Reajuste: ${c.reajuste}.` : ""}`,
      };
    case "EXITO":
      return { valor: percentual(c.percentual), complemento: de(c.sobre), detalhe: `Cobrado quando o caso chegar à etapa “${c.etapa}”, com vencimento ${c.dias} ${c.dias === 1 ? "dia" : "dias"} depois.` };
    case "SUCUMBENCIA":
      return {
        valor: c.quem === "ESCRITORIO" ? "Do escritório" : `${percentual(c.percentualEscritorio!)} do escritório`,
        complemento: c.quem === "ESCRITORIO" ? "inteira" : "o resto fica com o cliente",
        detalhe: `Vira valor a receber quando o caso chegar a “${c.etapa}”.`,
      };
    case "ATO":
      return { valor: reais(c.atos[0]!.valor), complemento: `por ${c.atos[0]!.nome.toLowerCase()}`, detalhe: c.atos.length > 1 ? `E ${c.atos.slice(1).map((a) => `${reais(a.valor)} por ${a.nome.toLowerCase()}`).join("; ")}.` : "Cobrado quando o ato for marcado como feito no caso." };
    case "RECORRENTE":
      return {
        valor: percentual(c.percentual), complemento: `${de(c.sobre)}, por ${c.meses} ${c.meses === 1 ? "mês" : "meses"}`,
        detalhe: `${c.etapa ? `A partir da etapa “${c.etapa}”` : `Desde ${dataBr(c.primeiro!)}`}, todo dia ${c.dia}. A base muda todo mês; o lembrete para pedi-la sai todo dia ${c.diaLembrete}.`,
      };
  }
}

/** Selo curto da lista ("Fixo R$ 500,00", "Êxito 30%"). */
export function seloCondicao(c: Condicao): string {
  switch (c.tipo) {
    case "FIXO": return reais(c.valor);
    case "PARCELADO": return `${c.parcelas} × ${new Set(dividirParcelas(c.total, c.parcelas)).size > 1 ? "" : reais(dividirParcelas(c.total, c.parcelas)[0]!)}`.trim();
    case "MENSAL": return reais(c.valor);
    case "EXITO": return percentual(c.percentual);
    case "SUCUMBENCIA": return "";
    case "ATO": return reais(c.atos[0]!.valor);
    case "RECORRENTE": return percentual(c.percentual);
  }
}
