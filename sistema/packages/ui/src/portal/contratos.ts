// Contratos do Portal (CH-01 a CH-04, CH-06, IN-01): rotas, textos e contas da tela, sem
// React, para os testes de unidade. A programação de verdade é a do servidor; aqui só a prévia
// do formulário ("O que este contrato gera"), com as mesmas regras do domínio.

import {
  dataBr, percentual, programacao, reais, SITUACOES_CONTRATO, valorCerto, TIPOS_HONORARIO,
  type Condicao, type ContratoLinha, type EventoContrato, type RecebimentoPrevisto, type SituacaoContrato,
} from "@t3jus/domain";
import { diaCurto } from "./agenda.ts";

export const ROTAS_CONTRATOS = {
  contratos: "/contratos/contratos",
  novo: "/contratos/contratos/novo",
  honorarios: "/contratos/honorarios",
  modelos: "/contratos/modelos",
  contrato: (id: string) => `/contratos/contratos/${id}`,
  recebimentos: (id: string) => `/contratos/contratos/${id}?aba=recebimentos`,
  documentos: (id: string) => `/contratos/contratos/${id}?aba=documentos`,
  mudar: (id: string) => `/contratos/contratos/${id}/mudar`,
  daProposta: (propostaId: string) => `/contratos/contratos/novo?proposta=${propostaId}`,
  cliente: (id: string) => `/clientes/${id}`,
  proposta: (id: string) => `/comercial/propostas/${id}`,
};

export const SELO_CONTRATO: Record<SituacaoContrato, { tom: string; icone?: "lapis" | "pasta" }> = {
  ELABORACAO: { tom: "andamento", icone: "lapis" },
  ATIVO: { tom: "ativo" },
  ENCERRADO: { tom: "neutro", icone: "pasta" },
};
export const nomeSituacaoContrato = (s: SituacaoContrato) => SITUACOES_CONTRATO[s];

/** A célula "Próximo recebimento" da lista: data e valor, e o que vence nela. */
export function textoProximo(c: Pick<ContratoLinha, "situacao" | "proximo">): { linha: string; sub: string } | null {
  if (c.situacao !== "ATIVO" || !c.proximo) return null;
  const p = c.proximo;
  const valor = p.valor ? reais(p.valor) : "a definir";
  const resto = p.aDefinir && p.valor ? " + a definir" : "";
  return { linha: `${diaCurto(p.em)} · ${valor}${resto}`, sub: juntarItens(p.itens.map((i) => i.charAt(0).toLowerCase() + i.slice(1))) };
}

export function juntarItens(l: string[]): string {
  return l.length <= 1 ? (l[0] ?? "") : `${l.slice(0, -1).join(", ")} e ${l[l.length - 1]}`;
}

/** Resumo lateral do formulário: valor certo, o que depende do caso e a programação. */
export function resumoContrato(lista: Condicao[]): {
  certo: number;
  partes: string;
  depende: { titulo: string; sub: string }[];
  programacao: ReturnType<typeof programacao>;
} {
  const certo = valorCerto(lista);
  const partes = lista
    .filter((c) => c.tipo === "FIXO" || c.tipo === "PARCELADO" || c.tipo === "MENSAL")
    .map((c) => `${TIPOS_HONORARIO[c.tipo].nome.toLowerCase()} ${reais(c.tipo === "PARCELADO" ? c.total : c.tipo === "MENSAL" ? c.valor * Math.min(c.meses ?? 12, 12) : c.valor)}`);
  const depende: { titulo: string; sub: string }[] = [];
  for (const c of lista) {
    if (c.tipo === "EXITO") depende.push({ titulo: `${percentual(c.percentual)} ${c.sobre.toLowerCase()}`, sub: `quando o caso chegar a “${c.etapa}”` });
    if (c.tipo === "SUCUMBENCIA") depende.push({ titulo: c.quem === "ESCRITORIO" ? "Sucumbência inteira" : `${percentual(c.percentualEscritorio!)} da sucumbência`, sub: `quando o caso chegar a “${c.etapa}”` });
    if (c.tipo === "ATO") depende.push({ titulo: c.atos.map((a) => `${reais(a.valor)} por ${a.nome.toLowerCase()}`).join("; "), sub: "a cada ato feito no caso" });
    if (c.tipo === "RECORRENTE") depende.push({ titulo: `${percentual(c.percentual)} ${c.sobre.toLowerCase()} por ${c.meses} ${c.meses === 1 ? "mês" : "meses"}`, sub: `${c.etapa ? `depois de “${c.etapa}”` : `desde ${dataBr(c.primeiro!)}`}; base pedida todo dia ${c.diaLembrete}` });
  }
  return { certo, partes: partes.length > 1 ? partes.join(" + ") : partes[0] ?? "", depende, programacao: programacao(lista, 24) };
}

/** A programação da ficha: os 3 meses à frente e o que já passou; o resto conta à parte. */
export function janelaProgramacao(lista: RecebimentoPrevisto[], hoje: string): { mostrar: RecebimentoPrevisto[]; depois: number; ate: string | null; programado: number } {
  const limite = somarMesesDia(hoje, 3);
  // F3.139: a parcela com baixa sem receber continua na programação do contrato.
  const vivos = lista.filter((r) => !r.cancelado || !!r.baixa || !!r.foraDaCobranca);
  // As pagas antes do T3jus (F3.73) ficam na folha delas, fora da programação. A que passou para
  // A receber e voltou ("Foi paga, sim", F3.84) também: ela está de novo na folha.
  const mostrar = lista.filter((r) => !r.pagoAntes && !(r.eraPagoAntes && r.cancelado) && r.vencimento <= limite);
  const ultimo = vivos.length ? vivos[vivos.length - 1]!.vencimento : null;
  return {
    mostrar,
    depois: vivos.filter((r) => r.vencimento > limite).length,
    ate: ultimo,
    programado: vivos.reduce((t, r) => t + (r.valor ?? 0), 0),
  };
}

function somarMesesDia(d: string, n: number): string {
  const [a, m, dia] = d.split("-").map(Number) as [number, number, number];
  const x = new Date(Date.UTC(a, m - 1 + n, dia));
  return x.toISOString().slice(0, 10);
}

/** O que cada evento do histórico do contrato diz. */
export function fraseDoContrato(e: EventoContrato): { oque: string; detalhe?: string; forte?: boolean } | null {
  const d = e.dados;
  switch (e.acao) {
    case "contrato.criado":
      return { oque: "criou o contrato", detalhe: d.proposta ? `Da proposta ${String(d.proposta)}.` : undefined, forte: true };
    case "contrato.assinado":
      return { oque: "registrou a assinatura", detalhe: `Assinado em ${dataBr(String(d.em))}. ${Number(d.recebimentos) === 1 ? "1 recebimento programado" : `${Number(d.recebimentos)} recebimentos programados`}.`, forte: true };
    case "contrato.editado": {
      const n = Number(d.cancelados ?? 0);
      const mudou = d.condicoes_antes ? "mudou as condições" : "mudou o contrato";
      return {
        oque: mudou,
        detalhe: [d.motivo ? `Motivo: “${String(d.motivo)}”.` : "", n ? `${n === 1 ? "1 recebimento futuro foi cancelado" : `${n} recebimentos futuros foram cancelados`} e ${Number(d.novos ?? 0)} gerados de novo.` : ""].filter(Boolean).join(" ") || undefined,
      };
    }
    case "contrato.encerrado":
      return { oque: "encerrou o contrato", detalhe: Number(d.cancelados) ? `${Number(d.cancelados)} recebimentos que ainda iam vencer foram cancelados.` : undefined, forte: true };
    case "contrato.base_informada":
      return { oque: "informou a base do mês", detalhe: `${reais(Number(d.base))} dá ${reais(Number(d.valor))}, a receber em ${dataBr(String(d.vencimento))}.` };
    case "contrato.inscricoes_mudadas": {
      // EX-12, decisão 19: o antes e o depois de cada advogado que mudou.
      const antes = (d.antes ?? {}) as Record<string, string | null>;
      const depois = (d.depois ?? {}) as Record<string, string | null>;
      const nomes = Object.keys(depois).filter((n) => antes[n] !== depois[n]);
      return {
        oque: "mudou as inscrições na OAB do contrato",
        detalhe: nomes.map((n) => `${n}: ${depois[n] ?? "sem OAB"}${antes[n] ? ` (antes, ${antes[n]})` : ""}.`).join(" ") || undefined,
      };
    }
    // "Não foi paga" e "Foi paga, sim" (F3.84): a parcela, o vencimento e o motivo.
    case "contrato.parcela_nao_paga": {
      const manteve = d.vencimento === d.vencimentoPlanilha;
      return {
        oque: `passou a ${String(d.descricao ?? "parcela").toLowerCase()} para A receber`,
        detalhe: `Não foi paga. ${manteve ? "Vencimento mantido" : "Novo vencimento"}: ${dataBr(String(d.vencimento))}. Motivo: “${String(d.motivo)}”.`,
        forte: true,
      };
    }
    case "contrato.parcela_foi_paga":
      return {
        oque: `voltou a ${String(d.descricao ?? "parcela").toLowerCase()} para “Pago antes do T3jus”`,
        detalhe: `Foi paga, sim. Motivo: “${String(d.motivo)}”.`,
      };
    case "contrato.responsavel_passado":
      return { oque: "O contrato passou para outra pessoa da equipe, porque o responsável saiu." };
    case "estado.mudou":
      return null;
    default:
      return null;
  }
}
