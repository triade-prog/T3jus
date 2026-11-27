// Implantação assistida (CO-08, F1.42). As regras estão no banco (1180_implantacao_regras.sql);
// aqui ficam os nomes que as telas vão mostrar e o esquema do que a tela envia. Plano aprovado em
// docs/design/aprovadas/console-implantacao (Carol, 27/11/2026, DC14). O esquema só confere o
// formato: os limites (valor, prazo, textos) são conferidos no banco, que devolve os campos juntos.

import { z } from "zod";

export const CONDICOES_IMPLANTACAO = { ISENTA: "Isenta", COBRADA: "Cobrada" } as const;
export type CondicaoImplantacao = keyof typeof CONDICOES_IMPLANTACAO;

export const ESTADOS_IMPLANTACAO = { ABERTA: "Em andamento", CONCLUIDA: "Concluída", CANCELADA: "Cancelada" } as const;
export type EstadoImplantacao = keyof typeof ESTADOS_IMPLANTACAO;

/** A regra global, como `console_implantacao_regras` devolve. */
export interface RegraImplantacao {
  nome: string;
  descricao: string;
  valorCentavos: number;
  condicaoPadrao: CondicaoImplantacao;
  /** Só vale com ISENTA; nula = isenta sem data de fim. */
  isencaoAte: string | null;
  isencaoTexto: string;
  prazoDias: number;
  versao: number;
  alteradoEm: string | null;
  alteradoPor: string | null;
}

const dataIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** PUT /v1/cobranca/implantacao: a regra inteira, com a versão lida. */
export const implantacaoRegraSchema = z.object({
  versao: z.number().int().min(1),
  nome: z.string().max(120),
  descricao: z.string().max(240),
  valorCentavos: z.number().int(),
  condicaoPadrao: z.string().max(10),
  isencaoAte: dataIso.nullable(),
  isencaoTexto: z.string().max(120),
  prazoDias: z.number().int(),
});
export type ImplantacaoRegraEntrada = z.infer<typeof implantacaoRegraSchema>;

/** POST /v1/clientes/:id/implantacao/concluir (F1.43): as duas versões lidas e o resumo, que o sócio lê. */
export const implantacaoConcluirSchema = z.object({
  versaoCliente: z.number().int().min(1),
  versaoImplantacao: z.number().int().min(1),
  resumo: z.string().max(4000).nullable().optional(),
});
export type ImplantacaoConcluirEntrada = z.infer<typeof implantacaoConcluirSchema>;

/** PUT /v1/clientes/:id/implantacao/prazo (F1.43): só a Administração, com motivo. */
export const implantacaoPrazoSchema = z.object({
  versao: z.number().int().min(1),
  prazoAte: dataIso,
  motivo: z.string().max(600),
});
export type ImplantacaoPrazoEntrada = z.infer<typeof implantacaoPrazoSchema>;

/** Os tipos de item da fatura do escritório. IMPLANTACAO e ISENCAO entram só na 1ª fatura, com a
 * chave `implantacao_na_fatura` ligada (1182, F1.44). */
export const TIPOS_ITEM_FATURA = ["MENSALIDADE", "PESSOA_A_MAIS", "DESCONTO", "IMPLANTACAO", "ISENCAO"] as const;
export type TipoItemFatura = (typeof TIPOS_ITEM_FATURA)[number];

/** O bloco `implantacao` de `console_assinatura` e de `portal_plano_faturas` (1182). Nulo sem
 * implantação. `valorCentavos` só para quem vê a cobrança (Administração e Financeiro; o sócio dono). */
export interface ImplantacaoNaCobranca {
  id: string;
  numero: number;
  estado: EstadoImplantacao;
  nome: string;
  descricao: string;
  condicao: CondicaoImplantacao;
  condicaoTexto: string | null;
  /** A chave `implantacao_na_fatura`. */
  naFatura: boolean;
  /** Há linha IMPLANTACAO numa fatura não cancelada. */
  faturada: boolean;
  faturaId: string | null;
  faturaNumero: number | null;
  faturaCompetencia: string | null;
  /** As linhas ainda vão na 1ª fatura (chave ligada e 1ª fatura por sair). */
  naPrimeiraFatura: boolean;
  valorCentavos?: number;
}

/** O bloco `implantacao` de `cobranca_documento_json` (1182): a implantação das linhas da fatura. */
export interface ImplantacaoNoDocumento {
  nome: string;
  descricao: string;
  condicao: CondicaoImplantacao;
  condicaoTexto: string | null;
  valorCentavos: number;
}
