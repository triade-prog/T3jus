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
  /** O que o escritório adiantou nos casos do contrato (F3.23). */
  adiantados: ContaPagar[];
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
  situacao: "A_VENCER" | "VENCIDA" | "PAGA";
  recorrente: { dia: number; mes: string; lancadaSozinha: boolean } | null;
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
  /** O acerto do caso, para o fechamento (F3.45). */
  acerto: AcertoCaso;
}

/** O que ainda segura o fechamento do caso no financeiro (F3.45, FI-08). */
export interface PendenciaCaso {
  tipo: "REPASSE" | "PARCELA" | "PARCELA_SEM_VALOR" | "REEMBOLSO";
  nome: string;
  valor: number | null;
  para?: ParaDestinacao;
  prazo?: string;
  vencimento?: string;
  levantamentoId?: string;
  contratoId?: string;
  contaId?: string;
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
  meses: { mes: string; previsto: number; realizado: number }[];
  porTipo: { tipo: TipoHonorario; valor: number; anteriores: number; restante: number }[];
  contratado: { n: number; valor: number };
  clientesReceberam: { n: number; valor: number };
  fixas: { receita: number; despesas: number };
}

export interface MesCaixa {
  mes: string;
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
  exportacoes: { mes: string; formato: FormatoExportacao; em: string; por: PessoaRef | null }[];
  mesesExportar: string[];
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
}

export interface DadosExportacao {
  id: string;
  mes: string;
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
