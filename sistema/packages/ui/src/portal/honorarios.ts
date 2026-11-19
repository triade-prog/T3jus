// Condições de honorário na tela (CH-06): o rascunho como a pessoa digita, a leitura para o
// formato do servidor (centavos, pontos-base e aaaa-mm-dd) e as mensagens de cada campo.
// As regras ficam em @t3jus/domain (honorarios.ts); o servidor confere de novo.

import { ErroDinheiro, lerReais, ORDEM_TIPOS_HONORARIO, dataBr, type Condicao, type TipoHonorario } from "@t3jus/domain";
import { lerDia } from "./agenda.ts";

export interface RascunhoCondicao {
  tipo: TipoHonorario;
  valor: string;
  vencimento: string;
  total: string;
  parcelas: string;
  primeiro: string;
  meses: string;
  reajuste: string;
  percentual: string;
  sobre: string;
  etapa: string;
  dias: string;
  quem: "ESCRITORIO" | "DIVIDIDA";
  percentualEscritorio: string;
  atos: { nome: string; valor: string }[];
  dia: string;
  diaLembrete: string;
  quemLembrete: string;
  pedirWhats: boolean;
}

export function rascunhoCondicao(tipo: TipoHonorario): RascunhoCondicao {
  return {
    tipo, valor: "", vencimento: "", total: "", parcelas: "", primeiro: "", meses: tipo === "RECORRENTE" ? "12" : "", reajuste: "",
    percentual: "", sobre: tipo === "EXITO" ? "O que o cliente receber (condenação ou acordo)" : "", etapa: tipo === "SUCUMBENCIA" ? "Pagamento da sucumbência" : "",
    dias: tipo === "EXITO" ? "15" : "", quem: "ESCRITORIO", percentualEscritorio: "", atos: [{ nome: "Audiência", valor: "" }],
    dia: "10", diaLembrete: "5", quemLembrete: "", pedirWhats: false,
  };
}

const reais = (c: number) => (c / 100).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const pct = (pb: number) => (pb % 100 ? (pb / 100).toFixed(2).replace(/0$/, "").replace(".", ",") : String(pb / 100));

/** De volta para o rascunho (editar a proposta ou gerar o contrato dela). */
export function rascunhoDe(c: Condicao): RascunhoCondicao {
  const r = rascunhoCondicao(c.tipo);
  switch (c.tipo) {
    case "FIXO": return { ...r, valor: reais(c.valor), vencimento: dataBr(c.vencimento) };
    case "PARCELADO": return { ...r, total: reais(c.total), parcelas: String(c.parcelas), primeiro: dataBr(c.primeiro) };
    case "MENSAL": return { ...r, valor: reais(c.valor), primeiro: dataBr(c.primeiro), meses: c.meses ? String(c.meses) : "", reajuste: c.reajuste ?? "" };
    case "EXITO": return { ...r, percentual: pct(c.percentual), sobre: c.sobre, etapa: c.etapa, dias: String(c.dias) };
    case "SUCUMBENCIA": return { ...r, quem: c.quem, percentualEscritorio: c.percentualEscritorio ? pct(c.percentualEscritorio) : "", etapa: c.etapa };
    case "ATO": return { ...r, atos: c.atos.map((a) => ({ nome: a.nome, valor: reais(a.valor) })) };
    case "RECORRENTE": return {
      ...r, percentual: pct(c.percentual), sobre: c.sobre, etapa: c.etapa ?? "", primeiro: c.primeiro ? dataBr(c.primeiro) : "", dia: String(c.dia),
      meses: String(c.meses), diaLembrete: String(c.diaLembrete), quemLembrete: c.quemLembrete ?? "", pedirWhats: c.pedirWhats,
    };
  }
}

export function centavos(t: string): number | null {
  if (!t.trim()) return null;
  try {
    const d = lerReais(t);
    return d.centavos;
  } catch (e) {
    if (e instanceof ErroDinheiro) return null;
    throw e;
  }
}
function pontosBase(t: string): number | null {
  const m = /^\s*(\d{1,3})(?:[,.](\d{1,2}))?\s*%?\s*$/.exec(t);
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
}
function inteiro(t: string): number | null {
  return /^\s*\d{1,4}\s*$/.test(t) ? Number(t) : null;
}

/** O rascunho no formato do servidor. Campo que não se lê vai nulo e o servidor acusa. */
export function lerCondicao(r: RascunhoCondicao): Partial<Condicao> & { tipo: TipoHonorario } {
  switch (r.tipo) {
    case "FIXO": return { tipo: r.tipo, valor: centavos(r.valor) as number, vencimento: lerDia(r.vencimento) as string };
    case "PARCELADO": return { tipo: r.tipo, total: centavos(r.total) as number, parcelas: inteiro(r.parcelas) as number, primeiro: lerDia(r.primeiro) as string };
    case "MENSAL": return {
      tipo: r.tipo, valor: centavos(r.valor) as number, primeiro: lerDia(r.primeiro) as string,
      meses: r.meses.trim() ? (inteiro(r.meses) ?? -1) : null, reajuste: r.reajuste.trim() || null,
    };
    case "EXITO": return { tipo: r.tipo, percentual: pontosBase(r.percentual) as number, sobre: r.sobre.trim(), etapa: r.etapa, dias: inteiro(r.dias) as number };
    case "SUCUMBENCIA": return { tipo: r.tipo, quem: r.quem, percentualEscritorio: r.quem === "DIVIDIDA" ? pontosBase(r.percentualEscritorio) : null, etapa: r.etapa };
    case "ATO": return { tipo: r.tipo, atos: r.atos.map((a) => ({ nome: a.nome.trim(), valor: centavos(a.valor) as number })) };
    case "RECORRENTE": return {
      tipo: r.tipo, percentual: pontosBase(r.percentual) as number, sobre: r.sobre.trim(), etapa: r.etapa || null,
      primeiro: r.etapa ? null : (lerDia(r.primeiro) as string), dia: inteiro(r.dia) as number, meses: inteiro(r.meses) as number,
      diaLembrete: inteiro(r.diaLembrete) as number, quemLembrete: r.quemLembrete || null, pedirWhats: r.pedirWhats,
    };
  }
}

/** Mantém a lista na ordem dos tipos (a mesma do servidor, para os erros "c2.etapa" baterem). */
export function ordenar(lista: RascunhoCondicao[]): RascunhoCondicao[] {
  return [...lista].sort((a, b) => ORDEM_TIPOS_HONORARIO.indexOf(a.tipo) - ORDEM_TIPOS_HONORARIO.indexOf(b.tipo));
}

/** Se o bloco já tem algo escrito além do que vem pronto (para pedir confirmação ao tirar). */
export function temDado(r: RascunhoCondicao): boolean {
  const novo = rascunhoCondicao(r.tipo);
  return JSON.stringify({ ...r }) !== JSON.stringify(novo);
}

/** O que dizer em cada campo errado. */
export function mensagemCampo(campo: string, contexto: "proposta" | "contrato" = "proposta"): string {
  const c = campo.replace(/^atos\.\d+\./, "atos.");
  const m: Record<string, string> = {
    valor: "Escreva o valor em reais. Ex.: 1.500,00.",
    total: "Escreva o valor total em reais, maior que o número de parcelas em centavos. Ex.: 2.000,00.",
    parcelas: "Escreva quantas parcelas, de 1 a 120.",
    vencimento: contexto === "contrato" ? "Escreva hoje ou depois, no formato dd/mm/aaaa. Parcela que o cliente já pagou se registra no Financeiro." : "Escreva a data no formato dd/mm/aaaa.",
    primeiro: contexto === "contrato" ? "Esta data já passou ou não existe. Escolha hoje ou depois. Parcela que o cliente já pagou se registra no Financeiro." : "Escreva a data no formato dd/mm/aaaa.",
    meses: "Escreva de 1 a 120 meses.",
    reajuste: "Escreva o reajuste em poucas palavras. Ex.: IPCA, todo setembro.",
    percentual: "Escreva o percentual, de 1 a 100. Ex.: 30.",
    sobre: "Diga sobre o quê incide o percentual.",
    etapa: "Escolha a etapa. Sem ela, ninguém é avisado na hora de cobrar.",
    dias: "Escreva de 0 a 180 dias.",
    quem: "Escolha com quem fica a sucumbência.",
    percentualEscritorio: "Escreva a parte do escritório, de 1 a 99. Ex.: 50.",
    atos: "Escreva pelo menos um ato, com o valor.",
    "atos.nome": "Escreva o ato. Ex.: Audiência.",
    "atos.valor": "Escreva o valor em reais. Ex.: 450,00.",
    dia: "Escreva um dia de 1 a 28.",
    diaLembrete: "Escreva um dia de 1 a 28.",
    quemLembrete: "Escolha alguém da equipe.",
    tipo: "Escolha o tipo.",
  };
  return m[c] ?? "Confira este campo.";
}

/** Na proposta, o que cada condição vai virar quando o contrato for assinado. */
export function geraNaProposta(c: Condicao): string {
  switch (c.tipo) {
    case "FIXO": return "Vira 1 recebimento programado, quando o contrato for assinado.";
    case "PARCELADO": return `Vira ${c.parcelas} ${c.parcelas === 1 ? "recebimento programado" : "recebimentos programados"}, quando o contrato for assinado.`;
    case "MENSAL": return c.meses ? `Vira ${c.meses} ${c.meses === 1 ? "recebimento programado" : "recebimentos programados"}, quando o contrato for assinado.` : "Vira um recebimento por mês, sem prazo para acabar, quando o contrato for assinado.";
    case "EXITO": return "O valor só se sabe na etapa. Quando ela for marcada no caso, vira valor a receber e o Financeiro é avisado.";
    case "SUCUMBENCIA": return `Vira valor a receber quando o caso chegar a “${c.etapa}”.`;
    case "ATO": return "Cada ato marcado como feito no caso vira valor a receber.";
    case "RECORRENTE": return `Todo dia ${c.diaLembrete}, o responsável recebe o lembrete para pedir a base do mês.`;
  }
}

export const ICONE_TIPO: Record<TipoHonorario, "moeda" | "agenda" | "reenviar" | "balanca" | "coluna" | "doc" | "relogio"> = {
  FIXO: "moeda", PARCELADO: "agenda", MENSAL: "reenviar", EXITO: "balanca", SUCUMBENCIA: "coluna", ATO: "doc", RECORRENTE: "relogio",
};
