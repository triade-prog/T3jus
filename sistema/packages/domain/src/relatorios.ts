// Relatórios do sócio (F3.70; IN-02 a IN-05, IN-07, IN-08, IN-09, IN-12, IN-14, IN-15). Só a sócia
// dona abre. Tudo em centavos, calculado no servidor; terceiros nunca somam com o escritório.

import { z } from "zod";
import type { PessoaRef } from "./clientes.ts";
import type { AreaDireito } from "./juridico.ts";
import type { FormaPagamento, MotivoBaixa, TipoLevantamento } from "./financeiro.ts";

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

/**
 * F3.173 (1101): o "Baixado sem receber" do período, pelo dia da baixa (Brasília). O número soma só
 * as baixas de parcela perdoadas e por inadimplência; as desfeitas, a renegociada e as custas ficam
 * ao lado, sem somar. Um desfazer conta no dia dele e não muda o período da baixa.
 */
export interface BaixadoRelatorio {
  valor: number;
  n: number;
  porMotivo: { PERDOADA: number; INADIMPLENCIA: number };
  desfeitas: Faixa;
  renegociado: Faixa & { desfeitas: Faixa };
  custas: Faixa & { desfeitas: Faixa };
  /** O mesmo número no período de comparação; nulo quando não compara. */
  anterior: number | null;
  /** O escritório já teve alguma baixa sem receber (a folha só aparece aí). */
  algum: boolean;
}

/** Um movimento da lista "Baixas sem receber no período" do relatório de um cliente. */
export interface BaixaDoRelatorio {
  id: string;
  dia: string;
  tipo: "BAIXA" | "DESFEITA";
  motivo: MotivoBaixa;
  /** As custas que tiveram baixa junto com a parcela. */
  custas: boolean;
  /** Entra no número (baixa de parcela perdoada ou por inadimplência). */
  soma: boolean;
  valor: number;
  parcela: string;
  por: PessoaRef;
  /** O dia em que a baixa foi desfeita, quando foi (mesmo depois do período). */
  desfeitaEm: string | null;
  /** No desfazer, o dia da baixa que ele desfaz. */
  baixaEm: string | null;
  /** Só na baixa, e nunca para o cliente excluído. */
  explicacao: string | null;
}

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
  /** F3.173; ausente enquanto a 1101 não estiver no banco. */
  baixado?: BaixadoRelatorio;
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
  /** F3.173: o baixado sem receber do cliente no período (ausente sem a 1101). */
  baixado?: number;
  baixadoMotivos?: MotivoBaixa[];
}
export interface RelatorioClientes { periodo: PeriodoRelatorio; clientes: ClienteRelatorio[] }

export interface RelatorioCliente {
  periodo: PeriodoRelatorio;
  cliente: { id: string; nome: string; inativo: boolean; contratos: number; casos: number; responsavel: PessoaRef | null };
  atraso: {
    valor: number; n: number; dias: number;
    mais: { descricao: string; vencimento: string; contrato: string; prox: { data: string; oque: string; responsavel: PessoaRef } | null };
  } | null;
  numeros: NumerosRelatorio & { contratado: number; entrouAnterior: number | null; baixado?: number; baixadoDesfeitas?: number };
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
  /** F3.173: as baixas e os desfazer do período (ausente sem a 1101). */
  baixas?: BaixaDoRelatorio[];
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
  /** F3.173: a aba "Baixas sem receber", sem a explicação (ausente sem a 1101). */
  baixas?: {
    dia: string; tipo: "BAIXA" | "DESFEITA"; motivo: MotivoBaixa; custas: boolean; soma: boolean; valor: number; desfeitaEm: string | null;
    cliente: string; contrato: string; parcela: string; por: string;
  }[];
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
