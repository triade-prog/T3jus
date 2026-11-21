// Escritório › WhatsApp e IA (PA-04). Os mesmos nomes estão no banco
// (0310_portal_whatsapp_ia.sql): só a sócia dona liga, muda e desliga; o token da Meta nunca
// chega aqui. Ficam os tipos, os textos e o esquema dos pedidos.

import { z } from "zod";
import type { PessoaRef } from "./clientes.ts";

export type SituacaoNumero = "EM_ANALISE" | "LIGADO" | "DESLIGADO";
export type Qualidade = "ALTA" | "MEDIA" | "BAIXA" | "SEM_NOTA";
export type EmpresaVerificada = "NAO_ENVIADA" | "EM_ANALISE" | "VERIFICADA" | "RECUSADA";
export type SituacaoAviso = "NAO_ENVIADO" | "EM_ANALISE" | "APROVADO" | "RECUSADO";
export type SituacaoIa = "DESLIGADA" | "LIGADA" | "PAUSADA";

export const QUALIDADES: Record<Qualidade, string> = { ALTA: "Alta", MEDIA: "Média", BAIXA: "Baixa", SEM_NOTA: "Ainda sem nota" };

/** Os 10 avisos prontos, na ordem da tela (o banco usa as mesmas chaves). */
export const AVISOS_WHATSAPP = {
  PAGAMENTO_RECEBIDO: { nome: "Pagamento recebido", quando: "Financeiro · quando o recebimento é registrado", icone: "moeda" },
  PARCELA_VAI_VENCER: { nome: "Parcela vai vencer", quando: "Financeiro · 3 dias antes do vencimento", icone: "moeda" },
  PARCELA_ATRASO: { nome: "Parcela em atraso", quando: "Financeiro · 1, 8 e 15 dias depois", icone: "alerta" },
  ETAPA_CASO: { nome: "Etapa do caso", quando: "Jurídico · um texto por etapa", icone: "balanca" },
  LEMBRETE_AUDIENCIA: { nome: "Lembrete de audiência", quando: "Jurídico · 1 dia e 2 horas antes", icone: "relogio" },
  COMPROMISSO_CANCELADO: { nome: "Compromisso cancelado", quando: "Agenda · quando a equipe cancela e marca “Avisar”", icone: "relogio" },
  PRESTACAO_CONTAS: { nome: "Prestação de contas", quando: "Financeiro · quando o repasse é registrado", icone: "carteira" },
  DOCUMENTO_PEDIDO: { nome: "Pedido de documento", quando: "Jurídico · quando a equipe pede de novo", icone: "balanca" },
  RECIBO_PAGAMENTO: { nome: "Recibo de pagamento", quando: "Financeiro · com o PDF, ao registrar o recebimento", icone: "moeda" },
  BASE_DO_MES: { nome: "Pedido da base do mês", quando: "Contratos · no dia do lembrete, com a opção marcada", icone: "moeda" },
} as const;
export type ChaveAviso = keyof typeof AVISOS_WHATSAPP;

export const ASSUNTOS_IA = {
  ANDAMENTO_CASO: { nome: "Andamento do caso", de: "Do texto da etapa escrito pelo Jurídico. Nunca o processo inteiro.", extra: ", em linguagem simples" },
  COMPROMISSOS: { nome: "Compromissos", de: "Audiência, reunião e perícia da Agenda, com data, hora e local.", extra: "" },
  PARCELAS: { nome: "Parcelas e segunda via", de: "Valor e vencimento, do Financeiro. Pedido de segunda via passa para uma pessoa.", extra: "" },
  DOCUMENTOS: { nome: "Documentos pedidos", de: "O que falta mandar e se já chegou.", extra: "" },
  ENDERECO_HORARIO: { nome: "Endereço e horário", de: "Das respostas do escritório.", extra: "" },
  ARQUIVOS: { nome: "Receber arquivos", de: "Guarda na conversa e passa para alguém conferir.", extra: "" },
} as const;
export type AssuntoIa = keyof typeof ASSUNTOS_IA;

export const TONS_IA = {
  FORMAL: { nome: "Formal", ex: "“Prezada Sra. Antônia”" },
  CORDIAL: { nome: "Cordial", ex: "Recomendado. “Bom dia, Antônia”" },
  PROXIMO: { nome: "Próximo", ex: "“Oi, Antônia!”" },
} as const;
export type TomIa = keyof typeof TONS_IA;

export const DIAS_SEMANA = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"] as const;

export interface NumeroWhatsapp {
  versao: number;
  situacao: SituacaoNumero;
  numero: string;
  nomeExibicao: string | null;
  nomeSituacao: "EM_ANALISE" | "APROVADO" | "RECUSADO";
  qualidade: Qualidade;
  limiteDia: number | null;
  usadasHoje: number;
  empresaVerificada: EmpresaVerificada;
  usaAppCelular: boolean;
  ligadoEm: string | null;
  ligadoPor: PessoaRef | null;
  desligadoEm: string | null;
  desligadoPor: PessoaRef | null;
  desligadoMotivo: string | null;
  temConta: boolean;
  /** Só para a sócia dona. */
  avisosEntreguesMes: number | null;
}

export interface RascunhoLigacao {
  versao: number;
  passo: number;
  telefone: string | null;
  receberCodigo: "SMS" | "VOZ";
  usaAppCelular: boolean;
  confirmouNumero: boolean;
  atualizadoEm: string;
  atualizadoPor: PessoaRef | null;
}

export interface AvisoWhatsapp {
  chave: ChaveAviso;
  versao: number;
  situacao: SituacaoAviso;
  situacaoEm: string | null;
  texto: string;
  motivoSimples: string | null;
  sugestaoIa: string | null;
}

export interface EventoWhatsapp {
  tipo: "LIGADO" | "NOME" | "QUALIDADE" | "LIMITE" | "VERIFICACAO" | "AVISO" | "DESLIGADO";
  detalhe: Record<string, unknown>;
  pessoa: PessoaRef | null;
  em: string;
}

export interface PaginaWhatsapp {
  dono: boolean;
  quemCuida: PessoaRef | null;
  escritorio: { nome: string; cnpj: string | null };
  numero: NumeroWhatsapp | null;
  rascunho: RascunhoLigacao | null;
  avisos: AvisoWhatsapp[];
  historico: EventoWhatsapp[];
  ia: { situacao: SituacaoIa };
}

export interface ConfigIa {
  nome: string;
  apresentacao: string;
  tom: TomIa;
  assuntos: AssuntoIa[];
  palavras: string[];
  dias: number[];
  horaInicio: string;
  horaFim: string;
  msgForaHorario: string;
  telefoneUrgencia: string | null;
}

export interface RespostaIa {
  id: string;
  versao: number;
  pergunta: string;
  resposta: string;
  situacao: "SUGERIDA" | "PUBLICADA";
  escritaPor: PessoaRef | null;
  escritaEm: string;
  publicadaPor: PessoaRef | null;
  publicadaEm: string | null;
}

export interface PaginaIa {
  dono: boolean;
  quemCuida: PessoaRef | null;
  comercial: PessoaRef | null;
  whatsapp: { situacao: SituacaoNumero | "NAO_LIGADO"; numero: string | null };
  versao: number;
  situacao: SituacaoIa;
  config: ConfigIa;
  ligadaEm: string | null;
  ligadaPor: PessoaRef | null;
  pausadaEm: string | null;
  pausadaPor: PessoaRef | null;
  testadaEm: string | null;
  testadaComo: string | null;
  respostas: RespostaIa[];
  naoSoube: { id: string; texto: string; em: string; conversa: { id: string; nome: string } }[];
  desdeQueLigou: { conversas: number; resolvidasIa: number; passadas: number } | null;
  historico: { numero: number; oQueMudou: string; pessoa: PessoaRef | null; em: string }[];
}

const e164 = z.string().regex(/^\+[1-9][0-9]{7,14}$/);

/** "(11) 97405-2210" vira "+5511974052210"; com +, fica como veio. */
export function telefoneE164(texto: string): string {
  const t = texto.trim();
  if (t.startsWith("+")) return "+" + t.slice(1).replace(/\D/g, "");
  const d = t.replace(/\D/g, "").replace(/^0+/, "");
  return d.startsWith("55") && d.length >= 12 ? "+" + d : "+55" + d;
}

export const rascunhoLigacaoSchema = z.object({
  passo: z.number().int().min(1).max(5),
  telefone: e164.nullish(),
  receberCodigo: z.enum(["SMS", "VOZ"]).optional(),
  usaAppCelular: z.boolean().optional(),
  confirmouNumero: z.boolean().optional(),
});

export const conferirNumeroSchema = z.object({
  telefone: z.string().max(20),
  receberCodigo: z.enum(["SMS", "VOZ"]),
  usaAppCelular: z.boolean().default(false),
  confirmouNumero: z.boolean().default(false),
});

export const desligarWhatsappSchema = z.object({
  versao: z.number().int().positive(),
  motivo: z.string().max(600),
  entendi: z.boolean(),
});

export const ajustarAvisoSchema = z.object({
  versao: z.number().int().positive(),
  texto: z.string().max(1024),
});

export const salvarIaSchema = z.object({
  versao: z.number().int().positive(),
  nome: z.string().max(80).optional(),
  apresentacao: z.string().max(300).optional(),
  tom: z.enum(["FORMAL", "CORDIAL", "PROXIMO"]).optional(),
  assuntos: z.array(z.enum(["ANDAMENTO_CASO", "COMPROMISSOS", "PARCELAS", "DOCUMENTOS", "ENDERECO_HORARIO", "ARQUIVOS"])).optional(),
  palavras: z.array(z.string().max(60)).max(40).optional(),
  dias: z.array(z.number().int().min(1).max(7)).max(7).optional(),
  horaInicio: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  horaFim: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  msgForaHorario: z.string().max(400).optional(),
  telefoneUrgencia: e164.nullish(),
});

export const ligarIaSchema = z.object({ versao: z.number().int().positive(), revisou: z.boolean() });
export const pausarIaSchema = z.object({ versao: z.number().int().positive() });

export const respostaIaSchema = z.object({
  id: z.string().uuid().optional(),
  versao: z.number().int().positive().optional(),
  pergunta: z.string().max(120),
  resposta: z.string().max(1000),
  perguntaId: z.string().uuid().optional(),
});

export const situacaoRespostaSchema = z.object({ versao: z.number().int().positive(), situacao: z.enum(["PUBLICADA", "ARQUIVADA"]) });

/** A regra da Meta: o texto não começa nem termina com um campo entre chaves. */
export function textoAvisoValido(texto: string): boolean {
  const t = texto.trim();
  return !/^\{/.test(t) && !/\}[.!?]?$/.test(t);
}
