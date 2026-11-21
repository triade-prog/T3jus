// O sino de avisos (F3.57; PD-07) e o pedido de "não receber avisos" na ficha (F3.63; PA-03).
// Telas aprovadas em docs/design/aprovadas/portal-sem-avisos-sino.
import { z } from "zod";

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
  | "PETICAO_REVISAR" | "PETICAO_DECIDIDA" | "PETICAO_PASSADA";

export interface AvisoSino {
  id: string;
  tipo: TipoAvisoSino;
  dados: {
    conversa?: string; contato?: string; quem?: string; trecho?: string; motivo?: string; recado?: string;
    automacao?: string; texto?: string; modelo?: string; prazo?: string; cliente?: string; vence?: string; processo?: string;
    /** Petições (EX-09). */
    caso?: string; versao?: number; decisao?: "APROVADA" | "AJUSTE" | "REPROVADA"; para?: string; passadaPor?: string;
  };
  origem: "conversas" | "automacoes" | "prazos" | "peticoes";
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
