// Financeiro do Portal, A receber (FI-01 a FI-04, FI-14, FI-17): as parcelas que saem dos
// contratos, o recebimento que baixa a parcela do mês dela e a cobrança com motivo e próxima
// ação. As regras estão no banco (0220_portal_financeiro_receber.sql); aqui o esquema só
// confere a forma do pedido.

import type { MarcaNoDocumento } from "./logo.ts";
import type { EnvioMensagem } from "./conversas.ts";
import { z } from "zod";
import type { PessoaRef } from "./clientes.ts";
import type { Condicao, TipoHonorario } from "./honorarios.ts";
import type { SituacaoContrato } from "./contratos.ts";
import type { Anexo } from "./anexos.ts";

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
  /** Quem pagou (FI-14): o cliente (padrão), o contato principal ou outra pessoa ou empresa. */
  pagador: z.object({
    tipo: z.enum(["CLIENTE", "CONTATO", "OUTRO"]),
    nome: txt(160),
    documento: txt(20),
    papel: txt(60),
  }).nullish(),
  /** O reembolso pago junto com a parcela (F3.85): só quando a caixa é marcada. */
  reembolso: z.object({ valor: z.number().int().nullish(), forma: txt(30) }).nullish(),
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
  /** Voltou de "Pago antes do T3jus" ("Não foi paga", F3.84). */
  eraPagoAntes?: boolean;
  /** Nenhum aviso automático sai por esta parcela até ela ter nova data (pergunta 3). */
  semAvisoAutomatico?: boolean;
  /** A parcela do êxito: de onde veio e quem conferiu (F3.14). */
  exito?: ExitoDaParcela | null;
  /** O reembolso que vai junto com a parcela e ainda não foi pago (F3.85). */
  reembolso?: ReembolsoDaParcela | null;
  /** A baixa pela divisão do alvará (F3.94): de qual levantamento e quanto. */
  baixaAlvara?: { tipo: TipoLevantamento; entrouEm: string; valor: number; levantamentoId: string }[] | null;
}

export interface ExitoDaParcela {
  id: string;
  encerradoEm: string;
  conferido: { por: PessoaRef; em: string };
  calculado: number;
  base: number;
  percentual: number;
  motivoAjuste: string | null;
  caso: { id: string; nome: string };
}

export interface ReembolsoDaParcela {
  valor: number;
  contas: { id: string; descricao: string; valor: number; pagaEm: string | null; caso: { id: string; nome: string } | null }[];
}

// ------------------------------------------------------------------ O êxito para conferir (F3.14: CH-07, EX-08)
// 0640_exito_conferir.sql.

/** Por que não cobrar o êxito (decisão 1: "virá por alvará" não é motivo; o êxito é lançado). */
export const MOTIVOS_NAO_COBRAR = {
  PERDOADO: "Perdoado ou renegociado com o cliente",
  INDEVIDO: "Não é devido (o contrato não prevê, ou o valor não é do cliente)",
  OUTRO: "Outro motivo",
} as const;
export type MotivoNaoCobrar = keyof typeof MOTIVOS_NAO_COBRAR;

export interface ExitoParaConferir {
  id: string;
  situacao: "PARA_CONFERIR" | "LANCADO" | "NAO_COBRADO";
  cliente: { id: string; nome: string };
  caso: { id: string; nome: string; numero: string | null; resultado: "GANHO" | "ACORDO" | "PERDA" | null };
  contrato: { id: string; numero: string; assinadoEm: string | null; responsavel: PessoaRef };
  base: number;
  percentual: number;
  sobre: string;
  calculado: number;
  previstoEm: string;
  encerrado: { por: PessoaRef; em: string; motivo: string };
  valorLancado: number | null;
  vencimento: string | null;
  motivoAjuste: string | null;
  motivoNaoCobrar: MotivoNaoCobrar | null;
  explicacao: string | null;
  recebimentoId: string | null;
  conferido: { por: PessoaRef; em: string } | null;
}

export interface ExitosParaConferir { total: number; n: number; itens: ExitoParaConferir[] }

export const lancarExitoSchema = z.object({
  valor: z.number().int().nullish(),
  vencimento: txt(20),
  forma: txt(30),
  motivoAjuste: txt(500),
});
export type LancarExito = z.input<typeof lancarExitoSchema>;

export const naoCobrarExitoSchema = z.object({ motivo: txt(20), explicacao: txt(1000) });
export type NaoCobrarExito = z.input<typeof naoCobrarExitoSchema>;

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
  /** O que o escritório adiantou nos casos do contrato (F3.23). */
  adiantados: ContaPagar[];
}

/** O que vai no papel do recibo (FI-14, F3.19), como estava no registro. */
export interface ReciboParaImprimir {
  numero: { ano: number; numero: number };
  /** A marca do dia (F3.81): sem ela, o recibo sai com o nome em letra, como saiu. */
  marca?: MarcaNoDocumento | null;
  escritorio: { nome: string; cnpj: string | null; endereco: string | null; cidade: string | null; uf: string | null; oab?: string | null;
    contatos?: { telefone?: string | null; email?: string | null }[] | null; whatsapp: string | null };
  cliente: { id: string; nome: string; tipo: "PF" | "PJ"; documento: string | null };
  pagador: { tipo: "CONTATO" | "OUTRO"; nome: string; documento: string | null; papel: string | null } | null;
  contrato: { id: string; numero: string; objeto: string };
  parcela: { id: string; descricao: string; vencimento: string; ordem: number | null; total: number | null };
  valor: number;
  multaJuros: number | null;
  forma: FormaPagamento;
  pagoEm: string;
  registradoPor: { nome: string; oab: string | null };
  registradoEm: string;
  pagamentoId: string;
  /** O reembolso de despesa adiantada pago junto com a parcela (F3.95): a segunda linha do recibo. */
  reembolsos?: ReembolsoNoRecibo[];
}

export interface ReembolsoNoRecibo { descricao: string; valor: number; forma: FormaPagamento; adiantadoEm: string | null; caso: string | null }

export interface RecebimentoRegistrado {
  id: string; paga: boolean; falta: number; recibo: { ano: number; numero: number } | null;
  reembolso?: { valor: number; forma: FormaPagamento } | null;
}

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
  /** F3.51: as parcelas e devoluções de empréstimo, à parte das despesas do dia a dia. No fim, como no SQL (0940). */
  EMPRESTIMOS: "Empréstimos",
} as const;
export type CategoriaSaida = keyof typeof CATEGORIAS_SAIDA;

/** As categorias de Lançar conta: a parcela de empréstimo nasce do empréstimo, no Caixa (F3.51). */
export const CATEGORIAS_LANCAR = Object.fromEntries(
  Object.entries(CATEGORIAS_SAIDA).filter(([k]) => k !== "EMPRESTIMOS"),
) as Omit<typeof CATEGORIAS_SAIDA, "EMPRESTIMOS">;
export type CategoriaLancar = keyof typeof CATEGORIAS_LANCAR;

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
  casoId: txt(40),
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
  situacao: "A_VENCER" | "VENCIDA" | "PAGA" | "CANCELADA";
  recorrente: { id?: string; dia: number; mes: string; lancadaSozinha: boolean } | null;
  /** F3.51: a parcela ou a devolução de um empréstimo, para o selo "Empréstimo · 3/24" e o link da ficha. */
  emprestimo?: ContaDoEmprestimo | null;
  /** A conta do mês cancelada ao encerrar a recorrência (F3.24): fica no histórico, fora das somas. */
  cancelada?: { em: string; por: PessoaRef; motivo: string } | null;
  adiantada: {
    cliente: { id: string; nome: string };
    /** O caso em que o escritório adiantou (F3.23); null nas contas antigas ou de cliente sem caso. */
    caso: { id: string; nome: string } | null;
    como: ReembolsoComo;
    reembolsadoEm: string | null;
    /** A parcela em que volta, quando é "junto com a próxima parcela" e ainda não voltou. */
    parcela: ParcelaDoReembolso | null;
  } | null;
}

/** A parcela em que o reembolso volta (F3.23). */
export interface ParcelaDoReembolso {
  id: string;
  descricao: string;
  vencimento: string;
  valor: number;
  contrato: { id: string; numero: string };
}

/** Para a janela de lançar conta adiantada: os casos do cliente e a parcela em que voltaria. */
export interface ParaAdiantar {
  casos: { id: string; nome: string; numero: string | null; situacao: "ANDAMENTO" | "ENCERRADO"; proximaParcela: ParcelaDoReembolso | null }[];
  proximaParcela: ParcelaDoReembolso | null;
}

export interface ListaPagar {
  algum: boolean;
  mes: string;
  totais: {
    semana: { valor: number; contas: number };
    vencidas: { valor: number; contas: number };
    recorrentes: { contas: number; sozinhas: number; ativas?: number; encerradasMes?: number };
    reembolsar: { valor: number; clientes: number };
  };
  contas: ContaPagar[];
  depois: { contas: number; valor: number; ate: string } | null;
  adiantados: ContaPagar[];
  categorias: { categoria: CategoriaSaida; valor: number }[];
}

// ------------------------------------------------------------------ Contas que repetem (FI-13, F3.24)
// Regras em 0534_recorrencia_mudancas.sql. Dia 0 é "no último dia do mês".

/** Por que encerrar: a lista fechada do desenho aprovado. */
export const MOTIVOS_ENCERRAR = [
  "O contrato com o fornecedor terminou",
  "Troquei de fornecedor",
  "O escritório não usa mais",
  "A conta vai ser lançada de outro jeito",
  "Outro",
] as const;
export type MotivoEncerrar = (typeof MOTIVOS_ENCERRAR)[number];

export const mudarRecorrenciaSchema = z.discriminatedUnion("tipo", [
  z.object({
    tipo: z.literal("VALOR"),
    aPartirDe: txt(20).nullish(),
    valor: z.number().int().nullish(),
    dia: z.number().int().nullish(),
    motivo: txt(160).nullish(),
  }),
  z.object({
    tipo: z.literal("ENCERRAR"),
    aPartirDe: txt(20).nullish(),
    motivo: txt(160).nullish(),
    detalhe: txt(500).nullish(),
    cancelarLancada: z.boolean().optional(),
  }),
]);
export type MudarRecorrencia = z.input<typeof mudarRecorrenciaSchema>;

export interface Recorrencia {
  id: string;
  descricao: string;
  fornecedor: string | null;
  categoria: CategoriaSaida;
  forma: FormaPagamento | null;
  /** O valor e o dia que valem neste mês. */
  valor: number;
  dia: number;
  /** O primeiro mês da conta. */
  desde: string;
  /** O último mês em que nasce, quando foi encerrada. */
  ultimoMes: string | null;
  encerrada: { em: string; por: PessoaRef; aPartirDe: string; motivo: string; detalhe: string | null } | null;
  proxima: { mes: string; valor: number; dia: number; vencimento: string } | null;
  doMes: ContaPagar | null;
  lancadas: number;
  pagas: number;
}

export interface ListaRecorrencias { mes: string; ativas: Recorrencia[]; encerradas: Recorrencia[] }

export interface MudancaRecorrencia {
  id: string;
  tipo: "VALOR" | "ENCERRAR";
  aPartirDe: string;
  valor: number | null;
  dia: number | null;
  antes: { valor: number; dia: number } | null;
  motivo: string | null;
  detalhe: string | null;
  por: PessoaRef;
  em: string;
  mudouConta: boolean;
  cancelouConta: boolean;
}

export interface FichaRecorrencia extends Recorrencia {
  contas: (ContaPagar & { anexos: number })[];
  mudancas: MudancaRecorrencia[];
  criada: { em: string; por: PessoaRef; valor: number; dia: number; mes: string; forma: FormaPagamento | null };
}

export interface RecorrenciaMudada { id: string; mudouConta: boolean; cancelouConta: boolean; contaDoMes: ContaPagar | null }

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
  /** Quando vem de um RPV ou precatório a caminho (F3.48): liga os dois. */
  requisicaoId: txt(40),
});
export type RegistrarLevantamento = z.input<typeof registrarLevantamentoSchema>;

export const destinacaoFeitaSchema = z.object({ feitoEm: txt(20) });
export const destinacaoDispensarSchema = z.object({ motivo: txt(600) });

export interface PropostaRepasse {
  contrato: { id: string; numero: string } | null;
  linhas: { para: "HONORARIOS" | "REEMBOLSO"; nome: string; regra: string; valor: number; contaId?: string }[];
  cliente: number;
  falta: number;
  /** As parcelas do êxito do cliente no caso que a parte "honorários" vai baixar (F3.94). */
  exito?: { id: string; descricao: string; vencimento: string; falta: number }[];
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
  /** A anotação mais nova do atraso (F3.46), quando há. */
  atraso?: AtrasoRepasse | null;
}

export type MotivoAtrasoRepasse = "DOCUMENTO" | "SEM_RESPOSTA" | "DECISAO" | "OUTRO";
export const MOTIVOS_ATRASO_REPASSE: Record<MotivoAtrasoRepasse, { titulo: string; ajuda: string; curto: string }> = {
  DOCUMENTO: { titulo: "Esperando um documento de quem recebe", ajuda: "Nota fiscal, recibo ou os dados do banco.", curto: "esperando um documento" },
  SEM_RESPOSTA: { titulo: "Quem recebe não respondeu", ajuda: "Mensagens e ligações sem resposta.", curto: "quem recebe não respondeu" },
  DECISAO: { titulo: "Esperando uma decisão", ajuda: "Do cliente, do parceiro ou do juiz.", curto: "esperando uma decisão" },
  OUTRO: { titulo: "Outro motivo", ajuda: "Escreva abaixo.", curto: "outro motivo" },
};

/** Por que o repasse passou do prazo e a próxima ação (F3.46). O prazo não muda. */
export interface AtrasoRepasse {
  id: string;
  motivo: MotivoAtrasoRepasse;
  texto: string | null;
  proximaEm: string;
  proximaCom: { id: string; nome: string };
  oQue: string;
  em: string;
  por: { id: string; nome: string };
}

export const anotarAtrasoSchema = z.object({
  motivo: z.enum(["DOCUMENTO", "SEM_RESPOSTA", "DECISAO", "OUTRO"]).nullish(),
  texto: z.string().max(300).nullish(),
  proximaEm: txt(20),
  proximaComId: txt(40),
  oQue: z.string().max(200).nullish(),
});
export type AnotarAtraso = z.input<typeof anotarAtrasoSchema>;

// ------------------------------------------------------------------ RPV e precatório a caminho (F3.48)

export type TipoRequisicao = "RPV" | "PRECATORIO";
export const TIPOS_REQUISICAO: Record<TipoRequisicao, { titulo: string; ajuda: string }> = {
  RPV: { titulo: "RPV", ajuda: "Requisição de pequeno valor. Costuma ser paga em até 2 meses depois de expedida." },
  PRECATORIO: { titulo: "Precatório", ajuda: "Entra no orçamento de quem paga. Apresentado até 2 de abril, costuma ser pago até o fim do ano seguinte." },
};

export interface RequisicaoACaminho {
  id: string;
  tipo: TipoRequisicao;
  tribunal: string;
  devedor: string;
  numero: string | null;
  valorRequisitado: number;
  parteEscritorio: number;
  parteRegra: string | null;
  expedidoEm: string;
  /** Primeiro dia do mês estimado. */
  estimadaMes: string;
  situacao: "A_CAMINHO" | "ENTROU" | "NAO_VAI_ENTRAR";
  levantamentoId: string | null;
  passou: boolean;
  criadoEm: string;
  caso: { id: string; nome: string; parteContraria: string | null };
  cliente: { id: string; nome: string };
  /** O ofício requisitório anexado (F3.88), o mais novo. */
  oficio?: Anexo | null;
}

export interface ACaminho {
  total: number;
  n: number;
  naPrevisao: number;
  passou: { valor: number; n: number };
  itens: RequisicaoACaminho[];
}

export const registrarRequisicaoSchema = z.object({
  tipo: txt(20),
  casoId: txt(40),
  clienteId: txt(40),
  tribunal: txt(80),
  devedor: txt(120),
  numero: txt(60),
  valor: z.number().int().nullish(),
  expedidoEm: txt(20),
  estimadaMes: txt(20),
});
export type RegistrarRequisicao = z.input<typeof registrarRequisicaoSchema>;

export const dataRequisicaoSchema = z.object({
  situacao: z.enum(["A_CAMINHO", "NAO_VAI_ENTRAR"]).nullish(),
  estimadaMes: txt(20),
  motivo: z.string().max(300).nullish(),
});

/** A data estimada sugerida (aaaa-mm-01): RPV, 2 meses depois; precatório até 2/4, dezembro do ano seguinte; depois, do outro. */
export function estimadaSugerida(tipo: TipoRequisicao, expedidoEm: string): string {
  const ano = Number(expedidoEm.slice(0, 4));
  const mes = Number(expedidoEm.slice(5, 7));
  if (tipo === "PRECATORIO") return `${expedidoEm.slice(5, 10) <= "04-02" ? ano + 1 : ano + 2}-12-01`;
  const m = mes + 2;
  return `${m > 12 ? ano + 1 : ano}-${String(((m - 1) % 12) + 1).padStart(2, "0")}-01`;
}

export const prazoRepasseSchema = z.object({ prazoRepasseDias: z.number().int().nullish() });

/** Quem pode cuidar de um repasse: da equipe, com a área Financeiro (F3.71). */
export interface PodeCuidarRepasse { id: string; nome: string; dono: boolean; areas: string[] }

export interface Levantamento {
  id: string;
  tipo: TipoLevantamento;
  valor: number;
  entrouEm: string;
  criadoEm: string;
  autor: { id: string; nome: string };
  /** Quem cuida do repasse (F3.71): nasce o responsável pelo contrato. */
  responsavel: { id: string; nome: string };
  prestacaoEm: string | null;
  prestacaoPor: { id: string; nome: string } | null;
  /** A prestação de contas na fila do WhatsApp (F3.44): a situação e a hora em que o cliente leu. */
  prestacao?: MensagemPrestacao | null;
  /** O WhatsApp do escritório está ligado: "Mandar pelo WhatsApp" no lugar de "Marcar como enviada". */
  whatsappLigado?: boolean;
  escritorioNome?: string;
  caso: { id: string; nome: string; parteContraria: string | null; area: string };
  cliente: { id: string; nome: string; telefone: string | null };
  feitos: number;
  total: number;
  destinacoes: Destinacao[];
}

/** A mensagem da prestação de contas na conversa do cliente (F3.44). */
export interface MensagemPrestacao {
  id: string; envio: EnvioMensagem; em: string; envioEm: string | null; motivo: string | null; para: string | null; telefone: string | null;
}

export interface ListaRepasses {
  hoje: string;
  prazoDias: number;
  algum: boolean;
  totais: {
    aRepassar: number; repassesPendentes: number; honorarios: number; casos: number;
    /** F3.46: o que passou do prazo, em quantos repasses e quantas partes sem motivo anotado. */
    atrasados: number; repassesAtrasados: number; semMotivo: number;
  };
  /** Quem está vendo, para o filtro "Os meus". */
  eu: string;
  podeEditar: boolean;
  /** RPV e precatório expedidos que ainda não entraram (F3.48). */
  aCaminho: ACaminho;
  /** Quem pode ser a próxima ação de um atraso (tem a área Financeiro). */
  podemCuidar: PodeCuidarRepasse[];
  repassadoMes: { valor: number; clientes: number };
  repassados: { levantamentoId: string; cliente: string; tipo: TipoLevantamento; valor: number; feitoEm: string }[];
  levantamentos: Levantamento[];
  casos: { id: string; nome: string; parteContraria: string | null; clientes: { id: string; nome: string }[] | null }[];
}

export interface FichaRepasse extends Levantamento {
  hoje: string;
  escritorio: string;
  eu: string;
  podeEditar: boolean;
  prazoDias: number;
  /** O responsável pelo contrato, de onde o repasse nasceu. */
  doContrato: { id: string; nome: string } | null;
  podemCuidar: PodeCuidarRepasse[];
  historico: { acao: string; em: string; por: { id: string; nome: string } | null; dados: Record<string, unknown> }[];
  /** O acerto do caso, para o fechamento (F3.45). */
  acerto: AcertoCaso;
}

/** O que ainda segura o fechamento do caso no financeiro (F3.45, FI-08). */
export interface PendenciaCaso {
  tipo: "REPASSE" | "EXITO" | "PARCELA" | "PARCELA_SEM_VALOR" | "REEMBOLSO";
  nome: string;
  valor: number | null;
  para?: ParaDestinacao;
  prazo?: string;
  vencimento?: string;
  levantamentoId?: string;
  contratoId?: string;
  contaId?: string;
  exitoId?: string;
}

/** O acerto do caso: o que entrou, o que foi pago, o que falta e se já foi encerrado. */
export interface AcertoCaso {
  casoId: string;
  entrou: number;
  destinadoPago: number;
  faltaPagar: number;
  parcelas: { total: number; pagas: number; ultima: string | null; falta: number };
  prestacoesPendentes: number;
  pendencias: PendenciaCaso[];
  falta: number;
  fechado: { em: string; por: { id: string; nome: string } } | null;
  /** Encerrar em cadeia (0852; EX-17): os contratos que se encerram junto e o motivo que fica neles. */
  contratosLigados?: { id: string; numero: string; objeto: string; versao: number; cliente: { id: string; nome: string } }[];
  podeEncerrarContratos?: boolean;
  motivoContratos?: string;
  /** Depois de encerrar: os contratos encerrados junto. */
  contratosEncerrados?: { id: string; numero: string }[];
}

/** O corpo de "Encerrar o caso no financeiro": os contratos ligados, com a versão lida (EX-17). */
export const encerrarCasoSchema = z.object({
  contratos: z.array(z.object({ id: z.string().uuid(), versao: z.number().int().min(1) })).max(20).optional(),
});

/** Soma dos dias úteis (segunda a sexta), como o banco faz. Os feriados ainda não entram. */
/** O domingo de Páscoa do ano (Meeus/Jones/Butcher), para a Sexta-feira Santa. */
function domingoDePascoa(ano: number): string {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/** Feriado nacional (o mesmo cálculo do banco, 0552): 1/1, Sexta-feira Santa, 21/4, 1/5, 7/9, 12/10, 2/11, 15/11, 20/11 e 25/12. */
export function feriadoNacional(dia: string): boolean {
  const md = dia.slice(5, 10);
  const ano = Number(dia.slice(0, 4));
  if (["01-01", "04-21", "05-01", "09-07", "10-12", "11-02", "11-15", "12-25"].includes(md)) return true;
  if (md === "11-20" && ano >= 2024) return true;
  const p = new Date(`${domingoDePascoa(ano)}T12:00:00Z`);
  p.setUTCDate(p.getUTCDate() - 2);
  return p.toISOString().slice(0, 10) === dia;
}

/** Soma dias úteis (segunda a sexta, sem os feriados nacionais), como o banco. */
export function somarDiasUteis(dia: string, dias: number): string {
  const d = new Date(`${dia}T12:00:00Z`);
  let n = 0;
  while (n < dias) {
    d.setUTCDate(d.getUTCDate() + 1);
    const s = d.getUTCDay();
    if (s !== 0 && s !== 6 && !feriadoNacional(d.toISOString().slice(0, 10))) n += 1;
  }
  return d.toISOString().slice(0, 10);
}

/** Quantos dias úteis depois de `de` cai `ate` (para o "1 dia útil de atraso"). */
export function diasUteisEntre(de: string, ate: string): number {
  const d = new Date(`${de}T12:00:00Z`);
  let n = 0;
  while (d.toISOString().slice(0, 10) < ate) {
    d.setUTCDate(d.getUTCDate() + 1);
    const s = d.getUTCDay();
    if (s !== 0 && s !== 6 && !feriadoNacional(d.toISOString().slice(0, 10))) n += 1;
  }
  return n;
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
    abertura: `Olá, ${primeiro}. Aqui é do escritório ${escritorio}. ${O_SEU_LEVANTAMENTO[l.tipo]}, e esta é a conta de como ficou:`,
    descontos: l.destinacoes
      .filter((d) => d.para !== "CLIENTE" && d.situacao !== "DISPENSADO")
      .map((d) => ({ rotulo: d.nome, valor: d.valor })),
    fica: doCliente?.valor ?? 0,
    fecho: doCliente?.feitoEm
      ? `Já transferimos o seu valor em ${data(doCliente.feitoEm)}. Qualquer dúvida, é só responder esta mensagem.`
      : `Vamos transferir o seu valor até ${data(doCliente?.prazo ?? "")}. Qualquer dúvida, é só responder esta mensagem.`,
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

// ------------------------------------------------------------------------------------------
// Resumo, Caixa e exportação para o contador (FI-03, FI-09, FI-21, PD-03, PD-06, IN-02 a IN-05,
// IN-07, IN-09, IN-10, IN-14). Os números vêm prontos do banco
// (0290_portal_financeiro_resumo_caixa.sql); aqui ficam os grupos de honorário, o alerta de
// queda e as palavras.

/** O dinheiro de terceiros que está com o escritório, por quem ainda espera. */
export interface TerceirosNaConta { saldo: number; honorarios: number; clientes: number; peritos: number; parceiros: number; outros: number }

export interface RepassePendente {
  id: string; levantamentoId: string; para: ParaDestinacao; nome: string; regra: string | null; valor: number; prazo: string;
  tipo: TipoLevantamento; cliente: string; caso: string;
}

export interface ResumoFinanceiro {
  hoje: string;
  mes: string;
  algum: boolean;
  escritorio: { recebido: number; vencidoMes: number; seteDias: number; restoMes: number };
  vencidas: { valor: number; n: number; semAcao: number; faixas: { valor: number; n: number }[]; parcelas: ParcelaLinha[] };
  proximas: { valor: number; n: number; ate: string | null; parcelas: ParcelaLinha[] };
  terceiros: TerceirosNaConta;
  repasses: { valor: number; n: number; lista: RepassePendente[] };
  meses: { mes: string; previsto: number; realizado: number; meta?: number | null }[];
  /** F3.49: a meta do mês, as outras e quem define. */
  meta?: MetasReceita & { dono: boolean; socioDono: PessoaRef | null; media3: number };
  porTipo: { tipo: TipoHonorario; valor: number; anteriores: number; restante: number }[];
  contratado: { n: number; valor: number };
  clientesReceberam: { n: number; valor: number };
  fixas: { receita: number; despesas: number };
}

// ------------------------------------------------------- Ajustes do financeiro (F3.50, F3.49)

/** O contador do escritório (F3.50, FI-21). Não entra no T3jus: recebe só o e-mail. */
export interface Contador {
  nome: string; firma: string | null; email: string; telefone: string | null;
  mandarAoExportar: boolean; lembrarDia5: boolean; por?: PessoaRef | null; em?: string;
}
/** O saldo do caixa do escritório no dia antes do primeiro lançamento (F3.50, FI-09). */
export interface SaldoAbertura { id: string; data: string; valor: number; motivo: string | null; por: PessoaRef | null; em: string }
/** Uma meta de receita (F3.49, IN-09): de todo mês a partir de deMes, ou só de um mês. */
export interface MetaReceita { valor: number; deMes: string; soMes: boolean; por: PessoaRef | null; em: string }
export interface MetasReceita { mes: MetaReceita | null; todoMes: MetaReceita | null; antes: MetaReceita | null; umMes: MetaReceita[] }

export interface AjustesFinanceiro {
  dono: boolean;
  socioDono: PessoaRef | null;
  contador: Contador | null;
  abertura: SaldoAbertura | null;
  primeiroLancamento: string | null;
  saldoHoje: number;
  prazoRepasseDias: number;
  meta: MetasReceita;
  historico: { acao: string; em: string; por: PessoaRef | null; dados: Record<string, unknown> }[];
}

export const contadorSchema = z.object({
  nome: z.string().nullish(), firma: z.string().nullish(), email: z.string().nullish(), telefone: z.string().nullish(),
  mandarAoExportar: z.boolean().nullish(), lembrarDia5: z.boolean().nullish(),
});
export const salvarAjustesSchema = z.object({
  contador: contadorSchema.nullish(),
  prazoRepasseDias: z.number().int().nullish(),
  abertura: z.object({ data: z.string().nullish(), valor: z.number().int().nullish() }).nullish(),
});
export type SalvarAjustes = z.input<typeof salvarAjustesSchema>;
export const corrigirAberturaSchema = z.object({ data: z.string().nullish(), valor: z.number().int().nullish(), motivo: z.string().nullish() });
export const definirMetaSchema = z.object({ valor: z.number().int().nullish(), mes: z.string().nullish(), soMes: z.boolean().nullish() });
/** A planilha que vai anexada ao e-mail do contador, em base64 (até uns 4 MB). */
export const enviarContadorSchema = z.object({ nome: z.string().min(1).max(120), arquivo: z.string().min(1).max(6_000_000) });

export interface EnvioContador {
  para: string;
  situacao: "ENVIADO" | "FALHOU";
  em: string;
  por: PessoaRef | null;
  /** Até quando vale o link do .zip dos comprovantes (F3.89); nulo sem .zip. */
  linkAte?: string | null;
}

/** Tirar a meta (F3.90): a partir de um mês, sem meta. */
export const tirarMetaSchema = z.object({ mes: z.string().nullish() });

/** A pasta dos comprovantes pronta para baixar: cada parte com um link de 60 segundos. */
export interface PastaParaBaixar {
  pasta: { arquivos: number; tamanho: number; partes: { nome: string; tamanho: number; arquivos: number; url: string }[] } | null;
}

/** Pessoa de contato: e-mail com o final (como .com.br). */
export const emailCompleto = (t: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(t.trim());

export interface MesCaixa {
  mes: string;
  /** F3.51: a coluna Empréstimos, já tirada das saídas; o saldo já a conta. */
  emprestimos?: EmprestimosDoMes;
  /** Já somado em entradasPrevistas: a parte do escritório nos RPVs e precatórios a caminho (F3.48). */
  aCaminho?: number;
  entradasPrevistas: number;
  entradasRealizadas: number | null;
  saidasPrevistas: number;
  saidasRealizadas: number | null;
  saldo: number;
}

export interface CaixaFinanceiro {
  hoje: string;
  mes: string;
  saldo: number;
  fechaMes: number;
  terceiros: TerceirosNaConta;
  meses: MesCaixa[];
  /** F3.48: a parte do escritório nos RPVs e precatórios a caminho. */
  aCaminho: ACaminho;
  exportacoes: { id?: string; mes: string; formato: FormatoExportacao; em: string; por: PessoaRef | null; envio?: EnvioContador | null }[];
  mesesExportar: string[];
  /** F3.50: onde o saldo começa, o contador e o próximo lembrete do dia 5. */
  abertura?: SaldoAbertura | null;
  contador?: Pick<Contador, "nome" | "firma" | "email" | "mandarAoExportar" | "lembrarDia5"> | null;
  lembrete?: string | null;
  dono?: boolean;
  /** F3.51: a folha "Empréstimos · à parte". */
  emprestimos?: EmprestimosCaixa;
}

export const FORMATOS_EXPORTACAO = { XLSX: "Planilha (.xlsx)", CSV: "Só a planilha (.csv)" } as const;
export type FormatoExportacao = keyof typeof FORMATOS_EXPORTACAO;

export const exportarSchema = z.object({
  mes: z.string().regex(/^\d{4}-\d{2}-01$/).nullish(),
  formato: z.enum(["XLSX", "CSV"]).nullish(),
});
export type Exportar = z.input<typeof exportarSchema>;

export interface PreviaExportacao {
  mes: string;
  aberto: boolean;
  recebimentos: { n: number; valor: number };
  honorariosTransferidos: { n: number; valor: number };
  despesas: { n: number; valor: number };
  recibos: number;
  terceiros: { entrou: number; repassado: number };
  /** F3.51: os empréstimos recebidos e as parcelas pagas no mês, que vão numa aba à parte. */
  emprestimos?: {
    recebidos: { n: number; valor: number };
    parcelas: { n: number; valor: number; devolucoes: number; semComprovante: number };
  };
}

export interface DadosExportacao {
  id: string;
  mes: string;
  /** F3.50: o saldo do caixa do escritório no começo e no fim do mês. */
  saldoInicio?: number;
  saldoFim?: number;
  formato: FormatoExportacao;
  escritorio: string;
  recebimentos: {
    dia: string; cliente: string; contrato: string | null; parcela: string; tipo: TipoHonorario | "REEMBOLSO";
    referencia: string; forma: FormaPagamento; valor: number; multaJuros: number; recibo: string | null;
  }[];
  despesas: {
    dia: string; vencimento: string; descricao: string; fornecedor: string | null; categoria: CategoriaSaida;
    forma: FormaPagamento | null; valor: number; recorrente: boolean; cliente: string | null;
  }[];
  terceiros: {
    entrouEm: string; tipo: TipoLevantamento; cliente: string; caso: string; levantado: number;
    para: ParaDestinacao; nome: string; valor: number; feitoEm: string | null; situacao: "FEITO" | "DISPENSADO" | "PENDENTE";
  }[];
  /** F3.51: a aba Empréstimos. As parcelas já não estão em despesas. */
  emprestimos?: EmprestimosExportacao;
}

/** Os tipos de honorário agrupados como o Resumo mostra (decisão 2, IN-10). */
export const GRUPOS_RECEITA = {
  CONTRATUAL: { nome: "Contratual", tipos: ["FIXO", "PARCELADO"] },
  MENSALIDADES: { nome: "Mensalidades", tipos: ["MENSAL", "RECORRENTE"] },
  EXITO: { nome: "Êxito", tipos: ["EXITO", "SUCUMBENCIA"] },
  ATO: { nome: "Por ato e consultas", tipos: ["ATO"] },
} as const satisfies Record<string, { nome: string; tipos: readonly TipoHonorario[] }>;
export type GrupoReceita = keyof typeof GRUPOS_RECEITA;

export interface ReceitaGrupo { grupo: GrupoReceita; nome: string; valor: number; anteriores: number; restante: number }

/** O recebido do mês por grupo, do maior para o menor; grupos sem nada nos 4 meses ficam de fora. */
export function receitaPorGrupo(porTipo: ResumoFinanceiro["porTipo"]): ReceitaGrupo[] {
  return (Object.keys(GRUPOS_RECEITA) as GrupoReceita[])
    .map((grupo) => {
      const tipos: readonly string[] = GRUPOS_RECEITA[grupo].tipos;
      const deles = porTipo.filter((t) => tipos.includes(t.tipo));
      const soma = (k: "valor" | "anteriores" | "restante") => deles.reduce((s, t) => s + t[k], 0);
      return { grupo, nome: GRUPOS_RECEITA[grupo].nome, valor: soma("valor"), anteriores: soma("anteriores"), restante: soma("restante") };
    })
    .filter((g) => g.valor > 0 || g.anteriores > 0)
    .sort((a, b) => b.valor - a.valor);
}

/** Abaixo de 70% da média dos três meses anteriores, mesmo que tudo o que falta no mês entre. */
export const LIMITE_QUEDA = 0.7;

export interface AlertaQueda { grupo: GrupoReceita; nome: string; valor: number; media: number; pct: number }

/** O alerta de queda (IN-09): o grupo que mais caiu contra a média dos três meses anteriores. */
export function alertaDeQueda(grupos: ReceitaGrupo[]): AlertaQueda | null {
  const caidos = grupos
    .map((g) => ({ g, media: Math.round(g.anteriores / 3) }))
    .filter(({ g, media }) => media > 0 && g.valor + g.restante < media * LIMITE_QUEDA)
    .map(({ g, media }) => ({ grupo: g.grupo, nome: g.nome, valor: g.valor, media, pct: Math.round((1 - g.valor / media) * 100) }));
  return caidos.sort((a, b) => b.pct - a.pct || b.media - a.media)[0] ?? null;
}

/** Quem espera o dinheiro de terceiros: "2 clientes, 1 perito e 1 parceiro". */
export function quemEspera(t: TerceirosNaConta): string {
  const n = (q: number, um: string, varios: string) => (q ? `${q} ${q === 1 ? um : varios}` : null);
  const partes = [
    n(t.clientes, "cliente", "clientes"),
    n(t.peritos, "perito", "peritos"),
    n(t.parceiros, "parceiro", "parceiros"),
    n(t.outros, "outra pessoa", "outras pessoas"),
  ].filter((x): x is string => !!x);
  if (partes.length <= 1) return partes[0] ?? "";
  return `${partes.slice(0, -1).join(", ")} e ${partes[partes.length - 1]}`;
}

// ---------------------------------------------------------------------------------------
// Empréstimos (F3.51; FI-20). Regras em 0940_emprestimos.sql e 0941_emprestimos_caixa_contador.sql.
// O empréstimo fica à parte, como os valores de terceiros: entra no saldo do Caixa, mas não é receita.

/** De quem é o empréstimo. */
export const CREDORES_EMPRESTIMO = { BANCO: "Banco", SOCIO: "Sócio", OUTRO: "Outro" } as const;
export type CredorEmprestimo = keyof typeof CREDORES_EMPRESTIMO;

/** Como o escritório devolve. */
export const DEVOLUCAO_EMPRESTIMO = { PARCELAS: "Em parcelas", LIVRE: "Devolve quando der" } as const;
export type DevolucaoEmprestimo = keyof typeof DEVOLUCAO_EMPRESTIMO;

/** A situação num dia: a ficha usa hoje; o contador, o último dia do mês exportado. */
export const SITUACAO_EMPRESTIMO = { ATIVO: "Ativo", QUITADO: "Quitado", ENCERRADO: "Encerrado", CANCELADO: "Lançado errado" } as const;
export type SituacaoEmprestimo = keyof typeof SITUACAO_EMPRESTIMO;

/** Registrar empréstimo. "parcelas" traz o valor de cada parcela, quando a pessoa troca algum antes de gravar (S2). */
export const registrarEmprestimoSchema = z.object({
  credorTipo: txt(10),
  credorNome: txt(200),
  finalidade: txt(200),
  valor: z.number().int().nullish(),
  valorContrato: z.number().int().nullish(),
  recebidoEm: txt(20),
  forma: txt(30),
  devolucao: txt(10),
  parcelasTotal: z.number().int().nullish(),
  parcelaValor: z.number().int().nullish(),
  parcelasAntes: z.number().int().nullish(),
  proximoVencimento: txt(20),
  parcelas: z.array(z.object({ n: z.number().int(), valor: z.number().int() })).max(120).nullish(),
});
export type RegistrarEmprestimo = z.input<typeof registrarEmprestimoSchema>;

/** Registrar devolução (só sem parcelas fixas). */
export const devolucaoEmprestimoSchema = z.object({ valor: z.number().int().nullish(), pagaEm: txt(20), forma: txt(30) });
export type DevolucaoEmprestimoPedido = z.input<typeof devolucaoEmprestimoSchema>;

/** Encerrar as parcelas que faltam e "Lançado errado": o motivo, de 5 a 300 caracteres. */
export const motivoEmprestimoSchema = z.object({ motivo: z.string().max(400).nullish() });

/** O selo da conta de A pagar que é parcela ou devolução de empréstimo. */
export interface ContaDoEmprestimo {
  id: string;
  parcela: number | null;
  total: number | null;
  credor: string;
  credorTipo: CredorEmprestimo;
  devolucao: boolean;
}

export interface SituacaoDoEmprestimo {
  dia: string;
  situacao: SituacaoEmprestimo;
  /** Pago antes do T3jus, estimado pelo valor da parcela. */
  pagoAntes: number;
  pagoNoT3jus: number;
  jaPago: number;
  /** Em parcelas, a soma das em aberto; sem parcelas fixas, o falta devolver. Zero no encerrado e no cancelado. */
  faltaPagar: number;
  faltaDevolver: number | null;
  /** Sem parcelas fixas e encerrado com valor não devolvido. */
  naoDevolvido: number | null;
  parcelasPagas: number | null;
  parcelasAbertas: number | null;
  /** As parcelas canceladas ao encerrar ou ao marcar como lançado errado. */
  canceladas: { n: number; valor: number } | null;
  devolucoes: number | null;
  proxima: { id: string; n: number; vencimento: string; valor: number } | null;
  terminaEm: string | null;
  ultimoPagamento: string | null;
  totalParcelas: number | null;
  /** O total das parcelas menos o que entrou; sem parcelas fixas, o devolvido além do que entrou. */
  custo: number;
}

export interface Emprestimo {
  id: string;
  credorTipo: CredorEmprestimo;
  credor: string;
  finalidade: string | null;
  valor: number;
  valorContrato: number | null;
  /** Valor do contrato menos o que entrou (S3). */
  iofTarifas: number | null;
  recebidoEm: string;
  forma: FormaPagamento | null;
  devolucao: DevolucaoEmprestimo;
  parcelasTotal: number | null;
  parcelasAntes: number;
  parcelaValor: number | null;
  /** Conta no saldo do Caixa. */
  noCaixa: boolean;
  anteriorAoT3jus: boolean;
  /** Por que está fora do saldo: entrou até o saldo de abertura (já está nele) ou antes do começo do caixa no T3jus. */
  foraDoCaixa: "ANTES_DA_ABERTURA" | "ANTES_DO_T3JUS" | null;
  registrado: { em: string; por: PessoaRef | null };
  encerrado: { em: string; por: PessoaRef | null; motivo: string } | null;
  cancelado: { em: string; por: PessoaRef | null; motivo: string } | null;
  situacao: SituacaoDoEmprestimo;
}

export interface EmprestimoRegistrado extends Emprestimo { parcelasCriadas: number }

export interface FichaEmprestimo extends Emprestimo {
  parcelas: (ContaPagar & { n: number; anexos: number })[];
  devolucoes: (ContaPagar & { anexos: number })[];
  historico: { acao: string; em: string; por: PessoaRef | null; dados: Record<string, unknown> }[];
}

export interface DevolucaoRegistrada { id: string; acimaDoQueFalta: number; emprestimo: Emprestimo }

/** A coluna Empréstimos de um mês do Caixa: + o que entrou, − as parcelas e devoluções. */
export interface EmprestimosDoMes {
  entrou: number;
  parcelasPrevistas: number;
  parcelasRealizadas: number | null;
  liquidoPrevisto: number;
  liquidoRealizado: number | null;
}

/** A folha "Empréstimos · à parte" do Caixa. */
export interface EmprestimosCaixa {
  /** Algum empréstimo não cancelado: a coluna do mês a mês só aparece com ele. */
  algum: boolean;
  n: number;
  /** Soma o falta pagar dos bancos e o falta devolver do sócio. */
  faltaPagar: number;
  /** O líquido dos empréstimos que está no saldo de hoje (o que entrou menos o que foi pago). */
  noSaldo: number;
  /** De quando o empréstimo entra no caixa, e o primeiro lançamento, para o aviso "entrou antes do T3jus?". */
  comecoCaixa: string | null;
  primeiroLancamento: string | null;
  lista: Emprestimo[];
}

export interface EmprestimosExportacao {
  recebidos: {
    dia: string; credorTipo: CredorEmprestimo; credor: string; finalidade: string | null; forma: FormaPagamento | null;
    valor: number; valorContrato: number | null;
  }[];
  parcelas: {
    pagoEm: string; vencimento: string; credorTipo: CredorEmprestimo; credor: string; parcela: number | null; total: number | null;
    devolucao: boolean; forma: FormaPagamento | null; valor: number; comprovante: boolean;
  }[];
  situacao: (SituacaoDoEmprestimo & {
    credorTipo: CredorEmprestimo; credor: string; finalidade: string | null; devolucao: DevolucaoEmprestimo; recebidoEm: string;
    valor: number; valorContrato: number | null; anteriorAoT3jus: boolean; parcelasTotal: number | null;
  })[];
}

const dataUtc = (d: string) => new Date(`${d.slice(0, 10)}T00:00:00Z`);
const textoData = (d: Date) => d.toISOString().slice(0, 10);

/** O vencimento no mês: o dia, ou o último dia de um mês mais curto (vencimento_no_mes, 0230). */
export function vencimentoNoMes(mes: string, dia: number): string {
  const m = dataUtc(mes);
  const ultimo = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 0)).getUTCDate();
  return textoData(new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth(), Math.min(dia, ultimo))));
}

/** O vencimento da parcela n, quando a próxima a pagar (a antes + 1) vence em proximo (emprestimo_vencimento, 0940). */
export function vencimentoDaParcela(proximo: string, antes: number, n: number): string {
  const p = dataUtc(proximo);
  const mes = new Date(Date.UTC(p.getUTCFullYear(), p.getUTCMonth() + (n - antes - 1), 1));
  return vencimentoNoMes(textoData(mes), p.getUTCDate());
}

/** As parcelas que nascem em A pagar: da antes + 1 até o total, com o valor sugerido ou o trocado (S2). */
export function parcelasDoEmprestimo(e: {
  total: number; antes: number; valor: number; proximo: string; valores?: { n: number; valor: number }[] | null;
}): { n: number; vencimento: string; valor: number }[] {
  const trocados = new Map((e.valores ?? []).map((x) => [x.n, x.valor]));
  const saida: { n: number; vencimento: string; valor: number }[] = [];
  for (let n = e.antes + 1; n <= e.total; n++) {
    saida.push({ n, vencimento: vencimentoDaParcela(e.proximo, e.antes, n), valor: trocados.get(n) ?? e.valor });
  }
  return saida;
}

/**
 * O custo do empréstimo num número só (C3): o pago antes do T3jus (estimado), mais as parcelas pagas e
 * em aberto, menos o que entrou. Sem parcelas fixas, o devolvido além do que entrou, nunca abaixo de zero.
 */
export function custoEmprestimo(e: {
  valor: number; devolucao: DevolucaoEmprestimo; parcelasAntes?: number; parcelaValor?: number | null; parcelas?: number[]; devolvido?: number;
}): number {
  if (e.devolucao === "LIVRE") return Math.max((e.devolvido ?? 0) - e.valor, 0);
  const antes = (e.parcelasAntes ?? 0) * (e.parcelaValor ?? 0);
  return antes + (e.parcelas ?? []).reduce((s, x) => s + x, 0) - e.valor;
}

export interface SugestaoParcelasAntes {
  /** O vencimento da última parcela que já venceu: "As parcelas até mm/aaaa já foram pagas?". */
  ate: string;
  /** Nenhuma fica vencida; nulo quando todas já venceram. */
  nenhuma: { antes: number; n: number; proximo: string } | null;
  /** Uma fica em aberto, como vencida. */
  umaVencida: { antes: number; n: number; proximo: string };
}

/**
 * Quando a próxima parcela cai mais de 1 mês antes de hoje (C6), sugere quantas foram pagas antes: a
 * conta que deixa nenhuma vencida e a que deixa uma. Nulo quando a próxima não está tão atrás.
 */
export function sugerirParcelasAntes(e: { total: number; antes: number; proximo: string; hoje: string }): SugestaoParcelasAntes | null {
  const h = dataUtc(e.hoje);
  const umMesAntes = vencimentoNoMes(textoData(new Date(Date.UTC(h.getUTCFullYear(), h.getUTCMonth() - 1, 1))), h.getUTCDate());
  if (e.proximo >= umMesAntes) return null;
  let vencidas = 0;
  for (let n = e.antes + 1; n <= e.total && vencimentoDaParcela(e.proximo, e.antes, n) < e.hoje; n++) vencidas++;
  if (vencidas === 0) return null;
  const opcao = (antes: number) => ({ antes, n: antes + 1, proximo: vencimentoDaParcela(e.proximo, e.antes, antes + 1) });
  return {
    ate: vencimentoDaParcela(e.proximo, e.antes, e.antes + vencidas),
    nenhuma: e.antes + vencidas <= e.total - 1 ? opcao(e.antes + vencidas) : null,
    umaVencida: opcao(e.antes + vencidas - 1),
  };
}
