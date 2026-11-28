// Comercial do Portal (AP-02 a AP-06, IN-01, PD-02): retornos, propostas, funil e origem.
// As mesmas listas estão no banco (0190_portal_comercial.sql). O servidor confere cada campo e
// devolve todos os que estão errados de uma vez; aqui o esquema só confere a forma do pedido.

import { z } from "zod";
import type { Condicao } from "./honorarios.ts";
import type { Origem, PessoaRef, SituacaoCliente } from "./clientes.ts";

export const SITUACOES_PROPOSTA = {
  RASCUNHO: "Rascunho",
  ENVIADA: "Enviada",
  NEGOCIACAO: "Em negociação",
  ACEITA: "Aceita",
  CONTRATO: "Virou contrato",
  RECUSADA: "Recusada",
} as const;
export type SituacaoProposta = keyof typeof SITUACOES_PROPOSTA;

/** F3.204: o selo da proposta de cliente excluído ou arquivado a pedido do titular (a situação continua a gravada). */
export const PROPOSTA_ENCERRADA = { curto: "Encerrada a pedido", longo: "Encerrada a pedido do titular" } as const;

/** Os filtros da lista de Propostas (GET /v1/escritorio/propostas?mostrar=). ENCERRADAS desde a F3.204. */
export const MOSTRAR_PROPOSTAS = ["ANDAMENTO", "CONTRATO", "RECUSADAS", "ENCERRADAS"] as const;
export type MostrarPropostas = (typeof MOSTRAR_PROPOSTAS)[number];

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

export type MotivoForaFunil = keyof typeof MOTIVOS_FORA_FUNIL;
/** Rótulos da janela "Encerrar sem proposta" e da lista "Saíram sem proposta" (F3.8). */
export const MOTIVOS_SAIDA_FUNIL: Record<MotivoForaFunil, { titulo: string; ajuda: string; curto: string; selo: string }> = {
  NAO_PEGOU: { titulo: "O escritório não pegou o caso", ajuda: "Fora da área, sem viabilidade, conflito de interesse ou falta de agenda.",
               curto: "não pegou o caso", selo: "Escritório não pegou" },
  NAO_VOLTOU: { titulo: "O cliente não voltou", ajuda: "Foi atendido e não deu mais retorno.", curto: "não voltou", selo: "Cliente não voltou" },
};

/** Encerrar sem proposta: um dos dois motivos e a anotação opcional (até 300 caracteres). */
export const encerrarFunilSchema = z.object({
  motivo: z.string().max(20).nullish(),
  nota: z.string().max(400).nullish(),
});

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
  /** Em "Sem próximo contato": ainda sem proposta enviada e no funil (F3.8). */
  podeSairDoFunil?: boolean;
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
  /**
   * F3.204: cliente excluído ou arquivado a pedido do titular e a proposta aberta ou aceita sem contrato.
   * Fica como registro: sai das listas de trabalho e não se envia, responde nem edita. Vem do banco a
   * partir da 1144; antes dela, falta (o Portal lê `?? false`).
   */
  encerrada?: boolean;
  vencida: boolean;
  condicoes: Condicao[];
  retorno: { em: string; vencido: boolean } | null;
  /** Desde a 1144, para "Enviada em 14/11" e "Aceita em 12/11" na lista. */
  enviadaEm?: string | null;
  respondidaEm?: string | null;
  criadaEm: string;
}
export interface ListaPropostas {
  propostas: PropostaLinha[];
  /** `encerradas` vem a partir da 1144 (F3.204). */
  contagem: { andamento: number; contrato: number; recusadas: number; encerradas?: number };
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
  /** A situação do cliente (F3.181): excluído ou arquivado a pedido, a proposta não vira contrato. */
  clienteSituacao: SituacaoCliente;
  /** Quando o cliente foi excluído ou arquivado a pedido; null nos outros. */
  clienteSaiuEm: string | null;
  historico: EventoProposta[];
}

export interface Funil {
  de: string;
  ate: string;
  primeiros: number;
  comProposta: number;
  contratos: number;
  semProposta: { naoPegou: number; naoVoltou: number; emAtendimento: number };
  /** `encerradas` (F3.204, a partir da 1144): o arquivado a pedido sem contrato e com a última proposta aberta. */
  depoisProposta: { andamento: number; encerradas?: number; recusadas: { motivo: MotivoRecusa; n: number }[] };
  agora: {
    primeiro: { clienteId: string; nome: string; detalhe: string; rascunho: boolean; semRetorno: boolean }[];
    enviada: AgoraProposta[];
    negociacao: AgoraProposta[];
    aceita: AgoraProposta[];
    /** Os 3 contratos mais recentes que vieram de proposta (área Contratos). */
    contrato?: { id: string; numero: string; clienteId: string; nome: string; em: string; situacao: "ELABORACAO" | "ATIVO" | "ENCERRADO"; valorCerto: number }[];
  };
  /** Quem saiu do funil sem proposta no período, mais recente primeiro (até 50) (F3.8). */
  sairam?: { total: number; itens: (SaidaFunil & { clienteId: string; nome: string })[] };
}

/** Uma marcação de "Encerrar sem proposta" (F3.8). */
export interface SaidaFunil {
  id: string;
  motivo: MotivoForaFunil;
  nota?: string;
  marcadoPor: PessoaRef;
  marcadoEm: string;
  voltouPor?: PessoaRef;
  voltouEm?: string;
}

/** O cliente no funil, para a ficha (F3.8). */
export interface ClienteFunil {
  situacao: "PRIMEIRO" | "FORA" | "PROPOSTA" | "CONTRATO";
  podeEncerrar: boolean;
  rascunho: boolean;
  saida: SaidaFunil | null;
  eventos: SaidaFunil[];
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
