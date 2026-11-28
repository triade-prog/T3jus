// Interessados (F2.2, F2.3; SC-02, SC-05): o pedido de demonstração do site e o Console ›
// Comercial › Interessados. Os mesmos valores estão no banco (0580_interessados.sql).
// Desenho aprovado: docs/design/aprovadas/site-comercial.

import { z } from "zod";
import { UFS } from "./console.ts";

export const ESTAGIOS_INTERESSADO = {
  NOVO: "Novo",
  EM_CONTATO: "Em contato",
  DEMONSTRACAO: "Demonstração marcada",
  PROPOSTA: "Proposta enviada",
  CLIENTE: "Virou cliente",
  PERDIDO: "Perdido",
  DESCARTADO: "Descartado",
} as const;
export type EstagioInteressado = keyof typeof ESTAGIOS_INTERESSADO;

/** Os estágios que se escolhem em "Mudar estágio"; os outros têm botão próprio. */
export const ESTAGIOS_ABERTOS = ["NOVO", "EM_CONTATO", "DEMONSTRACAO", "PROPOSTA"] as const;
export const ESTAGIOS_FECHADOS = ["CLIENTE", "PERDIDO", "DESCARTADO"] as const;

export const ORIGENS_INTERESSADO = {
  SITE: "Site",
  INDICACAO: "Indicação",
  EVENTO: "Evento",
  CONTATO: "Contato direto",
} as const;
export type OrigemInteressado = keyof typeof ORIGENS_INTERESSADO;

export const TAMANHOS_INTERESSADO = {
  SO_EU: "Só eu",
  DE_2_A_5: "2 a 5",
  DE_6_A_10: "6 a 10",
  MAIS_DE_10: "Mais de 10",
} as const;
export type TamanhoInteressado = keyof typeof TAMANHOS_INTERESSADO;

/** "Por que não fechou" (desenho aprovado, janela Encerrar). */
export const PORQUES_PERDIDO = ["Escolheu outro sistema", "Achou caro", "Não é o momento", "Parou de responder", "Falta algo que precisa", "Outro"] as const;
/** Descartado: os casos da legenda do desenho (teste, propaganda, repetido, fora do público). */
export const PORQUES_DESCARTADO = ["Pedido de teste", "Propaganda", "Pedido repetido", "Fora do público", "Outro"] as const;

const versao = z.number().int().min(1);
const motivo = z.string().trim().min(1).max(300);
const uuid = z.string().uuid();
const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

/** O pedido do site, como a api-console recebe do repasse do site (as regras finas estão no site e no banco). */
export const pedidoSiteSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  escritorio: z.string().trim().min(2).max(160),
  email: z.string().trim().toLowerCase().max(200).email(),
  whats: z.string().trim().min(10).max(20),
  tamanho: z.enum(["Só eu", "2 a 5", "6 a 10", "Mais de 10"]),
  area: z.string().trim().max(40).optional().default(""),
  msg: z.string().trim().max(1000).optional().default(""),
  aceite: z.literal(true),
  origem: z.object({
    pagina: z.string().max(120).optional(),
    referencia: z.string().max(400).optional(),
    campanha: z.string().max(120).optional(),
    fonte: z.string().max(120).optional(),
    meio: z.string().max(120).optional(),
  }).partial().optional(),
});
export type PedidoSite = z.infer<typeof pedidoSiteSchema>;

export const responsavelInteressadoSchema = z.object({ versao, pessoaId: uuid, recado: z.string().trim().max(300).optional() });

export const proximoInteressadoSchema = z.object({
  versao,
  passo: z.string().trim().min(2).max(160),
  data,
  hora: hora.nullable().optional(),
  quem: uuid,
});

export const cidadeInteressadoSchema = z.object({ versao, cidade: z.string().trim().min(2).max(80), uf: z.enum(UFS) });

export const estagioInteressadoSchema = z.object({
  versao,
  estagio: z.enum(ESTAGIOS_ABERTOS),
  motivo,
  data: data.optional(),
  hora: hora.optional(),
});

export const encerrarInteressadoSchema = z.object({
  versao,
  como: z.enum(["PERDIDO", "DESCARTADO"]),
  porque: z.string().trim().min(2).max(60),
  motivo,
  procurarEm: data.optional(),
});

export const reabrirInteressadoSchema = z.object({ versao, motivo });

export const notaInteressadoSchema = z.object({ texto: z.string().trim().min(1).max(2000) });

/**
 * Cadastrar interessado à mão (F2.5, SC-05): indicação, evento ou contato direto. Pelo menos
 * e-mail ou WhatsApp (decisão 1); a base é o legítimo interesse, com a origem (decisão 2). As
 * regras finas (formato, data até hoje, quem pode ser responsável) são do banco, campo a campo.
 */
export const ORIGENS_MAO = ["INDICACAO", "EVENTO", "CONTATO"] as const;
const dadosMao = {
  nome: z.string().trim().max(120),
  escritorio: z.string().trim().max(160),
  email: z.string().trim().max(200).optional().default(""),
  whats: z.string().trim().max(30).optional().default(""),
  tamanho: z.string().max(20),
  area: z.string().trim().max(40).optional().default(""),
  cidade: z.string().trim().max(80).optional().default(""),
  uf: z.string().max(2).optional().default(""),
  origem: z.string().max(20),
  detalhe: z.string().trim().max(200),
  quando: z.string().max(10),
  mensagem: z.string().trim().max(1000).optional().default(""),
  sabe: z.boolean().nullable(),
};
export const cadastrarInteressadoSchema = z.object({
  ...dadosMao,
  responsavel: z.string().max(36),
  passo: z.string().trim().max(160),
  passoData: z.string().max(10),
  /** "É outro escritório: cadastrar mesmo assim" (decisão 3). */
  forcar: z.boolean().optional().default(false),
});
export const juntarInteressadoSchema = z.object(dadosMao);

/** O interessado parecido que o banco devolve no lugar de cadastrar. */
export interface InteressadoRepetido {
  id: string;
  nome: string;
  escritorio: string;
  estagio: EstagioInteressado;
  origem: OrigemInteressado;
  cidade: string | null;
  uf: string | null;
  chegouEm: string;
  email: string | null;
  whats: string | null;
  versao: number;
  campo: "email" | "whats";
  responsavel: string | null;
}
export type RespostaCadastroInteressado = { id: string } | { repetido: InteressadoRepetido };

export const converterInteressadoSchema = z.object({
  versao,
  nome: z.string().trim().min(2).max(160),
  cidade: z.string().trim().min(2).max(80),
  uf: z.enum(UFS),
  motivo,
});

export interface PessoaInteressados {
  id: string;
  nome: string;
  funcoes: string[];
}

export interface Interessado {
  id: string;
  estagio: EstagioInteressado;
  origem: OrigemInteressado;
  nome: string;
  escritorio: string;
  /** Pelo menos um dos dois (o pedido do site tem os dois). */
  email: string | null;
  whats: string | null;
  tamanho: TamanhoInteressado;
  area: string | null;
  cidade: string | null;
  uf: string | null;
  chegouEm: string;
  /** O próximo dia útil depois da chegada: o prazo de resposta que o site promete. */
  prazoResposta: string;
  responsavel: { id: string; nome: string } | null;
  proximo: { passo: string; data: string | null; hora: string | null; quem: { id: string; nome: string } | null } | null;
  fim: { em: string; porque: string; motivo: string } | null;
  clienteEscritorio: string | null;
  ultimoContatoEm: string;
  versao: number;
}

export interface ListaInteressados {
  hoje: string;
  podeEditar: boolean;
  interessados: Interessado[];
  pessoas: PessoaInteressados[];
  mes: { pedidos: number; site: number; clientes: number };
}

export interface EventoInteressado {
  id: number;
  ocorridoEm: string;
  acao: string;
  dados: Record<string, unknown>;
  autor: { id: string; nome: string } | null;
}

export interface FichaInteressado extends Interessado {
  hoje: string;
  mensagem: string | null;
  cidadeCompletadaEm: string | null;
  autorizacao: { texto: string; versao: number; aceita_em: string; pagina: string } | null;
  origemDetalhe: Record<string, string> | null;
  baseLegal: "CONSENTIMENTO" | "LEGITIMO_INTERESSE";
  /** Cadastro à mão: se a pessoa sabe que vamos procurá-la. */
  sabeDoContato: boolean | null;
  cadastradoPor: string | null;
  cadastradoEm: string | null;
  responsavelDesde: string | null;
  responsavelPor: string | null;
  clienteNome: string | null;
  apagarEm: string | null;
  podeEditar: boolean;
  pessoas: PessoaInteressados[];
  notas: { id: string; texto: string; criadoEm: string; autor: { id: string; nome: string } }[];
  historico: EventoInteressado[];
}

/** O WhatsApp guardado (+5586998124410) do jeito que se lê: (86) 99812-4410. */
export function whatsLegivel(v: string): string {
  const d = v.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return v;
}

// ---------------------------------------------------------------- sino do Console (F2.6)

export type TipoAvisoConsole = "INTERESSADO_NOVO" | "INTERESSADO_ATRIBUIDO" | "INTERESSADO_VENCIDO" | "FATURA_ATRASO"
  /** O teste grátis (F1.34, CO-09). */
  | "TESTE_COMECOU" | "TESTE_ACABANDO" | "TESTE_ACABOU" | "TESTE_QUER_ASSINAR" | "TESTE_REPETIDO";

export interface AvisoConsole {
  id: string;
  tipo: TipoAvisoConsole;
  /** A foto do momento: nomes, trecho, recado, passo e data. */
  dados: {
    escritorio?: string;
    nome?: string;
    tamanho?: TamanhoInteressado;
    trecho?: string;
    prazo?: string;
    quem?: string;
    recado?: string;
    cadastro?: boolean;
    passo?: string;
    data?: string;
    responsavel?: string;
    /** Fatura em atraso (F1.22): o marco da régua (7 dias, aviso no Portal; 30, proposta de só consulta). */
    escritorioId?: string;
    numero?: string;
    competencia?: string;
    vencimento?: string;
    totalCentavos?: number;
    dias?: number;
    marco?: "AVISO" | "CONSULTA";
    /** O teste grátis (F1.34): as datas, se a assinatura está preparada (e o plano), se foi prorrogado,
     *  o pedido (quando, se há recado, urgente no dia 7) e o teste anterior do repetido. "quem" é o
     *  sócio do primeiro acesso, do pedido ou da repetição. */
    inicio?: string; fim?: string; totalDias?: number; faltamDias?: number; soConsultaDesde?: string;
    origem?: "PRIMEIRO_ACESSO" | "LIBERADO"; assinaturaPreparada?: boolean; plano?: string | null; prorrogado?: boolean;
    querAssinarEm?: string | null; pedidoEm?: string; comRecado?: boolean; urgente?: boolean; ultimoDia?: boolean; acabou?: boolean;
    lembrete?: boolean; proposta?: "ENCERRAR"; anteriorId?: string; anterior?: string; anteriorInicio?: string; anteriorFim?: string;
  };
  interessadoId: string | null;
  /** Fatura em atraso: a fatura do aviso. */
  faturaId?: string | null;
  em: string;
  lido: boolean;
  /** Pedido novo: quem cuida agora (null se ninguém). */
  agora: string | null;
}

export interface ListaAvisosConsole {
  novos: number;
  total: number;
  veInteressados: boolean;
  /** Vê Cobrança (Administração e Financeiro): recebe o aviso de fatura em atraso. */
  veCobranca?: boolean;
  itens: AvisoConsole[];
  marcados?: number;
}
