// Contratos do Portal (CH-01 a CH-04, CH-06, IN-01): contrato de honorários ligado ao cliente,
// advogados, programação dos recebimentos e a base do mês do percentual recorrente. As regras
// estão no banco (0200_portal_contratos.sql); aqui o esquema só confere a forma do pedido.

import { z } from "zod";
import { condicaoSchema } from "./comercial.ts";
import type { Condicao, TipoHonorario } from "./honorarios.ts";
import type { PessoaRef } from "./clientes.ts";
import type { InscricaoOab } from "./portal.ts";

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
  /** Quais inscrições na OAB de cada advogado vão no documento (EX-12): {pessoaId: [inscrição]}. Sem a pessoa, vão todas. */
  inscricoes: z.record(z.string().max(40), z.array(z.string().max(40)).max(30)).nullish(),
});
export type DadosContrato = z.input<typeof dadosContratoSchema>;

export const editarContratoSchema = dadosContratoSchema.omit({ clienteId: true, propostaId: true }).extend({
  versao: z.number().int().min(1),
  motivo: texto(500),
});

export const inscricoesContratoSchema = z.object({ versao: z.number().int().min(1), inscricoes: z.array(z.string().max(40)).max(30) });

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
  /** A OAB de cada advogado neste contrato (EX-12, decisões 16, 18 e 20). */
  inscricoes?: AdvogadoNoContrato[];
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

/** Inscrição da pessoa com a marca de escolhida neste contrato. */
export interface InscricaoNoContrato extends InscricaoOab { escolhida: boolean }
export interface AdvogadoNoContrato {
  pessoaId: string;
  /** "OAB/SP nº 287.104 e OAB/RJ nº 245.880-S", ou null sem OAB. */
  frase: string | null;
  inscricoes: InscricaoNoContrato[];
  /** As escolhidas foram removidas na Equipe e o contrato passou a usar as que restam. */
  usaTodas: boolean;
}
/** Pessoa da equipe com as inscrições, para marcar os advogados do contrato. */
export interface PessoaComOab { id: string; nome: string; oab: InscricaoOab[] }

// Pedido de contrato feito pelo Comercial que ainda não virou contrato (IN-01, F3.11).
export interface PedidoContrato {
  proposta: { id: string; numero: string; servico: string; aceitaEm: string | null };
  cliente: { id: string; nome: string };
  condicoes: Condicao[];
  pedidoPor: PessoaRef;
  pedidoEm: string;
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
