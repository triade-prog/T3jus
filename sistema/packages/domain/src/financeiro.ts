// Financeiro do Portal, A receber (FI-01 a FI-04, FI-14, FI-17): as parcelas que saem dos
// contratos, o recebimento que baixa a parcela do mês dela e a cobrança com motivo e próxima
// ação. As regras estão no banco (0220_portal_financeiro_receber.sql); aqui o esquema só
// confere a forma do pedido.

import { z } from "zod";
import type { PessoaRef } from "./clientes.ts";
import type { Condicao, TipoHonorario } from "./honorarios.ts";
import type { SituacaoContrato } from "./contratos.ts";

/** As formas de pagamento do FI-17. */
export const FORMAS_PAGAMENTO = {
  PIX: "Pix",
  BOLETO: "Boleto",
  CARTAO: "Cartão",
  DEBITO_AUTOMATICO: "Débito automático",
  DINHEIRO: "Dinheiro",
  CHEQUE_PRE: "Cheque pré-datado",
  TRANSFERENCIA: "Transferência",
} as const;
export type FormaPagamento = keyof typeof FORMAS_PAGAMENTO;

export const MOSTRAR_RECEBER = ["ABERTO", "VENCIDAS", "SETE_DIAS", "RECEBIDO_MES"] as const;
export type MostrarReceber = (typeof MOSTRAR_RECEBER)[number];

export const TIPOS_COBRANCA = { LIGACAO: "Ligação", MENSAGEM: "Mensagem", ANOTACAO: "Anotação" } as const;
export type TipoCobranca = keyof typeof TIPOS_COBRANCA;

export type SituacaoParcela = "A_VENCER" | "VENCIDA" | "PARCIAL" | "PAGA" | "CANCELADA";

const txt = (max: number) => z.string().max(max).nullish();

export const registrarRecebimentoSchema = z.object({
  valor: z.number().int().nullish(),
  multaJuros: z.number().int().nullish(),
  recebidoEm: txt(20),
  forma: txt(30),
  recibo: z.boolean().default(false),
});
export type RegistrarRecebimento = z.input<typeof registrarRecebimentoSchema>;

export const anotarCobrancaSchema = z.object({
  tipo: txt(20),
  texto: txt(1000),
  motivo: txt(300),
  proxData: txt(20),
  proxOque: txt(300),
  proxResponsavelId: txt(40),
  forma: txt(30),
});
export type AnotarCobranca = z.input<typeof anotarCobrancaSchema>;

export interface CobrancaAtual {
  tipo: TipoCobranca | "PASSADA";
  texto: string | null;
  motivo: string | null;
  motivoDesde: string | null;
  proxData: string;
  proxOque: string;
  proxResponsavel: PessoaRef;
  autor: PessoaRef;
  em: string;
}

export interface ParcelaLinha {
  id: string;
  tipo: TipoHonorario;
  descricao: string;
  vencimento: string;
  valor: number;
  recebido: number;
  falta: number;
  forma: FormaPagamento | null;
  situacao: SituacaoParcela;
  pagaEm: string | null;
  contrato: { id: string; numero: string; objeto: string };
  cliente: { id: string; nome: string };
  responsavel: PessoaRef;
  cobranca: CobrancaAtual | null;
  cancelado: { em: string; motivo: string } | null;
  /** Só em "Recebido no mês": quanto entrou no mês. */
  noMes?: number | null;
}

export interface TotalReceber { valor: number; n: number }
export interface ListaReceber {
  algum: boolean;
  contratos: boolean;
  totais: { aberto: TotalReceber; vencidas: TotalReceber; seteDias: TotalReceber; recebidoMes: TotalReceber };
  responsaveis: PessoaRef[];
  parcelas: ParcelaLinha[];
}

export interface PagamentoRecebido {
  id: string;
  valor: number;
  multaJuros: number | null;
  recebidoEm: string;
  forma: FormaPagamento;
  autor: PessoaRef;
  em: string;
  recibo: { ano: number; numero: number } | null;
}
export interface EventoCobranca {
  tipo: TipoCobranca | "PASSADA";
  texto: string | null;
  motivo: string | null;
  proxData: string;
  proxOque: string;
  proxResponsavel: PessoaRef;
  autor: PessoaRef;
  em: string;
}
export interface ParcelaDoContrato extends ParcelaLinha {
  pagamentos: PagamentoRecebido[];
  eventos: EventoCobranca[];
}
export interface ParcelasContrato {
  id: string;
  numero: string;
  objeto: string;
  situacao: SituacaoContrato;
  cliente: { id: string; nome: string };
  responsavel: PessoaRef;
  condicoes: Condicao[];
  totais: { contratado: number; recebido: number; atraso: number; aVencer: number };
  aguardandoBase: number;
  parcelas: ParcelaDoContrato[];
}

export interface RecebimentoRegistrado { id: string; paga: boolean; falta: number; recibo: { ano: number; numero: number } | null }

/** O número do recibo como aparece na tela: 0098. */
export function numeroRecibo(r: { numero: number }): string {
  return String(r.numero).padStart(4, "0");
}

// ---------------------------------------------------------------------------------------
// A pagar (FI-01, FI-02, FI-07, FI-13, FI-20). Regras em 0230_portal_financeiro_pagar.sql.

/** As categorias de saída (FI-20), as mesmas da exportação para o contador. */
export const CATEGORIAS_SAIDA = {
  RETIRADAS: "Retiradas dos sócios",
  PESSOAL: "Pessoal",
  ALUGUEL: "Aluguel e condomínio",
  IMPOSTOS: "Impostos",
  CUSTAS: "Custas adiantadas",
  FORNECEDORES: "Fornecedores e sistemas",
  TAXAS: "Taxas bancárias",
  OUTRAS: "Outras despesas",
} as const;
export type CategoriaSaida = keyof typeof CATEGORIAS_SAIDA;

/** Como volta o que o escritório adiantou para o cliente (FI-07). */
export const REEMBOLSO_COMO = {
  PROXIMA_PARCELA: "Cobrar junto com a próxima parcela",
  LEVANTAMENTO: "Descontar do valor levantado",
  A_PARTE: "Cobrar à parte",
} as const;
export type ReembolsoComo = keyof typeof REEMBOLSO_COMO;

export const MOSTRAR_PAGAR = ["SEMANA", "VENCIDAS", "MES", "RECORRENTES"] as const;
export type MostrarPagar = (typeof MOSTRAR_PAGAR)[number];

export const lancarContaSchema = z.object({
  descricao: txt(200),
  fornecedor: txt(200),
  categoria: txt(30),
  valor: z.number().int().nullish(),
  vencimento: txt(20),
  forma: txt(30),
  repete: z.boolean().default(false),
  adiantada: z.boolean().default(false),
  clienteId: txt(40),
  reembolsoComo: txt(30),
});
export type LancarConta = z.input<typeof lancarContaSchema>;

export const contaPagaSchema = z.object({ valor: z.number().int().nullish(), pagaEm: txt(20) });
export type ContaPaga = z.input<typeof contaPagaSchema>;

export const contaReembolsadaSchema = z.object({ reembolsadoEm: txt(20) });

export interface ContaPagar {
  id: string;
  descricao: string;
  fornecedor: string | null;
  categoria: CategoriaSaida;
  valor: number;
  valorPago: number | null;
  vencimento: string;
  forma: FormaPagamento | null;
  pagaEm: string | null;
  situacao: "A_VENCER" | "VENCIDA" | "PAGA";
  recorrente: { dia: number; mes: string; lancadaSozinha: boolean } | null;
  adiantada: { cliente: { id: string; nome: string }; como: ReembolsoComo; reembolsadoEm: string | null } | null;
}

export interface ListaPagar {
  algum: boolean;
  mes: string;
  totais: {
    semana: { valor: number; contas: number };
    vencidas: { valor: number; contas: number };
    recorrentes: { contas: number; sozinhas: number };
    reembolsar: { valor: number; clientes: number };
  };
  contas: ContaPagar[];
  depois: { contas: number; valor: number; ate: string } | null;
  adiantados: ContaPagar[];
  categorias: { categoria: CategoriaSaida; valor: number }[];
}
