// Áreas do Portal (PA-01): seções, ícone, descrição e endereço. Sem "use client": as páginas
// do servidor também leem daqui (para recusar seção que não existe).

import { AREAS_PORTAL, type AreaPortal } from "@t3jus/domain";
import type { NomeIcone } from "../Icone.tsx";

export const ORDEM_AREAS = Object.keys(AREAS_PORTAL) as AreaPortal[];

/** Seções de cada área (barra de seções no alto da área). */
export const SECOES_AREA: Record<AreaPortal, { chave: string; nome: string }[]> = {
  COMERCIAL: [
    { chave: "atendimentos", nome: "Atendimentos" },
    { chave: "propostas", nome: "Propostas" },
    { chave: "funil", nome: "Funil" },
    { chave: "origem", nome: "Origem dos contatos" },
  ],
  CONTRATOS: [
    { chave: "contratos", nome: "Contratos" },
    { chave: "honorarios", nome: "Honorários" },
    { chave: "modelos", nome: "Procurações e modelos" },
  ],
  FINANCEIRO: [
    { chave: "resumo", nome: "Resumo" },
    { chave: "a-receber", nome: "A receber" },
    { chave: "a-pagar", nome: "A pagar" },
    { chave: "repasses", nome: "Repasses" },
    { chave: "caixa", nome: "Caixa" },
  ],
  JURIDICO: [
    { chave: "casos", nome: "Casos e processos" },
    { chave: "prazos", nome: "Prazos" },
    { chave: "tarefas", nome: "Tarefas" },
    { chave: "peticoes", nome: "Petições" },
  ],
};

export const ICONE_AREA: Record<AreaPortal, NomeIcone> = { COMERCIAL: "maleta", CONTRATOS: "pena", FINANCEIRO: "carteira", JURIDICO: "balanca" };
export const DESCRICAO_AREA: Record<AreaPortal, string> = {
  COMERCIAL: "Atendimentos, propostas, funil e origem dos contatos.",
  CONTRATOS: "Contratos de honorários, condições, procurações e modelos.",
  FINANCEIRO: "Recebimentos, contas, repasses, caixa e o que vence.",
  JURIDICO: "Casos, processos, prazos, tarefas e petições.",
};
/** Endereço de uma área: /juridico, /juridico/prazos. */
export function rotaArea(area: AreaPortal, secao?: string): string {
  const base = `/${area.toLowerCase()}`;
  return secao ? `${base}/${secao}` : base;
}

