// Jurídico do Portal, parte 1 (EX-01, EX-03, EX-07, EX-14): rotas, textos e contas da tela,
// sem React, para os testes de unidade. As regras de verdade estão no servidor.

import { AREAS_DIREITO, formatarCnj, PAPEIS_CASO, type AreaDireito, type Etapa, type LinhaCaso, type PapelCaso } from "@t3jus/domain";

export const ROTAS_JURIDICO = {
  casos: "/juridico/casos",
  novo: "/juridico/casos/novo",
  caso: (id: string) => `/juridico/casos/${id}`,
  contrato: (id: string) => `/contratos/contratos/${id}`,
  cliente: (id: string) => `/clientes/${id}`,
};

/** "1001234-77.2026.5.02.0011 · Trabalhista", ou "Sem número ainda · Família". */
export function linhaProcesso(c: Pick<LinhaCaso, "numero" | "area">): string {
  return `${c.numero ? formatarCnj(c.numero) : "Sem número ainda"} · ${AREAS_DIREITO[c.area as AreaDireito] ?? c.area}`;
}

/** As etapas do andamento (sem a final, que encerra) e a posição do caso: "5 de 8". */
export function posicaoEtapa(ordem: number, etapas: Pick<Etapa, "ordem">[]): string {
  return `${ordem} de ${etapas.length}`;
}

/** "Desde 07/11. Próxima: Recurso." */
export function proximaEtapa(ordem: number, etapas: Pick<Etapa, "ordem" | "nome">[]): string | null {
  return etapas.find((e) => e.ordem === ordem + 1)?.nome ?? null;
}

/** O papel em palavras, com o gênero neutro do desenho. */
export const nomePapel = (p: PapelCaso) => PAPEIS_CASO[p];

/** "Joana Pereira e Carlos Henrique Dias"; com 3 ou mais, vírgulas e "e" no fim. */
export function juntarNomes(l: string[]): string {
  return l.length <= 1 ? (l[0] ?? "") : `${l.slice(0, -1).join(", ")} e ${l[l.length - 1]}`;
}

/** Texto do botão de mudar etapa (decisão 5). */
export function botaoMudar(para: string | null, final: boolean, avisar: boolean): string {
  if (!para) return "Mudar etapa";
  if (final) return avisar ? "Encerrar e avisar" : "Encerrar o caso";
  return avisar ? `Mudar para ${para} e avisar` : `Mudar para ${para}`;
}

/** "(11) 98552-1034" a partir de "+5511985521034". */
export function telefoneBr(t: string | null | undefined): string {
  const d = (t ?? "").replace(/\D/g, "").replace(/^55/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return t ?? "";
}
