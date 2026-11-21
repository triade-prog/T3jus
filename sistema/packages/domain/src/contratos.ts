// Contratos do Portal (CH-01 a CH-04, CH-06, IN-01): contrato de honorários ligado ao cliente,
// advogados, programação dos recebimentos e a base do mês do percentual recorrente. As regras
// estão no banco (0200_portal_contratos.sql); aqui o esquema só confere a forma do pedido.

import { z } from "zod";
import { condicaoSchema } from "./comercial.ts";
import type { Condicao, TipoHonorario } from "./honorarios.ts";
import type { PessoaRef } from "./clientes.ts";

export const SITUACOES_CONTRATO = { ELABORACAO: "Em elaboração", ATIVO: "Ativo", ENCERRADO: "Encerrado" } as const;
export type SituacaoContrato = keyof typeof SITUACOES_CONTRATO;

export const MOSTRAR_CONTRATOS = ["ATIVOS", "ENCERRADOS", "BASE"] as const;
export type MostrarContratos = (typeof MOSTRAR_CONTRATOS)[number];

export const FONTES_BASE = { EXTRATO: "Extrato do benefício (INSS)", CONTRACHEQUE: "Contracheque", CLIENTE: "Informado pelo cliente" } as const;
export type FonteBase = keyof typeof FONTES_BASE;

const id = z.string().max(40).nullish();
const texto = (max: number) => z.string().max(max).nullish();

export const dadosContratoSchema = z.object({
  clienteId: id,
  propostaId: id,
  objeto: texto(400),
  observacoes: texto(3000),
  responsavelId: id,
  advogados: z.array(z.string().max(40)).max(20).default([]),
  condicoes: z.array(condicaoSchema).max(7).default([]),
});
export type DadosContrato = z.input<typeof dadosContratoSchema>;

export const editarContratoSchema = dadosContratoSchema.omit({ clienteId: true, propostaId: true }).extend({
  versao: z.number().int().min(1),
  motivo: texto(500),
});

export const assinaturaContratoSchema = z.object({ versao: z.number().int().min(1), assinadoEm: z.string().max(20).nullish() });
export const encerrarContratoSchema = z.object({ versao: z.number().int().min(1), motivo: texto(500) });
export const baseMesSchema = z.object({ valor: z.number().int().nullish(), fonte: z.string().max(20).nullish(), vencimento: z.string().max(20).nullish() });

export interface ProximoRecebimento { em: string; valor: number | null; aDefinir: number; itens: string[] }

export interface ContratoLinha {
  id: string;
  numero: string;
  objeto: string;
  situacao: SituacaoContrato;
  cliente: { id: string; nome: string; tipo: "PF" | "PJ" };
  responsavel: PessoaRef;
  condicoes: Condicao[];
  proximo: ProximoRecebimento | null;
  basePendente: { vencimento: string; parada: boolean } | null;
  criadoEm: string;
}
export interface ListaContratos {
  algum: boolean;
  contagem: { ativos: number; elaboracao: number; encerrados: number; base: number };
  contratos: ContratoLinha[];
}

export interface RecebimentoPrevisto {
  id: string;
  tipo: TipoHonorario;
  descricao: string;
  vencimento: string;
  valor: number | null;
  origem: "PROGRAMADO" | "BASE";
  criadoEm: string;
  cancelado: { em: string; motivo: string } | null;
  /** Paga antes do T3jus, vinda da planilha (F3.73): só informação, nasce cancelada. */
  pagoAntes?: boolean;
  base: { valor: number; fonte: FonteBase; por: PessoaRef; em: string } | null;
}
export interface EventoContrato { em: string; acao: string; autor: string | null; dados: Record<string, unknown> }
export interface FichaContrato extends ContratoLinha {
  observacoes: string | null;
  versao: number;
  assinadoEm: string | null;
  assinaturaPor: PessoaRef | null;
  encerradoEm: string | null;
  motivoEncerramento: string | null;
  proposta: { id: string; numero: string } | null;
  advogados: PessoaRef[];
  financeiro: boolean;
  recebimentos: RecebimentoPrevisto[];
  historico: EventoContrato[];
  /** A importação de planilha de onde o contrato veio (F3.73), ou nulo. */
  importacao?: OrigemImportacaoContrato | null;
}

export interface OrigemImportacaoContrato {
  id: string;
  arquivo: string;
  linha: number | null;
  por: PessoaRef | null;
  em: string;
  desfazerAte: string | null;
  desfeita: boolean;
}

export interface PropostaParaContrato {
  id: string;
  numero: string;
  respondidaEm: string | null;
  servico: string;
  escopo: string | null;
  responsavel: PessoaRef;
  cliente: { id: string; nome: string; tipo: "PF" | "PJ" };
  condicoes: Condicao[];
}

export interface BasePendente {
  recebimentoId: string;
  vencimento: string;
  pedirEm: string;
  mes: number | null;
  de: number | null;
  parada: boolean;
  contrato: { id: string; numero: string };
  cliente: string;
  responsavel: PessoaRef;
  percentual: number;
  sobre: string;
}
export interface HonorariosContratos {
  bases: BasePendente[];
  informadas: { contrato: { id: string; numero: string }; cliente: string; descricao: string; base: number; valor: number; vencimento: string; por: PessoaRef; em: string }[];
  etapas: { contrato: { id: string; numero: string }; cliente: string; condicao: Condicao; etapa: string }[];
  noMes: number;
  tipos: { tipo: TipoHonorario; n: number }[];
  ativos: number;
}
