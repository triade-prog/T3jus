// Documentos para começar (AP-08, EX-18), desenho aprovado em
// docs/design/aprovadas/portal-jornada-fechamento (grupo 9): os documentos pessoais na ficha do
// cliente e a lista por área. As regras estão no banco (0853); aqui o esquema confere a forma.

import { z } from "zod";
import type { PessoaRef } from "./clientes.ts";
import { TAMANHO_MAXIMO_DOCUMENTO, TIPOS_DOCUMENTO, type TipoDocumento } from "./console.ts";
import type { AreaDireito } from "./juridico.ts";
import { MAX_FOTOS_ASSINADO } from "./pdf_fotos.ts";

/** Os tipos fixos e poucos (decisão 35). */
export const TIPOS_DOCUMENTO_PESSOAL = {
  RG_CPF: "RG e CPF",
  CNH: "CNH",
  COMPROVANTE_RESIDENCIA: "Comprovante de residência",
  CERTIDAO_CASAMENTO: "Certidão de casamento",
  CERTIDAO_NASCIMENTO: "Certidão de nascimento",
  CERTIDAO_OBITO: "Certidão de óbito",
  OUTRO: "Outro documento pessoal",
} as const;
export type TipoDocumentoPessoal = keyof typeof TIPOS_DOCUMENTO_PESSOAL;
const TIPOS = Object.keys(TIPOS_DOCUMENTO_PESSOAL) as [TipoDocumentoPessoal, ...TipoDocumentoPessoal[]];

/** As áreas que têm lista (Outra não tem). */
export const AREAS_COM_LISTA = ["PREVIDENCIARIO", "TRABALHISTA", "CIVEL", "CONSUMIDOR", "FAMILIA", "SAUDE", "TRIBUTARIO"] as const satisfies readonly AreaDireito[];
export type AreaComLista = (typeof AREAS_COM_LISTA)[number];

export interface DocumentoPessoal {
  id: string;
  tipo: TipoDocumentoPessoal;
  descricao: string | null;
  dataDocumento: string | null;
  nome: string;
  arquivoTipo: TipoDocumento;
  tamanho: number;
  fotos: number | null;
  enviadoPor: PessoaRef | null;
  enviadoEm: string;
  dias: number | null;
  vencido: boolean;
  anteriores: number;
}

export interface PedidoPessoalAberto {
  id: string;
  tipoPessoal: TipoDocumentoPessoal;
  descricao: string;
  pedidoEm: string;
  caso: { id: string; nome: string };
}

export interface DocumentosPessoais {
  hoje: string;
  validadeDias: number;
  podeAnexar: boolean;
  documentos: DocumentoPessoal[];
  pedidos: PedidoPessoalAberto[];
}

const idOpcional = z.string().uuid().nullish();

export const iniciarDocumentoPessoalSchema = z.object({
  tipo: z.enum(TIPOS),
  descricao: z.string().trim().max(160).nullish(),
  dataDocumento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  nome: z.string().trim().min(1).max(200).refine((n) => !/[/\\]/.test(n), { message: "Nome de arquivo inválido" }),
  arquivoTipo: z.enum(Object.keys(TIPOS_DOCUMENTO) as [TipoDocumento, ...TipoDocumento[]]),
  tamanho: z.number().int().min(1).max(TAMANHO_MAXIMO_DOCUMENTO),
  fotos: z.number().int().min(2).max(MAX_FOTOS_ASSINADO).nullish(),
  substitui: idOpcional,
  pedidoId: idOpcional,
});
export type IniciarDocumentoPessoal = z.infer<typeof iniciarDocumentoPessoalSchema>;

/** O nome que a equipe vê: a descrição, se houver, senão o tipo. */
export function nomeDoDocumentoPessoal(d: Pick<DocumentoPessoal, "tipo" | "descricao">): string {
  return d.descricao?.trim() || TIPOS_DOCUMENTO_PESSOAL[d.tipo];
}

/** Precisa de atenção: o comprovante com a data do papel além do prazo (decisão 36). */
export const precisaAtencao = (d: DocumentoPessoal) => d.vencido;

/**
 * O texto do "Pedir pelo WhatsApp" da ficha (pergunta 9): só abre a conversa, sem registrar
 * pedido. O pedido registrado, com lembrete, começa quando o caso abre.
 */
export function textoPedirDocumentosPessoais(contato: string, escritorio: string, cliente: string, documentos: string[]): string {
  const primeiro = contato.trim().split(/\s+/)[0] ?? "";
  const sobre = contato.trim() === cliente.trim() ? "" : ` de ${cliente.trim().split(/\s+/)[0]}`;
  const lista = documentos.length <= 1 ? (documentos[0] ?? "") : `${documentos.slice(0, -1).join(", ")} e ${documentos.at(-1)}`;
  return `Olá, ${primeiro}. Aqui é do escritório ${escritorio}. Para deixar os documentos${sobre} em dia, precisamos de: ${lista.toLowerCase()}. Pode mandar uma foto ou o arquivo por aqui mesmo. Se já mandou, agradecemos e pode desconsiderar esta mensagem.`;
}

// ------------------------------------------------------------------------- a lista por área

export interface DocumentoInicio {
  id: string;
  ordem: number;
  nome: string;
  comoPedir: string | null;
  pessoal: TipoDocumentoPessoal | null;
  seHouver: boolean;
  versao: number;
}

export interface SugestaoDocumentoInicio {
  nome: string;
  comoPedir: string | null;
  pessoal: TipoDocumentoPessoal | null;
  seHouver: boolean;
}

export interface DocumentosInicio {
  podeEditar: boolean;
  validadeDias: number;
  areas: { area: AreaComLista; itens: DocumentoInicio[]; sugestao: SugestaoDocumentoInicio[] }[];
}

export const documentoInicioSchema = z.object({
  area: z.enum(AREAS_COM_LISTA).optional(),
  nome: z.string().trim().min(3).max(80),
  comoPedir: z.string().trim().max(300).nullish(),
  pessoal: z.enum(TIPOS).nullish(),
  seHouver: z.boolean(),
  versao: z.number().int().min(1).optional(),
});
export const tirarDocumentoInicioSchema = z.object({ versao: z.number().int().min(1) });
export const sugestaoDocumentosInicioSchema = z.object({ area: z.enum(AREAS_COM_LISTA) });
export const moverDocumentoInicioSchema = z.object({ direcao: z.enum(["SOBE", "DESCE"]) });
