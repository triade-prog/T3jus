// Comercial do Portal (AP-02 a AP-06, IN-01, PD-02): retornos, propostas, funil e origem.
// As mesmas listas estão no banco (0190_portal_comercial.sql). O servidor confere cada campo e
// devolve todos os que estão errados de uma vez; aqui o esquema só confere a forma do pedido.

import { z } from "zod";
import type { Condicao } from "./honorarios.ts";
import type { Origem, PessoaRef } from "./clientes.ts";

export const SITUACOES_PROPOSTA = {
  RASCUNHO: "Rascunho",
  ENVIADA: "Enviada",
  NEGOCIACAO: "Em negociação",
  ACEITA: "Aceita",
  CONTRATO: "Virou contrato",
  RECUSADA: "Recusada",
} as const;
export type SituacaoProposta = keyof typeof SITUACOES_PROPOSTA;

export const RESPOSTAS_PROPOSTA = { ACEITOU: "Aceitou", MUDANCA: "Pediu mudança", RECUSOU: "Recusou" } as const;
export type RespostaProposta = keyof typeof RESPOSTAS_PROPOSTA;

/** Motivos da recusa: lista curta, que alimenta o Funil. */
export const MOTIVOS_RECUSA = {
  VALOR_ALTO: "Achou o valor alto",
  OUTRO_ESCRITORIO: "Fechou com outro escritório",
  DESISTIU: "Desistiu de entrar com a ação",
  SEM_RESPOSTA: "Não respondeu mais",
  OUTRO: "Outro",
} as const;
export type MotivoRecusa = keyof typeof MOTIVOS_RECUSA;

export const CANAIS_RESPOSTA = { WHATSAPP: "WhatsApp", TELEFONE: "Telefone", PRESENCIAL: "Presencial", EMAIL: "E-mail", VIDEO: "Videochamada" } as const;

/** Por que o primeiro contato não recebeu proposta (o Funil conta). */
export const MOTIVOS_FORA_FUNIL = {
  NAO_PEGOU: "o escritório não pegou o caso",
  NAO_VOLTOU: "não voltaram depois do atendimento",
} as const;

export const PERIODOS_COMERCIAL = { "30": "30 dias", "90": "90 dias", "12": "12 meses" } as const;
export type PeriodoComercial = keyof typeof PERIODOS_COMERCIAL;

const texto = (max: number) => z.string().max(max).nullish();
const dia = z.string().max(20).nullish();

export const condicaoSchema = z.object({ tipo: z.string().max(20) }).passthrough();

export const dadosPropostaSchema = z.object({
  clienteId: z.string().max(40).nullish(),
  servico: texto(400),
  escopo: texto(6000),
  responsavelId: z.string().max(40).nullish(),
  validaAte: dia,
  condicoes: z.array(condicaoSchema).max(7).default([]),
  retorno: z.object({ em: dia, responsavelId: z.string().max(40).nullish(), oque: texto(400) }).nullish(),
  rascunho: z.boolean().default(false),
});
export type DadosProposta = z.input<typeof dadosPropostaSchema>;

export const editarPropostaSchema = dadosPropostaSchema.extend({ versao: z.number().int().min(1) });

export const respostaPropostaSchema = z.object({
  versao: z.number().int().min(1),
  resposta: z.string().max(20),
  em: dia,
  canal: z.string().max(20).nullish(),
  motivo: z.string().max(40).nullish(),
  observacao: texto(1000),
});

export interface Retorno {
  clienteId: string;
  nome: string;
  tipo: "PF" | "PJ";
  em: string | null;
  oque: string | null;
  responsavel: PessoaRef | null;
  ultimo: { em: string; canal: string; comQuem: string | null; resumo: string } | null;
}
export interface Retornos {
  grupos: { vencidos: Retorno[]; hoje: Retorno[]; semana: Retorno[]; depois: Retorno[]; semData: Retorno[] };
  totais: { vencidos: number; hoje: number; semana: number; semData: number };
  porResponsavel: { pessoa: PessoaRef; vencidos: number; hoje: number; total: number }[];
  propostasEsperando: { id: string; numero: string; cliente: string; situacao: SituacaoProposta; enviadaEm: string | null; responsavel: PessoaRef; retorno: { em: string; vencido: boolean } | null }[];
  algum: boolean;
}

export interface PropostaLinha {
  id: string;
  numero: string;
  cliente: { id: string; nome: string; tipo: "PF" | "PJ" };
  servico: string;
  responsavel: PessoaRef;
  situacao: SituacaoProposta;
  vencida: boolean;
  condicoes: Condicao[];
  retorno: { em: string; vencido: boolean } | null;
  criadaEm: string;
}
export interface ListaPropostas {
  propostas: PropostaLinha[];
  contagem: { andamento: number; contrato: number; recusadas: number };
  algum: boolean;
}

export interface EventoProposta { em: string; acao: string; autor: string | null; dados: Record<string, unknown> }
export interface FichaProposta extends PropostaLinha {
  escopo: string | null;
  validaAte: string | null;
  enviadaEm: string | null;
  respondidaEm: string | null;
  motivoRecusa: MotivoRecusa | null;
  origem: Origem | null;
  versao: number;
  retornoCompleto: { em: string; oque: string | null; responsavel: PessoaRef | null; vencido: boolean } | null;
  podeContrato: boolean;
  quemTemContratos: string[];
  contratoPedidoEm: string | null;
  historico: EventoProposta[];
}

export interface Funil {
  de: string;
  ate: string;
  primeiros: number;
  comProposta: number;
  contratos: number;
  semProposta: { naoPegou: number; naoVoltou: number; emAtendimento: number };
  depoisProposta: { andamento: number; recusadas: { motivo: MotivoRecusa; n: number }[] };
  agora: {
    primeiro: { clienteId: string; nome: string; detalhe: string; rascunho: boolean; semRetorno: boolean }[];
    enviada: AgoraProposta[];
    negociacao: AgoraProposta[];
    aceita: AgoraProposta[];
    /** Os 3 contratos mais recentes que vieram de proposta (área Contratos). */
    contrato?: { id: string; numero: string; clienteId: string; nome: string; em: string; situacao: "ELABORACAO" | "ATIVO" | "ENCERRADO"; valorCerto: number }[];
  };
}
export interface AgoraProposta { id: string; numero: string; clienteId: string; nome: string; retorno: { em: string; vencido: boolean } | null; valorCerto: number; condicoes: Condicao[] }

export interface OrigemLinha { origem: Origem | null; contatos: number; propostas: number; contratos: number; valorCerto: number }
export interface OrigemContatos {
  de: string;
  ate: string;
  total: number;
  linhas: OrigemLinha[];
  indicacoes: { nome: string; n: number }[];
}
