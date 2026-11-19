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

// ------------------------------------------------------------------ Repasses (FI-05, FI-06, FI-12)

/** De onde veio o dinheiro de terceiros que passou pelo escritório. */
export const TIPOS_LEVANTAMENTO = {
  ALVARA: "Alvará",
  RPV: "RPV",
  PRECATORIO: "Precatório",
  ACORDO: "Depósito de acordo",
} as const;
export type TipoLevantamento = keyof typeof TIPOS_LEVANTAMENTO;

/** Para quem vai cada parte. Honorários e reembolsos são do escritório; o resto é de terceiros. */
export const PARA_DESTINACAO = {
  CLIENTE: "Cliente",
  HONORARIOS: "Honorários",
  REEMBOLSO: "Reembolso ao escritório",
  PARCEIRO: "Advogado parceiro",
  PERITO: "Perito",
  OUTRO: "Outro",
} as const;
export type ParaDestinacao = keyof typeof PARA_DESTINACAO;
/** O que se acrescenta à mão na divisão (o cliente, os honorários e os reembolsos vêm do contrato). */
export const PARA_ACRESCENTAR = ["PARCEIRO", "PERITO", "OUTRO"] as const;

/** Prazo padrão do repasse, em dias úteis depois que o dinheiro entrou (pergunta 2 do desenho). */
export const PRAZO_REPASSE_DIAS = 3;

export const propostaRepasseSchema = z.object({
  casoId: txt(40),
  clienteId: txt(40),
  valor: z.number().int().nullish(),
});

export const linhaDivisaoSchema = z.object({
  para: txt(20),
  nome: txt(200),
  regra: txt(300),
  valor: z.number().int().nullish(),
  contaId: txt(40),
});
export type LinhaDivisao = z.input<typeof linhaDivisaoSchema>;

export const registrarLevantamentoSchema = z.object({
  tipo: txt(20),
  casoId: txt(40),
  clienteId: txt(40),
  valor: z.number().int().nullish(),
  entrouEm: txt(20),
  divisao: z.array(linhaDivisaoSchema).max(20).default([]),
});
export type RegistrarLevantamento = z.input<typeof registrarLevantamentoSchema>;

export const destinacaoFeitaSchema = z.object({ feitoEm: txt(20) });
export const destinacaoDispensarSchema = z.object({ motivo: txt(600) });

export interface PropostaRepasse {
  contrato: { id: string; numero: string } | null;
  linhas: { para: "HONORARIOS" | "REEMBOLSO"; nome: string; regra: string; valor: number; contaId?: string }[];
  cliente: number;
  falta: number;
}

export interface Destinacao {
  id: string;
  para: ParaDestinacao;
  nome: string;
  regra: string | null;
  valor: number;
  prazo: string;
  escritorio: boolean;
  situacao: "PENDENTE" | "FEITO" | "DISPENSADO";
  feitoEm: string | null;
  feitoPor: { id: string; nome: string } | null;
  dispensa: { motivo: string; em: string; por: { id: string; nome: string } } | null;
  contaId: string | null;
}

export interface Levantamento {
  id: string;
  tipo: TipoLevantamento;
  valor: number;
  entrouEm: string;
  criadoEm: string;
  autor: { id: string; nome: string };
  prestacaoEm: string | null;
  prestacaoPor: { id: string; nome: string } | null;
  caso: { id: string; nome: string; parteContraria: string | null; area: string };
  cliente: { id: string; nome: string; telefone: string | null };
  feitos: number;
  total: number;
  destinacoes: Destinacao[];
}

export interface ListaRepasses {
  hoje: string;
  prazoDias: number;
  algum: boolean;
  totais: { aRepassar: number; repassesPendentes: number; honorarios: number; casos: number };
  repassadoMes: { valor: number; clientes: number };
  repassados: { levantamentoId: string; cliente: string; tipo: TipoLevantamento; valor: number; feitoEm: string }[];
  levantamentos: Levantamento[];
  casos: { id: string; nome: string; parteContraria: string | null; clientes: { id: string; nome: string }[] | null }[];
}

export interface FichaRepasse extends Levantamento {
  hoje: string;
  escritorio: string;
  historico: { acao: string; em: string; por: { id: string; nome: string } | null; dados: Record<string, unknown> }[];
}

/** Soma dos dias úteis (segunda a sexta), como o banco faz. Os feriados ainda não entram. */
export function somarDiasUteis(dia: string, dias: number): string {
  const d = new Date(`${dia}T12:00:00Z`);
  let n = 0;
  while (n < dias) {
    d.setUTCDate(d.getUTCDate() + 1);
    const s = d.getUTCDay();
    if (s !== 0 && s !== 6) n += 1;
  }
  return d.toISOString().slice(0, 10);
}

const O_SEU_LEVANTAMENTO: Record<TipoLevantamento, string> = {
  ALVARA: "O seu alvará foi pago",
  RPV: "O seu RPV foi pago",
  PRECATORIO: "O seu precatório foi pago",
  ACORDO: "O depósito do seu acordo entrou",
};

/** A conta da prestação de contas (FI-12), montada do registro: os números não se editam ali. */
export function contaPrestacao(
  l: Pick<Levantamento, "tipo" | "valor" | "cliente" | "destinacoes">,
  escritorio: string,
): { abertura: string; descontos: { rotulo: string; valor: number }[]; fica: number; fecho: string } {
  const primeiro = l.cliente.nome.split(" ")[0];
  const doCliente = l.destinacoes.find((d) => d.para === "CLIENTE");
  const data = (s: string) => s.split("-").reverse().slice(0, 2).join("/");
  return {
    abertura: `Olá, ${primeiro}. Aqui é o escritório ${escritorio}. ${O_SEU_LEVANTAMENTO[l.tipo]}, e esta é a conta de como ficou:`,
    descontos: l.destinacoes
      .filter((d) => d.para !== "CLIENTE" && d.situacao !== "DISPENSADO")
      .map((d) => ({ rotulo: d.nome, valor: d.valor })),
    fica: doCliente?.valor ?? 0,
    fecho: doCliente?.feitoEm
      ? `Já transferimos o seu valor em ${data(doCliente.feitoEm)}. Qualquer dúvida, é só responder.`
      : `Vamos transferir o seu valor até ${data(doCliente?.prazo ?? "")}. Qualquer dúvida, é só responder.`,
  };
}

/** O texto da prestação de contas, para copiar ou abrir no WhatsApp. */
export function textoPrestacaoContas(
  l: Pick<Levantamento, "tipo" | "valor" | "cliente" | "destinacoes">,
  escritorio: string,
): string {
  const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }).replace(/\u00a0/g, " ");
  const c = contaPrestacao(l, escritorio);
  return [
    c.abertura,
    "",
    `Valor recebido: ${brl(l.valor)}`,
    ...c.descontos.map((d) => `${d.rotulo}: - ${brl(d.valor)}`),
    `Fica para você: ${brl(c.fica)}`,
    "",
    c.fecho,
  ].join("\n");
}
