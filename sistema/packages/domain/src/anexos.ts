// Anexos do Portal fora do caso (F3.12, F3.22): o contrato assinado (CH-01) e a nota, guia,
// boleto ou comprovante de cada conta e de cada recebimento (FI-18). As regras estão no banco
// (0520_portal_anexos.sql); aqui o esquema só confere a forma do pedido. O envio é o mesmo dos
// documentos do caso: registrar, mandar o arquivo direto ao Storage e concluir.

import { z } from "zod";
import type { PessoaRef } from "./clientes.ts";
import { TAMANHO_MAXIMO_DOCUMENTO, TIPOS_DOCUMENTO, type TipoDocumento } from "./console.ts";

export const DONOS_ANEXO = ["CONTRATO", "CONTA", "RECEBIMENTO", "REQUISICAO"] as const;
export type DonoAnexo = (typeof DONOS_ANEXO)[number];

/**
 * O que é o arquivo. O do contrato é sempre o assinado; o do recebimento, o comprovante; o do RPV
 * ou precatório a caminho (F3.88), o ofício requisitório.
 */
export const CATEGORIAS_ANEXO = {
  CONTRATO_ASSINADO: "Contrato assinado",
  NOTA_FISCAL: "Nota fiscal",
  GUIA: "Guia",
  BOLETO: "Boleto",
  COMPROVANTE: "Comprovante",
  OFICIO_REQUISITORIO: "Ofício requisitório",
  // Os assinados dos documentos gerados (F3.16): ligados à versão com documentoId.
  PROCURACAO_ASSINADA: "Procuração assinada",
  DECLARACAO_ASSINADA: "Declaração assinada",
  DOCUMENTO_ASSINADO: "Documento assinado",
} as const;
export type CategoriaAnexo = keyof typeof CATEGORIAS_ANEXO;

/** O que se escolhe ao anexar à conta a pagar. */
export const CATEGORIAS_ANEXO_CONTA = ["NOTA_FISCAL", "GUIA", "BOLETO", "COMPROVANTE"] as const satisfies readonly CategoriaAnexo[];

const UUID = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

export const iniciarAnexoSchema = z.object({
  dono: z.enum(DONOS_ANEXO),
  donoId: UUID,
  categoria: z.enum(Object.keys(CATEGORIAS_ANEXO) as [CategoriaAnexo, ...CategoriaAnexo[]]).nullish(),
  nome: z.string().trim().min(1).max(200).refine((n) => !/[/\\]/.test(n), { message: "Nome de arquivo inválido" }),
  tipo: z.enum(Object.keys(TIPOS_DOCUMENTO) as [TipoDocumento, ...TipoDocumento[]]),
  tamanho: z.number().int().min(1).max(TAMANHO_MAXIMO_DOCUMENTO),
  /** F3.16: a versão do documento gerado que este arquivo assinado traz; a categoria sai dela. */
  documentoId: UUID.nullish(),
  /** F3.16: a data em que foi assinado (AAAA-MM-DD), não depois de hoje. */
  assinadoEm: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
});
export type IniciarAnexo = z.infer<typeof iniciarAnexoSchema>;

export const buscarAnexosSchema = z.object({
  contas: z.array(UUID).max(500).default([]),
  pagamentos: z.array(UUID).max(500).default([]),
});

export interface Anexo {
  id: string;
  categoria: CategoriaAnexo;
  nome: string;
  tipo: TipoDocumento;
  tamanho: number;
  /** O contrato, a conta, o recebimento ou a requisição a caminho. */
  donoId: string;
  /** F3.16: a versão do documento gerado, quando é um assinado. */
  documentoId?: string | null;
  assinadoEm?: string | null;
  enviadoPor: PessoaRef;
  enviadoEm: string;
}

export interface ListaAnexos {
  anexos: Anexo[];
}

/** Para a exportação do mês: as despesas pagas sem nota e os anexos dos lançamentos. */
export interface AnexosDaExportacao {
  mes: string;
  semNota: { id: string; descricao: string; fornecedor: string | null; dia: string; valor: number }[];
  anexos: Anexo[];
}

/** O texto da coluna "Nota ou guia" de A pagar e da conta anexada. */
export function textoAnexado(c: CategoriaAnexo): string {
  return c === "NOTA_FISCAL" ? "Nota anexada" : c === "GUIA" ? "Guia anexada" : c === "BOLETO" ? "Boleto anexado" : c === "COMPROVANTE" ? "Comprovante anexado" : c === "OFICIO_REQUISITORIO" ? "Ofício anexado" : "Contrato assinado";
}
