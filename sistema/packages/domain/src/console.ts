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
});

export const contratoSchema = z.object({ versao, referenciaContrato: textoOpcional(120) });

export const estagioSchema = z.object({
  versao,
  estagio: z.enum(chaves(ESTAGIOS)),
  motivo: textoOpcional(300),
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

