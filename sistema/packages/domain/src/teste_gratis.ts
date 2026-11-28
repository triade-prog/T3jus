// Teste grátis de 7 dias (CO-09, DC12). As regras estão no banco (1160, 1161 e 1162); aqui ficam
// os nomes que as telas mostram, os esquemas do que as telas enviam e os filtros da carteira do
// Console. Desenho aprovado em docs/design/aprovadas/teste-gratis (Carol, 27/11/2026, D42). Os
// esquemas só conferem o formato: as datas, os motivos e os campos são conferidos no banco, que
// devolve os campos juntos.

import { z } from "zod";

/** A situação, como o banco calcula (teste_situacao); no Portal, o repetido é AGUARDANDO_LIBERACAO. */
export const SITUACOES_TESTE = {
  PREVISTO: "Teste previsto",
  EM_TESTE: "Em teste",
  ACABOU: "Teste acabou",
  ASSINADO: "Assinado",
  DISPENSADO: "Teste dispensado",
  REPETIDO: "Teste repetido",
  SEM_TESTE: "Sem teste grátis",
  AGUARDANDO_LIBERACAO: "Liberando o acesso",
} as const;
export type SituacaoTeste = keyof typeof SITUACOES_TESTE;

/** "Como o escritório confirmou", a lista fixa do desenho (decisão 6). */
export const COMO_CONFIRMOU = {
  PORTAL: "Pediu no Portal (Quero assinar)",
  EMAIL: "Por e-mail",
  WHATSAPP: "Por WhatsApp",
  REUNIAO_OU_LIGACAO: "Em reunião ou ligação",
  OUTRO: "Outro",
} as const;
export type ComoConfirmou = keyof typeof COMO_CONFIRMOU;

/** Os filtros da carteira, ao lado de "Fatura em atraso" (desenho, decisão 5). */
export const FILTROS_TESTE = { EM_TESTE: "Em teste", ACABOU: "Teste acabou", QUER_ASSINAR: "Quer assinar" } as const;
export type FiltroTeste = keyof typeof FILTROS_TESTE;
export const filtroTesteSchema = z.enum(["EM_TESTE", "ACABOU", "QUER_ASSINAR"]);

/** O teste de um escritório na carteira, como `console_carteira_teste` devolve. */
export interface TesteCarteira {
  situacao: SituacaoTeste;
  inicio: string | null;
  fim: string | null;
  totalDias: number | null;
  diaAtual: number | null;
  prorrogado: boolean | null;
  soConsultaDesde: string | null;
  querAssinarEm: string | null;
}

/** Pediu "Quero assinar" e ainda não foi confirmado (no teste ou depois do fim). */
export function querAssinar(t: TesteCarteira | null): boolean {
  return !!t && t.querAssinarEm !== null && (t.situacao === "EM_TESTE" || t.situacao === "ACABOU");
}

/** Se o teste entra no filtro. "Em teste" inclui os prorrogados e não inclui os já assinados. */
export function noFiltroTeste(t: TesteCarteira | null, f: FiltroTeste): boolean {
  if (!t) return false;
  if (f === "QUER_ASSINAR") return querAssinar(t);
  return t.situacao === f;
}

/** Filtra e ordena: Em teste e Teste acabou pelo fim mais próximo; Quer assinar pelo pedido mais antigo. */
export function filtrarPorTeste<T extends { teste: TesteCarteira | null }>(lista: T[], f: FiltroTeste): T[] {
  const chave = (x: T) => (f === "QUER_ASSINAR" ? x.teste?.querAssinarEm : x.teste?.fim) ?? "";
  return lista.filter((x) => noFiltroTeste(x.teste, f)).sort((a, b) => (chave(a) < chave(b) ? -1 : chave(a) > chave(b) ? 1 : 0));
}

/** Quantos escritórios em cada filtro (o número no botão do filtro). */
export function contarFiltrosTeste(lista: { teste: TesteCarteira | null }[]): Record<FiltroTeste, number> {
  const r: Record<FiltroTeste, number> = { EM_TESTE: 0, ACABOU: 0, QUER_ASSINAR: 0 };
  for (const x of lista) for (const f of Object.keys(r) as FiltroTeste[]) if (noFiltroTeste(x.teste, f)) r[f]++;
  return r;
}

const versao = z.number().int().min(1);
const motivo = z.string().max(300);
const dataIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** POST /v1/clientes/:id/teste/prorrogar: a data do novo último dia (desenho, decisão 4). */
export const prorrogarTesteSchema = z.object({ versao, fim: dataIso, motivo });
/** POST /v1/clientes/:id/teste/liberar e /teste/dispensar. */
export const motivoTesteSchema = z.object({ versao, motivo });
/** POST /v1/clientes/:id/assinatura/confirmar: `versao` é a da assinatura. O banco confere "como" e o detalhe. */
export const confirmarAssinaturaSchema = z.object({ versao, como: z.string().max(30), detalhe: z.string().max(2000) });
/** POST /v1/escritorio/assinatura/quero-assinar: o recado é opcional; o banco confere o tamanho. */
export const queroAssinarSchema = z.object({ recado: z.string().max(2000).nullable().optional() });

export type ProrrogarTesteEntrada = z.infer<typeof prorrogarTesteSchema>;
export type ConfirmarAssinaturaEntrada = z.infer<typeof confirmarAssinaturaSchema>;

// ------------------------------------------------------------------ Avisos (F1.34, migration 1163)

/** Os quatro passos à sócia dona, por e-mail e no sino do Portal (dia 1, dia 5, dia 7 e dia 8). */
export type PassoAvisoTeste = "TESTE_COMECOU" | "TESTE_ACABANDO" | "TESTE_ULTIMO_DIA" | "TESTE_ACABOU";
/** Os avisos do teste no sino do Console. */
export type AvisoTesteConsole = "TESTE_COMECOU" | "TESTE_ACABANDO" | "TESTE_ACABOU" | "TESTE_QUER_ASSINAR" | "TESTE_REPETIDO";

const SEMANA = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"] as const;

/** "03/12" de "2026-12-03". */
export function diaMesTeste(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

/** "quinta-feira, 03/12" de "2026-12-03" (a data é de Brasília; o dia da semana sai da própria data). */
export function diaComSemana(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${SEMANA[new Date(Date.UTC(a!, m! - 1, d!)).getUTCDay()]}, ${diaMesTeste(iso)}`;
}

/** O dia seguinte, em data ISO (o primeiro dia só de consulta). */
export function diaSeguinte(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(a!, m! - 1, d! + 1)).toISOString().slice(0, 10);
}
