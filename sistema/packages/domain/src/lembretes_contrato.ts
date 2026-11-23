// Lembretes de contrato (F3.56, F3.144, F3.145; VA-05): o que ficou em aberto no sistema antigo
// vira um lembrete para criar o contrato. A lista mora em Contratos › Contratos, e quem tem a área
// Contratos dispensa o lembrete com o motivo ou o traz de volta (desenho aprovado em
// docs/design/aprovadas/portal-importacao-sobras e na rodada 2). As regras estão no banco
// (0921_lembretes_caso_importado.sql); aqui o esquema confere a forma do pedido, com a mesma regra
// do detalhe: menos de 3 caracteres, depois de tirar os espaços, conta como vazio.

import { z } from "zod";
import type { PessoaRef } from "./clientes.ts";
import type { OrigemDados } from "./importacao.ts";

export const SITUACOES_LEMBRETE = { ABERTO: "Abertos", CONTRATO: "Viraram contrato", DISPENSADO: "Dispensados" } as const;
export type SituacaoLembrete = keyof typeof SITUACOES_LEMBRETE;

export const ORDENS_LEMBRETE = {
  VALOR: "Maior valor primeiro",
  ANTIGO: "Lançamento mais antigo primeiro",
  NOME: "Nome do cliente (A a Z)",
} as const;
export type OrdemLembrete = keyof typeof ORDENS_LEMBRETE;

/** Os motivos de dispensar, com os textos aprovados (decisão 12 do desenho). */
export const MOTIVOS_DISPENSA = {
  JA_NEGOCIADO: "Já negociado ou recebido fora do T3jus",
  PERDOADO: "O escritório perdoou o valor",
  OUTRO_CONTRATO: "Já está em outro contrato",
  OUTRO: "Outro motivo",
} as const;
export type MotivoDispensa = keyof typeof MOTIVOS_DISPENSA;

export const TAMANHO_DETALHE_DISPENSA = 140;

/** O detalhe que conta: sem os espaços das pontas e com pelo menos 3 caracteres; senão, nulo. */
export function detalheDispensa(detalhe: string | null | undefined): string | null {
  const d = (detalhe ?? "").trim();
  return d.length >= 3 ? d : null;
}

export const filtroLembretesSchema = z.object({
  situacao: z.enum(Object.keys(SITUACOES_LEMBRETE) as [SituacaoLembrete, ...SituacaoLembrete[]]).default("ABERTO"),
  q: z.string().max(120).nullish(),
  ordem: z.enum(Object.keys(ORDENS_LEMBRETE) as [OrdemLembrete, ...OrdemLembrete[]]).nullish(),
  pular: z.coerce.number().int().min(0).max(10000).default(0),
});
export type FiltroLembretes = z.input<typeof filtroLembretesSchema>;

/** O pedido como chega à API: só a forma. O banco confere o motivo e devolve os campos juntos. */
export const pedidoDispensaSchema = z.object({ motivo: z.string().max(20).nullish(), detalhe: z.string().max(400).nullish() });

export const dispensarLembreteSchema = z
  .object({
    motivo: z.enum(Object.keys(MOTIVOS_DISPENSA) as [MotivoDispensa, ...MotivoDispensa[]]).nullish(),
    detalhe: z.string().max(400).nullish().transform(detalheDispensa),
  })
  .superRefine((d, ctx) => {
    if (!d.motivo) ctx.addIssue({ code: "custom", path: ["motivo"], message: "Escolha o motivo" });
    if (d.detalhe && d.detalhe.length > TAMANHO_DETALHE_DISPENSA) ctx.addIssue({ code: "custom", path: ["detalhe"], message: "Até 140 caracteres" });
    if (d.motivo === "OUTRO" && !d.detalhe) ctx.addIssue({ code: "custom", path: ["detalhe"], message: "Escreva o motivo" });
  });
export type DispensarLembrete = z.input<typeof dispensarLembreteSchema>;

/** Os campos que faltam para dispensar (a tela marca todos de uma vez, como o servidor). */
export function camposDispensa(d: DispensarLembrete): ("motivo" | "detalhe")[] {
  const r = dispensarLembreteSchema.safeParse(d);
  if (r.success) return [];
  return [...new Set(r.error.issues.map((i) => i.path[0] as "motivo" | "detalhe"))];
}

export interface LembreteContrato {
  id: string;
  situacao: SituacaoLembrete;
  valor: number;
  lancamentos: number;
  /** A data do lançamento em aberto mais antigo (guardada ao importar). */
  maisAntigo: string | null;
  cliente: { id: string; nome: string };
  caso: { id: string; nome: string; responsavel: PessoaRef } | null;
  /** O contrato ativo que o cliente já tinha quando o lembrete nasceu: o gatilho só resolve com contrato novo. */
  contratoAtivo: { id: string; numero: string } | null;
  contrato: { id: string; numero: string; em: string; por: PessoaRef | null } | null;
  dispensa: { motivo: MotivoDispensa; detalhe: string | null; em: string; por: PessoaRef | null } | null;
  importacaoId: string;
  origem: OrigemDados;
}

export interface TotaisLembretes {
  totais: {
    abertos: { n: number; valor: number };
    contrato: { n: number; valor: number };
    dispensados: { n: number; valor: number };
  };
  clientesAbertos: number;
}

export interface ListaLembretes extends TotaisLembretes {
  hoje: string;
  situacao: SituacaoLembrete;
  /** A ordem vale só em Abertos; nos outros grupos, do mais recente para o mais antigo. */
  ordem: OrdemLembrete | null;
  q: string | null;
  pular: number;
  /** Quantos lembretes há no grupo, com a busca, e a soma deles. */
  total: number;
  valor: number;
  lembretes: LembreteContrato[];
  /** "De onde vieram": cada importação do financeiro que criou lembretes. */
  importacoes: { id: string; origem: OrigemDados; em: string; por: PessoaRef | null; lembretes: number; valor: number }[];
}

/** A faixa da lista de Contratos: some quando não sobra nenhum aberto. */
export interface ResumoLembretes {
  clientes: number;
  abertos: number;
  valor: number;
  origem: OrigemDados | null;
  importadoEm: string | null;
}

/** O que dispensar e trazer de volta devolvem: o lembrete e os números do alto. */
export interface MudancaLembrete extends TotaisLembretes {
  lembrete: LembreteContrato;
}
