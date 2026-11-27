// Implantação assistida (CO-08, F1.42 a F1.45). As regras estão no banco (1180_implantacao_regras.sql);
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

/** Formas do treino (1183, F1.45). */
export const FORMAS_TREINO = { VIDEO: "Vídeo", PRESENCIAL: "Presencial", TELEFONE: "Telefone" } as const;
export type FormaTreino = keyof typeof FORMAS_TREINO;

/** As áreas do Portal que o treino pode cobrir (a lista do desenho; `implantacao_temas()` no banco). */
export const TEMAS_TREINO = {
  INICIO: "Início", CLIENTES: "Clientes", CONVERSAS: "Conversas", AGENDA: "Agenda", COMERCIAL: "Comercial",
  CONTRATOS: "Contratos", FINANCEIRO: "Financeiro", JURIDICO: "Jurídico", DOCUMENTOS: "Documentos", ESCRITORIO: "Escritório e equipe",
} as const;
export type TemaTreino = keyof typeof TEMAS_TREINO;

const uuid = z.string().uuid();

/** POST /v1/clientes/:id/implantacao/treinos (F1.45). Quem deu vem da sessão, nunca do corpo. O
 * esquema só confere o formato: o dia de hoje ou antes, a duração de 15 a 480 minutos, a forma,
 * quem participou (com acesso ao Portal do escritório) e os temas são conferidos no banco, que
 * devolve os campos juntos. */
export const implantacaoTreinoSchema = z.object({
  dia: dataIso,
  duracaoMin: z.number().int(),
  forma: z.string().max(20),
  pessoas: z.array(uuid).max(100),
  temas: z.array(z.string().max(30)).max(20).default([]),
});
export type ImplantacaoTreinoEntrada = z.infer<typeof implantacaoTreinoSchema>;

/** POST /v1/clientes/:id/implantacao/treinos/:treino/desfazer (F1.45): o motivo, que fica no histórico interno. */
export const implantacaoTreinoDesfazerSchema = z.object({ motivo: z.string().max(600) });
export type ImplantacaoTreinoDesfazerEntrada = z.infer<typeof implantacaoTreinoDesfazerSchema>;

/** PUT /v1/clientes/:id/implantacao/responsavel (F1.45): quem acompanha, com a versão lida da implantação. */
export const implantacaoResponsavelSchema = z.object({ responsavelId: uuid, versao: z.number().int().min(1) });
export type ImplantacaoResponsavelEntrada = z.infer<typeof implantacaoResponsavelSchema>;

interface PessoaRef { id: string; nome: string }

/** Um treino, como `implantacao_treino_json` devolve. No Console, o desfeito traz o motivo. */
export interface TreinoImplantacao {
  id: string;
  implantacaoId: string;
  implantacaoNumero: number;
  dia: string;
  duracaoMin: number;
  forma: FormaTreino;
  temas: TemaTreino[];
  dadoPor: PessoaRef;
  criadoEm: string;
  pessoas: PessoaRef[];
  desfeito: { em: string; por: PessoaRef; motivo?: string | null } | null;
}

/** O que já aconteceu, calculado na leitura (`implantacao_situacao`, 1183). */
export interface SituacaoImplantacao {
  hoje: string;
  socioEntrou: { entrou: boolean; dia: string | null; pessoa: PessoaRef | null };
  importacao: { concluida: boolean; em?: string; origem?: "PLANILHA" | "ASTREA" | "ADVBOX_PLANILHA"; oQue?: string };
  whatsapp: { ligado: boolean; desde?: string | null };
  pessoas: Array<PessoaRef & {
    funcao: "SOCIO" | "EQUIPE";
    areas: string[];
    convite: { aceitou: boolean; aceitouEm: string | null; convidadaEm: string };
    treino: { treinada: false } | { treinada: true; treinoId: string; dia: string; forma: FormaTreino; duracaoMin: number };
  }>;
  /** "X de Y pessoas treinadas": Y são as pessoas com acesso ao Portal hoje. */
  treinadas: number;
  total: number;
  /** Só com a implantação aberta; negativo depois do prazo. */
  diasAtePrazo: number | null;
}

/** GET /v1/clientes/:id/implantacao (`console_implantacao`). */
export interface ConsoleImplantacao {
  podeEditar: boolean;
  podeMudarPrazo: boolean;
  podeConcluir: boolean;
  valores: boolean;
  cliente: { estado: string; versao: number };
  implantacao: null | {
    id: string; numero: number; estado: EstadoImplantacao; abertaEm: string; prazoAte: string; nome: string; descricao: string;
    condicao: CondicaoImplantacao; condicaoTexto: string | null; responsavel: PessoaRef | null;
    concluidaEm: string | null; concluidaPor: string | null; resumo: string | null; canceladaEm: string | null; versao: number;
    /** Só com `valores` (Administração e Financeiro). */
    valorCentavos?: number;
  };
  /** Quem pode acompanhar (só para quem edita, com a implantação aberta). */
  acompanhantes: Array<PessoaRef & { funcoes: string[] }> | null;
  situacao: SituacaoImplantacao;
  treinos: TreinoImplantacao[];
  temas: TemaTreino[];
}

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
