// Jurídico do Portal, parte 1 (EX-01, EX-03, EX-07, EX-14, CH-05): etapas do escritório, casos
// com os clientes e os contratos, ficha e mudar etapa com motivo e aviso ao cliente. As regras
// estão no banco (0240_portal_juridico_casos.sql); aqui o esquema só confere a forma do pedido.

import { z } from "zod";
import type { PessoaRef } from "./clientes.ts";
import type { Condicao } from "./honorarios.ts";
import type { SituacaoContrato } from "./contratos.ts";
import { TAMANHO_MAXIMO_DOCUMENTO, TIPOS_DOCUMENTO, type TipoDocumento } from "./console.ts";

export const AREAS_DIREITO = {
  TRABALHISTA: "Trabalhista",
  CIVEL: "Cível",
  CONSUMIDOR: "Consumidor",
  FAMILIA: "Família",
  PREVIDENCIARIO: "Previdenciário",
  SAUDE: "Saúde",
  TRIBUTARIO: "Tributário",
  OUTRA: "Outra",
} as const;
export type AreaDireito = keyof typeof AREAS_DIREITO;

export const PAPEIS_CASO = { AUTOR: "Autor(a)", REU: "Réu ou ré", INTERESSADO: "Interessado(a)" } as const;
export type PapelCaso = keyof typeof PAPEIS_CASO;

export const RESULTADOS_CASO = { GANHO: "Ganho", PERDA: "Perda", ACORDO: "Acordo" } as const;
export type ResultadoCaso = keyof typeof RESULTADOS_CASO;

export const SITUACOES_CASO = ["ANDAMENTO", "ENCERRADO"] as const;
export type SituacaoCaso = (typeof SITUACOES_CASO)[number];

/** Só os dígitos do número do processo. */
export function digitosCnj(numero: string): string {
  return numero.replace(/\D/g, "");
}

/** Número no padrão do CNJ (Resolução 65/2008), com os dígitos verificadores pelo módulo 97. */
export function numeroCnjValido(numero: string): boolean {
  const d = digitosCnj(numero);
  if (d.length !== 20) return false;
  const resto = BigInt(d.slice(0, 7) + d.slice(9, 20) + "00") % 97n;
  return Number(d.slice(7, 9)) === 98 - Number(resto);
}

/** NNNNNNN-DD.AAAA.J.TR.OOOO a partir dos 20 dígitos. */
export function formatarCnj(numero: string | null | undefined): string {
  const d = digitosCnj(numero ?? "");
  if (d.length !== 20) return numero ?? "";
  return `${d.slice(0, 7)}-${d.slice(7, 9)}.${d.slice(9, 13)}.${d.slice(13, 14)}.${d.slice(14, 16)}.${d.slice(16)}`;
}

const id = z.string().max(40).nullish();
const texto = (max: number) => z.string().max(max).nullish();

export const clienteDoCasoSchema = z.object({ clienteId: id, papel: texto(20), contratoId: id });
export type ClienteDoCaso = z.input<typeof clienteDoCasoSchema>;

export const dadosCasoSchema = z.object({
  nome: texto(200),
  area: texto(30),
  parteContraria: texto(200),
  numero: texto(40),
  tribunal: texto(80),
  vara: texto(160),
  sistema: texto(60),
  distribuidoEm: texto(20),
  valorCausa: z.number().int().nullish(),
  responsavelId: id,
  avisarCliente: z.boolean().nullish(),
});

export const criarCasoSchema = dadosCasoSchema.extend({
  etapaId: id,
  clientes: z.array(clienteDoCasoSchema).max(20).default([]),
});
export type CriarCaso = z.input<typeof criarCasoSchema>;

export const editarCasoSchema = dadosCasoSchema.extend({ versao: z.number().int().min(1) });
export type EditarCaso = z.input<typeof editarCasoSchema>;

export const mudarEtapaSchema = z.object({
  versao: z.number().int().min(1),
  etapaId: id,
  motivo: texto(1000),
  avisar: z.boolean().default(false),
  textoAviso: texto(400),
  resultado: texto(20),
});
export type MudarEtapa = z.input<typeof mudarEtapaSchema>;

export const filtroCasosSchema = z.object({
  situacao: z.enum(SITUACOES_CASO).default("ANDAMENTO"),
  q: texto(120),
  responsavel: id,
  etapa: id,
});

export interface Etapa {
  id: string;
  ordem: number;
  nome: string;
  descricao: string | null;
  textoCliente: string;
  avisaFinanceiro: boolean;
  final: boolean;
  casos: number;
}

export interface LinhaCaso {
  id: string;
  nome: string;
  area: AreaDireito;
  numero: string | null;
  situacao: SituacaoCaso;
  resultado: ResultadoCaso | null;
  parteContraria: string | null;
  cliente: PessoaRef | null;
  outrosClientes: number;
  semContrato: boolean;
  etapa: { id: string; ordem: number; nome: string; final: boolean };
  responsavel: PessoaRef;
  etapaDesde: string;
  proximoPrazo: { data: string; fazerAte: string | null; descricao: string } | null;
  pendencias: number;
}

export interface ListaCasos {
  /** O dia de hoje em Brasília, para a urgência dos prazos. */
  hoje: string;
  etapas: Etapa[];
  totais: { andamento: number; encerrados: number; prazoHoje: number };
  responsaveis: PessoaRef[];
  souDono: boolean;
  casos: LinhaCaso[];
}

export interface OpcoesCaso {
  etapas: Etapa[];
  contratos: { id: string; numero: string; clienteId: string; situacao: SituacaoContrato; assinadoEm: string | null }[];
}

export interface ClienteNoCaso {
  id: string;
  nome: string;
  papel: PapelCaso;
  telefone: string | null;
  contrato: { id: string; numero: string; situacao: SituacaoContrato; assinadoEm: string | null; condicoes: Condicao[] | null } | null;
}

export interface MudancaEtapa {
  para: { ordem: number; nome: string };
  de: { ordem: number; nome: string } | null;
  motivo: string;
  resultado: ResultadoCaso | null;
  aviso: string | null;
  avisoEnviadoEm: string | null;
  por: PessoaRef;
  em: string;
}

export interface FichaCaso extends LinhaCaso {
  tribunal: string | null;
  vara: string | null;
  sistema: string | null;
  distribuidoEm: string | null;
  valorCausa: number | null;
  avisarCliente: boolean;
  encerradoEm: string | null;
  versao: number;
  criadoEm: string;
  veHonorarios: boolean;
  clientes: ClienteNoCaso[];
  etapas: Etapa[];
  mudancas: MudancaEtapa[];
  quemTemContratos: string[];
  hoje: string;
  prazos: Prazo[];
  tarefas: Tarefa[];
  /** Nome do escritório, para o texto pronto de "Pedir de novo". */
  escritorio: string;
  faltam: DocumentoFaltando[];
  documentos: DocumentoDoCaso[];
}

/** O aviso ao cliente (decisão 5): começo e fim fixos, o meio é o texto da etapa. */
export function textoAvisoEtapa(cliente: string, escritorio: string, parteContraria: string | null, meio: string): string {
  const primeiro = cliente.trim().split(/\s+/)[0] ?? "";
  const contra = parteContraria?.trim() ? ` contra ${parteContraria.trim()}` : "";
  return `Olá, ${primeiro}. Aqui é do escritório ${escritorio}. Novidade no seu processo${contra}: ${meio.trim()} Qualquer dúvida, é só responder esta mensagem.`;
}

// ------------------------------------------------------------------------- Parte 2: prazos e tarefas
// (EX-02, EX-04, PD-05, IN-08; 0250_portal_juridico_prazos_tarefas.sql).

export const MOSTRAR_PRAZOS = ["ABERTOS", "MEUS", "CUMPRIDOS"] as const;
export type MostrarPrazos = (typeof MOSTRAR_PRAZOS)[number];
export const VISOES_TAREFAS = ["MINHAS", "EQUIPE"] as const;
export type VisaoTarefas = (typeof VISOES_TAREFAS)[number];

export const prazoSchema = z.object({
  casoId: id,
  descricao: texto(200),
  dataFinal: texto(20),
  fazerAte: texto(20),
  intimacaoEm: texto(20),
  responsavelId: id,
  lembrar: z.boolean().default(true),
});
export type NovoPrazo = z.input<typeof prazoSchema>;

/** Editar prazo (F3.39): os mesmos campos, menos o caso, pela versão lida. */
export const editarPrazoSchema = prazoSchema.omit({ casoId: true }).extend({ versao: z.number().int().min(1) });
export type EditarPrazo = z.input<typeof editarPrazoSchema>;

export const tarefaSchema = z.object({
  casoId: id,
  titulo: texto(200),
  venceEm: texto(20),
  responsavelId: id,
  esperando: texto(200),
});
export type NovaTarefa = z.input<typeof tarefaSchema>;

/** Editar tarefa (F3.39): os mesmos campos, menos o caso, pela versão lida. */
export const editarTarefaSchema = tarefaSchema.omit({ casoId: true }).extend({ versao: z.number().int().min(1) });
export type EditarTarefa = z.input<typeof editarTarefaSchema>;

export const concluirTarefaSchema = z.object({ concluir: z.boolean().default(true) });

export interface Prazo {
  id: string;
  descricao: string;
  dataFinal: string;
  fazerAte: string | null;
  intimacaoEm: string | null;
  lembrar: boolean;
  cumpridoEm: string | null;
  cumpridoPor: PessoaRef | null;
  responsavel: PessoaRef;
  versao: number;
  caso: { id: string; nome: string; numero: string | null; vara: string | null };
}

export interface Tarefa {
  id: string;
  titulo: string;
  venceEm: string;
  esperando: string | null;
  esperandoDesde: string | null;
  concluidaEm: string | null;
  concluidaPor: PessoaRef | null;
  responsavel: PessoaRef;
  versao: number;
  caso: { id: string; nome: string };
}

export interface ListaPrazos {
  hoje: string;
  totais: { abertos: number; meus: number; hoje: number };
  responsaveis: PessoaRef[];
  prazos: Prazo[];
}

export interface CargaPessoa {
  pessoa: PessoaRef;
  casos: number;
  tarefas: number;
  atrasadas: number;
}

export interface ListaTarefas {
  hoje: string;
  totais: { minhas: number; equipe: number; atrasadas: number; esperando: number };
  responsaveis: PessoaRef[];
  tarefas: Tarefa[];
  carga: CargaPessoa[] | null;
}

// ------------------------------------------------------------------------- Parte 3a: etapas e petições
// (EX-07, EX-09; 0260_portal_juridico_etapas_peticoes.sql).

export const etapaSchema = z.object({
  versao: z.number().int().nullish(),
  nome: texto(80),
  descricao: texto(240),
  textoCliente: texto(300),
  avisaFinanceiro: z.boolean().default(false),
});
export const moverEtapaSchema = z.object({ direcao: z.enum(["SOBE", "DESCE"]) });
export const removerEtapaSchema = z.object({ moverPara: id });

export interface EtapaEditavel extends Etapa {
  versao: number;
  encerrados: number | null;
}
export interface EtapasEscritorio {
  podeEditar: boolean;
  escritorio: string;
  etapas: EtapaEditavel[];
}

export const RESPOSTAS_PETICAO = {
  SEMANA: { titulo: "Usaria toda semana", texto: "O escritório tem modelos e perde tempo preenchendo dados" },
  AS_VEZES: { titulo: "Usaria às vezes", texto: "Só para peças repetidas, como iniciais de um mesmo tipo" },
  NAO: { titulo: "Não usaria", texto: "Escrevo cada peça do zero ou já uso outro programa" },
} as const;
export type RespostaPeticao = keyof typeof RESPOSTAS_PETICAO;
export const peticaoSchema = z.object({
  resposta: z.enum(["SEMANA", "AS_VEZES", "NAO"]).nullish(),
  comoFazHoje: texto(1200),
});
export interface RespostaPeticoes {
  resposta: RespostaPeticao;
  comoFazHoje: string | null;
  em: string;
}

// ------------------------------------------------------------------------- Parte 3b: documentos do caso
// (EX-05, PD-05; 0270_portal_juridico_documentos.sql).

export const CATEGORIAS_DOCUMENTO_CASO = {
  PETICAO: "Petição",
  DECISAO: "Decisão ou sentença",
  PROCURACAO: "Procuração",
  DOCUMENTO_CLIENTE: "Documento do cliente",
  OUTRO: "Outro",
} as const;
export type CategoriaDocumentoCaso = keyof typeof CATEGORIAS_DOCUMENTO_CASO;

export const pedirDocumentoSchema = z.object({
  descricao: texto(200),
  clienteId: id,
});

export const iniciarDocumentoCasoSchema = z.object({
  categoria: z.enum(Object.keys(CATEGORIAS_DOCUMENTO_CASO) as [CategoriaDocumentoCaso, ...CategoriaDocumentoCaso[]]),
  nome: z.string().trim().min(1).max(200).refine((n) => !/[/\\]/.test(n), { message: "Nome de arquivo inválido" }),
  tipo: z.enum(Object.keys(TIPOS_DOCUMENTO) as [TipoDocumento, ...TipoDocumento[]]),
  tamanho: z.number().int().min(1).max(TAMANHO_MAXIMO_DOCUMENTO),
  pedidoId: id.nullish(),
});

export interface DocumentoFaltando {
  id: string;
  descricao: string;
  pedidoEm: string;
  repedidoEm: string | null;
  cliente: { id: string; nome: string; telefone: string | null };
  pedidoPor: PessoaRef;
  /** O lembrete automático do documento pendente (PA-06), quando há automação ligada. */
  lembrete?: { automacao: { id: string; nome: string }; enviadoEm: string; ate: string | null; passaPara: PessoaRef | null } | null;
}

export interface DocumentoDoCaso {
  id: string;
  categoria: CategoriaDocumentoCaso;
  nome: string;
  tipo: TipoDocumento;
  tamanho: number;
  enviadoPor: PessoaRef;
  enviadoEm: string;
  /** O pedido que este arquivo atendeu, se veio de "Faltam". */
  pedido: string | null;
}

/** O texto pronto de "Pedir de novo", do jeito que o cliente vai receber. */
export function textoPedirDocumento(cliente: string, escritorio: string, parteContraria: string | null, descricao: string): string {
  const primeiro = cliente.trim().split(/\s+/)[0] ?? "";
  const contra = parteContraria?.trim() ? ` contra ${parteContraria.trim()}` : "";
  return `Olá, ${primeiro}. Aqui é do escritório ${escritorio}. Para o seu processo${contra} andar, ainda precisamos de: ${descricao.trim()}. Pode mandar uma foto ou o arquivo por aqui mesmo. Se já mandou, agradecemos e pode desconsiderar esta mensagem.`;
}
