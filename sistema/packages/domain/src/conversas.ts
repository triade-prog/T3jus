// Conversas do Portal, Mensagens (PD-07, EX-10, AP-02). Os mesmos nomes estão no banco
// (0300_portal_conversas_mensagens.sql): o banco decide quem responde e o que cada pessoa vê;
// aqui ficam os tipos, os textos e o esquema dos pedidos.

import { z } from "zod";
import type { PessoaRef } from "./clientes.ts";
import type { TipoCompromisso } from "./agenda.ts";
import type { PedidoSemAvisos } from "./avisos.ts";

export const FILTROS_CONVERSA = {
  PRECISA: "Precisa de alguém",
  EQUIPE: "Com a equipe",
  IA: "Com a IA",
  RESOLVIDAS: "Resolvidas hoje",
} as const;
export type FiltroConversa = keyof typeof FILTROS_CONVERSA;

export type SituacaoConversa = "IA" | "PRECISA" | "EQUIPE";

/** Por que a IA passou para uma pessoa (o selo da fila). */
export const MOTIVOS_CONVERSA = {
  PROPOSTA_ACORDO: "Proposta de acordo",
  DOCUMENTO_NOVO: "Documento novo",
  CLIENTE_NOVO: "Possível cliente novo",
  VALOR: "Pergunta sobre valor",
  ESTRATEGIA: "Pergunta sobre o caso",
  RECLAMACAO: "Reclamação",
  PEDIU_PESSOA: "Pediu para falar com alguém",
  OUTRO: "Precisa de alguém",
  URGENCIA: "Urgência",
  NAO_SOUBE: "A IA não soube",
  IA_DESLIGADA: "IA desligada",
  PALAVRA: "Palavra do escritório",
  REGRA_FIXA: "Barrada por regra fixa",
  SEM_AVISOS: "Pedido para não receber avisos",
} as const;
export type MotivoConversa = keyof typeof MOTIVOS_CONVERSA;

/** Por que a conversa veio para aquela pessoa (decisão 3 do desenho). */
export const RAZOES_RESPONSAVEL = {
  CASO: "cuida do caso",
  PROXIMO_CONTATO: "é responsável pelo próximo contato",
  COMERCIAL: "contato novo é da área Comercial",
  SOCIO_DONO: "é a sócia dona e ninguém mais responde por este contato",
  PASSADA: "a conversa foi passada para essa pessoa",
  ASSUMIU: "assumiu a conversa",
  SAIU_DA_EQUIPE: "recebeu as conversas de quem saiu da equipe",
  APP_CELULAR: "respondeu pelo app do WhatsApp no celular",
} as const;
export type RazaoResponsavel = keyof typeof RAZOES_RESPONSAVEL;

export type EnvioMensagem = "NA_FILA" | "ENVIADA" | "ENTREGUE" | "LIDA" | "FALHOU";
export const ENVIO_MENSAGEM: Record<EnvioMensagem, string> = {
  NA_FILA: "Na fila",
  ENVIADA: "Enviada",
  ENTREGUE: "Entregue",
  LIDA: "Lida",
  FALHOU: "Não entregue",
};

export interface AnexoMensagem {
  nome: string;
  tipo: "IMAGEM" | "DOCUMENTO" | "AUDIO" | "VIDEO";
  bytes?: string;
}

export interface LinhaConversa {
  id: string;
  nome: string;
  telefone: string;
  cliente: { id: string; nome: string } | null;
  quemEscreve: string | null;
  papel: string | null;
  situacao: SituacaoConversa;
  resolvidaEm: string | null;
  motivo: MotivoConversa | null;
  responsavel: PessoaRef | null;
  assumidaPor: PessoaRef | null;
  esperandoDesde: string | null;
  ultimaEm: string;
  ultima: { autor: string; texto: string | null; anexo: string | null } | null;
}

export interface ListaConversas {
  whatsapp: { situacao: "NAO_LIGADO" | "EM_ANALISE" | "LIGADO" | "DESLIGADO"; numero: string | null; quemLiga: PessoaRef | null };
  eu: string;
  contagem: { precisa: number; equipe: number; ia: number; resolvidas: number };
  hoje: { resolvidas: number; respondidas: number; avisos: number };
  conversas: LinhaConversa[];
}

export type EventoConversa = "IA_PASSOU" | "ASSUMIU" | "DEVOLVEU" | "PASSOU" | "IA_RESOLVEU" | "RESPONSAVEL_SAIU" | "APP_RESPONDEU"
  | "SEM_AVISOS_REGISTRADO" | "SEM_AVISOS_MUDADO" | "SEM_AVISOS_RETIRADO";

export interface MensagemConversa {
  id: string;
  autor: "CLIENTE" | "IA" | "EQUIPE" | "AVISO" | "SISTEMA" | "APP";
  pessoa?: PessoaRef;
  evento?: EventoConversa;
  para?: PessoaRef;
  de?: PessoaRef;
  razao?: RazaoResponsavel;
  motivo?: MotivoConversa;
  texto?: string;
  anexo?: AnexoMensagem;
  avisoTipo?: string;
  envio?: EnvioMensagem;
  envioMotivo?: string;
  /** Nas linhas da equipe do pedido de avisos (F3.65). */
  tipoAvisos?: "TODOS" | "COBRANCA";
  quemPediu?: string;
  em: string;
}

export interface Conversa extends LinhaConversa {
  versao: number;
  motivoTexto: string | null;
  responsavelRazao: RazaoResponsavel | null;
  assumidaEm: string | null;
  notaIa: string | null;
  eu: string;
  whatsappLigado: boolean;
  principal: boolean;
  juridico: boolean;
  /** O contato que escreve, na ficha do cliente. */
  contatoId?: string | null;
  /** Os avisos automáticos do cliente (F3.65); nulo para quem não está em Clientes. */
  avisos?: AvisosDaConversa | null;
  mensagens: MensagemConversa[];
  contexto: {
    proxContato: { em: string; oque: string; vencido: boolean; responsavel: PessoaRef } | null;
    caso: { id: string; nome: string; etapa: string; responsavel: PessoaRef } | null;
    compromisso: {
      id: string; titulo: string; tipo: TipoCompromisso; tipoEscrito: string | null; inicio: string;
      modalidade: "PRESENCIAL" | "VIRTUAL"; local: string | null;
    } | null;
  };
}

export const versaoConversaSchema = z.object({ versao: z.number().int().positive() });

export const devolverConversaSchema = versaoConversaSchema.extend({
  nota: z.string().max(1000).nullish(),
  registrarAtendimento: z.boolean().default(false),
});

export const passarConversaSchema = versaoConversaSchema.extend({
  pessoa: z.string().uuid(),
  recado: z.string().max(600).nullish(),
});

export const enviarConversaSchema = z.object({ texto: z.string().trim().min(1).max(4096) });

/** "Hélio Batista Corrêa" vira "HC"; um telefone vira "#". */
export function iniciaisConversa(nome: string): string {
  if (!/[A-Za-zÀ-ÿ]/.test(nome)) return "#";
  const p = nome.trim().split(/\s+/).filter((x) => !/^(d[aeo]s?|e)$/i.test(x));
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1]![0] : "")).toUpperCase();
}

/** Há quanto tempo: "há 42 min", "há 1 h", "há 2 dias". */
export function haQuanto(desde: string, agora: Date = new Date()): string {
  const min = Math.max(0, Math.floor((agora.getTime() - new Date(desde).getTime()) / 60000));
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "há 1 dia" : `há ${d} dias`;
}

/** "(11) 98114-3059" a partir de "+5511981143059"; outros países ficam como vieram. */
export function telefoneBr(e164: string): string {
  const m = /^\+55(\d{2})(\d{4,5})(\d{4})$/.exec(e164);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : e164;
}

/** O que a conversa traz para o atalho "Não receber avisos" (F3.65). */
export interface AvisosDaConversa {
  tipo: "PF" | "PJ";
  contatos: { id: string; nome: string; papel: string | null; principal: boolean }[];
  ativo: PedidoSemAvisos | null;
  podeMudar: boolean;
}

/** O contato da conversa, para "Cadastrar como cliente" e "Marcar primeira reunião" (AP-07). */
export interface ContatoDaConversa {
  id: string;
  nome: string | null;
  telefone: string;
  clienteId: string | null;
  responsavel: { id: string; nome: string } | null;
}
