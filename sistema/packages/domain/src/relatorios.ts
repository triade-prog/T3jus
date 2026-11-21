// Relatórios do sócio (F3.70; IN-02 a IN-05, IN-07, IN-08, IN-09, IN-12, IN-14, IN-15). Só a sócia
// dona abre. Tudo em centavos, calculado no servidor; terceiros nunca somam com o escritório.

import { z } from "zod";
import type { PessoaRef } from "./clientes.ts";
import type { AreaDireito } from "./juridico.ts";
import type { FormaPagamento, TipoLevantamento } from "./financeiro.ts";

/** A área do relatório: a do caso ligado ao contrato, ou "Sem caso ligado". */
export type AreaRelatorio = AreaDireito | "SEM_CASO";
export type CompararCom = "anterior" | "ano_passado" | "nao";

export interface PeriodoRelatorio {
  de: string;
  ate: string;
  comparar: CompararCom;
  /** O período de comparação; nulo quando não compara. */
  cde: string | null;
  cate: string | null;
  hoje: string;
  /** O período vai até hoje e o mês de hoje ainda não fechou. */
  aberto: boolean;
}

export interface NumerosRelatorio {
  entrou: number;
  adiantado: number;
  rendeu: number;
  falta: number;
  vencido: number;
}

type Faixa = { valor: number; n: number };

export interface ResumoRelatorio {
  periodo: PeriodoRelatorio;
  algum: boolean;
  primeiro: string | null;
  entrou: { valor: number; n: number; anterior: number | null; previstoMes: number };
  falta: {
    valor: number; vencido: number; vencidas: number; anterior: number | null; vencidoAnterior: number | null;
    faixas: [Faixa, Faixa, Faixa, Faixa]; aVencerMes: Faixa; aVencerDepois: Faixa;
    aparte: {
      valor: number; lista: { id: string; tipo: TipoLevantamento; valor: number; prazo: string; cliente: string; caso: string }[];
      /** F3.72: RPV e precatório a caminho, com a data estimada (a parte do escritório). */
      caminho?: { valor: number; lista: { id: string; tipo: "RPV" | "PRECATORIO"; valor: number; estimadaMes: string; passou: boolean; cliente: string; caso: string }[] };
    };
  };
  rendeu: { valor: number; adiantado: number; anterior: number | null; despesas: { id: string; descricao: string; valor: number; cliente: string }[] };
  contratado: number;
  meses: { mes: string; anterior: boolean; valor: number; parcial: boolean }[];
  clientes: { n: number; top: { id: string; nome: string; inativo: boolean; contratos: number; entrou: number }[] };
  areas: { area: AreaRelatorio; entrou: number; casos: number; contratos: number }[];
  terceiros: {
    entrou: number; n: number; porTipo: Partial<Record<TipoLevantamento, number>>; repassado: number; clientesRepassados: string[];
    honorarios: number; reembolso: number; outros: number; naConta: number;
  };
}

export interface ClienteRelatorio extends NumerosRelatorio {
  id: string;
  nome: string;
  inativo: boolean;
  contratos: number;
  responsaveis: string[];
  areas: AreaRelatorio[];
  contratado: number;
  aparte: { tipo: TipoLevantamento; valor: number }[];
}
export interface RelatorioClientes { periodo: PeriodoRelatorio; clientes: ClienteRelatorio[] }

export interface RelatorioCliente {
  periodo: PeriodoRelatorio;
  cliente: { id: string; nome: string; inativo: boolean; contratos: number; casos: number; responsavel: PessoaRef | null };
  atraso: {
    valor: number; n: number; dias: number;
    mais: { descricao: string; vencimento: string; contrato: string; prox: { data: string; oque: string; responsavel: PessoaRef } | null };
  } | null;
  numeros: NumerosRelatorio & { contratado: number; entrouAnterior: number | null };
  contratos: {
    id: string; numero: string; objeto: string; estado: string; caso: { id: string; nome: string } | null; area: AreaRelatorio;
    entrou: number; falta: number; parcelasAbertas: number;
  }[];
  entradas: {
    id: string; dia: string; valor: number; origem: "PARCELA" | "LEVANTAMENTO"; descricao: string; forma: FormaPagamento | null;
    tipo: string; area: AreaRelatorio; contrato: string | null;
  }[];
  abertas: {
    id: string; descricao: string; vencimento: string; falta: number; contrato: string;
    cobranca: { motivo: string | null; data: string; oque: string; responsavel: PessoaRef } | null;
  }[];
  adiantadas: { id: string; descricao: string; valor: number; pagaEm: string; reembolsadoEm: string | null; como: string }[];
  terceiros: { id: string; tipo: TipoLevantamento; valor: number; entrouEm: string; caso: string; repasse: { valor: number; feitoEm: string | null; prazo: string } | null }[];
}

export interface AreaDoRelatorio extends NumerosRelatorio {
  area: AreaRelatorio;
  anterior: number | null;
  casos: number | null;
  encerrados: number | null;
  contratosSemCaso: number | null;
  aparte: { tipo: TipoLevantamento; valor: number; cliente: string }[];
}
export interface RelatorioAreas { periodo: PeriodoRelatorio; areas: AreaDoRelatorio[] }

export interface ResponsavelRelatorio extends NumerosRelatorio {
  pessoa: PessoaRef;
  dono: boolean;
  casos: number;
  encerrados: number;
  contratosSemCaso: number;
}
export interface RelatorioResponsaveis { periodo: PeriodoRelatorio; responsaveis: ResponsavelRelatorio[] }

export type VisaoRelatorio = "visao" | "clientes" | "areas" | "responsaveis" | "cliente";
export type FormatoRelatorio = "XLSX" | "PDF";

export interface DadosRelatorioExportado {
  periodo: PeriodoRelatorio;
  formato: FormatoRelatorio;
  resumo: ResumoRelatorio;
  clientes: ClienteRelatorio[];
  areas: AreaDoRelatorio[];
  responsaveis: ResponsavelRelatorio[];
  recebimentos: {
    dia: string; valor: number; origem: "PARCELA" | "LEVANTAMENTO"; descricao: string; forma: FormaPagamento | null; tipo: string;
    area: AreaRelatorio; cliente: string; contrato: string | null; responsavel: string | null;
  }[];
  terceiros: { entrouEm: string; tipo: TipoLevantamento; valor: number; cliente: string; caso: string; repassado: number; honorarios: number }[];
}

const dia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const periodoRelatorioSchema = z.object({
  de: dia.optional(),
  ate: dia.optional(),
  comparar: z.enum(["anterior", "ano_passado", "nao"]).optional(),
});
export const exportarRelatorioSchema = periodoRelatorioSchema.extend({
  visao: z.enum(["visao", "clientes", "areas", "responsaveis", "cliente"]),
  formato: z.enum(["XLSX", "PDF"]),
});
