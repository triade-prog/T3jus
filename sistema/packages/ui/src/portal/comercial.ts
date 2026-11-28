// Comercial do Portal (AP-02 a AP-06, PD-02): textos e contas da tela, sem React, para os
// testes de unidade. As contas de verdade (grupos, funil, origem) vêm prontas do servidor.

import { CANAIS, PROPOSTA_ENCERRADA, SITUACOES_PROPOSTA, valorCerto, reais, type Condicao, type Funil, type PropostaLinha, type SituacaoProposta } from "@t3jus/domain";
import { DIAS_SEMANA, diaCurto, diaDaSemana, diaDe, somarDias } from "./agenda.ts";

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

export type IconeSelo = "lapis" | "enviar" | "conversas" | "check" | "pena" | "xis" | "historico";
export const SELO_SITUACAO: Record<SituacaoProposta, { tom: string; icone: IconeSelo }> = {
  RASCUNHO: { tom: "neutro", icone: "lapis" },
  ENVIADA: { tom: "andamento", icone: "enviar" },
  NEGOCIACAO: { tom: "atencao", icone: "conversas" },
  ACEITA: { tom: "ativo", icone: "check" },
  CONTRATO: { tom: "ok", icone: "pena" },
  RECUSADA: { tom: "neutro", icone: "xis" },
};
export const nomeSituacao = (s: SituacaoProposta) => SITUACOES_PROPOSTA[s];

// ------------------------------------------------------------------------- F3.204
// A proposta de cliente excluído ou arquivado a pedido do titular (desenho aprovado em
// docs/design/aprovadas/portal-propostas-encerradas): a situação continua a gravada e entra a marca.

/** O selo da encerrada, fora de SELO_SITUACAO (a situação não muda). */
export const SELO_ENCERRADA: { tom: string; icone: IconeSelo; texto: string } = { tom: "neutro", icone: "historico", texto: PROPOSTA_ENCERRADA.curto };

/** A marca vem do banco a partir da 1144; antes, falta e vale falso (o Portal publica antes da migration). */
export const estaEncerrada = (p: { encerrada?: boolean }) => p.encerrada ?? false;

/** A linha embaixo do selo, a partir do estado gravado: "Rascunho desde 13/11", "Enviada em 14/11", "Em negociação", "Aceita em 12/11". */
export function linhaDoEstadoGravado(p: Pick<PropostaLinha, "situacao" | "criadaEm" | "enviadaEm" | "respondidaEm">): string {
  switch (p.situacao) {
    case "RASCUNHO": return `Rascunho desde ${diaCurto(diaDe(p.criadaEm))}`;
    case "ENVIADA": return p.enviadaEm ? `Enviada em ${diaCurto(diaDe(p.enviadaEm))}` : "Enviada";
    case "NEGOCIACAO": return "Em negociação";
    case "ACEITA": return p.respondidaEm ? `Aceita em ${diaCurto(p.respondidaEm)}` : "Aceita";
    default: return nomeSituacao(p.situacao);
  }
}

/** "1 proposta encerrada a pedido do titular", "2 propostas encerradas a pedido do titular". */
export const contagemEncerradas = (n: number) => (n === 1 ? "1 proposta encerrada a pedido do titular" : `${n} propostas encerradas a pedido do titular`);

/** Quem saiu, para os textos: "excluído" ou "arquivado". */
export const comoSaiu = (s: string | null | undefined): "excluído" | "arquivado" => (s === "EXCLUIDO" ? "excluído" : "arquivado");

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

const ABERTA = new Set(["RASCUNHO", "ENVIADA", "NEGOCIACAO", "ACEITA"]);

/**
 * F3.204: a proposta aberta ou aceita de cliente excluído ou arquivado a pedido do titular fica só como
 * registro. A marca vem do banco a partir da 1144; antes, sai da situação do cliente (F3.181), que já vem.
 */
export function encerradaDa(f: { encerrada?: boolean; situacao: SituacaoProposta; clienteSituacao?: string | null }): boolean {
  return f.encerrada ?? ((f.clienteSituacao === "EXCLUIDO" || f.clienteSituacao === "ARQUIVADO") && ABERTA.has(f.situacao));
}

/** CLIENTE_EXCLUIDO ou CLIENTE_ARQUIVADO no erro da API (recusar_motivo): o cliente saiu a pedido do titular. */
export function clienteSaiuNoErro(e: { codigo: string; detalhes?: Record<string, unknown> }): "EXCLUIDO" | "ARQUIVADO" | null {
  const m = e.codigo === "VALIDATION_ERROR" ? e.detalhes?.motivo : undefined;
  return m === "CLIENTE_EXCLUIDO" ? "EXCLUIDO" : m === "CLIENTE_ARQUIVADO" ? "ARQUIVADO" : null;
}

const pessoas = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/**
 * Os pedaços da barra "Onde os N pararam" do Funil e a frase para o leitor de tela. F3.204: o arquivado a
 * pedido que recebeu proposta e não fechou entra em `encerradas` (`?? 0` antes da 1144) e sai de "recusaram".
 */
export function partesDaBarra(d: Pick<Funil, "primeiros" | "comProposta" | "contratos" | "semProposta" | "depoisProposta">) {
  const contrato = d.contratos;
  const andamento = d.depoisProposta.andamento;
  const encerradas = d.depoisProposta.encerradas ?? 0;
  const recusaram = Math.max(0, d.comProposta - contrato - andamento - encerradas);
  const { naoPegou: pegou, naoVoltou: voltou, emAtendimento: atend } = d.semProposta;
  const sem = pegou + voltou + atend;
  const total = d.primeiros;
  const desc = `Dos ${total}: ${pessoas(contrato, "virou contrato", "viraram contrato")}, ${andamento} com proposta em andamento, `
    + (encerradas ? `${pessoas(encerradas, "encerrada", "encerradas")} a pedido do titular, ` : "")
    + `${pessoas(recusaram, "recusou a proposta", "recusaram a proposta")}`
    + (sem ? `, o escritório não pegou ${pegou}, ${pessoas(voltou, "não voltou", "não voltaram")} e ${atend} ainda em atendimento.` : ". Ninguém saiu sem proposta.");
  return { contrato, andamento, encerradas, recusaram, pegou, voltou, atend, sem, total, desc };
}
