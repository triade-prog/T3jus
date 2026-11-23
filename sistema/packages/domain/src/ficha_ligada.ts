// Ficha do cliente ligada a propostas, contratos e casos (F3.110, F3.111; AP-01, AP-05, IN-01,
// CH-10, EX-01). Tela aprovada em docs/design/aprovadas/portal-ficha-cliente-ligada. O passo é
// calculado no banco (0740_ficha_cliente_ligada.sql) com as áreas da sessão.

import { z } from "zod";
import { documentosDoCasoSchema } from "./documentos_pessoais.ts";
import type { PessoaRef } from "./clientes.ts";
import type { ContratoLinha } from "./contratos.ts";
import type { PropostaLinha } from "./comercial.ts";
import type { AreaDireito, LinhaCaso, MensagemAviso, PapelCaso } from "./juridico.ts";
import type { EsperaAcerto } from "./financeiro.ts";

export type TipoPassoCliente =
  | "SEM_PROPOSTA" | "PROPOSTA_RASCUNHO" | "PROPOSTA_ANDAMENTO" | "PROPOSTA_ACEITA"
  | "CONTRATO_ELABORACAO" | "CONTRATO_SEM_CASO" | "CASO"
  // Jornada do cliente (0851; EX-16, CH-13): o fechamento, o contrato sem caso e o fim.
  | "FECHAMENTO" | "CONTRATO_ATIVO" | "ATENDIDO"
  // Documentos para começar (0854; EX-18): o caso aberto com documento faltando.
  | "DOCUMENTOS";
export type AreaPassoCliente = "COMERCIAL" | "CONTRATOS" | "JURIDICO" | "FINANCEIRO";

/** Um passo do fechamento do caso (decisões 14 a 17). Os valores só vêm para quem tem Financeiro. */
export interface PassoFechamento {
  tipo: "EXITO" | "REPASSE" | "FINANCEIRO" | "CONTRATO";
  area: "FINANCEIRO" | "CONTRATOS";
  feito: boolean;
  em: string | null;
  por?: PessoaRef | null;
  valor?: number | null;
  percentual?: number | null;
  naoCobrado?: boolean;
  prazo?: string | null;
  levantamentoId?: string | null;
  entrou?: { tipo: string; valor: number; em: string } | null;
  pendentes?: string[] | null;
  contratos?: { id: string; numero: string }[];
  comFinanceiro?: boolean;
  /** F3.132 (decisão 4): sem levantamento, o contrato e o caso de "Ver o acerto" (#t-fecha-<caso>). */
  contratoId?: string | null;
  casoId?: string | null;
  /** Pergunta 1: sem atraso, o que o fechamento espera. */
  aVencer?: EsperaAcerto | null;
  comLevantamento?: boolean;
}

/** O item do passo. Só vem para quem tem a área dele. */
export interface ItemPasso {
  /** O item do passo; no fechamento, o id fica no caso. */
  id?: string;
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
  /** CONTRATO_ELABORACAO: o caso que já existe e a que o contrato vai juntar (decisão 13). */
  juntarA?: string | null;
  /** CONTRATO_ATIVO: a próxima parcela (decisão 27). */
  proximo?: { vencimento: string; descricao: string; valor: number | null } | null;
  /** FECHAMENTO e ATENDIDO: o caso (sem nome para quem não tem Jurídico), os passos e o fim. */
  caso?: { id: string | null; nome: string | null; resultado: "GANHO" | "PERDA" | "ACORDO" | null; encerradoEm: string | null } | null;
  passos?: PassoFechamento[];
  fim?: string | null;
  /** DOCUMENTOS: quantos dos de começar chegaram, o que falta e o aviso com a lista (decisão 46). */
  chegaram?: number;
  total?: number;
  faltam?: { id: string; descricao: string; tipoPessoal: string | null }[];
  aviso?: MensagemAviso | null;
}

export interface PassoCliente {
  tipo: TipoPassoCliente;
  area: AreaPassoCliente;
  pode: boolean;
  /** Quem tem a área do passo, quando a pessoa não pode. */
  quemPode: string[] | null;
  /** No fechamento: quem tem a área do próximo passo, mesmo para quem pode (decisão 15). */
  quemFaz?: string[] | null;
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
  documentos: documentosDoCasoSchema.nullish(),
});
export type CasoDoContrato = z.input<typeof casoDoContratoSchema>;

// Toda assinatura passa pela pergunta do caso (CH-11, F3.125): sem o caso, a rota recusa.
export const assinaturaComCasoSchema = z.object({
  versao: z.number().int().min(1),
  assinadoEm: z.string().max(20).nullish(),
  caso: casoDoContratoSchema,
});
export const abrirCasoDoContratoSchema = z.object({ caso: casoDoContratoSchema });

export interface CasoLigado { id?: string; nome?: string; responsavel: PessoaRef | null; etapa?: string | null; situacao?: string; existe?: boolean }

export interface OpcoesCasoContrato {
  contrato: { id: string; numero: string; objeto: string; situacao: string; versao: number; criadoEm: string; area: AreaDireito | null;
              semCaso?: boolean; cliente: { id: string; nome: string } };
  casoLigado: CasoLigado | null;
  sugestao: { nome: string; area: AreaDireito; responsavelId: string | null; papel: PapelCaso };
  responsavelSugerido: PessoaRef | null;
  /** Tem a área Jurídico: escolhe nome, área, responsável e papel, e pode juntar a um caso. */
  escolhe: boolean;
  responsaveis: PessoaRef[] | null;
  casos: { id: string; nome: string; clientes: number }[] | null;
  /** CH-12: "JUNTAR" quando o cliente está num caso em andamento sem contrato. */
  modoSugerido?: "NOVO" | "JUNTAR";
  /** Os casos em andamento em que o cliente está sem contrato (só para quem escolhe). */
  casosDoCliente?: CasoDoClienteSemContrato[] | null;
}

export interface CasoDoClienteSemContrato {
  id: string; nome: string; papel: PapelCaso; etapa: string | null; responsavel: PessoaRef | null; abertoPor: PessoaRef | null; abertoEm: string;
}

/** Os contratos assinados que ficaram sem caso (CH-11, F3.125). */
export interface ContratoSemCaso {
  id: string; numero: string; objeto: string; assinadoEm: string | null; area: AreaDireito | null;
  responsavel: PessoaRef | null; cliente: { id: string; nome: string };
}
export interface ContratosSemCaso { podeAbrir: boolean; quemAbre: string[] | null; contratos: ContratoSemCaso[] }

export interface AssinaturaComCaso { id: string; versao: number; recebimentos: number; casoId: string | null; podeVerCaso: boolean }
