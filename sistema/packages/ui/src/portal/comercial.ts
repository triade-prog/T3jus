// Comercial do Portal (AP-02 a AP-06, PD-02): textos e contas da tela, sem React, para os
// testes de unidade. As contas de verdade (grupos, funil, origem) vêm prontas do servidor.

import { CANAIS, SITUACOES_PROPOSTA, valorCerto, reais, type Condicao, type SituacaoProposta } from "@t3jus/domain";
import { DIAS_SEMANA, diaCurto, diaDaSemana, somarDias } from "./agenda.ts";

export const ROTAS_COMERCIAL = {
  atendimentos: "/comercial/atendimentos",
  propostas: "/comercial/propostas",
  nova: "/comercial/propostas/nova",
  funil: "/comercial/funil",
  origem: "/comercial/origem",
  proposta: (id: string) => `/comercial/propostas/${id}`,
  editar: (id: string) => `/comercial/propostas/${id}/editar`,
  ficha: (clienteId: string) => `/clientes/${clienteId}`,
  atendimentosCliente: (clienteId: string) => `/clientes/${clienteId}?aba=atendimentos`,
  /** O formulário de contrato da área Contratos, já com a proposta (IN-01). */
  contrato: (id: string) => `/contratos/contratos/${id}`,
  gerarContrato: (id: string) => `/contratos/contratos/novo?proposta=${id}`,
};

/** Dias entre duas datas aaaa-mm-dd (b - a). */
export function diasEntre(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
}

/** "há 8 dias", "ontem", "hoje", "amanhã", "sexta" (até 7 dias), "02/12". */
export function quandoRetorno(em: string, hoje: string): string {
  const d = diasEntre(hoje, em);
  if (d === 0) return "hoje";
  if (d === -1) return "ontem";
  if (d < 0) return `há ${-d} dias`;
  if (d === 1) return "amanhã";
  if (d <= 7) return DIAS_SEMANA[diaDaSemana(em)]!.replace("-feira", "");
  return diaCurto(em);
}

/** "de 5 a 8 dias", "de 3 dias", vazio sem vencidos. */
export function faixaVencidos(datas: string[], hoje: string): string {
  if (!datas.length) return "nenhum";
  const dias = datas.map((d) => diasEntre(d, hoje));
  const min = Math.min(...dias);
  const max = Math.max(...dias);
  const dia = (n: number) => (n === 1 ? "1 dia" : `${n} dias`);
  return min === max ? `de ${dia(min)}` : `de ${min} a ${dia(max)}`;
}

/** "03/11 · telefone · com Marta Corrêa (esposa)". */
export function textoUltimo(u: { em: string; canal: string; comQuem: string | null } | null): string {
  if (!u) return "nenhum";
  const canal = (CANAIS as Record<string, string>)[u.canal] ?? u.canal;
  const dia = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" }).format(new Date(u.em));
  return [dia, u.canal === "WHATSAPP" ? canal : canal.toLowerCase(), u.comQuem ? `com ${u.comQuem}` : null].filter(Boolean).join(" · ");
}

export const SELO_SITUACAO: Record<SituacaoProposta, { tom: string; icone: "lapis" | "enviar" | "conversas" | "check" | "pena" | "xis" }> = {
  RASCUNHO: { tom: "neutro", icone: "lapis" },
  ENVIADA: { tom: "andamento", icone: "enviar" },
  NEGOCIACAO: { tom: "atencao", icone: "conversas" },
  ACEITA: { tom: "ativo", icone: "check" },
  CONTRATO: { tom: "ok", icone: "pena" },
  RECUSADA: { tom: "neutro", icone: "xis" },
};
export const nomeSituacao = (s: SituacaoProposta) => SITUACOES_PROPOSTA[s];

/** Valor curto da proposta para o cabeçalho: "R$ 4.000,00", "R$ 2.000,00 mais êxito", "Só êxito". */
export function valorDaProposta(condicoes: Condicao[]): string {
  const certo = valorCerto(condicoes);
  const variavel = condicoes.some((c) => c.tipo === "EXITO" || c.tipo === "SUCUMBENCIA" || c.tipo === "RECORRENTE" || c.tipo === "ATO");
  const mensal = condicoes.find((c) => c.tipo === "MENSAL");
  if (!condicoes.length) return "sem honorário escrito";
  if (mensal && condicoes.length === 1) return `${reais(mensal.valor)} por mês`;
  if (!certo) return condicoes.some((c) => c.tipo === "EXITO") ? "só êxito" : "valor a definir";
  return variavel ? `${reais(certo)} mais ${condicoes.some((c) => c.tipo === "EXITO") ? "êxito" : "variável"}` : reais(certo);
}

/** Percentual inteiro: 9 de 24 = "38%". Sem base, "—". */
export function taxa(parte: number, todo: number): string {
  return todo ? `${Math.round((100 * parte) / todo)}%` : "—";
}

/** O período do Funil e da Origem: "20/08 a 18/11/2026". */
export function textoPeriodo(de: string, ate: string): string {
  return `${diaCurto(de)} a ${diaCurto(ate)}/${ate.slice(0, 4)}`;
}

/** Até quando vão os "próximos 7 dias". */
export const ateSemana = (hoje: string) => diaCurto(somarDias(hoje, 7));
