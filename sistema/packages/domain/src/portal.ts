// Portal do advogado: áreas e equipe do escritório (PA-01, PA-02).
// Os mesmos valores estão no banco (0140_portal_equipe.sql); os testes conferem os dois.

import type { DadosDocumentoPessoa, EnderecoEscritorio } from "./dados_advogado.ts";
import type { SaidaPessoa } from "./contrato.ts";
import { z } from "zod";

/** Áreas que o sócio dono libera pessoa por pessoa. As partes comuns todo mundo vê. */
export const AREAS_PORTAL = {
  COMERCIAL: "Comercial",
  CONTRATOS: "Contratos",
  FINANCEIRO: "Financeiro",
  JURIDICO: "Jurídico",
} as const;
export type AreaPortal = keyof typeof AREAS_PORTAL;

const chaves = Object.keys(AREAS_PORTAL) as [AreaPortal, ...AreaPortal[]];
const areas = z.array(z.enum(chaves)).max(4).transform((a) => [...new Set(a)]);
const uuid = z.string().uuid().transform((s) => s.toLowerCase());

// ---------------------------------------------------------------- OAB de cada advogado (EX-12)
// Tela aprovada em docs/design/aprovadas/portal-equipe-oab. O banco confere tudo
// (0430_equipe_oab.sql); aqui ficam a forma do pedido, a lista das UFs e as frases.

export const UFS_BRASIL = {
  AC: "Acre", AL: "Alagoas", AM: "Amazonas", AP: "Amapá", BA: "Bahia", CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo",
  GO: "Goiás", MA: "Maranhão", MG: "Minas Gerais", MS: "Mato Grosso do Sul", MT: "Mato Grosso", PA: "Pará", PB: "Paraíba",
  PE: "Pernambuco", PI: "Piauí", PR: "Paraná", RJ: "Rio de Janeiro", RN: "Rio Grande do Norte", RO: "Rondônia", RR: "Roraima",
  RS: "Rio Grande do Sul", SC: "Santa Catarina", SE: "Sergipe", SP: "São Paulo", TO: "Tocantins",
} as const;
export type UfBrasil = keyof typeof UFS_BRASIL;

export const TIPOS_OAB = { PRINCIPAL: "Principal", SUPLEMENTAR: "Suplementar" } as const;
export type TipoOab = keyof typeof TIPOS_OAB;

const textoCurto = (max: number) => z.string().max(max).nullish();
/** Pedido de inscrição: o banco normaliza e devolve o código de cada erro, por campo. */
export const oabSchema = z.object({
  uf: textoCurto(4),
  numero: textoCurto(20),
  letra: textoCurto(4),
  tipo: z.enum(["PRINCIPAL", "SUPLEMENTAR"]).nullish(),
  trocarPrincipal: z.boolean().nullish(),
});
export type PedidoOab = z.input<typeof oabSchema>;
export const mudarOabSchema = oabSchema.extend({ versao: z.number().int().min(1) });
export const removerOabSchema = z.object({ versao: z.number().int().min(1) });

/** Inscrição como a API devolve. */
export interface InscricaoOab {
  id: string;
  uf: UfBrasil;
  numero: string;
  letra: string | null;
  tipo: TipoOab;
  versao: number;
  /** "OAB/SP 287.104" */
  texto: string;
  /** "OAB/SP nº 287.104" */
  documento: string;
}

/** "287104" → "287.104". */
export function numeroOabFormatado(numero: string): string {
  return numero.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Só os dígitos, sem zeros à esquerda; null se não for um número de 1 a 6 dígitos. */
export function numeroOabLimpo(numero: string): string | null {
  const d = numero.replace(/[\s./-]/g, "").replace(/^0+/, "");
  return /^[0-9]{1,6}$/.test(d) ? d : null;
}

export function oabTexto(uf: string, numero: string, letra?: string | null, documento = false): string {
  return `OAB/${uf} ${documento ? "nº " : ""}${numeroOabFormatado(numero)}${letra ? `-${letra.toUpperCase()}` : ""}`;
}

/** "a, b e c". */
export function juntarOab(itens: string[]): string {
  if (itens.length <= 1) return itens[0] ?? "";
  return `${itens.slice(0, -1).join(", ")} e ${itens.at(-1)}`;
}

/** Como sai no documento: "OAB/SP nº 287.104 e OAB/RJ nº 245.880-S" (a principal primeiro). */
export function fraseOab(inscricoes: Pick<InscricaoOab, "uf" | "numero" | "letra" | "tipo">[]): string {
  const ordem = [...inscricoes].sort((a, b) => Number(a.tipo !== "PRINCIPAL") - Number(b.tipo !== "PRINCIPAL"));
  return juntarOab(ordem.map((i) => oabTexto(i.uf, i.numero, i.letra, true)));
}

/** Contrato em que a pessoa é advogada (ficha da pessoa e Sua conta). */
export interface ContratoDoAdvogado {
  id: string;
  numero: string;
  estado: "ELABORACAO" | "ATIVO" | "ENCERRADO";
  responsavel: boolean;
  cliente: string | null;
  inscricoes?: string | null;
}

export const convidarEquipeSchema = z.object({
  nome: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().max(254).email(),
  areas,
  /** A OAB principal, opcional (decisão 6 da OAB). */
  oab: oabSchema.omit({ tipo: true, trocarPrincipal: true }).nullish(),
});

export const areasSchema = z.object({ areas });

/** Retirar alguém: quem já entrou precisa de alguém para receber o que era dela (EX-10). */
export const retirarEquipeSchema = z.object({
  versao: z.number().int().min(1),
  passarPara: uuid.nullable().default(null),
});

/** Pessoa na equipe do escritório, como a API devolve. */
export interface PessoaEquipePortal {
  vinculoId: string;
  pessoaId: string;
  nome: string;
  email: string | null;
  dono: boolean;
  areas: AreaPortal[];
  desde: string;
  versao: number;
  senhaCriadaEm: string | null;
  conviteEnviadoEm: string;
  oab: InscricaoOab[];
}

/** Ficha da pessoa na Equipe (só a sócia dona): GET /v1/escritorio/equipe/pessoas/:id. */
export interface FichaPessoaEquipe extends PessoaEquipePortal {
  frase: string | null;
  contratos: ContratoDoAdvogado[];
  /** Os dados para os documentos (EX-15), com as últimas mudanças. */
  dados: DadosDocumentoPessoa;
  escritorio: EnderecoEscritorio;
}

/** Sua conta (decisão 7 da OAB): só a pessoa da sessão, só para ler. */
export interface ContaPortal {
  pessoaId: string;
  nome: string;
  email: string | null;
  dono: boolean;
  desde: string;
  areas: AreaPortal[];
  oab: InscricaoOab[];
  frase: string | null;
  contratos: ContratoDoAdvogado[];
  socios: string[];
  /** Os dados para os documentos (EX-15). */
  dados: DadosDocumentoPessoa;
  escritorio: EnderecoEscritorio;
}

/** Quem foi retirado da equipe (F0.14): GET /v1/escritorio/equipe/retiradas. */
export interface PessoaRetiradaPortal {
  vinculoId: string;
  pessoaId: string;
  nome: string;
  /** null quando a entrada (e-mail e senha) já foi apagada. */
  email: string | null;
  areas: AreaPortal[];
  retiradaEm: string;
  saida: SaidaPessoa | null;
}
