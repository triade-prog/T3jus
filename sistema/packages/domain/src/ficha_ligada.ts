// Ficha do cliente ligada a propostas, contratos e casos (F3.110, F3.111; AP-01, AP-05, IN-01,
// CH-10, EX-01). Tela aprovada em docs/design/aprovadas/portal-ficha-cliente-ligada. O passo é
// calculado no banco (0740_ficha_cliente_ligada.sql) com as áreas da sessão.

import { z } from "zod";
import type { PessoaRef } from "./clientes.ts";
import type { ContratoLinha } from "./contratos.ts";
import type { PropostaLinha } from "./comercial.ts";
import type { AreaDireito, LinhaCaso, PapelCaso } from "./juridico.ts";

export type TipoPassoCliente =
  | "SEM_PROPOSTA" | "PROPOSTA_RASCUNHO" | "PROPOSTA_ANDAMENTO" | "PROPOSTA_ACEITA"
  | "CONTRATO_ELABORACAO" | "CONTRATO_SEM_CASO" | "CASO";
export type AreaPassoCliente = "COMERCIAL" | "CONTRATOS" | "JURIDICO";

/** O item do passo. Só vem para quem tem a área dele. */
export interface ItemPasso {
  id: string;
  numero?: string;
  nome?: string;
  servico?: string;
  objeto?: string;
  situacao?: string;
  versao?: number;
  criadaEm?: string;
  criadoEm?: string;
  enviadaEm?: string | null;
  validaAte?: string | null;
  aceitaEm?: string | null;
  assinadoEm?: string | null;
  retorno?: { em: string; vencido: boolean; responsavel?: PessoaRef | null } | null;
  responsavel?: PessoaRef | null;
  etapa?: { ordem: number; nome: string } | null;
  etapas?: number;
}

export interface PassoCliente {
  tipo: TipoPassoCliente;
  area: AreaPassoCliente;
  pode: boolean;
  /** Quem tem a área do passo, quando a pessoa não pode. */
  quemPode: string[] | null;
  item: ItemPasso | null;
  /** Sem Jurídico: com quem está o caso (decisão 19). */
  casoResponsavel?: PessoaRef | null;
}

export interface ContagensCliente { propostas?: number; contratos?: number; casos?: number }
export interface NoEscritorio {
  proposta?: { id: string; numero: string; situacao: string; servico: string; em: string };
  contrato?: { id: string; numero: string; situacao: string; objeto: string; assinadoEm: string | null };
  caso?: { id: string; nome: string; situacao: string; etapa: string | null };
}

export type PropostaDoCliente = PropostaLinha & {
  criadoPor: PessoaRef | null; enviadaEm: string | null; validaAte: string | null; respondidaEm: string | null; temContrato: boolean;
};
export type ContratoDoCliente = ContratoLinha & {
  assinadoEm: string | null; semCaso: boolean; area: AreaDireito | null;
  proposta: { id: string; numero: string } | null; caso: { id: string; nome: string } | null;
};
export type CasoDoCliente = LinhaCaso & { papel: PapelCaso; etapas: number; contrato: { id: string; numero: string } | null };

export const ABAS_ITENS_CLIENTE = { propostas: "PROPOSTAS", contratos: "CONTRATOS", casos: "CASOS" } as const;
export type AbaItensCliente = keyof typeof ABAS_ITENS_CLIENTE;

// ------------------------------------------------------------------ A assinatura abre o caso (CH-10)

export const MODOS_CASO = ["NOVO", "JUNTAR", "SEM"] as const;
export type ModoCaso = (typeof MODOS_CASO)[number];

export const casoDoContratoSchema = z.object({
  modo: z.enum(MODOS_CASO),
  nome: z.string().max(200).nullish(),
  area: z.string().max(40).nullish(),
  responsavelId: z.string().max(40).nullish(),
  papel: z.string().max(20).nullish(),
  casoId: z.string().max(40).nullish(),
});
export type CasoDoContrato = z.input<typeof casoDoContratoSchema>;

export const assinaturaComCasoSchema = z.object({
  versao: z.number().int().min(1),
  assinadoEm: z.string().max(20).nullish(),
  caso: casoDoContratoSchema.nullish(),
});
export const abrirCasoDoContratoSchema = z.object({ caso: casoDoContratoSchema });

export interface CasoLigado { id?: string; nome?: string; responsavel: PessoaRef | null; etapa?: string | null; situacao?: string; existe?: boolean }

export interface OpcoesCasoContrato {
  contrato: { id: string; numero: string; objeto: string; situacao: string; versao: number; criadoEm: string; area: AreaDireito | null;
              cliente: { id: string; nome: string } };
  casoLigado: CasoLigado | null;
  sugestao: { nome: string; area: AreaDireito; responsavelId: string | null; papel: PapelCaso };
  responsavelSugerido: PessoaRef | null;
  /** Tem a área Jurídico: escolhe nome, área, responsável e papel, e pode juntar a um caso. */
  escolhe: boolean;
  responsaveis: PessoaRef[] | null;
  casos: { id: string; nome: string; clientes: number }[] | null;
}

export interface AssinaturaComCaso { id: string; versao: number; recebimentos: number; casoId: string | null; podeVerCaso: boolean }
