// Peças puras do Financeiro do Portal (desenho aprovado em docs/design/aprovadas/portal-financeiro):
// endereços, mês de referência, situação da parcela em palavras e os grupos de A receber.

import { reais, type CobrancaAtual, type ParcelaLinha } from "@t3jus/domain";
import { DIAS_SEMANA, diaCurto, diaDaSemana, nomeDoMes, somarDias } from "./agenda.ts";
import { diasEntre } from "./comercial.ts";

export const ROTAS_FINANCEIRO = {
  resumo: "/financeiro",
  receber: "/financeiro/a-receber",
  contrato: (id: string) => `/financeiro/a-receber/contratos/${id}`,
};

/** O mês a que a parcela se refere: "outubro", ou "janeiro de 2027" fora do ano corrente. */
export function mesReferencia(vencimento: string, hoje: string): string {
  const m = nomeDoMes(vencimento);
  return vencimento.slice(0, 4) === hoje.slice(0, 4) ? m : `${m} de ${vencimento.slice(0, 4)}`;
}

/** Hoje, amanhã ou o dia (26/11), para a próxima ação. */
export function quandoAcao(d: string, hoje: string): string {
  if (d === hoje) return "hoje";
  if (d === somarDias(hoje, 1)) return `amanhã, ${diaCurto(d)}`;
  return diaCurto(d);
}

export type SeloParcela = { tom: string; icone?: "alerta" | "relogio" | "check"; texto: string };

/** A situação da parcela em palavras, como no desenho (decisão 4). */
export function seloParcela(p: Pick<ParcelaLinha, "situacao" | "vencimento" | "falta" | "pagaEm">, hoje: string): SeloParcela {
  switch (p.situacao) {
    case "CANCELADA":
      return { tom: "neutro", texto: "Cancelada" };
    case "PAGA":
      return { tom: "ok", icone: "check", texto: p.pagaEm ? `Paga em ${diaCurto(p.pagaEm)}` : "Paga" };
    case "VENCIDA": {
      const d = diasEntre(p.vencimento, hoje);
      return { tom: "urgente", icone: "alerta", texto: `Vencida há ${d} ${d === 1 ? "dia" : "dias"}` };
    }
    default: {
      const parcial = p.situacao === "PARCIAL" ? ` · falta ${reais(p.falta)}` : "";
      if (p.vencimento === hoje) return { tom: "atencao", icone: "relogio", texto: `Vence hoje${parcial}` };
      if (p.vencimento === somarDias(hoje, 1)) return { tom: "atencao", icone: "relogio", texto: `Amanhã${parcial}` };
      if (p.vencimento <= somarDias(hoje, 7)) {
        const dia = DIAS_SEMANA[diaDaSemana(p.vencimento)]!;
        return { tom: "neutro", texto: `${dia[0]!.toUpperCase()}${dia.slice(1)}${parcial}` };
      }
      return { tom: "neutro", texto: p.situacao === "PARCIAL" ? `Parcial${parcial}` : "A vencer" };
    }
  }
}

/** O que se fez na cobrança, numa linha curta: "Ligação em 08/11". */
export function textoCobranca(c: CobrancaAtual | null): string | null {
  if (!c) return null;
  const nomes: Record<CobrancaAtual["tipo"], string> = { LIGACAO: "Ligação", MENSAGEM: "Mensagem", ANOTACAO: "Anotação", PASSADA: "Passada" };
  const dia = c.em.slice(0, 10);
  return `${nomes[c.tipo]} em ${diaCurto(dia)}`;
}

export type ChaveGrupo = "VENCIDAS" | "SETE_DIAS" | "MES" | "DEPOIS";
export interface GrupoParcelas { chave: string; titulo: string; total: number; parcelas: ParcelaLinha[] }

const fimDoMes = (hoje: string) => {
  const [a, m] = [Number(hoje.slice(0, 4)), Number(hoje.slice(5, 7))];
  const d = new Date(Date.UTC(a, m, 0));
  return d.toISOString().slice(0, 10);
};

/** Os grupos por vencimento (decisão 4): vencidas, 7 dias, até o fim do mês e depois. */
export function gruposPorVencimento(lista: ParcelaLinha[], hoje: string): GrupoParcelas[] {
  const sete = somarDias(hoje, 7);
  const fim = fimDoMes(hoje);
  const ate = sete > fim ? sete : fim;
  const def: { chave: ChaveGrupo; titulo: string; cabe: (v: string) => boolean }[] = [
    { chave: "VENCIDAS", titulo: "Vencidas", cabe: (v) => v < hoje },
    { chave: "SETE_DIAS", titulo: "Próximos 7 dias", cabe: (v) => v >= hoje && v <= sete },
    { chave: "MES", titulo: `Até ${diaCurto(fim)}`, cabe: (v) => v > sete && v <= fim },
    { chave: "DEPOIS", titulo: `Depois de ${diaCurto(ate)}`, cabe: (v) => v > ate },
  ];
  return def
    .map((g) => {
      const parcelas = lista.filter((p) => g.cabe(p.vencimento));
      return { chave: g.chave, titulo: g.titulo, total: parcelas.reduce((s, p) => s + (p.noMes ?? p.falta), 0), parcelas };
    })
    .filter((g) => g.parcelas.length);
}

/** Por cliente (e contrato): da maior soma para a menor. */
export function gruposPorCliente(lista: ParcelaLinha[]): GrupoParcelas[] {
  const m = new Map<string, GrupoParcelas>();
  for (const p of lista) {
    const g = m.get(p.contrato.id) ?? { chave: p.contrato.id, titulo: `${p.cliente.nome} · ${p.contrato.numero}`, total: 0, parcelas: [] };
    g.total += p.noMes ?? p.falta;
    g.parcelas.push(p);
    m.set(p.contrato.id, g);
  }
  return [...m.values()].sort((a, b) => b.total - a.total || a.titulo.localeCompare(b.titulo, "pt-BR"));
}
