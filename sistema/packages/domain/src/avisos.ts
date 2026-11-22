// O sino de avisos (F3.57; PD-07) e o pedido de "não receber avisos" na ficha (F3.63; PA-03).
// Telas aprovadas em docs/design/aprovadas/portal-sem-avisos-sino.
import { z } from "zod";
import type { Condicao } from "./honorarios.ts";

// ------------------------------------------------------------------ Não receber avisos

export type CanalSemAvisos = "WHATSAPP" | "TELEFONE" | "PRESENCIAL" | "EMAIL";
export type QuemPediuSemAvisos = "CLIENTE" | "CONTATO" | "OUTRA";

export const CANAIS_SEM_AVISOS: { canal: CanalSemAvisos; nome: string; curto: string }[] = [
  { canal: "WHATSAPP", nome: "Pelo WhatsApp", curto: "pelo WhatsApp" },
  { canal: "TELEFONE", nome: "Por telefone", curto: "por telefone" },
  { canal: "PRESENCIAL", nome: "Pessoalmente", curto: "pessoalmente" },
  { canal: "EMAIL", nome: "Por e-mail", curto: "por e-mail" },
];

export interface PedidoSemAvisos {
  id: string;
  tipo: "TODOS" | "COBRANCA";
  origem: "CONVERSA" | "FICHA";
  canal: CanalSemAvisos | null;
  quem: QuemPediuSemAvisos | null;
  contatoId: string | null;
  quemPediu: string | null;
  quemPapel: string | null;
  pedidoEm: string;
  registradoEm: string;
  registradoPor: { id: string; nome: string } | null;
  /** A mensagem do cliente que originou o pedido, quando veio da conversa (F3.65). */
  mensagem?: { id: string; texto: string | null; em: string } | null;
  retirada: {
    em: string;
    por: { id: string; nome: string } | null;
    quem: QuemPediuSemAvisos | null;
    contatoId: string | null;
    quemPediu: string | null;
    quemPapel: string | null;
    canal: CanalSemAvisos | null;
  } | null;
}

/** GET /v1/escritorio/clientes/:id/sem-avisos */
export interface AvisosDoCliente {
  ativo: PedidoSemAvisos | null;
  historico: PedidoSemAvisos[];
  podeMudar: boolean;
}

const dia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const semAvisosSchema = z.object({
  tipo: z.enum(["TODOS", "COBRANCA"]).optional(),
  origem: z.enum(["CONVERSA", "FICHA"]).optional(),
  quem: z.enum(["CLIENTE", "CONTATO", "OUTRA"]).optional(),
  contatoId: z.string().uuid().optional(),
  quemPediu: z.string().max(120).optional(),
  canal: z.enum(["WHATSAPP", "TELEFONE", "PRESENCIAL", "EMAIL"]).optional(),
  pedidoEm: dia.optional(),
  retirar: z.boolean().optional(),
  /** Pela conversa (F3.65): a conversa e a mensagem do cliente que originou o pedido. */
  conversaId: z.string().uuid().optional(),
  mensagemId: z.string().uuid().optional(),
});

// ------------------------------------------------------------------ Sino

export type TipoAvisoSino =
  | "CONVERSA_IA" | "CONVERSA_ASSUMIDA" | "CONVERSA_PASSADA" | "AUTOMACAO_SUGESTAO"
  | "MODELO_APROVADO" | "MODELO_RECUSADO" | "PRAZO_2_DIAS"
  | "PETICAO_REVISAR" | "PETICAO_DECIDIDA" | "PETICAO_PASSADA"
  | "BASE_DO_MES" | "PEDIDO_CONTRATO" | "CONTRATO_GERADO"
  | "REPASSE_PASSADO" | "REPASSE_ATRASADO" | "REPASSE_PROXIMA_ACAO"
  | "EXPORTAR_CONTADOR" | "DOCUMENTO_CHEGOU" | "CARNE_DESATUALIZADO" | "PEDIDO_CHAVE_PIX"
  | "EXITO_VALOR_MUDOU" | "EXITO_NAO_COBRADO" | "CASO_ABERTO_NA_ASSINATURA" | "CLIENTE_FEZ_18";

export interface AvisoSino {
  id: string;
  tipo: TipoAvisoSino;
  dados: {
    conversa?: string; contato?: string; quem?: string; trecho?: string; motivo?: string; recado?: string;
    automacao?: string; texto?: string; modelo?: string; prazo?: string; cliente?: string; vence?: string; processo?: string;
    /** Petições (EX-09). */
    caso?: string; versao?: number; decisao?: "APROVADA" | "AJUSTE" | "REPROVADA"; para?: string; passadaPor?: string;
    /** A base do mês do percentual recorrente (CH-06): o número do contrato, o mês e o vencimento. */
    contrato?: string; sobre?: string; vencimento?: string; mes?: number; de?: number; recebimento?: string;
    /** Pedido de contrato do Comercial (IN-01): a proposta, o serviço, quando foi aceita e os honorários. */
    proposta?: string; servico?: string; aceita?: string; condicoes?: Condicao[];
    /** Repasses (F3.71, F3.46): quem saiu, se você entrou, o tipo do levantamento, a parte, o que fazer e o valor. */
    saiu?: string; entrou?: boolean; levantamento?: string; partes?: number; parte?: string; oQue?: string; valor?: number;
    /** Lembrete do dia 5 (F3.50): o mês a exportar e o contador. */
    referencia?: string; contador?: string;
    /** Arquivo do cliente com documento pedido (F3.86): o arquivo e quantos documentos faltam. */
    arquivo?: string; quantos?: number;
    /** Carnê desatualizado (F3.80): o carnê, quando foi gerado e se foi você quem gerou. */
    carne?: string; gerado?: string; gerou?: boolean; parcela?: string;
    /** O êxito conferido no Financeiro (F3.14): o valor calculado pelo contrato e a explicação de não cobrar. */
    calculado?: number; explicacao?: string;
    /** O cliente menor que fez 18 anos (F3.98): o dia (dd/mm/aaaa); "quem" é quem assinava, com o papel. */
    em?: string;
  };
  origem: "conversas" | "automacoes" | "prazos" | "peticoes" | "contratos" | "propostas" | "levantamentos" | "escritorios" | "casos" | "clientes";
  origemId: string;
  em: string;
  lido: boolean;
}

/** GET /v1/escritorio/avisos: os últimos 30 dias, os mais novos primeiro. */
export interface ListaAvisosSino {
  novos: number;
  total: number;
  itens: AvisoSino[];
  /** Só na resposta de "marcar todos". */
  marcados?: number;
}

export const avisosLidosSchema = z.object({ ate: z.string().datetime({ offset: true }) });
