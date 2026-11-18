// Clientes do Portal (AP-01, AP-02, AP-04, AP-06): cadastro com contatos e qualificação,
// atendimentos e próximo contato. Os mesmos valores estão no banco (0160_portal_clientes.sql);
// os testes conferem os dois. Decisões da Carol (18/11/2026): quem não tem a área Comercial
// vê e edita a ficha, sem origem, próximo contato nem atendimentos; só o Comercial inativa;
// atendimento não se edita nem se apaga; a lista de origens é fixa.

import { z } from "zod";
import { normalizarTelefone, cnpjValido, UFS } from "./console.ts";

export const TIPOS_CLIENTE = { PF: "Pessoa física", PJ: "Pessoa jurídica" } as const;
export type TipoCliente = keyof typeof TIPOS_CLIENTE;

/** Origem do cliente (AP-04), lista fixa (decisão 4). */
export const ORIGENS = {
  INDICACAO_CLIENTE: "Indicação de cliente",
  INDICACAO_PARCEIRO: "Indicação de advogado ou parceiro",
  GOOGLE: "Google",
  INSTAGRAM: "Instagram",
  SITE: "Site do escritório",
  PASSOU_NO_ESCRITORIO: "Passou no escritório",
  OUTRA: "Outra",
} as const;
export type Origem = keyof typeof ORIGENS;

export const ESTADOS_CIVIS = {
  SOLTEIRO: "Solteiro(a)",
  CASADO: "Casado(a)",
  UNIAO_ESTAVEL: "União estável",
  SEPARADO: "Separado(a)",
  DIVORCIADO: "Divorciado(a)",
  VIUVO: "Viúvo(a)",
} as const;
export type EstadoCivil = keyof typeof ESTADOS_CIVIS;

export const CANAIS = {
  WHATSAPP: "WhatsApp",
  TELEFONE: "Telefone",
  PRESENCIAL: "Presencial",
  EMAIL: "E-mail",
  VIDEO: "Videochamada",
} as const;
export type Canal = keyof typeof CANAIS;

/** O que falta para a procuração e o contrato (CH-08), calculado no banco. */
export const FALTANDO_QUALIFICACAO = {
  DOCUMENTO: "CPF ou CNPJ",
  NACIONALIDADE: "Nacionalidade",
  ESTADO_CIVIL: "Estado civil",
  PROFISSAO: "Profissão",
  RG: "RG",
  ENDERECO: "Endereço completo",
  REP_NOME: "Nome de quem assina",
  REP_CARGO: "Cargo de quem assina",
  REP_DOCUMENTO: "CPF de quem assina",
  REP_QUALIFICACAO: "Estado civil e profissão de quem assina",
} as const;
export type Faltando = keyof typeof FALTANDO_QUALIFICACAO;
/** Quantos dados a procuração pede, por tipo (as chaves acima). */
export const TOTAL_QUALIFICACAO: Record<TipoCliente, number> = { PF: 6, PJ: 6 };

const chaves = <T extends Record<string, unknown>>(o: T) => Object.keys(o) as [keyof T & string, ...(keyof T & string)[]];
const uuid = z.string().uuid().transform((s) => s.toLowerCase());
const digitos = (v: string) => v.replace(/\D/g, "");
/** Texto opcional: em branco vira null; com algo, respeita o mínimo e o máximo. */
const opcional = (min: number, max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || v.length >= min);
const opcionalEnum = <T extends [string, ...string[]]>(valores: T) =>
  z
    .union([z.enum(valores), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v ? v : null));

/** CPF só com os dígitos, conferindo os dois dígitos verificadores. */
export function cpfValido(d: string): boolean {
  if (!/^\d{11}$/.test(d) || /^(\d)\1{10}$/.test(d)) return false;
  const dv = (n: number) => {
    const s = [...d.slice(0, n)].reduce((t, x, i) => t + Number(x) * (n + 1 - i), 0);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}

/** 52998224725 → 529.982.247-25; 11222333000181 → 11.222.333/0001-81. */
export function formatarDocumento(d: string | null | undefined): string {
  if (!d) return "";
  if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  return d;
}

const telefone = z
  .string()
  .trim()
  .max(30)
  .nullish()
  .transform((v) => (v ? normalizarTelefone(v) : null))
  .refine((v) => v === null || /^\+[1-9]\d{7,14}$/.test(v), { message: "Telefone inválido" });
const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .nullish()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || z.string().email().safeParse(v).success, { message: "E-mail inválido" });

export const contatoClienteSchema = z
  .object({
    id: uuid.optional(),
    nome: z.string().trim().min(1).max(120),
    papel: opcional(1, 60),
    telefone,
    email,
    principal: z.boolean(),
  })
  .refine((c) => c.telefone || c.email, { message: "Informe telefone ou e-mail", path: ["telefone"] });

const documento = z
  .string()
  .trim()
  .max(30)
  .nullish()
  .transform((v) => (v ? digitos(v) : null));

const campos = {
  nome: z.string().trim().min(2).max(160),
  documento,
  contatos: z
    .array(contatoClienteSchema)
    .min(1)
    .max(10)
    .refine((c) => c.filter((x) => x.principal).length === 1, { message: "Marque um contato principal" }),
  nacionalidade: opcional(2, 60),
  estadoCivil: opcionalEnum(chaves(ESTADOS_CIVIS)),
  profissao: opcional(2, 80),
  rg: opcional(3, 20),
  rgOrgao: opcional(2, 20),
  cep: z
    .string()
    .trim()
    .max(10)
    .nullish()
    .transform((v) => (v ? digitos(v) : null))
    .refine((v) => v === null || /^\d{8}$/.test(v)),
  endereco: opcional(3, 200),
  bairro: opcional(2, 80),
  cidade: opcional(2, 80),
  uf: opcionalEnum([...UFS] as [string, ...string[]]),
  repNome: opcional(2, 120),
  repCargo: opcional(2, 60),
  repDocumento: documento.refine((v) => v === null || cpfValido(v), { message: "CPF inválido" }),
  repEstadoCivil: opcionalEnum(chaves(ESTADOS_CIVIS)),
  repProfissao: opcional(2, 80),
  origem: opcionalEnum(chaves(ORIGENS)),
  origemIndicacao: opcional(2, 120),
};

const docConfere = (c: { tipo?: TipoCliente; documento: string | null }) =>
  c.documento === null || (c.tipo === "PJ" ? cnpjValido(c.documento) : cpfValido(c.documento));

export const cadastrarClienteSchema = z
  .object({ tipo: z.enum(chaves(TIPOS_CLIENTE)), ...campos })
  .refine(docConfere, { message: "Documento inválido", path: ["documento"] });

/** Editar: o tipo fica o do cadastro; a versão lida vai junto (PT-19). */
export const editarClienteSchema = z
  .object({ versao: z.number().int().min(1), tipo: z.enum(chaves(TIPOS_CLIENTE)), ...campos })
  .refine(docConfere, { message: "Documento inválido", path: ["documento"] });

export type DadosCliente = z.output<typeof cadastrarClienteSchema>;

export const inativarClienteSchema = z.object({ versao: z.number().int().min(1), motivo: z.string().trim().min(1).max(300) });
export const reativarClienteSchema = z.object({
  versao: z.number().int().min(1),
  motivo: z
    .string()
    .trim()
    .max(300)
    .nullish()
    .transform((v) => (v ? v : null)),
});

const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const registrarAtendimentoSchema = z
  .object({
    ocorridoEm: z.string().datetime({ offset: true }).optional(),
    canal: z.enum(chaves(CANAIS)),
    comQuem: opcional(1, 120),
    atendidoPor: uuid.optional(),
    resumo: z.string().trim().min(1).max(2000),
    proxEm: data.nullish(),
    proxResponsavel: uuid.nullish(),
    proxOque: opcional(1, 200),
  })
  .superRefine((a, ctx) => {
    if (!a.proxEm && !a.proxResponsavel && !a.proxOque) return;
    if (!a.proxEm) ctx.addIssue({ code: "custom", path: ["proxEm"], message: "Escolha a data" });
    if (!a.proxResponsavel) ctx.addIssue({ code: "custom", path: ["proxResponsavel"], message: "Escolha o responsável" });
    if (!a.proxOque) ctx.addIssue({ code: "custom", path: ["proxOque"], message: "Diga o que fazer" });
  });

export const buscaClientesSchema = z.object({
  q: z.string().trim().max(120).optional(),
  situacao: z.enum(["ATIVO", "INATIVO"]).default("ATIVO"),
  vencidos: z
    .enum(["1", "0", "true", "false"])
    .optional()
    .transform((v) => v === "1" || v === "true"),
});

// ------------------------------------------------------------------- o que a API devolve

export type SituacaoCliente = "ATIVO" | "INATIVO";
export interface PessoaRef {
  id: string;
  nome: string;
}
export interface ContatoCliente {
  id: string;
  nome: string;
  papel: string | null;
  telefone: string | null;
  email: string | null;
  principal: boolean;
}
export interface ProxContato {
  em: string;
  oque: string;
  vencido: boolean;
  responsavel: PessoaRef;
}
export interface ClienteLinha {
  id: string;
  tipo: TipoCliente;
  nome: string;
  situacao: SituacaoCliente;
  contatoPrincipal: Omit<ContatoCliente, "principal"> | null;
  versao: number;
  /** Só com a área Comercial. */
  origem?: Origem | null;
  proxContato?: ProxContato | null;
}
export interface ListaClientes {
  comercial: boolean;
  clientes: ClienteLinha[];
}
export interface PossivelDuplicado {
  id: string;
  nome: string;
  situacao: SituacaoCliente;
  desde: string;
  por: "DOCUMENTO" | "TELEFONE";
}

export interface FichaCliente {
  id: string;
  tipo: TipoCliente;
  nome: string;
  documento: string | null;
  contatos: ContatoCliente[];
  nacionalidade: string | null;
  estadoCivil: EstadoCivil | null;
  profissao: string | null;
  rg: string | null;
  rgOrgao: string | null;
  cep: string | null;
  endereco: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  repNome: string | null;
  repCargo: string | null;
  repDocumento: string | null;
  repEstadoCivil: EstadoCivil | null;
  repProfissao: string | null;
  situacao: SituacaoCliente;
  inativadoEm: string | null;
  motivoInativacao: string | null;
  inativadoPor: PessoaRef | null;
  criadoEm: string;
  criadoPor: PessoaRef | null;
  versao: number;
  comercial: boolean;
  podeInativar: boolean;
  faltando: Faltando[];
  alterado: { em: string; por: string | null } | null;
  /** Só com a área Comercial. */
  origem?: Origem | null;
  origemIndicacao?: string | null;
  proxContato?: ProxContato | null;
  atendimentos?: number;
  primeiroAtendimento?: { em: string; canal: Canal } | null;
}

export interface Atendimento {
  id: string;
  ocorridoEm: string;
  canal: Canal;
  comQuem: string | null;
  resumo: string;
  atendidoPor: PessoaRef;
  proxContato: { em: string; oque: string; responsavel: PessoaRef } | null;
  registradoEm: string;
}

/** Campos do cliente na API (camelCase) e no banco (snake_case). */
export const CAMPOS_CLIENTE_BANCO: Record<string, string> = {
  tipo: "tipo",
  nome: "nome",
  documento: "documento",
  contatos: "contatos",
  nacionalidade: "nacionalidade",
  estadoCivil: "estado_civil",
  profissao: "profissao",
  rg: "rg",
  rgOrgao: "rg_orgao",
  cep: "cep",
  endereco: "endereco",
  bairro: "bairro",
  cidade: "cidade",
  uf: "uf",
  repNome: "rep_nome",
  repCargo: "rep_cargo",
  repDocumento: "rep_documento",
  repEstadoCivil: "rep_estado_civil",
  repProfissao: "rep_profissao",
  origem: "origem",
  origemIndicacao: "origem_indicacao",
};

/** Dias entre duas datas (aaaa-mm-dd), para "vencido há 5 dias". */
export function diasEntre(de: string, ate: string): number {
  return Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86_400_000);
}

/** Hoje no horário de Brasília (aaaa-mm-dd). */
export function hojeBrasilia(agora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(agora);
}
