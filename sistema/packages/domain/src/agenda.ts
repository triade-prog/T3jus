// Agenda do Portal (EX-06, EX-11, PD-07). Os mesmos tipos estão no banco
// (0180_portal_agenda.sql). O servidor confere cada campo e devolve todos os que estão
// errados de uma vez; aqui o esquema só confere a forma do pedido.

import { z } from "zod";

export const TIPOS_COMPROMISSO = {
  AUDIENCIA: "Audiência",
  CLIENTE: "Reunião com cliente",
  ASSINATURA: "Assinatura",
  INTERNO: "Interno",
  OUTRO: "Outro",
} as const;
export type TipoCompromisso = keyof typeof TIPOS_COMPROMISSO;

/** Nome curto do tipo, como aparece na agenda e na legenda ("11:00 · Audiência"). */
export const TIPOS_COMPROMISSO_CURTO: Record<Exclude<TipoCompromisso, "OUTRO">, string> = {
  AUDIENCIA: "Audiência",
  CLIENTE: "Cliente",
  ASSINATURA: "Assinatura",
  INTERNO: "Interno",
};

export const MODALIDADES = { PRESENCIAL: "Presencial", VIRTUAL: "Virtual" } as const;
export type Modalidade = keyof typeof MODALIDADES;

const uuid = z.string().uuid();
const texto = (max: number) => z.string().max(max).nullish();

export const dadosCompromissoSchema = z.object({
  tipo: z.string().max(20),
  tipoEscrito: texto(80),
  titulo: z.string().max(400),
  inicio: z.string().max(40),
  fim: z.string().max(40),
  modalidade: z.string().max(20),
  local: texto(400),
  linkSala: texto(2000),
  clienteId: uuid.nullish(),
  responsavelId: z.string().max(40),
  tambemVai: z.array(uuid).max(20).default([]),
  lembrete: z.boolean().default(false),
  observacoes: texto(2000),
});
export type DadosCompromisso = z.input<typeof dadosCompromissoSchema>;

export const editarCompromissoSchema = dadosCompromissoSchema.extend({
  versao: z.number().int().min(1),
  motivo: texto(600),
});

export const cancelarCompromissoSchema = z.object({
  versao: z.number().int().min(1),
  motivo: z.string().trim().min(1).max(300),
  avisar: z.boolean().default(false),
});

const dia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const periodoAgendaSchema = z.object({ de: dia, ate: dia, pessoa: uuid.optional() });

export interface PessoaAgenda {
  id: string;
  nome: string;
}

export interface CompromissoLinha {
  id: string;
  tipo: TipoCompromisso;
  tipoEscrito: string | null;
  titulo: string;
  inicio: string;
  fim: string;
  modalidade: Modalidade;
  local: string | null;
  situacao: "MARCADO" | "CANCELADO";
  lembrete: boolean;
  responsavel: PessoaAgenda;
  tambemVai: PessoaAgenda[];
  cliente: { id: string; nome: string } | null;
}

export interface PrazoAgenda {
  id: string;
  titulo: string;
  processo: string;
  responsavel: PessoaAgenda;
  vence: string;
}

export interface Agenda {
  juridico: boolean;
  /** O escritório já marcou algum compromisso (em qualquer data). */
  algum: boolean;
  compromissos: CompromissoLinha[];
  feriados: { data: string; nome: string }[];
  /** Só para quem tem a área Jurídico (para quem não tem, vem nulo). */
  prazos: PrazoAgenda[] | null;
  tiposEscritos: string[];
}

export interface EventoCompromisso {
  em: string;
  acao: string;
  autor: string | null;
  dados: Record<string, unknown>;
}

export interface FichaCompromisso extends CompromissoLinha {
  linkSala: string | null;
  observacoes: string | null;
  versao: number;
  criadoEm: string;
  criadoPor: PessoaAgenda | null;
  contatoCliente: { id: string; nome: string; papel?: string | null; telefone?: string | null; email?: string | null } | null;
  cancelamento: { em: string; por: PessoaAgenda | null; motivo: string; avisar: boolean | null } | null;
  historico: EventoCompromisso[];
}
