// Cobrança dos escritórios que assinam o T3jus (CO-06, F1.18). As regras estão no banco
// (0690_cobranca_escritorios.sql); aqui ficam os nomes que as telas mostram, a régua e os
// esquemas do que a tela envia. Desenho aprovado em docs/design/aprovadas/console-cobranca
// (Carol, 20/11/2026). Os esquemas só conferem o formato: os campos (data no futuro, valor
// diferente da fatura, plano arquivado...) são conferidos no banco, que devolve todos juntos.

import { z } from "zod";

export const FORMAS_ASSINATURA = { PIX: "Pix", BOLETO: "Boleto", CARNE: "Carnê" } as const;
export type FormaAssinatura = keyof typeof FORMAS_ASSINATURA;

/** Como foi pago, no registro manual (para quem pagou fora da cobrança). */
export const FORMAS_PAGAMENTO_MANUAL = {
  PIX: "Pix",
  BOLETO: "Boleto",
  TRANSFERENCIA: "Transferência",
  DINHEIRO: "Dinheiro",
  OUTRA: "Outra",
} as const;
export type FormaPagamentoManual = keyof typeof FORMAS_PAGAMENTO_MANUAL;

/** A situação que as telas mostram; o atraso é calculado pelo banco (A vencer depois do vencimento). */
export const SITUACOES_FATURA = {
  EM_ATRASO: "Em atraso",
  VENCE_HOJE: "Vence hoje",
  A_VENCER: "A vencer",
  PAGA: "Paga",
  CANCELADA: "Cancelada",
} as const;
export type SituacaoFatura = keyof typeof SITUACOES_FATURA;

export const SITUACOES_ASSINATURA = {
  SEM_COBRANCA: "Cobrança não começou",
  EM_DIA: "Em dia",
  EM_ATRASO: "Em atraso",
  SO_CONSULTA: "Só consulta",
} as const;
export type SituacaoAssinaturaCobranca = keyof typeof SITUACOES_ASSINATURA;

/** A régua de cobrança (fixa nesta versão, igual para todos), contada do vencimento. */
export const REGUA_COBRANCA = [
  { dia: -20, tipo: "EMITIDA", titulo: "Fatura emitida", canais: ["E-mail", "Portal"] },
  { dia: -3, tipo: "VENCE_EM_3", titulo: "Vence em 3 dias", canais: ["E-mail"] },
  { dia: 0, tipo: "VENCE_HOJE", titulo: "Vence hoje", canais: ["E-mail"] },
  { dia: 3, tipo: "VENCEU_3", titulo: "Venceu há 3 dias", canais: ["E-mail"] },
  { dia: 7, tipo: "VENCEU_7", titulo: "Aviso no Portal", canais: ["E-mail", "Portal"] },
  { dia: 15, tipo: "VENCEU_15", titulo: "Venceu há 15 dias", canais: ["E-mail"] },
  { dia: 30, tipo: "PROPOR_CONSULTA", titulo: "A Administração decide", canais: ["Console"] },
] as const;

/** Os e-mails da cobrança (a fila fatura_envios). */
export type TipoEnvioCobranca = "EMITIDA" | "VENCE_EM_3" | "VENCE_HOJE" | "VENCEU_3" | "VENCEU_7" | "VENCEU_15" | "MANUAL" | "RECIBO" | "CANCELADA";

/** Dias de atraso a partir dos quais o selo muda de cor e de ícone (desenho, decisão 2). */
export const ATRASO_URGENTE_DIAS = 30;

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** "2026-12-01" vira "dezembro de 2026"; com `curto`, só "dezembro". */
export function mesPorExtenso(competencia: string, curto = false): string {
  const [ano, mes] = competencia.split("-").map(Number);
  const nome = MESES[(mes ?? 1) - 1] ?? "";
  return curto ? nome : `${nome} de ${ano}`;
}

/** "Fatura em atraso · 41 dias" (carteira e cobrança). */
export function textoAtraso(dias: number): string {
  return `Fatura em atraso · ${dias} ${dias === 1 ? "dia" : "dias"}`;
}

const versao = z.number().int().min(1);
const motivo = z.string().max(300);
const dataIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const planoSalvarSchema = z.object({
  versao: versao.nullable().optional(),
  nome: z.string().max(80),
  precoCentavos: z.number().int(),
  pessoasIncluidas: z.number().int(),
});
export const planoArquivarSchema = z.object({ versao, arquivar: z.boolean(), motivo });
export const pessoaAMaisSchema = z.object({ versao, centavos: z.number().int() });

export const assinaturaSalvarSchema = z.object({
  /** Sem versão: preparar a assinatura nova. */
  versao: versao.nullable().optional(),
  planoId: z.string().uuid().optional(),
  diaVencimento: z.number().int(),
  forma: z.string().max(10),
  emailCobranca: z.string().max(254),
  cnpjNota: z.string().max(20).nullable().optional(),
  desconto: z.object({ pct: z.number().int(), ate: dataIso, motivo }).nullable().optional(),
  parcelasPorCarne: z.number().int().nullable().optional(),
});

export const mudarPlanoSchema = z.object({ versao, planoId: z.string().uuid(), motivo });
export const motivoCobrancaSchema = z.object({ versao, motivo });
export const pagamentoManualSchema = z.object({
  versao: versao.optional(),
  pagoEm: z.string().max(10),
  valorCentavos: z.number().int(),
  forma: z.string().max(20),
  motivo,
});
