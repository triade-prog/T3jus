// Console T3jus (passo 1): funções internas, carteira, ficha e convites.
// Os mesmos valores estão no banco (0060_console_clientes.sql); os testes conferem os dois.

import { z } from "zod";

/** Funções internas da equipe (PT-24). */
export const FUNCOES_CONSOLE = {
  ADMINISTRACAO: "Administração",
  IMPLANTACAO: "Implantação",
  FINANCEIRO: "Financeiro",
  SUPORTE: "Suporte",
} as const;
export type FuncaoConsole = keyof typeof FUNCOES_CONSOLE;

/** Estágio do cliente na carteira (CO-01). */
export const ESTAGIOS = {
  IMPLANTACAO: "Em implantação",
  ATIVO: "Ativo",
} as const;
export type Estagio = keyof typeof ESTAGIOS;
/** Na carteira e na ficha, o fim do contrato é o terceiro estágio (F0.14); só Encerrar leva a ele. */
export const ESTAGIOS_CARTEIRA = { ...ESTAGIOS, ENCERRADO: "Encerrado" } as const;
export type EstagioCarteira = keyof typeof ESTAGIOS_CARTEIRA;

/** Situações a tratar (CO-01), calculadas pelo banco a partir da ficha. */
export const SITUACOES = {
  SEM_SOCIO: "Sócio ainda não convidado",
  SEM_CONTATO: "Sem contato na ficha",
  SEM_CONTRATO: "Sem referência do contrato",
} as const;
export type Situacao = keyof typeof SITUACOES;

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

const chaves = <T extends Record<string, unknown>>(o: T) => Object.keys(o) as [keyof T & string, ...(keyof T & string)[]];

/**
 * Telefone no formato internacional (+5561999990000). Aceita espaços, traços e parênteses;
 * número brasileiro sem o 55 (10 ou 11 dígitos) ganha o código do país.
 */
export function normalizarTelefone(valor: string): string {
  const digitos = valor.replace(/\D/g, "");
  if (!valor.trim().startsWith("+") && (digitos.length === 10 || digitos.length === 11)) return `+55${digitos}`;
  return `+${digitos}`;
}
const telefone = z.string().trim().max(30).transform(normalizarTelefone).pipe(z.string().regex(/^\+[1-9]\d{7,14}$/));
const email = z.string().trim().toLowerCase().max(254).email();
const textoOpcional = (max: number) =>
  z.string().trim().max(max).optional().nullable().transform((v) => (v ? v : null));
const versao = z.number().int().min(1);

/** CNPJ só com os dígitos, conferindo os dois dígitos verificadores. */
export function cnpjValido(digitos: string): boolean {
  if (!/^\d{14}$/.test(digitos) || /^(\d)\1{13}$/.test(digitos)) return false;
  const dv = (base: string) => {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const r = [...base].reduce((t, d, i) => t + Number(d) * pesos[i]!, 0) % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return dv(digitos.slice(0, 12)) === Number(digitos[12]) && dv(digitos.slice(0, 13)) === Number(digitos[13]);
}
const cnpj = z
  .string()
  .trim()
  .max(30)
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => v === "" || cnpjValido(v), { message: "CNPJ inválido" });

export const contatoSchema = z
  .object({
    nome: z.string().trim().min(1).max(120),
    papel: z.string().trim().min(1).max(60),
    telefone: telefone.optional(),
    email: email.optional(),
  })
  .refine((c) => c.telefone || c.email, { message: "Informe telefone ou e-mail", path: ["telefone"] });

export const criarEscritorioSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  cidade: z.string().trim().min(2).max(80),
  uf: z.enum(UFS),
});

export const fichaSchema = z.object({
  versao,
  nome: z.string().trim().min(2).max(120),
  cidade: z.string().trim().min(2).max(80),
  uf: z.enum(UFS),
  endereco: textoOpcional(200),
  cnpj: z.union([cnpj, z.null()]).optional().transform((v) => (v ? v : null)),
  contatos: z.array(contatoSchema).max(10),
  /** Os dados para os documentos (PA-07, 0860). Ausentes, a tela antiga continua gravando só o texto do endereço. */
  documentos: z.object({
    tipo: z.enum(["SOCIEDADE", "SOCIEDADE_INDIVIDUAL", "SEM_SOCIEDADE"]).nullable().optional(),
    razaoSocial: z.string().max(300).nullable().optional(),
    oabUf: z.string().max(4).nullable().optional(),
    oabNumero: z.string().max(12).nullable().optional(),
    cep: z.string().max(12).nullable().optional(),
    logradouro: z.string().max(300).nullable().optional(),
    numero: z.string().max(30).nullable().optional(),
    complemento: z.string().max(100).nullable().optional(),
    bairro: z.string().max(120).nullable().optional(),
    telefone: z.string().max(30).nullable().optional(),
    email: z.string().max(300).nullable().optional(),
    site: z.string().max(300).nullable().optional(),
  }).optional(),
});

export const contratoSchema = z.object({ versao, referenciaContrato: textoOpcional(120) });

export const estagioSchema = z.object({
  versao,
  estagio: z.enum(chaves(ESTAGIOS)),
  /** Obrigatório: vai para o histórico do cliente (decisão da Carol, 18/11/2026). */
  motivo: z.string().trim().min(1).max(300),
});

export const convidarPessoaSchema = z.object({
  nome: z.string().trim().min(1).max(120),
  email,
});

export const notaSchema = z.object({ texto: z.string().trim().min(1).max(2000) });

const funcoes = z.array(z.enum(chaves(FUNCOES_CONSOLE))).min(1).max(4);

export const cadastrarMembroSchema = convidarPessoaSchema.extend({ funcoes });

export const funcoesSchema = z.object({ funcoes });

export const atribuirSchema = z.object({
  pessoaId: z.string().uuid(),
  funcao: z.enum(chaves(FUNCOES_CONSOLE)),
});

export const versaoSchema = z.object({ versao });


/** Sócio na carteira e na ficha, com o caminho do convite (PT-20). */
export interface SocioCliente {
  vinculoId: string;
  pessoaId: string;
  nome: string;
  /** Quando o convite saiu (o vínculo nasceu). */
  desde: string;
  convidadoPor: string | null;
  /** Quando o último convite saiu (o primeiro ou um reenvio): o link vale 1 hora a partir daí. */
  conviteEnviadoEm: string;
  /** Quando criou a senha pelo convite; null enquanto não criou. */
  senhaCriadaEm: string | null;
  /** E-mail da conta, só na ficha (vem do Auth). */
  email?: string | null;
}

/** As quatro etapas da implantação, na ordem da tela aprovada (CO-01). */
export const ETAPAS_IMPLANTACAO = {
  FICHA: "Ficha",
  CONTRATO: "Contrato",
  EQUIPE: "Equipe",
  SOCIO_NO_PORTAL: "Sócio no Portal",
} as const;
export type EtapaImplantacao = keyof typeof ETAPAS_IMPLANTACAO;

/**
 * Quais etapas da implantação estão feitas: ficha com contato, referência do contrato,
 * alguém da equipe atendendo e um sócio que já criou a senha.
 */
export function etapasImplantacao(c: { situacoes: readonly string[]; socios: readonly Pick<SocioCliente, "senhaCriadaEm">[]; equipe: readonly unknown[] }) {
  const feitas: Record<EtapaImplantacao, boolean> = {
    FICHA: !c.situacoes.includes("SEM_CONTATO"),
    CONTRATO: !c.situacoes.includes("SEM_CONTRATO"),
    EQUIPE: c.equipe.length > 0,
    SOCIO_NO_PORTAL: c.socios.some((s) => s.senhaCriadaEm),
  };
  const lista = (Object.keys(ETAPAS_IMPLANTACAO) as EtapaImplantacao[]).map((chave) => ({ chave, nome: ETAPAS_IMPLANTACAO[chave], feita: feitas[chave] }));
  return { lista, feitas: lista.filter((e) => e.feita).length, total: lista.length, proxima: lista.find((e) => !e.feita)?.chave ?? null };
}

/** Contrato e documentos do cliente (CO-05): categorias, tipos aceitos e o limite. */
export const CATEGORIAS_DOCUMENTO = {
  CONTRATO_ASSINADO: "Contrato assinado",
  PROPOSTA: "Proposta",
  DOCUMENTO_ESCRITORIO: "Documento do escritório",
  OUTRO: "Outro",
} as const;
export type CategoriaDocumento = keyof typeof CATEGORIAS_DOCUMENTO;

export const TIPOS_DOCUMENTO = { "application/pdf": "PDF", "image/jpeg": "JPG", "image/png": "PNG" } as const;
export type TipoDocumento = keyof typeof TIPOS_DOCUMENTO;
export const TAMANHO_MAXIMO_DOCUMENTO = 10 * 1024 * 1024;

export const iniciarDocumentoSchema = z.object({
  categoria: z.enum(chaves(CATEGORIAS_DOCUMENTO)),
  nome: z.string().trim().min(1).max(200).refine((n) => !/[/\\]/.test(n), { message: "Nome de arquivo inválido" }),
  tipo: z.enum(chaves(TIPOS_DOCUMENTO)),
  tamanho: z.number().int().min(1).max(TAMANHO_MAXIMO_DOCUMENTO),
});
